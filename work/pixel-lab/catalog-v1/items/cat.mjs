// catalog-v1 item «cat»: the series' black cat sitting front-on (user's reference look), ported from
// work/pixel-lab/animals-heart/film/levels/cat-art.mjs drawCat (copy in lib/black-cat.mjs). The film keyed its face
// options by its own timeline; here every option is a state parameter eased by the engine, so nothing switches in one
// frame (puffed fur dissolves over the smooth fur, the «w» mouth crossfades into the open mouth).
import { drawCat, CAT_HEAD_Y } from "./lib/black-cat.mjs";
import { blinkAt, shadow } from "./lib/cute.mjs";

// The drawing spans x −140…+101, y −321…+10 around the ground point between the front paws at scale 1.
const S0 = 0.56, MID = 156;                 // scale at size m, camera z 1; ground = centre + MID·S
export default {
  kind: "cat",
  covers: ["cat"],
  source: "animals-heart/film/levels/cat-art.mjs#drawCat",
  desc: "black cat sitting front-on: big amber eyes, pink nose, curled tail; breathes, blinks, twitches its ears",
  hw: 72, hh: 92, start: "sits, breathes, tail sways",
  states: {
    sit: [0.5, "sits calmly"],
    look: [0.45, "looks at its target prop", "blip"],
    wide: [0.4, "eyes wide, mouth a little open: surprised", "rise"],
    meow: [0.45, "opens its mouth: meows", "blip"],
    puff: [0.55, "fur stands up, ears back, worried brows: scared", "swell"],
    sleepy: [0.8, "eyes close, head sinks: dozes off", "dim"],
  },
  base: { look: 0, wide: 0, open: 0, puff: 0, worry: 0, shut: 0, squash: 0, ears: 0 },
  st: {
    sit: { look: 0, wide: 0, open: 0, puff: 0, worry: 0, shut: 0, squash: 0, ears: 0 },
    look: { look: 1, shut: 0, squash: 0 },
    wide: { wide: 1, open: 0.45, shut: 0, squash: 0 },
    meow: { open: 1, shut: 0, squash: 0 },
    puff: { puff: 1, worry: 1, ears: 1, wide: 0.6, shut: 0, squash: 0 },
    sleepy: { shut: 1, squash: 0.3, look: 0, wide: 0, open: 0, puff: 0, worry: 0, ears: 0 },
  },
  demo: { target: true },
  notes: "sleepy = lids closed (lighter lid discs + lash line), not a curved ^ eye; mid-air pose of the film not ported",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100;        // sprite parts are cached per scale: 1 % steps
    const gx = cx, gy = cy + MID * S;
    let look = [0, 0];
    if (s.look && v.look > 0) { const hx = cx, hy = gy - CAT_HEAD_Y * S, dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1; const k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; }
    const blink = Math.max(v.shut, blinkAt(t, 3.9, 0.7) * (1 - v.shut));
    shadow(c, gx, gy + 2 * S, 110 * S, 14 * S);
    const H = drawCat(c, gx, gy, { s: S, t, look, blink, wide: v.wide, open: v.open, puff: v.puff, worry: v.worry, earsBack: -0.32 * v.ears, squash: v.squash });
    const hy = H ? H.hy : gy - CAT_HEAD_Y * S;
    return { box: { x0: gx - 140 * S, y0: gy - 321 * S, x1: gx + 101 * S, y1: gy + 10 * S }, pt: [gx, hy], face: [gx, hy + 8 * S],
      faceBox: { x0: gx - 84 * S, y0: hy - 66 * S, x1: gx + 84 * S, y1: hy + 66 * S } };
  },
};
