// X-01 起飞倒计时（全屏覆盖层）—— 后悔窗口必须好按
import { useEffect } from 'react';
import { useStore } from '../store';
import { DroneShowcase } from '../components/DroneShowcase';
import { cancelCountdown } from '../sim/flight';

export function Countdown() {
  const n = useStore(s => s.mission.countdown);

  useEffect(() => {
    const onCancel = () => cancelCountdown();
    window.addEventListener('countdown-cancel', onCancel);
    return () => window.removeEventListener('countdown-cancel', onCancel);
  }, []);

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-9"
      style={{ background: 'var(--ink)' }}
    >
      <div className="w-full" style={{ maxWidth: 300 }}>
        <DroneShowcase height={170} plain />
      </div>
      <div
        key={n}
        className="mono count-pop"
        style={{ fontSize: 88, color: 'var(--brand)', lineHeight: 1 }}
      >
        {n}
      </div>
      <button
        style={{
          width: 200, height: 48, borderRadius: 12,
          background: 'var(--surface-1)', border: '1px solid var(--border-default)',
          color: 'var(--text-primary)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
          boxShadow: 'var(--shadow-card)',
        }}
        onClick={cancelCountdown}
      >
        取消起飞
      </button>
    </div>
  );
}
