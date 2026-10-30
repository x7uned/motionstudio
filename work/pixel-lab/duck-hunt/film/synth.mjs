// 8-bit sound for «Your Duck Hunt gun never fired a single shot»: everything is synthesised (no sound or music from Duck
// Hunt or any Nintendo game) and every cue lasts as long as its motion: our own quack when a duck rises from the reeds,
// the trigger's click and the light-gun "shot", the black frame (a low hold for as long as the screen is black) and the
// white box (a high hold for as long as it shows; long drones in the slow motion), the hit "bonk" and the falling
// whistle (as long as the duck falls), the miss buzz, the sensor's blip, the panels, the beam sweeps, the flat TV, the
// dog's laugh (as long as it laughs). The music: our own light hunting tune, 26 bars over the loop, quieter in the slow
// motion, cycling through the seam with no fade. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeChip, NOTE, n, env } from "./lib/chip.mjs";
import { EV, END } from "./timeline.mjs";
import { TESTS, DUCKS } from "./render.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeChip(END), { sfx, bed, tone, blip, seq, noise, sweep, swish, pop, thud } = S;

// quacks: a duck rises from the reeds (our own: a nasal pulse with a falling pitch, twice)
const quack = (t, k = 1) => { for (let i = 0; i < 2; i++) tone(sfx, t + i * 0.16, 0.12, { duty: 0.125, f: (u) => (620 - 260 * u) * k, v: env(0.1, 0.4), gain: 0.022 }); };
for (const d of DUCKS) quack(((d.t0 + 0.25) % END + END) % END, d.id === "d3" ? 1.12 : d.id === "d4" ? 0.92 : 1);
// the tests
for (const T of TESTS) {
  blip(T.trig - 0.02, "C7", 0.02, 0.02, 0.25);                                             // the trigger's click
  noise(T.trig, 0.22, (u) => 6000 * (1 - u) + 400, (u) => 1 - u, 0.05); tone(sfx, T.trig, 0.18, { duty: 0.5, f: (u) => 220 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.03 });   // the "shot"
  const b0 = T.black[0], b1 = T.boxes[0][1];                                              // black: low hold; box: high hold
  tone(sfx, b0, Math.max(0.06, b1 - b0), { wave: "tri", f: () => n("C3"), v: env(0.04, 0.1), gain: T.slow ? 0.05 : 0.04 });
  for (const [id, a, b] of T.boxes) tone(sfx, a, Math.max(0.06, b - a), { duty: 0.25, f: () => n(id === "d3" ? "E6" : "G6"), v: env(0.04, 0.1), gain: T.slow ? 0.012 : 0.016 });
}
// hits: a bonk, then a falling whistle for as long as the duck falls; misses: a buzz
for (const d of DUCKS) if (d.hitAt != null) { const t0 = ((d.hitAt % END) + END) % END; seq(t0, ["C6", "G5"], 0.07, { gain: 0.025, duty: 0.25 }); tone(sfx, t0 + 0.35, d.fallEnd - d.hitAt - 0.35, { duty: 0.5, f: (u) => 1400 * Math.pow(0.35, u), v: env(0.05, 0.2), gain: 0.014 }); thud(((d.fallEnd % END) + END) % END - 0.05, 0.5); }
seq(EV.calls - 0.05, ["E3", "C3"], 0.14, { gain: 0.035, duty: 0.5 }); seq(EV.misses - 0.05, ["E3", "C3"], 0.14, { gain: 0.035, duty: 0.5 });
// the sensor says yes
for (const t of [EV.sees, EV.own, EV.reacts, EV.shows]) seq(t - 0.05, ["A5", "E6"], 0.05, { gain: 0.016, duty: 0.125 });
// the cut-away panel, the lens and sensor labels, the rays
swish(EV.inside - 0.2, EV.inside + 0.25); swish(EV.tvEnd + 0.4, EV.tvEnd + 0.85); pop(EV.lens - 0.1, "E6", "B6", 0.016); pop(EV.sensor1 - 0.15, "C6", "G6", 0.016); pop(EV.spot - 0.1, "G6", "D7", 0.014);
tone(sfx, EV.aims, EV.tvEnd - EV.aims + 0.4, { duty: 0.125, f: (u, tt) => 1500 + 300 * Math.sin(tt * 30), v: env(0.15, 0.3), gain: 0.004 });
// camera moves, slow motion in/out
swish(EV.when - 0.2, EV.trigger + 0.3); sweep(EV.screen2 - 0.2, EV.screen2 + 0.4, false, 0.6, 160, 700); swish(EV.why, EV.why + 0.4); swish(EV.old1 - 0.1, EV.old1 + 0.5); swish(EV.lamps - 0.3, EV.lamps + 0.2); swish(EV.flat - 0.1, EV.flat + 0.4);
// the beam: a soft swoosh each time it starts again at the top (it sweeps once every 1.6 s in the slowed picture)
for (let t = EV.old1; t < EV.flicker1End + 0.2; t += 1.6) noise(t, 0.5, (u) => 900 + 2600 * u, (u) => Math.sin(Math.PI * u), 0.006);
// the TV turns flat (and back at the end)
sweep(EV.modern - 0.1, EV.modern + 0.5, false, 0.5, 200, 800); sweep(END - 1.45, END - 0.85, true, 0.4, 200, 800);
// tags
pop(EV.only - 0.1, "G5", "D6", 0.014); pop(EV.catch - 0.1, "F5", "C6", 0.016); pop(EV.nearly - 0.1, "A5", "E6", 0.014); pop(EV.dont - 0.1, "E5", "B5", 0.014); pop(EV.late - 0.1, "D5", "A5", 0.016);
// the dog laughs (our own "huh-huh"): one pulse per bob while it is up
{ const a = EV.misses + 0.3, b = EV.because - 0.25; for (let t = a; t < b; t += 1 / 4.45) tone(sfx, t, 0.09, { duty: 0.25, f: (u) => 300 + 120 * (1 - u), v: (u) => 1 - u, gain: 0.02 }); }

// ---------------------------------------------------------------- music: our own light hunting tune, 26 bars across the loop
const BARS = 26, BAR = END / BARS, BEAT = BAR / 4;
const prog = [[48, 52, 55], [53, 57, 60], [55, 59, 62], [48, 52, 55]];                 // C – F – G – C (major, light)
const MEL = [72, 76, 79, 76, 77, 74, 71, 74, 72, 76, 79, 84, 81, 79, 77, 74];
const quiet = (t) => (t > EV.screen2 - 0.2 && t < EV.secondEnd + 0.3) || (t > EV.old1 - 0.2 && t < EV.missEnd + 0.3);
for (let s16 = 0; s16 < BARS * 16; s16++) {
  const t = (s16 * BEAT) / 4, bar = Math.floor(s16 / 16), ch = prog[bar % 4], q = quiet(t);
  if (s16 % 4 === 0) tone(bed, t, BEAT * 0.8, { wave: "tri", f: () => NOTE(ch[0] - 12 + (s16 % 8 === 4 ? 7 : 0)), v: (u) => 1 - 0.4 * u, gain: q ? 0.055 : 0.085 });
  if (!q && s16 % 2 === 0) tone(bed, t, (BEAT / 4) * 0.8, { duty: 0.125, f: () => NOTE(ch[(s16 >> 1) % 3] + 12), v: (u) => 1 - 0.7 * u, gain: 0.012 });
  if (s16 % 8 === 0) tone(bed, t, BEAT * 1.6, { duty: 0.25, f: () => NOTE(MEL[(s16 >> 3) % MEL.length]), v: (u) => 1 - 0.5 * u, gain: q ? 0.006 : 0.014 });
  if (!q && s16 % 4 === 2) tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.009 });
}
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bar", BAR.toFixed(3));
