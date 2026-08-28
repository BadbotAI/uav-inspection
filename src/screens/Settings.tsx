// S-00 设置（一级页签）：账号 / 测算参数 / 存储管理 / 关于 / 退出登录
import { useState } from 'react';
import { useStore } from '../store';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { BottomSheet, Dialog } from '../components/BottomSheet';
import { IconLogout, IconChevronRight } from '../components/Icons';
import { fmtDateShort, fmtHM } from '../constants';
import { canLogout, logout } from '../sim/session';

export function Settings() {
  const density = useStore(s => s.density);
  const tasks = useStore(s => s.tasks);
  const account = useStore(s => s.account);
  const loginAt = useStore(s => s.loginAt);
  const device = useStore(s => s.device);
  const set = useStore(s => s.set);
  const gotoTab = useStore(s => s.gotoTab);
  const showToast = useStore(s => s.showToast);
  const [densityText, setDensityText] = useState(density.toFixed(2));
  const [cleanOpen, setCleanOpen] = useState(false);
  // 退出登录：确认弹窗 → 退出中 → 登录页；任务进行中则拦截
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [logoutBlocked, setLogoutBlocked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const askLogout = () => {
    if (loggingOut) return;
    if (!canLogout()) { setLogoutBlocked(true); return; }
    setLogoutOpen(true);
  };

  const doLogout = async () => {
    setLogoutOpen(false);
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  const totalMb = tasks.reduce((a, t) => a + t.cloudSizeMb, 0);
  const initial = (account || '操').slice(0, 1).toUpperCase();

  const rowStyle = (i: number): React.CSSProperties => ({
    padding: i > 0 ? '8px 0 0' : 0,
    borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
    marginTop: i > 0 ? 8 : 0,
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', letterSpacing: '0.01em' }}>设置</div>

      {/* 账号：当前登录身份与会话信息 */}
      <div className="dlabel mt-5 mb-1.5" style={{ fontSize: 11 }}>账号</div>
      <Card>
        <div className="flex items-center gap-3">
          <span
            className="flex items-center justify-center shrink-0 mono"
            style={{
              width: 40, height: 40, borderRadius: 999,
              background: 'var(--brand-subtle-bg)', color: 'var(--brand-subtle-text)',
              fontSize: 16, fontWeight: 600,
            }}
          >
            {initial}
          </span>
          <div className="flex-1 min-w-0">
            <div className="truncate" style={{ fontSize: 15, fontWeight: 500 }}>{account || '操作员'}</div>
            <div className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              巡检操作员 · {loginAt ? `${fmtDateShort(loginAt)} ${fmtHM(loginAt)} 登录` : '本次会话'}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--line)', margin: '10px 0' }} />
        {/* 绑定设备：整行可点，跳到设备页查看或切换；未连接时提示去连接 */}
        <button
          className="w-full flex items-center justify-between pressable"
          style={{ background: 'transparent', cursor: 'pointer', color: 'var(--text-primary)' }}
          onClick={() => gotoTab('device')}
          aria-label="前往设备页"
        >
          <span className="text-[13px]">绑定设备</span>
          <span className="flex items-center gap-1.5">
            {device?.connected ? (
              <>
                <span
                  className="rounded-full"
                  style={{ width: 6, height: 6, background: device.sensorsOk ? 'var(--success)' : 'var(--danger)' }}
                />
                <span className="mono text-[12px]" style={{ color: 'var(--txt3)' }}>{device.id}</span>
              </>
            ) : (
              <span className="text-[12px]" style={{ color: 'var(--text-link)' }}>未连接，去连接</span>
            )}
            <span style={{ color: 'var(--text-placeholder)', display: 'inline-flex' }}><IconChevronRight size={12} /></span>
          </span>
        </button>
      </Card>

      <div className="dlabel mt-4 mb-1.5" style={{ fontSize: 11 }}>测算参数</div>
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
      <Button variant="secondary" small style={{ fontSize: 12.5 }} onClick={() => setCleanOpen(true)}>清理任务数据</Button>

      <div className="dlabel mt-4 mb-1.5" style={{ fontSize: 11 }}>关于</div>
      <Card>
        {[
          ['应用版本', '1.0.0'],
          ['适配系统', 'Android 13 及以上'],
          ['运行网络', '局域网直连，支持离线运行'],
        ].map(([k, v], i) => (
          <div key={k} className="flex items-center justify-between" style={rowStyle(i)}>
            <span style={{ fontSize: 13 }}>{k}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{v}</span>
          </div>
        ))}
      </Card>

      {/* 退出登录：页面末尾，独立于任何分组 */}
      <div className="mt-6">
        <Button
          variant="danger-outline"
          disabled={loggingOut}
          className="flex items-center justify-center gap-1.5"
          onClick={askLogout}
        >
          {!loggingOut && <IconLogout size={14} />}
          {loggingOut ? '退出中' : '退出登录'}
        </Button>
        <div className="text-center mt-2" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
          退出后将断开当前设备连接，本机巡检数据不受影响
        </div>
      </div>
      </div>

      <Dialog
        open={logoutOpen}
        title="退出登录？"
        body="退出后将断开与当前设备的连接，需重新登录才能执行巡检。本机已保存的巡检数据不会被清除。"
        actions={[
          { label: '取消', onClick: () => setLogoutOpen(false) },
          { label: '退出登录', tone: 'danger', onClick: () => { void doLogout(); } },
        ]}
      />

      <Dialog
        open={logoutBlocked}
        title="巡检任务进行中"
        body="当前设备正在执行巡检或处理数据，请等待任务结束后再退出登录。"
        actions={[{ label: '知道了', tone: 'primary', onClick: () => setLogoutBlocked(false) }]}
      />

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
