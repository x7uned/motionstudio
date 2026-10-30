// Bass heartbeat for «From the slowest heartbeat to the fastest»: a "lub-dub" built from a pitch-dropping triangle
// (the body you feel) plus a pulse-wave overtone an octave up (so phone speakers, which cannot play 50 Hz, still
// carry it) and a tiny noise click (the valve). At high rates lub and dub merge into one thump, and well above 600 bpm the
// thumps fuse into a buzzing rattle (≈1,000–1,500 bpm, 16–25 per second) — the heartbeat becomes a bass texture.
export const SR = 48000;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Add one heartbeat at time t (s) for a heart beating at `bpm`, gain g, into buf (Float32Array at SR). */
export function beat(buf, t, bpm, g = 1, { pitch = 1 } = {}) {
  const rr = 60 / bpm;                                   // seconds between beats
  const split = Math.min(0.3, rr * 0.36);                // lub → dub interval shrinks with the rate
  const merge = clamp01((bpm - 160) / 240);             // 0: two sounds · 1: one thump
  const lubDur = Math.min(0.16, rr * 0.55), dubDur = Math.min(0.12, rr * 0.4);
  thump(buf, t, lubDur, 105 * pitch, 50 * pitch, g);
  if (merge < 1) thump(buf, t + split, dubDur, 90 * pitch, 46 * pitch, g * 0.62 * (1 - merge));
}
function thump(buf, t0, dur, f0, f1, g) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, ph2 = 0, lfsr = 1, nz = 1, nph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len, f = f1 + (f0 - f1) * Math.exp(-u * 5);
    ph += f / SR; ph2 += (2 * f) / SR; nph += 3000 / SR;
    const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p, triQ = Math.round(tri * 7.5) / 7.5;      // 4-bit triangle
    const pul = (ph2 % 1) < 0.25 ? 1 : -1;
    if (nph >= 1) { nph -= 1; const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; }
    const env = Math.min(1, i / (0.004 * SR)) * Math.pow(1 - u, 1.6), click = i < 0.01 * SR ? (1 - i / (0.01 * SR)) : 0;
    const k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += g * env * (0.55 * triQ + 0.16 * pul) + g * 0.08 * click * nz;
  }
}
/** Beats at a steady rate between a and b (phase-aligned to `phase0`), returns the beat times. */
export function beats(buf, a, b, bpm, g = 1, phase0 = a, o = {}) {
  const rr = 60 / bpm, out = []; let t = phase0; while (t < a) t += rr;
  for (; t < b; t += rr) { beat(buf, t, bpm, g, o); out.push(t); } return out;
}
