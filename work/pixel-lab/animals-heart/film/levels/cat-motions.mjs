// Audible motions of the cat (LV6 · roofs) and mouse (LV8 · barn) levels, for the sound design: one entry per motion
// { t0, t1, kind, level, note } in seconds, computed from the very timing constants the level modules draw with
// (roofs.mjs VT, barn.mjs BT) — no hard-coded seconds. Kinds: pickup · tag · pose · door · appear · step · reach · puff ·
// pop · tick. Heartbeats/pulses are NOT listed: they come from BEATS (the ten "tick" hearts light exactly on mouse beats).
import { VT } from "./roofs.mjs";
import { BT } from "./barn.mjs";

const list = [];
const add = (t0, t1, kind, level, note) => list.push({ t0: Math.round(t0 * 1000) / 1000, t1: Math.round(t1 * 1000) / 1000, kind, level, note });

// ---------------------------------------------------------------- LV6 · roofs (cat, night)
add(VT.heartIn[0], VT.heartIn[1], "tag", "roofs", "the cat's heart icon appears");
add(VT.pick, VT.pick + 1.6, "pickup", "roofs", "130 BPM rises from the heart icon");
add(VT.blink[0], VT.blink[1], "pose", "roofs", "slow happy cat blink (\"at home\")");
add(VT.door[0], VT.door[1], "door", "roofs", "the rooftop stair-hut door swings open, warm light spills out");
add(VT.notice[0], VT.notice[1], "pose", "roofs", "the cat notices: looks toward the door, ears turn back a little");
add(VT.vetIn[0], VT.vetIn[1], "appear", "roofs", "a little vet (white coat, stethoscope, carrier) steps out of the doorway");
for (let n = 0; ; n++) {   // the vet's footsteps while walking from the door to the cat (two per walk cycle)
  const t = VT.vetWalk[0] + (n / 2 + 0.25) / VT.vetCycles; if (t >= VT.vetWalk[1]) break;
  add(t, t + 0.06, "step", "roofs", `vet footstep ${n + 1}`);
}
add(VT.reach[0], VT.reach[1], "reach", "roofs", "the vet reaches out with the stethoscope toward the cat");
add(VT.puff[0], VT.puff[1], "puff", "roofs", "the cat's fur puffs up, eyes go wide, little \"o\" mouth");
add(VT.bang[0], VT.bang[1], "pop", "roofs", "a yellow \"!\" pops up beside its head");
add(VT.tag[0], VT.tag[1], "tag", "roofs", "190 BPM AT THE VET");
add(VT.lower[0], VT.lower[1], "reach", "roofs", "the vet lowers the stethoscope (camera already panning)");
add(VT.calm[0], VT.calm[1], "pose", "roofs", "the fur slowly settles (camera already panning)");

// ---------------------------------------------------------------- LV8 · barn (mouse, day)
add(BT.heartIn[0], BT.heartIn[1], "tag", "barn", "heart icon appears on the mouse's belly");
add(BT.pick, BT.pick + 1.6, "pickup", "barn", "600 BPM");
add(BT.excited[0], BT.excited[1], "pose", "barn", "excited: ears perk up, little open mouth");
add(BT.card[0], BT.card[1], "tag", "barn", "card 10 / SECOND appears");
BT.ticks.forEach((t, i) => add(t, t + BT.tickLight, "tick", "barn", `little heart ${i + 1} of 10 lights (on a mouse beat)`));

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
