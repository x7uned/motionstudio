// 8-bit sound for «Pac-Man's red ghost gets faster when you're almost done»: every cue is synthesised (no sounds or melodies
// from the arcade game) and lasts exactly as long as its motion, on the same timeline as the picture. Loop film: the
// bed fills whole chord cycles with no fades, and anything crossing the seam is folded back onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, TD, RA } from "./timeline.mjs";
import { camMoves, CLK } from "./render.mjs";
import { EATS, T20, T10, SCATTER, GAMECFG } from "./game.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };
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
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b - a < 0.05) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };

// film time of a game moment: clock A (before the dissolve) or clock B (after it)
const TST = GAMECFG.Tstar, tA = (τ) => (τ - TST) / RA;
const tB = (τ) => { let lo = TD[0], hi = END; if (τ < CLK.B(lo) || τ > CLK.B(hi)) return null; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (CLK.B(m) < τ) lo = m; else hi = m; } return lo; };
const filmTimes = (τ) => { const out = []; const a = tA(τ); if (a >= 0 && a < TD[0]) out.push(a); const b = tB(τ); if (b !== null && b > TD[1]) out.push(b); return out; };
// ---- chomps: one short two-tone bite per dot Pac-Man eats in the maze, on whichever clock shows it
let ci = 0; for (const e of EATS) for (const t of filmTimes(e.τ)) { const i = ci++; tone(sfx, t, 0.075, { wave: "tri", f: (u) => (i % 2 ? 520 * (1 - 0.35 * u) : 380 * (0.7 + 0.45 * u)), v: (u) => 1 - 0.6 * u, gain: 0.045 }); }
// ---- camera moves (each as long as the move)
for (const m of camMoves) sweep(m.a, m.b, m.zoomIn, 0.5, 140, 640);
// ---- the hook tag
pop(EV.red - 0.2, "A5", "E6", 0.024);
// ---- << the dissolve back in time: a falling "rewind" whir exactly as long as the dissolve, with tape chatter
{ const a = TD[0] - 0.05, d = TD[1] - TD[0] + 0.1; tone(sfx, a, d, { duty: 0.25, f: (u) => 900 * Math.pow(0.25, u), v: env(0.15, 0.2), gain: 0.02 }); tone(sfx, a, d, { wave: "noise", f: (u, tt) => 3000 + 2000 * Math.sin(tt * 60), v: env(0.2, 0.3), gain: 0.012 }); }
// ---- the race strip: opens; the two speeds; a light tick for each strip dot Pac-Man eats; the one-frame stop callout
sweep(EV.run - 0.4, EV.run - 0.05, true, 0.4, 220, 900); blip(EV.p80 - 0.1, "E6", 0.09, 0.024, 0.25); blip(EV.p75 - 0.1, "C6", 0.09, 0.024, 0.25);
{ const vP = 0.8 * 80, tile = 16, per = tile / vP + tile / vP / 8, endT = EV.hall - 0.3; for (let k = 0, t = EV.every + per * 0.7; t < endT; k++, t += per) tone(sfx, t, 0.04, { wave: "tri", f: () => (k % 2 ? 700 : 560), v: (u) => 1 - u, gain: 0.016 }); }
seq(EV.stops - 0.1, ["G5", "G5"], 0.12, { gain: 0.024, duty: 0.125, dur: 0.06 });
sweep(EV.hall - 0.3, EV.hall + 0.1, false, 0.4, 220, 900);
// ---- a hall of dots: the gap readout, the 71
pop(EV.behind - 0.2, "D6", "A6", 0.022); blip(EV.p71 - 0.2, "A5", 0.12, 0.024, 0.25);
// ---- the counter panel comes in; at 20 and at 10 Blinky "shifts up": a rising arpeggio as long as his look cross-fades
sweep(EV.now - 0.2, EV.now + 0.2, true, 0.4, 220, 900);
for (const τ of [T20, T10]) for (const t of filmTimes(τ)) { seq(t, τ === T20 ? ["A4", "C5", "E5", "A5"] : ["C5", "E5", "G5", "C6", "E6"], 0.1, { gain: 0.03, duty: 0.25 }); tone(sfx, t, 0.5, { duty: 0.5, f: (u) => 110 + 90 * u, v: env(0.1, 0.4), gain: 0.02 }); }
// ---- scatter: everyone reverses (a flip), three run to their corners (falling arpeggio over the run), Blinky's lock stays on you
for (const t of filmTimes(SCATTER[0])) { seq(t, ["C6", "G5"], 0.06, { gain: 0.03, duty: 0.25 }); }
seq(EV.when - 0.1, ["C7", "A6", "F6", "D6", "B5", "G5"], 0.12, { gain: 0.018, duty: 0.125 });
pop(EV.keeps - 0.2, "A5", "E6", 0.026); tone(sfx, EV.stopsTaking - 0.2, 0.3, { duty: 0.5, f: () => 140, v: env(0.05, 0.3), gain: 0.022 });
for (const t of filmTimes(SCATTER[1])) { seq(t, ["G5", "C6"], 0.06, { gain: 0.03, duty: 0.25 }); }
// ---- faster than you; the name; "nobody knows"
blip(EV.fasterThan - 0.2, "E6", 0.1, 0.022, 0.25);
seq(EV.cruise - 0.2, ["C6", "E6", "G6", "C7"], 0.08, { gain: 0.026, duty: 0.25 }); tone(sfx, EV.nobody - 0.1, 0.35, { duty: 0.5, f: (u) => 330 * Math.pow(1.5, u), v: env(0.1, 0.3), gain: 0.022 });

// ---- chiptune bed: Am – F – C – G, whole cycles over the loop; soft at the seam, sparse in the slow parts and panels
const CYC = Math.max(1, Math.round(END / 8.2)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const section = (t) => (t < 1.2 || t > END - 1.6 ? "soft" : t > TD[0] && t < TD[1] + 0.3 ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.024 : 0.018 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.015 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1), "moves", camMoves.length);
