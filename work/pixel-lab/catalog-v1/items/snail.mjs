// catalog-v1 item «snail»: the garden snail of the animals-speed series, a caramel spiral shell on a wet foot, two eye stalks
// with glossy eyes, a race-sticker bib. Ported from work/pixel-lab/animals-speed/film/levels/garden-snail.mjs#drawSnail (copy in
// lib/animals-speed-garden-snail.mjs; the bib number is drawn only from s.value, the film drew a fixed "1"). States: it creeps,
// turns its stalks to the target, strains (eyes squeeze, sweat), or stops with its eyes drooping. The crawl phase is integrated,
// so a change of speed never jumps the surge.
import { drawSnail } from "./lib/animals-speed-garden-snail.mjs";
import { blinkAt } from "./lib/cute.mjs";

const S0 = 1.0;                                    // scale at size m, camera z 1
const OX = 25, OY = 63;                            // snail origin (the foot's ground point) relative to the footprint centre
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;

export default {
  kind: "snail",
  covers: ["snail"],
  source: "animals-speed/film/levels/garden-snail.mjs#drawSnail",
  desc: "garden snail with a big caramel spiral shell and two eye stalks: creeps slowly, turns its eyes to its target, strains",
  hw: 76, hh: 72,
  start: "creeps slowly forward, stalks sway, eyes blink",
  states: {
    glide: [0.6, "creeps forward slowly, stalks relaxed"],
    look: [0.5, "stalks turn their eyes to the target", "blip"],
    push: [0.7, "pushes hard: eyes squeeze shut, sweat drop", "creak"],
    stop: [0.9, "stops, eyes droop shut", "dim"],
  },
  base: { crawl: 0.5, look: 0, strain: 0, sweat: 0, shut: 0 },
  st: {
    glide: { crawl: 0.5, look: 0, strain: 0, sweat: 0, shut: 0 },
    look: { crawl: 0.15, look: 1, strain: 0, sweat: 0, shut: 0 },
    push: { crawl: 1.0, look: 0, strain: 1, sweat: 1, shut: 0 },
    stop: { crawl: 0, look: 0, strain: 0, sweat: 0, shut: 0.85 },
  },
  linear: [],
  notes: "the film's race-sticker number is only drawn from s.value (none by default); the film's clip reveal is not used; the eye stalks aim at the target with the head's sway (blended by the target presence)",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100;
    const x = cx + OX * S, y = cy + OY * S;
    const ph = s.integ((q) => q.crawl * 0.3);     // crawl cycles, integrated so speed changes never jump
    const hx = x + 10 * S, hy = y - 44 * S;       // the head (film: P(10, −44))
    const k = v.look * (s.look ? s.lookK : 0);
    let look = [0.15, 0.25], sway = 0;
    if (k > 0) {
      const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1;
      look = [lerp(0.15, dx / d, k), lerp(0.25, dy / d, k)];
      sway = 4 * k * (dx / d);
    }
    const blink = Math.max(v.shut, blinkAt(t, 4.4, 0.9) * (1 - v.shut));
    const H = drawSnail(c, x, y, {
      s: S, a: 1, t, crawl: ph, strain: clamp01(v.strain), sweat: clamp01(v.sweat), sway, look, blink, num: s.value ?? null,
    });
    return {
      box: { x0: x - 96 * S, y0: y - 130 * S, x1: x + 47 * S, y1: y + 4 * S },
      pt: H.head, face: H.head, faceBox: { x0: H.head[0] - 40 * S, y0: H.head[1] - 40 * S, x1: H.head[0] + 40 * S, y1: H.head[1] + 40 * S },
    };
  },
};
