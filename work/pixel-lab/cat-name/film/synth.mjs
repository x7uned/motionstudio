// 8-bit sound for «Your cat knows its name. It just ignores you.»: every cue is synthesised and lasts exactly as long as
// its motion, on the picture's timeline (the same direction.mjs curves the picture draws with). Loop film: the bed fills
// whole bars with no fades; anything that runs past END folds onto the start. Writes audio/sfx.wav and audio/bed.wav.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END, CALLS } from "./timeline.mjs";
import { face, CAM_MOVES, HOOK_CALL, speakerVis } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR);
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);
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
const pop = (t, a = "C6", b = "G6", g = 0.02) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const swish = (a, b, g = 0.012) => noise(a, b - a, (u) => 1200 + 2600 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), g);

// ---- the speaker's calls: two syllables, a long stressed one and a short one (MI·lo), as long as the cone thumps
for (const c of CALLS) {
  const [hi, lo] = c.name || c.who === "owner" ? ["A5", "E5"] : c.who === "stranger" ? ["F5", "C5"] : [["G5", "D5"], ["F5", "C5"], ["E5", "B4"], ["D5", "A4"]][CALLS.indexOf(c) % 4];
  const o = c.who === "stranger" ? { wave: "tri", gain: 0.05 } : { wave: "pulse", duty: c.name || c.who === "owner" ? 0.25 : 0.5, gain: c.name || c.who === "owner" ? 0.03 : 0.022 };
  tone(sfx, c.t, 0.25, { ...o, f: (u) => n(hi) * (1 + 0.03 * Math.sin(u * Math.PI)), v: env(0.15, 0.3) });
  tone(sfx, c.t + 0.27, 0.23, { ...o, f: (u) => n(lo) * (1 - 0.04 * u), v: env(0.15, 0.4) });
  noise(c.t + 0.02, 0.08, () => 3000, (u) => 1 - u, 0.006);              // the bubble popping in
}
// the owner's call at the end (off screen): the same "MI·lo", warm
{ const t = HOOK_CALL.t; tone(sfx, t, 0.25, { duty: 0.25, f: () => n("A5"), v: env(0.15, 0.3), gain: 0.03 }); tone(sfx, t + 0.27, 0.23, { duty: 0.25, f: (u) => n("E5") * (1 - 0.04 * u), v: env(0.15, 0.4), gain: 0.03 }); }
// the speaker switches on / off with its dissolve
{ let prev = 0; for (let t = 0; t < END; t += 1 / 60) { const v = speakerVis(t); if (prev === 0 && v > 0) { blip(t, "C5", 0.06, 0.02, 0.25); blip(t + 0.08, "G5", 0.08, 0.02, 0.25); } if (prev === 1 && v < 1) tone(sfx, t, 0.5, { duty: 0.25, f: (u) => n("G5") * (1 - 0.5 * u), v: env(0.1, 0.5), gain: 0.012 }); prev = v; } }

// ---- motions read from the face curves: ear flicks, head tilts, lids, the yawn (each sound lasts its own motion)
function runs(get, minSpeed, maxGap = 0.15, minTravel = 0.08) {
  const DT = 1 / 60, out = []; let run = null, prev = get(0);
  for (let t = DT; t <= END + DT / 2; t += DT) {
    const v = get(t), sp = (v - prev) / DT, d = Math.abs(sp) > minSpeed ? Math.sign(sp) : 0; prev = v;
    if (d === 0) { if (run && t - run.last > maxGap) { out.push(run); run = null; } continue; }
    if (run && (d !== run.dir || t - run.last > maxGap)) { out.push(run); run = null; }
    if (!run) run = { dir: d, a: t - DT, va: get(t - DT) };
    run.last = t; run.vb = v;
  }
  if (run) out.push(run);
  return out.filter((r) => Math.abs(r.vb - r.va) >= minTravel && r.last - r.a > 0.05);
}
// ears: a soft flick of fur, up when the ear turns toward a sound, down when it relaxes
for (const key of ["earTwitch", "earTwitchL"]) for (const r of runs((t) => face(t)[key], 0.8)) {
  const up = r.dir > 0, d = r.last - r.a, amt = Math.abs(r.vb - r.va);
  noise(r.a, d, (u) => (up ? 2200 + 2600 * u : 4200 - 1800 * u), (u) => Math.sin(Math.PI * u), (up ? 0.012 : 0.006) * (0.5 + 0.5 * amt));
  if (up && amt > 0.5) tone(sfx, r.a, d, { duty: 0.125, f: (u) => 1400 + 900 * u, v: env(0.3, 0.4), gain: 0.006 });
}
// perked ears (the name, the owner, "isn't deaf"): a short rising chirp
for (const r of runs((t) => face(t).ear, 0.8)) if (r.dir > 0) tone(sfx, r.a, r.last - r.a, { duty: 0.25, f: (u) => 700 + 700 * u, v: env(0.3, 0.4), gain: 0.012 });
// head tilts: a whoosh of fur as long as the turn
for (const r of runs((t) => face(t).tilt, 0.5, 0.15, 0.15)) swish(r.a, r.last, 0.008);
// lids: a falling shimmer while they close, a rising one while they open (only while the lid visibly moves)
for (const r of runs((t) => face(t).lid, 0.6, 0.3, 0.2)) { const up = r.dir < 0, a = r.a, b = r.last;
  tone(sfx, a, b - a, { duty: 0.125, f: (u) => (up ? 900 + 700 * u : 1600 - 700 * u), v: env(0.2, 0.3), gain: 0.007 }); tone(sfx, a, b - a, { wave: "tri", f: (u) => (up ? 330 + 110 * u : 440 - 110 * u), v: env(0.2, 0.3), gain: 0.02 }); }
// the yawn: a slow descending glide while the mouth is open
{ const r = runs((t) => face(t).mouth, 0.3, 0.6, 0.3); if (r.length) { const a = r[0].a, b = r[r.length - 1].last; tone(sfx, a, b - a, { wave: "tri", f: (u) => 520 - 260 * u, v: env(0.25, 0.4), gain: 0.035 }); noise(a, b - a, () => 900, env(0.3, 0.5), 0.008); } }
// purr while the cat purrs
for (let t = EV.want; t < EV.toEnd + 0.4; t += 1 / 24) { const k = face(t).purrAmt; if (k > 0.05) noise(t, 0.03, () => 160, (u) => Math.sin(Math.PI * u), 0.03 * k); }

// ---- HUD: tags, the 77 cats, the chart bars, check marks, the heart, the dog/cat card
const tagPop = (t, a = "E6", b = "A6") => pop(t, a, b, 0.016);
tagPop(EV.y2019 - 0.1); tagPop(EV.even - 0.1); tagPop(EV.look - 0.1, "C6", "E6"); tagPop(EV.years - 0.1); tagPop(EV.perked - 0.15, "G6", "C7"); tagPop(EV.still - 0.1, "C6", "E6");
tagPop(EV.answer - 0.1, "E6", "B6"); tagPop(EV.same - 0.1, "C6", "G6"); tagPop(EV.bored - 0.1, "E5", "C5"); tagPop(CALLS[4].t + 0.1, "G6", "C7"); tagPop(EV.so1 - 0.05, "C6", "G6"); tagPop(EV.hidden + 0.1, "C6", "E6");
// 77 cats popping in: a rising patter as long as the grid fills (0.85 s)
{ const a = EV.cats77, d = 0.85; for (let i = 0; i < 77; i += 3) { const t = a + d * (1 - Math.pow(1 - i / 77, 1)) ; blip(t, ["C6", "D6", "E6", "G6", "A6"][i % 5], 0.03, 0.009, 0.25); } blip(a + d + 0.05, "C7", 0.12, 0.016, 0.25); }
// chart bars: each grows for 0.5 s with a rising tone, higher for a taller bar
CALLS.slice(0, 5).forEach((c, i) => tone(sfx, c.t + 0.05, 0.5, { duty: 0.25, f: (u) => 260 + 420 * c.resp * u + (i === 4 ? 160 * u : 0), v: env(0.1, 0.3), gain: i === 4 ? 0.016 : 0.01 }));
seq(CALLS[4].t + 0.55, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.014, duty: 0.125 });   // the name's bar tops out: a sparkle
// ✓ and ✗ marks, each as long as its stroke (≈ 0.45 s)
const ok = (t) => { tone(sfx, t, 0.16, { duty: 0.25, f: () => n("E6"), v: env(0.1, 0.4), gain: 0.016 }); tone(sfx, t + 0.17, 0.26, { duty: 0.25, f: () => n("A6"), v: env(0.1, 0.5), gain: 0.016 }); };
const no = (t) => { tone(sfx, t, 0.42, { duty: 0.5, f: (u) => 220 - 70 * u, v: env(0.08, 0.4), gain: 0.016 }); };
[EV.voice, EV.ears3, EV.head2, EV.heard].forEach((w) => ok(w - 0.02)); [EV.meowed, EV.tail, EV.single, EV.deaf, EV.confused].forEach((w) => no(w - 0.02));
// dogs vs cats: a two-note "woof" for the dog row, a "mew" glide for the cat row
tone(sfx, EV.dogs - 0.1, 0.12, { duty: 0.5, f: (u) => 300 - 80 * u, v: env(0.1, 0.4), gain: 0.02 }); tone(sfx, EV.dogs + 0.06, 0.12, { duty: 0.5, f: (u) => 280 - 80 * u, v: env(0.1, 0.4), gain: 0.02 });
ok(EV.dogs + 0.15); tone(sfx, EV.never - 0.1, 0.3, { duty: 0.125, f: (u) => 900 + 500 * Math.sin(Math.PI * u), v: env(0.2, 0.4), gain: 0.012 }); no(EV.never + 0.2);
// the heart after the slow blink
{ const t = EV.want + 0.25; seq(t, ["E6", "B6"], 0.07, { gain: 0.02, duty: 0.25 }); noise(t + 0.1, 0.25, () => 9000, (u) => 1 - u, 0.005); }
// camera moves: a soft air swish as long as each move
for (const [a, b] of CAM_MOVES) if (b - a > 0.25 && b < END) noise(a, b - a, (u) => 600 + 1400 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.006);

// ---- bed: a light pizzicato tune, C – Am – F – G, 24 whole bars over the loop (G → C across the seam)
const BARS = 24, BAR = END / BARS, BEAT = BAR / 4, prog = [[48, 52, 55], [45, 48, 52], [41, 45, 48], [43, 47, 50]];
const soft = (t) => (t > EV.bored - 0.2 && t < EV.boredEnd + 0.2) || (t > EV.want - 0.3 && t < EV.toEnd + 0.3);
for (let bar = 0; bar < BARS; bar++) {
  const ch = prog[bar % 4], t0 = bar * BAR;
  for (let e = 0; e < 4; e++) { const t = t0 + e * BEAT; tone(bed, t, BEAT * 0.5, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 7 : 0)), v: (u) => 1 - 0.7 * u, gain: soft(t) ? 0.05 : 0.08 }); }
  for (let s8 = 0; s8 < 8; s8++) { const t = t0 + (s8 * BEAT) / 2; if (soft(t) && s8 % 2) continue;
    const note = ch[[0, 1, 2, 1, 2, 0, 1, 2][s8]] + 24 + (s8 === 6 ? 12 : 0);
    tone(bed, t, (BEAT / 2) * 0.6, { duty: 0.25, f: () => NOTE(note), v: (u) => 1 - 0.85 * u, gain: soft(t) ? 0.012 : 0.018 }); }
  if (!soft(t0)) for (let h = 1; h < 8; h += 2) tone(bed, t0 + (h * BEAT) / 2, 0.02, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: 0.006 });
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = N - SR; i < N; i++) y += a * (buf[i] - y); for (let i = 0; i < N; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 6500);
function writeWav(file, buf) { const out = Buffer.alloc(44 + N * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + N * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(N * 2, 40); for (let i = 0; i < N; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "BPM", (60 / BEAT).toFixed(1));
