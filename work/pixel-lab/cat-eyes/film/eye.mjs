// Inside the cat's eye (screen space, 540×960 grid, the action above the captions): a side cut of the eyeball with the
// front (cornea, iris, lens) on the left where the light comes in, the retina of rods on the back wall and the shiny
// tapetum right behind it. Light is a stream of pixels: some are caught by a rod on the first pass (the rod lights up),
// the rest hit the tapetum, come back green for a second try, and some leave the eye again — the glow you see.
// An illustration, not to scale.
import { MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const E = { x: 300, y: 350, r: 212 };
const BACK = { a0: -1.25, a1: 1.25 }, TAP = { a0: -0.95, a1: 0.95 };      // angular extents (rad, 0 = straight back)
const RET_IN = E.r - 36, RET_OUT = E.r - 12, TAP_IN = E.r - 11, TAP_OUT = E.r - 1;
const LENS = { x: E.x - 150, y: E.y, rx: 22, ry: 60 }, IRIS_X = E.x - 172;
export const COL = { wall: "#C9C0E8", wallD: "#8E84B8", out: "#07060E", vit: "#0D0A1E", vit2: "#15102C", rod: "#7E5AD0", rodHi: "#F4CA50", lens: "#D8D2F4", iris: ["#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E"], light: "#FFF2C8", green: "#9CFF7A", tap: ["#1C6E6A", "#2FA08A", "#5FD08A", "#B8E86A", "#F2E08A"] };

// ---------------------------------------------------------------- photons
// fates: absorbed on the first pass, absorbed on the second pass (after the tapetum), or out of the eye again
const SPAWN = [9.7, 18.2], RATE = 11, SPEED = 330;
const PHOTONS = [];
for (let i = 0; Math.floor(i) < (SPAWN[1] - SPAWN[0]) * RATE; i++) {
  const t0 = SPAWN[0] + i / RATE + (rnd(i * 5) - 0.5) * 0.06, yin = E.y + (rnd(i * 7) - 0.5) * 34, th = ((yin - E.y) / 17) * -0.42 + (rnd(i * 11) - 0.5) * 0.12;
  const u = rnd(i * 13), fate = u < 0.42 ? 1 : u < 0.7 ? 2 : 3;
  PHOTONS.push({ i, t0, yin, th, fate });
}
const polar = (a, r) => [E.x + Math.cos(a) * r, E.y + Math.sin(a) * r];
function photonPath(p) {
  const S = [-20, p.yin], Lp = [LENS.x, p.yin * 0.8 + E.y * 0.2], ret = polar(p.th, (RET_IN + RET_OUT) / 2), tap = polar(p.th, TAP_IN + 2);
  if (p.fate === 1) return { pts: [S, Lp, ret], absorbAt: 2 };
  const ret2 = polar(p.th + 0.02, (RET_IN + RET_OUT) / 2 - 2);
  if (p.fate === 2) return { pts: [S, Lp, ret, tap, ret2], bounce: 3, absorbAt: 4 };
  const back = [LENS.x, Lp[1] + (Lp[1] - E.y) * 0.1], exit = [-30, back[1] + (back[1] - ret[1]) * 0.2];
  return { pts: [S, Lp, ret, tap, back, exit], bounce: 3 };
}
for (const p of PHOTONS) { const P = photonPath(p); let L = 0; const cum = [0]; for (let k = 1; k < P.pts.length; k++) { L += Math.hypot(P.pts[k][0] - P.pts[k - 1][0], P.pts[k][1] - P.pts[k - 1][1]); cum.push(L); } Object.assign(p, P, { cum, L }); }
function photonAt(p, t) {
  const d = (t - p.t0) * SPEED; if (d < 0 || d > p.L) return null;
  let k = 1; while (k < p.cum.length - 1 && p.cum[k] < d) k++;
  const f = (d - p.cum[k - 1]) / (p.cum[k] - p.cum[k - 1] || 1), [ax, ay] = p.pts[k - 1], [bx, by] = p.pts[k];
  return { x: ax + (bx - ax) * f, y: ay + (by - ay) * f, seg: k, after: p.bounce !== undefined && k > p.bounce };
}
// when (absolute time) a photon is absorbed, and on which rod angle — for the rod flashes and the sound
export const ABSORB = PHOTONS.filter((p) => p.absorbAt).map((p) => ({ t: p.t0 + p.cum[p.absorbAt] / SPEED, th: p.th, second: p.fate === 2 }));
export const BOUNCES = PHOTONS.filter((p) => p.bounce).map((p) => ({ t: p.t0 + p.cum[p.bounce] / SPEED, out: p.fate === 3 }));
export const EXITS = PHOTONS.filter((p) => p.fate === 3).map((p) => ({ t: p.t0 + p.L / SPEED }));

// ---------------------------------------------------------------- the eyeball
function wall(c) {
  const g = c;
  for (let Y = R(E.y - E.r - 14); Y <= R(E.y + E.r + 14); Y++) for (let X = R(E.x - E.r - 14); X <= R(E.x + E.r + 14); X++) {
    const dx = X + 0.5 - E.x, dy = Y + 0.5 - E.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), front = Math.abs(a) > 2.55;
    if (d <= E.r) { if (front && d > E.r - 2) continue; const v = d / E.r; g.px(X, Y, v * 0.6 + 0.2 * bayer(X, Y) > 0.55 ? COL.vit2 : COL.vit); continue; }
    if (front) continue;
    if (d <= E.r + 10) g.px(X, Y, d > E.r + 8.6 || d < E.r + 1.2 ? COL.out : mix(COL.wall, COL.wallD, clamp01((dy + E.r) / (2 * E.r)) * 0.8 + (bayer(X, Y) - 0.5) * 0.15));
  }
  // optic nerve at the back
  for (let Y = E.y - 14; Y <= E.y + 14; Y++) for (let X = E.x + E.r + 9; X < E.x + E.r + 60; X++) g.px(X, Y, Math.abs(Y - E.y) > 12 ? COL.out : mix(COL.wall, COL.wallD, 0.5 + (bayer(X, Y) - 0.5) * 0.2));
  // cornea: a clear dome in front
  for (let a = -0.62; a <= 0.62; a += 0.004) { const r = 96, x = E.x - E.r + 38 - Math.cos(a) * r + 2, y = E.y + Math.sin(a) * r * 1.9; g.px(R(x), R(y), "#9AB8F0"); g.px(R(x) + 1, R(y), "#5A6EB8"); }
}
function iris(c, open) {
  const gap = 10 + 26 * open;
  for (const [y0, y1] of [[E.y - 104, E.y - gap], [E.y + gap, E.y + 104]]) for (let Y = R(y0); Y <= R(y1); Y++) for (let X = IRIS_X - 6; X <= IRIS_X + 6; X++) { const edge = X === IRIS_X - 6 || X === IRIS_X + 6 || Y === R(y0) || Y === R(y1); c.px(X, Y, edge ? COL.out : COL.iris[1 + (((Y >> 2) + (X >> 1)) & 1) + (X < IRIS_X ? 1 : 0)]); }
}
function lens(c) {
  for (let Y = LENS.y - LENS.ry; Y <= LENS.y + LENS.ry; Y++) for (let X = LENS.x - LENS.rx; X <= LENS.x + LENS.rx; X++) {
    const e = ((X - LENS.x) / LENS.rx) ** 2 + ((Y - LENS.y) / LENS.ry) ** 2; if (e > 1) continue;
    if (e > 0.86) { c.px(X, Y, "#5A6EB8"); continue; }
    if (0.45 > bayer(X, Y) + e * 0.3) c.px(X, Y, mix(c.get(X, Y), COL.lens, 0.35 + (X < LENS.x - 6 && Y < LENS.y - 20 ? 0.4 : 0)));
  }
}
function retina(c, t, flash) {
  // the band
  for (let Y = R(E.y - E.r); Y <= R(E.y + E.r); Y++) for (let X = R(E.x); X <= R(E.x + E.r); X++) {
    const dx = X + 0.5 - E.x, dy = Y + 0.5 - E.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (a < BACK.a0 || a > BACK.a1) continue;
    if (d >= RET_IN && d < RET_OUT) c.px(X, Y, d < RET_IN + 2 ? "#2A1E4A" : mix("#241A40", "#3A2A60", bayer(X, Y) * 0.6));
  }
  // rods: radial sticks, lighting up when they catch a photon
  for (let a = BACK.a0 + 0.02; a <= BACK.a1; a += 0.05) {
    const k = flash(a), col = k > 0 ? mix(COL.rod, COL.rodHi, k) : COL.rod;
    for (let r = RET_IN + 3; r < RET_OUT - 1; r += 0.5) { const [x, y] = polar(a, r); c.px(R(x), R(y), col); c.px(R(x), R(y) + 1, col); }
    if (k > 0) { const [fx, fy] = polar(a, (RET_IN + RET_OUT) / 2); for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) { const d = Math.hypot(i, j) / 7; if (d < 1 && (1 - d) * k > bayer(R(fx) + i, R(fy) + j)) c.px(R(fx) + i, R(fy) + j, mix(c.get(R(fx) + i, R(fy) + j), "#FFE89A", 0.7)); } }
    const [hx, hy] = polar(a, RET_IN + 3); c.px(R(hx), R(hy), k > 0 ? "#FFF6D0" : "#B08AE8");
  }
}
function tapetum(c, t, shine) {
  for (let Y = R(E.y - E.r); Y <= R(E.y + E.r); Y++) for (let X = R(E.x); X <= R(E.x + E.r); X++) {
    const dx = X + 0.5 - E.x, dy = Y + 0.5 - E.y, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    if (a < TAP.a0 || a > TAP.a1 || d < TAP_IN || d >= TAP_OUT) continue;
    // iridescent bands sliding along the layer; a bright sweep for "shiny"
    const v = (Math.sin(a * 9 - t * 1.6) + 1) / 2, s = clamp01(0.25 + v * 0.75) * 4, lo = Math.floor(s), base = COL.tap[Math.min(4, s - lo > bayer(X, Y) ? lo + 1 : lo)];
    const sweep = shine > 0 ? Math.max(0, 1 - Math.abs(a - (-1 + shine * 2)) * 5) : 0;
    c.px(X, Y, sweep > bayer(X, Y) ? "#FFFFFF" : base);
  }
  // glints
  for (let k = 0; k < 7; k++) { const ph = (t * 0.7 + rnd(k) * 3) % 3; if (ph > 0.5) continue; const a = TAP.a0 + rnd(k * 9) * (TAP.a1 - TAP.a0), [x, y] = polar(a, (TAP_IN + TAP_OUT) / 2), s = R(3 * Math.sin((Math.PI * ph) / 0.5)); for (let j = -s; j <= s; j++) { c.px(R(x) + j, R(y), "#FFFFFF"); c.px(R(x), R(y) + j, "#FFFFFF"); } }
}

// ---------------------------------------------------------------- labels (in-scene, screen space)
function label(c, text, x, y, col, a, scale = 2, lineTo = null) {
  if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale }) + 16, h = 7 * scale + 10, X = R(Math.max(8, Math.min(532 - w, x - w / 2))), Y = R(y);
  if (lineTo) { const [lx, ly] = lineTo, n = Math.ceil(Math.hypot(lx - x, ly - (Y + h / 2))); for (let i = 0; i <= n; i++) { if (i % 6 > 3) continue; g.px(R(x + ((lx - x) * i) / n), R(Y + h + ((ly - Y - h) * i) / n), col); } }
  g.rrect(X, Y, w, h, col, 2); g.rrect(X + 2, Y + 2, w - 4, h - 4, "#120C1D", 2); g.text(MAIN, text, X + 8, Y + 5, col, { scale });
}

// ---------------------------------------------------------------- the whole section at time t; EV = word anchors
export function drawSection(c, t, EV) {
  const open = 0.95;
  wall(c); retina(c, t, (a) => { let k = 0; for (const ab of ABSORB) { const age = t - ab.t; if (age < 0 || age > 0.45) continue; if (Math.abs(ab.th - a) < 0.03) k = Math.max(k, 1 - age / 0.45); } return k; });
  tapetum(c, t, sm(t, EV.shiny - 0.1, EV.shiny + 0.9) * (1 - sm(t, EV.shiny + 0.9, EV.shiny + 1.0)));
  lens(c); iris(c, open);
  // photons: warm light in, green after the mirror; the ones leaving the eye glow brighter during "comes all the way out"
  const outHi = sm(t, EV.comes - 0.2, EV.comes + 0.2);
  for (const p of PHOTONS) { const q = photonAt(p, t); if (!q) continue; const col = q.after ? COL.green : COL.light, hi = q.after && p.fate === 3 && outHi > 0;
    for (let k = 6; k >= 1; k--) { const tr = photonAt(p, t - k * 0.014); if (tr && tr.seg === q.seg) fade(c, 0.75 - k * 0.1).rect(R(tr.x) - 1, R(tr.y) - 1, 3, 3, col); }
    const s = hi ? 6 : 4; for (let j = -s; j <= s; j++) for (let i = -s; i <= s; i++) { const d = Math.hypot(i, j) / s; if (d > 1) continue; if (d > 0.55 && (1 - d) * 1.6 < bayer(R(q.x) + i, R(q.y) + j)) continue; c.px(R(q.x) + i, R(q.y) + j, d < 0.3 ? "#FFFFFF" : col); } }
  // labels on their words
  const rA = Math.min(sm(t, EV.retina - 0.05, EV.retina + 0.25), 1 - sm(t, EV.whatever - 0.2, EV.whatever + 0.2));
  label(c, "RETINA", E.x + 70, E.y - E.r - 64, "#B08AE8", rA, 3, polar(-0.95, RET_IN + 6));
  label(c, "CATCHES LIGHT", E.x + 70, E.y - E.r - 30, "#B08AE8", rA * sm(t, EV.catches - 0.05, EV.catches + 0.25), 2);
  const tA = Math.min(sm(t, EV.tapetum - 0.05, EV.tapetum + 0.25), 1 - sm(t, EV.some - 0.2, EV.some + 0.2));
  label(c, "TAPETUM", E.x + 80, E.y + E.r + 22, COL.tap[3], tA, 3, polar(0.8, TAP_OUT));
  label(c, "SHINY MIRROR", E.x + 80, E.y + E.r + 58, COL.tap[3], tA * sm(t, EV.layer - 0.05, EV.layer + 0.25), 2);
  label(c, "1ST TRY", E.x - 10, E.y - 150, COL.light, Math.min(sm(t, EV.once - 0.25, EV.once + 0.05), 1 - sm(t, EV.misses, EV.misses + 0.3)), 3);
  label(c, "BOUNCES BACK", E.x - 40, E.y + 120, COL.green, Math.min(sm(t, EV.bounces - 0.2, EV.bounces + 0.1), 1 - sm(t, EV.second - 0.2, EV.second + 0.1)), 2);
  label(c, "2ND TRY", E.x - 10, E.y - 150, COL.green, Math.min(sm(t, EV.second - 0.1, EV.second + 0.2), 1 - sm(t, EV.some - 0.2, EV.some + 0.1)), 3);
  label(c, "COMES BACK OUT", 150, E.y + 150, COL.green, Math.min(sm(t, EV.comes - 0.1, EV.comes + 0.2), 1 - sm(t, EV.again + 0.2, EV.again + 0.5)), 2, [40, E.y]);
  // light comes in from the left: a soft arrow before the stream starts
  const inA = Math.min(sm(t, EV.light2 - 0.4, EV.light2), 1 - sm(t, EV.once, EV.once + 0.3));
  if (inA > 0) { const g = fade(c, inA); for (let x = 6; x < 60; x++) g.rect(x, E.y - 1, 1, 3, COL.light); for (let k = 0; k < 8; k++) { g.rect(60 - k, E.y - k, 1, 2 * k + 1, COL.light); } label(c, "LIGHT", 40, E.y - 60, COL.light, inA, 2); }
}
