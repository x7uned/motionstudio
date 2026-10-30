// Netflix film timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.ceil((words[words.length - 1].end + 1.25) * FPS) / FPS;

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
  traffic: [W("altogether,"), W("want") - 0.4], fifteen: W("fifteen"),
  outroIn: [W("want") - 0.4, W("want")], point: W("follow") - 0.35, kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08; EV.toggle = EV.click + 0.16;

// Camera depth D: 0 = the room (interior), 1 = the London street (district), 2 = the planet. Eased between keys.
export const DKEYS = [
  [0, 0], [W("wondered") - 0.1, 0], [W("netflix") + 0.5, 1], [W("homes?"), 2],
  [W("so") - 0.1, 2], [W("london,") + 0.5, 1], [W("is", 2) - 0.1, 1], [W("next"), 2],
  [W("files.") - 0.15, 2], [W("chunks") - 0.2, 0], [W("altogether,") - 0.2, 0], [W("been") + 0.2, 2], [90, 2],
];
const ease = (x) => { x = Math.max(0, Math.min(1, x)); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export function depth(t) { let i = 0; while (i < DKEYS.length - 2 && DKEYS[i + 1][0] <= t) i++; const [ta, a] = DKEYS[i], [tb, b] = DKEYS[i + 1]; return a + (b - a) * ease((t - ta) / (tb - ta || 1)); }
