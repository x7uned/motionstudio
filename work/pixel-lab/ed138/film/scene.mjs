// «A new world beyond Pluto» (2026 ED138) — one persistent world seen through one camera, close → wide:
// a survey photo (the faint dot) → the night summit in Chile with the observatory and a grid of sky photos → the detections
// linked into tracks → up the telescope's beam into the outer Solar System → the icy world close (size, shiny/dark) → the old
// photos back to 2016 → lost in front of the Milky Way → the blink comparison → the wide tilted orbit → the dwarf-planet line-up.
// Every beat is anchored to a measured word (timeline.mjs). Art: film/assets/*.mjs (catalog contract), driven via lib/drive.mjs.
import { mix, bayer, MAIN as MAIN0, TINY } from "../../../../renderer/pixel/raster.mjs";
import { EV, END } from "./timeline.mjs";
import { layer, tintPx } from "./lib/layout.mjs";
import { drawSky } from "./assets/backdrop-milky-way.mjs";
import { drawLand, SUMMIT } from "./assets/backdrop-night-mountain.mjs";
import { drawPhoto, dotAt } from "./assets/sky-photo.mjs";
import observatory from "./assets/observatory.mjs";
import flag from "./assets/chile-flag.mjs";
import { drawOrbit, orbitPoint } from "./assets/orbit-path.mjs";
import { drawIce } from "./assets/ice-world.mjs";
import { drawPluto } from "./assets/pluto.mjs";
import { drawCeres } from "./assets/ceres.mjs";
import { drawEris } from "./assets/eris.mjs";
import { drawHaumea } from "./assets/haumea.mjs";
import { drawMakemake } from "./assets/makemake.mjs";
import { drawNeptune } from "./assets/neptune.mjs";
import sun from "./assets/sun.mjs";
import { drive, view } from "./lib/drive.mjs";

export const MAIN = { ...MAIN0, glyphs: { ...MAIN0.glyphs, "–": [".....", ".....", ".....", "#####", ".....", ".....", "....."] } };
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const eio = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const eout = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** keyed values: init + [[t0, t1, {field: target}]] eased in order (each segment starts from the value reached before it) */
export function track(init, keys) {
  return (t) => { const v = { ...init }; for (const [a, b, tg] of keys) { if (t <= a) break; const k = eio((t - a) / (b - a)); for (const f in tg) v[f] = lerp(v[f], tg[f], k); } return v; };
}

// ---------------------------------------------------------------- the camera (land/space plane) and the sky pan
const WIDE = { cx: 270, cy: 450, z: 1 }, SKYUP = { cx: 270, cy: -300, z: 1 }, OBSZ = { cx: 284, cy: 470, z: 1.35 }, DOTS = { cx: 270, cy: 436, z: 1 };
export const SS0 = { cx: 270, cy: -2600, z: 1 }, SSY = 3050;          // the Solar System plane: world y = screen y (at SS0) − SSY
// Solar System geometry (screen coordinates at SS0)
export const SUN = [220, 440], EL = 30;
const ORB = {
  nep: { a: 86, e: 0.01, inc: 0, om: 0, w: 0, el: EL },
  plu: { a: 126, e: 0.25, inc: 10, om: 12, w: 230, el: EL },
  new: { a: 176, e: 0.12, inc: 25, om: -38, w: 60, el: EL },
};
const TH = { nep: 3.5, plu: 1.0, new: 0.0 };
const ssp = (k) => orbitPoint(SUN[0], SUN[1], ORB[k].a, TH[k], ORB[k]);
export const HERO_SS = ssp("new"), PLUTO_SS = ssp("plu"), NEP_SS = ssp("nep");
const ZOOM = { cx: HERO_SS[0], cy: HERO_SS[1] - SSY, z: 2.4 };
{ const zb = skyBase(ZOOM), tgt = [coreAt[0] + 10, coreAt[1] + (450 - 372) - 30];
  var skyPanK = track({ x: 0, y: 0 }, [
    [EV.then - 0.3, EV.looked + 0.4, { x: -40, y: 120 }],
    [EV.so1 - 0.1, EV.way2 + 0.2, { x: tgt[0] - zb[0], y: tgt[1] - zb[1] }],
    [EV.out + 0.25, EV.round - 0.1, { x: tgt[0] - zb[0] + 60, y: tgt[1] - zb[1] - 150 }],
  ]); }
export const camAt = track(SKYUP, [
  [EV.october - 0.25, EV.astronomer + 0.6, WIDE],
  [EV.rubin1 - 0.1, EV.telescope1 + 0.3, OBSZ],
  [EV.code2 - 0.25, EV.tiny, DOTS],
  [EV.dot1 + 0.55, EV.brightEnd - 0.3, SS0],
  [EV.that1 - 0.05, EV.maybe + 0.2, ZOOM],
  [EV.out + 0.25, EV.round - 0.1, SS0],
]);
// the sky turns (pans) behind the world: screen px of sky motion; layer p 0.12 of the sky glow → cam offset px / 0.12
// sky offset in sky-layer px, added to the point the camera's own parallax puts at the screen centre
import { coreAt } from "./assets/backdrop-milky-way.mjs";
function skyBase(cam) { return [270 + (cam.cx - 270) * 0.12, 450 + (cam.cy - 450) * 0.12]; }
const skyPan = (t) => skyPanK(t);
const crowdAt = (t) => Math.min(1, sm(t, EV.millions - 0.1, EV.sky1 + 0.1) * 1) * (1 - 0.7 * sm(t, EV.out + 0.2, EV.round));

// ---------------------------------------------------------------- beats
// 1) the hook: six survey frames slide in (2016 … 2026), the faint dot creeps; «nobody noticed» dims; the reticle names it
const YEARS = ["2016", "2018", "2020", "2022", "2024", "2026"], CARD_T = YEARS.map((_, k) => -0.32 + k * 0.6);
export const CARD = { x: 270, y: 372, z: 3.1 };
// 2) the sky grid of photos over the observatory (sky-anchored, p 0.2), the hero frame = slot 5
const GRID = []; for (let r = 0; r < 3; r++) for (let q = 0; q < 4; q++) GRID.push([138 + q * 88, 232 + r * 86]);
const HERO_SLOT = 5, TILE_Z = 0.6;
export const FLY = [EV.october - 0.25, EV.astronomer + 0.45];
export const SCAN = [EV.ran - 0.1, EV.pictures1 + 0.2];
export const OBS_KEYS = [[EV.rubin1 - 0.15, "rotate"], [EV.observatory + 0.25, "open"], [EV.telescope1 - 0.1, "shoot"]];
export const FLAG_KEYS = [[EV.chile - 0.35, "raise"]];
const FLAG_X = 168;
// 3) detections → tracks (sky coords), the slow far one is the hero; DOTS counter
export const TRACKS = [
  { p: [118, 196], d: [28, 14], t: EV.finds + 0.05 }, { p: [372, 190], d: [-24, 17], t: EV.finds + 0.45 },
  { p: [150, 368], d: [30, -9], t: EV.belong - 0.05 }, { p: [404, 330], d: [-12, 25], t: EV.same1 - 0.05 }, { p: [212, 344], d: [5, -2], t: EV.moving + 0.05, hero: true },
];
const DOTSET = (() => { const out = []; for (let i = 0; i < 300; i++) out.push([88 + rnd(i * 3 + 1) * 364, 186 + rnd(i * 3 + 2) * 262, rnd(i * 3 + 3)]); return out; })();
// 4) flight up the beam → the outer Solar System; zoom into the dot → the world; Pluto for size; the 600–1,500 km bracket
export const BEAM = [EV.dot1 + 0.1, EV.brightEnd];
// 5) shiny vs dark; 6) the old frames back to 2016 on an arc; 7) lost in the Milky Way; 8) the blink comparison
// the old frames: a big cascade from top right (2025) to bottom left (2016); each older frame slides out from under the newer
export const OLD = ["2025", "2022", "2019", "2016"], OLD_T = [EV.older - 0.1, EV.another + 0.05, EV.all - 0.2, EV.twenty2 - 0.05];
export const OLD_POS = OLD.map((_, i) => [364 - 80 * i + 14 * Math.sin((Math.PI * i) / 3), 236 + 100 * i]);
const OLD_Z = 1.25;
export const LINK = [EV.all - 0.1, EV.sixteenEnd + 0.1];
export const BLINK = [EV.same3 - 0.05, EV.again1 - 0.05, EV.again2 - 0.05];
// 9) the line-up: 3 × 2 cells
export const CELLS = [[98, 372], [248, 372], [394, 372], [98, 532], [248, 532], [394, 532]];
export const LINE_IN = [EV.if2 - 0.05, EV.if2 + 0.2, EV.if2 + 0.45, EV.could - 0.05, EV.could + 0.2].map((x) => x);
export const ROLL = [EV.become + 0.15, EV.sixth + 0.32];
export const NAMES = [EV.pluto2, EV.ceres, EV.eris, EV.haumea, EV.makemake];

// ---------------------------------------------------------------- hero world: screen position, radius, albedo (keyed)
export const heroAt = track({ x: 300, y: 300, r: 1.5, alb: 0 }, [
  [EV.brightEnd - 1.6, EV.brightEnd - 0.3, { x: HERO_SS[0], y: HERO_SS[1], r: 2.2 }],
  [EV.that1 - 0.05, EV.maybe + 0.25, { x: 350, y: 372, r: 32 }],
  [EV.six - 0.05, EV.six + 0.35, { r: 18 }],
  [EV.fifteen - 0.05, EV.fifteen + 0.4, { r: 45 }],
  [EV.wide1 - 0.05, EV.wide1End + 0.2, { r: 32 }],
  [EV.guess - 0.2, EV.we + 0.3, { x: 368, y: 362, r: 46, alb: -1 }],
  [EV.isEnd - 0.35, EV.then + 0.35, { x: 270, y: 330, r: 30, alb: 0 }],
  [EV.team - 0.1, EV.looked + 0.45, { x: 124, y: 236, r: 28 }],
  [EV.so1 - 0.2, EV.everyone + 0.3, { x: 270, y: 372, r: 30 }],
  [EV.one2 - 0.05, EV.lost - 0.1, { x: 282, y: 380, r: 1.6 }],
  [EV.out + 0.25, EV.round - 0.1, { x: HERO_SS[0], y: HERO_SS[1], r: 6 }],
]);

// ---------------------------------------------------------------- helpers
function pill(c, txt, cx, y, a, o = {}) {
  if (a <= 0) return null; const sc = o.scale ?? 2, w = c.measure(MAIN, txt, { scale: sc }) + 18, h = 7 * sc + 10, x = R(cx - w / 2), g = view(c, a), edge = o.edge ?? "#7FE3F0";
  g.rrect(x - 1, R(y) - 1, w + 2, h + 2, "#05040C", 2); g.rrect(x, R(y), w, h, edge, 2); g.rrect(x + 2, R(y) + 2, w - 4, h - 4, o.bg ?? "#0E0C22", 1);
  g.text(MAIN, txt, x + 9, R(y) + 5, o.col ?? "#FDFEED", { scale: sc }); return { x, y: R(y), w, h };
}
function label(c, txt, cx, y, a, col = "#FDFEED", sc = 2) {
  if (a <= 0) return; const g = view(c, a), w = c.measure(MAIN, txt, { scale: sc }), x = R(cx - w / 2);
  for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1], [2, 2]]) g.text(MAIN, txt, x + dx, R(y) + dy, "#05040C", { scale: sc });
  g.text(MAIN, txt, x, R(y), col, { scale: sc });
}
function dline(c, x0, y0, x1, y1, col, a = 1, dash = 0, gap = 0, off = 0, k = 1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) || 1, g = view(c, a);
  for (let i = 0; i <= n * k; i++) { if (dash && ((i + off) % (dash + gap)) >= dash) continue; g.px(R(x0 + (x1 - x0) * i / n), R(y0 + (y1 - y0) * i / n), col); }
}
function ring(c, x, y, r, col, a = 1, dash = 0) { const n = Math.max(12, Math.ceil(r * 6.4)), g = view(c, a); for (let q = 0; q < n; q++) { if (dash && q % (2 * dash) >= dash) continue; const an = (q / n) * Math.PI * 2; g.px(R(x + Math.cos(an) * r), R(y + Math.sin(an) * r), col); } }
function glowDot(c, x, y, b, col = "#BFE0FF") {
  const X = R(x), Y = R(y); c.px(X, Y, mix(c.get(X, Y), "#FFFFFF", b)); for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) tintPx(c, X + i, Y + j, col, b * 0.8, 4);
  if (b > 0.6) for (const [i, j] of [[-2, 0], [2, 0], [0, -2], [0, 2]]) tintPx(c, X + i, Y + j, col, (b - 0.6) * 1.2, 4);
}
function sparkle(c, x, y, k, size = 7) { if (k <= 0) return; const L = R(size * k); for (let i = -L; i <= L; i++) { const f = 1 - Math.abs(i) / (L + 1); tintPx(c, R(x) + i, R(y), "#FFFFFF", f * k, 4); tintPx(c, R(x), R(y) + i, "#FFFFFF", f * k, 4); } }
const heroSpin = (t) => 0.5 + 0.12 * t + 9 * eio((t - ROLL[0]) / (ROLL[1] - ROLL[0]));

// ---------------------------------------------------------------- the Solar System plane (orbits, sun, planets, belt)
const BELT = (() => { const out = []; for (let i = 0; i < 420; i++) out.push({ a: 112 + rnd(i * 5 + 1) * 90, th: rnd(i * 5 + 2) * Math.PI * 2, inc: (rnd(i * 5 + 3) - 0.5) * 12, s: rnd(i * 5 + 4) }); return out; })();
function solar(c, cam, t, A) {
  if (A <= 0.01) return null;
  const V = layer(cam, 1), P = ([x, y]) => [V.X(x), V.Y(y - SSY)], z = cam.z, g = view(c, A), sunP = P(SUN);
  const sc = (o) => ({ ...o, a: o.a * z });
  // belt pebbles (slowly orbiting)
  for (const b of BELT) { const [x, y, d] = orbitPoint(sunP[0], sunP[1], b.a * z, b.th + t * 0.01 * (200 / b.a), { inc: b.inc, el: EL }); const X = R(x), Y = R(y); if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) continue;
    const col = d > 0 ? (b.s > 0.5 ? "#B4AEC8" : "#8A84A6") : "#5E5880"; g.px(X, Y, col); if (b.s > 0.55) { g.px(X + 1, Y, d > 0 ? "#4A4468" : "#2E2A48"); g.px(X, Y + 1, "#2E2A48"); if (b.s > 0.85) g.px(X + 1, Y + 1, "#2E2A48"); } }
  drawOrbit(c, sunP[0], sunP[1], { ...sc(ORB.nep), col: "#6E8CE0", alpha: A * 0.8 });
  drawOrbit(c, sunP[0], sunP[1], { ...sc(ORB.plu), col: "#D8B48C", alpha: A * 0.85 });
  const newGlow = sm(t, EV.now - 0.2, EV.now + 0.5) * (1 - sm(t, EV.if2, EV.if2 + 0.6));
  drawOrbit(c, sunP[0], sunP[1], { ...sc(ORB.new), col: "#7FE3F0", alpha: A, glow: newGlow, thick: newGlow > 0.3 ? 2 : 1, spacing: 4 });
  sun.draw(view(c, A), sunP[0], sunP[1], 0.22 * z, t, drive(sun, [], t, { a: A }));
  const np = P(NEP_SS); drawNeptune(g, np[0], np[1], 9 * z, { a: A, spin: t * 0.3, t });
  return { sun: sunP, nep: np, plu: P(PLUTO_SS), hero: P(HERO_SS) };
}

// ---------------------------------------------------------------- world
export function drawWorld(c, t) {
  const cam = camAt(t), pan = skyPan(t), skyCam = { cx: cam.cx + pan.x / 0.12, cy: cam.cy + pan.y / 0.12, z: 1, crowd: crowdAt(t) };
  drawSky(c, skyCam, t);
  // flight streaks: near star dust that stretches with the camera's vertical speed
  const vy = (camAt(t + 1 / 60).cy - camAt(t - 1 / 60).cy) * 30;
  if (Math.abs(vy) > 40) { const k = clamp01((Math.abs(vy) - 40) / 900); for (let i = 0; i < 140; i++) { const p = 0.35 + 0.5 * rnd(i * 7 + 5), V = layer({ cx: cam.cx, cy: cam.cy, z: 1 }, p), wx = rnd(i * 7 + 1) * 560 - 10, wy = -3300 + rnd(i * 7 + 2) * 4400, X = R(V.X(wx)), Y = V.Y(wy), L = Math.min(60, Math.abs(vy) * p * 0.03);
      if (X < 0 || X >= c.w || Y < -60 || Y > c.h + 60) continue; for (let j = 0; j < L; j++) { const y = R(Y - Math.sign(vy) * j), f = (1 - j / L) * k * 0.8; if (y >= 0 && y < c.h) tintPx(c, X, y, "#C8D8FF", f, 4); } } }
  // the land (only while it can be seen)
  const VL = layer(cam, 0.5); if (VL.Y(380) < c.h + 40) drawLand(c, cam, t);
  const V1 = layer(cam, 1), V2 = layer(cam, 0.2);
  const out = { cam, V1 };
  // observatory + flag on the summit
  if (V1.Y(SUMMIT.y - 150) < c.h + 10) {
    const oz = cam.z, ox = V1.X(SUMMIT.x), oy = V1.Y(SUMMIT.y) - 72 * oz;
    out.obs = observatory.draw(c, ox, oy, oz, t, drive(observatory, OBS_KEYS, t));
    const fz = 0.62 * cam.z, fx = V1.X(FLAG_X), fy = V1.Y(SUMMIT.y) - 50 * fz;
    out.flag = flag.draw(c, fx, fy, fz, t, drive(flag, FLAG_KEYS, t));
  }
  // the beam from the slit up to the far dot, while we fly
  out.V2 = V2;
  // the Solar System (from the flight's arrival; hidden while we look close; back for the wide orbit and the line-up)
  const ssA = Math.min(sm(t, EV.dot1 + 1.0, EV.brightEnd - 0.4), 1 - sm(t, EV.that1 + 0.15, EV.maybe), 1) + sm(t, EV.out + 0.35, EV.round - 0.2) * (1 - 0.8 * sm(t, EV.if2 - 0.1, EV.could + 0.4));
  out.ss = solar(c, cam, t, Math.min(1, ssA));
  out.ssA = ssA;
  return out;
}

// ---------------------------------------------------------------- story layer (photos, tracks, worlds, labels)
export function drawStory(c, W, t) {
  const { cam, V1, V2 } = W;
  // ---------- 1) the hook stack and 2) the sky grid
  if (t < EV.code2 + 1.5) {
    const slot = (i) => [V2.X(GRID[i][0]), V2.Y(GRID[i][1])];
    const flyK = eio((t - FLY[0]) / (FLY[1] - FLY[0]));
    // grid tiles (except the hero tile, which is the flying card)
    const gridA = (i) => { const d = Math.hypot(GRID[i][0] - GRID[HERO_SLOT][0], GRID[i][1] - GRID[HERO_SLOT][1]); return sm(t, FLY[0] + 0.35 + d / 420, FLY[0] + 0.75 + d / 420) * (1 - sm(t, EV.billions - 0.4 + d / 900, EV.billions + 0.2 + d / 900)); };
    const scanY = lerp(GRID[0][1] - 50, GRID[11][1] + 50, clamp01((t - SCAN[0]) / (SCAN[1] - SCAN[0])));
    for (let i = 0; i < GRID.length; i++) {
      if (i === HERO_SLOT) continue; const a = gridA(i); if (a <= 0) continue; const [x, y] = slot(i);
      const pass = clamp01(1 - Math.abs(GRID[i][1] - scanY) / 46) * (t > SCAN[0] && t < SCAN[1] + 0.3 ? 1 : 0);
      drawPhoto(view(c, a), x, y, TILE_Z, t, { a, seed: 10 + i, dotB: 0.3, flash: pass * 0.6, border: 1 });
    }
    // the stack of frames (hook) → the flying card → the hero tile
    const tileA = 1 - sm(t, EV.billions - 0.4, EV.billions + 0.2);
    if (tileA > 0) {
      const top = YEARS.reduce((n, _, k) => n + eout((t - CARD_T[k]) / 0.5) * (t > CARD_T[k] ? 1 : 0), 0);   // continuous count of frames that arrived
      const dimK = sm(t, EV.nobody - 0.05, EV.noticedEnd - 0.2) * (1 - sm(t, EV.its - 0.1, EV.name + 0.3));
      for (let k = 0; k < YEARS.length; k++) {
        const arr = eout((t - CARD_T[k]) / 0.5); if (t < CARD_T[k] || arr <= 0) continue;
        const depth = top - k - 1, stackA = k === YEARS.length - 1 ? 1 : 1 - sm(depth, 2.2, 3) - sm(t, EV.noticed, EV.its + 0.2);
        if (stackA <= 0 || depth > 3.2) continue;
        let x = CARD.x - 9 * Math.max(0, depth) + 460 * (1 - arr), y = CARD.y - 9 * Math.max(0, depth), z = CARD.z;
        if (k === YEARS.length - 1) { const [sx, sy] = slot(HERO_SLOT); x = lerp(x, sx, flyK); y = lerp(y, sy, flyK); z = lerp(CARD.z, TILE_Z, flyK); }
        const ringK = k === YEARS.length - 1 ? sm(t, EV.twenty1 - 0.1, EV.twenty1 + 0.55) * (1 - sm(t, FLY[0], FLY[0] + 0.5)) : 0;
        const pass = k === YEARS.length - 1 ? clamp01(1 - Math.abs(GRID[HERO_SLOT][1] - scanY) / 46) * (t > SCAN[0] && t < SCAN[1] + 0.3 ? 1 : 0) : 0;
        const a = Math.min(stackA, tileA);
        const r = drawPhoto(view(c, a), x, y, z, t, { a, seed: 1, dot: k / 5, dotB: 0.42 + 0.45 * ringK, ring: ringK, dim: k === YEARS.length - 1 ? dimK * 0.6 : 0.2 + 0.15 * depth, label: YEARS[k], labelScale: 2, labelA: k === YEARS.length - 1 ? 1 - sm(flyK, 0.1, 0.45) : 1, flash: pass * 0.6 + 0.5 * Math.exp(-(((t - CARD_T[k] - 0.45) / 0.1) ** 2)) });
        if (k === YEARS.length - 1) W.heroCard = r;
      }
      // the name tag
      if (W.heroCard) { const ta = win(t, EV.twenty1 + 0.05, FLY[0] + 0.2, 0.3, 0.35), [dx, dy] = W.heroCard.dot; pill(c, "2026 ED138", dx, dy + 34 + 6 * (1 - ta), ta, { edge: "#F4CA50", col: "#F4CA50" }); }
      // the scan line over the grid (the search code running)
      if (t > SCAN[0] && t < SCAN[1] + 0.2) { const k = Math.min(sm(t, SCAN[0], SCAN[0] + 0.2), 1 - sm(t, SCAN[1], SCAN[1] + 0.2)), y = R(V2.Y(scanY)); for (let x = R(V2.X(84)); x < R(V2.X(456)); x++) { tintPx(c, x, y, "#7FE3F0", k, 4); tintPx(c, x, y - 1, "#7FE3F0", k * 0.5, 4); tintPx(c, x, y + 1, "#7FE3F0", k * 0.5, 4); tintPx(c, x, y - 3, "#7FE3F0", k * 0.25, 4); } }
    }
    // Chile tag (over the flag) and the giant telescope flash beam
    if (W.flag) { const a = win(t, EV.chile - 0.05, EV.code2 - 0.1, 0.3, 0.35); pill(c, "CHILE", W.flag.box.x0 + 20, W.flag.box.y0 - 30 - 6 * (1 - a), a, { edge: "#F4CA50" }); }
  }
  // ---------- 3) detections → tracks; DOTS counter; the far bright dot; the beam
  const dotsA = sm(t, EV.billions - 0.3, EV.dots + 0.2) * (1 - sm(t, EV.dot1 + 0.4, EV.very + 0.6));
  if (dotsA > 0) {
    for (let i = 0; i < DOTSET.length; i++) { const [x, y, q] = DOTSET[i], a = clamp01((dotsA - q * 0.6) / 0.4) * (1 - 0.7 * sm(t, EV.one1 - 0.1, EV.one1 + 0.4)); if (a <= 0) continue; const X = R(V2.X(x)), Y = R(V2.Y(y)); const g = view(c, a); g.rect(X, Y, 2, 2, q > 0.5 ? "#7FE3F0" : "#BFF4FF"); g.px(X + 2, Y, "#2A6A8A"); g.px(X, Y + 2, "#2A6A8A"); }
    for (const tr of TRACKS) {
      const lk = eio((t - tr.t) / 0.4), fadeOthers = tr.hero ? 1 : 1 - 0.8 * sm(t, EV.one1 - 0.1, EV.one1 + 0.4), a = dotsA * fadeOthers;
      const pts = [0, 1, 2, 3].map((k) => [V2.X(tr.p[0] + tr.d[0] * k), V2.Y(tr.p[1] + tr.d[1] * k)]), col = tr.hero ? "#FDFEED" : "#F4CA50";
      if (lk > 0) for (let k = 0; k < 3; k++) { const seg = clamp01(lk * 3 - k); if (seg > 0) dline(c, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], col, a, 0, 0, 0, seg); }
      for (const [x, y] of pts) { const g = view(c, a * Math.max(0.35, lk)); g.rect(R(x) - 1, R(y) - 1, 3, 3, lk > 0.5 ? col : "#7FE3F0"); }
      if (tr.hero) W.heroTrack = pts[3];
    }
    // DOTS counter (odometer digits roll continuously, never a settled number)
    const ca = win(t, EV.billions - 0.1, EV.objectEnd + 0.1, 0.3, 0.4);
    if (ca > 0) { const p = pill(c, "DOTS 0,000,000,000", 270, 156, ca, { edge: "#7FE3F0", col: "#0E0C22" }); if (p) { const g = view(c, ca); g.text(MAIN, "DOTS", p.x + 9, p.y + 5, "#7FE3F0", { scale: 2 });
      const val = 3.2e9 * eio((t - EV.billions + 0.1) / 3.2) + 7e6 * t, digits = 10; let x = p.x + 9 + c.measure(MAIN, "DOTS ", { scale: 2 });
      for (let i = digits - 1; i >= 0; i--) { const wv = val / Math.pow(10, i), d = Math.floor(wv) % 10, f = wv - Math.floor(wv), ff = i <= 1 ? f : clamp01((f - 0.9) / 0.1), oy = R(ff * 18);   // a true odometer: a digit rolls while the one below passes 9 → 0
        for (const [dd, yy] of [[d, -oy], [(d + 1) % 10, 18 - oy]]) { const sub = Object.create(g); sub.px = (X, Y, col) => { if (Y >= p.y + 3 && Y < p.y + p.h - 3) g.px(X, Y, col); }; sub.text(MAIN, String(dd), x, p.y + 5 + yy, "#FDFEED", { scale: 2 }); }
        x += c.measure(MAIN, "0", { scale: 2 }) + 2; if (i % 3 === 0 && i > 0) { g.text(MAIN, ",", x - 1, p.y + 5, "#FDFEED", { scale: 2 }); x += c.measure(MAIN, ",", { scale: 2 }) + 2; } } } }
  }
  // ---------- the hero world: a dot in the detections → flies with us → the icy world → … → the line-up
  const H = heroAt(t);
  let hx = H.x, hy = H.y;
  if (t < EV.brightEnd - 1.6 && W.heroTrack) { hx = W.heroTrack[0]; hy = W.heroTrack[1]; }
  else if (t < EV.brightEnd - 1.6) { hx = V2.X(TRACKS[4].p[0] + TRACKS[4].d[0] * 3); hy = V2.Y(TRACKS[4].p[1] + TRACKS[4].d[1] * 3); }
  else if (t < EV.brightEnd - 0.3) { const k = eio((t - (EV.brightEnd - 1.6)) / 1.3), sx = V2.X(TRACKS[4].p[0] + TRACKS[4].d[0] * 3), sy = V2.Y(TRACKS[4].p[1] + TRACKS[4].d[1] * 3); hx = lerp(sx, HERO_SS[0], k); hy = lerp(sy, HERO_SS[1], k); }
  // the beam from the slit to the far dot (while it is found and while we fly up)
  const bA = win(t, BEAM[0], BEAM[1] - 0.3, 0.35, 0.4);
  if (bA > 0 && W.obs) { const [sx, sy] = W.obs.slit, n = Math.ceil(Math.hypot(hx - sx, hy - sy)), grow = eio((t - BEAM[0]) / 0.45);
    for (let i = 0; i <= n * grow; i++) { const u = i / n, X = R(sx + (hx - sx) * u), Y = R(sy + (hy - sy) * u); for (let w = -2; w <= 2; w++) tintPx(c, X + w, Y, "#BFE0FF", bA * (w === 0 ? 0.85 : Math.abs(w) === 1 ? 0.45 : 0.18), 4); } }
  const heroA = t < EV.dot1 - 0.3 ? 0 : sm(t, EV.dot1 - 0.3, EV.dot1 + 0.1);
  // ---------- 4) Pluto for size + the bracket; 5) shiny twin + rays + slider
  const pluA = win(t, EV.big - 0.1, EV.why1 - 0.1, 0.45, 0.5);
  if (pluA > 0) { const k = eio((t - EV.big + 0.1) / 0.7), ko = eio((t - EV.why1 + 0.1) / 0.6), px = lerp(-90, 132, k) - 240 * ko; drawPluto(view(c, pluA), px, 372, 70, { a: pluA, spin: -0.1 + 0.05 * Math.sin(t * 0.3) }); label(c, "PLUTO", px, 452, pluA * sm(t, EV.maybe - 0.2, EV.maybe + 0.2)); }
  if (heroA > 0) {
    // the size question: two dashed ghosts (600 and 1,500 km) and a bracket under the world
    const gA = win(t, EV.maybe - 0.1, EV.why1 - 0.15, 0.35, 0.4);
    if (gA > 0) { ring(c, hx, hy, 18, "#7FE3F0", gA, 2); ring(c, hx, hy, 45, "#7FE3F0", gA, 2);
      const by = hy + 52, x0 = hx - H.r, x1 = hx + H.r; dline(c, x0, by, x1, by, "#7FE3F0", gA); dline(c, x0, by - 4, x0, by + 4, "#7FE3F0", gA); dline(c, x1, by - 4, x1, by + 4, "#7FE3F0", gA);
      label(c, "600–1,500 KM", hx, by + 12, gA * sm(t, EV.six - 0.15, EV.six + 0.2), "#7FE3F0"); }
    // the shiny twin: splits off the world, small and bright
    const twA = win(t, EV.guess - 0.25, EV.isEnd - 0.1, 0.3, 0.5);
    if (twA > 0) { const k = eio((t - EV.guess + 0.2) / 0.85), km = eio((t - EV.isEnd + 0.35) / 0.65), tx = lerp(lerp(hx, 168, k), hx, km), ty = lerp(lerp(hy, 362, k), hy, km), tr = lerp(lerp(H.r, 20, k), H.r, km);
      // rays to the little telescope: same strength from both
      const rA = win(t, EV.we - 0.1, EV.isEnd - 0.2, 0.35, 0.35), TX = 262, TY = 566;
      if (rA > 0) { for (const [wx, wy, wr] of [[tx, ty, tr], [hx, hy, H.r]]) for (const dx of [-0.5, 0, 0.5]) dline(c, wx + dx * wr, wy + wr + 3, TX + dx * 8, TY - 12, "#F4E6A8", rA, 3, 3, -R(t * 24));
        observatory.draw(view(c, rA), TX, TY, 0.22, t, drive(observatory, [[0, "open"]], t));
        label(c, "=", 262, 430, rA, "#F4CA50", 3); }
      drawIce(view(c, twA), tx, ty, tr, { a: twA, spin: heroSpin(t), alb: lerp(H.alb, 1, k) * (1 - km) });
      // the slider SHINY · DARK
      const sA = win(t, EV.we - 0.1, EV.isEnd - 0.2, 0.35, 0.35);
      if (sA > 0) { const y = 262, xa = 140, xb = 380; label(c, "SHINY", 88, y - 7, sA, "#FDFEED"); label(c, "DARK", 440, y - 7, sA, "#8A90B8"); dline(c, xa, y, xb, y, "#6A6E98", sA); dline(c, xa, y + 1, xb, y + 1, "#2A2C48", sA);
        const kx = lerp(lerp(xa, xb, 0.5), xa + 8, sm(t, EV.shiny - 0.1, EV.shiny + 0.3)), kk = lerp(kx, xb - 8, sm(t, EV.ice - 0.1, EV.isEnd + 0.1)); const g = view(c, sA); g.rect(R(kk) - 4, y - 5, 9, 11, "#05040C"); g.rect(R(kk) - 3, y - 4, 7, 9, "#F4CA50"); g.rect(R(kk) - 2, y - 3, 2, 3, "#FFF1A8"); }
    }
  }
  // ---------- 6) the old frames, back to 2016: big film frames in a cascade, the dot circled on each, linked by a growing dotted line
  const oldA = (i) => sm(t, OLD_T[i] - 0.05, OLD_T[i] + 0.3) * (1 - sm(t, EV.so1 - 0.3 + (3 - i) * 0.08, EV.so1 + 0.2 + (3 - i) * 0.08));
  const oldDots = OLD.map(() => null);
  for (let i = OLD.length - 1; i >= 0; i--) {
    const a = oldA(i); if (a <= 0) continue;
    const k = eio((t - OLD_T[i]) / 0.55), from = i === 0 ? [OLD_POS[0][0] + 170, OLD_POS[0][1] - 20] : OLD_POS[i - 1], x = lerp(from[0], OLD_POS[i][0], k), y = lerp(from[1], OLD_POS[i][1], k);
    const r = drawPhoto(view(c, a), x, y, OLD_Z, t, { a, seed: 2, dot: 0.5, dotB: 0.85, ring: 0.72 * sm(t, OLD_T[i] + 0.35, OLD_T[i] + 0.85), label: OLD[i], labelScale: 2, dim: 0.05, flash: 0.45 * Math.exp(-(((t - OLD_T[i] - 0.5) / 0.1) ** 2)) });
    oldDots[i] = r.dot;
  }
  { const lk = eio((t - LINK[0]) / (LINK[1] - LINK[0])), la = Math.min(sm(t, LINK[0], LINK[0] + 0.15), 1 - sm(t, EV.so1 - 0.2, EV.so1 + 0.3));
    if (la > 0) { const [du, dv] = dotAt(0.5), pts = OLD_POS.map(([x, y]) => [x - 60 * OLD_Z + du * (120 * OLD_Z - 1), y - 60 * OLD_Z + dv * (120 * OLD_Z - 1)]);
      // a smooth curve through the dots (Catmull-Rom), drawn from 2025 back to 2016 as it grows
      const curve = []; for (let s0 = 0; s0 < pts.length - 1; s0++) { const p0 = pts[Math.max(0, s0 - 1)], p1 = pts[s0], p2 = pts[s0 + 1], p3 = pts[Math.min(pts.length - 1, s0 + 2)];
        for (let q = 0; q < 40; q++) { const u = q / 40, u2 = u * u, u3 = u2 * u; curve.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3))); } }
      curve.push(pts[pts.length - 1]);
      const g = view(c, la), n = Math.floor((curve.length - 1) * lk);
      for (let q = 0; q <= n; q++) { if (q % 6 >= 3) continue; const [x, y] = curve[q]; g.rect(R(x) - 1, R(y) - 1, 2, 2, "#7FE3F0"); }
      if (lk > 0 && lk < 1) { const [x, y] = curve[n]; glowDot(c, x, y, la * 0.9, "#7FE3F0"); } } }
  // ---------- 8) the blink comparison: one sky patch, three frames
  const bcA = win(t, EV.rubin2 - 0.4, EV.out + 0.35, 0.5, 0.5);
  if (bcA > 0) {
    const k = eio((t - EV.rubin2 + 0.4) / 0.85), ko = eio((t - EV.out - 0.2) / 0.8), cx = lerp(lerp(hx, 270, k), HERO_SS[0], ko), cy = lerp(lerp(hy, 366, k), HERO_SS[1], ko), z = lerp(lerp(0.15, 3.0, k), 0.15, ko);
    const fl = BLINK.reduce((m, b) => Math.max(m, Math.exp(-(((t - b - 0.1) / 0.11) ** 2))), 0), diff = sm(t, EV.anything - 0.1, EV.anything + 0.5);
    const r = drawPhoto(view(c, bcA), cx, cy, z, t, { a: bcA, seed: 3, dotB: 0, flash: fl * 0.7, dim: 0.65 * diff, stars: 1 - 0.85 * diff, crowd: 1, label: "2026", labelScale: 2, labelA: sm(z, 1.4, 2.4) });
    // the moving dot in frames A, B, C (each crossfades into the next), then all three as a trail
    const ks = [0.15, 0.5, 0.85], pres = ks.map((_, i) => { const on = sm(t, BLINK[i], BLINK[i] + 0.22), off = i < 2 ? sm(t, BLINK[i + 1], BLINK[i + 1] + 0.22) : 0; return Math.max(on * (1 - off), on * diff * 0.75); });
    const S = 120 * z, x0 = cx - 60 * z, y0 = cy - 60 * z, pts = ks.map((kk) => { const [u, v] = dotAt(kk); return [x0 + u * (S - 1), y0 + v * (S - 1)]; });
    pts.forEach(([x, y], i) => { if (pres[i] * bcA > 0.02) glowDot(view(c, bcA), x, y, pres[i] * (0.55 + 0.4 * diff)); });
    if (diff > 0) { dline(c, pts[0][0], pts[0][1], pts[2][0], pts[2][1], "#7FE3F0", bcA * diff * 0.9, 2, 3); const pulse = 1 + 0.25 * Math.sin(Math.PI * clamp01((t - EV.stands) / 0.5)); ring(c, pts[2][0], pts[2][1], 11 * pulse, "#F4CA50", bcA * diff); }
  }
  // ---------- the lost dot's reticle (it dissolves: the dot gets lost)
  { const ra = win(t, EV.one2 + 0.1, EV.lost - 0.05, 0.3, 0.7); if (ra > 0) ring(c, hx, hy, 9 + 6 * (1 - sm(t, EV.one2 + 0.1, EV.one2 + 0.6)), "#F4CA50", ra * 0.9); }
  // ---------- the hero itself (hidden under the blink card; rolling into the sixth slot at the end)
  let hr = H.r, alb = H.alb, ha = heroA * (1 - win(t, EV.rubin2 - 0.2, EV.out + 0.1, 0.3, 0.3)) * (1 - 0.35 * sm(t, EV.faint, EV.lost));
  if (t > ROLL[0]) { const k = eio((t - ROLL[0]) / (ROLL[1] - ROLL[0])), [ex, ey] = CELLS[5]; const arc = Math.sin(Math.PI * k) * -40; hx = lerp(HERO_SS[0], ex, k); hy = lerp(HERO_SS[1], ey, k) + arc; hr = lerp(6, 28, k); }
  if (ha > 0) { const g = view(c, ha); drawIce(g, hx, hy, hr, { a: ha, spin: heroSpin(t), alb }); if (t > EV.brightEnd - 1.5 && t < EV.that1 + 0.4) sparkle(c, hx, hy, 0.9 * Math.sin(Math.PI * clamp01((t - EV.still + 0.1) / 0.9)), 9); }
  if (t > EV.round - 0.5 && t < EV.if2 + 0.8) { const a = win(t, EV.round - 0.35, EV.if2 + 0.2, 0.3, 0.4); ring(c, hx, hy, 13, "#F4CA50", a, 2); label(c, "?", hx + 20, hy - 22, a, "#F4CA50"); }
  // ---------- labels in the Solar System view
  if (W.ss) { const pa = win(t, EV.far - 0.1, EV.that1 + 0.1, 0.3, 0.3) * W.ssA; if (pa > 0) { label(c, "PLUTO", W.ss.plu[0], W.ss.plu[1] + 10, pa, "#E8C8A8"); drawPluto(view(c, pa), W.ss.plu[0], W.ss.plu[1], 4 * cam.z, { a: pa, spin: 0 }); } }
  if (W.ss && t > EV.out) { const pa = W.ssA * (1 - sm(t, EV.if2, EV.if2 + 0.5)); if (pa > 0) drawPluto(view(c, pa), W.ss.plu[0], W.ss.plu[1], 4 * cam.z, { a: pa, spin: 0 }); }
  // ---------- 9) the line-up
  if (t > EV.if2 - 0.2) {
    const draws = [
      (g, x, y, s, a) => drawPluto(g, x, y, 40 * s, { a, spin: -0.1 + 0.05 * Math.sin(t * 0.3) }),
      (g, x, y, s, a) => drawCeres(g, x, y, 23 * s, { a, spin: 0.1 * t - 0.2 }),
      (g, x, y, s, a) => drawEris(g, x, y, 38 * s, { a, spin: 0.08 * t }),
      (g, x, y, s, a) => drawHaumea(g, x, y, 42 * s, { a, spin: 0.9 * t }),
      (g, x, y, s, a) => drawMakemake(g, x, y, 31 * s, { a, spin: 0.09 * t + 1 }),
    ];
    const NAMES_TXT = ["PLUTO", "CERES", "ERIS", "HAUMEA", "MAKEMAKE"];
    for (let i = 0; i < 5; i++) {
      const tin = LINE_IN[i], k = eio((t - tin) / 0.7), a = sm(t, tin, tin + 0.35); if (a <= 0) continue;
      const from = i === 0 && W.ss ? W.ss.plu : [CELLS[i][0] + (i % 3 - 1) * 60, CELLS[i][1] + 200];
      const x = lerp(from[0], CELLS[i][0], k), y = lerp(from[1], CELLS[i][1], k) - 30 * Math.sin(Math.PI * k), nk = clamp01((t - NAMES[i]) / 0.45), bounce = 1 + 0.1 * Math.sin(Math.PI * nk) * (nk < 1 ? 1 : 0);
      draws[i](view(c, a), x, y, lerp(i === 0 ? 0.1 : 0.5, 1, k) * bounce, a);
      label(c, NAMES_TXT[i], CELLS[i][0], CELLS[i][1] + 48 - 5 * (1 - sm(t, NAMES[i] - 0.05, NAMES[i] + 0.3)), sm(t, NAMES[i] - 0.05, NAMES[i] + 0.3), "#FDFEED");
    }
    // the sixth slot: dashed circle with «?», filled by the rolling world
    const sa = sm(t, LINE_IN[4] + 0.1, LINE_IN[4] + 0.5), fillK = sm(t, ROLL[1] - 0.15, ROLL[1] + 0.25), [ex, ey] = CELLS[5];
    if (sa > 0) { ring(c, ex, ey, 30, "#7FE3F0", sa * (1 - 0.6 * fillK), 2); label(c, "?", ex, ey - 7, sa * (1 - fillK), "#7FE3F0", 3);
      const fl = Math.max(0, 1 - Math.abs(t - ROLL[1] - 0.05) / 0.25); if (fl > 0) ring(c, ex, ey, 33 + 8 * (1 - fl), "#FDFEED", fl);
      const la = sm(t, ROLL[1] + 0.1, ROLL[1] + 0.45); label(c, "2026", ex, ey + 40 - 5 * (1 - la), la, "#F4CA50"); label(c, "ED138", ex, ey + 58 - 5 * (1 - la), la, "#F4CA50"); }
  }
}
