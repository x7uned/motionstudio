// «The last person alive» · Builder P — his hands in first person.
// POV1: right hand gripping a rusty crowbar (bar rising diagonally from the bottom-right, goose-neck hook and split claw
// up-left), charcoal-violet hoodie sleeves, the left hand relaxed at the bottom-left. Pre-rendered once into sprites
// (volume shading), then placed each frame with a step sway and graded by the fire ahead (warm rim on the edges that
// face the light, quantised + dithered). POV3: his knees (dark joggers) and hands resting on them, lit from behind.
import { BT, Sprite, vn, clamp01, GW, GH } from "./pov-core.mjs";
import { ramp, vol, limb, smooth } from "./pov-shade.mjs";

const R = Math.round;
export const HOOD = ramp("#0A0910", "#141220", "#1F1C2E", "#2B273E", "#393350", "#494266", "#5D5682", "#77709E");
export const SKIN = ramp("#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC");
const RUST = ramp("#1A0C0A", "#2E1610", "#4A2216", "#6A321C", "#8E4A24", "#B0662E", "#C88A52");
const STEEL = [[96, 90, 96], [140, 134, 136]];
const JOG = ramp("#09090E", "#121219", "#1C1C26", "#282836", "#363648", "#4A4A60");
const OUT = [10, 8, 14];

// ---------------------------------------------------------------- POV1 sprites (drawn once)
let RIGHT = null, LEFT = null;
const IRON = ramp("#0E0809", "#1C1012", "#2E1A18", "#47261E", "#663424", "#8A4A2C", "#B0683C");
const KN = [42, 20, 20], KN_LIT = [156, 84, 58];
function bake() {
  RIGHT = new Sprite(GW, GH); RIGHT.rim = new Float32Array(GW * GH);
  const g = RIGHT, L = [-0.7, -0.7];
  // bar frame: G = grip centre, v = along the bar toward the hook, n = across (toward down-left)
  const G = [440, 902], v = [-0.85, -0.527], n = [-0.527, 0.85];
  const at = (a, b) => [G[0] + a * v[0] + b * n[0], G[1] + a * v[1] + b * n[1]];
  // forearm in the hoodie sleeve: from the bottom-right corner up to the wrist
  vol(g, [smooth([[560, 905], [522, 872], [492, 868], [468, 884], [462, 918], [474, 960], [500, 990], [560, 990]], null, 4)], { ramp: HOOD, base: 2.5, gain: 1.6, thick: 18, light: L, dir: 1.2, rimLit: 1.3, rimShade: 0.9, slope: 0.7, outline: OUT, litOutline: [72, 64, 104], tex: (X, Y) => (vn(X * 0.08, Y * 0.12) > 0.66 ? -0.7 : 0) });
  // crowbar: the shaft runs through the fist, out up-left to a goose-neck hook with a split claw
  const sh = [at(-50, 2), at(-22, 1), at(10, 0), at(70, 0), at(140, 0), at(182, 0)];
  const hk = (dx, dy) => { const p = at(182, 0); return [p[0] + dx, p[1] + dy]; };
  const bar = [...sh, hk(-9, -3), hk(-15, -10), hk(-15, -18), hk(-10, -24), hk(-2, -26), hk(5, -25)];
  vol(g, [limb(bar, [6.6, 6.4, 6.1, 5.6, 5.1, 4.8, 4.6, 4.4, 4.2, 4.0, 3.7, 3.3], 6)], { ramp: IRON, base: 1.4, gain: 1.5, thick: 5, light: L, dir: 0.4, rimLit: 1.7, rimShade: 1.1, slope: 0.1, outline: OUT, litOutline: [116, 56, 32], tex: (X, Y) => { const q = vn(X * 0.3 + 4, Y * 0.3); return q > 0.7 ? 1.2 : q < 0.22 ? -0.8 : 0; } });
  // claw (two small prongs at the hook tip)
  const tip = hk(5, -25);
  vol(g, [smooth([[tip[0] - 1, tip[1] - 3], [tip[0] + 6, tip[1] - 5], [tip[0] + 9, tip[1] - 3], [tip[0] + 4, tip[1] - 1]], null, 3), smooth([[tip[0] - 1, tip[1] + 2], [tip[0] + 6, tip[1] + 2], [tip[0] + 9, tip[1] + 5], [tip[0] + 3, tip[1] + 4]], null, 3)], { ramp: IRON, base: 2.6, gain: 1, thick: 2, light: L, dir: 0.4, rimLit: 1.5, rimShade: 0.8, slope: 0, outline: OUT, litOutline: [130, 64, 36] });
  // worn steel glints along the lit edge of the shaft
  for (let k = 0; k < 14; k++) { const a = 24 + k * 10.5; if (vn(k * 2.3, 5) < 0.42) continue; const p = at(a, -4.2); g.px(R(p[0]), R(p[1]), [150, 140, 138]); g.px(R(p[0] - 1), R(p[1]), [104, 96, 98]); }
  // ribbed cuff at the wrist
  vol(g, [smooth([at(-34, -26), at(-22, -30), at(-6, -22), at(-6, -8), at(-16, 6), at(-30, 8), at(-40, -6)], null, 3)].map((p) => p.map(([x, y]) => [x + 20, y + 16])), { ramp: HOOD, base: 3.0, gain: 1.1, thick: 5, light: L, dir: 1, rimLit: 1.2, rimShade: 0.7, slope: 0.3, outline: OUT, litOutline: [82, 74, 112], tex: (X, Y) => ((X * 2 + Y) % 4 === 0 ? -0.9 : 0) });
  fist(g, at, L);
  // thumb wrapped over the bar toward the hook, its nail catching light
  vol(g, [limb([at(-14, -24), at(-26, -14), at(-31, -3), at(-30, 4)], [7.5, 6.8, 6.0, 5.2], 5)], { ramp: SKIN, base: 3.1, gain: 1.2, thick: 4, light: L, dir: 1.0, rimLit: 1.4, rimShade: 0.9, slope: 0.3, outline: KN, litOutline: KN_LIT });
  const nail = at(-31, 1); for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [-1, 1]]) g.px(R(nail[0]) + dx, R(nail[1]) + dy, [238, 196, 170]);
  rimMask(g, L);

  // left: a loosely curled fist low at the bottom-left (partly below the frame), sleeve from the corner
  LEFT = new Sprite(GW, GH); LEFT.rim = new Float32Array(GW * GH);
  const h = LEFT, L2 = [-0.35, -0.94];
  vol(h, [smooth([[-20, 900], [26, 890], [62, 900], [84, 926], [88, 968], [-20, 968]], null, 4)], { ramp: HOOD, base: 2.4, gain: 1.6, thick: 18, light: L2, dir: 1.0, rimLit: 1.2, rimShade: 0.8, slope: 0.6, outline: OUT, litOutline: [66, 58, 96], tex: (X, Y) => (vn(X * 0.08 + 9, Y * 0.12) > 0.66 ? -0.7 : 0) });
  const G2 = [112, 944], v2 = [0.42, -0.91], n2 = [0.91, 0.42];
  const at2 = (a, b) => [G2[0] + a * v2[0] + b * n2[0], G2[1] + a * v2[1] + b * n2[1]];
  fist(h, at2, L2);
  vol(h, [smooth([[56, 896], [80, 902], [94, 920], [96, 946], [82, 950], [76, 926], [60, 910]], null, 3)], { ramp: HOOD, base: 3.0, gain: 1, thick: 5, light: L2, dir: 1, rimLit: 1.1, rimShade: 0.6, slope: 0.3, outline: OUT, litOutline: [76, 68, 106], tex: (X, Y) => ((X * 2 - Y) % 4 === 0 ? -0.9 : 0) });
  rimMask(h, L2);
}
/** A fist in a local frame at(a, b): back of the hand, four curled fingers on the +b side, knuckle highlights. */
function fist(g, at, L) {
  const back = smooth([at(-20, -26), at(-4, -30), at(14, -26), at(22, -12), at(20, 6), at(10, 16), at(-8, 18), at(-22, 10), at(-28, -8)], null, 4);
  vol(g, [back], { ramp: SKIN, base: 2.9, gain: 1.4, thick: 10, light: L, dir: 1.3, rimLit: 1.3, rimShade: 1.0, slope: 0.4, outline: KN, litOutline: KN_LIT });
  for (let k = 0; k < 4; k++) {
    const a0 = 15 - k * 10.5, f = smooth([at(a0, 4), at(a0 + 1, 18), at(a0 - 2, 25), at(a0 - 9, 25), at(a0 - 10, 18), at(a0 - 9, 4)], null, 3);
    vol(g, [f], { ramp: SKIN, base: 2.7 - k * 0.12, gain: 1.2, thick: 4, light: L, dir: 1.0, rimLit: 1.2, rimShade: 0.9, slope: 0.3, outline: KN, litOutline: KN_LIT });
  }
  for (let k = 0; k < 4; k++) { const p = at(12 - k * 10.5, -6); g.px(R(p[0]), R(p[1]), SKIN[6]); g.px(R(p[0]) + 1, R(p[1]), SKIN[5]); g.px(R(p[0]), R(p[1]) + 1, SKIN[5]); }
  for (let k = 0; k < 3; k++) line(g, at(6 - k * 10.5, -10), at(-6 - k * 9, -22), SKIN[3]);
}
function line(g, a, b, col) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let k = 0; k <= n; k++) g.px(R(a[0] + (b[0] - a[0]) * k / n), R(a[1] + (b[1] - a[1]) * k / n), col); }
/** Edge pixels that face the light (toward light dir L, i.e. light comes from L) → rim strength 0..1. */
function rimMask(g, L) {
  const [lx, ly] = L, n = Math.hypot(lx, ly), ux = lx / n, uy = ly / n;
  for (let y = 1; y < GH - 1; y++) for (let x = 1; x < GW - 1; x++) {
    const i = y * GW + x; if (!g.m[i]) continue;
    let k = 0;
    for (let s = 1; s <= 3; s++) { const j = R(y + uy * s) * GW + R(x + ux * s); if (!g.m[j]) { k = 1 - (s - 1) / 3; break; } }
    g.rim[i] = k;
  }
}

/**
 * Draw the POV1 hands. o = { sway: [dx, dy] right, lsway: [dx, dy] left, warm 0..1 (firelight reaching the hands),
 *   flick (≈1) , cool 0..1 (moon) }
 */
export function drawHands1(c, o) {
  if (!RIGHT) bake();
  const W = [255, 150, 70];
  for (const [g, off] of [[LEFT, o.lsway], [RIGHT, o.sway]]) {
    const dx = R(off[0]), dy = R(off[1]);
    for (let y = 700; y < GH; y++) {
      const Y = y + dy; if (Y < 0 || Y >= GH) continue;
      for (let x = 0; x < GW; x++) {
        const i = y * GW + x; if (!g.m[i]) continue;
        const X = x + dx; if (X < 0 || X >= GW) continue;
        const k = i * 3, b = BT[((Y & 3) << 2) | (X & 3)];
        let r = g.d[k], gg = g.d[k + 1], bb = g.d[k + 2];
        // overall night grade (darker, cooler), then the warm rim from the fire ahead
        const dark = o.dark ?? 0.62;
        r *= dark; gg *= dark * 1.02; bb *= dark * 1.12;
        const rim = g.rim[i] * o.warm * (o.flick ?? 1);
        if (rim > 0) { const v = rim * 3, lo = v | 0, fr = v - lo, q = (fr < 0.3 ? lo : fr > 0.7 ? lo + 1 : (fr - 0.3) * 2.5 > b ? lo + 1 : lo) / 3 * 0.75; r += (W[0] - r) * q * 0.7; gg += (W[1] - gg) * q * 0.6; bb += (W[2] - bb) * q * 0.4; }
        const kk = (Y * GW + X) * 3; c.d[kk] = r; c.d[kk + 1] = gg; c.d[kk + 2] = bb;
      }
    }
  }
}

// ---------------------------------------------------------------- POV3: his legs stretched out, sneakers at the bottom
const WHITE = ramp("#2E2E38", "#56566A", "#84849A", "#B2B2C2", "#D8D8E2", "#F2F2F8");
const SOLE = ramp("#3A0A0E", "#6A1418", "#9C2024", "#C83434");
let FEET = null;
function bakeFeet() {
  FEET = new Sprite(GW, GH); FEET.rim = new Float32Array(GW * GH);
  const g = FEET, L = [0.2, 0.98];                                          // light from behind/below us (the fire)
  for (const [cx, lean] of [[196, -1], [346, 1]]) {
    const Y0 = 36;                                                           // lower in the frame: only the shoes' fronts show
    const P = (x, y) => [cx + x, y + Y0];
    // the leg in dark joggers from the bottom edge to the ankle
    vol(g, [smooth([P(-46 - lean * 4, 960), P(-27, 922), P(-20, 900), P(20, 900), P(27, 922), P(46 - lean * 4, 960)], null, 4)], { ramp: JOG, base: 1.8, gain: 1.3, thick: 14, light: L, dir: 0.8, rimLit: 1.0, rimShade: 0.6, slope: -0.6, outline: OUT, litOutline: [52, 48, 66], tex: (X, Y) => (vn(X * 0.1, Y * 0.06) > 0.68 ? -0.6 : 0) });
    // sole: a thin red rim showing only round the toe
    vol(g, [smooth([P(-25, 880), P(-27, 860), P(-19, 838), P(-4, 830), P(10, 832), P(22, 842), P(27, 862), P(25, 880)], null, 4)], { ramp: SOLE, base: 1.2, gain: 0.8, thick: 3, light: L, dir: 0.4, rimLit: 0.6, rimShade: 0.4, slope: 0, outline: OUT, litOutline: [96, 24, 26] });
    const upper = smooth([P(-24, 902), P(-26, 870), P(-21, 850), P(-9, 836), P(6, 835), P(19, 845), P(25, 866), P(24, 902)], null, 4);
    vol(g, [upper], { ramp: WHITE, base: 2.6, gain: 1.4, thick: 8, light: L, dir: 0.9, rimLit: 0.8, rimShade: 1.0, slope: -0.5, outline: [26, 26, 34], litOutline: [96, 96, 110] });
    for (let a = 0; a <= 1.0001; a += 0.05) { const x = cx - 18 * Math.cos(a * Math.PI), y = 856 + Y0 - 9 * Math.sin(a * Math.PI); g.px(R(x), R(y), WHITE[1]); }
    // tongue and laces
    vol(g, [smooth([P(-10, 902), P(-11, 874), P(-6, 864), P(6, 864), P(11, 874), P(10, 902)], null, 3)], { ramp: WHITE, base: 2.0, gain: 1, thick: 4, light: L, dir: 0.6, rimLit: 0.6, rimShade: 0.6, slope: -0.3, outline: [34, 34, 44], litOutline: [90, 90, 104] });
    for (let k = 0; k < 3; k++) { const y = 870 + Y0 + k * 9; for (let x = -8; x <= 8; x++) g.px(cx + x, y + (Math.abs(x) > 5 ? 1 : 0), [34, 34, 42]); }
  }
  rimMask(g, [0.15, 0.99]);
}
/** POV3 feet. o = { warm 0..1 (firelight on them), flick, dark (night grade multiplier) } */
export function drawFeet3(c, o) {
  if (!FEET) bakeFeet();
  const g = FEET, W = [255, 150, 70];
  for (let y = 780; y < GH; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x; if (!g.m[i]) continue;
    const k = i * 3, b = BT[((y & 3) << 2) | (x & 3)];
    let r = g.d[k], gg = g.d[k + 1], bb = g.d[k + 2];
    const dk = o.dark, warm = o.warm * (o.flick ?? 1);
    // night: dim and cool; firelight: a warm grade + a warm rim on the edges that face it
    r = r * dk * (0.2 + 0.42 * warm); gg = gg * dk * (0.22 + 0.25 * warm); bb = bb * dk * (0.32 + 0.06 * warm);
    const rim = g.rim[i] * warm;
    if (rim > 0) { const v = rim * 3, lo = v | 0, fr = v - lo, q = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / 3 * 0.7; r += (W[0] - r) * q; gg += (W[1] - gg) * q * 0.85; bb += (W[2] - bb) * q * 0.6; }
    c.d[k] = r; c.d[k + 1] = gg; c.d[k + 2] = bb;
  }
}

// bake the static sprites at load so no frame pays for it
bake(); bakeFeet();
