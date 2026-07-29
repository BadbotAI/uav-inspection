// X-06 异常告警 —— 拦截返回键，必须点「我知道了」
// 半透明遮罩透出底部界面，居中告警卡与全局弹窗语言一致
import { useStore } from '../store';
import { Button, CtaRow } from '../components/Button';
import { ackFault } from '../sim/flight';

export function Fault() {
  const mission = useStore(s => s.mission);

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center px-8"
      style={{ background: 'rgba(16,24,40,.4)', backdropFilter: 'blur(3px)' }}
    >
      <div
        className="count-pop w-full flex flex-col items-center text-center"
        style={{
          background: 'var(--surface-1)', borderRadius: 14,
          boxShadow: 'var(--shadow-modal)',
          padding: '26px 24px 22px', maxWidth: 300,
        }}
      >
        <span
          className="flex items-center justify-center rounded-full"
          style={{ width: 44, height: 44, background: 'var(--danger-bg)', color: 'var(--danger)' }}
        >
          <svg width="20" height="20" viewBox="0 0 16 16">
            <path d="M8 2.2 L15 13.6 H1 Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
            <path d="M8 6.6 V9.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11.8" r="0.9" fill="currentColor" />
          </svg>
        </span>
        <div className="mt-3.5" style={{ fontSize: 16, fontWeight: 600, color: 'var(--danger)' }}>
          {mission.faultTitle || '异常告警'}
        </div>
        <div className="leading-[1.7] mt-2" style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {mission.faultBody}
        </div>
        <div className="w-full mt-5">
          <CtaRow width={180}>
            <Button onClick={ackFault}>我知道了</Button>
          </CtaRow>
        </div>
      </div>
    </div>
  );
}
