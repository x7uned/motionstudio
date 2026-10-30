// 8-bit sound for the pixel film: every cue is synthesised (pulse / triangle / LFSR noise, 60 Hz parameter steps,
// 4-bit volume) and lasts exactly as long as its motion in the shared timeline. Writes sfx.wav and bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, ZOOMS, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + base + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** One voice. f(u) Hz and v(u) 0..1 are sampled at 60 Hz (u = 0..1 over dur), volume quantised to 16 steps. */
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u), vol = Math.round(clamp01(v(u)) * 15) / 15;
    ph += fr / SR;
    let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR));
    const k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge;
  }
}
const blip = (t, note, dur = 0.07, gain = 0.06, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, opts = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, opts.dur ?? step * 0.95, opts.gain ?? 0.06, opts.duty ?? 0.5));
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);

// ---- cues (all durations come from the timeline)
// ten taps a day: ten quick rising blips across the tally build
{ const [a, b] = EV.tally, notes = ["C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7", "G7", "A7"]; notes.forEach((nn, i) => blip(a + i * (b - a) / 10, nn, 0.045, 0.035, 0.125)); }
// question mark
tone(sfx, EV.question, 0.22, { duty: 0.25, f: (u) => (u < 0.4 ? n("G5") : n("C6") * (1 + 0.06 * (u - 0.4))), v: (u) => 1 - u * 0.5, gain: 0.05 });
// card moves to the terminal (rising noise), the contact itself is the NFC trill for exactly the contact time, then a short beep
{ const t = EV.tap; tone(sfx, t.move, t.contact - t.move, { wave: "noise", f: (u) => 2000 + 9000 * u, v: (u) => 0.25 + 0.5 * u, gain: 0.03 });
  tone(sfx, t.contact, t.release - t.contact, { duty: 0.125, f: (u) => ((Math.floor(u * (t.release - t.contact) * 20) % 2) ? n("B6") : n("E6")), v: (u) => 1 - 0.3 * u, gain: 0.045 });
  blip(t.release - 0.02, "E7", 0.09, 0.05);
  tone(sfx, t.release, t.back + 0.3 - t.release, { wave: "noise", f: (u) => 9000 - 7000 * u, v: (u) => 0.5 * (1 - u), gain: 0.025 }); }
// camera zooms: a continuous 8-bit sweep for the whole zoom (down when pulling out, up when diving in)
for (const z of ZOOMS) {
  const dur = z.t1 - z.t0, out = z.to < z.from, lo = 110, hi = 880, fr = (u) => (out ? hi * Math.pow(lo / hi, u) : lo * Math.pow(hi / lo, u));
  tone(sfx, z.t0, dur, { duty: 0.25, f: (u) => fr(u) * (1 + 0.02 * Math.sin(u * dur * 50)), v: env(0.12, 0.2), gain: 0.032 });
  tone(sfx, z.t0, dur, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.1, 0.25), gain: 0.06 });
  tone(sfx, z.t0, dur, { wave: "noise", f: (u) => (out ? 6000 - 4500 * u : 1500 + 4500 * u), v: (u) => env(0.15, 0.3)(u) * 0.5, gain: 0.02 });
}
// pins
seq(EV.tokyoPin, ["A5", "E6"], 0.07, { gain: 0.05 }); seq(EV.londonPin, ["D6", "A6"], 0.07, { gain: 0.05 });
// story arc drawing: soft arpeggio for its draw time
{ const [a, b] = EV.arc, ch = [0, 4, 7, 12]; tone(sfx, a, b - a, { duty: 0.125, f: (u) => NOTE(72 + ch[Math.floor(u * (b - a) * 24) % 4] + Math.floor(u * 5)), v: env(0.1, 0.3), gain: 0.025 }); }
// one-time code stamp
tone(sfx, EV.stamp, 0.05, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.05 });
tone(sfx, EV.stamp + 0.02, 0.12, { duty: 0.5, f: () => n("C4"), v: (u) => 1 - u, gain: 0.06 });
seq(EV.stamp + 0.1, ["C7", "G7"], 0.045, { gain: 0.03, duty: 0.125 });
// data trills: the packet's sound runs exactly as long as it travels
const trill = (a, b, from, to, gain, chord = [0, 4, 7, 12]) => {
  tone(sfx, a, b - a, { duty: 0.125, f: (u) => NOTE(from + (to - from) * u + chord[Math.floor(u * (b - a) * 30) % chord.length]), v: env(0.06, 0.12), gain });
  tone(sfx, a, b - a, { wave: "tri", f: (u) => NOTE(from - 24 + (to - from) * u), v: env(0.08, 0.15), gain: gain * 1.2 });
};
trill(EV.sendLocal[0], EV.sendLocal[1], 72, 79, 0.03); blip(EV.sendLocal[1], "G6", 0.07, 0.04);
// "who?"
tone(sfx, EV.unknown, 0.26, { duty: 0.25, f: (u) => (u < 0.45 ? n("E5") : n("A4")), v: (u) => 1 - u * 0.4, gain: 0.05 });
// network nodes light up one by one
{ const [a] = EV.nodes; ["C5", "E5", "G5", "A5", "C6", "E6", "G6"].forEach((nn, i) => tone(sfx, a + i * 0.08, 0.09, { wave: "tri", f: () => n(nn), v: (u) => 1 - u, gain: 0.07 })); }
// logos: power-up arpeggios
seq(EV.visa, ["C5", "E5", "G5", "C6"], 0.045, { gain: 0.045 }); seq(EV.mastercard, ["D5", "F#5", "A5", "D6"], 0.045, { gain: 0.045 });
// cables on the ocean floor: low hum + bubbles for the drawing time
{ const [a, b] = EV.cables; tone(sfx, a, b - a, { wave: "tri", f: (u) => n("A2") * (1 + 0.03 * Math.sin(u * 18)), v: env(0.15, 0.3), gain: 0.09 });
  for (let i = 0; i < 7; i++) tone(sfx, a + 0.1 + i * (b - a - 0.2) / 7, 0.06, { wave: "tri", f: (u) => n(["E6", "B5", "G6", "D6", "A6", "E6", "C7"][i]) * (1 + u * 0.3), v: (u) => 1 - u, gain: 0.04 }); }
// the request crosses the planet
trill(EV.travel[0], EV.travel[1], 67, 79, 0.028); blip(EV.travel[1], "A6", 0.08, 0.04);
// night in London (after the zoom-in)
seq(ZOOMS[3].t1, ["A4", "C5", "E5"], 0.12, { gain: 0.035, duty: 0.25, dur: 0.2 });
// panel + three checks
blip(EV.panel, "E6", 0.05, 0.03, 0.125);
EV.checks.forEach((t, i) => { const nn = ["C6", "E6", "G6"][i]; blip(t, nn, 0.1, 0.05); blip(t + 0.08, nn, 0.08, 0.02); });
// approved jingle
seq(EV.approved, ["C5", "E5", "G5", "C6", "E6"], 0.05, { gain: 0.05 }); tone(sfx, EV.approved + 0.25, 0.18, { duty: 0.25, f: () => n("G6"), v: (u) => 1 - u, gain: 0.04 });
// race back (descending)
trill(EV.race[0], EV.race[1], 86, 74, 0.03, [12, 7, 4, 0]);
// the beep
tone(sfx, EV.beep, 0.17, { duty: 0.5, f: () => n("E7"), v: (u) => (u < 0.85 ? 1 : 0.4), gain: 0.06 });
// counter ticks accelerate for the counting time, then a ding
{ const [a, b] = EV.counter; let t = a, k = 0; while (t < b) { const u = (t - a) / (b - a); blip(t, ["C6", "D6", "E6", "G6"][k++ % 4], 0.025, 0.03, 0.125); t += 0.075 - 0.045 * u; }
  seq(b, ["E6", "B6"], 0.06, { gain: 0.045 }); }
seq(EV.seconds, ["G5", "C6"], 0.07, { gain: 0.035, dur: 0.12 });
// hold: lock clunk
tone(sfx, EV.hold, 0.04, { wave: "noise", f: () => 5000, v: (u) => 1 - u, gain: 0.05 }); tone(sfx, EV.hold + 0.02, 0.14, { duty: 0.5, f: () => n("G3"), v: (u) => 1 - u, gain: 0.07 });
// days pass: two sunrise/sunset sweeps over the exact spin time
{ const a = EV.days[0], b = EV.days[1] + 0.35; tone(sfx, a, b - a, { wave: "tri", f: (u) => n("C5") * Math.pow(2, 0.6 * Math.sin(u * Math.PI * 4 - Math.PI / 2) * 0.5 + 0.3), v: env(0.08, 0.15), gain: 0.08 });
  seq(a + (b - a) * 0.25, ["G5", "C6"], 0.05, { gain: 0.025 }); seq(a + (b - a) * 0.75, ["A5", "D6"], 0.05, { gain: 0.025 }); }
// unlock + coin stream for the settlement travel + one coin at arrival
tone(sfx, EV.unlock, 0.05, { wave: "noise", f: () => 7000, v: (u) => 1 - u, gain: 0.03 }); blip(EV.unlock + 0.04, "C6", 0.06, 0.03);
{ const [a, b] = EV.settle; tone(sfx, a, b - a - 0.25, { duty: 0.25, f: (u) => ((Math.floor(u * (b - a) * 12) % 2) ? n("E6") : n("B5")), v: (u) => 0.55 * env(0.08, 0.2)(u), gain: 0.025 });
  blip(b - 0.25, "B5", 0.08, 0.05); tone(sfx, b - 0.17, 0.4, { duty: 0.5, f: () => n("E6"), v: (u) => 1 - u, gain: 0.05 }); }
// fees peel off
blip(EV.fee, "E5", 0.06, 0.04); blip(EV.fee + 0.06, "C5", 0.08, 0.035); blip(EV.fee + 0.3, "D5", 0.06, 0.035); blip(EV.fee + 0.36, "A4", 0.08, 0.03);
// into the outro: 8-bit sweep for the exact transition
{ const [a, b] = EV.outroIn; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.03 }); tone(sfx, a, b - a, { wave: "noise", f: (u) => 2000 + 8000 * u, v: env(0.1, 0.3), gain: 0.015 }); }
// outro pack sounds (approved 8-bit click + arpeggio)
function addWav(file, t, gain) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset); let off = 12, data = null, ch = 1, bits = 16;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = dv.getUint32(off + 4, true); if (id === "fmt ") { ch = dv.getUint16(off + 10, true); bits = dv.getUint16(off + 22, true); } if (id === "data") { data = [off + 8, sz]; break; } off += 8 + sz; }
  const [s, len] = data, frames = len / (bits / 8) / ch, s0 = Math.round(t * SR);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < ch; c++) v += dv.getInt16(s + (i * ch + c) * 2, true) / 32768; if (s0 + i < N) sfx[s0 + i] += (v / ch) * gain; }
}
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/pixel-click.wav", EV.click, 0.55);
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/chiptune-arpeggio.wav", EV.toggle, 0.45);

// ---- chiptune bed: Am – F – C – G at 96 BPM, arranged by the story
const BEAT = 60 / 96, BAR = BEAT * 4, prog = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const section = (t) => (t < EV.tap.move ? "intro" : t >= ZOOMS[3].t0 && t < ZOOMS[4].t1 ? "night" : t >= EV.outroIn[0] ? "outro" : "full");
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2, s = section(t); if (t > END) break; if (s === "outro") continue;
    tone(bed, t, BEAT / 2 * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 24 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: 0.11 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + s16 * BEAT / 4, s = section(t); if (t > END) break;
    if (s === "full" || s === "outro") tone(bed, t, BEAT / 4 * 0.8, { duty: 0.125, f: () => NOTE(ch[s16 % 3] + 12 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.6 * u, gain: 0.03 });
    if (s16 % 4 === 2 && s !== "outro") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.02 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.2) * clamp01((END - t) / 0.8); }

// ---- write (one-pole low-pass on the sfx bus softens the raw edges)
function lowpass(buf, hz) { const a = 1 - Math.exp(-2 * Math.PI * hz / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) {
  const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2);
  out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40);
  for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2);
  fs.writeFileSync(file, out);
}
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END);
