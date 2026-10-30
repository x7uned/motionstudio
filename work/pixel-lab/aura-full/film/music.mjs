// Background music: the user's TikTok phonk (music/source.mp3, sha256 82e34340…), edited to the single voice take.
//  A · film 0 → "Time": track 15.19 → (build-up, riser, first drop on "Ten thousand aura") → on "Time" a tape stop
//      (speed 1 → 0 over 0.42 s, darkening) — the music dies with time;
//  B · film 26.13 → 27.62: track 44.00 → 45.49, the tail of the track's own break, fading in under "You don't.";
//  C · film 27.62 → END: track 45.49 → the second drop on "One billion" (B and C are one continuous read);
//  0.45 s fade at the end (four bars after the drop). → audio/music.wav (48 kHz stereo)
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, MUSIC, EV } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR);
const raw = execFileSync(FF, ["-v", "error", "-i", HERE + MUSIC.file, "-ac", "2", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 30 });
const src = new Float32Array(raw.buffer, raw.byteOffset, raw.length / 4), NS = src.length / 2;
const out = [new Float32Array(N), new Float32Array(N)];
const read = (pos, ch) => { const k = Math.floor(pos), f = pos - k, s = (j) => src[Math.max(0, Math.min(NS - 1, j)) * 2 + ch], p0 = s(k - 1), p1 = s(k), p2 = s(k + 1), p3 = s(k + 2); return p1 + 0.5 * f * (p2 - p0 + f * (2 * p0 - 5 * p1 + 4 * p2 - p3 + f * (3 * (p1 - p2) + p3 - p0))); };
// A with the tape stop
{ const STOP = 0.42, lp = [0, 0]; let pos = MUSIC.A.from * SR;
  for (let i = 0; i < N; i++) { const t = i / SR; if (t > MUSIC.A.to + STOP) break;
    const u = Math.max(0, (t - MUSIC.A.to) / STOP), r = t < MUSIC.A.to ? 1 : Math.pow(1 - u, 1.6), fc = 18000 * Math.pow(600 / 18000, u), a = 1 - Math.exp((-2 * Math.PI * fc) / SR), g = Math.min(1, t / 0.02) * (u > 0.85 ? (1 - u) / 0.15 : 1);
    for (let ch = 0; ch < 2; ch++) { lp[ch] += a * (read(pos, ch) - lp[ch]); out[ch][i] += lp[ch] * g; }
    pos += r; } }
// B + C: one continuous read from track 44.00, fading in
{ const i0 = Math.round(MUSIC.B.film * SR); let pos = MUSIC.B.from * SR;
  for (let i = i0; i < N; i++) { const t = i / SR, g = Math.min(1, (t - MUSIC.B.film) / 0.15) * Math.min(1, (END - t) / 0.45);
    for (let ch = 0; ch < 2; ch++) out[ch][i] += read(pos, ch) * Math.max(0, g); pos += 1; } }
const buf = Buffer.alloc(44 + N * 4); buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) for (let ch = 0; ch < 2; ch++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[ch][i])) * 32767), 44 + (i * 2 + ch) * 2);
fs.mkdirSync(HERE + "audio", { recursive: true }); fs.writeFileSync(HERE + "audio/music.wav", buf);
console.log(`music.wav ${END.toFixed(2)} s · drop 1 at film ${(24.01 - MUSIC.A.from).toFixed(2)} ("ten" ${EV.ten}) · tape stop ${MUSIC.A.to} · drop 2 at ${MUSIC.C.film.toFixed(2)} ("billion" ${EV.billion})`);
