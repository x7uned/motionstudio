// LV1 · ocean — the wandering albatross, 2.5 wingbeats a second (RANGE BIOME.ocean = 0..540, rest camera cx 270 → screen
// x = world x). Open Southern Ocean in the morning (tod ≈ 0.9): long swells roll in from the horizon (y = LAND) to the
// bottom edge, whitecaps, lace foam and spray in front; a snowy island and a far tabular iceberg on the horizon, a few
// distant petrels; a red "LV 1" buoy bobbing on the swell. At the right edge the sea meets the harbour quay of LV2
// (drawn by city.mjs). The cute albatross arrives on the rewind, glides on held-out wings with a slow banking sway
// ("mostly glides", 12.3 s), then flaps from 13.5 s: e = cos(2π·wingPhase("albatross", t))·strokeAmt — big slow strokes,
// each downstroke pushing a little puff of air down (the meter counts the beats on "you could count every beat").
import { BIOME, LAND, EV, LV, END, wingPhase, strokeAmt } from "../timeline.mjs";
import { sign, blinkAt, fade, bayer, ease } from "../cute.mjs";
import { drawSea, drawSpray } from "./ocean-sea.mjs";
import { drawAlbatross, wingFrames } from "./ocean-albatross.mjs";

export const RANGE = BIOME.ocean;
const R = Math.round, TAU = Math.PI * 2, [X0, X1] = RANGE;
const osc = (t, n, ph = 0) => Math.sin((TAU * n * t) / END + ph);
const off = (V) => V.x1 < X0 - 140 || V.x0 > X1 + 140;

// ---------------------------------------------------------------- timing (shared with ocean-motions.mjs)
const ARRIVE = [9.55, 11.45];                     // the glide-in during the rewind
const HEAD = [270, LAND - 288];                   // head centre (world) → screen (270, 352) at the rest camera
export const TIMING = { ARRIVE, FLAP: EV.flaps1 - 0.15 };

/** Albatross pose at t (screen): position, roll, glide flex, look, blink, wing phase and stroke amount. */
export function pose(V, t) {
  const amt = strokeAmt("albatross", t), ph = wingPhase("albatross", t), glide = 1 - amt;
  const k = ease((t - ARRIVE[0]) / (ARRIVE[1] - ARRIVE[0])), inn = 1 - k;
  const dx = -120 * inn + 3 * osc(t, 5, 0.3), dy = 46 * inn * inn + (4.5 * osc(t, 9, 1) + 2 * osc(t, 21, 0.2)) * (0.4 + 0.6 * glide) - 3 * amt * Math.sin(TAU * ph);
  const tilt = (0.15 * osc(t, 14) + 0.035 * osc(t, 31, 0.8)) * (1 - 0.78 * amt) - 0.2 * inn * Math.sin(Math.PI * Math.min(1, k * 1.2));
  const flex = 0.035 * osc(t, 23, 0.5) * glide;
  const look = [0.22 * osc(t, 6, 2.1), 0.12 + 0.18 * glide * (0.5 + 0.5 * osc(t, 11))];
  return { x: V.X(HEAD[0] + dx), y: V.Y(HEAD[1] + dy), tilt, flex, look, blink: blinkAt(t, END / 15, 0.9), ph, amt };
}

// ---------------------------------------------------------------- horizon props
const ISLE = (() => {     // snowy island silhouette heights (world x 24..176), deterministic
  const h = []; for (let x = 0; x <= 152; x++) { const u = x / 152; let v = 31 * Math.exp(-(((u - 0.34) / 0.16) ** 2)) + 19 * Math.exp(-(((u - 0.62) / 0.13) ** 2)) + 9 * Math.exp(-(((u - 0.85) / 0.1) ** 2)) + 4 * Math.sin(u * 47) * Math.sin(u * 13); v *= Math.min(1, u * 9, (1 - u) * 7); h.push(Math.max(0, v)); }
  return h;
})();
// low morning cloud streaks above the horizon: [world x centre, half length, height above LAND, thickness]
const STREAKS = [[120, 150, 62, 5], [330, 120, 88, 4], [470, 110, 40, 3.5], [250, 90, 30, 3], [40, 70, 112, 3]];
function horizonProps(c, V, t) {
  const HY = R(V.Y(LAND));
  for (const [wx, hl, hgt, th] of STREAKS) {
    const x0 = Math.max(0, R(V.X(Math.max(X0, wx - hl)))), x1 = Math.min(c.w - 1, R(V.X(Math.min(X1 + 30, wx + hl)))), yc = V.Y(LAND - hgt);
    for (let x = x0; x <= x1; x++) {
      const u = (x - V.X(wx)) / hl, w = Math.sqrt(Math.max(0, 1 - u * u)) * (0.75 + 0.25 * Math.sin(u * 9 + wx)), top = yc - th * w * 1.3, bot = yc + th * w * 0.6;
      for (let y = R(top); y <= R(bot); y++) { const k = (y - top) / Math.max(1, bot - top), edge = Math.min(1, w * 3); if (edge < 1 && bayer(x, y) > edge) continue;
        c.px(x, y, k < 0.35 ? "#FFF2E4" : k < 0.7 ? "#FBDCCC" : "#EEC2B8"); }
    }
  }
  // the island (hazy violet-blue, snow on the peaks, a lighter sunlit flank)
  for (let i = 0; i < ISLE.length; i++) {
    const x = R(V.X(24 + i)), hh = ISLE[i]; if (x < 0 || x >= c.w || hh < 0.5) continue;
    const top = HY - R(hh), slope = (ISLE[Math.min(ISLE.length - 1, i + 1)] - ISLE[Math.max(0, i - 1)]) / 2;
    for (let y = top; y < HY; y++) {
      const dep = (y - top) / Math.max(1, hh), lit = slope > 0.15, snow = hh > 15 && y - top < (hh - 13) * 0.55 + (Math.sin(i * 1.7) > 0.3 ? 2 : 0);
      let col = snow ? (lit ? "#F2F6FC" : "#C6D2E6") : lit ? (dep < 0.5 ? "#A2AECA" : "#8E9CBC") : dep < 0.5 ? "#8492B4" : "#7888AC";
      if (!snow && dep > 0.82 && bayer(x, y) < (dep - 0.82) * 4) col = "#A8BCD4";              // haze at the waterline
      c.px(x, y, col);
    }
    c.px(x, top, hh > 15 ? "#FFFFFF" : "#B4C0D8");
  }
  // the harbour breakwater and its little lighthouse at the far end of LV2's quay (the sea's right edge)
  for (let x = 488; x < 540; x++) { const sx = R(V.X(x)); if (sx < 0 || sx >= c.w) continue; const h = 3 + (x > 500 ? 1 : 0) + ((x * 7) % 5 === 0 ? 1 : 0); for (let y = HY - h; y < HY; y++) c.px(sx, y, y === HY - h ? "#B8B4B4" : "#8A8490"); c.px(sx, HY, (x & 1) ? "#FFFFFF" : "#D6ECF4"); }
  { const lx = R(V.X(506)), base = HY - 4;
    if (lx > -20 && lx < c.w + 20) {
      for (let y = base - 40; y < base; y++) { const k = (base - y) / 40, w = R(6 - 2 * k); for (let i = -w; i <= w; i++) { const band = Math.floor((base - y) / 8) % 2 === 1; c.px(lx + i, y, i === -w ? (band ? "#E86060" : "#FFFFFF") : i === w ? (band ? "#8A2A30" : "#B8B4C4") : band ? "#C83A3E" : "#F2EEF0"); } }
      for (let i = -6; i <= 6; i++) c.px(lx + i, base - 40, "#2A2A34");
      for (let y = base - 48; y < base - 40; y++) for (let i = -3; i <= 3; i++) c.px(lx + i, y, i === -3 || i === 3 || y === base - 48 ? "#2A2A34" : "#FFF0B0");
      for (let i = -4; i <= 4; i++) { c.px(lx + i, base - 49, "#C83A3E"); if (Math.abs(i) < 3) c.px(lx + i, base - 50, "#C83A3E"); }
      c.px(lx, base - 51, "#2A2A34");
      const glow = Math.max(0, osc(t, 12, 0.3)) ** 2, gg = fade(c, glow);            // the lamp swells and fades (never one frame)
      for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) gg.px(lx + dx, base - 45 + dy, Math.abs(dx) > 1 ? "#FFF6C8" : "#FFFFFF");
    } }
  // a far tabular iceberg
  for (let x = 322; x <= 362; x++) {
    const sx = R(V.X(x)); if (sx < 0 || sx >= c.w) continue; const u = (x - 322) / 40, h = R(11 * Math.min(1, u * 6, (1 - u) * 5) + (u > 0.3 && u < 0.6 ? 1 : 0));
    for (let y = HY - h; y < HY; y++) c.px(sx, y, y === HY - h ? "#FFFFFF" : u > 0.72 ? "#9EBCD8" : y < HY - h + 3 ? "#EAF4FC" : "#C8DCEE");
    if (h > 0) c.px(sx, HY + 1, (x & 1) ? "#E0EEF6" : "#B6D0E2");
  }
}
/** distant petrels gliding low over the sea (no flaps: only the albatross's wings beat in this level) */
function petrels(c, V, t, a = 1) {
  const g = fade(c, a);
  for (const [wx, wy, n, ph, s] of [[96, LAND - 92, 4, 0.2, 1], [128, LAND - 104, 5, 1.7, 1], [486, LAND - 214, 3, 3.1, 1], [430, LAND - 64, 6, 4.4, 0]]) {
    const x = R(V.X(wx + 14 * osc(t, n, ph))), y = R(V.Y(wy + 4 * osc(t, n * 2 + 1, ph * 2))), tip = 1;
    if (x < -6 || x > c.w + 6) continue; const col = "#3A4660";
    g.px(x, y, col); g.px(x - 1, y - 1, col); g.px(x + 1, y - 1, col); g.px(x - 2, y - 1, col); g.px(x + 2, y - 1, col); g.px(x - 3, y - tip, col); g.px(x + 3, y - tip, col);
    if (s) { g.px(x - 4, y + 1 - tip, col); g.px(x + 4, y + 1 - tip, col); }
  }
}

// ---------------------------------------------------------------- layers
export function back(c, V, t) {
  if (off(V)) return;
  horizonProps(c, V, t);
  petrels(c, V, t);
  drawSea(c, V, t, X0, X1, LAND);
  drawSpray(c, V, t, X0, X1, LAND);
}

export function actors(c, V, t) {
  if (off(V)) return;
  // the LV 1 buoy riding the swell in the lower left
  const bx = R(V.X(64)), by = R(V.Y(LAND + 14) + 2.2 * osc(t, 30, 0.5)), lean = 0.06 * osc(t, 30, 2);
  if (bx > -60 && bx < c.w + 60) buoy(c, bx, by, lean, t);
  // the albatross
  const P = pose(V, t);
  if (P.x < -260 || P.x > c.w + 260) return;
  puffs(c, P, t);
  drawAlbatross(c, P.x, P.y, P);
}

/** The buoy: a red float with a white band riding the swell, its pole carrying the "LV 1" board (cute.sign buoy). */
function buoy(c, x, y, lean, t) {
  const top = y - 10;
  sign(c, x + R(lean * 40), top, "LV 1", "buoy", 1, t);
  for (let j = 0; j <= 12; j++) { const w = R(5 + j * 0.9), yy = top + j; for (let i = -w; i <= w; i++) { const xx = x + i + R(lean * (12 - j)); const col = j < 3 ? "#2A0A10" : j >= 5 && j <= 7 ? (i < -w * 0.4 ? "#D8D2C8" : "#F4EEE0") : i < -w * 0.4 ? "#A82A2A" : i > w * 0.6 ? "#7A1A24" : "#D8443C"; c.px(xx, yy, i === -w || i === w ? "#3A0A10" : col); } }
  // the light on top and a little foam ring at the waterline
  c.px(x + R(lean * 40), top - 1, "#FFE070");
  for (let i = -16; i <= 16; i++) { const yy = y + 2 + R(Math.abs(i) * 0.08), on = (i + R(t * 6)) % 3 !== 0; if (on) c.px(x + i, yy, Math.abs(i) > 12 ? "#BFE0EC" : "#FFFFFF"); }
}

/** Each downstroke pushes air: from the middle of the downstroke a soft crescent of wind marks peels off under each
 *  wing (always below the wing's current lower edge), drops away and fades. The meter counts the beats. */
function puffs(c, P, t) {
  if (P.amt < 0.05) return;
  const rate = 2.5, ph = P.ph - 0.25, Wn = wingFrames(R(P.x), R(P.y), Math.round(P.tilt * 50) / 50, P.ph, P.amt, P.flex);
  for (let k = 0; k < 2; k++) {
    const b = Math.floor(ph) - k, tau = (ph - b) / rate; if (tau < 0 || tau > 0.55) continue;
    const a = Math.min(1, tau / 0.1) * Math.pow(1 - tau / 0.55, 1.3) * P.amt, g = fade(c, a), drop = 50 + 90 * ease(Math.min(1, tau / 0.55));
    for (const { F, sd } of Wn.wings) {
      const [, hy] = F.P(F.n * 0.45, -20), cx = P.x + sd * (104 + 26 * tau), cy = Math.max(hy + 12, P.y + drop), w = 16 + tau * 44;
      for (let j = 0; j < 3; j++) { const yy = cy + j * 8, ww = R(w - j * 5), ox = sd * j * 4; for (let i = -ww; i <= ww; i++) { if ((i + j * 3) % 9 === 8) continue; const u = i / ww, yv = R(yy - 7 * (1 - u * u)); g.px(R(cx + ox + i), yv, "#FFFFFF"); g.px(R(cx + ox + i), yv + 1, j === 0 ? "#E4F2FC" : "#B8D6EE"); g.px(R(cx + ox + i), yv + 2, "#8CB4DA"); } }
    }
  }
}
