// «Pumpkin face» — mix: the shared voice take (centre, placed at 0.30 s, never re-voiced or time-stretched) + the 8-bit bed
// (free level −22 LUFS, ducked 8 dB under speech) + the motion sounds (loudest moment −20 LUFS momentary, 3 dB duck under
// speech) → gain to −16 LUFS integrated → look-ahead peak limiter (4× interpolated peaks, ceiling −2.0 dBFS so the AAC
// stays under −1 dBTP) → 48 kHz stereo → AAC 192k muxed with the picture → pumpkin-face-xhigh.mp4.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { END, VOICE_AT, VOICE_FILE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000, N = Math.round(END * SR), A = HERE + "audio/";
const OUT = HERE + "pumpkin-face-xhigh.mp4";
const loud = (file) => { const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128=peak=true -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 }); const s = r.slice(r.lastIndexOf("Summary"));
  let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1])); return { I: Number(/I:\s+(-?[\d.]+) LUFS/.exec(s)?.[1]), TP: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(s)?.[1]), Mmax }; };
function readWav(file, offset = 0) {
  const b = fs.readFileSync(file), ch = b.readUInt16LE(22), sr = b.readUInt32LE(24), bits = b.readUInt16LE(34); if (sr !== SR || bits !== 16) throw new Error(`${file}: ${sr} Hz ${bits} bit`);
  let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const len = b.readUInt32LE(off + 4) / 2 / ch, o = Math.round(offset * SR), out = [new Float32Array(N), new Float32Array(N)];
  for (let i = 0; i < len; i++) { const k = i + o; if (k < 0 || k >= N) continue; for (let c = 0; c < 2; c++) out[c][k] = b.readInt16LE(off + 8 + (i * ch + Math.min(c, ch - 1)) * 2) / 32768; }
  return { ch: out, len };
}
function writeWav(file, L, R, float = false) {
  const bps = float ? 4 : 2, out = Buffer.alloc(44 + N * 2 * bps); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2 * bps, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(float ? 3 : 1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2 * bps, 28); out.writeUInt16LE(2 * bps, 32); out.writeUInt16LE(bps * 8, 34); out.write("data", 36); out.writeUInt32LE(N * 2 * bps, 40);
  for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = (c ? R : L)[i], p = 44 + (i * 2 + c) * bps; if (float) out.writeFloatLE(v, p); else out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), p); }
  fs.writeFileSync(file, out);
}

// ---------------------------------------------------------------- stems and their levels
const vRaw = loud(VOICE_FILE), bRaw = loud(A + "bed.wav"), sRaw = loud(A + "sfx.wav");
const vG = 10 ** ((-16 - vRaw.I) / 20), bG = 10 ** ((-22 - bRaw.I) / 20), sG = 10 ** ((-20 - sRaw.Mmax) / 20);
const voice = readWav(VOICE_FILE, VOICE_AT), bed = readWav(A + "bed.wav"), sfx = readWav(A + "sfx.wav");
if (VOICE_AT + voice.len / SR > END) throw new Error("voice runs past the end");
// speech envelope → duck (attack 40 ms, release 350 ms, 10 ms window)
const duck = new Float32Array(N), duckS = new Float32Array(N);
{ const w = 480, rms = new Float32Array(N); let acc = 0; const v = voice.ch[0];
  for (let i = 0; i < N; i++) { const x = v[i] * vG; acc += x * x; if (i >= w) { const y = v[i - w] * vG; acc -= y * y; } rms[i] = Math.sqrt(Math.max(0, acc) / w); }
  const at = 1 - Math.exp(-1 / (0.04 * SR)), rl = 1 - Math.exp(-1 / (0.35 * SR)); let e = 0;
  // look ahead 30 ms so the bed is already down when a word starts
  for (let i = 0; i < N; i++) { const tg = rms[Math.min(N - 1, i + 1440)] > 0.015 ? 1 : 0; e += (tg - e) * (tg > e ? at : rl); duck[i] = 1 - e * (1 - 10 ** (-8 / 20)); duckS[i] = 1 - e * (1 - 10 ** (-3 / 20)); } }
const L = new Float32Array(N), R = new Float32Array(N);
for (let i = 0; i < N; i++) { const v = voice.ch[0][i] * vG; L[i] = v + bed.ch[0][i] * bG * duck[i] + sfx.ch[0][i] * sG * duckS[i]; R[i] = v + bed.ch[1][i] * bG * duck[i] + sfx.ch[1][i] * sG * duckS[i]; }

// ---------------------------------------------------------------- loudness + look-ahead limiter
const CEIL = 10 ** (-2.0 / 20), LOOK = Math.round(0.005 * SR), REL = 1 - Math.exp(-1 / (0.09 * SR));
const cubic = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
function limit(L, R, gain) {
  const need = new Float32Array(N);
  for (let i = 0; i < N; i++) { let p = 0;
    for (const X of [L, R]) { const a = X[Math.max(0, i - 1)] * gain, b = X[i] * gain, c = X[Math.min(N - 1, i + 1)] * gain, d = X[Math.min(N - 1, i + 2)] * gain; p = Math.max(p, Math.abs(b), Math.abs(cubic(a, b, c, d, 0.25)), Math.abs(cubic(a, b, c, d, 0.5)), Math.abs(cubic(a, b, c, d, 0.75))); }
    need[i] = p > CEIL ? CEIL / p : 1; }
  // sliding minimum over ±LOOK, then a box average over LOOK (never above the need at any sample), slow release
  const m = new Float32Array(N), q = []; let head = 0;
  for (let i = 0; i < N + LOOK; i++) { if (i < N) { while (q.length > head && need[q[q.length - 1]] >= need[i]) q.pop(); q.push(i); } const c = i - LOOK; if (c < 0) continue; while (q[head] < c - LOOK) head++; m[c] = need[q[head]]; }
  // box average of m over ±LOOK/2: each m[j] in the window already covers sample i, so the average never exceeds need[i]
  const g = new Float32Array(N), half = LOOK >> 1;
  for (let i = 0; i < N; i++) { let s = 0, k = 0; for (let j = i - half; j <= i + half; j += 4) { s += j < 0 || j >= N ? 1 : m[j]; k++; } g[i] = Math.min(s / k, m[i]); }
  let prev = 1, reduced = 0; const oL = new Float32Array(N), oR = new Float32Array(N);
  for (let i = 0; i < N; i++) { const target = g[i], v = Math.min(target, prev + (1 - prev) * REL); prev = v; reduced = Math.max(reduced, 1 - v); oL[i] = L[i] * gain * v; oR[i] = R[i] * gain * v; }
  return { L: oL, R: oR, maxReductionDb: +(20 * Math.log10(1 - reduced + 1e-9)).toFixed(2) };
}
writeWav(A + "mix-pre.wav", L, R, true);
const pre = loud(A + "mix-pre.wav");
let gain = 10 ** ((-16 - pre.I) / 20), res = limit(L, R, gain);
writeWav(A + "mix-final.wav", res.L, res.R); let fin = loud(A + "mix-final.wav");
for (let it = 0; it < 3 && Math.abs(fin.I + 16) > 0.15; it++) { gain *= 10 ** ((-16 - fin.I) / 20); res = limit(L, R, gain); writeWav(A + "mix-final.wav", res.L, res.R); fin = loud(A + "mix-final.wav"); }
console.log(JSON.stringify({ voice: vRaw, bed: bRaw, sfx: sRaw, gains: { vG: +vG.toFixed(3), bG: +bG.toFixed(3), sG: +sG.toFixed(3), master: +gain.toFixed(3) }, limiter_max_reduction_dB: res.maxReductionDb, final_wav: fin }));
if (fs.existsSync(HERE + "video-noaudio.mp4")) {
  execFileSync(FF, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-i", HERE + "video-noaudio.mp4", "-i", A + "mix-final.wav", "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-movflags", "+faststart", OUT]);
  console.log("muxed", OUT.split("/").pop());
}
