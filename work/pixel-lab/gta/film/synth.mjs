// 8-bit sound for «GTA 6: the city behind you»: every cue is synthesised and lasts exactly as long as its motion (same
// timeline as the picture). Not a loop: a neon 80s chiptune bed (Vice City sunset), the city "un-drawing" on "isn't
// there", the camera's turns, logo/quote stingers, the late pop-in glitch on "turn around really fast", the share/follow
// card, and a final chord. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, CAM, VOICE_END, CULL_ON, TURN1, TURN_BACK, TURN2, LAG } from "./timeline.mjs";
import { CUES } from "./cues.mjs";
import { CARD, PLANE, CLICK, BELL } from "./levels/cta.mjs";
import { HOOK_LOGO, QUOTE, ROCK, STATE_LOGO } from "./levels/cards.mjs";
import { SHOW as RADAR } from "./levels/radar.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
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
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const swish = (a, b, gain = 0.012) => noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const bubbles = (a, b, gain = 1, seed = 1) => { for (let t = a, k = 0; t < b - 0.05; k++) { const r = ((Math.sin(k * 91.7 + seed) * 43758.5) % 1 + 1) % 1; tone(sfx, t, 0.06, { wave: "tri", f: (u) => 500 + 900 * r + 600 * u, v: (u) => 1 - u, gain: 0.025 * gain }); t += 0.07 + r * 0.12; } };
export const SFX = { tone: (...a) => tone(sfx, ...a), blip, seq, noise, sweep, swish, bubbles, n, env };

// ---- camera drift and the game camera's turns: a swish for each turn, a quick zip for the fast one
swish(CAM[0].t, CAM[1].t, 0.006);
for (const [a, b] of [TURN1, TURN_BACK]) swish(a, b, 0.012);
tone(sfx, TURN2[0], TURN2[1] - TURN2[0] + 0.05, { duty: 0.25, f: (u) => 500 + 1500 * u, v: (u) => 1 - u * 0.5, gain: 0.014 });
// ---- "most of the city isn't there": the city un-draws — a falling sweep for the whole dissolve
sweep(CULL_ON[0], CULL_ON[1] + 0.1, false, 0.9, 140, 1200);
// ---- the late pop-in after the fast turn: blocky chunks drawing in (glitch ticks over LAG + the catch-up)
for (let t = TURN2[1] + LAG - 0.05, i = 0; t < TURN2[1] + LAG + 0.65; t += 0.05, i++) { if (i % 3 === 2) noise(t, 0.03, () => 3000 + 300 * i, (u) => 1 - u, 0.012); else blip(t, ["C6", "E6", "G6", "B6", "D7"][i % 5], 0.03, 0.01, 0.125); }
// ---- logo and quote stingers: the GTA VI logo (twice), the quote card, OUT OF SIGHT → DELETED, the Rockstar logo
const sting = (t, notes, g = 0.02) => seq(t, notes, 0.07, { gain: g, duty: 0.25 });
sting(HOOK_LOGO[0] + 0.05, ["A4", "C5", "E5", "A5"]); blip(EV.november + 0.05, "E6", 0.06, 0.012, 0.25);
swish(QUOTE[0], QUOTE[0] + 0.35, 0.012); blip(EV.director, "G6", 0.05, 0.012, 0.25);
seq(EV.deleted, ["E5", "C5"], 0.1, { gain: 0.02, duty: 0.5, dur: 0.09 });
sting(ROCK[0] + 0.05, ["C5", "G5", "C6"], 0.022); seq(ROCK[0] + 0.4, ["E7", "G7", "C7"], 0.04, { gain: 0.008, duty: 0.125 });
sting(STATE_LOGO[0] + 0.05, ["A4", "C5", "E5", "A5"]); seq(EV.whole, ["A5", "E6"], 0.08, { gain: 0.014, duty: 0.25 });
// ---- the radar switching on, and its zoom to the whole state
seq(RADAR[0] + 0.05, ["C6", "G6"], 0.05, { gain: 0.012, duty: 0.125 });
sweep(EV.whole - 0.15, EV.whole + 0.35, false, 0.5, 300, 1400); sweep(EV.state + 0.55, EV.so2 + 0.05, true, 0.4, 300, 1400);
// ---- the share/follow card (same as the sister films)
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
blip(EV.send, "C7", 0.025, 0.02, 0.25); noise(PLANE[0], PLANE[1] - PLANE[0], (u) => 1500 + 4000 * u, (u) => Math.sin(Math.PI * u), 0.014);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);
// ---- per-module motion cues (camera cone, pop-ins, cars, people, the console, the hero …)
for (const cue of CUES) cue(SFX);

// ---- neon chiptune bed: Am – F – C – G (Vice City sunset), a pulsing octave bass and a bright arpeggio; "soft" under the
// hook's first words, "full" through the explanation, "light" under the share card, then a final A-minor chord.
const BEAT = 60 / 108, BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const section = (t) => t < EV.november ? "soft" : t < EV.liked - 0.2 ? "full" : t < VOICE_END + 0.05 ? "light" : "mute";
for (let bar = 0; bar * BAR < END; bar++) {
  const t0 = bar * BAR, ch = prog[bar % 4];
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END || s === "mute") continue; if ((s === "soft" || s === "light") && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.85, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END || s === "mute") continue; if ((s === "soft" || s === "light") && s16 % 2) continue;
    const note = ch[s16 % 3] + 24 + (Math.floor(s16 / 4) % 2 ? 12 : 0);
    tone(bed, t, (BEAT / 4) * (s === "full" ? 0.9 : 1.6), { duty: 0.25, f: () => NOTE(note), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.02 : 0.015 });
    if (s16 % 8 === 4 && s === "full") tone(bed, t, 0.07, { wave: "noise", f: () => 2200, v: (u) => 1 - u, gain: 0.022 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.025, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.012 }); }
}
// final chord after the last word (A minor, soft pulse), fading into the end
for (const nn of [57, 60, 64, 69]) tone(bed, VOICE_END + 0.1, END - VOICE_END - 0.15, { duty: 0.25, f: () => NOTE(nn), v: (u) => 1 - u, gain: 0.016 });
// a clean end: everything fades over the last 0.25 s
for (const buf of [sfx, bed]) { const a = Math.round((END - 0.25) * SR), b = Math.round(END * SR); for (let i = a; i < buf.length; i++) buf[i] *= i >= b ? 0 : 1 - (i - a) / (b - a); }
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
