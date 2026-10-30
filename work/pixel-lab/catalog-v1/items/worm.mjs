// catalog-v1 item «worm»: the animals film's cream grub / worm (five round segments wriggling, brown cap, two eyes), ported from
// work/pixel-lab/animals/film/levels/forest.mjs#drawGrub (copy in lib/animals-forest-grub.mjs, redrawn at scale with shaded
// segments and bead eyes because the film's grub is only 11 px wide). Leans toward the target, rears up, happy, wide, sleepy.
import { drawGrub } from "./lib/animals-forest-grub.mjs";
import { cuteItem } from "./lib/cute-family.mjs";

export default cuteItem({
  kind: "worm",
  source: "animals/film/levels/forest.mjs#drawGrub",
  desc: "fat cream worm rearing up: five round segments, brown cap, bead eyes, wriggles",
  hw: 46, hh: 66, start: "stands up, wriggles slowly, blinks",
  S0: 4.4, mid: 12, headY: 19, box: [-28, -24, 28, 3], faceR: 12, shadow: [24, 4], hop: 4, lookY: 0.4,
  states: {
    rear: [0.5, "stretches tall and wriggles hard", "swell"],
  },
  base: { wig: 0, rear: 0 },
  st: { sit: { wig: 0, rear: 0 }, look: { wig: 0, rear: 0 }, wide: { wig: 0, rear: 0 }, happy: { wig: 0.5, rear: 0 }, sleepy: { wig: 0, rear: 0 },
    rear: { rear: 1, wig: 1, look: 0, wide: 0, happy: 0, open: 0, shut: 0, squash: 0 } },
  opts: (v, { S, s }) => ({ wig: v.wig, rear: v.rear, squash: v.squash, happy: v.happy, wide: v.wide, open: v.open }),
  notes: "no sprite in the film besides segments; segments are redrawn shaded (same colours/layout); box height grows with rear.",
  draw: drawGrub,
});
