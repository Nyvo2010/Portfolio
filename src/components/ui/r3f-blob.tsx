import * as THREE from "three";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";

// phones get a fraction of the mesh density and render scale — the blob
// is a softly lit chrome ball, so it looks identical while costing far
// less fill rate + vertex-shader noise per frame (the smooth-scroll ask)
const IS_MOBILE =
  typeof window !== "undefined" &&
  window.matchMedia("(max-width: 767px)").matches;

// Simplex noise with unique names (never collides with three chunks)
const NOISE_GLSL = /* glsl */ `
vec3 blobMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 blobMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 blobPermute(vec4 x) { return blobMod289(((x * 34.0) + 1.0) * x); }
vec4 blobTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float blobSnoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = blobMod289(i);
  vec4 p = blobPermute(blobPermute(blobPermute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = blobTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

uniform float u_time;
uniform float u_intensity;

float blobField(vec3 p) {
  float n = blobSnoise(p * 1.1 + u_time * 0.35);
  n += 0.5 * blobSnoise(p * 2.4 + u_time * 0.5);
  return n * u_intensity;
}
`;

export function Blob({
  tone = "chrome",
  start = true,
}: {
  tone?: "chrome" | "ghost";
  start?: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  // hover intensity goal only — ref avoids a React re-render per pointermove.
  // goal logic unchanged: 0.55 when hovered, 0.32 otherwise.
  const hoveredRef = useRef(false);
  const targetPosition = useMemo(() => new THREE.Vector3(), []);
  // entrance progress 0 → 1 + reduced-motion opt-out
  const introT = useRef(0);
  // exit progress 0 → 1, driven by the contact section's scroll position
  const outT = useRef(0);
  const outSmooth = useRef(0);
  const reduceMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  const uniforms = useMemo(
    () => ({ u_time: { value: 0 }, u_intensity: { value: 0.32 } }),
    []
  );

  // the canvas never takes pointer events (page stays clickable) —
  // hover + click are derived from the blob's literal 2D circle instead,
  // never the square div around it
  const pointer = useRef({ x: 0, y: 0 });
  const clickPulse = useRef(0);
  const spinKick = useRef(0);
  // true while the tab is hidden — useFrame early-outs, skipping all work
  const hiddenRef = useRef(
    typeof document !== "undefined" && document.hidden
  );
  const { camera, gl } = useThree();
  const tmpV = useMemo(() => new THREE.Vector3(), []);

  /** simple 2D circle around the blob's on-screen area */
  const blobHit = useCallback(
    (clientX: number, clientY: number) => {
      const mesh = meshRef.current;
      if (!mesh || !mesh.visible) return false;
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      const persp = camera as THREE.PerspectiveCamera;
      const center = mesh.getWorldPosition(tmpV);
      const dist = persp.position.distanceTo(center);
      if (dist <= 0) return false;
      const pxPerUnit =
        rect.height /
        (2 * Math.tan(THREE.MathUtils.degToRad(persp.fov / 2)) * dist);
      const p = center.project(persp);
      const cx = rect.left + (p.x * 0.5 + 0.5) * rect.width;
      const cy = rect.top + (-p.y * 0.5 + 0.5) * rect.height;
      const r = Math.abs(mesh.scale.x) * 1.5 * pxPerUnit;
      return Math.hypot(clientX - cx, clientY - cy) < r;
    },
    [camera, gl, tmpV]
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      hoveredRef.current = blobHit(e.clientX, e.clientY);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
    };
  }, [blobHit]);

  // exit driver: 0 while contact is below the viewport, 1 once arrived
  // rAF-throttled: scroll/resize only schedule one measure per frame,
  // so repeated events never cause back-to-back getBoundingClientRect reads.
  // math unchanged: clamp((vh - top) / (vh * 0.7), 0, 1)
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const contact = document.querySelector("#contact");
      if (!contact) {
        outT.current = 0;
        return;
      }
      const top = contact.getBoundingClientRect().top;
      const vh = window.innerHeight;
      outT.current = THREE.MathUtils.clamp((vh - top) / (vh * 0.7), 0, 1);
    };
    const schedule = () => {
      if (raf) return;
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  // track tab visibility so useFrame can skip all work while hidden
  useEffect(() => {
    const onVis = () => {
      hiddenRef.current = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // a tap inside the circle gives a small spike — taps elsewhere do nothing
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (blobHit(e.clientX, e.clientY)) {
        clickPulse.current = 1;
        spinKick.current = 1;
      }
    };
    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [blobHit]);

  // real PBR chrome — ghost is the same chrome inverted:
  // white base in the same dark room, so it keeps deep shadows
  const ghost = tone === "ghost";
  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: ghost ? "#ffffff" : "#f2f2f2",
      metalness: 1.0,
      roughness: ghost ? 0.15 : 0.1,
      envMapIntensity: ghost ? 1.3 : 1.5,
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.u_time = uniforms.u_time;
      shader.uniforms.u_intensity = uniforms.u_intensity;
      shader.vertexShader = (
        NOISE_GLSL + shader.vertexShader
      )
        .replace(
          "#include <beginnormal_vertex>",
          `#include <beginnormal_vertex>
          {
            float e = 0.06;
            vec3 t1 = normalize(abs(normal.y) > 0.99 ? cross(normal, vec3(1.0, 0.0, 0.0)) : cross(normal, vec3(0.0, 1.0, 0.0)));
            vec3 t2 = normalize(cross(normal, t1));
            float h0 = blobField(position);
            float hx = blobField(position + t1 * e);
            float hy = blobField(position + t2 * e);
            objectNormal = normalize(objectNormal - (t1 * (hx - h0) + t2 * (hy - h0)) * 22.0);
          }`
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed += normal * blobField(position) * 0.5;`
        );
    };
    mat.customProgramCacheKey = () => `nyvo-blob-${tone}`;
    return mat;
  }, [uniforms, ghost, tone]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    // pause all work while the tab is hidden — no uniforms/rotation updates
    if (hiddenRef.current) return;

    // entrance (gated on the loader): grow from nothing with an overshoot,
    // one full extra spin, and a brief chrome surge — then settle
    if (!start) {
      introT.current = 0;
    } else if (introT.current < 1 && !reduceMotion.current) {
      introT.current = Math.min(1, introT.current + delta / 2);
    } else {
      introT.current = 1;
    }
    const t = introT.current;
    const c1 = 1.70158;
    const c3 = c1 + 1;
    const easeOutBack = (x: number) =>
      1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    // exit is the entrance in reverse: swell slightly, then collapse
    const easeInBack = (x: number) => c3 * Math.pow(x, 3) - c1 * Math.pow(x, 2);
    const introScale = t >= 1 ? 1 : Math.max(0.0001, easeOutBack(t));

    // smoothed exit progress so the shrink feels fluid, not scroll-steppy
    outSmooth.current = THREE.MathUtils.lerp(
      outSmooth.current,
      outT.current,
      1 - Math.exp(-delta * 5)
    );
    const o = THREE.MathUtils.clamp(outSmooth.current, 0, 1);
    const outScale = o >= 1 ? 0.0001 : Math.max(0.0001, 1 - easeInBack(o));
    mesh.visible = o < 1;
    // fully exited → mesh invisible: skip all uniform/rotation/position
    // work below. Smoothing state above still runs each frame so
    // scrolling back up re-enters with identical easing.
    if (!mesh.visible) return;

    uniforms.u_time.value = state.clock.getElapsedTime();

    const goal = hoveredRef.current ? 0.55 : 0.32;
    const current = uniforms.u_intensity.value as number;
    // click spike — small and snappy, nothing extreme
    clickPulse.current *= Math.exp(-delta * 3.0);
    spinKick.current *= Math.exp(-delta * 2.5);
    const pulse = clickPulse.current;
    uniforms.u_intensity.value =
      (THREE.MathUtils.lerp(current, goal, 1 - Math.exp(-delta * 6)) +
        pulse * 0.35 +
        (1 - t) * 0.25) *
      (1 - o);
    mesh.scale.setScalar(introScale * outScale * (1 + pulse * 0.08));

    // mouse-follow: eased toward the global cursor
    targetPosition.set(pointer.current.x * 0.9, pointer.current.y * 0.6, 0);
    mesh.position.lerp(targetPosition, 0.06);

    // idle drift + one fast celebratory spin while entering,
    // unwound in reverse while exiting
    mesh.rotation.y +=
      delta * (0.1 + (1 - t) * 4.5 + spinKick.current * 4) -
      delta * o * 4.5;
    mesh.rotation.x +=
      delta * (0.03 + (1 - t) * 1.2 + spinKick.current * 1) -
      delta * o * 1.2;
  });

  return (      <mesh ref={meshRef} material={material}>
        <icosahedronGeometry args={[1.45, IS_MOBILE ? 10 : 32]} />
      </mesh>
  );
}

export default function Home({
  tone = "chrome",
  start = true,
}: {
  tone?: "chrome" | "ghost";
  start?: boolean;
}) {
  return (
    <Canvas
      gl={{ alpha: true, antialias: true }}
      camera={{ position: [0, 0, 11], fov: 45 }}
      dpr={[1, IS_MOBILE ? 1 : 1.5]}
      style={{ background: "transparent" }}
    >
      <Blob tone={tone} start={start} />
      {/* dark studio room + strip lights = crisp chrome reflections */}
      <Environment resolution={256} frames={1}>
        <color attach="background" args={["#060606"]} />
        <Lightformer
          form="rect"
          intensity={5}
          position={[0, 5, -9]}
          scale={[10, 2, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[-5, 0, -1]}
          rotation-y={Math.PI / 2}
          scale={[6, 1.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={2}
          position={[5, 0, -1]}
          rotation-y={-Math.PI / 2}
          scale={[6, 1.5, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1}
          position={[0, -4, 2]}
          rotation-x={Math.PI / 2}
          scale={[8, 2, 1]}
        />
      </Environment>
    </Canvas>
  );
}
