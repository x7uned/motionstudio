// catalog-v1 backdrop «bedroom»: the bedroom of the same cat-zoomies apartment as «living-room» (periwinkle dotted
// wallpaper, wooden bed with a mustard quilt and a pillow, nightstand with the bedside lamp, framed night-sea picture, a
// book shelf with a trailing plant, the round cream rug, oak planks; the same window + rose curtain and cut-away roof as the
// living room) at night with the bedside lamp on, ported from work/pixel-lab/cat-zoomies/film/apartment.mjs drawApartment
// + apartment-props.mjs drawBedroom (copies in lib/zoomies-bedroom.mjs, lib/zoomies-bedroom-props.mjs; reuses
// lib/zoomies-props / env / layout / px as they are). Re-laid out for the catalog: nightstand + lamp at the left edge, bed
// across the lower left and centre, window + curtain right, a plain wall in the middle. Ambient: stars twinkle, clouds drift past the moon, motes in the moon shaft, the
// curtain stirs, the lamp is steady.
import { drawBedroomScene } from "./lib/zoomies-bedroom.mjs";

const TOD = 23;   // night: moon in the window, stars over the roof, city windows lit; the bedside lamp is on
const lamp = () => 1;   // the bedside lamp stays on (steady)
export default {
  kind: "bedroom",
  backdrop: true,
  covers: ["bedroom"],
  source: "cat-zoomies/film/apartment.mjs#drawApartment",
  desc: "night bedroom: bed with quilt, glowing bedside lamp, moonlit window, rug",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#221B38", "#2E2548", "#1A1530"], beam: "#F7B04A" },
  draw(c, cam, t) {
    drawBedroomScene(c, cam, { t, tod: TOD, lampBed: lamp(t), curtainSwing: 0.1 });
  },
  notes: "Same apartment as living-room (same window, rose curtain, roof and planks; periwinkle dotted bedroom paper), re-laid out: nightstand + lamp at the left edge, bed across the lower left/centre, picture over the headboard, shelf high above the lamp, window + curtain right, plain wall in the middle. Fixed hour 23 (night) with the bedside lamp on; the film's lamp fill is raised (0.085 -> 0.2) so the room and dark props read, and the lamp's wall light uses quarter bands (fewer rings). Floor stabilised for the push-in: the first thin plank row is a solid contact shadow, the plank highlight band is >= 1 px below its seam, row edges are off the wide shot's pixel centres. Still visible: the mustard quilt turns dusty brown under the night grading; the lamp light is a banded disc on the wall; large plain plank floor. Black cat reads by its outline and the lamp glow. Not drawn: the film's door, bowl and foreground plant (a foreground plant collided with left-slot close-ups). Real draw 22-30 ms/frame. Checker: 1 flag at 2.47 s: a plank seam/highlight row moves 1 px while crossing a band of the lamp's floor pool (re-rasterisation, not a one-frame change).",
};
