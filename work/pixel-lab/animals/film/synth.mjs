// 8-bit sound for «From the dumbest animal to the smartest»: every cue is synthesised and lasts exactly as long as its
// motion (same timeline as the picture). Loop film: the bed fills whole chord cycles with no fades, ambient cues near the
// seam are periodic. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, LV, END, CAM } from "./timeline.mjs";
import { CUES } from "./cues.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)), k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge;
  }
}
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const swish = (a, b, gain = 0.012) => noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const bubbles = (a, b, gain = 1, seed = 1) => { for (let t = a, k = 0; t < b - 0.05; k++) { const r = ((Math.sin(k * 91.7 + seed) * 43758.5) % 1 + 1) % 1; tone(sfx, t, 0.06, { wave: "tri", f: (u) => 500 + 900 * r + 600 * u, v: (u) => 1 - u, gain: 0.025 * gain }); t += 0.07 + r * 0.12; } };
export const SFX = { tone: (...a) => tone(sfx, ...a), blip, seq, noise, sweep, swish, bubbles, n, env };

// ---- camera moves: each pan gets a sound lasting the pan; underwater rises are bubbly sweeps, land pans soft swishes
for (let i = 0; i < CAM.length - 1; i++) {
  const a = CAM[i], b = CAM[i + 1]; if (b.t - a.t > 4 || (a.cx === b.cx && a.cy === b.cy)) continue;
  const under = a.cy > 100 && b.cy > 100, dive = b.cy > a.cy + 600;
  if (dive) { sweep(a.t, b.t, false, 1.0, 110, 700); bubbles(a.t + 0.4, b.t - 0.2, 0.8, 3); }
  else if (under) { sweep(a.t, b.t, true, 0.7, 180, 760); bubbles(a.t, b.t, 0.7, i); }
  else swish(a.t, b.t);
}
// ---- level up: a short rising arpeggio as each new level arrives (its first word)
for (const t of [EV.jellyfish, EV.octopus, EV.bees, EV.dog, EV.crows, EV.dolphin, EV.elephant, EV.chimp, EV.top]) seq(t - 0.02, ["C5", "E5", "G5", "C6"], 0.055, { gain: 0.03, duty: 0.25 });
// ---- skill pickups: a sparkle as long as the pickup's rise (≈0.6 s of its 1.6 s life is the rise)
for (const t of [EV.swim, EV.solves, EV.learn, EV.words, EV.hooks, EV.name, EV.know, EV.memory, EV.plan]) { seq(t, ["E6", "G6", "B6", "E7"], 0.07, { gain: 0.022, duty: 0.125 }); noise(t, 0.5, () => 12000, (u) => (1 - u) * 0.6, 0.006); }
// ---- per-level motion cues (sponge stream, jelly pulses, jar lid, wings, dog, crow, whistles, trumpet, taps, …)
for (const cue of CUES) cue(SFX);

// ---- chiptune bed: C – G – Am – F, nudged so whole 4-bar cycles fill the loop; underwater and the dive are soft and
// sparse, the land is full, the night city sparkles. The bed runs through the seam with no fades.
const CYC = Math.max(1, Math.round(END / 8.7)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]];
const section = (t) => (t < EV.bees - 0.6 || t > LV.dive[0] + 1.6 ? "soft" : t > EV.top - 0.4 ? "night" : t > EV.twist - 0.2 && t < EV.elephant + 1.2 ? "twist" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s === "soft" && e % 2) continue; if (s === "twist" && e % 4) continue;
    tone(bed, t, (s === "soft" ? BEAT : s === "twist" ? BEAT * 2 : BEAT / 2) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 && s !== "soft" ? 12 : 0) - (s === "twist" ? 1 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "soft" ? 0.07 : 0.1 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break;
    if (s === "soft" && s16 % 4) continue; if (s === "twist" && s16 % 8) continue;
    const up = s === "night" ? 36 : 24, note = ch[(s16 >> (s === "soft" ? 2 : 0)) % 3] + up + (s16 >= 12 && s !== "soft" ? 12 : 0);
    tone(bed, t, (BEAT / 4) * (s === "soft" ? 3.2 : s === "night" ? 1.6 : 0.8), { duty: s === "night" ? 0.25 : 0.125, f: () => NOTE(note), v: (u) => 1 - 0.75 * u, gain: s === "soft" ? 0.018 : s === "night" ? 0.016 : 0.024 });
    if (s16 % 4 === 2 && (s === "full" || s === "night")) tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.014 });
    if (s16 % 8 === 0 && s === "full") tone(bed, t, 0.06, { wave: "noise", f: () => 1800, v: (u) => 1 - u, gain: 0.02 }); }
}
// loop-safe one-pole low-pass: the filter state is warmed on the last 0.1 s, so the first sample continues the last one
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR), E = Math.round(END * SR); let y = 0; for (let i = Math.max(0, E - 4800); i < E; i++) y += a * (buf[i] - y); for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1));
