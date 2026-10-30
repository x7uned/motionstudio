// «How high can Mario jump in our world» (IN OUR WORLD #2) timeline (frozen copy of steve-real/film2/timeline.mjs): every beat is anchored to a measured word of the
// single voice take (voice/words.json = the ElevenLabs alignment moved onto Scribe's word timings by dev/retime.mjs; the
// original is voice/words-el.json). Not a loop: the film ends on the follow card ~0.85 s after the last word. Harness:
// frozen copy of ed138/film/timeline.mjs. Spoken numbers are merged back into the script's digits for the captions.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("dot", 2), W("lost", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

// captions: the voice says the numbers in words; the screen shows the script's digits (one caption token per number)
const MERGE = [["one hundred fifty-five", "155"], ["seventy-eight", "78"], ["two point four five", "2.45"], ["fifty-two", "52"], ["eleven", "11"], ["forty", "40"], ["brothers,", "Bros.,"]];
export const WORDS = (() => {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    let hit = null;
    for (const [seq, shown] of MERGE) { const parts = seq.split(" "); if (parts.every((p, k) => words[i + k] && words[i + k].text.toLowerCase() === p)) { hit = [parts.length, shown]; break; } }
    if (hit) { const last = words[i + hit[0] - 1]; out.push({ ...words[i], text: hit[1], end: last.end, charEnd: last.charEnd }); i += hit[0] - 1; } else out.push(words[i]);
  }
  return out;
})();

export const EV = { lastEnd: VOICE_END };
