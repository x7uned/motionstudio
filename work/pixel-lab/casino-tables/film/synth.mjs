// 8-bit sound for «In blackjack, you can both bust and you still lose» (Casino secrets 5/5): every cue is synthesised
// (synth-core.mjs, frozen copy via casino-money) from the same constants as the picture (timeline.mjs / scene.mjs), each
// lasting its motion: card swishes and flips from the shoe, BUST and YOU LOSE stamps, chips sliding to the dealer's rack, the
// rewind, the order panel, the waiting dealer's ticks, the signs rising and the payout chips stacking / leaving, the hero's
// steps, the board's five reds, the chips rushing to BLACK, the board powering down, the wheel and the bouncing ball, the dice
// rattling in the fist, the throw, the wall hit and the bounces, the calm die, the glass shimmer, the edge glint, the serial
// ring, the fake die's «wrong», the dealer's palm flips, the camera tilt and the domes' LEDs, the follow card. Bed: the
// series' calm casino-lounge chiptune (Dm7 G7 Cmaj7 A7, swung, walking bass), cadence G7 → Cmaj7.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, HERO_X, HOOK, REW, SIGNB, ROUL, DICE, PALMS, DOMES } from "./timeline.mjs";
import { keyX, HOOK_DEAL, REP_DEAL, RUSH, SPIN, DICE_T } from "./scene.mjs";
import { CARD, CLICK, BELL, HAND } from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { tone, seq, noise, swish, sweep, sfx, bed } = S;
const blip = (t, note, dur = 0.07, gain = 0.05, duty = 0.5) => tone(sfx, t, dur, { duty, f: () => (typeof note === "number" ? note : n(note)), v: (u) => 1 - u * 0.7, gain });
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const pop = (t, g = 1) => tone(sfx, t, 0.08, { duty: 0.25, f: (u) => 500 + 700 * u, v: (u) => 1 - u, gain: 0.012 * g });
const clack = (t, g = 1, f = 3200) => { tone(sfx, t, 0.03, { wave: "noise", f: () => f, v: (u) => 1 - u, gain: 0.03 * g }); tone(sfx, t, 0.035, { wave: "tri", f: () => 1300, v: (u) => 1 - u, gain: 0.02 * g }); };
const thud = (t, g = 1, f = 110) => { tone(sfx, t, 0.12, { wave: "tri", f: (u) => f * (1 - 0.4 * u), v: (u) => 1 - u, gain: 0.06 * g }); tone(sfx, t, 0.04, { wave: "noise", f: () => 1800, v: (u) => 1 - u, gain: 0.02 * g }); };
const whoosh = (a, b, up, g = 1) => { noise(a, b - a, (u) => (up ? 1500 + 3500 * u : 5000 - 3500 * u), (u) => Math.sin(Math.PI * u), 0.01 * g); sweep(a, b, up, 0.35 * g, 200, 700); };
const tick = (t, g = 1, hi = true) => { tone(sfx, t, 0.018, { wave: "noise", f: () => (hi ? 7000 : 4800), v: (u) => 1 - u, gain: 0.014 * g }); tone(sfx, t, 0.02, { wave: "tri", f: () => (hi ? 2400 : 1800), v: (u) => 1 - u, gain: 0.01 * g }); };
const wrong = (t, g = 1) => { blip(t, "D4", 0.12, 0.016 * g, 0.5); blip(t + 0.12, "C#4", 0.24, 0.014 * g, 0.5); };
const shimmer = (a, b, up, g = 1) => { const N = Math.max(3, Math.round((b - a) / 0.05)); for (let i = 0; i < N; i++) blip(a + (i / N) * (b - a), NOTE((up ? 76 + i * 2 : 96 - i * 2) % 100), 0.045, 0.006 * g, 0.125); };
const chime = (t, notes, g = 1) => seq(t, notes, 0.07, { gain: 0.013 * g, duty: 0.25 });
const paper = (a, b, g = 1) => noise(a, b - a, (u) => 3000 + 2500 * Math.sin(u * 7), (u) => Math.sin(Math.PI * u), 0.012 * g);

// ---------------------------------------------------------------- steps (one per 60 cm stride, only while moving)
function steps(keys, t0, t1, gain, hi) { let last = null; for (let t = t0; t < t1; t += 1 / 240) { const x = keyX(keys, t), v = Math.abs(keyX(keys, t + 0.02) - keyX(keys, t - 0.02)) / 0.04; if (v < 15) continue; const k = Math.floor(Math.abs(x) / 60); if (last !== null && k !== last) tone(sfx, t, 0.035, { wave: "noise", f: () => (k % 2 ? hi : hi * 0.78), v: (u) => 1 - u, gain }); last = k; } }
steps(HERO_X, 0, END, 0.011, 900);

const card = (t0, t1, flip = true) => { swish(Math.max(0, t0), t1, 0.011); if (flip) noise(t1 - 0.12, 0.08, () => 5200, (u) => 1 - u, 0.012); tick(t1, 0.6, true); };
const stampHit = (t, g = 1) => { thud(t, 0.9 * g, 90); clack(t, 0.8 * g, 1600); };
const slideChips = (a, b, g = 1) => { noise(a, b - a, () => 1000, env(0.2, 0.3), 0.007 * g); clack(b - 0.03, 0.8 * g, 2600); clack(b + 0.03, 0.5 * g, 3100); };
// ---------------------------------------------------------------- 1. the hook hand
card(HOOK.heroCard[0] + 0.25, HOOK.heroCard[1]); blip(HOOK.heroCard[1] + 0.05, "E6", 0.06, 0.008, 0.25);
card(HOOK.dealerCard[0], HOOK.dealerCard[1]); blip(HOOK.dealerCard[1] + 0.05, "E6", 0.06, 0.008, 0.25);
stampHit(HOOK.bustHero + 0.08); wrong(HOOK.bustHero + 0.1, 0.7); stampHit(HOOK.bustDealer + 0.08, 0.8);
slideChips(HOOK.chips[0], HOOK.chips[1], 1.1);
stampHit(HOOK.stamp + 0.1, 1.3); tone(sfx, HOOK.stamp + 0.12, 0.6, { duty: 0.5, f: (u) => n("E4") * Math.pow(2, -u * 0.4), v: env(0.05, 0.4), gain: 0.012 });
chime(HOOK.edge + 0.1, ["A6", "E7"], 0.8);
// ---------------------------------------------------------------- 2. rewind, order panel, replay
tone(sfx, REW.t0, REW.t1 - REW.t0, { duty: 0.25, f: (u, tt) => 900 + 700 * Math.sin(tt * 60) - 500 * u, v: env(0.1, 0.2), gain: 0.008 });
noise(REW.t0, REW.t1 - REW.t0, (u) => 6000 - 3000 * u, env(0.1, 0.2), 0.008);
pop(REW.order + 0.05, 1.1); seq(REW.order + 0.12, ["C6", "G6"], 0.07, { gain: 0.012, duty: 0.25 });
REP_DEAL.hero.concat(REP_DEAL.dealer).forEach(([a, b], i) => card(a, b, i !== 3 && i !== 4));
blip(REW.hit[1] + 0.05, "E6", 0.06, 0.008, 0.25); stampHit(REW.bust + 0.08); wrong(REW.bust + 0.1, 0.7);
slideChips(REW.chips[0], REW.chips[1], 1.1);
for (let t = REW.wait[0] + 0.1; t < REW.wait[1]; t += 0.32) tick(t, 0.6, Math.round(t / 0.32) % 2 === 0);
// ---------------------------------------------------------------- 3. the signs and the payout stacks
whoosh(EV.now - 0.2, EV.sign + 0.25, true, 0.25);
chime(SIGNB.look + 0.2, ["G6"], 0.6);
tone(sfx, SIGNB.other, 0.45, { duty: 0.25, f: (u) => 400 * Math.pow(2, u), v: env(0.1, 0.3), gain: 0.008 });
for (let k = 0; k < 15; k++) clack(SIGNB.other + 0.25 + (k / 15) * 0.5, 0.35, 2600 + k * 60);
for (let k = 0; k < 15; k++) clack(SIGNB.payGrow[0] + (k / 15) * (SIGNB.payGrow[1] - SIGNB.payGrow[0]), 0.35, 2800 + k * 60);
for (let k = 0; k < 3; k++) { const t = SIGNB.payCut[0] + (k + 0.5) / 3 * (SIGNB.payCut[1] - SIGNB.payCut[0]); blip(t, ["A5", "F5", "D5"][k], 0.1, 0.011, 0.25); }
card(SIGNB.hands - 0.1, SIGNB.hands + 0.35, false); card(SIGNB.hands, SIGNB.hands + 0.4, false);
for (let k = 0; k < 6; k++) tick(SIGNB.glow + k * 0.08, 0.4, true); wrong(SIGNB.glow + 0.5, 0.6);
// ---------------------------------------------------------------- 4. roulette
whoosh(EV.walk - 0.2, EV.screen + 0.1, true, 0.3);
blip(ROUL.board, "C6", 0.05, 0.01, 0.25); blip(ROUL.board + 0.06, "C7", 0.08, 0.008, 0.125);
for (let i = 0; i < 5; i++) blip(ROUL.reds[0] + i * 0.13, NOTE(72 + i * 2), 0.09, 0.012, 0.25);
for (const r of RUSH) slideChips(r.t0, r.t0 + 0.55, 0.9);
tone(sfx, ROUL.dim[0], ROUL.dim[1] - ROUL.dim[0] + 0.2, { duty: 0.25, f: (u) => 800 * Math.pow(2, -u * 2), v: env(0.05, 0.4), gain: 0.01 });
pop(ROUL.plate + 0.05, 1.2); blip(ROUL.plate + 0.12, "G5", 0.12, 0.01, 0.25);
// wheel: a click per fret passing a fixed point while the ball runs, slowing down
{ let last = 0; for (let t = SPIN.t0; t < Math.min(SPIN.tLand, EV.dice1 + 0.6); t += 1 / 240) { const u = (t - SPIN.t0) / (SPIN.tLand - SPIN.t0), rate = 22 * (1 - u) * (1 - u) + 2; if (t - last > 1 / rate) { tick(t, 0.35 * (1 - u * 0.5), true); last = t; } } }
noise(SPIN.t0, 0.3, () => 2400, env(0.1, 0.5), 0.008);
// ---------------------------------------------------------------- 5. dice
whoosh(EV.care - 0.3, EV.dice1 + 0.6, true, 0.3);
for (let t = DICE.shake[0]; t < DICE.shake[1]; t += 1 / 13) { clack(t, 0.45, 3400); clack(t + 0.025, 0.3, 2900); }
pop(DICE.bubble[0] + 0.02, 1.2); blip(DICE.bubble[0] + 0.08, "C7", 0.06, 0.012, 0.25);
whoosh(DICE_T.throw, DICE_T.hit, true, 0.35);
clack(DICE_T.hit, 1.1, 1500); thud(DICE_T.hit, 0.6, 140);
{ const L = DICE_T.land, H = DICE_T.hit; for (let k = 1; k <= 7; k++) { const u = Math.min(1, ((k - 0.5) / 3.5) / 1.15), t = H + u * (L - H); if (t < L) clack(t, 0.8 * (1 - k / 9), 3000 - k * 150); } clack(L - 0.02, 0.4, 2400); }
chime(DICE.proud[0] + 0.1, ["C6", "E6", "G6"], 0.8);
whoosh(EV.die - 0.35, EV.die + 0.45, false, 0.25);
blip(DICE_T.land + 0.15, "A5", 0.25, 0.008, 0.125); blip(DICE_T.land + 0.6, "E6", 0.05, 0.006, 0.25);
whoosh(EV.casino1 - 0.25, EV.seeThrough + 0.1, false, 0.2);
shimmer(DICE.glass, DICE.glass + 0.5, true, 0.8);
for (let k = 0; k < 12; k++) blip(DICE.edges[0] + k * (DICE.edges[1] + 0.4 - DICE.edges[0]) / 12, NOTE(84 + (k % 4) * 3), 0.04, 0.006, 0.125);
pop(DICE.serial + 0.05, 1); chime(DICE.serial + 0.15, ["E6", "B6"], 0.8);
swish(DICE.swap[0], DICE.swap[0] + 0.5, 0.01); wrong(DICE.swap[0] + 0.5, 1.1); swish(DICE.swap[1] - 0.45, DICE.swap[1] + 0.3, 0.008);
// ---------------------------------------------------------------- 6. palms and domes
whoosh(EV.and4 - 0.25, EV.leaves + 0.5, false, 0.25);
swish(PALMS.up[0], PALMS.up[1] + 0.1, 0.012); blip(PALMS.up[1], "G6", 0.08, 0.01, 0.25);
for (const k of [0.25, 0.75]) swish(PALMS.flip[0] + k * (PALMS.flip[1] - PALMS.flip[0]) - 0.1, PALMS.flip[0] + k * (PALMS.flip[1] - PALMS.flip[0]) + 0.1, 0.009);
whoosh(DOMES.tilt[0], DOMES.tilt[1], true, 0.35);
for (let i = 0; i < 6; i++) blip(DOMES.lights + i * 0.11, i % 2 ? "B6" : "E7", 0.05, 0.007, 0.125);
for (let i = 0; i < 4; i++) blip(DOMES.dice[0] + 0.2 + i * 0.12, "A6", 0.04, 0.006, 0.25);

// ---------------------------------------------------------------- the follow card
swish(CARD.in, CARD.in + 0.35, 0.012); seq(CARD.in + 0.1, ["E6", "A6"], 0.06, { gain: 0.016, duty: 0.25 });
swish(HAND[0], CLICK, 0.006);
blip(CLICK, "C7", 0.025, 0.022, 0.25); seq(CLICK + 0.06, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.02, duty: 0.125 });
for (let t = BELL[0], i = 0; t < BELL[1] - 0.1; t += 0.12, i++) blip(t, i % 2 ? "A6" : "E7", 0.08, 0.012 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) + 0.004, 0.125);

// ---------------------------------------------------------------- bed: calm casino-lounge chiptune, swung, 92 bpm (Dm7 G7 Cmaj7 A7), same as films 1–3
const BPM = 92, BEAT = 60 / BPM, BAR = 4 * BEAT, SW = 0.62;
const PROG = [[50, 53, 57, 60], [43, 47, 50, 53], [48, 52, 55, 59], [45, 49, 52, 55]];
const lastBar = Math.floor((VOICE_END - 0.3) / BAR) - 1;
for (let bar = 0; bar <= lastBar; bar++) {
  const t0 = bar * BAR, ch = PROG[bar % 4];
  const walk = [ch[0], ch[1], ch[2], ch[1]].map((m) => m - 12);
  for (let b = 0; b < 4; b++) tone(bed, t0 + b * BEAT, BEAT * 0.8, { wave: "tri", f: () => NOTE(walk[b]), v: (u) => 1 - 0.5 * u, gain: 0.085 });
  for (const b of [1, 3]) for (const m of ch.slice(1)) tone(bed, t0 + b * BEAT + (b === 3 ? BEAT * (SW - 0.5) : 0), BEAT * 0.35, { duty: 0.125, f: () => NOTE(m + 12), v: (u) => 1 - 0.8 * u, gain: 0.011 });
  for (let e = 0; e < 8; e++) { const t = t0 + Math.floor(e / 2) * BEAT + (e % 2 ? BEAT * SW : 0); tone(bed, t, 0.03, { wave: "noise", f: () => 12000, v: (u) => 1 - u, gain: e % 2 ? 0.006 : 0.009 }); }
  if (bar % 2 === 1) { const mel = [ch[3] + 24, ch[2] + 24, ch[1] + 24]; mel.forEach((m, i) => tone(bed, t0 + (2 + i * 0.5) * BEAT + (i % 2 ? BEAT * (SW - 0.5) : 0), BEAT * 0.45, { wave: "tri", f: () => NOTE(m), v: (u) => 1 - 0.6 * u, gain: 0.03 })); }
}
// cadence: G7 → Cmaj7 held under the follow card, then the core's soft final chord and fade
{ const t0 = (lastBar + 1) * BAR, t1 = VOICE_END + 0.1, G7 = [55, 59, 62, 65];
  for (let s = 0; t0 + s * (BEAT / 2) < t1 - 0.05; s++) { const t = t0 + s * (BEAT / 2); tone(bed, t, BEAT * 0.4, { duty: 0.125, f: () => NOTE(G7[s % 4] + 12), v: (u) => 1 - 0.7 * u, gain: 0.014 }); if (s % 2 === 0) tone(bed, t, BEAT * 0.8, { wave: "tri", f: () => NOTE(43 + (s % 4 ? 7 : 0)), v: (u) => 1 - 0.5 * u, gain: 0.085 }); }
  tone(bed, t1, END - t1 - 0.05, { wave: "tri", f: () => NOTE(36), v: (u) => 1 - u, gain: 0.1 });
  S.finish(VOICE_END, [60, 64, 67, 71]); }
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "end", END.toFixed(3), "cadence bar", ((lastBar + 1) * BAR).toFixed(2));
