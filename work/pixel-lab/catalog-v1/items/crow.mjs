// catalog-v1 item «crow»: the animals film's perched black crow (glossy blue-black feathers, big bead eyes, blush, small beak),
// ported from work/pixel-lab/animals/film/levels/forest.mjs#drawCrow (copy in lib/animals-forest-crow.mjs, scaled by s) through the
// cute-family adapter. Head turns toward the target, wings open and flap, angry glare, beak opens. Every option is an eased parameter.
import { drawCrow, CROW_HEAD_Y, CROW_MID } from "./lib/animals-forest-crow.mjs";
import { cuteItem } from "./lib/cute-family.mjs";

export default cuteItem({
  kind: "crow",
  source: "animals/film/levels/forest.mjs#drawCrow",
  desc: "black crow perched front-on: glossy blue-black feathers, big bead eyes, pink cheeks, wings that open",
  hw: 66, hh: 68, start: "perches, breathes, blinks",
  S0: 0.62, mid: CROW_MID, headY: CROW_HEAD_Y, box: [-66, -208, 66, 6], faceR: 48, shadow: [46, 6], hop: 5,
  drop: ["sleepy"],
  states: {
    glare: [0.4, "angry lid brows drop over the eyes: a hard glare", "thump"],
    spread: [0.55, "wings swing open and flap, beak opens", "flutter"],
  },
  base: { glare: 0, wing: 0 },
  st: { sit: { glare: 0, wing: 0 }, look: { glare: 0, wing: 0 }, wide: { glare: 0, wing: 0 }, happy: { glare: 0, wing: 0 },
    glare: { glare: 1, look: 0.5, wide: 0, happy: 0, open: 0, shut: 0, wing: 0 },
    spread: { wing: 1, open: 0.9, glare: 0, happy: 0, wide: 0, look: 0, shut: 0 } },
  opts: (v, { s }) => ({ head: [0, 0], wing: v.wing, flap: s.integ((p) => 9 * (0.25 + 0.75 * p.wing)), glare: v.glare, open: v.open, happy: v.happy }),
  notes: "perched only (the film's air/tail-fan and hop options not exposed); happy = eyes shut + beak open (no separate ^ ^ art in the film); head offset stays 0 (look moves only the eyes); flap speed ramps with the wing state; no sleepy state.",
  draw: (c, gx, gy, o) => drawCrow(c, gx, gy, o),
});
