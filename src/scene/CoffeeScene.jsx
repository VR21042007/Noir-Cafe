import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Billboard, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { DRINKS, stage } from "./stage";

const { damp, clamp, lerp } = THREE.MathUtils;
const smooth = (v) => { const t = clamp(v, 0, 1); return t * t * (3 - 2 * t); };

// ---------- geometry ----------------------------------------------------------

// Cup wall as a closed profile: base, outer wall up to the lip, inner wall back down.
const CUP_PROFILE = [
  [0, 0], [0.27, 0], [0.3, 0.025], [0.29, 0.06], [0.36, 0.1], [0.45, 0.22], [0.52, 0.4],
  [0.555, 0.58], [0.57, 0.7], [0.565, 0.725], [0.545, 0.72], [0.53, 0.62], [0.5, 0.45],
  [0.43, 0.29], [0.33, 0.18], [0.2, 0.15], [0, 0.145],
];
const INNER_WALL = [[0.545, 0.72], [0.53, 0.62], [0.5, 0.45], [0.43, 0.29], [0.33, 0.18]];
const SAUCER_PROFILE = [
  [0, 0], [0.55, 0], [0.58, 0.02], [0.9, 0.06], [1.04, 0.1], [1.05, 0.12], [1.02, 0.12],
  [0.9, 0.085], [0.62, 0.05], [0.34, 0.042], [0, 0.042],
];
const GLASS_PROFILE = [
  [0, 0], [0.4, 0], [0.42, 0.02], [0.49, 1.12], [0.485, 1.14], [0.465, 1.14], [0.4, 0.1], [0, 0.09],
];
const KETTLE_PROFILE = [
  [0, 0], [0.42, 0], [0.45, 0.03], [0.46, 0.2], [0.43, 0.42], [0.34, 0.57], [0.2, 0.66], [0.16, 0.68],
  [0.17, 0.7], [0.12, 0.75], [0.03, 0.78], [0, 0.78],
];
const SPOUT = [[0.38, 0.14], [0.62, 0.2], [0.78, 0.42], [0.88, 0.66], [0.98, 0.75], [1.06, 0.73]];
const HANDLE = [[-0.4, 0.58], [-0.66, 0.66], [-0.8, 0.45], [-0.68, 0.2], [-0.42, 0.14]];
const SPOUT_TIP = SPOUT[SPOUT.length - 1];
const KETTLE_SCALE = 0.85;
const SAUCER_TOP = 0.042;
const LIQUID_Y = 0.66;

function lathe(points, segments = 96) {
  return new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), segments);
}

function tube(points, radius) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y]) => new THREE.Vector3(x, y, 0)));
  return new THREE.TubeGeometry(curve, 64, radius, 16, false);
}

function innerRadiusAt(y) {
  for (let i = 0; i < INNER_WALL.length - 1; i++) {
    const [r0, y0] = INNER_WALL[i];
    const [r1, y1] = INNER_WALL[i + 1];
    if (y <= y0 && y >= y1) return lerp(r0, r1, (y0 - y) / (y0 - y1));
  }
  return 0.33;
}

function petalGeometry() {
  const g = new THREE.CircleGeometry(1, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) * 0.62, y = p.getY(i);
    // a rose petal curls up at its edges
    p.setXYZ(i, x, y, 0.35 * x * x + 0.12 * y * y);
  }
  g.rotateX(-Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

// ---------- shaders -----------------------------------------------------------

const NOISE_GLSL = /* glsl */ `
float nHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nNoise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(nHash(i), nHash(i + vec2(1.0, 0.0)), f.x), mix(nHash(i + vec2(0.0, 1.0)), nHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float nFbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * nNoise(p); p *= 2.03; a *= 0.5; } return v; }
`;

const LATTE_GLSL = /* glsl */ `
uniform float uTime, uPour, uArt, uDust, uRipple;
uniform vec2 uImpact;
uniform vec3 uCrema, uRim, uFoam, uDustColor;
varying vec2 vLatteUv;
${NOISE_GLSL}
float lDot2(vec2 v){ return dot(v, v); }
float sdHeart(vec2 p){
  p.x = abs(p.x);
  if (p.y + p.x > 1.0) return sqrt(lDot2(p - vec2(0.25, 0.75))) - sqrt(2.0) / 4.0;
  return sqrt(min(lDot2(p - vec2(0.0, 1.0)), lDot2(p - 0.5 * max(p.x + p.y, 0.0)))) * sign(p.x - p.y);
}
vec3 latte(vec2 uv, out float foam){
  float r = length(uv);
  float ang = uTime * 0.05 + r * 1.4;
  vec2 q = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * uv;
  float n = nFbm(q * 3.2 + uTime * 0.02);
  float tiger = nFbm(vec2(atan(q.y, q.x) * 2.5, r * 10.0));

  vec3 col = mix(uCrema * 1.45, uCrema, smoothstep(0.0, 0.75, r));
  col = mix(col, uRim, smoothstep(0.6, 1.0, r));
  col *= 0.82 + 0.36 * n;
  col = mix(col, uRim, smoothstep(0.55, 0.8, tiger) * 0.4);
  float di = length(uv - uImpact);
  col *= 1.0 + uRipple * (0.16 * sin(di * 55.0 - uTime * 9.0) * exp(-di * 4.5) + 0.25 * exp(-di * 30.0));

  // milk lands as a disc, then the cut-through drags it into a heart
  float grow = smoothstep(0.0, 0.68, uPour);
  float cut = smoothstep(0.7, 1.0, uPour);
  float size = uArt;
  float dCircle = length(uv - vec2(0.0, 0.1)) - 0.6 * grow * size;
  float hs = 0.84 * size;
  float dHeart = sdHeart((uv - vec2(0.0, -0.5 * size)) / hs) * hs;
  float d = mix(dCircle, dHeart, cut) + (n - 0.5) * 0.05;
  d = mix(1.0, d, step(0.001, uPour));

  foam = 1.0 - smoothstep(-0.012, 0.012, d);
  float halo = (1.0 - smoothstep(0.0, 0.07, d)) * step(0.0, d);
  col = mix(col, uRim, halo * 0.55);
  vec3 foamCol = uFoam * (0.93 + 0.1 * n);
  foamCol = mix(foamCol, uCrema * 1.9, smoothstep(-0.06, 0.0, d) * 0.5);
  col = mix(col, foamCol, foam);

  float dust = step(0.9, nHash(floor(q * 42.0))) * uDust * (1.0 - smoothstep(0.6, 0.95, r));
  col = mix(col, uDustColor, dust * 0.9);
  return col;
}
`;

const STEAM_VERT = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const STEAM_FRAG = /* glsl */ `
uniform float uTime, uOpacity, uSeed;
varying vec2 vUv;
${NOISE_GLSL}
void main(){
  float x = vUv.x - 0.5;
  float y = vUv.y;
  float wob = (nFbm(vec2(y * 2.2 - uTime * 0.22, uSeed)) - 0.5) * 0.55 * y;
  float w = 0.07 + 0.2 * y;
  float k = (x - wob) / w;
  float column = exp(-k * k * 2.2);
  float wisps = nFbm(vec2(x * 3.5 + uSeed, y * 2.6 - uTime * 0.32));
  float a = column * smoothstep(0.2, 0.65, wisps) * smoothstep(0.0, 0.18, y) * (1.0 - smoothstep(0.5, 1.0, y));
  gl_FragColor = vec4(vec3(1.0, 0.98, 0.96), a * uOpacity * 0.7);
}
`;

// ---------- pieces -------------------------------------------------------------

function useLaceTexture() {
  return useMemo(() => {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d");
    // light filtered through the curtain fabric
    g.fillStyle = "#8a8a8a";
    g.fillRect(0, 0, size, size);
    g.filter = "blur(1.5px)";
    g.fillStyle = "#fff";
    // open-work rosettes of a lace curtain let the sun straight through
    const step = 64;
    for (let y = 0; y <= size; y += step) {
      for (let x = (y / step) % 2 ? step / 2 : 0; x <= size; x += step) {
        g.beginPath(); g.arc(x, y, 7, 0, Math.PI * 2); g.fill();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          g.beginPath();
          g.ellipse(x + Math.cos(a) * 15, y + Math.sin(a) * 15, 8, 4, a, 0, Math.PI * 2);
          g.fill();
        }
        g.beginPath(); g.arc(x + step / 2, y + step / 4, 3, 0, Math.PI * 2); g.fill();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);
}

function useBrandTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "600 170px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("N O I R", canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }, []);
}

function useBrandLetterTextures() {
  return useMemo(() => Array.from("NOIR", (letter) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "600 190px Georgia, serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(letter, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }), []);
}

function BrandMark({ texture, color, position, rotationY = 0, size }) {
  return (
    <mesh position={position} rotation-y={rotationY} renderOrder={2}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} color={color} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function CupBrandMark({ textures }) {
  return textures.map((texture, index) => {
    const angle = 0.82 + (index - 1.5) * 0.22;
    const radius = 0.535;
    return (
      <BrandMark
        key={index}
        texture={texture}
        color="#3d463f"
        position={[Math.sin(angle) * radius, 0.43, Math.cos(angle) * radius]}
        rotationY={angle}
        size={[0.13, 0.13]}
      />
    );
  });
}

function useLatteMaterial() {
  const uniforms = useMemo(() => ({
    uTime: { value: 0 }, uPour: { value: 0 }, uArt: { value: 1 }, uDust: { value: 0 }, uRipple: { value: 0 },
    uImpact: { value: new THREE.Vector2() },
    uDustColor: { value: new THREE.Color(DRINKS[0].dustColor) },
    uCrema: { value: new THREE.Color(DRINKS[0].crema) },
    uRim: { value: new THREE.Color(DRINKS[0].rim) },
    uFoam: { value: new THREE.Color(DRINKS[0].foam) },
  }), []);
  const material = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({ roughness: 0.3, metalness: 0 });
    m.userData.uniforms = uniforms;
    m.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec2 vLatteUv;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLatteUv = uv * 2.0 - 1.0;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", `#include <common>\n${LATTE_GLSL}`)
        .replace("#include <color_fragment>", "#include <color_fragment>\nfloat foamMask;\ndiffuseColor.rgb = latte(vLatteUv, foamMask);")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(0.22, 0.7, foamMask);");
    };
    return m;
  }, [uniforms]);
  return material;
}

function Steam({ seed, x, z, opacityRef }) {
  const material = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uOpacity: { value: 0 }, uSeed: { value: seed } }), [seed]);
  useFrame((state) => {
    const u = material.current.uniforms;
    if (!stage.reducedMotion) u.uTime.value = state.clock.elapsedTime + seed * 10;
    u.uOpacity.value = opacityRef.current;
  });
  return (
    <Billboard position={[x, SAUCER_TOP + LIQUID_Y + 0.68, z]} lockX lockZ>
      <mesh>
        <planeGeometry args={[0.6, 1.4]} />
        <shaderMaterial ref={material} uniforms={uniforms} vertexShader={STEAM_VERT} fragmentShader={STEAM_FRAG} transparent depthWrite={false} />
      </mesh>
    </Billboard>
  );
}

const PETALS = (() => {
  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  return Array.from({ length: 16 }, () => {
    const a = -Math.PI * 0.6 + (rand() - 0.5) * 2.0;
    const r = 1.3 + rand() * 1.2;
    return { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: rand() * Math.PI * 2, tilt: (rand() - 0.5) * 0.3, s: 0.8 + rand() * 0.5, c: Math.floor(rand() * 3) };
  });
})();
const PETAL_COLORS = ["#e59a6e", "#f3c6a4", "#9a2f3d"];

function Petals() {
  const ref = useRef();
  const geometry = useMemo(() => petalGeometry(), []);
  useEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const color = new THREE.Color();
    PETALS.forEach((b, i) => {
      q.setFromEuler(new THREE.Euler(b.tilt, b.ry, 0));
      m.compose(new THREE.Vector3(b.x, 0.012, b.z), q, new THREE.Vector3(0.13 * b.s, 0.13 * b.s, 0.13 * b.s));
      ref.current.setMatrixAt(i, m);
      ref.current.setColorAt(i, color.set(PETAL_COLORS[b.c]));
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[geometry, null, PETALS.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.55} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}

// Gooseneck kettle. The outer group sits exactly at the spout tip, so tilting it pours from a fixed point.
function Kettle({ kettle, tilt, brandTexture }) {
  const geo = useMemo(() => ({ body: lathe(KETTLE_PROFILE, 72), spout: tube(SPOUT, 0.032), handle: tube(HANDLE, 0.045) }), []);
  const [tx, ty] = SPOUT_TIP;
  return (
    <group ref={kettle}>
      <group ref={tilt}>
        <group position={[-tx * KETTLE_SCALE, -ty * KETTLE_SCALE, 0]} scale={KETTLE_SCALE}>
          <mesh geometry={geo.body} castShadow>
            <meshStandardMaterial color="#d99468" metalness={0.9} roughness={0.28} />
          </mesh>
          <mesh position-y={0.19} rotation-x={Math.PI / 2} castShadow>
            <torusGeometry args={[0.455, 0.012, 8, 72]} />
            <meshStandardMaterial color="#c49a56" metalness={0.88} roughness={0.3} />
          </mesh>
          <mesh geometry={geo.spout} castShadow>
            <meshStandardMaterial color="#d99468" metalness={0.9} roughness={0.28} />
          </mesh>
          <mesh geometry={geo.handle} castShadow>
            <meshStandardMaterial color="#6b4630" roughness={0.5} />
          </mesh>
          <mesh position-y={0.81}>
            <sphereGeometry args={[0.06, 20, 16]} />
            <meshStandardMaterial color="#6b4630" roughness={0.5} />
          </mesh>
          <mesh position={[-0.338, 0.56, -0.025]}>
            <sphereGeometry args={[0.022, 12, 10]} />
            <meshStandardMaterial color="#c49a56" metalness={0.88} roughness={0.3} />
          </mesh>
          <mesh position={[-0.444, 0.16, -0.025]}>
            <sphereGeometry args={[0.022, 12, 10]} />
            <meshStandardMaterial color="#c49a56" metalness={0.88} roughness={0.3} />
          </mesh>
          <BrandMark texture={brandTexture} color="#523a2e" position={[0, 0.36, -0.455]} rotationY={Math.PI} size={[0.27, 0.07]} />
        </group>
      </group>
    </group>
  );
}

function Candle({ position }) {
  const flame = useRef(), glow = useRef();
  useFrame((state) => {
    if (stage.reducedMotion) return;
    const t = state.clock.elapsedTime;
    const flicker = Math.sin(t * 9.1) * 0.5 + Math.sin(t * 13.7 + 1.3) * 0.3 + Math.sin(t * 23.3) * 0.2;
    flame.current.scale.set(0.034, 0.085 + flicker * 0.01, 0.034);
    glow.current.intensity = 1.6 + flicker * 0.35;
  });
  return (
    <group position={position}>
      <mesh position-y={0.17} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.13, 0.34, 40]} />
        <meshPhysicalMaterial color="#fbf3ea" roughness={0.6} transmission={0.2} thickness={0.3} />
      </mesh>
      <mesh position-y={0.37}>
        <cylinderGeometry args={[0.006, 0.006, 0.05, 6]} />
        <meshBasicMaterial color="#3d2a20" />
      </mesh>
      <mesh ref={flame} position-y={0.45} scale={[0.034, 0.085, 0.034]}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#ffd08a" toneMapped={false} />
      </mesh>
      <pointLight ref={glow} position-y={0.5} color="#ffb46b" intensity={1.6} distance={3} decay={2} />
    </group>
  );
}

const ICE = [[-0.14, 0.8, 0.05, 0.3], [0.13, 0.84, -0.1, 1.1], [0.03, 0.78, 0.17, 2.2]];

// ---------- the scene ----------------------------------------------------------

const KEYS = [
  { az: 0.82, el: 0.3, dist: 8.2, ty: 0.85 }, // hero: three-quarter view, room above for the kettle
  { az: 0.0, el: 1.5, dist: 5.2, ty: 0.68 }, // the pour: straight down into the cup
  { az: -0.6, el: 0.32, dist: 6.6, ty: 0.5 }, // menu
];

function anchorFrame(el, W, H) {
  if (!el) return { x: W * 0.5, y: H * 0.5, h: H };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: Math.max(r.height, 1) };
}

// scratch vector reused every frame
const LOOK = new THREE.Vector3();

function Rig({ cupRef, glassRef, liquidRef, streamRef, streamMatRef, kettleRef, tiltRef, lightRef, steamOpacityRef }) {
  const { camera, size } = useThree();
  const pose = useRef({ ...KEYS[0] });
  const targets = useMemo(() => DRINKS.map((d) => ({ crema: new THREE.Color(d.crema), rim: new THREE.Color(d.rim), foam: new THREE.Color(d.foam), dust: new THREE.Color(d.dustColor) })), []);
  const scales = useRef({ cup: 1, glass: 0 });
  const flow = useRef(1);
  const coffee = useMemo(() => new THREE.Color("#5a2c12"), []);
  const milk = useMemo(() => new THREE.Color("#f6ece0"), []);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const instant = stage.reducedMotion;
    const t = state.clock.elapsedTime;
    const liquidUniforms = liquidRef.current.material.userData.uniforms;
    const s = clamp(stage.s, 0, 2);
    const i = Math.min(Math.floor(s), 1);
    const f = smooth(s - i);
    const a = KEYS[i], b = KEYS[i + 1];
    const W = size.width, H = size.height;

    // camera pose, eased
    const target = {
      az: lerp(a.az, b.az, f) + stage.pointer.x * 0.08,
      el: lerp(a.el, b.el, f) - stage.pointer.y * 0.04,
      dist: lerp(a.dist, b.dist, f),
      ty: lerp(a.ty, b.ty, f),
    };
    for (const k in target) pose.current[k] = instant ? target[k] : damp(pose.current[k], target[k], 5, dt);

    // where on screen the cup should sit: follow the DOM anchor of each stage
    const names = ["hero", "story", "menu"];
    // Anchor measurements are refreshed by the scroll handler. Reading DOM layout
    // here would force a synchronous layout on every WebGL frame.
    const fa = stage.anchorFrames[names[i]] || anchorFrame(stage.anchors[names[i]], W, H);
    const fb = stage.anchorFrames[names[i + 1]] || anchorFrame(stage.anchors[names[i + 1]], W, H);
    const ax = lerp(fa.x, fb.x, f), ay = lerp(fa.y, fb.y, f), ah = lerp(fa.h, fb.h, f);
    const zoom = clamp((H * 0.78) / ah, 0.9, 2.2);

    const { az, el, dist, ty } = pose.current;
    const d = dist * zoom;
    camera.position.set(Math.cos(el) * Math.sin(az) * d, ty + Math.sin(el) * d, Math.cos(el) * Math.cos(az) * d);
    LOOK.set(0, ty, 0);
    camera.lookAt(LOOK);
    camera.setViewOffset(W, H, W / 2 - ax, H / 2 - ay, W, H);

    // the drink on the table
    const drink = DRINKS[stage.drink];
    const k = instant ? 1 : 1 - Math.exp(-6 * dt);
    const goal = targets[stage.drink];
    liquidUniforms.uCrema.value.lerp(goal.crema, k);
    liquidUniforms.uRim.value.lerp(goal.rim, k);
    liquidUniforms.uFoam.value.lerp(goal.foam, k);
    liquidUniforms.uDustColor.value.lerp(goal.dust, k);
    liquidUniforms.uDust.value = lerp(liquidUniforms.uDust.value, drink.dust, k);
    liquidUniforms.uArt.value = lerp(liquidUniforms.uArt.value, drink.art || 1, k);
    liquidUniforms.uTime.value = instant ? 0 : t;

    const isCup = drink.vessel === "cup";
    scales.current.cup = instant ? +isCup : damp(scales.current.cup, +isCup, 8, dt);
    scales.current.glass = instant ? +!isCup : damp(scales.current.glass, +!isCup, 8, dt);
    const cs = Math.max(scales.current.cup, 0.0001);
    const gs = Math.max(scales.current.glass, 0.0001);
    cupRef.current.scale.setScalar(cs);
    cupRef.current.visible = cs > 0.01;
    cupRef.current.rotation.y = (1 - cs) * -1.2;
    glassRef.current.scale.setScalar(gs);
    glassRef.current.visible = gs > 0.01;
    glassRef.current.rotation.y = (1 - gs) * 1.2 + (instant ? 0 : t * 0.05);

    // the pour: the milk only lands in the second half of the story
    const pour = smooth((stage.pour - 0.3) / 0.7);
    liquidUniforms.uPour.value = pour;
    liquidRef.current.scale.setScalar(innerRadiusAt(LIQUID_Y));
    // the kettle: pours coffee on the hero, pours the heart during the story, then leaves before the menu
    const inStory = s > 0.6 && s < 1.4;
    const wantFlow = s < 0.45 ? 1 : inStory && stage.pour > 0.3 && stage.pour < 0.97 ? 1 : 0;
    flow.current = instant ? wantFlow : damp(flow.current, wantFlow, 6, dt);
    const fl = flow.current;
    const toStory = smooth(s / 0.9);
    const leave = smooth((s - 1.15) / 0.45);
    const cutZ = pour < 0.7 ? -0.05 : lerp(-0.05, 0.42, smooth((pour - 0.7) / 0.3));
    const R = innerRadiusAt(LIQUID_Y);
    const px = lerp(0.12, 0, toStory);
    const pz = lerp(0.0, cutZ * R, toStory);
    const surface = SAUCER_TOP + LIQUID_Y;
    const py = surface + lerp(0.8, 1.05, toStory) + (1 - fl) * 0.3 + leave * 5;
    kettleRef.current.position.set(px, py, pz);
    kettleRef.current.rotation.y = lerp(KEYS[0].az + Math.PI, Math.PI * 1.5, toStory);
    kettleRef.current.visible = leave < 0.99;
    tiltRef.current.rotation.z = -lerp(0.12, 0.58, fl) - (instant ? 0 : Math.sin(t * 1.3) * 0.015 * fl);

    const len = py - surface;
    streamRef.current.position.set(px, surface + len / 2, pz);
    streamRef.current.scale.set(fl, len, fl);
    streamRef.current.visible = fl > 0.03 && leave < 0.5 && cs > 0.5;
    streamMatRef.current.color.copy(coffee).lerp(milk, smooth((s - 0.3) / 0.4));
    liquidUniforms.uImpact.value.set(px / R, -pz / R);
    liquidUniforms.uRipple.value = streamRef.current.visible ? fl : 0;

    // steam reads as a column from the side, but would fog the top-down view
    const side = 1 - smooth(1 - Math.abs(s - 1) * 2.2);
    steamOpacityRef.current = (isCup ? cs : 0) * side;

    // sun through the lace curtain drifts as the curtain moves
    lightRef.current.position.set(-2.2 + stage.pointer.x * 0.35 + (instant ? 0 : Math.sin(t * 0.12) * 0.25), 4.6, 3.6 + stage.pointer.y * 0.25);
  });
  return null;
}

function Scene() {
  const lace = useLaceTexture();
  const brandTexture = useBrandTexture();
  const brandLetterTextures = useBrandLetterTextures();
  const latte = useLatteMaterial();
  const cup = useRef(), glass = useRef(), liquid = useRef(), stream = useRef(), streamMat = useRef(), light = useRef();
  const kettle = useRef(), tilt = useRef();
  const steamOpacity = useRef(1);
  const lightTarget = useMemo(() => new THREE.Object3D(), []);
  const geo = useMemo(() => ({
    cup: lathe(CUP_PROFILE), saucer: lathe(SAUCER_PROFILE), glass: lathe(GLASS_PROFILE),
  }), []);

  return (
    <>
      <color attach="background" args={["#aaa69b"]} />
      <fog attach="fog" args={["#aaa69b", 8, 18]} />

      <hemisphereLight args={["#f3e8d6", "#747168", 1.05]} />
      <primitive object={lightTarget} position={[0, 0.35, 0]} />
      <spotLight
        ref={light}
        target={lightTarget}
        map={lace}
        intensity={170}
        angle={0.5}
        penumbra={0.45}
        decay={2}
        color="#ffd9ad"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      {/* warm back light, late afternoon */}
      <directionalLight position={[1.5, 2.5, -4]} intensity={0.9} color="#ffe2c4" />

      <Environment resolution={256} environmentIntensity={0.7}>
        <mesh scale={50}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color="#9d998f" side={THREE.BackSide} />
        </mesh>
        {[-1.2, -0.6, 0, 0.6, 1.2].map((y) => (
          <Lightformer key={y} form="rect" intensity={1.4} color="#fff1e4" position={[-5, 2 + y, 1]} rotation-y={Math.PI / 2} scale={[4, 0.32, 1]} />
        ))}
        <Lightformer form="rect" intensity={0.8} color="#fff0dc" position={[3, 3, -5]} scale={[6, 4, 1]} />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#aaa69a" roughness={0.92} />
      </mesh>

      <Petals />
      <Candle position={[-1.6, 0, -0.35]} />

      <group ref={cup}>
        <mesh geometry={geo.saucer} castShadow receiveShadow>
          <meshPhysicalMaterial color="#fbf8f5" roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} />
        </mesh>
        <mesh position-y={0.12} rotation-x={-Math.PI / 2}>
          <torusGeometry args={[1.035, 0.012, 10, 128]} />
          <meshStandardMaterial color="#d9ab62" metalness={1} roughness={0.28} />
        </mesh>
        <group position-y={SAUCER_TOP}>
          <mesh geometry={geo.cup} castShadow receiveShadow>
            <meshPhysicalMaterial color="#fbf8f5" roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} />
          </mesh>
          <CupBrandMark textures={brandLetterTextures} />
          <mesh position={[0.6, 0.43, 0]} rotation-z={-Math.PI * 0.62} scale={[1, 1.15, 1]} castShadow>
            <torusGeometry args={[0.16, 0.045, 20, 48, Math.PI * 1.24]} />
            <meshPhysicalMaterial color="#fbf8f5" roughness={0.22} clearcoat={1} clearcoatRoughness={0.08} />
          </mesh>
          <mesh position-y={0.724} rotation-x={-Math.PI / 2}>
            <torusGeometry args={[0.556, 0.011, 10, 128]} />
            <meshStandardMaterial color="#d9ab62" metalness={1} roughness={0.28} />
          </mesh>
          <mesh ref={liquid} position-y={LIQUID_Y} rotation-x={-Math.PI / 2} material={latte} receiveShadow>
            <circleGeometry args={[1, 96]} />
          </mesh>
        </group>
        {[[-0.08, 0.02, 0.2], [0.07, -0.06, 0.55], [0.0, 0.08, 0.9]].map(([x, z, seed]) => (
          <Steam key={seed} x={x} z={z} seed={seed} opacityRef={steamOpacity} />
        ))}
      </group>

      <Kettle kettle={kettle} tilt={tilt} brandTexture={brandTexture} />
      {/* the pour: a unit-height column, stretched every frame from spout to cup */}
      <mesh ref={stream}>
        <cylinderGeometry args={[0.02, 0.026, 1, 16, 1, true]} />
        <meshStandardMaterial ref={streamMat} color="#5a2c12" roughness={0.15} />
      </mesh>

      <group ref={glass} visible={false}>
        <mesh geometry={geo.glass} castShadow>
          <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.12} roughness={0.04} ior={1.5} />
        </mesh>
        <mesh position-y={0.43}>
          <cylinderGeometry args={[0.45, 0.405, 0.66, 64]} />
          <meshPhysicalMaterial color="#4a2109" roughness={0.12} clearcoat={1} emissive="#3a1404" emissiveIntensity={0.25} />
        </mesh>
        {ICE.map(([x, y, z, r]) => (
          <RoundedBox key={r} args={[0.25, 0.25, 0.25]} radius={0.04} position={[x, y, z]} rotation={[r, r * 0.7, r * 0.3]}>
            <meshPhysicalMaterial color="#ffffff" transmission={1} thickness={0.25} roughness={0.12} ior={1.31} />
          </RoundedBox>
        ))}
      </group>

      <Rig cupRef={cup} glassRef={glass} liquidRef={liquid} streamRef={stream} streamMatRef={streamMat} kettleRef={kettle} tiltRef={tilt} lightRef={light} steamOpacityRef={steamOpacity} />
    </>
  );
}

export default function CoffeeScene({ active }) {
  return (
    <Canvas
      className="scene-canvas"
      frameloop={active ? "always" : "never"}
      shadows="percentage"
      dpr={[1, 1.25]}
      camera={{ fov: 30, near: 0.1, far: 60, position: [3, 2.2, 3.4] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      aria-hidden="true"
    >
      <Scene />
    </Canvas>
  );
}
