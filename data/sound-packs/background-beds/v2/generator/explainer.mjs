// Explainer-style procedural beds (candidates, 2026-10-20). Deterministic; raw float32 stereo 48 kHz.
// node explainer.mjs <id> <seconds> <out.f32>
import fs from 'node:fs';
const SR = 48000, TAU = Math.PI * 2;
const [,, variant, seconds, out] = process.argv;
const N = Math.round(Number(seconds) * SR), T = N / SR;
let seed = 4242;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const mtof = m => 440 * 2 ** ((m - 69) / 12);
const smooth = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const CH = { maj: [0, 4, 7], min: [0, 3, 7], maj7: [0, 4, 7, 11], min7: [0, 3, 7, 10], add9: [0, 4, 7, 14], sus2: [0, 2, 7], six: [0, 4, 7, 9], min9: [0, 3, 7, 14] };
const chord = (root, type) => CH[type].map(i => root + i);
const put = (b, i, v, pan) => { if (i >= 0 && i < N) { b.L[i] += v * Math.cos(pan * Math.PI / 2); b.R[i] += v * Math.sin(pan * Math.PI / 2); } };

function pad(b, midi, t0, dur, amp, { attack = 2.5, release = 3, harm = 4, detune = 5, saw = false } = {}) {
  const f = mtof(midi), s0 = Math.max(0, Math.floor(t0 * SR)), s1 = Math.min(N, Math.floor((t0 + dur + release) * SR));
  const H = []; for (let h = 1; h <= harm; h++) H.push([h, saw ? 1 / h : [1, .35, .15, .06, .03, .02][h - 1] ?? .01, rnd() * TAU, rnd() * TAU]);
  const fl = f * 2 ** (-detune / 1200), fr = f * 2 ** (detune / 1200);
  for (let i = s0; i < s1; i++) {
    const t = i / SR - t0, env = smooth(t / attack) * (t > dur ? 1 - smooth((t - dur) / release) : 1);
    if (env <= 0) continue;
    let l = 0, r = 0; for (const [h, a, pl, pr] of H) { l += a * Math.sin(pl + TAU * fl * h * t); r += a * Math.sin(pr + TAU * fr * h * t); }
    b.L[i] += l * env * amp; b.R[i] += r * env * amp;
  }
}
function tone(b, midi, t0, amp, pan, decay, partials, attack = 0.004) {
  const f = mtof(midi), s0 = Math.floor(t0 * SR), len = Math.floor(Math.min(decay * 5, 6) * SR);
  for (let k = 0; k < len; k++) {
    const t = k / SR; let v = 0;
    for (const [h, a, dk = 1] of partials) v += a * Math.exp(-t * dk / decay) * Math.sin(TAU * f * h * t);
    put(b, s0 + k, v * Math.min(1, t / attack) * amp, pan);
  }
}
function pluck(b, midi, t0, amp, pan, decay = 1, bright = 0.5) { // Karplus–Strong
  const f = mtof(midi), P = Math.max(2, Math.round(SR / f)), buf = new Float32Array(P);
  let y = 0; for (let i = 0; i < P; i++) { y += bright * ((rnd() * 2 - 1) - y); buf[i] = y; }
  const g = Math.exp(-1 / (decay * f)), s0 = Math.floor(t0 * SR), len = Math.floor(decay * 4 * SR);
  let prev = 0;
  for (let k = 0; k < len; k++) { const j = k % P, v = buf[j]; buf[j] = g * 0.5 * (v + prev); prev = v; put(b, s0 + k, v * amp * Math.min(1, k / 48), pan); }
}
function piano(b, midi, t0, amp, pan, decay = 3) {
  const f = mtof(midi), s0 = Math.floor(t0 * SR), len = Math.floor(decay * 3 * SR), B = 0.0003;
  const P = []; for (let k = 1; k <= 7; k++) P.push([k * Math.sqrt(1 + B * k * k), 1 / k ** 1.4, 1 + 0.7 * k]);
  for (let i = 0; i < len; i++) {
    const t = i / SR; let v = 0;
    for (const [h, a, dk] of P) v += a * Math.exp(-t * dk / decay) * Math.sin(TAU * f * h * t);
    v += (rnd() * 2 - 1) * Math.exp(-t * 300) * 0.05; // soft felt thump
    put(b, s0 + i, v * Math.min(1, t / 0.005) * amp, pan);
  }
}
function square(b, midi, t0, amp, pan, decay, harm = 7) { tone(b, midi, t0, amp, pan, decay, Array.from({ length: harm }, (_, k) => [2 * k + 1, 1 / (2 * k + 1), 1 + k * 0.3]), 0.003); }
function kick(b, t0, amp) { const s0 = Math.floor(t0 * SR); for (let i = 0; i < SR * 0.35; i++) { const x = i / SR, v = Math.sin(TAU * (48 * x + 1.4 * (1 - Math.exp(-x * 35)))) * Math.exp(-x * 10) * Math.min(1, x / 0.002); put(b, s0 + i, v * amp, 0.5); } }
function hat(b, t0, amp, decay = 0.03, pan = 0.6) { const s0 = Math.floor(t0 * SR); let x1 = 0, y = 0; const a = 0.6; for (let i = 0; i < decay * 6 * SR; i++) { const w = rnd() * 2 - 1; y = a * (y + w - x1); x1 = w; put(b, s0 + i, y * Math.exp(-i / SR / decay) * amp, pan); } }
function brush(b, t0, amp) { const s0 = Math.floor(t0 * SR); let lp = 0, x1 = 0, hp = 0; for (let i = 0; i < SR * 0.25; i++) { const w = rnd() * 2 - 1; lp += 0.35 * (w - lp); hp = 0.9 * (hp + lp - x1); x1 = lp; put(b, s0 + i, hp * Math.exp(-i / SR * 14) * amp, 0.45); } }
function onePole(arr, cut) { let y = 0; for (let i = 0; i < arr.length; i++) { y += (1 - Math.exp(-TAU * cut(i) / SR)) * (arr[i] - y); arr[i] = y; } }
function lowpass(b, cut) { onePole(b.L, cut); onePole(b.R, cut); onePole(b.L, cut); onePole(b.R, cut); }
function highPass(arr, hz) { const a = Math.exp(-TAU * hz / SR); let x1 = 0, y = 0; for (let i = 0; i < arr.length; i++) { y = a * (y + arr[i] - x1); x1 = arr[i]; arr[i] = y; } }
const lfo = (i, p, ph = 0) => Math.sin(TAU * i / SR / p + ph);
function pump(b, beat, depth = 0.5) { for (let i = 0; i < N; i++) { const x = ((i / SR) % beat) / beat, g = 1 - depth * (1 - smooth(x / 0.45)); b.L[i] *= g; b.R[i] *= g; } }
function reverb(b, wet, room = 0.84, damp = 0.3) {
  const sc = SR / 44100, combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], aps = [556, 441, 341, 225];
  const inp = new Float32Array(N); for (let i = 0; i < N; i++) inp[i] = (b.L[i] + b.R[i]) * 0.015;
  for (const [arr, sp] of [[b.L, 0], [b.R, 23]]) {
    const c = combs.map(n => ({ b: new Float32Array(Math.round((n + sp) * sc)), i: 0, s: 0 })), a = aps.map(n => ({ b: new Float32Array(Math.round((n + sp) * sc)), i: 0 }));
    for (let i = 0; i < N; i++) {
      let o = 0;
      for (const k of c) { const y = k.b[k.i]; k.s = y * (1 - damp) + k.s * damp; k.b[k.i] = inp[i] + k.s * room; k.i = (k.i + 1) % k.b.length; o += y; }
      for (const k of a) { const bo = k.b[k.i]; k.b[k.i] = o + bo * 0.5; k.i = (k.i + 1) % k.b.length; o = bo - o; }
      arr[i] = arr[i] * (1 - wet) + o * wet * 3;
    }
  }
}
function padChords(b, prog, barSec, amp, opts = {}) { for (let k = 0, t = 0; t < T; k++, t += barSec) for (const m of prog[k % prog.length]) pad(b, m, t - 0.3, barSec, amp, { attack: 1.6, release: 2.2, ...opts }); }
function bars(bpm, fn) { const beat = 60 / bpm, bar = beat * 4; for (let k = 0, t = 0; t < T - 0.5; k++, t += bar) fn(k, t, beat); return beat; }
const master = bus(); const mix = (src, g = 1) => { for (let i = 0; i < N; i++) { master.L[i] += src.L[i] * g; master.R[i] += src.R[i] * g; } };

const v = variant;
if (v === 'pluck-curious') { // 90 BPM, F: Fadd9 – C/E – Dm7 – Bbmaj7; plucked arpeggio, the classic curious explainer
  const prog = [chord(53, 'add9'), [52, 55, 60, 64], chord(50, 'min7'), chord(46, 'maj7')];
  const p = bus(), pd = bus(), dr = bus(), pat = [0, 2, 1, 3, 2, -1, 3, 1];
  const beat = bars(90, (k, t, b) => { const c = prog[k % 4]; pat.forEach((ix, j) => { if (ix >= 0) pluck(p, c[ix % c.length] + 12, t + j * b / 2, 0.16, j % 2 ? 0.65 : 0.35, 0.9, 0.45); }); pluck(p, c[0] - 12, t, 0.16, 0.5, 1.6, 0.3); });
  padChords(pd, prog, beat * 4, 0.018, { harm: 3 }); lowpass(pd, () => 900);
  for (let t = beat / 2; t < T; t += beat) hat(dr, t, 0.012, 0.025);
  mix(p); mix(pd); mix(dr); reverb(master, 0.3);
} else if (v === 'glass-arp') { // 100 BPM, Am – F – C – G; glassy 16th arpeggio with a slow filter sweep
  const prog = [chord(57, 'min'), chord(53, 'maj7'), chord(48, 'add9'), chord(55, 'six')];
  const a = bus(), pd = bus(), order = [0, 1, 2, 3, 2, 1, 0, 2];
  const beat = bars(100, (k, t, b) => { const c = prog[k % 4]; for (let j = 0; j < 16; j++) tone(a, c[order[j % 8] % c.length] + 12, t + j * b / 4, 0.05, j % 2 ? 0.75 : 0.25, 0.35, [[1, 1], [2, 0.12, 2], [3, 0.06, 3]]); });
  lowpass(a, i => 1400 + 1100 * lfo(i, 32));
  padChords(pd, prog, beat * 4, 0.02, { harm: 3 }); lowpass(pd, () => 800);
  mix(a); mix(pd); reverb(master, 0.38, 0.86);
} else if (v === 'data-pulse') { // 96 BPM, D: Dmaj7 – Bm7 – Gmaj7 – A6; pumping pad + quiet digital ticks (bytes)
  const prog = [chord(50, 'maj7'), chord(47, 'min7'), chord(43, 'maj7'), chord(45, 'six')];
  const pd = bus(), tk = bus(), sub = bus();
  const beat = bars(96, (k, t, b) => {
    for (let j = 0; j < 16; j++) if (rnd() < 0.55) tone(tk, 96 + [0, 3, 7, 10][Math.floor(rnd() * 4)], t + j * b / 4, 0.012 + rnd() * 0.012, 0.2 + rnd() * 0.6, 0.02, [[1, 1]], 0.001);
    tone(sub, prog[k % 4][0] - 12, t, 0.12, 0.5, 0.8, [[1, 1], [2, 0.3, 2]]); tone(sub, prog[k % 4][0] - 12, t + 2 * b, 0.09, 0.5, 0.6, [[1, 1], [2, 0.3, 2]]);
  });
  padChords(pd, prog, beat * 4, 0.03, { harm: 5 }); lowpass(pd, i => 1300 + 400 * lfo(i, 24)); pump(pd, beat, 0.45);
  mix(pd); mix(tk); mix(sub); reverb(master, 0.25);
} else if (v === 'kalimba-loop') { // 84 BPM, G – Em – C – D; kalimba ostinato + shaker
  const prog = [chord(55, 'maj'), chord(52, 'min'), chord(48, 'maj'), chord(50, 'sus2')];
  const kl = bus(), pd = bus(), sh = bus(), mel = [[0, 0], [0.75, 2], [1.5, 1], [2, 0], [2.5, 2], [3.25, 1]];
  const kal = [[1, 1], [5.95, 0.14, 4], [2, 0.04, 2]];
  const beat = bars(84, (k, t, b) => { const c = prog[k % 4]; for (const [at, ix] of mel) tone(kl, c[ix] + 12 + (k % 2 && ix === 2 ? 2 : 0), t + at * b, 0.09, 0.3 + ix * 0.2, 0.9, kal, 0.002); tone(kl, c[0], t, 0.08, 0.5, 1.4, kal, 0.002); });
  padChords(pd, prog, beat * 4, 0.016, { harm: 3 }); lowpass(pd, () => 800);
  for (let t = 0; t < T; t += beat / 4) hat(sh, t, (Math.round(t / (beat / 4)) % 2 ? 0.006 : 0.011), 0.04, 0.55);
  mix(kl); mix(pd); mix(sh); reverb(master, 0.3);
} else if (v === 'chip-soft') { // 110 BPM, C – Am – F – G; soft filtered 8-bit arpeggio, ties to pixels and the 8-bit outro
  const prog = [chord(60, 'maj'), chord(57, 'min'), chord(53, 'maj'), chord(55, 'maj')];
  const ar = bus(), bs = bus(), dr = bus(), pd = bus(), order = [0, 1, 2, 1];
  const beat = bars(110, (k, t, b) => { const c = prog[k % 4]; for (let j = 0; j < 16; j++) square(ar, c[order[j % 4]] + 12, t + j * b / 4, 0.035, j % 2 ? 0.7 : 0.3, 0.12); for (let j = 0; j < 8; j++) square(bs, c[0] - 24 + (j % 4 === 3 ? 7 : 0), t + j * b / 2, 0.06, 0.5, 0.18, 5); });
  lowpass(ar, i => 2200 + 600 * lfo(i, 20)); lowpass(bs, () => 700);
  for (let t = beat / 2; t < T; t += beat) hat(dr, t, 0.012, 0.02);
  padChords(pd, prog, beat * 4, 0.012, { harm: 2 }); lowpass(pd, () => 700);
  mix(ar); mix(bs); mix(dr); mix(pd); reverb(master, 0.22);
} else if (v === 'felt-piano') { // 70 BPM, C – G/B – Am – F; minimal felt piano motif
  const prog = [[48, 60, 64, 67], [47, 59, 62, 67], [45, 60, 64, 69], [41, 60, 65, 69]];
  const pn = bus(), pd = bus(), motif = [[0, 1], [1, 2], [1.5, 3], [2.5, 2], [3, 1]];
  const beat = bars(70, (k, t, b) => { const c = prog[k % 4]; piano(pn, c[0], t, 0.09, 0.4, 3.5); piano(pn, c[0] + 7, t + 0.02, 0.05, 0.45, 3); for (const [at, ix] of motif) piano(pn, c[ix] + 12, t + at * b, 0.055, 0.6, 2.2); });
  lowpass(pn, () => 3000); padChords(pd, prog.map(c => c.slice(1)), beat * 4, 0.01, { harm: 2 }); lowpass(pd, () => 700);
  mix(pn); mix(pd); reverb(master, 0.4, 0.86);
} else if (v === 'mallet-groove') { // 88 BPM, Fmaj7 – Am7 – Gm7 – C; marimba groove, soft kit, plucked bass
  const prog = [chord(53, 'maj7'), chord(57, 'min7'), chord(55, 'min7'), chord(48, 'six')];
  const mr = bus(), dr = bus(), bs = bus(), hits = [[0, 0], [0.5, 2], [1.5, 1], [2, 3], [2.75, 2], [3.5, 1]];
  const mar = [[1, 1], [3.93, 0.22, 3], [9.2, 0.04, 6]];
  bars(88, (k, t, b) => {
    const c = prog[k % 4]; for (const [at, ix] of hits) tone(mr, c[ix] + 12, t + at * b, 0.08, 0.3 + 0.13 * ix, 0.45, mar, 0.002);
    kick(dr, t, 0.11); kick(dr, t + 2.5 * b, 0.07); brush(dr, t + b, 0.05); brush(dr, t + 3 * b, 0.05);
    for (let j = 0; j < 8; j++) hat(dr, t + j * b / 2, j % 2 ? 0.012 : 0.006, 0.025);
    pluck(bs, c[0] - 12, t, 0.2, 0.5, 1.2, 0.25); pluck(bs, c[0] - 12 + 7, t + 1.5 * b, 0.14, 0.5, 0.8, 0.25); pluck(bs, c[0] - 12, t + 2.5 * b, 0.16, 0.5, 0.8, 0.25);
  });
  lowpass(bs, () => 500); mix(mr); mix(dr); mix(bs); reverb(master, 0.2);
} else if (v === 'synth-bloom') { // 92 BPM, Em – C – G – D; warm saw pad opening per phrase + 8th bass pulse, discovery mood
  const prog = [chord(52, 'min'), chord(48, 'maj7'), chord(55, 'add9'), chord(50, 'sus2')];
  const pd = bus(), bs = bus(), pg = bus();
  const beat = bars(92, (k, t, b) => { const r = prog[k % 4][0] - 12; for (let j = 0; j < 8; j++) tone(bs, r, t + j * b / 2, j % 2 ? 0.05 : 0.08, 0.5, 0.18, [[1, 1], [2, 0.4, 2], [3, 0.15, 3]]); if (k % 4 === 0) tone(pg, prog[k % 4][2] + 24, t, 0.05, 0.6, 2.5, [[1, 1], [2.76, 0.2, 2], [5.4, 0.06, 4]]); });
  padChords(pd, prog, beat * 4, 0.012, { harm: 10, saw: true, detune: 9 });
  const phrase = beat * 16; lowpass(pd, i => 500 + 1500 * smooth(((i / SR) % phrase) / phrase)); lowpass(bs, () => 900);
  mix(pd); mix(bs); mix(pg); reverb(master, 0.35, 0.86);
} else if (v === 'bit-rain') { // free time, D: soft low pad + sparse falling data blips
  const pd = bus(), bl = bus(), air = bus(), scale = [74, 76, 78, 81, 83, 86, 88, 90, 93];
  for (let t = -1, k = 0; t < T; t += 10, k++) for (const m of [[38, 45, 52, 57], [38, 47, 54, 57], [43, 50, 57, 62], [40, 47, 54, 59]][k % 4]) pad(pd, m, t, 10, 0.022, { attack: 4, release: 4, harm: 4 });
  lowpass(pd, i => 1100 + 400 * lfo(i, 27));
  for (let t = 1; t < T - 2; t += 0.6 + rnd() * 1.4) { let n = Math.floor(rnd() * scale.length); const len = 1 + Math.floor(rnd() * 4), pan = 0.15 + rnd() * 0.7; for (let j = 0; j < len; j++) { tone(bl, scale[Math.max(0, n - j)], t + j * 0.11, 0.035 * (1 - j * 0.18), pan, 0.25, [[1, 1], [2, 0.1, 2]], 0.002); } }
  for (let i = 0; i < N; i++) { const w = (rnd() * 2 - 1) * 0.004; air.L[i] = w; air.R[i] = -w; } highPass(air.L, 3000); highPass(air.R, 3000);
  mix(pd); mix(bl); mix(air); reverb(master, 0.45, 0.88);
} else if (v === 'pizzicato-bounce') { // 112 BPM, C – Am – F – G; playful plucks, glockenspiel accents, shaker
  const prog = [chord(60, 'maj'), chord(57, 'min'), chord(53, 'maj'), chord(55, 'maj')];
  const pz = bus(), gl = bus(), sh = bus();
  const beat = bars(112, (k, t, b) => {
    const c = prog[k % 4]; pluck(pz, c[0] - 12, t, 0.2, 0.5, 0.35, 0.35); pluck(pz, c[0] - 5, t + 2 * b, 0.17, 0.5, 0.35, 0.35);
    for (const at of [1, 1.5, 3, 3.5]) for (const [j, m] of c.entries()) pluck(pz, m, t + at * b + j * 0.006, 0.07, 0.3 + 0.2 * j, 0.25, 0.5);
    if (k % 2 === 0) [0, 1, 2].forEach(j => tone(gl, c[2 - j] + 24, t + (2.5 + j * 0.5) * b, 0.035, 0.7, 0.7, [[1, 1], [2.76, 0.18, 2], [5.4, 0.05, 4]], 0.002));
  });
  for (let t = 0; t < T; t += beat / 2) hat(sh, t, Math.round(t / (beat / 2)) % 2 ? 0.014 : 0.007, 0.035, 0.6);
  lowpass(pz, () => 3500); mix(pz); mix(gl); mix(sh); reverb(master, 0.22);
} else throw new Error('unknown variant ' + v);

highPass(master.L, 35); highPass(master.R, 35);
for (let i = 0; i < N; i++) { const t = i / SR, g = smooth(t / 2.5) * smooth((T - t) / 3); master.L[i] *= g; master.R[i] *= g; }
const inter = new Float32Array(N * 2); for (let i = 0; i < N; i++) { inter[2 * i] = master.L[i]; inter[2 * i + 1] = master.R[i]; }
fs.writeFileSync(out, Buffer.from(inter.buffer));
