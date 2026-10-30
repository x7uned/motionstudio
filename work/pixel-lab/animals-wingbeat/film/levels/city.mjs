// LV2 · city — the rock pigeon, 6 wingbeats a second (RANGE BIOME.city = 540..1080, rest camera cx 810 → screen x =
// world x − 540). A harbour-town square in the morning (tod ≈ 1.5): LV1's sea ends at the quay on the left (stone wall
// face, lapping foam, a bollard), warm house fronts across the square (city-scene.mjs, cached), chimney smoke, pigeons
// sitting on the roof ridge and cornices, three pigeons pecking on the cobbles in front, an iron street lamp carrying the
// blue "LV 2" street plate, a geranium planter in the corner, a hedge and a little tree leading into LV3's garden.
// The cute pigeon hovers in front of the sky disc, flapping from wingPhase("pigeon", t) — real wing positions every
// frame (e = cos(2π·phase)), with a faint half-frame smear of the fast stroke.
import { BIOME, LAND, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { sign, blinkAt, fade, mix, bayer, ease } from "../cute.mjs";
import { Layer } from "./meadow-kit.mjs";
import { cityLayer, hash, CB, PUDDLES } from "./city-scene.mjs";
import { drawPigeon, smallPigeon } from "./city-pigeon.mjs";

export const RANGE = BIOME.city;
const R = Math.round, TAU = Math.PI * 2, [X0, X1] = RANGE;
const osc = (t, n, ph = 0) => Math.sin((TAU * n * t) / END + ph);
const cyc = (t, n, ph = 0) => { const v = (n * t) / END + ph; return v - Math.floor(v); };
const off = (V) => V.x1 < X0 - 140 || V.x0 > X1 + 140;
const SX = (V, sx) => V.X(sx + 540), SY = (V, sy) => V.Y(sy - 660);     // rest-screen → screen
const HEAD = [810, LAND - 288];                                          // pigeon head centre (world) → screen (270, 352)

// ---------------------------------------------------------------- layers
export function back(c, V, t) {
  if (off(V)) return;
  cityLayer().blit(c, V);
  quayWall(c, V, t);
  smoke(c, V, t);
  // the puddles shimmer: a slow ripple ring and a glint
  for (const [cx, cy, rx, ry] of PUDDLES) {
    const x = SX(V, cx), y = SY(V, cy); if (x < -80 || x > c.w + 80) continue;
    const ph = cyc(t, 13, cx * 0.01), rr = 0.25 + 0.7 * ph, g = fade(c, Math.sin(Math.PI * ph) * 0.8);
    g.ering(R(x - rx * 0.2), R(y + 1), R(rx * 0.5 * rr), Math.max(1, R(ry * 0.5 * rr)), "#FFFFFF");
    const gl = fade(c, 0.5 + 0.5 * osc(t, 9, cx)), gx = R(x + rx * 0.35), gy = R(y - ry * 0.35); for (const [dx, dy] of [[0, 0], [1, 0], [0, -1], [0, 1], [-1, 0]]) gl.px(gx + dx, gy + dy, "#FFFFFF");
  }
}

export function actors(c, V, t) {
  if (off(V)) return;
  // pigeons sitting on the roofs (cooing: chest puffs, a slow head bob)
  for (const [sx, sy, flip, n, ph] of [[50, 373, false, 9, 0.2], [150, 423, true, 11, 1.4], [500, 393, true, 7, 2.9]]) {
    const x = R(SX(V, sx)); if (x < -30 || x > c.w + 30) continue;
    const coo = Math.max(0, osc(t, n, ph)) ** 2;
    smallPigeon(c, x, R(SY(V, sy)), { sit: 1, puff: coo, peck: 0.15 * Math.max(0, osc(t, n * 3, ph)), flip, s: 1 });
  }
  frontLayer().blit(c, V);
  // the street plate on the lamp post (in-world LV sign)
  sign(c, R(SX(V, 34)), R(SY(V, 612)), "LV 2", "plate", 1, t);
  // pigeons pecking on the square (bigger, in front)
  for (const [sx, sy, flip, n, ph, s] of [[140, 890, false, 23, 0.3, 2.1], [232, 918, true, 19, 2.2, 2.3], [322, 872, true, 17, 4.1, 1.95], [392, 930, false, 21, 1.1, 2.4]]) {
    const x = R(SX(V, sx)); if (x < -40 || x > c.w + 40) continue;
    const pk = Math.max(0, osc(t, n, ph)) ** 3, step = ((sx / 50) | 0) % 2 ? osc(t, n * 0.5 | 0 || 1, ph) * 0.5 : 0;
    // crumbs in front of the beak
    for (let k = 0; k < 5; k++) { const cxk = x + (flip ? -1 : 1) * R(10 + hash(k + sx) * 18) * s / 1.7, cyk = R(SY(V, sy)) - R(hash(k * 3 + sx) * 4); c.px(cxk, cyk, "#F2DCA8"); c.px(cxk + 1, cyk, "#D8B880"); }
    smallPigeon(c, x, R(SY(V, sy)), { peck: pk, flip, s, step: 0 });
  }
  // the hero pigeon
  const P = pose(V, t);
  if (P.x > -220 && P.x < c.w + 220) drawPigeon(c, P.x, P.y, P);
}

export function front(c, V, t) {
  if (off(V)) return;
  planterLayer().blit(c, V);
  // geraniums nodding a little in the breeze (per frame, small)
  for (let k = 0; k < 7; k++) {
    const sx = 446 + k * 15 + R(hash(k * 5) * 6), sy = 884 - R(hash(k * 9) * 10), x = R(SX(V, sx) + 1.5 * osc(t, 7 + k, k)), y = R(SY(V, sy));
    if (x < -10 || x > c.w + 10) continue;
    for (const [dx, dy] of [[0, 0], [-3, 1], [3, 1], [-1, -3], [2, -2], [0, 3]]) { const r = 2; for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r) c.px(x + dx + i, y + dy + j, j < 0 && i < 0 ? "#FF7A7A" : (k & 1 ? "#E0304A" : "#F0506A")); }
    c.px(x, y, "#FFE0A0");
  }
}

/** Pigeon pose at t (screen). */
export function pose(V, t) {
  const amt = strokeAmt("pigeon", t), ph = wingPhase("pigeon", t);
  const dy = -2.5 * Math.sin(TAU * ph) * amt + 3 * osc(t, 7, 0.4) + 1.5 * osc(t, 17), dx = 3 * osc(t, 5, 1.2);
  return { x: V.X(HEAD[0] + dx), y: V.Y(HEAD[1] + dy), tilt: 0.045 * osc(t, 11, 0.6) + 0.02 * osc(t, 23), ph, prevPh: wingPhase("pigeon", t - 1 / 60), amt,
    look: [0.25 * osc(t, 5, 2), 0.1 + 0.15 * Math.max(0, osc(t, 9, 1))], blink: blinkAt(t, END / 17, 0.4), sheen: cyc(t, 19) };
}

// ---------------------------------------------------------------- quay wall face (the harbour edge) with lapping foam
function quayWall(c, V, t) {
  const sx0 = R(SX(V, 0)); if (sx0 < -20 || sx0 > c.w + 20) return;
  const GY = R(SY(V, 640));
  for (let y = Math.max(0, GY); y < c.h; y++) {
    const d = y - GY + 0.5, w = R(2 + d * 0.03), r = Math.log(1 + d / CB.D0) * CB.K * 0.5, course = Math.floor(r), fr = r - course, rowPx = (d + CB.D0) / (CB.K * 0.5);
    for (let i = 1; i <= w; i++) {
      const x = sx0 - i; if (x < 0 || x >= c.w) continue;
      const joint = fr < Math.min(0.4, 1 / rowPx) || ((i + course * 3) % 9 === 0 && w > 6);
      const wet = Math.max(0, (i - w * 0.55) / (w * 0.45));
      let col = joint ? "#2E3440" : mix(hash(course * 13 + (i > w / 2 ? 1 : 0)) < 0.5 ? "#5E6070" : "#545666", "#1E2C3C", wet * 0.7);
      if (i === 1) col = "#8E8C96";
      c.px(x, y, col);
    }
    // foam lapping against the wall
    const lap = 2 + 2.5 * (0.5 + 0.5 * Math.sin(TAU * (cyc(t, 40) * 1 + d * 0.035)));
    for (let i = 0; i < lap * (0.5 + d / 320); i++) { const x = sx0 - w - 1 - i; if (x < 0 || x >= c.w) continue; if (i > lap * 0.6 && bayer(x, y) > 0.5) continue; c.px(x, y, i < 1.5 ? "#FFFFFF" : "#D6ECF4"); }
  }
}

// ---------------------------------------------------------------- chimney smoke (soft puffs rising and drifting right)
function smoke(c, V, t) {
  for (const [sx, sy, n, k0] of [[76, 344, 23, 0], [306, 432, 19, 0.5], [436, 364, 21, 0.25]]) {
    const bx = SX(V, sx); if (bx < -80 || bx > c.w + 40) continue; const by = SY(V, sy);
    for (let k = 0; k < 6; k++) {
      const ph = cyc(t, n, k / 6 + k0), x = bx + ph * 40 + 3 * Math.sin(ph * 5 + k), y = by - ph * 64, r = 3 + ph * 7, a = Math.min(1, ph / 0.12) * (1 - ph) * 0.95;
      for (let j = R(-r); j <= R(r); j++) for (let i = R(-r); i <= R(r); i++) { const q = (i * i + j * j) / (r * r); if (q > 1) continue; const X = R(x + i), Y = R(y + j); if (a * (1.15 - q * 0.6) <= bayer(X, Y)) continue; c.px(X, Y, j < -r * 0.25 && i < r * 0.3 ? "#FFFFFF" : q > 0.55 ? "#D2DAE6" : "#EEF2F8"); }
    }
  }
}

// ---------------------------------------------------------------- static props in front of the square (cached layers)
let FL = null, PL = null;
/** The iron street lamp (unlit in the morning) and the quay bollard with its rope. */
function frontLayer() {
  if (FL) return FL;
  const L = new Layer(500, -660, 640, 300), cc = L.c, g = Object.create(cc); g.px = (x, y, col) => cc.px(x + 40, y, col);
  const IRON = "#22242E", IRON2 = "#3A3E4E", IRON3 = "#5A6074";
  // lamp post: base plinth, fluted post, scroll arms, lantern with pale glass and a little cap
  for (let y = 776; y < 808; y++) for (let x = 24; x <= 44; x++) { const w = y < 784 ? 8 : 10; if (Math.abs(x - 34) > w) continue; g.px(x, y, x < 30 ? IRON3 : x > 39 ? IRON : IRON2); }
  for (let y = 576; y < 778; y++) for (let x = 30; x <= 38; x++) { const w = 3 + (y > 740 ? 1 : 0); if (Math.abs(x - 34) > w) continue; g.px(x, y, x < 33 ? IRON3 : x > 35 ? IRON : IRON2); }
  for (const y of [600, 690, 760]) for (let x = 29; x <= 39; x++) { g.px(x, y, IRON3); g.px(x, y + 1, IRON); }
  for (const sd of [-1, 1]) for (let k = 0; k < 12; k++) { const a = (k / 11) * Math.PI, x = R(34 + sd * (4 + 8 * Math.sin(a * 0.5))), y = R(574 - 6 * Math.sin(a)); g.px(x, y, IRON2); g.px(x, y + 1, IRON); }
  for (let y = 544; y < 574; y++) { const w = R(6 + (y - 544) * 0.22); for (let x = 34 - w; x <= 34 + w; x++) { const edge = Math.abs(x - 34) >= w - 1 || y === 544 || y === 573 || x === 34; g.px(x, y, edge ? IRON : mix("#F8F0D0", "#C8D8E8", (y - 544) / 30)); } }
  for (let y = 534; y < 545; y++) { const w = R(2 + (y - 534) * 0.75); for (let x = 34 - w; x <= 34 + w; x++) g.px(x, y, x < 34 ? IRON3 : IRON); }
  g.px(34, 532, IRON3); g.px(34, 531, IRON); g.px(31, 552, "#FFFFFF"); g.px(31, 553, "#FFFFFF");
  // quay bollard + rope dropping to the sea
  for (let y = 896; y < 944; y++) { const w = y < 904 ? 9 : y < 910 ? 6 : 8; for (let x = 18 - w; x <= 18 + w; x++) g.px(x, y, x < 14 ? IRON3 : x > 22 ? IRON : IRON2); }
  for (let k = 0; k <= 40; k++) { const u = k / 40, x = R(18 - u * 30), y = R(906 + u * 30 + 10 * Math.sin(u * Math.PI)); g.px(x, y, "#C8A86A"); g.px(x, y + 1, "#8A6A3A"); }
  FL = L; return L;
}
/** The terracotta planter in the bottom-right corner (leaves; the geranium heads are drawn per frame). */
function planterLayer() {
  if (PL) return PL;
  const L = new Layer(940, -660, 1110, 300), cc = L.c, g = Object.create(cc); g.px = (x, y, col) => cc.px(x - 400, y, col);
  for (let y = 900; y < 960; y++) for (let x = 432; x < 566; x++) { const top = y < 906, end = x > 561; g.px(x, y, top ? (y === 900 ? "#F0A070" : "#C86A3C") : x < 436 ? "#E08A5A" : end ? "#7A3A20" : (y - 906) % 12 === 0 ? "#8A4224" : "#B05A32"); }
  for (let k = 0; k < 26; k++) { const x = 438 + k * 4 + R(hash(k) * 3), y = 898 - R(hash(k * 3) * 16), r = 3 + R(hash(k * 7) * 2); for (let j = -r; j <= r; j++) for (let i = -r - 1; i <= r + 1; i++) if (i * i * 0.7 + j * j <= r * r) g.px(x + i, y + j, j < 0 ? "#5EA84E" : (i + j) & 1 ? "#3E8A3E" : "#2E6E32"); }
  PL = L; return L;
}
