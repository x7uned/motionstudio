// «Pumpkin face» — sound. Everything synthesised on a pulse / triangle / LFSR-noise chip (synth-core.mjs, 60 Hz envelope
// steps, 16 volume levels). → audio/bed.wav (8-bit spooky bed in A minor) + audio/sfx.wav (one sound per visible motion,
// each lasting exactly its motion, MOTIONS from motions.mjs), 48 kHz stereo 16-bit.
// Bed: 96 bpm, 4 bars = exactly 10 s: Am | F | Dm E | Am. "Organ" pulse chords, slow triangle bass, a bell on each bar,
// the harmonic-minor E (G#) under «lights up», resolution to Am on «pumpkin.», a music-box arpeggio for the payoff.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeSynth, SR, NOTE, n, env } from "./synth-core.mjs";
import { END } from "./timeline.mjs";
import { MOTIONS } from "./motions.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), N = Math.round(END * SR);
const S = makeSynth(END), tone = S.tone;
const bedL = new Float32Array(N), bedR = new Float32Array(N), sfxL = new Float32Array(N), sfxR = new Float32Array(N);
const mono = () => new Float32Array(N + SR);
function addPan(src, L, R, pan) { const l = Math.cos((pan + 1) * Math.PI / 4) * Math.SQRT2, r = Math.sin((pan + 1) * Math.PI / 4) * Math.SQRT2; for (let i = 0; i < N; i++) { if (!src[i]) continue; L[i] += src[i] * l; R[i] += src[i] * r; } }

// ---------------------------------------------------------------- bed
{
  const BEAT = 60 / 96, BAR = BEAT * 4;
  const CH = [[0, BAR, [57, 60, 64], "Am"], [BAR, 2 * BAR, [57, 60, 65], "F"], [2 * BAR, 2.5 * BAR, [57, 62, 65], "Dm"], [2.5 * BAR, 3 * BAR, [56, 59, 64], "E"], [3 * BAR, END, [57, 60, 64], "Am"]];
  const organ = mono(), bass = mono(), bell = mono(), box = mono();
  for (const [a, b, notes, name] of CH) {
    const dur = b - a, tense = name === "E" ? 1.25 : 1;
    notes.forEach((m, k) => tone(organ, a, dur, { duty: k === 2 ? 0.125 : 0.25, f: (u, tt) => NOTE(m) * (1 + 0.0045 * Math.sin(2 * Math.PI * 5.2 * tt + k)), v: (u, tt) => Math.min(1, tt / 0.08, (dur - tt) / 0.1) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 0.8 * tt + k)), gain: 0.011 * tense }));
  }
  // bass: half notes, slow
  for (const [t0, m, d] of [[0, 45, 1.2], [BAR / 2, 40, 1.2], [BAR, 41, 1.2], [BAR * 1.5, 48, 1.2], [2 * BAR, 38, 1.2], [2.5 * BAR, 40, 1.2], [3 * BAR, 45, 2.3]])
    tone(bass, t0, d, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.1 });
  // a bell on each bar start (pulse 12.5 %, fast decay); the resolution bell on «pumpkin.» rings with its fifth
  for (const [t0, ms, g] of [[0, [88], 1], [BAR, [84], 0.8], [2 * BAR, [86], 0.8], [2.5 * BAR, [83], 0.9], [3 * BAR, [93, 88], 1.1]])
    for (const m of ms) tone(bell, t0, 1.3, { duty: 0.125, f: () => NOTE(m), v: (u) => Math.pow(1 - u, 2.2), gain: 0.017 * g });
  // music-box arpeggio over the payoff (from the end of the last word to the end, the last note rings out)
  [81, 84, 88, 93, 88, 84, 81].forEach((m, i) => { const t0 = 8.0 + i * 0.29, d = i === 6 ? END - t0 : 0.28; tone(box, t0, d, { duty: 0.25, f: () => NOTE(m), v: (u) => Math.pow(1 - u, 1.4), gain: 0.024 }); });
  addPan(organ, bedL, bedR, 0); addPan(bass, bedL, bedR, 0); addPan(bell, bedL, bedR, 0.15); addPan(box, bedL, bedR, -0.1);
}

// ---------------------------------------------------------------- sound effects: one per motion, each exactly t0 → t1
const TRIM_DB = { carve: 6, whoosh: 3, scan: 6, sparkle: 4, rise: 4, lock: 4, blink: 5, swish: 4, tick: 6, ding: 3, blip: 3, glow: 3, zap: 5, swell: 3, fold: 3, wink: 4, creak: 3 };
const PAN = { fall: 0.25, thud: 0.25, pop: 0.3, carve: 0.3, whoosh: 0, scan: -0.4, sparkle: -0.1, rise: 0.3, lock: 0.3, blink: 0.3, swish: 0.4, tick: 0.4, ding: 0, blip: -0.4, glow: -0.4, zap: 0, swell: 0.3, fold: 0.4, wink: 0.25, creak: 0.3 };
let popN = 0;
for (const m of MOTIONS) {
  const a = m.t0, d = m.t1 - m.t0, b = mono();
  switch (m.kind) {
    case "fall": tone(b, a, d, { duty: 0.25, f: (u) => 1150 * Math.pow(0.4, u), v: (u) => 0.35 + 0.65 * u, gain: 0.016 }); break;
    case "thud": tone(b, a, d, { wave: "tri", f: (u) => 150 * Math.pow(0.3, u), v: (u) => Math.pow(1 - u, 1.3), gain: 0.24 });
      tone(b, a, d * 0.6, { wave: "noise", f: (u) => 1400 - 1000 * u, v: (u) => Math.pow(1 - u, 2), gain: 0.07 }); break;
    case "pop": { const base = popN++ ? 460 : 340; tone(b, a, d, { duty: 0.5, f: (u) => base * (1 + 1.6 * u), v: (u) => 1 - 0.55 * u, gain: 0.04 });
      tone(b, a, 0.035, { wave: "noise", f: () => 6000, v: (u) => 1 - u, gain: 0.05 }); break; }
    case "carve": tone(b, a, d, { wave: "noise", f: (u) => 1800 + 4200 * u, v: (u) => 0.55 + 0.45 * Math.pow(Math.sin(Math.PI * u * 5), 2), gain: 0.026 });
      tone(b, a, d, { duty: 0.125, f: (u) => 220 + 320 * u, v: () => 0.6, gain: 0.01 }); break;
    case "whoosh": tone(b, a, d, { wave: "noise", f: (u) => 1200 + 3200 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.011 }); break;
    case "scan": tone(b, a, d, { duty: 0.125, f: (u, tt) => (1700 - 800 * u) * (1 + 0.025 * Math.sin(2 * Math.PI * 28 * tt)), v: (u) => Math.sqrt(Math.sin(Math.PI * u)), gain: 0.016 }); break;
    case "sparkle": { const notes = [88, 91, 95, 100, 103, 100, 103, 107], st = d / notes.length; notes.forEach((nn, i) => tone(b, a + i * st, st * 0.9, { duty: 0.25, f: () => NOTE(nn), v: (u) => 1 - u, gain: 0.012 * (0.6 + 0.4 * Math.sin(Math.PI * (i + 0.5) / notes.length)) })); break; }
    case "rise": tone(b, a, d, { wave: "tri", f: (u) => 300 * Math.pow(4, u), v: env(0.3, 0.05), gain: 0.035 }); tone(b, a, d, { duty: 0.25, f: (u) => 600 * Math.pow(4, u), v: env(0.3, 0.05), gain: 0.007 }); break;
    case "lock": for (const nn of [81, 88]) tone(b, a, d, { duty: 0.25, f: () => NOTE(nn), v: (u) => Math.pow(1 - u, 1.2), gain: 0.026 }); tone(b, a, 0.02, { wave: "noise", f: () => 8000, v: () => 1, gain: 0.04 }); break;
    case "blink": tone(b, a, d, { duty: 0.5, f: (u) => (u < 0.5 ? 760 - 640 * u : 440 + 640 * (u - 0.5)), v: (u) => Math.sin(Math.PI * u), gain: 0.026 }); break;
    case "swish": tone(b, a, d, { wave: "noise", f: (u) => 2200 + 2600 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.01 }); tone(b, a + d * 0.55, d * 0.45, { duty: 0.25, f: () => n("E6"), v: (u) => 1 - u, gain: 0.012 }); break;
    case "tick": { const k = 12; for (let i = 0; i < k; i++) { const t = a + (i * d) / k; tone(b, t, 0.02, { wave: "noise", f: () => 7000, v: (u) => 1 - u, gain: 0.03 }); tone(b, t, 0.025, { wave: "tri", f: () => 1500 + 45 * i, v: (u) => 1 - u, gain: 0.03 }); } break; }
    case "ding": tone(b, a, d, { duty: 0.125, f: () => n("E6"), v: (u) => Math.pow(1 - u, 1.5), gain: 0.03 }); tone(b, a, d, { wave: "tri", f: () => n("E5"), v: (u) => Math.pow(1 - u, 1.5), gain: 0.05 }); break;
    case "blip": tone(b, a, d / 2, { wave: "tri", f: () => n("C5"), v: (u) => 1 - 0.5 * u, gain: 0.04 }); tone(b, a + d / 2, d / 2, { wave: "tri", f: () => n("G5"), v: (u) => 1 - u, gain: 0.04 }); break;
    case "glow": { const notes = [69, 72, 76, 81, 84]; notes.forEach((nn, i) => { const t0 = a + (i * d) / notes.length, dd = a + d - t0; tone(b, t0, dd, { duty: 0.25, f: () => NOTE(nn), v: (u) => 0.55 + 0.45 * (1 - u), gain: 0.016 }); tone(b, t0, dd, { wave: "tri", f: () => NOTE(nn - 12), v: (u) => 1 - 0.4 * u, gain: 0.03 }); }); break; }
    case "zap": tone(b, a, d, { duty: 0.25, f: (u) => 400 * Math.pow(4, u), v: (u) => 1 - 0.5 * u, gain: 0.018 }); break;
    case "swell": tone(b, a, d, { wave: "tri", f: () => n("A3"), v: (u) => Math.sin(Math.PI * u), gain: 0.07 }); tone(b, a, d, { wave: "noise", f: () => 2600, v: (u) => Math.sin(Math.PI * u) * 0.5, gain: 0.012 }); break;
    case "fold": tone(b, a, d, { wave: "noise", f: (u) => 3000 - 1800 * u, v: (u) => Math.sin(Math.PI * u), gain: 0.008 }); tone(b, a, d / 2, { duty: 0.25, f: () => n("E6"), v: (u) => 1 - u, gain: 0.01 }); tone(b, a + d / 2, d / 2, { duty: 0.25, f: () => n("A5"), v: (u) => 1 - u, gain: 0.01 }); break;
    case "wink": tone(b, a, d, { duty: 0.5, f: (u) => (u < 0.5 ? 560 + 1000 * u * 2 : 1560 - 700 * (u - 0.5) * 2), v: (u) => Math.sin(Math.PI * u), gain: 0.026 }); break;
    case "creak": tone(b, a, d, { duty: 0.5, f: (u, tt) => 80 + 55 * u + 9 * Math.sin(2 * Math.PI * 13 * tt), v: (u) => 0.7 * Math.sin(Math.PI * u), gain: 0.018 }); break;
    default: throw new Error("no sound for " + m.kind);
  }
  const trim = 10 ** ((TRIM_DB[m.kind] ?? 0) / 20); if (trim !== 1) for (let i = 0; i < b.length; i++) b[i] *= trim;
  addPan(b, sfxL, sfxR, PAN[m.kind] ?? 0);
}

// ---------------------------------------------------------------- end: the bed fades over the last 0.35 s; gentle low-pass like the sister films
for (const buf of [bedL, bedR, sfxL, sfxR]) { const a = Math.round((END - 0.35) * SR); for (let i = a; i < N; i++) buf[i] *= 1 - (i - a) / (N - a); }
const lowpass = (buf, hz) => { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } };
for (const buf of [bedL, bedR]) lowpass(buf, 7000); for (const buf of [sfxL, sfxR]) lowpass(buf, 9000);

function write(file, L, R) {
  const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  let pk = 0; for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i])); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4); }
  fs.writeFileSync(file, out); return pk;
}
fs.mkdirSync(HERE + "audio", { recursive: true });
console.log("bed peak", write(HERE + "audio/bed.wav", bedL, bedR).toFixed(3), "sfx peak", write(HERE + "audio/sfx.wav", sfxL, sfxR).toFixed(3), "motions", MOTIONS.length);
