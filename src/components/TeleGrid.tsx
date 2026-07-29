// 三格遥测（数据标签 + 等宽数字）
export function TeleGrid({
  items,
}: {
  items: { label: string; value: React.ReactNode; accent?: boolean }[];
}) {
  return (
    <div
      className="grid overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderRadius: 'var(--card-radius)' as unknown as number,
        border: '1px solid var(--card-stroke)',
        background: 'var(--surface-1)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {items.map((it, i) => (
        <div
          key={it.label}
          className="px-2 py-3 text-center"
          style={i > 0 ? { borderLeft: '1px solid var(--border-subtle)' } : undefined}
        >
          <div className="dlabel mb-1.5">{it.label}</div>
          <div
            className="mono"
            style={{ fontSize: 17, color: it.accent ? 'var(--sig3d-ink)' : 'var(--text-primary)' }}
          >
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
