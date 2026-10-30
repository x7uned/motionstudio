// Mix («Pumpkin face»): the single voice take placed at VOICE_AT (−16 LUFS, centre) + the 8-bit bed (−27 LUFS,
// ducked a further −1 dB under speech, so it sits ≈ 12 dB under the voice) + the events (loudest moment −20 LUFS
// momentary, between and under the words) → final −16 LUFS integrated (linear gain + peak limiter at −2.4 dBFS), true peak ≤ −1 dBTP, 48 kHz stereo AAC,
// muxed with the picture → pumpkin-face-high.mp4. No fade at the end: the bed cycles with the picture's loop.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, VOICE_AT, VOICE_DIR } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.round(END * SR), A = HERE + "audio/";
const OUT = HERE + "pumpkin-face-high.mp4";
const loud = (file) => { const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 }); const s = r.slice(r.lastIndexOf("Summary"));
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1])); return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]), Mmax }; };
const readWav = (file, offset = 0) => { const b = fs.readFileSync(file); const ch = b.readUInt16LE(22), sr = b.readUInt32LE(24); if (sr !== SR) throw new Error(`${file}: ${sr} Hz`); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const len = b.readUInt32LE(off + 4) / 2 / ch, out = [new Float32Array(N), new Float32Array(N)], o = Math.round(offset * SR); for (let i = 0; i < len && i + o < N; i++) for (let c = 0; c < 2; c++) out[c][i + o] = b.readInt16LE(off + 8 + (i * ch + Math.min(c, ch - 1)) * 2) / 32768; return out; };
const VW = VOICE_DIR + "voice-raw.wav";
const v0 = loud(VW), m0 = loud(A + "bed.wav"), s0 = loud(A + "sfx.wav");
// the mono voice goes to both channels: as dual mono it measures +3.01 LU louder than the mono file
const vG = 10 ** ((-16 - (v0.I + 3.01)) / 20), mG = 10 ** ((-27 - m0.I) / 20), sG = 10 ** ((-20 - s0.Mmax) / 20);
const [voice] = readWav(VW, VOICE_AT), bed = readWav(A + "bed.wav"), sfx = readWav(A + "sfx.wav");
// ducking envelope from the voice (attack 40 ms, release 350 ms)
const duck = new Float32Array(N); { let e = 0, acc = 0; const w = 480, rms = new Float32Array(N); for (let i = 0; i < N; i++) { const x = voice[i] * vG; acc += x * x; if (i >= w) { const y = voice[i - w] * vG; acc -= y * y; } rms[i] = Math.sqrt(Math.max(0, acc) / w); }
  const at = 1 - Math.exp(-1 / (0.04 * SR)), rl = 1 - Math.exp(-1 / (0.35 * SR)); for (let i = 0; i < N; i++) { const tg = rms[i] > 0.02 ? 1 : 0; e += (tg - e) * (tg > e ? at : rl); duck[i] = 1 - e * (1 - 10 ** (-1 / 20)); } }
const out = Buffer.alloc(44 + N * 8); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 8, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 8, 28); out.writeUInt16LE(8, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 8, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeFloatLE(voice[i] * vG + bed[c][i] * mG * duck[i] + sfx[c][i] * sG, 44 + (i * 2 + c) * 4);
fs.writeFileSync(A + "mix.wav", out);
// linear gain to −16 LUFS, then a peak limiter (the voice's crest is high); re-measure and correct the gain twice
let gain = -16 - loud(A + "mix.wav").I, fin = null;
for (let k = 0; k < 4; k++) {
  execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", A + "mix.wav", "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=${10 ** (-2.4 / 20)}:attack=2:release=80:level=disabled,aresample=48000,atrim=end_sample=${N}`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
  fin = loud(A + "mix-final.wav"); if (Math.abs(fin.I + 16) < 0.05) break; gain += -16 - fin.I;
}
console.log(JSON.stringify({ voice: v0, bed: m0, sfx: s0, gains: { vG: +vG.toFixed(3), mG: +mG.toFixed(3), sG: +sG.toFixed(3), finaldB: +gain.toFixed(2) }, final: fin }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", OUT]);
  console.log("muxed", OUT);
}
