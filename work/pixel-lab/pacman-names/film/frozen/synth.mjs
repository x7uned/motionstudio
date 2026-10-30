// 8-bit sound for «Only the red ghost is chasing you»: every cue is synthesised (no sounds or melodies from the arcade
// game) and lasts exactly as long as its motion, on the same timeline as the picture. Loop film: the bed fills whole
// chord cycles with no fades, and anything crossing the seam is folded back onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, tau, TAU_END, SLOW } from "./timeline.mjs";
import { GAME as G, SCATTER } from "./sim.mjs";
import { EATS, T_DECIDE } from "./render.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
// samples past END fold back to the start (the loop seam)
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
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const tReal = (ta) => { let lo = 0, hi = END; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (tau(m) < ta) lo = m; else hi = m; } return lo; };
const slowAt = (t) => { let s = 1; for (const w of SLOW) if (t > w.a && t < w.b) s = Math.min(s, w.k); return s; };

// ---- chomps: one short two-tone bite per dot, alternating up and down; in slow motion they stretch and drop in pitch
EATS.forEach((ta, i) => { const t = tReal(ta), k = slowAt(t), d = 0.075 / Math.max(0.45, k), f0 = (i % 2 ? 520 : 380) * (0.75 + 0.25 * k);
  tone(sfx, t, d, { wave: "tri", f: (u) => f0 * (i % 2 ? 1 - 0.35 * u : 0.7 + 0.45 * u), v: (u) => 1 - 0.6 * u, gain: 0.05 }); });
// ---- the hook: red's marker locks on you
pop(EV.red - 0.05, "E6", "B6"); blip(EV.chasing - 0.1, "A5", 0.12, 0.03, 0.25);
// ---- the zoom out to the whole maze (lasts the zoom), the three name tags, the four targets
sweep(3.2, 4.0, true, 0.8, 140, 700);
pop(EV.other, "C6", "E6", 0.022); pop(EV.other + 0.12, "E6", "G6", 0.022); pop(EV.other + 0.24, "G6", "C7", 0.022);
seq(EV.every + 0.05, ["C6", "E6", "G6", "C7"], 0.09, { gain: 0.03, duty: 0.25 });
// ---- the crossing in slow motion: a falling sweep while time slows, the options light up and their lines draw,
//      a tick on the closest, the ghost turns; "no U-turn" buzz
sweep(EV.turn - 0.55, EV.turn - 0.05, false, 0.8, 140, 700);
sweep(EV.picks - 0.05, EV.picks + 0.65, true, 0.6, 300, 1200);
seq(EV.closest + 0.2, ["C6", "G6"], 0.06, { gain: 0.035, duty: 0.25 });
blip(T_DECIDE, "E5", 0.1, 0.03, 0.125);
tone(sfx, EV.never, 0.32, { duty: 0.5, f: (u) => 110 - 20 * u, v: env(0.05, 0.3), gain: 0.03 });
sweep(EV.back + 0.0, EV.back + 0.45, true, 0.6, 160, 600);
// ---- red's target is you; pink counts four squares ahead
pop(EV.redT, "A5", "E6");
["C5", "E5", "G5", "C6"].forEach((nn, k) => blip(EV.four + k * 0.16, nn, 0.1, 0.04, 0.25));
pop(EV.squares + 0.5, "C6", "C7"); seq(EV.cut, ["G5", "C6"], 0.07, { gain: 0.03 });
// ---- blue: the freeze, the first line drawing (as long as it draws), the doubling (as long as it draws), ×2
sweep(EV.takes - 0.45, EV.takes + 0.05, false, 0.6, 140, 600);
pop(EV.two - 0.05, "D6", "A6");
tone(sfx, EV.line - 0.1, 0.9, { duty: 0.25, f: (u) => 300 + 300 * u, v: env(0.1, 0.2), gain: 0.02 });
tone(sfx, EV.doubles, 0.8, { duty: 0.25, f: (u) => 600 + 600 * u, v: env(0.1, 0.2), gain: 0.02 });
seq(EV.doubles + 0.75, ["E6", "B6", "E7"], 0.06, { gain: 0.03, duty: 0.25 });
sweep(EV.so - 0.45, EV.so + 0.05, true, 0.6, 160, 700);
pop(EV.both, "C6", "G6"); pop(EV.both + 0.15, "C6", "G6");
// ---- orange: the 8-square ring grows in (hum as long as it fades in), the warning as he crosses it, the turn away
tone(sfx, EV.far - 0.3, 0.5, { wave: "tri", f: (u) => 180 + 60 * u, v: env(0.3, 0.3), gain: 0.05 });
seq(EV.eight, ["A5", "A5"], 0.12, { gain: 0.028, dur: 0.07 });
seq(EV.turns, ["E6", "C6", "A5"], 0.07, { gain: 0.03, duty: 0.25 });
// ---- the "what if" inset: opens, the designer's photo, a sad two-note "boring", sleepy Zs
sweep(EV.why - 0.15, EV.why + 0.2, true, 0.5, 200, 800);
pop(EV.toru - 0.1, "G5", "D6", 0.025);
seq(EV.boring - 0.05, ["E4", "D#4"], 0.2, { gain: 0.035, duty: 0.5, dur: 0.18 });
for (let k = 0; k < 3; k++) blip(EV.boring + 0.5 + k * 0.22, ["A5", "G5", "F5"][k], 0.08, 0.012, 0.125);
sweep(EV.boringEnd + 0.15, EV.boringEnd + 0.6, false, 0.5, 200, 800);
// ---- scatter: everyone turns round (a flip), runs for the corners (falling arpeggio over the run); chase again on "trap"
const sStart = tReal(SCATTER[0]), sEnd = tReal(SCATTER[1]);
seq(sStart, ["C6", "G5"], 0.06, { gain: 0.035, duty: 0.25 });
seq(sStart + 0.15, ["C7", "A6", "F6", "D6", "B5", "G5"], 0.11, { gain: 0.022, duty: 0.125 });
sweep(4.0 + 36.0, 40.9, true, 0.6, 140, 600);
seq(sEnd, ["G5", "C6"], 0.06, { gain: 0.035, duty: 0.25 });
// ---- the last zoom into the close-up (lasts the zoom); gone before the seam
sweep(46.4, 48.25, false, 0.7, 140, 600);

// ---- chiptune bed: Am – F – C – G, whole cycles over the loop; soft at the seam, sparse in the slow parts, full elsewhere
const CYC = Math.max(1, Math.round(END / 8.2)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const section = (t) => (t < 1.2 || t > END - 1.6 ? "soft" : slowAt(t) < 0.7 || (t > EV.why && t < EV.boringEnd) ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.024 : 0.018 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.015 }); }
}
// one-pole low-pass, warmed on the tail so the seam has no step
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1), "chomps", EATS.length);
