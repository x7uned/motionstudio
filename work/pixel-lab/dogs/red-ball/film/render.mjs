// «Is my dog blind?» — pixel film (Kagenami), side view of one sunny park, loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture fills the frame; karaoke captions sit over a soft dithered shade.
// node render.mjs --stills 0.5,3,... | --video
// Per frame: park back → owner → dog → balls → park front → (dog vision) → panels/tags → caption shade → captions.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { ground, layer, gate, clamp01, sm, ease, lerp, win, rnd, LAYOUT } from "../../kit-v1/layout.mjs";
import * as park from "../../kit-v1/park.mjs";
import { drawDogSide, drawDogFront, DOG } from "../../kit-v1/dog.mjs";
import { drawOwner, throwBall as ownerBall } from "../../kit-v1/owner.mjs";
import { drawBall, BALL } from "../../kit-v1/ball.mjs";
import { dogVision, dogHex, blocks } from "../../kit-v1/vision.mjs";
import { tag, panel, eye as cuteEye, C as UI, RAMP } from "../../../animals/film/cute.mjs";
import { END, FPS, VOICE, WORDS, EV, SC, REL, REL_REPLAY, TAU0 } from "./timeline.mjs";
import { camera, throwK, throwBall, dogRun, keys, OWNER_X, LAND, BR, REST_Y, DOG_START, BALL_REST_TAU, FDX, STOP_X, HAND_X } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const CC = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", G: "#65DA41", PK: "#FF5A6A" };
const PO = { period: END };

// ---------------------------------------------------------------- owner
const hand = (k) => ownerBall(k, OWNER_X, 0, 1);          // world centre of the ball in the throwing mitten at throw k
// the owner's mouth changes (smile ↔ o ↔ grin) crossfade over 0.15 s, never in one frame
const MOUTH = [[0, "smile"], [1.35, "o"], [4.4, "smile"], [27.25, "o"], [29.0, "smile"], [41.45, "grin"], [42.9, "smile"]];
function ownerBase(t) {
  const o = { facing: 1, look: [0.6, 0], blink: blinkAt(t, 3.9, 0.7), brows: 0 };
  let tau = null;
  if (t < SC.hook[1] + 0.6) tau = t + TAU0; else if (t >= SC.replay[0] && t < SC.detail[0]) tau = t - REL_REPLAY; else if (t >= HANDOVER) tau = t - REL;
  o.throw = tau === null ? 1 : throwK(tau);
  if (tau !== null && tau < 0) o.holdBall = BALL.red;                                         // wind-up: the ball sits in the throwing mitten
  const scratch = Math.max(Math.min(sm(t, 1.3, 1.75), 1 - sm(t, 4.3, 4.8)), Math.min(sm(t, 27.2, 27.65), 1 - sm(t, 28.9, 29.3)));
  o.scratch = scratch; o.brows = 0.7 * scratch;
  const hk = Math.min(sm(t, EV.get2 - 0.05, EV.get2 + 0.45), 1 - sm(t, TOSS_T0 + 0.05, TOSS_T0 + 0.5));
  if (hk > 0) o.hold = { L: t < TOSS_T0 ? BALL.blue : null, R: t < TOSS_T0 + 0.1 ? BALL.yellow : null, k: hk };
  if (hk > 0.2) o.look = [0.2, -0.3];
  // the dog hands the red ball over, the owner stands up into the next throw
  o.crouch = Math.min(sm(t, HANDOVER - 0.45, HANDOVER - 0.05), 1 - sm(t, HANDOVER + 0.15, EV.throw + 0.1));
  if (o.crouch > 0) { o.crouchReach = CROUCH_REACH; o.look = [0.5, 0.6]; }
  if (t >= HANDOVER && t < REL) { o.holdBall = BALL.red; o.holdBallA = sm(t, HANDOVER, HANDOVER + 0.1); o.ballHand = 1 - sm(t, HANDOVER + 0.15, EV.throw + 0.1); o.throwW = sm(t, HANDOVER + 0.15, EV.throw + 0.1); }
  return o;
}
function ownerStates(t) {
  const base = ownerBase(t);
  let i = 0; while (i < MOUTH.length - 1 && MOUTH[i + 1][0] <= t) i++;
  const prev = i > 0 ? MOUTH[i - 1][1] : MOUTH[MOUTH.length - 1][1], k = sm(t, MOUTH[i][0], MOUTH[i][0] + 0.15);
  if (k >= 1 || prev === MOUTH[i][1]) return [[{ ...base, mouth: MOUTH[i][1] }, 0, 1]];
  return [[{ ...base, mouth: prev }, k, 1], [{ ...base, mouth: MOUTH[i][1] }, 0, k]];
}
// Character clock: blinks, wags, pants and sniffs run on TC, not on t. At the loop seam the characters are drawn twice
// (TC = t and TC = t − END, dither-crossfaded over the last 0.35 s), so frame END is frame 0 down to the tail wag.
let TC = 0;
function blinkAt(_t, every, ph) { const p = (((TC + ph) % every) + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; }

// ---------------------------------------------------------------- the dog: a list of [state, gateLo, gateHi] (crossfades)
// Facing changes go through a sitting, camera-facing moment (head turned to us → sit → stand the other way), with the
// faces aligned (side x ↔ front x + f·FDX), so the head never jumps.
const STRIDE = (g) => DOG.stride[g] || 1;
const side = (x, facing, gait, more = {}) => ({ view: "side", x, facing, gait, phase: gait === "stand" ? 0 : Math.abs(x) / STRIDE(gait), ...more });
const front = (x, t, more = {}) => ({ view: "front", x, blink: blinkAt(t, 3.6, 0.4), ears: 0.7, wag: 0.5, pant: 0.4, ...more });
function xf(a, b, t, t0, t1) { const k = sm(t, t0, t1); if (k <= 0) return [[a, 0, 1]]; if (k >= 1) return [[b, 0, 1]]; return [[a, k, 1], [b, 0, k]]; }
const bump = (t, a, b, amp = 0.6) => amp * Math.sin(Math.PI * clamp01((t - a) / (b - a)));
const PICK = DOG.side.pick, PICK_X = LAND + PICK.ball[0];          // dog x (facing left) whose mouth meets the resting ball
const C0 = DOG.side.carry0;                                          // carried-ball centre at pitch 0 (facing +1)
export const HAND_BALL = [HAND_X - C0[0], C0[1]];                    // where the dog holds the ball up for the owner
const DROP_X = HAND_X - PICK.ball[0];                                // where the dropped red ball rests by the owner

/** a walk/trot along keys [[t, x], …] with stand pauses; short gait crossfades at every start and stop */
function stroll(keysTX, t, gait, mk) {
  const x = keys(keysTX, t, false);
  const moving = (u) => { for (let i = 0; i < keysTX.length - 1; i++) if (u > keysTX[i][0] && u < keysTX[i + 1][0] && keysTX[i][1] !== keysTX[i + 1][1]) return true; return false; };
  for (const [e] of keysTX) if (Math.abs(t - e) < 0.08) { const a = moving(e - 0.1) ? gait : "stand", b = moving(e + 0.1) ? gait : "stand"; if (a !== b) return xf(mk(x, a), mk(x, b), t, e - 0.08, e + 0.08); }
  return [[mk(x, moving(t) ? gait : "stand"), 0, 1]];
}

/** the dog during a throw (τ since release) and, in the hook, the search afterwards (tH = τ − TAU0) */
function throwDog(tau, t, { search = true } = {}) {
  const tH = tau - TAU0, flying = tau < 1.5;
  const common = { ears: 0.7, tail: { wag: 0.8, height: 0.6 }, blink: blinkAt(t, 3.3, 0.2), pant: 0.6 };
  if (tau < 0) return [[side(DOG_START, 1, "stand", { ...common, pitch: -0.25, tail: { wag: 1, height: 0.8 } }), 0, 1]];
  const r = dogRun(tau);
  const running = side(r.x, 1, "run", { ...common, pitch: flying ? -0.35 : -0.1, mouth: 0.5 });
  if (tau < 1.85) return [[running, 0, 1]];
  const stop = (yaw) => side(STOP_X, 1, "stand", { ...common, pant: 0.3, pitch: -0.2 + 0.12 * Math.sin(t * 2.2), yaw, ears: 0.9, tail: { wag: 0.3, height: 0.2 } });
  if (tau < 2.07) return xf(running, stop(0), tau, 1.85, 2.07);
  if (!search) return [[stop(bump(tH, 1.05, 1.9, 0.55)), 0, 1]];
  // the search: head to us → sit and look around → stand facing left → trot back right past the ball → look at us
  if (tH < 1.25) return [[stop(sm(tH, 1.0, 1.25)), 0, 1]];
  const sitX = STOP_X + FDX, leftX = sitX + FDX;
  const sitting = front(sitX, t, { look: [Math.sin((tH - 1.5) * 4.2) * 0.8, 0], tilt: bump(tH, 1.5, 2.05, -0.6), brows: 0.6, pant: 0.2 });
  if (tH < 1.5) return xf(stop(1), sitting, tH, 1.25, 1.5);
  if (tH < 2.05) return [[sitting, 0, 1]];
  const mk = (x, g) => side(x, -1, g, { ...common, pant: 0.2, pitch: -0.22, sniff: 0.9, ears: 0.8, yaw: tH < 2.5 ? 1 - sm(tH, 2.3, 2.5) : tH > 3.3 && tH < 3.65 ? bump(tH, 3.3, 3.65, 0.5) : sm(tH, 4.2, 4.45), tail: { wag: 0.25, height: tH > 4.2 ? -0.3 : 0 } });
  if (tH < 2.3) return xf(sitting, mk(leftX, "stand"), tH, 2.05, 2.3);
  return stroll([[2.4, leftX], [3.3, 105], [3.65, 105], [4.2, 40]], tH, "trot", mk);
}

export const FRONT_X = 40 - FDX;                                     // the dog sits facing us next to the ball (S2–S4)
function dogStates(t) {
  // hook → not quite: from facing-left at x 40 (head to us) into sitting facing us
  if (t < SC.hook[1] + 0.45) {
    const s = throwDog(t + TAU0, t);
    if (t < 4.6) return s;
    return xf(s[s.length - 1][0], front(FRONT_X, t, { tilt: 0 }), t, 4.6, 4.9);
  }
  // not quite → cones → dog vision: sitting next to the ball
  if (t < SC.replay[0] + 0.4) {
    const tilt = keys([[4.95, 0], [5.15, -0.85], [5.9, -0.85], [6.2, 0.1], [7.4, 0.1], [7.7, 0.7], [8.6, 0.7], [9.0, 0]], t);
    const lk = (t > EV.see1 - 0.2 && t < EV.just) || (t > EV.that && t < SC.vision[1]) ? [0.8, 0.6] : [0, 0];
    const f = front(FRONT_X, t, { tilt, look: lk, brows: Math.min(sm(t, EV.cant2 - 0.2, EV.cant2 + 0.2), 1 - sm(t, 8.8, 9.2)) * 0.8, ears: t > EV.ballSee && t < EV.just ? 1 : 0.6 });
    if (t < SC.replay[0]) return [[f, 0, 1]];
    return xf(f, throwDog(t - REL_REPLAY, t)[0][0], t, SC.replay[0], SC.replay[0] + 0.4);
  }
  // replay in dog vision: the same throw; it stops at STOP_X and looks around
  if (t < SC.detail[0]) return throwDog(t - REL_REPLAY, t, { search: false });
  // detail: standing at STOP_X, looking across the park
  const across = (yaw = 0) => side(STOP_X, 1, "stand", { pitch: -0.12, yaw, ears: 1, tail: { wag: 0.4, height: 0.3 }, blink: blinkAt(t, 3.4, 0.1), pant: 0.3 });
  if (t < SC.nose[0] + 0.05) return [[across(), 0, 1]];
  // nose: head to us → sit → stand facing left → nose down, follow the scent to the ball, pick it up
  const sitX = STOP_X + FDX, leftX = sitX + FDX, n0 = SC.nose[0];
  if (t < n0 + 0.55) return xf(across(sm(t, n0 + 0.05, n0 + 0.3)), front(sitX, t, { look: [-0.6, 0] }), t, n0 + 0.3, n0 + 0.55);
  const pitchN = Math.min(sm(t, n0 + 1.0, n0 + 1.35), 1 - sm(t, EV.nose - 0.2, EV.nose - 0.02) * (1 - PICK.pitch)) * (t < EV.nose + 0.1 ? 1 : 1 - sm(t, EV.nose + 0.25, EV.nose + 0.6));
  const carrying = t > EV.nose - 0.02, carryA = sm(t, EV.nose - 0.02, EV.nose + 0.08);
  const mkN = (x, g) => side(x, -1, g, { pitch: Math.min(pitchN, carrying ? PICK.pitch : 1), yaw: t < n0 + 1.0 ? 1 - sm(t, n0 + 0.8, n0 + 1.0) : 0, sniff: pitchN > 0.5 && !carrying ? 1 : 0.3, ears: 0.8, tail: { wag: carrying ? 1 : 0.5, height: carrying ? 0.9 : 0.3 }, blink: blinkAt(t, 3.4, 0.1), carry: carrying ? BALL.red : null, carryA, mouth: carrying ? 0.3 : 0, pant: carrying ? 0 : 0.3 });
  if (t < n0 + 0.8) return xf(front(sitX, t, { look: [-0.6, 0] }), mkN(leftX, "stand"), t, n0 + 0.55, n0 + 0.8);
  if (t < SC.fix[0]) return stroll([[n0 + 1.1, leftX], [EV.nose - 0.12, PICK_X]], t, "walk", mkN);
  // fix: run back with the ball to the owner, drop it on the grass, watch the new balls (head turned to them)
  const f0 = SC.fix[0], drop = [41.42, 41.62];
  const pitchF = t < drop[0] ? 0 : t < drop[1] ? PICK.pitch * sm(t, drop[0], drop[1]) : PICK.pitch * (1 - sm(t, drop[1] + 0.05, drop[1] + 0.35)) - 0.3 * sm(t, drop[1] + 0.2, drop[1] + 0.5);
  const holding = t < drop[1] + 0.1, carryF = 1 - sm(t, drop[1], drop[1] + 0.1);
  const mkF = (x, g) => side(x, -1, g, { pitch: pitchF, yaw: t > EV.ball4 + 0.1 && t < 45.9 ? 0.75 * sm(t, EV.ball4 + 0.1, EV.ball4 + 0.4) * (1 - sm(t, 45.6, 45.9)) : 0, ears: t > EV.easy2 - 0.2 && t < 45.8 ? 1 : 0.7, tail: { wag: 0.9, height: 0.7 }, blink: blinkAt(t, 3.4, 0.1), carry: holding ? BALL.red : null, carryA: carryF, mouth: holding ? 0.3 : 0.5, pant: holding ? 0 : 0.5 });
  if (t < SC.loop[0] + 0.15) return stroll([[f0 + 0.15, PICK_X], [41.35, HAND_X]], t, "run", mkF);
  // loop: pick the red ball up again, lift it into the owner's crouching mitten, sit, then stand ready facing right
  const l0 = SC.loop[0] + 0.15, up = [l0 + 0.05, l0 + 0.3], lift = [l0 + 0.4, HANDOVER];
  const pitchL = t < up[1] ? PICK.pitch * sm(t, up[0], up[1]) : PICK.pitch * (1 - sm(t, lift[0], lift[1]));
  const hasBall = t > up[1] && t < HANDOVER + 0.1, carryL = Math.min(sm(t, up[1], up[1] + 0.1), 1 - sm(t, HANDOVER, HANDOVER + 0.1));
  const mkL = (yaw) => side(HAND_X, -1, "stand", { pitch: pitchL, yaw, ears: 0.8, tail: { wag: 1, height: 0.8 }, blink: blinkAt(t, 3.4, 0.1), carry: hasBall ? BALL.red : null, carryA: carryL, mouth: hasBall ? 0.3 : 0.5, pant: hasBall ? 0 : 0.6 });
  const sitL = front(HAND_X - FDX, t, { look: [0.6, -0.4], wag: 1, pant: 0.7 });
  const ready = (yaw) => side(DOG_START, 1, "stand", { pitch: -0.25, yaw, ears: 0.9, tail: { wag: 1, height: 0.8 }, blink: blinkAt(t, 3.3, 0.2), pant: 0.6 });
  if (t < HANDOVER + 0.3) return [[mkL(sm(t, HANDOVER + 0.05, HANDOVER + 0.3)), 0, 1]];
  if (t < HANDOVER + 0.55) return xf(mkL(1), sitL, t, HANDOVER + 0.3, HANDOVER + 0.55);
  if (t < REL - 0.6) return [[sitL, 0, 1]];
  if (t < REL - 0.35) return xf(sitL, ready(1), t, REL - 0.6, REL - 0.35);
  if (t < REL) return [[ready(1 - sm(t, REL - 0.35, REL - 0.1)), 0, 1]];
  return throwDog(t - REL, t);
}
function drawDog(c, G, t, s) {
  const o = { ...s, a: 1 };
  if (s.carry && (s.carryA ?? 1) < 1) { const ka = s.carryA ?? 1; o.carry = ka <= 0 ? null : (g, sx, sy, rPx) => drawBall(fade(g, ka), G, G.wx(sx), G.wy(sy), { ramp: s.carry, r: rPx / G.z }); }
  return s.view === "front" ? drawDogFront(c, G, s.x, 0, t, o) : drawDogSide(c, G, s.x, 0, t, o);
}

// ---------------------------------------------------------------- balls
const HANDOVER = EV.red6 + 0.38;                                     // the dog's lifted ball meets the owner's mitten
const CROUCH_REACH = [HAND_BALL[0] - OWNER_X, HAND_BALL[1]];
const TOSS_T0 = EV.ball4 + 0.05;                                     // blue and yellow leave the owner's hands
function redBall(t) {
  // hook / replay / final throw (in the owner's hand while winding up: drawn by the owner)
  if (t >= SC.replay[0] && t < SC.replay[0] + 0.4) return { x: LAND, y: REST_Y, spin: 0, swap: { to: throwBall(t - REL_REPLAY, hand), k: sm(t, SC.replay[0], SC.replay[0] + 0.4) } };
  let tau = null;
  if (t < SC.replay[0]) tau = t + TAU0; else if (t < SC.detail[0]) tau = t - REL_REPLAY; else if (t >= REL - 0.05) tau = t - REL;
  if (tau !== null) return throwBall(tau, hand);
  if (t < EV.nose + 0.08) return { x: LAND, y: REST_Y, spin: throwBall(9, hand).spin, a: 1 - sm(t, EV.nose - 0.02, EV.nose + 0.08) };
  if (t < 41.62) return null;                                         // in the dog's mouth (drawn by the dog)
  const up1 = SC.loop[0] + 0.15 + 0.3;
  if (t < up1 + 0.1) return { x: DROP_X, y: REST_Y, spin: 2.2, a: Math.min(sm(t, 41.62, 41.72), 1 - sm(t, up1, up1 + 0.1)) };
  return null;                                                        // back in the dog's mouth, then the owner's hand
}
// blue and yellow: raised by the owner, tossed onto the lawn, dissolved away before the loop
const TOSS = [{ ramp: "blue", x1: -60, t0: TOSS_T0 }, { ramp: "yellow", x1: 30, t0: TOSS_T0 + 0.1 }];
let TOSS_FROM = null;
function tossFrom() {
  if (TOSS_FROM) return TOSS_FROM;
  const a = drawOwner(new Canvas(GW, GH, K), ground(camera(TOSS_T0 - 0.01)), OWNER_X, 0, TOSS_T0 - 0.01, { ...ownerBase(TOSS_T0 - 0.01), mouth: "grin" });
  return (TOSS_FROM = [a.world.balls.L, a.world.balls.R]);
}
function extraBalls(t) {
  const out = [];
  for (const [i, b] of TOSS.entries()) {
    if (t < b.t0) continue;
    const a = 1 - sm(t, 45.95, 46.55); if (a <= 0) continue;
    const start = tossFrom()[i], T = 0.55, u = clamp01((t - b.t0) / T);
    if (u < 1) out.push({ ramp: b.ramp, x: lerp(start[0], b.x1, u), y: lerp(start[1], REST_Y, u) - 70 * 4 * u * (1 - u), spin: u * 6, a });
    else { const v = clamp01((t - b.t0 - T) / 0.3); out.push({ ramp: b.ramp, x: b.x1 + 6 * v, y: REST_Y - 8 * 4 * v * (1 - v), spin: 6 + v * 2, a, squash: v < 0.15 ? 0.4 : 0 }); }
  }
  return out;
}

// ---------------------------------------------------------------- overlays
function bubble(c, x, y, text, a) { if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale: 3 }) + 14, h = 30, bx = R(x - w / 2), by = R(y - h - 8 + (1 - a) * 4);
  g.rrect(bx - 1, by - 1, w + 2, h + 2, CC.O, 3); g.rrect(bx, by, w, h, CC.IV, 3); g.poly([[x - 5, by + h], [x + 5, by + h], [x, by + h + 8]], CC.IV); g.line(R(x - 5), by + h, R(x), by + h + 8, CC.O); g.line(R(x + 5), by + h, R(x), by + h + 8, CC.O);
  g.text(MAIN, text, bx + 7, by + 6, CC.O, { scale: 3 }); }
function label(c, text, x, y, a, col = CC.IV, scale = 2) { if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, text, { scale }); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(MAIN, text, R(x - w / 2) + dx, R(y) + dy, CC.O, { scale }); g.text(MAIN, text, R(x - w / 2), R(y), col, { scale }); }
function dashedCircle(c, x, y, r, a, col, t) { if (a <= 0) return; const g = fade(c, a), n = Math.max(16, R(r * 1.6)); for (let i = 0; i < n; i++) { if (((i + Math.floor(t * 8)) & 3) > 1) continue; const an = (2 * Math.PI * i) / n; g.px(R(x + Math.cos(an) * r), R(y + Math.sin(an) * r), col); g.px(R(x + Math.cos(an) * r) + 1, R(y + Math.sin(an) * r), col); } }
function reticle(c, x, y, s, a, col) { if (a <= 0) return; const g = fade(c, a), L = Math.max(4, R(s * 0.45));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const cx = R(x + sx * s), cy = R(y + sy * s); for (let i = 0; i < L; i++) { g.px(cx - sx * i, cy, col); g.px(cx - sx * i, cy + sy, col); g.px(cx, cy - sy * i, col); g.px(cx + sx, cy - sy * i, col); } } }
/** a colour cell (cone) icon: rounded cone with a glow, centre (x, y), height h */
function cone(c, x, y, h, col, a, empty = false) { if (a <= 0) return; const g = fade(c, a), w = R(h * 0.42);
  for (let j = 0; j <= h; j++) { const u = j / h, half = R(w * (0.25 + 0.75 * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2))) ; for (let i = -half; i <= half; i++) { const edge = Math.abs(i) === half || j === h || j === 0; const yy = R(y - h / 2 + j); if (empty) { if (edge && ((i + j) & 1) === 0) g.px(R(x + i), yy, "#8A82B0"); continue; } g.px(R(x + i), yy, edge ? CC.O : i < -half * 0.3 && u > 0.2 ? mix(col, "#FFFFFF", 0.35) : u < 0.25 ? mix(col, "#000000", 0.15) : col); } }
  if (!empty) { const tl = R(h * 0.35); g.rect(R(x) - 1, R(y + h / 2), 3, tl, CC.O); g.rect(R(x), R(y + h / 2), 1, tl, mix(col, "#000000", 0.3)); } }
function chip(c, x, y, w, h, col, a) { if (a <= 0) return; const g = fade(c, a); g.rrect(x - 1, y - 1, w + 2, h + 2, CC.O, 2); g.rrect(x, y, w, h, col, 2); g.rect(x + 2, y + 2, w - 4, 2, mix(col, "#FFFFFF", 0.25)); }

// ---------------------------------------------------------------- the across-the-park view for the detail panels
const SQ = park.PARK.squirrelSeat;                      // {x, y, p} in the coordinates of its layer (p 0.62)
/** a camera whose p-0.62 layer centres the squirrel on the bench in the panel window (screen 270, 520) */
function acrossCam(z) {
  const p = SQ.p, cam = { cx: SQ.x / p, cy: (SQ.y - 9 + 24) / p - 24, z }, s = park.squirrelSpot(cam), zp = s.G.z / (s.p ?? p) || 1;
  // one linear correction step puts the squirrel's middle exactly on the window centre (screen 270, 520)
  const lz = 1 + (z - 1) * p, X = s.G.X(s.x), Y = s.G.Y(s.y) - 15 * s.G.z;
  return { cx: cam.cx + (X - 270) / (p * lz), cy: cam.cy + (Y - 520) / (p * lz), z };
}
function worldInto(c, cam, t) { park.back(c, cam, t, PO); }

// ---------------------------------------------------------------- captions (karaoke, as in the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
export const CAPTION_Y = 682;
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAPTION_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) c.text(MAIN, txt, x + dx, y0 + dy, CC.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : CC.O) });
      c.text(MAIN, txt, x, y0, CC.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(CC.IV, K, 0.55) : toIv > bayer(X + 3, Yy + 1) ? CC.IV : CC.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- dog-vision masks (screen space), 0..1
function visionMask(t) {
  const wipe = (t0, t1, dir) => { const p = ease((t - t0) / (t1 - t0)), X = dir > 0 ? lerp(-12, GW + 12, p) : lerp(GW + 12, -12, p); return { X, dir }; };
  if (t >= EV.so1 + 0.4 && t < EV.so1 + 1.8) return { kind: "wipe", ...wipe(EV.so1 + 0.4, EV.so1 + 1.8, 1), you: "right" };
  if (t >= EV.so1 + 1.8 && t < SC.detail[0]) return { kind: "full", k: 1 };
  if (t >= SC.detail[0] && t < SC.detail[0] + 0.5) return { kind: "full", k: 1 - sm(t, SC.detail[0], SC.detail[0] + 0.5) };
  if (t >= EV.for3 && t < EV.for3 + 0.9) return { kind: "wipe", ...wipe(EV.for3, EV.for3 + 0.9, 1), you: "right" };
  if (t >= EV.for3 + 0.9 && t < 45.6) return { kind: "full", k: 1 };
  if (t >= 45.6 && t < 46.2) return { kind: "wipe", ...wipe(45.6, 46.2, -1), you: "right" };
  return null;
}
function applyVision(c, m) {
  if (!m) return;
  if (m.kind === "full") return dogVision(c, () => m.k);
  // wipe: dog vision on the left of X (soft 10-px dithered edge); during the reverse wipe the line travels back
  const X = m.X; dogVision(c, (x) => clamp01((X - x) / 10 + 0.5), 0, 0, Math.min(GW, R(X) + 8), GH);
}
function wipeLine(c, m, t) {
  if (!m || m.kind !== "wipe") return; const X = R(m.X); if (X < -4 || X > GW + 4) return;
  for (let y = 0; y < GH; y++) { if ((y >> 2) % 2 === 0) c.px(X, y, CC.IV); }
  label(c, "DOG", X - 26, 150, 1, CC.Y, 2); label(c, "YOU", X + 26, 150, 1, CC.IV, 2);
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam);
  park.back(c, cam, t, PO);
  // owner (mouth changes crossfade)
  let ownerAnchors = {};
  const seamK = sm(t, END - 0.35, END), passes = seamK <= 0 ? [[t, 0, 1]] : [[t, seamK, 1], [t - END, 0, seamK]];
  for (const [tc, plo, phi] of passes) { TC = tc; const cc = gate(c, plo, phi);
    for (const [o, lo, hi] of ownerStates(t)) { const a = drawOwner(gate(cc, lo, hi), G, OWNER_X, 0, tc, o); if (hi - lo >= 0.5 && a) ownerAnchors = a; } }
  // dog (with crossfades)
  let dogAnchors = null;
  for (const [tc, plo, phi] of passes) { TC = tc; const cc = gate(c, plo, phi);
    for (const [s, lo, hi] of dogStates(t)) { const a = drawDog(gate(cc, lo, hi), G, tc, s); if (hi - lo > 0.5 || !dogAnchors) dogAnchors = a; } }
  TC = t;
  // balls
  const rb = redBall(t);
  if (rb) {
    if (rb.swap) { drawBall(gate(c, rb.swap.k, 1), G, rb.x, rb.y, { ramp: BALL.red, spin: rb.spin }); const s2 = rb.swap.to; if (!s2.inHand) drawBall(gate(c, 0, rb.swap.k), G, s2.x, s2.y, { ramp: BALL.red, spin: s2.spin }); }
    else if (!rb.inHand && (rb.a ?? 1) > 0) drawBall(fade(c, rb.a ?? 1), G, rb.x, rb.y, { ramp: BALL.red, spin: rb.spin, squash: rb.squash ?? 0, shadow: rb.h > 0.5 ? { h: rb.h, groundY: 0 } : null });
  }
  for (const b of extraBalls(t)) drawBall(fade(c, b.a), G, b.x, b.y, { ramp: BALL[b.ramp], spin: b.spin, squash: b.squash ?? 0 });
  // scent wisps (nose scene): curls rise from the ball and lean toward the dog's nose
  const sw = Math.min(sm(t, 36.9, 37.4), 1 - sm(t, EV.nose - 0.1, EV.nose + 0.3));
  if (sw > 0) scent(c, G, t, sw, dogAnchors);
  park.front(c, cam, t, PO);
  // dog vision (before the overlays, which keep their true colours)
  const vm = visionMask(t); applyVision(c, vm);
  overlays(c, G, t, cam, rb, dogAnchors, ownerAnchors);
  wipeLine(c, vm, t);
  c.tint(0, CAPTION_Y - 44, GW, 150, (x, y) => 0.5 * Math.sin((Math.PI * (y - CAPTION_Y + 44)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function scent(c, G, t, a, dogA) {
  // three wavy scent trails rise from the ball and bend toward the dog's nose (2-px, cream with a soft dark edge)
  const g = fade(c, a), bx = G.X(LAND), by = G.Y(REST_Y) - BR * G.z * 0.5, nose = dogA?.nose ?? [bx + 60, by - 40];
  for (let k = 0; k < 3; k++) {
    const ph = (t * 0.55 + k / 3) % 1;
    for (let i = 0; i < 40; i++) { const v = ph + (i / 40) * 0.45; if (v > 1) continue;
      const fadeK = Math.sin(Math.PI * v), x = lerp(bx + (k - 1) * 3 * G.z, nose[0], v * v) + Math.sin(v * 13 + k * 2 + t * 4) * 4 * G.z * (1 - v), y = lerp(by, nose[1], v) - Math.sin(v * Math.PI) * 14 * G.z;
      if (fadeK < 0.15 + 0.6 * bayer(R(x), R(y))) continue;
      g.px(R(x) + 1, R(y) + 1, "#2A4A2A"); g.px(R(x), R(y), "#FFF4C8"); g.px(R(x) + 1, R(y), "#FFFFFF"); g.px(R(x), R(y) - 1, "#FFF4C8"); }
  }
}

function overlays(c, G, t, cam, rb, dogA, ownerA) {
  // hook: «?» over the dog
  const q = Math.max(win(t, 1.0, 4.5, 0.25, 0.3), win(t, 27.55, 29.15, 0.25, 0.3));
  if (q > 0 && dogA?.top) bubble(c, dogA.top[0], dogA.top[1] - 6, "?", q);
  // not quite: SEES THE BALL ✓, RED ×
  const bx = G.X(LAND), by = G.Y(REST_Y);
  const tSee = win(t, EV.see1 - 0.1, SC.cones[0] + 0.1, 0.25, 0.35);
  if (tSee > 0) { dashedCircle(c, bx, by, BR * G.z + 8, tSee, CC.G, t); tag(c, ["SEES THE BALL ✓"], 300, 236, tSee, CC.G, 3); }
  const tRed = win(t, EV.red2 - 0.1, SC.cones[0] + 0.1, 0.25, 0.35);
  if (tRed > 0) tag(c, ["RED ×"], 300, 292, tRed, CC.PK, 3);
  // cones
  const dim = win(t, SC.cones[0], SC.cones[1], 0.4, 0.4);
  if (dim > 0) c.tint(0, 0, GW, GH, () => 0.62 * dim, "#0B0812", 8);
  conesPanels(c, t);
  // dog vision swatches
  swatches(c, t);
  // that red ball: same colour as the grass
  const bc = win(t, EV.ball3 - 0.05, SC.vision[1] - 0.1, 0.25, 0.3);
  if (bc > 0) { dashedCircle(c, bx, by, BR * G.z + 9, bc, CC.IV, t); label(c, "BALL?", bx + BR * G.z + 44, by - 12, bc, CC.IV, 3); }
  const same = win(t, EV.same2 - 0.1, SC.vision[1] - 0.1, 0.25, 0.3);
  if (same > 0) tag(c, ["SAME COLOR", "AS THE GRASS"], 270, 150, same, CC.Y, 3);
  // replay: VHS rewind + label, tracking reticle, LOST
  replayFx(c, G, t, rb);
  // detail panels
  detailPanels(c, t);
  // nose mode
  const nm = win(t, EV.uses - 0.1, SC.fix[0] + 0.2, 0.25, 0.35);
  if (nm > 0 && dogA?.head) tag(c, ["NOSE MODE"], dogA.head[0], 170, nm, CC.Y, 3);
  // the fix: ✓ ✓ ×
  const fixA = win(t, EV.easy2 - 0.05, 45.75, 0.25, 0.3);
  if (fixA > 0) {
    const yb = G.Y(REST_Y) - BR * G.z - 46;
    for (const b of TOSS) label(c, "✓", G.X(b.x1 + 6), yb + R((1 - fixA) * 4), fixA, CC.G, 5);
    label(c, "×", G.X(DROP_X), yb, win(t, EV.spot - 0.1, 45.75, 0.25, 0.3), CC.PK, 5);
  }
}

function conesPanels(c, t) {
  const ya = win(t, EV.eyes1 - 0.15, SC.cones[1] - 0.05, 0.3, 0.35), da = win(t, EV.dogs1 - 0.15, SC.cones[1] - 0.05, 0.3, 0.35);
  const P = [{ y: 150, a: ya, who: "YOU", iris: ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF"], cones: [["#E8443C", EV.coneR, "RED"], ["#4CC85A", EV.coneG, "GREEN"], ["#3A6AF0", EV.coneB, "BLUE"]] },
             { y: 372, a: da, who: "DOG", iris: ["#1A0C04", "#3A1E0A", "#6A3A14", "#9A5A20", "#C8842E", "#E8A84A", "#F8CC7A"], cones: [["#3A6AF0", EV.blue2, "BLUE"], ["#F4CE2E", EV.yellow1, "YELLOW"]] }];
  for (const p of P) {
    if (p.a <= 0) continue;
    const y = p.y + R((1 - p.a) * 8); panel(c, 30, y, 480, 196, p.a, p.who === "YOU" ? UI.p7 : CC.Y);
    const g = fade(c, p.a); label(c, p.who, 92, y + 14, p.a, p.who === "YOU" ? UI.L : CC.Y, 3);
    cuteEye(g, 92, y + 112, 30, { ry: 32, iris: p.iris, pupil: "round", blink: 0 });
    const hd = win(t, EV.color1 - 0.1, 99, 0.3, 0.3); if (p.who === "YOU" && hd > 0) label(c, "COLOR CELLS", 340, y + 12, Math.min(p.a, hd), CC.IV, 3);
    if (p.who === "DOG") { const oa = win(t, EV.only - 0.1, 99, 0.25, 0.3); if (oa > 0) label(c, "ONLY 2", 340, y + 12, Math.min(p.a, oa), CC.Y, 3); }
    const xs = [210, 320, 430];
    p.cones.forEach(([col, at, name], i) => { const k = sm(t, at - 0.12, at + 0.15); cone(c, xs[i], y + 98 - R((1 - k) * 10), 64, col, Math.min(p.a, k)); if (k > 0) label(c, name, xs[i], y + 152, Math.min(p.a, k), CC.IV, 3); });
    if (p.who === "DOG") { const ea = Math.min(p.a, sm(t, EV.two - 0.1, EV.two + 0.2)); for (const i of [0, 1]) if (sm(t, p.cones[i][1] - 0.12, p.cones[i][1] + 0.15) < 1) cone(c, xs[i], y + 98, 64, "#000000", ea * (1 - sm(t, p.cones[i][1] - 0.12, p.cones[i][1] + 0.15)), true);
      const xa = Math.min(p.a, sm(t, EV.only - 0.1, EV.only + 0.2)); if (xa > 0) { cone(c, xs[2], y + 98, 64, "#000000", xa * 0.8, true); label(c, "×", xs[2], y + 88, xa, CC.PK, 4); } }
  }
}

function swatches(c, t) {
  const a = win(t, EV.red4 - 0.2, EV.that - 0.25, 0.3, 0.35); if (a <= 0) return;
  const y = 120 + R((1 - a) * 8); panel(c, 40, y, 460, 196, a, CC.Y);
  label(c, "YOU", 140, y + 10, a, CC.IV, 3); label(c, "DOG", 390, y + 10, a, CC.Y, 3);
  const rows = [["#D0342E", EV.red4, "RED"], ["#4C904E", EV.green3, "GREEN"]];
  rows.forEach(([col, at, name], i) => { const k = Math.min(a, sm(t, at - 0.12, at + 0.15)), yy = y + 42 + i * 58; if (k <= 0) return;
    chip(c, 70, yy, 140, 40, col, k); label(c, name, 140, yy + 10, k, CC.IV, 3);
    const k2 = Math.min(a, sm(t, at + 0.15, at + 0.45)); label(c, ">", 262, yy + 12, k2, CC.IV, 3); chip(c, 330, yy, 120, 40, dogHex(col), k2); });
  const eq = Math.min(a, sm(t, EV.same1 - 0.1, EV.same1 + 0.2)); if (eq > 0) label(c, "=", 470, y + 84, eq, CC.Y, 3);
  const dull = Math.min(a, sm(t, EV.dull - 0.1, EV.dull + 0.25)); if (dull > 0) label(c, "DULL YELLOW-BROWN", 270, y + 160, dull, CC.Y, 3);
}

function replayFx(c, G, t, rb) {
  const r0 = SC.replay[0];
  // VHS rewind: shifted rows and tracking noise for 0.45 s
  const vhs = win(t, r0 - 0.05, r0 + 0.4, 0.08, 0.15);
  if (vhs > 0) { for (let y = 0; y < GH; y++) { const n = rnd(y * 7 + Math.floor(t * 30) * 131); if (n > 1 - 0.18 * vhs) { const sh = R((rnd(y + Math.floor(t * 30)) - 0.5) * 30 * vhs); const row = c.d.slice(y * GW * 3, (y + 1) * GW * 3); for (let x = 0; x < GW; x++) { const sx = Math.min(GW - 1, Math.max(0, x - sh)); c.d[(y * GW + x) * 3] = row[sx * 3]; c.d[(y * GW + x) * 3 + 1] = row[sx * 3 + 1]; c.d[(y * GW + x) * 3 + 2] = row[sx * 3 + 2]; } if (n > 1 - 0.05 * vhs) c.rect(0, y, GW, 1, "#E8E4FF"); } } }
  const lab = win(t, r0, SC.detail[0] - 0.1, 0.2, 0.3);
  if (lab > 0) { const g = fade(c, lab); g.rrect(14, 118, 210, 26, CC.O, 2); g.text(MAIN, "<< REPLAY", 22, 124, Math.floor(t * 2) % 2 ? "#FF5A6A" : CC.IV, { scale: 2 }); tag(c, ["DOG VIEW"], 400, 118, lab, CC.Y, 2); }
  // tracking reticle: locked while the ball moves, lost once it stops
  const tau = t - REL_REPLAY; if (t < r0 + 0.3 || t > SC.detail[0] || !rb || tau < 0.05) return;
  const moving = tau < BALL_REST_TAU, lostK = sm(tau, BALL_REST_TAU, BALL_REST_TAU + 0.5), a = Math.min(sm(tau, 0.05, 0.25), 1 - sm(t, EV.grass3 + 0.2, SC.detail[0] - 0.2));
  if (a <= 0) return;
  const jitter = lostK > 0 ? (rnd(Math.floor(t * 20)) - 0.5) * 10 * lostK : 0;
  const sx = G.X(rb.x) + jitter, sy = G.Y(rb.y) + jitter * 0.6, s = 12 + 6 * lostK;
  reticle(c, sx, sy, s, a * (1 - 0.5 * lostK * (Math.floor(t * 10) % 2)), lostK > 0.5 ? CC.PK : CC.Y);
  label(c, lostK > 0.5 ? "LOST" : "TRACKING", sx, Math.max(166, sy - s - 26), a, lostK > 0.5 ? CC.PK : CC.Y, 3);
}

// two side-by-side windows on the far bench: YOU sharp, DOG coarse and in dog colours; DOG zooms ×3.75 on «four times closer»
const PW = 256, PH = 280, PY = 104, PX = [12, 272];
let ACROSS = null;
function detailPanels(c, t) {
  const a = win(t, EV.detail - 0.2, SC.detail[1] - 0.05, 0.3, 0.35); if (a <= 0) return;
  const zoom = sm(t, EV.four - 0.15, EV.closer + 0.35);
  for (const [i, who] of ["YOU", "DOG"].entries()) {
    const z = who === "DOG" ? lerp(2.2, 9.9, zoom) : 2.2, cam = acrossCam(z);
    if (!ACROSS) ACROSS = new Canvas(GW, GH, K);
    ACROSS.d.fill(0); worldInto(ACROSS, cam, t);
    const x0 = R(270 - PW / 2 + 2), y0 = R(520 - PH / 2 + 10);
    if (who === "DOG") { dogVision(ACROSS, () => 1, x0, y0, x0 + PW - 4, y0 + PH - 4); blocks(ACROSS, 4, x0, y0, x0 + PW - 4, y0 + PH - 4); }
    const px = PX[i], py = PY + R((1 - a) * 8), g = fade(c, a);
    panel(c, px, py, PW, PH + 30, a, who === "YOU" ? UI.p7 : CC.Y);
    for (let y = 0; y < PH - 4; y++) for (let x = 0; x < PW - 4; x++) { if (a < 1 && a <= bayer(px + 2 + x, py + 28 + y)) continue; const si = ((y0 + y) * GW + x0 + x) * 3, di = ((py + 28 + y) * GW + px + 2 + x) * 3; c.d[di] = ACROSS.d[si]; c.d[di + 1] = ACROSS.d[si + 1]; c.d[di + 2] = ACROSS.d[si + 2]; }
    label(c, who, px + 36, py + 6, a, who === "YOU" ? UI.L : CC.Y, 3);
    if (who === "YOU") { const k = win(t, EV.clearly - 0.1, SC.detail[1] - 0.1, 0.25, 0.3); if (k > 0) label(c, "CLEAR ✓", px + PW / 2, py + PH + 2, Math.min(a, k), CC.G, 3); }
    else { const k = Math.min(a, sm(t, EV.detail - 0.05, EV.detail + 0.3) * (1 - zoom)); if (k > 0) label(c, "BLURRY", px + PW / 2, py + PH + 2, k, CC.PK, 3);
      const k2 = win(t, EV.four - 0.05, SC.detail[1] - 0.1, 0.25, 0.3); if (k2 > 0) label(c, "4× CLOSER", px + PW / 2, py + PH + 2, Math.min(a, k2), CC.Y, 3); }
  }
  const ac = win(t, EV.across - 0.1, EV.get - 0.1, 0.25, 0.3); if (ac > 0) tag(c, ["ACROSS THE PARK"], 270, PY + PH + 50, ac, CC.IV, 3);
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
