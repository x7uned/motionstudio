// LV7 · jungle (snake) — RANGE BIOME.jungle = 3240..3780, dusk turning to night (tod ≈ 5.7: deep purple sky, the low
// moon-coloured disc). A lush dusk jungle: hazy purple far trees, two big buttressed trunks with moss and lianas, a dark
// canopy with hanging leaves and a gap around the sky disc, swaying vines, elephant-ear and banana leaves, ferns, a mossy
// log with glowing mushrooms, fireflies and drifting leaves; rich dark soil with roots and glowing fungus threads below.
// The left edge continues the village's bushes (land y = LAND); the right edge thins out into low ferns and opens into
// the moonlit clearing of the night camp. A cute chibi cobra (levels/jungle-snake.mjs) rises from its coil as the
// camera arrives ("Snakes"), spreads its hood ("hundred"), hisses with a forked-tongue flick ("thousand"), sways in an
// S and settles with a happy blink ("year"), then watches the camera leave. Pure functions of t.
import { BIOME, LAND } from "../timeline.mjs";
import { blob, ell, tube, bez, sign, pickup, C, sm, lerp, rnd, fade, mix, bayer, clamp01 } from "../cute.mjs";
import { worldLayer, spriteCache, thick, leaf, earLeaf, fern, tintRamp } from "./jungle-kit.mjs";
import { drawSnake } from "./jungle-snake.mjs";
import { JT } from "./jungle-time.mjs";
export { ICON } from "./jungle-snake.mjs";

export const RANGE = BIOME.jungle;
const R = Math.round, [X0, X1] = RANGE;
export const SNAKE_X = 3510;                                   // coil centre (REST.snake.cx): under the sky disc
const TREE_L = 3298, TREE_R = 3704, SIGN_X = 3360, LOG = [3602, 3700];
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;

// ---------------------------------------------------------------- palette (dusk → night: teal greens, purple shadows, lilac rim light)
const FOL = ["#060C16", "#0A1620", "#0E2228", "#13302E", "#1A4036", "#22523C", "#2E6844", "#3E7E4C"];
const LEAFB = ["#071410", "#0C221A", "#123624", "#1A4C2E", "#246438", "#307E42", "#46984E", "#62B05C"];
const FOL_D = tintRamp(FOL, "#0A0618", 0.38);
const FOL_FAR = ["#120C26", "#181230", "#1F183A", "#271E46", "#302652", "#3A2E5E", "#46386A", "#544478"];
const BARK = ["#0C0810", "#16101A", "#201824", "#2C2030", "#38283C", "#46324A", "#584058", "#6C5068"];
const MOSS = ["#14301E", "#1E4426", "#2A5A2E", "#3A7036"];
const RIM = "#C890C8", RIM_SOFT = "#9A6AA8";
const CAMPG = ["#161E2C", "#18242E", "#1B2A30", "#1E3032", "#203432"];   // the night camp's ground rows (camp-scene.mjs), for the seam
const GLOW = { cyan: ["#1A6A70", "#3ACAC8", "#9AFFF0", "#E6FFF8"], pink: ["#7A2A60", "#E05AA8", "#FFA8DA", "#FFE6F4"] };

// ---------------------------------------------------------------- ground line (world y): flat LAND at both edges, soft leaf-litter bumps inside
const groundY = (wx) => { const e = sm(wx, X0, X0 + 40) * (1 - sm(wx, X1 - 40, X1)); return LAND - e * (1.5 + Math.sin(wx * 0.11) * 1.2 + Math.sin(wx * 0.037 + 1) * 1.5); };
const MUSHROOMS = [[3262, 0, "cyan", 1.0], [3271, 1, "cyan", 0.8], [3318, 2, "pink", 0.9], [3328, 3, "cyan", 1.2], [3618, 4, "cyan", 0.9, -22], [3632, 5, "pink", 1.1, -25], [3646, 6, "cyan", 0.8, -26], [3726, 7, "pink", 1.0], [3738, 8, "cyan", 1.3], [3750, 9, "cyan", 0.8]];

// ---------------------------------------------------------------- static scenery (drawn once into a world layer)
const TOP = -690, LH = 1020, LX0 = X0 - 40, LW = X1 - X0 + 80;
function trunk(g, L, T, wx, w, topY, seed) {
  const px = (x, y, col) => g.px(L(x), T(y), col);
  for (let wy = topY; wy < LAND + 3; wy++) {
    const flare = wy > LAND - 70 ? ((wy - (LAND - 70)) / 70) ** 2.2 * 34 : 0, half = w / 2 + flare, lean = Math.sin(wy * 0.013 + seed) * 3;
    for (let x = -half; x <= half; x++) {
      const u = x / half, X = R(wx + x + lean); let k = 3.6 - u * 1.9 + (Math.sin(wy * 0.23 + x * 0.7 + seed) > 0.8 ? -1 : 0);
      if (Math.abs(u) > 0.93) k = u < 0 ? 4.6 : 1;                                   // lit left rim, dark right edge
      let col = BARK[Math.max(0, Math.min(7, R(k + bayer(X, wy) - 0.5)))];
      if (u < -0.82 && Math.sin(wy * 0.21 + seed * 5) + Math.sin(wy * 0.047 + seed) * 0.8 > 0.55 + (u + 0.82) * -4) col = RIM_SOFT;   // moonlit rim streaks
      // moss patches on the shaded side and around the base
      const mo = Math.sin(wy * 0.045 + seed * 3) + Math.sin(wy * 0.11 + x * 0.2) * 0.5 + (wy > LAND - 40 ? 0.8 : 0);
      if (u > -0.2 && mo > 0.95 && (mo - 0.95) * 3 > bayer(X, wy) * 0.8) col = MOSS[Math.min(3, R((1 - u) * 1.2 + (mo - 0.95)))];
      px(X, wy, col);
    }
    if (wy % 41 === (seed * 7) % 41) for (let x = -w / 3; x < w / 3; x++) px(R(wx + x + lean), wy, BARK[1]);   // bark ring
  }
  // a knot hole
  const kx = wx + 4, ky = LAND - 150 - seed * 20; for (let j = -6; j <= 6; j++) for (let i = -4; i <= 4; i++) { const d = (i / 4) ** 2 + (j / 6) ** 2; if (d <= 1) px(kx + i, ky + j, d > 0.6 ? BARK[3] : BARK[0]); }
  // buttress roots creeping over the ground
  for (const sd of [-1, 1]) for (const [len, dy] of [[64, 0], [40, -2]]) { let x = wx + sd * (w / 2 + 14), y = LAND - 4 + dy; for (let k = 0; k < len; k++) { const r = Math.max(1, 5 - k / 12); for (let j = -r; j <= r; j++) px(R(x), R(y + j), j < -r / 2 ? BARK[4] : BARK[2]); x += sd * 1; y += 0.07 + (k > len * 0.6 ? 0.12 : 0); } }
}
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // ---- far jungle (two hazy depths): a soft canopy line close to the sky's colour, then purple tree and palm
  //      silhouettes with lilac-lit tops. Low under the disc (hidden behind the coil), lowest toward the clearing.
  // 0 at the seams → full height inside, with rounded (quarter-ellipse) ends like the edge of a crown mass
  const edgeK = (wx) => { const l = clamp01((wx - (X0 - 38)) / 110), r = clamp01((X1 + 34 - wx) / 120); return Math.sqrt(1 - (1 - l) ** 2) * Math.sqrt(1 - (1 - r) ** 2); };
  const farTop = (wx, k) => { const e = clamp01(Math.abs(wx - SNAKE_X) / 260); return LAND - ((k ? 150 + 230 * e * e : 120 + 170 * e) + (Math.sin(wx * 0.045 + k) * 14 + Math.sin(wx * 0.13 + k * 2) * 6) * (0.4 + e)) * edgeK(wx); };
  for (let wx = LX0; wx < LX0 + LW; wx++) {
    let top = farTop(wx, 0); top -= Math.max(0, Math.sin(wx * 0.071) * 18 + Math.sin(wx * 0.023 + 2) * 12) * edgeK(wx); if (top > LAND - 1) continue;
    for (let wy = R(top); wy < LAND; wy++) { const d = wy - top; px(wx, wy, d < 1 ? "#6A4688" : d < 3 && bayer(wx, wy) < 0.5 ? "#583A78" : (d / 90) > bayer(wx, wy) + 0.35 ? "#2E1E4A" : "#3C2860"); }
  }
  const FAR2 = ["#120C22", "#170F2A", "#1C1432", "#22183A", "#281C42", "#30224C", "#3A2A58", "#463466"];
  for (let i = 0; i < 16; i++) {
    const wx = X0 - 26 + i * 38 + (rnd(i * 3) - 0.5) * 16; if (Math.abs(wx - SNAKE_X) < 46 || edgeK(wx) < 0.45) continue;
    const top = farTop(wx, 1) - rnd(i * 7) * 30, palm = rnd(i * 29) < 0.38;
    const lean = (rnd(i * 13) - 0.5) * 0.25, w = palm ? 3 : 4 + rnd(i * 5) * 4;
    for (let wy = R(top + 8); wy < LAND; wy++) { const k = (LAND - wy) / (LAND - top), xx = wx + lean * (LAND - wy) * 0.35 * k; for (let x = -w / 2; x <= w / 2; x++) px(R(xx + x), wy, x < -w / 4 ? FAR2[4] : FAR2[2]); }
    const tx = wx + lean * (LAND - top) * 0.35;
    if (palm) {
      // distant palm: a fan of drooping fronds
      for (let f = 0; f < 8; f++) { const ang = -Math.PI / 2 + (f - 3.5) * 0.42, L = 20 + rnd(i * 31 + f) * 10; for (let k = 0; k < L; k++) { const u = k / L, x = tx + Math.cos(ang) * k * 1.1, y = top + Math.sin(ang) * k * 0.6 + u * u * 16; px(R(x), R(y), FAR2[3]); px(R(x), R(y) + 1, FAR2[2]); if (k % 3 === 0 && k > 3) { px(R(x), R(y) + 2, FAR2[2]); px(R(x), R(y) + 3, FAR2[1]); } if (u < 0.6 && Math.sin(ang) < -0.3) px(R(x), R(y) - 1, "#6A4688"); } }
    } else {
      // round broadleaf crown: a cluster of small lumps, lilac-lit on top
      for (let k = 0; k < 9; k++) { const a = rnd(i * 41 + k) * Math.PI * 2, rr = rnd(i * 43 + k) * 22, cx = tx + Math.cos(a) * rr * 1.3, cy = top + Math.sin(a) * rr * 0.7, r = 9 + rnd(i * 47 + k) * 8; blob(g, [ell(L(cx), T(cy), r * 1.2, r)], { ramp: FAR2, thick: 8, base: 3.0, gain: 1.4, outline: FAR2[0], litOutline: "#6A4A8C" }); }
    }
  }
  // far undergrowth wall in front of them
  for (let wx = LX0; wx < LX0 + LW; wx++) { const top = LAND - (52 + Math.sin(wx * 0.07) * 9 + Math.sin(wx * 0.19) * 5) * Math.sqrt(edgeK(wx)); if (top > LAND - 1) continue; for (let wy = R(top); wy < LAND; wy++) { const v = (wy - top) / (LAND - top); px(wx, wy, wy - top < 1 ? FOL_FAR[6] : FOL_FAR[Math.max(0, R(3.4 - v * 2.8 + (bayer(wx, wy) - 0.5)))]); } }
  // ---- lianas: thick woody vines draped from the left trunk into the canopy, one on the right
  for (const [p0, p1, p2, r] of [[[TREE_L + 10, -470], [3380, -330], [3440, -560], 3], [[TREE_L - 6, -560], [3250, -470], [3220, -640], 2], [[TREE_R - 8, -430], [3640, -330], [3590, -600], 3]]) {
    const pts = bez(p0, p1, p2, 40).map(([x, y]) => [L(x), T(y)]); thick(g, pts, r + 1, BARK[0]); thick(g, pts, r, BARK[3]); for (const [x, y] of pts) g.px(R(x) - 1, R(y) - r + 1, BARK[5]);
  }
  // ---- the two big trees
  trunk(g, L, T, TREE_L, 46, TOP, 1); trunk(g, L, T, TREE_R, 40, TOP + 40, 2);
  // ---- canopy: a dark mass of leafy clumps along the top, a gap around the sky disc, ending above the right tree
  const canopyBot = (wx) => { const e = clamp01((Math.abs(wx - SNAKE_X) - 50) / 190) ** 1.4; return lerp(-575, -405, e) + Math.sin(wx * 0.09) * 10; };
  for (let wx = X0 + 6; wx < 3722; wx++) { const bot = canopyBot(wx) - 40 - sm(wx, 3680, 3722) * 110 - (1 - sm(wx, X0 + 6, X0 + 60)) * 150; for (let wy = TOP; wy < bot; wy++) px(wx, wy, (wy - TOP) % 2 && bayer(wx, wy) > 0.85 ? FOL_D[2] : FOL_D[1]); }
  for (let i = 0; i < 640; i++) {
    const wx = X0 - 30 + rnd(i * 7 + 3) * (3780 - X0 + 30), fadeR = (1 - sm(wx, 3680, 3770)) * sm(wx, X0 - 30, X0 + 50), bot = canopyBot(wx) - 22 - (1 - fadeR) * 130;
    if (fadeR <= 0.04 && rnd(i * 17) < 0.7) continue;
    const depth = Math.pow(rnd(i * 3 + 1), 0.55), wy = lerp(TOP + 4, bot, depth), near = depth > 0.82 ? 1 : 0;
    const ramp = near ? (rnd(i * 29) < 0.5 ? FOL : LEAFB) : depth > 0.5 ? FOL : FOL_D, ang = Math.PI / 2 + (rnd(i * 9) - 0.5) * (near ? 2.4 : 5.5);
    leaf(g, L(wx), T(wy), 12 + rnd(i * 5) * 14, 4 + rnd(i * 11) * 3.5, ang, depth > 0.5 ? ramp : tintRamp(ramp, "#06040E", 0.35), { vein: rnd(i * 13) < 0.4, rim: near && Math.abs(wx - SNAKE_X) < 230 ? RIM_SOFT : null });
  }
  // hanging leaves along the canopy's lower edge (lit lilac where they face the disc)
  for (let i = 0; i < 90; i++) {
    const wx = X0 + 14 + rnd(i * 13 + 1) * (3756 - X0 - 14), base = canopyBot(wx) - (1 - sm(wx, X0 + 6, X0 + 60)) * 150 - sm(wx, 3690, 3750) * 90, wy = base - 10 + (rnd(i * 5) - 0.4) * 40; if (wx > 3720 && rnd(i) < 0.6) continue;
    const ang = Math.PI / 2 + (rnd(i * 9) - 0.5) * 2.0, len = 26 + rnd(i * 3) * 30, wid = 7 + rnd(i * 7) * 6, ramp = rnd(i * 11) < 0.55 ? FOL : LEAFB;
    leaf(g, L(wx), T(wy), len, wid, ang, rnd(i * 19) < 0.5 ? ramp : tintRamp(ramp, "#2A1A4A", 0.25), { rim: Math.abs(wx - SNAKE_X) < 200 ? RIM : null, droop: (rnd(i * 23) - 0.5) * 0.3 });
  }
  // big elephant-ear leaves hanging at both sides of the gap, framing the disc
  for (const [wx, wy, size, ang] of [[3330, -470, 34, 1.25], [3368, -440, 26, 1.75], [3306, -420, 30, 1.5], [3652, -470, 32, 1.85], [3690, -420, 28, 1.35], [3612, -455, 22, 1.6]]) earLeaf(g, L(wx), T(wy), size, ang, LEAFB, RIM);
  // ---- mid-ground: bushes and big leaves behind the snake (darker at the centre so the snake pops)
  for (let i = 0; i < 20; i++) { const wx = X0 + 4 + i * 28 + rnd(i * 7) * 12, r = 16 + rnd(i * 3) * 16, e = clamp01(Math.abs(wx - SNAKE_X) / 160); blob(g, [ell(L(wx), T(LAND - r * 0.65), r * 1.4, r)], { ramp: e < 0.7 ? FOL_D : FOL, thick: 10, base: 2.6, gain: 1.6, litOutline: e < 0.7 ? FOL_D[4] : RIM_SOFT }); }
  // banana leaves rising from the undergrowth at the sides
  for (const [wx, wy, len, wid, ang, droop] of [[3262, -40, 96, 17, -1.25, 0.25], [3282, -40, 84, 15, -1.9, -0.25], [3400, -30, 78, 14, -2.2, -0.2], [3388, -36, 66, 13, -1.6, 0.15], [3626, -34, 80, 14, -1.05, 0.2], [3640, -30, 70, 13, -0.55, 0.3], [3758, -30, 58, 12, -1.9, -0.2], [3240, -30, 70, 14, -0.7, 0.25]]) leaf(g, L(wx), T(wy), len, wid, ang, LEAFB, { rim: RIM, droop });
  for (const [wx, wy, size, ang] of [[3330, -60, 26, -1.15], [3424, -44, 22, -1.95], [3594, -52, 24, -1.25], [3676, -48, 26, -1.9]]) earLeaf(g, L(wx), T(wy), size, ang, FOL, RIM_SOFT);
  // ---- mossy fallen log on the right, leaning against the right tree
  { const [a, b] = LOG; for (let wx = a; wx <= b; wx++) { const k = (wx - a) / (b - a), cy = LAND - 13 - k * 6, r = 12 - k * 1.5; for (let wy = R(cy - r); wy <= R(cy + r); wy++) { const v = (wy - cy) / r; let col = BARK[Math.max(1, Math.min(6, R(4.2 - v * 2.2 + bayer(wx, wy) - 0.5)))]; if (v < -0.55 && Math.sin(wx * 0.3) + Math.sin(wx * 0.11) > -0.4) col = MOSS[v < -0.8 ? 3 : 2]; if (Math.abs(v) > 0.92) col = BARK[0]; px(wx, wy, col); } }
    for (let j = -12; j <= 12; j++) for (let i = -4; i <= 4; i++) { const d = (i / 4) ** 2 + (j / 12) ** 2; if (d <= 1) px(a + i, LAND - 13 + j, d > 0.75 ? BARK[1] : d > 0.4 ? "#7A5A5A" : (i + j) % 3 ? "#5A4048" : "#8A6A6A"); } }
  // ---- jungle floor: leaf litter on top, rich dark soil below — humus, a pebbly layer, clay, roots, glowing fungus threads
  const SOIL = ["#0C070A", "#140C10", "#1C1216", "#24181C", "#2E1E22", "#382628", "#44302E"];
  for (let wx = X0; wx < X1; wx++) {
    const gy = groundY(wx);
    for (let wy = R(gy); wy < TOP + LH; wy++) {
      const d = wy - gy; let col;
      if (d < 4) { const r0 = rnd(wx * 3 + wy * 17); col = d < 1 ? (r0 < 0.4 ? MOSS[3] : MOSS[2]) : r0 < 0.16 ? "#8A4A3A" : r0 < 0.28 ? "#6A3A30" : r0 < 0.34 ? "#A86A3A" : r0 < 0.62 ? MOSS[1] : "#2A2018"; }
      else {
        const wv = Math.sin(wx * 0.025) * 6 + Math.sin(wx * 0.09) * 2, v = (wy + wv + 200) / 22, band = Math.floor(v), f = v - band;
        let k = [4, 3, 4.6, 3.2, 4.2][((band % 5) + 5) % 5] - Math.min(3, Math.max(0, wy - 30) / 90);
        if (d < 22) k += (1 - d / 22) * 1.2;                                         // dark humus just under the litter, lit by the moon
        if (f < 0.1) k -= 1;                                                         // a thin dark seam between strata
        col = SOIL[Math.max(0, Math.min(6, R(k + bayer(wx, wy) - 0.5)))];
        if (rnd(wx * 13 + wy * 71) < 0.006) col = "#5A4040";
      }
      const cb = sm(wx, X1 - 90, X1 + 6);                                           // blend into the camp's moonlit ground
      if (cb > 0) { const q = clamp01((wy - LAND) / 320) * 3, lo = Math.floor(q), cc = CAMPG[Math.min(4, lo + (q - lo > bayer(wx, wy) ? 1 : 0))]; col = mix(col, d < 2 ? "#2A3C48" : cc, cb * 0.8); }
      px(wx, wy, col);
    }
  }
  // roots from both trees spreading through the soil (lit on top), with root hairs
  const root = (x, y, dir, len, r0, s) => {
    for (let k = 0; k < len; k++) { const r = Math.max(0.6, r0 * (1 - k / len)); for (let j = -R(r); j <= R(r); j++) px(R(x), R(y + j), j <= -R(r) ? "#8A6070" : j < 0 ? "#5E3C48" : j < R(r) ? "#46283A" : "#22121A"); x += dir * (0.9 + Math.sin(k * 0.07 + s) * 0.55); y += 0.35 + k / (len * 1.6);
      if (k % 19 === 9 && r > 1.2) { let x2 = x, y2 = y; const d2 = rnd(s * 7 + k) < 0.5 ? -1 : 1; for (let m = 0; m < 26 * r / r0 + 8; m++) { px(R(x2), R(y2), m < 6 ? "#5E3C48" : "#46283A"); x2 += d2 * 0.6; y2 += 0.85; } } }
  };
  for (const [wx, list] of [[TREE_L, [[-1, 120, 5], [1, 150, 6], [1, 90, 3.5], [-1, 70, 3]]], [TREE_R, [[-1, 160, 6], [1, 80, 4.5], [-1, 90, 3]]]]) list.forEach(([dir, len, r0], j) => root(wx + dir * (10 + j * 4), LAND + 2 + j * 3, dir, len, r0, j + wx));
  for (let i = 0; i < 7; i++) root(X0 + 60 + i * 70 + rnd(i * 9) * 30, LAND + 3, rnd(i * 5) < 0.5 ? -1 : 1, 26 + rnd(i * 3) * 30, 1.6, i * 3);   // small plant roots
  // pebbles and two bigger rocks (lit from the upper left)
  const rock = (wx, wy, rx, ry) => { for (let j = -R(ry); j <= R(ry); j++) for (let k = -R(rx); k <= R(rx); k++) { const d = (k / rx) ** 2 + (j / ry) ** 2; if (d > 1) continue; const lit = (-k / rx - j / ry) * 0.7 + (1 - d) * 0.6; px(R(wx + k), R(wy + j), d > 0.8 ? "#120C16" : lit > 0.75 ? "#7A6A88" : lit > 0.35 ? "#56486A" : lit > -0.1 ? "#3E3250" : "#2C2238"); } };
  for (let i = 0; i < 22; i++) { const wx = X0 + 14 + rnd(i * 31) * 510, wy = 14 + rnd(i * 37) * 270, rx = 2.5 + rnd(i * 41) * 4.5; rock(wx, wy, rx, rx * 0.68); }
  for (let i = 0; i < 70; i++) { const wx = X0 + 4 + rnd(i * 53 + 5) * 532, wy = 158 + rnd(i * 59) * 30 + Math.sin(wx * 0.025) * 6, rx = 1.8 + rnd(i * 61) * 3; rock(wx, wy, rx, rx * 0.7); }   // a pebbly layer
  rock(3446, 236, 16, 10); rock(3684, 120, 12, 8); rock(3292, 210, 10, 7);
  // glowing fungus threads under the mushroom clusters (faint cyan), with a few brighter knots
  for (const [mx, i] of [[3268, 0], [3324, 1], [3632, 2], [3740, 3]]) for (let b = 0; b < 4; b++) { let x = mx + (b - 1.5) * 6, y = LAND + 4; for (let k = 0; k < 46 + b * 16; k++) { if (k % 2 === 0) px(R(x), R(y), k < 24 ? "#3A9A98" : "#20646A"); if (k % 23 === 11) { px(R(x) + 1, R(y), "#7AE8E0"); px(R(x), R(y) + 1, "#3A9A98"); } x += Math.sin(k * 0.3 + b * 2 + i) * 1.1 + (b - 1.5) * 0.35; y += 0.75; } }
  // mushrooms (the glow halos pulse per frame)
  for (const [wx, i, kind, s, dy = 0] of MUSHROOMS) mushroom(g, L(wx), T(groundY(wx) + dy), s, GLOW[kind], i);
}
function mushroom(g, x, y, s, G, i) {
  const h = R(5 + s * 4), w = R(4 + s * 3);
  for (let j = 0; j < h; j++) { g.px(x, y - j, "#E8DCC8"); g.px(x + 1, y - j, j < 2 ? "#A89880" : "#C8B8A0"); }
  for (let j = 0; j <= R(w * 0.7); j++) { const half = R(w * Math.sqrt(1 - (j / (w * 0.75)) ** 2)); for (let k = -half; k <= half + 1; k++) g.px(x + k, y - h - j, j === 0 ? G[0] : k < 0 && j > 1 ? G[3] : G[2]); }
  g.px(x - 1, y - h - R(w * 0.5), "#FFFFFF");
  if (i % 3 === 0) { g.px(x + w - 1, y - h - 1, G[3]); g.px(x - w + 1, y - h - 1, G[1]); }
}
let BACK = null;
const backLayer = () => BACK ??= worldLayer(LX0, TOP, LW, LH, paintBack);

// ---------------------------------------------------------------- per-frame bits
function vines(c, V, t) {
  for (const [wx, top, len, ph] of [[3352, -470, 250, 0], [3392, -500, 170, 1.3], [3428, -540, 120, 2.6], [3604, -540, 140, 0.7], [3640, -500, 230, 2.1], [3262, -560, 330, 1.7], [3746, -430, 150, 0.4]]) {
    const x0 = V.X(wx), y0 = V.Y(top); if (x0 < -30 || x0 > 570) continue;
    for (let k = 0; k < len; k += 1) {
      const sw = Math.sin(t * 0.9 + ph + k * 0.012) * (k / len) * 9, x = R(x0 + sw + Math.sin(k * 0.05 + ph) * 3), y = R(y0 + k);
      c.px(x, y, "#2C5232"); c.px(x + 1, y, "#16301E");
      if (k % 18 === 9) { const sd = (k / 18) % 2 >= 1 ? 1 : -1; for (let j = 1; j < 8; j++) { c.px(x + sd * j, y + (j >> 1), j < 6 ? "#4A8A44" : "#2E6234"); c.px(x + sd * j, y + (j >> 1) + 1, "#24502C"); } c.px(x + sd * 2, y, "#6AA85A"); }
    }
    // a little curl at the end
    const ex = R(x0 + Math.sin(t * 0.9 + ph + len * 0.012) * 9 + Math.sin(len * 0.05 + ph) * 3), ey = R(y0 + len); for (let a = 0; a < 5.5; a += 0.5) c.px(R(ex + Math.cos(a) * 3), R(ey + Math.sin(a) * 3), "#2C5232");
  }
}
function glows(c, V, t) {
  for (const [wx, i, kind, s, dy = 0] of MUSHROOMS) {
    const x = V.X(wx), y = V.Y(groundY(wx) + dy) - 7 - s * 4; if (x < -20 || x > 560) continue;
    const p = 0.55 + 0.45 * Math.sin(t * (1.3 + (i % 3) * 0.4) + i * 1.9), r = 9 + s * 5, col = GLOW[kind][1];
    for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) { const d = Math.hypot(X - x, (Y - y) * 1.2) / r; if (d < 1 && (1 - d) ** 1.5 * 0.55 * p > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), col, 0.5)); }
  }
}
const SPR = spriteCache(48);
function leafSprite(len, wid, ang, ramp, key) {
  const q = R(ang * 40) / 40;
  const S = R(len + wid + 6);
  return SPR(`${key}|${len}|${wid}|${q}`, 2 * S, 2 * S, S, S, (g, ox, oy) => leaf(g, ox, oy, len, wid, q, ramp, { rim: null }));
}
function fireflies(c, V, t) {
  for (let i = 0; i < 18; i++) {
    const wx = X0 + 10 + rnd(i * 5) * (X1 - X0 + 20) + Math.sin(t * (0.35 + rnd(i) * 0.3) + i * 2) * 26, wy = -420 + rnd(i * 9) * 390 + Math.sin(t * (0.6 + rnd(i * 4) * 0.4) + i) * 16;
    if (Math.abs(wx - SNAKE_X) < 70 && wy > -390 && wy < -230) continue;      // never in front of the snake's face
    const x = R(V.X(wx)), y = R(V.Y(wy)), gl = 0.5 + 0.5 * Math.sin(t * (2.2 + rnd(i * 3) * 1.5) + i * 1.7); if (x < 0 || x > 539 || gl < 0.18) continue;
    const g = fade(c, Math.min(1, (gl - 0.18) * 3));
    g.px(x, y, gl > 0.6 ? "#FAFFB0" : "#C8E870");
    if (gl > 0.55) { const h = fade(c, (gl - 0.55) * 1.6); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) h.px(x + dx, y + dy, "#D8F07A"); for (const [dx, dy] of [[-1, -1], [1, 1], [1, -1], [-1, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) if (gl > 0.8) fade(c, 0.35).px(x + dx, y + dy, "#9AC860"); }
  }
}
function fallingLeaves(c, V, t) {
  for (let i = 0; i < 6; i++) {
    const P = 7 + rnd(i * 3) * 4, k = (((t + rnd(i * 7) * P) % P) + P) % P / P, u0 = rnd(i * 11), wx0 = u0 < 0.5 ? lerp(X0 + 30, SNAKE_X - 110, u0 * 2) : lerp(SNAKE_X + 90, X1 + 10, u0 * 2 - 1);   // never across the snake's face
    const wy = lerp(-470, LAND - 4, k), sway = Math.sin(k * Math.PI * 5 + i), wx = wx0 + sway * 16 + k * 20;
    const a = Math.min(sm(k, 0, 0.08), 1 - sm(k, 0.9, 1)), x = V.X(wx), y = V.Y(wy); if (x < -10 || x > 550 || a <= 0) continue;
    const ang = sway * 0.9 + 0.3, ca = Math.cos(ang), sa = Math.sin(ang), g = fade(c, a), flip = Math.cos(k * Math.PI * 5 + i);
    for (let u = -4; u <= 4; u++) for (let v = -2; v <= 2; v++) { if ((u / 4.5) ** 2 + (v / (2.2 * Math.max(0.35, Math.abs(flip)))) ** 2 > 1) continue; g.px(R(x + u * ca - v * sa), R(y + u * sa + v * ca), v === 0 ? "#1E4A2A" : flip > 0 ? (v < 0 ? "#5A9A4E" : "#3E7A40") : "#2E6234"); }
  }
}

// ---------------------------------------------------------------- level exports
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V);
  glows(c, V, t);
  vines(c, V, t);
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  // the level sign: weathered wood on a post, a vine wound round it
  const sx = R(V.X(SIGN_X)), sy = R(V.Y(LAND)) + 1;
  if (sx > -60 && sx < 600) {
    sign(c, sx, sy, "LV 7", "wood", 1, t);
    for (let k = 0; k < 30; k++) { const y = sy - k, x = sx + R(Math.sin(k * 0.5) * 3.5); c.px(x, y, Math.cos(k * 0.5) > 0 ? "#3E7A3A" : "#1E4024"); }
    for (const [dx, dy, len, ang] of [[-26, -52, 16, -2.6], [-30, -50, 12, 2.4], [27, -54, 14, -0.6], [-4, -12, 10, -2.4], [4, -20, 10, -0.5]]) leafSprite(len, 4.5, ang + Math.sin(t * 1.3 + dx) * 0.05, LEAFB, `s${len}`).blit(c, sx + dx, sy + dy);
  }
  // the snake (coil centre on the ground under the sky disc)
  const gx = V.X(SNAKE_X); if (gx > -160 && gx < 700) drawSnake(c, gx, V.Y(LAND), t);
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // ferns and grass tufts along the ground line (kept clear of the coil and the sign)
  for (const [wx, n, len, cols] of [[3248, 7, 30, 0], [3274, 5, 22, 1], [3322, 6, 26, 0], [3398, 5, 20, 1], [3634, 6, 24, 0], [3668, 5, 20, 1], [3720, 7, 30, 0], [3756, 6, 26, 1], [3778, 5, 18, 0]]) {
    const x = R(V.X(wx)), y = R(V.Y(groundY(wx))) + 3; if (x < -40 || x > 580) continue;
    fern(c, x, y, n, len, Math.sin(t * 1.2 + wx * 0.05) * 0.06, cols ? ["#1E4A2A", "#2E6A36", "#4A8A44"] : ["#16382A", "#24563A", "#3E7A48"], 0.42);
  }
  for (let i = 0; i < 26; i++) { const wx = X0 + 6 + i * 21 + rnd(i * 3) * 8; if (Math.abs(wx - SNAKE_X) < 125 || Math.abs(wx - SIGN_X) < 30) continue; const x = R(V.X(wx)), y = R(V.Y(groundY(wx))) + 2; if (x < -5 || x > 545) continue; for (let b = -2; b <= 2; b++) { const h = 4 + ((i + b) % 3) * 2, sw = Math.sin(t * 1.5 + i + b) * 0.8; for (let k = 0; k < h; k++) c.px(R(x + b * 2 + (sw * k) / h), y - k, k > h - 2 ? "#5A9A4A" : "#2E5A32"); } }
  // fallen leaves and a few pebbles in front of the coil, so it sits in the litter
  for (const [dx, k] of [[-118, 0], [-60, 1], [96, 2], [128, 3]]) { const x = R(V.X(SNAKE_X + dx)), y = R(V.Y(LAND)) + 2; if (x < -5 || x > 545) continue; c.rect(x - 3, y, 7, 2, k % 2 ? "#8A4A3A" : "#6A5A2A"); c.px(x - 4, y + 1, "#4A2A20"); c.px(x + 4, y, "#4A2A20"); }
  // big dark foreground leaves rising from the bottom corners, swaying a little
  for (const [wx, wy, len, wid, ang, ph] of [[X0 - 6, 300, 140, 30, -0.95, 0], [X0 + 46, 312, 110, 24, -1.35, 1], [X1 + 6, 300, 136, 28, -2.2, 2], [X1 - 50, 314, 104, 22, -1.8, 3]]) {
    const x = V.X(wx), y = V.Y(wy); if (x < -170 || x > 710) continue;
    leafSprite(len, wid, ang + Math.sin(t * 1.0 + ph) * 0.04, ["#030608", "#060C10", "#0A1614", "#0E2018", "#142C1E", "#1C3A24", "#26482A", "#305430"], `f${len}`).blit(c, R(x), R(y));
  }
  fallingLeaves(c, V, t);
  fireflies(c, V, t);
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // "+VENOM": a game pickup rising beside the hood as the snake hisses
  pickup(c, R(V.X(SNAKE_X - 140)), R(V.Y(-362)), "+VENOM", (t - JT.pickup.t0) / JT.pickup.dur, "#C6F25A");
}
