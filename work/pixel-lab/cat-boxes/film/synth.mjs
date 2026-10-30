// 8-bit sound for «Why do cats love boxes?»: every cue is synthesised and lasts exactly as
// long as its motion, on the picture's timeline. Loop film: the bed fills whole bars with no fades; anything that runs
// past END folds onto the start. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { shelter } from "./direction.mjs";

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
const tick = (t, hz = 3000, g = 0.02) => noise(t, 0.025, () => hz, (u) => 1 - u, g);
const thud = (t, g = 0.09, f0 = 140) => { tone(sfx, t, 0.18, { wave: "tri", f: (u) => f0 - 80 * u, v: (u) => 1 - u, gain: g }); noise(t, 0.08, () => 900, (u) => 1 - u, g * 0.35); };
const patter = (a, b, rate, g = 0.016, hz = 2400) => { for (let t = a; t < b; t += 1 / rate) tick(t, hz + ((t * 977) % 1) * 600, g); };
const scrabble = (a, dur, g = 0.022) => { for (let t = a; t < a + dur; t += 0.035) noise(t, 0.02, () => 5000 + ((t * 1931) % 1) * 3000, (u) => 1 - u, g); };
const whoosh = (a, b, g = 0.016) => noise(a, b - a, (u) => 900 + 2200 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), g);
const squeak = (t, g = 0.016) => tone(sfx, t, 0.09, { duty: 0.125, f: (u) => 2600 + 900 * Math.sin(u * Math.PI), v: (u) => 1 - u, gain: g });

// ---- the opening (τ = t; cues before 0 fold onto the film's last seconds): soft paw steps as it walks to the bed
for (let tau = -0.7; tau < 1.55; tau += 0.32) noise(((tau % END) + END) % END, 0.04, () => 1400, (u) => 1 - u, 0.01);
// the bed sparkles (as long as its shine shows), the price tag "ka-ching", the sniff
for (let t = 0.3; t < 4.3; t += 0.55) blip(t, ["E7", "B6", "G7"][Math.floor(t * 3) % 3], 0.05, 0.006, 0.125);
seq(EV.fancy - 0.05, ["B5", "E6"], 0.07, { gain: 0.03, duty: 0.25 }); noise(EV.fancy + 0.1, 0.2, () => 9000, (u) => 1 - u, 0.012);
for (let k = 0; k < 4; k++) noise(EV.bed + 0.05 + k * 0.14, 0.05, () => 5000, (u) => Math.sin(Math.PI * u), 0.012);
// the leap over the bed into the box: a whoosh as long as the leap, a cardboard thump, a rattle of the flaps; "FREE"
whoosh(EV.sits - 0.25, EV.sits + 0.27, 0.016); thud(EV.sits + 0.27, 0.06, 150); noise(EV.sits + 0.3, 0.35, (u) => 1600 - 800 * u, (u) => 1 - u, 0.02);
seq(EV.box1 - 0.03, ["C6", "E6", "G6"], 0.06, { gain: 0.025, duty: 0.25 });
pop(EV.random - 0.05, "E6", "B6", 0.02);
// the doorbell; the startle; ducking into the box (rustle as long as the duck)
seq(EV.stressed - 0.35, ["E6", "C6"], 0.28, { gain: 0.035, duty: 0.5 });
tone(sfx, EV.stressed + 0.25, 0.25, { duty: 0.25, f: (u) => 1200 + 900 * u, v: (u) => 1 - u, gain: 0.018 });
tone(sfx, EV.fight - 0.03, 0.22, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.025 });
noise(EV.hides - 0.1, 0.35, (u) => 2200 - 1200 * u, (u) => Math.sin(Math.PI * u), 0.022); pop(EV.hides + 0.2, "G5", "C6", 0.02);
// the shelter panel slides in (rising arpeggio), each day ticks (two voices), relief chimes when each cat relaxes
seq(EV.shelter - 0.15, ["C5", "E5", "G5", "C6"], 0.07, { gain: 0.016, duty: 0.25 });
{ let lastL = 1, lastR = 1; for (let t = EV.scientists1; t < EV.weeksEnd; t += 1 / 60) { const S = shelter(t), l = Math.round(S.dayL), r = Math.round(S.dayR); if (l !== lastL) { blip(t, "G6", 0.04, 0.016, 0.25); lastL = l; } if (r !== lastR) { blip(t, "C6", 0.04, 0.013, 0.25); lastR = r; } } }
seq(EV.three - 0.05, ["C6", "E6", "G6", "C7"], 0.08, { gain: 0.02, duty: 0.25 }); seq(EV.two - 0.05, ["G5", "B5", "D6", "G6"], 0.08, { gain: 0.02, duty: 0.25 });
seq(EV.weeksEnd - 0.1, ["C6", "G5", "E5", "C5"], 0.06, { gain: 0.012, duty: 0.25 });
// warmth: a warm swell; the mercury rises (as long as it rises); the room marker (cool blip); heat shimmer around the cat
tone(sfx, EV.warm - 0.1, 0.7, { wave: "tri", f: (u) => 330 + 110 * u, v: env(0.3, 0.3), gain: 0.03 });
sweep(EV.thirty, EV.thirtyEight + 0.4, true, 0.6, 180, 700); pop(EV.thirtyEight + 0.4, "E6", "B6", 0.02);
seq(EV.room - 0.05, ["E5", "B4"], 0.1, { gain: 0.016, duty: 0.5 });
tone(sfx, EV.keeps - 0.4, EV.closeEnd + 0.2 - (EV.keeps - 0.4), { duty: 0.125, f: (u, tt) => 1500 + 300 * Math.sin(tt * 20), v: env(0.25, 0.3), gain: 0.008 });
// the hunter: the owner's footsteps (each step), the eyes following (a soft rising blip), the swat, his yelp
for (let t = EV.box6 - 0.1; t < EV.catEnd - 0.45; t += 0.55) noise(t, 0.06, () => 700, (u) => 1 - u, 0.016);
tone(sfx, EV.sees1, 0.9, { wave: "tri", f: (u) => 300 + 200 * u, v: env(0.3, 0.3), gain: 0.02 });
whoosh(EV.catEnd - 0.45, EV.catEnd - 0.15, 0.016); blip(EV.catEnd - 0.15, "C6", 0.05, 0.03, 0.25);
tone(sfx, EV.catEnd - 0.1, 0.25, { duty: 0.25, f: (u) => 900 + 700 * Math.sin(Math.PI * u), v: (u) => 1 - u, gain: 0.02 });
// the paper: out of the box (whoosh), paper rustles in as it appears, paws, sitting pops; the illusion shimmers; four corner blips
whoosh(EV.floor - 0.7, EV.floor - 0.25, 0.014); thud(EV.floor - 0.25, 0.03, 180);
noise(EV.paper - 0.2, 0.45, (u) => 3000 + 1500 * u, (u) => Math.sin(Math.PI * u), 0.016);
for (let t = EV.floor - 0.2; t < EV.sat1 - 0.2; t += 0.3) noise(t, 0.04, () => 1400, (u) => 1 - u, 0.01);
pop(EV.sat1 - 0.05, "C6", "G6", 0.022); pop(EV.drawn - 0.05, "E6", "B6", 0.018);
noise(EV.even - 0.2, 0.45, (u) => 3000 + 1500 * u, (u) => Math.sin(Math.PI * u), 0.014); pop(EV.sat2 - 0.05, "C6", "G6", 0.022);
tone(sfx, EV.wasnt - 0.1, EV.eyeEnd - EV.wasnt, { duty: 0.125, f: (u, tt) => 1800 + 400 * Math.sin(tt * 14), v: env(0.25, 0.3), gain: 0.009 });
for (let k = 0; k < 4; k++) blip(EV.four + k * 0.12, ["C6", "E6", "G6", "C7"][k], 0.05, 0.02, 0.25);
seq(EV.trick - 0.05, ["G6", "C7"], 0.06, { gain: 0.02, duty: 0.25 });
// keep the box: back into it (whoosh, thump), a happy chime; the scene returns to the opening (soft falling sweep)
whoosh(EV.keep - 0.3, EV.keep + 0.2, 0.014); thud(EV.keep + 0.2, 0.05, 150); seq(EV.box7 - 0.05, ["C6", "E6", "G6"], 0.07, { gain: 0.02, duty: 0.25 });
sweep(END - 0.9, END - 0.2, false, 0.4, 200, 600);

// ---- bed: a light sunny tune, C – Am – F – G, whole bars over the loop; sparse under the shelter panel
const BARS = 22, BAR = END / BARS, BEAT = BAR / 4, prog = [[48, 52, 55, 60], [45, 48, 52, 57], [41, 45, 48, 53], [43, 47, 50, 55]];
const part = (t) => (t > EV.shelter && t < EV.weeksEnd ? "panel" : "full");
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = part(t); tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 24 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "panel" ? 0.065 : 0.085 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = part(t); if (s === "panel" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * 1.5, { duty: 0.125, f: () => NOTE(ch[[0, 2, 1, 3, 2, 1, 3, 2][s8]] + 12), v: (u) => 1 - 0.8 * u, gain: s === "full" ? 0.02 : 0.015 });
    if (s8 % 2 === 1 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.01 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
