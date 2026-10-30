// LV7 · bat cave at night: "A tiny bat, the free-tailed bat, was tracked at a hundred and sixty."
// Moonlit rocky hills with a dark cave mouth right under the full moon. At x 3240 the hills rise out of the golden
// savanna grass; at x 3780 they give way to the first city lights (a low stone wall, a street lamp, the bullet-train
// viaduct running out from behind the hill). A cute chibi free-tailed bat flutters out of the cave and hovers face-on
// in front of the moon; a swirling column of bats pours out behind it; a radio tag pops onto its back and a little
// plane follows it across the sky along a dotted tracking line; on "a hundred and sixty" it zooms off and comes back
// from the other side. Static scenery is painted once into a world layer (graded toward dusk/dawn during the pans).
import { BIOME, REST } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { sign, rnd, fade, mix, bayer, blinkAt, MAIN } from "../cute.mjs";
import { Layer, R, sm, ease, easeOut, easeIn, lerp, clamp01, prog, gradeK, dotted, spline, along, glow } from "./city-kit.mjs";
import { drawBat, drawBatHead, drawBatGhost } from "./cave-bat.mjs";
import { drawFar, drawViaduct } from "./city-sky.mjs";
import { BAT, FLAP } from "./cave-time.mjs";

export const RANGE = BIOME.cave;
// the level is laid out in the screen coordinates it has at its resting camera: wx = sx + OX, wy = sy + OY
const OX = REST.bat.cx - 270, OY = REST.bat.cy - 480;
const WX = (sx) => sx + OX, WY = (sy) => sy + OY;
const S = (V, sx, sy) => [V.X(sx + OX), V.Y(sy + OY)];
const CITY_WX = RANGE[1];

// ---------------------------------------------------------------- palettes (night, moonlight from behind the hills)
const ROCK = ["#0C0A1C", "#15132A", "#1F1C3A", "#2A274C", "#37345F", "#464273", "#58548A", "#6E6AA2", "#8A86BE"];
const GROUND = ["#3A3254", "#322B4A", "#2B2541", "#252038", "#1F1B30"];
const GOLD = ["#3E3020", "#5E4A2C", "#806838", "#A08648", "#C0A660", "#D8C27E"];
const NIGHT_GRASS = ["#1E2E36", "#2A4042", "#3A5650", "#4E6E62"];

// ---------------------------------------------------------------- hill silhouette (rest-screen)
const TOP = [[14, 640], [30, 604], [44, 548], [60, 486], [80, 446], [100, 424], [122, 428], [144, 448], [164, 482], [186, 508], [210, 494], [236, 482], [270, 477], [306, 482], [334, 492], [358, 506], [380, 474], [402, 446], [426, 430], [452, 428], [478, 434], [498, 438], [512, 452], [516, 500], [522, 560], [530, 610], [540, 640]];
const topAt = (x) => { for (let i = 0; i < TOP.length - 1; i++) { const [a, ya] = TOP[i], [b, yb] = TOP[i + 1]; if (x >= a && x <= b) { const k = (x - a) / (b - a || 1); return ya + (yb - ya) * k * k * (3 - 2 * k); } } return 640; };
const CAVE = { x: 270, hw: 72, top: 530, base: 640 };      // cave mouth (rest-screen)
const caveIn = (x, y) => { if (y > CAVE.base || y < CAVE.top) return false; const ry = 56, cyy = CAVE.top + ry; if (y >= cyy) return Math.abs(x - CAVE.x) <= CAVE.hw; return ((x - CAVE.x) / CAVE.hw) ** 2 + ((y - cyy) / ry) ** 2 <= 1; };

/** Faceted moonlit boulder into the layer (rest-screen coordinates; P maps to the layer). */
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

// ---------------------------------------------------------------- the static layer (painted once)
let LAYER = null;
function paint() {
  const L = new Layer(WX(-40), WY(330), WX(580), WY(960)), g = L.g, P = (sx) => sx + OX;
  const put = (sx, sy, col) => g.px(P(sx), sy + OY, col);
  // ---- ground: the shared earth strata under the land line (like the savanna and the racecourse), in night colours,
  //      with a golden grass lip fading out at the savanna edge, pebbles and a few glowing cave crystals
  const NS = ["#2B2541", "#262039", "#302848", "#231D35", "#2C2442", "#211B31"];
  for (let y = 640; y < 960; y++) for (let x = -40; x < 580; x++) {
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
  for (let i = 0; i < 26; i++) { const x = -30 + rnd(i * 3 + 1) * 560, y = 670 + rnd(i * 3 + 2) * 280, r = 2 + rnd(i * 5) * 4; for (let yy = -R(r * 0.7); yy <= R(r * 0.7); yy++) for (let xx = -R(r); xx <= R(r); xx++) { const q = (xx / r) ** 2 + (yy / (r * 0.7)) ** 2; if (q <= 1) put(R(x) + xx, R(y) + yy, q > 0.7 ? "#16121F" : yy < 0 ? "#5A5478" : "#3E3858"); } }
  // glowing cave crystals (amethyst and teal) peeking out of the strata
  for (let i = 0; i < 7; i++) { const x = R(40 + rnd(i * 11 + 4) * 440), y = R(700 + rnd(i * 7 + 9) * 230), h = 5 + R(rnd(i * 3) * 6), col = i % 3 ? ["#7A4AC8", "#B48AF0", "#E8D8FF"] : ["#2A8A9A", "#5ACAD8", "#D8FCFF"]; for (let k = -1; k <= 1; k++) { const hh = h - Math.abs(k) * 2; for (let j = 0; j < hh; j++) put(x + k * 3, y - j, j > hh - 2 ? col[2] : k < 0 ? col[1] : col[0]); put(x + k * 3 + 1, y - hh + 1, col[0]); } }
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
  for (let y = 636; y < 960; y += 22) rock(g, P, 534 + R(rnd(y) * 6), y + 8, 16 + rnd(y * 3) * 6, 13, 700 + y, { base: 2, n: 6, keep: (X) => X < 552 });
  // ---- the edge of the city: a low stone wall and a street lamp
  for (let y = 616; y < 641; y++) for (let x = 498; x < 560; x++) {
    const row = Math.floor((y - 616) / 6), off = row % 2 ? 7 : 0, joint = (y - 616) % 6 === 0 || (x + off) % 14 === 0;
    put(x, y, y === 616 ? "#8A84B0" : y === 617 ? "#6A6492" : joint ? "#2A2642" : (x + off) % 14 < 3 ? "#5A5482" : "#4A456E");
  }
  for (let y = 548; y < 641; y++) { put(520, y, "#1A1730"); put(521, y, "#4A4470"); put(522, y, "#2A2642"); }
  for (let x = 514; x < 529; x++) put(x, 546, "#1A1730"); for (let x = 515; x < 528; x++) { put(x, 547, "#3A3458"); put(x, 553, "#1A1730"); } for (let y = 548; y < 553; y++) { put(514, y, "#1A1730"); put(528, y, "#1A1730"); for (let x = 515; x < 528; x++) put(x, y, y < 550 ? "#FFE6A0" : "#F4C060"); }
  return L;
}

// ---------------------------------------------------------------- grades for the pans (art is painted for the night)
const DUSK = { mul: [1.3, 1.0, 0.82], add: [30, 10, -6] }, DAWN = { mul: [1.14, 0.98, 1.0], add: [22, 6, 12] };
function gradeFor(V) { const T = tod(V.cx); if (T < 6) return gradeK(DUSK, 1 - sm(T, 4.9, 5.95)); return gradeK(DAWN, sm(T, 6.1, 7)); }

// ---------------------------------------------------------------- the bat's path (rest-screen)
const HOVER = [270, 372];
const OUT_PATH = spline([[270, 604], [258, 548], [266, 478], [280, 420], [270, HOVER[1]]], 8);
export function batState(t) {
  const st = { x: HOVER[0], y: HOVER[1], a: 1, spread: 1, tilt: 0, w: Math.sin((2 * Math.PI * t) / FLAP), speed: 0, flapFast: 0 };
  if (t < BAT.out[0]) { st.a = 0; return st; }
  if (t < BAT.out[1]) {
    const k = prog(t, BAT.out), p = along(OUT_PATH, easeOut(k));
    st.x = p.x; st.y = p.y; st.a = sm(k, 0, 0.18); st.spread = lerp(0.35, 1, sm(k, 0.1, 0.8)); st.tilt = (p.dx / (Math.hypot(p.dx, p.dy) || 1)) * 0.3 * (1 - k);
    st.w = Math.sin((2 * Math.PI * t) / (FLAP * 0.75)); return st;
  }
  const bob = Math.sin((2 * Math.PI * t) / FLAP + 1.2) * 2.2;
  st.y += bob;
  if (t >= BAT.windup[0] && t < BAT.windup[1]) { const k = ease(prog(t, BAT.windup)); st.x -= 8 * k; st.tilt = -0.14 * k; st.w = lerp(st.w, 1, k); st.spread = 1 - 0.1 * k; }
  else if (t >= BAT.dashOut[0] && t < BAT.dashBack[0]) { const k = easeIn(prog(t, BAT.dashOut)); st.x = lerp(262, 700, k); st.tilt = lerp(-0.14, 0.32, Math.min(1, k * 3)); st.spread = 0.55; st.w = Math.sin((2 * Math.PI * t) / (FLAP * 0.5)) * 0.6; st.speed = Math.min(1, prog(t, BAT.dashOut) * 3); if (t > BAT.dashOut[1]) st.a = 0; }
  else if (t >= BAT.dashBack[0] && t < BAT.dashBack[1]) { const k = easeOut(prog(t, BAT.dashBack)); st.x = lerp(-130, 286, k); st.tilt = 0.32 * (1 - k); st.spread = lerp(0.55, 1, sm(k, 0.5, 1)); st.w = Math.sin((2 * Math.PI * t) / (FLAP * 0.5)) * 0.6; st.speed = 1 - sm(k, 0.55, 1); }
  else if (t >= BAT.settle[0] && t < BAT.settle[1]) { const k = ease(prog(t, BAT.settle)); st.x = lerp(286, 270, k); }
  return st;
}

// ---------------------------------------------------------------- the little tracking plane (rest-screen path)
function planeAt(t) {
  const [p0] = BAT.plane, climb = easeIn(prog(t, [BAT.plane[1] - 1.25, BAT.plane[1]]));
  return { x: -60 + 236 * (t - p0), y: 236 - 14 * (t - p0) - 330 * climb, pitch: 0.06 + 0.5 * Math.min(1, climb * 3) };
}
function drawPlane(c, x, y, pitch, t, a = 1) {
  if (a <= 0) return [x, y]; const g = fade(c, a), X = R(x), Y = R(y);
  const P = (dx, dy, col) => g.px(X + dx, Y + dy - R(dx * pitch), col);
  const span = (x0, x1, dy, col) => { for (let dx = x0; dx <= x1; dx++) P(dx, dy, col); };
  const O = "#1E1A30", W1 = "#F4F2FC", W2 = "#DAD8EA", W3 = "#A8A6C4", B = "#3A5AB8";
  // fuselage: rounded nose (right), cabin, tapering tail boom (left)
  const prof = (dx) => dx > 18 ? [-2, 3] : dx > 14 ? [-3, 4] : dx > -2 ? [-4, 4] : dx > -12 ? [-3, 3] : dx > -20 ? [-2, 2] : [-1, 2];
  for (let dx = -24; dx <= 21; dx++) { const [t0, b0] = prof(dx); P(dx, t0 - 1, O); P(dx, b0 + 1, O); for (let dy = t0; dy <= b0; dy++) P(dx, dy, dy === t0 ? W1 : dy === b0 ? W3 : dy === 1 ? B : dy > 1 ? W2 : W1); }
  for (let dy = -2; dy <= 3; dy++) { P(22, dy, O); P(-25, dy - 1 < 1 ? dy - 1 : 1, O); }
  // cabin windows
  span(6, 9, -3, "#5A84D8"); span(10, 13, -3, "#8AB8F4"); span(1, 4, -3, "#4A6AB8"); P(14, -2, "#8AB8F4");
  // tail fin + stabiliser
  for (let j = 0; j < 9; j++) { const x0 = -24 + R(j * 0.45), x1 = -18 + R(j * 0.05); span(x0, x1, -2 - j, j === 8 ? O : j > 5 ? W2 : W1); P(x0 - 1, -2 - j, O); P(x1 + 1, -2 - j, O); }
  span(-28, -17, 0, O); span(-27, -18, -1, W2);
  // high wing (seen edge-on) with a strut, wheels
  span(-6, 14, -7, O); span(-5, 13, -6, W2); span(-5, 13, -5, O);
  for (let j = 0; j < 6; j++) P(5 - j, -4 + j, "#6A6890");
  for (const wx of [9, -8]) { P(wx, 5, "#4A4868"); P(wx, 6, O); P(wx - 1, 6, O); P(wx + 1, 6, O); P(wx, 7, O); }
  // propeller blur
  for (let dy = -7; dy <= 7; dy++) if (Math.abs(dy) < 2 || (dy + Math.floor(t * 30)) % 2 === 0) P(23, dy, Math.abs(dy) < 2 ? "#6A6888" : "#E4E4F0");
  // lights: red beacon on the fin, white strobe on the wing tip (smooth pulses)
  const b = 0.5 + 0.5 * Math.sin(t * 9), st = Math.max(0, Math.sin(t * 6.3)) ** 6;
  P(-21, -12, mix("#5A1A1A", "#FF4A3A", b)); if (b > 0.55) for (const [dx, dy] of [[-22, -12], [-20, -12], [-21, -13]]) fade(c, a * (b - 0.55) * 2.2).px(X + dx, Y + dy - R(dx * pitch), "#FF7A6A");
  P(13, -8, mix("#8A8AA8", "#FFFFFF", st)); if (st > 0.3) for (const [dx, dy] of [[14, -8], [12, -8], [13, -9]]) fade(c, a * st).px(X + dx, Y + dy - R(dx * pitch), "#FFFFFF");
  return [X, Y + 6];
}

// ---------------------------------------------------------------- the stream of bats pouring out of the cave
const STREAM = spline([[270, 612], [284, 560], [316, 512], [366, 466], [412, 410], [446, 348], [478, 284], [520, 228], [600, 170]], 10);
const STREAM_LEN = along(STREAM, 1).len;
const TINY = [
  [["#...#", "##.##", ".###.", "..#.."], [".....", "..#..", "#####", "#.#.#"]],         // near: wings up / down
  [["#.#", ".#."], ["...", "###"]],                                                     // mid
];
function drawStream(c, V, t) {
  if (t < BAT.stream[0]) return;
  const head = (t - BAT.stream[0]) * 320, ox = V.X(OX), oy = V.Y(OY), dark = "#100812", rim = "#8A80B8";
  for (let i = 0; i < 460; i++) {
    const v = 150 + rnd(i * 3 + 1) * 110, f = (rnd(i * 7 + 2) + ((t - BAT.stream[0]) * v) / STREAM_LEN) % 1, s = f * STREAM_LEN;
    if (s > head) continue;
    const p = along(STREAM, f), n = Math.hypot(p.dx, p.dy) || 1, nx = -p.dy / n, ny = p.dx / n, wid = 7 + 46 * f;
    // a twisting ribbon: each bat circles the column axis (projected helix), plus a little lag/lead along it
    const ph = 2 * Math.PI * (f * 3.2 + rnd(i * 5)) + t * 4.2, sw = Math.sin(ph) * wid * (0.35 + 0.65 * rnd(i * 11)), lag = (rnd(i * 13) - 0.5) * 10;
    const x = R(ox + p.x + nx * sw + (p.dx / n) * lag), y = R(oy + p.y + ny * sw + (p.dy / n) * lag);
    const a = sm(s, 0, 26) * (1 - sm(f, 0.84, 1)); if (a < 1 && a <= bayer(x, y)) continue;
    const size = f < 0.34 ? 0 : f < 0.7 ? 1 : 2, fr = Math.floor(t * 15 + i * 0.37) % 2, front = Math.cos(ph) > 0;
    if (size < 2) { const spr = TINY[size][fr]; const w = spr[0].length, h = spr.length; for (let j = 0; j < h; j++) for (let k = 0; k < w; k++) if (spr[j][k] === "#") c.px(x - (w >> 1) + k, y - 1 + j, dark); if (front) { c.px(x - (w >> 1), y - 1 + (fr ? 0 : h - 1), rim); c.px(x - (w >> 1) + w - 1, y - 1 + (fr ? 0 : h - 1), rim); } }
    else { c.px(x, y, dark); if (fr) c.px(x + 1, y - 1, dark); else c.px(x + 1, y, dark); }
  }
}

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (RANGE[1] + 60 < V.x0 || RANGE[0] - 60 > V.x1) return;
  drawFar(c, V, t, RANGE[0], CITY_WX);
  drawViaduct(c, V, t, "back", RANGE[0], CITY_WX);
  drawViaduct(c, V, t, "front", RANGE[0], CITY_WX);
  if (!LAYER) LAYER = paint();
  LAYER.blit(c, V, { grade: gradeFor(V), x1: R(V.X(CITY_WX + 22)) });
  // the street lamp's warm glow
  const [lx, ly] = S(V, 521, 552); if (lx > -40 && lx < 580) glow(c, lx, ly + 4, 26, 20, "#FFC870", 0.32 + 0.03 * Math.sin(t * 5.3));
  // little eyes glinting in the dark cave (blink slowly)
  for (let i = 0; i < 4; i++) {
    const ex = 230 + i * 26 + R(rnd(i * 3) * 8), ey = 580 + R(rnd(i * 5) * 40), b = blinkAt(t, 2.6 + i * 0.7, i * 0.9), on = sm(t, 30.4, 30.8) * (1 - b);
    if (on <= 0.05) continue; const [x, y] = S(V, ex, ey);
    if (on > bayer(R(x), R(y))) { c.px(R(x), R(y), "#F4D070"); c.px(R(x) + 3, R(y), "#F4D070"); }
  }
}

export function actors(c, V, t) {
  if (RANGE[1] + 140 < V.x0 || RANGE[0] - 140 > V.x1) return;
  // LV 7 sign: a stone tablet on the ground right of the cave
  { const [x, y] = S(V, 410, 641); if (x > -60 && x < 600) sign(c, R(x), R(y), "LV 7", "stone"); }
  drawStream(c, V, t);
  // the plane and the tracking line
  const st = batState(t), [bx, by] = S(V, st.x, st.y);
  let tagTip = null;
  if (st.a > 0) {
    if (st.speed > 0.05) { speedLines(c, bx, by, st, t); const dir = t < BAT.dashBack[0] ? -1 : 1; for (const [k, aa] of [[3, 0.18], [2, 0.3], [1, 0.45]]) drawBatGhost(c, bx + dir * k * 26 * st.speed, by, 1, st.tilt, aa * st.speed); }
    const o = drawBat(c, bx, by, { w: st.w, spread: st.spread, tilt: st.tilt, a: st.a, look: [0, 0.05], blink: blinkAt(t, 3.1, 0.6), tw: earTwitch(t), tail: Math.sin(t * 22) * (sm(t, BAT.tail[0], BAT.tail[0] + 0.1) - sm(t, BAT.tail[1] - 0.1, BAT.tail[1])), smile: Math.sin(Math.PI * clamp01((t - BAT.squeak) / 0.34)) * (t > BAT.squeak && t < BAT.squeak + 0.34 ? 1 : 0), tag: ease(prog(t, BAT.tag)), led: 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.3), time: t });
    tagTip = o.tag ?? null;
  }
  if (t > BAT.plane[0] && t < BAT.plane[1] + 0.2) {
    const p = planeAt(t), [px, py] = S(V, p.x, p.y);
    const belly = drawPlane(c, px, py, p.pitch, t, 1);
    // the line fades out while the bat is away on its dash and back in when it has returned
    const away = sm(t, BAT.dashOut[0] + 0.04, BAT.dashOut[0] + 0.16) * (1 - sm(t, BAT.dashBack[1] - 0.1, BAT.dashBack[1] + 0.06));
    const la = Math.min(sm(t, BAT.link[0], BAT.link[0] + 0.12), 1 - sm(t, BAT.plane[1] - 1.05, BAT.plane[1] - 0.65), 1 - away);
    if (la > 0 && tagTip && st.a > 0.5) {
      const k = ease(prog(t, BAT.link)), g = fade(c, la);
      dotted(g, [tagTip, belly], k, "#8AF0A8", { gap: 6, size: 2, dark: "#123A2A", phase: -t * 24 });
      // radio waves from the tag
      for (let j = 0; j < 3; j++) { const u = ((t * 1.6 + j / 3) % 1), r = 4 + u * 12, ga = fade(c, la * (1 - u)); const ang = Math.atan2(belly[1] - tagTip[1], belly[0] - tagTip[0]); for (let q = -4; q <= 4; q++) { const an = ang + q * 0.16; ga.px(R(tagTip[0] + Math.cos(an) * r), R(tagTip[1] + Math.sin(an) * r), "#8AF0A8"); } }
    }
  }
}

function earTwitch(t) { const p = ((t + 0.4) % 2.3 + 2.3) % 2.3; return p < 0.22 ? Math.sin((Math.PI * p) / 0.22) : 0; }
function speedLines(c, x, y, st, t) {
  const dir = t < BAT.dashBack[0] ? -1 : 1, k = st.speed;
  for (let i = 0; i < 14; i++) {
    const yy = R(y - 60 + i * 10 + (rnd(i) - 0.5) * 6), len = R((60 + rnd(i * 3) * 120) * k), x0 = R(x + dir * (40 + rnd(i * 7) * 40)), g = fade(c, 0.9 * k);
    for (let j = 0; j < len; j++) if (j < len * 0.6 || (j + i) % 3) { g.px(x0 + dir * j, yy, j < 12 ? "#FFFFFF" : "#D8D0F8"); if (i % 3 === 0 && j < len * 0.5) g.px(x0 + dir * j, yy + 1, "#B8B0E8"); }
  }
}

export function front(c, V, t) {
  if (RANGE[1] + 60 < V.x0 || RANGE[0] - 60 > V.x1) return;
  // dark foreground boulders in the bottom corners and grass blades that sway a little
  if (!FRONT) FRONT = paintFront();
  FRONT.blit(c, V, { grade: gradeFor(V) });
  for (let i = 0; i < 14; i++) {
    const sx = -20 + rnd(i * 5 + 77) * 110, [x, y] = S(V, sx, 958), h = 18 + rnd(i * 3 + 70) * 26, sway = Math.sin(t * 1.7 + i) * 3;
    if (x < -10 || x > 550) continue;
    for (let j = 0; j <= h; j++) { const k = j / h; c.px(R(x + sway * k * k + (rnd(i) - 0.5) * 8 * k), R(y - j), j > h * 0.65 ? "#6A5A38" : "#3E3424"); }
  }
}
let FRONT = null;
function paintFront() {
  const L = new Layer(WX(-40), WY(860), WX(580), WY(970)), g = L.g, P = (sx) => sx + OX;
  rock(g, P, 30, 935, 62, 34, 901, { base: 1, n: 8 }); rock(g, P, -14, 950, 40, 22, 907, { base: 1, n: 7 });
  rock(g, P, 500, 948, 56, 28, 913, { base: 1, n: 8 }); rock(g, P, 444, 960, 30, 16, 919, { base: 1, n: 6 });
  return L;
}

export function hud(c, V, t) {}

/** Head portrait for the speedometer and the guess cards. */
export function ICON(c, cx, cy, a = 1) { drawBatHead(c, cx, cy + 2, a, 0.6); }
export { drawBatHead };
