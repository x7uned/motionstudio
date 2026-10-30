// 8-bit sound for «Is my dog blind?»: every cue is synthesised and lasts exactly as long as its motion, on the picture's
// timeline. Loop film: the bed fills whole chord cycles with no fades; anything past END folds onto the start (the final
// throw's whistle, landing and paws ARE the hook's sounds).
// Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, SC, END, REL, REL_REPLAY, TAU0 } from "./timeline.mjs";
import { FLIGHT, BALL_REST_TAU, dogRun, STOP_X, FDX, HAND_X, LAND } from "./direction.mjs";
import { DOG } from "../../kit-v1/dog.mjs";

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
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.016 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.036 * gain }); };
const shimmer = (a, b, gain = 0.012, base = 1800) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => base + 500 * Math.sin(tt * 30) + 400 * u, v: env(0.2, 0.3), gain });
const whoosh = (a, b, gain = 0.014) => noise(a, b - a, (u) => 1200 + 2200 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
const thud = (t, gain = 0.06) => { tone(sfx, t, 0.09, { wave: "tri", f: (u) => 180 - 110 * u, v: (u) => 1 - u, gain }); noise(t, 0.05, () => 2500, (u) => 1 - u, gain * 0.25); };
const pad = (t, gain = 0.02) => { noise(t, 0.035, () => 1800, (u) => 1 - u, gain); tone(sfx, t, 0.04, { wave: "tri", f: () => 140, v: (u) => 1 - u, gain: gain * 1.2 }); };
const sniffs = (a, b, rate = 4.5, gain = 0.01) => { for (let t = a; t < b; t += 1 / rate) noise(t, 0.06, (u) => 5000 + 3000 * u, (u) => Math.sin(Math.PI * u), gain); };
const buzz = (t, gain = 0.03) => seq(t, ["A3", "F3"], 0.09, { gain, duty: 0.5 });
const ding = (t, gain = 0.03) => seq(t, ["E6", "B6", "E7"], 0.05, { gain, duty: 0.25 });

// ---------------------------------------------------------------- one throw: wind-up, flight whistle, landing, bounce, roll, paws
const STRIDE_RUN = DOG?.stride?.run ?? 86;
function throwCues(rel, { windup = true } = {}) {
  if (windup) whoosh(rel - 0.74, rel + 0.08, 0.012);
  // flight: a gentle whistle that rises to the apex and falls to the landing (lasts the flight)
  tone(sfx, rel, FLIGHT, { duty: 0.25, f: (u) => 900 + 700 * Math.sin(Math.PI * u) - 300 * u, v: (u) => 0.35 + 0.65 * Math.sin(Math.PI * u), gain: 0.006 });
  tone(sfx, rel, FLIGHT, { wave: "tri", f: (u) => 450 + 350 * Math.sin(Math.PI * u), v: env(0.2, 0.15), gain: 0.02 });
  thud(rel + FLIGHT, 0.07); thud(rel + FLIGHT + 0.36, 0.035);
  noise(rel + FLIGHT + 0.36, BALL_REST_TAU - FLIGHT - 0.36, () => 900, (u) => 1 - u, 0.012);              // the short roll through the grass
  // paws: one soft tap per gallop footfall pair while running (from the dog's own path), then the skid
  let last = dogRun(0).x;
  for (let tau = 0.02; tau < 1.95; tau += 1 / 120) { const x = dogRun(tau).x; if (Math.floor(x / (STRIDE_RUN / 2)) !== Math.floor(last / (STRIDE_RUN / 2))) pad(rel + tau, 0.018); last = x; }
  noise(rel + 1.85, 0.22, (u) => 3000 - 1800 * u, (u) => 1 - u, 0.016);
}
throwCues(REL);                     // the final throw — folds over the seam: it is also the hook's throw
throwCues(REL_REPLAY);              // the replay (its wind-up starts inside the rewind)

// ---- hook: «?», owner scratches, the dog walks back sniffing past the ball
// the hook's search: «?», the dog sits (soft pop), the owner scratches, the dog trots back sniffing (a pad per footfall)
const steps = (a, b, dist, half, gain = 0.009) => { const dt = half / (dist / (b - a)); for (let t = a + dt * 0.5; t < b; t += dt) pad(t, gain); };
pop(1.0, "E6", "B6"); pop(1.3, "C6", "E6", 0.016); for (let t = 1.35; t < 1.75; t += 0.09) noise(t, 0.04, () => 6000, (u) => 1 - u, 0.006);
steps(2.4, 3.3, STOP_X + 2 * FDX - 105, DOG.stride.trot / 2); steps(3.65, 4.2, 65, DOG.stride.trot / 2); sniffs(2.4, 4.2, 5, 0.008);
pop(4.25, "G5", "C6", 0.02);
// ---- not quite: push-in (sweep for the whole zoom), sit, head tilt «boing», tags
sweep(SC.hook[1], SC.hook[1] + 1.0, true, 0.8, 160, 700);
tone(sfx, 4.95, 0.22, { duty: 0.5, f: (u) => 300 + 260 * Math.sin(Math.PI * u), v: env(0.2, 0.3), gain: 0.03 });
ding(EV.see1 - 0.05, 0.022); buzz(EV.red2 - 0.05, 0.026);
// ---- colour cells: the room dims (falling tone as long as it dims), panels pop, each cone on its word
tone(sfx, SC.cones[0], 0.4, { wave: "tri", f: (u) => 330 - 120 * u, v: env(0.3, 0.3), gain: 0.03 });
pop(EV.eyes1 - 0.1, "C6", "E6", 0.022); pop(EV.color1 - 0.05, "E6", "G6", 0.02);
seq(EV.coneR - 0.05, ["E5", "B5"], 0.06, { gain: 0.03, duty: 0.25 }); seq(EV.coneG - 0.05, ["G5", "D6"], 0.06, { gain: 0.03, duty: 0.25 }); seq(EV.coneB - 0.05, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25 });
pop(EV.dogs1 - 0.1, "C6", "E6", 0.022); buzz(EV.only - 0.05, 0.024);
seq(EV.blue2 - 0.05, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25 }); seq(EV.yellow1 - 0.05, ["A5", "E6"], 0.06, { gain: 0.03, duty: 0.25 });
// ---- dog vision: the wipe (sweep as long as it travels), swatches, «=», dull low tone, zoom to the ball, «same colour»
tone(sfx, SC.cones[1], 0.4, { wave: "tri", f: (u) => 210 + 120 * u, v: env(0.3, 0.3), gain: 0.025 });
sweep(EV.so1 + 0.4, EV.so1 + 1.8, true, 0.9, 200, 1200);
pop(EV.red4 - 0.05, "E5", "B5", 0.022); pop(EV.green3 - 0.05, "G5", "D6", 0.022); seq(EV.same1 - 0.05, ["C6", "C6"], 0.08, { gain: 0.022, duty: 0.25 });
tone(sfx, EV.dull, 0.6, { wave: "tri", f: () => n("E3"), v: env(0.1, 0.5), gain: 0.035 });
sweep(EV.that - 0.15, EV.ball3 + 0.25, true, 0.6, 160, 600);
shimmer(EV.ball3, SC.vision[1] - 0.1, 0.006, 2000); pop(EV.same2 - 0.05, "G5", "G5", 0.02);
// ---- replay: tape rewind, tracking beeps while the ball moves, «LOST»
tone(sfx, SC.replay[0] - 0.05, 0.5, { duty: 0.5, f: (u) => 2400 - 1800 * u + 300 * Math.sin(u * 60), v: env(0.1, 0.3), gain: 0.012 });
noise(SC.replay[0] - 0.05, 0.5, () => 9000, env(0.1, 0.3), 0.012);
for (let tau = 0.1; tau < BALL_REST_TAU; tau += 0.22) blip(REL_REPLAY + tau, "A6", 0.035, 0.012, 0.25);
seq(REL_REPLAY + BALL_REST_TAU + 0.1, ["A6", "F6", "D6", "A5"], 0.12, { gain: 0.016, duty: 0.25 }); buzz(EV.lost - 0.05, 0.028);
pop(27.55, "E6", "B6", 0.022);
// ---- less detail: panels open, «blurry» wobble, «clear ✓», the ×3.75 zoom (sweep for the whole zoom), «4× closer»
pop(EV.detail - 0.2, "C6", "E6", 0.022); tone(sfx, EV.detail, 0.6, { duty: 0.5, f: (u, tt) => 280 + 40 * Math.sin(tt * 40), v: env(0.2, 0.3), gain: 0.02 });
ding(EV.clearly - 0.05, 0.02); pop(EV.across - 0.05, "G5", "C6", 0.018);
sweep(EV.four - 0.15, EV.closer + 0.35, true, 0.8, 180, 1000); pop(EV.four, "E6", "B6", 0.022);
// ---- nose mode: panels close, turn, sniffing walk, scent shimmer, pick-up jingle
tone(sfx, SC.nose[0], 0.4, { wave: "tri", f: (u) => 330 - 120 * u, v: env(0.3, 0.3), gain: 0.025 });
sniffs(SC.nose[0] + 1.0, EV.nose, 6, 0.011); steps(SC.nose[0] + 1.1, EV.nose - 0.12, STOP_X + 2 * FDX - (LAND + DOG.side.pick.ball[0]), DOG.stride.walk / 2, 0.008);
shimmer(36.9, EV.nose + 0.2, 0.005, 2400); pop(EV.uses - 0.05, "C6", "G6", 0.022);
seq(EV.nose, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.024, duty: 0.25 });
// ---- the fix: run back with the ball, drop, the owner shows blue and yellow, tosses them, wipe, ✓ ✓ ×, wipe back
steps(SC.fix[0] + 0.15, 41.35, LAND + DOG.side.pick.ball[0] - HAND_X, DOG.stride.run / 2, 0.014); noise(41.35, 0.15, (u) => 3000 - 1600 * u, (u) => 1 - u, 0.012);
thud(41.66, 0.03);
seq(EV.blue3 - 0.05, ["C6", "E6"], 0.05, { gain: 0.02, duty: 0.25 }); seq(EV.yellow2 - 0.05, ["E6", "G6"], 0.05, { gain: 0.02, duty: 0.25 });
whoosh(EV.ball4 + 0.05, EV.ball4 + 0.7, 0.012); thud(EV.ball4 + 0.6, 0.035); thud(EV.ball4 + 0.7, 0.035); thud(EV.ball4 + 0.9, 0.018); thud(EV.ball4 + 1.0, 0.018);
sweep(EV.for3, EV.for3 + 0.9, true, 0.9, 200, 1200);
ding(EV.easy2 - 0.05, 0.022); ding(EV.easy2 + 0.1, 0.018); buzz(EV.spot - 0.05, 0.024);
sweep(45.6, 46.2, false, 0.7, 200, 1000); shimmer(45.95, 46.55, 0.005, 2600);
// ---- loop: the owner crouches and picks the red ball up; the final throw's cues were placed above
noise(EV.red6 - 0.1, 0.45, () => 1400, env(0.3, 0.4), 0.008); blip(EV.red6 - 0.05, "E5", 0.04, 0.016, 0.25); seq(EV.red6 + 0.38, ["G5", "C6"], 0.05, { gain: 0.02, duty: 0.25 });

// ---- sunny park bed: C – G – Am – F, 6 whole cycles over the loop (117 BPM), sparse under the panels, no fades
const CYC = 6, BEAT = END / (16 * CYC), BAR = BEAT * 4, prog = [[48, 52, 55, 60], [43, 47, 50, 55], [45, 48, 52, 57], [41, 45, 48, 53]];
const section = (t) => (t > SC.cones[0] + 0.3 && t < SC.cones[1] - 0.2) || (t > SC.detail[0] + 0.3 && t < SC.detail[1] - 0.2) ? "sparse" : "full";
for (let bar = 0; bar * BAR < END - 1e-6; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = section(t); if (t >= END - 1e-6) break;
    tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.085 : 0.06 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = section(t); if (t >= END - 1e-6) break; if (s === "sparse" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * 1.4, { duty: 0.25, f: () => NOTE(ch[[0, 1, 2, 3, 2, 1, 2, 3][s8]] + 12), v: (u) => 1 - 0.85 * u, gain: s === "full" ? 0.02 : 0.015 });
    if (s8 % 2 === 1 && s === "full") tone(bed, t, 0.025, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.01 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
