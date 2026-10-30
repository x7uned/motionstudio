// The follow card over the final scene (user decision 2026-10-26: not a loop): "Follow, so you don't miss it." Button part
// of deadliest/film/levels/cta.mjs (without «LIKED IT? / SEND»; frozen copy via claw-machine/film/cta.mjs): the card slides
// in over the empty 8th pedestal, under its glowing «?», a pixel hand taps FOLLOW → FOLLOWING ✓ (crossfade) with a
// sparkle burst, the bell rings on "miss", «EVEN STRANGER NEXT» under it. x 136–404, y 404–508: inside the safe zone.
import { EV } from "./timeline.mjs";
import { fade, mix, sm, ease, panel, C, MAIN, TINY } from "./cute.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const CARD = { x: 136, y: 404, w: 268, h: 104, in: EV.follow - 0.12 };
const FOLLOW = { x: 150, y: 422, w: 186, h: 46 };
export const CLICK = EV.follow + 0.38;                           // the hand taps FOLLOW
export const HAND = [EV.follow - 0.05, CLICK, EV.follow + 1.15]; // slide in → tap → slide out
export const BELL = [EV.miss, EV.miss + 0.7];

function button(c, b, label, col, a, press, icon) {
  const g = fade(c, a), y = b.y + R(press * 3);
  g.rrect(b.x, b.y + 5, b.w, b.h, mix(col, "#000000", 0.55), 3);
  g.rrect(b.x, y, b.w, b.h, mix(col, "#000000", 0.25), 3); g.rrect(b.x + 2, y + 2, b.w - 4, b.h - 6, col, 2);
  g.rect(b.x + 6, y + 3, b.w - 12, 1, mix(col, "#FFFFFF", 0.45));
  const s = 2, w = c.measure(MAIN, label, { scale: s }) + (icon ? 30 : 0), x0 = R(b.x + (b.w - w) / 2);
  if (icon) icon(g, x0 + 10, y + R(b.h / 2) - 3);
  g.text(MAIN, label, x0 + (icon ? 30 : 0) + 1, y + 16, C.O, { scale: s }); g.text(MAIN, label, x0 + (icon ? 30 : 0), y + 15, C.IV, { scale: s });
}
const plusIcon = (g, x, y) => { g.rect(x - 6, y - 1, 13, 4, C.IV); g.rect(x - 1, y - 6, 4, 13, C.IV); };
function hand(c, x, y, press, a) { // pixel pointing hand, fingertip at (x, y)
  const rows = ["....XX......", "...XWWX.....", "...XWWX.....", "...XWWXXX...", "...XWWXWWXX.", ".XXXWWXWWXWX", "XWWXWWWWWXWX", "XWWWWWWWWWWX", ".XWWWWWWWWWX", "..XWWWWWWWX.", "...XWWWWWX..", "...XXXXXXX.."];
  const g = fade(c, a), oy = R(press * 2);
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; const s = 2, X = x - 9 + i * s, Y = y + oy + j * s; g.rect(X, Y, s, s, ch === "X" ? "#0B0812" : j > 8 ? "#E8D8F0" : "#FDFEED"); }));
}
function bell(c, x, y, swing, a) {
  const g = fade(c, a), ang = swing, P = (u, v) => [R(x + u * Math.cos(ang) - v * Math.sin(ang)), R(y + u * Math.sin(ang) + v * Math.cos(ang))];
  g.poly([P(-9, 10), P(-7, -2), P(-4, -8), P(0, -10), P(4, -8), P(7, -2), P(9, 10)], "#0B0812");
  g.poly([P(-7, 9), P(-5, -2), P(-3, -6), P(0, -8), P(3, -6), P(5, -2), P(7, 9)], C.Y);
  g.poly([P(-3, -6), P(0, -8), P(1, -6), P(-2, 6)], "#FFF1A8");
  const [cx, cy] = P(0, 12); g.rect(cx - 2, cy - 1, 4, 3, "#0B0812"); g.px(cx - 1, cy, "#F09A3A");
}

export function hud(c, t) {
  if (t < CARD.in) return;
  const k = clamp01((t - CARD.in) / 0.35), a = sm(k, 0, 0.7), y0 = R((1 - back(k)) * -16);
  panel(c, CARD.x, CARD.y + y0, CARD.w, CARD.h, a, C.Y);
  const shift = (b) => ({ ...b, y: b.y + y0 });
  // FOLLOW → FOLLOWING ✓ (crossfade on the tap), with a sparkle burst
  const fol = sm(t, CLICK + 0.04, CLICK + 0.3), fp = sm(t, CLICK - 0.05, CLICK) * (1 - sm(t, CLICK + 0.1, CLICK + 0.22)), ba = a * sm(t, CARD.in + 0.1, CARD.in + 0.4);
  if (fol < 1) button(c, shift(FOLLOW), "FOLLOW", "#8D59DA", ba * (1 - fol), fp, plusIcon);
  if (fol > 0) button(c, shift(FOLLOW), "FOLLOWING ✓", "#4A4268", ba * fol, fp, null);
  if (t > CLICK && t < CLICK + 0.7) for (let i = 0; i < 10; i++) {
    const u = (t - CLICK) / 0.7, ang = (i / 10) * Math.PI * 2 + 0.3, r = 26 + 40 * ease(u), x = R(FOLLOW.x + FOLLOW.w / 2 + Math.cos(ang) * r * 1.6), y = R(FOLLOW.y + FOLLOW.h / 2 + y0 + Math.sin(ang) * r * 0.7);
    fade(c, a * (1 - u)).rect(x - 1, y - 1, 3, 3, i % 2 ? C.Y : "#FDFEED");
  }
  { const sub = "EVEN STRANGER NEXT", sa = sm(t, EV.miss - 0.1, EV.miss + 0.25), sw = c.measure(TINY, sub, { scale: 2 }); if (sa > 0) fade(c, a * sa).text(TINY, sub, R(FOLLOW.x + FOLLOW.w / 2 - sw / 2), FOLLOW.y + FOLLOW.h + 14 + y0, "#E0CDF8", { scale: 2 }); }
  // the bell rings on "miss" (right part of the card)
  const ring = t > BELL[0] && t < BELL[1] ? Math.sin((t - BELL[0]) * 34) * 0.45 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) : 0;
  bell(c, CARD.x + CARD.w - 32, CARD.y + 50 + y0, ring, a * sm(t, EV.follow, EV.follow + 0.3));
  // the hand: slides in from the bottom right, taps FOLLOW, slides away
  if (t > HAND[0] && t < HAND[2]) {
    const tipX = FOLLOW.x + FOLLOW.w * 0.62, tipY = FOLLOW.y + FOLLOW.h * 0.55 + y0;
    const kin = ease(clamp01((t - HAND[0]) / (CLICK - HAND[0]))), kout = ease(clamp01((t - CLICK - 0.25) / (HAND[2] - CLICK - 0.25)));
    const x = R(tipX + (1 - kin) * 70 + kout * 80), y = R(tipY + (1 - kin) * 60 + kout * 70), pr = sm(t, CLICK - 0.06, CLICK) * (1 - sm(t, CLICK + 0.08, CLICK + 0.2));
    hand(c, x, y, pr, a * Math.min(sm(t, HAND[0], HAND[0] + 0.15), 1 - sm(t, HAND[2] - 0.2, HAND[2])));
  }
}
