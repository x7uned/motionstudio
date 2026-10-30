// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/cave.mjs (ROCK, GOLD, NIGHT_GRASS, TOP/topAt, CAVE,
// caveIn, rock(), paint() = the hill/cave/ground layer, paintFront()). Changes: painted in stage coordinates (film y − 80, so
// the ground line sits at y 560); layers are 660 px wide (x −60..600) and the earth runs down to y 1010 so every camera stays
// filled (more pebbles/crystals spread over the taller ground); the city wall continues to x 600; foreground rocks sit on the
// bottom edge; the bat, viaduct/far city, time-of-day grade and the film's clocked eye fade are not copied.
import { rnd, mix, bayer } from "./cute.mjs";
import { Layer } from "./animals-forest.mjs";

const R = Math.round;
const sm = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
export const OX = 0, OY = -80, CAVE = { x: 270, hw: 72, top: 530, base: 640 };
const ROCK = ["#0C0A1C", "#15132A", "#1F1C3A", "#2A274C", "#37345F", "#464273", "#58548A", "#6E6AA2", "#8A86BE"];
const GROUND = ["#3A3254", "#322B4A", "#2B2541", "#252038", "#1F1B30"];
const GOLD = ["#3E3020", "#5E4A2C", "#806838", "#A08648", "#C0A660", "#D8C27E"];
const NIGHT_GRASS = ["#1E2E36", "#2A4042", "#3A5650", "#4E6E62"];
const TOP = [[14, 640], [30, 604], [44, 548], [60, 486], [80, 446], [100, 424], [122, 428], [144, 448], [164, 482], [186, 508], [210, 494], [236, 482], [270, 477], [306, 482], [334, 492], [358, 506], [380, 474], [402, 446], [426, 430], [452, 428], [478, 434], [498, 438], [512, 452], [516, 500], [522, 560], [530, 610], [540, 640]];
const topAt = (x) => { for (let i = 0; i < TOP.length - 1; i++) { const [a, ya] = TOP[i], [b, yb] = TOP[i + 1]; if (x >= a && x <= b) { const k = (x - a) / (b - a || 1); return ya + (yb - ya) * k * k * (3 - 2 * k); } } return 640; };
const caveIn = (x, y) => { if (y > CAVE.base || y < CAVE.top) return false; const ry = 56, cyy = CAVE.top + ry; if (y >= cyy) return Math.abs(x - CAVE.x) <= CAVE.hw; return ((x - CAVE.x) / CAVE.hw) ** 2 + ((y - cyy) / ry) ** 2 <= 1; };
function rock(g, P, cx, cy, rx, ry, seed, o = {}) {
  const n = o.n ?? 6 + Math.floor(rnd(seed) * 3), pts = [], base = o.base ?? 3;
  for (let i = 0; i < n; i++) { const an = -Math.PI / 2 + (i * 2 * Math.PI) / n + (rnd(seed + i * 3.1) - 0.5) * (2 / n), r = 0.84 + rnd(seed + i * 7.3) * 0.26; pts.push([cx + Math.cos(an) * rx * r, cy + Math.sin(an) * ry * r * (Math.sin(an) > 0 ? o.fb ?? 0.75 : 1)]); }
  const pc = [cx + (rnd(seed + 9) - 0.5) * rx * 0.25, cy - ry * 0.28], inner = pts.map(([x, y]) => [pc[0] + (x - cx) * 0.5, pc[1] + (y - cy) * 0.42]);
  const inside = (poly, X, Y) => { let k = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) k = !k; } return k; };
  const angs = pts.map(([x, y]) => Math.atan2(y - pc[1], x - pc[0]));
  const x0 = Math.floor(cx - rx * 1.2), x1 = Math.ceil(cx + rx * 1.2), y0 = Math.floor(cy - ry * 1.2), y1 = Math.ceil(cy + ry * 1.2), W = x1 - x0 + 1, H = y1 - y0 + 1, m = new Uint8Array(W * H);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) if (inside(pts, X + 0.5, Y + 0.5)) m[(Y - y0) * W + X - x0] = 1;
  const at = (X, Y) => X >= x0 && X <= x1 && Y >= y0 && Y <= y1 && m[(Y - y0) * W + X - x0] === 1;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    if (!at(X, Y)) continue;
    if (o.keep && !o.keep(X, Y)) continue;
    let tone;
    if (!at(X - 1, Y) || !at(X + 1, Y) || !at(X, Y + 1)) tone = Math.max(0, base - 2);
    else if (!at(X, Y - 1)) tone = base + 2;                                      // top edge, a touch lighter
    else if (inside(inner, X + 0.5, Y + 0.5)) tone = base + 1 + (Y < pc[1] - ry * 0.12 ? 1 : 0);
    else {
      const an = Math.atan2(Y + 0.5 - pc[1], X + 0.5 - pc[0]); let i = 0, best = 9;
      for (let k = 0; k < n; k++) { const a0 = angs[k], a1 = angs[(k + 1) % n]; let mid = Math.atan2(Math.sin(a0) + Math.sin(a1), Math.cos(a0) + Math.cos(a1)), d = Math.abs(Math.atan2(Math.sin(an - mid), Math.cos(an - mid))); if (d < best) { best = d; i = k; } }
      const a0 = angs[i], a1 = angs[(i + 1) % n], mid = Math.atan2(Math.sin(a0) + Math.sin(a1), Math.cos(a0) + Math.cos(a1));
      tone = base + Math.round(-Math.sin(mid) * 1.2 + Math.cos(mid) * 0.3 - 0.3);
    }
    g.px(P(X), Y + OY, ROCK[Math.max(0, Math.min(ROCK.length - 1, tone))]);
  }
  // a hairline crack or two
  if (rx > 14) for (let k = 0; k < 2; k++) { const sx = cx + (rnd(seed + 20 + k) - 0.5) * rx, sy = cy + (rnd(seed + 30 + k) - 0.3) * ry * 0.6; let x = sx, y = sy; for (let j = 0; j < 6 + rnd(seed + k) * 6; j++) { if (at(R(x), R(y)) && at(R(x), R(y) - 1) && (!o.keep || o.keep(R(x), R(y)))) g.px(P(R(x)), R(y) + OY, ROCK[1]); x += rnd(seed + j * 3 + k) - 0.5; y += 0.9; } }
}

export const cavePaint = paint;

function paint() {
  const L = new Layer(-60, 250, 600, 1010), g = L.g, P = (sx) => sx + OX;
  const put = (sx, sy, col) => g.px(P(sx), sy + OY, col);
  // ---- ground: the shared earth strata under the land line (like the savanna and the racecourse), in night colours,
  //      with a golden grass lip fading out at the savanna edge, pebbles and a few glowing cave crystals
  const NS = ["#2B2541", "#262039", "#302848", "#231D35", "#2C2442", "#211B31"];
  for (let y = 640; y < 1090; y++) for (let x = -60; x < 600; x++) {
    const d = y - 640, wx = x + OX, gold = 1 - sm(x, 0, 56);
    let col;
    if (d < 2) col = gold > bayer(x, y) ? (d < 1 ? "#C8A860" : "#A07E40") : d < 1 ? "#6A6492" : "#4E4874";
    else if (d < 5 + Math.sin(wx * 0.07) * 1.2) col = gold > bayer(x, y) ? "#6A4A28" : "#3C3558";
    else {
      const wv = Math.sin(wx * 0.021) * 4 + Math.sin(wx * 0.083 + 1) * 1.6, v = (y - 660 + wv + 400) / 20, band = Math.floor(v), f = v - band;
      col = NS[((band % NS.length) + NS.length) % NS.length];
      if (f < 0.09 && bayer(x, y) > 0.35) col = mix(col, "#14101F", 0.35);
      if (y > 750) col = mix(col, "#120E1C", Math.min(0.4, (y - 750) / 500));
      if (gold > 0) col = mix(col, "#4A2E1C", gold * 0.35);
    }
    put(x, y, col);
  }
  // pebbles and little stones in the earth
  for (let i = 0; i < 40; i++) { const x = -50 + rnd(i * 3 + 1) * 640, y = 670 + rnd(i * 3 + 2) * 400, r = 2 + rnd(i * 5) * 4; for (let yy = -R(r * 0.7); yy <= R(r * 0.7); yy++) for (let xx = -R(r); xx <= R(r); xx++) { const q = (xx / r) ** 2 + (yy / (r * 0.7)) ** 2; if (q <= 1) put(R(x) + xx, R(y) + yy, q > 0.7 ? "#16121F" : yy < 0 ? "#5A5478" : "#3E3858"); } }
  // glowing cave crystals (amethyst and teal) peeking out of the strata
  for (let i = 0; i < 10; i++) { const x = R(40 + rnd(i * 11 + 4) * 520), y = R(700 + rnd(i * 7 + 9) * 370), h = 5 + R(rnd(i * 3) * 6), col = i % 3 ? ["#7A4AC8", "#B48AF0", "#E8D8FF"] : ["#2A8A9A", "#5ACAD8", "#D8FCFF"]; for (let k = -1; k <= 1; k++) { const hh = h - Math.abs(k) * 2; for (let j = 0; j < hh; j++) put(x + k * 3, y - j, j > hh - 2 ? col[2] : k < 0 ? col[1] : col[0]); put(x + k * 3 + 1, y - hh + 1, col[0]); } }
  // ---- hill body (base fill), then boulders from back to front
  for (let x = 10; x < 545; x++) { const ty = R(topAt(x)); for (let y = ty; y < 641; y++) { const k = (y - ty) / 120; put(x, y, k < 0.5 ? ROCK[2] : (k - 0.5) > bayer(x, y) ? ROCK[1] : ROCK[2]); } }
  const rocks = [];
  for (let x = 30; x < 525; x += 30) { const ty = topAt(x), r = 22 + rnd(x) * 16; rocks.push([x + (rnd(x * 3) - 0.5) * 10, ty + r * 0.7, r * 1.15, r * 0.88, x * 7 + 1, 4]); }
  for (let y = 500; y < 650; y += 34) for (let x = 26 + ((y / 34) % 2 ? 22 : 0); x < 535; x += 46) { const ty = topAt(x); if (y < ty + 36) continue; const r = 20 + rnd(x * 11 + y) * 14; rocks.push([x + (rnd(x + y * 5) - 0.5) * 16, y + (rnd(x * 7 + y) - 0.5) * 10, r * 1.2, r * 0.8, x * 13 + y * 3, 3]); }
  rocks.sort((a, b) => a[1] - b[1]);
  const keepHill = (X, Y) => X > 8 && X < 545 && Y <= 641;
  for (const [x, y, rx, ry, seed, base] of rocks) rock(g, P, x, y, rx, ry, seed, { base, keep: (X, Y) => keepHill(X, Y) && Y >= topAt(X) - 7 });
  // moonlit rim along the skyline of the hills
  for (let x = 10; x < 545; x++) { let y = 300; while (y < 640 && !g.has(P(x), y + OY)) y++; if (y < 640 && y < topAt(x) + 12) { put(x, y, ROCK[8]); put(x, y + 1, ROCK[6]); } }
  // ---- the cave mouth: deep dark arch with rim stones and little stalactites
  for (let y = CAVE.top - 2; y <= CAVE.base; y++) for (let x = CAVE.x - CAVE.hw - 2; x <= CAVE.x + CAVE.hw + 2; x++) {
    if (!caveIn(x, y)) continue;
    let e = 1; for (let r = 1; r <= 14; r++) if (!caveIn(x - r, y) || !caveIn(x + r, y) || !caveIn(x, y - r)) { e = r / 14; break; }
    const cols = ["#22192E", "#18121F", "#100B16", "#09060E", "#05030A"], v = Math.min(4, e * 4.6 + (y > 600 ? -0.6 : 0)), lo = Math.floor(v), q = v - lo > bayer(x, y) ? Math.min(4, lo + 1) : lo;
    put(x, y, cols[Math.max(0, q)]);
  }
  // stalactites hanging from the arch
  for (let i = 0; i < 9; i++) { const x = CAVE.x - 58 + i * 14 + R((rnd(i * 5) - 0.5) * 6), len = 5 + R(rnd(i * 9) * 9); let yy = CAVE.top; while (yy < 640 && !caveIn(x, yy)) yy++; for (let j = 0; j < len; j++) { const w = Math.max(0, R((1 - j / len) * 2.4)); for (let dx = -w; dx <= w; dx++) put(x + dx, yy + j - 1, j === 0 || dx === -w ? ROCK[4] : ROCK[2]); } }
  // rim stones around the arch
  for (let k = 0; k <= 16; k++) { const an = Math.PI + (k / 16) * Math.PI, x = CAVE.x + Math.cos(an) * (CAVE.hw + 7), y = CAVE.top + 56 + Math.sin(an) * 63; if (y > 600) continue; rock(g, P, x, y, 11 + rnd(k) * 4, 8 + rnd(k * 3) * 3, 500 + k * 11, { base: 3, n: 6 }); }
  for (const sd of [-1, 1]) for (let y = 592; y < 640; y += 15) rock(g, P, CAVE.x + sd * (CAVE.hw + 8), y, 10, 9, 600 + y + sd * 7, { base: 3, n: 6 });
  // ---- golden savanna grass rising into the hill at the left edge
  for (let i = 0; i < 46; i++) {
    const bx = R(-36 + rnd(i * 7 + 3) * 116), h = 16 + rnd(i * 5 + 1) * 30 * (1 - Math.max(0, bx - 30) / 80), lean = (rnd(i * 11) - 0.35) * 10;
    if (h < 6) continue;
    for (let j = 0; j <= h; j++) { const k = j / h; put(R(bx + lean * k * k), R(641 - j), j > h * 0.7 ? GOLD[5] : j > h * 0.35 ? GOLD[4] : GOLD[3]); }
  }
  // tufts of dark night grass on the hill foot and ground
  for (let i = 0; i < 40; i++) {
    const x = R(60 + rnd(i * 13 + 5) * 430), y = 640; if (Math.abs(x - 270) < 84) continue; if (x > 486) continue;
    for (let b = 0; b < 4; b++) { const bx = x + b * 2 - 3, h = 4 + R(rnd(i * 3 + b) * 6); for (let j = 0; j < h; j++) put(bx + R((b - 1.5) * j * 0.25), y - j, NIGHT_GRASS[Math.min(3, Math.floor(j / 2))]); }
  }
  // ---- the plateau ends at the city: a rocky edge dropping beside the first building
  for (let y = 636; y < 1090; y += 22) rock(g, P, 534 + R(rnd(y) * 6), y + 8, 16 + rnd(y * 3) * 6, 13, 700 + y, { base: 2, n: 6, keep: (X) => X < 552 });
  // ---- the edge of the city: a low stone wall and a street lamp
  for (let y = 616; y < 641; y++) for (let x = 498; x < 600; x++) {
    const row = Math.floor((y - 616) / 6), off = row % 2 ? 7 : 0, joint = (y - 616) % 6 === 0 || (x + off) % 14 === 0;
    put(x, y, y === 616 ? "#8A84B0" : y === 617 ? "#6A6492" : joint ? "#2A2642" : (x + off) % 14 < 3 ? "#5A5482" : "#4A456E");
  }
  for (let y = 548; y < 641; y++) { put(520, y, "#1A1730"); put(521, y, "#4A4470"); put(522, y, "#2A2642"); }
  for (let x = 514; x < 529; x++) put(x, 546, "#1A1730"); for (let x = 515; x < 528; x++) { put(x, 547, "#3A3458"); put(x, 553, "#1A1730"); } for (let y = 548; y < 553; y++) { put(514, y, "#1A1730"); put(528, y, "#1A1730"); for (let x = 515; x < 528; x++) put(x, y, y < 550 ? "#FFE6A0" : "#F4C060"); }
  return L;
}


// foreground: dark boulders in the bottom corners (film rocks moved to the bottom edge, stage y ≈ 960)
function paintFront() {
  const L = new Layer(-60, 880, 600, 1010), g = L.g, P = (sx) => sx + OX;
  rock(g, P, 30, 1020, 62, 34, 901, { base: 1, n: 8 }); rock(g, P, -14, 1034, 40, 22, 907, { base: 1, n: 7 });
  rock(g, P, 500, 1030, 56, 28, 913, { base: 1, n: 8 }); rock(g, P, 444, 1044, 30, 16, 919, { base: 1, n: 6 });
  return L;
}
let CACHE = null;
export const caveLayers = () => (CACHE ??= { BACK: paint(), FRONT: paintFront() });
export { topAt };
