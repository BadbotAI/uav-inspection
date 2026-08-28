// 数据层门面 —— 页面不得直接 import mock。
// 后续换成真实设备协议时只改这个文件。
import type { CheckResult, DeviceState, Route, Scene, Task } from '../types';
import { DEVICE } from '../mock/device';
import { ROUTES, NEW_ROUTE, SCENES } from '../mock/routes';
import { TASKS } from '../mock/tasks';

const delay = (ms?: number) =>
  new Promise<void>(r => setTimeout(r, ms ?? 200 + Math.random() * 400));

// 内存态（约束 C10：不使用 localStorage / sessionStorage）
let routes: Route[] = ROUTES.map(r => ({ ...r }));
let tasks: Task[] = TASKS.map(t => ({ ...t, stacks: t.stacks.map(s => ({ ...s })) }));
let device: DeviceState = { ...DEVICE };
let newRouteDelivered = false;
let lastSyncAt = '2026-07-24T10:15:00';

export const api = {
  async login(account: string, password: string): Promise<{ token: string }> {
    await delay();
    if (!account.trim() || !password) throw new Error('账号或密码错误');
    return { token: 'mock-token' };
  },

  // 退出登录：注销会话令牌，并断开与当前设备的连接（设备侧遥测订阅一并释放）
  async logout(): Promise<void> {
    await delay(400);
    device = { ...device, connected: false };
  },

  // 重新登录后恢复设备连接（局域网内按设备唯一标识重连）
  async reconnectDevice(): Promise<DeviceState> {
    await delay(300);
    device = { ...device, connected: true };
    return { ...device };
  },

  async getDevice(): Promise<DeviceState> {
    await delay();
    return { ...device };
  },

  async getScenes(): Promise<Scene[]> {
    await delay();
    return SCENES.map(s => ({ ...s }));
  },

  // 导入航线 JSON 文件（协议与飞机共享文件夹一致）
  async importRouteFile(): Promise<{ route: Route | null }> {
    await delay(600);
    if (newRouteDelivered) return { route: null };
    routes = [{ ...NEW_ROUTE }, ...routes];
    newRouteDelivered = true;
    return { route: { ...NEW_ROUTE } };
  },

  async deleteTask(id: string): Promise<void> {
    await delay(200);
    tasks = tasks.filter(t => t.id !== id);
  },

  async syncRoutes(): Promise<{ routes: Route[]; newCount: number; lastSyncAt: string }> {
    await delay(1500);
    let newCount = 0;
    if (!newRouteDelivered) {
      routes = [{ ...NEW_ROUTE }, ...routes];
      newRouteDelivered = true;
      newCount = 1;
    }
    lastSyncAt = '2026-07-27T10:20:00';
    return { routes: routes.map(r => ({ ...r })), newCount, lastSyncAt };
  },

  async getRoutes(): Promise<{ routes: Route[]; lastSyncAt: string }> {
    await delay();
    return { routes: routes.map(r => ({ ...r })), lastSyncAt };
  },

  async updateRoute(id: string, patch: Pick<Route, 'name' | 'note' | 'scanTags' | 'sceneId'>): Promise<Route> {
    await delay();
    const r = routes.find(x => x.id === id);
    if (!r) throw new Error('E-R404 航线不存在');
    r.name = patch.name;
    r.sceneId = patch.sceneId;
    r.note = patch.note;
    r.scanTags = patch.scanTags;
    return { ...r };
  },

  async deleteRoute(id: string): Promise<void> {
    await delay();
    routes = routes.filter(x => x.id !== id);
  },

  async uploadRoute(routeId: string): Promise<{ readback: number }> {
    await delay(400);
    const r = routes.find(x => x.id === routeId);
    return { readback: r?.waypointCount ?? 0 };
  },

  async getTasks(): Promise<Task[]> {
    await delay();
    return tasks.map(t => ({ ...t, stacks: t.stacks.map(s => ({ ...s })) }));
  },

  async getTask(id: string): Promise<Task> {
    await delay();
    const t = tasks.find(x => x.id === id);
    if (!t) throw new Error('E-T404 任务不存在');
    return { ...t, stacks: t.stacks.map(s => ({ ...s })) };
  },

  async addTask(task: Task): Promise<void> {
    tasks = [task, ...tasks];
  },

  async exportReport(taskId: string): Promise<{ path: string; json: string }> {
    await delay(300);
    const t = tasks.find(x => x.id === taskId);
    if (!t) throw new Error('E-T404 任务不存在');
    return { path: `/Download/report_${taskId}.json`, json: JSON.stringify(t, null, 2) };
  },
};

// 起飞前自检：由无人机执行并回传结果（含场景匹配校验）
export function buildPreflightChecks(route: Route, dev: DeviceState, sceneName: string): CheckResult[] {
  const needBattery = Math.round(route.etaMin * 4.8);
  const needGb = 0.8;
  return [
    { key: 'scene', title: '场景匹配',
      passed: true,
      detail: `检测到所在场景 ${sceneName} · 与航线一致` },
    { key: 'battery', title: '电量',
      passed: dev.batteryPct >= needBattery * 1.5,
      detail: `${dev.batteryPct}% · 本航线预计需 ${needBattery}%` },
    { key: 'loc', title: '定位就绪',
      passed: dev.locQuality === 'good',
      detail: `融合定位已收敛 · P95 ${dev.locP95Cm.toFixed(1)}cm` },
    { key: 'storage', title: '机载存储',
      passed: dev.storageFreeGb >= needGb * 1.3,
      detail: `剩余 ${dev.storageFreeGb.toFixed(1)}GB · 本次预计 ${needGb.toFixed(1)}GB` },
    { key: 'link', title: '通信链路',
      passed: dev.rttMs <= 200 && dev.lossPct <= 5,
      detail: `RTT ${dev.rttMs}ms · 丢包 ${dev.lossPct}%` },
    { key: 'sensor', title: '传感器自检',
      passed: dev.sensorsOk,
      detail: 'LiDAR 出点率正常 · IMU 零偏正常' },
    { key: 'route', title: '航线已下发',
      passed: true,
      detail: `无人机回读 ${route.waypointCount} 航点 · 与本机一致` },
  ];
}
