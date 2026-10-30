// LV9 · chimp — the jungle at dusk (RANGE BIOME.jungle = 3780..4320). Big trees, a canopy with a gap around the red
// setting sun, vines, huge leaves, ferns and fireflies; a termite mound on the right. A young chimp sits facing the
// camera: it fishes termites out of the mound with a stick and grins ("can even beat us"). Then a touchscreen on a crate:
// numbers 1–9 flash, turn into white squares and the chimp taps them in order (Ayumu); "+MEMORY". Our hero, a college
// student with books, watches, gets confused ("?") and his attempt gets a red X. The jungle ends in bushes at the
// city's sidewalk. Pure functions of t.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, flat, ell, tube, bez, eye, blush, smile, shadow, sign, pickup, tag, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { drawHero } from "../hero.mjs";
import { worldLayer, spriteCache, xf, thick, gaze } from "./bay-kit.mjs";

export const RANGE = BIOME.jungle;
const R = Math.round, [X0, X1] = RANGE, CX = 4050;                       // chimp centre
const HERO_X = 3830, CRATE_X = 3921, MOUND_X = 4186, TREE_R = 4272;

// ---------------------------------------------------------------- palette (dusk: deep greens drifting to teal/purple in shadow, pink rim light)
const FOL = ["#0A1420", "#10202A", "#163030", "#1C4234", "#26583A", "#347040", "#4A8A48", "#6CA654"];
const FOL_FAR = ["#1C1636", "#221C42", "#2A224E", "#32295A", "#3C3266", "#463C72", "#52487E", "#60568A"];
const BARK = ["#160E14", "#24161C", "#342026", "#462C30", "#5A3A3A", "#6E4A44", "#86604E", "#A07A5E"];
const CLAY = ["#2A120C", "#4A2216", "#6C3420", "#8E4A2C", "#AE6238", "#C67C48", "#DA9A5E", "#EAB87A"];
const FUR = RAMP.brown, SKIN = RAMP.skin, RIM = "#FF8A7A";

// ---------------------------------------------------------------- static scenery
const TOP = -760, LH = 1760;
function leaf(g, x, y, len, wid, ang, ramp, vein = true) {
  // a big pointed leaf: lens shape along `ang`, lighter upper half, midrib and side veins
  const ca = Math.cos(ang), sa = Math.sin(ang), pts = [];
  for (let i = 0; i <= 16; i++) { const u = i / 16; pts.push([u * len, Math.sin(Math.PI * Math.pow(u, 0.8)) * wid]); }
  for (let i = 16; i >= 0; i--) { const u = i / 16; pts.push([u * len, -Math.sin(Math.PI * Math.pow(u, 0.8)) * wid]); }
  const P = pts.map(([u, v]) => [x + u * ca - v * sa, y + u * sa + v * ca]);
  blob(g, [P], { ramp, thick: Math.max(3, wid * 0.6), base: 3.2, gain: 1.8, outline: ramp[0], litOutline: ramp[5] });
  if (vein) { for (let u = 2; u < len - 2; u++) g.px(R(x + u * ca), R(y + u * sa), ramp[2]); for (let k = 1; k < 5; k++) { const u0 = (k / 5) * len; for (let j = 1; j < wid * 0.7; j++) for (const sd of [-1, 1]) g.px(R(x + (u0 + j * 0.6) * ca - sd * j * sa), R(y + (u0 + j * 0.6) * sa + sd * j * ca), ramp[3]); } }
}
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far jungle: hazy purple tree trunks with round crowns, low around the sun, an undergrowth wall at the bottom
  for (let i = 0; i < 11; i++) {
    const wx = X0 + 14 + i * 48 + rnd(i * 3) * 18, e = Math.min(1, Math.abs(wx - CX) / 220), h = 150 + e * 260 + rnd(i * 7) * 50, w = 6 + rnd(i * 5) * 8;
    for (let wy = R(LAND - h); wy < LAND; wy++) for (let x = -w / 2; x <= w / 2; x++) px(R(wx + x), wy, x < -w / 4 ? FOL_FAR[3] : FOL_FAR[2]);
    for (let k = 0; k < 4; k++) { const cx = wx + (rnd(i * 11 + k) - 0.5) * 50, cy = LAND - h - rnd(i * 13 + k) * 30 + 10, r = 18 + rnd(i * 17 + k) * 16; blob(g, [ell(L(cx), T(cy), r * 1.3, r)], { ramp: FOL_FAR, thick: 10, base: 3.4, gain: 1.4, outline: FOL_FAR[1], litOutline: "#9A5A8A" }); }
  }
  for (let wx = X0 - 20; wx < X1 + 4; wx++) { const edge = Math.min(1, (wx - X0 + 20) / 50, (X1 + 4 - wx) / 50), top = LAND - (70 + Math.sin(wx * 0.06) * 12 + Math.sin(wx * 0.17) * 6) * Math.sqrt(Math.max(0, edge)); for (let wy = R(top); wy < LAND; wy++) { const v = (wy - top) / (LAND - top); px(wx, wy, FOL_FAR[Math.max(0, R(3 - v * 2.6 + (bayer(wx, wy) - 0.5)))]); } }
  // mid bushes and banana leaves behind the actors
  for (const [wx, wy, len, wid, ang] of [[3800, -150, 70, 16, -1.2], [3790, -110, 80, 18, -0.5], [3846, -130, 64, 14, -1.9], [4222, -160, 70, 16, -1.3], [4238, -120, 84, 18, -2.6], [4196, -230, 60, 14, -1.7], [3870, -70, 56, 13, -0.4]]) leaf(g, L(wx), T(wy), len, wid, ang, FOL);
  for (let i = 0; i < 18; i++) { const wx = X0 + 8 + i * 30 + rnd(i * 7) * 12; if (Math.abs(wx - CX) < 90) continue; const r = 14 + rnd(i * 3) * 14; blob(g, [ell(L(wx), T(LAND - r * 0.6), r * 1.4, r)], { ramp: FOL, thick: 9, base: 3.0, gain: 1.6, litOutline: "#6A6A5A" }); }
  // big trees: left (the jungle's entrance from the savanna) and right (the LV 9 sign is nailed to it)
  for (const [wx, w] of [[3796, 46], [TREE_R, 42]]) {
    for (let wy = TOP + 40; wy < LAND + 2; wy++) {
      const flare = wy > LAND - 50 ? ((wy - (LAND - 50)) / 50) ** 2 * 26 : 0, half = w / 2 + flare;
      for (let x = -half; x <= half; x++) { const u = x / half, k = 3.4 - u * 1.6 + (Math.sin(wy * 0.21 + x * 0.6) > 0.82 ? -1 : 0) + (Math.abs(u) > 0.92 ? -1.4 : 0); px(R(wx + x), wy, BARK[Math.max(0, Math.min(7, R(k + bayer(R(wx + x), wy) - 0.5)))]); }
      if (wy % 37 === 0) for (let x = -w / 3; x < w / 3; x++) px(R(wx + x), wy, BARK[1]);
    }
    for (const sd of [-1, 1]) for (let k = 0; k < 40; k++) { const u = k / 40; px(R(wx + sd * (w / 2 + u * 30)), R(LAND - 40 + u * 40 - Math.sin(u * 3) * 6), BARK[2]); }
  }
  // canopy: dark foliage mass along the top, many big leaves on its lower edge, a gap over the sun
  for (let i = 0; i < 30; i++) {
    const wx = X0 - 16 + i * 19 + rnd(i * 7) * 8, e = Math.min(1, Math.abs(wx - CX) / 230), edge = Math.min(1, (wx - X0 + 24) / 60, (X1 + 10 - wx) / 60); if (edge <= 0.1) continue; const wy = -600 - rnd(i * 3) * 40 + e * e * 80 - (1 - edge) * 40, r = (30 + rnd(i * 5) * 18) * (0.5 + 0.5 * edge);
    blob(g, [ell(L(wx), T(wy), r * 1.3, r)], { ramp: FOL, thick: 16, base: 1.6, gain: 1.6, outline: FOL[0], litOutline: FOL[3] });
  }
  for (let i = 0; i < 70; i++) {
    const wx = X0 - 4 + rnd(i * 13 + 1) * (X1 - X0 + 4), e = Math.min(1, Math.abs(wx - CX) / 230), base = -570 + e * e * 110, wy = base + (rnd(i * 5) - 0.3) * 50;
    const ang = Math.PI / 2 + (rnd(i * 9) - 0.5) * 2.2, len = 30 + rnd(i * 3) * 34, wid = 8 + rnd(i * 7) * 7;
    leaf(g, L(wx), T(wy), len, wid, ang, rnd(i * 11) < 0.5 ? FOL : FOL.map((c0) => "#" + mix(c0, "#3A2A5A", 0.25).map((n) => n.toString(16).padStart(2, "0")).join("")), rnd(i) < 0.7);
  }
  for (let i = 0; i < 14; i++) { const wx = X0 + 10 + rnd(i * 13) * (X1 - X0 - 20), e = Math.min(1, Math.abs(wx - CX) / 230); if (e < 0.6) continue; leaf(g, L(wx), T(-440 + e * e * 120 - rnd(i) * 40), 44 + rnd(i * 3) * 30, 10 + rnd(i * 5) * 5, 1.3 + (rnd(i * 9) - 0.5) * 1.2, FOL); }
  // jungle floor: leaf litter on top, dark rich soil strata below (blending into the savanna's red earth on the left
  // and into the city's dark rock on the right)
  for (let wx = X0 - 30; wx < X1 + 10; wx++) {
    for (let wy = LAND; wy < TOP + LH; wy++) {
      const d = wy - LAND, b = bayer(wx, wy); let col;
      if (d < 3) col = rnd(wx * 3 + wy) < 0.3 ? "#8A5A3A" : d < 1 ? "#5A6A3A" : "#3E4A2A";
      else { const wv = Math.sin(wx * 0.03) * 6 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band;
        col = ["#4A2E2A", "#3E2624", "#543632", "#3A2422", "#48302A"][band % 5]; if (f < 0.09 && b > 0.35) col = mix(col, "#1A0E0E", 0.35);
        const sav = clamp01((X0 + 40 - wx) / 70); if (sav > 0) col = mix(col, ["#B4602E", "#A65428", "#BE6E3A", "#9A4C26", "#AE5C2E", "#C47640"][band % 6], sav * 0.8);
        const city = clamp01((wx - (X1 - 60)) / 60); if (city > 0) col = mix(col, wy < 40 ? "#342C5C" : "#1E1838", city * 0.85);
        if (wy > 120) col = mix(col, "#140C10", Math.min(0.5, (wy - 120) / 600));
        if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#C0A080", 0.4); }
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 24; i++) { let x = X0 + 6 + rnd(i * 3) * 530, y = LAND + 4; for (let k = 0; k < 14 + rnd(i) * 30; k++) { px(R(x), R(y), "#2A1810"); px(R(x) + 1, R(y), "#3A2418"); x += (rnd(i * 50 + k) - 0.5) * 2.4; y += 1; } }
  // termite mound: cathedral clay tower with spires and tunnels
  const mx = L(MOUND_X), my = T(LAND);
  blob(g, [smooth([[mx - 52, my + 2], [mx - 44, my - 40], [mx - 34, my - 92], [mx - 22, my - 128], [mx - 14, my - 150], [mx - 6, my - 132], [mx + 2, my - 168], [mx + 10, my - 140], [mx + 22, my - 110], [mx + 32, my - 120], [mx + 38, my - 88], [mx + 46, my - 40], [mx + 54, my + 2]], new Set([0, 12]), 5)], { ramp: CLAY, thick: 22, base: 3.0, gain: 2.2, litOutline: RIM });
  for (const [dx, dy, rx, ry] of [[-14, -38, 6, 5], [12, -62, 5, 4], [-4, -96, 4, 4], [20, -24, 4, 3], [-26, -14, 4, 3]]) { for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) if ((i / rx) ** 2 + (j / ry) ** 2 <= 1) g.px(mx + dx + i, my + dy + j, j < 0 ? CLAY[0] : CLAY[1]); g.px(mx + dx - rx, my + dy + ry, CLAY[5]); }
  for (let i = 0; i < 40; i++) { const x = mx - 40 + rnd(i * 3) * 80, y = my - rnd(i * 7) * 140; g.px(R(x), R(y), CLAY[2]); }
  // tunnels and chambers under the termite mound, thick tree roots in the soil
  for (const [pts, r] of TUNNELS) { const sp = bez(...pts, 14).map(([x, y]) => [L(x), T(y)]); thick(g, sp, r + 2, "#6A4436"); thick(g, sp, r + 1, "#2A1612"); thick(g, sp, r, "#160A08"); }
  for (const [x, y, rx, ry] of [[MOUND_X - 20, 74, 16, 9], [MOUND_X + 22, 120, 14, 8], [MOUND_X - 6, 170, 18, 10]]) { for (let j = -ry - 2; j <= ry + 2; j++) for (let i = -rx - 2; i <= rx + 2; i++) { const d = (i / rx) ** 2 + (j / ry) ** 2; if (d <= 1) px(x + i, y + j, j > ry * 0.5 ? "#2A1612" : "#160A08"); else if ((i / (rx + 2)) ** 2 + (j / (ry + 2)) ** 2 <= 1) px(x + i, y + j, "#6A4436"); } for (let k = -4; k <= 4; k++) { px(x + k * 2, y + ry - 1, "#F4E6C8"); px(x + k * 2 + 1, y + ry - 2, "#E8D0A8"); } }
  for (const [wx, sd] of [[3796, 1], [3796, -1], [TREE_R, -1], [TREE_R, 1]]) { let x = wx + sd * 20, y = LAND; for (let k = 0; k < 70; k++) { const r = Math.max(1, 4 - k / 20); for (let j = -r; j <= r; j++) { px(R(x), R(y + j), j < 0 ? "#4A2E26" : "#2A1814"); } x += sd * (1.2 - k / 120); y += 0.6 + k / 60 + Math.sin(k * 0.3) * 0.4; } }
  // the crate under the touchscreen
  const cx0 = L(CRATE_X - 44), cy0 = T(LAND - 52);
  g.rect(cx0, cy0, 88, 52, "#2A160C"); g.rect(cx0 + 1, cy0 + 1, 86, 50, "#8A5A30"); for (let j = 0; j < 4; j++) { g.rect(cx0 + 2, cy0 + 2 + j * 12, 84, 1, "#A87448"); g.rect(cx0 + 2, cy0 + 12 + j * 12, 84, 1, "#5A3418"); }
  for (const dx of [2, 82]) g.rect(cx0 + dx, cy0 + 1, 4, 50, "#6A4024"); g.line(cx0 + 6, cy0 + 4, cx0 + 82, cy0 + 48, "#6A4024"); g.line(cx0 + 6, cy0 + 5, cx0 + 82, cy0 + 49, "#5A3418");
  // bushes at the city's sidewalk (same greens as the city's park bushes)
  for (const [wx, r] of [[4296, 22], [4316, 15], [4280, 13]]) blob(g, [ell(L(wx), T(LAND - r * 0.75), r * 1.25, r)], { ramp: ["#0C1E14", "#122A1A", "#1E4428", "#24502E", "#2A5A34", "#2E6A3A", "#3E7E46", "#4E9254"], thick: 8, base: 3.2 });
  // little glowing mushrooms at the tree roots
  for (const [wx, k] of [[3822, 0], [3832, 1], [4246, 2], [4256, 3]]) { const x = L(wx), y = T(LAND) - 1; g.rect(x, y - 4, 2, 4, "#E8E0D0"); g.rect(x - 2, y - 7, 6, 3, k % 2 ? "#F06A8A" : "#F4B44A"); g.px(x - 1, y - 7, "#FFFFFF"); }
}
const TUNNELS = [[[[MOUND_X - 10, LAND], [MOUND_X - 26, 30], [MOUND_X - 20, 74]], 3], [[[MOUND_X - 20, 74], [MOUND_X + 4, 84], [MOUND_X + 22, 120]], 3], [[[MOUND_X + 22, 120], [MOUND_X + 14, 150], [MOUND_X - 6, 170]], 3], [[[MOUND_X + 16, LAND], [MOUND_X + 34, 50], [MOUND_X + 22, 120]], 2]];
let BACK = null;
const backLayer = () => BACK ??= worldLayer(X0 - 30, TOP, X1 - X0 + 40, LH, paintBack);

// ---------------------------------------------------------------- chimp (head centre at (x, y); ground at y + 270)
const SPR = spriteCache(16);
function chimpBody(s) {
  return SPR(`CB${s}`, R(230 * s), R(250 * s), R(115 * s), R(-40 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);
    blob(g, [P.poly(ell(0, 150, 48, 82)), P.poly(ell(0, 210, 70, 48))], { ramp: FUR, thick: 32, base: 1.2, gain: 2.3, slope: 0.4, litOutline: RIM });
    for (const sd of [-1, 1]) blob(g, [P.poly(ell(sd * 44, 234, 28, 24))], { ramp: FUR, thick: 14, base: 1.4, gain: 2.0, litOutline: RIM });
    for (const sd of [-1, 1]) { blob(g, [P.poly(ell(sd * 40, 258, 24, 10))], { ramp: SKIN, thick: 6, base: 3.6, outline: SKIN[1] }); for (const k of [0, 1, 2, 3]) { const p = P(sd * (24 + k * 8), 263); g.px(R(p[0]), R(p[1]), SKIN[2]); g.px(R(p[0]), R(p[1]) - 1, SKIN[2]); } }
  });
}
function chimpHead(s) {
  return SPR(`CH${s}`, R(230 * s), R(180 * s), R(115 * s), R(90 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);
    for (const sd of [-1, 1]) { blob(g, [P.poly(ell(sd * 66, 6, 25, 26))], { ramp: FUR, thick: 10, base: 1.5, litOutline: RIM }); blob(g, [P.poly(ell(sd * 66, 7, 15, 17))], { ramp: SKIN, thick: 7, base: 3.0, outline: FUR[1] }); }
    blob(g, [P.poly(ell(0, 0, 64, 58)), smooth(P.poly([[-16, -52], [-10, -74], [-2, -56], [6, -76], [14, -54]]), new Set(), 3)], { ramp: FUR, thick: 28, base: 1.3, gain: 2.3, slope: 0.4, litOutline: RIM });
    blob(g, [P.poly(ell(-20, -4, 26, 25)), P.poly(ell(20, -4, 26, 25)), P.poly(ell(0, 12, 31, 19)), P.poly(ell(0, 32, 36, 23))], { ramp: SKIN, thick: 16, base: 3.6, gain: 1.8, slope: 0.3, outline: FUR[0] });
    for (const sd of [-1, 1]) for (let k = -15; k <= 15; k++) { const p = P(sd * 20 + k, -26 + (k * k) / 40); g.px(R(p[0]), R(p[1]), SKIN[2]); g.px(R(p[0]), R(p[1]) - 1, SKIN[3]); }
    for (const sd of [-1, 1]) { const p = P(sd * 5, 20); g.rect(R(p[0]) - 1, R(p[1]), 3, 2, SKIN[1]); g.px(R(p[0]), R(p[1]) + 1, SKIN[0]); }
  });
}
function arm(g, sh, hand, sd, s, a = 1) {
  // two-segment arm with a soft elbow bent outward; fur tube + skin hand
  const d = Math.hypot(hand[0] - sh[0], hand[1] - sh[1]), Lseg = 80 * s, h = d < 2 * Lseg ? Math.min(34 * s, Math.sqrt(Lseg * Lseg - (d / 2) ** 2) * 0.5) : 0;
  const mx = (sh[0] + hand[0]) / 2, my = (sh[1] + hand[1]) / 2, nx = -(hand[1] - sh[1]) / (d || 1), ny = (hand[0] - sh[0]) / (d || 1), side = nx * sd > 0 ? 1 : -1;
  const el = [mx + nx * h * side, my + ny * h * side], ctrl = [2 * el[0] - mx, 2 * el[1] - my];
  blob(g, [tube(bez(sh, ctrl, hand, 12), 14 * s, 10.5 * s), ell(sh[0], sh[1], 15 * s, 15 * s)], { ramp: FUR, thick: 9, base: 1.5, gain: 1.8, litOutline: RIM, a });
  blob(g, [ell(hand[0], hand[1], 11 * s, 10 * s)], { ramp: SKIN, thick: 6, base: 3.0, outline: FUR[0], a });
}

// ---------------------------------------------------------------- the touch game (Ayumu's numbers task)
const PANEL = { x: CRATE_X - 41, y: LAND - 146, w: 82, h: 92 };                    // world rect of the screen
const CELLS = (() => { const all = []; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) all.push([i, j]); const pick = []; let k = 0; while (pick.length < 9) { const c0 = all[Math.floor(rnd(k++ * 7 + 3) * all.length)]; if (!pick.includes(c0)) pick.push(c0); } return pick.map(([i, j]) => [PANEL.x + 8 + i * 18 + (rnd(i * 3 + j) - 0.5) * 3, PANEL.y + 10 + j * 20 + (rnd(i + j * 5) - 0.5) * 3]); })();
const T_ON = EV.young - 0.35, T_NUM = EV.young, T_SQ = EV.ayumu - 0.12, T_TAP0 = EV.ayumu + 0.12, TAP_DT = (EV.memory - 0.1 - (EV.ayumu + 0.12)) / 9, T_DONE = T_TAP0 + 9 * TAP_DT;
const T_HNUM = EV.memory + 0.35, T_HSQ = EV.memory + 0.65, T_FAIL = EV.students - 0.26;     // T_FAIL ≈ "college"
const NUM_FADE = 0.15;
export const TAPS = Array.from({ length: 9 }, (_, i) => T_TAP0 + i * TAP_DT);           // the chimp's 9 taps (in order 1..9)
/** motion spans [t0, t1] (seconds) used by the drawing below and by levels/bay-motions.mjs (sounds last exactly as long) */
export const SPAN = {
  pull: [EV.chimp - 0.1, EV.chimp + 0.3], lift: [EV.chimp + 0.32, EV.beat - 0.02], grin: [EV.beat - 0.12, EV.beat + 0.1], grinOut: [EV.young - 0.2, EV.young + 0.2],
  munch: [EV.beat + 0.45, EV.beat + 0.8], drop: [EV.young - 0.55, EV.young - 0.15], stickOut: [EV.young - 0.3, EV.young],
  screenOn: [T_ON, T_ON + 0.3], numbers: [T_NUM, T_NUM + NUM_FADE], squares: [T_SQ, T_SQ + NUM_FADE], ayumu: [EV.ayumu - 0.05, EV.ayumu + 0.2], ayumuOut: [EV.students + 0.3, EV.students + 0.6],
  reach: [T_TAP0 - 0.35, T_TAP0 - 0.05], tapLight: [-0.02, 0.08], tapRing: [0, 0.25], green: [T_DONE + 0.05, T_DONE + 0.25], armBack: [T_DONE + 0.15, T_DONE + 0.5], win: [T_DONE, T_DONE + 0.2], winOut: [T_HNUM + 0.4, T_HNUM + 0.8],
  memory: [EV.memory, EV.memory + 1.6], round1Out: [T_HNUM - 0.2, T_HNUM], confused: [T_HNUM - 0.2, T_HNUM + 0.1], question: [T_HNUM - 0.1, T_HNUM + 0.15], wobble: [T_HNUM, T_HNUM + 0.3],
  numbers2: [T_HNUM, T_HNUM + NUM_FADE], squares2: [T_HSQ, T_HSQ + NUM_FADE], red: [T_FAIL, T_FAIL + 0.15], stamp: [T_FAIL, T_FAIL + 0.25],
};

// ---------------------------------------------------------------- level exports
const onScreen = (V) => V.x1 > X0 - 70 && V.x0 < X1 + 50;
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 30))), x1: Math.min(540, R(V.X(X1))) });
  // termites walking through the tunnels under the mound
  for (const [ti, [pts]] of TUNNELS.entries()) for (let k = 0; k < 3; k++) { const u = ((t * 0.3 + k / 3 + ti * 0.17) % 1), q = 1 - u, bx = q * q * pts[0][0] + 2 * q * u * pts[1][0] + u * u * pts[2][0], by = q * q * pts[0][1] + 2 * q * u * pts[1][1] + u * u * pts[2][1], x = R(V.X(bx)), y = R(V.Y(by)) - 1; c.rect(x - 1, y, 3, 2, "#F4D8B0"); c.px(x + 2, y, "#C89A70"); c.px(x - 2, y + 1, "#6A4A30"); }
  // vines swaying from the canopy, with little leaves
  for (const [wx, len, ph] of [[3890, 330, 0], [3934, 250, 1.3], [4168, 300, 2.1], [4216, 210, 0.7], [3990, 150, 2.8], [4116, 170, 1.9]]) {
    const top = V.Y(-600), x0 = V.X(wx); if (x0 < -40 || x0 > 580) continue; let px0 = x0, py0 = top;
    for (let k = 0; k < len; k += 2) { const sw = Math.sin(t * 0.9 + ph + k * 0.012) * (k / len) * 10, x = R(x0 + sw + Math.sin(k * 0.05 + ph) * 3), y = R(top + k); c.px(x, y, "#2A4A2A"); c.px(x + 1, y, "#1A3020"); c.px(x, y + 1, "#2A4A2A");
      if (k % 22 === 10) { const sd = (k / 22) % 2 ? 1 : -1; for (let j = 1; j < 7; j++) { c.px(x + sd * j, y + (j >> 1), j < 5 ? "#3E7A3A" : "#2A5A2A"); c.px(x + sd * j, y + (j >> 1) + 1, "#2A5A2A"); } } px0 = x; py0 = y; }
  }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const gx = R(V.X(CX)), gy = V.Y(LAND), bob = Math.sin(t * 2.6) * 1.2, hx = gx, hy = R(gy - 270 + bob);
  sign(c, R(V.X(TREE_R - 4)), R(V.Y(-290)), "LV 9", "wood", 1, t);
  // ---- the touchscreen on the crate
  const on = sm(t, ...SPAN.screenOn), pX = R(V.X(PANEL.x)), pY = R(V.Y(PANEL.y));
  c.rrect(pX - 4, pY - 4, PANEL.w + 8, PANEL.h + 8, "#120C1A", 2); c.rrect(pX - 3, pY - 3, PANEL.w + 6, PANEL.h + 6, "#3A3448", 2); c.rect(pX - 2, pY - 3, PANEL.w + 4, 1, "#6A6480");
  c.rect(pX - 10, pY + PANEL.h + 4, PANEL.w + 20, 4, "#2A2434"); c.rect(pX + 30, pY + PANEL.h + 2, 22, 4, "#2A2434");
  for (let y = pY; y < pY + PANEL.h; y++) for (let x = pX; x < pX + PANEL.w; x++) { const v = (y - pY) / PANEL.h; c.px(x, y, on > bayer(x, y) ? mix("#14203A", "#0C1428", v) : "#06060C"); }
  if (on > 0.5) for (let k = 0; k < 14; k++) { const x = pX + 6 + k * 2, y = pY + 4 + k; if (x < pX + PANEL.w) c.px(x, y, "#2A3A5A"); }
  const fail = sm(t, ...SPAN.red);
  const round = (tNum, tSq, tapping) => {
    const numA = sm(t, tNum, tNum + NUM_FADE) * (1 - sm(t, tSq, tSq + NUM_FADE)), sqA = sm(t, tSq, tSq + NUM_FADE);
    CELLS.forEach(([wx, wy], i) => {
      const x = R(V.X(wx)), y = R(V.Y(wy));
      if (numA > 0) { const g = fade(c, numA * on); g.text(MAIN, String(i + 1), x, y, "#FFFFFF", { scale: 2 }); }
      if (sqA > 0) {
        const tapT = TAPS[i], hit = tapping ? sm(t, tapT + SPAN.tapLight[0], tapT + SPAN.tapLight[1]) : 0, done = tapping ? sm(t, ...SPAN.green) : 0;
        const red = !tapping && i === 3 ? fail : 0;
        let col = hit > 0 ? mix("#FFFFFF", "#FFE070", hit * (1 - done)) : "#FFFFFF"; if (done > 0) col = mix(col, "#7AE070", done); if (red > 0) col = mix(col, "#FF4A4A", red);
        const g = fade(c, sqA * on * (tapping ? 1 - sm(t, ...SPAN.round1Out) : 1)); g.rect(x - 1, y, 12, 12, col); g.rect(x - 1, y, 12, 1, mix(col, "#FFFFFF", 0.5));
        if (hit > 0 && hit < 1 || (tapping && t > tapT && t < tapT + SPAN.tapRing[1])) { const u = clamp01((t - tapT) / SPAN.tapRing[1]), rg = fade(c, (1 - u) * sqA); rg.frame(x - 1 - R(u * 6), y - R(u * 6), 12 + R(u * 12), 12 + R(u * 12), "#FFF6B0"); }
      }
    });
  };
  if (t < T_HNUM + 0.05) round(T_NUM, T_SQ, true);
  if (t > T_HNUM - 0.1) round(T_HNUM, T_HSQ, false);
  // ---- the hero: a college student with books, watching; confused on the second round, then a red X
  const confused = sm(t, ...SPAN.confused);
  const g0 = gaze(t, [[0, [0.7, 0]], [EV.young, [0.6, 0.6]], [T_HNUM, [0.5, 0.6]]], 0.25), wob = sm(t, ...SPAN.wobble) * Math.sin(t * 5) * 0.4, lookH = [g0[0] + wob, g0[1]];
  const ho = { pose: "books", facing: 0, look: lookH, blink: blinkAt(t, 3.3, 1.7), brows: confused };
  if (confused < 1) drawHero(c, R(V.X(HERO_X)), R(gy), { ...ho, mouth: "smile" });
  if (confused > 0) drawHero(c, R(V.X(HERO_X)), R(gy), { ...ho, mouth: "o", a: confused });   // the mouth dissolves into a confused "o"
  // ---- the chimp
  shadow(c, hx, R(gy) - 1, 92, 7, "#0A0410", 0.5);
  chimpBody(1).blit(c, hx, hy);
  // arms: right hand = termite stick, left hand = taps the squares
  const P = xf(hx, hy, 1, 0), shL = P(-40, 102), shR = P(40, 102);
  const fishOut = sm(t, ...SPAN.pull), toMouth = sm(t, ...SPAN.lift), drop = sm(t, ...SPAN.drop);
  const inMound = [V.X(MOUND_X - 46), V.Y(LAND - 70)], pulled = P(78, 150), mouthH = P(74, 84), rest = P(58, 216);
  let hR = [lerp(inMound[0], pulled[0], fishOut), lerp(inMound[1], pulled[1], fishOut)]; hR = [lerp(hR[0], mouthH[0], toMouth), lerp(hR[1], mouthH[1], toMouth)]; hR = [lerp(hR[0], rest[0], drop), lerp(hR[1], rest[1], drop)];
  // left hand: rest → taps 1..9 → back to rest
  const restL = P(-58, 216); let hL = restL;
  if (t > SPAN.reach[0] && t < T_DONE + 0.6) {
    const reach = sm(t, ...SPAN.reach) * (1 - sm(t, ...SPAN.armBack));
    const i = Math.max(0, Math.min(8, Math.floor((t - T_TAP0) / TAP_DT))), u = clamp01((t - T_TAP0 - i * TAP_DT) / TAP_DT), a0 = CELLS[i], a1 = CELLS[Math.min(8, i + 1)];
    const k = t < T_TAP0 ? 0 : ease(clamp01((u - 0.35) / 0.65)), lift = Math.sin(Math.PI * k) * 6;
    const tx = V.X(lerp(a0[0], a1[0], i < 8 ? k : 0)) + 5, ty = V.Y(lerp(a0[1], a1[1], i < 8 ? k : 0)) + 8 - lift;
    hL = [lerp(restL[0], tx, reach), lerp(restL[1], ty, reach)];
  }
  arm(c, shR, hR, 1, 1); arm(c, shL, hL, -1, 1);
  // termite stick (in the right hand) with termites clinging, eaten on "beat"
  const stickA = 1 - sm(t, ...SPAN.stickOut);
  if (stickA > 0) {
    const tipIn = [V.X(MOUND_X - 14), V.Y(LAND - 38)], dir = fishOut < 0.5 ? [tipIn[0] - hR[0], tipIn[1] - hR[1]] : [lerp(30, 14, toMouth), lerp(18, -40, toMouth)], dl = Math.hypot(dir[0], dir[1]) || 1, len = 50;
    const tip = [hR[0] + (dir[0] / dl) * len, hR[1] + (dir[1] / dl) * len], g = fade(c, stickA);
    thick(g, [hR, tip], 2, "#2A1608"); thick(g, [hR, tip], 1, "#A07040"); g.line(R(hR[0]), R(hR[1]) - 1, R(tip[0]), R(tip[1]) - 1, "#D0A060");
    const eat = sm(t, ...SPAN.munch);
    if (fishOut > 0.3) for (let k = 0; k < 7; k++) { const ka = 1 - sm(eat, rnd(k * 3) * 0.75, rnd(k * 3) * 0.75 + 0.25); if (ka <= 0) continue; const g2 = fade(g, ka); const u = 0.55 + k * 0.065, x = R(lerp(hR[0], tip[0], u)) + (k % 2 ? 2 : -2) * 2, y = R(lerp(hR[1], tip[1], u)) + (k % 2 ? -2 : 2) + R(Math.sin(t * 20 + k)); g2.rect(x - 1, y - 1, 4, 3, "#1A0E08"); g2.rect(x, y, 2, 1, "#F4D8B0"); g2.px(x + 2, y - 1, "#C89A70"); g2.px(x - 2, y + 1, "#1A0E08"); g2.px(x + 3, y + 1, "#1A0E08"); }
  }
  // head + face
  chimpHead(1).blit(c, hx, hy);
  const grin = sm(t, ...SPAN.grin) * (1 - sm(t, ...SPAN.grinOut)), win2 = sm(t, ...SPAN.win) * (1 - sm(t, ...SPAN.winOut));
  const lookC = gaze(t, [[0, [0.8, 0.6]], [EV.chimp + 0.3, [0.8, -0.4]], [EV.beat - 0.15, [0, 0.1]], [EV.young, [-0.9, 0.7]], [T_DONE, [0, 0.1]], [T_HNUM, [-0.7, 0.3]]], 0.18);
  const happy = Math.max(grin, win2), squint = sm(grin, 0.3, 0.9);
  for (const sd of [-1, 1]) { const e = P(sd * 20, -4); eye(c, e[0], e[1], 12.5, { iris: RAMP.amber, pupil: "round", ry: 13.5, look: lookC, blink: blinkAt(t, 3.6, 2.2), lid: SKIN[3], a: 1 - squint });
    if (squint > 0) { const g = fade(c, squint); for (let k = -10; k <= 10; k++) { const u = k / 10, y = R(e[1] + 2 - 7 * (1 - u * u)); g.px(R(e[0] + k), y, FUR[0]); g.px(R(e[0] + k), y + 1, FUR[0]); } } }
  for (const sd of [-1, 1]) { const b = P(sd * 38, 16); blush(c, b[0], b[1], 9, 3.8); }
  const m = P(0, 34);
  if (happy > 0.05) { const w = R(lerp(9, 17, happy)), h = R(lerp(2, 9, happy)); for (let j = 0; j <= h; j++) { const half = R(w * Math.sqrt(Math.max(0, 1 - (j / (h + 0.5)) ** 2))); for (let i = -half; i <= half; i++) c.px(m[0] + i, m[1] + j, j === 0 || Math.abs(i) === half || j === h ? FUR[0] : j < 3 ? "#FFFFFF" : j > h - 3 ? "#F07090" : "#5A1A22"); } }
  else { for (let i = -10; i <= 10; i++) { const u = i / 10; c.px(R(m[0] + i), R(m[1] + 3 * (1 - u * u)), FUR[0]); } }
  // fireflies drifting in the dusk
  for (let i = 0; i < 10; i++) { const wx = X0 + 30 + rnd(i * 5) * 480 + Math.sin(t * 0.6 + i * 2) * 20, wy = -330 + rnd(i * 9) * 260 + Math.sin(t * 0.9 + i) * 12, x = R(V.X(wx)), y = R(V.Y(wy)), gl = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7); if (Math.abs(x - 270) < 70 && y < 450) continue; if (gl < 0.25) continue; c.px(x, y, gl > 0.6 ? "#F8FF9A" : "#B8E060"); if (gl > 0.75) { const g = fade(c, 0.5); g.px(x - 1, y, "#E8FF7A"); g.px(x + 1, y, "#E8FF7A"); g.px(x, y - 1, "#E8FF7A"); g.px(x, y + 1, "#E8FF7A"); } }
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // ferns along the ground line and big dark leaves in the bottom corners, swaying a little
  const gy = R(V.Y(LAND));
  for (let i = 0; i < 18; i++) {
    const wx = X0 + 12 + i * 30 + rnd(i * 3) * 10; if (Math.abs(wx - CX) < 70 || Math.abs(wx - HERO_X) < 34 || Math.abs(wx - CRATE_X) < 40) continue; const x = V.X(wx); if (x < -30 || x > 570) continue;
    for (let f = 0; f < 5; f++) { const ang = -Math.PI / 2 + (f - 2) * 0.42 + Math.sin(t * 1.4 + i + f) * 0.05, len = 16 + (2 - Math.abs(f - 2)) * 7;
      for (let k = 0; k < len; k++) { const u = k / len, a2 = ang + (f - 2) * 0.35 * u, xx = R(x + Math.cos(a2) * k), yy = R(gy + 2 + Math.sin(a2) * k + u * u * 6); c.px(xx, yy, "#2E5A30"); if (k % 3 === 1) { c.px(xx - 1, yy + 1, "#3E7A3A"); c.px(xx + 1, yy + 1, "#3E7A3A"); } } }
  }
  for (const [wx, wy, len, wid, ang, ph] of [[X0 + 4, 330, 120, 28, -0.75, 0], [X0 + 60, 340, 100, 22, -1.25, 1], [X1 - 10, 330, 118, 26, -2.35, 2], [X1 - 70, 345, 96, 22, -1.95, 3]]) {
    const sw = Math.sin(t * 1.1 + ph) * 0.05, x = V.X(wx), y = V.Y(wy); if (x < -160 || x > 700) continue;
    leaf(c, x, y, len, wid, ang + sw, ["#04080C", "#08121A", "#0E1E22", "#14302A", "#1C4430", "#285A38", "#386E40", "#4A8048"]);
  }
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // "AYUMU" name tag near the chimp, "+MEMORY" when the game is won
  tag(c, ["AYUMU"], R(V.X(CX + 132)), R(V.Y(-404)), sm(t, ...SPAN.ayumu) * (1 - sm(t, ...SPAN.ayumuOut)), C.Y, 2);
  pickup(c, V.X(CX), V.Y(-452), "+MEMORY", (t - SPAN.memory[0]) / (SPAN.memory[1] - SPAN.memory[0]));
  // the student: "?" over his head, then a red X for his attempt
  const hx = R(V.X(HERO_X)), qa = sm(t, ...SPAN.question);
  if (qa > 0) { const y = R(V.Y(LAND - 196) - Math.sin(t * 4) * 2), g = fade(c, qa); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(MAIN, "?", hx - 7 + dx, y + dy, C.O, { scale: 3 }); g.text(MAIN, "?", hx - 7, y, "#FFFFFF", { scale: 3 }); }
  const xa = sm(t, ...SPAN.red);
  if (xa > 0) { const s = 1 + 0.4 * (1 - ease(clamp01((t - SPAN.stamp[0]) / (SPAN.stamp[1] - SPAN.stamp[0])))), x = R(V.X(HERO_X + 46)), y = R(V.Y(LAND - 186)), r = R(11 * s), g = fade(c, xa);
    for (const w of [3, 2]) for (let k = -r; k <= r; k++) for (let j = -w; j <= w; j++) { g.px(x + k + j, y + k, w === 3 ? C.O : "#FF4A4A"); g.px(x + k + j, y - k, w === 3 ? C.O : "#FF4A4A"); } }
}
