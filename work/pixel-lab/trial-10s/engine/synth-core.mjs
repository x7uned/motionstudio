// 8-bit synthesis core for the 2026-10-24 pixel films (frozen copy per film as ./synth-core.mjs).
// Everything is synthesised (pulse / triangle / LFSR noise), quantised to 60 Hz envelope steps like an old sound chip.
// makeSynth(END) → { sfx, bed, tone, blip, seq, noise, sweep, swish, bubbles, shutter, n, NOTE, env, SFX, bedTrack, ctaSounds, finish, write }
import fs from "node:fs";

export const SR = 48000;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
export const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
export const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);

export function makeSynth(END) {
  const N = Math.ceil(END * SR) + SR, sfx = new Float32Array(N), bed = new Float32Array(N);
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
  const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
  const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
  const swish = (a, b, gain = 0.012) => noise(a, b - a, (u) => 2200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
  const bubbles = (a, b, gain = 1, seed = 1) => { for (let t = a, k = 0; t < b - 0.05; k++) { const r = ((Math.sin(k * 91.7 + seed) * 43758.5) % 1 + 1) % 1; tone(sfx, t, 0.06, { wave: "tri", f: (u) => 500 + 900 * r + 600 * u, v: (u) => 1 - u, gain: 0.025 * gain }); t += 0.07 + r * 0.12; } };
  /** A chip-tune camera shutter: two short noise clacks ~60 ms apart (curtain + return) and a tiny high tick. */
  const shutter = (t, gain = 1) => { noise(t, 0.035, () => 6000, (u) => 1 - u, 0.05 * gain); tone(sfx, t, 0.03, { wave: "tri", f: () => 1800, v: (u) => 1 - u, gain: 0.02 * gain }); noise(t + 0.06, 0.05, () => 3800, (u) => 1 - u, 0.04 * gain); };
  const SFX = { tone: (...a) => tone(sfx, ...a), blip, seq, noise, sweep, swish, bubbles, shutter, n, env };

  /**
   * Chiptune bed: prog = [[root, third, fifth] midi …] per bar (cycled), bpm, section(t) → "soft" | "full" | "tension" | "light" | "mute",
   * style { bass: "octave" | "walk", arp: duty, arpOct, hats, kick, gain }. Tension bars can override the chord via tensionProg.
   */
  function bedTrack({ prog, bpm, section, style = {}, tensionProg = null, from = 0, to = END }) {
    const BEAT = 60 / bpm, BAR = BEAT * 4, g = style.gain ?? 1;
    for (let bar = 0; bar * BAR < to; bar++) {
      const t0 = bar * BAR; if (t0 + BAR < from) continue;
      const s0 = section(t0), ch = s0 === "tension" && tensionProg ? tensionProg[bar % tensionProg.length] : prog[bar % prog.length];
      for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= to || t < from || s === "mute") continue; if ((s === "soft" || s === "light") && e % 2) continue;
        const walk = style.bass === "walk" ? [0, 0, 7, 7, 12, 12, 7, 5][e] : e % 2 ? 12 : 0;
        tone(bed, t, (s === "soft" || s === "light" ? BEAT : BEAT / 2) * 0.85, { wave: "tri", f: () => NOTE(ch[0] - 12 + walk), v: (u) => 1 - 0.5 * u, gain: (s === "full" || s === "tension" ? 0.1 : 0.07) * g }); }
      for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= to || t < from || s === "mute") continue; if ((s === "soft" || s === "light") && s16 % 2) continue;
        const note = ch[s16 % 3] + 12 * (style.arpOct ?? 2) + (Math.floor(s16 / 4) % 2 ? 12 : 0);
        tone(bed, t, (BEAT / 4) * (s === "full" || s === "tension" ? 0.9 : 1.6), { duty: style.arp ?? 0.25, f: () => NOTE(note), v: (u) => 1 - 0.7 * u, gain: (s === "full" ? 0.02 : s === "tension" ? 0.022 : 0.015) * g });
        if ((style.kick ?? true) && s16 % 8 === 4 && (s === "full" || s === "tension")) tone(bed, t, 0.07, { wave: "noise", f: () => 2200, v: (u) => 1 - u, gain: 0.022 * g });
        if ((style.hats ?? true) && (s16 % 4 === 2 || (s === "tension" && s16 % 2 === 1)) && (s === "full" || s === "tension")) tone(bed, t, 0.025, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.012 * g }); }
    }
    return { BEAT, BAR };
  }
  /** The share/follow card sounds, same as the sister films (CARD.in, PLANE, CLICK, BELL from levels/cta.mjs; EV.send). */
  function ctaSounds({ CARD, PLANE, CLICK, BELL }, EV) {
    swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
    blip(EV.send, "C7", 0.025, 0.02, 0.25); noise(PLANE[0], PLANE[1] - PLANE[0], (u) => 1500 + 4000 * u, (u) => Math.sin(Math.PI * u), 0.014);
    blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
    for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);
  }
  /** Final soft chord after the last word, then a clean fade over the last 0.25 s, low-pass like the earlier films. */
  function finish(VOICE_END, chord) {
    for (const nn of chord) tone(bed, VOICE_END + 0.1, END - VOICE_END - 0.15, { duty: 0.25, f: () => NOTE(nn), v: (u) => 1 - u, gain: 0.016 });
    for (const buf of [sfx, bed]) { const a = Math.round((END - 0.25) * SR), b = Math.round(END * SR); for (let i = a; i < buf.length; i++) buf[i] *= i >= b ? 0 : 1 - (i - a) / (b - a); }
    const lowpass = (buf, hz) => { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } };
    lowpass(sfx, 9000); lowpass(bed, 7000);
  }
  function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
  function write(dir) { fs.mkdirSync(dir, { recursive: true }); writeWav(dir + "sfx.wav", sfx); writeWav(dir + "bed.wav", bed); let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); return pk; }
  return { sfx, bed, tone, blip, seq, noise, sweep, swish, bubbles, shutter, SFX, bedTrack, ctaSounds, finish, write };
}
