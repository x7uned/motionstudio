// The screens, computed from the low-res game picture (game.mjs, 64×48) — pure functions of t, nothing faked:
//  · FLAT (sig≈0, scan 0): hard nearest-neighbour squares, exactly what a modern panel shows.
//  · CRT: each game row is one beam line. Horizontally the beam blurs neighbours (gaussian, sig in game pixels: a 1-px
//    water/background stripe pair melts into see-through water); vertically every line has a soft luminance-dependent
//    profile, so dark gaps open between lines and bright lines bloom into them; a little wide glow; on close-ups the
//    phosphor mask (slot mask: red, green and blue dots, three triads per game pixel) multiplies the light.
//  · beam(r, u) (optional): brightness of row r at column u while the electron beam paints the picture line by line.
// drawPicture(c, img, { clip, map, sig, scan, glow, mask, beam, shade, alpha }) writes straight into c.d (540×960 RGB).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH } from "./game.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const TAPS = 5;
/**
 * clip: [x0, y0, x1, y1] screen rect (end exclusive); map: { ox, oy, gu, gv, s } — screen point (ox, oy) shows game point
 * (gu, gv), s screen pixels per game pixel. shade(x, y) → multiplier (glass falloff) or null; inside(x, y) → bool or null.
 */
export function drawPicture(c, img, o) {
  const W = c.w, H = c.h, d = c.d, IW = o.iw ?? GW, IH = o.ih ?? GH;
  const x0 = Math.max(0, Math.floor(o.clip[0])), y0 = Math.max(0, Math.floor(o.clip[1])), x1 = Math.min(W, Math.ceil(o.clip[2])), y1 = Math.min(H, Math.ceil(o.clip[3]));
  if (x1 <= x0 || y1 <= y0) return;
  const { ox, oy, gu, gv, s } = o.map, sig = Math.max(0.06, o.sig ?? 0.65), scan = clamp01(o.scan ?? 1), glow = clamp01(o.glow ?? 1), mask = clamp01(o.mask ?? 0), alpha = o.alpha ?? 1, gain = o.gain ?? 1;
  const nx = x1 - x0;
  // per column: game u, 5 horizontal taps and their weights
  const U = new Float32Array(nx), KB = new Int32Array(nx), WT = new Float32Array(nx * TAPS);
  for (let i = 0; i < nx; i++) {
    const u = (x0 + i + 0.5 - ox) / s + gu, kb = Math.floor(u) - 2; U[i] = u; KB[i] = kb; let sum = 0;
    for (let k = 0; k < TAPS; k++) { const dd = u - (kb + k + 0.5), w = Math.exp(-(dd * dd) / (2 * sig * sig)); WT[i * TAPS + k] = w; sum += w; }
    for (let k = 0; k < TAPS; k++) WT[i * TAPS + k] /= sum;
  }
  // per game row in view: horizontally blurred colour H[r][col] (outside the picture = black)
  const vTop = (y0 + 0.5 - oy) / s + gv, vBot = (y1 - 0.5 - oy) / s + gv, r0 = Math.floor(vTop) - 2, r1 = Math.floor(vBot) + 2, nr = r1 - r0 + 1;
  const HB = new Float32Array(nr * nx * 3), LUM = new Float32Array(nr * nx);
  for (let rr = 0; rr < nr; rr++) { const r = r0 + rr; if (r < 0 || r >= IH) continue;
    for (let i = 0; i < nx; i++) { let R = 0, G = 0, B = 0; const kb = KB[i];
      for (let k = 0; k < TAPS; k++) { const kk = kb + k; if (kk < 0 || kk >= IW) continue; const w = WT[i * TAPS + k], p = (r * IW + kk) * 3; R += img[p] * w; G += img[p + 1] * w; B += img[p + 2] * w; }
      if (o.beam) { const b = o.beam(r, U[i]); R *= b; G *= b; B *= b; }
      const q = (rr * nx + i) * 3; HB[q] = R; HB[q + 1] = G; HB[q + 2] = B; LUM[rr * nx + i] = 0.3 * R + 0.59 * G + 0.11 * B; } }
  const gw = new Float32Array(5);
  for (let y = y0; y < y1; y++) {
    const v = (y + 0.5 - oy) / s + gv, rn = Math.floor(v), rc = rn - r0;
    // fixed-width glow weights for rows rn-2..rn+2
    let gs = 0; for (let k = 0; k < 5; k++) { const dd = v - (rn - 2 + k + 0.5); gw[k] = Math.exp(-(dd * dd) / (2 * 0.9 * 0.9)); gs += gw[k]; }
    for (let k = 0; k < 5; k++) gw[k] /= gs;
    for (let i = 0; i < nx; i++) {
      const x = x0 + i;
      if (o.inside && !o.inside(x, y)) continue;
      if (alpha < 1 && alpha <= bayer(x, y)) continue;
      let R = 0, G = 0, B = 0;
      // nearest row (flat) + scanned beam profile + glow
      const qn = (rc * nx + i) * 3, fR = HB[qn], fG = HB[qn + 1], fB = HB[qn + 2];
      if (scan > 0 || glow > 0) {
        let sR = 0, sG = 0, sB = 0, wR = 0, wG = 0, wB = 0;
        for (let k = 0; k < 5; k++) { const rr = rc - 2 + k; if (rr < 0 || rr >= nr) continue; const q = (rr * nx + i) * 3, dd = v - (r0 + rr + 0.5);
          const sv = (0.3 + 0.16 * LUM[rr * nx + i]) * (1 - 0.4 * mask), w = Math.exp(-(dd * dd) / (2 * sv * sv)) * 1.22;
          sR += HB[q] * w; sG += HB[q + 1] * w; sB += HB[q + 2] * w; const g = gw[k]; wR += HB[q] * g; wG += HB[q + 1] * g; wB += HB[q + 2] * g; }
        R = fR + (sR - fR) * scan + wR * 0.16 * glow * scan; G = fG + (sG - fG) * scan + wG * 0.16 * glow * scan; B = fB + (sB - fB) * scan + wB * 0.16 * glow * scan;
      } else { R = fR; G = fG; B = fB; }
      if (mask > 0) {
        // shadow mask: 1.5 triads per game pixel, 3 rows of round phosphor dots per game row, every other triad offset half a dot
        const u = U[i], tri = u * 1.5, ti = Math.floor(tri), sub = (tri - ti) * 3, ch = Math.min(2, Math.floor(sub)), fx = sub - ch;
        const sv = v * 3 + (ti & 1) * 0.5, fy = sv - Math.floor(sv), ex = (fx - 0.5) / 0.4, ey = (fy - 0.5) / 0.4, dot = ex * ex + ey * ey < 1 ? 1 : 0;
        const on = dot ? 2.1 : 0.04, off = 0.04;
        R = R * (1 - mask + mask * (ch === 0 ? on : off)); G = G * (1 - mask + mask * (ch === 1 ? on : off)); B = B * (1 - mask + mask * (ch === 2 ? on : off));
      }
      let m = gain; if (o.shade) m *= o.shade(x, y);
      const p = (y * W + x) * 3;
      d[p] = clamp01(R * m) * 255; d[p + 1] = clamp01(G * m) * 255; d[p + 2] = clamp01(B * m) * 255;
    }
  }
}
/** Look parameters: k = 0 flat panel (hard squares) … 1 CRT; mask by on-screen size of a game pixel (close-ups only). */
export const look = (k, s = 3) => ({ sig: 0.06 + (0.65 - 0.06) * k, scan: k, glow: k, mask: k * Math.max(0, Math.min(1, (s - 15) / 7)) });
