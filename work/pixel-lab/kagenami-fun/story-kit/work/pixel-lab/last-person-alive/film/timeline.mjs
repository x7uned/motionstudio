// «The last person alive» — timeline. One voice take (Dennis · Eleven v4, [thoughtful]); word times moved onto Scribe.
// Every shot and beat is anchored to a measured word. END leaves 2 s after the last word for the eyes.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 780 / FPS; // 26.0 s

export const EV = {
  you0: W("you", 1), last: W("last"), alive: W("alive."), aliveEnd: W("alive.", 1, "end"),
  three: W("three"), hundred: W("hundred"), days: W("days,"), human: W("human"), voice: W("voice."), voiceEnd: W("voice.", 1, "end"),
  then0: W("then,"), near: W("near"), forest0: W("forest,"), see: W("see"), fire: W("fire."), fireEnd: W("fire.", 1, "end"),
  woman: W("woman"), sitting: W("sitting"), next: W("next"), real: W("real."), smiles: W("smiles"), atYou: W("you", 3), atYouEnd: W("you", 3, "end"),
  then1: W("then", 2), something0: W("something", 1), jumps: W("jumps"), grass: W("grass."), grassEnd: W("grass.", 1, "end"),
  scream: W("scream."), screamEnd: W("scream.", 1, "end"), its: W("it's"), mouse0: W("mouse."), mouse0End: W("mouse.", 1, "end"),
  laughs: W("laughs."), laughsEnd: W("laughs.", 1, "end"),
  but: W("but"), mouse1: W("mouse", 2), never: W("never"), toward: W("toward"), people: W("people."), peopleEnd: W("people.", 1, "end"),
  it2: W("it", 2), away: W("away"), something1: W("something", 2), something1End: W("something", 2, "end"),
  and1: W("and", 2), now: W("now"), forest1: W("forest", 2), full: W("full"), eyes: W("eyes."), eyesEnd: W("eyes.", 1, "end"),
};

/** Shots: [kind, from, to]. Changes between shots are 0.2 s dithered dissolves centred on the boundary (never a 1-frame cut). */
export const SHOTS = [
  ["town", 0, EV.woman - 0.3],                 // A · third person: he walks through the dead town to the forest edge; sees the glow
  ["pov1", EV.woman - 0.3, EV.then1 - 0.35],   // B · first person: walking to the fire between the trees; the woman turns and smiles
  ["clearing", EV.then1 - 0.35, EV.jumps],     // C · third person wide: he stands by the fire; something rustles through the grass
  ["pov2", EV.jumps, EV.scream - 0.32],        // D · first person: it leaps out of the grass at the camera; we fall back
  ["clearing", EV.scream - 0.32, EV.and1 - 0.1], // E · third person: he falls, it's a mouse, she laughs, the mouse flees, the camera turns to the forest
  ["pov3", EV.and1 - 0.1, END],                // F · first person: the forest is full of eyes; the fire dies
];
export const DISSOLVE = 0.2;
