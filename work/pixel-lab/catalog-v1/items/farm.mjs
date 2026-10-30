// catalog-v1 backdrop «farm»: the barn level of the «animals-heart» film (animals-heart/film/levels/barn.mjs back/front,
// copy in lib/heart-barn.mjs): a red barn with white trim, open doorway full of hay and a hay-loft door at the right edge,
// a dirt track across a flowering lawn, a rail fence and a stack of hay bales with sacks at the left edge, green hills
// and far blue mountains, a day sky with three slow clouds; tall grass tufts and flowers along the bottom edge in front.
// The film's lantern, mouse and the gorge rocks are not drawn.
import { layer } from "../engine/layout.mjs";
import { build, OX, OY } from "./lib/heart-barn.mjs";
import { drawSky, blitScaled } from "./lib/ws6-common.mjs";

const view = (V) => ({ wx: (sx) => V.wx(sx) + OX, wy: (sy) => V.wy(sy) - OY });

export default {
  kind: "farm",
  backdrop: true,
  covers: ["farm"],
  source: "animals-heart/film/levels/barn.mjs#back",
  desc: "sunny farm: red barn at the right, hay bales and fence left, flowering lawn, hills",
  theme: { accent: "#F0A030", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#3A1E1A", "#5A2E26", "#2A1612"], beam: "#FFB84A" },
  draw(c, cam, t) {
    const V = layer(cam, 1), Vf = view(V), { SCENE } = build();
    drawSky(c, V, t, 600, 560);
    blitScaled(c, { d: SCENE.layer.c.d, m: SCENE.layer.m, w: SCENE.w, h: SCENE.h, wx0: SCENE.wx0, wy0: SCENE.wy0 }, Vf);
  },
  front(c, cam, t) {
    const V = layer(cam, 1), Vf = view(V), { FRONT } = build();
    blitScaled(c, { d: FRONT.layer.c.d, m: FRONT.layer.m, w: FRONT.w, h: FRONT.h, wx0: FRONT.wx0, wy0: FRONT.wy0 }, Vf);
  },
  notes: "Film painting at 1x, sampled nearest through the camera (close-ups enlarge its pixels). Wide shot: lawn line y 570, barn at the right edge (x 380-575, roof peak y ~290, doorway with hay), hay bales + fence at the left edge (x 0-230), middle open lawn with a dirt track, hills y ~510-570, mountains right. Re-laid vs the film: barn moved 80 px right, hay/fence to the left, mountains 100 px later, lawn extended down to the frame bottom. Daylight only; no light grade. Lantern, mouse, gorge rocks not drawn.",
};
