// 8-bit sound for «Holding jump makes gravity weaker»: everything is synthesised (no sound or music from any Mario game)
// and every cue lasts as long as its motion: each jump's rising sweep lasts exactly the rise (long in slow motion, short
// in real time), a soft "bwomp" where strong gravity takes over (the apex or the release), a light fall tone, the
// landing tap, the A button's press and release clicks, footsteps while he runs, the speed check, the ruler marks, the
// timer bars, the tags. The music: our own bouncy major tune, 24 bars over the loop, quieter in slow motion, cycling
// through the seam with no fade. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeChip, NOTE, n, env } from "./lib/chip.mjs";
import { EV, END } from "./timeline.mjs";
import { JUMPS, marioAt, L } from "./mario.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeChip(END), { sfx, bed, tone, blip, seq, noise, sweep, swish, pop, thud } = S;
const filmOf = (j, gf) => { let lo = j.t0 - 0.5, hi = j.t0 + 14; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (j.w(m) < gf) lo = m; else hi = m; } return (lo + hi) / 2; };
const wrap = (t) => ((t % END) + END) % END;
for (const j of JUMPS) {
  const t0 = filmOf(j, 0.001), tApex = filmOf(j, j.sim.apexF), tLand = filmOf(j, j.sim.landF), tHeavy = filmOf(j, j.sim.heavyAt), g = j.ghost ? 0.5 : 1;
  // the rise: a rising square sweep for exactly the rise; then a soft falling triangle for the fall
  tone(sfx, wrap(t0), tApex - t0, { duty: 0.25, f: (u) => 260 * Math.pow(3.2, Math.sqrt(u)), v: env(0.03, 0.15), gain: 0.02 * g });
  tone(sfx, wrap(tApex), tLand - tApex, { wave: "tri", f: (u) => 520 * Math.pow(0.5, u), v: env(0.1, 0.2), gain: 0.025 * g });
  // strong gravity takes over: a low "bwomp" (on release for the early jump, at the apex otherwise)
  if (!j.ghost) tone(sfx, wrap(tHeavy), 0.22, { wave: "tri", f: (u) => 150 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.07 });
  // landing tap
  noise(wrap(tLand), 0.05, () => 2400, (u) => 1 - u, 0.03 * g); tone(sfx, wrap(tLand), 0.06, { wave: "tri", f: () => 120, v: (u) => 1 - u, gain: 0.05 * g });
  // the A button: press and release clicks (main plumber only)
  if (!j.ghost) { blip(wrap(t0 - 0.06), "C7", 0.02, 0.014, 0.125); const tRel = j.hold === Infinity ? tLand + 0.03 : filmOf(j, j.hold + 1); blip(wrap(Math.max(tRel, t0 + 0.12)), "G6", 0.02, 0.012, 0.125); }
}
// footsteps while he runs (one per half stride, stride 60 px) and the slowing down at the end
{ let last = 0; for (let t = 0; t < END; t += 1 / 240) { const m = marioAt(t); if (m.jump || m.run < 0.2) { last = Math.floor(m.x / 30); continue; } const k = Math.floor(m.x / 30); if (k !== last) { noise(t, 0.03, () => 3000, (u) => 1 - u, 0.016); last = k; } } }
// the speed check, the ruler marks, the timer bars, the tags
seq(EV.leave - 0.05, ["E6", "B6", "E7"], 0.06, { gain: 0.018, duty: 0.25 });
pop(EV.four - 0.05, "G5", "D6", 0.018); pop(EV.two - 0.1, "E5", "B5", 0.016); pop(EV.five - 0.05, "A5", "E6", 0.018);
for (const [a, b, note] of [[EV.goes + 0.25, EV.goes + 0.25 + 32 / 60, "A6"], [EV.goes + 0.25 + 32 / 60, EV.goes + 0.25 + 53 / 60, "E6"]]) for (let t = a; t < b; t += 0.06) blip(t, note, 0.02, 0.008, 0.125);
pop(EV.only - 0.1, "G5", "C6", 0.016); pop(EV.same - 0.1, "C6", "G6", 0.014); pop(EV.let - 0.1, "F5", "C6", 0.014); seq(EV.three - 0.05, ["C5", "C4"], 0.1, { gain: 0.02, duty: 0.5 });
pop(EV.keep - 0.1, "G5", "D6", 0.014); pop(EV.speeding - 0.1, "E5", "A5", 0.014); seq(EV.button3 - 0.05, ["C6", "E6", "G6"], 0.07, { gain: 0.016, duty: 0.25 });

// ---------------------------------------------------------------- music: our own bouncy tune, 24 bars across the loop
const BARS = 24, BAR = END / BARS, BEAT = BAR / 4;
const prog = [[48, 52, 55], [45, 48, 52], [53, 57, 60], [55, 59, 62]];                 // C – Am – F – G
const MEL = [76, 79, 81, 79, 76, 74, 72, 74, 76, 79, 84, 83, 81, 79, 77, 74];
const quiet = (t) => [[EV.holding - 0.2, EV.upEnd], [EV.while1, EV.highEnd], [EV.let, EV.soonerEnd], [EV.top1 - 0.3, EV.holdingEnd], [EV.leave, EV.itEnd]].some(([a, b]) => t > a && t < b);
for (let s16 = 0; s16 < BARS * 16; s16++) {
  const t = (s16 * BEAT) / 4, bar = Math.floor(s16 / 16), ch = prog[bar % 4], q = quiet(t);
  if (s16 % 4 === 0) tone(bed, t, BEAT * 0.7, { wave: "tri", f: () => NOTE(ch[0] - 12 + (s16 % 8 === 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: q ? 0.05 : 0.085 });
  if (!q && s16 % 2 === 0) tone(bed, t, (BEAT / 4) * 0.8, { duty: 0.125, f: () => NOTE(ch[(s16 >> 1) % 3] + 12), v: (u) => 1 - 0.7 * u, gain: 0.012 });
  if (s16 % 4 === 0) tone(bed, t, BEAT * 0.8, { duty: 0.25, f: () => NOTE(MEL[(s16 >> 2) % MEL.length]), v: (u) => 1 - 0.6 * u, gain: q ? 0.005 : 0.012 });
  if (!q && s16 % 4 === 2) tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.009 });
}
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bar", BAR.toFixed(3));
