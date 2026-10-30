// Audible motions of LV8 · night camp, for the 8-bit sound design: { t0, t1, kind, level, note } in seconds, computed
// from the same timing constants the picture uses (camp-time.mjs) — no hard-coded seconds. Each sound lasts exactly as
// long as its motion. The mosquito's idle hovering and the fire's flicker are not listed per frame: only real moves.
import { POSES, XF, BEAT, HERO, MQ, EV, LV, END } from "./camp-time.mjs";

const list = [];
const add = (t0, t1, kind, level, note) => list.push({ t0: Math.round(t0 * 1000) / 1000, t1: Math.round(t1 * 1000) / 1000, kind, level, note });

// ---------------------------------------------------------------- ambience (very quiet, the whole stay)
add(LV.camp[0], END, "rustle", 0.1, "campfire crackle, very quiet bed under the camp");

// ---------------------------------------------------------------- the character's pose changes (each crossfade = one soft gesture sound)
const POSE_SOUND = { 5: ["blip", 0.18, "hand to the chin: thinking (\"number one?\")"], 2: ["swish", 0.2, "talks and gestures at the guess cards"], 3: ["swish", 0.2, "explains"],
  4: ["swish", 0.28, "points up at the little mosquito"], 6: ["swish", 0.2, "crosses his arms, annoyed"], 0: ["swish", 0.14, "arms down, idle"], 8: ["tilt", 0.22, "hands together, sad: getting sick"] };
POSES.forEach(([t0, row], i) => {
  if (i === 0) return;
  if (row === 3 && t0 >= EV.nope - 0.2) return add(t0, t0 + XF + 0.1, "boing", 0.35, "Nope → big shrug");
  if (row === 7 && t0 < EV.yes) return;                   // the swat has its own sounds below
  if (row === 7 && t0 >= HERO.fall[0] - 0.5) return add(t0, t0 + XF, "uhoh", 0.3, "whoa — hands up, about to tip over");
  if (row === 7) return add(t0, t0 + XF, "alert", 0.4, "bitten! jumps, hands up, mouth open");
  const s = POSE_SOUND[row]; if (s) add(t0, t0 + XF, s[0], s[1], s[2]);
});

// ---------------------------------------------------------------- the mosquito's entrance and the comic beat in the pause
add(MQ.flyIn[0], MQ.flyIn[1], "buzz", 0.55, "tiny mosquito whines in from the reeds to the centre under the moon");
add(MQ.sign[0], MQ.sign[1], "blip", 0.3, "LV 8 neon sign flickers on (two soft pulses, then steady)");
add(MQ.loop[0], MQ.loop[1], "whoosh", 0.35, "proud little loop-the-loop");
add(BEAT.buzz[0], BEAT.buzz[1], "buzz", 0.7, "dives past his face and zips round his head (the silent 1.5 s pause)");
add(BEAT.swat - XF, BEAT.swat, "swish", 0.4, "he swats: hands fly up");
add(BEAT.clap, BEAT.clap + 0.08, "slap", 0.5, "hands clap on empty air — missed");
add(BEAT.smug[0], BEAT.smug[1], "trill", 0.2, "smug hover, little side-to-side wiggle");

// ---------------------------------------------------------------- crowned
add(MQ.crown[0], MQ.crown[1], "pop", 0.5, "a tiny gold crown pops onto its head");
MQ.sparkles.forEach((t, i) => add(t, t + 0.6, i ? "twinkle" : "sparkle", i ? 0.22 : 0.4, i ? "sparkles around the crowned mosquito" : "crown sparkle burst"));

// ---------------------------------------------------------------- the bite
add(MQ.toArm[0], MQ.toArm[1], "buzz", 0.35, "sneaks down to his arm");
add(MQ.sit[0], MQ.sit[0] + 0.12, "land", 0.25, "lands on his arm, wings fold");
add(MQ.bite[0], MQ.bite[1], "sting", 0.6, "bites on \"die\"");
add(HERO.bumpGrow[0], HERO.bumpGrow[1], "squish", 0.35, "a little pink bump swells on his arm");
add(MQ.hop[0], MQ.hop[1], "flutter", 0.35, "pops off the arm as he jerks his hands up");
add(MQ.tag[0], MQ.tag[0] + 0.3, "blip", 0.35, "MALARIA tag pops in with the wobbling parasite blob");
add(MQ.tag[1] - 0.3, MQ.tag[1], "blip", 0.15, "MALARIA tag fades out");
add(HERO.sick[0], HERO.sick[1], "uhoh", 0.25, "he turns slightly green");
add(HERO.sweat[0], HERO.sweat[1], "patter", 0.15, "a sweat drop slides down his temple");

// ---------------------------------------------------------------- dizzy, the fall, the ghost
add(MQ.away[0], MQ.away[1], "buzz", 0.4, "the mosquito flies off happily toward the moon");
add(MQ.laps[0], END, "buzz", 0.1, "tiny victory laps in front of the moon (far away, very quiet)");
add(HERO.sway[0], HERO.fall[0], "tilt", 0.15, "he starts to sway, more and more");
add(HERO.dizzy[0], HERO.fall[1], "twinkle", 0.2, "dizzy stars circle his head");
add(HERO.fall[0], HERO.fall[1], "fall", 0.55, "tips over stiff as a plank");
add(HERO.bounce[0], HERO.bounce[0] + 0.1, "thud", 0.6, "lands flat on the grass, dust puff");
add(HERO.bounce[0], HERO.bounce[1], "bounce", 0.3, "little bounce on landing");
add(HERO.ghost[0], END, "ghost", 0.45, "his cute little ghost rises from the body and waves (still rising at the end)");

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
