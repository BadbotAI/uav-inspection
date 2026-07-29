// 成果详情容器：三维视图常驻在上（可收起），下方页签只切内容
import { useState } from 'react';
import { useStore, type ResultView } from '../store';
import { Viewport } from '../components/Viewport';
import { Pill } from '../components/Pill';
import { FloatBack } from '../components/SubHeader';
import { IconChevronDown } from '../components/Icons';
import { ResultTabs, PartialBar, taskTimeText } from './ResultShared';
import { ResultProcess } from './ResultProcess';
import { ResultOutcome } from './ResultOutcome';
import type { Task } from '../types';

// 堆体 id → 场景中的 pile 序号
function pileIdxOf(task: Task, stackIdx: number): number {
  const id = task.stacks[stackIdx]?.id ?? '';
  if (id === 'S-A') return 0;
  if (id === 'S-B') return 1;
  if (id === 'S-C') return 2;
  return Math.min(stackIdx, 2);
}

export function ResultDetail({ task, view }: { task: Task; view: ResultView }) {
  const set = useStore(s => s.set);
  const routes = useStore(s => s.routes);
  const vpFull = useStore(s => s.vpFull);
  const [collapsed, setCollapsed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null); // stack index
  const taskRoute = routes.find(r => r.id === task.routeId);
  const altitudeM = taskRoute?.altitudeM ?? 5.2;

  const selStack = selected !== null ? task.stacks[selected] : null;

  // 点选堆体：不弹卡片，直接切到对应页签并定位到该堆体卡片
  const onSelectPile = (pileIdx: number | null) => {
    if (pileIdx === null) { setSelected(null); return; }
    const idx = task.stacks.findIndex((_, i) => pileIdxOf(task, i) === pileIdx);
    setSelected(idx >= 0 ? idx : null);
    if (idx >= 0 && view !== 'result') {
      set({ resultSub: { taskId: task.id, view: 'result' } });
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 三维区：常驻挂载，收起时压缩高度但不销毁引擎；全屏时撑满 */}
      <div
        className="shrink-0 relative overflow-hidden"
        style={{ height: collapsed ? 0 : vpFull ? '100%' : '44%', transition: 'height .25s ease' }}
      >
        <FloatBack onBack={() => (vpFull ? set({ vpFull: false }) : set({ resultSub: null }))} />
        {/* 收起三维：位于三维区与下方内容交界处的居中把手，向上收起 */}
        {!vpFull && !collapsed && (
          <button
            className="absolute flex items-center justify-center"
            style={{
              left: '50%', bottom: 8, transform: 'translateX(-50%)',
              width: 46, height: 22, borderRadius: 999, zIndex: 10,
              background: 'rgba(255,255,255,.85)', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', cursor: 'pointer', backdropFilter: 'blur(6px)',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={() => setCollapsed(true)}
            aria-label="收起三维视图"
          >
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}>
              <IconChevronDown size={12} />
            </span>
          </button>
        )}
        <Viewport
          waypointCount={task.waypointTotal}
          altitudeM={altitudeM}
          sceneId={taskRoute?.sceneId}
          layers={{ cloud: true, route: false, track: true, boxes: true, labels: false }}
          layerPanel
          presets={['top', 'iso']}
          flight={{ prog: task.coveragePct / 100, droneVisible: false }}
          onSelectPile={onSelectPile}
          selectedPile={selected !== null ? pileIdxOf(task, selected) : null}
          labelNames={task.stacks.map(s => s.name)}
          fullscreenable
        />
      </div>

      {/* 全屏时下方信息全部收起 */}
      {!vpFull && <>
      {/* 收起后的展开条 */}
      {collapsed && (
        <button
          className="flex items-center justify-between shrink-0"
          style={{
            height: 40, padding: '0 16px', cursor: 'pointer',
            background: 'var(--glass-bar)', borderBottom: '1px solid var(--divider)',
          }}
          onClick={() => setCollapsed(false)}
        >
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>点云视图</span>
          <span className="flex items-center gap-1" style={{ fontSize: 11.5, color: 'var(--text-link)' }}>
            展开
            <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><IconChevronDown size={11} /></span>
          </span>
        </button>
      )}

      <PartialBar task={task} forVolume={view === 'result'} />

      {/* 任务上下文条 */}
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ padding: '10px 16px 0' }}
      >
        <span className="flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 500 }}>
          {task.routeName}
        </span>
        <span className="mono shrink-0" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          {task.startedAt.slice(0, 10)} {task.startedAt.slice(11, 19)}
        </span>
        <Pill tone={task.status === 'success' ? 'hi' : task.status === 'aborted' ? 'mid' : 'lo'}>
          {task.status === 'success' ? '完成' : task.status === 'aborted' ? '中断' : '失败'}
        </Pill>
      </div>

      <div className="shrink-0" style={{ padding: '10px 16px 0' }}>
        <ResultTabs task={task} view={view} />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        {view === 'process' && <ResultProcess task={task} />}
        {view === 'result' && (
          <ResultOutcome
            task={task}
            focusId={selStack?.id ?? null}
            // 明细行点击 → 三维中高亮对应堆体（再点取消）
            onPick={id => {
              const idx = task.stacks.findIndex(st => st.id === id);
              if (idx < 0) return;
              setSelected(sel => (sel === idx ? null : idx));
              setCollapsed(false);
            }}
          />
        )}
      </div>
      </>}
    </div>
  );
}
