// 8-bit sound for «Why airplane windows are round»: every cue is synthesised and lasts as long as its motion (same
// timeline as the picture). Not a loop: an airy chiptune bed (C – G – Am – F, 100 BPM) that turns tense (Am – F – Dm – E,
// busier hats) from "Sharp corners" to "tore open" and resolves on "Round corners"; a soft cabin hum; the lead's cards
// (one tick per pressure pulse, the SAFETY FEATURE badge); the builders' per-motion cues (levels/*-motions.mjs via
// cues.mjs); the share/follow card; a final chord. Writes audio/sfx.wav and audio/bed.wav.
import { fileURLToPath } from "node:url";
import { makeSynth } from "./synth-core.mjs";
import { EV, END, VOICE_END } from "./timeline.mjs";
import { CUES } from "./cues.mjs";
import { CARD, PLANE, CLICK, BELL } from "./levels/cta.mjs";
import { CYCLE_CARD, BADGE, PULSES } from "./levels/cards.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { blip, seq, noise, swish, tone } = S;

// ---- a very soft cabin/engine hum under everything (filtered noise, constant, low) — the plane is always flying
noise(0, END, () => 420, () => 0.5, 0.0035);
// ---- lead's cards
swish(CYCLE_CARD[0], CYCLE_CARD[0] + 0.35, 0.01); blip(CYCLE_CARD[0] + 0.12, "E6", 0.05, 0.012, 0.25);
PULSES.forEach((p, i) => blip(p - 0.06, i === PULSES.length - 1 ? "C5" : ["E6", "F6", "G6", "A6", "B6"][i % 5], 0.06, 0.013, 0.25));
swish(BADGE[0], BADGE[0] + 0.4, 0.012); seq(EV.safety + 0.05, ["C6", "E6", "G6", "C7", "E7"], 0.06, { gain: 0.018, duty: 0.125 });
// ---- the share/follow card (same as the sister films)
S.ctaSounds({ CARD, PLANE, CLICK, BELL }, EV);
// ---- per-module motion cues (ghost window, Comet flashback, breathing, stress, crack, heal, panes, air, fog …)
for (const cue of CUES) cue(S.SFX);

// ---- airy bed with a tense middle
const section = (t) => (t < EV.because ? "soft" : t >= EV.sharp1 - 0.1 && t < EV.round2 - 0.1 ? "tension" : t < EV.liked - 0.2 ? "full" : t < VOICE_END + 0.05 ? "light" : "mute");
S.bedTrack({ prog: [[48, 52, 55], [43, 47, 50], [45, 48, 52], [41, 45, 48]], tensionProg: [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]], bpm: 100, section, style: { bass: "octave", arp: 0.25, arpOct: 2 } });
S.finish(VOICE_END, [48, 52, 55, 60]);
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3));
