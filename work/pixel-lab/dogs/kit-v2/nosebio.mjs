// Dog series kit · film 2 «Why is a dog's nose always cold and wet?» — three DIAGRAM drawings (illustrations, not to
// scale), each a pure function drawn in screen space inside the lead's box {x, y, w, h} (grid pixels on the 540×960
// canvas; designed for 500×420, any size/aspect works, the art is fitted and centred, the background fills the box).
// Every option is continuous 0..1, o.a (default 1) dissolves the whole drawing with an ordered dither, t (seconds)
// animates cycles; nothing changes in one frame. Each draw returns its anchors (screen coordinates) for label leaders.
// Static parts are cached per box SIZE (moving the box is free; a new size costs one 10–170 ms rebuild).
//
// drawSkin(c, box, t, o) — magnified cross-section of the wet nose surface: air on top, dark leathery skin with a
//   cobblestone top (6 plates), 3 glands (bulbs) with ducts opening into the grooves, fat cells at the bottom.
//   o.glands 0..1   glands + ducts dissolve in (0–0.45) and light up cyan (0.35–1)
//   o.flow 0..1     mucus droplets climb the ducts and spread into the film (t-animated); the glands pump
//   o.film 0..1     puddles in the grooves → a continuous glossy bluish film (thicker in the grooves)
//   o.particles     [{x01, y01, col, stick 0..1, r?=5.5, a?=1}] smell bits in the air at (x01, y01) of the box; they
//                   drift a little with t; stick → 1 carries one straight down into the film (centre 0.7·r below it)
//   o.bg            true (default) dark diagram air | false = transparent air
//   returns {gland, duct, film, skin, glands[3], ducts[3], dermis, surfaceY, filmTop(x01)}
//   filmY(box, x01, film = 1) → screen y of the film surface; skinAnchors(box, o) → the same anchors without drawing.
//
// drawHead(c, box, t, o) — the collie's head in profile (facing right) with a cut-away window over the snout.
//   o.cut 0..1        the window opens (dithered reveal growing from the middle of the snout)
//   o.smellArea 0..1  the scroll maze at the back of the passage lights warm yellow (gentle pulse)
//   o.organ 0..1      the bean in the roof of the mouth (vomeronasal organ) lights up, pulsing with t
//   o.tongue 0..1     the tongue arches up to the organ; 8 coloured smell dots ride on it to the organ (o.dots fades them)
//   o.air 0..1        inhaled air: dotted streams through the nostril — upper stream to the smell area, lower to the throat
//   o.blink 0..1, o.look [dx, dy], o.bg (default true)
//   returns {nostril, passage, smellArea, organ, tongue, eye, nose, throat}; headCutAnchors(box) → the same.
//
// drawNostrils(c, box, t, o) — front macro of the black nose in the white muzzle fur.
//   o.wet 0..1 (default 1) gloss, glints, water beads · o.dry 0..1 matte dusty grey-black (wins over wet)
//   o.inhale 0..1  cyan dots converge straight into the round openings (shrinking as they go in)
//   o.exhale 0..1  warm dots leave the side slits and curl sideways and back
//   o.bg "fur" (default) | "dark" | "none"
//   returns {left, right, slitL, slitR, nose, philtrum}; nostrilAnchors(box) → the same.
export { drawSkin, filmY, skinAnchors, skinGeo } from "./nosebio-skin.mjs";
export { drawHead, headCutAnchors } from "./nosebio-head.mjs";
export { drawNostrils, nostrilAnchors } from "./nosebio-nose.mjs";
