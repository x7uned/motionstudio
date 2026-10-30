// «How fast is Sonic, really?» (IN OUR WORLD #4) timeline (frozen copy of pacman-real/film/timeline.mjs, itself a copy of mario-real/film2/timeline.mjs): every beat is anchored to a measured word of the
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
const MERGE = [["thirty-nine", "39"], ["six", "6"], ["sixty", "60"], ["thirty-three", "33"], ["forty-five.", "45."], ["three hundred", "300"], ["four hundred eighty", "480"], ["twelve hundred", "1,200"], ["sixteen", "16"], ["eighty-eight", "88"], ["forty-four", "44"]];
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
