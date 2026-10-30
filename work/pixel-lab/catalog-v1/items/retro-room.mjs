// catalog-v1 backdrop «retro-room»: a 1990s kid's room at night — a CRT TV on a low wooden stand with a generic console
// and its cable, the screen's blue glow on the wall and carpet, a lit floor lamp, a night window with the moon, a framed
// landscape picture, dark carpet to the bottom edge. Ported from work/pixel-lab/duck-hunt/film/room.mjs drawRoom (+ the
// window of tetris/film/room.mjs), copy in lib/duckhunt-room.mjs. The room only: no game picture on the screen (a plain
// glowing CRT picture with scanlines and a slow rolling band), no recognisable console, controller, light gun or logo.
// Ambient: the bright band rolls slowly down the screen, stars twinkle in the window.
import { drawRetroRoom } from "./lib/duckhunt-room.mjs";

export default {
  kind: "retro-room",
  backdrop: true,
  covers: ["retro-room"],
  source: "duck-hunt/film/room.mjs#drawRoom",
  desc: "night 1990s kid's room: glowing CRT TV, console, floor lamp, window",
  theme: { accent: "#5FD3F0", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#1C1630", "#2A2244", "#140F22"], beam: "#7FA4F0" },
  draw(c, cam, t) { drawRetroRoom(c, cam, t); },
  notes: "Film room re-laid out for the 9:16 stage: CRT + stand + console scaled 0.56 on the right, lit floor lamp left, the Tetris film's night window left of centre, the framed sky-over-grass picture above the TV, an oval plum rug under the stage, calm dark wall in the middle. IP removed: no game picture (plain glowing CRT field with scanlines and a slow rolling band), the film's grey console with a red light replaced by a generic charcoal box with a green light, no controller / light gun / kid, the Tetris block poster not ported. Added house-style 1-px outlines on the TV, stand, console and picture frame, and a warm wall glow for the lamp. Still visible: the film's flat, low-detail style (plain rectangles, few textures); very dark wall and carpet, so dark props (black cat) read only by their outline; the TV glow on the wall shows as wide dithered rings. Real draw 14-24 ms/frame. Checker: 1 flag at 4.07 s: one of the film's faint carpet lines (8 levels darker than the carpet, invisible) leaves the bottom edge in the first frames of the push-in (motion out of frame, not a one-frame change).",
};
