// 3D 无人机模型：实体渲染 + 线框描边混合，转台旋转，桨叶自转
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function buildDrone(): { group: THREE.Group; props: THREE.Group[] } {
  const group = new THREE.Group();
  const props: THREE.Group[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({ color: '#2E3440', metalness: 0.55, roughness: 0.38 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#1E232C', metalness: 0.5, roughness: 0.45 });
  const accentMat = new THREE.MeshStandardMaterial({ color: '#4C6BC0', metalness: 0.4, roughness: 0.4 });
  const edgeMat = new THREE.LineBasicMaterial({ color: '#8FA9DF', transparent: true, opacity: 0.55 });

  const withEdges = (mesh: THREE.Mesh) => {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 24), edgeMat);
    mesh.add(edges);
    return mesh;
  };

  // 机身
  const body = withEdges(new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.44, 1.7), bodyMat));
  group.add(body);
  // 顶盖
  const top = withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 1.15), darkMat));
  top.position.y = 0.31;
  group.add(top);
  // 前视传感器
  const sensor = withEdges(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.2), accentMat));
  sensor.position.set(0, -0.04, 0.95);
  group.add(sensor);
  // 云台相机
  const gimbal = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), darkMat);
  gimbal.position.set(0, -0.32, 0.62);
  group.add(gimbal);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 14), accentMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, -0.32, 0.78);
  group.add(lens);

  // 四臂 + 电机 + 桨叶 + 护圈
  const armLen = 1.55;
  [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz], i) => {
    const dir = new THREE.Vector3(sx, 0, sz).normalize();
    const arm = withEdges(new THREE.Mesh(new THREE.BoxGeometry(armLen, 0.1, 0.16), bodyMat));
    arm.position.copy(dir.clone().multiplyScalar(0.55 + armLen / 2 * 0.62));
    arm.position.y = 0.06;
    arm.rotation.y = -Math.atan2(sz, sx);
    group.add(arm);

    const hub = dir.clone().multiplyScalar(1.5);
    hub.y = 0.1;

    const motor = withEdges(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.26, 14), darkMat));
    motor.position.copy(hub);
    group.add(motor);

    // 护圈
    const guard = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.02, 8, 40),
      new THREE.MeshStandardMaterial({ color: '#4C6BC0', metalness: 0.3, roughness: 0.5 }),
    );
    guard.rotation.x = Math.PI / 2;
    guard.position.copy(hub).setY(0.2);
    group.add(guard);

    // 桨叶组（自转）
    const prop = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.02, 0.11), darkMat);
    const blade2 = blade.clone();
    blade2.rotation.y = Math.PI / 2;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 10), accentMat);
    prop.add(blade, blade2, cap);
    prop.position.copy(hub).setY(0.26);
    prop.rotation.y = i * 0.7;
    group.add(prop);
    props.push(prop);
  });

  // 起落架
  [[-0.45, 0.55], [0.45, 0.55], [-0.45, -0.55], [0.45, -0.55]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), darkMat);
    leg.position.set(x, -0.45, z);
    group.add(leg);
  });

  return { group, props };
}

// mode: active = 飞行动效（悬浮+旋翼转）；idle = 停飞静止；lost = 失联（去色降透明+静止）
export type DroneMode = 'active' | 'idle' | 'lost';

export function DroneModel({ height = 148, mode = 'active' }: { height?: number; mode?: DroneMode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<DroneMode>(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(32, 2, 0.1, 50);
    cam.position.set(3.6, 2.6, 4.4);
    cam.lookAt(0, -0.1, 0);

    scene.add(new THREE.HemisphereLight('#EAF0FB', '#3A414E', 1.15));
    const key = new THREE.DirectionalLight('#FFFFFF', 1.6);
    key.position.set(4, 6, 3);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#8FA9DF', 0.8);
    rim.position.set(-5, 2, -4);
    scene.add(rim);

    const { group, props } = buildDrone();
    group.position.y = 0.15;
    scene.add(group);

    // 地面投影环
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.4, 1.44, 48),
      new THREE.MeshBasicMaterial({ color: '#4C6BC0', transparent: true, opacity: 0.25, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -0.85;
    scene.add(ring);

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    let disposed = false;
    let last = performance.now();

    const resize = () => {
      const w = wrap.clientWidth, h = wrap.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();

    const loop = (t: number) => {
      if (disposed) return;
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const m = modeRef.current;
      if (!reduced && m === 'active') {
        // 飞行动效：转台 + 悬浮 + 旋翼
        group.rotation.y += dt * 0.45;
        group.position.y = 0.15 + Math.sin(t / 900) * 0.05;
        props.forEach(p => { p.rotation.y += dt * 26; });
        ring.visible = true;
      } else if (!reduced && m === 'idle') {
        // 停飞：落地、旋翼停转，但保留缓慢展示旋转，避免画面呆板
        group.rotation.y += dt * 0.22;
        group.position.y = -0.32;
        ring.visible = false;
      } else {
        // 失联：完全静止
        group.position.y = -0.32;
        ring.visible = false;
      }
      renderer.render(scene, cam);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse(o => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(x => x.dispose());
        else mat?.dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      style={{
        width: '100%', height,
        filter: mode === 'lost' ? 'grayscale(1) opacity(.45)' : 'none',
        transition: 'filter .3s',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
