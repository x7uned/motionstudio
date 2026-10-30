// catalog-v1 item «songbird»: the cute blue bird on a twig of «Cat eyes» (cat-eyes/film/panels.mjs#bird) as a character
// prop: it perches with a slow breath, sings (the beak opens and closes, head bobs), hops along its twig and lands with a
// squash, and turns its eye toward its target (eye aim blended by lookK). Drawn by lib/cat-eyes-bird.mjs.
import { bird } from "./lib/cat-eyes-bird.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export default {
  kind: "songbird",
  covers: ["songbird"],
  source: "cat-eyes/film/panels.mjs#bird (lib/cat-eyes-bird.mjs)",
  desc: "small blue songbird with a yellow beak on a twig; sings, hops, turns its eye to its target",
  hw: 48, hh: 36, start: "sits on its twig and breathes slowly",
  states: {
    perch: [0.5, "sits still on its twig, breathing slowly"],
    sing: [0.6, "opens its beak and sings, head bobbing", "sparkle"],
    hop: [0.5, "hops along the twig and lands with a squash", "tick"],
    look: [0.5, "turns its eye toward the target", "blip"],
  },
  base: { sing: 0, sr: 0, hop: 0, hr: 0, lk: 0 },
  st: {
    perch: { sing: 0, sr: 0, hop: 0, hr: 0, lk: 0 },
    sing: { sing: 1, sr: 1.8, hop: 0, hr: 0 },
    hop: { sing: 0, sr: 0, hop: 1, hr: 1.3 },
    look: { sing: 0, sr: 0, hop: 0, hr: 0, lk: 1 },
  },
  linear: [],
  demo: { target: true },
  notes: "Film bird at 1.6x (body 51 px, twig 96 px at size m), left-facing as in the film. Sing = beak opening (lower mandible drops, the mouth shows) plus a head bob, both integrated from the sing rate so they never jump. Hop = a hop height with the film's landing squash, the bottom stays on the twig. Look = pupil offset toward the target, blended by s.lookK. No fly-off: the film bird has no wings, so flying away would need new parts (not added). The film's blink and tail flick are not drawn.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, sc = 1.6 * z;
    const ph = s.integ((q) => q.sr), hp = s.integ((q) => q.hr);
    const open = v.sing * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph));           // beak opens and closes while singing
    const u = Math.abs(Math.sin(Math.PI * hp)), hopH = 9 * v.hop * u;          // 0 on the twig, 1 at the top of a hop
    const sq = v.hop * (1 - sm01(u / 0.45));                                  // squash near each landing (softer than the ball's: the bird's body is small)
    const sxk = 1 + 0.05 * sq, syk = 1 - 0.06 * sq;
    const bob = 0.4 * Math.sin(t * 1.9) + 0.8 * v.sing * Math.sin(2 * Math.PI * ph);   // breath, plus the sing bob
    const dy = (bob - hopH) * sc + 14 * sc * (1 - syk);                        // the bottom stays on the twig through the squash
    const lk = v.lk * s.lookK, a = s.look ? Math.atan2(s.look[1] - cy, s.look[0] - cx) : 0;
    bird(c, cx, cy, sc, { dy, sx: sxk, sy: syk, open, px: Math.cos(a) * 1.4 * lk, py: Math.sin(a) * 1.4 * lk });
    return { box: { x0: cx - 32 * sc, y0: cy - 30 * sc + dy, x1: cx + 30 * sc, y1: cy + 20 * sc }, pt: [cx - 7 * sc, cy - 4 * sc + dy] };
  },
};
