// catalog-v1 item «animal-eye»: one big cat eye in close-up, ported from work/pixel-lab/cat-eyes/film/cat.mjs#catEye
// (copy in lib/cateyes-eye.mjs): amber iris, a pupil that goes continuously from a thin slit to a full circle, the
// green eyeshine glow with its bloom, a fur lid that blinks. Kept as the film draws it; the only addition is a patch of
// the film cat's black fur around the eye (lib/cute.mjs blob, the cat's own ramp) so the eye does not float.
import { catEye, bloom } from "./lib/cateyes-eye.mjs";
import { blob, ell, RAMP } from "./lib/cute.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export default {
  kind: "animal-eye",
  covers: ["animal-eye"],
  source: "cat-eyes/film/cat.mjs#catEye",
  desc: "close-up cat eye in black fur: amber iris, slit-to-round pupil, green eyeshine in the dark, blinks, looks",
  hw: 78, hh: 76, start: "calm amber eye, the pupil drifts a little",
  states: {
    open: [0.5, "calm amber eye in daylight, medium pupil"],
    slit: [0.6, "bright light: the pupil narrows to a thin slit"],
    wide: [0.7, "darkness: the eye dims, the pupil opens to a big black circle", "dim"],
    shine: [0.7, "eyeshine: in the dark the round pupil glows green", "glow"],
    blink: [0.45, "one slow blink of the fur lid", "wink"],
    look: [0.5, "the pupil turns to look at the target prop", "blip"],
  },
  base: { open: 0.45, dark: 0, shine: 0, look: 0 },
  st: {
    open: { open: 0.45, dark: 0, shine: 0, look: 0 },
    slit: { open: 0, dark: 0, shine: 0 },
    wide: { open: 1, dark: 0.6, shine: 0 },
    shine: { open: 1, dark: 0.7, shine: 1 },
    blink: {},
    look: { look: 1 },
  },
  demo: { target: true },
  notes: "Prop. blink is a one-off accent (s.acc), the other states are held looks. dark only dims the eye and its fur (the item cannot darken the backdrop); shine glows best after wide or in a night backdrop. look keeps its value through slit/wide/shine; open resets it. The eye is the film's ellipse, not an almond.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, a = s.a ?? 1, rx = 50 * z, ry = 55 * z, frx = rx * 1.5, fry = ry * 1.32;
    // fur patch around the eye, dimmed by the dark
    blob(c, [ell(cx, cy, frx, fry)], { ramp: RAMP.black, thick: 20 * z, base: 2.8 });
    if (v.dark > 0.01) c.tint(Math.floor(cx - frx - 2), Math.floor(cy - fry - 2), Math.ceil(frx * 2 + 5), Math.ceil(fry * 2 + 5), (X, Y) => (((X + 0.5 - cx) / frx) ** 2 + ((Y + 0.5 - cy) / fry) ** 2 <= 1 ? v.dark * 0.6 * a : 0), "#05040C", 6);
    // the look: toward the target, blended by its presence, plus a slow idle drift
    let lx = 0.16 * Math.sin(t * 0.7) + 0.08 * Math.sin(t * 1.9 + 1), ly = 0.12 * Math.sin(t * 0.53 + 2);
    if (s.look && s.lookK > 0) { const dx = s.look[0] - cx, dy = s.look[1] - cy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; lx = lx * (1 - k) + (dx / d) * k; ly = ly * (1 - k) + (dy / d) * k; }
    const blink = Math.sin(Math.PI * clamp01(s.acc("blink")));
    bloom(c, cx, cy, rx * 1.7, v.shine * Math.max(0.35, v.dark) * a);
    catEye(c, cx, cy, rx, ry, { open: v.open, shine: v.shine, dark: v.dark, blink, look: [lx, ly] });
    const px = cx + lx * rx * 0.18, py = cy + ly * ry * 0.12;
    return { box: { x0: cx - frx, y0: cy - fry, x1: cx + frx, y1: cy + fry }, pt: [px, py] };
  },
};
