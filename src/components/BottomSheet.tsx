export function BottomSheet({
  open, children, danger, onMask,
}: {
  open: boolean;
  children: React.ReactNode;
  danger?: boolean;
  onMask?: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end mask-in" style={{ background: 'rgba(16,24,40,.32)' }} onClick={onMask}>
      <div
        className="sheet-in"
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(18px)',
          borderRadius: '16px 16px 0 0',
          borderTop: danger ? '2px solid var(--danger)' : '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-modal), var(--inset-hi)',
          padding: '8px 20px 20px',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* 拖拽手柄示意 */}
        <div className="flex justify-center mb-3">
          <div style={{ width: 32, height: 4, borderRadius: 999, background: 'var(--border-strong)' }} />
        </div>
        {children}
      </div>
    </div>
  );
}

// 标准移动端告警弹窗：居中标题与正文，底部发丝线分隔的对半文本按钮
export interface DialogAction {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'primary' | 'danger';
}

export function Dialog({
  open, title, body, actions,
}: {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  actions: DialogAction[];
}) {
  if (!open) return null;
  const toneColor = (t?: DialogAction['tone']) =>
    t === 'danger' ? 'var(--danger)' : t === 'primary' ? 'var(--brand)' : 'var(--text-primary)';
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center mask-in" style={{ background: 'rgba(16,24,40,.36)' }}>
      <div
        className="overflow-hidden dialog-in"
        style={{
          width: 296,
          background: 'var(--glass-bg)', backdropFilter: 'blur(20px)', borderRadius: 14,
          boxShadow: 'var(--shadow-modal)',
        }}
      >
        <div className="text-center" style={{ padding: '20px 20px 16px' }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
          {body && (
            <div className="leading-[1.6] mt-1.5" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              {body}
            </div>
          )}
        </div>
        <div className="flex" style={{ borderTop: '1px solid var(--divider)' }}>
          {actions.map((a, i) => (
            <button
              key={a.label}
              className="flex-1"
              style={{
                height: 46, fontSize: 15,
                fontWeight: i === actions.length - 1 ? 500 : 400,
                color: toneColor(a.tone),
                background: 'transparent', cursor: 'pointer',
                borderLeft: i > 0 ? '1px solid var(--divider)' : 'none',
              }}
              onClick={a.onClick}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
