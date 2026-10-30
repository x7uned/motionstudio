// Mix («The ghast's cry», not a loop; frozen copy of rps/film/mix.mjs + the demo stem): voice (single take, −16 LUFS) +
// the sound demos (each clip measured on its own and set to −16 LUFS, the voice's level; ducked by 4 dB wherever the voice
// speaks, so a demo longer than its pause runs on about 4 dB under the voice) + 8-bit sfx + chiptune bed (−12 dB under
// speech and under the demos) → final AAC muxed with the picture. Also writes qa/demo-levels.json: for every demo the
// loudness of the demo and of the voice over the demo window, and the part of the demo that plays under speech.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, DEMO, DEMO_ORDER } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.ceil(END * SR);
const run = (args) => execFileSync(FF, ["-hide_banner", "-nostdin", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
function loud(file, ss = null, dur = null) {
  const cut = ss == null ? "" : `-ss ${ss.toFixed(3)} -t ${dur.toFixed(3)} `;
  const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin ${cut}-i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 });
  const sum = r.slice(r.lastIndexOf("Summary")), I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(sum)?.[1]), TP = Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)?.[1]);
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1]));
  return { I, TP, Mmax };
}
const readWav = (file, len = N) => { const b = fs.readFileSync(file); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const fmt = b.readUInt16LE(20), bits = b.readUInt16LE(34), bytes = bits / 8, n = Math.min(len, b.readUInt32LE(off + 4) / bytes), out = new Float32Array(len);
  for (let i = 0; i < n; i++) out[i] = fmt === 3 ? b.readFloatLE(off + 8 + i * 4) : b.readInt16LE(off + 8 + i * 2) / 32768; return out; };
const writeF32 = (file, buf) => { const n = buf.length, out = Buffer.alloc(44 + n * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + n * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(n * 4, 40); for (let i = 0; i < n; i++) out.writeFloatLE(buf[i], 44 + i * 4); fs.writeFileSync(file, out); };
const db = (g) => +(20 * Math.log10(g)).toFixed(2);

const A = HERE + "audio/";
// 1) voice to −16 LUFS (measured, linear gain)
const v0 = loud(HERE + "voice/voice-raw.wav"), vGain = Math.pow(10, (-16 - v0.I) / 20);
const voice = readWav(HERE + "voice/voice-raw.wav").map((x) => x * vGain);
// 2) voice activity (attack 30 ms; release 350 ms for the bed duck −12 dB, 80 ms for the demo duck −4 dB)
const act = new Float32Array(N), actD = new Float32Array(N); { let e = 0, e2 = 0, acc = 0; const win = 480, rms = new Float32Array(N);
  for (let i = 0; i < N; i++) { acc += voice[i] * voice[i]; if (i >= win) acc -= voice[i - win] * voice[i - win]; rms[i] = Math.sqrt(Math.max(0, acc) / win); }
  const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.35 * SR)), relD = 1 - Math.exp(-1 / (0.08 * SR));
  for (let i = 0; i < N; i++) { const target = rms[i] > 0.02 ? 1 : 0; e += (target - e) * (target > e ? att : rel); act[i] = e; e2 += (target - e2) * (target > e2 ? att : relD); actD[i] = e2; } }
// 3) the demos: every clip to −16 LUFS on its own, placed on the film clock, ducked 4 dB under speech
const demos = new Float32Array(N), dAct = new Float32Array(N), info = {};
for (const k of DEMO_ORDER) {
  const f = A + `demos/${k}.wav`, L = loud(f), g = Math.pow(10, (-16 - L.I) / 20), clip = readWav(f, Math.round(5 * SR)), s0 = Math.round(DEMO[k].t0 * SR);
  let len = clip.length; while (len > 0 && clip[len - 1] === 0) len--;
  let under = 0; for (let i = 0; i < len; i++) { const j = s0 + i; if (j >= N) break; const duck = 1 - actD[j] * (1 - Math.pow(10, -4 / 20)); demos[j] += clip[i] * g * duck; dAct[j] = 1; if (actD[j] > 0.5) under++; }
  info[k] = { t0: +DEMO[k].t0.toFixed(3), len: +(len / SR).toFixed(3), clipLUFS: L.I, gain_dB: db(g), underVoice_s: +(under / SR).toFixed(3) };
}
// demo presence (smoothed) → the bed ducks under the demos too
const dEnv = new Float32Array(N); { let e = 0; const att = 1 - Math.exp(-1 / (0.03 * SR)), rel = 1 - Math.exp(-1 / (0.3 * SR)); for (let i = 0; i < N; i++) { e += (dAct[i] - e) * (dAct[i] > e ? att : rel); dEnv[i] = e; } }
// 4) sfx and bed to their targets: sfx loudest moments −20 LUFS, bed −30 LUFS integrated before ducking
const s0 = loud(A + "sfx.wav"), b0 = loud(A + "bed.wav");
const sGain = Math.pow(10, (-20 - s0.Mmax) / 20), bGain = Math.pow(10, (-30 - b0.I) / 20);
const sfx = readWav(A + "sfx.wav"), bed = readWav(A + "bed.wav"), low = Math.pow(10, -12 / 20);
const mix = new Float32Array(N);
for (let i = 0; i < N; i++) mix[i] = voice[i] + demos[i] + sfx[i] * sGain + bed[i] * bGain * (1 - Math.max(act[i], dEnv[i]) * (1 - low));
writeF32(A + "mix.wav", mix); writeF32(A + "voice-16.wav", voice); writeF32(A + "demos-mix.wav", demos);
// 5) final loudness −16 LUFS, true peak ≤ −1.5 dBTP (two-pass loudnorm, linear), 48 kHz stereo
const m0 = loud(A + "mix.wav");
const p1 = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${A}mix.wav" -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`], { encoding: "utf8" });
const ms = JSON.parse(p1.slice(p1.lastIndexOf("{"), p1.lastIndexOf("}") + 1));
run(["-y", "-i", A + "mix.wav", "-af", `loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${ms.input_i}:measured_TP=${ms.input_tp}:measured_LRA=${ms.input_lra}:measured_thresh=${ms.input_thresh}:offset=${ms.target_offset}:linear=true,aresample=48000`, "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", A + "mix-final.wav"]);
const m1 = loud(A + "mix-final.wav");
// 6) demo levels in the mix (before the final linear loudnorm gain, which moves everything by the same amount)
const levels = {};
for (const k of DEMO_ORDER) { const d = info[k], w = Math.max(0.42, d.len);
  const dm = loud(A + "demos-mix.wav", d.t0, w), vo = loud(A + "voice-16.wav", d.t0, w), mx = loud(A + "mix.wav", d.t0, w);
  levels[k] = { ...d, demo_Mmax_LUFS: dm.Mmax, voice_Mmax_LUFS_same_window: vo.Mmax, mix_Mmax_LUFS: mx.Mmax, demo_minus_voice_dB: vo.Mmax > -70 ? +(dm.Mmax - vo.Mmax).toFixed(1) : null }; }
fs.mkdirSync(HERE + "qa", { recursive: true });
fs.writeFileSync(HERE + "qa/demo-levels.json", JSON.stringify({ note: "momentary (400 ms) maxima over each demo window, stems before the final linear loudnorm; voice −16 LUFS integrated", finalGain_dB: +(m1.I - m0.I).toFixed(2), speechTypical_Mmax_LUFS: loud(A + "voice-16.wav").Mmax, levels }, null, 1));
console.log(JSON.stringify({ voice: v0, sfx: s0, bed: b0, gains: { vGain: +vGain.toFixed(3), sGain: +sGain.toFixed(3), bGain: +bGain.toFixed(3) }, mix: m0, final: m1 }));
console.log(JSON.stringify(levels, null, 0));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  run(["-y", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", HERE + "ghast-pixel.mp4"]);
  console.log("muxed", HERE + "ghast-pixel.mp4");
}
