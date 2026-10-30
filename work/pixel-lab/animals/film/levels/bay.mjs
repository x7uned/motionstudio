// LV7 · dolphin — a sunny afternoon bay (RANGE BIOME.bay = 2700..3240). The forest path runs down to a beach, the
// shallow bay (surface y 0, sandy floor ≈ y 300 with sea grass and shells) fills the middle, rocks rise back to the
// savanna. Dolphin A pops up at the sky disc facing the camera and whistles its "name" (a signature waveform that
// draws itself); its friend B swims away, a calendar flips to "20 YEARS", B comes back, whistles the same waveform
// (it slides onto A's and both glow), and the two leap out of the water. Everything is a pure function of t.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { drawWater, tod } from "../world.mjs";
import { blob, ell, tube, bez, eye, blush, smile, sign, pickup, tag, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01 } from "../cute.mjs";
import { smooth } from "../cute.mjs";
import { worldLayer, spriteCache, xf, thick, underwater, ditherEll, gaze } from "./bay-kit.mjs";

export const RANGE = BIOME.bay;
const R = Math.round, [X0, X1] = RANGE, WL = 0;                    // WL = water surface (world y)
const AX = 2970, BX = 3108, BUOY_X = 2852;                         // dolphin A (under the disc), friend B, LV buoy
const WATER_A = 2786, WATER_B = 3222;                              // water body x-range (the terrain covers what is not water)

// ---------------------------------------------------------------- palette
const DOL = RAMP.dolphin;
const BELLY = ["#22344C", "#3E5670", "#6A84A0", "#93AAC2", "#B8CADC", "#D6E2EE", "#EAF2FA", "#FFFFFF"];
const NAVY = ["#04060E", "#0A1024", "#142042", "#1E3262", "#2A4884", "#3C62A4", "#5A84C4", "#86AEE0"];
const SAND = ["#5A4028", "#80603A", "#A8804E", "#C89E62", "#DDB878", "#EBCB8E", "#F4DCA6", "#FCEBC4"];
const WET = ["#2E4E58", "#3E6468", "#527A76", "#6A8E82", "#86A690", "#A2BC9E", "#BED0AE", "#D8E4C0"];
const ROCK = ["#2A2228", "#3E3438", "#56484A", "#706058", "#8C7A6A", "#A8967E", "#C4B296", "#DDCCB0"];
const GRASS = ["#1E3A1C", "#2C5426", "#3C6E2E", "#548C38", "#6EA844", "#8EC056", "#B0D46E", "#D2E894"];
const DRY = ["#4A3410", "#6E4E18", "#94701E", "#B89030", "#D2AE48", "#E4C664", "#F0DA8A", "#FAEDB8"];

// ---------------------------------------------------------------- terrain profile (world y of the ground surface)
const G0 = X0 - 50, GN = X1 - X0 + 100;
const GROUND = (() => {
  const keys = [[X0 - 50, -20], [2738, -20], [2756, -16], [2772, -9], [2790, -3], [2804, 1], [2820, 26], [2842, 96], [2866, 182], [2892, 250], [2920, 286], [2960, 298],
    [3010, 302], [3060, 297], [3100, 300], [3128, 284], [3150, 236], [3168, 160], [3182, 84], [3194, 26], [3204, -6], [3218, -16], [3240, -20], [X1 + 50, -20]];
  const raw = new Float32Array(GN);
  for (let i = 0; i < GN; i++) { const x = G0 + i; let k = 0; while (k < keys.length - 2 && x > keys[k + 1][0]) k++; const [a, ya] = keys[k], [b, yb] = keys[k + 1]; raw[i] = ya + (yb - ya) * Math.min(1, Math.max(0, (x - a) / (b - a))); }
  let g = raw; for (let pass = 0; pass < 3; pass++) { const o = new Float32Array(GN); for (let i = 0; i < GN; i++) { let s = 0, n = 0; for (let j = -5; j <= 5; j++) { const q = i + j; if (q >= 0 && q < GN) { s += g[q]; n++; } } o[i] = s / n; } g = o; }
  for (let i = 0; i < GN; i++) { const x = G0 + i; if (x > 2900 && x < 3120) g[i] += Math.sin(x * 0.21) * 1.4 + Math.sin(x * 0.057) * 2.2; if (x < 2740 || x > 3240) g[i] = -20; }
  return g;
})();
export const ground = (x) => GROUND[Math.max(0, Math.min(GN - 1, R(x) - G0))];

// ---------------------------------------------------------------- static layers (drawn once)
const TOP = -480, LH = 1480;
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far sea band to the horizon (the receding surface) between the far headlands
  for (let wx = 2760; wx < 3215; wx++) for (let wy = -30; wy < 0; wy++) { const v = (wy + 30) / 30; px(wx, wy, v < 0.12 ? "#CFE8EC" : v < 0.45 ? ((v - 0.12) / 0.33 > bayer(wx, wy) ? "#8ACFD8" : "#A8DCE2") : (v - 0.45) / 0.55 > bayer(wx, wy) ? "#5EC0CE" : "#8ACFD8"); }
  // far headland on the right with a little lighthouse, far hills on the left (hazy)
  const hill = (pts, top, body) => { const P = smooth(pts.map(([x, y]) => [L(x), T(y)]), new Set(), 6); g.poly(P, body); for (let i = 0; i < P.length - 1; i++) { const [x, y] = P[i]; if (y < T(-2)) { g.px(R(x), R(y), top); g.px(R(x), R(y) + 1, top); } } };
  hill([[3086, 2], [3108, -14], [3136, -40], [3168, -58], [3196, -62], [3222, -44], [3240, -22], [3244, 2]], "#C2DCD8", "#9CC2C0");
  hill([[2738, 2], [2742, -24], [2766, -44], [2800, -50], [2834, -34], [2862, -16], [2880, 2]], "#C0DCCC", "#9CC4B4");
  for (let wy = -98; wy < -60; wy++) for (let wx = 3184; wx < 3194; wx++) { const band = ((wy + 98) / 8 | 0) % 2 === 1; px(wx, wy, wx > 3191 ? "#C8C4C0" : band ? "#E8605A" : "#FAF6EE"); }
  for (let wx = 3182; wx < 3196; wx++) px(wx, -99, "#5A5A6A"); for (let wx = 3185; wx < 3193; wx++) for (let wy = -106; wy < -99; wy++) px(wx, wy, wy < -103 ? "#E8605A" : "#FFF2A8");
  // ground: left land (grass → path → beach), underwater floor, cross-section strata down to the bottom
  for (let wx = X0 - 50; wx < X1; wx++) {
    const gy = Math.min(ground(wx), 296 + Math.sin(wx * 0.13) * 3), wet = gy > 1, grassy = wx < 2748 ? 1 : wx < 2768 ? (2768 - wx) / 20 : 0, path = wx > 2696 && wx < 2758;
    for (let wy = R(gy); wy < TOP + LH; wy++) {
      const d = wy - gy, b = bayer(wx, wy); let col = strata(wx, wy, d);
      if (wet) { col = d < 1.5 ? "#F2F2C8" : d < 3.5 ? "#DCE6B4" : d < 14 ? mix(col, "#7ABCB0", 0.3 * (1 - (d - 3.5) / 10.5)) : col; }
      else if (d < 4 && grassy > b && !(path && d >= 0)) col = d < 1.5 ? GRASS[6] : GRASS[4];
      else if (d < 3 && path) col = d < 1.5 ? "#E2C08E" : "#C49A66";
      else if (d < 2) col = SAND[7];
      else if (grassy > 0.4 && d < 16 + Math.sin(wx * 0.3) * 2) col = d < 6 ? "#7A5232" : "#6A4628";
      px(wx, wy, col);
    }
  }
  // a leaning palm at the top of the beach (fronds sway, drawn per frame)
  { const pts = bez([L(2712), T(-18)], [L(2716), T(-150)], [L(2758), T(-226)], 40);
    pts.forEach(([x, y], i) => { const r = 7 - i * 0.06; for (let j = -R(r); j <= R(r); j++) { const ring = (i % 5) === 0, u = j / r; g.px(R(x + j), R(y), ring ? "#6A4A2E" : u < -0.3 ? "#B88A58" : u < 0.4 ? "#9A6E44" : "#7A5434"); } g.px(R(x - r - 1), R(y), "#3A2616"); g.px(R(x + r + 1), R(y), "#3A2616"); });
    for (const [dx, dy] of [[-6, 4], [5, 5], [0, 9]]) blob(g, [ell(L(2758 + dx), T(-226 + dy), 5, 5)], { ramp: ["#1E1208", "#3A2412", "#5A3A1E", "#7A5230", "#946840", "#AE8456", "#C8A070", "#E0BE90"], thick: 4 }); }
  // grass clumps and small bushes where the forest thins out, beach grass on the dune
  for (let i = 0; i < 9; i++) { const wx = X0 - 34 + i * 9 + rnd(i) * 6, gy = ground(wx); if (wx > 2750) continue; for (let b = -3; b <= 3; b++) { const h = 6 + rnd(i * 9 + b) * 9; for (let k = 0; k < h; k++) px(R(wx + b * 2 + (b * k) / 6), R(gy - k), k > h - 3 ? GRASS[6] : GRASS[3 + (k > h / 2 ? 1 : 0)]); } }
  for (const [wx, r] of [[2706, 13], [2724, 9]]) { blob(g, [ell(L(wx), T(-20 - r * 0.6), r * 1.3, r)], { ramp: GRASS, thick: 8, base: 3.4 }); }
  // beach shells and a starfish
  for (const [wx, col] of [[2779, "#F8C8C0"], [2794, "#FFF0E0"], [2768, "#F0D0F0"]]) { const gy = R(ground(wx)) - 1; px(wx, gy, col); px(wx + 1, gy, col); px(wx - 1, gy, mix(col, "#806040", 0.4)); px(wx, gy - 1, col); }
  // underwater floor decor: shells, pebbles, a starfish, sand ripples
  for (let i = 0; i < 26; i++) { const wx = 2850 + rnd(i * 3) * 300, gy = R(ground(wx)); const k = rnd(i * 5); if (k < 0.4) { px(wx, gy - 1, "#E8D8C8"); px(wx + 1, gy - 1, "#F8EAE0"); px(wx - 1, gy, "#B8A898"); px(wx + 2, gy, "#B8A898"); } else if (k < 0.75) { for (let dx = -2; dx <= 2; dx++) px(wx + dx, gy - (Math.abs(dx) < 2 ? 2 : 1), "#7E8E86"); px(wx - 1, gy - 2, "#A4B4A8"); } else { px(wx, gy - 1, "#F4A4B4"); px(wx + 1, gy - 1, "#E890A4"); } }
  const star = (wx, wy, col, hi) => { for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5; for (let r = 0; r < 6; r++) px(R(wx + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.6), r < 2 ? hi : col); } px(wx, wy, hi); };
  star(2934, R(ground(2934)) - 3, "#E87A4A", "#F8B070"); star(2786, R(ground(2786)) - 3, "#F08A5A", "#FFC48A");
}
// right rocky rise (drawn in front so the friend can swim away behind it), dry golden grass toward the savanna
function paintRocks(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // a pile of big rounded stones: nearest-seed cells, each with its own tone, lit top-left rims and dark joints
  const seeds = []; for (let i = 0; i < 46; i++) { const u = rnd(i * 17 + 3), wy = -24 + rnd(i * 5 + 1) * 330, edge = 3128 + (3204 - 3128) * (1 - Math.min(1, Math.max(0, (wy + 6) / 290))); seeds.push([edge - 6 + u * (X1 + 6 - edge), wy, rnd(i * 23)]); }
  for (let wx = 3112; wx < X1 + 2; wx++) {
    const gy = ground(wx); if (gy > 292) continue;
    for (let wy = R(gy); wy < 306 + Math.sin(wx * 0.3) * 3; wy++) {
      let d1 = 1e9, d2 = 1e9, s1 = null; for (const sd of seeds) { const d = (wx - sd[0]) ** 2 + ((wy - sd[1]) * 1.25) ** 2; if (d < d1) { d2 = d1; d1 = d; s1 = sd; } else if (d < d2) d2 = d; }
      const gap = Math.sqrt(d2) - Math.sqrt(d1), b = bayer(wx, wy);
      let k = 3.8 + s1[2] * 1.4;
      const lx = wx - s1[0], ly = (wy - s1[1]) * 1.25, rr = Math.sqrt(d1);
      if (gap < 1.6) k = 1.2; else if (gap < 3.5 && (lx + ly) < 0) k += 1.3; else if (gap < 3.5) k -= 1.0; else k += (-(lx + ly) / (rr + 8)) * 0.8;
      if (wy - gy < 2) k = Math.max(k, 6.2);
      const lo = Math.floor(k); let col = ROCK[Math.max(1, Math.min(7, k - lo > b ? lo + 1 : lo))];
      if (wy > 1) col = mix(col, "#2A98B0", 0.3 + Math.min(0.16, wy / 1400));
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 18; i++) { const wx = 3196 + rnd(i * 7) * 30, wy = 1 + rnd(i * 3) * 8; if (wy < ground(wx)) continue; px(R(wx), R(wy), "#E8F0E8"); px(R(wx) + 1, R(wy), "#9AB0B0"); }
  for (let i = 0; i < 8; i++) { const wx = 3200 + i * 6 + rnd(i) * 4, gy = ground(wx); for (let b = -2; b <= 2; b++) { const h = 6 + rnd(i * 11 + b) * 11; for (let k = 0; k < h; k++) px(R(wx + (b * k) / 4), R(gy - k), DRY[k > h - 3 ? 6 : k > h / 2 ? 5 : 3]); } }
  // kelp on the stones
  for (let i = 0; i < 5; i++) { const wx = 3150 + i * 11, gy = ground(wx); for (let k = 0; k < 20 + i * 4; k++) px(R(wx - 4 + Math.sin(k * 0.3 + i) * 2), R(gy + 30 - k), mix("#4E9A62", "#2A98B0", 0.3)); }
}
// sand strata (gently wavy horizontal layers, darker with depth, a few pebbles and tiny shells)
const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
function strata(wx, wy, d) {
  const wv = Math.sin(wx * 0.031) * 5 + Math.sin(wx * 0.11) * 2, v = (wy + wv + 400) / 22, band = Math.floor(v), f = v - band;
  let col = STRATA[band % STRATA.length]; if (f < 0.08 && bayer(wx, wy) > 0.4) col = mix(col, "#7A5636", 0.22);
  if (wy > 120) col = mix(col, "#8A6440", Math.min(0.45, (wy - 120) / 700));
  if (d > 6 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF4D8", 0.5); else if (d > 6 && rnd(wx * 29 + wy * 17) < 0.005) col = mix(col, "#5A3A22", 0.45);
  return col;
}
let BACK = null, ROCKS = null;
const backLayer = () => BACK ??= worldLayer(X0 - 50, TOP, X1 - X0 + 100, LH, paintBack);
const rockLayer = () => ROCKS ??= worldLayer(3140, TOP, X1 + 40 - 3140, LH, paintRocks);

// ---------------------------------------------------------------- dolphins
const SPR = spriteCache(40);
/** Front-view dolphin body (head, body, belly, beak, flukes) rendered once per scale/tilt; anchor = head centre. */
function frontBody(s, rot) {
  const q = R(rot / 0.03), key = `F${s}|${q}`, W = 240, H = 360, ox = 120, oy = 80;
  return SPR(key, W, H, ox, oy, (g, ax, ay) => {
    const P = xf(ax, ay, s, q * 0.03);
    const fl = [[-6, 206], [-30, 216], [-56, 230], [-50, 240], [-24, 233], [0, 240], [24, 233], [50, 240], [56, 230], [30, 216], [6, 206]];
    blob(g, [smooth(P.poly(fl), new Set(), 4)], { ramp: DOL, thick: 6, base: 3.2 });
    const prof = [[20, 40], [50, 49], [84, 49], [118, 43], [150, 33], [178, 21], [198, 12], [210, 9]];
    const body = smooth([...prof.map(([y, w]) => P(-w, y)), P(0, 216), ...prof.slice().reverse().map(([y, w]) => P(w, y))], new Set(), 4);
    blob(g, [body, P.poly(ell(0, 0, 52, 45)), P.poly(ell(0, -12, 44, 38))], { ramp: DOL, thick: 26, base: 3.0, gain: 2.5, slope: 0.4, litOutline: DOL[2] });
    blob(g, [P.poly(ell(0, 104, 29, 88))], { ramp: BELLY, thick: 16, base: 3.4, gain: 1.8, slope: 0.4, outline: DOL[3] });
    blob(g, [P.poly(ell(0, 30, 25, 14)), P.poly(ell(0, 25, 19, 11))], { ramp: BELLY, thick: 8, base: 3.9, gain: 1.6, outline: DOL[2] });
    for (const [dx, dy] of [[-3, -46], [-2, -47], [-1, -47], [0, -47], [1, -47], [2, -47], [3, -46]]) { const p = P(dx, dy); g.px(R(p[0]), R(p[1]), DOL[1]); }
  });
}
/** Side-view swimming dolphin (facing right), fluke phase quantised; anchor = body centre. */
function sideBody(s, ph) {
  const q = ((R(ph * 8) % 8) + 8) % 8, key = `S${s}|${q}`, W = 200, H = 110, ox = 100, oy = 55;
  return SPR(key, W, H, ox, oy, (g, ax, ay) => {
    const P = xf(ax, ay, s, 0), fy = Math.sin((q / 8) * 2 * Math.PI) * 7;
    blob(g, [smooth(P.poly([[-60, 2], [-78, -10 + fy], [-84, -12 + fy], [-76, 2 + fy], [-84, 14 + fy], [-78, 13 + fy]]), new Set(), 3)], { ramp: DOL, thick: 4 });
    blob(g, [smooth(P.poly([[-12, -16], [-24, -36], [-18, -37], [6, -18]]), new Set(), 3)], { ramp: DOL, thick: 4 });
    blob(g, [smooth(P.poly([[-66, 1 + fy * 0.3], [-46, -6], [-22, -15], [2, -19], [24, -18], [40, -12], [50, -4], [66, 0], [66, 4], [50, 6], [38, 11], [18, 16], [-8, 16], [-32, 11], [-56, 5]]), new Set(), 4)], { ramp: DOL, thick: 12, base: 3.1, gain: 2.2, litOutline: DOL[2] });
    blob(g, [smooth(P.poly([[-40, 8], [-14, 13], [16, 14], [38, 9], [56, 4], [44, 6], [16, 11], [-14, 11]]), new Set(), 3)], { ramp: BELLY, thick: 4, base: 4.2, outline: BELLY[3] });
    blob(g, [tube([P(14, 12), P(8, 22), P(2, 28)], 5 * s, 3 * s)], { ramp: DOL, thick: 3 });
  });
}
function sideFace(g, x, y, s, dir, t, ph) {
  const P = (dx, dy) => [x + dx * s * dir, y + dy * s];
  const e = P(34, -6); eye(g, e[0], e[1], 4.2 * s, { iris: NAVY, pupil: "round", look: [dir * 0.6, 0], blink: blinkAt(t, 3.1, ph), lid: DOL[4] });
  for (let k = 0; k <= 12; k++) { const p = P(48 + k, 3 - (k > 9 ? (k - 9) * 0.6 : 0)); g.px(R(p[0]), R(p[1]), DOL[1]); }
  blush(g, ...P(42, 4), 4 * s, 1.8 * s, "#F27A9A");
}
/** Front-view dolphin at screen (x, headY): body sprite + flippers + face; o.wl = waterline row (below it everything looks submerged). */
function dolphinFront(c, x, y, s, o) {
  const rot = o.rot ?? 0, wl = o.wl, wetK = (yy) => Math.min(0.62, 0.42 + (yy - wl) / 700), a = o.a ?? 1;
  const g = underwater(c, wl);
  // flippers (behind the body), waving
  const P = xf(x, y, s, rot);
  for (const sd of [-1, 1]) { const w = Math.sin(o.t * 4.2 + sd) * 0.18 + (o.flap ?? 0); const base = P(sd * 42, 62), tip = P(sd * (78 + w * 10), 92 - w * 30); blob(fade(g, a), [tube([base, [lerp(base[0], tip[0], 0.55), lerp(base[1], tip[1], 0.4) + 4], tip], 11 * s, 6 * s)], { ramp: DOL, thick: 6, base: 3.0 }); }
  frontBody(s, rot).blit(c, x, y, { below: wl, tint: "#2AA8C0", k: wetK, a });
  // face
  const f = fade(g, a), E = (dx, dy) => P(dx, dy), bl = o.blink ?? 0, look = o.look ?? [0, 0.1];
  for (const sd of [-1, 1]) { const p = E(sd * 22, -8); eye(g, p[0], p[1], 12 * s, { iris: NAVY, pupil: "round", ry: 13 * s, look, blink: bl, lid: DOL[4], a }); }
  for (const sd of [-1, 1]) { const p = E(sd * 36, 12); blush(g, p[0], p[1], 8 * s, 3.4 * s, "#F27A9A", a); }
  const m = E(0, 33);
  if ((o.open ?? 0) > 0.1) smile(g, m[0], m[1], 7 * s, { open: o.open, a });
  else { const w = 15 * s; for (let k = -w; k <= w; k++) { const u = k / w; f.px(R(m[0] + k), R(m[1] + 3 * s * (1 - u * u) - (Math.abs(u) > 0.85 ? 1 : 0)), DOL[0]); } f.px(R(m[0] - w - 1), R(m[1] - 1), DOL[1]); f.px(R(m[0] + w + 1), R(m[1] - 1), DOL[1]); }
}

// ---------------------------------------------------------------- choreography (all from words)
// every timing below is shared with levels/bay-motions.mjs (8-bit sounds last exactly as long as these motions)
export const T_APOP = EV.dolphin - 0.42, T_BPOP = EV.dolphin + 0.05;
export const T_BDIVE = EV.friend + 0.02, T_BGONE = EV.friend + 0.75, T_BBACK = EV.twenty - 0.36, T_BUP = EV.apart - 0.42;
export const T_LEAP = EV.apart + 0.62;
const LIFT_UP = 150, LIFT_DOWN = -70, APEX = 305;
export const LEAP_D = 0.78, POP_A = 0.5, POP_B = 0.4, DIVE_D = 0.32, SWIM0 = 0.18, SWIM_D = 0.62, B_LEAP_DELAY = 0.07;
/** splashes: [time, dolphin, size, seed]; each lives SPLASH_LIFE s (droplets fall back, foam crown 0.45 s) */
export const SPLASHES = [[T_APOP + 0.12, "A", 1.1, 3], [T_BPOP + 0.12, "B", 0.9, 5], [T_BDIVE + 0.1, "B", 0.8, 7], [T_BUP + 0.1, "B", 0.9, 9],
  [T_LEAP + 0.05, "A", 1.2, 11], [T_LEAP + 0.12, "B", 1.1, 13], [T_LEAP + LEAP_D * 0.86, "A", 1.3, 15], [T_LEAP + B_LEAP_DELAY + LEAP_D * 0.86, "B", 1.2, 17]];
export const SPLASH_LIFE = 0.9;
/** whistles: A draws from "whistle," to "name."; B draws WB_DRAW s from "apart.", slides onto A's from +WB_SLIDE0 for WB_SLIDE s; both glow in MATCH; the heart pops at HEART[0] for HEART[1] s */
export const WA_OUT = [T_LEAP + 0.02, T_LEAP + 0.24];                      // A's whistle (and the match glow) dissolves as they leap
export const WB_DRAW = 0.3, WB_SLIDE0 = 0.28, WB_SLIDE = 0.2, MATCH = [EV.apart + 0.42, EV.apart + 0.55], HEART = [EV.apart + 0.5, 1.1], PICKUP_LIFE = 1.6;
/** tear-off calendar: shown from CAL.show, each flip k (start CAL.flips[k-1], CAL.flipDur s) carries years[k-1] away and reveals years[k] */
export const CAL = (() => { const years = [1, 2, 3, 4, 6, 8, 11, 14, 17, 20], first = EV.knows + 0.1, last = EV.twenty - 0.1, n = years.length - 1;
  return { show: EV.knows - 0.05, fadeIn: 0.25, years, flipDur: 0.3, flips: years.slice(1).map((_, i) => first + ((last - first) * i) / (n - 1)), tag: EV.twenty, tagIn: 0.22 }; })();
/** Head-centre height above the waterline for dolphin A / B at time t (popped ≈ 165 with a gentle bob). */
function liftA(t) {
  const bob = Math.sin(t * 3.9) * 2.5;
  if (t < T_APOP) return LIFT_DOWN + Math.sin(t * 2) * 4;
  if (t < T_LEAP) return lerp(LIFT_DOWN, LIFT_UP, popEase((t - T_APOP) / POP_A)) + bob * sm(t, T_APOP + 0.4, T_APOP + 0.8);
  return leapLift(t - T_LEAP) + bob * sm(t, T_LEAP + LEAP_D + 0.5, T_LEAP + LEAP_D + 1);
}
function liftB(t) {
  const bob = Math.sin(t * 3.9 + 1.7) * 2.5, d = T_LEAP + B_LEAP_DELAY;
  if (t < T_BPOP) return LIFT_DOWN;
  if (t < T_BDIVE) return lerp(LIFT_DOWN, LIFT_UP, popEase((t - T_BPOP) / POP_A)) + bob * sm(t, T_BPOP + 0.4, T_BPOP + 0.8);
  if (t < T_BUP) return lerp(LIFT_UP, LIFT_DOWN - 30, ease((t - T_BDIVE) / DIVE_D));
  if (t < d) return lerp(LIFT_DOWN, LIFT_UP, popEase((t - T_BUP) / POP_B)) + bob * sm(t, T_BUP + 0.35, T_BUP + 0.6);
  return leapLift(t - d);
}
const popEase = (k) => { k = clamp01(k); return 1 - Math.pow(1 - k, 3) + Math.sin(Math.PI * k) * 0.08; };
function leapLift(u) {             // up from the popped pose to the apex, then down under the water, then back to popped
  if (u < LEAP_D) { const k = u / LEAP_D; return LIFT_UP + (APEX - LIFT_UP) * 4 * k * (1 - k) * 1.0 - (LIFT_UP - LIFT_DOWN) * Math.max(0, k - 0.5) * 2 * Math.max(0, k - 0.5) * 2; }
  return lerp(LIFT_DOWN, LIFT_UP, popEase((u - LEAP_D - 0.15) / 0.6));
}
const leapRot = (u, sd) => (u > 0 && u < LEAP_D + 0.3 ? sd * Math.sin(Math.PI * Math.min(1, u / (LEAP_D + 0.3))) * 0.17 : 0);

// splash: droplets thrown from a surface point at time t0 (pure function of t)
function splash(c, x, wly, t, t0, size = 1, seed = 1) {
  const u = t - t0; if (u < 0 || u > SPLASH_LIFE) return;
  const a = 1 - sm(u, 0.5, SPLASH_LIFE), g = fade(c, a);
  for (let i = 0; i < 22; i++) {
    const vx = (rnd(seed * 97 + i) - 0.5) * 150 * size, vy = -(110 + rnd(seed * 31 + i * 7) * 150) * size, sx = x + (rnd(seed + i * 13) - 0.5) * 50 * size;
    const px = R(sx + vx * u), py = R(wly + vy * u + 520 * u * u); if (py > wly + 2) continue;
    g.rect(px, py, 2, 2, i % 3 ? "#E8FFFF" : "#9AE8F4"); if (i % 4 === 0) g.px(px, py - 1, "#FFFFFF");
  }
  // foam crown
  const cr = 1 - sm(u, 0, 0.45), w = R(26 * size + u * 30);
  if (cr > 0) { const f = fade(c, cr); for (let k = -w; k <= w; k++) { const h = R((1 - (k / w) ** 2) * 10 * size * Math.sin(Math.PI * Math.min(1, u / 0.45))); for (let j = 0; j < h; j++) if ((k + j) % 3) f.px(R(x + k), R(wly - j), j > h - 2 ? "#FFFFFF" : "#BFF6FF"); } }
}
function waterline(c, x, wly, hw, t, a = 1) {   // foam where a body breaks the surface
  const g = fade(c, a);
  for (let k = -hw - 6; k <= hw + 6; k++) { const yy = wly + R(Math.sin(k * 0.5 + t * 6) * 0.8); g.px(R(x + k), yy, Math.abs(k) > hw ? "#BFF6FF" : "#FFFFFF"); if ((k + R(t * 10)) % 5 === 0) g.px(R(x + k), yy + 1, "#E8FFFF"); }
}

// the whistle "name": a frequency-modulated squiggle drawn like a signature
const WH_W = 200, WH_A = 22;
/** the whistle's shape along its length u = 0..1: loudness envelope and phase (cycles); shared with the sound cue list */
export const whistleEnv = (u) => Math.pow(Math.sin(Math.PI * u), 0.55) * (0.72 + 0.28 * Math.sin(2 * Math.PI * u * 1.7 + 0.6));
export const whistleCycles = (u) => 2.6 * u + 2.1 * u * u + 0.18 * Math.sin(2 * Math.PI * u * 1.3);
function whistlePts(cx, cy, s = 1) {
  const pts = [];
  for (let i = 0; i <= WH_W; i++) { const u = i / WH_W, env = whistleEnv(u), ph = 2 * Math.PI * whistleCycles(u); pts.push([cx + (i - WH_W / 2) * s, cy - env * Math.sin(ph) * WH_A * s - (u - 0.5) * 8 * s]); }
  return pts;
}
function drawWhistle(c, pts, k, col, glow = 0, a = 1, t = 0) {
  if (a <= 0 || k <= 0) return; const n = Math.max(2, R(pts.length * clamp01(k))), seg = pts.slice(0, n), g = fade(c, a);
  if (glow > 0) { const h = fade(c, a * glow * 0.6); thick(h, seg, 6, mix(col, "#FFFFFF", 0.5)); }
  thick(g, seg, 3, C.O); thick(g, seg, 2, glow > 0 ? mix(col, "#FFFFFF", glow * 0.6) : col); thick(g, seg, 0, mix(col, "#FFFFFF", 0.45 + glow * 0.5));
  if (k < 1) { const [x, y] = seg[seg.length - 1]; g.rect(R(x) - 1, R(y) - 4, 3, 9, "#FFFFFF"); g.rect(R(x) - 4, R(y) - 1, 9, 3, "#FFFFFF"); }
  if (glow > 0.2) for (let i = 0; i < 10; i++) { const p = pts[R(rnd(i * 3) * (pts.length - 1))], tw = Math.sin(t * 9 + i * 2) > 0.2; if (tw) { const x = R(p[0] + (rnd(i * 7) - 0.5) * 30), y = R(p[1] + (rnd(i * 11) - 0.5) * 30); g.px(x, y, "#FFFFFF"); g.px(x + 1, y, "#FFF6B8"); g.px(x - 1, y, "#FFF6B8"); g.px(x, y + 1, "#FFF6B8"); g.px(x, y - 1, "#FFF6B8"); } }
}

// tear-off calendar: every flip lifts the top page (with its year on it) off over the top edge and away, revealing the next
function calendar(c, x, y, t, a) {
  if (a <= 0) return; const g = fade(c, a), w = 48, h = 50, py = y + 13, ph = h - 17;
  const shown = CAL.flips.filter((f) => t >= f).length;
  const page = (g2, px0, py0, pw, phh, n, clip) => {                     // a page with its year, clipped to its own rect
    g2.rect(px0, py0, pw, phh, "#FDFEED"); g2.rect(px0, py0 + phh - 1, pw, 1, "#D8D4C8");
    const s = String(n), tw = c.measure(MAIN, s, { scale: 3 }), tx = R(x + w / 2 - tw / 2) + (px0 - x), ty = y + 22 + (py0 - py);
    g2.text(MAIN, s, tx, ty, "#2A2440", { scale: 3, colorAt: (X, Y) => (X >= clip[0] && X < clip[2] && Y >= clip[1] && Y < clip[3] ? "#2A2440" : null) });
  };
  g.rrect(x - 1, y - 1, w + 2, h + 2, C.O, 2); g.rect(x, y + h - 4, w, 4, "#D8D4C8");
  page(g, x, py, w, ph - 4, CAL.years[shown], [x, py, x + w, py + ph - 4]);
  g.rrect(x, y, w, 13, "#E0505A", 2); g.rect(x, y + 10, w, 3, "#B83A44");
  for (const rx of [x + 12, x + w - 14]) { g.rect(rx, y - 4, 3, 8, "#5A5A6A"); g.px(rx + 1, y - 4, "#9A9AAA"); }
  g.text(MAIN, "YEAR", x + 9, y + 3, "#FFE8E0", { scale: 1 });
  // pages in flight (in front): each starts exactly on the calendar page (nothing changes in one frame), then is carried
  // up and to the right with its year on it, folding shut and dissolving
  CAL.flips.forEach((f, k) => {
    const u = (t - f) / CAL.flipDur; if (u < 0 || u >= 1) return;
    const e = ease(u), pa = a * (1 - sm(u, 0.55, 1)), pg = fade(c, pa), fold = 1 - 0.65 * sm(u, 0.3, 1);
    const px0 = R(x + e * 44), py0 = R(py - e * 30 - Math.sin(Math.PI * u) * (6 + (k % 3) * 4)), phh = Math.max(2, R((ph - 4) * fold));
    fade(c, pa * sm(u, 0, 0.2)).rect(px0 - 1, py0 - 1, w + 2, phh + 2, "#8A8478");
    page(pg, px0, py0, w, phh, CAL.years[k], [px0, py0, px0 + w, py0 + phh]);
  });
}
// a little heart pops between the two friends when the whistles match
function heart(c, x, y, k) {
  if (k <= 0 || k >= 1) return; const a = Math.min(sm(k, 0, 0.15), 1 - sm(k, 0.7, 1)), g = fade(c, a), yy = R(y - 30 * ease(k)), s = k < 0.15 ? 1 + (0.15 - k) * 4 : 1;
  const rows = [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== "#") return; const X = R(x + (i - 4) * 3 * s), Y = R(yy + j * 3 * s); g.rect(X, Y, 3, 3, j < 2 && i > 0 && i < 3 ? "#FFC0D8" : "#FF5A8A"); }));
  for (const [dx, dy] of [[-18, -2], [18, -4], [0, -10]]) { g.px(R(x + dx), R(yy + dy), "#FFFFFF"); g.px(R(x + dx) + 1, R(yy + dy), "#FFE0EC"); g.px(R(x + dx), R(yy + dy) + 1, "#FFE0EC"); }
}

// ---------------------------------------------------------------- level exports
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function fill(c, V, t) { if (!onScreen(V)) return; drawWater(c, V, t, WATER_A, WATER_B, WL); }

export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 40))), x1: Math.min(540, R(V.X(X1 + 40))) });
  // palm fronds swaying in the breeze
  { const cx = V.X(2758), cy = V.Y(-228);
    for (let i = 0; i < 8; i++) { const ang = -Math.PI * (0.06 + i * 0.125) + Math.sin(t * 1.3 + i * 0.9) * 0.05, len = 58 + (i % 3) * 9, droop = 0.9 + (i % 2) * 0.3;
      const pts = []; for (let k = 0; k <= 14; k++) { const u = k / 14, a2 = ang + Math.sign(Math.cos(ang)) * droop * u * u; pts.push([cx + Math.cos(ang) * len * u * 0.6 + Math.cos(a2) * len * u * 0.4, cy + Math.sin(ang) * len * u * 0.6 + Math.sin(a2) * len * u * 0.4 + u * u * 18]); }
      for (let k = 1; k < pts.length; k++) { const [x, y] = pts[k], [x0, y0] = pts[k - 1], dx = x - x0, dy = y - y0, n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, lf = 9 * Math.sin(Math.PI * (k / 14)) + 2;
        for (const sd of [-1, 1]) for (let j = 1; j <= lf; j++) { const qx = R(x + nx * j * sd + dx * j * 0.08), qy = R(y + ny * j * sd + j * 0.5); c.px(qx, qy, j > lf - 2 ? "#2E6A2A" : sd > 0 ? "#5AA040" : "#7CC050"); }
        c.px(R(x), R(y), "#3E7A2A"); c.px(R(x), R(y) + 1, "#2A5A20"); } } }
  // sun glitter on the far sea band, a little sailboat on the horizon
  for (let i = 0; i < 26; i++) { const wx = 2910 + rnd(i * 5) * 120, wy = -26 + rnd(i * 9) * 24, on = Math.sin(t * (4 + rnd(i) * 5) + i * 1.3); if (on > 0.35) { const x = R(V.X(wx)), y = R(V.Y(wy)); c.px(x, y, "#FFFBE0"); if (on > 0.8) { c.px(x - 1, y, "#FFF0B0"); c.px(x + 1, y, "#FFF0B0"); } } }
  const bx = R(V.X(3046 + Math.sin(t * 0.15) * 14)), by = R(V.Y(-28)); c.rect(bx - 7, by, 15, 2, "#7A4A3A"); c.rect(bx - 5, by + 2, 11, 1, "#5A3428"); for (let j = 0; j < 12; j++) { c.rect(bx - R(j * 0.55), by - 2 - j, R(j * 0.55) + 1, 1, "#FDFEED"); c.px(bx + 1, by - 2 - j, "#7A4A3A"); } c.rect(bx + 2, by - 9, 4, 6, "#E8605A");
  // sea grass swaying on the floor, a little school of fish
  const sg = fade(c, 1);
  for (let i = 0; i < 16; i++) {
    const wx = 2858 + i * 18 + rnd(i * 7) * 10; if (Math.abs(wx - AX) < 24) continue; const gy = ground(wx), n = 3 + (i % 3);
    for (let b = 0; b < n; b++) { const h = 22 + rnd(i * 11 + b) * 34, ph = t * 1.6 + i * 0.7 + b; let px0 = V.X(wx + (b - n / 2) * 3), py0 = V.Y(gy);
      for (let k = 0; k < h; k += 2) { const sw = Math.sin(ph + k * 0.08) * (k / h) * 7, x = R(px0 + sw), y = R(py0 - k); sg.px(x, y, k > h * 0.7 ? "#7AC08A" : "#4E9A72"); sg.px(x, y - 1, k > h * 0.7 ? "#8ED09A" : "#5AA67C"); if (b === 0) sg.px(x + 1, y, "#3A7A62"); } }
  }
  for (let i = 0; i < 7; i++) {
    const per = 14, u = ((t / per + i * 0.02) % 1), dir = u < 0.5 ? 1 : -1, k = u < 0.5 ? u * 2 : 2 - u * 2, wx = 2860 + ease(k) * 280 + (i % 3) * 9, wy = 236 + (i * 7) % 26 + Math.sin(t * 3 + i) * 2;
    const x = R(V.X(wx)), y = R(V.Y(wy)); if (x < -6 || x > 546) continue;
    const body = ["#F4C04A", "#E89A3A", "#FFE08A"], g = underwater(c, R(V.Y(WL)));
    g.rect(x - 3, y - 1, 7, 3, body[0]); g.rect(x - 2, y - 2, 5, 1, body[2]); g.rect(x - 2, y + 2, 5, 1, body[1]); const tx = x - dir * 5; g.px(tx, y - 1, body[1]); g.px(tx, y + 1, body[1]); g.px(tx + dir, y, body[1]); g.px(x + dir * 2, y - 1, C.O);
  }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const wly = R(V.Y(WL));
  // LV 7 buoy floating in the bay
  { const x = R(V.X(BUOY_X)), bob = Math.sin(t * 2.3) * 2, y = R(wly - 6 + bob); const g = underwater(c, wly);
    for (let j = -8; j <= 10; j++) { const hw = R(Math.sqrt(Math.max(0, 1 - (j / 10.5) ** 2)) * 10); g.rect(x - hw, y + j, hw * 2 + 1, 1, j < -2 ? "#F4EEE0" : j < 4 ? "#D8443C" : "#9A2A2A"); g.px(x - hw, y + j, "#5A1A1E"); g.px(x + hw, y + j, "#5A1A1E"); }
    sign(c, x, y - 8, "LV 7", "buoy", 1, t); waterline(c, x, wly, 10, t); }
  // dolphin B (friend): front view while near, side view when swimming away and back
  const bLift = liftB(t), bS = 0.86;
  const bFrontA = t < T_BDIVE + 0.3 ? 1 - sm(t, T_BDIVE + 0.18, T_BDIVE + 0.32) : sm(t, T_BUP - 0.02, T_BUP + 0.12);
  const sideA = Math.min(sm(t, T_BDIVE + 0.18, T_BDIVE + 0.32), 1 - sm(t, T_BUP - 0.02, T_BUP + 0.12));
  if (sideA > 0 && t < T_BUP + 0.2) {
    let wx, wy, dir;
    if (t < T_BGONE + 0.4) { const k = clamp01((t - T_BDIVE - SWIM0) / SWIM_D); wx = BX + ease(k) * 0 + Math.pow(k, 1.6) * 230; wy = 96 + Math.sin(k * 3) * 6; dir = 1; }
    else { const k = clamp01((t - T_BBACK) / (T_BUP - T_BBACK)); wx = BX + 230 * Math.pow(1 - k, 1.5); wy = 96 - k * 10; dir = -1; }
    const x = R(V.X(wx)), y = R(V.Y(wy)), ph = t * 2.2;
    sideBody(bS, ph).blit(c, x, y, { below: wly, tint: "#2AA8C0", k: () => 0.48, a: sideA, flip: dir < 0 });
    sideFace(fade(underwater(c, wly), sideA), x, y, bS, dir, t, 0.9);
    if (rnd(R(t * 6)) < 0.6) { const bb = fade(c, sideA * 0.8); const u = (t * 1.5) % 1; bb.px(R(x + dir * 40), R(y - 20 - u * 30), "#CFF8FF"); }
  }
  const bx = R(V.X(BX)), bHead = wly - bLift * bS;
  if (bFrontA > 0) {
    const happy = Math.max(sm(t, EV.apart, EV.apart + 0.3), 1 - sm(t, EV.name + 0.6, EV.name + 1.0)) * 0.6;
    const look = gaze(t, [[0, [-0.2, 0.1]], [EV.whistle, [-0.9, 0.05]], [T_BDIVE, [-0.9, 0]], [T_LEAP, [-0.3, -0.4]]]);
    dolphinFront(c, bx, bHead, bS, { wl: wly, t, a: bFrontA, rot: leapRot(t - T_LEAP - B_LEAP_DELAY, -1), blink: blinkAt(t, 3.4, 1.2), look, open: happy });
    if (bLift > -20 && bLift < 250) waterline(c, bx, wly, R((bLift > 120 ? 30 : 46) * bS), t, bFrontA);
  }
  // dolphin A, centred under the disc
  const aLift = liftA(t), ax = R(V.X(AX)), aHead = wly - aLift;
  const away = sm(t, T_BDIVE + 0.1, T_BDIVE + 0.4) * (1 - sm(t, T_BUP, T_BUP + 0.3));
  const lookA = gaze(t, [[0, [0, 0.15]], [EV.whistle, [0, -0.3]], [EV.name + 0.4, [0.6, 0.1]], [T_BDIVE + 0.2, [1, 0.2]], [T_BBACK, [0.9, 0]], [T_LEAP, [0.2, -0.4]]]);
  const openA = Math.max(sm(t, EV.whistle, EV.whistle + 0.2) * (1 - sm(t, EV.name + 0.3, EV.name + 0.6)) * 0.5, sm(t, EV.apart + 0.2, EV.apart + 0.45) * 0.9);
  dolphinFront(c, ax, aHead, 1, { wl: wly, t, rot: leapRot(t - T_LEAP, 1), blink: blinkAt(t, 3.7, 0.3), look: lookA, open: openA, flap: Math.sin(t * 7) * 0.25 * sm(t, EV.apart, EV.apart + 0.3) });
  if (aLift > -20 && aLift < 250) waterline(c, ax, wly, R(aLift > 120 ? 30 : 46), t);
  // splashes: A pops up, B pops, B dives, B returns, both leap out and fall back in
  for (const [t0, who, size, seed] of SPLASHES) splash(c, who === "A" ? ax : bx, wly, t, t0, size, seed);
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  rockLayer().blit(c, V, { x0: Math.max(0, R(V.X(3140))), x1: Math.min(540, R(V.X(X1 + 40))) });
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // A's whistle = its name: draws itself left → right above A like a signature, then stays as A's tag
  const ax = V.X(AX), wy = V.Y(-290), A_PTS = whistlePts(ax, wy);
  const kA = ease(clamp01((t - EV.whistle) / (EV.name - EV.whistle))), aA = sm(t, EV.whistle - 0.05, EV.whistle + 0.1) * (1 - sm(t, ...WA_OUT));
  const match = sm(t, MATCH[0], MATCH[1]);
  drawWhistle(c, A_PTS, kA, "#FF5AC8", match, aA, t);
  // B whistles the same name: it draws itself above B, then slides onto A's and both glow
  if (t > EV.apart - 0.05) {
    const kB = ease(clamp01((t - EV.apart) / WB_DRAW)), mv = ease(clamp01((t - EV.apart - WB_SLIDE0) / WB_SLIDE)), bx = V.X(BX), sB = lerp(0.62, 1, mv);
    const pts = whistlePts(lerp(bx, ax, mv), lerp(V.Y(-250), wy, mv), sB);
    drawWhistle(c, pts, kB, "#5AE8FF", match, sm(t, EV.apart - 0.05, EV.apart + 0.05) * (1 - sm(t, EV.apart + 0.5, EV.apart + 0.62)), t);
  }
  heart(c, (ax + V.X(BX)) / 2, V.Y(-200), (t - HEART[0]) / HEART[1]);
  // "+NAMES" pickup on "name."
  pickup(c, ax, V.Y(-344), "+NAMES", (t - EV.name) / PICKUP_LIFE);
  // calendar flips while the friend is away; "20 YEARS" on "twenty"
  const calA = sm(t, CAL.show, CAL.show + CAL.fadeIn) * (1 - sm(t, T_LEAP + 0.3, T_LEAP + 0.6));
  if (calA > 0) {
    const x0 = R(ax - 84), y0 = R(V.Y(-404));
    calendar(c, x0, y0, t, calA);
    tag(c, ["20 YEARS"], R(ax + 30), y0 + 6, calA * sm(t, CAL.tag, CAL.tag + CAL.tagIn), C.Y, 2);
  }
}
