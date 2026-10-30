// catalog-v1 backdrop «living-room»: the cat-zoomies apartment's living room (cream diamond wallpaper, teal sofa with
// pillows, floor lamp, wall clock, big window onto the city with a rose curtain, oak planks and the patterned rug) in late
// afternoon light, ported from work/pixel-lab/cat-zoomies/film/apartment.mjs drawApartment (copies in lib/zoomies-*.mjs).
// Re-laid out for the catalog: sofa + lamp on the left, window + curtain on the right, a calm wall in the middle, the
// cut-away roof and sky along the top. Ambient: clouds drift past the window, dust motes in the sun shaft, the curtain
// stirs, the minute hand creeps.
import { drawApartment } from "./lib/zoomies-apartment.mjs";

const TOD = 16.6;   // late afternoon: warm daylight, a sun patch on the floor in front of the window
export default {
  kind: "living-room",
  backdrop: true,
  covers: ["living-room"],
  source: "cat-zoomies/film/apartment.mjs#drawApartment",
  desc: "cosy living room: sofa, floor lamp, wall clock, window onto the city, rug, afternoon sun",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#2A1E2E", "#3A2C40", "#1E1622"], beam: "#F7B04A" },
  draw(c, cam, t) {
    drawApartment(c, cam, { t, tod: TOD, clock: 4.2 + t / 360, lampLiving: 0, curtainSwing: 0.12 });
  },
  notes: "Re-laid out from the film's apartment: sofa + floor lamp left, window + rose curtain right, clock under the cornice, rug and sun patch in the middle; fixed hour 16.6 (late afternoon, lamp off). Bedroom, door and kitchen corner are not drawn; the side table and rubber plant stand just outside the wide frame (seen on side camera moves). Cream wall: dark props read well. Real draw 17-20 ms/frame (the sheet's figure includes harness overhead). Checker: 1 flag at 5.4 s while holding the z1.9 close-up under the camera drift: the window's top-bar outline steps 1 px and its wall-AO dither re-phases (1-px re-rasterisation, not a one-frame change).",
};
