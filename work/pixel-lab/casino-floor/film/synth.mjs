// 8-bit sound for «Casinos don't hide the clocks to trap you»: every cue is synthesised (synth-core.mjs, frozen copy via
// casino-slots) from the same constants as the picture (timeline.mjs / scene.mjs): the clock dissolving and coming back with
// two ticks, the MYTH stamps, the ghost clock and windows crossed out, the hall dimming, the book sliding in and its page,
// the bubble pop, the O2 puffs hissing out of the vent (one bubble blip each), the air meter needle wobbling to NORMAL, the
// straight arrow and its thud on the slot wall, the dotted maze path ticking with a chime at every corner, the door row
// lighting up, the hero's steps (one per stride, only while he walks), the HOTEL / FOOD signs and routes, the machines
// pulsing, the scent swirls blowing, the faster music (one note + chip clack per bet, the metronome), the new casino: arch,
// floor shimmer, walls rising, daylight chord, palms popping, clock chime, the fast clock ticks while the sun sets, the
// machine presses, the cage bars rising, the camera moves and the follow card. Bed: the series' calm casino-lounge
// chiptune (Dm7 G7 Cmaj7 A7, swung, walking bass), cadence G7 → Cmaj7.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, CLOCK1, NOPE, BOOK, BUBBLE, AIR, ARROW, MAZE, DOORWAVE, ROUTES, SMELL, MUSIC, GROW, CALM, DUSK, CAGE, WALK1, WALK2 } from "./timeline.mjs";
import { heroAt, BETS, PRESSES, CORNERS } from "./scene.mjs";
import { PALMS, ARCH } from "./casino-house.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const clack = (t, g = 1, f = 3200) => { tone(sfx, t, 0.03, { wave: "noise", f: () => f, v: (u) => 1 - u, gain: 0.03 * g }); tone(sfx, t, 0.035, { wave: "tri", f: () => 1300, v: (u) => 1 - u, gain: 0.02 * g }); };
const thud = (t, g = 1, f = 110) => { tone(sfx, t, 0.12, { wave: "tri", f: (u) => f * (1 - 0.4 * u), v: (u) => 1 - u, gain: 0.06 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1800, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.014 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.01 * g }); };
const stampS = (t) => { thud(t + 0.12, 1.1, 95); clack(t + 0.12, 0.9, 2400); noise(t, 0.12, (u) => 800 + 2000 * u, (u) => u, 0.006); };
const wrong = (t, g = 1) => { blip(t, "D4", 0.1, 0.014 * g, 0.5); blip(t + 0.1, "C#4", 0.2, 0.012 * g, 0.5); };
const shimmer = (a, b, up, g = 1) => { const N = Math.max(3, Math.round((b - a) / 0.05)); for (let i = 0; i < N; i++) blip(a + (i / N) * (b - a), NOTE((up ? 76 + i * 2 : 96 - i * 2) % 100), 0.045, 0.006 * g, 0.125); };

// ---------------------------------------------------------------- 1. the clock myth
shimmer(CLOCK1.out0, CLOCK1.out1, false, 1.1); tone(sfx, CLOCK1.out0, CLOCK1.out1 - CLOCK1.out0, { duty: 0.125, f: (u) => 1600 - 1000 * u, v: env(0.1, 0.4), gain: 0.007 });
shimmer(CLOCK1.back0, CLOCK1.back1, true, 1.1); tick(CLOCK1.back1 + 0.05, 1.2, true); tick(CLOCK1.back1 + 0.55, 1.1, false);
stampS(CLOCK1.stamp);
// the old hall dims; no clocks, no windows: ghost outlines crossed out
tone(sfx, NOPE.dim0, NOPE.dim1 - NOPE.dim0 + 0.3, { wave: "tri", f: (u) => 150 - 60 * u, v: env(0.1, 0.4), gain: 0.03 }); tone(sfx, NOPE.dim0, NOPE.dim1 - NOPE.dim0 + 0.3, { duty: 0.25, f: (u) => 480 - 300 * u, v: env(0.1, 0.4), gain: 0.008 });
shimmer(NOPE.clock, NOPE.clock + 0.35, false, 0.8); wrong(NOPE.clock + 0.25);
pop(NOPE.win, 0.8); wrong(NOPE.win + 0.3, 0.9);
// the book slides in, the cover flips; the player's bubble pops
swish(BOOK.in, BOOK.in + 0.35, 0.01); noise(BOOK.open, 0.32, (u) => 2500 + 3500 * u, (u) => Math.sin(Math.PI * u), 0.012); tone(sfx, BOOK.open + 0.28, 0.05, { wave: "noise", f: () => 1500, v: (u) => 1 - u, gain: 0.02 });
pop(BUBBLE.in, 1.2); seq(BUBBLE.in + 0.08, ["A5", "D6"], 0.07, { gain: 0.01, duty: 0.25 });
swish(BOOK.out, BOOK.out + 0.35, 0.006);
// ---------------------------------------------------------------- 2. the air: puffs, meter, MYTH
noise(AIR.puff0, AIR.puff1 - AIR.puff0, (u) => 3000 + 1500 * Math.sin(u * 20), (u) => Math.min(1, u * 6, (1 - u) * 3) * 0.8, 0.008);
for (let i = 0; i < 10; i++) { const t0 = AIR.puff0 + i * 0.16; tone(sfx, t0 + 0.05, 0.07, { wave: "tri", f: (u) => 420 + 60 * (i % 4) + 900 * u, v: (u) => 1 - u, gain: 0.018 }); }
pop(AIR.meter, 1.1);
tone(sfx, AIR.needle, AIR.read - AIR.needle + 0.15, { duty: 0.25, f: (u, tt) => 600 + 220 * Math.sin(tt * 7) * Math.exp(-tt * 1.6), v: env(0.05, 0.3), gain: 0.007 });
seq(AIR.read, ["C6", "E6", "G6"], 0.07, { gain: 0.013, duty: 0.25 });
stampS(AIR.stamp);
// the real tricks are quieter: the hall warms back up
tone(sfx, NOPE.undim0, NOPE.undim1 - NOPE.undim0, { wave: "tri", f: (u) => 110 + 80 * u, v: env(0.2, 0.4), gain: 0.025 });
// ---------------------------------------------------------------- 3. the straight arrow, the maze path
noise(ARROW.t0, ARROW.hit - ARROW.t0, (u) => 1500 + 3000 * u, (u) => u, 0.008); tone(sfx, ARROW.t0, ARROW.hit - ARROW.t0, { duty: 0.25, f: (u) => 300 + 500 * u, v: env(0.1, 0.1), gain: 0.008 });
thud(ARROW.hit, 1.2, 90); clack(ARROW.hit, 0.8, 2000); wrong(ARROW.hit + 0.12, 1.1);
{ let last = -1; for (let t = MAZE.t0; t < MAZE.t1; t += 1 / 60) { const u = Math.floor(((t - MAZE.t0) / (MAZE.t1 - MAZE.t0)) * 40); if (u !== last && u % 2 === 0) tick(t, 0.5, u % 4 === 0); last = u; } }
{ const notes = ["C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7"]; CORNERS.forEach((cn, i) => { blip(cn.t, notes[i % 8], 0.09, 0.012, 0.25); blip(cn.t + 0.06, notes[(i + 2) % 8], 0.12, 0.008, 0.125); }); }
// ---------------------------------------------------------------- 4. the door row, the hero's steps
for (let i = 0; i < 8; i++) blip(DOORWAVE.t0 + i * 0.09, NOTE(72 + [0, 4, 7, 12, 16, 19, 24, 28][i]), 0.08, 0.01, 0.25);
for (const wk of [WALK1, WALK2]) { let lastStep = -1; for (let t = wk.t0; t < wk.t1; t += 1 / 120) { const h = heroAt(t); if (!h.moving || h.speed < 20) continue; const k = Math.floor(h.s / 60); if (k !== lastStep) { if (lastStep >= 0) tone(sfx, t, 0.035, { wave: "noise", f: () => (k % 2 ? 900 : 700), v: (u) => 1 - u, gain: 0.011 }); lastStep = k; } } }
// ---------------------------------------------------------------- 5. HOTEL / FOOD, past the machines
pop(ROUTES.room, 1.1); seq(ROUTES.room + 0.06, ["E6", "B6"], 0.07, { gain: 0.012, duty: 0.25 });
pop(ROUTES.food, 1.1); seq(ROUTES.food + 0.06, ["D6", "A6"], 0.07, { gain: 0.012, duty: 0.25 });
for (const [a, g] of [[ROUTES.room, 1], [ROUTES.food, 0.8]]) for (let t = a; t < a + 1.6; t += 0.1) tick(t, 0.35 * g, true);
for (let i = 0; i < 6; i++) blip(ROUTES.past + i * 0.18, NOTE([84, 88, 91, 88, 84, 91][i]), 0.06, 0.009, 0.125);
// ---------------------------------------------------------------- 6. the smell blown through the air
noise(SMELL.t0, SMELL.t1 - SMELL.t0, (u) => 1200 + 900 * Math.sin(u * 9), (u, tt) => Math.min(1, tt / 0.6, (SMELL.t1 - SMELL.t0 - tt) / 0.6) * (0.5 + 0.5 * (SMELL.t0 + tt > SMELL.blown ? 1 : 0.4)), 0.006);
for (let k = 0; k < 9; k++) { const t = SMELL.t0 + 0.3 + k * 0.42; if (t < SMELL.t1 - 0.3) blip(t, NOTE([93, 96, 91, 98, 95, 100, 93, 97, 99][k]), 0.12, 0.004, 0.125); }
// ---------------------------------------------------------------- 7. faster music → faster bets
BETS.forEach((tb, i) => { blip(tb - 0.04, NOTE([72, 76, 79, 81, 84, 86, 88, 91, 93, 96][i % 10]), Math.max(0.06, 0.16 - i * 0.012), 0.016, 0.25); clack(tb + 0.03, 0.7, 4200); tick(tb - 0.2, 0.6, i % 2 === 0); });
// ---------------------------------------------------------------- 8. the new casino grows
tone(sfx, GROW.arch0, GROW.arch1 - GROW.arch0, { wave: "noise", f: () => 300, v: env(0.2, 0.3), gain: 0.012 }); tone(sfx, GROW.arch0, GROW.arch1 - GROW.arch0, { wave: "tri", f: (u) => 70 + 30 * u, v: env(0.2, 0.3), gain: 0.03 });
shimmer(GROW.floor0, GROW.floor1, true, 1.0);
tone(sfx, GROW.walls0, GROW.walls1 - GROW.walls0, { duty: 0.25, f: (u) => 180 * Math.pow(2, u * 1.6), v: env(0.1, 0.25), gain: 0.012 }); tone(sfx, GROW.walls0, GROW.walls1 - GROW.walls0, { wave: "tri", f: (u) => 90 * Math.pow(2, u * 1.6), v: env(0.1, 0.25), gain: 0.03 });
seq(GROW.day0, ["C6", "E6", "G6", "B6", "D7"], 0.07, { gain: 0.012, duty: 0.25 }); tone(sfx, GROW.day0 + 0.3, 0.5, { duty: 0.125, f: () => n("G6"), v: (u) => 1 - u, gain: 0.006 });
PALMS.forEach((p, i) => pop(GROW.plants0 + (GROW.plants1 - GROW.plants0) * (i * 0.06 + 0.25), 0.7));
tick(GROW.clocks0 + 0.1, 1.2, true); tick(GROW.clocks0 + 0.4, 1.1, false); blip(GROW.clocks1 - 0.05, "G6", 0.25, 0.01, 0.25); blip(GROW.clocks1 + 0.15, "C7", 0.35, 0.009, 0.25);
// calm: a soft sigh-like rise
tone(sfx, CALM.t0 + 0.1, 0.9, { wave: "tri", f: (u) => 330 + 110 * u, v: env(0.3, 0.5), gain: 0.012 });
// ---------------------------------------------------------------- 9. dusk: the clocks run, the hero keeps playing
{ const hours = (t) => 5.6 * Math.max(0, Math.min(1, (t - DUSK.t0) / (DUSK.t1 - DUSK.t0 + 0.4))); let last = 0; for (let t = DUSK.t0; t < DUSK.t1 + 0.4; t += 1 / 240) { const m = Math.floor(hours(t) * 4); if (m !== last) { tick(t, 0.45, m % 2 === 0); last = m; } } }
tone(sfx, DUSK.t0 + 0.5, DUSK.t1 - DUSK.t0, { wave: "tri", f: (u) => 440 * Math.pow(2, -u * 0.7), v: env(0.2, 0.3), gain: 0.01 });
PRESSES.forEach((tp, i) => { clack(tp, 0.6, 2600); for (let k = 0; k < 4; k++) tone(sfx, tp + 0.08 + k * 0.08, 0.05, { duty: 0.25, f: () => NOTE(79 + ((i + k) % 3) * 4), v: (u) => 1 - u, gain: 0.006 }); });
// ---------------------------------------------------------------- 10. the cage
tone(sfx, CAGE.t0, 0.9, { duty: 0.125, f: (u) => 200 * Math.pow(2, u * 2), v: env(0.1, 0.2), gain: 0.008 }); for (let k = 0; k < 6; k++) tick(CAGE.t0 + k * 0.15, 0.6, true);
clack(CAGE.t0 + 0.92, 1.1, 1800); thud(CAGE.t0 + 0.92, 0.7, 140);
// camera moves
whoosh(EV.quieter - 0.6, EV.pathEnd - 0.2, true, 0.35); whoosh(EV.games - 0.5, EV.door - 0.2, false, 0.3); whoosh(EV.often - 0.2, EV.room - 0.2, true, 0.3);
whoosh(EV.test - 0.3, EV.faster1, false, 0.3); whoosh(EV.then - 0.2, EV.high - 0.2, true, 0.3); whoosh(EV.trap2 - 0.3, EV.nicerEnd + 0.3, true, 0.3);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: calm casino-lounge chiptune, swung, 92 bpm (Dm7 G7 Cmaj7 A7), same as films 1–2
const BPM = 92, BEAT = 60 / BPM, BAR = 4 * BEAT, SW = 0.62;
const PROG = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]];
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
const quiet = (t) => (t > MUSIC.t0 && t < MUSIC.t1 ? 0.55 : 1);                 // the faster tune takes over at the table
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4];
  const walk = [ch[0], ch[1], ch[2], ch[1]].map((m) => m - 12);
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.8, { wave: "tri", f: () => NOTE(walk[b]), v: (u) => 1 - 0.5 * u, gain: 0.085 * quiet(t0 + b * BEAT) });
  for (const b of [1, 3]) for (const m of ch.slice(1)) tone(bed, t0 + b * BEAT + (b === 3 ? BEAT * (SW - 0.5) : 0), BEAT * 0.35, { duty: 0.125, f: () => NOTE(m + 12), v: (u) => 1 - 0.8 * u, gain: 0.011 * quiet(t0 + b * BEAT) });
  for (let e = 0; e < 8; e++) { const t = t0 + Math.floor(e / 2) * BEAT + (e % 2 ? BEAT * SW : 0); tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: (e % 2 ? 0.006 : 0.009) * quiet(t) }); }
  if (bar % 2 === 1 && quiet(t0 + 2 * BEAT) === 1) { const mel = [ch[3] + 24, ch[2] + 24, ch[1] + 24]; mel.forEach((m, i) => tone(bed, t0 + (2 + i * 0.5) * BEAT + (i % 2 ? BEAT * (SW - 0.5) : 0), BEAT * 0.45, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.03 })); }
}
// the faster tune at the table: a bright arpeggio whose step shrinks with the bets
{ const arp = [62, 65, 69, 72, 74, 72, 69, 65]; let t = MUSIC.t0, i = 0; while (t < MUSIC.t1 - 0.1) { const k = clamp01((t - MUSIC.t0) / (MUSIC.t1 - MUSIC.t0)), step = 0.24 - 0.15 * k; tone(bed, t, step * 0.8, { duty: 0.25, f: () => NOTE(arp[i % 8] + 12), v: (u) => 1 - 0.6 * u, gain: 0.016 * Math.min(1, (t - MUSIC.t0) / 0.3, (MUSIC.t1 - t) / 0.3) }); if (i % 2 === 0) tone(bed, t, step * 0.9, { wave: "tri", f: () => NOTE(arp[i % 8] - 12), v: (u) => 1 - 0.5 * u, gain: 0.05 * Math.min(1, (MUSIC.t1 - t) / 0.3) }); t += step; i++; } }
// cadence: G7 → Cmaj7 held under the follow card, then the core's soft final chord and fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, G7 = [55, 59, 62, 65];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.125, f: () => NOTE(G7[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.014 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.8, { wave: "tri", f: () => NOTE(43 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.085 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 71]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
void ARCH;
