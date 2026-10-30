// «Pumpkin face» sound: everything 8-bit and synthesised (no samples). Two stems at 48 kHz stereo, 16-bit:
//   audio/bed.wav  — the spooky 8-bit bed in A minor (square organ, triangle bass, arpeggio, bell at each chord change)
//   audio/sfx.wav  — one sound per visible motion (MOTIONS in timeline.mjs); each sound lasts exactly its motion.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, MOTIONS } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.ceil(END * SR), TAU = Math.PI * 2;
const bed = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 20261027; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const add = (buf, i, v, pan = 0) => { if (i < 0 || i >= N) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); buf[0][i] += v * l * 1.414; buf[1][i] += v * r * 1.414; };
const sm = (t, a, b) => { const x = Math.max(0, Math.min(1, (t - a) / (b - a))); return x * x * (3 - 2 * x); };
const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
const sq = (p) => (p % 1 < 0.5 ? 1 : -1), tri = (p) => 4 * Math.abs((p % 1) - 0.5) - 1;

// ---------------------------------------------------------------- the bed (A minor: Am – F – Dm – E, 2.5 s each)
const CHORDS = [
  { a: 0, b: 2.5, org: [57, 60, 64], bass: 45, arp: [45, 52, 57, 60] },   // Am  A3 C4 E4 · A2
  { a: 2.5, b: 5, org: [53, 57, 60], bass: 41, arp: [41, 48, 53, 57] },   // F   F3 A3 C4 · F2
  { a: 5, b: 7.5, org: [50, 53, 57], bass: 38, arp: [38, 45, 50, 53] },   // Dm  D3 F3 A3 · D2
  { a: 7.5, b: 10, org: [52, 56, 59], bass: 40, arp: [40, 47, 52, 56] },  // E   E3 G#3 B3 · E2 (the tension before the end)
];
const BELLS = [[0, 81], [2.5, 77], [5, 74], [7.5, 76]];   // A5, F5, D5, E5
{
  let lp0 = 0, lp1 = 0; const a1 = 1 - Math.exp(-TAU * 2600 / SR);
  for (let i = 0; i < N; i++) {
    const t = i / SR; const ch = CHORDS.find((c) => t >= c.a && t < c.b + 0.01) || CHORDS[3];
    const env = sm(t, ch.a, ch.a + 0.15) * (1 - sm(t, ch.b - 0.15, ch.b));
    let organ = 0; for (const m of ch.org) organ += sq(hz(m) * (1 + 0.003 * Math.sin(TAU * 5.2 * t)) * t);
    organ *= 0.028 * env; lp0 += a1 * (organ - lp0);                             // softened square pads
    const k = Math.floor(t * 2) % 4, arpNote = ch.arp[k];                       // 2 notes a second, short decays
    const u = (t * 2) % 1, arp = tri(hz(arpNote) * t) * Math.pow(1 - u, 3) * 0.05 * env * (0.25 + 0.75 * (k % 2 === 0));
    const bass = tri(hz(ch.bass) * t) * 0.12 * env * (0.65 + 0.35 * sq(t * 1));
    lp1 += a1 * (bass - lp1);
    const pad = lp0 + arp + lp1;
    add(bed, i, pad * 0.9, -0.15 + 0.1 * Math.sin(TAU * 0.1 * t));
    add(bed, i, pad * 0.9, 0.15 - 0.1 * Math.sin(TAU * 0.1 * t));
  }
  for (const [t0, m] of BELLS) { const f = hz(m), s0 = Math.round(t0 * SR);
    for (let j = 0; j < 1.6 * SR && s0 + j < N; j++) { const tt = j / SR; const v = (Math.sin(TAU * f * tt) + 0.5 * Math.sin(TAU * f * 2.76 * tt) + 0.25 * Math.sin(TAU * f * 5.4 * tt)) * Math.exp(-tt * 1.8) * 0.06; add(bed, s0 + j, v, 0.25); } }
  for (let i = 0; i < N; i++) { const t = i / SR, f = Math.min(sm(t, 0, 0.4), 1 - sm(t, END - 0.6, END)); bed[0][i] *= f; bed[1][i] *= f; }
}

// ---------------------------------------------------------------- one sound per motion (exact duration, zero at the end)
function sound(m) {
  const t0 = m.t0, dur = m.t1 - m.t0, s0 = Math.round(t0 * SR), n = Math.round(dur * SR), g = m.gain ?? 1;
  const env = (u) => Math.min(1, u / 0.004) * Math.min(1, (1 - u) * 40) ;   // 4 ms attack, 25 ms release to zero at the end
  let lp = 0, lpA = 0;
  switch (m.kind) {
    case "cut": { for (let j = 0; j < n; j++) { const u = j / n, f = 420 - 280 * u; add(sfx, s0 + j, sq(f * (j / SR)) * 0.10 * Math.pow(1 - u, 2) * g, -0.2); lp += 0.25 * (rand() - lp); add(sfx, s0 + j, lp * 0.14 * Math.pow(1 - u, 3) * g, -0.2); } break; }
    case "zip": { for (let j = 0; j < n; j++) { const u = j / n, f = 500 + 900 * u; const trem = sq(40 * (j / SR)) * 0.5 + 0.5; add(sfx, s0 + j, sq(f * (j / SR)) * 0.06 * trem * env(u) * g, 0.15); } break; }
    case "blip": { for (let j = 0; j < n; j++) { const u = j / n, f = u < 0.5 ? 660 : 990, uu = (u % 0.5) * 2; add(sfx, s0 + j, sq(f * (j / SR)) * 0.08 * (1 - uu) * env(u) * g, 0); } break; }
    case "glow": { for (let j = 0; j < n; j++) { const u = j / n, f = 300 + 400 * u; add(sfx, s0 + j, tri(f * (j / SR)) * 0.08 * Math.sin(Math.PI * u) ** 0.7 * env(u) * g, 0); } break; }
    case "chime": { for (let j = 0; j < n; j++) { const u = j / n, tt = j / SR; const v = sq(880 * tt) * 0.5 + sq(1318.5 * tt) * 0.35; add(sfx, s0 + j, v * 0.09 * Math.exp(-u * 6) * env(u) * g, 0.1); } break; }
    case "tick": { for (let j = 0; j < n; j++) { const u = j / n, k = (u * 6) % 1; if (k < 0.25) add(sfx, s0 + j, sq(2000 * (j / SR)) * 0.09 * (1 - k * 4) * env(u) * g, 0); } break; }
    case "rise": { for (let j = 0; j < n; j++) { const u = j / n, f = 400 + 600 * u; add(sfx, s0 + j, Math.sin(TAU * f * (j / SR)) * 0.09 * Math.sin(Math.PI * u) * env(u) * g, 0); } break; }
    case "fall": { for (let j = 0; j < n; j++) { const u = j / n, f = 700 - 500 * u; add(sfx, s0 + j, sq(f * (j / SR)) * 0.08 * (1 - u) * env(u) * g, 0); } break; }
    case "ping": { for (let j = 0; j < n; j++) { const u = j / n, tt = j / SR; const v = Math.sin(TAU * 880 * tt) + 0.3 * Math.sin(TAU * 1760 * tt); add(sfx, s0 + j, v * 0.12 * Math.exp(-u * 4) * env(u) * g, 0); } break; }
    case "whoosh": { for (let j = 0; j < n; j++) { const u = j / n; const a = 1 - Math.exp(-TAU * (800 + 2200 * u) / SR); lpA += a * (rand() - lpA); const hp = rand() - lpA; add(sfx, s0 + j, (hp * 0.6 + lpA * 0.4) * 0.14 * Math.sin(Math.PI * u) ** 0.8 * env(u) * g, -0.3 + 0.6 * u); } break; }
    default: throw new Error("unknown kind " + m.kind);
  }
  void lp;
}
for (const m of MOTIONS) sound(m);

// ---------------------------------------------------------------- write 16-bit stereo
function write(file, buf) {
  const out = Buffer.alloc(44 + N * 4);
  out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  let pk = 0; for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = buf[c][i]; pk = Math.max(pk, Math.abs(v)); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + (i * 2 + c) * 2); }
  fs.writeFileSync(file, out); return pk;
}
fs.mkdirSync(HERE + "audio", { recursive: true });
console.log("bed peak", write(HERE + "audio/bed.wav", bed).toFixed(3), "sfx peak", write(HERE + "audio/sfx.wav", sfx).toFixed(3), "motions", MOTIONS.length);
