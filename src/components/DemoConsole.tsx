// DEMO 控制台（不属于产品），?demo=0 隐藏
import { useStore } from '../store';
import { demoItems } from '../sim/demo';

export function DemoConsole() {
  const speedMult = useStore(s => s.speedMult);
  const handleBack = useStore(s => s.handleBack);

  if (new URLSearchParams(window.location.search).get('demo') === '0') return null;

  const btnStyle: React.CSSProperties = {
    background: '#FFFFFF', border: '1px solid rgba(16,24,40,.12)',
    color: '#5A6272', cursor: 'pointer', textAlign: 'left',
    fontSize: 11, padding: '6px 10px', borderRadius: 6,
  };

  return (
    <div
      className="flex flex-col gap-1.5 p-3 rounded-[12px]"
      style={{
        width: 168, background: '#F0F1F4', border: '1px dashed #C2C9D4',
        maxHeight: 800, overflowY: 'auto',
      }}
    >
      <div className="text-[10px] leading-[1.5] mb-1" style={{ color: '#8A93A3' }}>
        DEMO 控制台<br />（不属于产品）
      </div>
      {demoItems.map(it => (
        <button key={it.label} style={btnStyle} onClick={it.run}>
          {it.label === '飞行速度切换' ? `飞行速度切换（${speedMult}×）` : it.label}
        </button>
      ))}
      <div className="mt-1" style={{ borderTop: '1px dashed #C2C9D4' }} />
      <button style={{ ...btnStyle, marginTop: 4 }} onClick={handleBack}>
        物理返回键（Esc）
      </button>
    </div>
  );
}
