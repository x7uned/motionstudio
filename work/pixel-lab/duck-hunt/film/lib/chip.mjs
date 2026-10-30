// 8-bit synthesis for a LOOP film (frozen copy per film). Pulse / triangle / LFSR noise, volume quantised to 60 Hz steps
// like an old sound chip. Every write wraps around END, so a sound that runs past the seam continues at the start and
// the music cycles through the seam with no fade. makeChip(END) → { sfx, bed, tone, blip, seq, noise, sweep, swish, … }
import fs from "node:fs";

export const SR = 48000;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const n = (name) => { if (typeof name === "number") return name; const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
export const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);

export function makeChip(END) {
  const N = Math.round(END * SR), sfx = new Float32Array(N), bed = new Float32Array(N);
  const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };
  function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
    if (dur <= 0) return; const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
    for (let i = 0; i < len; i++) {
      const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
      ph += fr / SR; let x;
      if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
      else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
      else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
      const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)); put(buf, s0 + i, x * vol * gain * edge);
    }
  }
  const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
  const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
  const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
  const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.014 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.032 * gain }); };
  const swish = (a, b, gain = 0.012) => { if (b > a) noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain); };
  const pop = (t, a = "C6", b = "G6", g = 0.024) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
  const thud = (t, g = 1) => { tone(sfx, t, 0.3, { wave: "tri", f: (u) => 90 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.1 * g }); noise(t, 0.1, () => 900, (u) => 1 - u, 0.025 * g); };
  /** low-pass that is warmed up on the last second, so the filter state is continuous across the seam */
  function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = Math.max(0, N - SR); i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
  function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
  function write(dir) { lowpass(sfx, 9000); lowpass(bed, 6500); fs.mkdirSync(dir, { recursive: true }); writeWav(dir + "sfx.wav", sfx); writeWav(dir + "bed.wav", bed); let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); return pk; }
  return { N, sfx, bed, put, tone, blip, seq, noise, sweep, swish, pop, thud, write };
}
