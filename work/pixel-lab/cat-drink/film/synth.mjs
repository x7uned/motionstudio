// 8-bit sound for «How your cat drinks»: every cue is synthesised and lasts exactly as long as its motion (same timeline as
// the picture). Loop film: laps are periodic over END and the bed fills whole chord cycles with no fades.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, LAP_HZ } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
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
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const nope = (t) => seq(t, ["E4", "C4"], 0.11, { gain: 0.035, duty: 0.25, dur: 0.1 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.018 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.04 * gain }); };
const swish = (a, b, gain = 0.014) => noise(a, b - a, (u) => 2500 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
// one lap: the tongue touching the water — a tiny wet plip as long as the contact
const plip = (t, g = 1, low = false) => { tone(sfx, t, 0.05, { wave: "tri", f: (u) => (low ? 520 : 1250) - (low ? 200 : 520) * u, v: (u) => 1 - u, gain: 0.05 * g }); noise(t, 0.03, () => 9000, (u) => 1 - u, 0.008 * g); };
const plop = (t, g = 1) => { tone(sfx, t, 0.16, { wave: "tri", f: (u) => 700 * Math.pow(0.35, u), v: (u) => 1 - u, gain: 0.07 * g }); noise(t, 0.08, () => 5000, (u) => 1 - u, 0.016 * g); };

// ---- the cat laps whenever it is on screen at real speed (periodic over the loop: LAP_HZ·END is a whole number)
const lapOn = (t) => (t < EV.diveIn[0] ? 1 : t > EV.wideAt - 0.4 && t < EV.dogsPan[0] ? 0.45 : t > EV.backPan[0] + 1.6 ? Math.min(1, (t - EV.backPan[0] - 1.6) / 0.8) : 0);
for (let k = 0; k < Math.round(LAP_HZ * END); k++) { const t = (k + 0.3) / LAP_HZ, g = lapOn(t); if (g > 0) plip(t, 0.32 * g); }
// ---- opening labels, the counter, the camera rolling in, REC, the name
pop(EV.scoop + 0.05, "E6", "B6"); pop(EV.four, "C6", "G6");
noise(EV.camIn[0], EV.camIn[1] - EV.camIn[0], () => 900, (u, tt) => env(0.15, 0.2)(u) * (0.7 + 0.3 * Math.sin(tt * 40)), 0.02); tone(sfx, EV.camIn[1] - 0.06, 0.08, { wave: "noise", f: () => 3000, v: (u) => 1 - u, gain: 0.03 });
seq(EV.rec, ["A6", "A6"], 0.12, { gain: 0.025, duty: 0.5, dur: 0.06 }); pop(EV.name, "G5", "D6");
// ---- the dive into slow motion: one falling sweep for the zoom, lasting the zoom
sweep(EV.diveIn[0], EV.diveIn[1], false, 1.0, 120, 800);
// ---- macro: the tongue lowers (slow glide), curls (a little rising chirp for the curl), touches (plink)
tone(sfx, EV.macroIn[1], EV.top - EV.macroIn[1], { wave: "tri", f: (u) => 330 - 120 * u, v: env(0.1, 0.1), gain: 0.022 });
tone(sfx, EV.curl - 0.1, 1.0, { duty: 0.125, f: (u) => 500 + 500 * Math.sin(Math.PI * 0.5 * u), v: env(0.2, 0.3), gain: 0.014 });
seq(EV.top, ["E6", "B6"], 0.06, { gain: 0.035, duty: 0.25 });
// up, fast: a quick rising sweep for the fast part of the rise; then the column stretching (soft wobble rising)
sweep(EV.pull, EV.pull + 0.8, true, 0.9, 200, 1100);
tone(sfx, EV.sticks, EV.column + 0.6 - EV.sticks, { wave: "tri", f: (u, tt) => 260 + 160 * u + 10 * Math.sin(tt * 14), v: env(0.15, 0.2), gain: 0.03 });
// gravity pulls down: a descending tone for the thinning neck
tone(sfx, EV.gravity, EV.down + 0.4 - EV.gravity, { duty: 0.25, f: (u) => 620 * Math.pow(0.45, u), v: env(0.15, 0.25), gain: 0.016 });
// the mouth shuts: a slow creak while the jaw closes, the snap at the pinch, the lower column plops back
tone(sfx, EV.shuts + 0.3, EV.pinch - EV.shuts - 0.3, { duty: 0.125, f: (u) => 180 + 60 * u, v: env(0.2, 0.05), gain: 0.012 });
noise(EV.pinch, 0.05, () => 7000, (u) => 1 - u, 0.05); tone(sfx, EV.pinch, 0.09, { wave: "tri", f: (u) => 900 - 500 * u, v: (u) => 1 - u, gain: 0.06 });
plop(EV.pinch + 0.89); for (let i = 0; i < 4; i++) plip(EV.pinch + 1.0 + i * 0.07, 0.5);
seq(EV.pinch + 0.15, ["C6", "E6", "G6"], 0.06, { gain: 0.028, duty: 0.25 });
// too late: sad notes for the replay, the neck breaking, the lower part and the drip plopping back, the empty tongue
seq(EV.late, ["G4", "D#4"], 0.14, { gain: 0.03, duty: 0.5, dur: 0.12 });
noise(EV.late + 0.55, 0.04, () => 6000, (u) => 1 - u, 0.03); plop(EV.late + 0.55 + 0.54, 0.8); plop(EV.late + 0.55 + 0.15 + 0.76, 0.6); nope(EV.empty);
// ---- out of the macro: a rising sweep for the zoom; the shadow grows into a lion (low glide for the morph); slow low laps
sweep(EV.macroOut[0], EV.wideAt, true, 0.9, 120, 700);
tone(sfx, EV.tigers, 0.9, { wave: "tri", f: (u) => 70 + 50 * u, v: env(0.2, 0.3), gain: 0.06 });
for (let t = Math.ceil((EV.tigers + 0.9) * 1.6) / 1.6; t < EV.dogsPan[0]; t += 1 / 1.6) plip(t, 0.35, true);
pop(EV.slower, "C5", "G5", 0.022); pop(EV.bigger, "E5", "B5", 0.022);
// ---- to the dog: a swish for the pan; slaps and splashes on every lap (harder after "harder"), the big splash
swish(EV.dogsPan[0], EV.dogsPan[1]);
for (let k = Math.ceil((EV.dogsPan[0] + 0.3) * 3); k / 3 < EV.backPan[0] + 1.0; k++) { const t = (k + 0.45) / 3, hard = t > EV.harder - 0.3 ? 1 : 0.55;
  noise(t, 0.09, () => 4200, (u) => 1 - u, 0.03 * hard); tone(sfx, t, 0.07, { wave: "tri", f: (u) => 420 - 200 * u, v: (u) => 1 - u, gain: 0.03 * hard }); }
noise(EV.splash, 0.5, (u) => 3000 + 3000 * (1 - u), (u) => Math.pow(1 - u, 1.5), 0.05); pop(EV.harder, "D5", "A5", 0.025);
// ---- back to the cat: one long soft swish for the pan, gone before the seam
swish(EV.backPan[0], END - 0.05, 0.01);

// ---- chiptune bed: C – Am – F – G, nudged so whole cycles fill the loop; soft at both ends, sparse in the macro, full in the wide shots
const CYC = Math.max(1, Math.round(END / 9.4)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const section = (t) => (t < EV.diveIn[0] - 0.5 || t > EV.backPan[0] + 0.5 ? "soft" : t < EV.macroOut[0] ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.026 : 0.02 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.016 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1));
