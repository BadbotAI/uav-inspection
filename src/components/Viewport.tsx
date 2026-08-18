// G-03 三维视图组件 —— 复用于 R-01 / X-02 / 成果页
// 三维区顶到边缘；全屏 = 父容器撑满、下方信息收起（vpFull 状态驱动）
import { useEffect, useRef, useState } from 'react';
import { Engine, type ViewPreset } from '../three/renderer';
import { useStore } from '../store';
import { IconExpand, IconCompress, IconLayers, IconSwitch } from './Icons';

export interface ViewportLayers {
  cloud: boolean; route: boolean; track: boolean; boxes: boolean; labels: boolean;
}

// 画布控件统一样式：28px 高玻璃胶囊
export function canvasChipStyle(active?: boolean): React.CSSProperties {
  return {
    height: 28, padding: '0 10px', borderRadius: 999,
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 11,
    background: active ? 'var(--brand)' : 'rgba(255,255,255,.85)',
    border: `1px solid ${active ? 'var(--brand)' : 'var(--border-default)'}`,
    color: active ? '#FFFFFF' : 'var(--text-secondary)',
    cursor: 'pointer', backdropFilter: 'blur(6px)',
    boxShadow: 'var(--shadow-card)',
  };
}

export function Viewport({
  waypointCount, altitudeM, sceneId, highlightMinClearance, pip, label, pipLabel,
  layers, layerPanel, presets, defaultPreset = 'iso',
  flight, onSelectPile, selectedPile, labelNames, fullscreenable, labelLeft,
  onSwapChange, perf,
}: {
  waypointCount: number;
  altitudeM: number;
  sceneId?: string;
  highlightMinClearance?: boolean;
  pip?: boolean;
  label?: string;
  pipLabel?: string;
  layers: ViewportLayers;
  layerPanel?: boolean;
  presets: ViewPreset[];
  defaultPreset?: ViewPreset;
  flight?: { prog: number; droneVisible: boolean; swapped?: boolean; showReturn?: boolean; returnT?: number; liftT?: number };
  onSelectPile?: (idx: number | null) => void;
  selectedPile?: number | null;
  labelNames?: string[];
  fullscreenable?: boolean;
  labelLeft?: number;
  onSwapChange?: (swapped: boolean) => void;
  perf?: boolean;            // 显示场景加载耗时与实时帧率（性能指标）
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pipCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [preset, setPreset] = useState<ViewPreset>(defaultPreset);
  const [degraded, setDegraded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [lay, setLay] = useState<ViewportLayers>(layers);
  const [pipH, setPipH] = useState(0);
  const [userSwap, setUserSwap] = useState(false);
  const [loadMs, setLoadMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const vpFull = useStore(s => s.vpFull);
  const setStore = useStore(s => s.set);
  // 主视图与实时画面可点击互换：停障强制切换与手动切换取异或
  const effSwap = !!flight?.swapped !== userSwap;
  useEffect(() => { onSwapChange?.(effSwap); }, [effSwap, onSwapChange]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const t0 = performance.now();
    const engine = new Engine(canvas, {
      waypointCount, altitudeM, sceneId,
      highlightMinClearance, pip, labelNames,
      pipCanvas: pip ? pipCanvasRef.current ?? undefined : undefined,
      onSelectPile,
      onDegrade: () => setDegraded(true),
      onUserOrbit: () => setPreset('iso'),
    });
    engineRef.current = engine;
    engine.setLayers(lay);
    engine.setPreset(defaultPreset);
    // 场景加载耗时：从引擎构建到首帧渲染完成
    requestAnimationFrame(() => setLoadMs(Math.round(performance.now() - t0)));

    const ro = new ResizeObserver(() => {
      engine.resize();
      const w = wrapRef.current?.clientWidth ?? 0;
      setPipH(Math.round((w * 0.34) / 1.4));
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => { ro.disconnect(); engine.dispose(); engineRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypointCount, altitudeM, sceneId]);

  useEffect(() => { engineRef.current?.setLayers(lay); }, [lay]);

  // 交互帧率实测：逐帧计数，每秒刷新一次读数
  useEffect(() => {
    if (!perf) return;
    let raf = 0, frames = 0, last = performance.now();
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [perf]);

  // 画中画画布尺寸随 pipH 变化后重新适配渲染缓冲
  useEffect(() => { engineRef.current?.resize(); }, [pipH]);

  useEffect(() => {
    const e = engineRef.current;
    if (!e || !flight) return;
    e.setFlight(flight.prog, flight.droneVisible, flight.liftT ?? 1);
    e.setSwapped(effSwap);
    if (flight.showReturn && flight.returnT !== undefined) {
      // 沿原航线回溯，无独立返航直线
      e.setReturnPose(flight.prog, flight.returnT);
    } else {
      e.hideReturnPath();
    }
  }, [flight?.prog, flight?.droneVisible, effSwap, flight?.showReturn, flight?.returnT, flight?.liftT]);

  useEffect(() => {
    engineRef.current?.selectPile(selectedPile === undefined ? null : selectedPile);
  }, [selectedPile]);

  // 全屏态：返回键退出；卸载时复位
  useEffect(() => {
    if (!vpFull) return;
    setStore({ backInterceptor: () => { setStore({ vpFull: false }); return true; } });
    return () => setStore({ backInterceptor: null });
  }, [vpFull, setStore]);

  useEffect(() => () => { useStore.setState({ vpFull: false }); }, []);

  const choosePreset = (p: ViewPreset) => {
    setPreset(p);
    engineRef.current?.setPreset(p);
  };

  const chip = (text: string, active: boolean, onClick: () => void, key?: string) => (
    <button key={key ?? text} className="mono pressable" style={canvasChipStyle(active)} onClick={onClick}>
      {text}
    </button>
  );

  // 主画面切到实时画面时不再出左上角标签（画面本身已说明）
  const mainLabel = effSwap && pipLabel ? undefined : label;
  const subLabel = effSwap && pipLabel ? '点云视图' : pipLabel;
  const presetNames: Record<ViewPreset, string> = { top: '顶视', iso: '全景', follow: '跟随' };

  return (
    <div
      ref={wrapRef}
      style={{ position: 'relative', width: '100%', height: '100%', background: 'var(--canvas)' }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" style={{ touchAction: 'none' }} />

      {/* 顶部标签 */}
      {mainLabel && (
        <div
          className="absolute mono pointer-events-none"
          style={{
            ...canvasChipStyle(false), cursor: 'default',
            position: 'absolute', top: 12, left: labelLeft ?? 10, fontSize: 10,
          }}
        >
          {mainLabel}
        </div>
      )}

      {/* 性能指标：场景加载耗时 + 实时帧率（规格：加载 ≤10s、≥30FPS） */}
      {perf && loadMs != null && (
        <div
          className="absolute mono pointer-events-none"
          style={{
            right: 12, bottom: 12, fontSize: 9.5, letterSpacing: '.04em',
            color: 'rgba(255,255,255,.55)', textShadow: '0 1px 2px rgba(0,0,0,.4)',
          }}
        >
          加载 {loadMs < 1000 ? `${loadMs}ms` : `${(loadMs / 1000).toFixed(1)}s`} · {fps ?? '--'} FPS
        </div>
      )}

      {degraded && (
        <div
          className="absolute mono text-[10px] px-2 py-1 rounded-[5px] pointer-events-none"
          style={{
            top: 46, right: 10,
            background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--warning)',
          }}
        >
          已降低渲染精度
        </div>
      )}

      {/* 画中画：独立画布（圆角真实裁剪），点击与主视图互换 */}
      {pip && (
        <canvas
          ref={pipCanvasRef}
          className="absolute"
          style={{
            right: 10, bottom: 10, width: '34%', height: pipH,
            borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(76,107,192,.85)',
            boxShadow: '0 3px 12px rgba(0,0,0,.25)',
            background: '#10131A',
          }}
          onClick={() => setUserSwap(v => !v)}
          aria-label="切换主画面"
        />
      )}

      {/* 画中画互换提示角标：与放大按钮同款玻璃圆钮 */}
      {pip && (
        <span
          className="absolute flex items-center justify-center pointer-events-none"
          style={{
            ...canvasChipStyle(false),
            width: 28, padding: 0, justifyContent: 'center',
            right: 14, bottom: 14,
          }}
        >
          <IconSwitch size={13} />
        </span>
      )}

      {/* 画中画标签 */}
      {pip && subLabel && (
        <div
          className="absolute mono text-[9px] px-1.5 py-0.5 rounded-[3px] pointer-events-none"
          style={{
            right: 16, bottom: pipH - 14,
            background: 'rgba(255,255,255,.85)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)',
          }}
        >
          {subLabel}
        </div>
      )}

      {/* 视角预设 + 图层，右上角 */}
      <div className="absolute flex items-center gap-1.5" style={{ right: 10, top: 12 }}>
        {presets.map(p => chip(presetNames[p], preset === p, () => choosePreset(p), p))}
        {/* 图层是面板开关，不是视角选中：图标按钮，展开态描边高亮 */}
        {layerPanel && (
          <button
            key="layers"
            className="flex items-center justify-center"
            style={{
              ...canvasChipStyle(false),
              width: 28, padding: 0, justifyContent: 'center',
              ...(panelOpen ? { border: '1px solid var(--brand)', color: 'var(--brand)' } : {}),
            }}
            onClick={() => setPanelOpen(v => !v)}
            aria-label="图层"
          >
            <IconLayers size={14} />
          </button>
        )}
      </div>

      {/* 全屏：点云画面右下角 */}
      {fullscreenable && (
        <button
          className="absolute flex items-center justify-center"
          style={{
            ...canvasChipStyle(false),
            width: 28, padding: 0, justifyContent: 'center',
            left: 10, bottom: 10,
          }}
          onClick={() => setStore({ vpFull: !vpFull })}
          aria-label={vpFull ? '退出全屏' : '全屏'}
        >
          {vpFull ? <IconCompress size={13} /> : <IconExpand size={13} />}
        </button>
      )}

      {/* 图层开关面板：整条文案可点，底色区分开关态 */}
      {panelOpen && (
        <div
          className="absolute rounded-[9px] flex flex-col gap-1"
          style={{
            right: 10, top: 46, width: 96, padding: 6,
            background: 'var(--glass-bg)', backdropFilter: 'blur(14px)',
            border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-popover)',
          }}
        >
          {([
            ['cloud', '场景点云'], ['track', '已飞轨迹'], ['boxes', '堆体包围框'], ['labels', '堆体标签'],
          ] as [keyof ViewportLayers, string][]).map(([k, name]) => {
            const on = lay[k];
            return (
              <button
                key={k}
                className="w-full text-center"
                style={{
                  padding: '6px 0', borderRadius: 6, fontSize: 11,
                  fontWeight: on ? 500 : 400,
                  background: on ? 'var(--brand)' : 'var(--fill-quiet)',
                  color: on ? '#FFFFFF' : 'var(--text-tertiary)',
                  cursor: 'pointer', transition: 'all .12s',
                }}
                onClick={() => setLay(v => ({ ...v, [k]: !v[k] }))}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
