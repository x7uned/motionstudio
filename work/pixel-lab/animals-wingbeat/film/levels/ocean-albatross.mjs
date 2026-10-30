// LV1's cute wandering albatross, facing the camera: round white head and plump white body, the longest wings of any
// bird (span ≈ 440 px here) in dark grey-brown with a white inner patch and white underside edge, a big pale-pink bill
// with tube nostrils and a yellowish hooked tip, gentle dark eyes with two highlights and soft brows, pink blush,
// pale pink webbed feet tucked under the belly, a short white tail.
// drawAlbatross(c, x, y, o): (x, y) = head centre (screen). Wing elevation strictly from the caller's phase/amount:
//   e = cos(2π·ph)·amt (+1 top of the stroke, −1 bottom); the hand follows the arm with a small lag (flexible tip).
// The body (expensive volume shading) is a cached sprite per roll angle; wings and eyes are drawn per frame.
import { blob, ell, tube, eye, blush, fade, mix, bayer } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";
import { wingFrame, drawWing } from "./ocean-wing.mjs";

const R = Math.round, TAU = Math.PI * 2;
export const WHITE = ["#2A2430", "#4A4250", "#6E6672", "#968D96", "#BAB2B6", "#DAD3D2", "#EFEBE8", "#FFFFFF"];
const WING = ["#191311", "#29211C", "#3A3029", "#4E4238", "#64574B", "#7C6E60", "#968878", "#B2A592"];
const BILL = ["#5A2630", "#8C3C48", "#BA5864", "#DC7A84", "#EF9AA0", "#F7B6B6", "#FCD0CA", "#FFE8E0"];
const FOOT = ["#3E2836", "#644258", "#8C627C", "#B086A0", "#CCA4BA", "#E2C0D0", "#F0D8E2", "#FAEEF2"];
const IRIS = ["#07060C", "#171014", "#261A1A", "#55392C", "#86604A"];
const OUT = "#1E1A26";
const SPR = spriteCache(40);
const PIV = [0, 46];                               // roll pivot (local, body centre)
export const SHOULDER = [30, 30];                 // local shoulder (right wing; mirrored for the left)

const rotP = (u, v, tilt) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u - PIV[0], dy = v - PIV[1]; return [PIV[0] + dx * cs - dy * sn, PIV[1] + dx * sn + dy * cs]; };

function bodySprite(tilt) {
  const key = `alb:${tilt.toFixed(2)}`, W = 170, H = 190, ox = 85, oy = 64;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => pts.map(([u, v]) => { const [a, b] = rotP(u, v, tilt); return [x + a, y + b]; });
    const E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 56));
    // tail: short white wedge behind the belly
    blob(g, [T([[-15, 78], [15, 78], [12, 96], [5, 101], [0, 99], [-5, 101], [-12, 96]])], { ramp: WHITE, thick: 5, base: 3.6, outline: OUT });
    // pale pink webbed feet tucked under the belly
    for (const sd of [-1, 1]) {
      blob(g, [T([[sd * 7, 80], [sd * 19, 80], [sd * 24, 96], [sd * 19, 101], [sd * 14, 97], [sd * 10, 102], [sd * 4, 96]])], { ramp: FOOT, thick: 4, base: 3.6, gain: 1.4, outline: "#3A2434" });
      for (const k of [0.32, 0.68]) { const [ax, ay] = T([[sd * (8 + 10 * k), 83]])[0], [bx, by] = T([[sd * (6 + 16 * k), 97]])[0]; g.line(R(ax), R(ay), R(bx), R(by), "#A87A96"); }
    }
    // body
    blob(g, [E(0, 50, 45, 41)], { ramp: WHITE, thick: 20, base: 4.5, gain: 2.0, slope: 1.3, outline: OUT, litOutline: "#5A5464" });
    // soft breast feather scallops (very light)
    for (const [u, v] of [[-14, 64], [0, 70], [14, 64], [-7, 78], [7, 78], [-22, 52], [22, 52]]) { const [px, py] = T([[u, v]])[0]; for (let i = -3; i <= 3; i++) g.px(R(px + i), R(py + Math.abs(i) * 0.5), i === 0 ? "#D2CDD4" : "#E4E0E6"); }
    // head
    blob(g, [E(0, 0, 47, 42)], { ramp: WHITE, thick: 24, base: 4.7, gain: 1.9, slope: 1.0, outline: OUT, litOutline: "#5A5464" });
    // the faint peach wash on the neck sides (wandering albatrosses often carry it) and soft grey brows
    for (const sd of [-1, 1]) {
      for (let Y = -6; Y <= 6; Y++) for (let X = -6; X <= 6; X++) { if (X * X + Y * Y > 36) continue; const [px, py] = T([[sd * 36 + X, 22 + Y]])[0]; if (((R(px) + R(py)) & 1) === 0 && bayer(R(px), R(py)) < 0.55 - (X * X + Y * Y) / 90) g.px(R(px), R(py), "#F2D2C6"); }
      for (let i = -8; i <= 7; i++) { const u = sd * (20 + i), v = -23.5 - 2.6 * (1 - (i / 8) ** 2) - (i * sd > 0 ? 0 : 0.6) * 0; const [px, py] = T([[u, v]])[0]; g.px(R(px), R(py), i > -6 && i < 5 ? "#8A8290" : "#B4ACB4"); }
    }
    // blush
    for (const sd of [-1, 1]) { const [bx, by] = T([[sd * 31, 12]])[0]; blush(g, bx, by, 7, 3.4, "#F48AA4"); }
    // the big pale-pink bill pointing down from between the eyes: tube nostrils, mandible edges, yellowish hooked tip
    const bill = [[-11, 1], [-12.5, 8], [-11.8, 18], [-10.6, 28], [-9.4, 35], [-6, 40], [-2, 42], [2, 42], [6, 40], [9.4, 35], [10.6, 28], [11.8, 18], [12.5, 8], [11, 1], [5, -2], [0, -3], [-5, -2]];
    blob(g, [T(bill)], { ramp: BILL, thick: 8, base: 3.9, gain: 1.6, slope: 0.8, light: [-0.7, -0.6], outline: "#4A1E28", litOutline: "#8C3C48" });
    // lower mandible edges (slightly darker strips) and the cutting-edge line
    for (const sd of [-1, 1]) {
      g.poly(T([[sd * 12.2, 12], [sd * 11.4, 22], [sd * 10.2, 32], [sd * 8.6, 32], [sd * 9.8, 22], [sd * 10.6, 11]]), "#C86872");
      for (let k = 0; k <= 12; k++) { const u = k / 12, [px, py] = T([[sd * (11 - 2.4 * u), 9 + 25 * u]])[0]; g.px(R(px), R(py), "#7A3440"); }
      // the groove that separates the bill plates, running from the nostril tube toward the hook
      for (let k = 0; k <= 10; k++) { const u = k / 10, [px, py] = T([[sd * (6.4 - 2.6 * u), 13 + 20 * u]])[0]; if (k % 4 !== 3) g.px(R(px), R(py), "#D27C86"); }
      // little smile at the gape
      const [ax, ay] = T([[sd * 12.6, 9]])[0], [bx2, by2] = T([[sd * 16.5, 5.5]])[0]; g.line(R(ax), R(ay), R(bx2), R(by2), "#7A3440");
      // tube nostrils
      const [nx, ny] = T([[sd * 6.2, 9]])[0]; g.rect(R(nx) - 1, R(ny), 3, 4, "#C26A74"); g.px(R(nx) - (sd > 0 ? 1 : -1) + 0, R(ny) + 1, "#8C3C48"); g.px(R(nx), R(ny) - 1, "#FCD0CA");
    }
    // culmen highlight
    for (let k = 0; k <= 28; k++) { const [px, py] = T([[-1.6, 1 + k]])[0]; g.px(R(px), R(py), k < 20 ? "#FFE8E0" : "#FCD0CA"); }
    // hooked tip (yellowish horn)
    blob(g, [T([[-8.6, 33], [-4, 31.5], [4, 31.5], [8.6, 33], [9, 38], [5, 43.5], [0, 46], [-5, 43.5], [-9, 38]])], { ramp: ["#4A3014", "#7A5422", "#A87A36", "#D0A050", "#E8C070", "#F4D690", "#FAE8B4", "#FFF6DA"], thick: 3, base: 3.9, gain: 1.4, outline: "#4A1E28" });
    { const [px, py] = T([[0, 47]])[0]; g.px(R(px), R(py), "#4A1E28"); g.px(R(px) - 1, R(py) - 1, "#4A1E28"); g.px(R(px) + 1, R(py) - 1, "#4A1E28"); }
  });
}

/** Wing elevations from the caller's phase (beats) and stroke amount: arm + lagging hand (rad, + = up). */
export function albatrossWing(ph, amt, flex = 0) {
  const e = Math.cos(TAU * ph) * amt, eh = Math.cos(TAU * (ph - 0.07)) * amt;
  const down = (v) => (v < 0 ? 0.8 * v : v);              // the stroke reaches a little higher than it dips (keeps the tips out of the UI corner)
  return { e, ea: 0.07 + 0.46 * down(e) + flex * 0.5, eh: -0.07 + 0.82 * down(eh) + flex };
}
const LEAD = (u) => 7.5 * Math.pow(1 - u, 0.35) * (u > 0.97 ? (1 - u) / 0.03 : 1);
const TRAIL = (u) => 18 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.4)), 0.72) + (u < 0.15 ? 4 * (1 - u / 0.15) : 0) + 1.1 * Math.abs(Math.sin(u * 64)) * (u < 0.8 ? 1 : 0);
const LOOK = {
  ramp: WING, outline: "#120D0C", litOutline: "#30261F", thick: 6,
  patch: { u1: 0.24, col: "#ECE8E6", depth: 0.8 }, coverts: "#8A7A6A", covW: 3.2, covTo: 0.55,
  under: "#F2F0EE", underW: 3, underTo: 0.82, tip: "#17110F", tipFrom: 0.86,
  feathers: { from: 0.12, every: 0.044, col: "#1E1814", depth: 0.42, handFrom: 0.4, lean: 0.02 },
};
export function wingFrames(x, y, tilt, ph, amt, flex = 0) {
  const W = albatrossWing(ph, amt, flex), out = [];
  for (const sd of [-1, 1]) {
    const [sx, sy] = rotP(sd * SHOULDER[0], SHOULDER[1], tilt);
    const F = wingFrame([x + sx, y + sy], sd, { La: 74, Lh: 112, ea: W.ea, eh: W.eh, rot: tilt, lead: LEAD, trail: TRAIL, n: 40, bend: 14 });
    out.push({ F, sd });
  }
  return { ...W, wings: out };
}

/**
 * o: tilt (roll, rad), ph (wing phase, beats), amt (0 glide … 1 full stroke), flex (tiny glide flex, rad), look [dx, dy],
 * blink 0..1, a (dissolve). Returns { e, wings } (wing frames, for air puffs and tips).
 */
export function drawAlbatross(c, x, y, o = {}) {
  x = R(x); y = R(y);
  const tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1;
  const W = wingFrames(x, y, tilt, o.ph ?? 0, o.amt ?? 0, o.flex ?? 0);
  if (a <= 0) return W;
  const look = { ...LOOK, underW: 2.4 + 3.2 * Math.max(0, W.e) };
  for (const { F } of W.wings) drawWing(c, F, { lead: LEAD, trail: TRAIL }, look, a, 0.25 * W.e);
  bodySprite(tilt).blit(c, x, y, { a });
  // eyes: gentle dark beads with two highlights
  const lk = o.look ?? [0, 0], bl = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = rotP(sd * 19, -8, tilt); eye(c, x + ex, y + ey, 10, { ry: 11.5, iris: IRIS, pupil: "bead", look: lk, blink: bl, lid: WHITE[5], outline: "#120E18", a }); }
  return W;
}
