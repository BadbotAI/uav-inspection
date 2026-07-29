// X-00 起飞前检查：6 项系统自动 + 1 项人工现场确认
import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { Button, CtaRow } from '../components/Button';
import { Dialog } from '../components/BottomSheet';
import { DroneShowcase } from '../components/DroneShowcase';
import { beginCountdown, cancelMission, startPreflight } from '../sim/flight';

// 统一勾选样式：通过 = 品牌蓝实心圆 + 白勾；失败 = 红实心圆 + 白叹号；待检 = 空心圆
function CheckIcon({ state }: { state: 'pass' | 'fail' | 'pending' | 'warn' }) {
  if (state === 'pass') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="var(--brand)" />
        <path d="M4.8 8.3 L7.1 10.5 L11.2 5.9" fill="none" stroke="#FFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === 'fail' || state === 'warn') {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="7" fill="var(--danger)" />
        <path d="M8 4.4 V9" stroke="#FFF" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="8" cy="11.4" r="1" fill="#FFF" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="var(--border-strong)" strokeWidth="1.2" />
    </svg>
  );
}

export function Preflight() {
  const mission = useStore(s => s.mission);
  const routes = useStore(s => s.routes);
  const [cancelOpen, setCancelOpen] = useState(false);
  const route = routes.find(r => r.id === mission.routeId);

  useEffect(() => {
    const onBack = () => setCancelOpen(true);
    window.addEventListener('preflight-back', onBack);
    return () => window.removeEventListener('preflight-back', onBack);
  }, []);

  if (!route) return null;

  const failed = mission.state === 'PREFLIGHT_FAIL';
  const checking = mission.checksShown < mission.checks.length;
  const allShown = !checking;
  const allPassed = mission.checks.every(c => c.passed);

  let btnText = '起飞';
  let btnDisabled = false;
  if (checking) { btnText = '自检中'; btnDisabled = true; }
  else if (failed || !allPassed) { btnText = '重新自检'; }

  const onMain = () => {
    if (failed || (allShown && !allPassed)) { startPreflight(route.id); return; }
    beginCountdown();
  };

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'var(--ink)' }}>
      {/* 顶栏：小标题居中，与一级页大标题拉开层级 */}
      <div className="shrink-0 flex items-center justify-center" style={{ height: 52 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>起飞前自检</span>
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ padding: '0 16px 12px' }}>
        <div className="mono text-center" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {route.name || '未命名航线'} · {route.waypointCount} 航点 · 自检项由无人机执行并回传
        </div>

        {/* 视觉重心：无人机动效居中 + 状态胶囊 */}
        <div className="shrink-0 flex flex-col items-center justify-center" style={{ minHeight: 186, padding: '6px 0' }}>
          <DroneShowcase height={128} plain />
          <div
            className="inline-flex items-center gap-2 mt-1"
            style={{
              padding: '7px 15px', borderRadius: 999, fontSize: 12, fontWeight: 500,
              background: !checking && !allPassed ? 'var(--danger-bg)' : 'var(--brand-subtle-bg)',
              color: !checking && !allPassed ? 'var(--danger)' : 'var(--brand-subtle-text)',
            }}
          >
          {checking ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ animation: 'spin .9s linear infinite' }}>
                <path d="M13.5 8a5.5 5.5 0 1 1-2.2-4.4" />
              </svg>
              无人机自检中，等待结果回传
            </>
          ) : allPassed ? (
            <>
              <svg width="13" height="13" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="7" fill="var(--brand)" />
                <path d="M4.8 8.3 L7.1 10.5 L11.2 5.9" fill="none" stroke="#FFF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              自检通过 · {mission.checks.length} 项全部正常
            </>
          ) : (
            <>自检未通过 · 请排查后重新自检</>
          )}
          </div>
        </div>

        <div className="flex flex-col" style={{ gap: 0 }}>
          {mission.checks.map((c, i) => {
            const revealed = !checking;
            return (
              <div
                key={c.key}
                className={`flex items-center gap-2.5 ${revealed ? 'check-in' : ''}`}
                style={{
                  opacity: revealed ? 1 : 0.32,
                  animationDelay: revealed ? `${i * 45}ms` : undefined,
                  padding: '4.5px 0 4.5px 10px',
                }}
              >
                <div className="shrink-0 flex items-center">
                  <CheckIcon state={revealed ? (c.passed ? 'pass' : 'fail') : 'pending'} />
                </div>
                <div className="min-w-0 flex-1">
                  {/* 失败原因完整展示不截断；通过项并为一行 */}
                  {revealed && !c.passed ? (
                    <>
                      <div style={{ fontSize: 12 }}>{c.title}</div>
                      <div className="mono mt-0.5 leading-[1.5]" style={{ fontSize: 10, color: 'var(--danger)' }}>
                        {c.detail}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-baseline gap-2">
                      <span style={{ fontSize: 12 }}>{c.title}</span>
                      <span className="mono truncate" style={{ fontSize: 9.5, color: 'var(--text-tertiary)' }}>
                        {revealed ? c.detail : '等待回传'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4">
          <CtaRow width={190}>
            <Button disabled={btnDisabled} onClick={onMain}>{btnText}</Button>
          </CtaRow>
        </div>
        <button
          className="w-full text-center text-[12.5px] py-2.5"
          style={{ color: 'var(--txt3)', cursor: 'pointer' }}
          onClick={() => setCancelOpen(true)}
        >
          取消
        </button>
      </div>

      <Dialog
        open={cancelOpen}
        title="取消本次起飞？"
        actions={[
          { label: '继续', onClick: () => setCancelOpen(false) },
          { label: '取消起飞', tone: 'danger', onClick: () => { setCancelOpen(false); cancelMission(); } },
        ]}
      />
    </div>
  );
}
