// LV8 · hippo — an African river at golden hour (RANGE BIOME.river = 3510..4050). The pasture's grass turns into a
// muddy bank with reeds and papyrus; the river (surface y 0, x ≈ 3622..3985) shows its muddy bottom (y ≈ 240) through
// the water; the far bank with papyrus, acacias and two egrets lies across a golden band of far water; the right bank
// rises to the dry golden grass of the savanna. A chubby hippo faces the camera. "hippo": only its ears, eyes and
// nostrils poke out of the water (ears flick, nostrils snort). "heavier still" → +2 T, and four ponies hop onto a
// seesaw on the bank until it balances a little hippo ("4 HORSES = 1 HIPPO"). "can't swim" → its legs paddle in vain;
// "can't even float" → it sinks in a stream of bubbles and lands on the bottom; "walks along the river bottom" → it
// bounces along in slow-motion gallops, puffing mud at every landing. Pure functions of t.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { blob, flat, ell, tube, bez, eye, blush, smile, sign, pickup, tag, C, MAIN, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { worldLayer, spriteCache, xf, thick, profile, gaze, flower, tuft, soil, mudAt, ponyIcon, hippoIcon, seesaw, spring, underwater, hex } from "./pasture-kit.mjs";
import { PT, RT, HIPPO, hippoPose, bubble } from "./pasture-motions.mjs";

export const RANGE = BIOME.river;
const R = Math.round, [X0, X1] = RANGE, WL = 0;
const WATER_A = 3604, WATER_B = 3996;                 // drawWater range (the banks cover its edges)
const HX = HIPPO.x, BOTTOM = HIPPO.bottom;                         // hippo start x, river bottom (world y)
const SAW_X = RT.x.seesaw, BUOY_X = 3928;
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;

// ---------------------------------------------------------------- palette
const HIP = ["#1E1428", "#33243E", "#4A3858", "#624C72", "#7C668C", "#9682A6", "#B4A2C0", "#D4C6DC"];
const MUZ = ["#3A2436", "#5E3C54", "#845A74", "#A87A94", "#C69AB0", "#DCB8C8", "#EED4DE", "#FAEEF2"];
const IRIS = ["#0A0606", "#1A1010", "#2E1C1A", "#4A2E26", "#6A4432", "#8E5E40", "#B47E52", "#D8A06A"];
const LIT = "#FFD49A";
const MURK = hex("#5A7A4C");                          // the river's green-brown murk (mixed over drawWater)
const UW = "#3E8A8C";                                  // underwater tint for things seen through the water

// ---------------------------------------------------------------- terrain profile (world y of the bank / bottom surface)
const ground = (() => {
  const f = profile([[X0 - 60, LAND], [3566, LAND], [3592, -14], [3608, -5], [3624, 2], [3642, 52], [3662, 132], [3682, 196], [3702, 230], [3724, 241], [3800, 243], [3878, 240], [3900, 232], [3920, 202], [3940, 132], [3960, 54], [3978, 4], [3990, -7], [4008, -15], [4030, LAND], [X1 + 60, LAND]]);
  return (x) => f(x) + (x > 3700 && x < 3900 ? Math.sin(x * 0.19) * 1.2 + Math.sin(x * 0.051) * 1.8 : 0);
})();
const farLine = (x) => lerp(lerp(-58, -40, sm(x, 3540, 3640)), -44, sm(x, 3960, 4060)) + Math.sin(x * 0.07) * 1.2;

// ---------------------------------------------------------------- static layer (drawn once)
const TOP = -360, LH = 820, LX0 = X0 - 40, LW = X1 - X0 + 80;
const DRY = ["#4A3410", "#6E4E18", "#94701E", "#B89030", "#D2AE48", "#E4C664", "#F0DA8A", "#FAEDB8"];
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far hills on the left (the pasture's far ridge running down into the valley), far bank strip, far water band
  for (let wx = 3598; wx < 3660; wx++) { const top = R(lerp(-58, -40, sm(wx, 3600, 3660)) + Math.sin(wx * 0.05) * 2 * sm(wx, 3600, 3620)), bot = -32; for (let wy = top; wy < bot; wy++) px(wx, wy, wy - top < 1 ? "#E8E4B0" : (wy - top) / 9 > bayer(wx, wy) ? "#94AC84" : "#A6BA8E"); }
  for (let wx = 3598; wx < LX0 + LW; wx++) {
    const top = R(farLine(wx)), wb = -34 + R(Math.sin(wx * 0.11) * 1);
    for (let wy = top; wy < wb; wy++) { const d = wy - top; px(wx, wy, d < 1 ? "#E6D08A" : d < 3 ? "#B4A462" : (d / 6) > bayer(wx, wy) ? "#7A7A4A" : "#8E8A52"); }
    if (wx > 3560 && wx < 4010) for (let wy = wb; wy < WL; wy++) {
      const v = (wy - wb) / (WL - wb), row = wy - wb, band = Math.sin(wx * (0.09 + row * 0.004) + row * 2.3);
      let col = v < 0.25 ? "#F2C6A8" : v < 0.55 ? ((v - 0.25) / 0.3 > bayer(wx, wy) ? "#D8A2AE" : "#F2C6A8") : (v - 0.55) / 0.45 > bayer(wx, wy) ? "#9E86AE" : "#C496AE";
      if (band > 0.82) col = mix(col, "#FFF0D8", 0.55); else if (band < -0.86) col = mix(col, "#6E5A8A", 0.35);
      if (row === 0) col = "#5E6A3A";
      px(wx, wy, col);
    }
  }
  // far papyrus and reed clumps along the far bank, two acacias, a doum palm
  for (let i = 0; i < 34; i++) { const wx = 3530 + rnd(i * 7 + 1) * 500, top = farLine(wx), h = 6 + rnd(i * 3) * 12; for (let k = 0; k < h; k++) px(R(wx + Math.sin(k * 0.3 + i) * 0.6), R(top - k + 1), k > h - 3 ? "#B8B060" : "#5E6A3A"); if (i % 3 === 0) for (let dx = -3; dx <= 3; dx++) px(R(wx + dx), R(top - h - Math.abs(dx) * 0.4), "#6E7A40"); }
  // the land rising toward the savanna plain on the right (its gradient, so the plain continues without a step)
  for (let wx = 3984; wx < LX0 + LW; wx++) { const e = sm(wx, 3984, 4050), top = R(lerp(farLine(wx) - 2, S_TOP, e * e * (3 - 2 * e))); for (let wy = top; wy < LAND; wy++) { const d = wy - top; px(wx, wy, d < 1 ? "#E6D08A" : d < 3 ? "#B4A462" : (d / 40) > bayer(wx, wy) + 0.3 ? "#7A7A4A" : "#8E8A52"); } }
  for (const [wx, h, w] of [[3606, 58, 44], [3962, 74, 56]]) acacia(g, L(wx), T(farLine(wx) + 2), h, w, "#5A4048", "#8A6050");
  { const x = L(3664), y = T(farLine(3664) + 1); const pts = bez([x, y], [x + 4, y - 40], [x - 2, y - 74], 20); for (const [px0, py0] of pts) { g.px(R(px0), R(py0), "#4A3438"); g.px(R(px0) + 1, R(py0), "#6A4A44"); }
    for (let i = 0; i < 9; i++) { const a = -Math.PI * (0.08 + i * 0.105), len = 16 + (i % 3) * 4; for (let k = 0; k < len; k++) { const u = k / len; g.px(R(x - 2 + Math.cos(a) * k), R(y - 74 + Math.sin(a) * k + u * u * 8), "#4E5A34"); } } }
  // terrain: grassy left bank top → mud bank → underwater slopes and bottom → mud strata; dry golden grass on the right
  for (let wx = X0 - 2; wx < LX0 + LW; wx++) {
    const gy = ground(wx), wet = gy > 1, grassL = wx < 3584 ? 1 - sm(wx, 3560, 3584) : 0, dryR = sm(wx, 3992, 4020);
    for (let wy = R(gy); wy < TOP + LH; wy++) {
      const d = wy - gy, b = bayer(wx, wy); let col = soil(wx, wy, d, mudAt(wx));
      if (wet) { const silt = d < 2 ? "#A8A27A" : d < 4 ? "#7E7656" : d < 8 ? "#5E5440" : null; if (silt) col = mix(silt, "#4E8A86", d < 2 ? 0.25 : 0.12); else col = mix(col, "#3A2A1E", 0.18); }
      else if (d < 2) col = grassL > b ? (d < 1 ? "#A8C060" : "#7A9A44") : dryR > b ? (d < 1 ? DRY[6] : DRY[4]) : (d < 1 ? "#9A8A5A" : "#7A6A44");
      else if (d < 5 + Math.sin(wx * 0.37) * 1.5) col = grassL > b ? "#5A7A34" : dryR > b ? DRY[2] : "#5E4C30";
      else if (wy < WL + 3 && wy > -4 && !wet) col = mix(col, "#3A2A1A", 0.3);           // wet mud line at the waterline
      px(wx, wy, col);
    }
  }
  // pebbles and shells on the bottom, a sunken branch, buried stones in the bank
  for (let i = 0; i < 30; i++) { const wx = 3650 + rnd(i * 3 + 7) * 320, gy = R(ground(wx)); const k = rnd(i * 5 + 1); const tint = (col) => mix(col, "#2E5A56", 0.3);
    if (k < 0.55) { for (let dx = -2; dx <= 2; dx++) px(wx + dx, gy - (Math.abs(dx) < 2 ? 2 : 1), tint("#8A8070")); px(wx - 1, gy - 2, tint("#B4AA94")); }
    else if (k < 0.8) { px(wx, gy - 1, tint("#E8D8C0")); px(wx + 1, gy - 1, tint("#F4E8D8")); px(wx, gy - 2, tint("#D8C8B0")); }
    else { px(wx, gy - 1, tint("#5A6A4A")); px(wx + 1, gy - 1, tint("#5A6A4A")); } }
  { const pts = bez([L(3690), T(226)], [L(3712), T(214)], [L(3742), T(232)], 20); thick(g, pts, 3, mix("#4A3424", "#2E5A56", 0.3)); for (const [x, y] of pts.slice(2, 18)) g.px(R(x), R(y) - 2, mix("#7A5A3A", "#2E5A56", 0.3)); thick(g, [[L(3716), T(222)], [L(3722), T(206)]], 1, mix("#4A3424", "#2E5A56", 0.3)); }
  for (let i = 0; i < 9; i++) { const wx = LX0 + 20 + rnd(i * 7 + 3) * (LW - 40), wy = Math.max(ground(wx) + 30, 40) + rnd(i * 5 + 2) * 160, r = 3 + rnd(i) * 5; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#20181A", "#3A2C28", "#564236", "#705848", "#8A705A", "#A48A70", "#BCA488", "#D4BEA2"], thick: 4 }); }
  // dry golden grass tufts toward the savanna, green grass on the left bank top
  for (let i = 0; i < 14; i++) { const wx = 3996 + i * 4.4 + rnd(i) * 3, gy = ground(wx); for (let b2 = -2; b2 <= 2; b2++) { const h = 7 + rnd(i * 11 + b2) * 12; for (let k = 0; k < h; k++) px(R(wx + (b2 * k) / 4), R(gy - k), DRY[k > h - 3 ? 6 : k > h / 2 ? 5 : 3]); } }
}
function acacia(g, x, y, h, w, col, lit) {
  const tr = Math.max(1, R(h / 30));
  for (const [dx, k] of [[-w * 0.3, 0.62], [w * 0.26, 0.7], [0, 0.5]]) thick(g, bez([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], 10), tr, col);
  const cy = y - h * 0.8;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.15], [-w * 0.45, w * 0.05, w * 0.5, w * 0.12], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]])
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1 || ((xx * 7 + yy * 3) % 5 === 0 && d > 0.75)) continue; g.px(xx, yy, yy < cy + dy - ry * 0.4 ? lit : col); }
}
// At x 4050 the savanna module blends its plain toward this far-bank olive and its strata toward this river mud, so
// here the far bank rises as an olive bluff to the savanna's horizon (world y −189 at x 4050) and the soil stays as is.
const S_TOP = -189;
let BACK = null;
const backLayer = () => BACK ??= worldLayer(LX0, TOP, LW, LH, paintBack);

// ---------------------------------------------------------------- hippo (sprites anchored at the head centre)
// local units: ears top ≈ −51, nostrils ≈ +4, feet = +160. Peeking: waterline at local +12; on the bottom: feet on BOTTOM.
const FEET = HIPPO.feet;
const SPR = spriteCache(80);
/** Body + belly + four stubby legs; lf / rf = lift of the left / right legs (px, quantised to 2). */
function bodySprite(lf, rf) {
  const a = 2 * R(lf / 2), b = 2 * R(rf / 2);
  return SPR(`hb${a}|${b}`, 210, 150, 105, -30, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    for (const sd of [-1, 1]) {   // hind legs (behind, a little higher)
      const up = sd < 0 ? b : a;
      blob(g, [tube([P(sd * 68, 112), P(sd * 70, FEET - 8 - up)], 15, 14), P.poly(ell(sd * 70, FEET - 9 - up, 16, 7))], { ramp: HIP, thick: 9, base: 2.2, gain: 1.4, litOutline: HIP[5] });
      toes(g, P, sd * 70, FEET - 6 - up, 0.8);
    }
    blob(g, [P.poly(ell(0, 100, 88, 58))], { ramp: HIP, thick: 36, base: 2.6, gain: 2.2, slope: 0.6, litOutline: LIT });
    blob(g, [P.poly(ell(0, 120, 56, 34))], { ramp: MUZ, thick: 20, base: 3.2, gain: 1.6, outline: HIP[2] });
    for (const sd of [-1, 1]) {   // front legs
      const up = sd < 0 ? a : b;
      blob(g, [tube([P(sd * 36, 120), P(sd * 37, FEET - 4 - up)], 17, 16), P.poly(ell(sd * 37, FEET - 5 - up, 18, 8))], { ramp: HIP, thick: 10, base: 2.9, gain: 1.6, litOutline: LIT });
      toes(g, P, sd * 37, FEET - 2 - up, 1);
    }
  });
}
function toes(g, P, x, y, s) { for (const dx of [-9, 0, 9]) { const p = P(x + dx * s, y); g.px(R(p[0]) - 1, R(p[1]), MUZ[6]); g.px(R(p[0]), R(p[1]), MUZ[7]); g.px(R(p[0]) + 1, R(p[1]), MUZ[6]); g.px(R(p[0]), R(p[1]) - 1, MUZ[5]); } }
/** Ears; ang = flick angle (rad, quantised). */
function earsSprite(ang) {
  const q = R(ang / 0.06);
  return SPR(`he${q}`, 140, 50, 70, 64, (g, ox, oy) => {
    for (const sd of [-1, 1]) { const P = xf(ox + sd * 46, oy - 36, 1, sd * (0.35 + q * 0.06));
      blob(g, [P.poly(ell(0, -8, 9, 12))], { ramp: HIP, thick: 6, base: 3.0, gain: 1.6, litOutline: LIT });
      flat(g, [P.poly(ell(0, -7, 4.5, 7.5))], "#E890A4"); }
  });
}
/** Head: cranium with eye bumps, the wide muzzle, nostril bumps. */
function headSprite() {
  return SPR("hh", 170, 140, 85, 60, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    blob(g, [P.poly(ell(0, -10, 58, 36)), P.poly(ell(-28, -30, 21, 19)), P.poly(ell(28, -30, 21, 19))], { ramp: HIP, thick: 22, base: 3.0, gain: 2.0, slope: 0.4, litOutline: LIT });
    blob(g, [P.poly(ell(0, 30, 76, 40)), P.poly(ell(-24, -2, 17, 13)), P.poly(ell(24, -2, 17, 13))], { ramp: MUZ, thick: 24, base: 3.0, gain: 2.0, slope: 0.7, litOutline: "#FFE0C8", outline: HIP[1] });
    for (const sd of [-1, 1]) for (let k = -9; k <= 9; k++) { const p = P(sd * 24 + k, 9 + (k * k) / 30); g.px(R(p[0]), R(p[1]), MUZ[3]); }
    // freckles on the muzzle
    for (const [x, y] of [[-40, 24], [-34, 30], [-44, 32], [40, 24], [34, 30], [44, 32]]) { const p = P(x, y); g.px(R(p[0]), R(p[1]), MUZ[2]); }
  });
}
/** Face per frame (through the given canvas view): eyes, brows, nostrils (open 0..1), mouth with two little tusks. */
function face(g, x, y, t, o) {
  for (const sd of [-1, 1]) {
    eye(g, x + sd * 28, y - 30, 10, { ry: 11, iris: IRIS, pupil: "round", look: o.look, blink: o.blink, lid: HIP[4] });
    if (o.worry > 0.05) { const bx = x + sd * 30, gw = fade(g, o.worry); for (let k = -6; k <= 6; k++) { const yy = R(y - 45 + (sd * k) * 0.3); gw.px(R(bx + k), yy, HIP[1]); gw.px(R(bx + k), yy - 1, HIP[2]); } }
    blush(g, x + sd * 52, y + 28, 10, 4.5, "#F27A9A");
    const nx = x + sd * 24, ny = y - 5, rx = 3.4 + o.nos * 2, ry = 2 + o.nos * 1.8;
    for (let Y = R(ny - ry - 0.5); Y <= R(ny + ry + 0.5); Y++) for (let X = R(nx - rx - 0.5); X <= R(nx + rx + 0.5); X++) { const d = ((X - nx) / (rx + 0.5)) ** 2 + ((Y - ny) / (ry + 0.5)) ** 2; if (d <= 1) g.px(X, Y, d > 0.5 ? "#5A2A40" : "#1E0E18"); }
    g.px(R(nx - sd * 1), R(ny - ry - 1), MUZ[7]);
  }
  // wide gentle smile (or a little "o" when surprised), two tusk nubs
  const ok = sm(o.oh, 0.05, 0.45), gg = fade(g, 1 - ok);   // the grin dissolves into a little "o" (never a one-frame swap)
  if (ok > 0) smile(g, x, y + 44, 6, { open: Math.max(0.3, o.oh), col: "#2A1420", tongue: "#F07090", a: ok });
  if (ok < 1) { for (let k = -40; k <= 40; k++) { const u = k / 40; gg.px(R(x + k), R(y + 44 + 8 * (1 - u * u) * o.grin - Math.abs(u) ** 6 * 3), "#2A1420"); } for (const sd of [-1, 1]) { const tx = x + sd * 24, ty = R(y + 44 + 8 * (1 - 0.36) * o.grin); gg.rect(R(tx) - 1, ty - 4, 3, 4, "#F8F4E4"); gg.px(R(tx) - 1, ty - 4, "#FFFFFF"); gg.px(R(tx) + 1, ty - 1, "#C8C0B0"); } }
}

// ---------------------------------------------------------------- choreography (all from words; tables and the hippo's path live in
// pasture-motions.mjs, which also lists every audible motion for the sound design, so keep timings there)
const T_RISE = RT.rise.t0;                             // head comes up to peek
const [T_SINK0, T_SINK1] = RT.sink;                    // sinks after "can't even float"
const T_WALK = RT.walk.t0, HOP = RT.walk.hop, HOP_DX = RT.walk.dx;
const T_FLICK = RT.flick.ts;
const T_SNORT = RT.snort.t0;
const DROP0 = RT.drop.t0, DROP_DT = RT.drop.dt, FALL = RT.drop.fall, T_LEVEL = RT.drop.level, TILT = RT.drop.tilt, NDROP = RT.drop.n, BO = PT.bounce;
const PONIES = [[-31, 0], [-9, 0], [-31, 1], [-9, 1]];
const hippo = hippoPose;

export function fill(c, V, t) {
  if (!onScreen(V)) return;
  drawWater(c, V, t, WATER_A, WATER_B, WL);
  // the river's green-brown murk over the water body
  const sx0 = Math.max(0, R(V.X(WATER_A))), sx1 = Math.min(c.w, R(V.X(WATER_B))), sy0 = Math.max(0, R(V.Y(WL)) + 2), d = c.d, Wd = c.w;
  for (let y = sy0; y < c.h; y++) { const k = 0.3 + Math.min(0.12, (y - sy0) / 2000); for (let x = sx0; x < sx1; x++) { const i = (y * Wd + x) * 3; d[i] += (MURK[0] - d[i]) * k; d[i + 1] += (MURK[1] - d[i + 1]) * k; d[i + 2] += (MURK[2] - d[i + 2]) * k; } }
}

export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(LX0))), x1: Math.min(540, R(V.X(LX0 + LW))) });
  const wly = R(V.Y(WL));
  // sun glitter on the far water band under the sun
  for (let i = 0; i < 30; i++) { const wx = 3780 + (rnd(i * 5) - 0.5) * 70 * (0.5 + rnd(i * 9)), wy = -32 + rnd(i * 9) * 30, on = Math.sin(t * (4 + rnd(i) * 5) + i * 1.3); if (on > 0.3) { const x = R(V.X(wx)), y = R(V.Y(wy)); c.px(x, y, "#FFF8D8"); if (on > 0.8) { c.px(x - 1, y, "#FFE8A8"); c.px(x + 1, y, "#FFE8A8"); } } }
  // two egrets on the far bank (one bobs its head)
  for (const [wx, ph] of [[3700, 0], [3872, 1.7]]) { const x = R(V.X(wx)), y = R(V.Y(farLine(wx))), nod = Math.max(0, Math.sin(t * 1.1 + ph)) > 0.9 ? 1 : 0;
    c.rect(x - 2, y - 7, 5, 3, "#FFFFFF"); c.rect(x - 1, y - 8, 4, 1, "#F4F0E8"); c.px(x + 2, y - 9 + nod, "#FFFFFF"); c.px(x + 2, y - 10 + nod, "#FFFFFF"); c.px(x + 3, y - 10 + nod, "#F8C040"); c.px(x - 1, y - 4, "#2A2A2A"); c.px(x + 1, y - 4, "#2A2A2A"); c.px(x - 1, y - 3, "#2A2A2A"); c.px(x + 1, y - 3, "#2A2A2A"); }
  // water weeds swaying on the underwater slopes and the bottom (seen through the water)
  const uw = underwater(c, wly, UW, 0.3, 0.45);
  for (let i = 0; i < 18; i++) {
    const wx = 3640 + i * 19 + rnd(i * 7) * 9; if (wx > 3720 && wx < 3880 && i % 3) continue; const gy = ground(wx), n = 2 + (i % 3);
    for (let b2 = 0; b2 < n; b2++) { const h = 16 + rnd(i * 11 + b2) * 30, ph = t * 1.4 + i * 0.7 + b2, x0 = V.X(wx + (b2 - n / 2) * 3), y0 = V.Y(gy) + 1;
      for (let k = 0; k < h; k += 1) { const sw = Math.sin(ph + k * 0.09) * (k / h) * 6, x = R(x0 + sw), y = R(y0 - k); uw.px(x, y, k > h * 0.75 ? "#8AB86A" : "#4E8A48"); if (b2 === 0) uw.px(x + 1, y, "#3A6A3A"); } }
  }
  // little fish near the bottom
  for (let i = 0; i < 4; i++) {
    const per = 9 + i * 1.7, u = (((t / per + i * 0.29) % 1) + 1) % 1, dir = i % 2 ? -1 : 1, wx = dir > 0 ? 3664 + u * 290 : 3954 - u * 290, wy = 150 + i * 18 + Math.sin(t * 2 + i) * 4;
    const x = R(V.X(wx)), y = R(V.Y(wy)); if (x < -6 || x > 546) continue; const col = ["#C8B060", "#B89A58", "#D8C070", "#A8A070"][i];
    const fa = Math.min(sm(u, 0, 0.12), 1 - sm(u, 0.88, 1)); if (fa <= 0) continue; const uf = fade(uw, fa);   // each fish crosses one way, fading in/out at the banks
    uf.rect(x - 3, y - 1, 7, 3, col); uf.rect(x - 2, y - 2, 5, 1, mix(col, "#FFFFFF", 0.3)); const tx = x - dir * 5; uf.px(tx, y - 1, col); uf.px(tx, y + 1, col); uf.px(tx + dir, y, col); uf.px(x + dir * 2, y - 1, C.O);
  }
  // buoy chain (behind the hippo)
  { const x = R(V.X(BUOY_X)); for (let y = wly + 8; y < R(V.Y(ground(BUOY_X))); y += 3) uw.px(x + (((y >> 2) & 1) ? 1 : 0), y, "#5A5A5A"); }
  // reeds and papyrus on both banks, swaying
  for (let i = 0; i < 16; i++) {
    const left = i < 10, wx = left ? 3520 + i * 8.5 + rnd(i) * 5 : 3986 + (i - 10) * 6 + rnd(i) * 4; if (left && wx > 3600) continue;
    const gy = ground(wx), h = 30 + rnd(i * 7) * 36, sw = Math.sin(t * 1.5 + i * 0.8) * 3, x0 = V.X(wx), y0 = V.Y(gy);
    for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x0 + sw * u * u), R(y0 - k), u > 0.6 ? "#A8B460" : "#6A8436"); }
    const tx = x0 + sw, ty = y0 - h;
    if (i % 3 === 0) for (let a = 0; a < 9; a++) { const an = -Math.PI / 2 + (a - 4) * 0.32; for (let k = 1; k < 9; k++) c.px(R(tx + Math.cos(an) * k), R(ty + Math.sin(an) * k * 0.8 + (k * k) / 20), k > 6 ? "#C8D070" : "#7E9A40"); }
    else if (i % 3 === 1) for (let k = 0; k < 8; k++) c.px(R(tx), R(ty + k), k % 3 ? "#6A3A1E" : "#8A5228");
  }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const wly = R(V.Y(WL));
  // ------------------------------------------------ the seesaw on the bank: 4 HORSES = 1 HIPPO
  { let ang = TILT; for (let i = 0; i < NDROP; i++) ang -= (TILT / NDROP) * spring(t - (DROP0 + i * DROP_DT + FALL), PT.settle.k, PT.settle.w);
    const S = seesaw(c, R(V.X(SAW_X)), R(V.Y(LAND)) - 26, 48, ang, { base: "rock" });
    const hp = S.at(32); hippoIcon(c, R(hp[0]), R(hp[1]) + 1);
    for (let i = 0; i < NDROP; i++) { const u = t - (DROP0 + i * DROP_DT); if (u < 0) continue; const [du, row] = PONIES[i], p = S.at(du), fk = clamp01(u / FALL), drop = (1 - fk * fk) * 44, hop = u > FALL ? Math.max(0, Math.exp(-(u - FALL) * BO.k) * Math.sin((u - FALL) * BO.w) * BO.amp) : 0;
      ponyIcon(c, R(p[0]), R(p[1] - row * 17 - drop - hop) + 1, { a: sm(u, 0, FALL * 0.55), flip: true }); }
  }
  // ------------------------------------------------ lily pads with a lotus, bobbing on the surface
  for (const [wx, w, fl] of [[3652, 16, 1], [3682, 10, 0], [3946, 14, 0], [3966, 9, 1]]) { const bob = R(Math.sin(t * 2 + wx) * 0.7), x = R(V.X(wx)), y = wly + bob;
    for (let k = -w; k <= w; k++) { const notch = k > 1 && k < 5, edge = Math.abs(k) > w - 2; if (notch) continue; c.px(x + k, y - 2, edge ? "#2E6A2E" : Math.abs(k) < w - 5 ? "#9ACC5E" : "#6AAE48"); c.px(x + k, y - 1, edge ? "#2E6A2E" : "#5A9A40"); c.px(x + k, y, "#2E5A2E"); }
    if (fl) { const fx = x - 4, fy = y - 3;   // a pink lotus flower sitting on the pad
      for (const [dx, dy, col] of [[0, -5, "#FFFFFF"], [-1, -4, "#FFE8F0"], [1, -4, "#FFE8F0"], [0, -4, "#FFF4F8"], [-2, -3, "#F8B0C8"], [2, -3, "#F8B0C8"], [-1, -3, "#FFD0E0"], [1, -3, "#FFD0E0"], [-3, -2, "#F090B0"], [3, -2, "#F090B0"], [-2, -1, "#E07098"], [-1, -1, "#F090B0"], [0, -1, "#F090B0"], [1, -1, "#F090B0"], [2, -1, "#E07098"], [-4, -1, "#E07098"], [4, -1, "#E07098"]]) c.px(fx + dx, fy + dy, col); c.px(fx, fy - 2, "#F8D040"); c.px(fx, fy - 3, "#FCE48A"); } }
  // ------------------------------------------------ the hippo
  const h = hippo(t), hx = R(V.X(h.x)), hy = R(V.Y(h.y)), wetK = (y) => Math.min(0.55, 0.36 + (y - wly) / 900);
  const uw = underwater(c, wly, UW, 0.36, 0.55, 500);
  bodySprite(h.lf, h.rf).blit(c, hx, hy, { below: wly, tint: UW, k: wetK });
  const flick = T_FLICK.reduce((m, tf) => Math.max(m, win(t, tf, RT.flick.dur)), 0), earA = flick * Math.sin(t * 38) * 0.35 + Math.sin(t * 1.3) * 0.05;
  earsSprite(earA).blit(c, hx, hy, { below: wly, tint: UW, k: wetK });
  headSprite().blit(c, hx, hy, { below: wly, tint: UW, k: wetK });
  const sinking = sm(t, T_SINK0 - 0.1, T_SINK0 + 0.2) * (1 - sm(t, T_SINK1, T_SINK1 + 0.3));
  const worry = Math.max(sm(t, EV.swim, EV.swim + 0.2), 0) * (1 - sm(t, T_SINK1 + 0.1, T_SINK1 + 0.4));
  const look = gaze(t, [[0, [0, 0]], [EV.still + 0.9, [-0.9, 0.2]], [EV.swim - 0.1, [0, -0.6]], [T_SINK0, [0, -0.9]], [T_SINK1 + 0.1, [0, 0.1]], [T_WALK + 0.2, [0.5, 0.1]]], 0.22);
  const snort = win(t, T_SNORT, RT.snort.flare), nos = Math.max(0.15 + 0.15 * Math.sin(t * 3), snort);
  face(uw, hx, hy, t, { look, blink: blinkAt(t, 3.6, 1.1), worry, nos, oh: sinking * 0.8, grin: 0.55 + 0.45 * sm(t, T_WALK, T_WALK + 0.4) });
  // where the head breaks the surface: a foam line, droplets when it rises, a spray when it snorts
  const above = wly - (hy - 51);
  if (above > -2 && above < 110) waterline(c, hx, wly, R(Math.min(74, 30 + above * 0.9)), t, clamp01(above / 6));
  splash(c, hx, wly, t, RT.rise.splash, 0.8, 3);
  spray(c, hx, hy - 5, t - T_SNORT - RT.snort.delay);
  // paddling in vain: little splashes beside the head with every stroke ("can't swim")
  for (let n = 0; n < RT.paddle.n; n++) { const ts = RT.paddle.stroke0 + n * RT.paddle.dt; if (ts > T_SINK0) break; splash(c, hx + (n % 2 ? 62 : -62), wly, t, ts, 0.32, 21 + n); }
  bubbles(c, V, t, h, wly);
  // mud puffs on the bottom: landing after the sink, then every gallop landing
  const by = R(V.Y(BOTTOM)) - 2;
  puff(c, hx, by, t - T_SINK1 + RT.landLead, 1.2);
  for (let n = 1; n <= RT.walk.n; n++) { const tl = T_WALK + n * HOP; puff(c, R(V.X(HX + n * HOP_DX)), by, t - tl, 0.9); }
  // ------------------------------------------------ LV 8 buoy
  { const x = R(V.X(BUOY_X)), bob = Math.sin(t * 2.3) * 2, y = R(wly - 6 + bob), g = underwater(c, wly, UW, 0.36, 0.5);
    for (let j = -8; j <= 10; j++) { const hw = R(Math.sqrt(Math.max(0, 1 - (j / 10.5) ** 2)) * 10); g.rect(x - hw, y + j, hw * 2 + 1, 1, j < -2 ? "#F4EEE0" : j < 4 ? "#D8443C" : "#9A2A2A"); g.px(x - hw, y + j, "#5A1A1E"); g.px(x + hw, y + j, "#5A1A1E"); }
    sign(c, x, y - 8, "LV 8", "buoy", 1, t); waterline(c, x, wly, 10, t, 1); }
}
const win = (t, t0, dur) => (t < t0 || t > t0 + dur ? 0 : Math.sin((Math.PI * (t - t0)) / dur));
function waterline(c, x, wly, hw, t, a = 1) {
  const g = fade(c, a);
  for (let k = -hw - 6; k <= hw + 6; k++) { const yy = wly + R(Math.sin(k * 0.5 + t * 6) * 0.8); g.px(R(x + k), yy, Math.abs(k) > hw ? "#CFF4F0" : "#FFFFFF"); if ((k + R(t * 10)) % 5 === 0) g.px(R(x + k), yy + 1, "#E8FFFF"); }
}
function splash(c, x, wly, t, t0, size, seed) {
  const u = t - t0; if (u < 0 || u > RT.splash) return; const g = fade(c, 1 - sm(u, 0.5, RT.splash));
  for (let i = 0; i < 18; i++) { const vx = (rnd(seed * 97 + i) - 0.5) * 140 * size, vy = -(80 + rnd(seed * 31 + i * 7) * 120) * size, sx = x + (rnd(seed + i * 13) - 0.5) * 90 * size;
    const px = R(sx + vx * u), py = R(wly + vy * u + 520 * u * u); if (py > wly + 2) continue; g.rect(px, py, 2, 2, i % 3 ? "#E8FFFF" : "#9AE8E4"); }
}
function spray(c, x, y, u) {   // a snort: two little fans of droplets from the nostrils
  if (u < 0 || u > RT.spray) return; const g = fade(c, 1 - sm(u, 0.35, RT.spray));
  for (const sd of [-1, 1]) for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + sd * (0.25 + i * 0.09), sp = 60 + i * 9, px = R(x + sd * 22 + Math.cos(a) * sp * u), py = R(y + Math.sin(a) * sp * u + 140 * u * u); g.px(px, py, i % 2 ? "#E8FFFF" : "#FFFFFF"); if (i % 3 === 0) g.px(px + 1, py, "#BFF6FF"); }
}
function bubbles(c, V, t, h, wly) {
  // a stream while sinking and a few while walking; rise from the nostrils, wobble, pop at the surface
  for (let i = 0; i < RT.bubbles.sinkN + RT.bubbles.walkN; i++) {
    const { walk, t0 } = bubble(i); if (t < t0) continue; const u = t - t0;
    const src = hippoAt(t0), sd = i % 2 ? 1 : -1, sx = V.X(src.x) + sd * (22 + u * (walk ? 80 : 26)) + (rnd(i) - 0.5) * 6, sy = V.Y(src.y) + 4;
    const y = sy - u * (60 + rnd(i * 3) * 40); if (y < wly + 2) continue; const x = sx + Math.sin(u * 7 + i) * 2.5, r = (walk ? 1.2 : 1.5) + rnd(i * 7) * 2 + u * 0.6;
    const g = fade(c, Math.min(1, u * 6) * sm(y, wly + 2, wly + 16)); for (let a = 0; a < Math.PI * 2; a += 0.35) g.px(R(x + Math.cos(a) * r), R(y + Math.sin(a) * r), "#CFF6F4");
    g.px(R(x - r * 0.4), R(y - r * 0.4), "#FFFFFF");
  }
}
const hippoAt = (t) => hippo(t);
function puff(c, x, y, u, s) {
  if (u < 0 || u > RT.puff) return; const g = fade(c, 1 - sm(u, 0.4, RT.puff));
  for (let i = 0; i < 12; i++) { const sd = i % 2 ? 1 : -1, d = (18 + i * 3.2) * ease(Math.min(1, u / 0.8)) * s, r = 3 + (i % 3) * 1.4 + u * 3; const px = R(x + sd * d), py = R(y - 3 - (i % 4) * 2 - u * 14 * s);
    for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) if (X * X + Y * Y <= r * r && (X + Y + i) % 2 === 0) g.px(px + R(X), py + R(Y), Y < 0 ? "#8A8A64" : "#6A6A4C"); }
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // grass on the left bank top and dry grass on the right bank, swaying; muddy edge stones
  for (let i = 0; i < 22; i++) {
    const left = i < 12, wx = left ? 3512 + i * 7 + rnd(i * 3) * 4 : 3992 + (i - 12) * 6.5 + rnd(i) * 3; if (left && wx > 3592) continue;
    const x = R(V.X(wx)), y = R(V.Y(ground(wx))) + 2; if (x < -12 || x > 552) continue;
    tuft(c, x, y, 7 + rnd(i * 5) * 7, 3 + (i % 3), left ? ["#3E5A26", "#5E8436", "#86A848", "#B4C868"] : [DRY[2], DRY[3], DRY[5], DRY[7]], i * 13, Math.sin(t * 1.7 + wx * 0.05) * 1.6);
  }
}

// ---------------------------------------------------------------- HUD: 2 T pickup, balance label, CAN'T SWIM / CAN'T FLOAT
export function hud(c, V, t) {
  if (!onScreen(V)) return;
  const live = 1 - sm(t, RT.leave[0], RT.leave[1]); if (live <= 0) return;   // dissolve as the camera leaves
  pickup(c, R(V.X(HX)), R(V.Y(WL)) - 290, "2 T", (t - RT.pickup.t0) / RT.pickup.dur);
  const la = sm(t, RT.tagBalance[0], RT.tagBalance[1]) * live;
  if (la > 0) tag(c, ["4 HORSES", "= 1 HIPPO"], R(V.X(SAW_X)) + 14, R(V.Y(LAND)) - 140 + R((1 - la) * 6), la, C.Y, 2);
  const out = live;
  const a1 = sm(t, RT.tagSwim[0], RT.tagSwim[1]) * out, a2 = sm(t, RT.tagFloat[0], RT.tagFloat[1]) * out;
  const cx = R(V.X(HX)), y0 = R(V.Y(WL)) - 326;
  if (a1 > 0) noTag(c, "CAN'T SWIM", cx, y0 + R((1 - a1) * 6), a1);
  if (a2 > 0) noTag(c, "CAN'T FLOAT", cx, y0 + 40 + R((1 - a2) * 6), a2);
}
// a pink "no" tag: crossed circle + text
function noTag(c, text, cx, y, a) {
  const tw = c.measure(MAIN, text, { scale: 2 }), w = tw + 40, h = 30, x = R(Math.max(12, Math.min(528 - w, cx - w / 2))), g = fade(c, a);
  g.rrect(x, y, w, h, "#F06A8A", 2); g.rrect(x + 1, y + 1, w - 2, h - 2, "#6A1A34", 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix("#2A0C1A", "#3A1024", (j - y) / h));
  const ix = x + 15, iy = y + 15; for (let Y = -8; Y <= 8; Y++) for (let X = -8; X <= 8; X++) { const d = Math.hypot(X, Y); if (d <= 8.4 && d >= 6.2) g.px(ix + X, iy + Y, "#FF5A7A"); if (Math.abs(X - Y) <= 1 && d < 7) g.px(ix + X, iy + Y, "#FF5A7A"); }
  g.text(MAIN, text, x + 30, y + 8, "#2A0A14", { scale: 2 }); g.text(MAIN, text, x + 30, y + 7, "#FFD0DC", { scale: 2 });
}
