// 8-bit sound for «A 13-year-old "beat" Tetris»: every cue is synthesised (no music or sounds from any Tetris game) and
// lasts as long as its motion: each landing piece you can see, line clears (flash + dissolve), level-ups, the game-over
// curtain, the slow-motion moves and the "too slow" buzz, taps and presses while the thumb shakes and the fingers roll,
// the level counter racing, the broken colours, the score loop ticking pass by pass, the freeze.
// The music: our own minor chiptune while the game runs; at the freeze it sticks on ONE endless note (as it did on the
// stream), which runs through the loop seam into the opening and stops when the 1989 game starts.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { SEG, DEMO, DEMO_LAND, DEMO_MOVE2, levelAt, FREEZE_T, FINAL, CLEAR_D } from "./game.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
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
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.024) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.014 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.032 * gain }); };
const thud = (t, g = 1) => { tone(sfx, t, 0.3, { wave: "tri", f: (u) => 90 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.1 * g }); noise(t, 0.1, () => 900, (u) => 1 - u, 0.025 * g); };
// how loud the TV is: close-ups louder, the room quieter, dimmed under the panels
const tvGain = (t) => { const panel = (t > EV.came - 0.1 && t < EV.moreEnd + 0.3) || (t > EV.inside - 0.1 && t < EV.firstEnd + 0.2); const room = t < EV.old || (t > EV.then2 && t < EV.l157 - 0.2) || t > EV.fingers2; return panel ? 0.35 : room ? 0.5 : 1; };

// ---------------------------------------------------------------- the game: landings, clears, the top-out (film time; the climb runs on its fast clock)
const film = (seg, ts) => seg.t0 + (ts - seg.t0) / (seg.ff ?? 1);
for (const seg of Object.values(SEG)) for (const e of seg.events) {
  const tf = film(seg, e.t1 ?? e.t); if (tf >= FREEZE_T + 0.01 || tf < seg.t0) continue; const g = tvGain(tf);
  if (e.kind === "piece") { tone(sfx, tf, 0.05, { wave: "tri", f: (u) => 200 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.05 * g }); noise(tf, 0.03, () => 4000, (u) => 1 - u, 0.01 * g); }
  if (e.kind === "clear") { const d = CLEAR_D / (seg.ff ?? 1); tone(sfx, tf, d, { duty: 0.25, f: (u) => 600 + 900 * u, v: env(0.05, 0.4), gain: 0.02 * g * (e.rows.length > 1 ? 1.3 : 1) }); noise(tf + d * 0.5, d * 0.5, () => 6000, (u) => 1 - u, 0.012 * g); }
  if (e.kind === "top") tone(sfx, tf, 0.6 / (seg.ff ?? 1), { duty: 0.5, f: (u) => n("A4") * Math.pow(0.4, u), v: env(0.05, 0.3), gain: 0.03 });
}
// level-ups while the counter climbs (a blip per new level you can see, thinned so they never smear)
{ let last = levelAt(EV.old), lt = -1; for (let t = EV.old; t < FREEZE_T; t += 0.01) { const L = levelAt(t); if (L !== last && t - lt > 0.06 && !(t > EV.came - 0.1 && t < EV.moreEnd + 0.3)) { blip(t, NOTE(72 + (L % 12)), 0.04, 0.012 * tvGain(t), 0.125); lt = t; } last = L; } }
// ---------------------------------------------------------------- the story accents
pop(EV.nintendo - 0.1, "E6", "B6"); blip(EV.y1989, "C6", 0.08, 0.02, 0.25);
seq(EV.faster, ["C6", "E6", "G6"], 0.05, { gain: 0.018, duty: 0.25 });
thud(EV.lose - 0.05, 0.9);
sweep(EV.it - 0.6, EV.old + 0.2, true, 0.7, 140, 600);                   // into the TV
sweep(EV.lose + 0.3, EV.at + 0.15, true, 0.5, 200, 700);                // into the well
pop(EV.l29 - 0.05, "G5", "D6"); for (let k = 0; k < 6; k++) blip(EV.row + k * 0.1, 96, 0.03, 0.008, 0.125);   // "every frame": six quick ticks
// the slow-motion miss: a low hum while slowed, the two moves, the landing, the buzz
tone(sfx, DEMO.t0 + 0.1, EV.sidesEnd - DEMO.t0, { wave: "tri", f: () => n("A2"), v: env(0.1, 0.1), gain: 0.03 });
blip(DEMO.spawn, "E5", 0.12, 0.03, 0.25); blip(DEMO_MOVE2, "E5", 0.12, 0.03, 0.25); thud(DEMO_LAND, 0.7);
tone(sfx, EV.tooSlow - 0.05, 0.45, { duty: 0.5, f: () => n("A#2"), v: env(0.02, 0.2), gain: 0.04 });
thud(EV.kill - 0.05, 1.3); seq(EV.kill, ["A3", "D#4"], 0.0, { gain: 0.03, dur: 0.6 });
// hypertapping: a click per tap while the thumb shakes; rolling: a click per press while the fingers roll (×1/4 slowed picture, real-rate counter)
for (let t = EV.shaking; t < EV.second2End + 0.2; t += 1 / 12) noise(t, 0.015, () => 7000, (u) => 1 - u, 0.012);
for (let t = EV.fingers; t < EV.moreEnd + 0.1; t += 1 / 21) noise(t, 0.012, () => 8000, (u) => 1 - u, 0.01);
pop(EV.hyper - 0.1, "C6", "G6"); pop(EV.rolling - 0.1, "E6", "B6"); seq(EV.twenty, ["C6", "E6", "G6", "C7"], 0.05, { gain: 0.02, duty: 0.25 });
sweep(EV.moreEnd, EV.players2 + 0.3, false, 0.4, 200, 600);
// the colours go wrong: a crunchy glitch as each palette breaks; "almost invisible": a hollow low tone
noise(EV.colors - 0.1, 0.5, (u) => 3000 * (1 - u) + 300, env(0.05, 0.3), 0.018); seq(EV.colors, ["F#5", "C5"], 0.08, { gain: 0.02, duty: 0.5 });
tone(sfx, EV.almost - 0.05, 1.0, { wave: "tri", f: () => n("D3"), v: env(0.1, 0.6), gain: 0.04 });
// the score loop: one tick per pass while the passes fill (at 155 it runs past the frame: an alarm), the pointer jumps, the freeze
{ const a1 = EV.loop1 - 0.2, b1 = EV.loop1End, a2 = EV.l155, b2 = EV.longer;
  for (let i = 0; i < 30; i++) blip(a1 + (b1 - a1) * (i / 30), 84, 0.012, 0.006, 0.125);
  for (let i = 0; i < 156; i++) blip(a2 + (b2 - a2) * (i / 156), i < 140 ? 84 : 90, 0.01, 0.006, 0.125);
  tone(sfx, EV.longer, 0.6, { duty: 0.5, f: (u, tt) => (Math.floor(tt * 8) % 2 ? n("A5") : n("E5")), v: env(0.02, 0.2), gain: 0.02 }); }
for (let k = 0; k < 6; k++) blip(EV.loses + k / 3, ["C6", "G5", "E6", "D5", "B5", "F5"][k], 0.05, 0.012, 0.25);
thud(EV.freezes - 0.05, 0.8); tone(sfx, EV.freezes, 0.7, { wave: "tri", f: () => n("B5"), v: env(0.01, 0.6), gain: 0.03 });
// the AI, the date, the timer
seq(EV.ai - 0.1, ["C6", "E6", "C6"], 0.07, { gain: 0.02, duty: 0.125 });
pop(EV.december - 0.1, "G5", "D6"); for (let t = EV.played; t < EV.minutes + 0.1; t += 0.08) blip(t, 100, 0.01, 0.005, 0.125);
// 157: the single (from the game above), then the freeze: everything stops
thud(FREEZE_T - 0.02, 0.6);
pop(EV.before - 0.15, "E5", "B5", 0.016);

// ---------------------------------------------------------------- music: our own minor chiptune (Am – Dm – E – Am), 150 BPM, while the game runs
const BPM = 150, BEAT = 60 / BPM, BAR = BEAT * 4, prog = [[45, 48, 52], [38, 41, 45], [40, 44, 47], [45, 48, 52]];
const MEL = [76, 74, 72, 71, 72, 74, 76, 79, 77, 76, 74, 72, 71, 72, 74, 71];             // eight bars of our own line
const M0 = EV.old - 0.1, M1 = FREEZE_T;
const quiet = (t) => (t > EV.came - 0.1 && t < EV.moreEnd + 0.3) || (t > EV.inside - 0.1 && t < EV.firstEnd + 0.2);
for (let s16 = 0; ; s16++) {
  const t = M0 + (s16 * BEAT) / 4; if (t >= M1) break; const bar = Math.floor(s16 / 16), ch = prog[bar % 4], q = quiet(t), d = Math.min(BEAT / 4, M1 - t);
  if (s16 % 4 === 0) tone(bed, t, Math.min(BEAT * 0.9, M1 - t), { wave: "tri", f: () => NOTE(ch[0] - 12 + (s16 % 8 === 4 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: 0.09 });
  if (!q && s16 % 2 === 0) tone(bed, t, d * 0.9, { duty: 0.125, f: () => NOTE(ch[(s16 >> 1) % 3] + 12), v: (u) => 1 - 0.7 * u, gain: 0.014 });
  if (s16 % 8 === 0) tone(bed, t, Math.min(BEAT * 1.8, M1 - t), { duty: 0.25, f: () => NOTE(MEL[(s16 >> 3) % MEL.length]), v: (u) => 1 - 0.5 * u, gain: q ? 0.008 : 0.016 });
  if (!q && s16 % 4 === 2) tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.012 });
}
// the stuck note: from the freeze, through the seam, until the 1989 game starts (one continuous oscillator)
{ const a = FREEZE_T, b = END + M0, len = Math.round((b - a) * SR), f0 = n("E5"); let ph = 0;
  for (let i = 0; i < len; i++) { ph += f0 / SR; const x = (ph % 1) < 0.25 ? 1 : -1, e = Math.min(1, i / (0.01 * SR), (len - i) / (0.02 * SR)); put(bed, Math.round(a * SR) + i, x * 0.016 * e); } }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "freeze", FREEZE_T.toFixed(2), "final", FINAL && FINAL.t.toFixed(2));
