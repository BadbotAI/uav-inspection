// G-04 四态反馈：加载（骨架屏）/ 空态 / 错误态 / 无权限
import { Button } from './Button';

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-[10px] border border-line bg-ink2 p-3">
          <div className="h-3 w-2/5 rounded bg-ink3 mb-2" />
          <div className="h-2.5 w-4/5 rounded bg-ink3 mb-1.5" />
          <div className="h-2.5 w-3/5 rounded bg-ink3" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ text, sub, icon, actionText, onAction, primary }: {
  text: string;
  sub?: string;             // 一句话解释为什么是空的 / 怎么才会有内容
  icon?: React.ReactNode;   // 可选的线性图标，置于文案上方
  actionText?: string;
  onAction?: () => void;
  primary?: boolean;        // 冷启动态下主路径动作用主按钮
}) {
  return (
    <div className="flex flex-col items-center py-10 px-6">
      {icon && (
        <span
          className="flex items-center justify-center mb-3"
          style={{
            width: 48, height: 48, borderRadius: 999,
            background: 'var(--fill-quiet)', color: 'var(--text-tertiary)',
          }}
        >
          {icon}
        </span>
      )}
      <div className="text-[13px]" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{text}</div>
      {sub && (
        <div className="text-center leading-[1.6] mt-1" style={{ fontSize: 11.5, color: 'var(--text-tertiary)', maxWidth: 240 }}>
          {sub}
        </div>
      )}
      {actionText && (
        <div style={{ width: 160 }} className="mt-4">
          <Button variant={primary ? 'primary' : 'secondary'} small onClick={onAction}>{actionText}</Button>
        </div>
      )}
    </div>
  );
}

// 错误态：错误码 + 原因 + 重试按钮。禁止只有文案没有动作。
export function ErrorState({ code, reason, onRetry }: {
  code: string; reason: string; onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 px-6">
      <div className="mono text-[11px]" style={{ color: 'var(--warn)' }}>{code}</div>
      <div className="text-[12.5px]" style={{ color: 'var(--txt2)' }}>{reason}</div>
      <div style={{ width: 160 }} className="mt-1">
        <Button variant="secondary" small onClick={onRetry}>重试</Button>
      </div>
    </div>
  );
}
