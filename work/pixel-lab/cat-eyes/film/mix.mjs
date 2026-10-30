// Mix (cat-eyes film, loop): voice (single take, −16 LUFS) + 8-bit sfx + chiptune bed ducked −12 dB under speech → final AAC muxed with the picture.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR);
const run = (args) => execFileSync(FF, ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
function stats(file) {
  let err = "";
  try { execFileSync(FF, ["-hide_banner", "-nostdin", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { stdio: ["ignore", "ignore", "pipe"] }); } catch (e) { err = String(e.stderr); }
  const out = err || execFileSync(FF, ["-hide_banner", "-nostdin", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
  return out;
}
function loud(file) {
  const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
  const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r.slice(r.lastIndexOf("Summary")))?.[1]);
  const TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(r.slice(r.lastIndexOf("Summary")))?.[1]);
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1]));
  return { I, TP, Mmax };
}
const readWav = (file) => { const b = fs.readFileSync(file); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4); const len = b.readUInt32LE(off + 4) / 2, out = new Float32Array(N); for (let i = 0; i < Math.min(len, N); i++) out[i] = b.readInt16LE(off + 8 + i * 2) / 32768; return out; };
const writeWav = (file, buf) => { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); };

const A = HERE + "audio/";
// 1) voice to −16 LUFS (measured, linear gain; true peak checked at the end)
const v0 = loud(HERE + "voice/voice-raw.wav"), vGain = Math.pow(10, (-16 - v0.I) / 20);
const voice = readWav(HERE + "voice/voice-raw.wav").map((x) => x * vGain);
// 2) stems to their targets: sfx loudest moments −20 LUFS, bed −30 LUFS integrated before ducking
const s0 = loud(A + "sfx.wav"), b0 = loud(A + "bed.wav");
const sGain = Math.pow(10, (-20 - s0.Mmax) / 20), bGain = Math.pow(10, (-30 - b0.I) / 20);
const sfx = readWav(A + "sfx.wav"), bed = readWav(A + "bed.wav");
// 3) ducking envelope from the voice (attack 30 ms, release 350 ms), −12 dB under speech
const duck = new Float32Array(N); { let e = 0; const win = 480; let acc = 0; const rms = new Float32Array(N);
  for (let i = 0; i < N; i++) { acc += voice[i] * voice[i]; if (i >= win) acc -= voice[i - win] * voice[i - win]; rms[i] = Math.sqrt(Math.max(0, acc) / win); }
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.35 * SR));
  for (let i = 0; i < N; i++) { const target = rms[i] > 0.02 ? 1 : 0; e += (target - e) * (target > e ? att : rel); duck[i] = 1 - e * (1 - Math.pow(10, -12 / 20)); } }
const mix = new Float32Array(N);
for (let i = 0; i < N; i++) mix[i] = voice[i] + sfx[i] * sGain + bed[i] * bGain * duck[i];
// float WAV: no clipping before the loudness stage
{ const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40); for (let i = 0; i < N; i++) out.writeFloatLE(mix[i], 44 + i * 4); fs.writeFileSync(A + "mix.wav", out); }
// 4) final loudness −16 LUFS, true peak ≤ −1.5 dBTP (two-pass loudnorm), 48 kHz stereo
const m0 = loud(A + "mix.wav");
const p1 = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${A}mix.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
run(["-y", "-i", A + "mix.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
const m1 = loud(A + "mix-final.wav");
console.log(JSON.stringify({ voice: v0, sfx: s0, bed: b0, gains: { vGain: +vGain.toFixed(3), sGain: +sGain.toFixed(3), bGain: +bGain.toFixed(3) }, mix: m0, final: m1 }));
// loop: no -shortest — the master is exactly END long, and a shorter AAC track would leave a gap at the seam
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  run(["-y", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", HERE + "cat-eyes-pixel.mp4"]);
  console.log("muxed", HERE + "cat-eyes-pixel.mp4");
}
