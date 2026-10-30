// 8-bit sound for «A casino doesn't need to cheat you»: every cue is synthesised (synth-core.mjs, frozen copy via pal-50hz)
// from the same constants as the picture (timeline.mjs / scene.mjs): the ball rolling on the track and rattling over the
// frets (bounce clacks from ballState), the settle clunk, chips gliding and clacking, the light running round the 37 pockets
// (37 rising blips), the 37 / 36 badges and the ≠, the zero dimming, the gold thread and the bank's ka-ching, coins, the
// flick, the win jingle and claps, the pull-back, the twinkles, the chart lines (the YOU tone follows its own zigzag, the
// CASINO tone only rises), the doubling tower (one clack per chip), the losses, the wobble creak, +1, the calendar and the
// follow card. Bed: a calm casino-lounge chiptune (Dm7 G7 Cmaj7 A7, swung, walking bass), cadence G7 → Cmaj7 at the end.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, SPIN1, SPIN2, SWEEP1, CHASE, B37, B36, DIM0, THREAD, BETS2, CENTS, WIN, PULL, SPARK, CHART, TOWER, CAL } from "./timeline.mjs";
import { youVal } from "./scene.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const clack = (t, g = 1, f = 3200) => { tone(sfx, t, 0.03, { wave: "noise", f: () => f, v: (u) => 1 - u, gain: 0.03 * g }); tone(sfx, t, 0.035, { wave: "tri", f: () => 1300, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- the ball: rolling, bouncing over the frets, settling
function spinSounds(sp, from, g = 1) {
  const a = Math.max(from, sp.t0), roll = sp.tDrop - a;
  if (sp.t0 >= from) { tone(sfx, sp.t0, 0.06, { wave: "noise", f: () => 5200, v: (u) => 1 - u, gain: 0.02 * g }); whoosh(sp.t0, sp.t0 + 0.35, true, 0.5 * g); }
  noise(a, roll, (u) => 1600 + 900 * (1 - u), env(0.08, 0.15), 0.006 * g);                       // the roll on the wooden track
  for (let t = a; t < sp.tDrop; t += 0.11 + 0.08 * clamp01((t - a) / roll)) tone(sfx, t, 0.012, { wave: "noise", f: () => 7000, v: (u) => 1 - u, gain: 0.004 * g });
  const span = sp.tLand - 0.12 - sp.tDrop;
  for (let k = 1; k <= 4; k++) { const t = sp.tDrop + (k / 4) * span; clack(t, (0.9 - k * 0.15) * g, 3800 - k * 300); }   // contact points of ballState's hops
  for (let t = sp.tDrop; t < sp.tLand - 0.15; t += 0.05) tone(sfx, t, 0.01, { wave: "noise", f: () => 6000, v: (u) => 1 - u, gain: 0.004 * g });
  tone(sfx, sp.tLand - 0.02, 0.09, { wave: "tri", f: (u) => 260 - 80 * u, v: (u) => 1 - u, gain: 0.04 * g }); clack(sp.tLand - 0.02, 0.8 * g, 2400);
}
spinSounds(SPIN1, 0); spinSounds(SPIN2, 0, 0.9);
seq(SPIN1.tLand + 0.08, ["G5", "C6"], 0.07, { gain: 0.014, duty: 0.25 });                      // the green 0 lights

// ---------------------------------------------------------------- round 1 bets glide to the bank
for (let i = 0; i < 7; i++) { const t0 = SWEEP1.t0 + i * SWEEP1.stagger; swish(t0, t0 + SWEEP1.dur, 0.004); clack(t0 + SWEEP1.dur - 0.05, 0.45); }

// ---------------------------------------------------------------- 37 pockets, badges, ≠, the zero dims
for (let i = 0; i < 37; i++) { const t = CHASE.t0 + (i / 37) * (CHASE.t1 - CHASE.t0); tone(sfx, t, 0.035, { duty: 0.25, f: () => NOTE(60 + Math.round(i * 0.66)), v: (u) => 1 - u, gain: 0.007 }); }
pop(B37.in); seq(B37.in + 0.05, ["C6", "G6"], 0.07, { gain: 0.014, duty: 0.25 });
swish(B37.left, B37.left + 0.45, 0.006);
pop(B36.in); seq(B36.in + 0.05, ["A5", "E6"], 0.07, { gain: 0.014, duty: 0.25 });
blip(B36.neq, "D4", 0.12, 0.016, 0.5); blip(B36.neq + 0.12, "C#4", 0.18, 0.014, 0.5);
tone(sfx, DIM0.in, 0.4, { duty: 0.25, f: (u) => 700 - 380 * u, v: env(0.1, 0.3), gain: 0.008 });
swish(B37.out, B37.out + 0.35, 0.006);

// ---------------------------------------------------------------- the zero belongs to the casino: glow, thread, ka-ching
tone(sfx, DIM0.out, 0.3, { duty: 0.25, f: (u) => 500 + 600 * u, v: env(0.1, 0.3), gain: 0.008 });
tone(sfx, THREAD.in, THREAD.full - THREAD.in, { duty: 0.125, f: (u, tt) => 900 + 700 * u + 40 * Math.sin(tt * 60), v: env(0.1, 0.2), gain: 0.007 });
seq(THREAD.bank, ["E6", "C7"], 0.06, { gain: 0.016, duty: 0.25 }); clack(THREAD.bank + 0.02, 0.4, 5000);

// ---------------------------------------------------------------- round 2: bets slide in, a coin from every bet, the flick
for (let i = 0; i < 5; i++) { const t0 = BETS2.in + i * 0.12; swish(t0, t0 + BETS2.dur, 0.004); clack(t0 + BETS2.dur - 0.04, 0.4); }
for (let i = 0; i < 5; i++) { const t0 = CENTS.t0 + i * CENTS.stagger; blip(t0, "E7", 0.03, 0.008, 0.25); blip(t0 + CENTS.dur - 0.02, "B6", 0.05, 0.012, 0.125); blip(t0 + CENTS.dur + 0.03, "E7", 0.06, 0.009, 0.125); }

// ---------------------------------------------------------------- the win: jingle, payout, losing chips, claps
seq(WIN.cheer, ["C6", "E6", "G6", "C7", "G6", "C7"], 0.075, { gain: 0.016, duty: 0.25 });
swish(WIN.pay0, WIN.pay1, 0.006); clack(WIN.pay1 - 0.03, 0.6);
for (let i = 1; i < 5; i++) { const t1 = WIN.lose0 + i * 0.1; swish(t1, t1 + 0.7, 0.003); clack(t1 + 0.66, 0.35); }
for (let k = 0; k < 40; k++) { const t = (1.5 * Math.PI + 2 * Math.PI * k) / 16; if (t > WIN.clap + 0.25 && t < WIN.end - 0.2) noise(t, 0.04, () => 3000, (u) => 1 - u, 0.012); }

// ---------------------------------------------------------------- the pull-back over the floor, wins twinkling everywhere
whoosh(PULL.t0, PULL.t1, false, 1.1);
for (let i = 0; i < 46; i++) { const r = ((Math.sin(i * 91.7 + 3) * 43758.5) % 1 + 1) % 1; if (i % 3) continue; const ti = SPARK.t0 + (((Math.sin((i * 3 + 1) * 12.9898) * 43758.5453) % 1 + 1) % 1) * (SPARK.t1 - SPARK.t0 - 0.4); blip(ti + 0.1, ["E7", "G7", "B6", "D7"][i % 4], 0.08, 0.006 + 0.003 * r, 0.125); }

// ---------------------------------------------------------------- the chart
swish(CHART.in, CHART.in + 0.4, 0.008);
for (let t = CHART.draw0; t < CHART.draw1; t += 0.06) tone(sfx, t, 0.03, { duty: 0.125, f: () => 700 + 500 * Math.sin(t * 37), v: (u) => 1 - u, gain: 0.004 });
for (const [f0, f1] of [[420, 520], [700, 520], [560, 520]]) tone(sfx, CHART.merge0, CHART.merge1 - CHART.merge0, { duty: 0.25, f: (u) => f0 + (f1 - f0) * u, v: env(0.15, 0.3), gain: 0.005 });
blip(CHART.gap, "G5", 0.1, 0.012, 0.25);
swish(CHART.clear0, CHART.clear1, 0.005);
tone(sfx, CHART.you0, CHART.you1 - CHART.you0, { duty: 0.25, f: (u) => 520 * Math.pow(2, youVal(u) * 0.9), v: env(0.05, 0.1), gain: 0.009 });
tone(sfx, CHART.cas0, CHART.cas1 - CHART.cas0, { duty: 0.125, f: (u) => 330 * Math.pow(2, u * 1.6), v: env(0.05, 0.1), gain: 0.009 });
seq(CHART.cas1, ["C6", "G6"], 0.07, { gain: 0.012, duty: 0.25 });
swish(CHART.out, CHART.out + 0.45, 0.008);

// ---------------------------------------------------------------- the doubling tower: one clack per chip, the losses, the wobble, +1
whoosh(TOWER.cam0, TOWER.cam1, true, 0.8);
{ let prev = 0; for (const [ts, v] of TOWER.steps) { const add = v - prev, dur = Math.min(0.42, 0.06 + add * 0.012); for (let i = 0; i < add; i++) { const ti = ts + (i / Math.max(1, add)) * dur + 0.1; if (add > 8 && i % Math.ceil(add / 10)) continue; clack(ti, 0.35 + 0.25 * (i === add - 1), 2600 + (prev + i) * 25); } prev = v; } }
for (const t of TOWER.losses) { blip(t, "E4", 0.08, 0.012, 0.5); blip(t + 0.08, "C4", 0.12, 0.011, 0.5); }
tone(sfx, TOWER.wobble, TOWER.out - TOWER.wobble, { wave: "tri", f: (u, tt) => 150 + 25 * Math.sin(tt * 3.4 * 2), v: env(0.2, 0.2), gain: 0.012 });
swish(TOWER.one, TOWER.one + 0.5, 0.004); seq(TOWER.plus, ["C6", "E6"], 0.06, { gain: 0.014, duty: 0.25 });

// ---------------------------------------------------------------- the calendar
whoosh(TOWER.out - 0.2, CAL.in + 0.9, false, 0.5); swish(CAL.in, CAL.in + 0.35, 0.008);
blip(CAL.night, "D4", 0.14, 0.014, 0.5); blip(CAL.night + 0.14, "A3", 0.2, 0.012, 0.5);
blip(CAL.month, "C4", 0.14, 0.014, 0.5); blip(CAL.month + 0.14, "G3", 0.24, 0.012, 0.5);
for (let m = 0; m < 12; m++) { if (m === 4) continue; blip(CAL.fill0 + ((CAL.fill1 - CAL.fill0) * m) / 11, NOTE(67 + m), 0.05, 0.008, 0.25); }
seq(CAL.year, ["C6", "E6", "G6", "C7"], 0.07, { gain: 0.016, duty: 0.25 });
swish(CAL.out, CAL.out + 0.35, 0.006);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: calm casino-lounge chiptune, swung, 92 bpm (Dm7 G7 Cmaj7 A7)
const BPM = 92, BEAT = 60 / BPM, BAR = 4 * BEAT, SW = 0.62;
const PROG = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]];
const busy = (t) => (t > PULL.t0 - 0.2 && t < CHART.in + 0.4 ? 1 : 0);
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4];
  const walk = [ch[0], ch[1] - 12 + 12, ch[2], ch[1]].map((m, i) => (i === 0 ? m - 12 : m - 12));
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.8, { wave: "tri", f: () => NOTE(walk[b]), v: (u) => 1 - 0.5 * u, gain: 0.085 });
  for (const b of [1, 3]) for (const m of ch.slice(1)) tone(bed, t0 + b * BEAT + (b === 3 ? BEAT * (SW - 0.5) : 0), BEAT * 0.35, { duty: 0.125, f: () => NOTE(m + 12), v: (u) => 1 - 0.8 * u, gain: 0.011 });
  for (let e = 0; e < 8; e++) { const t = t0 + Math.floor(e / 2) * BEAT + (e % 2 ? BEAT * SW : 0); tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: e % 2 ? 0.006 : 0.009 }); }
  if (busy(t0 + BEAT)) for (let e = 0; e < 8; e++) { const t = t0 + Math.floor(e / 2) * BEAT + (e % 2 ? BEAT * SW : 0); tone(bed, t, BEAT * 0.3, { duty: 0.25, f: () => NOTE(ch[(e * 3) % 4] + 24), v: (u) => 1 - 0.7 * u, gain: 0.012 }); }
  else if (bar % 2 === 1) { const mel = [ch[3] + 24, ch[2] + 24, ch[1] + 24]; mel.forEach((m, i) => tone(bed, t0 + (2 + i * 0.5) * BEAT + (i % 2 ? BEAT * (SW - 0.5) : 0), BEAT * 0.45, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.03 })); }
}
// cadence: G7 → Cmaj7 held under the follow card, then the core's soft final chord and fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, G7 = [55, 59, 62, 65];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.125, f: () => NOTE(G7[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.014 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.8, { wave: "tri", f: () => NOTE(43 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.085 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 71]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
