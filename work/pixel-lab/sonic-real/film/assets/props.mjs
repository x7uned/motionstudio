// sonic-real · props (new, 2026-10-30, drawn for this film; none copied from the Pac-Man or Mario films or the catalog):
// the portal (a cyan energy ring with a deep-blue starry swirl, in game cells or in fine pixels), the speedometer (a round dial
// with a coloured speed arc, up to two needles and a rolling odometer), the speed ladder (log-scale rungs), brackets, an
// arrow, a dotted fall line, the game-window bezel, the two TV pictures (a police radar gun with a big readout; a blue streak
// breaking the sound barrier with a white shock cone — our own drawings, no film frames), the 6 m loop (a steel track on two
// legs, built up on «add»), speed lines, a blue roll trail, and the blocky green Creeper silhouette (our simple drawing, no
// face, no Mojang art). Presence a dissolves through ordered dither.
import { hex, mix, fade, Canvas, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, clamp01, lerp, h2, BY, TAU } from "../lib/cam.mjs";
import { MAIN, lc, C as HC, plate } from "../lib/hud.mjs";

const O = hex("#0B0812");
export const PR = {
  ring: RG(["#0E3A6A", "#1A7AB8", "#38C2E8", "#9AF0FF", "#FFFFFF"]), swirl: RG(["#060A26", "#0E1A4E", "#1C3488", "#2E58C0", "#5A8CF0"]),
  steel: RG(["#3A4250", "#56606E", "#7A8696", "#A6B0BE", "#D6DCE4"]), track: RG(["#B03A2A", "#D0563A", "#EC7A50", "#FFA070"]),
  creeper: RG(["#1E5A1E", "#2E7A2A", "#46A03A", "#6EC452", "#A2E07A"]),
};
// ---------------------------------------------------------------- portal: cyan ring, deep-blue swirl with star sparks; cell = block size
export function portal(c, cx, cy, rx, ry, t, open = 1, a = 1, cell = 1) {
  if (open <= 0.01 || a <= 0) return;
  const RX = rx * open, RY = ry * (0.25 + 0.75 * open), n = cell;
  const xa = Math.floor((cx - RX * 1.4) / n) * n, xb = cx + RX * 1.4, ya = Math.floor((cy - RY * 1.3) / n) * n, yb = cy + RY * 1.3;
  for (let Y = ya; Y <= yb; Y += n) for (let X = xa; X <= xb; X += n) {
    const i = X + n / 2 - cx, j = Y + n / 2 - cy, q = Math.hypot(i / RX, j / RY); if (q > 1.3) continue;
    const bx = Math.floor(X / n), by = Math.floor(Y / n); let col = null;
    if (q > 1.0) { const g = 0.6 * (1.3 - q) / 0.3 * a * open; if (n > 1) { if (g > bayer(bx, by) + 0.15) col = PR.ring[2]; } else { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) tint(c, X + x, Y + y, PR.ring[3], g, 4); continue; } }
    else if (a < 1 && a <= bayer(bx, by)) continue;
    else if (q > 0.86) { const an = Math.atan2(j, i); col = PR.ring[Math.min(4, 2 + Math.floor(1.99 * (0.5 + 0.5 * Math.sin(an * 5 + t * 9))) + (q < 0.9 ? 1 : 0))]; }
    else if (q > 0.8) col = PR.ring[0];
    else { const an = Math.atan2(j / RY, i / RX), sw = (an / TAU) * 3 - q * 2.6 + t * 1.8, band = 0.5 + 0.5 * Math.sin(sw * TAU), star = h2(bx, by, Math.floor(t * 6)) > 0.985;
      col = star ? hex("#FFFFFF") : pk(PR.swirl, 0.15 + 0.55 * band * q + 0.3 * (1 - q) ** 3, bx, by, n > 1 ? 0.2 : 0.5); }
    if (!col) continue;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) put(c, X + x, Y + y, col);
  }
  if (open > 0.4) for (let k = 0; k < 6; k++) { const an = (k / 6) * TAU - t * (2 + (k % 2)), x = cx + Math.cos(an) * RX * 1.1, y = cy + Math.sin(an) * RY * 1.1, s = Math.max(n, R(RX * 0.06)); fade(c, a * open).rect(R(x - s / 2), R(y - s / 2), s, s, k % 2 ? "#FFFFFF" : "#9AF0FF"); }
}
// ---------------------------------------------------------------- speedometer: a 240° dial; needles [{ v, col }]; odometer value below
export function speedo(c, cx, cy, r, needles, a, o = {}) {
  if (a <= 0) return; const g = fade(c, a), max = o.max ?? 100, A0 = Math.PI * 1.25, SPAN = Math.PI * 1.5, ang = (v) => A0 - SPAN * clamp01(v / max);
  for (let j = -r - 4; j <= r + 4; j++) for (let i = -r - 4; i <= r + 4; i++) { const d = Math.hypot(i, j); if (d > r + 4) continue; g.px(cx + i, cy + j, d > r + 2 ? "#0B0812" : d > r ? (o.edge ?? "#4FC8F0") : d > r - 1 ? "#2A2244" : "#16112A"); }
  // speed arc: blue → yellow → red bands
  for (let s = 0; s <= 1; s += 0.004) { const an = A0 - SPAN * s, col = s < 0.45 ? "#3A78E8" : s < 0.8 ? "#F4CA50" : "#FF5A4A"; for (let w = 3; w < 7; w++) g.px(R(cx + Math.cos(an) * (r - w)), R(cy - Math.sin(an) * (r - w)), col); }
  for (let v = 0; v <= max; v += max / 10) { const an = ang(v); g.line(R(cx + Math.cos(an) * (r - 8)), R(cy - Math.sin(an) * (r - 8)), R(cx + Math.cos(an) * (r - 13)), R(cy - Math.sin(an) * (r - 13)), "#E0CDF8"); }
  for (const nd of needles) { const an = ang(nd.v), nx = cx + Math.cos(an) * (r - 10), ny = cy - Math.sin(an) * (r - 10), gn = fade(c, a * (nd.a ?? 1)); if ((nd.a ?? 1) <= 0) continue;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) gn.line(R(cx + dx), R(cy + dy), R(nx + dx), R(ny + dy), "#0B0812");
    gn.line(R(cx), R(cy), R(nx), R(ny), nd.col); gn.line(R(cx) + 1, R(cy), R(nx) + 1, R(ny), nd.col); }
  g.rect(R(cx) - 4, R(cy) - 4, 9, 9, "#0B0812"); g.rect(R(cx) - 2, R(cy) - 2, 5, 5, "#FDFEED");
}
// ---------------------------------------------------------------- the speed ladder (log scale): rungs [{ txt, v, a, col }]
export function ladder(c, x, y, w, rungs, a, o = {}) {
  if (a <= 0) return; const n = rungs.length, rh = 34, h = n * rh + 14, lmin = Math.log10(o.min ?? 20), lmax = Math.log10(o.max ?? 1500);
  plate(c, x, y, w, h, a, o.edge ?? "#4FC8F0");
  rungs.forEach((r, i) => { if (r.a <= 0) return; const g = fade(c, a * r.a), Y = y + h - 10 - (i + 1) * rh + 6, frac = clamp01((Math.log10(Math.max(1, r.v)) - lmin) / (lmax - lmin)) * clamp01(r.grow ?? 1), bw = R((w - 20) * Math.max(0.04, frac));
    g.rect(x + 10, Y + 18, w - 20, 8, "#2A2244"); g.rect(x + 10, Y + 18, bw, 8, r.col); g.rect(x + 10, Y + 18, bw, 2, mix(r.col, "#FFFFFF", 0.4));
    g.text(MAIN, lc(r.txt), x + 10, Y + 3, "#FDFEED", { scale: 2 }); });
}
// ---------------------------------------------------------------- brackets, arrow, dotted path
export function bracketV(c, x, y0, y1, a, col = "#FDFEED", tick = 8, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), ya = R(Math.min(y0, y1)), yb = R(Math.max(y0, y1));
  g.rect(R(x) - 1, ya - 1, 4, yb - ya + 3, "#0B0812"); g.rect(R(x), ya, 2, yb - ya + 1, col);
  for (const yy of [ya, yb]) { const x0 = dir > 0 ? R(x) : R(x) - tick; g.rect(x0 - 1, yy - 1, tick + 4, 4, "#0B0812"); g.rect(x0, yy, tick + 2, 2, col); }
}
export function bracketH(c, x0, x1, y, a, col = "#FDFEED", tick = 8, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), xa = R(Math.min(x0, x1)), xb = R(Math.max(x0, x1));
  g.rect(xa - 1, R(y) - 1, xb - xa + 3, 4, "#0B0812"); g.rect(xa, R(y), xb - xa + 1, 2, col);
  for (const xx of [xa, xb]) { const y0 = dir > 0 ? R(y) : R(y) - tick; g.rect(xx - 1, y0 - 1, 4, tick + 4, "#0B0812"); g.rect(xx, y0, 2, tick + 2, col); }
}
/** a thick arrow from (x0, y) to (x1, y) (grows with k), head at x1 */
export function arrowH(c, x0, x1, y, a, k = 1, col = "#F4CA50") {
  if (a <= 0 || k <= 0) return; const g = fade(c, a), xe = R(lerp(x0, x1, k)), d = Math.sign(x1 - x0) || 1;
  g.rect(Math.min(x0, xe) - 1, R(y) - 4, Math.abs(xe - x0) + 2, 9, "#0B0812"); g.rect(Math.min(x0, xe), R(y) - 3, Math.abs(xe - x0), 7, col);
  for (let i = 0; i < 12; i++) { g.rect(xe + d * i - (d < 0 ? 1 : 0), R(y) - 12 + i, 1, 25 - 2 * i, "#0B0812"); if (i < 11) g.rect(xe + d * i, R(y) - 10 + i, 1, 21 - 2 * i, col); }
}
/** dotted path through points (screen), growth k */
export function dotted(c, pts, a, col = "#FDFEED", o = {}) {
  if (a <= 0) return; const g = fade(c, a), w = o.w ?? 4, step = o.step ?? 11; let total = 0; const L = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); L.push(d); total += d; }
  const upTo = total * clamp01(o.k ?? 1); let s = 0, next = 0;
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = L[i - 1];
    while (next <= s + d && next <= upTo) { const u = (next - s) / d, x = ax + (bx - ax) * u, y = ay + (by - ay) * u; g.rect(R(x - w / 2) - 1, R(y - w / 2) - 1, w + 2, w + 2, "#0B0812"); g.rect(R(x - w / 2), R(y - w / 2), w, w, col); next += step; }
    s += d; }
}
// ---------------------------------------------------------------- game window bezel (screen rect); inner(c2) draws the content
let TMP = null;
export function gameWindow(c, r, a, inner) {
  if (a <= 0) return; const g = fade(c, a);
  if (inner) { if (!TMP || TMP.w !== c.w || TMP.h !== c.h) TMP = new Canvas(c.w, c.h); TMP.d.set(c.d); TMP.poly = c.poly; inner(TMP);
    for (let y = Math.max(0, r.y0); y < Math.min(c.h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(c.w, r.x1); x++) { if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue; const i = (y * c.w + x) * 3; c.d[i] = TMP.d[i]; c.d[i + 1] = TMP.d[i + 1]; c.d[i + 2] = TMP.d[i + 2]; } }
  const W = r.x1 - r.x0, H = r.y1 - r.y0;
  g.rrect(r.x0 - 8, r.y0 - 8, W + 16, 8, "#0B0812", 2); g.rrect(r.x0 - 8, r.y1, W + 16, 8, "#0B0812", 2); g.rect(r.x0 - 8, r.y0, 8, H, "#0B0812"); g.rect(r.x1, r.y0, 8, H, "#0B0812");
  for (const [x, y, w, h] of [[r.x0 - 6, r.y0 - 6, W + 12, 4], [r.x0 - 6, r.y1 + 2, W + 12, 4], [r.x0 - 6, r.y0 - 6, 4, H + 12], [r.x1 + 2, r.y0 - 6, 4, H + 12]]) g.rect(x, y, w, h, "#3C3A52");
  g.rect(r.x0 - 6, r.y0 - 6, W + 12, 1, "#6E6A8A"); g.rect(r.x1 - 18, r.y1 + 3, 10, 2, "#4FC8F0");
}
// ---------------------------------------------------------------- TV 1: our police radar gun (side view) with a big readout
export function tvRadar(c, s, t, k, mph, a = 1) {
  const W = s.x1 - s.x0, H = s.y1 - s.y0, g = fade(c, a);
  // night road scene: dark sky, road with a moving centre line, motion streaks
  for (let y = s.y0; y < s.y1; y++) for (let x = s.x0; x < s.x1; x++) { const v = (y - s.y0) / H, road = v > 0.62; let col = road ? (Math.abs(v - 0.8) < 0.025 && ((x - s.x0 + t * 260) % 40) < 22 ? [230, 220, 150] : [44, 46, 60]) : [18, 24, 54 + R(30 * v)];
    if (!road && h2(x >> 1, y >> 1, 3) > 0.985) col = [200, 210, 255]; if (a < 1 && a <= bayer(x, y)) continue; put(c, x, y, col); }
  // the gun (side view, pointing left) under the readout: a dark body, a lens, a grip, a hand
  const u = Math.max(1, R(W / 150)), gx = s.x0 + R(W * 0.42), gy = s.y0 + R(H * 0.74);
  g.rect(gx, gy - 7 * u, 46 * u, 14 * u, "#0B0812"); g.rect(gx + u, gy - 6 * u, 44 * u, 12 * u, "#3A3E4C"); g.rect(gx + u, gy - 6 * u, 44 * u, 3 * u, "#5A6070");
  g.rect(gx - 8 * u, gy - 9 * u, 10 * u, 18 * u, "#0B0812"); g.rect(gx - 7 * u, gy - 8 * u, 8 * u, 16 * u, "#2A2E3A"); g.rect(gx - 6 * u, gy - 5 * u, 5 * u, 10 * u, "#8AE0FF");
  g.rect(gx + 26 * u, gy + 6 * u, 12 * u, 22 * u, "#0B0812"); g.rect(gx + 27 * u, gy + 7 * u, 10 * u, 20 * u, "#2A2E3A");
  g.rect(gx + 22 * u, gy + 16 * u, 22 * u, 12 * u, "#0B0812"); g.rect(gx + 23 * u, gy + 17 * u, 20 * u, 10 * u, "#C8906A");
  for (let i = 0; i < 3; i++) { const ph = ((t * 1.6 + i / 3) % 1), rr = 6 * u + ph * 30 * u; for (let an = -0.6; an <= 0.6; an += 0.04) { const x = R(gx - 8 * u - Math.cos(an) * rr), y = R(gy + Math.sin(an) * rr * 0.8); if (x > s.x0 + 2 && y < s.y1 && (1 - ph) * a > bayer(x, y)) put(c, x, y, [138, 224, 255]); } }
  // the big readout: «300 MPH» in red LED digits, rolls up with k
  const pw = R(W * 0.86), ph2 = R(H * 0.44), px = s.x0 + R(W * 0.07), py = s.y0 + R(H * 0.07);
  g.rect(px - 2, py - 2, pw + 4, ph2 + 4, "#0B0812"); g.rect(px, py, pw, ph2, "#2A0C10"); g.rect(px, py, pw, 2, "#4A1A1E");
  const val = String(Math.round(mph * clamp01(k))), sc = Math.max(2, Math.floor((ph2 - 8) / 7)), sc2 = Math.max(1, sc - 2), vw = c.measure(MAIN, "000", { scale: sc }), mw = c.measure(MAIN, "MPH", { scale: sc2 }), x0 = px + R((pw - vw - mw - 3 * sc) / 2);
  g.text(MAIN, val.padStart(3, " "), x0, py + R((ph2 - 7 * sc) / 2), "#FF4A3A", { scale: sc });
  g.text(MAIN, "MPH", x0 + vw + 3 * sc, py + R((ph2 - 7 * sc) / 2) + 7 * (sc - sc2), "#FF8A6A", { scale: sc2 });
}
// ---------------------------------------------------------------- TV 2: a blue streak breaks the sound barrier (white shock cone)
export function tvSound(c, s, t, k, boom, a = 1) {
  const W = s.x1 - s.x0, H = s.y1 - s.y0, g = fade(c, a), hx = s.x0 + R(W * (0.25 + 0.5 * k)), hy = s.y0 + R(H * 0.5);
  for (let y = s.y0; y < s.y1; y++) for (let x = s.x0; x < s.x1; x++) { const v = (y - s.y0) / H; let col = v > 0.78 ? [70, 150, 80] : [96 + R(60 * v), 160 + R(50 * v), 236];
    // the shock cone: two white lines trailing back from the streak's nose
    const dx = hx - x, dy = Math.abs(y - hy), cone = dx > 0 && Math.abs(dy - dx * 0.55) < 1.6 + dx * 0.02 && k > 0.2;
    if (cone && dx < W * 0.9) col = mix(col, [255, 255, 255], 0.9 * clamp01(1 - dx / (W * 0.9)));
    const ring = boom > 0 && Math.abs(Math.hypot(x - hx, (y - hy) * 1.2) - boom * W * 0.5) < 2.2; if (ring) col = mix(col, [255, 255, 255], 0.8 * (1 - boom));
    if (a < 1 && a <= bayer(x, y)) continue; put(c, x, y, col); }
  // the blue streak: a long tapering blue blur with a bright nose
  for (let i = 0; i < W * 0.45; i++) { const x = hx - i, w = Math.max(1, R(7 * (1 - i / (W * 0.45)))); for (let j = -w; j <= w; j++) { const y = hy + j; if (x < s.x0 || (i / (W * 0.45)) > bayer(x, y) + 0.4) continue; g.px(x, y, i < 4 ? "#FFFFFF" : Math.abs(j) < w * 0.4 ? "#7AB0FF" : "#2E5CE6"); } }
}
// ---------------------------------------------------------------- the 6 m loop (steel track with a red running surface, two legs)
export const LOOP = { r: 3.0, rail: 0.28, half: 0.7 };
/** draws the loop centred at (LX, centre height r + 0.15, LZ); build 0..1 grows the ring from the bottom up both sides */
export function loop(c, C, LX, LZ, build, t, part = "all") {
  if (build <= 0) return; const r = LOOP.r, cy = r + 0.15, Zn = LZ + LOOP.half, Zf = LZ - LOOP.half, steps = 120;
  const visible = (th) => { const d = Math.abs(Math.atan2(Math.sin(th), Math.cos(th))); return d <= Math.PI * build + 1e-6; };   // th = 0 at the bottom
  const pt = (th, rr, Z) => [LX + Math.sin(th) * rr, cy - Math.cos(th) * rr, Z];
  // legs + base plates (behind)
  if (part !== "front") { for (const s of [-1, 1]) { const X = LX + s * 1.6, k = clamp01(build * 3); if (k <= 0) continue; box3(c, C, X - 0.12, X + 0.12, 0, cy * k * 0.9, Zf - 0.1, Zf + 0.1, { front: (x, y) => pk(PR.steel, 0.55, x, y), side: (x, y) => pk(PR.steel, 0.3, x, y) }); }
    box3(c, C, LX - 3.4, LX + 3.4, 0, 0.12, Zf - 0.3, Zn + 0.3, { front: (x, y) => pk(PR.steel, 0.4, x, y), top: (x, y) => pk(PR.steel, 0.7, x, y) }); }
  // running surface (inner face of the ring), seen from the camera: far half first
  if (part !== "front") for (let i = 0; i < steps; i++) { const a0 = (i / steps) * TAU, a1 = ((i + 1) / steps) * TAU; if (!visible((a0 + a1) / 2)) continue;
    const top = Math.cos((a0 + a1) / 2) < 0; quad(c, C, [pt(a0, r, Zf), pt(a1, r, Zf), pt(a1, r, Zn), pt(a0, r, Zn)], (x, y) => pk(PR.track, (top ? 0.35 : 0.6) + (i % 4 === 0 ? -0.25 : 0), x, y)); }
  // the far rail (behind the surface) and the near rail ring (in front: the hero rides between them)
  for (const [Z, which] of [[Zf, "back"], [Zn, "front"]]) { if (part !== "all" && part !== which) continue;
    for (let i = 0; i < steps; i++) { const a0 = (i / steps) * TAU, a1 = ((i + 1) / steps) * TAU; if (!visible((a0 + a1) / 2)) continue;
      quad(c, C, [pt(a0, r, Z), pt(a1, r, Z), pt(a1, r + LOOP.rail, Z), pt(a0, r + LOOP.rail, Z)], (x, y) => pk(PR.steel, (Z === Zn ? 0.7 : 0.4) + (Math.cos((a0 + a1) / 2) > 0 ? -0.1 : 0.1) + (i % 10 === 0 ? -0.25 : 0), x, y)); } }
}
/** screen point on the running surface at angle th (0 = bottom, increasing counter-clockwise seen from the camera: up the right side) */
export const loopPt = (C, LX, LZ, th, rr = LOOP.r) => C.P(LX + Math.sin(th) * rr, LOOP.r + 0.15 - Math.cos(th) * rr, LZ);
// ---------------------------------------------------------------- speed lines, the blue roll trail, dust
export function speedLines(c, xBack, y0, y1, L, a, t, dir = 1, col = [255, 255, 245]) {
  if (a <= 0 || L < 4) return;
  for (let i = 0; i < 7; i++) { const y = R(lerp(y0, y1, (i + 0.5) / 7)), ph = (t * 9 + i * 0.37) % 1, len = L * (0.45 + 0.55 * Math.abs(Math.sin(i * 2.1 + 1))) * (0.7 + 0.3 * ph);
    for (let s = 0; s < len; s++) { const x = R(xBack - dir * (6 + s)), k = a * (1 - s / len); if (k <= BY[(y & 3) * 4 + (x & 3)]) continue; put(c, x, y, col); if (i % 2) put(c, x, y + 1, col); } }
}
export function trail(c, pts, a, w = 10) {
  if (a <= 0 || pts.length < 2) return; const n = pts.length;
  for (let i = 1; i < n; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay), k = a * (i / n);
    for (let s = 0; s <= d; s += 1) { const x = ax + (bx - ax) * s / d, y = ay + (by - ay) * s / d, ww = Math.max(1, w * (i / n)); for (let j = -ww; j <= ww; j++) for (let q = -ww; q <= ww; q++) { if (q * q + j * j > ww * ww) continue; const X = R(x + q), Y = R(y + j); if (k * (1 - Math.hypot(q, j) / (ww + 1)) <= BY[(Y & 3) * 4 + (X & 3)]) continue; put(c, X, Y, Math.hypot(q, j) < ww * 0.4 ? [190, 220, 255] : [60, 120, 250]); } } }
}
export function dust(c, x, y, k, u, seed = 1) {
  if (u <= 0 || u >= 1) return; const D = RG(["#9A8C80", "#BEB2A6", "#DED4C8", "#F4EEE6"]);
  for (let i = 0; i < 8; i++) { const side = i % 2 ? 1 : -1, sp = 0.35 + 0.65 * h2(i, 1, seed), dx = side * (0.2 + 0.7 * sp * (1 - (1 - u) ** 2)) * k, r = (0.05 + 0.08 * sp) * k * (0.6 + 0.6 * u), a = 1 - u, px = x + dx, py = y - 0.08 * k * u * (1 + sp);
    for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let ii = -Math.ceil(r); ii <= Math.ceil(r); ii++) { const q = Math.hypot(ii, j * 1.4) / r; if (q > 1 || a <= BY[((R(py + j)) & 3) * 4 + (R(px + ii) & 3)]) continue; put(c, R(px + ii), R(py + j), pk(D, 0.7 - 0.3 * q - j / r * 0.2, R(px + ii), R(py + j))); } }
}
// ---------------------------------------------------------------- the Creeper silhouette (our own blocky drawing, flat greens, no face)
export const CREEPER = [
  "..gggggggg..",
  "..gGgggGgg..",
  "..ggggggGg..",
  "..gGggggggg.",
  "..gggggGgg..",
  "..ggGggggg..",
  "..gggggggg..",
  "..dddddddd..",
  "...gGgggg...",
  "...ggggGg...",
  "...gggggg...",
  "...gGgggg...",
  "...ggggGg...",
  "...gggggg...",
  "...gGgggg...",
  "...dddddd...",
  ".gggg..gggg.",
  ".gGgg..ggGg.",
  ".gggg..gggg.",
  ".dddd..dddd.",
];
export function creeper(c, x0, y0, n, a = 1, clip = null) {
  for (let j = 0; j < CREEPER.length; j++) for (let i = 0; i < CREEPER[j].length; i++) { const ch = CREEPER[j][i]; if (ch === ".") continue; if (a < 1 && a <= bayer(i + 1, j + 3)) continue;
    const col = ch === "g" ? PR.creeper[2] : ch === "G" ? PR.creeper[3] : PR.creeper[0];
    for (let y = y0 + j * n; y < y0 + (j + 1) * n; y++) for (let x = x0 + i * n; x < x0 + (i + 1) * n; x++) if (!clip || clip(x, y)) put(c, x, y, col); }
}
