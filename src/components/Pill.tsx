// 状态徽标 + 元数据标签（DarkMode tokens §1.4/§1.5）
export type PillTone = 'neutral' | 'hi' | 'mid' | 'lo' | 'info';

const TONES: Record<PillTone, { fg: string; bg: string }> = {
  neutral: { fg: 'var(--tag-gray-fg)',  bg: 'var(--tag-gray-bg)' },
  hi:      { fg: 'var(--tag-green-fg)', bg: 'var(--tag-green-bg)' },
  mid:     { fg: 'var(--warning)',      bg: 'var(--warning-bg)' },
  lo:      { fg: 'var(--tag-red-fg)',   bg: 'var(--tag-red-bg)' },
  info:    { fg: 'var(--tag-blue-fg)',  bg: 'var(--tag-blue-bg)' },
};

export function Pill({ tone = 'neutral', children }: { tone?: PillTone; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <span
      className="inline-block leading-none"
      style={{
        fontSize: 11, borderRadius: 4, padding: '3px 7px',
        fontWeight: 500, color: t.fg, background: t.bg,
      }}
    >
      {children}
    </span>
  );
}

// 元数据标签：灰底小标签，用于航点数/时长/离堆等数据的标签化呈现
export function Tag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: PillTone }) {
  const t = TONES[tone];
  return (
    <span
      className="mono inline-flex items-center leading-none"
      style={{
        fontSize: 10.5, borderRadius: 4, padding: '3px 6px',
        color: t.fg, background: t.bg,
      }}
    >
      {children}
    </span>
  );
}
