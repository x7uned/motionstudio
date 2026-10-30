// 8-bit sound for «How high can Mario jump in our world» (IN OUR WORLD #2). Everything is synthesised by synth-core.mjs
// (frozen copy via steve-real/film2) from the same constants as the picture (scene.mjs, cta.mjs), each cue lasting its motion.
// OUR designs only — no jump/coin/pipe sounds or music of the original game: the jump is a wobbling triangle «spring», the coin a
// two-bell major-third «ding», the portal a tremolo swirl, the cut a whoosh-thump. Bed: a bright curious chiptune of our own
// (D Bm G A, 116 bpm, plucked arpeggio + walking bass + a soft lead motif), out for ~1 s at the 11 m apex, back softly for the
// fall and full on the landing hit, cadence A → D under the follow card.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n, SR } from "./synth-core.mjs";
import { END, VOICE_END } from "./timeline.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { drive } from "./lib/drive.mjs";
import mario from "./assets/mario.mjs";
import { E, T, CUT, EV, KEYS, GKEYS, GAMEEV as G, marioAt, gameMario, tauAt, flightY } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.012 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.008 * g }); };
const thud = (t, g = 1, f0 = 130, d = 0.14) => { tone(sfx, t, d, { wave: "tri", f: (u) => f0 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.07 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1200, v: (u) => 1 - u, gain: 0.02 * g }); };
const step = (t, g = 1) => { tone(sfx, t, 0.05, { wave: "noise", f: () => 900, v: (u) => 1 - u, gain: 0.014 * g }); tone(sfx, t, 0.05, { wave: "tri", f: (u) => 170 - 60 * u, v: (u) => 1 - u, gain: 0.026 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.3 * g, 200, 700); };
/** OUR spring: a triangle that rises with a wobble, then settles (not a square sweep) */
const spring = (t, dur = 0.32, g = 1, f0 = 260, f1 = 720) => { tone(sfx, t, dur, { wave: "tri", f: (u, tt) => (f0 + (f1 - f0) * Math.sin(Math.PI * 0.5 * Math.min(1, u * 1.6))) * (1 + 0.06 * Math.sin(tt * 70)), v: env(0.05, 0.5), gain: 0.05 * g }); tone(sfx, t, dur * 0.6, { duty: 0.125, f: (u) => f0 * 2 + f1 * u, v: env(0.05, 0.6), gain: 0.006 * g }); };
/** OUR coin ding: two short bells a major third apart, a quick tremolo shimmer */
const ding = (t, g = 1) => { tone(sfx, t, 0.22, { wave: "tri", f: () => n("A6"), v: (u) => (1 - u) * (0.8 + 0.2 * Math.sin(u * 60)), gain: 0.04 * g }); tone(sfx, t + 0.05, 0.3, { duty: 0.25, f: () => n("C#7"), v: (u) => (1 - u) * (0.7 + 0.3 * Math.sin(u * 50)), gain: 0.012 * g }); };
const sparkle = (t, g = 1) => seq(t, ["E7", "B6", "G#7", "E7"], 0.045, { gain: 0.008 * g, duty: 0.125 });
const clang = (t, g = 1) => { for (const [f, gg] of [[1180, 1], [1870, 0.6], [2630, 0.4]]) tone(sfx, t, 0.35, { duty: 0.5, f: () => f, v: (u) => Math.pow(1 - u, 2), gain: 0.008 * g * gg }); noise(t, 0.05, () => 5000, (u) => 1 - u, 0.012 * g); };

// ---------------------------------------------------------------- game world: footsteps, bounce landings, spring, bump, coin, portal
{ let prev = null; for (let t = 1 / 240; t < CUT; t += 1 / 240) { const m = gameMario(t), v = drive(mario, GKEYS, t).v, g = m.x / 1.6; if (prev !== null && Math.floor(g * 2) !== Math.floor(prev * 2) && v.run > 0.4 && m.y < 0.02) step(t, 0.9); prev = g; } }
thud(G.land0, 0.9, 150); spring(G.jump, 0.17, 1);
thud(G.tb, 1.1, 210, 0.1); tick(G.tb + 0.01, 1, false); ding(G.tb + 0.03); sparkle(G.tb + 0.55, 1);
thud(G.land1, 0.8, 150);
// the portal opens on «bring»: a tremolo swirl that grows until the cut; the dive
{ const a = E.bring, b = CUT; tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => (220 + 260 * u) * (1 + 0.04 * Math.sin(tt * 38)), v: (u) => Math.min(1, u * 3) * (0.6 + 0.4 * Math.sin(u * 40)), gain: 0.012 });
  noise(a, b - a, (u) => 900 + 1800 * u, (u) => Math.min(1, u * 2) * 0.7, 0.01); tone(sfx, a, 0.45, { wave: "tri", f: (u) => 120 + 340 * u, v: env(0.1, 0.4), gain: 0.04 }); }
spring(G.dive, 0.2, 0.8, 300, 600); whoosh(G.dive + 0.1, CUT, true, 0.9);
// the HARD CUT: whoosh-thump into our street, the city portal hum and its collapse
thud(CUT, 1.4, 90, 0.25); noise(CUT, 0.18, (u) => 3000 - 2000 * u, (u) => 1 - u, 0.03);
{ const [c0, c1] = EV.PORTAL_C.close; tone(sfx, CUT, c1 - CUT, { wave: "tri", f: (u, tt) => 70 + 6 * Math.sin(tt * 3.1), v: (u) => Math.min(1, (1 - u) * 3), gain: 0.04 }); sweep(c0, c1, false, 0.5, 140, 900); sparkle(c1 - 0.05, 0.8); }
whoosh(CUT + 0.02, T.land - 0.05, false, 0.5);
// ---------------------------------------------------------------- our street: footsteps from the gait (backing up and run-ups)
{ let prev = null; for (let t = CUT + 0.3; t < END; t += 1 / 240) { const m = marioAt(t), v = drive(mario, KEYS, t).v, g = m.X / 1.1; if (prev !== null && Math.floor(g * 2) !== Math.floor(prev * 2) && v.run > 0.3 && m.Y < 0.02) step(t, 1); prev = g; } }
// the landing, the bag, the apples
thud(T.land, 1.1, 120); noise(T.land, 0.4, () => 2200, (u) => 1 - u, 0.008);
thud(EV.MAN.drop + 0.3, 0.6, 180, 0.08); noise(EV.MAN.drop + 0.3, 0.1, () => 3000, (u) => 1 - u, 0.01);
for (let i = 0; i < 6; i++) { const t0 = EV.MAN.drop + 0.33 + i * 0.07; tone(sfx, t0, 0.04, { wave: "tri", f: () => 520 + 60 * i, v: (u) => 1 - u, gain: 0.018 }); tone(sfx, t0 + 0.22, 0.03, { wave: "tri", f: () => 470 + 40 * i, v: (u) => 1 - u, gain: 0.01 }); }
// 1.55 m: the bracket grows (ticks), the label
for (let i = 0; i < 6; i++) tick(E.one155 - 0.08 + i * 0.08, 0.6, i % 2 === 0); pop(E.one155 + 0.35);
// the game window and the two blocks
swish(E.inThe - 0.1, E.inThe + 0.35, 0.011); seq(E.inThe + 0.2, ["D6", "A6"], 0.06, { gain: 0.012, duty: 0.25 });
whoosh(EV.BLK_T[0], EV.BLK_T[1], false, 0.6); thud(EV.BLK_T[1] + 0.02, 0.9, 160); thud(EV.BLK_T[1] + 0.08, 0.7, 175);
pop(E.s78 - 0.1, 1); blip(E.s78 - 0.04, "F#6", 0.08, 0.009, 0.25); swish(E.s78 + 0.75, E.s78 + 1.25, 0.008);
// blocks 3, 4, 5 drop on; the spring take-off; the tape zips up; the apex hang
for (const [i, t] of EV.BLK_DROP.entries()) { tone(sfx, t - 0.25, 0.22, { wave: "tri", f: (u) => 900 - 500 * u, v: env(0.1, 0.4), gain: 0.012 }); thud(t, 0.8, 150 + i * 20, 0.1); }
spring(T.take1, 0.42, 1.1, 240, 780); noise(T.take1, 0.5, (u) => 2000 + 4000 * u, (u) => Math.sin(Math.PI * u), 0.006);
tone(sfx, T.frz1[0], 0.6, { duty: 0.125, f: (u, tt) => n("A6") * (1 + 0.01 * Math.sin(tt * 30)), v: (u) => 1 - u, gain: 0.006 });
blip(E.four1 - 0.05, "E6", 0.09, 0.012, 0.25); blip(E.four1 + 0.05, "A6", 0.09, 0.01, 0.25);
// the bar on stands rises, the athlete, 2.45, the bracket
tone(sfx, EV.BAR.in, 0.6, { duty: 0.25, f: (u) => 300 * Math.pow(2, u), v: env(0.1, 0.3), gain: 0.009 }); thud(EV.BAR.in + 0.55, 0.5, 220, 0.06);
pop(E.two45, 1); blip(E.two45 + 0.06, "B6", 0.08, 0.009, 0.25); for (let i = 0; i < 5; i++) tick(E.two45 + 0.5 + i * 0.18, 0.5, i % 2 === 0);
// the fast game fall and landing; the stack pops away
tone(sfx, T.fall1[0], T.fall1[1] - T.fall1[0], { duty: 0.25, f: (u) => 900 - 600 * u, v: env(0.1, 0.2), gain: 0.012 }); thud(T.fall1[1], 1, 130);
for (let i = 0; i < 5; i++) { const t = E.toJump + 0.05 + i * 0.09; pop(t + 0.1, 0.8); tone(sfx, t + 0.1, 0.08, { duty: 0.125, f: (u) => 1200 + 600 * u, v: (u) => 1 - u, gain: 0.004 }); }
// 52 km/h: crouch, spring, FREEZE, the arrow grows, the dial counts; the sprinter; unfreeze
swish(T.crouch2, T.crouch2 + 0.25, 0.008); spring(T.take2, 0.12, 0.9, 260, 520);
tone(sfx, T.frz2[0], 0.3, { duty: 0.5, f: (u) => 900 * Math.pow(0.25, u), v: (u) => 1 - u, gain: 0.014 });            // the «freeze» drop
sweep(T.take2 + 0.05, T.take2 + 0.55, true, 0.7, 200, 900);
for (let i = 0; i < 10; i++) tick(E.f52a + i * 0.06, 0.45, i % 2 === 0); blip(E.f52a + 0.62, "D7", 0.1, 0.01, 0.25);
{ for (let t = EV.RUN.t0 + 0.1; t < EV.RUN.t1 - 0.1; t += 1 / 4.8) step(t, 0.7); }
for (let i = 0; i < 9; i++) tick(E.usain + i * 0.065, 0.45, i % 2 === 0); blip(E.usain + 0.62, "A6", 0.1, 0.009, 0.25);
sweep(T.unfrz2[0], T.unfrz2[1], false, 0.4, 200, 600);
// the game window: small game jumps again and again; heavy pull arrows; EARTH 1× / GAME ≈10×
swish(E.why - 0.15, E.why + 0.25, 0.01);
for (let t = E.why; t < E.our2; t += 1.6) { spring(t, 0.16, 0.35, 300, 700); thud(t + 0.95, 0.35, 170, 0.07); }
for (let t = E.pulls1; t < E.our2; t += 1 / 1.6) tone(sfx, t, 0.18, { wave: "tri", f: (u) => 160 - 80 * u, v: (u) => 1 - u, gain: 0.03 });
swish(E.game1 - 0.2, E.game1 + 0.2, 0.009); tone(sfx, E.ten - 0.1, 0.9, { duty: 0.25, f: (u) => 200 * Math.pow(0.35, u), v: env(0.1, 0.3), gain: 0.012 }); thud(E.ten + 0.8, 0.7, 70, 0.2);
blip(E.earth - 0.05, "E6", 0.08, 0.009, 0.25);
swish(E.our2 + 0.25, E.our2 + 0.75, 0.009);
// the big jump: spring, the climbing whistle (pitch follows the height), floors, grandma's can, the boy's phone, the wide shot,
// pigeons, wind at the apex, the 3 s ring, the fall whistle, 52 km/h ↓, the heavy landing
spring(T.take3, 0.5, 1.3, 220, 820); noise(T.take3, 0.6, (u) => 1800 + 3000 * u, (u) => Math.sin(Math.PI * u), 0.008);
{ const a = T.take3 + 0.2, b = E.stays + 0.2; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 330 + 75 * flightY(tauAt(a + u * (b - a))) + 8 * Math.sin(tt * 9), v: (u) => Math.min(1, u * 5, (1 - u) * 4) * 0.8, gain: 0.006 }); }
blip(E.eleven + 0.3, "C#7", 0.08, 0.008, 0.25); blip(E.second, "A5", 0.1, 0.008, 0.25); blip(E.third - 0.02, "C#6", 0.1, 0.008, 0.25);
clang(E.second + 0.12, 1); clang(E.second + 1.12, 0.35);
tone(sfx, E.third + 0.05, 0.06, { duty: 0.25, f: () => 2400, v: (u) => 1 - u, gain: 0.006 }); tone(sfx, E.third + 0.13, 0.06, { duty: 0.25, f: () => 3200, v: (u) => 1 - u, gain: 0.006 });
whoosh(E.higher2 - 0.05, E.higher2 + 0.55, false, 0.7);
for (let i = 0; i < 14; i++) noise(E.roof1 - 0.05 + i * 0.05, 0.035, () => 2400 + 500 * (i % 3), (u) => 1 - u, 0.006 * (1 - i / 16));
pop(E.higher2 + 0.2, 0.8);
noise(E.stays - 0.3, E.then + 0.4 - (E.stays - 0.3), (u, tt) => 700 + 300 * Math.sin(tt * 1.7), (u) => Math.sin(Math.PI * u) * 0.9, 0.012);
swish(E.stays + 0.55, E.stays + 1.35, 0.008); blip(E.three - 0.05, "E6", 0.09, 0.01, 0.25);
for (const k of [1, 2]) { let t = E.three; while (t < T.landB && tauAt(t) < k) t += 1 / 120; if (t < T.landB) tick(t, 0.7); }
{ const a = E.then + 0.1, b = T.landB; tone(sfx, a, b - a, { duty: 0.125, f: (u) => 330 + 75 * flightY(tauAt(a + u * (b - a))), v: (u) => Math.min(1, u * 4) * 0.8, gain: 0.006 }); noise(a, b - a, (u) => 900 + 3000 * u * u, (u) => u * u, 0.012); }
for (let i = 0; i < 10; i++) tick(E.f52b + i * 0.06, 0.45, i % 2 === 0); blip(E.f52b + 0.62, "D7", 0.1, 0.01, 0.25);
{ const t = T.landB; tone(sfx, t, 0.5, { wave: "tri", f: (u) => 75 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.12 }); noise(t, 0.7, (u) => 1500 - 900 * u, (u) => 1 - u * 0.8, 0.03); for (let i = 0; i < 10; i++) tick(t + 0.02 + i * 0.05, 0.9 - i * 0.06, i % 2 === 0); noise(t + 0.15, 0.8, () => 2600, (u) => (1 - u) * 0.6, 0.006); }
for (let i = 0; i < 4; i++) noise(T.landB + 0.4 + i * 0.09, 0.04, () => 3000, (u) => 1 - u, 0.006);              // dust-off pats
// ≈40 km/h in his game: quick jumps with a thump on each landing; the label blips
swish(E.inHis - 0.1, E.inHis + 0.3, 0.01);
for (let n0 = 0; n0 < 4; n0++) { const t0 = E.forty - 1.9 + n0 * 0.95; if (t0 > E.so3) break; spring(t0, 0.14, 0.35, 320, 720); thud(t0 + 0.95, 0.5, 150, 0.08); if (t0 + 0.95 >= E.forty - 0.05 && t0 + 0.95 < E.so3) blip(t0 + 0.97, "G#6", 0.08, 0.009, 0.25); }
swish(E.so3 + 0.1, E.so3 + 0.6, 0.01);
// the knees: push in, the golden glow shimmer, SUPERPOWER, the point, proud
whoosh(E.so3, E.so3 + 0.9, true, 0.4);
for (let i = 0; i < 8; i++) tone(sfx, E.superpower + i * 0.07, 0.25, { duty: 0.125, f: () => NOTE(81 + [0, 4, 7, 12, 16, 12, 7, 4][i]), v: (u) => 1 - u, gain: 0.006 });
pop(E.superpower + 0.05, 1); blip(E.its - 0.3, "E6", 0.08, 0.008, 0.25); sparkle(E.knees + 0.5, 0.9);
// NEXT and the follow card
pop(E.next - 0.05, 1.1); seq(E.next + 0.05, ["A6", "D7"], 0.09, { gain: 0.012, duty: 0.25 });
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006); blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["D6", "F#6", "A6", "D7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: our own bright curious chiptune, 116 bpm, D Bm G A
const BPM = 116, BEAT = 60 / BPM, BAR = 4 * BEAT;
const PROG = [[50, 54, 57, 62], [47, 50, 54, 59], [43, 47, 50, 55], [45, 49, 52, 57]];
const MOTIF = [[0, 3, 0.5], [0.5, 2, 0.5], [1, 1, 0.5], [1.5, 2, 1], [2.5, 3, 0.5], [3, 4, 1]];   // [beat, chord-tone index (+octave above 3), length]
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4];
  for (const m of ch.slice(1)) tone(bed, t0, BAR * 0.98, { duty: 0.125, f: (u, tt) => NOTE(m + 12) * (1 + 0.002 * Math.sin(tt * 5)), v: (u) => Math.min(1, u / 0.25, (1 - u) / 0.25) * 0.6, gain: 0.006 });
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.75, { wave: "tri", f: () => NOTE(ch[[0, 2, 0, 1][b]] - 12 + (b === 3 && bar % 2 ? 2 : 0)), v: (u) => 1 - 0.6 * u, gain: 0.07 });
  for (let e = 0; e < 8; e++) { const m = ch[[0, 1, 2, 3, 2, 1, 2, 3][e]] + 24; tone(bed, t0 + (e * BEAT) / 2, BEAT * 0.28, { duty: 0.25, f: () => NOTE(m), v: (u) => 1 - 0.85 * u, gain: 0.01 }); }
  if (bar % 2 === 0) for (const [b, i, L] of MOTIF) { const m = i > 3 ? ch[0] + 12 : ch[i]; tone(bed, t0 + b * BEAT, L * BEAT * 0.9, { duty: 0.125, f: (u, tt) => NOTE(m + 24) * (1 + 0.004 * Math.sin(tt * 30)), v: (u) => (1 - 0.5 * u), gain: 0.007 }); }
  for (let b = 0; b < 4; b++) if (b % 2 === 1) tone(bed, t0 + b * BEAT, 0.05, { wave: "noise", f: () => 2600, v: (u) => 1 - u, gain: 0.018 });
  for (let e = 0; e < 8; e++) if (e % 2 === 1) tone(bed, t0 + (e * BEAT) / 2, 0.02, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.008 });
}
// cadence A → D under the follow card
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, A = [57, 61, 64, 69];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.25, f: () => NOTE(A[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.011 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(33 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.07 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(38), v: (u) => 1 - u, gain: 0.09 });
  S.finish(VOICE_END, [62, 66, 69, 74, 78]); }
// the music drops out for ~1 s at the 11 m apex, comes back softly for the fall and full with the landing hit
{ const a = E.stays - 0.25, b = E.stays + 0.15, c2 = E.then - 0.1, d = E.then + 0.6, e = T.landB;
  for (let i = Math.round(a * SR); i < Math.round((e + 0.05) * SR) && i < bed.length; i++) { const t = i / SR; const g = t < b ? 1 - (t - a) / (b - a) : t < c2 ? 0 : t < d ? 0.45 * (t - c2) / (d - c2) : t < e ? 0.45 : 1; bed[i] *= Math.max(0, Math.min(1, g)); } }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "music out", (E.stays + 0.15).toFixed(2), "→", (E.then - 0.1).toFixed(2), "landing", T.landB.toFixed(2));
