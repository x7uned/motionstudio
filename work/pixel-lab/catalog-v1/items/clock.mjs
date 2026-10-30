// catalog-v1 item «clock»: the round wooden wall clock of «Why your cat sleeps all day» (cat-zoomies apartment), copy in
// lib/zoomies-clock.mjs. Hands are eased angles: idle creep, «spin» races time forward (rate integrated, so speed-ups
// never jump), «set» swings both hands the short way to a spoken time (s.value, e.g. 7 or 7:30; none = 12:00) and shows
// that number on a small plate, «ring» shakes it like an alarm with dissolving ring arcs. No numerals on the face.
import { drawClockFace, CLOCK_R, CREAM, WOOD } from "./lib/zoomies-clock.mjs";
import { fade, TINY } from "../../../../renderer/pixel/raster.mjs";

const R = Math.round, K = 60 / CLOCK_R, TAU = Math.PI * 2;
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
function parseTime(v) {
  const m = v == null ? null : String(v).match(/(\d+)(?:[:.](\d+))?/); if (!m) return null;
  const h = +m[1], mi = +(m[2] || 0); return h > 24 || mi >= 60 ? null : (h % 12) + mi / 60;
}
export default {
  kind: "clock",
  covers: ["clock"],
  source: "cat-zoomies/film/apartment-props.mjs#drawClockFace",
  desc: "round wooden wall clock, cream face with tick marks, two dark hands; hands can race or be set",
  hw: 62, hh: 62, start: "hangs still, the minute hand creeps",
  states: {
    tick: [0.5, "shows ten past ten, the minute hand creeps slowly", "tick"],
    spin: [0.6, "hands race round: time flies", "whirr"],
    set: [0.8, "hands swing to the spoken time (or twelve), the time shows on a plate", "tick"],
    ring: [0.4, "shakes like a ringing alarm, ring arcs at the sides", "zap"],
  },
  base: { spin: 0, set: 0, ring: 0 },
  st: { tick: { spin: 0, set: 0, ring: 0 }, spin: { spin: 1, set: 0, ring: 0 }, set: { set: 1, spin: 0, ring: 0 }, ring: { ring: 1, spin: 0 } },
  valueOptional: true,
  demo: { value: "7:30" },
  notes: "film numerals 12/3/6/9 dropped (no digits except s.value); value = a spoken time (7, 7:30, 19); the plate dissolves in with set; ring arcs and shake are new small accents (alarm bells not in the film); leaving set swings the hands back to the frozen free time",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, Z = K * z, r = CLOCK_R * Z;
    // free time: ten past ten + creep (0.6 min/s) + spin (0.9 h/s); frozen while set
    const H = 10 + 10 / 60 + s.integ((q) => (0.01 + 0.9 * q.spin) * (1 - q.set));
    const T = parseTime(s.value) ?? 0;
    const ha = lerpAng((H / 12) * TAU, (T / 12) * TAU, v.set), ma = lerpAng((H % 1) * TAU, (T % 1) * TAU, v.set);
    const shake = R(v.ring * 2 * Math.sin(t * TAU * 9)) , X = R(cx) + shake, Y = R(cy);
    drawClockFace(c, X, Y, Z, ha, ma);
    // ring arcs: two dissolving arcs left and right of the top
    if (v.ring > 0.01) {
      const g = fade(c, v.ring * (0.55 + 0.45 * Math.sin(t * TAU * 4.5)));
      for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) { const rr = r + (5 + i * 6) * z, a0 = -Math.PI / 2 + sd * 0.75; for (let a = -0.35; a <= 0.35; a += 0.6 / rr) g.px(R(X + Math.cos(a0 + a) * rr), R(Y + Math.sin(a0 + a) * rr), i ? "#FFE38E" : "#FDFEED"); }
    }
    // spoken time plate under the clock, dissolving in with set
    if (s.value != null && v.set > 0.01) {
      const str = String(s.value).toUpperCase(), sc = Math.max(1, R(1.5 * z)), w = c.measure ? c.measure(TINY, str, { scale: sc }) : str.length * 4 * sc;
      const g = fade(c, Math.min(1, v.set * 1.25)), px = R(X - w / 2 - 4 * sc), py = R(Y + r + 6 * z);
      g.rect(px, py, R(w + 8 * sc), 9 * sc, WOOD[1]); g.rect(px + 1, py + 1, R(w + 8 * sc) - 2, 9 * sc - 2, WOOD[3]);
      g.text(TINY, str, px + 4 * sc, py + 2 * sc, CREAM[6], { scale: sc });
    }
    return { box: { x0: X - r, y0: Y - r, x1: X + r + 1.5 * Z, y1: Y + r + 2.5 * Z }, pt: [X, Y] };
  },
};
