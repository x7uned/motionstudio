// The cute chibi crocodile of LV4 in a three-quarter view that reads as a croc at phone size: its long snout points to
// the right (toward the shore), both big glossy eyes sit on domes on top of the head and look into the camera
// (golden-green iris, slit pupils), a nostril knob on the snout tip, a toothy grin along the jaw, a pale yellow lower
// jaw, blush; behind it a bumpy back with scutes, stubby clawed legs and a ridged tail curling on the mud.
// The upper head turns about the jaw hinge: −snap opens the mouth (pink mouth, two rows of teeth), −pitch levels the
// whole head when it floats (so the eyes and the nostril knob are what stays above the water). Body, upper head and jaw
// are cached sprites (one per quantised angle); teeth, mouth, eyes and blush are drawn per frame. Also the ICON head.
import { blob, flat, ell, tube, bez, eye, blush, mix, fade } from "../cute.mjs";
import { spriteCache, xf, R, clamp01, lerp } from "./river-kit.mjs";

export const CROC = ["#0C1E10", "#163A1C", "#235428", "#336E34", "#468A40", "#5EA44E", "#80BE62", "#ACD884"];
const BELLY = ["#3A3214", "#5E5222", "#8A7A36", "#B0A04C", "#CEC066", "#E2D688", "#F0E8B0", "#FAF6D8"];
const IRIS = ["#1A1404", "#3A2E08", "#6A5A10", "#9A8A1A", "#C4B42A", "#E2D23E", "#F4E86A", "#FCF6A8"];
const LIT = "#FFD27A";                 // golden-hour rim light from the big sun behind
export const SC = 1.2;                  // overall size of the croc (local units × SC = px)
export const FEET = 84;                // local y of the feet below the head centre (× SC)
export const HINGE = [-14, 24];        // the jaw hinge (local)
export const TIP = 104;                // local x of the snout tip

const SPR = spriteCache(80);
const Q = 0.03, q = (a) => Math.round(a / Q) * Q;                       // sprite angle quantum
/** Point rotation about the hinge by `a` (rad; negative lifts the snout tip). */
const rot = (a) => { const cs = Math.cos(a), sn = Math.sin(a); return (x, y) => { const dx = x - HINGE[0], dy = y - HINGE[1]; return [HINGE[0] + dx * cs - dy * sn, HINGE[1] + dx * sn + dy * cs]; }; };

// ---------------------------------------------------------------- local geometry (unrotated)
const SNOUT = [[4, 6, 28], [52, 14, 22], [94, 20, 16]];               // centreline points with radius
const JAW = [[-16, 32, 14], [40, 36, 12], [92, 33, 9]];
const lerpPts = (pts, x, k) => { if (x <= pts[0][0]) return pts[0][k]; for (let i = 0; i < pts.length - 1; i++) if (x <= pts[i + 1][0]) { const u = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][k] + (pts[i + 1][k] - pts[i][k]) * u; } return pts[pts.length - 1][k]; };
/** Upper jaw edge (snout bottom) and lower jaw top edge at local x. */
export const upperEdge = (x) => (x > 92 ? 13 + 13 * Math.sqrt(Math.max(0, 1 - ((x - 98) / 17) ** 2)) : lerpPts(SNOUT, x, 1) + lerpPts(SNOUT, x, 2));
const lowerEdge = (x) => lerpPts(JAW, x, 1) - lerpPts(JAW, x, 2);
export const EYES = [[-28, -34, 12], [20, -32, 13.5]];               // far eye (left), near eye (right): x, y, r
const KNOB = [100, 2];

// ---------------------------------------------------------------- sprites
/** Back with scutes, legs, belly and the ridged tail curling to the left on the mud; tail = 0..1 curl. */
const bodySprite = (tail) => SPR(`b${R(tail * 8)}`, 400, 170, 276, 20, (g, ox, oy) => {
  const P = xf(ox, oy, SC, 0);
  // far legs (behind)
  for (const [x0, x1] of [[-42, -46], [-110, -118]]) { blob(g, [tube([P(x0, 50), P(x1, FEET - 6)], 13 * SC, 11 * SC), P.poly(ell(x1 - 2, FEET - 4, 14, 6))], { ramp: CROC, thick: 8, base: 2.5, gain: 1.4, litOutline: CROC[5] }); }
  // tail with ridge plates
  const tp = bez([-120, 50], [-186, 76 - tail * 6], [-178 - tail * 4, 30 - tail * 10], 18).map(([x, y]) => P(x, y));
  blob(g, [tube(tp, 17 * SC, 4 * SC)], { ramp: CROC, thick: 8, base: 3.0, gain: 1.6, litOutline: LIT });
  for (let i = 2; i < tp.length - 1; i += 2) {
    const [ax, ay] = tp[i - 1], [bx, by] = tp[i + 1], dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, f = i / (tp.length - 1), r = lerp(17, 4, f) * SC, h = lerp(8, 3, f) * SC;
    const [cx, cy] = tp[i], sx = ny > 0 ? -1 : 1, base = [cx + nx * sx * (r - 1), cy + ny * sx * (r - 1)];
    flat(g, [[[base[0] - (dx / d) * h * 0.7, base[1] - (dy / d) * h * 0.7], [base[0] + nx * sx * h, base[1] + ny * sx * h], [base[0] + (dx / d) * h * 0.7, base[1] + (dy / d) * h * 0.7]]], CROC[2], { outline: CROC[0] });
  }
  // the back: a long rounded body going back to the left, a bumpy line of scutes along its top
  const top = (x) => 40 - 34 * Math.sqrt(Math.max(0, 1 - ((x + 60) / 74) ** 2));
  const bumps = []; for (let i = 0; i < 8; i++) { const x = -124 + i * 17; bumps.push(P.poly(ell(x, top(x) + 2, 7, 6))); }
  blob(g, [P.poly(ell(-60, 40, 74, 34)), ...bumps], { ramp: CROC, thick: 22, base: 2.8, gain: 2.0, slope: 0.6, litOutline: LIT });
  for (let row = 0; row < 2; row++) for (let i = 0; i < 7; i++) { const x = -116 + i * 17 + row * 8, y = top(x) + 10 + row * 9; const p = P(x, y); g.px(R(p[0]), R(p[1]), CROC[6]); g.px(R(p[0]) + 1, R(p[1]), CROC[6]); g.px(R(p[0]), R(p[1]) + 1, CROC[3]); g.px(R(p[0]) + 1, R(p[1]) + 1, CROC[3]); }
  for (let i = 0; i < 8; i++) { const x = -124 + i * 17, p = P(x - 2, top(x) - 2); g.px(R(p[0]), R(p[1]), CROC[7]); }
  // chest / belly under the head, the near front leg with three claws
  blob(g, [P.poly(ell(-12, 60, 34, 18))], { ramp: BELLY, thick: 10, base: 3.4, gain: 1.6, outline: CROC[1] });
  blob(g, [tube([P(8, 44), P(14, FEET - 6)], 15 * SC, 13 * SC), P.poly(ell(18, FEET - 4, 17, 7))], { ramp: CROC, thick: 9, base: 2.9, gain: 1.6, litOutline: LIT });
  for (const dx of [6, 14, 22]) { const p = P(18 + dx, FEET - 1); g.rect(R(p[0]) - 1, R(p[1]) - 1, 3, 2, BELLY[6]); g.px(R(p[0]) + 1, R(p[1]) + 1, BELLY[3]); }
});
/** Upper head (cranium, eye domes, snout, nose bulb with its nostril knob) turned about the hinge by angle a. */
const upperHead = (a) => { a = q(a); return SPR(`u${a.toFixed(2)}`, 230, 205, 84, 116, (g, ox, oy) => {
  const r = rot(a), P = (x, y) => { const [u, v] = r(x, y); return [ox + u * SC, oy + v * SC]; }, poly = (pts) => pts.map(([x, y]) => P(x, y));
  blob(g, [poly(ell(-6, -6, 46, 27)), poly(ell(EYES[0][0], EYES[0][1], 18, 16)), poly(ell(EYES[1][0], EYES[1][1], 19.5, 17.5)), poly(tube(SNOUT.map(([x, y]) => [x, y]), 28, 16)), poly(ell(98, 13, 17, 13)), poly(ell(4, 8, 26, 26))],
    { ramp: CROC, thick: 22, base: 3.1, gain: 2.0, slope: 0.45, litOutline: LIT, outline: CROC[0] });
  blob(g, [poly(ell(KNOB[0], KNOB[1], 9, 5.5))], { ramp: CROC, thick: 4, base: 3.8, gain: 1.2, litOutline: LIT, outline: CROC[0] });
  for (const dx of [-3, 3]) { const p = P(KNOB[0] + dx, KNOB[1]); g.rect(R(p[0]) - 1, R(p[1]), 2, 2, "#0C1408"); }
  // scales: a row of raised dots along the snout top, darker spots, brow ridges over the domes
  for (let k = 0; k < 7; k++) { const x = 14 + k * 12, p = P(x, lerpPts(SNOUT, x, 1) - lerpPts(SNOUT, x, 2) + 5); g.px(R(p[0]), R(p[1]), CROC[7]); g.px(R(p[0]), R(p[1]) + 1, CROC[4]); }
  for (let i = 0; i < 24; i++) { const x = -44 + ((i * 37) % 140), y = -20 + ((i * 23) % 44), cy = lerpPts(SNOUT, x, 1), rr = lerpPts(SNOUT, x, 2); if (Math.abs(y - cy) > rr * 0.6 && (x / 44) ** 2 + ((y + 6) / 22) ** 2 > 0.7) continue; const p = P(x, y); g.px(R(p[0]), R(p[1]), CROC[3]); g.px(R(p[0]) + 1, R(p[1]), CROC[3]); }
  for (const [ex, ey, er] of EYES) for (let k = -10; k <= 10; k++) { const p = P(ex + k, ey - er - 6 + (k * k) / 16); g.px(R(p[0]), R(p[1]), CROC[6]); }
}); };
/** Lower jaw (pale underside) turned by angle a. */
const jawSprite = (a) => { a = q(a); return SPR(`j${a.toFixed(2)}`, 196, 134, 60, 36, (g, ox, oy) => {
  const r = rot(a), P = (x, y) => { const [u, v] = r(x, y); return [ox + u * SC, oy + v * SC]; };
  blob(g, [tube(JAW.map(([x, y]) => [x, y]), 14, 9).map(([x, y]) => P(x, y))], { ramp: BELLY, thick: 9, base: 3.0, gain: 1.6, slope: 0.6, litOutline: "#FFF4C8", outline: CROC[1] });
  for (let k = 0; k < 6; k++) { const x = -4 + k * 16, p = P(x, lerpPts(JAW, x, 1) + 3); g.px(R(p[0]), R(p[1]), BELLY[3]); }
}); };

function tooth(g, x, y, dir, h = 4) { for (let k = 0; k < h; k++) { const w = k < h - 2 ? 1 : 0.4 > 0 && k === h - 2 && h > 4 ? 1 : 0; g.rect(R(x) - w, R(y + dir * k), 2 * w + 1, 1, k === 0 ? "#E4DCC8" : "#FFFFFF"); } g.px(R(x), R(y + dir * h), "#6A6050"); }

/**
 * Draw the croc with its head centre at screen (x, y); wly = water surface row (rows below are tinted through `uw`).
 * o: snap (rad, upper jaw opening) · pitch (rad, levels the head when floating) · look · blink · tail (0..1 curl) ·
 *    tint/k (underwater look).
 */
export function drawCroc(c, uw0, x, y, wly, o) {
  const A = o.a ?? 1; if (A <= 0) return; const uw = fade(uw0, A);
  const below = { below: wly, tint: o.tint, k: o.k, a: A }, snap = Math.max(0, o.snap ?? 0), pitch = o.pitch ?? 0;
  const au = q(-pitch - snap), aj = q(-pitch), U = rot(au), J = rot(aj), S = (f, lx, ly) => { const [u, v] = f(lx, ly); return [x + u * SC, y + v * SC]; };
  bodySprite(o.tail ?? 0).blit(c, x, y, below);
  jawSprite(aj).blit(c, x, y, below);
  // open mouth: a pink wedge between the jaws with a tongue, rows of teeth on both edges
  if (snap > 0.015) {
    const xs = []; for (let lx = -10; lx <= 96; lx += 6) xs.push(lx);
    const up = xs.map((lx) => S(U, lx, upperEdge(lx) - 2)), lo = xs.map((lx) => S(J, lx, lowerEdge(lx) + 3)).reverse();
    uw.poly([...up, ...lo], "#8A2A46");
    const tg = xs.slice(1, -3).map((lx) => S(J, lx, lowerEdge(lx) + 1)), tg2 = xs.slice(1, -3).map((lx) => S(J, lx, lowerEdge(lx) - 5 * Math.min(1, snap * 6))).reverse();
    uw.poly([...tg, ...tg2], "#F07E9A");
    for (let i = 1; i < xs.length - 1; i++) { const [px, py] = S(J, xs[i], lowerEdge(xs[i]) - 4 * Math.min(1, snap * 6)); uw.px(R(px), R(py), "#FFB0C4"); }
    for (let i = 0; i < up.length - 1; i++) uw.line(R(up[i][0]), R(up[i][1]), R(up[i + 1][0]), R(up[i + 1][1]), "#2A0E18");
    const th = Math.min(5, 2 + snap * 14);
    for (let lx = 10; lx <= 94; lx += 12) { const [px, py] = S(U, lx, upperEdge(lx) - 1); tooth(uw, px, py, 1, th); const [qx, qy] = S(J, lx + 6, lowerEdge(lx + 6) + 2); if (lx + 6 < 92) tooth(uw, qx, qy, -1, th); }
  }
  upperHead(au).blit(c, x, y, below);
  // closed grin: teeth along the jaw line (upper ones down, lower ones up, interlocking), a curled mouth corner
  const gt = 1 - clamp01(snap / 0.08); if (gt > 0) { const gg = fade(uw, gt);
    for (let lx = 10; lx <= 94; lx += 14) { const [px, py] = S(U, lx, upperEdge(lx) - 1); tooth(gg, px, py, 1, 5); if (lx + 7 <= 90) { const [qx, qy] = S(J, lx + 7, upperEdge(lx + 7) + 4); tooth(gg, qx, qy, -1, 4); } } }
  { const [mx, my] = S(U, -14, 30); for (const [dx, dy] of [[0, 0], [-1, -1], [-2, -2], [-3, -3], [-3, -4], [-3, -5]]) uw.px(R(mx + dx), R(my + dy), CROC[0]); }
  for (const [i, [ex, ey, er]] of EYES.entries()) { const [px, py] = S(U, ex, ey); eye(uw, px, py, er * SC, { ry: er * SC * 1.07, iris: IRIS, pupil: "slit", look: o.look, blink: o.blink ?? 0, lid: CROC[5], outline: "#0C1408" }); }
  { const [bx, by] = S(U, 34, 14); blush(uw, bx, by, 10, 4.5, "#F28A8A"); const [cx2, cy2] = S(U, -40, 6); blush(uw, cx2, cy2, 8, 4, "#F28A8A"); }
}
/** Screen position of the nostril knob / an eye for a croc drawn at (x, y) with the given pitch and snap. */
export function crocPoint(x, y, lx, ly, pitch = 0, snap = 0) { const [u, v] = rot(q(-pitch - snap))(lx, ly); return [x + u * SC, y + v * SC]; }
export { KNOB };

// ---------------------------------------------------------------- ICON (~56 px head portrait, three-quarter, eyes to camera)
const ICS = 0.34, ICX = 31;
const iconSprite = () => SPR("icon", 72, 64, 36, 34, (g, ox, oy) => {
  const P = (x, y) => [ox + (x - ICX) * ICS, oy + y * ICS];
  blob(g, [tube(JAW.map(([x, y]) => P(x, y)), 14 * ICS + 1, 9 * ICS + 0.5)], { ramp: BELLY, thick: 4, base: 3.0, gain: 1.4, outline: CROC[1] });
  blob(g, [ell(...P(-6, -6), 46 * ICS, 27 * ICS), ell(...P(EYES[0][0], EYES[0][1]), 19 * ICS + 1, 17 * ICS + 1), ell(...P(EYES[1][0], EYES[1][1]), 20 * ICS + 1, 18 * ICS + 1), tube(SNOUT.map(([x, y]) => P(x, y)), 28 * ICS, 16 * ICS), ell(...P(98, 13), 17 * ICS, 13 * ICS), ell(...P(4, 8), 26 * ICS, 26 * ICS)],
    { ramp: CROC, thick: 7, base: 3.2, gain: 1.8, slope: 0.4, litOutline: CROC[7], outline: CROC[0] });
  blob(g, [ell(...P(KNOB[0], KNOB[1]), 3.6, 2.4)], { ramp: CROC, thick: 2, base: 3.8, gain: 1, outline: CROC[0] });
  for (let lx = 12; lx <= 90; lx += 18) { const [px, py] = P(lx, upperEdge(lx)); g.px(R(px), R(py), "#FFFFFF"); g.px(R(px) - 1, R(py) - 1, "#F4F0E4"); g.px(R(px), R(py) + 1, "#E4DCC8"); }
  for (const [ex, ey, er] of EYES) { const [px, py] = P(ex, ey); eye(g, px, py, er * 0.52, { ry: er * 0.56, iris: IRIS, pupil: "slit", lid: CROC[5], outline: "#0C1408" }); }
  const [bx, by] = P(34, 14); blush(g, bx, by, 3.5, 1.8, "#F28A8A");
});
export function ICON(c, cx, cy, a = 1) { if (a > 0) iconSprite().blit(c, R(cx), R(cy) + 4, { a }); }

// ---------------------------------------------------------------- the floating croc, front view (eyes + nostrils above water)
/** Eye domes, nostril knob and the submerged head of a croc floating head-on at the surface (local 0 = waterline). */
const floatSprite = () => SPR("float", 156, 108, 78, 36, (g, ox, oy) => {
  const P = xf(ox, oy, SC, 0);
  blob(g, [P.poly(ell(0, 14, 52, 17)), P.poly(ell(0, 30, 30, 16))], { ramp: CROC, thick: 14, base: 2.8, gain: 1.6, slope: 0.4, litOutline: CROC[5], outline: CROC[0] });
  blob(g, [P.poly(ell(-24, -8, 17, 15)), P.poly(ell(24, -8, 17, 15)), P.poly(ell(0, 4, 40, 9))], { ramp: CROC, thick: 12, base: 3.0, gain: 2.0, slope: 0.4, litOutline: LIT, outline: CROC[0] });
  blob(g, [P.poly(ell(0, -1, 11, 6))], { ramp: CROC, thick: 4, base: 3.8, gain: 1.2, litOutline: LIT, outline: CROC[0] });
  for (const sd of [-1, 1]) { const p = P(sd * 4, -2); g.rect(R(p[0]) - 1, R(p[1]), 2, 2, "#0C1408"); for (let k = -8; k <= 8; k++) { const q2 = P(sd * 24 + k, -24 + (k * k) / 14); g.px(R(q2[0]), R(q2[1]), CROC[6]); } }
});
/** Floating croc at screen x, its waterline at screen `y` (= wly when surfaced, lower while it rises); a dissolves. */
export function drawFloat(c, uw, x, y, wly, o) {
  const a = o.a ?? 1; if (a <= 0) return;
  floatSprite().blit(c, x, y, { below: wly, tint: o.tint, k: o.k, a });
  const g = fade(uw, a);
  for (const sd of [-1, 1]) eye(g, x + sd * 24 * SC, y - 10 * SC, 11.5 * SC, { ry: 12.2 * SC, iris: IRIS, pupil: "slit", look: o.look, blink: o.blink ?? 0, lid: CROC[5], outline: "#0C1408" });
}
