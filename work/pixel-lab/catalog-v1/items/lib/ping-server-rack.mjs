// catalog-v1 copy (2026-10-26) of work/pixel-lab/ping/film/world.mjs drawServerHall (one rack of the racks loop); changes: a single
// standalone rack in screen space (scale s), LEDs fade smoothly (no hard on/off threshold), phase/busy/alert/power are parameters,
// short plinth + a bundle of cables to the floor added so the prop stands on its own.
import { mix } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp = (v) => Math.max(0, Math.min(1, v)), ss = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const LED = ["#65DA41", "#5FD3F0", "#F4CA50"], LED_OFF = ["#16301E", "#10283A", "#2E2810"];
/** One 28×120 rack in film units, origin = top-left; (x, y) = screen position of the top-left, s = scale.
 *  p = LED phase, busy 0..1 (more LEDs lit), alert 0..1 (red pulse), power 0..1. Returns the box. */
export function drawRack(c, x, y, s, p) {
  const rect = (x0, y0, x1, y1, col) => { const a = R(x + x0 * s), b = R(y + y0 * s), e = Math.max(a + 1, R(x + x1 * s)), f = Math.max(b + 1, R(y + y1 * s)); for (let j = b; j < f; j++) for (let i = a; i < e; i++) c.px(i, j, col); };
  const { phase = 0, busy = 0, alert = 0, power = 1 } = p;
  const pulse = alert * (0.5 + 0.5 * Math.sin(phase * 0.9 * 1.0 + 1.5));
  // plinth with cable bundle
  rect(-3, 118, 31, 124, "#0A0C16"); rect(-3, 118, 31, 119, "#3C4870"); rect(-3, 122, 31, 124, "#202842");
  rect(2, 114, 26, 118, "#2C243C"); rect(3, 115, 5, 118, mix("#1E4A66", "#5FD3F0", 0.6));
  // cabinet
  rect(0, 0, 28, 120, "#0A0C16"); rect(1, 1, 27, 119, "#161B2E"); rect(0, 0, 28, 1, "#3C4870");
  for (let u = 0; u < 14; u++) {
    const uy = 6 + u * 8;
    if (uy + 6 > 114) break;
    rect(3, uy, 25, uy + 6, u % 3 === 0 ? "#222A44" : "#1C2238"); rect(3, uy, 25, uy + 1, "#2C3656");
    for (let l = 0; l < 3; l++) {
      const id = 31 + u * 7 + l, w = 0.5 + 0.5 * Math.sin(phase * (0.3 + rnd(id) * 0.9) + id);
      const k = power * ss(0.45 - 0.35 * busy, 0.75 - 0.35 * busy, w);   // smooth blink; busy lowers the threshold
      let col = mix(LED_OFF[l], LED[l], k);
      if (pulse > 0) col = mix(col, "#E8344E", clamp(pulse * 1.1) * (l === 0 ? 1 : 0.8));
      rect(18 + l * 2, uy + 3, 19 + l * 2, uy + 4, col);
    }
    if (pulse > 0 && u % 2 === 0) rect(4, uy + 2, 4 + 6 * pulse, uy + 3, mix("#222A44", "#E8344E", clamp(pulse)));
  }
  return { x0: x - 3 * s, y0: y, x1: x + 31 * s, y1: y + 124 * s };
}
