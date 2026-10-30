// The recurring hero (coral puffer, purple bobble hat, blue scarf, yellow knitted mittens) as a cute chibi in the
// same style as the animals. drawHero(c, x, y, o): (x, y) = screen point between the feet; height ≈ 150 px at scale 1.
// o.pose: "stand" | "walk" | "phone" | "books" | "scratch"; o.phase: walk cycle 0..1; o.facing: -1 left, 0 front, 1 right;
// o.look [dx, dy] −1..1; o.blink 0..1; o.a 0..1 dissolve; o.scale (default 1); o.mouth "smile" | "o" | "flat"; o.brows 0 calm → 1 worried.
import { blob, flat, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, clamp01, lerp } from "./cute.mjs";

const R = Math.round;
export const COAT = ["#2A0E1A", "#5A1A2E", "#8A2840", "#B83A50", "#E0565A", "#F08070", "#F8A890", "#FCD0B8"];
export const MITT = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];
const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
const SKIN = RAMP.skin;

export function drawHero(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const s = o.scale ?? 1, f = o.facing ?? 0, pose = o.pose ?? "stand", ph = o.phase ?? 0, look = o.look ?? [f * 0.6, 0];
  const P = (dx, dy) => [x + dx * s, y + dy * s], S = (v) => v * s;
  const walk = pose === "walk" ? Math.sin(2 * Math.PI * ph) : 0, bob = pose === "walk" ? Math.abs(Math.cos(2 * Math.PI * ph)) * 2 : 0;
  const yb = (dy) => dy - bob;
  // legs + boots (walk swings them)
  for (const side of [-1, 1]) {
    const sw = walk * side * 9, hip = P(side * 9, yb(-46)), foot = P(side * 9 + sw * (f === 0 ? 0.3 : 1), -6);
    blob(c, [tube([hip, foot], S(7), S(6.5))], { ramp: PANTS, thick: 5, a });
    blob(c, [ell(foot[0] + S(f * 3), foot[1] + S(1), S(10), S(6))], { ramp: BOOT, thick: 4, a });
  }
  // puffer body (horizontal quilt lines)
  const body = [ell(...P(0, yb(-66)), S(30), S(30)), ell(...P(0, yb(-50)), S(27), S(14))];
  blob(c, body, { ramp: COAT, thick: 16, base: 3.4, a });
  const g = fade(c, a);
  for (const qy of [-80, -66, -52]) { const yy = R(y + S(yb(qy))), half = S(Math.sqrt(Math.max(0, 900 - (qy + 66) ** 2)) * 0.92); g.line(R(x - half + 3), yy, R(x + half - 3), yy, COAT[2]); }
  if (f === 0) g.line(R(x), R(y + S(yb(-92))), R(x), R(y + S(yb(-40))), COAT[1]);
  // arms + mittens by pose
  const armL = P(-24, yb(-82)), armR = P(24, yb(-82));
  let hL, hR;
  if (pose === "phone") { hL = P(-10, yb(-70)); hR = P(10, yb(-70)); }
  else if (pose === "books") { hL = P(-16, yb(-62)); hR = P(16, yb(-62)); }
  else if (pose === "scratch") { hL = P(-30, yb(-48)); hR = P(14, yb(-128)); }
  else { hL = P(-30 - walk * 4, yb(-50)); hR = P(30 + walk * 4, yb(-50)); }
  for (const [sh, hd] of [[armL, hL], [armR, hR]]) blob(c, [tube([sh, [lerp(sh[0], hd[0], 0.5) + (hd[0] < x ? -S(4) : S(4)), lerp(sh[1], hd[1], 0.5)], hd], S(8), S(7))], { ramp: COAT, thick: 6, a });
  if (pose === "books") { g.rect(R(x - S(22)), R(y + S(yb(-74))), R(S(44)), R(S(8)), "#3A6AB0"); g.rect(R(x - S(20)), R(y + S(yb(-82))), R(S(40)), R(S(8)), "#C84A4A"); g.rect(R(x - S(21)), R(y + S(yb(-90))), R(S(42)), R(S(8)), "#4A9A5A"); for (const yy of [-74, -82, -90]) g.rect(R(x - S(18)), R(y + S(yb(yy))) + 2, R(S(36)), 1, "#F4EEE0"); }
  if (pose === "phone") { g.rrect(R(x - S(9)), R(y + S(yb(-86))), R(S(18)), R(S(28)), "#141022", 2); g.rect(R(x - S(7)), R(y + S(yb(-84))), R(S(14)), R(S(22)), o.screen ?? "#7FD8F0"); }
  for (const hd of [hL, hR]) blob(c, [ell(hd[0], hd[1], S(7), S(6.5))], { ramp: MITT, thick: 4, a });
  // scarf
  blob(c, [ell(...P(0, yb(-96)), S(24), S(8)), tube([P(10, yb(-94)), P(14, yb(-72))], S(5), S(4.5))], { ramp: SCARF, thick: 5, a });
  // head
  const hx = x + S(f * 3), hy = y + S(yb(-124));
  blob(c, [ell(hx, hy, S(27), S(26))], { ramp: SKIN, thick: 14, base: 4.2, a });
  // hair fringe under the hat
  flat(c, [[[hx - S(25), hy - S(10)], [hx - S(20), hy - S(2)], [hx - S(10), hy - S(8)], [hx, hy - S(1)], [hx + S(10), hy - S(8)], [hx + S(20), hy - S(2)], [hx + S(25), hy - S(10)], [hx + S(20), hy - S(20)], [hx - S(20), hy - S(20)]]], "#4A2A1A", { a });
  // hat + bobble
  blob(c, [ell(hx, hy - S(20), S(28), S(17)), ell(hx, hy - S(41), S(9), S(9))], { ramp: HAT, thick: 10, a });
  g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), R(S(5)), HAT[5]); g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), 1, HAT[6]);
  // face
  const ex = S(10), er = S(5.6), lk = [look[0], look[1]];
  if (f >= 0 || true) {
    eye(c, hx - ex + S(f * 4), hy + S(5), er, { iris: SCARF, pupil: "round", look: lk, blink: o.blink ?? 0, lid: SKIN[4], a });
    eye(c, hx + ex + S(f * 4), hy + S(5), er, { iris: SCARF, pupil: "round", look: lk, blink: o.blink ?? 0, lid: SKIN[4], a });
  }
  const br = o.brows ?? 0; if (br > 0.05) for (const sd of [-1, 1]) { const bx = hx + sd * ex + S(f * 4); g.line(R(bx - S(5)), R(hy - S(4) - sd * 0 + (sd < 0 ? S(2) * br : -S(0))), R(bx + S(5)), R(hy - S(4) + (sd > 0 ? S(2) * br : 0)), "#4A2A1A"); }
  blush(c, hx - S(16) + S(f * 4), hy + S(12), S(5), S(2.5), "#F07A8A", a); blush(c, hx + S(16) + S(f * 4), hy + S(12), S(5), S(2.5), "#F07A8A", a);
  const m = o.mouth ?? "smile";
  if (m === "o") smile(c, hx + S(f * 4), hy + S(14), Math.max(2, S(3)), { open: 0.8, a }); else if (m === "flat") g.line(R(hx - S(3) + S(f * 4)), R(hy + S(16)), R(hx + S(3) + S(f * 4)), R(hy + S(16)), "#4A1A1A"); else smile(c, hx + S(f * 4), hy + S(14), Math.max(2, S(3.5)), { a });
}
