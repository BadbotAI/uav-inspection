// 手机外框：竖屏 390×800，执行态横屏时转为 800×390（尺寸过渡，内部画布随容器重排）
import { useStore } from '../store';

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const landscape = useStore(s => s.landscape);
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: landscape ? 800 : 390, height: landscape ? 390 : 800,
        transition: 'width .32s cubic-bezier(.32,.72,.35,1), height .32s cubic-bezier(.32,.72,.35,1)',
        background: 'radial-gradient(130% 70% at 50% -6%, #FDFDFE 0%, #F7F8FA 46%, var(--bg-base) 100%)',
        borderRadius: 28, border: '1px solid rgba(16,24,40,.10)',
        boxShadow: '0 24px 64px rgba(16,24,40,.16)',
      }}
    >
      {children}
    </div>
  );
}
