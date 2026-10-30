// Isometric dioramas for the Netflix film (night in London). The bedroom sits inside the hero's terraced house at half
// scale, so the camera can pull back continuously: bedroom → street → planet. Everything is a function of (anchor, U, state).
import { mix, MAIN, TINY, fade, bayer } from "../../pixel.mjs";
import { iso, COLORS as C } from "../../tap-film/iso.mjs";

const { O, CARD, IV, Y, YL, GR, MU, L, P, PK, p1, p2, p3, p4, p5, p6, p7, p8 } = C;
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const M = {
  wood: { top: "#6A4E62", left: "#523A50", right: "#3E2C40", hi: "#8A6A80" }, dark: { top: p4, left: p3, right: p2, hi: p5 }, deep: { top: p3, left: p2, right: p1, hi: p4 },
  duvet: { top: "#B6A8CE", left: "#9384B0", right: "#75689A", hi: "#D9CFEA" }, pillow: { top: "#E7E2F4", left: "#C9C0DE", right: "#A89EC4", hi: IV },
  hood: { top: "#F08070", left: "#E0565A", right: "#B83A50", hi: "#F8A890" }, jeans: { top: "#5258A0", left: "#3E4284", right: "#2E2E66", hi: "#6A74BC" },
  brick: { top: "#5A3A48", left: "#4A2E3C", right: "#3A2230", hi: "#6E4858" }, stone: { top: "#7A7290", left: "#5E5874", right: "#48425C", hi: "#9A92B0" },
  roof: { top: "#3B3352", left: "#2E2846", right: "#221E36", hi: "#4E4870" }, red: { top: "#F05060", left: "#E03056", right: "#B02040", hi: "#F88090" },
};
export const ROOM = { w: 80, d: 72, h: 60 };
export const HOUSE = { x: 20, y: 18, s: 0.5 };                   // the room inside the house, district units
export const ROOM_FOCUS = [45, 26, 22];                           // room units: the laptop and the hero
export const ROOM_FOCUS_D = [HOUSE.x + ROOM_FOCUS[0] * HOUSE.s, HOUSE.y + ROOM_FOCUS[1] * HOUSE.s, ROOM_FOCUS[2] * HOUSE.s];
export const DISTRICT_CENTER = [92, 64, 18];
export const ISP = { x: 120, y: 18, w: 46, d: 38, h: 46 };
export const CABLE = [[140, 56, 0.5], [140, 66, 0.5], [70, 66, 0.5], [40, 66, 0.5], [40, 54, 0.5], [40, 54, 22]];   // ISP door → street → the house

/** Soft dithered light pool around a screen point (radii in screen pixels). */
function glow(c, sx, sy, rx, ry, col, a, k = 0.25) { for (let y = Math.floor(sy - ry); y <= Math.ceil(sy + ry); y++) for (let x = Math.floor(sx - rx); x <= Math.ceil(sx + rx); x++) { if (x < 0 || x >= c.w || y < 0 || y >= c.h) continue; const d = Math.hypot((x - sx) / rx, (y - sy) / ry); if (d < 1 && (1 - d) * a > bayer(x, y)) c.px(x, y, mix(c.get(x, y), col, k)); } }
/** Fill a vertical quad on a y = const plane (facing +y) with fn(u, v) → colour; u along x, v from top (0) to bottom (1). */
function paintLeft(c, P3, y, x0, x1, z0, z1, fn) {
  const A = P3(x0, y, z1), B = P3(x1, y, z1), D = P3(x0, y, z0), ex = [B[0] - A[0], B[1] - A[1]], ey = [D[0] - A[0], D[1] - A[1]], det = ex[0] * ey[1] - ex[1] * ey[0];
  const xs = [A[0], B[0], D[0], B[0] + ey[0]], ys = [A[1], B[1], D[1], B[1] + ey[1]];
  for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
    const dx = px + 0.5 - A[0], dy = py + 0.5 - A[1], u = (dx * ey[1] - dy * ey[0]) / det, v = (ex[0] * dy - ex[1] * dx) / det; if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const col = fn(u, v, px, py); if (col) c.px(px, py, col);
  }
}
function paintRight(c, P3, x, y0, y1, z0, z1, fn) {
  const A = P3(x, y0, z1), B = P3(x, y1, z1), D = P3(x, y0, z0), ex = [B[0] - A[0], B[1] - A[1]], ey = [D[0] - A[0], D[1] - A[1]], det = ex[0] * ey[1] - ex[1] * ey[0];
  const xs = [A[0], B[0], D[0], B[0] + ey[0]], ys = [A[1], B[1], D[1], B[1] + ey[1]];
  for (let py = Math.floor(Math.min(...ys)); py <= Math.ceil(Math.max(...ys)); py++) for (let px = Math.floor(Math.min(...xs)); px <= Math.ceil(Math.max(...xs)); px++) {
    const dx = px + 0.5 - A[0], dy = py + 0.5 - A[1], u = (dx * ey[1] - dy * ey[0]) / det, v = (ex[0] * dy - ex[1] * dx) / det; if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    const col = fn(u, v, px, py); if (col) c.px(px, py, col);
  }
}

/** The show on the laptop: a dusk sea with a sailing boat and a rising moon; `block` pixelates it (1 = sharp). */
export function showPixel(u, v, t, block = 1) {
  if (block > 1) { const n = 64 / block; u = (Math.floor(u * n) + 0.5) / n; v = (Math.floor(v * n * 0.7) + 0.5) / (n * 0.7); }
  const hz = 0.58;
  if (v < hz) { const k = v / hz; const sky = mix("#2A1F48", "#F28A4A", k * k); const mx = 0.68, my = 0.3 - 0.05 * Math.sin(t * 0.3), d = Math.hypot((u - mx) * 1.6, v - my); if (d < 0.09) return mix("#FAE375", "#FDFEED", 1 - d / 0.09); if (d < 0.16) return mix(sky, "#FAE375", (0.16 - d) / 0.07 * 0.5); return sky; }
  const k = (v - hz) / (1 - hz), wave = Math.sin(u * 40 + t * 3 + v * 30) > 0.6, path = Math.abs(u - 0.68) < 0.06 * (1 - k * 0.3) && Math.sin(u * 90 + t * 5) > -0.2;
  const bx = 0.3 + 0.04 * Math.sin(t * 0.8), by = hz + 0.08; if (u > bx - 0.08 && u < bx + 0.08 && v > by - 0.02 && v < by + 0.05) return v < by + 0.02 ? "#1A1428" : "#2A1F40";
  if (u > bx - 0.005 && u < bx + 0.01 && v > by - 0.18 && v < by) return "#1A1428"; if (u > bx + 0.01 && u < bx + 0.08 * (1 - (by - v) / 0.18) && v > by - 0.16 && v < by - 0.02) return "#E0CDF8";
  return path ? "#F4CA50" : wave ? "#5470B8" : mix("#2C4670", "#121A30", k);
}

// ------------------------------------------------------------- bedroom (room units 80 × 72, h 60), night
export function drawRoom(c, ox, oy, U, st) {
  const I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I, t = st.t;
  // floor (planks), walls
  quad([[0, 0, 0], [80, 0, 0], [80, 72, 0], [0, 72, 0]], "#3E2E48"); for (let y = 6; y < 72; y += 6) seg([0, y, 0], [80, y, 0], "#33263E");
  box(-4, -4, 0, 84, 4, 60, { top: p5, left: "#3A2E54", right: p3, hi: p7, grad: 0 });
  box(-4, 0, 0, 4, 72, 60, { top: p5, left: p3, right: "#463A62", hi: p7, grad: 0 });
  for (let x = 6; x < 80; x += 10) seg([x, 0, 0], [x, 0, 60], "#33284C");
  onLeft(0, 0, 80, 0, 6, "#2A2040"); onRight(0, 0, 72, 0, 6, "#30264A");
  // window on the left wall: London at night in the rain, Elizabeth Tower with a lit clock
  onRight(0, 14, 50, 18, 48, "#6E5A8C");
  paintRight(c, P3, 0, 16, 48, 20, 46, (u, v, px, py) => {
    const sky = mix("#0C0A20", "#2A1F48", v); const rain = ((px * 3 + py * 7 + R(t * 60)) % 23) === 0;
    const sky2 = rain ? "#6A6A96" : sky; const bx = u * 32;
    const tower = bx > 20 && bx < 23.5 && v > 0.18, spire = bx > 21 && bx < 22.5 && v > 0.06 && v <= 0.18, clock = Math.hypot(bx - 21.75, (v - 0.27) * 26) < 1.3;
    if (clock) return "#FAE375"; if (tower || spire) return "#1A1430";
    const roofs = 0.62 + 0.12 * Math.sin(bx * 0.9) + 0.06 * Math.sin(bx * 2.3); if (v > roofs) { const lit = rnd(Math.floor(bx * 2) * 7 + Math.floor(v * 30)) < 0.22; return lit && v < 0.95 ? "#C9A040" : "#14102A"; }
    return sky2;
  });
  seg([0, 32, 20], [0, 32, 46], "#6E5A8C"); seg([0, 16, 33], [0, 48, 33], "#6E5A8C");
  for (const [y0, y1] of [[10, 15], [49, 54]]) { onRight(0.2, y0, y1, 14, 50, "#6E4FB0"); for (let y = y0 + 1; y < y1; y += 2) seg([0.3, y, 15], [0.3, y, 49], "#8D59DA"); }
  box(1, 18, 2, 2, 28, 10, M.deep); for (let y = 19; y < 46; y += 3) seg([3, y, 3], [3, y, 11], p5);
  // poster and a shelf with books on the back wall
  onLeft(0, 4, 24, 26, 52, O); paintLeft(c, P3, 0, 5, 23, 27, 51, (u, v) => (v < 0.75 ? mix("#E03056", "#2A0E1A", v / 0.75 + (u - 0.5) * 0.2) : v < 0.8 ? "#FDFEED" : "#1A1428"));
  box(56, 0, 34, 20, 5, 1.5, M.wood); for (let i = 0; i < 7; i++) box(57 + i * 2.6, 0.5, 35.5, 2, 4, 5 + (i % 3) * 1.5, { top: p8, left: [PK, Y, p7, GR, "#5470B8", p5, YL][i], right: p3, grad: 0 });
  box(70, 1, 35.5, 4, 3, 3, M.wood); { const [sx, sy] = P3(72, 2.5, 42); c.ellipse(R(sx), R(sy), Math.max(1, R(3 * U)), Math.max(1, R(2.5 * U)), "#4E3B7C"); }
  // rug
  quad([[8, 46, 0.2], [30, 46, 0.2], [30, 70, 0.2], [8, 70, 0.2]], "#5E2A3A"); quad([[10, 48, 0.3], [28, 48, 0.3], [28, 68, 0.3], [10, 68, 0.3]], "#7A3A4E"); seg([10, 58, 0.4], [28, 58, 0.4], "#E0565A");
  // bedside table with a warm lamp
  box(64, 4, 0, 10, 10, 14, M.wood); box(67, 7, 14, 4, 4, 1, M.deep); seg([69, 9, 15], [69, 9, 22], p2);
  { const [sx, sy] = P3(69, 9, 24); c.poly([[R(sx - 3 * U), R(sy + 2 * U)], [R(sx + 3 * U), R(sy + 2 * U)], [R(sx + 2 * U), R(sy - 2 * U)], [R(sx - 2 * U), R(sy - 2 * U)]], "#FAE375"); glow(c, sx, sy, 16 * U, 14 * U, "#FAE375", 0.4); }
  // bed: frame, headboard, mattress, duvet, pillow
  box(28, 2, 0, 34, 4, 26, M.dark); box(28, 6, 0, 34, 50, 8, M.wood); box(29, 6, 8, 32, 49, 5, M.duvet);
  for (let y = 20; y < 55; y += 7) seg([29, y, 13], [61, y + 1.5, 13], "#A89AC4");
  box(32, 7, 13, 26, 9, 4, M.pillow);
  // laptop on the pillow end: base and the screen facing the hero (+y)
  const scr = st.screenOn ?? 0;
  box(38, 15, 13, 14, 8, 1, { top: "#3A3456", left: "#2E2A40", right: "#221E36", grad: 0 });
  box(38, 14, 14, 14, 1, 10, { top: "#4A4466", left: "#2E2A40", right: "#221E36", grad: 0 });
  paintLeft(c, P3, 15.05, 38.8, 51.2, 14.8, 23.4, (u, v) => {
    if (scr <= 0) return "#0B0812";
    let col;
    if (st.spinner > 0 && st.spinner < 1) { const a = Math.atan2(v - 0.5, (u - 0.5) * 1.4), r = Math.hypot((u - 0.5) * 1.4, v - 0.5), on = r > 0.12 && r < 0.2 && ((a + t * 8) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) < 4; col = on ? "#E03056" : "#0B0812"; }
    else col = showPixel(u, v, t, st.block ?? 1);
    if (v > 0.9 && st.spinner >= 1) col = u < 0.05 + 0.3 * clamp01((t - (st.showOn ?? 0)) / 60) ? "#E03056" : "#3A3456";
    return scr < 1 && scr <= bayer(R(u * 90), R(v * 60)) ? "#0B0812" : col;
  });
  // the hero, lying on his stomach, facing the laptop: legs, feet up, hoodie, arms, head with the beanie
  const kick = Math.sin(t * 2.2) * 2;
  box(40.5, 34, 13, 4, 15, 3.5, M.jeans); box(45.5, 34, 13, 4, 15, 3.5, M.jeans);
  box(40.8, 46, 16.5, 3.4, 3, 8 + kick, M.jeans); box(45.8, 46, 16.5, 3.4, 3, 8 - kick, M.jeans);
  box(40.6, 45.6, 24.5 + kick, 3.8, 4, 2.2, { top: IV, left: "#C9C0DE", right: "#A89EC4", grad: 0 }); box(45.6, 45.6, 24.5 - kick, 3.8, 4, 2.2, { top: IV, left: "#C9C0DE", right: "#A89EC4", grad: 0 });
  box(39.5, 24, 13, 11, 11, 6, M.hood); seg([45, 24, 19], [45, 35, 19], "#B83A50");
  box(37.6, 18, 13, 2.8, 9, 3, M.hood); box(49.6, 18, 13, 2.8, 9, 3, M.hood);
  { const [hx, hy] = P3(39, 19, 14.5), [hx2, hy2] = P3(51, 19, 14.5); c.disc(R(hx), R(hy), Math.max(1, R(1.3 * U)), "#E6AD8A"); c.disc(R(hx2), R(hy2), Math.max(1, R(1.3 * U)), "#E6AD8A"); }
  { const [sx, sy] = P3(45, 23, 21.5), r = Math.max(2, R(3.6 * U)); c.disc(R(sx), R(sy), r, "#3E2818"); c.disc(R(sx - r * 0.3), R(sy + r * 0.25), Math.max(1, R(r * 0.5)), "#E6AD8A");
    c.ellipse(R(sx), R(sy - r * 0.45), r, Math.max(1, R(r * 0.75)), "#6E4FB0"); c.ellipse(R(sx - r * 0.2), R(sy - r * 0.6), Math.max(1, R(r * 0.6)), Math.max(1, R(r * 0.4)), "#8D59DA"); c.rect(R(sx - r), R(sy - r * 0.1), r * 2, Math.max(1, R(r * 0.35)), "#523D82");
    c.disc(R(sx + r * 0.2), R(sy - r * 1.2), Math.max(1, R(r * 0.42)), "#E8E4F4"); }
  // screen light on the pillow, the hero and the headboard
  if (scr > 0) { const [sx, sy] = P3(45, 17, 19); glow(c, sx, sy, 24 * U, 18 * U, "#A9C4FF", 0.32 * scr, 0.22); }
  // the cat asleep at the foot of the bed
  { const [sx, sy] = P3(56, 50, 14.5); c.ellipse(R(sx), R(sy), Math.max(2, R(4.5 * U)), Math.max(1, R(2.6 * U)), "#5E5874"); c.ellipse(R(sx - 1.2 * U), R(sy - 0.8 * U), Math.max(1, R(3 * U)), Math.max(1, R(1.5 * U)), "#7A7290"); c.disc(R(sx + 3.6 * U), R(sy - 1.2 * U), Math.max(1, R(1.8 * U)), "#5E5874"); c.px(R(sx + 3 * U), R(sy - 2.8 * U), "#5E5874"); c.px(R(sx + 4.4 * U), R(sy - 2.8 * U), "#5E5874"); }
  return I;
}

// ------------------------------------------------------------- London street at night (district units ≈ 180 × 130)
export function drawLondon(c, ox, oy, U, st) {
  const I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I, t = st.t;
  // ground: pavements, the main street (y 60..72) and the cross street (x 104..116)
  quad([[-20, -30, 0], [190, -30, 0], [190, 120, 0], [-20, 120, 0]], "#2A2440");
  quad([[-20, 60, 0.1], [190, 60, 0.1], [190, 72, 0.1], [-20, 72, 0.1]], "#1A1628"); for (let x = -16; x < 190; x += 10) seg([x, 66, 0.2], [x + 5, 66, 0.2], "#6E688E");
  quad([[104, -30, 0.1], [116, -30, 0.1], [116, 120, 0.1], [104, 120, 0.1]], "#1A1628"); for (let y = -26; y < 120; y += 10) if (y < 58 || y > 74) seg([110, y, 0.2], [110, y + 5, 0.2], "#6E688E");
  for (const [x0, x1] of [[-20, 104], [116, 190]]) { quad([[x0, 56, 0.15], [x1, 56, 0.15], [x1, 60, 0.15], [x0, 60, 0.15]], "#4A4466"); quad([[x0, 72, 0.15], [x1, 72, 0.15], [x1, 76, 0.15], [x0, 76, 0.15]], "#4A4466"); }
  // Elizabeth Tower far behind
  box(-14, -26, 0, 9, 9, 92, M.stone); box(-15, -27, 92, 11, 11, 10, M.stone); quad([[-15, -27, 102], [-4, -27, 102], [-4, -16, 102], [-15, -16, 102]], "#48425C");
  { const top = P3(-9.5, -21.5, 122), a = P3(-15, -27, 102), b = P3(-4, -27, 102), d2 = P3(-4, -16, 102); c.poly([top, a, b], "#5E5874"); c.poly([top, b, d2], "#48425C"); }
  { const [cx, cy] = P3(-9.5, -16.1, 97); c.disc(R(cx), R(cy), Math.max(2, R(3.6 * U)), "#FAE375"); c.line(R(cx), R(cy), R(cx), R(cy - 2.4 * U), "#5E4520"); c.line(R(cx), R(cy), R(cx + 1.8 * U), R(cy), "#5E4520"); }
  // terraced houses behind the main street; the hero's house (index 1) holds the bedroom
  const HOUSES = [[-16, 18, 34], [HOUSE.x, HOUSE.y, 40], [62, 18, 40]];
  for (const [hx, hy, hw] of HOUSES) {
    const mine = hx === HOUSE.x, h = 32;
    box(hx, hy, 0, hw, 38, h, M.brick);
    // pitched roof (ridge along x) and a chimney
    { const a = P3(hx, hy, h), b = P3(hx + hw, hy, h), r0 = P3(hx, hy + 19, h + 12), r1 = P3(hx + hw, hy + 19, h + 12), f0 = P3(hx, hy + 38, h), f1 = P3(hx + hw, hy + 38, h); c.poly([a, b, r1, r0], "#2E2846"); c.poly([r0, r1, f1, f0], "#3B3352"); c.poly([P3(hx + hw, hy, h), r1, f1], "#221E36"); c.line(R(r0[0]), R(r0[1]), R(r1[0]), R(r1[1]), "#4E4870"); }
    box(hx + hw - 9, hy + 12, h + 6, 5, 5, 12, M.brick);
    // door with steps and windows on the street side (plane y = hy + 38)
    const fy = hy + 38; onLeft(fy, hx + 4, hx + 11, 0, 14, mine ? "#6E4FB0" : "#3B2C5C"); onLeft(fy, hx + 5, hx + 10, 12, 13.5, "#FAE375"); box(hx + 3, fy, 0, 9, 3, 1.5, M.stone);
    for (const [wx, wz] of [[hx + 16, 5], [hx + 28, 5], [hx + 16, 19], [hx + 28, 19]]) { if (wx + 8 > hx + hw) continue; const lit = mine ? (wz > 10 ? 2 : 1) : rnd(wx * 3 + wz) < 0.5 ? 1 : 0; onLeft(fy, wx - 0.5, wx + 8.5, wz - 0.5, wz + 9.5, "#1A1018"); onLeft(fy, wx, wx + 8, wz, wz + 9, lit === 2 ? mix("#2C4670", "#A9C4FF", 0.5 + 0.3 * Math.sin(t * 7)) : lit ? "#C9A040" : "#14102A"); seg([wx + 4, fy, wz], [wx + 4, fy, wz + 9], "#1A1018"); }
  }
  // ISP exchange across the cross street: concrete, racks behind the windows, the red Netflix box in the big window
  const { x: ix, y: iy, w: iw, d: id, h: ih } = ISP;
  box(ix, iy, 0, iw, id, ih, M.stone); box(ix + 30, iy + 6, ih, 10, 10, 6, M.deep); seg([ix + 35, iy + 11, ih + 6], [ix + 35, iy + 11, ih + 20], MU); { const [ax, ay] = P3(ix + 35, iy + 11, ih + 20); if (Math.sin(t * 4) > 0) c.rect(R(ax) - 1, R(ay) - 1, 3, 3, PK); }
  const fy = iy + id; onLeft(fy, ix + 4, ix + 12, 0, 16, "#1A1428"); onLeft(fy, ix + 5, ix + 11, 14, 15.5, "#65DA41");
  onLeft(fy, ix + 16, ix + 42, 8, 34, "#0E0C1A");
  for (let k = 0; k < 4; k++) { const rx = ix + 17 + k * 6.3; onLeft(fy - 0.05, rx, rx + 5, 9, 33, "#221E36"); for (let z = 11; z < 32; z += 2.5) { const on = Math.sin(t * 6 + k * 3 + z) > 0.2; const [sx, sy] = P3(rx + 1, fy, z); c.px(R(sx), R(sy), on ? GR : "#1E5A20"); const [sx2, sy2] = P3(rx + 3, fy, z); c.px(R(sx2), R(sy2), on ? "#7E98DA" : "#2C4670"); } }
  { const busy = st.busy ?? 0, rx = ix + 29.6, glowc = busy > 0 && Math.sin(t * 14) > 0 ? "#FF6A7A" : "#E03056"; onLeft(fy - 0.1, rx, rx + 5.4, 9, 33, glowc); for (let z = 11; z < 32; z += 2.5) onLeft(fy - 0.12, rx + 0.6, rx + 4.8, z, z + 1.2, "#B02040");
    const [sx, sy] = P3(rx + 2.7, fy, 21); glow(c, sx, sy, 14 * U, 14 * U, "#E03056", 0.4, 0.3); }
  for (let z = 2; z < ih - 4; z += 9) onRight(ix + iw, iy + 4, iy + id - 4, z, z + 5, "#2A2440");
  if (st.textOn && U > 0.9) { const [sx, sy] = P3(ix + 4, fy, 40); c.text(MAIN, "ISP", R(sx), R(sy), YL, { scale: U > 2 ? 2 : 1 }); }
  // a red phone box and street lamps
  box(90, 76, 0, 4, 4, 12, M.red); onLeft(80, 90.6, 93.4, 3, 10, "#FAE375");
  for (const lx of [10, 50, 90, 130, 170]) { seg([lx, 76, 0], [lx, 76, 18], "#5E5874"); const [sx, sy] = P3(lx, 76, 18.5); c.disc(R(sx), R(sy), Math.max(1, R(1.4 * U)), "#FFF4C0"); glow(c, sx, sy + 6 * U, 9 * U, 11 * U, "#FFE9A8", 0.3, 0.2); }
  // the double-decker bus driving along the main street
  { const bxp = ((t * 9) % 260) - 60; box(bxp, 61, 0.5, 26, 9, 15, M.red); for (let k = 0; k < 5; k++) { onLeft(70, bxp + 2 + k * 4.8, bxp + 5.6 + k * 4.8, 3.5, 6.5, "#FAE375"); onLeft(70, bxp + 2 + k * 4.8, bxp + 5.6 + k * 4.8, 9.5, 12.5, "#FAE375"); } for (const wx of [bxp + 5, bxp + 21]) { const [sx, sy] = P3(wx, 70, 0.8); c.disc(R(sx), R(sy), Math.max(1, R(1.6 * U)), "#120E20"); } }
  return I;
}
