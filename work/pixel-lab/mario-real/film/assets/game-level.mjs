// mario-real · game-level (new, 2026-10-29, drawn for this film): a flat side-scrolling level «in the spirit of» the 1985
// game, in OUR pixel drawing at the film's resolution (no original tiles or sprites): bright sky, parallax hills and puffy
// clouds, round bushes, a two-row ground of bevelled earth blocks, brick blocks with mortar, gold «?» blocks with rivets
// (bump + crossfade to a used block), green pipes with rim and highlight stripes, a spinning coin with sparkles.
// Units: blocks (1 block = 0.775 m). cam = { x (block at screen x 270), gy (screen row of the ground top), B (px / block) }.
// opts.clip = { x0, y0, x1, y1 } limits drawing to a screen rect (the «game window» inset). Pure functions of (cam, t, opts).
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, clamp01, rnd, h2, BY } from "../lib/cam.mjs";

const G = {
  sky: RG(["#5A8CF4", "#6E9EFA", "#84B0FF", "#A2C6FF", "#C2DAFF"]), cloud: RG(["#8EA8E8", "#C6D6F8", "#EEF4FF", "#FFFFFF"]), cloudO: hex("#3A4E9A"),
  hill: RG(["#1E6A2E", "#2E8A3A", "#46A648", "#6CC25A"]), hillO: hex("#123E1C"), bush: RG(["#1E7A2A", "#34A03A", "#5AC24C", "#8AE070"]),
  earth: RG(["#5A2410", "#8A3A16", "#BC5A22", "#E07E36", "#F6A45A"]), earthO: hex("#2A0E06"),
  brick: RG(["#5A1E0E", "#8E3418", "#C24E22", "#E06C34", "#F49058"]), mortar: hex("#2A0C06"),
  q: RG(["#7A4A00", "#C27E00", "#F2A80E", "#FFCC3A", "#FFE88A"]), qO: hex("#3A1E00"), used: RG(["#4A2A1A", "#6E4028", "#8E5A38", "#AE7650"]),
  pipe: RG(["#0E4A1A", "#1A7A28", "#2EA838", "#62D05A", "#B2F096"]), pipeO: hex("#082C0E"),
  coin: RG(["#7A4A00", "#D29400", "#FFCC2A", "#FFF09A"]), spark: hex("#FFFFFF"),
};
export { G as GAME };

/** a canvas view that only writes inside clip */
export function clipView(c, clip) {
  if (!clip) return c; const o = Object.create(c);
  o.px = (x, y, col) => { if (x >= clip.x0 && x < clip.x1 && y >= clip.y0 && y < clip.y1) c.px(x, y, col); };
  return o;
}
const inClip = (clip, x, y) => !clip || (x >= clip.x0 && x < clip.x1 && y >= clip.y0 && y < clip.y1);

/** default level (blocks): pipes, block rows, bushes; the film adds the portal and Mario itself */
export const LEVEL = {
  pipes: [[1.3, 2.7, 1.6]],
  bricks: [[6.12, 3.4], [8.12, 3.4], [12.6, 3.4], [14.6, 3.4]],
  qs: [[7.12, 3.4, "q1"], [13.6, 3.4, "q2"]],
  bushes: [[4.4, 1.5], [10.2, 2.4], [16.4, 1.6], [21.5, 2]],
  hills: [[-2, 5, 1.7], [9, 7, 2.4], [20, 6, 1.6], [28, 8, 2.6]],
  clouds: [[0.5, 6.6, 1.6], [6.5, 7.6, 2.4], [13, 6.9, 1.8], [19, 7.8, 2.6], [25, 6.8, 1.6]],
};

/** screen helpers */
export const gx = (cam, x) => 270 + (x - cam.x) * cam.B, gyy = (cam, y) => cam.gy - y * cam.B;

/** draw the level background + tiles. opts: { level, clip, bump: {id: k 0..1}, usedK: {id: 0..1}, coin: [{x, y, spin, a}] } */
export function drawLevel(c, cam, t, opts = {}) {
  const L = opts.level ?? LEVEL, clip = opts.clip, B = cam.B;
  const X0 = clip ? clip.x0 : 0, X1 = clip ? clip.x1 : c.w, Y0 = clip ? clip.y0 : 0, Y1 = clip ? clip.y1 : c.h;
  // sky: vertical gradient by height above the ground (brighter toward the horizon)
  for (let y = Y0; y < Y1; y++) { const hb = (cam.gy - y) / B, v = 0.9 - clamp01(hb / 9) * 0.75; for (let x = X0; x < X1; x++) put(c, x, y, pk(G.sky, v, x, y)); }
  // far hills (parallax 0.5) and clouds (parallax 0.3)
  for (const [hx, w, hh] of L.hills) { const cx = 270 + (hx - cam.x * 0.5) * B * 0.5 * 2 - (cam.x * 0.5 - cam.x * 0.5), pxc = 270 + (hx - cam.x) * B * 0.5 + (cam.x - cam.x) , rx = (w / 2) * B * 0.62, ry = hh * B * 0.62, base = cam.gy;
    const cxs = 270 + (hx - cam.x * 0.5) * B * 0.62;
    for (let y = Math.max(Y0, Math.floor(base - ry)); y < Math.min(Y1, base); y++) for (let x = Math.max(X0, Math.floor(cxs - rx)); x < Math.min(X1, Math.ceil(cxs + rx)); x++) {
      const u = (x + 0.5 - cxs) / rx, v = (base - y - 0.5) / ry, q = u * u + v * v; if (q > 1) continue;
      const edge = q > 1 - 3 / ry; const stripe = Math.sin((u * 2.2 + v) * 6) > 0.85 && v < 0.85; put(c, x, y, edge ? G.hillO : pk(G.hill, 0.75 - 0.35 * u - (stripe ? 0.3 : 0), x, y)); } void cx; void pxc; }
  for (const [cxw, cyb, w] of L.clouds) { const cx = 270 + (cxw - cam.x * 0.3) * B * 0.9, cy = cam.gy - cyb * B * 0.62, r = w * B * 0.22; puff(c, cx, cy, r, clip); }
  // bushes on the ground line
  for (const [bx, w] of L.bushes) { const cx = gx(cam, bx + w / 2), r = (w / 2) * B; puffBush(c, cx, cam.gy, r, w, clip); }
  // ground: two rows of earth blocks (top row flush with gy)
  for (let row = 0; row < 3; row++) { const ya = cam.gy + row * B; if (ya > Y1) break;
    const i0 = Math.floor(cam.x - 270 / B) - 1, i1 = Math.ceil(cam.x + 270 / B) + 1;
    for (let i = i0; i <= i1; i++) earth(c, gx(cam, i), ya, B, i, row, clip); }
  // pipes
  for (const [a, b, h] of L.pipes) pipe(c, cam, a, b, h, clip);
  // bricks and ? blocks
  for (const [bx, by] of L.bricks) brick(c, gx(cam, bx), gyy(cam, by + 1), B, clip);
  for (const [bx, by, id] of L.qs) { const k = opts.bump?.[id] ?? 0, lift = Math.sin(Math.PI * clamp01(k)) * 0.22 * B, used = opts.usedK?.[id] ?? 0;
    qblock(c, gx(cam, bx), gyy(cam, by + 1) - lift, B, t, used, clip); }
  for (const cn of opts.coins ?? []) coin(c, gx(cam, cn.x), gyy(cam, cn.y), B, cn.spin, cn.a ?? 1, clip);
  if (opts.stack) for (const [bx, by, a] of opts.stack) { if (a >= 1) brick(c, gx(cam, bx), gyy(cam, by + 1), B, clip); else { const f = Object.create(c); f.__a = a; brick(fadeView(c, a), gx(cam, bx), gyy(cam, by + 1), B, clip); } }
}
const fadeView = (c, a) => { const o = Object.create(c); o.__put = true; o.d = c.d; o.px = (x, y, col) => { if (a > BY[(y & 3) * 4 + (x & 3)]) c.px(x, y, col); }; o.__fade = a; return o; };
function P(c, x, y, col, clip) { if (!inClip(clip, x, y)) return; if (c.__fade !== undefined) { if (c.__fade > BY[(y & 3) * 4 + (x & 3)]) put(c, x, y, col); } else put(c, x, y, col); }

function puff(c, cx, cy, r, clip) {
  const lobes = [[-1.1, 0.25, 0.7], [-0.45, -0.25, 0.95], [0.4, -0.15, 0.85], [1.1, 0.25, 0.65], [0, 0.3, 0.9]];
  const x0 = Math.floor(cx - r * 2), x1 = Math.ceil(cx + r * 2), y0 = Math.floor(cy - r * 1.4), y1 = Math.ceil(cy + r * 1.0);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { if (!inClip(clip, x, y)) continue;
    let best = 9, top = 0; for (const [lx, ly, lr] of lobes) { const d = Math.hypot(x + 0.5 - (cx + lx * r), y + 0.5 - (cy + ly * r)) / (lr * r); if (d < best) { best = d; top = (y + 0.5 - (cy + ly * r)) / (lr * r); } }
    if (y + 0.5 > cy + r * 0.62) continue;
    if (best < 1) put(c, x, y, best > 1 - 2.2 / r ? G.cloudO : pk(G.cloud, 0.9 - 0.45 * clamp01(top + 0.4) - (y > cy + r * 0.35 ? 0.3 : 0), x, y)); }
}
function puffBush(c, cx, base, r, w, clip) {
  const n = Math.max(2, Math.round(w * 1.4)), lobes = []; for (let i = 0; i < n; i++) lobes.push([((i + 0.5) / n - 0.5) * 1.6, i % 2 ? 0.55 : 0.75]);
  for (let y = Math.floor(base - r * 1.0); y < base; y++) for (let x = Math.floor(cx - r * 1.2); x < Math.ceil(cx + r * 1.2); x++) { if (!inClip(clip, x, y)) continue;
    let best = 9, tp = 0; for (const [lx, lr] of lobes) { const d = Math.hypot(x + 0.5 - (cx + lx * r), (y + 0.5 - base) * 1.0) / (lr * r); if (d < best) { best = d; tp = (y + 0.5 - base) / (lr * r); } }
    if (best < 1) put(c, x, y, best > 1 - 2.5 / r ? G.hillO : pk(G.bush, 0.95 + tp * 0.7, x, y)); }
}
function earth(c, x0, y0, B, i, row, clip) {
  const s = B / 16;
  for (let y = Math.floor(y0); y < Math.floor(y0 + B); y++) for (let x = Math.floor(x0); x < Math.floor(x0 + B); x++) { if (!inClip(clip, x, y)) continue;
    const u = (x - x0) / B, v = (y - y0) / B;
    if (u < 1 / B * 1.5 || v < 1 / B * 1.5) { put(c, x, y, G.earthO); continue; }
    // bevel: light top-left, dark bottom-right; a pebble crack pattern
    const bev = u < 0.08 || v < 0.08 ? 0.92 : u > 0.9 || v > 0.9 ? 0.18 : 0.6;
    const crack = (Math.abs(((u * 3 + Math.floor(v * 2) * 0.5 + (i % 3) * 0.2) % 1) - 0.5) < 0.03 && v > 0.15 && v < 0.85) || (Math.abs(v - 0.5) < 0.025 && u > 0.1 && u < 0.9);
    put(c, x, y, crack ? G.earth[0] : pk(G.earth, bev - (row ? 0.05 : 0) + 0.06 * (h2(Math.floor(u * 8), Math.floor(v * 8), i + row * 99) - 0.5), x, y)); void s; }
}
function brick(c, x0, y0, B, clip) {
  for (let y = Math.floor(y0); y < Math.floor(y0 + B); y++) for (let x = Math.floor(x0); x < Math.floor(x0 + B); x++) {
    const u = (x - x0) / B, v = (y - y0) / B, row = Math.floor(v * 4), bx = (u * 2 + (row % 2) * 0.5) % 1, by = (v * 4) % 1;
    if (u < 1.5 / B || v < 1.5 / B || u > 1 - 1.5 / B || v > 1 - 1.5 / B) { P(c, x, y, G.mortar, clip); continue; }
    if (bx < 0.05 || by < 0.12) { P(c, x, y, G.mortar, clip); continue; }
    P(c, x, y, pk(G.brick, by < 0.3 ? 0.85 : bx > 0.9 ? 0.3 : 0.58 - by * 0.15, x, y), clip);
  }
}
/** a «?» block: bevelled gold with four rivets and a fat pixel question mark that shimmers; used → brown crossfade */
const QM = ["..####..", ".##..##.", ".##..##.", ".....##.", "....##..", "...##...", "...##...", "........", "...##...", "...##..."];
function qblock(c, x0, y0, B, t, used, clip) {
  const sh = 0.08 * Math.sin(t * 5);
  for (let y = Math.floor(y0); y < Math.floor(y0 + B); y++) for (let x = Math.floor(x0); x < Math.floor(x0 + B); x++) {
    const u = (x - x0) / B, v = (y - y0) / B;
    const useUsed = used > 0 && used > BY[(y & 3) * 4 + (x & 3)];
    if (u < 1.5 / B || v < 1.5 / B || u > 1 - 1.5 / B || v > 1 - 1.5 / B) { P(c, x, y, G.qO, clip); continue; }
    const riv = [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].some(([a, b]) => Math.hypot(u - a, v - b) < 0.045);
    const bev = u < 0.07 || v < 0.07 ? 0.95 : u > 0.93 || v > 0.93 ? 0.15 : 0.62;
    if (useUsed) { P(c, x, y, riv ? G.used[0] : pk(G.used, bev - 0.1, x, y), clip); continue; }
    if (riv) { P(c, x, y, G.qO, clip); continue; }
    const gi = Math.floor((u - 0.2) / 0.6 * 8), gj = Math.floor((v - 0.14) / 0.72 * 10);
    const inQ = gi >= 0 && gi < 8 && gj >= 0 && gj < 10 && QM[gj][gi] === "#", inQs = (() => { const gi2 = Math.floor((u - 0.2 - 0.04) / 0.6 * 8), gj2 = Math.floor((v - 0.14 - 0.04) / 0.72 * 10); return gi2 >= 0 && gi2 < 8 && gj2 >= 0 && gj2 < 10 && QM[gj2][gi2] === "#"; })();
    if (inQ) { P(c, x, y, pk(G.q, 0.98, x, y), clip); continue; }
    if (inQs) { P(c, x, y, G.q[0], clip); continue; }
    P(c, x, y, pk(G.q, bev + sh, x, y), clip);
  }
}
function pipe(c, cam, a, b, h, clip) {
  const B = cam.B, xa = gx(cam, a), xb = gx(cam, b), yTop = gyy(cam, h), lipH = 0.42 * B, lip = 0.14 * B;
  const draw = (X0, X1, Y0, Y1) => { for (let y = Math.floor(Y0); y < Math.floor(Y1); y++) for (let x = Math.floor(X0); x < Math.floor(X1); x++) { if (!inClip(clip, x, y)) continue;
    const u = (x - X0) / (X1 - X0); if (x - X0 < 2 || X1 - x <= 2 || y - Y0 < 2) { put(c, x, y, G.pipeO); continue; }
    const v = u < 0.12 ? 0.62 : u < 0.22 ? 0.98 : u < 0.3 ? 0.78 : u < 0.62 ? 0.6 : u < 0.72 ? 0.42 : 0.2; put(c, x, y, pk(G.pipe, v, x, y)); } };
  draw(xa + lip, xb - lip, yTop + lipH - 2, cam.gy); draw(xa, xb, yTop, yTop + lipH);
}
/** a spinning coin (spin = phase in turns), centred at (x, y) */
export function coin(c, x, y, B, spin, a = 1, clip) {
  const rx = Math.max(1, Math.abs(Math.cos(spin * Math.PI * 2)) * 0.3 * B), ry = 0.42 * B;
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx) - 1; i <= Math.ceil(rx) + 1; i++) { const X = R(x + i), Y = R(y + j); if (!inClip(clip, X, Y) || (a < 1 && a <= BY[(Y & 3) * 4 + (X & 3)])) continue;
    const q = (i / (rx + 1)) ** 2 + (j / (ry + 1)) ** 2; if (q > 1) continue; const edge = q > 0.72; put(c, X, Y, edge ? G.coin[0] : pk(G.coin, 0.75 - i / (rx + 1) * 0.5 - j / ry * 0.2 + (Math.abs(i) < rx * 0.2 && Math.abs(j) < ry * 0.55 ? 0.3 : 0), X, Y)); }
}
export { brick as drawBrick, qblock as drawQ };
