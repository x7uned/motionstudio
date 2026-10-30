// LV1 · OCEAN — the film's first frame and hook (RANGE BIOME.ocean = 0..540; REST.shark {270, −60}: the sea surface
// SURFACE 0 is at screen y 540, morning light). At t = 0 a cute chibi great white is already gliding just under the
// surface, its dorsal fin cutting the water (bow spray, foam wake), body clearly visible through the clear sea. It sweeps
// left, U-turns (circling, a little "Jaws" tension), glides back to the centre and turns toward the camera under water;
// on "The shark?" it rises out of the sea facing the camera, head under the morning sun, water streaming off. "No!" →
// the grin drops, a big red pixel ✕ pops beside it and dissolves, worried brows, a sweat drop. "…the safest one on this
// list" → a golden halo settles over its fin, a SAFEST ribbon unfurls, the shark blushes with happy closed eyes.
// "Sharks kill about ten people a year" → it lifts a pectoral fin out of the water and waves (still waving bye as the
// camera pans on). A red "LV 1" buoy bobs on the left; on the right a sandy beach rises into the savanna (land y = LAND
// at x = 540) in front of a far coastal bluff. Pure function of t: every change is eased or dissolved.
import { BIOME, EV, LV, LAND, SURFACE } from "../timeline.mjs";
import { drawWater, tod } from "../world.mjs";
import { sign, blinkAt, ease, win, fade, mix, bayer, MAIN, C, blob, ell, smooth } from "../cute.mjs";
import { R, clamp01, sm, rnd, worldLayer, profile, gaze, popEase, FAR_SEA, farHz, farLandCol, earthCol, hex } from "./ocean-kit.mjs";
import { drawSideShark, drawFrontShark, drop, sharkIcon, GREY } from "./ocean-shark.mjs";

export const RANGE = BIOME.ocean;
const [X0, X1] = RANGE;
const SX = 270;                  // the risen shark's x (world) → screen 270 at REST
const HY = -100;                 // its head centre (world) → screen 440 at REST; the waterline crosses its throat
const HY_SUB = 118;              // head centre while it waits under water (dorsal fin tip just above the surface)
const SWIM_Y = 46, SWIM_DEEP = 60;  // the swimmer's body centre below the surface (back 8 px under, fin out ≈ 38 px)
const BUOY_X = 64;

// ---------------------------------------------------------------- timing (all from words)
const T0 = LV.shark[0];
const TURN = [EV.people1 - 0.4, EV.people1];                 // U-turn at the left (circling)
const GLIDE = [EV.people1, EV.shark1 - 0.38];               // back toward the centre, slowing down
const XF = [EV.shark1 - 0.44, EV.shark1 - 0.12];            // turns toward the camera under water (side → front crossfade)
const RISE = [EV.shark1 - 0.1, EV.shark1 + 0.55];           // rises out of the sea
const NO_POP = [EV.no, EV.no + 0.2], NO_OUT = [EV.no + 0.62, EV.no + 0.95];   // the red ✕
const WORRY = [EV.no - 0.06, EV.shark2 + 0.3];              // grin drops → worried; recovers on "The shark is…"
const SWEAT = [EV.no + 0.12, EV.shark2 + 0.5];
const HALO = [EV.safest - 0.1, EV.safest + 0.4];             // halo descends onto the fin, then stays
const BANNER = [EV.safest + 0.02, EV.sharks - 0.3];         // SAFEST ribbon (unfurl 0.3 s … dissolve 0.3 s)
const SHY = [EV.safest + 0.12, EV.sharks - 0.12];           // happy closed eyes, shy smile, deep blush
const WAVE = [EV.sharks + 0.04, LV.shark[1] + 0.35];         // pectoral fin up, waves, down
const LIFT = 0.36, LOWER = 0.45, WAVE_HZ = 1.4;
/** Head centre y (world) of the risen shark (before RISE: waiting under water). */
function riseY(t) { return t < RISE[0] ? HY_SUB : HY_SUB + (HY - HY_SUB) * popEase((t - RISE[0]) / (RISE[1] - RISE[0]), 0.06); }
const BREAK = (() => { for (let t = RISE[0]; t < RISE[1]; t += 1 / 120) if (riseY(t) < 70) return t; return RISE[0] + 0.1; })();   // the head breaks the surface
/** Timing shared with levels/ocean-motions.mjs (sound) — the picture reads the same values. */
export const TIMING = { T0, TURN, GLIDE, XF, RISE, BREAK, NO_POP, NO_OUT, WORRY, SWEAT, HALO, BANNER, SHY, WAVE, LIFT, LOWER, WAVE_HZ, SPLASH: 1.0 };

// ---------------------------------------------------------------- the swimmer's path (side view)
const herm = (p0, p1, v0, v1, u) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * v0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * v1; };
/** Swimmer state at t: body centre x (world), y (world, below the surface), sx (+1 faces left … −1 faces right). */
export function swim(t) {
  const d1 = TURN[0] - T0, d2 = TURN[1] - TURN[0], d3 = GLIDE[1] - GLIDE[0];
  let x, sx = 1, y = SWIM_Y;
  if (t < T0) x = 336 - 215 * (t - T0);                     // before the first frame it was already swimming (wake continuity)
  else if (t < TURN[0]) x = herm(336, 166, -215 * d1, -112 * d1, clamp01((t - T0) / d1));
  else if (t < TURN[1]) { const u = (t - TURN[0]) / d2; x = herm(166, 154, -112 * d2, 92 * d2, u); sx = Math.cos(Math.PI * (u * u * (3 - 2 * u))); y = SWIM_Y + 4 * Math.sin(Math.PI * u); }
  else { const u = clamp01((t - GLIDE[0]) / d3); x = herm(154, 262, 92 * d3, 0, u); sx = -1; y = SWIM_Y + (SWIM_DEEP - SWIM_Y) * sm(u, 0.4, 1); }
  if (t > XF[0]) { const u = sm(t, XF[0], XF[1]); sx = -1 + 0.6 * u; y = SWIM_DEEP + 10 * u; }
  return { x, y: y + Math.sin(t * 3.4) * 1.5, sx };
}
const swimSpeed = (t) => (swim(t + 0.02).x - swim(t - 0.02).x) / 0.04;

// ---------------------------------------------------------------- colours by time of day (morning → day while in view)
function waterTint(V) { const T = tod(V.cx); return mix("#2A92B8", "#2878B0", sm(T, 1, 2)); }
const subK = (wl) => (y) => Math.min(0.68, 0.34 + (y - wl) / 720);

// ---------------------------------------------------------------- the beach (static, cached) and the far coast
const ground = profile([[404, 450], [408, 360], [414, 270], [422, 196], [432, 132], [444, 82], [456, 48], [466, 26], [476, 10], [487, -2], [500, -8], [514, -13], [528, -18], [540, -20], [560, -20]]);
const SAND = ["#5A4028", "#80603A", "#A8804E", "#C89E62", "#DDB878", "#EBCB8E", "#F4DCA6", "#FCEBC4"];
const STRATA = ["#EAD098", "#DEC088", "#D2B27A", "#E2C690", "#CCA872", "#DAB884"];
const WATER_AT = (wy) => (wy < 300 ? mix("#3ACCD8", "#1A6EAA", wy / 300) : mix("#1A6EAA", "#145A96", Math.min(1, (wy - 300) / 300)));
const SAND_VEIL = (wy) => (wy < 200 ? mix("#56D8E0", "#2C9ACC", wy / 200) : mix("#2C9ACC", "#1E70AE", Math.min(1, (wy - 200) / 240)));
/** Colour of a static thing at world depth wy under the surface (the sea's own colour veil, lighter in the shallows). */
function under(col, wy) { if (wy <= 0) return hex(col); const k = Math.min(0.6, 0.24 + wy / 900); return mix(col, WATER_AT(wy), k); }
function slopeX(wy) { let lo = 404, hi = 487; for (let i = 0; i < 26; i++) { const m = (lo + hi) / 2; if (ground(m) > wy) lo = m; else hi = m; } return (lo + hi) / 2; }
const REEF = ["#3A3428", "#5A4E3A", "#7A6A50", "#9A8866", "#B8A47E", "#CCBA92", "#DCCCA6", "#ECDEBC"];
const CORAL = [["#E0507A", "#F28AA6", "#FFC4D2"], ["#F08A3A", "#F8B464", "#FFE0A8"], ["#9A62D8", "#BE92F0", "#E4CCFF"], ["#E8D84A", "#F4EA86", "#FFF8C8"]];
let BEACH = null;
function beach() {
  return BEACH ??= worldLayer(380, -100, 160, 560, (g, L, T) => {
    const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
    // far coastal headland (shared with the savanna's far plain) behind the beach, down to the sea, with tiny far trees
    for (let wx = 430; wx < 540; wx++) for (let wy = R(farHz(wx)); wy < 0; wy++) px(wx, wy, wy > -3 ? mix(farLandCol(wx, wy), "#FFFFFF", 0.35) : farLandCol(wx, wy));
    for (const [wx, h] of [[488, 5], [497, 4], [522, 6], [531, 4]]) { const top = R(farHz(wx)); for (let k = 1; k <= h; k++) px(wx, top - k, "#9AAA90"); for (let i = -3; i <= 3; i++) px(wx + i, top - h - (Math.abs(i) > 2 ? 0 : 1), "#9AAA90"); }
    // the beach above the water (sand strata in cross-section), the reef wall under it
    for (let wx = 404; wx < 540; wx++) {
      const gy = ground(wx);
      for (let wy = R(gy); wy < 440; wy++) {
        const d = wy - gy, b = bayer(wx, wy), wet = wy > -1;
        let col;
        if (!wet) {
          col = earthCol(wx, wy, gy);
          if (d < 2) col = SAND[7]; else if (d < 4) col = SAND[6]; else if (d < 7 && b < 0.5) col = SAND[5];
        } else {
          // the seabed in cross-section: a sunlit sand rim on the slope; behind it the ground's cut face, washed in blue
          // shade near the water and turning into the same earth as the savanna deeper inside the shore (follows the slope)
          const dist = wx - slopeX(wy), deep = Math.min(1, wy / 420), shade = mix("#2A86A8", "#164C78", deep);
          const k = (0.78 - 0.18 * deep) * (1 - sm(dist, 14, 74)) + 0.12 * deep;
          col = mix(earthCol(wx, wy, gy), shade, k);
          if (d > 4 && rnd(wx * 13 + wy * 71) < 0.01 && k > 0.5) col = mix(col, "#9AD8E8", 0.35);
          const rim = d < 2 ? "#FFF2C8" : d < 4 ? "#F0D8A4" : d < 7 ? "#C8B48A" : null;
          if (rim) col = mix(rim, SAND_VEIL(wy), Math.min(0.55, 0.12 + wy / 800));
          else if (d < 12 && (d - 7) / 5 < b) col = mix("#A89A7A", SAND_VEIL(wy), Math.min(0.6, 0.3 + wy / 800));
        }
        px(wx, wy, col);
      }
    }
    // corals, sea fans, anemones and seagrass on the reef face; shells on the dry sand; boulders at the waterline
    const coral = (x, y, kind, size, i) => {
      const [dk, md, lt] = CORAL[kind].map((cc) => under(cc, y));
      if (kind % 2 === 0) { // branching coral: a few forked branches
        for (let br = 0; br < 4; br++) { let bx = x, by = y; const ang0 = -Math.PI / 2 - 0.9 + br * 0.6 + (rnd(i * 9 + br) - 0.5) * 0.3; for (let k = 0; k < size; k++) { const an = ang0 + Math.sin(k * 0.4 + br) * 0.25; bx += Math.cos(an) * 0.9; by += Math.sin(an) * 0.9; px(R(bx), R(by), k > size - 3 ? lt : md); px(R(bx) + 1, R(by), dk); } }
      } else { // round brain coral / anemone clump
        for (let Y = -size; Y <= 0; Y++) for (let X = -size; X <= size; X++) { const dd = (X * X) / (size * size) + (Y * Y) / (size * size * 0.7); if (dd > 1) continue; px(x + X, y + Y, dd > 0.75 ? dk : (X + Y) % 3 === 0 ? lt : md); }
      }
    };
    const RK = ["#0E2A44", "#16405E", "#22587A", "#2E6E90", "#4086A6", "#5A9EBA", "#7AB6CC", "#A0CCDA"];
    for (const [wy, r] of [[150, 9], [300, 12]]) { const x = slopeX(wy) - 1; blob(g, [ell(L(x), T(wy), r * 1.4, r)], { ramp: RK, thick: 6, base: 4.2 - wy / 260, gain: 2.4, outline: "#0A1E34", litOutline: "#A0D8E8" }); }
    for (let i = 0; i < 8; i++) { const wy = 34 + i * 48 + rnd(i) * 16, x = R(slopeX(wy)); coral(x + 3, R(wy) + 2, i % 4, 8 + R(rnd(i * 3) * 6), i); }
    
    { const wy = 120, x = slopeX(wy) - 2, col = under("#F08A5A", wy), hi = under("#FFC48A", wy); for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5; for (let r = 0; r < 6; r++) px(R(x + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.8), r < 2 ? hi : col); } }
    for (const [wx, col] of [[506, "#F8C8C0"], [520, "#FFF0E0"], [531, "#F0D0F0"]]) { const gy = R(ground(wx)) - 1; px(wx, gy, col); px(wx + 1, gy, col); px(wx - 1, gy, mix(col, "#806040", 0.4)); px(wx, gy - 1, col); }
    const ROCK = ["#1E1A22", "#2E2830", "#463C42", "#5E5258", "#786A6A", "#948478", "#B0A08E", "#CCBEA8"];
    const gw = Object.create(g); gw.px = (x, y, col) => g.px(x, y, y - 100 > 0 ? under(col, y - 100) : col);
    for (const [x, y, rx, ry] of [[476, 3, 7, 5], [489, -5, 5, 3]]) blob(gw, [ell(L(x), T(y), rx, ry)], { ramp: ROCK, thick: 5, base: 3.6, gain: 1.6 });
    // dry beach grass where the sand rises toward the savanna
    for (let i = 0; i < 7; i++) { const wx = 512 + i * 4 + rnd(i) * 3, gy = ground(wx), h = 6 + rnd(i * 5) * 8; for (let s = -1; s <= 1; s++) for (let k = 0; k < h; k++) px(R(wx + s * 1.6 + (s * k) / 5), R(gy - k), k > h - 3 ? "#E8D27A" : "#B89A46"); }
  });
}

// ---------------------------------------------------------------- layers
const onScreen = (V) => V.x1 > X0 - 40 && V.x0 < X1 + 40;
export function fill(c, V, t) {
  if (!onScreen(V)) return;
  drawWater(c, V, t, X0, X1, SURFACE);
  seaBand(c, V, t);
}
/** The far sea surface up to the horizon (world y −FAR_SEA..0), glitter under the morning sun. */
function seaBand(c, V, t) {
  const T = tod(V.cx), day = sm(T, 1, 2), sx0 = Math.max(0, R(V.X(X0))), sx1 = Math.min(c.w, R(V.X(X1)));
  const band = [mix("#D6ECF0", "#C6EAF6", day), mix("#A8DCE4", "#98D4EC", day), mix("#82CCD8", "#72C2E0", day), mix("#5CC4D2", "#4AB8D8", day)], gl = "#FFF6D8";
  for (let wy = -FAR_SEA; wy < 0; wy++) {
    const y = R(V.Y(wy)); if (y < 0 || y >= c.h) continue;
    const v = (wy + FAR_SEA) / FAR_SEA, q = v * 3, lo = Math.floor(q), f = q - lo;
    for (let x = sx0; x < sx1; x++) {
      let col = f > bayer(x, y) ? band[Math.min(3, lo + 1)] : band[lo];
      if (v > 0.2 && ((x * 7 + wy * 13 + R(t * 2)) % 23) === 0) col = band[Math.max(0, lo - 1)];
      const gx = Math.abs(x - 270) / (22 + v * 46);
      if (gx < 1 && ((x + (wy & 1) * 2 + R(t * 6 + wy * 0.7)) % 5) < 2 && (1 - gx) * (0.35 + v) > bayer(x, y + 1)) col = gl;
      const i = (y * c.w + x) * 3, cc = hex(Array.isArray(col) ? col : col); c.d[i] = cc[0]; c.d[i + 1] = cc[1]; c.d[i + 2] = cc[2];
    }
  }
  const hy = R(V.Y(-FAR_SEA)); if (hy >= 0 && hy < c.h) for (let x = sx0; x < sx1; x++) c.px(x, hy, "#EAF6F4");
}

export function back(c, V, t) {
  if (!onScreen(V)) return;
  beach().blit(c, V, { x1: Math.min(c.w, R(V.X(X1))) });
  seagrass(c, V, t);
  fish(c, V, t);
  // swash: the sea runs up the wet sand and slides back
  const sw = Math.sin(t * 1.3), wx0 = 481 + sw * 5;
  for (let wx = 478; wx < wx0 + 6; wx++) { const x = R(V.X(wx)), y = R(V.Y(ground(wx))) - 1; if (wx < wx0) { c.px(x, y, "#E8FFFF"); c.px(x, y + 1, "#9ADCE8"); } else if (bayer(x, y) < 0.5) c.px(x, y, "#F4FFFF"); }
  buoy(c, V, t);
}

/** Seagrass tufts on the slope, swaying in the swell. */
const GRASS = Array.from({ length: 11 }, (_, i) => { const wy = 22 + i * 36 + rnd(i * 5) * 18; return { wy, x: slopeX(wy) - 1, n: 2 + (i % 3), h: 14 + rnd(i) * 16, ph: rnd(i * 3) * 6 }; });
function seagrass(c, V, t) {
  for (const G of GRASS) {
    const bx = V.X(G.x), by = V.Y(G.wy); if (bx < -30 || bx > c.w + 30 || by < 0 || by > c.h + 30) continue;
    const dk = under("#2E7A4E", G.wy), md = under("#4EA862", G.wy), lt = under("#8ADA7A", G.wy);
    for (let b = 0; b < G.n; b++) { const h = G.h * (0.7 + 0.3 * ((b * 7) % 3) / 2), lean = -0.5 + b * 0.35;
      for (let k = 0; k < h; k++) { const u = k / h, sw = Math.sin(t * 1.6 + G.ph + b * 0.8 - u * 2) * 3.5 * u * u; const x = R(bx - 1 - b * 2 + lean * k * 0.4 + sw), y = R(by - k); c.px(x, y, u > 0.75 ? lt : md); c.px(x + 1, y, dk); } }
  }
}

/** A small school of fish drifting in the deep (behind the shark), and a few lone ones. */
function fish(c, V, t) {
  for (let i = 0; i < 9; i++) {
    const school = i < 6, sp = school ? 16 : 10 + rnd(i) * 8, span = 760;
    const wx = ((((school ? 520 + (i % 3) * 13 + Math.floor(i / 3) * 8 : 120 + rnd(i * 7) * 500) - t * sp) % span) + span) % span - 110;
    const wy = school ? 236 + (i % 3) * 9 + Math.floor(i / 3) * 5 + Math.sin(t * 1.4 + i) * 2 : 150 + rnd(i * 3) * 160 + Math.sin(t + i) * 3;
    const x = R(V.X(wx)), y = R(V.Y(wy)); if (x < -10 || x > c.w + 10 || y < 0 || y >= c.h) continue;
    const body = mix(school ? "#FFE08A" : "#FF9A8A", WATER_AT(wy), 0.3), belly = mix(body, "#FFFFFF", 0.35), dark = mix("#1A2A4A", WATER_AT(wy), 0.2), tl = Math.sin(t * 9 + i) > 0 ? 1 : 0;
    for (let k = 0; k < 8; k++) { const hh = k < 1 || k > 6 ? 0 : k < 2 || k > 5 ? 1 : 2; for (let j = -hh; j <= hh; j++) c.px(x + k, y + j, j > 0 ? belly : body); }
    for (const j of [-2, -1, 1, 2]) { c.px(x + 8, y + j - tl, body); if (Math.abs(j) === 2) c.px(x + 9, y + j - tl, body); }
    c.px(x + 2, y - 1, dark);
  }
}

function buoy(c, V, t) {
  const bob = Math.sin(t * 1.9) * 2 + Math.sin(t * 0.7), bx = R(V.X(BUOY_X)), by = R(V.Y(SURFACE) + bob);
  if (bx < -60 || bx > 600) return;
  sign(c, bx, by - 8, "LV 1", "buoy", 1, t);
  const fl = "#D8443C", wh = "#F4EEE0", dk = "#2A0A10";
  for (let j = -10; j <= 8; j++) { const hw = R(Math.sqrt(Math.max(0, 1 - ((j + 1) / 11) ** 2)) * 12); for (let i = -hw; i <= hw; i++) { let col = j < -3 ? fl : j < 1 ? wh : fl; if (Math.abs(i) === hw || j === -10) col = dk; else if (i < -hw * 0.4 && j < 0) col = mix(col, "#FFFFFF", 0.25); if (j >= 1) col = mix(col, "#2A8AB0", 0.5); c.px(bx + i, by + j, col); } }
  c.px(bx, by - 12, "#FFE070"); c.px(bx, by - 13, mix("#FFE070", "#FFFFFF", 0.5 + 0.5 * Math.sin(t * 5)));
  for (let i = -16; i <= 16; i++) if ((i + R(t * 8)) % 4 !== 0) c.px(bx + i, by + 1 + (Math.abs(i) > 12 ? 0 : 1), "#E8FFFF");
}

// ---------------------------------------------------------------- the risen shark's pose
function frontPose(V, t) {
  const bob = Math.sin((2 * Math.PI * t) / 3.2) * 2 + Math.sin(t * 0.9) * 0.6;
  const shy = win(t, SHY[0], SHY[1], 0.25, 0.3), worry = win(t, WORRY[0], WORRY[1], 0.18, 0.35);
  const recoil = 7 * win(t, EV.no, EV.shark2 + 0.1, 0.2, 0.4);
  const x = V.X(SX) + Math.sin(t * 4.2) * 3 * shy, y = V.Y(riseY(t) + recoil) + (t > RISE[1] ? bob : bob * sm(t, RISE[0], RISE[1]));
  const look = gaze(t, [[0, [0, 0.05]], [EV.no - 0.04, [-0.7, -0.35]], [EV.no + 0.42, [0.5, 0.45]], [EV.shark2 + 0.05, [0, 0.05]], [EV.sharks + 0.1, [0.25, 0]], [EV.ten, [0, 0.05]]], 0.16);
  // the waving fin (screen right), angle steps: 0 rest … −24 raised, waving ±7
  let finR = 0;
  if (t > WAVE[0]) {
    const up = ease(clamp01((t - WAVE[0]) / LIFT)), down = ease(clamp01((t - WAVE[1] + LOWER) / LOWER)), u = t - WAVE[0] - LIFT;
    finR = -27 * up * (1 - down) + (u > 0 ? 8 * Math.sin(2 * Math.PI * WAVE_HZ * u) * sm(u, 0, 0.2) * (1 - down) : 0);
  }
  const sway = Math.sin(t * 1.3) * 2;
  return { x, y, shy, worry, look, finR: finR + sway, finL: -sway, blink: blinkAt(t, 3.6, 0.3) * (1 - shy) * (1 - worry) * (t > RISE[0] ? 1 : 0), sweat: clamp01((t - SWEAT[0]) / (SWEAT[1] - SWEAT[0])) };
}

export function actors(c, V, t) {
  if (!onScreen(V) && V.x0 > X1 + 200) return;
  const wl = R(V.Y(SURFACE)), tint = waterTint(V), k = subK(wl), wob = (y) => R(Math.sin(y * 0.19 + t * 2.6) * 1.3);
  // bubbles from the gills while swimming / rising (behind)
  bubbles(c, V, t, wl);
  // the risen (front) shark: fades in under water during XF, rises on "shark?"
  const fa = sm(t, XF[0], XF[1]);
  if (fa > 0) {
    const P = frontPose(V, t); if (P.x > -260 && P.x < 800) {
      haloDraw(c, V, t, P, "back");
      ripples(c, P.x, wl, t, -1, fa);
      drawFrontShark(c, P.x, P.y, { a: fa, look: P.look, blink: P.blink, worry: P.worry, shy: P.shy, happy: P.shy, grin: 1, finR: P.finR, finL: P.finL, sweat: P.sweat > 0 && P.sweat < 1 ? P.sweat : 0, below: wl + 1, tint, k, wob });
      haloDraw(c, V, t, P, "front");
      streams(c, P, t, wl);
      finDrips(c, P, t, wl);
      waveArcs(c, P, t);
    }
  }
  // the swimmer (side view)
  const sa = 1 - sm(t, XF[0] + 0.06, XF[1]);
  if (sa > 0) {
    const S = swim(t), x = V.X(S.x), y = V.Y(S.y), MIN = 0.24;
    const o = { ph: (t * 7) % 8, look: gaze(t, [[0, [-0.3, 0]], [TURN[1] + 0.1, [0.15, 0.1]], [GLIDE[1] - 0.25, [0.6, 0.2]]], 0.2), blink: blinkAt(t, 3.1, 2.5), below: wl + 1, tint, k, wob };
    // mid-turn the sprite never gets thinner than MIN: the two mirrored slivers cross-dissolve instead of flipping
    if (Math.abs(S.sx) >= MIN) drawSideShark(c, x, y, { ...o, sx: S.sx, a: sa });
    else {   // the dominant sliver stays opaque; the other one dissolves in on top of it (no see-through frame)
      const w = (S.sx + MIN) / (2 * MIN), main = w >= 0.5 ? MIN : -MIN;
      drawSideShark(c, x, y, { ...o, sx: main, a: sa }); drawSideShark(c, x, y, { ...o, sx: -main, a: sa * 2 * Math.min(w, 1 - w) });
    }
  }
}

export function front(c, V, t) {
  if (!onScreen(V) && V.x0 > X1 + 200) return;
  const wl = R(V.Y(SURFACE));
  // the fin cutting the surface: foam collar at the fin, bow spray ahead, wake trail behind
  const sa = 1 - sm(t, XF[0] + 0.06, XF[1]);
  if (sa > 0) {
    const S = swim(t), fx = V.X(S.x + 2 * S.sx), v = swimSpeed(t), dir = v < 0 ? -1 : 1, spd = Math.min(1, Math.abs(v) / 220), g = fade(c, sa);
    const half = R(Math.max(3, 12 * Math.abs(S.sx)));
    for (let x = R(fx) - half - 3; x <= R(fx) + half + 3; x++) { const wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.2); g.px(x, wl + wv, "#FFFFFF"); g.px(x, wl + wv + 1, "#CFF4FF"); if (Math.abs(x - fx) > half - 2 && bayer(x, wl) < 0.7) g.px(x, wl + wv - 1, "#FFFFFF"); }
    // bow wave: a foam mound piled against the fin's leading edge + spray droplets thrown up and ahead
    const bw = R(3 + 4 * spd);
    for (let i = 0; i < bw + 6; i++) { const h = R((bw + 3 - i * 0.7) * (0.6 + 0.4 * Math.sin(t * 17 + i))); for (let j = 0; j < h; j++) g.px(R(fx + dir * (half + i)), wl - j, j === h - 1 ? "#FFFFFF" : (i + j) % 3 ? "#E8FCFF" : "#BFEFFA"); }
    for (let i = 0; i < 14; i++) { const p = ((t * 2.8 + i / 14) % 1), dx = dir * (half + 4 + p * (16 + rnd(i) * 22) * (0.5 + spd)), dy = -(12 + rnd(i * 3) * 14) * Math.sin(Math.PI * p) * (0.5 + spd); if (spd < 0.1 || (1 - p) * (0.4 + spd) < bayer(i * 5, i) * 0.9) continue; const X = R(fx + dx), Y = R(wl - 2 + dy); g.px(X, Y, "#FFFFFF"); g.px(X + dir, Y, "#D8F6FF"); if (i % 3 === 0) g.px(X, Y + 1, "#9ADCF0"); }
    // wake: churned foam left on the surface along the path (thick right behind the fin), fading with age
    for (let j = 1; j <= 34; j++) {
      const tp = t - j * 0.04; const P = swim(Math.max(T0 - 0.8, tp)), ax = R(V.X(P.x + 2 * P.sx)), age = j / 34, a = (1 - age) * 0.95 * sa * (0.4 + spd), th = R((1 - age) * 3 * (0.4 + spd));
      for (let q = -2; q <= 2; q++) { const x = ax + q, wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.2); if (a > bayer(x, wl + j)) { for (let k = 0; k <= th; k++) c.px(x, wl + wv - k, k === th ? "#FFFFFF" : "#E0F8FF"); c.px(x, wl + wv + 1 + (j % 3 === 0 ? 1 : 0), "#BFEFFA"); } }
    }
  }
  // the risen shark: the surface passes in front of its body, foam where water meets it, near-side ripples, splash
  const fa = sm(t, XF[0], XF[1]);
  if (fa > 0) {
    const P = frontPose(V, t), hw = Math.min(102, Math.max(0, 102 - Math.max(0, (V.Y(SURFACE) - P.y - 100)) * 0)), g = fade(c, fa);
    if (P.x > -260 && P.x < 800) {
      for (let x = R(P.x - hw - 2); x <= R(P.x + hw + 2); x++) {
        const wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.2), e = Math.abs(x - P.x) / hw;
        g.px(x, wl + wv, e > 0.9 || ((x + R(t * 9)) % 7 < 5) ? "#E8FFFF" : "#B8E8F4"); g.px(x, wl + wv + 1, "#8ED8EA");
        if (e > 0.8 && bayer(x, wl) < 0.6) g.px(x, wl + wv - 1, "#FFFFFF");
      }
      for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) { const ph = t * 2.3 + i * 0.9 + sd, fx = R(P.x + sd * (hw + 2 + (Math.sin(ph) * 0.5 + 0.5) * 9 - (i % 3) * 3)), fy = wl - 1 + (i % 3) - R(Math.abs(Math.sin(ph * 1.3)) * 2); g.px(fx, fy, "#FFFFFF"); if (i % 2) g.px(fx + sd, fy, "#D8F4FF"); }
      ripples(c, P.x, wl, t, 1, fa);
      splash(c, P, t, wl);
    }
  }
}

/** Expanding ripple rings around the risen body on the surface plane: side −1 = far half, +1 = near half. */
function ripples(c, x, wl, t, side, a = 1) {
  for (let n = 0; n < 2; n++) {
    const p = ((t / 2.8 + n * 0.5) % 1 + 1) % 1, rx = 108 + p * 130, ry = 3 + p * 6, q = (1 - p) * 0.85 * a;
    for (let i = 0; i <= 240; i++) {
      const ang = ((Math.PI * i) / 240) * (side < 0 ? -1 : 1), X = R(x + Math.cos(ang) * rx), Y = R(wl + 1 + Math.sin(ang) * ry);
      if (Math.abs(X - x) < 104 || q <= bayer(X, Y)) continue; c.px(X, Y, side < 0 ? "#A8E0EE" : "#E0F8FF");
    }
  }
}
/** The crown of spray when the head breaks the surface: droplets thrown up and out, foam sheets climbing the flanks. */
function splash(c, P, t, wl) {
  const u = t - BREAK; if (u < 0 || u > TIMING.SPLASH) return;
  // foam sheets: crowns of water climbing the flanks and collapsing back
  const h = 46 * Math.sin(Math.PI * clamp01(u / 0.55)), sa = 1 - sm(u, 0.35, 0.75);
  for (const sd of [-1, 1]) for (let j = 0; j < h; j++) {
    const w = 9 - j * 0.12, lean = j * 0.42;
    for (let k = 0; k < w; k++) { const x = R(P.x + sd * (96 + k + lean)), y = wl - j, q = sa * (1 - (j / (h + 1)) ** 2) * (k < 2 ? 1 : 0.8); if (q > bayer(x, y)) c.px(x, y, j > h - 4 || k < 2 ? "#FFFFFF" : k > w - 3 ? "#9ADCF0" : "#D8F6FF"); }
  }
  // droplets
  for (let i = 0; i < 40; i++) {
    const sd = i % 2 ? 1 : -1, r0 = 60 + rnd(i * 3) * 55, vx = sd * (30 + rnd(i * 5) * 150), vy = -(170 + rnd(i * 7) * 230), g0 = 900, d = rnd(i * 11) * 0.12, uu = u - d; if (uu < 0) continue;
    const x = P.x + sd * r0 + vx * uu, y = wl - 2 + vy * uu + 0.5 * g0 * uu * uu; if (y > wl) continue;
    const a = 1 - sm(uu, 0.5, 0.85), X = R(x), Y = R(y); if (a <= bayer(X, Y)) continue;
    const big = i % 3 === 0;
    c.px(X, Y, "#FFFFFF"); c.px(X + 1, Y, "#D8F6FF"); c.px(X, Y + 1, "#9ADCF0"); if (big) { c.px(X + 1, Y + 1, "#9ADCF0"); c.px(X - 1, Y, "#E8FCFF"); c.px(X, Y - 1, "#FFFFFF"); }
    const tx = R(x - vx * 0.016), ty = R(y - (vy + g0 * uu) * 0.016); if (Math.abs(ty - Y) > 1) c.px(tx, ty, "#BFEFFA");
  }
  // a thick foam band along the waterline across the body
  const fa = 1 - sm(u, 0.25, 0.8);
  for (let x = R(P.x - 112); x <= R(P.x + 112); x++) for (let j = -3; j <= 1; j++) { const q = fa * (1 - Math.abs(j + 1) / 3); if (q > bayer(x, wl + j)) c.px(x, wl + j, j < -1 ? "#FFFFFF" : "#E0F8FF"); }
}
/** Water streaming down the face after the rise. */
function streams(c, P, t, wl) {
  const u0 = t - BREAK - 0.08; if (u0 < 0 || u0 > 2) return;
  for (let i = 0; i < 13; i++) {
    const lx = -88 + i * 14.5 + (rnd(i) - 0.5) * 6, delay = rnd(i * 3) * 0.6, u = u0 - delay; if (u < 0 || u > 1.3) continue;
    const top = -86 + Math.pow(Math.abs(lx) / 100, 2) * 72, y0 = top + 6 + u * u * 120 + u * 30, len = 9 + rnd(i * 7) * 9, a = 1 - sm(u, 0.7, 1.3);
    for (let j = 0; j < len; j++) {
      const yy = R(P.y + y0 - j), xx = R(P.x + lx + Math.sin((y0 - j) * 0.08 + i) * 1.2); if (yy >= wl - 1 || a * (1 - (j / len) ** 2) <= bayer(xx, yy)) continue;
      c.px(xx, yy, j < 3 ? "#FFFFFF" : "#CFF6FF"); c.px(xx + 1, yy, "#8AD2EA");
    }
  }
  // drips falling from the chin corners
  for (const sd of [-1, 1]) { const per = 0.9, uu = (((u0 + (sd > 0 ? 0.45 : 0)) % per) + per) % per, x = R(P.x + sd * 74), y0 = P.y + 58, y = R(y0 + uu * uu * 260); if (u0 < 1.8 && y < wl - 1 && y0 < wl - 4) { c.px(x, y, "#E8FFFF"); c.px(x, y - 1, "#9ADCF0"); } }
}
/** Drips falling from the raised pectoral fin back into the sea. */
function finDrips(c, P, t, wl) {
  if (t < WAVE[0] + 0.2 || t > WAVE[1] + 0.4) return;
  const ang = 0.62 + P.finR * 0.05, tipX = P.x + 90 + Math.cos(ang) * 90, tipY = P.y + 98 + Math.sin(ang) * 90;
  for (let i = 0; i < 3; i++) { const u = ((t * 1.3 + i / 3) % 1), x = R(tipX - 6 + i * 4), y = R(tipY + u * u * (wl - tipY)); if (y < wl - 1 && tipY < wl - 6) { c.px(x, y, "#E8FFFF"); c.px(x, y - 1, "#9ADCF0"); } }
}
/** Little motion arcs beside the waving fin tip ("hi!"). */
function waveArcs(c, P, t) {
  const u = t - WAVE[0] - LIFT, a = sm(u, 0, 0.25) * (1 - sm(t, WAVE[1] - LOWER - 0.1, WAVE[1] - LOWER + 0.2)); if (a <= 0) return;
  const ang = 0.62 + P.finR * 0.05, tipX = P.x + 90 + Math.cos(ang) * 92, tipY = P.y + 98 + Math.sin(ang) * 92, sw = Math.sin(2 * Math.PI * WAVE_HZ * u), g = fade(c, a);
  for (const sd of [-1, 1]) { if (sd * sw < -0.2) continue; for (let n = 0; n < 2; n++) { const r = 12 + n * 7; for (let i = 0; i <= 10; i++) { const an = -0.7 + (i / 10) * 1.4, x = R(tipX + sd * (Math.cos(an) * r + 4)), y = R(tipY - 6 + Math.sin(an) * r); g.px(x, y, "#FFFFFF"); g.px(x + sd, y, "#2A4A66"); } } }
}
/** Bubbles rising from the swimmer's gills and from under the risen shark. */
function bubbles(c, V, t, wl) {
  for (let i = 0; i < 14; i++) {
    const per = 1.6 + rnd(i) * 0.8, u = ((t + rnd(i * 5) * per) % per) / per, t0 = t - u * per, S = t0 < XF[1] ? swim(t0) : null;
    const bx = S ? V.X(S.x - 34 * S.sx) : V.X(SX + (rnd(i * 3) - 0.5) * 140), by = S ? V.Y(S.y + 8) : V.Y(riseY(t0) + 120 + rnd(i) * 160);
    if (!S && t0 < RISE[0]) continue;
    const x = R(bx + Math.sin(u * 9 + i) * 2), y = R(by - u * 150); if (y <= wl + 2 || y >= c.h) continue;
    const r = 1 + (i % 3 === 0 ? 1 : 0), col = "#C8F4FF";
    if (r > 1) { c.px(x, y - 1, col); c.px(x - 1, y, col); c.px(x + 1, y, col); c.px(x, y + 1, "#7ACCE8"); c.px(x - 1, y - 1, "#FFFFFF"); } else c.px(x, y, col);
  }
}

// ---------------------------------------------------------------- halo, ✕, ribbon
function haloDraw(c, V, t, P, part) {
  const k = clamp01((t - HALO[0]) / (HALO[1] - HALO[0])); if (k <= 0) return;
  const a = sm(k, 0, 0.4), cx = P.x + 14, cy = P.y - 165 - (1 - ease(k)) * 34 + Math.sin(t * 2.2) * 1.5, rx = 23, ry = 6.5, g = fade(c, a);
  for (let i = 0; i < 160; i++) {
    const ang = (i / 160) * Math.PI * 2, s = Math.sin(ang); if ((part === "back") !== (s < 0)) continue;
    const x = R(cx + Math.cos(ang) * rx), y = R(cy + s * ry);
    g.px(x, y - 1, "#5A3A04"); g.px(x, y, s < 0 ? "#C8901C" : "#F4CA50"); g.px(x, y + 1, s < 0 ? "#B07A10" : "#FDE07A"); g.px(x, y + 2, "#5A3A04");
  }
  if (part === "front") {   // glints running around the ring + a soft glow above
    for (let j = 0; j < 3; j++) { const ang = t * 2.4 + j * 2.09, x = R(cx + Math.cos(ang) * rx), y = R(cy + Math.sin(ang) * ry) + 1; if (Math.sin(ang) > 0) { g.px(x, y, "#FFFFFF"); g.px(x - 1, y, "#FFF6C8"); g.px(x + 1, y, "#FFF6C8"); } }
    const sp = win(t, HALO[1] - 0.15, HALO[1] + 0.7, 0.1, 0.4); if (sp > 0) { const f = fade(c, sp); for (let i = 0; i < 6; i++) { const an = i * 1.047 + t * 1.5, r = 30 + (t - HALO[1]) * 18, x = R(cx + Math.cos(an) * r), y = R(cy + Math.sin(an) * r * 0.45); f.px(x, y, "#FFFFFF"); f.px(x - 1, y, "#FFE070"); f.px(x + 1, y, "#FFE070"); f.px(x, y - 1, "#FFE070"); f.px(x, y + 1, "#FFE070"); } }
  }
}
function cross(c, x, y, t) {
  const pop = clamp01((t - NO_POP[0]) / (NO_POP[1] - NO_POP[0])); if (pop <= 0) return;
  const a = 1 - sm(t, NO_OUT[0], NO_OUT[1]); if (a <= 0) return;
  const s = popEase(pop, 0.28) * (1 + 0.04 * Math.sin(t * 30) * (1 - sm(t, NO_POP[1], NO_POP[1] + 0.3))), half = 27 * s, w = 6.5 * s, g = fade(c, a);
  const sh = R(Math.sin(t * 50) * 2 * (1 - sm(t, NO_POP[0], NO_POP[1] + 0.15)));
  const inX = (dx, dy, ww) => (Math.abs(dx - dy) < ww || Math.abs(dx + dy) < ww) && Math.abs(dx) < half && Math.abs(dy) < half;
  for (let Y = R(y - half - 3); Y <= R(y + half + 3); Y++) for (let X = R(x - half - 3); X <= R(x + half + 3); X++) {
    const dx = X - x - sh, dy = Y - y; if (inX(dx, dy, w)) { const hi = dx + dy < -half * 0.4 && Math.abs(dx - dy) < w * 0.5; g.px(X, Y, hi ? "#FF8A80" : dy > half * 0.3 ? "#B8202E" : "#E8343C"); }
    else if (inX(dx, dy, w + 2.2) || inX(dx - 1, dy - 1.5, w + 2.2)) g.px(X, Y, "#2A0610");
  }
}
function ribbon(c, t) {
  const k = clamp01((t - BANNER[0]) / 0.3), a = 1 - sm(t, BANNER[1], BANNER[1] + 0.3); if (k <= 0 || a <= 0) return;
  const txt = "SAFEST", s = 3, tw = c.measure(MAIN, txt, { scale: s }), w = tw + 30, h = 34, cx = 270, y = 206 + R(Math.sin(t * 2) * 1.5), open = ease(k) * (w / 2 + 22), g = fade(c, a);
  const clipX = (X) => Math.abs(X - cx) <= open;
  const P = (X, Y, col) => { if (clipX(X)) g.px(X, Y, col); };
  // forked tails behind the band
  for (const sd of [-1, 1]) for (let j = 0; j < h - 8; j++) for (let i = 0; i < 20; i++) { const X = R(cx + sd * (w / 2 - 6 + i)), Y = y + 8 + j; const notch = Math.abs(j - (h - 8) / 2) < (i - 10) * 0.9; if (notch) continue; P(X, Y, i === 19 || j === 0 || j === h - 9 ? "#5A1A10" : j < 3 ? "#E86040" : "#B83A2A"); }
  for (let j = 0; j < h; j++) for (let i = -R(w / 2); i <= R(w / 2); i++) { const X = cx + i, Y = y + j, edge = j === 0 || j === h - 1 || Math.abs(i) === R(w / 2); P(X, Y, edge ? "#5A3A04" : j < 3 ? "#FFF2B8" : j > h - 5 ? "#C8901C" : "#F4CA50"); }
  for (let i = -R(w / 2) + 3; i <= R(w / 2) - 3; i += 1) { P(cx + i, y + 3, "#FDE07A"); if ((i & 3) === 0) P(cx + i, y + h - 3, "#B07A10"); }
  const tx = R(cx - tw / 2), ty = y + 7;
  for (const [dx, dy] of [[1, 1], [0, 1], [1, 0]]) for (let X = 0; X < tw; X++) {} // (shadow drawn below)
  const T = (dx, dy, col) => { const o = Object.create(g); o.px = (X, Y, cc) => { if (clipX(X)) g.px(X, Y, cc); }; o.text(MAIN, txt, tx + dx, ty + dy, col, { scale: s }); };
  T(1, 2, "#8A4A08"); T(0, 0, "#5A1A10");
  // sparkles on the ribbon as it opens
  if (k < 1) for (let i = 0; i < 4; i++) { const X = R(cx + (i % 2 ? 1 : -1) * open), Y = y + 6 + i * 7; g.px(X, Y, "#FFFFFF"); g.px(X, Y - 1, "#FFF6C8"); g.px(X, Y + 1, "#FFF6C8"); }
}

export function hud(c, V, t) {
  if (!onScreen(V) && V.x0 > X1 + 200) return;
  const ox = R(V.X(SX)) - 270, oy = R(V.Y(SURFACE)) - 540;
  if (t > NO_POP[0] - 0.05 && t < NO_OUT[1] + 0.05) cross(c, 104 + ox, 318 + oy, t);
  if (t > BANNER[0] && t < BANNER[1] + 0.35) ribbon(c, t);
}

// ---------------------------------------------------------------- ICON: the shark's head (readout, guess cards)
export function ICON(c, cx, cy, a = 1) { sharkIcon(c, cx, cy, a); }
