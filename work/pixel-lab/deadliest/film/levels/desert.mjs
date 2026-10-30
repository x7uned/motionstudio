// LV5 · desert at golden hour turning to sunset (RANGE BIOME.desert = 2160..2700, tod ≈ 4.3). From the left: the
// swamp's wet mud drying into sand, a balanced sandstone hoodoo with the stone LV 5 sign, a far oasis (two palms and a
// glint of water) on the far dunes, golden mid dunes with sharp crests, the scorpion in the middle under the big sun,
// a far mesa and a big layered sandstone boulder on the right (the scorpion's hiding place). The sand plane runs to the
// bottom of the frame with wind ripples in perspective; at x 2700 it turns into the village's dirt road.
// Narration: "A scorpion is tiny. Still, its sting kills about three thousand people a year, mostly children."
// Events (desert-time.mjs): it scuttles out from behind the boulder ("scorpion"); a 5 CM ruler drops beside it and it
// looks up at it ("tiny"); the tail rises into the sun, pincers up, the stinger glints ("still, its sting"); three
// pincer clacks ("three thousand"); a sheepish face and a MOSTLY CHILDREN tag ("mostly children"). Pure functions of t.
import { BIOME, LAND } from "../timeline.mjs";
import { blob, sign, tag, C, MAIN, TINY, ease, sm, lerp, win, blinkAt, clamp01, smooth } from "../cute.mjs";
import { Layer, groundAt, shrub, pebble, sparkle, blinks, R, rnd, fade, mix, bayer } from "./desert-kit.mjs";
import { drawScorpion, scorpionIcon } from "./desert-scorpion.mjs";
import { T } from "./desert-time.mjs";
export { T as TIMING };

export const RANGE = BIOME.desert;
const [X0, X1] = RANGE;
export const SX = 2430, SY = LAND + 6;        // scorpion rest (ground point under its body): screen (270, 646) at rest
const START_X = 2790, SCALE = 1.25;            // starts off to the right, behind the boulder
const RULER_X = 2266, SIGN_X = 2598;

// ---------------------------------------------------------------- palettes (golden hour; light from the upper left)
const ROCK = ["#2E0E14", "#4E1A1E", "#742822", "#9A3C28", "#BC5630", "#D6743C", "#EA9850", "#F6BC70"];
const HAZE = { body: "#C47A92", lit: "#DC948E", rim: "#F4B89C", line: "#A8668A", far: "#D69496" };
const FARDUNE = { lit: "#ECAA8E", shade: "#D08C92", crest: "#F8C8A4" };
const MIDDUNE = { lit: "#F4B878", shade: "#D28A6A", crest: "#FFDCA0", deep: "#BE7466" };
const PEB = ["#4A2418", "#7A3E26", "#A85C34", "#C87C48", "#E0A066"];
const PALM = { trunk: "#6A4A48", trunkLit: "#8E6A5C", frond: "#4E6A4A", frondLit: "#7E9A5A", dark: "#344A3A" };

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
const inPoly = (p, x, y) => { let k = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k; } return k; };
/** Asymmetric dune profile: gentle windward slope on the left, steep slip face on the right. */
const dune = (x, [c, h, wl, wr]) => { const u = x < c ? (c - x) / wl : (x - c) / wr; return u >= 1 ? 0 : h * (x < c ? 0.5 + 0.5 * Math.cos(Math.PI * u) : 1 - u * u * (0.2 + 0.8 * u)); };
const edgeK = (x) => sm(x, X0, X0 + 46) * (1 - sm(x, X1 - 56, X1));
const FAR_DUNES = [[2196, 40, 60, 40], [2296, 50, 90, 48], [2398, 32, 70, 40], [2468, 38, 64, 44], [2556, 30, 60, 40], [2640, 44, 80, 50]];
const MID_DUNES = [[2232, 26, 64, 28], [2352, 16, 58, 22], [2508, 22, 70, 26], [2622, 30, 66, 30]];

function build() {
  BACK = new Layer(X0 - 40, -420, X1 + 40, 440); FRONT = new Layer(X0 - 40, -260, X1 + 40, 440);
  const g = BACK.g, f = FRONT.g;
  // far mesa (right) and a small far butte (left): rose haze silhouettes with a lit left face and a caprock rim
  const mesa = [[2552, LAND - 22], [2572, LAND - 112], [2584, LAND - 150], [2596, LAND - 168], [2664, LAND - 170], [2676, LAND - 150], [2684, LAND - 104], [2698, LAND - 22]];
  const butte = [[2172, LAND - 18], [2180, LAND - 64], [2186, LAND - 78], [2214, LAND - 80], [2220, LAND - 62], [2228, LAND - 18]];
  for (const [poly, seed] of [[mesa, 1], [butte, 2]]) {
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!inPoly(poly, x + 0.5, y + 0.5)) continue;
      const topD = y - y0, leftD = (() => { let d = 0; while (d < 14 && inPoly(poly, x - d + 0.5, y + 0.5)) d++; return d; })();
      let col = HAZE.body;
      if (leftD < 10 && (leftD < 6 || bayer(x, y) > 0.5)) col = HAZE.lit;
      if (topD < 3) col = HAZE.rim; else if (topD < 6 && bayer(x, y) > 0.5) col = HAZE.rim;
      if (topD > 12 && (y + Math.round(Math.sin(x * 0.08 + seed) * 1.5)) % 13 === 0) col = HAZE.line;
      if (!inPoly(poly, x + 0.5, y - 0.5) || !inPoly(poly, x - 0.5, y + 0.5) || !inPoly(poly, x + 1.5, y + 0.5)) col = topD < 4 ? HAZE.rim : mix(HAZE.body, HAZE.line, 0.6);
      g.px(x, y, col);
    }
  }
  // far dunes (soft, hazy) then the oasis on their crest, then golden mid dunes with sharp crests
  const farH = (x) => Math.max(...FAR_DUNES.map((d) => dune(x, d))) * edgeK(x);
  for (let x = X0; x < X1; x++) {
    const h = farH(x), top = R(LAND - 6 - h), dom = FAR_DUNES.reduce((b, d) => (dune(x, d) > dune(x, b) ? d : b), FAR_DUNES[0]), lit = x < dom[0];
    for (let y = top; y < LAND; y++) { const k = y - top; let col = lit ? FARDUNE.lit : FARDUNE.shade; if (k < 1 && h > 3) col = lit ? FARDUNE.crest : mix(FARDUNE.shade, FARDUNE.crest, 0.4); else if (k > 10 && bayer(x, y) < 0.25) col = mix(col, HAZE.far, 0.5); g.px(x, y, col); }
  }
  oasis(g);
  const midH = (x) => Math.max(...MID_DUNES.map((d) => dune(x, d))) * edgeK(x);
  for (let x = X0; x < X1; x++) {
    const h = midH(x); if (h < 1) continue;
    const top = R(LAND - h), dom = MID_DUNES.reduce((b, d) => (dune(x, d) > dune(x, b) ? d : b), MID_DUNES[0]), lit = x < dom[0];
    for (let y = top; y < LAND; y++) {
      const k = y - top, ph = (y - top) / Math.max(4, h); let col = lit ? MIDDUNE.lit : MIDDUNE.shade;
      if (k < 1) col = lit ? MIDDUNE.crest : mix(MIDDUNE.shade, MIDDUNE.crest, 0.35);
      else if (!lit && Math.abs(x - dom[0]) < 3 && k < 4) col = MIDDUNE.deep;
      else if (lit && ((x * 0.6 + y * 3) % 11) < 1 && ph > 0.2) col = mix(col, "#C47A54", 0.35);
      g.px(x, y, col);
    }
  }
  // the sand plane (only inside the range: the swamp and the village own their ground), shrubs and pebbles on it
  for (let x = X0; x < X1; x++) for (let y = LAND; y < 440; y++) g.px(x, y, groundAt(x, y, y - LAND));
  for (let x = X0; x < X1; x++) { const d = 0; if (rnd(x * 3) < 0.5) g.px(x, LAND, mix(groundAt(x, LAND, 0), "#FFF0C0", 0.35)); }
  hoodoo(g);
  shrub(g, 2234, LAND + 3, 16, 12, 11); shrub(g, 2522, LAND + 2, 12, 9, 21); shrub(g, 2386, LAND - 9, 7, 6, 31, ["#8A5A44", "#B07A56", "#D49A6A"]);
  for (const [x, y, rx, ry] of [[2208, 6, 4, 3], [2330, 16, 3, 2], [2470, 10, 5, 3], [2582, 30, 6, 4], [2290, 60, 7, 4], [2190, 120, 9, 5], [2400, 170, 6, 4], [2648, 140, 10, 6]]) pebble(g, x, LAND + y, rx, ry, PEB);
  // FRONT: the big sandstone boulder (the scorpion hides behind it), a shrub at its foot, foreground stones and shrubs
  boulder(g, f);
  shrub(f, 2540, LAND + 9, 18, 15, 41); shrub(f, 2190, LAND + 300, 34, 28, 51); shrub(f, 2662, LAND + 296, 26, 22, 61);
  for (const [x, y, rx, ry] of [[2214, 292, 18, 9], [2246, 298, 9, 5], [2604, 300, 14, 7], [2440, 302, 6, 3]]) pebble(f, x, LAND + y, rx, ry, PEB);
}

function oasis(g) {
  // two small palms and a sliver of water at the foot of the far dune (left of the scorpion), a few green tufts
  const by = LAND - 10;
  for (let x = 2250; x < 2294; x++) { const k = Math.abs(x - 2272) / 22; if (k > 1) continue; const yy = by + 1, w = R(2 * (1 - k * k)); for (let j = 0; j <= w; j++) g.px(x, yy + j, j === 0 ? "#FFE6C8" : j === 1 ? "#E8B4B8" : "#C69AB0"); }
  for (const [x, h, lean, seed] of [[2262, 30, -6, 1], [2280, 38, 7, 2]]) {
    for (let j = 0; j <= h; j++) { const k = j / h, px = R(x + lean * k * k); g.px(px, by - j, j % 4 === 0 ? PALM.trunk : PALM.trunkLit); g.px(px + 1, by - j, PALM.trunk); }
    const tx = x + lean, ty = by - h;
    for (let i = 0; i < 7; i++) {
      const ang = -Math.PI / 2 + (i - 3) * 0.55 + (rnd(seed * 9 + i) - 0.5) * 0.2, len = 13 + rnd(seed + i) * 6;
      for (let s = 0; s <= len; s++) { const u = s / len, px = tx + Math.cos(ang) * s, py = ty + Math.sin(ang) * s + u * u * 9; g.px(R(px), R(py), u < 0.5 ? PALM.frondLit : PALM.frond); if (s % 2 === 0 && u > 0.2) g.px(R(px), R(py) + 1, PALM.dark); }
    }
    g.rect(R(tx) - 1, R(ty) - 1, 3, 3, PALM.dark); g.px(R(tx), R(ty) - 1, PALM.frondLit);
  }
  for (const x of [2254, 2268, 2286, 2296]) for (let k = 0; k < 4; k++) g.px(x + k - 2, by - (k === 1 || k === 2 ? 3 : 2), k % 2 ? PALM.frondLit : PALM.frond);
}

function hoodoo(g) {
  // a balanced rock at the far left: a wide rounded base, a thick waisted column and a round cap stone, banded strata
  const base = smooth([[2166, LAND + 2], [2164, LAND - 20], [2176, LAND - 38], [2202, LAND - 44], [2228, LAND - 34], [2238, LAND - 12], [2240, LAND + 2]], new Set([0, 6]), 5);
  const col = smooth([[2182, LAND - 30], [2178, LAND - 70], [2184, LAND - 100], [2200, LAND - 108], [2214, LAND - 94], [2216, LAND - 62], [2212, LAND - 30]], new Set(), 5);
  const cap = smooth([[2172, LAND - 116], [2178, LAND - 136], [2200, LAND - 146], [2222, LAND - 140], [2230, LAND - 120], [2218, LAND - 102], [2186, LAND - 102]], new Set(), 5);
  for (const [p, sd] of [[col, 1], [base, 2], [cap, 3]]) {
    blob(g, [p], { ramp: ROCK, thick: 10, base: 4.6, gain: 0.9, slope: 2.2, rimLit: 0.7, rimShade: 1.3, outline: "#2A0C10", litOutline: "#FFC88A", light: [-0.7, -0.6] });
    strata(g, p, 8, sd);
  }
  shrub(g, 2246, LAND + 2, 12, 10, 71);
}
function strata(g, poly, step, seed = 0) {
  const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
  for (let y = R(Math.min(...ys)) + 3; y < Math.max(...ys) - 1; y++) for (let x = R(Math.min(...xs)) + 1; x < Math.max(...xs); x++) {
    if (!inPoly(poly, x + 0.5, y + 0.5) || !inPoly(poly, x - 1.5, y + 0.5) || !inPoly(poly, x + 2.5, y + 0.5)) continue;
    const v = (y + Math.sin(x * 0.07 + seed) * 2 + Math.sin(x * 0.19) * 0.8) / step, f = v - Math.floor(v);
    const th = 0.08 + 0.08 * (0.5 + 0.5 * Math.sin(x * 0.05 + Math.floor(v) * 2.1 + seed));
    if (f < th) g.px(x, y, mix(g.get(x, y), "#4A1420", 0.28)); else if (f < th + 0.1 && bayer(x, y) > 0.5) g.px(x, y, mix(g.get(x, y), "#FFD08A", 0.16));
  }
}
function boulder(g, f) {
  // a cluster of rounded sandstone rocks on the right (front layer): a big one behind, a small one at its foot
  const B1 = smooth([[2596, LAND + 12], [2584, LAND - 22], [2576, LAND - 62], [2588, LAND - 100], [2610, LAND - 124], [2642, LAND - 138], [2676, LAND - 132], [2694, LAND - 110], [2701, LAND - 70], [2701, LAND + 12]], new Set([0, 9]), 6);
  blob(f, [B1], { ramp: ROCK, thick: 18, base: 4.6, gain: 1.0, slope: 2.4, rimLit: 0.8, rimShade: 1.3, outline: "#2A0C10", litOutline: "#FFC88A", light: [-0.7, -0.6] });
  strata(f, B1, 10, 3);
  const B2 = smooth([[2572, LAND + 14], [2570, LAND - 8], [2582, LAND - 30], [2606, LAND - 38], [2628, LAND - 28], [2636, LAND - 4], [2632, LAND + 14]], new Set([0, 6]), 5);
  blob(f, [B2], { ramp: ROCK, thick: 10, base: 4.4, gain: 0.9, slope: 2.0, rimLit: 0.8, rimShade: 1.2, outline: "#2A0C10", litOutline: "#FFC88A", light: [-0.7, -0.6] });
  strata(f, B2, 7, 5);
  // cracks
  for (const [x0, y0, len, dir] of [[2632, LAND - 120, 16, 1], [2684, LAND - 92, 20, -1], [2652, LAND - 40, 12, 1]]) for (let k = 0; k < len; k++) f.px(x0 + R(Math.sin(k * 0.7) * 1.5) + (k >> 2) * dir, y0 + k, "#4A1418");
  // contact shadow on the sand in front of the rocks
  for (let x = 2566; x < 2710; x++) for (let y = LAND + 8; y < LAND + 18; y++) if (x < X1 && bayer(x, y) < 0.55 * (1 - (y - LAND - 8) / 10)) f.px(x, y, mix(groundAt(x, y, y - LAND), "#5A2A2A", 0.35));
}

// ---------------------------------------------------------------- the scorpion's pose over time
const k01 = (t, [a, b]) => ease(clamp01((t - a) / (b - a)));
export function pose(t) {
  const em = k01(t, T.emerge), x = lerp(START_X, SX, em), walking = t > T.emerge[0] && t < T.emerge[1] + 0.1 ? Math.min(1, sm(t, T.emerge[0], T.emerge[0] + 0.08)) * (1 - sm(t, T.emerge[1] - 0.18, T.emerge[1] + 0.05)) : 0;
  const up = k01(t, T.lookUp) * (1 - k01(t, T.lookBack)), sheep = k01(t, T.sheepish);
  const look = [lerp(lerp(walking * -0.6, -0.9, up), 0.85, sheep), lerp(-0.95 * up, 0.55, sheep)];
  const raise = lerp(lerp(lerp(0, 1, k01(t, T.raise)), 0.55, k01(t, T.relax)), 0.22, sheep);
  const arms = lerp(lerp(0, 1, k01(t, T.arms)), 0.15, k01(t, T.relax)) * (1 - sheep * 0.6);
  let open = lerp(0.35, 0.85, k01(t, T.arms)) * (1 - 0.5 * k01(t, T.relax)), bob = 0;
  for (const c0 of T.clacks) {
    const cl = t < c0 ? 0 : t < c0 + T.clackClose ? (t - c0) / T.clackClose : t < c0 + T.clackClose + T.clackOpen ? 1 - (t - c0 - T.clackClose) / T.clackOpen : 0;
    open *= 1 - ease(cl); bob -= 2 * Math.sin(Math.PI * clamp01((t - c0) / (T.clackClose + T.clackOpen)));
  }
  // little settle bounce when it stops, and a startled hop when the ruler lands
  bob -= 3 * Math.sin(Math.PI * clamp01((t - T.emerge[1] + 0.12) / 0.3)) * (t > T.emerge[1] - 0.12 ? 1 : 0);
  bob -= 5 * Math.sin(Math.PI * clamp01((t - T.ruler.land) / 0.28));
  const brows = clamp01(k01(t, [T.raise[0] + 0.05, T.raise[0] + 0.3]) - k01(t, T.relax) * 0.6) * (1 - sheep) - sheep;
  const grin = clamp01(k01(t, [T.raise[0] + 0.1, T.raise[0] + 0.35]) * (1 - k01(t, T.relax))) * (1 - sheep);
  const blink = blinks(t, T.blinks);
  return { x, walk: walking, phase: t * 3.6, look, raise, arms, open, bob, brows, grin, blink, sway: Math.sin(t * 1.9) * 3 + Math.sin(t * 0.7) * 2, sheep };
}

// ---------------------------------------------------------------- module interface
const off = (V) => X1 + 60 < V.x0 || X0 - 60 > V.x1;
export function back(c, V, t) { if (off(V)) return; if (!BACK) build(); BACK.blit(c, V); }

export function actors(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  const p = pose(t), sx = R(V.X(p.x)), sy = R(V.Y(SY));
  if (sx > -160 && sx < 700) {
    trail(c, V, t, p.x);
    const r = drawScorpion(c, sx, sy, t, { ...p, s: SCALE });
    // "its sting": a glint runs along the hook and a sparkle pops at the tip
    const gk = (t - T.glint[0]) / (T.glint[1] - T.glint[0]);
    if (r && gk > 0 && gk < 1) { const s = 9 * Math.sin(Math.PI * gk); sparkle(c, r.tip[0], r.tip[1], s, "#FFE9A0", 1, "#FFFFFF"); sparkle(c, r.bulb[0] - 6, r.bulb[1] - 5, s * 0.45, "#FFF4C8", 1); }
    // sheepish: a little sweat drop by its head
    if (p.sheep > 0.02) { const g = fade(c, p.sheep * (1 - sm(t, T.tag[2], T.tag[3]))), dx = sx + 64, dy = sy - 132 + R(Math.sin(t * 3) * 1); g.rect(dx, dy, 3, 2, "#BFE6FF"); g.rect(dx - 1, dy + 2, 5, 3, "#7FC8F0"); g.rect(dx, dy + 5, 3, 1, "#4A9AD0"); g.px(dx, dy + 2, "#FFFFFF"); g.px(dx + 1, dy - 1, "#BFE6FF"); }
  }
  ruler(c, V, t);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build(); FRONT.blit(c, V);
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND + 8)), "LV 5", "stone");
  // drifting sand grains in the low wind (ambient, silent)
  for (let i = 0; i < 26; i++) {
    const sp = 30 + rnd(i * 7) * 50, wx = X0 + ((((rnd(i * 3) * 900 - t * sp) % 600) + 600) % 600) - 30, wy = LAND + 8 + rnd(i * 11) * 380;
    if (wx < X0 || wx > X1) continue; const x = R(V.X(wx)), y = R(V.Y(wy + Math.sin(t * 2 + i) * 3));
    if (x < 0 || x >= 540 || y < 0 || y >= 960) continue; c.px(x, y, i % 3 ? "#FFF0C8" : "#F8D49A"); if (wy - LAND > 150) c.px(x + 1, y, "#FFE6B0");
  }
}
export function hud(c, V, t) {
  if (off(V)) return;
  // "mostly children": a small in-world tag beside the scorpion (anchored to the world, so it pans away with it)
  const a = Math.min(sm(t, T.tag[0], T.tag[1]), 1 - sm(t, T.tag[2], T.tag[3]));
  if (a > 0) tag(c, ["MOSTLY", "CHILDREN"], R(V.X(2310)), R(V.Y(LAND - 190)) + R((1 - a) * 6), a, C.Y, 2);
  // "tiny": the ruler's 5 CM label
  const la = Math.min(sm(t, T.label[0], T.label[1]), 1 - sm(t, T.ruler.out[0], T.ruler.out[1]));
  if (la > 0) {
    const g = fade(c, la), txt = "5 CM", s = 3, w = c.measure(MAIN, txt, { scale: s }), x = R(V.X(RULER_X) - w / 2), y = R(V.Y(LAND - 186)) - R(ease(la) * 4);
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, txt, x + dx, y + dy, C.O, { scale: s });
    g.text(MAIN, txt, x, y, C.Y, { scale: s });
  }
}

// ---------------------------------------------------------------- tiny footprints it leaves in the sand while scuttling
function trail(c, V, t, x) {
  const a = 1 - sm(t, T.emerge[1] + 2.5, T.emerge[1] + 4.5); if (a <= 0 || t < T.emerge[0]) return;
  const g = fade(c, a * 0.9);
  for (let wx = R(x) + 20; wx < START_X - 60; wx += 7) for (const [dy, off] of [[2, 0], [5, 3]]) {
    const px = R(V.X(wx + off)), py = R(V.Y(SY + dy)); if (px < 0 || px >= 540) continue;
    g.px(px, py, "#B8784C"); g.px(px + 1, py, "#C88A58");
  }
}

// ---------------------------------------------------------------- the 5 CM ruler ("tiny")
const RH = 166, RW = 24;   // ruler height (0..5 cm at 30 px per cm + ends) and width
function ruler(c, V, t) {
  const R0 = T.ruler; if (t < R0.drop || t > R0.out[1]) return;
  const a = Math.min(sm(t, R0.drop, R0.drop + 0.06), 1 - sm(t, R0.out[0], R0.out[1]));
  const fall = clamp01((t - R0.drop) / (R0.land - R0.drop)), drop = (1 - fall * fall) * 720;   // starts above the frame
  const sink = t > R0.land ? 7 * Math.exp(-(t - R0.land) * 9) * Math.cos((t - R0.land) * 22) : 0;
  const wob = t > R0.land ? 5 * Math.exp(-(t - R0.land) * 6) * Math.sin((t - R0.land) * 26) : 0;
  const gx = R(V.X(RULER_X)), gy = R(V.Y(LAND + 4)), bottom = gy + 10 + R(sink) - R(drop);
  const g = fade(c, a), top = bottom - RH;
  for (let y = top; y <= bottom; y++) {
    if (y > gy + 2) continue;                                   // stuck in the sand: the buried end is hidden
    const k = (bottom - y) / RH, sh = R(wob * k), x0 = gx - RW / 2 + sh;
    for (let x = 0; x < RW; x++) {
      let col = x === 0 || x === RW - 1 || y === top ? "#2E1A08" : x === 1 ? "#FFEFB0" : x >= RW - 3 ? "#D09A2A" : "#F8D04A";
      if (y === top + 1 && x > 0 && x < RW - 1) col = "#FFE8A0";
      g.px(x0 + x, y, col);
    }
    // ticks: a long one every centimetre (30 px above the 0 mark at the sand line), mid at half, short every 6 px
    const mm = gy - 2 - y; if (mm < 0 || mm > 152) continue;
    const L = mm % 30 === 0 ? 9 : mm % 15 === 0 ? 6 : mm % 6 === 0 ? 3 : 0;
    for (let i = 0; i < L; i++) g.px(x0 + RW - 2 - i, y, "#4A2C0E");
    if (mm % 30 === 0 && mm > 0) g.text(TINY, String(mm / 30), x0 + 3, y - 4, "#5A3410", { scale: 2 });
  }
  // a puff of sand where it lands
  const pk = (t - R0.land) / 0.45;
  if (pk > 0 && pk < 1) for (let i = 0; i < 12; i++) { const dir = i % 2 ? 1 : -1, d = (8 + rnd(i * 5) * 16) * ease(pk), h = Math.sin(Math.PI * pk) * (5 + rnd(i) * 8); fade(c, (1 - pk) * a).px(R(gx + dir * (RW / 2 + d)), R(gy + 2 - h + rnd(i * 3) * 4), i % 3 ? "#FFE6B0" : "#E8B070"); }
}

/** Readout / guess-card portrait (~56×56): the scorpion's head with pincers and the curled tail. */
export function ICON(c, cx, cy, a = 1) { scorpionIcon(c, cx, cy, a); }
