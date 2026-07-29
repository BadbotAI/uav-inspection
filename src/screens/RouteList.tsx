// R-00 航线列表：头部固定，仅列表滚动
import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../api';
import { Card } from '../components/Card';
import { Pill, Tag } from '../components/Pill';
import { Skeleton, EmptyState } from '../components/Feedback';
import { BottomSheet } from '../components/BottomSheet';
import { IconSync, IconEdit, IconTrash, IconMore, IconSearch, IconChevronRight, IconChevronLeft, IconArrowDown, IconPin } from '../components/Icons';
import { Viewport } from '../components/Viewport';
import { RouteDelete } from './RouteDelete';
import { fmtRelDay, daysAgo } from '../constants';
import type { Route } from '../types';

export function RouteList() {
  const routes = useStore(s => s.routes);
  const scenes = useStore(s => s.scenes);
  const lastSyncAt = useStore(s => s.lastSyncAt);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const [syncing, setSyncing] = useState(false);
  const [actionRoute, setActionRoute] = useState<Route | null>(null);
  const [deleteRoute, setDeleteRoute] = useState<Route | null>(null);
  const [query, setQuery] = useState('');
  // 根据地图展示 = 按区域分组；其余为全量平铺排序；巡检时间可切近→远/远→近
  const [sortKey, setSortKey] = useState<'all' | 'created' | 'run'>('all');
  const [runDesc, setRunDesc] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [mapScene, setMapScene] = useState<string | null>(null);
  const [mapRouteId, setMapRouteId] = useState<string | null>(null);
  const loading = routes.length === 0 && lastSyncAt === null;

  const cmp = (a: Route, b: Route): number => {
    if (sortKey === 'all' || sortKey === 'created') return b.recordedAt.localeCompare(a.recordedAt);
    // 巡检时间：近→远时从未巡检垫底；远→近时从未巡检最前
    if (!a.lastRunAt && !b.lastRunAt) return 0;
    if (!a.lastRunAt) return runDesc ? 1 : -1;
    if (!b.lastRunAt) return runDesc ? -1 : 1;
    return runDesc
      ? b.lastRunAt.localeCompare(a.lastRunAt)
      : a.lastRunAt.localeCompare(b.lastRunAt);
  };

  const shown = routes
    .filter(r => {
      const q = query.trim();
      if (!q) return true;
      return (r.name || '未命名航线').includes(q)
        || r.id.toLowerCase().includes(q.toLowerCase())
        || r.note.includes(q)
        || r.scanTags.some(t => t.includes(q));
    })
    .sort(cmp);

  const doSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { routes: rs, newCount, lastSyncAt: t } = await api.syncRoutes();
      set({ routes: rs, lastSyncAt: t });
      if (newCount > 0) set({ routeSub: { view: 'receive' } });
      else showToast('已是最新，无新航线');
    } finally {
      setSyncing(false);
    }
  };


  const renderCard = (r: Route, showScene: boolean) => (
    <Card
      key={r.id}
      onClick={() => set({ routeSub: { view: 'detail', id: r.id } })}
      onLongPress={() => setActionRoute(r)}
    >
      <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.06em', color: 'var(--brand-text)' }}>
        {r.id}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <div className="flex-1 truncate" style={{ fontSize: 15, fontWeight: 500 }}>
          {r.name || '未命名航线'}
        </div>
        {!r.name && <Pill tone="lo">未命名</Pill>}
        <button
          className="flex items-center justify-center shrink-0"
          style={{
            width: 28, height: 28, borderRadius: 8, marginRight: -6,
            color: 'var(--text-tertiary)', cursor: 'pointer',
          }}
          onClick={e => { e.stopPropagation(); setActionRoute(r); }}
          aria-label="更多操作"
        >
          <IconMore size={14} />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-2.5">
        {daysAgo(r.recordedAt) <= 7 && <Tag tone="info">新</Tag>}
        {showScene && (
          <Tag tone="info">{scenes.find(sc => sc.id === r.sceneId)?.name ?? ''}</Tag>
        )}
        {r.scanTags.map(tg => <Tag key={tg} tone="info">{tg}</Tag>)}
        <Tag>{r.waypointCount} 航点</Tag>
        <Tag>约 {r.etaMin} 分钟</Tag>
        <Tag>离堆 {r.minClearanceM.toFixed(1)}m</Tag>
      </div>

      {/* 时间与复现信息：与标签区分开，可换行不截断 */}
      <div
        className="flex flex-wrap items-center justify-between mt-2.5 pt-2"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          fontSize: 10.5, color: 'var(--text-tertiary)',
          columnGap: 12, rowGap: 3,
        }}
      >
        <span className="shrink-0">创建于 {r.recordedAt}</span>
        <span className="mono shrink-0">
          {r.runs > 0 ? `成功 ${r.successRuns}/${r.runs}` : '尚未复现'}
          {r.lastRunAt ? ` · 上次巡检 ${fmtRelDay(r.lastRunAt)}` : ''}
        </span>
      </div>
    </Card>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* 固定头部：微渐变质感（顶部一缕品牌色 + 向底色过渡） */}
      <div
        className="shrink-0"
        style={{
          padding: '16px 16px 10px',
          background: [
            'linear-gradient(180deg, rgba(76,107,192,.055) 0%, rgba(76,107,192,0) 46%)',
            'linear-gradient(180deg, #F2F4F8 0%, var(--bg-base) 100%)',
          ].join(', '),
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', letterSpacing: '0.01em' }}>航线</div>
          <button
            className="flex items-center gap-1.5 pressable"
            style={{
              fontSize: 12, color: 'var(--text-link)', fontWeight: 500,
              background: 'transparent', cursor: 'pointer',
              opacity: syncing ? 0.65 : 1,
            }}
            onClick={doSync}
          >
            <IconSync size={13} spinning={syncing} />
            {syncing ? '同步中' : '从无人机同步'}
          </button>
        </div>

        <div
          className="flex items-center gap-2 mt-3.5"
          style={{ height: 38, padding: '0 12px', borderRadius: 8, background: 'var(--surface-1)', border: '1px solid var(--border-default)', boxShadow: 'inset 0 1px 2px rgba(16,24,40,.04)' }}
        >
          <span style={{ color: 'var(--text-tertiary)' }}><IconSearch size={14} /></span>
          <input
            className="flex-1"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              fontSize: 13, color: 'var(--text-primary)',
            }}
            placeholder="搜索航线名称或编号"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {query && (
            <button
              style={{ color: 'var(--text-tertiary)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
              onClick={() => setQuery('')}
              aria-label="清空"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between mt-2.5">
          <div className="flex items-center gap-1.5">
            {([
              ['all', '根据地图展示'], ['created', '最新创建'], ['run', '巡检时间'],
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
        </div>
      </div>

      {/* 列表滚动区：滚动后顶部才出现渐隐，静止时不压字 */}
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '0 16px 16px' }}
        onScroll={e => setScrolled((e.target as HTMLElement).scrollTop > 4)}
      >
        <div
          className="pointer-events-none"
          style={{
            position: 'sticky', top: 0, zIndex: 5, height: 14, margin: '0 -16px -12px',
            background: 'linear-gradient(180deg, var(--bg-base) 20%, rgba(237,239,243,0) 100%)',
            opacity: scrolled ? 1 : 0, transition: 'opacity .2s',
          }}
        />
        {loading ? <Skeleton rows={3} /> : routes.length === 0 ? (
          <EmptyState text="本机还没有航线" actionText="从无人机同步" onAction={doSync} />
        ) : shown.length === 0 ? (
          <EmptyState text={`没有匹配「${query.trim()}」的航线`} actionText="清空搜索" onAction={() => setQuery('')} />
        ) : sortKey !== 'all' ? (
          /* 平铺模式：不按区域分组，卡片标签中补充区域 */
          <div className="flex flex-col gap-2.5">
            {shown.map(r => renderCard(r, true))}
          </div>
        ) : scenes.map(sc => {
          const scRoutes = shown.filter(r => r.sceneId === sc.id);
          if (scRoutes.length === 0) return null;
          return (
            <div key={sc.id} className="mb-4">
              {/* 区域头：可点击查看场景地图与航线标注 */}
              <div className="flex items-center gap-2 mb-2" style={{ padding: '2px 2px' }}>
                <button
                  className="shrink-0 flex items-center gap-1.5 pressable"
                  style={{
                    padding: '5px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 500,
                    background: 'var(--brand-subtle-bg)', border: '1px solid var(--brand-border)',
                    color: 'var(--brand-subtle-text)', cursor: 'pointer',
                  }}
                  onClick={() => { setMapScene(sc.id); setMapRouteId(scRoutes[0]?.id ?? null); }}
                >
                  <IconPin size={13} />
                  {sc.name}
                  <IconChevronRight size={11} />
                </button>
              </div>
              <div className="flex flex-col gap-2.5">
                {scRoutes.map(r => renderCard(r, false))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 卡片操作 */}
      <BottomSheet open={!!actionRoute} onMask={() => setActionRoute(null)}>
        <div style={{ fontSize: 14, fontWeight: 500 }} className="mb-3">
          {actionRoute?.name || '未命名航线'}
        </div>
        <div className="flex flex-col gap-2">
          <button
            className="flex items-center gap-2.5 text-left"
            style={{
              fontSize: 13.5, padding: '11px 13px', borderRadius: 10,
              background: 'var(--fill-quiet)', color: 'var(--text-primary)', cursor: 'pointer',
            }}
            onClick={() => {
              if (actionRoute) set({ routeSub: { view: 'edit', id: actionRoute.id, from: 'list' } });
              setActionRoute(null);
            }}
          >
            <IconEdit size={14} /> 编辑航线基础信息
          </button>
          <button
            className="flex items-center gap-2.5 text-left"
            style={{
              fontSize: 13.5, padding: '11px 13px', borderRadius: 10,
              background: 'rgba(240,101,92,.08)', color: 'var(--danger)', cursor: 'pointer',
            }}
            onClick={() => { setDeleteRoute(actionRoute); setActionRoute(null); }}
          >
            <IconTrash size={14} /> 删除航线
          </button>
        </div>
      </BottomSheet>

      {/* 场景地图浮层：点击航线切换是否在地图中标注展示 */}
      <BottomSheet open={!!mapScene} onMask={() => setMapScene(null)}>
        <div className="flex items-center gap-1" style={{ height: 32, marginBottom: 10 }}>
          <button
            className="flex items-center justify-center pressable"
            style={{ width: 30, height: 30, borderRadius: 9, color: 'var(--text-secondary)', cursor: 'pointer' }}
            onClick={() => setMapScene(null)}
            aria-label="返回"
          >
            <IconChevronLeft size={15} />
          </button>
          <span style={{ fontSize: 15, fontWeight: 600 }}>场景地图</span>
          <span
            className="ml-auto"
            style={{
              padding: '4px 11px', borderRadius: 999, fontSize: 11.5,
              background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
              color: 'var(--brand-subtle-text)',
            }}
          >
            {scenes.find(sc => sc.id === mapScene)?.name ?? ''}
          </span>
        </div>
        {mapScene && (() => {
          const mapRoute = routes.find(r => r.id === mapRouteId) ?? null;
          return (
            <div
              key={mapRouteId ?? 'scene-only'}
              style={{
                height: 220, borderRadius: 10, overflow: 'hidden',
                border: '1px solid var(--card-stroke)',
              }}
            >
              <Viewport
                waypointCount={mapRoute?.waypointCount ?? 24}
                altitudeM={mapRoute?.altitudeM ?? 5.2}
                sceneId={mapScene}
                layers={{ cloud: true, route: !!mapRoute, track: false, boxes: false, labels: false }}
                presets={['top', 'iso']}
              />
            </div>
          );
        })()}
        <div className="dlabel mt-3 mb-1.5" style={{ fontSize: 11 }}>
          该场景有 {routes.filter(r => r.sceneId === mapScene).length} 条航线
        </div>
        <div className="flex flex-col gap-1.5" style={{ maxHeight: 170, overflowY: 'auto' }}>
          {routes.filter(r => r.sceneId === mapScene).map(r => {
            const shownOnMap = r.id === mapRouteId;
            return (
              <button
                key={r.id}
                className="flex items-center gap-2 text-left pressable"
                style={{
                  padding: '10px 12px', borderRadius: 9, cursor: 'pointer',
                  background: shownOnMap ? 'var(--brand-subtle-bg)' : 'var(--fill-quiet)',
                  border: `1px solid ${shownOnMap ? 'var(--brand-border)' : 'transparent'}`,
                }}
                onClick={() => setMapRouteId(v => (v === r.id ? null : r.id))}
              >
                <span className="flex-1 truncate" style={{ fontSize: 13.5, fontWeight: shownOnMap ? 500 : 400 }}>
                  {r.name || '未命名航线'}
                </span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {r.waypointCount} 航点
                </span>
              </button>
            );
          })}
        </div>
      </BottomSheet>

      <RouteDelete route={deleteRoute} onClose={() => setDeleteRoute(null)} />
    </div>
  );
}
