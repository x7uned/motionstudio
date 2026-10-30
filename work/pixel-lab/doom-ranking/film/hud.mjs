// The TIME PER FRAME scale: a fixed museum display at the top of the frame (y 150–242, inside the main zone), log axis
// from 1/35 s to 12 days, a slider knob that moves only on measured values, and a coloured dot left for every ranked
// device (the mower has no measured number, the pregnancy test is not ranked). At the end the knob trembles at 12 DAYS
// and a small «?» glows past the end of the track.
import { MAIN, TINY, bayer } from "../../../../renderer/pixel/raster.mjs";
import { fade, mix, sm, ease, panel, C } from "./cute.mjs";
import { EV, SCALE, SLIDER, DOTS, uOf, track } from "./timeline.mjs";

const R = Math.round, O = "#0B0812";
const STOPS = [[0, "#7FE3F0"], [0.2, "#65DA41"], [0.42, "#F4CA50"], [0.68, "#F59A3A"], [0.86, "#E0443C"], [1, "#B08AE8"]];
const grad = (u) => { for (let i = 1; i < STOPS.length; i++) if (u <= STOPS[i][0]) return [STOPS[i - 1], STOPS[i]]; return [STOPS[STOPS.length - 2], STOPS[STOPS.length - 1]]; };
const TICKS = [[1, "1 S"], [60, "1 MIN"], [3600, "1 H"], [86400, "1 DAY"]];
export const ux = (u) => SCALE.tx0 + u * (SCALE.tx1 - SCALE.tx0);

export function hud(c, t) {
  const a = sm(t, SCALE.in, SCALE.in + 0.5); if (a <= 0) return;
  const dy = R((1 - ease(Math.min(1, (t - SCALE.in) / 0.5))) * -10), g = fade(c, a), y0 = SCALE.y0 + dy, ty = SCALE.ty + dy;
  panel(c, SCALE.x0, y0, SCALE.x1 - SCALE.x0, SCALE.y1 - SCALE.y0 + 4, a, C.p7);
  g.text(MAIN, "TIME PER FRAME", SCALE.x0 + 14, y0 + 10, C.Y, { scale: 2, shadow: O, shadowOffset: 1 });
  // the track: a dithered gradient fast (cyan) → slow (purple)
  g.rect(SCALE.tx0 - 2, ty - 2, SCALE.tx1 - SCALE.tx0 + 4, 10, O);
  for (let x = SCALE.tx0; x <= SCALE.tx1; x++) { const u = (x - SCALE.tx0) / (SCALE.tx1 - SCALE.tx0), [[u0, c0], [u1, c1]] = grad(u), k = (u - u0) / (u1 - u0);
    for (let y = ty; y < ty + 6; y++) g.px(x, y, k > bayer(x, y) ? c1 : c0); g.px(x, ty, mix(k > 0.5 ? c1 : c0, "#FFFFFF", 0.4)); }
  for (const [s, lab] of TICKS) { const x = R(ux(uOf(s))); g.rect(x, ty - 4, 2, 15, O); g.rect(x, ty - 3, 1, 13, C.L); const w = c.measure(TINY, lab, { scale: 2 }); g.text(TINY, lab, R(x - w / 2 + 1), ty - 23, C.L, { scale: 2 }); }
  // end labels; «1/35 S» glows on "blink", «12 DAYS» blinks on "twelve days"
  const gl = Math.min(sm(t, EV.blink - 0.1, EV.blink + 0.15), 1 - sm(t, EV.blink + 0.6, EV.blink + 1.0));
  g.text(TINY, "1/35 S", SCALE.tx0, ty + 22, gl > 0 ? mix(C.IV, C.CY, gl) : C.IV, { scale: 2 });
  const bl = t > EV.twelve1 - 0.1 && t < EV.days1End + 0.6 ? 0.5 + 0.5 * Math.cos((t - EV.twelve1 + 0.1) * 9) : 1, dw = c.measure(TINY, "12 DAYS", { scale: 2 });
  fade(c, a * (0.35 + 0.65 * bl)).text(TINY, "12 DAYS", SCALE.tx1 - dw + 1, ty + 22, bl < 1 ? C.Y : C.IV, { scale: 2 });
  // ranked dots (stacked when they land on top of each other)
  const placed = [];
  for (const [t0, u, col] of DOTS) { if (t < t0 - 0.05) continue; const k = Math.min(1, (t - t0 + 0.05) / 0.35), x = R(ux(u)); let row = 0; while (placed.some(([px, pr]) => pr === row && Math.abs(px - x) < 6)) row++; placed.push([x, row]);
    const da = sm(k, 0, 0.6) * a, gd = fade(c, da), yy = ty + 10 + row * 5; gd.rect(x - 2, yy, 5, 4, O); gd.rect(x - 1, yy + 1, 3, 2, col);
    if (k < 1) { const r = R(3 + 8 * ease(k)); fade(c, da * (1 - k)).ering(x, ty + 3, r, r, "#FFFFFF"); } }
  // the knob
  const tr = sm(t, EV.someone - 0.2, EV.someone + 0.3), u = track(SLIDER, t) , kx = R(ux(u) + tr * Math.sin(t * 38) * 1.6);
  g.poly([[kx - 6, ty - 11], [kx + 6, ty - 11], [kx, ty - 2]], O); g.poly([[kx - 4, ty - 10], [kx + 4, ty - 10], [kx, ty - 4]], "#FFFFFF"); g.rect(kx - 1, ty - 3, 3, 10, O); g.rect(kx, ty - 3, 1, 10, "#FFFFFF");
  const qa = sm(t, EV.stranger - 0.2, EV.stranger + 0.3); if (qa > 0) { const p = 0.6 + 0.4 * Math.sin((t - EV.stranger) * 4.2); fade(c, a * qa).text(TINY, "?", SCALE.tx1 + 12, ty - 1, mix(C.Y, "#FFFFFF", p * 0.5), { scale: 2 }); }
}
