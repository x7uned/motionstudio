// 8-bit sound for «A new world beyond Pluto» (2026 ED138): every cue is synthesised (synth-core.mjs, frozen copy via
// casino-tables) from the same constants as the picture (timeline.mjs / scene.mjs) and lasts its motion: survey frames sliding
// in with shutter clicks, the reticle lock, the tilt down to the summit, the scan's data blips, the dome's motor whir (exact
// rotation length), the slit shutters, the telescope's picture, the flag hoist, the detections, the track links, the beam zap,
// the rising sweep of the flight, the sparkle of the bright dot, the swell into the world, the size glides, shiny/dark, the old
// frames, the sky turning, the crowd shimmer, the lost dot, the blink comparator, the tilted orbit, the line-up pops, the
// rolling world and the «slot» thunk, the names, the follow card. Bed: a calm space chiptune pad with a slow arpeggio
// (Dmaj7 Bm7 Gmaj7 A), cadence A → Dmaj9 under the follow card.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END } from "./timeline.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";
import { FLY, SCAN, OBS_KEYS, FLAG_KEYS, TRACKS, BEAM, OLD_T, LINK, BLINK, LINE_IN, ROLL, NAMES } from "./scene.mjs";
import observatory from "./assets/observatory.mjs";
import flag from "./assets/chile-flag.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, shutter, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const chime = (t, notes, g = 1, step = 0.07) => seq(t, notes, step, { gain: 0.013 * g, duty: 0.25 });
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const sparkle = (a, b, g = 1) => { const N = Math.max(4, Math.round((b - a) / 0.05)); for (let i = 0; i < N; i++) blip(a + (i / N) * (b - a), NOTE(84 + ((i * 5) % 12)), 0.045, 0.006 * g * (1 - 0.5 * i / N), 0.125); };
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.012 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.008 * g }); };
const thunk = (t, g = 1) => { tone(sfx, t, 0.16, { wave: "tri", f: (u) => 150 * (1 - 0.45 * u), v: (u) => 1 - u, gain: 0.07 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1400, v: (u) => 1 - u, gain: 0.025 * g }); };
/** telescope motor whir: a low buzzing pulse with an eased pitch, exactly a..b */
const whir = (a, b, g = 1) => { tone(sfx, a, b - a, { duty: 0.125, f: (u) => 70 + 40 * Math.sin(Math.PI * u), v: env(0.18, 0.25), gain: 0.02 * g }); tone(sfx, a, b - a, { wave: "tri", f: (u, tt) => 140 + 60 * Math.sin(Math.PI * u) + 6 * Math.sin(tt * 40), v: env(0.18, 0.25), gain: 0.03 * g }); noise(a, b - a, () => 900, env(0.2, 0.3), 0.004 * g); };
const glide = (a, b, f0, f1, g = 1) => tone(sfx, a, b - a, { duty: 0.25, f: (u) => f0 * Math.pow(f1 / f0, u), v: env(0.1, 0.35), gain: 0.012 * g });

// ---------------------------------------------------------------- 1. the hook: six frames slide in, each a shutter click
for (let k = 0; k < 6; k++) { const t0 = -0.32 + k * 0.6; if (t0 + 0.05 > 0) swish(Math.max(0, t0), t0 + 0.45, 0.008); if (t0 + 0.42 > 0) shutter(t0 + 0.42, 0.55); }
glide(EV.nobody, EV.noticedEnd, 520, 300, 0.7);
seq(EV.twenty1 - 0.05, ["A5", "D6", "A6"], 0.09, { gain: 0.012, duty: 0.25 }); pop(EV.twenty1 + 0.15, 1.1);
// ---------------------------------------------------------------- 2. the tilt down, the grid, the scan, the dome, the flag
whoosh(FLY[0], FLY[1], false, 0.35);
for (let i = 0; i < 11; i++) tick(FLY[0] + 0.45 + i * 0.06, 0.4, i % 2 === 0);
{ const N = 14; for (let i = 0; i < N; i++) blip(SCAN[0] + (i / N) * (SCAN[1] - SCAN[0]), NOTE(79 + [0, 7, 3, 10, 5, 12][i % 6]), 0.035, 0.007, 0.25); }
{ const [r0, o0, s0] = OBS_KEYS.map((k) => k[0]); whir(r0, r0 + observatory.states.rotate[0], 1);
  noise(o0, observatory.states.open[0], (u) => 600 + 900 * u, env(0.15, 0.3), 0.008); tone(sfx, o0, observatory.states.open[0], { wave: "tri", f: (u) => 90 + 30 * u, v: env(0.15, 0.3), gain: 0.025 });
  shutter(s0 + 0.12, 1); chime(s0 + 0.2, ["E6", "B6"], 0.8); }
{ const f0 = FLAG_KEYS[0][0], D = flag.states.raise[0]; for (let i = 0; i < 6; i++) blip(f0 + (i / 6) * D, NOTE(67 + i * 2), 0.05, 0.006, 0.5); pop(EV.chile, 1); }
// ---------------------------------------------------------------- 3. detections, counter, track links, the far dot, the beam
whoosh(EV.code2 - 0.25, EV.tiny, true, 0.2);
for (let i = 0; i < 26; i++) { const t = EV.billions - 0.2 + (i / 26) * 1.3; blip(t, NOTE(88 + ((i * 7) % 12)), 0.03, 0.004, 0.125); }
for (let t = EV.billions; t < EV.objectEnd; t += 0.09) tick(t, 0.25, Math.round(t / 0.09) % 2 === 0);
TRACKS.forEach((tr, i) => seq(tr.t + 0.02, tr.hero ? ["D6", "F#6", "A6"] : ["A5", "C#6", "E6"], 0.12, { gain: tr.hero ? 0.012 : 0.009, duty: 0.25 }));
chime(EV.one1, ["A6", "D7"], 0.9, 0.09);
tone(sfx, BEAM[0], 0.45, { duty: 0.25, f: (u) => 300 * Math.pow(6, u), v: env(0.05, 0.4), gain: 0.012 });
sweep(EV.dot1 + 0.55, EV.brightEnd - 0.3, true, 1.1, 180, 1400);
noise(EV.dot1 + 0.55, EV.brightEnd - 0.3 - EV.dot1 - 0.55, (u) => 1200 + 4000 * u, (u) => Math.sin(Math.PI * u), 0.008);
sparkle(EV.still, EV.still + 0.7, 1.1);
// ---------------------------------------------------------------- 4. into the world; Pluto; the size glides
tone(sfx, EV.that1 - 0.05, EV.maybe + 0.25 - EV.that1, { wave: "tri", f: (u) => 110 * Math.pow(2.5, u), v: env(0.3, 0.3), gain: 0.035 }); whoosh(EV.that1, EV.maybe + 0.2, false, 0.25);
whoosh(EV.big - 0.1, EV.big + 0.6, true, 0.2); pop(EV.maybe + 0.05, 0.9);
glide(EV.six - 0.05, EV.six + 0.35, 700, 420, 0.9); glide(EV.fifteen - 0.05, EV.fifteen + 0.4, 300, 640, 0.9); glide(EV.wide1 - 0.05, EV.wide1End + 0.2, 520, 440, 0.6);
// ---------------------------------------------------------------- 5. shiny vs dark
swish(EV.guess - 0.2, EV.we + 0.3, 0.01); pop(EV.we + 0.2, 0.9);
sparkle(EV.shiny - 0.05, EV.shiny + 0.45, 1); glide(EV.ice - 0.05, EV.isEnd + 0.1, 400, 220, 0.6);
swish(EV.isEnd - 0.35, EV.then + 0.35, 0.009);
// ---------------------------------------------------------------- 6. the old frames back to 2016, the arc of dots
whoosh(EV.team - 0.1, EV.looked + 0.45, false, 0.2);
OLD_T.forEach((t, i) => { swish(t, t + 0.5, 0.007); shutter(t + 0.5, 0.45); blip(t + 0.55, NOTE(81 - i * 2), 0.06, 0.007, 0.25); });
{ const N = 10; for (let i = 0; i < N; i++) blip(LINK[0] + (i / N) * (LINK[1] - LINK[0]), NOTE(74 + i * 2), 0.05, 0.007, 0.125); }
// ---------------------------------------------------------------- 7. the sky turns; millions of stars; the dot gets lost
whoosh(EV.so1 - 0.1, EV.way2 + 0.2, true, 0.3); tone(sfx, EV.sits - 0.1, EV.way2 + 0.4 - EV.sits, { wave: "tri", f: (u) => 98 * Math.pow(1.5, u), v: env(0.3, 0.4), gain: 0.03 });
sparkle(EV.millions - 0.1, EV.sky1 + 0.1, 0.8);
glide(EV.one2, EV.lost + 0.2, 880, 330, 0.7);
// ---------------------------------------------------------------- 8. the blink comparator
whoosh(EV.rubin2 - 0.4, EV.rubin2 + 0.45, true, 0.25);
BLINK.forEach((b) => shutter(b + 0.05, 0.9));
glide(EV.anything - 0.1, EV.anything + 0.5, 600, 360, 0.5); chime(EV.stands, ["D6", "A6", "D7"], 1);
// ---------------------------------------------------------------- 9. the wide tilted orbit, «round?», the line-up, the roll, the names
whoosh(EV.out + 0.25, EV.round - 0.1, false, 0.3);
tone(sfx, EV.now - 0.2, 0.7, { duty: 0.125, f: () => n("A5"), v: env(0.2, 0.5), gain: 0.008 }); seq(EV.round, ["E6", "A6"], 0.1, { gain: 0.01, duty: 0.5 });
LINE_IN.forEach((t, i) => { swish(t, t + 0.4, 0.006); pop(t + 0.45, 0.7); });
blip(LINE_IN[4] + 0.3, "D6", 0.08, 0.008, 0.125);
{ const [a, b] = ROLL; for (let t = a; t < b - 0.05; t += 0.07) tone(sfx, t, 0.05, { wave: "noise", f: () => 900 + 500 * ((t - a) / (b - a)), v: (u) => 1 - u, gain: 0.012 }); thunk(b, 1.2); chime(b + 0.08, ["D6", "F#6", "A6", "D7"], 1.1, 0.06); }
NAMES.forEach((t, i) => { pop(t, 1); blip(t + 0.05, NOTE(74 + [0, 2, 4, 7, 9][i]), 0.08, 0.009, 0.25); });

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["D6", "F#6", "A6", "D7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: calm space chiptune, 76 bpm, Dmaj7 Bm7 Gmaj7 A(sus)
const BPM = 76, BEAT = 60 / BPM, BAR = 4 * BEAT;
const PROG = [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 50, 52, 57]];
const full = (t) => (t > EV.dot1 && t < EV.one2) || t > EV.if2 - 0.5 ? 1 : 0.6;
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4], g = full(t0 + BAR / 2);
  // pad: the chord held through the bar, slow swell (soft pulse, 12.5 % duty), one octave up
  for (const m of ch.slice(1)) tone(bed, t0, BAR * 0.98, { duty: 0.125, f: (u, tt) => NOTE(m + 12) * (1 + 0.002 * Math.sin(tt * 5)), v: (u) => Math.min(1, u / 0.3, (1 - u) / 0.25) * 0.8, gain: 0.0085 });
  // bass: root, then fifth
  tone(bed, t0, BEAT * 1.9, { wave: "tri", f: () => NOTE(ch[0] - 12), v: (u) => 1 - 0.6 * u, gain: 0.075 }); tone(bed, t0 + 2 * BEAT, BEAT * 1.9, { wave: "tri", f: () => NOTE(ch[0] - 5), v: (u) => 1 - 0.6 * u, gain: 0.06 });
  // slow arpeggio, eighth notes, rising through the chord
  for (let e = 0; e < 8; e++) { if (g < 1 && e % 2) continue; const m = ch[[0, 1, 2, 3, 2, 3, 1, 2][e]] + 24; tone(bed, t0 + e * BEAT / 2, BEAT * 0.45, { duty: 0.25, f: () => NOTE(m), v: (u) => 1 - 0.8 * u, gain: 0.011 * g }); }
  // a high twinkle on the last beat of every other bar
  if (bar % 2 === 1) tone(bed, t0 + 3.5 * BEAT, BEAT * 0.4, { wave: "tri", f: () => NOTE(ch[3] + 36), v: (u) => 1 - u, gain: 0.018 });
}
// cadence: A(sus → major) then Dmaj9 held under the follow card, the core's soft final chord and fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, A = [57, 61, 64, 69];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.45, { duty: 0.25, f: () => NOTE(A[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.012 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.9, { wave: "tri", f: () => NOTE(33 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.075 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(38), v: (u) => 1 - u, gain: 0.09 });
  S.finish(VOICE_END, [62, 66, 69, 73, 76]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
