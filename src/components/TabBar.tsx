import { useStore, type Tab } from '../store';

const ICONS: Record<Tab, React.ReactNode> = {
  home: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="10" cy="10" r="6.4" />
      <circle cx="10" cy="10" r="1.4" fill="currentColor" stroke="none" />
      <path d="M10 1.5v3M10 15.5v3M1.5 10h3M15.5 10h3" />
    </svg>
  ),
  routes: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M4.5 15.5 C 10 15.5, 5.5 8.5, 10 7 C 13.5 5.8, 13.5 4.5, 15 4" strokeDasharray="2.6 2" />
      <circle cx="4.5" cy="15.5" r="1.9" />
      <rect x="13.2" y="2.2" width="4" height="4" rx="1.1" />
    </svg>
  ),
  results: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10 2.2 L17 6 L17 14 L10 17.8 L3 14 L3 6 Z" />
      <path d="M3 6 L10 9.8 L17 6 M10 9.8 V17.8" />
    </svg>
  ),
  device: (
    <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="6" y="6" width="8" height="8" rx="1.6" />
      <path d="M3 3 L6.5 6.5 M17 3 L13.5 6.5 M3 17 L6.5 13.5 M17 17 L13.5 13.5" />
      <circle cx="3" cy="3" r="1.3" /><circle cx="17" cy="3" r="1.3" />
      <circle cx="3" cy="17" r="1.3" /><circle cx="17" cy="17" r="1.3" />
    </svg>
  ),
};

const LABELS: Record<Tab, string> = {
  home: '巡检', routes: '航线', results: '数据', device: '设备',
};

export function TabBar() {
  const tab = useStore(s => s.tab);
  const gotoTab = useStore(s => s.gotoTab);
  return (
    <div
      className="flex shrink-0"
      style={{
        height: 58, borderTop: '1px solid var(--divider)',
        background: 'var(--glass-bar)', backdropFilter: 'blur(14px)',
        padding: '6px 8px',
      }}
    >
      {(Object.keys(LABELS) as Tab[]).map(t => {
        const active = tab === t;
        return (
          <button
            key={t}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 pressable"
            style={{
              color: active ? 'var(--brand-subtle-text)' : 'var(--text-tertiary)',
              background: active ? 'var(--brand-subtle-bg)' : 'transparent',
              borderRadius: 10, cursor: 'pointer', margin: '0 2px',
              transition: 'background .15s',
            }}
            onClick={() => gotoTab(t)}
          >
            {ICONS[t]}
            <span style={{ fontSize: 10.5, fontWeight: active ? 500 : 400 }}>{LABELS[t]}</span>
          </button>
        );
      })}
    </div>
  );
}
