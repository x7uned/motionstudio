// 8-bit sound for «How Netflix streams»: every cue is synthesised and lasts exactly as long as its
// motion (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, DKEYS } from "./timeline.mjs";

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

// ---- the room: laptop click, spinner ticks for the load, the show's chime; rain on the window under the room scenes
noise(EV.press - 0.02, 0.03, () => 6000, (u) => 1 - u, 0.04); blip(EV.press, "C6", 0.04, 0.03, 0.5);
{ const [a, b] = EV.spinner; for (let t = a + 0.08; t < b - 0.05; t += 0.12) blip(t, "E6", 0.03, 0.012, 0.125); }
seq(EV.showOn, ["C5", "G5", "C6", "E6"], 0.06, { gain: 0.03, duty: 0.25 });
pop(EV.second[0] + 0.1, "G6", "C7");
// camera depth changes: one sweep for every zoom, lasting the zoom (in or out)
for (let i = 0; i + 1 < DKEYS.length; i++) { const [ta, a] = DKEYS[i], [tb, b] = DKEYS[i + 1]; if (a !== b && tb < EV.outroIn[0]) sweep(ta, tb, b < a, 0.9); }
// Netflix logo, 300M homes
seq(EV.logo[0] + 0.05, ["A4", "E5", "A5"], 0.07, { gain: 0.035, duty: 0.5 }); { const [a] = EV.homes; for (let k = 0; k < 10; k++) blip(a + k * 0.09, ["C6", "E6", "G6", "C7"][k % 4], 0.04, 0.012, 0.125); }
// the cloud: menu requests ping back and forth for the request time, AWS logo pop
{ const [a, b] = EV.menuReq; for (let t = a + 0.3; t < b; t += 0.32) blip(t, (Math.round((t - a) / 0.32) % 2) ? "D6" : "A5", 0.05, 0.014, 0.25); } pop(EV.aws, "G5", "D6"); tone(sfx, EV.closer, 0.4, { wave: "tri", f: (u) => 500 - 250 * u, v: (u) => 1 - u, gain: 0.03 });
// servers pop up across the planet (one tick per wave of boxes), the counter, the 100+ TB box
{ const [a, b] = EV.servers; for (let t = a + 0.4, k = 0; t < b; t += 0.11, k++) blip(t, ["C6", "D6", "E6", "G6", "A6"][k % 5], 0.03, 0.011, 0.125); } pop(EV.count, "C6", "C7");
bonk(EV.tb[0] + 0.05, 0.6); seq(EV.tb[0] + 0.12, ["E5", "B5"], 0.06, { gain: 0.03, duty: 0.25 });
// the nightly fill: a calm rising download hum for the fill window, ticks as boxes fill
tone(sfx, EV.fill[0], EV.fill[1] - EV.fill[0], { wave: "tri", f: (u, tt) => 180 + 120 * u + 6 * Math.sin(tt * 9), v: env(0.15, 0.15), gain: 0.04 });
for (let t = EV.download, k = 0; t < EV.fill[1] - 0.2; t += 0.25, k++) blip(t, ["G5", "B5", "D6"][k % 3], 0.04, 0.012, 0.125);
// London: the pin, chunks streaming down the street, "a few km", California struck out, BUSY, the switch to Amsterdam
pop(EV.londonPin + 0.2, "E5", "B5");
{ const [a, b] = EV.chunks1; for (let t = a; t < b; t += 0.2) blip(t, "A6", 0.025, 0.01, 0.125); }
seq(EV.km, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25 }); nope(EV.california + 0.05);
{ const [a] = [EV.busy]; for (let k = 0; k < 4; k++) blip(a + k * 0.14, "E5", 0.07, 0.03, 0.5); }
tone(sfx, EV.switch[0], EV.switch[1] - EV.switch[0], { duty: 0.25, f: (u) => 300 * Math.pow(2.5, u), v: env(0.1, 0.15), gain: 0.02 }); pop(EV.amsterdam, "D6", "A6");
// versions: ONE FILE? struck, titles fill, every chip row ticks in, the file counter rolls for the count
pop(EV.oneFile[0]); nope(EV.oneFile[0] + 0.5);
{ const a = EV.nine - 0.3; for (let k = 0; k < 45; k += 3) blip(a + k * 0.03, ["C6", "E6", "G6"][(k / 3) % 3], 0.03, 0.01, 0.125); }
for (const [t0, notes] of [[EV.sizes, ["C5", "E5", "G5", "C6"]], [EV.codecs, ["D5", "F5", "A5", "D6"]], [EV.audio, ["E5", "G5", "B5", "E6", "G6", "B6"]], [EV.subs, ["G5", "B5", "D6", "G6"]]]) seq(t0, notes, 0.07, { gain: 0.022, duty: 0.25 });
{ const a = EV.stranger[0] + 0.6, b = EV.tenK + 0.3; for (let t = a; t < b; t += 0.045) blip(t, "B6", 0.02, 0.008, 0.125); seq(b, ["C6", "E6", "G6", "C7"], 0.05, { gain: 0.035, duty: 0.25 }); }
// chunks into the laptop: one blip per chunk (higher as quality rises), the picks, the sharpening sweep
for (let k = 0; k < 14; k++) { const t0 = EV.chunks[0] - 0.2 + k * 0.42 + 1.1; if (t0 > EV.sharpen[1]) break; const lvl = t0 - 1.1 < EV.picks ? 1 : t0 - 1.1 < EV.fit ? 2 : t0 - 1.1 < EV.sharpen[0] ? 3 : 4; blip(t0, ["C5", "E5", "G5", "C6", "E6"][lvl], 0.05, 0.02, 0.25); }
pop(EV.picks, "G5", "C6"); tone(sfx, EV.sharpen[0], EV.sharpen[1] - EV.sharpen[0] - 0.3, { duty: 0.125, f: (u) => 400 * Math.pow(3, u), v: env(0.1, 0.15), gain: 0.018 }); seq(EV.sharpen[1] - 0.25, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25 });
// the share of the internet: traffic shimmer while the planet glows, the 15 % chord
{ const [a, b] = EV.traffic; noise(a, b - a, () => 7000, (u, tt) => env(0.2, 0.2)(u) * (0.5 + 0.5 * Math.sin(tt * 13)), 0.008); } seq(EV.fifteen, ["A4", "C5", "E5", "A5"], 0.04, { gain: 0.035, dur: 0.3, duty: 0.25 });
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

// ---- chiptune bed: Am – F – C – G at 100 BPM; soft in the bedroom, full on the planet, sparse under the versions board
const BEAT = 60 / 100, BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const section = (t) => (t >= EV.outroIn[0] ? "outro" : t < EV.logo[0] || (t > EV.chunks[0] - 0.5 && t < EV.traffic[0]) ? "soft" : t > EV.oneFile[0] && t < EV.stranger[0] ? "sparse" : "full");
for (let bar = 0; bar * BAR < END + BAR; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t > END) break; if (s === "outro") continue; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t > END) break; if (s === "outro") continue; if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.026 : 0.02 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.016 }); }
}
for (let i = 0; i < N; i++) { const t = i / SR; bed[i] *= Math.min(1, t / 1.2) * clamp01((END - t) / 0.8); }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END);
