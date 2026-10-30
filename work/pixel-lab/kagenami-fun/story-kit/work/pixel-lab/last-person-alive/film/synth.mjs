// «The last person alive» — sound. Everything synthesised (no samples, no music track): a horror ambience bed and the
// few events the picture shows, each placed on its picture event. → audio/amb.wav (beds) + audio/sfx.wav (events),
// 48 kHz stereo. Beds: wind (town), crickets + fire crackle (forest), a low minor drone that swells with the dread, a
// heartbeat from "toward people" to "eyes". Events: his footsteps (town gravel, on the walk's foot strikes; forest leaves
// in pov1), the rustle running through the grass right → left, the leap whoosh + sting, the crowbar's clatter, the
// thump of his fall, two tiny squeaks, the scurry away, a sub boom on "eyes", the fire dying.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { END, EV } from "./timeline.mjs";
import { heroWalkX } from "./camera.mjs";
import { STRIDE } from "./people.mjs";
import { sm, win, clamp01 } from "./layout.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), SR = 48000, N = Math.ceil(END * SR);
const amb = [new Float32Array(N), new Float32Array(N)], sfx = [new Float32Array(N), new Float32Array(N)];
let seed = 12345; const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const TAU = Math.PI * 2;
const add = (buf, i, v, pan = 0) => { if (i < 0 || i >= N) return; const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4); buf[0][i] += v * l * 1.414; buf[1][i] += v * r * 1.414; };
/** One-pole filters as closures. */
const LP = (fc) => { const a = 1 - Math.exp((-TAU * fc) / SR); let y = 0; return (x, f2) => { const aa = f2 ? 1 - Math.exp((-TAU * f2) / SR) : a; y += aa * (x - y); return y; }; };
const HP = (fc) => { const lp = LP(fc); return (x) => x - lp(x); };
const BP = (lo, hi) => { const h = HP(lo), l = LP(hi); return (x) => l(h(x)); };

// ---------------------------------------------------------------- beds
{ // wind: two band-passed noises with slow gusts; loud in the town, softer in the forest
  const w1 = BP(150, 700), w2 = BP(500, 2200);
  for (let i = 0; i < N; i++) { const t = i / SR, gust = 0.55 + 0.45 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1), town = 1 - sm(t, EV.woman - 0.6, EV.woman + 0.4), lvl = (0.5 + 0.5 * town) * (1 - 0.85 * sm(t, EV.and1 - 0.2, EV.and1 + 0.3));
    add(amb, i, (w1(rand()) * 0.9 + w2(rand()) * 0.35 * gust) * gust * lvl * 0.5, 0.25 * Math.sin(t * 0.3)); }
}
{ // crickets in the forest: 4.6 kHz chirps in groups, two voices left/right; silent when the eyes open
  for (const [pan, rate, ph, f] of [[-0.6, 2.7, 0.1, 4600], [0.55, 3.1, 0.6, 5200], [0.1, 2.3, 0.3, 4300]]) {
    for (let t = EV.woman - 0.5 + ph; t < EV.and1; t += 1 / rate) { const g = 0.012 * sm(t, EV.woman - 0.5, EV.woman + 0.4) * (1 - sm(t, EV.it2, EV.and1 - 0.1)); if (g <= 0.0005) continue;
      for (let k = 0; k < 3; k++) { const s0 = Math.round((t + k * 0.045) * SR); for (let j = 0; j < 0.028 * SR; j++) { const u = j / (0.028 * SR); add(amb, s0 + j, Math.sin(TAU * f * j / SR) * Math.sin(Math.PI * u) * g, pan); } } }
  }
}
{ // fire crackle near the clearing (pov1 growing, clearing steady, dying 24.2 → 25.4)
  const lp = LP(3000), body = BP(80, 400);
  for (let i = 0; i < N; i++) { const t = i / SR, lvl = sm(t, EV.woman - 0.4, EV.real) * (1 - sm(t, 24.2, 25.4)) * (t > EV.jumps && t < EV.scream - 0.32 ? 0.6 : 1);
    if (lvl <= 0) continue; const hiss = lp(rand()) * 0.05, roar = body(rand()) * 0.18; add(amb, i, (hiss + roar) * lvl * 0.5, -0.1);
    if (rand() > 0.9993) { const n = Math.round(SR * (0.004 + 0.01 * Math.abs(rand()))); for (let j = 0; j < n; j++) add(amb, i + j, rand() * 0.35 * lvl * (1 - j / n), rand() * 0.3); } }
}
{ // drone: A1 + E2 + C3 pulse, swelling with the dread; a Bb joins for the eyes
  for (let i = 0; i < N; i++) { const t = i / SR, dread = 0.25 + 0.35 * sm(t, EV.but, EV.and1) + 0.4 * sm(t, EV.and1, EV.eyes), out = 1 - sm(t, END - 0.6, END);
    let v = 0; for (const [f, g] of [[55, 0.5], [82.41, 0.3], [130.81, 0.12 * sm(t, EV.but, EV.and1)], [116.54, 0.14 * sm(t, EV.full, EV.eyes)]]) v += Math.sin(TAU * f * t + Math.sin(TAU * 0.13 * t) * 0.6) * g;
    v *= 0.08 * dread * out * (0.85 + 0.15 * Math.sin(TAU * 0.25 * t)); add(amb, i, v, 0); }
}
{ // heartbeat: lub-dub from "toward people" to "eyes", 64 → 108 bpm, louder as it speeds
  let t = EV.toward; while (t < EV.eyes + 0.6) { const u = clamp01((t - EV.toward) / (EV.eyes - EV.toward)), bpm = 64 + 44 * u, g = 0.35 + 0.45 * u;
    for (const [dt, gg] of [[0, 1], [0.16, 0.7]]) { const s0 = Math.round((t + dt) * SR); for (let j = 0; j < 0.14 * SR; j++) { const tt = j / SR, f = 48 + 30 * Math.exp(-tt * 30); add(amb, s0 + j, Math.sin(TAU * f * tt) * Math.exp(-tt * 22) * g * gg * 0.5, 0); } }
    t += 60 / bpm; }
}

// ---------------------------------------------------------------- events
function step(t, kind, g = 1, pan = 0) {          // gravel crunch (town) or leaves (forest)
  const bp = kind === "gravel" ? BP(500, 3800) : BP(900, 6000), n = Math.round(SR * (kind === "gravel" ? 0.11 : 0.16)), s0 = Math.round(t * SR);
  for (let j = 0; j < n; j++) { const u = j / n, grain = rand() > (kind === "gravel" ? 0.6 : 0.75) ? 1 : 0.25; add(sfx, s0 + j, bp(rand()) * grain * Math.pow(1 - u, 2) * 0.32 * g, pan); }
  const th = LP(180); for (let j = 0; j < 0.06 * SR; j++) add(sfx, s0 + j, th(rand()) * Math.exp(-j / (0.012 * SR)) * 0.8 * g, pan);
}
// his steps in the town: a foot strikes each time he has walked half a stride
{ let last = heroWalkX(0); for (let t = 0; t < EV.woman - 0.4; t += 1 / 240) { const x = heroWalkX(t); if (Math.floor(x / (STRIDE / 2)) !== Math.floor(last / (STRIDE / 2))) step(t, "gravel", 0.8, -0.05); last = x; } }
// pov1: steps on leaves at the head-bob rate (1.8 steps/s from the shot start), slowing as we arrive
for (let k = 0; ; k++) { const t = EV.woman - 0.3 + 0.12 + k / 1.8; if (t > 11.8) break; step(t, "leaves", 0.55 * (1 - 0.4 * sm(t, EV.real, 11.8)), k % 2 ? 0.15 : -0.15); }   // pov.mjs: he stops ≈ 11.85
// crows taking off in the town (town.mjs: 0.37 wire, 2.08 the wall crow, 6.50 / 6.73 / 6.93): wing flaps, one caw at the wall
for (const [t0, pan] of [[0.37, 0.4], [2.08, 0.1], [6.5, 0.3], [6.73, 0.5], [6.93, 0.2]]) for (let k = 0; k < 6; k++) { const s0 = Math.round((t0 + k * 0.11) * SR), bp = BP(300, 2500), g = 0.09 * (1 - k / 7); for (let j = 0; j < 0.06 * SR; j++) add(sfx, s0 + j, bp(rand()) * Math.sin(Math.PI * j / (0.06 * SR)) * g, pan); }
{ const s0 = Math.round(2.0 * SR); for (const [dt, f0] of [[0, 640], [0.32, 560]]) { const lp = LP(2400); for (let j = 0; j < 0.24 * SR; j++) { const tt = j / SR, u = tt / 0.24, f = f0 - 160 * u; const saw = 2 * ((f * tt) % 1) - 1; add(sfx, s0 + Math.round(dt * SR) + j, lp(saw + 0.4 * rand()) * Math.sin(Math.PI * Math.min(1, u * 1.2)) * 0.12, 0.15); } } }
// the rustle through the grass, right → left (12.75 → 13.38), getting closer and louder
{ const bp = BP(1200, 7000); const a = 12.75, b = EV.jumps; for (let i = Math.round(a * SR); i < Math.round((b + 0.1) * SR); i++) { const t = i / SR, u = clamp01((t - a) / (b - a)), burst = Math.sin(TAU * 13 * t) > 0.2 ? 1 : 0.3;
  add(sfx, i, bp(rand()) * burst * (0.05 + 0.25 * u) * (1 - sm(t, b, b + 0.1)), 0.8 - 1.4 * u); } }
// the leap (pov2): a short whoosh up at the camera and a dissonant sting; the jolt back
{ const lp = LP(800); for (let i = Math.round(13.55 * SR); i < Math.round(14.05 * SR); i++) { const t = i / SR, u = (t - 13.55) / 0.5; add(sfx, i, lp(rand(), 400 + 6000 * u) * Math.sin(Math.PI * u) * 0.5, 0); }
  for (const f of [233.1, 246.9, 349.2, 466.2]) for (let j = 0; j < 0.9 * SR; j++) { const tt = j / SR; add(sfx, Math.round(13.92 * SR) + j, Math.sin(TAU * f * tt + 0.3 * Math.sin(TAU * 6 * tt)) * Math.exp(-tt * 3.2) * Math.min(1, tt / 0.01) * 0.07, 0); } }
// the crowbar clatters down in front of him (three bounces), his fall thumps
const FALL_A = EV.jumps + 0.92, FALL_B = EV.jumps + 1.78;
for (const [dt, g] of [[0.63, 1], [0.74, 0.55], [0.82, 0.3]]) { const s0 = Math.round((FALL_A + dt) * SR); for (let j = 0; j < 0.35 * SR; j++) { const tt = j / SR; let v = 0; for (const [f, a] of [[1240, 1], [1873, 0.7], [2711, 0.5], [3390, 0.35]]) v += Math.sin(TAU * f * tt) * a * Math.exp(-tt * (6 + f / 600)); add(sfx, s0 + j, v * 0.06 * g * Math.min(1, tt / 0.002), 0.35); } }
{ const s0 = Math.round((FALL_B - 0.05) * SR), lp = LP(220); for (let j = 0; j < 0.3 * SR; j++) { const tt = j / SR; add(sfx, s0 + j, (lp(rand()) * 2.2 + Math.sin(TAU * 62 * tt) * 0.6) * Math.exp(-tt * 14) * 0.45, -0.2); } }
// two tiny squeaks as it sits up and sniffs, then the scurry away to the left
for (const t of [EV.its + 0.05, EV.mouse0 + 0.15]) { const s0 = Math.round(t * SR); for (let j = 0; j < 0.09 * SR; j++) { const tt = j / SR, u = tt / 0.09, f = 3600 + 900 * Math.sin(Math.PI * u) + 300 * Math.sin(TAU * 40 * tt); add(sfx, s0 + j, Math.sin(TAU * f * tt) * Math.sin(Math.PI * u) * 0.05, 0.2); } }
{ const a = EV.mouse1 + 0.05, b = EV.mouse1 + 0.8; for (let t = a; t < b; t += 0.045) { const s0 = Math.round(t * SR), u = (t - a) / (b - a), bp = BP(2000, 7000); for (let j = 0; j < 0.02 * SR; j++) add(sfx, s0 + j, bp(rand()) * (1 - j / (0.02 * SR)) * 0.12 * (1 - u), 0.1 - 0.9 * u); } }
// "And now…": the forest goes silent (the beds duck above); a low boom on "eyes"; the fire dies with a soft hiss
{ const s0 = Math.round(EV.eyes * SR), lp = LP(120); for (let j = 0; j < 2.2 * SR; j++) { const tt = j / SR; add(sfx, s0 + j, (Math.sin(TAU * (38 + 14 * Math.exp(-tt * 3)) * tt) * 0.8 + lp(rand()) * 1.5) * Math.exp(-tt * 1.6) * Math.min(1, tt / 0.02) * 0.32, 0); } }
{ const hp = BP(1500, 9000); for (let i = Math.round(24.2 * SR); i < Math.round(25.5 * SR); i++) { const t = i / SR, u = (t - 24.2) / 1.3; add(sfx, i, hp(rand()) * Math.sin(Math.PI * Math.min(1, u * 1.4)) * 0.05 * (1 - u), -0.1); } }

// ---------------------------------------------------------------- write (16-bit stereo; 0.3 s fade at the end)
function write(file, buf) {
  for (const ch of buf) for (let i = Math.round((END - 0.3) * SR); i < N; i++) ch[i] *= Math.max(0, (END - i / SR) / 0.3);
  const out = Buffer.alloc(44 + N * 4); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 4, 40);
  let pk = 0; for (let i = 0; i < N; i++) for (let c = 0; c < 2; c++) { const v = buf[c][i]; pk = Math.max(pk, Math.abs(v)); out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + (i * 2 + c) * 2); }
  fs.writeFileSync(file, out); return pk;
}
fs.mkdirSync(HERE + "audio", { recursive: true });
console.log("amb peak", write(HERE + "audio/amb.wav", amb).toFixed(3), "sfx peak", write(HERE + "audio/sfx.wav", sfx).toFixed(3));
