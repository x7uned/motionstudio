// Background music: the user's TikTok track (music/source.mp3, sha256 82e34340…) from its drop at 24.000 s. Played at
// normal speed, then tape-slowed to 55 % when time stops (pitch falls with the speed, like a turntable), with a
// darkening low-pass; 10 ms fade-in at the cut, 0.3 s fade-out at the end. → audio/music.wav (48 kHz stereo).
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, MUSIC, musicRate, SLOW } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000;
const raw = execFileSync(FF, ["-v", "error", "-ss", String(MUSIC.from), "-t", "8", "-i", HERE + MUSIC.file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const src = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), NS = src.length / 2, N = Math.ceil(END * SR);
const out = [new Float32Array(N), new Float32Array(N)];
let pos = 0; const lp = [0, 0];
for (let i = 0; i < N; i++) {
  const t = i / SR, r = musicRate(t), k = Math.floor(pos), f = pos - k;
  // cubic (Catmull-Rom) read
  for (let ch = 0; ch < 2; ch++) {
    const s = (j) => src[Math.max(0, Math.min(NS - 1, j)) * 2 + ch], p0 = s(k - 1), p1 = s(k), p2 = s(k + 1), p3 = s(k + 2);
    let v = p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0)));
    // the slowed part sounds "under water": one-pole low-pass from open to ~2.4 kHz
    const slowK = (1 - r) / 0.45, fc = 18000 * Math.pow(2400 / 18000, slowK), a = 1 - Math.exp((-2 * Math.PI * fc) / SR);
    lp[ch] += a * (v - lp[ch]); v = lp[ch];
    const g = Math.min(1, t / 0.01, (END - t) / 0.3);
    out[ch][i] = v * Math.max(0, g);
  }
  pos += r;
}
const buf = Buffer.alloc(44 + N * 4); buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[ch][i])) * 32767), 44 + (i * 2 + ch) * 2);
fs.mkdirSync(HERE + "audio", { recursive: true }); fs.writeFileSync(HERE + "audio/music.wav", buf);
console.log(`music.wav ${END}s, source used ${(pos / SR).toFixed(2)} s (from ${MUSIC.from} s), slow-down from ${SLOW.a.toFixed(2)} s`);
