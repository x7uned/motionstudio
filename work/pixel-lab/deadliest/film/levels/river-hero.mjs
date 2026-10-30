// The series hero for LV3 (copied from ../hero.mjs, which stays untouched) with two additions the canoe gag needs:
// o.hands = [[dx, dy], [dx, dy]] places the mittens anywhere (paddling, flailing, swimming crawl), o.legs = false skips
// legs and boots (he sits inside the canoe or swims). Returns the screen positions of both hands. Everything else is the
// same chibi: coral puffer, purple bobble hat, blue scarf, yellow mittens; (x, y) = point between the feet.
import { blob, flat, ell, tube, eye, blush, smile, RAMP, fade, lerp } from "../cute.mjs";
import { COAT, MITT } from "../hero.mjs";

const R = Math.round;
const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
const SKIN = RAMP.skin;

export function drawHero(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const s = o.scale ?? 1, f = o.facing ?? 0, look = o.look ?? [f * 0.6, 0], kick = o.kick ?? 0;
  const P = (dx, dy) => [x + dx * s, y + dy * s], S = (v) => v * s;
  if (o.legs !== false) for (const side of [-1, 1]) {
    const sw = kick * side * 9, hip = P(side * 9, -46), foot = P(side * 9 + sw, -6 - Math.abs(sw) * 0.4);
    blob(c, [tube([hip, foot], S(7), S(6.5))], { ramp: PANTS, thick: 5, a });
    blob(c, [ell(foot[0] + S(f * 3), foot[1] + S(1), S(10), S(6))], { ramp: BOOT, thick: 4, a });
  }
  const body = [ell(...P(0, -66), S(30), S(30)), ell(...P(0, -50), S(27), S(14))];
  blob(c, body, { ramp: COAT, thick: 16, base: 3.4, a });
  const g = fade(c, a);
  for (const qy of [-80, -66, -52]) { const yy = R(y + S(qy)), half = S(Math.sqrt(Math.max(0, 900 - (qy + 66) ** 2)) * 0.92); g.line(R(x - half + 3), yy, R(x + half - 3), yy, COAT[2]); }
  if (f === 0) g.line(R(x), R(y + S(-92)), R(x), R(y + S(-40)), COAT[1]);
  const armL = P(-24, -82), armR = P(24, -82);
  const hd = o.hands ?? [[-30, -50], [30, -50]], hL = P(...hd[0]), hR = P(...hd[1]);
  for (const [sh, h] of [[armL, hL], [armR, hR]]) blob(c, [tube([sh, [lerp(sh[0], h[0], 0.5) + (h[0] < x ? -S(4) : S(4)), lerp(sh[1], h[1], 0.5)], h], S(8), S(7))], { ramp: COAT, thick: 6, a });
  if (o.beforeMitts) o.beforeMitts(hL, hR);
  for (const h of [hL, hR]) blob(c, [ell(h[0], h[1], S(7), S(6.5))], { ramp: MITT, thick: 4, a });
  blob(c, [ell(...P(0, -96), S(24), S(8)), tube([P(10, -94), P(14, -72)], S(5), S(4.5))], { ramp: SCARF, thick: 5, a });
  const hx = x + S(f * 3), hy = y + S(-124);
  blob(c, [ell(hx, hy, S(27), S(26))], { ramp: SKIN, thick: 14, base: 4.2, a });
  flat(c, [[[hx - S(25), hy - S(10)], [hx - S(20), hy - S(2)], [hx - S(10), hy - S(8)], [hx, hy - S(1)], [hx + S(10), hy - S(8)], [hx + S(20), hy - S(2)], [hx + S(25), hy - S(10)], [hx + S(20), hy - S(20)], [hx - S(20), hy - S(20)]]], "#4A2A1A", { a });
  blob(c, [ell(hx, hy - S(20), S(28), S(17)), ell(hx, hy - S(41), S(9), S(9))], { ramp: HAT, thick: 10, a });
  g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), R(S(5)), HAT[5]); g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), 1, HAT[6]);
  const ex = S(10), er = S(5.6);
  for (const sd of [-1, 1]) eye(c, hx + sd * ex + S(f * 4), hy + S(5), er, { iris: SCARF, pupil: "round", look, blink: o.blink ?? 0, lid: SKIN[4], a });
  const br = o.brows ?? 0; if (br > 0.05) for (const sd of [-1, 1]) { const bx = hx + sd * ex + S(f * 4); g.line(R(bx - S(5)), R(hy - S(4) + (sd < 0 ? S(2) * br : 0)), R(bx + S(5)), R(hy - S(4) + (sd > 0 ? S(2) * br : 0)), "#4A2A1A"); }
  blush(c, hx - S(16) + S(f * 4), hy + S(12), S(5), S(2.5), "#F07A8A", a); blush(c, hx + S(16) + S(f * 4), hy + S(12), S(5), S(2.5), "#F07A8A", a);
  const m = o.mouth ?? "smile";
  if (m === "o") smile(c, hx + S(f * 4), hy + S(14), Math.max(2, S(3)), { open: 0.8, a }); else if (m === "flat") g.line(R(hx - S(3) + S(f * 4)), R(hy + S(16)), R(hx + S(3) + S(f * 4)), R(hy + S(16)), "#4A1A1A"); else smile(c, hx + S(f * 4), hy + S(14), Math.max(2, S(3.5)), { a });
  return { hL, hR, head: [hx, hy] };
}
