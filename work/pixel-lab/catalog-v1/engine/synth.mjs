// Trial 10 s · sound: everything synthesised on a pulse / triangle / LFSR-noise chip (synth-core.mjs from the xhigh film,
// 60 Hz envelope steps, 16 volume levels). → runs/<run>/audio/bed.wav + sfx.wav (48 kHz stereo 16-bit).
// Bed by backdrop, 96 bpm, 4 bars = exactly 10 s: night-hill = the xhigh spooky bed in A minor (Am | F | Dm E | Am);
// space = an airy C major bed (C | Am | F G | C). A music-box arpeggio plays over the payoff after the last word.
// SFX: one sound per motion from motions.mjs, each exactly t0 → t1 (sound kinds from the xhigh film + new ones).
//   node engine/synth.mjs <run>
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { makeSynth, SR, NOTE, n, env } from "./synth-core.mjs";
import { motions } from "./motions.mjs";

const HERE = fileURLToPath(new URL("..", import.meta.url)), run = process.argv[2], DIR = HERE + "runs/" + run + "/";
const R0 = JSON.parse(fs.readFileSync(DIR + "resolved.json", "utf8")), END = R0.end, N = Math.round(END * SR);
const S = makeSynth(END), tone = S.tone, mono = () => new Float32Array(N + SR);
const bedL = new Float32Array(N), bedR = new Float32Array(N), sfxL = new Float32Array(N), sfxR = new Float32Array(N);
function addPan(src, L, R, pan) { const l = Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, r = Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2; for (let i = 0; i < N; i++) { if (!src[i]) continue; L[i] += src[i] * l; R[i] += src[i] * r; } }
const lastEnd = R0.words.at(-1).end;

// ---------------------------------------------------------------- bed
{
  const BEAT = 60 / 96, BAR = BEAT * 4, space = R0.backdrop === "space";
  const CH = space ? [[0, BAR, [60, 64, 67, 71]], [BAR, 2 * BAR, [57, 60, 64, 67]], [2 * BAR, 2.5 * BAR, [53, 57, 60, 64]], [2.5 * BAR, 3 * BAR, [55, 59, 62, 65]], [3 * BAR, END, [60, 64, 67, 72]]]
    : [[0, BAR, [57, 60, 64]], [BAR, 2 * BAR, [57, 60, 65]], [2 * BAR, 2.5 * BAR, [57, 62, 65]], [2.5 * BAR, 3 * BAR, [56, 59, 64]], [3 * BAR, END, [57, 60, 64]]];
  const organ = mono(), bass = mono(), bell = mono(), box = mono();
  for (const [a, b, notes] of CH) { const dur = b - a;
    notes.forEach((m, k) => tone(organ, a, dur, { duty: space ? 0.125 : k === 2 ? 0.125 : 0.25, f: (u, tt) => NOTE(m) * (1 + (space ? 0.002 : 0.0045) * Math.sin(2 * Math.PI * 5.2 * tt + k)), v: (u, tt) => Math.min(1, tt / (space ? 0.25 : 0.08), (dur - tt) / 0.1) * (0.75 + 0.25 * Math.sin(2 * Math.PI * 0.8 * tt + k)), gain: space ? 0.008 : 0.011 })); }
  const roots = space ? [[0, 48], [BAR / 2, 55], [BAR, 45], [BAR * 1.5, 52], [2 * BAR, 41], [2.5 * BAR, 43], [3 * BAR, 48]] : [[0, 45], [BAR / 2, 40], [BAR, 41], [BAR * 1.5, 48], [2 * BAR, 38], [2.5 * BAR, 40], [3 * BAR, 45]];
  roots.forEach(([t0, m], i) => tone(bass, t0, i === roots.length - 1 ? 2.3 : 1.2, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.1 }));
  const bells = space ? [[0, [84]], [BAR, [81]], [2 * BAR, [77]], [2.5 * BAR, [79]], [3 * BAR, [84, 91]]] : [[0, [88]], [BAR, [84]], [2 * BAR, [86]], [2.5 * BAR, [83]], [3 * BAR, [93, 88]]];
  for (const [t0, ms] of bells) for (const m of ms) tone(bell, t0, 1.3, { duty: 0.125, f: () => NOTE(m), v: (u) => Math.pow(1 - u, 2.2), gain: 0.017 });
  if (space) for (let i = 0; i < 24; i++) { const t0 = i * BEAT / 2, ch = CH.find(([a, b]) => t0 >= a && t0 < b)[2]; tone(bell, t0, 0.18, { duty: 0.125, f: () => NOTE(ch[i % ch.length] + 24), v: (u) => 1 - u, gain: 0.006 }); }
  // music box over the payoff: from just after the last word to the end, the last note rings out
  const arp = space ? [84, 88, 91, 96, 91, 88, 84] : [81, 84, 88, 93, 88, 84, 81], t0a = Math.min(END - 1.6, lastEnd + 0.05), step = (END - 0.4 - t0a) / arp.length;
  arp.forEach((m, i) => { const t0 = t0a + i * step, d = i === arp.length - 1 ? END - t0 : step * 0.97; tone(box, t0, d, { duty: 0.25, f: () => NOTE(m), v: (u) => Math.pow(1 - u, 1.4), gain: 0.024 }); });
  addPan(organ, bedL, bedR, 0); addPan(bass, bedL, bedR, 0); addPan(bell, bedL, bedR, 0.15); addPan(box, bedL, bedR, -0.1);
}

// ---------------------------------------------------------------- sound effects: one per motion, each exactly t0 → t1
const MOT = motions(R0);
const TRIM_DB = { carve: 6, whoosh: 3, scan: 6, sparkle: 4, rise: 4, lock: 4, blink: 5, swish: 4, tick: 6, count: 6, ding: 3, blip: 3, glow: 3, zap: 5, swell: 3, fold: 3, wink: 4, creak: 3, appear: 4, flutter: 4, sonar: 4, dim: 3, whirr: 4, boo: 3, thump: 2 };
let popN = 0;
for (const m of MOT) {
  const a = m.t0, d = m.t1 - m.t0, b = mono();
  switch (m.kind) {
    case "fall": tone(b, a, d, { duty: 0.25, f: (u) => 1150 * Math.pow(0.4, u), v: (u) => 0.35 + 0.65 * u, gain: 0.016 }); break;
    case "thud": tone(b, a, d, { wave: "tri", f: (u) => 150 * Math.pow(0.3, u), v: (u) => Math.pow(1 - u, 1.3), gain: 0.24 }); tone(b, a, d * 0.6, { wave: "noise", f: (u) => 1400 - 1000 * u, v: (u) => Math.pow(1 - u, 2), gain: 0.07 }); break;
    case "pop": { const base = popN++ % 2 ? 460 : 340; tone(b, a, d, { duty: 0.5, f: (u) => base * (1 + 1.6 * u), v: (u) => 1 - 0.55 * u, gain: 0.04 }); tone(b, a, 0.035, { wave: "noise", f: () => 6000, v: (u) => 1 - u, gain: 0.05 }); break; }
    case "carve": tone(b, a, d, { wave: "noise", f: (u) => 1800 + 4200 * u, v: (u) => 0.55 + 0.45 * Math.pow(Math.sin(Math.PI * u * 5), 2), gain: 0.026 }); tone(b, a, d, { duty: 0.125, f: (u) => 220 + 320 * u, v: () => 0.6, gain: 0.01 }); break;
    case "whoosh": tone(b, a, d, { wave: "noise", f: (u) => 1200 + 3200 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.011 }); break;
    case "scan": tone(b, a, d, { duty: 0.125, f: (u, tt) => (1700 - 800 * u) * (1 + 0.025 * Math.sin(2 * Math.PI * 28 * tt)), v: (u) => Math.sqrt(Math.sin(Math.PI * u)), gain: 0.016 }); break;
    case "sparkle": { const notes = [88, 91, 95, 100, 103, 100, 103, 107], st = d / notes.length; notes.forEach((nn, i) => tone(b, a + i * st, st * 0.9, { duty: 0.25, f: () => NOTE(nn), v: (u) => 1 - u, gain: 0.012 * (0.6 + 0.4 * Math.sin((Math.PI * (i + 0.5)) / notes.length)) })); break; }
    case "rise": tone(b, a, d, { wave: "tri", f: (u) => 300 * Math.pow(4, u), v: env(0.3, 0.05), gain: 0.035 }); tone(b, a, d, { duty: 0.25, f: (u) => 600 * Math.pow(4, u), v: env(0.3, 0.05), gain: 0.007 }); break;
    case "lock": for (const nn of [81, 88]) tone(b, a, d, { duty: 0.25, f: () => NOTE(nn), v: (u) => Math.pow(1 - u, 1.2), gain: 0.026 }); tone(b, a, 0.02, { wave: "noise", f: () => 8000, v: () => 1, gain: 0.04 }); break;
    case "blink": tone(b, a, d, { duty: 0.5, f: (u) => (u < 0.5 ? 760 - 640 * u : 440 + 640 * (u - 0.5)), v: (u) => Math.sin(Math.PI * u), gain: 0.026 }); break;
    case "swish": tone(b, a, d, { wave: "noise", f: (u) => 2200 + 2600 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.01 }); tone(b, a + d * 0.55, d * 0.45, { duty: 0.25, f: () => n("E6"), v: (u) => 1 - u, gain: 0.012 }); break;
    case "tick": case "count": { const k = Math.max(6, Math.round(d * 10)); for (let i = 0; i < k; i++) { const t = a + (i * d) / k; tone(b, t, 0.02, { wave: "noise", f: () => 7000, v: (u) => 1 - u, gain: 0.03 }); tone(b, t, 0.025, { wave: "tri", f: () => (m.kind === "count" ? 900 + 80 * i : 1500 + 45 * i), v: (u) => 1 - u, gain: 0.03 }); } break; }
    case "ding": tone(b, a, d, { duty: 0.125, f: () => n("E6"), v: (u) => Math.pow(1 - u, 1.5), gain: 0.03 }); tone(b, a, d, { wave: "tri", f: () => n("E5"), v: (u) => Math.pow(1 - u, 1.5), gain: 0.05 }); break;
    case "blip": tone(b, a, d / 2, { wave: "tri", f: () => n("C5"), v: (u) => 1 - 0.5 * u, gain: 0.04 }); tone(b, a + d / 2, d / 2, { wave: "tri", f: () => n("G5"), v: (u) => 1 - u, gain: 0.04 }); break;
    case "glow": { const notes = [69, 72, 76, 81, 84]; notes.forEach((nn, i) => { const t0 = a + (i * d) / notes.length, dd = a + d - t0; tone(b, t0, dd, { duty: 0.25, f: () => NOTE(nn), v: (u) => 0.55 + 0.45 * (1 - u), gain: 0.016 }); tone(b, t0, dd, { wave: "tri", f: () => NOTE(nn - 12), v: (u) => 1 - 0.4 * u, gain: 0.03 }); }); break; }
    case "zap": tone(b, a, d, { duty: 0.25, f: (u) => 400 * Math.pow(4, u), v: (u) => 1 - 0.5 * u, gain: 0.018 }); break;
    case "swell": tone(b, a, d, { wave: "tri", f: () => n("A3"), v: (u) => Math.sin(Math.PI * u), gain: 0.07 }); tone(b, a, d, { wave: "noise", f: () => 2600, v: (u) => Math.sin(Math.PI * u) * 0.5, gain: 0.012 }); break;
    case "fold": tone(b, a, d, { wave: "noise", f: (u) => 3000 - 1800 * u, v: (u) => Math.sin(Math.PI * u), gain: 0.008 }); tone(b, a, d / 2, { duty: 0.25, f: () => n("E6"), v: (u) => 1 - u, gain: 0.01 }); tone(b, a + d / 2, d / 2, { duty: 0.25, f: () => n("A5"), v: (u) => 1 - u, gain: 0.01 }); break;
    case "wink": tone(b, a, d, { duty: 0.5, f: (u) => (u < 0.5 ? 560 + 2000 * u : 1560 - 1400 * (u - 0.5)), v: (u) => Math.sin(Math.PI * u), gain: 0.026 }); break;
    case "creak": tone(b, a, d, { duty: 0.5, f: (u, tt) => 80 + 55 * u + 9 * Math.sin(2 * Math.PI * 13 * tt), v: (u) => 0.7 * Math.sin(Math.PI * u), gain: 0.018 }); break;
    // new kinds for the trial catalog
    case "appear": tone(b, a, d, { duty: 0.25, f: (u) => 520 * Math.pow(2, u), v: (u) => Math.sin(Math.PI * Math.min(1, u * 1.4)), gain: 0.014 }); tone(b, a, d, { wave: "noise", f: () => 5000, v: (u) => 0.4 * (1 - u), gain: 0.008 }); break;
    case "flutter": for (let t = a; t < a + d - 0.03; t += 0.075) tone(b, t, 0.05, { wave: "noise", f: () => 1600, v: (u) => 1 - u, gain: 0.03 }); break;
    case "sonar": for (let t = a, i = 0; t < a + d - 0.05; t += 0.28, i++) tone(b, t, Math.min(0.12, a + d - t), { duty: 0.125, f: (u) => 2600 + 600 * u, v: (u) => 1 - u, gain: 0.02 * (1 - 0.1 * i) }); break;
    case "dim": tone(b, a, d, { duty: 0.25, f: (u) => 700 * Math.pow(0.35, u), v: (u) => 1 - u, gain: 0.016 }); tone(b, a, d, { wave: "tri", f: (u) => 350 * Math.pow(0.35, u), v: (u) => 1 - u, gain: 0.03 }); break;
    case "whirr": tone(b, a, d, { duty: 0.5, f: (u, tt) => 180 + 220 * u + 30 * Math.sin(2 * Math.PI * 18 * tt), v: (u) => Math.sin(Math.PI * u), gain: 0.012 }); break;
    case "boo": tone(b, a, d, { duty: 0.5, f: (u, tt) => (260 - 90 * u) * (1 + 0.04 * Math.sin(2 * Math.PI * 7 * tt)), v: (u) => Math.sin(Math.PI * u), gain: 0.03 }); break;
    case "thump": tone(b, a, d, { wave: "tri", f: (u) => 110 * Math.pow(0.5, u), v: (u) => Math.pow(1 - u, 1.5), gain: 0.16 }); break;
    default: throw new Error("no sound for " + m.kind);
  }
  const trim = 10 ** ((TRIM_DB[m.kind] ?? 0) / 20); for (let i = 0; i < b.length; i++) b[i] *= trim;
  addPan(b, sfxL, sfxR, { scan: -0.3, sparkle: -0.1, blip: -0.3, tick: 0.35, count: 0.3, swish: 0.35 }[m.kind] ?? 0);
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
fs.mkdirSync(DIR + "audio", { recursive: true });
fs.writeFileSync(DIR + "motions.json", JSON.stringify(MOT, null, 1));
console.log("bed peak", write(DIR + "audio/bed.wav", bedL, bedR).toFixed(3), "sfx peak", write(DIR + "audio/sfx.wav", sfxL, sfxR).toFixed(3), "motions", MOT.length);
