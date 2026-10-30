// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/sea-terrain.mjs (dinoDraw, the stamp() shading,
// BONE colours, the eye socket / nostril / teeth of fossils()), plus sea-common.mjs SAND. Changes: the skeleton is baked
// once into a sprite (rock slab + bones) of per-pixel colours; the rock slab around it is new filler so the bones lie
// "in rock"; no film state. Pure: the sprite is a memoised constant.
import { Canvas, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const SAND = { lip: "#F6E2B4", top: "#E8CC94", mid: "#D6B47C", low: "#BE9866", deep: "#A07E54", dark: "#7E6040" };
const BONE = { base: "#E6DABA", light: "#FFF6DE", shade: "#B8A684", outline: "#3A2A24" };
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function dinoDraw(m) {
  const o = (x, y) => [x - 6, y - 1272], W = "#fff";
  const P = (pts) => m.poly(pts.map(([x, y]) => o(x, y)), W);
  P([[80, 1287], [86, 1282], [97, 1281], [104, 1285], [105, 1292], [100, 1296], [88, 1298], [81, 1295]]);
  P([[84, 1298], [101, 1298], [99, 1303], [88, 1304], [84, 1301]]);
  const spine = [[80, 1293], [75, 1297], [69, 1299], [63, 1298], [57, 1297], [51, 1297], [45, 1298], [40, 1300], [35, 1302], [30, 1304], [25, 1306], [20, 1308], [15, 1310], [11, 1312]];
  spine.forEach(([x, y], i) => { const r = i < 8 ? 2.4 : Math.max(1.1, 2.4 - (i - 7) * 0.2); m.ellipse(R(x - 6), R(y - 1272), R(r + 0.4), R(r), W); if (i > 1 && i < 9) m.rect(R(x - 6), R(y - 1272 - r - 2), 1, 2, W); });
  for (let i = 0; i < spine.length - 1; i++) m.line(R(spine[i][0] - 6), R(spine[i][1] - 1272), R(spine[i + 1][0] - 6), R(spine[i + 1][1] - 1272), W);
  for (const rx of [47, 52, 57, 62, 67]) { const top = 1299, len = 12 - Math.abs(rx - 57) * 0.4; for (let j = 0; j < len; j++) m.px(R(rx - 6 + Math.sin(j / len * 1.6) * 3), R(top - 1272 + j), W); }
  m.ellipse(40 - 6, 1303 - 1272, 5, 3, W);
  for (const [dx] of [[0, 1], [5, 0.8]]) { m.line(40 - 6 + dx, 1303 - 1272, 46 - 6 + dx, 1314 - 1272, W); m.line(41 - 6 + dx, 1303 - 1272, 47 - 6 + dx, 1314 - 1272, W); m.line(46 - 6 + dx, 1314 - 1272, 41 - 6 + dx, 1323 - 1272, W); m.line(41 - 6 + dx, 1323 - 1272, 50 - 6 + dx, 1326 - 1272, W); m.px(51 - 6 + dx, 1325 - 1272, W); m.px(51 - 6 + dx, 1327 - 1272, W); }
  m.line(70 - 6, 1302 - 1272, 73 - 6, 1308 - 1272, W); m.line(73 - 6, 1308 - 1272, 77 - 6, 1307 - 1272, W);
}

export const SW = 124, SH = 84, OX = 10, OY = 12;   // sprite size; bone origin inside it
let SPR = null;
/** Baked sprite: rock[i] colour of the slab (null outside), bone[i] bone colour or null, ring[i] 0..2 glow band, field[i] 0..1 reveal order. */
export function sprite() {
  if (SPR) return SPR;
  const N = SW * SH, rock = new Array(N).fill(null), bone = new Array(N).fill(null), ring = new Uint8Array(N), field = new Float32Array(N);
  // slab: squircle, light from the upper left, speckles and two cracks
  const cx = SW / 2, cy = SH / 2, edge = (u, v) => (Math.abs(u - cx) / (cx - 1)) ** 4 + (Math.abs(v - cy) / (cy - 1)) ** 4;
  for (let v = 0; v < SH; v++) for (let u = 0; u < SW; u++) {
    const e = edge(u, v); if (e > 1) continue;
    let col; const lit = (-(u - cx) * 0.5 - (v - cy) * 0.85) / 60;
    const b = 2.5 + lit * 2.2 + (bayer(u, v) - 0.5) * 1.1;
    col = [SAND.deep, SAND.low, SAND.mid, SAND.top, SAND.lip][Math.max(0, Math.min(4, Math.floor(b)))];
    if (e > 0.86) col = (v - cy) + (u - cx) * 0.3 < 0 ? SAND.low : SAND.dark;
    if (e > 0.96) col = "#3A2A24";
    else if (rnd(u * 131 + v * 7) < 0.035) col = SAND.deep;
    rock[v * SW + u] = col;
  }
  for (const [x0, y0, x1, y1] of [[96, 66, 112, 52], [8, 20, 20, 28]]) { const n = 16; for (let i = 0; i <= n; i++) { const u = R(x0 + (x1 - x0) * i / n), v = R(y0 + (y1 - y0) * i / n + Math.sin(i) * 1.2); if (rock[v * SW + u] && edge(u, v) < 0.8) rock[v * SW + u] = SAND.dark; } }
  // bones: the film's stamp() (3-tone top-lit + outline) of dinoDraw, then eye socket, nostril, teeth
  const m = new Canvas(104 + 2, 62 + 2, "#000000"), mm = Object.create(m); mm.px = (x, y, col) => m.px(x + 1, y + 1, col); dinoDraw(mm);
  const MW = 106, MH = 64, on = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && m.d[(y * MW + x) * 3] > 0;
  const put = (X, Y, col) => { if (X >= 0 && Y >= 0 && X < SW && Y < SH) bone[Y * SW + X] = col; };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const X = OX + x - 1, Y = OY + y - 1;
    if (on(x, y)) put(X, Y, !on(x, y - 1) ? BONE.light : !on(x, y + 1) ? BONE.shade : BONE.base);
    else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) put(X, Y, BONE.outline);
    else if (rock[Y * SW + X]) { let d = 9; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (on(x + i, y + j)) d = Math.min(d, Math.max(Math.abs(i), Math.abs(j))); if (d <= 3) ring[Y * SW + X] = d <= 1 ? 2 : 1; }
  }
  const eye = (x, y, col) => put(OX + x - 6 + 0, OY + y - 1272, col);   // film coords (x, y) → sprite
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 4) eye(90 + i, 1288 + j, "#3A2A24");
  eye(89, 1287, "#5A4434"); eye(102, 1287, "#3A2A24");
  for (let x = 86; x <= 100; x += 2) eye(x, 1297, "#FFFFFF");
  for (let i = 0; i < N; i++) { const u = i % SW, v = (i / SW) | 0; field[i] = Math.max(0, Math.min(1, 0.55 * (u / SW) + 0.45 * rnd((u >> 2) * 97 + (v >> 2) * 13 + 5))); }
  return (SPR = { rock, bone, ring, field });
}
