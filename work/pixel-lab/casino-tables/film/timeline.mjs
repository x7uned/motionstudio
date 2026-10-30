// «In blackjack, you can both bust and you still lose» timeline (Casino secrets 5/5): every beat is anchored to a measured
// word of the single voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word timings by dev/retime.mjs;
// the original is words-el.json). Not a loop: the film ends on the follow card over the ceiling camera domes, ~0.85 s after
// the last word. Harness: frozen copy of casino-money/film/timeline.mjs.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[’]/g, "'").replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("dealer", 2), W("lose", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  blackjack1: W("blackjack"), dealer1: W("dealer"), both: W("both"), over1: W("over"), twentyone: W("twenty-one"), still: W("still"), lose: W("lose"), loseEnd: W("lose", 1, "end"),
  thats: W("that's"), edge: W("edge"), edgeEnd: W("edge", 1, "end"),
  play: W("play"), first: W("first"), firstEnd: W("first", 1, "end"), if1: W("if"), over2: W("over", 2), over2End: W("over", 2, "end"), chips: W("chips"), gone: W("gone"), away: W("away"), awayEnd: W("away", 1, "end"),
  before: W("before"), dealer2: W("dealer", 2), even1: W("even"), plays: W("plays"), playsEnd: W("plays", 1, "end"),
  now: W("now"), read: W("read"), small: W("small"), sign: W("sign"), table1End: W("table", 1, "end"),
  some: W("some"), pay: W("pay"), less: W("less"), blackjack2: W("blackjack", 2), blackjack2End: W("blackjack", 2, "end"), same: W("same"), game: W("game"), smaller: W("smaller"), prize: W("prize"), prizeEnd: W("prize", 1, "end"),
  walk: W("walk"), roulette: W("roulette"), that: W("that"), screen: W("screen"), last: W("last"), numbers: W("numbers"), numbersEnd: W("numbers", 1, "end"),
  five: W("five"), reds: W("reds"), row: W("row"), people: W("people"), rush: W("rush"), bet: W("bet"), black: W("black"), blackEnd: W("black", 1, "end"),
  but: W("but"), wheel: W("wheel"), no: W("no"), memory: W("memory"), memoryEnd: W("memory", 1, "end"), next1: W("next"), spin: W("spin"), care: W("care"), careEnd: W("care", 1, "end"),
  at: W("at"), dice1: W("dice"), players: W("players"), throw: W("throw"), harder: W("harder"), want: W("want"), big: W("big"), number1: W("number"), number1End: W("number", 1, "end"),
  feels: W("feels"), control: W("control"), controlEnd: W("control", 1, "end"), fair: W("fair"), die: W("die"), feel: W("feel"), anything: W("anything"), anythingEnd: W("anything", 1, "end"),
  casino1: W("casino"), dice2: W("dice", 2), seeThrough: W("see-through"), sharp: W("sharp"), edges: W("edges"), edgesEnd: W("edges", 1, "end"), serial: W("serial"), number2: W("number", 2), number2End: W("number", 2, "end"),
  so1: W("so"), nobody1: W("nobody"), swap: W("swap"), them: W("them"), themEnd: W("them", 1, "end"),
  and4: W("and", 4), dealer3: W("dealer", 3), leaves: W("leaves"), they2: W("they", 2), open: W("open"), hands: W("hands"), cameras: W("cameras"), above: W("above"), aboveEnd: W("above", 1, "end"),
  casino2: W("casino", 2), trusts: W("trusts"), nobody2: W("nobody", 2), not: W("not"), dice3: W("dice", 3), dice3End: W("dice", 3, "end"),
  follow: W("follow"), miss: W("miss"), next2: W("next", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- world positions (cm; x right, z toward the camera)
export const BJ = { x: -300, z: 230 };                    // the blackjack table (half-moon: straight edge far, arc toward the camera)
export const SIGN = { x: BJ.x + 62, z: BJ.z - 30 };       // the table's own sign «BLACKJACK PAYS 6 TO 5»
export const SIGN2 = { x: BJ.x + 20, z: BJ.z - 30 };       // the sign of «some other tables»: «BLACKJACK PAYS 3 TO 2»
export const RT = { x: 190, z: 170 };                     // the roulette table (long axis along z, wheel at the far end)
export const BOARD = { x: RT.x - 96, z: RT.z - 118, w: 56, y0: 100, y1: 236 }; // the tall last-numbers board on its pole
export const CR = { x: 700, z: 200, hw: 170, hd: 78 };    // the dice table (long rounded tub along x)
export const DEALER_CR = { x: CR.x - 60, z: CR.z - CR.hd - 34 };
export const CEIL = 540;                                   // ceiling height (= the kit's wall height)
export const HERO_Z = { bj: BJ.z + 74, rt: RT.z + 62, cr: CR.z + CR.hd + 26 };

// ---------------------------------------------------------------- beats (film seconds)
// 1) the hook hand: the hero's third card already sliding at frame 0, the dealer draws to 22, BUST over both, chips go, YOU LOSE
export const HOOK = { heroCard: [-0.25, 0.45], dealerCard: [EV.dealer1 - 0.1, EV.both + 0.05], bustHero: EV.over1 - 0.05, bustDealer: EV.twentyone + 0.05,
  chips: [EV.still - 0.15, EV.lose + 0.2], stamp: EV.lose - 0.05, edge: EV.edge - 0.1 };
// 2) rewind and replay in the right order: 1 YOU → 2 DEALER
export const REW = { t0: EV.edgeEnd + 0.05, t1: EV.play - 0.02, order: EV.play - 0.1, deal: [EV.first - 0.05, EV.firstEnd + 0.35], hit: [EV.over2 - 0.4, EV.over2], bust: EV.over2 + 0.05,
  chips: [EV.gone - 0.1, EV.away + 0.25], wait: [EV.before - 0.05, EV.playsEnd + 0.1], out: EV.now - 0.2 };
// 3) the sign: 6 TO 5 on this table, 3 TO 2 on «some tables», payout stacks
export const SIGNB = { look: EV.small - 0.1, other: EV.some - 0.05, payGrow: [EV.pay - 0.05, EV.pay + 0.35], payCut: [EV.less - 0.05, EV.blackjack2End], hands: EV.same - 0.1, glow: EV.smaller - 0.05, out: EV.walk + 0.6 };
// 4) roulette: the board, five reds, chips to BLACK, the board goes dark, NO MEMORY, the next spin
export const ROUL = { board: EV.screen - 0.1, reds: [EV.five - 0.05, EV.row + 0.1], rush: [EV.people - 0.05, EV.blackEnd + 0.15], dim: [EV.but - 0.05, EV.memory + 0.1], plate: EV.no - 0.05,
  spin0: EV.next1 - 0.15, out: EV.careEnd + 0.2 };
// 5) dice: shake hard → BIG NUMBER! → throw → bounce → land; the calm die; macro; swap blocked
export const DICE = { lift: EV.players - 0.1, shake: [EV.throw - 0.1, EV.number1End + 0.05], bubble: [EV.big - 0.12, EV.feels + 0.3], throw: EV.number1End + 0.08, hit: EV.number1End + 0.48, land: EV.feels + 0.45,
  proud: [EV.feels - 0.1, EV.controlEnd + 0.2], calm: [EV.fair - 0.1, EV.anythingEnd + 0.25], roll: [EV.die - 0.05, EV.feel + 0.15],
  macro: EV.casino1 - 0.15, glass: EV.seeThrough - 0.05, edges: [EV.sharp - 0.05, EV.edgesEnd + 0.25], serial: EV.serial - 0.1, swap: [EV.nobody1 - 0.1, EV.themEnd + 0.15] };
// 6) the dealer's open palms → the ceiling domes
export const PALMS = { step: [EV.leaves - 0.15, EV.they2 - 0.05], up: [EV.open - 0.15, EV.open + 0.2], flip: [EV.hands - 0.05, EV.cameras + 0.1], down: [EV.casino2, EV.trusts + 0.2], look: EV.cameras - 0.1 };
export const DOMES = { tilt: [EV.cameras - 0.25, EV.aboveEnd + 0.35], lights: EV.trusts - 0.1, all: EV.nobody2 - 0.1, dice: [EV.not - 0.05, EV.dice3End + 0.3] };

// ---------------------------------------------------------------- the hero's walk: [t, x] keys (eased at the ends)
export const HERO_X = [
  [0, BJ.x - 50],
  [EV.walk - 0.1, BJ.x - 50], [EV.numbers - 0.1, RT.x - 104],            // to the roulette table
  [EV.memory + 0.15, RT.x - 104], [EV.dice1 + 0.5, CR.x - 120],           // to the dice table
];
export const HERO_ZK = [[0, HERO_Z.bj], [EV.walk - 0.1, HERO_Z.bj], [EV.numbers - 0.1, HERO_Z.rt], [EV.memory + 0.15, HERO_Z.rt], [EV.dice1 + 0.5, HERO_Z.cr]];

// ---------------------------------------------------------------- camera keys [t0, t1, cam] (eased dolly between keys)
const bj = { tx: BJ.x - 5, ty: 88, tz: BJ.z - 10, D: 290, pitch: 0.44, sy0: 470 };
// the ceiling view: the camera stays near the dealer close-up's position and tilts up (target = cam − D·dir)
const camPos = (k) => ({ x: k.tx, y: k.ty + k.D * Math.sin(k.pitch), z: k.tz + k.D * Math.cos(k.pitch) });
const aim = (pos, pitch, D, o = {}) => ({ tx: pos.x + (o.dx ?? 0), ty: pos.y - D * Math.sin(pitch), tz: pos.z - D * Math.cos(pitch), D, pitch, sy0: o.sy0 ?? 470 });
export const DEALER_CAM = { tx: DEALER_CR.x, ty: 112, tz: DEALER_CR.z + 6, D: 250, pitch: 0.2, sy0: 420 };
const P0 = camPos(DEALER_CAM);
export const DIE_POS = { x: CR.x - 55, z: CR.z + 6 };
export const CAM = [
  [0, 0, { ...bj, D: 280 }],
  [0, EV.lose, { ...bj }],
  [EV.edgeEnd, EV.first, { ...bj, D: 296, tx: BJ.x - 2 }],
  [EV.now - 0.2, EV.sign + 0.25, { tx: SIGN.x - 8, ty: 86, tz: BJ.z - 8, D: 205, pitch: 0.6, sy0: 400 }],
  [EV.some - 0.2, EV.pay + 0.2, { tx: (SIGN.x + SIGN2.x) / 2, ty: 86, tz: BJ.z - 8, D: 235, pitch: 0.62, sy0: 400 }],
  [EV.walk - 0.3, EV.walk + 0.5, { tx: -60, ty: 150, tz: 40, D: 640, pitch: 0.3, sy0: 470 }],
  [EV.walk + 0.45, EV.screen + 0.1, { tx: RT.x - 40, ty: 118, tz: RT.z - 70, D: 470, pitch: 0.36, sy0: 450 }],
  [EV.people - 0.3, EV.rush + 0.3, { tx: RT.x - 20, ty: 108, tz: RT.z - 40, D: 450, pitch: 0.42, sy0: 455 }],
  [EV.care - 0.3, EV.dice1 + 0.6, { tx: CR.x - 75, ty: 92, tz: CR.z, D: 330, pitch: 0.44, sy0: 470 }],
  [EV.die - 0.35, EV.die + 0.45, { tx: DIE_POS.x - 1, ty: 76, tz: DIE_POS.z, D: 56, pitch: 0.5, sy0: 420 }],
  [EV.casino1 - 0.25, EV.seeThrough + 0.1, { tx: DIE_POS.x, ty: 80, tz: DIE_POS.z, D: 48, pitch: 0.42, sy0: 390 }],
  [EV.and4 - 0.25, EV.leaves + 0.5, DEALER_CAM],
  [DOMES.tilt[0], DOMES.tilt[1], aim(P0, -0.36, 520, { sy0: 470 })],
  [EV.casino2 - 0.1, EV.nobody2 + 0.3, aim(P0, -0.46, 540, { dx: 30, sy0: 480 })],
  [EV.not - 0.1, END, aim(P0, -0.5, 550, { dx: 40, sy0: 486 })],
];
