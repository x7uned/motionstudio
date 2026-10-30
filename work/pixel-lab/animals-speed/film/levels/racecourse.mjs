// LV5 · racehorse — a grass racecourse at golden hour (RANGE BIOME.racecourse = 2160..2700, tod ≈ 3.7).
// Far: a hazy tree line, a little grandstand with a crowd and waving flags (left), a white judge's tower with a clock (right),
// a hedge along the far side of the course and the thin far rail. Mid: the mowed turf in diagonal stripes. Near: the white
// rail fence with a red-and-white furlong pole on the ground line, then the lawn of the course toward the viewer (the
// backyard's perspective mowing stripes, so the seam at x 2160 lines up; each stripe streams at its own perspective speed).
// A cute chibi bay racehorse (purple silk saddle cloth "7", white wraps) stands under the sun facing the camera; on
// "racehorse" it tosses its head and paws the turf; on "gallops" it gallops on the spot while the rail fence, the turf and
// the grass stream past behind it (a treadmill whose scroll ends on whole post spacings, so the course is back at rest
// afterwards), hoof dust on every beat; on "seventy" it eases into a proud high-stepping prance, eyes closed, sparkles.
// At x 2160 the rail fence continues the backyard's fence; toward x 2700 the turf runs into golden savanna grass.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, flat, ell, tube, bez, sign, RAMP, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { worldLayer, Layer, gaze, tuft, dustPuff, streak, twinkle } from "./racecourse-kit.mjs";
import { drawHorse, PIV, ICON as HORSE_ICON } from "./racecourse-horse.mjs";
const GAIT = { Af: 34, Ah: 28 };
import { HORSE_X, G0, G1, wGallop, wPrance, phase, SCROLL, INTRO, LEGS, CONTACTS, PUFF_LIFE, LEAVE, SPARKLES } from "./racecourse-time.mjs";

export const RANGE = BIOME.racecourse;
const R = Math.round, [X0, X1] = RANGE, W = X1 - X0;          // 540: one screen; every streamed texture has this period
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
const TOWER_X = 2594;                                          // the judge's tower; the LV sign hangs at its foot (screen x ≤ 462 at rest)
export const ICON = HORSE_ICON;

// ---------------------------------------------------------------- palette (golden hour)
const TURF = ["#3E6A2A", "#4C7C30", "#5A8C36", "#6A9C3C", "#7CAC44", "#92BC50", "#AACC62", "#C8DC80"];
const RAIL = ["#3A3440", "#8A8494", "#C8C2D0", "#ECE8F0", "#FFFDF6"];
const P2 = (k) => (2 * Math.PI * k) / W;                       // angular frequency of k whole periods across the range

/** The lawn below the ground line (a perspective ground like the backyard's: mowing stripes that widen toward the viewer,
 *  the same stripe rows as the yard so the seam at x 2160 lines up). stripe(d) = stripe index of the row d px below LAND. */
export const LAWN = ["#24501A", "#2E6220", "#3A7626", "#468A2E", "#539C36", "#62AE40", "#76C04E", "#90D262"];
export const stripe = (d) => Math.floor(Math.sqrt(d + 4) * 1.6);
/** Perspective speed factor of a stripe (constant inside a stripe, so nothing tears): 1 at the ground line → 3 at the bottom. */
export function stripeP(d) { const n = stripe(d), a = (n / 1.6) ** 2 - 4, b = ((n + 1) / 1.6) ** 2 - 4; return 1 + Math.max(0, (a + b) / 2) / 160; }
// ---------------------------------------------------------------- far layer (static): tree line, grandstand, judge's tower, hedge
const FAR_TOP = -232, FAR_BOT = -100;
function paintFar(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // hazy tree line on the horizon (warm haze), lower under the sun disc
  const crest = (x) => -128 - 9 * (0.5 + 0.5 * Math.sin(x * 0.045 + 1)) - 6 * (0.5 + 0.5 * Math.sin(x * 0.13 + 2)) * (0.6 + 0.4 * Math.sin(x * 0.011));
  for (let wx = X0 - 20; wx < X1 + 20; wx++) { const top = R(crest(wx)); for (let wy = top; wy < -104; wy++) { const d = wy - top; px(wx, wy, d < 1 ? "#E4D8A0" : d < 3 ? (bayer(wx, wy) > 0.5 ? "#C2C08E" : "#AEB284") : wy > -116 ? "#8C9C74" : "#9CA87C"); } }
  grandstand(g, L, T);
  tower(g, L, T, TOWER_X);
  // the hedge along the far side of the course: rounded clipped top, lit by the low sun
  for (let wx = X0 - 20; wx < X1 + 20; wx++) {
    const top = R(-117 - 1.5 * Math.abs(Math.sin(wx * 0.21)) - (rnd(R(wx / 3)) < 0.2 ? 1 : 0));
    for (let wy = top; wy < FAR_BOT; wy++) { const d = wy - top, b = bayer(wx, wy); px(wx, wy, d < 1 ? "#B8D070" : d < 3 ? (b > 0.4 ? "#7EA448" : "#6A9440") : d < 8 ? (((wx + wy) & 3) === 0 ? "#3E6A30" : "#4A7A34") : "#2E5426"); }
  }
}
function grandstand(g, L, T) {
  // a small Victorian grandstand: cream stone base with dark arches, tiered seats with a pixel crowd, a green cantilever roof
  const x0 = X0 + 18, x1 = X0 + 172, base = -112, top = -170, roof = -188;
  const H = "#E6D8B8", Hs = "#C8B694", Hd = "#9A8670";
  for (let wy = top; wy < base; wy++) for (let wx = x0; wx < x1; wx++) g.px(L(wx), T(wy), wx < x0 + 2 ? "#F4E8CC" : wy > base - 18 ? Hs : H);
  // arches on the ground floor
  for (let wx = x0 + 6; wx < x1 - 10; wx += 15) for (let j = 0; j < 14; j++) for (let i = 0; i < 9; i++) { const r = j < 4 ? Math.hypot(i - 4, 4 - j) > 4.5 : false; if (!r) g.px(L(wx + i), T(base - 14 + j), j === 0 || i === 0 ? "#4A3A3A" : "#2A2026"); }
  // tiered seats with the crowd (coloured heads in rows, slanting up to the back)
  for (let row = 0; row < 5; row++) {
    const y = base - 22 - row * 6;
    for (let wx = x0 + 3; wx < x1 - 3; wx++) { g.px(L(wx), T(y + 2), Hd); g.px(L(wx), T(y + 3), "#7A6A5A"); }
    for (let wx = x0 + 4 + (row & 1); wx < x1 - 4; wx += 3) { if (rnd(wx * 7 + row * 131) < 0.12) continue; const col = ["#E05A44", "#3A6AC8", "#F4CA50", "#FDFEED", "#8D59DA", "#4AA05A", "#F28AB0"][R(rnd(wx * 3 + row) * 6)]; g.px(L(wx), T(y), col); g.px(L(wx), T(y + 1), mix(col, "#2A1A20", 0.35)); g.px(L(wx), T(y - 1), "#F0C8A0"); }
  }
  // roof: a green-and-white striped canopy sloping down to the front, on thin posts
  for (let wx = x0 - 6; wx < x1 + 6; wx++) { const k = (wx - x0 + 6) / (x1 - x0 + 12); for (let wy = roof; wy < top + 2; wy++) { const u = (wy - roof) / (top + 2 - roof); g.px(L(wx), T(wy), u > 0.82 ? "#1E3A2A" : ((Math.floor((wx - x0) / 6)) & 1 ? "#2E6A4A" : "#F2EEDC")); } g.px(L(wx), T(roof - 1), k < 0.5 ? "#FFF4D0" : "#E8DCC0"); }
  for (let wx = x0 + 8; wx < x1; wx += 36) for (let wy = top + 2; wy < base - 18; wy++) g.px(L(wx), T(wy), "#5A4A44");
  // flag poles on the roof
  for (let i = 0; i < 4; i++) { const fx = x0 + 18 + i * 40; for (let wy = roof - 18; wy < roof; wy++) g.px(L(fx), T(wy), "#4A3A40"); g.px(L(fx), T(roof - 19), "#F4CA50"); }
  // a few far trees beside it
  for (const [wx, r] of [[x1 + 14, 9], [x1 + 30, 12]]) { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) g.px(L(wx + x), T(-118 - r + y), y < -r * 0.3 && x < r * 0.3 ? "#A8B47C" : "#7E9264"); for (let k = 0; k < 6; k++) g.px(L(wx), T(-118 + k - 2), "#5A4A3A"); }
}
function tower(g, L, T, cx) {
  // a white judge's tower with a green dome and a gold clock face
  const base = -112, top = -176, hw = 9;
  for (let wy = top; wy < base; wy++) for (let wx = cx - hw; wx <= cx + hw; wx++) g.px(L(wx), T(wy), wx === cx - hw ? "#FFF8E8" : wx > cx + hw - 3 ? "#C8BCA8" : "#ECE2CC");
  for (let wy = top + 30; wy < base; wy += 12) for (let wx = cx - 4; wx <= cx + 4; wx++) for (let k = 0; k < 6; k++) g.px(L(wx), T(wy + k), k < 2 ? "#FFE8A0" : "#3A3040");
  for (let wx = cx - hw - 2; wx <= cx + hw + 2; wx++) { g.px(L(wx), T(top), "#8A7A68"); g.px(L(wx), T(top + 1), "#FFF8E8"); }
  for (let j = 0; j < 12; j++) { const w = R(Math.sqrt(1 - (j / 12) ** 2) * (hw + 1)); for (let i = -w; i <= w; i++) g.px(L(cx + i), T(top - j), i < -w * 0.3 ? "#5AA87A" : "#2E7A52"); }
  for (let j = 0; j < 6; j++) g.px(L(cx), T(top - 12 - j), "#4A3A40"); g.px(L(cx), T(top - 19), "#F4CA50");
  for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) { const d = Math.hypot(x, y); if (d <= 5.3) g.px(L(cx + x), T(top + 12 + y), d > 4.3 ? "#B8862A" : "#FFF4D0"); }
  g.px(L(cx), T(top + 9), "#2A1A10"); g.px(L(cx), T(top + 10), "#2A1A10"); g.px(L(cx), T(top + 11), "#2A1A10"); g.px(L(cx + 1), T(top + 12), "#2A1A10"); g.px(L(cx + 2), T(top + 12), "#2A1A10");
  // trees around its foot
  for (const [wx, r] of [[cx - 26, 10], [cx + 24, 12], [cx + 44, 9]]) for (let y = -r; y <= r; y++) for (let x = -R(r * 1.2); x <= R(r * 1.2); x++) if ((x / (r * 1.2)) ** 2 + (y / r) ** 2 <= 1) g.px(L(wx + x), T(-116 - r + y), y < -r * 0.3 && x < 0 ? "#A8B47C" : "#7E9264");
}
let FAR = null;
const farLayer = () => FAR ??= worldLayer(X0 - 20, FAR_TOP, W + 40, FAR_BOT - FAR_TOP, paintFar);

// ---------------------------------------------------------------- streamed layers (periodic over the range; shifted by the treadmill)
// TURF: mowed course between the far rail and the near rail (parallax 0.5); GROUND: near turf strip, the ground lip and the
// earth cross-section (parallax 1). Both are exactly W wide and periodic, so wrapping never shows a seam.
const TURF_TOP = -100, NEAR_TOP = LAND, GROUND_BOT = 320;
function paintTurf(g) {
  for (let y = 0; y < NEAR_TOP - TURF_TOP; y++) for (let x = 0; x < W; x++) {
    const wy = TURF_TOP + y, v = y / (NEAR_TOP - TURF_TOP), stripe = (((x + y * 1.6) % 54) + 54) % 54 < 27, b = bayer(x, y);
    let s = 3.4 + v * 1.1 + (stripe ? 0.9 : 0) + Math.sin(x * P2(6) + y * 0.2) * 0.25; const lo = Math.floor(s);
    let col = TURF[Math.max(1, Math.min(7, s - lo > b ? lo + 1 : lo))];
    if (y < 2) col = y < 1 ? "#C8DC80" : TURF[3];                       // far edge lit
    if (rnd(x * 31 + y * 977) < 0.03) col = mix(col, "#E8E8A0", 0.35);  // sunlit blades
    g.px(x, y, col); void wy;
  }
}
function paintGround(g) {
  // the lawn of the course in front of the rail: mowing stripes, clover, daisies and kicked-up divots (periodic over W)
  const H = GROUND_BOT - LAND, P = (2 * Math.PI) / W;
  for (let d = 0; d < H; d++) {
    const v = Math.pow(d / H, 0.8), band = stripe(d) % 2;
    for (let x = 0; x < W; x++) {
      let k = 4.2 + v * 1.4 + (band ? 0.55 : -0.25) + (bayer(x, d) - 0.5) * 0.8 + Math.sin(x * P * 11 + d * 0.02) * 0.25;
      if (d < 3) k = 3; else if (d < 14) k -= (14 - d) * 0.09;
      g.px(x, d, LAWN[Math.max(0, Math.min(7, R(k)))]);
    }
  }
  const clear = (d, h) => { for (let j = -1; j <= h; j++) if (stripe(d + j) !== stripe(d)) return false; return true; };
  for (let i = 0; i < 300; i++) {
    const x = R(rnd(i * 3 + 1) * W), d = R(8 + Math.pow(rnd(i * 5 + 2), 1.3) * (H - 12)), s2 = 1 + d / 150, kind = i % 7; if (!clear(d, 3)) continue;
    const px = (X, Y, col) => g.px(((X % W) + W) % W, Y, col);
    if (kind < 3) { px(x, d, LAWN[7]); px(x, d - 1, LAWN[6]); if (s2 > 1.6) px(x + 1, d - 1, LAWN[7]); }
    else if (kind === 3) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) px(x + dx, d + dy, "#FFFFFF"); px(x, d, "#F4C83A"); }
    else if (kind === 4) { px(x, d, "#F4D03A"); px(x + 1, d, "#F4D03A"); px(x, d - 1, "#FFE870"); }
    else if (kind === 5) { const w = R(2 + s2 * 1.5); for (let dx = 0; dx < w; dx++) { px(x + dx, d, "#5A3A1E"); px(x + dx, d + 1, "#3E2412"); } px(x, d - 1, "#7A5A2E"); px(x + w - 1, d - 1, LAWN[6]); }   // a divot of earth
    else { px(x, d, LAWN[2]); px(x + 1, d, LAWN[2]); }
  }
}
let TURF_L = null, GROUND_L = null;
const turfLayer = () => { if (!TURF_L) { TURF_L = new Layer(W, NEAR_TOP - TURF_TOP); paintTurf(TURF_L.g); } return TURF_L; };
const groundLayer = () => { if (!GROUND_L) { GROUND_L = new Layer(W, GROUND_BOT - LAND); paintGround(GROUND_L.g); } return GROUND_L; };
const ROWP = Array.from({ length: GROUND_BOT - LAND }, (_, d) => stripeP(d));

// ---------------------------------------------------------------- per-frame streamed props
/** Shift (px) of a parallax band at time t: s(t) * p, wrapped to the range. */
const shiftOf = (t, p) => SCROLL(t) * p;
/** The far rail: a thin white rail on little posts every 27 px (parallax 0.25). */
function farRail(c, V, t) {
  const y = R(V.Y(-101)), sh = shiftOf(t, 0.25), x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1)));
  for (let x = x0; x < x1; x++) { c.px(x, y - 6, "#FFFDF0"); c.px(x, y - 5, "#B8B4BC"); }
  for (let k = -1; k < W / 27 + 1; k++) { const wx = X0 + ((((k * 27 - sh) % W) + W) % W); const x = R(V.X(wx)); if (x < x0 || x >= x1) continue; for (let j = -7; j <= 0; j++) c.px(x, y + j, j < -6 ? "#FFFDF0" : "#E8E4EC"); c.px(x + 1, y - 2, "#9A96A2"); }
}
/** The near rail fence: white posts every 108 px with two rails, and the red-and-white furlong pole (parallax 1). */
const POST = 108, POLE_AT = 300;
function nearFence(c, V, t) {
  const base = R(V.Y(NEAR_TOP)) + 1, sh = shiftOf(t, 1), sp = SCROLL.speed(t), x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1)));
  const blurLen = Math.min(10, R(sp / 110));                         // posts smear into short streaks at full speed
  // rails (continuous) with tiny joint marks that stream
  for (const ry of [base - 34, base - 20]) for (let x = x0; x < x1; x++) { c.px(x, ry - 1, RAIL[4]); c.px(x, ry, RAIL[3]); c.px(x, ry + 1, RAIL[2]); c.px(x, ry + 2, RAIL[1]); c.px(x, ry + 3, "#5A6A3A"); }
  for (let k = -1; k <= W / POST + 1; k++) {
    const lx = ((((k * POST - sh) % W) + W) % W), x = R(V.X(X0 + lx)); if (x < x0 - 12 || x >= x1 + 12) continue;
    for (let b = blurLen; b >= 0; b--) { const g = b ? fade(c, 0.5 * (1 - b / (blurLen + 1))) : c; for (let j = -42; j <= 0; j++) for (let i = -2; i <= 2; i++) { const X = x + i + b; if (X < x0 || X >= x1) continue; g.px(X, base + j, j === -42 ? RAIL[2] : i === -2 ? RAIL[4] : i === 2 ? RAIL[1] : i === 1 ? RAIL[2] : RAIL[3]); } }
    for (let i = -3; i <= 3; i++) if (x + i >= x0 && x + i < x1) { c.px(x + i, base - 43, RAIL[1]); c.px(x + i, base + 1, "#3E6A2A"); }
  }
  // the furlong pole: a tall red-and-white pole with a red disc on top
  { const lx = ((((POLE_AT - sh) % W) + W) % W), x = R(V.X(X0 + lx));
    if (x > x0 - 20 && x < x1 + 20) {
      for (let b = blurLen; b >= 0; b--) { const g = b ? fade(c, 0.5 * (1 - b / (blurLen + 1))) : c;
        for (let j = -84; j <= 0; j++) for (let i = -2; i <= 1; i++) { const X = x + i + b; if (X < x0 || X >= x1) continue; const red = ((j + 84) >> 3) & 1; g.px(X, base + j, i === -2 ? (red ? "#F4807A" : "#FFFFFF") : i === 1 ? (red ? "#8A1A1E" : "#B8B4C0") : red ? "#D8343A" : "#F4F0F8"); }
        for (let y = -9; y <= 9; y++) for (let xx = -9; xx <= 9; xx++) { const d = Math.hypot(xx, y), X = x + xx + b; if (d > 9.3 || X < x0 || X >= x1) continue; g.px(X, base - 92 + y, d > 8.3 ? "#3A0A10" : d > 6 ? "#FFFFFF" : xx + y < -4 ? "#F05A5A" : "#D8343A"); } }
    } }
}
/** Front grass tufts and clover along the ground lip (parallax 2), leaning back in the wind of the gallop. */
function frontGrass(c, V, t) {
  const y0 = R(V.Y(LAND)) + 2, sh = shiftOf(t, 1), sp = SCROLL.speed(t), lean = -Math.min(5, sp / 160);
  const cols = ["#2E5A26", "#4A8436", "#6AA844", "#A8D060"], x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1)));
  for (let i = 0; i < 64; i++) {
    const lx = (((i * (W / 64) + rnd(i * 3) * 6 - sh) % W) + W) % W, x = R(V.X(X0 + lx)); if (x < x0 - 6 || x >= x1 + 2) continue;
    const sway = Math.sin(t * 1.7 + i * 0.7) * 1.4 + lean, h = 5 + rnd(i * 5) * 8;
    tuft(c, x, y0 + (i % 3), h, 3 + (i % 3), cols, i * 13, sway);
    if (i % 6 === 2) { const fx = x + 2 + R(sway), fy = y0 - 6 - (i % 4); c.px(fx, fy - 1, "#FFFFFF"); c.px(fx - 1, fy, "#FFFFFF"); c.px(fx + 1, fy, "#FFFFFF"); c.px(fx, fy + 1, "#E8E8F0"); c.px(fx, fy, "#F4CA50"); }
  }
  // big grass tufts along the bottom edge (nearest to us: parallax 3), like the backyard's
  const yb = R(V.Y(LAND + 296)), shb = shiftOf(t, 3), lb = -Math.min(8, sp / 90);
  for (let i = 0; i < 30; i++) {
    const lx = (((i * (W / 30) + rnd(i * 13 + 4) * 12 - shb) % W) + W) % W, x = R(V.X(X0 + lx)); if (x < x0 - 12 || x >= x1 + 4) continue;
    const y = yb + R(rnd(i * 7) * 30), h = 10 + rnd(i * 3) * 16;
    tuft(c, x, y, h, 5, [LAWN[2], LAWN[4], LAWN[5], LAWN[7]], i * 31, Math.sin(t * 1.5 + i) * 1.5 + lb);
  }
}

// ---------------------------------------------------------------- the horse's gait at time t
const STAND = { foreNear: [2, 0], foreFar: [-2, 0], hindNear: [-4, 0], hindFar: [2, 0] };
function legState(t) {
  const wg = wGallop(t), wp = wPrance(t), ws = Math.max(0, 1 - wg - wp), ph = phase(t), out = {};
  for (const L of LEGS) {
    // gallop: stance (hoof on the ground sliding back) for D of the stride, then a high folded swing forward
    const D = 0.36, pg = (((ph + L.gal) % 1) + 1) % 1, A = L.fore ? GAIT.Af : GAIT.Ah;
    const dxg = pg < D ? A * Math.cos((Math.PI * pg) / D) : -A * Math.cos((Math.PI * (pg - D)) / (1 - D)), lfg = pg < D ? 0 : (L.fore ? 36 : 24) * Math.pow(Math.sin((Math.PI * (pg - D)) / (1 - D)), 0.8);
    // prance: diagonal pairs, high knee lift, almost no reach
    const pp = (((ph + L.pra) % 1) + 1) % 1, lfp = pp < 0.5 ? 0 : (L.fore ? 40 : 20) * Math.pow(Math.sin(Math.PI * (pp - 0.5) * 2), 1.2), dxp = pp < 0.5 ? 0 : (L.fore ? 8 : 3) * Math.sin(Math.PI * (pp - 0.5) * 2);
    let [dxs, lfs] = STAND[L.id];
    // intro: the near front hoof paws the turf on "racehorse"
    if (L.id === "foreNear") { const u = (t - INTRO.paw) / INTRO.pawDur; if (u > 0 && u < 1) { lfs += 24 * Math.sin(Math.PI * u); dxs += 14 * Math.sin(Math.PI * u) - 22 * sm(u, 0.45, 1) * (1 - sm(u, 0.8, 1)); } }
    out[L.id] = [wg * dxg + wp * dxp + ws * dxs, wg * lfg + wp * lfp + ws * lfs];
  }
  return { out, wg, wp, ph };
}
function horseState(t) {
  const { out, wg, wp, ph } = legState(t), br = Math.sin(t * 2.3);
  const bob = wg * -9 * Math.cos(2 * Math.PI * (ph - 0.42)) + wp * -4 * Math.cos(4 * Math.PI * ph) + (1 - wg - wp) * br * 1.2 + wg * -6;
  const pitch = wg * 0.075 * Math.sin(2 * Math.PI * (ph - 0.15)) + wp * -0.03;
  const toss = (t - INTRO.toss) / INTRO.tossDur, tk = toss > 0 && toss < 1 ? Math.sin(Math.PI * toss) : 0;
  const head = { dx: wg * 6 + wp * -2, dy: -tk * 12 + wg * 3 * Math.sin(2 * Math.PI * (ph - 0.1)) + wp * (-8 + 2 * Math.sin(4 * Math.PI * ph)) };
  const wind = Math.max(wg, wp * 0.35, tk * 0.5), tailSwish = Math.sin(t * 1.9) * 8 + Math.sin(t * 4.1) * 3;
  const look = gaze(t, [[0, [0, 0.05]], [INTRO.toss + 0.1, [0.2, -0.2]], [G0, [0.3, 0]], [G1, [0, 0.05]]], 0.2);
  const happy = sm(t, G1 + 0.12, G1 + 0.3) * (1 - sm(t, LEAVE[1] + 0.6, LEAVE[1] + 0.9));
  const face = { look, blink: blinkAt(t, 3.3, 1.1) * (1 - wg), open: Math.max(wg * 0.75, tk * 0.5, wp * 0.35), happy, flare: wg * 1.2 + Math.max(0, br) * 0.4 };
  const earAng = 0.12 + Math.sin(t * 0.9) * 0.04 - tk * 0.06;
  return { legs: out, bob, pitch, head, wind, tailSwish, face, earAng, t, wg, wp };
}

// ---------------------------------------------------------------- level exports
export function back(c, V, t) {
  if (!onScreen(V)) return;
  const x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1)));
  farLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 20))), x1: Math.min(540, R(V.X(X1 + 20))) });
  // flags waving on the grandstand roof
  for (let i = 0; i < 4; i++) { const fx = R(V.X(X0 + 36 + i * 40)), fy = R(V.Y(-206)), col = ["#E05A44", "#F4CA50", "#3A6AC8", "#8D59DA"][i];
    for (let k = 1; k <= 8; k++) { const wv = R(Math.sin(t * 7 + i * 1.3 - k * 0.7) * 1.4 * (k / 8)); for (let j = 0; j < 5 - (k > 5 ? k - 5 : 0); j++) c.px(fx + k, fy + j + wv, j === 0 ? mix(col, "#FFFFFF", 0.35) : col); } }
  farRail(c, V, t);
  turfLayer().blit(c, V.X(X0), V.Y(TURF_TOP), { wrap: W, shift: shiftOf(t, 0.5), x0, x1 });
  { const sh = SCROLL(t); groundLayer().blit(c, V.X(X0), V.Y(LAND), { wrap: W, rowShift: (d) => sh * ROWP[d], x0, x1 }); }
  nearFence(c, V, t);
  // the LV sign hangs from the far judge's tower (fixed in the world, far behind the streaming rail)
  sign(c, R(V.X(TOWER_X)), R(V.Y(-104)), "LV 5", "plate", 1, t);
  // wind lines behind the horse at full gallop
  const wg = wGallop(t);
  if (wg > 0.05) for (let i = 0; i < 9; i++) { const u = ((t * 2.6 + rnd(i * 7)) % 1), y = R(V.Y(-250 + rnd(i * 3) * 200)), x = R(V.X(HORSE_X + 140 - u * 420)), len = 18 + R(rnd(i * 5) * 26); streak(c, x, y, len, "#FFF8E0", "#F8E0B0", wg * Math.sin(Math.PI * u) * 0.9); }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const gx = R(V.X(HORSE_X)), gy = R(V.Y(LAND));
  if (gx < -260 || gx > 820) return;
  const st = horseState(t);
  // soft contact shadow
  c.tint(gx - 150, gy - 6, 260, 12, (X, Y) => { const d = ((X - gx + 40) / 128) ** 2 + ((Y - gy) / 5) ** 2; return d >= 1 ? 0 : 0.42 * (1 - d); }, "#1E2A10", 3);
  drawHorse(c, gx, gy, st);
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // hoof dust puffs on every beat, sliding back with the ground
  const gx = V.X(HORSE_X), gy = V.Y(LAND);
  for (const e of CONTACTS) {
    const u = t - e.t; if (u < 0 || u > PUFF_LIFE) continue;
    const off = PIV[e.leg][0] + (e.gait === "gallop" ? (e.fore ? GAIT.Af : GAIT.Ah) : 0), drift = SCROLL(t) - SCROLL(e.t);
    dustPuff(c, gx + off, gy - (e.near ? 1 : 3), u, PUFF_LIFE, drift * 0.9, e.gait === "gallop" ? (e.near ? 1 : 0.8) : 0.6, ["#F4E2B0", "#D8C08A", "#B49A68"], R(e.t * 100));
  }
  // the paw scrape on "racehorse"
  { const u = t - (INTRO.paw + INTRO.pawDur * 0.55); dustPuff(c, gx + 6, gy - 1, u, 0.5, 0, 0.7, ["#F4E2B0", "#D8C08A", "#B49A68"], 77); }
  frontGrass(c, V, t);
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // proud sparkles around the prancing horse's head (each grows and shrinks over its life)
  const hx = V.X(HORSE_X) + 14, hy = V.Y(LAND) - 262 + horseState(t).head.dy;
  for (const s of SPARKLES) { const u = (t - s.t) / s.life; if (u <= 0 || u >= 1) continue; twinkle(c, hx + s.dx, hy + s.dy, Math.sin(Math.PI * u), "#FFE88A"); }
}
