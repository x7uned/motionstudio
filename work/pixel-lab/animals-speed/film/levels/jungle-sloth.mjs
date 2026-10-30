// LV2 · the sloth: a cute chibi three-toed sloth hanging upside down under a branch (back to the ground, four long
// limbs up to the branch, three long claws per hand hooked over it) with its big round head turned upright to the
// camera: pale face mask, dark eye stripes, round glossy eyes, little dark nose, the sleepy smile, dithered blush.
// Parts are cached sprites (local units → px by scale s; origin = head centre; branch top at local y BR):
//   hang (far limbs + body + near hind leg, 3 breathing frames) · head (fur + mask + stripes + nose) · near arm (per
//   hand position, so the super-slow reach is continuous) · face drawn live (eyes, blink, smile, blush).
// Algae: every fur pixel has an arrival time (seeded patches that grow, noisy edges); at time t the pixels whose
// arrival has passed are recoloured with the same shading band from an olive-green ramp → patches spread smoothly.
import { blob, flat, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, rnd, clamp01, lerp, bayer } from "../cute.mjs";
import { spriteCache, thick, pline, hex } from "./jungle-kit.mjs";
import { furry } from "./yard-catkit.mjs";

const R = Math.round;
export const FUR = ["#1C140E", "#33261C", "#4E3C2C", "#6A5440", "#876E56", "#A48B6E", "#C0A888", "#D9C6A6"];
export const MASK = ["#3A2C20", "#7A6A52", "#B4A284", "#D2C2A2", "#E6D9BC", "#F2E9D2", "#FAF5E8", "#FFFFFF"];
export const ALG = ["#121C0C", "#223214", "#33491C", "#466226", "#5C7C30", "#74963C", "#90AE50", "#AEC66C"];
const STRIPE = "#2A1A10", STRIPE2 = "#3C2818", NOSE = "#24160E", CLAW = ["#2A2018", "#6A5A44", "#B4A282", "#E2D6BA"];
const RIM = "#FFF1B8", IRIS = ["#0E0806", "#1E120A", "#3A2412", "#5A3A1C", "#7A5428", "#9A6E36", "#B88A48", "#D4A860"];
export const BR = -100;                       // branch top, local units (head centre = 0, 0)
const cache = spriteCache(80);
const FUR_RGB = FUR.map(hex), ALG_RGB = ALG.map(hex);

// ---------------------------------------------------------------- shapes (local units)
/** Ellipse with shaggy fur tufts on the rim (alternating spikes, seeded). */
function shag(cx, cy, rx, ry, fur = 0, seed = 0, rot = 0, lean = 0.3) {
  if (fur <= 0) return ell(cx, cy, rx, ry, rot);
  const tufts = Math.max(8, R((Math.PI * (rx + ry)) / 9)), n = tufts * 3, c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) {
    const j = i % 3, tk = Math.floor(i / 3), amp = fur * (0.5 + 0.8 * rnd(seed * 31 + tk)), k = j === 1 ? amp : 0;
    const a = (2 * Math.PI * (i + (j === 1 ? lean : 0))) / n, x = Math.cos(a) * (rx + k), y = Math.sin(a) * (ry + k);
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
/** Ellipse with soft hair tufts along its rim (furry: tuft length amt, period per, lean along the contour). */
const hair = (cx, cy, rx, ry, amt, per, seed, rot = 0, lean = 0.55) => furry(ell(cx, cy, rx, ry, rot, Math.max(24, R((rx + ry) * 2))), amt, per, seed, lean);
/** Shaggy tube along a polyline (limbs): tufts on both sides. */
function shagTube(pts, r0, r1, fur, seed) {
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = lerp(r0, r1, i / (n - 1));
    const kl = r + (i % 3 === 1 ? fur * (0.5 + 0.8 * rnd(seed + i)) : 0), kr = r + (i % 3 === 2 ? fur * (0.5 + 0.8 * rnd(seed + i + 50)) : 0);
    L.push([pts[i][0] - (dy / d) * kl + dx * 0.15 * (i % 3 === 1), pts[i][1] + (dx / d) * kl]); Rr.push([pts[i][0] + (dy / d) * kr, pts[i][1] - (dx / d) * kr]);
  }
  const tip = pts[n - 1], a = pts[n - 2], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]), cap = [];
  for (let k = 1; k < 6; k++) { const t = ang - Math.PI / 2 + (Math.PI * k) / 6; cap.push([tip[0] + Math.cos(t) * r1, tip[1] + Math.sin(t) * r1]); }
  return [...L, ...cap.reverse(), ...Rr.reverse()];
}
// limbs: [shoulder/hip, elbow control, wrist] and the hook x on the branch (local units)
export const LIMBS = {
  armFar: { root: [24, -46], ctrl: [30, -70], hook: [16, BR] },
  legFar: { root: [80, -50], ctrl: [92, -74], hook: [84, BR] },
  legNear: { root: [94, -44], ctrl: [118, -64], hook: [110, BR] },
  armNear: { root: [8, -38], ctrl: [-24, -52], hook: [-26, BR] },
};
const wristOf = (hook) => [hook[0] - 1, hook[1] + 9];
/** Three long curved claws from the wrist. hooked = 1: over the branch top (curling to its far side); 0: open, curved down. */
function claws(g, P, wx, wy, hooked, dir = 1, col = CLAW) {
  for (let k = 0; k < 3; k++) {
    const ox = (k - 1) * 3.2, h = hooked;
    const a = [wx + ox, wy - 2];
    const b = [wx + ox + dir * lerp(2, 5, 1 - h), wy + lerp(-13, -6, 1 - h)];
    const c2 = [wx + ox + dir * lerp(7, 10, 1 - h), wy + lerp(-12, 4, 1 - h)];
    const d = [wx + ox + dir * lerp(9, 7, 1 - h), wy + lerp(-6, 9, 1 - h)];
    const pts = bez(a, b, c2, 6).concat(bez(c2, [c2[0] + dir * 1.5, (c2[1] + d[1]) / 2], d, 4).slice(1)).map(([x, y]) => P(x, y));
    thick(g, pts, 1, col[0]);
    for (let i = 0; i < pts.length - 1; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; g.line(R(x0), R(y0), R(x1), R(y1), i < pts.length * 0.6 ? col[3] : col[2]); }
  }
}
function limb(g, P, L, far, s, seed, hand = null, hooked = 1) {
  const W = hand ?? wristOf(L.hook), pts = bez(L.root, L.ctrl, W, 12).map(([x, y]) => P(x, y));
  const ramp = far ? FUR.map((c0, i) => FUR[Math.max(0, i - 1)]) : FUR;
  blob(g, [shagTube(pts, 7.6 * s, 5.4 * s, 2.4 * s, seed), ell(...pts[0], 8.6 * s, 8.6 * s), ell(...P(W[0], W[1] - 1), 6 * s, 5.2 * s)], { ramp, thick: 6 * s, base: far ? 2.4 : 3.0, gain: 1.6, slope: 0.6, litOutline: far ? null : RIM });
  // fur strokes along the limb
  for (let i = 2; i < pts.length - 2; i += 3) { const [x, y] = pts[i], [x2, y2] = pts[i + 1]; g.line(R(x - 2 * s), R(y + 1), R(x2 - 1), R(y2 + 3 * s), ramp[2]); }
  claws(g, P, W[0], W[1], hooked, 1);
}

// ---------------------------------------------------------------- algae arrival field (local units → seconds after ALGAE0)
// seeds: [x, y, start offset (s), max radius]; patches grow at V units/s with noisy edges
const SEEDS = [[44, -40, 0.0, 24], [70, -30, 0.35, 20], [20, -58, 0.6, 16], [-24, -26, 0.25, 15], [26, -20, 0.9, 18], [96, -52, 0.8, 15], [100, -72, 1.2, 11], [-8, -70, 1.1, 12], [56, -58, 1.35, 14], [-30, -6, 1.5, 9], [30, -32, 1.6, 12], [-12, -78, 0.5, 10], [10, -30, 1.9, 9]];
const V = 13;
function arrivalAt(lx, ly) {
  let best = Infinity;
  for (let i = 0; i < SEEDS.length; i++) {
    const [sx, sy, t0, rmax] = SEEDS[i], wob = 1 + 0.28 * Math.sin(Math.atan2(ly - sy, lx - sx) * 5 + i * 1.7) + 0.18 * Math.sin(lx * 0.31 + ly * 0.23 + i);
    const d = Math.hypot(lx - sx, ly - sy) / wob; if (d > rmax) continue;
    best = Math.min(best, t0 + d / V);
  }
  return best === Infinity ? best : best + (rnd(R(lx * 7) * 131 + R(ly * 7) * 17) - 0.5) * 0.18;
}
/** Precompute per-pixel algae arrival + green colour of a sprite (fur pixels only). */
function algaeOf(spr, s) {
  if (spr.alg) return spr.alg;
  const L = spr.layer, W = L.w, H = L.h, d = L.c.d, arr = new Float32Array(W * H).fill(Infinity), col = new Uint8Array(W * H * 3);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; if (!L.m[i]) continue;
    const r = d[i * 3], g = d[i * 3 + 1], b = d[i * 3 + 2];
    let k = -1; for (let j = 0; j < 8; j++) { const q = FUR_RGB[j]; if (q[0] === r && q[1] === g && q[2] === b) { k = j; break; } }
    if (k < 0) continue;
    const a = arrivalAt((x - spr.ox) / s, (y - spr.oy) / s); if (a === Infinity) continue;
    arr[i] = a; const gc = ALG_RGB[k]; col[i * 3] = gc[0]; col[i * 3 + 1] = gc[1]; col[i * 3 + 2] = gc[2];
  }
  return (spr.alg = { arr, col });
}
/** pick() for Layer.blit: algae recolour at progress tau (seconds since the algae started), dithered edges. */
function algaePick(spr, s, tau) {
  if (!(tau > 0)) return null;
  const { arr, col } = algaeOf(spr, s);
  return (x, y, li) => { const a = arr[li]; if (a === Infinity || a > tau + 0.1) return 1; if (a > tau - 0.1 && (tau - a + 0.1) / 0.2 <= bayer(x, y)) return 1; return [col[li * 3], col[li * 3 + 1], col[li * 3 + 2]]; };
}

// ---------------------------------------------------------------- sprites
function hangSprite(s, b) {
  return cache(`hang|${s}|${b}`, R(200 * s), R(150 * s), R(48 * s), R(120 * s), (g, ox, oy) => {
    const P = (x, y) => [ox + x * s, oy + y * s];
    limb(g, P, LIMBS.armFar, true, s, 11);
    limb(g, P, LIMBS.legFar, true, s, 23);
    // body: a shaggy horizontal oval hanging under the branch, shoulders at the head end, rump at the other
    const br = b * 0.8;
    blob(g, [hair(...P(54, -32), 48 * s, (22 + br) * s, 4.2 * s, 7 * s, 3, -0.03), hair(...P(18, -30), 24 * s, (22 + br) * s, 3.6 * s, 7 * s, 5), hair(...P(94, -36), 22 * s, (20 + br) * s, 3.6 * s, 7 * s, 8)],
      { ramp: FUR, thick: 20 * s, base: 2.7, gain: 2.2, slope: 0.7, litOutline: RIM });
    // fur strokes and a few lighter tufts on the back (the side we see)
    for (let i = 0; i < 26; i++) { const x = 2 + rnd(i * 3) * 104, y = -46 + rnd(i * 5) * 24 + br, [px, py] = P(x, y); g.line(R(px), R(py), R(px + (rnd(i * 7) - 0.3) * 4 * s), R(py + 4 * s), FUR[rnd(i * 9) < 0.5 ? 2 : 3]); if (rnd(i * 11) < 0.35) g.px(R(px + 1), R(py - 1), FUR[6]); }
    limb(g, P, LIMBS.legNear, false, s, 37);
  });
}
function headSprite(s) {
  return cache(`head|${s}`, R(120 * s), R(110 * s), R(60 * s), R(56 * s), (g, ox, oy) => {
    const P = (x, y) => [ox + x * s, oy + y * s];
    // head fur: wide, shaggy, cheek fluff
    blob(g, [hair(...P(0, 0), 40 * s, 35 * s, 3.4 * s, 8 * s, 9), hair(...P(-29, 10), 13 * s, 14 * s, 3 * s, 7 * s, 4), hair(...P(29, 10), 13 * s, 14 * s, 3 * s, 7 * s, 6, 0, -0.55)],
      { ramp: FUR, thick: 18 * s, base: 3.0, gain: 2.0, slope: 0.7, litOutline: RIM });
    // pale face mask
    blob(g, [ell(...P(0, 6), 31 * s, 23 * s), ell(...P(0, -6), 21 * s, 13 * s)], { ramp: MASK, thick: 14 * s, base: 3.6, gain: 1.6, slope: 0.6, outline: FUR[3], litOutline: MASK[6] });
    // fringe over the mask top (widow's peak)
    for (let x = -18; x <= 18; x += 0.5) { const yb = -14 + Math.abs(x) * 0.18 - 5 * Math.exp(-(x * x) / 30); for (let y = -20; y < yb; y += 0.5) { const [px, py] = P(x, y); g.px(R(px), R(py), y > yb - 1.5 ? FUR[3] : FUR[4]); } }
    // dark eye stripes from the eyes back towards the temples
    for (const sd of [-1, 1]) {
      const [ex, ey] = P(sd * 14, 1.5); g.ellipse(R(ex), R(ey), R(12 * s), R(11.5 * s), STRIPE);
      const poly = [[sd * 18, -8], [sd * 28, -6], [sd * 37, -1], [sd * 37, 3], [sd * 29, 5], [sd * 22, 9]].map(([x, y]) => P(x, y));
      g.poly(poly, STRIPE); pline(g, [P(sd * 24, -6.5), P(sd * 36, -1)], STRIPE2);
    }
    // nose: a soft dark button with a highlight
    blob(g, [ell(...P(0, 12), 6.5 * s, 4.6 * s)], { ramp: ["#0C0806", NOSE, "#3A2618", "#4E3624", "#664834", "#7E5C44", "#9A7458", "#B48E70"], thick: 3 * s, base: 2.0, gain: 1.4, outline: "#0C0806" });
    { const [hx, hy] = P(-2, 10); g.px(R(hx), R(hy), "#C8B4A0"); g.px(R(hx) + 1, R(hy), "#9A8270"); }
  });
}
function nearArmSprite(s, hx, hy, hooked) {
  const qx = R(hx * 2) / 2, qy = R(hy * 2) / 2, qh = R(hooked * 10) / 10;
  return cache(`arm|${s}|${qx}|${qy}|${qh}`, R(120 * s), R(130 * s), R(76 * s), R(116 * s), (g, ox, oy) => {
    const P = (x, y) => [ox + x * s, oy + y * s];
    const L = LIMBS.armNear, W = [qx, qy], ctrl = [lerp(L.ctrl[0], (L.root[0] + qx) / 2 - 6, 1 - qh), lerp(L.ctrl[1], (L.root[1] + qy) / 2 - 10, 1 - qh)];
    limb(g, P, { ...L, ctrl }, false, s, 51, W, qh);
  });
}

// ---------------------------------------------------------------- public
/**
 * Draw the hanging sloth. (x, y) = screen head centre; o: { s, a, t, breath 0..2 (continuous), blink 0..1 (extra),
 * look [dx, dy], reach 0..1 (near hand: hooked → towards the leaf), reachTo [x, y] local target, algae (seconds since
 * the algae started; null = none), smile 0..1 }.
 */
export function drawSloth(c, x, y, o = {}) {
  const s = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return;
  const tau = o.algae ?? null, g = fade(c, a), X = R(x), Y = R(y);
  // hang (body + far limbs + near leg): breathing frames crossfaded by the fractional part
  const b = Math.max(0, Math.min(2, o.breath ?? 0)), b0 = Math.floor(b), f = b - b0;
  const sp0 = hangSprite(s, b0), pick0 = algaePick(sp0, s, tau);
  sp0.blit(c, X, Y, { a, pick: pick0 });
  if (f > 0.02 && b0 < 2) { const sp1 = hangSprite(s, b0 + 1), pick1 = algaePick(sp1, s, tau); sp1.blit(c, X, Y, { a: a * f, pick: pick1 }); }
  // near arm: hooked on the branch → reaching out (cached per half-unit of hand position)
  const L = LIMBS.armNear, k = clamp01(o.reach ?? 0), to = o.reachTo ?? [-60, -64], w0 = wristOf(L.hook);
  const lift = Math.sin(Math.PI * Math.min(1, k * 2.2)) * 3 * (1 - k);
  const hx = lerp(w0[0], to[0], k), hy = lerp(w0[1], to[1], k) - lift, hooked = 1 - clamp01(k * 6);
  const am = nearArmSprite(s, hx, hy, hooked); am.blit(c, X, Y, { a, pick: algaePick(am, s, tau) });
  // head (bobs a little under the body: hanging, relaxed)
  const hdx = o.headDx ?? 0, hdy = o.headDy ?? 0, HX = R(x + hdx), HY = R(y + hdy);
  const hs = headSprite(s); hs.blit(c, HX, HY, { a, pick: algaePick(hs, s, tau) });
  face(c, HX, HY, s, o, a);
  return { head: [HX, HY] };
}
function face(c, x, y, s, o, a) {
  const P = (u, v) => [x + u * s, y + v * s];
  const lidRest = o.lid ?? 0.16, blink = clamp01(lidRest + (1 - lidRest) * clamp01(o.blink ?? 0)), look = o.look ?? [0, 0];
  for (const sd of [-1, 1]) {
    const [ex, ey] = P(sd * 14, 1.5); eye(c, ex, ey, 9.4 * s, { ry: 10.2 * s, iris: IRIS, pupil: "round", look, blink, a, lid: STRIPE, outline: "#120A06" });
    // closed: a pale sleepy lash curve (∪) on the dark eye patch, so a shut eye reads as shut
    const k = clamp01((blink - 0.72) / 0.25); if (k > 0) { const gl = fade(c, a * k), w = 8 * s; for (let i = -R(w); i <= R(w); i++) { const u = i / w, yy = ey + 1.5 * s + (1 - u * u) * 3.2 * s; gl.px(R(ex + i), R(yy), "#D8C4A4"); if (Math.abs(u) < 0.75) gl.px(R(ex + i), R(yy) + 1, "#9A8468"); } gl.px(R(ex + sd * (w + 1)), R(ey + 1.5 * s) - 1, "#D8C4A4"); }
  }
  // sleepy smile: a wide soft curve with upturned corners
  const sm = o.smile ?? 1, g = fade(c, a), [mx, my] = P(0, 19.5), w = 9 * s;
  for (let X = -R(w); X <= R(w); X++) { const u = X / w, yy = my + (2.4 * s) * (1 - u * u) * sm - (Math.abs(u) > 0.8 ? (Math.abs(u) - 0.8) * 6 * s : 0); g.px(R(mx + X), R(yy), "#2A1A10"); }
  g.px(R(mx), R(my + 2.4 * s * sm) + 1, "#7A4A3A");
  for (const sd of [-1, 1]) { const [bx, by] = P(sd * 22, 15.5); blush(c, bx, by, 6.5 * s, 3.2 * s, "#F08A9A", a); }
}
/** Small moth (sloth moths live in the fur): (x, y) screen centre, flap phase p, a alpha, sc size. Dark outline for contrast. */
export function moth(c, x, y, p, a = 1, sc = 1) {
  const g = fade(c, a), up = Math.sin(p * Math.PI * 2), X = R(x), Y = R(y), w = R(5 * sc), hgt = R((up > 0 ? 4 : 1) * sc);
  for (const sd of [-1, 1]) {
    const wing = [[X, Y], [X + sd * w, Y - hgt - 1], [X + sd * (w + 2), Y - hgt + 2], [X + sd * (w - 1), Y + 3], [X + sd * 2, Y + 3]];
    g.poly(wing.map(([u, v]) => [u + sd, v]), "#3A2E20"); g.poly(wing.map(([u, v]) => [u, v - 1]), "#3A2E20");
    g.poly(wing, "#EADCB4"); g.px(X + sd * (w - 1), Y - hgt + 1, "#A8946C"); g.px(X + sd * (w - 2), Y + 1, "#C8B48A");
  }
  g.rect(X, Y - 2, 1, 6, "#4A3A28"); g.px(X - 1, Y - 3, "#4A3A28"); g.px(X + 1, Y - 3, "#4A3A28");
}
/** Build the algae maps of the static parts ahead of time (one part per call: k = 0..2 hang frames, 3 head). */
export function warmSloth(k, s) { if (k < 3) algaeOf(hangSprite(s, k), s); else if (k === 3) algaeOf(headSprite(s), s); }
/** ICON: the sloth's head, ~56 px wide, centred at (cx, cy). */
export function slothIcon(c, cx, cy, a = 1) {
  const s = 0.62, hs = headSprite(s); hs.blit(c, R(cx), R(cy + 2), { a });
  face(c, R(cx), R(cy + 2), s, { lid: 0.22, look: [0, 0] }, a);
}
