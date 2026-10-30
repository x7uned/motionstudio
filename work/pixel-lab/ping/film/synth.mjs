// 8-bit sound for «Why you die behind walls»: every cue is synthesised and lasts exactly as long as its motion
// (same timeline as the picture). Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { EV, END } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SR = 48000, N = Math.ceil(END * SR) + SR;
const sfx = new Float32Array(N), bed = new Float32Array(N);
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const n = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return NOTE(12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0)); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  if (dur <= 0) return;
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) {
    const tt = i / SR, step = Math.floor(tt * 60) / 60, u = clamp01(step / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15;
    ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1;
    else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; }
    else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)), k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge;
  }
}
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => n(note), v: (u) => 1 - u * 0.7, gain });
const seq = (t, notes, step, o = {}) => notes.forEach((nn, i) => blip(t + i * step, nn, o.dur ?? step * 0.95, o.gain ?? 0.05, o.duty ?? 0.5));
const noise = (t, dur, f, v, gain) => tone(sfx, t, dur, { wave: "noise", f, v, gain });
const pop = (t, a = "C6", b = "G6", g = 0.03) => seq(t, [a, b], 0.05, { gain: g, duty: 0.25 });
const nope = (t, g = 0.035) => seq(t, ["E4", "C4"], 0.11, { gain: g, duty: 0.25, dur: 0.1 });
const sweep = (a, b, up, gain = 1, lo = 160, hi = 900) => { const fr = (u) => (up ? lo * Math.pow(hi / lo, u) : hi * Math.pow(lo / hi, u)); tone(sfx, a, b - a, { duty: 0.25, f: fr, v: env(0.15, 0.25), gain: 0.018 * gain }); tone(sfx, a, b - a, { wave: "tri", f: (u) => fr(u) / 2, v: env(0.12, 0.3), gain: 0.04 * gain }); };
const swish = (a, b, gain = 0.014) => noise(a, b - a, (u) => 2500 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), gain);
// a gunshot: noise crack + low thump, ~0.18 s (the length of the muzzle flash + kick)
const shot = (t, g = 1) => { noise(t, 0.16, (u) => 9000 - 7000 * u, (u) => Math.pow(1 - u, 1.6), 0.07 * g); tone(sfx, t, 0.14, { wave: "tri", f: (u) => 150 * Math.pow(0.4, u), v: (u) => 1 - u, gain: 0.12 * g }); };
// the headshot "dink": a bright metallic two-tone ping
const dink = (t, g = 1) => { tone(sfx, t, 0.22, { duty: 0.125, f: () => 2350, v: (u) => Math.pow(1 - u, 2), gain: 0.03 * g }); tone(sfx, t, 0.18, { duty: 0.5, f: () => 3520, v: (u) => Math.pow(1 - u, 3), gain: 0.012 * g }); };
const died = (t, g = 1) => { seq(t, ["E5", "C5", "A4"], 0.13, { gain: 0.04 * g, duty: 0.5, dur: 0.12 }); tone(sfx, t + 0.39, 0.45, { wave: "tri", f: (u) => n("E4") * Math.pow(0.94, u), v: (u) => 1 - u, gain: 0.06 * g }); };
// sonar "ping": a pure-ish tone with a long decay and a faint echo
const sonar = (t, g = 1) => { tone(sfx, t, 0.6, { wave: "tri", f: () => 1760, v: (u) => Math.pow(1 - u, 2.2), gain: 0.07 * g }); tone(sfx, t + 0.28, 0.4, { wave: "tri", f: () => 1760, v: (u) => Math.pow(1 - u, 2.4), gain: 0.02 * g }); };
const steps = (a, b, hz, g = 1) => { for (let t = a; t < b; t += 1 / hz) noise(t, 0.035, () => 2200, (u) => 1 - u, 0.025 * g); };
const zap = (a, b, up, g = 1) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => (up ? 600 + 500 * u : 1100 - 500 * u) * (1 + 0.04 * Math.sin(tt * 70)), v: env(0.1, 0.15), gain: 0.014 * g });

// ---- the hook: push into the monitor, strafe, the shot from nowhere, YOU DIED
sweep(EV.push[0], EV.push[1], true, 0.7, 140, 700);
steps(EV.strafe[0], EV.strafe[1], 7, 1);
shot(EV.still - 0.02, 0.8); dink(EV.still); noise(EV.still, 0.3, () => 600, (u) => 1 - u, 0.03);
died(EV.died);
// through the screen to his face: a short static glitch lasting the dissolve; "annoying": a low grumble
noise(EV.faceIn[0] - 0.18, EV.faceIn[1] + 0.12 - (EV.faceIn[0] - 0.18), () => 12000, env(0.2, 0.3), 0.02);
tone(sfx, EV.annoyed, 0.32, { duty: 0.25, f: (u) => 110 - 25 * u, v: env(0.1, 0.3), gain: 0.03 });
// out to the room, the bug skitters and gets crossed out, then the PING
sweep(EV.faceOut[0], EV.faceOut[1] + 0.5, false, 0.6, 200, 800);
for (let t = EV.bug - 0.3; t < EV.notBug; t += 0.06) noise(t, 0.012, () => 6000, () => 1, 0.008);
nope(EV.notBug);
sonar(EV.ping0);
// pull back and pan to the server; the sign lights up; FAR AWAY
swish(EV.toServer[0], EV.toServer[1], 0.016); sweep(EV.toServer[0], EV.toServer[1], false, 0.4, 150, 500);
tone(sfx, EV.server - 0.1, 0.3, { duty: 0.5, f: (u, tt) => 120 + 3 * Math.sin(tt * 300), v: env(0.1, 0.3), gain: 0.02 }); seq(EV.server + 0.12, ["C6", "E6", "G6"], 0.05, { gain: 0.025, duty: 0.25 });
pop(EV.far, "G5", "D6", 0.02);
// your packet: there (rising zap) and back (falling zap); a tick when it arrives
zap(EV.every, EV.there + 0.05, true, 1); blip(EV.there + 0.05, "A6", 0.06, 0.03, 0.25);
zap(EV.there + 0.05, EV.back + 0.35, false, 1); blip(EV.back + 0.35, "E6", 0.06, 0.03, 0.25);
// the round trip counter ticks, then YOUR PING
for (let t = EV.trip; t < EV.time + 0.3; t += 0.125) blip(t, "C7", 0.02, 0.012, 0.125);
pop(EV.yourPing, "C6", "G6", 0.03);
// to the enemy; HIS PING (low warning)
swish(EV.toEnemy[0], EV.toEnemy[1], 0.014);
seq(EV.high, ["A3", "A3"], 0.16, { gain: 0.035, duty: 0.25, dur: 0.12 });
// into his room, his screen pops; LATE; YOU; he shoots
sweep(EV.intoEnemy[0], EV.intoEnemy[1] + 0.3, true, 0.6, 150, 600); pop(EV.sees - 0.1, "E5", "B5", 0.025);
seq(EV.late, ["F5", "F5"], 0.12, { gain: 0.025, duty: 0.5, dur: 0.07 });
blip(EV.hisScreen, "E6", 0.05, 0.02, 0.25);
shot(EV.shoots, 1); blip(EV.shoots + 0.08, "C7", 0.05, 0.02, 0.125);
// his shot travels to the server; the dive into the server's map
zap(EV.shotTravel[0], EV.shotTravel[1], false, 1.2);
sweep(EV.dive[0], EV.dive[1], false, 0.8, 120, 900);
blip(EV.byNow, "G5", 0.06, 0.02, 0.25);
// the rewind: a tape-rewind warble lasting exactly the rewind
tone(sfx, EV.rewind[0], EV.rewind[1] - EV.rewind[0], { duty: 0.25, f: (u, tt) => 700 + 300 * Math.sin(tt * 38) - 250 * u, v: env(0.1, 0.1), gain: 0.016 });
noise(EV.rewind[0], EV.rewind[1] - EV.rewind[0], (u, tt) => 3000 + 1500 * Math.sin(tt * 19), env(0.1, 0.1), 0.008);
seq(EV.fired - 0.05, ["C6", "C6", "C6"], 0.07, { gain: 0.012, duty: 0.125, dur: 0.03 });
blip(EV.backThen, "A5", 0.08, 0.025, 0.5);
// the hit counts
shot(EV.hit - 0.02, 0.7); seq(EV.hit + 0.08, ["C5", "E5", "G5", "C6"], 0.06, { gain: 0.03, duty: 0.25 });
// the news travels back; you die behind the wall
sweep(EV.newsTravel[0], EV.newsTravel[0] + 0.55, true, 0.6, 150, 700); zap(EV.newsTravel[0] + 0.2, EV.newsTravel[1], false, 1);
pop(EV.newsTravel[1] - 0.2, "E5", "B5", 0.02); dink(EV.die - 0.05, 0.9); died(EV.die + 0.2, 0.8);
// lag compensation: a stab; ON PURPOSE stamp
sweep(EV.wall3 + 0.6, EV.lagComp + 0.3, false, 0.4, 200, 600);
seq(EV.lagComp, ["A4", "C5", "E5", "A5"], 0.05, { gain: 0.03, duty: 0.5 });
tone(sfx, EV.purpose - 0.05, 0.12, { wave: "tri", f: (u) => 180 * Math.pow(0.5, u), v: (u) => 1 - u, gain: 0.09 }); noise(EV.purpose - 0.05, 0.06, () => 4000, (u) => 1 - u, 0.03);
// without it: footsteps of the runner, the shot, MISS
pop(EV.without - 0.15, "E5", "B5", 0.02); steps(EV.without, EV.miss + 0.4, 6, 0.6);
shot(EV.perfectly + 0.15, 0.8); tone(sfx, EV.miss - 0.02, 0.5, { duty: 0.5, f: (u) => 330 * Math.pow(0.6, u), v: env(0.05, 0.3), gain: 0.03 });
// can't fix his ping / your ping counts too
nope(EV.hisPing - 0.1, 0.03); pop(EV.counts2, "C6", "G6", 0.025);
// the server picker; the cable and the plug; not Wi-Fi
pop(EV.pick - 0.15, "E5", "B5", 0.02); seq(EV.closest - 0.15, ["G5", "A5"], 0.15, { gain: 0.02, duty: 0.25, dur: 0.05 }); seq(EV.closest + 0.3, ["C6", "G6"], 0.06, { gain: 0.03, duty: 0.25 });
noise(EV.cable - 0.45, 0.5, () => 1500, env(0.2, 0.2), 0.012); tone(sfx, EV.cable + 0.02, 0.05, { duty: 0.25, f: () => 1200, v: (u) => 1 - u, gain: 0.05 }); noise(EV.cable + 0.02, 0.03, () => 8000, (u) => 1 - u, 0.04);
nope(EV.wifi, 0.03);
// send: the paper plane whooshes for its whole flight; the friend dies too; SENT
const p0 = EV.send + 0.05, p1 = EV.dies + 0.15; noise(p0, p1 - p0, (u) => 1800 + 2500 * Math.sin(Math.PI * u), (u) => 0.4 + 0.6 * Math.sin(Math.PI * u), 0.016);
tone(sfx, p0, p1 - p0, { wave: "tri", f: (u) => 400 + 300 * Math.sin(Math.PI * u), v: env(0.15, 0.2), gain: 0.02 });
dink(EV.dies, 0.7); seq(EV.dies + 0.2, ["E5", "C5"], 0.13, { gain: 0.025, duty: 0.5, dur: 0.12 });
seq(p1 + 0.15, ["E6", "A6"], 0.08, { gain: 0.03, duty: 0.25 });

// ---- chiptune bed: Am – F – C – G, 112 BPM; soft under the hook, steady in the explanation, a cadence at the end
const BPM = 112, BEAT = 60 / BPM, BAR = BEAT * 4, prog = [[45, 48, 52], [41, 45, 48], [48, 52, 55], [43, 47, 50]];
const endBar = Math.floor((END - 1.2) / BAR);
const section = (t) => (t < EV.faceOut[0] ? "soft" : t > EV.dive[0] && t < EV.newsTravel[0] ? "sparse" : "full");
for (let bar = 0; bar <= endBar; bar++) {
  const ch = bar === endBar ? [45, 48, 52] : prog[bar % 4], t0 = bar * BAR;
  if (bar === endBar) { // final A-minor chord, ringing out to the end
    for (const [i, m] of ch.entries()) tone(bed, t0 + i * 0.03, END - t0 - 0.05, { wave: i ? "pulse" : "tri", duty: 0.25, f: () => NOTE(m + (i ? 12 : -12)), v: (u) => Math.pow(1 - u, 1.4), gain: i ? 0.02 : 0.1 });
    break;
  }
  for (let e = 0; e < 8; e++) { const t = t0 + (e * BEAT) / 2, s = section(t); if (s !== "full" && e % 2) continue;
    tone(bed, t, (s === "full" ? BEAT / 2 : BEAT) * 0.9, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.5 * u, gain: s === "full" ? 0.1 : 0.07 }); }
  for (let s16 = 0; s16 < 16; s16++) { const t = t0 + (s16 * BEAT) / 4, s = section(t); if (s === "sparse" && s16 % 4) continue;
    if (s === "full" || s16 % 2 === 0) tone(bed, t, (BEAT / 4) * (s === "full" ? 0.8 : 1.6), { duty: 0.125, f: () => NOTE(ch[(s16 >> (s === "full" ? 0 : 1)) % 3] + 24 + (s16 >= 12 ? 12 : 0)), v: (u) => 1 - 0.7 * u, gain: s === "full" ? 0.024 : 0.018 });
    if (s16 % 4 === 2 && s === "full") tone(bed, t, 0.03, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.016 });
    if (s16 % 8 === 0 && s === "full") tone(bed, t, 0.06, { wave: "noise", f: () => 600, v: (u) => 1 - u, gain: 0.03 }); }
}
function lowpass(buf, hz) { const a = 1 - Math.exp((-2 * Math.PI * hz) / SR); let y = 0; for (let i = 0; i < buf.length; i++) { y += a * (buf[i] - y); buf[i] = y; } }
lowpass(sfx, 9000); lowpass(bed, 7000);
function writeWav(file, buf) { const len = Math.ceil(END * SR), out = Buffer.alloc(44 + len * 2); out.write("RIFF", 0); out.writeUInt32LE(36 + len * 2, 4); out.write("WAVEfmt ", 8); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write("data", 36); out.writeUInt32LE(len * 2, 40); for (let i = 0; i < len; i++) out.writeInt16LE(Math.round(Math.max(-1, Math.min(1, buf[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, out); }
fs.mkdirSync(HERE + "audio", { recursive: true });
writeWav(HERE + "audio/sfx.wav", sfx); writeWav(HERE + "audio/bed.wav", bed);
let pk = 0; for (const v of sfx) pk = Math.max(pk, Math.abs(v)); console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3), "bars", endBar);
