// Sound effects for «Infinite aura» — the user asked for few effects (music carries it): exactly four, each on its picture
// event: the T-rex's first roar (dinos MOTIONS 11.16), the big "explodes" boom (16.08, the chain's landing blast), the
// time-stop "vwoom" on "Time" (with the music's tape stop) and a rising shimmer for "Infinite aura" (space warp 30.64).
// → audio/sfx.wav (48 kHz mono)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, EV } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.ceil(END * SR), sfx = new Float32Array(N), TAU = 2 * Math.PI;
let seed = 99; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const LP = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x) => (y += a * (x - y)); };
// 1) roar: a growl (sawtooth ~70 Hz with jitter) through a wide band of noise, 1.05 s, opening then closing
{ const t0 = 11.16, d = 1.05, lp = LP(1400), lp2 = LP(380); let ph = 0;
  for (let i = 0; i < d * SR; i++) { const tt = i / SR, u = tt / d, f = 62 + 22 * Math.sin(Math.PI * u) + 6 * rand(); ph += f / SR; const saw = 2 * (ph % 1) - 1, env = Math.min(1, tt / 0.06) * Math.pow(1 - u, 0.8);
    sfx[Math.round(t0 * SR) + i] += (lp2(saw) * 0.9 + lp(rand()) * 0.55) * env * 0.55; } }
// 2) the big boom on "explodes": sub thump + noise burst
{ const t0 = EV.explodes, lp = LP(260); for (let i = 0; i < 1.4 * SR; i++) { const tt = i / SR; sfx[Math.round(t0 * SR) + i] += (Math.sin(TAU * (34 + 40 * Math.exp(-tt * 9)) * tt) * 0.9 + lp(rand()) * 1.8) * Math.exp(-tt * 3.2) * Math.min(1, tt / 0.006) * 0.5; } }
// 3) the time stop: reversed swell into a falling vwoom
{ const T0 = EV.time - 0.04; let hp = 0, prev = 0;
  for (let i = Math.round((T0 - 0.3) * SR); i < Math.round(T0 * SR); i++) { const u = (i / SR - (T0 - 0.3)) / 0.3, x = rand(); hp = 0.97 * (hp + x - prev); prev = x; sfx[i] += hp * 0.16 * u * u; }
  let ph = 0, ph2 = 0; for (let i = Math.round(T0 * SR); i < Math.round((T0 + 1.1) * SR); i++) { const tt = i / SR - T0, u = tt / 1.1, f = 45 + 275 * Math.pow(1 - u, 2.4); ph += f / SR; ph2 += (2 * f) / SR; sfx[i] += (Math.sin(TAU * ph) * 0.5 + Math.sin(TAU * ph2) * 0.12) * Math.min(1, tt / 0.03) * Math.pow(1 - u, 1.6); } }
// 4) "Infinite aura": a bright rising shimmer (detuned sines sweeping up an octave)
{ const t0 = EV.infinite - 0.08, d = 1.3; for (let i = 0; i < d * SR; i++) { const tt = i / SR, u = tt / d; let v = 0; for (const [f, g] of [[523.25, 1], [659.25, 0.8], [783.99, 0.7], [1046.5, 0.5]]) v += Math.sin(TAU * f * Math.pow(2, u * 0.9) * tt * (1 + 0.003 * g)) * g;
  sfx[Math.round(t0 * SR) + i] += v * 0.06 * Math.min(1, tt / 0.15) * Math.pow(1 - u, 1.4); } }
for (let i = Math.round((END - 0.3) * SR); i < N; i++) sfx[i] *= Math.max(0, (END - i / SR) / 0.3);
const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sfx[i])) * 32767), 44 + i * 2);
fs.mkdirSync(HERE + "audio", { recursive: true }); fs.writeFileSync(HERE + "audio/sfx.wav", out); console.log("sfx.wav: roar, boom, time stop, infinite shimmer");
