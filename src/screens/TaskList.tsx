// S-00 巡检数据
// 卡片信息分三层：头部（时间+状态）/ 主区（实景缩略图+结果）/ 底部过程指标
// 成果本机保留 7 天，超期显示失效；长按可删除
import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card } from '../components/Card';
import { Pill } from '../components/Pill';
import { IconMore, IconArrowDown, IconPin } from '../components/Icons';
import { EmptyState } from '../components/Feedback';
import { Dialog } from '../components/BottomSheet';
import {
  fmtDuration, fmtRelDay, fmtDateShort, fmtHM, daysAgo, RESULT_RETENTION_DAYS,
} from '../constants';
import type { Task } from '../types';

// 实景缩略图：机载相机实拍样张，按任务 id 稳定取图
function Thumb({ taskId }: { taskId: string }) {
  let h = 0;
  for (const c of taskId) h = (h * 31 + c.charCodeAt(0)) % 997;
  const src = `photos/wp_0${(h % 8) + 1}.jpg`;
  return (
    <img
      src={src}
      alt="巡检实景"
      style={{
        width: 64, height: 48, borderRadius: 6, flexShrink: 0,
        objectFit: 'cover', border: '1px solid var(--border-subtle)',
        background: '#171B23',
      }}
    />
  );
}

function timeText(t: Task): string {
  return fmtRelDay(t.startedAt) === '今天'
    ? `今天 ${fmtHM(t.startedAt)}`
    : `${fmtDateShort(t.startedAt)} ${fmtHM(t.startedAt)}`;
}

// 巡检记录卡：历史列表与首页「上次巡检」共用
export function TaskCard({
  task, expired, onClick, onLongPress, onMore,
}: {
  task: Task;
  expired?: boolean;
  onClick?: () => void;
  onLongPress?: () => void;
  onMore?: () => void;
}) {
  const stacked = task.stacks[0]?.cargoType === 'stacked';
  const value = stacked
    ? task.stacks.reduce((a, s) => a + (s.totalCount ?? 0), 0).toLocaleString()
    : (Math.round(task.stacks.reduce((a, s) => a + s.volumeM3, 0) * 10) / 10).toFixed(1);
  const unit = stacked ? '件' : 'm³';
  const sub = stacked ? `${task.stacks.length} 个货位` : `${task.stacks.length} 个堆体`;

  // 信息权重：巡检时间 + 成功与否为主，结果与过程为辅，卡片保持紧凑
  return (
    <Card
      style={{ opacity: expired ? 0.62 : 1 }}
      onClick={onClick}
      onLongPress={onLongPress}
    >
      {/* 头部：巡检时间 + 状态 */}
      <div className="flex items-center gap-2">
        <span className="mono flex-1 truncate" style={{ fontSize: 13.5, fontWeight: 600 }}>
          {timeText(task)}
        </span>
        {expired && <Pill tone="neutral">已失效</Pill>}
        <Pill tone={task.status === 'success' ? 'hi' : task.status === 'aborted' ? 'mid' : 'lo'}>
          {task.status === 'success' ? '完成' : task.status === 'aborted' ? '中断' : '失败'}
        </Pill>
        {onMore && (
          <button
            className="flex items-center justify-center shrink-0"
            style={{
              width: 26, height: 26, borderRadius: 8, marginRight: -6,
              color: 'var(--text-tertiary)', cursor: 'pointer',
            }}
            onClick={e => { e.stopPropagation(); onMore(); }}
            aria-label="更多操作"
          >
            <IconMore size={13} />
          </button>
        )}
      </div>

      {/* 内容区：缩略图 + 结果 + 一行过程摘要 */}
      <div className="flex items-center gap-2.5 mt-2">
        <Thumb taskId={task.id} />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1">
            <span className="mono" style={{ fontSize: 15, lineHeight: 1.1, fontWeight: 500 }}>
              {value}
            </span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{unit}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)', marginLeft: 4 }}>{sub}</span>
          </div>
          <div className="truncate mt-1" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
            {task.routeName} · {fmtDuration(task.durationSec)} · 覆盖 {task.coveragePct}%
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TaskList() {
  const tasks = useStore(s => s.tasks);
  const routes = useStore(s => s.routes);
  const scenes = useStore(s => s.scenes);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const [removing, setRemoving] = useState<Task | null>(null);
  // 与航线页同构：分场景分组 / 最新创建 / 巡检时间（方向可切）
  const [sortKey, setSortKey] = useState<'scene' | 'created' | 'run'>('created');
  const [runDesc, setRunDesc] = useState(true);

  const isExpired = (t: Task) => daysAgo(t.startedAt) > RESULT_RETENTION_DAYS;

  const sceneOf = (t: Task) => routes.find(r => r.id === t.routeId)?.sceneId ?? null;
  const sorted = [...tasks].sort((a, b) =>
    sortKey === 'run' && !runDesc
      ? a.startedAt.localeCompare(b.startedAt)
      : b.startedAt.localeCompare(a.startedAt));

  const renderTask = (t: Task) => {
    const expired = isExpired(t);
    return (
      <TaskCard
        key={t.id}
        task={t}
        expired={expired}
        onClick={() => {
          if (expired) {
            showToast(`结果已超过 ${RESULT_RETENTION_DAYS} 天保留期，本机数据已清理`);
            return;
          }
          set({ resultSub: { taskId: t.id, view: 'process' } });
        }}
        onLongPress={() => setRemoving(t)}
        onMore={() => setRemoving(t)}
      />
    );
  };

  const confirmRemove = async () => {
    if (!removing) return;
    await api.deleteTask(removing.id);
    const list = await api.getTasks();
    set({ tasks: list });
    setRemoving(null);
    showToast('已删除');
  };

  return (
    <div className="flex-1 overflow-y-auto relative" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', letterSpacing: '0.01em' }}>巡检数据</div>
      <div className="mt-0.5" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
        共 {tasks.length} 次巡检 · 结果本机保留 {RESULT_RETENTION_DAYS} 天，超期失效
      </div>

      {/* 筛选：与航线页同构 */}
      <div className="flex items-center gap-1.5 mt-3">
        {([
          ['scene', '分场景展示'], ['created', '最新创建'], ['run', '巡检时间'],
        ] as const).map(([k, name]) => {
          const active = sortKey === k;
          return (
            <button
              key={k}
              className="pressable flex items-center gap-1"
              style={{
                fontSize: 11.5, padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                background: active ? 'var(--brand-subtle-bg)' : 'var(--surface-3)',
                border: `1px solid ${active ? 'var(--brand-border)' : 'transparent'}`,
                color: active ? 'var(--brand-subtle-text)' : 'var(--text-secondary)',
                fontWeight: active ? 500 : 400,
              }}
              onClick={() => {
                if (k === 'run' && sortKey === 'run') { setRunDesc(v => !v); return; }
                setSortKey(k);
              }}
            >
              {name}
              {k === 'run' && (
                <span
                  style={{
                    display: 'inline-flex',
                    transform: sortKey === 'run' && !runDesc ? 'rotate(180deg)' : 'none',
                    transition: 'transform .15s',
                  }}
                >
                  <IconArrowDown size={10} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3.5">
        {tasks.length === 0 ? (
          <EmptyState
            text="还没有巡检记录"
            actionText="去发起巡检"
            onAction={() => set({ tab: 'home' })}
          />
        ) : sortKey !== 'scene' ? (
          <div className="flex flex-col gap-3">{sorted.map(renderTask)}</div>
        ) : scenes.map(sc => {
          const scTasks = sorted.filter(t => sceneOf(t) === sc.id);
          if (scTasks.length === 0) return null;
          return (
            <div key={sc.id} className="mb-4">
              <div className="flex items-center gap-2 mb-2" style={{ padding: '2px 2px' }}>
                <span
                  className="shrink-0 flex items-center gap-1.5"
                  style={{
                    padding: '5px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                    background: 'var(--brand-subtle-bg)', border: '1px solid var(--brand-border)',
                    color: 'var(--brand-subtle-text)',
                  }}
                >
                  <IconPin size={13} />
                  {sc.name}
                </span>
              </div>
              <div className="flex flex-col gap-3">{scTasks.map(renderTask)}</div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={!!removing}
        title="删除该巡检记录？"
        body="删除后本机结果数据将被清理，无人机上的原始数据不受影响。"
        actions={[
          { label: '取消', onClick: () => setRemoving(null) },
          { label: '删除', tone: 'danger', onClick: confirmRemove },
        ]}
      />
    </div>
  );
}
