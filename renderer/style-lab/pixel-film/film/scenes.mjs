// v2 scenes: the coffee shop interior (close-up) and the Tokyo district around it (café + shop's bank + streets).
// The interior sits exactly inside the café building of the district at half scale, so the camera can pull back
// continuously from one to the other.
import { mix, MAIN, fade } from "../pixel.mjs";
import { iso, along, COLORS as C } from "./iso.mjs";

const { O, CARD, IV, Y, YL, GR, MU, L, P, PK, p1, p2, p3, p4, p5, p6, p7, p8 } = C;
const M = {
  purple: { top: p6, left: p5, right: p4, hi: p7 }, dark: { top: p4, left: p3, right: p2, hi: p5 }, deep: { top: p3, left: p2, right: p1, hi: p4 },
  lav: { top: p8, left: p7, right: p5, hi: IV }, wood: { top: "#7A5A8C", left: "#5E4472", right: "#45325A", hi: "#A07EB4" },
  chrome: { top: "#E7E2F4", left: "#B9B2D4", right: "#8C86AA", hi: IV }, cream: { top: "#D9CFEA", left: "#B6A8CE", right: "#9384B0", hi: IV },
};
// The café building in district units; interior units map into it at half scale.
export const CAFE = { x: 14, y: 18, s: 0.5, w: 40, d: 36 };
export const CAFE_FOCUS = [34, 36, 14];          // district units: the café's centre
export const DISTRICT_CENTER = [85, 70, 20];
export const TERMINAL_I = [55, 29, 29];          // interior units (top of the card terminal)
export const toDistrict = ([x, y, z]) => [CAFE.x + x * CAFE.s, CAFE.y + y * CAFE.s, z * CAFE.s];
export const ROUTE_D = [toDistrict(TERMINAL_I), [34, 55, 2], [34, 60, 1], [106, 60, 1], [135, 60, 1], [135, 51, 1]];

// ------------------------------------------------------------- interior (interior units, room 80×72, h 60)
export function drawCafe(c, ox, oy, U, st, sprites) {
  const I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I, R = (v) => Math.round(v);
  // floor
  quad([[0, 0, 0], [80, 0, 0], [80, 72, 0], [0, 72, 0]], "#5A4268");
  for (let y = 6; y < 72; y += 6) seg([0, y, 0], [80, y, 0], "#4E395C");
  for (let y = 0; y < 72; y += 12) for (let x = (y / 12) % 2 ? 10 : 30; x < 80; x += 40) seg([x, y, 0], [x, y + 6, 0], "#4E395C");
  // walls (back: y=0 plane, left: x=0 plane) with wainscot
  box(-4, -4, 0, 84, 4, 60, { top: p5, left: "#4C3664", right: p3, hi: p7, grad: 0 });
  box(-4, 0, 0, 4, 72, 60, { top: p5, left: p3, right: "#5A4070", hi: p7, grad: 0 });
  onLeft(0, 0, 80, 0, 18, "#3A2850"); seg([0, 0, 18], [80, 0, 18], "#7A5A8C");
  onRight(0, 0, 72, 0, 18, "#46305C"); seg([0, 0, 18], [0, 72, 18], "#8A6A9C");
  // menu boards + sign on the back wall
  for (const [x0, x1] of [[8, 26], [30, 48], [52, 70]]) {
    onLeft(0, x0, x1, 32, 50, O); onLeft(0, x0 + 1, x1 - 1, 33, 49, "#1A1430");
    for (let z = 36; z < 47; z += 3.5) { seg([x0 + 3, 0, z], [x0 + 3 + (x1 - x0) * 0.45, 0, z], p7); seg([x1 - 5, 0, z], [x1 - 3, 0, z], YL); }
  }
  if (st.textOn) { const [sx, sy] = P3(39, 0, 56); c.text(MAIN, "COFFEE", R(sx - 17), R(sy - 3), YL, { scale: U > 2 ? 1 : 1 }); }
  // window on the left wall: daytime street outside
  onRight(0, 18, 56, 16, 46, p7); onRight(0, 20, 54, 18, 44, "#5C6CC0", (x, y) => mix("#8A98DA", "#3E4C98", Math.max(0, Math.min(1, (y - P3(0, 37, 44)[1]) / (24 * U)))));
  for (const [y0, y1, h] of [[21, 28, 34], [29, 36, 40], [37, 46, 30], [47, 53, 37]]) onRight(0, y0, y1, 18, h, "#33285A");
  for (const [y, z] of [[23, 30], [31, 36], [39, 26], [49, 32], [33, 30]]) { const [sx, sy] = P3(0, y, z); c.rect(R(sx), R(sy), Math.max(1, R(U)), Math.max(1, R(U)), YL); }
  seg([0, 37, 18], [0, 37, 44], p7); seg([0, 20, 31], [0, 54, 31], p7);
  // plant in the corner (purple foliage, brand-safe)
  box(4, 62, 0, 7, 7, 9, M.wood);
  { const [sx, sy] = P3(7.5, 65.5, 18); c.ellipse(R(sx), R(sy), R(7 * U), R(6 * U), "#4E3B7C"); c.ellipse(R(sx - 2 * U), R(sy - 2 * U), R(4 * U), R(4 * U), "#6E58A8"); }
  // back counter: espresso machine, grinder, cups, shelf with jars
  box(4, 2, 0, 72, 10, 18, M.deep);
  box(8, 3, 18, 18, 8, 13, M.chrome); for (const x of [12, 17, 22]) { box(x, 9.5, 21, 2, 2, 3, M.deep); }
  { const [sx, sy] = P3(17, 3, 29); c.rect(R(sx), R(sy), Math.max(1, R(U)), Math.max(1, R(U)), GR); }
  box(29, 4, 18, 6, 6, 12, M.dark); box(30, 5, 30, 4, 4, 4, { top: "#B9A2D4", left: p7, right: p5, grad: 0 });
  for (let i = 0; i < 4; i++) box(39 + i * 4, 5, 18, 3, 3, 3 + (i % 2) * 3, { top: IV, left: "#D9CFEA", right: p7, grad: 0 });
  box(50, 0, 30, 26, 5, 2, M.wood); for (let i = 0; i < 4; i++) box(52 + i * 6, 1, 32, 4, 3, 6, { top: p8, left: i % 2 ? YL : p7, right: i % 2 ? Y : p5, grad: 0 });
  // front counter with pastry case, terminal, cup
  box(8, 24, 0, 58, 12, 20, M.wood); quad([[8, 24, 20], [66, 24, 20], [66, 36, 20], [8, 36, 20]], "#D9CFEA"); seg([8, 36, 20], [66, 36, 20], IV);
  for (let x = 14; x < 66; x += 8) seg([x, 36, 2], [x, 36, 18], "#45325A");
  box(10, 25, 20, 20, 10, 11, { top: "#C9D2F0", left: "#8E9AD6", right: "#6E78B8", grad: 0 });
  for (const [x, y, z, col] of [[13, 31, 22, YL], [17, 31, 22, Y], [21, 31, 22, YL], [25, 31, 22, Y], [15, 28, 26, IV], [20, 28, 26, YL], [25, 28, 26, IV]]) { const [sx, sy] = P3(x, y, z); c.ellipse(R(sx), R(sy), Math.max(1, R(1.6 * U)), Math.max(1, R(0.9 * U)), col); }
  box(52, 26, 20, 7, 6, 9, { top: "#2C2440", left: p2, right: p1, grad: 0 });
  { const sc = st.terminal ?? "idle", [sx, sy] = P3(55.5, 29, 29.5), w = Math.max(2, R(5 * U)), h = Math.max(1, R(3 * U));
    c.rect(R(sx - w / 2), R(sy - h), w, h, sc === "ok" ? GR : "#13261A");
    if (sc === "wait" && U > 0.8) for (let i = 0; i < 3; i++) if (((st.t * 6) | 0) % 3 === i) c.rect(R(sx - 2 * U + i * 2 * U), R(sy - 2 * U), Math.max(1, R(U / 2)), Math.max(1, R(U / 2)), Y); }
  if (st.cup > 0) {
    const g = fade(c, st.cup);
    const I2 = iso(g, ox, oy, U); I2.box(38, 27, 20, 5, 5, 7, { top: "#6E4632", left: IV, right: "#CFC6DA", grad: 0 }); I2.box(38, 27, 25, 5, 5, 1.5, { top: P, left: P, right: p5, grad: 0 });
    const [sx, sy] = P3(40.5, 29.5, 29); for (let i = 0; i < 3; i++) { const k = ((st.t * 0.8 + i / 3) % 1); g.px(R(sx + Math.sin((st.t + i) * 3) * 2 * U - U + i * U), R(sy - k * 10 * U), mix(IV, CARD, k)); }
  }
  // pendant lamps + warm light
  for (const x of [20, 38, 56]) { const [tx, ty] = P3(x, 30, 60), [bx, by] = P3(x, 30, 44); c.line(R(tx), R(ty), R(bx), R(by), MU); c.poly([[bx - 3 * U, by + 2 * U], [bx + 3 * U, by + 2 * U], [bx + 1.5 * U, by - U], [bx - 1.5 * U, by - U]], YL); }
  { const [lx, ly] = P3(38, 34, 12); c.tint(R(lx - 120 * U), R(ly - 90 * U), R(240 * U), R(180 * U), (x, y) => Math.max(0, 0.22 - Math.hypot(x - lx, (y - ly) * 1.3) / (150 * U)), "#F6C860", 8); }
  // round table + stools near the front right
  for (const [x, y, r, h, col] of [[68, 50, 6, 18, p8], [62, 60, 3, 11, p6], [74, 60, 3, 11, p6]]) {
    const [bx, by] = P3(x, y, 0), [, ty] = P3(x, y, h); c.rect(R(bx - 0.6 * U), R(ty), Math.max(1, R(1.2 * U)), R(by - ty), p3);
    c.ellipse(R(bx), R(ty + 0.5 * U), R(r * U * 1.41), R(r * U * 0.71), mix(col, O, 0.35)); c.ellipse(R(bx), R(ty), R(r * U * 1.41), R(r * U * 0.71), col);
  }
  // character + card
  const spr = sprites.hero(R(50 * U));
  if (spr) { const [fx, fy] = P3(44, 50, 0); c.ellipse(R(fx), R(fy), R(12 * U), Math.max(1, R(3 * U)), "#3A2A48"); c.blit(spr, R(fx - spr.w / 2), R(fy - spr.h + 2 * U), { outline: O, flip: true }); }
  if (st.card != null) {
    const g = fade(c, st.cardA ?? 1), [hx, hy] = P3(41, 44, 31), [tx, ty] = P3(55.5, 29, 32), k = st.card;
    const x = hx + (tx - hx) * k, y = hy + (ty - hy) * k - Math.sin(Math.PI * k) * 6 * U, w = Math.max(3, R(7 * U)), h = Math.max(2, R(4.5 * U));
    g.rect(R(x - w / 2) - 1, R(y - h / 2) - 1, w + 2, h + 2, O); g.rect(R(x - w / 2), R(y - h / 2), w, h, p6); g.rect(R(x - w / 2), R(y - h / 2), w, Math.max(1, R(U / 2)), p8);
    g.rect(R(x - w / 2 + U), R(y - U), Math.max(1, R(1.6 * U)), Math.max(1, R(1.6 * U)), Y);
    if (st.nfc > 0) for (const r of [5, 8, 11]) g.ering(R(tx), R(ty), R(r * U * st.nfc), R(r * U * st.nfc * 0.55), r === 5 ? p8 : p6, Math.PI * 1.05, Math.PI * 1.95);
  }
  return I;
}

// ------------------------------------------------------------- district (district units, slab 170×140)
function tree(I, c, x, y, U) { const { P3 } = I, R = Math.round; const [bx, by] = P3(x, y, 0), [, ty] = P3(x, y, 9); c.rect(R(bx), R(ty), Math.max(1, R(U)), R(by - ty), "#3B2C3A"); c.ellipse(R(bx), R(ty - 3 * U), R(6 * U), R(5 * U), "#3E2F66"); c.ellipse(R(bx - U), R(ty - 4 * U), R(4 * U), R(3.5 * U), "#5E4A96"); c.px(R(bx - 2 * U), R(ty - 5 * U), "#8A76C4"); }
function lamp(I, c, x, y, U) { const { P3 } = I, R = Math.round; const [bx, by] = P3(x, y, 0), [tx, ty] = P3(x, y, 16); c.rect(R(bx), R(ty), Math.max(1, R(U * 0.6)), R(by - ty), p4); c.rect(R(tx - 1.5 * U), R(ty - U), Math.max(2, R(3 * U)), Math.max(1, R(U)), YL); }
function car(I, x, y, horiz, col) {
  const { box } = I, m = { top: col, left: mix(col, O, 0.15), right: mix(col, O, 0.35), hi: IV, grad: 0 }, glass = { top: "#2B3A78", left: "#3B4C98", right: "#26306A", grad: 0 };
  if (horiz) { box(x, y, 1, 14, 7, 4, m); box(x + 4, y + 1, 5, 6, 5, 3, glass); } else { box(x, y, 1, 7, 14, 4, m); box(x + 1, y + 4, 5, 5, 6, 3, glass); }
}
export function drawDistrict(c, ox, oy, U, st) {
  const I = iso(c, ox, oy, U), { P3, quad, seg, box, onLeft, onRight } = I, R = Math.round;
  { const [sx, sy] = P3(85, 70, -10); c.ellipse(R(sx), R(sy + 6 * U), R(170 * U), R(55 * U), "#0A0714"); }
  box(0, 0, -8, 170, 140, 8, { top: "#2A2340", left: p3, right: p2, hi: p5, grad: 0 });
  // sidewalks (blocks) and roads
  for (const [x0, y0, x1, y1] of [[0, 0, 84, 62], [100, 0, 170, 62], [0, 78, 84, 140], [100, 78, 170, 140]]) {
    quad([[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], "#453C5E"); seg([x0, y1, 0], [x1, y1, 0], "#5E5478"); seg([x1, y0, 0], [x1, y1, 0], "#5E5478");
  }
  quad([[0, 62, 0], [170, 62, 0], [170, 78, 0], [0, 78, 0]], "#1C1828"); quad([[84, 0, 0], [100, 0, 0], [100, 140, 0], [84, 140, 0]], "#1C1828");
  if (U > 0.5) {
    for (let x = 4; x < 170; x += 12) if (x < 80 || x > 104) seg([x, 70, 0], [x + 6, 70, 0], "#6A6286");
    for (let y = 4; y < 140; y += 12) if (y < 58 || y > 82) seg([92, y, 0], [92, y + 6, 0], "#6A6286");
    for (let i = 0; i < 6; i++) { quad([[85 + i * 2.6, 56, 0], [86.4 + i * 2.6, 56, 0], [86.4 + i * 2.6, 61, 0], [85 + i * 2.6, 61, 0]], "#BDB6D4"); quad([[85 + i * 2.6, 79, 0], [86.4 + i * 2.6, 79, 0], [86.4 + i * 2.6, 84, 0], [85 + i * 2.6, 84, 0]], "#BDB6D4"); }
    for (let i = 0; i < 6; i++) { quad([[78, 63 + i * 2.6, 0], [83, 63 + i * 2.6, 0], [83, 64.4 + i * 2.6, 0], [78, 64.4 + i * 2.6, 0]], "#BDB6D4"); quad([[101, 63 + i * 2.6, 0], [106, 63 + i * 2.6, 0], [106, 64.4 + i * 2.6, 0], [101, 64.4 + i * 2.6, 0]], "#BDB6D4"); }
  }
  // request route on the ground
  if (st.route > 0) for (let i = 0; i <= 120; i++) { const k = i / 120; if (k > st.route) break; if (i % 3) continue; const [x, y, z] = along(ROUTE_D, k), [sx, sy] = P3(x, y, z); c.rect(R(sx), R(sy), Math.max(1, R(U)), 1, k > st.route - 0.05 ? YL : Y); }
  // Tokyo Tower (illustrative landmark) in the back corner
  { const base = [[2, 2], [14, 2], [14, 14], [2, 14]], top = P3(8, 8, 96), OR = "#E8603C", WH = "#F2EDE6";
    const leg = (a, b, col) => c.poly([P3(a[0], a[1], 0), P3(b[0], b[1], 0), top], null, (x, y) => { const z = (P3(8, 8, 0)[1] - y) / U; return Math.floor(z / 12) % 2 ? WH : (((x + y) & 3) ? col : mix(col, O, 0.3)); });
    leg(base[3], base[2], OR); leg(base[2], base[1], mix(OR, O, 0.25));
    for (const [z, w] of [[36, 7], [62, 4]]) box(8 - w, 8 - w, z, 2 * w, 2 * w, 3, { top: WH, left: OR, right: mix(OR, O, 0.3), grad: 0 });
    c.rect(R(top[0]), R(top[1] - 8 * U), Math.max(1, R(U * 0.6)), R(8 * U), WH); }
  // café building (interior lives here at half scale)
  const cx = CAFE.x, cy = CAFE.y, cw = CAFE.w, cd = CAFE.d;
  box(cx, cy, 0, cw, cd, 32, { top: "#4E3B70", left: "#9A86B8", right: "#7A66A0", hi: p8, grad: 0.15 });
  onLeft(cy + cd, cx + 3, cx + 36, 4, 18, "#5C4428", (x, y) => mix("#F6C860", "#B8862A", Math.max(0, Math.min(1, (y - P3(cx + 20, cy + cd, 18)[1]) / (14 * U)))));
  onRight(cx + cw, cy + 3, cy + 32, 4, 18, "#B8862A", (x, y) => mix("#E8B850", "#9A6E26", Math.max(0, Math.min(1, (y - P3(cx + cw, cy + 18, 18)[1]) / (14 * U)))));
  onLeft(cy + cd, cx + 18, cx + 25, 0, 15, "#2B2450"); onLeft(cy + cd, cx + 19, cx + 24, 0, 14, "#E8D9A8");
  for (let i = 0; i < 9; i++) quad([[cx + 1 + i * 4, cy + cd, 20], [cx + 3 + i * 4, cy + cd, 20], [cx + 3 + i * 4, cy + cd + 5, 17], [cx + 1 + i * 4, cy + cd + 5, 17]], i % 2 ? p8 : P);
  box(cx + 8, cy + cd - 2, 32, 24, 2, 8, { top: CARD, left: CARD, right: O, grad: 0 });
  if (st.textOn && U > 1.1) { const [sx, sy] = P3(cx + 20, cy + cd, 36); c.text(MAIN, "COFFEE", R(sx - 17), R(sy - 3), YL); }
  box(cx + 26, cy + 6, 32, 8, 6, 4, M.dark); box(cx + 6, cy + 8, 32, 6, 6, 3, M.dark);
  // vending machine + trees + lamps on the café block
  box(60, 50, 0, 7, 6, 13, { top: "#C9C2E0", left: "#E7E2F4", right: "#A79FC4", grad: 0.1 }); onLeft(56, 61, 66, 5, 11, "#2B3A78");
  tree(I, c, 70, 14, U); tree(I, c, 72, 40, U); lamp(I, c, 80, 58, U);
  // shop's bank tower
  const bx = 116, by = 14, bw = 38, bd = 36, bh = 120;
  box(bx, by, 0, bw, bd, bh, { top: p5, left: "#4A3A74", right: "#33285A", hi: p7, grad: 0.25 });
  if (U > 0.5) {
    for (let z = 12; z < bh - 12; z += 8) for (let x = bx + 3; x < bx + bw - 3; x += 5) onLeft(by + bd, x, x + 2.6, z, z + 4.5, ((x * 7 + z) % 5 === 0) ? "#7A6AB4" : "#2B2450");
    for (let z = 12; z < bh - 12; z += 8) for (let y = by + 3; y < by + bd - 3; y += 5) onRight(bx + bw, y, y + 2.6, z, z + 4.5, ((y * 3 + z) % 7 === 0) ? "#5E50A0" : "#211B3C");
  }
  onLeft(by + bd, bx + 14, bx + 24, 0, 12, "#1A1430"); onLeft(by + bd, bx + 15, bx + 23, 0, 11, "#3B2C5C"); if (st.bankLit > 0) iso(fade(c, st.bankLit), ox, oy, U).onLeft(by + bd, bx + 15, bx + 23, 0, 11, YL);
  onLeft(by + bd, bx + 4, bx + 34, bh - 12, bh - 3, CARD);
  if (st.textOn && U > 1.1) { const [sx, sy] = P3(bx + 19, by + bd, bh - 5), w = 23; c.text(MAIN, "BANK", R(sx - w / 2), R(sy - 2), YL); }
  box(bx + 16, by + 14, bh, 3, 3, 12, M.lav);
  tree(I, c, 106, 8, U); tree(I, c, 160, 56, U); lamp(I, c, 104, 58, U);
  // apartment block (front left) and shops (front right)
  box(10, 92, 0, 62, 36, 54, { top: p5, left: "#5A4A80", right: "#40346A", hi: p7, grad: 0.2 });
  if (U > 0.5) { for (let z = 8; z < 50; z += 9) for (let x = 13; x < 70; x += 6) onLeft(128, x, x + 3.5, z, z + 5, ((x + z * 3) % 4 === 0) ? YL : "#2B2450"); for (let z = 8; z < 50; z += 9) seg([10, 128, z - 1.5], [72, 128, z - 1.5], "#7A6AA0"); }
  box(112, 92, 0, 48, 34, 32, { top: p5, left: "#4E3E78", right: "#382C60", hi: p7, grad: 0.2 });
  if (U > 0.5) { onLeft(126, 115, 157, 3, 15, "#2B3A78"); for (let x = 118; x < 157; x += 10) seg([x, 126, 3], [x, 126, 15], p5); for (let z = 20; z < 30; z += 6) for (let x = 116; x < 158; x += 6) onLeft(126, x, x + 3.5, z, z + 3.5, "#2B2450"); }
  tree(I, c, 80, 134, U); lamp(I, c, 104, 82, U); tree(I, c, 166, 86, U);
  // cars
  car(I, 24 + (st.t * 6) % 60, 64, true, p7); car(I, 87, 98 - ((st.t * 5) % 30), false, IV);
  return I;
}
