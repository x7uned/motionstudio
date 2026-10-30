// «Pumpkin face» — sound, all synthesised 8-bit. → audio/bed.wav (the spooky chiptune bed) + audio/sfx.wav (events),
// 48 kHz stereo, exactly 10.0 s each.
// Bed: A minor, 96 bpm, 4 bars = 16 beats = 10.0 s, so it cycles with the picture's loop: square "organ" chords
// Am | F | Dm | E, a slow triangle bass, a music-box bell line. Tails past 10 s wrap round to the start (no fade).
// Events: one per visible motion from timeline.mjs MOTIONS; every sound lasts exactly its motion window.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { MOTIONS, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.round(END * SR), TAU = Math.PI * 2;
const bed = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 4242; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (buf, i, v, pan = 0, wrap = false) => { if (wrap) i = ((i % N) + N) % N; else if (i < 0 || i >= N) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); buf[0][i] += v * l * 1.414; buf[1][i] += v * r * 1.414; };
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);
const frac = (x) => x - Math.floor(x);
const sq = (ph, duty = 0.5) => (frac(ph) < duty ? 1 : -1);
const tri = (ph) => Math.round((4 * Math.abs(frac(ph) - 0.5) - 1) * 8) / 8;          // 4-bit-ish stepped triangle
const LP = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x, f2) => { const aa = f2 ? 1 - Math.exp((-TAU * f2) / SR) : a; y += aa * (x - y); return y; }; };
const HP = (fc) => { const lp = LP(fc); return (x) => x - lp(x); };
const env = (u) => Math.sin(Math.PI * Math.min(1, Math.max(0, u)));                       // 0 → 1 → 0 over the motion

// ---------------------------------------------------------------- the bed
const BEAT = 60 / 96, BAR = 4 * BEAT;   // 0.625 s, 2.5 s
const CHORDS = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];                // Am F Dm E
const BASS = [[45, 40], [41, 48], [38, 45], [40, 47]];                                     // root, fifth (half notes)
const BELL = [[81, null, 76, null, 84, null, 83, null], [81, null, 77, null, null, null, 76, null], [74, null, 77, null, 81, null, 80, null], [83, null, null, null, 80, null, 76, null]];
{ // organ: two detuned pulse voices per chord note, soft attack, crossfading into the next bar, low-passed
  const lp = [LP(1800), LP(1800)];
  for (let bar = 0; bar < 4; bar++) for (const m of CHORDS[bar]) for (const [det, duty, pan] of [[-0.06, 0.5, -0.35], [0.06, 0.25, 0.35]]) {
    const f = mtof(m + det), t0 = bar * BAR, len = BAR + 0.35;
    for (let j = 0; j < len * SR; j++) { const tt = j / SR, a = Math.min(1, tt / 0.12) * Math.min(1, (len - tt) / 0.35), vib = 1 + 0.004 * Math.sin(TAU * 5.2 * (t0 + tt)), trem = 0.85 + 0.15 * Math.sin(TAU * (1 / BEAT) * (t0 + tt));
      add(bed, Math.round((t0 + tt) * SR), sq(f * vib * tt, duty) * a * trem * 0.032, pan, true); } }
  // gentle low-pass over the whole organ track (two passes round the loop so the filter state is periodic)
  for (let pass = 0; pass < 2; pass++) for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) { const y = lp[c](bed[c][i]); if (pass) bed[c][i] = y; }
}
{ // bass: stepped triangle, plucked decay, half notes
  for (let bar = 0; bar < 4; bar++) BASS[bar].forEach((m, h) => { const f = mtof(m), t0 = bar * BAR + h * 2 * BEAT, len = 2 * BEAT + 0.1;
    for (let j = 0; j < len * SR; j++) { const tt = j / SR, a = Math.min(1, tt / 0.01) * (0.55 + 0.45 * Math.exp(-tt * 3)) * Math.min(1, (len - tt) / 0.1); add(bed, Math.round((t0 + tt) * SR), tri(f * tt) * a * 0.16, 0, true); } });
}
{ // music-box bell line: square 12.5 % + sine, quick decay, slight echo to one side
  for (let bar = 0; bar < 4; bar++) BELL[bar].forEach((m, k) => { if (m == null) return; const f = mtof(m), t0 = bar * BAR + k * (BEAT / 2);
    for (const [dt, g, pan] of [[0, 1, -0.15], [BEAT * 0.75, 0.3, 0.5]]) for (let j = 0; j < 0.9 * SR; j++) { const tt = j / SR, a = Math.min(1, tt / 0.003) * Math.exp(-tt * 5.5); add(bed, Math.round((t0 + dt + tt) * SR), (sq(f * tt, 0.125) * 0.35 + Math.sin(TAU * f * tt) * 0.65) * a * 0.05 * g, pan, true); } });
}
{ // a far low wind under it all (loop-exact gusts), the night air
  const lp = LP(500), hp = HP(120); const tmp = new Float32Array(N + SR);
  for (let i = 0; i < N + SR; i++) tmp[i] = lp(hp(rand()));
  for (let i = 0; i < N; i++) { const t = i / SR, g = 0.5 + 0.5 * Math.sin((TAU * 2 * t) / 10 + 0.7), x = i < SR ? tmp[i] * (i / SR) + tmp[N + i] * (1 - i / SR) : tmp[i];   // periodic: sample N continues into 0
    add(bed, i, x * 0.07 * (0.6 + 0.4 * g), 0.3 * Math.sin((TAU * t) / 10)); }
}

// ---------------------------------------------------------------- events (each exactly its motion)
const GEN = {
  blip(m, i, u, tt) { const f = mtof(m.note) * (1 + u); return sq(f * tt, 0.25) * 0.22 * env(u) ** 0.5; },                      // the outline draws round a hole: a rising square
  trace(m, i, u, tt) { const steps = [69, 72, 76, 79, 81, 84], k = Math.min(steps.length - 1, Math.floor(u * steps.length)); return sq(mtof(steps[k]) * tt, 0.5) * 0.15 * env(u) ** 0.4; },
  whoosh(m, i, u, tt, st) { st.lp = st.lp || LP(400); return st.lp(rand(), 300 + 3800 * env(u)) * 0.9 * env(u); },
  detect(m, i, u, tt) { const a = mtof(88) * (1 - 0.5 * u), b = mtof(64) * (1 + 1.0 * u), lock = u > 0.92 ? 1.6 : 1; return (sq(a * tt, 0.25) + sq(b * tt, 0.5)) * 0.07 * Math.min(1, u * 8) * Math.min(1, (1 - u) * 14) * lock; },
  ignite(m, i, u, tt, st) { st.lp = st.lp || LP(900); const fw = st.lp(rand(), 200 + 2200 * u) * 0.8 * Math.exp(-u * 2) * Math.min(1, u * 20); return fw + tri(mtof(57 + 12 * u) * tt) * 0.12 * env(u); },
  count(m, i, u, tt, st) { const per = 0.064, k = Math.floor(tt / per), ph = tt - k * per; if (ph > 0.022) return 0; return sq(mtof(76 + Math.min(14, k)) * ph, 0.5) * 0.1 * (1 - ph / 0.022); },
  ding(m, i, u, tt) { return (Math.sin(TAU * mtof(93) * tt) * 0.6 + sq(mtof(81) * tt, 0.125) * 0.25) * 0.22 * Math.min(1, tt / 0.003) * (1 - u) ** 1.2; },
  sparkle(m, i, u, tt) { const notes = [81, 88, 84, 93, 86, 91], k = Math.floor(u * notes.length), ph = u * notes.length - k; return sq(mtof(notes[Math.min(5, k)]) * tt, 0.125) * 0.08 * (1 - ph) * env(u) ** 0.3; },
  glow(m, i, u, tt) { const notes = [57, 60, 64, 69, 72, 76], k = Math.min(5, Math.floor(u * 6)); let v = 0; for (let q = 0; q <= k; q++) v += sq(mtof(notes[q]) * tt * (1 + 0.003 * q), 0.5) * (q === k ? 1 : 0.45); return v * 0.045 * Math.min(1, u * 6) * Math.min(1, (1 - u) * 6); },
  ring(m, i, u, tt) { return Math.sin(TAU * mtof(88 - 7 * u) * tt) * 0.1 * (1 - u) * Math.min(1, u * 30); },
  beam(m, i, u, tt) { const f = mtof(84 - 24 * u), trem = 0.6 + 0.4 * Math.sin(TAU * 18 * tt); return sq(f * tt, 0.25) * 0.09 * trem * env(u) ** 0.5; },
  boing(m, i, u, tt) { const f = mtof(52 + 14 * Math.sin(Math.PI * u)); return tri(f * tt) * 0.3 * env(u) ** 0.4; },
  wink(m, i, u, tt) { const f = mtof(u < 0.5 ? 88 : 93); return (Math.sin(TAU * f * tt) * 0.7 + sq(f * tt, 0.125) * 0.2) * 0.12 * Math.exp(-((u % 0.5) * 2) * 3) * env(u) ** 0.2; },
  fold(m, i, u, tt, st) { st.lp = st.lp || LP(300); return st.lp(rand(), 2400 - 2000 * u) * 0.55 * env(u); },
  fall(m, i, u, tt, st) { st.lp = st.lp || LP(700); const f = mtof(69 - 12 * u), puff = u < 0.25 ? st.lp(rand()) * 0.6 * env(u / 0.25) : 0; return sq(f * tt, 0.5) * 0.07 * (1 - u) * Math.min(1, u * 20) + puff; },
};
const PAN = { blip: 0, trace: 0, detect: 0, ignite: 0, count: 0.3, ding: 0.3, sparkle: -0.3, glow: -0.3, ring: -0.3, beam: -0.1, boing: 0, wink: 0.15, fold: 0, fall: 0 };
for (const m of MOTIONS) { const g = GEN[m.kind]; if (!g) throw new Error("no sound for " + m.kind); const i0 = Math.round(m.t0 * SR), n = Math.round((m.t1 - m.t0) * SR), st = {};
  for (let j = 0; j < n; j++) { const u = j / n, v = g(m, j, u, j / SR, st); add(sfx, i0 + j, v * Math.min(1, j / 48, (n - j) / 96), m.pan ?? PAN[m.kind] ?? 0); } }

// ---------------------------------------------------------------- write (16-bit stereo)
function write(file, buf) {
  const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  let pk = 0; for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = buf[c][i]; pk = Math.max(pk, Math.abs(v)); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + (i * 2 + c) * 2); }
  fs.writeFileSync(file, out); return pk;
}
fs.mkdirSync(HERE + "audio", { recursive: true });
console.log("bed peak", write(HERE + "audio/bed.wav", bed).toFixed(3), "sfx peak", write(HERE + "audio/sfx.wav", sfx).toFixed(3), "motions", MOTIONS.length);
