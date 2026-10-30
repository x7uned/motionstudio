// 8-bit sound for «You've been pressing fake buttons»: every cue is synthesised and lasts as long as its motion (same
// timeline as the picture). Not a loop: a sneaky, comic chiptune bed (Dm – G – C – Am, staccato), the camera moves, the
// lead's card sounds (stamps, the 2,500 dots powering down, BLOCKED buzzer, key turn, 51 technicians flipping, the phone's
// X-ray: no shutter + the recorded CLICK.WAV, the control bar), the builders' per-motion cues (levels/*-motions.mjs via
// cues.mjs), the share/follow card, and a final chord. Writes audio/sfx.wav and audio/bed.wav (48 kHz mono).
import { fileURLToPath } from "node:url";
import { makeSynth } from "./synth-core.mjs";
import { EV, END, CAM, VOICE_END, PAN_TO_LOBBY, RIDE, BACK_TO_CORNER, PRESSES } from "./timeline.mjs";
import { CUES } from "./cues.mjs";
import { CARD, PLANE, CLICK, BELL } from "./levels/cta.mjs";
import { HOOK, NYC_TAG, NYC_CARD, LAW, FIRE, POLL, PHONE, CONTROL, GREY, TECH } from "./levels/cards.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const S = makeSynth(END), { blip, seq, noise, sweep, swish, shutter, tone } = S;

// ---- camera moves: the drift onto the corner, the pan into the lobby, the glide back to the corner (the ride is the elevator's own cue)
swish(CAM[0].t, CAM[1].t, 0.005);
swish(PAN_TO_LOBBY[0], PAN_TO_LOBBY[1], 0.014);
swish(BACK_TO_CORNER[0], BACK_TO_CORNER[1], 0.014);
// ---- cards: each arrives with a soft swish + a two-note blip
const arrive = (t, notes = ["E6", "A6"]) => { swish(t, t + 0.35, 0.01); seq(t + 0.1, notes, 0.06, { gain: 0.014, duty: 0.25 }); };
const slap = (t) => { noise(t, 0.06, () => 2600, (u) => 1 - u, 0.05); tone(S.sfx, t, 0.08, { wave: "tri", f: (u) => 260 - 120 * u, v: (u) => 1 - u, gain: 0.04 }); };
// hook title drop and the 100% FAKE stamp on "fake"
swish(HOOK[0], HOOK[0] + 0.4, 0.012); slap(EV.fake1 + 0.03);
// NYC card: arrives; the grid appears row by row on "2004" (a quick rising ripple); 2,500 dots power down (falling ticks); 77% FAKE stamp
arrive(NYC_TAG[0], ["C6", "G6"]); blip(EV.computers + 0.1, "E6", 0.05, 0.01, 0.25);
arrive(NYC_CARD[0], ["E6", "B6"]);
for (let i = 0; i < 8; i++) blip(EV.y2004 + i * 0.055, ["C6", "D6", "E6", "G6", "A6", "C7", "D7", "E7"][i], 0.03, 0.007, 0.125);
for (let t = GREY[0], i = 0; t < GREY[1]; t += 0.045, i++) blip(t, ["E6", "D6", "C6", "A5", "G5", "E5", "D5", "C5"][Math.min(7, Math.floor((i * 0.045) / (GREY[1] - GREY[0]) * 8))], 0.03, 0.008, 0.25);
sweep(GREY[0], GREY[1], false, 0.5, 200, 900);
blip(EV.n3250, "G6", 0.05, 0.012, 0.25);
slap(EV.nothing + 0.03);
// US law card; CLOSE … BLOCKED (buzzer on "can't"); the countdown ring ticks while the doors wait
arrive(LAW[0], ["D6", "A6"]);
tone(S.sfx, EV.cant, 0.22, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.018 });
for (let t = EV.doors; t < EV.slowlyEnd - 0.05; t += 0.25) blip(t, "A6", 0.02, 0.006, 0.125);
seq(EV.slowly, ["G5", "C6"], 0.09, { gain: 0.012, duty: 0.25 });
// firefighter card: the key turns on "key"
arrive(FIRE[0], ["F6", "C7"]);
noise(EV.key, 0.04, () => 4000, (u) => 1 - u, 0.03); tone(S.sfx, EV.key + 0.04, 0.12, { duty: 0.125, f: (u) => 600 + 300 * u, v: (u) => 1 - u, gain: 0.014 }); blip(EV.key + 0.2, "E7", 0.05, 0.012, 0.25);
// poll card; 51 technicians flip (a fast blip roll), the counter; FAKE ONES stamp
arrive(POLL[0], ["E6", "B6"]);
for (let t = TECH[0], i = 0; t < TECH[1]; t += 0.03, i++) blip(t, ["C7", "E7", "G7"][i % 3], 0.02, 0.006, 0.125);
seq(EV.n70, ["C6", "G6"], 0.06, { gain: 0.012, duty: 0.25 });
slap(EV.fake2 + 0.03);
// phone X-ray card: arrival, a scan hum while it is up, the iris spinning + an X buzz on "shutter", the recorded CLICK.WAV played
arrive(PHONE[0], ["G6", "D7"]);
tone(S.sfx, PHONE[0] + 0.3, PHONE[1] - PHONE[0] - 0.6, { wave: "tri", f: (u, tt) => 180 + 6 * Math.sin(tt * 30), v: () => 0.6, gain: 0.006 });
tone(S.sfx, EV.shutter - 0.1, 0.3, { duty: 0.125, f: (u, tt) => 500 + 200 * Math.sin(tt * 60), v: (u) => 1 - u, gain: 0.008 });
tone(S.sfx, EV.shutter + 0.15, 0.2, { duty: 0.5, f: () => 98, v: (u) => 1 - u * 0.5, gain: 0.016 });
shutter(EV.recorded + 0.05, 0.9);                     // the card's CLICK.WAV plays — the same fake click the phone made
// control card: a rising "+" with every press after "Pressing", MAX on "good", NO CHANGE buzz, FEEL BETTER heart chime
arrive(CONTROL[0], ["C6", "E6"]);
PRESSES.filter((p) => p > CONTROL[0]).forEach((p, i) => tone(S.sfx, p, 0.18, { duty: 0.25, f: (u) => 400 + 160 * i + 500 * u, v: (u) => 1 - u, gain: 0.012 }));
seq(EV.good, ["C6", "E6", "G6", "C7"], 0.06, { gain: 0.016, duty: 0.125 });
tone(S.sfx, EV.change, 0.2, { duty: 0.5, f: () => 110, v: (u) => 1 - u * 0.5, gain: 0.014 });
seq(EV.changes, ["E6", "G6", "B6", "E7"], 0.07, { gain: 0.016, duty: 0.125 });
// ---- the share/follow card (same as the sister films)
S.ctaSounds({ CARD, PLANE, CLICK, BELL }, EV);
// ---- per-module motion cues (button presses, the WALK light, cars, the elevator, the thermostat, the phone …)
for (const cue of CUES) cue(S.SFX);

// ---- sneaky comic bed: Dm – G – C – Am at 112 BPM, walking staccato bass; soft under the hook, full through the
// explanation, light under the share card, then a final D-minor-to-F lift.
const section = (t) => (t < EV.start ? "soft" : t < EV.liked - 0.2 ? "full" : t < VOICE_END + 0.05 ? "light" : "mute");
S.bedTrack({ prog: [[50, 53, 57], [43, 47, 50], [48, 52, 55], [45, 48, 52]], bpm: 112, section, style: { bass: "walk", arp: 0.125, arpOct: 2 } });
S.finish(VOICE_END, [53, 57, 60, 65]);
const pk = S.write(HERE + "audio/");
console.log("sfx peak", pk.toFixed(3), "END", END.toFixed(3));
