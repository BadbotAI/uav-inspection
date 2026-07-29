export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline' | 'ghost';

const styles: Record<ButtonVariant, React.CSSProperties> = {
  // 扁平克制：纯色钢蓝，无渐变无辉光无投影
  primary: {
    background: 'var(--brand)',
    color: '#FFFFFF',
    border: '1px solid transparent',
    boxShadow: '0 2px 10px rgba(76,107,192,.30)',
  },
  secondary: {
    background: 'var(--surface-1)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-default)',
  },
  danger: { background: 'var(--danger)', color: '#FFFFFF', border: '1px solid transparent' },
  'danger-outline': {
    background: 'var(--danger-bg)', color: 'var(--danger)',
    border: '1px solid rgba(217,69,60,.4)',
  },
  ghost: { background: 'transparent', color: 'var(--text-link)', border: 'none' },
};

export function Button({
  variant = 'primary', disabled, onClick, children, small, style, className = '',
}: {
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  small?: boolean;
  style?: React.CSSProperties;
  className?: string;
}) {
  return (
    <button
      className={`w-full select-none ${disabled ? '' : 'pressable'} ${className}`}
      style={{
        borderRadius: 8,
        height: small ? 36 : 46,
        fontSize: small ? 13 : 14.5,
        fontWeight: 500,
        transition: 'background .12s',
        ...styles[variant],
        ...(disabled ? {
          background: 'var(--surface-3)', color: 'var(--text-placeholder)',
          border: '1px solid var(--border-subtle)', cursor: 'default', boxShadow: 'none',
        } : { cursor: 'pointer' }),
        ...style,
      }}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// 居中的窄版主操作按钮容器：主 CTA 不再通宽
export function CtaRow({ children, width = 240 }: { children: React.ReactNode; width?: number }) {
  return <div style={{ width, maxWidth: '100%', margin: '0 auto' }}>{children}</div>;
}
