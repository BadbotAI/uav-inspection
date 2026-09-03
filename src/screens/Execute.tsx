// X-02 执行主视图（核心页）+ X-03 停障处置 + X-04 返航中
// 约束 C1：整个执行态只有暂停与返航两个指令
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Viewport } from '../components/Viewport';
import { Button } from '../components/Button';
import { FloatBack } from '../components/SubHeader';
import { IconChevronDown, IconDrone, IconCameraFill, IconRotate, IconPortrait } from '../components/Icons';
import { startReturn, RETURN_ETA_S } from '../sim/flight';
import { fmtDuration, BATTERY_LOW_PCT } from '../constants';

// 横屏时右侧仪表栏宽度；三维画面占其余全部宽度
const PANEL_W = 272;

// 返航需长按 1 秒触发，长按时按钮内显示进度填充
function LongPressReturn({ disabled, onFired }: { disabled?: boolean; onFired?: () => void }) {
  const [pressPct, setPressPct] = useState(0);
  const timerRef = useRef<number>(0);
  const startRef = useRef(0);

  const stop = () => {
    cancelAnimationFrame(timerRef.current);
    setPressPct(0);
  };

  const start = () => {
    if (disabled) return;
    startRef.current = performance.now();
    const step = () => {
      const pct = Math.min(1, (performance.now() - startRef.current) / 1000);
      setPressPct(pct);
      if (pct >= 1) {
        setPressPct(0);
        startReturn('user');
        onFired?.();
      } else {
        timerRef.current = requestAnimationFrame(step);
      }
    };
    timerRef.current = requestAnimationFrame(step);
  };

  return (
    <button
      className="relative flex-1 overflow-hidden select-none"
      style={{
        height: 46, borderRadius: 10, background: 'transparent',
        border: '1px solid var(--warn)', color: 'var(--warn)',
        fontSize: 15, fontWeight: 500, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, touchAction: 'none',
      }}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
    >
      <span
        className="absolute inset-y-0 left-0"
        style={{ width: `${pressPct * 100}%`, background: 'rgba(217,74,61,.25)' }}
      />
      <span className="relative">返航</span>
    </button>
  );
}

export function Execute() {
  const mission = useStore(s => s.mission);
  const routes = useStore(s => s.routes);
  const patchMission = useStore(s => s.patchMission);
  const vpFull = useStore(s => s.vpFull);
  const landscape = useStore(s => s.landscape);
  const set = useStore(s => s.set);
  const route = routes.find(r => r.id === mission.routeId);
  const [obSheet, setObSheet] = useState(false);
  const [returnFlash, setReturnFlash] = useState(false);

  // 离开执行主视图（最小化 / 进入处理 / 异常）时整机复位竖屏
  useEffect(() => () => { useStore.setState({ landscape: false }); }, []);

  // 长按返航确认后的过渡反馈
  const fireReturnFlash = () => {
    setReturnFlash(true);
    setTimeout(() => setReturnFlash(false), 1500);
  };

  const isReturning = mission.state === 'RETURNING' || mission.state === 'LANDED';
  const isHover = mission.state === 'HOVERING';
  const obstacle = isHover && (mission.hoverReason === 'obstacle' || mission.hoverReason === 'loc');

  useEffect(() => { setObSheet(obstacle); }, [obstacle]);

  if (!route) return null;

  const total = route.waypointCount;
  const pct = Math.round(mission.prog * 100);
  const lifting = mission.state === 'FLYING' && mission.liftT < 1;
  const stateText = isReturning ? '返航中' : isHover ? '悬停中' : lifting ? '起飞中' : '执行中';
  const stateColor = isHover ? 'var(--warning)' : isReturning ? 'var(--text-secondary)' : 'var(--brand)';

  return (
    <div
      className="absolute inset-0 z-20 flex"
      style={{ background: 'var(--ink)', flexDirection: landscape ? 'row' : 'column' }}
    >
      {/* 三维区：竖屏占上方 44%；横屏占右栏以外全部宽度；全屏时撑满 */}
      <div
        className="shrink-0 relative"
        style={landscape
          ? { flex: 1, minWidth: 0, height: '100%' }
          : { height: vpFull ? '100%' : '44%', transition: 'height .25s ease' }}
      >
        {/* 收起执行态：任务继续，可回其他界面，顶部回归条随时返回监控 */}
        <FloatBack icon={<IconChevronDown size={15} />} onBack={() => patchMission({ minimized: true })} />
        {/* 横竖屏切换：大屏展示时三维画面铺满、仪表靠右 */}
        <button
          className="absolute flex items-center justify-center"
          style={{
            top: 12, left: 44, zIndex: 10,
            width: 28, height: 28, borderRadius: 999,
            background: 'rgba(255,255,255,.85)', border: '1px solid var(--border-default)',
            color: 'var(--text-primary)', cursor: 'pointer',
            backdropFilter: 'blur(6px)', boxShadow: 'var(--shadow-card)',
          }}
          onClick={() => set({ landscape: !landscape })}
          aria-label={landscape ? '切回竖屏' : '横屏展示'}
        >
          {landscape ? <IconPortrait size={14} /> : <IconRotate size={14} />}
        </button>
        <Viewport
          waypointCount={route.waypointCount}
          altitudeM={route.altitudeM}
          sceneId={route.sceneId}
          pip
          pipLabel="实时画面"
          layers={{ cloud: true, route: true, track: true, boxes: false, labels: false }}
          presets={['top', 'iso', 'follow']}
          defaultPreset="follow"
          flight={{
            prog: mission.prog,
            droneVisible: mission.state !== 'LANDED',
            showReturn: isReturning,
            returnT: isReturning ? 1 - mission.returnEtaS / RETURN_ETA_S : undefined,
            liftT: mission.liftT,
          }}
          fullscreenable
        />
        {/* 拍摄点悬停：视角按钮下方的轻提示（透明深底，浅深画面通用） */}
        {mission.shooting && (
          <div
            className="absolute count-pop flex items-center gap-1 pointer-events-none"
            style={{
              top: 48, left: '50%', transform: 'translateX(-50%)', zIndex: 15,
              padding: '3.5px 10px', borderRadius: 999,
              background: 'rgba(16,19,26,.34)', backdropFilter: 'blur(5px)',
              color: 'rgba(255,255,255,.94)', fontSize: 10.5,
              whiteSpace: 'nowrap',
            }}
          >
            <IconCameraFill size={11} />
            拍摄记录中
          </div>
        )}

        {/* 停障探测动效：无人机 → 声呐弧线 → 前方障碍 */}
        {obstacle && mission.hoverReason === 'obstacle' && (
          <div
            className="absolute pointer-events-none"
            style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 14 }}
          >
            <div
              className="count-pop flex flex-col items-center"
              style={{
                padding: '13px 20px 11px', borderRadius: 14,
                background: 'rgba(255,255,255,.9)', backdropFilter: 'blur(8px)',
                border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-card)',
              }}
            >
              {mission.obstacleCleared ? (
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  <path d="M12 20 h6 M25 13 l7 7 M25 27 l7 -7" stroke="var(--struct)" strokeWidth="1.6" strokeLinecap="round" opacity=".0" />
                  <rect x="8" y="14" width="16" height="7" rx="2.4" stroke="var(--struct)" strokeWidth="1.5" />
                  <circle cx="8" cy="14" r="3.2" stroke="var(--struct)" strokeWidth="1.3" />
                  <circle cx="24" cy="14" r="3.2" stroke="var(--struct)" strokeWidth="1.3" />
                  <path d="M44 20 h44" stroke="var(--success)" strokeWidth="1.4" strokeLinecap="round" strokeDasharray="3 4" />
                  <circle cx="100" cy="20" r="9" stroke="var(--success)" strokeWidth="1.5" />
                  <path d="M95.5 20 l3.2 3.2 6 -6.4" stroke="var(--success)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              ) : (
                <svg width="120" height="40" viewBox="0 0 120 40" fill="none">
                  {/* 无人机（左） */}
                  <rect x="8" y="14" width="16" height="7" rx="2.4" stroke="var(--struct)" strokeWidth="1.5" />
                  <circle cx="8" cy="14" r="3.2" stroke="var(--struct)" strokeWidth="1.3" />
                  <circle cx="24" cy="14" r="3.2" stroke="var(--struct)" strokeWidth="1.3" />
                  {/* 声呐弧线 */}
                  <path className="sonar-arc" d="M46 12 a11 11 0 0 1 0 16" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
                  <path className="sonar-arc-2" d="M58 9 a15 15 0 0 1 0 22" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
                  <path className="sonar-arc-3" d="M70 6 a19 19 0 0 1 0 28" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
                  {/* 前方障碍 */}
                  <rect x="92" y="11" width="18" height="18" rx="3.4" stroke="var(--danger)" strokeWidth="1.6" />
                  <path d="M101 16 v5" stroke="var(--danger)" strokeWidth="1.6" strokeLinecap="round" />
                  <circle cx="101" cy="24.4" r="1" fill="var(--danger)" />
                </svg>
              )}
              <span
                className="mono"
                style={{ fontSize: 10.5, marginTop: 5, color: mission.obstacleCleared ? 'var(--success)' : 'var(--danger)' }}
              >
                {mission.obstacleCleared ? '航路已恢复通畅' : '前方 2.1m 检测到障碍物'}
              </span>
            </div>
          </div>
        )}

        {/* 起飞过渡：淡入三维画面 */}
        {lifting && (
          <div className="absolute inset-0 z-20 scene-fade" style={{ background: 'var(--bg-base)' }} />
        )}
      </div>

      {/* 仪表区：竖屏在三维区下方；横屏收为右侧固定宽度栏（返航按钮固定在栏底，不随内容滚动） */}
      <div
        className="flex flex-col"
        style={{
          display: vpFull ? 'none' : undefined,
          ...(landscape
            ? {
              width: PANEL_W, flexShrink: 0, height: '100%',
              borderLeft: '1px solid var(--border-subtle)', background: 'var(--bg-base)',
            }
            : { flex: 1, minHeight: 0 }),
        }}
      >
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: landscape ? '12px 12px 8px' : 14, minHeight: 0 }}>
        {/* 仪表面板：状态 / 进度 / 遥测 / 姿态一体（浅色卡片） */}
        <div
          className="shrink-0"
          style={{
            borderRadius: 'var(--card-radius)', padding: landscape ? '10px 12px' : '12px 14px',
            background: 'var(--surface-1)',
            border: '1px solid var(--card-stroke)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full ${isHover ? '' : 'dot-breathe'}`}
              style={{ width: 7, height: 7, background: stateColor }}
            />
            <span style={{ fontSize: 14, fontWeight: 600, color: stateColor }}>{stateText}</span>
            <span className="truncate" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              {route.name || '未命名航线'}
            </span>
            <span className="mono flex-1 text-right" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
              {mission.waypointDone}/{total} 航点
            </span>
          </div>

          {/* 进度 */}
          <div className="mt-2.5 rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-3)' }}>
            <div className="h-full bar-fill rounded-full" style={{ width: `${pct}%`, background: 'var(--brand)' }} />
          </div>
          {isReturning && (
            <div className="mono mt-1.5" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
              沿原航线返航 · 预计 {Math.max(0, Math.ceil(mission.returnEtaS))} 秒到达起降点
            </div>
          )}

          {/* 遥测：电量为第一信息（唯一触发强制返航的量），带剩余可飞估算；横屏栏窄时上下排布 */}
          <div className={`flex mt-3 ${landscape ? 'flex-col' : 'items-stretch'}`} style={{ gap: landscape ? 10 : 14 }}>
            <div className="shrink-0" style={{ minWidth: landscape ? undefined : 108 }}>
              <div className="dlabel">电量</div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className="mono"
                  style={{
                    fontSize: landscape ? 24 : 27, lineHeight: 1.05, fontWeight: 500,
                    color: mission.batteryPct <= BATTERY_LOW_PCT ? 'var(--danger)' : 'var(--text-primary)',
                  }}
                >
                  {Math.round(mission.batteryPct)}
                </span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>%</span>
              </div>
              <div className="mono mt-0.5" style={{ fontSize: 10, color: mission.batteryPct <= BATTERY_LOW_PCT ? 'var(--danger)' : 'var(--text-tertiary)' }}>
                约可飞 {Math.max(0, Math.round((mission.batteryPct - 12) / 3))} 分钟
              </div>
            </div>
            <div
              className="flex-1 grid"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                ...(landscape
                  ? { borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }
                  : { borderLeft: '1px solid var(--border-subtle)' }),
              }}
            >
              {[
                { label: '已飞', value: fmtDuration(mission.elapsedSec) },
                { label: '航点', value: `${mission.waypointDone}/${total}` },
                { label: '速度', value: `${mission.speedMs.toFixed(1)}m/s` },
              ].map(it => (
                <div key={it.label} className="text-center self-center">
                  <div className="dlabel">{it.label}</div>
                  <div className="mono mt-1" style={{ fontSize: 13.5 }}>{it.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 姿态 */}
          <div
            className="flex items-center justify-between mt-2.5 pt-2"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <span className="dlabel">姿态</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>
              航向 {mission.headingDeg.toFixed(0).padStart(3, '0')}° · 俯仰 {mission.pitchDeg.toFixed(1)}° · 横滚 {mission.rollDeg.toFixed(1)}°
            </span>
          </div>
        </div>

        {/* 低电量告警条 */}
        {mission.batteryPct <= BATTERY_LOW_PCT && !isReturning && (
          <div
            className="mt-2 leading-[1.5]"
            style={{
              fontSize: 11.5, padding: '7px 11px', borderRadius: 8,
              background: 'var(--danger-bg)', color: 'var(--danger)',
            }}
          >
            电量偏低（{Math.round(mission.batteryPct)}%），低于 12% 将自动返航。
          </div>
        )}

        {/* 飞行日志：横屏时吃掉剩余高度 */}
        <div className="dlabel mt-3 mb-1.5 shrink-0" style={{ fontSize: 11 }}>飞行日志</div>
        <div
          className="overflow-y-auto"
          style={{
            ...(landscape ? { flex: 1, minHeight: 56 } : { height: 88, flexShrink: 0 }),
            padding: '8px 12px', borderRadius: 8,
            background: 'var(--surface-sunken)', border: '1px solid var(--border-subtle)',
          }}
        >
          {mission.events.map((e, i) => (
            <div
              key={`${e.time}-${i}`}
              className="mono"
              style={{ fontSize: 10.5, lineHeight: 1.8, color: i === 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {e.time} {e.label}
            </div>
          ))}
        </div>

        {/* 操作区：执行中唯一指令 = 返航（长按确认） */}
        {/* 竖屏：返航按钮随内容排布 */}
        {!landscape && (!isReturning ? (
          <div className="flex shrink-0" style={{ maxWidth: 190, width: '100%', margin: '14px auto 0' }}>
            <LongPressReturn disabled={obstacle} onFired={fireReturnFlash} />
          </div>
        ) : (
          <div className="mt-3.5" />
        ))}
        </div>

        {/* 横屏：返航按钮固定在右栏底部，始终完整可见 */}
        {landscape && !isReturning && (
          <div className="shrink-0 flex" style={{ padding: '10px 12px 12px', borderTop: '1px solid var(--border-subtle)' }}>
            <LongPressReturn disabled={obstacle} onFired={fireReturnFlash} />
          </div>
        )}
      </div>

      {/* 长按返航确认反馈 */}
      {returnFlash && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(16,24,40,.26)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="count-pop flex flex-col items-center"
            style={{
              background: 'var(--surface-1)', borderRadius: 12,
              border: '1px solid var(--card-stroke)', boxShadow: 'var(--shadow-modal)',
              padding: '20px 30px',
            }}
          >
            <span
              className="flex items-center justify-center rounded-full"
              style={{ width: 40, height: 40, background: 'var(--brand-subtle-bg)', color: 'var(--brand)' }}
            >
              <IconDrone size={20} />
            </span>
            <div className="mt-2.5" style={{ fontSize: 15, fontWeight: 600 }}>已下发返航指令</div>
            <div className="mono mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              正在返航至起降点
            </div>
          </div>
        </div>
      )}

      {/* X-03 停障处置弹层：环形倒计时 + 克制的信息层次 */}
      {obSheet && (() => {
        const isObstacle = mission.hoverReason === 'obstacle';
        const total = isObstacle ? 120 : 3;
        const remain = Math.max(0, Math.ceil(mission.hoverCountdown));
        const R = 15, C = 2 * Math.PI * R;
        return (
          // 横屏时弹层只覆盖三维画面区，右侧仪表栏保持可读
          <div className="absolute bottom-0 z-40" style={{ left: 0, right: landscape && !vpFull ? PANEL_W : 0 }}>
            <div
              className="sheet-in"
              style={{
                background: 'var(--glass-bg)', backdropFilter: 'blur(18px)',
                borderRadius: '16px 16px 0 0',
                borderTop: '1px solid var(--border-strong)',
                boxShadow: 'var(--shadow-modal)',
                padding: '22px 20px 24px',
              }}
            >
              <div className="flex items-start gap-3.5">
                {/* 环形倒计时包裹告警标识 */}
                <span className="relative flex items-center justify-center shrink-0" style={{ width: 42, height: 42 }}>
                  {mission.obstacleCleared ? (
                    <svg width="42" height="42" viewBox="0 0 42 42">
                      <circle cx="21" cy="21" r={R} fill="none" stroke="var(--success)" strokeWidth="2.5" opacity=".35" />
                      <path d="M14.5 21 l4.6 4.6 8.4 -9" stroke="var(--success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  ) : (
                    <>
                      <svg width="42" height="42" viewBox="0 0 42 42" style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                        <circle cx="21" cy="21" r={R} fill="none" stroke="var(--border-subtle)" strokeWidth="2.5" />
                        <circle
                          cx="21" cy="21" r={R} fill="none"
                          stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round"
                          strokeDasharray={C}
                          strokeDashoffset={C * (1 - remain / total)}
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <svg width="15" height="15" viewBox="0 0 16 16" style={{ color: 'var(--danger)' }}>
                        <path d="M8 2.6 L14.6 13.2 H1.4 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                        <path d="M8 6.6 V9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
                      </svg>
                    </>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>
                    {mission.obstacleCleared ? '障碍物已离开'
                      : isObstacle ? '检测到障碍物，已悬停' : '定位丢失，正在原地降落'}
                  </div>
                  <div className="leading-[1.65] mt-1" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                    {mission.obstacleCleared
                      ? '前方航路恢复通畅，正在继续飞行。'
                      : isObstacle
                        ? <>机头前方 <span className="mono">2.1m</span>。障碍物离开后自动继续飞行。</>
                        : '定位不可靠时继续飞行或返航都不安全，无人机将在当前位置降落。已飞数据会正常处理，请前往无人机所在位置查看。'}
                  </div>
                </div>
              </div>

              {/* 底部：倒计时说明 + 紧凑主动作（仅停障；定位丢失自动降落，无可选动作） */}
              {!mission.obstacleCleared && isObstacle && (
                <div className="flex items-center justify-between mt-5">
                  <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
                    <span style={{ color: 'var(--danger)' }}>{remain}s</span> 后自动返航
                  </span>
                  <button
                    className="pressable"
                    style={{
                      fontSize: 13, fontWeight: 500, padding: '9px 22px', borderRadius: 999,
                      background: 'var(--danger-bg)', color: 'var(--danger)',
                      border: '1px solid rgba(217,69,60,.35)', cursor: 'pointer',
                    }}
                    onClick={() => startReturn(isObstacle ? 'user' : 'safety')}
                  >
                    立即返航
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
