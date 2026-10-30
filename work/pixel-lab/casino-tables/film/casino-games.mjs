// ============================================================================================================================
// CASINO KIT · games (casino-tables, Casino secrets 5/5, 2026-10-27). New on top of the frozen kit copy:
//   bjTable(c, V, T, st)            our blackjack table (half-moon, straight edge far): wood body, leather rail, felt with a lamp
//                                   pool, gold arc, five betting spots, the dealer's chip rack (st.rack glow), the card shoe and
//                                   the discard holder; st.onFelt(c, V) draws the film's cards and chips on top of the felt.
//   bigCard(c, V, x, y, z, rank, suit, o)  a playing card larger than life (10.8 × 15 cm) flat on the felt; the rank and a big suit
//                                   are drawn upright on the screen so they read at phone size. o = { rot, lift, a, up: 0..1 (flip:
//                                   0 back, 1 face; the card squeezes through the turn), glow, red: 0..1 bust tint }.
//   placard(c, V, x, z, lines, o)   a standing table sign (acrylic tent card) on the felt; lines drawn upright, scaled to fit.
//   lastBoard(c, V, B, st)          the tall last-numbers board on a brass pole: newest number on top, red numbers on the left,
//                                   black on the right, 0 in the middle; st = { on, lit: [0..1 per row], dim, pulse, t }.
//   crapsTable(c, V, T, st)         our dice table: a long rounded tub (rail at 96 cm, felt at 72 cm), the far wall with the rubber
//                                   diamonds the dice must hit, pass-line bands, the centre box, chip racks; st.onFelt(c, V).
//   die3D(c, V, x, y, z, s, ang, st) a clear red casino die (s cm, bottom at y) in any orientation ang = [yaw, pitch, roll]; per-pixel
//                                   see-through faces (what is behind shows tinted), the far faces' pips through the body,
//                                   sharp bright edges with a running glint, «No 0427» on the 1-face, st.eyes turns the 2-face into
//                                   a calm face. Pure function of its inputs.
//   ceilingPass(c, V, t, st)        a dark coffered ceiling (per pixel) with warm downlights and smoked camera domes (red LED,
//                                   a lens that can turn toward a target), DOME_SPOTS.
//   palm(c, x, y, s, open, side, a)  a big open hand (screen space): palm toward the camera (side 1) or its back (side −1).
//   stamp / badge22 / plate / bubble  screen-space signs used by the film.
// ============================================================================================================================
import { MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, bayer, rampAt, shadePoly, glow, shadow, ringPts, flatPts, rrectXZ, bbox, onScreen } from "./casino-core.mjs";
import { chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { isRed } from "./casino-roulette.mjs";
import { CEIL } from "./timeline.mjs";

const O = "#0B0812";
const P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
export const BJ_TOP = 76;
/** Project a 3D polygon after clipping it against the camera's near plane (depth ≥ 4 cm): no wild wedges near the lens. */
export function clipProj(V, pts3, near = 4) {
  const out = [], n = pts3.length, dep = pts3.map(([x, y, z]) => V.depth(x, y, z));
  for (let i = 0; i < n; i++) { const a = pts3[i], b = pts3[(i + 1) % n], da = dep[i], db = dep[(i + 1) % n];
    if (da >= near) out.push(a);
    if ((da >= near) !== (db >= near)) { const u = (near - da) / (db - da); out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); } }
  return out.map(([x, y, z]) => P2(V, x, y, z));
}
const flatC = (V, ptsXZ, y) => clipProj(V, ptsXZ.map(([x, z]) => [x, y, z]));
const quadC = (V, a, b, ya, yb) => clipProj(V, [[a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]]]);


// ---------------------------------------------------------------- blackjack table
export function bjTable(c, V, T, st = {}) {
  const { x, z } = T, TOP = BJ_TOP, outer = [], inner = [];
  for (let i = 0; i <= 32; i++) { const a = (Math.PI * i) / 32; outer.push([x + Math.cos(a) * 124, z - 44 + Math.sin(a) * 104]); inner.push([x + Math.cos(a) * 115, z - 44 + Math.sin(a) * 95]); }
  outer.push([x - 124, z - 60], [x + 124, z - 60]); // the dealer's straight edge (closed polygon, back side)
  const outerP = [[x + 124, z - 60], ...outer.slice(0, 33), [x - 124, z - 60]];
  const op = flatPts(V, outerP, TOP + 3), b = bbox(op); if (!onScreen(b, 60)) return;
  const [cx0, cy0, k] = V.P(x, 0, z);
  shadow(c, cx0, cy0 + 6 * k, 140 * k, 70 * k * Math.max(0.3, V.sp), 0.55);
  // wood body (the front of the arc) with brass trims
  const arcTop = flatPts(V, outer.slice(0, 33), TOP), arcLow = flatPts(V, outer.slice(0, 33), 8);
  for (let i = 0; i < 32; i++) shadePoly(c, [arcTop[i], arcTop[i + 1], arcLow[i + 1], arcLow[i]], RAMP.wood, (px, py) => 2.0 + 1.6 * clamp01((py - arcTop[i][1]) / Math.max(1, arcLow[i][1] - arcTop[i][1])) * 0 + 1.2 * Math.sin((Math.PI * (i + 0.5)) / 32));
  for (const yy of [58, 22]) { const tr = flatPts(V, outer.slice(0, 33), yy); for (let i = 0; i < 32; i++) c.line(R(tr[i][0]), R(tr[i][1]), R(tr[i + 1][0]), R(tr[i + 1][1]), yy === 58 ? RAMP.gold[5] : RAMP.gold[3]); }
  // padded leather rail with a light seam
  shadePoly(c, op, RAMP.leather, (px, py) => 3.2 + 1.3 * clamp01((b.y1 - py) / Math.max(1, b.y1 - b.y0)));
  { const hl = flatPts(V, outer.slice(0, 33).map(([px, pz]) => [x + (px - x) * 0.965, z - 44 + (pz - z + 44) * 0.96]), TOP + 3.6); for (let i = 0; i < hl.length - 1; i++) c.line(R(hl[i][0]), R(hl[i][1]), R(hl[i + 1][0]), R(hl[i + 1][1]), RAMP.leather[6]); }
  // felt with the lamp pool
  const innerP = [[x + 115, z - 58], ...inner, [x - 115, z - 58]], ip = flatPts(V, innerP, TOP + 0.6), lamp = V.P(x, TOP, z - 10), lr = 130 * k;
  shadePoly(c, ip, RAMP.felt, (px, py) => 6.1 * (st.lamp ?? 1) - 2.4 * Math.hypot((px - lamp[0]) / lr, (py - lamp[1]) / (lr * 0.8)));
  { const e = ip; for (let i = 0; i < e.length - 1; i++) c.line(R(e[i][0]), R(e[i][1]), R(e[i + 1][0]), R(e[i + 1][1]), RAMP.felt[1]); }
  // the gold arc and the five betting spots
  { const arc = []; for (let i = 0; i <= 40; i++) { const a = (Math.PI * i) / 40; arc.push([x + Math.cos(a) * 74, z - 44 + Math.sin(a) * 56]); } const ap = flatPts(V, arc, TOP + 0.7); for (let i = 0; i < ap.length - 1; i++) { c.line(R(ap[i][0]), R(ap[i][1]), R(ap[i + 1][0]), R(ap[i + 1][1]), RAMP.gold[5]); c.line(R(ap[i][0]), R(ap[i][1]) + 1, R(ap[i + 1][0]), R(ap[i + 1][1]) + 1, RAMP.gold[3]); } }
  for (let s = 0; s < 5; s++) { const a = Math.PI * (0.14 + s * 0.18), sx = x + Math.cos(a) * 96, sz = z - 44 + Math.sin(a) * 80; const ring = ringPts(V, sx, TOP + 0.7, sz, 8.5); for (let i = 0; i < ring.length - 1; i++) c.line(R(ring[i][0]), R(ring[i][1]), R(ring[i + 1][0]), R(ring[i + 1][1]), RAMP.ivory[4]); }
  // the dealer's chip rack (tray with columns), glows when the casino collects
  { const tray = flatPts(V, rrectXZ(x - 40, z - 58, x + 40, z - 44, 2), TOP + 1.4); c.poly(tray.map(([px, py]) => [px, py + Math.max(1, R(2 * k))]), RAMP.wood[1]); c.poly(tray, RAMP.wood[3]);
    const rs = [CHIP_RAMPS.red, CHIP_RAMPS.blue, CHIP_RAMPS.green, CHIP_RAMPS.black, CHIP_RAMPS.purple, CHIP_RAMPS.yellow];
    for (let i = 0; i < 9; i++) chipStack(c, V, x - 34 + i * 8.5, TOP + 1.4, z - 51, 5 + ((i * 5) % 4) + R((st.rackGrow ?? 0) * (i % 2 ? 2 : 3)), rs[i % 6], { r: 3.3, glow: st.rack ?? 0 }); }
  // the card shoe (dealer's left = screen right) and the discard holder
  { const sx = x + 94, sz = z - 42, box = [[sx - 9, sz - 7], [sx + 9, sz - 7], [sx + 9, sz + 7], [sx - 9, sz + 7]];
    const top = flatPts(V, box, TOP + 9), low = flatPts(V, box, TOP + 0.8); c.poly([top[3], top[2], low[2], low[3]], RAMP.black[3]); c.poly([top[2], top[1], low[1], low[2]], RAMP.black[2]); c.poly(top, RAMP.black[4]);
    const lip = flatPts(V, [[sx - 7, sz + 5], [sx + 7, sz + 5], [sx + 7, sz + 7.5], [sx - 7, sz + 7.5]], TOP + 4); c.poly(lip, "#8A1A2A");
    for (let i = 0; i < 4; i++) c.line(R(top[i][0]), R(top[i][1]), R(top[(i + 1) % 4][0]), R(top[(i + 1) % 4][1]), RAMP.chrome[5]); }
  { const sx = x - 66, sz = z - 42, box = [[sx - 7, sz - 6], [sx + 7, sz - 6], [sx + 7, sz + 6], [sx - 7, sz + 6]], top = flatPts(V, box, TOP + 6), low = flatPts(V, box, TOP + 0.8);
    c.poly([top[3], top[2], low[2], low[3]], "#1C2E3A"); c.poly(top, "#3A5A6C"); c.line(R(top[3][0]), R(top[3][1]), R(top[2][0]), R(top[2][1]), "#9AC8D8"); }
  st.onFelt?.(c, V);
}

// ---------------------------------------------------------------- big cards
const SUIT7 = {
  "♥": [".##.##.", "#######", "#######", "#######", ".#####.", "..###..", "...#..."],
  "♦": ["...#...", "..###..", ".#####.", "#######", ".#####.", "..###..", "...#..."],
  "♠": ["...#...", "..###..", ".#####.", "#######", "#######", ".##.##.", "...#..."],
  "♣": ["..###..", "..###..", "##.#.##", "#######", "##.#.##", "...#...", "..###.."],
};
export const CARD_W = 7.4, CARD_L = 10.2;
export function suitSprite(g, suit, x, y, s, col) { SUIT7[suit].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") g.rect(R(x + i * s), R(y + j * s), s, s, col); })); }
export function bigCard(c, V, x, y, z, rank, suit, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), up = o.up ?? 1, turn = Math.cos(Math.PI * clamp01(up)), sq = Math.max(0.06, Math.abs(turn)), face = up >= 0.5;
  const w = CARD_W * sq, l = CARD_L, rot = o.rot ?? 0, cr = Math.cos(rot), sr = Math.sin(rot), lift = (o.lift ?? 0) + Math.sin(Math.PI * clamp01(up)) * (up > 0 && up < 1 ? 4 : 0);
  const pts = [[-w, -l], [w, -l], [w, l], [-w, l]].map(([u, v]) => P2(V, x + u * cr - v * sr, y + lift, z + u * sr + v * cr));
  const b = bbox(pts); if (!onScreen(b, 10)) return null;
  if (lift > 0.5) { const sh = [[-w, -l], [w, -l], [w, l], [-w, l]].map(([u, v]) => P2(V, x + u * cr - v * sr + 0.8, y + 0.2, z + u * sr + v * cr + 1)); fade(c, a * 0.5).poly(sh, "#04140C"); }
  g.poly(pts.map(([px, py]) => [px + 1, py + 2]), "#0A1A10");
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  if (!face) {
    g.poly(pts, "#F4EEE2");
    const in1 = pts.map(([px, py]) => [lerp(px, cx, 0.14), lerp(py, cy, 0.12)]), in2 = pts.map(([px, py]) => [lerp(px, cx, 0.24), lerp(py, cy, 0.22)]);
    g.poly(in1, "#9A1C30"); g.poly(in2, "#C2304A", null);
    c.poly(in2, null, (X, Y) => (a > bayer(X, Y) ? (((X + Y) & 3) === 0 ? "#E06070" : ((X - Y) & 3) === 0 ? "#8A1426" : null) : null));
  } else {
    g.poly(pts, mix("#FBF8F0", "#FF9A9A", 0.35 * (o.red ?? 0)));
    for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#A89E8C"); }
    const red = suit === "♥" || suit === "♦", col = red ? "#C81E2C" : "#14121C", wpx = b.x1 - b.x0;
    if (sq > 0.45) {
      const s = wpx >= 64 ? 3 : wpx >= 30 ? 2 : 1, tw = g.measure(MAIN, String(rank), { scale: s }), gap = 2 * s, total = tw + gap + 7 * s, x0 = R(cx - total / 2), y0 = R(cy - 3.5 * s);
      if (s >= 2) { g.text(MAIN, String(rank), x0, y0, col, { scale: s }); suitSprite(g, suit, x0 + tw + gap, y0, s, col); }
      else g.rect(R(cx - 1), R(cy - 1), 3, 3, col);
    }
  }
  if (o.glow) glow(c, cx, cy, (b.x1 - b.x0), (b.y1 - b.y0), o.glowCol ?? UI.Y, 0.35 * o.glow * a);
  return { cx, cy, b };
}

// ---------------------------------------------------------------- standing table sign
export function placard(c, V, x, z, lines, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const TOP = o.top ?? BJ_TOP, w = o.w ?? 19, h = (o.h ?? 13) * (o.rise ?? 1), lean = 4;
  const q = [[x - w, TOP + h, z - lean], [x + w, TOP + h, z - lean], [x + w, TOP, z], [x - w, TOP, z]].map(([px, py, pz]) => P2(V, px, py, pz));
  const b = bbox(q); if (!onScreen(b, 10)) return null;
  const g = fade(c, a);
  // shadow on the felt, the acrylic stand foot, the plate
  const sh = flatPts(V, [[x - w, z - 6], [x + w, z - 6], [x + w + 2, z + 3], [x - w - 2, z + 3]], TOP + 0.4); fade(c, 0.5 * a).poly(sh, "#04140C");
  g.poly(q.map(([px, py]) => [px + 2, py + 2]), "#05030A");
  g.poly(q, RAMP.gold[3]);
  const inset = (pts, k) => { const mx = (b.x0 + b.x1) / 2, my = (b.y0 + b.y1) / 2; return pts.map(([px, py]) => [lerp(px, mx, k), lerp(py, my, k * (b.x1 - b.x0) / Math.max(1, b.y1 - b.y0))]); };
  const in1 = inset(q, 0.04), in2 = inset(q, 0.07);
  g.poly(in1, RAMP.gold[6]); g.poly(in2, o.bg ?? "#14101E");
  // acrylic gloss streak
  { const bb = bbox(in2); for (let i = 0; i < 3; i++) g.line(R(bb.x0 + (bb.x1 - bb.x0) * (0.12 + i * 0.03)), R(bb.y0 + 1), R(bb.x0 + (bb.x1 - bb.x0) * (0.05 + i * 0.03)), R(bb.y1 - 1), mix(o.bg ?? "#14101E", "#FFFFFF", 0.12)); }
  const bb = bbox(in2), ww = bb.x1 - bb.x0, hh = bb.y1 - bb.y0;
  if ((o.rise ?? 1) > 0.85) {
    let s = 4; const fit = (sc) => lines.every((L) => c.measure(MAIN, L.text, { scale: sc }) <= ww - 8) && lines.length * (7 * sc + sc * 3) <= hh - 4;
    while (s > 1 && !fit(s)) s--;
    const tot = lines.reduce((acc, L) => acc + 7 * (L.s ?? s) + 3 * s, -3 * s); let y = R(bb.y0 + (hh - tot) / 2);
    for (const L of lines) { const sc = Math.min(L.s ?? s, s + 1), tw = c.measure(MAIN, L.text, { scale: sc }); g.text(MAIN, L.text, R((bb.x0 + bb.x1) / 2 - tw / 2) + 1, y + 1, "#000000", { scale: sc }); g.text(MAIN, L.text, R((bb.x0 + bb.x1) / 2 - tw / 2), y, L.col ?? UI.W, { scale: sc }); y += 7 * sc + 3 * s; }
  }
  if (o.glow) glow(c, (b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2, (b.x1 - b.x0) * 0.8, (b.y1 - b.y0) * 1.1, o.glowCol ?? UI.Y, 0.3 * o.glow * a);
  return b;
}

// ---------------------------------------------------------------- the last-numbers board
export const LAST = [32, 19, 21, 25, 34, 17, 0, 26];
export function lastBoard(c, V, B, st = {}) {
  const on = st.on ?? 1, dim = st.dim ?? 0, a = st.a ?? 1;
  const [px, py, k] = V.P(B.x, 0, B.z), [, pyTop] = V.P(B.x, B.y0, B.z);
  if (px < -200 || px > 740) return null;
  // pole on a round foot
  shadow(c, px, py, 26 * k, 8 * k, 0.5);
  c.ellipse(R(px), R(py), Math.max(2, R(16 * k)), Math.max(1, R(5 * k)), RAMP.gold[2]); c.ellipse(R(px), R(py) - 1, Math.max(2, R(14 * k)), Math.max(1, R(4 * k)), RAMP.gold[4]);
  c.rect(R(px - 2.4 * k), R(pyTop), Math.max(2, R(4.8 * k)), R(py - pyTop), RAMP.gold[4]); c.rect(R(px - 2.4 * k), R(pyTop), Math.max(1, R(1.4 * k)), R(py - pyTop), RAMP.gold[6]); c.rect(R(px + 1.6 * k), R(pyTop), 1, R(py - pyTop), RAMP.gold[2]);
  // the cabinet: brass frame, dark screen
  const x0 = B.x - B.w / 2, x1 = B.x + B.w / 2, [sx0, sy0] = P2(V, x0, B.y1, B.z), [sx1, sy1] = P2(V, x1, B.y0, B.z), d = 7 * k;
  const X0 = R(sx0), Y0 = R(sy0), W = R(sx1 - sx0), H = R(sy1 - sy0);
  c.rect(X0 + 3, Y0 + 4, W, H, "#05030A");
  c.rrect(X0 - 2, Y0 - 2, W + 4, H + 4, O, 3); c.rrect(X0, Y0, W, H, RAMP.gold[3], 3); c.rrect(X0 + 2, Y0 + 2, W - 4, H - 4, RAMP.gold[5], 2);
  const ix = X0 + R(d * 0.5), iy = Y0 + R(d * 0.5), iw = W - R(d), ih = H - R(d);
  c.rect(ix, iy, iw, ih, "#07050C");
  // header: a tiny wheel icon
  const head = R(ih * 0.13), rowH = (ih - head) / LAST.length, scr = 1 - 0.85 * dim;
  { const cx = ix + iw / 2, cy = iy + head / 2 + 1, r = Math.max(3, R(head * 0.36)); for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2 + (st.t ?? 0) * 0.6; c.line(R(cx), R(cy), R(cx + Math.cos(an) * r), R(cy + Math.sin(an) * r), mix("#07050C", i % 2 ? "#E03C40" : "#3A3A4E", 0.9 * scr * on)); } c.disc(R(cx), R(cy), Math.max(1, R(r * 0.35)), mix("#07050C", RAMP.gold[6], scr * on)); }
  c.rect(ix + 2, iy + head, iw - 4, 1, mix("#07050C", RAMP.gold[4], 0.7 * scr * on));
  // rows: newest on top (row 0); reds left, blacks right, zero centred
  const rad = Math.max(4, Math.min(R(rowH * 0.42), R(iw * 0.2)));
  const sc = rad >= 13 ? 2 : 1;
  LAST.forEach((n, i) => {
    const lit = st.lit?.[i] ?? 0, cy = R(iy + head + rowH * (i + 0.5)), col = n === 0 ? "green" : isRed(n) ? "red" : "black";
    const cx = R(ix + iw * (col === "red" ? 0.3 : col === "black" ? 0.7 : 0.5)), age = 1 - i * 0.06;
    const vis = on * scr * age * (i < 5 ? 1 : 0.85);
    if (vis <= 0.02) return;
    const fill = col === "red" ? "#E02838" : col === "black" ? "#2C2C3C" : "#1CA046", rim = col === "black" ? "#9A9AB0" : mix(fill, "#FFFFFF", 0.4);
    const gg = fade(c, Math.min(1, vis + 0.15));
    if (lit > 0) glow(c, cx, cy, rad * 2.6, rad * 2.1, "#FF4050", 0.55 * lit * vis);
    gg.disc(cx, cy, rad + 1, O); gg.disc(cx, cy, rad, mix(fill, "#07050C", 0.55 * (1 - vis))); gg.ring(cx, cy, rad, mix(rim, "#FFFFFF", 0.5 * lit));
    if (lit > 0) gg.ring(cx, cy, rad + 2, mix("#07050C", "#FFE0E0", lit * vis));
    const txt = String(n), tw = c.measure(MAIN, txt, { scale: sc }); gg.text(MAIN, txt, R(cx - tw / 2), R(cy - 3.5 * sc), mix("#FFFFFF", "#07050C", 0.6 * (1 - vis)), { scale: sc });
  });
  // the screen's own glow on the surroundings
  if (on * scr > 0.05) glow(c, ix + iw / 2, iy + ih / 2, iw * 1.2, ih * 0.7, "#FF5060", 0.12 * on * scr);
  // scanlines on the screen
  for (let y = iy; y < iy + ih; y += 3) fade(c, 0.25).rect(ix, y, iw, 1, "#000000");
  return { x: X0, y: Y0, w: W, h: H, rowY: (i) => R(iy + head + rowH * (i + 0.5)), rad };
}

// ---------------------------------------------------------------- the dice table (craps)
export const CR_RAIL = 96, CR_FELT = 72;
export function crapsTable(c, V, T, st = {}) {
  const { x, z, hw, hd } = T, outer = rrectXZ(x - hw, z - hd, x + hw, z + hd, 44, 6), inner = rrectXZ(x - hw + 14, z - hd + 14, x + hw - 14, z + hd - 14, 32, 6);
  const top = flatC(V, outer, CR_RAIL), b = bbox(top); if (!top.length || !onScreen(b, 60)) return;
  const [cx0, cy0, k] = V.P(x, 0, z);
  shadow(c, cx0, cy0 + 8 * k, (hw + 30) * k, (hd + 20) * k * Math.max(0.35, V.sp), 0.55);
  // outer body (extruded sides, front faces)
  for (let i = 0; i < outer.length; i++) { const j = (i + 1) % outer.length, ez = outer[j][1] - outer[i][1], ex = outer[j][0] - outer[i][0], nz = -ex; if (nz <= 0 && Math.abs(ez) < Math.abs(ex)) continue;
    const q = quadC(V, outer[i], outer[j], CR_RAIL, 6); if (q.length >= 3) shadePoly(c, q, RAMP.wood, () => (nz > 0 ? 2.6 : 1.8) + (Math.abs(ez) > Math.abs(ex) ? -0.3 : 0));
    for (const yy of [70, 30]) if (outer[i][1] > z - 10 && outer[j][1] > z - 10) { const l = clipProj(V, [[outer[i][0], yy, outer[i][1]], [outer[j][0], yy, outer[j][1]]]); if (l.length === 2) c.line(R(l[0][0]), R(l[0][1]), R(l[1][0]), R(l[1][1]), yy === 70 ? RAMP.gold[5] : RAMP.gold[3]); } }
  // rail top (leather) and the inner walls going down to the felt
  shadePoly(c, top, RAMP.leather, (px, py) => 3.0 + 1.4 * clamp01((b.y1 - py) / Math.max(1, b.y1 - b.y0)));
  const inTop = flatC(V, inner, CR_RAIL - 1);
  if (inTop.length >= 3) c.poly(inTop, RAMP.wood[1]);
  for (let i = 0; i < inner.length; i++) { const j = (i + 1) % inner.length, ez = inner[j][1] - inner[i][1];
    const q = quadC(V, inner[i], inner[j], CR_RAIL - 1, CR_FELT); if (q.length >= 3) shadePoly(c, q, RAMP.wood, () => 2.4 + (ez < 0 ? 0.6 : 0)); }
  // felt (lower), lamp pool
  const felt = flatC(V, inner, CR_FELT), lamp = V.P(x, CR_FELT, z), lr = (hw + 20) * k;
  shadePoly(c, felt, RAMP.felt, (px, py) => 6.0 * (st.lamp ?? 1) - 2.2 * Math.hypot((px - lamp[0]) / lr, (py - lamp[1]) / (lr * 0.5)));
  // the far inner wall: rubber diamonds (the dice must hit it) — drawn over the far wall band
  { const zw = z - hd + 14, xa = x - hw + 46, xb = x + hw - 46, n = 28;
    for (let i = 0; i < n; i++) { const u0 = xa + ((xb - xa) * i) / n, u1 = xa + ((xb - xa) * (i + 1)) / n, um = (u0 + u1) / 2;
      const p = [P2(V, um, CR_RAIL - 4, zw), P2(V, u1, (CR_RAIL + CR_FELT) / 2, zw), P2(V, um, CR_FELT + 3, zw), P2(V, u0, (CR_RAIL + CR_FELT) / 2, zw)];
      c.poly(p, i % 2 ? "#2A2A36" : "#3A3A4A"); c.line(R(p[0][0]), R(p[0][1]), R(p[1][0]), R(p[1][1]), "#6A6A80"); c.line(R(p[0][0]), R(p[0][1]), R(p[3][0]), R(p[3][1]), "#5A5A70"); } }
  // the layout: pass-line bands at both ends, the field, the centre box
  const LC = "#E8D8A0", seg = (pts, col = LC) => { for (let i = 0; i < pts.length - 1; i++) { const l = clipProj(V, [[pts[i][0], CR_FELT + 0.4, pts[i][1]], [pts[i + 1][0], CR_FELT + 0.4, pts[i + 1][1]]]); if (l.length === 2) c.line(R(l[0][0]), R(l[0][1]), R(l[1][0]), R(l[1][1]), col); } };
  const arcPts = (cx, cz, rx, rz, a0, a1, n = 16) => { const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; out.push([cx + Math.cos(a) * rx, cz + Math.sin(a) * rz]); } return out; };
  for (const s of [-1, 1]) { const ex = x + s * (hw - 60);
    seg(arcPts(ex, z, 40, hd - 26, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5));
    seg(arcPts(ex, z, 28, hd - 38, s > 0 ? -Math.PI / 2 : Math.PI / 2, s > 0 ? Math.PI / 2 : Math.PI * 1.5));
    seg([[ex, z + hd - 26], [x + s * 70, z + hd - 26]]); seg([[ex, z + hd - 38], [x + s * 70, z + hd - 38]]);
    // the field band
    const fp = flatC(V, [[x + s * 70, z + 2], [ex - s * 6, z + 2], [ex - s * 6, z + 22], [x + s * 70, z + 22]], CR_FELT + 0.4); if (fp.length >= 3) fade(c, 0.35).poly(fp, "#0C4A28"); seg([[x + s * 70, z + 2], [ex - s * 6, z + 2]]); seg([[x + s * 70, z + 22], [ex - s * 6, z + 22]]);
    // pass line lettering when the band is big enough
    const [lx, ly, lk] = V.P(x + s * (hw - 100), CR_FELT, z + hd - 32); if (lk > 2.2 && lk < 9 && V.depth(x + s * (hw - 100), CR_FELT, z + hd - 32) > 20) { const txt = "PASS LINE", tw = c.measure(TINY, txt, { scale: lk > 4 ? 2 : 1 }); fade(c, 0.85).text(TINY, txt, R(lx - tw / 2), R(ly - 2 * (lk > 4 ? 2 : 1)), LC, { scale: lk > 4 ? 2 : 1 }); }
  }
  { const box = rrectXZ(x - 62, z - 34, x + 62, z + 30, 6), bp = flatC(V, box, CR_FELT + 0.4); if (bp.length >= 3) fade(c, 0.4).poly(bp, "#0A3A1E"); seg([...box, box[0]]);
    seg([[x - 62, z - 2], [x + 62, z - 2]]); seg([[x, z - 34], [x, z + 30]]); }
  // chip racks in the rail on the far side, and a few player stacks
  { const rs = [CHIP_RAMPS.red, CHIP_RAMPS.green, CHIP_RAMPS.black, CHIP_RAMPS.blue, CHIP_RAMPS.purple, CHIP_RAMPS.yellow];
    for (let i = 0; i < 10; i++) chipStack(c, V, x - 45 + i * 10, CR_RAIL - 2, z - hd + 7, 6 + ((i * 3) % 4), rs[i % 6], { r: 3.4 });
    for (const [dx, dz, n, ri] of [[-118, hd - 32, 3, 0], [-88, hd - 32, 2, 3], [112, hd - 32, 4, 1], [140, hd - 32, 2, 2], [-104, -8, 3, 4], [24, -16, 2, 5]]) chipStack(c, V, x + dx, CR_FELT + 0.5, z + dz, n, rs[ri], { r: 3.6 }); }
  st.onFelt?.(c, V);
}

// ---------------------------------------------------------------- the clear red casino die
const PIPS = { 1: [[0, 0]], 2: [[-0.5, -0.5], [0.5, 0.5]], 3: [[-0.52, -0.52], [0, 0], [0.52, 0.52]], 4: [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]],
  5: [[-0.52, -0.52], [0.52, -0.52], [0, 0], [-0.52, 0.52], [0.52, 0.52]], 6: [[-0.5, -0.55], [0.5, -0.55], [-0.5, 0], [0.5, 0], [-0.5, 0.55], [0.5, 0.55]] };
// die-local faces: n = normal, u / v = face axes (v points "down" on the face), val = the number
export const FACES = [
  { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1], val: 4 },   // top
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1], val: 3 }, // bottom
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, -1, 0], val: 2 },  // front (the calm face)
  { n: [0, 0, -1], u: [-1, 0, 0], v: [0, -1, 0], val: 5 },// back
  { n: [1, 0, 0], u: [0, 0, -1], v: [0, -1, 0], val: 1 }, // right (the serial number lives here)
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, -1, 0], val: 6 }, // left
];
function rotM([yaw, pitch, roll]) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cr = Math.cos(roll), sr = Math.sin(roll);
  // M = Ry(yaw) · Rx(pitch) · Rz(roll)
  const Rz = [[cr, -sr, 0], [sr, cr, 0], [0, 0, 1]], Rx = [[1, 0, 0], [0, cp, -sp], [0, sp, cp]], Ry = [[cy, 0, sy], [0, 1, 0], [-sy, 0, cy]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  return mul(Ry, mul(Rx, Rz));
}
const ap = (M, v) => [M[0][0] * v[0] + M[0][1] * v[1] + M[0][2] * v[2], M[1][0] * v[0] + M[1][1] * v[1] + M[1][2] * v[2], M[2][0] * v[0] + M[2][1] * v[1] + M[2][2] * v[2]];
// «No 0427» bitmap (N, a small raised o, a gap, digits) for the 1-face
const SERIAL = (() => { const rows = 7, glyphs = [MAIN.glyphs.N, [".....", ".....", ".###.", "#...#", ".###.", ".....", "....."], null, MAIN.glyphs["0"], MAIN.glyphs["4"], MAIN.glyphs["2"], MAIN.glyphs["7"]];
  const cols = []; for (const g of glyphs) { if (!g) { cols.push(null, null); continue; } const w = g[0].length; for (let i = 0; i < w; i++) cols.push(g.map((r) => r[i] === "#")); cols.push(null); }
  cols.pop(); return { w: cols.length, h: rows, at: (i, j) => (i >= 0 && i < cols.length && j >= 0 && j < rows && cols[i] ? cols[i][j] : false) }; })();
const DIE = { body: [196, 22, 40], deep: [110, 8, 22], pip: [255, 246, 236], edge: [255, 150, 150] };
/**
 * Draw the die. (x, y, z) = centre of its bottom face in world cm, s = edge length (cm), ang = [yaw, pitch, roll].
 * st = { a, glass: extra see-through 0..1, glint: 0..1 position of the light running along the edges (or −1), serial: 0..1,
 *        eyes: 0..1 (front face = a calm face), blink: 0..1, ghost: true (an opaque fake die: white, rounded, no number), glow }.
 * Returns { cx, cy, r, faces: [{ val, centre: [sx, sy], facing }] }.
 */
export function die3D(c, V, x, y, z, s, ang, st = {}) {
  const a = st.a ?? 1; if (a <= 0) return null;
  const M = rotM(ang), h = s / 2, C = [x, y + h * (st.centerY ?? 1), z];
  const W = (v) => { const r = ap(M, v); return [C[0] + r[0] * h, C[1] + r[1] * h, C[2] + r[2] * h]; };
  const camv = [V.cam.x - C[0], V.cam.y - C[1], V.cam.z - C[2]];
  const faces = FACES.map((F) => { const n = ap(M, F.n), u = ap(M, F.u), v = ap(M, F.v), ctr = [F.n[0], F.n[1], F.n[2]];
    const corner = (su, sv) => P2(V, ...W([ctr[0] + F.u[0] * su + F.v[0] * sv, ctr[1] + F.u[1] * su + F.v[1] * sv, ctr[2] + F.u[2] * su + F.v[2] * sv]));
    const q = [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)], facing = n[0] * camv[0] + n[1] * camv[1] + n[2] * camv[2];
    return { F, n, u, v, q, facing, light: clamp01(0.55 + 0.45 * (n[1] * 0.8 - n[0] * 0.35 + n[2] * 0.3)) }; });
  const all = bbox(faces.flatMap((f) => f.q)); if (!onScreen(all, 20)) return null;
  const cx = (all.x0 + all.x1) / 2, cy = (all.y0 + all.y1) / 2, rr = Math.max(all.x1 - all.x0, all.y1 - all.y0) / 2;
  // contact shadow on the surface
  { const [bx, by, k] = V.P(x, y, z); shadow(c, bx, by, s * 0.75 * k, s * 0.4 * k * Math.max(0.4, V.sp), 0.55 * a); }
  const ghost = !!st.ghost;
  const content = (f, u, v, back) => {
    // u, v in −1..1 → [r, g, b] overlay or null
    const F = f.F; let pips = PIPS[F.val];
    if (F.val === 2 && (st.eyes ?? 0) > 0) { const e = st.eyes; pips = [[lerp(-0.5, -0.42, e), lerp(-0.5, -0.15, e)], [lerp(0.5, 0.42, e), lerp(0.5, -0.15, e)]]; }
    const pr = F.val === 1 ? 0.27 : 0.19;
    for (const [pu, pv] of pips) { const d = Math.hypot(u - pu, v - pv);
      if (F.val === 2 && (st.eyes ?? 0) > 0.3 && !back) { // calm eyes: a lid over the upper half (more during the blink)
        const lid = pv - pr + pr * (1.0 + 0.9 * (st.blink ?? 0)) * st.eyes; if (d < pr && v < lid) return ghost ? null : "lid"; }
      if (d < pr) return d > pr - 0.06 && !back ? "rim" : "pip"; }
    if (F.val === 2 && (st.eyes ?? 0) > 0.3 && !back) { const mv = 0.42, mu = Math.abs(u); if (mu < 0.26 && Math.abs(v - (mv - 0.06 * Math.cos(u * 5))) < 0.06 * st.eyes) return "mouth"; }
    if (F.val === 1 && !back && (st.serial ?? 0) > 0 && !ghost) { const bu = (u + 0.82) / 1.64, bv = (v - 0.44) / 0.32; if (bu >= 0 && bu <= 1 && bv >= 0 && bv <= 1) { const i = Math.floor(bu * SERIAL.w), j = Math.floor(bv * SERIAL.h); if (SERIAL.at(i, j)) return "serial"; } }
    return null;
  };
  const blend = (dst, src, k) => [dst[0] + (src[0] - dst[0]) * k, dst[1] + (src[1] - dst[1]) * k, dst[2] + (src[2] - dst[2]) * k];
  const glassK = ghost ? 1 : 0.42 - 0.16 * (st.glass ?? 0);
  const drawFace = (f, back) => {
    const [p0, p1, , p3] = f.q, ex = [p1[0] - p0[0], p1[1] - p0[1]], ey = [p3[0] - p0[0], p3[1] - p0[1]], det = ex[0] * ey[1] - ex[1] * ey[0];
    if (Math.abs(det) < 0.5) return;
    c.poly(f.q, null, (X, Y) => {
      if (a < 1 && a <= bayer(X, Y)) return null;
      const dx = X + 0.5 - p0[0], dy = Y + 0.5 - p0[1], su = (dx * ey[1] - dy * ey[0]) / det, sv = (ex[0] * dy - ex[1] * dx) / det, u = su * 2 - 1, v = sv * 2 - 1;
      const i = (Y * c.w + X) * 3, bg = [c.d[i], c.d[i + 1], c.d[i + 2]], what = content(f, u, v, back);
      const edgeD = 1 - Math.max(Math.abs(u), Math.abs(v));
      let col;
      if (ghost) { const base = blend([150, 146, 150], [250, 248, 244], f.light); col = what === "pip" || what === "rim" ? [30, 26, 34] : base; if (edgeD < 0.12) col = blend(col, [120, 116, 124], (0.12 - edgeD) / 0.12); }
      else if (back) { col = blend(bg, DIE.deep, 0.42); if (what === "pip" || what === "rim") col = blend(col, [255, 220, 214], 0.42); }
      else {
        col = blend(bg, blend(DIE.deep, DIE.body, f.light), glassK + 0.15);
        if (what === "pip") col = blend([214, 204, 200], DIE.pip, f.light);
        else if (what === "rim") col = [150, 40, 50];
        else if (what === "lid") col = blend(DIE.deep, DIE.body, 0.8 * f.light);
        else if (what === "mouth") col = [120, 18, 30];
        else if (what === "serial") col = blend(col, [255, 226, 150], 0.9 * st.serial);
        if (edgeD < 0.05) col = blend(col, DIE.edge, 0.55 * f.light + 0.2);
      }
      return [R(col[0]), R(col[1]), R(col[2])];
    });
  };
  // back faces first (seen through the body), then the near faces
  const order = faces.slice().sort((p, q) => p.facing - q.facing);
  for (const f of order) if (f.facing <= 0 && !ghost) drawFace(f, true);
  for (const f of order) if (f.facing > 0) drawFace(f, false);
  // sharp edges: 12 edges, bright where both faces are visible, plus a running glint
  const E = []; for (let i = 0; i < 8; i++) { const v = [(i & 1) ? 1 : -1, (i & 2) ? 1 : -1, (i & 4) ? 1 : -1]; E.push(v); }
  const g = fade(c, a), edges = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { let dif = 0; for (let q = 0; q < 3; q++) if (E[i][q] !== E[j][q]) dif++; if (dif === 1) edges.push([i, j]); }
  edges.forEach(([i, j], ei) => {
    const mid = [(E[i][0] + E[j][0]) / 2, (E[i][1] + E[j][1]) / 2, (E[i][2] + E[j][2]) / 2];
    const adj = faces.filter((f) => f.F.n[0] * mid[0] + f.F.n[1] * mid[1] + f.F.n[2] * mid[2] > 0.5), vis = adj.filter((f) => f.facing > 0).length;
    const p = P2(V, ...W(E[i])), q = P2(V, ...W(E[j]));
    const col = ghost ? "#8A8690" : vis === 2 ? "#FFC0B8" : vis === 1 ? "#F07A80" : "#9A3044";
    if (vis === 0 && ghost) return;
    g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), col);
    if (!ghost && vis === 2 && rr > 40) g.line(R(p[0]) + 1, R(p[1]), R(q[0]) + 1, R(q[1]), "#FFE8E0");
    if ((st.glint ?? -1) >= 0 && vis >= 1 && !ghost) { const u = ((st.glint * 12 - ei) % 12 + 12) % 12; if (u < 1) { const gx = lerp(p[0], q[0], u), gy = lerp(p[1], q[1], u); glow(c, gx, gy, 12, 12, "#FFFFFF", 0.8 * a); g.rect(R(gx) - 1, R(gy) - 1, 3, 3, "#FFFFFF"); g.line(R(gx) - 5, R(gy), R(gx) + 5, R(gy), "#FFF4F0"); g.line(R(gx), R(gy) - 5, R(gx), R(gy) + 5, "#FFF4F0"); } }
  });
  if (st.glow) glow(c, cx, cy, rr * 1.8, rr * 1.8, "#FF5060", 0.3 * st.glow * a);
  return { cx, cy, r: rr, faces: faces.map((f) => ({ val: f.F.val, centre: [(f.q[0][0] + f.q[2][0]) / 2, (f.q[0][1] + f.q[2][1]) / 2], facing: f.facing, q: f.q })) };
}

// ---------------------------------------------------------------- the ceiling with camera domes
export const DOME_SPOTS = (() => { const out = [{ x: 650, z: 130, id: -1, ph: 0.3 }, { x: 900, z: 40, id: -2, ph: 0.7 }, { x: 420, z: 20, id: -3, ph: 0.5 }]; for (let zi = 1; zi < 9; zi++) for (let xi = -4; xi <= 7; xi++) { const z = 420 - zi * 230, x = xi * 210 + (zi % 2 ? 105 : 0); if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 150)) continue; out.push({ x, z, id: out.length, ph: rnd(zi * 31 + xi + 7) }); } return out; })();
const CRGB = { wood: RAMP.wood.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]), wall: RAMP.wall.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]), gold: RAMP.gold.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]) };
function putL(d, i, ramp, l, X, Y) { l = l < 0 ? 0 : l > 7 ? 7 : l; const lo = l | 0, idx = l - lo > bayer(X, Y) ? Math.min(7, lo + 1) : lo, col = ramp[idx]; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
const WALL_Z = -1760;
/** Paint the ceiling where the camera ray hits y = CEIL before the back wall. st = { t, lights (0..1 dome LEDs), look: [x, y, z] | null, lookK }. */
export function ceilingPass(c, V, t, st = {}) {
  const { cam } = V, d = c.d, da = 1 / V.f, G = 160;
  for (const s of DOME_SPOTS) s.screen = null;
  let any = false;
  for (let py = 0; py < 960; py++) {
    const [a0, dy, dz] = V.ray(0, py); if (dy <= 0.0005) continue;
    const tc = (CEIL - cam.y) / dy, zc = cam.z + tc * dz; if (zc < WALL_Z) continue;
    any = true;
    for (let px = 0; px < 540; px++) {
      const xw = cam.x + tc * (a0 + px * da), i = (py * 540 + px) * 3;
      const u = xw / G - Math.floor(xw / G), v = zc / G - Math.floor(zc / G), bu = Math.min(u, 1 - u), bv = Math.min(v, 1 - v), m = Math.min(bu, bv);
      // warm wash from the hall's lamps below + the downlight in each coffer
      const cu = u - 0.5, cv = v - 0.5, rl = Math.hypot(cu, cv), dl = Math.exp(-rl * rl / 0.012), fall = 0.35 + 0.65 * Math.exp(-Math.abs(zc - 100) / 1400);
      if (m < 0.06) putL(d, i, CRGB.wood, (1.6 + 1.2 * fall) - (m < 0.015 ? 0.8 : 0), px, py);                    // beams
      else if (m < 0.085) putL(d, i, CRGB.gold, 2.2 + 2.6 * fall, px, py);                                          // gold trim
      else if (rl < 0.05) putL(d, i, CRGB.gold, 7, px, py);                                                          // downlight lens
      else putL(d, i, CRGB.wall, 0.2 + 1.2 * fall + 3.0 * dl * fall + 0.6 * (m - 0.085), px, py);                  // recessed panel
    }
  }
  if (!any) return;
  // downlight glows (cheap: only for coffers near the camera)
  for (let gx = Math.floor((cam.x - 1400) / G); gx <= Math.ceil((cam.x + 1400) / G); gx++) for (let gz = Math.floor((WALL_Z) / G); gz <= Math.ceil((cam.z + 200) / G); gz++) {
    const wx = (gx + 0.5) * G, wz = (gz + 0.5) * G; if (V.depth(wx, CEIL, wz) < 40) continue; const [sx, sy, k] = V.P(wx, CEIL, wz); if (sx < -30 || sx > 570 || sy < -30 || sy > 990) continue;
    glow(c, sx, sy, 26 * k, 26 * k * 0.8, "#FFD890", 0.32);
  }
  // camera domes (far → near)
  const lights = st.lights ?? 1, list = DOME_SPOTS.filter((s) => V.depth(s.x, CEIL, s.z) > 40).sort((p, q) => V.depth(q.x, CEIL, q.z) - V.depth(p.x, CEIL, p.z));
  for (const s of list) dome(c, V, s, t, lights, st);
}
function dome(c, V, s, t, lights, st) {
  const r = 30, { x, z } = s, [mx, my, k] = V.P(x, CEIL, z); if (mx < -60 || mx > 600 || my < -60 || my > 1020 || k < 0.05) return;
  const ring = ringPts(V, x, CEIL - 1, z, r + 5), ringIn = ringPts(V, x, CEIL - 2, z, r);
  c.poly(ring, RAMP.chrome[2]); c.poly(ringIn, RAMP.chrome[4]);
  // the hemisphere: sample its outline (silhouette) by projecting a dense set of points on the lower half
  const pts = []; for (let i = 0; i < 28; i++) { const an = (i / 28) * Math.PI * 2; for (const el of [0, 0.35, 0.7, 1.05, 1.4]) { const yy = CEIL - 2 - Math.sin(el) * r, rr = Math.cos(el) * r; pts.push(P2(V, x + Math.cos(an) * rr, yy, z + Math.sin(an) * rr)); } }
  pts.push(P2(V, x, CEIL - 2 - r, z));
  const hull = convexHull(pts), hb = bbox(hull), hcx = (hb.x0 + hb.x1) / 2, hcy = (hb.y0 + hb.y1) / 2, hr = Math.max(1, (hb.x1 - hb.x0) / 2);
  const [bx, by] = P2(V, x, CEIL - 2 - r * 0.7, z);
  c.poly(hull, null, (X, Y) => { const dx = (X - bx) / hr, dy = (Y - by) / hr, rr2 = dx * dx + dy * dy; return rampAt(RAMP.black, 1.2 + 2.4 * clamp01(1 - rr2) - 0.8 * dy, X, Y); });
  for (let i = 0; i < hull.length; i++) { const p = hull[i], q = hull[(i + 1) % hull.length]; c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#05040A"); }
  // the lens inside the smoked glass: turns toward st.look when given, else slow scanning
  let lx = Math.sin(t * 0.4 + s.ph * 6) * 0.35, ly = 0.25 + 0.15 * Math.cos(t * 0.33 + s.ph * 4);
  if (st.look && (st.lookK ?? 0) > 0) { const [tx, ty] = P2(V, ...st.look), dx = tx - bx, dy = ty - by, n = Math.hypot(dx, dy) || 1; lx = lerp(lx, (dx / n) * 0.45, st.lookK); ly = lerp(ly, (dy / n) * 0.45, st.lookK); }
  const ex = bx + lx * hr * 0.8, ey = by + ly * hr * 0.6, er = Math.max(1, R(hr * 0.26));
  c.disc(R(ex), R(ey), er, "#0A0A14"); if (er >= 2) { c.ring(R(ex), R(ey), er, "#2C2C40"); c.disc(R(ex), R(ey), Math.max(1, R(er * 0.45)), "#1A2A4A"); c.px(R(ex - er * 0.3), R(ey - er * 0.35), "#9AB8E8"); }
  // glass highlight (a curved streak) and a warm reflection
  for (let i = 0; i < 8; i++) { const an = Math.PI * (1.1 + i * 0.06), px = bx + Math.cos(an) * hr * 0.72, py = by + Math.sin(an) * hr * 0.55 - hr * 0.1; c.px(R(px), R(py), i % 3 ? "#8A8AA6" : "#C8C8DE"); }
  c.px(R(bx + hr * 0.42), R(by - hr * 0.05), "#E8B860");
  // red LED (soft pulse, lights up dome by dome)
  const on = lights * (0.75 + 0.25 * Math.sin(t * 3.1 + s.ph * 9)), [lx2, ly2] = [bx + hr * 0.5, by + hr * 0.18];
  if (on > 0.02) { glow(c, lx2, ly2, Math.max(8, hr * 0.9), Math.max(6, hr * 0.7), "#FF2A3A", 0.55 * on); fade(c, Math.min(1, on * 1.3)).rect(R(lx2) - (hr > 14 ? 1 : 0), R(ly2) - (hr > 14 ? 1 : 0), hr > 14 ? 3 : 2, hr > 14 ? 3 : 2, "#FF5A5A"); if (hr > 14) fade(c, on).px(R(lx2), R(ly2), "#FFD0D0"); }
  s.screen = [bx, by, hr];
}
function convexHull(P) {
  const p = P.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = []; for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}

// ---------------------------------------------------------------- a big open hand (screen space)
/** Hand with spread fingers, wrist at (x, y), pointing up; s = px per hand unit (≈ hand height / 20); side 1 = palm, −1 = back. */
export function palm(c, x, y, s, side = 1, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a), sq = Math.max(0.12, Math.abs(o.squeeze ?? 1)), mir = o.mirror ? -1 : 1, skin = RAMP.skin, cuff = RAMP.shirt;
  const T = (u, v) => [x + u * s * sq * mir, y - v * s];
  const poly = (pts, col) => g.poly(pts.map(([u, v]) => T(u, v)), col);
  const outline = (pts) => { const q = pts.map(([u, v]) => T(u, v)); for (let i = 0; i < q.length; i++) { const p0 = q[i], p1 = q[(i + 1) % q.length]; g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), "#3A1A16"); } };
  // shirt cuff
  poly([[-5.5, -3], [5.5, -3], [5.2, 1.5], [-5.2, 1.5]], cuff[6]); outline([[-5.5, -3], [5.5, -3], [5.2, 1.5], [-5.2, 1.5]]);
  const palmP = [[-5, 1], [5, 1], [5.6, 6], [5.4, 10], [-5.4, 10], [-5.8, 6]];
  const fingers = [[-4.1, 10, -0.18, 7], [-1.4, 10.4, -0.05, 8.4], [1.4, 10.4, 0.06, 8.0], [4.1, 10, 0.2, 6.6]];
  const thumb = [[-5.4, 4.5], [-9.4, 8.6], [-8.4, 10], [-4.6, 7.2]];
  const base = side > 0 ? skin[5] : skin[4], shade = skin[3], lite = skin[6];
  poly(thumb, base); outline(thumb);
  for (const [fx, fy, an, L] of fingers) { const ex = fx + Math.sin(an) * L, ey = fy + Math.cos(an) * L, w = 1.25, nx = Math.cos(an) * w, ny = -Math.sin(an) * w;
    const f = [[fx - nx, fy - ny], [fx + nx, fy + ny], [ex + nx, ey + ny], [ex + nx * 0.4, ey + ny * 0.4 + 0.9], [ex - nx * 0.4, ey - ny * 0.4 + 0.9], [ex - nx, ey - ny]];
    poly(f, base); outline(f);
    if (side < 0) { const nl = [[ex - nx * 0.6, ey - ny * 0.6 - 1.6], [ex + nx * 0.6, ey + ny * 0.6 - 1.6], [ex + nx * 0.5, ey + ny * 0.5 + 0.3], [ex - nx * 0.5, ey - ny * 0.5 + 0.3]]; poly(nl, "#F6D6C6"); }
    else { const [kx, ky] = T(fx + Math.sin(an) * L * 0.5, fy + Math.cos(an) * L * 0.5); g.rect(R(kx - s * 0.6), R(ky), Math.max(1, R(s * 1.2)), 1, shade); } }
  poly(palmP, base); outline(palmP);
  if (side > 0) { // palm lines and a lit pad
    const L1 = [T(-4.4, 7.4), T(-1, 6.2), T(3.6, 7.6)], L2 = [T(-4.6, 5), T(-0.6, 3.8)], L3 = [T(-1.6, 2), T(-3.2, 6.6)];
    for (const Lp of [L1, L2, L3]) for (let i = 0; i < Lp.length - 1; i++) g.line(R(Lp[i][0]), R(Lp[i][1]), R(Lp[i + 1][0]), R(Lp[i + 1][1]), shade);
    const [hx, hy] = T(2.6, 4); g.ellipse(R(hx), R(hy), Math.max(1, R(s * 1.6 * sq)), Math.max(1, R(s * 1.2)), lite);
  } else { const [hx, hy] = T(1.5, 6.5); g.ellipse(R(hx), R(hy), Math.max(1, R(s * 2.2 * sq)), Math.max(1, R(s * 1.4)), skin[5]); for (const kx of [-3.6, -1.2, 1.2, 3.6]) { const [px, py] = T(kx, 9.6); g.rect(R(px), R(py), Math.max(1, R(s * 0.8)), 1, shade); } }
}

// ---------------------------------------------------------------- screen-space signs
/** Rotated text stamp with a double frame; scale pops from `pop` to 1; col = ink. */
export function stamp(c, text, cx, cy, scale, col, a, rot = -0.12, o = {}) {
  if (a <= 0) return; const sc = scale, tw = c.measure(MAIN, text, { scale: sc }), th = 7 * sc, padX = 4 * sc, padY = 3 * sc, W = tw + padX * 2, H = th + padY * 2;
  const cr = Math.cos(rot), sr = Math.sin(rot), g = fade(c, a);
  // render into a mask (unrotated), then sample rotated
  const mask = new Uint8Array(W * H); const mc = { px: (x, y, v) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < W && y < H) mask[y * W + x] = v; }, rect(x, y, w, h, v) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, v); } };
  for (let i = 0; i < W; i++) for (const j of [0, 1, H - 2, H - 1]) mc.px(i, j, 1); for (let j = 0; j < H; j++) for (const i of [0, 1, W - 2, W - 1]) mc.px(i, j, 1);
  if (sc >= 3) { for (let i = 4; i < W - 4; i++) for (const j of [4, H - 5]) mc.px(i, j, 1); for (let j = 4; j < H - 4; j++) for (const i of [4, W - 5]) mc.px(i, j, 1); }
  let x0 = padX; for (const ch of text.toUpperCase()) { if (ch === " ") { x0 += (MAIN.space + 1) * sc; continue; } const gl = MAIN.glyphs[ch] ?? MAIN.glyphs["?"]; gl.forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") mc.rect(x0 + i * sc, padY + j * sc, sc, sc, 2); })); x0 += (gl[0].length + 1) * sc; }
  const ext = Math.ceil(Math.hypot(W, H) / 2) + 2;
  for (let Y = -ext; Y <= ext; Y++) for (let X = -ext; X <= ext; X++) {
    const u = X * cr + Y * sr + W / 2, v = -X * sr + Y * cr + H / 2; if (u < 0 || v < 0 || u >= W || v >= H) continue;
    const m = mask[Math.floor(v) * W + Math.floor(u)], px = R(cx) + X, py = R(cy) + Y;
    const wear = ((px * 7 + py * 13) % 11 === 0) && !o.clean;
    if (m && !wear) g.px(px, py, col); else if (o.fill && !m) g.px(px, py, o.fill);
  }
  // outline shadow for legibility
  return { w: W, h: H };
}
/** Round badge with a number (hand totals). */
export function badge(c, txt, cx, cy, a, col = UI.W, bg = "#160E22", ring = RAMP.gold[5], sc = 2) {
  if (a <= 0) return; const g = fade(c, a), tw = c.measure(MAIN, txt, { scale: sc }), r = Math.max(R(tw / 2) + 6, 7 * sc);
  g.disc(R(cx) + 1, R(cy) + 2, r + 1, "#05030A"); g.disc(R(cx), R(cy), r + 1, O); g.disc(R(cx), R(cy), r, ring); g.disc(R(cx), R(cy), r - 2, bg);
  g.text(MAIN, txt, R(cx - tw / 2), R(cy - 3.5 * sc), col, { scale: sc });
}
/** A dark rounded plate with a gold edge and a line of text. */
export function plate(c, txt, cx, cy, sc, a, col = UI.W, edge = RAMP.gold) {
  if (a <= 0) return null; const g = fade(c, a), tw = c.measure(MAIN, txt, { scale: sc }), w = tw + 12 * sc / 2 + 16, h = 7 * sc + 16, x = R(cx - w / 2), y = R(cy - h / 2);
  g.rrect(x + 2, y + 3, w, h, "#05030A", 4); g.rrect(x, y, w, h, edge[2], 4); g.rrect(x + 2, y + 2, w - 4, h - 4, edge[5], 3); g.rrect(x + 4, y + 4, w - 8, h - 8, "#160E22", 2);
  g.text(MAIN, txt, R(cx - tw / 2) + 1, y + 8 + 1, "#000000", { scale: sc }); g.text(MAIN, txt, R(cx - tw / 2), y + 8, col, { scale: sc });
  return { x, y, w, h };
}
/** Comic speech bubble with a tail to (tx, ty). */
export function bubble(c, txt, cx, cy, sc, a, tx, ty, col = "#B81E30") {
  if (a <= 0) return; const g = fade(c, a), tw = c.measure(MAIN, txt, { scale: sc }), w = tw + 20, h = 7 * sc + 18, x = R(cx - w / 2), y = R(cy - h / 2);
  g.rrect(x + 2, y + 3, w, h, "#05030A", 6); g.rrect(x - 2, y - 2, w + 4, h + 4, O, 7);
  g.poly([[cx - 10, y + h - 1], [cx + 4, y + h - 1], [tx, ty]], O); g.poly([[cx - 7, y + h - 3], [cx + 2, y + h - 3], [tx + (tx > cx ? -2 : 2), ty - 3]], "#FFF8E8");
  g.rrect(x, y, w, h, "#FFF8E8", 6); g.text(MAIN, txt, R(cx - tw / 2), y + 9, col, { scale: sc });
}
