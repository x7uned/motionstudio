// Netflix film timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
// Loop version (user request 2026-10-22): the last line «That's what happens every time…» runs into the first words
// «You press play», so the film ends where it begins. END = measured end of speech + 0.38 s, which with the 0.06 s
// onset of the take gives the same ~0.44 s pause as between sentences inside the take.
function speechEdges(file, db = -40) {
  const b = fs.readFileSync(file); let off = 12; while (b.toString("ascii", off, off + 4) !== "data") off += 8 + b.readUInt32LE(off + 4);
  const n = b.readUInt32LE(off + 4) / 2, win = 480, th = Math.pow(10, db / 20) * 32768, loud = [];
  for (let i = 0; i + win <= n; i += win) { let s = 0; for (let k = 0; k < win; k++) { const v = b.readInt16LE(off + 8 + (i + k) * 2); s += v * v; } loud.push(Math.sqrt(s / win) > th); }
  return { onset: loud.indexOf(true) * win / 48000, offset: (loud.lastIndexOf(true) + 1) * win / 48000 };
}
export const SPEECH = speechEdges(HERE + "voice/voice-raw.wav");
export const END = Math.ceil((SPEECH.offset + 0.38) * FPS) / FPS;

export const EV = {
  // the room: press play, the show starts in a second
  press: W("play,"), spinner: [W("play,"), W("starts")], showOn: W("starts"), second: [W("about"), W("ever") - 0.1],
  logo: [W("netflix"), W("menus") - 0.3], homes: [W("three"), W("menus") - 0.2],
  // the planet: cloud, the servers, the nightly fill
  cloud: [W("menus"), W("closer.", 1, "end") + 0.2], aws: W("amazon's"), menuReq: [W("menus"), W("cloud.", 1, "end")], closer: W("closer."),
  servers: [W("built"), W("planet,", 1, "end")], count: W("eighteen"), inside: W("inside"),
  tb: [W("bigger"), W("each.", 1, "end") + 0.4],
  fill: [W("every"), W("tomorrow.", 1, "end") + 0.3], night: W("night,"), download: W("download"), tomorrow: W("tomorrow."),
  // London: the box down the street, not California; busy → Amsterdam
  londonPin: W("london,") - 0.2, chunks1: [W("episode"), W("busy,", 1, "end")], km: W("few"), california: W("california."),
  busy: W("busy,"), switch: [W("switches"), W("amsterdam.", 1, "end")], amsterdam: W("amsterdam."),
  // versions board
  oneFile: [W("isn't"), W("uk") - 0.15], titles: [W("uk"), W("and", 4)], nine: W("nine"),
  versions: [W("every", 2), W("files.", 1, "end") + 0.3], sizes: W("sizes,"), codecs: W("codecs"), audio: W("audio"), subs: W("subtitles."),
  stranger: [W("one", 4), W("files.", 1, "end") + 0.4], tenK: W("ten"),
  // the room again: chunks, the speed, the picture sharpens
  chunks: [W("chunks"), W("connection.", 1, "end")], picks: W("picks"), fit: W("fit"), sharpen: [W("sharpens"), W("starts.", 2, "end")],
  // the planet lit with traffic
  traffic: [W("altogether,"), W("that's", 2) - 0.38], fifteen: W("fifteen"),
  // the loop: the camera dives from the planet back into the bedroom and lands on the film's first frame at END
  loopIn: W("that's", 2) - 0.38,
};

// Camera depth D: 0 = the room (interior), 1 = the London street (district), 2 = the planet. Eased between keys.
export const DKEYS = [
  [0, 0], [W("wondered") - 0.1, 0], [W("netflix") + 0.5, 1], [W("homes?"), 2],
  [W("so") - 0.1, 2], [W("london,") + 0.5, 1], [W("is", 2) - 0.1, 1], [W("next"), 2],
  [W("files.") - 0.15, 2], [W("chunks") - 0.2, 0], [W("altogether,") - 0.2, 0], [W("been") + 0.2, 2], [EV.loopIn, 2], [END, 0], [END + 10, 0],
];
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function depth(t) { let i = 0; while (i < DKEYS.length - 2 && DKEYS[i + 1][0] <= t) i++; const [ta, a] = DKEYS[i], [tb, b] = DKEYS[i + 1]; return a + (b - a) * ease((t - ta) / (tb - ta || 1)); }
