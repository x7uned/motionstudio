// catalog-v1 item «brain»: a standalone lilac brain in side view (front to the right): lobes with sulci drawn as iso-lines
// of a smooth field, the Sylvian fissure and the central sulcus, a striped cerebellum and the brain stem — the brain of
// the trial kid's X-ray (work/pixel-lab/trial-10s/props/kid.mjs brainColor / xrayPixel + drawKidOverlays, copy in
// lib/trial-brain.mjs) with a dark outline instead of the glass window. Chosen over animals/film/levels/savanna.mjs
// brainSprite (a pink blob whose 1-px random-walk grooves barely read as a brain). Every pixel is computed per frame in
// brain-local units, so it stays crisp at any zoom.
import { drawBrain } from "./lib/trial-brain.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const S0 = 1, OX = 1, OY = 8;            // local (−1, −8) = the middle of the drawing
export default {
  kind: "brain",
  covers: ["brain"],
  source: "trial-10s/props/kid.mjs#brainColor / xrayPixel (inside drawKid)",
  desc: "lilac brain in side view, front to the right: folds, cerebellum, brain stem; floats gently",
  hw: 82, hh: 76, start: "floats gently",
  states: {
    idle: [0.5, "floats calmly"],
    think: [0.6, "thinking: bright waves roll across the folds", "glow"],
    signal: [1.2, "a signal pulse runs from the front, along the top to the back and round to the lower side", "zap"],
    lit: [0.6, "one area on the lower side is outlined, then lights up warm", "ding"],
    spark: [0.8, "an idea: the whole brain flashes bright, a ring and rays burst out", "sparkle"],
  },
  base: { think: 0, light: 0, mark: 0 },
  st: { idle: { think: 0, light: 0, mark: 0 }, think: { think: 1 }, signal: { think: 0 }, lit: { light: 1, mark: 1, think: 0 }, spark: { think: 0 } },
  demo: {},
  notes: "The trial kid's X-ray brain (lilac) chosen over animals/savanna brainSprite (a pink blob whose grooves barely read). Front to the right. signal starts at the front underside (where the kid's eye was): the route is illustrative, not anatomy; lit lights the lower temporal area (the kid's face area). think (bands of light rolling over the folds) and spark (whole brain lifts a tone, ring + rays) are catalog additions built from the film's own lit/ring code. Real draw 3 ms wide, 15 ms at z 2.4.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = z * S0, bob = 1.6 * Math.sin(t * 1.5) * S;
    // the signal: pulse 0..1 while its key runs, then the route fades (as the kid's)
    let sig = null; for (const k of s.keys) if (k.state === "signal" && t >= k.t) sig = k;
    const pulse = sig ? clamp01((t - sig.t) / sig.D) : -1, trail = sig ? 1 - sm(t, sig.t + sig.D, sig.t + sig.D + 0.7) : 0;
    let lit = null; for (const k of s.keys) if (k.state === "lit" && t >= k.t) lit = k;
    const ring = lit ? clamp01((t - lit.t) / 0.55) : 0, sk = s.acc("spark");
    const st = { think: v.think, light: v.light > 0 ? 0.24 + 0.76 * v.light + 0.25 * Math.sin(Math.PI * clamp01(s.acc("lit") * 1.6)) : 0, mark: v.mark, ring,
      pulse: sig && trail > 0 ? pulse : -1, trail, spark: Math.sin(Math.PI * sk), sparkRing: sk, a: s.a };
    const bx = cx + OX * S, by = cy + OY * S + bob;
    drawBrain(c, bx, by, S, t, st);
    return { box: { x0: bx - 83 * S, y0: by - 83 * S, x1: bx + 81 * S, y1: by + 67 * S }, pt: [bx - 2 * S, by - 22 * S] };
  },
};
