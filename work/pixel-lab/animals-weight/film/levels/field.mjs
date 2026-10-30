// LV3 · mouse — a golden wheat field by a red barn on a bright day (RANGE BIOME.field = 1080..1620, camera REST.mouse).
// Far green hills and a receding field band; tall wheat with poppies; a big round hay bale in the middle, the mouse
// sitting on top of it under the sun disc; the barn at the left with a little wooden mine head-frame ("MINE") over a
// shaft; the ground is shown in cross-section (topsoil, clay, stone). Events: "twenty" → +20 G; "light … fall" → the
// mouse hops off and floats down like a leaf beside a feather (air-drag streaks); "famous" → the ground in front of the
// shaft is cut away (the deep shaft, a gallery with rails, a lantern and a hay pile appear) and a J.B.S. HALDANE, 1926
// tag; "drop" → the mouse hops into the shaft, falls (slowed by the air), lands softly on the hay, dusts itself off and
// "walk away" → it walks off along the gallery. Static scenery is cached once (world layers), the mouse is a cached rig.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { pickup, tag, sign, shadow, sm, ease, lerp, rnd, fade, mix, bayer, MAIN, C, blinkAt, clamp01 } from "../cute.mjs";
import { worldLayer, frameLight, lit, keyed, thick, ditherEll, stubble, gaze, R } from "./roofs-kit.mjs";
import { drawMouse, drawMouseWalk } from "./mouse-art.mjs";

export const RANGE = BIOME.field;
const [X0, X1] = RANGE, GY = LAND;
const BALE = { x: 1350, y: -84, r: 64 };
const SH = { x0: 1112, x1: 1238, cx: 1175 };          // mine shaft (world x)
const CEIL = 182, FLOOR = 290, HAYTOP = 270;           // gallery ceiling / floor, top of the hay pile (world y)
const SPOT = { x: 1264, y: GY };                       // where the mouse lands after the float
const GALLERY_END = 1596;

// ---------------------------------------------------------------- palette
const P = {
  hill: ["#7FB894", "#97CCA4", "#B2DDB6"], tree: ["#4E8A6A", "#5E9E78", "#3E7458"], far: ["#E4C266", "#EED482", "#D6AE4E", "#F4E0A0"],
  stem: "#B8892E", stemD: "#8A6420", ear: "#F2C85A", earL: "#FFE69A", earD: "#C8902C", awn: "#E8C470", leaf: "#9AA844",
  poppy: "#E8342C", poppyD: "#A81C20", poppyL: "#FF7A5A", seed: "#2A1414",
  soil: ["#3E2414", "#4E2E1A", "#5E3A22", "#6E4A2C"], clay: ["#7A5030", "#8A5E38", "#9A6E44"], stone: ["#4E4440", "#5E5450", "#6E6460", "#8A807A"],
  root: "#8E6E4A", pebble: ["#9A8A7C", "#B8AA9A", "#6E625A"],
  barn: ["#6E1C1A", "#94282A", "#B83A32", "#D45A44"], trim: "#F4EEE0", trimD: "#C8C0B0", roof: ["#3A2A2E", "#54383C", "#6E4A4A"],
  wood: ["#3A2010", "#5A3418", "#7E4E26", "#A06A36", "#C08A50"], hay: ["#8A5E18", "#B07E24", "#D8A23A", "#F0C455", "#FBE08A"],
  mine: ["#120A06", "#1E120A", "#2A1A10", "#3A2618", "#4A3220"], rail: ["#5A5A68", "#8A8A9C", "#B4B4C4"], glow: "#FFD27A",
};

// ---------------------------------------------------------------- small painters (world coordinates through g)
function wheat(g, x, y, h, lean, s, far = 0) {
  const top = [x + lean, y - h], mid = [x + lean * 0.35, y - h * 0.5], n = Math.max(4, R(h / 3));
  const stem = far ? mix(P.stem, "#E8D8A0", 0.35) : P.stem;
  for (let i = 0; i <= n; i++) { const k = i / n, u = 1 - k; const px = u * u * x + 2 * u * k * mid[0] + k * k * top[0], py = u * u * y + 2 * u * k * mid[1] + k * k * top[1]; g.px(R(px), R(py), stem); }
  if (!far && h > 40) { const lx = x + lean * 0.3, ly = y - h * 0.38, d = rnd(s) < 0.5 ? -1 : 1; g.line(R(lx), R(ly), R(lx + d * 7), R(ly - 7), P.leaf); g.px(R(lx + d * 8), R(ly - 9), P.leaf); }
  // ear: stacked grains with a lit side, awns fanning up
  const el = far ? 6 : 12, ex = top[0], ey = top[1];
  for (let j = 0; j < el; j++) { const w = j < 2 || j > el - 3 ? 1 : 2, yy = R(ey + j - el + 2), xx = R(ex + lean * 0.06 * j); for (let i = -w; i <= w - 1; i++) g.px(xx + i, yy, far ? (i < 0 ? P.far[3] : P.far[0]) : (i < 0 ? P.earL : (j + i) % 3 === 0 ? P.earD : P.ear)); }
  if (!far) for (let k = -1; k <= 1; k++) g.line(R(ex + k), R(ey - el + 2), R(ex + k * 4 + lean * 0.1), R(ey - el - 7), P.awn);
}
function poppy(g, x, y, h, s) {
  g.line(R(x), R(y), R(x + (rnd(s) - 0.5) * 6), R(y - h), "#5E8A3A");
  const fx = R(x + (rnd(s) - 0.5) * 6), fy = R(y - h), r = 3 + R(rnd(s + 1) * 2);
  for (let j = -r; j <= r; j++) for (let i = -r - 1; i <= r + 1; i++) { const d = (i * i) / ((r + 1) * (r + 1)) + (j * j) / (r * r); if (d <= 1) g.px(fx + i, fy + j, j < -r * 0.3 ? P.poppyL : d > 0.6 ? P.poppyD : P.poppy); }
  g.px(fx, fy, P.seed); g.px(fx + 1, fy, P.seed); g.px(fx, fy + 1, P.seed);
}
function wavy(x, s, a) { return Math.sin(x * 0.021 + s) * a + Math.sin(x * 0.057 + s * 2.3) * a * 0.45; }

// ---------------------------------------------------------------- static scenery (cached once)
let SCENE = null, MINE = null;
function build() {
  // ---- scenery behind the actors
  SCENE = worldLayer(X0 - 40, -440, X1 - X0 + 80, 752, (g) => {
    // far hills (tapering to the horizon at both seams) and a soft tree line
    const edge = (x) => Math.min(sm(x, X0, X0 + 120), 1 - sm(x, X1 - 120, X1));
    for (let x = X0; x < X1; x++) {
      const e = edge(x), hTop = -70 - e * (46 + wavy(x, 1.3, 16)), tTop = -70 - e * (18 + Math.abs(Math.sin(x * 0.19)) * 7 + wavy(x, 4, 4));
      for (let y = R(hTop); y < -70; y++) { const v = (y - hTop) / Math.max(1, -70 - hTop); g.px(x, y, v < 0.18 ? P.hill[2] : v < 0.55 ? (v - 0.18 > bayer(x, y) * 0.4 ? P.hill[1] : P.hill[2]) : P.hill[1]); }
      for (let y = R(tTop); y < -70; y++) g.px(x, y, (y - tTop) < 2 ? P.tree[1] : (x + y) % 7 === 0 ? P.tree[2] : P.tree[0]);
      // receding field band: lighter far rows → richer near rows, faint furrow lines
      for (let y = -70; y < GY; y++) { const v = (y + 70) / 50, row = (y + 70) % 6 === 0 && v > 0.15; g.px(x, y, row ? P.far[2] : v < 0.3 ? (v / 0.3 > bayer(x, y) ? P.far[1] : P.far[3]) : v < 0.7 ? P.far[1] : ((v - 0.7) / 0.3 > bayer(x, y) ? P.far[0] : P.far[1])); }
    }
    // far wheat texture specks on the field band
    for (let i = 0; i < 520; i++) { const x = X0 + rnd(i * 3 + 1) * (X1 - X0), y = -66 + rnd(i * 3 + 2) * 44; g.px(R(x), R(y), rnd(i) < 0.5 ? P.far[3] : P.far[2]); }
    // barn (mid-ground, left)
    barn(g, 1086, GY);
    // back wheat rows along the ground line (stalks rise above the field band)
    for (let i = 0; i < 230; i++) {
      const x = X0 + 4 + rnd(i * 7 + 3) * (X1 - X0 - 8); if (x > SH.x0 - 6 && x < SH.x1 + 6) continue;
      const h = 38 + rnd(i * 7 + 4) * 58, lean = (rnd(i * 7 + 5) - 0.5) * 14;
      wheat(g, x, GY - 2 - rnd(i * 7 + 6) * 6, h, lean, i);
    }
    for (let i = 0; i < 26; i++) { const x = X0 + 10 + rnd(i * 11 + 1) * (X1 - X0 - 20); if (x > SH.x0 - 8 && x < SH.x1 + 8) continue; poppy(g, x, GY - 3, 24 + rnd(i * 11 + 2) * 40, i + 50); }
    // wooden fence on the right, partly hidden in the wheat
    for (const px of [1452, 1500, 1548, 1596]) { g.rect(px - 2, GY - 54, 5, 54, P.wood[2]); g.rect(px - 2, GY - 54, 2, 54, P.wood[3]); g.rect(px - 3, GY - 57, 7, 3, P.wood[1]); }
    for (const yy of [GY - 44, GY - 24]) { g.rect(1440, yy, 170, 4, P.wood[2]); g.rect(1440, yy, 170, 1, P.wood[4]); g.rect(1440, yy + 3, 170, 1, P.wood[1]); }
    // round hay bale (end-on: a spiral disc), with a cylinder rim behind and a pitchfork leaning on it
    bale(g, BALE.x, BALE.y, BALE.r);
    // the mine head-frame over the shaft, MINE board on its cross-bar
    headframe(g);
    // the harvested field in front, seen at a slant (blending into the Cuban forest's lawn at the left seam)
    stubble(g, X0, X1, GY, 314, { vx: 1350, green: [X0, X0 + 90] });
    // the shaft mouth on the ground: a dark hole with a plank collar
    for (let y = GY - 2; y < GY + 12; y++) for (let x = SH.x0 - 6; x < SH.x1 + 6; x++) { const d = ((x - SH.cx) / ((SH.x1 - SH.x0) / 2 + 6)) ** 2 + ((y - GY - 4) / 8) ** 2; if (d > 1) continue; g.px(x, y, d > 0.72 ? (y < GY + 4 ? P.wood[3] : P.wood[1]) : y < GY + 2 ? P.mine[1] : P.mine[0]); }
  });
  // ---- the cut-away (dissolved in on "famous"): the ground opened in cross-section around the shaft and the gallery
  MINE = worldLayer(SH.x0 - 26, GY, GALLERY_END - SH.x0 + 52, 330, (g) => { soil(g); mine(g); });
}
function barn(g, x0, gy) {
  const w = 124, x1 = x0 + w, wallTop = gy - 104, mid = x0 + w / 2;
  // walls: vertical planks
  for (let x = x0; x < x1; x++) for (let y = wallTop; y < gy; y++) g.px(x, y, (x - x0) % 8 === 0 ? P.barn[1] : (x - x0) % 8 === 1 ? P.barn[3] : y < wallTop + 6 ? P.barn[1] : P.barn[2]);
  // gambrel roof with shingle rows and a lit edge
  const roof = [[x0 - 8, wallTop + 2], [x0 + 12, wallTop - 40], [mid, wallTop - 68], [x1 - 12, wallTop - 40], [x1 + 8, wallTop + 2]];
  g.poly(roof, P.roof[1]);
  for (let y = wallTop - 66; y < wallTop + 2; y += 6) for (let x = x0 - 8; x < x1 + 8; x++) if (g.has(x, y)) g.px(x, y, P.roof[0]);
  for (let i = 0; i < roof.length - 1; i++) { g.line(R(roof[i][0]), R(roof[i][1]), R(roof[i + 1][0]), R(roof[i + 1][1]), P.trim); g.line(R(roof[i][0]), R(roof[i][1]) + 1, R(roof[i + 1][0]), R(roof[i + 1][1]) + 1, P.roof[2]); }
  // white trim corners, big doors with an X brace, loft door with hay
  g.rect(x0, wallTop, 3, gy - wallTop, P.trim); g.rect(x1 - 3, wallTop, 3, gy - wallTop, P.trim);
  const dw = 54, dx = R(mid - dw / 2), dy = gy - 66;
  g.rect(dx, dy, dw, 66, P.barn[1]); g.frame(dx, dy, dw, 66, P.trim); g.frame(dx + 1, dy + 1, dw - 2, 65, P.trim); g.rect(R(mid), dy, 1, 66, P.trim);
  for (const [a, b] of [[dx, R(mid)], [R(mid), dx + dw]]) { g.line(a + 2, dy + 2, b - 2, gy - 2, P.trim); g.line(b - 2, dy + 2, a + 2, gy - 2, P.trim); }
  const lw = 26, lx = R(mid - lw / 2), ly = wallTop - 34;
  g.rect(lx, ly, lw, 24, P.mine[2]); g.frame(lx - 1, ly - 1, lw + 2, 26, P.trim);
  for (let i = 0; i < 18; i++) { const hx = lx + 2 + rnd(i + 900) * (lw - 4), hy = ly + 14 + rnd(i + 901) * 9; g.line(R(hx), R(hy), R(hx + (rnd(i + 902) - 0.5) * 8), R(hy + 5 + rnd(i + 903) * 5), i % 3 ? P.hay[3] : P.hay[4]); }
  // a small round window under the roof peak
  g.disc(R(mid), wallTop - 52, 5, P.trim); g.disc(R(mid), wallTop - 52, 3, P.mine[3]); g.px(R(mid) - 1, wallTop - 53, "#8AA8C8");
}
function bale(g, cx, cy, r) {
  // cylinder rim seen behind (slightly offset right), then the spiral face
  for (let y = R(cy - r); y <= R(cy + r); y++) for (let x = R(cx - r); x <= R(cx + r + 10); x++) {
    const dx = x - cx - 8, dy = y - cy; if (dx * dx + dy * dy > r * r) continue; g.px(x, y, (x * 3 + y) % 9 === 0 ? P.hay[0] : P.hay[1]);
  }
  for (let y = R(cy - r); y <= R(cy + r); y++) for (let x = R(cx - r); x <= R(cx + r); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy); if (d > r) continue;
    const ang = Math.atan2(dy, dx), spiral = (d / r) * 7 + ang / (2 * Math.PI), f = spiral - Math.floor(spiral);
    const lt = (-dx - dy) / (r * 1.41);                                   // light from the upper left
    let k = 2 + (f < 0.18 ? -1 : 0) + (lt > 0.25 ? 1 : 0) + (lt > 0.62 && f > 0.5 ? 1 : 0) - (lt < -0.45 ? 1 : 0);
    if (d > r - 1.5) k = 0; else if (d > r - 3) k = Math.min(k, 1);
    g.px(x, y, P.hay[Math.max(0, Math.min(4, k))]);
  }
  // loose straws on the rim
  for (let i = 0; i < 40; i++) { const a = rnd(i + 300) * Math.PI * 2, rr = r - 2, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (y > cy + r * 0.85) continue; g.line(R(x), R(y), R(x + Math.cos(a + 0.4) * 6), R(y + Math.sin(a + 0.4) * 6), i % 2 ? P.hay[3] : P.hay[2]); }
  // pitchfork leaning on the right side
  g.line(cx + r - 4, GY, cx + r + 30, cy - r - 2, P.wood[3]); g.line(cx + r - 3, GY, cx + r + 31, cy - r - 2, P.wood[2]);
  const tx = cx + r + 30, ty = cy - r - 2;
  g.rect(tx - 7, ty - 3, 15, 2, P.rail[1]); for (const dx of [-7, -2, 3, 7]) g.line(tx + dx, ty - 3, tx + dx + 1, ty - 18, P.rail[2]);
}
function headframe(g) {
  const L = [SH.x0 + 6, GY], Rt = [SH.x1 - 6, GY], top = [SH.cx, GY - 112];
  for (const [p, q] of [[L, top], [Rt, top]]) { thick(g, [p, q], 2, P.wood[1]); thick(g, [[p[0], p[1] - 1], [q[0], q[1] - 1]], 1, P.wood[3]); }
  thick(g, [[SH.x0 + 24, GY - 62], [SH.x1 - 24, GY - 62]], 2, P.wood[1]); g.line(SH.x0 + 24, GY - 63, SH.x1 - 24, GY - 63, P.wood[4]);
  // pulley wheel and the rope down the shaft
  const wx = SH.cx, wy = GY - 108; g.ring(wx, wy, 11, P.wood[0]); g.ring(wx, wy, 10, P.wood[2]); for (let a = 0; a < 6; a++) g.line(wx, wy, R(wx + Math.cos(a) * 9), R(wy + Math.sin(a) * 9), P.wood[1]); g.disc(wx, wy, 2, P.rail[1]);
  g.line(wx + 11, wy, wx + 11, CEIL + 40, "#C8A878"); g.line(wx + 12, wy, wx + 12, CEIL + 40, "#9A7A50");
  // the MINE board hanging on the cross-bar
  const bw = 62, bx = R(SH.cx - bw / 2), by = GY - 56;
  g.line(bx + 10, GY - 62, bx + 10, by, P.wood[0]); g.line(bx + bw - 10, GY - 62, bx + bw - 10, by, P.wood[0]);
  g.rrect(bx, by, bw, 22, P.wood[0], 2); g.rrect(bx + 1, by + 1, bw - 2, 20, P.wood[3], 2); g.rect(bx + 2, by + 2, bw - 4, 2, P.wood[4]);
  const tw = g.measure(MAIN, "MINE", { scale: 2 }); g.text(MAIN, "MINE", R(SH.cx - tw / 2), by + 5, P.wood[0], { scale: 2 }); g.text(MAIN, "MINE", R(SH.cx - tw / 2), by + 4, "#FDF0C8", { scale: 2 });
}
const cutMask = (x, y) => { const j = (rnd((x >> 3) * 7 + (y >> 3) * 131) - 0.5) * 5; return (x >= SH.x0 - 18 + j && x < SH.x1 + 18 + j && y >= GY + 2) || (x >= SH.x0 - 18 + j && x < GALLERY_END + 18 + j && y >= CEIL - 26 + j); };
function soil(g) {
  // soil strata only inside the cut-away, with a dark cut rim and a sunny lip on the top edges
  for (let x = SH.x0 - 26; x < GALLERY_END + 26; x++) {
    const b1 = 54 + wavy(x, 0.7, 7), b2 = 196 + wavy(x, 2.1, 10);
    for (let y = GY; y < 312; y++) {
      if (!cutMask(x, y)) continue;
      let col;
      if (y < b1) { const v = (y - GY) / (b1 - GY); col = P.soil[v < 0.12 ? 3 : v < 0.55 ? 2 : (v - 0.55) * 2 > bayer(x, y) ? 1 : 2]; }
      else if (y < b2) { const v = (y - b1) / (b2 - b1); col = y < b1 + 3 ? (bayer(x, y) < 0.5 ? P.soil[1] : P.clay[0]) : P.clay[v < 0.5 ? 1 : (v - 0.5) * 2 > bayer(x, y) ? 0 : 1]; }
      else { const v = (y - b2) / 60; col = y < b2 + 3 ? (bayer(x, y) < 0.5 ? P.clay[0] : P.stone[1]) : P.stone[v < 0.4 ? 2 : 1]; }
      const rim = !cutMask(x - 2, y) || !cutMask(x + 2, y) || !cutMask(x, y - 2), top = !cutMask(x, y - 3) && cutMask(x, y + 2);
      g.px(x, y, top && !cutMask(x, y - 1) ? "#FBEFC0" : rim ? "#2A160A" : col);
    }
  }
  for (let i = 0; i < 60; i++) { const x = SH.x0 - 20 + rnd(i * 5 + 1) * (GALLERY_END - SH.x0 + 40), y = GY + 16 + rnd(i * 5 + 2) * 290, r = 1 + rnd(i * 5 + 3) * (y > 190 ? 6 : 3); if (!cutMask(R(x - r * 1.5), R(y)) || !cutMask(R(x + r * 1.5), R(y)) || !cutMask(R(x), R(y - r - 2))) continue; ditherEll(g, x, y, r * 1.4, r, P.pebble[y > 190 ? 2 : 0], 1); g.px(R(x - r * 0.4), R(y - r * 0.4), P.pebble[1]); }
  for (let i = 0; i < 26; i++) { const x = SH.x0 - 16 + rnd(i * 13 + 7) * (SH.x1 - SH.x0 + 32), len = 8 + rnd(i * 13 + 8) * 26; let px = x, py = GY + 4; for (let k = 0; k < len; k++) { if (cutMask(R(px), R(py)) && cutMask(R(px), R(py) - 2)) g.px(R(px), R(py), P.root); px += (rnd(i * 97 + k) - 0.5) * 1.6; py += 1; } }
}
function mine(g) {
  const back = (x, y) => { const n = rnd((x >> 2) * 131 + (y >> 2) * 17); return n < 0.1 ? P.mine[3] : n < 0.55 ? P.mine[2] : P.mine[1]; };
  // shaft and gallery interior (dark rock back wall), cut edges outlined
  const inside = (x, y) => (x >= SH.x0 && x < SH.x1 && y >= GY && y < FLOOR) || (x >= SH.x0 && x < GALLERY_END && y >= CEIL && y < FLOOR);
  for (let y = GY; y < FLOOR + 12; y++) for (let x = SH.x0 - 4; x < GALLERY_END + 8; x++) {
    if (inside(x, y)) { const edge = !inside(x - 2, y) || !inside(x + 2, y) || !inside(x, y - 2); g.px(x, y, edge ? P.mine[0] : back(x, y)); }
  }
  // shaft: timber frames and a ladder
  for (let y = GY + 34; y < CEIL; y += 52) { g.rect(SH.x0, y, SH.x1 - SH.x0, 5, P.wood[1]); g.rect(SH.x0, y, SH.x1 - SH.x0, 1, P.wood[3]); }
  for (const x of [SH.x0, SH.x1 - 5]) { g.rect(x, GY + 10, 5, CEIL - GY - 10, P.wood[1]); g.rect(x + 1, GY + 10, 1, CEIL - GY - 10, P.wood[3]); }
  for (const x of [SH.x0 + 9, SH.x0 + 21]) g.rect(x, GY + 14, 2, FLOOR - GY - 14, P.wood[2]);
  for (let y = GY + 20; y < FLOOR - 6; y += 13) { g.rect(SH.x0 + 9, y, 14, 2, P.wood[3]); g.px(SH.x0 + 9, y + 1, P.wood[1]); }
  // gallery: timber props with cap beams, rails with sleepers, a lantern and a cart at the far end
  for (const px of [1268, 1372, 1476, 1572]) { g.rect(px, CEIL, 6, FLOOR - CEIL, P.wood[1]); g.rect(px + 1, CEIL, 2, FLOOR - CEIL, P.wood[3]); g.rect(px - 10, CEIL, 26, 6, P.wood[2]); g.rect(px - 10, CEIL, 26, 1, P.wood[4]); }
  for (let x = SH.x0 + 30; x < GALLERY_END; x += 9) g.rect(x, FLOOR - 3, 5, 3, P.wood[1]);
  g.rect(SH.x0 + 30, FLOOR - 5, GALLERY_END - SH.x0 - 30, 1, P.rail[2]); g.rect(SH.x0 + 30, FLOOR - 4, GALLERY_END - SH.x0 - 30, 1, P.rail[0]);
  // lantern with a warm dithered glow
  const lx = 1324, ly = CEIL + 22;
  for (let y = ly - 34; y <= ly + 34; y++) for (let x = lx - 44; x <= lx + 44; x++) { const d = Math.hypot((x - lx) / 44, (y - ly) / 34); if (d < 1 && g.has(x, y) && (1 - d) * 0.75 > bayer(x, y)) g.px(x, y, d < 0.45 ? "#7A5A30" : "#5A3E24"); }
  g.line(lx, CEIL + 6, lx, ly - 7, P.rail[0]); g.rect(lx - 4, ly - 7, 9, 2, P.rail[0]); g.rect(lx - 3, ly - 5, 7, 9, P.glow); g.rect(lx - 3, ly - 5, 1, 9, "#FFF4C8"); g.rect(lx - 4, ly + 4, 9, 2, P.rail[0]);
  // mine cart with ore
  const cx = 1520, cy = FLOOR - 6;
  g.poly([[cx - 26, cy - 30], [cx + 26, cy - 30], [cx + 20, cy - 4], [cx - 20, cy - 4]], P.rail[0]); g.poly([[cx - 24, cy - 28], [cx + 24, cy - 28], [cx + 19, cy - 6], [cx - 19, cy - 6]], "#7A6A8A");
  g.rect(cx - 24, cy - 28, 48, 2, "#A898B8"); for (const k of [[-12, -34, 7], [2, -36, 8], [14, -33, 6]]) ditherEll(g, cx + k[0], cy + k[1], k[2], k[2] * 0.7, "#8A8A96", 1.2);
  for (const k of [[-8, -37], [5, -38]]) g.px(cx + k[0], cy + k[1], "#F4CA50");
  for (const dx of [-13, 13]) { g.disc(cx + dx, cy, 4, P.rail[0]); g.px(cx + dx, cy, P.rail[2]); }
  // hay pile at the shaft bottom (the soft landing)
  for (let y = HAYTOP - 2; y < FLOOR; y++) for (let x = SH.x0 + 2; x < SH.x1 + 14; x++) {
    const dx = (x - (SH.cx + 4)) / 66, dy = (y - FLOOR) / (FLOOR - HAYTOP + 2); if (dx * dx + dy * dy > 1) continue;
    const v = rnd(x * 7 + y * 13); g.px(x, y, dy < -0.8 ? P.hay[4] : v < 0.25 ? P.hay[1] : v < 0.6 ? P.hay[2] : P.hay[3]);
  }
  for (let i = 0; i < 40; i++) { const x = SH.x0 + 6 + rnd(i + 700) * 130, y = HAYTOP + 2 + rnd(i + 701) * 16; g.line(R(x), R(y), R(x + (rnd(i + 702) - 0.5) * 12), R(y - 2 - rnd(i + 703) * 5), i % 2 ? P.hay[4] : P.hay[3]); }
  // the far end of the gallery fades into darkness (a side passage)
  for (let x = GALLERY_END - 40; x < GALLERY_END; x++) for (let y = CEIL; y < FLOOR; y++) if (g.has(x, y) && (x - GALLERY_END + 40) / 40 > bayer(x, y)) g.px(x, y, P.mine[0]);
}

// ---------------------------------------------------------------- the mouse's day (world anchor = feet)
/** Timing of every motion in this level (seconds, from the word timings); levels/cat-motions.mjs reads it too. */
export const FT = {
  pick: EV.twentyGrams, ready: EV.soLight - 0.05, hopOff: EV.soLight + 0.2, floatA: EV.soLight + 0.55, landT: EV.fall + 0.6, land1: EV.fall + 0.88,
  feather0: EV.soLight + 0.3, featherIn: [EV.soLight + 0.25, EV.soLight + 0.6], feather1: EV.fall + 0.85, featherOut: [EV.fall + 1.2, EV.fall + 1.6],
  cut0: EV.famous, cut1: EV.famous + 0.7, tag0: EV.famous + 0.15, tag1: EV.famous + 0.5, tagOut: [LV.mouse[1] - 0.55, LV.mouse[1] - 0.2],
  dropT: EV.drop, inShaft: EV.drop + 0.3, hayT: EV.mine, hay1: EV.mine + 0.3, dust0: EV.mine + 0.2, walkT: EV.walkAway, walk0: EV.walkAway + 0.12,
  turn: [EV.walkAway + 0.12, EV.walkAway + 0.37],                                        // front pose → side walk crossfade
  speed: 104, stride: 34, walkX0: SH.cx, walkLen: GALLERY_END - 70 - SH.cx,                    // walk speed px/s, stride px, distance until it fades into the dark
};
const LOOKS = [[0, [0, 0]], [EV.mouse + 1.4, [0.5, -0.6]], [EV.twentyGrams + 0.9, [0, 0]], [EV.famous + 0.4, [-0.3, -0.4]], [EV.drop - 0.75, [-0.8, 0.5]],
  [EV.drop, [-0.5, 0.6]], [EV.drop + 0.3, [0, 0.8]], [EV.mine, [0, 0]]];
function mouseAt(t) {
  const sit = { kind: "sit", x: BALE.x, y: BALE.y - BALE.r + 1, arms: 0, ears: 0, dangle: 0, happy: 0, open: 0, squash: 0, look: gaze(t, LOOKS), wide: 0 };
  const { hopOff, floatA, landT, dropT, inShaft, hayT, walkT } = FT;
  if (t < hopOff) {
    const k = sm(t, EV.soLight - 0.05, hopOff);
    return { ...sit, arms: k, ears: k, happy: k, open: k * 0.5 };
  }
  if (t < landT) {
    let x, y;
    if (t < floatA) { const e = ease((t - hopOff) / (floatA - hopOff)); x = lerp(sit.x, 1318, e); y = sit.y - 28 * Math.sin(e * Math.PI * 0.5); }
    else { const u = (t - floatA) / (landT - floatA), v = u + 0.05 * Math.sin(6 * Math.PI * u); x = lerp(1318, SPOT.x, u) + 30 * Math.sin(2 * Math.PI * 1.25 * u) * Math.sin(Math.PI * u); y = lerp(sit.y - 28, SPOT.y, v); }
    return { ...sit, x, y, arms: 1, ears: 1, dangle: sm(t, hopOff, hopOff + 0.25), happy: 1, open: 0.5, floating: 1 };
  }
  if (t < dropT) {
    const k = sm(t, landT, landT + 0.35), sq = Math.max(0, Math.sin(clamp01((t - landT) / (FT.land1 - landT)) * Math.PI)) * 0.7;
    return { ...sit, x: SPOT.x, y: SPOT.y, arms: 1 - k, ears: 1 - k, dangle: 1 - k, happy: 1 - sm(t, landT + 0.3, landT + 0.55), open: 0.5 * (1 - k), squash: sq };
  }
  if (t < inShaft) {   // hop over into the shaft mouth
    const e = ease((t - dropT) / (inShaft - dropT));
    return { ...sit, x: lerp(SPOT.x, SH.cx, e), y: lerp(SPOT.y, GY + 30, e) - 34 * Math.sin(e * Math.PI), arms: e, ears: e, dangle: e, open: 0.6 * e, wide: 1 };
  }
  if (t < hayT) {      // the fall down the shaft: air drag keeps it slow and steady
    const u = (t - inShaft) / (hayT - inShaft), v = u * (0.75 + 0.25 * u);
    return { ...sit, x: SH.cx + 3 * Math.sin(u * 9) * (1 - u), y: lerp(GY + 30, HAYTOP, v), arms: 1, ears: 1, dangle: 1, open: 0.7, falling: 1 };
  }
  if (t < walkT + 0.12) {
    const k = sm(t, hayT, hayT + 0.3), sq = Math.max(0, Math.sin(clamp01((t - hayT) / (FT.hay1 - hayT)) * Math.PI)) * 0.8;
    const dust = t > FT.dust0 && t < walkT ? Math.sin((t - hayT) * 46) * 2.4 * sm(t, FT.dust0, FT.dust0 + 0.1) * (1 - sm(t, walkT - 0.1, walkT)) : 0;
    return { ...sit, x: SH.cx, y: HAYTOP, arms: (1 - k) + 0.5 * sm(t, FT.dust0, FT.dust0 + 0.1) * (1 - sm(t, walkT - 0.12, walkT)), ears: 1 - k, dangle: 1 - k, happy: sm(t, hayT + 0.15, hayT + 0.3), open: 0.4, squash: sq, shake: dust };
  }
  // walk away along the gallery (crossfade from the sitting pose over ~0.15 s)
  const d = (t - FT.walk0) * FT.speed, x = SH.cx + d, y = d < 40 ? lerp(HAYTOP, FLOOR - 1, sm(d, 0, 40)) : FLOOR - 1;
  return { kind: "walk", x, y, ph: d / FT.stride, a: 1 - sm(x, GALLERY_END - 70, GALLERY_END - 20) };
}

// ---------------------------------------------------------------- layers
const vis = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!vis(V)) return; if (!SCENE) build();
  const L = frameLight(V);
  SCENE.blit(c, V, { lut: L.lut });
  const cut = sm(t, FT.cut0, FT.cut1);
  if (cut > 0) MINE.blit(c, V, { a: cut, lut: L.lut });
}
export function actors(c, V, t) {
  if (!vis(V)) return;
  const L = frameLight(V), g = lit(c, L.mul), X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  sign(g, X(1512), Y(GY), "LV 3", "wood", 1, t);
  const m = mouseAt(t);
  // a feather drifts down beside the floating mouse (same slow fall)
  const fA = Math.min(sm(t, ...FT.featherIn), 1 - sm(t, ...FT.featherOut));
  if (fA > 0) {
    const u = clamp01((t - FT.feather0) / (FT.feather1 - FT.feather0)), sw = Math.sin(2 * Math.PI * 1.25 * u - 0.5), fx = lerp(1416, 1384, u) + 30 * sw * Math.sin(Math.PI * u + 0.25), fy = lerp(-226, GY - 8, u + 0.04 * Math.sin(6 * Math.PI * u + 1));
    feather(fade(g, fA), X(fx), Y(fy), 0.75 * Math.cos(2 * Math.PI * 1.25 * u - 0.5) * (1 - u * 0.5));
  }
  const onHay = t >= EV.mine;
  // contact shadows: on the bale top (fades as it hops off), under the float on the ground, on the field, on the hay
  const baleA = 1 - sm(t, FT.hopOff - 0.1, FT.hopOff + 0.1);
  if (baleA > 0) shadow(g, X(BALE.x), Y(BALE.y - BALE.r) + 2, 44, 5, "#000000", 0.38 * baleA);
  if (m.floating) { const h = clamp01((SPOT.y - m.y) / 180); shadow(g, X(m.x), Y(GY) + 1, 44 - h * 24, 5, "#000000", 0.38 * (1 - h * 0.7) * sm(t, FT.hopOff - 0.1, FT.hopOff + 0.15)); }
  else if (t >= FT.landT && t < FT.dropT + 0.2) shadow(g, X(SPOT.x), Y(SPOT.y) + 1, 44, 5, "#000000", 0.38 * (1 - sm(t, FT.dropT, FT.dropT + 0.15)));
  const hayA = sm(t, FT.hayT - 0.08, FT.hayT + 0.04) * (1 - sm(t, FT.turn[0], FT.turn[1]));
  if (hayA > 0) shadow(g, X(SH.cx), Y(HAYTOP) + 1, 44, 5, "#000000", 0.38 * hayA);
  // air-drag streaks while floating / falling (they fade in and out with the motion)
  const streak = m.floating ? sm(t, FT.hopOff, FT.hopOff + 0.2) * (1 - sm(t, FT.landT - 0.2, FT.landT)) : m.falling ? sm(t, FT.inShaft, FT.inShaft + 0.1) * (1 - sm(t, FT.hayT - 0.12, FT.hayT)) : 0;
  if (streak > 0) for (let i = 0; i < 6; i++) {
    const ph = ((t * (m.falling ? 2.6 : 1.3) + i * 0.29) % 1), sx = X(m.x) + [-64, -40, 40, 64, -14, 16][i], sy = Y(m.y) - 30 - ph * 170 + (m.falling ? 30 : 0), len = m.falling ? 26 : 16;
    const a = Math.sin(ph * Math.PI) * (m.falling ? 0.95 : 0.85) * streak; if (a < 0.05) continue;
    const gg = fade(g, a); gg.line(sx, sy, sx, sy + len, "#FFFFFF"); gg.line(sx + 1, sy + 3, sx + 1, sy + len - 3, "#CFE6FF");
  }
  if (m.kind === "walk") {
    // the turn: the front-facing pose dissolves out while the side-view walk dissolves in (FT.turn, ~0.25 s)
    const k = sm(t, FT.turn[0], FT.turn[1]);
    if (k < 1) drawMouse(g, X(SH.cx), Y(HAYTOP), { t, a: 1 - k, happy: 1, open: 0.4 });
    if (m.a > 0) {
      shadow(g, X(m.x + 6), Y(m.y), 40, 4, "#000000", 0.35 * m.a * k);
      drawMouseWalk(g, X(m.x), Y(m.y), { ph: m.ph, a: m.a * k, dir: 1, blink: blinkAt(t, 2.9, 0.4) });
    }
  } else {
    const blink = m.happy > 0.5 ? 0 : blinkAt(t, 3.3, 0.9);
    drawMouse(g, X(m.x), Y(m.y), { t, blink, look: m.look, arms: m.arms, ears: m.ears, dangle: m.dangle, happy: m.happy, open: m.open, squash: m.squash, shake: m.shake ?? 0 });
  }
  // hay bits burst on the landing (each straw fades in over two frames and out as it falls)
  if (onHay && t < FT.hayT + 1.0) for (let i = 0; i < 14; i++) {
    const tt = t - EV.mine - (i % 3) * 0.12; if (tt < 0 || tt > 0.7) continue;
    const ang = -Math.PI * (0.15 + 0.7 * rnd(i + 40)), sp = 60 + rnd(i + 41) * 70, px = X(SH.cx) + Math.cos(ang) * sp * tt, py = Y(HAYTOP) - 6 + Math.sin(ang) * sp * tt + 120 * tt * tt;
    const a = Math.min(sm(tt, 0, 0.07), 1 - sm(tt, 0.45, 0.7)); fade(g, a).line(R(px), R(py), R(px + 3 * Math.cos(i)), R(py + 3 * Math.sin(i)), i % 2 ? P.hay[4] : P.hay[3]);
  }
  // little dust puffs while it dusts itself off (each puff swells in and fades out)
  const dustA = sm(t, FT.hayT + 0.15, FT.hayT + 0.3) * (1 - sm(t, FT.walkT, FT.walkT + 0.4));
  if (dustA > 0) for (let i = 0; i < 6; i++) {
    const tt = ((t - EV.mine - 0.15 + i * 0.09) % 0.55 + 0.55) % 0.55, a = Math.sin((tt / 0.55) * Math.PI) * 0.7 * dustA;
    const px = X(SH.cx) + (i % 2 ? 1 : -1) * (26 + tt * 50), py = Y(HAYTOP) - 30 - i * 12 - tt * 26;
    if (a > 0.02) ditherEll(fade(g, a), px, py, 5 + tt * 10, 4 + tt * 7, "#E8D8B8", 0.9);
  }
}
function feather(g, x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang), P2 = (u, v) => [R(x + u * c - v * s), R(y + u * s + v * c)];
  for (let v = -22; v <= 22; v++) {
    const w = Math.round(8 * Math.sin(((v + 22) / 44) * Math.PI) * (v > 13 ? 0.7 : 1));
    for (let u = -w; u <= w; u++) { const [px, py] = P2(u, v); g.px(px, py, Math.abs(u) === w ? "#8E9AB8" : u < 0 ? "#FFFFFF" : "#E2E8F4"); }
    const [px, py] = P2(0, v); g.px(px, py, "#B0B8C8");
  }
  for (let v = 22; v <= 29; v++) { const [px, py] = P2(0, v); g.px(px, py, "#7A86A0"); }
  for (let k = -16; k <= 16; k += 6) { const [a0, b0] = P2(0, k), [a1, b1] = P2(6, k - 4); g.line(a0, b0, a1, b1, "#C6CEDE"); }
}
export function front(c, V, t) {
  if (!vis(V)) return;
  const L = frameLight(V), g = lit(c, L.mul);
  // swaying front wheat along the ground line (never over the shaft mouth)
  for (let i = 0; i < 46; i++) {
    const x = X0 + 6 + rnd(i * 17 + 501) * (X1 - X0 - 12); if (x > SH.x0 - 14 && x < SH.x1 + 14) continue;
    const nearBale = Math.abs(x - BALE.x) < BALE.r - 8;
    const sx = V.X(x); if (sx < -20 || sx > 560) continue;
    const h = (nearBale ? 14 : 26) + rnd(i * 17 + 502) * (nearBale ? 16 : 40), sway = Math.sin(t * 1.7 + i * 0.9) * 2.5 + (rnd(i * 17 + 503) - 0.5) * 10;
    wheat(g, R(sx), R(V.Y(GY + 2 + rnd(i * 17 + 504) * 3)), h, sway, i + 200);
  }
}
export function hud(c, V, t) {
  if (!vis(V)) return;
  const X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  const kp = (t - FT.pick) / 1.6; if (kp > 0 && kp < 1) pickup(c, X(BALE.x), Y(BALE.y - BALE.r) - 186, "20 G", kp);
  const ta = Math.min(sm(t, FT.tag0, FT.tag1), 1 - sm(t, ...FT.tagOut));
  if (ta > 0) tag(c, ["J.B.S. HALDANE, 1926"], X(1350), 206, ta, C.Y, 2);
}
