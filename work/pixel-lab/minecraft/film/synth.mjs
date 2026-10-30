// 8-bit sound for «Is a Minecraft world endless?»: every cue is synthesised and lasts exactly as long as its motion
// (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { LOAD, ISO_IN, ZOOM_OUT, ZOOM_IN } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
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
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.018 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.04 * gain }); };
const swish = (a, b, gain = 0.014) => noise(a, b - a, (u) => 2500 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const rumble = (a, b, gain = 0.06, lo = 50, hi = 90) => { tone(sfx, a, b - a, { wave: "tri", f: (u, tt) => lo + (hi - lo) * u + 4 * Math.sin(tt * 40), v: env(0.2, 0.3), gain }); noise(a, b - a, () => 260, env(0.2, 0.3), gain * 0.25); };
const step = (t, g = 1, hz = 900) => { noise(t, 0.05, () => hz, (u) => 1 - u, 0.03 * g); tone(sfx, t, 0.05, { wave: "tri", f: (u) => 120 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.04 * g }); };

// ---- the hook: push into the monitor, footsteps in the tunnel (with an echo), out into the open air
sweep(EV.push[0], EV.push[1], true, 0.6, 140, 640);
for (let t = 0.05, i = 0; t < EV.mouth + 0.5; t += 0.31, i++) { const inside = t < EV.mouth; step(t, inside ? 0.9 : 0.6, inside ? 700 : 1500); if (inside) step(t + 0.11, 0.25, 700); }
noise(EV.mouth - 0.15, EV.most + 0.2 - (EV.mouth - 0.15), (u) => 900 + 700 * Math.sin(Math.PI * u), env(0.35, 0.4), 0.012);              // wind
seq(EV.mouth, ["C5", "E5", "G5", "B5", "E6"], 0.09, { gain: 0.03, duty: 0.25, dur: 0.6 });                                      // the view
// the rise above the world; the void appears
sweep(EV.rise[0], EV.rise[1], true, 0.7, 120, 520); swish(EV.rise[0] + 0.2, EV.rise[1] - 0.1, 0.012);
tone(sfx, EV.exist - 0.1, 1.2, { wave: "tri", f: (u) => 98 - 6 * u, v: env(0.3, 0.4), gain: 0.05 });
pop(EV.exist + 0.05, "E5", "B5", 0.02);

// ---- chunks: one short "build" blip per chunk as it rises (thinned so they never blur), sweeps on the zooms
{ const times = [...LOAD].filter((t) => t > 4.5 && t < EV.how + 0.3).sort((a, b) => a - b); let last = -1, k = 0;
  for (const t of times) { if (t - last < 0.07) continue; last = t; const nn = 72 + [0, 4, 7, 12, 7, 4][k++ % 6]; tone(sfx, t, 0.07, { duty: 0.125, f: (u) => NOTE(nn) * (1 + 0.5 * u), v: (u) => 1 - u, gain: 0.013 }); tone(sfx, t, 0.05, { wave: "tri", f: () => NOTE(nn - 24), v: (u) => 1 - u, gain: 0.03 }); } }
for (let t = EV.run[0] + 0.1; t < EV.run[1] - 0.3; t += 0.12) step(t, 0.35, 1800);
sweep(EV.zoomChunk[0], EV.zoomChunk[1], true, 0.6, 200, 700);
seq(EV.chunks, ["G5", "D6"], 0.08, { gain: 0.03, duty: 0.25 }); seq(EV.sixteen, ["C6", "C6"], 0.12, { gain: 0.025, duty: 0.25, dur: 0.06 });
for (let t = EV.run2[0] + 0.2; t < EV.run2[1] - 0.2; t += 0.12) step(t, 0.35, 1800);
seq(EV.built, ["E6", "G6", "C7"], 0.06, { gain: 0.022, duty: 0.25 });
// the "?" chunk, then the camera glides to the empty area
blip(EV.how, "A5", 0.12, 0.03, 0.25); blip(EV.know, "E6", 0.14, 0.025, 0.25); sweep(EV.arrive + 0.3, EV.seed, false, 0.35, 180, 500);

// ---- seed → noise → land/ocean → flat/rough → hot/cold, wet/dry → deserts, jungles, snow
tone(sfx, EV.everything - 0.1, 0.8, { duty: 0.25, f: (u) => 1400 * Math.pow(0.35, u), v: env(0.1, 0.2), gain: 0.02 });            // the seed falls
tone(sfx, EV.everything + 0.7, 0.12, { wave: "tri", f: (u) => 220 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.09 }); noise(EV.everything + 0.7, 0.08, () => 3000, (u) => 1 - u, 0.025);
for (let i = 0; i < 10; i++) blip(EV.number + i * 0.035, 84 + ((i * 5) % 12), 0.03, 0.012, 0.125);                              // the number ticks in
noise(EV.noise - 0.05, EV.land - 0.2 - EV.noise, (u, tt) => 1200 + 1800 * u + 600 * Math.sin(tt * 9), env(0.25, 0.35), 0.016);    // noise: smooth hiss
rumble(EV.land - 0.2, EV.land + 1.0, 0.07, 45, 80);                                                                                // land rises
noise(EV.ocean, 0.5, (u) => 700 - 300 * u, env(0.1, 0.5), 0.022); seq(EV.ocean + 0.1, ["G5", "D6", "A5"], 0.07, { gain: 0.014, duty: 0.5, dur: 0.05 });
rumble(EV.flat - 0.1, EV.flat + 0.8, 0.08, 40, 110);                                                                               // mountains
blip(EV.flat, "C5", 0.12, 0.025, 0.5); blip(EV.rough, "C4", 0.18, 0.03, 0.25);
tone(sfx, EV.hot, 0.35, { wave: "tri", f: (u) => n("E5") * (1 + 0.02 * Math.sin(u * 30)), v: env(0.1, 0.4), gain: 0.05 }); tone(sfx, EV.cold, 0.35, { duty: 0.125, f: () => n("B6"), v: env(0.05, 0.6), gain: 0.02 });
seq(EV.wet, ["D6", "A6"], 0.1, { gain: 0.02, duty: 0.5, dur: 0.04 }); noise(EV.dry, 0.12, () => 6000, (u) => 1 - u, 0.02);
blip(EV.deserts, "E5", 0.2, 0.03, 0.25); blip(EV.jungles, "G5", 0.2, 0.03, 0.25); blip(EV.snow, "C6", 0.3, 0.03, 0.125);

// ---- 3D noise: the cut, every block ticks, stone thuds in, air whooshes out; caves drip; the overhang
sweep(EV.d3 - 0.3, EV.checks + 0.2, true, 0.6, 180, 760); swish(EV.d3 - 0.25, EV.checks - 0.1, 0.016);
for (let t = EV.checks; t < EV.block + 0.25; t += 0.045) blip(t, 90 + (Math.round(t * 97) % 7), 0.02, 0.008, 0.125);
for (let i = 0; i < 6; i++) tone(sfx, EV.above - 0.05 + i * 0.12, 0.09, { wave: "tri", f: (u) => 140 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.07 });
noise(EV.ifNot - 0.05, EV.air + 0.4 - EV.ifNot, (u) => 1500 + 2500 * u, env(0.15, 0.4), 0.016);
seq(EV.caves, ["A6", "E6"], 0.25, { gain: 0.016, duty: 0.5, dur: 0.06 }); seq(EV.caves + 0.12, ["A6", "E6"], 0.25, { gain: 0.006, duty: 0.5, dur: 0.06 });
tone(sfx, EV.hang, 0.6, { duty: 0.25, f: (u) => 90 + 30 * u, v: env(0.1, 0.4), gain: 0.025 });
// ---- grass, trees, ores, villages
noise(EV.grass - 0.1, 0.6, () => 5000, env(0.2, 0.4), 0.01);
for (let i = 0; i < 6; i++) blip(EV.trees + i * 0.1, 67 + i * 2, 0.08, 0.02, 0.25);
for (let i = 0; i < 5; i++) blip(EV.ores + 0.04 + i * 0.07, 96 + [0, 4, 7, 4, 11][i], 0.05, 0.012, 0.125);
for (let i = 0; i < 4; i++) step(EV.villages + i * 0.14, 0.7, 500); seq(EV.villages + 0.6, ["C6", "G5"], 0.2, { gain: 0.02, duty: 0.5, dur: 0.18 });

// ---- the whole world: the big pull-back, the ruler, the wall, Earth ×7, 80 days, the Nether, 1:8
sweep(ZOOM_OUT[0], ZOOM_OUT[1], false, 0.9, 110, 1000); swish(ZOOM_OUT[0], ZOOM_OUT[1], 0.02);
tone(sfx, EV.thirty - 0.1, 1.0, { duty: 0.25, f: (u) => 300 + 500 * u, v: env(0.1, 0.2), gain: 0.012 });
tone(sfx, EV.wall - 0.05, 0.7, { duty: 0.5, f: (u, tt) => 70 + 3 * Math.sin(tt * 260), v: env(0.1, 0.4), gain: 0.03 }); blip(EV.wall, "B5", 0.3, 0.02, 0.125);
pop(EV.seven - 0.6, "E5", "B5", 0.02); for (let i = 0; i < 7; i++) blip(EV.seven - 0.15 + i * 0.12, 72 + [0, 2, 4, 5, 7, 9, 11][i], 0.08, 0.02, 0.25);
for (let t = EV.walking; t < EV.nonstop + 0.3; t += 0.11) step(t, 0.3, 1600);
for (let i = 0; i <= 16; i++) blip(EV.walking + (i / 16) * (EV.nonstop + 0.3 - EV.walking), 84, 0.02, 0.008, 0.125);
tone(sfx, EV.nether - 0.1, 0.6, { duty: 0.5, f: (u, tt) => 160 + 60 * Math.sin(tt * 30) - 60 * u, v: env(0.2, 0.3), gain: 0.03 }); noise(EV.nether - 0.1, 0.6, () => 400, env(0.2, 0.3), 0.012);
for (let t = EV.ten - 0.1; t < EV.ten + 0.5; t += 0.08) step(t, 0.3, 1200);
blip(EV.one2, "C4", 0.25, 0.03, 0.5); for (let i = 0; i < 8; i++) blip(EV.eight - 0.4 + i * 0.05, 84, 0.04, 0.012, 0.25);

// ---- old versions: the ring, the dive into the Far Lands (a glitch where the land falls apart)
tone(sfx, EV.old - 0.1, 0.6, { duty: 0.25, f: (u, tt) => 440 + 40 * Math.sin(tt * 18), v: env(0.1, 0.4), gain: 0.012 });
sweep(ZOOM_IN[0], ZOOM_IN[1], true, 0.8, 120, 900);
for (let i = 0; i < 8; i++) noise(EV.apart + i * 0.06, 0.04, () => 2000 + 3000 * ((i * 7) % 5) / 5, (u) => 1 - u, 0.025);
tone(sfx, EV.apart, 0.4, { duty: 0.5, f: (u) => 300 * Math.pow(0.3, u), v: env(0.05, 0.3), gain: 0.02 });
pop(EV.twelve, "A5", "E6", 0.025);
// ---- the stream: chime, chat pops, the years roll, 14 YEARS
seq(EV.streamer - 0.2, ["E6", "B6"], 0.07, { gain: 0.02, duty: 0.25 });
for (const d of [0, 0.35, 0.7, 1.05, 1.4]) blip(EV.streamer + d, "A6", 0.03, 0.012, 0.125);
for (let i = 0; i < 14; i++) blip(EV.fourteen - 0.05 + i * (0.6 / 14), 79 + (i % 2) * 5, 0.025, 0.01, 0.125);
seq(EV.fourteen + 0.1, ["C6", "E6", "G6"], 0.06, { gain: 0.024, duty: 0.25 });
for (let t = EV.fourteen - 1.6; t < EV.years + 0.4; t += 0.3) step(t, 0.25, 1700);
// ---- send this to the friend: the paper plane whistles for its whole flight; SENT
pop(EV.send - 0.1, "E5", "B5", 0.02);
for (let t = EV.send - 0.4; t < EV.with - 0.1; t += 0.32) step(t, 0.3, 1700);
{ const p0 = EV.friend - 0.1, p1 = EV.world3 + 0.1; noise(p0, p1 - p0, (u) => 1800 + 2500 * Math.sin(Math.PI * u), (u) => 0.4 + 0.6 * Math.sin(Math.PI * u), 0.014);
  tone(sfx, p0, p1 - p0, { wave: "tri", f: (u) => 420 + 320 * Math.sin(Math.PI * u), v: env(0.15, 0.2), gain: 0.02 });
  seq(p1 + 0.05, ["E6", "A6"], 0.08, { gain: 0.03, duty: 0.25 }); }

// ---- chiptune bed: Cmaj7 – Am7 – Fmaj7 – G, 96 BPM; airy in the hook, steady in the explanation, a cadence at the end
const BPM = 96, BEAT = 60 / BPM, BAR = BEAT * 4, prog = [[48, 52, 55, 59], [45, 48, 52, 55], [41, 45, 48, 52], [43, 47, 50, 55]];
const endBar = Math.floor((END - 1.0) / BAR);
const section = (t) => (t < ISO_IN[1] ? "soft" : t > EV.d3 - 0.3 && t < EV.head + 0.2 ? "sparse" : "full");
for (let bar = 0; bar <= endBar; bar++) {
  const ch = bar === endBar ? [48, 52, 55, 60] : prog[bar % 4], t0 = bar * BAR;
  if (bar === endBar) { for (const [i, m] of ch.entries()) tone(bed, t0 + i * 0.04, END - t0 - 0.05, { wave: i ? "pulse" : "tri", duty: 0.25, f: () => NOTE(m + (i ? 12 : -12)), v: (u) => Math.pow(1 - u, 1.3), gain: i ? 0.018 : 0.1 }); break; }
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.09 : 0.065 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (s !== "full" && s16 % 2) continue;
    tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.7), { duty: 0.125, f: () => NOTE(ch[[0, 1, 2, 3, 2, 1][s16 % 6]] + 24), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.02 : 0.016 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.012 });
    if (s16 % 8 === 0 && s === "full") tone(bed, t, 0.06, { wave: "noise", f: () => 600, v: (u) => 1 - u, gain: 0.024 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bars", endBar);
