// The sound demos of «The ghast's cry» and the data the sound-lab panel draws (waveform + spectrogram of exactly what plays).
//   meow  — OUR COPY: a formant-synth meow, 0.84 s, F0 arch ≈ 600 → 880 → 500 Hz, F1 ≈ 1460 Hz and F2 ≈ 3050 Hz on average
//           (domestic-cat means, Nicastro 2004), vowel glide "i-a-u", a short nasal "m" onset;
//   half  — the same sound resampled to half speed: 1.68 s, every frequency halved (pitch and formants together);
//   echo  — the half-speed sound in a big cave: early reflections + a long late reverb (RT60 ≈ 3 s), wet-heavy, faded out
//           before the real ghast starts;
//   real  — REAL GHAST (Mojang, user-approved exception, media/mojang): moan3.ogg as is;
//   p08/p10/p12 — moan1.ogg three times at pitch 0.8 / 1.0 / 1.2 by resampling (as the game does, 0.8–1.2).
// The real sounds are not processed beyond that pitch change and a 5 ms edge fade. Deterministic (seeded noise).
// node demos.mjs → audio/demos.wav (48 kHz mono, placed on the film clock), audio/spec.json
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { DEMO, DEMO_ORDER, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), FF = "/Users/rv/Desktop/Motion Studio/bin/ffmpeg", SR = 48000;
const clamp01 = (v) => Math.max(0, Math.min(1, v)), sstep = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
let seed = 12345; const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) >>> 0) / 4294967296);

// ---------------------------------------------------------------- our copy of a meow
export function meow() {
  const dur = 0.84, N = Math.round(dur * SR), out = new Float32Array(N); let ph = 0, lp = 0;
  const f0At = (u) => (u < 0.45 ? 600 + 280 * Math.sin((Math.PI / 2) * (u / 0.45)) : 880 - 380 * (1 - Math.cos((Math.PI * (u - 0.45)) / 0.55)) / 2);
  const F1 = (u) => (u < 0.06 ? 500 + 450 * (u / 0.06) : u < 0.42 ? 950 + 950 * Math.sin((Math.PI / 2) * ((u - 0.06) / 0.36)) : 1900 - 800 * (1 - Math.cos((Math.PI * (u - 0.42)) / 0.58)) / 2);
  const F2 = (u) => (u < 0.42 ? 3400 - 250 * (u / 0.42) : 3150 - 500 * ((u - 0.42) / 0.58));
  for (let i = 0; i < N; i++) {
    const t = i / SR, u = t / dur, f0 = f0At(u) * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t)); ph += f0 / SR;
    const f1 = F1(u), f2 = F2(u), f3 = 4600, nasal = 1 - sstep(0.02, 0.09, u);
    let x = 0;
    for (let k = 1; k * f0 < 9500; k++) { const f = k * f0;
      const A = Math.pow(k, -0.9) * (1 / (1 + ((f - f1) / 210) ** 2) + 0.75 / (1 + ((f - f2) / 330) ** 2) + 0.25 / (1 + ((f - f3) / 460) ** 2) + 0.04) * (1 - nasal * clamp01((f - 900) / 1500));
      x += A * Math.sin(2 * Math.PI * k * ph); }
    const breath = (rnd() * 2 - 1) * 0.06; lp += 0.3 * (breath - lp);
    const env = sstep(0, 0.08, u) * (1 - sstep(0.74, 1, u)) * (0.82 + 0.18 * Math.sin(Math.PI * u));
    out[i] = (x + (breath - lp) * 0.6) * env;
  }
  return norm(out, 0.5);
}
function norm(x, peak) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); const g = peak / (m || 1); return x.map((v) => v * g); }
/** cubic (Catmull-Rom) resampling: rate r plays the source r× faster (r = 0.5 → half speed) */
export function resample(src, r) {
  const N = Math.floor((src.length - 1) / r), out = new Float32Array(N), at = (i) => src[Math.max(0, Math.min(src.length - 1, i))];
  for (let i = 0; i < N; i++) { const p = i * r, k = Math.floor(p), f = p - k, a = at(k - 1), b = at(k), c = at(k + 1), d = at(k + 2);
    out[i] = b + 0.5 * f * (c - a + f * (2 * a - 5 * b + 4 * c - d + f * (3 * (b - c) + d - a))); }
  return out;
}
/** a big cave: early reflections + Freeverb-style late reverb (8 damped combs, 4 allpasses), RT60 ≈ 3 s */
export function cave(dry, len) {
  const N = Math.round(len * SR), out = new Float32Array(N), wet = new Float32Array(N), x = (i) => (i >= 0 && i < dry.length ? dry[i] : 0);
  const taps = [[0.043, 0.55], [0.079, 0.45], [0.127, 0.38], [0.171, 0.3], [0.233, 0.24], [0.307, 0.18]];
  const pre = new Float32Array(N); for (let i = 0; i < N; i++) { let s = 0; for (const [d, g] of taps) s += x(i - Math.round(d * SR)) * g; pre[i] = s; }
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round(d * SR / 44100)), RT = 3.0;
  for (const d of combs) { const buf = new Float32Array(d), g = Math.pow(10, (-3 * d) / SR / RT); let idx = 0, lp = 0;
    for (let i = 0; i < N; i++) { const y = buf[idx]; lp = y * 0.6 + lp * 0.4; buf[idx] = (x(i - 1200) * 0.5 + pre[i] * 0.3) + lp * g; idx = (idx + 1) % d; wet[i] += y / combs.length; } }
  for (const d of [556, 441, 341, 225].map((v) => Math.round(v * SR / 44100))) { const buf = new Float32Array(d); let idx = 0;
    for (let i = 0; i < N; i++) { const b = buf[idx], y = -wet[i] + b; buf[idx] = wet[i] + b * 0.5; idx = (idx + 1) % d; wet[i] = y; } }
  let lp = 0; for (let i = 0; i < N; i++) { lp += 0.35 * (wet[i] - lp); out[i] = x(i) * 0.45 + (pre[i] * 0.5 + lp * 2.2); }
  return out;
}
function edge(x, fin = 0.005, fout = 0.005) { const a = Math.round(fin * SR), b = Math.round(fout * SR); for (let i = 0; i < a && i < x.length; i++) x[i] *= i / a; for (let i = 0; i < b && i < x.length; i++) x[x.length - 1 - i] *= i / b; return x; }
export function ogg(name) {
  const raw = execFileSync(FF, ["-v", "error", "-i", HERE + "../media/mojang/" + name, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  const out = new Float32Array(raw.length / 4); for (let i = 0; i < out.length; i++) out[i] = raw.readFloatLE(i * 4); return out;
}

// ---------------------------------------------------------------- the clips as played
export function clips() {
  const m = meow(), h = resample(m, 0.5), e = cave(h, DEMO.echo.len);
  { const a = Math.round((DEMO.echo.len - 0.5) * SR); for (let i = a; i < e.length; i++) e[i] *= Math.pow(1 - (i - a) / (e.length - a), 1.5); }
  const m3 = ogg("moan3.ogg"), m1 = ogg("moan1.ogg");
  const trim = (x) => { let a = 0, b = x.length - 1; while (a < b && Math.abs(x[a]) < 1e-4) a++; while (b > a && Math.abs(x[b]) < 1e-4) b--; return x.slice(a, b + 1); };
  return { meow: edge(m), half: edge(h), echo: edge(norm(e, 0.5), 0.005, 0.02), real: edge(trim(m3)), p08: edge(resample(trim(m1), 0.8)), p10: edge(trim(m1).slice()), p12: edge(resample(trim(m1), 1.2)) };
}

// ---------------------------------------------------------------- spectrogram + waveform data (10 ms frames, rows of 62.5 Hz up to 10 kHz)
function fft(re, im) { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } } } }
export const ROWS = 160, HZ_PER_ROW = 62.5, HOP = 0.01;
function analyse(x) {
  const n = 1024, hop = Math.round(HOP * SR), frames = Math.ceil(x.length / hop), spec = new Float32Array(frames * ROWS), wave = new Float32Array(frames);
  const win = new Float32Array(n).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  let mx = 1e-12;
  for (let f = 0; f < frames; f++) {
    const re = new Float64Array(n), im = new Float64Array(n), c = f * hop; let pk = 0;
    for (let i = 0; i < n; i++) { const k = c - n / 2 + i, v = k >= 0 && k < x.length ? x[k] : 0; re[i] = v * win[i]; }
    for (let k = c; k < Math.min(x.length, c + hop); k++) pk = Math.max(pk, Math.abs(x[k])); wave[f] = pk;
    fft(re, im);
    for (let r = 0; r < ROWS; r++) { const b0 = Math.floor((r * HZ_PER_ROW * n) / SR), b1 = Math.max(b0 + 1, Math.floor(((r + 1) * HZ_PER_ROW * n) / SR)); let s = 0; for (let b = b0; b < b1; b++) s = Math.max(s, re[b] * re[b] + im[b] * im[b]); spec[f * ROWS + r] = s; mx = Math.max(mx, s); }
  }
  const q = new Uint8Array(frames * ROWS); for (let i = 0; i < q.length; i++) q[i] = Math.round(255 * clamp01(1 + (10 * Math.log10(spec[i] / mx + 1e-12)) / 60));
  let wm = 1e-9; for (const v of wave) wm = Math.max(wm, v);
  return { frames, spec: Buffer.from(q).toString("base64"), wave: Array.from(wave, (v) => +(v / wm).toFixed(3)) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const C = clips(), stem = new Float32Array(Math.ceil(END * SR)), data = { rows: ROWS, hzPerRow: HZ_PER_ROW, hop: HOP, demos: {} };
  for (const k of DEMO_ORDER) { const x = C[k], s0 = Math.round(DEMO[k].t0 * SR); for (let i = 0; i < x.length; i++) if (s0 + i < stem.length) stem[s0 + i] += x[i];
    data.demos[k] = { t0: DEMO[k].t0, len: +(x.length / SR).toFixed(3), ...analyse(x) };
    const pk = x.reduce((m, v) => Math.max(m, Math.abs(v)), 0); console.log(k, "len", (x.length / SR).toFixed(3), "peak", pk.toFixed(3)); }
  fs.mkdirSync(HERE + "audio", { recursive: true });
  fs.writeFileSync(HERE + "audio/spec.json", JSON.stringify(data));
  // each clip also on its own (for the loudness match in mix.mjs)
  const wav = (file, x) => { const out = Buffer.alloc(44 + x.length * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + x.length * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(x.length * 4, 40); for (let i = 0; i < x.length; i++) out.writeFloatLE(x[i], 44 + i * 4); fs.writeFileSync(file, out); };
  fs.mkdirSync(HERE + "audio/demos", { recursive: true });
  for (const k of DEMO_ORDER) wav(HERE + `audio/demos/${k}.wav`, C[k]);
  console.log("spec.json + audio/demos/*.wav");
}
