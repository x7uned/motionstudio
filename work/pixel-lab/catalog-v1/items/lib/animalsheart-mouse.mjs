// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/mouse-art.mjs; changes: import paths; side-view
// walk dropped; happy ^ ^ eyes crossfade with the bead eyes over happy 0.4–0.65 and the open mouth crossfades with the «w»
// mouth over open 0.1–0.35 (both were one-frame swaps); body sprite keys arms/dangle/squash quantised to 2.5 % (was 10 %).
// The series' house mouse, drawn once and shared by the field (weight film) and barn (heart film) levels (identical
// copies). Grey-brown chibi: big round ears with pink insides, a round head with a cream muzzle, glossy bead eyes with
// two highlights, pink button nose, tiny buck teeth, whiskers, blush, cream belly, pink hands, feet and a long pink
// tail. Poses: sitting front-on (breath, blink, ear wiggle, tail sway, look, hands at the chest or up, happy eyes,
// ears spread like a parachute, squash) and a side-view walk (facing right or left). Anchor (x, y) = the ground point
// under the feet (centre). Nothing pops: callers dissolve between poses with `a`.
import { blob, flat, ell, tube, bez, eye, blush, RAMP, fade, mix, rnd, clamp01, bayer } from "./cute.mjs";
import { spriteCache } from "./roofs-kit.mjs";

const R = Math.round, smooth01 = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
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
  const q = R(sway * 50), qa = R(arms * 40), qd = R(dangle * 40), qs = R(squash * 40), key = `mb|${S}|${q}|${qa}|${qd}|${qs}`;
  return cache(key, R(260 * S), R(200 * S), R(130 * S), R(150 * S), (g) => {
    const k = 1 - (qs / 40) * 0.14, w = 1 + (qs / 40) * 0.1, P = (poly) => poly.map(([x, y]) => [x * S * w, y * S * k]);
    // tail (behind)
    const tp = tailPts(q / 50).map(([x, y]) => [x * S * w, y * S * k]);
    pinkBlob(g, tube(tp, 3.6 * S, 2.2 * S), S);
    // feet (dangling when floating)
    const d = qd / 40;
    for (const s of [-1, 1]) pinkBlob(g, P(ell(20 * s, -4 + d * 8, 14 - d * 5, 6 + d * 4, d * 0.5 * s)), S);
    blob(g, [P(ell(0, -40, 40, 44)), P(ell(0, -24, 46, 26))], opt({ thick: 22 * S, base: 2.6, gain: 2.6 }));
    patch(g, 0, -32 * S * k, 26 * S * w, 27 * S * k, CREAM, 0.3);
    patch(g, 0, -24 * S * k, 22 * S * w, 16 * S * k, CREAM2, 0.5);
    for (const s of [-1, 1]) for (const dx of [-5, 0, 5]) { const x = R((20 * s + dx) * S * w), y = R((-2 + d * 9) * S * k); g.px(x, y, PINKO); }
    // arms + hands: at the chest (0) → raised beside the head (1)
    const a = qa / 40;
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
    const hw = smooth01((happy - 0.4) / 0.25);
    if (hw < 1) eye(c, ex, ey, 12 * S, { iris: IRIS, pupil: "bead", ry: 14 * S, look, blink: Math.max(o.blink ?? 0, happy * 1.6), a: a * (1 - hw), lid: RAMPM[4], outline: OUT });
    if (hw > 0) { const gh = fade(c, a * hw); for (let i = -8; i <= 8; i++) { const u = i / 8, X = R(ex + i * S), Y = R(ey + 2 * S - 5 * S * (1 - u * u)); gh.px(X, Y, OUT); gh.px(X, Y + 1, OUT); } }
  }
  for (const s of [-1, 1]) { const [bx, by] = P(31 * s, 16); blush(c, bx, by, 9 * S, 4 * S, undefined, a); }
  // nose: a pink button with a shine
  const sn = o.sniff ?? 0, [nx, ny0] = P(0, 14), ny = ny0 + sn, nr = 4.5 * S;
  for (let Y = R(ny - nr); Y <= R(ny + nr * 0.8); Y++) for (let X = R(nx - nr * 1.2); X <= R(nx + nr * 1.2); X++) { const d = ((X + 0.5 - nx) / (nr * 1.2)) ** 2 + ((Y + 0.5 - ny) / nr) ** 2; if (d <= 1) g.px(X, Y, d > 0.62 ? PINKO : Y < ny - nr * 0.2 ? "#FFB8C8" : "#F27A9A"); }
  g.px(R(nx - nr * 0.4), R(ny - nr * 0.45), "#FFFFFF");
  // mouth: tiny "w" (or a little open smile) and two buck teeth
  const [mx, my] = P(0, 22), open = clamp01(o.open ?? 0);
  const ow = smooth01((open - 0.1) / 0.25);
  if (ow > 0) { const g = fade(c, a * ow), r = (2 + open * 3) * S; for (let Y = R(my); Y <= R(my + r * 1.4); Y++) for (let X = R(mx - r); X <= R(mx + r); X++) { const d = ((X + 0.5 - mx) / r) ** 2 + ((Y + 0.5 - my) / (r * 1.4)) ** 2; if (d <= 1) g.px(X, Y, d > 0.55 ? OUT : Y > my + r * 0.8 ? "#F07090" : "#4A1424"); } g.rect(R(mx) - 1, R(my), 3, R(2 * S), "#FFFFFF"); }
  if (ow < 1) { const g = fade(c, a * (1 - ow));
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
  bodySprite(S, R(sway * 50) / 50, R(clamp01(o.arms ?? 0) * 40) / 40, R(clamp01(o.dangle ?? 0) * 40) / 40, R(clamp01(o.squash ?? 0) * 40) / 40).blit(c, X, Y, { a });
  const sq = clamp01(o.squash ?? 0), hx = X, hy = R(Y - (MOUSE_HEAD_Y - sq * 12) * S + bob - (o.headDy ?? 0));
  headSprite(S, R(earL * 40) / 40, R(earR * 40) / 40).blit(c, hx, hy, { a });
  mouseFace(c, hx, hy, S, { ...o, a });
  return { hx, hy };
}

