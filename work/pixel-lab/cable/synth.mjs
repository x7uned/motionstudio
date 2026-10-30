// 8-bit sound for «How your text crosses the ocean»: every cue is synthesised and lasts exactly as long as its
// motion (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { pulseX, CAB, cabIndex } from "./world.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (k) => { let h = (k * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  if (dur <= 0) return;
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
// camera sweeps: last exactly as long as the camera move
const sweep = (a, b, inn, gain = 1) => { const d = b - a, lo = 140, hi = 900, fr = (u) => (inn ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, d, { duty: 0.25, f: fr, v: env(0.12, 0.2), gain: 0.02 * gain }); tone(sfx, a, d, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.1, 0.25), gain: 0.045 * gain }); };
const swish = (a, b, gain = 0.02) => noise(a, b - a, (u) => 1500 + 2500 * Math.sin(Math.PI * u), (u) => 0.5 * Math.sin(Math.PI * u), gain);
const hum = (a, b, hz, gain = 0.014) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => hz * (1 + 0.01 * Math.sin(tt * 30)), v: env(0.08, 0.15), gain });

// 1. hook: the text bubble, a dotted guess toward a satellite, «nope», the cable lights up under the ocean
seq(EV.text - 0.15, ["C6", "E6", "G6"], 0.05, { gain: 0.035, duty: 0.25 });
{ const a = EV.bounces, b = EV.satellite + 0.3; for (let t = a, k = 0; t < b; t += 0.07, k++) blip(t, ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7"][Math.min(12, k)], 0.03, 0.018, 0.125); }
blip(EV.bounces - 0.2, "G6", 0.05, 0.02, 0.125);
tone(sfx, EV.satellite + 0.1, 0.18, { duty: 0.5, f: (u) => n("A5") * (1 + 0.5 * u), v: (u) => 1 - u * 0.5, gain: 0.035 });
tone(sfx, EV.doesnt - 0.05, 0.32, { duty: 0.25, f: (u) => 420 * Math.pow(0.35, u), v: (u) => 1 - u * 0.4, gain: 0.04 });
{ const a = EV.under - 0.1, b = EV.oceanEnd + 0.2; tone(sfx, a, b - a, { wave: "tri", f: (u) => 70 * Math.pow(2, u), v: env(0.15, 0.3), gain: 0.09 }); for (let t = a + 0.1, k = 0; t < b - 0.1; t += 0.09, k++) blip(t, ["E6", "B6", "G6", "D7"][k % 4], 0.03, 0.012, 0.125); }

// 2. radio → tower → fibre → landing station
sweep(EV.zoomIn[0], EV.zoomIn[1], true);
seq(EV.sends - 0.02, ["G5", "D6"], 0.05, { gain: 0.035 });
tone(sfx, EV.sends, EV.tower + 0.15 - EV.sends, { duty: 0.25, f: (u) => 500 + 700 * Math.sin(Math.PI * u * 0.5), v: env(0.1, 0.2), gain: 0.012 });
{ const a = EV.radio - 0.1, b = EV.towerEnd; tone(sfx, a, b - a, { duty: 0.125, f: () => n("E6"), v: (u, tt) => env(0.08, 0.15)(u) * (0.35 + 0.65 * Math.abs(Math.sin(Math.PI * 4.2 * tt))), gain: 0.022 }); }
blip(EV.tower + 0.15, "A6", 0.08, 0.035, 0.25);
tone(sfx, EV.light, EV.racing - EV.light, { duty: 0.125, f: (u) => 1800 * Math.pow(0.5, u), v: (u) => 1 - u * 0.5, gain: 0.02 });
hum(EV.racing, EV.coast + 0.1, 1100, 0.016); swish(EV.racing, EV.coast + 0.1, 0.012);
blip(EV.glass, "C7", 0.04, 0.025, 0.125);
tone(sfx, EV.coast, EV.enters - EV.coast, { wave: "tri", f: () => n("C3"), v: env(0.15, 0.2), gain: 0.04 });
blip(EV.building, "E6", 0.05, 0.03, 0.25);
seq(EV.enters, ["C4", "G4"], 0.07, { gain: 0.04, duty: 0.25 });
tone(sfx, EV.enters, EV.slides - EV.enters, { duty: 0.25, f: (u) => 700 * Math.pow(0.4, u), v: env(0.1, 0.1), gain: 0.018 });
swish(EV.enters, EV.slides + 0.1, 0.012);
noise(EV.slides + 0.15, 0.4, (u) => 4500 - 3000 * u, (u) => 1 - u, 0.05);
for (let i = 0; i < 9; i++) { const t = EV.slides + 0.3 + rnd(i) * (EV.sea + 0.3 - EV.slides); tone(sfx, t, 0.06, { wave: "tri", f: (u) => (500 + rnd(i * 3) * 500) * (1 + u), v: (u) => 1 - u, gain: 0.03 }); }

// 3. the dive: a falling tone for the whole descent, a sonar ping each kilometre passed
{ const a = EV.sea + 0.44, b = 22.4; tone(sfx, a, b - a, { wave: "tri", f: (u) => 520 * Math.pow(0.25, u), v: env(0.1, 0.15), gain: 0.05 }); tone(sfx, a, b - a, { duty: 0.125, f: (u) => 260 * Math.pow(0.25, u), v: env(0.1, 0.15), gain: 0.01 });
  let lastK = 0; for (let t = a; t < b; t += 1 / 120) { const z = CAB[cabIndex(pulseX(t))].z, k = Math.floor(-z / 31); if (k > lastK && k <= 4) { lastK = k; tone(sfx, t, 0.5, { wave: "tri", f: () => n("E6"), v: (u) => Math.pow(1 - u, 2), gain: 0.05 }); tone(sfx, t + 0.22, 0.35, { wave: "tri", f: () => n("E6"), v: (u) => 0.4 * Math.pow(1 - u, 2), gain: 0.04 }); } } }

// 4. macro: in, hose = cable, the cut, the fibre, data flashes, out
sweep(EV.macroIn[0], EV.macroIn[1], true, 0.8);
blip(EV.garden, "C6", 0.05, 0.03, 0.25); seq(EV.hose, ["G5", "G5"], 0.09, { gain: 0.03, dur: 0.06 });
tone(sfx, EV.inside - 0.2, 0.18, { wave: "tri", f: (u) => 160 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.08 }); noise(EV.inside - 0.2, 0.1, () => 2000, (u) => 1 - u, 0.03);
for (let i = 0; i < 4; i++) blip(EV.inside + 0.05 + i * 0.16, ["C6", "E6", "G6", "C7"][i], 0.04, 0.022, 0.125);
sweep(EV.threads - 0.3, EV.threads + 0.15, true, 0.6);
blip(EV.hair, "A5", 0.06, 0.03, 0.25);
{ const BITS = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0], per = 30 / 520, a = EV.flashes, b = EV.lightEnd + 0.2; for (let t = a, i = 0; t < b; t += per, i++) if (BITS[i % 20]) blip(t, i % 3 ? "E7" : "B6", 0.025, 0.014, 0.125); }
sweep(EV.macroOut[0], EV.macroOut[1], false, 0.8);

// 5. repeater: a fading hum as the light weakens, a power-up when it is boosted; electric crackle for the power
tone(sfx, EV.every + 0.4, EV.boosts - EV.every - 0.4, { duty: 0.25, f: () => n("A5"), v: (u) => (1 - 0.7 * u) * env(0.1, 0.05)(u), gain: 0.012 });
blip(EV.repeater, "E6", 0.05, 0.03, 0.25);
seq(EV.boosts, ["C5", "E5", "G5", "C6", "E6"], 0.06, { gain: 0.035, duty: 0.25, dur: 0.12 });
{ const a = EV.thousands - 0.1, b = EV.sharks - 0.2; tone(sfx, a, b - a, { duty: 0.5, f: () => 120, v: env(0.1, 0.2), gain: 0.012 }); for (let t = a; t < b - 0.05; t += 0.05 + rnd(t * 100) * 0.12) noise(t, 0.03, () => 9000, (u) => 1 - u, 0.03); }

// 6. dangers: shark rumble + bite; anchor chain for the whole fall, impact, drag scrape; trawl net scrape
sweep(EV.sharks - 0.45, EV.sharks + 0.45, false, 0.5);
tone(sfx, EV.sharks - 0.35, EV.bitten + 0.35 - EV.sharks, { wave: "tri", f: (u, tt) => 55 * (1 + 0.4 * u) * (1 + 0.05 * Math.sin(tt * 18)), v: env(0.15, 0.1), gain: 0.09 });
noise(EV.bitten, 0.09, () => 2500, (u) => 1 - u, 0.06); tone(sfx, EV.bitten, 0.12, { wave: "tri", f: (u) => 120 * (1 - 0.6 * u), v: (u) => 1 - u, gain: 0.09 }); seq(EV.bitten + 0.12, ["E5", "C5"], 0.08, { gain: 0.025 });
blip(EV.most, "D6", 0.05, 0.03, 0.25);
{ const a = EV.anchors - 0.45, b = EV.anchors + 0.15; for (let t = a; t < b; t += 0.035) noise(t, 0.018, () => 6000 + rnd(t * 999) * 3000, (u) => 1 - u, 0.03); tone(sfx, b, 0.3, { wave: "tri", f: (u) => 90 * (1 - 0.6 * u), v: (u) => 1 - u, gain: 0.12 }); noise(b, 0.25, (u) => 1200 - 800 * u, (u) => 1 - u, 0.05);
  noise(b + 0.05, EV.nets + 0.6 - b - 0.05, (u, tt) => 700 + 200 * Math.sin(tt * 40), env(0.1, 0.2), 0.03); seq(b + 0.25, ["A6", "A6"], 0.1, { gain: 0.03, dur: 0.06, duty: 0.25 }); }
noise(EV.fishing - 0.45, EV.nets + 1.0 - EV.fishing + 0.45, (u, tt) => 400 + 150 * Math.sin(tt * 11), env(0.2, 0.25), 0.022);
blip(EV.anchors, "G5", 0.05, 0.025, 0.25); blip(EV.fishing, "B5", 0.05, 0.025, 0.25);

// 7. the crossing: a running arpeggio for the whole pan, rising as New York gets closer; arrival chime
{ const a = EV.five, b = EV.ashore; swish(a - 0.05, b, 0.014); const notes = ["C5", "E5", "G5", "C6"]; for (let t = a, k = 0; t < b; t += 0.07, k++) { const lift = Math.floor(((t - a) / (b - a)) * 4); blip(t, notes[(k + lift) % 4].replace(/\d/, (d) => String(Number(d) + (lift > 1 ? 1 : 0))), 0.05, 0.022, 0.25); } }
seq(EV.ashore, ["C6", "G6"], 0.07, { gain: 0.035 });
swish(EV.ashore, EV.buzzes - 0.3, 0.012);
hum(EV.ashore + 0.45, EV.buzzes - 0.1, 1100, 0.014);
// 8. the friend's phone buzzes, the friend jumps and waves
seq(EV.buzzes - 0.05, ["E6", "B6"], 0.08, { gain: 0.035 });
for (const t of [EV.buzzes, EV.buzzes + 0.35]) tone(sfx, t, 0.25, { duty: 0.5, f: () => 160, v: (u, tt) => 0.5 + 0.5 * Math.sign(Math.sin(tt * 2 * Math.PI * 25)), gain: 0.03 });
{ const j0 = EV.buzzes + 0.1, j1 = j0 + 0.75; tone(sfx, j0 + 0.1, 0.3, { duty: 0.5, f: (u) => 300 * Math.pow(3, Math.min(1, u * 1.6)) * (u > 0.7 ? 1 - (u - 0.7) : 1), v: (u) => 1 - u * 0.6, gain: 0.035 }); tone(sfx, j1 - 0.05, 0.06, { wave: "tri", f: () => 110, v: (u) => 1 - u, gain: 0.08 }); seq(j1, ["G5", "C6"], 0.09, { gain: 0.03 }); }
// 9. back to the whole ocean, the replay streak with a stopwatch, the < 1/20 s badge
sweep(EV.whole - 0.25, EV.replay[0] - 0.05, false, 0.9);
noise(EV.replay[0], EV.replay[1] - EV.replay[0], (u) => 2000 + 8000 * u, env(0.1, 0.2), 0.03); tone(sfx, EV.replay[0], EV.replay[1] - EV.replay[0], { duty: 0.25, f: (u) => 400 * Math.pow(6, u), v: env(0.1, 0.2), gain: 0.02 });
for (let t = EV.replay[0]; t < EV.replay[1]; t += 0.08) blip(t, "C7", 0.015, 0.014, 0.125);
seq(EV.replay[1], ["C6", "E6", "G6"], 0.06, { gain: 0.035, duty: 0.25 });
// 10. out to the planet: zoom-out for the whole move, a twinkle per cable as they appear, panels, the cloud gag, the sea-floor flash
sweep(EV.more + 0.2, EV.globeIn[1] + 0.3, false, 1);
for (let i = 0; i < 28; i += 2) blip(EV.hundred - 0.3 + i * 0.045, ["C6", "D6", "E6", "G6", "A6", "C7", "D7"][(i / 2) % 7], 0.04, 0.016, 0.125);
blip(EV.hundred, "G5", 0.06, 0.03, 0.25); blip(EV.almost, "E5", 0.06, 0.03, 0.25);
noise(EV.cloud - 0.15, 0.25, (u) => 1200 + 800 * u, (u) => 1 - u, 0.03); tone(sfx, EV.cloud - 0.15, 0.2, { wave: "tri", f: (u) => n("C5") * (1 + 0.3 * u), v: (u) => 1 - u, gain: 0.05 });
tone(sfx, EV.isnt, 0.3, { duty: 0.25, f: (u) => 380 * Math.pow(0.4, u), v: (u) => 1 - u * 0.4, gain: 0.035 });
{ const a = EV.seaFloor - 0.1, b = EV.floorEnd + 0.6; for (let t = a, k = 0; t < b; t += 0.06, k++) blip(t, ["C5", "G5", "C6", "E6", "G6", "C7"][k % 6], 0.08, 0.022 * (1 - (t - a) / (b - a) * 0.6), 0.25); tone(sfx, a, b - a, { wave: "tri", f: () => n("C3"), v: env(0.1, 0.3), gain: 0.06 }); }
// 11. into the outro: sweep for the exact transition, then the pack's click and arpeggio
{ const [a, b] = EV.outroIn; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.03 }); }
function addWav(file, t, gain) {
  const b = fs.readFileSync(file), dv = new DataView(b.buffer, b.byteOffset); let off = 12, data = null, ch = 1, bits = 16;
  while (off < b.length) { const id = b.toString("ascii", off, off + 4), sz = dv.getUint32(off + 4, true); if (id === "fmt ") { ch = dv.getUint16(off + 10, true); bits = dv.getUint16(off + 22, true); } if (id === "data") { data = [off + 8, sz]; break; } off += 8 + sz; }
  const [s, len] = data, frames = len / (bits / 8) / ch, s0 = Math.round(t * SR);
  for (let i = 0; i < frames; i++) { let v = 0; for (let c = 0; c < ch; c++) v += dv.getInt16(s + (i * ch + c) * 2, true) / 32768; if (s0 + i < N) sfx[s0 + i] += (v / ch) * gain; }
}
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/pixel-click.wav", EV.click, 0.55);
addWav("/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/sounds/chiptune-arpeggio.wav", EV.toggle, 0.45);

// ---- chiptune bed at 100 BPM: C – G – Am – F; minor (Am – F – Dm – E) under the dangers; thinned under the macro
const BEAT = 60 / 100, BAR = BEAT * 4, prog = [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]], minor = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]];
const section = (t) => t < EV.oceanEnd ? "intro" : t >= EV.macroIn[1] && t < EV.macroOut[0] ? "soft" : t >= EV.sharks - 0.4 && t < EV.five ? "tense" : t >= EV.outroIn[0] ? "outro" : t >= EV.globeIn[0] ? "wide" : "full";
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + e * BEAT / 2, s = section(t); if (t > END) break; if (s === "outro") continue; const ch = (s === "tense" ? minor : prog)[bar % 4];
    if (s === "soft" && e % 2) continue;
    tone(bed, t, BEAT / 2 * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.4 * u, gain: s === "intro" ? 0.07 : 0.11 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + s16 * BEAT / 4, s = section(t); if (t > END) break; const ch = (s === "tense" ? minor : prog)[bar % 4];
    if (s !== "outro") tone(bed, t, BEAT / 4 * 0.8, { duty: 0.125, f: () => NOTE(ch[s16 % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.6 * u, gain: s === "soft" ? 0.016 : s === "intro" ? 0.022 : 0.03 });
    if (s16 % 4 === 2 && (s === "full" || s === "tense" || s === "wide")) tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.02 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.0) * clamp01((END - t) / 0.8); }
function lowpass(buf, hz) { const a = 1 - Math.exp(-2 * Math.PI * hz / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END);
