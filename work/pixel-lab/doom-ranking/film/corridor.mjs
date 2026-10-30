// The one picture every device shows: OUR OWN drawing of a first-person corridor — dark brick walls, tiled floor,
// ceiling light panels, a metal door at the end and a hand holding a plain pistol (no Doom graphics, monsters, face,
// logo or textures). A tiny ray-cast box: pure function of (u, v, phase); "running" = the bricks scroll toward the
// viewer and the hand bobs. Devices sample it at their own resolution / style (colour, mono LCD, ASCII, lamps, dots).
import { hex, bayer } from "../../../../renderer/pixel/raster.mjs";

const P = (list) => list.map((h) => { const [r, g, b] = hex(h); return [r, g, b, (0.3 * r + 0.59 * g + 0.11 * b) / 255]; });
const BRICK = P(["#140806", "#2A120C", "#421C12", "#5C2818", "#76361E", "#904628", "#A85A34", "#C07446"]);
const MORT = P(["#0C0606", "#1A1210", "#2A201C", "#3A2E28", "#4A3C34", "#5A4A40"]);
const FLO = P(["#09090D", "#121218", "#1C1C24", "#272730", "#33333E", "#42424E", "#54545F"]);
const CEIL = P(["#07070A", "#0E0E14", "#17171E", "#202029", "#2A2A34"]);
const LAMP = P(["#5A5640", "#9A9468", "#D8D09A", "#FFF6C8"]);
const DOOR = P(["#141C1E", "#223034", "#34464A", "#4A6266", "#648286", "#86A6A8"]);
const GUN = P(["#0E1014", "#1E2228", "#30363E", "#474E58", "#646C76", "#8A929C"]);
const SKIN = P(["#3E1E14", "#6A3622", "#965234", "#B86E4A", "#D48E68", "#EAB08C"]);
const GLOW = P(["#2E8A3A", "#7AF07A"]);
const frac = (x) => x - Math.floor(x);
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (ramp, k, X, Y) => { const s = Math.max(0, Math.min(1, k)) * (ramp.length - 1), lo = Math.floor(s); return ramp[Math.min(ramp.length - 1, s - lo > bayer(X, Y) ? lo + 1 : lo)]; };

/** Colour [r, g, b, lum] of the corridor at (u, v) ∈ [0,1)² for phase ph; (X, Y) = output pixel for the dither. */
export function corridor(u, v, ph, X = 0, Y = 0) {
  // ---- the hand with the pistol (screen space, bottom centre), bobbing with the run
  const bp = ph * Math.PI * 0.9, gu = u - 0.5 - 0.014 * Math.sin(bp), gv = v - 0.035 * Math.abs(Math.sin(bp)) + 0.01;
  if (gv > 0.64) {
    const au = Math.abs(gu);
    if (au < 0.012 && gv < 0.672) return GUN[3];                                     // front sight
    if (au < 0.046 && gv >= 0.672 && gv < 0.75) return gv < 0.684 ? GUN[5] : au > 0.036 ? GUN[1] : GUN[3];   // slide
    if (au < 0.058 && gv >= 0.75 && gv < 0.86) return au > 0.048 || gv > 0.85 ? GUN[0] : gu < -0.02 ? GUN[3] : GUN[2];   // frame
    if (gv >= 0.8) {                                                                  // the gripping fist, then the wrist
      const fist = gv < 0.95, hw = fist ? 0.088 - Math.max(0, 0.82 - gv) * 1.2 : 0.07 + (gv - 0.95) * 0.3;
      if (au < hw) {
        if (au > hw - 0.012 || (fist && gv > 0.938)) return SKIN[0];
        if (fist && gv < 0.84 && gu < -0.012 && gu > -0.07) return gv < 0.81 ? SKIN[5] : SKIN[4];        // thumb over the grip
        if (fist && gv > 0.85 && Math.abs(frac((gu + 0.2) / 0.044) - 0.5) < 0.07) return SKIN[1];          // finger creases
        return pick(SKIN, (fist ? 0.78 : 0.5) - gu * 2.5 - (gv - 0.8) * 0.8, X, Y);
      }
    }
  }
  // ---- the corridor box: |x| ≤ 1, ceiling y = −0.9, floor y = 0.7, end wall at z = 7
  const dx = (u - 0.5) * 2, dy = (v - 0.47) * 1.55;
  const zw = 1 / Math.max(1e-4, Math.abs(dx)), zf = dy > 0 ? 0.7 / dy : 1e9, zc = dy < 0 ? 0.9 / -dy : 1e9, z = Math.min(zw, zf, zc);
  const fog = (k) => Math.max(0, Math.min(1, 1.25 / (0.5 + 0.34 * k)));
  if (z > 7) {
    const ex = dx * 7, ey = dy * 7, ax = Math.abs(ex), f = fog(7);
    if (ey > -0.47 && ey < -0.37 && ax < 0.07) return GLOW[1];                      // the little green light over the door
    if (ax < 0.42 && ey > -0.32) return Math.abs(ey - 0.12) < 0.035 ? DOOR[1] : ax < 0.02 ? DOOR[0] : pick(DOOR, f * (0.95 - ey * 0.25 - (ex > 0 ? 0.12 : 0)), X, Y);
    if (ax < 0.5 && ey > -0.4) return GUN[2];                                        // door frame
    return pick(BRICK, f * 0.55, X, Y);
  }
  const s = z + ph, f = fog(z);
  if (z === zw) {                                                                    // brick walls
    const wy = dy * z + 0.9, row = Math.floor(wy / 0.26), fy = frac(wy / 0.26), col = Math.floor((s + (row & 1) * 0.3) / 0.6), fx = frac((s + (row & 1) * 0.3) / 0.6);
    if (fy < 0.13 || fx < 0.07) return pick(MORT, f * 0.85, X, Y);
    return pick(BRICK, f * (dx > 0 ? 0.95 : 0.78) + (hash(row, col) - 0.5) * 0.22 - fy * 0.08, X, Y);
  }
  if (z === zf) { const fx = dx * z, chk = (Math.floor(s / 0.55) + Math.floor((fx + 4) / 0.55)) & 1; return pick(FLO, f * (0.8 + chk * 0.16) - (frac(s / 0.55) < 0.07 ? 0.15 : 0), X, Y); }
  { const fx = dx * z; if (frac(s / 2.2) < 0.24 && Math.abs(fx) < 0.36) return pick(LAMP, f * 1.05, X, Y); return pick(CEIL, f * 0.8, X, Y); }
}

/** Draw the corridor into canvas c at (x0, y0), w×h output pixels. o.a = dissolve alpha, o.scan = CRT scanlines,
 *  o.mono = [offHex, onHex] two-tone LCD, o.dim = brightness multiplier. Writes c.d directly (fast). */
export function drawCorridor(c, x0, y0, w, h, ph, o = {}) {
  const a = o.a ?? 1, d = c.d, mono = o.mono ? o.mono.map(hex) : null, dim = o.dim ?? 1;
  for (let j = 0; j < h; j++) { const Y = y0 + j; if (Y < 0 || Y >= c.h) continue;
    for (let i = 0; i < w; i++) { const X = x0 + i; if (X < 0 || X >= c.w) continue; if (a < 1 && a <= bayer(X, Y)) continue;
      const col = corridor((i + 0.5) / w, (j + 0.5) / h, ph, X, Y), k = (Y * c.w + X) * 3;
      if (mono) { const on = col[3] > 0.2 + 0.16 * bayer(X, Y), m = on ? mono[1] : mono[0]; d[k] = m[0]; d[k + 1] = m[1]; d[k + 2] = m[2]; continue; }
      const sc = (o.scan && (j & 1) ? 0.78 : 1) * dim; d[k] = col[0] * sc; d[k + 1] = col[1] * sc; d[k + 2] = col[2] * sc; } }
}
/** Luminance 0..1 of the picture averaged over a cell (for ASCII, lamps, dots). */
export function cellLum(u0, v0, du, dv, ph) {
  let s = 0; for (let b = 0; b < 2; b++) for (let a = 0; a < 2; a++) s += corridor(u0 + du * (0.25 + 0.5 * a), v0 + dv * (0.25 + 0.5 * b), ph, a, b)[3]; return s / 4;
}
/** Phase of the running picture: continuous (35/30 fps look the same at 30 fps) or stepped at a device's frame rate. */
export const phase = (t, fps = 0) => 1.15 * (fps ? Math.floor(t * fps) / fps : t);
