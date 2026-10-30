// STREET hero for «Fake buttons»: the channel's character (makeHero, grade golden) at the corner, feet at (HERO_X, LAND),
// facing right. He presses the crosswalk button again and again (pose row 4; a 3-px lean puts his fingertip on the
// button at every PRESSES time), explains, shrugs, crosses his arms, is surprised on "nothing"; later holds a phone at his
// chest (our own prop; his real fingers stay in front of it), takes a photo on "click" (white flash + CLICK!), shrugs,
// thinks, presses again (+CONTROL), gets excited, a heart, waves. Never redrawn: only posed, graded, outlined.
import { HERO_X, LAND } from "../timeline.mjs";
import { makeHero, AX, FOOT } from "./hero.mjs";
import { R, clamp01, mix, bayer, fade, tintRect, MAIN } from "./street-kit.mjs";
import { EV, sm, ease, win, HERO_POSES, HOPS, heroDX, PHONE, FLASH, CLICK_POP, CONTROL_POP, HEART } from "./street-time.mjs";
import { pickup } from "../cute.mjs";

export const HX = (t) => HERO_X + heroDX(t), HY = () => LAND;
export const HERO = makeHero({ poses: HERO_POSES, hops: HOPS, grade: "golden", x: HX, y: HY });

/** Long golden-hour shadow (the low sun is behind him: it falls toward us, a little to the right) + contact shadow. */
export function drawHeroShadow(c, V, t) {
  const fx = V.X(HX(t)), fy = V.Y(LAND) + 1;
  tintRect(c, R(fx - 34), fy - 3, 110, 30, (X, Y) => {
    const u = (Y - fy) / 26, cx = fx + 4 + u * 30, w = 26 - u * 8; if (u < -0.08 || u > 1) return 0;
    const q = Math.abs(X - cx) / w; return q >= 1 ? 0 : 0.34 * (1 - q * q) * (1 - u * 0.7);
  }, "#3A1E3A", 3);
  HERO.shadow(c, V, t, { k: 0.5, rx: 36 });
}

// ---------------------------------------------------------------- the phone in his hands (row 8)
const HANDS = { u: AX, v: 128 };                                           // cell point where the clasped hands hold the phone
function phoneA(t) { return Math.min(sm(t, PHONE.in[0], PHONE.in[1]), 1 - sm(t, PHONE.out[0], PHONE.out[1])); }
function phoneBox(V, t) {
  const lift = R(3 * ease(sm(t, PHONE.lift[0], PHONE.lift[1]))), x = R(V.X(HX(t)) + (HANDS.u - AX)), yb = R(V.Y(LAND) + (HANDS.v - FOOT)) - lift;
  return { x0: x - 8, x1: x + 8, y0: yb - 29, y1: yb + 1, cx: x };
}
export function drawPhone(c, V, t) {
  const a = phoneA(t); if (a <= 0) return;
  const B = phoneBox(V, t), g = fade(c, a), d = c.d, W = c.w;
  // keep his fingers in front: skin-coloured pixels in the lower part of the phone rect stay untouched
  const skin = (X, Y) => { const p = (Y * W + X) * 3, r = d[p], gg = d[p + 1], b = d[p + 2]; return r > 190 && gg > 120 && gg < 220 && b > 80 && b < 190 && r - b > 45; };
  const keep = new Set(); for (let Y = B.y1 - 7; Y <= B.y1; Y++) for (let X = B.x0; X <= B.x1; X++) if (X >= 0 && X < W && Y >= 0 && Y < c.h && skin(X, Y)) keep.add(Y * W + X);
  const P = (X, Y, col) => { if (!keep.has(Y * W + X)) g.px(X, Y, col); };
  for (let Y = B.y0; Y <= B.y1; Y++) for (let X = B.x0; X <= B.x1; X++) {
    const corner = (X === B.x0 || X === B.x1) && (Y === B.y0 || Y === B.y1); if (corner) continue;
    const edge = X === B.x0 || X === B.x1 || Y === B.y0 || Y === B.y1;
    P(X, Y, edge ? "#120C18" : X === B.x0 + 1 || Y === B.y0 + 1 ? "#6A6A82" : X === B.x1 - 1 ? "#24222E" : "#3A3848");
  }
  // camera bump (top-left): two lenses and the flash LED
  for (let Y = B.y0 + 2; Y <= B.y0 + 11; Y++) for (let X = B.x0 + 2; X <= B.x0 + 9; X++) P(X, Y, X === B.x0 + 2 || Y === B.y0 + 2 ? "#5A5A70" : "#1E1C28");
  for (const [lx, ly] of [[B.x0 + 4, B.y0 + 4], [B.x0 + 4, B.y0 + 8], [B.x0 + 7, B.y0 + 8]]) { P(lx, ly, "#0A0A12"); P(lx + 1, ly, "#5A7AE0"); P(lx, ly + 1, "#2A3A80"); P(lx + 1, ly + 1, "#0A0A12"); }
  const fl = win(t, FLASH[0], FLASH[0] + 0.09, 0.06, 0.15);
  P(B.x0 + 7, B.y0 + 5, fl > 0.2 ? "#FFFFFF" : "#E8D890");
  // a soft sheen on the back
  for (let k = 0; k < 6; k++) P(B.x1 - 3 - k, B.y0 + 12 + k * 2, "#4E4C60");
}
/** The flash: a burst at the phone and a white ramp over the whole frame (up 0.05 s, down 0.17 s), CLICK! pop. */
export function drawFlash(c, V, t) {
  const a = phoneA(t);
  if (t >= FLASH[0] - 0.01 && t <= FLASH[1] && a > 0) {
    const u = t - FLASH[0], k = u < 0.09 ? sm(u, 0, 0.09) : 1 - sm(u, 0.09, FLASH[1] - FLASH[0]);
    const B = phoneBox(V, t), fx = B.x0 + 7, fy = B.y0 + 5;
    tintRect(c, 0, 0, c.w, c.h, (X, Y) => { const q = Math.hypot(X - fx, Y - fy); return k * (0.42 + 0.5 * Math.max(0, 1 - q / 120)); }, "#FFFDF4", 6);
    // the burst: a white core with four soft rays
    const g = fade(c, k), Ls = R(8 + 22 * k), core = 2 + R(4 * k);
    for (let j = -core; j <= core; j++) for (let i = -core; i <= core; i++) if (i * i + j * j <= core * core + 1) g.px(fx + i, fy + j, "#FFFFFF");
    for (let i = core; i <= Ls; i++) { const w = 1 - i / (Ls + 1); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (w > bayer(fx + dx * i, fy + dy * i) * 0.9) g.px(fx + dx * i, fy + dy * i, w > 0.5 ? "#FFFFFF" : "#FFF4C8"); }
  }
  const pk = (t - CLICK_POP[0]) / (CLICK_POP[1] - CLICK_POP[0]);
  if (pk > 0 && pk < 1) pickup(c, R(V.X(HERO_X)) - 42, R(V.Y(LAND)) - 228, "CLICK!", pk, "#FFFFFF");
}

/** "+CONTROL" pickup over the button and a heart over his head. */
export function drawPickups(c, V, t, button) {
  const k = (t - CONTROL_POP[0]) / (CONTROL_POP[1] - CONTROL_POP[0]);
  if (k > 0 && k < 1) {
    pickup(c, Math.min(button.x + 104, 392), button.y - 22, "+CONTROL", k, "#7CFF7A");
    // a warm glow ring around the button while the pickup rises
    const ga = Math.min(sm(k, 0, 0.12), 1 - sm(k, 0.5, 0.9)), r = 9 + 10 * ease(Math.min(1, k * 2));
    tintRect(c, button.x - 30, button.y - 30, 61, 61, (X, Y) => { const d = Math.abs(Math.hypot(X - button.x, Y - button.y) - r); return d > 3 ? 0 : ga * (1 - d / 3) * 0.8; }, "#B8FF9A", 4);
  }
  const hk = (t - HEART[0]) / (HEART[1] - HEART[0]);
  if (hk > 0 && hk < 1) {
    const a = Math.min(sm(hk, 0, 0.12), 1 - sm(hk, 0.7, 1)), pop = 1 + 0.35 * Math.sin(Math.PI * Math.min(1, hk / 0.18)) * (hk < 0.18 ? 1 : 0), x = R(V.X(HERO_X) + 6), y = R(V.Y(LAND) - 214 - 22 * ease(hk));
    heart(c, x + 4, y, 11 * pop, a);
  }
}
function heart(c, x, y, s, a) {
  const g = fade(c, a), inside = (i, j) => { const X = i / s, Y = -j / s; return (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y < 0; };
  const n = Math.ceil(s * 1.4);
  for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
    if (!inside(i, j)) continue;
    const edge = !inside(i + 1, j) || !inside(i - 1, j) || !inside(i, j + 1) || !inside(i, j - 1);
    g.px(x + i, y + j, edge ? "#2A0A18" : i < -s * 0.25 && j < -s * 0.15 ? "#FFB0CC" : "#FF4A86");
  }
}
