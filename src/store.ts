import { create } from 'zustand';
import type {
  CheckResult, DeviceState, FlightEvent, MissionState, Route, Scene, Task,
} from './types';
import { DEFAULT_BULK_DENSITY } from './constants';

export type Tab = 'home' | 'routes' | 'results' | 'device' | 'settings';
export type ResultView = 'process' | 'result';

export type RouteSub =
  | { view: 'detail'; id: string }
  | { view: 'edit'; id: string; from: 'receive' | 'list' | 'detail' }
  | { view: 'receive' }
  | null;

export interface Mission {
  state: MissionState;
  routeId: string | null;
  minimized: boolean;
  // 起飞前检查
  checks: CheckResult[];
  checksShown: number;
  siteAck: boolean;
  siteAckAtIso: string | null;
  // 倒计时
  countdown: number;
  // 飞行
  prog: number;
  liftT: number;
  shooting: boolean;       // 拍摄点悬停拍照中         // 起飞爬升进度 0–1：从起降点升到航线高度的过渡
  waypointDone: number;
  speedMs: number;
  elapsedSec: number;
  // 姿态（F-07：仅显示，不是控件，不违反约束 C1）
  headingDeg: number;
  pitchDeg: number;
  rollDeg: number;
  events: FlightEvent[];
  hoverReason: 'manual' | 'obstacle' | 'loc' | null;
  hoverCountdown: number;
  obstacleCleared: boolean;   // 障碍已离开的过渡提示态（随后自动恢复飞行）
  // 返航
  returnEtaS: number;
  returnFromProg: number;
  returnTrigger: Task['returnTrigger'];
  coverage: number;
  // 电量（起飞时从设备读取，飞行中消耗）
  batteryPct: number;
  lowBatteryWarned: boolean;
  // 处理
  procStage: number;        // 0–5 当前阶段，6 = 全部完成
  // 异常
  faultTitle: string;
  faultBody: string;
  // 成果
  resultTaskId: string | null;
  takeoffIso: string | null;
}

export const initialMission: Mission = {
  state: 'IDLE', routeId: null, minimized: false,
  checks: [], checksShown: 0, siteAck: false, siteAckAtIso: null,
  countdown: 3,
  prog: 0, liftT: 1, shooting: false, waypointDone: 0, speedMs: 0, elapsedSec: 0,
  headingDeg: 0, pitchDeg: 0, rollDeg: 0, events: [],
  hoverReason: null, hoverCountdown: 0, obstacleCleared: false,
  returnEtaS: 0, returnFromProg: 0, returnTrigger: 'route_complete', coverage: 100,
  batteryPct: 82, lowBatteryWarned: false,
  procStage: 0,
  faultTitle: '', faultBody: '',
  resultTaskId: null, takeoffIso: null,
};

interface AppState {
  loggedIn: boolean;
  account: string;
  loginAt: string | null;           // 本次登录时间（ISO），设置页账号区展示
  lastAccount: string;              // 上次登录账号：退出后登录页回填，减少重复输入
  tab: Tab;
  routeSub: RouteSub;
  resultSub: { taskId: string; view: ResultView } | null;
  deviceSub: 'logs' | null;

  device: DeviceState | null;
  scenes: Scene[];
  routes: Route[];
  lastSyncAt: string | null;
  tasks: Task[];
  selectedRouteId: string | null;
  density: number;
  toast: string | null;
  doneEntry: string | null;         // 任务进终态后弹一次的成果入口（taskId）
  backInterceptor: (() => boolean) | null;
  vpFull: boolean;                  // 三维视图全屏：画布撑满，下方信息收起
  landscape: boolean;               // 执行态横屏：整机转为 800×390，三维画面占主区、仪表靠右

  mission: Mission;
  speedMult: 1 | 8 | 24;

  // setters
  set: (p: Partial<AppState>) => void;
  patchMission: (p: Partial<Mission>) => void;
  showToast: (msg: string) => void;
  gotoTab: (tab: Tab) => void;
  handleBack: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useStore = create<AppState>((set, get) => ({
  loggedIn: false,
  account: '',
  loginAt: null,
  lastAccount: '',
  tab: 'home',
  routeSub: null,
  resultSub: null,
  deviceSub: null,

  device: null,
  scenes: [],
  routes: [],
  lastSyncAt: null,
  tasks: [],
  selectedRouteId: 'R-03',
  density: DEFAULT_BULK_DENSITY,
  toast: null,
  doneEntry: null,
  backInterceptor: null,
  vpFull: false,
  landscape: false,

  mission: { ...initialMission },
  speedMult: 8,

  set: p => set(p),
  patchMission: p => set(s => ({ mission: { ...s.mission, ...p } })),

  showToast: msg => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 2200);
  },

  gotoTab: tab => set({ tab, routeSub: null, resultSub: null, deviceSub: null, vpFull: false }),

  // Android 物理返回键（约束 C7：永不下发飞行指令）
  handleBack: () => {
    const s = get();
    // 三维全屏态等页内拦截
    if (s.backInterceptor && s.backInterceptor()) return;

    const m = s.mission;
    const overlayActive = m.state !== 'IDLE' && !m.minimized;
    if (overlayActive) {
      switch (m.state) {
        case 'FAULT':
          // 拦截，必须点「我知道了」
          return;
        case 'PREFLIGHT':
        case 'PREFLIGHT_FAIL':
          // 弹「取消本次起飞？」—— 由 Preflight 屏渲染，这里置标记
          window.dispatchEvent(new CustomEvent('preflight-back'));
          return;
        case 'COUNTDOWN':
          // 直接取消倒计时，不弹确认（后悔窗口要好按）
          window.dispatchEvent(new CustomEvent('countdown-cancel'));
          return;
        case 'FLYING':
        case 'HOVERING':
        case 'RETURNING':
        case 'LANDED':
        case 'PROCESSING':
        case 'PROCESS_FAIL':
          // 横屏时先退回竖屏，再按一次才最小化
          if (s.landscape) { set({ landscape: false }); return; }
          // 只做最小化，不结束任务，不弹确认
          set(st => ({ mission: { ...st.mission, minimized: true } }));
          return;
        case 'DONE':
          // 已完成时最小化 = 收进成果入口弹层，任务态就此收尾
          set(st => ({
            mission: { ...st.mission, minimized: true },
            doneEntry: st.mission.resultTaskId,
          }));
          return;
        default:
          return;
      }
    }

    if (s.routeSub) {
      if (s.routeSub.view === 'edit') {
        window.dispatchEvent(new CustomEvent('routeedit-back'));
        return;
      }
      set({ routeSub: null });
      return;
    }
    if (s.resultSub) { set({ resultSub: null }); return; }
    if (s.deviceSub) { set({ deviceSub: null }); return; }
    // 一级页按返回键 = 退出 App（Web 载体无操作，交由系统处理）
  },
}));
