// 8-bit sound for «Shuffle a deck well»: every cue is synthesised (synth-core.mjs, frozen copy of shared/synth-core.mjs)
// and lasts exactly as long as its motion, on the same constants as the picture: the hands' sweep of the first spread,
// one click per simulated riffle drop (the riffle's "brrrt" IS the card order), the squaring taps, the panels, NEVER,
// the cloud flutter, the three picks (52 / 51 / 50 falling notes), the 49 cards streaming home, the ticker and the
// 68-digit count, the Earth rising, the clock, the odds chime, the fan of the spread, the two runs as two rising scales,
// the bars (pitch = height), the overhand slaps and the odometer whir, the deck swap, the cut line, the weave (one tick
// per card, left high / right low), the seven quick perfect shuffles (a burst + a counter note each), the resolve chord,
// the hat, the ace, the games and the follow card. Bed: a light chiptune in A minor ending on G7 → C.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, T, END, VOICE_END, perfAt, perfLand } from "./timeline.mjs";
import { RIFFLE_DROPS, OVER_TIMES } from "./deck.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, sweep, swish, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const hash = (k) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** One card landing: a tiny papery click (noise) with a pitched tick. */
const card = (t, g = 1, hi = 0) => { noise(t, 0.018, () => 5200 + 1800 * hi, (u) => 1 - u, 0.016 * g); tone(sfx, t, 0.012, { wave: "tri", f: () => 1300 + 500 * hi, v: (u) => 1 - u, gain: 0.012 * g }); };
const slide = (a, b, g = 1) => noise(a, b - a, (u) => 1500 + 1200 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u) * 0.8, 0.008 * g);
const sweepStart = (pos, t0, span) => t0 + ((pos % 26 < 13 ? pos % 26 : 25 - (pos % 26)) / 12) * span;

// ---------------------------------------------------------------- hook: sweep, cut, riffle, square, slide home
slide(T.gather[0], T.gather[1], 1.2);
for (let k = 0; k < 52; k += 2) card(sweepStart(k, T.gather[0], 0.85) + 0.38, 0.45);
slide(T.cut1[0], T.cut1[1], 1); tone(sfx, T.cut1[1] - 0.03, 0.06, { wave: "tri", f: (u) => 180 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.04 });
for (const d of RIFFLE_DROPS) card(d.t + 0.15, 0.9, d.side);
for (const tt of [T.square[0] + 0.12, T.square[1] - 0.06]) { noise(tt, 0.03, () => 2600, (u) => 1 - u, 0.03); tone(sfx, tt, 0.05, { wave: "tri", f: () => 220, v: (u) => 1 - u, gain: 0.04 }); }
slide(T.toHome[0], T.toHome[1], 0.8);

// ---------------------------------------------------------------- places, NEVER
for (const [t0, notes] of [[EV.casino - 0.2, ["E5", "B5"]], [EV.game - 0.2, ["G5", "D6"]], [EV.ever2 - 0.35, ["A5", "E6"]]]) { swish(t0, t0 + 0.35, 0.007); seq(t0 + 0.05, notes, 0.07, { gain: 0.014, duty: 0.25 }); }
{ const t0 = EV.ever2 - 0.05; noise(t0 + 0.2, 0.05, () => 1500, (u) => 1 - u, 0.04); tone(sfx, t0 + 0.2, 0.3, { duty: 0.5, f: (u) => 140 - 30 * u, v: (u) => 1 - u, gain: 0.02 }); }
swish(EV.first - 0.5, EV.first - 0.08, 0.006);

// ---------------------------------------------------------------- the cloud, the picks, the stream home, the chain
{ const a = T.cloud[0], b = T.cloud[0] + 0.86; swish(a, b, 0.012); tone(sfx, a, b - a, { duty: 0.25, f: (u) => 400 + 900 * u, v: env(0.1, 0.3), gain: 0.008 }); for (let m = 0; m < 52; m += 3) card(a + (51 - m) * 0.007 + 0.48, 0.35, 1); }
[[T.pick1, "E6"], [T.pick2, "D6"], [T.pick3, "C6"]].forEach(([[a, b], note]) => { swish(a, b, 0.008); card(b - 0.02, 1); blip(b + 0.02, note, 0.16, 0.02, 0.25); });
for (let i = 0; i < 4; i++) blip(EV.all1 + i * 0.16 + 0.05, ["G5", "A5", "B5", "C6"][i], 0.05, 0.012, 0.25);
for (let m = 3; m < 52; m++) { const r0 = T.rest[0] + ((m - 3) / 48) * (T.rest[1] - T.rest[0] - 0.35); card(r0 + 0.33, 0.55, 0.5); }
// ticker on, 68 DIGITS counting up
blip(EV.number - 0.08, "C5", 0.05, 0.012, 0.125); blip(EV.number + 0.02, "C6", 0.08, 0.012, 0.125);
for (let i = 0; i < 10; i++) { const u = i / 9, tt = EV.sixty8 - 0.05 + 0.65 * (1 - Math.pow(1 - u, 2)); blip(tt, NOTE(72 + i * 2), 0.04, 0.009, 0.25); }
seq(EV.sixty8 + 0.62, ["C6", "G6"], 0.07, { gain: 0.014, duty: 0.25 });
for (let m = 0; m < 3; m++) { const a = T.cellsBack[0] + m * 0.06; slide(a, a + 0.42, 0.6); card(a + 0.4, 0.6); }

// ---------------------------------------------------------------- the Earth, the clock, the odds
sweep(EV.let1 - 0.15, EV.let1 + 0.55, true, 0.5, 220, 660);
for (let i = 0; i < 9; i++) blip(EV.shuffle2 + i * 0.07 + hash(i) * 0.03, NOTE(84 + ((i * 5) % 12)), 0.04, 0.006, 0.125);
blip(EV.person - 0.08, "E6", 0.06, 0.012, 0.25); blip(EV.once - 0.08, "G6", 0.06, 0.012, 0.25);
for (let i = 0; i < 6; i++) { const tt = EV.big - 0.1 + i * 0.09; noise(tt, 0.012, () => 7000, (u) => 1 - u, 0.012); blip(tt, i % 2 ? "B6" : "E7", 0.015, 0.008, 0.25); }
seq(EV.two1 - 0.12, ["A5", "A5"], 0.13, { gain: 0.012, duty: 0.25 }); blip(EV.decks + 0.05, "E6", 0.12, 0.012, 0.25);
{ const t0 = EV.one2 - 0.1; seq(t0, ["A5", "C6", "E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 }); tone(sfx, t0 + 0.24, 0.6, { duty: 0.125, f: () => n("A6"), v: (u) => 1 - u, gain: 0.01 }); }
swish(EV.but1, EV.but1 + 0.55, 0.008); tone(sfx, EV.but1, 0.55, { duty: 0.25, f: (u) => 700 - 400 * u, v: env(0.1, 0.3), gain: 0.008 });

// ---------------------------------------------------------------- one riffle, spread: the two runs as two rising scales
for (let m = 0; m < 52; m += 2) card(T.spreadR[0] + m * 0.012 + 0.3, 0.5, (m % 4) / 4);
{ const scale = [57, 59, 60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84, 86, 88, 89, 91, 93, 95, 96, 98, 100];
  for (let i = 0; i < 26; i += 2) { const tt = EV.keeps + 0.05 + i * 0.045; blip(tt, NOTE(scale[i] + 7), 0.06, 0.007, 0.25); blip(tt + 0.01, NOTE(scale[i]), 0.06, 0.006, 0.125); } }
// the bars: each grows with a rising tone whose top note follows its height; bar 7's frame chimes
[1, 1, 1, 1, 0.92, 0.61, 0.33].forEach((v, i) => { const s0 = EV.two2 + 0.1 + i * 0.2; tone(sfx, s0, 0.35, { duty: 0.25, f: (u) => 260 + 520 * v * u, v: env(0.1, 0.3), gain: 0.01 }); });
seq(EV.seven - 0.05, ["E6", "G6", "C7"], 0.07, { gain: 0.016, duty: 0.25 });
for (let m = 0; m < 52; m += 2) { const g0 = sweepStart(m, T.gatherR[0], 0.5); card(g0 + 0.33, 0.45); }

// ---------------------------------------------------------------- overhand: slaps, the odometer whir, THOUSANDS
slide(T.over0 - 0.22, T.over0 - 0.02, 0.6);
for (const t0 of OVER_TIMES) { slide(t0, t0 + T.overDur, 0.7); noise(t0 + T.overDur - 0.02, 0.035, () => 2200, (u) => 1 - u, 0.028); tone(sfx, t0 + T.overDur - 0.02, 0.05, { wave: "tri", f: () => 170, v: (u) => 1 - u, gain: 0.035 }); }
{ const r0 = EV.overhand + 0.25, r1 = EV.thousands - 0.02; tone(sfx, r0, r1 - r0, { duty: 0.125, f: (u) => 300 * Math.pow(6, u) + 40 * Math.sin(u * 90), v: env(0.15, 0.1), gain: 0.008 }); }
{ const t0 = EV.thousands - 0.05; tone(sfx, t0, 0.3, { wave: "tri", f: (u) => 110 * Math.pow(0.8, u), v: (u) => 1 - u, gain: 0.07 }); seq(t0 + 0.03, ["A4", "C5", "E5"], 0.02, { gain: 0.014, duty: 0.5, dur: 0.3 }); }

// ---------------------------------------------------------------- the deck swap, the fresh spread, the cut
slide(T.swapOut[0], T.swapOut[1], 1.1); swish(T.swapIn[0], T.swapIn[1], 0.009); blip(T.swapIn[0] + 0.25, "C6", 0.06, 0.01, 0.25);
blip(EV.perfect - 0.08, "E5", 0.06, 0.012, 0.25); blip(EV.perfect + 0.02, "E6", 0.1, 0.012, 0.25);
for (let id = 0; id < 52; id += 2) card(T.spreadP[0] + id * 0.011 + 0.3, 0.5, (id % 4) / 4);
noise(T.cutApart[0], T.cutApart[1] - T.cutApart[0], (u) => 900 + 600 * u, (u) => Math.sin(Math.PI * u), 0.008);
{ const a = EV.cut + 0.1, b = EV.halves + 0.25; noise(a, b - a, (u, tt) => 3000 + 1500 * Math.abs(Math.sin(tt * 31)), (u) => 0.6 * env(0.1, 0.15)(u), 0.006); }
seq(EV.exact - 0.05, ["G5", "G5"], 0.1, { gain: 0.012, duty: 0.25 });
// the weave: one card from each side (left high, right low), exactly when each lands
for (let k = 0; k < 26; k++) { const t0 = perfAt(1) + k * T.zipStep + T.zipDur - 0.02; card(t0, 0.8, 1); card(t0 + 0.012, 0.7, 0); }
// ×2 … ×8: a short riffle burst each, and a counter note climbing to the resolve
for (let j = 1; j <= 8; j++) {
  if (j > 1) for (let i = 0; i < 9; i++) card(perfAt(j) + 0.03 + i * 0.03, 0.55, (i % 2));
  blip(perfLand(j) - 0.05, NOTE(60 + [0, 2, 4, 5, 7, 9, 11, 12][j - 1] + 12), 0.08, 0.014, 0.25);
}
{ const t0 = perfLand(8) + 0.02; seq(t0, ["C6", "E6", "G6", "C7", "E7"], 0.06, { gain: 0.016, duty: 0.25 }); for (let i = 0; i < 8; i++) blip(EV.started + 0.05 + i * 0.065, NOTE(96 - i), 0.04, 0.005, 0.125); }

// ---------------------------------------------------------------- hat, ace, games
seq(EV.magicians - 0.1, ["C6", "G6"], 0.07, { gain: 0.012, duty: 0.25 }); tone(sfx, EV.magicians - 0.1, 0.45, { wave: "tri", f: (u) => 300 + 300 * Math.sin(Math.PI * u), v: env(0.2, 0.3), gain: 0.02 });
for (let i = 0; i < 8; i++) blip(EV.magicians + 0.3 + i * 0.12, NOTE(88 + ((i * 7) % 12)), 0.04, 0.005, 0.125);
swish(EV.cheats - 0.25, EV.cheats + 0.15, 0.008);
{ const a = EV.cheats + 0.1, b = a + 0.6; noise(a, b - a, (u) => 2500 + 2500 * u, (u) => Math.sin(Math.PI * u) * 0.7, 0.008); seq(b - 0.05, ["E6", "C6"], 0.09, { gain: 0.012, duty: 0.25 }); }
swish(EV.theres - 0.25, EV.theres + 0.2, 0.006);
for (let i = 0; i < 5; i++) { const tt = EV.hidden - 0.1 + i * 0.05; noise(tt, 0.03, () => 3000, (u) => 1 - u, 0.016); tone(sfx, tt, 0.03, { wave: "tri", f: () => 500 + 120 * i, v: (u) => 1 - u, gain: 0.02 }); }
seq(EV.math - 0.1, ["D6", "A6"], 0.06, { gain: 0.012, duty: 0.25 });
tone(sfx, EV.lot, 0.45, { duty: 0.25, f: (u) => 500 + 500 * Math.sin(Math.PI * u), v: env(0.1, 0.2), gain: 0.008 }); noise(EV.lot + 0.43, 0.03, () => 2000, (u) => 1 - u, 0.02); tone(sfx, EV.lot + 0.43, 0.05, { wave: "tri", f: () => 330, v: (u) => 1 - u, gain: 0.03 });
seq(EV.games - 0.25, ["G5", "E6"], 0.06, { gain: 0.012, duty: 0.25 }); noise(EV.games + 0.05, 0.02, () => 4000, (u) => 1 - u, 0.016);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: A minor (Am F C G), 108 bpm
const BPM = 108, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < EV.first - 0.2 ? "full" : t < EV.let1 - 0.2 ? "soft" : t < EV.but1 - 0.2 ? "light" : t < EV.slow - 0.3 ? "full" : t < EV.cut - 0.2 ? "tension" : t < EV.magicians - 0.3 ? "full" : t < EV.follow - 0.2 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], tensionProg: [[57, 60, 64], [52, 56, 59]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
// cadence: one bar of G7 into a held C major that rings to the end, then the core's short final fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [67, 71, 74, 77];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(43 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 72]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
