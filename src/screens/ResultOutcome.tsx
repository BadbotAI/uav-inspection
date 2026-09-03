// 巡检结果：体积测算 + 堆体明细（含分层计数）+ 数据质量 + 报告预览
// 报告链路：生成报告（加载）→ 应用内预览 → 可选保存到手机
import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { IconDoc, IconCopy, IconChevronRight } from '../components/Icons';
import { syncCodeOf } from '../sync';

// 网页端数据中心地址：手机端复制同步码后，在网页端接入即可归档、检索、下载
const WEB_HOST = 'badbotai.github.io/uav-inspection-web';

// 明细异常情况文案：状态 + 原因/建议
const ISSUE_TEXT = {
  unclear: '识别不清晰 · 表面反光或粉尘干扰，建议补扫复核',
  occluded: '部分遮挡 · 遮挡面由推算得出，结果偏保守',
  uncovered: '未完整覆盖 · 本次航线未扫到该区域，数据不完整',
  changed: '较上次变化异常 · 建议人工复核',
} as const;

// 货物绑定标签形式文案（二维码/条码/RFID，具体形式设计阶段确认）
const TAG_NAME = { qr: '二维码', barcode: '条码', rfid: 'RFID' } as const;
import type { Task } from '../types';

const cardStyle: React.CSSProperties = {
  borderRadius: 'var(--card-radius)',
  border: '1px solid var(--card-stroke)',
  background: 'var(--surface-1)',
  boxShadow: 'var(--shadow-card)',
};

export function ResultOutcome({
  task, focusId, onPick,
}: {
  task: Task;
  focusId?: string | null;
  onPick?: (stackId: string) => void;
}) {
  const density = useStore(s => s.density);
  const showToast = useStore(s => s.showToast);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [exporting, setExporting] = useState<'idle' | 'generating' | 'preview'>('idle');

  // 三维中点选堆体 → 平滑定位到对应行
  useEffect(() => {
    if (!focusId) return;
    rowRefs.current[focusId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusId]);

  const totalV = Math.round(task.stacks.reduce((a, s) => a + s.volumeM3, 0) * 10) / 10;
  const tons = Math.round(totalV * density * 10) / 10;
  const isBulk = task.stacks[0]?.cargoType !== 'stacked';
  const totalCount = task.stacks.reduce((a, s) => a + (s.totalCount ?? 0), 0);
  const unitName = isBulk ? '堆体' : '货位';
  const jsonName = `report_${task.id}.json`;
  const pdfName = `report_${task.id}.pdf`;
  const photoCount = Math.max(6, task.waypointDone - 2);
  const packSizeMb = Math.round(task.cloudSizeMb + task.durationSec * 1.1 + photoCount * 2.4);

  // 生成报告（加载态）后进入应用内预览，避免依赖系统下载流程
  const startExport = () => {
    setExporting('generating');
    setTimeout(() => setExporting('preview'), 1200);
  };

  const exportPack = () => {
    const report = {
      task, exportedAt: new Date().toISOString(),
      totalVolumeM3: totalV,
      bulkDensityTPerM3: density,
      totalTons: tons,
      attachments: {
        model: `${task.id}_cloud_sparse.pcd`,
        volume: `${task.id}_volume.json`,
        inventory: `${task.id}_inventory.json`,
        report: pdfName,
        video: `${task.id}_video.mp4`,
        photos: photoCount,
      },
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = jsonName;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('结果报告已导出到下载目录');
  };

  const copyPath = async () => {
    try { await navigator.clipboard.writeText(task.cloudSharePath); } catch { /* 剪贴板不可用时仍提示 */ }
    showToast('路径已复制');
  };

  // 同步码：每次巡检一个，网页端凭此拉取该次任务的过程数据、成果与报告（有效期 7 天）
  const syncCode = syncCodeOf(task.id);
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(syncCode); } catch { /* 剪贴板不可用时仍提示 */ }
    showToast('同步码已复制，到网页端接入即可查看');
  };

  return (
    <div>
      {/* 合计（英雄数据）：深色锚点面板，与浅色卡片拉开层次 */}
      <div
        style={{
          borderRadius: 'var(--card-radius)', overflow: 'hidden',
          background: 'var(--panel-deep)', boxShadow: '0 4px 16px rgba(31,44,73,.22)',
        }}
      >
        <div style={{ padding: '15px 16px 13px' }}>
          <div className="dlabel" style={{ color: 'var(--panel-deep-sub)' }}>
            合计体积 · {task.stacks.length} 个{unitName}
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="mono" style={{ fontSize: 44, lineHeight: 1.05, color: 'var(--panel-deep-text)' }}>
              {totalV.toFixed(1)}
            </span>
            <span className="mono" style={{ fontSize: 13, color: 'var(--panel-deep-sub)' }}>m³</span>
            {!isBulk && (
              <span className="mono ml-auto" style={{ fontSize: 15, color: 'var(--panel-deep-text)' }}>
                {totalCount.toLocaleString()} <span style={{ fontSize: 11, color: 'var(--panel-deep-sub)' }}>件</span>
              </span>
            )}
          </div>
        </div>
        {isBulk && (
          <div
            className="flex items-center justify-between"
            style={{
              padding: '10px 16px',
              borderTop: '1px solid rgba(255,255,255,.10)',
              background: 'rgba(255,255,255,.05)',
            }}
          >
            <span style={{ fontSize: 12, color: 'var(--panel-deep-sub)' }}>
              按容重 <span className="mono">{density.toFixed(2)}</span> t/m³ 折算
            </span>
            <span className="mono" style={{ fontSize: 15, color: 'var(--panel-deep-text)' }}>
              {tons.toFixed(1)} <span style={{ fontSize: 11, color: 'var(--panel-deep-sub)' }}>t</span>
            </span>
          </div>
        )}
      </div>

      {/* 堆体 / 货位明细：三维点选后高亮定位 */}
      <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>{unitName}明细</div>
      <div style={{ ...cardStyle, overflow: 'hidden' }}>
        {task.stacks.map((s, i) => {
          const focused = focusId === s.id;
          return (
            <div
              key={s.id}
              ref={el => { rowRefs.current[s.id] = el; }}
              className="flex items-center gap-3"
              style={{
                padding: '12px 14px',
                borderTop: i > 0 ? '1px solid var(--border-subtle)' : 'none',
                background: focused ? 'var(--brand-subtle-bg)' : 'transparent',
                transition: 'background .2s',
                cursor: onPick ? 'pointer' : 'default',
              }}
              onClick={() => onPick?.(s.id)}
            >
              <div className="flex-1 min-w-0">
                <div style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</div>
                <div className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
                  {s.position} · {s.cargoType === 'bulk' ? '散料堆体' : '规则码垛'}
                  {s.totalCount != null && ` · ${s.layerCount} 层 × ${s.perLayerCount} 件/层`}
                </div>
                {s.tagType && (
                  <div className="mono mt-0.5" style={{ fontSize: 10.5, color: s.tagCode ? 'var(--text-tertiary)' : 'var(--warning)' }}>
                    {s.tagCode ? `${TAG_NAME[s.tagType]} ${s.tagCode}` : `${TAG_NAME[s.tagType]}标签未识别`}
                  </div>
                )}
                {s.issue && (
                  <div className="flex items-center gap-1 mt-1" style={{ fontSize: 10.5, color: 'var(--warning)' }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" className="shrink-0">
                      <path d="M8 2.6 L14.6 13.2 H1.4 Z" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <path d="M8 6.6 V9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      <circle cx="8" cy="11.3" r="0.8" fill="currentColor" />
                    </svg>
                    {ISSUE_TEXT[s.issue]}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                {s.totalCount != null ? (
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="mono" style={{ fontSize: 18 }}>{s.totalCount.toLocaleString()}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>件</span>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="mono" style={{ fontSize: 18 }}>{s.volumeM3.toFixed(1)}</span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>m³</span>
                  </div>
                )}
                <div className="mono mt-0.5" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                  {s.totalCount != null ? `${s.volumeM3.toFixed(1)}m³ · ` : ''}覆盖 {s.surfaceCoverPct}%
                </div>
              </div>
              <div className="shrink-0 flex items-center gap-1.5">
                {onPick && (
                  <span style={{ color: 'var(--text-placeholder)', display: 'inline-flex' }}>
                    <IconChevronRight size={11} />
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 本次覆盖：完成性指标合并为单一表达（环形 + 关键行） */}
      <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>本次覆盖</div>
      <div className="flex items-center gap-4" style={{ ...cardStyle, padding: '13px 16px' }}>
        {(() => {
          const R = 22, C = 2 * Math.PI * R;
          const cov = task.coveragePct;
          return (
            <span className="relative flex items-center justify-center shrink-0" style={{ width: 56, height: 56 }}>
              <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="28" cy="28" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="5" />
                <circle
                  cx="28" cy="28" r={R} fill="none"
                  stroke={cov < 100 ? 'var(--warning)' : 'var(--brand)'} strokeWidth="5" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - cov / 100)}
                />
              </svg>
              <span className="mono absolute" style={{ fontSize: 12.5, fontWeight: 500 }}>{cov}%</span>
            </span>
          );
        })()}
        <div className="flex-1 min-w-0">
          <div style={{ fontSize: 13, fontWeight: 500 }}>
            {task.coveragePct < 100 ? '部分覆盖航线区域' : '完整覆盖航线区域'}
          </div>
          <div className="mono mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            完成航点 {task.waypointDone}/{task.waypointTotal} · 测算耗时 {task.volumeCalcSec}s
          </div>
        </div>
      </div>

      {/* 报告 */}
      <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>报告</div>
      <div style={{ ...cardStyle, overflow: 'hidden', marginBottom: 8 }}>
        <div className="flex items-center gap-3" style={{ padding: '13px 14px' }}>
          <span
            className="flex items-center justify-center rounded-[8px] shrink-0"
            style={{ width: 34, height: 34, background: 'var(--brand-subtle-bg)', color: 'var(--brand)' }}
          >
            <IconDoc size={16} />
          </span>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>结果报告</div>
            <div className="mt-0.5" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              体积测算 · {unitName}明细 · 盘点汇总 · PDF / JSON
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 shrink-0 pressable"
            style={{
              fontSize: 12.5, padding: '8px 16px', borderRadius: 999,
              background: 'var(--brand)', border: 'none', color: '#FFFFFF', cursor: 'pointer',
            }}
            onClick={startExport}
          >
            预览
          </button>
        </div>
        <div
          className="flex items-center gap-3"
          style={{ padding: '11px 14px', background: 'var(--fill-quiet)', borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>完整点云</div>
            <div className="mono mt-0.5 break-all" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
              {task.cloudSharePath}
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 shrink-0"
            style={{
              fontSize: 12, padding: '7px 12px', borderRadius: 999,
              background: 'var(--surface-1)', border: '1px solid var(--border-default)',
              color: 'var(--text-primary)', cursor: 'pointer',
            }}
            onClick={copyPath}
          >
            <IconCopy size={12} /> 复制路径
          </button>
        </div>
        {/* 同步到网页端：复制同步码 → 网页端接入 → 归档 / 检索 / 下载数据包 */}
        <div style={{ padding: '11px 14px', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div style={{ fontSize: 12.5, fontWeight: 500 }}>同步到网页端</div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="mono"
                  style={{
                    fontSize: 13, letterSpacing: '.06em', padding: '3px 8px', borderRadius: 6,
                    background: 'var(--brand-subtle-bg)', color: 'var(--brand-subtle-text)',
                  }}
                >
                  {syncCode}
                </span>
                <span style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>有效期 7 天</span>
              </div>
            </div>
            <button
              className="flex items-center gap-1.5 shrink-0 pressable"
              style={{
                fontSize: 12, padding: '7px 12px', borderRadius: 999,
                background: 'var(--brand)', border: 'none', color: '#FFFFFF', cursor: 'pointer',
              }}
              onClick={copyCode}
            >
              <IconCopy size={12} /> 复制同步码
            </button>
          </div>
          <div className="mono mt-2 leading-[1.5]" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
            在 {WEB_HOST} 输入同步码，可查看飞行过程与三维成果、在线预览报告、下载完整数据包
          </div>
        </div>
      </div>

      {/* 生成报告加载态 */}
      {exporting === 'generating' && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(16,24,40,.26)', backdropFilter: 'blur(2px)' }}
        >
          <div
            className="count-pop flex flex-col items-center"
            style={{
              background: 'var(--surface-1)', borderRadius: 12,
              border: '1px solid var(--card-stroke)', boxShadow: 'var(--shadow-modal)',
              padding: '22px 32px', width: 240,
            }}
          >
            <svg width="26" height="26" viewBox="0 0 16 16" fill="none" stroke="var(--brand)" strokeWidth="1.4" strokeLinecap="round" style={{ animation: 'spin .9s linear infinite' }}>
              <path d="M13.5 8a5.5 5.5 0 1 1-2.2-4.4" />
            </svg>
            <div className="mt-3" style={{ fontSize: 14, fontWeight: 600 }}>正在生成结果报告</div>
            <div className="mono mt-1" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              汇总测算结果与附件清单
            </div>
          </div>
        </div>
      )}

      {/* 应用内报告预览：文档化排版，可保存到手机 */}
      {exporting === 'preview' && (
        <div className="absolute inset-0 z-50 flex flex-col mask-in" style={{ background: 'var(--bg-base)' }}>
          {/* 顶栏 */}
          <div
            className="flex items-center shrink-0"
            style={{
              height: 48, padding: '0 8px 0 16px',
              background: 'var(--glass-bar)', backdropFilter: 'blur(14px)',
              borderBottom: '1px solid var(--divider)',
            }}
          >
            <span className="flex-1 truncate" style={{ fontSize: 16, fontWeight: 600 }}>结果报告</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{pdfName}</span>
            <button
              className="flex items-center justify-center pressable"
              style={{ width: 36, height: 36, fontSize: 19, color: 'var(--text-secondary)', cursor: 'pointer' }}
              onClick={() => setExporting('idle')}
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          {/* 文档区 */}
          <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
            <div style={{ ...cardStyle, padding: '18px 18px 14px' }}>
              <div style={{ fontSize: 17, fontWeight: 600 }}>仓储无人机巡检报告</div>
              <div className="mono mt-1" style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>
                {task.id} · {task.routeName}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
              {[
                ['巡检时间', `${task.startedAt.slice(0, 10)} ${task.startedAt.slice(11, 19)}`],
                ['任务状态', task.status === 'success' ? '完成' : task.status === 'aborted' ? '中断' : '失败'],
                ['覆盖度', `${task.coveragePct}%`],
                ['完成航点', `${task.waypointDone}/${task.waypointTotal}`],
                ['处理状态', '机载处理完成'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ padding: '3px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{v}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
              <div className="dlabel">合计体积 · {task.stacks.length} 个{unitName}</div>
              <div className="flex items-baseline gap-1.5 mt-1.5">
                <span className="mono" style={{ fontSize: 34, lineHeight: 1.05 }}>{totalV.toFixed(1)}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>m³</span>
                {isBulk && (
                  <span className="mono ml-auto" style={{ fontSize: 14 }}>
                    {tons.toFixed(1)} <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>t</span>
                  </span>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
              <div className="dlabel mb-1">{unitName}明细</div>
              {task.stacks.map(s => (
                <div key={s.id} style={{ padding: '5px 0' }}>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: 12.5 }}>{s.name}</span>
                    <span className="mono" style={{ fontSize: 12.5 }}>
                      {s.totalCount != null ? `${s.totalCount.toLocaleString()} 件 · ` : ''}{s.volumeM3.toFixed(1)}m³
                    </span>
                  </div>
                  {s.tagType && (
                    <div className="mono" style={{ fontSize: 10, color: s.tagCode ? 'var(--text-tertiary)' : 'var(--warning)' }}>
                      {s.tagCode ? `${TAG_NAME[s.tagType]} ${s.tagCode}` : `${TAG_NAME[s.tagType]}标签未识别`}
                    </div>
                  )}
                  {s.issue && (
                    <div style={{ fontSize: 10, color: 'var(--warning)' }}>{ISSUE_TEXT[s.issue]}</div>
                  )}
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border-subtle)', margin: '12px 0' }} />
              <div className="dlabel mb-1">附件清单</div>
              {[
                ['三维模型', `${task.id}_cloud_sparse.pcd`],
                ['体积结果', `${task.id}_volume.json`],
                ['盘点汇总', `${task.id}_inventory.json`],
                ['巡检报告', pdfName],
                ['巡检视频', `${task.id}_video.mp4`],
                ['点位图片', `${photoCount} 张`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between" style={{ padding: '3px 0' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
                  <span className="mono" style={{ fontSize: 11.5 }}>{v}</span>
                </div>
              ))}

              <div
                className="mono mt-3 pt-2.5"
                style={{ borderTop: '1px solid var(--border-subtle)', fontSize: 10, color: 'var(--text-placeholder)' }}
              >
                完整数据包约 {packSizeMb}MB · 由机载端生成
              </div>
            </div>
          </div>

          {/* 底部动作 */}
          <div
            className="shrink-0"
            style={{
              padding: '10px 16px 14px',
              background: 'var(--glass-bar)', backdropFilter: 'blur(14px)',
              borderTop: '1px solid var(--divider)',
            }}
          >
            <div style={{ width: 220, maxWidth: '100%', margin: '0 auto' }}>
              <button
                className="w-full pressable"
                style={{
                  height: 42, borderRadius: 8, fontSize: 14, fontWeight: 500,
                  background: 'var(--brand)', color: '#FFFFFF', border: 'none', cursor: 'pointer',
                }}
                onClick={() => { exportPack(); showToast('报告已保存到手机'); }}
              >
                保存到手机
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
