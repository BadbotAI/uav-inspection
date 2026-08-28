// 会话：登录 / 退出登录的完整流程（页面只调这里，不直接改 store）
import { api } from '../api';
import { useStore, initialMission } from '../store';

// 登录：校验凭据 → 拉取设备/场景/航线/任务 → 一次性进入已登录态
// 数据在登录期间取齐，首页不会出现空态闪烁
export async function login(account: string, password: string): Promise<void> {
  const name = account.trim();
  await api.login(name, password);
  const [device, scenes, { routes, lastSyncAt }, tasks] = await Promise.all([
    api.reconnectDevice(), api.getScenes(), api.getRoutes(), api.getTasks(),
  ]);
  useStore.setState({
    loggedIn: true, account: name, lastAccount: name,
    loginAt: new Date().toISOString(),
    device, scenes, routes, lastSyncAt, tasks,
    tab: 'home', routeSub: null, resultSub: null, deviceSub: null,
  });
}

// 任务进行中（飞行 / 处理）不允许退出：避免执行中的任务失去监控归属
export function canLogout(): boolean {
  const m = useStore.getState().mission;
  return m.state === 'IDLE' || m.state === 'DONE';
}

// 退出登录：注销会话 → 断开设备 → 清空导航与任务态 → 回到登录页
// 本机巡检数据（tasks）保留在数据层，重新登录后照常可见
export async function logout(): Promise<void> {
  await api.logout();
  useStore.setState({
    loggedIn: false, account: '', loginAt: null,
    device: null,
    tab: 'home', routeSub: null, resultSub: null, deviceSub: null,
    vpFull: false, landscape: false, doneEntry: null, backInterceptor: null,
    mission: { ...initialMission },
  });
  useStore.getState().showToast('已退出登录');
}
