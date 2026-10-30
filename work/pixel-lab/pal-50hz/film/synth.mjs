// 8-bit sound for «In Europe, your games ran slower»: every cue is synthesised (synth-core.mjs, frozen copy via crt/film)
// from the same constants as the picture (timeline/game/room/overlays): the hedgehogs' footsteps (one tick per running
// cycle, from each game's own step clock, so the Europe steps are 5/6 as fast), the race bar, «17% SLOWER», the mains
// hum of the two waves (240 vs 200 Hz, ratio 6:5, as long as the waves), 60 HZ / 50 HZ, the film-strip ticks (one per new
// picture), the 1-second counts, 1991, SLOWER, the two little tunes at their own tempos (the bed rests meanwhile), the
// game clocks, the fast-forward, the GOAL chimes, the black bars squash, the push into the Europe room, the bubble, the
// cartridges and their tags, the screwdriver, lid, switch drop and click, the white console swap, the menu, «1999» and
// the follow card. Not original game sounds. Bed: a light chiptune in C major ending on G7 → C. Writes audio/sfx.wav, bed.wav.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, RACE, WAVE, HZ, STRIP, Y91, SLOW, NOTES, CLK, FF, WATCH, ACT2, BARS, KID, CARTS, MOD, DC } from "./timeline.mjs";
import { scroll, GOAL_T } from "./game.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { noteTimes } from "./overlays.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };

// ---------------------------------------------------------------- footsteps: one soft tick per run cycle (12.8 level px), each game's own clock
const STEP_WIN = [[0, RACE.out1], [EV.sonic2 - 0.2, EV.music - 0.1], [MOD.back1 - 0.6, DC.in0]];
for (const side of ["L", "R"]) { let last = scroll(side, 0); const dt = 1 / 240;
  for (let t = 0; t < END - 0.5; t += dt) { const s = scroll(side, t); if (Math.floor(s / 12.8) !== Math.floor(last / 12.8) && STEP_WIN.some(([a, b]) => t >= a && t < b)) tone(sfx, t, 0.03, { wave: "noise", f: () => (side === "L" ? 5600 : 4800), v: (u) => 1 - u, gain: 0.008 }); last = s; } }

// ---------------------------------------------------------------- hook: race bar, 17% SLOWER
swish(RACE.in, RACE.in + 0.35, 0.01); swish(RACE.out0, RACE.out1, 0.006);
pop(EV.seventeen - 0.12); blip(EV.seventeen - 0.05, "E5", 0.1, 0.012, 0.5); blip(EV.seventeen + 0.08, "C5", 0.16, 0.012, 0.5);

// ---------------------------------------------------------------- the waves: a soft mains hum each (6 : 5), exactly as long as the waves are on
for (const [f, g] of [[240, 0.006], [200, 0.006]]) tone(sfx, WAVE.in, WAVE.out - WAVE.in, { duty: 0.5, f: () => f, v: env(0.08, 0.08), gain: g });
pop(HZ.l); blip(HZ.l + 0.05, "G5", 0.12, 0.014, 0.25); pop(HZ.r); blip(HZ.r + 0.05, "E5", 0.12, 0.014, 0.25);

// ---------------------------------------------------------------- film strips: a tick per new picture; the 1-second counts
swish(STRIP.in, STRIP.in + 0.35, 0.008);
for (const [per, f] of [[0.4, 2600], [0.48, 2200]]) for (let t = STRIP.in + per; t < STRIP.out - 0.4; t += per) tone(sfx, t, 0.025, { duty: 0.125, f: () => f, v: (u) => 1 - u, gain: 0.006 });
tone(sfx, STRIP.count0, 1.0, { duty: 0.25, f: (u) => 600 + 900 * u, v: env(0.05, 0.1), gain: 0.007 });
blip(STRIP.count0 + 1.0, "C6", 0.12, 0.014, 0.25); blip(STRIP.count0 + 1.0, "A5", 0.12, 0.01, 0.25);
swish(STRIP.out - 0.35, STRIP.out, 0.006);

// ---------------------------------------------------------------- 1991, SLOWER
pop(Y91.in); blip(Y91.in + 0.05, "C6", 0.08, 0.01, 0.25);
pop(SLOW.in); blip(SLOW.in + 0.05, "E4", 0.14, 0.014, 0.5); blip(SLOW.in + 0.2, "C4", 0.2, 0.014, 0.5);

// ---------------------------------------------------------------- the two little tunes: one note per visible note, each at its own tempo
const MEL = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5], SCALE = [72, 74, 76, 77, 79, 81];
for (const side of ["L", "R"]) noteTimes(side).forEach((t, i) => tone(sfx, t, 0.16, { duty: side === "L" ? 0.25 : 0.25, f: () => NOTE(SCALE[MEL[i % MEL.length]]), v: (u) => 1 - 0.8 * u, gain: 0.014 }));

// ---------------------------------------------------------------- game clocks, fast-forward, goals, real stopwatches
pop(CLK.in); blip(CLK.in + 0.08, "A5", 0.06, 0.01, 0.25); blip(CLK.in + 0.3, "A5", 0.06, 0.01, 0.25);
swish(WATCH.in, WATCH.in + 0.35, 0.01);
tone(sfx, FF.a, GOAL_T.R + 0.15 - FF.a, { duty: 0.125, f: (u) => 300 + 1300 * Math.min(1, u * 3), v: env(0.05, 0.15), gain: 0.008 });   // tape spin-up
noise(FF.a, GOAL_T.R + 0.15 - FF.a, () => 6000, env(0.1, 0.2), 0.004);
for (const [t, notes] of [[GOAL_T.L, ["C6", "E6", "G6"]], [GOAL_T.R, ["A5", "C6", "E6"]]]) seq(t, notes, 0.07, { gain: 0.016, duty: 0.25 });
blip(ACT2, "G5", 0.06, 0.01, 0.25);
swish(WATCH.out - 0.3, WATCH.out, 0.006);

// ---------------------------------------------------------------- black bars: the picture squashes (a falling tone exactly as long), BLACK BARS
tone(sfx, BARS.squash0, BARS.squash1 - BARS.squash0, { wave: "tri", f: (u) => 520 - 200 * u, v: env(0.2, 0.3), gain: 0.02 });
pop(BARS.in0); blip(BARS.in0 + 0.05, "D5", 0.1, 0.012, 0.5);

// ---------------------------------------------------------------- the Europe room: push in, the bubble, the cartridges
whoosh(KID.in, KID.in + 1.0, true, 0.8);
pop(EV.kids - 0.05); seq(EV.kids + 0.15, ["E6", "G6"], 0.08, { gain: 0.012, duty: 0.25 });
swish(CARTS.in, CARTS.in + 0.45, 0.01);
for (const t of CARTS.ok) seq(t, ["C6", "G6"], 0.06, { gain: 0.014, duty: 0.25 });
for (const t of CARTS.no) { blip(t, "D4", 0.1, 0.014, 0.5); blip(t + 0.1, "C4", 0.14, 0.012, 0.5); }
swish(CARTS.out - 0.4, CARTS.out, 0.006);

// ---------------------------------------------------------------- the 60 switch: push to the console, screwdriver, lid, the switch drops in, click, close, pull back
whoosh(MOD.cam0, MOD.cam1, true, 0.8);
for (let t = MOD.screw0; t < MOD.screw1 - 0.05; t += 0.09) tone(sfx, t, 0.05, { wave: "noise", f: () => 3000, v: (u) => 1 - u, gain: 0.006 });
tone(sfx, MOD.lid0, MOD.lid1 - MOD.lid0, { wave: "tri", f: (u) => 300 + 260 * Math.sin(Math.PI * u), v: env(0.2, 0.3), gain: 0.012 });   // creak
tone(sfx, MOD.sw0, MOD.sw1 - MOD.sw0, { duty: 0.25, f: (u) => 900 - 500 * u, v: env(0.1, 0.2), gain: 0.008 });                          // the switch drops in
tone(sfx, MOD.sw1, 0.06, { wave: "tri", f: () => 180, v: (u) => 1 - u, gain: 0.03 });
tone(sfx, MOD.click, 0.03, { wave: "noise", f: () => 4200, v: (u) => 1 - u, gain: 0.04 }); blip(MOD.click, "E6", 0.04, 0.018, 0.25);
tone(sfx, MOD.click + 0.05, 0.4, { duty: 0.25, f: (u) => 500 * Math.pow(1.2, u * 4), v: env(0.1, 0.3), gain: 0.008 });                 // the game speeds up to 60
tone(sfx, MOD.lidClose0, MOD.lidClose1 - MOD.lidClose0, { wave: "tri", f: (u) => 420 - 160 * u, v: env(0.2, 0.3), gain: 0.01 }); tone(sfx, MOD.lidClose1, 0.06, { wave: "tri", f: () => 150, v: (u) => 1 - u, gain: 0.03 });
whoosh(MOD.back0, MOD.back1, false, 0.8);

// ---------------------------------------------------------------- the white «1999» console, its menu
swish(DC.in0, DC.in1, 0.01);
tone(sfx, DC.menu0, 0.3, { duty: 0.25, f: (u) => 400 * Math.pow(3, u), v: env(0.1, 0.4), gain: 0.01 });
blip(DC.yes, "C6", 0.05, 0.016, 0.25); blip(DC.yes + 0.07, "G6", 0.08, 0.016, 0.25);
pop(DC.tag);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: C major (C Am F G), 112 bpm; rests while the two tunes play
const BPM = 112, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < RACE.out1 ? "full" : t < NOTES.in - 0.3 ? "light" : t < NOTES.out + 0.3 ? "mute" : t < FF.a - 0.2 ? "light" : t < ACT2 ? "tension" : t < MOD.cam0 ? "light" : t < MOD.back0 ? "soft" : t < EV.follow - 0.2 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], tensionProg: [[57, 60, 64], [52, 55, 59]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [55, 59, 62, 65];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(43 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 72]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
