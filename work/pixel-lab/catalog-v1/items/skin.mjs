// catalog-v1 item «skin»: the magnified section of a dog's wet nose (dogs/kit/nosebio-skin.mjs#drawSkin): cobble epidermis
// over the dermis, glands that light up and pump mucus up their ducts in droplets, a glossy mucus film in the grooves,
// and smell particles that float in the air and stick to the film. Copied with skinGeo, skinAnchors, drawSkin and
// the util helpers into items/lib/dogs-nosebio-skin.mjs and dogs-nosebio-util.mjs (import paths only).
// Changes: the film draws into a box; here the prop's box is the footprint (hw × hh half extents, box = 2hw × 2hh at z 1),
// and the film's own inputs (glands, flow, film, particles) are driven by eased parameters, so no state changes in one frame.
// The smell particles are five fixed film particles; their air alpha is the `smell` parameter and each sticks in turn.
import { drawSkin } from "./lib/dogs-nosebio-skin.mjs";

const HW = 118, HH = 100;   // footprint (half extents, z 1) = the skin box
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// the smell particles: positions as fractions of the box (air above the skin surface); radius in film px (drawSkin scales it by the box scale; doubled from the film so they stay readable at the 0.47 scale)
const PARTS = [
  { x01: 0.2, y01: 0.2, r: 11 },
  { x01: 0.4, y01: 0.13, r: 9 },
  { x01: 0.6, y01: 0.25, r: 12 },
  { x01: 0.79, y01: 0.16, r: 10 },
  { x01: 0.32, y01: 0.36, r: 8 },
];

export default {
  kind: "skin",
  covers: ["skin"],
  source: "dogs/kit/nosebio-skin.mjs#drawSkin (+ nosebio-util.mjs helpers, skinGeo, skinAnchors)",
  desc: "magnified dog nose skin section: glands pump mucus up ducts into a glossy film that catches smell particles",
  hw: HW, hh: HH,
  start: "dry skin, glands still, no film",
  states: {
    dry: [0.5, "dry skin section, glands still"],
    smell: [0.6, "smell particles drift in the air above the skin", "appear"],
    pump: [0.7, "glands light up and pump mucus up their ducts in droplets", "swell"],
    wet: [0.7, "a glossy mucus film spreads over the surface", "swish"],
    catch: [0.6, "smell particles stick to the film", "pop"],
  },
  // glands: gland light and swell · flow: droplets up the ducts · film: mucus film · smell: particles in the air · stick: landing
  base: { glands: 0, flow: 0, film: 0, smell: 0, stick: 0 },
  st: {
    dry: { glands: 0, flow: 0, film: 0, smell: 0, stick: 0 },
    smell: { smell: 1 },
    pump: { glands: 1, flow: 1 },
    wet: { film: 1, glands: 0.5, flow: 0.4 },
    catch: { film: 1, stick: 1 },
  },
  linear: [],
  notes: "The film's box is the prop's footprint (the skin fills it, dark background as in the film). Scale follows the box (s = min(w/500, h/420)): at z 1 the detail is about half the film's size, so the cobbles and glands read small. Particles stick one after the other (stick × 1.3 − i × 0.15) so the catch is staggered, not one frame.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, box = { x: cx - HW * z, y: cy - HH * z, w: 2 * HW * z, h: 2 * HH * z };
    const particles = PARTS.map((p, i) => ({ x01: p.x01, y01: p.y01, r: p.r, a: v.smell, stick: clamp01(v.stick * 1.3 - i * 0.15) }));
    drawSkin(c, box, t, { glands: v.glands, flow: v.flow, film: v.film, particles });
    return { box: { x0: box.x, y0: box.y, x1: box.x + box.w, y1: box.y + box.h }, pt: [cx, cy] };
  },
};
