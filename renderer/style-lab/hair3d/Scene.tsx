// The persistent 3D world: hero in his room → the house → the neighbourhood. One camera move, no cuts, no resets.
import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EV, clamp01, sm, ease, lerp, camState, roofLift, catRise, type V3 } from "./timeline";
import {
  HEAD, ROOM, CAT_AT, HOUSES, TREES, STREETS_X, STREETS_Z, ROPES, along, makeStrands, strandLen, roomSurface, heroBase, catY,
  obstacle, blanketH, ropeVisible, rnd, type Strand, type Poly,
} from "./geo";
import { makeKit, hairTextures, type Kit, type Style, type MatKind } from "./styles";

type Ctx = { s: Style; kit: Kit; t: number };
const KitCtx = React.createContext<Ctx>(null as unknown as Ctx);
const useK = () => React.useContext(KitCtx);

// ---- outline (toon): inverted hull in view space, thicker with distance so far houses keep a line -------------------
const OUTLINE_VS = `uniform float w;
void main(){
 vec4 p=vec4(position,1.0); vec3 n=normal;
 #ifdef USE_INSTANCING
  p=instanceMatrix*p; n=mat3(instanceMatrix)*n;
 #endif
 vec4 mv=modelViewMatrix*p; vec3 nv=normalize(normalMatrix*n);
 mv.xyz+=nv*(w+0.0022*(-mv.z));
 gl_Position=projectionMatrix*mv;
}`;
export const makeOutline = () => new THREE.ShaderMaterial({ uniforms: { w: { value: .007 } }, vertexShader: OUTLINE_VS, fragmentShader: "void main(){gl_FragColor=vec4(0.078,0.063,0.165,1.0);}", side: THREE.BackSide });

// ---- unit geometries ----------------------------------------------------------------------------------------------
const GEO = {
  sphere: new THREE.SphereGeometry(.5, 40, 28),
  sphereLo: new THREE.IcosahedronGeometry(.5, 1),
  capsule: new THREE.CapsuleGeometry(.5, 1, 10, 20),
  box: new THREE.BoxGeometry(1, 1, 1),
  boxBase: new THREE.BoxGeometry(1, 1, 1).translate(0, .5, 0),
  cone: new THREE.ConeGeometry(.5, 1, 20).translate(0, .5, 0),
  coneLo: new THREE.ConeGeometry(.5, 1, 6).translate(0, .5, 0),
  cyl: new THREE.CylinderGeometry(.5, .5, 1, 24),
  prism: (() => { const sh = new THREE.Shape([new THREE.Vector2(-.5, 0), new THREE.Vector2(.5, 0), new THREE.Vector2(0, 1)]); const g = new THREE.ExtrudeGeometry(sh, { depth: 1, bevelEnabled: false }); g.translate(0, 0, -.5); g.computeVertexNormals(); return g; })(),
};
type Shape = "sphere" | "capsule" | "box" | "cone" | "cyl";
function Part({ shape, size, pos, rot = [0, 0, 0], color, kind = "plain", shadow = true, outline = true }: { shape: Shape; size: V3; pos: V3; rot?: V3; color: string; kind?: MatKind; shadow?: boolean; outline?: boolean }) {
  const { s, kit } = useK();
  let g: THREE.BufferGeometry, sc: V3 = size;
  if (s.voxel) { g = GEO.box; if (shape === "capsule") sc = [size[0], size[1] * 2 + size[0], size[2]]; if (shape === "cone") g = GEO.box; }
  else if (shape === "capsule") { g = GEO.capsule; sc = [size[0], size[1], size[2]]; }
  else g = s.id === "ps1" && shape === "sphere" ? GEO.sphereLo : s.id === "ps1" && shape === "cone" ? GEO.coneLo : GEO[shape];
  const yOff = !s.voxel && shape === "cone" ? -.5 : 0;
  return <group position={pos} rotation={rot}>
    <mesh geometry={g} material={kit.mat(color, kind)} scale={sc} position={[0, yOff * sc[1], 0]} castShadow={shadow && s.shadows} receiveShadow={s.shadows} />
    {kit.outline && outline ? <mesh geometry={g} material={kit.outline} scale={sc} position={[0, yOff * sc[1], 0]} /> : null}
  </group>;
}

// ---- renderer setup, sky, light -----------------------------------------------------------------------------------
function Setup() {
  const { s } = useK(), { gl, scene } = useThree();
  useLayoutEffect(() => {
    gl.toneMapping = s.id === "clay" || s.id === "toy" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    gl.toneMappingExposure = s.exposure;
    gl.shadowMap.enabled = s.shadows; gl.shadowMap.type = s.id === "voxel" ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    const c = document.createElement("canvas"); c.width = 4; c.height = 256; const g = c.getContext("2d")!;
    const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, s.pal.sky[0]); gr.addColorStop(1, s.pal.sky[1]); g.fillStyle = gr; g.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; scene.background = tex;
    scene.fog = new THREE.Fog(s.pal.fog ?? s.pal.sky[1], s.id === "ps1" ? 45 : 90, s.id === "ps1" ? 150 : 260);
    let env: THREE.Texture | null = null;
    if (s.id === "toy" || s.id === "clay") { const pm = new THREE.PMREMGenerator(gl); env = pm.fromScene(new RoomEnvironment(), .04).texture; scene.environment = env; (scene as any).environmentIntensity = s.id === "toy" ? .9 : .35; pm.dispose(); }
    return () => { tex.dispose(); env?.dispose(); scene.environment = null; };
  }, [s]);
  return null;
}
function CameraRig({ t }: { t: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => { const c = camState(t), cam = camera as THREE.PerspectiveCamera; cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.target); cam.fov = c.fov; cam.near = .05; cam.far = 400; cam.updateProjectionMatrix(); });
  return null;
}
function Lights({ t }: { t: number }) {
  const { s } = useK(), key = useRef<THREE.DirectionalLight>(null);
  useLayoutEffect(() => {
    const l = key.current!, c = camState(t), tg = new THREE.Vector3(...c.target), d = tg.distanceTo(new THREE.Vector3(...c.pos));
    const size = Math.min(75, Math.max(3.2, d * 1.1));
    l.position.set(tg.x + 7, tg.y + 26, tg.z + 15); l.target.position.copy(tg); l.target.updateMatrixWorld();
    const sc = l.shadow.camera; sc.left = -size; sc.right = size; sc.top = size; sc.bottom = -size; sc.near = 1; sc.far = 120; sc.updateProjectionMatrix();
    l.shadow.bias = -.0004 * Math.max(1, size / 6); l.shadow.normalBias = .02 * Math.max(1, size / 8);
  });
  return <>
    <hemisphereLight args={[s.pal.ambient, "#9A8F86", s.hemi]} />
    <directionalLight ref={key} color={s.pal.sun} intensity={s.key} castShadow={s.shadows} shadow-mapSize={[2048, 2048]} />
    <directionalLight color={s.pal.sky[0]} intensity={s.fill} position={[-12, 8, -6]} />
  </>;
}

// ---- tube batch: many tapered tubes in one geometry, parallel-transport frames --------------------------------------
class Tubes {
  geo = new THREE.BufferGeometry(); n: number; seg: number; rad: number;
  pos: Float32Array; nor: Float32Array; uv: Float32Array;
  constructor(n: number, seg: number, rad: number, colors?: (i: number) => THREE.Color) {
    this.n = n; this.seg = seg; this.rad = rad;
    const rings = seg + 1, vpt = rings * (rad + 1), V = n * vpt;
    this.pos = new Float32Array(V * 3); this.nor = new Float32Array(V * 3); this.uv = new Float32Array(V * 2);
    const idx: number[] = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < seg; j++) for (let k = 0; k < rad; k++) {
      const a = i * vpt + j * (rad + 1) + k, b = a + rad + 1; idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    this.geo.setIndex(idx);
    this.geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("normal", new THREE.BufferAttribute(this.nor, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute("uv", new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    if (colors) { const col = new Float32Array(V * 3); for (let i = 0; i < n; i++) { const c = colors(i); for (let v = 0; v < vpt; v++) col.set([c.r, c.g, c.b], (i * vpt + v) * 3); } this.geo.setAttribute("color", new THREE.BufferAttribute(col, 3)); }
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200);
  }
  /** Fill tube i along pl from 0 to L with base radius r; offset adds a world offset (the hero's lift). */
  set(i: number, pl: Poly, L: number, r: number, off: V3, tipTaper = .65, uScale = 1) {
    const { seg, rad } = this, rings = seg + 1, base = i * rings * (rad + 1);
    const P: V3[] = []; for (let j = 0; j <= seg; j++) { const p = along(pl, L * j / seg); P.push([p[0] + off[0], p[1] + off[1], p[2] + off[2]]); }
    let N = new THREE.Vector3(1, 0, 0); const T = new THREE.Vector3(), B = new THREE.Vector3(), tmp = new THREE.Vector3();
    for (let j = 0; j <= seg; j++) {
      const a = P[Math.max(0, j - 1)], b = P[Math.min(seg, j + 1)];
      T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (T.lengthSq() < 1e-12) T.set(0, -1, 0); T.normalize();
      if (j === 0) { N.set(0, 1, 0); if (Math.abs(N.dot(T)) > .9) N.set(1, 0, 0); }
      N.sub(tmp.copy(T).multiplyScalar(N.dot(T))).normalize(); B.crossVectors(T, N);
      const u = j / seg, rr = L < 1e-3 ? 0 : j === seg ? 0 : r * (1 - tipTaper * u * u * u);
      for (let k = 0; k <= rad; k++) {
        const ang = k / rad * Math.PI * 2, cx = Math.cos(ang), sx = Math.sin(ang), v = base + j * (rad + 1) + k;
        const nx = N.x * cx + B.x * sx, ny = N.y * cx + B.y * sx, nz = N.z * cx + B.z * sx;
        this.pos[v * 3] = P[j][0] + nx * rr; this.pos[v * 3 + 1] = P[j][1] + ny * rr; this.pos[v * 3 + 2] = P[j][2] + nz * rr;
        this.nor[v * 3] = nx; this.nor[v * 3 + 1] = ny; this.nor[v * 3 + 2] = nz;
        this.uv[v * 2] = L * u * uScale; this.uv[v * 2 + 1] = k / rad;
      }
    }
  }
  commit() { for (const a of ["position", "normal", "uv"]) this.geo.getAttribute(a).needsUpdate = true; }
}
/** Voxel chain: cubes at a fixed spacing along paths, snapped to the grid. */
function useVoxChain(capacity: number) {
  return useMemo(() => new THREE.InstancedMesh(GEO.box, undefined as unknown as THREE.Material, capacity), [capacity]);
}
const M4 = new THREE.Matrix4(), Q0 = new THREE.Quaternion(), V0 = new THREE.Vector3(), S0 = new THREE.Vector3(), C0 = new THREE.Color();
const snap = (v: number, q: number) => Math.round(v / q) * q;

// ---- the hero -----------------------------------------------------------------------------------------------------
function Hero({ t }: { t: number }) {
  const { s } = useK(), p = s.pal, lift = heroBase(t);
  const shock = sm(EV.oneSec - .2, EV.shoulders + .3, t), wide = sm(EV.floor - .3, EV.floor + .3, t);
  const panic = ease(EV.tenMin - .1, EV.house, t), lookCat = sm(EV.cat - .2, EV.cat + .4, t) * (1 - sm(EV.tenMin, EV.tenMin + .6, t));
  const bob = Math.sin(t * 5.2) * .012 * (1 + panic), headYaw = .55 * lookCat + .08 * Math.sin(t * 1.3), headRoll = .05 * Math.sin(t * 2.1);
  const eyeS = 1 + .28 * wide, mouthOpen = .3 + .5 * shock + .4 * wide;
  const armUp = lerp(.18, 2.7, panic) + .12 * Math.sin(t * 9) * panic;
  const v = s.voxel;
  return <group position={[0, lift + bob, 0]}>
    {/* legs, shoes */}
    {[-1, 1].map(k => <React.Fragment key={k}>
      <Part shape="capsule" size={[.17, .34, .17]} pos={[.1 * k, .33, 0]} color={p.pants} />
      <Part shape={v ? "box" : "sphere"} size={[.17, .1, .26]} pos={[.1 * k, .05, .04]} color={p.shoe} />
    </React.Fragment>)}
    {/* hoodie torso + pocket + hood ring */}
    <Part shape="capsule" size={[.46, .36, .36]} pos={[0, .88, 0]} color={p.hoodie} />
    <Part shape="box" size={[.26, .12, .04]} pos={[0, .74, .18]} color={"#" + new THREE.Color(p.hoodie).multiplyScalar(.82).getHexString()} outline={false} />
    {/* arms on shoulder pivots */}
    {[-1, 1].map(k => <group key={k} position={[.29 * k, 1.12, 0]} rotation={[-.12 * panic, 0, k * armUp]}>
      <Part shape="capsule" size={[.13, .3, .13]} pos={[0, -.24, 0]} color={p.hoodie} />
      <Part shape="sphere" size={[.12, .12, .12]} pos={[0, -.46, 0]} color={p.skin} />
    </group>)}
    <Part shape="cyl" size={[.12, .14, .12]} pos={[0, 1.17, 0]} color={p.skin} outline={false} />
    {/* head */}
    <group position={[0, HEAD.y, 0]} rotation={[0, headYaw, headRoll]}>
      <Part shape="sphere" size={[HEAD.r * 2, HEAD.r * 2, HEAD.r * 2]} pos={[0, 0, 0]} color={p.skin} />
      {[-1, 1].map(k => <Part key={"e" + k} shape="sphere" size={[.07, .08, .07]} pos={[k * HEAD.r * .98, -.02, 0]} color={p.skin} outline={false} />)}
      {/* scalp cap: the hair grows out of it */}
      <HairCap />
      {[-1, 1].map(k => <group key={k} position={[k * .085, .03, HEAD.r * (v ? 1.0 : .86)]}>
        <Part shape="sphere" size={[.1 * eyeS, .12 * eyeS, .05]} pos={[0, 0, 0]} color="#FFFFFF" outline={false} shadow={false} />
        <Part shape="sphere" size={[.045 / Math.sqrt(eyeS), .05 / Math.sqrt(eyeS), .03]} pos={[0, -.004, .024]} color="#111111" kind="glass" outline={false} shadow={false} />
        <Part shape="box" size={[.09, .018, .02]} pos={[0, .1 + .035 * shock, -.005]} rot={[0, 0, k * (-.25 * shock)]} color={p.hair} outline={false} shadow={false} />
      </group>)}
      <Part shape="sphere" size={[.08 + .02 * wide, .03 + .07 * mouthOpen, .03]} pos={[0, -.11, HEAD.r * (v ? 1.0 : .9)]} color="#3A1420" outline={false} shadow={false} />
    </group>
  </group>;
}
function HairCap() {
  const { s, kit } = useK();
  const g = useMemo(() => s.voxel ? null : new THREE.SphereGeometry(HEAD.r + .012, 40, 20, 0, Math.PI * 2, 0, Math.PI * .56), [s]);
  useEffect(() => () => g?.dispose(), [g]);
  if (s.voxel) return <><Part shape="box" size={[.52, .14, .52]} pos={[0, .2, -.01]} color={s.pal.hair} outline={false} /><Part shape="box" size={[.52, .4, .1]} pos={[0, .02, -.23]} color={s.pal.hair} outline={false} />{[-1, 1].map(k => <Part key={k} shape="box" size={[.06, .3, .4]} pos={[k * .25, .06, -.04]} color={s.pal.hair} outline={false} />)}</>;
  return <group rotation={[-.42, 0, 0]}>
    <mesh geometry={g!} material={kit.mat(s.pal.hair)} castShadow={s.shadows} />
    {kit.outline ? <mesh geometry={g!} material={kit.outline} /> : null}
  </group>;
}

// ---- strands from the scalp --------------------------------------------------------------------------------------
function HairStrands({ t }: { t: number }) {
  const { s, kit } = useK();
  const strands = useMemo(() => makeStrands(s.strands, s.strandR), [s]);
  const base = new THREE.Color(s.pal.hair), tip = new THREE.Color(s.pal.hairTip);
  const tubes = useMemo(() => s.voxel ? null : new Tubes(strands.length, 30, s.radial, i => base.clone().lerp(tip, strands[i].tone * .6)), [s, strands]);
  const VOX = .05, cap = useMemo(() => strands.reduce((a, st) => a + Math.ceil(st.pl.len / VOX) + 2, 0), [strands]);
  const chain = useVoxChain(s.voxel ? cap : 1);
  useEffect(() => () => { tubes?.geo.dispose(); chain.dispose(); }, [tubes, chain]);
  const lift = heroBase(t);
  useLayoutEffect(() => {
    const headYaw = .55 * sm(EV.cat - .2, EV.cat + .4, t) * (1 - sm(EV.tenMin, EV.tenMin + .6, t)) + .08 * Math.sin(t * 1.3);
    if (tubes) { strands.forEach((st, i) => tubes.set(i, st.pl, strandLen(st, t), st.r, [0, lift, 0], .65, 1)); tubes.commit(); return; }
    let n = 0; const seen = new Set<string>();
    for (const st of strands) {
      const L = strandLen(st, t);
      for (let sv = 0; sv <= L; sv += VOX) {
        const q = along(st.pl, sv), x = snap(q[0], VOX), y = snap(q[1] + lift, VOX), z = snap(q[2], VOX), key = x + "," + y + "," + z;
        if (Math.abs(x) < .3 && Math.abs(z) < .3 && y - lift > 1.14 && y - lift < 1.7) continue;
        if (seen.has(key)) continue; seen.add(key);
        const g = Math.min(1, (L - sv) / VOX) * VOX;
        chain.setMatrixAt(n, M4.compose(V0.set(x, y, z), Q0.identity(), S0.set(g, g, g)));
        chain.setColorAt(n, C0.copy(base).lerp(tip, rnd(Math.abs(Math.round(x * 97 + y * 31 + z * 57))) * .7)); n++;
      }
    }
    chain.count = n; chain.instanceMatrix.needsUpdate = true; if (chain.instanceColor) chain.instanceColor.needsUpdate = true;
    void headYaw;
  });
  if (!tubes) return <primitive object={chain} material={kit.mat("#ffffff")} castShadow receiveShadow frustumCulled={false} />;
  return <>
    <mesh geometry={tubes.geo} material={kit.mat("#ffffff", "hair")} castShadow={s.shadows} receiveShadow={s.shadows} frustumCulled={false} />
    {kit.outline ? <mesh geometry={tubes.geo} material={kit.outline} frustumCulled={false} /> : null}
  </>;
}

// ---- cat ----------------------------------------------------------------------------------------------------------
function Cat({ t }: { t: number }) {
  const { s } = useK(), p = s.pal, k = catRise(t), y = catY(t) - (1 - k) * .55, show = clamp01(k * 4);
  if (show <= 0) return null;
  const tail = Math.sin(t * 6) * .5, blinkless = 1;
  return <group position={[CAT_AT[0], y, CAT_AT[1]]} rotation={[0, .45 + .15 * Math.sin(t * 1.7), 0]} scale={[1, 1, 1]}>
    <Part shape="sphere" size={[.36, .3, .44]} pos={[0, .14, -.04]} color={p.cat} />
    <Part shape="sphere" size={[.2, .18, .1]} pos={[0, .13, .16]} color={p.catBelly} outline={false} />
    <group position={[0, .36, .1]} rotation={[.1 * Math.sin(t * 3), 0, .12 * Math.sin(t * 2.3)]}>
      <Part shape="sphere" size={[.3, .26, .26]} pos={[0, 0, 0]} color={p.cat} />
      {[-1, 1].map(q => <Part key={q} shape="cone" size={[.09, .12, .09]} pos={[q * .085, .17, -.01]} rot={[0, 0, -q * .25]} color={p.cat} />)}
      {[-1, 1].map(q => <React.Fragment key={"e" + q}>
        <Part shape="sphere" size={[.075, .085 * blinkless, .04]} pos={[q * .065, .02, .115]} color="#C8F05A" outline={false} shadow={false} />
        <Part shape="sphere" size={[.025, .07, .02]} pos={[q * .065, .02, .135]} color="#111111" kind="glass" outline={false} shadow={false} />
      </React.Fragment>)}
      <Part shape="sphere" size={[.04, .03, .03]} pos={[0, -.04, .13]} color="#E86A8A" outline={false} shadow={false} />
    </group>
    <group position={[0, .1, -.26]} rotation={[-.9, tail, 0]}>
      <Part shape="capsule" size={[.06, .26, .06]} pos={[0, .16, 0]} color={p.cat} />
    </group>
  </group>;
}

// ---- our house: floor, three walls with windows, props, roof that pops ---------------------------------------------
function OurHouse({ t }: { t: number }) {
  const { s, kit } = useK(), p = s.pal, H = ROOM.half, W = ROOM.wall, T = .16;
  const k = roofLift(t), wob = Math.sin(t * 7) * .05 * sm(EV.house, EV.house + .4, t);
  const win = (pos: V3, ry: number, key: string) => <group key={key} position={pos} rotation={[0, ry, 0]}>
    <Part shape="box" size={[1.2, 1.05, T + .04]} pos={[0, 0, 0]} color="#FFFFFF" outline={false} />
    <Part shape="box" size={[1.0, .85, T + .08]} pos={[0, 0, 0]} color={p.window} kind="glass" outline={false} />
  </group>;
  const slope = Math.atan2(1.6, H + .4), slab = Math.hypot(H + .4, 1.6);
  const gable = useMemo(() => { const sh = new THREE.Shape([new THREE.Vector2(-H, 0), new THREE.Vector2(H, 0), new THREE.Vector2(0, 1.6)]); return new THREE.ExtrudeGeometry(sh, { depth: T, bevelEnabled: false }); }, []);
  return <group>
    <Part shape="box" size={[2 * H + .3, .12, 2 * H + .3]} pos={[0, -.06, 0]} color={p.floor} outline={false} />
    <Part shape="cyl" size={[2.2, .02, 2.2]} pos={[0, .012, .2]} color={p.hoodie} outline={false} />
    <Part shape="box" size={[2 * H + .3, W, T]} pos={[0, W / 2, -H]} color={p.wall} />
    <Part shape="box" size={[T, W, 2 * H + .3]} pos={[-H, W / 2, 0]} color={p.wall} />
    <Part shape="box" size={[T, W, 2 * H + .3]} pos={[H, W / 2, 0]} color={p.wall} />
    {win([-H, 1.55, -1.1], Math.PI / 2, "w1")}{win([-H, 1.55, 1.2], Math.PI / 2, "w2")}{win([H, 1.55, -1.1], Math.PI / 2, "w3")}{win([H, 1.55, 1.2], Math.PI / 2, "w4")}{win([0, 1.55, -H], 0, "w5")}
    {/* props: bed, poster, lamp */}
    <Part shape="box" size={[1.9, .45, 1.1]} pos={[-1.85, .23, -2.25]} color="#F4F4F4" />
    <Part shape="box" size={[1.9, .12, 1.12]} pos={[-1.85, .5, -2.05]} color={p.roofs[1]} outline={false} />
    <Part shape="box" size={[.8, 1.05, .03]} pos={[1.2, 1.9, -H + .1]} color={p.roofs[3]} outline={false} />
    <Part shape="box" size={[.6, .75, .04]} pos={[1.2, 1.9, -H + .12]} color={p.houses[0]} outline={false} />
    <Part shape="cyl" size={[.06, 1.4, .06]} pos={[2.3, .7, -2.2]} color="#333333" outline={false} />
    <Part shape="cone" size={[.45, .35, .45]} pos={[2.3, 1.45, -2.2]} color={p.houses[5]} />
    {/* roof */}
    <group position={[0, W + 1.1 * k, -.6 * k]} rotation={[-.32 * k + wob, 0, .08 * k]}>
      {[-1, 1].map(q => <group key={q} position={[q * (H + .4) / 2, .8, 0]} rotation={[0, 0, -q * slope]}>
        <Part shape="box" size={[slab, .16, 2 * H + .7]} pos={[0, 0, 0]} color={p.roof} shadow={false} />
      </group>)}
      <mesh geometry={gable} material={kit.mat(p.wall)} position={[0, 0, -H - T / 2]} />
      <Part shape="box" size={[.5, 1.0, .5]} pos={[1.7, 1.3, -1.2]} color="#9A5A4A" shadow={false} />
    </group>
  </group>;
}

// ---- heightfields: the room's hair and the outdoor blanket -----------------------------------------------------------
function useField(x0: number, x1: number, z0: number, z1: number, nx: number, nz: number) {
  return useMemo(() => {
    const g = new THREE.PlaneGeometry(x1 - x0, z1 - z0, nx, nz); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (z0 + z1) / 2);
    const pos = g.getAttribute("position") as THREE.BufferAttribute, uv = g.getAttribute("uv") as THREE.BufferAttribute;
    const X = new Float32Array(pos.count), Z = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) { X[i] = pos.getX(i); Z[i] = pos.getZ(i); uv.setXY(i, X[i] * .5, Z[i] * .5); }
    pos.setUsage(THREE.DynamicDrawUsage); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 200);
    return { g, X, Z, pos };
  }, [x0, x1, z0, z1, nx, nz]);
}
function RoomHair({ t }: { t: number }) {
  const { s, kit } = useK(), H = ROOM.half - .08;
  const f = useField(-H, H, -H, H + 1.4, s.id === "ps1" ? 16 : 56, s.id === "ps1" ? 20 : 66);
  const VOX = .2, cols = useMemo(() => { const out: [number, number][] = []; for (let x = -H + VOX / 2; x < H; x += VOX) for (let z = -H + VOX / 2; z < H + 1.4; z += VOX) out.push([x, z]); return out; }, []);
  const inst = useVoxChain(s.voxel ? cols.length : 1);
  useEffect(() => () => { f.g.dispose(); inst.dispose(); }, [f, inst]);
  useLayoutEffect(() => {
    if (s.voxel) {
      let n = 0;
      for (const [x, z] of cols) { const h = roomSurface(x, z, t); if (h < .005) continue; const hq = h;
        inst.setMatrixAt(n, M4.compose(V0.set(x, hq / 2, z), Q0.identity(), S0.set(VOX, hq, VOX))); inst.setColorAt(n, C0.set(s.pal.hair).lerp(new THREE.Color(s.pal.hairTip), rnd(Math.round(x * 50 + z * 77)) * .6)); n++; }
      inst.count = n; inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true; return;
    }
    for (let i = 0; i < f.X.length; i++) f.pos.setY(i, roomSurface(f.X[i], f.Z[i], t));
    f.pos.needsUpdate = true; f.g.computeVertexNormals();
  });
  if (s.voxel) return <primitive object={inst} material={kit.mat("#ffffff")} castShadow receiveShadow frustumCulled={false} />;
  return <mesh geometry={f.g} material={kit.mat(s.pal.hair, "hairMass")} castShadow={s.shadows} receiveShadow={s.shadows} frustumCulled={false} />;
}
function Blanket({ t }: { t: number }) {
  const { s, kit } = useK();
  const lo = s.id === "ps1";
  const f = useField(-58, 58, -58, 46, lo ? 58 : 150, lo ? 52 : 134);
  const obs = useMemo(() => Float32Array.from(f.X, (x, i) => obstacle(x, f.Z[i])), [f]);
  const VOX = 1, cols = useMemo(() => { const out: [number, number, number][] = []; for (let x = -57.5; x < 58; x += VOX) for (let z = -57.5; z < 46; z += VOX) out.push([x, z, obstacle(x, z)]); return out; }, []);
  const inst = useVoxChain(s.voxel ? cols.length : 1);
  useEffect(() => () => { f.g.dispose(); inst.dispose(); }, [f, inst]);
  const active = t > EV.tenMin;
  useLayoutEffect(() => {
    if (!active) return;
    if (s.voxel) {
      let n = 0;
      for (const [x, z, o] of cols) { const h = blanketH(x, z, t, o); if (h < .01) continue; const hq = h;
        inst.setMatrixAt(n, M4.compose(V0.set(x, hq / 2 - .02, z), Q0.identity(), S0.set(VOX, hq, VOX))); inst.setColorAt(n, C0.set(s.pal.hair).lerp(new THREE.Color(s.pal.hairTip), rnd(Math.round(x * 13 + z * 71)) * .6)); n++; }
      inst.count = n; inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true; return;
    }
    for (let i = 0; i < f.X.length; i++) { const h = blanketH(f.X[i], f.Z[i], t, obs[i]); f.pos.setY(i, h > 0 ? h : -.4); }
    f.pos.needsUpdate = true; f.g.computeVertexNormals();
  });
  if (!active) return null;
  if (s.voxel) return <primitive object={inst} material={kit.mat("#ffffff")} castShadow receiveShadow frustumCulled={false} />;
  return <mesh geometry={f.g} material={kit.mat(s.pal.hair, "hairMass")} castShadow={s.shadows} receiveShadow={s.shadows} frustumCulled={false} />;
}
function Ropes({ t }: { t: number }) {
  const { s, kit } = useK();
  const tubes = useMemo(() => s.voxel ? null : new Tubes(ROPES.length, s.id === "ps1" ? 40 : 120, s.id === "ps1" ? 5 : 12), [s]);
  const VOX = .4, inst = useVoxChain(s.voxel ? 2000 : 1);
  useEffect(() => () => { tubes?.geo.dispose(); inst.dispose(); }, [tubes, inst]);
  const active = t > EV.tenMin;
  useLayoutEffect(() => {
    if (!active) return;
    if (tubes) { ROPES.forEach((r, i) => tubes.set(i, r.pl, ropeVisible(r, t), r.r * (s.id === "clay" ? 1.15 : 1), [0, 0, 0], .55, 1.4)); tubes.commit(); return; }
    let n = 0; const seen = new Set<string>();
    for (const r of ROPES) { const L = ropeVisible(r, t); for (let sv = 0; sv <= L && n < 2000; sv += VOX * .7) { const q = along(r.pl, sv), x = snap(q[0], VOX), y = snap(q[1], VOX), z = snap(q[2], VOX), key = x + "," + y + "," + z; if (seen.has(key)) continue; seen.add(key);
      const g = Math.min(1, (L - sv) / (VOX * .7)) * VOX;
      inst.setMatrixAt(n, M4.compose(V0.set(x, y, z), Q0.identity(), S0.set(g, g, g))); inst.setColorAt(n, C0.set(s.pal.hair).lerp(new THREE.Color(s.pal.hairTip), rnd(Math.round(x * 19 + y * 7 + z * 53)) * .6)); n++; } }
    inst.count = n; inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  });
  if (!active) return null;
  if (!tubes) return <primitive object={inst} material={kit.mat("#ffffff")} castShadow receiveShadow frustumCulled={false} />;
  return <>
    <mesh geometry={tubes.geo} material={kit.mat(s.pal.hair, "rope")} castShadow={s.shadows} receiveShadow={s.shadows} frustumCulled={false} />
    {kit.outline ? <mesh geometry={tubes.geo} material={kit.outline} frustumCulled={false} /> : null}
  </>;
}

// ---- neighbourhood -------------------------------------------------------------------------------------------------
function Inst<T>({ items, geo, color, place, outline = true, shadow = true, kind = "plain" }: { items: T[]; geo: THREE.BufferGeometry; color: (it: T, i: number) => string; place: (it: T, m: THREE.Matrix4, i: number) => void; outline?: boolean; shadow?: boolean; kind?: MatKind }) {
  const { s, kit } = useK(), ref = useRef<THREE.InstancedMesh>(null), oref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const c = new THREE.Color(), m = new THREE.Matrix4();
    for (const mesh of [ref.current, oref.current]) { if (!mesh) continue; items.forEach((it, i) => { place(it, m, i); mesh.setMatrixAt(i, m); if (mesh === ref.current) mesh.setColorAt(i, c.set(color(it, i))); }); mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
  }, [items, s]);
  return <>
    <instancedMesh ref={ref} args={[geo, kit.mat("#ffffff", kind), items.length]} castShadow={shadow && s.shadows} receiveShadow={s.shadows} frustumCulled={false} />
    {kit.outline && outline ? <instancedMesh ref={oref} args={[geo, kit.outline, items.length]} frustumCulled={false} /> : null}
  </>;
}
function Neighbourhood() {
  const { s, kit } = useK(), p = s.pal, others = useMemo(() => HOUSES.filter(h => !h.ours), []);
  const box = (m: THREE.Matrix4, x: number, y: number, z: number, sx: number, sy: number, sz: number, ry = 0) => m.compose(V0.set(x, y, z), Q0.setFromEuler(new THREE.Euler(0, ry, 0)), S0.set(sx, sy, sz));
  const windows = useMemo(() => others.flatMap(h => [-1, 1].map(k => ({ h, k }))), [others]);
  const roofLayers = useMemo(() => s.voxel ? others.flatMap(h => [0, 1, 2].map(l => ({ h, l }))) : [], [others, s]);
  const dashes = useMemo(() => { const out: { x: number; z: number; ax: boolean }[] = []; for (const z of STREETS_Z) for (let x = -58; x < 58; x += 4) out.push({ x, z, ax: true }); for (const x of STREETS_X) for (let z = -58; z < 46; z += 4) out.push({ x, z, ax: false }); return out; }, []);
  const roads = useMemo(() => [...STREETS_Z.map(z => ({ z, ax: true, x: 0 })), ...STREETS_X.map(x => ({ x, ax: false, z: -6 }))], []);
  const lot = (h: { hue: number }, list: string[]) => list[Math.floor(h.hue * list.length) % list.length];
  return <>
    <mesh position={[0, -.04, -6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={s.shadows} material={kit.mat(p.ground, "flat")}><planeGeometry args={[420, 420]} /></mesh>
    <Inst items={roads} geo={GEO.box} kind="flat" outline={false} shadow={false} color={() => p.road} place={(r, m) => r.ax ? box(m, 0, -.02, r.z, 130, .03, 6) : box(m, r.x, -.019, r.z, 6, .03, 118)} />
    <Inst items={dashes} geo={GEO.box} kind="flat" outline={false} shadow={false} color={() => p.line} place={(d, m) => box(m, d.x, .0, d.z, d.ax ? 1.8 : .22, .02, d.ax ? .22 : 1.8)} />
    <Inst items={others} geo={GEO.boxBase} color={h => lot(h, p.houses)} place={(h, m) => box(m, h.x, 0, h.z, h.w, h.h, h.d)} />
    {s.voxel
      ? <Inst items={roofLayers} geo={GEO.boxBase} color={({ h }) => lot({ hue: (h.hue * 7) % 1 }, p.roofs)} place={({ h, l }, m) => box(m, h.x, h.h + l * h.roof / 3, h.z, h.w + .6 - l * (h.w / 3.2), h.roof / 3, h.d + .6)} />
      : <Inst items={others} geo={GEO.prism} color={h => lot({ hue: (h.hue * 7) % 1 }, p.roofs)} place={(h, m) => box(m, h.x, h.h, h.z, h.d + .7, h.roof, h.w + .6, Math.PI / 2)} />}
    <Inst items={windows} geo={GEO.box} outline={false} shadow={false} color={() => p.window} place={({ h, k }, m) => box(m, h.x + k * h.w * .25, h.h * .55, h.z + h.face * (h.d / 2 + .02), .9, .8, .06)} />
    <Inst items={others} geo={GEO.box} outline={false} shadow={false} color={h => lot({ hue: (h.hue * 3) % 1 }, p.roofs)} place={(h, m) => box(m, h.x, .6, h.z + h.face * (h.d / 2 + .03), .8, 1.2, .06)} />
    <Inst items={TREES} geo={GEO.boxBase} outline={false} color={() => p.trunk} place={(tr, m) => box(m, tr.x, 0, tr.z, .3 * tr.s, 1.4 * tr.s, .3 * tr.s)} />
    {s.voxel
      ? <Inst items={TREES} geo={GEO.boxBase} color={() => p.tree} place={(tr, m) => box(m, tr.x, 1.2 * tr.s, tr.z, 2 * tr.s, 2 * tr.s, 2 * tr.s)} />
      : <Inst items={TREES} geo={s.id === "ps1" ? GEO.coneLo : GEO.cone} color={() => p.tree} place={(tr, m) => box(m, tr.x, 1.0 * tr.s, tr.z, 2.2 * tr.s, 2.6 * tr.s, 2.2 * tr.s)} />}
  </>;
}

// ---- world --------------------------------------------------------------------------------------------------------
export function World({ s, t }: { s: Style; t: number }) {
  const kit = useMemo(() => { const k = makeKit(s); if (k.outline) { k.outline.dispose(); (k as { outline: THREE.Material | null }).outline = makeOutline(); } return k; }, [s]);
  useEffect(() => () => kit.dispose(), [kit]);
  useLayoutEffect(() => { for (const tx of hairTextures(kit, s)) tx.offset.set(0, -t * .35); });
  return <KitCtx.Provider value={{ s, kit, t }}>
    <Setup />
    <CameraRig t={t} />
    <Lights t={t} />
    <Hero t={t} />
    <HairStrands t={t} />
    <Cat t={t} />
    <OurHouse t={t} />
    <RoomHair t={t} />
    <Ropes t={t} />
    <Neighbourhood />
    <Blanket t={t} />
  </KitCtx.Provider>;
}
export type { Strand };
