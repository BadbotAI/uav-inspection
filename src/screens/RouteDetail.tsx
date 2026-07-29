// R-01 航线详情 —— 本 App 的 signature 页面
// 三维区显示的点云是最近一次成功巡检采到的点云，不是航线录制时的图
import { useMemo } from 'react';
import { useStore } from '../store';
import { Viewport } from '../components/Viewport';
import { Card } from '../components/Card';
import { Tag } from '../components/Pill';
import { Button, CtaRow } from '../components/Button';
import { TeleGrid } from '../components/TeleGrid';
import { FloatBack } from '../components/SubHeader';
import { IconEdit, IconPlus, IconNote, IconPin } from '../components/Icons';
import { buildRoutePath, waypointRows } from '../three/route';
import { startPreflight } from '../sim/flight';
import { fmtRelDay } from '../constants';

export function RouteDetail({ routeId }: { routeId: string }) {
  const routes = useStore(s => s.routes);
  const scenes = useStore(s => s.scenes);
  const set = useStore(s => s.set);
  const vpFull = useStore(s => s.vpFull);
  const route = routes.find(r => r.id === routeId);
  const scene = scenes.find(sc => sc.id === route?.sceneId);

  // 最小离堆由航线高度与堆高实时算出，不写死；航点表来自示教记录
  const { minClear, wps } = useMemo(() => {
    if (!route) return { minClear: 0, wps: [] as ReturnType<typeof waypointRows> };
    const path = buildRoutePath(route.waypointCount, route.altitudeM);
    return { minClear: path.minClearM, wps: waypointRows(path, route.waypointCount) };
  }, [route?.waypointCount, route?.altitudeM]);

  if (!route) return null;

  const goEdit = () => set({ routeSub: { view: 'edit', id: route.id, from: 'detail' } });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div style={{ height: vpFull ? '100%' : '44%', transition: 'height .25s ease' }} className="shrink-0 relative">
        <FloatBack onBack={() => (vpFull ? set({ vpFull: false }) : set({ routeSub: null }))} />
        <Viewport
          waypointCount={route.waypointCount}
          altitudeM={route.altitudeM}
          sceneId={route.sceneId}
          highlightMinClearance
          layers={{ cloud: true, route: true, track: false, boxes: false, labels: false }}
          presets={['top', 'iso']}
          fullscreenable
        />
      </div>

      <div className="flex-1 overflow-y-auto" style={{ padding: 16, paddingBottom: 84, display: vpFull ? 'none' : undefined }}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="truncate" style={{ fontSize: 18, fontWeight: 600 }}>
                {route.name || '未命名航线'}
              </span>
              {route.scanTags.map(t => <Tag key={t} tone="info">{t}</Tag>)}
            </div>
            {/* 元信息标签化：地址胶囊与其他卡片对齐，编号收进标签 */}
            <div className="flex flex-wrap items-center mt-2" style={{ gap: 6 }}>
              {scene && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 500,
                    background: 'var(--brand-subtle-bg)', color: 'var(--brand-subtle-text)',
                  }}
                >
                  <IconPin size={11} />
                  {scene.name}
                </span>
              )}
              <Tag>{route.id}</Tag>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                创建于 {route.recordedAt}
              </span>
            </div>
          </div>
          <button
            className="flex items-center gap-1 shrink-0"
            style={{
              fontSize: 12, padding: '6px 11px', borderRadius: 999,
              color: 'var(--text-secondary)', border: '1px solid var(--border-default)',
              background: 'var(--fill-quiet)', cursor: 'pointer', marginTop: 2,
            }}
            onClick={goEdit}
          >
            <IconEdit size={12} /> 编辑
          </button>
        </div>

        <div className="mt-3.5">
          <TeleGrid items={[
            { label: '航点', value: route.waypointCount },
            { label: '预计时长', value: `${route.etaMin}min` },
            { label: '最小离堆', value: `${minClear.toFixed(1)}m`, accent: true },
          ]} />
        </div>

        <div className="flex items-center justify-between mt-5 mb-2">
          <span className="dlabel" style={{ fontSize: 11 }}>示教备注</span>
          {route.note && (
            <button
              className="flex items-center gap-1"
              style={{ fontSize: 12, color: 'var(--text-link)', cursor: 'pointer' }}
              onClick={goEdit}
            >
              <IconEdit size={12} /> 编辑
            </button>
          )}
        </div>
        {route.note ? (
          <Card>
            <div className="flex gap-2.5">
              <span className="shrink-0 mt-0.5" style={{ color: 'var(--brand-text)' }}><IconNote size={14} /></span>
              <div className="leading-[1.7]" style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {route.note}
              </div>
            </div>
          </Card>
        ) : (
          <button
            className="w-full flex items-center justify-center gap-1.5"
            style={{
              height: 52, borderRadius: 12, cursor: 'pointer',
              border: '1px dashed var(--border-strong)', background: 'transparent',
              color: 'var(--text-link)', fontSize: 13,
            }}
            onClick={goEdit}
          >
            <IconPlus size={13} /> 添加示教备注
          </button>
        )}

        {/* 航点列表：示教录制的逐点数据 */}
        <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>航点列表 · {route.waypointCount} 个</div>
        <div
          style={{
            borderRadius: 'var(--card-radius)',
            border: '1px solid var(--card-stroke)',
            background: 'var(--surface-1)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <div
            className="mono grid text-center"
            style={{
              gridTemplateColumns: '30px 1fr 1fr 1fr 44px 34px 44px',
              fontSize: 9.5, letterSpacing: '.04em', color: 'var(--text-tertiary)',
              padding: '7px 8px', borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--fill-quiet)',
            }}
          >
            <span>#</span><span>X</span><span>Y</span><span>Z</span><span>YAW</span><span>拍照</span><span>速度</span>
          </div>
          <div style={{ maxHeight: 176, overflowY: 'auto' }}>
            {wps.map((w, i) => (
              <div
                key={i}
                className="mono grid text-center"
                style={{
                  gridTemplateColumns: '30px 1fr 1fr 1fr 44px 34px 44px',
                  fontSize: 10.5, padding: '5.5px 8px',
                  borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                  color: 'var(--text-secondary)',
                }}
              >
                <span style={{ color: 'var(--text-tertiary)' }}>{i + 1}</span>
                <span>{w.x.toFixed(2)}</span>
                <span>{w.y.toFixed(2)}</span>
                <span>{w.z.toFixed(2)}</span>
                <span>{w.yawDeg}°</span>
                <span style={{ color: w.isPhoto ? 'var(--brand-text)' : 'var(--text-placeholder)' }}>
                  {w.isPhoto ? '是' : '否'}
                </span>
                <span>{w.vel.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>复现历史</div>
        <Card>
          <div style={{ fontSize: 13 }}>
            {route.lastRunAt
              ? <>{fmtRelDay(route.lastRunAt)} · {route.lastRunStatus === 'success' ? '完成' : route.lastRunStatus === 'aborted' ? '中断' : '失败'}</>
              : '尚未复现'}
          </div>
          <div className="mono mt-1" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
            共 {route.runs} 次，成功 {route.successRuns} 次，中断 {route.runs - route.successRuns} 次
          </div>
        </Card>
      </div>

      {/* 底部常驻主操作 */}
      <div
        className="absolute inset-x-0 bottom-0"
        style={{
          padding: '12px 16px 16px',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-base) 42%)',
          display: vpFull ? 'none' : undefined,
        }}
      >
        <CtaRow>
          <Button onClick={() => {
            set({ selectedRouteId: route.id, routeSub: null, tab: 'home' });
            startPreflight(route.id);
          }}>
            开始巡检
          </Button>
        </CtaRow>
      </div>
    </div>
  );
}
