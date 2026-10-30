// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-eyes/film/cat.mjs#catEye + #bloom + SHINE; changes: imports from
// raster.mjs and lib/cute.mjs (RAMP); no one-frame changes: the pupil's eyeshine starts from black through a dithered
// level (was: black → green at shine 0.04), the blink lid line is clipped to the eye and dissolves in with the blink
// (was: a full-width line at blink 0.02), highlights clip under the lid per pixel (were hidden whole), the highlight
// colour dithers with `dark` (was switched at 0.6), dark/glow mixes are dithered levels (no global re-rounding); everything is drawn through the fade view.
// Amber iris, a pupil that goes continuously from a thin slit (open 0) to a full circle (open 1), green eyeshine the
// tapetum sends back (shine), a dark fur lid that closes from the top (blink 0..1).
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { RAMP } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const s01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// ordered-dither quantisation of a mix amount (flat tone levels, so a slow ramp flips pixels instead of re-rounding all)
const dq = (v, n, X, Y) => { const s = clamp01(v) * n, lo = Math.floor(s); return (s - lo > bayer(X, Y) ? lo + 1 : lo) / n; };
export const SHINE = ["#0E3A1C", "#1E7A3A", "#3FD26A", "#9CFF7A", "#EFFFC8"];
export function catEye(c, x, y, rx, ry, o = {}) {
  const open = clamp01(o.open ?? 0.5), shine = clamp01(o.shine ?? 0), dark = clamp01(o.dark ?? 0), blink = clamp01(o.blink ?? 0), look = o.look ?? [0, 0], a = o.a ?? 1, g = fade(c, a);
  const iris = o.iris ?? RAMP.amber, out = "#07060E", lid = o.lid ?? RAMP.black[2];
  const pw = rx * lerp(0.075, 0.84, open), ph = ry * lerp(0.94, 0.86, open), px = x + look[0] * rx * 0.18, py = y + look[1] * ry * 0.12;
  const lidY = y - ry + 2 * ry * blink, ol = Math.max(1.1, rx / 18), lineK = s01(blink / 0.08);
  for (let Y = R(y - ry - 2); Y <= R(y + ry + 2); Y++) for (let X = R(x - rx - 2); X <= R(x + rx + 2); X++) {
    const e = ((X + 0.5 - x) / rx) ** 2 + ((Y + 0.5 - y) / ry) ** 2; if (e > 1.02) continue;
    const edge = e > (1 - ol / Math.min(rx, ry)) ** 2;
    if (Y + 0.5 < lidY) { g.px(X, Y, edge ? out : lid); continue; }
    if (edge) { g.px(X, Y, out); continue; }
    // the lid's lower edge: a dark line that dissolves in over the first part of the blink (clipped to the eye)
    if (Y === R(lidY) && lineK > bayer(X, Y)) { g.px(X, Y, out); continue; }
    const pe = ((X + 0.5 - px) / pw) ** 2 + ((Y + 0.5 - py) / ph) ** 2;
    let col;
    if (pe <= 1) {
      // the pupil: black, or lit from inside by the reflected light (bright core, darker rim); level −1 = black
      const k = shine * (1 - 0.55 * pe), s = k * 5 - 1, lo = Math.floor(s), lv = Math.min(4, s - lo > bayer(X, Y) ? lo + 1 : lo);
      col = lv < 0 ? out : SHINE[lv];
    } else {
      const v = (Y - (y - ry)) / (2 * ry), s = v * (iris.length - 2) + 0.2, lo = Math.floor(s);
      col = iris[Math.max(1, Math.min(iris.length - 1, s - lo > 0.35 + 0.3 * bayer(X, Y) ? lo + 1 : lo))];
      if (v < 0.22) col = iris[1];
      // a thin dark ring around the pupil
      if (pe < 1 + 2.2 / Math.max(3, pw)) col = iris[0];
      if (dark > 0) col = mix(col, "#0A0816", dq(dark * 0.82, 6, X, Y));
      // the glow spills a little onto the iris
      if (shine > 0.3 && pe < 1.6) col = mix(col, SHINE[2], dq((shine - 0.3) * 0.5 * (1.6 - pe), 4, X, Y));
    }
    g.px(X, Y, col);
  }
  // highlights (dimmer in the dark), clipped under the lid per pixel
  const hx = x - rx * 0.38, hy = y - ry * 0.42, hr = Math.max(1.2, rx * 0.26), hk = s01((dark - 0.4) / 0.4), hc = (X, Y) => (hk > bayer(X, Y) ? "#C8D8C0" : "#FFFFFF");
  for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) if (Y + 0.5 >= lidY + 1) for (let X = R(hx - hr); X <= R(hx + hr); X++) if (((X + 0.5 - hx) / hr) ** 2 + ((Y + 0.5 - hy) / (hr * 1.1)) ** 2 <= 1) g.px(X, Y, hc(X, Y));
  const sx = x + rx * 0.36, sy = y + ry * 0.34, sr = Math.max(0.8, rx * 0.08);
  for (let Y = R(sy - sr); Y <= R(sy + sr); Y++) if (Y + 0.5 >= lidY + 1) for (let X = R(sx - sr); X <= R(sx + sr); X++) g.px(X, Y, hc(X, Y));
}
// soft green bloom around a glowing eye (drawn before the eye)
export function bloom(c, x, y, r, k) {
  if (k <= 0.02) return;
  for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) { const d = Math.hypot(X - x, Y - y) / r; if (d >= 1) continue; const q = (1 - d) ** 2 * k * 0.9; if (q > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), SHINE[3], 0.28 + dq(0.3 * q / 0.3, 3, X, Y) * 0.3)); }
}
