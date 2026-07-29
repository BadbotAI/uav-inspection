// G-02 任务回归条 —— 执行态最小化时所有 Tab 顶部常驻
import { useStore } from '../store';
import { PROC_STAGES } from '../sim/flight';

export function TaskRibbon() {
  const mission = useStore(s => s.mission);
  const patchMission = useStore(s => s.patchMission);

  if (mission.state === 'IDLE' || !mission.minimized) return null;

  let text = '';
  switch (mission.state) {
    case 'FLYING': text = `执行中 ${Math.round(mission.prog * 100)}%`; break;
    case 'HOVERING': text = '悬停中'; break;
    case 'RETURNING': text = '返航中'; break;
    case 'LANDED': text = '已降落'; break;
    case 'PROCESSING': text = `处理中 ${Math.round(mission.procStage / PROC_STAGES.length * 100)}%`; break;
    case 'PROCESS_FAIL': text = '处理失败'; break;
    case 'FAULT': text = '异常'; break;
    default: return null;
  }

  return (
    <button
      className="flex w-full items-center gap-2 px-4 text-left"
      style={{
        height: 36, background: 'var(--brand-subtle-bg)',
        borderBottom: '1px solid var(--brand-border)', cursor: 'pointer',
      }}
      onClick={() => patchMission({ minimized: false })}
    >
      <span className="rounded-full pulse-ring" style={{ width: 7, height: 7, background: 'var(--brand)' }} />
      <span className="mono flex-1" style={{ fontSize: 11.5, color: 'var(--brand-subtle-text)' }}>{text}</span>
      <span style={{ fontSize: 12, color: 'var(--brand-subtle-text)' }}>返回监控</span>
    </button>
  );
}
