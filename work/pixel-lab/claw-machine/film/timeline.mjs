// «Many claw machines choose when to let you win» timeline: every beat is anchored to a measured word of the single
// voice take (voice/words.json = ElevenLabs alignment moved onto Scribe's word starts by shared/retime.mjs; words-el.json
// = original). Not a loop: the film ends on the follow card over the machine, holding ~0.85 s after the last word.
// World: one arcade. The cut-away claw machine (world x 26–316) with its open side service panel (x 318–502) and, to the
// right, a neighbour «SKILL» machine (offset NX) that the camera pans to once ("aim still matters") and back.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const VOICE = JSON.parse(fs.readFileSync(HERE + "voice/words.json", "utf8"));
const words = VOICE.words;
const norm = (s) => s.toLowerCase().replace(/[^a-z0-9'-]/g, "");
/** Start (or end) of the n-th occurrence of a spoken word: W("win", 2), W("hold.", 1, "end"). */
export function W(text, n = 1, edge = "start") { let k = 0; for (const w of words) if (norm(w.text) === norm(text) && ++k === n) return w[edge]; throw new Error(`word not found: ${text} #${n}`); }
export const FPS = 30, WORDS = words;
export const VOICE_END = Math.min(words[words.length - 1].end, VOICE.duration);
export const END = Math.ceil((VOICE_END + 0.85) * FPS) / FPS;

export const EV = {
  choose: W("choose"), win1: W("win."), and1: W("and"), manuals: W("manuals"), how: W("how."),
  inside: W("inside,"), owner: W("owner"), sets: W("sets"), rate: W("rate."), one1: W("one"), example: W("example:"), one2: W("one", 2), hundred: W("hundred"), games: W("games."),
  others1: W("others"), price: W("price"), play1: W("play"), cost: W("cost"), prize1: W("prize,"), then1: W("then"), math: W("math."), mathEnd: W("math.", 1, "end"),
  on1: W("on"), coins: W("coins,"), weak1: W("weak"), power1: W("power."),
  grabs: W("grabs,"), lifts: W("lifts,"), grip: W("grip"), fades: W("fades"), up1: W("up,"), prize2: W("prize", 2), slip: W("slip"), itself: W("itself."), itselfEnd: W("itself.", 1, "end"),
  one4: W("one", 3), manual2: W("manual"), says: W("says:"), set1: W("set"), weak2: W("weak", 2), hold: W("hold."), holdEnd: W("hold.", 1, "end"),
  when2: W("when", 2), number: W("number"), comes: W("comes"), full: W("full"), power2: W("power", 2), holds: W("holds"), onEnd: W("on", 3, "end"),
  some: W("some"), pick: W("pick"), random: W("random."),
  others2: W("others", 2), wait: W("wait"), count: W("count,"), start: W("start"), zero: W("zero"), win3: W("win", 4),
  on3: W("on", 4), those: W("those,"), right: W("right"), after2: W("after", 2), wins: W("wins"), worst: W("worst."),
  not1: W("not"), machine3: W("machine"), way2: W("way", 2), aim: W("aim"), matters: W("matters."),
  but: W("but"), closes: W("closes"), hard: W("hard"), then2: W("then", 2), goes: W("goes"), limp: W("limp,"), thats: W("that's"), bad: W("bad"), luck: W("luck."),
  its: W("it's"), setting: W("setting."), settingEnd: W("setting.", 1, "end"),
  follow: W("follow,"), miss: W("miss"), arcade: W("arcade"), secret: W("secret."), lastEnd: VOICE_END,
};

// ---------------------------------------------------------------- layout (540×960 grid, world coordinates)
export const NX = 490;                                                  // neighbour machine offset (world x)
export const GLASS = { x0: 40, x1: 302, y0: 196, y1: 522 };              // main machine window
export const RAIL_Y = 204, HOME = { x: 74, y: 252 };                     // gantry rail; the claw's rest above the chute
export const CHUTE = { x0: 44, x1: 104, top: 432 };                      // prize chute (front left, inside the glass)
export const SLOT = { x: 272, y: 538 };                                  // coin slot on the control ledge
export const DOOR = { x: 50, y: 572, w: 70, h: 50 };                     // prize door (front panel)
export const COUNTER = { x: 322, y: 150, w: 178, h: 54 };
export const HEAD = { x: 318, y: 208, w: 186, h: 186 };                  // panel head: LCD + MODE switch
export const LCD = { x: 326, y: 216, w: 170, h: 120 };
export const GAUGE = { x: 318, y: 398, w: 122, h: 200 };
export const PAN = 490;

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
/** Keyframe track: keys [[t, v], …]; eased between keys, held outside. */
export function track(keys, t, e = ease) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1] = keys[i]; return v0 + (v1 - v0) * e((t - t0) / (t1 - t0)); }
  return keys[keys.length - 1][1];
}

// ---------------------------------------------------------------- camera
export const PAN_T = { go: [EV.not1 - 0.12, EV.not1 + 0.78], back: [EV.matters + 0.3, EV.but + 0.48] };
export const pan = (t) => PAN * (ease(clamp01((t - PAN_T.go[0]) / (PAN_T.go[1] - PAN_T.go[0]))) - ease(clamp01((t - PAN_T.back[0]) / (PAN_T.back[1] - PAN_T.back[0]))));

// ---------------------------------------------------------------- the main claw (carriage x, hub y, prong opening 0 closed … 1 open)
const G1 = { x: 172, down: EV.grabs - 0.02, shut: EV.grabs + 0.42, lift0: EV.lifts + 0.02, lift1: EV.up1 + 0.2, carry0: EV.up1 + 0.3, slip0: EV.prize2 + 0.1, slip1: EV.itself + 0.25 };
const G2 = { x: 238, down: EV.full - 0.62, shut: EV.full - 0.12, lift0: EV.power2 - 0.15, lift1: EV.holds + 0.05, carry1: EV.onEnd + 0.12, drop: EV.onEnd + 0.15 };
const G3 = { x: 166, down: EV.but - 0.3, shut: EV.closes, lift0: EV.hard + 0.1, lift1: EV.limp + 0.25, limp0: EV.then2, limp1: EV.limp + 0.2, slip0: EV.limp + 0.22, slip1: EV.thats + 0.2 };
export const GRABS = { G1, G2, G3 };
export const LOW = 388, TOP = 262, GRIP_DY = 48;
export const CLAW_X = [[-0.9, 96], [1.45, 214], [EV.coins + 0.45, 214], [EV.grabs - 0.3, G1.x], [G1.carry0, G1.x], [EV.itselfEnd + 0.15, HOME.x], [EV.hold - 1.1, HOME.x], [EV.number + 0.2, G2.x], [G2.lift1 + 0.05, G2.x], [G2.carry1, HOME.x], [EV.aim - 1.4, HOME.x], [G3.down - 0.35, G3.x], [EV.setting - 0.1, G3.x], [EV.follow - 0.2, HOME.x]];
export const CLAW_Y = [[-0.9, 262], [2.0, 262], [G1.down, 262], [G1.shut - 0.06, LOW], [G1.lift0, LOW], [G1.lift1, TOP], [EV.itselfEnd + 0.15, HOME.y], [G2.down, HOME.y], [G2.shut - 0.06, LOW], [G2.lift0, LOW], [G2.lift1, TOP], [G2.carry1, HOME.y + 8],
  [G3.down - 0.1, HOME.y], [G3.shut - 0.05, LOW], [G3.lift0, LOW], [G3.lift1 + 0.3, TOP + 10], [EV.setting - 0.1, TOP + 10], [EV.follow - 0.2, HOME.y]];
export const CLAW_OPEN = [[-0.9, 0.25], [1.7, 0.25], [2.05, 0.75], [2.45, 0.25], [EV.coins + 1.0, 0.25], [G1.down - 0.5, 1], [G1.shut - 0.25, 1], [G1.shut, 0.12],
  [EV.itselfEnd + 0.05, 0.75], [EV.itselfEnd + 0.4, 0.25], [G2.down - 0.6, 0.25], [G2.down, 1], [G2.shut - 0.22, 1], [G2.shut, 0.1], [G2.drop - 0.05, 0.1], [G2.drop + 0.2, 1], [G2.drop + 0.7, 0.25],
  [G3.down - 0.7, 0.25], [G3.down - 0.1, 1], [EV.closes - 0.02, 1], [EV.closes + 0.16, 0.0], [G3.limp0, 0.0], [G3.limp1 + 0.1, 0.55], [EV.setting, 0.55], [EV.follow - 0.2, 0.25]];
/** Grip voltage on the claw coil (0 when idle): 48 V on the grab, fading to 10 V on the lift for weak plays. */
export const VOLT = [[-1, 0], [G1.shut - 0.3, 0], [G1.shut - 0.05, 48], [EV.grip - 0.15, 48], [EV.up1 + 0.15, 10], [EV.itselfEnd + 0.1, 10], [EV.itselfEnd + 0.45, 0],
  [G2.shut - 0.3, 0], [G2.shut - 0.05, 48], [G2.drop - 0.02, 48], [G2.drop + 0.3, 0],
  [EV.closes - 0.06, 0], [EV.closes + 0.14, 48], [G3.limp0, 48], [G3.limp1, 10], [EV.follow + 0.6, 10], [END, 10]];
export const VOLT_EASE = (x) => x; // linear between keys (a coil voltage ramp), the needle adds its own lag

// ---------------------------------------------------------------- the play counter (continuous value; rolls like an odometer)
export const COUNT = [[-1, 6], [0.25, 6], [0.85, 7], [EV.coins + 0.3, 7], [EV.coins + 0.75, 8], [EV.number - 0.05, 8], [EV.comes + 0.35, 12], [EV.zero - 0.35, 12], [EV.zero + 0.5, 0], [EV.right - 0.2, 0], [EV.right + 0.25, 1]];
export const COIN_DROPS = [{ t: 0.05, hand: true, first: true }, { t: EV.coins - 0.25, hand: true }, { t: EV.those + 0.2, hand: true }];   // the coin lands in the slot at t + 0.5

// ---------------------------------------------------------------- panel, LCD pages, mode switch, manual
export const DOOR_T = { hand: [EV.inside - 0.35, EV.inside + 0.15], turn: [EV.inside + 0.2, EV.inside + 0.45], out: [EV.inside + 0.5, EV.owner + 0.4], open: [EV.inside + 0.5, EV.owner + 0.05] };
export const PAGES = [
  { id: "settings", t0: EV.owner + 0.15, t1: EV.others1 - 0.05 },
  { id: "payout", t0: EV.others1 - 0.05, t1: EV.grabs - 0.45 },
  { id: "graph", t0: EV.grabs - 0.45, t1: EV.some + 0.05 },
  { id: "random", t0: EV.some + 0.05, t1: EV.others2 - 0.05 },
  { id: "fixed", t0: EV.others2 - 0.05, t1: EV.but - 0.4 },
  { id: "graph3", t0: EV.but - 0.4, t1: END + 1 },
];
export const MODE = [[-1, 1], [EV.pick - 0.1, 1], [EV.pick + 0.25, 0], [EV.others2 + 0.05, 0], [EV.wait + 0.1, 1]];   // 1 = FIXED, 0 = RANDOM
export const BOOK = { a: [EV.and1 - 0.12, EV.inside - 0.15], open: [EV.manuals - 0.05, EV.how + 0.05], b: [EV.one4 - 0.15, EV.when2 - 0.05], mark: [EV.set1 - 0.05, EV.hold + 0.1] };
