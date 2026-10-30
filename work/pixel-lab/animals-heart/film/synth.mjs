// Sound for «From the slowest heartbeat to the fastest». The heartbeats ARE the music: every beat in BEATS (the same list
// the picture pulses with) becomes a bass "lub-dub" tuned to the root of the level's chord — big hearts low, small hearts
// high — over a soft 8-bit pad that changes chord per level. Loop film: pad voices are tuned so a whole number of cycles
// fits END and their level is equal at both ends, so the seam has no click. Level/event cues come from cues.mjs.
// Writes audio/sfx.wav (heartbeats + cues) and audio/bed.wav (pad) at 48 kHz mono.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, LV, END, BEATS } from "./timeline.mjs";
import { beat } from "./heartbeat.mjs";
import { CUES } from "./cues.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---- chords per stretch of the film (MIDI roots and triads); heart pitch = chord root, in the animal's register
const A2 = 45, C3 = 48, D3 = 50, E3 = 52, F3 = 53, G3 = 55;
const SECTIONS = [
  [0, LV.whale[1], [A2, C3, E3], "whale"], [LV.groundhog[0], LV.groundhog[1], [D3, F3, A2 + 12], "groundhog"], [LV.turtle[0], LV.turtle[1], [F3, A2 + 12, C3 + 12], "turtle"],
  [LV.elephant[0], LV.human[1], [C3, E3, G3], "elephant"], [LV.cat[0], LV.cat[1], [G3, G3 + 4, D3 + 12], "cat"], [LV.heat[0], LV.heat[1], [E3, G3, G3 + 4], "heat"],
  [LV.rabbit[0], LV.rabbit[1], [C3, E3, G3], "rabbit"], [LV.mouse[0], LV.mouse[1], [D3, F3 + 1, A2 + 12], "mouse"], [LV.hummingbird[0], LV.hummingbird[1], [E3, G3 + 1, E3 + 7], "hummingbird"],
  [LV.shrew[0], LV.shrew[1], [A2 + 12, C3 + 13, E3 + 12], "shrew"], [LV.twist[0], EV.slowElephant, [F3, A2 + 12, C3 + 12], "twist"], [EV.slowElephant, EV.we, [G3, G3 + 4, D3 + 12], "twist2"],
  [EV.we, LV.loop[0] + 0.6, [C3, E3, G3], "twist3"], [LV.loop[0] + 0.6, END + 1, [A2, C3, E3], "loop"],
];
const chordAt = (t) => SECTIONS.find((s) => t >= s[0] && t < s[1]) ?? SECTIONS[0];
// register of each heart: octave offset from the chord root (big hearts lowest)
const REG = { whale: -24, groundhog: -12, turtle: -12, elephant: -12, human: -12, cat: 0, rabbit: 0, mouse: 0, hummingbird: 12, shrew: 12 };

// ---- heartbeats
for (const b of BEATS) {
  const root = chordAt(b.t)[2][0], midi = root + (REG[b.who] ?? -12), f1 = NOTE(midi);
  // heartbeat.mjs sweeps 105 → 50 Hz × pitch; land the end of the sweep on the chord root
  const pitch = f1 / 50, g = 0.36 * b.g * (b.who === "whale" ? 1.35 : 1);
  beat(sfx, b.t, b.bpm, g, { pitch });
  if (b.who === "whale") { // the biggest heart: a long rumble tail and an octave-up body so phones hear it too
    for (let i = 0; i < SR * 1.6; i++) { const k = Math.round(b.t * SR) + i, tt = i / SR, e = Math.exp(-tt * 2.6) * Math.min(1, tt / 0.01);
      if (k < N) sfx[k] += 0.12 * e * (Math.sin(2 * Math.PI * NOTE(midi + 12) * tt) * 0.7 + Math.sin(2 * Math.PI * NOTE(midi + 19) * tt) * 0.3); }
  }
}

// ---- pad: three triangle voices per chord, crossfading over 0.6 s between sections; frequencies nudged so that a whole
// number of cycles fits END (identical phase at t = 0 and t = END); level equal at both ends (no fades at the seam)
function tri(ph) { const p = ph % 1; return p < 0.5 ? 4 * p - 1 : 3 - 4 * p; }
const fit = (f) => Math.round(f * END) / END;
for (let si = 0; si < SECTIONS.length; si++) {
  const [a, b, ch] = SECTIONS[si], a0 = Math.max(0, a - 0.3), b0 = Math.min(END, b + 0.3);
  ch.forEach((m, vi) => { const f = fit(NOTE(m + 12)), f2 = fit(NOTE(m + 24));
    for (let i = Math.floor(a0 * SR); i < Math.ceil(b0 * SR); i++) { const t = i / SR;
      const fin = a <= 0 ? 1 : clamp01((t - (a - 0.3)) / 0.6), fout = b >= END ? 1 : clamp01(((b + 0.3) - t) / 0.6), e = Math.min(fin, fout);
      const lfo = 0.85 + 0.15 * Math.sin(2 * Math.PI * Math.round(END / 6) / END * t + vi);
      const x = Math.round(tri(f * t) * 7.5) / 7.5 * 0.6 + Math.round(tri(f2 * t + 0.25) * 7.5) / 7.5 * 0.25;
      bed[i] += 0.05 * e * lfo * x; } });
}
// sparkle arpeggio in the fast-heart levels (rabbit → shrew): 16ths on the chord, getting busier
for (const [a, b, ch, who] of SECTIONS) {
  const dens = { rabbit: 4, mouse: 6, hummingbird: 8, shrew: 10 }[who]; if (!dens) continue;
  const step = 1 / dens; let k = 0;
  for (let t = a + 0.05; t < b - 0.05; t += step, k++) { const m = ch[k % 3] + 36, f = NOTE(m);
    for (let i = 0; i < SR * step * 0.8; i++) { const j = Math.round(t * SR) + i, tt = i / SR, e = (1 - tt / (step * 0.8)) * Math.min(1, tt / 0.003); if (j < N) bed[j] += 0.012 * e * (((f * tt) % 1) < 0.25 ? 1 : -1); } }
}
// ---- event cues: every level module's motions (pops, tags, splashes, …) as 8-bit sounds lasting their motion
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
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
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const swish = (a, b, gain = 0.012) => noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const bubbles = (a, b, gain = 1, seed = 1) => { for (let t = a, k = 0; t < b - 0.05; k++) { const r = ((Math.sin(k * 91.7 + seed) * 43758.5) % 1 + 1) % 1; tone(sfx, t, 0.06, { wave: "tri", f: (u) => 500 + 900 * r + 600 * u, v: (u) => 1 - u, gain: 0.025 * gain }); t += 0.07 + r * 0.12; } };
const SFX = { tone: (...a) => tone(sfx, ...a), blip, seq, noise, sweep, swish, bubbles, n, env };
for (const cue of CUES) cue(SFX);
// level arrivals: a short soft arpeggio on each new animal's first word
for (const t of [EV.groundhog, EV.turtle, EV.elephant, EV.yours, EV.cat, EV.rabbit, EV.mouse, EV.hummingbird, EV.record]) seq(t - 0.02, ["C5", "E5", "G5", "C6"], 0.055, { gain: 0.022, duty: 0.25 });
// bpm pickups: a sparkle as the number rises
for (const t of [EV.two, EV.eighty, EV.five, EV.eleven, EV.thirty, EV.seventy, EV.hundredThirty, EV.twoHundred, EV.twoFifty, EV.sixHundred, EV.twelve, EV.fifteen]) { seq(t, ["E6", "G6", "B6", "E7"], 0.07, { gain: 0.016, duty: 0.125 }); }

// loop: sound that runs past END (a cue crossing the seam) continues at the start of the film
{ const E = Math.round(END * SR); for (let i = 0; i < SR && E + i < N; i++) { sfx[i] += sfx[E + i]; sfx[E + i] = 0; bed[i] += bed[E + i]; bed[E + i] = 0; } }
// loop-safe one-pole low-pass: the filter state is warmed on the last 0.1 s, so the first sample continues the last one
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR), E = Math.round(END * SR); let y = 0; for (let i = Math.max(0, E - 4800); i < E; i++) y += a * (buf[i] - y); for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 10000); lowpass(bed, 6000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "beats", BEATS.length, "END", END.toFixed(3));
