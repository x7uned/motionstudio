// 8-bit sound for «The lowest aliens can't hit you»: everything is synthesised (no sound or music from any Space
// Invaders game; the march here is our own two-note thump, not the arcade's four-note bass) and every cue lasts as long
// as its motion: a thump per army step (one full pass of the rack; thinned in the time-lapses), alien shots (appear +
// fall), their pops, the cannon's shots, the bursts (as long as they dissolve), the saucer's crossing, the demo (the
// shot that falls into the strip, the ghost cannon, the "too low" pop, the landing slide), the cursor ticks (one per
// alien moved), the new wave arriving, camera sweeps. The music: our own minor chiptune, 26 bars over the loop, quiet in
// the slow motion, cycling through the seam with no fade. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeChip, NOTE, n, env } from "./lib/chip.mjs";
import { EV, END, gameAt, filmOfG, KILL_T, SIM, G1, G_CLEAR, T_NEW, T_CLEAR } from "./timeline.mjs";
import { N } from "./game.mjs";
import { HOOK_SHOTS, LAUNCH, UFO, B_SHOT, A_SHOT, burstDur } from "./render.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeChip(END), { sfx, bed, tone, blip, seq, noise, sweep, swish, pop, thud } = S;

// ---------------------------------------------------------------- the march: one thump per pass of the rack
{ const steps = []; for (let id = 0; id < N; id++) for (const p of SIM.hist[id]) if (p.g >= 0) steps.push([p.g, id]);
  steps.sort((a, b) => a[0] - b[0]);
  // a pass starts when the first living alien moves: detect by the id falling back
  const passes = []; let lastId = 1e9; for (const [g, id] of steps) { if (id < lastId) passes.push(g); lastId = id; }
  let k = 0, lastT = -9;
  const emit = (g, wave) => { const t = filmOfG(g, wave); if (t - lastT < 0.14) return; lastT = t; const r = gameAt(t).rate, quiet = t > EV.bug && t < EV.leftEnd + 0.3 ? 0.45 : 1;
    tone(sfx, t, 0.09, { wave: "tri", f: () => NOTE(k++ % 2 ? 40 : 43), v: (u) => 1 - u, gain: 0.07 * quiet }); noise(t, 0.03, () => 1200, (u) => 1 - u, 0.01 * quiet); };
  for (const g of passes) if (g >= G1 && g <= G_CLEAR) emit(g, "old");
  lastT = -9; for (const g of passes) if (g >= 0 && g < G1) emit(g, "new"); }

// ---------------------------------------------------------------- shots and bursts
const zap = (t, d) => tone(sfx, t, Math.max(0.06, d), { duty: 0.25, f: (u) => 1800 - 900 * u, v: env(0.05, 0.4), gain: 0.022 });
for (const L of LAUNCH) zap(L.t, L.kd.t - L.t);
for (const kd of KILL_T) { const d = burstDur(kd); noise(kd.t, d, (u) => 5000 * (1 - u) + 600, (u) => 1 - u, 0.05); tone(sfx, kd.t, d * 0.8, { duty: 0.5, f: (u) => 300 * Math.pow(0.4, u), v: (u) => 1 - u, gain: 0.02 }); }
for (const s of HOOK_SHOTS) { tone(sfx, s.tFirst - 0.02, s.tEnd - s.tFirst + 0.02, { duty: 0.125, f: (u) => 900 - 400 * u, v: env(0.1, 0.3), gain: 0.016 }); noise(s.tEnd, 0.3, () => 3000, (u) => 1 - u, s.end.on === "cannon" ? 0.04 : 0.03); }
// the saucer: a wobbling tone for its whole crossing
tone(sfx, UFO.t0, UFO.t1 - UFO.t0, { duty: 0.25, f: (u, tt) => 520 + 120 * Math.sin(tt * 2 * Math.PI * 7), v: env(0.06, 0.08), gain: 0.012 });

// ---------------------------------------------------------------- the demonstration
sweep(EV.bug - 0.35, EV.bug + 0.35, false, 0.8, 140, 700);                               // into slow motion
pop(EV.starts - 0.05, "E6", "B6"); tone(sfx, EV.counts, 0.5, { wave: "tri", f: (u) => n("C5") + 200 * u, v: env(0.1, 0.4), gain: 0.03 });   // the strip draws itself
tone(sfx, B_SHOT.fall0, B_SHOT.hitT - B_SHOT.fall0, { duty: 0.25, f: (u) => 700 - 300 * u, v: env(0.1, 0.1), gain: 0.016 });   // B's shot falls
thud(B_SHOT.hitT, 0.9); noise(B_SHOT.hitT, 0.45, (u) => 4000 * (1 - u) + 300, (u) => 1 - u, 0.05); seq(B_SHOT.hitT + 0.05, ["A4", "E4"], 0.12, { gain: 0.03, duty: 0.5 });
pop(EV.higher - 0.1, "C6", "G6", 0.018);                                                  // ghost cannon appears
pop(A_SHOT.t0 - 0.05, "E6", "A6");                                                        // A's shot appears below the strip
noise(A_SHOT.popT, 0.3, () => 3000, (u) => 1 - u, 0.045); seq(A_SHOT.popT + 0.06, ["G5", "C6"], 0.08, { gain: 0.022, duty: 0.25 });   // the pop, "too low"
seq(EV.one1 - 0.05, ["C6", "C6"], 0.14, { gain: 0.016, duty: 0.5 });                    // one row up: alert
tone(sfx, EV.step, EV.land - EV.step + 0.1, { duty: 0.5, f: (u) => n("E4") * Math.pow(0.5, u), v: env(0.1, 0.2), gain: 0.022 });   // the landing slide
thud(EV.game2 - 0.05, 1.2); seq(EV.game2, ["A3", "F3", "D3"], 0.16, { gain: 0.03, duty: 0.5 });
pop(EV.lives - 0.1, "E5", "A5", 0.016);
sweep(EV.so1, EV.so1 + 0.5, true, 0.8, 140, 700);                                        // out of slow motion
// the cursor: a tick for every alien moved during the slow pass
{ for (let id = 0; id < N; id++) for (const p of SIM.hist[id]) { if (p.g < G1) continue; const t = filmOfG(p.g, "old"); if (t > EV.moves1 - 0.2 && t < EV.frame + 0.4) blip(t, "C7", 0.025, 0.014, 0.125); } }
// the last alien: a rising buzz while it races (one note per step would be a 60 Hz buzz anyway)
{ const t0 = KILL_T.find((k) => k.tag === "f3" && k === KILL_T.filter((q) => q.tag === "f3").slice(-1)[0]).t + 0.05, t1 = T_CLEAR;
  tone(sfx, t0, t1 - t0, { duty: 0.125, f: (u, tt) => 220 + 60 * u + (Math.floor(tt * 60) % 2) * 30, v: env(0.1, 0.05), gain: 0.012 }); }
// the new wave arrives (as it dissolves in), the gap, the final drop onto the cannon
seq(T_NEW, ["A4", "C5", "E5", "A5"], 0.11, { gain: 0.02, duty: 0.25 });
tone(sfx, EV.top2 - 0.3, 0.6, { wave: "tri", f: (u) => 110 * Math.pow(0.7, u), v: env(0.1, 0.5), gain: 0.06 });
// camera sweeps
swish(2.9, 3.8); swish(5.8, 6.6); swish(EV.leftEnd + 0.2, EV.so1 + 0.6); swish(END - 1.4, END - 0.3);
// story tags
pop(EV.nagoya - 0.12, "G5", "D6"); pop(EV.creator - 0.12, "E5", "B5", 0.016); pop(EV.taito - 0.1, "G5", "C6", 0.016);

// ---------------------------------------------------------------- music: our own minor line, 26 bars across the loop
const BARS = 26, BAR = END / BARS, BEAT = BAR / 4;
const prog = [[45, 48, 52], [41, 45, 48], [43, 47, 50], [40, 44, 47]];                          // Am – F – G – E
const MEL = [69, 72, 76, 74, 72, 71, 72, 74, 76, 79, 77, 76, 74, 72, 71, 68];
const quiet = (t) => t > EV.bug - 0.2 && t < EV.leftEnd + 0.3;
for (let s16 = 0; s16 < BARS * 16; s16++) {
  const t = (s16 * BEAT) / 4, bar = Math.floor(s16 / 16), ch = prog[bar % 4], q = quiet(t);
  if (s16 % 4 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (s16 % 8 === 4 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: q ? 0.06 : 0.09 });
  if (!q && s16 % 2 === 0) tone(bed, t, (BEAT / 4) * 0.85, { duty: 0.125, f: () => NOTE(ch[(s16 >> 1) % 3] + 12), v: (u) => 1 - 0.7 * u, gain: 0.013 });
  if (s16 % 8 === 0) tone(bed, t, BEAT * 1.8, { duty: 0.25, f: () => NOTE(MEL[(s16 >> 3) % MEL.length]), v: (u) => 1 - 0.5 * u, gain: q ? 0.007 : 0.015 });
  if (!q && s16 % 4 === 2) tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.01 });
}
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bar", BAR.toFixed(3));
