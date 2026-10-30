// «A new world beyond Pluto» (2026 ED138) timeline: every beat is anchored to a measured word of the single voice take
// (voice/words.json = the ElevenLabs alignment; Scribe agreed word for word within ≈0.2 s, so no retime). Not a loop: the
// film ends on the follow card over the dwarf-planet line-up, ~0.85 s after the last word. Harness: frozen copy of
// casino-tables/film/timeline.mjs. Spoken numbers are merged back into the script's digits for the captions (SHOWN).
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
const MERGE = [["twenty twenty-six", "2026"], ["e-d one thirty-eight.", "ED138."], ["thirteenth,", "13th,"], ["six hundred", "600"], ["fifteen hundred", "1,500"], ["twenty sixteen.", "2016."]];
export const WORDS = (() => {
  const out = [];
  for (let i = 0; i < words.length; i++) {
    let hit = null;
    for (const [seq, shown] of MERGE) { const parts = seq.split(" "); if (parts.every((p, k) => words[i + k] && words[i + k].text.toLowerCase() === p)) { hit = [parts.length, shown]; break; } }
    if (hit) { const last = words[i + hit[0] - 1]; out.push({ ...words[i], text: hit[1], end: last.end, charEnd: last.charEnd }); i += hit[0] - 1; } else out.push(words[i]);
  }
  return out;
})();

export const EV = {
  this: W("this"), photos: W("photos"), ten: W("ten"), years: W("years,"), nobody: W("nobody"), noticed: W("noticed."), noticedEnd: W("noticed.", 1, "end"),
  its: W("its"), name: W("name"), twenty1: W("twenty"), ed: W("e-d"), thirty8End: W("thirty-eight.", 1, "end"),
  on1: W("on"), october: W("october"), astronomer: W("astronomer"), ran: W("ran"), search: W("search"), code1: W("code"), pictures1: W("pictures"),
  rubin1: W("rubin"), observatory: W("observatory,"), giant: W("giant"), telescope1: W("telescope"), chile: W("chile."), chileEnd: W("chile.", 1, "end"),
  code2: W("code", 2), billions: W("billions"), tiny: W("tiny"), dots: W("dots"), finds: W("finds"), belong: W("belong"), same1: W("same"), moving: W("moving"), objectEnd: W("object.", 1, "end"),
  one1: W("one", 2), dot1: W("dot"), very: W("very"), far: W("far"), away: W("away,"), but: W("but"), still: W("still"), bright: W("bright."), brightEnd: W("bright.", 1, "end"),
  that1: W("that", 2), means: W("means"), big: W("big,"), maybe: W("maybe"), six: W("six"), fifteen: W("fifteen"), kilometers: W("kilometers"), wide1: W("wide."), wide1End: W("wide.", 1, "end"),
  why1: W("why"), guess: W("guess?"), we: W("we"), know1: W("know"), shiny: W("shiny"), ice: W("ice"), isEnd: W("is", 2, "end"),
  then: W("then"), team: W("team"), looked: W("looked"), back1: W("back."), same2: W("same", 2), dot2: W("dot", 2), hiding: W("hiding"), older: W("older"), pictures2: W("pictures", 2), another: W("another"),
  all: W("all"), way1: W("way"), twenty2: W("twenty", 2), sixteen: W("sixteen."), sixteenEnd: W("sixteen.", 1, "end"),
  so1: W("so"), everyone: W("everyone"), miss1: W("miss"), sits: W("sits"), front: W("front"), milky: W("milky"), way2: W("way", 2), millions: W("millions"), stars: W("stars"), crowd: W("crowd"), sky1: W("sky."), sky1End: W("sky.", 1, "end"),
  one2: W("one", 3), slow: W("slow,"), faint: W("faint"), dot3: W("dot", 3), lost: W("lost."), lostEnd: W("lost.", 1, "end"),
  rubin2: W("rubin", 2), photographs: W("photographs"), same3: W("same", 3), sky2: W("sky", 2), again1: W("again"), again2: W("again", 2), anything: W("anything"), moves: W("moves"), stands: W("stands"), out: W("out."), outEnd: W("out.", 1, "end"),
  now: W("now"), round: W("round."), roundEnd: W("round.", 1, "end"), if2: W("if", 2), could: W("could"), become: W("become"), sixth: W("sixth"), dwarf: W("dwarf"), planet: W("planet,"), next1: W("next"),
  pluto2: W("pluto", 2), ceres: W("ceres,"), eris: W("eris,"), haumea: W("haumea"), makemake: W("makemake."), makemakeEnd: W("makemake.", 1, "end"),
  follow: W("follow,"), miss: W("miss", 2), next2: W("next", 2), world: W("world", 2), lastEnd: VOICE_END,
};
// «one» #2 is «the ones», so EV.one2 above uses #3 — guard the assumption
if (norm(words.find((w) => w.start === EV.one2).text) !== "one") throw new Error("one #3 is not «One slow»");
