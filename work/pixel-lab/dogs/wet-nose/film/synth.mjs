// 8-bit sound for «Why is a dog's nose always cold and wet?»: every cue is synthesised and lasts exactly as long as its
// motion. Loop film: the bed fills whole chord cycles with no fades; anything past END folds onto the start (the wake-up
// boop approach rises across the seam into the boop at frame 0).
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, SC, END } from "./timeline.mjs";

import { DOG } from "../../kit-v2/dog.mjs";

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
const slurp = (a, b, gain = 0.016) => { noise(a, b - a, (u) => 900 + 2600 * Math.sin(Math.PI * u), env(0.15, 0.3), gain * 0.7); tone(sfx, a, b - a, { wave: "tri", f: (u) => 260 + 420 * Math.sin(Math.PI * u), v: env(0.2, 0.3), gain }); };

// ---- the boop: a squeaky rubber «boop» at frame 0 (its rising approach is placed at the end and folds over the seam)
tone(sfx, EV.and + 0.05, END - (EV.and + 0.05), { duty: 0.25, f: (u) => 300 + 900 * u * u, v: (u) => 0.2 + 0.8 * u, gain: 0.012 });
tone(sfx, 0, 0.16, { duty: 0.5, f: (u) => 520 + 600 * Math.sin(Math.PI * u), v: (u) => 1 - u, gain: 0.05 }); noise(0.01, 0.12, () => 2400, (u) => 1 - u, 0.02);
seq(0.06, ["G6", "D7"], 0.05, { gain: 0.02, duty: 0.25 });
sweep(0.55, 2.3, false, 0.7, 160, 700);                                                   // pull back from the nose
pop(EV.cold1 - 0.1, "E6", "B6", 0.022); pop(EV.wet1 - 0.1, "G6", "D7", 0.022);
buzz(EV.notA - 0.1, 0.024); ding(EV.tool - 0.1, 0.022); sniffs(EV.tool - 0.1, EV.tool + 0.9, 6, 0.01);
// ---- glands and mucus: zoom in, panel, glands light one by one, droplets climb (bubbly, as long as the flow), the film shimmers
sweep(SC.tool[1], EV.inside + 0.3, true, 0.7, 160, 800); pop(EV.inside - 0.1, "C6", "E6", 0.02);
[0, 0.12, 0.24].forEach((d, i) => blip(EV.glands + d, ["C6", "E6", "G6"][i], 0.06, 0.02, 0.25));
for (let t = EV.covered - 0.2; t < EV.thin + 0.2; t += 0.09) blip(t, ["C5", "E5", "G5", "C6"][Math.floor((t * 11) % 4)], 0.05, 0.008, 0.125);
shimmer(EV.thin - 0.1, EV.mucus + 0.4, 0.007, 2200); pop(EV.mucus - 0.1, "E6", "A6", 0.022);
// ---- smells drift in (soft twinkles), then each one sticks («plip» per particle), dust falls on the tape
for (let i = 0; i < 12; i++) blip(EV.smells1 + 0.15 + i * 0.17, ["E6", "G6", "B6", "D7"][i % 4], 0.04, 0.006, 0.125);
for (let i = 0; i < 12; i++) tone(sfx, EV.catches1 - 0.15 + i * 0.09 + 0.3, 0.07, { duty: 0.5, f: (u) => 700 - 400 * u, v: (u) => 1 - u, gain: 0.014 });
pop(EV.catches1 - 0.1, "C6", "G6", 0.022); pop(EV.sticky - 0.1, "G5", "C6", 0.018);
for (let i = 0; i < 14; i++) noise(EV.tape - 0.3 + i * 0.07 + 0.5, 0.02, () => 6000, (u) => 1 - u, 0.006);
// ---- the lick (slurp as long as the tongue moves), the head cut-away, tongue lifts, the second organ glows
slurp(EV.licks - 0.05, EV.licks + 0.85); shimmer(EV.licks + 0.2, EV.licks + 0.5, 0.005, 2600);
pop(EV.tongue - 0.25, "C6", "E6", 0.02); shimmer(EV.tongue - 0.2, EV.tongue + 0.3, 0.006, 1600);
tone(sfx, EV.carries - 0.1, EV.second + 0.2 - EV.carries, { wave: "tri", f: (u) => 220 + 220 * u, v: env(0.2, 0.2), gain: 0.03 });
for (let t = EV.second - 0.1; t < SC.lick[1] - 0.2; t += 0.4) seq(t, ["C6", "G6"], 0.07, { gain: 0.012, duty: 0.25 });
pop(EV.organ - 0.1, "E6", "B6", 0.022);
// ---- the counters (ticks as long as they count, faster near the end), ×50
pop(EV.dogHas - 0.2, "C6", "E6", 0.02);
{ const a = EV.three - 0.1, b = EV.cells + 0.2; for (let t = a, k = 0; t < b; t += 0.055, k++) blip(t, ["C5", "E5", "G5", "C6", "E6", "G6", "C7"][Math.min(6, Math.floor((k * 7) / ((b - a) / 0.055)))], 0.035, 0.011, 0.25); seq(b, ["C7", "G7"], 0.06, { gain: 0.024 }); }
pop(EV.you - 0.15, "G5", "C6", 0.018);
{ const a = EV.six - 0.1, b = EV.million2 + 0.4; for (let t = a; t < b; t += 0.12) blip(t, "C5", 0.035, 0.011, 0.25); seq(b, ["E5", "C5"], 0.08, { gain: 0.02 }); }
ding(EV.million2 + 0.35, 0.02);
// ---- breathing: panel, soft inhale air (as long as it shows), exhale puffs through the slits
pop(EV.even - 0.2, "C6", "E6", 0.02);
noise(EV.breathing - 0.1, SC.breath[1] - EV.breathing, (u, tt) => 3000 + 800 * Math.sin(tt * 2.4), (u) => Math.min(1, u * 8, (1 - u) * 6) * 0.6, 0.006);
for (let t = EV.leaves - 0.2; t < SC.breath[1] - 0.3; t += 0.85) noise(t, 0.4, (u) => 1600 - 600 * u, (u) => Math.sin(Math.PI * u), 0.01);
pop(EV.slits - 0.1, "G5", "D6", 0.02); ding(EV.blow - 0.15, 0.018);
// ---- thermal view on/off (electronic sweeps for the whole switch), «cold nose»
sweep(EV.stays - 0.4, EV.stays + 0.05, true, 0.6, 300, 1600); pop(EV.cold3 - 0.1, "A6", "E7", 0.022); sweep(SC.coldNose[1] - 0.5, SC.coldNose[1] - 0.05, false, 0.5, 300, 1600);
// ---- the 2020 experiment: move, cups appear, thermal on, «warm», the 1.6 m bracket, steps toward the warm cup, «?»
whoosh(SC.heat[0], SC.heat[0] + 0.7, 0.01); pop(EV.in2020 - 0.1, "C6", "G6", 0.02);
pop(EV.scientists - 0.05, "E5", "B5", 0.016); pop(EV.scientists + 0.08, "E5", "B5", 0.016);
sweep(EV.heat - 0.3, EV.heat + 0.15, true, 0.6, 300, 1600); ding(EV.warm - 0.1, 0.022); sniffs(EV.heat - 0.2, EV.away2 + 0.5, 5, 0.009);
sweep(EV.meter - 0.15, EV.meter + 0.3, true, 0.4, 400, 900); pop(EV.meter + 0.2, "G5", "D6", 0.018);
sweep(EV.cold4 - 0.55, EV.cold4 - 0.1, false, 0.5, 300, 1600); pop(EV.may - 0.1, "E6", "B6", 0.022);
whoosh(SC.heat[0] + 0.45, SC.heat[0] + 0.95, 0.006);                                         // the dog turns to face the cups
// ---- the nap: lie down, «dry nose», «not sick ✓», soft snoring breaths; wake up, lick, the nose shines, sit up
whoosh(SC.nap[0], SC.nap[0] + 0.45, 0.008); pop(EV.dry1 - 0.1, "E5", "A5", 0.02); ding(EV.sick - 0.1, 0.02);
for (let t = SC.nap[0] + 0.6; t < EV.one - 0.3; t += 1.6) { noise(t, 0.7, (u) => 500 + 300 * u, (u) => Math.sin(Math.PI * u), 0.006); noise(t + 0.8, 0.7, (u) => 800 - 300 * u, (u) => Math.sin(Math.PI * u), 0.005); }
seq(EV.one - 0.05, ["C5", "E5", "G5", "C6"], 0.08, { gain: 0.016, duty: 0.25 });
slurp(EV.lick - 0.1, EV.wakes + 0.25, 0.014); shimmer(EV.lick + 0.15, EV.wakes + 0.2, 0.006, 2600);
whoosh(EV.up + 0.05, EV.and + 0.05, 0.008);

// ---- bed: G – Em – C – D, 6 whole cycles over the loop (≈111 BPM), sparse under the diagrams, no fades
const CYC = 6, BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[43, 47, 50, 55], [40, 43, 47, 52], [36, 40, 43, 48], [38, 42, 45, 50]];
const section = (t) => (t > SC.mucus[0] + 0.3 && t < SC.smell[1] - 0.2) || (t > SC.breath[0] + 0.3 && t < SC.breath[1] - 0.2) ? "sparse" : "full";
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
