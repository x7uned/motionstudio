// pacman-real · props (new, 2026-10-29, drawn for this film): the swirl portal (drawn in sprite cells in the maze, in fine
// pixels in our city), the speed gauge with one or two needles, the countdown ring, measuring brackets (vertical/horizontal),
// a dotted route line, a solid route line, the arcade game-window frame, a floor scale with a display, a small hatchback in
// 3/4 view, the 1 m «big dot» ball, an anger glow, landing dust and speed streaks. Presence a dissolves through ordered dither.
import { hex, mix, fade, Canvas, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, clamp01, lerp, h2, BY, TAU } from "../lib/cam.mjs";

const O = hex("#0B0812");
export const PR = {
  swirl: RG(["#14062E", "#3A0E6A", "#7A1EB4", "#C83ADC", "#FF7AE8", "#FFE0FA"]), rim: RG(["#2A0A4A", "#9A3AE8", "#FF9AF0", "#FFFFFF"]),
  steel: RG(["#3E424C", "#5E6470", "#8A909C", "#B6BCC6", "#E2E6EC"]), led: hex("#FF4A3A"), ledBg: hex("#1A0E10"),
  ball: RG(["#B0603E", "#E08E6A", "#FFB89A", "#FFDCC8", "#FFF6EE"]), dust: RG(["#9A8C80", "#BEB2A6", "#DED4C8", "#F4EEE6"]),
};

// ---------------------------------------------------------------- portal: a magenta vortex with a bright rim; cell = block size
export function portal(c, cx, cy, rx, ry, t, open = 1, a = 1, cell = 1) {
  if (open <= 0.01 || a <= 0) return;
  const RX = rx * open, RY = ry * (0.3 + 0.7 * open), n = cell;
  const xa = Math.floor((cx - RX * 1.4) / n) * n, xb = cx + RX * 1.4, ya = Math.floor((cy - RY * 1.35) / n) * n, yb = cy + RY * 1.35;
  for (let Y = ya; Y <= yb; Y += n) for (let X = xa; X <= xb; X += n) {
    const i = X + n / 2 - cx, j = Y + n / 2 - cy, q = Math.hypot(i / RX, j / RY); if (q > 1.32) continue;
    const bx = Math.floor(X / n), by = Math.floor(Y / n);
    let col = null;
    if (q > 1.0) { if (n > 1) { if (q < 1.12 && 0.55 * (1.12 - q) / 0.12 * a * open > bayer(bx, by)) col = PR.rim[1]; } else { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) tint(c, X + x, Y + y, PR.swirl[4], 0.45 * (1.32 - q) / 0.32 * a * open, 4); continue; } }
    else if (a < 1 && a <= bayer(bx, by)) continue;
    else if (q > 0.9) col = PR.rim[Math.floor(2 + 1.99 * (0.5 + 0.5 * Math.sin(Math.atan2(j, i) * 4 - t * 7)))];
    else if (q > 0.84) col = O;
    else { const ang = Math.atan2(j / RY, i / RX), sw = (ang / TAU) * 4 + q * 3.2 - t * 2.2, band = 0.5 + 0.5 * Math.sin(sw * TAU); col = pk(PR.swirl, 0.12 + 0.5 * band * (0.35 + 0.65 * q) + 0.45 * (1 - q) ** 4, bx, by, n > 1 ? 0.2 : 0.5); }
    if (!col) continue;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) put(c, X + x, Y + y, col);
  }
  // sparks circling the rim (squares the size of a cell)
  if (open > 0.3) for (let k = 0; k < 8; k++) { const an = (k / 8) * TAU + t * (1.4 + (k % 3) * 0.5), x = cx + Math.cos(an) * RX * 1.08, y = cy + Math.sin(an) * RY * 1.08, s = Math.max(n, R(RX * 0.05)); const g = fade(c, a * open); g.rect(R(x - s / 2), R(y - s / 2), s, s, k % 2 ? "#FFE0FA" : "#FF7AE8"); }
}

// ---------------------------------------------------------------- speed gauge (screen): needles [{ v, col }], 0..max km/h
export function gauge(c, cx, cy, r, needles, a, o = {}) {
  if (a <= 0) return; const g = fade(c, a), max = o.max ?? 40, ang = (q) => Math.PI * (1 - q);
  // a half-round dial with a flat base: dark outline, coloured rim, dark face, ticks, coloured arc band near the top speed
  const half = (rr, col) => { for (let j = -Math.ceil(rr); j <= 4; j++) for (let i = -Math.ceil(rr); i <= Math.ceil(rr); i++) if (i * i + j * j <= rr * rr) g.px(R(cx + i), R(cy + j), col); };
  half(r + 4, "#0B0812"); half(r + 2, o.edge ?? "#F4CA50"); half(r, "#16112A");
  for (let i = 0; i <= Math.ceil(r * 3.2); i++) { const q = i / Math.ceil(r * 3.2), an = ang(q); if (q * max < (o.red ?? 35)) continue; for (let w = 2; w < 5; w++) g.px(R(cx + Math.cos(an) * (r - w)), R(cy - Math.sin(an) * (r - w)), "#C83A2E"); }
  for (let v = 0; v <= max; v += 5) { const q = v / max, an = ang(q), L = v % 10 === 0 ? 9 : 5; g.line(R(cx + Math.cos(an) * (r - 3)), R(cy - Math.sin(an) * (r - 3)), R(cx + Math.cos(an) * (r - 3 - L)), R(cy - Math.sin(an) * (r - 3 - L)), "#E0CDF8"); }
  for (const nd of needles) { const q = clamp01(nd.v / max), an = ang(q), nx = cx + Math.cos(an) * (r - 8), ny = cy - Math.sin(an) * (r - 8), na = a * (nd.a ?? 1); if (na <= 0) continue; const gn = fade(c, na);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [2, 0]]) gn.line(R(cx + dx), R(cy + dy), R(nx + dx), R(ny + dy), "#0B0812");
    gn.line(R(cx), R(cy), R(nx), R(ny), nd.col); gn.line(R(cx) + 1, R(cy), R(nx) + 1, R(ny), nd.col); }
  g.disc(R(cx), R(cy), 5, "#0B0812"); g.disc(R(cx), R(cy), 3, "#FDFEED");
}
/** countdown / count-up ring (screen): fill 0..1 */
export function ring(c, cx, cy, r, fill, a, col = "#F4CA50") {
  if (a <= 0) return; const g = fade(c, a); g.disc(cx, cy, r + 4, "#0B0812"); g.disc(cx, cy, r + 2, "#16112A");
  for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d > r || d < r - 6) continue; let an = Math.atan2(i, -j) / TAU; if (an < 0) an += 1; if (an >= fill) continue; g.px(cx + i, cy + j, col); }
}
/** vertical bracket (screen) from y0 to y1 at x, ticks pointing right (dir 1) or left */
export function bracketV(c, x, y0, y1, a, col = "#FDFEED", tick = 8, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), ya = R(Math.min(y0, y1)), yb = R(Math.max(y0, y1));
  g.rect(R(x) - 1, ya - 1, 4, yb - ya + 3, "#0B0812"); g.rect(R(x), ya, 2, yb - ya + 1, col);
  for (const yy of [ya, yb]) { const x0 = dir > 0 ? R(x) : R(x) - tick; g.rect(x0 - 1, yy - 1, tick + 4, 4, "#0B0812"); g.rect(x0, yy, tick + 2, 2, col); }
}
/** horizontal bracket (screen) from x0 to x1 at y, ticks pointing down (dir 1) or up */
export function bracketH(c, x0, x1, y, a, col = "#FDFEED", tick = 8, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), xa = R(Math.min(x0, x1)), xb = R(Math.max(x0, x1));
  g.rect(xa - 1, R(y) - 1, xb - xa + 3, 4, "#0B0812"); g.rect(xa, R(y), xb - xa + 1, 2, col);
  for (const xx of [xa, xb]) { const y0 = dir > 0 ? R(y) : R(y) - tick; g.rect(xx - 1, y0 - 1, 4, tick + 4, "#0B0812"); g.rect(xx, y0, 2, tick + 2, col); }
}
/** a route line through points (screen); dotted (dash/gap px) or solid; growth k (0..1 of the length) */
export function route(c, pts, a, col, o = {}) {
  if (a <= 0 || pts.length < 2) return; const g = fade(c, a), w = o.w ?? 3, dash = o.dash ?? 0, gap = o.gap ?? 0;
  let total = 0; const L = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); total += d; }
  const upTo = total * clamp01(o.k ?? 1); let s = 0;
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = L[i - 1];
    for (let u = 0; u <= d; u += 0.5) { const S = s + u; if (S > upTo) return; if (dash && (S % (dash + gap)) > dash) continue; const x = ax + ((bx - ax) * u) / d, y = ay + ((by - ay) * u) / d;
      g.rect(R(x - w / 2) - 1, R(y - w / 2) - 1, w + 2, w + 2, "#0B0812"); }
    for (let u = 0; u <= d; u += 0.5) { const S = s + u; if (S > upTo) break; if (dash && (S % (dash + gap)) > dash) continue; const x = ax + ((bx - ax) * u) / d, y = ay + ((by - ay) * u) / d; g.rect(R(x - w / 2), R(y - w / 2), w, w, col); }
    s += d; }
}

// ---------------------------------------------------------------- the arcade game window (screen rect); inner(c2) draws content
let TMP = null;
export function gameFrame(c, r, a, inner) {
  if (a <= 0) return; const g = fade(c, a);
  if (inner) { if (!TMP || TMP.w !== c.w || TMP.h !== c.h) TMP = new Canvas(c.w, c.h); TMP.d.set(c.d); TMP.poly = c.poly;
    for (let y = Math.max(0, r.y0); y < Math.min(c.h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(c.w, r.x1); x++) { const i = (y * c.w + x) * 3; TMP.d[i] = 6; TMP.d[i + 1] = 5; TMP.d[i + 2] = 16; }
    inner(TMP);
    for (let y = Math.max(0, r.y0); y < Math.min(c.h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(c.w, r.x1); x++) { if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue; const i = (y * c.w + x) * 3; c.d[i] = TMP.d[i]; c.d[i + 1] = TMP.d[i + 1]; c.d[i + 2] = TMP.d[i + 2]; } }
  // a chunky cabinet bezel: dark outline, blue body with a light top edge, magenta corner studs
  const W = r.x1 - r.x0, H = r.y1 - r.y0;
  g.rrect(r.x0 - 9, r.y0 - 9, W + 18, 9, "#0B0812", 2); g.rrect(r.x0 - 9, r.y1, W + 18, 9, "#0B0812", 2); g.rect(r.x0 - 9, r.y0, 9, H, "#0B0812"); g.rect(r.x1, r.y0, 9, H, "#0B0812");
  for (const [x, y, w, h] of [[r.x0 - 7, r.y0 - 7, W + 14, 5], [r.x0 - 7, r.y1 + 2, W + 14, 5], [r.x0 - 7, r.y0 - 7, 5, H + 14], [r.x1 + 2, r.y0 - 7, 5, H + 14]]) g.rect(x, y, w, h, "#3448F0");
  g.rect(r.x0 - 7, r.y0 - 7, W + 14, 1, "#8A9AFF"); g.rect(r.x0 - 1, r.y0 - 1, W + 2, 1, "#1A1E60"); g.rect(r.x0 - 1, r.y0, 1, H, "#1A1E60");
  for (const [x, y] of [[r.x0 - 6, r.y0 - 6], [r.x1 + 3, r.y0 - 6], [r.x0 - 6, r.y1 + 3], [r.x1 + 3, r.y1 + 3]]) g.rect(x, y, 3, 3, "#FF7AE8");
}

// ---------------------------------------------------------------- a floor scale (3D, camera C): platform + post + display box
export function floorScale(c, C, X0, X1, Z0, Z1, o = {}) {
  const st = PR.steel, chk = (x, y) => pk(st, 0.62 + (((x >> 1) + (y >> 1)) % 2 ? 0.08 : -0.04), x, y);
  box3(c, C, X0, X1, 0, 0.12, Z0, Z1, { front: (x, y) => pk(st, 0.42, x, y), top: chk, side: (x, y) => pk(st, 0.3, x, y) });
  // post at the back-right corner + display box
  const px = o.postX ?? X1 - 0.12, pz = Z0 + 0.1, H = o.postH ?? 1.25;
  box3(c, C, px - 0.04, px + 0.04, 0.12, H, pz - 0.04, pz + 0.04, { front: (x, y) => pk(st, 0.55, x, y), side: (x, y) => pk(st, 0.3, x, y) });
  box3(c, C, px - 0.3, px + 0.3, H, H + 0.32, pz - 0.06, pz + 0.06, { front: (x, y) => pk(st, 0.7, x, y), top: (x, y) => pk(st, 0.85, x, y), side: (x, y) => pk(st, 0.35, x, y) });
  const [dx0, dy0] = C.P(px - 0.24, H + 0.27, pz + 0.07), [dx1, dy1] = C.P(px + 0.24, H + 0.05, pz + 0.07);
  for (let y = R(dy0); y < R(dy1); y++) for (let x = R(dx0); x < R(dx1); x++) put(c, x, y, PR.ledBg);
  // LED segments flicker while the load changes, then hold (no digits: the chip carries the number)
  const live = o.live ?? 0, segs = 4, sw = (dx1 - dx0 - 6) / segs;
  for (let s = 0; s < segs; s++) { const on = (o.level ?? 0) * segs > s + 0.2; const fl = live > 0 ? 0.5 + 0.5 * Math.sin((o.t ?? 0) * 25 + s * 2) : 1; if (!on) continue;
    for (let y = R(dy0) + 3; y < R(dy1) - 3; y++) for (let x = R(dx0 + 3 + s * sw); x < R(dx0 + 3 + (s + 0.7) * sw); x++) put(c, x, y, fl > 0.4 ? PR.led : hex("#7A2018")); }
  return { top: C.P(px, H + 0.32, pz) };
}
/** a small hatchback in 3/4 view: length along X (X0..X0+L), body Z0..Z1 (Z1 = the near side), colour ramp */
export function car3(c, C, X0, Z0, Z1, body = RG(["#5A1A2A", "#8A2A3E", "#B8445A", "#E07A8A"]), o = {}) {
  const L = o.L ?? 3.6, Y0 = (o.lift ?? 0) + 0.28, glass = RG(["#1A2232", "#2A3448", "#46587A", "#8EA6C8"]), X1 = X0 + L;
  // wheels behind the body bottom
  for (const wx of [X0 + 0.65, X1 - 0.65]) { const [x, y] = C.P(wx, Y0, Z1), r = 0.3 * C.k(Z1); for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) { const q = Math.hypot(i, j) / r; if (q > 1) continue; put(c, R(x + i), R(y + j), q < 0.45 ? pk(PR.steel, 0.7 - j / r * 0.2, R(x + i), R(y + j)) : q < 0.55 ? hex("#2A2A30") : hex("#16161C")); } }
  // lower body + bonnet slope + cabin
  box3(c, C, X0, X1, Y0, Y0 + 0.62, Z0, Z1, { front: (x, y) => { const Y = C.wY(y, Z1); return pk(body, Y > Y0 + 0.5 ? 0.85 : Y < Y0 + 0.12 ? 0.25 : 0.58 - (Y < Y0 + 0.3 ? 0.08 : 0), x, y); }, top: (x, y) => pk(body, 0.8, x, y), side: (x, y) => pk(body, 0.35, x, y) });
  const cx0 = X0 + 0.95, cx1 = X1 - 0.45, Yc = Y0 + 0.62, Yt = Yc + 0.55;
  quad(c, C, [[cx0, Yc, Z1 - 0.08], [cx1, Yc, Z1 - 0.08], [cx1 - 0.15, Yt, Z1 - 0.15], [cx0 + 0.35, Yt, Z1 - 0.15]], (x, y) => { const X = C.wX(x, Z1 - 0.1), pillar = Math.abs(X - (cx0 + cx1) / 2 - 0.1) < 0.06 || X < cx0 + 0.12 + (C.wY(y, Z1) - Yc) * 0.6 || X > cx1 - 0.1; return pillar ? pk(body, 0.5, x, y) : pk(glass, 0.35 + 0.4 * ((X * 2 + C.wY(y, Z1) * 3) % 1 < 0.25 ? 1 : 0), x, y); });
  quad(c, C, [[cx0 + 0.35, Yt, Z0 + 0.1], [cx1 - 0.15, Yt, Z0 + 0.1], [cx1 - 0.15, Yt, Z1 - 0.15], [cx0 + 0.35, Yt, Z1 - 0.15]], (x, y) => pk(body, 0.9, x, y));
  // lights and a door seam
  { const [x, y] = C.P(X1 - 0.05, Y0 + 0.45, Z1); for (let j = 0; j < 3; j++) for (let i = -3; i < 0; i++) put(c, R(x) + i, R(y) + j, hex("#FFF4C8")); }
  { const [x, y] = C.P(X0 + 0.02, Y0 + 0.45, Z1); for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) put(c, R(x) + i, R(y) + j, hex("#E83A3A")); }
  { const [x, y0] = C.P((cx0 + cx1) / 2 + 0.1, Y0 + 0.58, Z1), [, y1] = C.P(0, Y0 + 0.1, Z1); for (let y = R(y0); y < R(y1); y++) put(c, R(x), y, body[0]); }
}
/** the big dot: a 1 m peach ball on the ground at (X, Z) that pulses (glow + highlight), presence a */
export function bigBall(c, C, X, Z, t, a = 1, dm = 1.05) {
  if (a <= 0) return; const k = C.k(Z), [cx, cy] = C.P(X, dm / 2, Z), r = (dm / 2) * k, pulse = 0.5 + 0.5 * Math.sin(t * 6);
  for (let j = -Math.ceil(r * 1.5); j <= Math.ceil(r * 1.5); j++) for (let i = -Math.ceil(r * 1.5); i <= Math.ceil(r * 1.5); i++) {
    const q = Math.hypot(i, j) / r, x = R(cx + i), y = R(cy + j);
    if (q > 1) { if (q < 1.5) tint(c, x, y, PR.ball[3], (0.25 + 0.2 * pulse) * (1.5 - q) / 0.5 * a, 4); continue; }
    if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue;
    const z = Math.sqrt(1 - q * q), lit = 0.35 + 0.45 * z - (i / r) * 0.15 - (j / r) * 0.25 + 0.1 * pulse; put(c, x, y, q > 0.96 ? PR.ball[0] : pk(PR.ball, lit, x, y));
  }
  const hx = R(cx - r * 0.35), hy = R(cy - r * 0.4), hr = Math.max(2, R(r * 0.14)); for (let j = -hr; j <= hr; j++) for (let i = -hr; i <= hr; i++) if (i * i + j * j <= hr * hr && a > BY[((hy + j) & 3) * 4 + ((hx + i) & 3)]) put(c, hx + i, hy + j, PR.ball[4]);
}
/** a red anger glow (screen ellipse) behind a sprite, k = strength 0..1 */
export function glow(c, x, y, rx, ry, k, t, col = "#FF3A2A") {
  if (k <= 0) return; const rgb = hex(col);
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) { const q = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (q > 1) continue; const w = 0.55 + 0.25 * Math.sin(t * 9 + q * 4); tint(c, R(x + i), R(y + j), rgb, k * (1 - q) * w, 4); }
}
/** landing dust puffs along the ground (screen centre x, y; scale k px per metre; u 0..1 progress) */
export function dust(c, x, y, k, u, seed = 1) {
  if (u <= 0 || u >= 1) return;
  for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, sp = 0.35 + 0.65 * h2(i, 1, seed), dx = side * (0.25 + 0.9 * sp * (1 - (1 - u) ** 2)) * k, r = (0.06 + 0.1 * sp) * k * (0.6 + 0.6 * u), a = 1 - u;
    const px = x + dx, py = y - 0.08 * k * u * (1 + sp); for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let ii = -Math.ceil(r); ii <= Math.ceil(r); ii++) { const q = Math.hypot(ii, j * 1.4) / r; if (q > 1 || a <= BY[((R(py + j)) & 3) * 4 + (R(px + ii) & 3)]) continue; put(c, R(px + ii), R(py + j), pk(PR.dust, 0.7 - 0.3 * q - j / r * 0.2, R(px + ii), R(py + j))); } }
}
/** speed streaks behind a running sprite (screen): length L px, rows around y0..y1, presence a */
export function streaks(c, xBack, y0, y1, L, a, t, dir = 1) {
  if (a <= 0 || L < 4) return;
  for (let i = 0; i < 6; i++) { const y = R(lerp(y0, y1, (i + 0.5) / 6)), ph = (t * 7 + i * 0.37) % 1, len = L * (0.5 + 0.5 * Math.sin(i * 2.1 + 1)) * (0.7 + 0.3 * ph), x0 = xBack - dir * 6;
    for (let s = 0; s < len; s++) { const x = R(x0 - dir * s), k = a * (1 - s / len); if (k <= BY[(y & 3) * 4 + (x & 3)]) continue; put(c, x, y, [255, 255, 240]); if (i % 2) put(c, x, y + 1, [255, 255, 240]); } }
}
