// 8-bit sound for «Pac-Man has a hiding spot the ghosts can't find»: every cue is synthesised (no sounds or melodies
// from the arcade game) and lasts exactly as long as its motion, on the same timeline as the picture. Loop film: the
// bed fills whole chord cycles with no fades, and anything crossing the seam is folded back onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, tau } from "./timeline.mjs";
import { camMoves, T_DEC1, T_DEC2, T_DEC3 } from "./render.mjs";

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

// ---- camera moves (each as long as the move)
for (const m of camMoves) sweep(m.a, m.b, m.zoomIn, 0.5, 140, 640);
// ---- the start square, the way in (a step tick per tile as the echo walks), "face up"
pop(EV.next - 0.3, "C6", "E6", 0.024); blip(EV.start - 0.1, "G5", 0.1, 0.02, 0.25);
for (let k = 0; k < 3; k++) blip((k === 0 ? EV.right : EV.up + k * 0.3) - 0.05, ["E5", "G5", "B5"][k], 0.08, 0.026, 0.25);
seq(EV.facing - 0.1, ["C6", "G6"], 0.07, { gain: 0.03, duty: 0.25 });
// ---- slow motion in and out (a falling / rising sweep exactly as long as the ease)
sweep(EV.takes - 0.45, EV.takes, false, 0.6, 140, 600); sweep(EV.back - 0.1, EV.back + 0.35, true, 0.5, 160, 600);
sweep(EV.passes - 0.5, EV.passes - 0.05, false, 0.6, 140, 600); sweep(EV.inEnd - 0.2, EV.inEnd + 0.25, true, 0.5, 160, 600);
// ---- the choice: options light up, tick on the closest, "no U-turn" buzz
pop(EV.way - 0.1, "D6", "A6", 0.026); seq(EV.closest + 0.15, ["C6", "G6"], 0.06, { gain: 0.032, duty: 0.25 }); blip(T_DEC1, "E5", 0.1, 0.026, 0.125);
tone(sfx, EV.never, 0.32, { duty: 0.5, f: (u) => 110 - 20 * u, v: env(0.05, 0.3), gain: 0.028 });
// ---- the four no-up marks (one stamp each as it appears), the two pulses
for (let i = 0; i < 4; i++) blip(EV.four - 0.1 + i * 0.12, ["A5", "A5", "E5", "E5"][i], 0.08, 0.028, 0.5);
tone(sfx, EV.above - 0.1, 0.7, { duty: 0.125, f: (u) => 880 - 200 * u, v: env(0.1, 0.5), gain: 0.014 });
tone(sfx, EV.here - 0.1, 0.9, { duty: 0.125, f: (u) => 660 - 150 * u, v: env(0.1, 0.5), gain: 0.014 });
// ---- Red under you: the forbidden "up" buzzes, he goes left — twice
for (const td of [T_DEC2, T_DEC3]) { tone(sfx, td - 0.35, 0.3, { duty: 0.5, f: (u) => 120 - 25 * u, v: env(0.05, 0.3), gain: 0.03 }); blip(td, "C6", 0.1, 0.028, 0.25); }
// ---- the loops being traced (a soft rolling arpeggio while each trail draws in), the side way, nobody comes
seq(EV.pink - 0.2, ["C5", "E5", "G5", "E5"], 0.15, { gain: 0.016, duty: 0.25 }); seq(EV.orange - 0.2, ["A4", "C5", "E5", "C5"], 0.15, { gain: 0.016, duty: 0.25 });
tone(sfx, EV.side, 0.6, { duty: 0.25, f: (u) => 400 + 400 * u, v: env(0.1, 0.3), gain: 0.016 }); seq(EV.open - 0.1, ["G5", "D6"], 0.07, { gain: 0.026, duty: 0.25 });
seq(EV.never2, ["E5", "D5"], 0.16, { gain: 0.022, duty: 0.5, dur: 0.14 });
// ---- the panels: follows you in (×), blue ghosts (wobble), corners (four blips), the schedule (a tick per segment, then a long run)
sweep(EV.only - 0.25, EV.only + 0.1, true, 0.4, 220, 900); tone(sfx, EV.follows + 0.1, 0.3, { duty: 0.5, f: (u) => 130 - 30 * u, v: env(0.05, 0.3), gain: 0.028 });
tone(sfx, EV.blue2 - 0.2, 0.6, { wave: "tri", f: (u, tt) => 300 + 60 * Math.sin(tt * 40), v: env(0.1, 0.4), gain: 0.03 }); seq(EV.off - 0.2, ["C6", "E6", "G6"], 0.07, { gain: 0.024, duty: 0.25 });
for (let i = 0; i < 4; i++) blip(EV.head - 0.2 + i * 0.1, ["G5", "E5", "C5", "A4"][i], 0.08, 0.022, 0.25); tone(sfx, EV.break - 0.15, 0.3, { wave: "noise", f: () => 2200, v: env(0.05, 0.6), gain: 0.02 });
{ const a = EV.after - 0.1, b = EV.half + 0.3; for (let k = 0; k < 7; k++) blip(a + (b - a) * ([7, 27, 34, 54, 59, 79, 84][k] / 84), k % 2 ? "E6" : "B5", 0.05, 0.016, 0.25); }
tone(sfx, EV.nonstop - 0.3, 0.9, { duty: 0.25, f: (u) => 330 + 330 * u, v: env(0.1, 0.3), gain: 0.016 });
pop(EV.stay - 0.2, "G5", "C6", 0.022);
// ---- chiptune bed: Am – F – C – G, whole cycles over the loop; soft at the seam, sparse in the slow parts and panels
const CYC = Math.max(1, Math.round(END / 8.2)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const slow = (t) => (t > EV.takes - 0.3 && t < EV.back + 0.3) || (t > EV.passes - 0.3 && t < EV.inEnd + 0.2);
const section = (t) => (t < 1.2 || t > END - 1.6 ? "soft" : slow(t) ? "sparse" : "full");
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
