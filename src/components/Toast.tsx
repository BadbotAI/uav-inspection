import { useStore } from '../store';

export function Toast() {
  const toast = useStore(s => s.toast);
  if (!toast) return null;
  return (
    <div className="absolute left-0 right-0 z-[60] flex justify-center pointer-events-none" style={{ bottom: 96 }}>
      <div
        style={{
          padding: '9px 16px', borderRadius: 10, fontSize: 13,
          background: 'var(--surface-2)', border: '1px solid var(--border-default)',
          color: 'var(--text-primary)', boxShadow: 'var(--shadow-popover)',
        }}
      >
        {toast}
      </div>
    </div>
  );
}
