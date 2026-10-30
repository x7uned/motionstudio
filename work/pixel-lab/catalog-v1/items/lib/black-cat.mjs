// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/cat-art.mjs (the series' black cat).
// Changes: import paths; the closed «w» mouth and the open mouth now crossfade over open 0.15–0.45 (it was a one-frame
// swap at 0.3); smooth and puffed fur crossfade through complementary gates (the smooth parts used to vanish in one frame
// at puff 0.999); mid-air pose kept but unused by the catalog.
// The series' black cat (the user's reference: a black cat sitting front-on under a full moon), drawn once and shared
// by the roofs levels of both films (identical copies). A chibi rig of cached parts: curled tail, round pear body with
// haunches and chubby front legs, a wide head with cheek fluff and big ears, a live face (big amber eyes with two
// highlights, pink nose, "w" mouth, dithered blush, whiskers). Poses: sitting (breath, blink, ear twitch, tail sway,
// look, worry, wide eyes, puffed-up fur) and mid-air (front half / back half rotate separately: the righting twist).
// Everything is anchor-relative: (x, y) = screen point on the ground between the front paws. Nothing pops: parts that
// swap (sit ↔ air, normal ↔ puffed) are dissolved with `a`.
import { blob, flat, ell, tube, bez, eye, blush, mouthW, nose, RAMP, fade, mix, rnd, clamp01, bayer } from "./cute.mjs";
import { spriteCache, xf } from "./roofs-kit.mjs";

const R = Math.round;
const RAMPC = RAMP.black, LIT = "#9A8CD8", EAR = "#E58AA8", EAR2 = "#C8608A", WHISK = "#B8B0E0";
const cache = spriteCache(160);
const opt = (o = {}) => ({ ramp: RAMPC, litOutline: LIT, ...o });

// ---------------------------------------------------------------- shapes (anchor-relative, unscaled units)
/** Ellipse polygon; with `fur` > 0 the rim alternates out by `fur` px (fur standing up). */
function ellF(cx, cy, rx, ry, fur = 0, seed = 0, rot = 0) {
  if (fur <= 0) return ell(cx, cy, rx, ry, rot);
  const tufts = Math.max(7, R((Math.PI * (rx + ry)) / 15)), n = tufts * 4, c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) {
    const j = i % 4, tk = Math.floor(i / 4), amp = fur * (0.55 + 0.7 * rnd(seed * 31 + tk)), k = j === 2 ? amp : j === 1 || j === 3 ? amp * 0.35 : 0;
    const a = (2 * Math.PI * (i + (j === 2 ? 0.35 * (rnd(seed + tk * 7) - 0.5) : 0))) / n, x = Math.cos(a) * (rx + k), y = Math.sin(a) * (ry + k);
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
/** Tube along a polyline with optional fur spikes along both sides (bottle-brush tail). */
function tubeF(pts, r0, r1, fur = 0, seed = 0) {
  if (fur <= 0) return tube(pts, r0, r1);
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = r0 + (r1 - r0) * (i / (n - 1));
    const j = i % 3, kl = r + (j === 1 ? fur * (0.6 + 0.6 * rnd(seed + i)) : 0), kr = r + (j === 2 ? fur * (0.6 + 0.6 * rnd(seed + i + 50)) : 0);
    L.push([pts[i][0] - (dy / d) * kl, pts[i][1] + (dx / d) * kl]); Rr.push([pts[i][0] + (dy / d) * kr, pts[i][1] - (dx / d) * kr]);
  }
  const tip = pts[n - 1], a = pts[n - 2], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]), cap = [];
  for (let k = 1; k < 6; k++) { const t = ang - Math.PI / 2 + (Math.PI * k) / 6, rr = r1 + fur * (k % 2 ? 0.9 : 0.3); cap.push([tip[0] + Math.cos(t) * rr, tip[1] + Math.sin(t) * rr]); }
  return [...L, ...cap.reverse(), ...Rr.reverse()];
}
const rot = (p, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; };
const scaleP = (poly, S) => poly.map(([x, y]) => [x * S, y * S]);

// tail curled up on the left, hooked tip; sway bends it progressively from the base
function tailPts(sway, side = -1) {
  const B = [58 * side, -22];
  const pts = [...bez(B, [128 * side, -14], [124 * side, -92], 22), ...bez([124 * side, -92], [120 * side, -142], [90 * side, -148], 14).slice(1)];
  return pts.map((p, i) => { const f = (i / (pts.length - 1)) ** 1.4; return rot(p, B[0], B[1], sway * f * 1.25); });
}

// ---------------------------------------------------------------- cached parts
function tailSprite(S, sway, puff, side) {
  const q = R(sway * 60), key = `tail|${S}|${q}|${puff}|${side}`;
  return cache(key, R(260 * S), R(250 * S), R(170 * S), R(220 * S), (g) => {
    const pts = tailPts(q / 60, side).map(([x, y]) => [x * S, y * S]);
    blob(g, [tubeF(pts, (puff ? 18 : 13) * S, (puff ? 14 : 9) * S, puff ? 6 * S : 0, 5)], opt({ thick: 6 * S }));
  });
}
function bodySprite(S, puff, squash) {
  const sq = R(squash * 20) / 20, key = `body|${S}|${puff}|${sq}`;
  return cache(key, R(260 * S), R(240 * S), R(130 * S), R(222 * S), (g) => {
    const f = puff ? 7 : 0, k = 1 - sq * 0.16, w = 1 + sq * 0.1;   // squash: lower and wider
    const P = (poly) => poly.map(([x, y]) => [x * S * w, y * S * k]);
    blob(g, [P(ellF(-82, -8, 19, 9)), P(ellF(82, -8, 19, 9))], opt({ thick: 6 * S, base: 2.6 }));
    blob(g, [P(ellF(0, -92, 66, 78, f, 1)), P(ellF(0, -42, 80, 44, f, 2)), P(ellF(-58, -46, 36, 42, f, 3)), P(ellF(58, -46, 36, 42, f, 4))], opt({ thick: 34 * S, base: 1.9, gain: 2.4 }));
    // chest fluff: a soft lighter tuft under the chin
    for (let i = -3; i <= 3; i++) { const x = R(i * 7 * S * w), y = R((-150 + Math.abs(i) * 3) * S * k); g.px(x, y, RAMPC[5]); g.px(x, y + 1, RAMPC[4]); g.px(x + 1, y + 2, RAMPC[4]); }
    for (const s of [-1, 1]) {
      // front leg: a lit stripe and soft contour lines that fade out up the chest (no hard pillar edges)
      for (let yy = -104; yy <= -16; yy++) {
        const u = (yy + 104) / 88, fadeIn = Math.min(1, u * 2.2), X = (x) => R(x * S * w), Y = R(yy * S * k);
        const xo = (41 - 3 * (1 - u)) * s, xi = 7 * s;
        if (fadeIn > bayer(X(xo), Y)) { g.px(X(xo), Y, RAMPC[1]); g.px(X(xo) - s, Y, RAMPC[2]); }
        if (u > 0.3 && fadeIn > bayer(X(xi), Y) + 0.2) g.px(X(xi), Y, RAMPC[1]);
        const a0 = Math.min(X(xi), X(xo)) + 1, a1 = Math.max(X(xi), X(xo)) - 1;
        for (let xx = a0; xx <= a1; xx++) { const v = (xx - a0) / Math.max(1, a1 - a0), lit = s < 0 ? 1 - v : 1 - v * 0.7; if (fadeIn * 0.85 > bayer(xx, Y) + 0.05) g.px(xx, Y, lit > 0.72 && u > 0.12 ? RAMPC[4] : RAMPC[3]); }
      }
      blob(g, [P(ell(25 * s, -11, 21, 12))], opt({ thick: 8 * S, base: 2.6 }));
      for (const dx of [-6, 6]) { const x = R((25 * s + dx) * S * w); for (let j = 0; j < 3; j++) g.px(x, R(-5 * S * k) - j, RAMPC[0]); }
    }
  });
}
/** Head + ears around the head centre; rotation `ang` (radians) for the mid-air roll. */
function headSprite(S, puff, earL, earR, ang = 0) {
  const qa = R((ang * 180) / Math.PI / 3) * 3, key = `head|${S}|${puff}|${R(earL * 40)}|${R(earR * 40)}|${qa}`;
  return cache(key, R(300 * S), R(300 * S), R(150 * S), R(150 * S), (g) => {
    const A = (qa * Math.PI) / 180, T = (poly) => poly.map((p) => rot([p[0] * S, p[1] * S], 0, 0, A));
    const f = puff ? 5 : 0;
    for (const s of [-1, 1]) {
      const e = s * ((s < 0 ? earL : earR) + (puff ? 0.28 : 0)), piv = [52 * s, -40];
      const ear = [[-84, -14], [-82, -60], [-76, -96], [-68, -99], [-40, -74], [-20, -52]].map(([x, y]) => rot([s < 0 ? x : -x, y], piv[0], piv[1], e));
      const inner = [[-72, -28], [-70, -82], [-38, -58]].map(([x, y]) => rot([s < 0 ? x : -x, y], piv[0], piv[1], e));
      const earP = ear;
      blob(g, [T(earP)], opt({ thick: 10 * S }));
      flat(g, [T(inner)], EAR);
      // a few fur wisps in the inner ear
      const w0 = T([rot([s < 0 ? -58 : 58, -40], piv[0], piv[1], e)])[0], w1 = T([rot([s < 0 ? -62 : 62, -60], piv[0], piv[1], e)])[0];
      g.line(R(w0[0]), R(w0[1]), R(w1[0]), R(w1[1]), EAR2);
    }
    const head = [ellF(0, 0, 84, 66, f, 7), [[-76, 6], [-101, 26], [-70, 32]], [[-64, 28], [-88, 46], [-52, 44]], [[76, 6], [101, 26], [70, 32]], [[64, 28], [88, 46], [52, 44]]];
    blob(g, head.map(T), opt({ thick: 24 * S, base: 2.3 }));
  });
}
/** Mid-air halves around the pivot (head centre): back = rump, hind legs, tail; front = chest and front legs. */
function airSprite(S, part, ang) {
  const qa = R((ang * 180) / Math.PI / 3) * 3, key = `air|${S}|${part}|${qa}`;
  return cache(key, R(360 * S), R(360 * S), R(180 * S), R(180 * S), (g) => {
    const A = (qa * Math.PI) / 180, T = (poly) => poly.map((p) => rot([p[0] * S, p[1] * S], 0, 0, A));
    if (part === "back") {
      blob(g, [T(tube([...bez([26, 34], [118, 22], [116, -54], 10), ...bez([116, -54], [114, -96], [86, -104], 6).slice(1)], 13, 9))], opt({ thick: 6 * S }));
      for (const s of [-1, 1]) blob(g, [T(tube([[40 * s, 58], [70 * s, 86], [86 * s, 106]], 15, 12)), T(ell(90 * s, 110, 17, 10, 0.5 * s))], opt({ thick: 8 * S, base: 2.4 }));
      blob(g, [T(ell(0, 42, 62, 46))], opt({ thick: 24 * S, base: 2.2 }));
    } else {
      blob(g, [T(ell(0, 52, 52, 42))], opt({ thick: 20 * S, base: 2.6 }));
      for (const s of [-1, 1]) blob(g, [T(tube([[30 * s, 60], [52 * s, 92], [64 * s, 116]], 16, 14)), T(ell(66 * s, 121, 19, 11, 0.3 * s))], opt({ thick: 9 * S, base: 2.8 }));
    }
  });
}

// ---------------------------------------------------------------- face (live, rotated with the head)
function face(c, hx, hy, S, o, ang = 0) {
  const a = o.a ?? 1, g = fade(c, a), P = (x, y) => { const p = rot([x * S, y * S], 0, 0, ang); return [hx + p[0], hy + p[1]]; };
  const wide = clamp01(o.wide ?? 0), er = (20 + wide * 3) * S, ery = (22 + wide * 4) * S;
  const look = o.look ?? [0, 0];
  for (const s of [-1, 1]) { const [ex, ey] = P(34 * s, -2 - wide * 2); eye(c, ex, ey, er, { iris: RAMP.amber, pupil: o.pupil ?? "round", ry: ery, look, blink: o.blink ?? 0, a, lid: RAMPC[3] }); }
  // worried brows (little slanted dashes above the eyes)
  const worry = clamp01(o.worry ?? 0);
  if (worry > 0.05) { const gw = fade(c, a * worry); for (const s of [-1, 1]) { const p0 = P(34 * s - 12 * s, -30), p1 = P(34 * s + 8 * s, -36); gw.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), LIT); gw.line(R(p0[0]), R(p0[1]) + 1, R(p1[0]), R(p1[1]) + 1, RAMPC[5]); } }
  for (const s of [-1, 1]) { const [bx, by] = P(54 * s, 26); blush(c, bx, by, 14 * S, 6 * S, undefined, a); }
  const [nx, ny] = P(0, 24);
  if (Math.abs(ang) < 0.2) { nose(c, nx, ny, 5 * S, "#F09AB8", a); }
  else { const tri = [P(-5, 23), P(5, 23), P(0, 29)]; g.poly(tri, "#F09AB8"); }
  const mo = clamp01(o.open ?? 0), km = Math.abs(ang) < 0.2 ? Math.min(1, Math.max(0, (mo - 0.15) / 0.3)) : 1, kmo = km * km * (3 - 2 * km);
  if (kmo < 1) mouthW(c, nx, ny + 7 * S, "#07060E", R(3 * S), a * (1 - kmo));
  if (kmo > 0) { const go = fade(c, a * kmo), [mx, my] = P(0, 36); const r = (2 + mo * 3) * S; for (let Y = R(my - r * 1.2); Y <= R(my + r * 1.2); Y++) for (let X = R(mx - r); X <= R(mx + r); X++) { const d = ((X - mx) / r) ** 2 + ((Y - my) / (r * 1.2)) ** 2; if (d <= 1) go.px(X, Y, d > 0.55 ? "#07060E" : Y > my ? "#F07090" : "#3A0A18"); } }
  const wc = o.whisker ?? WHISK;
  for (const s of [-1, 1]) for (const [y0, x1, y1] of [[22, 106, 14], [28, 108, 30]]) { const p0 = P(58 * s, y0), p1 = P(x1 * s, y1); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), wc); }
}

// ---------------------------------------------------------------- public
export const CAT_HEAD_Y = 222;   // head centre above the anchor (unscaled), sitting
/**
 * Sitting cat. o: { s scale, a alpha, t (idle clock), look [dx, dy], blink 0..1, worry 0..1, wide 0..1, open 0..1 (mouth),
 * puff 0..1 (fur up: dissolves the puffed parts over the smooth ones), earL/earR (extra ear tilt), sway (tail),
 * squash 0..1 (crouch), headDy (extra head lift), bodyA (body/tail alpha, for the land → sit transition), side (tail side −1/1) }.
 */
export function drawCat(c, x, y, o = {}) {
  const S = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return;
  const t = o.t ?? 0, puff = clamp01(o.puff ?? 0), side = o.side ?? -1, sq = clamp01(o.squash ?? 0);
  const breath = Math.sin(t * 2 * Math.PI / 3.1), bob = R(breath * 1.3 * S);
  const sway = o.sway ?? 0.1 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 0.47 + 1);
  const twitch = (ph) => { const p = ((t + ph) % 5.3 + 5.3) % 5.3; return p < 0.45 ? Math.sin((p / 0.45) * Math.PI) * 0.16 : 0; };
  const earL = (o.earL ?? 0) + twitch(1.7), earR = (o.earR ?? 0) + twitch(4.2);
  const bodyA = a * (o.bodyA ?? 1);
  // tail and body (smooth, then the puffed version dissolved over them)
  // catalog-v1: smooth and puffed fur crossfade through complementary Bayer gates (smooth where b ≥ puff, puffed where b < puff)
  for (const pf of [0, 1]) { if (pf ? puff <= 0.001 : puff >= 0.999) continue; tailSprite(S, R(sway * 60) / 60, pf, side).blit(c, R(x), R(y), pf ? { a: bodyA * puff } : { a: bodyA, lo: puff }); }
  for (const pf of [0, 1]) { if (pf ? puff <= 0.001 : puff >= 0.999) continue; bodySprite(S, pf, sq).blit(c, R(x), R(y), pf ? { a: bodyA * puff } : { a: bodyA, lo: puff }); }
  // head (bobs with the breath, sinks with the crouch)
  const hx = R(x), hy = R(y - (CAT_HEAD_Y - sq * 30) * S + bob - (o.headDy ?? 0));
  for (const pf of [0, 1]) { if (pf ? puff <= 0.001 : puff >= 0.999) continue; headSprite(S, pf, earL + (o.earsBack ?? 0), earR + (o.earsBack ?? 0)).blit(c, hx, hy, pf ? { a: a * puff } : { a, lo: puff }); }
  face(c, hx, hy, S, { ...o, a });
  return { hx, hy };
}
/**
 * Mid-air cat seen head-on (spine toward the camera): pivot (x, y) = head centre. o: { s, a, front (rad), back (rad),
 * look, blink, wide, open, legsA, headA }. front/back are the roll angles of the two halves (0 = upright, π = upside down).
 */
export function drawCatAir(c, x, y, o = {}) {
  const S = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return;
  const fA = o.front ?? 0, bA = o.back ?? 0, la = a * (o.legsA ?? 1);
  airSprite(S, "back", bA).blit(c, R(x), R(y), { a: la });
  airSprite(S, "front", fA).blit(c, R(x), R(y), { a: la });
  const ha = a * (o.headA ?? 1); if (ha <= 0) return;
  headSprite(S, 0, 0, 0, fA).blit(c, R(x), R(y), { a: ha });
  const qa = (R((fA * 180) / Math.PI / 3) * 3 * Math.PI) / 180;
  face(c, R(x), R(y), S, { wide: o.wide ?? 0.6, open: o.open ?? 0.5, look: o.look ?? [0, 0], blink: o.blink ?? 0, a: ha }, qa);
}
export const CAT_AIR_FEET = 132;   // pivot → paw soles (unscaled), front legs down
/** Build the cached parts of a pose ahead of time (one part per call: k = 0 body, 1 head, 2 tail), so the first frame of a
 *  pose change (e.g. the fur puffing up) does not pay for all of them at once. */
export function warmCat(k, o = {}) {
  const S = o.s ?? 1, puff = o.puff ? 1 : 0;
  if (k === 0) bodySprite(S, puff, 0); else if (k === 1) headSprite(S, puff, (o.earsBack ?? 0), (o.earsBack ?? 0)); else tailSprite(S, R((o.sway ?? 0) * 60) / 60, puff, o.side ?? -1);
}
