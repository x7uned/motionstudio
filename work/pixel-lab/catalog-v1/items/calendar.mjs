// catalog-v1 item «calendar»: the tear-off year calendar of «Why your cat sleeps» (animals/film/levels/bay.mjs#calendar)
// as a prop: its red binder and page, digits only from the spoken number s.value (valueOptional: without a number the
// pages are blank), words only from s.label above it. Pages turn over one by one; a red ring can circle the number.
import { drawCalendar } from "./lib/bay-calendar.mjs";
import { MAIN } from "../../../../renderer/pixel/raster.mjs";

const IV = "#FDFEED", O = "#0B0812";
export default {
  kind: "calendar",
  covers: ["calendar"],
  source: "animals/film/levels/bay.mjs#calendar (CAL timing; lib/bay-calendar.mjs)",
  desc: "red tear-off wall calendar; pages turn over; the spoken number on the page, optionally circled",
  hw: 96, hh: 90, start: "shows its page, still",
  text: true, valueOptional: true,
  states: {
    show: [0.5, "a calendar page with the spoken number, still"],
    flip: [0.9, "pages turn over one after another", "swish"],
    mark: [0.5, "a red ring circles the spoken number", "tick"],
    fast: [0.7, "many pages flip fast", "flutter"],
  },
  base: { flip: 0, frate: 0, mk: 0 },
  st: {
    show: { flip: 0, frate: 0 },
    flip: { flip: 1, frate: 2 },
    mark: { mk: 1, flip: 0, frate: 0 },
    fast: { flip: 1, frate: 5 },
  },
  linear: [],
  demo: { label: "YEAR", value: 20 },
  notes: "Film calendar at 2x scale: 96x100 px at size m. The film's year list (1…20) and its «YEAR» header word are removed: digits are s.value only, so without a number the pages are blank ruled sheets. Flights are phase-integrated (one flight per flip, lasting 1/rate s: 0.5 s at flip, 0.2 s at fast), so a rate change is smooth and a flight frozen by stop dissolves in place. A flight of 0.075 s was tried first and flagged as a jump at 30 fps. Label sits above the calendar, outlined in dark, like the film's word tags. Footprint 96×90 covers the body (96×100 at size m) and the flying page to the right.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = 2 * z, W = 48 * k, H = 50 * k;
    const x0 = Math.round(cx - W / 2), y0 = Math.round(cy - H / 2);
    const fl = s.integ((q) => q.frate);
    const box = drawCalendar(c, x0, y0, k, { digits: s.value != null ? String(s.value) : null, fl, flip: v.flip, mk: v.mk });
    let textBox;
    if (s.label) {
      const sc = 2, tw = c.measure(MAIN, s.label, { scale: sc }), lx = Math.round(cx - tw / 2), ly = Math.round(y0 - 6 - 7 * sc);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.text(MAIN, s.label, lx + dx, ly + dy, O, { scale: sc });
      c.text(MAIN, s.label, lx, ly, IV, { scale: sc });
      textBox = { x0: lx - 2, y0: ly - 2, x1: lx + tw + 2, y1: ly + 7 * sc + 2 };
    }
    return { box: { x0: Math.min(box.x0, textBox ? textBox.x0 : box.x0), y0: box.y0, x1: box.x1, y1: box.y1 }, pt: [cx, cy], textBox };
  },
};
