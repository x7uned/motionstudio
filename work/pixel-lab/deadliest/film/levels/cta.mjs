// Screen-space cards of the finale (both drawn over the night camp, both continuous — no one-frame changes):
// 1) the guess cards — "A great white shark? A hungry lion? A giant snake? Nope." — three portrait cards pop in on their
//    words (the heads come from the levels' ICON), a red × is stamped on each on "Nope", then they dissolve;
// 2) the share/follow card the user asked for (2026-10-23): "Liked this video? Send it to a friend, and follow so you
//    don't miss the next one." — LIKED IT? · a SEND button that launches a paper plane to a friend · a FOLLOW button
//    that a pixel hand taps → FOLLOWING ✓, and a bell that rings on "miss". It stays to the end over the hero's K.O.
import { EV, END } from "../timeline.mjs";
import { fade, mix, bayer, sm, ease, rnd, panel, C, MAIN, TINY } from "../cute.mjs";
import * as ocean from "./ocean.mjs";
import * as savanna from "./savanna.mjs";
import * as jungle from "./jungle.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

// ---------------------------------------------------------------- guess cards
export const GUESS = [
  { t: EV.great, mod: ocean, label: "SHARK?", cx: 104 },
  { t: EV.hungry, mod: savanna, label: "LION?", cx: 270 },
  { t: EV.giant, mod: jungle, label: "SNAKE?", cx: 436 },
];
export const GUESS_Y = 204, GUESS_W = 132, GUESS_H = 104;
export const NOPE = (i) => EV.nope + 0.04 + i * 0.1;          // the × stamp on card i
export const GUESS_OUT = [EV.nope + 0.55, EV.nope + 0.9];     // all cards dissolve out
function guessCards(c, t) {
  if (t < GUESS[0].t - 0.05 || t > GUESS_OUT[1]) return;
  GUESS.forEach((g, i) => {
    const k = clamp01((t - g.t + 0.05) / 0.3); if (k <= 0) return;
    const a = Math.min(sm(k, 0, 0.6), 1 - sm(t, GUESS_OUT[0], GUESS_OUT[1])); if (a <= 0) return;
    const y = R(GUESS_Y + (1 - back(k)) * 14 + Math.sin(t * 2.2 + i * 1.3) * 1.5), x = R(g.cx - GUESS_W / 2);
    const nope = sm(t, NOPE(i), NOPE(i) + 0.12);
    panel(c, x, y, GUESS_W, GUESS_H, a, nope > 0.5 ? "#FF5A5A" : C.Y);
    g.mod.ICON?.(c, g.cx, y + 42, a * (1 - 0.45 * nope));
    const s = 2, w = c.measure(MAIN, g.label, { scale: s }), q = fade(c, a);
    q.text(MAIN, g.label, R(g.cx - w / 2) + 1, y + GUESS_H - 24 + 1, C.O, { scale: s }); q.text(MAIN, g.label, R(g.cx - w / 2), y + GUESS_H - 24, nope > 0.5 ? mix(C.IV, "#FF8A8A", nope) : C.IV, { scale: s });
    // the × stamp: drops in big and settles (scale 9 → 6), red with a dark outline
    if (nope > 0) {
      const st = R(6 + 3 * (1 - ease(nope))), xw = c.measure(MAIN, "×", { scale: st }), xx = R(g.cx - xw / 2), yy = R(y + 40 - (7 * st) / 2), f = fade(c, a * sm(t, NOPE(i), NOPE(i) + 0.06));
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [2, 2]]) f.text(MAIN, "×", xx + dx, yy + dy, C.O, { scale: st });
      f.text(MAIN, "×", xx, yy, "#FF4A4A", { scale: st });
    }
  });
}

// ---------------------------------------------------------------- share / follow card
export const CARD = { x: 36, y: 96, w: 468, h: 170, in: EV.liked - 0.12 };
const SEND = { x: 58, y: 158, w: 196, h: 46 }, FOLLOW = { x: 286, y: 158, w: 196, h: 46 };
export const PLANE = [EV.send + 0.05, EV.send + 1.25];         // the paper plane's flight (seconds)
export const CLICK = EV.follow + 0.02;                          // the hand taps FOLLOW
export const HAND = [EV.follow - 0.55, CLICK, EV.follow + 0.75]; // slide in → tap → slide out
export const BELL = [EV.miss, EV.miss + 0.7];

function button(c, b, label, col, a, press, icon) {
  const g = fade(c, a), y = b.y + R(press * 3);
  g.rrect(b.x, b.y + 5, b.w, b.h, mix(col, "#000000", 0.55), 3);                 // the button's shadow/base
  g.rrect(b.x, y, b.w, b.h, mix(col, "#000000", 0.25), 3); g.rrect(b.x + 2, y + 2, b.w - 4, b.h - 6, col, 2);
  g.rect(b.x + 6, y + 3, b.w - 12, 1, mix(col, "#FFFFFF", 0.45));
  const s = 2, w = c.measure(MAIN, label, { scale: s }) + (icon ? 30 : 0), x0 = R(b.x + (b.w - w) / 2);
  if (icon) icon(g, x0 + 10, y + R(b.h / 2) - 3);
  g.text(MAIN, label, x0 + (icon ? 30 : 0) + 1, y + 16, C.O, { scale: s }); g.text(MAIN, label, x0 + (icon ? 30 : 0), y + 15, C.IV, { scale: s });
}
/** Paper plane centred at (x, y), pointing along angle ang (radians), size s. */
function plane(c, x, y, ang, s = 1, col = "#FDFEED") {
  const P = (u, v) => [R(x + (u * Math.cos(ang) - v * Math.sin(ang)) * s), R(y + (u * Math.sin(ang) + v * Math.cos(ang)) * s)];
  const nose = P(9, 0), wingL = P(-7, -7), tail = P(-4, 0), wingR = P(-7, 6), keel = P(-6, 2);
  c.poly([nose, wingL, tail], "#0B0812"); c.poly([nose, wingR, tail], "#0B0812");
  const inset = (p, q, k) => [R(p[0] + (q[0] - p[0]) * k), R(p[1] + (q[1] - p[1]) * k)];
  c.poly([inset(nose, tail, 0.08), inset(wingL, tail, 0.12), tail], col); c.poly([inset(nose, tail, 0.08), inset(wingR, tail, 0.12), tail], mix(col, "#9A8AD8", 0.4));
  c.poly([inset(nose, tail, 0.1), keel, tail], mix(col, "#6A5AA8", 0.5));
}
const planeIcon = (g, x, y) => plane(g, x, y, -0.35, 1.05);
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

function shareCard(c, t) {
  if (t < CARD.in) return;
  const k = clamp01((t - CARD.in) / 0.35), a = sm(k, 0, 0.7), y0 = R((1 - back(k)) * -16);
  panel(c, CARD.x, CARD.y + y0, CARD.w, CARD.h, a, C.Y);
  const g = fade(c, a), title = "LIKED IT?", s = 3, tw = c.measure(MAIN, title, { scale: s }), tx = R(270 - tw / 2), ty = CARD.y + 16 + y0;
  for (const [dx, dy] of [[1, 1], [2, 2]]) g.text(MAIN, title, tx + dx, ty + dy, C.O, { scale: s });
  g.text(MAIN, title, tx, ty, C.Y, { scale: s });
  // SEND button: appears with the card, pressed on "Send", launches the plane; "TO A FRIEND" under it on "friend"
  const sp = sm(t, EV.send - 0.04, EV.send + 0.04) * (1 - sm(t, EV.send + 0.12, EV.send + 0.24));
  const shift = (b) => ({ ...b, y: b.y + y0 });
  button(c, shift(SEND), "SEND", "#3C7AD0", a * sm(t, CARD.in + 0.1, CARD.in + 0.4), sp, (gg, x, y) => { if (t < PLANE[0]) planeIcon(gg, x, y); });
  const fa = sm(t, EV.friend - 0.05, EV.friend + 0.25);
  if (fa > 0) { const ff = fade(c, a * fa), lab = "TO A FRIEND", lw = c.measure(TINY, lab, { scale: 2 }); ff.text(TINY, lab, R(SEND.x + SEND.w / 2 - lw / 2), SEND.y + SEND.h + 12 + y0, "#B8D8FF", { scale: 2 }); }
  // FOLLOW → FOLLOWING ✓ (crossfade on the tap), with a sparkle burst
  const fol = sm(t, CLICK + 0.04, CLICK + 0.3), fp = sm(t, CLICK - 0.05, CLICK) * (1 - sm(t, CLICK + 0.1, CLICK + 0.22)), ba = a * sm(t, CARD.in + 0.2, CARD.in + 0.5);
  if (fol < 1) button(c, shift(FOLLOW), "FOLLOW", "#8D59DA", ba * (1 - fol), fp, plusIcon);
  if (fol > 0) button(c, shift(FOLLOW), "FOLLOWING ✓", "#4A4268", ba * fol, fp, null);
  if (t > CLICK && t < CLICK + 0.7) for (let i = 0; i < 10; i++) {
    const u = (t - CLICK) / 0.7, ang = (i / 10) * Math.PI * 2 + 0.3, r = 26 + 40 * ease(u), x = R(FOLLOW.x + FOLLOW.w / 2 + Math.cos(ang) * r * 1.6), y = R(FOLLOW.y + FOLLOW.h / 2 + y0 + Math.sin(ang) * r * 0.7);
    fade(c, a * (1 - u)).rect(x - 1, y - 1, 3, 3, i % 2 ? C.Y : "#FDFEED");
  }
  if (fa > 0 || fol > 0) { const sub = "NEXT ONE SOON", sa = sm(t, EV.miss - 0.1, EV.miss + 0.25), sw = c.measure(TINY, sub, { scale: 2 }); if (sa > 0) fade(c, a * sa).text(TINY, sub, R(FOLLOW.x + FOLLOW.w / 2 - sw / 2), FOLLOW.y + FOLLOW.h + 12 + y0, "#E0CDF8", { scale: 2 }); }
  // the bell rings on "miss" (top right corner of the card)
  const ring = t > BELL[0] && t < BELL[1] ? Math.sin((t - BELL[0]) * 34) * 0.45 * (1 - (t - BELL[0]) / (BELL[1] - BELL[0])) : 0;
  bell(c, CARD.x + CARD.w - 26, CARD.y + 26 + y0, ring, a * sm(t, EV.follow, EV.follow + 0.3));
  // the hand: slides in from the bottom right, taps FOLLOW, slides away
  if (t > HAND[0] && t < HAND[2]) {
    const tipX = FOLLOW.x + FOLLOW.w * 0.62, tipY = FOLLOW.y + FOLLOW.h * 0.55 + y0;
    const kin = ease(clamp01((t - HAND[0]) / (CLICK - HAND[0]))), kout = ease(clamp01((t - CLICK - 0.25) / (HAND[2] - CLICK - 0.25)));
    const x = R(tipX + (1 - kin) * 70 + kout * 80), y = R(tipY + (1 - kin) * 60 + kout * 70), pr = sm(t, CLICK - 0.06, CLICK) * (1 - sm(t, CLICK + 0.08, CLICK + 0.2));
    hand(c, x, y, pr, a * Math.min(sm(t, HAND[0], HAND[0] + 0.15), 1 - sm(t, HAND[2] - 0.2, HAND[2])));
  }
  // the paper plane: launches from the SEND button in an arc up and off the top right, leaving a dotted trail
  if (t > PLANE[0] && t < PLANE[1] + 0.6) {
    const path = (u) => { const x0 = SEND.x + 40, y0p = SEND.y + 20 + y0, x1 = 600, y1 = 30; return [x0 + (x1 - x0) * u + Math.sin(u * Math.PI) * -30, y0p + (y1 - y0p) * u * u - Math.sin(u * Math.PI) * 60]; };
    const u = clamp01((t - PLANE[0]) / (PLANE[1] - PLANE[0])), e = ease(u);
    for (let q = 0; q < 14; q++) { const uu = e - q * 0.035; if (uu <= 0) break; const [x, y] = path(uu), ta = a * (1 - q / 14) * (1 - sm(t, PLANE[1], PLANE[1] + 0.6)); if (q % 2 === 0 && ta > bayer(R(x), R(y))) c.rect(R(x) - 1, R(y) - 1, 2, 2, "#FDFEED"); }
    if (u < 1) { const [x, y] = path(e), [x2, y2] = path(Math.min(1, e + 0.02)); plane(fade(c, a), x, y, Math.atan2(y2 - y, x2 - x), 1.6 + 0.6 * Math.sin(u * Math.PI)); }
  }
}

export function hud(c, V, t) { guessCards(c, t); shareCard(c, t); }
