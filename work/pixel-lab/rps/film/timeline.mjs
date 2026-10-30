// «Rock-paper-scissors isn't luck» timeline: every beat is anchored to a measured word of the single voice take
// (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json = original).
// Not a loop: the film ends on the follow card over the classroom, holding ~0.85 s after the last word.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("scissors", 2), W("time", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  rps: W("rock-paper-scissors"), luck: W("luck"), people1: W("people"), patterns: W("patterns"), patternsEnd: W("patterns", 1, "end"),
  and1: W("and"), use: W("use"), friends: W("friends"), friendsEnd: W("friends", 1, "end"),
  in2014: W("in", 2), y2014: W("2014"), scientists: W("scientists"), china: W("china"), three1: W("three"), sixty: W("sixty"), students: W("students"),
  three2: W("three", 2), rounds: W("rounds"), each1: W("each"), real: W("real"), money: W("money"), moneyEnd: W("money", 1, "end"),
  overall: W("overall"), each2: W("each", 2), move1: W("move"), third: W("third"), time1End: W("time", 1, "end"),
  but1: W("but"), winners1: W("winners"), same: W("same"), half: W("half"), time2End: W("time", 2, "end"),
  losers: W("losers"), switched: W("switched"), beat1: W("beat"), winner: W("winner"), winnerEnd: W("winner", 1, "end"),
  so1: W("so"), trick1: W("trick"), lose: W("lose"), play2: W("play", 3), beats: W("beats"), last: W("last"), move4: W("move", 4), because1: W("because"), winners2: W("winners", 2), repeat: W("repeat"), repeatEnd: W("repeat", 1, "end"),
  win: W("win"), play3: W("play", 4), lost: W("lost"), with1: W("with"), because2: W("because", 2), try1: W("try"), beat2: W("beat", 2), you4: W("you", 4), youEnd: W("you", 4, "end"),
  small: W("small"), edge: W("edge"), not: W("not"), magic: W("magic"), against: W("against"), truly: W("truly"), random1: W("random"), nothing: W("nothing"), works: W("works"),
  but2: W("but", 2), people2: W("people", 2), bad: W("bad"), random2: W("random", 2), random2End: W("random", 2, "end"),
  in2005: W("in", 4), y2005: W("2005"), japanese: W("japanese"), company: W("company"), choose: W("choose"), auction: W("auction"), house: W("house"), paintings: W("paintings"),
  made: W("made"), play5: W("play", 5), playEnd: W("play", 5, "end"),
  christies: W("christie's"), scissors1: W("scissors,"), advice: W("advice"), two: W("two"), eleven: W("eleven-year-old"), girls: W("girls"), girlsEnd: W("girls", 1, "end"),
  sothebys: W("sotheby's"), paper1: W("paper"), paperEnd: W("paper", 1, "end"), scissors2: W("scissors", 2), won: W("won"), wonEnd: W("won", 1, "end"),
  follow: W("follow"), miss: W("miss"), next: W("next"), trickLast: W("trick", 2), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- the duel: rounds of the two big hands
// moves: "R" rock, "P" paper, "S" scissors; "F" = the fist they pump with. pumps end on `at` (the reveal).
export const ROUNDS = [
  { pumps: [-0.36, EV.rps + 0.95], at: EV.rps + 1.0, you: "R", friend: "S" },                       // hook: already pumping at frame 0
  { pumps: [EV.winners1 - 0.3, EV.winners1 + 0.22], at: EV.winners1 + 0.26, you: "R", friend: "P", only: null }, // the winner (friend, paper)
  { pumps: [EV.same - 0.18, EV.same + 0.2], at: EV.same + 0.24, friend: "P", only: "friend" },      // the winner keeps the same move
  { change: EV.switched - 0.05, you: "S" },                                                            // the loser switches to what beats paper
  { pumps: [EV.lose - 0.62, EV.lose - 0.04], at: EV.lose, you: "R", friend: "P" },                  // R1: you lose
  { pumps: [EV.because1 - 0.3, EV.because1 + 0.36], at: EV.because1 + 0.4, you: "S", friend: "P" }, // R2: they repeat, scissors win
  { pumps: [EV.because2 - 0.42, EV.because2 + 0.26], at: EV.because2 + 0.3, you: "P", friend: "R" },// R3: they switch, paper wins
  { pumps: [EV.bad - 0.5, EV.bad + 0.04], at: EV.bad + 0.08, friend: "R", only: "friend" },         // people repeat: the same rock again
  { pumps: [EV.next - 0.75, EV.trickLast - 0.04], at: EV.trickLast, you: "S", friend: "P" },        // the next trick
];
export const SCORE = [ // [t, you, friend]
  [0, 0, 0], [EV.lose + 0.3, 0, 1], [ROUNDS[5].at + 0.3, 1, 1], [ROUNDS[6].at + 0.3, 2, 1],
];
// both arms slide out for the study and the bars, back in on "But winners…"; the friend's arm makes room for the robot
export const ARMS = { outA: [EV.in2014 - 0.12, EV.in2014 + 0.45], inA: [EV.but1 - 0.35, EV.but1 + 0.15], robotOut: [EV.against - 0.1, EV.against + 0.4], robotIn: [EV.but2 - 0.05, EV.but2 + 0.4] };
export const ROBOT = { in: [EV.against + 0.15, EV.against + 0.7], out: [EV.but2 - 0.2, EV.but2 + 0.25] };

// ---------------------------------------------------------------- camera: the classroom (x 270) → the auction room next door (x 1030) → back
export const ROOM = { class: 270, auction: 1030 };
export const CAM = [
  { t: 0, cx: ROOM.class }, { t: EV.in2005 - 0.15, cx: ROOM.class }, { t: EV.y2005 + 0.75, cx: ROOM.auction },
  { t: EV.wonEnd + 0.05, cx: ROOM.auction }, { t: EV.follow + 0.45, cx: ROOM.class }, { t: END + 10, cx: ROOM.class },
];
