// «Zombie ants» — the story state at time t (world in millimetres, side view, ground y = 0, up is −y):
// the hero ant (path → time-lapse to the nest → out, shakes, falls → climbs the plant → under leaf B, bites → x-ray →
// dies → stalk → spores) and, at the end, the next ant on the path (the same as the first frame); the other ants on the
// path and up the tree; the old zombie on leaf A; falling spores; the light (night ↔ noon); the camera.
// Loop film: everything is periodic over END or equal at 0 and END. Changes are ramps, never one frame.
import { EV, END } from "./timeline.mjs";
import { SPORE_UV, antPoint } from "./ant.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
export const wrap = (t) => ((t % END) + END) % END;
// the other ants' walking phase: about 14 rad/s with a whole number of cycles over the loop
const WQ = (t) => { const n = Math.round((14 * END) / (2 * Math.PI)); return (2 * Math.PI * n / END) * wrap(t); };
const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- the world plan (mm)
export const TRUNK = { x0: -360, x1: -200, top: -9000 }, NEST = { x: -200, y: -3200 };
export const STEM = { x: 0, top: -330, w: 3.2 };
export const LEAF_A = { x: 1.6, y: -190, dir: 1, len: 92 }, LEAF_B = { x: -1.6, y: -250, dir: -1, len: 96 };
export const BITE = { x: -40 };                                   // where the hero bites leaf B's vein (underside)
export const leafUnder = (L, x) => { const q = clamp01(((x - L.x) * L.dir) / L.len); return L.y + 3.2 * Math.pow(Math.sin(Math.PI * Math.pow(q, 0.8)), 0.7) * 0.5 + 6 * q * q; };   // underside y
export const leafTop = (L, x) => { const q = clamp01(((x - L.x) * L.dir) / L.len); return L.y - 3.2 * Math.pow(Math.sin(Math.PI * Math.pow(q, 0.8)), 0.7) + 6 * q * q; };

// ---------------------------------------------------------------- light: 0 night … 1 day (noon)
export function light(t) {
  t = wrap(t);
  const cyc = (a, b, n) => { const u = clamp01((t - a) / (b - a)); return 0.5 - 0.5 * Math.cos(2 * Math.PI * n * u); };
  if (t < EV.forDays) return 0;
  if (t < EV.normalEnd) return cyc(EV.forDays, EV.normalEnd, 2);               // "for days": two quick days
  if (t < EV.where) return 0;
  if (t < EV.noon + 0.2) return smooth(t, EV.where, EV.noon + 0.2);           // dawn → noon
  if (t < EV.dies) return 1;
  if (t < EV.few1) return 1 - smooth(t, EV.dies, EV.few1);                     // dusk as it dies
  if (t < EV.stalk - 0.1) return cyc(EV.few1, EV.stalk - 0.1, 2) * 0.85;       // "a few days later"
  return 0;
}

// ---------------------------------------------------------------- the hero
const V = 12;                                                     // walking speed on the path, mm/s
const X0 = 30;                                                    // the hero's x at the seam (first and last frame)
export const T = {
  stopA: 8.3, goA: EV.forDays + 0.05, nest: EV.normalEnd - 0.05,
  out: EV.leaves1 + 0.05, outEnd: EV.high + 0.6, shake0: EV.shakes - 0.05, shake1: EV.falls - 0.05, land: EV.floor + 0.15,
  walk2: EV.floorEnd - 0.2, climb0: EV.climbs, climb1: EV.up + 0.3, under0: EV.right - 0.1, under1: EV.bites - 0.1, bite: EV.bites,
  dead0: EV.dies - 0.05, dead1: EV.dies + 0.8, stalk0: EV.stalk - 0.05, stalk1: EV.head + 0.5,
  land2: EV.lands2 + 0.05,
};
const STOPX = X0 - V * (T.stopA - 0.5);                          // it slows down over the last second and stops here
const walkX = (tt) => { const s1 = T.stopA - 1; if (tt <= s1) return X0 - V * tt; const q = Math.min(1, tt - s1); return X0 - V * (s1 + q - q * q / 2); };
const PATH_TL = (() => { const pts = [[STOPX, 0], [TRUNK.x1 + 6, 0], [TRUNK.x1 + 6, NEST.y]]; return pts; })();
function along(pts, k) { let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; } let s = k * L; for (let i = 0; i < seg.length; i++) { if (s <= seg[i] || i === seg.length - 1) { const q = clamp01(s / seg[i]); return { x: lerp(pts[i][0], pts[i + 1][0], q), y: lerp(pts[i][1], pts[i + 1][1], q), i }; } s -= seg[i]; } return { x: pts[pts.length - 1][0], y: pts[pts.length - 1][1], i: seg.length - 1 }; }
const base = { a: Math.PI, s: 1, walk: null, shake: 0, spin: 0, dead: 0, xray: 0, fungus: 0, brainHi: 0, spore: 1, sporeGrow: 0, stalk: 0, jaw: 0, alpha: 1, glow: 0 };
export function hero(t) {
  t = wrap(t); const st = heroCore(t);
  // one continuous leg phase; the stride follows the ant's real speed (legs settle smoothly when it stops)
  const u = t > END - 4.5 ? t - END : t, d = 1 / 60, A = heroCore(t - d), Bq = heroCore(t + d), sp = A.alpha > 0 && Bq.alpha > 0 ? Math.hypot(Bq.x - A.x, Bq.y - A.y) / (2 * d) : 0;
  st.walk = u * 14; st.amp = st.dead > 0 ? 0 : smooth(sp, 1.5, 8); return st;
}
function heroCore(t) {
  t = wrap(t);
  const st = { ...base, light: light(t) };
  // the seam stretch: walking left along the path (the next ant arrives, and walks on after the seam)
  const u = t > END - 4.5 ? t - END : t;
  if (u < T.stopA) {
    const tt = Math.min(u, T.stopA); st.x = walkX(tt); st.y = 0; st.walk = tt * 14;
    if (t > END - 4.5) { st.spore = smooth(t, T.land2 - 0.05, T.land2 + 0.15); st.glow = st.spore; }
    else st.spore = 1, st.glow = 1;
    return st;
  }
  if (t < T.goA) { st.x = STOPX; st.y = 0; st.sporeGrow = smooth(t, EV.grows1, EV.shellEnd); st.glow = 1; return st; }
  // time-lapse: along the path to the tree, up the trunk to the nest
  if (t < T.nest + 0.35) { const k = ease((t - T.goA) / (T.nest - T.goA)), p = along(PATH_TL, k); st.x = p.x; st.y = p.y; st.walk = t * 40; st.glow = 1; st.sporeGrow = 1;
    if (p.i >= 1) { st.a = -Math.PI / 2; st.s = 1; st.x = TRUNK.x1 + 0.4; } else if (k > 0.03 && p.x < TRUNK.x1 + 20) { const c = clamp01((TRUNK.x1 + 20 - p.x) / 14); st.a = lerp(Math.PI, 1.5 * Math.PI, c); }
    st.alpha = 1 - smooth(t, T.nest - 0.05, T.nest + 0.3); return st; }
  // inside the nest, then out: down the trunk face a little, shaking, then the fall
  if (t < T.out) { st.alpha = 0; st.x = TRUNK.x1 + 0.4; st.y = NEST.y; return st; }
  if (t < T.shake1) { const k = ease((t - T.out) / (T.outEnd - T.out)); st.x = TRUNK.x1 + 0.4; st.y = NEST.y + 4 + k * 26; st.a = Math.PI / 2; st.s = -1; st.walk = t < T.outEnd ? t * 14 : null; st.alpha = smooth(t, T.out, T.out + 0.3); st.sporeGrow = 1; st.glow = 0.4;
    st.shake = 0.55 * win(t, T.shake0, T.shake1, 0.08, 0.08); return st; }
  if (t < T.land) { const k = (t - T.shake1) / (T.land - T.shake1), y0 = NEST.y + 30; st.x = lerp(TRUNK.x1 + 3, -150, k); st.y = lerp(y0, 0, k * k); st.spin = k * 5.5 * Math.PI; st.a = Math.PI / 2; st.s = -1; st.glow = 0.4; st.sporeGrow = 1; return st; }
  // lands (a little bounce), walks right to the plant
  if (t < T.climb0) { const k = ease((t - T.walk2) / (T.climb0 - T.walk2)); st.x = t < T.walk2 ? -150 : lerp(-150, -STEM.w / 2 - 6, k); st.y = -Math.max(0, 6 * Math.sin(Math.PI * clamp01((t - T.land) / 0.25))) * (t < T.land + 0.25 ? 1 : 0); st.a = 0; st.s = -1; st.walk = t > T.walk2 ? t * 30 : null; st.glow = 0.4; st.sporeGrow = 1; return st; }
  // climbs the stem's left face (belly on the stem, back to the left) up to leaf B
  if (t < T.under0) { const k = ease((t - T.climb0) / (T.climb1 - T.climb0)); st.x = -STEM.w / 2 - 0.2; st.y = lerp(-1, LEAF_B.y + 7, k); st.a = -Math.PI / 2 * smooth(t, T.climb0, T.climb0 + 0.3); st.s = -1; st.walk = t < T.climb1 ? t * 16 : null; st.glow = 0.3; st.sporeGrow = 1;
    if (t < T.climb0 + 0.3) st.x = lerp(-STEM.w / 2 - 6, -STEM.w / 2 - 0.2, smooth(t, T.climb0, T.climb0 + 0.3));
    return st; }
  // walks out under leaf B (upside down, heading left), bites the vein
  if (t < T.under1) { const k = ease((t - T.under0) / (T.under1 - T.under0)); st.x = lerp(-STEM.w / 2 - 0.2, BITE.x, k); st.y = leafUnder(LEAF_B, st.x) + 0.1; st.a = -Math.PI / 2 - Math.PI / 2 * smooth(k, 0, 0.2); st.s = -1; st.walk = t * 16;
    if (k < 0.2) st.y = lerp(LEAF_B.y + 7, st.y, smooth(k, 0, 0.2));
    st.glow = 0.3; st.sporeGrow = 1; return st; }
  return leafState(t);
}
/** the hero on leaf B from the bite on (alive → x-ray → dead → stalk); it stays there to the end of the film */
export function leafState(t) {
  t = wrap(t);
  const st = { ...base, light: light(t) };
  st.x = BITE.x; st.y = leafUnder(LEAF_B, BITE.x) + 0.1; st.a = -Math.PI; st.s = -1; st.jaw = smooth(t, T.bite, T.bite + 0.18); st.sporeGrow = 1;
  st.xray = win(t, EV.inside - 0.1, EV.dies - 0.1, 0.5, 0.6);
  st.fungus = smooth(t, EV.inside, EV.body + 0.6);
  st.brainHi = win(t, EV.but1, EV.mysteryEnd, 0.3, 0.4);
  st.dead = smooth(t, T.dead0, T.dead1);
  st.stalk = smooth(t, T.stalk0, T.stalk1);
  st.spore = 1 - smooth(t, EV.inside, EV.inside + 0.6);
  st.glow = smooth(t, T.stalk0 + 0.6, T.stalk1);
  return st;
}
export const corpse = (t) => (wrap(t) >= T.under1 ? leafState(t) : null);
export const heroOnPath = (t) => { t = wrap(t); return !(t >= T.under1 && t <= END - 4.5); };

// ---------------------------------------------------------------- the old zombie on leaf A (always there: an earlier victim)
export const OLD = (() => { const x = LEAF_A.x + 46; return { ...base, x, y: leafUnder(LEAF_A, x) + 0.1, a: 0, s: 1, jaw: 1, dead: 1, spore: 0, stalk: 1, glow: 1, light: 0 }; })();

// ---------------------------------------------------------------- other ants: on the path and up the tree (periodic)
export function others(t) {
  t = wrap(t); const out = [];
  // the path to the tree: ants walking both ways on x −1800…−240 (they fade in and out at the ends of the stretch)
  for (let i = 0; i < 9; i++) { const dir = i % 3 === 0 ? 1 : -1, span = 1560, laps = 1 + (i % 3), v = (laps * span) / END, x0 = rnd(i * 7) * span;
    const q = ((x0 + dir * v * t) % span + span) % span, x = -1800 + q, a = Math.min(smooth(q, 0, 40), 1 - smooth(q, span - 40, span));
    out.push({ ...base, x, y: 0, a: dir > 0 ? 0 : Math.PI, s: dir > 0 ? -1 : 1, walk: WQ(t) + i * 2, spore: 0, alpha: a, light: light(t) }); }
  // the trunk: up and down between the ground and the nest (they fade at both ends: into the nest, onto the path)
  for (let i = 0; i < 7; i++) { const up = i % 2 === 0, laps = 2 + (i % 2), v = (laps * 3200) / END, y0 = rnd(i * 13) * 3200, q = ((y0 + v * t) % 3200 + 3200) % 3200, a = Math.min(smooth(q, 0, 60), 1 - smooth(q, 3140, 3200));
    out.push({ ...base, x: TRUNK.x1 + 0.4, y: up ? -q : -3200 + q, a: up ? -Math.PI / 2 : Math.PI / 2, s: up ? 1 : -1, walk: WQ(t) + i, spore: 0, alpha: a, light: light(t) }); }
  return out;
}

// ---------------------------------------------------------------- spores
// ambient: a slow drizzle from the leaves to the path, periodic over the film
export const AMBIENT = Array.from({ length: 46 }, (_, i) => ({ x: -110 + rnd(i * 3) * 230, n: 3 + (i % 4), ph: rnd(i * 5), sway: 2 + rnd(i * 7) * 6, top: -260 + rnd(i * 11) * 60 }));
export function ambientSpore(p, t) { const u = ((wrap(t) / END) * p.n + p.ph) % 1; return { x: p.x + Math.sin(u * 9 + p.ph * 6) * p.sway, y: lerp(p.top, 2, u), a: Math.min(smooth(u, 0, 0.08), 1 - smooth(u, 0.9, 1)) }; }
// the rain from the hero's stalk: spawned over "rains spores on the path below"
export const RAIN = Array.from({ length: 70 }, (_, i) => ({ t0: EV.rains - 0.1 + rnd(i * 17) * 1.9, dur: 1.1 + rnd(i * 19) * 0.7, dx: (rnd(i * 23) - 0.5) * 120, ph: rnd(i * 29) }));
export const STALK_PAD = () => { const st = leafState(EV.head + 1); return antPoint(st, 2.55 - 0.9 * 0.42 - 0.6 * Math.sin(0.42 * 2.2), 3.32 + 17 * 0.42); };
// the spore that lands on the next ant (falls in from above, lands at T.land2)
export function landingSpore(t) {
  t = wrap(t); const a = T.land2 - 1.3, b = T.land2; if (t < a || t > b) return null;
  const k = (t - a) / (b - a), h = hero(b), [ex, ey] = antPoint(h, SPORE_UV[0], SPORE_UV[1]);
  return { x: ex + (1 - k) * 18 + Math.sin(k * 6) * 2, y: lerp(ey - 70, ey, k), a: smooth(k, 0, 0.15) };
}

// ---------------------------------------------------------------- camera {cx, cy, z (px per mm)}
const follow = (t, dy = -5.5) => { const h = hero(t); return { cx: h.x - 2, cy: dy, z: 18 }; };
export const CAM = {
  SPORE: () => { const h = hero(9.5), [x, y] = antPoint(h, SPORE_UV[0], SPORE_UV[1]); return { cx: x + 0.6, cy: y + 0.8, z: 38 }; },
  WIDE: { cx: -150, cy: -1650, z: 0.2 }, NEST: { cx: -193, cy: -3188, z: 6 }, FALL: { cx: -160, cy: -1500, z: 0.24 },
  PLANT: { cx: -10, cy: -82, z: 1.9 }, LEAF: { cx: -36, cy: -244, z: 10 }, XRAY: { cx: -38.0, cy: -247.4, z: 28 },
  STALK: { cx: -39, cy: -238, z: 10.5 }, RAIN: { cx: -30, cy: -83, z: 1.68 }, FOSSIL: { cx: -30, cy: -205, z: 4.2 }, CLOSE: { cx: -38, cy: -236, z: 11 },
};
// keys: [hold from, hold to, camera (object or fn of t)]
export const KEYS = [
  [0, T.stopA - 0.6, follow], [EV.grows1 - 0.1, EV.shellEnd - 0.15, CAM.SPORE], [EV.days1 + 0.25, EV.normal + 0.1, CAM.WIDE], [EV.leaves1, EV.shakes + 0.6, CAM.NEST],
  [EV.forest - 0.2, EV.forest - 0.1, CAM.FALL], [EV.climbs + 0.05, EV.wetEnd - 0.1, CAM.PLANT], [EV.bites - 0.15, EV.goEnd - 0.2, CAM.LEAF], [EV.fungus3 - 0.1, EV.mysteryEnd - 0.1, CAM.XRAY],
  [EV.dies + 0.4, EV.head + 0.3, CAM.STALK], [EV.spores - 0.1, EV.below1End - 0.1, CAM.RAIN], [EV.marks, EV.oldEnd - 0.2, CAM.FOSSIL], [EV.inspired, EV.hotEnd, CAM.CLOSE],
  [EV.below2 + 0.1, END + 0.0001, follow],
];
const camAt = (key, t) => (typeof key === "function" ? key(t) : key);
function rawCam(t) {
  t = wrap(t);
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return camAt(A, t);
  const [b0, , Bk] = KEYS[i + 1], P = camAt(A, a1), Q = camAt(Bk, b0), k = ease((t - a1) / (b0 - a1));
  // log zoom with a dip for long moves; positions follow 1/z so the subject stays put while zooming
  const lz = lerp(Math.log(P.z), Math.log(Q.z), k), d = Math.hypot((P.cx - Q.cx) * Math.min(P.z, Q.z), (P.cy - Q.cy) * Math.min(P.z, Q.z)), dip = Math.min(2.2, Math.max(0, Math.log(d / 500))) * Math.sin(Math.PI * k);
  const z = Math.exp(lz - dip), iz = (1 / z - 1 / P.z) / (1 / Q.z - 1 / P.z || 1e-9), w = Math.abs(P.z - Q.z) / Math.max(P.z, Q.z) < 0.05 ? k : clamp01(dip > 0.01 ? lerp(iz, k, 0.5) : iz);
  return { cx: lerp(P.cx, Q.cx, w), cy: lerp(P.cy, Q.cy, w), z };
}
const FR = Math.round(END * 30), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / 30));
const SMW = 5;
export function camera(t) {
  const f = Math.round(wrap(t) * 30) % FR; let x = 0, y = 0, lz = 0, w = 0;
  for (let k = -SMW; k <= SMW; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SMW / 2) ** 2)); x += c.cx * q; y += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: x / w, cy: y / w, z: Math.exp(lz / w), ay: 470 };
  // at the seam the camera is exactly the follow shot
  const ex = Math.max(1 - smooth(wrap(t), 0.2, 0.6), smooth(wrap(t), END - 0.5, END - 0.05)); if (ex <= 0) return s;
  const e = follow(t); return { cx: lerp(s.cx, e.cx, ex), cy: lerp(s.cy, e.cy, ex), z: Math.exp(lerp(Math.log(s.z), Math.log(e.z), ex)), ay: 470 };
}
