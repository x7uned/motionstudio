// Mix («Pumpkin face»): voice (one take, placed at t = 0.30 s, −16 LUFS) + 8-bit sfx + A-minor bed ducked −12 dB under speech
// → final −16 LUFS, true peak ≤ −1.5 dBTP, 48 kHz stereo AAC, muxed with the picture.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, VOICE_AT } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR), A = HERE + "audio/";
const run = (args) => execFileSync(FF, ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
function loud(file) {
  const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
  const s = r.slice(r.lastIndexOf("Summary")); let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1]));
  return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]), Mmax };
}
const readWav = (file, off0 = 0) => { const b = fs.readFileSync(file); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4); const len = b.readUInt32LE(off + 4) / 2, out = new Float32Array(N); for (let i = 0; i < len && i + off0 < N; i++) out[i + off0] = b.readInt16LE(off + 8 + i * 2) / 32768; return out; };
// 1) voice to −16 LUFS (its own measurement, linear gain), shifted to t = 0.30 s
const v0 = loud(HERE + "voice/voice-raw.wav"), vGain = 10 ** ((-16 - v0.I) / 20);
const voice = readWav(HERE + "voice/voice-raw.wav", Math.round(VOICE_AT * SR)).map((x) => x * vGain);
// 2) stems to targets: sfx loudest moment −20 LUFS (momentary), bed −30 LUFS integrated before ducking
const s0 = loud(A + "sfx.wav"), b0 = loud(A + "bed.wav"), sGain = 10 ** ((-22 - s0.Mmax) / 20), bGain = 10 ** ((-30 - b0.I) / 20);
const sfx = readWav(A + "sfx.wav"), bed = readWav(A + "bed.wav");
// 3) ducking envelope from the voice (attack 30 ms, release 350 ms), −12 dB under speech
const duck = new Float32Array(N); { let e = 0, acc = 0; const win = 480, rms = new Float32Array(N);
  for (let i = 0; i < N; i++) { acc += voice[i] * voice[i]; if (i >= win) acc -= voice[i - win] * voice[i - win]; rms[i] = Math.sqrt(Math.max(0, acc) / win); }
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.35 * SR));
  for (let i = 0; i < N; i++) { const target = rms[i] > 0.02 ? 1 : 0; e += (target - e) * (target > e ? att : rel); duck[i] = 1 - e * (1 - 10 ** (-12 / 20)); } }
const mix = new Float32Array(N); for (let i = 0; i < N; i++) mix[i] = voice[i] + sfx[i] * sGain + bed[i] * bGain * duck[i];
{ const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40); for (let i = 0; i < N; i++) out.writeFloatLE(mix[i], 44 + i * 4); fs.writeFileSync(A + "mix.wav", out); }
// 4) a look-ahead limiter catches the speech/sfx peaks first, then two-pass loudnorm to −16 LUFS / −1.5 dBTP
run(["-y", "-i", A + "mix.wav", "-af", "alimiter=limit=0.85:attack=5:release=60:level=false", "-c:a", "pcm_f32le", A + "mix-lim.wav"]);
const m0 = loud(A + "mix-lim.wav");
const p1 = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${A}mix-lim.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
run(["-y", "-i", A + "mix-lim.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000,atrim=0:${END},apad=whole_dur=${END}`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
console.log(JSON.stringify({ voice: v0, sfx: s0, bed: b0, gains: { vGain: +vGain.toFixed(3), sGain: +sGain.toFixed(3), bGain: +bGain.toFixed(3) }, mix: m0, final: loud(A + "mix-final.wav") }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  run(["-y", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", HERE + "pumpkin-face-sonnet-high.mp4"]);
  console.log("muxed pumpkin-face-sonnet-high.mp4");
}
