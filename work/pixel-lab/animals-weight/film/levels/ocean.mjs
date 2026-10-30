// LV10 · blue whale — the night ocean under the full moon (RANGE BIOME.ocean = 4590..5130, surface y 0 → screen 540 at
// REST.whale). The savanna ends in a sandy beach that drops into the sea at the left; a red "LV 10" buoy bobs off the
// beach. A huge cute blue whale rises head-first out of the water in front of the moon, most of its long body below the
// surface (seen through the water, tinted and wobbling); it breathes, blinks, waves its flippers and blows a silvery spout.
// On "blue whale … twenty-five elephants" a balance scale fills with 25 tiny elephants until it levels against one whale;
// on "Its heart … three people" a heart glows inside the whale and the balance swaps to a heart against three tiny heroes.
// Pure function of t; everything enters and leaves by dissolves/eases.
import { BIOME, EV, LV, LAND } from "../timeline.mjs";
import { blinkAt, pickup, sign, sm, ease, win, rnd, fade, mix, bayer, MAIN, C, blob, ell } from "../cute.mjs";
import { drawWhale, drawHeart } from "./whale-art.mjs";
import { R, clamp01, seaWater, seaBand, sceneTint, light, Cache, profile, under, icon, hex } from "./ocean-sea.mjs";

export const RANGE = BIOME.ocean;
const [X0, X1] = RANGE;
const WX = 4860, HEAD = -100;                 // whale head centre (world) → screen (270, 440) at REST
const BUOY = 4662;

// ---------------------------------------------------------------- the beach at the left (savanna → sand → drop-off)
export const ground = profile([[X0 - 20, -20], [X0, -20], [4604, -18], [4616, -13], [4628, -6], [4638, 0], [4654, 22], [4672, 64], [4692, 122], [4714, 192], [4734, 268], [4750, 350], [4762, 432], [4770, 520], [4776, 580]]);
const SAND = ["#5A4028", "#80603A", "#A8804E", "#C89E62", "#DDB878", "#EBCB8E", "#F4DCA6", "#FCEBC4"];
const DRY = ["#4A3410", "#6E4E18", "#94701E", "#B89030", "#D2AE48", "#E4C664", "#F0DA8A", "#FAEDB8"];
const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
let BEACH = null;
// the savanna's coast strata (its own palette and banding, sunset-painted) continue across the seam and blend into ours
const SAV_SAND = ["#F2BE8E", "#E6AE80", "#DCA074", "#EBB688", "#D29468", "#E2A87C"];
function savannaCol(wx, wy, d) {
  if (d < 1) return "#FFE0B0"; if (d < 3) return "#E8B482"; if (d < 9 + Math.sin(wx * 0.4) * 2) return d < 6 ? "#C88A62" : "#B87A58";
  const wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band;
  let col = SAV_SAND[band % SAV_SAND.length]; if (f < 0.09 && bayer(wx, wy) > 0.35) col = mix(col, "#3A1414", 0.28);
  if (wy > 100) col = mix(col, "#3A1620", Math.min(0.55, (wy - 100) / 520));
  return col;
}
function beach() {
  return BEACH ??= new Cache(X0, -80, 4800 - X0, 660, (g) => {
    for (let wx = X0; wx < 4800; wx++) {
      const gy = ground(wx), sav = 1 - sm(wx, X0 + 6, X0 + 64);
      for (let wy = R(gy); wy < 580; wy++) {
        const d = wy - gy, b = bayer(wx, wy), wet = wy > -1;
        const wv = Math.sin(wx * 0.031) * 4 + Math.sin(wx * 0.11) * 2, v = (wy + wv + 400) / 20, band = Math.floor(v), f = v - band;
        let col = STRATA[band % STRATA.length]; if (f < 0.08 && b > 0.4) col = mix(col, "#7A5636", 0.22);
        col = mix(col, "#8A6440", Math.min(0.5, Math.max(0, wy + 10) / 600));
        if (d > 5 && rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#FFF4D8", 0.5); else if (d > 5 && rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#5A3A22", 0.45);
        if (d < 2) col = wet ? "#C8B48A" : SAND[7]; else if (d < 4) col = wet ? "#A89470" : SAND[6];
        else if (!wet && d < 7 && b < 0.5) col = SAND[5];
        if (wet) col = under(col, wy);
        if (sav > 0 && sav > bayer(wx + 1, wy) * 0.98 && !(wet && d < 4)) col = savannaCol(wx, wy, wy - LAND);
        g.px(wx, wy, col);
      }
    }
    // dry golden grass where the savanna ends, a few shells, pebbles and a starfish on the beach / slope
    for (let i = 0; i < 9; i++) { const wx = X0 - 14 + i * 4.5 + rnd(i) * 3, gy = ground(wx), h = 7 + rnd(i * 5) * 9 * (1 - i / 10); for (let s = -2; s <= 2; s++) for (let k = 0; k < h; k++) g.px(R(wx + s * 1.6 + (s * k) / 5), R(gy - k), DRY[k > h - 3 ? 6 : k > h / 2 ? 5 : 3]); }
    for (const [wx, col] of [[4612, "#F8C8C0"], [4622, "#FFF0E0"], [4604, "#F0D0F0"]]) { const gy = R(ground(wx)) - 1; g.px(wx, gy, col); g.px(wx + 1, gy, col); g.px(wx - 1, gy, mix(col, "#806040", 0.4)); g.px(wx, gy - 1, col); }
    for (let i = 0; i < 18; i++) { const wy = 30 + rnd(i * 3) * 380, x = slopeX(wy) - 2 - rnd(i * 7) * 3, k = rnd(i * 5); const c1 = under(k < 0.5 ? "#8A9890" : "#B8A898", wy), c2 = under("#C8D4CC", wy); g.px(R(x), R(wy), c1); g.px(R(x) - 1, R(wy), c1); g.px(R(x), R(wy) - 1, c2); }
    for (let i = 0; i < 7; i++) { const wy = 60 + i * 52 + rnd(i) * 20, x = slopeX(wy); for (let k = 0; k < 14 + rnd(i) * 10; k++) g.px(R(x - 3 - k * 0.3 + Math.sin(k * 0.5 + i) * 1.5), R(wy - k), under(k > 10 ? "#7AB86A" : "#4E9A62", wy)); }
    // boulders at the waterline (their submerged parts take the water colour)
    const gw = Object.create(g); gw.px = (x, y, col) => g.px(x, y, y > 0 ? under(col, y) : col);
    const ROCK = ["#1E1A22", "#2E2830", "#463C42", "#5E5258", "#786A6A", "#948478", "#B0A08E", "#CCBEA8"];
    for (const [x, y, rx, ry] of [[4630, -7, 7, 5], [4646, 0, 11, 8], [4662, 12, 8, 6], [4606, -17, 5, 3]]) blob(gw, [ell(x, y, rx, ry)], { ramp: ROCK, thick: 5, base: 3.6, gain: 1.6 });
    { const wy = 120, x = slopeX(wy) - 3, col = under("#F08A5A", wy), hi = under("#FFC48A", wy); for (let a = 0; a < 5; a++) { const ang = -Math.PI / 2 + (a * 2 * Math.PI) / 5; for (let r = 0; r < 6; r++) g.px(R(x + Math.cos(ang) * r), R(wy + Math.sin(ang) * r * 0.8), r < 2 ? hi : col); } }
  });
}
/** World x of the slope surface at depth wy (inverse of the profile on the drop-off). */
function slopeX(wy) { let lo = 4638, hi = 4776; for (let i = 0; i < 20; i++) { const m = (lo + hi) / 2; if (ground(m) < wy) lo = m; else hi = m; } return lo; }

// ---------------------------------------------------------------- timing
const T_OUT = LV.whale[1];
const BAL_IN = EV.blueWhale2 + 0.95, BAL_OUT = LV.whale[1] - 0.05;
const ELE_A = EV.twentyFive - 0.12, ELE_B = EV.elephants - 0.1;   // 25 elephants drop in
const SWAP = EV.heart - 0.05;                                       // elephants + whale icon → heart
const HERO_T = [EV.three - 0.05, EV.three + 0.22, EV.three + 0.49];
const HEART_ON = EV.heart - 0.1;
// blows: a big one as the camera arrives (before the balance), small breaths below the beam, a big one as it leaves: [t0, size, life]
const BLOWS = [[EV.blueWhale2 + 0.05, 1, 1.5], [EV.elephants + 0.55, 0.3, 1.6], [EV.heart + 0.75, 0.3, 1.6], [EV.people2 + 0.2, 0.3, 1.5], [LV.whale[1] + 0.05, 1, 2.4]];
const HAPPY = [[ELE_B + 0.1, ELE_B + 0.8], [HERO_T[2] + 0.25, HERO_T[2] + 0.95]];          // happy squints when each balance levels
const SETTLE = [[ELE_B - 0.05, ELE_B + 0.9], [HERO_T[2] + 0.1, HERO_T[2] + 1.0]];          // little wobble of the beam after it levels
const LABELS = [[ELE_B - 0.15, SWAP - 0.15], [HERO_T[2] - 0.05, BAL_OUT]];                 // "25 ELEPHANTS = 1 WHALE", "HEART ≈ 3 PEOPLE"
const HERO_FALL = 0.2, PICK = [EV.blueWhale2, 1.6];
/** Timing shared with levels/ocean-motions.mjs (sound design): the picture reads the same constants. */
export const TIMING = { T_OUT, BAL_IN, BAL_OUT, ELE_A, ELE_B, SWAP, HERO_T, HERO_FALL, HEART_ON, BLOWS, HAPPY, SETTLE, LABELS, PICK, BAL_FADE: 0.45, HEART_FADE: 0.4 };

// ---------------------------------------------------------------- layers
export function fill(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1) return;
  seaWater(c, V, t, X0, X1);
  seaBand(c, V, t, X0, X1, 34, (wx) => (wx < X0 + 70 ? -34 + Math.max(0, (X0 + 70 - wx)) * 0.6 : -99));
}

export function back(c, V, t) {
  if (V.x1 < X0 - 20 || V.x0 > X1) return;
  // the seam with the (sunset-painted, untinted) savanna: no tint at x 4590, full tint by x 4680 — while the savanna is in view
  const st = sceneTint(V.cx), vis = 1 - sm(V.x0, X0 - 60, X0);
  beach().blit(c, V, { col: st.col, k: st.k * 0.72 }, { kx: vis > 0 ? (wx) => 1 - vis * (1 - sm(wx, X0, X0 + 90)) : null });
  // the buoy: a red float bobbing at the surface carrying the level sign
  const L = light(V.cx), bob = Math.sin(t * 1.9) * 2 + Math.sin(t * 0.7) * 1, bx = R(V.X(BUOY)), by = R(V.Y(0) + bob);
  if (bx > -60 && bx < 600) {
    sign(c, bx, by - 8, "LV 10", "buoy", 1, t);
    const fl = mix("#D8443C", "#6A2A4A", L.night * 0.5), wh = mix("#F4EEE0", "#9A9AC0", L.night * 0.45), dk = "#2A0A10";
    for (let j = -10; j <= 8; j++) { const hw = R(Math.sqrt(Math.max(0, 1 - ((j + 1) / 11) ** 2)) * 12); for (let i = -hw; i <= hw; i++) { let col = j < -3 ? fl : j < 1 ? wh : fl; if (Math.abs(i) === hw || j === -10) col = dk; else if (i < -hw * 0.4 && j < 0) col = mix(col, "#FFFFFF", 0.25); if (by + j >= by + 1) col = mix(col, L.night > 0.5 ? "#1C2456" : "#2A8AB0", 0.5); c.px(bx + i, by + j, col); } }
    c.px(bx, by - 12, "#FFE070"); c.px(bx, by - 13, mix("#FFE070", "#FFFFFF", 0.5 + 0.5 * Math.sin(t * 5)));
    for (let i = -16; i <= 16; i++) if ((i + R(t * 8)) % 4 !== 0) c.px(bx + i, by + 1 + (Math.abs(i) > 12 ? 0 : 1), "#E8FFFF");
  }
}

// whale pose at time t
function whalePose(V, t) {
  const bob = Math.sin((2 * Math.PI * t) / 3.4) * 2.2 + Math.sin(t * 0.9) * 0.8;
  const x = R(V.X(WX)), y = R(V.Y(HEAD) + bob);
  // gaze: at the camera; glances up at the balance as the elephants pile up, down at its own heart, back
  let look = [0, 0.05];
  const up = win(t, EV.elephants - 0.4, EV.elephants + 0.5, 0.25, 0.3), down = win(t, EV.heart + 0.05, EV.heart + 0.9, 0.25, 0.3), side = win(t, EV.three, EV.people2 + 0.2, 0.25, 0.3);
  look = [look[0] - 0.15 * up + 0.35 * side, look[1] - 0.75 * up + 0.85 * down - 0.5 * side];
  // a happy squint (closed "^ ^" eyes) when each balance levels out
  const happy = Math.max(...HAPPY.map(([a, b]) => win(t, a, b, 0.14, 0.16)));
  return { x, y, bob, look, happy, blink: blinkAt(t, 4.3, 0.7) * (1 - happy) };
}
function waterTint(V) { const L = light(V.cx); return mix(mix("#2A8AB0", "#3A3A86", L.dawn * 0.4), "#141E4E", L.night); }

export function actors(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1 + 200) return;
  const P = whalePose(V, t), wl = R(V.Y(0)), wt = waterTint(V);
  if (P.x < -320 || P.x > 860) return;
  ripples(c, P.x, wl, t, -1);
  const heartA = win(t, HEART_ON, T_OUT + 0.25, TIMING.HEART_FADE, 0.4);
  drawWhale(c, P.x, P.y, {
    len: 1, look: P.look, blink: P.blink, happy: P.happy, flip: Math.sin(t * 1.15) * 0.55 + Math.sin(t * 0.43) * 0.25,
    below: wl + 1, tint: wt, k: (y) => Math.min(0.74, 0.44 + (y - wl) / 800), wob: (y) => R(Math.sin(y * 0.19 + t * 2.6) * 1.3),
    heart: heartA > 0 ? { a: heartA, glow: 0.7 + 0.25 * Math.sin(t * 2.4), beat: 0.5 + 0.5 * Math.sin(t * 2.4), r: 17 } : null,
  });
  spout(c, P.x, P.y - 102, t, V);
  drips(c, P.x, P.y, wl, t);
}

export function front(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1 + 200) return;
  const P = whalePose(V, t), wl = R(V.Y(0)); if (P.x < -320 || P.x > 860) return;
  // the surface line passing in front of the whale's body, with foam where the water meets it
  const hw = 121, L = light(V.cx);
  for (let x = P.x - hw - 2; x <= P.x + hw + 2; x++) {
    const wv = R(Math.sin((x + V.cx) * 0.09 + t * 2.2) * 1.2), e = Math.abs(x - P.x) / hw;
    c.px(x, wl + wv, e > 0.92 || ((x + R(t * 9)) % 7 < 5) ? "#E8FFFF" : "#B8E0F0");
    c.px(x, wl + wv + 1, mix("#9ACCE8", "#5A6AB0", L.night * 0.6));
    if (e > 0.82 && bayer(x, wl) < 0.6) c.px(x, wl + wv - 1, "#FFFFFF");
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 9; i++) { const ph = t * 2.3 + i * 0.9 + sd, fx = P.x + sd * (hw + 2 + R((Math.sin(ph) * 0.5 + 0.5) * 9) - (i % 3) * 3), fy = wl - 1 + (i % 3) - R(Math.abs(Math.sin(ph * 1.3)) * 2); c.px(fx, fy, "#FFFFFF"); if (i % 2) c.px(fx + sd, fy, "#D8F4FF"); }
  ripples(c, P.x, wl, t, 1);
}

/** Expanding ripple rings around the body on the surface plane: side −1 = far half (behind), +1 = near half (in front). */
function ripples(c, x, wl, t, side) {
  for (let n = 0; n < 2; n++) {
    const p = ((t / 2.8 + n * 0.5) % 1 + 1) % 1, rx = 126 + p * 150, ry = 3 + p * 7, a = (1 - p) * 0.9;
    for (let i = 0; i <= 260; i++) {
      const ang = (Math.PI * i) / 260 * (side < 0 ? -1 : 1), X = R(x + Math.cos(ang) * rx), Y = R(wl + 1 + Math.sin(ang) * ry);
      if (Math.abs(X - x) < 122 || a <= bayer(X, Y)) continue; c.px(X, Y, side < 0 ? "#9ACCE8" : "#D8F4FF");
    }
  }
}

/** The blow: a tall silvery column of mist from the blowholes every few seconds, billowing out at the top, drifting and dissolving. */
function spout(c, x, y, t, V) { for (const [t0, size, life] of BLOWS) { const u = t - t0; if (u >= 0 && u <= life) blow(c, x, y, u, size, life, V, t); } }
function blow(c, x, y, u, size, life, V, t) {
  const rise = ease(Math.min(1, u / (0.3 + 0.2 * size))), dis = sm(u, 0.25 + 0.45 * size, life), L = light(V.cx);
  const lit = mix("#FFFFFF", "#F4F2FF", L.night), mid = mix("#D8E8F8", "#C8CCF0", L.night), dark = mix("#A8C4E0", "#9098D0", L.night);
  const H = (132 * rise + 18 * dis) * size + 10 * (1 - size), drift = 14 * dis * size;
  for (let k = 0; k < 22; k++) {
    const h = k / 21; if (h > rise + 0.02) break;
    const cy = y - 4 - h * H - dis * 8 * h, cx = x + drift * h * h + Math.sin(k * 1.7 + t * 2.2) * (1 + 2 * h);
    const r = 3 + h * h * (8 + 20 * size) * (0.5 + 0.5 * rise) + dis * (3 + 5 * size) * h, a = (1 - dis) * (0.8 + 0.2 * (1 - h * 0.5));
    for (let Y = R(cy - r); Y <= R(cy + r); Y++) for (let X = R(cx - r * 1.15); X <= R(cx + r * 1.15); X++) {
      const d = ((X - cx) / (r * 1.15)) ** 2 + ((Y - cy) / r) ** 2; if (d > 1) continue;
      const q = a * (1 - d * d) * (0.75 + 0.25 * Math.sin(X * 0.7 + Y * 0.9 + k)); if (q <= bayer(X, Y)) continue;
      const lx = (X - cx + r * 0.4) / r, ly = (Y - cy + r * 0.4) / r;
      c.px(X, Y, lx * lx + ly * ly < 0.5 ? lit : d > 0.55 ? dark : mid);
    }
  }
  // droplets raining back after the burst
  if (u > 0.45 && size > 0.6) for (let i = 0; i < 26; i++) { const v = (u - 0.45) / 1.7, sx = (rnd(i * 5) - 0.5) * 90 * v, sy = -(70 + rnd(i * 3) * 60) * (1 - v) + 140 * v * v; if (v > 1 || (1 - v) <= bayer(R(x + sx), R(y + sy))) continue; c.px(R(x + sx), R(y + sy), lit); }
}
/** Water dripping from the corners of the jaw into the sea. */
function drips(c, x, y, wl, t) {
  for (const [sd, ph] of [[-1, 0], [1, 0.47]]) {
    const P = 1.3, u = (((t / P + ph) % 1) + 1) % 1, sx = x + sd * 116, sy = y + 34 + u * u * (wl - y - 34);
    if (sy < wl - 1) { c.px(R(sx), R(sy), "#E8FFFF"); c.px(R(sx), R(sy) - 1, "#9ACCE8"); }
  }
}

// ---------------------------------------------------------------- the balance (screen space, slides with the world)
/** Outlined pixel label; "≈" is drawn as a custom glyph. */
function label(c, str, cx, y, a, col = C.Y, scale = 2) {
  if (a <= 0) return; const g = fade(c, a), parts = str.split("≈"), gw = 5 * scale, sp = scale;
  const ws = parts.map((p) => (p ? c.measure(MAIN, p, { scale }) : 0)), w = ws.reduce((s, v) => s + v, 0) + (parts.length - 1) * (gw + sp * 2);
  let x = R(cx - w / 2);
  const approx = (X, Y, colr) => { for (const [j, row] of [".....", ".##.#", "#.##.", ".....", ".##.#", "#.##.", "....."].entries()) for (let i = 0; i < 5; i++) if (row[i] === "#") g.rect(X + i * scale, Y + j * scale, scale, scale, colr); };
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) { let xx = x + dx; parts.forEach((p, i) => { if (p) { g.text(MAIN, p, xx, y + dy, C.O, { scale }); xx += ws[i]; } if (i < parts.length - 1) { xx += sp; approx(xx, y + dy, C.O); xx += gw + sp; } }); }
  parts.forEach((p, i) => { if (p) { g.text(MAIN, p, x, y, col, { scale }); x += ws[i]; } if (i < parts.length - 1) { x += sp; approx(x, y, C.IV); x += gw + sp; } });
}
// the 25 elephants as a pyramid on the left pan: rows of 7, 6, 5, 4, 3 (bottom → top)
const PYR = (() => { const out = []; [7, 6, 5, 4, 3].forEach((n, row) => { for (let i = 0; i < n; i++) out.push([(i - (n - 1) / 2) * 14, -row * 9]); }); return out; })();
const ORDER = PYR.map((p, i) => i);   // bottom row first, left → right
function balance(c, V, t) {
  const A = win(t, BAL_IN, BAL_OUT, TIMING.BAL_FADE, TIMING.BAL_FADE); if (A <= 0) return;
  const cx = R(V.X(WX)), py = R(V.Y(-254)) , L = 176;
  // contents: elephants n (0..25), whale icon, heart icon, heroes
  const nE = 25 * clamp01((t - ELE_A) / (ELE_B - ELE_A)), outE = 1 - sm(t, SWAP - 0.1, SWAP + 0.35);
  const whaleA = 1 - sm(t, SWAP, SWAP + 0.4), heartA = sm(t, SWAP + 0.15, SWAP + 0.55);
  const heroK = HERO_T.map((h) => sm(t, h, h + HERO_FALL));
  // torque → beam angle (right side down is positive); eased toward the target, a little wobble after each change
  const left = (Math.min(25, nE) / 25) * outE + (heroK.reduce((s, v) => s + v, 0) / 3) * (1 - outE);
  const right = whaleA + heartA * (1 - whaleA);
  const target = 0.26 * clamp01(right - left) - 0.26 * clamp01(left - right);
  const settle = Math.sin(t * 7) * 0.025 * (win(t, SETTLE[0][0], SETTLE[0][1], 0.05, 0.8) + win(t, SETTLE[1][0], SETTLE[1][1], 0.05, 0.8));
  const th = target + settle;
  const g = fade(c, A), cs = Math.cos(th), sn = Math.sin(th);
  const E = (s) => [cx + s * L * cs, py + s * L * sn];
  // post + hook at the pivot
  g.rect(cx - 1, py - 22, 3, 22, "#2A1A08"); g.rect(cx, py - 22, 1, 22, "#C99A2A");
  g.ring(cx, py - 26, 4, "#2A1A08"); g.ring(cx, py - 26, 3, "#F4CA50");
  // beam (3 px brass with a dark outline)
  const [lx, ly] = E(-1), [rx, ry] = E(1), n = R(L * 2);
  for (let i = 0; i <= n; i++) { const x = R(lx + ((rx - lx) * i) / n), y = R(ly + ((ry - ly) * i) / n); g.px(x, y - 2, "#2A1A08"); g.px(x, y - 1, "#FDE07A"); g.px(x, y, "#F4CA50"); g.px(x, y + 1, "#B8862A"); g.px(x, y + 2, "#2A1A08"); }
  for (let j = -4; j <= 4; j++) { const hw = 4 - Math.abs(j); for (let i = -hw; i <= hw; i++) g.px(cx + i, py + j, Math.abs(i) === hw || Math.abs(j) === 4 ? "#2A1A08" : j < 0 ? "#FDE07A" : "#C99A2A"); }
  // pans hanging from the beam ends
  const pan = (ex, ey) => {
    const by = ey + 72;
    for (const s of [-1, 1]) { const tx = ex + s * 50; const m = R(Math.hypot(tx - ex, by - ey)); for (let k = 0; k <= m; k++) g.px(R(ex + ((tx - ex) * k) / m), R(ey + ((by - ey) * k) / m), "#C8B07A"); }
    for (let i = -54; i <= 54; i++) { const d = R(Math.sqrt(Math.max(0, 1 - (i / 54) ** 2)) * 6); for (let j = -1; j <= d; j++) g.px(R(ex + i), by + j, j === d || j === -1 || Math.abs(i) > 52 ? "#2A1A08" : j === 0 ? "#FDE07A" : "#C99A2A"); }
    g.ring(R(ex), R(ey) + 1, 2, "#2A1A08");
    return [R(ex), by];
  };
  const [lpx, lpy] = pan(lx, ly), [rpx, rpy] = pan(rx, ry);
  // left pan: elephants then heroes
  if (outE > 0) ORDER.forEach((idx, k) => { const e = clamp01(nE - k); if (e <= 0) return; const [dx, dy] = PYR[idx], drop = (1 - ease(e)) * 16; icon(c, "elephant", lpx + dx, lpy - 1 + dy - drop, 1, A * Math.min(1, e * 2) * outE); });
  heroK.forEach((k, i) => { if (k <= 0) return; icon(c, "hero", lpx + (i - 1) * 20, lpy - 1 - (1 - ease(k)) * 16, 2, A * k); });
  // right pan: the whale icon, then the heart
  if (whaleA > 0) icon(c, "whale", rpx, rpy - 1, 2, A * whaleA * sm(t, BAL_IN, BAL_IN + 0.4));
  if (heartA > 0) drawHeart(c, rpx, rpy - 18, 13, { a: A * heartA, glow: 0.4 + 0.2 * Math.sin(t * 2.4) });
  // labels above the beam
  label(c, "25 ELEPHANTS = 1 WHALE", cx, py - 50, A * win(t, LABELS[0][0], LABELS[0][1], 0.3, 0.3));
  label(c, "HEART ≈ 3 PEOPLE", cx, py - 50, A * sm(t, LABELS[1][0], LABELS[1][0] + 0.35));
}

export function hud(c, V, t) {
  if (V.x1 < X0 || V.x0 > X1 + 200) return;
  balance(c, V, t);
  pickup(c, R(V.X(WX + 122)), R(V.Y(-196)), "150 T", (t - PICK[0]) / PICK[1]);
}
