// 8-bit sound for «Why your cat's eyes glow»: every cue is synthesised and lasts exactly as long as its motion, on the
// picture's timeline. Loop film: the bed fills whole chord cycles with no fades; anything past END folds onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, SC, END } from "./timeline.mjs";
import { ABSORB, BOUNCES, EXITS } from "./eye.mjs";

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
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const shimmer = (a, b, gain = 0.012, base = 1800) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => base + 500 * Math.sin(tt * 30) + 400 * u, v: env(0.2, 0.3), gain });

// ---- the hook: the glow pulses; tags
shimmer(0.2, 1.6, 0.008, 1400); pop(EV.glow - 0.05, "E6", "B6"); pop(EV.mirror - 0.05, "G6", "D7");
// ---- into the eye: a falling sweep for the whole zoom; the section opening
sweep(SC.sectionIn[0] - 0.4, SC.sectionIn[1], false, 0.9, 140, 800);
pop(EV.retina, "C6", "E6", 0.025); pop(EV.catches, "E6", "G6", 0.02);
// the tapetum's shine sweeps along the layer (lasts the sweep), then its label
tone(sfx, EV.shiny - 0.1, 1.0, { duty: 0.125, f: (u) => 900 + 1600 * u, v: env(0.2, 0.3), gain: 0.012 }); pop(EV.tapetum, "A6", "E7", 0.025);
// ---- light: a soft tick for every rod that catches it (first pass bright, second pass green and lower),
//      a ping where it bounces off the mirror, a little chime as it leaves the eye
ABSORB.forEach((a, i) => tone(sfx, a.t, 0.05, { wave: "tri", f: (u) => (a.second ? 980 : 1480) + (i % 3) * 110 - 300 * u, v: (u) => 1 - u, gain: 0.018 }));
BOUNCES.forEach((b, i) => tone(sfx, b.t, 0.06, { duty: 0.25, f: (u) => 2200 + (i % 2) * 300 + 800 * u, v: (u) => 1 - u, gain: 0.008 }));
EXITS.forEach((e, i) => { if (e.t > EV.comes - 0.4 && e.t < EV.again + 0.6) blip(e.t, i % 2 ? "E7" : "B6", 0.06, 0.012, 0.25); });
pop(EV.once - 0.2, "C6", "G6", 0.02); pop(EV.bounces - 0.15, "G6", "C7", 0.022); pop(EV.second - 0.05, "E6", "B6", 0.022);
// ---- back out to the face (rising sweep for the zoom); the phone rises (whoosh as long as it rises), the light clicks on
sweep(SC.sectionOut[0], SC.sectionOut[1] + 0.5, true, 0.9, 140, 800);
noise(SC.sectionOut[0] + 0.2, 1.0, (u) => 1200 + 1500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012);
blip(SC.sectionOut[0] + 1.1, "A6", 0.04, 0.03, 0.125);
shimmer(EV.lamp - 0.2, EV.back2 + 0.1, 0.007, 2100); pop(EV.lamp, "C6", "E6", 0.02); pop(EV.bouncing, "E6", "A6", 0.02);
noise(EV.back2 + 0.1, 0.7, (u) => 2700 - 1500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.01);
// ---- pupils: zoom to the face; they widen (rising, as long as they widen); sunrise (warm swell); they narrow (falling)
sweep(EV.back2 - 0.1, EV.pupils + 0.2, false, 0.6, 160, 600);
tone(sfx, EV.open - 0.05, EV.circles + 0.15 - EV.open, { wave: "tri", f: (u) => 220 + 220 * u, v: env(0.2, 0.2), gain: 0.05 });
tone(sfx, SC.day[0], SC.day[1] - SC.day[0], { wave: "tri", f: (u) => 330 + 165 * u, v: env(0.3, 0.3), gain: 0.04 }); seq(SC.day[1] - 0.3, ["C6", "E6", "G6"], 0.08, { gain: 0.018, duty: 0.25 });
tone(sfx, EV.close - 0.05, EV.slits + 0.15 - EV.close, { wave: "tri", f: (u) => 440 - 260 * u, v: env(0.2, 0.2), gain: 0.05 });
// ---- the pupil race: the counters tick up as long as they count
{ const a = EV.hundred - 0.1, b = EV.lightEnd; for (let t = a, k = 0; t < b; t += 0.06, k++) blip(t, ["C5", "E5", "G5", "C6", "E6", "G6", "C7"][Math.min(6, Math.floor((k * 7) / ((b - a) / 0.06)))], 0.04, 0.012, 0.25); seq(b, ["C7", "G7"], 0.06, { gain: 0.025 }); }
{ const a = EV.pupils2, b = EV.fifteen + 0.2; for (let t = a; t < b; t += 0.1) blip(t, "C5", 0.04, 0.012, 0.25); seq(b, ["E5", "C5"], 0.08, { gain: 0.022 }); }
// ---- back to night (falling swell); six lamps click on for you, one for the cat; "6× dimmer"
tone(sfx, SC.night[0], SC.night[1] - SC.night[0], { wave: "tri", f: (u) => 330 - 165 * u, v: env(0.3, 0.3), gain: 0.035 });
for (let k = 0; k < 6; k++) blip(EV.withW + 0.2 + k * 0.18, "G5", 0.05, 0.02, 0.25); blip(EV.six - 0.4, "G6", 0.06, 0.025, 0.25);
pop(EV.dimmer - 0.1, "C6", "C7", 0.025);
tone(sfx, EV.dimmer - 0.2, 0.8, { wave: "tri", f: (u) => 300 - 120 * u, v: env(0.2, 0.3), gain: 0.03 });
// ---- the detail test: a wobble for "blurry", a rising sweep for the 7× zoom (as long as it zooms), "7× closer"
tone(sfx, EV.detail - 0.3, 0.6, { duty: 0.5, f: (u, tt) => 300 + 40 * Math.sin(tt * 40), v: env(0.2, 0.3), gain: 0.02 });
sweep(EV.seven - 0.2, EV.closer + 0.5, true, 0.8, 160, 900); pop(EV.seven - 0.1, "E6", "B6", 0.025);
// ---- the flash photo: the phone rises (whoosh), the shutter and the flash, the photo appears, red and green
noise(SC.photo[0], 0.9, (u) => 1200 + 1500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012);
noise(EV.flash - 0.04, 0.05, () => 8000, (u) => 1 - u, 0.05); noise(EV.flash + 0.02, 0.04, () => 5000, (u) => 1 - u, 0.04);
tone(sfx, EV.flash - 0.04, 0.6, { duty: 0.125, f: (u) => 3200 - 2400 * u, v: (u) => 1 - u, gain: 0.02 });
pop(EV.flash + 0.3, "C6", "G6", 0.022); seq(EV.red - 0.05, ["A4", "E4"], 0.1, { gain: 0.025, duty: 0.5 }); seq(EV.red + 0.15, ["E6", "A6"], 0.08, { gain: 0.022, duty: 0.25 });
noise(EV.so + 0.2, 0.8, (u) => 2700 - 1500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.01);
// ---- the last zoom into the dark close-up (lasts the zoom); the glow shimmer returns before the seam
sweep(EV.so - 0.1, EV.dark3 - 0.1, false, 0.6, 140, 600);
shimmer(EV.dark3, END - 0.2, 0.006, 1400);

// ---- night bed: Fmaj7 – Em7 – Dm7 – Cmaj7, 6 whole cycles over the loop; soft at the seam and in the section, full elsewhere
const CYC = 6, BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[41, 45, 48, 52], [40, 43, 47, 50], [38, 41, 45, 48], [36, 40, 43, 47]];
const section = (t) => (t < 1.2 || t > END - 1.6 ? "soft" : t > SC.sectionIn[1] && t < SC.sectionOut[0] ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = section(t); if (t >= END - 1e-6) break;
    tone(bed, t, BEAT * 0.95, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.09 : 0.065 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * 1.6, { duty: 0.125, f: () => NOTE(ch[[0, 2, 1, 3, 2, 1, 3, 2][s8]] + 24), v: (u) => 1 - 0.8 * u, gain: s === "full" ? 0.022 : 0.016 });
    if (s8 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.012 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1), "absorbs", ABSORB.length);
