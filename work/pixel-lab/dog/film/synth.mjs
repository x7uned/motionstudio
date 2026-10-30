// 8-bit sound for «How a dog shakes dry»: every cue is synthesised and lasts exactly as long as its motion
// (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, CAM, END, W } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (k) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)), k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge;
  }
}
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });

// ---- the shake itself at real speed: a 4.5 Hz wobble of a buzzing pulse + spray hiss, for the whole shake window
function shakeReal(a, b, gain = 1) {
  const d = b - a;
  tone(sfx, a, d, { duty: 0.25, f: (u, tt) => 150 + 60 * Math.sin(2 * Math.PI * 4.5 * tt), v: (u, tt) => env(0.06, 0.12)(u) * (0.55 + 0.45 * Math.abs(Math.sin(2 * Math.PI * 4.5 * tt))), gain: 0.03 * gain });
  noise(a, d, (u, tt) => 7000 + 3000 * Math.sin(2 * Math.PI * 4.5 * tt), (u, tt) => env(0.05, 0.15)(u) * (0.4 + 0.6 * Math.abs(Math.sin(2 * Math.PI * 4.5 * tt))), 0.028 * gain);
}
// slow-mo shake: one soft «whomp» per half swing at 4.5/8 Hz for the whole window
function shakeSlow(a, b, hz, base, gain) { const half = 1 / (2 * hz); for (let t = a + 0.3, k = 0; t < b - 0.2; t += half, k++) tone(sfx, t, Math.min(half * 0.9, 0.5), { wave: "tri", f: (u) => base * (k % 2 ? 1.25 : 1) * (1 + 0.25 * u), v: (u) => Math.sin(Math.PI * u), gain }); }

// 1. out of the river: sloshing steps in the shallows, then soft paws on the bank
for (let t = 0.05, k = 0; t < EV.walk[1]; t += 1 / 3.4, k++) { const inWater = t < 1.3; if (inWater) { noise(t, 0.16, (u) => 3000 - 2000 * u, (u) => 1 - u, 0.04); blip(t + 0.02, ["G4", "E4", "A4"][k % 3], 0.06, 0.02, 0.125); } else tone(sfx, t, 0.07, { wave: "tri", f: (u) => 110 - 40 * u, v: (u) => 1 - u, gain: 0.07 }); }
// 2. first shake, water meter draining, -70 %
shakeReal(EV.shake1[0], EV.freeze[0]);
tone(sfx, EV.meter[1], EV.meter[2] - EV.meter[1], { duty: 0.125, f: (u) => 880 * Math.pow(0.5, u), v: env(0.1, 0.2), gain: 0.012 });
seq(EV.seconds, ["E6", "B6"], 0.06, { gain: 0.035 });
// 3. time stop: pitch drop at the freeze, held drone with clock ticks for the whole pause, resume sweep
tone(sfx, EV.freeze[0], 0.35, { duty: 0.25, f: (u) => 900 * Math.pow(0.15, u), v: (u) => 1 - u * 0.6, gain: 0.04 });
tone(sfx, EV.freeze[0] + 0.3, EV.freeze[1] - EV.freeze[0] - 0.3, { wave: "tri", f: (u, tt) => n("A2") * (1 + 0.01 * Math.sin(tt * 5)), v: env(0.2, 0.15), gain: 0.07 });
for (let t = EV.freeze[0] + 0.5; t < EV.freeze[1] - 0.2; t += 0.5) blip(t, "E6", 0.025, 0.018, 0.125);
seq(EV.physics, ["C6", "G6"], 0.07, { gain: 0.035 });
// camera zooms (sweeps last exactly as long as the zoom)
const zooms = []; for (let i = 0; i + 1 < CAM.length; i++) { const a = CAM[i], b = CAM[i + 1]; if (Math.abs(Math.log(b.z / a.z)) > 0.5) zooms.push([a.t, b.t, b.z > a.z]); }
for (const [a, b, inn] of zooms) { const d = b - a, lo = 140, hi = 900, fr = (u) => (inn ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, d, { duty: 0.25, f: (u) => fr(u), v: env(0.12, 0.2), gain: 0.022 }); tone(sfx, a, d, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.1, 0.25), gain: 0.05 }); }
// pans along the bank (no zoom): soft 8-bit swish for the pan time
for (let i = 0; i + 1 < CAM.length; i++) { const a = CAM[i], b = CAM[i + 1]; if (Math.abs(Math.log(b.z / a.z)) <= 0.5 && Math.abs(b.cx - a.cx) > 150) noise(a.t, b.t - a.t, (u) => 1500 + 2500 * Math.sin(Math.PI * u), (u) => 0.5 * Math.sin(Math.PI * u), 0.02); }
// 4. macro: droplets plinking on the hairs, energy panel, the drain
for (let t = EV.macroIn[1] + 0.2, k = 0; t < EV.macroOut[0] - 0.3; t += 0.55 + rnd(k) * 0.6, k++) tone(sfx, t, 0.12, { wave: "tri", f: (u) => n(["E6", "B5", "G6", "D6", "A6"][k % 5]) * (1 + 0.2 * u), v: (u) => 1 - u, gain: 0.025 });
blip(EV.evap, "C6", 0.06, 0.03, 0.125); seq(EV.lb60, ["G4", "C5"], 0.06, { gain: 0.035 }); tone(sfx, EV.lb1, 0.14, { wave: "tri", f: (u) => n("A5") * (1 + 0.5 * u), v: (u) => 1 - u, gain: 0.05 });
tone(sfx, EV.drain[0], EV.drain[1] - EV.drain[0], { duty: 0.25, f: (u) => n("E5") * Math.pow(0.5, u), v: env(0.08, 0.15), gain: 0.03 });
seq(EV.fifth, ["E5", "C5"], 0.1, { gain: 0.03, dur: 0.12 });
// 5. second shake
shakeReal(EV.shake2[0], EV.shake2[1]);
// 6. slow motion: a downward «slow-down» sweep, then the slowed swing for the whole slow-mo window
tone(sfx, EV.slowmo - 0.05, 0.45, { duty: 0.5, f: (u) => 600 * Math.pow(0.25, u), v: (u) => 1 - u * 0.5, gain: 0.03 });
shakeSlow(EV.slowmo, 31.4, 4.5 / 8, 70, 0.08);
for (let k = 0; k < 5; k++) blip(EV.counter + k / 4.5, "A6", 0.025, 0.03, 0.125);
blip(EV.spine, "C5", 0.12, 0.04, 0.25); blip(EV.skin, "G5", 0.12, 0.04, 0.25); seq(EV.x3, ["C5", "G5", "C6"], 0.04, { gain: 0.04, duty: 0.25, dur: 0.15 });
noise(EV.flung, 0.5, (u) => 9000 - 5000 * u, (u) => 1 - u, 0.035); seq(EV.flung + 0.05, ["E6", "G6", "B6", "E7"], 0.05, { gain: 0.025, duty: 0.125 });
// 7. one droplet: stretch (rising tone for the stretch time), pop on detach, whoosh away, G meter ticks
tone(sfx, EV.force, EV.detach + 0.35 - EV.force, { wave: "tri", f: (u) => n("C5") * Math.pow(2, u * 1.2), v: env(0.1, 0.05), gain: 0.06 });
tone(sfx, EV.detach + 0.35, 0.09, { duty: 0.5, f: (u) => n("C6") * (1 + u), v: (u) => 1 - u, gain: 0.05 }); noise(EV.detach + 0.38, 0.5, (u) => 4000 + 4000 * u, (u) => 1 - u, 0.025);
{ const [a, b] = EV.gmeter; for (let t = a, k = 0; t < b; t += 0.14, k++) blip(t, ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7", "G7"][Math.min(13, k)], 0.04, 0.025, 0.125); seq(b, ["C7", "G7"], 0.06, { gain: 0.035 }); }
// 8. line-up: footsteps in, each animal's slowed shake while it is the subject, tight-circle orbit, frequency tags
for (let t = 37.5; t < 38.9; t += 0.09) blip(t, "E7", 0.015, 0.01, 0.125);
for (let t = 37.6; t < 38.9; t += 0.42) tone(sfx, t, 0.1, { wave: "tri", f: (u) => 70 - 30 * u, v: (u) => 1 - u, gain: 0.08 });
shakeSlow(38.9, W("droplet", 2) - 0.3, 4.5 / 8, 70, 0.05);
{ const a = W("droplet", 2), b = W("rat,") - 0.1; for (let t = a; t < b; t += 1 / (2 * 30 / 8)) blip(t, "B6", 0.03, 0.02, 0.125); }
{ const a = W("rat,"), b = W("bear,") - 0.1; for (let t = a; t < b; t += 1 / (2 * 18 / 8)) blip(t, "E6", 0.04, 0.022, 0.25); }
shakeSlow(W("bear,") - 0.1, W("researchers", 2) - 0.2, 4 / 8, 48, 0.1);
{ const a = EV.circle, b = W("rat,") - 0.1; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => n("E6") * (1 + 0.12 * Math.sin(2 * Math.PI * (30 / 8) * tt)), v: env(0.1, 0.2), gain: 0.012 }); }
blip(EV.lbl30, "E7", 0.08, 0.035); blip(EV.lbl18, "A6", 0.08, 0.035); blip(EV.lbl4, "C5", 0.12, 0.045, 0.25);
// 9. the chart: one blip per dot for the dot-drawing time, a sweep for the trend line, a chord for the rule
{ const [a, b] = EV.dots; for (let i = 0; i < 33; i++) blip(a + (b - a) * i / 33, NOTE(96 - i * 0.8) ? ["C7", "B6", "A6", "G6", "F6", "E6", "D6", "C6"][Math.floor(i / 4.2)] : "C6", 0.025, 0.018, 0.125); }
tone(sfx, EV.trend[0], EV.trend[1] - EV.trend[0], { duty: 0.25, f: (u) => n("C6") * Math.pow(0.5, u), v: env(0.1, 0.2), gain: 0.03 });
seq(EV.rule, ["C5", "E5", "G5"], 0.05, { gain: 0.04, dur: 0.25 });
// 10. soak: shake + splash on the character + his surprise, washing-machine spin for the panel time
shakeReal(EV.soak[0], EV.soak[1]);
noise(EV.surprised - 0.05, 0.35, (u) => 5000 - 3000 * u, (u) => 1 - u, 0.05); seq(EV.surprised + 0.05, ["G5", "C6", "E6"], 0.07, { gain: 0.035, duty: 0.25 });
{ const [a, b] = EV.washer; tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => 180 + 140 * u + 20 * Math.sin(tt * 30), v: env(0.1, 0.25), gain: 0.022 }); noise(a, b - a, (u) => 2000 + 3000 * u, env(0.1, 0.25), 0.012); blip(a, "C6", 0.05, 0.03, 0.125); }
// 11. into the outro: 8-bit sweep for the exact transition, then the pack's click and arpeggio
{ const [a, b] = EV.outroIn; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.03 }); }
function addWav(file, t, gain) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset); let off = 12, data = null, ch = 1, bits = 16;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = dv.getUint32(off + 4, true); if (id === "fmt ") { ch = dv.getUint16(off + 10, true); bits = dv.getUint16(off + 22, true); } if (id === "data") { data = [off + 8, sz]; break; } off += 8 + sz; }
  const [s, len] = data, frames = len / (bits / 8) / ch, s0 = Math.round(t * SR);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < ch; c++) v += dv.getInt16(s + (i * ch + c) * 2, true) / 32768; if (s0 + i < N) sfx[s0 + i] += (v / ch) * gain; }
}
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/pixel-click.wav", EV.click, 0.55);
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/chiptune-arpeggio.wav", EV.toggle, 0.45);

// ---- chiptune bed: C – G – Am – F at 104 BPM, arranged by the story
const BEAT = 60 / 104, BAR = BEAT * 4, prog = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
const section = (t) => t < EV.shake1[0] ? "intro" : t >= EV.freeze[0] && t < EV.freeze[1] ? "freeze" : t >= EV.macroIn[1] && t < EV.macroOut[0] ? "soft" : t >= EV.slowmo && t < 31.5 ? "slow" : t >= EV.dropIn[1] && t < EV.dropOut[0] ? "soft" : t >= EV.outroIn[0] ? "outro" : "full";
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2, s = section(t); if (t > END) break; if (s === "freeze" || s === "outro" || s === "soft") continue; if (s === "slow" && e % 2) continue;
    tone(bed, t, (s === "slow" ? BEAT : BEAT / 2) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: 0.11 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + s16 * BEAT / 4, s = section(t); if (t > END) break;
    if (s === "full" || s === "outro" || s === "soft") tone(bed, t, BEAT / 4 * 0.8, { duty: 0.125, f: () => NOTE(ch[s16 % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.6 * u, gain: s === "soft" ? 0.02 : 0.03 });
    if (s16 % 4 === 2 && (s === "full" || s === "intro")) tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.02 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.2) * clamp01((END - t) / 0.8); }
function lowpass(buf, hz) { const a = 1 - Math.exp(-2 * Math.PI * hz / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "zooms", zooms.length, "END", END);
