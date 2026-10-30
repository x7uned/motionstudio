// 8-bit sound for «Your cat sleeps all day, then goes crazy at 3 a.m.»: every cue is synthesised and lasts exactly as
// long as its motion, on the picture's timeline. Loop film: the bed fills whole bars with no fades; anything that runs
// past END folds onto the start. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, HOOK } from "./timeline.mjs";
import { HIT_X, GLASS_LAND, BUBBLE } from "./direction.mjs";

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
const tick = (t, hz = 3000, g = 0.02) => noise(t, 0.025, () => hz, (u) => 1 - u, g);
const thud = (t, g = 0.09, f0 = 140) => { tone(sfx, t, 0.18, { wave: "tri", f: (u) => f0 - 80 * u, v: (u) => 1 - u, gain: g }); noise(t, 0.08, () => 900, (u) => 1 - u, g * 0.35); };
const patter = (a, b, rate, g = 0.016, hz = 2400) => { for (let t = a; t < b; t += 1 / rate) tick(t, hz + ((t * 977) % 1) * 600, g); };
const scrabble = (a, dur, g = 0.022) => { for (let t = a; t < a + dur; t += 0.035) noise(t, 0.02, () => 5000 + ((t * 1931) % 1) * 3000, (u) => 1 - u, g); };
const whoosh = (a, b, g = 0.016) => noise(a, b - a, (u) => 900 + 2200 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), g);
const squeak = (t, g = 0.016) => tone(sfx, t, 0.09, { duty: 0.125, f: (u) => 2600 + 900 * Math.sin(u * Math.PI), v: (u) => 1 - u, gain: g });

// ---- the hook (τ = t at the start; the last seconds run the same cues at t − END, folded by put())
const hook = (o) => {
  // sleepy footsteps of the owner (every half cycle of his walk = one step, 60 units)
  for (let tau = -1.45; tau < HOOK.hit; tau += 60 / HOOK.walkV) noise(o + tau, 0.06, () => 700, (u) => 1 - u, 0.018);
  scrabble(o + HOOK.launch - 0.04, 0.22);                          // claws scrabble on the floor at the launch
  patter(o + HOOK.launch + 0.1, o + 2.5, 15, 0.014);                // paws pattering across the floor
};
hook(0);                                                           // cues before 0 fold onto the film's last seconds
// the bonk into his ankles, his yelp-like falling slide, the glass's arc, the floor thud, the splash
tone(sfx, HOOK.hit, 0.12, { duty: 0.5, f: (u) => 320 - 140 * u, v: (u) => 1 - u, gain: 0.05 });
tone(sfx, HOOK.hit + 0.05, HOOK.fall - 0.05, { duty: 0.25, f: (u) => 700 - 520 * u, v: env(0.1, 0.25), gain: 0.022 });
whoosh(HOOK.hit + 0.24, GLASS_LAND, 0.01);
thud(HOOK.hit + HOOK.fall, 0.11, 120);
tone(sfx, GLASS_LAND, 0.25, { duty: 0.125, f: (u) => 3200 + 400 * Math.sin(u * 30), v: (u) => 1 - u, gain: 0.014 });
noise(GLASS_LAND, 0.35, (u) => 4000 - 2500 * u, (u) => 1 - u, 0.03);
// the cat skids on the floor (as long as it slides), then sits
tone(sfx, 2.5, 0.5, { duty: 0.125, f: (u) => 1900 - 700 * u, v: (u) => 0.9 - 0.6 * u, gain: 0.012 }); noise(2.5, 0.5, () => 6000, (u) => 0.8 - 0.7 * u, 0.012);
// the alarm clock "3:00"
for (let k = 0; k < 3; k++) seq(EV.three - 0.2 + k * 0.32, ["A6", "A6"], 0.07, { gain: 0.02, duty: 0.5 });
// the anger mark, the innocent look, "built to hunt"
pop(EV.annoying - 0.05, "D5", "A4", 0.025); seq(EV.isnt, ["E6", "G6"], 0.09, { gain: 0.016, duty: 0.25 }); pop(EV.built - 0.05, "C6", "G6", 0.025);
// ---- the day: dawn rises, the clock spins (ticks as long as it spins), each sleep hop a soft blip
tone(sfx, 8.6, 0.7, { wave: "tri", f: (u) => 330 + 165 * u, v: env(0.3, 0.3), gain: 0.03 }); seq(9.2, ["C6", "E6", "G6"], 0.08, { gain: 0.016, duty: 0.25 });
for (let t = 9.3, k = 0; t < 11.0; t += 0.07, k++) tick(t, k % 2 ? 2600 : 3400, 0.012);
for (const t of [9.75, 10.4]) seq(t - 0.1, ["G5", "C6"], 0.08, { gain: 0.012, duty: 0.25 });
pop(EV.fifteen - 0.05, "E6", "B6", 0.025); pop(EV.light - 0.05, "G6", "D7", 0.022);
// ---- light sleep: a bird at the window, a phone buzzing; the ear swivels with a short rising blip; the eye snaps open
seq(EV.ears - 0.1, ["E7", "G7", "E7"], 0.07, { gain: 0.012, duty: 0.25 }); seq(EV.ears + 0.35, ["E7", "G7"], 0.07, { gain: 0.01, duty: 0.25 });
tone(sfx, EV.ears + 0.0, 0.3, { wave: "tri", f: (u) => 500 + 400 * u, v: env(0.2, 0.3), gain: 0.03 });
tone(sfx, EV.every - 0.05, 0.6, { duty: 0.5, f: (u, tt) => 150 + 20 * Math.sign(Math.sin(tt * 90)), v: env(0.1, 0.2), gain: 0.012 });
tone(sfx, EV.every + 0.1, 0.3, { wave: "tri", f: (u) => 480 + 380 * u, v: env(0.2, 0.3), gain: 0.03 });
seq(EV.ready1 - 0.05, ["C7", "G6"], 0.05, { gain: 0.02, duty: 0.25 });
// ---- the dream: the bubble opens (rising arpeggio for its growth) and closes (falling)
{ const a = EV.wild - 0.3, b = EV.wild + 0.45; seq(a, ["C5", "E5", "G5", "C6", "E6", "G6", "C7"], (b - a) / 7, { gain: 0.014, duty: 0.25 }); }
{ const a = EV.energy1End - 0.35, b = EV.mice + 0.3; seq(a, ["C7", "G6", "E6", "C6", "G5", "E5", "C5"], (b - a) / 7, { gain: 0.012, duty: 0.25 }); }
// first catch: peek squeak, pounce whoosh (as long as the leap), pop, a little "nom" on "meal"
squeak(EV.mouse - 0.3); whoosh(EV.mouse + 0.15, EV.mouse + 0.6, 0.014); blip(EV.mouse + 0.6, "C6", 0.06, 0.03, 0.25); squeak(EV.mouse + 0.62, 0.012);
seq(EV.meal - 0.05, ["G5", "E5"], 0.08, { gain: 0.018, duty: 0.5 }); pop(EV.tiny - 0.05, "E6", "A6", 0.02);
// ten mouse icons light up: a rising tick for each
for (let k = 0; k < 10; k++) blip(EV.catch + ((EV.ten + 0.35 - EV.catch) * (k + 0.5)) / 10, ["C5", "D5", "E5", "F5", "G5", "A5", "B5", "C6", "D6", "E6"][k], 0.05, 0.016, 0.25);
pop(EV.ten - 0.05, "C6", "C7", 0.022);
// the long wait: a low heartbeat pulse; the sprint: fast paws (as long as the run) and a draining sweep for the energy
for (let t = EV.long - 0.1; t < EV.sprint - 0.2; t += 0.42) tone(sfx, t, 0.09, { wave: "tri", f: () => 82, v: (u) => 1 - u, gain: 0.05 });
squeak(EV.short - 0.1, 0.014); patter(EV.sprint - 0.15, EV.full - 0.2, 18, 0.016); whoosh(EV.full - 0.2, EV.full + 0.2, 0.014); blip(EV.full + 0.2, "C6", 0.06, 0.03, 0.25);
sweep(EV.sprint - 0.15, EV.full + 0.25, false, 0.7, 180, 700);
// saving energy: a rising sweep as long as the bar refills
sweep(EV.sleeps3, EV.energy1End - 0.1, true, 0.6, 180, 700); pop(EV.saves - 0.05, "E6", "B6", 0.02);
// ---- dusk and dawn chimes; wake up; ready
seq(EV.dusk - 0.05, ["G5", "E5"], 0.1, { gain: 0.016, duty: 0.25 }); seq(EV.dawn - 0.05, ["E5", "G5"], 0.1, { gain: 0.016, duty: 0.25 });
tone(sfx, EV.body - 0.4, 0.4, { wave: "tri", f: (u) => 400 + 300 * u, v: env(0.2, 0.3), gain: 0.03 }); pop(EV.ready2 - 0.05, "C6", "G6", 0.025);
// ---- dinner: the kibble rattles as long as it pours; the cat runs to it; crunching while it eats
const rattle = (a, b) => { for (let t = a; t < b; t += 0.028) noise(t, 0.018, () => 3500 + ((t * 5113) % 1) * 4000, (u) => 1 - u, 0.016); };
rattle(32.95, 34.0); patter(EV.dinner - 0.2, EV.bowl + 0.1, 12, 0.012);
for (let t = EV.bowl + 0.2; t < 36.0; t += 1 / 2.2) noise(t, 0.08, () => 2200, (u) => 1 - u, 0.012);
// "no hunt": the error buzz; the bar overfills (rising, as long as it fills) then MAX alarm beeps in time with the blink
tone(sfx, EV.noHunt - 0.05, 0.25, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.03 });
sweep(35.5, 37.6, true, 0.6, 300, 1100);
for (let k = 0; k * (END / 142) < 41 - 37.6; k++) { const t = 37.6 + (k * END) / 142; if (k % 3 === 0) blip(t, "A6", 0.04, 0.008, 0.5); }
// ---- night: quiet; the crouch's tension, the bolt on "once"
tone(sfx, EV.quiet, 1.2, { wave: "tri", f: () => 98, v: env(0.4, 0.3), gain: 0.025 });
scrabble(EV.once - 0.03, 0.22, 0.024);
// ---- the zoomies (each sound as long as its move): runs patter, the curtain climb scratches, jumps whoosh, landings thump
patter(EV.once + 0.1, 41.7, 17, 0.016);
for (let t = 41.72; t < 42.45; t += 0.06) noise(t, 0.04, () => 1800 + ((t * 811) % 1) * 1200, (u) => 1 - u, 0.016);
whoosh(42.45, 42.95, 0.016); thud(42.95, 0.05, 180);
patter(42.95, 43.85, 17, 0.016); whoosh(43.85, 44.25, 0.014); thud(44.25, 0.035, 160);
patter(44.25, 44.75, 17, 0.014); whoosh(44.75, 45.2, 0.014); thud(45.2, 0.04, 180);
patter(45.2, 46.3, 18, 0.017);
tone(sfx, 46.3, 0.65, { duty: 0.125, f: (u) => 1900 - 700 * u, v: (u) => 0.9 - 0.6 * u, gain: 0.012 }); noise(46.3, 0.65, () => 6000, (u) => 0.8 - 0.7 * u, 0.012);
sweep(40.8, 46.8, false, 0.35, 160, 900);                                       // the energy drains through the whole run
seq(EV.fraps - 0.05, ["C5", "G5", "C6"], 0.06, { gain: 0.03, duty: 0.25 });
for (const w of [EV.frenetic, EV.random, EV.activity, EV.periods]) blip(w - 0.03, "E6", 0.04, 0.012, 0.25);
seq(EV.zoomies - 0.05, ["G5", "C6", "E6", "G6"], 0.05, { gain: 0.03, duty: 0.25 }); whoosh(EV.zoomies - 0.05, EV.zoomies + 0.4, 0.016);
// ---- the fix: the lamp clicks on, the toy swishes as it swings, swats, the pounce, "tired"
tick(EV.fix - 0.3, 1800, 0.04); pop(EV.fix - 0.05, "C6", "E6", 0.022);
for (let t = 47.6; t < EV.string + 0.3; t += 1 / 1.3) noise(t, 0.3, (u) => 1500 + 2500 * u, (u) => Math.sin(Math.PI * u), 0.008);
for (let t = EV.toy + 0.2; t < EV.string + 0.25; t += 1 / 2.4) whoosh(t, t + 0.14, 0.012);
whoosh(EV.string + 0.25, EV.string + 0.7, 0.014); blip(EV.string + 0.7, "C6", 0.05, 0.025, 0.25);
sweep(EV.play, EV.tired + 0.1, false, 0.5, 180, 700); seq(EV.tired - 0.05, ["E5", "C5"], 0.12, { gain: 0.016 });
// dinner again: rattle as long as it pours, paws to the bowl, crunch
rattle(51.95, 52.75); patter(EV.feed - 0.2, EV.sEat - 0.05, 11, 0.011);
for (let t = EV.sEat; t < EV.sWash - 0.05; t += 1 / 2.2) noise(t, 0.08, () => 2200, (u) => 1 - u, 0.012);
// the four steps light up; the cross over HUNT on "skip"; the lamp off; a falling sweep back into the night
seq(EV.sHunt - 0.04, ["C6"], 0.06, { gain: 0.02, duty: 0.25 }); seq(EV.sEat - 0.04, ["E6"], 0.06, { gain: 0.02, duty: 0.25 }); seq(EV.sWash - 0.04, ["G6"], 0.06, { gain: 0.02, duty: 0.25 }); seq(EV.sSleep - 0.04, ["C7"], 0.08, { gain: 0.02, duty: 0.25 });
tick(EV.sSleep + 0.1, 1500, 0.035);
tone(sfx, EV.skip - 0.03, 0.3, { duty: 0.5, f: () => 98, v: (u) => 1 - u * 0.5, gain: 0.03 });
sweep(55.0, 56.3, false, 0.5, 160, 700);
void HIT_X; void BUBBLE;

// ---- bed: a playful night tune, F – Dm – Bb – C, whole bars over the loop; soft at the seam, sparse in the dream
const BARS = 24, BAR = END / BARS, BEAT = BAR / 4, prog = [[41, 45, 48, 53], [38, 41, 45, 50], [46, 50, 53, 58], [36, 40, 43, 48]];
const part = (t) => (t > EV.wild && t < EV.mice ? "dream" : t > EV.once && t < EV.zoomiesEnd ? "zoom" : "full");
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT, s = part(t); tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "dream" ? 0.06 : 0.085 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2, s = part(t); if (s === "dream" && s8 % 2) continue;
    tone(bed, t, (BEAT / 2) * (s === "dream" ? 2.4 : 1.5), { duty: s === "dream" ? 0.25 : 0.125, f: () => NOTE(ch[[0, 2, 1, 3, 2, 1, 3, 2][s8]] + 24), v: (u) => 1 - 0.8 * u, gain: s === "full" ? 0.02 : s === "zoom" ? 0.024 : 0.016 });
    if (s8 % 2 === 1 && s !== "dream") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: s === "zoom" ? 0.016 : 0.01 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
