// The one sound effect (the user asked for minimal effects, music only): the time stop on "time" — a short reversed-
// cymbal swell into a deep downward "vwoom" and a soft sub thump as the grey wave leaves him. → audio/sfx.wav (mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, EV } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.ceil(END * SR), sfx = new Float32Array(N);
let seed = 7; const rand = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296) * 2 - 1;
const T0 = EV.time - 0.04;
// swell: high-passed noise rising over 0.3 s up to the wave
{ let hp = 0, prev = 0; for (let i = Math.round((T0 - 0.3) * SR); i < Math.round(T0 * SR); i++) { const u = (i / SR - (T0 - 0.3)) / 0.3, x = rand(); hp = 0.97 * (hp + x - prev); prev = x; sfx[i] += hp * 0.18 * u * u; } }
// vwoom: a sine falling 320 → 45 Hz over 0.9 s with a soft attack, plus its octave, decaying
{ let ph = 0, ph2 = 0; for (let i = Math.round(T0 * SR); i < Math.min(N, Math.round((T0 + 1.1) * SR)); i++) { const tt = i / SR - T0, u = tt / 1.1, f = 45 + 275 * Math.pow(1 - u, 2.4); ph += f / SR; ph2 += (2 * f) / SR;
  const env = Math.min(1, tt / 0.03) * Math.pow(1 - u, 1.6); sfx[i] += (Math.sin(2 * Math.PI * ph) * 0.5 + Math.sin(2 * Math.PI * ph2) * 0.12) * env; } }
// end: 0.2 s fade so nothing is cut
for (let i = Math.round((END - 0.2) * SR); i < N; i++) sfx[i] *= Math.max(0, (END - i / SR) / 0.2);
const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sfx[i])) * 32767), 44 + i * 2);
fs.mkdirSync(HERE + "audio", { recursive: true }); fs.writeFileSync(HERE + "audio/sfx.wav", out); console.log("sfx.wav: one time-stop effect at", T0.toFixed(2), "s");
