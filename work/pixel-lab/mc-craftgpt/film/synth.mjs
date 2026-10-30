// 8-bit sound for «A chatbot built inside Minecraft»: every cue is synthesised (no sounds from the game) and lasts
// exactly as long as its motion, on the same timeline as the picture: key clicks (as long as a key is down), the screen's
// pixel wipes, the tokens printing, the thinking dots, the token running down the dust (as long as it runs), each layer
// working, the embedding panel filling, the picker, the ROM being built, the bits, the tick clock, the waiting, the
// fast-forward, the nonsense, the camera moves. Loop film: the bed fills whole chord cycles with no fades; anything
// crossing the seam folds onto the start. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { PRESSES, KEYS_CAM, J, HALL_T, NONSENSE, camera } from "./scene.mjs";
import { BYTE, bitAt } from "./world.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const put = (buf, k, v) => { k = ((k % N) + N) % N; buf[k] += v; };
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
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
const pop = (t, a = "C6", b = "G6", g = 0.026) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { if (b <= a) return; const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const swish = (a, b, gain = 0.012) => { if (b > a) noise(a, b - a, (u) => 2500 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain); };
const wipe = (t, gain = 0.009) => noise(t, 0.35, (u) => 1800 + 2600 * u, env(0.25, 0.35), gain);      // a screen wipe lasts 0.35 s
const buzz = (a, b, lo, hi, gain = 0.012) => { if (b > a) tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => lo + (hi - lo) * u + 30 * Math.sin(tt * 90), v: env(0.1, 0.15), gain }); };

// ---------------------------------------------------------------- keys: a click for as long as each key is down
for (const p of PRESSES) { const d = p.long ? 0.45 : 0.1; noise(p.t, Math.min(0.05, d), () => 4200, (u) => 1 - u, p.long ? 0.022 : 0.014); tone(sfx, p.t, d, { wave: "tri", f: (u) => (p.long ? 180 : 260 + (p.key.i % 7) * 18) * Math.pow(0.7, u), v: (u) => 1 - u, gain: p.long ? 0.06 : 0.035 }); }
// ---------------------------------------------------------------- the screen: wipes, printed tokens, dots
const CLEAR = EV.so + 0.08;
for (const t of [EV.token1 - 0.05, EV.every, EV.hold - 0.25, EV.once1End + 0.2, NONSENSE, CLEAR, EV.enter, EV.wait]) wipe(t);
for (const t of [EV.then, EV.again1, EV.prints]) { seq(t, ["G5", "C6", "E6"], 0.04, { gain: 0.026, duty: 0.25, dur: 0.1 }); tone(sfx, t, 0.3, { wave: "tri", f: () => n("C5"), v: (u) => 1 - u, gain: 0.04 }); }
for (let t = EV.chatbot1 + 0.3; t < EV.then - 0.3; t += 1.25 / 3) blip(t, ["E6", "G6", "B6"][Math.round((t - EV.chatbot1) / (1.25 / 3)) % 3], 0.05, 0.008, 0.125);
// the nonsense: a little "wah-wah"
tone(sfx, EV.nonsense, 0.55, { duty: 0.25, f: (u) => n("E5") * Math.pow(0.6, u) * (1 + 0.04 * Math.sin(u * 40)), v: env(0.1, 0.3), gain: 0.03 });
// ---------------------------------------------------------------- the token on the dust: a buzz as long as it runs; each layer a rising note while it works
buzz(J.keys.a, J.keys.b, 240, 420, 0.011);
buzz(J.embOut.a, J.embOut.b + 0.05, 420, 520);
tone(sfx, J.feed.a, J.feed.b - J.feed.a, { duty: 0.125, f: (u) => 300 + 900 * u, v: env(0.15, 0.2), gain: 0.012 }); swish(J.feed.a, J.feed.b, 0.01);
const LAYER_NOTES = ["C5", "D5", "E5", "G5", "A5", "C6"];
HALL_T.forEach((a, k) => { tone(sfx, a, 0.55, { duty: 0.25, f: (u, tt) => n(LAYER_NOTES[k]) * (Math.floor(tt * 24) % 2 ? 1.5 : 1), v: env(0.08, 0.3), gain: 0.012 }); tone(sfx, a, 0.55, { wave: "tri", f: () => n(LAYER_NOTES[k]) / 2, v: (u) => 1 - u, gain: 0.04 }); if (k < 5) buzz(a + 0.55, HALL_T[k + 1], 260, 340, 0.008); });
buzz(HALL_T[5] + 0.55, J.pickIn.b, 260, 380, 0.009);
buzz(J.toScreen.a, J.toScreen.b, 300, 480); buzz(J.back.a, J.back.b, 240, 520, 0.01);
// the embedding panel fills (0.8 s of quick data blips)
for (let k = 0; k < 16; k++) blip(EV.list1 - 0.05 + k * 0.05, NOTE(76 + ((k * 7) % 12)), 0.04, 0.008, 0.125);
// the picker: three candidates, then the chosen one
for (let i = 0; i < 3; i++) blip(EV.machine + i * 0.12, ["E6", "C6", "A5"][i], 0.06, 0.018, 0.25);
seq(EV.picks, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25, dur: 0.1 });
// ---------------------------------------------------------------- the ROM being built: block placements while it fills; the bits
for (let t = EV.built2 + 0.1; t < EV.blocks2 + 0.15; t += 0.085) { noise(t, 0.035, () => 900, (u) => 1 - u, 0.012); tone(sfx, t, 0.035, { wave: "tri", f: (u) => 150 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.028 }); }
for (let i = 0; i < 8; i++) blip(EV.eight + i * 0.07, bitAt(BYTE.x0 + i, BYTE.z) ? "G6" : "G5", 0.05, 0.02, 0.25);
// ---------------------------------------------------------------- panels and tags: a small pop when each appears
pop(EV.one0 - 0.05, "E5", "B5"); pop(EV.two0, "C6", "G6");
pop(EV.player - 0.05, "E6", "B6"); pop(EV.redstone - 0.05, "D6", "A6");
pop(EV.no - 0.05, "G5", "D6"); tone(sfx, EV.command, 0.3, { duty: 0.5, f: () => n("C4"), v: env(0.05, 0.3), gain: 0.02 });       // the cross
pop(EV.doesnt - 0.05, "A5", "E6"); pop(EV.next - 0.05, "C6", "E6");
noise(EV.piece, 0.08, () => 6000, (u) => 1 - u, 0.015); seq(EV.piece + 0.05, ["E6", "A6"], 0.06, { gain: 0.02, duty: 0.25 });        // MINE | CRAFT snip
pop(EV.five1 - 0.05, "C6", "G6"); pop(EV.learned - 0.1, "E5", "B5"); pop(EV.built2 - 0.05, "G5", "D6");
pop(EV.eight - 0.1, "A5", "E6"); pop(EV.bits - 0.05, "C6", "E6");
pop(EV.you - 0.05, "E5", "B5"); pop(EV.list1 - 0.05, "C6", "G6"); pop(EV.twoH - 0.05, "E6", "B6");
pop(EV.six - 0.05, "C6", "G6"); pop(EV.thats - 0.05, "E5", "B5"); pop(EV.end - 0.05, "A5", "E6");
pop(EV.starts - 0.05, "G5", "D6"); pop(EV.hold - 0.05, "C6", "G6");
pop(EV.kilometer - 0.1, "E5", "B5"); pop(EV.long - 0.05, "C6", "G6"); pop(EV.tooBig - 0.05, "A5", "E6");
pop(EV.sometimes - 0.05, "E5", "B5"); pop(EV.type2 - 0.05, "C6", "E6"); pop(EV.press - 0.1, "G5", "D6"); pop(EV.wait - 0.05, "E5", "B5");
pop(EV.because - 0.15, "E5", "B5", 0.02);
// ---------------------------------------------------------------- the 20-tick clock: a tiny tick for every dot that lights
for (let t = EV.twenty - 0.1; t < EV.secondEnd + 0.1; t += 0.05) { if (t < EV.twenty - 0.15) continue; noise(t, 0.012, () => 8000, (u) => 1 - u, 0.01); }
// ---------------------------------------------------------------- the waiting: 10 years (a low gong), ×40,000 (as long as it runs), 2 hours (a chime)
tone(sfx, EV.ten, 0.9, { wave: "tri", f: () => n("C3"), v: (u) => 1 - u, gain: 0.08 }); blip(EV.ten, "C4", 0.4, 0.015, 0.5);
tone(sfx, EV.forty2 - 0.1, EV.two3 - EV.forty2 + 0.1, { duty: 0.25, f: (u, tt) => 200 + 900 * u + 60 * Math.sin(tt * 80), v: env(0.1, 0.1), gain: 0.012 });
seq(EV.two3, ["G5", "C6", "E6", "G6"], 0.07, { gain: 0.026, duty: 0.25 });
// the hourglasses: a soft trickle while each one shows
noise(EV.one0, EV.hours0End - EV.one0, () => 5000, (u) => 0.4 + 0.2 * Math.sin(u * 30), 0.004);
noise(EV.wait, EV.because - 0.2 - EV.wait, () => 5000, (u) => 0.4 + 0.2 * Math.sin(u * 30), 0.004);
// ---------------------------------------------------------------- camera moves: a sweep as long as each move
for (let i = 0; i < KEYS_CAM.length - 1; i++) {
  const [, a1, A] = KEYS_CAM[i], [b0, , Bc] = KEYS_CAM[i + 1], d = Math.hypot(A.x - Bc.x, A.z - Bc.z), zoomIn = Bc.b > A.b;
  if (d < 12) { swish(a1, b0, 0.008); continue; }
  sweep(a1, b0, !zoomIn, d > 300 ? 1 : d > 60 ? 0.8 : 0.5, 140, d > 60 ? 700 : 500); swish(a1 + 0.1, b0 - 0.1, 0.01);
}
// the far shot: a soft wind while the fog is in view
noise(EV.kilometer, EV.once2End - EV.kilometer, () => 1200, env(0.3, 0.3), 0.006);

// ---------------------------------------------------------------- chiptune bed: C – Am – F – G, whole cycles over the loop
const CYC = Math.max(1, Math.round(END / 8.4)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const section = (t) => (t < 1.0 || t > END - 1.4 ? "soft" : (t > EV.kilometer - 0.3 && t < EV.once2End) || (t > EV.atThat - 0.3 && t < EV.hours2End) ? "sparse" : "full");
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.022 : 0.016 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.013 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "cycles", CYC, "BPM", (60 / BEAT).toFixed(1));
