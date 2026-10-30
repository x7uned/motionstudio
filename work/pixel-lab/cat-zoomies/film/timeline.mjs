// «Your cat sleeps all day, then goes crazy at 3 a.m.» — timeline: every event is anchored to a measured word of the
// single voice take. Loop film: the voice ends at 56.56 s and starts at 0.08 s; END = 1707 frames = 56.9 s gives a
// 0.42 s seam pause (this take's sentence pauses are 0.27–0.47 s). The hook's actors are functions of τ = t (start)
// and τ = t − END (the last seconds), so the film runs straight on into its own first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
// the aligner stretched the last word to the end of the file; the waveform shows the voice ending at 56.56 s
VOICE.words[VOICE.words.length - 1].end = 56.56;
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1707 / FPS; // 56.9 s

export const EV = {
  crazy: W("crazy"), three: W("three"), am: W("a.m."), amEnd: W("a.m.", 1, "end"),
  annoying: W("annoying,"), right: W("right?"), isnt: W("isn't"), getYou: W("you.", 1), getYouEnd: W("you.", 1, "end"),
  built: W("built"), hunt1: W("hunt.", 1), hunt1End: W("hunt.", 1, "end"),
  sleeps2: W("sleeps", 2), fifteen: W("fifteen"), day2: W("day", 2), day2End: W("day", 2, "end"),
  light: W("light"), sleepColon: W("sleep:"), ears: W("ears"), turning: W("turning"), every: W("every"), sound: W("sound,"),
  ready1: W("ready"), jump: W("jump."), jumpEnd: W("jump.", 1, "end"),
  wild: W("wild,"), mouse: W("mouse"), tiny: W("tiny"), meal: W("meal,"), mealEnd: W("meal,", 1, "end"),
  catch: W("catch"), ten: W("ten"), day3: W("day", 3), day3End: W("day", 3, "end"),
  every2: W("every", 2), hunt2: W("hunt", 2), long: W("long"), wait: W("wait,"), waitEnd: W("wait,", 1, "end"),
  short: W("short"), sprint: W("sprint"), full: W("full"), power: W("power."), powerEnd: W("power.", 1, "end"),
  between: W("between"), sleeps3: W("sleeps", 3), saves: W("saves"), energy1: W("energy."), energy1End: W("energy.", 1, "end"),
  mice: W("mice"), dusk: W("dusk"), dawn: W("dawn,"), body: W("body"), ready2: W("ready", 2), hunt3: W("hunt", 3), hunt3End: W("hunt", 3, "end"),
  dinner: W("dinner"), bowl: W("bowl."), bowlEnd: W("bowl.", 1, "end"),
  noHunt: W("no"), hunt4: W("hunt", 4), savedUp: W("saved-up"), energy2: W("energy", 2), nowhere: W("nowhere"), go: W("go."), goEnd: W("go.", 1, "end"),
  night: W("night,"), quiet: W("quiet"), house: W("house,"), once: W("once."), onceEnd: W("once.", 1, "end"),
  vets: W("vets"), fraps: W("fraps:"), frenetic: W("frenetic"), random: W("random"), activity: W("activity"), periods: W("periods."), periodsEnd: W("periods.", 1, "end"),
  zoomies: W("zoomies."), zoomiesEnd: W("zoomies.", 1, "end"),
  fix: W("fix:"), hunt5: W("hunt", 5), bed: W("bed."), bedEnd: W("bed.", 1, "end"),
  play: W("play"), toy: W("toy"), string: W("string"), tired: W("tired,"), feed: W("feed"), feedEnd: W("it", 4, "end"),
  sHunt: W("hunt", 6), sEat: W("eat,"), sWash: W("wash,"), sSleep: W("sleep", 2), sSleepEnd: W("sleep", 2, "end"),
  skip: W("skip"), game: W("game,"), get: W("get", 2), getEnd: W("get", 2, "end"),
};

// ---------------------------------------------------------------- the hook (τ = t near the start, τ = t − END at the end)
export const HOOK = {
  personX0: -190, walkV: 55,          // the owner shuffles right from the bedroom door with a glass of water
  catX0: 100,                         // the cat crouches at the kitchen side, eyes glowing, butt wiggling
  launch: 1.65, launchV: 305, ramp: 0.25,
  hit: 2.30,                          // the cat runs into his ankles on "crazy"
  fall: 0.95,                         // trip k 0→1
};
export const hookTau = (t) => (t > END - 3 ? t - END : t);
