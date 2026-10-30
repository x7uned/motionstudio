// 8-bit sound for «How strong is Minecraft Steve in our world» (IN OUR WORLD #1): every cue is synthesised (synth-core.mjs,
// frozen copy via ed138) from the same constants as the picture (scene.mjs / cta.mjs) and lasts its motion: the portal hum
// and its collapse, the landing, the cup, the tape and the wire cube, footsteps from the gait phase, punch thuds and crack
// ticks, the log / concrete breaking and the item «plips», the timers, the vault door and the rolling cart, the scale's
// clunks, elephant steps, the strongman's strain, the ×40 count, slot clicks, counter ticks, the towers and piles rising,
// the speedometer, the box lid, the box flying into its slot, the leg lift, the heavy asphalt crunch and the sinking,
// the hazard blinks, NEXT and the follow card. film2 adds the city bus passing in the wide shot and the pigeons
// flapping up when the street breaks. Bed: a light curious chiptune (C Am F G, 104 bpm), a short music pause
// before «Our world has weight», back on the crunch, cadence G → C under the follow card.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { END, VOICE_END } from "./timeline.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { E, PUNCH1, PUNCH2, LIFT, STEP, LOG_FLY, CON_FLY, VAULT, CART, ELE, STRONG_KEYS, INV, TOSLOT, BOX, COUNT, EIF_T, PILE_T, RUN, SPEED, CRACK_T, NEXT_T, PORTAL_KEYS, gaitAt, steveAt, tiltAt } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const plip = (t, g = 1) => { tone(sfx, t, 0.09, { duty: 0.25, f: (u) => 880 * Math.pow(2, u), v: (u) => 1 - u, gain: 0.014 * g }); };
const chime = (t, notes, g = 1, step = 0.07) => seq(t, notes, step, { gain: 0.013 * g, duty: 0.25 });
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.012 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.008 * g }); };
const thud = (t, g = 1, f0 = 130) => { tone(sfx, t, 0.14, { wave: "tri", f: (u) => f0 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.07 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1200, v: (u) => 1 - u, gain: 0.02 * g }); };
const step = (t, g = 1) => { tone(sfx, t, 0.05, { wave: "noise", f: () => 900, v: (u) => 1 - u, gain: 0.016 * g }); tone(sfx, t, 0.06, { wave: "tri", f: (u) => 160 - 60 * u, v: (u) => 1 - u, gain: 0.03 * g }); };
const creak = (a, b, g = 1, f0 = 180, f1 = 240) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => f0 + (f1 - f0) * u + 12 * Math.sin(tt * 55), v: env(0.15, 0.3), gain: 0.01 * g });
const rumble = (a, b, g = 1, f = 500) => noise(a, b - a, () => f, env(0.12, 0.25), 0.012 * g);

// ---------------------------------------------------------------- the portal, the landing, the cup, the plate
{ const close = PORTAL_KEYS[1][0]; tone(sfx, 0, close + 0.8, { wave: "tri", f: (u, tt) => 62 + 6 * Math.sin(tt * 3.1), v: (u) => (1 - Math.max(0, (u * (close + 0.8) - close) / 0.8)), gain: 0.05 });
  tone(sfx, 0, close + 0.8, { duty: 0.125, f: (u, tt) => 124 + 10 * Math.sin(tt * 4.3), v: (u) => 0.6 * (1 - Math.max(0, (u * (close + 0.8) - close) / 0.8)), gain: 0.006 });
  sweep(close, close + 0.8, false, 0.6, 140, 900); }
swish(0, 0.82, 0.01); thud(0.86, 1.2, 110); noise(0.86, 0.5, () => 2400, (u) => 1 - u, 0.008);
tick(0.74, 0.8, false); noise(0.76, 0.18, () => 3000, (u) => 1 - u, 0.006);              // the cup hits the pavement
pop(0.35, 0.9);
tick(E.lets + 0.15, 0.6); tick(E.check - 0.3, 0.6);                                          // the head turns in two steps
// ---------------------------------------------------------------- tape and wire cube
tone(sfx, E.one8 - 0.15, 0.65, { duty: 0.25, f: (u) => 300 * Math.pow(3, u), v: env(0.1, 0.3), gain: 0.012 });
for (let i = 0; i < 6; i++) blip(E.block1 - 0.05 + i * 0.06, NOTE(79 + i * 2), 0.05, 0.006, 0.25);
pop(E.oneM, 0.8);
// ---------------------------------------------------------------- footsteps from the gait phase (each half cycle while walking or running)
{ let prev = gaitAt(0); for (let t = 1 / 240; t < END; t += 1 / 240) { const g = gaitAt(t), s = steveAt(t); if (Math.floor(g * 2) !== Math.floor(prev * 2) && s.walk + s.run > 0.25) step(t, s.run > 0.5 ? 1.1 : 0.8); prev = g; } }
// ---------------------------------------------------------------- the tree: punches (4 / s) with crack ticks, the log pops, the crown falls
for (let t = PUNCH1[0] + 0.06; t < PUNCH1[1] - 0.05; t += 0.25) thud(t, 0.5, 170);
for (let i = 1; i <= 10; i++) tick(PUNCH1[0] + (i * 3) / 10 - 0.02, 0.7, i % 2 === 0);
pop(PUNCH1[1], 1.3); whoosh(PUNCH1[1] + 0.05, PUNCH1[1] + 0.45, false, 0.5); thud(PUNCH1[1] + 0.45, 1, 90); thud(PUNCH1[1] + 0.62, 0.35, 120);
plip(LOG_FLY[1] - 0.05);
for (let s = 1; s <= 3; s++) tick(PUNCH1[0] + s, 0.6); chime(PUNCH1[1] + 0.02, ["E6", "B6"], 0.8);
// ---------------------------------------------------------------- the concrete (time-lapse): faster thuds and ticks, the timer to 9 s
{ const [a, b] = PUNCH2; for (let t = a + 0.04; t < b - 0.03; t += 0.11) thud(t, 0.38, 190); for (let i = 1; i <= 9; i++) tick(a + ((b - a) * i) / 9, 0.6, i % 2 === 1); chime(b + 0.02, ["E6", "B6"], 0.8); pop(b + 0.05, 1.2); plip(CON_FLY[1] - 0.05); }
pop(E.bare, 1);
// ---------------------------------------------------------------- the bank, the cart, the scales, the elephants
creak(VAULT[0], VAULT[1], 1.2, 120, 90); chime(VAULT[1] - 0.1, ["C6", "E6", "G6"], 0.7);
rumble(CART.out[0], CART.out[1], 0.8, 380); rumble(CART.go[0], CART.go[1], 0.9, 420);
thud(CART.go[1], 1.1, 100); creak(CART.go[1], CART.go[1] + 0.6, 1, 220, 160);
pop(E.nineteen, 1.1); blip(E.nineteen + 0.06, "G6", 0.08, 0.009, 0.25);
ELE.forEach(([a, b], i) => { for (let t = a + 0.1; t < b - 0.05; t += 0.22) thud(t, 0.32, 70 + i * 6); thud(b, 0.8, 80); creak(b, b + 0.5, 0.7, 200 - i * 10, 170 - i * 10); });
{ const lvl = ELE[2][1] + 0.5; chime(lvl, ["C6", "G6"], 0.8); }
// the city bus passing behind the scales (wide shot): a low engine purr that swells and fades with its pass
{ const a = E.cubic - 1.0, b = E.strongest + 0.6; tone(sfx, a, b - a, { wave: "tri", f: (u, tt) => 48 + 6 * Math.sin(tt * 9), v: (u) => 0.5 * Math.sin(Math.PI * u), gain: 0.03 }); noise(a, b - a, () => 700, (u) => 0.4 * Math.sin(Math.PI * u), 0.004); }
// ---------------------------------------------------------------- the strongman, the lift, ×40
{ const l = STRONG_KEYS[0][0]; tone(sfx, l, 0.9, { duty: 0.25, f: (u, tt) => 110 + 120 * u + 6 * Math.sin(tt * 44), v: env(0.15, 0.2), gain: 0.012 }); noise(l + 0.9, 1.0, () => 1600, (u, tt) => 0.4 + 0.3 * Math.sin(tt * 44), 0.003); thud(STRONG_KEYS[1][0] + 1.0, 0.9, 90); }
pop(E.half, 1); blip(E.half + 0.06, "D6", 0.08, 0.009, 0.25);
sweep(LIFT[0], LIFT[1], true, 0.9, 200, 800); creak(LIFT[1], LIFT[1] + 0.6, 0.8, 160, 220); thud(LIFT[1] + 0.5, 0.6, 90);
{ const a = E.forty - 0.3; for (let i = 0; i < 10; i++) tick(a + i * 0.055, 0.5); chime(E.forty + 0.3, ["G6", "C7", "E7"], 1.1); }
// ---------------------------------------------------------------- the inventory: slide in, the block into slot 0, slot clicks, 64s, counters
swish(INV.in, INV.in + 0.45, 0.012); swish(TOSLOT[0], TOSLOT[1], 0.01); plip(TOSLOT[1] - 0.05, 1.2);
for (let i = 1; i < 36; i += 2) tick(INV.fill[0] + ((INV.fill[1] - INV.fill[0]) * i) / 36, 0.55, i % 4 === 1);
chime(INV.count, ["A6", "E7"], 0.9, 0.08);
for (const [a, b] of [COUNT.blocks, COUNT.tonnes]) { for (let t = a; t < b; t += 0.06) tick(t, 0.35, Math.round(t / 0.06) % 2 === 0); chime(b, ["C7", "G7"], 0.7, 0.06); }
swish(INV.out, INV.out + 0.45, 0.009);
EIF_T.forEach((t, i) => tone(sfx, t, 0.75, { wave: "tri", f: (u) => NOTE(55 + [0, 4, 7, 12, 14][i]) * (0.9 + 0.1 * u), v: env(0.15, 0.4), gain: 0.04 }));
// ---------------------------------------------------------------- the run, the cyclist, the speedometer
whoosh(RUN[0], RUN[0] + 0.5, true, 0.5); swish(RUN[0] + 0.9, RUN[0] + 1.4, 0.012);
tone(sfx, E.twenty - 0.1, 0.8, { duty: 0.25, f: (u) => 200 * Math.pow(4, u), v: env(0.1, 0.3), gain: 0.012 }); blip(E.twenty + 0.75, "E7", 0.06, 0.01, 0.25);
// ---------------------------------------------------------------- the box: lid, grid fill, shrink, flight into slot 0, the wave of boxes, the big counter
creak(BOX.open, BOX.open + 0.6, 1, 240, 300); pop(BOX.open + 0.55, 0.8);
for (let i = 1; i < 27; i += 2) tick(BOX.fill[0] + ((BOX.fill[1] - BOX.fill[0]) * i) / 27, 0.5, i % 4 === 1);
creak(BOX.shrink, BOX.shrink + 0.3, 0.7, 300, 220); pop(BOX.shrink + 0.55, 1); whoosh(BOX.fly[0], BOX.fly[1], true, 0.4); plip(BOX.fly[1] - 0.05, 1.3); chime(BOX.fly[1] + 0.05, ["D6", "A6"], 0.8);
for (let i = 1; i < 36; i += 2) tick(BOX.wave[0] + ((BOX.wave[1] - BOX.wave[0]) * i) / 38, 0.5, i % 4 === 1);
{ const [a, b] = COUNT.big; for (let t = a; t < b; t += 0.05) tick(t, 0.32, Math.round(t / 0.05) % 2 === 0); chime(b, ["C7", "E7", "G7"], 1, 0.06); }
swish(INV.out2, INV.out2 + 0.45, 0.009);
PILE_T.forEach((t, i) => tone(sfx, t, 0.6, { wave: "tri", f: (u) => NOTE(60 + [0, 2, 4, 7, 9, 12][i]) * (0.92 + 0.08 * u), v: env(0.15, 0.4), gain: 0.035 }));
pop(E.all, 1); blip(E.all + 0.07, "C7", 0.08, 0.009, 0.25);
whoosh(E.theres - 0.1, E.problem + 0.2, false, 0.4);
// ---------------------------------------------------------------- one step: lift, the crunch, sinking, dust, hazard blinks, the looks
creak(STEP.up, STEP.up + 0.5, 0.9, 140, 200);
{ const t = CRACK_T; tone(sfx, t, 0.5, { wave: "tri", f: (u) => 70 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.11 }); noise(t, 0.9, (u) => 1400 - 900 * u, (u) => 1 - u * 0.8, 0.03);
  for (let i = 0; i < 14; i++) { const tt = t + 0.02 + i * 0.06 * (1 + i * 0.05); tick(tt, 0.9 - i * 0.05, i % 2 === 0); }
  rumble(STEP.sink[0], STEP.sink[1], 1.2, 260); noise(t + 0.2, 1.2, () => 2600, (u) => (1 - u) * 0.6, 0.006); }
for (let i = 0; i < 9; i++) noise(CRACK_T + 0.1 + i * 0.09, 0.06, () => 2600 + 400 * (i % 3), (u) => 1 - u, 0.004);   // pigeons flap up
for (let k = 0; k < 3; k++) { const t = CRACK_T + 0.15 + (k + 0.25) / 2.2; blip(t, "A5", 0.12, 0.005, 0.5); blip(t + 0.14, "E5", 0.12, 0.004, 0.5); }
blip(E.him - 0.2, "C5", 0.08, 0.006, 0.25); blip(E.next - 0.2, "G5", 0.08, 0.006, 0.25);
// ---------------------------------------------------------------- NEXT: MARIO and the follow card
pop(NEXT_T, 1.1); seq(NEXT_T + 0.1, ["G6", "C7"], 0.09, { gain: 0.012, duty: 0.25 }); blip(E.mario + 0.1, "E7", 0.1, 0.008, 0.125);
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: light curious chiptune, 104 bpm, C Am F G (pluck arpeggio + walking bass)
const BPM = 104, BEAT = 60 / BPM, BAR = 4 * BEAT;
const PROG = [[48, 52, 55, 60], [45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55]];
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4];
  for (const m of ch.slice(1)) tone(bed, t0, BAR * 0.98, { duty: 0.125, f: (u, tt) => NOTE(m + 12) * (1 + 0.002 * Math.sin(tt * 5)), v: (u) => Math.min(1, u / 0.25, (1 - u) / 0.25) * 0.7, gain: 0.007 });
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.8, { wave: "tri", f: () => NOTE(ch[[0, 2, 1, 2][b]] - 12), v: (u) => 1 - 0.6 * u, gain: 0.07 });
  for (let e = 0; e < 8; e++) { const m = ch[[0, 2, 1, 3, 2, 1, 3, 2][e]] + 24; tone(bed, t0 + (e * BEAT) / 2, BEAT * 0.3, { duty: 0.25, f: () => NOTE(m), v: (u) => 1 - 0.85 * u, gain: 0.011 }); }
  if (bar % 2 === 1) tone(bed, t0 + 3.5 * BEAT, BEAT * 0.35, { wave: "tri", f: () => NOTE(ch[3] + 36), v: (u) => 1 - u, gain: 0.016 });
}
// cadence: G (dominant) → C under the follow card
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, G = [55, 59, 62, 67];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.25, f: () => NOTE(G[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.012 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(31 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.07 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.09 });
  S.finish(VOICE_END, [60, 64, 67, 72, 76]); }
// the music pause before «Our world has weight»: the bed fades out and comes back on the crunch (sfx untouched)
{ const SR = 48000, a = E.problem + 0.25, b = E.our3 - 0.05, c2 = CRACK_T, d = CRACK_T + 0.5;
  for (let i = Math.round(a * SR); i < Math.round(d * SR) && i < bed.length; i++) { const t = i / SR, g = t < b ? 1 - (t - a) / (b - a) : t < c2 ? 0 : (t - c2) / (d - c2); bed[i] *= Math.max(0, Math.min(1, g)); } }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2), "music pause", (E.our3 - 0.05).toFixed(2), "→", CRACK_T.toFixed(2));
