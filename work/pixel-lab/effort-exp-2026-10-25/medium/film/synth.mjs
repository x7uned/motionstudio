// «Pumpkin face» — sound, all synthesised. audio/bed.wav: an 8-bit spooky bed in A minor (organ squares Am – F – E – Am,
// slow triangle bass, a bell on the downbeats). audio/sfx.wav: one 8-bit sound per visible motion, each lasting exactly
// its motion window from timeline.mjs (MOTIONS below). 48 kHz stereo 16-bit.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, EV, B } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.round(END * SR), TAU = Math.PI * 2;
const bed = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 777; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (buf, i, v, pan = 0) => { if (i < 0 || i >= N) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); buf[0][i] += v * l * 1.414; buf[1][i] += v * r * 1.414; };
const LP = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x, f2) => { const aa = f2 ? 1 - Math.exp((-TAU * f2) / SR) : a; y += aa * (x - y); return y; }; };
const BP = (lo, hi) => { const l1 = LP(lo), l2 = LP(hi); return (x) => l2(x - l1(x)); };
const sq = (ph, duty = 0.5) => ((ph % 1) < duty ? 1 : -1);
const tri = (ph) => 4 * Math.abs((ph % 1) - 0.5) - 1;
const nf = (m) => 440 * 2 ** ((m - 69) / 12);
const env = (u, a = 0.08, r = 0.2) => Math.min(1, u / a, (1 - u) / r);   // u in 0..1 of the window (relative a/r)

/** Every sound = one motion: [t0, t1, kind, note]. Durations come from the picture's own windows. */
export const MOTIONS = [
  [B.eyeL[0], B.eyeL[1], "carve", "left hole"],
  [B.eyeR[0], B.eyeR[1], "carve", "right hole"],
  [B.mouth[0], B.mouth[1], "slice", "the line"],
  [B.brain[0], B.brain[1], "rise", "brain grows in"],
  [B.lock[0], B.lock[1], "tick", "brackets close"],
  [EV.face - 0.02, EV.face + 0.3, "chime", "face lock"],
  [B.counter[0], B.counter[1], "swish", "counter card"],
  [B.signal[0], B.signal[1], "count", "signal + counter 0→165 ms"],
  [B.lockOut[0], B.lockOut[1], "dissolve", "brackets dissolve"],
  [B.signal[1] - 0.02, B.signal[1] + 0.22, "pop", "signal arrives"],
  [B.label[0], B.label[1], "blip", "FACE AREA tag"],
  [B.light[0], B.light[1], "glow", "face area lights up"],
  [B.ring[0], B.ring[1], "sparkle", "pulse ring"],
  [B.pumpGlow[0], B.pumpGlow[1], "flare", "pumpkin flares"],
  [B.smile[0], B.smile[1], "boing", "grin"],
  [B.wink[0], B.wink[1], "wink", "wink"],
];

// ---------------------------------------------------------------- bed (A minor; chords on the story: Am → F on "area" → E on "pumpkin" → Am payoff)
const CH = [[0, [57, 60, 64], 45], [EV.area - 0.1, [53, 57, 60], 41], [EV.pumpkin - 0.1, [52, 56, 59], 40], [B.smile[0], [57, 60, 64], 45], [END + 1, null, 0]];
for (let i = 0; i < N; i++) {
  const t = i / SR; let k = 0; while (CH[k + 1][0] <= t) k++;
  const [t0, notes, bass] = CH[k], since = t - t0, x = Math.min(1, since / 0.12);           // short glide into each chord
  const prev = k > 0 ? CH[k - 1] : CH[k];
  let v = 0;
  notes.forEach((m, j) => { const f = nf(m) * (1 + 0.004 * Math.sin(TAU * 5 * t + j)); v += sq(f * t + j * 0.31, 0.25) * 0.05 * (x + (1 - x) * 0.6); });
  // organ arpeggio in eighths (≈ 100 bpm), soft
  const step = Math.floor(t / 0.3), m = notes[step % 3] + 12, u = (t % 0.3) / 0.3; v += sq(nf(m) * t, 0.125) * 0.028 * Math.exp(-u * 3);
  v += tri(nf(bass - 12) * t) * 0.16 * (0.8 + 0.2 * Math.sin(TAU * 0.5 * t));
  const fade = Math.min(1, t / 0.2, (END - t) / 0.5);
  add(bed, i, v * fade, 0.15 * Math.sin(TAU * 0.1 * t));
}
// bell on the chord changes
for (const t0 of [0.05, EV.area - 0.1, EV.pumpkin - 0.1, B.smile[0]]) { const s0 = Math.round(t0 * SR); for (let j = 0; j < 1.6 * SR; j++) { const tt = j / SR; let v = 0; for (const [r, g] of [[1, 1], [2.76, 0.5], [5.4, 0.25]]) v += Math.sin(TAU * nf(81) * r * tt) * g * Math.exp(-tt * (2.2 + r)); add(bed, s0 + j, v * 0.05 * Math.min(1, tt / 0.004) * Math.min(1, (END - (t0 + tt)) / 0.3), 0.3); } }

// ---------------------------------------------------------------- events
const span = (t0, t1, fn, pan = 0) => { const a = Math.round(t0 * SR), b = Math.round(t1 * SR); for (let i = a; i < b; i++) { const u = (i - a) / (b - a); add(sfx, i, fn(u, (i - a) / SR), pan); } };
for (const [t0, t1, kind] of MOTIONS) {
  if (kind === "carve") { const bp = BP(900, 5000); span(t0, t1, (u, tt) => bp(rand()) * (0.6 + 0.4 * sq(tt * 23)) * env(u, 0.1, 0.25) * 0.5, t0 < 0.6 ? -0.25 : 0.25); }
  if (kind === "slice") { const lp = LP(1000); span(t0, t1, (u) => lp(rand(), 800 + 5000 * u) * env(u, 0.08, 0.2) * 0.6, 0); }
  if (kind === "rise") span(t0, t1, (u, tt) => sq(tt * (220 + 440 * u * u), 0.25) * env(u, 0.15, 0.3) * 0.07);
  if (kind === "tick") { const n = 5; for (let q = 0; q < n; q++) { const a = t0 + (t1 - t0) * (1 - Math.pow(1 - q / n, 1.6)) - 0.02, d = 0.035; span(a, a + d, (u, tt) => sq(tt * 1760, 0.5) * env(u, 0.1, 0.5) * 0.05); } }
  if (kind === "chime") span(t0, t1, (u, tt) => (sq(tt * (u < 0.35 ? nf(81) : nf(88)), 0.25) * 0.06 + Math.sin(TAU * nf(88) * tt) * 0.05) * env(u, 0.03, 0.45));
  if (kind === "swish") { const lp = LP(2000); span(t0, t1, (u) => lp(rand(), 1500 + 3000 * Math.sin(Math.PI * u)) * Math.sin(Math.PI * u) * 0.25, -0.4); }
  if (kind === "count") { const steps = 12; for (let q = 0; q < steps; q++) { const uu = q / steps, a = t0 + (t1 - t0) * (uu * uu * (3 - 2 * uu)), d = 0.03; span(a, Math.min(t1, a + d), (u, tt) => sq(tt * (880 + 70 * q), 0.5) * env(u, 0.1, 0.5) * 0.035, -0.35); }
    span(t0, t1, (u, tt) => sq(tt * (330 + 330 * u), 0.125) * env(u, 0.1, 0.1) * 0.025, 0.2); }
  if (kind === "dissolve") { const bp = BP(2000, 8000); span(t0, t1, (u) => bp(rand()) * Math.sin(Math.PI * u) * 0.12); }
  if (kind === "pop") span(t0, t1, (u, tt) => Math.sin(TAU * (600 - 300 * u) * tt) * Math.exp(-u * 6) * 0.25 * Math.min(1, u / 0.03), 0.2);
  if (kind === "blip") span(t0, t1, (u, tt) => sq(tt * (u < 0.5 ? 1318 : 1568), 0.5) * env(u, 0.05, 0.3) * 0.04, 0.35);
  if (kind === "glow") span(t0, t1, (u, tt) => { const m = [69, 72, 76, 81][Math.min(3, Math.floor(u * 4))]; return (sq(tt * nf(m), 0.25) * 0.05 + Math.sin(TAU * nf(57) * tt) * 0.06 * u) * env(u, 0.05, 0.25); });
  if (kind === "sparkle") span(t0, t1, (u, tt) => Math.sin(TAU * (2400 + 1600 * Math.sin(TAU * 9 * tt)) * tt) * (0.5 + 0.5 * sq(tt * 18)) * (1 - u) * Math.min(1, u / 0.05) * 0.03, 0.1);
  if (kind === "flare") { const lp = LP(400); span(t0, t1, (u, tt) => (lp(rand(), 300 + 1200 * Math.sin(Math.PI * u)) * 0.5 + Math.sin(TAU * 110 * tt) * 0.1) * Math.sin(Math.PI * u)); }
  if (kind === "boing") span(t0, t1, (u, tt) => sq(tt * (300 + 500 * u + 40 * Math.sin(TAU * 14 * tt)), 0.5) * env(u, 0.05, 0.3) * 0.05);
  if (kind === "wink") span(t0, t1, (u, tt) => (sq(tt * (u < 0.5 ? nf(88) : nf(93)), 0.125) * 0.04 + Math.sin(TAU * 3520 * tt) * 0.02 * (1 - u)) * env(u, 0.05, 0.35), 0.1);
}

function write(file, buf) {
  const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  let pk = 0; for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = buf[c][i]; pk = Math.max(pk, Math.abs(v)); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + (i * 2 + c) * 2); }
  fs.writeFileSync(file, out); return pk;
}
if (process.argv[1] && process.argv[1].endsWith("synth.mjs")) {
  fs.mkdirSync(HERE + "audio", { recursive: true });
  console.log("bed peak", write(HERE + "audio/bed.wav", bed).toFixed(3), "sfx peak", write(HERE + "audio/sfx.wav", sfx).toFixed(3));
  fs.writeFileSync(HERE + "audio/motions.json", JSON.stringify(MOTIONS.map(([t0, t1, kind, note]) => ({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, note })), null, 1));
}
