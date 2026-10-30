// 8-bit sound for «Rock-paper-scissors isn't luck»: every cue is synthesised (synth-core.mjs, frozen copy of
// shared/synth-core.mjs) and lasts exactly as long as its motion, on the same constants as the picture: the hand pumps
// (a swish per bob, a soft thud on the landing), each reveal (a pop over the pose crossfade, chalk-dust sparkle), chalk
// scratches as long as each line is written (timed by replaying the board), the scoreboard drop and digit rolls, the
// tags, the 360 pupils appearing, the coins, the bars growing, the circle's highlights, the arms sliding, the robot's
// whir and screen blips, the camera pans, the auction cards (drop, bob, flip), the girls' hop, the scissors' flight and
// snip, the gavel, and the follow card (tap, arpeggio, bell). Bed: a light chiptune in C major, ending on a V → I cadence.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, FPS, VOICE_END, ROUNDS, SCORE, ARMS, ROBOT, CAM } from "./timeline.mjs";
import { boardBack, CHALK_LOG, TAGS, HL } from "./board.mjs";
import { CARDS, FLY, CUT, GAVEL } from "./auction.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, sweep, swish, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const chalkScratch = (t, d, g = 1) => { noise(t, d, (u, tt) => 2600 + 1800 * Math.abs(Math.sin(tt * 37)), (u, tt) => (0.55 + 0.45 * Math.abs(Math.sin(tt * 23))) * Math.min(1, u / 0.1, (1 - u) / 0.15), 0.006 * g); };

// ---------------------------------------------------------------- the hands: pumps, reveals, the loser's switch
for (const r of ROUNDS) {
  if (r.change !== undefined) { swish(r.change, r.change + 0.24, 0.01); blip(r.change + 0.2, "E6", 0.05, 0.016, 0.25); continue; }
  const [a, b] = r.pumps, n = Math.max(1, Math.round((b - a) / 0.45)), step = (b - a) / n;
  for (let i = 0; i < n; i++) { const t0 = Math.max(0, a + i * step); if (t0 + step <= 0) continue;
    noise(t0, step, (u) => 900 + 1400 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u) * 0.8, 0.006);
    tone(sfx, a + (i + 1) * step - 0.02, 0.07, { wave: "tri", f: (u) => 150 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.05 }); }
  // the reveal: a pop over the 0.24 s crossfade, then the 0.5 s chalk-dust burst as a soft sparkle
  seq(r.at - 0.12, ["C6", "G6"], 0.12, { gain: 0.016, duty: 0.25, dur: 0.1 });
  for (let k = 0; k < 5; k++) blip(r.at + k * 0.1, NOTE(91 - k * 2), 0.05, 0.006 * (1 - k / 5), 0.125);
}
// ---------------------------------------------------------------- chalk on the board: replay the board once to log every written line
{ const c = new Canvas(540, 960, "#000"); for (let f = 0; f < Math.round(END * FPS); f += 1) boardBack(c, f / FPS, 0); }
for (const [t0, w, len] of CHALK_LOG.values()) chalkScratch(t0, w, len > 12 ? 1.1 : 0.8);
chalkScratch(EV.patterns - 0.15, 0.6, 1.2);                                                        // the circle is drawn
for (const [kind, , a] of HL) blip(a + 0.05, kind === "arrow" ? "A6" : "E6", 0.06, 0.014, 0.25);    // highlights
// the study: pupils appear in a wave (a rising count), coins pop on "for real money", the bars and STAY grow
for (let i = 0; i < 12; i++) blip(EV.three1 - 0.05 + (i / 12) * 1.3, NOTE(72 + ((i * 2) % 14)), 0.05, 0.008, 0.25);
for (let i = 0; i < 10; i++) { const t = EV.real - 0.1 + (i / 10) * 0.45; blip(t, "B6", 0.04, 0.009, 0.5); blip(t + 0.04, "E7", 0.08, 0.007, 0.25); }
for (let i = 0; i < 3; i++) { const tk = EV.each2 - 0.05 + i * 0.18; tone(sfx, tk, 0.55, { duty: 0.25, f: (u) => 300 + 500 * u, v: env(0.1, 0.2), gain: 0.008 }); }
tone(sfx, EV.half - 0.1, 0.5, { duty: 0.25, f: (u) => 330 + 660 * u, v: env(0.1, 0.2), gain: 0.012 }); seq(EV.half + 0.4, ["C6", "E6", "G6"], 0.06, { gain: 0.014, duty: 0.25 });
// the edge needle: a small sweep for each move, a wobble while it faces the robot
tone(sfx, EV.small - 0.1, 0.5, { duty: 0.125, f: (u) => 500 + 300 * u, v: env(0.1, 0.2), gain: 0.008 });
tone(sfx, EV.truly - 0.1, 0.5, { duty: 0.125, f: (u) => 800 - 300 * u, v: env(0.1, 0.2), gain: 0.008 });
tone(sfx, EV.bad - 0.05, 0.5, { duty: 0.125, f: (u) => 500 + 300 * u, v: env(0.1, 0.2), gain: 0.008 });
// ---------------------------------------------------------------- scoreboard: drop-in (0.45 s, lands with a clack), digit rolls, +1
swish(EV.use - 0.1, EV.use + 0.35, 0.008); noise(EV.use + 0.3, 0.05, () => 3000, (u) => 1 - u, 0.02); blip(EV.use + 0.3, "C5", 0.06, 0.02, 0.5);
for (let i = 1; i < SCORE.length; i++) { const t = SCORE[i][0]; for (let k = 0; k < 4; k++) blip(t + k * 0.08, "A5", 0.03, 0.01, 0.25); seq(t + 0.3, SCORE[i][1] > SCORE[i - 1][1] ? ["C6", "G6"] : ["E5", "C5"], 0.08, { gain: 0.02, duty: 0.25 }); }
// tags: a soft pop as each slides in (0.3 s)
for (const [, , t0] of TAGS) seq(t0 + 0.02, ["G5", "D6"], 0.05, { gain: 0.012, duty: 0.25 });
// ---------------------------------------------------------------- the arms slide out and in, the robot whirs and bleeps
for (const [a, b] of [ARMS.outA, ARMS.inA, ARMS.robotOut, ARMS.robotIn]) swish(a, b, 0.01);
tone(sfx, ROBOT.in[0], ROBOT.in[1] - ROBOT.in[0], { duty: 0.5, f: (u) => 180 + 220 * u, v: env(0.15, 0.2), gain: 0.012 });
tone(sfx, ROBOT.out[0], ROBOT.out[1] - ROBOT.out[0], { duty: 0.5, f: (u) => 400 - 220 * u, v: env(0.15, 0.2), gain: 0.012 });
{ const notes = ["C6", "G6", "E6", "A6", "D6", "B6", "F6", "C7"]; for (let t = ROBOT.in[0], i = 0; t < ROBOT.out[0]; t += 0.3, i++) blip(t, notes[(i * 5) % 8], 0.06, 0.007, 0.125); }
// ---------------------------------------------------------------- camera pans (whoosh for exactly the pan)
for (let i = 0; i < CAM.length - 1; i++) if (CAM[i].cx !== CAM[i + 1].cx && CAM[i + 1].t < END) { swish(CAM[i].t, CAM[i + 1].t, 0.014); sweep(CAM[i].t, CAM[i + 1].t, CAM[i + 1].cx > CAM[i].cx, 0.4, 200, 700); }
// ---------------------------------------------------------------- the auction room
seq(EV.y2005 - 0.08, ["E5", "B5"], 0.06, { gain: 0.014, duty: 0.25 });
{ const a = EV.paintings - 0.1, b = EV.made; for (let t = a; t < b; t += 0.16) blip(t, NOTE(84 + ((Math.round(t * 31) * 7) % 12)), 0.05, 0.004, 0.125); }
swish(EV.choose - 0.15, EV.choose + 0.25, 0.008); for (const k of [0, 1]) tone(sfx, EV.choose + 0.2 + k * 0.03, 0.08, { wave: "tri", f: (u) => 220 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.035 });
{ const d = EV.playEnd - EV.made + 0.15; for (let i = 0; i < 3; i++) blip(EV.made - 0.05 + ((i + 0.5) / 3) * d, ["C5", "E5", "G5"][i], 0.06, 0.016, 0.5); }
for (const K of [CARDS.L, CARDS.R]) { noise(K.flip, 0.32, (u) => 1200 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012); seq(K.glow[0] + 0.05, ["G5", "C6"], 0.07, { gain: 0.012, duty: 0.25 }); seq(K.flip + 0.3, K.face === "S" ? ["C6", "E6", "G6"] : ["A5", "C6", "E6"], 0.06, { gain: 0.016, duty: 0.25 }); }
for (const ph of [0, 0.12]) tone(sfx, EV.advice + ph, 0.35, { duty: 0.25, f: (u) => 500 + 600 * Math.sin(Math.PI * u), v: env(0.1, 0.3), gain: 0.01 });
seq(EV.eleven - 0.08, ["E6", "A6"], 0.05, { gain: 0.012, duty: 0.25 });
swish(FLY[0], FLY[1], 0.012); tone(sfx, FLY[0], FLY[1] - FLY[0], { duty: 0.25, f: (u) => 600 + 900 * Math.sin(Math.PI * u), v: env(0.15, 0.2), gain: 0.008 });
for (const k of [0, 0.11]) { noise(CUT + k, 0.04, () => 7000, (u) => 1 - u, 0.03); blip(CUT + k, "E7", 0.03, 0.012, 0.125); }
tone(sfx, CUT + 0.1, 0.45, { wave: "tri", f: (u) => 700 * Math.pow(0.4, u), v: (u) => 1 - u, gain: 0.02 });
noise(GAVEL, 0.06, () => 1800, (u) => 1 - u, 0.04); tone(sfx, GAVEL, 0.14, { wave: "tri", f: (u) => 260 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.07 });
seq(GAVEL + 0.08, ["C6", "E6", "G6", "C7"], 0.07, { gain: 0.016, duty: 0.25 });
// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: C major, 116 bpm, light in the study and the auction, full in the duels
const BPM = 116, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < EV.in2014 - 0.2 ? "full" : t < EV.but1 - 0.3 ? "soft" : t < EV.small - 0.3 ? "full" : t < EV.in2005 - 0.2 ? "tension" : t < EV.follow - 0.2 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;          // the bed proper ends one bar before the cadence bar
S.bedTrack({ prog: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], tensionProg: [[57, 60, 64], [64, 68, 71]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
// cadence: one bar of G7 (V) into a held C major (I) that rings to the end, then the core's short final fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [67, 71, 74, 77];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(43 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 72]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "chalk lines", CHALK_LOG.size, "end", END.toFixed(3));
