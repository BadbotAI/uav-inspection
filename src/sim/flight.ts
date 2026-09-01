// 飞行模拟：进度推进、航点、事件流、速度、返航、处理六阶段
import { useStore, initialMission } from '../store';
import { api, buildPreflightChecks } from '../api';
import type { FlightEvent, FlightEventType, Task, Stack } from '../types';
import { buildRoutePath, posAt, waypointRows, type RoutePath } from '../three/route';
import { profileOf } from '../three/pointcloud';
import { routeDisplayName } from '../mock/routes';
import {
  COUNTDOWN_S, OBSTACLE_TIMEOUT_S, OBSTACLE_CLEAR_MOCK_S, LOC_LOST_TIMEOUT_S,
  BATTERY_LOW_PCT, BATTERY_RETURN_PCT, fmtClock,
} from '../constants';

// 进度推进速率（prog/秒，1× 时约 6 分钟走完，接近 7 分钟预计时长）
const PROG_RATE_PER_S = 0.0028;
const TICK_MS = 330;
export const RETURN_ETA_S = 40;

let tickTimer: ReturnType<typeof setInterval> | undefined;
let checkTimer: ReturnType<typeof setInterval> | undefined;
let cdTimer: ReturnType<typeof setInterval> | undefined;
let procTimer: ReturnType<typeof setInterval> | undefined;
let landTimer: ReturnType<typeof setTimeout> | undefined;
let taskSeq = 2; // T-20260727-01 已存在

function clearTimers() {
  if (tickTimer) clearInterval(tickTimer);
  if (checkTimer) clearInterval(checkTimer);
  if (cdTimer) clearInterval(cdTimer);
  if (procTimer) clearInterval(procTimer);
  if (landTimer) clearTimeout(landTimer);
  tickTimer = checkTimer = cdTimer = procTimer = undefined;
  landTimer = undefined;
}

function ev(type: FlightEventType, label: string): FlightEvent {
  return { time: fmtClock(new Date()), type, label };
}

// 航线几何缓存：姿态（航向）由航线方向算出
const pathCache = new Map<string, RoutePath>();
function routePath(routeId: string | null): RoutePath | null {
  if (!routeId) return null;
  const route = useStore.getState().routes.find(r => r.id === routeId);
  if (!route) return null;
  const key = `${route.id}-${route.sceneId}-${route.waypointCount}-${route.altitudeM}`;
  if (!pathCache.has(key)) {
    pathCache.set(key, buildRoutePath(route.waypointCount, route.altitudeM, profileOf(route.sceneId)));
  }
  return pathCache.get(key)!;
}

// 拍照航点集合：飞到拍摄点时悬停片刻拍照
const photoSetCache = new Map<string, Set<number>>();
function photoSet(routeId: string | null): Set<number> {
  if (!routeId) return new Set();
  if (!photoSetCache.has(routeId)) {
    const path = routePath(routeId);
    const route = useStore.getState().routes.find(r => r.id === routeId);
    const set = new Set<number>();
    if (path && route) {
      waypointRows(path, route.waypointCount).forEach((w, i) => {
        if (w.isPhoto) set.add(i + 1);
      });
    }
    photoSetCache.set(routeId, set);
  }
  return photoSetCache.get(routeId)!;
}

// 拍照停留（真实毫秒，不随倍速缩放，保证动效可见）
let photoDwellUntil = 0;
const PHOTO_DWELL_MS = 1100;

function headingAt(routeId: string | null, prog: number): number {
  const path = routePath(routeId);
  if (!path) return 0;
  const { dir } = posAt(path, prog);
  return (Math.atan2(dir.x, dir.z) * 180 / Math.PI + 360) % 360;
}

function pushEvent(type: FlightEventType, label: string) {
  const s = useStore.getState();
  s.patchMission({ events: [ev(type, label), ...s.mission.events] });
}

// ---------- 起飞前检查 ----------

export function startPreflight(routeId: string) {
  const s = useStore.getState();
  const route = s.routes.find(r => r.id === routeId);
  const dev = s.device;
  if (!route || !dev) return;
  clearTimers();
  const sceneName = s.scenes.find(sc => sc.id === route.sceneId)?.name ?? '一号仓 A区';
  const checks = buildPreflightChecks(route, dev, sceneName);
  useStore.setState({
    mission: {
      ...initialMission, state: 'PREFLIGHT', routeId, checks, checksShown: 0,
    },
  });
  // 自检由无人机侧一次性完成并回传：请求 → 等待 → 整包结果
  landTimer = setTimeout(() => {
    const m = useStore.getState().mission;
    if (m.state !== 'PREFLIGHT') return;
    useStore.getState().patchMission({ checksShown: checks.length });
    if (checks.some(c => !c.passed)) {
      useStore.getState().patchMission({ state: 'PREFLIGHT_FAIL' });
    }
  }, 1800);
}

export function ackSite() {
  const now = new Date();
  useStore.getState().patchMission({
    siteAck: true,
    siteAckAtIso: now.toISOString(),
  });
}

export function cancelMission() {
  clearTimers();
  useStore.setState({ mission: { ...initialMission } });
}

// ---------- 倒计时 ----------

export function beginCountdown() {
  const m = useStore.getState().mission;
  if (m.state !== 'PREFLIGHT') return;
  useStore.getState().patchMission({ state: 'COUNTDOWN', countdown: COUNTDOWN_S });
  cdTimer = setInterval(() => {
    const mm = useStore.getState().mission;
    if (mm.state !== 'COUNTDOWN') { clearInterval(cdTimer); return; }
    if (mm.countdown <= 1) {
      clearInterval(cdTimer);
      takeoff();
    } else {
      useStore.getState().patchMission({ countdown: mm.countdown - 1 });
    }
  }, 900);
}

export function cancelCountdown() {
  clearTimers();
  useStore.setState({ mission: { ...initialMission } });
}

// ---------- 飞行 ----------

function takeoff() {
  const s = useStore.getState();
  photoDwellUntil = 0;
  s.patchMission({
    state: 'FLYING', prog: 0, liftT: 0, waypointDone: 0, elapsedSec: 0, speedMs: 0,
    batteryPct: s.device?.batteryPct ?? 82, lowBatteryWarned: false,
    takeoffIso: new Date().toISOString(),
    events: [ev('takeoff', '电机启动 · 起飞')],
  });
  startTick();
}

// 电量消耗与低电保护
function drainBattery(dt: number, mult: number): Partial<{ batteryPct: number }> {
  const m = useStore.getState().mission;
  return { batteryPct: Math.max(0, m.batteryPct - 0.05 * dt * mult) };
}

function startTick() {
  if (tickTimer) clearInterval(tickTimer);
  tickTimer = setInterval(tick, TICK_MS);
}

function tick() {
  const s = useStore.getState();
  const m = s.mission;
  const mult = s.speedMult;
  const dt = TICK_MS / 1000;

  if (m.state === 'FLYING') {
    const route = s.routes.find(r => r.id === m.routeId);
    const total = route?.waypointCount ?? 24;

    // 起飞爬升阶段：先垂直升到航线高度，再开始沿航线推进
    if (m.liftT < 1) {
      const liftT = Math.min(1, m.liftT + dt / 2.6);
      s.patchMission({
        liftT,
        speedMs: 0.3 + liftT * 0.6,
        elapsedSec: m.elapsedSec + dt * mult,
        pitchDeg: -0.5, rollDeg: 0,
        headingDeg: headingAt(m.routeId, 0),
      });
      if (liftT >= 1) pushEvent('waypoint_reached', '到达航线高度');
      return;
    }

    // 拍摄点悬停：拍照期间进度冻结、速度归零
    if (performance.now() < photoDwellUntil) {
      s.patchMission({
        elapsedSec: m.elapsedSec + dt * mult,
        speedMs: 0, pitchDeg: 0, rollDeg: 0,
        ...drainBattery(dt, mult),
      });
      return;
    }

    let prog = m.prog + PROG_RATE_PER_S * mult * dt;
    const elapsedSec = m.elapsedSec + dt * mult;
    const speedMs = 1.25 + Math.random() * 0.4;
    if (m.shooting) s.patchMission({ shooting: false });

    // 低电保护：先告警，再自动返航
    const battery = drainBattery(dt, mult).batteryPct ?? m.batteryPct;
    if (battery <= BATTERY_RETURN_PCT) {
      s.patchMission({ batteryPct: battery, elapsedSec });
      pushEvent('return_start', `电量不足（${Math.round(battery)}%），自动返航`);
      startReturn('safety');
      return;
    }
    if (battery <= BATTERY_LOW_PCT && !m.lowBatteryWarned) {
      s.patchMission({ lowBatteryWarned: true });
      pushEvent('fault', `低电量告警（${Math.round(battery)}%）`);
    }

    if (prog >= 1) {
      s.patchMission({ prog: 1, waypointDone: total, elapsedSec, speedMs: 0, batteryPct: battery });
      startReturn('route_complete');
      return;
    }
    // 航点按弧长占比判定（航线为不规则曲线，不能按均分推算）
    const fracs = routePath(m.routeId)?.wpFracs ?? [];
    let wp = m.waypointDone;
    while (wp + 1 < fracs.length && prog >= fracs[wp + 1]) wp++;
    const patch: Record<string, unknown> = {
      prog, elapsedSec, speedMs, batteryPct: battery,
      headingDeg: headingAt(m.routeId, prog),
      pitchDeg: -1.6 + (Math.random() - 0.5) * 1.2,
      rollDeg: (Math.random() - 0.5) * 1.6,
    };
    if (wp > m.waypointDone) {
      patch.waypointDone = wp;
      // 拍摄点：进度吸附到航点本体，悬停片刻拍照
      if (photoSet(m.routeId).has(wp + 1)) {
        photoDwellUntil = performance.now() + PHOTO_DWELL_MS;
        patch.prog = fracs[wp];
        patch.speedMs = 0;
        patch.shooting = true;
        patch.events = [ev('waypoint_reached', `航点 ${wp} · 悬停拍照`), ...m.events];
      } else {
        patch.events = [ev('waypoint_reached', `到达航点 ${wp}`), ...m.events];
      }
    }
    s.patchMission(patch);
  } else if (m.state === 'HOVERING') {
    const elapsedSec = m.elapsedSec + dt * mult;
    const hoverCountdown = m.hoverCountdown - dt;
    // 障碍物离开后自动继续（mock：数秒后离开）
    if (m.hoverReason === 'obstacle'
      && OBSTACLE_TIMEOUT_S - hoverCountdown >= OBSTACLE_CLEAR_MOCK_S) {
      // 障碍离开后先进入提示态，短暂停留再恢复飞行
      if (!m.obstacleCleared) {
        s.patchMission({ elapsedSec, obstacleCleared: true });
        pushEvent('resume', '探测到障碍物已离开');
        return;
      }
      if (OBSTACLE_TIMEOUT_S - hoverCountdown >= OBSTACLE_CLEAR_MOCK_S + 1.8) {
        s.patchMission({ elapsedSec, hoverReason: null, obstacleCleared: false, state: 'FLYING' });
        pushEvent('resume', '恢复飞行');
        return;
      }
      s.patchMission({ elapsedSec });
      return;
    }
    if (hoverCountdown <= 0) {
      s.patchMission({ elapsedSec, speedMs: 0 });
      startReturn(m.hoverReason === 'obstacle' ? 'auto_timeout' : 'safety');
    } else {
      s.patchMission({ elapsedSec, speedMs: 0, hoverCountdown, pitchDeg: 0, rollDeg: 0 });
    }
  } else if (m.state === 'RETURNING') {
    const eta = m.returnEtaS - dt * mult;
    if (eta <= 0) {
      land();
    } else {
      // 沿原航线回溯：航向为来路反方向
      const t = 1 - eta / RETURN_ETA_S;
      const p = m.returnFromProg * (1 - t);
      let headingDeg = m.headingDeg;
      const path = routePath(m.routeId);
      if (path) {
        const { dir } = posAt(path, p);
        headingDeg = (Math.atan2(-dir.x, -dir.z) * 180 / Math.PI + 360) % 360;
      }
      s.patchMission({
        returnEtaS: eta, speedMs: 1.6, headingDeg,
        elapsedSec: m.elapsedSec + dt * mult,
        ...drainBattery(dt, mult),
        pitchDeg: -2.2 + (Math.random() - 0.5) * 0.8,
        rollDeg: (Math.random() - 0.5) * 1.2,
      });
    }
  }
}

export function triggerObstacle() {
  const m = useStore.getState().mission;
  if (m.state !== 'FLYING') return;
  useStore.getState().patchMission({
    state: 'HOVERING', hoverReason: 'obstacle', hoverCountdown: OBSTACLE_TIMEOUT_S, speedMs: 0,
  });
  pushEvent('hover_obstacle', '停障 · 悬停');
}

export function triggerLocLost() {
  const m = useStore.getState().mission;
  if (m.state !== 'FLYING') return;
  useStore.getState().patchMission({
    state: 'HOVERING', hoverReason: 'loc', hoverCountdown: LOC_LOST_TIMEOUT_S, speedMs: 0,
  });
  pushEvent('hover_loc', '定位质量不足 · 悬停');
}

export function startReturn(trigger: Task['returnTrigger']) {
  const s = useStore.getState();
  const m = s.mission;
  if (!['FLYING', 'HOVERING'].includes(m.state)) return;
  const coverage = trigger === 'route_complete' ? 100 : Math.round(m.prog * 100);
  // 航向转向返航直线方向
  let headingDeg = m.headingDeg;
  const path = routePath(m.routeId);
  if (path) {
    const { pos } = posAt(path, m.prog);
    const home = path.pts[0];
    headingDeg = (Math.atan2(home.x - pos.x, home.z - pos.z) * 180 / Math.PI + 360) % 360;
  }
  s.patchMission({
    state: 'RETURNING', returnTrigger: trigger, returnFromProg: m.prog, shooting: false,
    returnEtaS: RETURN_ETA_S, coverage, hoverReason: null, headingDeg,
  });
  pushEvent('return_start', '开始返航');
}

function land() {
  useStore.getState().patchMission({ state: 'LANDED', speedMs: 0, returnEtaS: 0 });
  pushEvent('landed', '降落');
  if (tickTimer) clearInterval(tickTimer);
  landTimer = setTimeout(startProcessing, 1000);
}

// ---------- 处理六阶段 ----------

export const PROC_STAGES = ['点云汇总与去噪', '地面分割', '点云精配准', '堆体分割', '体积测算', '结果打包'];

function startProcessing() {
  useStore.getState().patchMission({ state: 'PROCESSING', procStage: 0 });
  procTimer = setInterval(() => {
    const m = useStore.getState().mission;
    if (m.state !== 'PROCESSING') { clearInterval(procTimer); return; }
    const next = m.procStage + 1;
    if (next >= PROC_STAGES.length) {
      clearInterval(procTimer);
      useStore.getState().patchMission({ procStage: PROC_STAGES.length });
      void finishMission();
    } else {
      useStore.getState().patchMission({ procStage: next });
    }
  }, 760);
}

// 本机没有任何历史任务（冷启动首飞 / 清理过任务数据）时的成果兜底模板
const FALLBACK_STACKS: Stack[] = [
  { id: 'S-A', name: '堆体 A', position: '东侧靠门', cargoType: 'bulk', volumeM3: 84.6,
    volumeConfidence: 'high', surfaceCoverPct: 98,
    occlusionNote: '四面完整可见，顶面点云密度充足。',
    layerCount: null, perLayerCount: null, totalCount: null, countConfidence: null },
  { id: 'S-B', name: '堆体 B', position: '中部', cargoType: 'bulk', volumeM3: 52.3,
    volumeConfidence: 'medium', surfaceCoverPct: 91,
    occlusionNote: '北侧紧贴墙面，该侧壁面由地面基准延伸推算，未直接扫描。',
    layerCount: null, perLayerCount: null, totalCount: null, countConfidence: null },
  { id: 'S-C', name: '堆体 C', position: '西南角', cargoType: 'bulk', volumeM3: 31.8,
    volumeConfidence: 'medium', surfaceCoverPct: 88,
    occlusionNote: '西侧贴墙，该侧由推算得出。',
    layerCount: null, perLayerCount: null, totalCount: null, countConfidence: null },
];

async function finishMission() {
  const s = useStore.getState();
  const m = s.mission;
  const route = s.routes.find(r => r.id === m.routeId);
  if (!route) return;

  const path = buildRoutePath(route.waypointCount, route.altitudeM);
  const full = m.coverage >= 100;
  // 成果堆体：取该航线最近一次同类任务作为模板；没有任何历史任务时用内置模板兜底
  const template = s.tasks.find(t => t.routeId === route.id) ?? s.tasks[0] ?? null;
  const stacks: Stack[] = (template ? template.stacks : FALLBACK_STACKS).map(st => full
    ? { ...st }
    : {
        ...st,
        volumeM3: Math.round(st.volumeM3 * (0.35 + m.coverage / 200) * 10) / 10,
        volumeConfidence: 'low',
        surfaceCoverPct: Math.min(st.surfaceCoverPct, Math.round(m.coverage * 0.9)),
        occlusionNote: '任务中断，扫描不完整，体积不可用于账务。',
      });

  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}_${p(now.getHours())}${p(now.getMinutes())}`;
  const startedIso = m.takeoffIso ?? now.toISOString();
  const task: Task = {
    // 编号与共享路径都取真实日期 / 当前连接设备，保证与记录内容可对账
    id: `T-${stamp.slice(0, 8)}-${p(taskSeq++)}`,
    routeId: route.id, routeName: routeDisplayName(route),
    startedAt: startedIso, landedAt: now.toISOString(),
    durationSec: Math.round(m.elapsedSec),
    coveragePct: m.coverage,
    status: full ? 'success' : 'aborted',
    operator: s.account ? `操作员·${s.account}` : '操作员·张',
    siteAckAt: m.siteAckAtIso ?? startedIso,
    waypointDone: m.waypointDone, waypointTotal: route.waypointCount,
    trackLengthM: Math.round(path.totalLen * Math.min(1, m.prog) * 10) / 10,
    avgSpeedMs: 1.4, maxSpeedMs: 1.9,
    returnTrigger: m.returnTrigger,
    locP95Cm: 6.2,
    cloudCompletePct: full ? 97.8 : 94.1,
    trackCompletePct: full ? 99.4 : 96.0,
    volumeCalcSec: full ? 63 : 31,
    volumeErrPct: full ? 2.8 : 4.9,
    cloudSharePath: `\\\\${s.device?.id ?? 'UAV-A31C'}\\scans\\${stamp}\\`,
    cloudSizeMb: Math.round(742 * Math.max(0.2, m.prog)),
    stacks,
  };
  await api.addTask(task);
  const tasks = await api.getTasks();

  // 航线复现历史累计
  const routes = s.routes.map(r => r.id === route.id
    ? {
        ...r, runs: r.runs + 1,
        successRuns: r.successRuns + (full ? 1 : 0),
        lastRunAt: now.toISOString().slice(0, 10),
        lastRunStatus: (full ? 'success' : 'aborted') as Task['status'],
      }
    : r);

  useStore.setState(st => ({
    tasks, routes,
    mission: { ...st.mission, state: 'DONE', resultTaskId: task.id },
    doneEntry: st.mission.minimized ? task.id : null,
  }));
}

// ---------- 处理失败分支 ----------

// 重新处理：从第一阶段重跑（演示中重跑即成功）
export function retryProcessing() {
  startProcessing();
}

// 仅保留原始点云：不出体积结果，任务态收尾，原始数据留在无人机端
export function keepRawOnly() {
  clearTimers();
  useStore.setState({ mission: { ...initialMission } });
  useStore.getState().showToast('原始点云已保留在无人机端共享目录');
}

// DEMO：直接进入处理失败态（真实链路中由机载端上报）
export function demoProcessFail(routeId = 'R-03') {
  const s = useStore.getState();
  const route = s.routes.find(r => r.id === routeId) ?? s.routes[0];
  if (!route) return;
  clearTimers();
  const now = new Date();
  useStore.setState({
    loggedIn: true,
    mission: {
      ...initialMission, state: 'PROCESS_FAIL', routeId: route.id,
      prog: 1, waypointDone: route.waypointCount, coverage: 100,
      elapsedSec: route.etaMin * 60, procStage: 2,
      siteAckAtIso: now.toISOString(),
      takeoffIso: new Date(now.getTime() - route.etaMin * 60000).toISOString(),
      events: [ev('landed', '降落')],
    },
  });
}

// ---------- 成果入口 ----------

export function viewResult(taskId: string) {
  clearTimers();
  useStore.setState({
    mission: { ...initialMission },
    doneEntry: null,
    tab: 'results',
    resultSub: { taskId, view: 'result' },
    routeSub: null, deviceSub: null,
  });
}

export function dismissDoneEntry() {
  useStore.setState({ mission: { ...initialMission }, doneEntry: null });
}

// ---------- 遥控器介入 ----------
// 遥控器与手机无交互，只直连飞机；一旦介入，本次任务即中断，数据保留

let rcPending = false;

export function triggerRcOverride() {
  const m = useStore.getState().mission;
  if (!['FLYING', 'HOVERING', 'RETURNING'].includes(m.state)) return;
  if (tickTimer) clearInterval(tickTimer);
  rcPending = true;
  useStore.getState().patchMission({
    state: 'FAULT', minimized: false,
    faultTitle: '遥控器已介入，任务中断',
    faultBody: '遥控器拥有最高控制权限，本次巡检任务已中断，无法继续执行。已采集的数据将保留并生成部分结果，需重新发起巡检。',
  });
  pushEvent('fault', '遥控器介入 · 任务中断');
}

// ---------- 异常 ----------

export function triggerFault() {
  const m = useStore.getState().mission;
  if (!['FLYING', 'HOVERING', 'RETURNING'].includes(m.state)) return;
  if (tickTimer) clearInterval(tickTimer);
  useStore.getState().patchMission({
    state: 'FAULT', minimized: false,
    faultTitle: '与无人机失联',
    faultBody: '链路已中断超过 10 秒。机载端已按预设策略自主悬停并返航，请到起降点确认设备状态，并检查手机 Wi-Fi 连接。',
  });
  pushEvent('fault', '异常');
}

export function ackFault() {
  clearTimers();
  const m = useStore.getState().mission;
  // 遥控器介入：已飞数据保留，生成部分结果
  if (rcPending && m.prog > 0.05) {
    rcPending = false;
    useStore.getState().patchMission({
      returnTrigger: 'rc_override',
      coverage: Math.round(m.prog * 100),
      minimized: false,
    });
    useStore.getState().patchMission({ state: 'PROCESSING', procStage: 0 });
    procTimer = setInterval(() => {
      const mm = useStore.getState().mission;
      if (mm.state !== 'PROCESSING') { clearInterval(procTimer); return; }
      const next = mm.procStage + 1;
      if (next >= PROC_STAGES.length) {
        clearInterval(procTimer);
        useStore.getState().patchMission({ procStage: PROC_STAGES.length });
        void finishMission();
      } else {
        useStore.getState().patchMission({ procStage: next });
      }
    }, 760);
    return;
  }
  rcPending = false;
  useStore.setState({ mission: { ...initialMission } });
}

// ---------- DEMO：直接跳到处理中 ----------

export function demoJumpToProcessing(routeId: string) {
  const s = useStore.getState();
  const route = s.routes.find(r => r.id === routeId) ?? s.routes[0];
  if (!route) return;
  clearTimers();
  const now = new Date();
  useStore.setState({
    loggedIn: true,
    mission: {
      ...initialMission, state: 'LANDED', routeId: route.id,
      prog: 1, waypointDone: route.waypointCount, coverage: 100,
      elapsedSec: route.etaMin * 60,
      siteAckAtIso: now.toISOString(),
      takeoffIso: new Date(now.getTime() - route.etaMin * 60000).toISOString(),
      events: [ev('landed', '降落')],
    },
  });
  startProcessing();
}

// ---------- DEMO：直接跳到执行态 ----------

export function demoJumpToFlying(routeId: string, prog = 0.28) {
  photoDwellUntil = 0;
  const s = useStore.getState();
  const route = s.routes.find(r => r.id === routeId) ?? s.routes[0];
  if (!route) return;
  clearTimers();
  const total = route.waypointCount;
  const wp = Math.round(prog * total);
  const now = new Date();
  const events: FlightEvent[] = [];
  for (let i = Math.max(1, wp - 4); i <= wp; i++) {
    events.unshift(ev('waypoint_reached', `到达航点 ${i}`));
  }
  events.push(ev('takeoff', '起飞'));
  useStore.setState({
    loggedIn: true,
    mission: {
      ...initialMission, state: 'FLYING', routeId: route.id,
      prog, waypointDone: wp, elapsedSec: prog * route.etaMin * 60, speedMs: 1.4,
      headingDeg: headingAt(route.id, prog),
      siteAck: true, siteAckAtIso: now.toISOString(), takeoffIso: now.toISOString(),
      events,
    },
  });
  startTick();
}
