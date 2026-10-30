// «Infinite aura» · builder X · space (2026-10-25). From "One billion" (27.62) the world is space: a deep starfield in
// three parallax layers, a violet-magenta nebula band and a small spiral galaxy, and the pixel Earth v1
// (renderer/pixel/earth.mjs) far below the staircase — on "The planet is too small for you" (28.84–30.38) it shrinks to
// a marble. On "Infinite aura" (30.72) a white-gold warp/galaxy burst explodes behind him (star streaks radiating, golden
// spiral arms), then settles into a calm cosmic backdrop with a soft golden halo for the end card. Screen space; the lead
// draws the staircase and him on top and dissolves this in (X.space). Motion runs on film time X.t.
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe } from "../../../../renderer/pixel/earth.mjs";
import { rnd, clamp01, sm, lerp, ease, GW, GH } from "./layout.mjs";
import { EV } from "./timeline.mjs";
import { nzs, hexA, prof, camAt } from "./X-fx.mjs";

const R = Math.round, PI = Math.PI, PAD = 40, BW = GW + 2 * PAD, BH = GH + 2 * PAD;
const C0 = camAt(EV.billion);                         // parallax origin

// ---------------------------------------------------------------- the static backdrop (built once): deep gradient, nebula, galaxy, dust stars
let BG = null;
function buildBG() {
  const d = new Uint8ClampedArray(BW * BH * 3);
  const TOP = hexA("#04020C"), BOT = hexA("#0C0620");
  const NEB = ["#160B2E", "#251242", "#38185A", "#552070", "#7E2E84", "#AE4C98", "#E07AB4"].map(hexA), TEAL = ["#0C1A30", "#12304A", "#1A4A64", "#24687C", "#3A8A94", "#5CB0AC", "#9ADCC8"].map(hexA);
  const GAL = ["#2A1646", "#5A2C70", "#9A4C8E", "#E08AA8", "#FFD8B8", "#FFF6E4"].map(hexA);
  const gx = 100 + PAD, gy = 104 + PAD, ga = -0.5, gs = 21;
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    const i = (y * BW + x) * 3, v = y / BH;
    let col = [lerp(TOP[0], BOT[0], v), lerp(TOP[1], BOT[1], v), lerp(TOP[2], BOT[2], v)];
    // the nebula band (top right → middle left), billowing noise, dust lanes, teal pockets; dithered tone bands
    const lx = x - PAD, ly = y - PAD, dl = (ly - (500 - lx * 0.82)) / 165, band = Math.exp(-dl * dl * 1.3);
    const n = nzs(lx * 0.035 + 31, ly * 0.035 + 7), n2 = nzs(lx * 0.09 + 90, ly * 0.09 + 40), n3 = nzs(lx * 0.06 + 150, ly * 0.06 + 210), n4 = nzs(lx * 0.025 + 300, ly * 0.025 + 77);
    let k = band * (0.15 + 1.5 * n) * (0.6 + 0.8 * n2) - 0.32;
    const lane = Math.exp(-(((n3 - 0.5) / 0.05) ** 2)) * band; k -= lane * 0.45;
    if (k > 0) {
      const q = Math.min(6, k * 7.5), j = Math.floor(q), f = q - j, idx = Math.min(6, f > bayer(x, y) ? j + 1 : j);
      const tl = clamp01((n4 - 0.56) * 5), base = idx === 0 ? mix(col, NEB[0], 0.5) : mix(NEB[idx], TEAL[idx], tl);
      col = base;
    }
    // the galaxy (tilted spiral, two arms)
    const dx = x - gx, dy = y - gy, u = dx * Math.cos(ga) + dy * Math.sin(ga), w = (-dx * Math.sin(ga) + dy * Math.cos(ga)) / 0.42, r = Math.hypot(u, w);
    if (r < gs * 5) {
      const th = Math.atan2(w, u), arm = Math.max(0, Math.cos(2 * (th - 2.4 * Math.log(r / gs + 0.35)))), b = Math.exp(-r / (gs * 1.1)) * (0.25 + 0.95 * arm * arm) * 1.5 + Math.exp(-r / (gs * 0.22)) * 1.4;
      const q = Math.min(5.99, b * 5.2), j = Math.floor(q), f = q - j, idx = f > bayer(x, y) ? j + 1 : j;
      if (idx > 0) col = GAL[Math.min(5, idx - 1)];
    }
    d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
  }
  // far dust stars, baked (they move with the backdrop)
  for (let s = 0; s < 520; s++) { const x = Math.floor(rnd(s * 3 + 11) * BW), y = Math.floor(rnd(s * 3 + 12) * BH), i = (y * BW + x) * 3, c = rnd(s * 3 + 13) > 0.7 ? hexA("#8C84C0") : hexA("#4E4878"); d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; }
  return d;
}

// ---------------------------------------------------------------- live stars (two layers, more parallax, twinkle)
const STARS = Array.from({ length: 170 }, (_, i) => ({ x: rnd(i * 5 + 1) * (GW + 80), y: rnd(i * 5 + 2) * (GH + 80), p: i < 130 ? 0.06 : 0.14, big: i >= 130 || rnd(i * 5 + 3) > 0.85, ph: rnd(i * 5 + 4) * 6.28, sp: 1.5 + rnd(i * 5 + 5) * 2.5, warm: rnd(i * 5 + 6) > 0.8 }));
function stars(c, X, k) {
  const ox = (X.cam.cx - C0.cx), oy = (X.cam.cy - C0.cy);
  for (const s of STARS) {
    const x = R((((s.x - ox * s.p - X.t * 3 * s.p) % (GW + 80)) + GW + 80) % (GW + 80) - 40), y = R((((s.y - oy * s.p) % (GH + 80)) + GH + 80) % (GH + 80) - 40);
    if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
    const tw = 0.5 + 0.5 * Math.sin(X.t * s.sp + s.ph), col = s.warm ? (tw > 0.5 ? "#FFE9B0" : "#C8A870") : tw > 0.5 ? "#FFFFFF" : "#B8B0E8";
    if (k < 1 && k <= bayer(x, y)) continue;
    c.px(x, y, col);
    if (s.big && tw > 0.35) { const arm = tw > 0.8 ? 2 : 1, ac = s.warm ? "#A88A5A" : "#7E74C0"; for (let a = 1; a <= arm; a++) { c.px(x - a, y, ac); c.px(x + a, y, ac); c.px(x, y - a, ac); c.px(x, y + a, ac); } }
  }
}

// ---------------------------------------------------------------- the Earth: far below the stairs, then too small for you
function earthView(t) {
  const shrink = sm(t, EV.planet - 0.1, EV.smallEnd - 0.1), back = 1.70158, u = shrink, ob = 1 + (back + 1) * Math.pow(u - 1, 3) + back * Math.pow(u - 1, 2);   // ease-out-back
  const card = ease(clamp01((t - EV.how + 0.2) / 0.6));
  const Rr = lerp(lerp(60, 19, ob), 15, card), cx = lerp(lerp(416, 432, shrink), 482, card), cy = lerp(lerp(574, 596, shrink), 664, card) + 4 * Math.sin(t * 1.3);
  return { lat0: 18, lon0: 10 + t * 14, R: Math.max(6, Rr), cx: R(cx), cy: R(cy) };
}

// ---------------------------------------------------------------- the warp / galaxy burst on "Infinite aura"
const WARP = Array.from({ length: 190 }, (_, i) => ({ a: rnd(i * 7 + 1) * PI * 2, v: 0.5 + rnd(i * 7 + 2), ph: rnd(i * 7 + 3), w: rnd(i * 7 + 4) }));
const GOLD = ["#FFFFFF", "#FFF6D8", "#FFE680", "#F4CA50", "#D29A1C", "#8A5A18"].map(hexA), GLOW = ["#9A78B8", "#E8B8B0", "#FFE6A0", "#FFFDF0"].map(hexA);
function burst(c, X) {
  const t = X.t, b0 = EV.infinite - 0.08, burstK = sm(t, b0, b0 + 0.16) * (1 - 0.72 * sm(t, EV.infinite + 0.45, EV.how + 0.1)), calm = sm(t, EV.infinite + 0.3, EV.how + 0.4);
  if (burstK <= 0) return;
  const cx = X.cam.sx - 6, cy = 400 - 18 * X.cam.z, age = t - b0;
  // a radial white-gold glow behind him with rotating golden spiral arms in it (dithered bands)
  const gr = (90 + 300 * sm(age, 0, 0.3)) * (1 - 0.45 * calm), x0 = Math.max(0, Math.floor(cx - gr)), x1 = Math.min(GW - 1, Math.ceil(cx + gr)), y0 = Math.max(0, Math.floor(cy - gr * 1.15)), y1 = Math.min(GH - 1, Math.ceil(cy + gr * 1.15));
  const gk = burstK * (0.45 + 0.55 * (1 - calm)), rot = t * 0.8;
  const armRow = new Float32Array(x1 - x0 + 2);
  for (let y = y0; y <= y1; y++) {
    const even = ((y - y0) & 1) === 0;
    for (let x = x0; x <= x1; x++) {
    const dx = x - cx, dy = (y - cy) / 1.15, d = Math.hypot(dx, dy) / gr; if (d >= 1) continue;
    const base = Math.pow(1 - d, 1.6) * 3.2 * gk; if (base + 1.6 * (1 - d) * gk < 0.06) continue;
    const xi = (x - x0) & ~1;                                   // spiral arms evaluated on a 2×2 grid (smooth anyway)
    if (even && ((x - x0) & 1) === 0) { const rr = d * gr, arm = Math.cos(2 * (Math.atan2(dy, dx) - rot - 2.2 * Math.log(1 + rr / 22))); armRow[xi] = Math.pow(Math.max(0, arm), 4) * Math.min(1, rr / 30); }
    const v = base + armRow[xi] * 1.6 * (1 - d) * gk; if (v < 0.06) continue;
    const j = Math.floor(v), f = v - j, q = Math.min(4, f > bayer(x, y) ? j + 1 : j); if (q <= 0) continue;
    const i = (y * GW + x) * 3, col = GLOW[q - 1], m = [0.22, 0.38, 0.6, 0.85][q - 1];
    c.d[i] = R(lerp(c.d[i], col[0], m)); c.d[i + 1] = R(lerp(c.d[i + 1], col[1], m)); c.d[i + 2] = R(lerp(c.d[i + 2], col[2], m));
    }
  }
  // warp streaks radiating out (the hyperdrive look), fewer and slower once it calms
  const n = R(WARP.length * (0.35 + 0.65 * (1 - calm)));
  for (let i = 0; i < n; i++) {
    const s = WARP[i], spd = (260 + 420 * s.v) * (1 - 0.75 * calm), r = ((age * spd + s.ph * 420) % 420) + 20, len = (8 + r * (0.22 + 0.25 * s.v)) * (1 - 0.6 * calm) * Math.min(1, age * 6);
    const ca = Math.cos(s.a), sa = Math.sin(s.a), xa = cx + ca * r, ya = cy + sa * r, xb = cx + ca * (r + len), yb = cy + sa * (r + len);
    const a = burstK * Math.min(1, r / 60) * (1 - calm * 0.5), col = s.w > 0.7 ? GOLD[2] : s.w > 0.35 ? GOLD[1] : GOLD[0], steps = Math.ceil(len);
    for (let j = 0; j <= steps; j++) { const x = R(lerp(xa, xb, j / steps)), y = R(lerp(ya, yb, j / steps)); if (a * (0.4 + 0.6 * j / steps) > bayer(x, y)) c.px(x, y, j > steps * 0.6 ? col : GOLD[3]); }
  }
}

// ---------------------------------------------------------------- the slot
BG = buildBG();                                      // once, at import (≈ 60 ms), never inside a frame
export const back = prof("space.back", (c, X) => {
  const ox = Math.max(-PAD, Math.min(PAD, R((X.cam.cx - C0.cx) * 0.035))), oy = Math.max(-PAD, Math.min(PAD, R((X.cam.cy - C0.cy) * 0.035)));
  for (let y = 0; y < GH; y++) { const s = ((y + PAD - oy) * BW + PAD + ox) * 3; c.d.set(BG.subarray(s, s + GW * 3), y * GW * 3); }
  stars(c, X, 1);
  const v = earthView(X.t);
  drawGlobe(c, v, { lat: 12, lon: v.lon0 - 62 }, { alpha: 1 });
  burst(c, X);
});

// ---------------------------------------------------------------- sound
export const MOTIONS = [
  { t0: +(EV.planet - 0.1).toFixed(3), t1: +(EV.smallEnd - 0.1).toFixed(3), kind: "whoosh", level: 0.5, note: "the Earth shrinks to a marble (ease-out-back)" },
  { t0: +(EV.infinite - 0.08).toFixed(3), t1: +(EV.infinite + 0.9).toFixed(3), kind: "warp", level: 1, note: "white-gold warp/galaxy burst behind him" },
];
