// «The last person alive» · Builder P — POV3 eyes: ≈ 40 pairs of glowing eyes in the deep forest.
// Each pair has a world position (depth gives its size), a colour, an opening time on the narration (lids part over
// 0.25 s, never a pop), occasional blinks, a slow idle drift, and a final turn toward the camera (head turns → the pair
// widens to full spacing; pupils move to the centre). Trunks nearer than a pair hide it (depth buffer S.zt).
import { BT, vn, clamp01, GW, GH } from "./pov-core.mjs";
import { EV } from "./timeline.mjs";
import { rnd } from "./layout.mjs";

const R = Math.round;
const smo = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const COLS = [
  { core: [255, 244, 190], iris: [255, 176, 46], edge: [200, 92, 22], glow: [255, 140, 40] },   // amber
  { core: [255, 214, 170], iris: [236, 70, 40], edge: [150, 26, 20], glow: [230, 50, 30] },     // red
  { core: [250, 255, 200], iris: [214, 220, 70], edge: [120, 140, 30], glow: [190, 210, 60] },  // pale yellow-green (rare)
];

/**
 * Build the pairs for a camera (f, cx, H0, cam at z = 0) — screen-space targets are turned into world positions so the
 * layout is art-directed: [screen x, screen y, depth, colour, opening group].
 */
export function makeEyes(f, cx, H0, camY) {
  const L = [
    // the first pair (on "now"): medium-close, left of centre, low between two trunks
    [190, 446, 5.0, 0, 0],
    // "forest": a few more
    [352, 404, 9.5, 1, 1], [118, 352, 13, 0, 1], [300, 520, 4.4, 0, 1], [420, 300, 15, 0, 1],
    // "full": many
    [70, 470, 8, 1, 2], [250, 380, 16, 0, 2], [160, 300, 21, 0, 2], [395, 470, 7.2, 0, 2], [438, 372, 12, 1, 2],
    [220, 250, 24, 2, 2], [330, 330, 19, 0, 2], [90, 230, 26, 0, 2], [430, 560, 5.2, 1, 2], [282, 268, 28, 0, 2],
    [54, 384, 11, 0, 2], [370, 210, 25, 1, 2], [176, 560, 3.0, 0, 2], [500, 300, 18, 0, 2], [130, 420, 17, 1, 2],
    // "eyes": the rest — everywhere, a few higher in the trees, a few low near the ground, two big close ones
    [60, 300, 20, 1, 3], [240, 330, 30, 0, 3], [310, 440, 12, 0, 3], [410, 250, 22, 0, 3], [140, 180, 23, 1, 3],
    [436, 512, 9, 0, 3], [62, 522, 6.2, 1, 3], [360, 520, 10, 2, 3], [200, 410, 22, 0, 3], [300, 160, 26, 1, 3],
    [104, 586, 4.6, 0, 3], [440, 140, 24, 0, 3], [262, 470, 26, 1, 3], [176, 474, 11, 0, 3], [360, 578, 2.7, 1, 3],
    [50, 150, 27, 0, 3], [452, 432, 14, 1, 3], [318, 588, 7.8, 0, 3], [150, 520, 13, 1, 3], [236, 604, 6, 0, 3],
  ];
  const groups = [[EV.now, EV.now], [EV.forest1, EV.forest1 + 0.32], [EV.full, EV.full + 0.36], [EV.eyes, EV.eyes + 0.5]];
  const count = [0, 0, 0, 0], tot = [1, 4, 15, 20];
  return L.map(([X, Y, d, col, g], i) => {
    const k = count[g]++, [a, b] = groups[g];
    const x = (X - cx) * d / f, y = camY - (Y - H0) * d / f;
    return {
      x, y, z: d, col, t0: a + (b - a) * (tot[g] > 1 ? k / (tot[g] - 1) : 0) + (rnd(i * 7) - 0.5) * 0.04,
      gaze0: (rnd(i * 3) - 0.5) * 1.4, spread0: 0.62 + rnd(i * 5) * 0.22, tilt: (rnd(i * 11) - 0.5) * 0.25,
      blinkP: 1.6 + rnd(i * 13) * 2.4, blinkPh: rnd(i * 17) * 3, turn: 25.32 + rnd(i * 19) * 0.32, drift: rnd(i * 23), seed: i,
    };
  });
}

/** aperture (0 shut … 1 open) and the slit's fade-in for the opening. */
function lids(E, t) {
  const o = (t - E.t0) / 0.26; if (o <= 0) return [0, 0];
  const open = ease(o), fadeIn = clamp01(o / 0.3);
  // blinks after it is open: a short continuous close/open
  let bl = 0;
  const tb = t - E.t0 - 0.6; if (tb > 0) { const ph = (tb + E.blinkPh) % E.blinkP, u = ph / 0.2; if (u < 1) bl = Math.sin(Math.PI * u); }
  bl *= 1 - smo(t, E.turn - 0.45, E.turn - 0.2);                          // no blinking once they turn to us
  return [open * (1 - 0.92 * bl), fadeIn];
}

/** Draw all pairs, far to near; trunks nearer than a pair hide it. light: 0..1 global boost (eyes glow more in the dark). */
export function drawEyes(c, S, eyes, t, boost = 1) {
  const list = eyes.filter((E) => t > E.t0).sort((a, b) => b.z - a.z), zt = S.zt, D = c.d;
  for (const E of list) {
    const [ap, fin] = lids(E, t); if (fin <= 0) continue;
    const turn = ease((t - E.turn) / 0.55);
    const d = E.z - S.cam.z, s = S.f / d;
    const dx = 0.012 * Math.sin(t * 0.7 + E.drift * 9) * (1 - turn), dy = 0.008 * Math.sin(t * 0.9 + E.drift * 5);
    const X = S.cx + (E.x + dx - S.cam.x) * s, Y = S.H0 - (E.y + dy - S.cam.y) * s;
    const C = COLS[E.col];
    const ew = Math.max(0.8, 0.024 * s * 2.1), sp = Math.max(3.4, 0.078 * s * 1.55 * (E.spread0 + (1 - E.spread0) * turn));
    const gaze = E.gaze0 * (1 - turn), tilt = E.tilt * (1 - turn * 0.6);
    const glowA = 0.85 * ap * boost * fin;
    for (const side of [-1, 1]) {
      // the far eye of a turned-away head is a little smaller and dimmer until it turns to us
      const far = side * Math.sign(E.gaze0 || 1) < 0 ? 1 - 0.35 * (1 - turn) : 1;
      const ex = X + side * sp / 2, ey = Y + side * sp / 2 * Math.sin(tilt), w = ew * far, h = Math.max(0.5, ew * 0.62 * ap) * far;
      // glow halo (dithered, behind the eye, occluded by nearer trunks)
      const gr = w * 3.0 + 3.5;
      for (let yy = Math.floor(ey - gr * 0.8); yy <= Math.ceil(ey + gr * 0.8); yy++) for (let xx = Math.floor(ex - gr); xx <= Math.ceil(ex + gr); xx++) {
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        const i = yy * GW + xx; if (zt && zt[i] < d) continue;
        const qx = (xx + 0.5 - ex) / gr, qy = (yy + 0.5 - ey) / (gr * 0.8), q = 1 - (qx * qx + qy * qy); if (q <= 0) continue;
        const v = glowA * q * q * far, b = BT[((yy & 3) << 2) | (xx & 3)];
        const lv = v * 3, lo = lv | 0, fr = lv - lo, qq = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / 3;
        if (qq <= 0) continue;
        const k = i * 3, m = Math.min(0.9, qq * 0.8);
        D[k] += (C.glow[0] * 0.62 - D[k]) * m * 0.6; D[k + 1] += (C.glow[1] * 0.62 - D[k + 1]) * m * 0.6; D[k + 2] += (C.glow[2] * 0.62 - D[k + 2]) * m * 0.6;
      }
      // the eye: an almond (pointed corners); core brightest at the top centre; a vertical slit pupil
      const gx = gaze * w * 0.45;
      if (w < 1.6) {
        // tiny: one or two bright pixels, the slit fades in first
        const a = fin * (ap > 0.15 ? 1 : 0.5);
        const xx = R(ex), yy = R(ey); if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        if (zt && zt[yy * GW + xx] < d) continue;
        if (a <= BT[((yy & 3) << 2) | (xx & 3)]) continue;
        const col = ap > 0.6 ? C.core : C.iris, k = (yy * GW + xx) * 3; D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2];
        if (w > 1.1 && xx + 1 < GW && ap > 0.4) { const k2 = k + 3; D[k2] = C.iris[0]; D[k2 + 1] = C.iris[1]; D[k2 + 2] = C.iris[2]; }
        continue;
      }
      const x0 = Math.floor(ex - w - 1), x1 = Math.ceil(ex + w + 1), y0 = Math.floor(ey - h - 1), y1 = Math.ceil(ey + h + 1);
      for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) {
        if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue;
        const i = yy * GW + xx; if (zt && zt[i] < d) continue;
        const u = (xx + 0.5 - ex) / w, v = (yy + 0.5 - ey) / Math.max(0.5, h);
        const e = Math.pow(Math.abs(u), 1.5) + Math.pow(Math.abs(v), 1.6); if (e > 1) continue;
        const b = BT[((yy & 3) << 2) | (xx & 3)];
        if (fin < 1 && fin <= b) continue;
        let col = e > 0.72 ? C.edge : v < -0.1 && Math.abs(u - gaze * 0.3) < 0.55 ? C.core : C.iris;
        const pu = (xx + 0.5 - (ex + gx)) / w;
        if (Math.abs(pu) < 0.13 + 0.05 * (1 - ap) && ap > 0.35 && w > 2.2) col = [30, 8, 6];
        if (w > 3 && Math.abs(v) > 0.82 && ap > 0.3) col = C.edge;
        const k = i * 3; D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2];
      }
    }
  }
}
