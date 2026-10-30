// Our own pixel ducks and hunting dog (not sprites from any game): drawn from parts in world units each frame, so the
// wing beat is continuous and zooms stay crisp. Parts go into an offscreen mask, get a one-pixel dark outline, and are
// copied with a dither alpha. A duck can also be drawn as a plain white box (the hit box the game flashes).
import { bayer, hex } from "./lib/raster.mjs";

export const DUCK_PAL = {
  green: { head: "#1E9E5A", headHi: "#56D88A", body: "#8A6A4E", bodyHi: "#B8946A", belly: "#C4AE88", wing: "#5A4636", wingHi: "#9C8064", tail: "#2A2230", beak: "#F4C23A", ring: "#FFFFFF" },
  blue: { head: "#2A6ED8", headHi: "#7AB0FF", body: "#6A4E7A", bodyHi: "#9A78A8", belly: "#B8A0BC", wing: "#3E2E52", wingHi: "#7A6292", tail: "#1E1A2E", beak: "#F4A23A", ring: "#FFFFFF" },
  red: { head: "#C83A2A", headHi: "#FF7A5A", body: "#7A5A3E", bodyHi: "#AA8A62", belly: "#C8B08C", wing: "#4E3A2A", wingHi: "#8E6E50", tail: "#2A1E1E", beak: "#F4C23A", ring: "#FFFFFF" },
};
const INK = "#120A10";

function painter(c, V, bx0w, by0w, ww, hh) {
  const bx0 = Math.floor(V.X(bx0w)), by0 = Math.floor(V.Y(by0w)), bw = Math.ceil(ww * V.z) + 3, bh = Math.ceil(hh * V.z) + 3;
  const mask = new Int16Array(bw * bh).fill(-1), cols = [];
  const id = (col) => { let i = cols.indexOf(col); if (i < 0) { cols.push(col); i = cols.length - 1; } return i; };
  const fillPoly = (pts, col) => { const k = id(col), s = pts.map(([x, y]) => [V.X(x) - bx0, V.Y(y) - by0]); let y0 = Infinity, y1 = -Infinity; for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let Y = Math.max(0, Math.ceil(y0 - 0.5)); Y <= Math.min(bh - 1, Math.floor(y1 - 0.5)); Y++) { const yc = Y + 0.5, xs = []; for (let i = 0; i < s.length; i++) { const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((p, q) => p - q);
      for (let j = 0; j + 1 < xs.length; j += 2) for (let X = Math.max(0, Math.ceil(xs[j] - 0.5)); X <= Math.min(bw - 1, Math.floor(xs[j + 1] - 0.5)); X++) mask[Y * bw + X] = k; } };
  const ell = (x, y, rx, ry, col, rot = 0) => { const pts = []; for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, u = Math.cos(a) * rx, v = Math.sin(a) * ry; pts.push([x + u * Math.cos(rot) - v * Math.sin(rot), y + u * Math.sin(rot) + v * Math.cos(rot)]); } fillPoly(pts, col); };
  function flush(alpha = 1, outline = true, clip = null) {
    const ink = hex(INK), cc = cols.map(hex);
    for (let Y = 0; Y < bh; Y++) for (let X = 0; X < bw; X++) { const sx = bx0 + X, sy = by0 + Y; if (sx < 0 || sy < 0 || sx >= c.w || sy >= c.h) continue; if (clip && (sx < clip[0] || sy < clip[1] || sx >= clip[2] || sy >= clip[3])) continue; if (alpha < 1 && alpha <= bayer(sx, sy)) continue;
      const m = mask[Y * bw + X]; if (m >= 0) { c.px(sx, sy, cc[m]); continue; }
      if (!outline) continue; const nb = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && mask[y * bw + x] >= 0; if (nb(X - 1, Y) || nb(X + 1, Y) || nb(X, Y - 1) || nb(X, Y + 1)) c.px(sx, sy, ink); }
  }
  return { fillPoly, ell, flush };
}

/** a flying duck centred at world (x, y), size ≈ 34 × 30 units, facing ±1, wing phase (cycles), pal, state: 0 fly, 1 hit (stunned), fall k */
export function drawDuck(c, V, x, y, { face = 1, flap = 0, pal = DUCK_PAL.green, hit = 0, fall = 0, alpha = 1, clip = null } = {}) {
  const p = painter(c, V, x - 26, y - 26, 52, 52), f = face, L = (u, v) => [x + u * f, y + v];
  const fp = (pts, col) => p.fillPoly(pts.map(([u, v]) => L(u, v)), col), e = (u, v, rx, ry, col, rot = 0) => p.ell(x + u * f, y + v, rx, ry, col, rot * f);
  const wingA = Math.sin(flap * Math.PI * 2) * (1 - hit), tilt = fall * 1.4;
  if (fall > 0) { // falling: tumbling body, wings folded up
    e(0, 0, 11, 8, pal.body, tilt); e(-2, 3, 8, 4.5, pal.belly, tilt); e(9, -8, 6, 5.5, pal.head); e(14, -6, 4, 2, pal.beak); e(10, -9, 1.4, 1.4, "#FFFFFF");
    fp([[-6, -4], [2, -4], [-2, -20], [-8, -18]], pal.wing); fp([[0, -4], [6, -4], [8, -19], [3, -19]], pal.wingHi); p.flush(alpha, true, clip); return;
  }
  // far wing (behind)
  fp([[-3, -4], [6, -4], [4 + 5 * wingA, -4 - 13 * wingA], [-1 + 3 * wingA, -4 - 18 * wingA], [-7 + 2 * wingA, -4 - 11 * wingA]], pal.wing);
  // tail, body, belly
  fp([[-11, -2], [-19, -6], [-18, 2], [-11, 3]], pal.tail); e(0, 0, 12, 7.5, pal.body); e(1, -2.5, 10, 3, pal.bodyHi); e(1, 4, 9, 3.2, pal.belly);
  // neck, head, ring, beak, eye
  e(9, -5, 4, 5, pal.head, 0.5); e(13, -10, 6.2, 5.6, pal.head); e(12, -12, 3.6, 2.4, pal.headHi); fp([[7, -4], [12, -6], [12, -4.6], [7.5, -2.6]], pal.ring);
  fp([[17, -10.5], [24, -9], [24, -7.4], [17.5, -7.2]], pal.beak);
  if (hit > 0) { fp([[13.6, -12.6], [16.2, -10], [15.4, -9.2], [12.8, -11.8]], "#120A10"); fp([[12.8, -10], [15.4, -12.6], [16.2, -11.8], [13.6, -9.2]], "#120A10"); }
  else { e(15, -11.4, 1.6, 1.6, "#FFFFFF"); e(15.4, -11.2, 0.8, 0.9, "#120A10"); }
  // near wing (front)
  const w2 = -wingA, wp = (k) => [[-5, -2], [7, -2], [5 + 5 * w2 * k, -2 - 14 * w2 * k], [0 + 3 * w2 * k, -2 - 20 * w2 * k], [-8 + 2 * w2 * k, -2 - 12 * w2 * k]];
  fp(wp(1), pal.wingHi); fp(wp(0.45), pal.wing); fp([[-5, -2], [7, -2], [6, -0.5], [-4, -0.5]], pal.bodyHi);
  p.flush(alpha, true, clip);
}
/** the hit box: a plain white rectangle where the duck is (alpha via dither) */
export function duckBox(c, V, x, y, a = 1, col = "#FFFFFF") { const x0 = Math.round(V.X(x - 16)), x1 = Math.round(V.X(x + 16)), y0 = Math.round(V.Y(y - 16)), y1 = Math.round(V.Y(y + 12)); for (let Y = Math.max(0, y0); Y < Math.min(c.h, y1); Y++) for (let X = Math.max(0, x0); X < Math.min(c.w, x1); X++) if (a >= 1 || a > bayer(X, Y)) c.px(X, Y, col); }
export { painter };

/** our own hunting dog, seen from the front, laughing (eyes squeezed shut, mouth open); bob 0..1 shakes it up and down.
 *  (x, y) = centre of the chin line in game units; ~44 × 54 units. Drawn before the front grass so it rises from behind it. */
export function drawDog(c, V, x, y, { bob = 0, alpha = 1, clip = null } = {}) {
  const p = painter(c, V, x - 30, y - 50, 60, 80), yy = y - bob * 2.5;
  const TAN = "#D89A5A", TAN2 = "#B8783E", BROWN = "#6A3A1E", BROWN2 = "#8A5028", WHITE = "#F2E6D0", NOSE = "#1A1014", MOUTH = "#5A1420", TONGUE = "#E8607A";
  // body and chest (below the head, mostly hidden by the grass)
  p.fillPoly([[x - 17, yy + 34], [x - 13, yy + 4], [x + 13, yy + 4], [x + 17, yy + 34]], TAN2); p.ell(x, yy + 16, 9, 12, WHITE);
  p.ell(x - 9, yy + 12, 6, 5, BROWN2);
  // ears (long, floppy), head, muzzle
  p.fillPoly([[x - 13, yy - 30], [x - 22, yy - 26], [x - 25, yy - 6], [x - 18, yy + 1], [x - 12, yy - 14]], BROWN);
  p.fillPoly([[x + 13, yy - 30], [x + 22, yy - 26], [x + 25, yy - 6], [x + 18, yy + 1], [x + 12, yy - 14]], BROWN);
  p.ell(x, yy - 22, 14, 13, TAN); p.ell(x - 5, yy - 28, 6, 4, "#E8B47A");
  p.ell(x, yy - 9, 10.5, 8.5, WHITE);
  // mouth open (laughing) with tongue, nose
  p.fillPoly([[x - 7, yy - 9], [x + 7, yy - 9], [x + 5, yy - 1], [x - 5, yy - 1]], MOUTH); p.ell(x, yy - 3, 3.6, 2.4, TONGUE);
  p.ell(x, yy - 14, 3.6, 2.6, NOSE); p.ell(x - 1, yy - 15, 1.2, 0.8, "#6A5A60");
  // eyes squeezed shut: two arcs
  for (const s of [-1, 1]) p.fillPoly([[x + s * 4, yy - 23], [x + s * 9, yy - 25], [x + s * 10, yy - 23.6], [x + s * 5, yy - 21.6]], NOSE);
  p.flush(alpha, true, clip);
}
