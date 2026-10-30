// catalog-v1 prop «smartphone»: a free-standing smartphone in a lilac case (star sticker on the back), ported from
// work/pixel-lab/not-ugly/film/levels/room-props.mjs drawPhone (copy in lib/notugly-phone.mjs, + the cat-eyes phone's
// flash glow). States: dark glass → screen on → buzzing (eased shake, pulsing screen) → turned round to its back → camera
// LED / torch with a flash burst. Idle: a slow float and sway. No app logos, no UI text.
import { drawPhone } from "./lib/notugly-phone.mjs";

const S0 = 10;   // phone size factor at z 1 (body ≈ 105 × 172 px)
export default {
  kind: "smartphone",
  covers: ["smartphone"],
  source: "not-ugly/film/levels/room-props.mjs#drawPhone",
  desc: "smartphone in a lilac case: screen lights up, buzzes, turns to show its back, torch flash",
  hw: 58, hh: 88,
  start: "floats upright, dark screen facing us, slow sway",
  states: {
    dark: [0.5, "screen off, dark glass facing us", "dim"],
    on: [0.45, "screen lights up blue-white", "glow"],
    buzz: [0.35, "rings: shakes fast, screen pulses", "whirr"],
    back: [0.6, "turns round to show the lilac back with the camera", "swish"],
    torch: [0.6, "turns its back to us and the camera LED flashes, then shines", "zap"],
  },
  base: { on: 0, buzz: 0, turn: -1, torch: 0 },
  st: {
    dark: { on: 0, buzz: 0, turn: -1, torch: 0 },
    on: { on: 1, buzz: 0, turn: -1, torch: 0 },
    buzz: { on: 1, buzz: 1, turn: -1, torch: 0 },
    back: { buzz: 0, turn: 0.85, torch: 0 },
    torch: { buzz: 0, turn: 0.85, torch: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "The film phone is a tiny 9x17 px prop drawn analytically, here at size factor 10 (crisp at any zoom) and still the film's flat look: plain case colours, a 3/4 edge strip on the right, no volume shading. Catalog fixes: rounded dark outline (the film's square ring showed at this size), screen gradient quantised to 4 dithered bands, a dark-glass off state with a faint reflection band, the film's tiny hero face on the screen removed (the lit screen is an empty blue-white field). The torch reuses the cat-eyes phone flash glow, centred on the back lens; the glow dots also fall over the case and camera block. The star sticker reads as a long yellow diamond. Measured footprint 82x120 includes the flash glow and the buzz shake (body 54x87).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, sc = S0 * z, bz = v.buzz, w = Math.sin(2 * Math.PI * 11 * t);
    const x = cx - 0.65 * sc + bz * 3 * z * w, y = cy + Math.sin(t * 1.7) * 1.5 * z;
    const ang = 0.02 * Math.sin(t * 1.1) + bz * 0.035 * Math.sin(2 * Math.PI * 11 * t + 0.8);
    const fa = s.acc("torch"), burst = Math.sin(Math.PI * fa);
    drawPhone(c, x, y, ang, v.turn, sc, { a: 1, on: v.on, glow: 1 - 0.35 * bz * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2)), torch: Math.min(1, v.torch * (0.7 + 0.3 * burst) + 0.3 * burst * v.torch), flashR: 46 + 24 * burst });
    const H = 8.5 * sc, half = Math.max(1.2, 4.6 * sc * Math.abs(v.turn)), edge = 1.3 * sc;
    return { box: { x0: x - half - 1, y0: y - H - 1, x1: x + half + edge + 1, y1: y + H + 1 }, pt: [x + edge / 2, y] };
  },
};
