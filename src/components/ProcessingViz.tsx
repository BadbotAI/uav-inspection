// 数据处理可视化：3D 渲染 —— 无人机悬停回传数据至手机，含 3D 进度条
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildDrone } from './DroneModel';

export function ProcessingViz({ height = 170 }: { height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(34, 2, 0.1, 60);
    cam.position.set(0, 1.3, 8.2);
    cam.lookAt(0, 0.1, 0);

    scene.add(new THREE.HemisphereLight('#EAF0FB', '#3A414E', 1.1));
    const key = new THREE.DirectionalLight('#FFFFFF', 1.5);
    key.position.set(4, 6, 4);
    scene.add(key);
    const rim = new THREE.DirectionalLight('#8FA9DF', 0.7);
    rim.position.set(-5, 2, -3);
    scene.add(rim);

    // 无人机（左，悬停）
    const { group: drone, props } = buildDrone();
    drone.scale.setScalar(0.62);
    drone.position.set(-2.5, 0.55, 0);
    drone.rotation.y = 0.7;
    scene.add(drone);

    // 手机（右）：圆角机身 + 柔光屏幕
    const roundedRect = (w: number, h: number, r: number) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -h / 2);
      s.lineTo(w / 2 - r, -h / 2);
      s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
      s.lineTo(w / 2, h / 2 - r);
      s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
      s.lineTo(-w / 2 + r, h / 2);
      s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
      s.lineTo(-w / 2, -h / 2 + r);
      s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
      return s;
    };
    const phone = new THREE.Group();
    const phoneBody = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roundedRect(0.95, 1.95, 0.16), {
        depth: 0.07, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3,
      }),
      new THREE.MeshStandardMaterial({ color: '#2E3440', metalness: 0.55, roughness: 0.35 }),
    );
    phone.add(phoneBody);
    const screen = new THREE.Mesh(
      new THREE.ShapeGeometry(roundedRect(0.82, 1.8, 0.12)),
      new THREE.MeshStandardMaterial({
        color: '#131A28', emissive: '#2B3D66', emissiveIntensity: 0.8, roughness: 0.25,
      }),
    );
    screen.position.z = 0.115;
    phone.add(screen);
    const camDot = new THREE.Mesh(
      new THREE.CircleGeometry(0.035, 12),
      new THREE.MeshBasicMaterial({ color: '#0B0E14' }),
    );
    camDot.position.set(0, 0.8, 0.12);
    phone.add(camDot);
    phone.position.set(2.55, 0.35, 0);
    phone.rotation.y = -0.5;
    scene.add(phone);
    const screenMat = screen.material as THREE.MeshStandardMaterial;

    // 数据流：沿贝塞尔曲线的发光数据包
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-1.9, 0.45, 0.2),
      new THREE.Vector3(0.2, 1.5, 0.5),
      new THREE.Vector3(2.1, 0.5, 0.15),
    );
    // 曲线虚线
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    const curveLine = new THREE.Line(curveGeo, new THREE.LineDashedMaterial({
      color: '#4C6BC0', dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.4,
    }));
    curveLine.computeLineDistances();
    scene.add(curveLine);

    const packets: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 10, 8),
        new THREE.MeshStandardMaterial({
          color: '#7A94D8', emissive: '#5B76C8', emissiveIntensity: 1.1,
          transparent: true, opacity: 0.9,
        }),
      );
      scene.add(m);
      packets.push(m);
    }


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

      if (!reduced) {
        // 无人机悬停 + 旋翼
        drone.position.y = 0.55 + Math.sin(t / 800) * 0.06;
        props.forEach(p => { p.rotation.y += dt * 24; });
        // 手机呼吸微浮
        phone.position.y = 0.35 + Math.sin(t / 1100 + 1.2) * 0.035;
        // 数据包沿曲线流动
        packets.forEach((pk, i) => {
          const raw = ((t / 1900) + i / packets.length) % 1;
          const u = raw * raw * (3 - 2 * raw);  // 缓入缓出
          curve.getPoint(u, pk.position as THREE.Vector3);
          const mat = pk.material as THREE.MeshStandardMaterial;
          const fade = Math.sin(Math.min(1, Math.max(0, raw)) * Math.PI);
          mat.opacity = 0.15 + fade * 0.8;
          pk.scale.setScalar(0.7 + fade * 0.5);
        });
        // 屏幕接收呼吸
        screenMat.emissiveIntensity = 0.65 + Math.sin(t / 700) * 0.2;
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
        borderRadius: 'var(--card-radius)',
        border: '1px solid var(--card-stroke)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
        background: [
          'radial-gradient(circle, rgba(16,24,40,.055) 1px, transparent 1px)',
          'linear-gradient(180deg, #FCFCFD 0%, #F3F5F8 100%)',
        ].join(', '),
        backgroundSize: '13px 13px, 100% 100%',
      }}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
