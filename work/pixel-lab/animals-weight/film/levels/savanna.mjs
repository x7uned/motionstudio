// LV9 · elephant — the African savanna at sunset (RANGE BIOME.savanna = 4050..4590). A flat plain glowing pink-orange
// to a low horizon (screen y ≈ 465) under the huge red-orange sun, acacia and giraffe silhouettes, a tall papyrus stand
// on the river bank at the left, and at the right the land slopes down to a sandy beach with a palm (the ocean follows).
// Below the ground line: red earth strata in cross-section (the river and the ocean beside it are cut-away views too).
// The series' chubby elephant faces the camera with its head in the sun. "Heaviest" → a golden crown drops onto its
// head + HEAVIEST ON LAND; "six" → 6 T pickup; "eats" → a pile of leafy branches tumbles down at its left, the trunk
// reaches, grabs a bunch and curls it into the mouth (twice), "a hundred and fifty" → 150 KG / DAY. Pure functions of t.
import { BIOME, LAND, EV, LV, W } from "../timeline.mjs";
import { blob, ell, tube, shadow, sign, pickup, tag, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01 } from "../cute.mjs";
import { worldLayer, spriteCache, thick, gaze, profile, drawElephant, TRUNK, trunkMix, Layer } from "./elephant-art.mjs";

export const RANGE = BIOME.savanna;
const R = Math.round, [X0, X1] = RANGE, EX = 4320, EY = -288, HZ = -195;     // elephant head centre (world), horizon
const PILE_X = 4170, SIGN_X = 4490, COAST = 4466;                              // leaf pile centre, LV sign, grass → sand
const T_HUNDRED = W("hundred", 2);                                             // "a hundred and fifty kilograms" (EV.kgPlants points at the cat's "two hundred")
const RIM = "#FF9A70";                                                         // sunset rim light on the elephant

// ---------------------------------------------------------------- palette (sunset, backlit)
const PLAIN = ["#FFC08E", "#F8A47A", "#EC8C68", "#D8745A", "#C2604E", "#A85046", "#8C423E", "#723838"];
const SOIL = ["#A8483A", "#983E34", "#B4583F", "#8C3830", "#A04638", "#BC6448"];
const SAND = ["#F2BE8E", "#E6AE80", "#DCA074", "#EBB688", "#D29468", "#E2A87C"];
const SIL = "#4A1E36", SIL2 = "#62283E";                                       // silhouettes against the sun
const LEAF = ["#1A2010", "#283818", "#3A4E1C", "#526622", "#6E7C2A", "#8E8E34", "#B8A044", "#E8BC5C"];
const GOLD = ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"];

// ---------------------------------------------------------------- static scenery (one masked world layer)
const TOP = -440, LH = 920;
const hz = profile([[X0 - 40, -44], [X0 + 6, -58], [X0 + 70, HZ + 40], [X0 + 130, HZ + 6], [X0 + 190, HZ + 1], [4300, HZ], [4392, HZ - 4], [4446, HZ + 30], [4500, HZ + 96], [4552, LAND - 22], [X1, LAND - 3], [X1 + 44, LAND]]);
function acacia(g, x, y, h, w, col, lit) {
  const tr = Math.max(1, R(h / 30));
  for (const [dx, k] of [[-w * 0.32, 0.62], [w * 0.28, 0.7], [0, 0.5]]) thick(g, bezier([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], 10), tr, col);
  const cy = y - h * 0.78;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.16], [-w * 0.45, w * 0.05, w * 0.5, w * 0.13], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]])
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1) continue; if ((xx * 7 + yy * 3) % 5 === 0 && d > 0.75) continue; g.px(xx, yy, lit && yy < cy + dy - ry * 0.45 ? lit : col); }
}
function bezier(p0, p1, p2, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }
function giraffe(px, x, y, h, col, dir = 1) {
  // tall silhouette: body, sloping back, long neck, ossicones, four thin legs
  const b = R(h * 0.3);
  for (let i = -b; i <= b; i++) for (let j = 0; j < R(h * 0.14) + R((i * dir + b) * 0.08); j++) px(x + i, y - R(h * 0.42) - j, col);
  for (const lx of [-b + 1, -b + 3, b - 3, b - 1]) for (let j = 0; j < R(h * 0.43); j++) px(x + lx, y - j, col);
  for (let k = 0; k < R(h * 0.55); k++) { const xx = x + dir * (b - 1) + dir * R(k * 0.28); px(xx, y - R(h * 0.52) - k, col); px(xx + dir, y - R(h * 0.52) - k, col); }
  const hx = x + dir * (b + R(h * 0.15)), hy = y - R(h * 1.06); for (let i = 0; i < 5; i++) px(hx + dir * i, hy + (i > 2 ? 1 : 0), col); px(hx + dir * 4, hy + 1, col); px(hx, hy - 1, col); px(hx, hy - 2, col); px(hx + dir, hy - 2, col);
  for (let j = 0; j < R(h * 0.3); j++) px(x - dir * b - dir * R(j * 0.15), y - R(h * 0.48) + j, col);
}
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far plain: hazy and bright at the horizon, darker plum toward us; perspective rows of grass, far bushes
  for (let wx = X0; wx < X1; wx++) {
    const top = R(hz(wx)); if (top >= LAND) continue;
    const riv = 1 - sm(wx, X0 - 30, X0 + 110);                                  // the river's far bank colours at the seam
    for (let wy = top; wy < LAND; wy++) {
      const v = (wy - HZ) / (LAND - HZ), vv = clamp01(v), s2 = Math.pow(vv, 0.75) * (PLAIN.length - 1), lo = Math.floor(s2), f = s2 - lo;
      let col = PLAIN[Math.min(PLAIN.length - 1, f > bayer(wx, wy) ? lo + 1 : lo)];
      if (wy - top < 1) col = wx > 4440 ? "#FFD2A0" : "#FFDCB0";
      const row = Math.floor(Math.pow(vv, 0.5) * 22);
      if (rnd(wx * 31 + row * 977) < 0.18 && ((wy - HZ) - Math.pow(row / 22, 2) * (LAND - HZ)) ** 2 < 1 + vv * 4) col = mix(col, "#FFD08A", 0.3 + vv * 0.25);
      if (rnd(wx * 7 + wy * 131) < 0.012 + vv * 0.03) col = mix(col, "#3A1A24", 0.2 + vv * 0.2);
      const sandK = sm(wx, COAST - 30, COAST + 50); if (sandK > 0) col = mix(col, mix("#FFC89A", "#C8866A", vv), sandK * 0.85);
      if (riv > 0) col = mix(col, wy - top < 1 ? "#E6D08A" : wy - top < 3 ? "#B4A462" : "#8E8A52", riv * 0.85);
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 46; i++) {           // far bushes on the plain
    const v = Math.pow(rnd(i * 3 + 1), 1.6), wy = HZ + 4 + v * (LAND - HZ - 30), wx = X0 + 90 + rnd(i * 7) * (COAST - X0 - 120), r = 1.2 + v * 6, col = mix("#B05A5A", "#3E1C2A", v);
    if (wy < hz(wx) + 3) continue;
    for (let y = -r * 0.7; y <= 0; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) if ((x / (r * 1.5)) ** 2 + (y / (r * 0.7)) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.45 ? mix(col, "#FF9A7A", 0.35) : col);
  }
  // far acacias and giraffes on the horizon (silhouettes), a mid acacia on the left
  for (const [wx, h, w] of [[4108, 20, 16], [4232, 15, 12], [4398, 24, 19], [4430, 14, 11]]) acacia(g, L(wx), T(hz(wx) + 2), h, w, "#8A3A4A", "#A04A52");
  giraffe(px, 4140, R(hz(4140)) + 3, 26, "#7A3248", 1); giraffe(px, 4160, R(hz(4160)) + 3, 21, "#7A3248", 1);
  acacia(g, L(4118), T(-82), 104, 66, SIL, SIL2);
  // the coast: a low dune crest where the plain falls to the beach, beach grass on it, a leaning palm at the edge
  for (let wx = 4450; wx < X1; wx++) { const top = R(hz(wx)); if (top < LAND - 1) { px(wx, top, "#FFE2B4"); px(wx, top + 1, "#FCD0A0"); } }
  for (let i = 0; i < 12; i++) { const wx = 4470 + i * 9 + R(rnd(i * 5) * 5), top = hz(wx); if (top > LAND - 4) continue; for (let b = 0; b < 3; b++) for (let k = 0; k < 4 + R(rnd(i * 3 + b) * 6); k++) px(wx + b * 2 + R((b - 1) * k * 0.3), R(top) - k, k > 4 ? "#C87A4A" : "#8A4A3A"); }
  palm(g, L, T);
  // ground: grass lip (fading into a sand lip at the coast), then red earth strata (sand strata at the coast)
  for (let wx = X0; wx < X1; wx++) {
    const sandK = sm(wx, COAST - 20, COAST + 30), river = 1 - sm(wx, X0 - 30, X0 + 90);
    for (let wy = LAND; wy < TOP + LH; wy++) {
      const d = wy - LAND, b = bayer(wx, wy); let col;
      if (d < 3) col = mix(d < 1 ? mix("#F4B868", "#FFE0B0", sandK) : mix("#C8703C", "#E8B482", sandK), d < 2 ? (d < 1 ? "#F0DA8A" : "#D2AE48") : "#94701E", river);
      else if (d < 9 + Math.sin(wx * 0.4) * 2) col = mix(mix(d < 6 ? "#7A3A26" : "#6A3022", d < 6 ? "#C88A62" : "#B87A58", sandK), d < 5 ? "#94701E" : "#5E4C30", river);
      else {
        const wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band;
        col = mix(SOIL[band % SOIL.length], SAND[band % SAND.length], sandK); if (f < 0.09 && b > 0.35) col = mix(col, "#3A1414", 0.28);
        if (river > 0) col = mix(col, riverSoil(wx, wy), river);
        if (wy > 100) col = mix(col, "#3A1620", Math.min(0.55, (wy - 100) / 520));
        if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#F0C0A0", 0.5); else if (rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#2A0E10", 0.5);
      }
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 16; i++) { let x = X0 + 10 + rnd(i * 3) * 400, y = LAND + 6; for (let k = 0; k < 10 + rnd(i) * 22; k++) { px(R(x), R(y), "#4A2014"); x += (rnd(i * 50 + k) - 0.5) * 2; y += 1; } }
  for (let i = 0; i < 9; i++) { const wx = X0 + 30 + rnd(i * 7 + 1) * 480, wy = 40 + rnd(i * 5) * 220, r = 4 + rnd(i) * 6; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#2A1414", "#4A2824", "#6A4038", "#8A5A4E", "#A67468", "#C09084", "#D6AC9E", "#EAC8B8"], thick: 4 }); }
  // seashells in the beach sand, a buried fossil bone (a tiny surprise)
  for (let i = 0; i < 6; i++) { const wx = COAST + 30 + rnd(i * 9) * 80, wy = 12 + rnd(i * 4) * 120; px(R(wx), R(wy), "#FFF0E0"); px(R(wx) + 1, R(wy), "#F8D0C0"); px(R(wx), R(wy) + 1, "#E8B8A8"); }
  // papyrus stand on the river bank (left edge): tall stems with green umbels, silhouetted
  for (let i = 0; i < 22; i++) {
    const wx = X0 - 34 + i * 4.6 + rnd(i * 3) * 4, h = 110 + rnd(i * 7) * 120 - Math.max(0, i - 14) * 14, lean = (rnd(i * 11) - 0.5) * 0.4 + (i - 11) * 0.02;
    const col = i % 3 === 0 ? "#3A2A20" : "#4A3424", hi = "#7A5A3A", top = [wx + lean * h, LAND - h];
    for (let k = 0; k <= h; k++) { const u = k / h, x = R(wx + lean * h * u * u), y = LAND - k; px(x, y, col); if (u > 0.3 && i % 2) px(x + 1, y, hi); }
    for (let r = 0; r < 9; r++) { const an = -Math.PI / 2 + (r - 4) * 0.32, len = 9 + rnd(i * 13 + r) * 6; for (let k = 0; k < len; k++) { const x = R(top[0] + Math.cos(an) * k), y = R(top[1] + Math.sin(an) * k * 0.7 + (k * k) / 26); px(x, y, k > len - 3 ? "#8A8A3A" : "#5A5A2A"); } }
  }
  for (let i = 0; i < 18; i++) { const wx = X0 - 20 + i * 5 + rnd(i) * 3; for (let k = 0; k < 14 + rnd(i * 5) * 16; k++) px(R(wx + (rnd(i * 2) - 0.5) * k * 0.4), LAND - k, k > 12 ? "#6A7A30" : "#3E4A22"); }
}
// the river's muddy strata (same formula as the river module's soil with mud 0.9), for a seamless left edge
const MUD = ["#7A4A2A", "#6C4026", "#835232", "#62391F", "#77482A", "#8A5A36"], MUD2 = ["#4A3A2A", "#433424", "#52402E", "#3E3020", "#4C3C2A", "#584632"];
function riverSoil(wx, wy) {
  const wv = Math.sin(wx * 0.029) * 5 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 21, band = Math.floor(v), f = v - band, i = ((band % 6) + 6) % 6;
  let col = MUD[i]; if (f < 0.09 && bayer(wx, wy) > 0.35) col = mix(col, "#3A2010", 0.3);
  col = mix(col, MUD2[i], 0.9); if (wy > 100) col = mix(col, "#2E1A10", Math.min(0.42, (wy - 100) / 700));
  return col;
}
function palm(g, L, T) {
  const bx = 4572, by = LAND, h = 158, tip = [bx - 34, by - h], col = SIL, lit = "#7A3448";
  const trunk = bezier([bx, by], [bx - 2, by - h * 0.62], tip, 200);
  for (const [i, [x, y]] of trunk.entries()) { const w = 4 - R(i / 90); for (let k = -w; k <= w; k++) g.px(L(R(x + k)), T(R(y)), k === -w ? lit : col); if (R(y) % 6 === 0) for (let k = -w; k <= w; k++) g.px(L(R(x + k)), T(R(y)), "#2E1020"); }
  for (let f = 0; f < 7; f++) {
    const an = -Math.PI * (0.05 + f * 0.15), len = 40 + rnd(f * 3) * 18, droop = 0.9 + rnd(f) * 0.4;
    for (let k = 0; k < len; k++) {
      const u = k / len, x = tip[0] + Math.cos(an) * k, y = tip[1] + Math.sin(an) * k * 0.55 + u * u * len * 0.55 * droop;
      g.px(L(R(x)), T(R(y)), col); g.px(L(R(x)), T(R(y)) + 1, col);
      if (k % 3 === 0 && k > 4) for (let j = 1; j < 7 - u * 4; j++) g.px(L(R(x + j * 0.3)), T(R(y + j)), col);
    }
  }
  for (const [dx, dy] of [[-3, 4], [3, 5], [0, 7]]) { const cx = tip[0] + dx, cy = tip[1] + dy; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) g.px(L(cx + x), T(cy + y), x + y < -1 ? "#7A4A3A" : "#3A1C20"); }
}
let BACK = null;
const backLayer = () => BACK ??= worldLayer(X0 - 40, TOP, X1 - X0 + 84, LH, paintBack);

// ---------------------------------------------------------------- props: crown, leaf pile, leaf bunch
const SPR = spriteCache(40);
function crownSprite() {
  const K = 1.3;
  return SPR("crown", 84, 66, 42, 50, (g, ox, oy) => {
    const P = (x, y) => [ox + x * K, oy + y * K], Q = (x, y) => [R(ox + x * K), R(oy + y * K)];
    blob(g, [[P(-21, 0), P(-23, -20), P(-12, -11), P(0, -26), P(12, -11), P(23, -20), P(21, 0)].concat([P(14, 3), P(0, 4), P(-14, 3)])], { ramp: GOLD, thick: 10, base: 3.6, gain: 2.2, outline: "#5A2A04", litOutline: "#FFF2B8" });
    for (let x = -20 * K; x <= 20 * K; x++) { g.px(R(ox + x), Q(0, -5)[1], GOLD[2]); g.px(R(ox + x), Q(0, -5)[1] + 1, GOLD[6]); }
    for (const [x, y] of [[-23, -21], [0, -27], [23, -21]]) { const [cx, cy] = Q(x, y); for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j <= 14) g.px(cx + i, cy + j, i * i + j * j > 8 ? "#5A2A04" : i + j < -1 ? "#FFF6D0" : "#F5C040"); }
    for (const [x, y, col, hi] of [[0, -11, "#C8203C", "#FF8AA0"], [-12, -6, "#2A6AD0", "#9AC8FF"], [12, -6, "#2A6AD0", "#9AC8FF"]]) { const [cx, cy] = Q(x, y); for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (Math.abs(i) + Math.abs(j) <= 4) g.px(cx + i, cy + j, Math.abs(i) + Math.abs(j) === 4 ? "#3A0A14" : col); g.px(cx - 1, cy - 1, hi); g.px(cx - 1, cy - 2, "#FFFFFF"); g.px(cx - 2, cy - 1, hi); }
  });
}
// leafy clump: a heap of small acacia leaves (lit from the low sun at the upper left) on a dark core, twigs poking
// out, a 1-px dark outline around the whole clump
function clumpSprite(i, r) {
  const S = R(r * 3 + 14), o = R(r * 1.5 + 7);
  return SPR(`clump${i}|${r}`, S, S, o, o, (g, ox, oy) => {
    const seed = i * 7 + 3, n = LEAF.length - 1;
    for (let k = 0; k < 2 + (i % 2); k++) { const an = rnd(seed + k * 5) * 6.28; thick(g, [[ox, oy], [ox + Math.cos(an) * r * 1.3, oy + Math.sin(an) * r * 0.9 - 2]], 0, "#6A3E1C"); }
    for (let Y = R(oy - r); Y <= R(oy + r); Y++) for (let X = R(ox - r); X <= R(ox + r); X++) if (((X - ox) / r) ** 2 + ((Y - oy) / (r * 0.86)) ** 2 <= 0.8) g.px(X, Y, LEAF[1]);
    const leaves = 10 + R(r * r * 0.22);
    for (let k = 0; k < leaves; k++) {
      const u = Math.sqrt(rnd(seed + k * 3)) * r * 0.92, an = rnd(seed + k * 7) * 6.28, lx = ox + Math.cos(an) * u, ly = oy + Math.sin(an) * u * 0.86;
      const lit = clamp01(0.5 + ((ox - lx) * 0.5 + (oy - ly) * 0.85) / r * 0.5 - (u / r) * 0.1), rot = rnd(seed + k * 11) * 3.14, ca = Math.cos(rot), sa = Math.sin(rot);
      const base = 1 + lit * (n - 2.2);
      for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) { const qx = x * ca + y * sa, qy = -x * sa + y * ca; if ((qx / 3.2) ** 2 + (qy / 1.7) ** 2 > 1) continue; const v = Math.max(1, Math.min(n, R(base + (qy < 0 ? 0.8 : -0.4)))); g.px(R(lx + x), R(ly + y), v === n && rnd(seed + k + x * 3 + y) < 0.5 ? LEAF[n - 1] : LEAF[v]); }
    }
    for (let k = 0; k < 4; k++) { const x = ox + (rnd(seed + k * 3) - 0.6) * r, y = oy + (rnd(seed + k * 5) - 0.75) * r * 0.8; if (g.has(R(x), R(y))) g.px(R(x), R(y), "#FFE08A"); }
    const out = []; for (let Y = 0; Y < S; Y++) for (let X = 0; X < S; X++) if (!g.has(X, Y) && (g.has(X - 1, Y) || g.has(X + 1, Y) || g.has(X, Y - 1) || g.has(X, Y + 1))) out.push([X, Y]);
    for (const [X, Y] of out) g.px(X, Y, Y < oy - r * 0.3 && X < ox ? "#3A3A14" : LEAF[0]);
  });
}
// the pile: clumps (dx from PILE_X, dy above the ground, radius, drop delay), back → front; the top clumps are eaten
const CLUMPS = [[-40, 14, 15, 0.1], [36, 14, 15, 0.16], [-12, 16, 18, 0.0], [16, 22, 17, 0.06], [-30, 34, 14, 0.24], [26, 38, 14, 0.3], [-4, 44, 16, 0.2], [-20, 60, 13, 0.36], [12, 62, 13, 0.42], [-2, 78, 12, 0.5]];
const EAT1 = 9, EAT2 = 8;                                                     // indices of the clumps taken by the trunk
// grass straws sticking out of the pile
const STRAWS = Array.from({ length: 14 }, (_, i) => [(rnd(i * 3 + 1) - 0.5) * 80, 8 + rnd(i * 5) * 40, (rnd(i * 7) - 0.5) * 1.6, 10 + rnd(i * 9) * 12]);

// ---------------------------------------------------------------- choreography (all from words)
const T_CROWN = EV.heaviest, T_LAND = EV.heaviest + 0.42;
const T_PILE = EV.eats - 0.08;
const BITES = [[EV.eats + 0.32, EAT1], [EV.plants - 0.12, EAT2]];               // trunk starts reaching
const REACH = 0.48, GRAB = 0.16, LIFT = 0.52, CHEW = 0.5;
const TRUNK_BACK = [0.45, 1.1];                                                 // trunk returns to hang: starts at 0.45·CHEW into the chew, lasts 1.1·CHEW
const CLUMP_FALL = 0.42, CRUMBS = 0.9, CROWN_BOUNCE = 0.25, PICKUP_LIFE = 1.6;
const SPARKLE = [T_LAND - 0.05, T_LAND + 0.9, 0.08, 0.4];                     // win() args of the crown sparkles
const TAG_HEAVY = [T_LAND - 0.1, T_HUNDRED - 0.55, 0.25, 0.3], TAG_150 = [T_HUNDRED - 0.1, LV.elephant[1] - 0.05, 0.3, 0.35];
/** Timing tables of this level (for the sound cues in park-motions.mjs); the drawing below reads the same values. */
export const TIMING = { T_CROWN, T_LAND, T_PILE, BITES, REACH, GRAB, LIFT, CHEW, TRUNK_BACK, CLUMP_FALL, CRUMBS, CROWN_BOUNCE, PICKUP_LIFE, SPARKLE, TAG_HEAVY, TAG_150, T_HUNDRED, CLUMPS };
/** Trunk state at t: { pts, carry (index of the clump at the tip or -1), bunchA (its opacity), mouth 0..1, feed 0..1 }. */
function trunkState(t) {
  let pts = TRUNK.hang, carry = -1, bunchA = 0, mouth = 0, feed = 0;
  for (const [t0, idx] of BITES) {
    if (t < t0) break;
    const k1 = ease((t - t0) / REACH), k2 = (t - t0 - REACH) / GRAB, k3 = ease((t - t0 - REACH - GRAB) / LIFT), k4 = (t - t0 - REACH - GRAB - LIFT) / CHEW;
    if (k1 < 1) { pts = trunkMix(pts, TRUNK.reachL, k1); carry = -1; bunchA = 0; continue; }
    if (k2 < 1) { pts = trunkMix(TRUNK.reachL, TRUNK.grabL, Math.sin(Math.PI * 0.5 * clamp01(k2))); carry = idx; bunchA = sm(k2, 0.25, 0.9); continue; }
    if (k3 < 1) { pts = trunkMix(TRUNK.grabL, TRUNK.feed, k3); carry = idx; bunchA = 1; mouth = sm(k3, 0.55, 1); feed = k3; continue; }
    pts = trunkMix(TRUNK.feed, TRUNK.hang, ease((k4 - TRUNK_BACK[0]) / TRUNK_BACK[1])); carry = idx; bunchA = 1 - sm(k4, 0.05, 0.4);
    mouth = Math.abs(Math.cos(Math.PI * 2 * clamp01(k4))) * (1 - sm(k4, 0.7, 1)); feed = 1 - sm(k4, 0.4, 1);
  }
  return { pts, carry: bunchA > 0 ? carry : -1, bunchA, mouth, feed };
}
/** How much of clump idx is still on the pile (1 → gone when the trunk grabs it). */
function clumpLeft(t, idx) { for (const [t0, j] of BITES) if (j === idx) return 1 - sm(t, t0 + REACH + GRAB * 0.4, t0 + REACH + GRAB * 0.9); return 1; }

// ---------------------------------------------------------------- level exports
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 40))), x1: Math.min(540, R(V.X(X1 + 44))) });
  // birds flying home across the sunset
  for (let i = 0; i < 5; i++) { const u = (t * 0.03 + i * 0.05) % 1, x = R(V.X(4120 + u * 420 + i * 11)), y = R(V.Y(-470 + (i % 3) * 7 - u * 50)), f = Math.sin(t * 6 + i * 1.3) > 0 ? 1 : 0; for (const dx of [-2, -1, 0, 1, 2]) c.px(x + dx, y - (dx ? f : 0) + (Math.abs(dx) === 2 ? f : 0), "#3A1A34"); }
  // a far zebra pair grazing near the horizon
  const hy = V.Y(HZ + 2);
  for (let i = 0; i < 3; i++) { const wx = 4366 + i * 12 + Math.sin(t * 0.3 + i) * 1.5, x = R(V.X(wx)), y = R(hy) + 2 + (i % 2), dir = i % 2 ? 1 : -1, nod = Math.sin(t * 1.1 + i * 2) > 0.3 ? 1 : 0;
    c.rect(x - 3, y - 6, 7, 3, "#F4D8C8"); c.px(x - 1, y - 6, "#3A1A2A"); c.px(x + 1, y - 5, "#3A1A2A"); c.px(x + 3 * dir, y - 7 + nod, "#3A1A2A"); c.px(x + 4 * dir, y - 7 + nod * 2, "#3A1A2A"); for (const lx of [-3, -1, 1, 3]) c.rect(x + lx, y - 3, 1, 3, "#3A1A2A"); }
}

function drawPile(c, V, t, a) {
  if (a <= 0) return;
  const gx = V.X(PILE_X), gy = V.Y(LAND);
  shadow(c, gx, gy - 1, 62, 6, "#2A0A14", 0.5 * a);
  CLUMPS.forEach(([dx, dy, r, d], i) => {
    const t0 = T_PILE + d, k = clamp01((t - t0) / CLUMP_FALL); if (k <= 0) return;
    const fall = 1 - ease(k), bounce = k > 0.8 ? Math.sin(Math.PI * (k - 0.8) / 0.2) * 3 : 0, left = clumpLeft(t, i); if (left <= 0) return;
    clumpSprite(i, r).blit(c, gx + dx, gy - dy - fall * 120 - bounce, { a: Math.min(a, sm(k, 0, 0.25), left) });
    if (i === 3) for (const [sx, sy, lean, h] of STRAWS) { const x0 = gx + sx, y0 = gy - sy, g = fade(c, Math.min(a, sm(t, T_PILE + 0.3, T_PILE + 0.6))); for (let j = 0; j < h; j++) g.px(R(x0 + lean * j), R(y0 - j), j > h - 4 ? "#FCE0A0" : "#E0A050"); }
  });
}
function leafBunch(c, x, y, idx, a = 1) { if (idx < 0) return; clumpSprite(idx, 9).blit(c, x, y + 4, { a }); }

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const ex = R(V.X(EX)), bob = Math.sin(t * 2.4) * 1.5, ey = V.Y(EY) + bob;
  const tr = trunkState(t);
  // the head dips a little toward the pile while the trunk reaches
  const reachK = Math.max(0, ...BITES.map(([t0]) => win(t, t0, t0 + REACH + GRAB, 0.4, 0.45)));
  const busy = Math.max(0, ...BITES.map(([t0]) => win(t, t0 - 0.2, t0 + REACH + GRAB + LIFT + CHEW, 0.25, 0.7)));   // trunk idle sway fades out while eating
  const crownK = clamp01((t - T_CROWN) / (T_LAND - T_CROWN));
  const g0 = gaze(t, [[0, [0, 0.12]], [T_CROWN - 0.1, [0, -0.85]], [T_LAND + 0.35, [0, 0.1]], [EV.six - 0.05, [0.5, -0.45]], [EV.six + 0.7, [0, 0.12]], [EV.eats - 0.15, [-0.85, 0.6]], [BITES[0][0] + REACH + GRAB + 0.2, [0, 0.15]], [BITES[1][0] - 0.1, [-0.85, 0.6]], [BITES[1][0] + REACH + GRAB + 0.2, [0, 0.15]]], 0.22);
  const flap = Math.sin(t * 2.2) * 0.07 + Math.sin(t * 0.7) * 0.03 + win(t, T_LAND - 0.05, T_LAND + 0.8, 0.12, 0.5) * Math.sin((t - T_LAND) * 18) * 0.05;
  shadow(c, ex, V.Y(LAND) - 2, 150, 9, "#2A0A18", 0.5);
  drawPile(c, V, t, sm(t, T_PILE - 0.05, T_PILE + 0.2));
  const happy = Math.max(sm(t, T_LAND, T_LAND + 0.3), tr.feed);
  const res = drawElephant(c, ex, ey, t, {
    rot: -0.05 * reachK, dip: 6 * reachK, flap, blink: blinkAt(t, 3.9, 0.6) * (1 - sm(tr.feed, 0.05, 0.25)), look: g0, trunk: tr.pts, sway: 1 - 0.85 * busy,
    happy, mouth: tr.mouth, mouthX: -9, rim: RIM,
  });
  leafBunch(c, res.tip[0], res.tip[1], tr.carry, tr.bunchA);
  // chewing crumbs: two leaf bits tumble from the mouth after each bite
  for (const [t0] of BITES) { const k = (t - t0 - REACH - GRAB - LIFT) / CRUMBS; if (k <= 0 || k >= 1) continue; const m = res.P(0, 56), g = fade(c, 1 - sm(k, 0.6, 1)); for (let j = 0; j < 3; j++) { const x = R(m[0] + (j - 1) * 9 + Math.sin(k * 9 + j) * 3), y = R(m[1] + k * k * 80 + j * 4); g.px(x, y, LEAF[5]); g.px(x + 1, y, LEAF[3]); g.px(x, y + 1, LEAF[2]); } }
  // the crown drops onto the head and stays (tilted a little, bouncing once)
  if (t >= T_CROWN - 0.05) {
    const top = res.P(6, -68), fall = 1 - ease(crownK), land = t > T_LAND ? Math.sin(Math.PI * clamp01((t - T_LAND) / CROWN_BOUNCE)) * 3 : 0;
    crownSprite().blit(c, top[0], top[1] - fall * 84 + land, { a: sm(t, T_CROWN - 0.05, T_CROWN + 0.2) });
    const sp = win(t, ...SPARKLE);
    if (sp > 0) { const g = fade(c, sp); for (let i = 0; i < 8; i++) { const an = i * 0.785 + (t - T_LAND) * 2, rr = 26 + (t - T_LAND) * 30; const x = R(top[0] + Math.cos(an) * rr), y = R(top[1] - 14 + Math.sin(an) * rr * 0.6); g.px(x, y, "#FFFFFF"); g.px(x - 1, y, "#FFE070"); g.px(x + 1, y, "#FFE070"); g.px(x, y - 1, "#FFE070"); g.px(x, y + 1, "#FFE070"); } }
  }
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND)) + 1, "LV 9", "wood", 1, t);
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  // grass blades along the ground line (sand-coloured beach grass at the coast) and big tufts at the bottom, swaying
  const gy = R(V.Y(LAND));
  for (let i = 0; i < 46; i++) {
    const wx = X0 + 6 + i * 11.7 + rnd(i * 3) * 6, x = V.X(wx); if (x < -10 || x > 550) continue; if (Math.abs(wx - EX) < 70 && rnd(i) < 0.6) continue; if (Math.abs(wx - PILE_X) < 40) continue;
    const n = 3 + (i % 3), sand = wx > COAST + 20;
    for (let b = 0; b < n; b++) { const h = (sand ? 5 : 8) + rnd(i * 7 + b) * (sand ? 9 : 14), lean = (b - n / 2) * 0.35, sw = Math.sin(t * 1.8 + i * 0.6 + b) * 0.25;
      for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x + b * 2 + (lean + sw) * k * 0.9 * u), gy + 3 - k, sand ? (u > 0.6 ? "#F0C890" : "#B88060") : u > 0.75 ? "#FFD08A" : u > 0.4 ? "#E8905A" : "#A8503A"); } }
  }
  for (let i = 0; i < 14; i++) {
    const wx = X0 + 10 + i * 40 + rnd(i * 9) * 20, x = V.X(wx), base = R(V.Y(LAND + 300 + (i % 3) * 8)); if (x < -20 || x > 560 || wx > COAST) continue;
    for (let b = 0; b < 7; b++) { const h = 26 + rnd(i * 13 + b) * 30, lean = (b - 3) * 0.3, sw = Math.sin(t * 1.5 + i + b * 0.4) * 0.3;
      for (let k = 0; k < h; k++) { const u = k / h; const xx = R(x + b * 3 + (lean + sw) * k * u); c.px(xx, base - k, u > 0.8 ? "#F8B070" : u > 0.4 ? "#C8683A" : "#7A3420"); c.px(xx + 1, base - k, u > 0.6 ? "#D87A48" : "#5A2418"); } }
  }
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  const ox = R(V.X(EX)) - 270;                                                 // tags follow the world while the camera pans
  const ha = win(t, ...TAG_HEAVY);
  if (ha > 0) tag(c, ["HEAVIEST ON LAND"], 270 + ox, 206 + R((1 - ha) * 4), ha, C.Y, 2);
  pickup(c, 410 + ox, 318, "6 T", (t - EV.six) / PICKUP_LIFE);                         // beside the head, over the right ear
  const ka = win(t, ...TAG_150);
  if (ka > 0) tag(c, ["150 KG / DAY"], 270 + ox, 206 + R((1 - ka) * 4), ka, C.GR, 2);
}
