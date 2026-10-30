// 8-bit sound for «Why do dogs spin before lying down?»: every cue is synthesised and lasts exactly as long as its
// motion. Loop film: the bed fills whole chord cycles with no fades; anything past END folds onto the start (the calm
// spin's paw pads run across the seam).
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, SC, END } from "./timeline.mjs";

import { DOG } from "../../kit-v3/dog.mjs";

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
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const shimmer = (a, b, gain = 0.012, base = 1800) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => base + 500 * Math.sin(tt * 30) + 400 * u, v: env(0.2, 0.3), gain });
const whoosh = (a, b, gain = 0.014) => noise(a, b - a, (u) => 1200 + 2200 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const thud = (t, gain = 0.06) => { tone(sfx, t, 0.09, { wave: "tri", f: (u) => 180 - 110 * u, v: (u) => 1 - u, gain }); noise(t, 0.05, () => 2500, (u) => 1 - u, gain * 0.25); };
const pad = (t, gain = 0.02) => { noise(t, 0.035, () => 1800, (u) => 1 - u, gain); tone(sfx, t, 0.04, { wave: "tri", f: () => 140, v: (u) => 1 - u, gain: gain * 1.2 }); };
const sniffs = (a, b, rate = 4.5, gain = 0.01) => { for (let t = a; t < b; t += 1 / rate) noise(t, 0.06, (u) => 5000 + 3000 * u, (u) => Math.sin(Math.PI * u), gain); };
const buzz = (t, gain = 0.03) => seq(t, ["A3", "F3"], 0.09, { gain, duty: 0.5 });
const ding = (t, gain = 0.03) => seq(t, ["E6", "B6", "E7"], 0.05, { gain, duty: 0.25 });
const rustle = (a, b, gain = 0.01) => noise(a, b - a, (u, tt) => 2500 + 1500 * Math.sin(tt * 9), (u) => Math.min(1, u * 6, (1 - u) * 6), gain);
/** soft paw pads while spinning on the spot: 4 steps per circle of period p */
const spinPads = (a, b, p, gain = 0.009) => { for (let t = a; t < b; t += p / 4) pad(t, gain); };
const SPIN_P = 1.25;

// ---- the hook / loop spin (pads run from the loop's calm spin straight across the seam into the hook)
spinPads(SC.loop[0] + 0.3, END + SC.hook[1], SPIN_P);
pop(EV.lost - 0.1, "E5", "A5", 0.02); buzz(EV.lost + 0.05, 0.02); ding(EV.making1 - 0.1, 0.022);
// ---- long ago: dusk shimmer in, the wolf spins, grass rustles flat (as long as it flattens), snow crunches, nest chime
whoosh(SC.hook[1] - 0.1, SC.hook[1] + 0.45, 0.01); shimmer(SC.hook[1], SC.hook[1] + 0.6, 0.006, 1400);
pop(EV.long - 0.05, "C6", "E6", 0.02); pop(EV.wolves - 0.05, "G5", "D6", 0.02);
spinPads(EV.wolves - 0.1, EV.flat1 + 0.35, SPIN_P, 0.008); rustle(EV.walk, EV.flat1 + 0.3, 0.012);
for (let t = EV.snow - 0.1; t < EV.flat1 + 0.35; t += 0.16) noise(t, 0.05, () => 3200, (u) => 1 - u, 0.012);
tone(sfx, EV.flat1 + 0.35, 0.7, { wave: "tri", f: (u) => 330 - 140 * u, v: env(0.2, 0.4), gain: 0.03 });
seq(EV.nest - 0.1, ["C6", "E6", "G6"], 0.07, { gain: 0.02, duty: 0.25 });
// ---- back to the pillow: dissolve, the collie spins
whoosh(SC.wild[1] - 0.1, SC.wild[1] + 0.45, 0.01); spinPads(SC.pillow[0], SC.pillow[1], SPIN_P);
pop(EV.old - 0.1, "E6", "B6", 0.02); pop(EV.pillow - 0.1, "G5", "C6", 0.018); noise(EV.pillow, 0.3, () => 900, env(0.2, 0.5), 0.008);
// ---- the study: title, 62 counter ticks, mats, icons spin (tiny whirls), percentages, digging scrapes, rug flattens
pop(EV.scientist - 0.1, "C6", "E6", 0.02);
for (let t = EV.sixtyTwo - 0.1, k = 0; t < EV.dogs + 0.3; t += 0.03, k++) blip(t, ["C5", "E5", "G5", "C6"][k % 4], 0.02, 0.006, 0.25);
pop(EV.smooth - 0.2, "G5", "D6", 0.018); seq(EV.one1 - 0.1, ["E6", "G6", "B6"], 0.06, { gain: 0.012, duty: 0.125 }); ding(EV.five - 0.1, 0.02);
pop(EV.shaggy - 0.2, "G5", "D6", 0.018); for (let i = 0; i < 6; i++) seq(EV.half - 0.3 + i * 0.08, ["E6", "B6"], 0.05, { gain: 0.008, duty: 0.125 }); ding(EV.half - 0.1, 0.022);
for (let t = EV.dug - 0.15; t < EV.first + 0.35; t += 0.12) noise(t, 0.07, (u) => 1400 + 1200 * u, (u) => 1 - u, 0.014);
spinPads(EV.bumps - 0.05, EV.bumps - 0.05 + 2 * SPIN_P, SPIN_P); rustle(EV.bumps - 0.05, EV.bumps - 0.05 + 2 * SPIN_P, 0.009); pop(EV.bumps - 0.1, "C6", "G6", 0.022);
tone(sfx, EV.bumps - 0.05 + 2 * SPIN_P, 0.6, { wave: "tri", f: (u) => 300 - 120 * u, v: env(0.2, 0.4), gain: 0.028 });          // lies down
// ---- the curl: props swap, curl (descending warm tone as long as it curls), labels, night falls (low pad), crickets, warm glow
shimmer(SC.study[1] - 0.1, SC.study[1] + 0.5, 0.005, 1800);
tone(sfx, EV.ends - 0.1, EV.curl + 0.6 - EV.ends, { wave: "tri", f: (u) => 440 - 200 * u, v: env(0.2, 0.3), gain: 0.03 });
pop(EV.nose - 0.1, "E6", "A6", 0.02); pop(EV.tail - 0.1, "G6", "C7", 0.02);
tone(sfx, EV.keeps - 0.3, SC.curl[1] - 0.2 - (EV.keeps - 0.3), { wave: "tri", f: () => n("C3"), v: env(0.3, 0.3), gain: 0.02 });
for (let t = EV.keeps; t < SC.curl[1] - 0.4; t += 0.45) seq(t, ["E7", "E7"], 0.04, { gain: 0.005, duty: 0.125, dur: 0.025 });
tone(sfx, EV.heat - 0.1, 1.2, { duty: 0.25, f: (u) => 520 + 40 * Math.sin(u * 20), v: env(0.3, 0.5), gain: 0.008 }); pop(EV.heat - 0.1, "C6", "E6", 0.02);
// ---- danger check: uncurl and stand (rising tone), one slow circle with radar pings, «?», «not tested»
tone(sfx, SC.danger[0] + 0.1, 0.8, { wave: "tri", f: (u) => 220 + 160 * u, v: env(0.2, 0.3), gain: 0.025 });
spinPads(EV.circling - 0.05, EV.circling - 0.05 + 2.8, 1.4, 0.009);
for (let k = 0; k < 2; k++) tone(sfx, EV.circling + k * 1.4, 0.25, { wave: "tri", f: (u) => 1320 - 300 * u, v: (u) => 1 - u, gain: 0.018 });
pop(EV.check - 0.1, "E6", "B6", 0.02); buzz(EV.tested2 - 0.1, 0.02);
// ---- the warning: restless fast circles (quicker pads), tries to lie down and pops up, «?», «+ ask a vet», «maybe pain»
spinPads(EV.circles4 - 0.1, EV.settle - 0.1, (EV.settle - EV.circles4) / 2, 0.011); tone(sfx, EV.settle - 0.1, 0.8, { wave: "tri", f: (u) => 260 - 60 * Math.sin(Math.PI * u), v: env(0.2, 0.3), gain: 0.025 });
spinPads(EV.settle + 0.7, SC.loop[0] + 0.3, 0.95, 0.011); pop(EV.settle, "E5", "B5", 0.018);
ding(EV.ask - 0.1, 0.022); seq(EV.pain - 0.15, ["A4", "F4"], 0.12, { gain: 0.02, duty: 0.5 });

// ---- bed: F – Dm – Bb – C (warm, sleepy), 6 whole cycles over the loop, sparse in the flashback and at night, no fades
const CYC = 6, BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[41, 45, 48, 53], [38, 41, 45, 50], [34, 38, 41, 46], [36, 40, 43, 48]];
const section = (t) => (t > SC.wild[0] + 0.3 && t < SC.wild[1] - 0.2) || (t > EV.keeps - 0.2 && t < SC.curl[1] - 0.2) ? "sparse" : "full";
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = section(t); if (t >= END - 1e-6) break;
    tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.085 : 0.06 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * 1.4, { duty: 0.25, f: () => NOTE(ch[[0, 2, 1, 3, 2, 1, 3, 2][s8]] + 12), v: (u) => 1 - 0.85 * u, gain: s === "full" ? 0.02 : 0.015 });
    if (s8 % 2 === 1 && s === "full") tone(bed, t, 0.025, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.01 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
