// 8-bit sound for «The Minecraft ghast's cry came from a real cat»: every cue is synthesised (synth-core.mjs, frozen copy
// of shared/synth-core.mjs) and lasts exactly as long as its motion, on the same constants as the picture: the fireball
// (crackle while it grows, whoosh while it flies), the camera push to the face, the ghast ↔ cat dissolves, the Halloween
// card, the portal lighting, the four portal passes (a whoosh into the swirl and out of it), the tags and cards, the cat
// waking (squeak) and grumbling, the REC blink, the knobs (ratchet while they turn), the stretch and the slide down, the
// throat growing, the extra ghasts dissolving in, the pitch row, the head shake, the purr (while the cat vibrates), the
// critters' question chirps, the follow card (tap, arpeggio, bell) and the ghast's little sob. No sfx inside the demo
// windows: the demos are the point (demos.mjs). Bed: a light chiptune in A minor that drops out under the demos and from
// the echo to the last real cry, ending on an E7 → Am cadence. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, DEMO, PASSES } from "./timeline.mjs";
import { FIRE, MORPH, WAKE, SHAKE, PURR, THROAT, CRITTERS } from "./scene.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, sweep, swish, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const pop = (t, a = "G5", b = "D6") => seq(t, [a, b], 0.05, { gain: 0.013, duty: 0.25 });
const ratchet = (a, b, g = 1) => { for (let t = a; t < b - 0.02; t += 0.045) { noise(t, 0.012, () => 5200, (u) => 1 - u, 0.016 * g); blip(t, "A6", 0.012, 0.004 * g, 0.125); } };
const shimmer = (a, b, down = false) => { const N = Math.max(4, Math.round((b - a) / 0.06)); for (let i = 0; i < N; i++) blip(a + (i / N) * (b - a), NOTE((down ? 96 - i * 1.5 : 82 + i * 1.5) | 0), 0.05, 0.006, 0.125); };
const pass = (p) => { // into the swirl (rising), out of it (falling), with a swirling noise for the whole pass
  sweep(p.t0, p.tm, true, 0.55, 180, 900); sweep(p.tm, p.t1, false, 0.45, 160, 800);
  noise(p.t0, p.t1 - p.t0, (u, tt) => 900 + 1600 * Math.sin(Math.PI * u) + 400 * Math.sin(tt * 18), (u) => Math.sin(Math.PI * u), 0.012); };

// ---------------------------------------------------------------- the hook: the fireball grows, then flies at the camera
noise(FIRE.grow[0], FIRE.grow[1] - FIRE.grow[0], (u, tt) => 1400 + 1800 * u + 600 * Math.abs(Math.sin(tt * 41)), (u) => (0.3 + 0.7 * u) * (0.6 + 0.4 * Math.abs(Math.sin(u * 37))), 0.008);
tone(sfx, FIRE.grow[0], FIRE.grow[1] - FIRE.grow[0], { wave: "tri", f: (u) => 90 + 70 * u, v: env(0.3, 0.1), gain: 0.03 });
swish(FIRE.shoot[0], FIRE.shoot[1], 0.02); tone(sfx, FIRE.shoot[0], FIRE.shoot[1] - FIRE.shoot[0], { duty: 0.25, f: (u) => 700 * Math.pow(0.35, u), v: env(0.05, 0.4), gain: 0.018 });
swish(EV.that - 0.1, EV.nether, 0.006);                                                             // the push to the face
shimmer(MORPH.to[0], MORPH.to[1], true); shimmer(MORPH.back[0], MORPH.back[1]);                     // ghast ↔ cat dissolves
// ---------------------------------------------------------------- Halloween update, the portal lights up
pop(EV.y2010 - 0.15); blip(EV.halloween - 0.1, "E6", 0.06, 0.012, 0.25);
{ const a = EV.update - 0.35, b = EV.update + 0.45; tone(sfx, a, b - a, { duty: 0.125, f: (u) => 220 + 440 * u, v: env(0.2, 0.3), gain: 0.012 }); shimmer(a, b); }
for (const p of PASSES) pass(p);
// ---------------------------------------------------------------- the studio
pop(EV.c418 - 0.1, "C6", "G6");                                                                    // C418 · composer
pop(EV.he1 - 0.15, "E5", "B5"); blip(EV.only1 - 0.1, "B5", 0.05, 0.01, 0.25); blip(EV.cats1 - 0.1, "E6", 0.05, 0.012, 0.25);
tone(sfx, WAKE.up[0], WAKE.up[1] - WAKE.up[0], { duty: 0.25, f: (u) => 500 + 700 * u * u, v: env(0.2, 0.3), gain: 0.012 }); // the cat wakes up
blip(WAKE.eyes[1] - 0.05, "A6", 0.04, 0.008, 0.125);
for (const k of [0, 1]) { const a = WAKE.grumble[0] + k * 0.3; tone(sfx, a, 0.28, { wave: "noise", f: (u, tt) => 300 + 180 * Math.abs(Math.sin(tt * 90)), v: (u) => Math.sin(Math.PI * u), gain: 0.014 }); tone(sfx, a, 0.28, { duty: 0.5, f: (u) => 140 - 30 * u, v: (u) => Math.sin(Math.PI * u), gain: 0.008 }); }
pop(EV.microphone - 0.1, "D6", "A6");
for (let t = EV.right - 0.1, i = 0; i < 2; i++, t += 0.18) blip(t, "C7", 0.06, 0.01, 0.5);   // REC beep-beep
// ---------------------------------------------------------------- the sound lab (sfx only between the demos)
swish(EV.heres - 0.15, EV.heres + 0.25, 0.008); seq(EV.heres + 0.05, ["E6", "B6"], 0.05, { gain: 0.012, duty: 0.25 });
blip(EV.short - 0.05, "G6", 0.04, 0.01, 0.25); seq(EV.high - 0.05, ["C6", "G6"], 0.05, { gain: 0.01, duty: 0.25 });
seq(EV.dont - 0.1, ["E6", "C6"], 0.08, { gain: 0.01, duty: 0.25 });                               // his recipe: ?
ratchet(EV.half - 0.05, EV.speed + 0.2);                                                            // SPEED ×1 → ×0.5
tone(sfx, EV.twice - 0.05, EV.long1End + 0.15 - EV.twice + 0.05, { duty: 0.25, f: (u) => 300 + 200 * u, v: env(0.15, 0.25), gain: 0.007 }); // the stretch
tone(sfx, EV.much1 - 0.05, EV.deeperEnd - EV.much1 + 0.02, { duty: 0.25, f: (u) => 600 * Math.pow(0.5, u), v: env(0.15, 0.25), gain: 0.01 }); // the slide down (ends before the demo)
tone(sfx, THROAT.grow[0], THROAT.grow[1] - THROAT.grow[0], { wave: "tri", f: (u) => 330 * Math.pow(0.45, u), v: env(0.2, 0.25), gain: 0.03 }); // the throat grows
// (the throat card fades in under the half-speed demo: no sound there)
ratchet(EV.echo - 0.1, EV.echo + 0.35);                                                             // ECHO off → long
shimmer(EV.game2 - 0.1, EV.game2 + 0.4); seq(EV.game2, ["A5", "C6", "E6"], 0.07, { gain: 0.01, duty: 0.25 });          // two more ghasts dissolve in, the pitch row
swish(PASSES[2].t0 - 0.15, PASSES[2].t0 + 0.2, 0.006);                                              // the panel leaves
// ---------------------------------------------------------------- the funny part
pop(EV.minecraft2 - 0.1, "C6", "E6"); blip(EV.purred - 0.05, "G6", 0.05, 0.01, 0.25);
pop(SHAKE[0], "E6", "C6"); tone(sfx, SHAKE[0] + 0.4, 0.3, { duty: 0.5, f: () => 110, v: (u) => 1 - u, gain: 0.012 }); // MEOW? struck out
for (let k = 0; k < 3; k++) { const a = SHAKE[0] + (k / 3) * (SHAKE[1] - SHAKE[0]); swish(a, a + (SHAKE[1] - SHAKE[0]) / 3, 0.005); }
{ const [a, b] = PURR; for (let t = a; t < b - 0.03; t += 0.09) tone(sfx, t, 0.08, { wave: "noise", f: () => 260, v: (u) => Math.sin(Math.PI * u) * (t < b - 0.4 ? 1 : (b - t) / 0.4), gain: 0.012 }); } // the purr, while it vibrates
// ---------------------------------------------------------------- more sounds: the critters' question chirps; the follow card; the sob
shimmer(CRITTERS.in, CRITTERS.in + 0.5);
for (const [t, a, b] of [[CRITTERS.waves[0], "C6", "G6"], [CRITTERS.waves[0] + 0.5, "E6", "B6"], [CRITTERS.waves[0] + 1.0, "D6", "A6"]]) seq(t, [a, b], 0.08, { gain: 0.009, duty: 0.25 });
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);
{ const s0 = EV.miss - 0.05 + 0.2; for (const k of [0, 0.45]) tone(sfx, s0 + k, 0.3, { wave: "tri", f: (u) => 520 * Math.pow(0.7, u), v: (u) => Math.sin(Math.PI * u), gain: 0.018 }); } // the ghast's sob

// ---------------------------------------------------------------- bed: A minor (i–VI–iv–V), 100 bpm; out under the demos
const BPM = 100, BEAT = 60 / BPM, BAR = 4 * BEAT;
const mute = [[DEMO.meow.t0 - 0.12, DEMO.meow.t0 + DEMO.meow.len + 0.1], [DEMO.half.t0 - 0.12, DEMO.half.t0 + DEMO.half.len + 0.1], [DEMO.echo.t0 - 0.12, DEMO.p12.t0 + DEMO.p12.len + 0.15]];
const section = (t) => (mute.some(([a, b]) => t >= a && t < b) ? "mute" : t < PASSES[0].t0 ? "full" : t < EV.heres - 0.2 ? "light" : t < PASSES[2].t0 ? "soft" : t < PASSES[3].t0 ? "light" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1, gain: 0.95 }, to: (lastBar + 1) * BAR });
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [52, 56, 59, 62];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(40 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(33), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [57, 60, 64, 69]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "bars", lastBar + 1);
