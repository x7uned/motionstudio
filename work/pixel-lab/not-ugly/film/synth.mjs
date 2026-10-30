// 8-bit sound for «You're not ugly»: every cue is synthesised and lasts as long as its motion (same timeline as the
// picture). Not a loop: a warm, kind chiptune bed (Fmaj7 – Em7 – Dm7 – Cmaj7, 84 BPM, soft triangle bass), the lead's
// three-cause tags, the builders' per-motion cues (levels/*-motions.mjs via cues.mjs: the VIEW, the selfie, the flip, the
// X-ray sound paths, the blind test, the room), the share/follow card, a final chord. Writes audio/sfx.wav, audio/bed.wav.
import { fileURLToPath } from "node:url";
import { makeSynth } from "./synth-core.mjs";
import { EV, END, VOICE_END } from "./timeline.mjs";
import { CUES } from "./cues.mjs";
import { CARD, PLANE, CLICK, BELL } from "./levels/cta.mjs";
import { TAGS, NOT_FACE } from "./levels/cards.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { blip, seq, noise, swish, tone } = S;

// ---- the three causes: "YOUR FACE" crossed out (a soft scratch), then three pops rising in pitch
noise(EV.face3, 0.22, (u) => 3000 + 2000 * u, (u) => Math.sin(Math.PI * u), 0.01);
blip(NOT_FACE[0] + 0.05, "E6", 0.05, 0.01, 0.25);
TAGS.forEach((tg, i) => { seq(tg.word, [["C6", "G6"], ["E6", "B6"], ["G6", "D7"]][i], 0.06, { gain: 0.018, duty: 0.25 }); swish(tg.word - 0.02, tg.word + 0.3, 0.008); });
seq(EV.skull + 0.25, ["C7", "E7", "G7"], 0.05, { gain: 0.01, duty: 0.125 });
// ---- the share/follow card (same as the sister films)
S.ctaSounds({ CARD, PLANE, CLICK, BELL }, EV);
// ---- per-module motion cues
for (const cue of CUES) cue(S.SFX);

// ---- warm bed: Fmaj7 – Em7 – Dm7 – Cmaj7 (chord tones cycled), 84 BPM; soft for the first two sentences, full for the
// explanation, light under the share card; no kick, gentle hats; a final C-major-7 chord.
const section = (t) => (t < EV.selfie - 0.2 ? "soft" : t < EV.liked - 0.2 ? "full" : t < VOICE_END + 0.05 ? "light" : "mute");
S.bedTrack({ prog: [[53, 57, 64], [52, 55, 62], [50, 53, 60], [48, 52, 59]], bpm: 84, section, style: { bass: "octave", arp: 0.125, arpOct: 2, kick: false, gain: 0.85 } });
S.finish(VOICE_END, [48, 52, 55, 59]);
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3));
