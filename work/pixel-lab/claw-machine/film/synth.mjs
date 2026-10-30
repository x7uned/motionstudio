// 8-bit sound for «Many claw machines choose when to let you win»: every cue is synthesised (synth-core.mjs, frozen copy
// via card-shuffle) and lasts exactly as long as its motion, on the same constants as the picture: the coin hands and the
// coin clinks, the counter rolls (one tick per digit), the carriage motor over every carriage move, the winch over every
// descent and lift, the coil zap as the voltage rises, the prong clacks, the GRIP FADE (a tone whose pitch follows the
// needle from 48 V down to 10 V), the slips (uh-oh, the fall, the soft landing), the win (fall into the chute, the prize
// door, the arcade jingle with the marquee flash), the manual (slide, cover flip, three marker strokes), the key, the
// door creak, the LCD lines, the gauge light, the MODE slide switch, the die, the reset roll, WORST TIME, the camera pans,
// the neighbour's joystick nudges and lock-on, "limp", the setting highlight and the follow card.
// Bed: a light chiptune in D minor ending on A7 → D major. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, GRABS, CLAW_X, CLAW_Y, COIN_DROPS, COUNT, BOOK, DOOR_T, PAGES, PAN_T, pan, track } from "./timeline.mjs";
import { needle, N_X, N_Y, N_SHUT } from "./claw.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sfx, bed } = S;
const { G1, G2, G3 } = GRABS;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const onMain = (t) => pan(t) < 300, onNext = (t) => pan(t) > 190;

// ---------------------------------------------------------------- sound atoms
const motor = (a, b, g = 1) => { tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 92 + 8 * Math.sin(tt * 47), v: env(0.12, 0.15), gain: 0.022 * g }); noise(a, b - a, () => 900, env(0.12, 0.15), 0.004 * g); };
const winch = (a, b, up, g = 1) => tone(sfx, a, b - a, { duty: 0.25, f: (u, tt) => (up ? 190 + 140 * u : 330 - 140 * u) + 10 * Math.sin(tt * 60), v: env(0.1, 0.15), gain: 0.011 * g });
const clack = (t, g = 1) => { noise(t, 0.035, () => 3200, (u) => 1 - u, 0.04 * g); tone(sfx, t, 0.07, { wave: "tri", f: (u) => 190 * Math.pow(0.7, u), v: (u) => 1 - u, gain: 0.05 * g }); };
const zap = (a, b, g = 1) => tone(sfx, a, b - a, { duty: 0.25, f: (u) => 220 * Math.pow(4, u), v: env(0.1, 0.2), gain: 0.012 * g });
const fall = (a, b, g = 1) => tone(sfx, a, b - a, { wave: "tri", f: (u) => 1100 * Math.pow(0.28, u), v: env(0.08, 0.1), gain: 0.03 * g });
const thud = (t, g = 1) => { tone(sfx, t, 0.14, { wave: "tri", f: (u) => 110 * Math.pow(0.6, u), v: (u) => 1 - u, gain: 0.07 * g }); noise(t, 0.06, () => 600, (u) => 1 - u, 0.02 * g); };
const uhoh = (t, g = 1) => { blip(t, "E5", 0.09, 0.016 * g, 0.25); blip(t + 0.11, "C5", 0.14, 0.016 * g, 0.25); };
const tick = (t, note = "C7", g = 1) => blip(t, note, 0.03, 0.012 * g, 0.25);
const creak = (a, b, g = 1) => tone(sfx, a, b - a, { duty: 0.125, f: (u, tt) => 340 + 120 * Math.sin(u * Math.PI) + 25 * Math.sin(tt * 70), v: env(0.15, 0.2), gain: 0.009 * g });
const flip = (a, b, g = 1) => noise(a, b - a, (u) => 2000 + 4000 * Math.sin(Math.PI * u), (u) => Math.sin(Math.PI * u), 0.012 * g);
const marker = (a, b) => { noise(a, b - a, (u) => 5200 + 800 * u, env(0.1, 0.15), 0.006); tone(sfx, a, b - a, { duty: 0.5, f: (u) => 2300 + 300 * u, v: env(0.15, 0.2), gain: 0.0035 }); };
/** The grip fading: a pulse tone whose pitch follows the needle (48 V high … 10 V low), duty thinning as it weakens. */
const powerTone = (a, b, g = 1) => tone(sfx, a, b - a, { duty: 0.25, f: (u) => 140 + 9 * Math.max(0, needle(a + u * (b - a))), v: env(0.08, 0.15), gain: 0.016 * g });

// ---------------------------------------------------------------- coins and the counter
for (const d of COIN_DROPS) {
  const t0 = d.t, land = t0 + 0.5;
  if (!d.first) swish(t0 - 0.7, t0 - 0.1, 0.006);
  for (let k = 0; k < 4; k++) tick(t0 + 0.08 + k * 0.1, k % 2 ? "E7" : "B6", 0.5);
  noise(land - 0.02, 0.04, () => 7000, (u) => 1 - u, 0.03); blip(land, "B6", 0.12, 0.02, 0.5); blip(land + 0.03, "E7", 0.16, 0.012, 0.5);
  noise(land + 0.06, 0.18, (u) => 2500 - 1500 * u, (u) => 1 - u, 0.012);                    // the coin rattling down the mech
  if (!d.first) swish(land + 0.1, land + 0.8, 0.005);
}
// counter rolls: one tick per digit passing, a brighter tick on the last (from the COUNT track itself)
{ let prev = Math.round(track(COUNT, 0)); for (let t = 0; t < END; t += 1 / 120) { const v = track(COUNT, t), r = Math.round(v); if (r !== prev) { const last = Math.abs(v - Math.round(track(COUNT, t + 0.4))) < 0.05; blip(t, NOTE(84 + Math.min(12, r)), 0.05, last ? 0.016 : 0.011, 0.25); prev = r; } } }

// ---------------------------------------------------------------- main claw: carriage, winch, zap, clacks, the fades
for (let i = 1; i < CLAW_X.length; i++) { const [a, xa] = CLAW_X[i - 1], [b, xb] = CLAW_X[i]; if (Math.abs(xb - xa) > 1 && onMain((a + b) / 2)) motor(Math.max(0, a), b); }
for (let i = 1; i < CLAW_Y.length; i++) { const [a, ya] = CLAW_Y[i - 1], [b, yb] = CLAW_Y[i]; if (Math.abs(yb - ya) > 4 && onMain((a + b) / 2)) winch(Math.max(0, a), b, yb < ya); }
clack(2.05 + 0.2, 0.4);                                                                      // the hook's idle prong snap
for (const [a, b] of [[G1.shut - 0.3, G1.shut - 0.05], [G2.shut - 0.3, G2.shut - 0.05]]) zap(a, b);
zap(EV.closes - 0.06, EV.closes + 0.14, 1.4);
clack(G1.shut - 0.04, 0.8); clack(G2.shut - 0.04, 0.8); clack(EV.closes + 0.12, 1.4);          // "closes hard": the loudest clack
noise(EV.hard - 0.05, 0.3, () => 1800, env(0.2, 0.3), 0.008);                                // the squeeze on "hard"
powerTone(EV.grip - 0.15, EV.up1 + 0.15); powerTone(G3.limp0, G3.limp1 + 0.05, 1.1);          // the grip fades 48 → 10 V
// slips: uh-oh, the fall, the soft landing
for (const [a, b] of [[G1.slip0, G1.slip1], [G3.slip0, G3.slip1]]) { uhoh(a); fall(a, b); thud(b, 0.7); blip(b + 0.02, "C4", 0.12, 0.01, 0.5); }
// the win: holds steady (a calm high note while carried), opens over the chute, the fall, the door, the jingle
tone(sfx, G2.lift0, G2.drop - G2.lift0, { duty: 0.25, f: () => 140 + 9 * 48, v: env(0.1, 0.1), gain: 0.008 });
clack(G2.drop + 0.05, 0.5); fall(G2.drop, G2.drop + 0.42, 0.8); thud(G2.drop + 0.42, 0.8);
swish(G2.drop + 0.5, G2.drop + 0.95, 0.008); thud(G2.drop + 0.92, 0.5);
{ const t0 = EV.onEnd + 0.2; seq(t0, ["C6", "E6", "G6", "C7", "G6", "C7", "E7"], 0.075, { gain: 0.02, duty: 0.25 }); for (let i = 0; i < 6; i++) blip(t0 + 0.55 + i * 0.1, i % 2 ? "G7" : "E7", 0.06, 0.008 * (1 - i / 6) + 0.003, 0.125); }

// ---------------------------------------------------------------- the manual
swish(BOOK.a[0], BOOK.a[0] + 0.4, 0.008); flip(BOOK.open[0], BOOK.open[1]); swish(BOOK.a[1], BOOK.a[1] + 0.45, 0.007);
swish(BOOK.b[0], BOOK.b[0] + 0.4, 0.008); { const [m0, m1] = BOOK.mark, per = (m1 - m0) / 3; for (let i = 0; i < 3; i++) marker(m0 + i * per, m0 + (i + 1) * per - 0.03); } swish(BOOK.b[1], BOOK.b[1] + 0.45, 0.007);

// ---------------------------------------------------------------- the key, the door, the LCD
swish(DOOR_T.hand[0], DOOR_T.hand[1], 0.006); noise(DOOR_T.hand[1], 0.03, () => 5000, (u) => 1 - u, 0.02); tick(DOOR_T.hand[1] + 0.01, "G6");
noise(DOOR_T.turn[0], 0.03, () => 4000, (u) => 1 - u, 0.025); clack(DOOR_T.turn[1] - 0.03, 0.35);
creak(DOOR_T.open[0], DOOR_T.open[1]); swish(DOOR_T.out[0], DOOR_T.out[1], 0.005);
seq(DOOR_T.open[1] + 0.05, ["C6", "G6"], 0.06, { gain: 0.01, duty: 0.25 });                    // LCD boots
for (const p of PAGES.slice(1)) if (onMain(p.t0)) { noise(p.t0, 0.12, (u) => 3000 + 2000 * u, (u) => Math.sin(Math.PI * u), 0.006); blip(p.t0 + 0.1, "A6", 0.04, 0.008, 0.25); }
for (const [t, note] of [[EV.sets, "E6"], [EV.one2 - 0.05, "G6"], [EV.hundred - 0.05, "C7"], [EV.games - 0.05, "E6"], [EV.play1 - 0.05, "D6"], [EV.prize1 - 0.05, "F6"], [EV.then1 - 0.05, "A6"]]) blip(t, note, 0.05, 0.011, 0.25);
seq(EV.math - 0.08, ["D6", "A6", "D7"], 0.06, { gain: 0.015, duty: 0.25 });
// the gauge lights up; WEAK / FULL; the setting highlight
tone(sfx, EV.on1 - 0.25, 0.55, { duty: 0.125, f: (u) => 300 + 500 * u, v: env(0.3, 0.3), gain: 0.007 }); blip(EV.weak1 - 0.02, "D5", 0.12, 0.012, 0.25);
seq(EV.number + 0.2, ["D6", "A6"], 0.08, { gain: 0.014, duty: 0.25 });
seq(EV.its - 0.1, ["F5", "D5"], 0.12, { gain: 0.012, duty: 0.25, dur: 0.2 });

// ---------------------------------------------------------------- modes, the die, the reset, WORST TIME
for (const [a, b] of [[EV.pick - 0.1, EV.pick + 0.25], [EV.others2 + 0.05, EV.wait + 0.1]]) { noise(a, b - a, () => 1800, env(0.2, 0.2), 0.008); clack(b - 0.02, 0.3); }
{ const r0 = EV.pick, r1 = EV.random + 0.45; let prev = -1; for (let t = r0; t < r1; t += 1 / 240) { const k = Math.max(0, Math.min(1, (t - r0) / (r1 - r0))), e = k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2, q = Math.floor((e * Math.PI * 4.5 + 0.2) / (Math.PI / 2)); if (q !== prev && prev >= 0) { noise(t, 0.025, () => 4200, (u) => 1 - u, 0.018); tone(sfx, t, 0.03, { wave: "tri", f: () => 700, v: (u) => 1 - u, gain: 0.015 }); } prev = q; } }
{ const t0 = EV.worst - 0.25; swish(t0, t0 + 0.4, 0.006); tone(sfx, EV.worst - 0.02, 0.18, { duty: 0.5, f: () => n("E3"), v: env(0.05, 0.3), gain: 0.012 }); tone(sfx, EV.worst + 0.18, 0.28, { duty: 0.5, f: () => n("C3"), v: env(0.05, 0.4), gain: 0.012 }); }

// ---------------------------------------------------------------- camera pans, the neighbour machine
for (const [a, b] of [PAN_T.go, PAN_T.back]) { swish(a, b, 0.012); tone(sfx, a, b - a, { wave: "tri", f: (u) => 300 + 400 * Math.sin(Math.PI * u), v: (u) => Math.sin(Math.PI * u), gain: 0.012 }); }
for (let i = 1; i < N_X.length; i++) { const [a, xa] = N_X[i - 1], [b, xb] = N_X[i]; if (Math.abs(xb - xa) > 1 && a > 30) { motor(a, b, 0.8); tick(a + 0.02, "G6", 0.8); } }   // joystick nudges
for (let i = 1; i < N_Y.length; i++) { const [a, ya] = N_Y[i - 1], [b, yb] = N_Y[i]; if (Math.abs(yb - ya) > 4 && a > 30 && onNext((a + b) / 2)) winch(a, b, yb < ya, 0.8); }
seq(EV.aim - 0.2, ["E6", "G6", "B6"], 0.06, { gain: 0.013, duty: 0.25 });                    // lock-on
zap(N_SHUT - 0.3, N_SHUT - 0.05, 0.7); clack(N_SHUT - 0.04, 0.7);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: D minor (Dm Bb C A), 112 bpm
const BPM = 112, BEAT = 60 / BPM, BAR = 4 * BEAT;
const section = (t) => (t < EV.and1 - 0.2 ? "full" : t < EV.on1 - 0.2 ? "light" : t < EV.one4 - 0.3 ? "tension" : t < EV.when2 - 0.3 ? "soft" : t < EV.some - 0.2 ? "full" : t < EV.on3 - 0.2 ? "light" : t < EV.not1 - 0.2 ? "tension" : t < EV.but - 0.2 ? "light" : t < EV.its - 0.2 ? "tension" : t < EV.follow - 0.2 ? "soft" : "full");
const lastBar = Math.floor((VOICE_END - 0.4) / BAR) - 1;
S.bedTrack({ prog: [[62, 65, 69], [58, 62, 65], [60, 64, 67], [57, 61, 64]], tensionProg: [[62, 65, 69], [61, 64, 68]], bpm: BPM, section, style: { bass: "walk", arp: 0.25, arpOct: 1 }, to: (lastBar + 1) * BAR });
// cadence: one bar of A7 into a held D major that rings to the end, then the core's short final fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, V7 = [69, 73, 76, 79];
  for (let s16 = 0; t0 + s16 * (BEAT / 4) < t1 - 0.05; s16++) { const t = t0 + s16 * (BEAT / 4); tone(bed, t, (BEAT / 4) * 0.9, { duty: 0.25, f: () => NOTE(V7[s16 % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.018 }); if (s16 % 4 === 0) tone(bed, t, BEAT * 0.85, { wave: "tri", f: () => NOTE(45 + (s16 % 8 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.09 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(38), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [62, 66, 69, 74]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
