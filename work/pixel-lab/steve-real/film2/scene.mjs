// «How strong is Minecraft Steve in our world» (IN OUR WORLD #1) · film2 — the full redraw. One persistent European street
// in late-afternoon sun seen through one camera from a 3/4 high angle (lib/view.mjs, world in metres): the portal → the
// tape and the 1 m cube → the plane tree → the concrete barrier → the bank's vault → the giant beam scales with three real-
// size elephants and the strongman → Steve lifts the 19 t block in one hand → the inventory over the facades, four tower
// silhouettes rise behind the roofs → he runs past a cyclist → the purple box → 36 boxes, 1,200,000 t, five and a half gold
// mountains behind the city → back to Steve: one step and the street breaks → NEXT: MARIO → the follow card (cta.mjs).
// Every beat is anchored to a measured word (timeline.mjs W()). All art is this film's own (assets/, lib/); no catalog art.
import { fade, bayer } from "../../../../renderer/pixel/raster.mjs";
import { W, END, VOICE_END, VOICE } from "./timeline.mjs";
import { drive, view } from "./lib/drive.mjs";
import { makeView, U, Y0, gyZ, kZ, R, lerp, sm, eio, eout, clamp01, rnd, castShadow, contact, gshadow, tintPx, wrect, box } from "./lib/view.mjs";
import { drawBackdrop, lampPost, bunting, busStop, LAMPS, LAMP_Z } from "./assets/backdrop-street.mjs";
import { drawPerson, LOOKS } from "./assets/passerby.mjs";
import { drawElephant } from "./assets/elephant.mjs";
import { drawStrongman } from "./assets/strongman.mjs";
import { drawScalesW, geomW, SC } from "./assets/beam-scales.mjs";
import { drawTreeW, drawBusW, drawCarW, drawCyclistW, drawCafeW, drawBikeW, TREE } from "./assets/street-things.mjs";
import { drawPile } from "./assets/gold-pile.mjs";
import steve from "./assets/steve.mjs";
import portal from "./assets/portal.mjs";
import shulker from "./assets/shulker-box.mjs";
import cracks from "./assets/break-cracks.mjs";
import timer from "./assets/timer.mjs";
import speedo from "./assets/speedometer.mjs";
import inv, { slotXY } from "./assets/inventory-grid.mjs";
import eiffel from "./assets/eiffel-silhouette.mjs";
import { cube, TEX, putIcon } from "./lib/blocks.mjs";
import { MAIN, C, plate, label, pill, odo, odoW, fist, mystery } from "./lib/hud.mjs";

export { sm, eio };
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const bounce = (x) => { x = clamp01(x); if (x < 0.6) return (x / 0.6) ** 2; const u = (x - 0.6) / 0.4; return 1 - 0.18 * Math.sin(Math.PI * u) * (1 - u); };
/** keyed values: init + [[t0, t1, {field: target}]] eased in order (each segment starts from the value reached before it) */
export function track(init, keys, ease = eio) {
  return (t) => { const v = { ...init }; for (const [a, b, tg] of keys) { if (t <= a) break; const k = ease((t - a) / (b - a)); for (const f in tg) v[f] = lerp(v[f], tg[f], k); } return v; };
}

// ---------------------------------------------------------------- words (single take, Scribe timings)
export const E = {
  steve1: W("steve"), minecraft1: W("minecraft"), mined1: W("mined."), lets: W("let's"), check: W("check."), checkEnd: W("check.", 1, "end"),
  steve2: W("steve", 2), one8: W("one"), meters: W("meters"), block1: W("block"), oneM: W("one", 2), side: W("side."),
  punches: W("punches"), tree: W("tree."), three1: W("three"), gone: W("gone."), goneEnd: W("gone.", 1, "end"),
  cube: W("cube"), concrete: W("concrete"), nine: W("nine"), seconds2: W("seconds", 2), secondsEnd: W("seconds", 2, "end"), bare: W("bare"), hands: W("hands."),
  heaviest: W("heaviest"), minecraft2: W("minecraft", 2), gold1: W("gold", 2), oneG: W("one", 3), cubic: W("cubic"), nineteen: W("nineteen"), tonnes1: W("tonnes,"), three2: W("three", 2), elephants: W("elephants."),
  strongest: W("strongest"), lifts: W("lifts"), half: W("half"), tonne: W("tonne."), steve3: W("steve", 3), holds1: W("holds"), hand: W("hand."),
  almost: W("almost"), forty: W("forty"), record: W("record."), his: W("his"), inventory: W("inventory"), thirty6a: W("thirty-six"), slots: W("slots,"), each2: W("each", 2), holds2: W("holds", 2), sixty4: W("sixty-four"), blocks1: W("blocks."),
  thats2: W("that's", 2), two: W("two"), goldBlocks: W("blocks", 2), about4: W("about", 4), forty4: W("forty-four"), tonnes2: W("tonnes,", 2), more2: W("more", 2), four: W("four"), eiffel: W("eiffel"), towers: W("towers."),
  and8: W("and", 5), runs: W("runs"), twenty: W("twenty"), hour: W("hour."), then: W("then"), finds: W("finds"), shulker: W("shulker"), box1: W("box."),
  it1: W("it"), holds3: W("holds", 3), twenty7: W("twenty-seven"), stacks: W("stacks,"), box2: W("box", 2), fits: W("fits"), slot2: W("slot", 2),
  fill: W("fill"), thirty6b: W("thirty-six", 2), carries: W("carries"), oneP2: W("one", 6), million: W("million"), tonnes3: W("tonnes", 3),
  thats4: W("that's", 3), five: W("five"), all: W("all"), mined2: W("mined.", 2), theres: W("there's"), problem: W("problem."),
  our3: W("our", 2), weight: W("weight."), oneS: W("one", 8), step: W("step,"), street: W("street"), breaks: W("breaks"), him: W("him", 2),
  next: W("next,"), mario: W("mario"), world3: W("world", 3), follow: W("follow,"), miss: W("miss"), end: VOICE_END,
};
{ const ws = VOICE.words, nx = (t) => { const i = ws.findIndex((w) => w.start === t); return ws[i + 1].text.toLowerCase().replace(/[^a-z-]/g, ""); };
  for (const [t, want] of [[E.oneM, "meter"], [E.oneG, "gold"], [E.oneP2, "point"], [E.oneS, "step"], [E.and8, "he"], [E.thats4, "more"], [E.him, "next"], [E.gold1, "one"], [E.goldBlocks, "about"], [E.seconds2, "bare"]])
    if (nx(t) !== want) throw new Error(`occurrence guard: ${want} got ${nx(t)}`); }

// ---------------------------------------------------------------- world layout (metres)
export const X = { portal: 2.3, land: 5.0, tree: 7.7, barrier: 10.1, bankDoor: 14.0, scales: 19.4, strong: 12.7, box: 36.2, stop: 34.6 };
const ZS = 2.7;                                                     // Steve's usual depth on the pavement
/** camera with the ground at depth Zf landing on screen row footY */
export const cam = (cx, z, footY = 610, Zf = ZS) => ({ cx: cx + 0.0071, fy: Y0 + gyZ(Zf) - (footY - 480) / z + 0.0113, z });

// ---------------------------------------------------------------- the camera
export const camAt = track(cam(3.9, 1.75, 640), [
  [E.lets - 0.1, E.checkEnd + 0.15, cam(5.2, 1.0, 600)],
  [E.steve2 - 0.3, E.steve2 + 0.5, cam(5.6, 1.6, 615)],
  [E.side - 0.2, E.punches, cam(7.3, 1.6, 620, 3.3)],
  [E.gone + 0.2, E.cube + 0.2, cam(9.6, 1.6, 620, 3.4)],
  [E.hands + 0.2, E.gold1, cam(13.9, 1.12, 610)],
  [E.gold1 + 0.1, E.cubic + 0.4, cam(17.6, 0.86, 630)],
  [E.cubic + 0.5, E.three2 - 0.8, cam(21.4, 0.72, 650, 2.2)],
  [E.strongest - 0.35, E.lifts, cam(14.5, 1.3, 620, 3.0)],
  [E.steve3 - 0.45, E.holds1 + 0.2, cam(15.6, 1.3, 625)],
  [E.almost - 0.1, E.forty + 0.3, cam(16.0, 1.06, 640)],
  [E.his - 0.3, E.inventory + 0.3, cam(16.2, 1.12, 640)],
  [E.tonnes2 + 0.2, E.more2 + 0.3, cam(17.4, 0.64, 770)],
  [E.towers + 0.25, E.and8 + 0.15, cam(18.0, 1.15, 630, 3.9)],
  [E.and8 + 0.1, E.then + 0.1, cam(34.2, 1.25, 630, 3.9)],
  [E.box2 - 0.4, E.box2 + 0.3, cam(35.2, 1.4, 630, 3.6)],
  [E.thats4 - 0.2, E.five + 0.4, cam(36.2, 0.6, 790, 3.6)],
  [E.theres - 0.1, E.problem + 0.2, cam(34.95, 1.9, 650, 3.9)],
  [E.next - 0.1, E.mario + 0.4, cam(34.95, 1.6, 640, 3.9)],
]);

// ---------------------------------------------------------------- Steve: position + parameters
const FLY = 0.86;
export const PUNCH1 = [E.punches, E.punches + 3.0];
export const PUNCH2 = [E.cube + 0.3, E.secondsEnd];
export const LIFT = [E.holds1 - 0.05, E.holds1 + 0.65];
export const STEP = { up: E.weight - 0.2, down: E.step - 0.05, sink: [E.step + 0.05, E.breaks + 0.45] };
const steveK = track({ x: X.land, z: ZS, yaw: 0.55, head: 0, walk: 0, run: 0, punch: 0, hold: 0, lift: 0, sink: 0, look: 0, down: 0 }, [
  [1.6, 2.1, { head: -0.3 }],
  [E.lets + 0.15, E.lets + 0.5, { head: -1.15 }], [E.check - 0.3, E.check + 0.05, { head: 0.55 }], [E.checkEnd + 0.1, E.checkEnd + 0.45, { head: 0 }],
  [E.steve2 - 0.2, E.steve2 + 0.3, { yaw: 0.3 }],
  [E.side + 0.05, E.side + 0.35, { yaw: 1.45, walk: 1 }], [E.side + 0.1, E.punches - 0.05, { x: X.tree - 0.82, z: 3.35 }], [E.punches - 0.25, E.punches - 0.05, { walk: 0 }],
  [PUNCH1[0] - 0.05, PUNCH1[0] + 0.15, { punch: 1 }], [PUNCH1[1] - 0.15, PUNCH1[1] + 0.05, { punch: 0 }],
  [PUNCH1[1] + 0.05, PUNCH1[1] + 0.2, { walk: 1 }], [PUNCH1[1] + 0.08, PUNCH2[0] - 0.05, { x: X.barrier - 0.92, z: 3.5 }], [PUNCH2[0] - 0.2, PUNCH2[0], { walk: 0, punch: 1 }], [PUNCH2[1] - 0.1, PUNCH2[1] + 0.1, { punch: 0 }],
  [E.hands + 0.25, E.hands + 0.45, { walk: 1, yaw: 1.5 }], [E.hands + 0.3, E.gold1 - 0.4, { x: 13.0, z: 2.6 }], [E.gold1 - 0.55, E.gold1 - 0.3, { walk: 0, yaw: 1.1 }],
  [E.oneG + 0.25, E.oneG + 0.45, { walk: 1, yaw: 1.5 }], [E.oneG + 0.3, E.cubic + 0.5, { x: 15.6, z: 2.7 }], [E.cubic + 0.35, E.cubic + 0.6, { walk: 0, yaw: 0.9 }],
  [E.three2 - 0.2, E.three2 + 0.3, { head: 0.6 }], [E.strongest - 0.3, E.strongest + 0.2, { head: -1.6 }], [E.steve3 - 0.4, E.steve3 - 0.1, { head: 0, yaw: 1.25 }],
  [LIFT[0], LIFT[1], { hold: 1 }], [E.hand + 0.2, E.hand + 0.6, { yaw: 0.45 }],
  [E.inventory + 0.1, E.inventory + 0.6, { hold: 0 }],
  [E.and8 - 0.05, E.and8 + 0.25, { run: 1, yaw: 1.55 }], [E.and8, E.and8 + 0.6, { z: 3.95 }], [E.and8, E.then - 0.15, { x: X.stop }], [E.then - 0.45, E.then - 0.1, { run: 0, yaw: 1.3 }],
  [E.shulker - 0.2, E.shulker + 0.2, { head: 0.15 }], [E.thats4 - 0.2, E.thats4 + 0.3, { head: 0, yaw: 0.6 }],
  [STEP.up - 0.3, STEP.up + 0.25, { yaw: 1.0 }], [STEP.up, STEP.up + 0.5, { lift: 1 }], [STEP.down - 0.18, STEP.down + 0.1, { lift: 0, x: X.stop + 0.28 }],
  [STEP.sink[0], STEP.sink[1], { sink: 1 }], [E.him - 0.25, E.him + 0.25, { down: 1, yaw: 0.65 }], [E.next - 0.25, E.next + 0.3, { down: 0, look: 1, yaw: 0.35 }],
]);
// gait phase: distance / stride (walk 0.92 m, run 1.84 m per cycle), integrated once at 240 Hz (pure, cached)
const GAIT = (() => { const dt = 1 / 240, n = Math.ceil(END / dt) + 2, g = new Float64Array(n); let p = steveK(0);
  for (let i = 1; i < n; i++) { const s = steveK(i * dt), dx = Math.hypot(s.x - p.x, s.z - p.z); p = s; g[i] = g[i - 1] + dx / (0.92 + 0.92 * s.run); } return g; })();
export const gaitAt = (t) => { const i = Math.max(0, Math.min(GAIT.length - 2, t * 240)), i0 = Math.floor(i); return lerp(GAIT[i0], GAIT[i0 + 1], i - i0); };
export function steveAt(t) {
  const s = steveK(t); let x = s.x, z = s.z, h = 0, roll = 0;
  if (t < FLY) { const k = t / FLY; x = lerp(X.portal + 0.3, X.land, eout(k)); z = lerp(2.2, ZS, eout(k)); h = 0.45 * (1 - k) + 1.2 * k * (1 - k); roll = -2.3 * (1 - eout(k)); }
  return { ...s, x, z, h, roll };
}

// ---------------------------------------------------------------- other keyed things
export const PORTAL_KEYS = [[-1, "open"], [E.lets + 0.2, "close"]];
const crownDrop = (t) => bounce((t - PUNCH1[1]) / 0.75);
export const LOG_FLY = [PUNCH1[1] + 0.12, PUNCH1[1] + 0.7];
export const CON_FLY = [PUNCH2[1] + 0.1, PUNCH2[1] + 0.75];
export const VAULT = [E.minecraft2 - 0.1, E.minecraft2 + 0.6];
export const CART = { out: [E.minecraft2 + 0.4, E.gold1 + 0.25], go: [E.oneG + 0.05, E.cubic + 0.35] };
export const ELE = [[E.three2 - 0.75, E.three2 - 0.05], [E.three2 - 0.45, E.elephants + 0.05], [E.three2 - 0.15, E.elephants + 0.4]];
const ELE_POS = [[22.4, 1.25], [24.6, 2.05], [26.8, 2.85]], ELE_FROM = 36;
export const STRONG_KEYS = [[E.lifts - 0.25, "lift"], [E.forty - 0.3, "lower"], [E.record - 0.1, "look"]];
export const tiltAt = (t) => {
  let w = 0; const blockOn = sm(t, CART.go[1] - 0.1, CART.go[1] + 0.6), off = sm(t, LIFT[0] + 0.1, LIFT[1] + 0.4); w -= 3 * blockOn * (1 - off);
  ELE.forEach(([a, b]) => { w += sm(t, b - 0.1, b + 0.5); }); return Math.max(-1, Math.min(1, w / 3));
};
export const INV = { in: E.his - 0.15, out: E.tonnes2 + 0.35, in2: E.box2 - 0.3, out2: E.thats4 - 0.1, fill: [E.thirty6a - 0.1, E.slots + 0.45], count: E.sixty4 - 0.05 };
export const TOSLOT = [E.inventory + 0.05, E.inventory + 0.7];
export const BOX = { open: E.shulker - 0.1, grid: [E.it1 - 0.1, E.box2 - 0.15], fill: [E.twenty7 - 0.2, E.stacks + 0.25], shrink: E.box2 - 0.05, fly: [E.fits - 0.25, E.slot2 + 0.1], wave: [E.thirty6b - 0.05, E.carries - 0.1] };
export const COUNT = { blocks: [E.two - 0.1, E.goldBlocks + 0.1], tonnes: [E.forty4 - 0.05, E.tonnes2 + 0.1], big: [E.carries - 0.1, E.tonnes3 + 0.05] };
export const EIF_T = [E.four - 0.35, E.four - 0.15, E.four + 0.05, E.eiffel - 0.05, E.towers - 0.05];
export const PILE_T = [E.five - 0.3, E.five - 0.1, E.five + 0.1, E.five + 0.3, E.five + 0.5, E.all - 0.05];
export const RUN = [E.and8, E.then - 0.15];
export const BIKE = { x0: 16.2, x1: 27.4, z: 7.7 };
export const SPEED = [E.runs - 0.25, E.then + 0.1];
export const CRACK_T = STEP.down + 0.02;
export const NEXT_T = E.next - 0.05;

// ---------------------------------------------------------------- the far slot: tower silhouettes and gold mountains
/** cover-only overrides (cover.mjs): a still camera, the towers up, no HUD. The film never sets them. */
export const OVR = {};
const EX = [-125, -20, 85, 190, 290], PX = [-20, 70, 160, 250, 340, 420];
function farLayer(c, V, t, layer) {
  if (layer !== (OVR.eiffel ? 2 : 0)) return;
  const zf = 1 + (V.z - 1) * 0.18, ox = V.cx * U * 0.18, fx = (wx) => 270 + zf * (wx - ox), fyy = (by) => 480 + zf * (by - V.fy);
  if (OVR.eiffel) { OVR.eiffel.xs.forEach((x, i) => { const z = OVR.eiffel.z, sd = drive(eiffel, [], t, { vx: { up: 1, glow: 0 }, part: i === 4 ? 0.4 : 1, col: "#8A8CBC" }); eiffel.draw(c, x, OVR.eiffel.base - eiffel.hh * z, z, t, sd); }); return; }
  EX.forEach((wx, i) => { const k = OVR.eiffel ? 1 : eout((t - EIF_T[i]) / 0.75) * (1 - eio((t - E.runs - 0.1 - i * 0.06) / 0.8)); if (k <= 0) return;
    const z = 1.3 * zf, s = drive(eiffel, [], t, { vx: { up: k, glow: 0 }, part: i === 4 ? 0.4 : 1, col: "#8A8CBC" }); eiffel.draw(c, fx(wx), fyy(45) - eiffel.hh * z, z, t, s); });
  PX.forEach((wx, i) => { const k = eout((t - PILE_T[i]) / 0.6); if (k <= 0) return;
    drawPile(c, fx(wx), fyy(100), 118 * zf, 215 * zf, t, { up: k, shine: sm(t, PILE_T[i] + 0.4, PILE_T[i] + 1), part: i === 5 ? 0.5 : 1, haze: 0.1 }); });
}
export const pileLabelAt = (V) => { const zf = 1 + (V.z - 1) * 0.18, ox = V.cx * U * 0.18; return [270 + zf * (PX[0] - ox), 480 + zf * (100 - 215 - V.fy)]; };

// ---------------------------------------------------------------- drawing
export function drawWorld(c, t) {
  const cm = OVR.cam ?? camAt(t), sp = steveAt(t);
  const crack = t > CRACK_T - 0.05 ? { X: sp.x, Z: sp.z + 0.05, R: 2.3, k: eout((t - CRACK_T) / 0.9) } : null;
  const V = drawBackdrop(c, cm, t, { vault: eio((t - VAULT[0]) / (VAULT[1] - VAULT[0])) * (1 - sm(t, CART.go[1] + 0.4, CART.go[1] + 1.4)), crack, pigeonFly: clamp01((t - CRACK_T) / 1.6), far: farLayer, lower: OVR.lower });
  return { V, cam: cm };
}

// ---------------------------------------------------------------- the people (looks, places, keyed poses)
const P = (look, x, z, dir, keys, o = {}) => ({ look: LOOKS[look], x, z, dir, keys, ...o });
const PEOPLE = [
  // by the portal: the coffee man drops his cup, the woman at the stop films
  P("coffee", 3.9, 1.75, 1, [[0, { cup: 1, cupHold: 1, turn: 1 }], [0.3, 0.55, { recoil: 1, mouth: 1, cup: 0 }], [3.0, 3.6, { recoil: 0, mouth: 0 }], [E.punches + 0.3, E.punches + 0.7, { point: 1 }], [E.goneEnd + 0.4, E.goneEnd + 0.8, { point: 0 }]], { cupDrop: 0.32 }),
  P("phone1", 0.7, 3.3, 1, [[0.6, 1.1, { film: 1 }], [E.side, E.side + 0.4, { turn: 1 }]]),
  P("woman2", 9.3, 1.7, -1, [[0.5, 0.9, { recoil: 0.6, mouth: 1 }], [2.4, 2.9, { recoil: 0, mouth: 0, film: 1 }], [PUNCH1[1] + 0.02, PUNCH1[1] + 0.25, { recoil: 1, film: 0, mouth: 1, hop: 1 }], [PUNCH1[1] + 1.4, PUNCH1[1] + 1.9, { recoil: 0, mouth: 0 }]]),
  P("tourist", 12.2, 1.15, 1, [[E.minecraft2, E.minecraft2 + 0.5, { film: 1 }]]),
  P("office", 18.9, 3.85, -1, [[E.three2 - 0.6, E.three2, { film: 1 }], [E.and8 + 0.4, E.and8 + 0.9, { turn: 1 }]]),
  P("waiter", 37.6, 1.0, -1, [[E.thats4, E.thats4 + 0.4, { point: 1 }], [CRACK_T + 0.05, CRACK_T + 0.3, { recoil: 1, point: 0, mouth: 1 }]]),
  P("student", 32.4, 2.0, 1, [[E.then - 0.2, E.then + 0.4, { film: 1 }], [CRACK_T + 0.05, CRACK_T + 0.3, { recoil: 0.7, mouth: 1 }]]),
  P("lady", 39.0, 3.1, -1, [[E.shulker, E.shulker + 0.5, { clap: 0.0, turn: -1 }], [CRACK_T + 0.05, CRACK_T + 0.3, { recoil: 1, mouth: 1 }], [E.mario, E.mario + 0.6, { recoil: 0.3, clap: 1 }]]),
  P("elder", 27.2, 0.95, 1, [[E.towers, E.towers + 0.5, { point: 1 }], [E.and8 + 0.8, E.and8 + 1.3, { point: 0, turn: 1 }]]),
];
// background walkers along the far edge of the pavement (slow, continuous)
const WALKERS = [["runner", -8, 0.75, 0.85, 1], ["student", 40, 0.85, 0.7, -1], ["lady", 6, 0.62, 0.55, 1], ["office", 25, 0.7, 0.8, -1]];
function personAt(p, t) {
  const init = { cup: 0, cupHold: 0, film: 0, recoil: 0, point: 0, clap: 0, turn: 0, mouth: 0, dir: p.dir, hop: 0 };
  const v = { ...init }; for (const k of p.keys) { if (k.length === 2) { Object.assign(v, k[1]); continue; } const [a, b, tg] = k; if (t <= a) break; const q = eio((t - a) / (b - a)); for (const f in tg) v[f] = lerp(v[f], tg[f], q); }
  v.dir = v.dir >= 0 ? 1 : -1; return v;
}

const W_ = {};
export function drawStory(c, W0, t) {
  const { V } = W0, sp = steveAt(t), items = [], add = (z, f) => items.push([z, f]);
  // ---- ground shadows first (the long late-afternoon shadows fall to the right, toward the houses)
  for (const p of PEOPLE) castShadow(c, V, p.x, p.z, p.look.h, 0.2, 0.32);
  for (const [, x0, z, sp2, dir] of WALKERS) castShadow(c, V, x0 + dir * sp2 * t, z, 1.72, 0.2, 0.26);
  if (sp.sink < 0.5) castShadow(c, V, sp.x, sp.z, 1.8 - sp.h * 0.4, 0.28, 0.36 * (1 - sp.sink));
  castShadow(c, V, X.tree, 3.5, 5.6, 0.9, 0.26);
  for (const lx of LAMPS) castShadow(c, V, lx, LAMP_Z, 4.8, 0.1, 0.28);
  castShadow(c, V, X.strong, 3.3, 1.9, 0.3, 0.3);
  // ---- depth-sorted things
  add(2.2, () => { const z = V.s(2.2) / 50, [px, py] = V.P(X.portal, 0, 2.2); portal.draw(c, px, py - portal.hh * z, z, t, drive(portal, PORTAL_KEYS, t)); });
  for (const p of PEOPLE) add(p.z, () => {
    const v = personAt(p, t), [fx, fy] = V.P(p.x - (v.hop ?? 0) * 0.5, 0, p.z - (v.hop ?? 0) * 0.3), s = V.s(p.z), look = Math.atan2(V.sx(sp.x, sp.z) - fx, 50);
    const turn = v.turn * Math.tanh((sp.x - p.x) / 0.9);
    const r = drawPerson(c, fx, fy - Math.sin(Math.PI * clamp01((v.hop ?? 0) * 1.0)) * 0, s, t + p.x, p.look, { ...v, turn, cupHold: p.cupDrop !== undefined ? (t < p.cupDrop ? 1 : 0) : v.cupHold });
    if (p.cupDrop !== undefined) W_.cupMan = r;
  });
  for (const [look, x0, z, spd, dir] of WALKERS) add(z, () => { const x = x0 + dir * spd * t, [fx, fy] = V.P(x, 0, z); if (fx < -60 || fx > 600) return; drawPerson(c, fx, fy, V.s(z), t, LOOKS[look], { walk: 1, gait: (spd * t) / 1.3, dir }); });
  // café sets under the awnings, parked bikes at the racks
  for (const [cx2, cz] of [[-11.5, 1.1], [-8.2, 1.25], [32.6, 1.05], [36.4, 1.2]]) add(cz, () => drawCafeW(c, V, cx2, cz, t));
  for (const bx2 of [-5.8, -4.9, 41.2, 42.1]) add(4.0, () => drawBikeW(c, V, bx2, 4.0, t, { dir: 1, ph: 0.1, col: bx2 > 0 ? ["#6A2A2A", "#9A3A3A", "#C85050"] : undefined }));
  add(3.5, () => drawTree(c, V, t));
  add(3.6, () => { const [bx, by] = V.P(X.barrier, 0, 3.6), side = V.s(3.6), crack = PUNCH2[0] < t ? clamp01((t - PUNCH2[0]) / (PUNCH2[1] - PUNCH2[0])) : 0, gone = sm(t, PUNCH2[1] + 0.02, PUNCH2[1] + 0.2);
    contact(c, V, X.barrier, 3.6, 0.6 * (1 - gone), 0.4); if (gone < 1) cube(view(c, 1 - gone), bx, by, side, { tex: TEX.concrete, yaw: 0.0, crack }); });
  // the scales: column (Z 1.2), beam, pans; gold on the left pan / cart; elephants on the platform
  add(0.55, () => { drawScalesW(c, V, X.scales, t, tiltAt(t), "back"); });
  add(0.58, () => { const G = drawScalesW(c, V, X.scales, t, tiltAt(t), "pans"); W_.G = G; drawCart(c, V, t, G); });
  for (let i = 0; i < 3; i++) add(ELE_POS[i][1] + 0.01, () => drawEle(c, V, t, i));
  add(3.7, () => drawScalesW(c, V, X.scales, t, tiltAt(t), "beam"));
  add(3.3, () => { const [fx, fy] = V.P(X.strong, 0, 3.3), v = drive({ states: { rest: [0.4], lift: [1.0], lower: [0.8], look: [0.4] }, base: { grip: 0, lift: 0, shake: 0, turn: 0 }, st: { rest: { grip: 0, lift: 0, shake: 0 }, lift: { grip: 1, lift: 1, shake: 1 }, lower: { grip: 0, lift: 0, shake: 0 }, look: { turn: 1 } } }, STRONG_KEYS, t).v;
    drawStrongman(c, fx, fy, V.s(3.3), t, { ...v, grip: clamp01(v.grip * 1.6), lift: clamp01((v.lift - 0.3) / 0.7), dir: 1 }); });
  add(3.3, () => busStop(c, V, -3.6, -0.6, t));
  // the shulker box
  add(3.35, () => drawBox(c, V, t));
  // Steve
  add(sp.z + 0.001, () => drawSteve(c, V, t, sp));
  // lamps + bunting, the cyclist, parked cars, the bus
  for (const lx of LAMPS) add(LAMP_Z, () => lampPost(c, V, lx, t));
  for (let bx2 = -13; bx2 < 46; bx2 += 2.7) { if (LAMPS.some((l) => Math.abs(l - bx2) < 1) || (bx2 > 23.8 && bx2 < 29.2) || (bx2 > -4.5 && bx2 < 0.5)) continue; add(4.55, () => bollard(c, V, bx2)); }
  add(BIKE.z, () => { if (t < RUN[0] - 2.5 || t > RUN[1] + 4) return; const k = clamp01((t - (RUN[0] - 1.2)) / (RUN[1] + 1.8 - RUN[0] + 1.2)), x = lerp(BIKE.x0, BIKE.x1, k); drawCyclistW(c, V, x, BIKE.z, t, { look: LOOKS.runner, ph: x / 2.1, dir: 1, turn: t > E.runs ? -1 : 0 }); });
  for (const [cx2, col] of [[18.6, "red"], [29.4, "yellow"], [40.4, "blue"], [45.2, "white"], [-21.0, "white"]]) add(5.3, () => drawCarW(c, V, cx2, 5.3, t, { col, hazard: cx2 > 27 ? sm(t, CRACK_T + 0.1, CRACK_T + 0.3) : 0 }));
  add(8.0, () => { const a = E.cubic - 1.0, b = E.strongest + 0.6; if (t < a || t > b) return; const xf = lerp(-2, 52, (t - a) / (b - a)); drawBusW(c, V, xf, 8.0, t, { roll: xf, dir: 1 }); });
  items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  drawFx(c, V, t, sp);
  drawHud(c, V, t, sp);
}

// ---------------------------------------------------------------- pieces
function bollard(c, V, X) { const Z = 4.55; if (V.sx(X, Z) < -20 || V.sx(X, Z) > 560) return; box(c, V, X - 0.09, X + 0.09, 0, 0.82, Z - 0.09, Z + 0.09, { top: "#4E6A5E", front: (XX, Y) => (Y > 0.62 && Y < 0.7 ? "#C8A048" : XX < X - 0.03 ? "#4E6A5E" : "#2C3C36"), side: "#1E2A26" }); box(c, V, X - 0.12, X + 0.12, 0.82, 0.9, Z - 0.12, Z + 0.12, { top: "#6E8A7E", front: "#2C3C36" }); }
function puff(c, x, y, r, a, cols = ["#F2E8DA", "#D8CCBC"]) { if (a <= 0) return; for (let j = -R(r); j <= R(r); j++) for (let i = -R(r); i <= R(r); i++) { const d = (i * i + j * j) / (r * r + 0.01); if (d <= 1 && a * (1 - 0.5 * d) > bayer(R(x + i), R(y + j))) c.px(R(x + i), R(y + j), j < 0 ? cols[0] : cols[1]); } }
function drawSteve(c, V, t, sp) {
  const s = V.s(sp.z), z = s / 50, [sx, gy] = V.P(sp.x, 0, sp.z), sfy = gy - sp.h * s;
  const st = drive(steve, [], t, { vx: { yaw: sp.yaw, head: sp.head, walk: sp.walk, run: sp.run, punch: sp.punch, hold: sp.hold, lift: sp.lift, sink: sp.sink, look: sp.look, roll: sp.roll, down: sp.down }, gait: gaitAt(t), clipDy: 1 });
  const tt = t > PUNCH2[0] - 0.2 && t < PUNCH2[1] + 0.2 ? PUNCH2[0] + (t - PUNCH2[0]) * 2.4 : t;
  contact(c, V, sp.x, sp.z, (0.42 - sp.h * 0.15), 0.4 * (1 - sp.sink * 0.8));
  const r = steve.draw(c, sx, sfy - steve.hh * z, z, tt, st);
  W_.hand = r.hand; W_.head = r.head; W_.steve = [sx, gy, s];
  // landing dust
  const dk = clamp01((t - 0.8) / 0.9); if (dk > 0 && dk < 1) for (let q = 0; q < 10; q++) { const sd = q % 2 ? 1 : -1, d = (0.3 + q * 0.08) * eout(dk) * s, rr = (0.09 + (q % 3) * 0.02) * s * (1 - dk * 0.6); puff(c, sx + sd * d, gy - 0.04 * s - 0.12 * s * Math.sin(Math.PI * dk) * (q % 3) / 2, rr, (1 - dk) * 0.9); }
  drawHeldGold(c, V, t, r, s);
  // the step: dust ring and sinking debris
  if (t > CRACK_T && t < CRACK_T + 2.2) { const k = clamp01((t - CRACK_T) / 2.2); for (let q = 0; q < 16; q++) { const a = (q / 16) * Math.PI * 2, d = (0.5 + 1.3 * eout(k)) * s * (0.7 + 0.3 * rnd(q)), rr = (0.16 + 0.08 * rnd(q + 5)) * s * (1 - k * 0.4);
    puff(c, sx + Math.cos(a) * d, gy + Math.sin(a) * d * 0.35 - 0.3 * s * Math.sin(Math.PI * k) * rnd(q + 9), rr, (1 - k) * 0.85, ["#E4D8C8", "#BCAE9E"]); } }
}
function drawTree(c, V, t) {
  const gone = sm(t, PUNCH1[1] - 0.02, PUNCH1[1] + 0.14), crack = t > PUNCH1[0] ? clamp01((t - PUNCH1[0]) / 3.0) : 0;
  const r = drawTreeW(c, V, X.tree, 3.5, t, { cut: gone, drop: crownDrop(t), sway: Math.max(0, Math.sin(Math.PI * clamp01((t - PUNCH1[1] - 0.4) / 1.0))), noShadow: true });
  W_.log = r.log;
  if (t > PUNCH1[0] && gone < 1) { const s = V.s(3.5); cracks.draw(view(c, 1 - gone), r.log[0], r.log[1], 1, t, drive(cracks, [], t, { vx: { stage: crack }, w: 0.34 * s, h: (TREE.cut[1] - TREE.cut[0]) * s })); }
  const hit = PUNCH1[1] + 0.45; if (t > hit && t < hit + 0.9) { const k = (t - hit) / 0.9, s = V.s(3.5); for (let q = 0; q < 8; q++) puff(c, r.log[0] + (q - 3.5) * 0.2 * s * eout(k), r.log[1] + 0.4 * s - 0.1 * s * Math.sin(Math.PI * k), (0.07 + (q % 2) * 0.03) * s, (1 - k) * 0.8); }
}
function wireCube(c, bx, by, side, a, t) {
  const cp = Math.cos(0.24), sp = Math.sin(0.24), h = side / 2, Pp = (x, y, z) => [bx + x, by - (y * cp - z * sp)];
  const pts = [[-h, 0, -h], [h, 0, -h], [h, 0, h], [-h, 0, h], [-h, side, -h], [h, side, -h], [h, side, h], [-h, side, h]].map((p) => Pp(p[0] * 1.06, p[1] * 1.04, p[2] * 1.06));
  const E2 = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], g = fade(c, a), grow = sm(a, 0, 1);
  for (const pass of [0, 1]) for (const [i, j] of E2) { const [x0, y0] = pts[i], [x1, y1] = pts[j], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let q = 0; q <= n * grow; q++) { if ((q + R(t * 12)) % 8 >= 5) continue; const X0 = R(x0 + ((x1 - x0) * q) / n), Y0 = R(y0 + ((y1 - y0) * q) / n); if (pass === 0) g.rect(X0 - 1, Y0 - 1, 3, 3, C.O); else g.rect(X0, Y0, 2, 2, C.Y); } }
}
const cartAt = (t) => {
  const o = eio((t - CART.out[0]) / (CART.out[1] - CART.out[0])), g = eio((t - CART.go[0]) / (CART.go[1] - CART.go[0]));
  return { x: lerp(lerp(X.bankDoor, X.bankDoor + 0.2, o), X.scales + SC.left, g), z: lerp(lerp(0.5, 1.6, o), 1.6, g), y: lerp(0.48, 0, sm(o, 0.3, 0.8)), a: sm(t, CART.out[0] - 0.05, CART.out[0] + 0.2), onK: sm(t, CART.go[1] - 0.25, CART.go[1]) };
};
function drawCart(c, V, t, G) {
  if (t < CART.out[0] - 0.05 || t > LIFT[0] + 0.02) return;
  const ct = cartAt(t), s = V.s(ct.z), Lp = G.left;
  const baseY = lerp(ct.y + 0.3, Lp.top, ct.onK), zz = lerp(ct.z, 1.2, ct.onK), [cx, cy] = V.P(lerp(ct.x, Lp.X, ct.onK), baseY, zz), g = view(c, ct.a);
  if (ct.onK < 1) { const cg = view(c, ct.a * (1 - ct.onK)); box(cg, V, ct.x - 0.65, ct.x + 0.65, ct.y + 0.18, ct.y + 0.3, ct.z - 0.6, ct.z + 0.6, { top: "#5A607E", front: "#3E425A" });
    for (const dx of [-0.42, 0.42]) { const [wx, wy] = V.P(ct.x + dx, ct.y + 0.1, ct.z + 0.6), rr = 0.11 * s; for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) if (i * i + j * j <= rr * rr) cg.px(R(wx) + i, R(wy) + j, i * i + j * j > rr * rr * 0.4 ? "#14121A" : "#8A90A8"); } }
  cube(g, cx, cy, V.s(zz), { tex: TEX.gold, yaw: 0.0, light: 0.03 });
  W_.goldOnPlat = [cx, cy - V.s(zz) * 1.05];
}
function drawEle(c, V, t, i) {
  const [a, b] = ELE[i]; if (t < a - 0.05) return;
  const G = W_.G ?? geomW(X.scales, tiltAt(t)), k = eio((t - a) / (b - a)), [tx, tz] = ELE_POS[i], ex = lerp(ELE_FROM + i * 1.6, tx, k);
  const platX0 = G.right.X - SC.platW / 2, onK = sm(ex, platX0 + 3.8, platX0 + 2.2), y = lerp(0, G.right.top, ex < platX0 + 3.2 ? 1 : onK);
  const [fx, fy] = V.P(ex, y, tz), s = V.s(tz);
  drawElephant(c, fx, fy, s, t, { dir: -1, walk: k < 1 ? 1 - sm(t, b - 0.15, b + 0.1) : 0, gait: ex / 1.9, trumpet: i === 1 ? win(t, E.elephants + 0.2, E.strongest, 0.4, 0.4) : 0, seed: i });
}
function drawHeldGold(c, V, t, r, s) {
  if (t < LIFT[0] || t > TOSLOT[1] + 0.05) return;
  const k = eio((t - LIFT[0]) / (LIFT[1] - LIFT[0])), from = W_.goldOnPlat ?? [r.hand[0], r.hand[1]], side = s;
  let x = lerp(from[0], r.handFar[0], k), y = lerp(from[1] + side * 1.05, r.handFar[1] + 1, k), sc = 1, a = 1;
  if (t > TOSLOT[0]) { const q = eio((t - TOSLOT[0]) / (TOSLOT[1] - TOSLOT[0])), [tx, ty] = slotXY(0, 255, invY(t)); x = lerp(x, tx, q); y = lerp(y, ty + 10, q) - 40 * Math.sin(Math.PI * q); sc = lerp(1, 0.32, q); a = 1 - sm(q, 0.85, 1); }
  cube(view(c, a), x, y, side * sc, { tex: TEX.gold, yaw: (t > TOSLOT[0] ? 2 * (t - TOSLOT[0]) : 0), light: 0.03 });
}
function drawBox(c, V, t) {
  if (t < E.and8 - 1) return;
  const Zb = 3.35, [bx, by] = V.P(X.box, 0, Zb), z = V.s(Zb) / 64, a = sm(t, E.and8 - 1, E.and8 - 0.4);
  const flyK = eio((t - BOX.fly[0]) / (BOX.fly[1] - BOX.fly[0]));
  if (t < BOX.fly[0]) { contact(c, V, X.box, Zb, 0.6, 0.4 * a); shulker.draw(view(c, a), bx, by - 40 * z, z, t, drive(shulker, [[BOX.open, "open"], [BOX.shrink, "shrink"]], t, { side: 64 })); const sh = eio((t - BOX.shrink) / 0.6); W_.boxAt = [bx, by - 30 * z * sh - 20 * z]; }
  else if (flyK < 1) { const [tx, ty] = slotXY(0, 255, invY(t)), from = W_.boxAt ?? [bx, by - 40 * z], x = lerp(from[0], tx, flyK), y = lerp(from[1], ty, flyK) - 60 * Math.sin(Math.PI * flyK); putIcon(c, "shulker", x, y, 20, 1); }
}

// ---------------------------------------------------------------- effects over the world
function cupAt(c, x, y, rot, s) {
  const pts = [[-0.035, -0.06], [0.035, -0.06], [0.028, 0.06], [-0.028, 0.06]].map(([u, v]) => [x + (u * Math.cos(rot) - v * Math.sin(rot)) * s, y + (u * Math.sin(rot) + v * Math.cos(rot)) * s]);
  c.poly(pts, "#F4EEE0"); for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#2A1E26"); }
  const m = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]; c.rect(R(m[0]) - 1, R(m[1]), 3, 2, "#6A4228");
}
function drawFx(c, V, t, sp) {
  const s = V.s(sp.z), [sx, gy] = V.P(sp.x, 0, sp.z);
  // log + concrete items fly to the hand
  for (const [fly, kind, fromF] of [[LOG_FLY, "log", () => W_.log], [CON_FLY, "concrete", () => { const [bx, by] = V.P(X.barrier, 0.5, 3.6); return [bx, by]; }]]) {
    if (t < fly[0] - 0.15 || t > fly[1] + 0.05) continue;
    const from = fromF(); if (!from) continue; const k = eio((t - fly[0]) / (fly[1] - fly[0])), to = W_.hand ?? [sx, gy - s];
    const x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k) - 0.5 * s * Math.sin(Math.PI * k), side = lerp(0.36, 0.16, k) * s, a = sm(t, fly[0] - 0.15, fly[0]) * (1 - sm(k, 0.85, 1));
    cube(view(c, a), x, y + side / 2, side, { tex: TEX[kind], yaw: 1.8 * t });
  }
  // the coffee cup: falls from the hand at 0.32 s, spills, lies on the pavement
  { const p = PEOPLE[0], ps = V.s(p.z), [ax, ay] = V.P(p.x, 0, p.z), hand = W_.cupMan?.hand ?? [ax - 0.2 * ps, ay - 1.1 * ps], k = clamp01((t - 0.32) / 0.42);
    if (t >= 0.32 && k < 1) cupAt(c, hand[0] - 0.1 * ps * k, lerp(hand[1], ay - 0.04 * ps, k * k), -2.4 * k, ps);
    if (t > 0.74) { const q = eout((t - 0.74) / 0.6), w = 0.32 * ps * q, h = 0.07 * ps * q, cx = hand[0] - 0.22 * ps, cy = ay - 0.02 * ps; for (let j = -R(h); j <= R(h); j++) for (let i = -R(w); i <= R(w); i++) if ((i / Math.max(1, w)) ** 2 + (j / Math.max(1, h)) ** 2 <= 1) c.px(R(cx) + i, R(cy) + j, (i + j) % 5 === 0 ? "#8A5A36" : "#5E3A22");
      cupAt(c, hand[0] - 0.1 * ps, ay - 0.04 * ps, -1.57, ps); } }
  // measuring tape beside Steve (1.8 m) on «one point eight meters»
  const ta = win(t, E.one8 - 0.2, E.side + 0.3, 0.3, 0.4);
  if (ta > 0) { const hgt = 1.8 * s * eio((t - E.one8 + 0.15) / 0.65), x0 = R(sx - 0.68 * s), w = Math.max(4, R(0.13 * s)), g = fade(c, ta);
    g.rect(x0 - 1, R(gy - hgt) - 1, w + 2, R(hgt) + 2, C.O); g.rect(x0, R(gy - hgt), w, R(hgt), "#F4CA50");
    for (let k = 0; k * 0.1 * s < hgt; k++) g.rect(x0, R(gy - k * 0.1 * s), k % 5 === 0 ? w : R(w * 0.5), 1, C.O);
    g.rect(x0 - 2, R(gy - hgt) - 2, w + 4, 3, "#E04848");
    label(c, "1.8 m", x0 + w / 2, gy - 1.8 * s - 36, ta * sm(t, E.one8 - 0.05, E.one8 + 0.3), C.Y, 3); }
  { const wa = win(t, E.block1 - 0.1, E.punches - 0.6, 0.35, 0.4); if (wa > 0) { const st = steveAt(E.block1), [bx, by] = V.P(st.x + 1.05, 0, st.z + 0.05); wireCube(c, bx, by, V.s(st.z), wa, t);
    const la = win(t, E.oneM - 0.1, E.punches - 0.3, 0.3, 0.4); if (la > 0) label(c, "1 m", bx, by - V.s(st.z) * 1.35 - 32, la, C.Y, 3); } }
}

// ---------------------------------------------------------------- HUD (screen space, inside the main safe zone)
export const invY = (t) => 262 - 24 * (1 - sm(t, INV.in, INV.in + 0.45)) * (t < E.thirty6a ? 1 : 0);
function drawHud(c, V, t, sp) {
  if (OVR.noHud) return;
  const s = V.s(sp.z), [sx, gy] = V.P(sp.x, 0, sp.z);
  { const a = win(t, 0.35, E.lets + 0.1, 0.35, 0.45); if (a > 0) pill(c, "STEVE", sx, gy - 1.85 * s - 44, a, { edge: "#7FE3F0" }); }
  { const a = win(t, PUNCH1[0] - 0.2, PUNCH1[1] + 0.6, 0.3, 0.4); if (a > 0) { const tx = V.sx(X.tree, 3.5); timer.draw(c, Math.max(110, Math.min(400, tx)), 236, 1, t, drive(timer, [[PUNCH1[0], "run"], [PUNCH1[1], "done"]], t, { a, scale: 3, value: 3 * clamp01((t - PUNCH1[0]) / 3), final: 3, unit: "s" })); } }
  { const a = win(t, PUNCH2[0] - 0.15, E.hands + 0.5, 0.3, 0.4); if (a > 0) { const tx = V.sx(X.barrier - 0.2, 3.6);
    const r = timer.draw(c, Math.max(110, Math.min(380, tx)), 236, 1, t, drive(timer, [[PUNCH2[0], "run"], [PUNCH2[1], "done"]], t, { a, scale: 3, value: 9 * clamp01((t - PUNCH2[0]) / (PUNCH2[1] - PUNCH2[0])), final: 9, unit: "s" }));
    const ff = a * (1 - sm(t, PUNCH2[1], PUNCH2[1] + 0.3)), g = fade(c, ff); for (const o of [0, 9]) g.poly([[r.box.x1 + 6 + o, 226], [r.box.x1 + 14 + o, 236], [r.box.x1 + 6 + o, 246]], "#7FE3F0"); } }
  { const a = win(t, E.bare - 0.1, E.heaviest - 0.1, 0.3, 0.4); if (a > 0) { const yy = 290 + R(8 * (1 - sm(t, E.bare - 0.1, E.bare + 0.3))), w = c.measure(MAIN, "BARE HANDS", { scale: 2 }) + 58, x0 = R(270 - w / 2); plate(c, x0, yy, w, 36, a, C.Y); fist(c, x0 + 10, yy + 8, 2, a); fade(c, a).text(MAIN, "BARE HANDS", x0 + 44, yy + 11, C.IV, { scale: 2 }); } }
  { const a = win(t, E.nineteen - 0.1, E.steve3 - 0.1, 0.3, 0.4); if (a > 0 && W_.goldOnPlat) pill(c, "19 t", W_.goldOnPlat[0], W_.goldOnPlat[1] - 46, a, { edge: C.Y, col: C.Y, scale: 3 }); }
  { const a = win(t, E.half - 0.1, E.his - 0.2, 0.3, 0.4); if (a > 0) { const x = V.sx(X.strong, 3.3), cx = Math.max(110, Math.min(430, x)); const p = pill(c, "≈0.5 t", cx, 236, a, { edge: "#FF8A80", col: C.IV, scale: 3 }); if (p) label(c, "WORLD RECORD", cx, 236 + p.h + 8, a, "#FF8A80", 3); } }
  { const a = win(t, E.forty - 0.3, E.his - 0.1, 0.25, 0.4); if (a > 0) { const k = eio((t - E.forty + 0.3) / 0.6), sc = 5 + Math.sin(Math.PI * clamp01((t - E.forty) / 0.5)) * 0.6, scI = Math.round(sc), val = lerp(1, 40, k), w = odoW(c, 40, { scale: scI, prefix: "×" }) + 28, x0 = R(300 - w / 2);
    plate(c, x0, 168, w, 7 * scI + 18, a, C.Y); odo(c, val, x0 + 14, 177, a, { scale: scI, prefix: "×", digits: 2, col: C.Y, smoothOnes: true }); } }
  const ia = Math.max(win(t, INV.in, INV.out, 0.4, 0.45), win(t, INV.in2, INV.out2, 0.4, 0.45));
  if (ia > 0) {
    const y = invY(t) - R(30 * (sm(t, INV.out, INV.out + 0.45) * (t < INV.in2 ? 1 : 0) + sm(t, INV.out2, INV.out2 + 0.45))), slot0 = sm(t, TOSLOT[1] - 0.12, TOSLOT[1] + 0.1);
    const fill = t < INV.fill[0] ? slot0 / 7 : lerp(1 / 7, 1, clamp01((t - INV.fill[0]) / (INV.fill[1] - INV.fill[0])));
    const box0 = sm(t, BOX.fly[1] - 0.12, BOX.fly[1] + 0.12) * 3, wave = clamp01((t - BOX.wave[0]) / (BOX.wave[1] - BOX.wave[0]));
    inv.draw(c, 255, y, 1, t, drive(inv, [], t, { a: ia, vx: { fill, count: sm(t, INV.count, INV.count + 0.4), boxes: 0 }, boxAt: (i) => (i === 0 ? box0 : wave * 38 - i + 1), pulseK: clamp01((t - BOX.fly[1] + 0.1) / 0.5) }));
  }
  // counters under the card; once the card leaves they rise to the top row (over the towers)
  { const a1 = win(t, COUNT.blocks[0] - 0.1, E.and8 + 0.1, 0.3, 0.4) * (t < E.then ? 1 : 0);
    if (a1 > 0) { const k1 = eio((t - COUNT.blocks[0]) / (COUNT.blocks[1] - COUNT.blocks[0])), k2 = eio((t - COUNT.tonnes[0]) / (COUNT.tonnes[1] - COUNT.tonnes[0]));
      const y0 = lerp(372, 158, eio((t - INV.out) / 0.6)), w1 = odoW(c, 2304, { scale: 3, suffix: " BLOCKS" }) + 24; plate(c, R(255 - w1 / 2), y0, w1, 36, a1, C.Y); odo(c, 2304 * k1, R(255 - w1 / 2) + 12, y0 + 6, a1, { scale: 3, digits: 4, suffix: " BLOCKS", suffixCol: C.Y });
      const a2 = a1 * sm(t, COUNT.tonnes[0] - 0.15, COUNT.tonnes[0] + 0.15); if (a2 > 0) { const w2 = odoW(c, 44000, { scale: 4, suffix: "t" }) + 24; plate(c, R(255 - w2 / 2), y0 + 44, w2, 48, a2, C.Y); odo(c, 44000 * k2, R(255 - w2 / 2) + 12, y0 + 50, a2, { scale: 4, digits: 5, suffix: "t", suffixCol: C.Y }); } } }
  { const a = win(t, COUNT.big[0] - 0.15, E.theres - 0.05, 0.3, 0.45); if (a > 0) { const k = eio((t - COUNT.big[0]) / (COUNT.big[1] - COUNT.big[0])), w = odoW(c, 1200000, { scale: 4, suffix: "t" }) + 24, y0 = lerp(380, 158, eio((t - INV.out2) / 0.6));
    plate(c, R(255 - w / 2), y0, w, 48, a, C.Y); odo(c, 1200000 * k, R(255 - w / 2) + 12, y0 + 6, a, { scale: 4, digits: 7, suffix: "t", suffixCol: C.Y }); } }
  { const a = win(t, E.all - 0.15, E.theres + 0.1, 0.35, 0.4); if (a > 0) { const [lx, ly] = pileLabelAt(V), w = c.measure(MAIN, "ALL GOLD EVER MINED", { scale: 2 }) + 24, cx = Math.max(w / 2 + 40, Math.min(440 - w / 2, lx + 70)), y = 222;
    plate(c, R(cx - w / 2), y, w, 54, a, C.Y); label(c, "ALL GOLD EVER MINED", cx, y + 8, a, C.IV, 2); label(c, "≈ 220,000 t", cx, y + 29, a, C.Y, 2);
    const g = fade(c, a); for (let k = 0; y + 56 + k * 3 < ly + 30; k++) g.rect(R(lx) - 1, y + 56 + k * 3, 3, 2, C.Y); } }
  { const a = win(t, SPEED[0], SPEED[1], 0.3, 0.4); if (a > 0) speedo.draw(c, 360, 236, 1, t, drive(speedo, [[E.twenty - 0.1, "up"]], t, { a, value: 20, unit: "km/h" })); }
  { const a = win(t, BOX.grid[0], BOX.grid[1], 0.35, 0.35); if (a > 0) { const fill = clamp01((t - BOX.fill[0]) / (BOX.fill[1] - BOX.fill[0]));
    inv.draw(c, 255, 352, 1, t, drive(inv, [], t, { a, cols: 9, rows: 3, size: 30, edge: "#C9A2FF", vx: { fill, count: 0, boxes: 0 } })); } }
  { const a = sm(t, NEXT_T, NEXT_T + 0.35); if (a > 0) { const y = 330 + R(10 * (1 - eout((t - NEXT_T) / 0.4))), w = c.measure(MAIN, "NEXT: MARIO", { scale: 3 }) + 84, x0 = R(250 - w / 2);
    plate(c, x0, y, w, 62, a, "#FF8A80"); mystery(c, x0 + 30, y + 30, 1.5, a); fade(c, a).text(MAIN, "NEXT: MARIO", x0 + 64, y + 21, C.IV, { scale: 3 }); } }
}
