// L-00 登录 —— 居中构图，大尺寸细线标识
import { useState } from 'react';
import { useStore } from '../store';
import { login } from '../sim/session';
import { Button, CtaRow } from '../components/Button';

// 品牌标识：雷达环 + 无人机十字，细线风格
function Mark() {
  return (
    <svg width="132" height="132" viewBox="0 0 128 128" fill="none">
      {/* 外层扫描环 */}
      <circle cx="64" cy="64" r="60" stroke="rgba(76,107,192,.15)" strokeWidth="1" />
      <circle cx="64" cy="64" r="46" stroke="rgba(76,107,192,.30)" strokeWidth="1" strokeDasharray="2.5 5" />
      {/* 弧线高光 */}
      <path d="M64 4 A60 60 0 0 1 121 45" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" />
      {/* 机身 */}
      <rect x="52" y="52" width="24" height="24" rx="6" stroke="var(--text-primary)" strokeWidth="1.6" />
      <path
        d="M36 36 L52 52 M92 36 L76 52 M36 92 L52 76 M92 92 L76 76"
        stroke="var(--text-primary)" strokeWidth="1.6" strokeLinecap="round"
      />
      <circle cx="36" cy="36" r="6.5" stroke="var(--brand)" strokeWidth="1.4" />
      <circle cx="92" cy="36" r="6.5" stroke="var(--brand)" strokeWidth="1.4" />
      <circle cx="36" cy="92" r="6.5" stroke="var(--brand)" strokeWidth="1.4" />
      <circle cx="92" cy="92" r="6.5" stroke="var(--brand)" strokeWidth="1.4" />
      <circle cx="64" cy="64" r="2.6" fill="var(--brand)" />
    </svg>
  );
}

export function Login() {
  // 退出登录后回填上次账号，只需重输密码
  const lastAccount = useStore(s => s.lastAccount);
  const [account, setAccount] = useState(lastAccount);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(account, password);
    } catch {
      setError('账号或密码错误');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  // 主流填充式输入框：左对齐、浅灰底、聚焦描边
  const inputStyle: React.CSSProperties = {
    width: '100%', height: 48, borderRadius: 12, padding: '0 16px',
    background: 'var(--surface-3)', border: '1.5px solid transparent',
    color: 'var(--text-primary)', fontSize: 14.5, outline: 'none',
    transition: 'border-color .15s, background .15s',
  };
  const focus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'var(--brand)';
    e.target.style.background = 'var(--surface-1)';
  };
  const blur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = 'transparent';
    e.target.style.background = 'var(--surface-3)';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-9">
      <Mark />
      <div className="text-center mt-7" style={{ fontSize: 21, fontWeight: 600, letterSpacing: '0.14em' }}>
        仓储无人机巡检
      </div>

      <div className="w-full flex flex-col gap-3" style={{ marginTop: 44 }}>
        <input
          style={inputStyle} placeholder="账号" maxLength={64}
          value={account} onChange={e => setAccount(e.target.value)}
          onFocus={focus} onBlur={blur}
        />
        <input
          style={inputStyle} placeholder="密码" type="password" maxLength={64}
          autoFocus={!!lastAccount}
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          onFocus={focus} onBlur={blur}
        />
        {error && (
          <div className="text-center" style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>
        )}
        <div className="mt-2">
          <CtaRow width={220}>
            <Button onClick={submit} disabled={busy}>{busy ? '登录中' : '登录'}</Button>
          </CtaRow>
        </div>
      </div>
    </div>
  );
}
