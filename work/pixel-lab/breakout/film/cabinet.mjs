// Our own brick-game arcade cabinet in a dark arcade (no Atari logo or marks, no text on the cabinet): a backlit marquee
// with abstract brick art, a black bezel around a big black-and-white tube (rounded glass, scanlines, a soft glare and
// edge falloff), a side decal of the four strip colours, the control panel with the rotary paddle knob and the serve
// button, a coin door at the bottom. Drawn once into a cached canvas; the knob turns with the paddle each frame.
import { Canvas, mix, hex, bayer } from "../../../../renderer/pixel/raster.mjs";

const GW = 540, GH = 960, R = Math.round;
export const GL = { x0: 24, x1: 456, y0: 138, y1: 636, r: 16 };
/** Inner x-span of the rounded glass on row y ([x0, x1) or null). */
export function glassRow(y) {
  if (y < GL.y0 || y >= GL.y1) return null; const r = GL.r, dy = y < GL.y0 + r ? GL.y0 + r - y - 0.5 : y >= GL.y1 - r ? y - (GL.y1 - r) + 0.5 : 0;
  const ins = dy > 0 ? r - Math.sqrt(Math.max(0, r * r - dy * dy)) : 0; return [R(GL.x0 + ins), R(GL.x1 - ins)];
}
export const ROWS = Array.from({ length: GH }, (_, y) => glassRow(y));
export const STRIP = { RED: "#FF5040", ORANGE: "#FFA038", GREEN: "#48E060", YELLOW: "#FFE448" };

const BASE = new Canvas(GW, GH, "#000000");
const grad = (c, x, y, w, h, cols, vertical = true) => { const n = cols.length - 1; for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = vertical ? (j - y) / Math.max(1, h - 1) : (i - x) / Math.max(1, w - 1), q = k * n, lo = Math.min(n - 1, Math.floor(q)); c.px(i, j, cols[q - lo > bayer(i, j) ? lo + 1 : lo]); } };
{
  const c = BASE;
  // room behind (only the edges show): dark purple, neighbour cabinets glowing at both sides
  grad(c, 0, 0, GW, GH, ["#0E0A18", "#0A0712", "#07050C"]);
  for (let y = 0; y < GH; y++) for (let x = 0; x < 8; x++) { const k = (1 - x / 8) * 0.5 * (0.6 + 0.4 * Math.sin(y / 70)); if (k > bayer(x, y)) c.px(x, y, mix("#0A0712", "#5A2A7A", k)); }
  for (let y = 0; y < GH; y++) for (let x = 532; x < GW; x++) { const k = ((x - 532) / 8) * 0.5 * (0.6 + 0.4 * Math.cos(y / 80)); if (k > bayer(x, y)) c.px(x, y, mix("#0A0712", "#1E6A76", k)); }
  // cabinet body with rim light
  c.rect(8, 4, 524, GH - 4, "#110D1A"); c.rect(8, 4, 3, GH - 4, "#2E2546"); c.rect(529, 4, 3, GH - 4, "#241E38"); c.rect(11, 4, 1, GH - 4, "#1C1628");
  // marquee: backlit panel, abstract wall of bricks + a ball's dotted arc + a paddle (no text)
  c.rrect(18, 14, 504, 104, "#2A2438", 2); c.rrect(22, 18, 496, 96, "#0A0814", 2);
  grad(c, 24, 20, 492, 92, ["#2A0E44", "#4A1460", "#6A1A6E", "#4A1460", "#24103E"]);
  const bands = [STRIP.RED, STRIP.ORANGE, STRIP.GREEN, STRIP.YELLOW];
  for (let r = 0; r < 4; r++) for (let k = 0; k < 15; k++) { const x = 34 + k * 32 + (r % 2) * 10, y = 30 + r * 11; if (x + 26 > 508) continue; if ((k * 7 + r * 3) % 11 === 4) continue; c.rect(x, y, 26, 7, mix(bands[r], "#2A0E44", 0.18)); c.rect(x, y, 26, 1, mix(bands[r], "#FFFFFF", 0.35)); c.rect(x, y + 6, 26, 1, mix(bands[r], "#000000", 0.4)); }
  for (let i = 0; i < 22; i++) { const u = i / 21, x = R(120 + u * 300), y = R(104 - 58 * Math.sin(Math.PI * (0.15 + u * 0.7)) + 18); c.rect(x, y, 3, 3, mix("#FDFEED", "#6A1A6E", 0.75 - u * 0.5)); }
  c.rect(440, 100, 4, 4, "#FDFEED"); c.rect(230, 104, 52, 5, "#E9EEE8"); c.rect(230, 108, 52, 1, "#8A9090");
  c.rect(18, 118, 504, 4, "#3B2C5C"); c.rect(18, 118, 504, 1, "#6E4FB0");
  // bezel around the tube
  c.rect(12, 122, 516, 530, "#0B0910"); grad(c, 12, 122, 516, 30, ["#1A1626", "#0B0910"]);
  for (let y = GL.y0 - 3; y < GL.y1 + 3; y++) { const row = glassRow(Math.max(GL.y0, Math.min(GL.y1 - 1, y))); if (!row) continue; for (let x = row[0] - 3; x < row[1] + 3; x++) c.px(x, y, y < GL.y0 || y >= GL.y1 || x < row[0] || x >= row[1] ? (y < GL.y0 + 4 || x < row[0] ? "#252030" : "#17131F") : "#000000"); }
  // side decal (right bezel): the four strip colours as thin dim bars and a ball trail — background art only
  for (let k = 0; k < 4; k++) for (let y = 160; y < 620; y++) { const x = 474 + k * 9; if (((y >> 2) + k) % 9 === 0) continue; c.rect(x, y, 4, 1, mix(bands[k], "#0B0910", 0.62 + 0.25 * Math.sin(y / 60 + k))); }
  // control panel: molding, slanted surface, art stripe, knob and button bases
  c.rect(8, 650, 524, 6, "#6E4FB0"); c.rect(8, 650, 524, 1, "#B08AE8"); c.rect(8, 655, 524, 1, "#3B2C5C");
  grad(c, 8, 656, 524, 236, ["#2E2448", "#231B38", "#1A1428", "#141020"]);
  for (let y = 660; y < 890; y++) { const x0 = R(300 + (y - 660) * 0.9); c.rect(x0, y, 26, 1, mix("#4A1460", "#231B38", 0.35)); c.rect(x0 + 30, y, 8, 1, mix("#6A1A6E", "#231B38", 0.5)); }
  for (let j = -34; j <= 34; j++) for (let i = -34; i <= 34; i++) { const d = Math.hypot(i, j * 1.15); if (d < 33) c.px(140 + i, 836 + j, d > 30 ? "#3B2C5C" : mix("#0A0814", "#1A1428", d / 33)); }
  for (let j = -22; j <= 22; j++) for (let i = -22; i <= 22; i++) { const d = Math.hypot(i, j * 1.15); if (d < 21) c.px(410 + i, 832 + j, d > 18 ? "#3B2C5C" : "#0A0814"); }
  // coin door
  c.rrect(176, 896, 188, 64, "#2C2838", 2); c.rrect(178, 898, 184, 62, "#3E3850", 2); c.rect(180, 899, 180, 1, "#5E5874");
  for (const x of [214, 296]) { c.rrect(x, 912, 30, 36, "#18141F", 2); c.rect(x + 13, 918, 4, 16, "#050408"); c.rrect(x + 6, 938, 18, 7, "#7A1A34", 1); c.rect(x + 8, 939, 14, 2, "#E03056"); }
}
/** Static cabinet layer (copied into the frame first). */
export function drawCabinet(c) { c.d.set(BASE.d); }

/** Post-pass of the tube: scanlines, edge falloff and a soft glare (precomputed factors over the glass). */
const FAC = new Float32Array(GW * GH), ADD = new Float32Array(GW * GH);
for (let y = GL.y0; y < GL.y1; y++) { const row = ROWS[y]; for (let x = row[0]; x < row[1]; x++) {
  const ex = Math.min(x - GL.x0, GL.x1 - 1 - x) / 22, ey = Math.min(y - GL.y0, GL.y1 - 1 - y) / 22, edge = Math.min(1, Math.min(ex, ey)), fall = 0.72 + 0.28 * Math.sqrt(Math.max(0, edge));
  FAC[y * GW + x] = fall * (y % 2 ? 0.86 : 1);
  const gx = (x - GL.x0) / (GL.x1 - GL.x0), gy = (y - GL.y0) / (GL.y1 - GL.y0), band = Math.exp(-(((gx + gy * 0.9 - 0.34) / 0.07) ** 2)) * (gy < 0.55 ? 1 - gy / 0.55 : 0);
  ADD[y * GW + x] = 16 * band + (edge < 0.25 ? 4 * (1 - edge / 0.25) : 0);
} }
export function tubePass(c) {
  const d = c.d;
  for (let y = GL.y0; y < GL.y1; y++) { const row = ROWS[y]; for (let x = row[0]; x < row[1]; x++) { const p = y * GW + x, i = p * 3, f = FAC[p], a = ADD[p]; d[i] = d[i] * f + a; d[i + 1] = d[i + 1] * f + a; d[i + 2] = d[i + 2] * f + a * 1.1; } }
}
/** The rotary paddle knob; angle in radians (turns with the paddle). */
export function knob(c, ang) {
  const cx = 140, cy = 832;
  for (let j = -20; j <= 20; j++) for (let i = -20; i <= 20; i++) { const d = Math.hypot(i, j * 1.12); if (d > 19.5) continue;
    const a = Math.atan2(j, i) - ang, grip = d > 15 && Math.cos(a * 12) > 0.3, lit = (-i - j) / 28;
    c.px(cx + i, cy + j, d > 18 ? "#6A6478" : grip ? mix("#B8B4C4", "#FFFFFF", Math.max(0, lit) * 0.4) : mix("#D8D4E0", "#FFFFFF", Math.max(0, lit) * 0.5)); }
  for (let r = 2; r < 15; r++) { const x = R(cx + Math.cos(ang - Math.PI / 2) * r), y = R(cy + Math.sin(ang - Math.PI / 2) * r / 1.12); c.px(x, y, "#2A2438"); c.px(x + 1, y, "#4A4458"); }
  for (let j = -15; j <= 15; j++) for (let i = -15; i <= 15; i++) { const d = Math.hypot(i, j * 1.12); if (d < 14) c.px(410 + i, 828 + j, d > 12 ? "#7A1A24" : mix("#E8443C", "#FF8A70", Math.max(0, (-i - j) / 22))); }
}
export { hex };
