// «Pumpkin face» — sound, all synthesised. amb.wav = 8-bit spooky bed in A minor (organ squares, slow bass, bell);
// sfx.wav = events, each lasting exactly its picture motion (windows B from timeline.mjs). 48 kHz stereo, 10 s.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, EV, B } from "./timeline.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.ceil(END * SR), TAU = Math.PI * 2;
const amb = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 4242; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (buf, i, v, pan = 0) => { if (i < 0 || i >= N) return; buf[0][i] += v * Math.cos((pan + 1) * Math.PI / 4) * 1.414; buf[1][i] += v * Math.sin((pan + 1) * Math.PI / 4) * 1.414; };
const LP = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x, f2) => { y += (f2 ? 1 - Math.exp((-TAU * f2) / SR) : a) * (x - y); return y; }; };
const HP = (fc) => { const l = LP(fc); return (x) => x - l(x); };
const BP = (lo, hi) => { const h = HP(lo), l = LP(hi); return (x) => l(h(x)); };
const sq = (ph, duty = 0.5) => ((ph % 1) < duty ? 1 : -1), tri = (ph) => 4 * Math.abs((ph % 1) - 0.5) - 1;
const sm = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
const fq = (n) => 440 * Math.pow(2, (n - 69) / 12);                          // midi note → Hz
const win = (i, n, fi = 0.02, fo = 0.04) => Math.min(1, i / (fi * SR)) * Math.min(1, (n - i) / (fo * SR));   // smooth start and tail

// ---------------------------------------------------------------- bed: Am F E Am F Am, one chord = 2 beats at 66 bpm
{
  const beat = 60 / 66, chords = [[57, [57, 60, 64]], [53, [53, 57, 60]], [52, [52, 56, 59]], [57, [57, 60, 64]], [53, [53, 57, 60]], [45, [57, 60, 64]]];
  const lpO = LP(2600);
  for (let i = 0; i < N; i++) {
    const t = i / SR, ci = Math.min(chords.length - 1, Math.floor(t / (2 * beat))), [bass, tri3] = chords[ci], tc = t - ci * 2 * beat;
    const fadeIn = sm(t / 0.5), out = 1 - sm((t - (END - 0.9)) / 0.9), trem = 0.82 + 0.18 * Math.sin(TAU * 4.4 * t);
    let org = 0; for (const n of tri3) org += sq(fq(n + 12) * t, 0.25) * 0.5 + sq(fq(n) * t * 1.004, 0.5) * 0.5;
    const swell = sm(tc / 0.25) * (1 - 0.35 * sm((tc - 2.4 * beat) / (beat * 1.6)));
    const bs = sq(fq(bass - 12) * t, 0.5) * Math.exp(-tc * 0.9) * 0.9 * sm(tc / 0.01);
    const arp = sq(fq(tri3[Math.floor(t / (beat / 2)) % 3] + 24) * t, 0.125) * Math.exp(-((t % (beat / 2)) * 7)) * 0.35 * sm((t - 1.0) / 1.0);   // slow eighth-note drip from 1 s
    let v = (lpO(org * 0.07 * trem * swell) + bs * 0.16 + arp * 0.07) * fadeIn * out;
    v = Math.round(v * 40) / 40;                                                   // 8-bit crunch
    add(amb, i, v, 0);
  }
  // bell: tubular ping on chord starts 0, 3, 4 (A5, F5, E5 + a fifth), decays naturally
  for (const [ci, note] of [[0, 81], [2, 76], [3, 81], [4, 77]]) { const s0 = Math.round(ci * 2 * beat * SR + 0.02 * SR); for (let j = 0; j < 1.6 * SR; j++) { const tt = j / SR; add(amb, s0 + j, (Math.sin(TAU * fq(note) * tt) + 0.45 * Math.sin(TAU * fq(note) * 2.76 * tt)) * Math.exp(-tt * 2.6) * 0.05 * sm(tt / 0.004), 0.3); } }
}

// ---------------------------------------------------------------- events (windows from the picture)
const span = (w) => [Math.round(w[0] * SR), Math.round(w[1] * SR)];
function scrape(w, g, pan) {                    // knife scraping through the pumpkin: filtered noise in strokes, lasting the carve
  const [a, b] = span(w), n = b - a, bp = BP(700, 3800), lo = LP(300);
  for (let i = 0; i < n; i++) { const u = i / n, f = 3 + 3 * u, stroke = 0.55 + 0.45 * Math.sin(TAU * (6 + 5 * u) * (i / SR)); const v = bp(rand()) * stroke * 0.42 + lo(rand()) * 0.35 * stroke; add(sfx, a + i, v * g * win(i, n, 0.03, 0.08), pan); void f; }
}
function chirp(w, f0, f1, g, pan, kind = "sq") {  // rising or falling 8-bit sweep lasting the motion
  const [a, b] = span(w), n = b - a; let ph = 0;
  for (let i = 0; i < n; i++) { const u = i / n, f = f0 * Math.pow(f1 / f0, u); ph += f / SR; const s = kind === "sq" ? sq(ph, 0.25) * 0.6 : tri(ph); add(sfx, a + i, Math.round(s * g * win(i, n, 0.015, 0.06) * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 0.5 * 24) / 24, pan); }
}
function shimmer(w, g) {                        // brain wakes: quick rising arpeggio of tiny squares spread over the fade-in
  const [a, b] = span(w), n = b - a, notes = [69, 72, 76, 81, 84, 88, 93]; notes.forEach((m, k) => { const s0 = a + Math.round((k / notes.length) * n * 0.8), len = Math.round(n * 0.2) + Math.round(0.05 * SR); let ph = 0; for (let j = 0; j < len && s0 + j < b + 0.1 * SR; j++) { ph += fq(m) / SR; add(sfx, s0 + j, sq(ph, 0.25) * Math.exp(-j / len * 3.2) * g * Math.min(1, j / 40), -0.2 + 0.1 * k); } });
}
function whoosh(w, g, f0, f1) {                  // soft air: low-passed noise sweeping
  const [a, b] = span(w), n = b - a, lp = LP(200);
  for (let i = 0; i < n; i++) { const u = i / n; add(sfx, a + i, lp(rand(), f0 + (f1 - f0) * u) * Math.sin(Math.PI * u) ** 1.3 * g, 0); }
}
function ticks(w, g) {                           // counter: tick train, pitch climbing, one tick per few counts, ends on the last count
  const [a, b] = span(w), k = 26; for (let m = 0; m < k; m++) { const s0 = a + Math.round(((m + 0.5) / k) * (b - a) * 0.97), f = 900 + 1300 * (m / k), len = Math.round(0.018 * SR); let ph = 0; for (let j = 0; j < len; j++) { ph += f / SR; add(sfx, s0 + j, sq(ph, 0.5) * (1 - j / len) * g * (0.7 + 0.3 * (m / k)), 0); } }
}
function bell(t0, note, g, pan = 0) { const s0 = Math.round(t0 * SR); for (let j = 0; j < 1.1 * SR; j++) { const tt = j / SR; add(sfx, s0 + j, (Math.sin(TAU * fq(note) * tt) + 0.5 * Math.sin(TAU * fq(note) * 2.76 * tt) + 0.2 * Math.sin(TAU * fq(note) * 5.4 * tt)) * Math.exp(-tt * 4.2) * g * Math.min(1, tt / 0.003), pan); } }
function pulses(w, g, rate) {                    // signal packets: soft low blips lasting the stream
  const [a, b] = span(w); const step = Math.round(SR / rate); for (let s = a; s < b - 0.05 * SR; s += step) { const len = Math.round(0.07 * SR); let ph = 0; for (let j = 0; j < len; j++) { const u = (s - a) / (b - a); ph += (500 + 700 * u + 400 * (j / len)) / SR; add(sfx, s + j, tri(ph) * (1 - j / len) ** 1.5 * g * Math.sin(Math.PI * Math.min(1, (s - a) / (b - a) + 0.08)) ** 0.5, 0.1); } }
}
scrape(B.eyeL, 0.5, -0.25); scrape(B.eyeR, 0.5, 0.25); scrape(B.mouth, 0.45, 0);
shimmer(B.brainIn, 0.09);
pulses(B.sig1, 0.12, 12);
// the decision: a rising sweep into a pop on the lit face, then a warm chord (ends with the ring)
chirp(B.ignite, 180, 880, 0.2, 0, "sq"); whoosh(B.ring, 0.16, 400, 3200); bell(B.ignite[1] - 0.02, 76, 0.1); bell(B.ignite[1] - 0.02, 81, 0.07, 0.2);
chirp(B.card, 1100, 1700, 0.07, 0);
ticks(B.count, 0.1); pulses(B.sig2, 0.08, 9); bell(B.count[1], 88, 0.07, 0);
chirp(B.glow, 220, 440, 0.07, 0.1, "tri");
chirp(B.label, 1500, 2100, 0.05, 0.3);
// the surge: a riser lasting "lights up", with a chime on the peak
chirp(B.surge, 300, 1500, 0.16, 0, "sq"); whoosh(B.surge, 0.2, 500, 5000); bell(B.surge[1] - 0.02, 84, 0.12, 0); bell(B.surge[1] - 0.02, 88, 0.08, 0.3);
// the payoff: the candle dims (falling), the holes are only holes — then it relights (rising)
chirp(B.dim, 700, 150, 0.1, 0, "tri"); chirp(B.relight, 150, 660, 0.1, 0, "tri"); bell(B.relight[1] - 0.02, 81, 0.06, 0);

function wav(chs, file) { const out = Buffer.alloc(44 + N * 8); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 8, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(3, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 8, 28); out.writeUInt16LE(8, 32); out.writeUInt16LE(32, 34); out.write("data", 36); out.writeUInt32LE(N * 8, 40); for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) out.writeFloatLE(chs[c][i], 44 + (i * 2 + c) * 4); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true }); wav(amb, HERE + "audio/amb.wav"); wav(sfx, HERE + "audio/sfx.wav"); console.log("synth done");
