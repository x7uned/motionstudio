// 8-bit sound for «Zombie ants» (Halloween): every cue is synthesised and lasts exactly as long as its motion, on the
// same timeline as the picture: the ant's steps (when we are close), the spore's glow and its landing, the threads
// growing in, the time-lapse (whoosh + day/night ticks), an owl and bats at the moon, the shaking, the fall (whistle,
// thud), the 25 cm ruler, the noon bell, the bite (crunch, lock), the x-ray and the fungus growing, the brain chime,
// the mystery, the death, the stalk creaking, the spore rain, the fossil, the game, the thermometer, the camera moves.
// The bed is a spooky chiptune in A harmonic minor with night crickets, whole cycles over the loop, no fades.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { KEYS, T, RAIN, camera, light, hero } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)); put(buf, s0 + i, x * vol * gain * edge);
  }
}
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5, buf = sfx) => tone(buf, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain, buf = sfx) => tone(buf, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "A5", b = "E6", g = 0.024) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 800) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.013 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.03 * gain }); };
const swish = (a, b, gain = 0.01) => { if (b > a) noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain); };
const bell = (t, note, gain = 0.05, dur = 1.0) => { tone(sfx, t, dur, { wave: "tri", f: () => n(note), v: (u) => Math.pow(1 - u, 2), gain }); tone(sfx, t, dur * 0.7, { duty: 0.125, f: () => n(note) * 2.01, v: (u) => Math.pow(1 - u, 3), gain: gain * 0.25 }); };

// ---------------------------------------------------------------- the ant's steps (only when the camera is close): one tick per tripod step
const close = (t) => camera(t).z > 8;
for (let tt = -4.5; tt < T.stopA; tt += Math.PI / 14) { const t = tt < 0 ? tt + END : tt; if (!close(t)) continue; noise(t, 0.014, () => 7000, (u) => 1 - u, 0.007); tone(sfx, t, 0.02, { wave: "tri", f: () => 900, v: (u) => 1 - u, gain: 0.006 }); }
for (let t = T.under0; t < T.under1; t += Math.PI / 16) if (close(t)) noise(t, 0.012, () => 7000, (u) => 1 - u, 0.006);
// ---------------------------------------------------------------- the spore: a soft glow while it is pointed out; the landing on the next ant
tone(sfx, EV.spore1 - 0.1, EV.seedEnd + 0.15 - EV.spore1, { wave: "tri", f: (u, tt) => n("E6") * (1 + 0.012 * Math.sin(tt * 30)), v: env(0.2, 0.3), gain: 0.018 });
{ const t = T.land2; blip(t, "B6", 0.08, 0.02, 0.25); blip(t + 0.06, "E7", 0.12, 0.012, 0.125); tone(sfx, t, 0.6, { wave: "tri", f: (u) => n("E6") * (1 + 0.3 * u), v: (u) => 1 - u, gain: 0.014 }); }
// the threads growing in through the shell (as long as they grow)
tone(sfx, EV.grows1, EV.shellEnd - EV.grows1, { duty: 0.25, f: (u, tt) => 110 + 160 * u + 12 * Math.sin(tt * 70), v: env(0.15, 0.2), gain: 0.012 }); noise(EV.grows1, EV.shellEnd - EV.grows1, (u) => 900 + 1400 * u, env(0.2, 0.2), 0.006);
// ---------------------------------------------------------------- the time-lapse: a whoosh up the tree and the day/night dial ticking
swish(T.goA, T.nest, 0.012); sweep(T.goA, T.nest, true, 0.6, 140, 520);
for (let k = 0; k < 8; k++) blip(EV.forDays + k * ((EV.normalEnd - EV.forDays) / 8), k % 2 ? "E5" : "A5", 0.05, 0.012, 0.25);
// an owl at the moon, bats squeaking (the nest shot)
{ const t = EV.leaves1 + 0.2; for (const [dt, d] of [[0, 0.28], [0.42, 0.5]]) tone(sfx, t + dt, d, { wave: "tri", f: (u) => n("D4") * (1 - 0.06 * u), v: env(0.2, 0.4), gain: 0.04 }); }
for (const t of [EV.nest + 0.4, EV.trees + 0.3]) { for (let k = 0; k < 3; k++) blip(t + k * 0.06, 3800 + k * 300, 0.03, 0.006, 0.125); }
// out of the nest: a rustle; the shaking (tremolo for as long as it shakes); the fall (whistle) and the thud
noise(T.out, 0.5, () => 3000, env(0.2, 0.3), 0.006);
tone(sfx, T.shake0, T.shake1 - T.shake0, { duty: 0.25, f: (u, tt) => 180 * (Math.floor(tt * 18) % 2 ? 1.06 : 1), v: env(0.1, 0.15), gain: 0.02 });
tone(sfx, T.shake1, T.land - T.shake1, { duty: 0.5, f: (u) => 1400 * Math.pow(0.25, u), v: env(0.05, 0.1), gain: 0.012 });
noise(T.land, 0.12, () => 600, (u) => 1 - u, 0.03); tone(sfx, T.land, 0.16, { wave: "tri", f: (u) => 120 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.07 });
// ---------------------------------------------------------------- the plant: the ruler, warm, wet, the noon bell
for (let k = 0; k < 6; k++) blip(EV.twentyfive - 0.1 + k * ((EV.cm + 0.3 - EV.twentyfive) / 6), NOTE(69 + k * 2), 0.06, 0.012, 0.25);
pop(EV.warm - 0.05, "C6", "G6"); { const t = EV.wet; blip(t, "A6", 0.05, 0.02, 0.25); blip(t + 0.05, "E6", 0.09, 0.016, 0.25); }
bell(EV.noon, "A5", 0.05, 1.1);
// the bite: a crunch, then the jaws lock
noise(T.bite, 0.08, () => 2600, (u) => 1 - u, 0.03); tone(sfx, T.bite, 0.1, { duty: 0.25, f: (u) => 300 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.03 }); blip(T.bite + 0.18, "E4", 0.08, 0.025, 0.5);
// ---------------------------------------------------------------- inside: the x-ray shimmer, the fungus growing, 2017, the brain, the mystery
sweep(EV.inside - 0.1, EV.inside + 0.4, true, 0.6, 400, 1600);
tone(sfx, EV.inside, EV.body + 0.6 - EV.inside, { duty: 0.125, f: (u, tt) => n("A4") * (1 + 0.5 * u) * (Math.floor(tt * 12) % 2 ? 1.0 : 1.05), v: env(0.2, 0.25), gain: 0.011 });
seq(EV.y2017 - 0.05, ["E6", "B6"], 0.07, { gain: 0.018, duty: 0.25 });
bell(EV.not + 0.05, "E6", 0.03, 0.9);
seq(EV.how, ["E5", "G5", "F5"], 0.12, { gain: 0.02, duty: 0.25 });
// the death: a low falling tone; the dial for "a few days later"
tone(sfx, EV.dies, 0.8, { wave: "tri", f: (u) => n("A3") * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.06 });
for (let k = 0; k < 6; k++) blip(EV.few1 + k * ((EV.stalk - 0.1 - EV.few1) / 6), k % 2 ? "E5" : "A5", 0.05, 0.01, 0.25);
// the stalk creaking as it grows; the spore rain (a sparkle as long as it rains)
tone(sfx, T.stalk0, T.stalk1 - T.stalk0, { duty: 0.25, f: (u, tt) => 90 + 140 * u + 20 * Math.sin(tt * 40), v: env(0.15, 0.2), gain: 0.014 });
{ const a = Math.min(...RAIN.map((r) => r.t0)), b = Math.max(...RAIN.map((r) => r.t0 + r.dur)); for (let t = a; t < b; t += 0.09) blip(t, NOTE(84 + ((Math.round(t * 37) * 5) % 12)), 0.04, 0.006 * Math.sin(Math.PI * (t - a) / (b - a)), 0.125); }
// fossil (stone), 48 million (deep gong), the game (minor stab), the brain in the game (low), the thermometer (mercury up), too hot
noise(EV.bite - 0.05, 0.1, () => 500, (u) => 1 - u, 0.02); tone(sfx, EV.fortyeight, 1.0, { wave: "tri", f: () => n("A2"), v: (u) => 1 - u, gain: 0.07 });
seq(EV.inspired - 0.05, ["A4", "C5", "D#5"], 0.04, { gain: 0.02, duty: 0.5, dur: 0.3 });
tone(sfx, EV.brain3, 0.4, { duty: 0.5, f: () => n("A2"), v: (u) => 1 - u, gain: 0.03 });
tone(sfx, EV.people, EV.hot + 0.3 - EV.people, { duty: 0.25, f: (u) => 300 + 700 * u, v: env(0.15, 0.1), gain: 0.012 }); seq(EV.hot, ["G5", "G5"], 0.1, { gain: 0.02, duty: 0.5, dur: 0.07 });
// ---------------------------------------------------------------- tags: a small pop as each appears
for (const t of [EV.give - 0.1, EV.spore1 - 0.1, EV.grows1 - 0.1, EV.forDays - 0.1, EV.nest - 0.15, EV.shakes - 0.08, EV.climbs - 0.1, EV.cm - 0.1, EV.around - 0.1, EV.never2 - 0.15, EV.fungus3 - 0.1, EV.muscles - 0.1, EV.fungus4 - 0.1, EV.but1 - 0.05, EV.stalk - 0.1, EV.rains - 0.1, EV.bite - 0.1, EV.but2 - 0.1, EV.cant - 0.1, EV.next - 0.1]) pop(t);
// ---------------------------------------------------------------- camera moves: a sweep as long as each move
for (let i = 0; i < KEYS.length - 1; i++) { const a1 = KEYS[i][1], b0 = KEYS[i + 1][0]; if (b0 - a1 < 0.2) continue; const za = camera(a1).z, zb = camera(b0).z; const big = Math.abs(Math.log(zb / za)) > 1.2; if (big) sweep(a1, b0, zb < za, 0.7, 140, 600); swish(a1 + 0.05, b0 - 0.05, big ? 0.009 : 0.006); }

// ---------------------------------------------------------------- the bed: A harmonic minor, Am – F – Dm – E, whole cycles over the loop; crickets at night
const CYC = Math.max(1, Math.round(END / 9.6)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
const section = (t) => (t < 1.0 || t > END - 1.4 ? "soft" : (t > EV.y2017 - 0.3 && t < EV.mysteryEnd) || (t > EV.fortyeight - 0.3 && t < EV.usEnd) ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = section(t); if (t >= END - 1e-6) break; tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 24 + (e === 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  // a slow "organ" (square) on the chord's third, long notes
  tone(bed, t0, BAR * 0.98, { duty: 0.5, f: () => NOTE(ch[1] - 12), v: (u) => 0.6 + 0.4 * Math.sin(Math.PI * u), gain: 0.012 });
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break; if (s !== "full" && s16 % 2) continue; if (s === "soft" && s16 % 4) continue;
    tone(bed, t, (BEAT / 4) * 0.8, { duty: 0.125, f: () => NOTE(ch[[0, 1, 2, 1][s16 % 4]] + 12 + (s16 >= 8 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.018 : 0.013 }); }
  if (bar % 2 === 0) { const t = t0 + BEAT * 0.02; tone(bed, t, BEAT * 1.6, { wave: "tri", f: () => NOTE(ch[2] + 24), v: (u) => Math.pow(1 - u, 2), gain: 0.02 }); }
}
// crickets: chirp pairs, whole cycles over the loop; only at night
{ const n0 = Math.round(END / 1.7); for (let k = 0; k < n0; k++) { const t = (k / n0) * END + 0.33, night = 1 - light(t); if (night < 0.2) continue; for (let j = 0; j < 3; j++) tone(bed, t + j * 0.045, 0.03, { duty: 0.5, f: () => 4300, v: (u) => 1 - u, gain: 0.006 * night }); } }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1));
