// D-02 设置
import { useState } from 'react';
import { useStore, initialMission } from '../store';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BottomSheet } from '../components/BottomSheet';
import { SubHeader } from '../components/SubHeader';
import { fmtDateShort, fmtHM } from '../constants';

export function Settings() {
  const density = useStore(s => s.density);
  const tasks = useStore(s => s.tasks);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const [densityText, setDensityText] = useState(density.toFixed(2));
  const [cleanOpen, setCleanOpen] = useState(false);

  const commitDensity = () => {
    const v = parseFloat(densityText);
    if (Number.isFinite(v) && v >= 0.1 && v <= 3.0) {
      set({ density: Math.round(v * 100) / 100 });
      showToast('容重已更新，体积结果已重算');
    } else {
      setDensityText(density.toFixed(2));
      showToast('容重范围 0.1–3.0');
    }
  };

  const totalMb = tasks.reduce((a, t) => a + t.cloudSizeMb, 0);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <SubHeader title="设置" onBack={() => set({ deviceSub: null })} />
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
      <div className="dlabel mb-1.5" style={{ fontSize: 11 }}>测算参数</div>
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div className="text-[13px]">容重（t/m³）</div>
          <input
            className="mono text-right"
            style={{
              width: 88, height: 36, borderRadius: 9, padding: '0 10px',
              background: 'var(--surface-3)', border: '1.5px solid transparent',
              color: 'var(--text-primary)', fontSize: 14, outline: 'none',
              transition: 'border-color .15s',
            }}
            inputMode="decimal"
            value={densityText}
            onChange={e => setDensityText(e.target.value)}
            onBlur={commitDensity}
            onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
        </div>
        <div className="text-[10.5px] mt-1.5" style={{ color: 'var(--txt3)' }}>
          用于把体积折算成重量，按实际粮种设置
        </div>
        <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
        <div className="flex items-center justify-between">
          <div className="text-[13px]">单位</div>
          <div className="text-[12px]" style={{ color: 'var(--txt3)' }}>公制</div>
        </div>
      </Card>

      <div className="dlabel mt-4 mb-1.5" style={{ fontSize: 11 }}>存储管理</div>
      <div
        className="leading-[1.6] mb-2"
        style={{
          fontSize: 12, color: 'var(--text-secondary)', padding: '10px 13px',
          borderRadius: 'var(--card-radius)', background: 'var(--fill-quiet)',
        }}
      >
        巡检结果本机保留 7 天，超期自动清理；单条记录可在巡检数据中长按删除。
      </div>
      <div className="flex flex-col gap-2">
        <Button variant="secondary" small style={{ fontSize: 12.5 }} onClick={() => setCleanOpen(true)}>清理任务数据</Button>
        <Button
          variant="danger-outline"
          small
          style={{ fontSize: 12.5 }}
          onClick={() => {
            set({
              loggedIn: false, account: '', tab: 'home',
              routeSub: null, resultSub: null, deviceSub: null,
              mission: { ...initialMission },
            });
          }}
        >
          退出登录
        </Button>
      </div>
      </div>

      <BottomSheet open={cleanOpen} onMask={() => setCleanOpen(false)}>
        <div className="text-[14px] font-medium">清理任务数据？</div>
        <div className="text-[12px] leading-[1.6] mt-2" style={{ color: 'var(--txt2)' }}>
          将释放约 <span className="mono">{(totalMb / 1024).toFixed(1)}GB</span> 空间。以下任务的本机缓存将被清除（无人机上的原始数据不受影响）：
        </div>
        <div className="mt-2 max-h-32 overflow-y-auto">
          {tasks.map(t => (
            <div key={t.id} className="mono text-[11px] py-0.5" style={{ color: 'var(--txt2)' }}>
              {fmtDateShort(t.startedAt)} {fmtHM(t.startedAt)} · {t.routeName}
            </div>
          ))}
        </div>
        <div className="flex gap-2.5 mt-4">
          <Button variant="secondary" onClick={() => setCleanOpen(false)}>取消</Button>
          <Button
            variant="danger"
            onClick={() => {
              set({ tasks: [] });
              setCleanOpen(false);
              showToast('已清理');
            }}
          >
            清理
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
