// DEMO 控制台（不属于产品）：投标演示时跳转任意状态、触发停障、调速
import { useStore, initialMission } from '../store';
import { api } from '../api';
import {
  demoJumpToFlying, demoJumpToProcessing, demoProcessFail, triggerObstacle, triggerFault,
  triggerRcOverride, triggerLocLost, startPreflight,
} from './flight';

function ensureLoggedIn() {
  const s = useStore.getState();
  if (!s.loggedIn) useStore.setState({ loggedIn: true, account: '张' });
  // 冷启动态下点任何演示项：先恢复完整演示数据，保证每个演示都能有始有终
  if (useStore.getState().routes.length === 0) {
    const snap = api.exitCold();
    useStore.setState({ ...snap, dataLoaded: true, selectedRouteId: 'R-03' });
  }
}

export interface DemoItem { label: string; run: () => void }

export const demoItems: DemoItem[] = [
  {
    label: '航线列表',
    run: () => { ensureLoggedIn(); useStore.setState({ tab: 'routes', routeSub: null, mission: { ...initialMission } }); },
  },
  {
    label: '航线详情',
    run: () => {
      ensureLoggedIn();
      useStore.setState({ tab: 'routes', routeSub: { view: 'detail', id: 'R-03' }, mission: { ...initialMission } });
    },
  },
  {
    label: '起飞前检查',
    run: () => { ensureLoggedIn(); startPreflight('R-03'); },
  },
  {
    label: '执行态',
    run: () => { ensureLoggedIn(); demoJumpToFlying('R-03', 0.28); },
  },
  {
    label: '定位丢失',
    run: () => {
      ensureLoggedIn();
      const m = useStore.getState().mission;
      if (m.state !== 'FLYING') demoJumpToFlying('R-03', 0.62);
      setTimeout(triggerLocLost, 80);
    },
  },
  {
    label: '触发停障',
    run: () => {
      ensureLoggedIn();
      const m = useStore.getState().mission;
      if (m.state !== 'FLYING') demoJumpToFlying('R-03', 0.28);
      setTimeout(triggerObstacle, 60);
    },
  },
  {
    label: '数据处理',
    run: () => { ensureLoggedIn(); demoJumpToProcessing('R-03'); },
  },
  {
    label: '处理失败',
    run: () => { ensureLoggedIn(); demoProcessFail('R-03'); },
  },
  {
    label: '体积结果',
    run: () => {
      ensureLoggedIn();
      useStore.setState({
        tab: 'results', resultSub: { taskId: 'T-20260727-01', view: 'result' },
        mission: { ...initialMission },
      });
    },
  },
  {
    label: '盘点(规则货物)',
    run: () => {
      ensureLoggedIn();
      useStore.setState({
        tab: 'results', resultSub: { taskId: 'T-20260712-01', view: 'result' },
        mission: { ...initialMission },
      });
    },
  },
  {
    label: '触发低电量',
    run: () => {
      ensureLoggedIn();
      const m = useStore.getState().mission;
      if (m.state !== 'FLYING') demoJumpToFlying('R-03', 0.45);
      setTimeout(() => useStore.getState().patchMission({ batteryPct: 21.5 }), 80);
    },
  },
  {
    label: '遥控器介入',
    run: () => {
      ensureLoggedIn();
      const m = useStore.getState().mission;
      if (!['FLYING', 'HOVERING', 'RETURNING'].includes(m.state)) demoJumpToFlying('R-03', 0.4);
      setTimeout(triggerRcOverride, 80);
    },
  },
  {
    label: '触发异常',
    run: () => {
      ensureLoggedIn();
      const m = useStore.getState().mission;
      if (!['FLYING', 'HOVERING', 'RETURNING'].includes(m.state)) demoJumpToFlying('R-03', 0.4);
      setTimeout(triggerFault, 60);
    },
  },
  {
    label: '飞行速度切换',
    run: () => {
      const cur = useStore.getState().speedMult;
      const next = cur === 1 ? 8 : cur === 8 ? 24 : 1;
      useStore.setState({ speedMult: next });
    },
  },
  {
    // 冷启动态：首次安装，无设备、无航线、无巡检数据；连接设备 → 同步航线后逐步回到正常态
    label: '冷启动态',
    run: () => {
      ensureLoggedIn();
      api.enterCold();
      useStore.setState({
        device: null, routes: [], scenes: [], tasks: [], lastSyncAt: null, dataLoaded: true,
        selectedRouteId: null, tab: 'home', routeSub: null, resultSub: null, deviceSub: null,
        doneEntry: null, vpFull: false, landscape: false, mission: { ...initialMission },
      });
    },
  },
  {
    label: '重置',
    run: () => window.location.reload(),
  },
];
