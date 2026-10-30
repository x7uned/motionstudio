// The series' house mouse, drawn once and shared by the field (weight film) and barn (heart film) levels (identical
// copies). Grey-brown chibi: big round ears with pink insides, a round head with a cream muzzle, glossy bead eyes with
// two highlights, pink button nose, tiny buck teeth, whiskers, blush, cream belly, pink hands, feet and a long pink
// tail. Poses: sitting front-on (breath, blink, ear wiggle, tail sway, look, hands at the chest or up, happy eyes,
// ears spread like a parachute, squash) and a side-view walk (facing right or left). Anchor (x, y) = the ground point
// under the feet (centre). Nothing pops: callers dissolve between poses with `a`.
import { blob, flat, ell, tube, bez, eye, blush, RAMP, fade, mix, rnd, clamp01, bayer } from "../cute.mjs";
import { spriteCache } from "./roofs-kit.mjs";

const R = Math.round;
export const RAMPM = ["#1A1312", "#33272A", "#4E3F40", "#6C5A58", "#8C7872", "#AA968C", "#C8B4A6", "#E4D4C6"];
const OUT = "#1A1210", LITO = "#CDBCB0", CREAM = "#EEDFCB", CREAM2 = "#D6C2AA", PINK = "#F4AEBE", PINK2 = "#D97C96", PINKO = "#7A3448";
const IRIS = ["#08060C", "#140F1E", "#241A34", "#4E3E70"];
const cache = spriteCache(96);
const opt = (o = {}) => ({ ramp: RAMPM, outline: OUT, litOutline: LITO, ...o });
const rot = (p, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; };
/** Soft flat patch: ellipse filled with col, dithered toward the rim. */
function patch(g, cx, cy, rx, ry, col, edge = 0.25) {
  for (let y = R(cy - ry); y <= R(cy + ry); y++) for (let x = R(cx - rx); x <= R(cx + rx); x++) { const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (d <= 1 && (d < 1 - edge || (1 - d) / edge > bayer(x, y))) g.px(x, y, col); }
}
function pinkBlob(g, poly, S) { blob(g, [poly], { ramp: ["#4A1A28", PINKO, "#A84E68", PINK2, "#EB96AA", PINK, "#FAC8D2", "#FFE4EA"], outline: PINKO, litOutline: "#FFD8E0", thick: 5 * S, base: 4.4, gain: 1.4, slope: 0.6 }); }

// ---------------------------------------------------------------- sitting (front)
function tailPts(sway) {
  const B = [30, -12], pts = [...bez(B, [82, -2], [98, -40], 14), ...bez([98, -40], [104, -70], [80, -66], 8).slice(1)];
  return pts.map((p, i) => rot(p, B[0], B[1], sway * (i / (pts.length - 1)) ** 1.3));
}
function bodySprite(S, sway, arms, dangle, squash) {
  const q = R(sway * 50), qa = R(arms * 10), qd = R(dangle * 10), qs = R(squash * 20), key = `mb|${S}|${q}|${qa}|${qd}|${qs}`;
  return cache(key, R(260 * S), R(200 * S), R(130 * S), R(150 * S), (g) => {
    const k = 1 - (qs / 20) * 0.14, w = 1 + (qs / 20) * 0.1, P = (poly) => poly.map(([x, y]) => [x * S * w, y * S * k]);
    // tail (behind)
    const tp = tailPts(q / 50).map(([x, y]) => [x * S * w, y * S * k]);
    pinkBlob(g, tube(tp, 3.6 * S, 2.2 * S), S);
    // feet (dangling when floating)
    const d = qd / 10;
    for (const s of [-1, 1]) pinkBlob(g, P(ell(20 * s, -4 + d * 8, 14 - d * 5, 6 + d * 4, d * 0.5 * s)), S);
    blob(g, [P(ell(0, -40, 40, 44)), P(ell(0, -24, 46, 26))], opt({ thick: 22 * S, base: 2.6, gain: 2.6 }));
    patch(g, 0, -32 * S * k, 26 * S * w, 27 * S * k, CREAM, 0.3);
    patch(g, 0, -24 * S * k, 22 * S * w, 16 * S * k, CREAM2, 0.5);
    for (const s of [-1, 1]) for (const dx of [-5, 0, 5]) { const x = R((20 * s + dx) * S * w), y = R((-2 + d * 9) * S * k); g.px(x, y, PINKO); }
    // arms + hands: at the chest (0) → raised beside the head (1)
    const a = qa / 10;
    for (const s of [-1, 1]) {
      const sh = [30 * s, -50], hand = [(11 + a * 45) * s, -49 - a * 56], mid = [(25 + a * 24) * s, -42 - a * 32];
      blob(g, [P(tube([sh, mid, hand], 8, 6))], opt({ thick: 5 * S, base: 2.8 }));
      pinkBlob(g, P(ell(hand[0], hand[1], 7, 6)), S);
    }
  });
}
function headSprite(S, earL, earR) {
  const key = `mh|${S}|${R(earL * 40)}|${R(earR * 40)}`;
  return cache(key, R(220 * S), R(170 * S), R(110 * S), R(110 * S), (g) => {
    const P = (poly) => poly.map(([x, y]) => [x * S, y * S]);
    for (const s of [-1, 1]) {
      const e = s * (s < 0 ? earL : earR), piv = [26 * s, -18];
      const c0 = rot([44 * s, -40], piv[0], piv[1], e), c1 = rot([41 * s, -37], piv[0], piv[1], e);
      blob(g, [P(ell(c0[0], c0[1], 33, 31))], opt({ thick: 10 * S, base: 2.8 }));
      patch(g, c1[0] * S, c1[1] * S, 22 * S, 20 * S, PINK, 0.2);
      patch(g, c1[0] * S + 3 * s * S, c1[1] * S + 6 * S, 13 * S, 11 * S, PINK2, 0.6);
    }
    blob(g, [P(ell(0, 0, 48, 40)), P(ell(0, 12, 53, 30))], opt({ thick: 20 * S, base: 2.9, gain: 2.4 }));
    patch(g, 0, 20 * S, 19 * S, 12 * S, CREAM, 0.35);
  });
}
function mouseFace(c, hx, hy, S, o) {
  const a = o.a ?? 1, g = fade(c, a), P = (x, y) => [hx + x * S, hy + y * S], look = o.look ?? [0, 0], happy = clamp01(o.happy ?? 0);
  for (const s of [-1, 1]) {
    const [ex, ey] = P(20 * s, -2);
    if (happy < 0.5) eye(c, ex, ey, 12 * S, { iris: IRIS, pupil: "bead", ry: 14 * S, look, blink: Math.max(o.blink ?? 0, happy * 1.6), a, lid: RAMPM[4], outline: OUT });
    else for (let i = -8; i <= 8; i++) { const u = i / 8, X = R(ex + i * S), Y = R(ey + 2 * S - 5 * S * (1 - u * u)); g.px(X, Y, OUT); g.px(X, Y + 1, OUT); }
  }
  for (const s of [-1, 1]) { const [bx, by] = P(31 * s, 16); blush(c, bx, by, 9 * S, 4 * S, undefined, a); }
  // nose: a pink button with a shine
  const sn = o.sniff ?? 0, [nx, ny0] = P(0, 14), ny = ny0 + sn, nr = 4.5 * S;
  for (let Y = R(ny - nr); Y <= R(ny + nr * 0.8); Y++) for (let X = R(nx - nr * 1.2); X <= R(nx + nr * 1.2); X++) { const d = ((X + 0.5 - nx) / (nr * 1.2)) ** 2 + ((Y + 0.5 - ny) / nr) ** 2; if (d <= 1) g.px(X, Y, d > 0.62 ? PINKO : Y < ny - nr * 0.2 ? "#FFB8C8" : "#F27A9A"); }
  g.px(R(nx - nr * 0.4), R(ny - nr * 0.45), "#FFFFFF");
  // mouth: tiny "w" (or a little open smile) and two buck teeth
  const [mx, my] = P(0, 22), open = clamp01(o.open ?? 0);
  if (open > 0.2) { const r = (2 + open * 3) * S; for (let Y = R(my); Y <= R(my + r * 1.4); Y++) for (let X = R(mx - r); X <= R(mx + r); X++) { const d = ((X + 0.5 - mx) / r) ** 2 + ((Y + 0.5 - my) / (r * 1.4)) ** 2; if (d <= 1) g.px(X, Y, d > 0.55 ? OUT : Y > my + r * 0.8 ? "#F07090" : "#4A1424"); } g.rect(R(mx) - 1, R(my), 3, R(2 * S), "#FFFFFF"); }
  else {
    for (let i = 1; i <= 3; i++) { g.px(R(mx - i * S * 0.9), R(my + (i < 3 ? 1 : 0)), OUT); g.px(R(mx + i * S * 0.9), R(my + (i < 3 ? 1 : 0)), OUT); }
    g.px(R(mx), R(my), OUT); g.rect(R(mx) - 2, R(my) + 1, 2, R(3 * S), "#FFFFFF"); g.rect(R(mx) + 1, R(my) + 1, 2, R(3 * S), "#FFFFFF"); g.px(R(mx), R(my) + 2, OUT);
  }
  const wc = o.whisker ?? "#F2EAF0";
  for (const s of [-1, 1]) for (const [y0, x1, y1] of [[14, 60, 6], [18, 62, 18], [22, 56, 30]]) { const p0 = P(18 * s, y0), p1 = P(x1 * s, y1); g.line(R(p0[0]), R(p0[1] + sn), R(p1[0]), R(p1[1] + sn * 2), wc); }
}
export const MOUSE_HEAD_Y = 100;
/**
 * Sitting / floating mouse, front-on. o: { s, a, t, look, blink, happy 0..1 (^ ^ eyes), open (mouth), arms 0..1 (raised),
 * ears 0..1 (spread out like a parachute), dangle 0..1 (feet hang down), squash 0..1, sway (tail), headDy, shake (px),
 * sniff (nose/whisker offset in px) }.
 */
export function drawMouse(c, x, y, o = {}) {
  const S = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return;
  const t = o.t ?? 0, breath = Math.sin(t * 2 * Math.PI / 1.4), bob = R(breath * 1.0 * S);
  const sway = o.sway ?? 0.18 * Math.sin(t * 1.9) + 0.08 * Math.sin(t * 0.7 + 2);
  const wig = (ph) => { const p = ((t + ph) % 3.9 + 3.9) % 3.9; return p < 0.35 ? Math.sin((p / 0.35) * Math.PI * 2) * 0.1 : 0; };
  const spread = clamp01(o.ears ?? 0) * 0.55, earL = spread + wig(0.6), earR = spread + wig(2.3);
  const X = R(x + (o.shake ?? 0)), Y = R(y);
  bodySprite(S, R(sway * 50) / 50, clamp01(o.arms ?? 0), clamp01(o.dangle ?? 0), clamp01(o.squash ?? 0)).blit(c, X, Y, { a });
  const sq = clamp01(o.squash ?? 0), hx = X, hy = R(Y - (MOUSE_HEAD_Y - sq * 12) * S + bob - (o.headDy ?? 0));
  headSprite(S, R(earL * 40) / 40, R(earR * 40) / 40).blit(c, hx, hy, { a });
  mouseFace(c, hx, hy, S, { ...o, a });
  return { hx, hy };
}

// ---------------------------------------------------------------- walking (side view)
function walkSprite(S, ph, dir) {
  const q = ((R(ph * 8) % 8) + 8) % 8, key = `mw|${S}|${q}|${dir}`;
  return cache(key, R(240 * S), R(130 * S), R(120 * S), R(110 * S), (g) => {
    const f = (q / 8) * 2 * Math.PI, P = (poly) => poly.map(([x, y]) => [x * S * dir, y * S]), bob = Math.abs(Math.sin(f)) * 2;
    const tail = bez([-40, -24 - bob], [-82, -16 + Math.sin(f) * 6], [-108, -38 + Math.sin(f + 1) * 8], 16);
    pinkBlob(g, P(tube(tail, 3.4, 2)), S);
    const step = (k) => Math.sin(f + k) * 9, lift = (k) => Math.max(0, Math.cos(f + k)) * 3;
    pinkBlob(g, P(ell(-24 + step(Math.PI), -3 - lift(Math.PI), 10, 4)), S);   // far feet (darker by order)
    pinkBlob(g, P(ell(26 + step(0), -3 - lift(0), 9, 4)), S);
    blob(g, [P(ell(-6, -30 - bob, 44, 27)), P(ell(28, -38 - bob, 26, 22))], opt({ thick: 16 * S, base: 2.7, gain: 2.4 }));
    patch(g, -2 * S * dir, (-14 - bob) * S, 30 * S, 9 * S, CREAM2, 0.5);
    blob(g, [P(ell(20, -76 - bob, 21, 20))], opt({ thick: 7 * S, base: 2.8 }));
    patch(g, 21 * S * dir, (-75 - bob) * S, 13 * S, 13 * S, PINK, 0.25);
    blob(g, [P(ell(40, -48 - bob, 30, 26)), P([[52, -64 - bob], [82, -42 - bob], [78, -32 - bob], [52, -26 - bob]])], opt({ thick: 12 * S, base: 2.9 }));
    patch(g, 62 * S * dir, (-36 - bob) * S, 12 * S, 7 * S, CREAM, 0.4);
    pinkBlob(g, P(ell(-24 + step(0), -3 - lift(0), 10, 4)), S);
    pinkBlob(g, P(ell(26 + step(Math.PI), -3 - lift(Math.PI), 9, 4)), S);
  });
}
/** Side-view walking mouse, feet at (x, y); ph = walk phase in cycles (1 = one stride), dir = 1 (right) | −1 (left). */
export function drawMouseWalk(c, x, y, o = {}) {
  const S = o.s ?? 1, a = o.a ?? 1, dir = o.dir ?? 1; if (a <= 0) return;
  const ph = o.ph ?? 0, q = ((R(ph * 8) % 8) + 8) % 8, bob = Math.abs(Math.sin((q / 8) * 2 * Math.PI)) * 2;
  walkSprite(S, ph, dir).blit(c, R(x), R(y), { a });
  const g = fade(c, a), P = (px, py) => [R(x + px * S * dir), R(y + (py - bob) * S)];
  const [ex, ey] = P(51, -53);
  eye(c, ex, ey, 7.5 * S, { iris: IRIS, pupil: "bead", ry: 8.5 * S, look: [0.5 * dir, 0], blink: o.blink ?? 0, a, lid: RAMPM[4], outline: OUT });
  const [nx, ny] = P(81, -39); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) g.px(nx + i, ny + j, i * i + j * j > 3 ? PINKO : "#F27A9A");
  g.px(nx - dir, ny - 1, "#FFFFFF");
  const [bx, by] = P(54, -34); blush(c, bx, by, 6 * S, 3 * S, undefined, a);
  for (const [dy, x1, y1] of [[-38, 104, -46], [-36, 106, -34]]) { const p0 = P(72, dy), p1 = P(x1, y1); g.line(p0[0], p0[1], p1[0], p1[1], o.whisker ?? "#F2EAF0"); }
}
