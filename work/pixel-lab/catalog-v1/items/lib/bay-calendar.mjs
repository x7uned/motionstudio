// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/bay.mjs#calendar (L244–266; CAL L183–184 for the
// flip timing). Changes: the film's fixed year list and the header word «YEAR» are gone — digits come only from s.value
// (none = blank ruled pages) and words only from s.label, which the item draws. The film's page flips become an
// integrated flip phase: flight k runs over phase [k, k + 1] (one page per flip, so its duration is 1 / rate seconds), and its
// strength `flip` fades it in place, so a frozen flight dissolves instead of vanishing. A red ring can circle the spoken number (`mk`, sweeps clockwise from the top).
// Flights are shorter than the film's (24 / 16 / 3–7 film units instead of 44 / 30 / 6–14) to keep the footprint compact.
// Scale: k = 2 × the film's unit (the catalog grid is 2× the film grid); page, header and binder proportions are the film's.
import { MAIN, fade } from "../../../../../renderer/pixel/raster.mjs";
import { ease, sm } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const FLIGHT = 1;   // one flight per flip: it lasts exactly the gap between flips (1 / rate s), never two at once
const PAPER = "#FDFEED", LINE = "#D8D4C8", INK = "#2A2440", RED = "#E0505A", RED2 = "#B83A44", O = "#0B0812", SHADOW = "#8A8478";

/** Calendar with its top-left at (x0, y0), scale k. o = { digits (string | null), fl (integrated flip phase), flip, mk }. */
export function drawCalendar(c, x0, y0, k, o) {
  const S = (v) => R(v * k), W = S(48), H = S(50), HDR = S(13), py = y0 + HDR, ph = H - S(17), faceH = ph - S(4);
  const digits = o.digits;
  const fit = (str, room) => { for (const sc of [6, 5, 4, 3, 2]) if (c.measure(MAIN, str, { scale: sc }) <= room) return sc; return 2; };
  // a page with its number (centred), clipped to its own rectangle so a flying page cuts its digits cleanly
  const page = (g, px, pyy, pw, phh) => {
    g.rect(px, pyy, pw, phh, PAPER); g.rect(px, pyy + phh - 1, pw, 1, LINE);
    const clip = [px, pyy, px + pw, pyy + phh];
    if (digits == null) { for (let j = 0; j < 3; j++) g.rect(px + S(7), pyy + S(12 + 10 * j), pw - S(14), 1, LINE); return; }
    const sc = fit(digits, pw - S(12)), tw = c.measure(MAIN, digits, { scale: sc }), tx = R(px + pw / 2 - tw / 2), ty = R(pyy + phh / 2 - (7 * sc) / 2);
    g.text(MAIN, digits, tx, ty, INK, { scale: sc, colorAt: (X, Y) => (X >= clip[0] && X < clip[2] && Y >= clip[1] && Y < clip[3] ? INK : null) });
  };
  c.rrect(x0 - S(1), y0 - S(1), W + S(2), H + S(2), O, 2); c.rect(x0, y0 + H - S(8), W, S(8), LINE);
  page(c, x0, py, W, faceH);
  // the red binder header and its two rings (the film's «YEAR» word is removed)
  c.rrect(x0, y0, W, HDR, RED, 2); c.rect(x0, y0 + S(10), W, S(3), RED2);
  for (const rx of [x0 + S(12), x0 + W - S(14)]) { c.rect(rx, y0 - S(4), S(3), S(8), "#5A5A6A"); c.px(rx + 1, y0 - S(4), "#9A9AAA"); }
  // a red ring circling the spoken number, sweeping in from the top
  if (digits != null && o.mk > 0.003) {
    const sc = fit(digits, W - S(12)), tw = c.measure(MAIN, digits, { scale: sc }), cx = x0 + W / 2, cy = py + faceH / 2;
    const rx = tw / 2 + S(5), ry = 3.5 * sc + S(4), to = -Math.PI / 2 + Math.PI * 2 * clamp01(o.mk);
    c.ering(cx, cy, rx, ry, RED, -Math.PI / 2, to); c.ering(cx, cy, rx - 1, ry - 1, RED, -Math.PI / 2, to);
  }
  // flying pages (in front): flight k starts exactly on the calendar page (u = 0 lies on it), is carried up and right,
  // folds shut and dissolves; its strength o.flip fades it in place when the flips stop
  const kf = Math.floor(o.fl), u = (o.fl - kf) / FLIGHT;
  if (o.flip > 0.003 && u >= 0 && u < 1) {
    const e = ease(u), pa = o.flip * (1 - sm(u, 0.55, 1)), fold = 1 - 0.65 * sm(u, 0.3, 1);
    const px = R(x0 + e * S(24)), pyy = R(py - e * S(16) - Math.sin(Math.PI * u) * S(3 + (kf % 3) * 2)), phh = Math.max(2, R(faceH * fold));
    fade(c, pa * sm(u, 0, 0.2)).rect(px - 1, pyy - 1, W + 2, phh + 2, SHADOW);
    page(fade(c, pa), px, pyy, W, phh);
  }
  return { x0: x0 - 2, y0: y0 - 2, x1: x0 + W + 2, y1: y0 + H + 2 };
}
