// «Shuffle a deck well» timeline: every beat is anchored to a measured word of the single voice take
// (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json = original).
// Not a loop: the film ends on the follow card over the table, holding ~0.85 s after the last word.
// The card order is SIMULATED here (pos = draw order, 0 = bottom of a stack / left end of the spread):
//   START   new-deck order ♠A–K ♦A–K ♣K–A ♥K–A (the first frame's spread)
//   RIFF    one Gilbert–Shannon–Reeds riffle of START (fixed seed): two interleaved runs that keep their old order
//   OVER    an overhand pass of RIFF (packets off the top, reversed packet order)
//   PERF[j] START after j perfect out-shuffles (new[2k] = old[k], new[2k+1] = old[26+k]); PERF[8] === START (asserted)
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("shuffle", 2), W("held", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  held: W("held"), casino: W("casino,"), game: W("game,"), ever2: W("ever", 2), first: W("first"), fifty2: W("fifty-two."), next1: W("next,"), fifty1: W("fifty-one."),
  multiply: W("multiply"), all1: W("all"), down: W("down,"), number: W("number"), sixty8: W("sixty-eight"), digits: W("digits."), digitsEnd: W("digits.", 1, "end"),
  let1: W("let"), person: W("person"), earth: W("earth"), shuffle2: W("shuffle", 2), once: W("once"), second: W("second"), big: W("big"), bangEnd: W("bang.", 1, "end"),
  chance: W("chance"), two1: W("two"), decks: W("decks"), matched: W("matched"), one2: W("one", 2), thirteen: W("thirteen"), trillionEnd: W("trillion.", 1, "end"),
  but1: W("but"), well2: W("well", 2), after: W("after"), riffle1: W("riffle,"), still: W("still"), keeps: W("keeps"), old: W("old"), orderEnd: W("order", 2, "end"),
  in1992: W("in", 4), y1992: W("1992,"), two2: W("two", 2), mathematicians: W("mathematicians"), need: W("need"), about2: W("about", 2), seven: W("seven"), rifflesEnd: W("riffles.", 1, "end"),
  slow: W("slow"), overhand: W("overhand"), needs: W("needs"), thousands: W("thousands."), thousandsEnd: W("thousands.", 1, "end"),
  and3: W("and", 3), perfect: W("perfect"), random: W("random"), allEnd: W("all", 2, "end"),
  cut: W("cut"), exact: W("exact"), halves: W("halves,"), weave: W("weave"), side: W("side."), sideEnd: W("side.", 1, "end"),
  do1: W("do"), eight: W("eight"), back: W("back"), started: W("started."), startedEnd: W("started.", 1, "end"),
  magicians: W("magicians"), cheats: W("cheats"), purpose: W("purpose."), theres: W("there's"), hidden: W("hidden"), math: W("math"), lot: W("lot"), games: W("games."),
  follow: W("follow,"), miss: W("miss"), next2: W("next", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- cards
/** id → { suit: "S" | "D" | "C" | "H", rank 1..13 } for the new-deck order (id === START position). */
export function cardOf(id) {
  if (id < 13) return { suit: "S", rank: id + 1 };
  if (id < 26) return { suit: "D", rank: id - 12 };
  if (id < 39) return { suit: "C", rank: 39 - id };
  return { suit: "H", rank: 52 - id };
}
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const START = Array.from({ length: 52 }, (_, i) => i);

/** One GSR riffle: cut after `cut` cards, drop from the bottoms with probability ∝ packet size. Returns the new order and,
 *  per new position, which packet the card came from (0 = lower, 1 = upper) and its index inside that packet. */
export function riffle(order, cut, seed) {
  const L = order.slice(0, cut), U = order.slice(cut), out = [], from = [];
  let i = 0, j = 0, k = 0;
  while (i < L.length || j < U.length) {
    const a = L.length - i, b = U.length - j, takeL = b === 0 || (a > 0 && hash(seed * 977 + k) < a / (a + b));
    if (takeL) { out.push(L[i]); from.push([0, i++]); } else { out.push(U[j]); from.push([1, j++]); }
    k++;
  }
  return { order: out, from };
}
export const RIFFLE = riffle(START, 26, 11);
export const RIFF = RIFFLE.order;

/** Overhand: packets off the top of the deck (high positions) onto a new pile; each packet keeps its inner order. */
export const OVER_PACKETS = [5, 7, 4, 6, 8, 3, 6, 5, 4, 4];
export function overhand(order, packets) {
  const deck = order.slice(), pile = [], moves = [];
  for (const n of packets) { const p = deck.splice(deck.length - n, n); moves.push({ cards: p, pileBase: pile.length }); pile.push(...p); }
  if (deck.length) throw new Error("overhand packets must use the whole deck");
  return { order: pile, moves };
}
export const OVERHAND = overhand(RIFF, OVER_PACKETS);

export const faro = (order) => { const out = new Array(52); for (let k = 0; k < 26; k++) { out[2 * k] = order[k]; out[2 * k + 1] = order[26 + k]; } return out; };
export const PERF = [START]; for (let j = 1; j <= 8; j++) PERF.push(faro(PERF[j - 1]));
for (let j = 1; j < 8; j++) if (PERF[j].every((v, i) => v === i)) throw new Error("out-shuffle period is shorter than 8?");
if (!PERF[8].every((v, i) => v === START[i])) throw new Error("8 perfect out-shuffles must restore the start order");

// ---------------------------------------------------------------- layout (540×960 grid)
export const CARD_W = 40, CARD_H = 56;
export const HOME = { x: 270, y: 572 };
export const HOOK = { x: 270, y: 442 };                                   // the hook riffle happens where the spread was, then the deck slides home                                  // the deck's resting place (card centre)
export const ROW_Y = [358, 428];                                          // spread rows (card tops): positions 0–25, 26–51
export const SPREAD_X0 = 85, SPREAD_STEP = 12.8;                          // row: x 85 … 445
export const slot = (pos) => ({ x: SPREAD_X0 + (pos % 26) * SPREAD_STEP, y: ROW_Y[pos < 26 ? 0 : 1] });   // top-left
export const homeTL = (i, at = HOME) => ({ x: at.x - CARD_W / 2, y: at.y - CARD_H / 2 - Math.floor(i * 0.16) });

// ---------------------------------------------------------------- beat windows (all from words)
export const T = {
  gather: [0.0, 1.25],                                     // the first frame's spread is swept into the deck (already moving)
  cut1: [1.28, 1.62], drops: [1.72, 3.4], square: [3.42, 3.86], toHome: [3.95, 4.55],  // the hook riffle
  cloud: [EV.first - 0.05, EV.first + 0.8],                // the deck bursts into a cloud of 52 face-down cards
  pick1: [EV.fifty2 - 0.3, EV.fifty2 + 0.18], pick2: [EV.fifty1 - 0.3, EV.fifty1 + 0.18], pick3: [EV.multiply - 0.12, EV.multiply + 0.3],
  rest: [EV.multiply + 0.35, EV.number - 0.08],             // the other 49 stream back into the deck
  cellsBack: [EV.let1 - 0.35, EV.let1 + 0.3],
  ticker: [EV.number + 0.05, EV.trillionEnd + 0.25],
  spreadR: [EV.after, EV.after + 0.92], gatherR: [EV.rifflesEnd - 0.3, EV.slow - 0.03],
  over0: EV.overhand - 0.01, overStep: 0.19, overDur: 0.16,
  swapOut: [EV.and3 - 0.05, EV.and3 + 0.62], swapIn: [EV.and3 + 0.15, EV.random - 0.25], spreadP: [EV.random - 0.2, EV.allEnd + 0.02],
  cutApart: [EV.cut + 0.05, EV.cut + 0.55], zip0: EV.weave, zipStep: 0.052, zipDur: 0.32,
  morph0: EV.do1 + 0.04, morphStep: 0.34, morphDur: 0.3,
};
/** Start time of perfect shuffle j (1..8) and its landing. */
export const perfAt = (j) => (j === 1 ? T.zip0 : T.morph0 + (j - 2) * T.morphStep);
export const perfLand = (j) => (j === 1 ? T.zip0 + 25 * T.zipStep + T.zipDur : perfAt(j) + T.morphDur + 0.03);
