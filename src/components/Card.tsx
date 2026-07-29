export function Card({
  children, onClick, onLongPress, className = '', style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  className?: string;
  style?: React.CSSProperties;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let longFired = false;
  return (
    <div
      className={`${onClick ? 'cursor-pointer pressable' : ''} ${className}`}
      style={{
        borderRadius: 'var(--card-radius)' as unknown as number,
        border: '1px solid var(--card-stroke)',
        background: 'var(--surface-1)',
        boxShadow: 'var(--shadow-card)',
        padding: 14,
        ...style,
      }}
      onClick={() => { if (!longFired) onClick?.(); longFired = false; }}
      onPointerDown={onLongPress ? () => {
        longFired = false;
        timer = setTimeout(() => { longFired = true; onLongPress(); }, 550);
      } : undefined}
      onPointerUp={onLongPress ? () => timer && clearTimeout(timer) : undefined}
      onPointerLeave={onLongPress ? () => timer && clearTimeout(timer) : undefined}
    >
      {children}
    </div>
  );
}
