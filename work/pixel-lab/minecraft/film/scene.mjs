// Minecraft film — what happens in the world over time: the player's path, which chunks are loaded when, the generation
// steps on the area beyond the frontier, and the cameras. Pure functions of t (all keyed to words in timeline.mjs).
import { MAIN, FAR, F, B, BOX, SEA, colIndex, VILLAGE, CLIFF_Y } from "./world.mjs";
import { EV, END } from "./timeline.mjs";
import { hash } from "./noise.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const lerpLog = (a, b, k) => Math.exp(lerp(Math.log(a), Math.log(b), k));

// ---------------------------------------------------------------- the player's path (iso part)
export const LEDGE = [0.5, -2.5], P1 = [-62, -66], P2 = [-122, -128];
const RUN1 = [EV.run[0] + 0.1, EV.run[1] - 0.3], RUN2 = [EV.run2[0] + 0.2, EV.run2[1] - 0.2];
export function groundY(x, z) { const ix = Math.floor(x), iz = Math.floor(z); if (ix < MAIN.ox || iz < MAIN.oz || ix >= MAIN.ox + MAIN.nx || iz >= MAIN.oz + MAIN.nz) return SEA; const c = colIndex(MAIN, ix, iz); return Math.max(MAIN.ground[c], SEA) + 1; }
export function hero(t) {
  let p, moving = 0;
  if (t < RUN1[0]) p = LEDGE;
  else if (t < RUN1[1]) { const k = ease((t - RUN1[0]) / (RUN1[1] - RUN1[0])); p = [lerp(LEDGE[0], P1[0], k), lerp(LEDGE[1], P1[1], k)]; moving = 1; }
  else if (t < RUN2[0]) p = P1;
  else if (t < RUN2[1]) { const k = ease((t - RUN2[0]) / (RUN2[1] - RUN2[0])); p = [lerp(P1[0], P2[0], k), lerp(P1[1], P2[1], k)]; moving = 1; }
  else p = P2;
  const y = t < RUN1[0] ? CLIFF_Y + 1 : groundY(p[0], p[1]);
  return { x: p[0], y, z: p[1], moving, face: Math.PI * 1.25 };
}

// ---------------------------------------------------------------- chunk loading (Chebyshev radius 8 around the player's chunk)
export const RADIUS = 8;
const CX0 = Math.floor(MAIN.ox / 16), CZ0 = Math.floor(MAIN.oz / 16), CNX = Math.ceil(MAIN.nx / 16), CNZ = Math.ceil(MAIN.nz / 16);
export const LOAD = new Float32Array(CNX * CNZ).fill(1e9);
{
  for (let t = 0; t <= EV.how + 0.2; t += 0.02) {
    const h = hero(t), pcx = Math.floor(h.x / 16), pcz = Math.floor(h.z / 16);
    for (let dz = -RADIUS; dz < RADIUS; dz++) for (let dx = -RADIUS; dx < RADIUS; dx++) {
      const cx = pcx + dx, cz = pcz + dz, k = (cz - CZ0) * CNX + (cx - CX0); if (cx < CX0 || cz < CZ0 || cx >= CX0 + CNX || cz >= CZ0 + CNZ) continue;
      if (LOAD[k] < 1e8) continue;
      LOAD[k] = t < 0.05 ? -10 : t + 0.05 + hash(cx, cz, 5) * 0.18;
    }
  }
  // everything not loaded by then is "the next area": the generation steps are shown there
  for (let z = MAIN.oz; z < MAIN.oz + MAIN.nz; z++) for (let x = MAIN.ox; x < MAIN.ox + MAIN.nx; x++) {
    const k = (Math.floor(z / 16) - CZ0) * CNX + (Math.floor(x / 16) - CX0); if (LOAD[k] > EV.how) MAIN.flag[colIndex(MAIN, x, z)] |= F.DEMO;
  }
}
export const chunkLoad = (cx, cz) => LOAD[(cz - CZ0) * CNX + (cx - CX0)] ?? 1e9;
export const SEED_AT = [-300, -300];                       // where the seed lands (the middle of the next area)
export const QCHUNK = [Math.floor(P2[0] / 16) - RADIUS - 1, Math.floor(P2[1] / 16) - RADIUS - 1]; // the "?" chunk beyond the corner

// ---------------------------------------------------------------- per-frame world state (MAIN)
const RISE = 0.45;
export function stateMain(S, t) {
  const r = MAIN; S.t = t; S.demoFlag = true;
  // generation stages on the next area
  const st = S.stage, rLand = (x, z) => EV.land - 0.15 + Math.hypot(x - SEED_AT[0], z - SEED_AT[1]) / 520;
  st.water = smooth(t, EV.land + 0.1, EV.ocean + 0.35);
  st.floorNoise = win(t, EV.noise - 0.1, EV.land + 0.7, 0.2, 0.5); st.floorNoiseR = 30 + 520 * easeOut((t - EV.noise + 0.05) / 1.6); st.seed = SEED_AT;
  st.tempTint = win(t, EV.hot - 0.2, EV.wet - 0.15, 0.3, 0.35); st.humTint = win(t, EV.wet - 0.1, EV.deserts - 0.1, 0.3, 0.35);
  st.desert = smooth(t, EV.deserts - 0.05, EV.deserts + 0.45); st.jungle = smooth(t, EV.jungles - 0.05, EV.jungles + 0.45); st.snow = smooth(t, EV.snow - 0.05, EV.snow + 0.45);
  st.surf = smooth(t, EV.grass - 0.15, EV.grass + 0.5); st.trees = smooth(t, EV.trees - 0.1, EV.trees + 0.7); st.ores = smooth(t, EV.ores - 0.1, EV.ores + 0.3); st.village = smooth(t, EV.villages - 0.1, EV.villages + 0.7);
  const b = S.box; b.on = true;
  b.cut = smooth(t, EV.d3 - 0.25, EV.checks - 0.1) * (1 - smooth(t, EV.villages + 0.15, EV.villages + 0.75));
  b.ghost = smooth(t, EV.checks - 0.1, EV.block + 0.2) * (1 - smooth(t, EV.air + 0.4, EV.air + 0.45));
  b.stone = smooth(t, EV.above - 0.1, EV.stone + 0.1); b.air = smooth(t, EV.ifNot - 0.05, EV.air + 0.35);
  if (b.ghost <= 0 && t > EV.air) b.ghost = 0;
  // heights
  const hv = S.hv;
  for (let z = r.oz, c = 0; z < r.oz + r.nz; z++) for (let x = r.ox; x < r.ox + r.nx; x++, c++) {
    if (r.flag[c] & F.DEMO) {
      const t1 = rLand(x, z) + hash(x >> 4, z >> 4, 9) * 0.07, k1 = smooth(t, t1, t1 + RISE);
      const t2 = EV.flat - 0.1 + Math.hypot(x - SEED_AT[0], z - SEED_AT[1]) / 600 + hash(x >> 4, z >> 4, 10) * 0.06, k2 = smooth(t, t2, t2 + 0.6);
      const lo = Math.min(r.hLO[c], r.ground[c]) + 1;
      hv[c] = k2 > 0 ? lerp(lo, r.ground[c] + 1, k2) : k1 * lo;
    } else {
      const L = LOAD[(Math.floor(z / 16) - CZ0) * CNX + (Math.floor(x / 16) - CX0)], k = smooth(t, L, L + RISE);
      hv[c] = k * (r.top[c] + 1);
    }
  }
  // the 3D box keeps its own surface once rebuilt
  S.voidGrid = 1;
  S.shadowK = 0.55;
}

// ---------------------------------------------------------------- cameras
// mode: "ots" (over the shoulder + first person on the monitor), "persp" (first person / rising), "iso", "map", "far"
const TUN_Z0 = 13.5;
export function fpCam(t) {
  // through the tunnel at a steady walk (out of the mouth on "endless?"), then a few steps onto the ledge, a look down-left
  const tm = EV.mouth, v = TUN_Z0 / tm, D = 3 * 2.6 / v;
  const z = t < tm ? TUN_Z0 - v * t : -2.6 * easeOut((t - tm) / D), walking = t < tm + D * 0.7;
  const bob = walking ? Math.sin(t * 13) * 0.07 : 0, sway = walking ? Math.cos(t * 6.5) * 0.04 : 0;
  return { x: 0 + sway, y: 62.62 + bob, z, yaw: 0.26 * smooth(t, tm + 0.35, EV.most + 0.3), pitch: -0.02 - 0.2 * smooth(t, tm - 0.1, tm + 0.9), fov: 1.18, bob };
}
// the rise: from the ledge to a far, high viewpoint along the iso view direction (looks almost orthographic)
const ISO0 = { x: -8, y: 40, z: -40, b: 1.0 };
const ISO_DIR = [1 / Math.sqrt(3), 1 / Math.sqrt(3), 1 / Math.sqrt(3)];
export function riseCam(t) {
  const f = fpCam(EV.rise[0]), u = clamp01((t - EV.rise[0]) / (EV.rise[1] - EV.rise[0]));
  const fovEnd = 0.62, dEnd = (960 / (ISO0.b / 0.8165)) / (2 * Math.tan(fovEnd / 2));
  // look-at point: from 60 blocks ahead of the ledge down to the iso target
  const kl = ease(u), look = [lerp(f.x - Math.sin(f.yaw) * 60, ISO0.x, kl), lerp(f.y - 14, ISO0.y, kl), lerp(f.z - Math.cos(f.yaw) * 60, ISO0.z, kl)];
  // position: first straight up above the ledge, then back along the iso view direction (never through the mountain)
  const up = easeOut(clamp01(u / 0.45)) * 70, kd = ease(clamp01((u - 0.15) / 0.85)), d = lerp(0, dEnd, kd * kd);
  const base = [f.x, f.y + up, f.z], tgt = [ISO0.x + ISO_DIR[0] * dEnd, ISO0.y + ISO_DIR[1] * dEnd, ISO0.z + ISO_DIR[2] * dEnd];
  const kk = kd, pos = [lerp(base[0], tgt[0], kk), lerp(base[1], tgt[1], kk), lerp(base[2], tgt[2], kk)];
  const dv = [look[0] - pos[0], look[1] - pos[1], look[2] - pos[2]], len = Math.hypot(...dv);
  const yaw = Math.atan2(-dv[0], -dv[2]), pitch = Math.asin(dv[1] / len);
  // narrowing the field of view with the distance keeps the target the same size → the end matches the iso view
  const fov = 2 * Math.atan(Math.tan(f.fov / 2) * (1 - kd) + Math.tan(fovEnd / 2) * kd * (len / dEnd));
  const fk = smooth(t, EV.rise[0] + 0.05, EV.exist + 0.1);
  return { x: pos[0], y: pos[1], z: pos[2], yaw, pitch, fov: Math.min(f.fov, fov), fogStart: lerp(80, 5000, fk), fogEnd: lerp(140, 9000, fk) };
}
export const ISO_IN = [EV.rise[1] - 0.45, EV.rise[1] + 0.05];   // persp → iso dissolve

// iso keys (MAIN); between keys: eased, b interpolated in log space
const HERO = (t, ahead = 0) => { const h = hero(t); return { x: h.x - ahead, y: h.y - 4, z: h.z - ahead }; };
const DEMO_CAM = { x: -272, y: 36, z: -272, b: 2.15 };
const CUT_CAM = { x: (BOX.x0 + BOX.x1) / 2, y: 62, z: BOX.zc, b: 7.6 };
const SURF_CAM = { x: (BOX.x0 + BOX.x1) / 2 - 2, y: 40, z: BOX.zc - 6, b: 5.4 };
const VIL_CAM = { x: -282, y: 36, z: -296, b: 2.3 };
function isoKeys(t) {
  return [
    { t: ISO_IN[0], ...ISO0 },
    { t: EV.run[0] + 0.3, ...ISO0, b: 1.0 },
    { t: EV.run[1], ...HERO(EV.run[1] - 0.3, 6), b: 1.5 },
    { t: EV.chunks + 0.3, ...HERO(EV.run[1], 0), b: 5.6 },
    { t: EV.wide + 0.4, ...HERO(EV.run[1], 0), b: 5.6 },
    { t: EV.run2[0] + 1.0, ...HERO(EV.run2[0] + 1.0, 52), b: 3.0 },
    { t: EV.arrive + 0.3, ...HERO(EV.arrive + 0.3, 58), b: 3.0 },
    { t: EV.know, ...lerpCam(HERO(EV.arrive + 0.3, 58), DEMO_CAM, 0.55), b: 2.5 },
    { t: EV.seed, ...DEMO_CAM },
    { t: EV.d3 - 0.3, ...DEMO_CAM, x: DEMO_CAM.x - 4, z: DEMO_CAM.z - 4 },
    { t: EV.checks + 0.2, ...CUT_CAM },
    { t: EV.head + 0.1, ...CUT_CAM, x: CUT_CAM.x - 1.5 },
    { t: EV.grass + 0.2, ...SURF_CAM },
    { t: EV.ores + 0.15, ...SURF_CAM, x: SURF_CAM.x - 2, z: SURF_CAM.z - 2 },
    { t: EV.villages + 0.6, ...VIL_CAM },
    { t: EV.notEndless, ...VIL_CAM, b: 2.0 },
  ];
}
function lerpCam(a, b, k) { return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k) }; }
export function isoCam(t) {
  const K = isoKeys(t); let i = 0; while (i < K.length - 2 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  // while the player runs the camera follows him closely (not eased between far keys)
  return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), b: lerpLog(a.b, b.b, k) };
}

// world-scale zoom: from the last iso key to the whole world, later into the Far Lands
export const WORLD_HALF = 29999984;
export const MAP_B = 252 / WORLD_HALF / 2;                 // the world square as a diamond ~472 px wide
export const MAP_CAM = { x: 0, y: SEA, z: 0, b: MAP_B };
export const ZOOM_OUT = [EV.notEndless + 0.05, EV.thirty - 0.05];
export const FAR_POINT = { x: -12550821 + 0.5, y: SEA + 4, z: 0.5 };
export const ZOOM_IN = [EV.fell - 0.35, EV.twelve + 0.35];
export const FAR_CAM0 = { x: -12550821 + 34, y: 52, z: 30, b: 3.1 };
export function worldCam(t) {
  if (t < ZOOM_IN[0]) {
    const a = isoCam(EV.notEndless), k = ease((t - ZOOM_OUT[0]) / (ZOOM_OUT[1] - ZOOM_OUT[0])), kb = clamp01((t - ZOOM_OUT[0]) / (ZOOM_OUT[1] - ZOOM_OUT[0]));
    const bb = lerpLog(a.b, MAP_B, ease(kb)), cc = clamp01(Math.log(a.b / bb) / Math.log(a.b / MAP_B));
    return { x: lerp(a.x, 0, cc), y: lerp(a.y, SEA, cc), z: lerp(a.z, 0, cc), b: bb };
  }
  // log zoom; the target's offset from the screen anchor shrinks smoothly in screen space (no late slide)
  const kb = clamp01((t - ZOOM_IN[0]) / (ZOOM_IN[1] - ZOOM_IN[0])), e = ease(kb), bb = lerpLog(MAP_B, FAR_CAM0.b, e), s = (MAP_B / bb) * (1 - e);
  return { x: FAR_CAM0.x + (0 - FAR_CAM0.x) * s, y: lerp(SEA, FAR_CAM0.y, e), z: FAR_CAM0.z + (0 - FAR_CAM0.z) * s, b: bb };
}
// the Far Lands part: stream, then the two friends; the camera drifts and eases in a little for the ending
export function farCam(t) {
  const a = { ...FAR_CAM0 }, k = ease((t - EV.send + 0.2) / 1.6);
  return { x: a.x - 10 * k, y: lerp(a.y, 48, k), z: a.z - 8 * k, b: lerpLog(a.b, 4.4, k) };
}
export function mode(t) {
  if (t < EV.crop[1]) return "ots";
  if (t < ISO_IN[1]) return "persp";
  if (t < ZOOM_OUT[0]) return "iso";
  if (t < ZOOM_IN[1]) return "world";
  return "far";
}
