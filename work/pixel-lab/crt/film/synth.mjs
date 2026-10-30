// 8-bit sound for «Old games really did look better on old TVs»: every cue is synthesised (synth-core.mjs, frozen copy
// via breakout/film) from the same constants as the picture (timeline/room/overlays): the hedgehog's footsteps while
// the level scrolls (and the skid as it stops), camera pushes and pull-backs, the electron beam (one soft buzz per painted
// line, as long as the line), RED · GREEN · BLUE, the two glows rising, the waterfall frame, the lens opening and the
// WATER / BACK column ticks, the stripes melting (a sweep exactly as long as the melt), the quote, the checkerboard melts,
// the flat screen sliding in and powering on, the loupes, the CRT FILTER switch, the COLLECTORS tag, SAME GAME and the
// follow card. Not original game sounds. Bed: a light chiptune in C major ending on G7 → C. Writes audio/sfx.wav, bed.wav.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, RUN, MACRO, SWEEP, BLURDEMO, WF, LENS, QUOTE, CHECK, WIDE, FLAT, LOUPE, FILTER, COLL, ENDW } from "./timeline.mjs";
import { scroll } from "./game.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const melt = (a, b, g = 1) => { tone(sfx, a, b - a, { wave: "tri", f: (u) => 330 * Math.pow(2, u), v: env(0.2, 0.3), gain: 0.03 * g }); tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 660 * Math.pow(2, u) * (1 + 0.01 * Math.sin(tt * 40)), v: env(0.2, 0.3), gain: 0.006 * g }); };

// ---------------------------------------------------------------- the game: footsteps while the level scrolls, the skid as the hedgehog stops
{ let last = scroll(0); const dt = 1 / 240;
  for (let t = 0; t < END - 0.5; t += dt) { const s = scroll(t); if (Math.floor(s / 6.4) !== Math.floor(last / 6.4) && (t < RUN.stop || t > RUN.resume)) tone(sfx, t, 0.03, { wave: "noise", f: () => 5200, v: (u) => 1 - u, gain: t > RUN.resume ? 0.006 : 0.01 }); last = s; } }
noise(RUN.decel + 0.4, RUN.stop - RUN.decel - 0.4, (u) => 3600 - 2400 * u, (u) => Math.min(1, u * 4) * (1 - u), 0.012);

// ---------------------------------------------------------------- the macro: push in, the beam paints 32 lines, RGB, the two glows, pull back
whoosh(MACRO.in0, MACRO.in1, true, 1.1);
{ const ROWS = 41, rd = (SWEEP.b - SWEEP.a) / ROWS;
  for (let r = 0; r < ROWS; r++) { const t = SWEEP.a + r * rd; tone(sfx, t, rd * 0.92, { duty: 0.125, f: (u) => 1400 + 500 * u, v: (u) => 0.55 + 0.45 * (1 - u), gain: 0.0035 }); } }
pop(EV.beam - 0.05);
for (const [t, note] of [[EV.red, "C6"], [EV.green, "E6"], [EV.blue, "G6"]]) blip(t - 0.08, note, 0.12, 0.016, 0.25);
pop(BLURDEMO.a, 0.9); tone(sfx, EV.blurred - 0.1, EV.together + 0.3 - EV.blurred, { wave: "tri", f: (u) => 260 + 260 * u, v: env(0.3, 0.3), gain: 0.03 }); pop(EV.together - 0.1);
whoosh(MACRO.out0, MACRO.out1, false); pop(EV.artists2 - 0.05, 0.7);

// ---------------------------------------------------------------- the waterfall: frame, push in, NO SEE-THROUGH, the lens, WATER / BACK, the melt
pop(EV.waterfalls - 0.1); blip(EV.waterfalls, "A5", 0.08, 0.01, 0.25);
swish(WF.in0, WF.in1, 0.01);
blip(EV.couldnt - 0.1, "E4", 0.12, 0.02, 0.5); blip(EV.couldnt + 0.04, "C4", 0.18, 0.02, 0.5);
swish(LENS.in, LENS.in + 0.4, 0.012); tone(sfx, LENS.in + 0.38, 0.03, { wave: "tri", f: () => 1200, v: (u) => 1 - u, gain: 0.02 });
for (const [t, note] of [[EV.water2, "E6"], [EV.back1, "A5"], [EV.water3, "E6"], [EV.back2, "A5"]]) blip(t - 0.05, note, 0.06, 0.014, 0.25);
melt(LENS.melt0, LENS.melt1); seq(LENS.melt1, ["C6", "E6"], 0.07, { gain: 0.012, duty: 0.25 });
swish(LENS.out, LENS.out + 0.35, 0.006);
whoosh(WF.out0, WF.out1, false, 0.8);

// ---------------------------------------------------------------- quote, checkerboards
swish(QUOTE.in, QUOTE.in + 0.35, 0.01); pop(QUOTE.in + 0.15); blip(EV.said - 0.1, "G5", 0.1, 0.01, 0.25); blip(EV.naoto - 0.1, "C6", 0.1, 0.01, 0.25);
swish(QUOTE.out - 0.3, QUOTE.out, 0.006);
swish(CHECK.in, CHECK.in + 0.35, 0.01);
melt(CHECK.m1, CHECK.m1 + 0.6, 0.8); pop(CHECK.m1 + 0.2); melt(CHECK.m2, CHECK.m2 + 0.6, 0.8); pop(CHECK.m2 + 0.2);
swish(CHECK.out - 0.3, CHECK.out, 0.006);

// ---------------------------------------------------------------- the wide room: pull back, the flat screen slides in and turns on
whoosh(WIDE.a, WIDE.b, false);
swish(FLAT.in0, FLAT.in1, 0.012); tone(sfx, FLAT.in1 - 0.05, 0.05, { wave: "tri", f: () => 180, v: (u) => 1 - u, gain: 0.03 });
tone(sfx, FLAT.on, 0.45, { duty: 0.25, f: (u) => 400 * Math.pow(3, u), v: env(0.1, 0.4), gain: 0.012 }); blip(FLAT.on + 0.42, "C7", 0.05, 0.01, 0.25);
// loupes: open, pan to the waterfall, tags; close
seq(LOUPE.in, ["G5", "C6"], 0.08, { gain: 0.014, duty: 0.25 }); swish(LOUPE.in, LOUPE.in + 0.4, 0.008);
pop(EV.hard - 0.1); swish(LOUPE.pan0, LOUPE.pan1, 0.008); pop(EV.stay - 0.1); pop(EV.stay, 0.8);
swish(LOUPE.out, LOUPE.out + 0.35, 0.007);
// CRT FILTER: the switch, then the flat picture melts into the CRT pass (as long as the dissolve)
pop(FILTER.in); tone(sfx, FILTER.flip0, 0.03, { wave: "noise", f: () => 4000, v: (u) => 1 - u, gain: 0.03 }); blip(FILTER.flip0, "E6", 0.04, 0.016, 0.25);
melt(FILTER.flip0 + 0.02, FILTER.flip1, 0.9);
// COLLECTORS tag swings on its string (a small squeak per swing), SAME GAME
pop(COLL.in); for (let k = 0; k < 3; k++) tone(sfx, COLL.in + 0.1 + k * 0.63, 0.12, { wave: "tri", f: (u) => 1300 + 300 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.008 * (1 - k * 0.3) });
pop(EV.game2 - 0.05); whoosh(ENDW.a, ENDW.b, false, 0.5);
swish(FILTER.out - 0.3, FILTER.out, 0.005);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: C major (C Am F G), 112 bpm
const BPM = 112, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < MACRO.in0 - 0.2 ? "full" : t < MACRO.out0 ? "soft" : t < EV.so2 - 0.2 ? "light" : t < LENS.melt1 ? "tension" : t < CHECK.out ? "light" : t < EV.thats - 0.2 ? "full" : t < EV.follow - 0.2 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], tensionProg: [[57, 60, 64], [52, 55, 59]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [55, 59, 62, 65];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(43 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 72]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
