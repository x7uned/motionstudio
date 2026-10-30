// 8-bit sound for «How to say "I love you" in cat»: every cue is synthesised and lasts exactly as
// long as its motion, on the picture's timeline. Loop film: the bed fills whole bars with no fades; anything that runs
// past END folds onto the start. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { face } from "./direction.mjs";

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

// ---- eyelids: every closing of the front cat's eyes is a soft falling shimmer, every opening a rising one, each lasting
// the lid's own motion (found by scanning the keyed lid curve)
{ let prev = face(0).lid, start = 0, dir = 0;
  for (let t = 1 / 60; t <= END; t += 1 / 60) { const l = face(t).lid, d = Math.sign(l - prev); if (d !== dir) { if (dir !== 0 && t - start > 0.12) { const a = start, b = t, up = dir < 0; tone(sfx, a, b - a, { duty: 0.125, f: (u) => (up ? 900 + 700 * u : 1600 - 700 * u), v: env(0.2, 0.3), gain: 0.008 }); tone(sfx, a, b - a, { wave: "tri", f: (u) => (up ? 330 + 110 * u : 440 - 110 * u), v: env(0.2, 0.3), gain: 0.022 }); } start = t; dir = d; } prev = l; } }
// hearts pop (two sparkly notes); tags
const heart = (t) => { seq(t, ["E6", "B6"], 0.07, { gain: 0.022, duty: 0.25 }); noise(t + 0.1, 0.25, () => 9000, (u) => 1 - u, 0.006); };
heart(EV.love); heart(EV.safe - 0.1); heart(EV.said - 0.1); heart(EV.blinkedBack1 + 0.3); heart(EV.hand - 0.05);
pop(EV.miss - 0.05, "C6", "E6", 0.016); pop(EV.slow - 0.05, "G6", "D7", 0.02);
for (let i = 0; i < 4; i++) blip(EV.slow + i * 0.22, ["C6", "E6", "G6", "C7"][i], 0.05, 0.014, 0.25);
// the hard stare: a low tense drone as long as the stare, a sting on "threat"
tone(sfx, EV.hard - 0.1, EV.closing - EV.hard + 0.2, { wave: "tri", f: (u, tt) => 98 + 4 * Math.sin(tt * 30), v: env(0.25, 0.25), gain: 0.04 });
seq(EV.threat - 0.05, ["F#5", "C5"], 0.09, { gain: 0.03, duty: 0.5 });
// purring: low pulsing noise while the cat purrs
const purr = (a, b) => { for (let t = a; t < b; t += 1 / 24) noise(t, 0.03, () => 160, (u) => Math.sin(Math.PI * u), 0.035); };
purr(EV.means, EV.safeEnd); purr(EV.said, EV.too2End);
// the study: a page-turn swish into the side scene, the owner's and the cat's blinks get soft chimes, "blinks back"
noise(EV.tested - 0.3, 0.7, (u) => 1200 + 2500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012); pop(EV.y2020 - 0.05, "C6", "G6", 0.02);
seq(EV.slowBlinked, ["G5", "E5"], 0.25, { gain: 0.014, duty: 0.25 }); seq(EV.blinkedBack1, ["E5", "G5"], 0.25, { gain: 0.016, duty: 0.25 });
// the stranger's arm reaches in (whoosh as long as it reaches), the cat's blink, its paw steps, a sniff on the hand
noise(EV.stranger1, 0.7, (u) => 900 + 1800 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012);
seq(EV.blinked2 - 0.1, ["E5", "G5"], 0.25, { gain: 0.016, duty: 0.25 });
for (let t = EV.walk - 0.1; t < EV.hand - 0.05; t += 0.22) noise(t, 0.04, () => 1400, (u) => 1 - u, 0.01);
for (let k = 0; k < 3; k++) noise(EV.hand + k * 0.13, 0.05, () => 5000, (u) => Math.sin(Math.PI * u), 0.012);
// the tutorial: step blips, the viewer's eyes (soft falling/rising tones lasting the lids), counting "1… 2"
pop(EV.want - 0.05, "C6", "E6", 0.02); blip(EV.soft - 0.05, "C6", 0.06, 0.02, 0.25); blip(EV.slowly2 - 0.05, "E6", 0.06, 0.02, 0.25); blip(EV.open - 0.05, "G6", 0.06, 0.02, 0.25);
tone(sfx, EV.close2 - 0.05, 0.55, { wave: "tri", f: (u) => 440 - 110 * u, v: env(0.2, 0.3), gain: 0.02 }); tone(sfx, EV.open - 0.05, 0.5, { wave: "tri", f: (u) => 330 + 110 * u, v: env(0.2, 0.3), gain: 0.02 });
blip(EV.second - 0.03, "A5", 0.06, 0.016, 0.5); blip(EV.two - 0.03, "A5", 0.06, 0.016, 0.5);
seq(EV.too2 - 0.05, ["C6", "E6", "G6", "C7"], 0.07, { gain: 0.018, duty: 0.25 });

// ---- bed: a tender tune, Fmaj7 – Em7 – Dm7 – Cmaj7, whole bars over the loop; softer under the stare
const BARS = 18, BAR = END / BARS, BEAT = BAR / 4, prog = [[41, 45, 48, 52], [40, 43, 47, 50], [38, 41, 45, 48], [36, 40, 43, 47]];
const part = (t) => (t > EV.hard && t < EV.closing ? "stare" : "full");
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = part(t); tone(bed, t, BEAT * 0.95, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "stare" ? 0.05 : 0.08 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = part(t); if (s === "stare" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * 1.7, { duty: 0.125, f: () => NOTE(ch[[0, 2, 1, 3, 2, 1, 3, 2][s8]] + 24), v: (u) => 1 - 0.8 * u, gain: s === "full" ? 0.02 : 0.013 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
