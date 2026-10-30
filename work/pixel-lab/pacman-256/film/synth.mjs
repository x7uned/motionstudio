// 8-bit sound for «Pac-Man level 256»: every cue is synthesised (no sounds or melodies from the arcade game) and lasts as
// long as its motion: one glitch blip per tile while the bug draws its memory over the right half, the bit flips of
// 255 + 1 and the ninth bit falling out, the 256 passes of the fruit loop, the fruit appearing, Pink gliding through the
// walls, the bars filling, the death, the score rolling up, the clock. Loop film: whole bars, nothing fades at the seam.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { GARBAGE, G_A, G_B, CATCH, DEATH, BACK } from "./render.mjs";

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
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.014 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.03 * gain }); };
const thud = (t, g = 1) => { tone(sfx, t, 0.3, { wave: "tri", f: (u) => 90 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.1 * g }); noise(t, 0.1, () => 900, (u) => 1 - u, 0.025 * g); };
const hsh = (a, b) => { let h = Math.imul(a ^ 0x9e3779b9, 2654435761) ^ b; h ^= h >>> 15; return (h >>> 0) / 4294967296; };

// ---------------------------------------------------------------- the hook (split screen) and the seam tag
pop(EV.l256 - 0.1, "C6", "G6"); noise(EV.breaks - 0.05, 0.5, (u) => 4000 * (1 - u) + 400, env(0.05, 0.4), 0.016);
pop(EV.ending - 0.35, "E5", "B5", 0.018);
// the garbage dissolving away for the explanation (as long as it dissolves)
noise(EV.halfEnd - 0.1, 0.65, (u) => 2500 - 1800 * u, env(0.1, 0.4), 0.012);
// ---------------------------------------------------------------- the byte: a blip per value, the labels
{ const seqv = [0, 1, 2, 3, 7, 15, 31, 63, 127, 255]; for (let i = 1; i < seqv.length; i++) blip(EV.from0 - 0.1 + i * 0.17, NOTE(64 + i * 2), 0.05, 0.02, 0.25); }
pop(EV.stored - 0.1, "A5", "E6"); seq(EV.l256b - 0.1, ["C5", "E5", "G5", "C6"], 0.05, { gain: 0.02, duty: 0.25 }); pop(EV.biggest - 0.1, "G5", "D6");
// ---------------------------------------------------------------- fruit: one blip as each appears; LEVEL + 1
for (let i = 0; i < 7; i++) blip(EV.draws + i * 0.18, NOTE(76 + [0, 2, 4, 4, 7, 7, 9][i]), 0.08, 0.02, 0.25);
pop(EV.adds - 0.1, "C6", "E6");
// ---------------------------------------------------------------- 255 + 1: one rising blip per bit flip, the ninth bit falls (as long as it falls), "= 0"
{ const c0 = EV.oneB - 0.1, c1 = EV.byteB + 0.2; for (let i = 0; i < 8; i++) blip(c0 + (i / 8) * (c1 - c0), NOTE(72 + i * 2), 0.06, 0.02, 0.25);
  tone(sfx, c1, 0.9, { duty: 0.25, f: (u) => 900 * Math.pow(0.25, u), v: env(0.05, 0.3), gain: 0.02 }); }
thud(EV.zero - 0.05, 1);
// ---------------------------------------------------------------- the loop: 256 passes (the first 7 low, the rest high), counted as they fill
{ const a = EV.runs, b = EV.instead; for (let i = 0; i < 256; i++) blip(a + (b - a) * (i / 256), i < 7 ? NOTE(60) : NOTE(84 + (i % 5)), 0.008, i < 7 ? 0.02 : 0.006, 0.125); }
seq(EV.seven - 0.05, ["A4", "E4"], 0.12, { gain: 0.02, duty: 0.5 });
// ---------------------------------------------------------------- the bug draws its memory: one glitch blip per tile (as long as the stamping)
for (const g of GARBAGE) { const ts = G_A + (g.k / GARBAGE.length) * (G_B - G_A); if (g.k % 2) continue; blip(ts, NOTE(60 + Math.floor(hsh(g.x, g.y) * 36)), 0.025, 0.008, hsh(g.y, g.x) < 0.5 ? 0.125 : 0.5); }
noise(G_A, G_B - G_A, (u) => 1200 + 800 * Math.sin(u * 40), env(0.05, 0.1), 0.004);
// ---------------------------------------------------------------- walls: Pink glides through (as long as the glide); dots missing
tone(sfx, EV.walls - 0.2, EV.missing - EV.walls + 0.2, { wave: "tri", f: (u, tt) => n("E5") + 40 * Math.sin(tt * 18), v: env(0.15, 0.2), gain: 0.03 });
blip(EV.dots, "C4", 0.25, 0.02, 0.5);
// ---------------------------------------------------------------- the dots panel: the bars fill (ticks), "can't win"
for (let t = EV.n244 - 0.1; t < EV.n244 + 0.5; t += 0.05) blip(t, 88, 0.02, 0.006, 0.125);
for (let t = EV.here - 0.1; t < EV.n168 + 0.4; t += 0.05) blip(t, 84, 0.02, 0.006, 0.125);
tone(sfx, EV.most2 - 0.05, 0.45, { duty: 0.5, f: () => n("A#2"), v: env(0.02, 0.2), gain: 0.035 });
// ---------------------------------------------------------------- caught: a falling warble as long as the death; "game over"
tone(sfx, DEATH[0], DEATH[1] - DEATH[0], { duty: 0.5, f: (u, tt) => 700 * Math.pow(0.3, u) * (1 + 0.15 * Math.sin(tt * 60)), v: env(0.05, 0.2), gain: 0.025 });
thud(EV.over - 0.05, 1.1);
tone(sfx, BACK[0], BACK[1] - BACK[0], { duty: 0.25, f: (u) => 300 + 600 * u, v: env(0.2, 0.2), gain: 0.012 });       // the new life fades in
// ---------------------------------------------------------------- the score rolls up (ticks while it rolls), 1999, the clock
for (let t = EV.score; t < EV.n3m + 1.2; t += 0.04) blip(t, 96, 0.012, 0.005, 0.125);
seq(EV.n3m + 1.2, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.022, duty: 0.25 });
pop(EV.y1999 - 0.1, "G5", "D6"); for (let t = EV.took; t < EV.hours + 0.3; t += 0.25) blip(t, "C7", 0.02, 0.01, 0.125);
// ---------------------------------------------------------------- camera moves (as long as each move)
for (const [a, b, up] of [[EV.halfEnd, EV.each - 0.1, false], [EV.levelEnd + 0.2, EV.on256 + 0.2, true], [EV.past, EV.pictures, false], [EV.broken + 0.4, EV.right - 0.1, true], [EV.mazeEnd + 2.6, EV.ghosts - 0.3, false], [EV.overEnd, EV.highest, true]]) sweep(a, b, up, 0.5, 150, 600);

// ---------------------------------------------------------------- bed: our own chiptune, Am – F – C – G, whole bars over the loop
const BARS = Math.max(8, Math.round(END / 2.0)), BAR = END / BARS, BEAT = BAR / 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const glitch = (t) => t < EV.halfEnd + 0.3 || t > G_A;
for (let bar = 0; bar < BARS; bar++) { const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2; tone(bed, t, (BEAT / 2) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, gl = glitch(t); if (s16 % 2 && !gl) continue;
    const note = gl && hsh(bar, s16) < 0.3 ? ch[s16 % 3] + 24 + Math.floor(hsh(s16, bar) * 7) : ch[(s16 >> 1) % 3] + 24;
    tone(bed, t, (BEAT / 4) * 0.8, { duty: 0.125, f: () => NOTE(note), v: (u) => 1 - 0.7 * u, gain: 0.016 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bars", BARS);
