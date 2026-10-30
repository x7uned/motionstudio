// catalog-v1 item «chimpanzee»: the animals film's chimp head (brown fur, bare pink face, big ears, brow ridge), ported from
// work/pixel-lab/animals/film/levels/jungle.mjs#chimpHead (copy in lib/animals-jungle-chimp.mjs). The film only draws the head,
// so the item is a head (bust): the face (bead eyes, brows, mouth) is added live with the cute kit; all options are eased params.
import { drawChimp, CHIMP_HEAD_Y } from "./lib/animals-jungle-chimp.mjs";
import { cuteItem } from "./lib/cute-family.mjs";

export default cuteItem({
  kind: "chimpanzee",
  source: "animals/film/levels/jungle.mjs#chimpHead",
  desc: "chimpanzee head: dark brown fur, bare pink face, big round ears, brow ridge, glossy bead eyes",
  hw: 62, hh: 54, start: "head faces you, blinks",
  S0: 0.62, mid: 58, headY: CHIMP_HEAD_Y, box: [-92, -78, 92, 56], faceR: 56, shadow: [48, 7], hop: 5,
  states: {
    hoot: [0.4, "lips pushed out into an O, brows down: hoots", "boo"],
  },
  base: { hoot: 0 },
  st: { sit: { hoot: 0 }, look: { hoot: 0 }, wide: { hoot: 0 }, happy: { hoot: 0 }, sleepy: { hoot: 0 }, hoot: { hoot: 1, open: 0.8, look: 0, wide: 0, happy: 0, shut: 0, squash: 0 } },
  opts: (v, { s }) => ({ a: s.a, happy: v.happy, wide: v.wide, open: v.open, hoot: v.hoot, sink: 6 * v.squash }),
  notes: "head only (the film draws no body for the chimp head sprite); ears and fur do not move, happy hop and hoot are mouth/brow/eye changes; shadow sits under the chin as a bust.",
  draw: drawChimp,
});
