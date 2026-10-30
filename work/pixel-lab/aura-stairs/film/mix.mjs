// Mix (aura test): voice (single take, −16 LUFS, centre) + the user's TikTok track as the bed (−19 LUFS integrated before
// ducking, −6 dB under speech: brainrot music stays present) + one time-stop effect → final −16 LUFS, true peak ≤ −1.5 dBTP,
// 48 kHz stereo AAC, muxed with the picture.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR), A = HERE + "audio/";
const loud = (file) => { const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 }); const s = r.slice(r.lastIndexOf("Summary"));
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1])); return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]), Mmax }; };
const readWav = (file) => { const b = fs.readFileSync(file); const ch = b.readUInt16LE(22); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const len = b.readUInt32LE(off + 4) / 2 / ch, out = [new Float32Array(N), new Float32Array(N)]; for (let i = 0; i < Math.min(len, N); i++) for (let c = 0; c < 2; c++) out[c][i] = b.readInt16LE(off + 8 + (i * ch + Math.min(c, ch - 1)) * 2) / 32768; return out; };
const v0 = loud(HERE + "voice/voice-raw.wav"), m0 = loud(A + "music.wav"), s0 = loud(A + "sfx.wav");
const vG = 10 ** ((-16 - v0.I) / 20), mG = 10 ** ((-19 - m0.I) / 20), sG = 10 ** ((-21 - s0.Mmax) / 20);
const [voice] = readWav(HERE + "voice/voice-raw.wav"), music = readWav(A + "music.wav"), [sfx] = readWav(A + "sfx.wav");
// ducking envelope from the voice (attack 30 ms, release 300 ms)
const duck = new Float32Array(N); { let e = 0, acc = 0; const w = 480, rms = new Float32Array(N); for (let i = 0; i < N; i++) { const x = voice[i] * vG; acc += x * x; if (i >= w) { const y = voice[i - w] * vG; acc -= y * y; } rms[i] = Math.sqrt(Math.max(0, acc) / w); }
  const at = 1 - Math.exp(-1 / (0.03 * SR)), rl = 1 - Math.exp(-1 / (0.3 * SR)); for (let i = 0; i < N; i++) { const tg = rms[i] > 0.02 ? 1 : 0; e += (tg - e) * (tg > e ? at : rl); duck[i] = 1 - e * (1 - 10 ** (-6 / 20)); } }
const out = Buffer.alloc(44 + N * 8); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 8, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 8, 28); out.writeUInt16LE(8, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 8, 40);
for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeFloatLE(voice[i] * vG + music[c][i] * mG * duck[i] + sfx[i] * sG, 44 + (i * 2 + c) * 4);
fs.writeFileSync(A + "mix.wav", out);
const p1 = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${A}mix.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", A + "mix.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
console.log(JSON.stringify({ voice: v0, music: m0, sfx: s0, gains: { vG: +vG.toFixed(3), mG: +mG.toFixed(3), sG: +sG.toFixed(3) }, final: loud(A + "mix-final.wav") }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", HERE + "aura-stairs-pixel.mp4"]);
  console.log("muxed aura-stairs-pixel.mp4");
}
