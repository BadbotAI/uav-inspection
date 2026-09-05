// 成果页共用：页签 + 部分覆盖黄条
// 三维视图常驻在页签之上，不参与切换
import { useStore, type ResultView } from '../store';
import { fmtRelDay, fmtDateShort, fmtHM } from '../constants';
import type { Task } from '../types';

const VIEWS: { key: ResultView; label: string }[] = [
  { key: 'process', label: '巡检过程' },
  { key: 'result', label: '巡检结果' },
];

export function taskTimeText(task: Task): string {
  return fmtRelDay(task.startedAt) === '今天'
    ? `今天 ${fmtHM(task.startedAt)}`
    : `${fmtDateShort(task.startedAt)} ${fmtHM(task.startedAt)}`;
}

// 轻盈页签：无底色，文案下方短横线指示
export function ResultTabs({ task, view }: { task: Task; view: ResultView }) {
  const set = useStore(s => s.set);
  return (
    <div className="flex" style={{ borderBottom: '1px solid var(--divider)' }}>
      {VIEWS.map(v => {
        const active = view === v.key;
        return (
          <button
            key={v.key}
            className="flex-1 flex flex-col items-center gap-1.5"
            style={{
              padding: '8px 0 0', fontSize: 13.5,
              fontWeight: active ? 600 : 400,
              color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
              cursor: 'pointer', background: 'transparent',
              transition: 'color .15s',
            }}
            onClick={() => set({ resultSub: { taskId: task.id, view: v.key } })}
          >
            {v.label}
            <span
              style={{
                width: 24, height: 3, borderRadius: 2, marginBottom: -1,
                background: active ? 'var(--brand)' : 'transparent',
                transition: 'background .15s',
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export function PartialBar({ task }: { task: Task; forVolume?: boolean }) {
  if (task.coveragePct >= 100) return null;
  return (
    <div
      className="leading-[1.55]"
      style={{
        fontSize: 11.5, padding: '8px 14px',
        background: 'var(--warning-bg)',
        borderBottom: '1px solid rgba(232,164,63,.35)',
        color: 'var(--warning)',
      }}
    >
      本次仅覆盖 {task.coveragePct}%，未覆盖区域的堆体未纳入统计
    </div>
  );
}
