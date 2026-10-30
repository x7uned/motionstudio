// The cute blue whale shared by both films of the series (identical file in animals-weight/film/levels and
// animals-heart/film/levels): a huge chibi blue whale facing the camera, head up, body hanging below it (len 1 = the
// whole long body; a smaller len foreshortens it so the flukes show, as when it glides toward the camera).
// Mottled blue-grey skin, pale throat grooves under a long smiling jaw line, two blowholes, big calm eyes with two
// highlights, dithered blush, small flippers. The body is rendered once per (len) into a cached sprite; flippers are
// cached per quantised angle; eyes, blush and the glowing heart are drawn per frame. Pure functions of their inputs.
import { Canvas, hex } from "../../../../../renderer/pixel/raster.mjs";
import { blob, ell, tube, bez, eye, blush, smooth, fade, mix, bayer, rnd, clamp01, lerp } from "../cute.mjs";

const R = Math.round;
export const WHALE = ["#08101E", "#111D33", "#1B2C4A", "#263E62", "#33537C", "#456C98", "#5E88B2", "#86A8CA"];
export const THROAT = ["#1A283E", "#2A3E5A", "#3C5676", "#516E92", "#6A88AC", "#88A4C4", "#AAC0D8", "#D0DEEC"];
export const NAVY = ["#04060E", "#0A1024", "#142042", "#1E3262", "#2A4884", "#3C62A4", "#5A84C4", "#86AEE0"];
export const HEART = ["#3A0614", "#6A0C22", "#9E1430", "#D02A44", "#F04A5C", "#FF7A84", "#FFB0B4", "#FFE4E4"];
const LIT = "#A9C6E6";                      // moon/sun rim light on the outline
const SPOT = "#9DB8D4";                     // pale mottling

// ---------------------------------------------------------------- tiny sprite system (mask + colours), cached
class Sprite {
  constructor(w, h, ox, oy) {
    this.w = w; this.h = h; this.ox = ox; this.oy = oy;
    const c = new Canvas(w, h, "#000000"), m = new Uint8Array(w * h), base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    this.c = c; this.m = m;
  }
}
/**
 * Copy a sprite with its anchor at screen (x, y). o.a dissolves (Bayer), o.below = screen row from which the sprite looks
 * submerged: rows ≥ below are pulled toward o.tint by o.k(row) and shifted sideways by o.wob(row) px (refraction wobble).
 * o.haze (+ o.hazeCol) tints every row a little (deep-water haze).
 */
export function blitSprite(c, S, x, y, o = {}) {
  const sx = R(x - S.ox), sy = R(y - S.oy), a = o.a ?? 1; if (a <= 0) return;
  const W = S.w, s = S.c.d, m = S.m, d = c.d, CW = c.w, CH = c.h;
  const below = o.below ?? 1e9, tint = o.tint ? hex(o.tint) : null, kf = o.k, wob = o.wob, haze = o.haze ?? 0, hz = haze > 0 ? hex(o.hazeCol ?? "#1A4A7A") : null;
  const ya = Math.max(0, sy), yb = Math.min(CH, sy + S.h);
  for (let y = ya; y < yb; y++) {
    const sub = y >= below, k = sub && tint ? kf(y) : 0, dx = sub && wob ? wob(y) : 0, row = (y - sy) * W;
    const xa = Math.max(0, sx + dx), xb = Math.min(CW, sx + dx + W);
    for (let X = xa; X < xb; X++) {
      const li = row + (X - sx - dx); if (!m[li]) continue;
      if (a < 1 && a <= bayer(X, y)) continue;
      const q = li * 3, p = (y * CW + X) * 3; let r = s[q], g = s[q + 1], b = s[q + 2];
      if (haze > 0) { r += (hz[0] - r) * haze; g += (hz[1] - g) * haze; b += (hz[2] - b) * haze; }
      if (k > 0) { r += (tint[0] - r) * k; g += (tint[1] - g) * k; b += (tint[2] - b) * k; }
      d[p] = r; d[p + 1] = g; d[p + 2] = b;
    }
  }
}

// ---------------------------------------------------------------- geometry (local units: head centre = (0, 0), y down)
/** Local y of a body station: the head (y ≤ 60) keeps its size, the rest of the body is foreshortened by len. */
const LY = (y, len) => (y <= 60 ? y : 60 + (y - 60) * len);
// right half of the silhouette (x, unscaled y): a broad, slightly flat-topped head flowing into the long tapering body
const OUTLINE = [[0, -108], [44, -104], [78, -93], [102, -73], [116, -45], [121, -12], [120, 22], [117, 54], [119, 96], [125, 150], [126, 204],
  [119, 264], [101, 342], [78, 420], [54, 490], [33, 540], [22, 566], [0, 582]];
/** Where the heart sits (local, for a given len): low in the chest, behind the flippers. */
export const heartLocal = (len, s = 1) => [0, LY(160, len) * s];
/** Where the blowholes are (local). */
export const BLOWHOLE = [0, -104];

function bodyPoly(len) {
  const right = OUTLINE.map(([x, y]) => [x, LY(y, len)]), left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y]);
  return smooth([...right, ...left], new Set(), 4);
}
// the jaw line: from under one eye, down under the chin, up to the other (local, head part: not foreshortened)
const JAW = bez([-110, 26], [0, 102], [110, 26], 64);
/** Pale throat / belly region: under the jaw line, narrowing toward the tail. */
const THROAT_SIDE = [[106, 40], [103, 92], [98, 152], [86, 240], [68, 330], [46, 420], [23, 490], [0, 512]];
function throatPoly(len) {
  const top = JAW.filter((_, i) => i % 4 === 0).map(([x, y]) => [x, y + 1]);
  const right = THROAT_SIDE.map(([x, y]) => [x, LY(y, len)]), left = right.slice(0, -1).reverse().map(([x, y]) => [-x, y]);
  return smooth([...top, ...right, ...left], new Set(), 3);
}
const throatHalf = (yl, len) => { // half-width of the throat at local y (for the groove spacing)
  const k = THROAT_SIDE.map(([x, y]) => [LY(y, len), x]);
  if (yl <= k[0][0]) return k[0][1]; for (let i = 0; i < k.length - 1; i++) if (yl <= k[i + 1][0]) { const u = (yl - k[i][0]) / (k[i + 1][0] - k[i][0]); return lerp(k[i][1], k[i + 1][1], u); }
  return 2;
};
function flukePoly(len) {
  const yT = LY(566, len), s = 0.9 + 0.1 * len;
  const pts = [[0, -6], [22, 2], [52, 4], [92, 0], [128, -10], [140, -6], [128, 10], [98, 24], [62, 32], [30, 30], [10, 26], [0, 18]];
  const right = pts.map(([x, y]) => [x * s, yT + 8 + y]), left = right.slice(1, -1).reverse().map(([x, y]) => [-x, y]);
  return smooth([...right, ...left], new Set([0, pts.length - 1]), 3);
}

const BODY = new Map();
/** Cached body sprite (fluke, body, throat grooves, jaw line, blowholes, mottling) for a foreshortening len and scale sc. */
export function bodySprite(len = 1, sc = 1) {
  const key = `${R(len * 100)}|${R(sc * 100)}`; let S = BODY.get(key); if (S) return S;
  const top = R(132 * sc), bottom = R((LY(566, len) + 70) * sc), W = R(300 * sc);
  S = new Sprite(W * 2, R(top + bottom), W, top);
  const g = S.c, T = (pts) => pts.map(([x, y]) => [x * sc + W, y * sc + top]), Q = (v) => v * sc;
  // flukes behind the body (only when the tail is in reach)
  blob(g, [T(flukePoly(len))], { ramp: WHALE, thick: Q(10), base: 2.9, gain: 2.0, litOutline: LIT });
  // the body: one soft pillow from the dome of the head down to the tail stock
  blob(g, [T(bodyPoly(len))], { ramp: WHALE, thick: Q(46), base: 2.3, gain: 3.0, slope: 0.9, litOutline: LIT, rimLit: 0.9 });
  // pale throat and belly with the ventral grooves (soft pleats converging toward the tail)
  blob(g, [T(throatPoly(len))], { ramp: THROAT, thick: Q(26), base: 2.7, gain: 2.0, slope: 0.7, outline: WHALE[2], rimLit: 0.5, rimShade: 0.5 });
  const cols = new Map(THROAT.map((c, i) => [hex(c).join(","), i]));
  for (let Y = R(top + Q(44)); Y < R(top + Q(LY(500, len))); Y++) {
    const hw = throatHalf((Y - top) / sc, len) * sc;
    for (let lx = -R(hw); lx <= R(hw); lx++) {
      const X = lx + W, i = Y * S.w + X; if (!S.m[i]) continue;
      const p = i * 3, ci = cols.get(`${g.d[p]},${g.d[p + 1]},${g.d[p + 2]}`); if (ci === undefined) continue;
      const u = (lx / hw + 1) * 6.5, f = u - Math.floor(u);
      if (f < 0.1) g.px(X, Y, THROAT[Math.max(1, ci - 1)]);                                 // groove
      else if (f < 0.2 && bayer(X, Y) < 0.6) g.px(X, Y, THROAT[Math.min(7, ci + 1)]);       // lit ridge beside it
    }
  }
  // the long smiling jaw line (from under one eye, down under the chin, up to the other), corners turned up
  for (const [x, y] of JAW) { g.px(R(Q(x)) + W, R(Q(y)) + top, WHALE[0]); g.px(R(Q(x)) + W, R(Q(y)) + top + 1, WHALE[1]); }
  for (const sd of [-1, 1]) for (const [dx, dy] of [[1, -1], [2, -2], [2, -3], [3, -4]]) g.px(W + sd * (R(Q(110)) + dx), top + R(Q(26)) + dy, WHALE[0]);
  // blowholes: a raised splash guard with two nostril slits
  blob(g, [T(ell(0, -98, 24, 9))], { ramp: WHALE, thick: Q(6), base: 3.7, gain: 1.4, outline: WHALE[2] });
  for (const sd of [-1, 1]) for (let k = 0; k < R(Q(6)); k++) { const yb = top - R(Q(102)) + (k > Q(3.5) ? 1 : 0); g.px(W + sd * (R(Q(3)) + k), yb, WHALE[0]); g.px(W + sd * (R(Q(3)) + k), yb + 1, WHALE[1]); }
  // mottling: pale dappled spots over the blue-grey back (not on the throat, not on the outline, sparse around the eyes)
  const ramp = new Map(WHALE.map((c, i) => [hex(c).join(","), i]));
  for (let n = 0; n < 300; n++) {
    const ux = (rnd(n * 7 + 1) - 0.5) * 236, uy = -112 + rnd(n * 7 + 2) * (LY(560, len) + 112), r = Math.max(1, (1.2 + rnd(n * 7 + 3) * 3.0) * sc), light = rnd(n * 7 + 4) < 0.74;
    if (Math.hypot(Math.abs(ux) - 46, (uy - 4) * 1.1) < 30) continue;
    if (uy > -60 && uy < 40 && Math.abs(ux) < 90 && rnd(n * 7 + 5) < 0.55) continue;
    const lx = ux * sc, ly = uy * sc;
    for (let yy = R(ly - r); yy <= R(ly + r); yy++) for (let xx = R(lx - r * 1.4); xx <= R(lx + r * 1.4); xx++) {
      if (((xx - lx) / (r * 1.4)) ** 2 + ((yy - ly) / r) ** 2 > 1) continue;
      const X = xx + W, Y = yy + top, i = Y * S.w + X; if (X < 0 || Y < 0 || X >= S.w || Y >= S.h || !S.m[i]) continue;
      const p = i * 3, ci = ramp.get(`${g.d[p]},${g.d[p + 1]},${g.d[p + 2]}`); if (ci === undefined || ci < 2) continue;
      if (light) { if (((xx + yy) & 1) === 0 || r > 2.6) g.px(X, Y, ci >= 5 ? SPOT : WHALE[Math.min(7, ci + 1)]); }
      else g.px(X, Y, WHALE[ci - 1]);
    }
  }
  BODY.set(key, S); return S;
}

const FLIP = new Map();
/** Cached flipper sprite (side ±1, angle step q): a slender flipper with a pale leading edge; anchor = its root. */
function flipperSprite(side, q, sc = 1) {
  const key = `${side}|${q}|${R(sc * 100)}`; let S = FLIP.get(key); if (S) return S;
  S = new Sprite(220, 220, 110, 110);
  const ang = q * 0.035, cs = Math.cos(ang), sn = Math.sin(ang);
  const P = (x, y) => { const X = x * side * sc, Y = y * sc; return [110 + X * cs - Y * sn * side, 110 + X * sn * side + Y * cs]; };
  const path = [P(0, 0), P(34, 22), P(64, 52), P(84, 84)];
  blob(S.c, [tube(path, 17 * sc, 7 * sc)], { ramp: WHALE, thick: 9 * sc, base: 3.0, gain: 2.0, litOutline: LIT });
  const edge = [P(6, 8), P(36, 28), P(62, 56), P(78, 82)];   // pale underside along the trailing edge
  for (let i = 0; i < edge.length - 1; i++) { const [ax, ay] = edge[i], [bx, by] = edge[i + 1], n = R(Math.hypot(bx - ax, by - ay)); for (let k = 0; k <= n; k++) { const x = R(ax + ((bx - ax) * k) / n), y = R(ay + ((by - ay) * k) / n); if (S.m[y * 220 + x]) S.c.px(x, y, THROAT[5]); } }
  FLIP.set(key, S); return S;
}

// ---------------------------------------------------------------- heart
/** Pixel heart of half-width r at (x, y) (centre of the lobes' line), volume-shaded, with an optional soft glow halo. */
export function drawHeart(c, x, y, r, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return; const glow = o.glow ?? 0, g = fade(c, a);
  if (glow > 0) {
    const gr = r * (1.9 + glow * 0.9), col = o.glowCol ?? "#FF7A8A";
    for (let Y = R(y - gr); Y <= R(y + gr * 1.1); Y++) for (let X = R(x - gr); X <= R(x + gr); X++) {
      const d = Math.hypot(X - x, (Y - y - r * 0.2) * 1.05) / gr; if (d >= 1) continue;
      const k = (1 - d) ** 1.4 * glow * a * 0.95; if (k > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), col, 0.45 + 0.3 * (1 - d)));
    }
  }
  const lobe = r * 0.55, polys = [ell(x - r * 0.47, y - r * 0.05, lobe, lobe * 0.95), ell(x + r * 0.47, y - r * 0.05, lobe, lobe * 0.95), [[x - r * 0.98, y + r * 0.1], [x + r * 0.98, y + r * 0.1], [x, y + r * 1.05]]];
  blob(g, polys, { ramp: o.ramp ?? HEART, thick: Math.max(3, r * 0.5), base: 3.3 + (o.bright ?? 0) * 1.5, gain: 2.0, outline: o.outline ?? "#2A0410", litOutline: o.lit ?? null });
  const hl = Math.max(1, R(r * 0.16)); g.rect(R(x - r * 0.6), R(y - r * 0.32), hl, hl, "#FFF4F4"); if (r > 9) g.px(R(x - r * 0.6) + hl, R(y - r * 0.32) - 1, "#FFD8DC");
}

// ---------------------------------------------------------------- the whale
/**
 * Draw the whale with its head centre at screen (x, y).
 * o.s scale (1 = full size), o.len foreshortening (1 = whole body hanging below), o.a dissolve, o.blink 0..1, o.look [dx, dy], o.lid 0..1 calm half-lid,
 * o.happy 0..1 closes the eyes into happy "^" arcs, o.flip flipper swing (−1..1), o.below/o.tint/o.k/o.wob underwater look (see blitSprite), o.haze/o.hazeCol deep haze,
 * o.heart {a, glow, beat, r} glowing heart seen through the chest, o.face false to skip the face (silhouette uses).
 */
export function drawWhale(c, x, y, o = {}) {
  const len = o.len ?? 1, a = o.a ?? 1, s = o.s ?? 1; if (a <= 0) return;
  const look = o.look ?? [0, 0], lid = o.lid ?? 0, blink = Math.max(lid, o.blink ?? 0);
  const sub = { below: o.below, tint: o.tint, k: o.k, wob: o.wob, haze: o.haze, hazeCol: o.hazeCol, a };
  // flippers behind the body sides, swinging slowly
  const fs = o.flip ?? 0;
  for (const sd of [-1, 1]) { const q = Math.max(-8, Math.min(8, R(fs * 8 * sd))), F = flipperSprite(sd, q, s); blitSprite(c, F, x + sd * 100 * s, y + LY(150, len) * s, sub); }
  blitSprite(c, bodySprite(len, s), x, y, sub);
  // heart glowing through the chest
  if (o.heart && (o.heart.a ?? 1) > 0) {
    const [hx, hy] = heartLocal(len, s), H = o.heart, beat = H.beat ?? 0, r = (H.r ?? 15) * s * (1 + 0.16 * beat);
    drawHeart(c, x + hx, y + hy, r, { a: (H.a ?? 1) * a, glow: Math.min(1.2, (H.glow ?? 0.6) + beat * 0.6), bright: beat });
  }
  if (o.face === false) return;
  // face: big calm eyes, blush
  const happy = o.happy ?? 0, g = fade(c, a), eo = { iris: NAVY, pupil: "round", ry: 20 * s, look, blink: Math.max(blink, Math.min(1, happy * 2)), lid: WHALE[3], a };
  if (happy <= 0.5) for (const sd of [-1, 1]) eye(c, x + sd * 47 * s, y + 2 * s, 18 * s, eo);
  else for (const sd of [-1, 1]) {                       // happy closed eyes: soft "^" arcs
    const ex = x + sd * 47 * s, ey = y + 6 * s, w = 15 * s;
    for (let k = -w; k <= w; k++) { const u = k / w, yy = R(ey - 7 * s * (1 - u * u)); g.px(R(ex + k), yy, "#07060E"); g.px(R(ex + k), yy + 1, "#07060E"); if (Math.abs(u) < 0.8) g.px(R(ex + k), yy - 1, WHALE[6]); }
  }
  for (const sd of [-1, 1]) blush(c, x + sd * 80 * s, y + 28 * s, 13 * s, Math.max(3, 5 * s), "#F27A9A", a);
  // a tiny highlight on the top of the head (wet sheen)
  for (let k = -14; k <= 10; k++) { const yy = R(y + (-96 - Math.sqrt(Math.max(0, 1 - (k / 18) ** 2)) * 4 + 6) * s); if ((k & 3) !== 3) g.px(R(x + (-40 + k) * s), yy, WHALE[7]); }
}
export { Sprite };
