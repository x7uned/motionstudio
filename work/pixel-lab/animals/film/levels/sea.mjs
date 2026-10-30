// LV1–LV3 · the sea column (x 0..540): deep floor with the barrel sponge, the moon jelly in mid-water, the octopus on a
// sunlit reef rock near the surface, a layered cliff with fossils on the left and the shelf drop-off on the right (it
// meets the shore slope at x 540, y 300). The same column repeats under the night city (V.dive): the final dive passes
// the human skull layer and the dinosaur bed and lands on the sponge = the first frame. Ambient motion is periodic over
// END, events are anchored to words; nothing appears or changes in one frame.
import { BIOME, SURFACE, SEA_FLOOR, EV, W } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { sign, pickup, tag, win, ease, fade, mix, bayer, C } from "../cute.mjs";
import * as T from "./sea-terrain.mjs";
import * as L from "./sea-life.mjs";
import { blit, R, clamp01, sm, lerp, rnd, osc, cyc, ang, blinkP, dcol } from "./sea-common.mjs";

export const RANGE = BIOME.sea;
const SP = { x: 270, y: SEA_FLOOR };                 // sponge base
const JE = { x: 270, y: 906 };                       // jelly bell rim centre at rest (head on the disc at REST.jelly)
const OC = { x: 270, y: T.REEF_TOP };                // octopus: rock top under its centre
const JAR = { x: 352 };                              // the crab jar on the rock, in front of the octopus (right)
const MOST = W("most");

// ---------------------------------------------------------------- event timing (shared with levels/sea-motions.mjs for the sound design)
// windows are [start, end, fadeIn, fadeOut] for win(), ramps are [start, end] for sm(); every value derives from EV/W().
export const TIMING = {
  stream: { n: 38, bands: 76, grow: [EV.filters, EV.jellyfish, 0.5, 1.0] },      // osculum specks cycle n times per END
  food: { lead: 0.3, stagger: 0.075, dur: 1.15, pairs: 13, absorb: 0.82 },        // absorb: fraction of the drift where a speck dissolves into a pore                     // 26 specks, two per start time
  fossil: [EV.dinosaurs, EV.filters - 0.2, 0.3, 0.4],                            // glow outline + DINOSAURS tag
  zeroTag: [EV.zero, EV.step - 0.55, 0.3, 0.35],
  lv2: { rise: [EV.step, EV.jellyfish], fade: [EV.step - 0.1, EV.step + 0.5] },
  jelly: { idleN: 30, idleContract: 0.2, idleRelax: 0.65, swimFrom: EV.now, swimD: 0.34, swimN: 6, contract: 0.3 },
  noBrainTag: [EV.noBrain, EV.now - 0.15, 0.3, 0.3],
  net: [EV.net - 0.05, EV.nerves + 0.4],                                         // nerve net lights up from the centre
  pickup: 1.6,
  octoWave: [EV.octopus + 0.2, EV.five - 0.1, 0.3, 0.4],
  cellsTag: [EV.five, EV.arms + 0.45, 0.3, 0.35],
  dots: { n: 48, head: [EV.five, EV.million + 0.4], fadeIn: 0.2, armFrom: MOST, stagger: 0.035, groups: 9, dur: 0.45, out: [EV.solves - 0.25, EV.solves + 0.35] },
  wrap: [EV.solves, EV.solves + 0.55],
  twist: [EV.solves + 0.45, EV.opening], twistTurns: 2.5,
  lift: [EV.opening, EV.jar + 0.05],
  crab: [EV.jar - 0.1, EV.jar + 0.35],
  skullTag: [EV.threeHundred + 0.22, EV.years2 + 0.1, 0.25, 0.3],
  diveDinoTag: [EV.animal - 0.15, EV.bottom + 0.25, 0.25, 0.35],
};
const TM = TIMING;

let K = null;
const caches = () => (K ??= { cliff: T.buildCliff(false), cliffDive: T.buildCliff(true), floor: T.buildFloor(), shelf: T.buildShelf(), shelfN: T.buildShelf(true), reef: T.buildReef(), reefN: T.buildReef(true), ring: T.dinoRing() });
const onScreen = (V) => V.X(0) < 540 + 40 && V.X(540) > -40;
const inY = (V, y0, y1) => V.Y(y1) > -20 && V.Y(y0) < 980;

// ---------------------------------------------------------------- event state (the dive copy is the column at the start of the loop)
function jellyState(V, t) {
  const te = V.dive ? -1 : t, d = TM.jelly.swimD, N = TM.jelly.swimN, PTS = [[270, 906], [300, 828], [382, 738], [452, 600], [482, 420], [546, 262], [690, 172]];
  const fi = cyc(t, TM.jelly.idleN), idleP = 0.55 * (fi < TM.jelly.idleContract ? sm(fi, 0, TM.jelly.idleContract) : 1 - sm(fi, TM.jelly.idleContract, TM.jelly.idleRelax));
  const ix = 2 * osc(t, 9, 1), iy = 3 * osc(t, 30, -1.2) - 2 * osc(t, 7);
  if (te < EV.now) return { x: JE.x + ix, y: JE.y + iy, p: idleP, trail: 0, u: 0 };
  const keep = 1 - sm(te, EV.now, EV.now + 0.35);                                  // idle drift and pulse hand over smoothly
  const s = (te - EV.now) / d, k = Math.min(N - 1, Math.floor(s)), f = clamp01(s - k), u = Math.min(N, k + (1 - (1 - f) ** 3));
  const p = s >= N ? 0 : f < TM.jelly.contract ? Math.sin((Math.PI * f) / TM.jelly.contract) : 0;
  // Catmull-Rom through the path points
  const i = Math.min(N - 1, Math.floor(u)), q = u - i, P = (j) => PTS[Math.max(0, Math.min(PTS.length - 1, j))];
  const cr = (a, b, c2, e, x) => 0.5 * (2 * b + (-a + c2) * x + (2 * a - 5 * b + 4 * c2 - e) * x * x + (-a + 3 * b - 3 * c2 + e) * x * x * x);
  const x = cr(P(i - 1)[0], P(i)[0], P(i + 1)[0], P(i + 2)[0], q), y = cr(P(i - 1)[1], P(i)[1], P(i + 1)[1], P(i + 2)[1], q);
  return { x: x + ix * keep, y: y + iy * keep, p: Math.max(p, idleP * keep), trail: sm(te, EV.now, EV.now + 0.3) * 0.85, u };
}

// ---------------------------------------------------------------- fill: water + far background (behind the sky disc)
export function fill(c, V, t) {
  if (!onScreen(V)) return; L.setNight(V.dive);
  drawWater(c, V, t, RANGE[0], RANGE[1], SURFACE);
  // tiny far jellies drifting in the blue (behind the disc), mid-water only
  for (let i = 0; i < 5; i++) {
    const wx = 40 + rnd(i * 9 + 1) * 460, wy = 980 + rnd(i * 9 + 2) * 520 + 10 * osc(t, 5 + i, i), sx = R(V.X(wx)), sy = R(V.Y(wy));
    if (sy < -20 || sy > 980 || sx < -10 || sx > 550) continue; const p = 0.5 + 0.5 * osc(t, 23 + i, i * 2), r = 5 + (i % 3);
    const col = dcol("#C49AF0", wy + 500, V.dive), g = L.glass(c, 0.45);
    for (let Y = -r; Y <= 1; Y++) for (let X = -r - 1; X <= r + 1; X++) if ((X / (r * (1 - 0.15 * p))) ** 2 + (Y / r) ** 2 <= 1) g.px(sx + X, sy + Y, col);
    for (let k = -2; k <= 2; k++) for (let s = 2; s < 8 + r; s++) if ((s + k) % 2 === 0) g.px(sx + k * 2 + R(Math.sin(s * 0.4 + ang(t, 11, i))), sy + s, col);
  }
}

// ---------------------------------------------------------------- back: terrain + plants behind the animals
export function back(c, V, t) {
  if (!onScreen(V)) return; L.setNight(V.dive);
  const k = caches();
  if (inY(V, 440, 820)) blit(c, V, V.dive ? k.reefN : k.reef);
  blit(c, V, V.dive ? k.cliffDive.K : k.cliff.K);
  if (inY(V, 290, 1820)) blit(c, V, V.dive ? k.shelfN : k.shelf);
  if (inY(V, 1720, 2150)) blit(c, V, k.floor);
  // waves lapping at the foot of the cliff
  if (inY(V, -10, 10)) { const e = k.cliff.E(0); for (let x = e - 2; x < e + 10; x++) { const wv = R(Math.sin(x * 0.7 + ang(t, 60)) * 1.2); if (rnd(x + Math.floor(cyc(t, 120) * 8)) < 0.7) c.px(V.X(x), V.Y(wv - 1), "#F4FFFF"); c.px(V.X(x), V.Y(wv), "#BFF6FF"); } }
  // caustic light dancing on the sunlit reef top
  if (inY(V, 470, 520)) for (let x = 110; x < 444; x++) { const ty = T.reefTop(x); for (let y = ty + 1; y < ty + 7; y++) { const f = Math.sin(x * 0.21 + 2.2 * Math.sin(y * 0.5 + ang(t, 40)) + ang(t, 23)) + Math.sin(x * 0.13 - ang(t, 31) + y * 0.2); if (f > 1.25) { const X = V.X(x), Y = V.Y(y); if (X >= 0 && X < 540 && Y >= 0 && Y < 960) c.px(X, Y, mix(c.get(X, Y), "#FFF8D8", 0.4)); } } }
  // reef: kelp behind, anemone on the left root, a far kelp on the shelf shoulder
  if (inY(V, -20, 520)) {
    L.drawKelp(c, V.X(108), V.Y(T.reefTop(108) + 4), T.reefTop(108) - 4, t, 0.3, 300);
    L.drawKelp(c, V.X(186), V.Y(T.reefTop(186) + 2), T.reefTop(186) - 70, t, 1.7, 300);
    L.drawKelp(c, V.X(452), V.Y(T.reefTop(440) + 6), T.reefTop(440) - 2, t, 2.9, 300);
    L.drawKelp(c, V.X(512), V.Y(332), 300, t, 4.1, 200);
    L.drawAnemone(c, V.X(446), V.Y(T.reefTop(446) + 3), t, 0.5, 480, "#B88AF0", "#F0E4FF");
  }
  // deep floor: back grass, tube worms, the baby sponge
  if (inY(V, 1700, 1820)) {
    L.drawGrass(c, V.X(120), V.Y(T.floorY(120)), 6, 34, t, 1, 1780);
    L.drawGrass(c, V.X(336), V.Y(T.floorY(336)), 5, 26, t, 2, 1800);
    L.drawGrass(c, V.X(458), V.Y(T.floorY(458)), 7, 40, t, 3, 1790);
    const wo = (ph) => 0.5 + 0.5 * Math.max(-1, Math.min(1, 3 * osc(t, 6, ph)));
    L.drawTubeWorm(c, V.X(110), V.Y(T.floorY(110) - 6), "#F05A5A", wo(0), 1780);
    L.drawTubeWorm(c, V.X(124), V.Y(T.floorY(124) - 3), "#5AB4F0", wo(1.7), 1780);
    L.drawTubeWorm(c, V.X(476), V.Y(T.floorY(476) - 6), "#F8CE3E", wo(3.1), 1790);
    L.drawBabySponge(c, V.X(166), V.Y(T.floorY(166)), t, 1800);
  }
}

// ---------------------------------------------------------------- actors
export function actors(c, V, t) {
  if (!onScreen(V)) return; L.setNight(V.dive);
  const te = V.dive ? -1 : t;
  // --- deep floor: fish school, the sponge with its stream, food specks, LV 1
  if (inY(V, 1380, 1820)) {
    for (let i = 0; i < 5; i++) { const f = cyc(t, 3, 0.12), wx = -70 + f * 680 - (i % 3) * 16 - Math.floor(i / 3) * 9, wy = 1452 + (i % 2) * 10 - Math.floor(i / 3) * 14 + 3 * osc(t, 40, i); L.drawFish(c, V.X(wx), V.Y(wy), 1, 12 + (i % 2) * 2, "blue", ang(t, 300, i)); }
    { const f = cyc(t, 2, 0.62), wx = 620 - f * 760, wy = 1622 + 6 * osc(t, 17); L.drawFish(c, V.X(wx), V.Y(wy), -1, 22, "yellow", ang(t, 220)); }
    const look = te < 0 ? [0, 0] : [-0.9 * win(te, EV.dinosaurs + 0.1, EV.sponge - 0.2, 0.25, 0.35) + 0.5 * win(te, EV.filters, EV.water1, 0.2, 0.3), -0.7 * win(te, EV.dinosaurs + 0.1, EV.sponge - 0.2, 0.25, 0.35)];
    const open = te < 0 ? 0 : 0.6 * win(te, EV.dinosaurs + 0.5, EV.sits, 0.3, 0.4);
    const [ox, oy] = L.drawSponge(c, V.X(SP.x), V.Y(SP.y), { breathe: osc(t, 22), blink: blinkP(t, 21, 0.7), look, open });
    // osculum stream: water specks rising in a soft column (more, taller and brighter while it filters)
    const A = te < 0 ? 0 : win(te, ...TM.stream.grow), n = 16 + 22 * A;
    // the outflow itself: a soft column of brighter water with bands that travel upward
    { const H = 130 + 90 * A, ph = ang(t, 76);
      for (let Y = R(oy - H); Y < R(oy - 2); Y++) { const f = (oy - Y) / H, half = 24 + f * 20, w = Math.sin(Y * 0.17 + ph) * 0.5 + 0.5;
        for (let X = R(ox - half); X <= R(ox + half); X++) { if (X < 0 || X >= 540 || Y < 0 || Y >= 960) continue; const e = 1 - Math.abs(X - ox - Math.sin(Y * 0.05 + ph * 0.5) * 3) / half; const k = e * (1 - f) * (0.45 + 0.55 * w) * (0.55 + 0.45 * A); if (k > bayer(X, Y) * 1.2 + 0.18) c.px(X, Y, mix(c.get(X, Y), "#BFF6FF", 0.22)); } } }
    for (let i = 0; i < 38; i++) {
      const vis = clamp01(n - i); if (vis <= 0) continue;
      const f = cyc(t, TM.stream.n, rnd(i * 5 + 3)), hgt = 120 + 90 * A, lane = (rnd(i * 3) - 0.5) * 2, sx = ox + lane * 22 * (0.45 + f * 1.1) + Math.sin(f * 7 + i) * 3, sy = oy - 4 - f * hgt;
      const a = vis * Math.min(1, (1 - f) * 2.2) * Math.min(1, f * 10), g = fade(c, a), X = R(sx), Y = R(sy), big = i % 2 === 0;
      g.px(X, Y, f < 0.5 ? "#F4FFFF" : "#BFF0FF"); if (big) { g.px(X + 1, Y, "#9ADCF0"); g.px(X, Y + 1, "#9ADCF0"); g.px(X + 1, Y + 1, "#6AB8D8"); }
    }
    // food specks drifting into the side pores
    if (te >= EV.filters - 0.4 && te < EV.step + 0.6) for (let j = 0; j < 26; j++) {
      const s = j % 2 ? 1 : -1, st = EV.filters - TM.food.lead + (j >> 1) * TM.food.stagger, k = clamp01((te - st) / TM.food.dur); if (k <= 0 || k >= 1) continue;
      const x0 = SP.x + s * (120 + rnd(j * 7) * 70), y0 = SP.y - 26 - rnd(j * 7 + 1) * 170, x1 = SP.x + s * 66, y1 = SP.y - 30 - rnd(j * 7 + 2) * 120;
      const e = 1 - (1 - k) ** 2, wx = lerp(x0, x1, e), wy = lerp(y0, y1, e) + Math.sin(k * 7 + j) * 3, a = Math.min(sm(k, 0, 0.12), 1 - sm(k, TM.food.absorb, 1));
      const g = fade(c, a), X = R(V.X(wx)), Y = R(V.Y(wy)), col = j % 3 ? "#D8F870" : "#FFF2B8", trail = mix(col, "#0A1A3A", 0.6);
      g.px(X, Y, col); g.px(X + 1, Y, col); g.px(X, Y + 1, col); g.px(X + 1, Y + 1, mix(col, "#2A6A40", 0.3)); g.px(X - s * 2, Y, trail); g.px(X - s * 3, Y + 1, trail);
    }
    sign(c, V.X(418), V.Y(T.floorY(418)), "LV 1", "stone");
  }
  // --- mid-water: the moon jelly + its bubble sign
  const J = jellyState(V, t);
  if (!(te > EV.octopus + 0.6) && inY(V, J.y - 80, J.y + 160)) {
    const glowBase = te < 0 ? 0 : win(te, EV.net - 0.05, EV.swim + 0.9, 0.3, 0.6), swimming = te >= EV.now;
    const glow = glowBase * (swimming ? 0.5 + 0.5 * J.p : 1), front = te < 0 ? 0 : sm(te, ...TM.net) * 1.35;
    const curious = te < 0 ? 0 : win(te, EV.net + 0.1, EV.now - 0.1, 0.2, 0.3);
    const look = te < 0 ? [0, 0] : [Math.sin((te - EV.net) * 3.2) * 0.7 * curious, -0.75 * win(te, EV.noBrain + 0.1, EV.net - 0.15, 0.2, 0.3) - 0.2 * curious + (swimming ? -0.6 : 0)];
    L.drawJelly(c, V.X(J.x), V.Y(J.y), { t, p: J.p, trail: J.trail, glow, front, flash: swimming ? J.p : 0, look, blink: blinkP(t, 19, 1.9), open: te < 0 ? 0 : 0.7 * win(te, EV.now, EV.swim + 0.6, 0.2, 0.3) });
  }
  if (!V.dive && t > EV.step - 0.2) {
    const k = ease(sm(t, ...TM.lv2.rise)), wx = lerp(270, 404, k) + Math.sin(k * Math.PI * 3) * 14 * (1 - k) + 2 * osc(t, 13), wy = lerp(SP.y - 220, 968, k) + 3 * osc(t, 25);
    if (inY(V, wy - 80, wy + 10)) sign(c, V.X(wx), V.Y(wy), "LV 2", "bubble", sm(t, ...TM.lv2.fade));
  }
  // --- near the surface: reef fish, the jar, the octopus, LV 3
  if (inY(V, 120, 700)) {
    for (let i = 0; i < 3; i++) { const a = ang(t, 5 + i, i * 2.1), wx = 380 + Math.cos(a) * (70 + i * 14), wy = 360 + i * 22 + Math.sin(a * 2) * 16; L.drawFish(c, V.X(wx), V.Y(wy), Math.max(-1, Math.min(1, -4 * Math.sin(a))), 11, "chromis", ang(t, 280, i)); }
    { const a = ang(t, 4, 0.8), wx = 150 + Math.cos(a) * 90, wy = 300 + Math.sin(a) * 30; L.drawFish(c, V.X(wx), V.Y(wy), Math.max(-1, Math.min(1, -4 * Math.sin(a))), 18, "pink", ang(t, 240)); }
    const jarOn = 1, wrap = te < 0 ? 0 : sm(te, ...TM.wrap), twistT = te < 0 ? 0 : clamp01((te - TM.twist[0]) / (TM.twist[1] - TM.twist[0]));
    const twist = twistT * Math.PI * 2 * TM.twistTurns, lift = te < 0 ? 0 : sm(te, ...TM.lift), crab = te < 0 ? 0 : sm(te, ...TM.crab);
    const jx = R(V.X(JAR.x)), jy = R(V.Y(T.reefTop(JAR.x)));
    const jarDraw = () => { L.drawJarBack(c, jx, jy, { t, crab }); L.drawJarFront(c, jx, jy, { lift, twist }); };
    // where does the octopus look: the passing jelly, then the jar, then back at us
    const hx = V.X(OC.x), hy = V.Y(OC.y - 246); let look = [0, 0];
    const jp = te < 0 ? 0 : win(te, EV.now + 0.6, EV.octopus + 0.1, 0.3, 0.4);
    if (jp > 0) { const jx2 = V.X(J.x) - hx, jy2 = V.Y(J.y) - hy, d = Math.hypot(jx2, jy2) || 1; look = [(jx2 / d) * jp, (jy2 / d) * jp * 0.8]; }
    const jl = te < 0 ? 0 : win(te, EV.solves + 0.1, EV.jar, 0.3, 0.3); look = [lerp(look[0], 0.8, jl), lerp(look[1], 0.75, jl)];
    const open = te < 0 ? 0 : Math.max(0.5 * win(te, EV.five, EV.arms + 0.4, 0.3, 0.4), 0.8 * sm(te, EV.jar, EV.jar + 0.25));
    const O = L.drawOctopus(c, V.X(OC.x), V.Y(OC.y), { t, look, blink: blinkP(t, 20, 0.4), open, breathe: osc(t, 26), jar: { x: jx, y: jy }, between: jarOn ? jarDraw : null, wrap, twist, lift, wave: te < 0 ? 0 : win(te, ...TM.octoWave) });
    if (jarOn && wrap > 0.5) { /* arms are in front of the glass */ }
    brainDots(c, V, te, O);
    { const a = osc(t, 13, 0.5); L.drawFish(c, V.X(198 + a * 6), V.Y(T.reefTop(198) - 22 + 3 * osc(t, 29)), Math.max(-1, Math.min(1, Math.cos(ang(t, 13, 0.5)) * 4)), 14, "clown", ang(t, 260)); }
    L.drawAnemone(c, V.X(196), V.Y(T.reefTop(196)), t, 2.2, 480);
    sign(c, V.X(146), V.Y(T.reefTop(146)), "LV 3", "stone");
  }
}

/** The octopus's brain cells: glowing dots, a few in the head, most of them flowing out along the arms. */
function brainDots(c, V, te, O) {
  if (te < EV.five - 0.1 || te > EV.solves + 0.5) return;
  const out = sm(te, ...TM.dots.out);
  const [hx, hy] = O.head;
  for (let j = 0; j < 48; j++) {
    const born = TM.dots.head[0] + (j / TM.dots.n) * (TM.dots.head[1] - TM.dots.head[0]), a0 = sm(te, born, born + TM.dots.fadeIn) * (1 - out); if (a0 <= 0) continue;
    const r = Math.sqrt(rnd(j * 3 + 1)), th = rnd(j * 3 + 2) * Math.PI * 2, px = hx + Math.cos(th) * r * 42, py = hy - 20 + Math.sin(th) * r * 30;
    let x = px, y = py;
    if (j >= 12) {
      const arm = O.arms[(j - 12) % 6], f = 0.18 + (Math.floor((j - 12) / 6) / 5) * 0.7, st = TM.dots.armFrom + ((j - 12) % TM.dots.groups) * TM.dots.stagger, k = ease(clamp01((te - st) / TM.dots.dur));
      if (k > 0) {
        const n = arm.path.length, fi = Math.min(n - 1.001, f * (n - 1) * clamp01((k - 0.2) / 0.8)), i0 = Math.floor(fi), q = fi - i0, [rx, ry] = arm.path[0];
        const ax = lerp(arm.path[i0][0], arm.path[i0 + 1][0], q), ay = lerp(arm.path[i0][1], arm.path[i0 + 1][1], q);
        if (k < 0.2) { x = lerp(px, rx, k / 0.2); y = lerp(py, ry, k / 0.2); } else { x = ax; y = ay; }
      }
    }
    const tw = 0.7 + 0.3 * Math.sin(te * 8 + j * 2.3), g = fade(c, a0), X = R(x), Y = R(y);
    for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 2], [1, 2]]) g.px(X + dx, Y + dy, "#FFD84A");
    for (const [dx, dy] of [[-2, 0], [3, 1], [1, -2], [0, 3], [-1, -1], [2, 2], [-1, 2], [2, -1]]) if (a0 * tw > bayer(X + dx, Y + dy) + 0.15) c.px(X + dx, Y + dy, mix(c.get(X + dx, Y + dy), "#FFF2B8", 0.6));
    g.px(X, Y, "#FFFFFF"); g.px(X + 1, Y, "#FFFFFF"); g.px(X, Y + 1, "#FFFFFF"); g.px(X + 1, Y + 1, "#FFF6C8");
  }
}

// ---------------------------------------------------------------- front: foreground plants, marine snow, bubbles
export function front(c, V, t) {
  if (!onScreen(V)) return; L.setNight(V.dive);
  // marine snow (slow, periodic, each speck lives in a 300 px band)
  for (let i = 0; i < 150; i++) {
    const wx = rnd(i * 7 + 1) * 540, y0 = 40 + rnd(i * 7 + 2) * 2000, f = cyc(t, 1 + (i % 2), rnd(i * 7 + 3)), wy = y0 + f * 300;
    const X = R(V.X(wx + Math.sin(ang(t, 3, i)) * 6)), Y = R(V.Y(wy)); if (X < 0 || X >= 540 || Y < 0 || Y >= 960) continue;
    const a = Math.sin(Math.PI * f) * 0.9; if (a <= bayer(X, Y) * 0.8) continue;
    c.px(X, Y, mix(c.get(X, Y), "#DFF6FF", 0.5 + 0.2 * (i % 3)));
  }
  // bioluminescent plankton twinkling in the mid-water (jelly level and below)
  for (let i = 0; i < 40; i++) {
    const wx = 130 + rnd(i * 11 + 1) * 340, wy = 760 + rnd(i * 11 + 2) * 900 + 8 * osc(t, 3, i), X = R(V.X(wx)), Y = R(V.Y(wy)); if (X < 1 || X > 538 || Y < 1 || Y > 958) continue;
    const tw = Math.max(0, osc(t, 20 + (i % 7), rnd(i) * 6)); if (tw < 0.25) continue;
    const g = fade(c, Math.min(1, (tw - 0.25) * 2.2)); g.px(X, Y, "#DFFFFF"); if (tw > 0.7) { g.px(X - 1, Y, "#5AD0E8"); g.px(X + 1, Y, "#5AD0E8"); g.px(X, Y - 1, "#5AD0E8"); g.px(X, Y + 1, "#5AD0E8"); }
  }
  // bubble chains from cracks (cliff foot and the shelf)
  for (const [bx, by, h, n, ph] of [[132, 1770, 900, 9, 0.2], [488, 1460, 1100, 7, 0.6], [104, 640, 600, 11, 0.4]]) {
    for (let i = 0; i < 6; i++) {
      const f = cyc(t, n, ph + i / 6), wy = by - f * h, wx = bx + Math.sin(f * 20 + i) * 3, X = R(V.X(wx)), Y = R(V.Y(wy)); if (X < -4 || X > 544 || Y < -4 || Y > 964) continue;
      const r = 1 + (i % 3 === 0 ? 1 : 0) + (f > 0.5 ? 1 : 0), g = fade(c, Math.min(1, (1 - f) * 4));
      if (r === 1) { g.px(X, Y, "#BFF6FF"); g.px(X + 1, Y, "#7FD0E8"); } else { g.ring(X, Y, r, "#BFF6FF"); g.px(X - 1, Y - 1, "#FFFFFF"); }
    }
  }
  // foreground sea grass at the bottom corners of the deep floor
  if (inY(V, 2000, 2160)) {
    L.drawGrass(c, V.X(22), V.Y(2140), 7, 86, t, 5, 1600, ["#1E5A4A", "#2E7A62", "#123A30"]);
    L.drawGrass(c, V.X(522), V.Y(2140), 6, 74, t, 6, 1600, ["#1E5A4A", "#2E7A62", "#123A30"]);
    L.drawGrass(c, V.X(228), V.Y(T.floorY(228) + 2), 4, 16, t, 7, 1800);
    L.drawGrass(c, V.X(372), V.Y(T.floorY(372) + 2), 5, 20, t, 8, 1800);
  }
}

// ---------------------------------------------------------------- hud: tags and pickups (screen space)
export function hud(c, V, t) {
  if (!onScreen(V)) return;
  const k = caches();
  if (!V.dive) {
    // LV1
    const dA = win(t, ...TM.fossil);
    if (dA > 0) { dinoGlow(c, V, k.ring, dA, t); tag(c, ["DINOSAURS"], V.X(112) + 70, Math.max(130, V.Y(1290) - 14), dA, C.Y); }
    tag(c, ["0 BRAIN CELLS"], 270, 206, win(t, ...TM.zeroTag), C.Y);
    // LV2
    tag(c, ["NO BRAIN"], 270, 186, win(t, ...TM.noBrainTag), C.Y);
    pickup(c, 384, 196, "+SWIM", (t - EV.swim) / TM.pickup);
    // LV3
    tag(c, ["500,000,000", "BRAIN CELLS"], 270, 166, win(t, ...TM.cellsTag), C.Y);
    pickup(c, 270, 262, "+SOLVE", (t - EV.solves) / TM.pickup);
  } else {
    // the dive: "300,000 YEARS" while the skull layer passes, "DINOSAURS" while the old bed passes (both gone by END − 0.3)
    const sA = win(t, ...TM.skullTag);
    if (sA > 0) {
      const sx = V.X(40), sy = V.Y(470), r = tag(c, ["300,000", "YEARS"], 170, 430, sA, C.Y);
      { const g = fade(c, sA * (0.8 + 0.2 * Math.sin(t * 6))); for (let a = 0; a < 120; a++) { const th = (a / 120) * Math.PI * 2; g.px(R(sx + Math.cos(th) * 26), R(sy + Math.sin(th) * 22), a % 2 ? "#FFE890" : "#F4CA50"); } }
      if (r && sy > 0 && sy < 960) { const g = fade(c, sA), x0 = r.x + r.w, y0 = 430 + R(r.h / 2); for (let s = 0, n = Math.max(1, R(Math.hypot(sx - 26 - x0, sy - y0))); s <= n; s += 1) if (s % 4 < 2) g.px(R(lerp(x0, sx - 26, s / n)), R(lerp(y0, sy, s / n)), C.Y); }
    }
    const dA = win(t, ...TM.diveDinoTag);
    if (dA > 0) { dinoGlow(c, V, k.ring, dA, t); tag(c, ["DINOSAURS"], V.X(112) + 70, Math.max(130, V.Y(1290) - 14), dA, C.Y); }
  }
}
function dinoGlow(c, V, ring, a, t) {
  const pulse = 0.8 + 0.2 * Math.sin(t * 6), g = fade(c, a * pulse);
  for (const [x, y, inner] of ring) g.px(V.X(x), V.Y(y), inner ? "#FFE890" : "#F4CA50");
}
