// Procedural background beds: deterministic, stereo 48 kHz float32 raw output.
import fs from 'node:fs';
const SR = 48000;
const [,, variant, seconds, out] = process.argv;
const N = Math.round(Number(seconds) * SR);
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 12345;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const TAU = Math.PI * 2;
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);

// ---- building blocks ----
function padNote(midi, t0, dur, amp, { attack = 3, release = 4, bright = 0.5, detune = 5 } = {}) {
  const f = mtof(midi), s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(N, Math.floor((t0 + dur + release) * SR));
  const parts = [[1, 1], [2, 0.35 * bright], [3, 0.15 * bright], [4, 0.06 * bright]];
  const ph = parts.map(() => [rnd() * TAU, rnd() * TAU]);
  for (let i = s0; i < s1; i++) {
    const t = i / SR - t0;
    const env = smooth(t / attack) * (t > dur ? 1 - smooth((t - dur) / release) : 1);
    if (env <= 0) continue;
    let l = 0, r = 0;
    for (let p = 0; p < parts.length; p++) {
      const [h, a] = parts[p];
      const fl = f * h * 2 ** (-detune / 1200), fr = f * h * 2 ** (detune / 1200);
      l += a * Math.sin(ph[p][0] + TAU * fl * t);
      r += a * Math.sin(ph[p][1] + TAU * fr * t);
    }
    L[i] += l * env * amp; R[i] += r * env * amp;
  }
}
function bell(midi, t0, amp, pan, decay = 2.4, partials = [[1, 1], [2.0, 0.28], [3.01, 0.09], [4.17, 0.04]]) {
  const f = mtof(midi), s0 = Math.floor(t0 * SR), s1 = Math.min(N, s0 + Math.floor(decay * 4 * SR));
  const gl = Math.cos(pan * Math.PI / 2), gr = Math.sin(pan * Math.PI / 2);
  for (let i = s0; i < s1; i++) {
    const t = (i - s0) / SR;
    let v = 0;
    for (const [h, a] of partials) v += a * Math.exp(-t * h / decay) * Math.sin(TAU * f * h * t);
    v *= Math.min(1, t / 0.006) * amp;
    L[i] += v * gl; R[i] += v * gr;
  }
}
function onePole(buf, cutoffFn) { // cutoffFn(i) -> Hz
  let y = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = 1 - Math.exp(-TAU * cutoffFn(i) / SR);
    y += a * (buf[i] - y); buf[i] = y;
  }
}
function highPass(buf, hz) {
  const a = Math.exp(-TAU * hz / SR); let x1 = 0, y = 0;
  for (let i = 0; i < buf.length; i++) { y = a * (y + buf[i] - x1); x1 = buf[i]; buf[i] = y; }
}
// Freeverb (Schroeder/Moorer), stereo
function reverb(wet, room = 0.86, damp = 0.25) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const make = spread => ({
    c: combs.map(n => ({ b: new Float32Array(Math.round((n + spread) * scale)), i: 0, s: 0 })),
    a: aps.map(n => ({ b: new Float32Array(Math.round((n + spread) * scale)), i: 0 })),
  });
  const chans = [[L, make(0)], [R, make(23)]];
  const inp = new Float32Array(N); for (let i = 0; i < N; i++) inp[i] = (L[i] + R[i]) * 0.015;
  for (const [buf, st] of chans) {
    for (let i = 0; i < N; i++) {
      let o = 0;
      for (const c of st.c) {
        const y = c.b[c.i]; c.s = y * (1 - damp) + c.s * damp;
        c.b[c.i] = inp[i] + c.s * room; c.i = (c.i + 1) % c.b.length; o += y;
      }
      for (const a of st.a) { const bo = a.b[a.i]; a.b[a.i] = o + bo * 0.5; a.i = (a.i + 1) % a.b.length; o = bo - o; }
      buf[i] = buf[i] * (1 - wet) + o * wet * 3;
    }
  }
}
function noise(kind) { // 'white' | 'pink' | 'brown'
  const b = new Float32Array(N); let b0 = 0, b1 = 0, b2 = 0, br = 0;
  for (let i = 0; i < N; i++) {
    const w = rnd() * 2 - 1;
    if (kind === 'white') b[i] = w;
    else if (kind === 'pink') { b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0527; b[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2; }
    else { br = (br + w * 0.02) * 0.998; b[i] = br * 3; }
  }
  return b;
}
const slowLfo = (i, periods) => periods.reduce((s, [p, ph]) => s + Math.sin(TAU * i / SR / p + ph), 0) / periods.length;

// ---- variants ----
const T = N / SR;
if (variant === 'warm-pad') {
  // Cmaj9 → Am9 → Fmaj9 → G6/9, 8 s per chord, long crossfades
  const chords = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 57], [43, 50, 55, 57, 59]];
  for (let k = 0, t = -2; t < T; k++, t += 8) for (const m of chords[k % 4]) padNote(m, t, 8, 0.05, { attack: 3.5, release: 4.5, bright: 0.6 });
  for (const b of [L, R]) onePole(b, i => 900 + 500 * slowLfo(i, [[23, 0], [37, 1]]));
  reverb(0.45);
} else if (variant === 'music-box') {
  const chords = [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59]];
  for (let k = 0, t = -2; t < T; k++, t += 8) for (const m of chords[k % 4]) padNote(m, t, 8, 0.03, { attack: 3, release: 4, bright: 0.3 });
  for (const b of [L, R]) onePole(b, () => 700);
  const scale = [72, 74, 76, 79, 81, 84, 76, 79];
  for (let t = 1.5; t < T - 3; t += 0.9 + rnd() * 1.8) {
    bell(scale[Math.floor(rnd() * scale.length)], t, 0.07 + rnd() * 0.04, 0.2 + rnd() * 0.6);
    if (rnd() < 0.25) bell(scale[Math.floor(rnd() * 5)] - 12, t + 0.45, 0.05, 0.5);
  }
  reverb(0.5, 0.88, 0.3);
} else if (variant === 'nature-air') {
  // wind (brown noise, gusting lowpass) + slow distant waves (pink noise swells) + faint warm drone
  const wind = noise('brown'), wind2 = noise('brown');
  const gust = i => 0.55 + 0.45 * slowLfo(i, [[11, 0], [17, 2], [29, 4]]);
  onePole(wind, i => 450 + 900 * gust(i)); onePole(wind2, i => 470 + 860 * gust(i + SR * 3));
  const rustle = noise('pink'); highPass(rustle, 1200); onePole(rustle, () => 4500);
  const waves = noise('pink'); highPass(waves, 180); onePole(waves, () => 1600);
  const swells = []; for (let t = 0; t < T + 10; t += 7 + rnd() * 4) swells.push(t);
  const swell = tt => { let v = 0; for (const s of swells) { const x = tt - s; if (x > 0 && x < 9) v += x < 3 ? smooth(x / 3) : 1 - smooth((x - 3) / 6); } return v; };
  for (let i = 0; i < N; i++) {
    const g = gust(i), w = swell(i / SR);
    const ru = rustle[i] * 0.05 * g * g;
    L[i] += wind[i] * 0.4 * (0.5 + 0.5 * g) + waves[i] * 0.3 * w + ru;
    R[i] += wind2[i] * 0.4 * (0.5 + 0.5 * g) + waves[i] * 0.26 * w - ru * 0.6;
  }
  padNote(48, -3, T + 3, 0.012, { attack: 6, release: 4, bright: 0.2 });
  padNote(55, -3, T + 3, 0.009, { attack: 8, release: 4, bright: 0.2 });
  reverb(0.25, 0.8, 0.4);
} else if (variant === 'space-drone') {
  for (const [m, a] of [[36, 0.035], [43, 0.035], [48, 0.035], [55, 0.03], [60, 0.02], [67, 0.012]]) padNote(m, -4, T + 4, a, { attack: 8, release: 5, bright: 0.9, detune: 7 });
  // shimmering high partials fading in and out
  for (let t = 0; t < T; t += 5 + rnd() * 5) padNote([67, 71, 74, 76, 79][Math.floor(rnd() * 5)], t, 4 + rnd() * 4, 0.018, { attack: 4, release: 6, bright: 0.2, detune: 9 });
  for (const b of [L, R]) onePole(b, i => 2200 + 900 * slowLfo(i, [[31, 0], [19, 3]]));
  const air = noise('pink'); highPass(air, 2500);
  for (let i = 0; i < N; i++) { const a = air[i] * 0.008 * (0.6 + 0.4 * slowLfo(i, [[13, 1]])); L[i] += a; R[i] -= a; }
  reverb(0.6, 0.92, 0.2);
} else if (variant === 'lofi-pulse') {
  const bpm = 72, beat = 60 / bpm, bar = beat * 4;
  const chords = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
  const rhodes = [[1, 1], [2, 0.22], [3, 0.05]];
  for (let k = 0, t = 0; t < T - 1; k++, t += bar) {
    for (const m of chords[k % 4]) { bell(m, t, 0.035, 0.35 + rnd() * 0.3, 1.6, rhodes); bell(m, t + beat * 2.5, 0.02, 0.4 + rnd() * 0.2, 1.2, rhodes); }
    bell(chords[k % 4][0] - 12, t, 0.06, 0.5, 2.2, [[1, 1], [2, 0.1]]);
  }
  for (const b of [L, R]) onePole(b, () => 2400);
  // soft kick + brushed hats + vinyl
  for (let t = 0; t < T - 1; t += beat) {
    const s0 = Math.floor(t * SR), isKick = Math.round(t / beat) % 2 === 0;
    for (let i = 0; i < SR * 0.4 && s0 + i < N; i++) {
      const x = i / SR;
      if (isKick) { const v = Math.sin(TAU * (50 * x + 30 * (1 - Math.exp(-x * 30)) / 30)) * Math.exp(-x * 9) * 0.09; L[s0 + i] += v; R[s0 + i] += v; }
    }
    const h0 = Math.floor((t + beat / 2) * SR);
    for (let i = 0; i < SR * 0.12 && h0 + i < N; i++) { const v = (rnd() * 2 - 1) * Math.exp(-i / SR * 40) * 0.012; L[h0 + i] += v * 0.7; R[h0 + i] += v; }
  }
  const hiss = noise('pink'); highPass(hiss, 3000);
  for (let i = 0; i < N; i++) { let v = hiss[i] * 0.004; if (rnd() < 0.00012) v += (rnd() - 0.5) * 0.08; L[i] += v; R[i] += v; }
  reverb(0.2, 0.75, 0.4);
}
// remove DC/rumble below phone range, fade edges
highPass(L, 35); highPass(R, 35);
for (let i = 0; i < N; i++) { const t = i / SR, g = smooth(t / 2.5) * smooth((T - t) / 3); L[i] *= g; R[i] *= g; }
const inter = new Float32Array(N * 2); for (let i = 0; i < N; i++) { inter[2 * i] = L[i]; inter[2 * i + 1] = R[i]; }
fs.writeFileSync(out, Buffer.from(inter.buffer));
