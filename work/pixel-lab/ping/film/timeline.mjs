// «Why you die behind walls» (ping) timeline: every event and camera key is anchored to a measured word of the single voice take.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const END = Math.round((W("walls.", 1, "end") + 1.6) * FPS) / FPS;

export const EV = {
  // the hook: OTS push into the monitor, peek → strafe behind the corner → shot → YOU DIED
  push: [0, W("wall.", 1) + 0.5], strafe: [W("behind"), W("wall.") + 0.35],
  still: W("still"), died: W("died."), deadEnd: W("annoying,") - 0.05,
  // through the screen to the face (red light), annoyed
  faceIn: [W("died.", 1, "end") + 0.18, W("annoying,") + 0.1], annoyed: W("annoying,"), right: W("right?"),
  // out to the room: not a bug, it's ping
  faceOut: [W("it's", 1) - 0.15, W("not") + 0.1], bug: W("bug."), notBug: W("bug.") + 0.25, ping0: W("ping.", 1),
  // pull out of the building, pan to the server
  toServer: [W("ping.", 1, "end") + 0.05, W("server,") - 0.05], server: W("server,"), far: W("far"),
  // packets: there and back, the trip takes time, that's your ping
  every: W("every"), there: W("there"), back: W("back.", 1), trip: W("trip"), time: W("time.", 1), yourPing: W("ping.", 2),
  // to the enemy
  toEnemy: [W("now,") - 0.2, W("ping.", 3) - 0.05], enemy: W("enemy"), high: W("high"),
  intoEnemy: [W("so", 1) - 0.1, W("you", 4) + 0.1], sees: W("sees"), late: W("late."),
  hisScreen: W("screen,"), open1: W("open.", 1), shoots: W("shoots."),
  // the shot travels to the server, dive into the server's map
  shotTravel: [W("his", 2) - 0.1, W("server.", 2) + 0.1], reaches: W("reaches"),
  dive: [W("server.", 2) + 0.05, W("now,", 1 + 1) + 0.1], byNow: W("by"), behind2: W("behind", 2),
  // rewind
  turns: W("turns"), rewind: [W("back", 2), W("fired.") + 0.05], fired: W("fired."),
  backThen: W("then,"), open2: W("open.", 2), hit: W("hit"), counts: W("counts."),
  // the news travels back, you die behind the wall
  news: W("news"), newsTravel: [W("news") - 0.1, W("you,", 6) + 0.35], die: W("die"), wall3: W("wall.", 3),
  // lag compensation
  lagComp: W("lag"), purpose: W("purpose."),
  without: W("without"), aim: W("aim"), perfectly: W("perfectly"), miss: W("miss."),
  // tips
  cantFix: W("can't"), hisPing: W("ping.", 4), yourPing2: W("ping", 5), counts2: W("counts", 2),
  pick: W("pick"), closest: W("closest"), cable: W("cable,"), wifi: W("wi-fi."),
  // send this to the friend
  send: W("send"), friend: W("friend"), dies: W("dies"), walls: W("walls."),
};
