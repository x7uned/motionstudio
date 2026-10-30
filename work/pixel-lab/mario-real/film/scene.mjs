// «How high can Mario jump in our world» (IN OUR WORLD #2) · Kagenami pixel film. Two worlds:
//   1. frame 0 → CUT: HIS game world (assets/game-level.mjs, side-scroller in our drawing): Mario large, mid-jump over a pipe,
//      runs, bumps a «?» block (coin), a portal opens on «bring», he dives in;
//   2. HARD CUT (the rubric's signature, the only allowed cut) → OUR evening street (assets/city.mjs) through one pinhole camera
//      (lib/cam.mjs): he flies out of the same portal, a passer-by drops his apples; 1.55 m; two blocks out of the game window;
//      five-block game jump (apex hang) + the tape 3.9 m + the 2.45 m bar; 52 km/h take-off freeze vs a sprinter 44.7 km/h; the
//      game window: why he stops (heavy pull, EARTH 1× / GAME ≈10×); the same jump in our world: the camera RIDES UP the
//      facade with him (grandma drops her watering can, a boy films), one wide shot above the roof (10.8 m, pigeons), 3 s in
//      the air (slow motion, real flight time on the ring), the fall at 52 km/h, the landing (dust, cracked slab), ≈40 km/h in
//      his game, the knees glow (SUPERPOWER), NEXT: PAC-MAN, the follow card (cta.mjs).
// Every beat is anchored to a measured word (timeline.mjs W()). All art is this film's own; no catalog art.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { W, END, VOICE_END } from "./timeline.mjs";
import { drive } from "./lib/drive.mjs";
import { makeCam, R, lerp, sm, eio, eout, ein, clamp01, rnd, win, contact, TAU, BY } from "./lib/cam.mjs";
import { drawCity, planter, CITY, winRect } from "./assets/city.mjs";
import { drawLevel, LEVEL, gx, gyy, clipView, coin, drawBrick } from "./assets/game-level.mjs";
import mario, { drawMario } from "./assets/mario.mjs";
import { drawPerson, LOOKS } from "./assets/passerby.mjs";
import { portal, cube, BS, tape, jumpBar, dial, arrow, bracket, gameWindow, dust, crack, pigeon, wateringCan, apple, chomper, glow } from "./assets/props.mjs";
import { MAIN, C, plate, label, pill } from "./lib/hud.mjs";
import { gate } from "./lib/layout.mjs";
/** a person drawn facing right with weight dk and left with 1 − dk, crossfaded through complementary dither gates */
function person2(c, fx, fy, s, t, look, p, o, dk) {
  if (dk >= 1) return drawPerson(c, fx, fy, s, t, look, { ...p, dir: 1 }, o); if (dk <= 0) return drawPerson(c, fx, fy, s, t, look, { ...p, dir: -1 }, o);
  drawPerson(gate(c, dk, 1), fx, fy, s, t, look, { ...p, dir: -1 }, o); return drawPerson(gate(c, 0, dk), fx, fy, s, t, look, { ...p, dir: 1 }, o);
}

export { sm, eio };

// ---------------------------------------------------------------- words (single take, Scribe timings)
export const E = {
  world1: W("world,"), house: W("house."), lets: W("let's"), bring: W("bring"), check: W("check."), checkEnd: W("check.", 1, "end"),
  mario2: W("mario", 2), one155: W("one", 2), tall1: W("tall."), inThe: W("in", 2), superW: W("super"), bros: W("brothers,"), big: W("big"), two: W("two"), blocks1: W("blocks"), tall2: W("tall.", 2),
  so1: W("so"), block1: W("block"), s78: W("seventy-eight"), cm2: W("centimeters", 2),
  with: W("with"), running: W("running"), start: W("start,"), rise: W("rise"), five: W("five"), blocks2: W("blocks", 2),
  thats1: W("that's"), four1: W("four"), meters1: W("meters."), highJ: W("high"), record: W("record"), two45: W("two", 2), meters2: W("meters.", 2),
  toJump: W("to"), leaves: W("leaves"), f52a: W("fifty-two"), hour1: W("hour."), straight: W("straight"), up1: W("up."),
  faster: W("faster"), usain: W("usain"), bolt: W("bolt"), runW: W("run."), why: W("why"), stop: W("stop"), because: W("because"), pulls1: W("pulls"), harder1: W("harder."),
  when: W("when"), falls: W("falls,"), game1: W("game"), pulls2: W("pulls", 2), ten: W("ten"), times: W("times"), earth: W("earth"),
  our2: W("our", 2), softer: W("softer."), same: W("same"), and1: W("and", 2), flies: W("flies"), eleven: W("eleven"), up2: W("up.", 2),
  past1: W("past"), second: W("second"), third: W("third,"), higher2: W("higher", 2), roof1: W("roof."), stays: W("stays"), three: W("three"), seconds: W("seconds."),
  then: W("then"), comes: W("comes"), f52b: W("fifty-two", 2), hour2: W("hour", 2), falling: W("falling"), roof2: W("roof.", 2),
  inHis: W("in", 4), game2: W("game", 2), lands: W("lands"), forty: W("forty"), every: W("every"), jump4: W("jump", 5),
  so3: W("so", 3), superpower: W("superpower"), its: W("it's"), knees: W("knees."), next: W("next,"), pacman: W("pac-man"), follow: W("follow,"), miss: W("miss"), end: VOICE_END,
};
export const CUT = 179 / 30;                                         // the rubric's hard cut: game world → our street (frame 179)

// ---------------------------------------------------------------- 1) HIS game world
const GB = 170;                                                      // px per block: big Mario = 2 blocks = 340 px (35 % of the frame)
const LV = { ...LEVEL, bricks: [[6.04, 3.2], [8.04, 3.2], [12.6, 3.4], [14.6, 3.4]], qs: [[7.04, 3.2, "q1"], [13.6, 3.4, "q2"]] };
const G = { vx: 2.8, land0: Math.sqrt(2.1 / 10.4) - 0.05, jump: 1.45, tb: 1.45 + (9 - Math.sqrt(81 - 48 * 1.2)) / 24, portalX: 19.6, portalY: 1.4, dive: 5.5, suck: [5.7, CUT] };
G.land1 = G.tb + Math.sqrt((2 * 1.2) / 24);
export const GAMEEV = G;
function gameMario(t) {
  let x = 3.0 + G.vx * Math.min(t, G.dive), y = 0;
  if (t < G.land0) y = Math.max(0, 2.1 - 10.4 * (t + 0.05) ** 2);
  else if (t >= G.jump && t < G.tb) { const u = t - G.jump; y = 9 * u - 12 * u * u; }
  else if (t >= G.tb && t < G.land1) { const u = t - G.tb; y = Math.max(0, 1.2 - 12 * u * u); }
  let sc = 1, a = 1;
  if (t >= G.dive) { const u = clamp01((t - G.dive) / (G.suck[1] - G.dive)), x0 = 3.0 + G.vx * G.dive; x = lerp(x0, G.portalX - 0.25, u); y = lerp(0, G.portalY - 0.75, u) + 0.55 * Math.sin(Math.PI * u);
    const k = clamp01((t - G.suck[0]) / (G.suck[1] - G.suck[0])); sc = 1 - 0.78 * eio(k); a = 1 - 0.7 * k; x = lerp(x, G.portalX - 0.5, eio(k) * 0.6); }
  return { x, y, sc, a };
}
export const GKEYS = [[-1, "fall"], [G.land0 - 0.04, "land"], [G.land0 + 0.07, "run"], [G.jump - 0.09, "crouch"], [G.jump, "jump-up"], [G.tb + 0.06, "fall"], [G.land1 - 0.03, "land"], [G.land1 + 0.08, "run"], [G.dive - 0.1, "crouch"], [G.dive, "dive"]];
const portalOpenG = (t) => { const k = clamp01((t - E.bring) / 0.45); return k <= 0 ? 0 : 1 + 0.12 * Math.sin(Math.PI * Math.min(1, k * 1.2)) - Math.pow(1 - k, 3); };
function gameCam(t) {
  const m = gameMario(t), follow = m.x + 0.35, onPortal = G.portalX - 0.85, x = lerp(follow, onPortal, eio((t - 4.9) / 0.8));
  const yy = t < G.dive ? m.y : 0;
  return { x, gy: 620 + (t < G.land0 + 0.1 ? 150 : 260) * yy, B: GB };
}
function drawGame(c, t) {
  const cam = gameCam(t), m = gameMario(t);
  const coins = [], bumpK = clamp01((t - G.tb) / 0.2), usedK = sm(t, G.tb + 0.08, G.tb + 0.3);
  if (t > G.tb && t < G.tb + 0.75) { const u = (t - G.tb) / 0.6; coins.push({ x: 7.54, y: 4.7 + 1.1 * (1 - (1 - Math.min(1, u)) ** 2) - (u > 1 ? (u - 1) * 2 : 0), spin: u * 2.4, a: 1 - sm(u, 0.9, 1.22) }); }
  drawLevel(c, cam, t, { level: LV, bump: { q1: t > G.tb ? bumpK : 0 }, usedK: { q1: usedK }, coins });
  // coin sparkles when it vanishes
  if (t > G.tb + 0.5 && t < G.tb + 0.95) { const u = (t - G.tb - 0.5) / 0.45; for (let i = 0; i < 8; i++) { const an = (i / 8) * TAU, r = 20 + 45 * eout(u), x = R(gx(cam, 7.54) + Math.cos(an) * r), y = R(gyy(cam, 5.6) + Math.sin(an) * r); fade(c, 1 - u).rect(x - 2, y - 2, 4, 4, i % 2 ? "#FFF09A" : "#FFFFFF"); } }
  // the portal on the ground ahead
  const po = portalOpenG(t); if (po > 0) portal(c, gx(cam, G.portalX), gyy(cam, G.portalY), 0.75 * GB, 1.4 * GB, t, po);
  // Mario
  const s = drive(mario, GKEYS, t), v = { ...s.v, leanX: t > G.suck[0] ? 2.5 * eio((t - G.suck[0]) / 0.25) : 0 };
  const cxp = gx(cam, G.portalX), cyp = gyy(cam, G.portalY);
  let fx = gx(cam, m.x), fy = gyy(cam, m.y);
  if (m.sc < 1) { fx = lerp(cxp, fx, m.sc); fy = lerp(cyp + 0.6 * GB * m.sc, fy, m.sc); }
  drawMario(c, fx, fy, (GB / 0.775) * m.sc, t, v, { dir: 1, gait: m.x / 1.6, flat: true, a: m.a });
  // portal swirl over his last part (he is sucked in)
  if (t > G.suck[0]) portal(c, cxp, cyp, 0.75 * GB, 1.4 * GB, t, po, sm(t, G.suck[0], G.suck[1]) * 0.6);
  return { kind: "game", cam, mario: { feet: fy, top: fy - 2 * GB * m.sc, h: 2 * GB * m.sc } };
}

// ---------------------------------------------------------------- 2) OUR street: Mario's path
const ZM = 1.4, XM = 0.62;
export const T = {
  land: 6.42, backA: [E.cm2 + 0.35, E.with - 0.1], runA: [E.with - 0.1, E.rise + 0.18], take1: E.rise + 0.18, apex1: E.rise + 0.68, frz1: [E.rise + 0.68, E.meters2 + 0.14], fall1: [E.meters2 + 0.14, E.meters2 + 0.46],
  crouch2: E.leaves - 0.25, take2: E.f52a - 0.22, frz2: [E.f52a - 0.12, E.runW + 0.4], unfrz2: [E.runW + 0.4, E.runW + 0.7],
  backB: [E.softer - 0.5, E.same - 0.15], runB: [E.same - 0.15, E.and1 - 0.02], take3: E.and1 - 0.02, landB: E.roof2 + 0.07,
};
// slow-motion flight: film time → real flight time tau (monotone cubic through the word anchors)
const TAU_K = [[T.take3, 0, 0.1], [E.second, 0.349, 0.19], [E.third, 0.685, 0.33], [E.higher2 + 0.35, 1.13, 0.3], [E.stays + 0.3, 1.43, 0.12], [E.then + 0.1, 1.59, 0.12], [E.f52b, 1.83, 0.33], [T.landB, 2.976, 1.0]];
export function tauAt(t) {
  if (t <= TAU_K[0][0]) return 0; if (t >= TAU_K[TAU_K.length - 1][0]) return 2.976;
  let i = 0; while (t > TAU_K[i + 1][0]) i++;
  const [t0, p0, m0] = TAU_K[i], [t1, p1, m1] = TAU_K[i + 1], h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * h * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * h * m1;
}
const flightY = (tau) => Math.max(0, 14.6 * tau - 4.905 * tau * tau);
export function marioAt(t) {
  let X = XM, Y = 0;
  if (t < T.land) { const u = clamp01((t - CUT) / (T.land - CUT)); X = lerp(-0.55, XM, u); Y = 0.35 * (1 - u) + 0.55 * Math.sin(Math.PI * u) * (1 - u * 0.3); }
  else if (t < T.backA[0]) X = XM;
  else if (t < T.runA[0]) X = lerp(XM, -1.15, eio((t - T.backA[0]) / (T.backA[1] - T.backA[0])));
  else if (t < T.take1) { const u = clamp01((t - T.runA[0]) / (T.take1 - 0.12 - T.runA[0])); X = lerp(-1.15, XM, u * u * (1.6 - 0.6 * u)); }
  else if (t < T.frz1[0]) { const u = (t - T.take1) / (T.apex1 - T.take1); X = XM + 0.15 * u; Y = 3.9 * (1 - (1 - u) ** 2); }
  else if (t < T.fall1[0]) { X = XM + 0.15; Y = 3.9; }
  else if (t < T.fall1[1]) { const u = (t - T.fall1[0]) / (T.fall1[1] - T.fall1[0]); X = XM + 0.15 + 0.08 * u; Y = 3.9 * (1 - u * u); }
  else if (t < T.backB[0]) { X = XM + 0.23; if (t > T.take2 && t < T.unfrz2[1]) Y = 0.07 * Math.min(sm(t, T.take2, T.frz2[0]), 1 - sm(t, T.unfrz2[0], T.unfrz2[1])); }
  else if (t < T.runB[0]) X = lerp(XM + 0.23, -0.75, eio((t - T.backB[0]) / (T.backB[1] - T.backB[0])));
  else if (t < T.take3) { const u = clamp01((t - T.runB[0]) / (T.take3 - T.runB[0])); X = lerp(-0.75, XM, u * (1.4 - 0.4 * u)); }
  else if (t < T.landB) Y = flightY(tauAt(t));
  return { X, Y, Z: ZM };
}
/** Mario's own animation clock: frozen inside the two freeze windows (no pose / breath / blink change there) */
const frozenBefore = (t) => { let f = 0; for (const [a, b] of [T.frz1, T.frz2]) f += clamp01((t - a) / (b - a)) * (b - a); return f; };
export const KEYS = [
  [CUT - 0.01, "dive"], [6.1, "fall"], [T.land - 0.03, "land"], [T.land + 0.22, "idle"], [6.95, "look-up"], [E.tall1 + 0.2, "idle"],
  [T.backA[0], "run"], [T.backA[1] - 0.15, "idle"], [T.runA[0], "run"], [T.take1 - 0.16, "crouch"], [T.take1, "jump-up"], [T.apex1 - 0.22, "apex"],
  [T.fall1[0], "fall"], [T.fall1[1] - 0.03, "land"], [T.fall1[1] + 0.25, "idle"], [T.crouch2, "crouch"], [T.take2, "jump-up"],
  [T.unfrz2[0], "idle"], [E.why - 0.2, "look-up"], [E.our2 + 0.1, "idle"], [T.backB[0] + 0.1, "run"], [T.backB[1] - 0.1, "idle"], [T.runB[0], "run"], [T.take3 - 0.2, "crouch"], [T.take3, "jump-up"],
  [E.higher2 - 0.3, "apex"], [E.then + 0.1, "fall"], [T.landB - 0.03, "land"], [T.landB + 0.35, "dust-off"], [E.game2 - 0.1, "look-up"], [E.jump4 + 0.25, "idle"],
  [E.its - 0.35, "point"], [E.knees + 0.5, "proud"],
];
/** facing: +1 right; the two game-window sections look left (a crossfade turn) */
const dirK = (t) => Math.max(win(t, E.why - 0.25, E.our2 + 0.1, 0.25, 0.25), win(t, E.game2 - 0.15, E.jump4 + 0.2, 0.25, 0.25));

// ---------------------------------------------------------------- the camera (keys + the ride that follows Mario's height)
// key = { cx, h, f, Yc, ry }: world height Yc at Mario's depth sits on screen row ry; h = camera height (perspective).
const CK = (cx, h, f, Yc, ry) => ({ cx, h, f, Yc, ry });
const K_PORTAL = CK(-0.05, 0.55, 1500, 0, 640), K_MAN = CK(0.95, 0.6, 1350, 0, 640), K_BLOCK = CK(0.95, 0.6, 1500, 0, 650), K_APEX1 = CK(0.75, 3.6, 1150, 3.9, 430), K_APEX2 = CK(0.7, 3.9, 1000, 3.9, 385),
  K_CLOSE = CK(1.05, 0.5, 1800, 0, 640), K_WIN = CK(0.45, 0.6, 1600, 0, 650), K_WIN2 = CK(0.22, 0.6, 1600, 0, 650), K_KNEE = CK(0.72, 0.35, 3300, 0.32, 470), K_END = CK(0.25, 0.6, 1500, 0, 650), K_WIDE = CK(0.75, 9.0, 520, null, 232);
const blendK = (a, b, k) => { const o = {}; for (const f of ["cx", "h", "f", "Yc", "ry"]) o[f] = lerp(a[f], b[f], k); return o; };
function follow(t, f = 1400) { const m = marioAt(t); return CK(m.X + 0.35, 0.6, f, 0, 640); }
function ride(t, f = 1700) { const m = marioAt(t); return CK(0.65, m.Y + 0.9, f, m.Y + 0.78, 470); }
function camKey(t) {
  const seq = [
    [CUT, K_PORTAL], [6.3, K_PORTAL], [7.2, K_MAN], [9.4, K_MAN], [10.4, K_BLOCK], [T.backA[0], K_BLOCK],
  ];
  // piecewise blends written out per section (each ends exactly where the next starts)
  if (t < 7.2) return blendK(K_PORTAL, K_MAN, eio((t - 6.3) / 0.9));
  if (t < 10.4) return blendK(K_MAN, K_BLOCK, eio((t - 9.4) / 1.0));
  if (t < T.take1) return blendK(K_BLOCK, follow(t), eio((t - T.backA[0]) / 0.7));
  if (t < T.fall1[0]) { const r = ride(t, 1400); return blendK(blendK(blendK(follow(t), r, eio((t - T.take1) / 0.25)), K_APEX1, eio((t - T.take1 - 0.1) / 0.9)), K_APEX2, eio((t - E.highJ + 0.2) / 0.8)); }
  if (t < T.crouch2) { const fl = blendK(K_APEX2, ride(t, 1400), eio((t - T.fall1[0]) / 0.35)); return blendK(fl, K_CLOSE, eio((t - T.fall1[1]) / 0.8)); }
  if (t < E.why - 0.3) return K_CLOSE;
  if (t < T.backB[0]) return blendK(K_CLOSE, K_WIN, eio((t - (E.why - 0.3)) / 0.8));
  if (t < T.take3) return blendK(K_WIN, follow(t, 1500), eio((t - T.backB[0]) / 0.6));
  if (t < T.landB) {
    const rd = ride(t), base = blendK(follow(t, 1500), rd, eio((t - T.take3) / 0.4));
    const wide = { ...K_WIDE, Yc: marioAt(t).Y + 0.78 };
    return blendK(base, wide, Math.min(eio((t - (E.higher2 - 0.05)) / 0.6), 1 - eio((t - (E.stays + 0.55)) / 0.85)));
  }
  if (t < E.so3) return blendK(ride(t), K_WIN2, eio((t - T.landB) / 0.75));
  if (t < E.knees + 0.45) return blendK(K_WIN2, K_KNEE, eio((t - E.so3) / 1.0));
  return blendK(K_KNEE, K_END, eio((t - E.knees - 0.45) / 1.0));
}
export function cityCam(t) {
  const k = camKey(t), kM = k.f / (8 - ZM), hy = k.ry + kM * (k.Yc - k.h);
  return makeCam({ x: k.cx, h: k.h, d: 8, f: k.f, hy });
}

// ---------------------------------------------------------------- the props' timing
const PORTAL_C = { X: -0.55, Y: 0.95, rx: 0.6, ry: 1.0, close: [6.75, 7.25] };
const MAN = { X: 1.65, Z: 1.0, drop: T.land + 0.04, out: [9.4, 11.6] };
const STACK = { X: 1.35 - BS / 2, Z: 0.45 };
const WIN1 = { x0: 40, y0: 152, x1: 250, y1: 322 }, WIN2 = { x0: 40, y0: 152, x1: 250, y1: 362 }, PANEL = { x0: 40, y0: 376, x1: 250, y1: 622 };
const BLK_T = [E.two + 0.25, E.two + 0.55];                       // the two blocks leave the game window
const BLK_DROP = [T.take1 - 0.42, T.take1 - 0.18, T.take1 + 0.06];  // blocks 3, 4, 5 drop onto the stack
const BAR = { X0: -0.75, X1: 2.05, Z: 0.3, H: 2.45, in: E.highJ - 0.15 };
const ATH = { X: -0.25, Z: 0.15, in: E.record - 0.5, out: [E.toJump - 0.2, E.toJump + 1.1] };
const RUN = { t0: E.faster - 0.25, t1: E.why + 0.2, X0: 0.3, X1: 3.6, Z: 0.35 };
const TAPE_X = 0.0;
export const EV = { E, T, CUT, PORTAL_C, MAN, BLK_T, BLK_DROP, BAR, ATH, RUN, WIN1, WIN2, PANEL };
export { gameMario, flightY, portalOpenG };
const tapeLen = (t) => t < T.take1 ? 0 : t < E.eleven - 0.1 ? 4.0 * eout((t - T.take1) / 0.5) : 4.0 + 7.0 * eio((t - E.eleven + 0.1) / 0.8);

const LK = {
  man: { h: 1.80, skin: "skinB", top: "navy", coat: true, inner: "white", legs: "khaki", shoe: "brown", hair: "dark", style: "short", beard: true },
  ath: { h: 1.92, skin: "skinD", top: "teal", legs: "black", shoe: "white", hair: "dark", style: "short", bulk: 0.95 },
  runner: { h: 1.88, skin: "skinD", top: "mustard", legs: "black", shoe: "white", hair: "dark", style: "short", bulk: 0.95 },
  gran: { h: 1.6, skin: "skinA", top: "plum", legs: "plum", shoe: "black", hair: "greyH", style: "bun", glasses: true, head: 1.05 },
  boy: { h: 1.32, skin: "skinC", top: "red", legs: "denim", shoe: "white", hair: "ginger", style: "curly", head: 1.28 },
};

// ---------------------------------------------------------------- 2) draw OUR street
function drawStreet(c, t) {
  const Cm = cityCam(t), m = marioAt(t), kM = Cm.k(ZM);
  drawCity(c, Cm, t);
  // the crack of the big landing (persistent), the tape on the wall, floor badges
  if (t > T.landB) crack(c, Cm, XM + 0.05, ZM + 0.05, sm(t, T.landB, T.landB + 0.2));
  tape(c, Cm, TAPE_X, tapeLen(t), t, { font: MAIN });
  // residents in the open windows of floor 2 (grandma) and floor 3 (the boy) — clipped to the opening above the flower box
  residents(c, Cm, t);
  // pigeons on the parapet (fly off on «roof»)
  pigeons(c, Cm, t);
  // depth-sorted things on the pavement
  const items = [];
  const barA = sm(t, BAR.in, BAR.in + 0.5) * (1 - sm(t, E.toJump, E.toJump + 0.5));
  if (barA > 0) items.push([BAR.Z, () => jumpBar(c, Cm, BAR.X0, BAR.X1, BAR.Z, BAR.H, barA, 0.4 + 0.6 * eout((t - BAR.in) / 0.6))]);
  items.push([0.4, () => planter(c, Cm, 2.25, 3.75, 0.05, 0.75, t)]);
  const athA = Math.min(sm(t, ATH.in, ATH.in + 0.5), 1 - sm(t, ATH.out[1] - 0.4, ATH.out[1]));
  if (athA > 0) items.push([ATH.Z, () => { const X = ATH.X - 1.6 * eio((t - ATH.out[0]) / (ATH.out[1] - ATH.out[0])), walk = win(t, ATH.out[0], ATH.out[1], 0.2, 0.2); const [fx, fy] = Cm.P(X, 0, ATH.Z); contact(c, Cm, X, ATH.Z, 0.25, 0.4 * athA); person2(c, fx, fy, Cm.k(ATH.Z), t, LK.ath, { turn: 0.6 * (1 - walk), walk, gait: -X / 1.3, lean: -0.05 }, { a: athA }, 1 - sm(t, ATH.out[0] - 0.1, ATH.out[0] + 0.2)); }]);
  if (t > RUN.t0 && t < RUN.t1) items.push([RUN.Z, () => { const u = (t - RUN.t0) / (RUN.t1 - RUN.t0), X = lerp(RUN.X0, RUN.X1, u), [fx, fy] = Cm.P(X, 0, RUN.Z), a = Math.min(sm(t, RUN.t0, RUN.t0 + 0.3), 1 - sm(t, RUN.t1 - 0.3, RUN.t1)); drawPerson(c, fx, fy, Cm.k(RUN.Z), t, LK.runner, { walk: 1, gait: t * 2.4, dir: 1, lean: 0.12 }, { a }); }]);
  // the stack of brick blocks (2 from the game window, then 3, 4, 5 drop on)
  items.push([STACK.Z + BS / 2, () => stack(c, Cm, t)]);
  // the passer-by with his paper bag of apples
  if (t < MAN.out[1] + 0.5) items.push([MAN.Z, () => man(c, Cm, t)]);
  // apples rolling and resting
  items.push([1.9, () => apples(c, Cm, t)]);
  // the portal (until it collapses)
  if (t < PORTAL_C.close[1]) items.push([ZM - 0.01, () => { const [x, y] = Cm.P(PORTAL_C.X, PORTAL_C.Y, ZM), k = Cm.k(ZM); portal(c, x, y, PORTAL_C.rx * k, PORTAL_C.ry * k, t, 1 - eio((t - PORTAL_C.close[0]) / (PORTAL_C.close[1] - PORTAL_C.close[0]))); }]);
  // Mario
  items.push([ZM, () => drawCityMario(c, Cm, t, m)]);
  items.sort((a, b) => a[0] - b[0]); for (const [, f] of items) f();
  // landing dust in front
  for (const [tl, k] of [[T.land, 0.8], [T.fall1[1], 0.8], [T.landB, 1.4]]) if (t > tl && t < tl + 0.9) { const [x, y] = Cm.P(m.X, 0, ZM + 0.1); dust(c, x, y, kM * k, (t - tl) / 0.9, R(tl * 10)); }
  // the watering can falling
  can(c, Cm, t);
  return { kind: "city", cam: Cm, kM, m };
}
function drawCityMario(c, Cm, t, m) {
  const kM = Cm.k(ZM), ta = t - frozenBefore(t), sD = drive(mario, KEYS, t), v = { ...sD.v };
  // airborne poses tuck the feet up: lower the ground point so the soles sit on the measured height
  const tuck = m.Y > 0.05 ? 0.24 * (v.apex ?? 0) + 0.04 * (v.air ?? 0) + 0.04 * (v.fall ?? 0) : 0;
  let [fx, fy] = Cm.P(m.X, m.Y - tuck, ZM), s = kM, a = 1;
  // emerging from the portal: grows from its centre
  if (t < CUT + 0.2) { const k = eout((t - CUT) / 0.2), [px, py] = Cm.P(PORTAL_C.X, PORTAL_C.Y, ZM); s = kM * (0.3 + 0.7 * k); fx = lerp(px, fx, k); fy = lerp(py + 0.6 * s, fy, k); }
  // looks: up at the house, down from the apex, at the knees
  if (t > T.take3 && t < T.landB) v.tiltX = 0.22 * win(t, E.stays - 0.2, E.then + 0.3, 0.4, 0.4);
  const gait = m.X / 1.1, dK = dirK(t);
  // shadow on the ground under him (smaller with height)
  { const hk = clamp01(1 - m.Y / 4); if (hk > 0) contact(c, Cm, m.X, ZM, 0.42 * (0.5 + 0.5 * hk), 0.55 * hk); }
  // the white motion trail in the big jump (strongest in the wide shot)
  if (t > T.take3 + 0.3 && t < T.landB - 0.2) { const up = t < E.then, trailA = 0.55 * Math.min(sm(t, T.take3 + 0.3, T.take3 + 0.8), 1 - sm(t, T.landB - 0.6, T.landB - 0.2));
    for (let i = 4; i >= 1; i--) { const tt = t - i * 0.09 * (up ? 1 : 1), mm = marioAt(tt), [gx2, gy2] = Cm.P(mm.X, mm.Y, ZM); if (Math.abs(gy2 - fy) < 4) continue; drawMario(c, gx2, gy2, s, ta, v, { dir: 1, gait, ghost: [255, 255, 255], a: trailA * (1 - i / 5) }); } }
  const r = dK < 1 ? drawMario(dK > 0 ? gate(c, dK, 1) : c, fx, fy, s, ta, v, { dir: 1, gait, a }) : null;
  const r2 = dK > 0 ? drawMario(dK < 1 ? gate(c, 0, dK) : c, fx, fy, s, ta, v, { dir: -1, gait, a }) : null;
  CM_LAST = { ...(r || r2), fx, fy, s };
}
let CM_LAST = null;
/** Mario's drawn box of the last city frame (QA: his size in the frame) */
export const lastMario = () => CM_LAST;
function stack(c, Cm, t) {
  const sz = (i) => i < 2 ? sm(t, BLK_T[1] - 0.05, BLK_T[1] + 0.25) : sm(t, BLK_DROP[i - 2] - 0.25, BLK_DROP[i - 2]);
  for (let i = 0; i < 5; i++) {
    let Yo = 0, a = sz(i); if (a <= 0) continue;
    if (i >= 2) { const u = clamp01((t - (BLK_DROP[i - 2] - 0.25)) / 0.4); Yo = u < 0.6 ? (1 - u / 0.6) ** 2 * 1.4 : 0.12 * Math.sin(Math.PI * (u - 0.6) / 0.4) * (1 - u); }
    if (i < 2) { const u = clamp01((t - BLK_T[1]) / 0.3); Yo = 0.1 * Math.sin(Math.PI * u) * (1 - u); }
    const out = sm(t, E.toJump + 0.05 + (4 - i) * 0.09, E.toJump + 0.4 + (4 - i) * 0.09); a *= 1 - out; Yo += 0.25 * out; if (a <= 0) continue;
    cube(c, Cm, STACK.X, i * BS + Yo, STACK.Z, a);
  }
}
function man(c, Cm, t) {
  const walk = win(t, MAN.out[0], MAN.out[1] + 0.5, 0.25, 0.3), X = MAN.X + 3.2 * eio((t - MAN.out[0]) / (MAN.out[1] - MAN.out[0])), a = 1 - sm(t, MAN.out[1] - 0.3, MAN.out[1] + 0.4);
  const [fx, fy] = Cm.P(X, 0, MAN.Z), k = Cm.k(MAN.Z);
  const recoil = Math.min(sm(t, T.land - 0.1, T.land + 0.1), 1 - 0.7 * sm(t, T.land + 0.5, T.land + 1.2)), held = 1 - sm(t, MAN.drop, MAN.drop + 0.06);
  contact(c, Cm, X, MAN.Z, 0.3, 0.45 * a);
  const turn = -0.9 * sm(t, T.land + 0.3, T.land + 0.9) * (1 - walk);
  const r = person2(c, fx, fy, k, t, LK.man, { recoil, turn, walk, gait: X / 1.3, mouth: win(t, T.land, T.land + 1.2, 0.1, 0.3), cup: held * 0.9 }, { a }, sm(t, MAN.out[0] - 0.1, MAN.out[0] + 0.2));
  // the paper bag: in his arms, then it drops and tips over
  const bagFall = clamp01((t - MAN.drop) / 0.32);
  if (t < MAN.out[0]) { const [hx, hy] = r.hand, [gx2, gy2] = Cm.P(MAN.X - 0.25, 0, MAN.Z + 0.35), x = lerp(hx, gx2, bagFall), y = lerp(hy, gy2, bagFall * bagFall), w = 0.26 * k, h = 0.34 * k, tip = sm(t, MAN.drop + 0.3, MAN.drop + 0.5) * 1.2;
    const P = (u, vv) => [x + (u * Math.cos(tip) - vv * Math.sin(tip)) * 1, y + (u * Math.sin(tip) + vv * Math.cos(tip)) * 1];
    const poly = [P(-w / 2, -h), P(w / 2, -h), P(w / 2, 0), P(-w / 2, 0)];
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.poly(poly.map(([a1, b1]) => [a1 + dx, b1 + dy]), "#0B0812");
    c.poly(poly, null, (xx, yy) => (((xx - x) / w + 2) % 0.25 < 0.04 ? "#8E6A44" : "#C29A66"));
    if (bagFall < 0.9) for (let i = 0; i < 3; i++) apple(c, x + (i - 1) * w * 0.28, y - h - 0.04 * k, 0.05 * k, i); }
}
const APPLES = Array.from({ length: 6 }, (_, i) => ({ dx: 0.25 + 0.75 * rnd(i * 11 + 3), dz: 0.35 + 0.65 * rnd(i * 7 + 1), dur: 0.7 + 0.5 * rnd(i + 9) }));
function apples(c, Cm, t) {
  const t0 = MAN.drop + 0.3; if (t < t0) return;
  for (const [i, ap] of APPLES.entries()) { const u = clamp01((t - t0) / ap.dur), e = eout(u), X = MAN.X - 0.25 + ap.dx * e * 1.4, Z = MAN.Z + 0.35 + ap.dz * e, [x, y] = Cm.P(X, 0.05, Z), r = 0.05 * Cm.k(Z);
    if (y > c.h + 10) continue; apple(c, x, y - r * 0.4, r, e * 9 + i); }
}
function residents(c, Cm, t) {
  // grandma (floor 2, col 1.25) waters the flowers, startles on «second» and drops the can
  for (const [who, fl] of [["gran", 1], ["boy", 2]]) {
    const r = winRect(fl, 1.25), Z = -0.35, floorY = fl === 1 ? 3.62 : 6.78, k = Cm.k(Z);
    const [x0, yTop] = Cm.P(r.x0 + 0.07, r.y1 - 0.07, 0), [x1, yBox] = Cm.P(r.x1 - 0.2, r.y0 + 0.2, 0.02);
    if (yBox < -50 || yTop > c.h + 50 || x1 < 0 || x0 > c.w) continue;
    const view = clipView(c, { x0: Math.round(x0), y0: Math.round(yTop), x1: Math.round(x1), y1: Math.round(yBox) });
    const X = who === "gran" ? 1.42 : 1.28, [fx, fy] = Cm.P(X, floorY, Z);
    if (who === "gran") { const startle = sm(t, E.second - 0.05, E.second + 0.2), watering = 1 - startle;
      drawPerson(view, fx, fy, k, t, LK.gran, { dir: -1, lean: 0.12 * watering, recoil: startle, turn: -0.3 - 0.6 * startle, mouth: startle, hands: watering > 0.5 ? null : null, cup: watering * 0.8 }, {});
      if (t < E.second + 0.12) { const [hx, hy] = Cm.P(X - 0.32, floorY + 1.2, 0.1); wateringCan(c, hx, hy, Cm.k(0.1), -0.35 + 0.08 * Math.sin(t * 2)); if (t > 1) for (let i = 0; i < 4; i++) { const ph = ((t * 2.2 + i / 4) % 1), [wx, wy] = Cm.P(X - 0.62 - 0.04 * ph, floorY + 1.1 - 0.75 * ph, 0.12); c.rect(R(wx), R(wy), 2, 3, "#9AD8FF"); } }
    } else { const film = sm(t, E.past1, E.third - 0.1);
      drawPerson(view, fx, fy, k, t, LK.boy, { dir: -1, film: 0.25 + 0.75 * film, turn: -0.4 - 0.5 * film, mouth: win(t, E.third, E.third + 1.5, 0.2, 0.4) }, {}); }
  }
}
function can(c, Cm, t) {
  const t0 = E.second + 0.12; if (t < t0 || t > t0 + 1.4) return;
  const u = t - t0, [x, y] = Cm.P(1.42 - 0.32 - 0.25 * u, 3.62 + 1.2 - 4.9 * u * u, 0.1 + 0.6 * u), a = 1 - sm(u, 1.0, 1.4);
  if (y > c.h + 40) return; const g = a < 1 ? fade(c, a) : c; wateringCan(g, x, y, Cm.k(0.1 + 0.6 * u), -0.35 + u * 5.5);
}
const PIGEONS = [[1.6, 0], [2.05, 1], [2.5, 2], [2.95, 3], [3.4, 4]];
function pigeons(c, Cm, t) {
  for (const [X0, i] of PIGEONS) { const tf = E.roof1 - 0.05 + i * 0.07, u = clamp01((t - tf) / 1.6), fly = sm(t, tf, tf + 0.12);
    const X = X0 + 2.6 * u * u + 0.4 * u, Y = 10.0 + 2.6 * eout(u) + 0.03 * Math.sin(t * 3 + i), Z = -0.12 + 0.7 * u, [x, y] = Cm.P(X, Y, Z), s = Cm.k(Z);
    if (y < -20 || y > c.h + 20 || u >= 1) continue; pigeon(fade(c, 1 - sm(u, 0.75, 1)), x, y, s, t, fly, i % 2 ? 1 : -1, i); }
}

// ---------------------------------------------------------------- frame entry points
export function drawWorld(c, t) { return t < CUT - 1e-6 ? drawGame(c, t) : drawStreet(c, t); }

// ---------------------------------------------------------------- HUD and the game window (screen space)
const GW_GAME = (rect, B) => ({ x: 3.6 + (270 - (rect.x0 + rect.x1) / 2) / B, gy: rect.y1 - Math.round(B * 0.75), B });
function windowContent(c, rect, t, mode, a) {
  const B = mode === "two" ? 40 : 26, cam = GW_GAME(rect, B), view = clipView(c, rect);
  const g = a < 1 ? fade(view, a) : view;
  const lvl = { pipes: [[6.6, 7.6, 1.2]], bricks: [], qs: [], bushes: [[1.0, 1.6]], hills: [[-1, 5, 1.6], [7, 6, 2]], clouds: [[1.5, 5.5, 1.4], [6, 6.6, 1.8]] };
  drawLevel(g, cam, t, { level: lvl, clip: rect });
  const mx = mode === "two" ? 3.1 : 3.4;
  let y = 0, st = "idle";
  if (mode === "jump" || mode === "land") { const per = mode === "jump" ? 1.6 : 0.95, t0 = mode === "jump" ? E.why : E.forty - 1.9, u = ((t - t0) % per + per) % per;
    // game timing: rise 0.42 s to 5 blocks, a short hang, a fast fall (0.4 s)
    if (u < 0.42) { y = 5 * (1 - (1 - u / 0.42) ** 2); st = "jump-up"; } else if (u < 0.55) { y = 5; st = "apex"; } else if (u < 0.95) { y = 5 * (1 - ((u - 0.55) / 0.4) ** 2); st = "fall"; } else st = "idle";
    const keysW = [[-1, "idle"]], base = t0 + Math.floor((t - t0) / per) * per; keysW.push([base - 0.001, "idle"], [base, "jump-up"], [base + 0.35, "apex"], [base + 0.55, "fall"], [base + 0.93, "land"], [base + 1.02, "idle"]);
    const s = drive(mario, keysW, t); drawMario(g, gx(cam, mx), gyy(cam, y), (B / 0.775), t, s.v, { dir: 1, flat: true });
    return { cam, mx, y, u, per, t0 };
  }
  drawMario(g, gx(cam, mx), gyy(cam, 0), B / 0.775, t, { ...mario.base }, { dir: 1, flat: true });
  return { cam, mx, y: 0 };
}
export function drawStory(c, V, t) {
  if (V.kind === "game") return;
  const Cm = V.cam, kM = V.kM, m = V.m;
  // ---- 1.55 m bracket next to Mario + the passer-by for scale
  { const a = win(t, E.one155 - 0.1, E.inThe - 0.2, 0.3, 0.4); if (a > 0) { const [fx, fy] = Cm.P(m.X, 0, ZM), top = fy - 1.55 * kM, x = R(fx - 0.48 * kM), grow = eout((t - E.one155 + 0.1) / 0.5);
    bracket(c, x, fy, lerp(fy, top, grow), a, C.Y, 8, 1); pill(c, "1.55 m", x + 6, R(top - 34), a * sm(t, E.one155 + 0.3, E.one155 + 0.6)); } }
  // ---- the game window: two blocks
  { const a = win(t, E.inThe - 0.1, E.s78 + 1.0, 0.4, 0.5); if (a > 0) gameWindow(c, WIN1, a, (cc, aa) => { const w = windowContent(cc, WIN1, t, "two", aa);
      // the two blocks next to small Mario until they fly out
      if (t < BLK_T[0] + 0.02) for (let i = 0; i < 2; i++) drawBrick(clipView(cc, WIN1), gx(w.cam, 3.75), gyy(w.cam, i + 1), w.cam.B, WIN1); }); }
  // ---- the two blocks flying out of the window onto the pavement (screen-space flight, then the 3D cubes take over)
  if (t > BLK_T[0] && t < BLK_T[1] + 0.3) { const cam = GW_GAME(WIN1, 40);
    for (let i = 0; i < 2; i++) { const u = eio((t - BLK_T[0] - i * 0.06) / (BLK_T[1] - BLK_T[0])), [p0x, p0y] = [gx(cam, 3.75), gyy(cam, i + 1)], X = STACK.X, Y = i * BS, [q0x, q0y] = Cm.P(X, Y + BS, STACK.Z + BS), [q1x] = Cm.P(X + BS, 0, STACK.Z + BS);
      const x = lerp(p0x, q0x, u), y = lerp(p0y, q0y, u) - 80 * Math.sin(Math.PI * u), B = lerp(cam.B, q1x - q0x, u), a = 1 - sm(t, BLK_T[1] - 0.05 + i * 0.02, BLK_T[1] + 0.25);
      if (a > 0) drawBrick(fade(c, a), x, y, B, null); } }
  // ---- 1 BLOCK ≈ 0.78 m
  { const a = win(t, E.s78 - 0.15, E.with - 0.2, 0.3, 0.4); if (a > 0) { const [x0, y0] = Cm.P(STACK.X + BS / 2, 2 * BS, STACK.Z + BS); pill(c, "1 BLOCK ≈ 0.78 m", Math.min(330, x0), R(y0 - 46), a); } }
  // ---- 3.9 m on the tape, the 2.45 m bar label and the bracket from the bar to Mario's feet
  { const a = win(t, E.four1 - 0.12, T.fall1[0] + 0.05, 0.3, 0.3); if (a > 0) { const [tx, ty] = Cm.P(TAPE_X, 3.9, 0); const g = fade(c, a); g.rect(R(tx - 0.16 * Cm.k(0)), R(ty) - 1, R(0.32 * Cm.k(0)), 3, "#FF4A4A"); pill(c, "3.9 m", Math.max(78, R(tx - 62)), R(ty - 13), a, { edge: "#FF6A5A" }); } }
  { const a = win(t, E.two45 - 0.12, T.fall1[0] + 0.05, 0.3, 0.3); if (a > 0) { const [bx, by] = Cm.P(BAR.X0 + 0.9, BAR.H, BAR.Z); pill(c, "2.45 m · WORLD RECORD", 170, Math.min(588, R(by - 52)), a, { edge: "#7FE3F0" });
    const k2 = sm(t, E.two45 + 0.5, E.meters2), [mx, my] = Cm.P(m.X + 0.42, m.Y, ZM), [, byM] = Cm.P(m.X + 0.42, BAR.H, BAR.Z); bracket(c, R(mx), byM, lerp(byM, my, eout(k2)), a * sm(t, E.two45 + 0.4, E.two45 + 0.6), "#7FE3F0", 7, 1); } }
  // ---- take-off freeze: the arrow up from the boots, 52 km/h ↑; the sprinter 44.7 km/h
  { const a = win(t, T.take2 + 0.05, T.unfrz2[0], 0.25, 0.3); if (a > 0) { const [fx, fy] = Cm.P(m.X, m.Y, ZM), x = R(fx + 0.5 * kM), L = 330 * eout((t - T.take2) / 0.5); arrow(c, x, R(fy - 6), x, R(fy - 6 - L), 16, a);
    const ad = a * sm(t, E.f52a - 0.1, E.f52a + 0.15); dial(c, 388, 226, 46, 52 * eout((t - E.f52a) / 0.6), ad); label(c, "52 km/h ↑", 388, 244, ad, C.Y, 2); } }
  { const a = win(t, E.usain - 0.15, T.unfrz2[0] + 0.2, 0.3, 0.3); if (a > 0) { const u = (t - RUN.t0) / (RUN.t1 - RUN.t0), X = lerp(RUN.X0, RUN.X1, u), [rx, ry] = Cm.P(X, 1.25, RUN.Z), L = 330 * 44.7 / 52 * eout((t - E.usain) / 0.5);
    arrow(c, R(rx + 10), R(ry), R(rx + 10 + L), R(ry), 12, a * (1 - sm(t, RUN.t1 - 0.6, RUN.t1 - 0.2))); dial(c, 112, 226, 46, 44.7 * eout((t - E.usain) / 0.6), a, { edge: "#7FE3F0" }); label(c, "44.7 km/h", 112, 244, a, "#7FE3F0", 2); } }
  // ---- the game window: why he stops — he jumps 5 blocks again and again, heavy arrows pull him down
  { const a = win(t, E.why - 0.15, E.our2 + 0.25, 0.4, 0.5); if (a > 0) gameWindow(c, WIN2, a, (cc, aa) => { const w = windowContent(cc, WIN2, t, "jump", aa);
      const pa = aa * sm(t, E.pulls1 - 0.1, E.pulls1 + 0.3); if (pa > 0) for (const dx of [-1.3, 1.3]) { const x = gx(w.cam, w.mx + dx * 0.9), ph = ((t * 1.6) % 1), y0 = gyy(w.cam, 4.6) + ph * 20; arrow(clipView(cc, WIN2), x, y0, x, y0 + 60, 9, pa * (1 - ph * 0.5), [[110, 14, 26], [196, 32, 46], [242, 74, 74], [255, 138, 128]]); } }); }
  // ---- EARTH 1× vs GAME ≈10×
  { const a = win(t, E.game1 - 0.2, E.our2 + 0.25, 0.4, 0.5); if (a > 0) { plate(c, PANEL.x0, PANEL.y0, PANEL.x1 - PANEL.x0, PANEL.y1 - PANEL.y0, a, "#8D59DA");
    const ea = a * sm(t, E.earth - 0.1, E.earth + 0.2), ga = a; label(c, "EARTH 1×", 92, PANEL.y0 + 14, ea, "#7FE3F0", 2); label(c, "GAME ≈10×", 196, PANEL.y0 + 14, ga, "#FF8A80", 2);
    arrow(c, 92, PANEL.y0 + 40, 92, PANEL.y0 + 40 + 21, 6, ea, [[30, 90, 110], [60, 160, 190], [127, 227, 240], [200, 250, 255]]);
    const gk = 1 + 9 * eio((t - E.ten + 0.1) / 0.9); arrow(c, 196, PANEL.y0 + 40, 196, PANEL.y0 + 40 + 21 * gk, 6 + 1.5 * gk, ga, [[110, 14, 26], [196, 32, 46], [242, 74, 74], [255, 138, 128]]); } }
  // ---- the big jump: SLOW-MO chip, floor badges on the tape, 10.8 m, the 3 s ring, 52 km/h ↓
  { const a = win(t, T.take3 + 0.15, T.landB - 0.35, 0.3, 0.3); if (a > 0) pill(c, "SLOW-MO", 104, 160, a, { edge: "#FF6A5A", col: "#FF8A80" }); }
  { const a = sm(t, E.eleven, E.eleven + 0.4) * (1 - sm(t, T.landB + 1.0, T.landB + 1.5)); if (a > 0) for (const [n, Y, w] of [["1", 1.7, null], ["2", 4.95, E.second], ["3", 8.1, E.third]]) { const [x, y] = Cm.P(TAPE_X - 0.32, Y, 0), hot = w ? win(t, w - 0.1, w + 0.9, 0.15, 0.4) : 0, r = Math.max(9, Math.min(15, R(0.07 * Cm.k(0)))) + R(3 * hot);
    if (y < 140 || y > 640 || x < 40) continue; const g = fade(c, a); g.disc(R(x), R(y), r + 2, "#0B0812"); g.disc(R(x), R(y), r, hot > 0.5 ? "#F4CA50" : "#FDFEED"); const tw = c.measure(MAIN, n, { scale: 2 }); g.text(MAIN, n, R(x - tw / 2) + 1, R(y - 6), "#0B0812", { scale: 2 }); } }
  { const a = win(t, E.higher2 + 0.1, E.stays + 0.6, 0.3, 0.4); if (a > 0) { const [tx, ty] = Cm.P(TAPE_X, 10.8, 0); fade(c, a).rect(R(tx - 9), R(ty) - 1, 18, 3, "#FF4A4A"); pill(c, "10.8 m", Math.max(80, R(tx - 60)), Math.max(166, R(ty - 13)), a, { edge: "#FF6A5A" }); } }
  { const a = win(t, E.three - 0.1, E.f52b - 0.1, 0.3, 0.3); if (a > 0) { const cx = 404, cy = 262, r = 34, fill = clamp01(tauAt(t) / 2.976), g = fade(c, a);
    g.disc(cx, cy, r + 4, "#0B0812"); g.disc(cx, cy, r + 2, "#16112A"); for (let i = 0; i < 64; i++) { const an = -Math.PI / 2 + (i / 64) * TAU; if (i / 64 > fill) continue; for (let w = 0; w < 4; w++) g.px(R(cx + Math.cos(an) * (r - w)), R(cy + Math.sin(an) * (r - w)), "#F4CA50"); }
    label(c, "3 s", cx, cy - 7, a, C.IV, 2); } }
  { const a = win(t, E.f52b - 0.15, E.inHis, 0.3, 0.3); if (a > 0) { dial(c, 388, 226, 46, 52 * eout((t - E.f52b) / 0.6), a); label(c, "52 km/h ↓", 388, 244, a, C.Y, 2); } }
  // ---- ≈40 km/h landings in his game
  { const a = win(t, E.inHis - 0.1, E.so3 + 0.2, 0.4, 0.5); if (a > 0) gameWindow(c, WIN2, a, (cc, aa) => { const w = windowContent(cc, WIN2, t, "land", aa), per = 0.95;
      for (let n = 0; n < 4; n++) { const tl = w.t0 + n * per + 0.95; if (tl < E.forty - 0.05 || t < tl) continue; const u = (t - tl) / 0.9; if (u > 1) continue; pill(clipView(cc, WIN2), "≈40 km/h", R((WIN2.x0 + WIN2.x1) / 2), R(gyy(w.cam, 0) - 70 - 24 * eout(u)), aa * (1 - sm(u, 0.7, 1)) * sm(u, 0, 0.12), { edge: "#FF6A5A" }); } }); }
  // ---- the knees: golden glow, SUPERPOWER
  { const a = win(t, E.superpower - 0.15, E.knees + 0.9, 0.35, 0.5); if (a > 0 && CM_LAST) { const [kx, ky] = CM_LAST.knee, [kx2, ky2] = CM_LAST.kneeF, s = CM_LAST.s;
    glow(c, (kx + kx2) / 2, (ky + ky2) / 2, 0.38 * s, 0.2 * s, a, t); label(c, "SUPERPOWER", 270, Math.max(170, Math.min(560, R(Math.min(ky, ky2) - 0.48 * s))), a * sm(t, E.superpower, E.superpower + 0.25), C.Y, 4); } }
  // ---- NEXT: PAC-MAN
  { const a = sm(t, E.next - 0.1, E.next + 0.25); if (a > 0) { const p = pill(c, "NEXT: PAC-MAN", 150, 420, a, { padL: 34, edge: C.Y }); if (p) chomper(c, p.x + 22, p.y + p.h / 2, 11, 0.5 + 0.5 * Math.sin(t * 12), a); } }
}
// sound hooks: frames where the city camera is in the wide shot, etc.
export { drawCityMario };
