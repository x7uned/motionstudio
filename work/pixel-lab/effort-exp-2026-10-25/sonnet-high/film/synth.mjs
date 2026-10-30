// «Pumpkin face» — 8-bit sound. Everything synthesised (pulse / triangle / LFSR noise, 60 Hz envelope steps). An A-minor spooky
// bed (organ squares, slow bass, bells) and one sound per visible motion; each sound lasts exactly as long as its motion
// (the windows come from timeline.mjs B / brain.mjs ARRIVE, the same numbers the picture uses).   → audio/sfx.wav, audio/bed.wav
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n, env } from "./synth-core.mjs";
import { END, EV, B, VOICE_AT } from "./timeline.mjs";
import { ARRIVE } from "./brain.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, blip, seq, noise, sweep, swish, bedTrack } = S;
const sfx = S.sfx, bed = S.bed;
const WIN = (w) => [w[0], w[1]];
const clamp = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- the bed: A minor, 76 bpm
const PROG = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];          // Am · F · Dm · E (harmonic minor lift)
const section = (t) => (t < EV.face ? "soft" : t < 5.9 ? "full" : t < 8.1 ? "tension" : "full");
const { BEAT, BAR } = bedTrack({ prog: PROG, bpm: 76, section, style: { bass: "walk", arp: 0.125, arpOct: 2, hats: false, kick: false, gain: 1 }, tensionProg: [[57, 60, 64], [52, 56, 59]] });
// organ squares: one slow chord per bar, soft attack, long release
for (let bar = 0; bar * BAR < END; bar++) { const t0 = bar * BAR, ch = PROG[bar % PROG.length];
  for (const [i, nn] of ch.entries()) tone(bed, t0, BAR * 0.96, { duty: i === 1 ? 0.25 : 0.5, f: () => NOTE(nn), v: env(0.18, 0.4), gain: 0.0085 }); }
// bells: a lonely high bell on the off-beats of the first bars, then on the decision
for (const [t, nn] of [[0.9, "E6"], [2.5, "A5"], [4.1, "C6"], [5.7, "E6"], [8.15, "A5"], [9.0, "E6"]]) tone(bed, t, 1.1, { duty: 0.125, f: () => n(nn), v: (u) => Math.exp(-u * 4.5), gain: 0.012 });

// ---------------------------------------------------------------- the pumpkin sits down (rocking, t = 0 → 0.9): soft wooden thumps on each pass through flat
for (const [t, g] of [[0.18, 1], [0.55, 0.55], [0.91, 0.3]]) { tone(sfx, t, 0.1, { wave: "tri", f: (u) => 120 - 50 * u, v: (u) => 1 - u, gain: 0.08 * g }); noise(t, 0.05, () => 1500, (u) => 1 - u, 0.03 * g); }

// ---------------------------------------------------------------- carving: a knife scrape per hole and for the line (length = the dissolve)
for (const w of [B.hole1, B.hole2]) { const [a, b] = WIN(w); noise(a, b - a, (u) => 2000 + 1800 * u, (u) => Math.sin(Math.PI * Math.pow(u, 0.8)), 0.014); tone(sfx, a, b - a, { wave: "tri", f: (u) => 150 + 90 * u, v: (u) => Math.sin(Math.PI * u), gain: 0.03 }); }
{ const [a, b] = WIN(B.line); noise(a, b - a, (u) => 1800 + 3200 * u, (u) => Math.min(1, u * 6) * Math.min(1, (1 - u) * 5), 0.014); tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(2, u * 1.3), v: env(0.1, 0.3), gain: 0.012 }); }
// ---------------------------------------------------------------- «brain sees a face»: dotted guides join the marks; three edges, three soft ticks, one quiet rise under them
{ const [a, b] = WIN(B.guide), d = (b - a) / 3; sweep(a, b, true, 0.55, 300, 1100); ["E6", "A6", "C7"].forEach((nn, i) => blip(a + i * d, nn, d * 0.9, 0.014, 0.25)); }
// ---------------------------------------------------------------- decision: the box snaps in, the candle lights, the grin
{ const [a, b] = WIN(B.decide); swish(a, b, 0.018); seq(a, ["A5", "C6", "E6", "A6"], (b - a) / 4, { gain: 0.022, duty: 0.125 }); tone(sfx, a, 0.32, { wave: "tri", f: (u) => 150 - 60 * u, v: (u) => 1 - u, gain: 0.07 }); blip(a + 0.32, "E7", 0.06, 0.018, 0.25); }
// ---------------------------------------------------------------- the clock: ticks while the pie fills (3.96 → 5.10), a ding as it lands (the 0.35 s pop)
{ const a = B.clock[0] + 0.1, b = B.clock[1], N = 13; for (let i = 0; i < N; i++) { const t = a + (i / N) * (b - a), u = i / N; tone(sfx, t, 0.05, { wave: "tri", f: () => 600 + 1300 * u, v: (u2) => 1 - u2, gain: 0.03 + 0.02 * u }); }
  tone(sfx, b, 0.35, { duty: 0.125, f: () => n("E7"), v: (u) => Math.exp(-u * 4), gain: 0.03 }); tone(sfx, b, 0.35, { wave: "tri", f: () => n("E6"), v: (u) => Math.exp(-u * 3.5), gain: 0.05 }); }
// ---------------------------------------------------------------- camera: pumpkin settles smaller (4.82 → 5.72) and the brain dithers in (5.12 → 5.92)
{ const [a, b] = WIN(B.cam); sweep(a, b, false, 0.7, 180, 700); swish(a, b, 0.008);
  const c0 = B.cam[0] + 0.3, c1 = B.cam[1] + 0.2; ["A5", "C6", "E6", "G6", "A6", "C7"].forEach((nn, i, arr) => blip(c0 + i * (c1 - c0) / arr.length, nn, (c1 - c0) / arr.length, 0.016, 0.125)); }
// ---------------------------------------------------------------- signals: one rising zip while the packets run (first leaves → last arrives), a ping per arrival (its 0.22 s ring)
{ const a = B.beam[0] + 0.12, b = ARRIVE[ARRIVE.length - 1]; sweep(a, b, true, 0.8, 380, 2200); ARRIVE.forEach((t, i) => tone(sfx, t, 0.22, { duty: 0.25, f: () => n(["A5", "C6", "E6", "G6", "A6"][i]), v: (u) => 1 - u, gain: 0.02 })); }
// label card: a short swish and two blips
{ const [a, b] = WIN(B.label); swish(a, b, 0.008); blip(a + 0.1, "E6", 0.05, 0.014, 0.25); blip(b - 0.1, "A6", 0.05, 0.014, 0.25); }
// ---------------------------------------------------------------- the face area lights up (6.62 → 7.04): a bright rise, then bell chords on the three rings (0.85 s each)
{ const [a, b] = WIN(B.glow); sweep(a, b, true, 1.2, 300, 1500); seq(a, ["A5", "C6", "E6", "A6", "C7"], (b - a) / 5, { gain: 0.026, duty: 0.125 });
  [0, 0.3, 0.6].forEach((dt, i) => { tone(sfx, a + 0.02 + dt, 0.85, { wave: "tri", f: () => n(["A5", "E6", "A6"][i]), v: (u) => Math.exp(-u * 3.2), gain: 0.05 * (1 - i * 0.2) }); tone(sfx, a + 0.02 + dt, 0.85, { duty: 0.125, f: () => n(["A6", "E7", "A7"][i]), v: (u) => Math.exp(-u * 4), gain: 0.012 }); }); }
// ---------------------------------------------------------------- the light comes back to the pumpkin: three packets down (0.42 s each), a ring around it (0.7 s)
{ const a = B.answer[0], b = B.answer[0] + 0.2 + 0.42; sweep(a, b, false, 0.8, 300, 1800); const r0 = B.answer[0] + 0.36; tone(sfx, r0, 0.7, { wave: "tri", f: () => n("E5"), v: (u) => Math.exp(-u * 3), gain: 0.05 }); tone(sfx, r0, 0.7, { duty: 0.125, f: () => n("E6"), v: (u) => Math.exp(-u * 3.5), gain: 0.012 }); }
// ---------------------------------------------------------------- the wink (0.4 s): a tiny down-up squeak
{ const [a, b] = WIN(B.wink); tone(sfx, a, b - a, { duty: 0.25, f: (u) => 900 + 700 * Math.abs(Math.cos(Math.PI * u)) * (u < 0.5 ? 1 : 1) - 600 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.018 }); }
// ---------------------------------------------------------------- the return (9.0 → 9.85): the brain lets go — a soft airy whoosh and a settling low glide
{ const [a, b] = WIN(B.back); swish(a, b, 0.012); tone(sfx, a, b - a, { wave: "tri", f: (u) => 330 * Math.pow(0.5, u), v: env(0.2, 0.5), gain: 0.04 }); }

S.finish(EV.pumpkinEnd, [57, 64, 69, 72]);                                  // last A-minor chord under the final seconds, 0.25 s fade
console.log("sfx peak", S.write(HERE + "audio/").toFixed(3), "voice at", VOICE_AT);
