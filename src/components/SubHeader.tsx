// 子页面导航头：返回 + 标题 + 可选右侧动作
import { IconChevronLeft } from './Icons';

export function SubHeader({
  title, onBack, right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-1 shrink-0"
      style={{ height: 52, padding: '0 8px', borderBottom: '1px solid var(--divider)' }}
    >
      <button
        className="flex items-center justify-center"
        style={{
          width: 36, height: 36, borderRadius: 10,
          color: 'var(--text-secondary)', cursor: 'pointer', background: 'transparent',
        }}
        onClick={onBack}
        aria-label="返回"
      >
        <IconChevronLeft size={17} />
      </button>
      <div className="flex-1 truncate" style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
      {right}
    </div>
  );
}

// 三维区上的悬浮返回按钮（与画布控件统一：28px 玻璃胶囊）
export function FloatBack({ onBack, icon }: { onBack: () => void; icon?: React.ReactNode }) {
  return (
    <button
      className="absolute flex items-center justify-center"
      style={{
        top: 12, left: 10, zIndex: 10,
        width: 28, height: 28, borderRadius: 999,
        background: 'rgba(255,255,255,.85)', border: '1px solid var(--border-default)',
        color: 'var(--text-primary)', cursor: 'pointer',
        backdropFilter: 'blur(6px)', boxShadow: 'var(--shadow-card)',
      }}
      onClick={onBack}
      aria-label="返回"
    >
      {icon ?? <IconChevronLeft size={15} />}
    </button>
  );
}
