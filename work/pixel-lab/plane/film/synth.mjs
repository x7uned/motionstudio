// 8-bit sound for «What happens if you forget airplane mode»: every cue is synthesised and lasts exactly as long as its
// motion (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, CAM, END } from "./timeline.mjs";

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

// ---- engines: a low rumble under the whole flight
noise(0, EV.outroIn[1], (u, tt) => 260 + 40 * Math.sin(tt * 0.5), (u, tt) => Math.min(1, tt / 1.0, (EV.outroIn[1] - tt) / 0.5) * 0.8, 0.012);
tone(sfx, 0, EV.outroIn[1], { wave: "tri", f: (u, tt) => 55 + 1.5 * Math.sin(tt * 0.7), v: (u, tt) => Math.min(1, tt / 1.0, (EV.outroIn[1] - tt) / 0.5) * 0.7, gain: 0.03 });
// seat-belt chime, the setting panel, "the plane is fine"
tone(sfx, EV.ding, 0.6, { duty: 0.5, f: () => n("E6"), v: (u) => 1 - u, gain: 0.03 }); tone(sfx, EV.ding + 0.32, 0.9, { duty: 0.5, f: () => n("C6"), v: (u) => 1 - u, gain: 0.03 });
pop(EV.toggleShow[0] + 0.2, "G5", "D6"); seq(EV.crashOk[0], ["C6", "E6", "G6"], 0.06, { gain: 0.03, duty: 0.25 });
// searching beeps for the whole search; the weak link crackles; the shout
for (let t = EV.bars[0]; t < EV.bars[1] - 0.1; t += 0.33) blip(t, "A5", 0.05, 0.02, 0.125);
{ const [a, b] = EV.weak; for (let t = a; t < b; t += 1 / 18) if (Math.sin(t * 40) > -0.3) noise(t, 0.03, () => 5000, (u) => 1 - u, 0.014); }
seq(EV.shout - 0.05, ["E5", "A5", "E6"], 0.05, { gain: 0.035, duty: 0.25 });
// radio power climbs (rising tone for the climb), every ring is a radio burst chirp
tone(sfx, EV.power[0], EV.power[1] - EV.power[0], { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.1), gain: 0.025 });
{ const rt = []; for (let t = EV.rings[0]; t < EV.again[0] - 0.3; t += 0.85) rt.push(t); rt.push(...EV.again); for (let t = EV.bursts[0]; t < EV.bursts[1] + 2.5; t += 0.6) rt.push(t);
  for (const t of rt) { tone(sfx, t, 0.16, { duty: 0.25, f: (u) => 1400 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.03 }); noise(t, 0.05, () => 9000, (u) => 1 - u, 0.012); } }
// battery melts: falling tone over the drain, drips
tone(sfx, EV.battery[0], EV.battery[1] - EV.battery[0] - 0.3, { wave: "tri", f: (u) => 700 * Math.pow(0.35, u), v: env(0.1, 0.2), gain: 0.04 });
for (let k = 0; k < 5; k++) tone(sfx, EV.battery[0] + 0.3 + k * 0.32, 0.08, { wave: "tri", f: (u) => 1200 - 600 * u, v: (u) => 1 - u, gain: 0.03 });
// towers: the beams hum while we look; the car and its handoff
tone(sfx, EV.towers[0], EV.towers[1] - EV.towers[0] + 0.6, { duty: 0.125, f: (u, tt) => 330 + 10 * Math.sin(tt * 12), v: env(0.2, 0.3), gain: 0.012 });
tone(sfx, EV.car[0], EV.car[1] - EV.car[0], { duty: 0.25, f: (u, tt) => 70 + 8 * Math.sin(tt * 30), v: env(0.2, 0.2), gain: 0.02 });
seq(EV.handoff, ["E6", "A6"], 0.06, { gain: 0.035, duty: 0.25 });
// 900 km/h: whoosh for the whole fly-over; dozens of links: one blip per tower; confusion: detuned warble
swish(EV.fly[0], EV.fly[1], 0.03); pop(EV.speed, "C6", "G6");
{ const [a, b] = EV.many; for (let k = 0; k < 12; k++) blip(a + ((b - a) * k) / 12, ["C5", "E5", "G5", "B5", "D6", "E6", "G6", "A6", "B6", "D7", "E7", "G7"][k], 0.05, 0.02, 0.25); }
{ const [a, b] = EV.confuse; tone(sfx, a, b - a, { duty: 0.5, f: (u, tt) => 220 + 30 * Math.sin(tt * 13), v: env(0.1, 0.2), gain: 0.016 }); tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => 233 + 30 * Math.cos(tt * 11), v: env(0.1, 0.2), gain: 0.016 }); }
// FCC: panel, stamp, logo
pop(EV.fcc[0]); bonk(EV.banned + 0.1, 1.1); pop(EV.fccLogo, "G5", "C6");
// the cockpit: GSM-style buzz in the headset for the buzz window, the mosquito whine, garbled ATC syllables
{ const [a, b] = EV.buzz; for (let t = a + 0.15; t < b - 0.1; t += 0.46) tone(sfx, t, 0.3, { duty: 0.5, f: () => 217, v: (u, tt) => ((Math.floor(tt * 217) % 8) < 1 ? 1 : 0.15) * Math.min(1, u * 8, (1 - u) * 6), gain: 0.03 }); }
{ const [a, b] = EV.mosquito; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 620 + 90 * Math.sin(tt * 23) + 40 * Math.sin(tt * 3.1), v: (u, tt) => env(0.15, 0.2)(u) * (0.6 + 0.4 * Math.sin(tt * 7)), gain: 0.012 }); }
{ const [a, b] = EV.atc; for (let t = a, k = 0; t < b - 0.1; t += 0.11, k++) blip(t, ["C5", "D5", "E5", "G5", "A5"][Math.floor(rnd(k * 7) * 5)], 0.08, 0.016, 0.25); }
// ×1, ×200: one blip, then a tick per lit row and a chord
blip(EV.one, "C6", 0.08, 0.03, 0.25);
for (let r = 0; r < 18; r++) blip(EV.twoHundred[0] + Math.abs(r - 8) * 0.06, ["C6", "E6", "G6"][r % 3], 0.04, 0.012, 0.125);
seq(EV.twoHundred[0] + 0.55, ["C5", "E5", "G5", "C6"], 0.03, { gain: 0.03, dur: 0.25, duty: 0.25 });
// on-board cell powers up, link to the satellite (rising for the link draw), the phones whisper, power drops
seq(EV.pico[0], ["C5", "G5", "C6", "E6"], 0.06, { gain: 0.03, duty: 0.25 });
tone(sfx, EV.sat[0], EV.sat[1] - EV.sat[0], { duty: 0.125, f: (u) => 300 * Math.pow(5, u), v: env(0.1, 0.1), gain: 0.02 });
{ const [a, b] = EV.whisper; for (let t = a; t < b; t += 0.25) blip(t, "G6", 0.03, 0.008, 0.125); tone(sfx, a, 0.8, { duty: 0.25, f: (u) => 1200 * Math.pow(0.3, u), v: env(0.1, 0.2), gain: 0.02 }); }
// camera zooms: a sweep for every big zoom, lasting the zoom
for (let i = 0; i + 1 < CAM.length; i++) { const a = CAM[i], b = CAM[i + 1]; if (b.t > EV.outroIn[0]) break; if (Math.abs(Math.log(b.z / a.z)) > 0.5 || Math.abs(b.cy - a.cy) > 300) sweep(a.t, b.t, b.z > a.z, 0.8); }
// flip the switch: click + chime; he dozes off
noise(EV.flip, 0.03, () => 6000, (u) => 1 - u, 0.04); blip(EV.flip + 0.02, "C6", 0.04, 0.03, 0.5); seq(EV.flip + 0.1, ["G5", "C6", "G6"], 0.07, { gain: 0.03, duty: 0.25 });
seq(EV.sleep[0], ["E5", "C5"], 0.2, { gain: 0.02, duty: 0.5, dur: 0.18 });
// into the outro
{ const [a, b] = EV.outroIn; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.03 }); }
function addWav(file, t, gain) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset); let off = 12, data = null, ch = 1, bits = 16;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = dv.getUint32(off + 4, true); if (id === "fmt ") { ch = dv.getUint16(off + 10, true); bits = dv.getUint16(off + 22, true); } if (id === "data") { data = [off + 8, sz]; break; } off += 8 + sz; }
  const [s, len] = data, frames = len / (bits / 8) / ch, s0 = Math.round(t * SR);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < ch; c++) v += dv.getInt16(s + (i * ch + c) * 2, true) / 32768; if (s0 + i < N) sfx[s0 + i] += (v / ch) * gain; }
}
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/pixel-click.wav", EV.click, 0.55);
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/chiptune-arpeggio.wav", EV.toggle, 0.45);

// ---- chiptune bed: Dm – Bb – F – C at 92 BPM; soft at the start, full while we explain, sparse under the headset buzz
const BEAT = 60 / 92, BAR = BEAT * 4, prog = [[50, 53, 57], [46, 50, 53], [41, 45, 48], [48, 52, 55]];
const section = (t) => (t >= EV.outroIn[0] ? "outro" : t < EV.power[0] || t >= EV.flip - 0.3 ? "soft" : t >= EV.buzz[0] && t < EV.buzz[1] ? "sparse" : "full");
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t > END) break; if (s === "outro") continue; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t > END) break; if (s === "outro" || s === "sparse") continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.026 : 0.02 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.016 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.2) * clamp01((END - t) / 0.8); }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END, "cams", CAM.length);
