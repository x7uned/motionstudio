// catalog-v1 item «thermometer»: the glass thermometer of «Cat boxes» (cat-boxes/film/props-ui.mjs#thermometer): a card with
// ticks, a glass tube and a bulb holding a red mercury column. Copied in lib/cat-boxes-thermometer.mjs (drawn on a half-size
// grid, blitted by lib/raster-buffer.mjs). Changes: the tick numbers and the °C / CATS / ROOM texts are gone (catalog text
// rule); the mercury level, the bulb glow and the red → blue colour are parameters, so a state change eases; a spoken value
// shows as the number at the top of the card, and it is the only digits on the item.
import { thermoBuf, W, H, levelY, TX, TW } from "./lib/cat-boxes-thermometer.mjs";
import { makeBuf, blit } from "./lib/raster-buffer.mjs";
import { otext } from "./lib/zoomies-hud.mjs";

const K = 1.5;   // screen px per grid px at z 1 (the card is 123 × 225 px at size m)
export default {
  kind: "thermometer",
  covers: ["thermometer"],
  source: "cat-boxes/film/props-ui.mjs#thermometer (+ card, RED, WARM, COOL)",
  desc: "glass thermometer with a red mercury column in a bulb; the mercury rises, the bulb glows, or the column turns blue",
  hw: 62, hh: 116, start: "card in place, mercury at room level",
  states: {
    show: [0.4, "tube at room level, card in place"],
    rise: [1.0, "mercury climbs toward the top, the bulb warms", "rise"],
    hot: [0.6, "bulb glows warm, mercury at the top", "glow"],
    cold: [0.9, "mercury sinks low and turns blue", "dim"],
    drop: [0.7, "mercury falls back to the middle", "fall"],
  },
  // lev: mercury level 0..1 · glow: bulb halo 0..1 · cold: 0 red … 1 blue (Bayer-dithered crossfade)
  base: { lev: 0.5, glow: 0, cold: 0 },
  st: {
    show: { lev: 0.5, glow: 0, cold: 0 },
    rise: { lev: 0.92, glow: 0.35, cold: 0 },
    hot: { lev: 0.97, glow: 1, cold: 0 },
    cold: { lev: 0.14, glow: 0, cold: 1 },
    drop: { lev: 0.42, glow: 0, cold: 0 },
  },
  linear: [],
  valueOptional: true,   // catalog-v1 contract flag: a spoken number is shown when given; the thermometer works without one
  demo: { value: "37" },
  notes: "Film colours, ticks and tube kept; drawn at half the film's size (82 × 150 grid px, nearest-neighbour blit) so it fits a prop slot. Tick numbers and °C / CATS / ROOM texts removed (catalog text rule). The UNITS list has no degree sign, so no unit is drawn; a spoken value sits top right. The comfort band and room marker of the film are dropped with their texts. The mercury colour crossfade is Bayer-dithered (no one-frame swap). Checker: see batches/W.md.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = K * z, buf = makeBuf(W, H);
    const { my } = thermoBuf(buf, { lev: v.lev, glow: v.glow, cold: v.cold });
    blit(c, buf, cx, cy, k);
    // the spoken number, top right of the card (only digits from s.value)
    if (s.value != null) otext(c, String(s.value), cx + (TX + TW + 8 - W / 2) * k, cy + (14 - H / 2) * k, "#FDFEED", 1, 2);
    return {
      box: { x0: cx - (W / 2) * k, y0: cy - (H / 2) * k, x1: cx + (W / 2) * k, y1: cy + (H / 2) * k },
      pt: [cx + (TX + TW / 2 - W / 2) * k, cy + (my - H / 2) * k],
    };
  },
};
