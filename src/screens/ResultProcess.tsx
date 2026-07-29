// 巡检过程：航线过程信息 + 各点位图片 + 巡检视频
// 图片/视频：点击放大查看（含拍摄航点与时间），右上角下载保存，左右切换
import { useState } from 'react';
import { useStore } from '../store';
import { sceneSnapshot } from '../three/snapshot';
import { fmtDuration, fmtHMS } from '../constants';
import type { Task } from '../types';

const RETURN_TRIGGER_TEXT = {
  user: '用户手动返航',
  route_complete: '航线走完自动返航',
  auto_timeout: '悬停超时自动返航',
  safety: '安全策略自动返航',
  rc_override: '遥控器介入，任务中断',
} as const;

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3" style={{ padding: '3.5px 0' }}>
      <span className="shrink-0" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{k}</span>
      <span className="mono text-right" style={{ fontSize: 12, color: 'var(--text-primary)' }}>{v}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  borderRadius: 'var(--card-radius)',
  border: '1px solid var(--card-stroke)',
  background: 'var(--surface-1)',
  boxShadow: 'var(--shadow-card)',
};

type ViewerState = { type: 'photo'; idx: number } | { type: 'video' } | null;

export function ResultProcess({ task }: { task: Task }) {
  const showToast = useStore(s => s.showToast);
  const [viewer, setViewer] = useState<ViewerState>(null);

  const photoCount = Math.max(6, task.waypointDone - 2);
  const videoSizeMb = Math.round(task.durationSec * 1.1);
  const snap = sceneSnapshot();
  // 机载相机实拍图（打包在应用内的实景样张）
  const photoSrc = (i: number) => `photos/wp_0${(i % 8) + 1}.jpg`;
  const videoCover = 'photos/video_cover.jpg';
  const videoSrc = 'photos/inspection_video.mp4';

  // 每张图片对应的拍摄航点与时间（按航点序号在飞行时长中的占比推算）
  const photoWp = (i: number) => i * 3 + 2;
  const photoTimeIso = (i: number) => {
    const start = new Date(task.startedAt).getTime();
    const frac = Math.min(1, photoWp(i) / task.waypointTotal);
    return new Date(start + frac * task.durationSec * 1000).toISOString();
  };


  const photoStyle = (i: number): React.CSSProperties => ({
    backgroundImage: `url(${photoSrc(i)})${snap ? `, url(${snap})` : ''}`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  });

  return (
    <div>
      {/* 过程概览 */}
      <div style={{ ...cardStyle, padding: '10px 14px' }}>
        <Row k="起飞" v={fmtHMS(task.startedAt)} />
        <Row k="降落" v={fmtHMS(task.landedAt)} />
        <Row k="时长" v={fmtDuration(task.durationSec)} />
        <Row k="完成航点" v={`${task.waypointDone}/${task.waypointTotal}`} />
        <Row k="轨迹总长" v={`${task.trackLengthM.toFixed(1)}m`} />
        <Row k="平均 / 最大速度" v={`${task.avgSpeedMs.toFixed(1)} / ${task.maxSpeedMs.toFixed(1)} m/s`} />
        <Row k="返航触发" v={RETURN_TRIGGER_TEXT[task.returnTrigger]} />
      </div>

      {/* 点位图片：点击放大 */}
      <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>点位图片 · {photoCount} 张</div>
      <div style={{ ...cardStyle, padding: 12 }}>
        <div className="grid grid-cols-4 gap-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              className="relative"
              style={{
                height: 58, borderRadius: 5, cursor: 'pointer',
                background: '#171B22',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden',
                ...photoStyle(i),
              }}
              onClick={() => setViewer({ type: 'photo', idx: i })}
            >
              <span
                className="mono absolute"
                style={{
                  left: 5, bottom: 4, fontSize: 9.5, color: 'rgba(255,255,255,.9)',
                  textShadow: '0 1px 2px rgba(0,0,0,.6)',
                }}
              >
                航点 {String(photoWp(i)).padStart(2, '0')}
              </span>
            </button>
          ))}
        </div>
        {photoCount > 8 && (
          <div className="mt-1.5 text-right" style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
            其余 {photoCount - 8} 张在结果包内
          </div>
        )}
      </div>

      {/* 巡检视频：点击放大 */}
      <div className="dlabel mt-5 mb-2" style={{ fontSize: 11 }}>巡检视频</div>
      <div style={{ ...cardStyle, padding: 12, marginBottom: 8 }}>
        <button
          className="w-full flex items-center justify-center relative"
          style={{
            height: 150, borderRadius: 6, cursor: 'pointer', overflow: 'hidden',
            background: `linear-gradient(rgba(10,13,18,.35), rgba(10,13,18,.35)), url(${videoCover}) center/cover${snap ? `, url(${snap}) center/cover` : ''}`,
            border: '1px solid var(--border-subtle)',
          }}
          onClick={() => setViewer({ type: 'video' })}
        >
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 44, height: 44, background: 'rgba(255,255,255,.18)', backdropFilter: 'blur(4px)' }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <path d="M5 3.4 L12.4 8 L5 12.6 Z" fill="#FFFFFF" />
            </svg>
          </span>
          <span
            className="mono absolute"
            style={{ right: 10, bottom: 8, fontSize: 10.5, color: 'rgba(255,255,255,.85)' }}
          >
            {fmtDuration(task.durationSec)} · {videoSizeMb}MB
          </span>
        </button>
      </div>

      {/* 放大查看：图片 / 视频，右上下载，左右切换 */}
      {viewer && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(9,11,15,.94)' }}
          onClick={() => setViewer(null)}
        >
          {/* 右上：关闭 */}
          <div className="absolute flex items-center gap-2" style={{ top: 14, right: 14 }}>
            <button
              className="flex items-center justify-center"
              style={{
                width: 32, height: 32, borderRadius: 999,
                background: 'rgba(255,255,255,.14)', color: '#FFF',
                fontSize: 18, lineHeight: 1, cursor: 'pointer',
              }}
              onClick={() => setViewer(null)}
              aria-label="关闭"
            >
              ×
            </button>
          </div>

          <div className="relative flex items-center" style={{ width: '100%' }} onClick={e => e.stopPropagation()}>
            {/* 左右切换（仅图片） */}
            {viewer.type === 'photo' && (
              <button
                className="absolute flex items-center justify-center"
                style={{
                  left: 10, width: 34, height: 34, borderRadius: 999, zIndex: 2,
                  background: 'rgba(255,255,255,.14)', color: '#FFF', cursor: 'pointer',
                  opacity: viewer.idx === 0 ? 0.35 : 1,
                }}
                onClick={() => viewer.idx > 0 && setViewer({ type: 'photo', idx: viewer.idx - 1 })}
                aria-label="上一张"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.2 3 L5 8 L10.2 13" />
                </svg>
              </button>
            )}

            <div style={{ width: '78%', margin: '0 auto' }}>
              {viewer.type === 'photo' ? (
                <div
                  style={{
                    width: '100%', aspectRatio: '4 / 3', borderRadius: 10,
                    background: '#171B22', overflow: 'hidden',
                    ...photoStyle(viewer.idx),
                    backgroundSize: 'cover',
                  }}
                />
              ) : (
                <video
                  src={videoSrc}
                  poster={videoCover}
                  controls
                  autoPlay
                  playsInline
                  loop
                  style={{
                    width: '100%', aspectRatio: '16 / 9', borderRadius: 10,
                    background: '#0A0D12', display: 'block', objectFit: 'cover',
                  }}
                />
              )}
            </div>

            {viewer.type === 'photo' && (
              <button
                className="absolute flex items-center justify-center"
                style={{
                  right: 10, width: 34, height: 34, borderRadius: 999, zIndex: 2,
                  background: 'rgba(255,255,255,.14)', color: '#FFF', cursor: 'pointer',
                  opacity: viewer.idx === 7 ? 0.35 : 1,
                }}
                onClick={() => viewer.idx < 7 && setViewer({ type: 'photo', idx: viewer.idx + 1 })}
                aria-label="下一张"
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5.8 3 L11 8 L5.8 13" />
                </svg>
              </button>
            )}
          </div>

          {/* 拍摄信息 */}
          <div className="mono mt-4 text-center" style={{ fontSize: 13, color: '#FFFFFF' }}>
            {viewer.type === 'photo'
              ? `航点 ${String(photoWp(viewer.idx)).padStart(2, '0')} · ${fmtHMS(photoTimeIso(viewer.idx))}`
              : `全程录像 · ${fmtHMS(task.startedAt)} - ${fmtHMS(task.landedAt)}`}
          </div>
          {viewer.type === 'photo' && (
            <div className="mono mt-1.5 text-center" style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>
              {viewer.idx + 1} / 8
            </div>
          )}

          {/* 下载：图片正下方的明确动作 */}
          <button
            className="flex items-center gap-2 pressable"
            style={{
              marginTop: 26, padding: '9px 24px', borderRadius: 999,
              background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.25)',
              color: '#FFFFFF', fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(4px)',
            }}
            onClick={e => {
              e.stopPropagation();
              showToast(viewer.type === 'photo' ? '图片已保存到相册' : '视频已保存到相册');
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 2.4v7.4M4.8 6.8 8 10 11.2 6.8M2.8 12.8h10.4" />
            </svg>
            {viewer.type === 'photo' ? '下载图片' : '下载视频'}
          </button>
        </div>
      )}
    </div>
  );
}
