// 手机外框 + Tab + 页面插槽 + 执行态覆盖层
import { useEffect } from 'react';
import { useStore } from './store';
import { api } from './api';
import { PhoneFrame } from './components/PhoneFrame';
import { TabBar } from './components/TabBar';
import { TaskRibbon } from './components/TaskRibbon';
import { Toast } from './components/Toast';
import { DemoConsole } from './components/DemoConsole';
import { Dialog } from './components/BottomSheet';
import { viewResult, dismissDoneEntry } from './sim/flight';

import { Login } from './screens/Login';
import { Home } from './screens/Home';
import { RouteList } from './screens/RouteList';
import { RouteDetail } from './screens/RouteDetail';
import { RouteReceive } from './screens/RouteReceive';
import { RouteEdit } from './screens/RouteEdit';
import { Preflight } from './screens/Preflight';
import { Countdown } from './screens/Countdown';
import { Execute } from './screens/Execute';
import { Processing } from './screens/Processing';
import { Fault } from './screens/Fault';
import { TaskList } from './screens/TaskList';
import { ResultDetail } from './screens/ResultDetail';
import { Device } from './screens/Device';
import { Logs } from './screens/Logs';
import { Settings } from './screens/Settings';

function TabContent() {
  const tab = useStore(s => s.tab);
  const routeSub = useStore(s => s.routeSub);
  const resultSub = useStore(s => s.resultSub);
  const deviceSub = useStore(s => s.deviceSub);
  const tasks = useStore(s => s.tasks);

  if (tab === 'home') return <Home />;

  if (tab === 'routes') {
    if (!routeSub) return <RouteList />;
    if (routeSub.view === 'detail') return <RouteDetail routeId={routeSub.id} />;
    if (routeSub.view === 'receive') return <RouteReceive />;
    return <RouteEdit routeId={routeSub.id} />;
  }

  if (tab === 'results') {
    if (!resultSub) return <TaskList />;
    const task = tasks.find(t => t.id === resultSub.taskId);
    if (!task) return <TaskList />;
    return <ResultDetail task={task} view={resultSub.view} />;
  }

  if (tab === 'settings') return <Settings />;

  // device
  if (deviceSub === 'logs') return <Logs />;
  return <Device />;
}

function ExecOverlay() {
  const mission = useStore(s => s.mission);
  if (mission.state === 'IDLE' || mission.minimized) return null;
  switch (mission.state) {
    case 'PREFLIGHT':
    case 'PREFLIGHT_FAIL':
      return <Preflight />;
    case 'COUNTDOWN':
      return <Countdown />;
    case 'FLYING':
    case 'HOVERING':
    case 'RETURNING':
    case 'LANDED':
      return <Execute />;
    case 'PROCESSING':
    case 'DONE':
    case 'PROCESS_FAIL':
      return <Processing />;
    case 'FAULT':
      return <Fault />;
    default:
      return null;
  }
}

export default function App() {
  const loggedIn = useStore(s => s.loggedIn);
  const doneEntry = useStore(s => s.doneEntry);
  const set = useStore(s => s.set);
  const handleBack = useStore(s => s.handleBack);

  // 启动预取（经 api 层，mock 带延迟）；正式登录时由 sim/session 再拉取一次最新数据
  useEffect(() => {
    void api.getDevice().then(d => set({ device: d }));
    void api.getScenes().then(scenes => set({ scenes }));
    void api.getRoutes().then(({ routes, lastSyncAt }) => set({ routes, lastSyncAt, dataLoaded: true }));
    void api.getTasks().then(tasks => set({ tasks }));
  }, [set]);

  // Esc = Android 物理返回键（约束 C7：永不下发飞行指令）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleBack(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleBack]);

  return (
    <div className="min-h-full flex items-center justify-center gap-5 py-6">
      <PhoneFrame>
        {!loggedIn ? (
          <Login />
        ) : (
          <>
            <TaskRibbon />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <TabContent />
            </div>
            <TabBar />
          </>
        )}
        <ExecOverlay />
        <Toast />

        {/* 任务进终态后弹一次的成果入口（最小化时完成） */}
        <Dialog
          open={!!doneEntry}
          title="数据处理完成"
          body="本次巡检结果已生成。"
          actions={[
            { label: '稍后', onClick: dismissDoneEntry },
            { label: '查看结果', tone: 'primary', onClick: () => doneEntry && viewResult(doneEntry) },
          ]}
        />
      </PhoneFrame>
      <DemoConsole />
    </div>
  );
}
