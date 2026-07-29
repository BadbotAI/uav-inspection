// 第 13 章待定项 —— 全部抽成常量，按默认值实现
export const OBSTACLE_TIMEOUT_S = 60;    // 停障悬停倒计时：约 1 分钟未离开则自动返航
export const OBSTACLE_CLEAR_MOCK_S = 8;  // mock：障碍物 8 秒后离开，自动恢复
export const LOC_LOST_TIMEOUT_S = 60;    // 定位丢失悬停倒计时
export const LINK_LOST_HOVER_S = 10;     // 失联后机载预设：悬停 10s → 自动返航
export const LOC_THRESHOLDS = [10, 30];  // 定位质量分档：良好 ≤10cm · 一般 10–30cm · 差 >30cm
export const CONF_THRESHOLDS = [70, 90]; // 体积置信度：高 ≥90% · 中 70–90% · 低 <70%
export const FRESHNESS_DAYS = [14, 30];  // 新鲜度：较新 ≤14 天 · 偏旧 15–30 天 · 过期 >30 天
export const PROCESS_TIMEOUT_S = 900;    // 处理阶段超时 15 分钟
export const DEFAULT_BULK_DENSITY = 0.72;// 默认容重 t/m³（玉米近似值）
export const TARGET_POINTS = 42000;      // 点云生成量即最终量

export const PREFLIGHT_TIMEOUT_S = 60;
export const COUNTDOWN_S = 3;
export const RESULT_RETENTION_DAYS = 7;   // 成果本机保留期限，超期显示失效
export const BATTERY_LOW_PCT = 20;        // 低电量告警
export const BATTERY_RETURN_PCT = 12;     // 电量不足自动返航

// mock 基准日期：所有相对时间基于此计算
export const BASE_NOW = new Date('2026-07-27T10:20:00');

export function daysAgo(iso: string): number {
  const d = new Date(iso);
  return Math.floor((BASE_NOW.getTime() - d.getTime()) / 86400000);
}

export function freshnessOf(recordedAt: string): 'fresh' | 'aging' | 'stale' {
  const d = daysAgo(recordedAt);
  if (d <= FRESHNESS_DAYS[0]) return 'fresh';
  if (d <= FRESHNESS_DAYS[1]) return 'aging';
  return 'stale';
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtClock(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// 相对日期文案：今天 / n 天前 / MM-DD
export function fmtRelDay(iso: string): string {
  const d = daysAgo(iso);
  if (d <= 0) return '今天';
  return `${d} 天前`;
}

export function fmtDateShort(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function fmtHM(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function fmtHMS(iso: string): string {
  return fmtClock(new Date(iso));
}
