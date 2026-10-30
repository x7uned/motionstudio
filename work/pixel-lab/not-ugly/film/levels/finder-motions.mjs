// FINDER · sound motions of the VIEW panel: one entry per visible motion, computed from the same constants as the
// picture (each 8-bit sound lasts exactly as long as its motion). level = "finder".
import { EV, MODE, PHONE_FLY } from "../timeline.mjs";
import { OPEN, CLOSE, GLITCH, NEAR, CALIPER, PCT, DIST_IN, DIST_15, TURN, HUH, LIKE, SPLIT, VOTE_YOU, VOTE_FR, GLOW_MIR, GLOW_REAL, GRIN } from "./finder-view.mjs";
import { AIR_ON, BONE_ON, BASS, EQ_ON, EQ_LOW, DEEP, AIR_TRAVEL } from "./finder-xray.mjs";
import { REC_DROP } from "./finder-record.mjs";
import { CARDS_IN, PLAY0, PLAY_D, PLAY_LEN, YOURS_TURN, ROWS_IN, STARS_YOU, STARS_OTH } from "./finder-blind.mjs";

const M = (t0, t1, kind, note, level = 0.6) => ({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: "finder", gain: level, note });
const XF = 0.2, sw = (name) => [MODE[name][0] - XF, MODE[name][0] + XF];
export const MOTIONS = [
  M(OPEN[0], OPEN[1], "screen", "the VIEW pops open (your face in a camera app)"),
  M(GLITCH[0], GLITCH[1], "glitch", "the camera frame glitches on 'lying'"),
  M(NEAR[0], NEAR[1], "whoosh", "the camera comes close: wide-angle bulge"),
  M(DIST_IN[0], DIST_IN[1], "blip", "'30 CM' chip", 0.45),
  M(CALIPER.in[0], CALIPER.in[1], "swish", "calipers slide in under the nose", 0.45),
  M(CALIPER.close[0], CALIPER.close[1], "tick", "caliper jaws close onto the nose", 0.5),
  M(PCT[0], PCT[1], "pop", "'+30%' tag pops on '30% wider'"),
  M(PHONE_FLY[0], PHONE_FLY[1], "swish", "the view backs off to 1.5 m, bulge relaxes", 0.4),
  M(DIST_15[0], DIST_15[1], "blip", "chip turns into '1.5 M'", 0.45),
  M(CALIPER.out[0], CALIPER.out[1], "dissolve", "calipers dissolve", 0.3),
  M(EV.nobody - 0.05, EV.nobody + 0.5, "sparkle", "the 1.5 m face smiles", 0.35),
  M(...sw("flip"), "dissolve", "the view becomes a PHOTO card", 0.35),
  M(HUH[0], HUH[1], "pop", "'?' bubble on 'wrong'", 0.45),
  M(TURN[0], TURN[1], "flip", "card turns into the mirror image on 'flipped'"),
  M(LIKE[0], LIKE[1], "pop", "heart on 'like'"),
  M(SPLIT[0], SPLIT[1], "swish", "MIRROR slides left, REAL slides in; 1977 STUDY", 0.45),
  M(VOTE_YOU[0], VOTE_YOU[1], "pop", "heart YOU over MIRROR"),
  M(GLOW_MIR[0], GLOW_MIR[1], "glow", "MIRROR card glows", 0.3),
  M(VOTE_FR[0], VOTE_FR[1], "pop", "heart FRIENDS over REAL"),
  M(GLOW_REAL[0], GLOW_REAL[1], "glow", "REAL card glows", 0.3),
  M(...sw("xray"), "screen", "X-ray light box on", 0.45),
  M(AIR_ON[0], AIR_ON[0] + AIR_TRAVEL(), "wind", "first cyan AIR ring travels around into the ear", 0.35),
  M(BONE_ON[0], BONE_ON[1] + 0.1, "thud", "orange BONE waves start inside the skull", 0.45),
  M(EQ_ON[0], EQ_ON[1], "blip", "EQ meter appears", 0.4),
  M(BASS[0], BASS[1], "engine", "bone waves slow and widen (bass)", 0.4),
  M(EQ_LOW[0], EQ_LOW[1], "rise", "LOW bars rise", 0.45),
  M(DEEP[0], DEEP[0] + 0.36, "fall", "DEEPER arrow drops"),
  M(...sw("record"), "screen", "two waveforms", 0.4),
  M(REC_DROP[0], REC_DROP[1], "delete", "the bone part of the recording dissolves on 'air'"),
  M(...sw("test"), "screen", "BLIND TEST", 0.4),
  M(CARDS_IN, CARDS_IN + 0.79, "count", "8 voice cards pop in one by one", 0.35),
  M(PLAY0, PLAY0 + 7 * PLAY_D + PLAY_LEN, "chatter", "the voice cards play one after another", 0.35),
  M(YOURS_TURN[0], YOURS_TURN[1], "flip", "one card turns into YOURS on 'theirs'"),
  M(ROWS_IN[0], ROWS_IN[1], "swish", "score rows YOU / OTHERS slide in", 0.4),
  ...STARS_YOU.map((t, j) => M(t, t + 0.16, "blip", `YOU star ${j + 1}`, 0.45)),
  ...STARS_OTH.map((t, j) => M(t, t + 0.16, "blip", `OTHERS star ${j + 1}`, 0.4)),
  M(...sw("happy"), "dissolve", "your happy face", 0.35),
  M(GRIN[0], GRIN[1], "sparkle", "big smile + sparkles", 0.4),
  M(CLOSE[0], CLOSE[1], "dissolve", "the VIEW closes before the share card", 0.4),
];
