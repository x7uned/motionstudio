// 8-bit sound for «This slot machine already knows if you won»: every cue is synthesised (synth-core.mjs, frozen copy via
// casino-math) from the same constants as the picture (timeline.mjs / scene.mjs / casino-slot.mjs): the reel motor whir that
// follows the reels' real speed and lasts until the last reel stops, a ratchet tick for every stop that passes the payline
// (from reelPos), stop clunks, the button clicks, the casing dissolving, the ticker's soft digit rolls, the hall powering down
// and up, the grab and the flight of the number, the padlock click, the curtains, DUE? crossed out, the near-miss dings and
// the third reel creeping past, the ribbon unrolling, the machine's own happy jingle (the fake win sings like a real one),
// the $1 coin into the slot, the 50¢ into the tray, −50¢, the heartbeat, the two bars rising, STOP, the gold links and the
// follow card. Bed: the series' calm casino-lounge chiptune (Dm7 G7 Cmaj7 A7, swung, walking bass), cadence G7 → Cmaj7.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, SPINS, P0, PRESS1, PRESS2, PRESS4, STOP_PRESS, REACH, CUT, AWAY, DIM, GRAB, SHOW, DUE, NEAR, RIBBON, MUSIC, BET, PAY, WIN, HALF, HEART, BARS, LOCK4 } from "./timeline.mjs";
import { reelPos, reelSpeed } from "./casino-slot.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const clack = (t, g = 1, f = 3200) => { tone(sfx, t, 0.03, { wave: "noise", f: () => f, v: (u) => 1 - u, gain: 0.03 * g }); tone(sfx, t, 0.035, { wave: "tri", f: () => 1300, v: (u) => 1 - u, gain: 0.02 * g }); };
const thud = (t, g = 1, f = 110) => { tone(sfx, t, 0.12, { wave: "tri", f: (u) => f * (1 - 0.4 * u), v: (u) => 1 - u, gain: 0.06 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1800, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const button = (t, g = 1) => { clack(t - 0.02, 0.9 * g, 2600); tone(sfx, t, 0.05, { duty: 0.25, f: () => 420, v: (u) => 1 - u, gain: 0.014 * g }); };
const clamp01 = (v) => Math.max(0, Math.min(1, v));

// ---------------------------------------------------------------- the reels: motor whir (follows the speed), ratchet ticks, stop clunks
SPINS.forEach((sp, k) => {
  const tEnd = Math.max(...sp.stop), g = k === 0 ? 0.9 : 1;
  tone(sfx, sp.t0, tEnd - sp.t0, { duty: 0.125, f: (u, tt) => { const t = sp.t0 + tt, v = reelSpeed(t, 0, SPINS, P0[0]) + reelSpeed(t, 1, SPINS, P0[1]) + reelSpeed(t, 2, SPINS, P0[2]); return 70 + v * 2.2; }, v: (u, tt) => { const t = sp.t0 + tt; return Math.min(1, tt / 0.08, (reelSpeed(t, 0, SPINS, P0[0]) + reelSpeed(t, 1, SPINS, P0[1]) + reelSpeed(t, 2, SPINS, P0[2])) / 40); }, gain: 0.012 * g });
  noise(sp.t0, tEnd - sp.t0, () => 900, (u, tt) => { const t = sp.t0 + tt; return Math.min(1, (reelSpeed(t, 0, SPINS, P0[0]) + reelSpeed(t, 1, SPINS, P0[1]) + reelSpeed(t, 2, SPINS, P0[2])) / 50); }, 0.004 * g);
  sp.stop.forEach((ts, r) => { thud(ts, 0.8 * g, 130 - r * 12); clack(ts, 0.7 * g, 3000 - r * 300); });
});
// ratchet: a tiny tick each time a stop passes the payline (sampled from the reel positions; dense ticks thinned)
for (let r = 0; r < 3; r++) { let prev = Math.floor(reelPos(0, r, SPINS, P0[r])), last = -1; for (let t = 0; t < END; t += 0.002) { const p = Math.floor(reelPos(t, r, SPINS, P0[r])); if (p !== prev) { if (t - last > 0.07) { tone(sfx, t, 0.012, { wave: "noise", f: () => 5200 - r * 600, v: (u) => 1 - u, gain: 0.006 }); last = t; } prev = p; } } }

// ---------------------------------------------------------------- the first act: reach, casing dissolves, digits, the hall dims
swish(REACH.t0 < 0 ? 0 : REACH.t0, REACH.t1, 0.004);
for (let k = 0; ; k++) { const t = (Math.PI / 2 + 2 * Math.PI * k) / 5.5 - 0.12; if (t > EV.inside - 0.2) break; if (t >= 0) tone(sfx, t, 0.24, { duty: 0.25, f: () => NOTE(81), v: (u) => Math.sin(Math.PI * u), gain: 0.006 }); }   // the screen's "?" pulses
tone(sfx, CUT.in0, CUT.in1 - CUT.in0, { duty: 0.125, f: (u) => 1800 - 1200 * u, v: env(0.1, 0.3), gain: 0.008 }); for (let i = 0; i < 8; i++) blip(CUT.in0 + (i / 8) * (CUT.in1 - CUT.in0), NOTE(84 - i * 2), 0.04, 0.005, 0.125);
tone(sfx, CUT.out0, CUT.out1 - CUT.out0, { duty: 0.125, f: (u) => 600 + 1200 * u, v: env(0.1, 0.3), gain: 0.007 });
// the ticker rolls: a soft digital chatter while the inside is visible (one blip per roll of the first two columns)
for (let t = CUT.in1, i = 0; t < CUT.out0; t += 0.143, i++) blip(t, NOTE(88 + ((i * 5) % 7)), 0.025, 0.0035 + 0.003 * (t > DIM.in0 && t < DIM.out1 ? 1 : 0), 0.125);
tone(sfx, DIM.in0, DIM.in1 - DIM.in0 + 0.2, { duty: 0.25, f: (u) => 520 - 340 * u, v: env(0.1, 0.4), gain: 0.012 }); tone(sfx, DIM.in0, DIM.in1 - DIM.in0 + 0.2, { wave: "tri", f: (u) => 130 - 60 * u, v: env(0.1, 0.4), gain: 0.03 });
tone(sfx, DIM.out0, DIM.out1 - DIM.out0, { duty: 0.25, f: (u) => 200 + 400 * u, v: env(0.1, 0.3), gain: 0.01 });
for (const [a, b] of [[AWAY.t0, AWAY.t1], [AWAY.back0, AWAY.back1]]) for (let k = 0; k < 3; k++) tone(sfx, a + ((k + 0.5) / 3) * (b - a), 0.05, { wave: "noise", f: () => 700, v: (u) => 1 - u, gain: 0.012 });

// ---------------------------------------------------------------- buttons
for (const tp of [PRESS1, PRESS2, PRESS4]) button(tp);
button(STOP_PRESS, 1.1); tone(sfx, STOP_PRESS + 0.02, 0.09, { duty: 0.5, f: () => 330, v: (u) => 1 - u, gain: 0.012 });

// ---------------------------------------------------------------- the grab: a gold copy of the number flies up and locks
blip(GRAB.t0, "E6", 0.05, 0.02, 0.25); blip(GRAB.t0 + 0.05, "B6", 0.06, 0.018, 0.25);
tone(sfx, GRAB.fly0, GRAB.fly1 - GRAB.fly0, { duty: 0.25, f: (u) => 500 * Math.pow(2, u * 1.4), v: env(0.15, 0.25), gain: 0.008 }); swish(GRAB.fly0, GRAB.fly1, 0.006);
seq(GRAB.sym0, ["C6", "E6", "G6"], 0.09, { gain: 0.013, duty: 0.25 });
clack(GRAB.lock + 0.15, 0.8, 4200); tone(sfx, GRAB.lock + 0.17, 0.08, { wave: "tri", f: () => 900, v: (u) => 1 - u, gain: 0.02 });
// ---------------------------------------------------------------- SHOW: curtains in and out, a little "ta-da"
swish(SHOW.in, SHOW.in + 0.5, 0.01); seq(SHOW.in + 0.35, ["G5", "C6"], 0.11, { gain: 0.012, duty: 0.25 }); swish(SHOW.out, SHOW.out + 0.5, 0.008);
// ---------------------------------------------------------------- DUE? crossed out, the past games fade, NO MEMORY
whoosh(SHOW.out - 0.1, DUE.in + 0.45, false, 0.4);
pop(DUE.in); blip(DUE.strike, "D4", 0.1, 0.016, 0.5); blip(DUE.strike + 0.1, "C#4", 0.22, 0.014, 0.5); noise(DUE.strike, 0.35, (u) => 2500 + 2000 * u, (u) => 1 - u, 0.006);
swish(DUE.swap, DUE.swap + 0.35, 0.005); DUE.gone.forEach((t, i) => tone(sfx, t, 0.35, { duty: 0.25, f: (u) => (900 - i * 120) * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.008 }));
blip(DUE.memo, "A5", 0.08, 0.012, 0.25); blip(DUE.memo + 0.1, "E5", 0.14, 0.01, 0.25);
// ---------------------------------------------------------------- the near miss: dings on the 7s, the third creeps past, aww
whoosh(PRESS2 + 0.05, EV.watch + 0.1, true, 0.6);
blip(SPINS[1].stop[0] + 0.02, "E6", 0.18, 0.018, 0.25); blip(SPINS[1].stop[1] + 0.02, "G6", 0.18, 0.018, 0.25);
tone(sfx, NEAR.flag, 0.55, { duty: 0.5, f: (u) => 392 * Math.pow(2, -u * 0.6), v: env(0.05, 0.4), gain: 0.012 }); tone(sfx, NEAR.flag + 0.25, 0.5, { duty: 0.5, f: (u) => 330 * Math.pow(2, -u * 0.7), v: env(0.05, 0.5), gain: 0.011 });
whoosh(EV.so2 - 0.2, EV.close + 0.4, false, 0.4);
// ---------------------------------------------------------------- the ribbon unrolls; the blanks next to the 7 light up
noise(RIBBON.in0, RIBBON.in1 - RIBBON.in0, (u) => 1200 + 2400 * u, (u) => Math.sin(Math.PI * u), 0.008);
for (let t = RIBBON.in0 + 0.1; t < RIBBON.in1; t += 0.06) tone(sfx, t, 0.012, { wave: "noise", f: () => 6000, v: (u) => 1 - u, gain: 0.004 });
for (let i = 0; i < 6; i++) blip(RIBBON.lit + i * 0.05, NOTE(76 + (i % 3) * 2), 0.06, 0.009, 0.25);
noise(RIBBON.out0, RIBBON.out1 - RIBBON.out0, (u) => 3600 - 2400 * u, (u) => Math.sin(Math.PI * u), 0.007);

// ---------------------------------------------------------------- the machine's happy music (it plays like a real win)
{ const mel = [72, 76, 79, 84, 79, 76, 77, 81, 84, 81, 79, 76], step = 0.13;
  for (let t = MUSIC.t0, i = 0; t < WIN.t0 - 0.05; t += step, i++) tone(sfx, t, step * 0.8, { duty: 0.25, f: () => NOTE(mel[i % mel.length]), v: (u) => 1 - 0.6 * u, gain: 0.006 + 0.004 * clamp01((t - MUSIC.t0) / 1) });
  // the fake win: fanfare, ringing bells, a rising arpeggio loop until "lost"
  seq(WIN.t0, ["C6", "E6", "G6", "C7", "E7", "G7"], 0.06, { gain: 0.022, duty: 0.25 });
  const arp = [72, 76, 79, 84, 88, 84, 79, 76];
  for (let t = WIN.t0 + 0.4, i = 0; t < HALF.t0 - 0.03; t += 0.075, i++) tone(sfx, t, 0.065, { duty: i % 2 ? 0.125 : 0.25, f: () => NOTE(arp[i % 8] + (Math.floor(i / 8) % 2) * 5), v: (u) => 1 - 0.5 * u, gain: 0.016 });
  for (let t = WIN.t0 + 0.2, i = 0; t < HALF.t0 - 0.05; t += 0.11, i++) blip(t, i % 2 ? "E7" : "G7", 0.05, 0.007, 0.125);
  // "you lost half": the jingle sags and dies
  tone(sfx, HALF.t0, HALF.t1 - HALF.t0 + 0.2, { duty: 0.25, f: (u) => NOTE(84) * Math.pow(2, -u * 1.0), v: env(0.05, 0.5), gain: 0.014 });
  blip(HALF.t0 + 0.35, "D4", 0.12, 0.014, 0.5); blip(HALF.t0 + 0.47, "C#4", 0.2, 0.012, 0.5); }
// ---------------------------------------------------------------- $1 into the slot, 50¢ into the tray
swish(BET.take, BET.drop, 0.005); pop(BET.tag0);
clack(BET.slot - 0.02, 0.7, 5200); tone(sfx, BET.slot, 0.28, { duty: 0.5, f: (u) => 1400 - 900 * u, v: (u) => 1 - u, gain: 0.008 });
blip(PAY.t0, "B6", 0.04, 0.012, 0.125); for (let k = 0; k < 3; k++) { const t = PAY.land + k * 0.1 * Math.pow(0.6, k); clack(t, 0.8 - k * 0.22, 6200); tone(sfx, t, 0.07, { duty: 0.125, f: () => 2400, v: (u) => 1 - u, gain: 0.012 * (1 - k * 0.3) }); }
// ---------------------------------------------------------------- the heart: a fast heartbeat while the body "wins"
for (let k = 0; ; k++) { const t = HEART.t0 + k / 2.3; if (t > HEART.t1 - 0.2) break; for (const [dt, g] of [[0, 1], [0.22 / 2.3, 0.6]]) tone(sfx, t + dt, 0.11, { wave: "tri", f: (u) => 95 - 30 * u, v: (u) => 1 - u, gain: 0.05 * g }); }
// ---------------------------------------------------------------- the two bars
swish(BARS.in, BARS.in + 0.4, 0.008);
tone(sfx, BARS.sound, BARS.soundEnd - BARS.sound, { duty: 0.25, f: (u) => 330 * Math.pow(2, u * 1.4), v: env(0.05, 0.1), gain: 0.009 });
tone(sfx, BARS.real, BARS.realEnd - BARS.real, { duty: 0.125, f: (u) => 330 * Math.pow(2, u * 0.8), v: env(0.05, 0.1), gain: 0.008 });
swish(BARS.out, BARS.out + 0.4, 0.006);
// ---------------------------------------------------------------- STOP changes nothing: the lock, the links, the check
clack(LOCK4.t0 + 0.3, 0.6, 4200);
for (let r = 0; r < 3; r++) blip(LOCK4.link + 0.1 + r * 0.1, NOTE(79 + r * 4), 0.06, 0.012, 0.25);
seq(LOCK4.link + 0.4, ["C6", "G6"], 0.08, { gain: 0.014, duty: 0.25 });
// camera moves
whoosh(EV.then - 0.1, EV.bet - 0.2, true, 0.3); whoosh(EV.didEnd - 0.45, EV.stop - 0.05, true, 0.3); whoosh(EV.follow - 0.4, EV.follow + 0.8, false, 0.3);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: calm casino-lounge chiptune, swung, 92 bpm (Dm7 G7 Cmaj7 A7), same as film 1
const BPM = 92, BEAT = 60 / BPM, BAR = 4 * BEAT, SW = 0.62;
const PROG = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]];
const quiet = (t) => t > WIN.t0 - 0.1 && t < HALF.t0 + 0.2;          // the machine's own jingle plays there
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4], gq = (t) => (quiet(t) ? 0.45 : 1);
  const walk = [ch[0], ch[1], ch[2], ch[1]].map((m) => m - 12);
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.8, { wave: "tri", f: () => NOTE(walk[b]), v: (u) => 1 - 0.5 * u, gain: 0.085 * gq(t0 + b * BEAT) });
  for (const b of [1, 3]) for (const m of ch.slice(1)) tone(bed, t0 + b * BEAT + (b === 3 ? BEAT * (SW - 0.5) : 0), BEAT * 0.35, { duty: 0.125, f: () => NOTE(m + 12), v: (u) => 1 - 0.8 * u, gain: 0.011 * gq(t0 + b * BEAT) });
  for (let e = 0; e < 8; e++) { const t = t0 + Math.floor(e / 2) * BEAT + (e % 2 ? BEAT * SW : 0); tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: (e % 2 ? 0.006 : 0.009) * gq(t) }); }
  if (bar % 2 === 1 && !quiet(t0 + 2 * BEAT)) { const mel = [ch[3] + 24, ch[2] + 24, ch[1] + 24]; mel.forEach((m, i) => tone(bed, t0 + (2 + i * 0.5) * BEAT + (i % 2 ? BEAT * (SW - 0.5) : 0), BEAT * 0.45, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.03 })); }
}
// cadence: G7 → Cmaj7 held under the follow card, then the core's soft final chord and fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, G7 = [55, 59, 62, 65];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.125, f: () => NOTE(G7[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.014 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.8, { wave: "tri", f: () => NOTE(43 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.085 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 71]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
