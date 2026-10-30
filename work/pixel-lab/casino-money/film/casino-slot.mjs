// ============================================================================================================================
// CASINO KIT · SLOT (added by film 2 casino-slots, 2026-10-27). Films 3–5: copy this file with the rest of the kit as a frozen
// copy. The big hero slot machine as a real 3D cabinet seen through the kit camera (casino-core.mjs makeView): plinth, lower
// door with belly art (or a cut-away interior: logic box, chip, rolling numbers, coin hopper, cables), button deck (coin slot,
// SPIN, STOP, BET buttons), chrome reel bezel with three curved reels (per-pixel cylinder, dithered motion blur), payline,
// top screen, marquee art glass with smooth chasing bulbs, arched topper with a star, coin chute and pay tray with coins.
//
// SLOT                     sizes in cm (W 80, depth 60, height 210; reels 3 × 18 cm, 12 stops each: symbol, blank, …)
// STRIPS, SYMS             the three reel strips ("seven" | "cherry" | "bell" | "bar" | null = blank)
// stopOf(r, sym, row)      reel index that shows `sym` on the payline (row 0), just above it (row 1) or below (row −1)
// reelPos(t, r, spins, p0) float reel index at t for a list of spins [{ t0, stop: [t1, t2, t3], to: [i, i, i], turns }]
// reelSpeed(t, r, spins)   index / s (drives the motion blur)
// drawSlot(c, V, t, M, st) → geometry { win, reels[], screen, spin, stop, slot, chute, tray, ticker, chip, top, deck }
//     M  = { x, z, body: ramp, seed }   (front face at z, centred on x, standing on the floor y = 0)
//     st = { reels: [p, p, p], speeds, lights 0..1, win 0..1, cut 0..1 (door → interior), press: { spin, stop, bet },
//            line 0..1 (payline glow), glow: [[reel, index, k]], coins: [{ u, v, d, a, spin }] (in/around the tray),
//            screen(c, rect, t) callback, noTicker }
// symbolTex(kind, S)       cached painted symbol (S px square, dark 1-px outline) → { S, col: Array(S*S) of [r,g,b] | null }
// blitSym(c, kind, cx, cy, S, a, o)   draw a symbol texture centred at (cx, cy) (dithered alpha, optional squash o.sy)
// rollingDigits(c, x, y, t, o)        odometer digits that roll continuously (no one-frame changes) → digit values
// padlock(c, x, y, s, closed, a), heart(c, x, y, s, a), musicNote(c, x, y, s, col, a), speaker(c, x, y, s, a)
// moneyText(c, txt, x, y, scale, col, a)  MAIN text that also knows "¢" (the font has no cent sign)
// ============================================================================================================================
import { Canvas, MAIN, TINY, hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, rampAt, glow, shadow } from "./casino-core.mjs";

export const SLOT = { W: 80, D: 60, H: 210, REEL_W: 18, STOPS: 12 };
export const SYMS = ["seven", "cherry", "bell", "bar"];
const _ = null;
export const STRIPS = [
  ["seven", _, "cherry", _, "bar", _, "bell", _, "bar", _, "cherry", _],
  ["bell", _, "seven", _, "cherry", _, "bar", _, "bell", _, "bar", _],
  ["cherry", _, "bar", _, "seven", _, "bell", _, "cherry", _, "bar", _],
];
/** Reel index whose symbol `sym` sits on the payline (row 0), one stop above it (row 1) or below (row −1). */
export function stopOf(r, sym, row = 0) { const i = STRIPS[r].indexOf(sym); return (((i - row) % 12) + 12) % 12; }

// ---------------------------------------------------------------- reel motion (pure functions of t)
// trapezoid speed profile: ramp up (a), cruise, ramp down (b) → normalised travel 0..1
function trap(u, a, b) {
  u = clamp01(u); const tot = a / 2 + (1 - a - b) + b / 2;
  if (u < a) return (u * u) / (2 * a) / tot;
  if (u < 1 - b) return (a / 2 + (u - a)) / tot;
  const w = u - (1 - b); return (a / 2 + (1 - a - b) + (w - (w * w) / (2 * b))) / tot;
}
/** Float reel index at t. spins = [{ t0, stop: [t1, t2, t3], to: [i0, i1, i2], turns (default from rate 26 idx/s), slow: [b0, b1, b2] }], p0 = start index. */
export function reelPos(t, r, spins, p0 = 0) {
  let p = p0;
  for (const sp of spins) {
    const t1 = sp.stop[r];
    if (t < sp.t0) return p;
    const base = Math.ceil(p - 1e-6), to = sp.to[r], travel = (sp.turns ?? Math.floor(((t1 - sp.t0) * (sp.rate ?? 26)) / 12)) * 12 + ((((to - base) % 12) + 12) % 12), end = base + travel;
    if (t < t1) { const b = sp.slow?.[r] ?? 0.22; return p + (end - p) * trap((t - sp.t0) / (t1 - sp.t0), 0.08, b); }
    const s = t - t1, bounce = s < 0.24 ? 0.13 * Math.sin((Math.PI * s) / 0.24) * (1 - s / 0.24) : 0;
    p = end + bounce;
  }
  return p;
}
export function reelSpeed(t, r, spins, p0 = 0) { return Math.abs(reelPos(t + 1 / 60, r, spins, p0) - reelPos(t - 1 / 60, r, spins, p0)) * 30; }

// ---------------------------------------------------------------- symbol textures (painted once per size, cached)
const KEY = "#FF00FF", TEX = new Map();
export function symbolTex(kind, S) {
  S = Math.max(4, Math.min(140, Math.round(S)));
  const key = kind + S; let tx = TEX.get(key); if (tx) return tx;
  const c = new Canvas(S, S, KEY), U = S / 32, P = (x, y) => [x * U, y * U], sh = (ramp, f) => (x, y) => rampAt(ramp, f(x / U, y / U), x, y);
  if (kind === "seven") {
    const pts = [[4, 4], [28, 4], [28, 9.5], [19, 29], [11, 29], [20.5, 10.5], [10.5, 10.5], [10.5, 14], [4, 14]].map(([x, y]) => P(x, y));
    c.poly(pts, null, sh(RAMP.red, (x, y) => 6.6 - y * 0.12 + (x > 20 && y > 10 ? -0.8 : 0)));
    c.poly([[5.5, 5.5], [26.5, 5.5], [26.5, 7], [5.5, 7]].map(([x, y]) => P(x, y)), "#FFD0C0");
    if (S >= 26) c.poly([[21.5, 11], [23, 11], [15, 27.5], [13.5, 27.5]].map(([x, y]) => P(x, y)), "#FF9080");
    c.poly([[26.5, 9], [28, 9.5], [19, 29], [17, 29]].map(([x, y]) => P(x, y)), "#78101A");
  } else if (kind === "cherry") {
    const stem = (x0, y0) => { for (let k = 0; k <= 24; k++) { const u = k / 24, x = lerp(x0, 19, u) + Math.sin(Math.PI * u) * (x0 < 19 ? -2 : 2), y = lerp(y0, 5, u); c.rect(R(x * U), R(y * U), Math.max(1, R(1.6 * U)), Math.max(1, R(1.6 * U)), rampAt(RAMP.green, 4.5 - u * 1.5, R(x * U), R(y * U))); } };
    stem(10, 16); stem(22, 18);
    c.poly([[19, 5], [24, 1.5], [29.5, 3], [25, 7.5]].map(([x, y]) => P(x, y)), null, sh(RAMP.green, (x, y) => 6 - (y - 2) * 0.5));
    for (const [cx, cy] of [[10.5, 21], [21.5, 23]]) { const r = 7.2 * U; c.disc(R(cx * U), R(cy * U), R(r), "#000000");
      for (let y = R(cy * U - r); y <= R(cy * U + r); y++) for (let x = R(cx * U - r); x <= R(cx * U + r); x++) { const dx = x - cx * U, dy = y - cy * U; if (dx * dx + dy * dy > r * r + r * 0.8) continue; const hl = Math.hypot(dx + r * 0.38, dy + r * 0.38) / r; c.px(x, y, rampAt(RAMP.red, 7.2 - hl * 4.3, x, y)); }
      c.disc(R(cx * U - r * 0.4), R(cy * U - r * 0.42), Math.max(1, R(r * 0.18)), "#FFF0F0"); }
  } else if (kind === "bell") {
    const body = [[14, 4.5], [18, 4.5], [21.5, 7], [23, 12], [23.6, 18], [25.5, 22], [28, 24], [28, 26.5], [4, 26.5], [4, 24], [6.5, 22], [8.4, 18], [9, 12], [10.5, 7]].map(([x, y]) => P(x, y));
    c.poly(body, null, sh(RAMP.yellow, (x, y) => 7.4 - Math.abs(x - 12.5) * 0.36 - y * 0.03));
    c.poly([[4, 23.5], [28, 23.5], [28, 26.5], [4, 26.5]].map(([x, y]) => P(x, y)), null, sh(RAMP.gold, (x) => 6.3 - Math.abs(x - 11) * 0.22));
    c.poly([[11.5, 8], [13, 7.5], [11, 21], [9.6, 21]].map(([x, y]) => P(x, y)), "#FFF6C8");
    c.disc(R(16 * U), R(28.6 * U), Math.max(1, R(2.4 * U)), RAMP.gold[3]); c.disc(R(16 * U), R(3.6 * U), Math.max(1, R(1.8 * U)), RAMP.gold[5]);
  } else if (kind === "bar") {
    c.rrect(R(2.5 * U), R(9 * U), R(27 * U), R(14 * U), RAMP.gold[3], Math.max(1, R(2 * U)));
    c.rrect(R(3.5 * U), R(10 * U), R(25 * U), R(12 * U), RAMP.gold[6], Math.max(1, R(2 * U)));
    c.rrect(R(5 * U), R(11.5 * U), R(22 * U), R(9 * U), "#14121C", Math.max(1, R(1.5 * U)));
    const sc = Math.max(1, Math.floor(S / 34)), w = c.measure(MAIN, "BAR", { scale: sc });
    if (S >= 22) c.text(MAIN, "BAR", R(16 * U - w / 2), R(16 * U - 3.5 * sc), "#FDF6E0", { scale: sc }); else c.rect(R(8 * U), R(15.5 * U), R(16 * U), Math.max(1, R(U)), "#FDF6E0");
  }
  // to colours with a dark 1-px outline
  const col = new Array(S * S).fill(null), on = (x, y) => { if (x < 0 || y < 0 || x >= S || y >= S) return false; const q = c.get(x, y); return !(q[0] === 255 && q[1] === 0 && q[2] === 255); };
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { if (on(x, y)) col[y * S + x] = c.get(x, y); else if (S >= 9 && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) col[y * S + x] = [32, 8, 16]; }
  tx = { S, col }; if (TEX.size > 600) TEX.clear(); TEX.set(key, tx); return tx;
}
/** Draw a symbol centred at (cx, cy), size S px; o = { sy: vertical squash 0..1, tint: [col, k] }. */
export function blitSym(c, kind, cx, cy, S, a = 1, o = {}) {
  if (!kind || a <= 0) return; const tx = symbolTex(kind, S), s = tx.S, sy = o.sy ?? 1, h = Math.max(1, R(s * sy)), x0 = R(cx - s / 2), y0 = R(cy - h / 2);
  for (let j = 0; j < h; j++) { const v = Math.min(s - 1, Math.floor((j + 0.5) / sy)); for (let i = 0; i < s; i++) { let q = tx.col[v * s + i]; if (!q) continue; if (a < 1 && a <= bayer(x0 + i, y0 + j)) continue; if (o.tint) q = mix(q, o.tint[0], o.tint[1]); c.px(x0 + i, y0 + j, q); } }
}

// ---------------------------------------------------------------- small icons
/** Rolling odometer digits in a box at (x, y). o = { n, scale, seed, speed, freeze: [t0, t1, values] } → current digit values. */
// each column holds a digit, then rolls to the next one in ~40 % of its step (eased, never a one-frame jump)
const digitPos = (i, t, o) => { const raw = t * (o.speed ?? 3.5) * (0.7 + 0.6 * rnd((o.seed ?? 1) * 17 + i)) + rnd((o.seed ?? 1) * 5 + i) * 10, lo = Math.floor(raw), f = raw - lo, x = clamp01((f - 0.6) / 0.4); return lo + x * x * (3 - 2 * x); };
/** The digits rollingDigits shows at time t (nearest whole digit per column). */
export function digitValues(t, o = {}) { const out = []; for (let i = 0; i < (o.n ?? 6); i++) out.push(Math.round(digitPos(i, t, o)) % 10); return out; }
export function rollingDigits(c, x, y, t, o = {}) {
  const n = o.n ?? 6, sc = o.scale ?? 2, cw = 6 * sc, ch = 9 * sc, a = o.a ?? 1, g = fade(c, a), col = o.col ?? "#7FF0B0", vals = [];
  g.rrect(x - 3, y - 3, n * cw + 5, ch + 6, o.frame ?? "#0E2A1E", 2); g.rect(x - 1, y - 1, n * cw + 1, ch + 2, "#04100A");
  for (let i = 0; i < n; i++) {
    const pos = digitPos(i, t, o), lo = Math.floor(pos), fr = pos - lo, xx = x + i * cw;
    vals.push(fr < 0.5 ? lo % 10 : (lo + 1) % 10);
    for (const [d, off] of [[lo % 10, -fr], [(lo + 1) % 10, 1 - fr]]) {
      const yy = y + R(off * ch), sub = Object.create(g); sub.px = (px, py, cc) => { if (py >= y && py < y + ch) g.px(px, py, cc); };
      sub.text(MAIN, String(d), xx + sc, yy + sc, col, { scale: sc });
    }
  }
  return vals;
}
export function padlock(c, x, y, s, closed = 1, a = 1) {
  const g = fade(c, a), lift = R((1 - closed) * 4 * s);
  for (let k = 0; k < 3; k++) { g.ering(x, y - 3 * s - lift, Math.max(1, 3 * s - k * 0.5), Math.max(1, 3.2 * s - k * 0.5), k === 1 ? "#E6E6F0" : "#5A5A70", Math.PI, Math.PI * 2); }
  g.rect(R(x - 3 * s), R(y - 3 * s - lift), Math.max(1, R(s)), R(3 * s), "#9696AA"); g.rect(R(x + 2 * s), R(y - 3 * s - lift + (1 - closed) * 0), Math.max(1, R(s)), R(3 * s), "#9696AA");
  g.rrect(R(x - 4.5 * s) - 1, R(y - 1 * s) - 1, R(9 * s) + 2, R(7 * s) + 2, "#0B0812", 2);
  g.rrect(R(x - 4.5 * s), R(y - 1 * s), R(9 * s), R(7 * s), "#E8B020", 2); g.rect(R(x - 4.5 * s) + 1, R(y - 1 * s) + 1, R(9 * s) - 2, Math.max(1, R(s * 0.8)), "#FFF0A0");
  g.rect(R(x - 0.5 * s), R(y + 1.2 * s), Math.max(1, R(s)), R(2.6 * s), "#5A3A08");
}
export function heart(c, x, y, s, a = 1) {
  const g = fade(c, a), rows = [".XX.XX.", "XRRXRRX", "XRWRRRX", "XRRRRRX", ".XRRRX.", "..XRX..", "...X..."];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; g.rect(R(x + (i - 3.5) * s), R(y + (j - 3.5) * s), Math.ceil(s), Math.ceil(s), ch === "X" ? "#3A0610" : ch === "W" ? "#FFD0D8" : j > 3 ? "#C81E3C" : "#F03C58"); }));
}
export function musicNote(c, x, y, s, col, a = 1) {
  const g = fade(c, a); g.ellipse(R(x), R(y), Math.max(1, R(2.2 * s)), Math.max(1, R(1.6 * s)), "#0B0812"); g.ellipse(R(x), R(y) - 1, Math.max(1, R(2 * s)), Math.max(1, R(1.4 * s)), col);
  g.rect(R(x + 1.6 * s), R(y - 7 * s), Math.max(1, R(0.8 * s)), R(7 * s), col); g.rect(R(x + 1.6 * s), R(y - 7 * s), R(3 * s), Math.max(1, R(1 * s)), col); g.rect(R(x + 3.8 * s), R(y - 7 * s), Math.max(1, R(0.8 * s)), R(2.6 * s), col);
}
export function speaker(c, x, y, s, a = 1, waves = 1) {
  const g = fade(c, a); g.rect(R(x - 4 * s), R(y - 2 * s), R(3 * s), R(4 * s), "#E0CDF8"); g.poly([[x - 1 * s, y - 2 * s], [x + 2.5 * s, y - 5 * s], [x + 2.5 * s, y + 5 * s], [x - 1 * s, y + 2 * s]], "#E0CDF8");
  for (let k = 1; k <= 2; k++) if (waves > k * 0.4) g.ering(R(x + 3 * s), R(y), R((2 + k * 2.2) * s), R((2.5 + k * 2.6) * s), "#F4CA50", -1.0, 1.0);
}
const CENT = ["..#..", ".###.", "##.#.", "#.#..", "##.#.", ".###.", "..#.."];
/** MAIN text with "¢" support (drawn as our own 5×7 glyph). */
export function moneyText(c, txt, x, y, scale, col, a = 1, shadowCol = "#05030A") {
  const g = fade(c, a); let xx = x;
  const draw = (gg, ox, oy, cc) => { let px = ox; for (const ch of txt) { if (ch === "¢") { CENT.forEach((r, j) => [...r].forEach((q, i) => { if (q === "#") gg.rect(px + i * scale, oy + j * scale, scale, scale, cc); })); px += 6 * scale; } else { gg.text(MAIN, ch, px, oy, cc, { scale }); px += c.measure(MAIN, ch, { scale }) + scale; } } return px - ox; };
  if (shadowCol) draw(g, x + Math.max(1, scale >> 1), y + Math.max(1, scale >> 1), shadowCol);
  return draw(g, xx, y, col);
}
export function moneyWidth(c, txt, scale) { let w = 0; for (const ch of txt) w += ch === "¢" ? 6 * scale : c.measure(MAIN, ch, { scale }) + scale; return w; }

// ---------------------------------------------------------------- the machine
const O = "#0B0812";
function reelStrip(c, x0, y0, x1, y1, strip, p, speed, o = {}) {
  const d = c.d, W = c.w, Hh = c.h, half = (y1 - y0) / 2, yc = (y0 + y1) / 2, TH = 1.2, sMax = Math.sin(TH), dth = (2 * Math.PI) / 12, Rpx = half / sMax, cell = Rpx * dth, S = Math.max(4, R(Math.min(x1 - x0, cell) * 0.86)), xc = (x0 + x1) / 2;
  const blur = speed / 30 > 0.12 ? Math.min(1.6, speed / 30) : 0, tex = {}, gl = o.glow ?? {}, dimK = o.dim ?? 0;
  for (const k of SYMS) tex[k] = symbolTex(k, S);
  const X0 = Math.max(0, Math.ceil(x0)), X1 = Math.min(W, Math.floor(x1)), Y0 = Math.max(0, Math.ceil(y0)), Y1 = Math.min(Hh, Math.floor(y1));
  for (let y = Y0; y < Y1; y++) {
    const s = ((yc - y - 0.5) / half) * sMax, th = Math.asin(Math.max(-1, Math.min(1, s))), q0 = p + th / dth, shd = Math.cos(th);
    const lightK = 0.25 + 0.75 * shd;
    for (let x = X0; x < X1; x++) {
      let r = 0, g = 0, b = 0; const ns = blur ? 5 : 1;
      for (let sI = 0; sI < ns; sI++) { const q = blur ? q0 - blur * ((sI + bayer(x, y)) / ns) : q0, i = Math.round(q), idx = ((i % 12) + 12) % 12, kind = strip[idx];
        let rr = 244, gg = 236, bb = 216;                                              // ivory strip
        if (kind) { const t = tex[kind], ly = Math.floor(S / 2 + (i - q) * cell), lx = Math.floor(x - (xc - S / 2)); if (ly >= 0 && ly < S && lx >= 0 && lx < S) { const cc = t.col[ly * S + lx]; if (cc) { rr = cc[0]; gg = cc[1]; bb = cc[2]; } } const gk = gl[idx]; if (gk) { rr += (255 - rr) * gk * 0.35; gg += (240 - gg) * gk * 0.35; bb += (150 - bb) * gk * 0.2; } }
        r += rr / ns; g += gg / ns; b += bb / ns; }
      // cylinder shading (dithered steps) + a soft highlight band just above the middle
      let L = lightK + (Math.abs(th + 0.25) < 0.12 ? 0.08 : 0); L = Math.round(L * 6 + bayer(x, y) - 0.5) / 6; L *= 1 - dimK;
      const k = (y * W + x) * 3; d[k] = Math.min(255, r * L + 26 * (1 - L)); d[k + 1] = Math.min(255, g * L + 10 * (1 - L)); d[k + 2] = Math.min(255, b * L + 22 * (1 - L));
    }
  }
}
/**
 * Draw one big slot machine. Returns screen geometry for the film's overlays.
 */
export function drawSlot(c, V, t, M, st = {}) {
  const B = M.body ?? RAMP.red, T = RAMP.gold, CH = RAMP.chrome, seed = M.seed ?? 1, lights = st.lights ?? 1, win = st.win ?? 0, cut = st.cut ?? 0, pr = st.press ?? {};
  const P = (u, v, d = 0) => V.P(M.x + u, v, M.z + d), P2 = (u, v, d) => { const p = P(u, v, d); return [p[0], p[1]]; };
  const k0 = P(0, 100, 0)[2];
  const [lx] = P(-40, 100, 0), [rx] = P(40, 100, 0); if (rx < -30 || lx > 570) return null;
  const quad = (pts, ramp, lv) => { const q = pts.map(([u, v, d]) => P2(u, v, d)); let y0 = 1e9, y1 = -1e9; for (const p of q) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } const f = typeof lv === "function" ? lv : () => lv; c.poly(q, null, (x, y) => rampAt(ramp, f(x, y, (y - y0) / Math.max(1, y1 - y0)), x, y)); return q; };
  const rectF = (u0, v0, u1, v1, d, ramp, lv) => quad([[u0, v1, d], [u1, v1, d], [u1, v0, d], [u0, v0, d]], ramp, lv);
  const edge = (pts, col) => { for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), col); } };
  const camX = V.cam.x - M.x, camY = V.cam.y, glowK = 0.55 + 0.45 * lights;
  // floor light pool + contact shadow
  { const [fx, fy, fk] = P(0, 0, 40); glow(c, fx, fy, 120 * fk, 34 * fk, mix(B[6], "#FFC870", 0.6), 0.32 * glowK + 0.25 * win); const [sx, sy, sk] = P(0, 0, -20); shadow(c, sx, sy, 50 * sk, 14 * sk, 0.55); }
  // side faces (only the one turned toward the camera)
  for (const s of [-1, 1]) { if (s * camX <= 40) continue; const u = s * 40;
    quad([[u, 0, -60], [u, 0, 2], [u, 180, 0], [u, 180, -60]], B, (x, y, f) => 1.4 + f * 0.6);
    quad([[u, 60, 0], [u, 60, 24], [u, 70, 24], [u, 86, 0]], CH, 2.2);
    const e = [P2(u, 180, 0), P2(u, 180, -60)]; c.line(R(e[0][0]), R(e[0][1]), R(e[1][0]), R(e[1][1]), CH[5]); }
  // plinth with the lit kick strip
  rectF(-40, 0, 40, 12, 2, RAMP.black, (x, y, f) => 3 - f * 2);
  rectF(-38, 7, 38, 9.5, 2.2, T, 4.5 + 2.5 * glowK);
  { const [kx, ky, kk] = P(0, 8, 3); glow(c, kx, ky, 46 * kk, 6 * kk, UI.Y, 0.3 * glowK); }
  // lower cabinet front + door (or the interior)
  const front = rectF(-40, 12, 40, 64, 0, B, (x, y, f) => 2.2 + (1 - f) * 1.4);
  if (cut > 0) interior(c, V, t, P, P2, quad, rectF, st, cut);
  if (cut < 1) { const g0 = c; const cf = fade(c, 1 - cut);
    const door = [[-34, 60, 0.3], [34, 60, 0.3], [34, 33, 0.3], [-34, 33, 0.3]].map(([u, v, d]) => P2(u, v, d));
    cf.poly(door, null, (x, y) => { const [cx, cy, ck] = P(0, 46.5, 0), dx = (x - cx) / (34 * ck), dy = (y - cy) / (14 * ck), ang = Math.atan2(dy, dx), ray = Math.cos(ang * 12 + 0.3) > 0.2, rr = Math.hypot(dx, dy * 1.6); return rampAt(ray ? B : RAMP.purple, (ray ? 4.6 : 3.4) - rr * 2.4 + 0.6 * lights, x, y); });
    for (const [u0, v0, u1, v1] of [[-34, 59, 34, 60], [-34, 33, 34, 34]]) { const q = [[u0, v1], [u1, v1], [u1, v0], [u0, v0]].map(([u, v]) => P2(u, v, 0.4)); cf.poly(q, null, (x, y) => rampAt(CH, 5.5, x, y)); }
    const [cx, cy, ck] = P(0, 46.5, 0.5); blitSym(cf, "cherry", cx, cy, 23 * ck, 1);
    for (let i = 0; i < 9; i++) { const ang = (i / 9) * Math.PI * 2 + t * 0.6, [sx, sy] = P(Math.cos(ang) * 24, 46.5 + Math.sin(ang) * 10, 0.5), tw = 0.5 + 0.5 * Math.sin(t * 4 + i * 1.3); if (tw > 0.55) cf.px(R(sx), R(sy), "#FFF6C8"); }
    const kh = P(30, 46.5, 0.5); cf.disc(R(kh[0]), R(kh[1]), Math.max(1, R(1.6 * ck)), CH[5]); cf.px(R(kh[0]), R(kh[1]), O); void g0;
  }
  edge(front, O);
  // coin chute + pay tray
  rectF(-9, 25, 9, 31.5, 0.5, CH, 5.2); rectF(-7, 26, 7, 30.5, 0.6, RAMP.black, 0.6);
  const trayTop = quad([[-22, 24, 0], [22, 24, 0], [22, 24, 14], [-22, 24, 14]], RAMP.black, (x, y, f) => 2.2 + f * 1.6);
  quad([[-20, 24.1, 1], [20, 24.1, 1], [20, 24.1, 3], [-20, 24.1, 3]], RAMP.black, 0.6);
  quad([[-22, 12, 14], [22, 12, 14], [22, 24, 14], [-22, 24, 14]], CH, (x, y, f) => 6.4 - f * 3.2);
  quad([[-22, 24, 14], [22, 24, 14], [21, 22.5, 14.4], [-21, 22.5, 14.4]], CH, 7);
  for (const s of [-1, 1]) if (s * camX > 22) quad([[s * 22, 12, 0], [s * 22, 12, 14], [s * 22, 24, 14], [s * 22, 24, 0]], CH, 2.8);
  edge(trayTop, CH[1]);
  for (const cn of st.coins ?? []) coin3(c, V, M, cn);
  // button deck: front lip, sloped top, coin slot, buttons
  quad([[-40, 60, 24], [40, 60, 24], [40, 70, 24], [-40, 70, 24]], CH, (x, y, f) => 5.4 - f * 2.8);
  quad([[-40, 70, 24], [40, 70, 24], [40, 86, 0], [-40, 86, 0]], B, (x, y, f) => 1.4 + f * 1.8);
  quad([[-39, 70.4, 23.4], [39, 70.4, 23.4], [39, 71.4, 22], [-39, 71.4, 22]], CH, 6.5);
  const DL = Math.hypot(16, 24), NV = 24 / DL, ND = 16 / DL, deckPt = (u, f, lift = 0) => [u, lerp(70, 86, f) + NV * lift, lerp(24, 0, f) + ND * lift];
  // coin slot plate (left), SPIN (big round, lit), STOP (red, labelled), BET / MAX (small)
  { const pts = [deckPt(-37, 0.25), deckPt(-30, 0.25), deckPt(-30, 0.8), deckPt(-37, 0.8)]; quad(pts, CH, 5.6); edge(pts.map(([u, v, d]) => P2(u, v, d)), CH[1]); const sl = [deckPt(-34.2, 0.34), deckPt(-32.8, 0.34), deckPt(-32.8, 0.72), deckPt(-34.2, 0.72)]; quad(sl, RAMP.black, 0.4); }
  const button = (u, f, rw, rd, col, press, round, label) => {
    const lift = 2.4 - 1.8 * press, pts = [], top = [], [bu, bv, bd] = deckPt(u, f, lift);
    for (let i = 0; i < 20; i++) { const ang = (i / 20) * Math.PI * 2, cu = Math.cos(ang), cs = Math.sin(ang), sq = round ? 1 : Math.min(1, 1.25 / Math.max(Math.abs(cu), Math.abs(cs))); pts.push(P2(...deckPt(u + cu * rw * sq, f - (cs * rd * sq) / DL, 0))); top.push(P2(...deckPt(u + cu * rw * sq, f - (cs * rd * sq) / DL, lift))); }
    c.poly(pts, mix(col, "#000000", 0.6)); for (let i = 0; i < 20; i++) { const a0 = pts[i], b0 = top[i]; c.line(R(a0[0]), R(a0[1]), R(b0[0]), R(b0[1]), mix(col, "#000000", 0.45)); }
    const [cx, cy] = P2(bu, bv + lift, bd), lit = 0.35 + 0.65 * press;
    c.poly(top, null, (x, y) => { const dd = Math.hypot(x - cx + 2, y - cy + 1); return mix(mix(col, "#FFFFFF", 0.35 * lit), mix(col, "#000000", 0.25), Math.min(1, dd / 14)); });
    edge(top, O); glow(c, cx, cy, rw * k0 * 2.2, rw * k0 * 1.4, col, 0.22 + 0.4 * press);
    if (label && k0 > 1.6) { const sc = k0 > 4.2 ? 2 : 1, w = c.measure(TINY, label, { scale: sc }); c.text(TINY, label, R(cx - w / 2), R(cy - 2.5 * sc), "#FFF6E8", { scale: sc }); }
    return [cx, cy];
  };
  const bet = button(15, 0.5, 3.6, 3, "#E8B020", pr.bet ?? 0, false), mx = button(27, 0.5, 3.6, 3, "#38C860", 0, false);
  const stop = button(-10, 0.48, 6.4, 4.2, "#E02838", pr.stop ?? 0, false, "STOP");
  const spin = button(-23, 0.5, 5.6, 5.4, "#F4A020", pr.spin ?? 0, true, "SPIN");
  void bet; void mx;
  // reel section front, bezel, window
  rectF(-40, 86, 40, 136, 0, B, (x, y, f) => 2.6 + (1 - f) * 0.8);
  const bez = rectF(-33, 86.5, 33, 134, 0.6, CH, (x, y, f) => 6.2 - f * 3.4);
  rectF(-30.5, 87.5, 30.5, 131.5, 0.8, CH, (x, y, f) => 1.6 + f * 2.2);
  edge(bez, O);
  const reels = [];
  for (let r = 0; r < 3; r++) {
    const u0 = -29.5 + r * 20, u1 = u0 + 19, [ax, ay] = P2(u0, 130.5, -1), [bx, by] = P2(u1, 88.5, -1);
    const glw = {}; for (const [rr, idx, kk] of st.glow ?? []) if (rr === r && kk > 0) glw[idx] = Math.max(glw[idx] ?? 0, kk);
    reelStrip(c, ax, ay, bx, by, STRIPS[r], st.reels?.[r] ?? 0, st.speeds?.[r] ?? 0, { glow: glw, dim: st.reelDim ?? 0 });
    reels.push({ x0: ax, y0: ay, x1: bx, y1: by, cx: (ax + bx) / 2, cy: (ay + by) / 2, cell: ((by - ay) / 2 / Math.sin(1.2)) * ((2 * Math.PI) / 12) });
    if (r < 2) { const [sx0, sy0] = P2(u1, 130.5, -0.5), [sx1, sy1] = P2(u1 + 1, 88.5, -0.5); c.rect(R(sx0), R(sy0), Math.max(1, R(sx1 - sx0)), R(sy1 - sy0), CH[2]); }
  }
  // glass sheen + payline with its markers
  { const [ax, ay] = P2(-29.5, 130.5, 0), [bx, by] = P2(29.5, 88.5, 0); c.tint(R(ax), R(ay), R(bx - ax), R((by - ay) * 0.18), (x, y) => 0.18 * (1 - (y - ay) / ((by - ay) * 0.18)), "#FFFFFF", 4);
    for (let i = 0; i < 3; i++) { const x0 = R(lerp(ax, bx, 0.12 + i * 0.05)); c.line(x0, R(ay + 2), x0 + R((by - ay) * 0.35), R(ay + (by - ay) * 0.6), mix("#FFFFFF", "#88A0C0", 0.5)); } }
  const lineY = P(0, 109.5, 0)[1], [wx0] = P2(-30.5, 109.5, 0.9), [wx1] = P2(30.5, 109.5, 0.9), lk = st.line ?? 0;
  c.rect(R(wx0), R(lineY), R(wx1 - wx0), Math.max(1, R(0.5 * k0)), mix("#E02838", "#FFE0A0", lk * 0.5));
  glow(c, (wx0 + wx1) / 2, lineY, (wx1 - wx0) * 0.55, 3 * k0, "#FF4050", 0.2 + 0.4 * lk);
  for (const [s, xx] of [[1, wx0], [-1, wx1]]) { const h = Math.max(2, R(2.2 * k0)); c.poly([[xx - s * 3 * k0, lineY - h], [xx + s * 0.5, lineY], [xx - s * 3 * k0, lineY + h]], "#E02838"); }
  // top screen
  rectF(-40, 136, 40, 182, 0, B, (x, y, f) => 2 + f * 0.8);
  const scr = rectF(-30, 138, 30, 154, 0.5, CH, 5.5); edge(scr, O);
  const [s0x, s0y] = P2(-28.5, 152.5, 0.7), [s1x, s1y] = P2(28.5, 139.5, 0.7);
  c.rect(R(s0x), R(s0y), R(s1x - s0x), R(s1y - s0y), "#06040C");
  for (let y = R(s0y); y < R(s1y); y += 2) c.tint(R(s0x), y, R(s1x - s0x), 1, () => 0.12, "#2A1840", 2);
  const screen = { x0: s0x, y0: s0y, x1: s1x, y1: s1y };
  if (st.screen) st.screen(c, screen, t);
  // marquee art glass with chasing bulbs
  { const [ax, ay] = P2(-35, 180, 0.5), [bx, by] = P2(35, 157, 0.5), cx = (ax + bx) / 2, cy = (ay + by) / 2;
    c.poly([[ax, ay], [bx, ay], [bx, by], [ax, by]], null, (x, y) => { const ang = Math.atan2((y - cy) * 2.2, x - cx), ray = Math.cos(ang * 10 + t * 0.8) > 0.1, rr = Math.hypot((x - cx) / (bx - ax), (y - cy) / (by - ay)); return rampAt(ray ? RAMP.purple : B, (ray ? 5.2 : 4.4) - rr * 4.5 + 1.2 * win * (0.5 + 0.5 * Math.sin(t * 18)), x, y); });
    edge([[ax, ay], [bx, ay], [bx, by], [ax, by]], O);
    for (const [u, sz] of [[-17, 9], [0, 13], [17, 9]]) { const [qx, qy, qk] = P(u, 168.5, 0.8); blitSym(c, "seven", qx, qy, sz * qk * (u === 0 ? 1.15 : 1), 1); }
    const N = 26, per = 2 * (70 + 23);
    for (let i = 0; i < N; i++) { const s = (i / N) * per; let u, v; if (s < 70) { u = -35 + s; v = 180; } else if (s < 93) { u = 35; v = 180 - (s - 70); } else if (s < 163) { u = 35 - (s - 93); v = 157; } else { u = -35; v = 157 + (s - 163); }
      const [bx2, by2, bk] = P(u, v, 1), ph = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * (1.1 + 2.4 * win) - (i / N) * 3) + seed), br = clamp01((0.25 + 0.75 * ph) * (0.45 + 0.55 * lights) + win * 0.5);
      const col = mix("#7A4A10", i % 2 ? "#FFF6D0" : "#FFC0E0", br), r = Math.max(1, R(1.3 * bk)); c.disc(R(bx2), R(by2), r, col); if (br > 0.75 && r >= 2) c.px(R(bx2) - 1, R(by2) - 1, "#FFFFFF"); if (br > 0.6) glow(c, bx2, by2, 4 * bk, 4 * bk, "#FFE0A0", 0.25 * br); } }
  // topper: arch with sunburst, star, bulb rim
  { const arch = (rxu, ryv, d) => { const pts = []; for (let i = 0; i <= 24; i++) { const ang = Math.PI + (Math.PI * i) / 24; pts.push(P2(Math.cos(ang) * rxu, 182 - Math.sin(ang) * ryv, d)); } return pts; };
    const outer = arch(40, 30, -2), inner = arch(34, 25, 0.5), [cx, cy, ck] = P(0, 186, 0.5);
    c.poly(arch(40, 30, -6), B[1]); c.poly(outer, null, (x, y) => rampAt(CH, 6 - Math.abs(x - cx) / (40 * ck) * 3, x, y)); edge(outer, O);
    c.poly(inner, null, (x, y) => { const ang = Math.atan2(y - cy, x - cx), ray = Math.cos(ang * 9) > 0; return rampAt(ray ? T : B, (ray ? 5.4 : 4.6) - Math.hypot(x - cx, (y - cy) * 1.4) / (34 * ck) * 2.6 + win * 1.4 * (0.5 + 0.5 * Math.sin(t * 20)), x, y); });
    const r1 = 11 * ck, r0 = 4.8 * ck, sp = []; for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5 + 0.04 * Math.sin(t * 1.5), rr = i % 2 ? r0 : r1; sp.push([cx + Math.cos(ang) * rr, cy - 4 * ck + Math.sin(ang) * rr]); }
    c.poly(sp.map(([x, y]) => [x + 1, y + 1]), O); c.poly(sp, null, (x, y) => rampAt(RAMP.yellow, 7.5 - Math.hypot(x - cx + 3, y - cy + 6) / r1 * 3, x, y)); edge(sp, RAMP.gold[2]);
    glow(c, cx, cy - 4 * ck, 26 * ck, 22 * ck, "#FFE070", 0.35 * glowK + 0.4 * win);
    for (let i = 0; i <= 16; i++) { const ang = Math.PI + (Math.PI * i) / 16, [bx2, by2, bk] = P(Math.cos(ang) * 37, 182 - Math.sin(ang) * 27.5, -1.5), ph = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t * (0.8 + 2 * win) + i / 8) + seed * 2), br = clamp01((0.3 + 0.7 * ph) * (0.45 + 0.55 * lights) + win * 0.5);
      c.disc(R(bx2), R(by2), Math.max(1, R(1.4 * bk)), mix("#8A5010", "#FFF8D8", br)); if (br > 0.6) glow(c, bx2, by2, 5 * bk, 5 * bk, "#FFE0A0", 0.3 * br); } }
  // chrome edge strips on the cabinet front corners
  for (const s of [-1, 1]) { const q = [[s * 40, 12, 0.8], [s * 37.5, 12, 0.8], [s * 37.5, 182, 0.8], [s * 40, 182, 0.8]]; quad(q, CH, (x, y, f) => 6.6 - Math.abs(f - 0.3) * 3); }
  // overall glows: window, topper, win flash
  { const [wx, wy, wk] = P(0, 109, 0); glow(c, wx, wy, 44 * wk, 30 * wk, "#FFF4D0", 0.12 * glowK + 0.25 * win); const [tx2, ty2, tk] = P(0, 175, 0); glow(c, tx2, ty2, 60 * tk, 40 * tk, mix(B[6], UI.Y, 0.5), 0.2 * glowK + 0.45 * win * (0.6 + 0.4 * Math.sin(t * 16))); }
  const geo = { win: { x0: P2(-30, 131, 0)[0], y0: P2(-30, 131, 0)[1], x1: P2(30, 88, 0)[0], y1: P2(30, 88, 0)[1] }, reels, screen, spin, stop, k: k0,
    slot: P2(...deckPt(-33.5, 0.52, 0.5)), chute: P2(0, 28, 1), tray: P2(0, 24, 7), chip: P2(-12.5, 41, -20), ticker: tickerRect(P2), top: P2(0, 205, 0), deck: P2(...deckPt(0, 0.5)), lineY, center: P2(0, 110, 0) };
  return geo;
}
const tickerRect = (P2) => { const [ax, ay] = P2(-30, 55.5, -20), [bx, by] = P2(6, 47.5, -20); return { x0: ax, y0: ay, x1: bx, y1: by }; };

function interior(c, V, t, P, P2, quad, rectF, st, cut) {
  const g = fade(c, cut);
  const sub = Object.create(g);
  // back wall, inner sides, floor of the cabinet
  const q = (pts, ramp, lv) => { const pp = pts.map(([u, v, d]) => P2(u, v, d)); let y0 = 1e9, y1 = -1e9; for (const p of pp) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } const f = typeof lv === "function" ? lv : () => lv; g.poly(pp, null, (x, y) => rampAt(ramp, f(x, y, (y - y0) / Math.max(1, y1 - y0)), x, y)); return pp; };
  q([[-38, 63, -55], [38, 63, -55], [38, 13, -55], [-38, 13, -55]], RAMP.black, (x, y, f) => 1.4 + f * 0.6);
  for (const s of [-1, 1]) q([[s * 38, 63, -55], [s * 38, 63, 0], [s * 38, 13, 0], [s * 38, 13, -55]], RAMP.black, 2.4);
  q([[-38, 13, 0], [38, 13, 0], [38, 13, -55], [-38, 13, -55]], RAMP.black, 3.2);
  q([[-38, 63, 0], [38, 63, 0], [38, 63, -55], [-38, 63, -55]], RAMP.black, 0.8);
  for (let u = -30; u <= 30; u += 15) q([[u - 0.6, 62, -54], [u + 0.6, 62, -54], [u + 0.6, 14, -54], [u - 0.6, 14, -54]], RAMP.chrome, 2.2);
  // cables from the logic box up into the deck (to the reel motors)
  const cab = (u0, col, w) => { let prev = null; for (let i = 0; i <= 20; i++) { const s = i / 20, u = lerp(u0, u0 * 0.4 + 12, s), v = lerp(57, 63, s), d = lerp(-28, -45, s * s), p = P2(u + Math.sin(s * 3) * 3, v + Math.sin(s * Math.PI) * 2, d); if (prev) for (let k = 0; k < w; k++) g.line(R(prev[0]), R(prev[1]) + k, R(p[0]), R(p[1]) + k, k ? mix(col, "#000000", 0.4) : col); prev = p; } };
  cab(-24, "#E03040", 2); cab(-16, "#3878E8", 2); cab(-8, "#F0C030", 2);
  // the logic box: steel case with an open front, green board, the chip, gold traces
  q([[-32, 57, -20], [8, 57, -20], [8, 34, -20], [-32, 34, -20]], RAMP.chrome, (x, y, f) => 4.6 - f * 1.6);
  q([[-32, 57, -20], [8, 57, -20], [8, 57, -32], [-32, 57, -32]], RAMP.chrome, 6);
  const pcb = q([[-30, 46.5, -19.5], [6, 46.5, -19.5], [6, 35.5, -19.5], [-30, 35.5, -19.5]], RAMP.felt, (x, y, f) => 3.4 - f * 0.8);
  const [cx, cy, ck] = P(-12, 41, -19);
  for (let i = 0; i < 9; i++) { const ang = (i / 9) * Math.PI * 2 + 0.3, len = (11 + (i % 3) * 3) * ck, ex = cx + Math.cos(ang) * len, ey = cy + Math.sin(ang) * len * 0.62; g.line(R(cx), R(cy), R(ex), R(cy), "#C8A040"); g.line(R(ex), R(cy), R(ex), R(ey), "#C8A040"); g.rect(R(ex) - 1, R(ey) - 1, 2, 2, "#F4D070"); }
  const cw = 7 * ck, chh = 4.6 * ck;
  for (let i = -3; i <= 3; i++) { const x = R(cx + (i / 3.5) * cw * 0.9); g.rect(x, R(cy - chh - 2), Math.max(1, R(ck * 0.6)), 2, "#E8C860"); g.rect(x, R(cy + chh), Math.max(1, R(ck * 0.6)), 2, "#E8C860"); }
  g.rrect(R(cx - cw) - 1, R(cy - chh) - 1, R(cw * 2) + 2, R(chh * 2) + 2, O, 1); g.rrect(R(cx - cw), R(cy - chh), R(cw * 2), R(chh * 2), "#22202C", 1); g.rect(R(cx - cw) + 1, R(cy - chh) + 1, R(cw * 2) - 2, 1, "#4C4A5C");
  const pulse = 0.5 + 0.5 * Math.sin(t * 9); g.disc(R(cx), R(cy), Math.max(1, R(1.3 * ck)), mix("#40C0A0", "#C0FFF0", pulse)); glow(c, cx, cy, 14 * ck, 9 * ck, "#60F0C0", (0.25 + 0.25 * pulse) * cut);
  if (ck > 2) { const w = c.measure(TINY, "RNG"); g.text(TINY, "RNG", R(cx - w / 2), R(cy + chh + 4), "#BCE8C8"); }
  for (const [u, v] of [[-26, 37.5], [-25, 44], [2, 37.5], [3, 44]]) { const [x, y, k] = P(u, v, -19); g.rect(R(x - k), R(y - k * 0.8), Math.max(2, R(2 * k)), Math.max(2, R(1.6 * k)), "#2A2838"); }
  // the ticker frame (digits are drawn by the film on top so they stay bright when the hall dims)
  const tr = tickerRect(P2); g.rrect(R(tr.x0) - 3, R(tr.y0) - 3, R(tr.x1 - tr.x0) + 6, R(tr.y1 - tr.y0) + 6, "#1C3A2A", 2); g.rect(R(tr.x0), R(tr.y0), R(tr.x1 - tr.x0), R(tr.y1 - tr.y0), "#04100A");
  // coin hopper with gold coins
  q([[11, 56, -24], [34, 56, -24], [31, 34, -24], [14, 34, -24]], RAMP.chrome, (x, y, f) => 5.4 - f * 2.4);
  for (let i = 0; i < 22; i++) { const u = 14 + rnd(i * 3) * 17, v = 44 + rnd(i * 7) * 7 + (i % 4), [x, y, k] = P(u, v, -22), w = Math.max(2, R(2.2 * k)); g.ellipse(R(x), R(y) + 1, w, Math.max(1, R(w * 0.45)), RAMP.gold[2]); g.ellipse(R(x), R(y), w, Math.max(1, R(w * 0.45)), RAMP.gold[5 + (i % 2)]); g.px(R(x - w * 0.4), R(y), RAMP.gold[7]); }
  void sub; void quad; void rectF; void st; void V;
}
/** A coin in world space around the machine (u, v, d relative to the front face centre). */
function coin3(c, V, M, cn) {
  if ((cn.a ?? 1) <= 0) return; const g = fade(c, cn.a ?? 1), [x, y, k] = V.P(M.x + cn.u, cn.v, M.z + cn.d), r = Math.max(2, (cn.r ?? 2.6) * k), w = Math.max(1, Math.abs(Math.cos(cn.spin ?? 0)) * r);
  g.ellipse(R(x), R(y) + 1, R(w), R(r * (cn.flat ? 0.45 : 1)), RAMP.gold[2]); g.ellipse(R(x), R(y), R(w), R(r * (cn.flat ? 0.45 : 1)), cn.silver ? RAMP.chrome[6] : RAMP.gold[5]);
  if (w > 3) g.ellipse(R(x), R(y), Math.max(1, R(w * 0.62)), Math.max(1, R(r * 0.62 * (cn.flat ? 0.45 : 1))), cn.silver ? RAMP.chrome[5] : RAMP.gold[4]);
  g.px(R(x - w * 0.4), R(y - r * 0.4 * (cn.flat ? 0.45 : 1)), "#FFFFFF");
  glow(c, x, y, r * 2.2, r * 2.2, cn.silver ? "#E0E8FF" : UI.Y, 0.25 * (cn.a ?? 1));
}
