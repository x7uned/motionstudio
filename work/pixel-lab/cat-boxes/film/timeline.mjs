// «Why do cats love boxes?» — timeline: every event is anchored to a measured word of the single voice take.
// Loop film: the voice runs from 0.08 s to 50.87 s; END = 1537 frames = 51.233 s gives a 0.44 s seam pause (this take's
// sentence pauses are 0.26–0.48 s). The opening's actors are functions of τ = t (start) and τ = t − END (the last
// seconds), so the film runs straight on into its own first frame.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
// the aligner stretched the last word to the end of the file; the waveform shows the voice ending at 50.87 s
VOICE.words[VOICE.words.length - 1].end = 50.87;
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = 1537 / FPS; // 51.233 s

export const EV = {
  buy: W("buy"), fancy: W("fancy"), bed: W("bed"), sits: W("sits"), box1: W("box", 1), came: W("came"), cameEnd: W("in", 2, "end"),
  random: W("random"), randomEnd: W("random", 1, "end"),
  stressed: W("stressed"), fight: W("fight"), hides: W("hides"), hidesEnd: W("hides", 1, "end"),
  shelter: W("shelter"), netherlands: W("netherlands"), scientists1: W("scientists", 1), box2: W("box", 2), hide: W("hide"),
  calmed: W("calmed"), three: W("three"), days: W("days"), daysEnd: W("days", 1, "end"),
  without: W("without"), box3: W("box", 3), two: W("two"), weeks: W("weeks"), weeksEnd: W("weeks", 1, "end"),
  box4: W("box", 4), warm: W("warm"), warmEnd: W("warm", 1, "end"),
  catsBest: W("cats", 4), best: W("best"), thirty: W("thirty"), thirtyEight: W("thirty-eight"), celsius: W("celsius"), warmer: W("warmer"), living: W("living"), room: W("room"), roomEnd: W("room", 1, "end"),
  curled: W("curled"), small: W("small"), box5: W("box", 5), keeps: W("keeps"), heat: W("heat"), close: W("close"), closeEnd: W("close", 1, "end"),
  hunter: W("hunter"), box6: W("box", 6), perfect: W("perfect"), hiding: W("hiding"), spot: W("spot"),
  inside1: W("inside", 1), sees1: W("sees", 1), everything: W("everything"), nobody: W("nobody"), sees2: W("sees", 2), catEnd: W("cat", 5, "end"),
  strangest: W("strangest"), part: W("part"), scientists2: W("scientists", 2), paper: W("paper"), shapes: W("shapes"), floor: W("floor"), floorEnd: W("floor", 1, "end"),
  sat1: W("sat", 1), inside2: W("inside", 2), drawn: W("drawn"), square1: W("square", 1), square1End: W("square", 1, "end"),
  some: W("some", 2), even: W("even"), sat2: W("sat", 2), square2: W("square", 2), wasnt: W("wasn't"), really: W("really"), there: W("there"),
  four: W("four"), corners: W("corners"), trick: W("trick"), eye: W("eye"), eyeEnd: W("eye", 1, "end"),
  keep: W("keep"), box7: W("box", 7), trust: W("trust"), me: W("me"),
};
export const hookTau = (t) => (t > END - 3 ? t - END : t);
