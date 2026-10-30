// «That free drink in a casino isn't free» timeline (Casino secrets 4/5): every beat is anchored to a measured word of the
// single voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by dev/retime.mjs; the original
// is words-el.json). Not a loop: the film ends on the follow card over the NO FREE DRINKS machines, ~0.85 s after the last
// word. Harness: frozen copy of casino-floor/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("free", 2), W("free", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  free1: W("free"), drink1: W("drink"), isnt: W("isn't"), free2: W("free", 2), free2End: W("free", 2, "end"),
  already: W("already"), knows: W("knows"), costs: W("costs"), youEnd: W("you", 1, "end"),
  first: W("first"), money1: W("money"), turns: W("turns"), chips: W("chips"), chipsEnd: W("chips", 1, "end"),
  colorful: W("colorful"), plastic: W("plastic"), game1: W("game"), not1: W("not"), cash: W("cash"), cashEnd: W("cash", 1, "end"),
  shopping: W("shopping"), tests: W("tests"), people1: W("people"), spend: W("spend"), easily: W("easily"), dont1: W("don't"), pay: W("pay"), real: W("real"), money2End: W("money", 2, "end"),
  then: W("then"), player: W("player"), card: W("card"), cardEnd: W("card", 1, "end"), looks: W("looks"), gift: W("gift"), giftEnd: W("gift", 1, "end"),
  but: W("but"), records: W("records"), every: W("every"), bet: W("bet"), how1: W("how"), much1: W("much"), how2: W("how", 2), fast: W("fast"), how3: W("how", 3), long: W("long"), longEnd: W("long", 1, "end"),
  puts: W("puts"), together: W("together"), games: W("game's"), edge: W("edge"), guesses: W("guesses"), lose1: W("lose"), lose1End: W("lose", 1, "end"),
  your1: W("your", 2), free3: W("free", 3), dinner: W("dinner"), room: W("room"), show: W("show"), showEnd: W("show", 1, "end"),
  theyre: W("they're"), paid: W("paid"), small: W("small"), part1: W("part"), guess: W("guess"), guessEnd: W("guess", 1, "end"),
  more2: W("more", 2), expect: W("expect"), lose2: W("lose", 2), lose2End: W("lose", 2, "end"), better: W("better"), gifts: W("gifts"), giftsEnd: W("gifts", 1, "end"),
  some1: W("some"), big: W("big"), players: W("players"), part2: W("part", 2), losses: W("losses"), back: W("back"), just: W("just"), come: W("come"), again: W("again"), againEnd: W("again", 1, "end"),
  and2: W("and", 3), free7: W("free", 6), drinks1: W("drinks"), drinks1End: W("drinks", 1, "end"),
  test: W("test"), people2: W("people", 2), drank: W("drank"), made: W("made"), bigger: W("bigger"), bets: W("bets"), betsEnd: W("bets", 1, "end"),
  places: W("places"), free8: W("free", 7), drinks2: W("drinks", 2), machines: W("machines"), against: W("against"), law: W("law"), lawEnd: W("law", 1, "end"),
  follow: W("follow"), miss: W("miss"), next: W("next"), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- world positions (cm; x right, z toward the camera)
export const CAGE = { x0: -960, x1: -740, z0: 140, z1: 250, win: -900 };     // cashier cage, window opening centred at win
export const SHOP = { x0: -720, x1: -460, z0: 150, z1: 250, reg: -585 };     // gift shop kiosk, register at reg
export const SLOTM = { x: -290, z: 300 };                                     // the hero's slot machine
export const TABLE = { x: 190, z: 170 };                                      // the big player's roulette table
export const BANK = [{ x: 590, z: 280 }, { x: 682, z: 280 }, { x: 774, z: 280 }]; // the machines with the NO FREE DRINKS sign
export const SIGN = { x: 500, z: 330 };
export const HERO_Z = 336, HERO_Z_CAGE = 300;

// ---------------------------------------------------------------- beats (film seconds)
export const WAIT = { stop: EV.isnt - 0.2, flip0: EV.already - 0.05, flip1: EV.already + 0.45, leave: EV.first - 0.1, gone: EV.colorful + 0.2 };
export const TAG = { flip0: WAIT.flip0, flip1: WAIT.flip1, roll1: EV.youEnd + 0.1, out: EV.first + 0.1 };
export const CASH = { reach: EV.first - 0.05, push0: EV.money1 - 0.05, push1: EV.turns + 0.3, chips0: EV.chips - 0.15, chips1: EV.chipsEnd + 0.35 };
export const TOY = { hop0: EV.colorful - 0.05, hop1: EV.cashEnd + 0.2, bill0: EV.not1 - 0.1, bill1: EV.cashEnd + 0.1 };
export const SHOPB = { bill: EV.shopping - 0.1, doubt0: EV.tests, doubt1: EV.spend - 0.1, swap: EV.spend - 0.05, tap: EV.easily - 0.05, items: [0, 1, 2, 3, 4].map((i) => EV.easily + 0.2 + i * 0.3), out: EV.then + 0.3 };
export const CARD = { in0: EV.player - 0.15, in1: EV.cardEnd + 0.1, bow: EV.gift - 0.05, untie: EV.but - 0.05, insert0: EV.records - 0.1, insert1: EV.every - 0.05, out: EV.puts };
export const ICONS = { in: EV.records + 0.1, much: EV.much1 - 0.05, fast: EV.fast - 0.05, long: EV.long - 0.05, merge0: EV.puts - 0.05, merge1: EV.together + 0.35, edge0: EV.games - 0.15, edge1: EV.edge + 0.2 };
export const BOARD = { in: EV.together + 0.1, roll: EV.guesses - 0.05, lock: EV.lose1End, cut: EV.your1 - 0.1, out: EV.some1 - 0.3 };
export const GIFT = { dinner: EV.dinner - 0.05, room: EV.room - 0.05, show: EV.show - 0.05, bracket0: EV.paid - 0.05, bracket1: EV.guessEnd + 0.2, grow0: EV.more2 - 0.05, grow1: EV.lose2End + 0.1, up: [EV.better - 0.1, EV.better + 0.15, EV.gifts], out: EV.some1 - 0.2 };
export const BIG = { lose0: EV.part2 - 0.05, lose1: EV.losses + 0.45, env0: EV.back - 0.05, env1: EV.back + 0.65, happy0: EV.just - 0.05, happy1: EV.againEnd + 0.3 };
export const DRINK = { hand0: EV.drinks1, hand1: EV.drinks1End + 0.4, leave: EV.test - 0.2, sip0: EV.people2 - 0.1, sip1: EV.drank + 0.45, stack0: EV.made - 0.05, stack1: EV.betsEnd };
export const LAW = { drop0: EV.free8 - 0.25, drop1: EV.machines + 0.1, cross: EV.law - 0.05 };

// ---------------------------------------------------------------- the hero's walk: [x] keys (eased only at the ends)
export const HERO_X = [
  [0, -1000],
  [EV.first - 0.4, -1000], [EV.money1 - 0.05, -965],                       // a step to the cage window
  [EV.shopping - 1.2, -965], [EV.shopping - 0.05, -662],                   // over to the gift shop register
  [EV.money2End - 0.15, -662], [EV.card + 0.15, -364],                      // to the slot machine
  [EV.some1 - 0.1, -364], [EV.again - 0.1, TABLE.x - 120],                 // to the roulette table
];
// the waitress: [t, x] keys; she walks left in front of the hero, later comes back from the right with the drink
export const WAITRESS_Z = 384;
export const WAIT_X = [[0, -835], [WAIT.stop, -905], [WAIT.leave, -905], [WAIT.gone, -1260]];
export const WAIT2_X = [[EV.again - 0.3, TABLE.x + 330], [EV.drinks1 + 0.05, TABLE.x - 40], [DRINK.leave, TABLE.x - 40], [DRINK.leave + 2.2, TABLE.x - 460]];

// ---------------------------------------------------------------- camera keys [t0, t1, cam] (eased dolly between keys)
const hook = { tx: -935, ty: 116, tz: 320, D: 420, pitch: 0.14, sy0: 420 };
export const CAM = [
  [0, 0, { ...hook, tx: -915, D: 445 }],
  [0, EV.youEnd, { ...hook }],
  [EV.first - 0.3, EV.chips, { tx: -915, ty: 108, tz: 290, D: 380, pitch: 0.22, sy0: 430 }],
  [EV.colorful - 0.3, EV.game1, { tx: -905, ty: 100, tz: 280, D: 290, pitch: 0.36, sy0: 400 }],
  [EV.shopping - 1.2, EV.shopping + 0.2, { tx: -608, ty: 112, tz: 290, D: 400, pitch: 0.22, sy0: 430 }],
  [EV.easily, EV.money2End, { tx: -604, ty: 112, tz: 290, D: 380, pitch: 0.22, sy0: 430 }],
  [EV.money2End - 0.2, EV.card + 0.2, { tx: -305, ty: 112, tz: 300, D: 390, pitch: 0.22, sy0: 470 }],
  [EV.records, EV.lose1End, { tx: -300, ty: 112, tz: 300, D: 410, pitch: 0.22, sy0: 480 }],
  [EV.some1 - 0.4, EV.players + 0.4, { tx: 262, ty: 100, tz: 260, D: 400, pitch: 0.28, sy0: 450 }],
  [EV.and2 - 0.4, EV.drinks1End, { tx: 120, ty: 100, tz: 260, D: 470, pitch: 0.24, sy0: 430 }],
  [EV.made - 0.4, EV.betsEnd, { tx: 120, ty: 95, tz: 280, D: 360, pitch: 0.3, sy0: 430 }],
  [EV.places - 0.4, EV.law, { tx: 620, ty: 112, tz: 300, D: 540, pitch: 0.16, sy0: 450 }],
  [EV.follow - 0.2, END, { tx: 625, ty: 112, tz: 300, D: 560, pitch: 0.16, sy0: 455 }],
];
