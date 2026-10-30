// «Why do cats love boxes?» — props for the pixel film (same apartment, cat and owner as ../../cat-zoomies/film).
// World props (actors' plane, drawn through G = ground(cam), scaled by G.z, pure, dissolve-safe through o.alpha):
//   drawBox / boxRim / boxClip / boxGeom / BOX   — the cardboard shipping box (props-box.mjs)
//   drawBed / bedRim / BED                        — the fancy round plush bed (props-bed.mjs)
//   drawPaper / PAPER                             — printed sheets on the floor: square, kanizsa, wonky (props-paper.mjs)
// Screen-space inserts (540×960 grid px):
//   shelterPanel / cageBox / cagePlane, thermometer, heatAura (props-ui.mjs)
export { BOX, KRAFT, drawBox, boxRim, boxClip, boxGeom } from "./props-box.mjs";
export { BED, drawBed, bedRim } from "./props-bed.mjs";
export { PAPER, drawPaper } from "./props-paper.mjs";
export { shelterPanel, cageBox, cagePlane, thermometer, heatAura } from "./props-ui.mjs";
