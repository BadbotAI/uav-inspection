// H-00 待命首页
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Button, CtaRow } from '../components/Button';
import { Card } from '../components/Card';
import { Tag } from '../components/Pill';
import { BottomSheet } from '../components/BottomSheet';
import { IconRoute, IconChevronRight, IconChevronDown, IconChevronLeft, IconSearch, IconPin, IconSwitch, IconDoc, IconMap, IconBattery, IconDrone, IconStorage } from '../components/Icons';
import { DroneModel, type DroneMode } from '../components/DroneModel';
import { Pill, type PillTone } from '../components/Pill';
import { Viewport } from '../components/Viewport';
import { TaskCard } from './TaskList';
import { startPreflight } from '../sim/flight';
import { fmtRelDay } from '../constants';
import { DEVICE_MODEL } from '../mock/device';

// 冷启动引导：三步进度，完成的打勾，未完成的可点跳到对应入口
// 动效：当前步骤序号圈呼吸光圈提示可点；某步完成后回到首页时先变绿弹出对勾并闪一下底色，
// 随后光圈自动移到下一步（完成闪烁期间下一步不抢焦点）
let guidePrevDone: string | null = null;   // 跨页面切换记住上次完成态，用于识别「刚完成」的步骤

function StartGuide({ steps }: { steps: { title: string; desc: string; done: boolean; onClick?: () => void }[] }) {
  const doneCount = steps.filter(s => s.done).length;
  const doneKey = steps.map(s => (s.done ? '1' : '0')).join('');
  const [justDone, setJustDone] = useState<number | null>(null);
  useEffect(() => {
    const prev = guidePrevDone;
    guidePrevDone = doneKey;
    if (prev && prev !== doneKey) {
      const idx = steps.findIndex((s, i) => s.done && prev[i] === '0');
      if (idx >= 0) {
        setJustDone(idx);
        const t = setTimeout(() => setJustDone(null), 1400);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneKey]);
  return (
    <Card style={{ padding: '12px 14px' }}>
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>开始使用</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{doneCount}/{steps.length}</span>
      </div>
      <div className="mt-2.5 flex flex-col">
        {steps.map((s, i) => {
          // 完成闪烁期间下一步暂不亮起，等闪烁结束光圈再移过去
          const current = !s.done && steps.slice(0, i).every(p => p.done) && justDone === null;
          const flashing = justDone === i;
          return (
            <button
              key={s.title}
              className={`flex items-start gap-2.5 text-left ${s.done ? '' : 'pressable'}`}
              style={{
                padding: '8px 6px', margin: '0 -6px', borderRadius: 8,
                background: flashing ? 'var(--success-bg)' : 'transparent',
                transition: 'background .5s ease',
                cursor: s.done ? 'default' : 'pointer',
                borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                color: 'var(--text-primary)',
              }}
              onClick={() => { if (!s.done) s.onClick?.(); }}
              disabled={s.done}
            >
              <span
                className={`flex items-center justify-center shrink-0 mono ${current ? 'pulse-ring' : ''}`}
                style={{
                  width: 20, height: 20, borderRadius: 999, fontSize: 10.5, marginTop: 1,
                  background: s.done ? 'var(--success)' : current ? 'var(--brand)' : 'var(--surface-3)',
                  color: s.done || current ? '#FFFFFF' : 'var(--text-tertiary)',
                  transition: 'background .4s ease, color .4s ease',
                }}
              >
                {s.done ? (
                  <svg className={flashing ? 'count-pop' : undefined} width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3.4 8.4 6.6 11.6 12.6 4.8" />
                  </svg>
                ) : i + 1}
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block"
                  style={{
                    fontSize: 13, fontWeight: current ? 500 : 400,
                    color: s.done ? 'var(--text-tertiary)' : 'var(--text-primary)',
                    transition: 'color .4s ease',
                  }}
                >
                  {s.title}
                </span>
                {!s.done && (
                  <span className="block mt-0.5 leading-[1.5]" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{s.desc}</span>
                )}
              </span>
              {!s.done && (
                <span style={{ color: 'var(--text-placeholder)', display: 'inline-flex', marginTop: 3 }}>
                  <IconChevronRight size={12} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Card>
  );
}

export function Home() {
  const device = useStore(s => s.device);
  const routes = useStore(s => s.routes);
  const scenes = useStore(s => s.scenes);
  const tasks = useStore(s => s.tasks);
  const mission = useStore(s => s.mission);
  const selectedRouteId = useStore(s => s.selectedRouteId);
  const set = useStore(s => s.set);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [pickerScene, setPickerScene] = useState<string | null>(null);
  // 任务发起顺序（研究员口径）：先选场景，再选航线 —— 弹层默认从场景步骤进入
  const [pickerStep, setPickerStep] = useState<'routes' | 'region'>('region');
  const [mapOpen, setMapOpen] = useState(false);
  const [mapRouteId, setMapRouteId] = useState<string | null>(null);
  const [mapSceneId, setMapSceneId] = useState<string | null>(null);
  const [mapPickOpen, setMapPickOpen] = useState(false);

  const route = routes.find(r => r.id === selectedRouteId) ?? null;

  // 选择器当前区域：默认跟随已选航线所在区域
  const pickSceneId = pickerScene ?? route?.sceneId ?? scenes[0]?.id ?? null;
  const pickScene = scenes.find(sc => sc.id === pickSceneId) ?? null;
  const sceneRoutes = routes
    .filter(r => r.sceneId === pickSceneId)
    .filter(r => {
      const q = pickerQuery.trim();
      if (!q) return true;
      return (r.name || '未命名航线').includes(q);
    });
  // 「上次巡检」= 最新一条巡检记录（新任务完成后即时置顶更新）
  const lastTask = tasks[0] ?? null;
  const connected = !!device?.connected;
  const noRoutes = routes.length === 0;
  // 冷启动 / 中途缺环节时展示引导：设备未连接或本机没有航线
  const showGuide = !device || noRoutes;

  // 「状态」= 自检状态 / 飞行中
  const statusText = !device ? '—'
    : mission.state !== 'IDLE' ? '飞行中'
    : device.sensorsOk && device.locQuality !== 'lost' ? '正常' : '异常';

  // 无人机状态标签 + 模型动效模式
  const droneStatus: { text: string; tone: PillTone; mode: DroneMode } = (() => {
    if (!device?.connected || device.locQuality === 'lost') return { text: '失联', tone: 'lo', mode: 'lost' };
    switch (mission.state) {
      case 'FAULT': return { text: '失联', tone: 'lo', mode: 'lost' };
      case 'FLYING': case 'COUNTDOWN': return { text: '巡检中', tone: 'info', mode: 'active' };
      case 'HOVERING': return { text: '原地等待', tone: 'mid', mode: 'active' };
      case 'RETURNING': case 'LANDED': return { text: '返航中', tone: 'mid', mode: 'active' };
      default:
        // 充电状态无法经网络获取（电池可能取下充电），不做充电中展示
        return { text: '空闲', tone: 'neutral', mode: 'idle' };
    }
  })();

  let btnText = '一键启动';
  let btnDisabled = false;
  if (!connected) { btnText = '设备未连接'; btnDisabled = true; }
  else if (!route) { btnText = '请先选择航线'; btnDisabled = true; }

  const bulkSum = lastTask
    ? Math.round(lastTask.stacks.reduce((a, s) => a + s.volumeM3, 0) * 10) / 10
    : 0;

  const tele = [
    { label: '电量', icon: <IconBattery size={15} />, value: device ? `${device.batteryPct}%` : '—' },
    { label: '自检', icon: <IconDrone size={14} />, value: statusText },
    { label: '存储', icon: <IconStorage size={14} />, value: device ? `${device.storageFreeGb.toFixed(0)}GB` : '—' },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', letterSpacing: '0.01em' }}>巡检</div>

        {showGuide && (
          <div className="mt-5">
            <StartGuide
              steps={[
                {
                  title: '连接无人机', done: connected,
                  desc: '无人机开机后，与手机接入同一局域网，在设备页发现并连接',
                  onClick: () => set({ tab: 'device', deviceSub: null }),
                },
                {
                  title: '同步航线', done: !noRoutes,
                  desc: '航线由无人机录制，同步到本机后才能选择执行',
                  onClick: () => set({ tab: 'routes', routeSub: null }),
                },
                {
                  title: '选择航线，一键启动', done: !!route && connected && !noRoutes,
                  desc: '起飞前自动完成自检，全程无需手动操控',
                  onClick: () => (noRoutes ? set({ tab: 'routes', routeSub: null }) : setPickerOpen(true)),
                },
              ]}
            />
          </div>
        )}

        {/* 设备卡：白灰质感点阵，点阵向下淡出，与遥测融为一体 */}
        <div className="mt-5">
          <div className="dlabel mb-2" style={{ fontSize: 11 }}>当前设备</div>
          <Card style={{ padding: 0, overflow: 'hidden', position: 'relative' }}>
            {/* 头部：型号行，切换设备与型号水平对齐；未绑定设备时显示未连接 */}
            <div className="flex items-center justify-between" style={{ padding: '12px 14px 0' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: device ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                {device ? DEVICE_MODEL : '未连接无人机'}
                {device && <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginLeft: 6 }}>{device.id}</span>}
              </div>
              <button
                className="flex items-center gap-1.5 pressable"
                style={{
                  fontSize: 12, color: 'var(--text-link)', fontWeight: 500,
                  background: 'transparent', cursor: 'pointer',
                }}
                onClick={e => { e.stopPropagation(); set({ tab: 'device', deviceSub: null }); }}
              >
                {device ? <><IconSwitch size={13} /> 切换设备</> : <><IconDrone size={13} /> 连接设备</>}
              </button>
            </div>
            <div
              className="relative"
              style={{
                background: [
                  'linear-gradient(180deg, rgba(247,248,250,0) 30%, rgba(247,248,250,.94) 74%, #F7F8FA 100%)',
                  'radial-gradient(circle, rgba(16,24,40,.07) 1px, transparent 1px)',
                  'linear-gradient(180deg, #FCFCFD 0%, #F3F5F8 100%)',
                ].join(', '),
                backgroundSize: '100% 100%, 13px 13px, 100% 100%',
              }}
            >
              {/* 所在区域（点击查看场景地图）+ 无人机状态：同几何胶囊，仅以色彩区分 */}
              {device && (
                <div className="absolute flex items-center gap-1.5" style={{ top: 18, left: 10, zIndex: 5 }}>
                  <button
                    className="flex items-center gap-1"
                    style={{
                      padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                      background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                      fontSize: 11, color: 'var(--brand-subtle-text)',
                    }}
                    onClick={() => { setMapSceneId(pickSceneId); setMapRouteId(route?.id ?? null); setMapOpen(true); }}
                  >
                    <IconPin size={12} />
                    {device.locationDesc}
                  </button>
                  <span
                    className="flex items-center gap-1"
                    style={{
                      padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                      background:
                        droneStatus.tone === 'lo' ? 'var(--danger-bg)'
                        : droneStatus.tone === 'mid' ? 'var(--warning-bg)'
                        : droneStatus.tone === 'info' ? 'var(--brand-subtle-bg)'
                        : 'var(--fill-quiet)',
                      color:
                        droneStatus.tone === 'lo' ? 'var(--danger)'
                        : droneStatus.tone === 'mid' ? 'var(--warning)'
                        : droneStatus.tone === 'info' ? 'var(--brand-subtle-text)'
                        : 'var(--text-secondary)',
                    }}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: 5, height: 5,
                        background: 'currentColor',
                      }}
                    />
                    {droneStatus.text}
                  </span>
                </div>
              )}
              <div style={{ padding: '16px 0 0' }}>
                <DroneModel height={158} mode={droneStatus.mode} />
              </div>
              {/* 未绑定设备：模型灰显，给出连接前提 */}
              {!device && (
                <div className="text-center leading-[1.6]" style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '0 24px 4px', marginTop: -6 }}>
                  请确认无人机已开机，且与手机接入同一局域网
                </div>
              )}
              {/* 遥测一行：图标 + 数值 + 小字标签（保证语义可读） */}
              <div className="flex items-start justify-center" style={{ gap: 30, padding: '4px 8px 12px' }}>
                {tele.map(it => (
                  <span key={it.label} className="flex flex-col items-center gap-0.5">
                    <span className="flex items-center gap-1.5">
                      <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}>{it.icon}</span>
                      <span className="mono" style={{ fontSize: 13.5 }}>{it.value}</span>
                    </span>
                    <span className="dlabel" style={{ fontSize: 9.5 }}>{it.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* 航线卡：品牌色系，与普通卡拉开 */}
        <div className="mt-4">
          <div className="dlabel mb-2" style={{ fontSize: 11 }}>已选航线</div>
          <div
            className="cursor-pointer"
            style={{
              borderRadius: 12, padding: 14,
              background: 'var(--brand-subtle-bg)',
              border: '1px solid var(--brand-border)',
            }}
            onClick={() => (noRoutes ? set({ tab: 'routes', routeSub: null }) : setPickerOpen(true))}
          >
            <div className="flex items-center gap-3">
              {/* 左：航线信息 */}
              <div className="flex-1 min-w-0">
                {noRoutes ? (
                  <>
                    <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>本机还没有航线</div>
                    <div className="mt-1 leading-[1.5]" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                      连接无人机后，从无人机同步已录制的航线
                    </div>
                  </>
                ) : route ? (
                  <>
                    <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.06em', color: 'var(--brand-text)' }}>
                      {route.id}
                    </div>
                    <div className="truncate mt-0.5" style={{ fontSize: 16, fontWeight: 600 }}>
                      {route.name || '未命名航线'}
                    </div>
                    <div className="mono flex gap-3 mt-1.5" style={{ fontSize: 11, color: 'var(--brand-subtle-text)' }}>
                      <span>{route.waypointCount} 航点</span>
                      <span>约 {route.etaMin} 分钟</span>
                      <span>离堆 {route.minClearanceM.toFixed(1)}m</span>
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>未选择航线</div>
                )}
              </div>
              {/* 右：更换航线（垂直居中） */}
              <div
                className="flex flex-col items-center gap-1 shrink-0"
                style={{
                  paddingLeft: 12,
                  borderLeft: '1px solid rgba(76,107,192,.18)',
                  color: 'var(--brand-subtle-text)',
                }}
              >
                {noRoutes ? <IconRoute size={15} /> : <IconSwitch size={15} />}
                <span style={{ fontSize: 11, fontWeight: 500 }}>{noRoutes ? '去同步' : '更换航线'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <CtaRow width={190}>
            {/* 禁用态点击引导到解决入口：未连接→设备页，未选航线→选择浮层 */}
            <div
              onClick={() => {
                if (!btnDisabled) return;
                if (!connected) set({ tab: 'device', deviceSub: null });
                else if (!route) setPickerOpen(true);
              }}
            >
              <Button disabled={btnDisabled} onClick={() => route && startPreflight(route.id)}>
                {btnText}
              </Button>
            </div>
          </CtaRow>
        </div>

        {/* 上次巡检：与巡检历史卡片同一组件 */}
        {lastTask && (
          <div className="mt-7">
            <div className="dlabel mb-2" style={{ fontSize: 11 }}>上次巡检 · {fmtRelDay(lastTask.startedAt)}</div>
            <TaskCard
              task={lastTask}
              onClick={() => set({ tab: 'results', resultSub: { taskId: lastTask.id, view: 'result' } })}
            />
          </div>
        )}
      </div>

      {/* 航线选择弹层：两步选择（区域 → 航线），区域选择为面板内切页 */}
      <BottomSheet open={pickerOpen} onMask={() => { setPickerOpen(false); setPickerStep('region'); }}>
        {pickerStep === 'region' ? (
          <>
            <div className="flex items-center gap-1" style={{ height: 32, marginBottom: 10 }}>
              <button
                className="flex items-center justify-center pressable"
                style={{ width: 30, height: 30, borderRadius: 9, color: 'var(--text-secondary)', cursor: 'pointer' }}
                onClick={() => setPickerStep('routes')}
                aria-label="返回"
              >
                <IconChevronLeft size={15} />
              </button>
              <span style={{ fontSize: 15, fontWeight: 600 }}>选择巡检区域</span>
            </div>
            <div className="flex flex-col gap-2" style={{ height: 290, overflowY: 'auto' }}>
              {scenes.map(sc => {
                const on = sc.id === pickSceneId;
                const count = routes.filter(r => r.sceneId === sc.id).length;
                return (
                  <button
                    key={sc.id}
                    className="text-left pressable"
                    style={{
                      padding: '12px 13px', borderRadius: 12, cursor: 'pointer',
                      background: on ? 'var(--brand-subtle-bg)' : 'var(--surface-1)',
                      border: `1px solid ${on ? 'var(--brand-border)' : 'var(--border-default)'}`,
                      boxShadow: 'var(--shadow-card)',
                    }}
                    onClick={() => { setPickerScene(sc.id); setPickerStep('routes'); }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center rounded-full shrink-0"
                            style={{ width: 15, height: 15, border: `1.5px solid ${on ? 'var(--brand)' : 'var(--border-strong)'}` }}
                          >
                            {on && <span className="rounded-full" style={{ width: 7, height: 7, background: 'var(--brand)' }} />}
                          </span>
                          <span className="flex-1 truncate" style={{ fontSize: 14, fontWeight: on ? 500 : 400 }}>
                            {sc.name}
                          </span>
                        </div>
                        <div className="mono mt-1.5" style={{ fontSize: 11, color: 'var(--text-tertiary)', paddingLeft: 23 }}>
                          {count} 条航线
                        </div>
                      </div>
                      {/* 场景地图入口：垂直居中，独立点击 */}
                      <span
                        className="flex items-center justify-center shrink-0 pressable"
                        style={{
                          width: 30, height: 30, borderRadius: 9,
                          background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                          color: 'var(--brand)', cursor: 'pointer',
                          boxShadow: 'var(--shadow-card)',
                        }}
                        onClick={e => {
                          e.stopPropagation();
                          setMapSceneId(sc.id);
                          setMapRouteId(routes.find(r => r.sceneId === sc.id)?.id ?? null);
                          setMapOpen(true);
                        }}
                        aria-label="查看场景地图"
                      >
                        <IconMap size={14} />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ height: 32, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>选择航线</span>
              <button
                style={{ fontSize: 12, color: 'var(--text-link)', cursor: 'pointer' }}
                onClick={() => { setPickerOpen(false); set({ tab: 'routes', routeSub: null }); }}
              >
                管理航线
              </button>
            </div>
            <div className="flex flex-col" style={{ height: 290 }}>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="dlabel" style={{ fontSize: 11 }}>巡检区域</span>
                {/* 地址标签对齐航线页样式；切换按钮独立放在标签右侧 */}
                <button
                  className="flex items-center gap-1.5 pressable"
                  style={{
                    padding: '5px 13px', borderRadius: 999, cursor: 'pointer',
                    background: 'var(--brand-subtle-bg)', border: '1px solid var(--brand-border)',
                    color: 'var(--brand-subtle-text)', fontSize: 12.5, fontWeight: 500,
                  }}
                  onClick={() => setPickerStep('region')}
                >
                  <IconPin size={13} />
                  {pickScene?.name ?? '选择区域'}
                </button>
                <button
                  className="flex items-center justify-center pressable"
                  style={{
                    width: 26, height: 26, borderRadius: 8,
                    color: 'var(--brand)', cursor: 'pointer', marginLeft: -4,
                  }}
                  onClick={() => setPickerStep('region')}
                  aria-label="切换巡检区域"
                >
                  <IconSwitch size={14} />
                </button>
                <span className="mono flex-1 text-right" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {sceneRoutes.length} 条航线
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
                {sceneRoutes.length === 0 ? (
                  <div className="text-center py-6" style={{ fontSize: 12.5, color: 'var(--text-tertiary)' }}>
                    该区域下暂无航线
                  </div>
                ) : sceneRoutes.map(r => {
                  const active = r.id === selectedRouteId;
                  return (
                    <button
                      key={r.id}
                      className="text-left"
                      style={{
                        padding: '12px 13px', borderRadius: 12, cursor: 'pointer',
                        background: active ? 'var(--brand-subtle-bg)' : 'var(--surface-1)',
                        border: `1px solid ${active ? 'var(--brand-border)' : 'var(--border-default)'}`,
                        boxShadow: 'var(--shadow-card)',
                      }}
                      onClick={() => { set({ selectedRouteId: r.id }); setPickerOpen(false); setPickerStep('region'); }}
                    >
                      {/* 对齐航线页卡片：编号小字 + 名称行 + 标签行（不含创建/成功率/上次巡检） */}
                      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.06em', color: 'var(--brand-text)', paddingLeft: 23 }}>
                        {r.id}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="inline-flex items-center justify-center rounded-full shrink-0"
                          style={{
                            width: 15, height: 15,
                            border: `1.5px solid ${active ? 'var(--brand)' : 'var(--border-strong)'}`,
                          }}
                        >
                          {active && <span className="rounded-full" style={{ width: 7, height: 7, background: 'var(--brand)' }} />}
                        </span>
                        <span className="flex-1 truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                          {r.name || '未命名航线'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2" style={{ paddingLeft: 23 }}>
                        <Tag>{r.waypointCount} 航点</Tag>
                        <Tag>约 {r.etaMin} 分钟</Tag>
                        <Tag>离堆 {r.minClearanceM.toFixed(1)}m</Tag>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </BottomSheet>

      {/* 场景地图浮层：展示场景点云；下方航线列表切换是否在地图中标注该航线 */}
      <BottomSheet open={mapOpen} onMask={() => { setMapOpen(false); setMapPickOpen(false); }}>
        <div className="flex items-center gap-1" style={{ height: 32, marginBottom: 10 }}>
          <button
            className="flex items-center justify-center pressable"
            style={{ width: 30, height: 30, borderRadius: 9, color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setMapOpen(false)}
            aria-label="返回"
          >
            <IconChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>场景地图</span>
          {/* 地址下拉：切换不同场景地图 */}
          <div className="relative ml-auto">
            <button
              className="flex items-center gap-1 pressable"
              style={{
                padding: '4px 11px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
                background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                color: 'var(--brand-subtle-text)', fontWeight: 500,
              }}
              onClick={() => setMapPickOpen(v => !v)}
            >
              {scenes.find(sc => sc.id === mapSceneId)?.name ?? pickScene?.name ?? '一号仓 A区'}
              <span style={{ display: 'inline-flex', transform: mapPickOpen ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
                <IconChevronDown size={10} />
              </span>
            </button>
            {mapPickOpen && (() => {
              const curMapScene = mapSceneId ?? pickSceneId;
              return (
              <div
                className="absolute"
                style={{
                  right: 0, top: 32, width: 172, zIndex: 30,
                  background: 'var(--glass-bg)', backdropFilter: 'blur(14px)',
                  border: '1px solid var(--border-strong)', borderRadius: 10,
                  boxShadow: 'var(--shadow-popover)',
                }}
              >
              <div className="flex flex-col" style={{ padding: 5, gap: 2 }}>
                {scenes.map(sc => {
                  const cur = sc.id === curMapScene;
                  return (
                    <button
                      key={sc.id}
                      className="flex items-center gap-2 text-left pressable"
                      style={{
                        padding: '8px 10px', borderRadius: 7, fontSize: 12.5, cursor: 'pointer',
                        background: cur ? 'var(--brand-subtle-bg)' : 'transparent',
                        color: cur ? 'var(--brand-subtle-text)' : 'var(--text-primary)',
                        fontWeight: cur ? 500 : 400,
                      }}
                      onClick={() => {
                        setMapSceneId(sc.id);
                        setMapRouteId(routes.find(r => r.sceneId === sc.id)?.id ?? null);
                        setMapPickOpen(false);
                      }}
                    >
                      <span className="flex-1 truncate">{sc.name}</span>
                      {cur && (
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3.4 8.4 6.6 11.6 12.6 4.8" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
              </div>
              );
            })()}
          </div>
        </div>
        {mapOpen && (() => {
          const mapRoute = routes.find(r => r.id === mapRouteId) ?? null;
          return (
            <div
              key={`${mapSceneId ?? 'cur'}-${mapRouteId ?? 'none'}`}
              style={{
                height: 220, borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--card-stroke)',
              }}
            >
              <Viewport
                waypointCount={mapRoute?.waypointCount ?? route?.waypointCount ?? 24}
                altitudeM={mapRoute?.altitudeM ?? route?.altitudeM ?? 5.2}
                sceneId={mapSceneId ?? pickSceneId ?? undefined}
                layers={{ cloud: true, route: !!mapRoute, track: false, boxes: false, labels: false }}
                presets={['top', 'iso']}
              />
            </div>
          );
        })()}
        <div className="dlabel mt-3 mb-1.5" style={{ fontSize: 11 }}>
          该场景有 {routes.filter(r => r.sceneId === (mapSceneId ?? pickSceneId)).length} 条航线
        </div>
        <div className="flex flex-col gap-1.5" style={{ maxHeight: 170, overflowY: 'auto' }}>
          {routes.filter(r => r.sceneId === (mapSceneId ?? pickSceneId)).map(r => {
            const shown = r.id === mapRouteId;
            return (
              <button
                key={r.id}
                className="flex items-center gap-2 text-left pressable"
                style={{
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                  background: shown ? 'var(--brand-subtle-bg)' : 'var(--fill-quiet)',
                  border: `1px solid ${shown ? 'var(--brand-border)' : 'transparent'}`,
                }}
                onClick={() => setMapRouteId(v => (v === r.id ? null : r.id))}
              >
                <span className="flex-1 truncate" style={{ fontSize: 13.5, fontWeight: shown ? 500 : 400 }}>
                  {r.name || '未命名航线'}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {r.waypointCount} 航点
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}
