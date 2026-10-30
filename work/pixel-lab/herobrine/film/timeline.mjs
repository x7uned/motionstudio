// Herobrine film timeline: every event is anchored to a measured word of the single voice take.
// Loop film: "…So whatever you see in the fog, remember:" → "Minecraft has removed Herobrine…"; the pause at the seam is
// a sentence pause, and the camera lands on the exact first frame (the figure on the ridge in the fog).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((W("remember:", 1, "end") + 0.37) * FPS) / FPS;

export const EV = {
  removed: W("removed"), thirty: W("thirty"), times: W("times."), he: W("he"), never: W("never"), game: W("game."), gameEnd: W("game.", 1, "end"),
  in2010: W("2010,"), anonymous: W("anonymous"), story: W("story"), forums: W("forums."), forumsEnd: W("forums.", 1, "end"),
  alone: W("alone"), world: W("world,"), thick: W("thick"), fog1: W("fog."), fog1End: W("fog.", 1, "end"),
  far: W("far"), stood: W("stood"), figure: W("figure"), normal: W("normal"), empty: W("empty"), white: W("white"), eyes: W("eyes."), eyesEnd: W("eyes.", 1, "end"),
  when: W("when"), walked: W("walked"), closer: W("closer,"), ran: W("ran"), fog2: W("fog.", 2), fog2End: W("fog.", 2, "end"),
  posts: W("posts"), disappearing: W("disappearing."), disEnd: W("disappearing.", 1, "end"),
  then: W("then"), message: W("message"), called: W("called"), hb3: W("herobrine.", 2), one: W("one"), word: W("word:"), stop: W("stop."), stopEnd: W("stop.", 1, "end"),
  story2: W("story", 2), listed: W("listed"), signs: W("signs:"), twobytwo: W("two-by-two"), tunnels: W("tunnels,"), sand: W("sand"), pyramids: W("pyramids"), sea: W("sea,"),
  trees: W("trees"), leaves: W("leaves."), leavesEnd: W("leaves.", 1, "end"),
  that: W("that", 2), month: W("month,"), streamer: W("streamer"), showed: W("showed"), live: W("live,"), screamed: W("screamed,"), ended: W("ended"), stream: W("stream."), streamEnd: W("stream.", 1, "end"),
  staged: W("staged,"), picture: W("picture"), hidden: W("hidden"), house: W("house."), houseEnd: W("house.", 1, "end"),
  story3: W("story", 3), dead: W("dead"), brother: W("brother"), notch1: W("notch,"), made: W("made"), mc3: W("minecraft.", 3), mc3End: W("minecraft.", 3, "end"),
  notch2: W("notch", 2), no: W("no", 2), dead2: W("dead", 2), never2: W("never", 2), game2: W("game.", 2), game2End: W("game.", 2, "end"),
  so: W("so"), mojang: W("mojang"), joke: W("joke."), jokeEnd: W("joke.", 1, "end"),
  in2011: W("2011,"), update: W("update"), notes: W("notes"), removed2: W("removed", 2), removed2End: W("herobrine.", 7, "end"),
  again: W("again"), fifteen: W("fifteen"), years: W("years."), yearsEnd: W("years.", 1, "end"),
  march: W("march"), y2026: W("2026,"), removed3: W("removed", 3), baby: W("baby"), babyEnd: W("herobrine.", 8, "end"),
  so2: W("so", 2), whatever: W("whatever"), fog3: W("fog,", 3), remember: W("remember:"), rememberEnd: W("remember:", 1, "end"),
};
