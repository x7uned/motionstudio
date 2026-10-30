// catalog-v1 item «shrew»: the Etruscan shrew of the animals-heart series (LV10), peeking up front-on out of a gap:
// velvet grey-brown body, round pink-lined ears, glossy bead eyes, a long wiggly pink-tipped snout pointing down at us,
// whiskers, tiny pink hands on the stone. Ported from work/pixel-lab/animals-heart/film/levels/wall-shrew.mjs#drawShrew
// (copy in lib/animals-heart-wall-shrew.mjs) through the cute-family adapter: standard sit · look · wide · sleepy, plus
// «sniff». The film's happy state is dropped (the drawing has no happy eyes). Every option is an eased parameter.
import { drawShrew } from "./lib/animals-heart-wall-shrew.mjs";
import { cuteItem } from "./lib/cute-family.mjs";

const HEAD_Y = 78;   // head centre above the stone line (the hands rest on the stone), scale 1

export default cuteItem({
  kind: "shrew",
  covers: ["shrew"],
  source: "animals-heart/film/levels/wall-shrew.mjs#drawShrew",
  desc: "tiny grey-brown shrew peeking up front-on: round pink-lined ears, bead eyes, long wiggly pink snout, whiskers, tiny pink hands",
  hw: 62, hh: 88, start: "sits in the gap, breathes, snout wiggles, blinks",
  S0: 1.25, mid: 55, headY: HEAD_Y, box: [-52, -116, 52, 6], faceR: 40, shadow: [48, 8],
  states: {
    wide: [0.4, "eyes wide and round: startled", "rise"],
    sniff: [0.5, "snout twitches fast: sniffs the air", "blip"],
  },
  drop: ["happy"],
  base: { sniff: 0 },
  st: {
    sniff: { sniff: 1, look: 0.3, shut: 0, squash: 0, wide: 0 },
    look: { sniff: 0, wide: 0 },
    wide: { sniff: 0 },
    sleepy: { sniff: 0 },
  },
  opts: (v, { t }) => ({
    wide: v.wide,
    sniff: v.sniff * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 1.5)),                    // the nose lifts and twitches
    wig: 0.25 * Math.sin(t * 2 * Math.PI * 0.5) + v.sniff * 0.35 * Math.sin(t * 2 * Math.PI * 2.2),
  }),
  notes: "the film's happy state (closed happy eyes) is not in this drawing and is dropped; the body sprite is the film's own (the film note said head and hands only) and, with no stone gap drawn, its lower velvet shows under the hands. Flag: 2 frames at 4.1 s (110 novel px): the shared cute.mjs eye draws its lash line from blink > 0.02, so the sleepy closing starts with a step (shared file, not changed); sniff and wiggle are slowed to 1.5 and 2.2 Hz so no frame jumps.",
  draw: (c, gx, gy, o) => drawShrew(c, gx, gy - HEAD_Y * o.s, o),
});
