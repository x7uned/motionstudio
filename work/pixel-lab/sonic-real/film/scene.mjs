// «How fast is Sonic, really?» (IN OUR WORLD #4) · Kagenami pixel film. Two worlds:
//   1. frame 0 → CUT: HIS zone (assets/zone.mjs, our own 16-bit zone, 1 game px = 5 × 5): Sonic already runs at top speed
//      (6 px/frame at 60 fps = 12 game px per video frame, figure-eight legs), the camera scrolls with him; on «bring» a
//      portal opens at the bottom of a slope, he curls into the ball, rolls down and into it;
//   2. HARD CUT (the rubric's signature, the only allowed cut, frame 159) → OUR hilly seaside city in the afternoon
//      (assets/city.mjs) through one pinhole camera per shot (lib/cam.mjs) and an integer sprite scale N per shot:
//      the ball rolls out of the same portal and uncurls next to a passer-by (he reaches her waist, «1 m»); the game window with
//      the 39-cell ruler («39 px», «1 px ≈ 2.5 cm»); the run along the promenade with the frame strip («6 px/frame × 60») and
//      the speedometer («33 km/h»); a runner in a yellow-green vest passes him («RUNNER 45» / «SONIC 33»); the kiosk TVs: our
//      radar-gun picture («MOVIE ≈300 mph», «≈480 km/h») and the sound-barrier streak («SPEED OF SOUND ≈1,235 km/h»,
//      «SONIC = SOUND») with the speed ladder (GAME 33 · MOVIE ≈480 · CARTOONS 1,235+); he looks up the steep street; at the top
//      he curls and rolls down («16 px/frame», «88 km/h»), level with a car («CAR 88», the ladder's new rung ROLLING 88);
//      the square: the 6 m loop is built next to a two-story house («6 m», «≥ 44 km/h», the dotted fall); running at 33 he
//      slides back («33 < 44»), rolling at 88 he loops («88 > 44 ✓»); on the flat the ball slows to a stop («88 → 0») and he
//      uncurls, annoyed; he points at the hill; rolling down the hill again («SUPERPOWER: HILLS»); the portal opens with a
//      green blocky silhouette («NEXT: CREEPER») and the follow card (cta.mjs).
// Every beat is anchored to a measured word (timeline.mjs W()). All art is this film's own; no catalog art.
import { fade, bayer, Canvas, hex, mix } from "../../../../renderer/pixel/raster.mjs";
import { W, END, VOICE_END } from "./timeline.mjs";
import { makeCam, R, lerp, sm, eio, eout, ein, clamp01, win, TAU, BY, h2 } from "./lib/cam.mjs";
import { drawZone, groundY as zoneGround, ZN } from "./assets/zone.mjs";
import { drawSonic, spriteShadow, cycle, RUN, BLUR, EIGHT, BALL, ballFrames, PAL as SP } from "./assets/sonic.mjs";
import { drawCity, gY, CT, CARS, TV, HOUSE2 } from "./assets/city.mjs";
import { drawPerson } from "./assets/passerby.mjs";
import { portal, speedo, ladder, bracketV, bracketH, arrowH, dotted, gameWindow, tvRadar, tvSound, loop, loopPt, LOOP, speedLines, trail, dust, creeper } from "./assets/props.mjs";
import { MAIN, C as HC, plate, label, pill, odo, odoW, lc } from "./lib/hud.mjs";

export { sm, eio };
const ZM = CT.ZM, LX = CT.LX, LZ = CT.LZ;
// ---------------------------------------------------------------- words (single take, Scribe timings)
export const E = {
  usain1: W("usain"), race: W("race."), lets: W("let's"), bring: W("bring"), check: W("check."), sonics1: W("sonic's"), about1: W("about"), one1: W("one"), meter: W("meter"), tall1: W("tall."),
  first: W("first"), game1: W("game,"), t39: W("thirty-nine"), tall2: W("tall", 2), one2: W("one", 2), two1: W("two"), half: W("half"), cm: W("centimeters."),
  his1: W("his"), top1: W("top"), running1: W("running"), six: W("six"), frame1: W("frame,"), sixty: W("sixty"), second: W("second."), thats1: W("that's"), t33: W("thirty-three"), hour1: W("hour."),
  usain2: W("usain", 2), bolts: W("bolt's"), almost: W("almost"), f45: W("forty-five."), but1: W("but"), screen: W("screen."), movie: W("movie,"), police: W("police"), radar: W("radar"), three: W("three"), miles: W("miles"),
  thats3: W("that's", 3), four: W("four"), eighty: W("eighty"), cartoons: W("cartoons"), faster1: W("faster"), sound: W("sound,"), over: W("over"), twelve: W("twelve"), name: W("name"), from2: W("from", 2),
  so1: W("so", 2), how: W("how"), game2: W("game", 2), feel: W("feel"), fast: W("fast?"), he: W("he", 4), rolls: W("rolls."), curled: W("curled"), ball1: W("ball"), rolling1: W("rolling"), hill: W("hill,"),
  sixteen: W("sixteen"), frame2: W("frame", 2), e88: W("eighty-eight"), as: W("as"), car: W("car"), highway: W("highway."), now: W("now"), add: W("add"), loopW: W("loop"), twostory: W("two-story"), house: W("house."),
  you: W("you"), f44: W("forty-four"), bottom: W("bottom,"), fall1: W("fall"), ceiling: W("ceiling."), running2: W("running", 2), fall2: W("fall", 2), rolling2: W("rolling", 2), easily: W("easily."),
  but2: W("but", 2), slows: W("slows"), down: W("down", 2), so3: W("so", 4), superpower: W("superpower"), legs: W("legs."), its: W("it's"), hills: W("hills."), next: W("next,"), creeper: W("creeper"), follow: W("follow,"), miss: W("miss"), end: VOICE_END,
};
export const CUT = 159 / 30;                                         // the rubric's hard cut: zone → our city (frame 159)

/** a cached integral of rate(t) from t0 at 240 Hz → lookup(t) (pure) */
function integral(rate, t0, t1 = END + 1) {
  const n = Math.ceil((t1 - t0) * 240) + 2, tab = new Float64Array(n); let s = 0;
  for (let i = 1; i < n; i++) { const a = t0 + (i - 1) / 240; s += rate(a + 1 / 480) / 240; tab[i] = s; }
  return (t) => { if (t <= t0) return 0; const u = (t - t0) * 240, i = Math.min(n - 2, Math.floor(u)), f = u - i; return tab[i] + (tab[i + 1] - tab[i]) * f; };
}
const ramp = (t, keys) => { if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], sm(t, keys[i - 1][0], keys[i][0])); return keys[keys.length - 1][1]; };

// ================================================================ 1) HIS zone
const ZPORT = 1568, ZCURL = [E.bring, E.bring + 0.1], ZIN = [4.3, 4.62];
const zx = (t) => { const x0 = 40 + 360 * t; if (t <= ZCURL[1]) return x0; const t1 = ZCURL[1], x1 = 40 + 360 * t1, u = clamp01((t - t1) / (ZIN[0] - t1)); return lerp(x1, ZPORT, 1 - (1 - u) * (1 - u) * 0.6 - 0.4 * (1 - u)); };
const zcam = (t) => { const free = zx(Math.min(t, ZCURL[0])) - 34 + (t > ZCURL[0] ? 360 * (t - ZCURL[0]) : 0); return Math.min(free, lerp(free, ZPORT - 56, sm(t, ZCURL[0] - 0.05, 4.6))) ; };
const zportOpen = (t) => { const k = clamp01((t - E.bring) / 0.35); return k <= 0 ? 0 : 1 + 0.1 * Math.sin(Math.PI * Math.min(1, k * 1.3)) - Math.pow(1 - k, 3); };
let HERO = null;
function drawGame(c, t) {
  const camX = Math.max(0, zcam(t)), x = zx(t), ph = t * 15, pp = (t - 1 / 30) * 15;
  let poses; const curl = sm(t, ZCURL[0], ZCURL[1]);
  if (t < ZCURL[0]) poses = cycle(EIGHT, ph, pp);
  else if (curl < 1) poses = [["crouch", 1 - curl], ["ball0", curl]];
  else poses = ballFrames(t * 24, (t - 1 / 30) * 24);
  const a = 1 - sm(t, ZIN[0], ZIN[1]);
  const gy = zoneGround(x), py = zoneGround(ZPORT) - 17;
  const V = drawZone(c, { camX, t, sonic: a > 0 ? { x, poses, a } : null,
    portal: (L, cam) => { const o = zportOpen(t); if (o > 0) portal(L, R(ZPORT - cam + 3), R(py), 12, 18, t, o, 1, 1); },
    over: (L, cam) => { if (t > ZIN[0] - 0.05) portal(L, R(ZPORT - cam + 3), R(py), 12, 18, t, zportOpen(t), sm(t, ZIN[0], ZIN[1]) * 0.5, 1); } });
  HERO = V.hero ? { ...V.hero, kind: "zone", N: ZN, stand: 39 * ZN } : null;
  return { kind: "zone", N: ZN };
}

// ================================================================ 2) OUR city: Sonic's story path
// arrival (N = 6): the ball rolls out of the portal at X 0, uncurls at X 1.0 by the passer-by
const AR = { port: 0.0, X1: 1.0, out: [CUT, CUT + 0.5], uncurl: [CUT + 0.5, CUT + 0.78], close: [6.6, 7.1] };
// the run along the promenade: 15.3 → 24.9, X 1.0 → 39.0 (TV1 at 37.6)
const RUN0 = 15.3, RUN1 = 24.9, RUNX1 = 38.9;
const vRunRaw = (t) => t < RUN0 || t > RUN1 ? 0 : Math.min(sm(t, RUN0, RUN0 + 1.0), 1 - sm(t, RUN1 - 0.7, RUN1));
const runInt = integral(vRunRaw, RUN0), RUNK = (RUNX1 - AR.X1) / runInt(RUN1 + 0.1);
// 6b walk: X 39.0 → 41.6 ; to the hill foot 40.5 → 41.4: X 41.6 → 46.6
const WALK6B = [33.5, 34.5], TOHILL = [40.45, 41.35], FOOT = 46.6;
// the hill roll (N = 5): top at X 71.5 (terrace), curl on «curled», roll left down to the foot (48) and along the flat
const HTOP = 71.5, ROLL0 = E.curled + 0.2, HROLL_END = 53.25;
const vRoll = (t) => t < ROLL0 ? 0 : t < 49.7 ? lerp(0, 7.6, eio((t - ROLL0) / (49.7 - ROLL0)) * 0.65 + 0.35 * clamp01((t - ROLL0) / (49.7 - ROLL0))) : 7.6;
const rollInt = integral(vRoll, ROLL0), RFIX = (HTOP - 48) / rollInt(49.7);
const rollX = (t) => HTOP - rollInt(t) * (t < 49.7 ? RFIX : 1) - (t >= 49.7 ? (RFIX - 1) * rollInt(49.7) : 0);
// the square (N = 2 wide; ride cam at the loop plane; N = 6 flat)
const SQ = { arriveX: -65.2, roll: [53.4, 54.35], uncurl: [54.35, 54.65], build: [E.add - 0.05, E.add + 1.5] };
const RIDE = { start: 60.42, X0: -62.6, bottom: 60.95, climbEnd: 61.38, hold: 61.52, slideEnd: 61.92, stop: 62.15, dash: [62.18, 62.42], ballIn: 62.55, loop0: 62.78, loop1: 63.62, exit: 64.25, maxTh: 1.25 };
const FLAT = { t0: 64.3, X0: -56.0, stop: 68.3, uncurl: [68.35, 68.65] };
const vFlat = (t) => (t < FLAT.t0 ? 5 : t > FLAT.stop ? 0 : 5 * (1 - (t - FLAT.t0) / (FLAT.stop - FLAT.t0)));
const flatInt = integral(vFlat, FLAT.t0), FLATX1 = FLAT.X0 + flatInt(FLAT.stop + 0.1);
// the finale on the hill (N = 5): roll down from X 60, stop at 43.4 by the portal at 42.2
const FIN = { t0: 71.35, X0: 58.5, stop: 73.35, X1: 43.4, uncurl: [73.38, 73.68], port: 42.15 };
const finX = (t) => lerp(FIN.X0, FIN.X1, eout(clamp01((t - FIN.t0) / (FIN.stop - FIN.t0)) * 1.0) * 0.55 + 0.45 * clamp01((t - FIN.t0) / (FIN.stop - FIN.t0)));

/** Sonic in the city at t → { X, Y (above ground), Z, poses, rot, mir, ball, speed (illustrative m/s), a } */
function sonicAt(t) {
  const ph = (rate) => [t * rate, (t - 1 / 30) * rate];
  // arrival
  if (t < AR.uncurl[1] + 0.2) {
    const u = clamp01((t - AR.out[0]) / (AR.out[1] - AR.out[0])), X = lerp(AR.port - 0.1, AR.X1, eout(u)), Y = 0.25 * Math.sin(Math.PI * Math.min(1, u * 1.15)) * (1 - u) ;
    const k = sm(t, AR.uncurl[0], AR.uncurl[0] + 0.12), k2 = sm(t, AR.uncurl[0] + 0.16, AR.uncurl[1]);
    if (k <= 0) { const [p, q] = ph(20 * (1 - u * 0.6)); return { X, Y, Z: ZM, poses: ballFrames(p, q), ball: true, a: 1 }; }
    return { X: AR.X1, Y: 0, Z: ZM, poses: k2 > 0 ? [["crouch", 1 - k2], ["stand", k2]] : [["ball0", 1 - k], ["crouch", k]], a: 1 };
  }
  if (t < RUN0) {                                                                        // standing by the passer-by; impatient tap
    const tap = t > 12.1 && t < 14.9, f = Math.floor((t - 12.1) * 6) % 2;
    const look = win(t, E.first - 0.15, E.one2 - 0.2, 0.12, 0.15);                    // looks up at the game window
    if (tap) { const k = Math.min(sm(t, 12.1, 12.2), 1 - sm(t, 14.8, 14.9)); return { X: AR.X1, Y: 0, Z: ZM, poses: k < 1 ? [["stand", 1 - k], [f ? "tap1" : "tap0", k]] : [[f ? "tap1" : "tap0", 1]], a: 1 }; }
    return { X: AR.X1, Y: 0, Z: ZM, poses: [["stand", 1 - look], ["lookup", look]], a: 1 };
  }
  if (t < RUN1 + 0.05) {                                                                 // the run: legs → blur → figure-eight → skid
    const X = AR.X1 + runInt(t) * RUNK, v = vRunRaw(t) * 4.4, [p, q] = ph(10 + 8 * vRunRaw(t));
    let poses; if (t < RUN0 + 0.7) poses = cycle(RUN, p, q); else if (t < RUN0 + 1.4) poses = cycle(BLUR, p, q); else if (t < RUN1 - 0.65) poses = cycle(EIGHT, p, q); else if (t < RUN1 - 0.45) poses = cycle(RUN, p, q); else poses = [["skid", 1]];
    if (t > RUN0 - 0.1 && t < RUN0 + 0.05) poses = [["stand", 1 - sm(t, RUN0 - 0.1, RUN0 + 0.05)], [poses[0][0], sm(t, RUN0 - 0.1, RUN0 + 0.05)]];
    const sk = sm(t, RUN1 - 0.48, RUN1 - 0.42); if (sk > 0 && sk < 1) poses = [[poses[0][0], 1 - sk], ["skid", sk]];
    return { X, Y: 0, Z: ZM, poses, speed: v, a: 1, run: true };
  }
  if (t < 33.5) {                                                                        // 6a: stand, turn to TV1, surprised
    const st = sm(t, RUN1 + 0.05, RUN1 + 0.2), look = sm(t, E.police - 0.05, E.police + 0.1), sur = sm(t, E.three, E.three + 0.12), calm = sm(t, E.thats3 + 0.6, E.thats3 + 0.75);
    let poses = st < 1 ? [["skid", 1 - st], ["stand", st]] : look <= 0 ? [["stand", 1]] : look < 1 ? [["stand", 1 - look, false], ["lookup", look, true]] : sur <= 0 ? [["lookup", 1, true]] : sur < 1 ? [["lookup", 1 - sur, true], ["surprised", sur, true]] : calm < 1 ? [["surprised", 1 - calm, true], ["lookup", calm, true]] : [["lookup", 1, true]];
    return { X: RUNX1, Y: 0, Z: ZM, poses, a: 1 };
  }
  if (t < TOHILL[0]) {                                                                   // 6b: walk right under TV2, turn, surprised at the boom
    const u = clamp01((t - WALK6B[0]) / (WALK6B[1] - WALK6B[0])), X = lerp(RUNX1, 41.6, eio(u)), [p, q] = ph(9);
    if (t < WALK6B[0] + 0.12) { const k = sm(t, WALK6B[0], WALK6B[0] + 0.12); return { X, Y: 0, Z: ZM, poses: [["lookup", 1 - k, true], ["run1", k, false]], a: 1 }; }
    if (t < WALK6B[1]) return { X, Y: 0, Z: ZM, poses: cycle(RUN, p, q), a: 1 };
    const look = sm(t, WALK6B[1], WALK6B[1] + 0.12), sur = sm(t, E.sound - 0.05, E.sound + 0.08), calm = sm(t, E.name - 0.2, E.name);
    const poses = look < 1 ? [["run1", 1 - look, false], ["lookup", look, true]] : sur <= 0 ? [["lookup", 1, true]] : sur < 1 ? [["lookup", 1 - sur, true], ["surprised", sur, true]] : calm < 1 ? [["surprised", 1 - calm, true], ["point", calm, true]] : [["point", 1, true]];
    return { X, Y: 0, Z: ZM, poses, a: 1 };
  }
  if (t < 44.0) {                                                                        // 7: to the hill foot, skid, look up the steep street
    const u = clamp01((t - TOHILL[0]) / (TOHILL[1] - TOHILL[0])), X = lerp(41.6, FOOT, eio(u)), [p, q] = ph(14);
    if (t < TOHILL[0] + 0.12) { const k = sm(t, TOHILL[0] - 0.02, TOHILL[0] + 0.12); return { X, Y: 0, Z: ZM, poses: [["point", 1 - k, true], ["run0", k, false]], a: 1 }; }
    if (t < TOHILL[1] - 0.2) return { X, Y: 0, Z: ZM, poses: cycle(t < TOHILL[0] + 0.4 ? RUN : BLUR, p, q), a: 1, run: true, speed: 3 };
    const sk = sm(t, TOHILL[1] - 0.2, TOHILL[1] - 0.12), st = sm(t, TOHILL[1] + 0.25, TOHILL[1] + 0.4), lk = sm(t, E.feel - 0.3, E.feel - 0.15);
    const poses = sk < 1 ? [["blur0", 1 - sk], ["skid", sk]] : st < 1 ? [["skid", 1 - st], ["stand", st]] : [["stand", 1 - lk], ["lookup", lk]];
    return { X, Y: 0, Z: ZM, poses, a: 1 };
  }
  if (t < 53.2) {                                                                        // 8–9: at the top, curl, roll down, level with the car
    if (t < ROLL0 - 0.25) { const st = t < E.curled - 0.12 ? [["lookup", 1 - sm(t, 44.3, 44.45), true], ["stand", sm(t, 44.3, 44.45), true]] : null; const k = sm(t, E.curled - 0.12, E.curled - 0.02);
      return { X: HTOP, Y: 0, Z: ZM, poses: st ?? [["stand", 1 - k, true], ["crouch", k, true]], a: 1 }; }
    if (t < ROLL0) { const k = sm(t, ROLL0 - 0.25, ROLL0 - 0.12); return { X: HTOP, Y: 0, Z: ZM, poses: [["crouch", 1 - k, true], ["ball0", k, true]], a: 1, ball: true }; }
    const X = rollX(t), v = vRoll(t), sp = spinRoll(t); return { X, Y: 0, Z: ZM, poses: ballFrames(sp, spinRoll(t - 1 / 30)).map(([n, w]) => [n, w, true]), ball: true, speed: -v, a: 1 };
  }
  if (t < 60.15) {                                                                       // the square (wide): roll in, uncurl, watch the loop
    const u = clamp01((t - SQ.roll[0]) / (SQ.roll[1] - SQ.roll[0])), X = lerp(-61.0, SQ.arriveX, eout(u)), [p, q] = ph(22 * (1 - u));
    if (t < SQ.uncurl[0]) return { X, Y: 0, Z: ZM, poses: ballFrames(sqSpin(t), sqSpin(t - 1 / 30)).map(([n, w]) => [n, w, true]), ball: true, a: 1 };
    const k = sm(t, SQ.uncurl[0], SQ.uncurl[0] + 0.12), k2 = sm(t, SQ.uncurl[0] + 0.16, SQ.uncurl[1]), turn = sm(t, E.twostory - 0.3, E.twostory - 0.15), lk = sm(t, E.you, E.you + 0.15), tap = t > E.bottom && t < E.fall1 - 0.2, f = Math.floor(t * 6) % 2;
    if (k2 < 1) return { X, Y: 0, Z: ZM, poses: k2 > 0 ? [["crouch", 1 - k2, true], ["stand", k2, true]] : [["ball0", 1 - k, true], ["crouch", k, true]], a: 1 };
    if (turn < 1) return { X, Y: 0, Z: ZM, poses: [["stand", 1 - turn, true], ["stand", turn, false]], a: 1 };
    if (tap) return { X, Y: 0, Z: ZM, poses: [[f ? "tap1" : "tap0", 1]], a: 1 };
    return { X, Y: 0, Z: ZM, poses: [["stand", 1 - lk], ["lookup", lk]], a: 1 };
  }
  if (t < 64.05) return rideAt(t);
  if (t < 71.7) {                                                                // the flat: the ball slows to a stop; annoyed; points at the hill
    const X = Math.min(FLATX1, FLAT.X0 + flatInt(t)), v = vFlat(t), sp = flatSpin(t);
    if (t < FLAT.uncurl[0]) return { X, Y: 0, Z: LZ, poses: ballFrames(sp, flatSpin(t - 1 / 30)), ball: true, speed: v, a: 1 };
    const k = sm(t, FLAT.uncurl[0], FLAT.uncurl[0] + 0.12), k2 = sm(t, FLAT.uncurl[0] + 0.16, FLAT.uncurl[1]), an = sm(t, FLAT.uncurl[1], FLAT.uncurl[1] + 0.12), lk = sm(t, E.so3 + 0.2, E.so3 + 0.35), pt = sm(t, E.superpower, E.superpower + 0.12);
    const poses = k2 <= 0 ? [["ball0", 1 - k], ["crouch", k]] : k2 < 1 ? [["crouch", 1 - k2], ["annoyed", k2]] : lk <= 0 ? [["annoyed", 1]] : lk < 1 ? [["annoyed", 1 - lk], ["lookup", lk]] : [["lookup", 1 - pt], ["point", pt]];
    void an; return { X, Y: 0, Z: LZ, poses, a: 1 };
  }
  // finale: roll down the hill again, stop by the portal, uncurl facing it, surprised at the silhouette
  const X = finX(t), v = Math.max(0, (finX(t) - finX(t + 0.05)) / 0.05);
  if (t < FIN.uncurl[0]) { const sp = finSpin(t); return { X, Y: 0, Z: ZM, poses: ballFrames(sp, finSpin(t - 1 / 30)).map(([n, w]) => [n, w, true]), ball: true, speed: -v, a: 1 }; }
  const k = sm(t, FIN.uncurl[0], FIN.uncurl[0] + 0.12), k2 = sm(t, FIN.uncurl[0] + 0.16, FIN.uncurl[1]), sur = sm(t, E.creeper - 0.05, E.creeper + 0.1), calm = sm(t, E.follow - 0.3, E.follow - 0.15);
  const poses = k2 <= 0 ? [["ball0", 1 - k, true], ["crouch", k, true]] : k2 < 1 ? [["crouch", 1 - k2, true], ["stand", k2, true]] : sur <= 0 ? [["stand", 1, true]] : sur < 1 ? [["stand", 1 - sur, true], ["surprised", sur, true]] : calm < 1 ? [["surprised", 1 - calm, true], ["point", calm, true]] : [["point", 1, true]];
  return { X: FIN.X1, Y: 0, Z: ZM, poses, a: 1 };
}
// spin phases (ball frames per second ≤ 15: a new frame at most every 2 video frames, game cadence)
const spinRoll = integral((t) => Math.min(15, vRoll(t) * 2.4 + (t > ROLL0 ? 3 : 0)), ROLL0);
const flatSpin = integral((t) => Math.min(15, vFlat(t) * 2.6), FLAT.t0 - 0.4);
const finSpin = integral((t) => Math.min(15, 4 + Math.max(0, (finX(t) - finX(t + 0.05)) / 0.05) * 2.4), FIN.t0 - 0.4);
const sqSpin = integral((t) => 15 * (1 - clamp01((t - SQ.roll[0]) / (SQ.roll[1] - SQ.roll[0]))), 53.0);
// the loop ride (ride camera, Sonic on the loop plane Z = LZ): θ = 0 at the bottom, up the right side
const thRun = (t) => t < RIDE.bottom ? 0 : t < RIDE.climbEnd ? RIDE.maxTh * eout((t - RIDE.bottom) / (RIDE.climbEnd - RIDE.bottom)) : t < RIDE.hold ? RIDE.maxTh : RIDE.maxTh * (1 - ein((t - RIDE.hold) / (RIDE.slideEnd - RIDE.hold)));
const thBall = (t) => t < RIDE.loop0 ? 0 : t > RIDE.loop1 ? TAU : TAU * ((t - RIDE.loop0) / (RIDE.loop1 - RIDE.loop0) * 0.8 + 0.2 * eio((t - RIDE.loop0) / (RIDE.loop1 - RIDE.loop0)));
function rideAt(t) {
  const [p, q] = [t * 15, (t - 1 / 30) * 15];
  if (t < RIDE.dash[1]) {
    if (t < RIDE.bottom) { const X = lerp(RIDE.X0, LX, clamp01((t - RIDE.start) / (RIDE.bottom - RIDE.start))); return { X, Y: 0, Z: LZ, poses: cycle(t < RIDE.start + 0.2 ? BLUR : EIGHT, p, q), a: 1, run: true, speed: 4 }; }
    if (t < RIDE.slideEnd) { const th = thRun(t), sl = sm(t, RIDE.hold - 0.04, RIDE.hold + 0.06); return { loop: th, poses: sl <= 0 ? cycle(EIGHT, p, q) : sl < 1 ? [["eight1", 1 - sl], ["skid", sl]] : [["skid", 1]], a: 1 }; }
    if (t < RIDE.dash[0]) { const u = clamp01((t - RIDE.slideEnd) / (RIDE.stop - RIDE.slideEnd)), X = lerp(LX, LX - 1.7, eout(u)); return { X, Y: 0, Z: LZ, poses: [["skid", 1]], a: 1 }; }
    const u = clamp01((t - RIDE.dash[0]) / (RIDE.dash[1] - RIDE.dash[0])), X = lerp(LX - 1.7, LX - 5.4, ein(u)), k = sm(t, RIDE.dash[0], RIDE.dash[0] + 0.08);
    return { X, Y: 0, Z: LZ, poses: k < 1 ? [["skid", 1 - k, false], ["blur0", k, true]] : cycle(BLUR, p, q).map(([n, w]) => [n, w, true]), a: 1, run: true, speed: -6, mirSpeed: true };
  }
  if (t < RIDE.ballIn) return { X: LX - 6, Y: 0, Z: LZ, poses: [["ball0", 1]], a: 0 };
  const sp = t * 30;
  if (t < RIDE.loop0) { const X = lerp(LX - 4.6, LX, clamp01((t - RIDE.ballIn) / (RIDE.loop0 - RIDE.ballIn))); return { X, Y: 0, Z: LZ, poses: ballFrames(sp, sp - 1), ball: true, a: sm(t, RIDE.ballIn, RIDE.ballIn + 0.06), speed: 20 }; }
  if (t < RIDE.loop1) return { loop: thBall(t), poses: ballFrames(sp, sp - 1), ball: true, a: 1, speed: 20 };
  const u = clamp01((t - RIDE.loop1) / (RIDE.exit - RIDE.loop1)), X = LX + 5.5 * u * (1 - 0.25 * u); return { X, Y: 0, Z: LZ, poses: ballFrames(sp * (1 - 0.3 * u), sp * (1 - 0.3 * u) - 1), ball: true, a: 1, speed: 12 };
}

// ---------------------------------------------------------------- people, cars
const LOOKS = {
  arrival: { h: 1.72, skin: "skinC", top: "coral", skirt: "denim", legs: "skinC", shoe: "white", hair: "brown", style: "pony", bag: "straw" },
  runner: { h: 1.80, skin: "skinD", top: "lime", legs: "black", shorts: "black", shoe: "white", hair: "dark", style: "short" },
  w1: { h: 1.66, skin: "skinA", top: "sky", legs: "khaki", shorts: "khaki", shoe: "white", hair: "blond", style: "bob", bag: "straw" },
  w2: { h: 1.84, skin: "skinB", top: "white", legs: "navy", shoe: "brown", hair: "dark", style: "short", cap: "coral", glasses: true },
  w3: { h: 1.70, skin: "skinC", top: "mustard", skirt: "teal", legs: "skinC", shoe: "black", hair: "ginger", style: "long", bag: "teal" },
  w4: { h: 1.76, skin: "skinD", top: "teal", legs: "denim", shorts: "denim", shoe: "white", hair: "dark", style: "curly", backpack: "coral" },
  w5: { h: 1.62, skin: "skinA", top: "lilac", legs: "white", shoe: "white", hair: "greyH", style: "bun", bag: "straw" },
};
const WALKERS = [
  { X: 9, v: -0.9, Z: -0.6, look: "w1" }, { X: -6, v: 0.85, Z: -1.6, look: "w2" }, { X: 26, v: 0.8, Z: -0.9, look: "w3" }, { X: 44, v: -0.75, Z: -2.0, look: "w4" },
  { X: 18, v: -0.8, Z: -7.4, look: "w5" }, { X: 60, v: 0.6, Z: -2.2, look: "w2" }, { X: 54, v: -0.7, Z: -0.8, look: "w5" },
];
const RUNNER = { t0: E.usain2 - 0.2, Z: 1.0 };
const runnerX = (t) => { const s = AR.X1 + runInt(Math.max(RUN0, RUNNER.t0)) * RUNK - 3.2; return s + 6.4 * (t - RUNNER.t0); };
const RUNNER2 = { t0: 49.5, X0: 31, v: -3.6, Z: 0.6 };                // jogging the other way in shot 9; the ball leaves him behind
// cars: [X0 at t = 0, speed m/s, lane Z, colour, dir, van]
const TRAFFIC = [[-40, 7.5, -7.0, 0, 1], [10, 6.8, -7.0, 2, 1, true], [120, -7.2, -5.2, 1, -1], [70, -6.5, -5.2, 3, -1], [200, -7.8, -5.2, 4, -1], [-120, 8.0, -7.0, 3, 1], [260, -7.0, -5.2, 0, -1, true]];
const CAR88 = { body: 1, Z: -5.2 };                                    // the blue hatchback that levels with the ball (shot 9)
const car88X = (t) => { const b = rollX(t); return b + lerp(7.5, 0.3, sm(t, 49.9, E.as)) + (t > E.highway + 0.3 ? -2.5 * (t - E.highway - 0.3) : 0); };
function cars(t) {
  const out = [];
  for (const [x0, v, Z, ci, dir, van] of TRAFFIC) { const X = x0 + v * t, spin = X * 3; out.push({ X, Z, body: CARS[ci], dir, van, spin }); }
  if (t > 49.0 && t < HROLL_END + 0.4) out.push({ X: car88X(t), Z: CAR88.Z, body: CARS[CAR88.body], dir: -1, spin: car88X(t) * 3 });
  return out;
}
function people(c, C, t, key) {
  const items = [];
  const add = (X, Z, look, p) => { const [fx] = C.P(X, gY(X), Z), s = C.k(Z); if (fx < -1.2 * s || fx > c.w + 1.2 * s || C.d - Z < 0.6) return; items.push([Z, () => { const [x, y] = C.P(X, gY(X), Z); drawPerson(c, x, y, s, t, LOOKS[look] ?? look, p, {}); }]); };
  if (key.zRef === ZM) {
    for (const w of WALKERS) { const X = w.X + w.v * t; add(X, w.Z, w.look, { walk: 1, gait: Math.abs(X) / 1.3, dir: w.v > 0 ? 1 : -1 }); }
    // the arrival passer-by: stands, recoils when the ball pops out, looks down at him
    if (t < 16) { const rec = Math.min(sm(t, CUT + 0.1, CUT + 0.3), 1 - sm(t, CUT + 0.9, CUT + 1.6)); add(2.25, 1.6, "arrival", { dir: -1, recoil: rec, mouth: win(t, CUT + 0.1, CUT + 1.2, 0.1, 0.3), turn: -0.4 }); }
    if (t > RUNNER.t0 - 0.1 && t < 26) add(runnerX(t), RUNNER.Z, "runner", { walk: 1, gait: runnerX(t) / 1.6, dir: 1, lean: -0.08 });
    if (t > RUNNER2.t0 && t < HROLL_END + 0.4) { const X = RUNNER2.X0 + RUNNER2.v * (t - RUNNER2.t0); add(X, RUNNER2.Z, "runner", { walk: 1, gait: X / 1.6, dir: -1, lean: -0.08 }); }
  }
  // the square: a few people stroll along the garden wall (behind the loop plane)
  if (t > 53 && t < 72) for (const w of SQ_WALKERS) { const X = w.X + w.v * (t - 53); add(X, w.Z, w.look, { walk: 1, gait: Math.abs(X) / 1.3, dir: w.v > 0 ? 1 : -1 }); }
  return items;
}
const SQ_WALKERS = [{ X: -72, v: 0.7, Z: -8.3, look: "w3" }, { X: -44, v: -0.75, Z: -8.0, look: "w2" }, { X: -52, v: 0.6, Z: -8.4, look: "w5" }, { X: -36, v: -0.6, Z: -8.2, look: "w4" }];

// ---------------------------------------------------------------- cameras: integer sprite scale N per shot
export function camOf(k) { const kM = 39 * k.N; const C = makeCam({ x: k.cx, h: k.gy + 3, d: k.zRef + 7, f: kM * 7, hy: k.feet - kM * 3 }); C.N = k.N; C.zRef = k.zRef; return C; }
const K = (N, cx, o = {}) => ({ kind: "city", N, cx, gy: o.gy ?? 0, feet: o.feet ?? 610, zRef: o.zRef ?? ZM });
const smoothCx = (t) => sonicAt(t).X;
function cityKey(t) {
  if (t < RUN0) return K(6, lerp(0.62, 1.5, eio((t - CUT - 0.2) / 1.6)) + 0.06 * sm(t, 7, 15));
  if (t < RUN1 + 0.3) return K(6, sonicAt(t).X + 0.56);
  if (t < 33.5) return K(6, lerp(RUNX1 + 0.56, 38.45, eio((t - RUN1 - 0.3) / 1.1)));
  if (t < TOHILL[0]) return K(6, lerp(38.45, 41.15, eio((t - 33.5) / 1.1)));
  if (t < 44.15) { const s = sonicAt(t).X; return K(6, lerp(41.15, FOOT + 0.42, eio((t - TOHILL[0]) / 1.0)) + 0.3 * sm(t, 42.0, 43.8), { gy: 0.22 * sm(t, 42.0, 43.8), feet: 610 }); }
  if (t < 53.2) { const X = t < ROLL0 ? HTOP : rollX(t), cx = X - 0.5 * sm(t, ROLL0 - 0.2, ROLL0 + 0.6) + 0.15; return K(5, cx, { gy: gY(cx + 0.3), feet: 600 }); }
  if (t < 60.15) return K(2, -63.6, { feet: 610 });
  if (t < 64.05) return K(2, lerp(-59.3, -58.4, sm(t, RIDE.loop1, RIDE.exit)), { feet: 640, zRef: LZ });
  if (t < 71.7) return K(6, Math.min(FLATX1, FLAT.X0 + flatInt(t)) + 0.5, { zRef: LZ, feet: 610 });
  const X = finX(Math.min(t, FIN.stop)), cx = lerp(X + 0.2, 42.8, sm(t, FIN.stop - 0.6, FIN.stop + 0.2)); return K(5, cx, { gy: gY(cx + 0.4), feet: 600 });
}
/** the shot at t: { A, B, k } — B dissolves in over A by k (a change of N or place is a whole-frame dither dissolve) */
const DISS = [[0, 0], [44.0, 44.3], [53.2, 53.5], [60.15, 60.45], [64.05, 64.35], [71.7, 72.0]];
export function shot(t) {
  if (t < CUT - 1e-6) return { A: { kind: "zone" }, B: null, k: 0 };
  for (const [a, b] of DISS.slice(1)) if (t >= a && t < b) return { A: cityKey(a - 1e-3), B: cityKey(t), k: sm(t, a, b), hold: [a, b] };
  return { A: cityKey(t), B: null, k: 0 };
}
export function domKey(t) { const s = shot(t); return s.B && s.k >= 0.5 ? s.B : s.A; }

// ---------------------------------------------------------------- draw OUR city through one key
let SONIC_LAST = null;
export const lastHero = () => HERO;
/** the scene time used for the actors inside a dissolve: each side keeps its own moment frozen (A: before, B: after) */
function renderKey(c, t, key, tAct) {
  const C = camOf(key), N = key.N, kM = C.k(key.zRef), P = (X, Y, Z) => C.P(X, gY(X) + Y, Z);
  const s = sonicAt(tAct);
  const loopBuild = tAct < SQ.build[0] ? 0 : eio((tAct - SQ.build[0]) / (SQ.build[1] - SQ.build[0]));
  const extra = people(c, C, tAct, key);
  // the loop: back half behind everything on the plaza lane (it stands on the plane Z = LZ)
  if (key.zRef !== ZM || tAct > 53) extra.push([LZ - LOOP.half - 0.01, () => loop(c, C, LX, LZ, loopBuild, tAct, "back")]);
  // the hero on the loop plane goes in the depth-sorted list (between the loop's surface and its near rail)
  const heroOnLZ = s.Z === LZ || s.loop !== undefined;
  const drawHero = () => drawHeroAt(c, C, tAct, s, N);
  if (heroOnLZ) extra.push([LZ, drawHero]);
  if (key.zRef !== ZM || tAct > 53) extra.push([LZ + LOOP.half + 0.01, () => loop(c, C, LX, LZ, loopBuild, tAct, "front")]);
  // the portals (arrival; finale), in the hero's lane
  const portals = [];
  if (tAct >= CUT - 0.01 && tAct < AR.close[1]) portals.push([AR.port, 0.75, 0.55, 0.8, 1 - eio((tAct - AR.close[0]) / (AR.close[1] - AR.close[0]))]);
  if (tAct > E.next - 0.1 && key.N === 5) { const o = eout((tAct - (E.next - 0.05)) / 0.45), blink = 1 - 0.3 * win(tAct, E.creeper - 0.15, E.creeper + 0.75, 0.15, 0.25) * (0.5 - 0.5 * Math.cos((tAct - E.creeper + 0.15) * 2 * Math.PI * 2.2)); portals.push([FIN.port, 0.82, 0.55, 0.82, o * blink, true]); }
  drawCity(c, C, { t: tAct, cars: cars(tAct), screen: (cc, i, scr) => tvScreen(cc, i, scr, tAct), extraBack: extra });
  for (const [X, Y, rx, ry, o, fin] of portals) { if (o <= 0.01) continue; const [x, y] = P(X, Y, ZM - 0.02); portal(c, x, y, rx * kM, ry * kM, tAct, o);
    if (fin) { const a = sm(tAct, E.creeper - 0.2, E.creeper + 0.25) * o, n = Math.max(2, R(kM * 1.25 / 20)); if (a > 0) creeper(c, R(x - 6 * n + Math.sin(tAct * 2) * 2), R(y - 10 * n + 4), n, a, (xx, yy) => ((xx - x) / (0.5 * kM)) ** 2 + ((yy - y) / (0.74 * kM)) ** 2 < 1); } }
  if (!heroOnLZ) drawHero();
  return { kind: "city", C, kM, N, key, s };
}
function drawHeroAt(c, C, t, s, N) {
  if (s.a <= 0) { SONIC_LAST = null; return; }
  let fx, fy, rot = 0;
  if (s.loop !== undefined) { const th = s.loop; [fx, fy] = loopPt(C, LX, LZ, th); rot = -th; }
  else { [fx, fy] = C.P(s.X, gY(s.X) + (s.Y ?? 0), s.Z); const [, gyy] = C.P(s.X, gY(s.X), s.Z); spriteShadow(c, fx, gyy, N, 0.85 * s.a * clamp01(1 - (s.Y ?? 0) / 1.2), s.ball ? 20 : 18, 1); }
  // speed lines behind him while he runs or rolls fast
  const v = Math.abs(s.speed ?? 0);
  if (v > 2.5 && s.loop === undefined) { const dir = (s.speed ?? 0) < 0 || (s.ball && s.poses[0][2]) ? -1 : 1; speedLines(c, fx - dir * 16 * N, fy - 34 * N, fy - 4 * N, Math.min(260, v * 14 * N / 2), clamp01((v - 2.5) / 3), t, dir); }
  SONIC_LAST = drawSonic(c, fx, fy, N, s.poses, { a: s.a, rot });
  if (SONIC_LAST) { SONIC_LAST.fx = fx; SONIC_LAST.fy = fy; SONIC_LAST.ball = !!s.ball; HERO = { ...SONIC_LAST, kind: "city", stand: 39 * N }; }
}
// the TV pictures (screen space inside the projected screens)
function tvScreen(c, i, scr, t) {
  if (scr.x1 <= 0 || scr.x0 >= c.w || scr.y1 <= 0 || scr.y0 >= c.h) return;
  const on = i === 0 ? sm(t, 26.5, 26.85) : sm(t, 33.55, 33.9);
  const fill = (fn) => { for (let y = Math.max(0, scr.y0); y < Math.min(c.h, scr.y1); y++) for (let x = Math.max(0, scr.x0); x < Math.min(c.w, scr.x1); x++) { const col = fn(x, y); if (col) { const q = (y * c.w + x) * 3; c.d[q] = col[0]; c.d[q + 1] = col[1]; c.d[q + 2] = col[2]; } } };
  fill(() => [16, 18, 26]);
  if (on <= 0) return;
  // switching on: a bright line opens to a snowy screen, then the picture dissolves in
  const t0 = i === 0 ? 26.5 : 33.55, pic = sm(t, t0 + 0.25, t0 + 0.5);
  if (pic < 1) { const open = clamp01((t - t0) / 0.2), cy = (scr.y0 + scr.y1) / 2, hh = (scr.y1 - scr.y0) / 2 * open; fill((x, y) => (Math.abs(y - cy) <= Math.max(1, hh) ? (h2(x, y, Math.floor(t * 30)) > 0.5 ? [210, 214, 226] : [90, 94, 110]) : null)); }
  if (pic > 0) { if (i === 0) tvRadar(c, scr, t, sm(t, E.three - 0.05, E.three + 0.7), 300, pic); else tvSound(c, scr, t, clamp01((t - 34.2) / 1.9), t > E.sound - 0.1 ? clamp01((t - E.sound + 0.1) / 0.7) : 0, pic); }
  // a soft glass sheen
  for (let y = Math.max(0, scr.y0); y < Math.min(c.h, scr.y1); y++) for (let x = Math.max(0, scr.x0); x < Math.min(c.w, scr.x1); x++) if (((x - scr.x0) - (y - scr.y0) * 1.4 + 400) % 120 < 6) { const q = (y * c.w + x) * 3; c.d[q] += (255 - c.d[q]) * 0.18; c.d[q + 1] += (255 - c.d[q + 1]) * 0.18; c.d[q + 2] += (255 - c.d[q + 2]) * 0.18; }
}

// ================================================================ HUD (screen space) — every number on its word
const WINR = { x0: 44, y0: 160, x1: 300, y1: 338 };
const CHIP = (c, txt, cx, y, a, edge = HC.Y, sc = 2) => pill(c, txt, cx, y, a, { scale: sc, edge });
/** the game window content: a tiny zone strip + Sonic at N = 3 with the 39-cell ruler / the frame strip / the ball strip */
function windowInner(g, t, mode) {
  const r = WINR, N = 3, base = r.y1 - 24;
  for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const gy = y - base; const col = gy < 0 ? (y < r.y0 + 60 ? [60, 116, 240] : [120, 176, 255]) : gy < 4 ? [88, 204, 64] : ((Math.floor((x - r.x0) / 9) + Math.floor(gy / 9)) % 2 ? [118, 58, 24] : [156, 84, 34]); g.px(x, y, col); }
  if (mode === "ruler") {
    const sx = r.x0 + 90; drawSonic(g, sx, base, N, [["stand", 1]]);
    const rx = r.x0 + 150, grow = clamp01((t - (E.t39 - 0.35)) / 0.6), n = Math.floor(39 * grow + 1e-6);
    for (let i = 0; i < n; i++) { const y = base - (i + 1) * N; g.rect(rx, y, 10, N, i % 2 ? [255, 226, 90] : [255, 255, 255]); g.rect(rx + 10, y, 1, N, [11, 8, 18]); if (i % 10 === 9) g.rect(rx + 11, y, 8, 1, [255, 255, 255]); }
    if (n > 0) { g.rect(rx - 1, base - n * N - 1, 12, 1, [11, 8, 18]); }
  } else if (mode === "strip") {
    const ph = t * 15, sx0 = r.x0 + 40, step = 6 * N, k = sm(t, E.six - 0.25, E.six + 0.1);
    for (let i = 0; i < 3; i++) { const a = i === 2 ? 1 : 0.35 + 0.2 * i; if (k <= 0 && i < 2) continue; drawSonic(g, sx0 + i * step * 2 + 40, base, N, cycle(EIGHT, ph + i, ph + i - 0.5), { a: i < 2 ? a * k : 1, col: i < 2 ? [255, 255, 255] : undefined }); }
  } else if (mode === "ball") {
    const ph = t * 24, sx0 = r.x0 + 34, N2 = 2, step = 16 * N2, k = sm(t, E.sixteen - 0.3, E.sixteen + 0.1);
    for (let i = 0; i < 4; i++) { if (k <= 0 && i < 3) continue; drawSonic(g, sx0 + i * step * 1.8 + 24, base, N2, ballFrames(ph + i, ph + i - 0.5), { a: i < 3 ? (0.35 + 0.15 * i) * k : 1, col: i < 3 ? [255, 255, 255] : undefined }); }
  }
}
function storyHud(c, V, t) {
  if (V.kind !== "city") return;
  const C = V.C, kM = V.kM, P = (X, Y, Z) => C.P(X, gY(X) + Y, Z);
  // ---- 1 m: a bracket from the pavement to 1 m beside Sonic, the passer-by for scale
  { const a = win(t, E.about1 - 0.1, E.first - 0.35, 0.3, 0.35); if (a > 0) { const [x, y0] = P(AR.X1 + 0.45, 0, ZM), [, y1] = P(AR.X1 + 0.45, 1.0, ZM), grow = eout((t - E.about1 + 0.1) / 0.5); bracketV(c, x, y0, lerp(y0, y1, grow), a, HC.Y, 9, 1); CHIP(c, "1 m", x + 2, R(y1) - 44, a * sm(t, E.one1, E.one1 + 0.25), HC.Y, 3); } }
  // ---- the game window: ruler (39 px, 1 px ≈ 2.5 cm) → frame strip (6 px/frame × 60) → closes
  { const a = win(t, E.first - 0.25, E.t33 - 0.1, 0.35, 0.4); if (a > 0) { const xk = sm(t, E.his1 - 0.34, E.his1 - 0.06), mode = xk < 0.5 ? "ruler" : "strip"; gameWindow(c, WINR, a, (g) => windowInner(g, t, xk < 1 ? "ruler" : "strip"));
    if (xk > 0 && xk < 1) gameWindow(c, WINR, a * xk, (g) => windowInner(g, t, "strip"));
    if (mode === "ruler") { CHIP(c, "39 px", WINR.x0 + 205, WINR.y0 + 30, a * sm(t, E.t39, E.t39 + 0.25), HC.Y, 3); CHIP(c, "1 px ≈ 2.5 cm", (WINR.x0 + WINR.x1) / 2, WINR.y1 + 16, a * win(t, E.two1 - 0.05, E.his1 - 0.3, 0.25, 0.2), "#4FC8F0", 2); }
    else { const k1 = sm(t, E.six, E.six + 0.25), k2 = sm(t, E.sixty - 0.05, E.sixty + 0.25); if (k1 > 0) { if (k2 < 1) CHIP(c, "6 px/frame", (WINR.x0 + WINR.x1) / 2, WINR.y1 + 16, a * k1 * (1 - k2), HC.Y, 2); if (k2 > 0) CHIP(c, "6 px/frame × 60", (WINR.x0 + WINR.x1) / 2, WINR.y1 + 16, a * k2, HC.Y, 2); }
      const sx = WINR.x0 + 120, k = sm(t, E.six - 0.25, E.six + 0.1); if (k > 0) bracketH(c, sx - 36, sx, WINR.y0 + 20, a * k, "#FDFEED", 6, 1); } } }
  // ---- 33 km/h, RUNNER 45 / SONIC 33: the speedometer at the top right
  { const a = win(t, E.t33 - 0.3, E.but1 - 0.1, 0.3, 0.4); if (a > 0) { const v = 33 * eout((t - E.t33 + 0.2) / 0.6), rv = 45 * eout((t - E.f45 + 0.3) / 0.6), rk = sm(t, E.usain2, E.usain2 + 0.3);
    speedo(c, 380, 228, 52, [{ v, col: "#4FC8F0" }, ...(rk > 0 ? [{ v: Math.max(0, rv), col: "#C8F03A", a: rk }] : [])], a, { max: 60 });
    CHIP(c, "33 km/h", 380, 290, a * sm(t, E.t33, E.t33 + 0.25) * (1 - sm(t, E.f45 - 0.3, E.f45 - 0.05)), "#4FC8F0", 3);
    const kk = sm(t, E.f45, E.f45 + 0.25); if (kk > 0) { CHIP(c, "RUNNER 45", 380, 290, a * kk, "#C8F03A", 2); CHIP(c, "SONIC 33", 380, 324, a * kk, "#4FC8F0", 2); } } }
  // ---- TV1: MOVIE ≈300 mph, ≈480 km/h ; TV2: SPEED OF SOUND ≈1,235 km/h, SONIC = SOUND (under the screens)
  { const [tx] = C.P(TV[0].X, 0, CT.KZ), a = win(t, E.three + 0.3, 33.6, 0.3, 0.35); if (a > 0) { CHIP(c, "MOVIE ≈300 mph", Math.max(110, tx), 314, a, "#FF6A5A", 2); CHIP(c, "≈480 km/h", Math.max(110, tx), 350, a * sm(t, E.four, E.four + 0.25), "#FF6A5A", 3); } }
  { const [tx] = C.P(TV[1].X, 0, CT.KZ), a = win(t, E.twelve - 0.05, 40.3, 0.3, 0.35); if (a > 0) { CHIP(c, "SPEED OF SOUND ≈1,235 km/h", Math.max(220, Math.min(320, tx + 110)), 314, a, "#FDFEED", 2); CHIP(c, "SONIC = SOUND", Math.max(130, tx), 350, a * sm(t, E.name, E.name + 0.25), "#4FC8F0", 3); } }
  // ---- the speed ladder (6a/6b), then again in shot 9 with the new rung ROLLING 88
  { const a = win(t, E.but1 + 0.2, 40.3, 0.35, 0.4); if (a > 0) ladder(c, 288, 158, 200, [{ txt: "GAME 33", v: 33, a: 1, col: "#4FC8F0", grow: sm(t, E.but1 + 0.3, E.screen) }, { txt: "MOVIE ≈480", v: 480, a: sm(t, E.four, E.four + 0.25), col: "#FF6A5A", grow: sm(t, E.four, E.four + 0.6) }, { txt: "CARTOONS 1,235+", v: 1235, a: sm(t, E.twelve, E.twelve + 0.25), col: "#F4CA50", grow: sm(t, E.twelve, E.twelve + 0.6) }], a); }
  { const a = win(t, E.highway - 0.05, HROLL_END - 0.25, 0.3, 0.25); if (a > 0) ladder(c, 288, 158, 200, [{ txt: "GAME 33", v: 33, a: 1, col: "#4FC8F0" }, { txt: "ROLLING 88", v: 88, a: sm(t, E.highway + 0.05, E.highway + 0.3), col: "#7FE3A0", grow: sm(t, E.highway + 0.05, E.highway + 0.5) }, { txt: "MOVIE ≈480", v: 480, a: 1, col: "#FF6A5A" }, { txt: "CARTOONS 1,235+", v: 1235, a: 1, col: "#F4CA50" }], a); }
  // ---- the hill roll: ball strip «16 px/frame» in the game window, the speedometer to «88 km/h»
  { const a = win(t, E.sixteen - 0.45, E.e88 + 0.4, 0.3, 0.35); if (a > 0) { gameWindow(c, WINR, a, (g) => windowInner(g, t, "ball")); CHIP(c, "16 px/frame", (WINR.x0 + WINR.x1) / 2, WINR.y1 + 16, a * sm(t, E.sixteen, E.sixteen + 0.25), HC.Y, 2); } }
  { const a = win(t, E.rolling1, E.car - 0.45, 0.3, 0.3); if (a > 0) { const v = 88 * clamp01(vRoll(t) / 7.6); speedo(c, 380, 228, 52, [{ v, col: "#7FE3A0" }], a, { max: 100 }); CHIP(c, "88 km/h", 380, 290, a * sm(t, E.e88, E.e88 + 0.25), "#7FE3A0", 3); } }
  // ---- CAR 88 above the car that levels with the ball
  { const a = win(t, E.car - 0.05, E.highway + 0.9, 0.25, 0.3); if (a > 0 && V.N === 5) { const X = car88X(t), [x, y] = P(X, 1.6, CAR88.Z); CHIP(c, "CAR 88", Math.max(80, Math.min(400, x)), Math.max(170, R(y) - 40), a, "#7FE3A0", 3); } }
  // ---- the square: 6 m bracket, ≥ 44 km/h arrow, the dotted fall from the top
  if (V.N === 2 && V.key.zRef === ZM) {
    const [lx0, ly0] = P(LX - LOOP.r - 0.6, 0, LZ), [, ly1] = P(LX, 6.3, LZ);
    { const a = win(t, E.twostory - 0.2, E.you - 0.1, 0.3, 0.35); if (a > 0) { const grow = eout((t - E.twostory + 0.2) / 0.5); bracketV(c, lx0 - 6, ly0, lerp(ly0, ly1, grow), a, HC.Y, 8, 1); CHIP(c, "6 m", lx0 - 4, R(ly1) - 42, a * sm(t, E.twostory, E.twostory + 0.25), HC.Y, 3);
      const [hx0] = P(HOUSE2.X0, 0, LZ), [hx1, hy] = P(HOUSE2.X1, 6.3, LZ); dotted(c, [[hx0, hy], [lx0 + 20, hy]], a * 0.8 * grow, HC.Y, { w: 2, step: 8 }); } }
    { const a = win(t, E.f44 - 0.2, RIDE.start - 0.1, 0.3, 0.25); if (a > 0) { const [bx, by] = P(LX, 0.25, LZ + 0.8), k = eout((t - E.f44 + 0.2) / 0.5); arrowH(c, bx - 120, bx - 10, by + 10, a, k, HC.Y); CHIP(c, "≥ 44 km/h", bx - 70, R(by) - 30, a * sm(t, E.f44, E.f44 + 0.25), HC.Y, 3); } }
    { const a = win(t, E.fall1 - 0.15, RIDE.start - 0.1, 0.25, 0.25); if (a > 0) { const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20, X = LX + 0.35 * u, Y = 6.0 - 6.0 * u * u; pts.push(P(X, Math.max(0, Y), LZ)); } dotted(c, pts, a, "#FF6A5A", { k: eout((t - E.fall1 + 0.15) / 0.55), w: 4 }); } }
  }
  // ---- the ride: 33 < 44, 88 > 44 ✓
  if (V.N === 2 && V.key.zRef === LZ) {
    CHIP(c, "33 < 44", 380, 168, win(t, E.running2 + 0.05, E.rolling2 - 0.2, 0.25, 0.2), "#FF6A5A", 3);
    CHIP(c, "88 > 44 ✓", 380, 168, win(t, E.rolling2 + 0.05, 64.0, 0.25, 0.2), "#7FE3A0", 3);
    // the blue trail behind the looping ball
    if (t > RIDE.loop0 - 0.1 && t < RIDE.loop1 + 0.5) { const pts = []; const th1 = thBall(Math.min(t, RIDE.loop1)), th0 = Math.max(0, th1 - 2.4); for (let i = 0; i <= 24; i++) pts.push(loopPt(C, LX, LZ, lerp(th0, th1, i / 24), LOOP.r - 0.45)); trail(c, pts, win(t, RIDE.loop0 - 0.1, RIDE.loop1 + 0.05, 0.1, 0.4), 9); }
  }
  // ---- the flat: 88 → 0
  if (V.N === 6 && V.key.zRef === LZ) { const a = win(t, FLAT.t0 + 0.2, E.so3 - 0.1, 0.3, 0.35); if (a > 0) { const v = 88 * vFlat(t) / 5; speedo(c, 380, 228, 52, [{ v, col: "#7FE3A0" }], a, { max: 100 }); const w = odoW(c, 88, { scale: 3, digits: 2 }); plate(c, 380 - (w + 24) / 2, 288, w + 24, 31, a, "#7FE3A0"); odo(c, v, 380 - w / 2, 293, a, { scale: 3, digits: 2, final: 88 }); CHIP(c, "88 → 0", 380, 330, a * sm(t, FLAT.stop - 0.1, FLAT.stop + 0.2), "#7FE3A0", 3); } }
  // ---- SUPERPOWER: HILLS ; NEXT: CREEPER
  CHIP(c, "SUPERPOWER: HILLS", 270, 168, win(t, E.hills - 0.05, E.next - 0.15, 0.3, 0.3), HC.Y, 3);
  { const a = win(t, E.creeper - 0.05, 75.2, 0.3, 0.25); if (a > 0) { const [x, y] = P(FIN.port, 1.75, ZM); CHIP(c, "NEXT: CREEPER", Math.max(130, Math.min(300, x + 20)), R(y) - 34, a, "#7FE3A0", 3); } }
}

// ================================================================ the frame
let TMPW = null;
export function drawWorld(c, t) {
  if (t < CUT - 1e-6) return drawGame(c, t);
  const S = shot(t);
  if (!S.B || S.k <= 0) { const tA = S.hold ? S.hold[0] - 1e-3 : t, V = renderKey(c, t, S.A, tA); storyHud(c, V, tA); return V; }
  if (S.k >= 1) { const V = renderKey(c, t, S.B, t); storyHud(c, V, t); return V; }
  if (!TMPW || TMPW.w !== c.w) TMPW = new Canvas(c.w, c.h); TMPW.poly = c.poly; TMPW.d.fill(0);
  // inside a dissolve the outgoing side A holds its last moment, the incoming side B plays on
  const tA = S.hold[0] - 1e-3, VA = renderKey(TMPW, t, S.A, tA); const hA = HERO; storyHud(TMPW, VA, tA);
  const VB = renderKey(c, t, S.B, t); const hB = HERO; storyHud(c, VB, t);
  for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) if (bayer(x, y) >= S.k) { const i = (y * c.w + x) * 3; c.d[i] = TMPW.d[i]; c.d[i + 1] = TMPW.d[i + 1]; c.d[i + 2] = TMPW.d[i + 2]; }
  HERO = S.k >= 0.5 ? hB : hA; const V = S.k >= 0.5 ? VB : VA; V.dissolve = S.k; return V;
}
export const SOUND = { E, CUT, ZCURL, ZIN, AR, RUN0, RUN1, vRunRaw, WALK6B, TOHILL, ROLL0, HTOP, rollX, vRoll, HROLL_END, SQ, RIDE, FLAT, vFlat, FIN, thRun, thBall, car88X, runnerX, RUNNER, RUNNER2, DISS, TRAFFIC };
