// LV10 · marsh (midge, ~1000 beats/s) — a marsh at late dusk (tod ≈ 5.7) under the moon disc. A far bank of dark trees
// with a mist band, dark water with the trees' and the moon's reflections and slow ripples, the yard lawn running on
// from the porch as a grassy left bank, reeds and cattails, a mossy fallen log with tiny mushrooms, lily pads with a
// pale bud, fireflies, stars from the sky layer. Midge swarms dance as specks over the water (periodic paths); one midge
// dances in front of the moon. On "a tiny midge" a round magnifying lens glides in and settles in front of the moon:
// the glass really magnifies (×2) what is behind it, and the one midge comes into focus inside it — cute, fuzzy, with a
// high-speed wing blur fan. The lens stays (fixed to the world) until the camera pans back to the bee.
// Rest camera (5130, −180): screen = (wx − 4860, wy + 660). All art is drawn in those rest-screen coordinates.
import { BIOME, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, fade, mix, bayer, sm, ease, lerp, rnd, blinkAt, clamp01, paintLawn, firefly, paintDuskHills, clipX } from "./porch-kit.mjs";
import { Layer, grade, osc, leafBall } from "./meadow-kit.mjs";
import { drawMidge } from "./marsh-midge.mjs";
import { T } from "./marsh-motions.mjs";

export const RANGE = BIOME.marsh;
const R = Math.round, OX = RANGE[0], OY = -660, W = RANGE[1] - RANGE[0];
const X = (V, x) => R(V.X(OX + x)), Y = (V, y) => R(V.Y(OY + y));

// ---------------------------------------------------------------- palette (late dusk, moonlit)
const TREES = ["#100A1C", "#170F28", "#1E1434", "#271A40", "#30204C", "#3C285A"];
const WATER = ["#7A4E86", "#62407A", "#4C346E", "#3A2A62", "#2C2256", "#221C4A", "#1A163E", "#141234"];
const REED = ["#0C1210", "#141E18", "#1C2A20", "#26382A", "#324834", "#40583E", "#56704C"];
const LOG = ["#140C10", "#22141A", "#341E22", "#46282A", "#5A3632", "#70463C", "#8A5A4A"];
const MOSS = ["#1A2A1E", "#28402A", "#3A5636", "#527040"];
export const LENS = { x: 270, y: 366, r: 112, rim: 12 };                 // final lens centre (rest screen), glass radius, rim
export const SIGN = [96, 643];
const bankX = (y) => 46 + (y - 640) * 0.3 + 6 * Math.sin(y * 0.045);   // the grassy left bank ends here (water to the right)
const pick = (ramp, v, x, y) => { const lo = Math.floor(v), f = v - lo; return ramp[Math.max(0, Math.min(ramp.length - 1, f > 0.5 + 0.4 * (bayer(x, y) - 0.5) ? lo + 1 : lo))]; };

// ---------------------------------------------------------------- static layers
let BACK = null, LAWN = null, FRONT_REEDS = null;
function build() {
  BACK = new Layer(OX, OY, OX + W, OY + 960); LAWN = new Layer(OX, OY, OX + W, OY + 960);
  const g = BACK.c;
  paintLawn(LAWN.c, 0, W, 640, 960, (x, y) => x < bankX(y) - 3, 77);
  // far hills and the dark tree line of the far bank (a tall dark clump at the left edge meets the porch's trees)
  paintDuskHills(g, 0, W, OX);
  for (let x = 0; x < W; x++) { const hn = 12 + 5 * Math.sin(x * 0.025 + 0.6) + 3 * Math.sin(x * 0.09); for (let y = R(640 - hn); y < 640; y++) g.px(x, y, (y - (640 - hn)) < 1.5 ? "#33224C" : "#211638"); }
  for (let i = 0; i < 30; i++) { const x = rnd(i * 11 + 5) * W, r = 9 + rnd(i * 13 + 2) * 12; if (x > 200 && x < 340 && r > 11) continue; leafBall(g, x, 640 - r * 0.55 - rnd(i * 7) * 6, r, TREES, i * 5 + 3, { amp: 0.16, bumps: 8, outline: "#0A0614" }); }
  g.rect(14, 560, 4, 80, "#120A1C");
  for (const [dx, dy, r] of [[0, -102, 20], [-16, -82, 18], [14, -84, 19], [-4, -64, 22], [20, -60, 16]]) leafBall(g, 16 + dx, 640 + dy, r, TREES, dx * 7 + dy, { amp: 0.15, bumps: 8, outline: "#0A0614" });
  for (const [dx, dy, r] of [[0, -74, 15], [-12, -58, 14], [12, -56, 15]]) leafBall(g, 488 + dx, 640 + dy, r, TREES, dx * 5 + dy + 3, { amp: 0.15, bumps: 8, outline: "#0A0614" });
  // water: horizon-coloured near the far bank, darker toward the viewer; slow ripple dashes; reflections of the bank
  for (let y = 640; y < 960; y++) {
    const v = Math.pow((y - 640) / 320, 0.8) * 7.2, step = y < 700 ? 2 : y < 820 ? 3 : 4, dash = 6 + (y - 640) * 0.08;
    for (let x = R(Math.max(0, bankX(y) - 4)); x < W; x++) {
      let col = pick(WATER, v, x, y);
      if ((y - 640) % step === 0) { const q = rnd(Math.floor((x + y * 13) / dash) * 7 + y); if (q < 0.16) col = pick(WATER, v - 1, x, y); else if (q > 0.86) col = pick(WATER, v + 1, x, y); }
      const sy = 640 - (y - 640) * 1.25;                                                   // mirrored far bank
      if (y < 700 && g.m[Math.floor(sy) * g.w + x] && ((y + Math.floor((x + 3 * Math.sin(y)) / 9)) % 6 !== 0)) { const s0 = g.get(x, sy); col = mix(s0, WATER[6], 0.45 + (y - 640) / 140); }
      g.px(x, y, col);
    }
  }
  // the far shore line and a mist band (pale, dithered) lying on the water
  for (let x = 0; x < W; x++) { g.px(x, 640, "#8A5A90"); for (let y = 622; y < 660; y++) { const k = 1 - Math.abs(y - 640) / 20; if (k * 0.42 * (0.7 + 0.3 * Math.sin(x * 0.03 + y * 0.2)) > bayer(x, y)) g.px(x, y, mix(g.get(x, y), "#B08AB8", 0.4)); } }
  // the left bank: lawn (graded layer) with a muddy edge
  for (let y = 640; y < 960; y++) { const bx = bankX(y); for (let x = R(bx - 4); x <= R(bx); x++) g.px(x, y, x > bx - 1.5 ? "#4A3A58" : x > bx - 3 ? "#2A1C2A" : "#1E1420"); }
  // the bank: grass tufts, clover, little pale flowers and a few stones at the water's edge
  { const L = LAWN.c, T3 = ["#2A4A30", "#3A6040", "#5A8050"];
    for (let i = 0; i < 70; i++) { const y = R(646 + Math.pow(rnd(i * 3 + 1), 0.9) * 310), x = R(rnd(i * 3 + 2) * (bankX(y) - 10)); if (x < 0) continue; const d = y - 640, h = 4 + d * 0.05; tuftL(L, x, y, h, 3 + (d > 150 ? 2 : 0), T3, i); }
    for (let i = 0; i < 26; i++) { const y = R(660 + rnd(i * 5 + 1) * 290), x = R(rnd(i * 5 + 2) * (bankX(y) - 14)), sz = y > 820 ? 2 : 1; if (x < 2) continue; const col = i % 3 ? "#E8E0F8" : "#F4D6E8"; L.px(x, y, col); if (sz > 1) { L.px(x - 1, y, col); L.px(x + 1, y, col); L.px(x, y - 1, col); L.px(x, y + 1, "#C8A8D8"); L.px(x, y, "#F4CA50"); } }
    for (const [y, r] of [[700, 5], [760, 7], [842, 9], [905, 11]]) { const x = R(bankX(y) - r * 0.6); for (let yy = -r; yy <= 0; yy++) for (let xx = -r * 1.4; xx <= r * 1.4; xx++) { const q = (xx / (r * 1.4)) ** 2 + (yy / r) ** 2; if (q > 1) continue; g.px(R(x + xx), y + yy + 2, q > 0.75 ? "#1A1424" : xx + yy < -r * 0.5 ? "#7A6A8A" : "#4E4060"); } } }
  // back reed clumps (far bank right, left shore) and their reflections
  for (const [x, y, n, h, sd] of [[372, 642, 16, 46, 1], [418, 644, 22, 58, 2], [468, 646, 26, 70, 3], [520, 648, 18, 54, 4], [56, 650, 16, 54, 5], [100, 700, 20, 66, 6], [150, 780, 14, 60, 7], [486, 770, 18, 74, 8], [440, 700, 10, 50, 9]]) reeds(g, x, y, n, h, sd, true);
  // fallen log reaching from the bank into the water (moss, a cut end with rings, mushrooms), and its reflection
  fallenLog(g);
  // lily pads with a pale bud
  for (const [x, y, r] of [[300, 900, 17], [356, 872, 13], [246, 934, 19], [410, 930, 15], [330, 950, 12], [430, 846, 12], [392, 812, 10], [212, 760, 9]]) lilyPad(g, x, y, r);
  lilyBud(g, 302, 892); lilyBud(g, 412, 922, 0.8);
  // the sign post standing in the shallows (ripple ring at its foot)
  for (let x = -9; x <= 9; x++) { const yy = SIGN[1] + R(Math.sqrt(Math.max(0, 1 - (x / 9) ** 2)) * 2); g.px(SIGN[0] + x, yy, "#9A72A8"); g.px(SIGN[0] + x, SIGN[1] - R(Math.sqrt(Math.max(0, 1 - (x / 9) ** 2)) * 2), "#6A4A80"); }
  // foreground reeds (swaying per frame): precomputed blades at both bottom corners
  FRONT_REEDS = [];
  for (let i = 0; i < 26; i++) { const left = i < 13, x = left ? 4 + rnd(i * 7) * 104 : 446 + rnd(i * 7) * 100, y = 960 + rnd(i * 3) * 10, h = 120 + rnd(i * 5 + 1) * 150; FRONT_REEDS.push({ x, y, h, lean: (left ? 1 : -1) * (6 + rnd(i * 9) * 20), n: 13 + (i % 7) * 4, ph: rnd(i * 11) * 6.28, w: 3 + rnd(i * 13) * 3, cat: rnd(i * 17) < 0.3 }); }
}
function tuftL(g, x, y, h, n, cols, seed) { for (let i = 0; i < n; i++) { const bx = x + (i - (n - 1) / 2) * 2, bh = h * (0.6 + rnd(seed * 13 + i) * 0.5), lean = (rnd(seed * 7 + i) - 0.5) * h * 0.6; for (let j = 0; j <= bh; j++) g.px(R(bx + lean * (j / bh) ** 2), R(y - j), j > bh * 0.6 ? cols[2] : cols[i % 2]); } }
function reeds(g, x, y, n, h, seed, cat) {
  for (let i = 0; i < n; i++) {
    const bx = x + (rnd(seed * 100 + i) - 0.5) * n * 2.2, bh = h * (0.55 + rnd(seed * 100 + i + 40) * 0.6), lean = (rnd(seed * 100 + i + 80) - 0.5) * h * 0.4, w = 1 + (bh > h * 0.8 ? 1 : 0);
    for (let j = 0; j <= bh; j++) { const k = j / bh, xx = bx + lean * k * k; for (let q = 0; q < w; q++) g.px(R(xx) + q, R(y - j), q === 0 && k > 0.3 ? REED[4] : REED[2]); }
    for (let j = 1; j < bh * 0.4; j++) if ((j + i) % 3) g.px(R(bx + (rnd(i) - 0.5) * 2), R(y + j), mix(g.get(R(bx), R(y + j)), REED[1], 0.5));   // reflection streak
    if (cat && rnd(seed * 31 + i) < 0.22) { const tx = R(bx + lean * 0.85), ty = R(y - bh * 0.92); g.rect(tx - 2, ty, 5, 12, "#2E1A14"); g.rect(tx - 1, ty + 1, 3, 10, "#5A3424"); g.px(tx - 1, ty + 1, "#7A4A32"); g.rect(tx, ty - 6, 1, 6, REED[3]); }
  }
}
function fallenLog(g) {
  const a = [8, 870], b = [232, 818], len = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, nx = -uy, ny = ux, r = 15;
  for (let Y = 790; Y < 900; Y++) for (let X = 0; X < 260; X++) {
    const dx = X - a[0], dy = Y - a[1], u = dx * ux + dy * uy, v = dx * nx + dy * ny;            // v < 0 = upper side
    if (u < 0 || u > len) continue; const rr = r * (1 - 0.08 * (u / len)); if (Math.abs(v) > rr) continue;
    const lit = -v / rr, bark = Math.sin(u * 0.5 + Math.sin(v * 0.7) * 2) > 0.6;
    let col = Math.abs(v) > rr - 1.2 ? LOG[0] : pick(LOG, 3 + lit * 2.2 - (bark ? 1 : 0), X, Y);
    if (lit > 0.45 && (Math.sin(u * 0.23) + Math.sin(u * 0.61 + 1)) > 0.4 && Math.abs(v) < rr - 1.2) col = pick(MOSS, 1.5 + lit * 1.6, X, Y);
    g.px(X, Y, col);
    if (v > 0) { const ry = Y + R((rr - v) * 2 + 4); if (ry < 960 && (Math.floor(ry / 2) % 2 || ((X >> 2) & 1))) g.px(X, ry, mix(g.get(X, ry), LOG[1], 0.55)); }   // reflection
  }
  // the cut end (rings) and two tiny mushrooms
  const [ex, ey] = b;
  for (let Y = -16; Y <= 16; Y++) for (let X2 = -7; X2 <= 7; X2++) { const d = Math.hypot(X2 / 7, Y / 15.5); if (d > 1) continue; g.px(ex + X2, ey + Y, d > 0.86 ? LOG[1] : Math.floor(d * 5) % 2 ? "#B08A66" : "#8A6648"); }
  for (const [u, s] of [[130, 1], [150, 0.8]]) { const px = R(a[0] + ux * u + nx * -14), py = R(a[1] + uy * u + ny * -14); g.rect(px, py - 4 * s, 2, R(5 * s), "#E8D8C0"); for (let i = -4; i <= 4; i++) for (let j = 0; j <= 3; j++) if (i * i / 16 + (j - 3) ** 2 / 9 <= 1) g.px(px + i, R(py - 4 * s - 3 + j), j < 1 ? "#F09070" : "#D85A4A"); g.px(px - 2, R(py - 6 * s), "#FFE4D0"); }
}
function lilyPad(g, x, y, r) {
  for (let Y = R(y - r * 0.36); Y <= R(y + r * 0.36); Y++) for (let X = R(x - r); X <= R(x + r); X++) {
    const d = Math.hypot((X - x) / r, (Y - y) / (r * 0.34)); if (d > 1) continue; const ang = Math.atan2((Y - y) / 0.34, X - x); if (ang > -0.25 && ang < 0.15 && d > 0.15) continue;   // the notch
    g.px(X, Y, d > 0.86 ? "#0E1C14" : Y < y - r * 0.12 ? "#3A6A44" : (X + Y) % 7 === 0 ? "#2A5236" : "#2E583A");
  }
}
function lilyBud(g, x, y, s = 1) {
  for (const [dx, h, col] of [[-4, 10, "#D8A8C8"], [4, 10, "#C890B8"], [0, 13, "#F4D8EA"]]) for (let j = 0; j < h * s; j++) { const w = R(Math.sin(Math.PI * (j / (h * s))) * 3 * s + 1); g.rect(R(x + dx * s) - w + 1, R(y - j), w * 2 - 1, 1, j > h * s * 0.7 ? "#FFF0F8" : col); }
}

// ---------------------------------------------------------------- the lens and the midges
function lensAt(t) {
  const k = ease(clamp01((t - T.lens[0]) / (T.lens[1] - T.lens[0]))), x0 = 520, y0 = 690;
  const x = lerp(lerp(x0, 430, k), lerp(430, LENS.x, k), k), y = lerp(lerp(y0, 470, k), lerp(470, LENS.y, k), k);
  return { x, y, a: sm(t, T.lensIn[0], T.lensIn[1]), ang: lerp(1.3, 0.93, k) + 0.02 * osc(t, END, 17) * k, on: t >= T.lens[0] };
}
const dance = (t) => [4 * osc(t, END, 53) + 2 * osc(t, END, 89, 1), 3 * osc(t, END, 71, 1) + 1.5 * osc(t, END, 131, 2)];
const SPECK = (t) => { const d = dance(t); return [LENS.x + d[0], LENS.y - 8 + d[1]]; };
function speck(c, x, y, big) {
  const bg = c.get(x, y), lum = bg[0] * 0.3 + bg[1] * 0.55 + bg[2] * 0.15, col = lum > 120 ? "#1E1430" : "#E8DCF4", wing = lum > 120 ? "#6A5A8A" : "#A898C8";
  c.px(x, y, col); if (big) { c.px(x + 1, y, col); c.px(x, y + 1, col); } c.px(x - 1, y - 1, wing); c.px(x + 1 + (big ? 1 : 0), y - 1, wing);
}
function swarms(c, V, t) {
  for (const [cx, cy, n, rx, ry, seed] of [[118, 520, 22, 40, 30, 1], [392, 500, 26, 46, 36, 2], [208, 600, 10, 28, 16, 3]]) for (let i = 0; i < n; i++) {
    const q = seed * 100 + i, n1 = 31 + Math.floor(rnd(q) * 40), n2 = 47 + Math.floor(rnd(q + 1) * 50), n3 = 23 + Math.floor(rnd(q + 2) * 30);
    const x = cx + rx * (0.6 * osc(t, END, n1, rnd(q + 3) * 6.28) + 0.4 * osc(t, END, n3, rnd(q + 4) * 6.28)), y = cy + ry * (0.7 * osc(t, END, n2, rnd(q + 5) * 6.28) + 0.3 * osc(t, END, n1 + 7, 1));
    speck(c, X(V, x), Y(V, y), rnd(q + 6) < 0.3);
  }
}
function drawLens(c, V, t, L) {
  const cx = X(V, L.x), cy = Y(V, L.y), rg = LENS.r, rr = rg + LENS.rim, a = L.a;
  if (cx + rr + 200 < 0 || cx - rr > 560) return;
  // magnified view (×2, nearest) of what is behind the glass, slightly cool and bright
  const half = Math.ceil(rg / 2) + 2, sx0 = cx - half, sy0 = cy - half, sw = half * 2 + 1, src = new Uint8ClampedArray(sw * sw * 3);
  for (let j = 0; j < sw; j++) for (let i = 0; i < sw; i++) { const p = c.get(sx0 + i, sy0 + j), o = (j * sw + i) * 3; src[o] = p[0]; src[o + 1] = p[1]; src[o + 2] = p[2]; }
  const g = fade(c, a);
  for (let y = cy - rg; y <= cy + rg; y++) for (let x = cx - rg; x <= cx + rg; x++) {
    if (x < 0 || x >= 540 || y < 0 || y >= 960) continue; const d = Math.hypot(x - cx, y - cy); if (d > rg) continue;
    const i = Math.floor((x - cx) / 2) + half, j = Math.floor((y - cy) / 2) + half, o = (j * sw + i) * 3;
    let col = [src[o], src[o + 1], src[o + 2]];
    col = mix(col, "#F4F8FF", 0.07);
    if (d > rg - 9 && (d - (rg - 9)) / 9 * 0.55 > bayer(x, y)) col = mix(col, "#2A2048", 0.3);         // glass thickness at the edge
    g.px(x, y, col);
  }
  return { cx, cy, rg, rr };
}
function lensRim(c, V, L, geo) {
  const { cx, cy, rg, rr } = geo, a = L.a, g = fade(c, a), BR = ["#2A1A0C", "#5A3A14", "#8A5E1E", "#B8862C", "#DDB044", "#F6D878", "#FFF4C4"];
  // handle: brass ferrule + a wooden grip with a rounded end
  const ux = Math.cos(L.ang), uy = Math.sin(L.ang), nx = -uy, ny = ux, hx0 = cx + ux * (rr - 2), hy0 = cy + uy * (rr - 2);
  for (let u = 0; u < 112; u++) for (let v = -9; v <= 9; v++) {
    const w = u < 16 ? 6.5 - u * 0.05 : 7.5 - Math.max(0, u - 100) * 0.4; if (Math.abs(v) > w) continue;
    const x = R(hx0 + ux * u + nx * v), y = R(hy0 + uy * u + ny * v), lit = -v / w;
    let col = u < 16 ? pick(BR, 3 + lit * 2.2 + (u === 3 || u === 12 ? -1.5 : 0), x, y) : pick(["#1A0A0C", "#3A1418", "#5E2024", "#86302E", "#A8463A", "#C8644E"], 2.6 + lit * 2 - (u > 106 ? 1 : 0), x, y);
    if (Math.abs(v) > w - 1) col = "#120808"; g.px(x, y, col);
  }
  // the rim ring: brass, lit from the upper left, a dark inner lip
  for (let y = cy - rr - 1; y <= cy + rr + 1; y++) for (let x = cx - rr - 1; x <= cx + rr + 1; x++) {
    const d = Math.hypot(x - cx, y - cy); if (d < rg - 0.5 || d > rr + 0.5) continue;
    const ang = Math.atan2(y - cy, x - cx), lit = -Math.cos(ang + 2.36), band = (d - rg) / (rr - rg);
    let col = pick(BR, 3.2 + lit * 2 + (band < 0.25 ? -1.2 : band > 0.8 ? -0.6 : 0.4), x, y);
    if (d > rr - 0.6 || d < rg + 0.6) col = "#140C06";
    g.px(x, y, col);
  }
  // highlights on the glass: a soft crescent upper-left and a sparkle
  for (let y = cy - rg; y <= cy; y++) for (let x = cx - rg; x <= cx; x++) {
    const d = Math.hypot(x - cx, y - cy), ang = Math.atan2(y - cy, x - cx); if (d < rg - 22 || d > rg - 10 || ang > -1.75 || ang < -2.75) continue;
    const k = Math.sin(((ang + 2.75) / 1.0) * Math.PI) * 0.75; if (k * a > bayer(x, y) + 0.1) c.px(x, y, mix(c.get(x, y), "#FFFFFF", 0.7));
  }
  for (const [dx, dy] of [[-62, -62], [-61, -62], [-62, -61], [-63, -62], [-62, -63]]) g.px(cx + dx, cy + dy, "#FFFFFF");
  for (const [dx, dy] of [[-48, -78], [-47, -78]]) g.px(cx + dx, cy + dy, "#FFFFFF");
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RANGE[0] - 140 || V.x0 > RANGE[1] + 140 || V.X(RANGE[0]) >= 550 || V.X(RANGE[1]) <= -10;   // (also skip when only the 140-px margin is in view)
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  const x0 = Math.max(0, X(V, 0)), x1 = Math.min(540, X(V, W));
  LAWN.blit(c, V, { grade: grade(tod(V.cx)), x0, x1 }); BACK.blit(c, V, { x0, x1 });
}
export function actors(c0, V, t) {
  if (off(V)) return;
  const c = clipX(c0, X(V, 0), X(V, W));
  // moon glitter on the water below the moon (shimmering strokes, periodic)
  for (let y = 646; y < 952; y += 3) {
    const w = 8 + (y - 640) * 0.1, fall = 1 - (y - 640) / 360;
    for (let k = -3; k <= 3; k++) {
      const sh = osc(t, END, 41 + ((y * 7 + k * 13) % 23), y * 0.37 + k), len = (w / 3.2) * (0.35 + 0.65 * Math.abs(osc(t, END, 29 + ((y + k * 5) % 17), y * 0.21 + k * 1.3)));
      const x0 = 270 + k * (w / 2.6) + sh * 3 - len / 2, bright = (1 - Math.abs(k) / 3.6) * fall;
      if (bright < 0.12) continue; const col = bright > 0.62 ? "#FBE8BC" : bright > 0.38 ? "#D8B0B8" : "#9A7AA8";
      for (let x = R(x0); x <= R(x0 + len); x++) { const sx = X(V, x), sy = Y(V, y); if (sx >= 0 && sx < 540) c.px(sx, sy, col); }
    }
  }
  // rings spreading on the water where something touches it (periodic)
  for (const [x, y, n, ph] of [[350, 760, 11, 0], [200, 880, 9, 0.4], [455, 905, 13, 0.7], [300, 700, 7, 0.2]]) {
    const p = (((n * t) / END + ph) % 1 + 1) % 1, r = 2 + p * 22, a = Math.min(1, p * 6) * (1 - p) * 0.9; if (a < 0.08) continue; const g = fade(c, a), sy = 0.3 + (y - 640) / 1000;
    for (let k = 0; k < 40; k++) { const an = (k / 40) * 2 * Math.PI, xx = x + Math.cos(an) * r, yy = y + Math.sin(an) * r * sy; g.px(X(V, xx), Y(V, yy), an > Math.PI ? "#A88AC0" : "#6A5290"); }
  }
  // fireflies along the reeds and the bank
  for (let i = 0; i < 6; i++) { const ph = (2 * Math.PI * (4 + i * 2) * t) / END + i * 2.1, x = [70, 130, 360, 420, 470, 190][i] + Math.sin(ph) * 14, y = [600, 650, 610, 590, 630, 700][i] + Math.sin(ph * 2 + i) * 7; firefly(c, X(V, x), Y(V, y), Math.max(0, osc(t, END, 27 + i * 9, i * 1.9)) ** 2); }
  // a few bright twinkling stars over the marsh (4-point sparkles, periodic)
  for (const [x, y, n, big] of [[62, 300, 23, 1], [468, 318, 31, 1], [118, 420, 17, 0], [430, 432, 29, 0], [36, 236, 13, 0], [506, 262, 19, 1], [196, 548, 37, 0], [352, 560, 41, 0]]) {
    const tw = 0.55 + 0.45 * osc(t, END, n, x), sx = X(V, x), sy = Y(V, y), arm = big ? R(2 + tw * 3) : R(1 + tw * 1.5);
    c.px(sx, sy, "#FFF8E8"); for (let k = 1; k <= arm; k++) { const col = k === 1 ? "#F4ECFF" : k === arm ? "#8A7AB8" : "#C8B8F0"; c.px(sx - k, sy, col); c.px(sx + k, sy, col); c.px(sx, sy - k, col); c.px(sx, sy + k, col); }
  }
  sign(c, X(V, SIGN[0]), Y(V, SIGN[1]), "LV 10", "wood", 1, t);
  // midge swarms dancing over the water, and the one midge in front of the moon
  swarms(c, V, t);
  const sp = SPECK(t); speck(c, X(V, sp[0]), Y(V, sp[1]), true);
  // the magnifying lens (from "a tiny midge" on): glass magnifies ×2, the midge comes into focus inside it
  const L = lensAt(t); if (!L.on || L.a <= 0) return;
  const geo = drawLens(c, V, t, L); if (!geo) return;
  const f = sm(t, T.focus[0], T.focus[1]);
  if (f > 0) {
    const clip = Object.create(c); clip.px = (x, y, col) => { if ((x - geo.cx) ** 2 + (y - geo.cy) ** 2 <= (geo.rg - 1) ** 2) c.px(x, y, col); };
    const d = dance(t), hx = geo.cx + 2 * (X(V, sp[0]) - geo.cx), hy = geo.cy + 2 * (Y(V, sp[1]) - geo.cy) - 6;
    const e = Math.cos(2 * Math.PI * wingPhase("midge", t)) * strokeAmt("midge", t);
    drawMidge(clip, hx, hy, { s: lerp(0.8, 1, f), a: f * L.a, tilt: 0.04 * osc(t, END, 19) + d[0] * 0.006, look: [0.15 * osc(t, END, 7), 0.12 * osc(t, END, 11)], blink: blinkAt(t, END / 12, 0.4), wing: e, amt: strokeAmt("midge", t), antSway: 1.5 * osc(t, END, 61), legSway: -d[0] * 0.5, open: 0.3 });
  }
  lensRim(c, V, L, geo);
}
export function front(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  for (const b of FRONT_REEDS) {
    const sw = 3.5 * osc(t, END, b.n, b.ph), bx = X(V, b.x), by = Y(V, b.y); if (bx < -60 || bx > 600) continue;
    for (let j = 0; j <= b.h; j++) {
      const k = j / b.h, xx = bx + (b.lean + sw) * k * k, half = Math.max(0.5, b.w * (1 - k) * 0.5 + 0.5), yy = by - j;
      for (let q = -Math.floor(half); q <= Math.ceil(half) - 1; q++) { const px = R(xx) + q; if (px < 0 || px >= 540 || yy < 0 || yy >= 960) continue; c.px(px, yy, q === -Math.floor(half) ? REED[5] : q === Math.ceil(half) - 1 ? REED[1] : k > 0.7 ? REED[4] : REED[3]); }
    }
    if (b.cat) { const tx = R(bx + (b.lean + sw) * 0.81), ty = R(by - b.h * 0.9); c.rect(tx - 4, ty, 9, 22, "#1E100C"); c.rect(tx - 3, ty + 1, 7, 20, "#5A3424"); c.rect(tx - 3, ty + 1, 2, 19, "#7A4A32"); c.rect(tx, ty - 10, 1, 10, REED[4]); }
  }
}
