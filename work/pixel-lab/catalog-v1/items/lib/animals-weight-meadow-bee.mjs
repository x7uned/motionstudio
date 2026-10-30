// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-weight/film/levels/meadow-bee.mjs#drawBee (and miniBee/pileBee as in the film); changes: imports re-pointed to ./cute.mjs and ./animals-weight-meadow-kit.mjs.
// The series' honeybee (same design as the first film's meadow bee: chubby, striped, fuzzy collar, glossy bead eyes,
// blush, smile, round-tipped antennae, blue-white flutter wings), adapted: any scale `s`, a cached body sprite (the
// expensive volume shading is drawn once per scale/tilt key), worried brows and a little sweat drop for heavy loads,
// and a tiny 8-px worker bee for swarms. (x, y) = head centre in screen pixels. All motion comes from the caller's
// phases, so a loop film can keep everything periodic.
import { blob, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, bayer } from "./cute.mjs";
import { spriteCache, xform } from "./animals-weight-meadow-kit.mjs";

const R = Math.round;
const BEE_EYE = ["#0A0610", "#1A1020", "#2A1A30", "#6A4A2A", "#A87A3A"];
const STRIPE = ["#07060C", "#0E0A14", "#16101E", "#1E1628", "#2A1E30", "#3A2A3A", "#4E3A44", "#6A5050"];
const FUZZ = ["#3A2604", "#6A4808", "#A07010", "#D09A20", "#F2C23A", "#FAD866", "#FDE89A", "#FFF6D0"];
const SPR = spriteCache(24);

/** Body (abdomen with stripes, stinger, little legs, fuzzy collar, head, head tuft) into a cached sprite. */
function body(s, tilt) {
  const key = `bee:${s.toFixed(3)}:${tilt.toFixed(2)}`, W = R(150 * s) + 8, H = R(190 * s) + 8, ox = R(W / 2), oy = R(70 * s) + 4;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); dx *= s; dy = dy * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
    const poly = (p) => xform(p, x, y + 40 * s, tilt);
    const ab = poly(ell(x, y + 64 * s, 44 * s, 40 * s, 0, 48)), st = poly([[x - 5 * s, y + 100 * s], [x + 5 * s, y + 100 * s], [x, y + 112 * s]]);
    blob(g, [st], { ramp: RAMP.ink, thick: 3 });
    for (const sd of [-1, 1]) for (const [dx, dy, ex, ey] of [[14, 96, 18, 106], [26, 90, 34, 99]]) { const p = P(sd * dx, dy), q = P(sd * ex, ey); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#140E1C"); g.px(R(q[0]) + sd, R(q[1]), "#140E1C"); }
    blob(g, [ab], { ramp: RAMP.bee, base: 3.3, gain: 2.2, thick: 18 * s, litOutline: "#5A3A04" });
    // stripes: recolour the shaded yellow to the ink ramp inside curved bands (keeps the volume shading)
    const idx = new Map(RAMP.bee.map((h, i) => [h, i]));
    for (const [s0, s1] of [[54, 66], [78, 89]]) {
      for (let Y = R(y + (s0 - 8) * s); Y <= R(y + (s1 + 10) * s); Y++) for (let X = R(x - 46 * s); X <= R(x + 46 * s); X++) {
        const u = (X - x) / (44 * s), yy = (Y - y) / s - 6 * (1 - u * u) - ((X - x) / s) * Math.tan(tilt);
        if (yy < s0 || yy > s1) continue; const col = g.get(X, Y), hx = "#" + col.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(), i = idx.get(hx);
        if (i !== undefined) g.px(X, Y, STRIPE[i]);
      }
    }
    const fz = (cx, cy, rx, ry, n, amp, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 6.283, k = 1 + amp * (i % 2 ? 1 : -0.4) * (0.7 + 0.3 * Math.sin(i * 1.7 + ph)); out.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return out; };
    blob(g, [poly(fz(x, y + 34 * s, 38 * s, 16 * s, 44, 0.07, 1))], { ramp: FUZZ, base: 4.4, gain: 1.8, thick: 8 * s, litOutline: "#6A4808" });
    blob(g, [poly(fz(x, y, 46 * s, 42 * s, 72, 0.025, 0))], { ramp: RAMP.bee, base: 3.9, gain: 2.0, thick: 20 * s, litOutline: "#6A4808" });
    for (const [dx, h, lean] of [[-6, 7, -3], [0, 10, 1], [6, 7, 4]]) { const p0 = P(dx, -40), p1 = P(dx + lean, -40 - h); blob(g, [tube([p0, [(p0[0] + p1[0]) / 2 + lean * 0.3 * s, (p0[1] + p1[1]) / 2], p1], Math.max(1.2, 2.6 * s), Math.max(0.8, 1.2 * s))], { ramp: RAMP.bee, base: 4.6, thick: 2, litOutline: "#6A4808" }); }
  });
}

/**
 * Chubby honeybee facing the camera. (x, y) = head centre (screen). o: s scale, tilt (rad), look [dx, dy], blink 0..1,
 * open 0..1 (smile → "o"), flap (wing phase in cycles), amp (wing swing, 1 = normal), a (dissolve), antSway (px),
 * worry 0..1 (brows up + strained mouth), sweat 0..1 (a little drop at the temple).
 */
export function drawBee(c, x, y, o = {}) {
  const s = o.s ?? 1, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); dx *= s; dy = dy * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
  const g = fade(c, a);
  // wings (behind): fast flutter with a faint ghost of the previous position
  const ph = (o.flap ?? 0) * 2 * Math.PI, amp = o.amp ?? 1, flap = Math.sin(ph), flapPrev = Math.sin(ph - 1.18);
  for (const [k, ghost, dens] of [[flapPrev, 1, 0.34], [flap, 0, 0.8]]) for (const side of [-1, 1]) for (const [ln, base, w] of [[62, -0.58, 0.36], [42, -0.02, 0.4]]) {
    const th = base - k * 0.3 * amp, ang = (side > 0 ? th : Math.PI - th) + tilt, root = P(side * 30, 30), L = ln * s;
    const dx = Math.cos(ang), dy = Math.sin(ang), wing = ell(root[0] + dx * L * 0.5, root[1] + dy * L * 0.5, L * 0.5, L * w, ang), q = fade(c, a * dens);
    q.poly(wing, null, (X, Y) => (((X + Y) & 1) === 0 ? "#F4FCFF" : ((X ^ Y) & 3) === 1 ? "#B8DCFA" : null));
    if (ghost) continue;
    for (let i = 0; i < wing.length; i++) { const p = wing[i], r = wing[(i + 1) % wing.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), "#4E7EB4"); }
    q.line(R(root[0] + dx * 4 * s), R(root[1] + dy * 4 * s), R(root[0] + dx * L * 0.78), R(root[1] + dy * L * 0.78), "#A8CCEA");
  }
  body(s, tilt).blit(c, x, y, { a });
  // antennae with round tips (sway lags behind the hover)
  const sway = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const r0 = P(sd * 12, -38), mid = P(sd * 20 + sway * 0.4, -64), tip = P(sd * 34 + sway, -74), w = Math.max(1, 2.2 * s);
    if (s >= 0.45) { blob(c, [tube(bez(r0, mid, tip, 8), w, Math.max(0.8, 1.8 * s))], { ramp: RAMP.ink, thick: 2, a }); blob(c, [ell(tip[0], tip[1], Math.max(2, 5 * s), Math.max(2, 5 * s))], { ramp: RAMP.ink, thick: 4, a, litOutline: "#302C50" }); g.px(R(tip[0] - 2 * s), R(tip[1] - 2 * s), "#8A86B4"); }
    else { const pts = bez(r0, mid, tip, 6); for (let i = 1; i < pts.length; i++) g.line(R(pts[i - 1][0]), R(pts[i - 1][1]), R(pts[i][0]), R(pts[i][1]), "#140E1C"); g.rect(R(tip[0]) - 1, R(tip[1]) - 1, 3, 3, "#140E1C"); }
  }
  // face
  const look = o.look ?? [0, 0], blink = o.blink ?? 0, worry = o.worry ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = P(sd * 19, 1); eye(c, ex, ey, 13 * s, { ry: 15 * s, iris: BEE_EYE, pupil: "bead", look, blink, lid: RAMP.bee[4], a }); }
  if (worry > 0.05) for (const sd of [-1, 1]) {                                            // brows lift toward the middle
    const q = fade(c, a * Math.min(1, worry * 1.5)), [bx, by] = P(sd * 19, -19 - 2 * worry);
    for (let i = -5; i <= 5; i++) { const yy = by + (sd * i < 0 ? -1 : 1) * Math.abs(i) * 0.3 * worry; q.px(R(bx + i * s), R(yy), "#6A4808"); q.px(R(bx + i * s), R(yy) + 1, "#A07010"); }
  }
  { const [bx1, by1] = P(-32, 20), [bx2, by2] = P(32, 20); blush(c, bx1, by1, 8 * s, 4 * s, "#F0708E", a); blush(c, bx2, by2, 8 * s, 4 * s, "#F0708E", a); }
  const [mx, my] = P(0, 21);
  const wk = Math.min(1, Math.max(0, (worry - 0.3) / 0.3)), wk2 = wk * wk * (3 - 2 * wk);          // smile dissolves into a strained wavy mouth
  if (wk2 < 1) smile(c, mx, my, Math.max(2, 5 * s), { open: o.open ?? 0.35, a: a * (1 - wk2) });
  if (wk2 > 0) { const q = fade(c, a * wk2), w = R(5 * s); for (let i = -w; i <= w; i++) q.px(mx + i, R(my + 2 + Math.sin(i * 1.4) * 0.8), "#07060E"); }
  const sw = o.sweat ?? 0;
  if (sw > 0.02) { const [dx, dy] = P(40, -26), q = fade(c, a * sw); q.poly([[dx, dy - 6 * s], [dx + 3.4 * s, dy + 1], [dx, dy + 4 * s], [dx - 3.4 * s, dy + 1]], "#BFEFFF"); q.px(R(dx - 1), R(dy), "#FFFFFF"); q.line(R(dx + 3 * s), R(dy + 1), R(dx), R(dy + 4 * s), "#5AB4D0"); }
}

/** Tiny worker bee (8 px), flying; `up` = wing up/down frame (bool), dir ±1. */
export function miniBee(c, x, y, up, dir = 1, a = 1) {
  const g = fade(c, a); x = R(x); y = R(y);
  g.rect(x - 2, y - 4 + (up ? -1 : 0), 3, 3, "#EAF6FF"); g.rect(x + 1, y - 4 + (up ? -1 : 0), 3, 3, "#CFE6FA");
  g.rect(x - 4, y - 2, 9, 5, "#1A1020"); g.rect(x - 3, y - 1, 7, 3, "#F4C22A"); g.rect(x - 1, y - 1, 1, 3, "#1A1020"); g.rect(x + 1, y - 1, 1, 3, "#1A1020");
  g.px(x + 3 * dir, y - 1, "#1A1020"); g.px(x + 3 * dir, y, "#F4C22A"); g.px(x - 5 * dir, y, "#1A1020");
}
/** Sitting bee for piles (14 px): front-facing round body with glossy eyes, blush, two stripes and fluttering wings. */
export function pileBee(c, x, y, up, a = 1, hue = 0) {
  const g = fade(c, a); x = R(x); y = R(y);
  const Y0 = hue ? "#F0B820" : "#F8CC34", Y1 = hue ? "#C88A14" : "#D8A222", O = "#1A1020";
  const wy = y - 10 + (up ? -1 : 0);
  g.rrect(x - 8, wy, 5, 6, "#8AB4DA", 2); g.rrect(x - 7, wy + 1, 3, 4, "#EAF6FF", 1); g.rrect(x + 4, wy, 5, 6, "#8AB4DA", 2); g.rrect(x + 5, wy + 1, 3, 4, "#D8ECFC", 1);
  g.rrect(x - 7, y - 6, 15, 13, O, 2); g.rrect(x - 6, y - 5, 13, 11, Y0, 2); g.rect(x - 5, y - 5, 11, 1, "#FCE47E");
  g.rect(x - 6, y + 2, 13, 2, O); g.rect(x - 5, y + 5, 11, 1, O); g.rect(x - 6, y + 4, 13, 1, Y1);
  g.rect(x - 4, y - 3, 2, 3, O); g.rect(x + 3, y - 3, 2, 3, O); g.px(x - 4, y - 3, "#FFFFFF"); g.px(x + 3, y - 3, "#FFFFFF");
  g.px(x - 6, y, "#F07090"); g.px(x + 6, y, "#F07090"); g.px(x, y, O);
  g.px(x - 3, y - 7, O); g.px(x - 4, y - 8, O); g.px(x + 3, y - 7, O); g.px(x + 4, y - 8, O);
}
export { mix, bayer };
