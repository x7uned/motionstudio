// catalog-v1 backdrop «night-sky»: the night clearing of the zombie-mouse film (zombie-mouse/film/clearing.mjs drawClearing,
// copy in lib/zombiemouse-clearing.mjs + its texture/noise libs): a deep-blue starry sky with a Milky Way band, a pale moon with
// a halo, far pine hills, seven layers of moonlit spruces with fog between the trunks, a mossy clearing with grass tufts,
// ferns and rocks, soft moonbeams through the canopy gap. Calm: no campfire, no log, no people.
// Catalog changes: stage camera → film camera (film x = stage x + 1000, film y = stage y − 560; horizon y 450, ground y 560 at
// the wide shot); the fire, stone ring, log, firewood and grass strip are not ported; the moon moves to the upper right.
import { drawClearing, drawClearingFront } from "./lib/zombiemouse-clearing.mjs";

const filmCam = (cam) => ({ cx: cam.cx + 1000, cy: Math.min(-20, cam.cy - 560), z: cam.z, sx: 270, sy: 450 });

export default {
  kind: "night-sky",
  backdrop: true,
  covers: ["night-sky"],
  source: "zombie-mouse/film/clearing.mjs#drawClearing",
  desc: "calm moonlit night clearing: starry sky, moon, dark pines, mossy ground, soft fog",
  theme: { accent: "#A8C4FF", gold: "#E8D890", hot: "#F2F6FF", core: "#FFFFFF", stone: ["#0C1226", "#1A2444", "#080C1A"], beam: "#8CA8E0" },
  draw(c, cam, t) { drawClearing(c, filmCam(cam), t); },
  front(c, cam, t) { drawClearingFront(c, filmCam(cam), t); },
  notes: "Per-pixel deferred shading of the film's layer textures (moon-lit tones, banded fog); stars twinkle, moonbeams and fog drift slowly. Not ported: campfire, log, stone ring, firewood, grass strip, flicker light.",
};
