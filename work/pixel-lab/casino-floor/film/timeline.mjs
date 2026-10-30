// «Casinos don't hide the clocks to trap you» timeline (Casino secrets 3/5): every beat is anchored to a measured word of the
// single voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by dev/retime.mjs, which splits
// Scribe's "wanna" into the script's "want to"; words-el.json = original). Not a loop: the film ends on the follow card over
// the new casino, holding ~0.85 s after the last word. Harness: frozen copy of casino-slots/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("air", 2), W("air", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  hide: W("hide"), clocks1: W("clocks"), trap1: W("trap"), thats: W("that's"), real1: W("real"), trick1: W("trick"), trickEnd: W("trick", 1, "end"),
  old: W("old"), no1: W("no"), clocks2: W("clocks", 2), windows: W("windows"), but: W("but"), man: W("man"), wrote: W("wrote"), famous: W("famous"), design: W("design"), book: W("book"),
  says2: W("says", 2), players: W("players"), asked: W("asked"), thatEnd: W("that.", 1, "end"),
  and1: W("and", 2), no3: W("no", 3), pump: W("pump"), extra: W("extra"), air1: W("air"), awake: W("awake"), awakeEnd: W("awake", 1, "end"),
  people1: W("people"), measured: W("measured"), its: W("it's"), normal: W("normal"), air2: W("air", 2), air2End: W("air", 2, "end"),
  the5: W("the", 5), quieter: W("quieter"), quieterEnd: W("quieter", 1, "end"),
  theres1: W("there's"), straight: W("straight"), path: W("path"), pathEnd: W("path", 1, "end"),
  floor: W("floor"), maze: W("maze"), small: W("small"), corners: W("corners"), always: W("always"), something: W("something"), new1: W("new"), around: W("around"), next1: W("next"), one1: W("one"), oneEnd: W("one", 1, "end"),
  games: W("games"), start: W("start"), inside: W("inside"), door: W("door"), doorEnd: W("door", 1, "end"),
  often: W("often"), room: W("room"), restaurant: W("restaurant"), goes: W("goes"), past: W("past"), machines: W("machines"), machinesEnd: W("machines", 1, "end"),
  big: W("big"), smell: W("smell"), blown: W("blown"), air3: W("air", 3), air3End: W("air", 3, "end"),
  test: W("test"), faster1: W("faster"), music: W("music"), bet: W("bet"), faster2: W("faster", 2), faster2End: W("faster", 2, "end"),
  then: W("then"), newer: W("newer"), flipped: W("flipped"), rules: W("rules"), high: W("high"), ceilings: W("ceilings"), daylight: W("daylight"), plants: W("plants"), real3: W("real", 3), clocks3: W("clocks", 3), clocks3End: W("clocks", 3, "end"),
  feels: W("feels"), calm1: W("calm"), open: W("open"), openEnd: W("open", 1, "end"),
  researchers: W("researchers"), found: W("found"), calm2: W("calm", 2), rooms: W("rooms"), stay: W("stay"), play: W("play"), even2: W("even", 2), longer: W("longer"), longerEnd: W("longer", 1, "end"),
  trap2: W("trap", 2), nicer: W("nicer"), nicerEnd: W("nicer", 1, "end"),
  follow: W("follow"), miss: W("miss"), next2: W("next", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- beats (film seconds)
export const CLOCK1 = { out0: EV.hide - 0.05, out1: EV.hide + 0.5, back0: EV.thats - 0.1, back1: EV.thats + 0.35, stamp: EV.real1 - 0.04, stampOut: EV.old - 0.1 };
export const NOPE = { clock: EV.clocks2 - 0.2, win: EV.windows - 0.05, out: EV.book + 0.4, dim0: EV.old - 0.2, dim1: EV.no1 + 0.3, undim0: EV.quieter - 0.4, undim1: EV.quieterEnd + 0.3 };
export const BOOK = { in: EV.famous - 0.1, open: EV.book - 0.1, out: EV.and1 - 0.2 };
export const BUBBLE = { in: EV.players - 0.05, out: EV.and1 + 0.1 };
export const AIR = { puff0: EV.pump - 0.05, puff1: EV.awakeEnd, meter: EV.people1 - 0.15, needle: EV.measured, read: EV.normal - 0.05, stamp: EV.air2 - 0.02, out: EV.quieter - 0.1 };
export const ARROW = { t0: EV.theres1 - 0.05, hit: EV.path - 0.02, out: EV.maze + 0.4 };
export const MAZE = { t0: EV.floor - 0.1, t1: EV.oneEnd - 0.1, out: EV.games + 0.2 };
export const DOORWAVE = { t0: EV.start - 0.1, t1: EV.inside + 0.4 };
export const ROUTES = { room: EV.room - 0.1, food: EV.restaurant - 0.05, past: EV.past - 0.05, pastEnd: EV.machinesEnd + 0.4, out: EV.big - 0.1 };
export const SMELL = { t0: EV.big + 0.1, blown: EV.blown - 0.05, t1: EV.test + 0.6 };
export const MUSIC = { t0: EV.faster1 - 0.15, fast: EV.bet - 0.05, t1: EV.then + 0.2 };
export const GROW = { arch0: EV.then - 0.1, arch1: EV.flipped + 0.2, floor0: EV.newer - 0.1, floor1: EV.high - 0.1, walls0: EV.high - 0.05, walls1: EV.ceilings + 0.5, day0: EV.daylight - 0.1, day1: EV.daylight + 0.55, plants0: EV.plants - 0.15, plants1: EV.plants + 0.6, clocks0: EV.real3 - 0.1, clocks1: EV.clocks3End + 0.1 };
export const CALM = { t0: EV.feels - 0.1, t1: EV.openEnd + 0.2 };
export const DUSK = { t0: EV.researchers + 0.1, t1: EV.longerEnd + 0.1 };
export const CAGE = { t0: EV.trap2 - 0.05, t1: EV.nicerEnd + 0.1 };

// ---------------------------------------------------------------- the hero's walk: [t, x, z] keys (eased only at the ends)
export const SEAT1 = [918, -742], SEAT2 = [1533, -934];
export const WALK1 = { t0: EV.games - 0.35, pts: [[-210, 150], [-60, 120], [0, 40], [0, -80], [260, -330], [260, -560], [880, -560], [SEAT1[0], SEAT1[1]]], t1: EV.faster1 - 0.25 };
export const WALK2 = { t0: EV.then - 0.15, pts: [[SEAT1[0], SEAT1[1]], [960, -800], [1040, -860], [1220, -930], [SEAT2[0], SEAT2[1]]], t1: EV.feels - 0.25 };

// ---------------------------------------------------------------- camera keys [t0, t1, cam] (eased dolly between keys)
const back = { tx: -60, ty: 150, tz: -2100, D: 2100, pitch: 0.5, sy0: 320 };
export const CAM = [
  [0, 0, { ...back, tx: -150, D: 2350 }],
  [0, EV.thats, { ...back, tx: -90, D: 2050 }],
  [EV.thats - 0.1, EV.trickEnd + 0.3, { tx: -95, ty: 200, tz: -2200, D: 1450, pitch: 0.4, sy0: 330 }],
  [EV.old - 0.2, EV.windows + 0.3, { tx: 0, ty: 140, tz: -2000, D: 2700, pitch: 0.52, sy0: 320 }],
  [EV.book - 0.6, EV.asked, { tx: 120, ty: 140, tz: -2000, D: 2500, pitch: 0.5, sy0: 320 }],
  [EV.and1 - 0.3, EV.extra + 0.2, { tx: 420, ty: 200, tz: -2150, D: 1700, pitch: 0.42, sy0: 320 }],
  [EV.people1 - 0.2, EV.normal, { tx: 400, ty: 200, tz: -2150, D: 1550, pitch: 0.42, sy0: 320 }],
  [EV.quieter - 0.6, EV.pathEnd - 0.2, { tx: -260, ty: 0, tz: -980, D: 4600, pitch: 0.98, sy0: 400 }],
  [EV.maze, EV.oneEnd, { tx: -240, ty: 0, tz: -1000, D: 4300, pitch: 1.0, sy0: 400 }],
  [EV.games - 0.5, EV.door - 0.2, { tx: 40, ty: 0, tz: -200, D: 2000, pitch: 0.72, sy0: 400 }],
  [EV.often - 0.2, EV.room - 0.2, { tx: 40, ty: 0, tz: -1150, D: 5300, pitch: 0.95, sy0: 410 }],
  [EV.smell - 0.4, EV.test - 0.3, { tx: 120, ty: 0, tz: -1100, D: 4800, pitch: 0.92, sy0: 410 }],
  [EV.test - 0.3, EV.faster1, { tx: 750, ty: 60, tz: -780, D: 1250, pitch: 0.56, sy0: 430 }],
  [EV.music, EV.faster2End, { tx: 760, ty: 70, tz: -780, D: 1050, pitch: 0.54, sy0: 440 }],
  [EV.then - 0.2, EV.high - 0.2, { tx: 1300, ty: 0, tz: -1050, D: 4300, pitch: 0.82, sy0: 450 }],
  [EV.high - 0.2, EV.clocks3, { tx: 1650, ty: 120, tz: -1150, D: 3900, pitch: 0.7, sy0: 470 }],
  [EV.feels - 0.6, EV.calm1 + 0.4, { tx: 1620, ty: 260, tz: -1250, D: 1750, pitch: 0.3, sy0: 400 }],
  [EV.found, EV.longerEnd, { tx: 1650, ty: 260, tz: -1250, D: 1650, pitch: 0.28, sy0: 400 }],
  [EV.trap2 - 0.3, EV.nicerEnd + 0.3, { tx: 1950, ty: 0, tz: -1150, D: 5600, pitch: 0.88, sy0: 450 }],
  [EV.follow, END, { tx: 1950, ty: 0, tz: -1150, D: 5800, pitch: 0.88, sy0: 455 }],
];
