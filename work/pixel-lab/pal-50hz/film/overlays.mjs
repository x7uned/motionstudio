// Explainer overlays for «In Europe, your games ran slower» (our pixel fonts, few words). Every number shown is computed
// from the same step clock as the pictures (game.mjs), so 60 vs 50 is exact on screen:
//   hook race bar (two lanes, the Europe hedgehog falls behind) · «-17% SLOWER» · waves flowing from the sockets into the
//   TVs (one crest = one picture, slowed 24×) · 60 HZ / 50 HZ · film strips (one step per picture) + a 1-second count to
//   60 and 50 · «1991» · SLOWER · music notes at each game's tempo · the game clocks · fast-forward to the 0:59 goal with
//   real-time stopwatches (0:59 vs 1:10) · BLACK BARS · the kid's happy bubble · cartridges PAL OK ✓ / 50 HZ · the 60
//   switch · «1999». Room signs USA · JAPAN | EUROPE are part of the wall.
import { fade, mix, MAIN, TINY, bayer } from "../../../../renderer/pixel/raster.mjs";
import { C, panel, tag } from "./cute.mjs";
import { X, Y, wr, wrr, picRect, PIC, S_PIC, SOCKET, CABLE, MIRROR, switchWorld, swFlip, swDrop, lidOpen, squash, SQ, CONSOLE, KIDPOS } from "./room.mjs";
import { steps, stepsRaw, phi, ffw, fmt, gameClock, GOAL_T, ICON, rate, GW, GH } from "./game.mjs";
import { EV, RACE, WAVE, HZ, STRIP, Y91, SLOW, NOTES, CLK, FF, WATCH, ACT2, BARS, KID, CARTS, MOD, DC, sm, ease } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const win = (t, a, b, fi = 0.25, fo = 0.25) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const USA = C.Y, EU = C.CY;

function pill(c, text, cx, y, a, col = C.Y, scale = 2, font = MAIN) {
  if (a <= 0) return; const g = fade(c, a), h = font === MAIN ? 7 * scale + 8 : 5 * scale + 8, w = c.measure(font, text, { scale }) + 20, x = R(cx - w / 2);
  g.rrect(x, R(y), w, h, col, 2); g.rrect(x + 2, R(y) + 2, w - 4, h - 4, C.CARD, 2); g.text(font, text, x + 10, R(y) + 4, col, { scale });
  return { x, w, h };
}
function popPill(c, text, cx, y, t, a0, a1, col, scale = 2) { const a = win(t, a0, a1, 0.2, 0.25); if (a <= 0) return; pill(c, text, cx, y + (1 - back((t - a0) / 0.32)) * 6, a, col, scale); }
function frameBox(c, x0, y0, x1, y1, col, a, w = 2) {
  if (a <= 0) return; const g = fade(c, a); x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1);
  g.rect(x0 - w, y0 - w, x1 - x0 + 2 * w, w, col); g.rect(x0 - w, y1, x1 - x0 + 2 * w, w, col); g.rect(x0 - w, y0, w, y1 - y0, col); g.rect(x1, y0, w, y1 - y0, col);
}
function icon(c, x, y, a, s = 1, frame = null) {
  if (a <= 0) return; const g = fade(c, a); ICON.rows(frame).forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== ".") g.rect(R(x + i * s), R(y + j * s), s, s, ICON.pal[ch]); }));
}
/** Screen rect of a game-pixel rect on one TV (respecting the Europe squash). */
function gameRect(V, side, t, u0, v0, u1, v1) {
  const G = picRect(side), q = side === "R" ? squash(t) * SQ : 0, sy = S_PIC * (1 - q), oy = G.y0 + (S_PIC - sy) * GH / 2;
  return [X(V, G.x0 + u0 * S_PIC), Y(V, oy + v0 * sy), X(V, G.x0 + u1 * S_PIC), Y(V, oy + v1 * sy)];
}
const roomCx = (side) => MIRROR[side](137);
const clipX = (c, lo, hi) => { const o = Object.create(c); o.px = (x, y, col) => { if (x >= lo && x < hi) c.px(x, y, col); }; return o; };

// ---------------------------------------------------------------- room signs (on the wall, part of the world)
function worldText(c, V, font, str, wx, wy, ps, col) {   // glyph pixels as world rects: scales smoothly with the camera
  let cx = wx;
  for (const ch of str.toUpperCase()) { if (ch === " ") { cx += (font.space + 1) * ps; continue; } const g = font.glyphs[ch] ?? font.glyphs["?"];
    g.forEach((row, j) => [...row].forEach((p, i) => { if (p === "#") wr(c, V, cx + i * ps, wy + j * ps, cx + (i + 1) * ps, wy + (j + 1) * ps, col); }));
    cx += (g[0].length + 1) * ps; }
}
function signs(c, V, t) {
  for (const [side, text, col] of [["L", "USA · JAPAN", USA], ["R", "EUROPE", EU]]) {
    const cx = roomCx(side), y = 96, ps = 2, w = c.measure(MAIN, text, { scale: ps }) + 8 * ps, h = 13 * ps, x = cx - w / 2;
    if (Y(V, y + h) < 0 || Y(V, y) > 960) continue;
    wrr(c, V, x, y, x + w, y + h, 2, "#1A1020"); wrr(c, V, x + 1, y + 1, x + w - 1, y + h - 1, 2, "#5A3A26"); wrr(c, V, x + 2, y + 2, x + w - 2, y + h - 2, 2, "#7A5034"); wr(c, V, x + 3, y + 3, x + w - 3, y + 4, "#9A6A44");
    worldText(c, V, MAIN, text, x + 4 * ps, y + 3 * ps + 1, ps, "#1A1020"); worldText(c, V, MAIN, text, x + 4 * ps, y + 3 * ps, ps, col);
  }
}

// ---------------------------------------------------------------- hook: race bar (one level, two lanes)
const TRACK = { x0: 60, x1: 456, D: 900 };
function race(c, V, t) {
  const a = Math.min(sm(t, RACE.in, RACE.in + 0.35), 1 - sm(t, RACE.out0, RACE.out1)); if (a <= 0) return;
  const y0 = R(Y(V, 128)); panel(c, 40, y0, 460, 100, a, C.L); const g = fade(c, a);
  for (const [i, side, label, col] of [[0, "L", "USA · JAPAN", USA], [1, "R", "EUROPE", EU]]) {
    const ly = y0 + 8 + i * 46; g.text(MAIN, label, 56, ly, col, { scale: 2 });
    const ty = ly + 32; for (let x = TRACK.x0; x < TRACK.x1; x += 8) g.rect(x, ty, 4, 3, mix(col, C.CARD, 0.55));
    const p = clamp01(steps(side, t) / TRACK.D), x = TRACK.x0 + (TRACK.x1 - TRACK.x0) * p;
    g.rect(TRACK.x0, ty, R(x - TRACK.x0), 3, col);
    icon(c, R(x - 12), ty - 22, a, 2, Math.floor(steps(side, t) / 5) & 3);
  }
  // goal flag at the end of the track
  for (let j = 0; j < 6; j++) for (let i = 0; i < 6; i++) g.rect(TRACK.x1 + 6 + i * 3, y0 + 30 + j * 3, 3, 3, (i + j) % 2 ? "#FDFEED" : "#16121C"); g.rect(TRACK.x1 + 4, y0 + 30, 2, 60, "#C8C8D8");
}
function seventeen(c, V, t) {
  const a = win(t, EV.seventeen - 0.12, RACE.out1, 0.2, 0.3); if (a <= 0) return;
  const k = back((t - EV.seventeen + 0.12) / 0.32), y = R(Y(V, 128) + 50 + (1 - k) * 6), txt = "17% SLOWER", w = c.measure(MAIN, txt, { scale: 2 });
  const g = fade(c, a); g.rrect(480 - w - 18, y, w + 16, 22, C.PK, 2); g.rrect(482 - w - 18, y + 2, w + 12, 18, C.CARD, 2); g.text(MAIN, txt, 488 - w - 18, y + 4, C.PK, { scale: 2 });
}

// ---------------------------------------------------------------- electricity: waves flow from each socket up the cable into its TV
const WV = { v: 60, A: 7, lam: { L: 24, R: 28.8 } };                        // 60 px/s; λ ratio 5 : 6 → crests arrive 60 : 50
function cablePath(side) { const m = MIRROR[side]; return CABLE.map(([x, y]) => [m(x), y]); }
function waves(c, V, t) {
  const a = Math.min(sm(t, WAVE.in, WAVE.in + 0.3), 1 - sm(t, WAVE.out - 0.35, WAVE.out)); if (a <= 0) return;
  for (const side of ["L", "R"]) {
    const P = cablePath(side), lam = WV.lam[side], front = (t - WAVE.in - 0.15) * 110, col = side === "L" ? USA : EU, g = fade(c, a);
    // socket glow
    const sx = X(V, MIRROR[side](SOCKET.x)), sy = Y(V, SOCKET.y), gl = 0.5 + 0.5 * Math.sin(t * 9);
    fade(c, a * (0.35 + 0.25 * gl)).ring?.(R(sx), R(sy), 12, col);
    let s0 = 0;
    for (let k = 0; k < P.length - 1; k++) {
      const [x0, y0] = P[k], [x1, y1] = P[k + 1], L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      for (let d = 0; d < L; d += 0.5) {
        const s = s0 + d; if (s > front) break;
        const off = WV.A * Math.sin((2 * Math.PI * (s - WV.v * t)) / lam) * Math.min(1, s / 10, (front - s) / 8, k === P.length - 2 ? (L - d) / 5 : 1);
        const px = X(V, x0 + ux * d - uy * off), py = Y(V, y0 + uy * d + ux * off);
        g.rect(R(px) - 1, R(py) - 1, 4, 4, mix(col, "#FFFFFF", 0.25));
      }
      s0 += L;
    }
  }
}
function hz(c, V, t) {
  popPill(c, "60 HZ", X(V, roomCx("L")), Y(V, 160), t, HZ.l, HZ.out, USA, 4);
  popPill(c, "50 HZ", X(V, roomCx("R")), Y(V, 160), t, HZ.r, HZ.out, EU, 4);
  // per picture: a tiny tick on the TV when a crest arrives (same timing as the refresh sweep)
}

// ---------------------------------------------------------------- film strips: one step per picture; then a 1-second count
const CELLS = 4, CW = 42, CH = 36;
function strip(c, V, t) {
  const a = Math.min(sm(t, STRIP.in, STRIP.in + 0.35), 1 - sm(t, STRIP.out - 0.35, STRIP.out)); if (a <= 0) return;
  for (const side of ["L", "R"]) {
    const cx = X(V, roomCx(side)), x0 = R(cx - 96), y0 = R(Y(V, 126)), col = side === "L" ? USA : EU, g = fade(c, a);
    const per = side === "L" ? 0.4 : 0.48, u = (t - STRIP.in) / per, n0 = Math.floor(u), fr = u - n0, slide = ease(clamp01(fr / 0.35));
    g.rect(x0 - 2, y0, 196, CH + 10, "#0E0A14"); g.rect(x0 - 2, y0, 196, 1, mix(col, "#0E0A14", 0.4));
    for (let i = 0; i < 28; i++) { const hx = x0 + 2 + ((i * 7 - R(slide * 7) + 700) % 196); if (hx < x0 + 190) { g.rect(hx, y0 + 2, 3, 2, "#5A5068"); g.rect(hx, y0 + CH + 6, 3, 2, "#5A5068"); } }
    for (let k = -1; k < CELLS; k++) {
      const n = n0 + k, x = R(x0 + 4 + (k - slide) * (CW + 4)), y = y0 + 5;
      const newest = k === CELLS - 1, ca = newest ? sm(fr, 0, 0.4) : k < 0 ? 1 - sm(slide, 0, 0.6) : 1; if (ca <= 0 || x < x0 - CW) continue;
      const cc = clipX(c, x0 + 1, x0 + 193);
      fade(cc, a * ca).rect(x, y, CW, CH, newest ? "#3A5AA8" : "#2A3E78"); fade(cc, a * ca).rect(x, y + CH - 6, CW, 6, "#3C8A3A");
      icon(cc, x + 1 + ((n * 2) % 16), y + CH - 30, a * ca, 2, n & 3);
      if (newest) frameBox(c, x, y, x + CW, y + CH, col, a * ca, 1);
    }
    // the 1-second count: exactly 60 / 50 pictures (steps) in one real second
    const ka = Math.min(sm(t, STRIP.count0 - 0.15, STRIP.count0 + 0.1), 1 - sm(t, STRIP.out - 0.35, STRIP.out));
    if (ka > 0) { const n = Math.min(side === "L" ? 60 : 50, Math.floor((side === "L" ? 60 : 50) * clamp01(t - STRIP.count0))), done = t >= STRIP.count0 + 1;
      const txt = `${n} STEPS`, w = 176, bx = R(cx - w / 2), by = R(Y(V, 178));
      panel(c, bx, by, w, 52, ka, col); const f = fade(c, ka), tw = c.measure(MAIN, txt, { scale: 3 }), sw = c.measure(TINY, "IN 1 SECOND", { scale: 2 });
      f.text(MAIN, txt, R(cx - tw / 2), by + 6, done ? col : C.IV, { scale: 3 }); f.text(TINY, "IN 1 SECOND", R(cx - sw / 2), by + 34, C.L, { scale: 2 }); }
  }
}

// ---------------------------------------------------------------- music notes at each game's tempo (rise from the TV top)
function noteGlyph(g, x, y, col) { const q = (a, b, w, h) => g.rect(x + a * 2, y + b * 2, w * 2, h * 2, col); q(4, 0, 2, 9); q(5, 0, 4, 2); q(7, 2, 2, 2); q(0, 7, 5, 4); q(1, 6, 3, 1); q(1, 11, 3, 1); }
export const NOTE_BEAT = 0.4;  // one note every 0.4 s of game time (24 game steps): left every 0.4 s, right every 0.48 s
export function noteTimes(side) { const out = []; const per = side === "L" ? NOTE_BEAT : NOTE_BEAT * 1.2; for (let t = NOTES.in; t < NOTES.out - 0.7; t += per) out.push(t); return out; }
const NOTES_T = { L: noteTimes("L"), R: noteTimes("R") };
const MEL = [0, 2, 4, 2, 5, 4, 2, 0, 3, 5];
function notes(c, V, t) {
  if (t < NOTES.in || t > NOTES.out + 1) return;
  for (const side of ["L", "R"]) { const cx = X(V, roomCx(side)), col = side === "L" ? USA : EU;
    NOTES_T[side].forEach((t0, i) => { const u = (t - t0) / 1.1; if (u < 0 || u > 1) return; const a = Math.min(sm(u, 0, 0.15), 1 - sm(u, 0.7, 1)) * (1 - sm(t, NOTES.out, NOTES.out + 0.3));
      const x = R(cx - 84 + ((i * 41) % 156)), y = R(Y(V, 214) - u * 80 - MEL[i % MEL.length] * 3); noteGlyph(fade(c, a), x, y, col); }); }
}

// ---------------------------------------------------------------- the game clocks + fast-forward to the goal + real stopwatches
function clocks(c, V, t) {
  const a = win(t, CLK.in, CLK.out, 0.25, 0.3); if (a <= 0) return;
  for (const side of ["L", "R"]) { const [x0, y0, x1, y1] = gameRect(V, side, t, 1, 1, 37, 8.5), p = 2 + 2 * Math.sin((t - CLK.in) * 8); frameBox(c, x0 - p, y0 - p, x1 + p, y1 + p, side === "L" ? USA : EU, a, 2); }
  popPill(c, "GAME CLOCKS", 270, Y(V, 160), t, CLK.in, CLK.out, C.Y, 3);
}
function stopwatch(c, cx, y, real, game, done, col, a) {
  if (a <= 0) return; const g = fade(c, a), x = R(cx - 104);
  panel(c, x, y, 208, 76, a, done ? col : C.L);
  // analog face: the second hand follows real time
  const fx = x + 34, fy = y + 38; g.disc(fx, fy, 26, "#B8AECC"); g.disc(fx, fy, 24, "#FDFEED");
  for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.rect(R(fx + Math.sin(an) * 20) - 1, R(fy - Math.cos(an) * 20) - 1, 2, 2, "#3B2C5C"); }
  const an = ((real % 60) / 60) * Math.PI * 2; for (const d of [0, 1]) g.line(fx + d, fy, R(fx + d + Math.sin(an) * 19), R(fy - Math.cos(an) * 19), "#E03056"); g.rect(fx - 2, fy - 2, 5, 5, "#3B2C5C");
  g.text(MAIN, `GAME ${fmt(game)}`, x + 70, y + 14, C.L, { scale: 2 });
  g.text(MAIN, `REAL ${fmt(real)}`, x + 70, y + 44, done ? col : C.IV, { scale: 2 });
}
function race2(c, V, t) {
  const a = win(t, WATCH.in, WATCH.out, 0.3, 0.3); if (a <= 0) return;
  for (const side of ["L", "R"]) {
    const done = t >= GOAL_T[side], real = done ? (side === "L" ? 59 : 70.8) : phi(t), game = Math.min(59, gameClock(side, Math.min(t, ACT2 - 0.01)));
    stopwatch(c, X(V, roomCx(side)), R(Y(V, 134)), real, game, done, side === "L" ? USA : EU, a);
    const ga = win(t, GOAL_T[side] - 0.02, WATCH.out, 0.15, 0.3); if (ga > 0) { const [gx0, gy0, gx1] = gameRect(V, side, t, 0, 38, 64, 46); popPill(c, "GOAL", (gx0 + gx1) / 2, gy0, t, GOAL_T[side] - 0.02, WATCH.out - 0.2, side === "L" ? USA : EU, 2); }
  }
  const fa = Math.min(sm(t, FF.a - 0.05, FF.a + 0.15), 1 - sm(t, FF.rightGoal + 0.1, FF.rightGoal + 0.4));
  if (fa > 0) for (const side of ["L", "R"]) { const G = picRect(side), blink = 0.8 + 0.2 * Math.cos(t * 12), x = R(X(V, G.x1) - 92), y = R(Y(V, G.y0) + 8), g = fade(c, fa * blink);
    g.text(MAIN, ">> FAST", x + 2, y + 2, "#10183A", { scale: 2 }); g.text(MAIN, ">> FAST", x, y, "#FDFEED", { scale: 2 }); }
}
function blackBars(c, V, t) {
  const a = win(t, BARS.in0, BARS.tagOut, 0.2, 0.3); if (a <= 0) return;
  const G = picRect("R"), q = squash(t) * SQ, bh = (PIC.h * q) / 2, x0 = X(V, G.x0) + 4, x1 = X(V, G.x1) - 4, g = fade(c, a);
  for (const [ya, yb] of [[G.y0, G.y0 + bh], [G.y1 - bh, G.y1]]) { const y0 = Y(V, ya), y1 = Y(V, yb); for (let x = R(x0); x < x1; x += 6) { g.rect(x, R(y0), 3, 1, C.PK); g.rect(x, R(y1) - 1, 3, 1, C.PK); } }
  popPill(c, "BLACK BARS", X(V, roomCx("R")), Y(V, 160), t, BARS.in0, BARS.tagOut, C.PK, 3);
}

// ---------------------------------------------------------------- the kid: a happy bubble (he never knew)
function bubble(c, V, t, W) {
  const a = win(t, EV.kids - 0.05, EV.some1 - 0.3, 0.3, 0.3); if (a <= 0 || !W.kid || !W.kid.hatTop) return;
  const [hx, hy] = W.kid.hatTop, k = back((t - EV.kids + 0.05) / 0.4), bx = R(hx + 30), by = R(hy - 70 - (1 - k) * 8), g = fade(c, a);
  g.disc(R(hx + 10), R(hy - 10), 3, "#FDFEED"); g.disc(R(hx + 20), R(hy - 26), 5, "#FDFEED");
  g.rrect(bx - 4, by, 104, 56, "#16121C", 10); g.rrect(bx - 2, by + 2, 100, 52, "#FDFEED", 9);
  icon(c, bx + 8, by + 8, a, 3, Math.floor(t * 8) & 3);
  // a heart
  const hb = 1.3 + 0.18 * Math.sin(t * 7), hxx = bx + 70, hyy = by + 14;
  for (const [dx, dy, w] of [[-6, 0, 5], [2, 0, 5], [-7, 3, 15], [-6, 6, 13], [-4, 9, 9], [-2, 12, 5], [0, 14, 1]]) g.rect(R(hxx + dx * hb), R(hyy + dy * hb), R(w * hb), R(3 * hb), C.PK);
}

// ---------------------------------------------------------------- cartridges: some were fixed (PAL OK ✓), many weren't (50 HZ)
const CART_COL = ["#C84848", "#4A78C8", "#E8C048", "#58B868", "#B868C8"], CART_OK = [1, 3];
function carts(c, V, t) {
  const a = Math.min(sm(t, CARTS.in, CARTS.in + 0.4), 1 - sm(t, CARTS.out - 0.4, CARTS.out)); if (a <= 0) return;
  panel(c, 38, 152, 464, 196, a, C.L);
  CART_COL.forEach((col, i) => {
    const k = ease(clamp01((t - CARTS.in - i * 0.06) / 0.45)), cx = 84 + i * 93, cy = R(166 + (1 - k) * 30), g = fade(c, a * k);
    g.rrect(cx - 34, cy, 68, 84, "#16121C", 4); g.rrect(cx - 32, cy + 2, 64, 80, col, 4); g.rrect(cx - 24, cy + 12, 48, 40, "#F4F0E8", 2); g.rect(cx - 19, cy + 18, 38, 26, mix(col, "#F4F0E8", 0.45)); for (let j = 0; j < 5; j++) g.rect(cx - 24 + j * 10, cy + 64, 6, 12, mix(col, "#000000", 0.3));
    const ok = CART_OK.includes(i), tt = ok ? CARTS.ok[i === 1 ? 0 : 1] : CARTS.no[i / 2];
    const ta = sm(t, tt, tt + 0.2) * a; if (ta <= 0) return;
    const f = fade(c, ta), dy = R((1 - back((t - tt) / 0.3)) * 6), ty = 262 + dy, tw = 86, tx = cx - tw / 2;
    f.rrect(tx, ty, tw, 70, ok ? "#2E9A58" : "#6A6478", 3); f.rrect(tx + 2, ty + 2, tw - 4, 66, ok ? "#123A22" : "#2A2636", 3);
    if (ok) { const w1 = c.measure(MAIN, "PAL", { scale: 2 }), w2 = c.measure(MAIN, "OK ✓", { scale: 3 }); f.text(MAIN, "PAL", R(cx - w1 / 2), ty + 10, "#9AF0B0", { scale: 2 }); f.text(MAIN, "OK ✓", R(cx - w2 / 2), ty + 34, "#9AF0B0", { scale: 3 }); }
    else { const w1 = c.measure(MAIN, "50", { scale: 3 }), w2 = c.measure(MAIN, "HZ", { scale: 2 }); f.text(MAIN, "50", R(cx - w1 / 2), ty + 10, "#C8C2D4", { scale: 3 }); f.text(MAIN, "HZ", R(cx - w2 / 2), ty + 40, "#C8C2D4", { scale: 2 }); }
  });
}

// ---------------------------------------------------------------- the 60 switch (labels next to the toggle)
function switchLabels(c, V, t) {
  const a = Math.min(sm(t, MOD.sw0 + 0.2, MOD.sw1), 1 - sm(t, MOD.lidClose0 - 0.1, MOD.lidClose0 + 0.2)); if (a <= 0) return;
  const { x, y } = switchWorld(), sx = X(V, x), sy = Y(V, y), f = swFlip(t), g = fade(c, a), s = 2;
  g.text(MAIN, "50", R(sx - 70), R(sy - 56), mix(C.IV, "#6A6478", f), { scale: 3 });
  g.text(MAIN, "60", R(sx + 40), R(sy - 56), mix("#6A6478", C.GR, f), { scale: 3 });
  popPill(c, "60 SWITCH", sx, R(sy - 120), t, EV.sixty3 - 0.05, MOD.back0 + 0.3, C.GR, 3);
}
function after60(c, V, t) {
  const a = win(t, MOD.back1 - 0.4, DC.menu0 + 0.2, 0.3, 0.3);
  if (a > 0) { pill(c, "60 HZ", X(V, roomCx("L")), Y(V, 160), a, USA, 4); pill(c, "60 HZ", X(V, roomCx("R")), Y(V, 160), a, EU, 4); }
}
function y1999(c, V, t) {
  const m = MIRROR.R, cx = X(V, m(140)), y = Y(V, 448);
  popPill(c, "1999", cx, R(y - 14), t, DC.tag, DC.tagOut, C.IV, 3);
}

export function drawOverlays(c, t, V, W) {
  signs(c, V, t);
  race(c, V, t); seventeen(c, V, t);
  waves(c, V, t); hz(c, V, t);
  strip(c, V, t);
  popPill(c, "1991", 270, Y(V, 160), t, Y91.in, Y91.out, C.IV, 4);
  { const a = win(t, SLOW.in, SLOW.out + 0.4, 0.25, 0.3); if (a > 0) { const G = picRect("R"); frameBox(c, X(V, G.x0) - 4, Y(V, G.y0) - 4, X(V, G.x1) + 4, Y(V, G.y1) + 4, C.PK, a, 3); popPill(c, "SLOWER", X(V, roomCx("R")), Y(V, 160), t, SLOW.in, SLOW.out + 0.4, C.PK, 4); } }
  notes(c, V, t);
  clocks(c, V, t);
  race2(c, V, t);
  blackBars(c, V, t);
  bubble(c, V, t, W);
  carts(c, V, t);
  switchLabels(c, V, t);
  after60(c, V, t);
  y1999(c, V, t);
}
export { noteTimes as _noteTimes };
