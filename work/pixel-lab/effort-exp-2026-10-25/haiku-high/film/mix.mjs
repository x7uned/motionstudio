// «Pumpkin face» mix: voice (shared take, placed at VOICE_AT) + 8-bit bed (ducked −12 dB under speech) + one sound per motion
// → loudnorm two-pass to −16 LUFS, true peak ≤ −1.5 dBTP, 48 kHz stereo AAC, muxed with the picture → the master.
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, VOICE_AT, VOICE_FILE } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR), A = HERE + "audio/";
const MASTER = "pumpkin-face-haiku-high.mp4";
const run = (args) => { const r = spawnSync(FF, ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", maxBuffer: 1 << 28 }); if (r.error) throw r.error; if (r.status !== 0) throw new Error(r.stderr.slice(-2000)); return (r.stdout || "") + (r.stderr || ""); };
const measure = (file) => { const r = run(["-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"]); const s = r.slice(r.lastIndexOf("Summary"));
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]) }; };
const readWav = (file) => { const b = fs.readFileSync(file); const ch = b.readUInt16LE(22); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const len = b.readUInt32LE(off + 4) / 2 / ch, out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < Math.min(len, N); i++) for (let c = 0; c < 2; c++) out[c][i] = b.readInt16LE(off + 8 + (i * ch + Math.min(c, ch - 1)) * 2) / 32768; return out; };
// voice: mono take at VOICE_AT
const vraw = readWav(VOICE_FILE), voice = [new Float32Array(N), new Float32Array(N)], off = Math.round(VOICE_AT * SR);
for (let i = 0; i + off < N; i++) { voice[0][i + off] = vraw[0][i]; voice[1][i + off] = vraw[0][i]; }
const bed = readWav(A + "bed.wav"), sfx = readWav(A + "sfx.wav");
const peak = (buf) => { let p = 0; for (const ch of buf) for (let i = 0; i < ch.length; i++) p = Math.max(p, Math.abs(ch[i])); return p; };
// levels: bed and sfx relative to the voice (voice I measured on the placed take)
const vIn = measure(VOICE_FILE).I, bIn = measure(A + "bed.wav").I, vPk = 20 * Math.log10(peak(voice));
const bedG = 10 ** ((vIn - 6 - bIn) / 20);                        // bed in the pauses ≈ 6 dB under the voice
const sfxG = 10 ** ((vPk - 8 - 20 * Math.log10(peak(sfx))) / 20);  // event sounds peak ≈ 8 dB under the voice peak
// ducking envelope from the voice (RMS 50 ms, attack 30 ms, release 300 ms): −12 dB under speech
const duck = new Float32Array(N); {
  const w = Math.round(0.05 * SR), rms = new Float32Array(N); let acc = 0;
  for (let i = 0; i < N; i++) { const x = voice[0][i]; acc += x * x; if (i >= w) { const y = voice[0][i - w]; acc -= y * y; } rms[i] = Math.sqrt(Math.max(0, acc) / w); }
  const at = 1 - Math.exp(-1 / (0.03 * SR)), rl = 1 - Math.exp(-1 / (0.3 * SR)); let e = 0;
  for (let i = 0; i < N; i++) { const tg = rms[i] > 0.01 ? 1 : 0; e += (tg - e) * (tg > e ? at : rl); duck[i] = 1 - e * (1 - 10 ** (-12 / 20)); }
}
const out = Buffer.alloc(44 + N * 8);
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 8, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 8, 28); out.writeUInt16LE(8, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 8, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeFloatLE(voice[c][i] + bed[c][i] * bedG * duck[i] + sfx[c][i] * sfxG, 44 + (i * 2 + c) * 4);
fs.writeFileSync(A + "mix.wav", out);
// loudnorm: measure, then linear normalisation to −16 LUFS / −1.5 dBTP
const p1 = run(["-i", A + "mix.wav", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"]);
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
run(["-y", "-v", "error", "-i", A + "mix.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
console.log(JSON.stringify({ voiceI: vIn, bedI: bIn, bedG: +bedG.toFixed(3), sfxG: +sfxG.toFixed(3), voicePeakDb: +vPk.toFixed(2), final: measure(A + "mix-final.wav") }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  run(["-y", "-v", "error", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", String(END), "-movflags", "+faststart", HERE + MASTER]);
  console.log("muxed", MASTER);
}
