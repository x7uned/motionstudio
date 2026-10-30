// 8-bit sound for «Doom runs on a lawn mower, a light bulb, and even bacteria»: every cue is synthesised (synth-core.mjs,
// frozen copy via claw-machine) and lasts exactly as long as its motion, on the same constants as the picture: the camera
// dollies (whoosh scaled by distance), spotlights coming on, the scale, the slider glides (pitch follows the knob), ranked
// dots, the floppy and its code stream, a "frame tick" per exhibit (fast trill on the PC at 35/s, 30/s on the bulb, 12/s
// on the PDF, one click per lamp row in Minecraft, rare clicks as bacteria glow, eleven calendar flips and ONE bell on the
// twelfth day), the mower hum, the update bar, the shell's hinge and the SHELL ONLY stamp, the «?» shimmer and the follow
// card. No Doom music or sounds. Bed: a light chiptune in A minor (Am F C G), ending E7 → A major.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, CAM, PED, REVEAL, SLIDER, DOTS, SCALE, camFocus } from "./timeline.mjs";
import { TS_T } from "./devices.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const tick = (t, note = "C7", g = 1) => blip(t, note, 0.03, 0.012 * g, 0.25);
const clack = (t, g = 1) => { noise(t, 0.035, () => 3200, (u) => 1 - u, 0.04 * g); tone(sfx, t, 0.07, { wave: "tri", f: (u) => 190 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.05 * g }); };
const thud = (t, g = 1) => { tone(sfx, t, 0.14, { wave: "tri", f: (u) => 110 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.07 * g }); noise(t, 0.06, () => 600, (u) => 1 - u, 0.02 * g); };
const glide = (a, b, u0, u1, g = 1) => tone(sfx, a, b - a, { duty: 0.25, f: (u) => 330 * Math.pow(2, 2.2 * (u0 + (u1 - u0) * (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)))), v: env(0.15, 0.2), gain: 0.012 * g });
const trill = (a, b, rate, note, g = 1) => { for (let t = a; t < b - 0.01; t += 1 / rate) blip(t, note, Math.min(0.5 / rate, 0.03), 0.009 * g * (0.6 + 0.4 * Math.sin(Math.PI * (t - a) / (b - a))), 0.25); };
const tagIn = (t, hi = "A6") => { blip(t - 0.05, "E6", 0.05, 0.012, 0.25); blip(t + 0.03, hi, 0.07, 0.012, 0.25); };

// ---------------------------------------------------------------- camera dollies and spotlights
for (let i = 1; i < CAM.length; i++) { const [a, xa] = CAM[i - 1], [b, xb] = CAM[i], dist = Math.abs(xb - xa); if (dist < 20) continue; const g = Math.min(2, 0.6 + dist / 700);
  swish(a, b, 0.008 * g); tone(sfx, a, b - a, { wave: "tri", f: (u) => 260 + 360 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.008 * g }); }
for (const [k, r] of Object.entries(REVEAL)) { if (r < 0.5) continue; noise(r, 0.03, () => 5000, (u) => 1 - u, 0.016); tone(sfx, r + 0.02, 0.58, { wave: "tri", f: (u) => 220 + 220 * u, v: env(0.3, 0.4), gain: 0.012 }); }
// the mower hum while it is on screen and close (it drives the whole time; heard only when the camera is with it)
{ const hum = (a, b) => { tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 70 + 6 * Math.sin(tt * 31), v: (u, tt) => Math.max(0, 1 - Math.abs(camFocus(a + u * (b - a)) - PED.mower) / 300) * env(0.08, 0.2)(u), gain: 0.02 }); noise(a, b - a, () => 1400, (u) => 0.5 * Math.max(0, 1 - Math.abs(camFocus(a + u * (b - a)) - PED.mower) / 300), 0.004); };
  hum(0, 2.0); hum(17.6, 22.1); }

// ---------------------------------------------------------------- the scale
swish(SCALE.in, SCALE.in + 0.5, 0.008); seq(SCALE.in + 0.15, ["A5", "E6", "A6"], 0.08, { gain: 0.012, duty: 0.25 });
seq(EV.blink - 0.05, ["E7", "B7"], 0.05, { gain: 0.012, duty: 0.125 });
for (let t = EV.twelve1 - 0.1; t < EV.days1End + 0.6; t += (2 * Math.PI) / 9) blip(t, "A6", 0.06, 0.012, 0.25);       // «12 DAYS» blinks
for (let i = 1; i < SLIDER.length; i++) { const [a, u0] = SLIDER[i - 1], [b, u1] = SLIDER[i]; if (Math.abs(u1 - u0) > 0.003) glide(a, b, u0, u1, 0.8 + Math.abs(u1 - u0) * 2); }
for (const [t0, u] of DOTS) { blip(t0, NOTE(76 + Math.round(u * 12)), 0.05, 0.014, 0.5); blip(t0 + 0.06, NOTE(83 + Math.round(u * 12)), 0.08, 0.01, 0.25); }
thud(SLIDER[SLIDER.length - 1][0], 0.6);                                                                              // the knob hits 12 DAYS
tone(sfx, EV.someone - 0.2, 0.5, { duty: 0.5, f: (u, tt) => 700 + 60 * Math.sin(tt * 240), v: env(0.1, 0.5), gain: 0.005 });   // knob trembles

// ---------------------------------------------------------------- the floppy, FREE CODE, SMALL, the code stream
tone(sfx, EV.doom2 - 0.25, 0.8, { wave: "tri", f: (u) => 200 * Math.pow(2.5, u), v: env(0.2, 0.3), gain: 0.02 });
blip(EV.y1993 - 0.05, "C6", 0.08, 0.012, 0.25); blip(EV.y1993 + 0.05, "G6", 0.1, 0.012, 0.25);
tagIn(EV.free, "B6"); tagIn(EV.small, "E7");
for (let i = 0; i < 46; i += 2) { const ts = EV.people - 0.2 + i * 0.034; blip(ts + 0.03, NOTE(84 + ((i * 7) % 12)), 0.03, 0.006, 0.125); }
noise(EV.people - 0.2, 1.6 + 46 * 0.034, (u) => 3000 + 2000 * Math.sin(u * 9), (u) => Math.sin(Math.PI * u), 0.004);

// ---------------------------------------------------------------- the frame ticks and the exhibits
tagIn(EV.f35); trill(EV.f35, EV.f35 + 0.95, 35, "E7", 1.1);                                                           // PC 35/s
tagIn(EV.official, "D7");
{ const a = EV.official + 0.2, b = EV.update + 0.55; for (let k = 0; k < 10; k++) tick(a + ((b - a) * k) / 10, NOTE(79 + k), 0.8); seq(EV.update + 0.5, ["C6", "E6", "G6"], 0.07, { gain: 0.014, duty: 0.25 }); }
blip(EV.own - 0.05, "G6", 0.06, 0.01, 0.25);
blip(EV.chip1 - 0.05, "B6", 0.06, 0.012, 0.25);
tagIn(EV.f30); trill(EV.f30, EV.f30 + 0.85, 30, "D7", 1.0);                                                           // bulb ~30/s
blip(EV.added - 0.05, "E6", 0.05, 0.011, 0.25); blip(EV.added + 0.05, "B6", 0.08, 0.011, 0.25);
tagIn(EV.f12); for (let t = Math.ceil((EV.f12) * 12) / 12; t < EV.f12 + 1.0; t += 1 / 12) tick(t, "A6", 1.1);       // PDF 12/s, on the page's own steps
// the pregnancy-test shell: the hinge, the stamp, the two labels
{ const a = EV.plastic - 0.35, b = a + 0.95; tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 380 + 140 * Math.sin(u * Math.PI) + 30 * Math.sin(tt * 70), v: env(0.15, 0.2), gain: 0.007 }); clack(b - 0.03, 0.4); }
{ const t = EV.shell - 0.12 + 0.25; thud(t, 0.9); noise(t, 0.08, () => 2400, (u) => 1 - u, 0.03); }
blip(EV.chip2 - 0.05, "C7", 0.05, 0.011, 0.25); blip(EV.screen3 - 0.05, "G6", 0.05, 0.011, 0.25);
// Minecraft: the old frame clears (fast falling ticks), then one redstone click per lamp row as the new frame is built
{ const c0 = EV.minecraft - 0.25, c1 = EV.minecraft + 0.45, b0 = EV.redstone - 0.2, b1 = EV.server + 0.2, rows = 18;
  for (let j = 0; j < rows; j += 2) tick(c0 + ((c1 - c0) * j) / rows, NOTE(88 - j), 0.6);
  for (let j = 0; j < rows; j++) { const t = b0 + ((b1 - b0 - 0.3) * j) / rows; noise(t, 0.02, () => 6000, (u) => 1 - u, 0.012); tone(sfx, t, 0.05, { duty: 0.5, f: () => NOTE(60 + (j % 4) * 2), v: (u) => 1 - u, gain: 0.008 }); } }
tagIn(EV.s23, "F6"); seq(EV.sped - 0.05, ["C7", "G7"], 0.04, { gain: 0.012, duty: 0.125 });
// bacteria: the old picture fades, then rare soft clicks as dots begin to glow; the clock and the calendar
tone(sfx, EV.glowing - 0.75, 0.55, { wave: "tri", f: (u) => 500 * Math.pow(0.5, u), v: env(0.1, 0.3), gain: 0.01 });
for (let k = 0; k < 14; k++) { const t = EV.glowing - 0.2 + k * ((EV.frame2 - EV.glowing + 0.3) / 14); tone(sfx, t, 0.06, { wave: "tri", f: () => NOTE(81 + ((k * 5) % 7)), v: (u) => 1 - u, gain: 0.01 }); }
tagIn(EV.model, "E7");
blip(EV.m70 - 0.1, "A5", 0.08, 0.012, 0.25); for (let t = EV.m70 + 0.2; t < EV.years + 0.3; t += 0.42) tick(t, "G6", 0.5);
blip(EV.six - 0.1, "C6", 0.06, 0.012, 0.25); blip(EV.six + 0.02, "C7", 0.12, 0.012, 0.25);
// TypeScript: THE SLOWEST, eleven calendar flips, ONE bell on day twelve, the first frame dissolving in
blip(EV.slowest - 0.05, "E5", 0.1, 0.012, 0.25); blip(EV.slowest + 0.08, "C5", 0.16, 0.012, 0.25);
{ const [a, b] = TS_T.flip; for (let i = 0; i < 11; i++) { const t = a + ((b - a) * i) / 11; noise(t, 0.08, (u) => 2000 + 3000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.01); }
  tone(sfx, b, 1.1, { wave: "tri", f: () => n("E6"), v: (u) => Math.pow(1 - u, 1.6), gain: 0.03 }); tone(sfx, b, 0.9, { duty: 0.125, f: () => n("B6"), v: (u) => Math.pow(1 - u, 2), gain: 0.008 }); }
tagIn(EV.twelve3, "C7");
{ const [a, b] = TS_T.emerge; tone(sfx, a, b - a, { duty: 0.25, f: (u) => 600 + 900 * u, v: env(0.2, 0.3), gain: 0.006 }); noise(a, b - a, () => 7000, env(0.3, 0.3), 0.004); }
// the «?»
{ const a = EV.something - 0.25, b = EV.stranger + 0.2; for (let t = a, k = 0; t < b; t += 0.09, k++) blip(t, NOTE(88 + [0, 4, 7, 11, 7, 4][k % 6]), 0.06, 0.006 * Math.sin((Math.PI * (t - a)) / (b - a)) + 0.002, 0.125); }

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: A minor (Am F C G), 108 bpm
const BPM = 108, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < EV.lets - 0.2 ? "full" : t < EV.doom2 - 0.2 ? "light" : t < EV.normal - 0.3 ? "soft" : t < EV.famous - 0.3 ? "light" : t < EV.minecraft - 0.3 ? "soft" : t < EV.slowest - 0.3 ? "light" : t < EV.someone - 0.3 ? "tension" : t < EV.follow - 0.2 ? "soft" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]], tensionProg: [[57, 60, 64], [56, 59, 64]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
// cadence: one bar of E7 into a held A major that rings to the end, then the core's short final fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [64, 68, 71, 74];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(40 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(45), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [57, 61, 64, 69]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
