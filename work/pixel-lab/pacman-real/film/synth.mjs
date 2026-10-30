// 8-bit sound for «How much would Pac-Man eat in our world» (IN OUR WORLD #3). Everything is synthesised by synth-core.mjs
// (frozen copy via mario-real/film2) from the same constants as the picture (scene.mjs, cta.mjs), each cue lasting its motion.
// OUR designs only — no waka-waka, no start tune, no siren or death sound of the original game: the chomp is a short noise
// «crunch» on a falling triangle thump (one per dot / watermelon, never faster than the picture), the ghosts' siren is a soft
// triangle drone with a slow wobble, the frightened hum a low pulsing square, the portal a tremolo swirl, the cut a
// whoosh-thump. Bed: a cheerful chiptune of our own (F Dm Bb C, 124 bpm, plucked arpeggio + walking bass + a light motif),
// softer in the slow-motion and top-down passages, cadence C → F under the follow card.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n, SR } from "./synth-core.mjs";
import { END, VOICE_END } from "./timeline.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { SOUND as S0, CUT } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const { E, GM, LAND, STOPS, BALL_T, GPORT, GHOSTS, PILE_T, PLACE, DOT_FLY, sPac, sGhost, S1, S2, SB, pacX, RUN0, XS } = S0;
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.012 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.008 * g }); };
const thud = (t, g = 1, f0 = 130, d = 0.14) => { tone(sfx, t, d, { wave: "tri", f: (u) => f0 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.07 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1200, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.3 * g, 200, 700); };
const sparkle = (t, g = 1) => seq(t, ["C7", "G6", "E7", "C7"], 0.045, { gain: 0.008 * g, duty: 0.125 });
/** OUR chomp: a crunchy noise tick over a short falling triangle (alternating two pitches a fourth apart) */
let chompK = 0;
const chomp = (t, g = 1, wet = false) => { const hi = chompK++ % 2 ? 1 : 0.75; noise(t, 0.035, () => 3200 * hi, (u) => 1 - u, 0.016 * g); tone(sfx, t, 0.07, { wave: "tri", f: (u) => (330 * hi) * (1 - 0.45 * u), v: (u) => 1 - u, gain: 0.05 * g }); if (wet) tone(sfx, t + 0.02, 0.05, { wave: "noise", f: () => 1400, v: (u) => 1 - u, gain: 0.008 * g }); };
const gulp = (t, d = 0.12, g = 1) => tone(sfx, t, d, { wave: "tri", f: (u) => 220 - 120 * Math.sin(Math.PI * u), v: env(0.15, 0.4), gain: 0.06 * g });
const swirl = (a, b, g = 1, lo = 220, hi = 480) => { tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => (lo + (hi - lo) * u) * (1 + 0.05 * Math.sin(tt * 34)), v: (u) => Math.min(1, u * 4, (1 - u) * 4) * (0.65 + 0.35 * Math.sin(u * 50)), gain: 0.011 * g }); noise(a, b - a, (u) => 900 + 1600 * u, (u) => Math.min(1, u * 3, (1 - u) * 3) * 0.6, 0.008 * g); };
/** OUR siren: a soft triangle drone, slow wobble (not a rising/falling square siren) */
const siren = (a, b, g = 1, f0 = 290, rate = 2.2) => tone(sfx, a, b - a, { wave: "tri", f: (u, tt) => f0 * (1 + 0.06 * Math.sin(tt * rate * Math.PI * 2)), v: (u) => Math.min(1, u * 6, (1 - u) * 6), gain: 0.018 * g });

// ---------------------------------------------------------------- the maze
for (let c = 4; c <= 19; c++) { const t = (c + 0.35 - GM.x0) / GM.v; if (t > 0.02 && t < GM.dive) chomp(t, 0.8); }
siren(0, CUT - 0.05, 0.8, 300, 2.0);
for (let i = 0; i < 6; i++) blip(E.seven1 + 0.05 + i * 0.22, i % 2 ? "E6" : "A6", 0.05, 0.006, 0.125);           // the watermelon icons flicker
pop(E.seven1 + 0.02, 1); blip(E.seven1 + 0.08, "C7", 0.08, 0.008, 0.25);
swirl(E.bring, CUT, 1.1, 180, 520); tone(sfx, E.bring, 0.4, { wave: "tri", f: (u) => 110 + 300 * u, v: env(0.1, 0.4), gain: 0.04 });
whoosh(GM.dive, CUT, true, 0.9);
// ---------------------------------------------------------------- the HARD CUT: whoosh-thump into the street; the arrival
thud(CUT, 1.4, 90, 0.25); noise(CUT, 0.18, (u) => 3000 - 2000 * u, (u) => 1 - u, 0.03);
tone(sfx, CUT, 7.25 - CUT, { wave: "tri", f: (u, tt) => 70 + 6 * Math.sin(tt * 3.1), v: (u) => Math.min(1, (1 - u) * 3), gain: 0.035 }); sweep(6.75, 7.25, false, 0.5, 140, 900);
whoosh(CUT + 0.02, LAND - 0.03, false, 0.5); thud(LAND, 1.2, 120); gulp(LAND + 0.02, 0.1, 0.5);
// a light 8-bit market murmur: quiet, sparse talk-like blips in the city (not under the top-down shot)
for (let t = CUT + 0.4; t < END - 0.5; t += 0.19) { if (t > 54.0 && t < 65.6) continue; const r = Math.sin(t * 91.7) * 43758.5 % 1, rr = (r + 1) % 1; if (rr < 0.45) continue; tone(sfx, t, 0.05 + 0.05 * rr, { duty: 0.5, f: (u) => 240 + 260 * rr + 40 * Math.sin(u * 6), v: (u) => (1 - u) * 0.8, gain: 0.0035 }); }
// 1.7 m
for (let i = 0; i < 6; i++) tick(E.one17 - 0.22 + i * 0.075, 0.6, i % 2 === 0); pop(E.one17 + 0.05);
// the game window, the 13-cell ruler, the 2-cell dot
swish(E.arcade - 0.15, E.arcade + 0.25, 0.011); seq(E.arcade + 0.1, ["F6", "C7"], 0.06, { gain: 0.012, duty: 0.25 });
for (let i = 0; i < 13; i++) tick(E.thirteen - 0.25 + (i / 13) * 0.5, 0.5, i % 2 === 0); pop(E.thirteen + 0.25, 0.8);
for (let i = 0; i < 2; i++) tick(E.two1 - 0.2 + i * 0.18, 0.7); pop(E.two1 + 0.2, 0.8);
// the dot flies out and becomes a watermelon; 26 cm; he puts it down
whoosh(DOT_FLY[0], DOT_FLY[1], false, 0.6); thud(DOT_FLY[1], 0.6, 200, 0.08); sparkle(DOT_FLY[1] + 0.02, 0.8);
pop(E.tw26 + 0.05); swish(E.arcade + 5.5, E.arcade + 5.9, 0.006);
thud(PLACE[1], 0.6, 170, 0.08);
// 1 m
pop(E.level1 + 0.1, 0.9); blip(E.level1 + 0.15, "G6", 0.06, 0.007, 0.25);
// ---------------------------------------------------------------- the eating run: one chomp per watermelon, gulps in slow motion
const eatT = (X) => { let lo = RUN0, hi = 54; if (pacX(hi) < X - 0.4) return null; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (pacX(m) >= X - 0.4) hi = m; else lo = m; } return hi; };
let lastChomp = -1;
for (let X = 2; X < 70; X++) { const t = eatT(X); if (t === null || t > 48.4) continue; if (Math.abs(X - S0.BALL_X) < 1.0) continue; if (t - lastChomp < 0.12) continue; chomp(t, 0.9, true); lastChomp = t; }
for (const [a, b] of STOPS) gulp(a, Math.max(0.09, b - a + 0.06), 0.7);
// 25 km/h: the gauge needle (rising tick run), speed whoosh at the start
whoosh(RUN0 + 0.1, RUN0 + 0.6, true, 0.6);
for (let i = 0; i < 8; i++) tick(E.tw25 - 0.1 + i * 0.07, 0.4, i % 2 === 0); blip(E.tw25 + 0.5, "A6", 0.08, 0.008, 0.25);
// slow motion: a long falling swoop in, a rising swoop out
sweep(23.55, 23.95, false, 0.6, 180, 700); sweep(25.85, 26.2, true, 0.6, 180, 700);
// 6.7 / s: the one-second ring and the counter (a tick per whole melon)
{ const t0 = E.seven2 - 0.25; for (let k = 1; k <= 6; k++) { const u = (() => { let lo = 0, hi = 1; for (let q = 0; q < 30; q++) { const m = (lo + hi) / 2, e = m < 0.5 ? 4 * m ** 3 : 1 - (-2 * m + 2) ** 3 / 2; if (6.7 * e >= k) hi = m; else lo = m; } return hi; })(); tick(t0 + u, 0.7); } blip(t0 + 1.0, "C7", 0.1, 0.01, 0.25); }
// dissolves between shots (a soft swish)
for (const t of [28.45, 33.75, 54.0, 65.45]) swish(t, t + 0.35, 0.006);
// 240 → bins fill (a tick per 20 melons), the scale clunks, ≈2 t; the car scale clunk
for (let k = 1; k <= 12; k++) { const m = k * 20, u = (() => { let lo = 0, hi = 1; for (let q = 0; q < 30; q++) { const x = (lo + hi) / 2, e = x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2; if (240 * e >= m) hi = x; else lo = x; } return hi; })(); const t = PILE_T[0] + u * (PILE_T[1] - PILE_T[0]); tick(t, 0.6, k % 2 === 0); tone(sfx, t, 0.04, { wave: "tri", f: () => 260 + 8 * k, v: (u2) => 1 - u2, gain: 0.02 }); }
thud(PILE_T[1] + 0.02, 1.0, 95, 0.2); noise(PILE_T[1] + 0.02, 0.08, () => 2200, (u) => 1 - u, 0.012); blip(E.twoT + 0.05, "E6", 0.09, 0.01, 0.25);
thud(E.heavier - 0.05, 0.9, 105, 0.18); blip(E.heavier + 0.1, "C6", 0.09, 0.01, 0.25);
// ---------------------------------------------------------------- the ghosts come through the air portal; the chase
swirl(GPORT.open[0], GPORT.close[1], 1, 200, 420);
for (const [, te] of GHOSTS) { whoosh(te, te + 0.55, false, 0.45); thud(te + 0.55, 0.45, 160, 0.07); }
siren(36.7, E.blinky - 0.1, 0.9, 300, 2.2); siren(E.blinky - 0.1, BALL_T, 1.1, 360, 3.4);     // Blinky's own faster drone once he is angry
swish(E.ghosts1 - 0.2, E.ghosts1 + 0.2, 0.009); pop(E.ghosts1 + 0.05, 0.9);
sweep(E.t37 - 0.1, E.t37 + 0.6, true, 0.5, 250, 900); pop(E.t37 + 0.1, 0.8);
sweep(E.t36 - 0.1, E.t36 + 0.6, true, 0.4, 230, 820); pop(E.t36 + 0.1, 0.8);
// the 1 m big dot rolls in, he swallows it, the frightened hum (blue), flashing, back to normal
noise(46.4, 0.6, (u, tt) => 300 + 120 * Math.sin(tt * 30), (u) => Math.sin(Math.PI * u) * 0.8, 0.012); thud(47.0, 0.5, 140, 0.08);
gulp(BALL_T, 0.25, 1.4); thud(BALL_T + 0.02, 0.8, 80, 0.2);
tone(sfx, BALL_T + 0.1, 51.25 - BALL_T - 0.1, { duty: 0.5, f: (u, tt) => 150 + 30 * Math.sin(tt * 2 * Math.PI * 6), v: (u) => Math.min(1, u * 8, (1 - u) * 8), gain: 0.009 });
tone(sfx, 50.35, 0.85, { duty: 0.25, f: (u, tt) => (Math.sin(tt * 2 * Math.PI * 2.6) > 0 ? 520 : 390), v: (u) => Math.min(1, u * 6, (1 - u) * 6), gain: 0.006 });
blip(E.six - 0.05, "G6", 0.08, 0.009, 0.25);
for (let t = BALL_T + 0.3, i = 0; t < 51.0; t += 0.28, i++) chomp(t, 0.35);                                        // he chases them, eating
// LEVEL 19 · 0 s window: he eats a big dot, nothing happens
swish(E.from - 0.15, E.from + 0.2, 0.01); pop(E.nineteen, 0.9); for (let i = 0; i < 6; i++) chomp(E.from + 0.35 + i * 0.27, 0.35); blip(E.dont, "C5", 0.18, 0.012, 0.5);
// ---------------------------------------------------------------- the crossroads from above
const tAt = (fn, s) => { let lo = 53.8, hi = 66; for (let k = 0; k < 40; k++) { const m = (lo + hi) / 2; if (fn(m) >= s) hi = m; else lo = m; } return hi; };
siren(54.3, 62.4, 0.6, 280, 1.4);
for (let i = 0; i < 8; i++) tick(E.ghosts3 + i * 0.13, 0.4, i % 2 === 0); blip(E.middle + 0.05, "E6", 0.1, 0.012, 0.25); blip(E.middle + 0.2, "B5", 0.1, 0.01, 0.25);
{ const a = tAt(sPac, S1), b = tAt(sPac, S2); sweep(a, b + 0.1, true, 0.6, 300, 1100); noise(a, b - a + 0.1, (u) => 2000 + 3000 * u, (u) => Math.sin(Math.PI * u), 0.01); }    // the corner whoosh (his cut)
{ const tb = tAt((t) => sGhost(0, t), SB); thud(tb, 0.4, 180, 0.06); blip(tb + 0.02, "F5", 0.08, 0.008, 0.5); }                                                                  // Blinky turns at the middle
for (let i = 0; i < 6; i++) tick(E.distance - 0.5 + i * 0.09, 0.5, i % 2 === 0); pop(E.distance - 0.1, 0.9);
whoosh(62.3, 63.2, true, 1.0); for (let t = 62.4; t < 65.2; t += 0.14) chomp(t, 0.25);
sparkle(E.corners + 0.05, 1.1); pop(E.corners, 1);
// ---------------------------------------------------------------- the ending: the portal blinks, the spiky silhouette, NEXT, follow card
swirl(E.next - 0.05, END - 0.4, 0.8, 200, 300);
tone(sfx, E.sonic - 0.15, 0.4, { duty: 0.125, f: (u) => 900 + 900 * u, v: env(0.1, 0.4), gain: 0.008 }); pop(E.sonic + 0.05, 1);
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["F6", "C7"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006); blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["F6", "A6", "C7", "F7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "F7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: our own cheerful chiptune, 124 bpm, F Dm Bb C
const BPM = 124, BEAT = 60 / BPM, BAR = 4 * BEAT;
const PROG = [[53, 57, 60, 65], [50, 53, 57, 62], [46, 50, 53, 58], [48, 52, 55, 60]];
const MOTIF = [[0, 2, 0.5], [0.5, 3, 0.5], [1, 4, 1], [2.5, 3, 0.5], [3, 2, 1]];
const soft = (t) => (t > 23.6 && t < 26.0) || (t > 56.1 && t < 59.1) ? 0.45 : 1;                       // slow motion → softer
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4], g = soft(t0 + BAR / 2);
  for (const m of ch.slice(1)) tone(bed, t0, BAR * 0.98, { duty: 0.125, f: (u, tt) => NOTE(m + 12) * (1 + 0.002 * Math.sin(tt * 5)), v: (u) => Math.min(1, u / 0.25, (1 - u) / 0.25) * 0.6, gain: 0.006 });
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.7, { wave: "tri", f: () => NOTE(ch[[0, 2, 1, 2][b]] - 12), v: (u) => 1 - 0.6 * u, gain: 0.07 * g });
  for (let e = 0; e < 8; e++) { const m = ch[[0, 2, 1, 3, 2, 1, 3, 2][e]] + 24; tone(bed, t0 + (e * BEAT) / 2, BEAT * 0.26, { duty: 0.25, f: () => NOTE(m), v: (u) => 1 - 0.85 * u, gain: 0.009 * g }); }
  if (bar % 2 === 1 && g > 0.5) for (const [b, i, L] of MOTIF) { const m = i > 3 ? ch[0] + 12 : ch[i]; tone(bed, t0 + b * BEAT, L * BEAT * 0.85, { duty: 0.125, f: (u, tt) => NOTE(m + 24) * (1 + 0.004 * Math.sin(tt * 30)), v: (u) => 1 - 0.5 * u, gain: 0.006 }); }
  for (let b = 0; b < 4; b++) if (b % 2 === 1) tone(bed, t0 + b * BEAT, 0.05, { wave: "noise", f: () => 2600, v: (u) => 1 - u, gain: 0.016 * g });
  for (let e = 0; e < 8; e++) if (e % 2 === 1) tone(bed, t0 + (e * BEAT) / 2, 0.02, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.007 * g });
}
// cadence C → F under the follow card
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, Cc = [48, 52, 55, 60];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.25, f: () => NOTE(Cc[s % 4] + 24), v: (u) => 1 - 0.7 * u, gain: 0.011 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(36 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.07 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(41), v: (u) => 1 - u, gain: 0.09 });
  S.finish(VOICE_END, [65, 69, 72, 77, 81]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "XS", XS.toFixed(2));
