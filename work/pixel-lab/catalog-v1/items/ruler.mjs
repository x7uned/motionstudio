// catalog-v1 item «ruler»: the measuring tag of «You're not ugly» (not-ugly/film/levels/room-props.mjs#dimLine + #pill):
// a dotted dimension line with end ticks and a yellow value pill over it. Copy in lib/notugly-ruler.mjs. Changes: the
// line is in screen px at size m (HALF px each side of the spot), the far end draws out with grow, and in the measure
// state it reaches for the target (s.look) blended by its presence (s.lookK). The pill shows s.value + s.unit when a
// number is spoken, else s.label; no other text. Nothing is drawn in one frame: ticks travel with the line.
import { dimLine, pill } from "./lib/notugly-ruler.mjs";

const HALF = 54;     // half the ruler's length at z 1 (screen px)
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default {
  kind: "ruler",
  covers: ["ruler"],
  source: "not-ugly/film/levels/room-props.mjs#dimLine,pill",
  desc: "measuring ruler: dashed dimension line with end ticks and a value pill; its far end reaches to the target",
  hw: 60, hh: 18,
  start: "a start tick and the label pill, the line not drawn yet",
  hud: false, text: true, value: true, valueOptional: true,
  states: {
    start: [0.4, "a start tick and the label pill, nothing measured yet"],
    grow: [0.9, "draws out from its start tick to full length", "swish"],
    measure: [1.0, "its far end reaches for the target and reads the gap", "scan"],
    done: [0.7, "settles back to its own length", "ding"],
  },
  base: { grow: 0, meas: 0 },
  st: {
    start: { grow: 0, meas: 0 },
    grow: { grow: 1, meas: 0 },
    measure: { grow: 1, meas: 1 },
    done: { grow: 1, meas: 0 },
  },
  linear: ["grow"],
  demo: { target: true, value: "12", unit: "KM" },
  notes: "Film dimLine and pill kept (dashed INK-shadowed line, tick at each end, yellow pill). Film popping fixed in the copy: both end ticks travel with the drawn line. The pill is drawn only when a value or a label is spoken; an unlabelled ruler is dropped by the plan (value flag). Footprint OFF in the sheet is the measure state, not the rest pose: the far end reaches the demo target about 185 px away, by design; at rest the footprint is 60×18 (the declared values). Jumps 0, pops 0, pure true.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, hl = HALF * z;
    const ly = cy + 12.5 * z;   // the body (pill above the line) is centred on cy
    const p = [cx - hl, ly], q0 = [cx + hl, ly];
    const k = s.look ? clamp01(v.meas) * clamp01(s.lookK ?? 0) : 0;
    const q = k > 0 ? [q0[0] + (s.look[0] - q0[0]) * k, q0[1] + (s.look[1] - q0[1]) * k] : q0;
    dimLine(c, p, q, 1, v.grow);
    const ex = p[0] + (q[0] - p[0]) * clamp01(v.grow), ey = p[1] + (q[1] - p[1]) * clamp01(v.grow);
    const mx = (p[0] + ex) / 2, my = (p[1] + ey) / 2;
    const text = s.value != null ? `${s.value}${s.unit ? " " + s.unit : ""}` : (s.label || null);
    let box = { x0: Math.min(p[0], ex) - 4, y0: my - 30 * z, x1: Math.max(p[0], ex) + 4, y1: my + 5 * z };
    if (text) { const pl = pill(c, text, mx, Math.round(my - 8 * z - 22), 1, "#F4CA50", 2); if (pl) box = { x0: Math.min(box.x0, pl.x), y0: pl.y, x1: Math.max(box.x1, pl.x + pl.w), y1: box.y1 }; }
    return { box, pt: [mx, my] };
  },
};
