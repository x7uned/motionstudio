// Audible motions of the mouse (LV3 · field) and cat (LV4 · roofs) levels, for the sound design: one entry per motion
// { t0, t1, kind, level, note } in seconds, computed from the very timing constants the level modules draw with
// (field.mjs FT, roofs.mjs T) — no hard-coded seconds. Kinds: pickup · tag · pose · hop · float · feather · land · reveal ·
// fall · dust · step · swing · crouch · twist. Heartbeats/pulses are not listed (they come from BEATS where they exist).
import { CAM } from "../timeline.mjs";
import { FT } from "./field.mjs";
import { T } from "./roofs.mjs";

const list = [];
// the film's camera x at time t (the same eased keys as render.mjs), to keep only motions that are on screen
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const camX = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1]; return a.cx + (b.cx - a.cx) * ease((t - a.t) / (b.t - a.t || 1)); };
const add = (t0, t1, kind, level, note) => list.push({ t0: Math.round(t0 * 1000) / 1000, t1: Math.round(t1 * 1000) / 1000, kind, level, note });

// ---------------------------------------------------------------- LV3 · field (mouse)
add(FT.pick, FT.pick + 1.6, "pickup", "field", "20 G rises above the mouse on the hay bale");
add(FT.ready, FT.hopOff, "pose", "field", "the mouse raises its arms and spreads its ears, ready to jump");
add(FT.hopOff, FT.floatA, "hop", "field", "a little hop up and off the round hay bale");
add(FT.floatA, FT.landT, "float", "field", "floats down like a leaf, swinging left and right, air-drag streaks");
add(FT.feather0, FT.feather1, "feather", "field", "a feather drifts down beside it at the same slow speed");
add(FT.landT, FT.land1, "land", "field", "soft landing on the field (small squash)");
add(FT.cut0, FT.cut1, "reveal", "field", "the ground is cut away: deep mine shaft, gallery, lantern, hay pile");
add(FT.tag0, FT.tag1, "tag", "field", "J.B.S. HALDANE, 1926");
add(FT.dropT, FT.inShaft, "hop", "field", "hops over into the shaft mouth");
add(FT.inShaft, FT.hayT, "fall", "field", "drops down the deep shaft, slowed by the air (streaks)");
add(FT.hayT, FT.hay1, "land", "field", "lands softly on the hay pile at the bottom, straws fly up");
add(FT.dust0, FT.walkT, "dust", "field", "dusts itself off: a quick shake and little dust puffs");
add(FT.turn[0], FT.turn[1], "pose", "field", "turns from facing the camera to walking sideways (front pose dissolves into the side walk)");
for (let n = 0; ; n++) {   // footfalls of the side-view walk (two per stride), while the mouse is on screen
  const d = FT.stride * (n / 2 + 0.25), t = FT.walk0 + d / FT.speed;
  if (d > FT.walkLen || 270 + FT.walkX0 + d - camX(t) < -30) break;
  add(t, t + 0.06, "step", "field", `footstep ${n + 1}, walking away along the gallery`);
}

// ---------------------------------------------------------------- LV4 · roofs (cat)
add(T.pick, T.pick + 1.6, "pickup", "roofs", "4 KG beside the cat's head");
add(T.balIn[0], T.balIn[1], "tag", "roofs", "balance card 200 MICE = 1 CAT appears");
add(T.balIn[0], T.balIn[0] + T.balSwing, "swing", "roofs", "the balance beam wobbles and settles level (heap of mice vs one cat)");
add(T.worry, T.worry + 0.3, "pose", "roofs", "peers down at the lower roof, ears back, worried");
add(T.crouch, T.off, "crouch", "roofs", "crouches on the ridge");
add(T.off, T.roll1, "hop", "roofs", "springs off the ridge and rolls upside down");
add(T.takeoff[0], T.takeoff[1], "pose", "roofs", "the sitting pose dissolves into the mid-air pose as it leaves the ridge");
add(T.frontA, T.frontB, "twist", "roofs", "mid-air twist: the front half turns upright first");
add(T.backA, T.backB, "twist", "roofs", "mid-air twist: the back half follows");
add(T.backB, T.land, "fall", "roofs", "drops feet-first to the lower roof");
add(T.land, T.sitA, "land", "roofs", "lands on its feet on the slate roof (squash)");
add(T.sitA, T.sitB, "pose", "roofs", "sits up facing the camera again");

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
