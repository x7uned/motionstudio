// 8-bit sound for «How your touchscreen feels your finger»: every cue is synthesised and lasts exactly as long as its
// motion (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, CAM, END } from "./timeline.mjs";
import { stepTimes } from "./hero.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (k) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)), k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge;
  }
}
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const sweep = (a, b, up, gain = 1) => { const d = b - a, lo = 140, hi = 900, fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, d, { duty: 0.25, f: fr, v: env(0.12, 0.2), gain: 0.02 * gain }); tone(sfx, a, d, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.1, 0.25), gain: 0.045 * gain }); };
const swish = (a, b, gain = 0.016) => noise(a, b - a, (u) => 2500 + 3500 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const bonk = (t, g = 1) => { tone(sfx, t, 0.14, { wave: "tri", f: (u) => 150 - 80 * u, v: (u) => 1 - u, gain: 0.09 * g }); noise(t, 0.06, () => 900, (u) => 1 - u, 0.03 * g); };
const nope = (t) => seq(t, ["E3", "C3"], 0.09, { gain: 0.035, duty: 0.25, dur: 0.08 });
const pop = (t, a = "C6", b = "G6") => seq(t, [a, b], 0.05, { gain: 0.03, duty: 0.25 });

// ---- street: wind with gusts for every street stretch; snow crunch for each planted foot
for (const [a, b] of [[0, EV.cuIn[1]], [EV.streetBack[0], EV.outroIn[1]]]) noise(a, b - a, (u, tt) => 600 + 300 * Math.sin(tt * 0.7), (u, tt) => Math.min(1, (u * (b - a)) / 1.2, ((1 - u) * (b - a)) / 0.8) * (0.45 + 0.35 * Math.sin(tt * 0.9) + 0.2 * Math.sin(tt * 2.3)), 0.012);
for (const t of stepTimes()) if (t < EV.outroIn[0]) { noise(t, 0.09, (u) => 6000 - 4000 * u, (u) => 1 - u, 0.028); tone(sfx, t, 0.05, { wave: "tri", f: (u) => 90 - 30 * u, v: (u) => 1 - u, gain: 0.05 }); }
// ---- the call: vibration + ringtone for exactly the ringing time, cut at the drop
{ const [a, b] = EV.ring; for (let t = a; t < b - 0.05; t += 1.2) { tone(sfx, t, Math.min(0.5, b - t), { duty: 0.5, f: () => 55, v: (u) => 0.6, gain: 0.03 }); for (let k = 0; k < 8 && t + 0.55 + k * 0.075 < b; k++) blip(t + 0.55 + k * 0.075, k % 2 ? "G6" : "E6", 0.065, 0.022, 0.25); } }
// gloved tap: bonk + error; "…" dots; the hard press creaks for the whole press
bonk(EV.tap1[1]); nope(EV.tap1[1] + 0.1);
for (let k = 0; k < 3; k++) blip(EV.dots[0] + k * 0.25, "C6", 0.04, 0.018, 0.125);
bonk(EV.press[1], 1.2); tone(sfx, EV.press[1], EV.press[2] - EV.press[1], { duty: 0.125, f: (u, tt) => 95 + 40 * u + 12 * Math.sin(tt * 40), v: env(0.1, 0.1), gain: 0.03 }); bonk(EV.press[2] - 0.05, 0.8); nope(EV.press[2]);
// call drops: sad notes; snow clump whistles down and lands
seq(EV.drop + 0.02, ["G4", "E4", "C4"], 0.13, { gain: 0.04, duty: 0.25 });
tone(sfx, EV.clump[0], EV.clump[1] - EV.clump[0], { duty: 0.125, f: (u) => 1400 * Math.pow(0.25, u), v: (u) => 0.6 + 0.4 * u, gain: 0.018 }); noise(EV.clump[1], 0.18, (u) => 3000 - 2000 * u, (u) => 1 - u, 0.04);
// hypotheses: pop in, struck out; the glint runs over the glass
pop(EV.frozen[0]); nope(EV.frozen[1]); pop(EV.cracked, "D6", "A6");
{ const [a, b] = EV.glint; const d = b - a; for (let k = 0; k < 8; k++) blip(a + (d * k) / 8, ["C6", "E6", "G6", "B6", "C7", "E7", "G7", "B7"][k], d / 8, 0.016, 0.125); }
nope(EV.glint[1]);
// zoom into the phone (camera dive + close-up scaling in), one sweep for the whole move
sweep(EV.zoomPhone[0], EV.cuIn[1] + 0.2, true);
// pressure bar fills (one step per segment), IGNORED stamp
{ const [a, b] = EV.pressure; for (let k = 0; k < 12; k++) blip(a + ((b - a) * k) / 12, ["C4", "D4", "E4", "F4", "G4", "A4", "B4", "C5", "D5", "E5", "F5", "G5"][k], (b - a) / 12, 0.024, 0.25); }
bonk(EV.ignored, 1.3); seq(EV.ignored + 0.05, ["A2", "A2"], 0.12, { gain: 0.05, duty: 0.5, dur: 0.1 });
// dive into the button: sweep for the zoom, electric crackle for the sparks, the glass settles in
sweep(EV.cuZoom[0], EV.cuZoom[1], true, 1.1);
{ const [a, b] = EV.spark; for (let t = a; t < b; t += 0.03) noise(t, 0.025, () => 8000 + rnd(t * 1000) * 6000, (u) => 1 - u, 0.03 * (1 - (t - a) / (b - a)) + 0.01); }
tone(sfx, EV.tvScale[0], EV.tvScale[1] - EV.tvScale[0], { wave: "tri", f: (u) => 300 + 200 * u, v: env(0.2, 0.4), gain: 0.025 });
// the grid: shimmer while it fades in, a tick per row and per column as they draw, ruler
{ const [a, b] = EV.ghost; for (let t = a, k = 0; t < b; t += 0.12, k++) blip(t, ["E6", "B6", "G6", "D7"][k % 4], 0.1, 0.008, 0.125); }
{ const [a, b] = EV.rowsDraw; for (let k = 0; k < 11; k++) blip(a + ((b - a) * k) / 11, ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7"][k], 0.035, 0.02, 0.25); }
{ const [a, b] = EV.colsDraw; for (let k = 0; k < 8; k++) blip(a + ((b - a) * k) / 8, ["E5", "G5", "B5", "D6", "E6", "G6", "B6", "D7"][k], 0.035, 0.018, 0.125); }
pop(EV.ruler[0], "G5", "D6");
// pulses along the rows: one chirp per row pulse
for (let j = 0; j < 11; j++) { const t0 = EV.pulses[0] + j * 0.055; tone(sfx, t0, 0.09, { duty: 0.25, f: (u) => 500 + 900 * u, v: (u) => 1 - u, gain: 0.014 }); }
// dissolves between the views
for (const [a, b] of [EV.tvIn, EV.csIn1, EV.tvIn2, EV.csIn2]) swish(a, b);
// field arcs grow (hum rising with the bulge)
{ const [a, m, b] = EV.arcs; tone(sfx, a, b - a, { wave: "tri", f: (u) => 98 * (1 + 0.15 * u), v: (u) => Math.min(1, u * 3, (1 - u) / 0.15) * (0.5 + 0.5 * u), gain: 0.06 }); tone(sfx, m, b - m, { duty: 0.125, f: (u) => 196 + 60 * u, v: env(0.2, 0.2), gain: 0.012 }); }
// finger comes down; salty water bubbles; "conducts" zap; the last approach
tone(sfx, EV.fingerIn[0], EV.fingerIn[1] - EV.fingerIn[0], { wave: "tri", f: (u) => 520 - 300 * u, v: env(0.15, 0.25), gain: 0.03 });
for (let k = 0; k < 3; k++) tone(sfx, EV.salty[0] + k * 0.13, 0.08, { wave: "tri", f: (u) => 600 + 900 * u, v: (u) => 1 - u, gain: 0.035 });
noise(EV.conducts, 0.08, () => 9000, (u) => 1 - u, 0.025); blip(EV.conducts + 0.02, "A6", 0.06, 0.025, 0.125);
tone(sfx, EV.approach[0], EV.approach[1] - EV.approach[0], { wave: "tri", f: (u) => 330 - 120 * u, v: env(0.15, 0.2), gain: 0.025 });
// the field is pulled into the finger (rising siphon for the fan growth), bars sink (falling tone for the sink)
tone(sfx, EV.steal[0], EV.steal[1] - EV.steal[0], { duty: 0.25, f: (u) => 300 * Math.pow(3, u), v: env(0.1, 0.2), gain: 0.022 });
tone(sfx, EV.sink[0], EV.sink[1] - EV.sink[0], { duty: 0.25, f: (u) => 800 * Math.pow(0.4, u), v: env(0.1, 0.2), gain: 0.025 }); pop(EV.lessPill + 0.05, "E5", "C5");
// the scan: a tick per scanned row for the whole scan; counter; the map fills
{ const [a, b] = EV.scan; for (let t = a; t < b; t += 0.42 / 11) noise(t, 0.008, () => 12000, () => 1, 0.012); }
pop(EV.hundred, "C6", "C7");
{ const [a, b] = EV.mapDip; for (let k = 0; k < 9; k++) blip(a + ((b - a) * k) / 9, ["C5", "E5", "G5", "C6", "E6", "G6", "C7", "E7", "G7"][k], (b - a) / 9, 0.02, 0.25); }
seq(EV.cover3[0], ["C5", "E5", "G5"], 0.04, { gain: 0.03, dur: 0.18, duty: 0.25 });
tone(sfx, EV.glide[0], EV.glide[1] - EV.glide[0], { duty: 0.125, f: (u) => n("E6") * (1 + 0.5 * u), v: env(0.1, 0.1), gain: 0.014 }); seq(EV.lock, ["G6", "D7"], 0.07, { gain: 0.035, duty: 0.25 });
sweep(EV.finer[0], EV.finer[0] + 0.8, true, 0.8);
// wool: finger lifts, the mitten comes down, muffled contact, the field barely gets in, NO TOUCH
tone(sfx, EV.lift[0], EV.lift[1] - EV.lift[0], { wave: "tri", f: (u) => 200 + 400 * u, v: env(0.1, 0.2), gain: 0.025 });
tone(sfx, EV.mitten[0], EV.mitten[1] - EV.mitten[0], { wave: "tri", f: (u) => 420 - 250 * u, v: env(0.15, 0.2), gain: 0.025 }); noise(EV.mitten[0], EV.mitten[1] - EV.mitten[0], () => 1500, env(0.2, 0.2), 0.006);
tone(sfx, EV.mitten[1], 0.12, { wave: "tri", f: (u) => 90 - 30 * u, v: (u) => 1 - u, gain: 0.07 });
noise(EV.barely[0], EV.barely[1] - EV.barely[0], (u) => 7000 - 4000 * u, (u) => (1 - u) * (0.5 + 0.5 * Math.sin(u * 60)), 0.014);
bonk(EV.flat, 1.1); nope(EV.flat + 0.12);
// silver thread shimmer for the glint, field carried through (rising), success
{ const [a, b] = EV.silver; for (let k = 0; k < 10; k++) blip(a + ((b - a) * k) / 10, ["E6", "G6", "B6", "E7", "G7", "B7", "E7", "B6", "G7", "E7"][k], (b - a) / 10, 0.014, 0.125); }
tone(sfx, EV.carry[0], EV.carry[1] - EV.carry[0], { duty: 0.25, f: (u) => 300 * Math.pow(3, u), v: env(0.1, 0.2), gain: 0.022 }); seq(EV.touchOk, ["C6", "G6"], 0.07, { gain: 0.035, duty: 0.25 });
// back out to the street (reverse sweep), South Korea jingle, the sausage
sweep(EV.streetBack[0], EV.streetBack[1], false);
seq(EV.korea[0], ["D5", "E5", "G5", "A5", "D6"], 0.07, { gain: 0.03, duty: 0.25 });
blip(EV.pick[0], "A5", 0.05, 0.03, 0.125); noise(EV.pick[0], 0.35, () => 9000, (u) => (1 - u) * (0.6 + 0.4 * Math.sin(u * 80)), 0.012);
seq(EV.sausageTap[1], ["B5", "E6"], 0.07, { gain: 0.045, duty: 0.5, dur: 0.12 });
tone(sfx, EV.calling, EV.connected - EV.calling - 0.05, { duty: 0.5, f: () => 440, v: env(0.1, 0.1), gain: 0.012 });
seq(EV.connected, ["C6", "E6", "G6"], 0.06, { gain: 0.03, duty: 0.25 });
noise(EV.bite[0] + 0.1, 0.1, () => 2000, (u) => 1 - u, 0.04); tone(sfx, EV.bite[0] + 0.1, 0.08, { wave: "tri", f: () => 120, v: (u) => 1 - u, gain: 0.05 });
// camera pull-back at the end (pan) and into the outro: sweep for the exact transition, then the pack's click and arpeggio
{ const [a, b] = EV.outroIn; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.03 }); }
function addWav(file, t, gain) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset); let off = 12, data = null, ch = 1, bits = 16;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = dv.getUint32(off + 4, true); if (id === "fmt ") { ch = dv.getUint16(off + 10, true); bits = dv.getUint16(off + 22, true); } if (id === "data") { data = [off + 8, sz]; break; } off += 8 + sz; }
  const [s, len] = data, frames = len / (bits / 8) / ch, s0 = Math.round(t * SR);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < ch; c++) v += dv.getInt16(s + (i * ch + c) * 2, true) / 32768; if (s0 + i < N) sfx[s0 + i] += (v / ch) * gain; }
}
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/pixel-click.wav", EV.click, 0.55);
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/chiptune-arpeggio.wav", EV.toggle, 0.45);

// ---- chiptune bed: Am – F – C – G at 96 BPM; soft music-box on the street, fuller inside the screen, quiet in the outro
const BEAT = 60 / 96, BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const inside = (t) => t >= EV.tvIn[0] && t < EV.streetBack[0];
const section = (t) => (t >= EV.outroIn[0] ? "outro" : inside(t) ? "full" : "street");
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t > END) break; if (s === "outro") continue; if (s === "street" && e % 2) continue;
    tone(bed, t, (s === "street" ? BEAT : BEAT / 2) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "street" ? 0.07 : 0.1 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t > END) break; if (s === "outro") continue;
    if (s === "street" ? s16 % 2 === 0 : true) tone(bed, t, (BEAT / 4) * (s === "street" ? 1.6 : 0.8), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "street" ? 1 : 0)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "street" ? 0.022 : 0.026 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.016 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.2) * clamp01((END - t) / 0.8); }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END, "cams", CAM.length);
