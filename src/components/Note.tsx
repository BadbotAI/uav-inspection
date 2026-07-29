// 观点说明条：左侧细竖线
export function Note({ children, tone = 'brand' }: { children: React.ReactNode; tone?: 'brand' | 'warn' | 'mid' | 'sig' }) {
  const color =
    tone === 'warn' ? 'var(--danger)'
    : tone === 'mid' ? 'var(--warning)'
    : 'var(--brand-text)';
  return (
    <div
      className="leading-[1.7]"
      style={{
        fontSize: 11.5,
        borderLeft: `2px solid ${color}`,
        paddingLeft: 10,
        color: 'var(--text-tertiary)',
      }}
    >
      {children}
    </div>
  );
}

// 黄色警示条（R-01 / 部分覆盖）
export function WarnBar({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="leading-[1.6]"
      style={{
        fontSize: 11.5, borderRadius: 10, padding: '9px 12px',
        color: 'var(--warning)', background: 'var(--warning-bg)',
        border: '1px solid rgba(232,164,63,.3)',
      }}
    >
      {children}
    </div>
  );
}
