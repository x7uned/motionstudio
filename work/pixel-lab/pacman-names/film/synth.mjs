// 8-bit sound for «Pac-Man's ghost names got lost in translation»: every cue is synthesised (no sounds or melodies
// from the arcade game) and lasts exactly as long as its motion, on the same timeline as the picture. Loop film: the
// bed fills whole chord cycles with no fades, and anything crossing the seam is folded back onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { EATS, CLOCK, Tg, G, camMoves } from "./render.mjs";

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
const tReal = (ta) => { let lo = 0, hi = END; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (CLOCK.tau(m) < ta) lo = m; else hi = m; } return lo; };

// ---- chomps: one short two-tone bite per dot; when the clock runs slow they stretch and drop in pitch
EATS.forEach((ta, i) => { const t = tReal(ta), k = Math.min(1.4, CLOCK.rate(t)), d = 0.075 / Math.max(0.5, Math.min(1, k)), f0 = (i % 2 ? 520 : 380) * (0.8 + 0.2 * Math.min(1, k));
  tone(sfx, t, d, { wave: "tri", f: (u) => f0 * (i % 2 ? 1 - 0.35 * u : 0.7 + 0.45 * u), v: (u) => 1 - 0.6 * u, gain: 0.045 }); });
// ---- camera moves: a soft sweep exactly as long as each big zoom (from render.mjs)
for (const m of camMoves) sweep(m.a, m.b, m.zoomIn, 0.55, 140, 640);
// ---- the name card: opens; a row per name; the arcade words; strikes; bars; the column turns Japanese
sweep(EV.names - 0.2, EV.names + 0.2, true, 0.5, 220, 900);
[EV.blinky, EV.pinky, EV.inky, EV.clyde].forEach((t, i) => { pop(t - 0.15, ["C6", "D6", "E6", "G6"][i], ["G6", "A6", "B6", "D7"][i], 0.026); tone(sfx, t - 0.1, 1.0, { wave: "tri", f: (u) => 260 + 120 * u, v: env(0.15, 0.6), gain: 0.02 }); });
[EV.shadow, EV.speedy, EV.bashful, EV.pokey].forEach((t, i) => blip(t - 0.1, ["A5", "B5", "C#6", "E6"][i], 0.09, 0.03, 0.25));
tone(sfx, EV.faster, 0.4, { wave: "noise", f: (u) => 3000 + 5000 * u, v: env(0.1, 0.4), gain: 0.02 });
tone(sfx, EV.slower, 0.4, { wave: "noise", f: (u) => 3000 + 5000 * u, v: env(0.1, 0.4), gain: 0.02 });
for (let i = 0; i < 4; i++) tone(sfx, EV.faster - 0.1 + i * 0.08, 0.6, { duty: 0.25, f: (u) => 300 + 500 * u, v: env(0.1, 0.3), gain: 0.008 });
seq(EV.others - 0.1, ["C6", "E6", "G6"], 0.08, { gain: 0.025, duty: 0.25 });
sweep(EV.japanese - 0.1, EV.japanese + 0.5, true, 0.6, 300, 1300);
// ---- the card closes into the focus card; each ghost's Japanese word and meaning
sweep(EV.blinky2 - 0.45, EV.blinky2, false, 0.4, 220, 900);
const JP = [[EV.oikake, EV.chaser], [EV.machibuse, EV.ambusher], [EV.kimagure, EV.moody], [EV.otoboke, EV.playing]];
JP.forEach(([j, m], i) => { seq(j - 0.1, ["E5", "A5", "E6"], 0.07, { gain: 0.028, duty: 0.125 }); blip(m - 0.1, "C6", 0.12, 0.02, 0.25); });
[EV.pinky2, EV.inky2, EV.clyde2].forEach((t) => sweep(t - 0.3, t + 0.05, true, 0.35, 300, 900));
// ---- Blinky's target on your square; Pinky counts four ahead
pop(EV.aims - 0.1, "A5", "E6");
["C5", "E5", "G5", "C6"].forEach((nn, k) => blip(EV.four + k * 0.12, nn, 0.1, 0.035, 0.25));
pop(EV.ahead, "C6", "C7");
// ---- Inky: his target, the line from Blinky (as long as it draws), his zig-zag trail
pop(EV.target - 0.1, "D6", "A6");
tone(sfx, EV.blinky3 - 0.2, 0.7, { duty: 0.25, f: (u) => 300 + 300 * u, v: env(0.1, 0.2), gain: 0.02 });
for (let k = 0; k < 4; k++) blip(EV.path - 0.1 + k * 0.18, ["E6", "B5", "F#6", "C6"][k], 0.08, 0.016, 0.125);
// ---- Clyde: the ring grows in (hum as long as it fades in), "8 squares", the target jumps to his corner, the circling
tone(sfx, EV.far - 0.3, 0.5, { wave: "tri", f: (u) => 180 + 60 * u, v: env(0.3, 0.3), gain: 0.05 });
seq(EV.eight - 0.05, ["A5", "A5"], 0.12, { gain: 0.026, dur: 0.07 });
seq(EV.turns, ["E6", "C6", "A5"], 0.07, { gain: 0.028, duty: 0.25 });
tone(sfx, EV.circling - 0.3, 1.0, { wave: "tri", f: (u) => 330 + 110 * Math.sin(u * Math.PI * 4), v: env(0.25, 0.4), gain: 0.022 });
// ---- "Does Clyde do nothing?" (a rising question), his corner, his way home (as long as the line draws), "through you"
tone(sfx, EV.does - 0.1, 0.35, { duty: 0.5, f: (u) => 330 * Math.pow(1.6, u), v: env(0.1, 0.3), gain: 0.025 });
pop(EV.corner2 - 0.2, "G5", "D6");
tone(sfx, EV.home - 0.2, 1.1, { duty: 0.25, f: (u) => 520 - 220 * u, v: env(0.1, 0.3), gain: 0.018 });
seq(EV.through, ["E6", "G6", "C7"], 0.07, { gain: 0.028, duty: 0.125 });
// ---- the summary card on "never knew", the last zoom into the close-up (gone before the seam)
sweep(EV.never - 0.25, EV.never + 0.1, true, 0.4, 220, 900);
sweep(END - 0.85, END - 0.55, false, 0.35, 220, 900);

// ---- chiptune bed: Am – F – C – G, whole cycles over the loop; soft at the seam, sparse while the card explains
const CYC = Math.max(1, Math.round(END / 8.2)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const section = (t) => (t < 1.2 || t > END - 1.6 ? "soft" : t > EV.names && t < EV.blinky2 - 0.5 ? "sparse" : "full");
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
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1), "chomps", EATS.length, "moves", camMoves.length);
