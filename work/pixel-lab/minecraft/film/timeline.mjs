// «Is a Minecraft world endless?» timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((W("with.", 1, "end") + 1.6) * FPS) / FPS;

export const EV = {
  // hook: over the shoulder → into the monitor → through the tunnel → the view
  push: [0, 1.25], crop: [1.3, 1.8], mouth: W("endless?") - 0.05, ledge: W("endless?", 1, "end") + 0.1,
  // most of it doesn't exist yet: rise above the world, dissolve to the iso view
  most: W("most"), rise: [W("most") - 0.1, W("yet.", 1, "end") + 0.15], exist: W("exist"), yet: W("yet."),
  // the game builds it while you run
  builds: W("builds"), run: [W("game") , W("run.", 1, "end") + 0.4],
  // chunks
  chunks: W("chunks,"), sixteen: W("sixteen"), wide: W("wide."), zoomChunk: [W("world", 2) - 0.1, W("chunks,") + 0.5],
  near: W("near"), newOne: W("new"), built: W("built"), arrive: W("arrive."), run2: [W("get") - 0.2, W("arrive.", 1, "end") + 0.3],
  how: W("how"), know: W("know"), build2: W("build?"),
  everything: W("everything"), number: W("number,"), seed: W("seed."),
  noise: W("noise:", 1), smooth: W("smooth"), patterns: W("patterns."),
  land: W("land"), ocean: W("ocean."), flat: W("flat"), rough: W("rough."),
  two: W("two"), hot: W("hot"), cold: W("cold,"), wet: W("wet"), dry: W("dry:"),
  deserts: W("deserts,"), jungles: W("jungles,"), snow: W("snow."),
  d3: W("3"), checks: W("checks"), every: W("every"), block: W("block.", 1),
  above: W("above"), zero: W("zero,"), stone: W("stone."), ifNot: W("if"), air: W("air."),
  caves: W("caves,"), cliffs: W("cliffs"), hang: W("hang"), head: W("head."),
  grass: W("grass,"), trees: W("trees,"), ores: W("ores"), villages: W("villages."),
  notEndless: W("but", 2), endless2: W("endless.", 2),
  thirty: W("thirty"), million: W("million", 1), center: W("center,"), wall: W("wall."),
  seven: W("seven"), earths: W("earth's"), surface: W("surface."),
  walking: W("walking"), eighty: W("eighty"), days: W("days,"), nonstop: W("nonstop."),
  nether: W("nether,"), ten: W("ten"), days2: W("days", 2), one2: W("one", 5), eight: W("eight"), upHere: W("here."),
  old: W("old"), versions: W("versions,"), fell: W("fell"), apart: W("apart"), twelve: W("twelve"), million2: W("million", 2), blocks2: W("blocks", 3),
  streamer: W("streamer"), walked: W("walked"), fourteen: W("fourteen"), years: W("years."),
  send: W("send"), friend: W("friend"), walk3: W("walk", 1), endOf: W("end"), world3: W("world", 3), with: W("with."),
};
