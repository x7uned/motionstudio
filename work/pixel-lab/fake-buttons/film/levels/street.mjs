// LEVEL «the corner» (Builder STREET) — entry point used by render.mjs. The level lives in street-main.mjs and its helpers:
//   street-time.mjs     every street beat from EV / PRESSES / walkAt (poses, presses, lens, phone, signals)
//   street-art.mjs      static layers painted once: FAR/MID skyline, NEAR (far side of the street), GROUND, FORE
//   street-props.mjs    signal heads, push-button box at BUTTON, controller cabinet (AUTO countdown), X-ray lens
//   street-traffic.mjs  cars (deterministic sim with stop lines), pedestrians, crossers, the avenue's near lane
//   street-sprites.mjs  car / pedestrian sprites;  street-hero.mjs  the channel's character, phone, flash, pickups
//   street-life.mjs     pigeons, manhole steam, a high jet, birds;  street-kit.mjs  layers, blits, helpers
// Sounds: street-motions.mjs (MOTIONS). Checks: dev/street-check.mjs, dev/street-timing.mjs, dev/street-pops.mjs.
export { back, actors, front, hud } from "./street-main.mjs";
