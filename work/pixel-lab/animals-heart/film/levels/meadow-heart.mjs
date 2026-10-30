// Pixel heart icon for my levels of the heart film (meadow / gorge): a glossy red heart with a dark outline that swells
// with the animal's pulse p (0..1, from timeline.mjs pulse(who, t) — never its own timing) and sends out a soft ring.
import { fade, mix, bayer } from "../cute.mjs";

const R = Math.round;
const RED = ["#4A0A18", "#7A1028", "#B01E36", "#E0304A", "#F45A6A", "#FF8A94", "#FFC0C6", "#FFFFFF"];
const inHeart = (u, v) => { const x = u * 1.12, y = -v * 1.12 + 0.18; return (x * x + y * y - 1) ** 3 - x * x * y * y * y <= 0; };

/** Heart centred at (x, y), half-width r (px) at rest; p = pulse 0..1 swells it by up to `swell`; a dissolves. */
export function heartIcon(c, x, y, r, p = 0, { a = 1, swell = 0.32, ring = true, glow = 0 } = {}) {
  if (a <= 0) return; const g = fade(c, a), k = r * (1 + swell * p);
  // ring sent out on each beat (expanding as the pulse decays)
  if (ring && p > 0.04) { const rr = k * (1.25 + (1 - p) * 0.9), q = fade(c, a * p * 0.9); for (let i = 0; i < 64; i++) { const an = (i / 64) * Math.PI * 2, ux = Math.cos(an), uy = Math.sin(an); q.px(R(x + ux * rr), R(y + uy * rr * 0.92), i % 2 ? "#FF8A94" : "#FFD0D4"); } }
  if (glow > 0) for (let Y = R(y - k * 2); Y <= R(y + k * 2); Y++) for (let X = R(x - k * 2); X <= R(x + k * 2); X++) { const d = Math.hypot(X - x, Y - y) / (k * 2); if (d < 1 && glow * (1 - d) * 0.8 > bayer(X, Y) + 0.15) g.px(X, Y, mix(c.get(X, Y), "#FF5A6A", 0.5)); }
  for (let Y = R(y - k * 1.2); Y <= R(y + k * 1.2); Y++) for (let X = R(x - k * 1.25); X <= R(x + k * 1.25); X++) {
    const u = (X + 0.5 - x) / k, v = (Y + 0.5 - y) / k; if (!inHeart(u, v)) continue;
    const e = !inHeart(u - 1.1 / k, v) || !inHeart(u + 1.1 / k, v) || !inHeart(u, v - 1.1 / k) || !inHeart(u, v + 1.1 / k);
    if (e) { g.px(X, Y, RED[0]); continue; }
    const lit = -u * 0.5 - v * 0.7 + p * 0.35; let s = lit > 0.55 ? 5 : lit > 0.1 ? 4 : lit > -0.4 ? 3 : 2;
    if (s === 4 && (lit - 0.1) / 0.45 > bayer(X, Y) + 0.35) s = 5;
    g.px(X, Y, RED[s]);
  }
  // glossy highlight on the upper-left lobe
  const hx = x - k * 0.48, hy = y - k * 0.42, hr = Math.max(1, k * 0.2);
  for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) if ((X - hx) ** 2 + ((Y - hy) * 1.3) ** 2 <= hr * hr) g.px(X, Y, RED[7]);
}
export { RED };
