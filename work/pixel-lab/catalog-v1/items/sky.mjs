// catalog-v1 backdrop «sky»: open daytime sky from the aura film's world (aura-full/film/world.mjs, copy in
// lib/aura-sky.mjs): blue dithered gradient, glowing sun upper right, soft drifting clouds, and a sea of billowing clouds
// along the floor. Only the neutral scenery is taken (no stairs, islands, birds, characters).
import { drawSky, drawSunMoon, drawClouds, drawCloudSea } from "./lib/aura-sky.mjs";

export default {
  kind: "sky",
  backdrop: true,
  covers: ["sky"],
  source: "aura-full/film/world.mjs#drawSky,drawSunMoon,drawClouds,drawCloudSea",
  desc: "open blue sky with sun, drifting clouds and a cloud sea below",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFF0A0", core: "#FFFBE0", stone: ["#2A3A66", "#3A4C80", "#1E2A4C"], beam: "#FFF4C8" },
  draw(c, cam, t) {
    drawSky(c, cam, 0);
    drawSunMoon(c, cam, 0);
    drawClouds(c, cam, t, 0, "mid");
    drawCloudSea(c, cam, t, 0);
  },
  notes: "Daytime only (film's night/moon/stars variant not exposed). Clouds drift slowly (2-12 px/s). Cloud sea rows start at y ~575 and fill to the bottom edge.",
};
