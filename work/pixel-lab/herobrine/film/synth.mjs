// 8-bit sound for «Herobrine was never in the game»: every cue is synthesised (no sounds from the game) and lasts as long
// as its motion: wind in the fog (whenever the fog view is on), footsteps of each walk, an eerie tone while the figure
// fades in, a sting on the eyes, the lens zoom, the figure's steps running away, cards, "DELETED" stamps, the message
// ping and the "STOP." hit (as long as the shake), the stream's LIVE beep, the scream, the static, the walls dissolving,
// the typed "Removed Herobrine" lines. Loop film: the bed fills whole bars, wind runs through the seam, nothing fades.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { VIEW, isoAmount, figure } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  if (dur <= 0) return; const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
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
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.024) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.014 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.032 * gain }); };
const swish = (a, b, gain = 0.012) => { if (b > a) noise(a, b - a, (u) => 2500 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain); };
const thud = (t, g = 1) => { tone(sfx, t, 0.35, { wave: "tri", f: (u) => 90 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.12 * g }); noise(t, 0.12, () => 900, (u) => 1 - u, 0.03 * g); };
const step = (t, g = 1) => { noise(t, 0.05, () => 1100, (u) => 1 - u, 0.016 * g); tone(sfx, t, 0.05, { wave: "tri", f: (u) => 130 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.03 * g }); };

// ---------------------------------------------------------------- wind in the fog: whenever the first-person view shows (through the seam)
{ const a0 = Math.round(0 * SR); let ph = 0, lfsr = 1, nz = 0, lp = 0;
  for (let i = 0; i < N; i++) { const t = i / SR, k = 1 - isoAmount(t); if (k <= 0.001) continue;
    const gust = 0.6 + 0.4 * Math.sin((2 * Math.PI * 5 * t) / END) * Math.sin((2 * Math.PI * 3 * t) / END + 1);
    ph += (380 + 260 * gust) / SR; if (ph >= 1) { ph -= 1; const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; }
    lp += 0.08 * (nz - lp); sfx[(a0 + i) % N] += lp * 0.05 * gust * k; } }

// ---------------------------------------------------------------- the hook: the count, "never"
thud(EV.thirty - 0.03, 1); seq(EV.thirty, ["A3", "C4", "E4"], 0.0, { gain: 0.02, dur: 0.6 });
tone(sfx, EV.never - 0.05, 0.8, { wave: "tri", f: (u) => n("E5") * Math.pow(0.5, u), v: env(0.05, 0.6), gain: 0.04 });   // the figure is gone
pop(EV.never, "E5", "A4", 0.02);
// ---------------------------------------------------------------- the story card
swish(EV.in2010 - 0.12, EV.in2010 + 0.3, 0.014); pop(EV.in2010, "A5", "E6");
for (let k = 0; k < 6; k++) blip(EV.story + k * 0.09, 84 + (k % 3) * 2, 0.03, 0.008, 0.125);
// ---------------------------------------------------------------- walking in the fog (steps as long as each walk), the figure fades in
const walkSteps = (a, b) => { for (let t = a + 0.12; t < b - 0.1; t += 0.36) step(t, 0.9); };
walkSteps(EV.alone - 0.4, EV.fog1End - 0.1); walkSteps(EV.walked - 0.1, EV.fog2 + 0.1);
tone(sfx, EV.stood - 0.3, 1.2, { wave: "tri", f: (u, tt) => n("E6") + 6 * Math.sin(tt * 30), v: env(0.5, 0.4), gain: 0.03 });          // eerie tone while he appears
tone(sfx, EV.stood - 0.3, 1.2, { duty: 0.125, f: (u, tt) => n("F6") + 4 * Math.sin(tt * 24), v: env(0.5, 0.4), gain: 0.008 });
sweep(EV.normal - 0.3, EV.eyes + 0.1, true, 0.5, 120, 420);                                                   // the long lens (as long as the zoom)
seq(EV.white, ["B6", "C7"], 0.0, { gain: 0.02, dur: 0.5, duty: 0.25 }); tone(sfx, EV.white, 0.9, { wave: "tri", f: () => n("B5"), v: env(0.02, 0.8), gain: 0.04 });   // the eyes sting
sweep(EV.when - 0.05, EV.walked + 0.45, false, 0.4, 120, 420);
{ const f0 = EV.ran; for (let k = 0; k < 7; k++) { const t = f0 + 0.15 + k * 0.17; step(t, 0.7 * (1 - k / 7)); } tone(sfx, EV.ran, 1.2, { wave: "tri", f: (u) => n("A4") * Math.pow(0.7, u), v: env(0.05, 0.9), gain: 0.03 }); }
// ---------------------------------------------------------------- deleted posts, the message, STOP.
for (let k = 0; k < 3; k++) { const tk = EV.posts + k * 0.5; thud(tk, 0.5); blip(tk, "D4", 0.12, 0.02, 0.5); swish(tk + 0.35, tk + 0.8, 0.008); }
seq(EV.message, ["E6", "B6"], 0.09, { gain: 0.03, duty: 0.25 });                                              // the message ping
tone(sfx, EV.hb3 - 0.05, 0.9, { wave: "tri", f: () => n("D3"), v: env(0.1, 0.6), gain: 0.06 });
thud(EV.stop - 0.03, 1.6); noise(EV.stop - 0.03, 0.6, (u) => 2200 * Math.pow(0.3, u), (u) => Math.exp(-u * 4), 0.05);     // as long as the shake
seq(EV.stop, ["A3", "D#4", "A4"], 0.0, { gain: 0.03, dur: 0.7, duty: 0.5 });
// ---------------------------------------------------------------- to the iso world; the signs
sweep(VIEW.toIso[0], VIEW.toIso[1] + 0.3, true, 0.6, 150, 600); swish(VIEW.toIso[0], VIEW.toIso[1] + 0.2);
pop(EV.listed - 0.05, "E5", "B5");
tone(sfx, EV.twobytwo - 0.05, 0.5, { wave: "tri", f: (u) => 160 + 20 * Math.sin(u * 30), v: env(0.05, 0.4), gain: 0.05 }); blip(EV.twobytwo + 0.15, "E5", 0.2, 0.015, 0.5);   // a hollow tunnel echo
noise(EV.sand - 0.05, 0.45, (u) => 1600 - 900 * u, env(0.1, 0.5), 0.016); blip(EV.sand, "G5", 0.12, 0.018, 0.25);                // water
tone(sfx, EV.trees - 0.05, 0.6, { duty: 0.25, f: (u) => 300 - 120 * u + 30 * Math.sin(u * 60), v: env(0.1, 0.5), gain: 0.015 });  // a creak
// ---------------------------------------------------------------- the stream
seq(EV.that - 0.05, ["C6", "C6"], 0.12, { gain: 0.025, duty: 0.25, dur: 0.06 });                             // LIVE
{ const a = EV.screamed - 0.05, b = EV.ended + 0.3; tone(sfx, a, b - a, { duty: 0.5, f: (u, tt) => 900 - 500 * u + 120 * Math.sin(tt * 60), v: env(0.03, 0.2), gain: 0.03 }); noise(a, b - a, () => 3500, env(0.03, 0.2), 0.02); }
{ const a = EV.ended + 0.1, b = EV.streamEnd + 0.05; noise(a, b - a, () => 9000, env(0.05, 0.2), 0.02); blip(a, "C4", 0.15, 0.02, 0.5); }   // static while OFFLINE shows
// ---------------------------------------------------------------- staged: stamp, walls dissolving (as long as they go), the picture
thud(EV.staged - 0.03, 1.2); noise(EV.staged - 0.05, 0.65, (u) => 800 + 600 * u, env(0.1, 0.3), 0.02);
pop(EV.picture - 0.05, "A5", "E6");
// ---------------------------------------------------------------- the dead brother, Notch's answer
tone(sfx, EV.story3, 1.6, { wave: "tri", f: () => n("D3"), v: env(0.4, 0.6), gain: 0.05 }); blip(EV.brother + 0.2, "F5", 0.25, 0.015, 0.25);
for (const [ev, nn] of [[EV.notch2 + 0.1, "C6"], [EV.no, "D6"], [EV.never2 - 0.4, "E6"], [EV.never2 - 0.1, "G6"]]) blip(ev, nn, 0.05, 0.012, 0.25);
thud(EV.never2, 1.1);
// ---------------------------------------------------------------- Mojang: the joke (a little "ba-dum"); the update notes typed in
pop(EV.mojang - 0.05, "C6", "E6"); seq(EV.joke, ["G5", "C6", "E6", "G6"], 0.07, { gain: 0.025, duty: 0.25 }); noise(EV.joke + 0.3, 0.12, () => 12000, (u) => 1 - u, 0.02);
const typing = (t0, len) => { for (let k = 0; k < len; k++) { const t = t0 + k / 22; noise(t, 0.02, () => 7000, (u) => 1 - u, 0.01); blip(t, 88 + (k % 4), 0.015, 0.004, 0.125); } };
swish(EV.update - 0.25, EV.update + 0.1, 0.01); typing(EV.removed2, 17);
for (let k = 1; k <= 4; k++) { const at = EV.again - 0.05 + (k - 1) * 0.4; swish(at, at + 0.3, 0.008); typing(at + 0.2, 17); }
seq(EV.fifteen, ["C6", "G6"], 0.08, { gain: 0.025, duty: 0.25 });
swish(EV.march - 0.15, EV.march + 0.15, 0.01); typing(EV.removed3, 22); seq(EV.baby + 0.05, ["E7", "G7"], 0.06, { gain: 0.012, duty: 0.25 });
// ---------------------------------------------------------------- back to the fog: the figure returns (the eerie tone, ending before the seam)
sweep(VIEW.toFp[0], VIEW.toFp[1] + 0.2, false, 0.6, 150, 600);
tone(sfx, EV.whatever - 0.2, 1.4, { wave: "tri", f: (u, tt) => n("E6") + 6 * Math.sin(tt * 30), v: env(0.5, 0.4), gain: 0.028 });

// ---------------------------------------------------------------- bed: A minor, dark and sparse — Am – F – Dm – E, whole bars over the loop
const BARS = Math.max(8, Math.round(END / 3.2)), BAR = END / BARS, BEAT = BAR / 4, prog = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]];
const light = (t) => t > EV.mojang - 0.3 && t < EV.babyEnd;                         // the joke part is a little brighter
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  tone(bed, t0, BAR * 0.98, { wave: "tri", f: () => NOTE(ch[0] - 12), v: (u) => 1 - 0.35 * u, gain: 0.09 });
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2; if (!light(t) && e % 2) continue; tone(bed, t, (BEAT / 2) * 0.9, { duty: 0.125, f: () => NOTE(ch[e % 3] + 12 + (light(t) ? 12 : 0)), v: (u) => 1 - 0.8 * u, gain: light(t) ? 0.016 : 0.012 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 5000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bars", BARS, "BPM", (60 / BEAT).toFixed(1));
