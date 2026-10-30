// LV9 copy of the shared hero.mjs (coral puffer, purple bobble hat, blue scarf, yellow mittens) with what the porch
// needs and the shared file lacks: a sitting pose (knees toward the viewer over the coat hem, shins down to the floor,
// hands resting on the knees), a lazy swat (one mitten rises to the ear and waves), a head lean and squint for the
// wince, and a small "tsk" mouth. Everything else is drawn exactly like hero.mjs (copied, not imported, so the shared
// file stays untouched). drawSitHero(c, x, y, o): (x, y) = floor point between the feet; height ≈ 150 px at scale 1.
// o: phase/breath (0..1 cycle), look [dx, dy], blink, a, scale, mouth "smile" | "o" | "flat" | "tsk", brows 0..1,
// swat 0..1 (hand up at the ear), wave (px, sideways hand offset while up), lean (px, head away), squint 0..1.
import { blob, flat, ell, tube, eye, blush, smile, RAMP, fade, mix, lerp } from "../cute.mjs";
import { COAT, MITT } from "../hero.mjs";

const R = Math.round;
const HAT = ["#1A1030", "#2A1F40", "#3B2C5C", "#523D82", "#6E4FB0", "#8D59DA", "#B08AE8", "#E0CDF8"];
const SCARF = ["#10183A", "#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF", "#F4F8FF"];
const PANTS = ["#0C0A18", "#181430", "#22204A", "#2E2E66", "#3E4284", "#5258A0", "#6A74BC", "#8A94D4"];
const BOOT = ["#120A06", "#2E1A10", "#4A2C18", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488"];
const SKIN = RAMP.skin;

export function drawSitHero(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const s = o.scale ?? 1, look = o.look ?? [0, 0], breath = Math.sin(2 * Math.PI * (o.breath ?? 0));
  const P = (dx, dy) => [x + dx * s, y + dy * s], S = (v) => v * s;
  const by = (dy) => dy - (dy < -40 ? breath * 0.8 : 0);                      // the chest rises a little with each breath
  const g = fade(c, a);
  // puffer body (horizontal quilt lines)
  blob(c, [ell(...P(0, by(-66)), S(30), S(30)), ell(...P(0, by(-50)), S(27), S(14))], { ramp: COAT, thick: 16, base: 3.4, a });
  for (const qy of [-80, -66, -52]) { const yy = R(y + S(by(qy))), half = S(Math.sqrt(Math.max(0, 900 - (qy + 66) ** 2)) * 0.92); g.line(R(x - half + 3), yy, R(x + half - 3), yy, COAT[2]); }
  g.line(R(x), R(y + S(by(-92))), R(x), R(y + S(by(-42))), COAT[1]);
  // sitting legs: shins down to the boots, knees (thighs seen end-on) over the coat hem
  // (the feet dangle above the floor and swing a little: o.swing −1..1)
  const swing = o.swing ?? 0;
  for (const side of [-1, 1]) {
    const knee = P(side * 12, -42), foot = P(side * 13 + side * swing * 1.6, -9 + (side * swing > 0 ? -1 : 0));
    blob(c, [tube([knee, foot], S(6.8), S(6.2))], { ramp: PANTS, thick: 5, a });
    blob(c, [ell(foot[0] + S(side * 1), foot[1] + S(1), S(10), S(6))], { ramp: BOOT, thick: 4, a });
  }
  for (const side of [-1, 1]) blob(c, [ell(...P(side * 12, -44), S(12), S(10))], { ramp: PANTS, thick: 8, base: 3.9, a });
  // arms + mittens: resting on the knees; the swat arm (screen right) rises to the ear and waves lazily
  const sw = o.swat ?? 0, wv = o.wave ?? 0, lean = o.lean ?? 0;
  const armL = P(-24, by(-82)), armR = P(24, by(-82));
  const hL = P(-15, -50), hR0 = P(15, -50), hR1 = P(40 + lean / s + wv / s, by(-126)), arc = Math.sin(Math.PI * sw), hR = [lerp(hR0[0], hR1[0], sw) + S(18) * arc, lerp(hR0[1], hR1[1], sw)];
  const eL = [lerp(armL[0], hL[0], 0.5) - S(6), lerp(armL[1], hL[1], 0.5)], eR = [lerp(lerp(armR[0], hR0[0], 0.5) + S(6), x + S(44), sw) + S(12) * arc, lerp(lerp(armR[1], hR0[1], 0.5), y + S(by(-92)), sw) + S(4) * arc];
  blob(c, [tube([armL, eL, hL], S(8), S(7))], { ramp: COAT, thick: 6, a });
  const drawArmR = () => { blob(c, [tube([armR, eR, hR], S(8), S(7))], { ramp: COAT, thick: 6, a }); blob(c, [ell(hR[0], hR[1], S(7), S(6.5))], { ramp: MITT, thick: 4, a }); };
  blob(c, [ell(hL[0], hL[1], S(7), S(6.5))], { ramp: MITT, thick: 4, a });
  // scarf
  blob(c, [ell(...P(0, by(-96)), S(24), S(8)), tube([P(10, by(-94)), P(14, by(-72))], S(5), S(4.5))], { ramp: SCARF, thick: 5, a });
  drawArmR();                                                   // always over the scarf, under the head: no layer switch while it moves
  // head (leans away from the mosquito when it whines at his ear)
  const hx = x + lean, hy = y + S(by(-124));
  blob(c, [ell(hx, hy, S(27), S(26))], { ramp: SKIN, thick: 14, base: 4.2, a });
  flat(c, [[[hx - S(25), hy - S(10)], [hx - S(20), hy - S(2)], [hx - S(10), hy - S(8)], [hx, hy - S(1)], [hx + S(10), hy - S(8)], [hx + S(20), hy - S(2)], [hx + S(25), hy - S(10)], [hx + S(20), hy - S(20)], [hx - S(20), hy - S(20)]]], "#4A2A1A", { a });
  blob(c, [ell(hx, hy - S(20), S(28), S(17)), ell(hx, hy - S(41), S(9), S(9))], { ramp: HAT, thick: 10, a });
  g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), R(S(5)), HAT[5]); g.rect(R(hx - S(27)), R(hy - S(11)), R(S(54)), 1, HAT[6]);
  // face: eyes (squint = partly closed), brows, blush, mouth
  const ex = S(10), er = S(5.6), sq = Math.max(o.blink ?? 0, (o.squint ?? 0) * 0.62);
  eye(c, hx - ex, hy + S(5), er, { iris: SCARF, pupil: "round", look, blink: sq, lid: SKIN[4], a });
  eye(c, hx + ex, hy + S(5), er, { iris: SCARF, pupil: "round", look, blink: sq, lid: SKIN[4], a });
  const br = o.brows ?? 0; if (br > 0.05) { const q = fade(c, a * Math.min(1, br * 1.6)); for (const sd of [-1, 1]) { const bx = hx + sd * ex; for (let i = -5; i <= 5; i++) q.px(R(bx + S(i)), R(hy - S(3.5) - (sd * i < 0 ? 0 : 1) * Math.abs(i) * 0.32 * br * s + br * S(1)), "#4A2A1A"); } }
  blush(c, hx - S(16), hy + S(12), S(5), S(2.5), "#F07A8A", a); blush(c, hx + S(16), hy + S(12), S(5), S(2.5), "#F07A8A", a);
  const m = o.mouth ?? "smile";
  if (m === "o") smile(c, hx, hy + S(14), Math.max(2, S(3)), { open: 0.8, a });
  else if (m === "flat") g.line(R(hx - S(3)), R(hy + S(16)), R(hx + S(3)), R(hy + S(16)), "#4A1A1A");
  else if (m === "tsk") { for (let i = -3; i <= 3; i++) g.px(R(hx + S(i)), R(hy + S(16) + (i > 0 ? -Math.min(1, i * 0.4) * s : 0)), "#4A1A1A"); }
  else {                                                                       // smile ↔ "tsk" crossfade (o.tsk 0..1)
    const k = o.tsk ?? 0, q = fade(c, a * k);
    if (k < 1) smile(c, hx, hy + S(14), Math.max(2, S(3.5)), { a: a * (1 - k) });
    if (k > 0) for (let i = -3; i <= 3; i++) q.px(R(hx + S(i)), R(hy + S(16) + (i > 0 ? -Math.min(1, i * 0.4) * s : 0)), "#4A1A1A");
  }
  return { head: [hx, hy], ear: [hx + S(27), hy + S(4)], hand: hR };
}
