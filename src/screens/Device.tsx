// D-00 设备：列出多台无人机，同时仅连接一台（类 iPhone 蓝牙逻辑）
import { useLayoutEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Card } from '../components/Card';
import { Pill, Tag } from '../components/Pill';
import { Dialog } from '../components/BottomSheet';
import { IconDrone, IconChevronRight, IconSliders, IconSync, IconPin } from '../components/Icons';

interface OtherDevice {
  id: string;
  model: string;
  batteryPct: number;
  storageFreeGb: number;
  locationDesc: string;
  sensorsOk: boolean;
}

const MODEL_NAME = 'CX-350 巡检版';

export function Device() {
  const device = useStore(s => s.device);
  const mission = useStore(s => s.mission);
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);
  const [scanning, setScanning] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const missionBusy = mission.state !== 'IDLE' && mission.state !== 'DONE';
  // 卡片置顶重排动效（FLIP）：记录上一次各卡片位置，变化时从旧位置滑入
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const prevTops = useRef<Record<string, number>>({});
  useLayoutEffect(() => {
    const tops: Record<string, number> = {};
    Object.entries(cardRefs.current).forEach(([id, el]) => {
      if (el) tops[id] = el.getBoundingClientRect().top;
    });
    Object.entries(tops).forEach(([id, top]) => {
      const prev = prevTops.current[id];
      const el = cardRefs.current[id];
      if (el && prev !== undefined && Math.abs(prev - top) > 2) {
        el.style.transition = 'none';
        el.style.transform = `translateY(${prev - top}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform .34s cubic-bezier(.32,.72,.35,1)';
          el.style.transform = '';
        });
      }
    });
    prevTops.current = tops;
  });
  const [others, setOthers] = useState<OtherDevice[]>([
    { id: 'UAV-B12', model: MODEL_NAME, batteryPct: 64, storageFreeGb: 55.8, locationDesc: '二号仓 平房仓', sensorsOk: true },
  ]);
  // 待发现设备池：点击「发现设备」逐台发现
  const undiscovered = useRef<OtherDevice[]>([
    { id: 'UAV-C08', model: MODEL_NAME, batteryPct: 91, storageFreeGb: 60.2, locationDesc: '三号仓 通廊仓', sensorsOk: true },
    { id: 'UAV-D02', model: MODEL_NAME, batteryPct: 37, storageFreeGb: 22.4, locationDesc: '四号仓 方仓', sensorsOk: false },
  ]);

  const statusText = !device?.connected ? '未连接'
    : mission.state !== 'IDLE' ? '飞行中'
    : !device.sensorsOk ? '异常'
    : device.charging ? '充电中' : '空闲';

  const scan = () => {
    if (scanning) return;
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const found = undiscovered.current.shift();
      if (found) {
        setOthers(list => [...list, found]);
        showToast(`发现新设备 ${found.id}`);
      } else {
        showToast('未发现新设备');
      }
    }, 1200);
  };

  // 同时仅连接一台：先进入连接中过渡态，随后切换当前设备并置顶
  const connectTo = (d: OtherDevice) => {
    if (!device || connectingId) return;
    // 任务进行中禁止切换：避免执行中的任务失去监控归属
    if (missionBusy) { setBlockOpen(true); return; }
    setConnectingId(d.id);
    setTimeout(() => {
      const prev: OtherDevice = {
        id: device.id, model: MODEL_NAME,
        batteryPct: device.batteryPct, storageFreeGb: device.storageFreeGb,
        locationDesc: device.locationDesc, sensorsOk: device.sensorsOk,
      };
      set({
        device: {
          ...device, id: d.id, batteryPct: d.batteryPct, storageFreeGb: d.storageFreeGb,
          locationDesc: d.locationDesc, sensorsOk: d.sensorsOk,
        },
      });
      setOthers(list => [prev, ...list.filter(x => x.id !== d.id)]);
      setConnectingId(null);
      showToast(`已连接 ${d.id}，${prev.id} 已断开`);
    }, 1000);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: '30px', letterSpacing: '0.01em' }}>设备</div>

        {/* 已知设备：已连接设备置顶；发现设备与小标题水平对齐 */}
        <div className="flex items-center justify-between mt-5 mb-2">
          <span className="dlabel" style={{ fontSize: 11 }}>已知设备</span>
          <button
            className="flex items-center gap-1.5 pressable"
            style={{
              fontSize: 12, color: 'var(--text-link)', fontWeight: 500,
              background: 'transparent', cursor: 'pointer',
              opacity: scanning ? 0.65 : 1,
            }}
            onClick={scan}
          >
            <IconSync size={13} spinning={scanning} />
            {scanning ? '检测中' : '发现设备'}
          </button>
        </div>
        <div className="flex flex-col gap-2">
        <div key={device?.id ?? 'mine'} ref={el => { if (device) cardRefs.current[device.id] = el; }}>
        <Card>
          <div className="flex items-center gap-3">
            {/* 左：信息 + 遥测标签 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5">
                <span style={{ color: 'var(--brand)', display: 'inline-flex' }}><IconDrone size={17} /></span>
                <div className="min-w-0">
                  {/* 状态标签统一位于设备编号右侧（与其他设备卡一致） */}
                  <div className="flex items-center gap-1.5">
                    <span className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{device?.id ?? 'UAV-A31C'}</span>
                    <Pill tone={statusText === '异常' ? 'lo' : statusText === '飞行中' || statusText === '充电中' ? 'info' : 'neutral'}>
                      {statusText === '未连接' ? '离线' : statusText}
                    </Pill>
                  </div>
                  <div className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{MODEL_NAME}</div>
                </div>
              </div>
              {device && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Tag>电量 {Math.round(device.batteryPct)}%</Tag>
                  <Tag>存储 {device.storageFreeGb.toFixed(1)}GB</Tag>
<span
                    className="flex items-center gap-1"
                    style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 500,
                      background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                      color: 'var(--brand-subtle-text)',
                    }}
                  >
                    <IconPin size={10} />
                    {device.locationDesc}
                  </span>
                  <Tag tone={device.sensorsOk ? 'hi' : 'lo'}>
                    {device.sensorsOk ? '正常' : '异常'}
                  </Tag>
                </div>
              )}
            </div>
            {/* 右：连接状态（与其他设备的连接按钮同几何，垂直居中） */}
            <span
              className="shrink-0 text-center"
              style={{
                fontSize: 12, fontWeight: 500, padding: '6px 0', width: 64, borderRadius: 999,
                background: 'var(--brand-subtle-bg)', color: 'var(--brand-subtle-text)',
              }}
            >
              已连接
            </span>
          </div>
        </Card>
        </div>
          {others.map(d => (
            <div
              key={d.id}
              ref={el => { cardRefs.current[d.id] = el; }}
              className="flex items-center gap-3"
              style={{
                padding: 14, borderRadius: 'var(--card-radius)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5">
                  <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><IconDrone size={17} /></span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate" style={{ fontSize: 14, fontWeight: 500 }}>{d.id}</span>
                      <Pill tone={d.sensorsOk ? 'neutral' : 'lo'}>{d.sensorsOk ? '正常' : '异常'}</Pill>
                    </div>
                    <div className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{d.model}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  <Tag>电量 {Math.round(d.batteryPct)}%</Tag>
                  <Tag>存储 {d.storageFreeGb.toFixed(1)}GB</Tag>
<span
                    className="flex items-center gap-1"
                    style={{
                      padding: '3px 8px', borderRadius: 999, fontSize: 10.5, fontWeight: 500,
                      background: 'var(--surface-1)', border: '1px solid var(--brand-border)',
                      color: 'var(--brand-subtle-text)',
                    }}
                  >
                    <IconPin size={10} />
                    {d.locationDesc}
                  </span>
                </div>
              </div>
              <button
                className="shrink-0 text-center pressable flex items-center justify-center gap-1"
                style={{
                  fontSize: 12, fontWeight: 500, height: 29, width: connectingId === d.id ? 76 : 64,
                  borderRadius: 999, transition: 'width .2s',
                  background: connectingId === d.id ? 'var(--brand-subtle-bg)' : 'var(--brand)',
                  color: connectingId === d.id ? 'var(--brand-subtle-text)' : '#FFFFFF',
                  border: 'none', cursor: connectingId ? 'default' : 'pointer',
                }}
                onClick={() => connectTo(d)}
              >
                {connectingId === d.id && <IconSync size={11} spinning />}
                {connectingId === d.id ? '连接中' : '连接'}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-3 leading-[1.6]" style={{ fontSize: 11.5, color: 'var(--text-tertiary)' }}>
          同时仅连接一台无人机；连接其他设备时当前设备将断开。
        </div>

        {/* 设置 */}
        <div
          className="mt-4"
          style={{
            borderRadius: 'var(--card-radius)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)',
            boxShadow: 'var(--shadow-card)',
            overflow: 'hidden',
          }}
        >
          <button
            className="w-full flex items-center gap-2.5"
            style={{
              padding: '11px 14px', cursor: 'pointer',
              background: 'transparent',
              color: 'var(--text-primary)', fontSize: 13,
            }}
            onClick={() => set({ deviceSub: 'settings' })}
          >
            <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex' }}><IconSliders size={14} /></span>
            <span className="flex-1 text-left">设置</span>
            <span style={{ color: 'var(--text-placeholder)' }}><IconChevronRight size={12} /></span>
          </button>
        </div>
      </div>

      <Dialog
        open={blockOpen}
        title="巡检任务进行中"
        body="当前设备正在执行巡检任务，请等待任务结束后再切换设备。"
        actions={[{ label: '知道了', tone: 'primary', onClick: () => setBlockOpen(false) }]}
      />
    </div>
  );
}
