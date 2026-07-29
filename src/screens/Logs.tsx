// D-03 运行日志
import { useStore } from '../store';
import { Button, CtaRow } from '../components/Button';
import { SubHeader } from '../components/SubHeader';
import { IconDownload } from '../components/Icons';

const MOCK_LOGS = [
  ['09:47:54', 'INFO', '任务 T-20260727-01 完成，结果已写入共享文件夹'],
  ['09:47:12', 'INFO', '开始返航，沿原航线回溯'],
  ['09:44:03', 'INFO', '航点 12 拍照完成'],
  ['09:41:02', 'INFO', '起飞，目标航线 R-03'],
  ['09:40:58', 'INFO', '自检通过（7/7）'],
  ['09:40:31', 'INFO', '已连接 UAV-A31C（192.168.10.21）'],
  ['09:12:44', 'WARN', '链路 RTT 波动 180ms，已恢复'],
  ['08:55:10', 'INFO', '应用启动，版本 1.0.0'],
];

export function Logs() {
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <SubHeader title="运行日志" onBack={() => set({ deviceSub: null })} />
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        <div
          style={{
            borderRadius: 'var(--card-radius)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-sunken)',
            padding: '10px 13px',
          }}
        >
          {MOCK_LOGS.map(([time, level, msg], i) => (
            <div key={i} className="mono flex gap-2" style={{ fontSize: 10.5, lineHeight: 1.9 }}>
              <span style={{ color: 'var(--text-tertiary)' }}>{time}</span>
              <span
                style={{
                  color: level === 'WARN' ? 'var(--warning)' : 'var(--text-placeholder)',
                  width: 34, flexShrink: 0,
                }}
              >
                {level}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>{msg}</span>
            </div>
          ))}
        </div>

        <div className="mt-5">
          <CtaRow width={190}>
            <Button variant="secondary" onClick={() => showToast('运行日志已导出到下载目录')}>
              <span className="inline-flex items-center gap-1.5"><IconDownload size={14} /> 导出日志</span>
            </Button>
          </CtaRow>
        </div>
      </div>
    </div>
  );
}
