// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/dream.mjs (palette, band shapes, acacias, bushes, blades,
// drawDream, fillBand). Changes: import paths; the film's own layout.mjs layer() is replaced by the catalog layer with a
// world offset (film world x 0 = stage x 270, ground wy 0 = stage y 570); the burrow mound, the trampled dirt patch, the
// stones, the mouse and the bubble are not ported (scenery only); the near meadow is grass everywhere; drawDreamFront is not ported.
import { Canvas, mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { layer, clamp01, lerp, rnd } from "../../engine/layout.mjs";

const R = Math.round, TAU = Math.PI * 2;
export const HZ = -70;                                         // horizon height (far layers), world units

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
/** Catalog layer with the film's world: world x 0 = stage centre, ground line wy 0 = stage y 570 at every zoom. */
export function dreamLayer(cam, p) {
  const l = layer(cam, p), OX = 270, OY = 570;
  return { z: l.z, X: (wx) => l.X(wx + OX), Y: (wy) => l.Y(wy + OY), wx: (sx) => l.wx(sx) - OX, wy: (sy) => l.wy(sy) - OY };
}

export function drawDream(c, cam, st = {}) {
  const t = st.t ?? 0, Lt = clamp01(st.light ?? 0), P = palette(Lt), S = sink(c), W = S.W, H = S.H;
  const LY = (p) => dreamLayer(cam, p), LR = LY(BAND.ridge), LP = LY(BAND.plain), L1 = LY(BAND.b1), L2 = LY(BAND.b2), L3 = LY(BAND.b3), L4 = LY(BAND.b4), G = LY(1);
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
  { const gyi = Math.max(0, Math.ceil(gy - 0.5)), TG = gradT(P.gr, P.grLow, 64, 4, true), wxs = new Float32Array(W);
    for (let x = 0; x < W; x++) wxs[x] = G.wx(x + 0.5);
    for (let y = gyi; y < H; y++) {
      const wy = G.wy(y + 0.5), lip = wy < 1.1, gi = clamp01(wy / 150) * 64;
      for (let x = 0; x < W; x++) S.set(x, y, lip ? P.grTip : gpick(TG, gi, x, y));
    }
    // rows of tufts receding toward the viewer
    for (const row of MEADOW) {
      const sy0 = G.Y(row.wy); if (sy0 > H + 40 || sy0 < gy) continue;
      const k = row.r / 13, body = mixq(P.grRow, P.grLow, k * 0.85), tip = mixq(P.grTip, P.grRow, Math.min(1, 0.2 + k * 1.1)), w0 = Math.max(1, (0.7 + row.r * 0.1) * G.z);
      for (const it of row.items) {
        const sx = G.X(it.x); if (sx < -30 || sx > W + 30) continue;
        for (let j = 0; j < it.n; j++) { const off = (j - (it.n - 1) / 2) * (0.9 + row.r * 0.12), h = it.h * (0.7 + 0.3 * rnd(it.s * 13 + j)), lean = off * 0.7 + sway(t, it.x + j) * h * 0.15;
          blade(S, G.X(it.x + off), sy0, G.X(it.x + off + lean), G.Y(row.wy - h), G.X(it.x + off + lean * 0.3), G.Y(row.wy - h * 0.5), w0, body, tip, 0.3, null); }
      }
    }
  }
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
  return { horizon: hy, groundY: gy, sun: [sunX, sunY, sunR] };
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

