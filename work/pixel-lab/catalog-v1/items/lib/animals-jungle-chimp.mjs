// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/jungle.mjs#chimpHead (head sprite). Changes: imports point to
// catalog libs; sprite thickness/offsets scale with s (the film drew it at one scale); the live face (bead eyes, nostril-brow ridge
// stays in the sprite, mouth, brows) is added with the shared cute kit because the film paints it in a different function.
import { blob, ell, smile, eye, sm, lerp, RAMP, smooth } from "./cute.mjs";
import { spriteCache, xf } from "./speed-jungle-kit.mjs";

const R = Math.round, FUR = RAMP.brown, SKIN = RAMP.skin, RIM = "#FF8A7A";
const SPR = spriteCache(24);
const IRIS = ["#07060E", "#1A100C", "#2A1A12", "#7A4A34", "#B07A58"];

function head(s) {
  return SPR(`CH${s}`, R(230 * s), R(180 * s), R(115 * s), R(90 * s), (g, ox, oy) => {
    const P = xf(ox, oy, s, 0);
    for (const sd of [-1, 1]) { blob(g, [P.poly(ell(sd * 66, 6, 25, 26))], { ramp: FUR, thick: 10 * s, base: 1.5, litOutline: RIM }); blob(g, [P.poly(ell(sd * 66, 7, 15, 17))], { ramp: SKIN, thick: 7 * s, base: 3.0, outline: FUR[1] }); }
    blob(g, [P.poly(ell(0, 0, 64, 58)), smooth(P.poly([[-16, -52], [-10, -74], [-2, -56], [6, -76], [14, -54]]), new Set(), 3)], { ramp: FUR, thick: 28 * s, base: 1.3, gain: 2.3, slope: 0.4, litOutline: RIM });
    blob(g, [P.poly(ell(-20, -4, 26, 25)), P.poly(ell(20, -4, 26, 25)), P.poly(ell(0, 12, 31, 19)), P.poly(ell(0, 32, 36, 23))], { ramp: SKIN, thick: 16 * s, base: 3.6, gain: 1.8, slope: 0.3, outline: FUR[0] });
    const st = 1 / Math.max(1, s * 1.5);
    for (const sd of [-1, 1]) for (let k = -15; k <= 15; k += st) { const p = P(sd * 20 + k, -26 + (k * k) / 40); g.px(R(p[0]), R(p[1]), SKIN[2]); g.px(R(p[0]), R(p[1]) - 1, SKIN[3]); }
    for (const sd of [-1, 1]) { const p = P(sd * 5, 20); g.rect(R(p[0]) - 1, R(p[1]), R(3 * s) || 1, R(2 * s) || 1, SKIN[1]); g.px(R(p[0]), R(p[1] + 1.5 * s), SKIN[0]); }
  });
}

/** o: s scale, look [x,y] (already blended), blink 0..1, happy, wide, open 0..1, hoot 0..1, sink px (at scale 1) */
export function drawChimp(c, gx, gy, o) {
  const S = o.s, hx = gx + o.look[0] * 5 * S, hy = gy - 58 * S + o.look[1] * 3 * S + (o.sink || 0) * S;
  head(S).blit(c, hx, hy, { a: o.a ?? 1 });
  const sx = (v) => hx + v * S, sy = (v) => hy + v * S;
  const happy = o.happy || 0, wide = o.wide || 0, blink = Math.max(o.blink, happy);
  const er = 6.6 + 1.6 * wide;
  for (const sd of [-1, 1]) {
    const ex = sx(sd * 17 + o.look[0] * 2), ey = sy(-6 + o.look[1] * 1.5);
    eye(c, ex, ey, er * S, { ry: (er + 0.8) * S, iris: IRIS, pupil: "bead", look: o.look, blink, lid: SKIN[3], outline: FUR[0] });
    // happy «^»: a lid arc that fades in as the eye closes
    if (happy > 0.4) for (let u = -er; u <= er; u += 0.5 / S) { const yy = -3.5 * (1 - (u / er) ** 2); const f = sm(happy, 0.4, 0.9); if (f > ((R(sx(sd * 17 + u)) * 7 + R(sy(-6 + yy))) % 4) / 4) c.px(R(sx(sd * 17 + u + o.look[0] * 2)), R(sy(-5 + yy)), FUR[0]); }
    // brow: lifted when wide, a little angry-lowered when hooting
    const lift = -wide * 3 + (o.hoot || 0) * 1.5 + happy * -2;
    for (let u = -9; u <= 9; u += 0.5 / S) c.px(R(sx(sd * 17 + u)), R(sy(-19 + lift + (sd * u) * 0.12 * (o.hoot || 0) + 0.04 * u * u)), FUR[1]);
  }
  // mouth: closed smile crossfades into the open mouth (O when hooting)
  const open = o.open || 0, k = sm(open, 0.04, 0.4), w = lerp(12, 6.5, o.hoot || 0) * S;
  const my = sy(38 + 4 * (o.hoot || 0));
  smile(c, hx, my, w * (1 + 0.1 * happy), { col: "#1A0A0C", a: 1 - k });
  if (k > 0.01) smile(c, hx, my, w, { col: "#1A0A0C", open: 0.5 + 0.5 * (o.hoot || 0), tongue: "#D8607C", a: k });
  return { hx, hy };
}
export const CHIMP_HEAD_Y = 58;
