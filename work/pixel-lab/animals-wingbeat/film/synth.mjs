// 8-bit sound for «From the slowest wingbeat to the fastest». The core is ONE "wing voice" driven sample by sample by the
// shared rate curve (timeline.mjs rate/phase): one click per wingbeat at the middle of each downstroke. Slow wings are
// separate clicks (a soft whoosh and a low thump); as the rate climbs past ~15–30 per second the clicks fuse into a 4-bit
// pulse tone at the same frequency — the buzz IS the wings. Loop film: the voice's phase is a whole number of beats at the
// seam, the bed fills whole bars, everything past END folds onto the start.
// Writes audio/wings.wav (the wing voice), audio/sfx.wav (cues) and audio/bed.wav (pad), 48 kHz mono.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, LV, END, TONE, RATE, ORDER, rate, phase, onAir } from "./timeline.mjs";
import { voiceOn } from "./levels/meter.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.round(END * SR);
const wings = new Float32Array(N), sfx = new Float32Array(N), bed = new Float32Array(N);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };

// ---------------------------------------------------------------- the wing voice
{
  // control-rate curves (1 kHz), interpolated per sample
  const CR = 1000, M = Math.ceil(END * CR) + 2, RT = new Float64Array(M), ON = new Float32Array(M);
  const ladderDip = (t) => 1 - win(t, EV.faster - 0.12, EV.noteEnd + 0.25, 0.08, 0.25);
  for (let j = 0; j < M; j++) { const t = Math.min(END, j / CR); RT[j] = rate(t); ON[j] = voiceOn(t) * ladderDip(t); }
  const at = (A, t) => { const x = t * CR, j = Math.min(M - 2, Math.floor(x)), f = x - j; return A[j] + (A[j + 1] - A[j]) * f; };
  let lfsr = 1, nz = 1, nph = 0, thumpPh = 0, hp = 0, prevIn = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, r = at(RT, t), on = at(ON, t);
    if (on <= 0.001) { wings[i] = 0; continue; }
    const p = phase(t) - 0.25, f = p - Math.floor(p), since = f / r;               // seconds since the last beat
    // click part (slow wings): a whoosh of noise and a low thump, as long as the beat allows
    const d = Math.min(0.07, 0.55 / r), ce = since < d ? Math.pow(1 - since / d, 2) * Math.min(1, since / 0.002) : 0;
    nph += 3800 / SR; if (nph >= 1) { nph -= 1; const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; }
    thumpPh = since < d ? since * (95 - 40 * since / d) : 0; const tp = thumpPh % 1, tri = Math.round((tp < 0.5 ? 4 * tp - 1 : 3 - 4 * tp) * 7.5) / 7.5;
    const click = ce * (0.42 * nz + 0.58 * tri);
    // tone part (fast wings): a 4-bit pulse wave, duty 25 %, at the wingbeat frequency
    const tone = f < 0.25 ? 1 : -0.333;
    const k = clamp01((r - 12) / 18); wings[i] = ((1 - k) * click * 0.9 + k * tone * 0.42) * on;
  }
  // DC blocker, warmed on the film's tail (loop)
  for (let i = N - SR; i < N; i++) { hp = 0.9995 * (hp + wings[i] - prevIn); prevIn = wings[i]; }
  for (let i = 0; i < N; i++) { const x = wings[i]; hp = 0.9995 * (hp + x - prevIn); prevIn = x; wings[i] = hp; }
  // a gentle stereo-free "tone colour": soften the brightest whine (one-pole low-pass at 7 kHz)
  { const a = 1 - Math.exp((-2 * Math.PI * 7000) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (wings[i] - y); for (let i = 0; i < N; i++) { y += a * (wings[i] - y); wings[i] = y; } }
}

// ---------------------------------------------------------------- cues
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)); put(buf, s0 + i, x * vol * gain * edge);
  }
}
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, f, dur = 0.07, gain = 0.03, duty = 0.25) => tone(sfx, t, dur, { duty, f: () => f, v: (u) => 1 - 0.7 * u, gain });
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
// level-up chime when the camera settles on each new animal (two notes, its own wing note when it has one)
ORDER.forEach((k, i) => { if (k === "honeybee") return; const t = LV[k][0] + 0.25, root = TONE[k] >= 40 ? TONE[k] : NOTE(70 + i); let f = root; while (f < 500) f *= 2; blip(t, f, 0.06, 0.012); blip(t + 0.07, f * 1.5, 0.08, 0.012); });
{ const t = LV.honeybee[0] + 0.25; blip(t, NOTE(70) * 2, 0.06, 0.012); blip(t + 0.07, NOTE(77) * 2, 0.08, 0.012); }
// the rewind: a tape-rewind chirp as long as the pan (high, falling, warbling)
{ const a = EV.lets, b = EV.albatross - 0.15; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => (2400 - 1400 * u) * (1 + 0.08 * Math.sin(tt * 70)), v: env(0.15, 0.25), gain: 0.008 }); noise(a, b - a, (u) => 6000 - 3000 * u, env(0.2, 0.3), 0.006); }
// the albatross glide: a soft wind while the wings are held still
noise(EV.albatross - 0.4, EV.flaps1 - EV.albatross + 0.6, (u) => 700 + 500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.01);
// the threshold: a little "aha" chime when the clicks have blurred into one sound
blip(EV.oneSound, NOTE(79), 0.08, 0.014); blip(EV.oneSound + 0.09, NOTE(84), 0.1, 0.014);
// "Faster wings, higher note": the whole ladder in 1.1 s — two clicks for slow wings, a short tone for fast ones
ORDER.forEach((k, i) => { const t = EV.faster + i * 0.11; if (TONE[k] < 30) { for (let q = 0; q < 2; q++) noise(t + q * 0.04, 0.025, () => 3000, (u) => 1 - u, 0.03); }
  else tone(sfx, t, 0.1, { duty: 0.25, f: () => TONE[k] * (TONE[k] < 100 ? 2 : 1), v: env(0.1, 0.3), gain: 0.03 }); });
// tags: soft pops
for (const t of [EV.count - 0.15, EV.around - 0.1, EV.hum - 0.1, EV.warm - 0.1, EV.faster - 0.1, EV.everyAnimal - 0.1]) { blip(t, 1568, 0.04, 0.01); blip(t + 0.05, 2093, 0.05, 0.01); }
// the builders' visible events (levels/*-motions.mjs), each as long as its motion
for (const b of ["ocean", "city", "garden", "pond", "tropic", "leaf", "clover", "hive", "porch", "marsh"]) {
  const file = HERE + `levels/${b}-motions.mjs`; if (!fs.existsSync(file)) continue;
  const { MOTIONS = [] } = await import(file);
  for (const m of MOTIONS) { const d = Math.max(0.04, m.t1 - m.t0);
    if (m.kind === "splash") noise(m.t0, d, (u) => 2500 - 1500 * u, env(0.05, 0.6), 0.02);
    else if (m.kind === "whoosh" || m.kind === "wind" || m.kind === "flutter") noise(m.t0, d, (u) => 1200 + 2000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.01);
    else if (m.kind === "rise") tone(sfx, m.t0, d, { duty: 0.25, f: (u) => 500 + 600 * u, v: env(0.2, 0.3), gain: 0.012 });
    else if (m.kind === "fall") tone(sfx, m.t0, d, { duty: 0.25, f: (u) => 1100 - 600 * u, v: env(0.2, 0.3), gain: 0.012 });
    else if (m.kind === "tick" || m.kind === "tap" || m.kind === "step") noise(m.t0, Math.min(d, 0.05), () => 3500, (u) => 1 - u, 0.015);
    else if (m.kind === "chime") { blip(m.t0, 1318, 0.08, 0.012); blip(m.t0 + 0.08, 1976, 0.1, 0.012); }
    else if (m.kind === "creak") tone(sfx, m.t0, d, { duty: 0.5, f: (u) => 180 + 40 * Math.sin(u * 20), v: env(0.2, 0.3), gain: 0.01 });
    else blip(m.t0, 1046, Math.min(d, 0.1), 0.012); }
}

// ---------------------------------------------------------------- bed: a soft pad + pluck whose chord follows the wing note
// whole bars over the loop (26 bars, ≈104 BPM); the chord is picked per half bar from the animal on air.
const BARS = 26, BAR = END / BARS, BEAT = BAR / 4;
const CH = { // midi triads
  honeybee: [58, 62, 65], rewind: [58, 62, 65], albatross: [55, 58, 62], pigeon: [51, 55, 58], butterfly: [53, 57, 60], damselfly: [55, 58, 62],
  hummingbird: [53, 57, 60], ladybug: [50, 53, 57], bumblebee: [50, 53, 57], mosquito: [55, 59, 62], midge: [52, 55, 59],
};
for (let h = 0; h < BARS * 2; h++) {
  const t0 = h * BAR / 2, who = onAir(t0 + 0.01), ch = CH[who] ?? CH.honeybee, quiet = who === "albatross" && t0 < EV.flaps1 ? 0.7 : 1;
  for (let e = 0; e < 2; e++) { const t = t0 + e * BEAT; tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 24 + (e ? 7 : 0)), v: (u) => 1 - 0.6 * u, gain: 0.07 * quiet }); }
  for (let s8 = 0; s8 < 4; s8++) { const t = t0 + (s8 * BEAT) / 2; tone(bed, t, (BEAT / 2) * 0.7, { duty: 0.25, f: () => NOTE(ch[[0, 1, 2, 1][s8]] + 12), v: (u) => 1 - 0.85 * u, gain: 0.014 * quiet }); }
}
// fold anything past END onto the start (put() already wraps), soften the bed
{ const a = 1 - Math.exp((-2 * Math.PI * 6500) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (bed[i] - y); for (let i = 0; i < N; i++) { y += a * (bed[i] - y); bed[i] = y; } }
{ const a = 1 - Math.exp((-2 * Math.PI * 9000) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (sfx[i] - y); for (let i = 0; i < N; i++) { y += a * (sfx[i] - y); sfx[i] = y; } }

function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/wings.wav", wings); writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of wings) pk = Math.max(pk, Math.abs(v));
console.log("wings peak", pk.toFixed(3), "seam jump", Math.abs(wings[N - 1] - wings[0]).toFixed(4), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
