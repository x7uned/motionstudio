// 8-bit / 16-bit-style sound for «How fast is Sonic, really?» (IN OUR WORLD #4). Everything is synthesised by synth-core.mjs
// (frozen copy via pacman-real) from the same constants as the picture (scene.mjs, cta.mjs); each cue lasts its motion.
// OUR designs only — no ring chime, no jump, no spin-dash rev, no zone or stage music of the games: accelerating footsteps
// (short noise ticks over a soft triangle knock), a spin-ball hum (a buzzy pulse whose pitch follows the ball's speed), a skid
// (falling filtered noise), the portal swirl (tremolo pulse + airy noise), a whoosh-thump on the hard cut, speedometer ticks,
// a TV click-on with a burst of static, a soft short «boom» for the sound barrier, a car pass-by whoosh with an engine hum, the
// loop's rising tone and slide-down, the ball winding down on the flat. Bed: a fast cheerful chiptune of our own
// (A F#m D E, 152 bpm: plucked arpeggio, bouncing bass, a light motif), cadence E → A under the follow card.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n, SR } from "./synth-core.mjs";
import { END, VOICE_END } from "./timeline.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { SOUND as S0, CUT } from "./scene.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const { E, ZCURL, ZIN, AR, RUN0, RUN1, vRunRaw, WALK6B, TOHILL, ROLL0, vRoll, HROLL_END, SQ, RIDE, FLAT, vFlat, FIN, thBall, DISS } = S0;
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 520 + 760 * u, v: (u) => 1 - u, gain: 0.012 * g });
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.012 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.008 * g }); };
const thud = (t, g = 1, f0 = 130, d = 0.14) => { tone(sfx, t, d, { wave: "tri", f: (u) => f0 * (1 - 0.5 * u), v: (u) => 1 - u, gain: 0.07 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1200, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.3 * g, 200, 700); };
const step = (t, g = 1, hi = 1) => { noise(t, 0.03, () => 2600 * hi, (u) => 1 - u, 0.012 * g); tone(sfx, t, 0.045, { wave: "tri", f: (u) => 190 * hi * (1 - 0.4 * u), v: (u) => 1 - u, gain: 0.035 * g }); };
const skid = (a, b, g = 1) => noise(a, b - a, (u) => 4200 - 2600 * u, (u) => Math.min(1, u * 8) * (1 - u * 0.6), 0.02 * g);
const tuck = (t, g = 1) => tone(sfx, t, 0.12, { duty: 0.25, f: (u) => 300 + 500 * u, v: env(0.1, 0.5), gain: 0.02 * g });
const unroll = (t, g = 1) => { tone(sfx, t, 0.14, { duty: 0.25, f: (u) => 700 - 380 * u, v: env(0.1, 0.5), gain: 0.018 * g }); pop(t + 0.12, 0.7 * g); };
/** the spin-ball hum: a buzzy pulse over [a, b] whose pitch follows speed(t) (m/s), level g */
const hum = (a, b, speed, g = 1, base = 90) => { if (b - a < 0.03) return; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => base + 26 * Math.max(0, speed(tt)), v: (u) => Math.min(1, u * (b - a) / 0.05, (1 - u) * (b - a) / 0.08), gain: 0.014 * g }); noise(a, b - a, (u, tt) => 600 + 180 * Math.max(0, speed(tt)), (u) => Math.min(1, u * 6, (1 - u) * 6) * 0.6, 0.005 * g); };
const swirl = (a, b, g = 1, lo = 240, hi = 520) => { tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => (lo + (hi - lo) * u) * (1 + 0.05 * Math.sin(tt * 34)), v: (u) => Math.min(1, u * 4, (1 - u) * 4) * (0.65 + 0.35 * Math.sin(u * 50)), gain: 0.01 * g }); noise(a, b - a, (u) => 1200 + 1800 * u, (u) => Math.min(1, u * 4, (1 - u) * 4) * 0.5, 0.006 * g); };
const sparkle = (t, g = 1) => seq(t, ["E7", "B6", "G#7", "E7"], 0.045, { gain: 0.008 * g, duty: 0.125 });
const ticksOver = (a, b, nTicks, g = 0.5, rising = true) => { for (let i = 0; i < nTicks; i++) { const u = i / nTicks, tt = a + (b - a) * (rising ? Math.sqrt(u) : u * u); tick(tt, g, i % 2 === 0); } };

// ---------------------------------------------------------------- the zone: top speed, curl, the portal
for (let t = 0.03; t < ZCURL[0]; t += 1 / 15) step(t, 0.35, 1.35);
tone(sfx, 0, ZCURL[0], { duty: 0.125, f: (u, tt) => 140 + 8 * Math.sin(tt * 40), v: (u) => Math.min(1, u * 40, (1 - u) * 40), gain: 0.006 });   // the figure-eight whirr
swirl(E.bring, CUT, 1.0, 220, 560); tone(sfx, E.bring, 0.35, { wave: "tri", f: (u) => 120 + 320 * u, v: env(0.1, 0.4), gain: 0.035 });
tuck(ZCURL[0], 1); hum(ZCURL[1], ZIN[0], () => 9, 1, 110);
tone(sfx, ZIN[0], ZIN[1] - ZIN[0], { duty: 0.25, f: (u) => 900 - 650 * u, v: (u) => 1 - u, gain: 0.014 });          // into the portal
// ---------------------------------------------------------------- the HARD CUT: whoosh-thump into the city; the arrival
thud(CUT, 1.4, 90, 0.25); noise(CUT, 0.18, (u) => 3000 - 2000 * u, (u) => 1 - u, 0.03);
swirl(CUT, AR.close[0], 0.6, 300, 330); swirl(AR.close[0], AR.close[1], 0.8, 360, 160);
hum(CUT + 0.02, AR.out[1], (tt) => 6 * (1 - (tt - CUT) / 0.5), 1, 100); thud(CUT + 0.3, 0.5, 160, 0.06); unroll(AR.uncurl[0] + 0.05);
// a light city murmur: sparse soft talk-like blips and far traffic (not in the zone)
for (let t = CUT + 0.4; t < END - 0.5; t += 0.21) { const r = (((Math.sin(t * 91.7) * 43758.5) % 1) + 1) % 1; if (r < 0.55) continue; tone(sfx, t, 0.05 + 0.05 * r, { duty: 0.5, f: (u) => 240 + 240 * r + 40 * Math.sin(u * 6), v: (u) => (1 - u) * 0.8, gain: 0.0028 }); }
// 1 m
for (let i = 0; i < 6; i++) tick(E.one1 - 0.22 + i * 0.075, 0.6, i % 2 === 0); pop(E.one1 + 0.05);
// the game window, the 39-cell ruler, 1 px ≈ 2.5 cm
swish(E.first - 0.25, E.first + 0.15, 0.011); seq(E.first, ["E6", "B6"], 0.06, { gain: 0.012, duty: 0.25 });
for (let i = 0; i < 13; i++) tick(E.t39 - 0.35 + (i / 13) * 0.6, 0.45, i % 2 === 0); pop(E.t39 + 0.25, 0.9);
pop(E.two1, 0.8); blip(E.two1 + 0.08, "B6", 0.06, 0.007, 0.25);
// the impatient foot tap (each tap = the foot coming down)
for (let t = 12.1 + 1 / 6; t < 14.85; t += 1 / 3) step(t, 0.45, 1.6);
// ---------------------------------------------------------------- the run: accelerating footsteps → whirr, skid; the frame strip, 33 km/h
{ let t = RUN0 + 0.05, k = 0; while (t < RUN0 + 1.4) { step(t, 0.7, 1.1 + 0.1 * (k % 2)); t += lerpI(0.22, 0.07, (t - RUN0) / 1.4); k++; } }
tone(sfx, RUN0 + 1.3, RUN1 - 0.5 - RUN0 - 1.3, { duty: 0.125, f: (u, tt) => 150 + 40 * vRunRaw(tt) + 8 * Math.sin(tt * 44), v: (u) => Math.min(1, u * 20, (1 - u) * 20), gain: 0.007 });
for (let t = RUN0 + 1.4; t < RUN1 - 0.55; t += 1 / 15) step(t, 0.28, 1.3);
skid(RUN1 - 0.48, RUN1, 1);
pop(E.six + 0.05); blip(E.six + 0.1, "E6", 0.06, 0.008, 0.25); pop(E.sixty + 0.05); blip(E.sixty + 0.1, "B6", 0.06, 0.008, 0.25);
swish(E.t33 - 0.3, E.t33, 0.008); ticksOver(E.t33 - 0.2, E.t33 + 0.4, 8, 0.45); pop(E.t33 + 0.05);
// the runner: his own lighter footsteps while he is in the frame; 45 / 33
for (let t = E.usain2 - 0.1; t < 24.0; t += 0.16) step(t, 0.3, 1.8);
ticksOver(E.f45 - 0.3, E.f45 + 0.3, 6, 0.4); pop(E.f45 + 0.05); blip(E.f45 + 0.1, "G#6", 0.07, 0.008, 0.25);
// ---------------------------------------------------------------- the TVs: click-on + static, the readout, the boom; the ladder
const tvOn = (t0) => { tick(t0, 1.2, false); noise(t0 + 0.02, 0.33, () => 9000, (u) => Math.min(1, u * 10) * (1 - u), 0.012); blip(t0 + 0.32, "E7", 0.04, 0.004, 0.125); };
tvOn(26.5); tvOn(33.55);
ticksOver(E.three - 0.05, E.three + 0.65, 10, 0.5); blip(E.three + 0.7, "A6", 0.09, 0.01, 0.25);
pop(E.three + 0.3); pop(E.four + 0.02); blip(E.four + 0.08, "E6", 0.08, 0.008, 0.25);
for (const t of [E.but1 + 0.3, E.four, E.twelve]) { sweep(t, t + 0.45, true, 0.35, 300, 900); }
whoosh(34.2, 35.75, true, 0.7);                                                                                  // the streak on TV 2
thud(E.sound, 1.1, 70, 0.32); noise(E.sound, 0.4, (u) => 1800 - 1500 * u, (u) => (1 - u) ** 2, 0.02);           // the soft short boom
pop(E.twelve + 0.05, 0.9); pop(E.name + 0.05); sparkle(E.name + 0.1, 0.8);
for (let t = WALK6B[0] + 0.05; t < WALK6B[1]; t += 0.15) step(t, 0.4, 1.2);
// ---------------------------------------------------------------- to the hill foot, skid, look up
for (let t = TOHILL[0] + 0.05; t < TOHILL[1] - 0.2; t += 0.09) step(t, 0.5, 1.25);
skid(TOHILL[1] - 0.2, TOHILL[1] + 0.25, 1);
for (const [a] of DISS.slice(1)) swish(a, a + 0.32, 0.006);
// ---------------------------------------------------------------- the hill: curl, spin hum with the speed, 16 px/frame, 88, the car
tuck(E.curled - 0.12, 1);
hum(ROLL0 - 0.12, HROLL_END + 0.12, (tt) => vRoll(tt), 1.2, 85);
ticksOver(E.rolling1 + 0.2, 49.7, 16, 0.35); pop(E.sixteen + 0.05); blip(E.sixteen + 0.1, "E6", 0.06, 0.008, 0.25); pop(E.e88 + 0.05); blip(E.e88 + 0.1, "C#7", 0.08, 0.01, 0.25);
noise(49.9, E.as - 49.9, (u) => 700 + 1400 * u, (u) => Math.sin(Math.PI * Math.min(1, u * 0.9 + 0.1)) * u, 0.012);   // the car comes up: a rising whoosh
tone(sfx, E.as - 0.1, HROLL_END - E.as + 0.2, { wave: "tri", f: (u, tt) => 62 + 3 * Math.sin(tt * 9), v: (u) => Math.min(1, u * 8, (1 - u) * 6), gain: 0.04 });   // engine hum alongside
pop(E.car + 0.05); sweep(E.highway + 0.05, E.highway + 0.5, true, 0.35, 300, 900);
// ---------------------------------------------------------------- the square: roll in, uncurl, the loop is built; 6 m; ≥ 44; the fall
hum(SQ.roll[0], SQ.roll[1], (tt) => 6 * (1 - (tt - SQ.roll[0]) / (SQ.roll[1] - SQ.roll[0])), 1, 80); unroll(SQ.uncurl[0] + 0.05);
tone(sfx, SQ.build[0], SQ.build[1] - SQ.build[0], { duty: 0.25, f: (u) => 180 + 420 * u, v: env(0.1, 0.2), gain: 0.012 }); for (let t = SQ.build[0]; t < SQ.build[1] - 0.05; t += 0.075) tick(t, 0.35, false);
thud(SQ.build[1], 0.6, 110, 0.12); pop(E.twostory + 0.05); blip(E.twostory + 0.1, "E6", 0.08, 0.008, 0.25);
swish(E.f44 - 0.2, E.f44 + 0.3, 0.008); pop(E.f44 + 0.05);
tone(sfx, E.fall1 - 0.1, 0.6, { duty: 0.125, f: (u) => 1400 - 1100 * u * u, v: env(0.1, 0.3), gain: 0.009 });     // the dotted fall: a falling whistle
for (let t = E.bottom; t < E.fall1 - 0.2; t += 1 / 3) step(t + 1 / 6, 0.35, 1.6);
// ---------------------------------------------------------------- the ride: running at 33 (up, hold, slide back), the ball at 88 loops
for (let t = RIDE.start + 0.03; t < RIDE.bottom; t += 0.08) step(t, 0.5, 1.3);
tone(sfx, RIDE.bottom, RIDE.hold - RIDE.bottom, { duty: 0.25, f: (u) => 220 + 380 * Math.sqrt(u), v: env(0.1, 0.15), gain: 0.012 });                 // up the loop
tone(sfx, RIDE.hold, RIDE.slideEnd - RIDE.hold, { duty: 0.25, f: (u) => 600 - 420 * u * u, v: env(0.08, 0.2), gain: 0.012 });                       // slide-down
skid(RIDE.slideEnd, RIDE.stop + 0.05, 0.9); pop(E.running2 + 0.1, 0.9); blip(E.running2 + 0.15, "C5", 0.16, 0.01, 0.5);
whoosh(RIDE.dash[0], RIDE.dash[1], true, 0.6);
hum(RIDE.ballIn, RIDE.exit, () => 14, 1.1, 120);
tone(sfx, RIDE.loop0, RIDE.loop1 - RIDE.loop0, { duty: 0.25, f: (u, tt) => 300 + 340 * (1 - Math.cos(thBall(tt))) / 2, v: env(0.1, 0.15), gain: 0.012 });   // around the loop
whoosh(RIDE.loop1, RIDE.exit, false, 0.5); pop(E.rolling2 + 0.1); sparkle(E.rolling2 + 0.15, 0.8);
// ---------------------------------------------------------------- the flat: the ball winds down (hum and ticks slow down); 88 → 0
hum(FLAT.t0 - 0.3, FLAT.stop, (tt) => vFlat(tt) * 2, 1.1, 70);
{ let t = FLAT.t0, k = 0; while (t < FLAT.stop - 0.05) { tick(t, 0.35, k % 2 === 0); t += 0.06 + 0.5 * (1 - vFlat(t) / 5); k++; } }
tone(sfx, FLAT.stop - 0.1, 0.25, { wave: "tri", f: (u) => 120 - 50 * u, v: (u) => 1 - u, gain: 0.03 });
unroll(FLAT.uncurl[0] + 0.05); blip(FLAT.uncurl[1] + 0.05, "C4", 0.18, 0.012, 0.5); blip(FLAT.uncurl[1] + 0.22, "A#3", 0.2, 0.012, 0.5);          // «hmph»
blip(E.superpower + 0.05, "E6", 0.06, 0.008, 0.25); swish(E.superpower, E.superpower + 0.25, 0.007);
// ---------------------------------------------------------------- the finale: down the hill again, SUPERPOWER: HILLS, the portal, the Creeper, the card
hum(FIN.t0 - 0.2, FIN.stop, (tt) => 7 * (1 - Math.max(0, tt - FIN.t0) / (FIN.stop - FIN.t0 + 0.2)), 1.1, 90); unroll(FIN.uncurl[0] + 0.05);
pop(E.hills + 0.05, 1.1); sparkle(E.hills + 0.1, 1.1);
swirl(E.next - 0.05, END - 0.4, 0.8, 220, 300);
seq(E.creeper - 0.05, ["E3", "C3"], 0.16, { gain: 0.03, duty: 0.5 }); pop(E.creeper + 0.05, 0.8);
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "B6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006); blip(CLICK, "B6", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["E6", "G#6", "B6", "E7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "G#6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);
function lerpI(a, b, k) { k = Math.max(0, Math.min(1, k)); return a + (b - a) * k; }

// ---------------------------------------------------------------- bed: our own fast cheerful chiptune, 152 bpm, A F#m D E
const BPM = 152, BEAT = 60 / BPM, BAR = 4 * BEAT;
const PROG = [[57, 61, 64, 69], [54, 57, 61, 66], [50, 54, 57, 62], [52, 56, 59, 64]];
const MOTIF = [[0, 2, 0.5], [0.5, 3, 0.5], [1, 1, 0.5], [1.5, 2, 1], [3, 3, 0.5], [3.5, 2, 0.5]];
const soft = (t) => (t > 26.4 && t < 40.3) ? 0.7 : (t > 53.3 && t < 60.3) ? 0.8 : 1;
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4], g = soft(t0 + BAR / 2);
  for (const m of ch.slice(1)) tone(bed, t0, BAR * 0.98, { duty: 0.125, f: (u, tt) => NOTE(m + 12) * (1 + 0.002 * Math.sin(tt * 5)), v: (u) => Math.min(1, u / 0.2, (1 - u) / 0.2) * 0.55, gain: 0.005 });
  for (let e = 0; e < 8; e++) tone(bed, t0 + (e * BEAT) / 2, BEAT * 0.4, { wave: "tri", f: () => NOTE(ch[0] - 12 + (e % 2 ? 12 : 0)), v: (u) => 1 - 0.6 * u, gain: 0.06 * g });           // bouncing octave bass
  for (let s = 0; s < 16; s++) { const m = ch[[0, 1, 2, 3, 2, 1, 2, 3][s % 8]] + 24; tone(bed, t0 + (s * BEAT) / 4, BEAT * 0.2, { duty: 0.25, f: () => NOTE(m), v: (u) => 1 - 0.85 * u, gain: 0.0075 * g }); }
  if (bar % 2 === 1) for (const [b, i, L] of MOTIF) { tone(bed, t0 + b * BEAT, L * BEAT * 0.85, { duty: 0.125, f: (u, tt) => NOTE(ch[i] + 24) * (1 + 0.004 * Math.sin(tt * 30)), v: (u) => 1 - 0.5 * u, gain: 0.006 * g }); }
  for (let b = 0; b < 4; b++) if (b % 2 === 1) tone(bed, t0 + b * BEAT, 0.05, { wave: "noise", f: () => 2600, v: (u) => 1 - u, gain: 0.016 * g });
  for (let e = 0; e < 8; e++) if (e % 2 === 1) tone(bed, t0 + (e * BEAT) / 2, 0.02, { wave: "noise", f: () => 14000, v: (u) => 1 - u, gain: 0.007 * g });
}
// cadence E → A under the follow card
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, Ec = [52, 56, 59, 64];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.25, f: () => NOTE(Ec[s % 4] + 24), v: (u) => 1 - 0.7 * u, gain: 0.011 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(40 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.07 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(45), v: (u) => 1 - u, gain: 0.09 });
  S.finish(VOICE_END, [69, 73, 76, 81, 85]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3));
