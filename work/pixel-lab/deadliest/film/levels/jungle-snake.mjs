// LV7 · the snake: a cute chibi cobra (green, yellow belly scutes, big glossy amber eyes, blush, a little smile) sitting
// in a coil and facing the camera. The body is ONE 3D path — tail tip on the ground → a 2.5-turn coil → the neck rising
// from the middle → the head — rendered as a z-buffered sphere sweep (loops pass in front of / behind each other with a
// clean outline, no seams), shaded in flat ramp bands with dithered transitions like cute.mjs blobs: green back with
// darker chevrons, yellow belly with scute lines (underneath on the coil, facing the camera on the raised neck). The
// hood is the neck widening into flat wings. The coil is static and cached; the tail tip, neck, hood and head are
// redrawn every frame (sway, rise, hood spread). Pose = pure function of t (levels/jungle-time.mjs). Also ICON().
import { blob, ell, eye, blush, fade, mix, bayer, clamp01, sm, lerp, blinkAt, RAMP } from "../cute.mjs";
import { Layer, gaze } from "./jungle-kit.mjs";
import { JT } from "./jungle-time.mjs";

const R = Math.round;
export const GREEN = ["#061410", "#0B2416", "#123A1C", "#1C5422", "#2A7028", "#43902E", "#6CB23C", "#A4D860"];
export const HOODR = ["#0A2414", "#16401E", "#2A6226", "#4A8430", "#78A83C", "#A6C858", "#CCE07E", "#ECF4B0"];
export const BELLY = ["#2E2006", "#5A400A", "#8E6A10", "#C49A1A", "#E6BE2C", "#F6D850", "#FCEA88", "#FFF8C6"];
const NECK = 21;
const OUT = "#07060E", LIT = "#D4F4A0", TONGUE = ["#5A0A1E", "#C8203E", "#F04A64", "#FF9AAC"];

// ---------------------------------------------------------------- projection (camera looks down by ALPHA)
const ALPHA = 0.2, CA = Math.cos(ALPHA), SA = Math.sin(ALPHA);
/** world-local (x, h up, d toward the viewer) → [screen-local x, y (down), z (nearer = bigger)] */
const proj = (x, h, d) => [x, -h * CA + d * SA, d * CA + h * SA];
const DOWN = [0, CA, -SA], FWD = [0, SA, CA];               // world "down" and "toward the camera" in screen space
const LV3 = (() => { const v = [-0.5, -0.62, 0.6], n = Math.hypot(...v); return v.map((k) => k / n); })();
const LIGHT2 = (() => { const n = Math.hypot(-0.6, -0.8); return [-0.6 / n, -0.8 / n]; })();

// ---------------------------------------------------------------- sample buffers (local box around the ground anchor)
const BX0 = -150, BY0 = -430, BW = 300, BH = 480, NB = BW * BH;
const Z = new Float32Array(NB), I = new Int32Array(NB), Q = new Float32Array(NB);
let COIL = null;   // { samples, Z, I, Q }

/** Turn a 3D polyline [{x,h,d,r,hw,b,s}] into screen samples with tangents (every ≤ 0.8 px). */
function toSamples(pts, out, s0 = 0, dir = 1) {
  let s = s0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], [x, y, z] = proj(p.x, p.h, p.d), q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const [ax, ay] = proj(o.x, o.h, o.d), [bx, by] = proj(q.x, q.h, q.d), tl = Math.hypot(bx - ax, by - ay) || 1;
    if (i > 0) { const pp = pts[i - 1]; s += dir * Math.hypot(p.x - pp.x, p.h - pp.h, p.d - pp.d); }
    out.push({ x, y, z, r: p.r, hw: p.hw ?? p.r, tx: (bx - ax) / tl, ty: (by - ay) / tl, b: p.b, s, wing: p.wing ?? 0 });
  }
  return out;
}

/** Rasterise one sample into the buffers (sphere front for the tube, a flat ellipse for hood wings). */
function raster(smp, idx) {
  const { x, y, z, r, hw, tx, ty } = smp, nx = -ty, ny = tx, ext = Math.max(r, hw) + 1;
  const xa = Math.max(BX0, Math.floor(x - ext)), xb = Math.min(BX0 + BW - 1, Math.ceil(x + ext)), ya = Math.max(BY0, Math.floor(y - ext)), yb = Math.min(BY0 + BH - 1, Math.ceil(y + ext));
  const r2 = r * r, wing = hw > r + 0.5;
  for (let Y = ya; Y <= yb; Y++) {
    const dy = Y + 0.5 - y, row = (Y - BY0) * BW - BX0;
    for (let X = xa; X <= xb; X++) {
      const dx = X + 0.5 - x, a = dx * tx + dy * ty, q = dx * nx + dy * ny, d2 = q * q + a * a;
      let zz;
      if (d2 <= r2) zz = z + Math.sqrt(r2 - d2);
      else if (wing && (q / hw) ** 2 + (a / r) ** 2 <= 1) zz = z + r * 0.15 - Math.abs(a) * 0.02;
      else continue;
      const bi = row + X;
      if (zz > Z[bi]) { Z[bi] = zz; I[bi] = idx; Q[bi] = q; }
    }
  }
}

// ---------------------------------------------------------------- body geometry
const TURNS = 2.5, TA = 0.22 * Math.PI, TB = TA - TURNS * 2 * Math.PI, RING0 = 94, RING1 = 34, TUBE0 = 25, TUBE1 = 19, RISE_PER_TURN = 33;
const coilAt = (f) => { const th = lerp(TA, TB, f), Rr = lerp(RING0, RING1, f), r = lerp(TUBE0, TUBE1, f); return { x: Rr * Math.cos(th), d: Rr * Math.sin(th), h: r + f * TURNS * RISE_PER_TURN, r, th, Rr }; };
function buildCoil() {
  const pts = [], N = 1500;
  for (let i = 0; i <= N; i++) { const p = coilAt(i / N); pts.push({ x: p.x, h: p.h, d: p.d, r: p.r, b: DOWN }); }
  const samples = toSamples(pts, []);
  Z.fill(-1e9); I.fill(-1);
  samples.forEach((s, i) => raster(s, i));
  COIL = { samples, Z: Z.slice(), I: I.slice(), Q: Q.slice(), sEnd: samples[samples.length - 1].s };
}

/** Tail: from the coil's first point backwards around the front, lying on the ground, the tip curling up and wiggling. */
function tailPts(t) {
  const pts = [], N = 260, wig = Math.sin(t * 3.1) * 0.5 + Math.sin(t * 1.7 + 1) * 0.3;
  for (let i = 0; i <= N; i++) {
    const g = i / N, th = TA + g * 0.78 * Math.PI + wig * 0.18 * g ** 3, Rr = RING0 + g * 16 + g ** 3 * 6, r = lerp(TUBE0, 3.4, Math.pow(g, 0.85));
    const curl = g > 0.72 ? ((g - 0.72) / 0.28) ** 2 * (16 + wig * 4) : 0;
    pts.push({ x: Rr * Math.cos(th), d: Rr * Math.sin(th), h: r + curl, r, b: DOWN });
  }
  return pts;
}

/** Snake pose at time t (all continuous): rise, hood, sway, face. */
export function snakePose(t) {
  const u = clamp01((t - JT.rise[0]) / (JT.rise[1] - JT.rise[0])), rise = u < 1 ? 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2 : 1;   // ease-out-back
  const hu = clamp01((t - JT.hood[0]) / (JT.hood[1] - JT.hood[0])), hoodOpen = hu < 1 ? 1 + 2.6 * (hu - 1) ** 3 + 1.6 * (hu - 1) ** 2 : 1;
  const hood = lerp(0.16, 1, hoodOpen) * lerp(1, 0.84, sm(t, ...JT.settle)) * Math.min(1, rise * 1.2);
  const amp = 3 + 9 * sm(t, ...JT.swayBig) - 5 * sm(t, ...JT.swayCalm);
  const wake = sm(t, ...JT.wake);
  const hk = clamp01((t - JT.happyBlink[0]) / (JT.happyBlink[1] - JT.happyBlink[0])), happy = sm(hk, 0, 0.16) * (1 - sm(hk, 0.78, 1));
  let blink = Math.max(1 - wake, t > JT.blinkEvery.from ? blinkAt(t - JT.blinkEvery.from, JT.blinkEvery.every, 0) : 0);
  for (const b of JT.blinks) blink = Math.max(blink, t > b && t < b + 0.2 ? Math.sin((Math.PI * (t - b)) / 0.2) : 0);
  const mo = sm(t, ...JT.mouth) * (1 - sm(t, JT.hiss[1] - 0.12, JT.hiss[1])), brows = sm(t, ...JT.brows) * (1 - sm(t, JT.hiss[1], JT.hiss[1] + 0.25));
  let tongue = 0; for (const [a, b] of JT.flicks) { const k = clamp01((t - a) / (b - a)); tongue = Math.max(tongue, Math.sin(Math.PI * k) ** 0.7 * (k > 0 && k < 1 ? 1 : 0)); }
  const look = gaze(t, [[0, [0, 0.1]], [JT.hiss[0], [0, 0.25]], [JT.settle[0], [0.15, 0.1]], [JT.watch[0], [0.85, -0.05]]], 0.3);
  return { rise, hood, amp, blink, closed: happy, happy: sm(t, ...JT.settle), mouth: mo, tongue, brows, look, t };
}

/** Neck + hood path for a pose (3D points from the coil's top end to above the head centre). */
function neckPts(P) {
  const e = coilAt(1), t = P.t, w = 2.2, ph = t * w;
  // transition: from the coil's last point, curving to the centre and up
  const dE = [Math.sin(e.th), -Math.cos(e.th)];                              // spiral direction (θ decreasing)
  const p0 = [e.x, e.h, e.d], p1 = [e.x + dE[0] * 12, e.h + 4, e.d + dE[1] * 12], p2 = [0, e.h + 6, -4], p3 = [0, e.h + 22, 0];
  const pts = [], N0 = 40;
  for (let i = 0; i <= N0; i++) { const k = i / N0, q = 1 - k, B = (j) => q * q * q * p0[j] + 3 * q * q * k * p1[j] + 3 * q * k * k * p2[j] + k * k * k * p3[j];
    const bb = [lerp(DOWN[0], FWD[0], k), lerp(DOWN[1], FWD[1], k), lerp(DOWN[2], FWD[2], k)], bn = Math.hypot(...bb);
    pts.push({ x: B(0), h: B(1), d: B(2), r: lerp(e.r, NECK, k), b: bb.map((v) => v / bn) }); }
  // column: base (0, e.h+22) → head centre; the head rests on the coil (rise 0) or stands tall (rise 1)
  const H0 = e.h + 22, H1 = lerp(e.h + 44, 290, P.rise), D1 = lerp(26, 0, Math.min(1, P.rise)), N1 = 260;
  const headX = P.amp * 0.55 * Math.sin(ph - 2.9) * P.rise;
  const off = (v) => P.amp * (Math.sin(ph - 2.9 * v) - (1 - v) * Math.sin(ph) - v * Math.sin(ph - 2.9)) * Math.min(1, P.rise) + v * headX;
  const HOOD = 50 * P.hood;
  for (let i = 1; i <= N1; i++) {
    const v = (i / N1) * 1.13, vv = Math.min(1, v);
    const hood = v < 0.12 ? 0 : v < 0.8 ? sm(v, 0.12, 0.8) ** 1.25 : v <= 1 ? 1 - 0.12 * sm(v, 0.8, 1) : 0.88 - 2.8 * (v - 1);
    const r = v <= 1 ? lerp(NECK, NECK - 1, v) : lerp(NECK - 1, 6, (v - 1) / 0.13);
    const h = lerp(H0, H1, v), d = lerp(0, D1, vv * vv);
    pts.push({ x: v <= 1 ? off(v) : headX + (v - 1) * 0, h, d, r, hw: Math.max(r, r + HOOD * Math.max(0, hood)), b: FWD });
  }
  return { pts, head: proj(headX, H1, D1), headX };
}

// ---------------------------------------------------------------- shading
function shade(c, ox, oy, samples, a) {
  const g = a < 1 ? fade(c, a) : c, [lx, ly, lz] = LV3, [ux, uy] = LIGHT2;
  const at = (X, Y) => (X < BX0 || Y < BY0 || X >= BX0 + BW || Y >= BY0 + BH ? -1 : I[(Y - BY0) * BW + X - BX0]);
  for (let Y = BY0; Y < BY0 + BH; Y++) {
    const sy = oy + Y; if (sy < 0 || sy >= c.h) continue;
    for (let X = BX0; X < BX0 + BW; X++) {
      const bi = (Y - BY0) * BW + X - BX0, id = I[bi]; if (id < 0) continue;
      const sx = ox + X; if (sx < 0 || sx >= c.w) continue;
      const S = samples[id];
      // outline: silhouette (lit side lighter) or a far part seen behind a nearer one
      let edge = false, far = false;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = at(X + dx, Y + dy); if (n < 0) { edge = true; break; }
        if (n !== id) { const T = samples[n]; if (Math.abs(T.s - S.s) > 2.4 * Math.max(T.r, S.r) && Z[bi + dx + dy * BW] > Z[bi] + 1) far = true; }
      }
      if (edge) { g.px(sx, sy, at(R(X + ux * 1.5), R(Y + uy * 1.5)) < 0 ? LIT : OUT); continue; }
      if (far) { g.px(sx, sy, OUT); continue; }
      const q = Q[bi], u = q / S.r, nx = -S.ty, ny = S.tx;
      let ramp = GREEN, v;
      if (Math.abs(u) <= 1) {
        const nz = Math.sqrt(1 - u * u), Nx = u * nx, Ny = u * ny, dot = Nx * lx + Ny * ly + nz * lz, bel = Nx * S.b[0] + Ny * S.b[1] + nz * S.b[2];
        const thr = S.b === DOWN ? 0.6 : 0.84;
        if (bel > thr) { ramp = BELLY; v = 3.9 + 2.4 * dot; if (((S.s % 6) + 6) % 6 < 1.15) v -= 1.6; if (bel - thr < 0.05) v -= 0.8; }
        else { v = 2.5 + 3.3 * dot; const chev = (((S.s + Math.abs(u) * S.r * 0.9) % 30) + 30) % 30; if (chev < 7) v -= 1.5; if (dot > 0.9) v = 7.2; }
      } else {
        const w = (Math.abs(q) - S.r) / Math.max(1, S.hw - S.r), left = q * nx < 0 ? 1 : 0;
        if (w > 0.8) { ramp = GREEN; v = 4.4 - (w - 0.8) * 7 + (left ? 0.9 : -0.3); }        // the green back of the hood wraps round its rim
        else { ramp = HOODR; v = 5.5 - 1.5 * w + (left ? 0.45 : -0.55); if (w < 0.08) v -= 1.6;
          const rib = (w * 3 + 0.2) % 1; if (w > 0.18 && w < 0.74 && rib < 0.1) v -= 1.0; }
      }
      const fl = Math.floor(v), f = v - fl, qq = f < 0.38 ? fl : f > 0.62 ? fl + 1 : (f - 0.38) / 0.24 > bayer(sx, sy) ? fl + 1 : fl;
      g.px(sx, sy, ramp[Math.max(1, Math.min(7, qq))]);
    }
  }
}

// ---------------------------------------------------------------- head and face
/**
 * Big glossy eye (cute.mjs `eye` look: amber iris bands, round pupil, two highlights) whose lid closes WITHOUT leaving
 * an outlined disc: the outline above the lid line fades into the lid colour as it closes, so a closed eye is a soft
 * lid with a dark lash curve. `closed` 0..1 bends that curve into a happy "^" (smiling closed eye).
 */
function snakeEye(c, x, y, r, ry, o = {}) {
  const iris = RAMP.amber, look = o.look ?? [0, 0], blink = clamp01(o.blink ?? 0), a = o.a ?? 1, g = fade(c, a), lid = o.lid, happy = clamp01(o.happy ?? 0);
  const inE = (X, Y, rx, ryy, cx = x, cy = y) => ((X - cx) / rx) ** 2 + ((Y - cy) / ryy) ** 2 <= 1;
  const lidY = y - ry + 2 * ry * blink;
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    if (!inE(X + 0.5, Y + 0.5, r + 0.6, ry + 0.6)) continue;
    const edge = !inE(X + 0.5, Y + 0.5, r - 0.6, ry - 0.6);
    if (Y + 0.5 < lidY) { if (edge ? (1 - blink) * 1.4 > bayer(X, Y) : Y + 0.5 > lidY - 2 && blink < 0.9) g.px(X, Y, edge ? OUT : lid[0]); continue; }   // the head's own skin is the lid
    if (edge) { g.px(X, Y, OUT); continue; }
    const v = (Y - (y - ry)) / (2 * ry), s = v * (iris.length - 2) + 0.2, lo = Math.floor(s);
    let col = iris[Math.max(1, Math.min(iris.length - 1, s - lo > 0.35 + 0.3 * bayer(X, Y) ? lo + 1 : lo))];
    if (v < 0.24) col = iris[1];
    if (inE(X + 0.5, Y + 0.5, r * 0.5, ry * 0.52, x + look[0] * r * 0.25, y + look[1] * ry * 0.2)) col = OUT;
    g.px(X, Y, col);
  }
  if (blink > 0.02) for (let X = R(x - r); X <= R(x + r); X++) {
    const u = (X - x) / r, bow = blink > 0.8 ? ((blink - 0.8) / 0.2) * (2.5 + happy * 3.5) * (1 - u * u) * (happy > 0.5 ? -1 : 1) : 0, yy = R(lidY - (happy > 0.5 ? 0 : 0) + bow - (blink > 0.8 ? happy * 4 : 0));
    if (inE(X + 0.5, yy + 0.5, r + 0.6, ry + 0.6) || blink > 0.95) { g.px(X, yy, OUT); if (blink > 0.85) g.px(X, yy + 1, OUT); }
  }
  const hx = x - r * 0.38 + look[0] * r * 0.2, hy = y - ry * 0.42 + look[1] * ry * 0.15, hr = Math.max(1.2, r * 0.3);
  if (hy - hr > lidY) for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) if (inE(X + 0.5, Y + 0.5, hr, hr * 1.1, hx, hy)) g.px(X, Y, "#FFFFFF");
  const sx = x + r * 0.36 + look[0] * r * 0.2, sy = y + ry * 0.34;
  if (sy - 1 > lidY) { g.px(R(sx), R(sy), "#FFFFFF"); g.px(R(sx) + 1, R(sy), "#FFFFFF"); g.px(R(sx), R(sy) + 1, "#FFFFFF"); g.px(R(sx) + 1, R(sy) + 1, "#E8E4FF"); }
}

const HEAD = { rx: 54, ry: 41, eyeX: 21, eyeY: -2, eyeR: 14.5, eyeRy: 16, mouthY: 25 };
function drawHead(c, hx, hy, ang, P, a = 1) {
  const cs = Math.cos(ang), sn = Math.sin(ang), T = (x, y) => [hx + x * cs - y * sn, hy + x * sn + y * cs], poly = (pts) => pts.map(([x, y]) => T(x, y));
  const H = HEAD;
  blob(c, [poly(ell(0, -6, H.rx - 2, H.ry - 2)), poly(ell(0, 8, H.rx, H.ry - 8)), poly(ell(0, 19, H.rx - 20, H.ry - 20))], { ramp: GREEN, litOutline: LIT, thick: 26, base: 2.5, gain: 2.6, slope: 0.6, a });
  const g = fade(c, a);
  // pale upper lip / chin (cobras have a light lip) and two head-plate creases on the crown
  for (let x = -27; x <= 27; x++) { const u = x / 27, y0 = 22 + 5 * u * u, y1 = 34 - 3 * u * u; for (let y = R(y0); y <= R(y1); y++) { const p = T(x, y), k = (y - y0) / (y1 - y0); if (k < 0.8 || bayer(R(p[0]), R(p[1])) < (1 - k) * 4) g.px(R(p[0]), R(p[1]), k < 0.25 ? BELLY[5] : BELLY[6]); } }
  for (const sd of [-1, 1]) for (let k = 0; k <= 11; k++) { const p = T(sd * (5 + k * 0.5), -44 + k * 1.7); g.px(R(p[0]), R(p[1]), GREEN[3]); }
  // eyes (lids in the head's own greens)
  for (const sd of [-1, 1]) { const e = T(sd * H.eyeX, H.eyeY); snakeEye(c, e[0], e[1], H.eyeR, H.eyeRy, { look: P.look, blink: Math.max(P.blink, P.closed), happy: P.closed, lid: [GREEN[4], GREEN[5]], a }); }
  // cute angry brows during the hiss
  if (P.brows > 0.02) { const gb = fade(c, P.brows * a); for (const sd of [-1, 1]) for (let k = 0; k <= 14; k++) { const p = T(sd * (9 + k), -21 - k * 0.5 - (k > 11 ? (k - 11) * 0.3 : 0)); for (const dy of [0, 1, 2]) gb.px(R(p[0]), R(p[1]) + dy, dy === 2 ? GREEN[2] : OUT); } }
  for (const sd of [-1, 1]) { const b = T(sd * 37, 17); blush(c, b[0], b[1], 9, 4, "#F27A9A", a); }
  for (const sd of [-1, 1]) { const n = T(sd * 6, 14); g.px(R(n[0]), R(n[1]), OUT); g.px(R(n[0]) + sd, R(n[1]), OUT); g.px(R(n[0]), R(n[1]) - 1, GREEN[3]); }
  // mouth: smile (wider when happy) or the open hissing mouth with two little fangs; the forked tongue flicks out of it
  const m = T(0, H.mouthY);
  if (P.mouth > 0.04) {
    const w = R(9 + P.mouth * 3), oh = Math.max(2, R(2 + P.mouth * 10));
    for (let j = 0; j <= oh; j++) { const half = R(w * Math.sqrt(Math.max(0, 1 - (j / (oh + 0.5)) ** 2)) * (j === 0 ? 1 : 0.94)); for (let i = -half; i <= half; i++) g.px(R(m[0]) + i, R(m[1]) + j, j === 0 || Math.abs(i) === half || j === oh ? OUT : j > oh * 0.55 ? TONGUE[1] : TONGUE[0]); }
    if (P.mouth > 0.4) for (const sd of [-1, 1]) for (let j = 1; j <= Math.min(4, oh - 2); j++) { const ww = j < 3 ? 2 : 1; for (let i = 0; i < ww; i++) g.px(R(m[0]) + sd * (5 + i), R(m[1]) + j, j === 1 ? "#FFFFFF" : "#F0ECFF"); }
    if (P.tongue > 0.02) {
      const L = 5 + P.tongue * 25, wob = Math.sin(P.t * 47) * 1.5 * P.tongue, x0 = R(m[0]), y0 = R(m[1]) + oh - 3;
      const pt = (k) => [x0 + wob * (k / L) ** 2, y0 + k];
      for (let k = 0; k <= L; k++) { const [x, y] = pt(k); g.px(R(x) - 3, R(y), OUT); g.px(R(x) + 2, R(y), OUT); g.px(R(x) - 2, R(y), TONGUE[1]); g.px(R(x) - 1, R(y), TONGUE[3]); g.px(R(x), R(y), TONGUE[2]); g.px(R(x) + 1, R(y), TONGUE[1]); }
      const [ex, ey] = pt(L); for (const sd of [-1, 1]) for (let k = 1; k <= 7; k++) { const x = R(ex - 0.5 + sd * (1 + k * 0.85)), y = R(ey + k); g.px(x + sd, y, OUT); g.px(x, y, TONGUE[2]); g.px(x - sd, y, k < 3 ? TONGUE[1] : TONGUE[2]); g.px(x, y + 1, OUT); }
      for (let i = -3; i <= 2; i++) g.px(R(ex) + i, R(ey) + 1, TONGUE[1]);
    }
  } else {
    const w = R(lerp(10, 13, P.happy)), dip = lerp(3.2, 4.4, P.happy);
    for (let i = -w; i <= w; i++) { const u = i / w, p = T(i, H.mouthY + dip * (1 - u * u)); g.px(R(p[0]), R(p[1]), OUT); if (Math.abs(u) < 0.5) g.px(R(p[0]), R(p[1]) + 1, OUT); }
    for (const sd of [-1, 1]) { const p = T(sd * (w + 1), H.mouthY - 1); g.px(R(p[0]), R(p[1]), OUT); }
  }
}

// ---------------------------------------------------------------- public: draw the snake with its coil centre on the ground at (gx, gy)
export function drawSnake(c, gx, gy, t, a = 1) {
  if (!COIL) buildCoil();
  const P = snakePose(t), breath = Math.sin(t * 2.4) * 1.2 * P.rise;
  Z.set(COIL.Z); I.set(COIL.I); Q.set(COIL.Q);
  const samples = COIL.samples.slice(), base = samples.length;
  const dyn = [];
  toSamples(tailPts(t), dyn, 0, -1);
  const N = neckPts({ ...P }), neck = toSamples(N.pts, [], COIL.sEnd);
  for (const s of neck) { s.y += breath * Math.max(0, -s.y - 120) / 180; dyn.push(s); }
  dyn.forEach((s, i) => { samples.push(s); raster(s, base + i); });
  const ox = R(gx), oy = R(gy) - 3;
  shade(c, ox, oy, samples, a);
  // head: on top of the neck, tilted with the neck's sway
  const top = neck[neck.length - 40], tilt = Math.atan2(top.tx, -top.ty) * 0.6 + Math.sin(t * 2.2 - 3.3) * 0.03 * P.amp / 8;
  drawHead(c, ox + N.head[0], oy + N.head[1] + breath, tilt, P, a);
  return { head: [ox + N.head[0], oy + N.head[1] + breath], pose: P };
}

// ---------------------------------------------------------------- ICON: the hooded head, ~56×56, for the readout and the guess cards
let ICON_L = null;
function iconLayer() {
  const L = new Layer(64, 64), g = L.g, cx = 32, cy = 33, sm2 = (pts, k = 1) => pts.map(([x, y]) => [cx + x * k, cy + y * k]);
  // hood: a spade-shaped shield (green back wrapping round the rim, pale front, yellow belly strip up the middle)
  const hood = [[-9, -11], [-19, -8], [-26, -1], [-27, 6], [-23, 14], [-14, 21], [-7, 27], [7, 27], [14, 21], [23, 14], [27, 6], [26, -1], [19, -8], [9, -11]];
  blob(g, [ell(cx, cy + 1, 26, 15, 0, 40), sm2(hood)], { ramp: GREEN, litOutline: LIT, thick: 6, base: 3.4, gain: 1.4, slope: 0.2 });
  blob(g, [sm2(hood.map(([x, y]) => [x * 0.82, y * 0.86 + 1]))], { ramp: HOODR, outline: GREEN[3], litOutline: HOODR[7], thick: 8, base: 4.2, gain: 1.6, slope: 0.5 });
  for (const sd of [-1, 1]) for (let k = 0; k < 10; k++) { g.px(R(cx + sd * (11 + k * 0.5)), cy - 2 + k, HOODR[3]); g.px(R(cx + sd * (17 + k * 0.2)), cy - 4 + k, HOODR[3]); }
  for (let y = cy + 4; y <= cy + 28; y++) for (let x = cx - 5; x <= cx + 5; x++) { const e = Math.abs(x - cx) === 5; g.px(x, y, e ? BELLY[2] : (y - cy) % 3 === 0 ? BELLY[3] : x < cx ? BELLY[6] : BELLY[5]); }
  // head on top
  blob(g, [ell(cx, cy - 10, 19, 14), ell(cx, cy - 5, 18, 10), ell(cx, cy, 11, 6)], { ramp: GREEN, litOutline: LIT, thick: 9, base: 2.6, gain: 2.4, slope: 0.5 });
  for (let x = -9; x <= 9; x++) { const u = x / 9; g.px(cx + x, R(cy + 1 + 1.4 * u * u), BELLY[5]); g.px(cx + x, R(cy + 2 + 1.2 * u * u), BELLY[6]); }
  for (const sd of [-1, 1]) snakeEye(g, cx + sd * 7.5, cy - 10, 5.8, 6.6, { lid: [GREEN[4], GREEN[5]] });
  for (const sd of [-1, 1]) blush(g, cx + sd * 13, cy - 3, 3.6, 1.8);
  g.px(cx - 2, cy - 2, OUT); g.px(cx + 2, cy - 2, OUT);
  for (let i = -4; i <= 4; i++) { const u = i / 4; g.px(cx + i, R(cy + 1 + 1.5 * (1 - u * u)), OUT); }
  return L;
}
export function ICON(c, cx, cy, a = 1) { ICON_L ??= iconLayer(); ICON_L.blit(c, R(cx) - 32, R(cy) - 32, { a }); }
