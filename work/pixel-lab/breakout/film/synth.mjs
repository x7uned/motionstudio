// 8-bit sound for «Breakout's paddle shrinks at the worst moment»: every cue is synthesised (synth-core.mjs, frozen copy
// via claw-machine) and comes from the same event lists as the picture (game.mjs): each paddle hit, brick hit (pitch by
// row, higher rows higher), side-wall and top-wall bounce of the simulated ball; the breakout zap and the paddle shrink
// (a falling sweep exactly as long as the shrink), the lost ball, the serve and the regrow, the gauge steps on hits 4 and
// 12 and the jump to TOP, the fast-forward whir, the plastic strips peeling and sticking back, the melting walls (a
// counting tone), the second wall building row by row, 896 MAX, the tags, the four-part card and the follow card.
// Not original game sounds. Bed: a light chiptune in A minor ending on E7 → A major. Writes audio/sfx.wav, audio/bed.wav.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, FF1, CUT, CLEAR1, BUILD2, CLEAR2, SEG3, STRIPS, CARD4, MAXT } from "./timeline.mjs";
import * as G from "./game.mjs";
import { SHRINK_S } from "./sim.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const ffGain = (t) => (t > FF1.a && t < FF1.b && G.rate(t) > 2 ? 0.55 : 1);
const live = (t) => t >= 0 && t < END - 0.1;

// ---------------------------------------------------------------- the simulated game
for (const h of G.HITS) if (live(h.t)) { const g = ffGain(h.t); tone(sfx, h.t, 0.06, { duty: 0.5, f: () => n("A4"), v: (u) => 1 - u * 0.6, gain: 0.03 * g }); tone(sfx, h.t, 0.05, { wave: "tri", f: () => n("A3"), v: (u) => 1 - u, gain: 0.04 * g }); }
const ROWN = ["E6", "D6", "C6", "A5", "G5", "E5", "D5", "C5"];
for (const b of G.BRICKS) if (b.hit1 && live(b.gone1)) { const g = ffGain(b.gone1); blip(b.gone1, ROWN[b.row], 0.06, 0.022 * g, 0.25); }
for (const t of G.WALLS) if (live(t)) tone(sfx, t, 0.035, { wave: "tri", f: () => n("E3"), v: (u) => 1 - u, gain: 0.03 * ffGain(t) });
for (const t of G.TOPS) if (live(t) && Math.abs(t - G.SHRINK1) > 0.01 && Math.abs(t - G.SHRINK2) > 0.01) blip(t, "B5", 0.04, 0.014 * ffGain(t), 0.125);
// breakouts: a zap on the top wall, then the paddle shrinks (falling sweep, exactly SHRINK_S long)
for (const t of [G.SHRINK1, G.SHRINK2]) {
  tone(sfx, t, 0.16, { duty: 0.25, f: (u) => 600 * Math.pow(3, u), v: env(0.05, 0.4), gain: 0.02 }); noise(t, 0.08, () => 7000, (u) => 1 - u, 0.02);
  tone(sfx, t + 0.02, SHRINK_S, { duty: 0.5, f: (u) => 520 * Math.pow(0.45, u), v: env(0.1, 0.25), gain: 0.022 }); tone(sfx, t + 0.02, SHRINK_S, { wave: "tri", f: (u) => 260 * Math.pow(0.45, u), v: env(0.1, 0.25), gain: 0.03 });
}
// the hook's cut line on "cut in half": two snips
for (const dt of [0, 0.12]) { noise(EV.cut + dt, 0.04, () => 5200, (u) => 1 - u, 0.025); blip(EV.cut + dt, "G6", 0.03, 0.012, 0.25); }
// the lost ball: uh-oh and a fall as it leaves under the bezel
blip(G.LOST1 + 0.02, "E5", 0.1, 0.018, 0.25); blip(G.LOST1 + 0.14, "C5", 0.16, 0.018, 0.25);
tone(sfx, G.LOST1 + 0.05, 0.5, { wave: "tri", f: (u) => 700 * Math.pow(0.25, u), v: env(0.1, 0.3), gain: 0.03 });
// serve 2: the ball dissolves in, the paddle grows back (rising sweep, as long as the regrow)
seq(G.SERVE2, ["C5", "E5", "G5"], 0.07, { gain: 0.016, duty: 0.25 });
tone(sfx, G.REGROW[0], G.REGROW[1] - G.REGROW[0], { duty: 0.5, f: (u) => 230 * Math.pow(2.2, u), v: env(0.15, 0.25), gain: 0.018 });
// serve 3 (empty field): the ball dissolves back in
seq(SEG3, ["E5", "A5"], 0.08, { gain: 0.014, duty: 0.25 });

// ---------------------------------------------------------------- the speed gauge
tone(sfx, EV.speeds - 0.5, 0.5, { wave: "tri", f: (u) => 300 + 300 * u, v: env(0.3, 0.3), gain: 0.02 });                     // gauge lights up
for (let i = 0; i < 3; i++) blip(EV.times - 0.2 + i * 0.12, ["C6", "E6", "G6"][i], 0.06, 0.012, 0.25);                      // the pulse over its 4 steps
for (const [t, notes] of [[G.HIT4, ["C5", "G5"]], [G.HIT12, ["E5", "B5"]]]) { tone(sfx, t, 0.25, { duty: 0.25, f: (u) => n(notes[0]) * Math.pow(n(notes[1]) / n(notes[0]), u), v: env(0.1, 0.3), gain: 0.02 }); }
{ const t = G.ORANGE_T; tone(sfx, t, 0.25, { duty: 0.25, f: (u) => 300 * Math.pow(6, u), v: env(0.05, 0.3), gain: 0.024 }); seq(t + 0.06, ["A5", "C6", "E6", "A6"], 0.05, { gain: 0.016, duty: 0.125 }); }
// TOP pulsing on "fastest": a soft repeated high tick while the sector pulses (one per pulse)
for (let t = EV.fastest - 0.2 + Math.PI / 24; t < EV.but - 0.1; t += (2 * Math.PI) / 12) blip(t, "A6", 0.04, 0.005, 0.125);

// ---------------------------------------------------------------- fast-forwards (a tape whir)
const whir = (a, b, g = 1) => { noise(a, b - a, (u) => 3000 + 2500 * Math.sin(Math.PI * u), env(0.15, 0.2), 0.006 * g); tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 880 + 120 * Math.sin(tt * 40), v: env(0.15, 0.2), gain: 0.004 * g }); };
whir(FF1.a + 2.95, FF1.b - 0.05); whir(CUT - 0.05, SEG3 + 0.15);
// melting walls: a counting tone that steps with the score
for (const [a, b, base] of [[CLEAR1[0], CLEAR1[1], 57], [CLEAR2[0], CLEAR2[1], 64]]) { for (let t = a, k = 0; t < b; t += 1 / 24, k++) blip(t, NOTE(base + (k % 12) + Math.floor((k / 24) * 4)), 0.035, 0.008, 0.25); }
blip(CLEAR1[1] + 0.02, "A6", 0.18, 0.016, 0.25);                                                                          // 448
for (let r = 0; r < 8; r++) blip(BUILD2[0] + r * 0.085 + 0.1, ROWN[r], 0.12, 0.012, 0.125);                                // wall 2 rows dissolve in
blip(CLEAR2[1] + 0.02, "C7", 0.2, 0.016, 0.25);                                                                           // 896

// ---------------------------------------------------------------- the plastic strips
for (let k = 0; k < 4; k++) {
  const a = STRIPS.off[0] + k * 0.09; noise(a, 0.62, (u) => 1600 + 3600 * u, (u) => Math.sin(Math.PI * u), 0.008);           // peel off
  tone(sfx, a, 0.06, { wave: "tri", f: () => 900 - k * 80, v: (u) => 1 - u, gain: 0.012 });
  const b = STRIPS.back[0] + (3 - k) * 0.09; swish(b, b + 0.7, 0.007); noise(b + 0.66, 0.04, () => 2600, (u) => 1 - u, 0.02); tone(sfx, b + 0.66, 0.05, { wave: "tri", f: () => 220, v: (u) => 1 - u, gain: 0.03 }); // slide back, stick
}

// ---------------------------------------------------------------- overlays
const pop = (t, g = 1) => { tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g }); };
for (const t of [G.SHRINK1 + 0.32, G.SHRINK2 + 0.34, G.ORANGE_T + 0.08, EV.fastest - 0.1, STRIPS.tag[0], BUILD2[0] + 0.1, MAXT.max]) pop(t);
// four-part card: slide in, the paddle divides (one click per part), two balls in and out, slide away
swish(CARD4.in, CARD4.in + 0.3, 0.01);
for (let i = 0; i < 4; i++) { tone(sfx, EV.four - 0.05 + i * 0.1, 0.03, { duty: 0.25, f: () => n(["C6", "E6", "G6", "C7"][i]), v: (u) => 1 - u, gain: 0.014 }); }
for (const [a, h, o] of [[EV.part - 0.05, EV.hits2, EV.next1 + 0.1], [EV.not1 - 0.15, EV.came + 0.05, EV.in2 + 0.45]]) { swish(a, h, 0.005); tone(sfx, h, 0.07, { duty: 0.5, f: () => n("A4"), v: (u) => 1 - u * 0.6, gain: 0.03 }); tone(sfx, h + 0.02, o - h - 0.02, { duty: 0.25, f: (u) => 500 + 500 * u, v: env(0.1, 0.4), gain: 0.008 }); }
swish(CARD4.out - 0.3, CARD4.out, 0.008);
// 896 MAX
seq(MAXT.in, ["A5", "C6", "E6", "A6"], 0.07, { gain: 0.02, duty: 0.25 }); tone(sfx, MAXT.in + 0.28, 0.5, { wave: "tri", f: () => n("A5"), v: env(0.05, 0.6), gain: 0.03 });

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: A minor (Am F C G), 120 bpm
const BPM = 120, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < EV.happens - 0.2 ? "full" : t < EV.lose - 0.2 ? "tension" : t < EV.speeds - 0.2 ? "light" : t < EV.so1 - 0.2 ? "full" : t < EV.but - 0.2 ? "tension" : t < EV.colors - 0.2 ? "light" : t < EV.clear1 - 0.2 ? "soft" : t < EV.most - 0.2 ? "full" : t < EV.follow - 0.2 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], tensionProg: [[57, 60, 64], [56, 59, 64]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [64, 68, 71, 74];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(40 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(33), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [57, 61, 64, 69]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
