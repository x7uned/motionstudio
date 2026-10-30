// LV10 · Etruscan shrew — a dry-stone wall above the Mediterranean at sunset (RANGE BIOME.wall = 4590..5130), then
// the twist and the start of the loop dive. Golden-hour light: a far sea glittering under the huge setting sun, two
// hazy islands, a gnarled olive tree behind the wall, a cypress on the headland, lavender, poppies and dry grass in
// front. The land rises to a headland whose limestone cliff drops into the sea at x ≈ 5086; the ground is a cutaway of
// terra rossa and limestone strata (a buried Etruscan amphora, fossil shells) and the cliff continues under water
// (posidonia, a starfish, urchins, little fish) — the camera passes it on the dive into the whale's ocean.
// A tiny velvety shrew peeks out of a gap between the top stones, its head in the sun; its heart icon flickers with
// pulse("shrew", t) (1,511 BPM = 25 beats a second: an intense vibration) · "record" → a gold RECORD ribbon with a
// trophy · "fifteen" → +1,511 BPM · twist (screen-space panels y 200–600 over the dimmed scene, levels/wall-twist.mjs):
// "billion … life" → ≈ 1,000,000,000 HEARTBEATS PER LIFE · "fast mouse" → mouse portrait, 2 YEARS · "slow elephant" →
// elephant portrait, 60 YEARS · "both" → both bars fill to the same ≈ 1 BILLION · "we" → the hero, 3 BILLION (three
// bars) while the camera starts the dive over the wall into the sea; everything is gone before "biggest".
import { BIOME, EV, LV, END, WORLD_W, pulse } from "../timeline.mjs";
import { tod, view } from "../world.mjs";
import { sign, pickup, blob, ell, tube, bez, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, C, MAIN } from "../cute.mjs";
import { worldLayer, profile, seaStripExact, underTint, heartIcon, gaze, R } from "./snow-kit.mjs";
import { drawShrew } from "./wall-shrew.mjs";
import { twistHud } from "./wall-twist.mjs";

export const RANGE = BIOME.wall;
const [X0, X1] = RANGE;
const SX = 4860, HEAD_Y = -288;                      // shrew head centre (world)
const HZ = -228;                                     // far sea horizon (world y)
const CLIFF = 5086;                                  // the headland's sea cliff
const NOTCH = { x0: 4822, x1: 4898, floor: -206 };  // the gap between the top stones the shrew peeks out of

/** Every timed motion of this level as [t0, t1] (s); the drawing code reads these, levels/snow-motions.mjs too. */
export const WALL_T = {
  ribbon: [EV.record + 0.15, EV.record + 0.6], ribbonText: [EV.record + 0.42, EV.record + 0.72], ribbonOut: [EV.twist - 0.2, EV.twist + 0.3],
  huh: [EV.twist - 0.05, EV.twist + 0.2], huhOut: [EV.billion1 - 1.1, EV.billion1 - 0.8],
};
const WT = WALL_T;

// ---------------------------------------------------------------- terrain
const gProf = profile([[X0 - 40, -20], [4700, -20], [4860, -25], [4960, -40], [5030, -60], [5066, -66], [5080, -60], [CLIFF, -50]]);
const G = (x) => (x > CLIFF ? 1e9 : gProf(x));
const EDGE = (() => { const e = new Float32Array(1700); for (let y = 0; y < 1700; y++) { const ledge = (y % 170) < 16 ? 9 * Math.sin(Math.PI * (y % 170) / 16) : 0; e[y] = CLIFF + 6 + 6 * Math.sin(y / 33) + 4 * Math.sin(y / 9 + 2) + (rnd(Math.floor(y / 4) * 13) - 0.5) * 2 - ledge + 12 * sm(y, 300, 700); } return e; })();
/** World x where the cliff rock ends (the water / air begins) at world y. */
const edgeAt = (y) => (y < -50 ? CLIFF : y < 0 ? CLIFF + R(y > -30 ? 3 : 0) : EDGE[Math.min(1699, Math.floor(y))]);

// ---------------------------------------------------------------- palettes (golden hour)
const STONE = ["#3A2228", "#6A4440", "#94665A", "#B88A72", "#D6AA88", "#EAC8A0", "#F8E2B8", "#FFF4D8"];
const GAP = "#26141C";
const DRYG = ["#C8B46A", "#B8A45A", "#A8944E", "#988446", "#88763E"];   // the gorge's dry grass plane at its right edge
const STRATA = ["#E8C89A", "#D8B080", "#F0D8AC", "#C89870", "#E0BC8C", "#B88660", "#EED2A4", "#CFA478"];
const OLIVE = ["#2A3424", "#3C4A30", "#52643E", "#6C7E50", "#889A68", "#A6B486", "#C4CCA4"];
const CYP = ["#14241C", "#1C3426", "#264632", "#30583E", "#3E6C4A"];

// ---------------------------------------------------------------- stones of the wall (generated once, deterministic)
const wallTop = profile([[4612, -150], [4650, -186], [4700, -204], [4780, -210], [4950, -210], [4990, -184], [5014, -142]]);
function stoneShape(x0, y0, w, h, seed) {
  // irregular stone inside the cell: squarish-to-round (per-stone exponent), a few flattened facets
  const pts = [], n = 9 + Math.floor(rnd(seed * 3) * 4), cx = x0 + w / 2, cy = y0 + h / 2, ex = 0.35 + rnd(seed * 5 + 1) * 0.45, rot = rnd(seed * 9) * 0.6;
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + rot, r = 1 - 0.16 * rnd(seed * 31 + i), px = Math.cos(a), py = Math.sin(a); const sq = Math.pow(Math.abs(px), ex) * Math.sign(px), sy = Math.pow(Math.abs(py), ex) * Math.sign(py); pts.push([cx + sq * (w / 2 - 1) * r, cy + sy * (h / 2 - 1) * r]); }
  return pts;
}
const STONES = (() => {
  const out = []; let y = 0, row = 0;
  while (row < 12) {
    const h = 22 + Math.floor(rnd(row * 17 + 3) * 12); let x = 4606 - Math.floor(rnd(row * 5) * 24);
    while (x < 5030) {
      const w = 30 + Math.floor(rnd(row * 101 + x) * 36), cx = x + w / 2, base = G(cx), top = base - y - h, wt = wallTop(cx);
      if (cx > 4614 && cx < 5016 && top > wt - h * 0.45 && !(top < NOTCH.floor - 2 && cx > NOTCH.x0 - 4 && cx < NOTCH.x1 + 4)) out.push({ x, y: top, w, h, seed: row * 1000 + x, base });
      x += w + 1;
    }
    y += h + 1; row++;
  }
  // the two tall stones flanking the shrew's gap and the flat stone it sits behind
  out.push({ x: 4782, y: -260, w: 42, h: 54, seed: 7001, notch: true }, { x: NOTCH.x1 - 2, y: -254, w: 44, h: 48, seed: 7002, notch: true }, { x: NOTCH.x0 - 4, y: NOTCH.floor, w: NOTCH.x1 - NOTCH.x0 + 8, h: 24, seed: 7003, notch: true });
  // fallen stones at both ends
  for (const [x, w, h] of [[4600, 26, 16], [5018, 30, 18], [5046, 22, 14]]) out.push({ x, y: G(x + w / 2) - h + 3, w, h, seed: x });
  return out;
})();
function insidePoly(poly, X, Y) { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; }
function paintStone(g, s, keep = () => true) {
  const poly = stoneShape(s.x, s.y, s.w, s.h, s.seed);
  let minY = Infinity, maxY = -Infinity; for (const [, y] of poly) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const inside = (X, Y) => { let ins = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) ins = !ins; } return ins; };
  const tone = rnd(s.seed * 7) * 0.9 - 0.45, warm = rnd(s.seed * 11), lich = rnd(s.seed * 13) < 0.35;
  for (let Y = Math.floor(minY) - 1; Y <= Math.ceil(maxY) + 1; Y++) for (let X = s.x - 1; X <= s.x + s.w + 1; X++) {
    if (!keep(X, Y)) continue;
    const c0 = inside(X + 0.5, Y + 0.5);
    if (!c0) { if (inside(X + 1.5, Y + 0.5) || inside(X - 0.5, Y + 0.5) || inside(X + 0.5, Y + 1.5) || inside(X + 0.5, Y - 0.5)) g.px(X, Y, GAP); continue; }
    const u = (X - s.x) / s.w, v = (Y - s.y) / s.h, topEdge = !inside(X + 0.5, Y - 1.5), botEdge = !inside(X + 0.5, Y + 2.5), leftEdge = !inside(X - 1.5, Y + 0.5), rightEdge = !inside(X + 2.5, Y + 0.5);
    let k = 4.3 + tone - v * 1.6 - u * 0.5 + (topEdge ? 1.6 : 0) + (leftEdge ? 0.6 : 0) - (botEdge ? 1.2 : 0) - (rightEdge ? 0.7 : 0);
    const fl = Math.floor(k), f = k - fl; k = f < 0.4 ? fl : f > 0.6 ? fl + 1 : (f - 0.4) / 0.2 > bayer(X, Y) ? fl + 1 : fl;
    let col = STONE[Math.max(1, Math.min(7, k))];
    if (warm < 0.25) col = mix(col, "#9A8C9A", 0.22); else if (warm > 0.8) col = mix(col, "#E89A6A", 0.15);   // some greyer, some warmer stones
    const q = rnd(X * 131 + Y * 71 + s.seed);
    if (q < 0.025) col = STONE[Math.max(1, k - 1)]; else if (q > 0.988) col = STONE[Math.min(7, k + 1)];
    // lichen: a few stones carry a small patch of orange / pale green dots
    if (lich && !topEdge) { const lx = s.x + s.w * (0.25 + 0.5 * rnd(s.seed * 17)), ly = s.y + s.h * 0.55, dd = ((X - lx) / (s.w * 0.22)) ** 2 + ((Y - ly) / (s.h * 0.3)) ** 2; if (dd < 1 && rnd(X * 37 + Y * 91 + s.seed) < 0.3 * (1 - dd)) col = rnd(s.seed + 1) < 0.6 ? "#E8A040" : "#B8C890"; }
    g.px(X, Y, col);
  }
}

// ---------------------------------------------------------------- static layers
function leafBall(g, cx, cy, r, ramp, seed) {
  const rad = (a) => r * (1 + 0.07 * Math.sin(a * 11 + seed) + 0.05 * Math.sin(a * 23 + seed * 2.3));
  for (let Y = R(cy - r * 1.25); Y <= R(cy + r * 1.25); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy), rr = rad(Math.atan2(dy, dx)); if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, ramp[0]); continue; }
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.48 + lx * 0.45 - (d / rr) * 0.15, n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 1.1)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
  // silver undersides of olive leaves: little light dashes
  for (let i = 0; i < r * 1.2; i++) { const a = rnd(seed + i * 3) * 6.28, d = rnd(seed + i * 7) * r * 0.85, x = R(cx + Math.cos(a) * d), y = R(cy + Math.sin(a) * d); g.px(x, y, "#D8E0C4"); g.px(x + 1, y, "#B4BE9C"); }
}
const thick = (g, pts, r, col) => { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay))); for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n, rr = typeof r === "function" ? r(i / (pts.length - 1)) : r; for (let j = -rr; j <= rr; j++) for (let q = -rr; q <= rr; q++) if (q * q + j * j <= rr * rr + 0.5) g.px(R(x) + q, R(y) + j, typeof col === "function" ? col(q / rr, j / rr) : col); } } };
function strata(x, y) {
  const d = y - G(x);
  if (d < 2) return d < 1 ? "#C8A050" : "#9A7A3A";                                   // dry grass line
  if (d < 18) { const q = rnd(x * 13 + y * 7); return q < 0.2 ? "#6E2C1E" : q > 0.94 ? "#A85A3A" : "#8A3A26"; }   // terra rossa
  const yy = y + 30 + R(3 * Math.sin(x * 0.013 + y * 0.002)); let i = 0, acc = 0, h = 0;
  while (true) { h = 14 + Math.floor(rnd(i * 13 + 7) * 26); if (acc + h > yy) break; acc += h; i++; if (i > 200) break; }
  const L = yy - acc, base = STRATA[Math.floor(rnd(i * 5 + 1) * STRATA.length)], deep = clamp01((y - 200) / 1200);
  let col = mix(base, "#7A5A70", deep * 0.45);
  if (L === 0) col = mix(col, "#4A2A2A", 0.4); else if (L === 1) col = mix(col, "#FFF4E0", 0.25);
  else if (rnd(i * 3) < 0.4 && (L + R(Math.sin(x * 0.2 + i))) % 5 === 0) col = mix(col, "#6A4A3A", 0.18);
  if (rnd(x * 131 + y * 71) < 0.02) col = mix(col, "#5A3A30", 0.3);
  return col;
}
const TOP = -560, BOT = 1520;
const BACK = worldLayer(X0, TOP, X1 - X0, BOT - TOP, (g, L) => {
  // far sea from the horizon toward us: sunset colours, bright band at the horizon; fades into the haze at the seam
  for (let x = X0; x < X1; x++) {
    const fadeR = (1 - sm(x, 5090, 5128)) * sm(x, X0 + 2, X0 + 56);
    for (let y = HZ; y < 0; y++) {
      if (y >= G(x) - 1 && x <= CLIFF) break;
      if (fadeR < 1 && fadeR <= bayer(x, y)) continue;
      const v = (y - HZ) / 228;
      let col = v < 0.02 ? "#FFE2B0" : v < 0.08 ? "#F2B898" : v < 0.25 ? ((v - 0.08) / 0.17 > bayer(x, y) ? "#C88AA4" : "#E2A49E") : v < 0.5 ? "#9A78B0" : v < 0.75 ? ((v - 0.5) / 0.25 > bayer(x, y) ? "#6A5C9E" : "#8270A8") : "#5E5498";
      if (v > 0.03 && rnd(Math.floor(x / 3) * 7 + y * 13) < 0.06 * (1 - v)) col = "#FFD8A8";       // static glints
      g.px(x, y, col);
    }
  }
  // two hazy islands on the horizon, one with a tiny white chapel
  for (const [cx, w, h] of [[4628, 70, 16], [5020, 90, 22]]) for (let x = R(cx - w / 2); x < cx + w / 2; x++) { const k = 1 - ((x - cx) / (w / 2)) ** 2, top = R(HZ - h * Math.sqrt(Math.max(0, k)) * (0.8 + 0.2 * Math.sin(x * 0.3))); for (let y = top; y < HZ + 1; y++) g.px(x, y, y === top ? "#E4B4C0" : y < top + 3 ? "#C496B4" : "#AA84AC"); }
  g.rect(5016, HZ - 27, 6, 6, "#FFF0E0"); g.px(5018, HZ - 29, "#FFF0E0"); g.px(5018, HZ - 30, "#E8D0C8"); g.rect(5017, HZ - 24, 2, 3, "#B48AA8");
  // olive tree behind the wall: gnarled twisted trunk, two limbs, silvery canopy
  const trunk = bez([4668, -20], [4640, -170], [4676, -300], 14), limbA = bez([4672, -270], [4700, -330], [4736, -360], 10), limbB = bez([4664, -260], [4630, -320], [4612, -350], 10);
  const bark = (u, v) => (u < -0.3 ? "#9A8C78" : u < 0.3 ? "#7A6C5C" : "#54483E");
  thick(g, trunk, (k) => R(lerp(15, 9, k)), bark); thick(g, limbA, 6, bark); thick(g, limbB, 5, bark);
  for (let i = 0; i < 40; i++) { const p = trunk[Math.floor(rnd(i) * 12)]; g.px(R(p[0] + (rnd(i * 3) - 0.5) * 18), R(p[1] + rnd(i * 5) * 8), "#3E342E"); }
  for (const [x, y, r, s] of [[4600, -350, 22, 5], [4616, -398, 26, 1], [4650, -436, 28, 2], [4700, -428, 26, 3], [4742, -392, 22, 4], [4688, -380, 26, 6], [4646, -378, 24, 7], [4728, -350, 16, 8], [4672, -404, 22, 9], [4614, -440, 18, 10]]) leafBall(g, x, y, r, OLIVE, s);
  for (let i = 0; i < 16; i++) { const x = R(4600 + rnd(i * 5) * 150), y = R(-440 + rnd(i * 7) * 110); const p = g.get(x, y); if (p[1] > 60) { g.px(x, y, "#2A1A2E"); g.px(x + 1, y, "#2A1A2E"); g.px(x, y + 1, "#4A2E4A"); } }
  // cypress on the headland: a tall dark flame, lit on its sunny side
  for (let y = -430; y < G(5044) + 2; y++) {
    const v = (y + 430) / (G(5044) + 432), half = R(4 + 18 * Math.sin(Math.min(1, v * 1.25) * Math.PI * 0.62) * (v < 0.9 ? 1 : 1 - (v - 0.9) * 5)) + R(2 * Math.sin(y * 0.4));
    for (let x = 5044 - half; x <= 5044 + half; x++) { const u = (x - 5044) / Math.max(1, half); let col = u < -0.55 ? CYP[4] : u < 0 ? CYP[3] : u < 0.5 ? CYP[2] : CYP[1]; if (Math.abs(u) > 0.9) col = CYP[0]; if (rnd(x * 17 + y * 5) < 0.12) col = CYP[Math.max(0, CYP.indexOf(col) - 1)]; g.px(x, y, col); }
  }
  g.rect(5042, G(5044) - 8, 4, 8, "#4A3428");
  // the wall: solid dark joints under the stones (column by column below the topmost stone), then the stones
  const topY = new Map();
  for (const s of STONES) { if (s.y > -30 && s.w < 32 && s.h < 20) continue; const poly = stoneShape(s.x, s.y, s.w, s.h, s.seed); for (let X = s.x; X <= s.x + s.w; X++) { let yt = null; for (let Y = s.y; Y <= s.y + s.h; Y++) if (insidePoly(poly, X + 0.5, Y + 0.5)) { yt = Y; break; } if (yt !== null && (!topY.has(X) || yt < topY.get(X))) topY.set(X, yt); } }
  for (const [X, yt] of topY) if (X > 4606 && X < 5022) for (let Y = yt + 2; Y < G(X); Y++) g.px(X, Y, GAP);
  for (const s of STONES) if (!s.notch) paintStone(g, s);
  // gap shadow behind the shrew (the dark hole it peeks out of)
  for (let y = -262; y < NOTCH.floor + 2; y++) for (let x = NOTCH.x0 - 2; x < NOTCH.x1 + 2; x++) g.px(x, y, mix(GAP, "#4A2A30", clamp01((y + 262) / 70) * 0.5));
  for (const s of STONES) if (s.notch) paintStone(g, s);
  // ground cutaway and the cliff (rock right up to the face; water / air beyond it)
  for (let x = X0; x < X1; x++) {
    const top = Math.max(TOP, x <= CLIFF ? Math.ceil(G(x)) : 0);
    for (let y = top; y < BOT; y++) {
      const e = edgeAt(y); if (x >= e) continue;
      let col = strata(x, y);
      // at the gorge seam the gorge's dry grass plane continues for a few px and dissolves into the cutaway
      const gk = 1 - sm(x, X0 + 6, X0 + 84); if (gk > 0 && y >= G(x) + 2 && y < 330 && gk > bayer(x, y) * 0.98) col = DRYG[Math.min(4, Math.floor(Math.sqrt(Math.max(0, y + 20) / 330) * 5))];
      if (x >= e - 1) col = "#2A1A24"; else if (x >= e - 3) col = mix(col, "#2A1A24", 0.4); else if (y >= 0 && x >= edgeAt(y - 1) - 1) col = mix(col, "#FFF0D0", 0.3);
      g.px(x, y, col);
    }
  }
  // cliff top rocks and the edge
  for (let y = -66; y < 0; y++) { const x = CLIFF - 1; g.px(x, y, "#2A1A24"); }
  // buried treasures: an Etruscan amphora (black-figure band), fossil shells in the limestone
  amphora(g, 4722, 150);
  for (const [x, y, r] of [[4930, 260, 5], [4650, 420, 6], [5010, 610, 4], [4800, 760, 7], [4700, 1000, 5], [4960, 1180, 6]]) shell(g, x, y, r);
  // life on the underwater cliff: posidonia tufts on the ledges, a starfish, urchins
  for (const [x, y] of [[5060, 360], [5072, 880], [5040, 1240]]) for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; for (let r = 0; r < 10; r++) { const w = r < 3 ? 2 : r < 7 ? 1 : 0; for (let q = -w; q <= w; q++) g.px(R(x + Math.cos(a) * r - Math.sin(a) * q * 0.6), R(y + Math.sin(a) * r + Math.cos(a) * q * 0.6), r > 7 ? "#F06A5A" : "#D8384A"); } g.px(x, y, "#FFB0A0"); }
  for (const [ux, uy] of [[edgeAt(520) - 4, 520], [edgeAt(1040) - 4, 1040], [edgeAt(1360) - 4, 1360]]) { for (let k = 0; k < 12; k++) { const a = k * 0.5236; g.line(R(ux), uy, R(ux + Math.cos(a) * 8), R(uy + Math.sin(a) * 7), "#4A1A5A"); } for (let j = -4; j <= 4; j++) for (let i = -5; i <= 5; i++) if ((i / 5) ** 2 + (j / 4) ** 2 <= 1) g.px(R(ux) + i, uy + j, j < -1 ? "#9A4AAA" : "#6A2A7A"); }
  // the depth tint: rock near the face under the surface fades into the water
  for (let y = 0; y < BOT; y++) { const T = underTint(y), e = edgeAt(y); if (!T) continue; const [tc, k0] = T; for (let x = Math.max(X0, R(e) - 46); x < R(e); x++) { const lx = x - X0, ly = y - TOP; if (!L.has(lx, ly)) continue; const k = k0 * (x > e - 8 ? 1 : 1 - (e - 8 - x) / 38), i = (ly * L.w + lx) * 3, d = L.c.d; d[i] = R(d[i] + (tc[0] - d[i]) * k); d[i + 1] = R(d[i + 1] + (tc[1] - d[i + 1]) * k); d[i + 2] = R(d[i + 2] + (tc[2] - d[i + 2]) * k); } }
});
function amphora(g, cx, cy) {
  for (let y = -34; y <= 34; y++) {
    const v = (y + 34) / 68, half = y < -26 ? 6 : y < -20 ? 7 + (y + 26) : y < 22 ? 13 + 10 * Math.sin(((y + 20) / 42) * Math.PI) : Math.max(2, 13 - (y - 22) * 0.9);
    for (let x = -R(half); x <= R(half); x++) { const u = x / half; let col = u < -0.5 ? "#E8905A" : u < 0.3 ? "#C8683A" : "#9A4A2A"; if (Math.abs(u) > 0.92) col = "#4A2018"; if (y > -6 && y < 8) col = u < -0.5 ? "#3A2020" : "#1E1214"; if ((y === -6 || y === 8) && Math.abs(u) < 0.95) col = "#E8B07A"; if (y > -4 && y < 6 && ((x + 40) % 9 === 0 || (x + 41) % 9 === 0) && y % 3 !== 0) col = "#E8905A"; g.px(cx + x, cy + y, col); }
  }
  for (const sd of [-1, 1]) { g.line(cx + sd * 7, cy - 26, cx + sd * 16, cy - 30, "#4A2018"); g.line(cx + sd * 16, cy - 30, cx + sd * 17, cy - 16, "#4A2018"); g.line(cx + sd * 15, cy - 29, cx + sd * 16, cy - 17, "#C8683A"); }
  g.rect(cx - 7, cy - 36, 15, 3, "#4A2018"); g.rect(cx - 6, cy - 35, 13, 1, "#E8905A");
}
function shell(g, x, y, r) { for (let i = 0; i < 9; i++) { const a = Math.PI + (i / 8) * Math.PI; g.line(x, y, R(x + Math.cos(a) * r), R(y + Math.sin(a) * r * 0.8), "#FFF0D8"); } g.ering(x, y, r, R(r * 0.8), "#8A6A50", Math.PI, Math.PI * 2); g.line(x - r, y, x + r, y, "#8A6A50"); }

// front: lavender, poppies, dry grass at the wall's foot, and the stones in front of the shrew's body
function lavender(g, x0, x1, seed) {
  for (let x = x0; x < x1; x++) { const k = Math.sin(((x - x0) / (x1 - x0)) * Math.PI), h = R(12 * k + 2); const gy = R(G(x)); for (let j = 0; j < h; j++) g.px(x, gy - j, j < h * 0.4 ? "#4E6248" : (x + j) % 3 ? "#6E8462" : "#8EA07E"); }
  for (let i = 0; i < (x1 - x0) * 0.7; i++) {
    const x = R(x0 + 3 + rnd(seed + i * 3) * (x1 - x0 - 6)), k = Math.sin(((x - x0) / (x1 - x0)) * Math.PI), gy = R(G(x)), h = R(14 + 22 * k * (0.6 + rnd(seed + i) * 0.5)), lean = (rnd(seed + i * 7) - 0.5) * 6;
    for (let j = 0; j < h; j++) { const px = R(x + lean * (j / h)), py = gy - j; if (j < h * 0.55) g.px(px, py, "#5E7452"); else { const col = (j + i) % 3 === 0 ? "#B89AE8" : (j + i) % 3 === 1 ? "#8A6AC8" : "#6A4AA8"; g.px(px, py, col); if (j % 2 === 0) g.px(px + 1, py, (j + i) % 2 ? "#9A7AD8" : "#7A5AB8"); } }
  }
}
function poppy(g, x, h) { const gy = R(G(x)); for (let j = 0; j < h; j++) g.px(x + (j > h - 4 ? 1 : 0), gy - j, "#4E6A3A"); const fy = gy - h, fx = x + 1; g.rect(fx - 3, fy - 2, 7, 4, "#E8383A"); g.rect(fx - 2, fy - 3, 5, 6, "#E8383A"); g.px(fx - 2, fy - 3, "#FF7A6A"); g.px(fx - 1, fy - 3, "#FF7A6A"); g.rect(fx - 1, fy - 1, 2, 2, "#2A1418"); }
function grassTuft(g, x, h, n, seed) { const gy = R(G(x)); for (let i = 0; i < n; i++) { const bx = x + (i - n / 2) * 2, bh = h * (0.6 + rnd(seed + i) * 0.5), lean = (rnd(seed + i * 7) - 0.5) * h * 0.6; for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(gy - j), j > bh * 0.6 ? "#F2D58A" : i % 2 ? "#C8A050" : "#AA8640"); } } }
const FRONT = worldLayer(X0 - 10, -300, X1 - X0 + 10, 320, (g) => {
  lavender(g, 4596, 4690, 11); lavender(g, 4736, 4790, 23); lavender(g, 4928, 5004, 37);
  for (const [x, h] of [[4712, 16], [4724, 22], [4806, 14], [4912, 18], [5016, 15]]) poppy(g, x, h);
  for (const [x, h, n] of [[4700, 18, 7], [4796, 14, 6], [4846, 12, 5], [4892, 13, 6], [5012, 20, 8], [5054, 16, 7], [5074, 12, 5], [4600, 14, 6]]) grassTuft(g, x, h, n, x);
});
const NOTCH_FRONT = worldLayer(4770, -270, 180, 100, (g) => { for (const s of STONES) if (s.notch) paintStone(g, s); });

// ---------------------------------------------------------------- module interface
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
// the ocean column (levels/ocean.mjs) is drawn at the wrapped position here: same water look and wave clock at the seam
export function fill(c, V, t) {
  if (!onScreen(V)) return;
  // the open sea right of the cliff (same colours as the ocean column's water it joins at x 5130: its view is wrapped)
  seaStripExact(c, V, view(V.cx - WORLD_W, V.cy, { t, wrap: true }), t, CLIFF - 4, X1, (wy) => (wy < -3 ? X1 : edgeAt(Math.max(0, wy))));
}
export function back(c, V, t) {
  if (!onScreen(V)) return;
  BACK.blit(c, V);
  // sun glitter on the far sea: twinkling gold dashes, densest under the sun
  const hzY = V.Y(HZ);
  if (hzY > -10 && hzY < 980) for (let i = 0; i < 90; i++) {
    const wx = X0 + rnd(i * 3 + 1) * (X1 - X0), wy = HZ + 2 + Math.pow(rnd(i * 5 + 2), 1.6) * 120, under = Math.exp(-(((wx - SX) / 110) ** 2));
    if (rnd(i * 7) > 0.35 + 0.65 * under) continue;
    const tw = Math.sin(t * (2 + rnd(i) * 3) + i * 1.7); if (tw < 0.2) continue;
    const sx = R(V.X(wx)), sy = R(V.Y(wy)); if (sx < 0 || sx > 538 || sy < 0 || sy > 959) continue;
    if (!BACK.has(wx, wy)) continue; const p = c.get(sx, sy); if (p[2] < 80 || p[0] > 250) continue;   // only on visible sea pixels
    const len = 1 + R((tw - 0.2) * 3 * (1 + under)); for (let k = -len; k <= len; k++) { const q = c.get(sx + k, sy); if (q[2] > 80) c.px(sx + k, sy, k === 0 ? "#FFFFFF" : "#FFE0A0"); }
  }
}
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  sign(c, R(V.X(4652)), R(V.Y(G(4652))) + 2, "LV 10", "wood", 1, t);
  fish(c, V, t);
  posidonia(c, V, t);
  // the shrew: alive (blinks, sniffs, nose wiggles); on its record heartbeat the whole body vibrates
  const hx = V.X(SX), hy = V.Y(HEAD_Y); if (hx < -100 || hx > 640 || hy < -120 || hy > 1100) return;
  const p = pulse("shrew", t), buzz = t > EV.record - 0.1 && t < LV.shrew[1] + 0.4 ? (p > 0.5 ? 1 : p > 0.15 ? -1 : 0) : 0;
  const look = gaze(t, [[0, [0, 0.2]], [EV.record + 0.2, [0.5, -0.4]], [EV.etruscan, [0, 0.2]], [EV.fifteen + 0.6, [-0.3, -0.5]], [EV.twist, [0, 0.25]], [EV.fastMouse, [-0.7, 0.1]], [EV.slowElephant, [0.7, 0.1]], [EV.both, [0, -0.3]], [EV.we - 0.2, [0, 0.2]]], 0.3);
  const wig = Math.sin(t * 7.3) * 0.6 + Math.sin(t * 13.1) * 0.3, sniff = Math.max(0, Math.sin(t * 2.1)) ** 4;
  drawShrew(c, hx + buzz, hy + Math.sin(t * 2.4) * 0.8, { wig, sniff, look, blink: blinkAt(t, 3.1, 0.7), handDy: 0, bodyDx: buzz });
  NOTCH_FRONT.blit(c, V);
  // hands on the stone in front (drawn again over the notch stone)
  for (const sd of [-1, 1]) { const x = R(hx + sd * 20 + buzz), y = R(V.Y(NOTCH.floor) - 1); blob(c, [ell(x, y, 7, 5)], { ramp: ["#3A1420", "#6A2234", "#9A3A4C", "#C85A6A", "#E07A88", "#F09AA6", "#F8BCC4", "#FFE0E4"], thick: 3, base: 4.2, outline: "#0E0A10" }); for (const k of [-4, -1, 2, 5]) c.px(R(x + k * 0.9), y + 4, "#0E0A10"); }
  // the heart: a small icon beside the head that flickers at 25 beats a second, with buzz lines
  const live = sm(t, LV.shrew[0] - 0.3, LV.shrew[0]) * (1 - sm(t, LV.twist[1] + 0.2, LV.twist[1] + 0.8));
  if (live > 0) {
    const r = 9 + 4 * p, x = R(hx + 64), y = R(hy - 58);
    heartIcon(c, x + (buzz ? (p > 0.5 ? 1 : -1) : 0), y, r, mix("#E83A5C", "#FF8AA6", p), live);
    if (t > EV.record - 0.1 && t < LV.shrew[1] + 0.3) { const g = fade(c, live * (0.5 + 0.5 * p)); for (const sd of [-1, 1]) for (let k = 0; k < 3; k++) { const bx = R(hx + sd * (52 + k * 4) + buzz), by = R(hy - 20 + k * 9); g.px(bx, by, "#FFE6A0"); g.px(bx, by + 1, "#FFE6A0"); g.px(bx + sd, by + 2, "#FFE6A0"); } }
  }
}
function fish(c, V, t) {
  if (t > LV.loop[1] - 0.6) return;
  for (const [y0, sp, ph, col] of [[140, 0.6, 0, "#F4B840"], [420, 0.45, 2, "#F07A5A"], [760, 0.5, 4, "#7ACAE8"]]) {
    const e = edgeAt(y0), span = Math.max(0, X1 - 8 - (e + 8)), u = (Math.sin(t * sp + ph) + 1) / 2, x = e + 8 + span * u, dir = Math.cos(t * sp + ph) > 0 ? 1 : -1, y = y0 + Math.sin(t * 2 + ph) * 3;
    const sx = R(V.X(x)), sy = R(V.Y(y)); if (sx < -10 || sx > 550 || sy < -10 || sy > 970) continue;
    const T = underTint(y), cc = mix(col, T[0], T[1] * 0.7), dk = mix(cc, "#000000", 0.35);
    for (let j = -3; j <= 3; j++) for (let i = -5; i <= 5; i++) if ((i / 5) ** 2 + (j / 3) ** 2 <= 1) c.px(sx + i * dir, sy + j, j > 1 ? dk : cc);
    for (let j = -3; j <= 3; j++) c.px(sx - 6 * dir - (Math.abs(j) > 1 ? dir : 0), sy + j, dk);
    c.px(sx + 3 * dir, sy - 1, "#FFFFFF"); c.px(sx + 3 * dir, sy, "#101010");
  }
}
function posidonia(c, V, t) {
  for (const [y, n, h] of [[170, 5, 26], [340, 6, 34], [680, 5, 30], [1020, 6, 36], [1360, 5, 28]]) {
    const e = edgeAt(y) - 2, sx0 = V.X(e), sy = V.Y(y); if (sx0 < -40 || sx0 > 580 || sy < -10 || sy - h > 980) continue;
    const T = underTint(y), col = mix("#4A8A3A", T[0], T[1] * 0.8), col2 = mix("#6AAA4A", T[0], T[1] * 0.8);
    for (let k = 0; k < n; k++) { const bx = sx0 + k * 2 - n, hh = h * (0.7 + rnd(y + k) * 0.4); for (let j = 0; j < hh; j++) { const sway = Math.sin(t * 1.4 + k * 0.7 + y) * (j / hh) * 7 + j * 0.15; c.px(R(bx + sway), sy - j, k % 2 ? col : col2); } }
  }
}
export function front(c, V, t) {
  if (!onScreen(V)) return;
  FRONT.blit(c, V);
  // a little butterfly over the lavender, fluttering in the low sun
  const bx = R(V.X(4664 + Math.sin(t * 0.7) * 46)), by = R(V.Y(-82 + Math.sin(t * 1.3) * 16)), fl = Math.abs(Math.sin(t * 13));
  if (bx > -10 && bx < 550 && by > -10 && by < 970) {
    const w = 1 + R(4 * fl);
    for (const sd of [-1, 1]) { const x0 = sd < 0 ? bx - w : bx + 1; c.rect(x0, by - 4, w, 4, "#FFE89A"); c.rect(x0, by, Math.max(1, w - 1), 3, "#FFD070"); if (w > 2) { c.px(sd < 0 ? x0 : x0 + w - 1, by - 4, "#E8803A"); c.px(sd < 0 ? x0 : x0 + w - 1, by - 3, "#E8803A"); } }
    c.rect(bx, by - 4, 1, 7, "#2A1A2A"); c.px(bx - 1, by - 6, "#2A1A2A"); c.px(bx + 1, by - 6, "#2A1A2A");
  }
}
export function hud(c, V, t) {
  if (t < LV.hummingbird[1] - 0.5 || V.wrap) return;
  // gold RECORD ribbon with a trophy, unrolling from the centre on "record"
  const rk = sm(t, ...WT.ribbon), rOut = 1 - sm(t, ...WT.ribbonOut);
  if (rk > 0 && rOut > 0) ribbon(c, 270, 202, rk, rOut, t);
  pickup(c, 270, 270, "1,511 BPM", (t - EV.fifteen) / 1.7, C.Y);
  twistHud(c, V, t);
  // "Now the twist.": a little !? bubble pops up beside the shrew (over the dimmed scene) until the counter arrives
  const qa = sm(t, ...WT.huh) * (1 - sm(t, ...WT.huhOut));
  if (qa > 0) {
    const g = fade(c, qa), bx = R(V.X(SX)) - 118, by = R(V.Y(HEAD_Y)) - 70 - R((1 - qa) * 8) + R(Math.sin(t * 5) * 1.5), w = 46, h = 34;
    g.rrect(bx - 1, by - 1, w + 2, h + 2, "#0B0812", 3); g.rrect(bx, by, w, h, "#FDFEED", 3); g.rect(bx + 2, by + h - 4, w - 4, 2, "#D8D4E8");
    g.poly([[bx + w - 14, by + h - 1], [bx + w - 2, by + h + 10], [bx + w - 22, by + h - 1]], "#0B0812"); g.poly([[bx + w - 15, by + h - 2], [bx + w - 5, by + h + 7], [bx + w - 21, by + h - 2]], "#FDFEED");
    g.text(MAIN, "!?", bx + 9, by + 7, "#E03056", { scale: 3 });
  }
}
function ribbon(c, cx, y, k, a, t) {
  const g = fade(c, a), full = 232, w = R(full * ease(k)), x0 = R(cx - w / 2), h = 30;
  if (w < 8) return;
  // folded tails behind both ends (V-notched), revealed once the band has unrolled
  const tk = sm(k, 0.75, 1);
  if (tk > 0) for (const sd of [-1, 1]) {
    const gg = fade(c, a * tk), ex = sd < 0 ? x0 + 6 : x0 + w - 6, ox = ex + sd * 30, ty = y + 8, th = 26;
    const P = [[ex, ty], [ox, ty], [ox - sd * 9, ty + th / 2], [ox, ty + th], [ex, ty + th]];
    gg.poly(P.map(([px, py]) => [px + (sd > 0 ? 1 : 0), py + 1]), "#5A3408"); gg.poly(P, "#5A3408");
    gg.poly([[ex, ty + 1], [ox - sd * 1, ty + 1], [ox - sd * 9, ty + th / 2], [ox - sd * 1, ty + th - 1], [ex, ty + th - 1]], "#C8861E");
    gg.rect(Math.min(ex, ox - sd * 2), ty + 2, Math.abs(ox - ex) - 2, 2, "#E8A82E");
    gg.poly([[ex, ty], [ex + sd * 8, ty], [ex, ty + 8]], "#7A4A10");
  }
  // the band: gold with a light top, a darker bottom and a slow shine
  g.rrect(x0, y, w, h, "#5A3408", 3); g.rrect(x0 + 1, y + 1, w - 2, h - 2, "#F4C040", 3);
  g.rect(x0 + 3, y + 2, w - 6, 4, "#FFE88A"); g.rect(x0 + 3, y + 6, w - 6, 1, "#FFF6C8"); g.rect(x0 + 3, y + h - 6, w - 6, 3, "#C88A20");
  const sp = ((t - EV.record) % 2.6) / 2.6, sx = x0 - 20 + sp * (w + 40);
  for (let j = 2; j < h - 2; j++) for (let i = 0; i < 5; i++) { const X = R(sx + i - j * 0.5); if (X > x0 + 2 && X < x0 + w - 2) g.px(X, y + j, i < 2 ? "#FFF6C8" : "#FFE88A"); }
  const label = "RECORD", tw = c.measure(MAIN, label, { scale: 3 }), cupW = 18, tot = cupW + 8 + tw, tx = R(cx - tot / 2) + cupW + 8;
  const ta = sm(t, ...WT.ribbonText);                    // the trophy and the word dissolve in once the band is wide enough
  if (ta > 0 && w > tot + 12) {
    const cx0 = tx - cupW - 8, cy0 = y + 5, gg = fade(c, a * ta);
    // trophy cup: bowl with handles, stem, base
    gg.rect(cx0 + 3, cy0, 12, 2, "#5A3408"); gg.rect(cx0 + 2, cy0 + 2, 14, 8, "#5A3408"); gg.rect(cx0 + 4, cy0 + 10, 10, 2, "#5A3408");
    gg.rect(cx0 + 3, cy0 + 2, 12, 7, "#FFF2A8"); gg.rect(cx0 + 5, cy0 + 9, 8, 2, "#F8D86A"); gg.rect(cx0 + 4, cy0 + 2, 2, 5, "#FFFFFF");
    gg.rect(cx0, cy0 + 3, 2, 4, "#5A3408"); gg.rect(cx0 + 16, cy0 + 3, 2, 4, "#5A3408"); gg.px(cx0 + 1, cy0 + 4, "#FFF2A8"); gg.px(cx0 + 16, cy0 + 4, "#FFF2A8");
    gg.rect(cx0 + 7, cy0 + 12, 4, 4, "#5A3408"); gg.rect(cx0 + 8, cy0 + 12, 2, 3, "#F8D86A"); gg.rect(cx0 + 4, cy0 + 16, 10, 4, "#5A3408"); gg.rect(cx0 + 5, cy0 + 16, 8, 2, "#F8D86A");
    gg.text(MAIN, label, tx + 1, y + 7, "#5A3408", { scale: 3 }); gg.text(MAIN, label, tx, y + 6, "#FFFDF0", { scale: 3 });
  }
  // twinkles around the ribbon
  for (let i = 0; i < 6; i++) { const ang = i * 1.047 + t * 1.5, px = R(cx + Math.cos(ang) * (w / 2 + 22)), py = R(y + h / 2 + Math.sin(ang) * 24); if (Math.sin(t * 5 + i * 2) > 0.2) { g.px(px, py, "#FFFFFF"); g.px(px - 1, py, "#FFE27A"); g.px(px + 1, py, "#FFE27A"); g.px(px, py - 1, "#FFE27A"); g.px(px, py + 1, "#FFE27A"); } }
}
