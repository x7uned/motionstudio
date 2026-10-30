// 8-bit sound for «People built computers inside Minecraft»: every cue is synthesised (no sounds from the game) and
// lasts exactly as long as its motion, on the same timeline as the picture: the lever click, the buzz of power running
// down the dust (as long as it runs), the lamp's warm "on", the torch's fizz when it goes dark, the camera moves, the
// screen's pixel wipes, the game steps and the 1 Hz tick, the phone chip's trill, the chat, the fast-forward.
// Loop film: the bed fills whole chord cycles with no fades; anything crossing the seam folds onto the start.
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";
import { LEVERS, SIG, lampLevel, camera, KEYS, WALKS, gameStep, TICK, MODES, hero } from "./scene.mjs";
import { LABEL, GROUND, PARTS } from "./world.mjs";
import { isoProject } from "./voxel.mjs";
import { TRAVELS } from "./redstone.mjs";

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

// ---------------------------------------------------------------- visibility: is a world point on screen at time t?
const onScreen = (t, x, y, z, m = 20) => { const cam = camera(t); if (cam.b < 2.5) return false; const [sx, sy] = isoProject(cam, 540, 960, x, y, z); return sx > -m && sx < 540 + m && sy > -m && sy < 640; };

// ---------------------------------------------------------------- levers: a click for every flip you can see (as long as the handle swings)
const LPOS = Object.fromEntries(PARTS.lever.map((p) => [p.sig, p]));
for (const [name, L] of Object.entries(LEVERS)) {
  let s = L.s0;
  for (const f of L.at) { s = 1 - s; const p = LPOS[name]; if (!p || !onScreen(f, p.x + 0.5, p.y, p.z + 0.5)) continue;
    noise(f, 0.16, () => 5200, (u) => (u < 0.15 ? 1 : 0.3 * (1 - u)), 0.02); tone(sfx, f + 0.12, 0.05, { wave: "tri", f: () => (s ? 330 : 220), v: (u) => 1 - u, gain: 0.07 });
    // power running down the wire (on) for exactly as long as it runs to the lamp
    const lampX = 9, run = (lampX - p.x) * (TRAVELS[name] ?? 0.1);
    if (s) tone(sfx, f + 0.16, run, { duty: 0.125, f: (u, tt) => 220 + 260 * u + 30 * Math.sin(tt * 90), v: env(0.1, 0.15), gain: 0.012 });
  }
}
// ---------------------------------------------------------------- lamps and torches: sample the logic, sound every visible change
const LAB_LAMPS = [[9, GROUND + 1, 0], [9, GROUND + 1, -7], [9, GROUND + 1, -15], [9, GROUND + 1, -23], [9, GROUND + 1, -33], [9, GROUND + 1, -31]];
for (const [x, y, z] of LAB_LAMPS) {
  let prev = lampLevel(x, y, z, 0) > 0.5;
  for (let t = 0.01; t < END; t += 0.01) { const on = lampLevel(x, y, z, t) > 0.5; if (on !== prev && onScreen(t, x + 0.5, y + 0.5, z + 0.5)) {
      if (on) { seq(t, ["G5", "C6", "E6"], 0.045, { gain: 0.03, duty: 0.25, dur: 0.12 }); tone(sfx, t, 0.35, { wave: "tri", f: () => n("C5"), v: (u) => 1 - u, gain: 0.045 }); }
      else tone(sfx, t, 0.18, { duty: 0.25, f: (u) => 520 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.02 }); }
    prev = on; }
}
for (const p of PARTS.torch) {
  if (p.g) continue; let prev = SIG(p.sig, 0) > 0.5;
  for (let t = 0.01; t < END; t += 0.01) { const on = SIG(p.sig, t) > 0.5; if (on !== prev && onScreen(t, p.x + 0.5, p.y + 0.6, p.z + 0.5)) {
      if (!on) noise(t, 0.22, (u) => 3800 * Math.pow(0.4, u), (u) => 1 - u, 0.02); else { noise(t, 0.08, () => 6000, (u) => 1 - u, 0.012); blip(t + 0.03, "E6", 0.06, 0.018, 0.25); } }
    prev = on; }
}
// ---------------------------------------------------------------- the hero's steps while walking in view
for (const w of WALKS) for (let t = w.a + 0.1; t < w.b - 0.05; t += 0.27) { const h = hero(t); if (onScreen(t, h.x, h.y, h.z)) { noise(t, 0.04, () => 1200, (u) => 1 - u, 0.012); tone(sfx, t, 0.04, { wave: "tri", f: (u) => 140 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.025 }); } }

// ---------------------------------------------------------------- camera moves: a sweep as long as each move; long dives get a deeper one
for (let i = 0; i < KEYS.length - 1; i++) {
  const [, a1, A] = KEYS[i], [b0, , Bc] = KEYS[i + 1], d = Math.hypot(A.x - Bc.x, A.z - Bc.z), zoomIn = Bc.b > A.b;
  if (d < 12) { swish(a1, b0, 0.008); continue; }
  sweep(a1, b0, !zoomIn, d > 60 ? 0.8 : 0.5, 140, d > 60 ? 700 : 500); swish(a1 + 0.1, b0 - 0.1, 0.01);
}
// the dive that opens the film (from the wide shot into the lab) and the pull-out across the seam (folds onto the start)
sweep(0.9, 5.6, false, 0.8, 140, 700);
sweep(EV.lamp3 + 0.25, END, true, 0.8, 140, 700);

// ---------------------------------------------------------------- story accents
pop(EV.they - 0.05, "E5", "B5");                                         // the phone panel
pop(EV.called, "C6", "G6"); pop(EV.wire, "G5", "D6");                     // dust = wire
pop(EV.on - 0.05, "C6", "E6"); pop(EV.off, "E5", "C5");                   // ON = 1, OFF = 0
pop(EV.torch - 0.05, "D6", "A6");
seq(EV.not, ["C6", "G5"], 0.08, { gain: 0.03, duty: 0.25 });
for (let i = 0; i < 3; i++) blip(EV.three - 0.05 + i * 0.22, ["C6", "E6", "G6"][i], 0.08, 0.03, 0.25);
seq(EV.and, ["E6", "G6"], 0.08, { gain: 0.03, duty: 0.25 }); seq(EV.or, ["G5", "D6"], 0.08, { gain: 0.03, duty: 0.25 });
pop(EV.gates - 0.05, "A5", "E6");
for (const [ev, nn] of [[EV.one1, "C6"], [EV.plus, "E6"], [EV.one2, "C6"], [EV.gives, "G6"], [EV.one3, "C7"], [EV.zero, "G6"]]) blip(ev, nn, 0.07, 0.024, 0.25);
seq(EV.twoN, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.024, duty: 0.25 });
const ARP = [0, 4, 7, 12, 7, 4, 0, 7];
for (let k = 0; k < 8; k++) { const t = EV.copy + 0.1 + k * 0.2; blip(t, NOTE(72 + ARP[k]), 0.08, 0.016, 0.125); tone(sfx, t, 0.06, { wave: "tri", f: () => NOTE(48 + ARP[k]), v: (u) => 1 - u, gain: 0.03 }); }
seq(EV.thousands, ["C6", "C6", "C6"], 0.07, { gain: 0.018, duty: 0.125, dur: 0.05 });
seq(EV.whole, ["C5", "G5", "C6", "E6"], 0.07, { gain: 0.026, duty: 0.25 });
pop(EV.sammy1 - 0.05, "E6", "B6"); pop(EV.tiny - 0.1, "E6", "B6");
// screen wipes (as long as the wipe), the game's steps, the tick
for (const M of MODES.slice(1)) if (M.a > 0 && M.a < END) noise(M.a, 0.6, (u) => 1800 + 2400 * u, env(0.2, 0.3), 0.01);
{ let prev = gameStep(EV.in2021); for (let t = EV.in2021; t < EV.in2025 - 0.3; t += 0.01) { const s = gameStep(t); if (s !== prev && t < TICK.a) blip(t, "A5", 0.04, 0.012, 0.125); prev = s; } }
for (let t = EV.ticks - 0.05; t < TICK.b; t += 1) { tone(sfx, t, 0.14, { wave: "tri", f: (u) => 330 * Math.pow(0.55, u), v: (u) => 1 - u, gain: 0.09 }); noise(t, 0.05, () => 7000, (u) => 1 - u, 0.025); blip(t + 0.004, "G4", 0.08, 0.02, 0.5); }
// the phone chip: a fast trill for as long as its panel shows
tone(sfx, EV.phoneChip - 0.05, EV.timesEnd + 0.3 - EV.phoneChip, { duty: 0.125, f: (u, tt) => n("C7") * (Math.floor(tt * 40) % 2 ? 1.5 : 1), v: env(0.1, 0.2), gain: 0.008 });
// chat: two bubbles, then the thinking dots (each dot as it lights)
pop(EV.in2025 + 0.05, "C6", "E6"); pop(EV.in2025 + 1.2, "G5", "C6");
for (let k = 0; k < 9; k++) { const ph0 = EV.in2025 + 1.5 + (Math.floor(k / 3) + (k % 3) / 3) / 0.8; if (ph0 < EV.hours) blip(ph0, ["E6", "G6", "B6"][k % 3], 0.05, 0.01, 0.125); }
// the waiting: 10 years (a low gong), the fast-forward (as long as it runs), 2 hours (a chime)
tone(sfx, EV.ten, 0.9, { wave: "tri", f: () => n("C3"), v: (u) => 1 - u, gain: 0.08 }); blip(EV.ten, "C4", 0.4, 0.015, 0.5);
tone(sfx, EV.forty - 0.1, EV.hours - EV.forty + 0.1, { duty: 0.25, f: (u, tt) => 200 + 900 * u + 60 * Math.sin(tt * 80), v: env(0.1, 0.1), gain: 0.012 });
seq(EV.hours, ["G5", "C6", "E6", "G6"], 0.07, { gain: 0.026, duty: 0.25 });
// the ending: lever, dust, lamp (the lever and lamp come from the logic above); the seam tag
pop(EV.andThats - 0.15, "E5", "B5", 0.02);

// ---------------------------------------------------------------- chiptune bed: C – Am – F – G, whole cycles over the loop
const CYC = Math.max(1, Math.round(END / 8.4)), BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const section = (t) => (t < 1.0 || t > END - 1.4 ? "soft" : (t > EV.ownE - 0.3 && t < EV.hoursEnd) || (t > TICK.a && t < TICK.b) ? "sparse" : "full");
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
