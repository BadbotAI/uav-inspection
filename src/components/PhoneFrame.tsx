// 手机外框：390×800 视口
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        width: 390, height: 800,
        background: 'radial-gradient(130% 70% at 50% -6%, #FDFDFE 0%, #F7F8FA 46%, var(--bg-base) 100%)',
        borderRadius: 28, border: '1px solid rgba(16,24,40,.10)',
        boxShadow: '0 24px 64px rgba(16,24,40,.16)',
      }}
    >
      {children}
    </div>
  );
}
