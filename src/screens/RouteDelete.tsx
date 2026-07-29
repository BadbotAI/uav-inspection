// R-12 删除确认（底部弹层）
import { useStore } from '../store';
import { api } from '../api';
import { BottomSheet } from '../components/BottomSheet';
import { Button } from '../components/Button';
import type { Route } from '../types';

export function RouteDelete({ route, onClose }: { route: Route | null; onClose: () => void }) {
  const set = useStore(s => s.set);
  const showToast = useStore(s => s.showToast);

  const doDelete = async () => {
    if (!route) return;
    await api.deleteRoute(route.id);
    const { routes } = await api.getRoutes();
    const st = useStore.getState();
    set({
      routes,
      routeSub: null,
      selectedRouteId: st.selectedRouteId === route.id ? null : st.selectedRouteId,
    });
    onClose();
    showToast('已删除');
  };

  return (
    <BottomSheet open={!!route} onMask={onClose}>
      <div className="text-[14px] font-medium">删除「{route?.name || '未命名航线'}」？</div>
      <div className="text-[12px] leading-[1.65] mt-2" style={{ color: 'var(--txt2)' }}>
        删除后本机不再显示这条航线。遥控器上的原始记录不受影响，下次同步会重新出现。
      </div>
      <div className="flex gap-2.5 mt-4">
        <Button variant="secondary" onClick={onClose}>取消</Button>
        <Button variant="danger" onClick={doDelete}>删除</Button>
      </div>
    </BottomSheet>
  );
}
