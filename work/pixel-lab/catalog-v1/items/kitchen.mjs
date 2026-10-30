// catalog-v1 backdrop «kitchen»: the night kitchen of «How cats drink» — dark purple wall with diamond wallpaper, a moonlit
// window onto the night city, wall and base cabinets with a warm under-cabinet light, kettle and mug, a framed fish picture,
// the fridge, a tiled floor to the bottom edge and dark chair legs in the foreground (parallax). Ported from
// work/pixel-lab/cat-drink/film/kitchen.mjs drawKitchen / drawForeground (copy in lib/catdrink-kitchen.mjs).
import { drawKitchen, drawForeground } from "./lib/catdrink-kitchen.mjs";

export default {
  kind: "kitchen",
  backdrop: true,
  covers: ["kitchen"],
  source: "cat-drink/film/kitchen.mjs#drawKitchen",
  desc: "night kitchen: moonlit window, cabinets with warm light, fridge, tiled floor",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#221B38", "#2E2548", "#1A1530"], beam: "#F7B04A" },
  draw(c, cam, t) { drawKitchen(c, cam, t, 10); },
  front(c, cam, t) { drawForeground(c, cam, t); },
  notes: "Night kitchen re-laid out for the wide frame (three cabinets left, fish picture, window right of centre, fridge at the right edge); chair legs in front (front()). Flat-colour film style, less detailed than living-room. Dark: light props read best, the black cat is low-contrast. Patterns stabilised for the drifting camera (snapped wallpaper diamonds, solid contact shadow, no dithered seam highlight). Checker: 2 tiny flags (2.27 s chair-leg edge re-rounding, 49 px; 5.17 s the wall's dithered band edge during the close-up hold, 61 px). Real draw 26-28 ms/frame.",
};
