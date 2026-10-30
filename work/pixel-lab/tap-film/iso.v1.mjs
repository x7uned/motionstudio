// Isometric dioramas that grow out of the globe: Tokyo (day: café + street + the shop's bank) and London (night: your bank).
// Everything is a function of (screen anchor, scale U, state) so the camera can zoom continuously.
import { mix, MAIN, TINY, fade } from "../pixel.mjs";

const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", GR = "#65DA41", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056";
const p1 = "#1D1628", p2 = "#2A1F40", p3 = "#3B2C5C", p4 = "#523D82", p5 = "#6E4FB0", p6 = P, p7 = "#B08AE8", p8 = L;
export const COLORS = { O, CARD, IV, Y, YL, GR, MU, L, P, PK, p1, p2, p3, p4, p5, p6, p7, p8 };
const vgrad = (a, b, y0, y1) => (x, y) => mix(a, b, Math.max(0, Math.min(1, (y - y0) / ((y1 - y0) || 1))));

export function iso(c, ox, oy, U) {
  const P3 = (x, y, z) => [ox + (x - y) * U, oy + ((x + y) / 2 - z) * U];
  const quad = (pts, col, shade) => c.poly(pts.map((p) => P3(...p)), col, shade);
  const seg = (a, b, col, dash) => { const [x0, y0] = P3(...a), [x1, y1] = P3(...b); c.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), col, dash); };
  function box(x, y, z, w, d, h, { top, left, right, hi, grad = 0.2 }) {
    const yl = [P3(x, y + d, z + h)[1], P3(x + w, y + d, z)[1]], yr = [P3(x + w, y, z + h)[1], P3(x + w, y + d, z)[1]];
    quad([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left, grad ? vgrad(left, mix(left, O, grad), yl[0], yl[1]) : undefined);
    quad([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right, grad ? vgrad(right, mix(right, O, grad), yr[0], yr[1]) : undefined);
    quad([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top);
    if (hi && U >= 0.6) { seg([x, y + d, z + h], [x + w, y + d, z + h], hi); seg([x + w, y, z + h], [x + w, y + d, z + h], hi); }
  }
  // Faces of a box for wall decals: left face = plane y = const (facing +y), right face = plane x = const.
  const onLeft = (y, x0, x1, z0, z1, col, shade) => quad([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], col, shade);
  const onRight = (x, y0, y1, z0, z1, col, shade) => quad([[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]], col, shade);
  return { P3, quad, seg, box, onLeft, onRight, U };
}
const M = {
  purple: { top: p6, left: p5, right: p4, hi: p7 }, dark: { top: p4, left: p3, right: p2, hi: p5 }, deep: { top: p3, left: p2, right: p1, hi: p4 },
  lav: { top: p8, left: p7, right: p5, hi: IV }, warm: { top: "#7A5A8C", left: "#5E4472", right: "#45325A", hi: "#A07EB4" },
};
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
export function along(pts, k) {
  const seglen = []; let total = 0;
  for (let i = 0; i + 1 < pts.length; i++) { const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1], (pts[i + 1][2] ?? 0) - (pts[i][2] ?? 0)); seglen.push(l); total += l; }
  let d = clamp01(k) * total;
  for (let i = 0; i < seglen.length; i++) { if (d <= seglen[i] || i === seglen.length - 1) { const f = seglen[i] ? clamp01(d / seglen[i]) : 0; return pts[i].map((v, j) => lerp(v, pts[i + 1][j], f)); } d -= seglen[i]; }
  return pts[pts.length - 1];
}
export function packetSprite(c, x, y, s, { green = false, lock = false } = {}) {
  // envelope scaled by integer-ish s (1..2), drawn centred at x,y
  const w = Math.max(5, Math.round(13 * s)), h = Math.max(4, Math.round(9 * s)), x0 = Math.round(x - w / 2), y0 = Math.round(y - h / 2);
  const body = green ? GR : Y, edge = green ? "#3E8F28" : "#B88A2A", hi = green ? "#B6F79A" : IV;
  c.rect(x0 - 1, y0 - 1, w + 2, h + 2, O); c.rect(x0, y0, w, h, body); c.rect(x0, y0, w, 1, hi);
  c.line(x0, y0, Math.round(x0 + w / 2), Math.round(y0 + h * 0.6), edge); c.line(x0 + w - 1, y0, Math.round(x0 + w / 2), Math.round(y0 + h * 0.6), edge);
  if (lock) { const lx = x0 + w - Math.round(3 * s), ly = y0 + h - Math.round(3 * s), q = Math.max(3, Math.round(5 * s)); c.rect(lx - 1, ly - 1, q + 2, q + 1, O); c.rect(lx, ly, q, q - 1, P); c.rect(lx + 1, ly - Math.round(2 * s), q - 2, Math.round(2 * s), L); c.px(lx + Math.floor(q / 2), ly + 1, O); }
}

// ---------------------------------------------------------------- Tokyo (day)
export const TOKYO = {
  // route of the request inside Tokyo: terminal → café floor → street → bank door (iso units, z)
  route: [[55, 24, 26], [55, 44, 1], [55, 80, 1], [93, 80, 1], [93, 56, 1], [124, 56, 1], [124, 46, 1]],
  terminal: [55, 24, 26], bankTop: [127, 27, 132], hand: [41, 44, 34], tally: [40, 30, 80],
};
export function drawTokyo(c, ax, ay, U, st, sprites) {
  const ox = ax - 20 * U, oy = ay - 30 * U, I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I;
  // ground shadow
  { const [sx, sy] = P3(75, 55, -10); c.ellipse(Math.round(sx), Math.round(sy + 6 * U), Math.round(130 * U), Math.round(40 * U), "#0A0714"); }
  // slab + zones
  box(0, 0, -8, 150, 110, 8, { top: "#3A3252", left: p3, right: p2, hi: p5, grad: 0 });
  quad([[0, 0, 0], [80, 0, 0], [80, 70, 0], [0, 70, 0]], "#5A4268");                         // café wood floor
  if (U > 0.5) for (let y = 4; y < 70; y += 6) seg([0, y, 0], [80, y, 0], "#4E395C");
  quad([[84, 0, 0], [104, 0, 0], [104, 110, 0], [84, 110, 0]], "#1C1828");                    // road
  if (U > 0.5) for (let y = 4; y < 110; y += 12) seg([94, y, 0], [94, y + 6, 0], "#5C5470");
  quad([[0, 74, 0], [80, 74, 0], [80, 110, 0], [0, 110, 0]], "#433A5C");                      // sidewalk
  if (U > 0.7) for (let x = 6; x < 80; x += 10) seg([x, 74, 0], [x, 110, 0], "#3A3252");
  // route on the ground (lit up to the packet)
  if (st.route > 0) {
    const n = 90;
    for (let i = 0; i <= n; i++) { const k = i / n; if (k > st.route) break; if (i % 3) continue; const [x, y, z] = along(TOKYO.route, k); const [sx, sy] = P3(x, y, z); c.rect(Math.round(sx), Math.round(sy), U > 1 ? 2 : 1, 1, k > st.route - 0.06 ? YL : Y); }
  }
  // café walls
  box(-4, -4, 0, 84, 4, 58, { top: p5, left: "#4A3460", right: p3, hi: p7, grad: 0 });
  box(-4, 0, 0, 4, 70, 58, { top: p5, left: p3, right: "#563C6C", hi: p7, grad: 0 });
  onLeft(0, 0, 80, 0, 4, p3); onRight(0, 0, 70, 0, 4, p3);
  // menu board + sign on the back wall
  onLeft(0, 30, 62, 30, 46, O); onLeft(0, 32, 60, 32, 44, "#1A1430");
  if (U > 0.8) for (let z = 35; z < 43; z += 3) { seg([34, 0, z], [46, 0, z], p7); seg([50, 0, z], [57, 0, z], YL); }
  onRight(0, 12, 46, 36, 50, p2); onRight(0, 14, 44, 38, 48, "#2B3A78");                    // window on the left wall
  if (U > 0.8) { seg([0, 14, 43], [0, 44, 43], "#3B4C98"); seg([0, 29, 38], [0, 29, 48], "#3B4C98"); }
  // counter + coffee machine + terminal
  box(8, 16, 0, 60, 14, 18, M.warm); quad([[8, 16, 18], [68, 16, 18], [68, 30, 18], [8, 30, 18]], "#B9A2D4");
  if (U > 0.6) seg([8, 30, 18], [68, 30, 18], IV);
  box(14, 18, 18, 11, 8, 14, M.deep); { const [sx, sy] = P3(19, 26, 26); c.rect(Math.round(sx), Math.round(sy), 2, 1, GR); }
  box(30, 20, 18, 4, 4, 5, { top: IV, left: "#D9CFEA", right: p7, grad: 0 });
  box(52, 21, 18, 6, 6, 8, { top: "#2C2440", left: p2, right: p1, grad: 0 });
  { const sc = st.terminal ?? "idle", [sx, sy] = P3(55, 24, 26.5), w = Math.max(2, Math.round(5 * U)), h = Math.max(1, Math.round(3 * U));
    c.rect(Math.round(sx - w / 2), Math.round(sy - h), w, h, sc === "ok" ? GR : "#13261A");
    if (sc === "wait" && U > 0.8) for (let i = 0; i < 3; i++) if (((st.t * 6) | 0) % 3 === i) c.px(Math.round(sx - 2 + i * 2), Math.round(sy - 2), Y); }
  // pendant lamps + warm light
  for (const x of [22, 46]) { const [tx, ty] = P3(x, 23, 58), [bx, by] = P3(x, 23, 44); c.line(Math.round(tx), Math.round(ty), Math.round(bx), Math.round(by), MU); c.rect(Math.round(bx - 2 * U), Math.round(by), Math.max(2, Math.round(4 * U)), Math.max(1, Math.round(2 * U)), YL); }
  { const [lx, ly] = P3(34, 30, 10); c.tint(Math.round(lx - 70 * U), Math.round(ly - 60 * U), Math.round(140 * U), Math.round(110 * U), (x, y) => Math.max(0, 0.2 - Math.hypot(x - lx, (y - ly) * 1.3) / (200 * U)), "#F6C860", 6); }
  // character + card
  const spr = sprites.tokyo(Math.round(70 * U));
  if (spr) { const [fx, fy] = P3(44, 50, 0); c.ellipse(Math.round(fx), Math.round(fy), Math.round(13 * U), Math.max(1, Math.round(3 * U)), "#2A2038"); c.blit(spr, Math.round(fx - spr.w / 2), Math.round(fy - spr.h + 2 * U), { outline: O, flip: true }); }
  if (st.card != null) {
    const c0 = c; c = fade(c0, st.cardA ?? 1);
    const [hx, hy] = P3(...TOKYO.hand), [tx, ty] = P3(55, 24, 30), k = st.card, x = lerp(hx, tx, k), y = lerp(hy, ty, k) - Math.sin(Math.PI * k) * 6 * U, w = Math.max(3, Math.round(8 * U)), h = Math.max(2, Math.round(5 * U));
    c.rect(Math.round(x - w / 2) - 1, Math.round(y - h / 2) - 1, w + 2, h + 2, O); c.rect(Math.round(x - w / 2), Math.round(y - h / 2), w, h, p6); c.rect(Math.round(x - w / 2), Math.round(y - h / 2), w, 1, p8);
    c.rect(Math.round(x - w / 2 + 1), Math.round(y - 1), Math.max(1, Math.round(2 * U)), Math.max(1, Math.round(2 * U)), Y);
    if (st.nfc > 0) for (const r of [6, 10, 14]) c.ering(Math.round(tx), Math.round(ty), Math.round(r * U * st.nfc), Math.round(r * U * st.nfc * 0.55), r === 6 ? p8 : p6, Math.PI * 1.05, Math.PI * 1.95);
    c = c0;
  }
  // vending machine (outside, facing the street)
  box(2, 78, 0, 14, 8, 28, { top: "#C9C2E0", left: "#E7E2F4", right: "#A79FC4", grad: 0.1 });
  onLeft(86, 4, 14, 10, 25, "#2B3A78");
  if (U > 0.8) for (const z of [13, 17, 21]) for (let x = 5; x < 13; x += 2) { const [sx, sy] = P3(x, 86, z); c.px(Math.round(sx), Math.round(sy), [Y, PK, GR, IV][(x + z) % 4]); }
  // street lamp
  { const [bx, by] = P3(108, 70, 0), [tx, ty] = P3(108, 70, 46); c.rect(Math.round(bx), Math.round(ty), Math.max(1, Math.round(U)), Math.round(by - ty), p4); c.rect(Math.round(tx - 3 * U), Math.round(ty - 2 * U), Math.max(2, Math.round(7 * U)), Math.max(1, Math.round(2 * U)), p7); }
  // shop's bank tower
  box(110, 10, 0, 34, 34, 126, { top: p5, left: "#4A3A74", right: "#33285A", hi: p7, grad: 0.25 });
  if (U > 0.45) {
    for (let z = 10; z < 116; z += 9) for (let x = 113; x < 142; x += 6) onLeft(44, x, x + 3, z, z + 5, ((x * 7 + z) % 5 === 0) ? "#7A6AB4" : "#2B2450");
    for (let z = 10; z < 116; z += 9) for (let y = 13; y < 42; y += 6) onRight(144, y, y + 3, z, z + 5, ((y * 3 + z) % 7 === 0) ? "#5E50A0" : "#211B3C");
  }
  onLeft(44, 119, 131, 0, 14, "#1A1430"); onLeft(44, 120, 130, 0, 13, "#3B2C5C"); if (st.bankLit > 0) iso(fade(c, st.bankLit), ox, oy, U).onLeft(44, 120, 130, 0, 13, YL);      // door
  box(120, 20, 126, 3, 3, 14, M.lav); { const [sx, sy] = P3(121.5, 21.5, 141); c.rect(Math.round(sx), Math.round(sy), 2, 2, PK); }
  onLeft(44, 113, 141, 112, 122, CARD);
  if (U > 1.2) { const [sx, sy] = P3(127, 44, 120); c.text(MAIN, "BANK", Math.round(sx - 11), Math.round(sy - 1), YL); }
  if (U > 1.2 && st.cafeSign) { const [sx, sy] = P3(46, 0, 54); c.text(MAIN, "CAFE", Math.round(sx - 11), Math.round(sy - 2), YL); }
  return I;
}

// ---------------------------------------------------------------- London (night)
export const LONDON = { door: [51, 64, 9], panelAnchor: [51, 40, 90] };
export function drawLondon(c, ax, ay, U, st) {
  const ox = ax - 40 * U, oy = ay - 20 * U, I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I;
  { const [sx, sy] = P3(70, 50, -10); c.ellipse(Math.round(sx), Math.round(sy + 6 * U), Math.round(122 * U), Math.round(38 * U), "#07050E"); }
  box(0, 0, -8, 140, 100, 8, { top: "#231C34", left: p2, right: p1, hi: p4, grad: 0 });
  quad([[0, 72, 0], [140, 72, 0], [140, 90, 0], [0, 90, 0]], "#15111F");                      // road in front
  if (U > 0.5) for (let x = 4; x < 140; x += 12) seg([x, 81, 0], [x + 6, 81, 0], "#4A4260");
  // bank: steps, body with server-lit windows, columns, entablature, pediment
  box(12, 12, 0, 78, 56, 4, M.dark); box(15, 15, 4, 72, 50, 4, M.dark);
  box(22, 20, 8, 58, 40, 42, { top: p4, left: "#3A2C5E", right: "#2A2046", grad: 0.25 });
  for (let x = 26; x < 78; x += 9) onLeft(60, x, x + 5, 16, 38, st.serverGlow ? (x % 2 ? "#7F6CD0" : "#5E4FB0") : "#2B2450");
  for (let y = 24; y < 58; y += 9) onRight(80, y, y + 5, 16, 38, st.serverGlow ? "#4E40A0" : "#211B3C");
  onLeft(60, 46, 56, 8, 30, "#1A1430"); onLeft(60, 47, 55, 8, 29, "#3B2C5C"); if (st.doorLit > 0) iso(fade(c, st.doorLit), ox, oy, U).onLeft(60, 47, 55, 8, 29, YL);
  for (const x of [20, 31, 42, 58, 69, 80]) box(x, 62, 8, 4, 4, 40, { top: p8, left: p7, right: p5, grad: 0.15 });
  box(16, 16, 48, 70, 52, 6, M.lav);
  quad([[16, 68, 54], [86, 68, 54], [51, 68, 70]], p7); quad([[20, 68, 56], [82, 68, 56], [51, 68, 67]], p5);
  quad([[86, 16, 54], [86, 68, 54], [51, 68, 70], [51, 16, 70]], p6);
  if (U > 1.2) { const [sx, sy] = P3(51, 68, 58); c.text(MAIN, "YOUR BANK", Math.round(sx - 26), Math.round(sy - 3), YL); }
  // clock tower
  box(104, 14, 0, 14, 14, 100, { top: p5, left: "#4A3A74", right: "#33285A", grad: 0.3 });
  if (U > 0.6) for (let z = 8; z < 96; z += 8) { onLeft(28, 107, 109, z, z + 5, "#2B2450"); onLeft(28, 113, 115, z, z + 5, "#2B2450"); }
  box(102, 12, 100, 18, 18, 18, M.purple);
  for (const [face, cx] of [["l", 111], ["r", 21]]) {
    const [sx, sy] = face === "l" ? P3(111, 30, 109) : P3(120, 21, 109), r = Math.max(2, Math.round(6 * U));
    c.ellipse(Math.round(sx), Math.round(sy), r, r, "#F6E7A8"); c.ellipse(Math.round(sx), Math.round(sy), Math.max(1, r - 1), Math.max(1, r - 1), YL);
    if (U > 0.8) { c.line(Math.round(sx), Math.round(sy), Math.round(sx), Math.round(sy - r + 2), O); c.line(Math.round(sx), Math.round(sy), Math.round(sx + r / 2), Math.round(sy), O); }
  }
  { const top = P3(111, 21, 146); c.poly([P3(102, 30, 118), P3(120, 30, 118), top], p5); c.poly([P3(120, 12, 118), P3(120, 30, 118), top], p4); }
  // street lamps with light pools
  for (const [x, y] of [[8, 70], [96, 70]]) {
    const [bx, by] = P3(x, y, 0), [tx, ty] = P3(x, y, 36);
    c.tint(Math.round(bx - 40 * U), Math.round(by - 20 * U), Math.round(80 * U), Math.round(40 * U), (px, py) => Math.max(0, 0.32 - Math.hypot(px - bx, (py - by) * 2) / (70 * U)), "#F6C860", 6);
    c.rect(Math.round(bx), Math.round(ty), Math.max(1, Math.round(U)), Math.round(by - ty), p5); c.rect(Math.round(tx - 2 * U), Math.round(ty - 2 * U), Math.max(2, Math.round(5 * U)), Math.max(1, Math.round(2 * U)), YL);
  }
  return I;
}
