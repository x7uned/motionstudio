// «How much would Pac-Man eat in our world» (IN OUR WORLD #3) · Kagenami pixel film. Two worlds:
//   1. frame 0 → CUT: HIS maze (assets/maze.mjs, our layout) at the sprite scale N = 14: Pac-Man eats along a corridor, Blinky
//      and Pinky chase, Inky patrols below, Clyde bobs in the ghost house; watermelon icons flicker over the dots on «seven
//      watermelons»; a portal opens at the corridor's end on «bring», he dives in;
//   2. HARD CUT (the rubric's signature, the only allowed cut) → OUR sunny street market at noon (assets/market.mjs) through one
//      pinhole camera (lib/cam.mjs), integer sprite scale N per shot: he flies out of the same portal and lands next to the
//      melon vendor (1.7 m, the same height); the game window with the 13-cell ruler and the 2-cell dot; the dot flies out and
//      becomes a watermelon in the vendor's hands (26 cm); the line of watermelons 1 m apart; 25 km/h with a gulp on each
//      melon (slow motion), 6.7 / s; 240 melons on a floor scale vs a car on a second one; the ghosts come through a portal and
//      catch up (27 vs 25 km/h), Blinky glows (37 vs 36); the 1 m big dot → blue for 6 s; LEVEL 19 · 0 s in a game window;
//      the crossroads from above (assets/topdown.mjs): ghosts turn at the middle, Pac-Man cuts the corner (+ distance) and
//      shoots away; back in the street the portal shows a blue spiky silhouette (NEXT: SONIC) and the follow card (cta.mjs).
// Every beat is anchored to a measured word (timeline.mjs W()). All art is this film's own; no catalog art.
import { fade, bayer, Canvas, hex, mix } from "../../../../renderer/pixel/raster.mjs";
import { W, END, VOICE_END } from "./timeline.mjs";
import { makeCam, R, lerp, sm, eio, eout, ein, clamp01, win, TAU, BY, h2, box3 } from "./lib/cam.mjs";
import { drawMarket, melon3, MK, stallX } from "./assets/market.mjs";
import { drawCross, vx, vy } from "./assets/topdown.mjs";
import { drawMaze, TILE, melonIcon, ROW_MAIN, PORTAL_COL } from "./assets/maze.mjs";
import { drawPac, drawGhost, drawSpiky, spriteShadow, drawGrid, PAC } from "./assets/sprites.mjs";
import { drawPerson, skeleton } from "./assets/passerby.mjs";
import { portal, gauge, ring, bracketV, bracketH, route, gameFrame, floorScale, car3, bigBall, glow, dust, streaks } from "./assets/props.mjs";
import { MAIN, C as HC, plate, label, pill, odo, odoW, lc } from "./lib/hud.mjs";

export { sm, eio };
const ZM = MK.ZM;
// ---------------------------------------------------------------- words (single take, Scribe timings)
export const E = {
  pac1: W("pac-man"), seven1: W("seven"), wm1: W("watermelons"), second1: W("second."), lets: W("let's"), bring: W("bring"), check: W("check."),
  size: W("size,"), tall: W("tall"), man: W("man,"), one17: W("one"), meters1: W("meters."),
  arcade: W("arcade"), body: W("body"), thirteen: W("thirteen"), wide1: W("wide,"), dot1: W("dot"), two1: W("two"), pixels2: W("pixels.", 2),
  so2: W("so", 2), each1: W("each"), tw26: W("twenty-six"), cm: W("centimeters"), wide2: W("wide."), thats1: W("that's"), watermelon: W("watermelon."),
  on1: W("on"), level1: W("level"), eats1: W("eats"), tw25: W("twenty-five"), hour1: W("hour,"), with: W("with"), tiny: W("tiny"), stop: W("stop"), swallow: W("swallow"), dot2: W("dot."),
  thats2: W("that's", 2), seven2: W("seven", 2), second2: W("second.", 2),
  one3: W("one", 3), two240: W("two", 2), dots: W("dots."), twoT: W("two", 3), tons: W("tons"), heavier: W("heavier"), car: W("car."),
  but: W("but"), eating1: W("eating"), slows: W("slows"), while: W("while"), eats2: W("eats,"), ghosts1: W("ghosts"), faster1: W("faster."),
  later: W("later"), blinky: W("blinky,"), red: W("red"), faster2: W("faster", 2), endW: W("end"), level2: W("level:"), t37: W("thirty-seven"), hour2: W("hour."),
  pacs: W("pac-man's"), top: W("top"), t36: W("thirty-six."),
  big: W("big"), help: W("help"), less: W("less"), on2: W("on", 2), one4: W("one", 4), ghosts2: W("ghosts", 2), blue1: W("blue"), six: W("six"), seconds: W("seconds."),
  from: W("from"), nineteen: W("nineteen"), dont: W("don't"), blue2: W("blue", 2), all: W("all."),
  so3: W("so", 3), how: W("how"), survive: W("survive?"), ghosts3: W("ghosts", 3), middle: W("middle"), turn1: W("turn"), before: W("before"), turn3: W("turn."),
  pacCuts: W("pac-man", 5), cuts: W("cuts"), corner: W("corner"), wins: W("wins"), distance: W("distance"), time: W("time."),
  so4: W("so", 4), superpower: W("superpower"), its: W("it's"), corners: W("corners."),
  next: W("next,"), sonic: W("sonic"), world2: W("world.", 2), follow: W("follow,"), miss: W("miss"), end: VOICE_END,
};
export const CUT = 163 / 30;                                         // the rubric's hard cut: maze → our street (frame 163)

/** a cached integral of rate(t) from t0 at 240 Hz → lookup(t) (pure) */
function integral(rate, t0, t1 = END + 1) {
  const n = Math.ceil((t1 - t0) * 240) + 2, tab = new Float64Array(n); let s = 0;
  for (let i = 1; i < n; i++) { const a = t0 + (i - 1) / 240; s += rate(a + 1 / 480) / 240; tab[i] = s; }
  return (t) => { if (t <= t0) return 0; const u = (t - t0) * 240, i = Math.min(n - 2, Math.floor(u)), f = u - i; return tab[i] + (tab[i + 1] - tab[i]) * f; };
}

// ================================================================ 1) HIS maze
const NG = 14, GT = TILE * NG, GCY = 7.07;
const GM = { x0: 3.4, v: 3.0, dive: 4.95, port: PORTAL_COL + 0.5, gone: [5.12, CUT - 0.01] };
function gamePac(t) {
  if (t < GM.dive) return GM.x0 + GM.v * t;
  const x1 = GM.x0 + GM.v * GM.dive, u = clamp01((t - GM.dive) / (CUT - GM.dive)); return lerp(x1, GM.port, 1 - (1 - u) * (1 - u) * (1 + 0.4 * u));
}
const gameCam = (t) => { const p = gamePac(Math.min(t, GM.dive)); return p - 0.54 + 1.3 * eio((t - 3.85) / 0.85); };
const portalG = (t) => { const k = clamp01((t - E.bring) / 0.4); return k <= 0 ? 0 : 1 + 0.12 * Math.sin(Math.PI * Math.min(1, k * 1.2)) - Math.pow(1 - k, 3); };
let GM_LAST = null;
function drawGame(c, t) {
  const cam = { cx: gameCam(t), cy: GCY, N: NG }, X = (col) => 270 + (col - cam.cx) * GT, Y = (row) => 480 + (row - cam.cy) * GT, px = gamePac(t);
  const icons = win(t, E.seven1 - 0.05, E.second1 - 0.05, 0.12, 0.3);
  drawMaze(c, cam, t, { eaten: (cc, r) => r === ROW_MAIN && cc + 0.5 < px + 0.15, icon: (cc, r) => (icons > 0 && r === ROW_MAIN && cc + 0.5 > px + 0.6 ? clamp01(icons * (0.72 + 0.28 * Math.sin(t * 13 + cc * 1.7))) : 0) });
  // the portal at the corridor's end (drawn in sprite cells)
  const po = portalG(t); if (po > 0) portal(c, X(GM.port), Y(ROW_MAIN + 0.5), 0.62 * GT, 0.62 * GT, t, po, 1, NG / 2);
  // ghosts: Clyde bobs in the house, Inky patrols the lower corridor, Blinky and Pinky chase along the main corridor
  const gy = (row) => Y(row) + 7 * NG;
  drawGhost(c, "clyde", X(12.5), gy(3.5 + 0.22 * Math.sin(t * 3.4)) + 0, NG, t, { lookK: [["u", 0.5 + 0.5 * Math.sin(t * 1.7)], ["d", 0.5 - 0.5 * Math.sin(t * 1.7)]].map(([l, w]) => [l, Math.max(0.001, w)]), seed: 1 });
  drawGhost(c, "inky", X(14.5 - 1.6 * t), gy(10.5), NG, t, { look: "l", seed: 2 });
  for (const [name, gap, seed] of [["pinky", 4.1, 3], ["blinky", 2.05, 0]]) { const gxv = Math.min(gamePac(Math.min(t, GM.dive)) - gap + (t > GM.dive ? 1.6 * (t - GM.dive) : 0), GM.port - 1.6 - (name === "pinky" ? 2 : 0)); drawGhost(c, name, X(gxv), gy(ROW_MAIN + 0.5), NG, t, { look: "r", seed }); }
  // Pac-Man: chomps at game cadence (a frame every 2 video frames), dives into the portal and dissolves cell by cell
  const a = 1 - sm(t, GM.gone[0], GM.gone[1]), ph = t * 15, pp = (t - 1 / 30) * 15;
  if (a > 0) GM_LAST = drawPac(c, X(px), Y(ROW_MAIN + 0.5) + 6.5 * NG, NG, t, { dir: "R", ph, pp, chomp: 1 - sm(t, GM.dive, GM.dive + 0.1) }, { a });
  // the swirl closes over him as he goes in
  if (t > GM.dive) portal(c, X(GM.port), Y(ROW_MAIN + 0.5), 0.62 * GT, 0.62 * GT, t, po, sm(t, GM.dive + 0.1, CUT) * 0.55, NG / 2);
  return { kind: "game", N: NG, pac: { feet: Y(ROW_MAIN + 0.5) + 6.5 * NG, h: 13 * NG } };
}

// ================================================================ 2) OUR street: Pac-Man's path (world metres)
// the eating run 21.44 → 28.55 runs on a time warp: «real» time tau advances at rate r (1 = real speed, 0.18 = slow motion);
// in real time he moves 7.54 m/s and stops 1/60 s on every watermelon (6.7 melons / s, 25.3 km/h on average)
const rRun = (t) => t < E.eats1 - 0.44 ? 0 : t < 23.55 ? sm(t, E.eats1 - 0.44, E.eats1 - 0.03) : t < 25.85 ? lerp(1, 0.18, sm(t, 23.55, 23.85)) : t < 28.15 ? lerp(0.18, 1, sm(t, 25.85, 26.15)) : 1 - sm(t, 28.15, 28.55);
const RUN0 = E.eats1 - 0.44, tauOf = integral(rRun, RUN0), TPER = 1 / 6.7, TMOVE = TPER - 1 / 60;
const xReal = (tau) => { const n = Math.floor(tau / TPER), u = tau - n * TPER; return n + Math.min(1, u / TMOVE); };
const X0 = 0.4;
// the chase: an illustrative speed (not real time)
const VK = [[33.9, 0], [34.4, 1.6], [34.8, 1.6], [35.2, 0.3], [36.9, 0.3], [37.4, 2.0], [44.4, 2.0], [45.4, 2.7], [46.4, 2.7], [47.0, 0.9], [48.5, 0.9], [48.9, -1.6], [50.8, -1.6], [51.4, 0]];
const vChase = (t) => { if (t <= VK[0][0] || t >= VK[VK.length - 1][0]) return 0; let i = 0; while (t > VK[i + 1][0]) i++; return lerp(VK[i][1], VK[i + 1][1], sm(t, VK[i][0], VK[i + 1][0])); };
const chaseX = integral(vChase, 33.9);
export const XS = X0 + xReal(tauOf(28.6));                           // where he stops for the scales
export function pacX(t) { if (t < RUN0) return X0; if (t < 33.9) return X0 + xReal(tauOf(t)); return XS + chaseX(t); }
// mouth: a continuous step phase (steps per second = game cadence while he moves)
const phRate = (t) => t >= RUN0 && t < 28.6 ? 15 * rRun(t) : t >= 33.9 && t < 54 ? 12 * clamp01(Math.abs(vChase(t)) / 1.0) : 0;
const phInt = integral(phRate, CUT);
const pacPh = (t) => phInt(t) + 0.0;
// the gulps: in slow motion each 1/60 s stop is ~3 video frames — a squash frame dissolves in and out around it
const STOPS = []; { let prev = null; for (let f = Math.floor(RUN0 * 240); f < 28.6 * 240; f++) { const t = f / 240, tau = tauOf(t), u = tau - Math.floor(tau / TPER) * TPER, st = u >= TMOVE && rRun(t) < 0.5; if (st && !prev) STOPS.push([t, t]); if (st) STOPS[STOPS.length - 1][1] = t; prev = st; } }
const LAND = CUT + 0.62, BALL_T = 48.5;
function pacGulp(t) {
  let g = 0; for (const [a, b] of STOPS) if (t > a - 0.1 && t < b + 0.15) g = Math.max(g, Math.min(sm(t, a - 0.07, a), 1 - sm(t, b + 0.02, b + 0.1)));
  g = Math.max(g, Math.min(sm(t, LAND - 0.05, LAND), 1 - sm(t, LAND + 0.1, LAND + 0.2)));                        // landing squash
  g = Math.max(g, Math.min(sm(t, BALL_T - 0.04, BALL_T + 0.02), 1 - sm(t, BALL_T + 0.25, BALL_T + 0.35)));      // the big dot
  return g;
}
/** a watermelon at X is gone once his body has passed over it */
const eatenAt = (X) => X - 0.4;                                     // he swallows it when his centre reaches X − 0.4
const melonGone = (X, t) => pacX(t) >= eatenAt(X) && t > RUN0;
export const BALL_X = pacX(BALL_T) + 0.03;
const BALL_ROLL = [46.4, 47.0];
function ballPos(t) { const u = eout((t - BALL_ROLL[0]) / (BALL_ROLL[1] - BALL_ROLL[0])); return { X: lerp(BALL_X + 1.6, BALL_X, u), Z: lerp(0.15, ZM - 0.02, u), spin: -u * 4 }; }
const ENDX = pacX(54) + 22;                                         // the ending spot further down the street

// ---------------------------------------------------------------- the ghosts in our street
const AIRP = { t: 35.5, dx: -1.72, Y: 2.25, open: [35.25, 35.6], close: [37.0, 37.5] };
const GPORT = { X: pacX(AIRP.t) + AIRP.dx, Y: AIRP.Y, open: AIRP.open, close: AIRP.close };
const GHOSTS = [["blinky", 35.65, 0], ["pinky", 36.0, 1.0], ["inky", 36.35, 2.0], ["clyde", 36.7, 3.0]];
const gapB = (t) => lerp(0.4, 0.05, eio((t - 38.6) / 6.6));
const fleeV = (t) => -1.75 * (sm(t, BALL_T + 0.1, BALL_T + 0.4) - sm(t, 50.9, 51.4));
const flee = integral(fleeV, BALL_T);
const slotX = (i, t) => pacX(t) - 1.9 - gapB(t) - GHOSTS[i][2];
export function ghostAt(i, t) {
  const [, te] = GHOSTS[i];
  if (t >= BALL_T) return { X: slotX(i, BALL_T) + flee(t), Y: 0, a: 1 };
  if (t >= te + 0.55) return { X: slotX(i, t), Y: 0, a: 1 };
  const u = eout((t - te) / 0.55); return { X: lerp(GPORT.X, slotX(i, t), u), Y: lerp(GPORT.Y - 0.92, 0, u) + 0.35 * Math.sin(Math.PI * u), a: sm(t, te, te + 0.12) };
}
const blueK = (t) => sm(t, BALL_T + 0.04, BALL_T + 0.14) * (1 - sm(t, 51.15, 51.25));
const flashK = (t) => (t < 50.35 || t > 51.2 ? 0 : clamp01(0.5 + 1.6 * Math.sin((t - 50.35) * TAU * 2.6)));

// ---------------------------------------------------------------- the vendor (1.7 m), the dot that becomes a watermelon
const VEND = { look: { h: 1.70, skin: "skinC", top: "white", legs: "khaki", shorts: "khaki", shoe: "brown", hair: "dark", style: "short", apron: "green", beard: true }, X: 1.95 };
const DOT_FLY = [E.so2 + 0.05, E.tw26 - 0.1];                       // 16.29 → 17.30: the game dot flies to his hands
const HOLD = [DOT_FLY[1] - 0.2, 20.25];                             // he holds the watermelon
const PLACE = [19.75, 20.3];                                        // he puts it down at X = 2 and steps back
function vendorPos(t) { const k = eio((t - PLACE[0]) / (PLACE[1] - PLACE[0] + 0.25)); return { X: lerp(VEND.X, 2.55, k), Z: lerp(ZM, 0.95, k) }; }
// passers-by in the back lane (summer clothes), walking slowly; world X at t = X0 + v t
const WALK = [
  { X: 6.5, v: -0.85, Z: 0.85, look: { h: 1.68, skin: "skinA", top: "pink", skirt: "plum", legs: "skinA", shoe: "white", hair: "blond", style: "pony", bag: "camel" } },
  { X: -4, v: 0.9, Z: 0.9, look: { h: 1.80, skin: "skinD", top: "mustard", legs: "denim", shorts: "denim", shoe: "white", hair: "dark", style: "curly", cap: "teal" } },
  { X: 22, v: -0.8, Z: 0.85, look: { h: 1.74, skin: "skinB", top: "teal", legs: "khaki", shorts: "khaki", shoe: "brown", hair: "dark", style: "short", glasses: true, backpack: "red" } },
  { X: 30, v: 0.75, Z: 0.9, look: { h: 1.64, skin: "skinC", top: "white", skirt: "navy", legs: "skinC", shoe: "black", hair: "ginger", style: "long", bag: "mustard" } },
  { X: 48, v: -0.9, Z: 0.85, look: { h: 1.78, skin: "skinA", top: "green", legs: "grey", shorts: "grey", shoe: "white", hair: "brown", style: "short", cap: "red" } },
  { X: 60, v: 0.8, Z: 0.9, look: { h: 1.70, skin: "skinD", top: "plum", legs: "black", shoe: "white", hair: "dark", style: "bun", bag: "teal" } },
  { X: ENDX - 3, v: 0.35, Z: 0.85, look: { h: 1.76, skin: "skinB", top: "red", legs: "denim", shorts: "denim", shoe: "brown", hair: "dark", style: "short", glasses: true } },
];
// the scale shot: a pile of 240 watermelons on a floor scale, a small car on a second scale (in the market's loading bay)
const SC = { pile: { X0: XS + 0.9, X1: XS + 3.0, Z0: 0.15, Z1: 1.45 }, car: { X0: XS + 2.8, Z0: -2.45, Z1: -0.85, L: 3.2 } };
const BAY = (i) => { const [a, b] = stallX(i); return b > SC.car.X0 - 0.2 && a < SC.car.X0 + SC.car.L + 0.4; };
const BINS = (() => { const { X0, X1, Z0, Z1 } = SC.pile, w = (X1 - X0 - 0.1) / 2; return [[X0, 0.12], [X0 + w + 0.1, 0.12], [X0, 0.95], [X0 + w + 0.1, 0.95]].map(([x, y], i) => ({ X0: x, X1: x + w, Y0: y, Y1: y + 0.8, Z0, Z1, i })); })();
const PILE_T = [E.two240, E.dots + 0.25];
const pileCount = (t) => 240 * eio((t - PILE_T[0]) / (PILE_T[1] - PILE_T[0]));

// ---------------------------------------------------------------- cameras: integer sprite scale N per shot
const kOfN = (N) => (13 * N) / 1.7;
export function camOf(k) { const kM = kOfN(k.N); const C = makeCam({ x: k.cx, h: 3, d: ZM + 7, f: kM * 7, hy: k.feet - kM * 3 }); C.N = k.N; return C; }
const ST = (N, cx, feet = 610) => ({ kind: "street", N, cx, feet });
const runCx = (t) => Math.max(1.6, pacX(t) + 0.87);
const K_SCALE = ST(10, XS + 2.35, 600);
const OFFK = [[0, -0.245], [36.9, -0.245], [37.7, -0.57], [45.8, -0.57], [46.8, 0.41], [48.5, 0.41], [49.3, -0.65]];
const camOff = (t) => { let v = OFFK[0][1]; for (let i = 1; i < OFFK.length; i += 2) v = lerp(v, OFFK[i + 1]?.[1] ?? v, sm(t, OFFK[i][0], OFFK[i + 1]?.[0] ?? OFFK[i][0] + 1)); return v; };
const CXF = pacX(35.5) - 0.9;
const chaseCx = (t) => lerp(pacX(t) + camOff(t), CXF, sm(t, 34.8, 35.25) - sm(t, 36.9, 37.7));
// the crossroads from above: path geometry (metres): lane Z 5.8 → turn at X 2.0; Pac-Man cuts 1.2 m before the middle
const TP = { L: 5.8, T: 2.0, a: 1.2, X0: -9, gap: 2.2 };
const S1 = TP.T - TP.a - TP.X0, S2 = S1 + TP.a * Math.SQRT2, SB = TP.T - TP.X0;
const vTop = (t) => t < 56.1 ? 1.4 : t < 58.9 ? lerp(1.4, 0.5, sm(t, 56.1, 56.4)) : t < 62.3 ? lerp(0.5, 2.0, sm(t, 58.9, 59.2)) : lerp(2.0, 5.2, sm(t, 62.3, 62.9));
const topInt = integral(vTop, 53.8), TOP_OFF = S1 - topInt(E.pacCuts);
const sPac = (t) => TOP_OFF + topInt(t);
const vGhostTop = (t) => t < 62.3 ? vTop(t) : lerp(2.0, 2.6, sm(t, 62.3, 62.9));
const gInt = integral(vGhostTop, 53.8);
const sGhost = (i, t) => TOP_OFF - TP.gap - i * 1.95 + gInt(t);
function pacTop(s) { if (s <= S1) return [TP.X0 + s, TP.L]; if (s <= S2) { const u = (s - S1) / (S2 - S1); return [TP.T - TP.a + TP.a * u, TP.L - TP.a * u]; } return [TP.T, TP.L - TP.a - (s - S2)]; }
function ghostTop(s) { return s <= SB ? [TP.X0 + s, TP.L] : [TP.T, TP.L - (s - SB)]; }
const TOPS = 13 * 8 / 1.7;
const topCam = (t) => { const pz = pacTop(sPac(t))[1]; return { kind: "top", N: 8, cx: lerp(-1.0, 0.53, eio((t - 54.1) / 2.2)), cz: lerp(TP.L + 20 / TOPS, Math.min(TP.L + 20 / TOPS, pz + 60 / TOPS), sm(t, 61.9, 62.7)), s: TOPS }; };
const K_END = ST(18, ENDX + 1.0, 610), ENDP = ENDX + 1.6;
/** the shot at t: { A, B, k } — B dissolves in over A by k (a change of N is a whole-frame dither dissolve) */
export function shot(t) {
  const one = (A) => ({ A, B: null, k: 0 });
  if (t < E.on1 - 0.1) return one(ST(18, 0.85));
  if (t < RUN0) return one(ST(18, lerp(0.85, 1.6, eio((t - (E.on1 - 0.1)) / 0.75))));
  if (t < 28.45) return one(ST(18, runCx(t)));
  if (t < 33.75) return { A: ST(18, runCx(t)), B: K_SCALE, k: sm(t, 28.45, 28.75) };
  if (t < 54.0) return { A: K_SCALE, B: ST(16, chaseCx(t), 600), k: sm(t, 33.75, 34.05) };
  if (t < 65.45) return { A: ST(16, chaseCx(t), 600), B: topCam(t), k: sm(t, 54.0, 54.3) };
  return { A: topCam(t), B: K_END, k: sm(t, 65.45, 65.75) };
}
export function domKey(t) { const s = shot(t); return s.B && s.k >= 0.5 ? s.B : s.A; }

// ---------------------------------------------------------------- draw OUR street
let PAC_LAST = null;
export const lastPac = () => PAC_LAST;
function pacState(t) {
  const ph = pacPh(t), pp = pacPh(t - 1 / 30), moving = phRate(t) > 0.5;
  const lk = sm(t, BALL_T + 0.12, BALL_T + 0.22) * (t < 54.5 ? 1 : 0);
  return { dirK: [["R", 1 - lk + 0.0001], ["L", lk + 0.0001]], ph, pp, chomp: clamp01(Math.abs(phRate(t)) / 3), rest: "half", gulp: pacGulp(t), moving };
}
function drawStreet(c, t, key) {
  const C = camOf(key), N = key.N, kM = C.k(ZM), P = (X, Y = 0, Z = ZM) => C.P(X, Y, Z), ending = t > 65.3;
  drawMarket(c, C, t, { skip: BAY, stallOpts: (i) => (stallX(i)[0] < 1.0 && stallX(i)[1] > 1.0 ? { scale: { needle: 0.3 + 0.2 * Math.sin(t) } } : null) });
  // ---- things behind the lane: passers-by, the scales, the pile, the car (sorted by depth)
  const items = [];
  for (const w of WALK) { const X = w.X + w.v * t, [fx, fy] = P(X, 0, w.Z); if (fx < -80 || fx > c.w + 80) continue; items.push([w.Z, () => drawPerson(c, fx, fy, C.k(w.Z), t, w.look, { walk: 1, gait: Math.abs(X) / 1.25, dir: w.v > 0 ? 1 : -1 }, {})]); }
  { const vp = vendorPos(t), [fx, fy] = P(vp.X, 0, vp.Z); if (fx > -80 && fx < c.w + 80) items.push([vp.Z, () => vendor(c, C, t, vp)]); }
  items.push([SC.car.Z0, () => { floorScale(c, C, SC.car.X0 - 0.15, SC.car.X0 + SC.car.L + 0.15, SC.car.Z0 - 0.15, SC.car.Z1 + 0.15, { level: sm(t, E.heavier - 0.3, E.heavier + 0.3) * 0.75, live: win(t, E.heavier - 0.3, E.heavier + 0.4, 0.1, 0.2), t, postX: SC.car.X0 + SC.car.L + 0.05, postH: 1.45 }); car3(c, C, SC.car.X0, SC.car.Z0, SC.car.Z1, undefined, { L: SC.car.L, lift: 0.12 }); }]);
  items.push([SC.pile.Z0, () => { floorScale(c, C, SC.pile.X0 - 0.12, SC.pile.X1 + 0.12, SC.pile.Z0 - 0.12, SC.pile.Z1 + 0.12, { level: clamp01(pileCount(t) / 240), live: win(t, PILE_T[0], PILE_T[1] + 0.3, 0.1, 0.2), t, postH: 1.55 }); pile(c, C, t); }]);
  items.sort((a, b) => a[0] - b[0]); for (const [, f] of items) f();
  // ---- the lane: watermelons, the 1 m big dot, portals, ghosts, Pac-Man
  const xa = C.wX(-40, ZM), xb = C.wX(c.w + 40, ZM);
  for (let X = Math.max(2, Math.ceil(xa)); X <= xb; X++) {
    if (X === 2 && t < PLACE[1]) continue; if (Math.abs(X - BALL_X) < 1.0) continue; if (X >= SC.pile.X0 - 0.5 && X <= SC.car.X0 + 3.6 && false) continue;
    if (melonGone(X, t)) continue; if (ending && X < ENDP + 0.9) continue;
    const [mx, my] = P(X, 0, ZM + 0.05); contactShadow(c, mx, my, 0.17 * kM, 0.45); melon3(c, C, X, 0, ZM + 0.05, 0.26, 1, X * 1.7);
  }
  if (t > BALL_ROLL[0] - 0.05 && t < BALL_T + 0.1) { const ba = Math.min(sm(t, BALL_ROLL[0] - 0.05, BALL_ROLL[0] + 0.1), 1 - sm(t, BALL_T - 0.08, BALL_T + 0.02)), bp = ballPos(t); if (ba > 0) { const [bx, by] = P(bp.X, 0, bp.Z); contactShadow(c, bx, by, 0.5 * C.k(bp.Z), 0.5 * ba); bigBall(c, C, bp.X, bp.Z, t, ba); } }
  // arrival portal (closes after he lands), the ghosts' portal, the ending portal
  const portals = [];
  if (t < 7.3) portals.push([-0.75, 1.2, 0.72, 1.12, 1 - eio((t - 6.75) / 0.5)]);
  if (t > GPORT.open[0] && t < GPORT.close[1] && t < 54) portals.push([GPORT.X, GPORT.Y, 0.95, 0.95, Math.min(eout((t - GPORT.open[0]) / 0.35), 1 - eio((t - GPORT.close[0]) / 0.5))]);
  if (ending) { const o = eout((t - (E.next - 0.05)) / 0.45), blink = 1 - 0.18 * win(t, E.sonic - 0.25, E.sonic + 0.35, 0.08, 0.12) * (0.5 + 0.5 * Math.sin(t * 40)); portals.push([ENDP, 1.2, 0.72, 1.12, o * blink]); }
  for (const [X, Y, rx, ry, o] of portals) { if (o <= 0.01) continue; const [x, y] = P(X, Y, ZM - 0.01); portal(c, x, y, rx * kM, ry * kM, t, o); }
  if (ending) { const [x, y] = P(ENDP, 1.2, ZM - 0.01), a = sm(t, E.sonic - 0.15, E.sonic + 0.25) * sm(t, E.next + 0.2, E.next + 0.5);
    if (a > 0) { const n = Math.max(1, Math.round(1.0 * kM / 20)), cl = { x0: R(x - 0.62 * kM), y0: R(y - 0.98 * kM), x1: R(x + 0.62 * kM), y1: R(y + 0.98 * kM) }, v = Object.create(c);
      v.px = (xx, yy, col) => { const q = ((xx - x) / (0.6 * kM)) ** 2 + ((yy - y) / (0.95 * kM)) ** 2; if (q < 0.78 && xx >= cl.x0 && xx < cl.x1) c.px(xx, yy, col); };
      drawSpiky(v, x + Math.sin(t * 3) * 2, y + 10 * n, n, { a }); } }
  // ghosts (behind him in the lane), with the anger glow behind Blinky
  for (let i = 3; i >= 0; i--) { const [name, te] = GHOSTS[i]; if (t < te || t > 54.2) continue; const g = ghostAt(i, t), [gx, gy] = P(g.X, g.Y, ZM);
    if (gx < -8 * N || gx > c.w + 8 * N) continue;
    const angry = name === "blinky" ? win(t, E.blinky - 0.1, BALL_T - 0.05, 0.1, 0.1) : 0;
    if (angry > 0) glow(c, gx, gy - 7 * N, 13 * N, 11 * N, win(t, E.blinky - 0.2, BALL_T - 0.1, 0.5, 0.3) * 1.6, t, "#FF2A1A");
    if (g.Y < 0.05) spriteShadow(c, gx, P(g.X, 0, ZM)[1], N, 0.85 * g.a, 12);
    drawGhost(c, name, gx, gy, N, t, { look: "r", seed: i, blue: blueK(t), flash: flashK(t), angry }, { a: g.a }); }
  // Pac-Man
  pacStreet(c, C, t, key);
  // landing dust, speed streaks while he runs at full speed
  if (t > LAND - 0.02 && t < LAND + 0.8) { const [x, y] = P(X0, 0, ZM + 0.05); dust(c, x, y, kM, (t - LAND) / 0.8, 3); }
  return { kind: "street", C, kM, N };
}
/** angry steam puffs rising from Blinky's head (screen, in sprite cells of N/2) */
function steam(c, x, y, N, t, a) {
  const n = Math.max(2, Math.round(N / 2));
  for (let i = 0; i < 4; i++) { const ph = (t * 1.3 + i * 0.25) % 1, side = i % 2 ? 1 : -1, px = x + side * (3 + 2.5 * ph) * N, py = y - (1 + 5 * ph) * N, r = (1 + 1.5 * ph), k = a * Math.sin(Math.PI * ph);
    for (let j = -2; j <= 2; j++) for (let q = -2; q <= 2; q++) { if (q * q + j * j > r * r + 0.5) continue; if (k <= bayer(q + 2 + i, j + 2)) continue; const X = R(px) + q * n, Y = R(py) + j * n; for (let yy = 0; yy < n; yy++) for (let xx = 0; xx < n; xx++) c.px(X + xx, Y + yy, [255, 236, 230]); } }
}
function contactShadow(c, x, y, rx, k) { const ry = Math.max(1.5, rx * 0.28); for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) { const q = (i * i) / (rx * rx) + (j * j) / (ry * ry); if (q > 1) continue; const xx = R(x + i), yy = R(y + j); if (xx < 0 || yy < 0 || xx >= c.w || yy >= c.h) continue; const s = k * (1 - q * 0.6); if (s <= BY[(yy & 3) * 4 + (xx & 3)] * 0.9) continue; const p = (yy * c.w + xx) * 3; c.d[p] *= 0.6; c.d[p + 1] *= 0.58; c.d[p + 2] *= 0.66; } }
function pacStreet(c, C, t, key) {
  const N = key.N, st = pacState(t), ending = t > 65.3; let X = ending ? ENDX : pacX(t), Y = 0, a = 1;
  if (t < LAND) { const u = clamp01((t - CUT) / (LAND - CUT)); X = lerp(-0.75, X0, u); Y = lerp(0.55, 0, u) + 0.75 * Math.sin(Math.PI * u) * (1 - 0.3 * u); a = 0.3 + 0.7 * sm(t, CUT, CUT + 0.15); }
  const [fx, fy] = C.P(X, Y, ZM), [, gy] = C.P(X, 0, ZM);
  spriteShadow(c, fx, gy, N, 0.9 * a * clamp01(1 - Y / 1.5), 11);
  if (st.moving && phRate(t) > 10 && t < 28.3) streaks(c, fx - 7.5 * N, fy - 11 * N, fy - 2 * N, 26 * N / 10 * clamp01(rRun(t)) * 3, 0.7 * clamp01(rRun(t) * 1.5 - 0.5), t);
  const flying = t < LAND - 0.03;
  PAC_LAST = drawPac(c, fx, fy, N, t, flying ? { dir: "R", rest: "shut", chomp: 0 } : ending ? { ...st, dirK: null, dir: "R" } : st, { a });
  PAC_LAST.fy = fy; PAC_LAST.fx = fx;
}
function vendor(c, C, t, vp) {
  const look = VEND.look, s = C.k(vp.Z), [fx, fy] = C.P(vp.X, 0, vp.Z), d = vp.X > 2.2 ? -1 : -1;
  const recoil = Math.min(sm(t, LAND - 0.12, LAND + 0.05), 1 - sm(t, LAND + 0.6, LAND + 1.4));
  const holdK = Math.min(sm(t, HOLD[0] - 0.25, HOLD[0] + 0.05), 1 - sm(t, PLACE[0], PLACE[0] + 0.3)), lift = win(t, E.thats1 - 0.1, E.watermelon + 0.45, 0.2, 0.3);
  const walk = win(t, PLACE[0] + 0.15, PLACE[1] + 0.35, 0.12, 0.15), point = win(t, E.man - 0.3, E.meters1 + 0.4, 0.3, 0.4) * 0;
  const base = { dir: d, recoil, mouth: win(t, LAND, LAND + 1.2, 0.1, 0.3), walk, gait: vp.Z * 1.3, turn: t > PLACE[1] + 0.2 ? 0.6 : -0.2, point };
  const H = look.h, hy = 0.64 * H + 0.06 * lift, hands = [[d * 0.17 * H - 0.12, hy], [d * 0.17 * H + 0.12, hy]];
  let p = base; if (holdK > 0) { const k0 = skeleton(H, base, t), rest = k0.arms.map((a) => a.hd); p = { ...base, hands: rest.map((h, i) => [lerp(h[0], hands[i][0], holdK), lerp(h[1], hands[i][1], holdK)]) }; }
  drawPerson(c, fx, fy, s, t, look, p, {});
  // the watermelon in his hands (from the dot's arrival until he puts it down at X = 2 in the lane)
  if (t > HOLD[0] - 0.05 && t < PLACE[1] + 0.02) { const ma = sm(t, DOT_FLY[1] - 0.12, DOT_FLY[1] + 0.12), pk2 = eio((t - PLACE[0]) / (PLACE[1] - PLACE[0])), Xm = lerp(vp.X + d * 0.17 * H, 2.0, pk2), Ym = lerp(hy - 0.13, 0, pk2), Zm = lerp(vp.Z + 0.12, ZM + 0.05, pk2);
    melon3(c, C, Xm, Ym, Zm, 0.26, ma, 2.0 * 1.7); }
}
/** four wholesale bins (cardboard, 60 watermelons each) stacked 2 × 2 on the floor scale; they fill in order as the counter rolls */
function pile(c, C, t) {
  const n = pileCount(t), card = [[150, 104, 62], [178, 128, 80], [204, 156, 102], [226, 186, 132]].map((q) => q);
  for (const b of BINS) {
    const fill = clamp01((n - b.i * 60) / 60), a = 1;
    const drop = 0, Y0 = b.Y0 + drop, Y1 = b.Y1 + drop, g = a < 1 ? fade(c, a) : c;
    const shade = (v) => (x, y) => card[Math.max(0, Math.min(3, Math.round(v * 3 + (((x >> 1) + (y >> 2)) % 3 === 0 ? -0.4 : 0))))];
    // melons domed above the rim as the bin fills (back rows first)
    const dome = (k) => { if (fill <= 0) return; const nx = 4, nz = 4, dm = 0.27; for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) { const q = (iz * nx + ix) / (nx * nz); if (q > fill * 1.0001) continue; const X = b.X0 + 0.12 + (ix + 0.5 + (iz % 2) * 0.3) * ((b.X1 - b.X0 - 0.3) / nx), Z = b.Z0 + 0.1 + (iz + 0.5) * ((b.Z1 - b.Z0 - 0.2) / nz), u = (ix - 1.5) / 2, w2 = (iz - 1.5) / 2;
      melon3(g, C, X, Y1 - 0.2 + 0.12 * (1 - u * u - w2 * w2) * fill, Z, dm, 1, ix * 1.3 + iz + b.i); } };
    // back and side walls, melons, front wall with a darker band and a handle hole
    box3(g, C, b.X0, b.X1, Y0, Y1, b.Z0, b.Z0 + 0.04, { front: shade(0.45) });
    dome();
    box3(g, C, b.X0, b.X1, Y0, Y1, b.Z0, b.Z1, { front: (x, y) => { const Y = C.wY(y, b.Z1); if (Y > Y1 - 0.08) return card[3]; if (Math.abs(Y - (Y0 + Y1) / 2 - 0.15) < 0.05 && Math.abs(C.wX(x, b.Z1) - (b.X0 + b.X1) / 2) < 0.12) return [60, 40, 26]; return shade(Y < Y0 + 0.1 ? 0.25 : 0.62)(x, y); }, side: shade(0.35), top: null });
  }
}
// ---------------------------------------------------------------- the crossroads from above
function drawTop(c, t, key) {
  const v = { cx: key.cx, cz: key.cz, s: key.s }, N = key.N;
  drawCross(c, v, t, {});
  const P = (X, Z) => [vx(v, X), vy(v, Z)];
  // the ghosts' route to the middle of the turn (dotted), the middle mark, Pac-Man's cut (yellow)
  const da = win(t, E.ghosts3 - 0.1, 62.3, 0.3, 0.4);
  if (da > 0) { const b = ghostTop(sGhost(0, t)), mid = P(TP.T, TP.L), up = P(TP.T, TP.L - 3.2);
    route(c, [P(b[0] + 0.6, b[1]), mid, up], da, "#FDFEED", { dash: 7, gap: 5, w: 4, k: eout((t - E.ghosts3) / 1.1) });
    const ma = da * sm(t, E.middle - 0.1, E.middle + 0.2), pulse = 1 + 0.3 * win(t, E.middle, E.middle + 0.6, 0.1, 0.3); if (ma > 0) { const g = fade(c, ma); g.ring?.(R(mid[0]), R(mid[1]), R(9 * pulse), "#0B0812"); for (let a2 = 0; a2 < 40; a2++) { const an = (a2 / 40) * TAU; for (const rr of [8 * pulse, 9 * pulse]) g.px(R(mid[0] + Math.cos(an) * rr), R(mid[1] + Math.sin(an) * rr), "#FDFEED"); } g.rect(R(mid[0]) - 2, R(mid[1]) - 2, 5, 5, "#FF6A5A"); } }
  const ya = win(t, E.pacCuts - 0.05, 62.3, 0.2, 0.4);
  if (ya > 0) { const k = clamp01((sPac(t) - S1 + 0.05) / (S2 - S1 + 1.0)); route(c, [P(TP.T - TP.a, TP.L), P(TP.T, TP.L - TP.a), P(TP.T, TP.L - TP.a - 1.0)], ya, "#FFE21A", { w: 4, k }); }
  // ghosts (Blinky first) and Pac-Man; the sprites stand on their path points like in the game
  for (let i = 3; i >= 0; i--) { const s = sGhost(i, t), [X, Z] = ghostTop(s), [gx, gy] = P(X, Z); if (gy > c.h + 120 || gx < -80) continue;
    const turned = sm(s, SB - 0.05, SB + 0.1); spriteShadow(c, gx, gy + 7 * N, N, 0.8, 12);
    drawGhost(c, GHOSTS[i][0], gx, gy + 7 * N, N, t, { lookK: [["r", 1 - turned + 0.0001], ["u", turned + 0.0001]], seed: i }); }
  const s = sPac(t), [X, Z] = pacTop(s), [px, py] = P(X, Z), turnK = sm(s, S1 - 0.02, S1 + 0.12), ph = pacPh2(t), pp = pacPh2(t - 1 / 30);
  spriteShadow(c, px, py + 6.5 * N, N, 0.8, 11);
  PAC_LAST = drawPac(c, px, py + 6.5 * N, N, t, { dirK: [["R", 1 - turnK + 0.0001], ["U", turnK + 0.0001]], ph, pp, chomp: 1 }); PAC_LAST.fy = py + 6.5 * N; PAC_LAST.fx = px;
  // the gap bracket: from Blinky to Pac-Man along the cross street, once both have turned
  const gk = win(t, E.distance - 0.6, 62.3, 0.3, 0.4);
  if (gk > 0) { const b = ghostTop(sGhost(0, t)), xB = vx(v, TP.T) - 9 * N; const yP = vy(v, Z), yB = vy(v, b[1]);
    bracketV(c, xB, Math.min(yP, yB), Math.max(yP, yB), gk, "#FFE21A", 8, 1); }
  return { kind: "top", v, N };
}
const phTopInt = integral((t) => (t > 53.9 && t < 66 ? 12 : 0), 53.8);
const pacPh2 = (t) => phTopInt(t);

// ================================================================ HUD (screen space)
const WIN1 = { x0: 52, y0: 158, x1: 428, y1: 352 };
const WIN19 = { x0: 52, y0: 168, x1: 428, y1: 368 };
function melonPill(c, cx, y, a) {
  if (a <= 0) return; const sc = 3, t1 = "≈7", t2 = "/s", w1 = c.measure(MAIN, t1, { scale: sc }), w2 = c.measure(MAIN, lc(t2), { scale: sc }), iw = 8 * 3, w = w1 + iw + w2 + 18 + 12, x = R(cx - w / 2);
  const p = plate(c, x, R(y), w, 7 * sc + 10, a, "#7FE3A0"); const g = fade(c, a); g.text(MAIN, t1, x + 9, R(y) + 5, HC.IV, { scale: sc }); melonIcon(g, x + 9 + w1 + 6 + iw / 2, R(y) + 5 + 10, 3, a); g.text(MAIN, lc(t2), x + 9 + w1 + iw + 12, R(y) + 5, HC.IV, { scale: sc }); return p;
}
/** a rolling decimal counter «6.7 / s» (digits roll like an odometer; the decimal digit rolls smoothly) */
function decCounter(c, v, cx, y, a, suffix) {
  if (a <= 0) return; const sc = 3, tenths = v * 10, w = odoW(c, 67, { scale: sc }) + c.measure(MAIN, ".", { scale: sc }) + sc + c.measure(MAIN, lc(suffix), { scale: sc }) + 18 + 10, x = R(cx - w / 2), h = 7 * sc + 10;
  plate(c, x, R(y), w, h, a, HC.Y); const g = fade(c, a), ones = Math.floor(tenths / 10), dec = tenths - ones * 10;
  let X = x + 9; const cw = c.measure(MAIN, "0", { scale: sc }) + sc;
  odo(c, ones + clamp01((dec - 9) / 1) * 0, X, R(y) + 5, a, { scale: sc, digits: 1, final: 6 }); X += cw;
  g.text(MAIN, ".", X, R(y) + 5, HC.IV, { scale: sc }); X += c.measure(MAIN, ".", { scale: sc }) + sc;
  odo(c, dec, X, R(y) + 5, a, { scale: sc, digits: 1, final: 9, smoothOnes: false }); X += cw + 6;
  g.text(MAIN, lc(suffix), X, R(y) + 5, HC.IV, { scale: sc });
}
function storyCore(c, V, t) {
  if (V.kind === "street") {
    const C = V.C, kM = V.kM, N = V.N, P = (X, Y = 0, Z = ZM) => C.P(X, Y, Z);
    // ---- 1.7 m: a bracket from the pavement to 1.7 m between Pac-Man and the vendor
    { const a = win(t, E.one17 - 0.25, E.arcade - 0.2, 0.3, 0.4); if (a > 0) { const [x, y0] = P(1.17, 0), [, y1] = P(1.17, 1.7), grow = eout((t - E.one17 + 0.25) / 0.45); bracketV(c, x, y0, lerp(y0, y1, grow), a, HC.Y, 9, -1); bracketV(c, x, y0, lerp(y0, y1, grow), a, HC.Y, 9, 1); pill(c, "1.7 m", x, R(y1) - 44, a * sm(t, E.one17, E.one17 + 0.3), { scale: 3 }); } }
    // ---- the game window: the sprite, a 13-cell ruler across his body, a 2-cell dot
    { const a = win(t, E.arcade - 0.15, DOT_FLY[0] + 0.9, 0.35, 0.45); if (a > 0) gameFrame(c, WIN1, a, (g) => win13(g, t)); }
    // ---- the dot flies out of the window into the vendor's hands, growing; then «26 cm» over the watermelon
    if (t > DOT_FLY[0] && t < DOT_FLY[1] + 0.15) { const u = eio((t - DOT_FLY[0]) / (DOT_FLY[1] - DOT_FLY[0])), vp = vendorPos(t), [hx, hy] = P(vp.X - 0.17 * VEND.look.h, 0.64 * VEND.look.h, vp.Z + 0.12), x0 = 330, y0 = 288, s0 = 16, s1 = 0.26 * C.k(vp.Z + 0.12);
      const x = lerp(x0, hx, u), y = lerp(y0, hy, u) - 90 * Math.sin(Math.PI * u), s = lerp(s0, s1, u), a = 1 - sm(t, DOT_FLY[1] - 0.1, DOT_FLY[1] + 0.12); fade(c, a).rect(R(x - s / 2), R(y - s / 2), R(s), R(s), "#FFC2A8"); }
    { const a = win(t, E.tw26 - 0.1, E.watermelon + 0.6, 0.3, 0.35); if (a > 0) { const vp = vendorPos(t), H = VEND.look.h, lift = win(t, E.thats1 - 0.1, E.watermelon + 0.45, 0.2, 0.3), Y = 0.64 * H + 0.06 * lift, Xm = vp.X - 0.17 * H, [xl, ym] = P(Xm - 0.15, Y + 0.13 + 0.02, vp.Z + 0.12), [xr] = P(Xm + 0.15, Y, vp.Z + 0.12);
      bracketH(c, xl, xr, ym - 6, a, HC.Y, 7, 1); pill(c, "26 cm", R((xl + xr) / 2), R(ym) - 50, a * sm(t, E.tw26, E.tw26 + 0.3), { scale: 3 }); } }
    // ---- 1 m between two watermelons of the line
    { const a = win(t, E.level1 - 0.05, E.tw25 - 0.2, 0.3, 0.35); if (a > 0) { const [x2, y2] = P(2, 0.36, ZM + 0.05), [x3] = P(3, 0.36, ZM + 0.05); bracketH(c, x2, x3, y2, a, HC.IV, 8, 1); pill(c, "1 m", R((x2 + x3) / 2), R(y2) - 46, a, { scale: 3 }); } }
    // ---- 25 km/h: the gauge while he runs
    { const a = win(t, E.tw25 - 0.2, E.thats2 - 0.2, 0.3, 0.35); if (a > 0) { const v = 25.3 * eout((t - E.tw25 + 0.1) / 0.7) * clamp01(rRun(t) > 0.5 ? 1 : 1); gauge(c, 382, 236, 48, [{ v, col: "#FFE21A" }], a); pill(c, "25 km/h", 382, 262, a * sm(t, E.tw25, E.tw25 + 0.3), { scale: 3 }); } }
    // ---- 6.7 / s: a one-second timer ring and the rolling counter
    { const a = win(t, E.thats2 - 0.05, E.one3 - 0.15, 0.3, 0.35); if (a > 0) { const t0 = E.seven2 - 0.25, fill = clamp01((t - t0) / 1.0); ring(c, 108, 236, 34, fill, a); label(c, "1 s", 108, 229, a, HC.IV, 2); decCounter(c, 6.7 * eio(fill), 318, 222, a, " / s"); melonIcon(fade(c, a), 318 - 82, 222 - 18, 3, a); } }
    // ---- 240 → ≈2 t, car ≈1.5 t (chips above the two scales)
    { const a = win(t, E.two240 - 0.15, E.but - 0.1, 0.3, 0.35); if (a > 0) { const [px2, py2] = P((SC.pile.X0 + SC.pile.X1) / 2, 1.9, (SC.pile.Z0 + SC.pile.Z1) / 2); const n = 240 * eio((t - PILE_T[0]) / (PILE_T[1] - PILE_T[0])), w = odoW(c, 240, { scale: 3 }) + 18, x = R(px2 - w / 2), y = 236;
      plate(c, x, y, w, 31, a, HC.Y); odo(c, n, x + 9, y + 5, a, { scale: 3, digits: 3, final: 240 });
      const ta = a * sm(t, E.twoT - 0.1, E.twoT + 0.2); if (ta > 0) pill(c, "≈2 t", R(px2), y + 38, ta, { scale: 3, edge: "#7FE3A0" }); } }
    { const a = win(t, E.heavier - 0.2, E.but - 0.1, 0.3, 0.35); if (a > 0) { const [cx2] = P(SC.car.X0 + SC.car.L / 2, 2.0, SC.car.Z1); pill(c, "CAR ≈1.5 t", R(Math.max(150, Math.min(345, cx2))), 330, a, { scale: 3, edge: "#7FE3F0" }); } }
    // ---- ghosts vs Pac-Man while he eats: chips + one gauge with two needles; then BLINKY 37 vs PAC-MAN 36
    { const a = win(t, E.ghosts1 - 0.2, 46.3, 0.3, 0.4); if (a > 0) {
      const k2 = sm(t, E.t37 - 0.2, E.t37 + 0.25), k3 = sm(t, E.t36 - 0.2, E.t36 + 0.25), vRed = lerp(26.7 * eout((t - E.ghosts1 + 0.2) / 0.6), 37.4, eio((t - E.t37 + 0.1) / 0.7)), vY = lerp(25.3 * eout((t - E.ghosts1 + 0.2) / 0.6), 35.7, eio((t - E.t36 + 0.1) / 0.7));
      gauge(c, 270, 318, 50, [{ v: vY, col: "#FFE21A" }, { v: vRed, col: "#FF3A2A" }], a, { max: 40, red: 36 });
      pill(c, "GHOSTS 27 km/h", 270, 160, a * (1 - k2), { scale: 3, edge: "#FF6A5A" }); pill(c, "BLINKY 37", 270, 160, a * k2, { scale: 3, edge: "#FF3A2A", col: "#FF8A80" });
      pill(c, "PAC-MAN (EATING) 25", 270, 200, a * (1 - k3) * sm(t, E.ghosts1, E.ghosts1 + 0.3), { scale: 3 }); pill(c, "PAC-MAN 36", 270, 200, a * k3, { scale: 3 }); } }
    // ---- 6 s: the ghosts stay blue (a countdown ring)
    { const a = win(t, E.one4 - 0.15, E.from - 0.05, 0.25, 0.35); if (a > 0) { const fill = 1 - clamp01((t - (BALL_T + 0.1)) / (51.2 - BALL_T - 0.1)); ring(c, 270, 236, 40, fill, a, "#4A6AFF"); label(c, "6 s", 270, 227, a * sm(t, E.six - 0.1, E.six + 0.2), HC.IV, 3); } }
    // ---- LEVEL 19 · 0 s: a game window — he eats a big dot and the ghosts stay coloured
    { const a = win(t, E.from - 0.15, E.all + 0.35, 0.3, 0.35); if (a > 0) { gameFrame(c, WIN19, a, (g) => win19(g, t)); pill(c, "LEVEL 19 · 0 s", 240, WIN19.y0 + 10, a * sm(t, E.nineteen - 0.1, E.nineteen + 0.2), { scale: 3, edge: "#FF6A5A" }); } }
    // ---- NEXT: SONIC
    { const a = sm(t, E.sonic - 0.1, E.sonic + 0.25); if (a > 0 && t > 65.3) pill(c, "NEXT: SONIC", 196, 322, a, { scale: 3, edge: "#4A8AFF" }); }
  } else if (V.kind === "top") {
    const v = V.v;
    { const a = win(t, E.distance - 0.3, 62.3, 0.3, 0.4); if (a > 0) { const [, Z] = pacTop(sPac(t)), b = ghostTop(sGhost(0, t)); pill(c, "+ DISTANCE", R(vx(v, TP.T) - 9 * 8 - 98), R((vy(v, Z) + vy(v, b[1])) / 2) - 15, a, { scale: 3, edge: HC.Y }); } }
    { const a = sm(t, E.corners - 0.15, E.corners + 0.2) * (1 - sm(t, 65.5, 65.75)); if (a > 0) pill(c, "SUPERPOWER: CORNERS", 270, 250, a, { scale: 3, edge: HC.Y, col: HC.Y }); }
  } else if (V.kind === "game") {
    melonPill(c, 270, 300, win(t, E.seven1 - 0.05, E.lets - 0.1, 0.3, 0.35));
  }
}
/** game window content 1: the sprite at N = 8 with a 13-cell ruler under him, the 2-cell dot with its own ruler */
function win13(g, t) {
  const N = 8, cx = 170, by = 322, a13 = sm(t, E.thirteen - 0.25, E.thirteen + 0.25), a2 = sm(t, E.two1 - 0.25, E.two1 + 0.2);
  // a strip of maze wall above and below (our blue double line, in cells)
  for (const yy of [WIN1.y0 + 8, WIN1.y1 - 12]) for (let x = WIN1.x0; x < WIN1.x1; x++) { g.px(x, yy, [52, 72, 255]); g.px(x, yy + 1, [52, 72, 255]); g.px(x, yy + 4, [52, 72, 255]); g.px(x, yy + 5, [52, 72, 255]); }
  const r = drawPac(g, cx, by - 6, N, t, { dir: "R", ph: t * 4, pp: (t - 1 / 30) * 4, chomp: 1 - sm(t, E.thirteen - 0.4, E.thirteen - 0.2) + sm(t, E.dot1, E.dot1 + 0.2), rest: "shut" });
  // ruler: 13 cells, each tick lights up in turn
  const x0 = r.x0 + N, y = by + 2;
  for (let i = 0; i < 13; i++) { const on = clamp01(a13 * 13 - i); if (on <= 0) continue; const col = i % 2 ? [255, 226, 26] : [255, 250, 200]; for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < N - 1; xx++) if (on > bayer(xx, yy)) g.px(x0 + i * N + xx, y + yy, col); }
  if (a13 > 0.02) { pill(g, "13 px", cx, WIN1.y0 + 22, a13, { scale: 3 }); }
  // the dot: 2 × 2 cells, its own 2-cell ruler
  const dx = 340, dy = 282; for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) for (let yy = 0; yy < N; yy++) for (let xx = 0; xx < N; xx++) g.px(dx + i * N + xx, dy + j * N + yy, [255, 194, 168]);
  if (a2 > 0) { for (let i = 0; i < 2; i++) for (let yy = 0; yy < 5; yy++) for (let xx = 0; xx < N - 1; xx++) if (a2 > bayer(xx, yy)) g.px(dx + i * N + xx, y + yy, i ? [255, 226, 26] : [255, 250, 200]); pill(g, "2 px", dx + 8, WIN1.y0 + 22, a2, { scale: 3 }); }
}
/** game window content 2: level 19 — a mini maze at N = 4, he eats a big dot, the ghosts stay coloured */
function win19(g, t) {
  const N = 4, cam = { cx: 6.4, cy: 7.5 + (WIN19.y0 + WIN19.y1 - 960) / 2 / (TILE * N) * -1, N }, X = (col) => 270 + (col - cam.cx) * TILE * N, Y = (row) => 480 + (row - cam.cy) * TILE * N;
  const pac = 3.4 + 2.2 * clamp01((t - E.from - 0.2) / 1.8), eatT = E.from + 0.2 + (5.5 - 3.4) / 2.2 * 1.8 * 0 + 1.0;
  const clip = Object.create(g); clip.px = (x, y, col) => { if (x >= WIN19.x0 && x < WIN19.x1 && y >= WIN19.y0 && y < WIN19.y1) g.px(x, y, col); };
  drawMaze(clip, cam, t, { eaten: (cc, r) => r === 7 && cc + 0.5 < pac + 0.15 || (r === 10 && cc === 5 && false) });
  // a big dot in the main corridor at col 6 (flashing), eaten when he reaches it
  if (pac < 6.2) { const fl = 0.5 + 0.5 * Math.cos(t * TAU * 1.9), a = fl > 0.62 ? 1 : fl < 0.38 ? 0 : (fl - 0.38) / 0.24; const rows = ["..####..", ".######.", "########", "########", "########", "########", ".######.", "..####.."]; rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#" && a > bayer(i, j)) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) clip.px(R(X(6)) + i * N + x, R(Y(7)) + j * N + y, [255, 194, 168]); })); }
  for (const [name, col, seed] of [["blinky", pac - 2.4, 0], ["pinky", pac - 4.2, 1]]) drawGhost(clip, name, X(col), Y(7.5) + 7 * N, N, t, { look: "r", seed });
  drawGhost(clip, "inky", X(10.5 - 0.8 * (t - 51)), Y(10.5) + 7 * N, N, t, { look: "l", seed: 2 });
  drawPac(clip, X(pac), Y(7.5) + 6.5 * N, N, t, { dir: "R", ph: t * 15, pp: (t - 1 / 30) * 15, chomp: 1 });
  void eatT;
}

// ================================================================ frame entry points
let TMPW = null;
function renderKey(c, t, key) { const V = key.kind === "top" ? drawTop(c, t, key) : drawStreet(c, t, key); storyCore(c, V, t); return V; }
export function drawWorld(c, t) {
  if (t < CUT - 1e-6) { const V = drawGame(c, t); storyCore(c, V, t); return V; }
  const S = shot(t);
  if (!S.B || S.k <= 0) return renderKey(c, t, S.A);
  if (S.k >= 1) return renderKey(c, t, S.B);
  if (!TMPW || TMPW.w !== c.w) TMPW = new Canvas(c.w, c.h); TMPW.poly = c.poly; TMPW.d.fill(0);
  const VA = renderKey(TMPW, t, S.A), pA = PAC_LAST; const VB = renderKey(c, t, S.B), pB = PAC_LAST;
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (bayer(x, y) >= S.k) { const i = (y * c.w + x) * 3; c.d[i] = TMPW.d[i]; c.d[i + 1] = TMPW.d[i + 1]; c.d[i + 2] = TMPW.d[i + 2]; }
  PAC_LAST = S.k >= 0.5 ? pB : pA; const V = S.k >= 0.5 ? VB : VA; V.dissolve = S.k; return V;
}
export const lastGamePac = () => GM_LAST;
export const SOUND = { E, CUT, GM, LAND, STOPS, BALL_T, BALL_X, GPORT, GHOSTS, PILE_T, PLACE, DOT_FLY, TP, S1, S2, SB, sPac, sGhost, pacX, melonGone, RUN0, rRun, tauOf, TPER, TMOVE, XS, ENDX, pileCount, vChase };
