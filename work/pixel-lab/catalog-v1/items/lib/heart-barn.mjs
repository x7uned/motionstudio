// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/barn.mjs (build, barn, hayBale, sack; the live
// lantern, the film's mouse and its hero are not copied). Changes: constants of timeline.mjs inlined (LAND −20, barn range
// 3510–4050); the world strip is painted 200 px beyond both stage edges (X0 3310 … X1 4250) so camera moves stay filled;
// re-laid for the 9:16 stage: the barn moved 80 px right (it fills the right edge, the middle stays open), the hay stack
// and the rail fence moved to the left edge, the blue mountains start 100 px later, hills are a constant-height envelope
// (the film tapers them at the biome seams), the rocks of the gorge seam are not painted, the lawn runs down to the
// bottom edge of the frame. No light grade (daylight). World coordinates are the film's; stage x = wx − OX, y = wy + OY.
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm, blob } from "./cute.mjs";
import { worldLayer, lawn, lawnFront, thick } from "./roofs-kit.mjs";

export const OX = 3510, OY = 590;
const R = Math.round, GY = -20, X0 = 3310, X1 = 4250, B = 80;
const BARN = { x0: 3812 + B, x1: 4004 + B, wall: -190, door: [3852 + B, 3938 + B], doorTop: -134 };
const BALE = { w: 104, h: 46 }, PERCH = { x: 3590, y: GY - BALE.h };
const P = {
  hill: ["#7CC488", "#92D29A", "#A8DEAE"], mtn: ["#8A9CC0", "#9EAED0", "#C8D4EA", "#F4F8FF"], tree: ["#4E9A5A", "#62AE68"],
  barn: ["#6E1C1A", "#94282A", "#B83A32", "#D45A44"], trim: "#F4EEE0", roof: ["#3A2A2E", "#54383C", "#6E4A4A"],
  dark: ["#1A100A", "#2A1A10", "#3A2618", "#4A3220"], wood: ["#3A2010", "#5A3418", "#7E4E26", "#A06A36", "#C08A50"],
  hay: ["#8A5E18", "#B07E24", "#D8A23A", "#F0C455", "#FBE08A"], sack: ["#6A5434", "#8A7048", "#A88A5E", "#C8AA7A", "#E2C898"],
};
let SCENE = null, FRONT = null;
export function build() {
  if (SCENE) return { SCENE, FRONT };
  FRONT = worldLayer(X0, GY, X1 - X0, 440, (g) => lawnFront(g, X0, X1, GY));
  SCENE = worldLayer(X0, -470, X1 - X0, 880, (g) => {
    // far blue mountains on the right and rolling green hills, a few round trees on them
    for (let x = X0; x < X1; x++) {
      const m = sm(x, 3800, 4000), top = GY - 40 - m * (150 + Math.sin(x * 0.021) * 40 + Math.abs(Math.sin(x * 0.047)) * 26);
      for (let y = R(top); y < GY - 30; y++) { const v = y - top; g.px(x, y, v < 10 && top < -170 ? P.mtn[3] : v < 3 ? P.mtn[2] : (x + y) % 13 === 0 ? P.mtn[0] : P.mtn[1]); }
      const htop = GY - 8 - 0.7 * (52 + Math.sin(x * 0.017 + 2) * 18 + Math.sin(x * 0.05) * 6);
      for (let y = R(htop); y < GY + 2; y++) g.px(x, y, y - htop < 3 ? P.hill[2] : (y - htop) / 30 > bayer(x, y) + 0.4 ? P.hill[0] : P.hill[1]);
    }
    for (const [tx, ty, r] of [[3548, -72, 12], [3600, -64, 9], [3696, -78, 14], [3742, -70, 10]]) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) { const d = Math.hypot(x - tx, (y - ty) * 1.15) / r; if (d <= 1) g.px(x, y, d > 0.8 || x - tx > r * 0.3 ? P.tree[0] : P.tree[1]); }
    // the lawn in front (ground plane at a slant) with a dirt track to the barn door
    lawn(g, X0, X1, GY, GY + 420, { path: [(BARN.door[0] + BARN.door[1]) / 2, 3930 + B, 56, -26] });
    // the rail fence along the left
    for (const px of [3524, 3572, 3620, 3668, 3716]) { g.rect(px - 2, GY - 46, 5, 48, P.wood[2]); g.rect(px - 2, GY - 46, 2, 48, P.wood[3]); g.rect(px - 3, GY - 48, 7, 3, P.wood[1]); }
    for (const yy of [GY - 38, GY - 20]) { g.rect(X0, yy, 3740 - X0, 4, P.wood[2]); g.rect(X0, yy, 3740 - X0, 1, P.wood[4]); g.rect(X0, yy + 3, 3740 - X0, 1, P.wood[1]); }
    barn(g);
    // the hay-bale stack (two bales) with wheat sacks leaning on it
    for (let y = GY - 4; y < GY + 8; y++) for (let x = PERCH.x - 130; x < PERCH.x + 130; x++) { const d = ((x - PERCH.x) / 130) ** 2 + ((y - GY - 2) / 6) ** 2; if (d < 1 && (1 - d) * 0.5 > bayer(x, y)) g.px(x, y, "#3E7A34"); }
    hayBale(g, PERCH.x - BALE.w, GY - BALE.h, BALE.w, BALE.h); hayBale(g, PERCH.x, GY - BALE.h, BALE.w, BALE.h);
    sack(g, PERCH.x - BALE.w - 18, GY + 2, 58, -2, true); sack(g, PERCH.x + BALE.w + 22, GY + 5, 46, 3, false);
  });
  return { SCENE, FRONT };
}
function barn(g) {
  const { x0, x1, wall } = BARN, W = x1 - x0, mid = x0 + W / 2;
  for (let x = x0; x < x1; x++) for (let y = wall; y < GY; y++) g.px(x, y, (x - x0) % 9 === 0 ? P.barn[1] : (x - x0) % 9 === 1 ? P.barn[3] : y < wall + 7 ? P.barn[1] : P.barn[2]);
  const roof = [[x0 - 10, wall + 2], [x0 + 18, wall - 62], [mid, wall - 108], [x1 - 18, wall - 62], [x1 + 10, wall + 2]];
  g.poly(roof, P.roof[1]);
  for (let y = wall - 106; y < wall + 2; y += 6) for (let x = x0 - 10; x < x1 + 10; x++) if (g.has(x, y) && rnd(x >> 3) < 2) g.px(x, y, P.roof[0]);
  for (let i = 0; i < roof.length - 1; i++) { thick(g, [roof[i], roof[i + 1]], 1, P.trim); g.line(R(roof[i][0]), R(roof[i][1]) + 2, R(roof[i + 1][0]), R(roof[i + 1][1]) + 2, P.roof[2]); }
  g.rect(x0, wall, 4, GY - wall, P.trim); g.rect(x1 - 4, wall, 4, GY - wall, P.trim); g.rect(x0, wall, W, 3, P.trim);
  // loft door with hay and a hoist beam
  const lw = 34, lx = R(mid - lw / 2), ly = wall - 52;
  g.rect(lx, ly, lw, 34, P.dark[1]); g.frame(lx - 2, ly - 2, lw + 4, 38, P.trim); g.frame(lx - 1, ly - 1, lw + 2, 36, P.trim);
  for (let i = 0; i < 26; i++) { const hx = lx + 2 + rnd(i + 900) * (lw - 4), hy = ly + 20 + rnd(i + 901) * 13; g.line(R(hx), R(hy), R(hx + (rnd(i + 902) - 0.5) * 9), R(hy + 4 + rnd(i + 903) * 6), i % 3 ? P.hay[3] : P.hay[4]); }
  g.rect(R(mid) - 3, ly - 14, 6, 10, P.wood[1]); g.rect(R(mid) - 22, ly - 16, 44, 4, P.wood[2]); g.line(R(mid) + 18, ly - 12, R(mid) + 18, ly + 6, "#C8A878");
  // the open doorway: dark interior, hay bales stacked inside, a loft ladder, a warm glow from inside
  const [d0, d1] = BARN.door, dt = BARN.doorTop;
  for (let y = dt; y < GY; y++) for (let x = d0; x < d1; x++) { const v = (y - dt) / (GY - dt); g.px(x, y, v > 0.9 ? P.dark[3] : rnd(x * 3 + y * 17) < 0.06 ? P.dark[2] : P.dark[1]); }
  for (const [bx, by, bw] of [[d0 + 4, GY - 34, 40], [d0 + 44, GY - 34, 38], [d0 + 22, GY - 66, 42], [d0 + 52, GY - 66, 30]]) hayBale(g, bx, by, bw, 32, 0.55);
  for (const x of [d1 - 16, d1 - 6]) g.rect(x, dt + 4, 2, GY - dt - 70, P.wood[2]); for (let y = dt + 10; y < GY - 70; y += 10) g.rect(d1 - 16, y, 12, 2, P.wood[3]);
  for (let y = dt; y < GY; y++) for (let x = d0; x < d1; x++) { const d = Math.hypot((x - (d0 + d1) / 2) / 50, (y - (GY - 40)) / 70); if (d < 1 && (1 - d) * 0.5 > bayer(x, y) + 0.1) g.px(x, y, mix(g.get(x, y), "#FFB84A", 0.28)); }
  g.rect(d0 - 4, dt - 4, d1 - d0 + 8, 4, P.trim); g.rect(d0 - 4, dt, 4, GY - dt, P.trim); g.rect(d1, dt, 4, GY - dt, P.trim);
  // door leaves swung open against the wall, white X braces
  for (const [a, b] of [[x0 + 6, d0 - 4], [d1 + 4, x1 - 6]]) {
    g.rect(a, dt + 2, b - a, GY - dt - 2, P.barn[1]); for (let x = a; x < b; x += 8) g.rect(x, dt + 2, 1, GY - dt - 2, P.barn[0]);
    g.frame(a, dt + 2, b - a, GY - dt - 2, P.trim); g.line(a + 1, dt + 3, b - 2, GY - 2, P.trim); g.line(b - 2, dt + 3, a + 1, GY - 2, P.trim);
  }
  g.rect(d0 - 14, dt - 22, 12, 2, P.wood[0]); g.rect(d0 - 14, dt - 22, 2, 6, P.wood[0]);   // the lantern hook
}
function hayBale(g, x, y, w, h, shade = 0) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const u = (xx - x) / w, v = (yy - y) / h, edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
    let k = edge ? 0 : v < 0.12 ? 4 : u < 0.1 ? 3 : u > 0.88 || v > 0.84 ? 1 : 2; if (!edge && rnd(xx * 5 + yy * 11) < 0.22) k = Math.max(1, k - 1); if (!edge && rnd(xx * 13 + yy * 7) < 0.06) k = 4;
    g.px(xx, yy, shade ? mix(P.hay[k], "#2A1A10", shade) : P.hay[k]);
  }
  for (const tx of [x + R(w * 0.3), x + R(w * 0.7)]) for (let yy = y; yy < y + h; yy++) g.px(tx, yy, shade ? mix("#6A4A2A", "#2A1A10", shade) : "#6A4A2A");
  for (let i = 0; i < 6; i++) { const sx = x + rnd(i + x) * w, sy = y + (rnd(i + y) < 0.5 ? 0 : h - 1); g.line(R(sx), R(sy), R(sx + (rnd(i * 3 + x) - 0.5) * 8), R(sy + (sy === y ? -4 : 4)), shade ? mix(P.hay[3], "#2A1A10", shade) : P.hay[3]); }
}
const SACKR = ["#3A2E1C", "#5A4630", "#7A6244", "#9A7E58", "#B8986C", "#CCAE80", "#DEC496", "#EED8B0"];
function sack(g, x, y, h, tilt, open) {
  const pts = [[x - 16, y], [x - 19, y - h * 0.45], [x - 13 + tilt, y - h * 0.92], [x + tilt, y - h], [x + 13 + tilt, y - h * 0.92], [x + 19, y - h * 0.45], [x + 16, y]];
  blob(g, [pts], { ramp: SACKR, thick: 12, base: 2.8, gain: 2.2, outline: SACKR[0], litOutline: SACKR[5] });
  for (let i = 0; i < 5; i++) g.line(R(x - 10 + i * 5), R(y - 4), R(x - 12 + i * 5 + tilt * 0.5), R(y - h * 0.7), SACKR[3]);
  if (open) { g.ellipse(R(x + tilt), R(y - h), 11, 3, P.hay[2]); for (let i = 0; i < 12; i++) g.px(R(x + tilt - 9 + rnd(i) * 18), R(y - h - 2 + rnd(i + 3) * 4), P.hay[4]); for (let i = 0; i < 8; i++) g.px(R(x + 14 + rnd(i + 20) * 14), R(y - 1 - rnd(i + 21) * 2), P.hay[3]); }
  else { g.rect(R(x + tilt - 8), R(y - h * 0.8), 16, 3, "#C8A878"); g.rect(R(x + tilt - 8), R(y - h * 0.8) + 2, 16, 1, "#8A6A48"); }
}
