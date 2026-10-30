// The LV10 Etruscan shrew in the reference style: a tiny velvety grey-brown shrew peeking out of a gap in a dry-stone
// wall, facing the camera — round head, rounded pink-lined ears, small glossy bead eyes with two highlights, a long
// wiggly pink-tipped snout pointing down toward us, long whiskers, blush, tiny pink hands on the stone in front.
// drawShrew(c, x, y, o): (x, y) = screen centre of the head. The head base is a memoised sprite; snout, eyes, whiskers
// and hands are drawn per frame (wiggle, blink, look, heartbeat jitter).
import { blob, flat, ell, tube, bez, eye, blush, RAMP, fade, mix, bayer, lerp, clamp01 } from "../cute.mjs";
import { spriteCache, R } from "./snow-kit.mjs";

export const VELVET = ["#120E14", "#221C24", "#363036", "#4E4648", "#6A5E5C", "#887A74", "#A6968C", "#C6B6A8"];
const BELLY = ["#2A2226", "#4A3E40", "#6E5E5C", "#8E7E78", "#AC9C94", "#C8B8AE", "#DED0C6", "#F2E8DE"];
const SNOUT = ["#24181C", "#3E2C30", "#5C4446", "#7A5C5C", "#987674", "#B4928E", "#CEAEA8", "#E6CCC6"];
const PINK = ["#3A1420", "#6A2234", "#9A3A4C", "#C85A6A", "#E07A88", "#F09AA6", "#F8BCC4", "#FFE0E4"];
const OUT = "#0E0A10", LIT = "#FFD8A0";
const sprites = spriteCache(8);

/** o: wig (nose wiggle −1..1), sniff (0..1 nose lift), look [dx, dy], blink, a, body (0..1 how far it leans out). */
export function drawShrew(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = fade(c, a), wig = o.wig ?? 0, sniff = o.sniff ?? 0;
  // the body behind the head, inside the gap (a soft velvet bump)
  const body = sprites("body", 130, 120, 65, 60, (q, ox, oy) => {
    blob(q, [ell(ox, oy, 44, 42)], { ramp: VELVET, thick: 22, base: 2.7, gain: 2.0, outline: OUT, litOutline: LIT });
    blob(q, [ell(ox, oy + 4, 26, 30)], { ramp: BELLY, thick: 14, base: 2.8, gain: 1.6, outline: VELVET[3], rimLit: 0.2, rimShade: 0.3 });
  });
  body.blit(c, R(x + (o.bodyDx ?? 0)), R(y + 62), { a });
  const head = sprites("head", 140, 110, 70, 60, (q, ox, oy) => {
    // ears: rounded, large for a shrew, pink inside
    for (const sd of [-1, 1]) { blob(q, [ell(ox + sd * 31, oy - 24, 15, 14)], { ramp: VELVET, thick: 7, base: 3.0, outline: OUT, litOutline: LIT }); blob(q, [ell(ox + sd * 31, oy - 22, 8, 8)], { ramp: PINK, thick: 4, base: 4.0, outline: VELVET[2], rimLit: 0, rimShade: 0.3 }); }
    blob(q, [ell(ox, oy, 41, 34), ell(ox - 22, oy + 14, 22, 18), ell(ox + 22, oy + 14, 22, 18)], { ramp: VELVET, thick: 24, base: 3.2, gain: 2.3, outline: OUT, litOutline: LIT });
    // lighter muzzle base and chin where the snout starts
    blob(q, [ell(ox, oy + 16, 22, 14)], { ramp: BELLY, thick: 9, base: 3.4, gain: 1.6, outline: VELVET[3], rimLit: 0.2, rimShade: 0.3 });
    // velvet sheen: a few light ticks on the crown
    for (let i = 0; i < 26; i++) { const u = (i * 0.618) % 1, v = (i * 0.381) % 1, px = R(ox - 30 + u * 60), py = R(oy - 28 + v * 22); const p = q.get(px, py); if (p[0] + p[1] + p[2] > 60 && ((px - ox) / 38) ** 2 + ((py - oy) / 32) ** 2 < 0.8) q.px(px, py, VELVET[6]); }
  });
  head.blit(c, R(x), R(y), { a });
  // eyes: small glossy beads with two highlights
  for (const sd of [-1, 1]) eye(c, x + sd * 18, y - 6, 7, { ry: 7.6, iris: RAMP.ink, pupil: "bead", look: o.look ?? [0, 0.2], blink: o.blink ?? 0, lid: VELVET[4], outline: OUT, a });
  blush(c, x - 26, y + 9, 7, 3.5, "#F27A9A", a); blush(c, x + 26, y + 9, 7, 3.5, "#F27A9A", a);
  // the long snout pointing down toward us: a tapered, wrinkled tube that wiggles side to side, pink at the tip
  const base = [x, y + 6], tip = [x + wig * 7, y + 56 - sniff * 8], mid = [x + wig * 2, y + 32 - sniff * 4], pts = bez(base, mid, tip, 10);
  blob(c, [tube(pts, 9.5, 4.2)], { ramp: SNOUT, thick: 6, base: 3.6, gain: 1.6, outline: OUT, litOutline: LIT, a });
  for (let k = 3; k < 9; k += 2) { const p = pts[k], w = R(lerp(9, 4, k / 10)); g.line(R(p[0] - w + 1), R(p[1]), R(p[0] + w - 1), R(p[1]), SNOUT[3]); }
  blob(c, [ell(tip[0], tip[1] + 1, 5.6, 4.6)], { ramp: PINK, thick: 3, base: 4.4, outline: OUT, a });
  g.px(R(tip[0] - 2), R(tip[1]), PINK[7]); g.px(R(tip[0] - 1), R(tip[1] - 1), PINK[7]);
  g.px(R(tip[0] - 2), R(tip[1] + 3), OUT); g.px(R(tip[0] + 2), R(tip[1] + 3), OUT);
  // whiskers fanning out along the snout (they move with it)
  for (const sd of [-1, 1]) for (const [len, dy, k] of [[40, -10, 4], [46, -2, 6], [38, 7, 8]]) {
    const p = pts[k], ex = p[0] + sd * len, ey = p[1] + dy + wig * sd * 2;
    g.line(R(p[0] + sd * 5), R(p[1]), R(ex), R(ey), "#EFE4DC");
  }
  // tiny pink hands on the stone in front
  if (o.hands !== false) for (const sd of [-1, 1]) {
    const hx = x + sd * 20 + (o.handDx ?? 0), hy = y + 78 + (o.handDy ?? 0);
    blob(c, [ell(hx, hy, 7, 5)], { ramp: PINK, thick: 3, base: 4.2, outline: OUT, a });
    for (const k of [-4, -1, 2, 5]) { g.px(R(hx + k * 0.9), R(hy + 4), OUT); g.px(R(hx + k * 0.9), R(hy + 5), PINK[5]); }
  }
}
