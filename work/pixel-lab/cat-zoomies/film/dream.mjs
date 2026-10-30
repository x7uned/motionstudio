// «Why your cat sleeps all day…» — the cat's dream: a wild savanna/steppe at golden dusk (or soft day) with a mouse
// burrow, shown inside a thought bubble that grows out of the sleeping house cat. The lead draws the wildcat itself
// (cat.mjs, palette "wild"); this module draws the world, the field mouse and the bubble.
// Own world: ground wy = 0 (actors' plane, p = 1), burrow mouth at wx = 0, horizon far behind. Same camera / layer
// conventions as layout.mjs. Pure functions of their arguments (t, light); no Math.random, nothing pops in one frame.
import { Canvas, mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawPart, smooth } from "../../dog/shade.mjs";
import { ell } from "../../animals/film/cute.mjs";
import { layer, clamp01, lerp, rnd } from "./layout.mjs";

const R = Math.round, TAU = Math.PI * 2;
export const HZ = -70;                                         // horizon height (far layers), world units
/** Burrow: arched mouth in a dirt mound at x = 0 on the ground line. Pass (BURROW.x, BURROW.y) to drawMouse for "peek". */
export const BURROW = { x: 0, y: 0, rx: 7.5, ry: 10, moundW: 33, moundH: 16 };
/** Camera range the scene is tuned for (any pan/zoom between and a little beyond works). */
export const DREAM_CAMS = { wide: { cx: 0, cy: -60, z: 1.6 }, close: { cx: 0, cy: -30, z: 3 } };

// ---------------------------------------------------------------- palette: [golden dusk, soft day], mixed by `light`
const PAIR = {
  sun: ["#FFF6D6", "#FFFFF4"], sunRim: ["#FFBC5E", "#FFF2B4"], sunGlow: ["#FF9A5A", "#FFF8DE"],
  cTop: ["#B65E8A", "#FFFFFF"], cMid: ["#EC8A8E", "#EEF4FE"], cBot: ["#FFD49E", "#CFDDF0"],
  ridge: ["#C06E8A", "#9CAED0"], ridgeLow: ["#E69A8E", "#C2D0E2"], ridgeRim: ["#FFD2A8", "#DCE6F2"],
  plain: ["#F6B07A", "#DCD4A2"], plainLow: ["#E2926A", "#CCC28E"],
  b1: ["#D6865F", "#C6BA7C"], b1Low: ["#C47252", "#B6A86C"], tree1: ["#8C4A5E", "#71804C"], tree1Rim: ["#F2A478", "#A9B474"],
  b2: ["#BC6A4C", "#B2A062"], b2Low: ["#A65A42", "#9E8C52"], tree2: ["#5C2C44", "#4C6036"], tree2Rim: ["#F48E60", "#8E9E5C"],
  b3: ["#9A5038", "#A08A46"], b3Low: ["#84432F", "#8C783C"], b3Tip: ["#FFC676", "#EADF98"],
  b4: ["#74382C", "#7E6E3A"], b4Low: ["#5F2E27", "#6A5C30"], b4Tip: ["#F6A456", "#D2C67E"],
  gr: ["#5A2D28", "#7A6836"], grLow: ["#2E1620", "#4C4026"], grTip: ["#E08E4C", "#C4B672"], grRow: ["#6E3A2C", "#8E7C42"],
  dirt: ["#8C583C", "#A88A5C"], dirtLow: ["#6C4030", "#8C7046"], dirtLit: ["#B8784E", "#C8AA76"], pebble: ["#C89A72", "#D8C29A"],
  tuft: ["#4A2422", "#5C5228"], tuftTip: ["#EE9C54", "#CCC07A"], seed: ["#FFD48E", "#F2E8B2"],
  hole: ["#160A0E", "#1C120E"], holeIn: ["#2A1418", "#2E2216"], holeRim: ["#4A2620", "#54402A"], lip: ["#C88C5C", "#D2B282"],
  front: ["#2C121A", "#3A3A1C"], frontMid: ["#48202A", "#55532A"], frontLit: ["#B05C3E", "#A69C4C"],
  mote: ["#FFE8A6", "#FFFFF2"], moteDim: ["#E8A070", "#E8F0E0"],
};
const RAMP2 = {
  dirtR: [["#2A1414", "#4A2620", "#6A3A2A", "#8A5236", "#A86C44", "#C48A58", "#DCA872", "#EEC890"], ["#2A2018", "#4A3826", "#6A5236", "#8A6C48", "#A8885C", "#C4A474", "#DCC090", "#F0DCB0"]],
  stoneR: [["#1A1014", "#2E2026", "#46343A", "#5E4A4C", "#7A625E", "#967C72", "#B0968A", "#C8AE9E"], ["#1C1C22", "#34343C", "#4E5058", "#6A6C74", "#888A90", "#A6A8AC", "#C4C6C8", "#E2E2E2"]],
};
const SKY_D = [0, 22, 70, 140, 236, 360, 520, 760];
const SKY = [["#FFE4A6", "#FFC07C", "#F8906C", "#D06688", "#8A4A8E", "#463074", "#261E54", "#1A1640"],
             ["#F8F4DE", "#E8F2EC", "#CCE6F2", "#A8D4F2", "#82BCEC", "#609FE0", "#4A8AD4", "#3E7CCA"]];
let PAL_L = -1, PAL = null;
function palette(L) {
  const q = R(L * 128) / 128; if (q === PAL_L) return PAL;
  const P = {}; for (const k in PAIR) P[k] = mix(PAIR[k][0], PAIR[k][1], q);
  for (const k in RAMP2) P[k] = RAMP2[k][0].map((c, i) => mix(c, RAMP2[k][1][i], q));
  P.sky = SKY[0].map((c, i) => mix(c, SKY[1][i], q));
  PAL_L = q; PAL = P; return P;
}

// ---------------------------------------------------------------- fast pixel sink (direct buffer on a plain Canvas)
function sink(c) {
  if (c.px === Canvas.prototype.px && c.d) { const d = c.d, W = c.w, H = c.h; return { W, H, set(x, y, p) { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; }, get: (x, y) => c.get(x, y) }; }
  return { W: c.w, H: c.h, set(x, y, p) { c.px(x, y, p); }, get: (x, y) => c.get(x, y) };
}
const mixq = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k].map(R);
/** Ordered-dither pick between n quantised steps of a → b. */

// ---------------------------------------------------------------- wind: gentle gusts, pure function of t
const sway = (t, x) => Math.sin(t * 1.55 + x * 0.11) * 0.65 + Math.sin(t * 0.83 + x * 0.043 + 1.3) * 0.35;

/** Gradient table a → b over `span` steps, quantised into `steps` flat bands; fr = dither fraction (narrow = dither only
 *  in a thin transition between two bands). Pick with gpick(T, index, x, y). No allocation per pixel. */
function gradT(a, b, span, steps, narrow = false) {
  const n = Math.max(1, Math.ceil(span)) + 1, lo = new Array(n), hi = new Array(n), fr = new Float32Array(n);
  for (let i = 0; i < n; i++) { const s = clamp01(i / Math.max(1, span)) * steps, l = Math.min(steps, Math.floor(s)), f = s - l; lo[i] = mixq(a, b, l / steps); hi[i] = mixq(a, b, Math.min(steps, l + 1) / steps); fr[i] = narrow ? clamp01((f - 0.32) / 0.36) : f; }
  return { lo, hi, fr, n };
}
const gpick = (T, d, x, y) => { const i = d <= 0 ? 0 : d >= T.n - 1 ? T.n - 1 : d | 0; return T.fr[i] > bayer(x, y) ? T.hi[i] : T.lo[i]; };

// ---------------------------------------------------------------- layer bands (far → near)
const BAND = { ridge: 0.05, plain: 0.1, b1: 0.18, b2: 0.3, b3: 0.5, b4: 0.75, sun: 0.02, cloud: 0.03, mote: 0.88 };
const plateau = (x, a, b, e) => clamp01((x - a) / e) * clamp01((b - x) / e);
const ridgeH = (wx) => 20 + 8 * Math.sin(wx * 0.012 + 0.7) + 5 * Math.sin(wx * 0.031 + 2.1) + 1.6 * Math.sin(wx * 0.09) + 15 * plateau(wx, -250, -168, 9) + 9 * plateau(wx, 236, 300, 7);
const b1Top = (wx) => -62 + 1.5 * Math.sin(wx * 0.05) + Math.sin(wx * 0.13 + 1);
const b2Top = (wx) => -50 + 2.5 * Math.sin(wx * 0.035 + 1) + Math.sin(wx * 0.11);
const b3Base = (wx) => -30 + 2 * Math.sin(wx * 0.04) + 1.2 * Math.sin(wx * 0.1 + 2);
const b4Base = (wx) => -13 + 2.4 * Math.sin(wx * 0.03 + 0.5) + 1.3 * Math.sin(wx * 0.09 + 1);
/** Height of a row of thin grass blades at wx (spacing sp, max height H), leaning with the wind. */
function blades(wx, sp, H, t, seed, windK) {
  const i0 = Math.floor(wx / sp); let best = 0;
  for (let i = i0 - 2; i <= i0 + 2; i++) {
    const r1 = rnd(i * 7 + seed * 3), xc = (i + 0.5 + (rnd(i * 13 + seed) - 0.5) * 0.8) * sp, h = H * (0.25 + 0.75 * r1 * r1), w = sp * (0.32 + 0.22 * rnd(i * 5 + seed));
    const tip = xc + sway(t, xc) * h * windK, a = xc - w, b = xc + w;
    if (wx <= a || wx >= b) continue;
    const v = wx < tip ? h * (wx - a) / Math.max(0.3, tip - a) : h * (b - wx) / Math.max(0.3, b - tip);
    if (v > best) best = v;
  }
  return best;
}

// ---------------------------------------------------------------- scenery objects (layer world units)
const TREES1 = [[-330, 22, 18], [-150, 26, 20], [22, 18, 14], [196, 28, 22], [318, 20, 16], [-470, 24, 18], [460, 22, 18]];
const BUSH1 = [[-240, 5], [-92, 6], [110, 5], [252, 7], [-400, 6], [390, 5]];
const TREES2 = [[52, 58, 46], [-176, 42, 32], [-420, 50, 40], [330, 46, 36]];
const BUSH2 = [[-92, 9], [-44, 7], [124, 10], [186, 8], [-290, 9], [262, 7]];
const TREES0 = [[-262, 9, 7], [-188, 7, 6], [-40, 8, 7], [148, 10, 8], [232, 7, 6], [338, 9, 7]];

/** Flat-top acacia in layer L rooted at (wx, wy): forked trunk + layered umbrella canopy, rim lit on top. */
function acacia(S, L, wx, wy, h, w, col, rim, seed) {
  const z = L.z, X = L.X, Y = L.Y, tr = Math.max(0.8, 0.055 * h * z);
  if (X(wx + w * 1.2) < -4 || X(wx - w * 1.2) > S.W + 4) return;
  const trunk = (dx, k, bend) => { for (let i = 0; i <= 24; i++) { const u = i / 24, x = wx + dx * u * u + bend * Math.sin(u * Math.PI), y = wy - h * k * u, r = tr * (1 - 0.45 * u); const sx = X(x), sy = Y(y); for (let yy = Math.floor(sy - r); yy <= Math.ceil(sy + r); yy++) for (let xx = Math.floor(sx - r); xx <= Math.ceil(sx + r); xx++) if ((xx + 0.5 - sx) ** 2 + (yy + 0.5 - sy) ** 2 <= r * r + 0.3) S.set(xx, yy, col); } };
  trunk(-w * 0.34, 0.7, -w * 0.05); trunk(w * 0.3, 0.74, w * 0.04); trunk(w * 0.05, 0.62, 0);
  const cy = wy - h * 0.8;
  const parts = [[0, 0, w, w * 0.15], [-w * 0.46, w * 0.05, w * 0.5, w * 0.12], [w * 0.5, w * 0.06, w * 0.46, w * 0.11], [w * 0.08, -w * 0.08, w * 0.62, w * 0.12], [-w * 0.2, -w * 0.15, w * 0.32, w * 0.08]];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [dx, dy, rx, ry] of parts) { x0 = Math.min(x0, X(wx + dx - rx)); x1 = Math.max(x1, X(wx + dx + rx)); y0 = Math.min(y0, Y(cy + dy - ry)); y1 = Math.max(y1, Y(cy + dy + ry)); }
  const inC = (sx, sy) => { const px = L.wx(sx), py = L.wy(sy); for (const [dx, dy, rx, ry] of parts) { const d = ((px - wx - dx) / rx) ** 2 + ((py - cy - dy) / ry) ** 2; if (d <= 1) { if (d > 0.72 && rnd(R(px * 1.7) * 31 + R(py * 2.3) * 7 + seed) < 0.45) continue; return true; } } return false; };
  const lift = 1.5 * Math.max(1, z * 0.6);
  for (let sy = Math.floor(y0); sy <= Math.ceil(y1); sy++) for (let sx = Math.max(0, Math.floor(x0)); sx <= Math.min(S.W - 1, Math.ceil(x1)); sx++) {
    if (!inC(sx + 0.5, sy + 0.5)) continue;
    S.set(sx, sy, !inC(sx + 0.5, sy - 0.5) || !inC(sx + 0.5, sy + 0.5 - lift) ? rim : col);
  }
}
function bush(S, L, wx, wy, r, col, rim, seed) {
  const parts = [[0, -r * 0.55, r, r * 0.62], [-r * 0.8, -r * 0.35, r * 0.62, r * 0.42], [r * 0.85, -r * 0.3, r * 0.58, r * 0.4]];
  const inB = (sx, sy) => { const px = L.wx(sx), py = L.wy(sy); if (py > wy) return false; for (const [dx, dy, rx, ry] of parts) { const d = ((px - wx - dx) / rx) ** 2 + ((py - wy - dy) / ry) ** 2; if (d <= 1 && !(d > 0.8 && rnd(R(px * 2) * 17 + R(py * 2) * 5 + seed) < 0.4)) return true; } return false; };
  const x0 = Math.max(0, Math.floor(L.X(wx - r * 1.8))), x1 = Math.min(S.W - 1, Math.ceil(L.X(wx + r * 1.8))), y0 = Math.floor(L.Y(wy - r * 1.3)), y1 = Math.ceil(L.Y(wy));
  for (let sy = y0; sy <= y1; sy++) for (let sx = x0; sx <= x1; sx++) { if (!inB(sx + 0.5, sy + 0.5)) continue; S.set(sx, sy, !inB(sx + 0.5, sy - 0.5) ? rim : col); }
}
/** Tapered blade stroke in screen px from (x0, y0) to (x1, y1) through a bend point; width w0 → 1; the last tipK of
 *  its length uses `tip`; optional seed-head pixel colour. */
function blade(S, x0, y0, x1, y1, bx, by, w0, col, tip, tipK = 0.3, seed = null) {
  const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.2));
  for (let i = 0; i <= n; i++) {
    const u = i / n, a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u, x = a * x0 + b * bx + c * x1, y = a * y0 + b * by + c * y1, w = Math.max(1, w0 * (1 - u * 0.85));
    const cc = u > 1 - tipK ? tip : col, hw = (w - 1) / 2;
    for (let yy = Math.floor(y - hw); yy <= Math.floor(y + hw); yy++) for (let xx = Math.floor(x - hw); xx <= Math.floor(x + hw); xx++) S.set(xx, yy, cc);
  }
  if (seed) { S.set(Math.floor(x1), Math.floor(y1), seed); if (w0 >= 2) S.set(Math.floor(x1), Math.floor(y1) - 1, seed); }
}

// ground tufts along the actors' line (behind the actors), kept off the dirt patch around the burrow
const TUFTS = (() => { const out = []; for (let i = -70; i <= 70; i++) { const x = i * 8.5 + (rnd(i * 3 + 1) - 0.5) * 5; if (Math.abs(x) < 50) continue; if (rnd(i * 11 + 4) < 0.22) continue; out.push({ x, n: 3 + Math.floor(rnd(i * 7) * 3), h: 6 + rnd(i * 5 + 2) * 9, s: i }); } return out; })();
const STONES = [[-41, 4.6, 3.2], [-25, 2.4, 1.9], [18, 3.0, 2.2], [27, 1.8, 1.4], [42, 5.2, 3.6], [-58, 2.6, 1.8], [64, 3.4, 2.4]];
// rows of grass tufts on the near meadow below the actors' line (wy > 0), bigger and darker toward the viewer
const MEADOW = (() => { const rows = []; for (let r = 0; r < 14; r++) { const wy = 4 + 4.2 * r + 1.05 * r * r, sp = 6.5 + r * 1.6, items = []; for (let i = -Math.ceil(700 / sp); i <= Math.ceil(700 / sp); i++) { const s = r * 1009 + i; if (rnd(s * 3 + 1) < 0.32) continue; items.push({ x: (i + (rnd(s * 5) - 0.5) * 0.9) * sp, n: 2 + Math.floor(rnd(s * 7) * 3), h: (2.4 + r * 0.95) * (0.6 + 0.6 * rnd(s * 11)), s }); } rows.push({ r, wy, items }); } return rows; })();

/** layout.mjs layer() plus an optional screen shift [dx, dy] — lets the lead place the dream's composition inside the
 *  bubble without changing the camera (use the same shift for the actors: dreamGround(cam, shift)). */
export function dreamLayer(cam, p, shift) {
  const l = layer(cam, p); if (!shift || (!shift[0] && !shift[1])) return l;
  const [dx, dy] = shift; return { z: l.z, X: (wx) => l.X(wx) + dx, Y: (wy) => l.Y(wy) + dy, wx: (sx) => l.wx(sx - dx), wy: (sy) => l.wy(sy - dy) };
}
export const dreamGround = (cam, shift) => dreamLayer(cam, 1, shift);

// ---------------------------------------------------------------- the scene
/**
 * Full 540×960 dream scene in its own world. st = { t, light (0 golden dusk → 1 soft day), shift ([dx, dy] screen
 * offset of every layer, default none) }.
 * Returns { horizon (screen y), groundY (screen y of wy = 0), burrow: [sx, sy], sun: [sx, sy, r] }.
 */
export function drawDream(c, cam, st = {}) {
  const t = st.t ?? 0, Lt = clamp01(st.light ?? 0), P = palette(Lt), S = sink(c), W = S.W, H = S.H;
  const sh = st.shift, LY = (p) => dreamLayer(cam, p, sh), LR = LY(BAND.ridge), LP = LY(BAND.plain), L1 = LY(BAND.b1), L2 = LY(BAND.b2), L3 = LY(BAND.b3), L4 = LY(BAND.b4), G = LY(1);
  // per-column tops of every band (screen y); blade heights of the two grass bands
  const tops = { r: new Float32Array(W), p: new Float32Array(W), b1: new Float32Array(W), b2: new Float32Array(W), b3: new Float32Array(W), b4: new Float32Array(W) };
  const bh3 = new Float32Array(W), bh4 = new Float32Array(W), wx3 = new Float32Array(W), wx4 = new Float32Array(W);
  const gy = G.Y(0);
  for (let x = 0; x < W; x++) {
    const sx = x + 0.5;
    tops.r[x] = LR.Y(HZ - ridgeH(LR.wx(sx)));
    tops.p[x] = LP.Y(HZ + 0.6 * Math.sin(LP.wx(sx) * 0.05));
    tops.b1[x] = L1.Y(b1Top(L1.wx(sx)));
    tops.b2[x] = L2.Y(b2Top(L2.wx(sx)));
    { const wx = wx3[x] = L3.wx(sx); bh3[x] = blades(wx, 1.5, 6.5, t, 3, 0.12); tops.b3[x] = L3.Y(b3Base(wx) - bh3[x]); }
    { const wx = wx4[x] = L4.wx(sx); bh4[x] = blades(wx, 1.7, 11, t, 7, 0.16); tops.b4[x] = L4.Y(b4Base(wx) - bh4[x]); }
  }
  const order = ["r", "p", "b1", "b2", "b3", "b4"];
  // lowest visible row of each band = min of the tops of every nearer band (and the ground line)
  const until = {}; { const m = new Float32Array(W).fill(gy); for (let k = order.length - 1; k >= 0; k--) { until[order[k]] = m.slice(); const tp = tops[order[k]]; for (let x = 0; x < W; x++) m[x] = Math.min(m[x], tp[x]); } until.sky = m; }

  // ---- sky with the low sun's glow (row tables; no allocation per pixel)
  const LS = LY(BAND.sun), sunR = lerp(46, 30, Lt) * LS.z, sunX = LS.X(64), sunY = LS.Y(lerp(-92, -196, Lt)), hy = LR.Y(HZ), zs = LR.z;
  const glowR = sunR * 3.6, glowR2 = glowR * glowR, glowK = lerp(0.72, 0.45, Lt);
  let skyBottom = 0; for (let x = 0; x < W; x++) skyBottom = Math.max(skyBottom, until.sky[x]);
  for (let y = 0; y < Math.min(H, Math.ceil(skyBottom)); y++) {
    const d = (hy - y) / zs; let i = 0; while (i < SKY_D.length - 2 && d > SKY_D[i + 1]) i++;
    const f = clamp01((d - SKY_D[i]) / (SKY_D[i + 1] - SKY_D[i])), q = f * 4, q0 = Math.floor(q), fr = q - q0;
    const A = mixq(P.sky[i], P.sky[i + 1], q0 / 4), B = mixq(P.sky[i], P.sky[i + 1], Math.min(4, q0 + 1) / 4);
    const dyy = y + 0.5 - sunY, dy2 = dyy * dyy * 1.6, rowGlow = dy2 < glowR2;
    let GA, GB; if (rowGlow) { GA = [A]; GB = [B]; for (let qq = 1; qq <= 5; qq++) { GA.push(mixq(A, P.sunGlow, qq / 5)); GB.push(mixq(B, P.sunGlow, qq / 5)); } }
    for (let x = 0; x < W; x++) {
      if (y >= until.sky[x]) continue;
      const useB = fr > bayer(x, y); let col = useB ? B : A;
      if (rowGlow) { const dx = x + 0.5 - sunX, d2 = dx * dx + dy2; if (d2 < glowR2) { const k = glowK * (1 - Math.sqrt(d2) / glowR) ** 2, s = k * 5, lo = s | 0, qq = s - lo > bayer(x + 1, y + 2) ? lo + 1 : lo; if (qq > 0) col = (useB ? GB : GA)[Math.min(5, qq)]; } }
      S.set(x, y, col);
    }
  }
  // ---- the sun disc (behind the ridge)
  { const rimC = mixq(P.sunRim, P.sunGlow, 0.35);
    for (let y = Math.floor(sunY - sunR - 1); y <= Math.ceil(sunY + sunR + 1); y++) for (let x = Math.floor(sunX - sunR - 1); x <= Math.ceil(sunX + sunR + 1); x++) {
      const d = Math.hypot(x + 0.5 - sunX, y + 0.5 - sunY); if (d > sunR) continue;
      const u = Math.hypot(x + 0.5 - sunX + sunR * 0.22, y + 0.5 - sunY + sunR * 0.26) / sunR;
      S.set(x, y, d > sunR - 1.2 ? rimC : u < 0.74 ? P.sun : u < 0.98 ? ((u - 0.74) / 0.24 > bayer(x, y) ? P.sunRim : P.sun) : P.sunRim);
    } }
  // ---- clouds: thin streaks lit from below at dusk, drifting slowly
  const LC = LY(BAND.cloud);
  for (let i = 0; i < 8; i++) {
    const w = 46 + rnd(i * 5 + 1) * 60, h = 4 + rnd(i * 7 + 2) * 4, wy = HZ - 42 - rnd(i * 3 + 9) * 190 - i * 6;
    const wx = ((rnd(i * 11) * 1300 + t * (1.2 + rnd(i) * 0.8)) % 1300 + 1300) % 1300 - 650;   // wraps far off-screen
    const parts = [[0, 0, w * 0.5, h * 0.5], [-w * 0.26, h * 0.16, w * 0.3, h * 0.42], [w * 0.24, -h * 0.2, w * 0.27, h * 0.5], [w * 0.05, -h * 0.35, w * 0.18, h * 0.42]];
    const x0 = Math.floor(LC.X(wx - w * 0.6)), x1 = Math.ceil(LC.X(wx + w * 0.6)), y0 = Math.floor(LC.Y(wy - h * 0.9)), y1 = Math.ceil(LC.Y(wy + h * 0.7));
    if (x1 < 0 || x0 >= W) continue;
    for (let y = Math.max(0, y0); y <= y1; y++) for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
      if (y >= until.sky[x]) continue;
      const px = LC.wx(x + 0.5), py = LC.wy(y + 0.5); let inside = false;
      for (const [dx, dy, rx, ry] of parts) if (((px - wx - dx) / rx) ** 2 + ((py - wy - dy) / ry) ** 2 <= 1) { inside = true; break; }
      if (!inside) continue;
      const v = (py - (wy - h * 0.6)) / (h * 1.2), near = clamp01(1 - Math.abs(x - sunX) / 200) * (1 - Lt);
      let col = v > 0.7 - near * 0.2 ? P.cBot : v > 0.32 ? P.cMid : P.cTop;
      if (v > 0.32 && v <= 0.7 && (v - 0.32) / 0.38 > bayer(x, y) + 0.25) col = P.cBot;
      S.set(x, y, col);
    }
  }
  // ---- far ridge: hazy hills and two flat-topped mesas, lit rim toward the sun
  { const T = gradT(P.ridge, P.ridgeLow, 48, 3);
    for (let x = 0; x < W; x++) {
      const top = R(tops.r[x]), bot = Math.min(R(until.r[x]), H), span = Math.max(1, hy - top), near = clamp01(1 - Math.abs(x - sunX) / 170) * (1 - Lt * 0.6) + 0.25;
      for (let y = Math.max(0, top); y < bot; y++) S.set(x, y, y - top < 1 && near > bayer(x, y) ? P.ridgeRim : gpick(T, (y - top) / span * 0.9 * 48, x, y));
    } }
  // ---- far plain to the horizon, a bright haze under the sun, tiny trees
  { const T = gradT(P.plain, P.plainLow, 48, 3), edge = mixq(P.plain, P.sun, 0.45), Tg = gradT(P.plain, P.sun, 3, 3);
    for (let x = 0; x < W; x++) {
      const top = R(tops.p[x]), bot = Math.min(R(until.p[x]), H), gl = Math.exp(-(((x - sunX) / (sunR * 1.6)) ** 2)) * (1 - Lt * 0.7), sp = Math.max(1, (L1.Y(-62) - top) + 6);
      for (let y = Math.max(0, top); y < bot; y++) {
        let col = y - top < 1 ? edge : gpick(T, (y - top) / sp * 48, x, y);
        const g = gl * clamp01(1 - (y - top) / 7) * 0.8; if (g > 0.05) { const s = g * 3, lo = s | 0, qq = s - lo > bayer(x, y) ? lo + 1 : lo; if (qq > 0) col = mixq(col, P.sun, qq / 3); }
        S.set(x, y, col);
      }
    } }
  const haze = mixq(P.tree1, P.plain, 0.45), hazeRim = mixq(haze, P.sun, 0.25);
  for (const [wx, h, w] of TREES0) acacia(S, LP, wx, HZ + 1, h, w, haze, hazeRim, 3);
  // ---- band 1: far savanna with small acacias and bushes
  fillBand(S, tops.b1, until.b1, gradT(P.b1, P.b1Low, 14 * L1.z, 3, true), null, W, H);
  for (const [wx, r] of BUSH1) bush(S, L1, wx, b1Top(wx) + 1, r, P.tree1, P.tree1Rim, 7);
  for (const [wx, h, w] of TREES1) acacia(S, L1, wx, b1Top(wx) + 1, h, w, P.tree1, P.tree1Rim, 11);
  // ---- band 2: nearer acacias (one stands against the sun)
  fillBand(S, tops.b2, until.b2, gradT(P.b2, P.b2Low, 18 * L2.z, 3, true), null, W, H);
  for (const [wx, r] of BUSH2) bush(S, L2, wx, b2Top(wx) + 1, r, P.tree2, P.tree2Rim, 13);
  for (const [wx, h, w] of TREES2) acacia(S, L2, wx, b2Top(wx) + 1.5, h, w, P.tree2, P.tree2Rim, 17);
  // ---- bands 3 and 4: golden grass, thin blades with backlit tips, swaying
  fillBand(S, tops.b3, until.b3, gradT(P.b3, P.b3Low, 16 * L3.z, 3, true), { bh: bh3, H: 6.5, tip: P.b3Tip, rim: mixq(P.b3, P.b3Tip, 0.4), tipW: Math.max(1, R(L3.z * 0.8)), wx: wx3, dark: mixq(P.b3, P.b3Low, 0.6), z: L3.z, seed: 3 }, W, H);
  fillBand(S, tops.b4, until.b4, gradT(P.b4, P.b4Low, 22 * L4.z, 3, true), { bh: bh4, H: 11, tip: P.b4Tip, rim: mixq(P.b4, P.b4Tip, 0.4), tipW: Math.max(1, R(L4.z * 0.8)), wx: wx4, dark: mixq(P.b4, P.b4Low, 0.7), z: L4.z, seed: 7 }, W, H);
  // ---- ground (actors' plane): near meadow below the line, a trampled dirt patch around the burrow
  { const gyi = Math.max(0, Math.ceil(gy - 0.5)), TG = gradT(P.gr, P.grLow, 64, 4, true), TD = gradT(P.dirt, P.dirtLow, 16, 2, true), wxs = new Float32Array(W);
    for (let x = 0; x < W; x++) wxs[x] = G.wx(x + 0.5);
    for (let y = gyi; y < H; y++) {
      const wy = G.wy(y + 0.5), lip = wy < 1.1, gi = clamp01(wy / 150) * 64, di = wy, half = 50 + 2 * Math.sin(wy * 0.9);
      for (let x = 0; x < W; x++) {
        const wx = wxs[x]; let col;
        const e = wy < 18 ? (wx / (half + 2.5 * Math.sin(wx * 0.07 + 1))) ** 2 + ((wy - 1) / 15) ** 2 : 9;
        if (e < 1 && (e < 0.78 || (1 - e) / 0.22 > bayer(x, y))) {
          col = lip ? P.dirtLit : gpick(TD, di, x, y);
          const cx = Math.floor(wx / 1.7), cy = Math.floor(wy / 1.7), h = rnd(cx * 97 + cy * 31 + 5);
          if (h < 0.09) { const px = (cx + 0.25 + h * 5) * 1.7, py = (cy + 0.5) * 1.7, dd = (wx - px) ** 2 + (wy - py) ** 2; if (dd < 0.3) col = wy - py > 0.15 ? P.dirtLow : P.pebble; }
        } else col = lip ? P.grTip : gpick(TG, gi, x, y);
        S.set(x, y, col);
      }
    }
    // rows of tufts receding toward the viewer
    for (const row of MEADOW) {
      const sy0 = G.Y(row.wy); if (sy0 > H + 40 || sy0 < gy) continue;
      const k = row.r / 13, body = mixq(P.grRow, P.grLow, k * 0.85), tip = mixq(P.grTip, P.grRow, Math.min(1, 0.2 + k * 1.1)), w0 = Math.max(1, (0.7 + row.r * 0.1) * G.z);
      for (const it of row.items) {
        const sx = G.X(it.x); if (sx < -30 || sx > W + 30) continue;
        if (row.wy < 18 && (it.x / 54) ** 2 + ((row.wy - 1) / 16) ** 2 < 1) continue;
        for (let j = 0; j < it.n; j++) { const off = (j - (it.n - 1) / 2) * (0.9 + row.r * 0.12), h = it.h * (0.7 + 0.3 * rnd(it.s * 13 + j)), lean = off * 0.7 + sway(t, it.x + j) * h * 0.15;
          blade(S, G.X(it.x + off), sy0, G.X(it.x + off + lean), G.Y(row.wy - h), G.X(it.x + off + lean * 0.3), G.Y(row.wy - h * 0.5), w0, body, tip, 0.3, null); }
      }
    }
  }
  // stones half-buried around the patch
  for (const [wx, rx, ry] of STONES) { const sx = G.X(wx); if (sx < -20 || sx > W + 20) continue; drawPart(c, [ell(sx, G.Y(-ry * 0.55), rx * G.z, ry * G.z)], { ramp: P.stoneR, thick: ry * G.z, base: 3.4, gain: 2.2, slope: 0.8, light: [0.5, -0.8], outline: P.stoneR[0], litOutline: P.stoneR[5] }); }
  // the mound with the burrow
  drawMound(c, S, G, P, t);
  // grass tufts on the ground line (behind the actors)
  for (const tf of TUFTS) {
    const sx = G.X(tf.x); if (sx < -40 || sx > W + 40) continue;
    for (let k = 0; k < tf.n; k++) {
      const off = (k - (tf.n - 1) / 2) * 1.4, h = tf.h * (0.6 + 0.4 * rnd(tf.s * 9 + k)), lean = off * 0.9 + sway(t, tf.x + k) * h * 0.22;
      const x0 = G.X(tf.x + off * 0.6), y0 = G.Y(0.6), x1 = G.X(tf.x + off * 0.6 + lean), y1 = G.Y(-h), bx = G.X(tf.x + off * 0.6 + lean * 0.25), by = G.Y(-h * 0.55);
      blade(S, x0, y0, x1, y1, bx, by, Math.max(1, 1.3 * G.z), P.tuft, P.tuftTip, 0.32, rnd(tf.s * 3 + k) < 0.35 ? P.seed : null);
    }
  }
  // drifting golden motes (dreamy dust in the low sun)
  const LM = LY(BAND.mote), mA = lerp(1, 0.35, Lt);
  for (let i = 0; i < 30; i++) {
    const base = (rnd(i * 3 + 1) - 0.5) * 460, per = 120, ph = (rnd(i * 5 + 2) * per + t * (3 + rnd(i * 7) * 3)) % per;
    const wy = -6 - ph, wx = base + 6 * Math.sin(t * 0.37 + i * 1.7), sx = R(LM.X(wx)), sy = R(LM.Y(wy));
    const k = Math.min(1, ph / 15, (per - ph) / 25) * (0.55 + 0.45 * Math.sin(t * (1.1 + rnd(i) * 1.6) + i * 2.1)) * mA;
    if (k <= bayer(sx & 3, sy & 3) || sx < 0 || sx >= W) continue;
    S.set(sx, sy, P.mote); if (rnd(i * 13) < 0.3 && LM.z > 2) { S.set(sx + 1, sy, P.moteDim); S.set(sx, sy + 1, P.moteDim); }
  }
  return { horizon: hy, groundY: gy, burrow: [G.X(BURROW.x), gy], sun: [sunX, sunY, sunR] };
}

/** Fill a band column-wise between its top and the nearer bands. Grass bands (o): a lit fringe on the blades, a soft
 *  rim on the valleys, darker stem streaks under the tips. */
function fillBand(S, top, until, T, o, W, H) {
  for (let x = 0; x < W; x++) {
    const t0 = R(top[x]), b = Math.min(R(until[x]), H);
    if (b <= t0) continue;
    let tipRows = 0, streak = 0, tip = null;
    if (o) { const k = o.bh[x] / o.H; tip = k > 0.3 ? o.tip : o.rim; tipRows = k > 0.3 ? o.tipW : 1; streak = rnd(Math.floor(o.wx[x] / 0.8) * 7 + o.seed) < 0.28 ? R((2 + 4 * rnd(Math.floor(o.wx[x] / 0.8) + o.seed * 5)) * o.z) : 0; }
    for (let y = Math.max(0, t0); y < b; y++) {
      const d = y - t0;
      S.set(x, y, d < tipRows ? tip : o && d < tipRows + 1 && bayer(x, y) < 0.5 ? tip : streak && d < tipRows + streak ? o.dark : gpick(T, d, x, y));
    }
  }
}

/** Dirt mound with the arched burrow mouth at x = 0 (actors' plane), loose dirt and pebbles at the entrance. */
function drawMound(c, S, G, P, t) {
  const { rx, ry, moundW, moundH } = BURROW, z = G.z, D = P.dirtR;
  const pts = [[-moundW, 0.4], [-moundW + 4, -4.5], [-22, -9.5], [-13, -14], [-3, -moundH], [7, -15.4], [16, -12.6], [24, -8.2], [30, -3.6], [moundW, 0.4]];
  const out = smooth(pts.map(([x, y]) => [G.X(x), G.Y(y)]), new Set([0, pts.length - 1]), 5);
  drawPart(c, [out], { ramp: D, thick: 9 * z, base: 3.1, gain: 2.0, slope: 1.1, light: [0.45, -0.85], outline: D[0], litOutline: D[6] });
  // clods and a few pebbles on the mound
  for (let i = 0; i < 9; i++) { const x = -26 + rnd(i * 7 + 3) * 52, top = -moundH * (1 - (x / moundW) ** 2) * 0.92, y = top + 2 + rnd(i * 5) * (-top - 4); if (Math.abs(x) < rx + 2 && y > -ry - 2) continue; const s = Math.max(1, R((0.8 + rnd(i) * 0.9) * z)); const X = R(G.X(x)), Y = R(G.Y(y)); for (let j = 0; j < s; j++) for (let k = 0; k < s + 1; k++) S.set(X + k, Y + j, j === 0 ? D[6] : D[3]); S.set(X, Y + s, D[1]); }
  // the arch: packed-dirt rim, dark mouth with a soft inner gradient, the tunnel floor catching a little light
  const mx = G.X(BURROW.x), my = G.Y(BURROW.y), rr = 1.6;
  for (let y = Math.floor(my - (ry + rr + 1) * z); y <= Math.ceil(my); y++) for (let x = Math.floor(mx - (rx + rr + 1) * z); x <= Math.ceil(mx + (rx + rr + 1) * z); x++) {
    const u = (x + 0.5 - mx) / z, v = (y + 0.5 - my) / z; if (v > 0.2) continue;
    const d = (u / rx) ** 2 + (v / ry) ** 2, dRim = (u / (rx + rr)) ** 2 + (v / (ry + rr)) ** 2;
    if (d <= 1) {
      const depth = Math.sqrt(d);
      let col = depth > 0.86 ? P.holeIn : P.hole;
      if (v < -ry * 0.55 && depth > 0.7) col = P.hole;
      if (v > -1.2 && Math.abs(u) < rx * 0.8) col = (v > -0.6 ? 0.7 : 0.3) > bayer(x, y) ? P.holeRim : col;
      S.set(x, y, col);
    } else if (dRim <= 1) S.set(x, y, v < -ry * 0.4 ? D[2] : D[4]);
  }
  // loose dirt spilled at the entrance
  for (let i = 0; i < 7; i++) { const u = (rnd(i * 3 + 11) - 0.5) * 2 * (rx + 6), w = (1.2 + rnd(i * 5) * 1.8) * z, h = Math.max(1, (0.7 + rnd(i) * 0.6) * z), X = G.X(u), Y = G.Y(0.3); for (let yy = R(Y - h); yy <= R(Y); yy++) for (let xx = R(X - w); xx <= R(X + w); xx++) { const e = ((xx - X) / w) ** 2 + ((yy - Y) / (h + 0.5)) ** 2; if (e <= 1) S.set(xx, yy, yy < Y - h * 0.4 ? P.lip : D[4]); } }
  // a few blades on the mound
  for (let k = 0; k < 6; k++) { const x = -20 + k * 7.4 + (rnd(k * 3) - 0.5) * 3; if (Math.abs(x) < rx + 1) continue; const top = -moundH * (1 - (x / (moundW + 1)) ** 2) + 0.8, h = 4 + rnd(k * 5) * 5, lean = sway(t, x) * h * 0.25 + (x > 0 ? 1 : -1) * 0.8;
    blade(S, G.X(x), G.Y(top), G.X(x + lean), G.Y(top - h), G.X(x + lean * 0.3), G.Y(top - h * 0.5), Math.max(1, 1.1 * z), P.tuft, P.tuftTip, 0.35, null); }
}

// ---------------------------------------------------------------- foreground: tall grass in front of the actors
const FRONT = (() => {
  const out = [];
  const clumps = [[-152, 1.35, 5], [-104, 1.35, 4], [-64, 1.35, 5], [-40, 1.6, 3], [44, 1.35, 5], [74, 1.6, 4], [102, 1.35, 4], [148, 1.35, 5], [-215, 1.6, 4], [215, 1.6, 4], [-260, 1.35, 5], [262, 1.35, 5]];
  clumps.forEach(([x, p, n], ci) => { for (let k = 0; k < n; k++) { const s = ci * 31 + k, u = n > 1 ? k / (n - 1) - 0.5 : 0; out.push({ p, x: x + u * 6 + (rnd(s) - 0.5) * 2.5, ang: u * 0.75 + (rnd(s * 7) - 0.5) * 0.25, h: (p > 1.5 ? 90 : 118) * (0.62 + 0.45 * rnd(s * 3 + 1)) * (1 - Math.abs(u) * 0.45), w: 3.4 + rnd(s * 5) * 2.4, s }); } });
  return out.sort((a, b) => a.p - b.p || a.h - b.h);
})();
/**
 * Tall grass blades in front of the actors (parallax p 1.35–1.6), rooted below the frame in clumps that fan out,
 * swaying with the wind. Clumps sit left and right of the burrow so the mouth stays clear.
 * st = { t, light, front (0..1 height scale, default 1), shift (same as drawDream) }.
 */
export function drawDreamFront(c, cam, st = {}) {
  const t = st.t ?? 0, P = palette(clamp01(st.light ?? 0)), S = sink(c), amt = st.front ?? 1, W = S.W, H = S.H;
  if (amt <= 0) return;
  const Ls = {};
  for (const b of FRONT) {
    const Lp = Ls[b.p] ??= dreamLayer(cam, b.p, st.shift), rootY = 128, h = b.h * amt, wind = sway(t * 0.9, b.x * 1.3 + b.s) * 0.1;
    const x0 = Lp.X(b.x), y0 = Lp.Y(rootY), tipWX = b.x + Math.sin(b.ang) * h + wind * h, tipWY = rootY - Math.cos(b.ang) * h * (1 - Math.abs(wind) * 0.3);
    const x1 = Lp.X(tipWX), y1 = Lp.Y(tipWY), xm = Lp.X(b.x + Math.sin(b.ang) * h * 0.25 + wind * h * 0.3), ym = Lp.Y(rootY - h * 0.6);
    if (Math.max(x0, x1) + 20 < 0 || Math.min(x0, x1) - 20 > W || y1 > H) continue;
    const w0 = b.w * Lp.z, n = Math.max(2, Math.ceil(Math.abs(y0 - y1)) + 1);
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = (1 - u) * (1 - u), bb = 2 * (1 - u) * u, cc = u * u, x = a * x0 + bb * xm + cc * x1, y = a * y0 + bb * ym + cc * y1;
      const yy = Math.floor(y); if (yy < 0 || yy >= H) continue;
      const ww = Math.max(1, w0 * (1 - Math.pow(u, 1.7))), xa = Math.floor(x - ww / 2), xb = Math.max(xa, Math.floor(x + ww / 2 - 0.01)), vein = ww >= 5 ? xa + Math.floor((xb - xa) * 0.4) : -1e9;
      for (let xx = xa; xx <= xb; xx++) S.set(xx, yy, xx === xb && u > 0.12 ? P.frontLit : xx === vein ? P.frontMid : P.front);
    }
  }
}

// ---------------------------------------------------------------- the field mouse
export const MOUSE = {
  ramp: ["#1E1210", "#3E2620", "#62402F", "#8A5E44", "#AE7E5A", "#CC9C74", "#E4BE96", "#F4DCBC"],
  far: ["#140C0A", "#2C1A16", "#46302A", "#624434", "#7E5C44", "#9A7458", "#B48E6E", "#CCAA88"],
  belly: "#F6E8D2", bellyShade: "#E2CBAE", ear: "#F2A0AE", earDeep: "#D87888", nose: "#F27C98", noseHi: "#FFC2D0",
  foot: "#F0B4A8", footDark: "#C88478", tail: "#C8907E", tailLit: "#E6B4A2", eye: "#120808", eyeRim: "#3A2420", blush: "#F27A9A", whisker: "#F4E6D4",
};
/** Pose description in local units (facing right, origin on the ground under the body, up negative). */
function mousePose(o) {
  const pose = o.pose ?? "run", th = TAU * (o.p ?? 0), sn = TAU * (o.sniff ?? 0);
  const tw = Math.sin(sn * 2) * 0.28, nod = Math.sin(sn) * 0.3;          // sniff: fast nose twitch + slow nod
  if (pose === "sit") {
    const hy = -13.4 + nod * 0.5;
    return {
      body: [-1.4, -6.2, 4.9, 6.1, 0.22], head: [2.2, hy, 4.3, 3.7, -0.28], snout: [7.5 + tw * 0.3, hy - 0.6 + tw], ear: [-0.1, hy - 4.1, 2.9, 3.2, -0.3], eye: [3.9, hy - 0.9, 1.1, 0], nose: [7.6 + tw * 0.3, hy - 0.7 + tw], blush: [3.6, hy + 1.3],
      belly: [0.4, -5.6, 2.6, 4.4, 0.22],
      legs: [{ hip: [-1.2, -3.4], foot: [-0.2, -0.45], far: true, long: 1 }, { hip: [1.8, -9.6], foot: [3.0, -8.3], far: true, hand: 1 }, { hip: [-0.2, -3.2], foot: [1.6, -0.45], long: 1 }, { hip: [2.6, -9.8], foot: [3.9, -8.6], hand: 1 }],
      tail: [[-5.2, -1.8], [-9.5, -0.8], [-13.4, -1.0], [-16, -3.0 + Math.sin(th) * 0.4], [-15.6, -5.6 + Math.sin(th - 0.8) * 0.6]],
      back: [-2.6, -12.4], whisk: 1,
    };
  }
  if (pose === "caught") {
    const q = clamp01(o.squash ?? 1), wig = Math.sin(th) * (0.6 + 0.4 * q);
    const by = lerp(-4.6, -2.6, q), hx = lerp(5.6, 7.7, q), hy = lerp(-5.8, -2.7, q);
    return {
      body: [0, by, lerp(7.4, 9.8, q), lerp(4.5, 2.6, q), 0], head: [hx, hy, lerp(4.2, 4.4, q), lerp(3.6, 2.5, q), lerp(-0.1, 0.04, q)], snout: [lerp(10.9, 12.6, q), lerp(-5.2, -2.4, q)],
      ear: [lerp(2.8, 3.0, q), lerp(-10.0, -4.9, q), lerp(2.9, 3.4, q), lerp(3.2, 1.5, q), lerp(-0.35, -0.12, q)], eye: [lerp(7.2, 8.6, q), lerp(-6.8, -3.2, q), 1.1, q], nose: [lerp(11, 12.7, q), lerp(-5.3, -2.5, q)], blush: [lerp(6.8, 8.4, q), lerp(-4.8, -1.8, q)],
      belly: [0, by + lerp(2.4, 1.2, q), lerp(5.4, 7.6, q), lerp(1.8, 0.9, q), 0],
      legs: [{ hip: [-5, by + 2], foot: [lerp(-5.6, -10.4, q), -0.4 + wig * 0.3], far: true }, { hip: [4, by + 2], foot: [lerp(4.4, 9.6, q), -0.4 - wig * 0.3], far: true }, { hip: [-4.4, by + 2], foot: [lerp(-4.8, -8.9, q), -0.35 - wig * 0.25] }, { hip: [4.6, by + 2], foot: [lerp(5.0, 8.4, q), -0.35 + wig * 0.25] }],
      tail: [[-9.4, by + 0.3], [-13.2, by - 0.2 + wig * 0.4], [-16.6, by - 2.4 + wig], [-18.2, by - 5.8 + wig * 1.4]],
      back: [0.4, by - lerp(4.5, 2.6, q)], whisk: 1 - q * 0.5,
    };
  }
  if (pose === "peek") {
    const hx = 4.9 + nod, hy = -5.0 + nod * 0.4;
    return {
      body: [-3.2, -4.7, 7.3, 4.4, -0.02], head: [hx, hy, 4.3, 3.7, -0.08], snout: [hx + 5.4 + tw * 0.4, hy + 0.5 + tw], ear: [hx - 2.7, hy - 4.2, 2.8, 3.1, -0.5], eye: [hx + 1.7, hy - 1.1, 1.1, 0], nose: [hx + 5.5 + tw * 0.4, hy + 0.4 + tw], blush: [hx + 1.6, hy + 1.4],
      belly: [-2.4, -2.3, 5, 1.7, 0],
      legs: [{ hip: [3.0, -3], foot: [4.6, -0.35], far: true }, { hip: [-7.5, -3.2], foot: [-7.2, -0.35], far: true }, { hip: [4.0, -3], foot: [6.6, -0.35] }, { hip: [-6.5, -3.2], foot: [-6.4, -0.35] }],
      tail: [[-10, -4.2], [-14, -3.2], [-18, -4], [-21, -6]],
      back: [-3, -9.1], whisk: 1,
    };
  }
  // run: one bounce per stride, gallop-ish leg pairs, body stretch, tail wave
  const s = Math.sin(th), bob = -1.0 * (0.5 + 0.5 * s), str = 1 + 0.06 * s;
  const foot = (x0, ph, amp) => [x0 + amp * Math.cos(th + ph), -0.35 - Math.max(0, Math.sin(th + ph)) * 1.9];
  return {
    body: [-2, -5.4 + bob, 7.4 * str, 4.6 / Math.sqrt(str), -0.04 + 0.07 * Math.cos(th)], head: [5.4 + 0.3 * s, -6.6 + bob * 0.7, 4.3, 3.7, -0.12], snout: [10.7 + 0.3 * s, -5.8 + bob * 0.7],
    ear: [2.6 + 0.3 * s, -10.6 + bob * 0.8 - 0.3 * Math.cos(th), 2.9, 3.2, -0.4 - 0.08 * Math.cos(th)], eye: [7.1 + 0.3 * s, -7.5 + bob * 0.7, 1.1, 0], nose: [10.8 + 0.3 * s, -5.9 + bob * 0.7], blush: [6.9 + 0.3 * s, -5.2 + bob * 0.7],
    belly: [-1.6, -2.7 + bob, 5.2 * str, 1.8, 0],
    legs: [{ hip: [-5.4, -3.6 + bob], foot: foot(-5.4, Math.PI + 0.7, 3.2), far: true }, { hip: [3.4, -3.2 + bob], foot: foot(3.6, 0.7, 2.8), far: true },
           { hip: [-5.8, -3.6 + bob], foot: foot(-5.8, Math.PI, 3.4) }, { hip: [3.6, -3.2 + bob], foot: foot(3.8, 0, 3.0) }],
    tail: [[-9.0, -4.6 + bob], [-13, -3.8 + 1.2 * Math.sin(th - 0.6)], [-17, -4.6 + 1.6 * Math.sin(th - 1.5)], [-21, -6.2 + 1.9 * Math.sin(th - 2.4)]],
    back: [-2, -10 + bob], whisk: 1,
  };
}
/**
 * Cute field mouse, side view (~19 units nose → rump, plus a ~12-unit tail). (wx, wy) = ground point under the body;
 * for pose "peek" pass the burrow mouth (BURROW.x, BURROW.y). o = { p (run cycle phase, p and p+1 identical),
 * pose: "run" | "peek" | "sit" | "caught", facing (1 right / -1 left), peek (0 hidden → 1 head and paws out),
 * sniff (phase: nose twitch + nod), squash (caught only, 0 crouched → 1 flat, default 1), stars (caught only, 0..1:
 * cartoon dizzy stars circling above the head; their phase follows p) }.
 * Returns screen anchors { nose, eye, ear, head, back (where a paw presses), tail (tip), feet, center, mouth (peek) }.
 */
export function drawMouse(g, G, wx, wy, o = {}) {
  const f = (o.facing ?? 1) < 0 ? -1 : 1, z = G.z, pose = o.pose ?? "run", Q = mousePose(o);
  let shift = 0;
  if (pose === "peek") { const k = clamp01(o.peek ?? 1), e = k * k * (3 - 2 * k); shift = lerp(-16, 0, e); }
  const P = (u, v) => [G.X(wx + (u + shift) * f), G.Y(wy + v)];
  const anchors = { nose: P(...Q.nose), eye: P(Q.eye[0], Q.eye[1]), ear: P(Q.ear[0], Q.ear[1] - Q.ear[3]), head: P(Q.head[0], Q.head[1]), back: P(...Q.back), tail: P(...Q.tail[Q.tail.length - 1]), feet: P(Q.body[0], 0), center: P(Q.body[0], Q.body[1]), mouth: [G.X(wx), G.Y(wy)] };
  if (pose === "peek" && (o.peek ?? 1) <= 0.001) return anchors;
  // peek: everything behind the exit plane is visible only inside the arch, fading into the dark of the tunnel
  let gg = g;
  if (pose === "peek") {
    const mx = G.X(wx), my = G.Y(wy), uM = -0.5, { rx, ry } = BURROW;
    gg = Object.create(g);
    gg.px = (x, y, col) => {
      const u = (Math.floor(x) + 0.5 - mx) / z * f, v = (Math.floor(y) + 0.5 - my) / z;
      if (u >= uM) { g.px(x, y, col); return; }
      if (v > 0.3 || (u / rx) ** 2 + (v / ry) ** 2 > 1) return;
      const k = clamp01((uM - u) / 6.5), s = k * 3, lo = Math.floor(s), q = (s - lo > bayer(Math.floor(x), Math.floor(y)) ? lo + 1 : lo) / 3;
      if (q >= 1) return; g.px(x, y, q <= 0 ? col : mixq(hex(col), g.get(Math.floor(x), Math.floor(y)), q));
    };
  }
  const Ef = (b) => { const [x, y, rx, ry, rot] = b; return ell(0, 0, rx, ry, rot, 20).map(([u, v]) => P(x + u, y + v)); };
  const lw = Math.max(1, 0.9 * z);
  // legs (far side first, darker), as short tubes + little pink feet
  const leg = (L, ramp) => {
    const a = P(...L.hip), b = P(...L.foot), r0 = (L.hand ? 0.9 : 1.15) * z, r1 = (L.hand ? 0.75 : 0.85) * z;
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
    const pts = []; for (let i = 0; i <= n; i++) pts.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
    drawPart(gg, [capsulePoly(a, b, r0, r1)], { ramp, thick: 2 * z, base: 3.2, gain: 1.4, outline: ramp[0] });
    const fl = L.long ? 2.3 : L.hand ? 0.9 : 1.35;
    const fx = L.foot[0] + (L.hand ? 0.3 : fl * 0.45), fy = L.foot[1] + (L.hand ? 0 : 0.05);
    drawPart(gg, [Ef([fx, fy, fl, L.hand ? 0.8 : 0.72, 0])], { ramp: [MOUSE.footDark, MOUSE.footDark, MOUSE.footDark, MOUSE.foot, MOUSE.foot, MOUSE.foot, "#FAD2C8", "#FAD2C8"], thick: z, base: 3.6, gain: 1, outline: ramp[0] });
  };
  for (const L of Q.legs) if (L.far) leg(L, MOUSE.far);
  // tail: tapered, slightly lighter on top
  {
    const pts = []; const tp = Q.tail;
    for (let i = 0; i < tp.length - 1; i++) for (let j = 0; j < 6; j++) { const u = j / 6, a = tp[Math.max(0, i - 1)], b = tp[i], c2 = tp[i + 1], d = tp[Math.min(tp.length - 1, i + 2)]; pts.push([0, 1].map((k) => 0.5 * (2 * b[k] + (-a[k] + c2[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c2[k] - d[k]) * u * u + (-a[k] + 3 * b[k] - 3 * c2[k] + d[k]) * u * u * u))); }
    pts.push(tp[tp.length - 1]);
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const [sx, sy] = P(...pts[i]), r = lerp(0.95, 0.35, i / (n - 1)) * z;
      if (r < 0.75) { gg.px(R(sx), R(sy), MOUSE.ramp[1]); continue; }
      const ro = r + 0.5; for (let yy = Math.floor(sy - ro); yy <= Math.ceil(sy + ro); yy++) for (let xx = Math.floor(sx - ro); xx <= Math.ceil(sx + ro); xx++) { const d = Math.hypot(xx + 0.5 - sx, yy + 0.5 - sy); if (d <= ro && d > r - 0.4) gg.px(xx, yy, MOUSE.ramp[1]); }
    }
    for (let i = 0; i < n; i++) { const [sx, sy] = P(...pts[i]), r = lerp(0.95, 0.35, i / (n - 1)) * z - 0.6; if (r < 0.4) continue; for (let yy = Math.floor(sy - r); yy <= Math.ceil(sy + r); yy++) for (let xx = Math.floor(sx - r); xx <= Math.ceil(sx + r); xx++) if (Math.hypot(xx + 0.5 - sx, yy + 0.5 - sy) <= r) gg.px(xx, yy, yy + 0.5 < sy - r * 0.2 ? MOUSE.tailLit : MOUSE.tail); }
  }
  // body + head + snout as one volume
  const H = Q.head, sn = Q.snout;
  const snout = smooth([P(H[0] + 0.6, H[1] - H[3] * 0.82), P(sn[0] - 1.6, sn[1] - 1.1), P(sn[0], sn[1]), P(sn[0] - 1.4, sn[1] + 1.2), P(H[0] + 1.2, H[1] + H[3] * 0.8)], new Set([2]), 4);
  drawPart(gg, [Ef(Q.body), Ef(H), snout], { ramp: MOUSE.ramp, thick: 4.2 * z, base: 3.3, gain: 2.0, slope: 0.9, light: [-0.4 * f, -0.9], rimLit: 0.8, rimShade: 0.7, outline: MOUSE.ramp[0], litOutline: z >= 2.4 ? MOUSE.ramp[3] : null });
  // cream belly / chest (kept 1.3 units inside the body outline, dithered top edge)
  if (z >= 1.2) {
    const [bx, by, brx, bry, brot] = Q.belly, [ox, oy, orx, ory, orot] = Q.body, c0 = P(bx, by), cs = Math.cos(brot), sn2 = Math.sin(brot), co = Math.cos(orot), so = Math.sin(orot), in1 = 1.3 / z + 0.35;
    for (let y = Math.floor(c0[1] - (bry + brx) * z); y <= Math.ceil(c0[1] + (bry + brx) * z); y++) for (let x = Math.floor(c0[0] - (brx + bry) * z); x <= Math.ceil(c0[0] + (brx + bry) * z); x++) {
      const lx = ((x + 0.5 - G.X(wx)) / z) * f - shift, ly = (y + 0.5 - G.Y(wy)) / z;
      const dx = lx - bx, dy = ly - by, u = dx * cs + dy * sn2, v = -dx * sn2 + dy * cs, d = (u / brx) ** 2 + (v / bry) ** 2;
      if (d > 1) continue; if (v < 0 && d > 0.55 && bayer(x, y) < d - 0.3) continue;
      const ex = lx - ox, ey = ly - oy, eu = ex * co + ey * so, ev = -ex * so + ey * co;
      if ((eu / Math.max(0.5, orx - in1 * 1.3)) ** 2 + (ev / Math.max(0.5, ory - in1 * 1.3)) ** 2 > 1) continue;
      gg.px(x, y, v > bry * 0.35 ? MOUSE.bellyShade : MOUSE.belly);
    }
  }
  // near legs
  for (const L of Q.legs) if (!L.far) leg(L, MOUSE.ramp);
  // big round ear (in front of the head) with pink inside
  drawPart(gg, [Ef(Q.ear)], { ramp: MOUSE.ramp, thick: 2.2 * z, base: 3.6, gain: 1.6, outline: MOUSE.ramp[0], light: [-0.4 * f, -0.9] });
  { const [ex, ey, erx, ery, erot] = Q.ear; const inner = Ef([ex + 0.35, ey + 0.35, erx * 0.6, ery * 0.62, erot]); drawPart(gg, [inner], { ramp: [MOUSE.earDeep, MOUSE.earDeep, MOUSE.earDeep, MOUSE.earDeep, MOUSE.ear, MOUSE.ear, "#F8C4CC", "#F8C4CC"], thick: 1.6 * z, base: 3.4, gain: 1.4, outline: MOUSE.earDeep, light: [0.3 * f, -0.8] }); }
  // blush, eye, nose, whiskers
  if (z >= 1.9) { const [bx, by] = P(...Q.blush), brx = 1.25 * z, bry = 0.7 * z; for (let y = Math.floor(by - bry); y <= Math.ceil(by + bry); y++) for (let x = Math.floor(bx - brx); x <= Math.ceil(bx + brx); x++) { const d = ((x + 0.5 - bx) / brx) ** 2 + ((y + 0.5 - by) / bry) ** 2; if (d <= 1 && ((x + y) & 1) === 0) gg.px(x, y, MOUSE.blush); } }
  beadEye(gg, ...P(Q.eye[0], Q.eye[1]), Q.eye[2] * z, Q.eye[3], f);
  { const [nx, ny] = P(...Q.nose), nr = Math.max(0.8, 0.75 * z); for (let y = Math.floor(ny - nr); y <= Math.ceil(ny + nr); y++) for (let x = Math.floor(nx - nr); x <= Math.ceil(nx + nr); x++) { const d = Math.hypot(x + 0.5 - nx, y + 0.5 - ny); if (d <= nr + 0.15) gg.px(x, y, d < nr * 0.5 && y + 0.5 < ny ? MOUSE.noseHi : MOUSE.nose); } }
  // caught: optional cartoon dizzy stars circling above the head (o.stars 0..1, phase from o.p)
  if (pose === "caught" && (o.stars ?? 0) > 0) {
    const gs = fade(gg, clamp01(o.stars)), hc = [Q.head[0] - 0.5, Q.head[1] - Q.head[3] - 3.2], arm = Math.max(1, R(0.75 * z));
    for (let i = 0; i < 3; i++) { const an = TAU * (o.p ?? 0) * 0.5 + (i * TAU) / 3, [sx, sy] = P(hc[0] + Math.cos(an) * 5.2, hc[1] + Math.sin(an) * 1.7), X = R(sx), Y = R(sy), col = Math.sin(an) < 0 ? "#C8A040" : "#FFE070";
      for (let q = -arm; q <= arm; q++) { gs.px(X + q, Y, col); gs.px(X, Y + q, col); } if (arm >= 2) { gs.px(X - 1, Y - 1, col); gs.px(X + 1, Y - 1, col); gs.px(X - 1, Y + 1, col); gs.px(X + 1, Y + 1, col); } gs.px(X, Y, "#FFFFFF"); }
  }
  if (z >= 2.2 && Q.whisk > 0.3) {
    const base = [Q.nose[0] - 1.6, Q.nose[1] + 0.3], w = Math.sin(TAU * (o.sniff ?? 0) * 2) * 0.5;
    for (const [dx, dy] of [[3.6, -1.6 + w], [4.2, -0.1 + w * 0.6], [3.4, 1.5 + w * 0.3]]) { const a = P(base[0] + 0.8, base[1]), b = P(base[0] + dx, base[1] + dy); gg.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), MOUSE.whisker); }
  }
  return anchors;
}
function capsulePoly(a, b, r0, r1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, ang = Math.atan2(dy, dx), out = [];
  for (let k = 0; k <= 6; k++) { const t = ang + Math.PI / 2 + (Math.PI * k) / 6; out.push([a[0] + Math.cos(t) * r0, a[1] + Math.sin(t) * r0]); }
  for (let k = 0; k <= 6; k++) { const t = ang - Math.PI / 2 + (Math.PI * k) / 6; out.push([b[0] + Math.cos(t) * r1, b[1] + Math.sin(t) * r1]); }
  return out;
}
/** Black bead eye with a highlight (closed 0..1: ≥ 0.5 draws a squeezed-shut ">" pointing to the nose). */
function beadEye(g, x, y, r, closed, f) {
  if (closed >= 0.5) {
    const s = Math.max(1, R(r * 0.9)), X = R(x), Y = R(y);
    for (let i = 0; i <= s; i++) { g.px(X - f * (s - i), Y - s + i, MOUSE.eye); g.px(X - f * (s - i), Y + s - i, MOUSE.eye); if (r >= 2.5) { g.px(X - f * (s - i) - f, Y - s + i, MOUSE.eye); g.px(X - f * (s - i) - f, Y + s - i, MOUSE.eye); } }
    return;
  }
  const rr = Math.max(1.1, r);
  for (let yy = Math.floor(y - rr - 1); yy <= Math.ceil(y + rr + 1); yy++) for (let xx = Math.floor(x - rr - 1); xx <= Math.ceil(x + rr + 1); xx++) {
    const d = Math.hypot(xx + 0.5 - x, yy + 0.5 - y); if (d > rr + 0.2) continue;
    g.px(xx, yy, d > rr - 0.9 && yy + 0.5 > y + rr * 0.3 && rr >= 2 ? MOUSE.eyeRim : MOUSE.eye);
  }
  const hx = Math.floor(x + f * rr * 0.28 - (f > 0 ? 0.5 : -0.5) * 0), hy = Math.floor(y - rr * 0.38);
  g.px(hx, hy, "#FFFFFF"); if (rr >= 2.4) { g.px(hx + f, hy, "#FFFFFF"); g.px(hx, hy + 1, "#FFFFFF"); g.px(hx + f, hy + 1, "#EDE6FF"); g.px(Math.floor(x - f * rr * 0.35), Math.floor(y + rr * 0.35), "#B8B0D8"); }
}

// ---------------------------------------------------------------- the thought bubble
const BUB_N = 11, BUB_STEP = TAU / BUB_N;
const easeBack = (x, c1 = 0.9) => { x = clamp01(x); const y = x - 1; return 1 + (c1 + 1) * y * y * y + c1 * y * y; };
function bubbleGeo(cx, cy, r, k, tail) {
  const tl = tail ?? [cx - r * 0.75, cy + r * 1.35];
  const dx = tl[0] - cx, dy = tl[1] - cy, D = Math.hypot(dx, dy) || 1, ux = dx / D, uy = dy / D;
  const edge = [cx + ux * r * 0.9, cy + uy * r * 0.9];
  const k2 = clamp01((k - 0.22) / 0.78), s = k2 <= 0 ? 0 : easeBack(k2);
  const mc = [lerp(edge[0], cx, s), lerp(edge[1], cy, s)], R0 = r * s;
  const rot = Math.atan2(uy, ux) + Math.PI / BUB_N;                         // a valley faces the trail
  const sc = [];
  for (let i = 0; i < BUB_N; i++) { const a = rot + BUB_STEP * i, si = k2 <= 0 ? 0 : easeBack(clamp01((k2 - 0.12 * (((i * 5) % BUB_N) / BUB_N)) / 0.82)); sc.push([mc[0] + Math.cos(a) * 0.76 * R0, mc[1] + Math.sin(a) * 0.76 * R0, 0.25 * r * si * s]); }
  // three trailing puffs from the tail toward the bubble (smallest at the tail), on a gentle arc
  const gap = Math.max(0, D - r * 0.95), nx = -uy, ny = ux, bend = Math.min(26, gap * 0.12);
  const puffs = [[0.16, 0.045], [0.42, 0.072], [0.7, 0.105]].map(([fr, rr], i) => { const kk = easeBack(clamp01((k - i * 0.075) / 0.17)); const along = gap * (1 - fr), off = Math.sin(fr * Math.PI) * bend; return [cx + ux * (r * 0.95 + along) + nx * off, cy + uy * (r * 0.95 + along) + ny * off, Math.max(2.5, rr * r) * kk]; });
  const xs = [cx - r * 1.05, cx + r * 1.05, ...puffs.flatMap((p) => [p[0] - p[2], p[0] + p[2]])], ys = [cy - r * 1.05, cy + r * 1.05, ...puffs.flatMap((p) => [p[1] - p[2], p[1] + p[2]])];
  return { mc, R0, inner: 0.9 * R0, outer: 1.02 * R0, rot, sc, puffs, k2, box: [Math.floor(Math.min(...xs)) - 8, Math.floor(Math.min(...ys)) - 8, Math.ceil(Math.max(...xs)) + 8, Math.ceil(Math.max(...ys)) + 8] };
}
/** Signed distances (px, negative inside) to the main cloud and to the nearest puff. The cloud = a disc of radius
 *  0.9·R plus 11 scallop discs; only the 3 scallops nearest in angle are tested. */
function sdMain(G, x, y) {
  if (G.R0 <= 0.5) return 1e9;
  const dx = x - G.mc[0], dy = y - G.mc[1], rho = Math.sqrt(dx * dx + dy * dy); let dm = rho - G.inner;
  if (rho > G.inner * 0.55 && rho < G.outer + 40) {
    const i0 = Math.round((Math.atan2(dy, dx) - G.rot) / BUB_STEP);
    for (let j = i0 - 1; j <= i0 + 1; j++) { const s = G.sc[((j % BUB_N) + BUB_N) % BUB_N]; if (s[2] > 0) { const d = Math.hypot(x - s[0], y - s[1]) - s[2]; if (d < dm) dm = d; } }
  }
  return dm;
}
function sdPuffs(G, x, y) { let dp = 1e9; for (const [px, py, pr] of G.puffs) { if (pr <= 0.3) continue; const ax = Math.abs(x - px), ay = Math.abs(y - py); if (ax > pr + 14 || ay > pr + 14) continue; const d = Math.hypot(ax, ay) - pr; if (d < dp) dp = d; } return dp; }
/**
 * Thought-bubble shape (screen px). Returns inside(x, y) → coverage 0..1 (1 inside, a soft ~2-px edge) of a
 * cloud-edged circle of radius ≈ r around (cx, cy) plus 3 small trailing circles toward tail = [x, y] (the sleeper's
 * head). k = grow 0..1: the puffs pop out one by one from the tail (k 0 → 0.32), then the cloud inflates out of the
 * trail with a slight overshoot (k 0.22 → 1). Draws nothing. Extras on the function: .main(x, y) / .puffs(x, y)
 * (coverage of each part; fill only .main with the dream, drawBubbleEdge paints the puffs), .box = [x0, y0, x1, y1]
 * (screen bounds to iterate), .center, .radius (current).
 */
export function bubble(cx, cy, r, k, tail) {
  const G = bubbleGeo(cx, cy, r, clamp01(k), tail), cov = (d) => (d <= -1 ? 1 : d >= 1 ? 0 : 0.5 - d / 2);
  const in2 = Math.max(0, G.inner - 1) ** 2, out2 = (G.outer + 2) ** 2;
  const main = (x, y) => { if (G.R0 <= 0.5) return 0; const X = x + 0.5, Y = y + 0.5, dx = X - G.mc[0], dy = Y - G.mc[1], r2 = dx * dx + dy * dy; if (r2 < in2) return 1; if (r2 > out2) return 0; return cov(sdMain(G, X, Y)); };
  const puffs = (x, y) => cov(sdPuffs(G, x + 0.5, y + 0.5));
  const inside = (x, y) => { const m = main(x, y); return m >= 1 ? 1 : Math.max(m, puffs(x, y)); };
  inside.main = main; inside.puffs = puffs; inside.box = G.box; inside.center = G.mc; inside.radius = G.R0;
  return inside;
}
/** The bubble's soft pixel outline: ivory rim, a thin dark line and a lavender glow outside, a lavender inner rim and a
 *  dreamy inner haze, a glossy highlight arc; the trailing puffs are painted as small pale glossy clouds.
 *  a (0..1) dissolves it. Same arguments as bubble(). */
export function drawBubbleEdge(c, cx, cy, r, k, tail, a = 1) {
  if (a <= 0 || k <= 0) return;
  const G = bubbleGeo(cx, cy, r, clamp01(k), tail), g = fade(c, a);
  const IV = [253, 254, 237], LAV = [205, 184, 240], HAZE = [236, 226, 255], GLOW = [176, 138, 232], DARK = [40, 26, 72], PUFF = [232, 222, 252], PUFF2 = [208, 192, 244];
  const W = c.w, H = c.h;
  const glow = (x, y, d) => { const kk = 0.42 * (1 - (d - 1.6) / 5.4); if (kk > bayer(x, y)) g.px(x, y, mixq(c.get(x, y), GLOW, 0.5)); };
  // main cloud: only the annulus between the inner haze and the outer glow, row by row
  if (G.R0 > 0.5) {
    const ri = Math.max(0, G.inner - 12), ro = G.outer + 8, [mx, my] = G.mc;
    for (let y = Math.max(0, Math.floor(my - ro)); y <= Math.min(H - 1, Math.ceil(my + ro)); y++) {
      const dy = y + 0.5 - my, xo = Math.sqrt(Math.max(0, ro * ro - dy * dy)), xi = ri * ri > dy * dy ? Math.sqrt(ri * ri - dy * dy) : -1;
      const spans = xi < 0 ? [[mx - xo, mx + xo]] : [[mx - xo, mx - xi], [mx + xi, mx + xo]];
      for (const [sa, sb] of spans) for (let x = Math.max(0, Math.floor(sa)); x <= Math.min(W - 1, Math.ceil(sb)); x++) {
        const X = x + 0.5, Y = y + 0.5, d = sdMain(G, X, Y); if (d > 7 || d < -11) continue;
        if (sdPuffs(G, X, Y) < d) continue;
        if (d >= -1.2 && d < 0.6) { g.px(x, y, IV); continue; }
        if (d >= 0.6 && d < 1.6) { g.px(x, y, DARK); continue; }
        if (d < -1.2 && d >= -2.6) { g.px(x, y, LAV); continue; }
        if (d < -2.6) {
          const kk = 0.5 * (1 - (-d - 2.6) / 8.4); if (kk > bayer(x, y)) g.px(x, y, mixq(c.get(x, y), HAZE, 0.45));
          if (d < -4 && d > -6.4) { const ang = Math.atan2(Y - my, X - mx); if (ang > -2.75 && ang < -1.95) g.px(x, y, IV); }
          continue;
        }
        glow(x, y, d);
      }
    }
  }
  // trailing puffs: small pale glossy clouds with the same rim, line and glow
  for (const p of G.puffs) {
    const [px, py, pr] = p; if (pr <= 0.3) continue;
    for (let y = Math.max(0, Math.floor(py - pr - 8)); y <= Math.min(H - 1, Math.ceil(py + pr + 8)); y++) for (let x = Math.max(0, Math.floor(px - pr - 8)); x <= Math.min(W - 1, Math.ceil(px + pr + 8)); x++) {
      const X = x + 0.5, Y = y + 0.5, d = Math.hypot(X - px, Y - py) - pr; if (d > 7) continue;
      if (sdMain(G, X, Y) < d || sdPuffs(G, X, Y) < d - 0.001) continue;
      if (d < -1.2) { const u = (X - px) / pr, v = (Y - py) / pr; g.px(x, y, u * u + v * v < 0.2 && u < 0 && v < 0 && pr > 4 ? IV : v > 0.25 ? PUFF2 : PUFF); continue; }
      if (d < 0.6) { g.px(x, y, IV); continue; }
      if (d < 1.6) { g.px(x, y, DARK); continue; }
      glow(x, y, d);
    }
  }
}
