// Mix («Pumpkin face»): the shared voice take placed at t = 0.30 s (−16 LUFS, centre) + the 8-bit bed (−28 LUFS integrated,
// −6 dB under speech) + the events (loudest moment −20 LUFS momentary, not ducked) → final −16 LUFS, true peak ≤ −1.5 dBTP,
// 48 kHz stereo AAC, muxed with the picture → pumpkin-face-medium.mp4.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, VOICE_FILE, VOICE_AT } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.round(END * SR), A = HERE + "audio/";
const loud = (file) => { const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 }); const s = r.slice(r.lastIndexOf("Summary"));
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1])); return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]), Mmax }; };
const readWav = (file, offset = 0) => { const b = fs.readFileSync(file); const ch = b.readUInt16LE(22); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const len = b.readUInt32LE(off + 4) / 2 / ch, o = Math.round(offset * SR), out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < len; i++) { const j = i + o; if (j >= N) break; for (let c = 0; c < 2; c++) out[c][j] = b.readInt16LE(off + 8 + (i * ch + Math.min(c, ch - 1)) * 2) / 32768; } return { out, len }; };
const v0 = loud(VOICE_FILE), m0 = loud(A + "bed.wav"), s0 = loud(A + "sfx.wav");
const vG = 10 ** ((-16 - v0.I) / 20), mG = 10 ** ((-28 - m0.I) / 20), sG = 10 ** ((-20 - s0.Mmax) / 20);
const V = readWav(VOICE_FILE, VOICE_AT), voice = V.out[0], music = readWav(A + "bed.wav").out, sfx = readWav(A + "sfx.wav").out;
if (V.len / SR + VOICE_AT > END) throw new Error("voice does not fit");
const duck = new Float32Array(N); { let e = 0, acc = 0; const w = 480, rms = new Float32Array(N); for (let i = 0; i < N; i++) { const x = voice[i] * vG; acc += x * x; if (i >= w) { const y = voice[i - w] * vG; acc -= y * y; } rms[i] = Math.sqrt(Math.max(0, acc) / w); }
  const at = 1 - Math.exp(-1 / (0.03 * SR)), rl = 1 - Math.exp(-1 / (0.3 * SR)); for (let i = 0; i < N; i++) { const tg = rms[i] > 0.02 ? 1 : 0; e += (tg - e) * (tg > e ? at : rl); duck[i] = 1 - e * (1 - 10 ** (-6 / 20)); } }
const out = Buffer.alloc(44 + N * 8); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 8, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 8, 28); out.writeUInt16LE(8, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 8, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeFloatLE(voice[i] * vG + music[c][i] * mG * duck[i] + sfx[c][i] * sG, 44 + (i * 2 + c) * 4);
fs.writeFileSync(A + "mix.wav", out);
const p1 = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${A}mix.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", A + "mix.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
console.log(JSON.stringify({ voice: v0, bed: m0, sfx: s0, gains: { vG: +vG.toFixed(3), mG: +mG.toFixed(3), sG: +sG.toFixed(3) }, loudnorm: { input_i: ms.input_i, input_tp: ms.input_tp, type: ms.normalization_type }, final: loud(A + "mix-final.wav") }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", String(END), "-movflags", "+faststart", HERE + "pumpkin-face-medium.mp4"]);
  console.log("muxed pumpkin-face-medium.mp4");
}
