// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-heart/film/levels/wall-shrew.mjs#drawShrew (the LV10 Etruscan shrew).
// changes: import paths (cute.mjs and the sprite cache of speed-jungle-kit.mjs, same API as the film's snow-kit); the film
// draws one size, here o.s scales every part (the adapter zooms the animal): each sprite is cached per 1 % of scale; o.wide
// (0..1) widens the eyes («startled»); the drawing and its per-frame motion (wiggle, sniff, look, blink, hands) are the film's.
// (x, y) = centre of the head; returns { hx, hy } = that centre. Sprites paint in anchor-relative coordinates (roofs-kit).
import { blob, ell, tube, bez, eye, blush, RAMP, fade, lerp, clamp01 } from "./cute.mjs";
import { spriteCache } from "./roofs-kit.mjs";   // catalog-v1 roofs-kit blit writes through the engine dissolve view

const R = Math.round;
export const VELVET = ["#120E14", "#221C24", "#363036", "#4E4648", "#6A5E5C", "#887A74", "#A6968C", "#C6B6A8"];
const BELLY = ["#2A2226", "#4A3E40", "#6E5E5C", "#8E7E78", "#AC9C94", "#C8B8AE", "#DED0C6", "#F2E8DE"];
const SNOUT = ["#24181C", "#3E2C30", "#5C4446", "#7A5C5C", "#987674", "#B4928E", "#CEAEA8", "#E6CCC6"];
const PINK = ["#3A1420", "#6A2234", "#9A3A4C", "#C85A6A", "#E07A88", "#F09AA6", "#F8BCC4", "#FFE0E4"];
const OUT = "#0E0A10", LIT = "#FFD8A0";
const sprites = spriteCache(96);

/** o: s (scale, 1 = the film's size), a, wig (nose wiggle −1..1), sniff (0..1 nose lift), wide (0..1 eye size), look [dx, dy],
 *  blink (0..1), bodyDx, handDx, handDy, hands (false hides the hands). */
export function drawShrew(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const S = o.s ?? 1, sk = R(S * 100), g = fade(c, a), wig = o.wig ?? 0, sniff = o.sniff ?? 0, wide = clamp01(o.wide ?? 0);
  // the body behind the head, inside the gap (a soft velvet bump)
  const body = sprites(`body|${sk}`, R(130 * S), R(120 * S), R(65 * S), R(60 * S), (q, ox = 0, oy = 0) => {
    blob(q, [ell(ox, oy, 44 * S, 42 * S)], { ramp: VELVET, thick: 22 * S, base: 2.7, gain: 2.0, outline: OUT, litOutline: LIT });
    blob(q, [ell(ox, oy + 4 * S, 26 * S, 30 * S)], { ramp: BELLY, thick: 14 * S, base: 2.8, gain: 1.6, outline: VELVET[3], rimLit: 0.2, rimShade: 0.3 });
  });
  body.blit(c, R(x + (o.bodyDx ?? 0) * S), R(y + 62 * S), { a });
  const head = sprites(`head|${sk}`, R(140 * S), R(110 * S), R(70 * S), R(60 * S), (q, ox = 0, oy = 0) => {
    // ears: rounded, large for a shrew, pink inside
    for (const sd of [-1, 1]) {
      blob(q, [ell(ox + sd * 31 * S, oy - 24 * S, 15 * S, 14 * S)], { ramp: VELVET, thick: 7 * S, base: 3.0, outline: OUT, litOutline: LIT });
      blob(q, [ell(ox + sd * 31 * S, oy - 22 * S, 8 * S, 8 * S)], { ramp: PINK, thick: 4 * S, base: 4.0, outline: VELVET[2], rimLit: 0, rimShade: 0.3 });
    }
    blob(q, [ell(ox, oy, 41 * S, 34 * S), ell(ox - 22 * S, oy + 14 * S, 22 * S, 18 * S), ell(ox + 22 * S, oy + 14 * S, 22 * S, 18 * S)], { ramp: VELVET, thick: 24 * S, base: 3.2, gain: 2.3, outline: OUT, litOutline: LIT });
    // lighter muzzle base and chin where the snout starts
    blob(q, [ell(ox, oy + 16 * S, 22 * S, 14 * S)], { ramp: BELLY, thick: 9 * S, base: 3.4, gain: 1.6, outline: VELVET[3], rimLit: 0.2, rimShade: 0.3 });
    // velvet sheen: a few light ticks on the crown
    for (let i = 0; i < 26; i++) {
      const u = (i * 0.618) % 1, v = (i * 0.381) % 1, px = R(ox - 30 * S + u * 60 * S), py = R(oy - 28 * S + v * 22 * S);
      const p = q.get(px, py);
      if (p[0] + p[1] + p[2] > 60 && ((px - ox) / (38 * S)) ** 2 + ((py - oy) / (32 * S)) ** 2 < 0.8) q.px(px, py, VELVET[6]);
    }
  });
  head.blit(c, R(x), R(y), { a });
  // eyes: small glossy beads with two highlights; wide = the eye opens taller (startled)
  const ry = (7.6 + 2.2 * wide) * S;
  for (const sd of [-1, 1]) eye(c, x + sd * 18 * S, y - 6 * S, 7 * S, { ry, iris: RAMP.ink, pupil: "bead", look: o.look ?? [0, 0.2], blink: o.blink ?? 0, lid: VELVET[4], outline: OUT, a });
  blush(c, x - 26 * S, y + 9 * S, 7 * S, 3.5 * S, "#F27A9A", a); blush(c, x + 26 * S, y + 9 * S, 7 * S, 3.5 * S, "#F27A9A", a);
  // the long snout pointing down toward us: a tapered, wrinkled tube that wiggles side to side, pink at the tip
  const base = [x, y + 6 * S], tip = [x + wig * 7 * S, y + (56 - sniff * 8) * S], mid = [x + wig * 2 * S, y + (32 - sniff * 4) * S], pts = bez(base, mid, tip, 10);
  blob(c, [tube(pts, 9.5 * S, 4.2 * S)], { ramp: SNOUT, thick: 6 * S, base: 3.6, gain: 1.6, outline: OUT, litOutline: LIT, a });
  for (let k = 3; k < 9; k += 2) { const p = pts[k], w = R(lerp(9 * S, 4 * S, k / 10)); g.line(R(p[0] - w + 1), R(p[1]), R(p[0] + w - 1), R(p[1]), SNOUT[3]); }
  blob(c, [ell(tip[0], tip[1] + S, 5.6 * S, 4.6 * S)], { ramp: PINK, thick: 3 * S, base: 4.4, outline: OUT, a });
  g.px(R(tip[0] - 2 * S), R(tip[1]), PINK[7]); g.px(R(tip[0] - S), R(tip[1] - S), PINK[7]);
  g.px(R(tip[0] - 2 * S), R(tip[1] + 3 * S), OUT); g.px(R(tip[0] + 2 * S), R(tip[1] + 3 * S), OUT);
  // whiskers fanning out along the snout (they move with it)
  for (const sd of [-1, 1]) for (const [len, dy, k] of [[40, -10, 4], [46, -2, 6], [38, 7, 8]]) {
    const p = pts[k], ex = p[0] + sd * len * S, ey = p[1] + dy * S + wig * sd * 2 * S;
    g.line(R(p[0] + sd * 5 * S), R(p[1]), R(ex), R(ey), "#EFE4DC");
  }
  // tiny pink hands on the stone in front
  if (o.hands !== false) for (const sd of [-1, 1]) {
    const hx = x + sd * 20 * S + (o.handDx ?? 0) * S, hy = y + 78 * S + (o.handDy ?? 0) * S;
    blob(c, [ell(hx, hy, 7 * S, 5 * S)], { ramp: PINK, thick: 3 * S, base: 4.2, outline: OUT, a });
    for (const k of [-4, -1, 2, 5]) { g.px(R(hx + k * 0.9 * S), R(hy + 4 * S), OUT); g.px(R(hx + k * 0.9 * S), R(hy + 5 * S), PINK[5]); }
  }
  return { hx: x, hy: y };
}
