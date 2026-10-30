// «How strong is Minecraft Steve in our world» (IN OUR WORLD #1) — one persistent sunny street seen through one camera:
// the portal → the tape and the 1 m cube → the tree → the concrete barrier → the bank → the giant scales with three elephants
// and the strongman → Steve lifts the gold → the inventory over the facades, four towers rise behind the roofs → he runs past
// a cyclist → the purple box → 36 boxes, 1,200,000 t, five and a half gold piles behind the roofs → back to Steve: one step and
// the street breaks → NEXT: MARIO → the follow card (cta.mjs). Every beat is anchored to a measured word (timeline.mjs W()).
// Art: film/assets/*.mjs (catalog contract) driven through lib/drive.mjs; blocks / Steve through lib/box3d.mjs.
import { Canvas, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { W, END, VOICE_END, VOICE } from "./timeline.mjs";
import { layer } from "./lib/layout.mjs";
import { drive, view } from "./lib/drive.mjs";
import street from "./assets/backdrop-city-street.mjs";
import steve from "./assets/steve.mjs";
import portal from "./assets/portal.mjs";
import tree from "./assets/tree.mjs";
import bank from "./assets/bank.mjs";
import adult from "./assets/adult.mjs";
import officeWorker from "./assets/office-worker.mjs";
import child from "./assets/child.mjs";
import car from "./assets/car.mjs";
import bus from "./assets/bus.mjs";
import cyclist from "./assets/cyclist.mjs";
import scales, { geom } from "./assets/platform-scales.mjs";
import elephant from "./assets/elephant.mjs";
import strongman from "./assets/strongman.mjs";
import concrete from "./assets/concrete-block.mjs";
import shulker from "./assets/shulker-box.mjs";
import cracks from "./assets/break-cracks.mjs";
import timer from "./assets/timer.mjs";
import speedo from "./assets/speedometer.mjs";
import inv, { slotXY } from "./assets/inventory-grid.mjs";
import eiffel from "./assets/eiffel-silhouette.mjs";
import goldPile from "./assets/gold-mountain.mjs";
import asphalt from "./assets/asphalt-cracks.mjs";
import { cube, TEX, putIcon } from "./lib/blocks.mjs";
import { MAIN, TINY, C, plate, label, pill, odo, odoW, fist, mystery, lc } from "./lib/hud.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
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
// guards for the occurrence counts used above: the word after each anchor
{ const ws = VOICE.words, nx = (t) => { const i = ws.findIndex((w) => w.start === t); return ws[i + 1].text.toLowerCase().replace(/[^a-z-]/g, ""); };
  for (const [t, want] of [[E.oneM, "meter"], [E.oneG, "gold"], [E.oneP2, "point"], [E.oneS, "step"], [E.and8, "he"], [E.thats4, "more"], [E.him, "next"], [E.gold1, "one"], [E.goldBlocks, "about"], [E.seconds2, "bare"]])
    if (nx(t) !== want) throw new Error(`occurrence guard: ${want} got ${nx(t)}`); }

// ---------------------------------------------------------------- world layout (world px; 50 px = 1 m at camera z 1)
export const GROUND = 612;                                  // where people stand (pavement)
export const X = { portal: 120, land: 262, adult: 186, tree: 360, worker: 410, barrier: 480, bank: 660, strong: 742, scales: 950, child: 1452, box: 1606, car1: 1470, car2: 1690, carA: 380 };
const BLOCK = 50;                                           // a 1 m block side at z 1
const camFeet = (cx, z, up = 0) => ({ cx: cx + 0.237, cy: GROUND - 150 / z - up / z + 0.231, z });   // +¼ px: a camera at rest never sits on a sampling boundary

// ---------------------------------------------------------------- the camera
export const camAt = track(camFeet(195, 1.9), [
  [E.lets - 0.1, E.checkEnd + 0.1, camFeet(250, 1.6)],
  [E.steve2 - 0.3, E.steve2 + 0.5, camFeet(300, 1.85)],
  [E.side - 0.2, E.punches, camFeet(352, 1.95)],
  [E.gone + 0.2, E.cube + 0.2, camFeet(452, 1.95)],
  [E.hands + 0.2, E.gold1, camFeet(600, 1.5)],
  [E.gold1 + 0.1, E.cubic + 0.4, camFeet(880, 1.35)],
  [E.cubic + 0.5, E.three2 - 0.8, camFeet(955, 1.4)],
  [E.strongest - 0.35, E.lifts, camFeet(790, 1.6)],
  [E.steve3 - 0.45, E.holds1 + 0.2, camFeet(805, 1.55)],
  [E.almost - 0.1, E.forty + 0.3, camFeet(790, 1.25)],
  [E.his - 0.3, E.inventory + 0.3, camFeet(830, 1.35)],
  [E.tonnes2 + 0.2, E.more2 + 0.3, camFeet(900, 1.0, 150)],
  [E.towers + 0.25, E.and8 + 0.15, camFeet(880, 1.5)],
  [E.and8 + 0.1, E.then + 0.1, camFeet(1556, 1.75)],
  [E.box2 - 0.4, E.box2 + 0.3, camFeet(1566, 1.6)],
  [E.thats4 - 0.2, E.five + 0.4, camFeet(1600, 0.95, 135)],
  [E.theres - 0.1, E.problem + 0.2, camFeet(1556, 2.05)],
  [E.next - 0.1, E.mario + 0.4, camFeet(1556, 1.85)],
]);

// ---------------------------------------------------------------- Steve: position + parameters
const FLY = 0.86;                                            // he tumbles out of the portal and lands at t = FLY
export const PUNCH1 = [E.punches, E.punches + 3.0];          // 3 s on the tree (real time)
export const PUNCH2 = [E.cube + 0.3, E.secondsEnd];          // the 9 s on the concrete, time-lapse (timer 0 → 9)
export const LIFT = [E.holds1 - 0.05, E.holds1 + 0.65];
export const STEP = { up: E.weight - 0.2, down: E.step - 0.05, sink: [E.step + 0.05, E.breaks + 0.45] };
const steveK = track({ x: X.land, yaw: 0.55, head: 0, walk: 0, run: 0, punch: 0, hold: 0, lift: 0, sink: 0, look: 0, down: 0 }, [
  [1.6, 2.1, { head: -0.3 }],
  [E.lets + 0.15, E.lets + 0.5, { head: -1.15 }], [E.check - 0.3, E.check + 0.05, { head: 0.55 }], [E.checkEnd + 0.1, E.checkEnd + 0.45, { head: 0 }],
  [E.steve2 - 0.2, E.steve2 + 0.3, { yaw: 0.3 }],
  [E.side + 0.05, E.side + 0.35, { yaw: 1.45, walk: 1 }], [E.side + 0.1, E.punches - 0.05, { x: X.tree - 38 }], [E.punches - 0.25, E.punches - 0.05, { walk: 0 }],
  [PUNCH1[0] - 0.05, PUNCH1[0] + 0.15, { punch: 1 }], [PUNCH1[1] - 0.15, PUNCH1[1] + 0.05, { punch: 0 }],
  [PUNCH1[1] + 0.05, PUNCH1[1] + 0.2, { walk: 1 }], [PUNCH1[1] + 0.08, PUNCH2[0] - 0.05, { x: X.barrier - 40 }], [PUNCH2[0] - 0.2, PUNCH2[0], { walk: 0, punch: 1 }], [PUNCH2[1] - 0.1, PUNCH2[1] + 0.1, { punch: 0 }],
  [E.hands + 0.25, E.hands + 0.45, { walk: 1, yaw: 1.5 }], [E.hands + 0.3, E.gold1 - 0.4, { x: 560 }], [E.gold1 - 0.55, E.gold1 - 0.3, { walk: 0, yaw: 1.1 }],
  [E.oneG + 0.25, E.oneG + 0.45, { walk: 1, yaw: 1.5 }], [E.oneG + 0.3, E.cubic + 0.5, { x: 792 }], [E.cubic + 0.35, E.cubic + 0.6, { walk: 0, yaw: 0.9 }],
  [E.three2 - 0.2, E.three2 + 0.3, { head: 0.6 }], [E.strongest - 0.3, E.strongest + 0.2, { head: -1.6 }], [E.steve3 - 0.4, E.steve3 - 0.1, { head: 0, yaw: 1.25 }],
  [LIFT[0], LIFT[1], { hold: 1 }], [E.hand + 0.2, E.hand + 0.6, { yaw: 0.45 }],
  [E.inventory + 0.1, E.inventory + 0.6, { hold: 0 }],
  [E.and8 - 0.05, E.and8 + 0.25, { run: 1, yaw: 1.55 }], [E.and8, E.then - 0.15, { x: X.box - 62 }], [E.then - 0.45, E.then - 0.1, { run: 0, yaw: 1.3 }],
  [E.shulker - 0.2, E.shulker + 0.2, { head: 0.15 }], [E.thats4 - 0.2, E.thats4 + 0.3, { head: 0, yaw: 0.6 }],
  [STEP.up - 0.3, STEP.up + 0.25, { yaw: 1.0 }], [STEP.up, STEP.up + 0.5, { lift: 1 }], [STEP.down - 0.18, STEP.down + 0.1, { lift: 0, x: X.box - 48 }],
  [STEP.sink[0], STEP.sink[1], { sink: 1 }], [E.him - 0.25, E.him + 0.25, { down: 1, yaw: 0.65 }], [E.next - 0.25, E.next + 0.3, { down: 0, look: 1, yaw: 0.35 }],
]);
// gait phase: distance / stride (walk 46 px, run 92 px per cycle), integrated once at 240 Hz (pure, cached)
const GAIT = (() => { const dt = 1 / 240, n = Math.ceil(END / dt) + 2, g = new Float64Array(n); let prev = steveK(0).x;
  for (let i = 1; i < n; i++) { const s = steveK(i * dt), dx = Math.abs(s.x - prev); prev = s.x; g[i] = g[i - 1] + dx / (46 + 46 * s.run) + (s.walk + s.run > 0.05 && dx < 0.01 ? 0 : 0); } return g; })();
export const gaitAt = (t) => { const i = Math.max(0, Math.min(GAIT.length - 2, t * 240)), i0 = Math.floor(i); return lerp(GAIT[i0], GAIT[i0 + 1], i - i0); };
export function steveAt(t) {
  const s = steveK(t); let x = s.x, h = 0, roll = 0;
  if (t < FLY) { const k = t / FLY; x = lerp(X.portal + 14, X.land, eout(k)); h = 22 * (1 - k) + 60 * k * (1 - k); roll = -2.3 * (1 - eout(k)); }
  return { ...s, x, h, roll };
}

// ---------------------------------------------------------------- other keyed things
export const PORTAL_KEYS = [[-1, "open"], [E.lets + 0.2, "close"]];
const crownDrop = (t) => bounce((t - PUNCH1[1]) / 0.75);
export const LOG_FLY = [PUNCH1[1] + 0.12, PUNCH1[1] + 0.7];
export const CON_FLY = [PUNCH2[1] + 0.1, PUNCH2[1] + 0.75];
export const VAULT = [E.minecraft2 - 0.1, E.minecraft2 + 0.6];                     // the vault door opens
export const CART = { out: [E.minecraft2 + 0.4, E.gold1 + 0.25], go: [E.oneG + 0.05, E.cubic + 0.35] };
export const ELE = [[E.three2 - 0.75, E.three2 - 0.05], [E.three2 - 0.45, E.elephants + 0.05], [E.three2 - 0.15, E.elephants + 0.4]];
const ELE_X = [X.scales + 62, X.scales + 104, X.scales + 146], ELE_FROM = 1290;
export const STRONG_KEYS = [[E.lifts - 0.25, "lift"], [E.forty - 0.3, "lower"], [E.record - 0.1, "look"]];
export const tiltAt = (t) => { // the beam: empty → gold on the left → elephants one by one → gold lifted off
  let w = 0; const blockOn = sm(t, CART.go[1] - 0.1, CART.go[1] + 0.6), off = sm(t, LIFT[0] + 0.1, LIFT[1] + 0.4); w -= 3 * blockOn * (1 - off);
  ELE.forEach(([a, b]) => { w += sm(t, b - 0.1, b + 0.5); }); return Math.max(-1, Math.min(1, w / 3));
};
export const INV = { in: E.his - 0.15, out: E.tonnes2 + 0.35, in2: E.box2 - 0.3, out2: E.thats4 - 0.1, fill: [E.thirty6a - 0.1, E.slots + 0.45], count: E.sixty4 - 0.05 };
export const TOSLOT = [E.inventory + 0.05, E.inventory + 0.7];                   // the held gold block flies into slot 0
export const BOX = { open: E.shulker - 0.1, grid: [E.it1 - 0.1, E.box2 - 0.15], fill: [E.twenty7 - 0.2, E.stacks + 0.25], shrink: E.box2 - 0.05, fly: [E.fits - 0.25, E.slot2 + 0.1], wave: [E.thirty6b - 0.05, E.carries - 0.1] };
export const COUNT = { blocks: [E.two - 0.1, E.goldBlocks + 0.1], tonnes: [E.forty4 - 0.05, E.tonnes2 + 0.1], big: [E.carries - 0.1, E.tonnes3 + 0.05] };
export const EIF_T = [E.four - 0.35, E.four - 0.15, E.four + 0.05, E.eiffel - 0.05, E.towers - 0.05];
export const PILE_T = [E.five - 0.3, E.five - 0.1, E.five + 0.1, E.times ?? E.five + 0.3, E.five + 0.5, E.all - 0.05];
export const RUN = [E.and8, E.then - 0.15];
export const BIKE = { x0: 820, x1: 1330 };
export const SPEED = [E.runs - 0.25, E.then + 0.1];
export const CRACK_T = STEP.down + 0.02;
export const NEXT_T = E.next - 0.05;

// ---------------------------------------------------------------- skyline layer (drawn into the sky holes, behind the roofs)
class Mask extends Canvas { constructor() { super(540, 960, "#000000"); this.m = new Uint8Array(540 * 960); } px(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= 540 || y >= 960) return; super.px(x, y, c); if (this.m) this.m[y * 540 + x] = 1; } }
const SKY = new Mask();
function skyline(cam, t) {
  SKY.m.fill(0); let any = false;
  const L = layer(cam, 0.7), base = 262;                    // far plane: towers and gold piles stand on a hidden base line
  // four and a bit lattice towers (rise one by one on «four Eiffel Towers»)
  const EX = OVR.eiffel ? OVR.eiffel.xs : [560, 640, 720, 800, 878];
  EX.forEach((wx, i) => { const k = OVR.eiffel ? 1 : eout((t - EIF_T[i]) / 0.75) * (1 - eio((t - E.runs - 0.1 - i * 0.06) / 0.8)); if (k <= 0) return; any = true;
    const LL = OVR.eiffel ? layer(cam, 1) : L, bb = OVR.eiffel ? OVR.eiffel.base : base, z = (OVR.eiffel ? OVR.eiffel.z : 1.3) * LL.z, s = drive(eiffel, [], t, { vx: { up: k, glow: 0 }, part: i === 4 ? 0.4 : 1 }); eiffel.draw(SKY, LL.X(wx), LL.Y(bb) - eiffel.hh * z, z, t, s); });
  // five and a half gold piles (the first is «all gold ever mined»)
  const PX = [1018, 1086, 1154, 1222, 1290, 1358];
  PX.forEach((wx, i) => { const k = eout((t - PILE_T[i]) / 0.6); if (k <= 0) return; any = true;
    const z = 1.25 * L.z, s = drive(goldPile, [], t, { vx: { up: k, shine: sm(t, PILE_T[i] + 0.4, PILE_T[i] + 1) }, part: i === 5 ? 0.5 : 1 }); goldPile.draw(SKY, L.X(wx), L.Y(base - 40) - goldPile.hh * z, z, t, s); });
  return any ? (x, y) => (SKY.m[y * 540 + x] ? [SKY.d[(y * 540 + x) * 3], SKY.d[(y * 540 + x) * 3 + 1], SKY.d[(y * 540 + x) * 3 + 2]] : null) : null;
}
export const pileLabelAt = (cam) => { const L = layer(cam, 0.7); return [L.X(1018), L.Y(262 - 40) - 6 * Math.max(3, Math.round(16 * 1.25 * L.z * 0.6))]; };

// ---------------------------------------------------------------- drawing
/** cover-only overrides (cover.mjs): a still camera, the towers up, no HUD. The film never sets them. */
export const OVR = {};
export function drawWorld(c, t) {
  const cam = OVR.cam ?? camAt(t);
  const V = street.draw(c, cam, t, skyline(cam, t));
  return { V, cam };
}
const P = (V, wx, wy) => [V.X(wx), V.Y(wy)];

export function drawStory(c, W0, t) {
  const { V, cam } = W0, Z = cam.z;
  const sp = steveAt(t), [sx, sfy] = P(V, sp.x, GROUND - sp.h);
  const items = [];                                             // [depth, fn]
  const add = (d, f) => items.push([d, f]);

  // --- the portal (open at frame 0, closes on «Let's bring him…»)
  add(GROUND - 4, () => { const z = 1.0 * Z, [px, py] = P(V, X.portal, GROUND); portal.draw(c, px, py - portal.hh * z, z, t, drive(portal, PORTAL_KEYS, t)); });
  // --- passers-by
  add(GROUND - 12, () => { const z = 0.48 * Z, [x, y] = P(V, X.adult, GROUND - 12); adult.draw(c, x, y - adult.hh * z, z, t, drive(adult, [[0.35, "surprised"], [3.2, "idle"], [E.punches + 0.3, "point"], [E.goneEnd + 0.4, "idle"]], t, { look: [sx, sfy - 40 * Z], lookK: 1 })); });
  add(GROUND - 20, () => { const hop = 22 * sm(t, PUNCH1[1] + 0.05, PUNCH1[1] + 0.45), z = 0.46 * Z, [x, y] = P(V, X.worker + hop, GROUND - 20); officeWorker.draw(c, x, y - officeWorker.hh * z, z, t, drive(officeWorker, [[0.5, "surprised"], [2.6, "idle"], [PUNCH1[1] + 0.02, "surprised"], [PUNCH1[1] + 1.3, "idle"]], t)); });
  add(GROUND - 14, () => { const z = 0.4 * Z, [x, y] = P(V, X.child, GROUND - 14); child.draw(c, x, y - child.hh * z, z, t, drive(child, [[E.runs, "surprised"], [E.hour + 0.6, "idle"], [CRACK_T + 0.1, "surprised"], [E.mario, "wave"]], t)); });
  // --- the tree in a planter (log cut out, crown drops)
  add(GROUND - 2, () => drawTree(c, V, Z, t));
  // --- the concrete barrier (1 m cube) → cracks → item
  add(GROUND, () => { const [bx, by] = P(V, X.barrier, GROUND), side = BLOCK * Z;
    const crack = PUNCH2[0] < t ? clamp01((t - PUNCH2[0]) / (PUNCH2[1] - PUNCH2[0])) : 0, gone = sm(t, PUNCH2[1] + 0.02, PUNCH2[1] + 0.2);
    if (gone < 1) cube(view(c, 1 - gone), bx, by, side, { tex: TEX.concrete, yaw: 0.0, crack });
  });
  // --- bank with the vault door + cart
  add(GROUND - 30, () => drawBank(c, V, Z, t));
  // --- strongman
  add(GROUND - 6, () => { const z = 0.6 * Z, [x, y] = P(V, X.strong, GROUND - 6); strongman.draw(c, x, y - strongman.hh * z, z, t, drive(strongman, STRONG_KEYS, t, { look: [sx, sfy - 60 * Z], lookK: 1 })); });
  // --- scales, gold on the left, elephants on the right
  add(GROUND - 8, () => drawScales(c, V, Z, t, sp));
  // --- cars on the road (nearest), the bus passing at the start
  add(GROUND + 100, () => drawTraffic(c, V, Z, t));
  // --- the cyclist on the pavement edge
  add(GROUND + 18, () => { if (t < RUN[0] - 2 || t > RUN[1] + 3) return; const k = clamp01((t - (RUN[0] - 0.6)) / (RUN[1] + 0.6 - RUN[0] + 0.6)), x = lerp(BIKE.x0, BIKE.x1, k), z = 0.62 * Z, [bx, by] = P(V, x, GROUND + 18);
    cyclist.draw(c, bx, by - 40 * z, z, t, drive(cyclist, [[0, "ride"]], t)); });
  // --- the wire 1 m cube beside Steve on «each block is one meter»
  add(GROUND + 4, () => { const wa = win(t, E.block1 - 0.1, E.punches - 0.6, 0.35, 0.4); if (wa > 0) { const [bx, by] = P(V, steveAt(E.block1).x + 52, GROUND + 4); wireCube(c, bx, by, BLOCK * Z, wa, t); } });
  // --- the shulker box
  add(GROUND + 2, () => drawBox(c, V, Z, t));
  // --- the asphalt cracks under Steve (drawn before him)
  add(GROUND + 1, () => { if (t < CRACK_T - 0.1) return; const [cx, cy] = P(V, X.box - 48, GROUND + 2); asphalt.draw(c, cx, cy, 1.15 * Z, t, drive(asphalt, [[CRACK_T, "crack"], [CRACK_T + 1.1, "settle"]], t)); });
  // --- Steve
  add(GROUND + 3, () => drawSteve(c, V, Z, t, sp, sx, sfy));
  items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
  drawFx(c, V, Z, t, sp, sx, sfy);
  drawHud(c, V, Z, t, sp, sx, sfy, cam);
}

// ---------------------------------------------------------------- pieces
function shadowAt(c, x, y, rx, ry, k = 0.35) { c.tint(R(x - rx), R(y - ry), R(2 * rx), R(2 * ry), (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d); }, "#000000", 3); }
function drawSteve(c, V, Z, t, sp, sx, sfy) {
  const z = Z, s = drive(steve, [], t, { vx: { yaw: sp.yaw, head: sp.head, walk: sp.walk, run: sp.run, punch: sp.punch, hold: sp.hold, lift: sp.lift, sink: sp.sink, look: sp.look, roll: sp.roll, down: sp.down }, gait: gaitAt(t), clipDy: 1 });
  // faster arm swings on the concrete (time-lapse): shift the punch clock
  const tt = t > PUNCH2[0] - 0.2 && t < PUNCH2[1] + 0.2 ? PUNCH2[0] + (t - PUNCH2[0]) * 2.4 : t;
  const [, gy] = P(V, sp.x, GROUND); shadowAt(c, sx, gy + 1, (24 - sp.h * 0.2) * Z, 5 * Z, 0.35 * (1 - sp.sink * 0.8));
  const r = steve.draw(c, sx, sfy - steve.hh * z, z, tt, s);
  W_.hand = r.hand; W_.head = r.head; W_.box = r.box;
  // landing dust at frame ~FLY
  const dk = clamp01((t - 0.8) / 0.9); if (dk > 0 && dk < 1) for (let q = 0; q < 10; q++) { const sd = q % 2 ? 1 : -1, d = (14 + q * 4) * eout(dk) * Z, rr = (4 + (q % 3)) * Z * (1 - dk * 0.6); puff(c, sx + sd * d, gy - 2 * Z - 6 * Z * Math.sin(Math.PI * dk) * (q % 3) / 2, rr, (1 - dk) * 0.9); }
  // the gold block overhead (from the platform to the hand, then into the inventory)
  drawHeldGold(c, V, Z, t, r);
}
const W_ = {};
function puff(c, x, y, r, a) { if (a <= 0) return; for (let j = -R(r); j <= R(r); j++) for (let i = -R(r); i <= R(r); i++) { const d = (i * i + j * j) / (r * r + 0.01); if (d <= 1 && a * (1 - 0.5 * d) > bayer(R(x + i), R(y + j))) c.px(R(x + i), R(y + j), j < 0 ? "#E8E2EE" : "#C4BCD0"); } }

function drawTree(c, V, Z, t) {
  const S = 0.75 * Z, [fx, fy] = P(V, X.tree, GROUND - 2), cy = fy - 118 * S, cutLo = 18, cutHi = 48;
  const yLo = fy - cutLo * S, yHi = fy - cutHi * S, gone = sm(t, PUNCH1[1] - 0.02, PUNCH1[1] + 0.14), drop = crownDrop(t) * (cutHi - cutLo) * S;
  const s = drive(tree, [], t, { vx: { sway: 0.2 + 0.8 * Math.max(0, Math.sin(Math.PI * clamp01((t - PUNCH1[1] - 0.4) / 1.0))) } });
  // planter box
  const pw = 46 * Z, ph = 22 * Z; c.rect(R(fx - pw / 2) - 1, R(fy - ph) - 1, R(pw) + 2, R(ph) + 2, "#0B0812"); c.rect(R(fx - pw / 2), R(fy - ph), R(pw), R(ph), "#9A96A8"); c.rect(R(fx - pw / 2), R(fy - ph), R(pw), 2, "#C8C4D4"); c.rect(R(fx - pw / 2), R(fy - 4 * Z), R(pw), R(4 * Z), "#6E6A80");
  const lower = Object.create(c); lower.px = (x, y, col) => { if (y >= yLo) c.px(x, y, col); };
  const mid = Object.create(c); mid.px = (x, y, col) => { if (y < yLo && y >= yHi && (1 - gone) > bayer(Math.floor(x), Math.floor(y))) c.px(x, y, col); };
  const upper = Object.create(c); upper.px = (x, y, col) => { if (y < yHi) c.px(x, R(y + drop), col); };
  upper.get = (x, y) => c.get(x, y + drop);
  tree.draw(upper, fx, cy, S, t, s); tree.draw(mid, fx, cy, S, t, s); tree.draw(lower, fx, cy, S, t, s);
  c.rect(R(fx - pw / 2), R(fy - ph), R(pw), R(5 * Z), "#5A3A26"); c.rect(R(fx - pw / 2), R(fy - ph), R(pw), 1, "#0B0812");     // soil over the trunk foot
  // cracks on the log band while punched
  if (t > PUNCH1[0] && gone < 1) { const st = clamp01((t - PUNCH1[0]) / 3.0); cracks.draw(view(c, 1 - gone), fx, (yLo + yHi) / 2, 1, t, drive(cracks, [], t, { vx: { stage: st }, w: 24 * Z, h: (cutHi - cutLo) * S })); }
  W_.log = [fx, (yLo + yHi) / 2];
  // the crown hits the stump: dust
  const hit = PUNCH1[1] + 0.45; if (t > hit && t < hit + 0.9) { const k = (t - hit) / 0.9; for (let q = 0; q < 8; q++) puff(c, fx + (q - 3.5) * 9 * Z * eout(k), yLo - 2 - 4 * Z * Math.sin(Math.PI * k), (3 + (q % 2)) * Z, (1 - k) * 0.8); }
}

function wireCube(c, bx, by, side, a, t) {
  // a dashed wireframe exactly around the 1 m block (same projection as lib/box3d: pitch 0.24)
  const cp = Math.cos(0.24), sp = Math.sin(0.24), h = side / 2, Pp = (x, y, z) => [bx + x, by - (y * cp - z * sp)];
  const pts = [[-h, 0, -h], [h, 0, -h], [h, 0, h], [-h, 0, h], [-h, side, -h], [h, side, -h], [h, side, h], [-h, side, h]].map((p) => Pp(p[0] * 1.06, p[1] * 1.04, p[2] * 1.06));
  const E2 = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]], g = fade(c, a), grow = sm(a, 0, 1);
  for (const [i, j] of E2) { const [x0, y0] = pts[i], [x1, y1] = pts[j], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let q = 0; q <= n * grow; q++) { if ((q + R(t * 12)) % 8 >= 5) continue; const X0 = R(x0 + ((x1 - x0) * q) / n), Y0 = R(y0 + ((y1 - y0) * q) / n); g.rect(X0 - 1, Y0 - 1, 3, 3, C.O); } }
  for (const [i, j] of E2) { const [x0, y0] = pts[i], [x1, y1] = pts[j], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let q = 0; q <= n * grow; q++) { if ((q + R(t * 12)) % 8 >= 5) continue; g.rect(R(x0 + ((x1 - x0) * q) / n), R(y0 + ((y1 - y0) * q) / n), 2, 2, C.Y); } }
}

function drawBank(c, V, Z, t) {
  const z = 0.85 * Z, [bx, by] = P(V, X.bank, GROUND - 30), cy = by - bank.hh * z;
  const r = bank.draw(c, bx, cy, z, t, drive(bank, [[VAULT[0] - 0.2, "lights"]], t));
  // our round vault door in the doorway: it swings open (squashes sideways) and gold light spills out
  const dx = bx, dyy = cy + 15 * z + 42 * z, dr = 15 * z, open = eio((t - VAULT[0]) / (VAULT[1] - VAULT[0]));
  if (t > VAULT[0] - 0.6 && t < CART.go[1] + 1.2) {
    const a = sm(t, VAULT[0] - 0.6, VAULT[0] - 0.2) * (1 - sm(t, CART.go[1] + 0.4, CART.go[1] + 1.1));
    const g = fade(c, a);
    for (let j = -R(dr); j <= R(dr); j++) for (let i = -R(dr); i <= R(dr); i++) if (i * i + j * j <= dr * dr) g.px(R(dx) + i, R(dyy) + j, open > 0.05 ? (j + i) % 3 === 0 ? "#FFE680" : "#F2C23A" : "#2A2034");
    const w = (1 - open) * dr, ox = dx - dr + w;                 // the door leaf turns on its left hinge
    for (let j = -R(dr); j <= R(dr); j++) for (let i = -R(w); i <= R(w); i++) { const u = i / Math.max(1, w), d = u * u + (j / dr) ** 2; if (d > 1) continue; g.px(R(ox) + i, R(dyy) + j, d > 0.82 ? "#0B0812" : d > 0.6 ? "#9AA0B8" : (Math.abs(j) < 2 || Math.abs(i) < 2 * (w / dr)) ? "#5A607E" : "#C8CCDC"); }
  }
  W_.bankDoor = [dx, dyy + dr];
}
const cartAt = (t, V, Z) => { // the gold block on its little cart: out of the vault, then along the pavement to the left platform
  const o = eio((t - CART.out[0]) / (CART.out[1] - CART.out[0])), g = eio((t - CART.go[0]) / (CART.go[1] - CART.go[0]));
  const x = lerp(lerp(X.bank, X.bank + 6, o), X.scales - 100, g), dep = lerp(GROUND - 26, GROUND - 2, o);
  return { x, dep, a: sm(t, CART.out[0] - 0.05, CART.out[0] + 0.2), roll: (t - CART.out[0]) };
};
function drawScales(c, V, Z, t, sp) {
  const z = Z, [x, y] = P(V, X.scales, GROUND - 8), tilt = tiltAt(t), s = drive(scales, [], t, { vx: { tilt } });
  const r = scales.draw(c, x, y - scales.hh * z, z, t, s), G = r.G;
  W_.left = G.left; W_.right = G.right;
  // elephants walk on one by one
  ELE.forEach(([a, b], i) => { if (t < a - 0.05) return; const k = eio((t - a) / (b - a)), ex = lerp(ELE_FROM + i * 30, ELE_X[i], k), [px] = P(V, ex, 0), ez = 0.78 * Z;
    const onK = sm(t, b - 0.35, b), top = lerp(y, G.right.top, onK) - (i === 1 ? 5 * Z : 0);
    const st = drive(elephant, [], t, { vx: { walk: k < 1 ? 1 - sm(t, b - 0.15, b + 0.1) : 0, trumpet: i === 1 ? win(t, E.elephants + 0.2, E.strongest, 0.4, 0.4) : 0 }, dir: -1, gait: ex / 40 });
    elephant.draw(c, px, top - elephant.hh * ez, ez, t, st); });
  // the gold block on the cart / on the left platform (hidden once Steve has it)
  const cart = cartAt(t, V, Z);
  if (t > CART.out[0] - 0.05 && t < LIFT[0] + 0.02) {
    const [cx] = P(V, cart.x, 0), onK = sm(t, CART.go[1] - 0.25, CART.go[1]), [, groundY] = P(V, 0, cart.dep);
    const baseY = lerp(groundY - 8 * Z, G.left.top, onK), g = view(c, cart.a);
    if (onK < 1) { const ca = cart.a * (1 - onK); const cg = view(c, ca); cg.rect(R(cx - 28 * Z), R(baseY), R(56 * Z), R(5 * Z), "#5A607E"); cg.rect(R(cx - 28 * Z), R(baseY), R(56 * Z), 1, "#A6AEC8");
      for (const sd of [-1, 1]) { const wx = cx + sd * 18 * Z, wy = baseY + 7 * Z; for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9 * Z) cg.px(R(wx) + i, R(wy) + j, i * i + j * j > 4 ? "#0B0812" : "#3E425A"); } }
    cube(g, cx, baseY, BLOCK * Z, { tex: TEX.gold, yaw: 0.0, light: 0.03 });
    W_.goldOnPlat = [cx, baseY - BLOCK * Z * 1.05];
  }
}
function drawHeldGold(c, V, Z, t, r) {
  if (t < LIFT[0] || t > TOSLOT[1] + 0.05) return;
  const k = eio((t - LIFT[0]) / (LIFT[1] - LIFT[0])), from = W_.goldOnPlat ?? [r.hand[0], r.hand[1]], side = BLOCK * Z;
  let x = lerp(from[0], r.handFar[0], k), y = lerp(from[1] + side * 1.05, r.handFar[1] + 1, k), sc = 1, a = 1;
  if (t > TOSLOT[0]) { const q = eio((t - TOSLOT[0]) / (TOSLOT[1] - TOSLOT[0])), [tx, ty] = slotXY(0, 255, invY(t)); x = lerp(x, tx, q); y = lerp(y, ty + 10, q) - 40 * Math.sin(Math.PI * q); sc = lerp(1, 0.32, q); a = 1 - sm(q, 0.85, 1); }
  cube(view(c, a), x, y, side * sc, { tex: TEX.gold, yaw: 0.0 + (t > TOSLOT[0] ? 2 * (t - TOSLOT[0]) : 0), light: 0.03 });
}
function drawTraffic(c, V, Z, t) {
  // the bus passes on the road under the pull-back; two parked cars further along (their lights flash when the street breaks)
  if (t < 7) { const k = (t - 2.6) / 4.2, x = lerp(-260, 820, k), [bx, by] = P(V, x, 742), z = 1.0 * Z; if (k > -0.2 && k < 1.2) bus.draw(c, bx, by - bus.hh * z, z, t, drive(bus, [[0, "drive"]], t)); }
  for (const [wx, dir] of [[X.car1, 1], [X.car2, -1]]) { const [cx, cy] = P(V, wx, 770), z = 0.9 * Z; if (cx < -120 || cx > 660) continue;
    car.draw(c, cx, cy - car.hh * z, z, t, drive(car, [[CRACK_T + 0.15, "lights"]], t, { slot: dir > 0 ? "left" : "right" }));
    if (t > CRACK_T + 0.15) { const bl = Math.max(0, Math.sin((t - CRACK_T - 0.15) * Math.PI * 2.2)) * sm(t, CRACK_T + 0.15, CRACK_T + 0.4); for (const sd of [-1, 1]) puffGlow(c, cx + sd * 40 * z, cy - 6 * z, 7 * z, bl * 0.9, "#FFB040"); } }
}
function puffGlow(c, x, y, r, a, col) { if (a <= 0.02) return; for (let j = -R(r); j <= R(r); j++) for (let i = -R(r); i <= R(r); i++) { const d = (i * i + j * j) / (r * r); if (d <= 1 && a * (1 - d) > bayer(R(x + i), R(y + j)) * 0.9) c.px(R(x + i), R(y + j), d < 0.25 ? "#FFF2C0" : col); } }
function drawBox(c, V, Z, t) {
  if (t < E.and8) return;
  const [bx, by] = P(V, X.box, GROUND + 2), z = (BLOCK / 64) * Z;
  const shrinkK = eio((t - BOX.shrink) / 0.6), flyK = eio((t - BOX.fly[0]) / (BOX.fly[1] - BOX.fly[0]));
  if (t < BOX.fly[0]) { shulker.draw(c, bx, by - 40 * z, z, t, drive(shulker, [[BOX.open, "open"], [BOX.shrink, "shrink"]], t, { side: 64 })); W_.boxAt = [bx, by - 30 * z * shrinkK - 20 * z]; }
  else if (flyK < 1) { const [tx, ty] = slotXY(0, 255, invY(t)), from = W_.boxAt ?? [bx, by - 40 * z], x = lerp(from[0], tx, flyK), y = lerp(from[1], ty, flyK) - 60 * Math.sin(Math.PI * flyK); putIcon(c, "shulker", x, y, 20, lerp(1.0, 1, flyK)); }
}

// ---------------------------------------------------------------- effects over the world
function drawFx(c, V, Z, t, sp, sx, sfy) {
  // log + concrete items fly to the hand
  for (const [fly, kind, fromF] of [[LOG_FLY, "log", () => W_.log], [CON_FLY, "concrete", () => { const [bx, by] = P(V, X.barrier, GROUND); return [bx, by - BLOCK * Z * 0.5]; }]]) {
    if (t < fly[0] - 0.15 || t > fly[1] + 0.05) continue;
    const from = fromF(); if (!from) continue; const k = eio((t - fly[0]) / (fly[1] - fly[0])), to = W_.hand ?? [sx, sfy - 50 * Z];
    const x = lerp(from[0], to[0], k), y = lerp(from[1], to[1], k) - 26 * Z * Math.sin(Math.PI * k), side = lerp(18, 8, k) * Z, a = sm(t, fly[0] - 0.15, fly[0]) * (1 - sm(k, 0.85, 1));
    cube(view(c, a), x, y + side / 2, side, { tex: TEX[kind], yaw: 1.8 * t });
    if (k > 0.85 && k < 1) { const q = (k - 0.85) / 0.15; for (let i = 0; i < 6; i++) { const an = i * 1.05; puffGlow(c, to[0] + Math.cos(an) * 8 * q * Z, to[1] + Math.sin(an) * 8 * q * Z, 1.5 * Z, 1 - q, "#FFFFFF"); } }
  }
  // coffee cup dropped by the passer-by at frame ~0.4
  { const z = 0.48 * Z, [ax, ay] = P(V, X.adult, GROUND - 12), k = clamp01((t - 0.32) / 0.42), hx = ax + 26 * z, hy = ay - 92 * z;
    if (t < 0.32) cupAt(c, hx, hy, 0, z, 1); else if (k < 1) cupAt(c, hx + 6 * z * k, lerp(hy, ay - 2, k * k), 2.6 * k, z, 1);
    if (t > 0.74) { const p = eout((t - 0.74) / 0.6), w = 20 * z * p, h = 5 * z * p; for (let j = -R(h); j <= R(h); j++) for (let i = -R(w); i <= R(w); i++) if ((i / Math.max(1, w)) ** 2 + (j / Math.max(1, h)) ** 2 <= 1) c.px(R(hx + 10 * z) + i, R(ay - 1) + j, (i + j) % 5 === 0 ? "#8A5A36" : "#6A3E22");
      cupAt(c, hx + 16 * z, ay - 4 * z, 1.57, z, 1); } }
  // measuring tape beside Steve (1.8 m) on «one point eight meters»
  const ta = win(t, E.one8 - 0.2, E.side + 0.3, 0.3, 0.4);
  if (ta > 0) { const [, gy] = P(V, sp.x, GROUND), hgt = 90 * Z * eio((t - E.one8 + 0.15) / 0.65), x0 = R(sx - 34 * Z), g = fade(c, ta);
    g.rect(x0 - 1, R(gy - hgt) - 1, R(7 * Z) + 2, R(hgt) + 2, C.O); g.rect(x0, R(gy - hgt), R(7 * Z), R(hgt), "#F4CA50");
    for (let y = 0; y < hgt; y += 4.5 * Z) g.rect(x0, R(gy - y), R((Math.round(y / (4.5 * Z)) % 2 ? 2 : 4) * Z), 1, C.O);
    g.rect(x0 - 2, R(gy - hgt) - 2, R(11 * Z), 3, "#E04848");
    label(c, "1.8 m", x0 - 4, gy - 90 * Z - 34, ta * sm(t, E.one8 - 0.05, E.one8 + 0.3), C.Y, 3); }
  // «1 m» on the wire cube
  { const la = win(t, E.oneM - 0.1, E.punches - 0.3, 0.3, 0.4); if (la > 0) { const [bx, by] = P(V, sp.x + 52, GROUND + 4); label(c, "1 m", bx, by - BLOCK * Z * 1.35 - 30, la, C.Y, 3); } }
}
function cupAt(c, x, y, rot, z, a) {
  const pts = [[-4, -6], [4, -6], [3, 6], [-3, 6]].map(([u, v]) => [x + (u * Math.cos(rot) - v * Math.sin(rot)) * z * 1.6, y + (u * Math.sin(rot) + v * Math.cos(rot)) * z * 1.6]);
  c.poly(pts, "#F4EEE0"); for (let i = 0; i < 4; i++) { const p = pts[i], q = pts[(i + 1) % 4]; c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#0B0812"); }
  const m = [(pts[0][0] + pts[3][0]) / 2 * 0.5 + (pts[1][0] + pts[2][0]) / 2 * 0.5, (pts[0][1] + pts[3][1]) / 2 * 0.5 + (pts[1][1] + pts[2][1]) / 2 * 0.5]; c.rect(R(m[0]) - 1, R(m[1]) - 1, 3, 2, "#8A5A36");
}

// ---------------------------------------------------------------- HUD (screen space, inside the main safe zone)
export const invY = (t) => 258 - 24 * (1 - sm(t, INV.in, INV.in + 0.45)) * (t < E.thirty6a ? 1 : 0);
function drawHud(c, V, Z, t, sp, sx, sfy, cam) {
  if (OVR.noHud) return;
  // STEVE plate over his head
  { const a = win(t, 0.35, E.lets + 0.1, 0.35, 0.45); if (a > 0) pill(c, "STEVE", sx, sfy - 92 * Z - 40, a, { edge: "#7FE3F0" }); }
  // timers: tree (real 3 s) and concrete (time-lapse to 9 s)
  { const a = win(t, PUNCH1[0] - 0.2, PUNCH1[1] + 0.6, 0.3, 0.4); if (a > 0) { const [tx] = P(V, X.tree, 0); timer.draw(c, Math.max(110, Math.min(400, tx)), 250, 1, t, drive(timer, [[PUNCH1[0], "run"], [PUNCH1[1], "done"]], t, { a, scale: 3, value: 3 * clamp01((t - PUNCH1[0]) / 3), final: 3, unit: "s" })); } }
  { const a = win(t, PUNCH2[0] - 0.15, E.hands + 0.5, 0.3, 0.4); if (a > 0) { const [tx] = P(V, X.barrier - 10, 0);
    const r = timer.draw(c, Math.max(110, Math.min(380, tx)), 250, 1, t, drive(timer, [[PUNCH2[0], "run"], [PUNCH2[1], "done"]], t, { a, scale: 3, value: 9 * clamp01((t - PUNCH2[0]) / (PUNCH2[1] - PUNCH2[0])), final: 9, unit: "s" }));
    const ff = a * (1 - sm(t, PUNCH2[1], PUNCH2[1] + 0.3)), g = fade(c, ff); for (const o of [0, 9]) g.poly([[r.box.x1 + 6 + o, 240], [r.box.x1 + 14 + o, 250], [r.box.x1 + 6 + o, 260]], "#7FE3F0"); } }
  // BARE HANDS sign with a fist
  { const a = win(t, E.bare - 0.1, E.heaviest - 0.1, 0.3, 0.4); if (a > 0) { const yy = 300 + R(8 * (1 - sm(t, E.bare - 0.1, E.bare + 0.3))), w = c.measure(MAIN, "BARE HANDS", { scale: 2 }) + 58, x0 = R(270 - w / 2); plate(c, x0, yy, w, 36, a, C.Y); fist(c, x0 + 10, yy + 8, 2, a); fade(c, a).text(MAIN, "BARE HANDS", x0 + 44, yy + 11, C.IV, { scale: 2 }); } }
  // 19 t on the gold block
  { const a = win(t, E.nineteen - 0.1, E.steve3 - 0.1, 0.3, 0.4); if (a > 0 && W_.left) { const x = W_.goldOnPlat ? W_.goldOnPlat[0] : W_.left.x; pill(c, "19 t", x, (W_.goldOnPlat ? W_.goldOnPlat[1] : W_.left.top - 60) - 44, a, { edge: C.Y, col: C.Y, scale: 3 }); } }
  // ≈0.5 t · WORLD RECORD over the strongman
  { const a = win(t, E.half - 0.1, E.his - 0.2, 0.3, 0.4); if (a > 0) { const [x] = P(V, X.strong, 0), cx = Math.max(110, Math.min(430, x)); const p = pill(c, "≈0.5 t", cx, 250, a, { edge: "#FF8A80", col: C.IV, scale: 3 }); if (p) label(c, "WORLD RECORD", cx, 250 + p.h + 8, a, "#FF8A80", 3); } }
  // ×40
  { const a = win(t, E.forty - 0.3, E.his - 0.1, 0.25, 0.4); if (a > 0) { const k = eio((t - E.forty + 0.3) / 0.6), sc = 5 + Math.sin(Math.PI * clamp01((t - E.forty) / 0.5)) * 0.6, scI = Math.round(sc), val = lerp(1, 40, k), w = odoW(c, 40, { scale: scI, prefix: "×" }) + 28, x0 = R(270 - w / 2);
    plate(c, x0, 168, w, 7 * scI + 18, a, C.Y); odo(c, val, x0 + 14, 177, a, { scale: scI, prefix: "×", digits: 2, col: C.Y, smoothOnes: true }); } }
  // the inventory card (slides in from above; full of gold; later 36 boxes)
  const ia = Math.max(win(t, INV.in, INV.out, 0.4, 0.45), win(t, INV.in2, INV.out2, 0.4, 0.45));
  if (ia > 0) {
    const y = invY(t) - R(30 * (sm(t, INV.out, INV.out + 0.45) * (t < INV.in2 ? 1 : 0) + sm(t, INV.out2, INV.out2 + 0.45))), slot0 = sm(t, TOSLOT[1] - 0.12, TOSLOT[1] + 0.1);
    const fill = t < INV.fill[0] ? slot0 / 7 : lerp(1 / 7, 1, clamp01((t - INV.fill[0]) / (INV.fill[1] - INV.fill[0])));
    const box0 = sm(t, BOX.fly[1] - 0.12, BOX.fly[1] + 0.12) * 3, wave = clamp01((t - BOX.wave[0]) / (BOX.wave[1] - BOX.wave[0]));
    inv.draw(c, 255, y, 1, t, drive(inv, [], t, { a: ia, vx: { fill, count: sm(t, INV.count, INV.count + 0.4), boxes: 0 }, boxAt: (i) => (i === 0 ? box0 : wave * 38 - i + 1), pulse: t < BOX.fly[0] ? 0 : 0, pulseK: clamp01((t - BOX.fly[1] + 0.1) / 0.5) }));
  }
  // counters under the card
  { const a1 = win(t, COUNT.blocks[0] - 0.1, INV.out2 > t && t > INV.in2 ? 0 : E.and8 + 0.1, 0.3, 0.4) * (t < E.then ? 1 : 0);
    if (a1 > 0) { const k1 = eio((t - COUNT.blocks[0]) / (COUNT.blocks[1] - COUNT.blocks[0])), k2 = eio((t - COUNT.tonnes[0]) / (COUNT.tonnes[1] - COUNT.tonnes[0]));
      const y0 = lerp(368, 384, sm(t, INV.out, INV.out + 0.5)), w1 = odoW(c, 2304, { scale: 3, suffix: " BLOCKS" }) + 24; plate(c, R(255 - w1 / 2), y0, w1, 34, a1, C.Y); odo(c, 2304 * k1, R(255 - w1 / 2) + 12, y0 + 6, a1, { scale: 3, digits: 4, suffix: " BLOCKS", suffixCol: C.Y });
      const a2 = a1 * sm(t, COUNT.tonnes[0] - 0.15, COUNT.tonnes[0] + 0.15); if (a2 > 0) { const w2 = odoW(c, 44000, { scale: 4, suffix: "t" }) + 24; plate(c, R(255 - w2 / 2), y0 + 42, w2, 46, a2, C.Y); odo(c, 44000 * k2, R(255 - w2 / 2) + 12, y0 + 48, a2, { scale: 4, digits: 5, suffix: "t", suffixCol: C.Y }); } } }
  { const a = win(t, COUNT.big[0] - 0.15, E.theres - 0.05, 0.3, 0.45); if (a > 0) { const k = eio((t - COUNT.big[0]) / (COUNT.big[1] - COUNT.big[0])), w = odoW(c, 1200000, { scale: 4, suffix: "t" }) + 24, y0 = lerp(372, 420, sm(t, INV.out2, INV.out2 + 0.5));
    plate(c, R(255 - w / 2), y0, w, 46, a, C.Y); odo(c, 1200000 * k, R(255 - w / 2) + 12, y0 + 6, a, { scale: 4, digits: 7, suffix: "t", suffixCol: C.Y }); } }
  // the gold piles' label: over the first pile (= all gold ever mined), pointing down at it
  { const a = win(t, E.all - 0.15, E.theres + 0.1, 0.35, 0.4); if (a > 0) { const [lx, ly] = pileLabelAt(cam), w = c.measure(MAIN, "ALL GOLD EVER MINED", { scale: 2 }) + 24, cx = Math.max(w / 2 + 40, Math.min(440 - w / 2, lx + 60)), y = Math.max(160, ly - 70);
    plate(c, R(cx - w / 2), y, w, 52, a, C.Y); label(c, "ALL GOLD EVER MINED", cx, y + 8, a, C.IV, 2); label(c, "≈ 220,000 t", cx, y + 28, a, C.Y, 2);
    const g = fade(c, a); for (let k = 0; k < 10; k++) g.rect(R(lx) - 1, y + 54 + k * 2, 3, 1, C.Y); } }
  // the speedometer while he runs
  { const a = win(t, SPEED[0], SPEED[1], 0.3, 0.4); if (a > 0) speedo.draw(c, 360, 250, 1, t, drive(speedo, [[E.twenty - 0.1, "up"]], t, { a, value: 20, unit: "km/h" })); }
  // the box's own 3 × 9 grid over it
  { const a = win(t, BOX.grid[0], BOX.grid[1], 0.35, 0.35); if (a > 0) { const [bx] = P(V, X.box, 0), fill = clamp01((t - BOX.fill[0]) / (BOX.fill[1] - BOX.fill[0]));
    inv.draw(c, 255, 352, 1, t, drive(inv, [], t, { a, cols: 9, rows: 3, size: 30, edge: "#C9A2FF", vx: { fill, count: 0, boxes: 0 } })); } }
  // NEXT: MARIO
  { const a = sm(t, NEXT_T, NEXT_T + 0.35); if (a > 0) { const y = 322 + R(10 * (1 - eout((t - NEXT_T) / 0.4))), w = c.measure(MAIN, "NEXT: MARIO", { scale: 3 }) + 84, x0 = R(240 - w / 2);
    plate(c, x0, y, w, 62, a, "#FF8A80"); mystery(c, x0 + 30, y + 30, 1.5, a); fade(c, a).text(MAIN, "NEXT: MARIO", x0 + 64, y + 21, C.IV, { scale: 3 }); } }
}
