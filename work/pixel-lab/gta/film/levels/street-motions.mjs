// Audible motions of the street level («GTA 6: the city behind you») for the 8-bit sound design. Every entry spans exactly
// the motion it accompanies and is computed from the same constants as the picture: the timeline (drawnAt, camDir turns,
// CULL_ON, TURN1/TURN_BACK/TURN2, LAG) and the street modules' own beat tables (street.mjs SWEEP/XRAY/TAG_WIN/LATE…,
// street-cam.mjs CAM_IN/CONE_IN, street-tower.mjs T/TAGS). Draw-in / dissolve windows are measured on drawnAt itself
// (where a representative column crosses 5 % and 95 %). Not listed (no sound of their own): neon flicker dips, palm
// sway, water glitter, the REC lamp pulse, the cone's light ripples. Entry: { t0, t1, kind, level, note }.
import { drawnAt, CULL_ON, TURN1, TURN_BACK, TURN2, LAG, HERO_X } from "../timeline.mjs";
import { SWEEP, XRAY, TAG_WIN, LATE_POP, NEON_LATE } from "./street.mjs";
import { CAM_IN, CONE_IN } from "./street-cam.mjs";
import { T as TT, TAGS as TOWER_TAGS } from "./street-tower.mjs";

const M = [], add = (t0, t1, kind, note) => { if (t1 > t0) M.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, level: "street", note }); };
/** Mean drawn amount of a side of the resting view (screen columns; side = [world x0, world x1]). */
const mean = (side, t) => { let s = 0, n = 0; for (let x = side[0]; x < side[1]; x += 4) { s += drawnAt(x, t); n++; } return s / n; };
/** First time in [a, b] where the side's mean drawn amount crosses level v (rising or falling), sampled at 1/480 s. */
function cross(side, a, b, v) { let prev = mean(side, a); for (let t = a; t <= b; t += 1 / 480) { const k = mean(side, t); if ((prev < v && k >= v) || (prev > v && k <= v)) return t; prev = k; } return null; }
function span(side, a, b, rising) { const t0 = cross(side, a, b, rising ? 0.05 : 0.95), t1 = t0 == null ? null : cross(side, t0, b, rising ? 0.95 : 0.05); return t0 == null || t1 == null ? null : [t0, t1]; }
const LEFT = [HERO_X - 270, HERO_X - 40], RIGHT = [HERO_X + 40, HERO_X + 270];   // the two halves of the resting view (world x)

// hook
add(SWEEP[0], SWEEP[1], "sparkle", "\"almost real\": a white glint sweeps across the hotel facades, windows twinkle");
// the illusion breaks: the city outside the view dissolves into the blueprint with a scanline shimmer
{ const w = span(LEFT, CULL_ON[0] - 0.1, CULL_ON[1] + 0.3, false); if (w) add(w[0], w[1], "glitch", "\"isn't there\": the left street dissolves into the navy blueprint (scanline glitch)"); }
// the game camera and its cone
add(CAM_IN[0], CAM_IN[1], "pop", "the little game camera dissolves in above the character (\"camera\")");
add(CONE_IN[0], CONE_IN[1], "rise", "the view cone opens out of the lens over the drawn street (\"see\")");
// in-world tags
for (const T of TAG_WIN) add(T.t[0], T.t[0] + 0.28, "pop", `tag "${T.text}" fades in`);
// turn 1: right → left
add(TURN1[0], TURN1[1], "whoosh", "\"turn around\": the game camera swings from right to left, the cone sweeps across");
{ const w = span(LEFT, TURN1[0] - 0.2, TURN1[1] + 1.2, true); if (w) add(w[0], w[1], "zap", "the left street draws in (scanline pop-in)"); }
{ const w = span(RIGHT, TURN1[0] - 0.2, TURN1[1] + 1.2, false); if (w) add(w[0], w[1], "dissolve", "\"the street behind you is no longer drawn\": the right side dissolves into the blueprint"); }
// turn back: left → right (for the hidden building and the tower)
add(TURN_BACK[0], TURN_BACK[1], "whoosh", "the camera swings back to the right");
{ const w = span(RIGHT, TURN_BACK[0] - 0.2, TURN_BACK[1] + 1.2, true); if (w) add(w[0], w[1], "zap", "the right street draws in again"); }
{ const w = span(LEFT, TURN_BACK[0] - 0.2, TURN_BACK[1] + 1.2, false); if (w) add(w[0], w[1], "dissolve", "the left street dissolves back into the blueprint"); }
// occlusion
add(XRAY.draw[0], XRAY.draw[1], "draw", "\"hidden\": the dashed X-ray outline of the building behind the tall HOTEL draws on");
add(XRAY.hl[0], XRAY.hl[0] + 0.3, "blip", "\"another building\": the front HOTEL's outline glows");
add(XRAY.tag[0], XRAY.tag[0] + 0.25, "pop", "tag \"HIDDEN = NOT DRAWN\" fades in (\"not drawn either\")");
add(XRAY.out[0], XRAY.out[1], "dissolve", "the X-ray box fades away");
// LOD tower
add(TT.hi[0], TT.hi[0] + 0.3, "blip", "\"far away\": the skyline tower is singled out (outline pulse)");
add(TT.box[0], TT.box[1], "delete", "\"a tower is just a simple box\": its far detail dissolves into a flat grey box");
add(TOWER_TAGS.box[0], TOWER_TAGS.box[0] + 0.25, "pop", "tag \"FAR = BOX\" fades in");
add(TT.come[0], TT.come[1], "rise", "\"details … come close\": the tower slides from the skyline to the near row, growing");
add(TT.lod1[0], TT.lod1[1], "zap", "LOD step 1: windows draw in");
add(TT.lod2[0], TT.lod2[1], "zap", "LOD step 2: balconies, crown steps and the neon crown draw in");
add(TT.lod3[0], TT.lod3[1], "shimmer", "LOD step 3: full colour, glass reflections and the spire");
add(TOWER_TAGS.close[0], TOWER_TAGS.close[0] + 0.25, "pop", "tag \"CLOSE = DETAILS\" fades in");
add(TT.back[0], TT.back[1], "fall", "the tower slips back to the skyline, its far look returns");
// turn 2: "turn around really fast" — the camera is quicker than the drawing
add(TURN2[0], TURN2[1], "whoosh", "\"turn around really fast\": the camera snaps to the left in 0.22 s");
{ const w = span(LEFT, TURN2[0], TURN2[1] + LAG + 1.5, true); if (w) { add(TURN2[1], w[0], "uhoh", "caught you: the camera faces the left street but it is still the empty blueprint"); add(w[0], LATE_POP[1], "glitch", "the left street pops in late in blocky chunks, out of order (the OCEAN hotel last)"); } }
{ const w = span(RIGHT, TURN2[0], TURN2[1] + LAG + 1.5, false); if (w) add(w[0], w[1], "dissolve", "the right street dissolves into the blueprint behind the camera"); }
add(NEON_LATE[0], NEON_LATE[1], "zap", "the left neon signs flicker on last");

M.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = M;
