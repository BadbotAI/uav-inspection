// X-05 数据处理 6 阶段，可最小化后台继续
import { useStore } from '../store';
import { Button, CtaRow } from '../components/Button';
import { IconChevronDown } from '../components/Icons';
import { ProcessingViz } from '../components/ProcessingViz';
import { PROC_STAGES, viewResult } from '../sim/flight';

export function Processing() {
  const mission = useStore(s => s.mission);
  const routes = useStore(s => s.routes);
  const patchMission = useStore(s => s.patchMission);
  const route = routes.find(r => r.id === mission.routeId);
  const failed = mission.state === 'PROCESS_FAIL';
  const done = mission.state === 'DONE';
  const stage = mission.procStage;
  const pct = Math.round((stage / PROC_STAGES.length) * 100);

  return (
    <div className="absolute inset-0 z-20 flex flex-col" style={{ background: 'var(--ink)' }}>
      {/* 顶栏：小标题居中，收起在右侧 */}
      <div className="relative shrink-0 flex items-center justify-center" style={{ height: 52 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{failed ? '处理失败' : '数据处理'}</span>
        {!failed && (
          <button
            className="absolute flex items-center justify-center pressable"
            style={{
              right: 12, width: 30, height: 30, borderRadius: 999,
              background: 'var(--surface-1)', border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)', cursor: 'pointer',
              boxShadow: 'var(--shadow-card)',
            }}
            onClick={() => patchMission({ minimized: true })}
            aria-label="收起"
          >
            <IconChevronDown size={14} />
          </button>
        )}
      </div>
      <div className="flex-1 flex flex-col overflow-y-auto" style={{ padding: '0 16px 16px' }}>
        <div className="text-center" style={{ fontSize: 11, color: 'var(--txt2)' }}>
          {route?.name || '未命名航线'} · 覆盖度 <span className="mono">{mission.coverage}%</span>
          {mission.coverage < 100 && <span style={{ color: 'var(--mid)' }}> · 部分覆盖</span>}
        </div>

        {/* 视觉重心：数据回传动效居中 */}
        <div className="mt-3.5">
          <ProcessingViz height={185} />
        </div>

        {/* 进度：界面组件 */}
        <div className="flex items-center gap-2.5 mt-3">
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 5, background: 'var(--surface-3)' }}>
            <div
              className="h-full bar-fill rounded-full"
              style={{ width: `${done ? 100 : pct}%`, background: failed ? 'var(--danger)' : 'var(--brand)' }}
            />
          </div>
          <span className="mono shrink-0" style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
            {done ? 100 : pct}%
          </span>
        </div>

        {/* 六阶段：紧凑列表 */}
        <div className="mt-4 flex flex-col gap-2">
          {PROC_STAGES.map((name, i) => {
            const state = failed && i === stage ? 'fail'
              : i < stage ? 'done' : i === stage && !done ? 'current' : done ? 'done' : 'pending';
            return (
              <div key={name} className="flex items-center gap-3">
                <span
                  className={`inline-block rounded-full shrink-0 ${state === 'current' ? 'pulse-ring' : ''}`}
                  style={{
                    width: 8, height: 8,
                    background:
                      state === 'done' ? 'var(--brand)'
                      : state === 'current' ? 'var(--brand)'
                      : state === 'fail' ? 'var(--danger)'
                      : 'var(--surface-3)',
                    border: state === 'pending' ? '1px solid var(--border-default)' : 'none',
                    opacity: state === 'done' ? 0.55 : 1,
                  }}
                />
                <span
                  className="text-[12px]"
                  style={{
                    color:
                      state === 'fail' ? 'var(--danger)'
                      : state === 'pending' ? 'var(--txt3)'
                      : 'var(--txt)',
                  }}
                >
                  {name}
                </span>
              </div>
            );
          })}
        </div>

        {failed && (
          <div className="text-[11.5px] mt-4 leading-[1.6]" style={{ color: 'var(--danger)' }}>
            点云数据缺失过多（12%），无法生成可靠结果
          </div>
        )}

        {!failed && (
          <div className="mt-6">
            <CtaRow width={190}>
              <Button
                disabled={!done || !mission.resultTaskId}
                onClick={() => mission.resultTaskId && viewResult(mission.resultTaskId)}
              >
                查看结果
              </Button>
            </CtaRow>
          </div>
        )}

        {failed && (
          <div className="flex gap-2.5 mt-5">
            <Button variant="secondary">仅保留原始点云</Button>
            <Button>重新处理</Button>
          </div>
        )}
      </div>
    </div>
  );
}
