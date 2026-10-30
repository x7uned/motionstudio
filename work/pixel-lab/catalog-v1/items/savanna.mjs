// catalog-v1 backdrop «savanna»: the wildcat's dream savanna of the cat-zoomies film (cat-zoomies/film/dream.mjs#drawDream,
// copy in lib/zoomies-savanna.mjs) at golden dusk: low sun with glow, streaky clouds, hazy ridge with two mesas, far plain,
// four bands of acacias and bushes, backlit golden grass swaying, a grass meadow with tuft rows toward the viewer, drifting
// golden motes. Catalog changes: the burrow mound, dirt patch, stones, mouse and bubble are not drawn; film world x 0 =
// stage centre, ground line = stage y 570; the film's dusk light (0) is kept.
import { drawDream } from "./lib/zoomies-savanna.mjs";

export default {
  kind: "savanna",
  backdrop: true,
  covers: ["savanna"],
  source: "cat-zoomies/film/dream.mjs#drawDream",
  desc: "golden-dusk savanna: low sun, acacias, swaying golden grass, hazy ridge",
  theme: { accent: "#FFC676", gold: "#FFC676", hot: "#FFE2A8", core: "#FFF6D6", stone: ["#3A1C28", "#54283A", "#26121C"], beam: "#FFBC5E" },
  draw(c, cam, t) { drawDream(c, cam, { t, light: 0 }); },
  notes: "Wide shot: ground line y 570, sky/ridge/acacia bands y 190–570, sun at x ≈ 330 behind the ridge (calm middle is the sky and the dark meadow). The meadow below the line is the film's very dark dusk grass (#5A2D28 → #2E1620), so a dark prop (black cat) reads weakly against it; pale props read well. Close-ups enlarge the layered bands (visible horizontal stripes at z 1.85). Film foreground tufts (drawDreamFront) not ported.",
};
