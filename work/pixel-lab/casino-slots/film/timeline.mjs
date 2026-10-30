// «This slot machine already knows if you won» timeline (Casino secrets 2/5): every beat is anchored to a measured word of
// the single voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by dev/retime.mjs, a frozen
// copy of shared/retime.mjs that splits Scribe's "nobody's" into the script's "nobody is"; words-el.json = original).
// Not a loop: the film ends on the follow card over the slot machine, holding ~0.85 s after the last word.
// Harness: frozen copy of casino-math/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { stopOf } from "./casino-slot.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("won", 2), W("win", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  knows: W("knows"), won1: W("won"), reels1: W("reels"), spin: W("spin"), spinEnd: W("spin", 1, "end"),
  inside: W("inside"), tiny: W("tiny"), computer: W("computer"), random: W("random"), numbers: W("numbers"), time: W("time"),
  even2: W("even", 2), nobody: W("nobody"), playing: W("playing"), playingEnd: W("playing", 1, "end"),
  moment: W("moment"), press: W("press"), button1: W("button"), grabs: W("grabs"), one1: W("one"), one1End: W("one", 1, "end"),
  that1: W("that"), number: W("number"), result: W("result"), resultEnd: W("result", 1, "end"),
  spinning: W("spinning"), reels2: W("reels", 2), show1: W("show"), showEnd: W("show", 1, "end"),
  so1: W("so"), machine2: W("machine", 2), never: W("never"), ready: W("ready"), pay: W("pay"), payEnd: W("pay", 1, "end"),
  it2: W("it", 2), remember: W("remember"), last: W("last"), game: W("game"), gameEnd: W("game", 1, "end"),
  now: W("now"), watch: W("watch"), jackpot: W("jackpot"), symbol: W("symbol"), symbolEnd: W("symbol", 1, "end"),
  stops: W("stops"), above: W("above"), line: W("line"), lineEnd: W("line", 1, "end"), so2: W("so", 2), close: W("close"), closeEnd: W("close", 1, "end"),
  many: W("many"), built: W("built"), show2: W("show", 2), almost: W("almost"), more1: W("more"), often1: W("often"), plain: W("plain"), luck: W("luck"), would: W("would"), wouldEnd: W("would", 1, "end"),
  then: W("then"), happy: W("happy"), music: W("music"), musicEnd: W("music", 1, "end"),
  bet: W("bet"), one2: W("one", 2), dollar: W("dollar"), get: W("get"), fifty: W("fifty"), cents: W("cents"), back: W("back"), backEnd: W("back", 1, "end"),
  machine3: W("machine", 3), flashes: W("flashes"), sings: W("sings"), won2: W("won", 2), won2End: W("won", 2, "end"),
  lost: W("lost"), half: W("half"), halfEnd: W("half", 1, "end"), body: W("body"), reacts: W("reacts"), win1: W("win"), win1End: W("win", 1, "end"),
  in1: W("in"), test: W("test"), people: W("people"), heard: W("heard"), win2: W("win", 2), sounds: W("sounds"), thought: W("thought"), won3: W("won", 3), lot: W("lot"), more2: W("more", 2),
  really: W("really"), did: W("did"), didEnd: W("did", 1, "end"),
  and3: W("and", 3), stop: W("stop"), button2: W("button", 2), changes: W("changes"), nothing: W("nothing"), nothingEnd: W("nothing", 1, "end"),
  follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- reel spins (the machine's own show)
export const RES1 = [stopOf(0, "cherry"), stopOf(1, "bell"), stopOf(2, "seven")];             // locked on "result"
export const RES2 = [stopOf(0, "seven"), stopOf(1, "seven"), stopOf(2, "seven", 1)];        // near miss: the 3rd 7 just above
export const RES3 = [stopOf(0, "cherry"), stopOf(1, "bar"), stopOf(2, "bell")];              // the fake win (one cherry pays 50¢)
export const RES4 = [stopOf(0, "bell"), stopOf(1, "bell"), stopOf(2, "cherry")];             // STOP changes nothing
export const P0 = [stopOf(0, "bar"), stopOf(1, "cherry"), stopOf(2, "bell")];
export const PRESS1 = EV.press + 0.12;                                                        // the mitten presses SPIN
export const PRESS2 = EV.now - 0.35;
export const PRESS4 = EV.didEnd - 0.05;
export const SPINS = [
  { t0: PRESS1 + 0.05, stop: [EV.show1 - 0.3, EV.show1 + 0.02, EV.showEnd + 0.12], to: RES1 },
  { t0: PRESS2 + 0.05, stop: [EV.jackpot + 0.12, EV.symbol + 0.12, EV.above + 0.06], to: RES2 , slow: [0.2, 0.22, 0.5] },
  { t0: EV.dollar + 0.12, stop: [EV.get - 0.02, EV.get + 0.14, EV.fifty - 0.02], to: RES3 },
  { t0: PRESS4 + 0.05, stop: [EV.stop + 0.3, EV.stop + 0.4, EV.stop + 0.5], to: RES4, slow: [0.12, 0.12, 0.12] },
];
export const STOP_PRESS = EV.stop + 0.18;

// ---------------------------------------------------------------- beats (film seconds)
export const REACH = { t0: -0.6, t1: 0.9, back0: EV.inside - 0.3, back1: EV.inside + 0.25 };     // the mitten already reaching at frame 0
export const CUT = { in0: EV.inside - 0.05, in1: EV.inside + 0.75, out0: EV.spinning - 0.2, out1: EV.reels2 + 0.4 }; // casing → interior
export const AWAY = { t0: EV.even2 - 0.05, t1: EV.playing + 0.1, back0: EV.moment - 0.65, back1: EV.press - 0.25 };   // nobody is playing
export const DIM = { in0: EV.even2, in1: EV.nobody + 0.3, out0: EV.moment - 0.45, out1: EV.press - 0.15 };
export const GRAB = { t0: EV.grabs - 0.05, fly0: EV.grabs + 0.3, fly1: EV.that1 + 0.05, sym0: EV.number - 0.05, sym1: EV.number + 0.35, lock: EV.result - 0.05, out: EV.so1 - 0.1 };
export const SHOW = { in: EV.spinning - 0.05, out: EV.so1 + 0.05 };
export const DUE = { in: EV.so1 - 0.15, strike: EV.never - 0.02, swap: EV.it2 - 0.05, gone: [EV.remember, EV.last - 0.05, EV.game - 0.02], memo: EV.game + 0.1, out: EV.now - 0.45 };
export const NEAR = { ring: EV.jackpot - 0.05, ringOut: EV.many - 0.2, flag: EV.above + 0.08, gasp: EV.so2 - 0.12, gaspOut: EV.many + 0.6 };
export const RIBBON = { in0: EV.many - 0.1, in1: EV.built + 0.35, lit: EV.almost - 0.05, out0: EV.wouldEnd + 0.05, out1: EV.then + 0.25 };
export const MUSIC = { t0: EV.happy - 0.05, t1: EV.lost + 0.3 };
export const BET = { take: EV.bet - 0.25, drop: EV.dollar - 0.04, slot: EV.dollar + 0.12, tag0: EV.one2 - 0.1, tag1: EV.fifty + 0.1 };
export const PAY = { t0: EV.fifty, land: EV.cents + 0.18, tag: EV.fifty + 0.05 };
export const WIN = { t0: EV.machine3 - 0.05, t1: EV.lost - 0.02 };
export const HALF = { t0: EV.lost - 0.02, t1: EV.half + 0.3, out: EV.test - 0.35 };
export const HEART = { t0: EV.body - 0.1, t1: EV.win1End + 0.3 };
export const BARS = { in: EV.in1 - 0.1, sound: EV.heard - 0.05, soundEnd: EV.lot + 0.1, real: EV.really - 0.05, realEnd: EV.didEnd, out: EV.didEnd + 0.15 };
export const LOCK4 = { t0: PRESS4 + 0.2, link: EV.changes - 0.05, out: EV.follow - 0.2 };

// ---------------------------------------------------------------- camera keys [t0, t1, cam] (eased dolly between keys)
const med = { tx: -24, ty: 112, tz: 300, D: 450, pitch: 0.14, sy0: 400 };
const inside = { tx: 2, ty: 74, tz: 300, D: 330, pitch: 0.16, sy0: 412 };
const close = { tx: 0, ty: 109, tz: 300, D: 250, pitch: 0.08, sy0: 360 };
export const CAM = [
  [0, 0, { ...med, D: 430 }],
  [0.1, EV.spinEnd, { ...med, D: 410 }],
  [CUT.in0 - 0.15, CUT.in1 + 0.3, inside],
  [GRAB.fly0 - 0.1, GRAB.sym1 + 0.2, { ...inside, ty: 96, sy0: 420 }],
  [CUT.out0 - 0.1, CUT.out1 + 0.2, { tx: 4, ty: 116, tz: 300, D: 310, pitch: 0.1, sy0: 372 }],
  [DUE.in - 0.35, DUE.in + 0.45, med],
  [PRESS2 + 0.05, EV.watch + 0.1, close],
  [EV.so2 - 0.2, EV.close + 0.4, { ...med, D: 400 }],
  [EV.then - 0.1, EV.bet - 0.2, { tx: -22, ty: 104, tz: 300, D: 350, pitch: 0.15, sy0: 400 }],
  [HALF.t1, HEART.t0 + 0.4, { tx: -34, ty: 112, tz: 300, D: 420, pitch: 0.14, sy0: 400 }],
  [BARS.out - 0.6, EV.stop - 0.05, { tx: -14, ty: 92, tz: 300, D: 330, pitch: 0.16, sy0: 400 }],
  [EV.follow - 0.4, END, { ...med, D: 470 }],
];
