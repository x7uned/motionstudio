// «A 13-year-old "beat" Tetris» timeline: every event is anchored to a measured word of the single voice take.
// Loop film: "…Before that day," runs on into "No human had ever beaten Tetris, until a 13-year-old broke it." The seam
// pause is the comma's pause, and the picture lands on the exact first frame (the room, the frozen game, hands up).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((W("day,", 1, "end") + 0.17) * FPS) / FPS;

export const EV = {
  human: W("human"), beaten: W("beaten"), tetris: W("tetris,"), until1: W("until"), kid: W("13-year-old"), broke: W("broke"), it: W("it."), itEnd: W("it.", 1, "end"),
  old: W("old"), nintendo: W("nintendo"), y1989: W("1989"), noEnding: W("no", 2), ending: W("ending."), endingEnd: W("ending.", 1, "end"),
  blocks: W("blocks"), faster: W("faster,"), until2: W("until", 2), lose: W("lose."), loseEnd: W("lose.", 1, "end"),
  at: W("at"), l29: W("29,"), drop: W("drop"), row: W("row"), frame1: W("frame."), frame1End: W("frame.", 1, "end"),
  holding: W("holding"), button: W("button"), moves: W("moves"), ten: W("ten"), second1: W("second,"), tooSlow: W("too"), sides: W("sides."), sidesEnd: W("sides.", 1, "end"),
  players: W("players"), kill: W("kill"), screen: W("screen."), screenEnd: W("screen.", 1, "end"),
  came: W("came"), hyper: W("hypertapping:"), shaking: W("shaking"), finger: W("finger"), ten2: W("ten", 2), second2: W("second.", 2), second2End: W("second.", 2, "end"),
  in2020: W("2020,"), rolling: W("rolling:"), fingers: W("fingers"), drum: W("drum"), back: W("back"), thumb: W("thumb,"), twenty: W("twenty"), more: W("more.", 2), moreEnd: W("more.", 2, "end"),
  players2: W("players", 2), past: W("past"), p29: W("29,", 2), began: W("began"), brk: W("break."), brkEnd: W("break.", 1, "end"),
  after: W("after"), l138: W("138,"), colors: W("colors"), wrong: W("wrong,"), almost: W("almost"), invisible: W("invisible."), invisibleEnd: W("invisible.", 1, "end"),
  inside: W("inside,"), adds: W("adds"), points: W("points"), slow: W("slow", 2), loop1: W("loop."), loop1End: W("loop.", 1, "end"),
  past2: W("past", 2), l155: W("155,"), loop2: W("loop", 2), longer: W("longer"), oneFrame: W("frame.", 2), oneFrameEnd: W("frame.", 2, "end"),
  loses: W("loses"), place: W("place"), code: W("code,"), freezes: W("freezes."), freezesEnd: W("freezes.", 1, "end"),
  ai: W("ai"), first: W("first."), firstEnd: W("first.", 1, "end"),
  then2: W("then,", 2), december: W("december"), y2023: W("2023,"), willis1: W("willis"), oklahoma: W("oklahoma"), played: W("played"), m38: W("38"), minutes: W("minutes."), minutesEnd: W("minutes.", 1, "end"),
  on157: W("on", 3), l157: W("157,"), willis2: W("willis", 2), cleared: W("cleared"), line: W("line,"), froze: W("froze."), frozeEnd: W("froze.", 1, "end"),
  feel: W("feel"), fingers2: W("fingers,", 2), willis3: W("willis", 3), said: W("said."), saidEnd: W("said.", 1, "end"),
  before: W("before"), day: W("day,"), dayEnd: W("day,", 1, "end"),
};
