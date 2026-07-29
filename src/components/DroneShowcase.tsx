// 无人机展示面板：点阵渐变底 + 3D 模型，用于 H-00 / X-00 / X-01
import { DroneModel } from './DroneModel';

export function DroneShowcase({ height = 130, plain }: { height?: number; plain?: boolean }) {
  if (plain) return <DroneModel height={height} />;
  return (
    <div
      style={{
        background: [
          'linear-gradient(180deg, rgba(247,248,250,0) 40%, rgba(247,248,250,.9) 82%, #F7F8FA 100%)',
          'radial-gradient(circle, rgba(16,24,40,.07) 1px, transparent 1px)',
          'linear-gradient(180deg, #FCFCFD 0%, #F3F5F8 100%)',
        ].join(', '),
        backgroundSize: '100% 100%, 13px 13px, 100% 100%',
        padding: '6px 0',
      }}
    >
      <DroneModel height={height} />
    </div>
  );
}
