// The side service unit of the main machine (our drawing, no maker marks): the play counter (rolls like an odometer:
// 06→07 on the first coin, 08, 09…12 when "its number comes up", 12→00 on "zero", 01 for the next player), the service
// door (the owner's hand turns a key, the door swings open on its hinge), the settings LCD (pages crossfade: SETTINGS
// WIN RATE 1 / 100 → PRIZE MATH PLAY $1 · PRIZE $3 · PAYOUT 33% → ≈1 WIN / 9 PLAYS → GRIP VOLTS graph → MODE RANDOM
// with a tumbling die → MODE FIXED · WIN AT 12 · RESET AFTER WIN → GRIP VOLTS replay), the MODE slide switch, and the
// CLAW POWER gauge (needle 0–50 V, 10 V weak zone, 48 V full zone, digital readout, THIS PLAY: WEAK / FULL).
import { mix, bayer, fade, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { sm, ease, win, C } from "./cute.mjs";
import { METAL } from "./arcade.mjs";
import { hand, needle, volt, KEYHOLE } from "./claw.mjs";
import { EV, END, COUNTER, HEAD, LCD, GAUGE, COUNT, PAGES, MODE, DOOR_T, GRABS, track } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const { G1, G2, G3 } = GRABS;
export const MAINX = { ...MAIN, space: 1, glyphs: { ...MAIN.glyphs, "≈": [".....", ".##.#", "#.##.", ".....", ".##.#", "#.##.", "....."] } };
const LC = { bg: "#071510", line: "#0B1E17", txt: "#86F2B0", dim: "#2A6448", hd: "#F4CA50", warn: "#F59A3A", red: "#FF6A5A" };
const clipText = (c, font, s, x, y, col, scale, a, box) => c.text(font, s, x, y, col, { scale, colorAt: (X, Y) => (X < box[0] || X >= box[2] || Y < box[1] || Y >= box[3] || (a < 1 && a <= bayer(X, Y)) ? null : col) });

// ---------------------------------------------------------------- play counter
export const countAt = (t) => track(COUNT, t);
function counter(c, t, ox) {
  const B = COUNTER, x0 = B.x + ox, v = countAt(t);
  c.rrect(x0 + 6, B.y + 6, B.w - 12, B.h - 12, "#07060E", 2); c.rrect(x0 + 7, B.y + 7, B.w - 14, B.h - 14, "#1A0608", 2);
  // glow: brighter on 12/12 (a win is due), soft breathing at the end
  const due = win(t, EV.comes + 0.2, EV.some + 0.3, 0.3, 0.4), breathe = t > EV.follow - 0.3 ? 0.25 * (1 - Math.cos((t - EV.follow + 0.3) * 4.2)) * sm(t, EV.follow - 0.3, EV.follow + 0.2) : 0;
  const col = mix(mix("#FF6A3A", "#FFE070", due), "#7A2A18", breathe), dim = "#3A1010";
  c.text(TINY, "PLAYS", x0 + 16, B.y + 22, mix("#7A3A20", col, 0.5), { scale: 2 });
  const DX = x0 + 74, DY = B.y + 17, s = 3, cell = 26, box = [DX - 2, DY - 2, DX + 60, DY + 23];
  c.text(MAIN, "88", DX, DY, dim, { scale: s });
  // odometer roll: units and (only while the units pass 9→0) tens
  const units = ((v % 10) + 10) % 10, u0 = Math.floor(units), fu = units - u0, tensV = Math.floor(v / 10) + (u0 === 9 ? fu : 0), t0 = Math.floor(tensV), ft = tensV - t0;
  const dig = (val, frac, x) => { for (const [d, off] of [[val, -frac], [(val + 1) % 10, 1 - frac]]) { const yy = R(DY + off * cell); if (Math.abs(off) < 1) clipText(c, MAIN, String(d), x, yy, col, s, 1, box); } };
  dig(t0 % 10, ft, DX); dig(u0, fu, DX + 18);
  c.text(MAIN, "/12", DX + 38, DY + 6, mix("#7A3A20", col, 0.6), { scale: 2 });
}

// ---------------------------------------------------------------- the LCD
function pageAlpha(p, t) { return Math.min(sm(t, p.t0, p.t0 + 0.3), 1 - sm(t, p.t1, p.t1 + 0.3)); }
function header(g, txt, x, y) { g.text(MAIN, txt, x, y, LC.hd, { scale: 2 }); g.rect(x, y + 17, LCD.w - 16, 1, LC.dim); }
function graphTrace(g, t, tA, tB, x0, x1, col, upto) {
  const y = (v) => R(LCD.y + 106 - v * 1.58);
  let px = null, py = null;
  for (let X = x0; X <= x1; X++) { const tt = tA + ((X - x0) / (x1 - x0)) * (tB - tA); if (tt > upto) break; const Y = y(needle(tt)); if (px !== null) g.line(px, py, X, Y, col); g.px(X, Y - 1, col); px = X; py = Y; }
  return px === null ? null : [px, py];
}
function lcd(c, t, ox) {
  const x0 = LCD.x + ox, y0 = LCD.y;
  for (let y = y0; y < y0 + LCD.h; y++) c.rect(x0, y, LCD.w, 1, y % 2 ? LC.bg : LC.line);
  const boot = sm(t, DOOR_T.open[0] + 0.2, DOOR_T.open[1] + 0.3); if (boot <= 0) return;
  const L = x0 + 8;
  for (const p of PAGES) {
    const a = pageAlpha(p, t) * boot; if (a <= 0) continue; const g = fade(c, a);
    if (p.id === "settings") {
      header(g, "SETTINGS", L, y0 + 6);
      fade(g, sm(t, EV.sets, EV.sets + 0.3)).text(MAIN, "WIN RATE", L, y0 + 32, LC.txt, { scale: 2 });
      fade(g, sm(t, EV.one2 - 0.05, EV.one2 + 0.2)).text(MAIN, "1", L + 6, y0 + 58, "#FFFFFF", { scale: 4 });
      fade(g, sm(t, EV.hundred - 0.05, EV.hundred + 0.25)).text(MAIN, "/ 100", L + 34, y0 + 58, "#FFFFFF", { scale: 4 });
      fade(g, sm(t, EV.games - 0.05, EV.games + 0.3)).text(TINY, "1 WIN PER 100 GAMES", L, y0 + 98, LC.txt, { scale: 2 });
    } else if (p.id === "payout") {
      header(g, "PRIZE MATH", L, y0 + 6);
      const row = (k, lab, val, tt) => { const f = fade(g, sm(t, tt - 0.05, tt + 0.25)), yy = y0 + 30 + k * 19; f.text(MAIN, lab, L, yy, LC.txt, { scale: 2 }); f.text(MAIN, val, x0 + LCD.w - 8 - c.measure(MAIN, val, { scale: 2 }), yy, "#FFFFFF", { scale: 2 }); };
      row(0, "PLAY", "$1", EV.play1); row(1, "PRIZE", "$3", EV.prize1); row(2, "PAYOUT", "33%", EV.then1);
      const ra = sm(t, EV.math - 0.1, EV.math + 0.25), f = fade(g, ra), s = "≈1 WIN / 9 PLAYS", w = c.measure(MAINX, s, { scale: 2 }), yy = y0 + 92;
      f.rect(L - 4, yy - 4, LCD.w - 8, 22, mix(LC.bg, LC.hd, 0.22 + 0.3 * win(t, EV.math, EV.math + 0.6, 0.15, 0.6))); f.text(MAINX, s, R(x0 + LCD.w / 2 - w / 2), yy, LC.hd, { scale: 2 });
    } else if (p.id === "graph" || p.id === "graph3") {
      header(g, "GRIP VOLTS", L, y0 + 6);
      const gx0 = L + 22, gx1 = x0 + LCD.w - 8, yv = (v) => R(y0 + 106 - v * 1.58);
      for (const [v, col, lab] of [[48, "#65DA41", "48"], [10, LC.warn, "10"]]) { for (let X = gx0; X < gx1; X += 4) { g.px(X, yv(v), mix(LC.bg, col, 0.55)); g.px(X + 1, yv(v), mix(LC.bg, col, 0.55)); } g.text(TINY, lab, L, yv(v) - 4, col, { scale: 2 }); }
      g.rect(gx0, y0 + 26, 1, 81, LC.dim); g.rect(gx0, y0 + 106, gx1 - gx0, 1, LC.dim);
      if (p.id === "graph") {
        const a1 = 1 - sm(t, EV.number - 0.2, EV.number + 0.3); if (a1 > 0) { const tip = graphTrace(fade(g, a1), t, G1.shut - 0.45, EV.itselfEnd + 0.6, gx0 + 2, gx1, LC.warn, t); if (tip && t < EV.itselfEnd + 0.6) fade(g, a1).rect(tip[0] - 1, tip[1] - 2, 3, 3, "#FFFFFF");
          const sa = a1 * sm(t, EV.slip, EV.slip + 0.3); if (sa > 0) fade(g, sa).text(TINY, "SLIPS", gx1 - 40, yv(10) + 6, LC.warn, { scale: 2 }); }
        const a2 = sm(t, G2.shut - 0.5, G2.shut - 0.3); if (a2 > 0) { const tip = graphTrace(fade(g, a2), t, G2.shut - 0.45, G2.drop + 0.6, gx0 + 2, gx1, "#65DA41", t); if (tip && t < G2.drop + 0.6) fade(g, a2).rect(tip[0] - 1, tip[1] - 2, 3, 3, "#FFFFFF");
          const ha = a2 * sm(t, EV.holds, EV.holds + 0.3); if (ha > 0) fade(g, ha).text(TINY, "HOLDS", gx1 - 40, yv(48) - 12, "#65DA41", { scale: 2 }); }
      } else {
        const tip = graphTrace(g, t, G3.shut - 0.4, EV.its + 0.4, gx0 + 2, gx1, LC.warn, t); if (tip && t < EV.its + 0.4) g.rect(tip[0] - 1, tip[1] - 2, 3, 3, "#FFFFFF");
        const la = sm(t, EV.limp - 0.05, EV.limp + 0.3); if (la > 0) fade(g, la).text(TINY, "LIMP", gx1 - 32, yv(10) + 6, LC.warn, { scale: 2 });
      }
    } else if (p.id === "random") {
      header(g, "MODE", L, y0 + 6);
      g.text(MAIN, "RANDOM", L, y0 + 40, "#FFFFFF", { scale: 3 });
      fade(g, sm(t, EV.random - 0.1, EV.random + 0.3)).text(TINY, "ANY PLAY CAN WIN", L, y0 + 76, LC.txt, { scale: 2 });
      die(g, x0 + LCD.w - 26, y0 + 50, t);
    } else if (p.id === "fixed") {
      header(g, "MODE", L, y0 + 6);
      g.text(MAIN, "FIXED", L, y0 + 30, "#FFFFFF", { scale: 3 });
      fade(g, sm(t, EV.count - 0.1, EV.count + 0.25)).text(MAIN, "WIN AT 12", L, y0 + 62, LC.txt, { scale: 2 });
      fade(g, sm(t, EV.zero - 0.2, EV.zero + 0.2)).text(TINY, "THEN BACK TO 0", L, y0 + 88, LC.warn, { scale: 2 });
    }
  }
}
/** A tumbling pixel die: the square turns, its face swaps (crossfade) while it is edge-on. */
function die(g, cx, cy, t) {
  const r0 = EV.pick, r1 = EV.random + 0.45, k = clamp01((t - r0) / (r1 - r0)), ang = ease(k) * Math.PI * 4.5 + 0.2, s = 13;
  const face = (n) => ({ 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] })[n];
  const q = (ang / (Math.PI / 2)), qi = Math.floor(q), fq = q - qi, A = [3, 5, 2, 6, 1, 4, 5, 3, 6, 2][qi % 10], B = [3, 5, 2, 6, 1, 4, 5, 3, 6, 2][(qi + 1) % 10];
  const P = (u, v) => [R(cx + u * Math.cos(ang) - v * Math.sin(ang)), R(cy - Math.abs(Math.sin(k * Math.PI * 3)) * 8 * (1 - k) + u * Math.sin(ang) + v * Math.cos(ang))];
  g.poly([P(-s - 1, -s - 1), P(s + 1, -s - 1), P(s + 1, s + 1), P(-s - 1, s + 1)], "#07060E"); g.poly([P(-s, -s), P(s, -s), P(s, s), P(-s, s)], "#FDFEED");
  const mixF = sm(fq, 0.4, 0.6);
  for (const [n, aa] of [[A, 1 - mixF], [B, mixF]]) { if (aa <= 0) continue; const f = fade(g, aa); for (const [u, v] of face(n)) { const [x, y] = P(u * 7, v * 7); f.rect(x - 1, y - 1, 3, 3, "#C8202C"); } }
}

// ---------------------------------------------------------------- MODE switch (slide)
function modeSwitch(c, t, ox) {
  const x0 = HEAD.x + ox + 10, y0 = HEAD.y + HEAD.h - 46, w = HEAD.w - 20, m = track(MODE, t);
  c.rrect(x0, y0, w, 18, "#07060E", 3); c.rrect(x0 + 1, y0 + 1, w - 2, 16, METAL[1], 3); c.text(TINY, "MODE", R(x0 + w / 2 - 15), y0 + 5, METAL[4], { scale: 2 });
  const kx = R(x0 + 3 + m * (w - 36)); c.rrect(kx, y0 + 2, 30, 14, "#07060E", 2); c.rrect(kx + 1, y0 + 2, 28, 12, METAL[5], 2); c.rect(kx + 3, y0 + 3, 24, 1, METAL[6]); for (let i = 0; i < 3; i++) c.rect(kx + 10 + i * 4, y0 + 6, 1, 6, METAL[2]);
  const lab = (txt, x, on) => { c.disc(x, y0 + 30, 3, mix("#123018", "#65DA41", on)); c.text(TINY, txt, x + 7, y0 + 26, mix("#4A5A70", "#FDFEED", on), { scale: 2 }); };
  lab("RANDOM", x0 + 6, 1 - m); lab("FIXED", x0 + w - 52, m);
}

// ---------------------------------------------------------------- service door (over the head)
function door(c, t, ox) {
  const k = ease(clamp01((t - DOOR_T.open[0]) / (DOOR_T.open[1] - DOOR_T.open[0])));
  const th = k * 1.48, w = Math.max(4, R(HEAD.w * Math.cos(th))), grow = R(8 * Math.sin(th)), x0 = HEAD.x + ox - 2, y0 = HEAD.y - 2, h = HEAD.h + 4;
  // a trapezoid: the free edge comes toward us (taller) as it swings
  for (let i = 0; i < w; i++) { const u = i / Math.max(1, w - 1), ex = R(grow * u), shade = 0.2 + 0.5 * k * u; c.rect(x0 + i, y0 - ex, 1, h + 2 * ex, mix(i < 2 || i > w - 3 ? METAL[0] : METAL[3], "#07060E", shade)); }
  if (k < 0.35) { const g = fade(c, 1 - k / 0.35); g.text(TINY, "SERVICE", x0 + 14, y0 + 14, METAL[5], { scale: 2 }); g.rect(x0 + 14, y0 + 28, 60, 1, METAL[1]);
    for (let j = 0; j < 6; j++) g.rect(x0 + 14, y0 + 60 + j * 14, w * 0.55, 3, METAL[2]);
    const kx = KEYHOLE.x + ox, ky = KEYHOLE.y; g.disc(kx, ky, 7, METAL[1]); g.disc(kx, ky, 6, METAL[5]); g.disc(kx, ky - 1, 2, "#07060E"); g.rect(kx - 1, ky, 2, 4, "#07060E"); }
}
function ownerHand(c, t, ox) {
  if (t < DOOR_T.hand[0] || t > DOOR_T.out[1]) return;
  const kin = ease(clamp01((t - DOOR_T.hand[0]) / (DOOR_T.hand[1] - DOOR_T.hand[0]))), kout = ease(clamp01((t - DOOR_T.out[0]) / (DOOR_T.out[1] - DOOR_T.out[0])));
  const turn = ease(clamp01((t - DOOR_T.turn[0]) / (DOOR_T.turn[1] - DOOR_T.turn[0]))) * (1 - sm(t, DOOR_T.out[0], DOOR_T.out[0] + 0.15));
  const x = KEYHOLE.x + ox + 12 + (1 - kin) * 70 + kout * 90, y = KEYHOLE.y + 6 + (1 - kin) * 10 - kout * 10, a = Math.min(sm(t, DOOR_T.hand[0], DOOR_T.hand[0] + 0.2), 1 - sm(t, DOOR_T.out[1] - 0.25, DOOR_T.out[1]));
  keyDraw(c, x - 4, y - 6, turn, a);
  hand(c, x, y - 4, a, "owner", 0.8);
}
function keyDraw(c, x, y, turn, a) {   // key: blade to the left into the lock, bow under the fingers; turning squashes the bow (edge-on)
  const g = fade(c, a), bw = Math.max(1, R(6 * Math.cos(turn * Math.PI / 2)));
  g.rect(R(x - 16), R(y - 1), 14, 3, "#07060E"); g.rect(R(x - 15), R(y), 12, 1, "#F4CA50"); g.rect(R(x - 13), R(y + 1), 2, 3, "#B88A20");
  g.ellipse(R(x + 2), R(y), bw + 1, 7, "#5A3A08"); g.ellipse(R(x + 2), R(y), bw, 6, "#F4CA50");
}

// ---------------------------------------------------------------- CLAW POWER gauge
function gauge(c, t, ox) {
  const B = GAUGE, x0 = B.x + ox, lit = sm(t, EV.on1 - 0.25, EV.on1 + 0.3), cx = x0 + 61, cy = B.y + 104, r = 46;
  c.rrect(x0 + 6, B.y + 6, B.w - 12, 116, "#07060E", 3); c.rrect(x0 + 7, B.y + 7, B.w - 14, 114, mix("#4A4436", "#F2EAD0", 0.25 + 0.75 * lit), 3);
  const ink = "#1A1426"; c.text(TINY, "CLAW POWER", R(cx - 39), B.y + 14, ink, { scale: 2 });
  const ang = (v) => Math.PI * (1 - v / 50), P = (v, rr) => [cx + Math.cos(ang(v)) * rr, cy - Math.sin(ang(v)) * rr];
  // zones: weak (0–10) amber, full (40–50) green
  for (let v = 0; v <= 50; v += 0.25) { const col = v <= 10 ? "#F59A3A" : v >= 40 ? "#3AA83A" : null; if (!col) continue; for (let rr = r - 6; rr <= r - 2; rr++) { const [x, y] = P(v, rr); c.px(R(x), R(y), mix("#6A5A40", col, 0.3 + 0.7 * lit)); } }
  for (let v = 0; v <= 50; v += 5) { const [xa, ya] = P(v, r - (v % 10 ? 4 : 8)), [xb, yb] = P(v, r); c.line(R(xa), R(ya), R(xb), R(yb), ink); }
  for (const [v, lab] of [[10, "10"], [48, "48"]]) { const [x, y] = P(v, r - 17); c.text(TINY, lab, R(x - 6), R(y - 4), v === 10 ? "#A04A08" : "#1E6A1E", { scale: 2 }); }
  // needle
  const nv = Math.max(0, needle(t)), [nx, ny] = P(nv, r - 4); c.line(cx, cy, R(nx), R(ny), "#C8202C"); c.line(cx + 1, cy, R(nx) + 1, R(ny), "#C8202C"); c.disc(cx, cy, 4, ink); c.disc(cx, cy, 2, "#C8202C");
  // readout + this play's power
  const ry = B.y + 128; c.rrect(x0 + 10, ry, B.w - 20, 30, "#07060E", 2); c.rrect(x0 + 11, ry + 1, B.w - 22, 28, "#160A0A", 2);
  const val = String(R(nv)).padStart(2, " ") + " V", vw = c.measure(MAIN, val, { scale: 3 }); fade(c, 0.25 + 0.75 * lit).text(MAIN, val, R(cx - vw / 2), ry + 5, nv > 30 ? "#7CF070" : nv > 0.5 ? "#FFB040" : "#7A4A30", { scale: 3 });
  const full = win(t, EV.number + 0.2, G2.drop + 0.4, 0.3, 0.4), st = sm(t, EV.on1 - 0.1, EV.weak1 + 0.1);
  if (st > 0) { fade(c, st).text(TINY, "THIS PLAY", x0 + 12, ry + 38, METAL[5], { scale: 2 });
    if (full < 1) fade(c, st * (1 - full)).text(MAIN, "WEAK", x0 + 12, ry + 52, "#FFB040", { scale: 2 });
    if (full > 0) fade(c, full).text(MAIN, "FULL", x0 + 12, ry + 52, "#7CF070", { scale: 2 }); }
  // "It's the setting.": a pulsing frame around the readout and the WEAK line
  const hl = win(t, EV.its - 0.1, END, 0.25, 0.3); if (hl > 0) { const k = 0.75 + 0.25 * Math.sin((t - EV.its) * 6), g = fade(c, hl); for (let i = 0; i < 3; i++) g.rframe(x0 + 6 + i, ry - 4 + i, B.w - 12 - 2 * i, 78 - 2 * i, mix("#7A4A08", "#FFD860", i === 1 ? k : k * 0.6), 2); }
  if (lit < 1) c.tint(x0 + 7, B.y + 7, B.w - 14, 114, () => 0.5 * (1 - lit), "#07060E", 4);
}

// ---------------------------------------------------------------- WORST TIME tag (slides down from under the counter)
function worst(c, t, ox) {
  const k = ease(clamp01((t - (EV.worst - 0.25)) / 0.4)), a = Math.min(k, 1 - sm(t, EV.but - 0.2, EV.but + 0.2)); if (a <= 0) return;
  const g = fade(c, a), w = 150, x = COUNTER.x + ox + (COUNTER.w - w) / 2, y = R(COUNTER.y + COUNTER.h - 22 + 26 * k);
  g.rrect(x, y, w, 24, "#3A0610", 3); g.rrect(x + 1, y + 1, w - 2, 22, "#C8202C", 3); g.rect(x + 4, y + 2, w - 8, 1, "#FF7A70");
  const s = "WORST TIME", sw = c.measure(MAIN, s, { scale: 2 }); g.text(MAIN, s, R(x + w / 2 - sw / 2), y + 6, "#3A0610", { scale: 2 }); g.text(MAIN, s, R(x + w / 2 - sw / 2), y + 5, "#FDFEED", { scale: 2 });
}

export function panelBack(c, t, P) {
  const ox = -P; if (ox < -520) return;
  lcd(c, t, ox); modeSwitch(c, t, ox); door(c, t, ox); gauge(c, t, ox); counter(c, t, ox);
}
export function panelFront(c, t, P) { const ox = -P; if (ox < -520) return; worst(c, t, ox); ownerHand(c, t, ox); }
