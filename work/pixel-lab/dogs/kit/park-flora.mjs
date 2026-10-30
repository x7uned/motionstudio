// Dog series park (2026-10-23) · trees: the far tree line (p 0.45), mid trees / poplars / conifers / bushes (p 0.6–0.75),
// and the big oak at LAYOUT.oak (p 0.82) whose crown frames the upper right of the hook shot. Leafy balls with volume
// shading in tone bands (park-px ball), drawn front-to-back. Crowns sway a little with the loop-periodic wind.
import { LAYOUT } from "./layout.mjs";
import { layer } from "./layout.mjs";
import { ramp, rgb, mixc, hazed, band, by, h1, h2, ball, poly, rect, stroke } from "./park-px.mjs";
import { frameAt, wind } from "./park-geo.mjs";

const SKYHAZE = "#A9D2DE";
export const OAK = ramp(["#0F331A", "#154322", "#1C5429", "#246731", "#2E7B38", "#3A9040", "#4AA44A", "#5FB857", "#7ACA68", "#9CDA80"]);
const MID = ramp(["#163E23", "#1C4D29", "#255F30", "#307238", "#3D8640", "#4D9A49", "#62AE56", "#7EC168", "#9DD27E"]);
const MID_BLUE = ramp(["#163A30", "#1C4A38", "#245C42", "#2E6E4C", "#3A8256", "#4A9662", "#5EAA70", "#78BC82"]);
const BUSH = ramp(["#123A1E", "#184A24", "#205C2A", "#2A6E30", "#368236", "#44963E", "#56A848", "#6EBA56", "#8CCA6C"]);
export const BARK = ramp(["#1E120B", "#331F12", "#4C301C", "#664226", "#825632", "#9E6E42", "#BA8A58", "#D2A876"]);
const TL = hazed(MID, SKYHAZE, 0.42);
const TL_DEEP = hazed(MID, SKYHAZE, 0.5);
const BLOSSOM = { white: [rgb("#FFFFFF"), rgb("#DCDDF2")], purple: [rgb("#B48CF0"), rgb("#8058C8")], yellow: [rgb("#FFE45A"), rgb("#E0B828")], blue: [rgb("#8CB0FF"), rgb("#5A7CD8")] };

// ---------------------------------------------------------------- far tree line (layer units at p 0.45)
export function treeLine(S, cam, t, P) {
  const p = 0.45, V = layer(cam, p), z = V.z, base = V.Y(0), xa = V.wx(-40), xb = V.wx(S.w + 40);
  const R = TL, n = Math.floor(xa / 15) - 1, m = Math.ceil(xb / 15) + 1;
  // low row first (front), then the crowns above; occasional tall poplar silhouettes
  for (const row of [0, 1]) for (let i = n; i <= m; i++) {
    const s = i * 5 + row * 1777, x = i * 15 + h1(s + 1) * 10, env = 0.75 + 0.25 * Math.sin(i * 0.21 + 1.3) + 0.18 * Math.sin(i * 0.67);
    if (row === 0) { const r = 9 + h1(s + 2) * 6; ball(S, V.X(x), base - (r * 0.75) * z, r * z, TL_DEEP, { seed: s, amp: 0.13, bumps: 7, lift: -0.18, sparkle: 0.2, outline: TL_DEEP[1] }); continue; }
    const poplar = h1(s + 3) < 0.09, r = poplar ? 8 + h1(s + 2) * 3 : 11 + h1(s + 2) * 8, hgt = poplar ? 62 + h1(s + 4) * 16 : (26 + h1(s + 4) * 26) * env + r * 0.3;
    if (poplar) { for (let k = 0; k < 4; k++) ball(S, V.X(x), base - (hgt - k * 13) * z, (r - k * 0.5 - (k === 0 ? 2.5 : 0)) * z, R, { seed: s + k, amp: 0.1, bumps: 6, lift: 0.08 - k * 0.06, sparkle: 0.25, outline: R[1] }); continue; }
    ball(S, V.X(x), base - hgt * z, r * z, R, { seed: s, amp: 0.13, bumps: 8, lift: 0.04, sparkle: 0.3, outline: R[1] });
  }
  // under-storey band down to the ground (dark, with a few trunks)
  const y0 = Math.round(base - 11 * z), y1 = Math.round(base), ox = Math.round(V.X(0));
  for (let Y = Math.max(0, y0); Y <= Math.min(S.h - 1, y1); Y++) for (let X = 0; X < S.w; X++) {
    if (S.o[Y * S.w + X]) continue;
    const wx = V.wx(X + 0.5), trunk = ((wx % 15) + 15) % 15 < 1.6 * (1 / Math.max(1, z * 0.6)) + 0.8 && Y > y0 + 2;
    S.put(X, Y, trunk ? TL_DEEP[0] : TL_DEEP[band(1.3 + (Y - y0) / Math.max(1, y1 - y0) * -0.6 + (h2(X - ox, Y) - 0.5) * 0.6, TL_DEEP.length - 1, X - ox, Y)]);
  }
}

// ---------------------------------------------------------------- mid trees (layer coordinates; sizes in real units)
const MIDS = [
  // hook-visible ones
  { kind: "round", x: -262, p: 0.66, h: 300, r: 104, seed: 3 },
  { kind: "bush", x: -170, p: 0.75, w: 120, h: 56, seed: 21, flowers: "white" },
  { kind: "poplar", x: 170, p: 0.7, h: 330, r: 44, seed: 7 },
  { kind: "bush", x: 225, p: 0.74, w: 110, h: 50, seed: 23 },
  { kind: "round", x: 60, p: 0.6, h: 250, r: 88, seed: 5, blue: 1 },
  // left part of the park (bench and lamp side)
  { kind: "conifer", x: -470, p: 0.68, h: 300, r: 70, seed: 9 },
  { kind: "round", x: -640, p: 0.72, h: 320, r: 112, seed: 11 },
  { kind: "bush", x: -540, p: 0.75, w: 140, h: 60, seed: 25, flowers: "purple" },
  { kind: "poplar", x: -820, p: 0.64, h: 340, r: 46, seed: 13 },
  { kind: "round", x: -980, p: 0.7, h: 300, r: 100, seed: 15, blue: 1 },
  { kind: "bush", x: -900, p: 0.74, w: 120, h: 52, seed: 27, flowers: "yellow" },
  { kind: "round", x: -1250, p: 0.66, h: 310, r: 108, seed: 17 },
  { kind: "conifer", x: -1120, p: 0.62, h: 280, r: 64, seed: 19 },
  // right part (across the park, the far bench at x 760, p 0.62)
  { kind: "round", x: 520, p: 0.64, h: 300, r: 100, seed: 31 },
  { kind: "bush", x: 600, p: 0.68, w: 120, h: 54, seed: 33, flowers: "blue" },
  { kind: "round", x: 905, p: 0.6, h: 290, r: 104, seed: 35, blue: 1 },
  { kind: "poplar", x: 1010, p: 0.7, h: 340, r: 46, seed: 37 },
  { kind: "conifer", x: 1120, p: 0.66, h: 290, r: 68, seed: 39 },
  { kind: "bush", x: 1000, p: 0.74, w: 130, h: 56, seed: 41, flowers: "white" },
  { kind: "round", x: 1300, p: 0.7, h: 320, r: 110, seed: 43 },
  { kind: "bush", x: 1210, p: 0.75, w: 120, h: 50, seed: 45, flowers: "purple" },
  { kind: "round", x: 1560, p: 0.66, h: 300, r: 100, seed: 47, blue: 1 },
  { kind: "round", x: -1560, p: 0.7, h: 300, r: 104, seed: 49 },
].sort((a, b) => b.p - a.p);
export const MID_TREES = MIDS;

/** Crown made of leafy balls, laid out once per tree (real units relative to the trunk base). */
const CROWNS = new Map();
function crownOf(T) {
  let c = CROWNS.get(T); if (c) return c; c = [];
  const s = T.seed * 101;
  if (T.kind === "round") {
    const cy = -T.h + T.r, N = 15;
    for (let i = 0; i < N; i++) {
      const a = h1(s + i * 3) * Math.PI * 2, d = Math.sqrt(h1(s + i * 3 + 1)) * T.r * 0.62, x = Math.cos(a) * d * 1.05, y = cy + Math.sin(a) * d * 0.85;
      c.push({ x, y, r: T.r * (0.36 + h1(s + i * 3 + 2) * 0.16), lift: -0.12 + (cy - y) / T.r * 0.22 });
    }
    c.push({ x: 0, y: cy, r: T.r * 0.62, lift: -0.3 });
  } else if (T.kind === "poplar") {
    for (let k = 0; k < 9; k++) { const f = k / 8, y = -T.h * (0.28 + 0.66 * f), w = T.r * (1.05 - 0.55 * f * f) * (k === 8 ? 0.7 : 1); c.push({ x: (h1(s + k) - 0.5) * T.r * 0.3, y, r: w * 0.72, lift: -0.1 + 0.25 * f }); }
  } else if (T.kind === "bush") {
    for (let k = 0; k < 6; k++) { const f = k / 5 - 0.5, r = T.h * (0.48 + h1(s + k) * 0.22) * (1 - Math.abs(f) * 0.45); c.push({ x: f * T.w * 0.78, y: -r * 0.85 - (1 - Math.abs(f) * 2) * T.h * 0.18, r, lift: -0.05 + h1(s + k + 9) * 0.2 }); }
  }
  // front-to-back: lower / outer clusters first
  c.sort((a, b) => (b.y + b.r * 0.6) - (a.y + a.r * 0.6));
  CROWNS.set(T, c); return c;
}
function trunk(S, f, w0, w1, hgt, lean = 0, ramp_ = BARK) {
  const X = f.X0, Y = f.Y0, s = f.s, ox = Math.round(X), y0 = Math.max(0, Math.floor(Y - hgt * s)), y1 = Math.min(S.h - 1, Math.round(Y));
  for (let yy = y0; yy <= y1; yy++) {
    const k = (Y - yy - 0.5) / Math.max(1, hgt * s), flare = k < 0.14 ? ((0.14 - k) / 0.14) ** 2 * w0 * 0.75 : 0, hw = Math.max(0.6, (w0 + (w1 - w0) * k + flare) * s), cx = X + lean * s * k;
    for (let xx = Math.max(0, Math.floor(cx - hw)); xx <= Math.min(S.w - 1, Math.ceil(cx + hw)); xx++) {
      const u = (xx + 0.5 - cx) / hw; if (u < -1 || u > 1) continue;
      let c;
      if (hw > 1.6 && Math.abs(u) > 1 - 1.15 / hw) c = ramp_[0];
      else {
        const col = Math.floor((xx - ox) / Math.max(1, s * 2.2)), groove = h2(col, Math.floor((Y - yy) / Math.max(1, s * 9))) < 0.28;
        const v = 4.4 - u * 1.8 - (groove ? 1.1 : 0) - (k > 0.75 ? (k - 0.75) * 7 : 0) - (k < 0.04 ? 1 : 0);
        c = ramp_[band(v, ramp_.length - 1, xx - ox, yy)];
      }
      S.put(xx, yy, c);
    }
  }
}
function midTree(S, cam, T, t, P) {
  const f = frameAt(cam, T.p, T.x), s = f.s, span = (T.kind === "bush" ? T.w : T.r * 2.4) * s;
  if (f.X0 + span < 0 || f.X0 - span > S.w || f.Y0 - T.h * 1.1 * s > S.h || f.Y0 < -10) return;
  const hz = (0.75 - T.p) * 0.9, R = T.kind === "bush" ? hazed(BUSH, SKYHAZE, hz * 0.8) : T.kind === "conifer" || T.blue ? hazed(MID_BLUE, SKYHAZE, hz) : hazed(MID, SKYHAZE, hz);
  const sw = wind(t, P, T.x) * (T.kind === "bush" ? 0.6 : 1.6);
  if (T.kind === "conifer") {
    // layered fir: stacked skirts, each a flattened triangle with a lit left side
    const tiers = 7, ox = Math.round(f.X0);
    for (let k = tiers - 1; k >= 0; k--) {                         // top tier first: each skirt overlaps the one below
      const fk = k / (tiers - 1), yB = -T.h * (0.14 + 0.8 * fk) + 0, w = T.r * (1.12 - 0.92 * fk), hT = T.h * 0.24, xs = sw * fk * 1.2;
      const ax = f.X(xs), ay = f.Y(yB - hT), lx = f.X(-w + xs * 0.6), rx = f.X(w + xs * 0.6), by_ = f.Y(yB);
      poly(S, [[ax, ay], [rx, by_], [(ax + rx) / 2, by_ + 3 * s], [ax, by_ + 4 * s], [(ax + lx) / 2, by_ + 3 * s], [lx, by_]], (x, y) => {
        const u = (x - ax) / Math.max(1, rx - lx) * 2, v = (y - ay) / Math.max(1, by_ - ay);
        if (v > 0.86 || Math.abs(u) > v * 0.98 - 0.02) return R[1];
        const val = 3.3 - u * 2.2 - v * 1.2 + (h2(x - ox, y) - 0.5) * 0.8; return R[band(val, R.length - 1, x - ox, y)];
      });
    }
    trunk(S, f, 7, 5, T.h * 0.16, 0, BARK);
    return;
  }
  const crown = crownOf(T);
  if (T.kind === "bush" && T.flowers) {
    const [pc, pd] = BLOSSOM[T.flowers];
    for (let k = 0; k < 26; k++) {
      const b = crown[Math.floor(h1(T.seed * 7 + k) * crown.length)], a = -Math.PI * (0.15 + h1(T.seed * 9 + k) * 0.7), d = b.r * (0.35 + h1(T.seed * 11 + k) * 0.55);
      const x = f.X(b.x + Math.cos(a) * d + sw * 0.4), y = f.Y(b.y + Math.sin(a) * d), r = Math.max(0.6, 2.4 * s);
      if (r < 1.2) { S.put(Math.round(x), Math.round(y), pc); continue; }
      for (let Y = Math.floor(y - r); Y <= Math.ceil(y + r); Y++) for (let X = Math.floor(x - r); X <= Math.ceil(x + r); X++) { const d2 = (X + 0.5 - x) ** 2 + (Y + 0.5 - y) ** 2; if (d2 <= r * r) S.put(X, Y, Y + 0.5 > y + r * 0.3 ? pd : pc); }
    }
  }
  for (const b of crown) {
    const k = Math.max(0, -b.y / T.h);
    ball(S, f.X(b.x + sw * k * k), f.Y(b.y), b.r * s, R, { seed: T.seed * 31 + Math.round(b.x), amp: 0.13, bumps: T.kind === "poplar" ? 7 : 9, lift: b.lift, sparkle: 0.45, outline: R[0] });
  }
  if (T.kind === "bush") return;
  if (T.kind === "round") {
    // two limbs showing between the clusters
    const cy = -T.h + T.r;
    stroke(S, f.X(0), f.Y(-T.h * 0.3), f.X(-T.r * 0.45), f.Y(cy + T.r * 0.1), Math.max(0.7, 4 * s), BARK[1]);
    stroke(S, f.X(0), f.Y(-T.h * 0.35), f.X(T.r * 0.4), f.Y(cy), Math.max(0.7, 3.5 * s), BARK[1]);
  }
  trunk(S, f, T.kind === "poplar" ? 8 : 12, T.kind === "poplar" ? 5 : 7, T.h * (T.kind === "poplar" ? 0.32 : 0.64), 0, BARK);
}
export function midTrees(S, cam, t, P) { for (const T of MIDS) midTree(S, cam, T, t, P); }
export { midTree };
/** Shadows the mid trees cast on the back lawn (for park-lawn backLawn). */
export function midShadows() {
  return MIDS.map((T) => ({ x: T.x + (T.kind === "bush" ? 10 : 30) * T.p, p: T.p - 0.004, rx: (T.kind === "bush" ? T.w * 0.62 : T.r * 0.9) * T.p, rp: 0.022, k: 1.2, p0: T.p - 0.03, p1: T.p + 0.03 }));
}

// ---------------------------------------------------------------- the big oak (p 0.82, x = LAYOUT.oak.x)
const OAK_H = 770;
// crown envelope (real units from the trunk base): a broad dome with a low lobe reaching left — in the hook shot only the
// lobe and the left part of the dome show, framing the upper right corner (screen x ≥ ~410, y ≤ ~300)
const OAK_LOBES = [[-20, -590, 232, 160], [-172, -505, 84, 60], [150, -500, 112, 104], [0, -690, 150, 72], [-130, -640, 110, 70], [30, -400, 118, 82], [190, -400, 70, 62]];
const inCrown = (x, y, m = 0) => OAK_LOBES.some(([lx, ly, rx, ry]) => ((x - lx) / Math.max(1, rx - m)) ** 2 + ((y - ly) / Math.max(1, ry - m)) ** 2 <= 1);
const OAK_CROWN = [];
{
  let k = 0;
  for (let gy = -790; gy <= -330; gy += 34) for (let gx = -320; gx <= 320; gx += 38) {
    k++; const x = gx + (h1(k * 3 + 5) - 0.5) * 22 + (Math.round(gy / 34) & 1) * 19, y = gy + (h1(k * 3 + 6) - 0.5) * 18;
    if (!inCrown(x, y, 8)) continue;
    OAK_CROWN.push({ x, y, r: 31 + h1(k * 3 + 7) * 15, seed: 900 + k });
  }
  for (let i = 0; i < 9; i++) { const x = -175 + i * 52 + (h1(i + 77) - 0.5) * 14, y = (x < -100 ? -452 : x < 230 ? -345 + Math.abs(x - 40) * 0.12 : -380) + h1(i + 78) * 14; OAK_CROWN.push({ x, y, r: 27 + h1(i + 79) * 9, seed: 950 + i, hang: 1 }); }
  const top = -OAK_H, bot = -330;
  for (const b of OAK_CROWN) { const f = Math.max(0, Math.min(1, (b.y - top) / (bot - top))); b.lift = 0.24 - f * 0.46 - (b.x + 20) / 300 * 0.1 + (b.hang ? -0.04 : 0); }
  OAK_CROWN.sort((a, b) => (b.y + b.r * 0.5) - (a.y + a.r * 0.5));
}
export const OAK_INFO = { x: LAYOUT.oak.x, p: LAYOUT.oak.p, height: OAK_H, crown: { x0: -300, x1: 300, y0: -OAK_H, y1: -300 } };
const OAK_LIMBS = [
  // polylines [x, y, r] real units from the trunk base
  [[0, -262, 17], [-70, -360, 12], [-130, -430, 9], [-205, -480, 5]],
  [[6, -262, 16], [80, -370, 11], [140, -450, 8], [190, -500, 5]],
  [[2, -270, 15], [-8, -400, 11], [-30, -520, 8], [-60, -620, 5]],
  [[-130, -430, 7], [-150, -540, 5]], [[140, -450, 7], [120, -580, 5]],
];
const OAK_FILL = [[-20, -590, 150], [-150, -515, 52], [140, -505, 76], [0, -680, 70], [-120, -640, 60], [30, -420, 80], [180, -410, 44]];
export function oak(S, cam, t, P) {
  const f = frameAt(cam, LAYOUT.oak.p, LAYOUT.oak.x), s = f.s;
  if (f.X0 + 340 * s < 0 || f.X0 - 340 * s > S.w || f.Y0 - OAK_H * s > S.h || f.Y0 + 10 * s < 0) return;
  const sw = wind(t, P, LAYOUT.oak.x);
  // 1) leaf clusters (front-to-back), lower ones sway more
  for (const b of OAK_CROWN) {
    const k = b.hang ? 2.2 : 1 - (b.y + OAK_H) / OAK_H * 0.4, dx = sw * 2.2 * k;
    ball(S, f.X(b.x + dx), f.Y(b.y), b.r * s, OAK, { seed: b.seed, amp: 0.085, bumps: 12, lift: b.lift, sparkle: 0.55, outline: OAK[0] });
  }
  // 2) limbs, then the dark inner foliage that fills most holes (some sky still shows through)
  const limbCol = (X, Y, tt, e, qx) => (e > 0.7 && tt > 0 && tt < 1 ? BARK[0] : qx < -0.25 ? BARK[4] : qx < 0.3 ? BARK[3] : BARK[2]);
  for (const L of OAK_LIMBS) for (let i = 0; i + 1 < L.length; i++) {
    const [x0, y0, r0] = L[i], [x1, y1, r1] = L[i + 1], n = 5;
    for (let j = 0; j < n; j++) { const a = j / n, b = (j + 1) / n; stroke(S, f.X(x0 + (x1 - x0) * a), f.Y(y0 + (y1 - y0) * a), f.X(x0 + (x1 - x0) * b), f.Y(y0 + (y1 - y0) * b), Math.max(0.6, (r0 + (r1 - r0) * a) * s), limbCol); }
  }
  for (const [x, y, r] of OAK_FILL) ball(S, f.X(x), f.Y(y), r * s, OAK.slice(0, 4), { seed: x, amp: 0.12, bumps: 8, lift: -0.15, sparkle: 0, outline: OAK[0] });
  // 3) trunk with flaring roots, bark grooves, lit left side
  const tw = (y) => { const k = -y / 270; return (y > -40 ? 30 + ((y + 40) / 40) ** 2.2 * 24 : 30 - k * 9); };
  const X0 = f.X0, Y0 = f.Y0, top = -275, ox = Math.round(X0);
  for (let Y = Math.max(0, Math.floor(f.Y(top))); Y <= Math.min(S.h - 1, Math.round(Y0)); Y++) {
    const wy = (Y + 0.5 - Y0) / s, hw = tw(wy) * s, cx = X0 + Math.sin(wy * 0.006) * 6 * s;
    for (let X = Math.max(0, Math.floor(cx - hw)); X <= Math.min(S.w - 1, Math.ceil(cx + hw)); X++) {
      const u = (X + 0.5 - cx) / hw; if (Math.abs(u) > 1) continue;
      let c;
      if (Math.abs(u) > 1 - 1.1 / Math.max(1, hw)) c = BARK[0];
      else {
        const gx = (X - ox) / s, groove = Math.sin(gx * 0.55 + Math.sin(wy * 0.045) * 1.6) > 0.78 + (wy > -40 ? 0.1 : 0);
        let v = 4.3 - u * 1.7 - (u > 0.45 ? 0.9 : 0) - (groove ? 1.6 : 0) + (h2(X - ox, Y) - 0.5) * 0.5;
        if (wy > -14) v -= (wy + 14) / 14 * 1.4;                 // dark where the roots meet the grass
        c = BARK[band(v, 7, X - ox, Y)];
      }
      S.put(X, Y, c);
    }
  }
}
export function oakShadow() { return [{ x: LAYOUT.oak.x - 60, p: LAYOUT.oak.p - 0.01, rx: 300, rp: 0.06, k: 1.5, p0: LAYOUT.oak.p - 0.07, p1: LAYOUT.oak.p + 0.06 }]; }
export { TL, MID, BUSH, mixc, by, rect };
