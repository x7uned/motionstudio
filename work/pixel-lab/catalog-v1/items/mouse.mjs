// catalog-v1 item «mouse»: the cute-series house mouse sitting front-on (same series as the black cat), ported from
// work/pixel-lab/animals-heart/film/levels/mouse-art.mjs drawMouse (copy in lib/animalsheart-mouse.mjs) through the
// cute-family adapter (lib/cute-family.mjs): standard states + «sniff». Every option is an eased parameter.
import { drawMouse, MOUSE_HEAD_Y } from "./lib/animalsheart-mouse.mjs";
import { cuteItem } from "./lib/cute-family.mjs";

export default cuteItem({
  kind: "mouse",
  source: "animals-heart/film/levels/mouse-art.mjs#drawMouse",
  desc: "grey-brown mouse sitting front-on: big round pink ears, bead eyes, pink nose, whiskers, long pink tail",
  hw: 84, hh: 78, start: "sits, breathes, wiggles its ears, tail sways",
  S0: 0.8, mid: 82, headY: MOUSE_HEAD_Y, box: [-80, -175, 110, 12], faceR: 55, shadow: [60, 9],
  states: {
    wide: [0.4, "ears spread, hands up, mouth open: surprised", "rise"],
    happy: [0.45, "^ ^ eyes, open smile, hands up, a little hop", "ding"],
    sniff: [0.4, "nose and whiskers twitch fast: sniffs the air", "blip"],
  },
  base: { sniff: 0 },
  st: { sniff: { sniff: 1, look: 0.6, shut: 0, happy: 0, squash: 0 }, look: { sniff: 0 }, wide: { sniff: 0 }, happy: { sniff: 0 } },
  opts: (v, { t }) => ({
    happy: v.happy, open: v.open, ears: 0.6 * v.wide, arms: Math.min(1, 0.4 * v.wide + 0.55 * v.happy), squash: v.squash,
    sniff: Math.round(v.sniff * 1.2 * Math.sin(t * 2 * Math.PI * 3)),
  }),
  notes: "film float pose (dangle, parachute ears) and side-view walk not exposed; no worry brows in this drawing",
  draw: drawMouse,
});
