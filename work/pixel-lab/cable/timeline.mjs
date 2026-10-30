// «How your text crosses the ocean»: every event is anchored to a measured word of the single voice take.
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
  // hook
  text: W("text"), bounces: W("bounces"), satellite: W("satellite."), doesnt: W("doesn't."), under: W("under"), ocean: W("ocean."), oceanEnd: W("ocean.", 1, "end"),
  // radio → tower → fiber → landing station
  sends: W("sends"), radio: W("radio"), tower: W("tower."), towerEnd: W("tower.", 1, "end"),
  light: W("light", 1), racing: W("racing"), glass: W("glass"), coast: W("coast."),
  building: W("building"), enters: W("enters"), slides: W("slides"), sea: W("sea."),
  // dive, macro
  floor: W("floor,"), four: W("four"), down: W("down,"), garden: W("garden"), hose: W("hose."),
  inside: W("inside,"), threads: W("threads"), hair: W("hair"), flashes: W("flashes"), lightEnd: W("light", 2, "end"),
  // repeater, power
  every: W("every"), repeater: W("repeater"), boosts: W("boosts"), thousands: W("thousands"), shore: W("shore."),
  // dangers
  sharks: W("sharks"), bitten: W("bitten"), most: W("most"), anchors: W("anchors"), fishing: W("fishing"), nets: W("nets."),
  // arrival
  five: W("five"), ashore: W("ashore"), buzzes: W("buzzes."), whole: W("whole"), twentieth: W("twentieth"), second: W("second."),
  // planet
  more: W("more"), hundred: W("hundred"), almost: W("almost"), continents: W("continents."),
  cloud: W("cloud"), isnt: W("isn't"), sky: W("sky."), seaFloor: W("sea", 2), floorEnd: W("floor", 2, "end"),
  outroIn: [W("want") - 0.4, W("want")], point: W("follow") - 0.35, kagenamiEnd: W("kagenami.", 1, "end"),
};
EV.click = EV.kagenamiEnd + 0.08; EV.toggle = EV.click + 0.16;
// scene windows
EV.zoomIn = [EV.oceanEnd - 0.05, EV.oceanEnd + 1.15];
EV.macroIn = [EV.garden - 0.55, EV.garden + 0.15]; EV.macroOut = [EV.lightEnd - 0.2, EV.lightEnd + 0.4];
EV.crossing = [EV.five, EV.ashore];
EV.replay = [EV.whole + 0.95, EV.whole + 1.6];
EV.globeIn = [EV.more + 0.45, EV.more + 1.3];
