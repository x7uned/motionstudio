// 8-bit sound for «That free drink in a casino isn't free» (Casino secrets 4/5): every cue is synthesised (synth-core.mjs,
// frozen copy via casino-floor) from the same constants as the picture (timeline.mjs / scene.mjs), each lasting its motion:
// the waitress's and the hero's steps (one per stride, only while walking), the FREE tag turning and its counter ticking, the
// bills sliding under the bars, the chip stacks clacking out and hopping like toys, the bill going grey, the hesitant «hmm»
// and the register beep with the gifts popping into the bag, the gift card's sparkle and bow, the card sliding into the
// reader, the spin presses (button clack, reel whirr, three stop clunks), the three icons filling, the merge and the
// EXPECTED LOSS board with its rolling «$$$», the slice snip and the three gifts, the upgrade sparkles, the big player's
// chips sliding away and the REBATE envelope, the glass clink, the sip, the chips dropping onto the bigger bet, the sign
// coming down on its chains with a «wrong» buzz on «law», the camera moves and the follow card. Bed: the series' calm
// casino-lounge chiptune (Dm7 G7 Cmaj7 A7, swung, walking bass), cadence G7 → Cmaj7.
import { fileURLToPath } from "node:url";
import { makeSynth, NOTE, n } from "./synth-core.mjs";
import { EV, END, VOICE_END, HERO_X, WAIT_X, WAIT2_X, TAG, CASH, TOY, SHOPB, CARD as GCARD, ICONS, BOARD, GIFT, BIG, DRINK, LAW } from "./timeline.mjs";
import { keyX, PRESSES, SPINS, CHIP_OUT, BIG_STACKS } from "./scene.mjs";
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
steps(WAIT_X, 0, 9, 0.008, 1500); steps(WAIT2_X, WAIT2_X[0][0], WAIT2_X[3][0], 0.008, 1500);
// glasses on the tray clink softly as she walks in
tick(WAIT_X[1][0] + 0.05, 0.7, true);

// ---------------------------------------------------------------- 1. the FREE tag turns; its counter keeps rolling
blip(0.25, "E6", 0.06, 0.008, 0.25); blip(0.4, "B6", 0.08, 0.007, 0.125);
noise(TAG.flip0, TAG.flip1 - TAG.flip0, (u) => 2500 + 3000 * Math.abs(Math.cos(Math.PI * u)), (u) => Math.sin(Math.PI * u), 0.012);
blip(TAG.flip1, "A5", 0.1, 0.014, 0.25); blip(TAG.flip1 + 0.1, "F5", 0.18, 0.012, 0.25);
for (let t = TAG.flip1 + 0.05; t < TAG.out + 0.35; t += 0.07) tick(t, 0.45 * (1 - clamp01((t - TAG.out) / 0.35)), Math.round(t * 14) % 2 === 0);
// ---------------------------------------------------------------- 2. cash in, chips out, chips hop like toys
paper(CASH.push0 + 0.1, CASH.push1 + 0.5, 1.2);
CHIP_OUT.forEach((ch, i) => { const t = CASH.chips0 + i * 0.1; noise(t, 0.5, () => 900, env(0.2, 0.4), 0.006); clack(t + 0.55, 1, 3000 + i * 300); });
seq(CASH.chips1 - 0.1, ["C6", "E6", "G6"], 0.06, { gain: 0.012, duty: 0.25 });
for (let i = 0; i < CHIP_OUT.length; i++) for (let m = 1; m < 12; m++) { const t = TOY.hop0 + (m + i * 0.22) * 0.46; if (t > TOY.hop1 - 0.1) break; const amp = Math.min(clamp01((t - TOY.hop0) / 0.15), 1 - clamp01((t - TOY.hop1) / 0.3));
  if (m % 2 === i % 2) { clack(t, 0.55 * amp, 2600 + i * 500); tone(sfx, t - 0.2, 0.18, { duty: 0.25, f: (u) => NOTE(72 + i * 3) * (1 + 0.5 * Math.sin(Math.PI * u)), v: (u) => 1 - u * 0.5, gain: 0.004 * amp }); } }
tone(sfx, TOY.bill0, TOY.bill1 - TOY.bill0 + 0.2, { duty: 0.125, f: (u) => 520 * Math.pow(2, -u * 0.8), v: env(0.15, 0.4), gain: 0.008 });
// ---------------------------------------------------------------- 3. the shop: «hmm», the beep, the gifts into the bag
tone(sfx, SHOPB.doubt0, SHOPB.doubt1 - SHOPB.doubt0, { wave: "tri", f: (u, tt) => 300 + 40 * Math.sin(tt * 10), v: env(0.15, 0.3), gain: 0.02 });
pop(SHOPB.doubt0 - 0.05, 0.9);
shimmer(SHOPB.swap - 0.02, SHOPB.swap + 0.25, true, 0.9);
blip(SHOPB.tap + 0.05, "B6", 0.09, 0.02, 0.5); blip(SHOPB.tap + 0.16, "E7", 0.14, 0.016, 0.5);
SHOPB.items.forEach((ti, i) => { tone(sfx, ti, 0.42, { duty: 0.25, f: (u) => NOTE(76 + i * 2) * (1 + 0.4 * Math.sin(Math.PI * u)), v: env(0.2, 0.3), gain: 0.005 }); paper(ti + 0.38, ti + 0.5, 0.8); blip(ti + 0.42, NOTE(84 + [0, 2, 4, 7, 9][i]), 0.06, 0.01, 0.25); });
// ---------------------------------------------------------------- 4. the player card: sparkle, bow, ribbon, reader
shimmer(GCARD.in0, GCARD.in1, false, 0.9);
chime(GCARD.bow, ["G6", "B6", "D7", "G7"], 1.1);
swish(GCARD.untie, GCARD.untie + 0.35, 0.01);
noise(GCARD.insert0, GCARD.insert1 - GCARD.insert0, (u) => 1800 + 2500 * u, env(0.2, 0.2), 0.008); clack(GCARD.insert1 - 0.05, 0.9, 2200);
blip(GCARD.insert1 + 0.05, "E6", 0.07, 0.014, 0.25); blip(GCARD.insert1 + 0.14, "A6", 0.12, 0.012, 0.25);
// spins: button clack, reel whirr while any reel moves, a clunk at each reel stop
SPINS.forEach((sp, i) => { clack(PRESSES[i], 0.8, 2800); const end = sp.stop[2]; tone(sfx, sp.t0, end - sp.t0, { duty: 0.125, f: (u, tt) => 180 + 60 * Math.sin(tt * 40), v: env(0.1, 0.15), gain: 0.008 }); noise(sp.t0, end - sp.t0, () => 1400, env(0.1, 0.2), 0.004);
  sp.stop.forEach((ts, r) => thud(ts, 0.45, 150 + r * 25)); });
// ---------------------------------------------------------------- 5. icons fill; the board; the edge; $$$ rolls
for (let i = 0; i < 3; i++) pop(ICONS.in + i * 0.12, 1);
[[ICONS.much, 0.55, 72], [ICONS.fast, 0.55, 76], [ICONS.long, 0.65, 79]].forEach(([t, d, m]) => tone(sfx, t, d, { duty: 0.25, f: (u) => NOTE(m) * Math.pow(2, u), v: env(0.1, 0.3), gain: 0.008 }));
swish(ICONS.merge0, ICONS.merge1, 0.012); seq(BOARD.in + 0.15, ["D5", "F5", "A5", "C6"], 0.05, { gain: 0.012, duty: 0.25 });
whoosh(ICONS.edge0, ICONS.edge1, false, 0.5); chime(ICONS.edge1, ["A6", "E7"], 0.9);
for (let t = BOARD.roll; t < BOARD.lock; t += 0.06) tick(t, 0.5, Math.round(t / 0.06) % 2 === 0);
thud(BOARD.lock, 0.8, 120); blip(BOARD.lock + 0.02, "A5", 0.12, 0.012, 0.25);
// ---------------------------------------------------------------- 6. the slice → gifts; bracket; bigger guess → better gifts
noise(BOARD.cut, 0.05, () => 7000, (u) => 1 - u, 0.03); noise(BOARD.cut + 0.08, 0.05, () => 6000, (u) => 1 - u, 0.025);
tone(sfx, BOARD.cut + 0.1, 0.4, { wave: "tri", f: (u) => 900 - 500 * u, v: env(0.1, 0.3), gain: 0.012 });
[GIFT.dinner, GIFT.room, GIFT.show].forEach((t, i) => { pop(t + 0.3, 1.1); blip(t + 0.36, ["C6", "E6", "G6"][i], 0.1, 0.014, 0.25); });
for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) tick(GIFT.bracket0 + i * 0.15 + k * 0.05, 0.35, true);
tone(sfx, GIFT.grow0, GIFT.grow1 - GIFT.grow0, { duty: 0.25, f: (u) => 330 * Math.pow(2, u * 1.2), v: env(0.15, 0.3), gain: 0.008 });
GIFT.up.forEach((t, i) => shimmer(t, t + 0.3, true, 1 + i * 0.1));
// ---------------------------------------------------------------- 7. the big player: chips away, REBATE back, happy
BIG_STACKS.forEach((_, i) => { const t = BIG.lose0 + i * 0.12; noise(t, 0.7, () => 1100, env(0.2, 0.3), 0.006); clack(t + 0.7, 0.6, 2400); });
tone(sfx, BIG.lose0 + 0.2, 0.6, { duty: 0.5, f: (u) => n("E4") * Math.pow(2, -u * 0.25), v: env(0.1, 0.3), gain: 0.008 });
paper(BIG.env0, BIG.env1, 1.1); noise(BIG.env1, 0.15, () => 5000, (u) => 1 - u, 0.01);
chime(BIG.happy0, ["C6", "E6", "G6", "C7"], 1); blip(BIG.happy0 + 0.35, "E7", 0.2, 0.008, 0.125);
// ---------------------------------------------------------------- 8. the drink: clink, sip, chips drop onto the bigger bet
blip(DRINK.hand1 - 0.3, "E7", 0.05, 0.012, 0.25); blip(DRINK.hand1 - 0.26, "B7", 0.12, 0.008, 0.125);
S.bubbles(DRINK.sip0 + 0.35, DRINK.sip1 - 0.05, 0.7, 4);
for (let k = 0; k < 7; k++) { const t = DRINK.stack0 + ((k + 1) / 7) * (DRINK.stack1 - DRINK.stack0) - 0.01; clack(t, 0.7, 3000 + k * 150); blip(t, NOTE(72 + [0, 2, 4, 5, 7, 9, 12][k]), 0.05, 0.007, 0.25); }
// ---------------------------------------------------------------- 9. the sign comes down; «law»
for (let t = LAW.drop0 + 0.05; t < LAW.drop1; t += 0.05) tick(t, 0.5, Math.round(t * 20) % 2 === 0);
thud(LAW.drop1, 1, 100); clack(LAW.drop1, 0.8, 1800);
tone(sfx, LAW.cross, 0.45, { duty: 0.25, f: (u) => 700 - 300 * u, v: env(0.05, 0.3), gain: 0.006 }); wrong(LAW.cross + 0.4, 1);
// ---------------------------------------------------------------- camera moves
whoosh(EV.shopping - 1.2, EV.shopping + 0.2, true, 0.25); whoosh(EV.money2End - 0.2, EV.card + 0.2, true, 0.3);
whoosh(EV.some1 - 0.4, EV.players + 0.4, true, 0.3); whoosh(EV.places - 0.4, EV.law, true, 0.3);

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
