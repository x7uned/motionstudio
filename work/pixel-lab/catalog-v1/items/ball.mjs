// catalog-v1 item «ball»: the red rubber ball of the dog films (dogs/kit/ball.mjs#drawBall: red / blue / yellow ramps,
// spin while rolling, impact squash, contact shadow by height). Copied with drawBall, BALL, contactShadow into
// items/lib/dogs-ball.mjs (import path only). Changes: the film draws it in film units, here the prop's slot centre is the
// ball centre and one film unit is K screen px at z 1 (radius 7 → 28 px); the roll, hop and spin are expressed as
// eased parameters (amp, w, hop, hr, sp) with integrated phases, so no state changes in one frame; the colour change is a
// dithered crossfade between two ramps through Bayer gates (the same gate as arrow.mjs).
import { drawBall, BALL, contactShadow } from "./lib/dogs-ball.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const RAMPS = [BALL.red, BALL.blue, BALL.yellow];
const K = 4;          // screen px per film unit at z 1
const HOP = 9;        // highest hop, film units
const ROLL = 10;      // half swing of a roll, film units
const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
// the dithered crossfade gate: a view that draws only the pixels whose Bayer threshold lies in [lo, hi)
function gateR(c, lo, hi) { if (lo <= 0 && hi >= 1) return c; const o = Object.create(c); o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); }; return o; }

export default {
  kind: "ball",
  covers: ["ball"],
  source: "dogs/kit/ball.mjs#drawBall (+ dogs/kit/ball.mjs BALL ramps, contactShadow)",
  desc: "red rubber ball on the floor; rolls left and right, bounces with squash, can turn blue or yellow",
  hw: 44, hh: 44,
  start: "sits still on the floor, its contact shadow under it",
  states: {
    rest: [0.4, "sits still on the floor"],
    roll: [0.6, "rolls left and right, spinning as it goes", "swish"],
    bounce: [0.5, "hops with a squash on each landing", "thud"],
    spin: [0.45, "spins in place"],
    blue: [0.6, "turns blue in a dithered crossfade", "sparkle"],
    yellow: [0.6, "turns yellow in a dithered crossfade", "sparkle"],
  },
  // amp: roll swing · w: roll phase rate · hop: hop strength · hr: hops per second · sp: spin rate · col: 0 red, 1 blue, 2 yellow
  base: { col: 0, amp: 0, w: 0, hop: 0, hr: 0, sp: 0 },
  st: {
    rest: { amp: 0, w: 0, hop: 0, hr: 0, sp: 0 },
    roll: { amp: 1, w: 2.2, hop: 0, hr: 0, sp: 0 },
    bounce: { amp: 0, w: 0, hop: 1, hr: 1.5, sp: 0 },
    spin: { amp: 0, w: 0, hop: 0, hr: 0, sp: 5.5 },
    blue: { col: 1 },
    yellow: { col: 2 },
  },
  linear: [],
  notes: "Film colours and spin/squash kept; the prop is the ball alone (no lawn). Rolling without slipping: the spin angle is x/r plus the integrated spin rate, so the spin follows the roll. Contact shadow drawn once, ungated (the colour gate would otherwise change it in the last frame of a colour change).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, Z = z * K, r = BALL.r;
    const spin0 = s.integ((q) => q.sp), ph = s.integ((q) => q.w), hp = s.integ((q) => q.hr);
    const x = ROLL * v.amp * Math.sin(ph);                       // roll position (film units)
    const spin = spin0 + x / r;                                  // rolling without slipping: angle = distance / radius
    const u = Math.abs(Math.sin(Math.PI * hp));                  // 0 on the floor, 1 at the top of a hop
    const hopH = HOP * v.hop * u;                                // height above the floor
    const sq = v.hop * (1 - sm(u / 0.3));                        // squash near each landing
    // colour: col 0..2 blends the two neighbouring ramps through complementary Bayer gates
    const col = clamp01(v.col / 2) * 2, i0 = Math.min(2, Math.floor(col)), i1 = Math.min(2, i0 + 1), k = i0 === 2 ? 0 : col - i0;
    const G = { X: (wx) => cx + wx * Z, Y: (wy) => cy + wy * Z, z: Z };
    // the contact shadow is drawn once, ungated (as drawBall does it), so the colour crossfade never changes it
    const hk = clamp01((hopH * Z) / 110), srx = r * Z * (1.18 + 0.2 * sq - 0.5 * hk), sry = Math.max(1, srx * 0.3);
    contactShadow(c, G.X(x), G.Y(r) - 0.5, srx, sry, 0.62 * (1 - 0.8 * hk) ** 1.3);
    // the ball's bottom sits at film y = r − hopH; drawBall keeps the bottom on the ground line through the squash
    if (k < 1) drawBall(gateR(c, k, 1.01), G, x, -hopH, { ramp: RAMPS[i0], spin, squash: sq });
    if (k > 0) drawBall(gateR(c, 0, k), G, x, -hopH, { ramp: RAMPS[i1], spin, squash: sq });
    const ry = r * (1 - 0.32 * sq), rx = r * (1 + 0.24 * sq), cyW = -hopH + (r - ry);
    const X = cx + x * Z, Yc = cy + cyW * Z;
    return { box: { x0: X - rx * Z - 1, y0: Yc - ry * Z - 1, x1: X + rx * Z + 1, y1: Yc + ry * Z + 1 }, pt: [X, Yc] };
  },
};
