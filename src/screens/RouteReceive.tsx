// R-10 接收新航线：从无人机同步到的新航线，确认后保存到我的航线
import { useStore } from '../store';
import { Card } from '../components/Card';
import { Button, CtaRow } from '../components/Button';
import { Tag } from '../components/Pill';
import { SubHeader } from '../components/SubHeader';
import { IconDrone, IconPin } from '../components/Icons';
import { NEW_ROUTE_RECORDED_AT_TEXT } from '../mock/routes';

export function RouteReceive() {
  const routes = useStore(s => s.routes);
  const scenes = useStore(s => s.scenes);
  const device = useStore(s => s.device);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const fresh = routes.find(r => r.id === 'R-05') ?? routes[0];
  const scene = scenes.find(sc => sc.id === fresh?.sceneId);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <SubHeader title="接收新航线" onBack={() => set({ routeSub: null })} />
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>发现 1 条新航线</div>
        <div className="flex items-center gap-1.5 mt-1" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
          <IconDrone size={13} /> 从无人机 {device?.id ?? 'UAV-A31C'} 同步
        </div>

        {/* 航线卡：与航线列表卡片同构 */}
        <div className="mt-4">
          <Card>
            <div className="mono" style={{ fontSize: 9.5, letterSpacing: '.06em', color: 'var(--brand-text)' }}>
              {fresh?.id ?? 'R-05'}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 truncate" style={{ fontSize: 15, fontWeight: 500 }}>
                {fresh?.name || '未命名航线'}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {/* 地址标签 */}
              {scene && (
                <span
                  className="flex items-center gap-1"
                  style={{
                    padding: '3px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 500,
                    background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                    color: 'var(--brand-subtle-text)',
                  }}
                >
                  <IconPin size={11} />
                  {scene.name}
                </span>
              )}
              {fresh?.scanTags.map(t => <Tag key={t} tone="info">{t}</Tag>)}
              <Tag>{fresh?.waypointCount ?? 18} 航点</Tag>
              <Tag>约 {fresh?.etaMin ?? 5} 分钟</Tag>
            </div>

            <div
              className="flex items-center justify-between mt-2.5 pt-2"
              style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 10.5, color: 'var(--text-tertiary)' }}
            >
              <span>创建于 {NEW_ROUTE_RECORDED_AT_TEXT}</span>
              <span className="mono">尚未巡检</span>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <CtaRow width={190}>
            <Button onClick={() => { set({ routeSub: null }); showToast('已保存到我的航线'); }}>
              保存到我的航线
            </Button>
          </CtaRow>
        </div>
        <button
          className="w-full text-center py-3.5"
          style={{ fontSize: 12.5, color: 'var(--text-link)', cursor: 'pointer' }}
          onClick={() => fresh && set({ routeSub: { view: 'edit', id: fresh.id, from: 'receive' } })}
        >
          编辑航线基础信息
        </button>
      </div>
    </div>
  );
}
