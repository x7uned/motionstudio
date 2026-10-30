// LV7 · horse — a horse pasture on rolling hills in warm late-afternoon light (RANGE BIOME.pasture = 2970..3510).
// Far hazy hills, nearer green hills with hedgerows, a small red stable, a wooden post-and-rail fence, wildflowers; the
// park's trees on the left, the meadow turning into reeds and mud toward the river on the right. A chestnut horse with
// a white blaze and one white sock stands facing the camera, its head in the sky disc (big lashed eyes, blush, mane and
// tail blowing in the breeze). Events: "half a tonne" → +500 KG and 8 tiny people drop onto a hay-bale seesaw until it
// balances a pony ("8 PEOPLE = 1 HORSE"); "one toe" → the horse taps its hoof, an X-ray magnifier grows out of the hoof
// and shows the single toe (the toe bones light up, "ONE TOE"), on "leg" the faint three-toed ancestor foot appears.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { blob, flat, ell, tube, bez, eye, blush, smile, sign, pickup, tag, RAMP, C, MAIN, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { worldLayer, spriteCache, xf, thick, gaze, flower, tuft, soil, mudAt, personIcon, ponyIcon, seesaw, spring, clipped } from "./pasture-kit.mjs";
import { PT } from "./pasture-motions.mjs";

export const RANGE = BIOME.pasture;
const R = Math.round, [X0, X1] = RANGE;
const HX = PT.x.horse, HEAD_Y = -276;                 // horse: head centre (world); hooves on LAND
const SAW_X = PT.x.seesaw, SIGN_X = 3402;              // seesaw pivot, LV sign
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;

// ---------------------------------------------------------------- palette
const COAT = ["#2A0E06", "#4E1A0C", "#7A2C14", "#A3441E", "#C4602A", "#DC8038", "#EEA458", "#F8C888"];
const MANE = ["#1C0806", "#36100A", "#561A10", "#782816", "#98381E", "#B44E2A", "#CC6C3E", "#E29460"];
const SNOUT = ["#4A2A24", "#7A4A40", "#A86E60", "#C88E7E", "#E0AE9C", "#F0C8B6", "#F8DED0", "#FFF2EA"];
const WHITE = ["#5A4A4A", "#8A7A78", "#B4A8A4", "#D4CCC6", "#EAE4DE", "#F6F2EC", "#FFFCF6", "#FFFFFF"];
const HOOF = ["#120C0A", "#241A16", "#3A2C26", "#52423A", "#6A5850", "#847268", "#A08E84", "#BCAAA0"];
const IRIS = ["#0A0404", "#1A0C08", "#2E1610", "#4A2416", "#6A381E", "#8E5228", "#B4743A", "#D89A58"];
const LIT = "#FFD488";
const GREEN = ["#1E3A1E", "#2A5226", "#3A6A2C", "#4E8434", "#66A03E", "#86B84C", "#AACE62", "#D0E486"];

// ---------------------------------------------------------------- terrain (static layer, drawn once)
const TOP = -340, LH = 860, LX0 = X0 - 44, LW = 3600 - LX0;   // hills run on to x 3600 where the river's far bank takes over
// hill crests: they start at the park's hill heights at x 2970 (far ≈ −100, near ≈ −66) and run down to the river
const parkK = (x) => 1 - sm(x, 2970, 3075);
const farRidge = (x) => { const base = -176 + Math.sin(x * 0.011 + 1) * 13 + Math.sin(x * 0.029 + 0.4) * 7 + Math.sin(x * 0.071) * 2; return lerp(lerp(base, -100, parkK(x)), -58, sm(x, 3410, 3560)); };
const midRidge = (x) => { const base = -116 + Math.sin(x * 0.017 + 2.1) * 11 + Math.sin(x * 0.043 + 1) * 5; return lerp(lerp(base, -66, parkK(x)), -34, sm(x, 3380, 3520)); };
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far hills: hazy, warm light on the crests
  const FAR = ["#C8D4A4", "#B2C696", "#A0B88C", "#92AC86", "#88A280"];
  for (let wx = X0; wx < LX0 + LW; wx++) { const top = R(farRidge(wx)), pk = parkK(wx); for (let wy = top; wy < LAND; wy++) { const d = wy - top, v = Math.min(4, d / 9); const lo = Math.floor(v); let col = FAR[Math.min(4, v - lo > bayer(wx, wy) ? lo + 1 : lo)]; if (d < 1) col = "#E8E4B0"; if (pk > 0) col = mix(col, d < 6 ? "#C6E2C0" : "#A8CCA4", pk); px(wx, wy, col); } }
  // far trees and hedges on the far hills
  for (let i = 0; i < 26; i++) { const wx = LX0 + 10 + rnd(i * 7 + 2) * (LW - 20), top = farRidge(wx), wy = top + 4 + rnd(i * 3) * 12, r = 2.5 + rnd(i * 5) * 3.5; if (wx > 3470) continue;
    for (let y = -r; y <= r * 0.6; y++) for (let x = -r * 1.2; x <= r * 1.2; x++) if ((x / (r * 1.2)) ** 2 + (y / r) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.35 && x < r * 0.3 ? "#8EAA7A" : "#6E8E68"); }
  // mid hills: richer green, golden-lit crest, contour hedgerows with little round trees
  for (let wx = X0; wx < LX0 + LW; wx++) {
    const top = R(midRidge(wx)), pk = parkK(wx);
    for (let wy = top; wy < LAND; wy++) {
      const d = wy - top, b = bayer(wx, wy); let col;
      if (d < 1) col = "#E6E89A"; else if (d < 3) col = "#B8D46E";
      else { const v = Math.min(1, d / 46), s = 2.2 + v * 2.2 + Math.sin(wx * 0.05 + wy * 0.02) * 0.25; const lo = Math.floor(s); col = ["#9CC85E", "#86BC52", "#74AE4A", "#66A244", "#5C963E", "#548C3A"][Math.min(5, Math.max(0, s - lo > b ? lo + 1 : lo) - 1) + 1] ?? "#548C3A"; }
      // mowed stripes on the pasture slope
      if (d > 8 && ((wx + wy * 2.2) % 46 + 46) % 46 < 16) col = mix(col, "#B4D670", 0.16);
      if (pk > 0) col = mix(col, d < 4 ? "#9CCC7C" : d < 20 ? "#86BC6C" : "#76AE60", pk * 0.8);
      px(wx, wy, col);
    }
  }
  for (const [x0, x1, y0, dy] of [[2990, 3200, -96, 0.05], [3260, 3400, -98, -0.06]]) for (let wx = x0; wx < x1; wx++) { const wy = R(y0 + (wx - x0) * dy + Math.sin(wx * 0.09) * 1.5); px(wx, wy, "#3E7034"); px(wx, wy - 1, "#4E8038"); if (rnd(wx) < 0.25) px(wx, wy - 2, "#5E9040"); }
  for (const [wx, r] of [[3010, 9], [3122, 7], [3290, 8], [3352, 6]]) { const wy = midRidge(wx) + 10; blob(g, [ell(L(wx), T(wy - r * 0.7), r * 1.2, r)], { ramp: GREEN, thick: 6, base: 3.6, gain: 1.6, litOutline: "#E8E890" }); for (let k = 0; k < 4; k++) px(R(wx), R(wy + k), "#4A3020"); }
  // the small stable on the right hill: red planks, white trim, dark Dutch door with hay, shingle roof, horse weathervane
  stable(g, L(3446), T(-94));
  // near meadow: perspective rows of grass, clover and wildflowers (denser and bigger toward us)
  const FLW = [["#FFFFFF", "#F8D040"], ["#FFE45A", "#E89A20"], ["#F4A0D0", "#FFF0A0"], ["#B48AF0", "#FFF0A0"], ["#FF8A7A", "#FFE08A"]];
  for (let i = 0; i < 260; i++) {
    const v = Math.pow(rnd(i * 11 + 5), 0.7), wy = R(-86 + v * 62), wx = X0 + 4 + rnd(i * 13 + 1) * (LW - 80); if (wy < midRidge(wx) + 6) continue;
    const near = v > 0.6, f = FLW[R(rnd(i * 17) * 4)];
    if (rnd(i * 23) < 0.55) { for (let k = 0; k < 2 + v * 4; k++) px(R(wx + (k % 2)), wy - k, k > 2 ? "#A8CC62" : "#5E983E"); }
    else if (wx < 3460) { if (near) { for (let k = 1; k < 5; k++) px(R(wx), wy - k + 3, "#4E8838"); flower(g, L(wx), T(wy - 2), v > 0.85 ? 2 : 1, f[0], f[1]); } else { px(R(wx), wy, f[0]); px(R(wx) + 1, wy, mix(f[0], "#6A9A48", 0.4)); } }
  }
  // the post-and-rail fence across the middle ground
  const W1 = ["#3A2618", "#5E4028", "#7E5A3A", "#9E7650", "#C49A6A", "#E2BC88"];
  for (let wx = 2984; wx < 3478; wx++) for (const ry of [-58, -46]) { const y = ry + R(Math.sin(wx * 0.01) * 1); px(wx, y - 1, W1[0]); px(wx, y, W1[4]); px(wx, y + 1, W1[3]); px(wx, y + 2, W1[2]); px(wx, y + 3, W1[0]); }
  for (let wx = 2990; wx < 3480; wx += 37) { const h = 30; for (let y = -36 - h; y <= -34; y++) for (let x = -3; x <= 3; x++) px(wx + x, y, x === -3 || x === 3 || y === -36 - h ? W1[0] : x < -1 ? W1[4] : x > 1 ? W1[2] : W1[3]); px(wx - 2, -36 - h + 1, W1[5]); px(wx - 1, -36 - h + 1, W1[5]); for (let x = -5; x <= 5; x++) px(wx + x, -34, "#3E6A2E"); }
  // big park-side tree at the left edge (its canopy hides the seam with the park)
  tree(g, L(2998), T(LAND), 1);
  // ground lip and soil cross-section (shared strata with the river banks)
  for (let wx = X0; wx < X1 + 2; wx++) {
    const mud = mudAt(wx);
    for (let wy = LAND; wy < TOP + LH; wy++) {
      const d = wy - LAND; let col;
      if (d < 2) col = d < 1 ? "#B4D468" : "#7EAE48";
      else if (d < 5 + Math.sin(wx * 0.37) * 1.5) col = "#4A7A34";
      else if (d < 9 + Math.sin(wx * 0.21) * 2) col = mix("#4E3020", "#3E3020", mud);
      else col = soil(wx, wy, d, mud);
      px(wx, wy, col);
    }
  }
  // roots, buried stones and a lost horseshoe in the soil
  for (let i = 0; i < 22; i++) { let x = X0 + 6 + rnd(i * 3 + 1) * (X1 - X0 - 20), y = LAND + 6; for (let k = 0; k < 8 + rnd(i) * 20; k++) { px(R(x), R(y), "#3E2412"); x += (rnd(i * 50 + k) - 0.5) * 2; y += 1; } }
  for (let i = 0; i < 10; i++) { const wx = X0 + 20 + rnd(i * 7 + 3) * (X1 - X0 - 50), wy = 30 + rnd(i * 5 + 2) * 300, r = 3 + rnd(i) * 6; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#2A1A14", "#4A3024", "#6A4A38", "#8A6650", "#A6826A", "#C09E84", "#D6B89E", "#EAD2B8"], thick: 4 }); }
  { const cx = L(3352), cy = T(46); for (let a = 0.35; a <= Math.PI * 2 - 0.35; a += 0.02) for (let rr = 6; rr <= 9; rr++) g.px(R(cx + Math.sin(a) * rr * 0.9), R(cy - Math.cos(a) * rr), rr === 9 || rr === 6 ? "#5A5A66" : a < 2.4 ? "#C8CCD8" : "#9AA0B0"); for (const a of [1.2, 1.9, 4.4, 5.1]) g.px(R(cx + Math.sin(a) * 7.5 * 0.9), R(cy - Math.cos(a) * 7.5), "#3A3A46"); }
}
function stable(g, x, y) {
  // (x, y) = bottom centre of the front wall
  const w = 60, h = 30, RED = ["#4A1410", "#7A2218", "#9A3022", "#B8402C", "#D45A3A"], TRIM = "#F4EEE0";
  for (let j = 0; j < h; j++) for (let i = -w / 2; i < w / 2; i++) { const plank = ((i + 40) % 6 === 0); g.px(x + i, y - j, plank ? RED[1] : i < -w / 2 + 3 ? RED[4] : j < 3 ? RED[1] : RED[3]); }
  for (let j = 0; j < h; j++) { g.px(x - w / 2, y - j, TRIM); g.px(x + w / 2 - 1, y - j, TRIM); }
  // roof (gable seen from the front) with dark shingles and a lit edge
  const peak = y - h - 22;
  for (let j = 0; j <= 24; j++) { const hw = R((w / 2 + 6) * (j / 24)); for (let i = -hw; i <= hw; i++) g.px(x + i, peak + j, j === 24 || Math.abs(i) >= hw - 1 ? "#2A1A2A" : (j + (i & 1)) % 4 === 0 ? "#4A3048" : "#5E3E58"); for (let k = 0; k < 2; k++) g.px(x - hw + k, peak + j, "#F0C890"); }
  // gable triangle wall with a round hay window
  for (let j = 4; j <= 22; j++) { const hw = R((w / 2 - 3) * ((j - 2) / 22)); for (let i = -hw; i <= hw; i++) g.px(x + i, peak + j + 1, (i + 40) % 6 === 0 ? RED[1] : RED[2]); }
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = i * i + j * j; if (d <= 18) g.px(x + i, peak + 14 + j, d > 11 ? TRIM : j > 0 ? "#E8C454" : "#3A2418"); }
  // Dutch door: dark doorway, lower half door with a white X, hay peeking out
  const dw = 18, dh = 22;
  for (let j = 0; j < dh; j++) for (let i = -dw / 2; i < dw / 2; i++) g.px(x + i, y - j, j > 10 ? (Math.abs(i) === dw / 2 || j === 11 ? TRIM : RED[2]) : "#1E1012");
  for (let k = 0; k < 10; k++) { g.px(x - dw / 2 + 1 + R(k * 1.6), y - 1 - k, TRIM); g.px(x + dw / 2 - 2 - R(k * 1.6), y - 1 - k, TRIM); }
  for (let i = -dw / 2 + 1; i < dw / 2 - 1; i++) { g.px(x + i, y - 22, TRIM); }
  for (let i = -7; i <= 7; i++) for (let k = 0; k < 2 + ((i * 7) & 3); k++) g.px(x + i, y - 12 - k, (i + k) % 3 ? "#E8C454" : "#B08A2A");
  // side window
  for (const sx of [-20, 13]) { for (let j = 0; j < 8; j++) for (let i = 0; i < 7; i++) g.px(x + sx + i, y - 22 + j, i === 0 || j === 0 || i === 6 || j === 7 ? TRIM : j < 3 ? "#FFE8A0" : "#2A1A20"); }
  // weathervane: a tiny horse on a pole
  for (let j = 0; j < 9; j++) g.px(x, peak - j, "#2A1A2A");
  const vane = ["..##...", ".####..", "#######", "..#.#.."]; vane.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "#") g.px(x - 3 + i, peak - 13 + j, "#2A1A2A"); }));
}
function tree(g, x, y, s) {
  // a round leafy park tree: trunk + clustered canopy with lit tops
  const TR = ["#1E120A", "#3A2414", "#56361E", "#74492A", "#8E5E38", "#A87A4E", "#C29A6E", "#DCBC94"];
  blob(g, [tube([[x - 2, y], [x - 4, y - 70 * s], [x + 6, y - 120 * s]], 9 * s, 6 * s), tube([[x - 3, y - 70 * s], [x - 26 * s, y - 112 * s]], 5 * s, 3 * s)], { ramp: TR, thick: 6, base: 3.0, litOutline: "#E8B880" });
  const LEAF = ["#12301A", "#1C4222", "#28582A", "#367034", "#4A8A3E", "#64A44A", "#86BE5A", "#AED474"];
  const parts = [[0, -150, 46, 38], [-34, -128, 32, 28], [32, -126, 34, 28], [-12, -182, 34, 28], [22, -170, 30, 26], [-40, -160, 26, 22]];
  blob(g, parts.map(([dx, dy, rx, ry]) => ell(x + dx * s, y + dy * s, rx * s, ry * s)), { ramp: LEAF, thick: 22, base: 2.6, gain: 2.6, litOutline: "#D8E88A" });
  for (let i = 0; i < 40; i++) { const a = rnd(i * 3) * Math.PI * 2, rr = rnd(i * 5) * 40 * s, px = R(x + Math.cos(a) * rr), py = R(y - 150 * s + Math.sin(a) * rr * 0.8); g.px(px, py, LEAF[6]); g.px(px + 1, py, LEAF[7]); g.px(px, py + 1, LEAF[4]); }
}
let BACK = null;
const backLayer = () => BACK ??= worldLayer(LX0, TOP, LW, LH, paintBack);

// ---------------------------------------------------------------- the horse (sprites anchored at the head centre)
// head centre at world (HX, HEAD_Y); hooves on LAND = local y FOOT. Compact chibi body: short neck hidden behind the
// head, a round chest with shoulders, two front legs (white sock on the viewer's left), hind legs set back outside.
const FOOT = LAND - HEAD_Y;
const SPR = spriteCache(140);
function hoof(g, P, x, y0, y1, w0, w1, base) {
  blob(g, [smooth(P.poly([[x - w0, y0], [x + w0, y0], [x + w1, y1 - 2], [x + w1 - 2, y1], [x - w1 + 2, y1], [x - w1, y1 - 2]]), new Set([0, 1]), 3)], { ramp: HOOF, thick: 6, base: base - 0.6, gain: 1.6, litOutline: HOOF[4] });
  for (let k = -w0 + 2; k <= w0 - 2; k++) { const p = P(x + k, y0 + 1); g.px(R(p[0]), R(p[1]), HOOF[3]); }
}
/** Hind legs, barrel and neck. */
function bodySprite() {
  return SPR("body", 200, 232, 100, -40, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    for (const sd of [-1, 1]) {
      blob(g, [tube([P(sd * 49, 176), P(sd * 51, 210), P(sd * 50, FOOT - 22)], 14, 12)], { ramp: COAT, thick: 9, base: 2.1, gain: 1.4, litOutline: COAT[4] });
      hoof(g, P, sd * 50, FOOT - 23, FOOT - 6, 12.5, 14.5, 2.3);
    }
    blob(g, [P.poly(ell(0, 160, 68, 46))], { ramp: COAT, thick: 26, base: 2.2, gain: 1.8, slope: 0.4, litOutline: LIT });
  });
}
/** Front legs; lift = how far the viewer's-right front hoof is raised (px, quantised). */
function legsSprite(lift) {
  const q = R(lift);
  return SPR(`legs${q}`, 100, 112, 50, -150, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    for (const sd of [-1, 1]) {
      const up = sd > 0 ? q : 0, x = sd * 21, kx = x + sd * 0.5;
      blob(g, [tube([P(x, 176), P(kx, 214 - up * 0.7), P(x, FOOT - 16 - up)], 15, 13), P.poly(ell(kx, 216 - up * 0.7, 14.5, 9))], { ramp: COAT, thick: 11, base: 2.9, gain: 1.8, litOutline: LIT });
      if (sd < 0) blob(g, [P.poly([[x - 13.5, FOOT - 34], [x - 4, FOOT - 37], [x + 4, FOOT - 36], [x + 13.5, FOOT - 33], [x + 14, FOOT - 17], [x - 14, FOOT - 17]])], { ramp: WHITE, thick: 6, base: 3.8, gain: 1.4, outline: COAT[1], litOutline: WHITE[6] });
      hoof(g, P, x, FOOT - 18 - up, FOOT - up, 14, 16, 3.0);
    }
  });
}
/** Chest with shoulders (in front of the leg tops). */
function chestSprite() {
  return SPR("chest", 180, 190, 90, -30, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    const neck = smooth(P.poly([[-30, 40], [30, 40], [36, 92], [34, 114], [-34, 114], [-36, 92]]), new Set(), 5);
    blob(g, [neck, P.poly(ell(0, 154, 56, 54)), P.poly(ell(-26, 142, 30, 36)), P.poly(ell(26, 142, 30, 36))], { ramp: COAT, thick: 40, base: 2.9, gain: 2.0, slope: 0.9, litOutline: LIT });
    for (let k = -12; k <= 12; k++) { const p = P(k, 196 + (k * k) / 30); g.px(R(p[0]), R(p[1]), COAT[3]); }
  });
}
/** Mane falling on the right side of the neck, lifted to the right by the breeze; ph = phase bucket. */
function maneSprite(ph) {
  const q = ((ph % 32) + 32) % 32;
  return SPR(`mane${q}`, 120, 210, -20, 70, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0), w = (q / 32) * Math.PI * 2, locks = [], tips = [];
    for (let i = 0; i < 8; i++) {
      const y0 = -46 + i * 15, sw = Math.sin(w - i * 0.7) * 4.5, lift = Math.cos(w - i * 0.7) * 2.5, len = 1 - i * 0.05;
      const a = P(22, y0), b = P(48 + i, y0 + 3 + lift), cc = P(22 + (42 + sw) * len + i * 2, y0 + 24 + lift);
      const pts = bez(a, b, cc, 12); locks.push(tube(pts, 14, 8)); tips.push(pts);
    }
    blob(g, locks, { ramp: MANE, thick: 8, base: 3.0, gain: 1.9, litOutline: "#F4A868" });
    for (const pts of tips.filter((_, i) => i % 2 === 0)) for (const [x, y] of pts.slice(4, 10)) g.px(R(x), R(y) - 4, MANE[6]);
  });
}
/** Tail peeking out behind the right hind leg; ph = swish phase bucket. */
function tailSprite(ph) {
  const q = ((ph % 32) + 32) % 32;
  return SPR(`tail${q}`, 110, 170, -30, -100, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0), w = (q / 32) * Math.PI * 2, sw = Math.sin(w) * 9;
    blob(g, [tube(bez(P(54, 124), P(98 + sw * 0.4, 140), P(90 + sw, 226), 16), 15, 9), tube(bez(P(56, 130), P(86 + sw * 0.3, 160), P(80 + sw * 0.8, 230), 14), 12, 7)], { ramp: MANE, thick: 9, base: 3.0, gain: 1.7, litOutline: "#F4A868" });
    for (let k = 4; k < 14; k++) { const p = bez(P(58, 128), P(94 + sw * 0.4, 146), P(86 + sw, 222), 16)[k]; g.px(R(p[0]), R(p[1]), MANE[6]); }
  });
}
/** Ears (both); ang = outward tilt (rad), tw = extra twitch of the right ear. */
function earsSprite(ang, tw) {
  const qa = R(ang / 0.04), qt = R(tw / 0.05);
  return SPR(`ears${qa}|${qt}`, 180, 90, 90, 98, (g, ox, oy) => {
    for (const sd of [-1, 1]) {
      const a = sd * (qa * 0.04 + (sd > 0 ? qt * 0.05 : 0)), P = xf(ox + sd * 30, oy - 40, 1, a);
      blob(g, [smooth(P.poly([[-13, 6], [-10, -22], [0, -46], [9, -22], [13, 6]]), new Set([2]), 5)], { ramp: COAT, thick: 8, base: 3.0, gain: 1.8, litOutline: LIT });
      flat(g, [smooth(P.poly([[-6, 2], [-5, -18], [0, -34], [5, -18], [6, 2]]), new Set([2]), 4)], "#E89A9A");
      flat(g, [smooth(P.poly([[-3, 0], [-2, -14], [0, -24], [2, -14], [3, 0]]), new Set([2]), 3)], "#F4BCB0");
    }
  });
}
/** Head: skull, cheeks, snout with the blaze, forelock. */
function headSprite() {
  return SPR("head", 140, 160, 70, 66, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    blob(g, [P.poly(ell(0, -6, 50, 46)), P.poly(ell(-30, 20, 24, 26)), P.poly(ell(30, 20, 24, 26)), P.poly(ell(0, 40, 34, 34))], { ramp: COAT, thick: 26, base: 3.0, gain: 2.3, slope: 0.4, litOutline: LIT });
    blob(g, [P.poly(ell(0, 56, 33, 26))], { ramp: SNOUT, thick: 14, base: 3.4, gain: 2.0, outline: COAT[1], litOutline: COAT[3] });
    flat(g, [smooth(P.poly([[-7, -40], [0, -46], [7, -40], [5, -18], [4, 6], [9, 34], [0, 40], [-9, 34], [-4, 6], [-5, -18]]), new Set(), 5)], WHITE[6]);
    for (const [x, y] of [[-5, -38], [-4, -30], [-3, -22], [-3, -14], [-2, -6]]) { const p = P(x, y); g.px(R(p[0]), R(p[1]), WHITE[7]); }
    for (let y = -36; y < 30; y += 2) { const p = P(5 + (y > 8 ? (y - 8) * 0.18 : 0), y); g.px(R(p[0]), R(p[1]), WHITE[4]); }
    const locks = [tube(bez(P(-6, -52), P(-16, -40), P(-12, -26), 8), 7, 3), tube(bez(P(0, -54), P(2, -40), P(10, -30), 8), 7, 3), tube(bez(P(4, -52), P(16, -46), P(22, -34), 8), 6, 3)];
    blob(g, locks, { ramp: MANE, thick: 5, base: 3.2, gain: 1.6, litOutline: "#F4A868" });
  });
}
/** Face details drawn per frame: eyes with lashes, blush, nostrils, smile. */
function face(c, x, y, t, look, bl, flare, happy) {
  for (const sd of [-1, 1]) {
    const ex = x + sd * 25, ey = y - 2;
    eye(c, ex, ey, 12, { ry: 14, iris: IRIS, pupil: "round", look, blink: bl, lid: COAT[4] });
    const ly = ey - 14 + 28 * bl;   // long lashes on the outer upper rim follow the lid
    for (const [dx, dy, len] of [[8, 1, 6], [11, 4, 6], [12.5, 8, 5]]) { const bx = ex + sd * dx, by = ly + dy * (1 - bl * 0.6); for (let k = 0; k <= len; k++) c.px(R(bx + sd * k * 0.9), R(by - k * 0.75), "#120606"); }
    blush(c, x + sd * 38, y + 26, 9, 4.5);
    const nx = x + sd * 13, ny = y + 54, rx = 4 + flare, ry = 5.5 + flare * 0.5;
    for (let Y = R(ny - ry); Y <= R(ny + ry); Y++) for (let X = R(nx - rx); X <= R(nx + rx); X++) { const d = ((X - nx) / rx) ** 2 + ((Y - ny) / ry) ** 2; if (d <= 1) c.px(X, Y, d > 0.55 ? "#5A2A24" : "#2A0E0C"); }
    c.px(R(nx - sd * 2), R(ny - ry), SNOUT[6]);
  }
  smile(c, x, y + 71, 8, { open: happy, col: "#5A2420", tongue: "#F07090" });
}

// ---------------------------------------------------------------- choreography (all from words; tables in pasture-motions.mjs, which also lists
// every audible motion for the sound design, so keep timings there)
const T_TAP = PT.tap.t;                                        // hoof taps down on "toe"
const T_LENS = PT.lens.t0, T_LENS_IN = PT.lens.grow;           // magnifier grows out of the hoof
const DROP0 = PT.drop.t0, DROP_DT = PT.drop.dt, FALL = PT.drop.fall, NDROP = PT.drop.n;   // 8 people drop one by one onto the seesaw
const T_LEVEL = PT.drop.level;                                 // last one lands → the seesaw balances
const TILT = PT.drop.tilt, BO = PT.bounce, TP = PT.tap;
const tapLift = (t) => { const u = t - (TP.t - TP.up); if (u < 0 || u > TP.end) return 0; return u < TP.up ? TP.lift * Math.sin((Math.PI / 2) * (u / TP.up)) ** 2 : TP.lift * (1 - ease((u - TP.up) / TP.down)); };
function sawAngle(t) { let a = TILT; for (let i = 0; i < NDROP; i++) a -= (TILT / NDROP) * spring(t - (DROP0 + i * DROP_DT + FALL), PT.settle.k, PT.settle.w); return a; }
const PYR = [[-48, 0], [-37, 0], [-26, 0], [-15, 0], [-42.5, 1], [-31.5, 1], [-20.5, 1], [-31.5, 2]];   // [plank u, row] of the 8 people

export function fill() {}

export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(LX0))), x1: Math.min(540, R(V.X(LX0 + LW))) });
  // leaves shimmer on the left tree
  for (let i = 0; i < 14; i++) { const on = Math.sin(t * (3 + rnd(i) * 3) + i * 2); if (on < 0.4) continue; const a = rnd(i * 3 + 9) * Math.PI * 2, rr = rnd(i * 5 + 9) * 40; const x = R(V.X(2998 + Math.cos(a) * rr)), y = R(V.Y(LAND - 150 + Math.sin(a) * rr * 0.8)); c.px(x, y, "#D8E88A"); c.px(x + 1, y, "#AED474"); }
  // cattails at the river end sway in the breeze
  for (let i = 0; i < 9; i++) {
    const wx = 3462 + i * 5.5 + rnd(i) * 4, h = 34 + rnd(i * 7) * 26, sw = Math.sin(t * 1.6 + i * 0.9) * 3, x0 = V.X(wx), y0 = V.Y(LAND);
    for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x0 + sw * u * u), R(y0 - k), k > h - 12 && k < h - 2 && i % 2 === 0 ? (k % 3 ? "#6A3A1E" : "#8A5228") : u > 0.6 ? "#A8B860" : "#6E8A3A"); }
    if (i % 2) for (let k = 0; k < 14; k++) c.px(R(x0 + 1 + k * 0.6 + sw * 0.6), R(y0 - h * 0.5 - k * 0.8), "#8EA850");
  }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  // ------------------------------------------------ the seesaw (8 PEOPLE = 1 HORSE)
  { const ang = sawAngle(t), sx = R(V.X(SAW_X)), sy = R(V.Y(LAND)) - 30;
    const S = seesaw(c, sx, sy, 58, ang, { base: "log" });
    const pr = S.at(40); ponyIcon(c, R(pr[0]), R(pr[1]) + 1);
    for (let i = 0; i < NDROP; i++) {
      const tl = DROP0 + i * DROP_DT + FALL, u = t - (tl - FALL); if (u < 0) continue;
      const [du, row] = PYR[i], base = S.at(du), yy = base[1] - row * 17, xx = base[0];
      const fk = clamp01(u / FALL), drop = (1 - fk * fk) * 46, hop = u > FALL ? Math.max(0, Math.exp(-(u - FALL) * BO.k) * Math.sin((u - FALL) * BO.w) * BO.amp) : 0;
      personIcon(c, R(xx), R(yy - drop - hop) + 1, { a: sm(u, 0, FALL * 0.55) });
    }
  }
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND)) + 1, "LV 7", "wood", 1, t);
  // ------------------------------------------------ the horse
  const hx = R(V.X(HX)), hy0 = R(V.Y(HEAD_Y)), br = Math.sin(t * 2.1), bob = R(br * 1.0), hb = R(Math.sin(t * 2.1 - 0.6) * 1.6), hy = hy0 + hb;
  tailSprite(Math.floor(t * 9)).blit(c, hx, hy0 + bob);
  bodySprite().blit(c, hx, hy0 + bob);
  shadowUnder(c, hx, R(V.Y(LAND)));
  maneSprite(Math.floor(t * 12)).blit(c, hx, hy);
  legsSprite(tapLift(t)).blit(c, hx, hy0);
  chestSprite().blit(c, hx, hy0 + bob);
  const twitch = win2(t, PT.ear.every, PT.ear.dur) * 0.3, earA = 0.12 + Math.sin(t * 0.9) * 0.04;
  earsSprite(earA, twitch).blit(c, hx, hy);
  headSprite().blit(c, hx, hy);
  const look = gaze(t, [[0, [0, 0.1]], [DROP0 + 0.1, [-0.85, 0.35]], [T_LEVEL + 0.35, [0, 0.1]], [EV.toe - 0.5, [0.45, 0.9]], [EV.leg + 0.15, [0, 0.1]]], 0.22);
  const flare = Math.max(0, br) * 0.6 + sm(t, T_TAP, T_TAP + 0.1) * (1 - sm(t, T_TAP + 0.3, T_TAP + 0.6)) * 1.2;
  const happy = Math.min(sm(t, T_LEVEL, T_LEVEL + 0.2), 1 - sm(t, EV.toe - 0.6, EV.toe - 0.3)) * 0.55;
  face(c, hx, hy, t, look, blinkAt(t, 3.4, 0.7), flare, happy);
  puff(c, hx + 22, R(V.Y(LAND)) - 2, t - T_TAP, 1);
}
const win2 = (t, every, dur) => { const p = ((t % every) + every) % every; return p < dur ? Math.sin((Math.PI * p) / dur) : 0; };
function shadowUnder(c, x, y) { c.tint(x - 92, y - 5, 184, 10, (X, Y) => { const d = ((X - x) / 90) ** 2 + ((Y - y) / 5) ** 2; return d >= 1 ? 0 : 0.42 * (1 - d); }, "#1E2A10", 3); }
function puff(c, x, y, u, s) {
  if (u < 0 || u > PT.puff) return; const a = 1 - sm(u, 0.25, PT.puff), g = fade(c, a);
  for (let i = 0; i < 9; i++) { const sd = i % 2 ? 1 : -1, d = (8 + i * 2.2) * ease(Math.min(1, u / 0.5)) * s, r = 2 + (i % 3); const px = R(x + sd * d), py = R(y - 2 - (i % 3) * 2 - u * 8); for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) if (X * X + Y * Y <= r * r && (X + Y + i) % 2 === 0) g.px(px + X, py + Y, Y < 0 ? "#F4E6C0" : "#D8C49A"); }
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // grass blades and flowers along the ground line, swaying (they overlap the hooves a little)
  const cols = ["#2E5A26", "#4A8436", "#6AA844", "#9CCC5E"], y0 = R(V.Y(LAND)) + 2;
  for (let i = 0; i < 70; i++) {
    const wx = X0 + 4 + i * 7.7 + rnd(i * 3) * 5; if (wx > X1 - 8) continue; const x = R(V.X(wx)); if (x < -12 || x > 552) continue;
    const sway = Math.sin(t * 1.7 + wx * 0.05) * 1.6, mud = wx > 3470;
    tuft(c, x, y0 + (i % 3), 6 + rnd(i * 5) * 7, 3 + (i % 3), mud ? ["#4A5A2A", "#6A7A3A", "#8A9A4A", "#B0B868"] : cols, i * 13, sway);
    if (i % 5 === 2 && !mud) flower(c, x + 3 + R(sway), y0 - 8 - (i % 4), 1, ["#FFFFFF", "#FFE45A", "#F4A0D0", "#B48AF0"][i % 4], "#F8D040");
  }
  // two butterflies over the meadow
  for (let i = 0; i < 2; i++) {
    const wx = 3080 + i * 300 + Math.sin(t * 0.7 + i * 2) * 40, wy = -110 + Math.sin(t * 1.3 + i) * 18 + i * 20;
    const x = R(V.X(wx)), y = R(V.Y(wy)), f = Math.abs(Math.sin(t * 14 + i * 3)), col = i ? "#FFE45A" : "#FFFFFF", dk = i ? "#E89A20" : "#C8C0E0";
    c.px(x, y, "#2A1A2A"); c.px(x, y + 1, "#2A1A2A");
    for (const sd of [-1, 1]) { const w = 1 + R(f * 2); for (let k = 1; k <= w; k++) { c.px(x + sd * k, y - 1, col); c.px(x + sd * k, y, col); } c.px(x + sd, y + 1, dk); }
  }
}

// ---------------------------------------------------------------- HUD: 500 KG pickup, balance label, toe magnifier
export function hud(c, V, t) {
  if (!onScreen(V)) return;
  const hx = V.X(HX), hy = V.Y(HEAD_Y), live = 1 - sm(t, PT.leave[0], PT.leave[1]);   // dissolve as the camera leaves
  if (live <= 0) return;
  pickup(c, R(hx), R(hy - 128), "500 KG", (t - PT.pickup.t0) / PT.pickup.dur);
  const la = sm(t, PT.tagBalance[0], PT.tagBalance[1]) * live;
  if (la > 0) tag(c, ["8 PEOPLE", "= 1 HORSE"], R(V.X(SAW_X)), R(V.Y(LAND)) - 150 + R((1 - la) * 6), la, C.Y, 2);
  // the toe magnifier grows out of the tapped hoof, then the ghost of the three-toed ancestor appears above it
  const k = ease(clamp01((t - T_LENS) / T_LENS_IN));
  if (k > 0) {
    const hoofX = hx + 22, hoofY = V.Y(LAND) - 9, fx = hx + 138, fy = V.Y(LAND) - 168, r = lerp(12, 56, k), cx = lerp(hoofX, fx, k), cy = lerp(hoofY, fy, k);
    lens(fade(c, live * sm(t, T_LENS, T_LENS + PT.lens.fade)), cx, cy, r, hoofX, hoofY, t);
    const lab = sm(t, PT.tagToe[0], PT.tagToe[1]) * live;
    if (lab > 0) tag(c, ["ONE TOE"], R(fx), R(fy + 62) + R((1 - lab) * 5), lab, C.Y, 2);
    const anc = sm(t, PT.ancestor[0], PT.ancestor[1]) * live;
    if (anc > 0) ancestor(c, R(fx + 40), R(fy - 140), t, anc);
  }
}

const XR = { bg: "#0E1636", bg2: "#16224A", flesh: "#22406E", flesh2: "#1E3A66", skin: "#5E8ED0", bone: "#D2E2F8", boneO: "#86A8DA", splint: "#4E70AA", hoof: "#14264C", hoofO: "#9AC0F0" };
function shape(g, pts, fill, out, shade) { g.poly(pts, fill, shade); if (out) for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), out); } }
function rim(c, cx, cy, r, a = 1, ghost = false) {
  const g = fade(c, a);
  for (let Y = R(cy - r - 1); Y <= R(cy + r + 1); Y++) for (let X = R(cx - r - 1); X <= R(cx + r + 1); X++) {
    const dd = Math.hypot(X + 0.5 - cx, Y + 0.5 - cy); if (dd > r + 1 || dd < r - 4) continue;
    const lit = Math.cos(Math.atan2(Y - cy, X - cx) + 2.3);
    g.px(X, Y, dd > r || dd < r - 3.4 ? "#2A1A08" : ghost ? (lit > 0.5 ? "#E0CDF8" : lit > -0.2 ? "#B08AE8" : "#6E4FB0") : lit > 0.6 ? "#FFF0A0" : lit > -0.2 ? "#E0B050" : "#A87428");
  }
  for (let i = 0; i < 9; i++) { const an = -2.4 + i * 0.07; g.px(R(cx + Math.cos(an) * (r - 8)), R(cy + Math.sin(an) * (r - 8)), "#BFD8FF"); }
}
function xrayBg(g, cx, cy, r, t) { for (let Y = R(cy - r); Y <= R(cy + r); Y++) for (let X = R(cx - r); X <= R(cx + r); X++) g.px(X, Y, ((Y + R(t * 18)) & 3) === 0 ? XR.bg2 : XR.bg); }
// X-ray magnifier, front view of the lower leg: one column of toe bones into one hoof (the toe bones glow on "toe")
function lens(c, cx, cy, r, hx, hy, t) {
  const d = Math.hypot(cx - hx, cy - hy), la = sm(d, r + 14, r + 44);
  if (la > 0) {   // callout: ring around the real hoof and two tangent lines to the lens (they fade in as the lens moves away)
    const ang = Math.atan2(cy - hy, cx - hx), off = Math.asin(Math.min(0.99, (r - 14) / d)), g = fade(c, la);
    for (const sd of [-1, 1]) { const a2 = ang + sd * (Math.PI / 2 + off); g.line(R(hx + Math.cos(a2) * 14), R(hy + Math.sin(a2) * 14), R(cx + Math.cos(a2) * r), R(cy + Math.sin(a2) * r), "#FDFEED", [3, 2]); }
    for (let a = 0; a < Math.PI * 2; a += 0.05) g.px(R(hx + Math.cos(a) * 14), R(hy + Math.sin(a) * 14), "#FDFEED");
  }
  const s = r / 56, g = clipped(c, cx, cy, r - 3.5), P = (x, y) => [cx + x * s, cy + y * s], Q = (pts) => smooth(pts, new Set(), 3).map(([x, y]) => P(x, y));
  xrayBg(g, cx, cy, r, t);
  const glow = sm(t, PT.glow[0], PT.glow[1]), pulse = 0.5 + 0.5 * Math.sin(t * 7);
  shape(g, smooth([[-15, -70], [15, -70], [15, -16], [19, -4], [17, 8], [13, 16], [-13, 16], [-17, 8], [-19, -4], [-15, -16]], new Set([0, 1]), 4).map(([x, y]) => P(x, y)), XR.flesh, XR.skin, (X, Y) => ((X + Y) & 1 ? XR.flesh : XR.flesh2));
  shape(g, [P(-16, 18), P(16, 18), P(26, 48), P(-26, 48)], XR.hoof, XR.hoofO);
  for (const y of [26, 34, 42]) { const hw = 16 + (y - 18) * 0.33; g.line(R(cx - (hw - 2) * s), R(cy + y * s), R(cx + (hw - 2) * s), R(cy + y * s), "#20386A"); }
  for (const sd of [-1, 1]) shape(g, Q([[sd * 9, -52], [sd * 12, -52], [sd * 11.5, -24], [sd * 10, -22]]), XR.splint, null);
  shape(g, Q([[-7, -74], [7, -74], [7, -16], [10, -9], [8, -3], [-8, -3], [-10, -9], [-7, -16]]), XR.bone, XR.boneO);
  if (glow > 0) { const hg = fade(g, glow * (0.4 + 0.25 * pulse)); for (let Y = R(cy - 6 * s); Y <= R(cy + 52 * s); Y++) for (let X = R(cx - 26 * s); X <= R(cx + 26 * s); X++) { const lx = (X - cx) / s, ly = (Y - cy) / s, dd = Math.hypot(lx / 22, (ly - 24) / 28); if (dd < 1 && ((X + Y) & 1) === 0) hg.px(X, Y, "#F4CA50"); } }
  const tc = mix(XR.bone, "#FFF4B0", glow), to = mix(XR.boneO, "#F4B030", glow);
  shape(g, Q([[-8, 0], [8, 0], [7, 15], [-7, 15]]), tc, to);
  shape(g, Q([[-8, 18], [8, 18], [8, 27], [-8, 27]]), tc, to);
  shape(g, Q([[-9, 30], [9, 30], [19, 42], [17, 46], [-17, 46], [-19, 42]]), tc, to);
  g.px(R(cx - 4 * s), R(cy - 60 * s), "#FFFFFF"); g.px(R(cx - 4 * s), R(cy - 59 * s), "#FFFFFF");
  rim(c, cx, cy, r);
}
// the ghost of the three-toed ancestor: the same X-ray, three toe columns and three small hooves
function ancestor(c, cx, cy, t, a) {
  const r = 36, s = r / 36, base = fade(c, a), g = clipped(base, cx, cy, r - 3.5), P = (x, y) => [cx + x * s, cy + y * s], Q = (pts) => smooth(pts, new Set(), 3).map(([x, y]) => P(x, y));
  xrayBg(g, cx, cy, r, t);
  shape(g, smooth([[-9, -44], [9, -44], [9, -10], [22, 6], [26, 20], [-26, 20], [-22, 6], [-9, -10]], new Set([0, 1]), 4).map(([x, y]) => P(x, y)), XR.flesh, XR.skin, (X, Y) => ((X + Y) & 1 ? XR.flesh : XR.flesh2));
  shape(g, Q([[-4.5, -46], [4.5, -46], [4.5, -10], [-4.5, -10]]), "#B8A6E8", "#7E6AC0");
  for (const sd of [-1, 0, 1]) {
    const x0 = sd * 4, x1 = sd * 17, w = sd ? 3 : 4.5, y1 = sd ? 13 : 16;
    shape(g, [P(x0 - w, -7), P(x0 + w, -7), P(x1 + w, y1), P(x1 - w, y1)], "#D8C8FF", "#9A84D8");
    shape(g, [P(x1 - w - 1, y1 + 1), P(x1 + w + 1, y1 + 1), P(x1 + w + 2, y1 + 7), P(x1 - w - 2, y1 + 7)], XR.hoof, "#B8A6E8");
  }
  rim(c, cx, cy, r, a, true);
  tag(c, ["ANCESTOR", "3 TOES"], cx, cy - r - 56, a, C.L, 2);
}
