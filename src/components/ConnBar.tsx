// G-01 设备连接状态条 —— 常驻 H-00 与 D-00 顶部
import { useStore } from '../store';

export function ConnBar() {
  const device = useStore(s => s.device);
  const mission = useStore(s => s.mission);
  const set = useStore(s => s.set);

  // 执行态最小化时，任务回归条替代连接状态条，避免双条堆叠
  if (mission.state !== 'IDLE' && mission.minimized) return null;

  let text: string;
  let dotColor = 'var(--success)';
  let action: React.ReactNode = null;

  if (!device) {
    text = '正在连接 UAV-A31C';
    dotColor = 'var(--warning)';
  } else if (!device.connected) {
    text = '未连接设备';
    dotColor = 'var(--text-placeholder)';
    action = (
      <button
        className="mono"
        style={{
          fontSize: 11, padding: '3px 9px', borderRadius: 999,
          color: 'var(--brand-text)', border: '1px solid var(--brand-border)',
          background: 'var(--brand-subtle-bg)', cursor: 'pointer',
        }}
        onClick={() => set({ tab: 'device', deviceSub: null })}
      >
        连接
      </button>
    );
  } else if (device.lossPct > 5) {
    text = `连接不稳定 · 丢包 ${device.lossPct}%`;
    dotColor = 'var(--warning)';
  } else {
    const loc = device.locQuality === 'good' ? '良好' : device.locQuality === 'fair' ? '一般' : '差';
    text = `${device.id} · ${device.batteryPct}% · 定位${loc}`;
  }

  return (
    <div
      className="flex items-center gap-2 shrink-0"
      style={{
        height: 34, padding: '0 16px',
        background: 'var(--glass-bar)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--divider)',
      }}
    >
      <span className="rounded-full" style={{ width: 6, height: 6, background: dotColor }} />
      <span className="mono flex-1" style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{text}</span>
      {action}
    </div>
  );
}
