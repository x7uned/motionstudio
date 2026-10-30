// Casino kit · props: chips and chip towers, coins, playing cards, slot machines (reels with cherry / bell / BAR / 7 / gem),
// stools, rope posts, the half-moon card table. All drawn through the camera V (casino-core.mjs) or a billboard frame G.
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, rampAt, shadePoly, glow, shadow, ringPts, flatPts, rrectXZ, bbox, onScreen } from "./casino-core.mjs";

// ---------------------------------------------------------------- chips
export const CHIP = { r: 3.6, h: 0.95 };                     // a little larger than life so they read at phone size
export const CHIP_RAMPS = { red: RAMP.red, blue: RAMP.blue, green: RAMP.green, black: RAMP.black, purple: RAMP.purple, yellow: RAMP.yellow, ivory: RAMP.ivory };
const elev = (V, x, y, z) => { const dx = x - V.cam.x, dy = V.cam.y - y, dz = V.cam.z - z; return Math.max(0.15, dy / Math.hypot(dx, dy, dz)); };

/**
 * A stack of n chips standing at world (x, y, z) (y = the surface height). ramp = a CHIP_RAMPS entry.
 * o = { a (dissolve), sway(i) → dx cm for chip i (tall wobbling towers), r, h, glow (0..1 gold rim light), top: false hides the top face }.
 */
export function chipStack(c, V, x, y, z, n, ramp, o = {}) {
  if (n <= 0) return;
  const a = o.a ?? 1; if (a <= 0) return;
  const g = fade(c, a), r = o.r ?? CHIP.r, h = o.h ?? CHIP.h, e = elev(V, x, y, z), ce = Math.sqrt(1 - e * e);
  const full = Math.ceil(n), part = n - Math.floor(n);
  for (let i = 0; i < full; i++) {
    const dx = o.sway ? o.sway(i) : 0, yy = y + i * h, [sx, sy, k] = V.P(x + dx, yy, z), rx = r * k, ry = Math.max(1, rx * e), side = Math.max(1, h * k * ce);
    if (i === full - 1 && part > 0 && o.dropLast) continue;
    const X = R(sx), Y = R(sy), RX = Math.max(1, R(rx)), RY = Math.max(1, R(ry));
    // side band: dark lower half-ellipse + body, white edge stripes
    g.ellipse(X, Y, RX, RY, ramp[1]);
    g.rect(X - RX, R(Y - side), RX * 2 + 1, R(side), ramp[2]);
    if (RX >= 5) for (let s = 0; s < 6; s++) { const ang = ((s + 0.5) / 6) * Math.PI * 2 + (o.spin ?? 0), cx = Math.cos(ang); if (Math.sin(ang) < 0.15) continue; const sx2 = R(X + cx * RX * 0.92); g.rect(sx2 - (RX >= 9 ? 1 : 0), R(Y - side + 1), RX >= 9 ? 2 : 1, Math.max(1, R(side) - 1), RAMP.ivory[6]); }
    // top face
    const TY = R(Y - side);
    g.ellipse(X, TY, RX, RY, ramp[5]);
    if (RX >= 4) {
      g.ellipse(X, TY, Math.max(1, R(RX * 0.68)), Math.max(1, R(RY * 0.68)), ramp[4]);
      g.ering(X, TY, Math.max(1, R(RX * 0.68)), Math.max(1, R(RY * 0.68)), RAMP.ivory[5]);
      for (let s = 0; s < 6; s++) { const ang = ((s + 0.5) / 6) * Math.PI * 2 + (o.spin ?? 0); g.px(R(X + Math.cos(ang) * RX * 0.86), R(TY + Math.sin(ang) * RY * 0.86), RAMP.ivory[7]); if (RX >= 8) g.px(R(X + Math.cos(ang) * RX * 0.86) + 1, R(TY + Math.sin(ang) * RY * 0.86), RAMP.ivory[7]); }
      g.px(X - R(RX * 0.35), TY - R(RY * 0.4), ramp[7]);
    }
    if (o.glow) glow(c, X, TY, RX * 1.6, RY * 1.8, UI.Y, 0.35 * o.glow);
  }
}
/** Screen point of the top of a stack (for labels and links). */
export function stackTop(V, x, y, z, n, h = CHIP.h) { return V.P(x, y + n * h, z); }

/** A small gold coin flying or lying at world (x, y, z). */
export function coin(c, V, x, y, z, a = 1, spin = 0) {
  if (a <= 0) return;
  const g = fade(c, a), [sx, sy, k] = V.P(x, y, z), r = Math.max(2, 2.2 * k), w = Math.max(1, Math.abs(Math.cos(spin)) * r);
  g.ellipse(R(sx), R(sy) + 1, R(w), R(r), RAMP.gold[2]); g.ellipse(R(sx), R(sy), R(w), R(r), RAMP.gold[5]);
  if (w > 2) g.ellipse(R(sx), R(sy), Math.max(1, R(w * 0.6)), Math.max(1, R(r * 0.6)), RAMP.gold[4]);
  g.px(R(sx - w * 0.4), R(sy - r * 0.5), RAMP.gold[7]);
  glow(c, sx, sy, r * 2.4, r * 2.4, UI.Y, 0.3 * a);
}

// ---------------------------------------------------------------- playing cards (flat on the felt)
const SUIT = {
  "♥": [".#.#.", "#####", "#####", ".###.", "..#.."], "♦": ["..#..", ".###.", "#####", ".###.", "..#.."],
  "♠": ["..#..", ".###.", "#####", "#####", "..#.."], "♣": [".###.", ".###.", "#####", "#####", "..#.."],
};
/** A card lying on a surface at height y, centre (x, z), 6×9 cm; faceUp shows rank + suit (Latin/digits only). */
export function card(c, V, x, y, z, rank, suit, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = fade(c, a), w = 3.2, l = 4.6, rot = o.rot ?? 0, cr = Math.cos(rot), sr = Math.sin(rot);
  const pts = [[-w, -l], [w, -l], [w, l], [-w, l]].map(([u, v]) => { const p = V.P(x + u * cr - v * sr, y + (o.lift ?? 0), z + u * sr + v * cr); return [p[0], p[1]]; });
  const b = bbox(pts); if (!onScreen(b)) return;
  g.poly(pts.map(([px, py]) => [px, py + 1]), "#1A1420");
  if (o.faceUp === false) { g.poly(pts, "#8A1A2A"); const in2 = pts.map(([px, py]) => [lerp(px, (b.x0 + b.x1) / 2, 0.2), lerp(py, (b.y0 + b.y1) / 2, 0.2)]); g.poly(in2, "#B8344A"); return; }
  g.poly(pts, "#F8F4EA"); for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#B8B0A0"); }
  const red = suit === "♥" || suit === "♦", col = red ? "#C8202E" : "#14121C", cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, sz = b.x1 - b.x0;
  if (sz >= 14) { const s = sz >= 26 ? 2 : 1, tw = g.measure(TINY, String(rank), { scale: s }); g.text(TINY, String(rank), R(cx - tw / 2), R(cy - 6 * s), col, { scale: s }); g.sprite(R(cx - 2.5 * s), R(cy + s), SUIT[suit].flatMap((r) => { const w = [...r].map((ch) => ch.repeat(s)).join(""); return s > 1 ? [w, w] : [w]; }), { "#": col }); }
  else g.rect(R(cx - 1), R(cy - 1), 2, 2, col);
}

// ---------------------------------------------------------------- slot machines (billboards, cm units: u −32..32, v 0..−180)
const SYM = ["cherry", "bell", "bar", "seven", "gem"];
function symbol(g, kind, cx, cy, s, a = 1) {
  // s = symbol size in px (≈ reel window height / 1.2)
  const r = Math.max(1, R(s * 0.22));
  if (s < 5) { g.rect(R(cx - 1), R(cy - 1), 2, 2, kind === "seven" ? "#E02838" : kind === "bell" ? "#F0C030" : kind === "cherry" ? "#C81830" : kind === "gem" ? "#40C8E0" : "#202028"); return; }
  if (kind === "cherry") { g.line(R(cx - r), R(cy), R(cx + r * 0.4), R(cy - s * 0.42), "#2E8A2A"); g.line(R(cx + r), R(cy), R(cx + r * 0.4), R(cy - s * 0.42), "#2E8A2A"); g.disc(R(cx - r), R(cy + r * 0.5), r, "#C81830"); g.disc(R(cx + r), R(cy + r * 0.6), r, "#E02838"); g.px(R(cx - r - r * 0.4), R(cy), "#FFB0B0"); g.px(R(cx + r - r * 0.4), R(cy + r * 0.1), "#FFB0B0"); }
  else if (kind === "bell") { const w = s * 0.34; g.poly([[cx - w, cy + s * 0.3], [cx - w * 0.7, cy - s * 0.05], [cx - w * 0.45, cy - s * 0.32], [cx + w * 0.45, cy - s * 0.32], [cx + w * 0.7, cy - s * 0.05], [cx + w, cy + s * 0.3]], "#E8B020"); g.rect(R(cx - w), R(cy + s * 0.28), R(w * 2), Math.max(1, R(s * 0.08)), "#A87410"); g.disc(R(cx), R(cy + s * 0.36), Math.max(1, R(s * 0.07)), "#A87410"); g.line(R(cx - w * 0.4), R(cy - s * 0.2), R(cx - w * 0.55), R(cy + s * 0.15), "#FFF0A0"); }
  else if (kind === "bar") { const w = s * 0.42, h = s * 0.2; g.rect(R(cx - w), R(cy - h), R(w * 2), R(h * 2), "#18161E"); g.rect(R(cx - w) + 1, R(cy - h) + 1, R(w * 2) - 2, 1, "#5A5868"); if (s >= 14) { const tw = g.measure(TINY, "BAR"); g.text(TINY, "BAR", R(cx - tw / 2), R(cy - 2), "#F4F0E0"); } else g.rect(R(cx - w * 0.6), R(cy), R(w * 1.2), 1, "#F4F0E0"); }
  else if (kind === "seven") { const sc = Math.max(1, Math.floor(s / 9)), tw = g.measure(MAIN, "7", { scale: sc }); g.text(MAIN, "7", R(cx - tw / 2) + 1, R(cy - 3.5 * sc) + 1, "#5A0810", { scale: sc }); g.text(MAIN, "7", R(cx - tw / 2), R(cy - 3.5 * sc), "#E82838", { scale: sc }); }
  else { const w = s * 0.3; g.poly([[cx - w, cy - s * 0.1], [cx - w * 0.5, cy - s * 0.32], [cx + w * 0.5, cy - s * 0.32], [cx + w, cy - s * 0.1], [cx, cy + s * 0.34]], "#38B8D8"); g.poly([[cx - w * 0.5, cy - s * 0.32], [cx, cy - s * 0.1], [cx, cy + s * 0.34], [cx - w, cy - s * 0.1]], "#7AE0F0"); }
}
/** Idle reel positions for background machines: a spin every few seconds, eased stop on a whole symbol. */
export function idleReels(seed, t) {
  const period = 4 + rnd(seed) * 4, ph = rnd(seed + 7) * period, cyc = Math.floor((t + ph) / period), u = (t + ph) - cyc * period;
  return [0, 1, 2].map((i) => { const base = Math.floor(rnd(seed * 31 + cyc * 7 + i) * 5) + cyc * 11, dur = 1.0 + i * 0.35; return base + 9 * ease(clamp01(u / dur)) - 9; });
}
/**
 * Slot machine billboard. G from V.bill(x, z, 1 /* cm per unit *\/, vf). o = { body: ramp, reels: [p0, p1, p2] (float symbol index),
 * lights (0..1 chase), win (0..1 jackpot flash), a, back: true (seen from behind) }.
 */
export function slotMachine(c, G, t, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = fade(c, a), B = o.body ?? RAMP.purple, X = (u) => G.X(u), Y = (v) => G.Y(v), z = G.z;
  const bx0 = X(-32), bx1 = X(32); if (bx1 < -20 || bx0 > 560 || Y(-182) > 980 || Y(0) < -20) return;
  const box = (u0, v0, u1, v1, col) => { const xa = R(X(Math.min(u0, u1))), xb = R(X(Math.max(u0, u1))), ya = R(Y(v0)), yb = R(Y(v1)); g.rect(Math.min(xa, xb), Math.min(ya, yb), Math.max(1, Math.abs(xb - xa)), Math.max(1, Math.abs(yb - ya)), col); };
  const lit = 0.5 + 0.5 * (o.lights ?? 1);
  shadow(c, G.bx, G.by, 34 * z, 6 * z, 0.5);
  if (o.back) { box(-32, 0, 32, -150, B[1]); box(-30, -4, 30, -146, B[2]); box(-26, -150, 26, -170, B[2]); for (let v = -20; v > -140; v -= 24) box(-26, v, 26, v - 2, B[0]); glow(c, G.bx, Y(-170), 40 * z, 16 * z, mix(B[6], "#FFFFFF", 0.3), 0.35); return; }
  // cabinet
  box(-32, 0, 32, -70, B[0]); box(-30, -2, 30, -68, B[2]);
  for (let s = -1; s <= 1; s += 2) box(s * 30, -2, s * 27, -68, B[3]);
  box(-26, -6, 26, -9, mix(UI.Y, B[5], 0.4)); glow(c, G.bx, Y(-7.5), 30 * z, 5 * z, UI.Y, 0.35 * lit);       // kick light strip
  box(-14, -58, 14, -64, RAMP.chrome[2]); box(-13, -59, 13, -61, RAMP.chrome[5]);                             // coin tray
  // button deck
  box(-32, -70, 32, -82, RAMP.chrome[3]); box(-31, -72, 31, -80, B[1]);
  if (z > 0.55) [[-22, "#E83838"], [-12, "#F0C030"], [-2, "#38C850"], [8, "#3878E8"]].forEach(([u, col], i) => { box(u, -74, u + 6, -78, col); box(u + 1, -77, u + 5, -78, mix(col, "#000000", 0.4)); });
  if (z > 0.55) { g.disc(R(X(24)), R(Y(-76)), Math.max(1, R(4 * z)), "#E82838"); g.px(R(X(23)), R(Y(-78)), "#FFC0C0"); }
  // screen bezel and reels
  box(-30, -82, 30, -132, RAMP.chrome[4]); box(-28, -84, 28, -130, RAMP.chrome[1]);
  const reels = o.reels ?? idleReels(o.seed ?? 1, t), sh = (130 - 86) * z * G.vf;
  for (let i = 0; i < 3; i++) {
    const u0 = -26 + i * 18, u1 = u0 + 16, x0 = R(X(u0)), x1 = R(X(u1)), y0 = R(Y(-128)), y1 = R(Y(-86));
    const xa = Math.min(x0, x1), w = Math.abs(x1 - x0); g.rect(xa, y0, w, y1 - y0, "#F4EEDC");
    for (let yy = y0; yy < y1; yy++) { const d = Math.abs((yy - (y0 + y1) / 2) / ((y1 - y0) / 2)); if (d > 0.55) for (let xx = xa; xx < xa + w; xx++) if ((d - 0.55) * 2.2 > ((xx * 7 + yy * 3) % 4) / 4) g.px(xx, yy, "#C8BCA4"); }
    const p = reels[i], cell = (y1 - y0) / 1.25, s = Math.min(w * 0.9, cell * 0.85);
    for (let k = -1; k <= 1; k++) { const idx = Math.floor(p) + k, off = (p - Math.floor(p)) * cell, cy = (y0 + y1) / 2 + k * cell - off; if (cy < y0 - s * 0.3 || cy > y1 + s * 0.3) continue;
      const sym = SYM[((idx % 5) + 5) % 5], clip = Object.create(g); clip.px = (px, py, col) => { if (py >= y0 && py < y1) g.px(px, py, col); }; symbol(clip, sym, xa + w / 2, cy, s); }
  }
  box(-28, -107.5, 28, -108.5, "#E02838");                                                                        // payline
  // art glass + topper
  box(-30, -132, 30, -152, B[2]); box(-28, -134, 28, -150, B[4]);
  for (let k = 0; k < 9; k++) { const u = -24 + k * 6, on = Math.sin(t * 6 + k * 0.9 + (o.seed ?? 0)) > 0.2 * (1 - lit); g.disc(R(X(u)), R(Y(-142)), Math.max(1, R(1.6 * z)), on ? (k % 2 ? "#FFF2A0" : "#FF9AD0") : B[2]); }
  const top = [];
  for (let i = 0; i <= 12; i++) { const ang = Math.PI + (Math.PI * i) / 12; top.push([X(Math.cos(ang) * 30), Y(-152 + Math.sin(ang) * 26)]); }
  g.poly(top, B[3]); g.poly(top.map(([px, py]) => [lerp(px, G.bx, 0.12), lerp(py, Y(-154), 0.12)]), B[5]);
  // the topper sign: a big star (no text, no brand)
  { const cx = G.bx, cy = Y(-166), r1 = 10 * z, r0 = 4.4 * z, pts = []; for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r0 : r1; pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * G.vf]); } g.poly(pts, mix("#FFE070", "#FFFFFF", 0.3 * (o.win ?? 0))); }
  const bulbs = 14; for (let i = 0; i <= bulbs; i++) { const ang = Math.PI + (Math.PI * i) / bulbs, on = (Math.floor(t * 8) + i + (o.seed ?? 0)) % 3 === 0; g.px(R(X(Math.cos(ang) * 28)), R(Y(-152 + Math.sin(ang) * 24)), on ? "#FFFBE0" : "#E0A040"); if (z > 0.8) g.px(R(X(Math.cos(ang) * 28)) + 1, R(Y(-152 + Math.sin(ang) * 24)), on ? "#FFFBE0" : "#E0A040"); }
  glow(c, G.bx, Y(-160), 44 * z, 30 * z * G.vf, mix(B[6], UI.Y, 0.4), 0.35 * lit + 0.4 * (o.win ?? 0));
  glow(c, G.bx, Y(-108), 36 * z, 26 * z * G.vf, "#FFF4D0", 0.18 * lit);
}

// ---------------------------------------------------------------- furniture
/** Bar stool at a floor point (round red leather seat on a brass pole). */
export function stool(c, V, x, z, a = 1) {
  const g = fade(c, a), [bx, by, k] = V.P(x, 0, z), [sx, sy] = V.P(x, 68, z), r = 17 * k, e = elev(V, x, 68, z);
  shadow(c, bx, by, r * 1.1, r * e * 1.1, 0.45);
  g.ellipse(R(bx), R(by), Math.max(1, R(r * 0.7)), Math.max(1, R(r * 0.7 * e)), RAMP.gold[2]);
  g.rect(R(bx - Math.max(1, 1.6 * k)), R(sy), Math.max(2, R(3.2 * k)), R(by - sy), RAMP.gold[4]); g.rect(R(bx - Math.max(1, 1.6 * k)), R(sy), 1, R(by - sy), RAMP.gold[6]);
  g.ellipse(R(sx), R(sy) + Math.max(1, R(5 * k * 0.8)), Math.max(1, R(r)), Math.max(1, R(r * e)), RAMP.leather[2]);
  g.ellipse(R(sx), R(sy), Math.max(1, R(r)), Math.max(1, R(r * e)), "#8A1C26"); g.ellipse(R(sx - r * 0.2), R(sy - r * e * 0.25), Math.max(1, R(r * 0.55)), Math.max(1, R(r * e * 0.45)), "#B8303A");
}
/** Brass post with a red velvet rope to the next post. */
export function ropePosts(c, V, pts, t = 0) {
  for (let i = 0; i < pts.length; i++) { const [x, z] = pts[i], [bx, by, k] = V.P(x, 0, z), [tx, ty] = V.P(x, 95, z);
    if (i < pts.length - 1) { const [x2, z2] = pts[i + 1], [tx2, ty2] = V.P(x2, 95, z2), n = 24; let px = tx, py = ty; for (let s = 1; s <= n; s++) { const u = s / n, X = lerp(tx, tx2, u), Y = lerp(ty, ty2, u) + Math.sin(Math.PI * u) * 22 * k; for (let w = 0; w < Math.max(1, R(2.6 * k)); w++) c.line(R(px), R(py) + w, R(X), R(Y) + w, w === 0 ? "#C8384A" : "#7A1424"); px = X; py = Y; } }
    shadow(c, bx, by, 14 * k, 4 * k, 0.5); c.ellipse(R(bx), R(by), Math.max(1, R(9 * k)), Math.max(1, R(3 * k)), RAMP.gold[3]);
    c.rect(R(bx - 2 * k), R(ty), Math.max(2, R(4 * k)), R(by - ty), RAMP.gold[4]); c.rect(R(bx - 2 * k), R(ty), Math.max(1, R(1.2 * k)), R(by - ty), RAMP.gold[7]);
    c.disc(R(tx), R(ty), Math.max(1, R(4 * k)), RAMP.gold[5]); c.px(R(tx - k), R(ty - k), RAMP.gold[7]); }
}

/** Half-moon card table (blackjack-style) at (x, z): straight edge far (dealer side), arc toward the camera. */
export function cardTable(c, V, x, z, t, o = {}) {
  const TOP = 76, outer = [], inner = [];
  for (let i = 0; i <= 24; i++) { const a = (Math.PI * i) / 24; outer.push([x + Math.cos(a) * 112, z - 40 + Math.sin(a) * 95]); inner.push([x + Math.cos(a) * 104, z - 40 + Math.sin(a) * 87]); }
  const op = flatPts(V, outer, TOP + 3), b = bbox(op); if (!onScreen(b, 40)) return;
  const [cx0, cy0, k] = V.P(x, 0, z);
  shadow(c, cx0, cy0 + 10 * k, 120 * k, 60 * k, 0.5);
  // body (front face of the arc)
  const front = [...flatPts(V, outer, TOP), ...flatPts(V, outer.slice().reverse(), 6)];
  shadePoly(c, front, RAMP.wood, (px, py) => 2.2 + 1.4 * ((py - b.y0) / Math.max(1, b.y1 - b.y0)) * 0);
  shadePoly(c, op, RAMP.leather, () => 3.4);
  const ip = flatPts(V, inner, TOP + 1), lamp = V.P(x, TOP, z - 10);
  shadePoly(c, ip, RAMP.felt, (px, py) => 5.6 - Math.hypot((px - lamp[0]) / (90 * k), (py - lamp[1]) / (60 * k)) * 2.2);
  { const arc = []; for (let i = 0; i <= 24; i++) { const a = (Math.PI * i) / 24; arc.push([x + Math.cos(a) * 64, z - 40 + Math.sin(a) * 50]); } const ap = flatPts(V, arc, TOP + 1); for (let i = 0; i < ap.length - 1; i++) c.line(R(ap[i][0]), R(ap[i][1]), R(ap[i + 1][0]), R(ap[i + 1][1]), RAMP.gold[5]); }
  // dealer chip tray and the cards in front of each seat
  { const tray = flatPts(V, rrectXZ(x - 34, z - 40, x + 34, z - 28, 2), TOP + 2); c.poly(tray, RAMP.wood[1]); for (let i = 0; i < 8; i++) chipStack(c, V, x - 30 + i * 8.5, TOP + 1, z - 34, 4 + (i % 3), Object.values(CHIP_RAMPS)[i % 5], { r: 3.2 }); }
  for (let s = 0; s < 5; s++) { const a = Math.PI * (0.15 + s * 0.175), sx = x + Math.cos(a) * 80, sz = z - 40 + Math.sin(a) * 64; card(c, V, sx - 2, TOP + 1, sz, ["K", "7", "A", "9", "Q"][s], ["♥", "♠", "♦", "♣", "♥"][s], { rot: a - Math.PI / 2 + 0.2 }); card(c, V, sx + 3, TOP + 1.2, sz + 1, ["5", "J", "8", "2", "10"][s], ["♣", "♦", "♠", "♥", "♠"][s], { rot: a - Math.PI / 2 - 0.15 }); chipStack(c, V, sx + Math.cos(a) * 12, TOP + 1, sz + Math.sin(a) * 10, 2 + (s % 3), Object.values(CHIP_RAMPS)[(s + 2) % 5]); }
}
