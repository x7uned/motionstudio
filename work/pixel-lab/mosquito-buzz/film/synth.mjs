// 8-bit sound for «Why mosquitoes buzz right in your ear». The core is the whine: her flight tone (a 4-bit pulse at
// ≈ 494 Hz, B4, "about five hundred a second") whose loudness is what the hero's ear hears — direction.mjs loudness(t),
// from her distance to his ear (full in the macro shots). It stops the moment her wings stop (she lands). In the love
// song his tone joins (≈ 718 → 741 Hz) and both slide until her 3rd harmonic meets his 2nd: the rough beating between
// them fades into one smooth chord. Every other cue lasts its motion. Loop: whole bars, the whine's phase is a whole
// number of cycles at the seam, everything past END folds onto the start.
// Writes audio/wings.wav (the whine), audio/sfx.wav (cues), audio/bed.wav (pad), 48 kHz mono.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, TONE } from "./timeline.mjs";
import { loudness, male, songK, exhale, awake, CAM_MOVES, BREATH_N } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.round(END * SR);
const wings = new Float32Array(N), sfx = new Float32Array(N), bed = new Float32Array(N);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };

// ---------------------------------------------------------------- the whine (and his tone in the love song)
{
  const CR = 1000, M = Math.ceil(END * CR) + 2, LD = new Float32Array(M), MA = new Float32Array(M), FF = new Float64Array(M), FM = new Float64Array(M);
  for (let j = 0; j < M; j++) {
    const t = Math.min(END, j / CR), k = songK(t), m = male(t);
    LD[j] = loudness(t); MA[j] = m ? m.a * (0.55 + 0.45 * win(t, EV.males - 0.3, EV.togetherEnd, 0.3, 0.3)) : 0;
    const vib = 1 + 0.012 * Math.sin((2 * Math.PI * 290 * t) / END) + 0.006 * Math.sin((2 * Math.PI * 733 * t) / END);   // a slight wobble, whole cycles
    const meeting = win(t, EV.males - 0.4, EV.togetherEnd + 0.3, 0.6, 0.6);
    FF[j] = (TONE.female + meeting * (1 - k) * (TONE.femaleStart - TONE.female)) * vib;
    FM[j] = TONE.maleStart + k * (TONE.male - TONE.maleStart);
  }
  const at = (A, t) => { const x = t * CR, j = Math.min(M - 2, Math.floor(x)), f = x - j; return A[j] + (A[j + 1] - A[j]) * f; };
  // her phase, with a tiny correction over the last 2 s so that it is a whole number of cycles at END
  const PF = new Float64Array(N + 1); for (let i = 0; i < N; i++) PF[i + 1] = PF[i] + at(FF, i / SR) / SR;
  const fix = Math.round(PF[N]) - PF[N], f0 = N - 2 * SR;
  let pm = 0;
  for (let i = 0; i < N; i++) {
    const t = i / SR, ld = at(LD, t), ma = at(MA, t);
    const ph = PF[i] + (i > f0 ? fix * sm(i, f0, N) : 0) + 0.125, p = ph - Math.floor(ph);   // +⅛: the seam falls mid-plateau, not on an edge
    let x = 0;
    if (ld > 0.0005) { const pulse = p < 0.25 ? 1 : -0.333, tri = Math.round((p < 0.5 ? 4 * p - 1 : 3 - 4 * p) * 7.5) / 7.5; x += ld * (0.75 * pulse + 0.25 * tri) * 0.45; }
    if (ma > 0.0005) { pm += at(FM, t) / SR; const q = pm - Math.floor(pm); x += ma * (q < 0.3 ? 1 : -0.43) * 0.3; }
    wings[i] = x;
  }
  let hp = 0, prev = 0; for (let i = N - SR; i < N; i++) { hp = 0.9995 * (hp + wings[i] - prev); prev = wings[i]; }
  for (let i = 0; i < N; i++) { const x = wings[i]; hp = 0.9995 * (hp + x - prev); prev = x; wings[i] = hp; }
  const a = 1 - Math.exp((-2 * Math.PI * 8000) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (wings[i] - y); for (let i = 0; i < N; i++) { y += a * (wings[i] - y); wings[i] = y; }
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
const seq = (t, fs, step, o = {}) => fs.forEach((f, i) => blip(t + i * step, f, o.dur ?? step * 0.95, o.gain ?? 0.03, o.duty ?? 0.25));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = 1568, b = 2093, g = 0.014) => { blip(t, a, 0.045, g); blip(t + 0.05, b, 0.055, g); };
const ok = (t) => { tone(sfx, t, 0.16, { duty: 0.25, f: () => NOTE(88), v: env(0.1, 0.4), gain: 0.016 }); tone(sfx, t + 0.17, 0.26, { duty: 0.25, f: () => NOTE(93), v: env(0.1, 0.5), gain: 0.016 }); };
const no = (t) => tone(sfx, t, 0.42, { duty: 0.5, f: (u) => 220 - 70 * u, v: env(0.08, 0.4), gain: 0.016 });
// breathing: a soft exhale of air on every breath while the film is about breath (each as long as the exhale)
{ const P = END / BREATH_N; for (let n = 0; n < BREATH_N; n++) { const a = (n + 0.5) * P, g = win(a + 0.8, EV.every - 0.6, EV.close - 0.3, 0.5, 0.8); if (g > 0.02) noise(a, P / 2, (u) => 700 + 500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012 * g); } }
// the hook: a heart pops (love song), a "no" on "not for you" (and again later)
seq(EV.love - 0.1, [NOTE(88), NOTE(95)], 0.07, { gain: 0.02 }); noise(EV.love, 0.25, () => 9000, (u) => 1 - u, 0.005);
no(EV.notFor); seq(EV.singing - 0.1, [NOTE(88), NOTE(95)], 0.07, { gain: 0.016 }); no(EV.singing + 0.1);
// tags
for (const t of [EV.cloud - 0.1, EV.follows - 0.15, EV.only - 0.15, EV.up - 0.1, EV.now - 0.1, EV.beat - 0.2, EV.quiet - 0.2, EV.fluffy - 0.15]) pop(t);
ok(EV.wings - 0.02); no(EV.voice - 0.02);
// "she follows it": a little rising chirp as she picks up the trail
tone(sfx, EV.follows, 0.5, { duty: 0.125, f: (u) => 900 + 700 * u, v: env(0.2, 0.4), gain: 0.008 });
// warmth: a soft rising shimmer
tone(sfx, EV.up - 0.1, EV.warmthEnd - EV.up + 0.2, { wave: "tri", f: (u, tt) => 330 + 30 * Math.sin(tt * 18), v: env(0.25, 0.3), gain: 0.012 });
// the love song: he flies in (a flutter), the antennae ring, the "fit" chime and a heart
noise(EV.males - 1.2, 1.4, (u) => 3000 + 1500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.005);
seq(EV.fit - 0.05, [NOTE(83), NOTE(90), NOTE(95)], 0.08, { gain: 0.016, duty: 0.125 }); seq(EV.fit + 0.2, [NOTE(88), NOTE(95)], 0.07, { gain: 0.014 });
// the landing: a tiny tap as her feet touch, then silence; his eye pops open; she takes off again (a zip)
noise(EV.stops + 0.1, 0.03, () => 3500, (u) => 1 - u, 0.012);
{ let prev = 0; for (let t = EV.landed - 0.3; t < EV.dark; t += 1 / 60) { const a = awake(t); if (prev < 0.5 && a >= 0.5) tone(sfx, t - 0.15, 0.3, { duty: 0.5, f: (u) => 300 + 500 * u, v: env(0.1, 0.4), gain: 0.012 }); if (prev > 0.5 && a <= 0.5) tone(sfx, t - 0.2, 0.35, { wave: "tri", f: (u) => 600 - 250 * u, v: env(0.2, 0.4), gain: 0.02 }); prev = a; } }
tone(sfx, EV.so2 + 0.05, 0.25, { duty: 0.125, f: (u) => 600 + 900 * u, v: env(0.1, 0.4), gain: 0.008 });
// camera moves: a soft air swish as long as each move
for (const [a, b] of CAM_MOVES) if (b - a > 0.25 && b < END) noise(a, b - a, (u) => 600 + 1400 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.005);

// ---------------------------------------------------------------- bed: a quiet night lullaby, E – C#m – A – B, 20 whole bars (B → E across the seam)
const BARS = 20, BAR = END / BARS, BEAT = BAR / 4, prog = [[52, 56, 59], [49, 52, 56], [45, 49, 52], [47, 51, 54]];
const level = (t) => (1 - 0.85 * win(t, EV.now - 0.1, EV.whine1 + 0.2, 0.3, 0.6)) * (1 - 0.75 * win(t, EV.stops, EV.so2, 0.12, 0.5));
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, l = level(t); tone(bed, t, BEAT * 0.95, { wave: "tri", f: () => NOTE(ch[0] - 12), v: (u) => 1 - 0.5 * u, gain: 0.06 * l }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, l = level(t), nn = ch[[0, 1, 2, 1, 2, 1, 0, 1][s8]] + 24;
    tone(bed, t, (BEAT / 2) * 1.5, { duty: 0.125, f: () => NOTE(nn), v: (u) => 1 - 0.85 * u, gain: 0.012 * l }); }
}
for (const buf of [sfx, bed]) { const hz = buf === bed ? 6000 : 9000, a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }

function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/wings.wav", wings); writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of wings) pk = Math.max(pk, Math.abs(v));
console.log("whine peak", pk.toFixed(3), "seam jump", Math.abs(wings[N - 1] - wings[0]).toFixed(4), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
