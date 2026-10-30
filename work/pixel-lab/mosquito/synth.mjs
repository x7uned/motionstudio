// 8-bit sound for «Why mosquitoes bite you»: every cue is synthesised and lasts exactly as long as its motion
// (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, CAM, END, W } from "./timeline.mjs";
import { mosq, camera, maleAt } from "./render.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const rnd = (k) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1, q = 15 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * q) / q;
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
const tap = (t, gain = 0.05) => { tone(sfx, t, 0.05, { wave: "tri", f: (u) => 300 - 200 * u, v: (u) => 1 - u, gain }); noise(t, 0.03, () => 6000, (u) => 1 - u, gain * 0.4); };

// ---- the whine: follows her flight for exactly as long as she flies; louder as the camera comes closer
{ const RATE = 240, M = Math.ceil(END * RATE) + 2, vol = new Float32Array(M), pit = new Float32Array(M);
  for (let i = 0; i < M; i++) { const t = i / RATE, m = mosq(t), cam = camera(t), sx = 270 + (m.x - cam.cx) * cam.z, on = 0.25 + 0.75 * clamp01((sx + 100) / 40) * clamp01((640 - sx) / 40), close = clamp01(Math.log(cam.z) / Math.log(12)); vol[i] = (m.fly > 0.02 ? m.fly : 0) * on * (0.35 + 0.65 * close); const m2 = mosq(t + 0.05); pit[i] = 540 - (m2.y - m.y) * 12; }
  const at = (arr, tt) => { const x = tt * RATE, i = Math.min(M - 2, Math.floor(x)), f = x - i; return arr[i] * (1 - f) + arr[i + 1] * f; };
  for (const [det, duty, g] of [[1, 0.25, 0.014], [1.004, 0.125, 0.008]]) tone(sfx, 0, END, { duty, f: (u, tt) => at(pit, tt) * det * (1 + 0.035 * Math.sin(2 * Math.PI * 9.3 * tt)), v: (u, tt) => at(vol, tt), gain: g, q: 64 }); }
// the male's higher whine while he visits the macro
tone(sfx, 9.5, 2.9, { duty: 0.25, f: (u, tt) => 700 * (1 + 0.03 * Math.sin(2 * Math.PI * 11 * tt)), v: (u, tt) => maleAt(9.5 + tt, 0, 0).a * 0.8, gain: 0.01, q: 32 });

// ---- camera zooms (sweeps last exactly as long as the zoom)
const zooms = []; for (let i = 0; i + 1 < CAM.length; i++) { const a = CAM[i], b = CAM[i + 1]; if (Math.abs(Math.log(b.z / a.z)) > 0.5 && b.t < END) zooms.push([a.t, b.t, b.z > a.z]); }
for (const [a, b, inn] of zooms) { const d = b - a, lo = 140, hi = 900, fr = (u) => (inn ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, d, { duty: 0.25, f: (u) => fr(u), v: env(0.12, 0.2), gain: 0.016 }); tone(sfx, a, d, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.1, 0.25), gain: 0.04 }); }

// 1. the bite: landing tap, the pip, the bump swells for its whole swell time, the scratch rubs while the hand rubs
tap(EV.land1, 0.04);
seq(EV.bump[0], ["E6", "A6"], 0.05, { gain: 0.035, duty: 0.125 });
tone(sfx, EV.bump[0] + 0.1, EV.bump[1] - EV.bump[0] - 0.1, { wave: "tri", f: (u) => n("C5") * (1 + 0.5 * u), v: env(0.15, 0.3), gain: 0.04 });
const scratch = (a, b, g) => { for (let t = a + 0.3; t < b - 0.25; t += 1 / 5.5) noise(t, 0.07, () => 2600, (u) => (1 - u) * 0.9, g); };
scratch(EV.scratch1[0], EV.scratch1[1], 0.022); scratch(EV.scratch2[0], END - 0.2, 0.016);
seq(EV.notbad, ["G4", "D5"], 0.08, { gain: 0.03, duty: 0.25, dur: 0.12 });
// 2. lab test: the gauge rises for exactly its rise time, then lands on 100×+; the 1× gauge
blip(EV.labtest, "C6", 0.06, 0.03, 0.125);
tone(sfx, EV.stack[0], EV.stack[1] - EV.stack[0], { duty: 0.125, f: (u) => n("C5") * Math.pow(4, u), v: env(0.1, 0.1), gain: 0.02 });
for (let k = 0; k < 10; k++) blip(EV.stack[0] + (EV.stack[1] - EV.stack[0]) * Math.pow(k / 10, 1.25), ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6"][k], 0.03, 0.02, 0.125);
seq(EV.stack[1], ["C6", "G6"], 0.07, { gain: 0.035 });
blip(EV.least, "C4", 0.12, 0.035, 0.25);
// 3. macro: tags, the blood fills for its fill time, eggs pop in one by one
blip(EV.female, "A5", 0.07, 0.03, 0.25); blip(10.0, "E5", 0.07, 0.025, 0.25); blip(EV.protein, "F5", 0.07, 0.03, 0.25);
tone(sfx, EV.blood, 0.42, { wave: "tri", f: (u) => n("G3") * (1 + 0.6 * u) * (1 + 0.04 * Math.sin(u * 40)), v: env(0.1, 0.25), gain: 0.06 });
for (let k = 0; k < 6; k++) blip(EV.eggs + 0.05 + k * 0.09, ["C6", "E6", "G6", "C7", "E7", "G7"][k], 0.035, 0.022, 0.125);
// 4. the four clues: appear together, then each lights with its own note (a rising set)
noise(EV.chips, 0.35, (u) => 2000 + 3000 * u, (u) => Math.sin(Math.PI * u) * 0.6, 0.012);
seq(EV.breath, ["C5", "G5"], 0.06, { gain: 0.03 }); seq(EV.eyes, ["E5", "B5"], 0.06, { gain: 0.03 }); seq(EV.heat, ["G5", "D6"], 0.06, { gain: 0.03 }); seq(EV.smell, ["C6", "G6"], 0.06, { gain: 0.03 });
// 5. breath: a soft inhale before each exhale, the exhale hiss for its whole puff
for (const [times, g] of [[EV.exhales, 0.02], [EV.exhalesL, 0.012]]) for (const te of times) { noise(te - 0.55, 0.45, (u) => 900 + 1400 * u, (u) => Math.sin(Math.PI * u) * 0.7, g * 0.6); noise(te, 0.75, (u) => 2200 - 1200 * u, (u) => Math.min(1, u / 0.1) * (1 - u), g); }
blip(EV.co2, "D6", 0.06, 0.025, 0.125);
// 6. her eyes switch on: a rising chime for exactly the palette dissolve; off again with a falling one
{ const [a, b] = EV.vision, notes = ["C5", "E5", "G5", "B5", "D6", "G6"]; notes.forEach((nn, i) => tone(sfx, a + (b - a) * i / notes.length, (b - a) / notes.length * 1.6, { duty: 0.25, f: () => n(nn), v: (u) => 1 - u, gain: 0.028 })); tone(sfx, a, b - a, { wave: "tri", f: (u) => n("C4") * (1 + u), v: env(0.2, 0.3), gain: 0.03 }); }
{ const [a, b] = EV.visionOut, notes = ["G6", "D6", "B5", "G5", "E5", "C5"]; notes.forEach((nn, i) => tone(sfx, a + (b - a) * i / notes.length, (b - a) / notes.length * 1.4, { duty: 0.25, f: () => n(nn), v: (u) => 1 - u, gain: 0.018 })); }
// verdicts: ✓ up, × down
seq(EV.red, ["G5", "C6"], 0.06, { gain: 0.03, duty: 0.25 }); seq(EV.orange, ["A5", "D6"], 0.06, { gain: 0.03, duty: 0.25 }); seq(EV.skin, ["C6", "E6", "G6"], 0.05, { gain: 0.03, duty: 0.25 });
for (const [t, nn] of [[EV.green, "E4"], [EV.blue, "D4"], [EV.purple, "C4"]]) tone(sfx, t, 0.14, { duty: 0.5, f: (u) => n(nn) * (1 - 0.25 * u), v: (u) => 1 - u * 0.8, gain: 0.03 });
// 7. heat: a warm wobble for the shimmer's whole time
tone(sfx, EV.heat - 0.35, EV.visionOut[1] - EV.heat + 0.2, { wave: "tri", f: (u, tt) => n("A3") * (1 + 0.03 * Math.sin(tt * 18)), v: env(0.15, 0.2), gain: 0.035 });
// 8. lab: New York tag, 64 people fill in, the sleeve slides on (rustle for exactly the slide)
blip(EV.lab, "D6", 0.06, 0.03, 0.125);
for (let k = 0; k < 16; k++) blip(EV.n64[0] + (EV.n64[1] - EV.n64[0]) * k / 16, ["C6", "D6", "E6", "G6"][k % 4], 0.025, 0.016, 0.125);
noise(EV.sleeve[0], EV.sleeve[1] - EV.sleeve[0], (u, tt) => 3500 + 1500 * Math.sin(tt * 30), (u) => Math.sin(Math.PI * u) * 0.8, 0.02);
// 9. favourites and the three acids
blip(EV.favorites, "A5", 0.06, 0.03, 0.25); seq(EV.much, ["C6", "E6"], 0.06, { gain: 0.03 }); blip(EV.much + 0.35, "C4", 0.08, 0.025, 0.25);
seq(EV.acids, ["E5", "A5", "C6"], 0.07, { gain: 0.028, duty: 0.25 });
// 10. the calendar: the year fades in, two page flips (each exactly as long as the fold)
blip(EV.years - 0.45, "G5", 0.06, 0.02, 0.125);
for (const f of EV.flips) noise(f - 0.3, 0.3, (u) => 1500 + 3500 * u, (u) => Math.sin(Math.PI * u), 0.025);
seq(EV.still, ["G5", "B5", "D6"], 0.06, { gain: 0.03 });
// 11. she lands on the skin; not the blood (strike) — the skin
tap(EV.land2[1], 0.04);
tone(sfx, EV.notblood, 0.16, { duty: 0.5, f: (u) => n("D4") * (1 - 0.2 * u), v: (u) => 1 - u * 0.8, gain: 0.03 }); noise(EV.notblood + 0.25, 0.3, (u) => 4000 - 2000 * u, (u) => 1 - u, 0.012);
seq(EV.yourskin, ["C5", "G5", "C6"], 0.06, { gain: 0.032, duty: 0.25, dur: 0.12 });
// 12. the ending: phone up, the share sheet, the tap, SENT ✓, the plane's flight, landing, she hops onto it
noise(EV.phoneUp[0], EV.phoneUp[1] - EV.phoneUp[0], (u) => 1200 + 2000 * u, (u) => Math.sin(Math.PI * u) * 0.5, 0.01);
seq(EV.ui[0], ["E5", "A5"], 0.08, { gain: 0.03, duty: 0.25 });
tone(sfx, EV.press, 0.03, { duty: 0.5, f: () => 1800, v: (u) => 1 - u, gain: 0.04 }); noise(EV.press, 0.02, () => 9000, (u) => 1 - u, 0.02);
seq(EV.sent, ["C6", "E6", "G6"], 0.07, { gain: 0.035, duty: 0.25, dur: 0.1 });
{ const [a, b] = EV.fly; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 300 + 500 * Math.sin(Math.PI * u), v: env(0.15, 0.3), gain: 0.016 }); noise(a, b - a, (u) => 2500 + 3500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.016); tap(b, 0.035); }
tap(EV.hop[1], 0.03);
// ---- chiptune bed: F – C – Dm – B♭ at 96 BPM, a summer-evening loop arranged by the story; it resolves on F at the end
const BEAT = 60 / 96, BAR = BEAT * 4, prog = [[53, 57, 60], [48, 52, 55], [50, 53, 57], [46, 50, 53]];
const section = (t) => t >= EV.diveIn[1] - 0.3 && t < EV.diveOut[0] ? "soft" : t >= EV.vision[0] && t < EV.visionOut[1] ? "eyes" : t >= EV.macroIn[1] && t < EV.macroOut[0] ? "soft" : t >= EV.phoneUp[0] ? "end" : "full";
const lastBar = Math.floor((END - 1.6) / BAR);
for (let bar = 0; bar * BAR < END; bar++) {
  const ch = bar >= lastBar ? prog[0] : prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2, s = section(t); if (t > END - 0.3) break; if (s === "soft" && e % 2) continue;
    tone(bed, t, (s === "soft" ? BEAT : BEAT / 2) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: s === "eyes" ? 0.08 : 0.1 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + s16 * BEAT / 4, s = section(t); if (t > END - 0.3) break; if (bar >= lastBar && s16 > 4) break;
    const pat = s === "eyes" ? [0, 2, 1, 2] : [0, 1, 2, 1]; if (s !== "soft" || s16 % 2 === 0) tone(bed, t, BEAT / 4 * 0.8, { duty: s === "eyes" ? 0.25 : 0.125, f: () => NOTE(ch[pat[s16 % 4]] + 12 + (s16 >= 12 && s === "full" ? 12 : 0)), v: (u) => 1 - 0.6 * u, gain: s === "soft" ? 0.018 : 0.028 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.018 }); }
}
// final F chord rings for the last bar
for (const [k, nn] of [[0, 53], [1, 57], [2, 60], [3, 65]].map(([k, v]) => [k, v])) tone(bed, lastBar * BAR + k * 0.06, END - lastBar * BAR - k * 0.06 - 0.1, { duty: 0.25, f: () => NOTE(nn + 12), v: (u) => (1 - u) * 0.9, gain: 0.02 });
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 0.4) * clamp01((END - t) / 0.8); sfx[i] *= Math.min(1, t / 0.06) * clamp01((END - t) / 0.3); }
function lowpass(buf, hz) { const a = 1 - Math.exp(-2 * Math.PI * hz / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "zooms", zooms.length, "END", END);
