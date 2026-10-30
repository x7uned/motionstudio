// catalog-v1 backdrop «beach»: the dawn shore of the «lightest → heaviest» film (animals-weight/film/levels/shore.mjs back,
// copy in lib/weight-shore.mjs), in daylight: a clear sea with swaying light shafts and a foam swash on the left, wet then
// dry golden sand with shells and driftwood across the floor, a low dune and a flowering meadow at the right edge,
// a hazy far shore on the horizon, a day sky with three slow clouds. The film's balance seesaw, bees and whale are not drawn.
import { layer } from "../engine/layout.mjs";
import { terrain, film, seaWater, seaBand, farShore, swash, WL, ground, OY } from "./lib/weight-shore.mjs";
import { drawSky, blitScaled } from "./lib/ws6-common.mjs";
import { sm } from "./lib/cute.mjs";

const HORIZON = OY - 34;                         // stage y of the sea horizon (550)

export default {
  kind: "beach",
  backdrop: true,
  covers: ["beach"],
  source: "animals-weight/film/levels/shore.mjs#back",
  desc: "sunny sandy beach: clear sea with foam on the left, shells, dune and flowering meadow right",
  theme: { accent: "#F4A640", gold: "#F4CA50", hot: "#FFE8A8", core: "#FFF8DC", stone: ["#2A3A3C", "#3A5256", "#1C2A2C"], beam: "#BFF6FF" },
  draw(c, cam, t) {
    const V = layer(cam, 1), Vf = film(V), [land, field] = terrain();
    drawSky(c, V, t, OY + 80, HORIZON + 6);
    seaBand(c, Vf, t, 4900, WL + 90, 34, (wx) => -34 * (1 - sm(wx, WL + 10, WL + 90)));
    farShore(c, Vf);
    seaWater(c, Vf, t, 4900, WL + 40);
    blitScaled(c, land.src, Vf);
    blitScaled(c, field.src, Vf);
    swash(c, Vf, t);
  },
  notes: "Film terrain at 1x, sampled nearest through the camera (close-ups enlarge its pixels). Wide shot: horizon y 550, sea + seabed cross-section at the far left (x < 60), foam swash at x ~60-90, flat wet-to-dry sand y 570 across the slots (shells at x 80-250), dune + meadow with flowers from x ~400 to the right edge. Re-laid vs the film: sand/dune/meadow moved 140 px right; starfish and driftwood moved. Daylight only (no dawn/night grade). Sky and water are redrawn per pixel (not cached) so the water banding re-dithers slightly with camera zoom.",
};
