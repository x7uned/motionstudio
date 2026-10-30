// Audible motions of LV7 meadow (the heat-rule diagram during the pan + the rabbit) and LV9 gorge (hummingbird) for
// the 8-bit sound design. Every entry spans exactly the motion it accompanies and is computed from the levels' own
// timing tables (meadow.mjs T + its sniff/peekTwitch/earTwitch functions, gorge.mjs T) and the timeline — no
// hard-coded seconds. "On screen" windows use the same camera as render.mjs (eased CAM keys, copied below).
// Heart pulses are NOT listed (their sound comes from BEATS); the hearts' fade-ins are. Not listed: idle loops with no
// sound of their own (breathing, blinks, the slow ear sway, nodding flowers, the house windows dimming with the dawn
// grade). Entry: { t0, t1, kind, level, note }.
import { END, CAM, WORLD_W } from "../timeline.mjs";
import { ease, lerp } from "../cute.mjs";
import { T as MD, sniff, peekTwitch, earTwitch } from "./meadow.mjs";
import { T as GO } from "./gorge.mjs";

const M = [], add = (t0, t1, kind, level, note) => { if (t1 > t0) M.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, level, note }); };
const rise = (life) => life / 1.6;                       // cute pickup(): the text rises during the first 1/1.6 of its life
// render.mjs camera(): eased between CAM keys
function camera(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) }; }
const seen = (x, half, t) => { const cx = camera(t).cx; return [x, x + WORLD_W].some((xx) => xx + half > cx - 270 && xx - half < cx + 270); };
function windows(test, a = 0, b = END, dt = 1 / 240) {
  const out = []; let s = null;
  for (let i = 0, t = a; t <= b + 1e-9; i++, t = a + i * dt) { const v = test(Math.min(t, b)); if (v && s === null) s = t; else if (!v && s !== null) { out.push([s, t]); s = null; } }
  if (s !== null) out.push([s, b]); return out;
}
const dissolve = (w) => [w[0], w[0] + w[2]], dissolveOut = (w) => [w[1], w[1] + w[3]];

// ================================================================ heat rule (screen-space diagram during the pan)
add(...dissolve(MD.PANEL), "pop", "heat", "heat-rule panel dissolves in (after the cat's vet tag has gone)");
add(MD.COL[0][0], MD.COL[0][1], "pop", "heat", "a big round body and a small round body pop in (\"smaller bodies\")");
add(MD.COL[0][0], ...dissolveOut(MD.PANEL).slice(1), "shimmer", "heat", "red heat waves keep rising: slowly from the big body, fast from the small one");
add(MD.LBL[0][0], MD.LBL[0][1], "tag", "heat", "LOSES HEAT FASTER label dissolves in");
add(MD.ARROW[0][0], MD.ARROW[0][0] + MD.ARROW[0][1], "draw", "heat", "arrow 1 grows toward the flame (\"burn\")");
add(MD.COL[1][0], dissolveOut(MD.PANEL)[1], "zap", "heat", "a flame lights over a little apple and flickers until the panel goes");
add(MD.LBL[1][0], MD.LBL[1][1], "tag", "heat", "BURNS FOOD FASTER label dissolves in");
add(MD.ARROW[1][0], MD.ARROW[1][0] + MD.ARROW[1][1], "draw", "heat", "arrow 2 grows toward the heart");
add(MD.COL[2][0], MD.COL[2][1], "pop", "heat", "a pixel heart with speed lines pops in (a static icon, not a heartbeat)");
add(MD.LBL[2][0], MD.LBL[2][1], "tag", "heat", "PUMPS FASTER label dissolves in (\"pump\")");
add(...dissolveOut(MD.PANEL), "whoosh", "heat", "the heat-rule panel dissolves out before \"rabbit's\"");

// ================================================================ LV7 · rabbit
const rabbitOn = windows((t) => seen(MD.RABBIT.x, MD.RABBIT.half, t));
for (const [a, b] of rabbitOn) {
  // nose wiggles: inside each sniffing burst, one tick per 5 Hz wiggle (rise of the nose), same expression as the picture
  for (const [s0, s1] of windows((t) => sniff(t) > 0.05, a, b)) {
    const dt = 1 / 240; let up = null;
    for (let t = s0; t <= s1; t += dt) { const r = sniff(t + dt) > sniff(t); if (r && up === null) up = t; else if (!r && up !== null) { if (sniff(t) > 0.25) add(up, t, "tick", "rabbit", "the rabbit's nose wiggles up (sniffing burst)"); up = null; } }
  }
}
add(MD.EAR_UP[0], MD.EAR_UP[1], "tick", "rabbit", "the rabbit's left ear twitches up as 250 BPM appears");
add(MD.EAR_DOWN[0], MD.EAR_DOWN[1], "tick", "rabbit", "the left ear settles back");
for (const [a, b] of windows((t) => seen(MD.BURROW.x, MD.BURROW.half, t)))
  for (const [s0, s1] of windows((t) => peekTwitch(t) > 0, a, b)) add(s0, s1, "tick", "rabbit", "a second rabbit's ear twitches in the burrow");
add(MD.HEART_IN[0], MD.HEART_IN[1], "pop", "rabbit", "the rabbit's chest heart icon dissolves in (its beats come from BEATS)");
add(MD.PICKUP[0], MD.PICKUP[0] + rise(MD.PICKUP[1]), "pickup", "rabbit", `250 BPM rises beside the rabbit's ears (visible ${MD.PICKUP[1]} s)`);
void earTwitch;

// ================================================================ LV9 · gorge (blue-throated hummingbird)
for (const w of windows((t) => seen(GO.HB.x, GO.HB.half, t))) add(w[0], w[1], "buzz", "hummingbird", "blue-throated hummingbird wings: an intense blurred buzz (the bird jitters with its racing heart)");
for (const w of windows((t) => seen(GO.FALL.x, GO.FALL.half, t))) add(w[0], w[1], "splash", "hummingbird", "the waterfall pours into its pool (soft wave-like rush while on screen)");
add(GO.HEART_IN[0], GO.HEART_IN[1], "pop", "hummingbird", "the hummingbird's heart icon dissolves in (its 21 beats a second come from BEATS)");
add(GO.RACE[0], GO.RACE[0] + GO.RACE[2], "whoosh", "hummingbird", "speed lines start streaking past (\"race\")");
add(GO.RACE[0] + GO.RACE[2], GO.RACE[1] + GO.RACE[3], "whoosh", "hummingbird", "speed lines keep streaking past, then fade as the camera moves on");
add(GO.PICKUP[0], GO.PICKUP[0] + rise(GO.PICKUP[1]), "pickup", "hummingbird", `1,260 BPM rises above the hummingbird (visible ${GO.PICKUP[1]} s)`);

export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
