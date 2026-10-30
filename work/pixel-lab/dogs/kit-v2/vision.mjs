// «Dog vision» for the dog series: a red–green colour-blindness simulation (deuteranope, Viénot, Brettel & Mollon 1999,
// in linear sRGB) applied to canvas pixels. Dogs have two cone types (≈429 nm and ≈555 nm; Neitz et al. 1989), so this
// is an illustration of dichromatic colour, not an exact picture of what a dog's brain sees.
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const v = i / 255; LIN[i] = v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
const ENC = new Uint8ClampedArray(4097);
for (let i = 0; i <= 4096; i++) { const v = i / 4096; ENC[i] = Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055)); }
const enc = (v) => ENC[Math.max(0, Math.min(4096, Math.round(v * 4096)))];

// RGB → LMS (Viénot 1999), deuteranope projection M' = 0.494207 L + 1.24827 S, LMS → RGB
const A = [[17.8824, 43.5161, 4.11935], [3.45565, 27.1554, 3.86714], [0.0299566, 0.184309, 1.46709]];
const P = [[1, 0, 0], [0.494207, 0, 1.24827], [0, 0, 1]];
const Ai = [[0.0809444479, -0.130504409, 0.116721066], [-0.0102485335, 0.0540193266, -0.113614708], [-0.000365296938, -0.00412161469, 0.693511405]];
const mul = (X, Y) => X.map((r) => Y[0].map((_, j) => r.reduce((s, v, k) => s + v * Y[k][j], 0)));
export const M = mul(Ai, mul(P, A));

/** Dog-vision colour of one sRGB triple (0..255) → [r, g, b]. */
export function dogColor(r, g, b) {
  const R = LIN[r], G = LIN[g], B = LIN[b];
  return [enc(M[0][0] * R + M[0][1] * G + M[0][2] * B), enc(M[1][0] * R + M[1][1] * G + M[1][2] * B), enc(M[2][0] * R + M[2][1] * G + M[2][2] * B)];
}
export const dogHex = (hex) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return "#" + dogColor(r, g, b).map((v) => v.toString(16).padStart(2, "0")).join(""); };

/**
 * Re-colour the canvas in dog vision where `mask(x, y)` returns a level 0..1 (1 = dog vision). The level is applied as
 * an ordered-dither threshold, so a soft-edged mask gives a clean pixel transition, never a one-frame switch.
 * Region [x0, y0, x1, y1) limits the work.
 */
export function dogVision(c, mask, x0 = 0, y0 = 0, x1 = c.w, y1 = c.h) {
  const d = c.d, w = c.w;
  for (let y = Math.max(0, y0); y < Math.min(c.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(w, x1); x++) {
    const k = mask(x, y); if (k <= 0 || (k < 1 && k <= bayer(x, y))) continue;
    const i = (y * w + x) * 3, R = LIN[d[i]], G = LIN[d[i + 1]], B = LIN[d[i + 2]];
    d[i] = enc(M[0][0] * R + M[0][1] * G + M[0][2] * B); d[i + 1] = enc(M[1][0] * R + M[1][1] * G + M[1][2] * B); d[i + 2] = enc(M[2][0] * R + M[2][1] * G + M[2][2] * B);
  }
}

/** Average b×b blocks inside a region (dogs see less detail): the coarse-pixel look of the «DOG» panel. */
export function blocks(c, b, x0, y0, x1, y1) {
  const d = c.d, w = c.w;
  for (let by = y0; by < y1; by += b) for (let bx = x0; bx < x1; bx += b) {
    let r = 0, g = 0, bl = 0, n = 0; const ye = Math.min(y1, by + b), xe = Math.min(x1, bx + b);
    for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 3; r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
    r /= n; g /= n; bl /= n;
    for (let y = by; y < ye; y++) for (let x = bx; x < xe; x++) { const i = (y * w + x) * 3; d[i] = r; d[i + 1] = g; d[i + 2] = bl; }
  }
}
