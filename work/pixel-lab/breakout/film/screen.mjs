// The black-and-white tube: walls, the wall of bricks, the paddle, the ball with its trail, the on-tube HUD (score,
// ball number, the 4-step speed gauge SLOW · 2 · 3 · TOP, the paddle-HITS counter) — all in white phosphor — and then
// the four coloured plastic strips on the glass that tint whatever passes under them (bricks, walls, the ball). On
// "the colors were fake" the strips peel off the glass (slide + dither) and come back.
import { mix, bayer, fade, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { F, PW, ZONE_DEG } from "./sim.mjs";
import { GL, ROWS, STRIP } from "./cabinet.mjs";
import { EV, FF1, STRIPS, sm, ease } from "./timeline.mjs";
import * as G from "./game.mjs";

const GW = 540, R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
export const PH = { BG: [5, 7, 9], W: "#E9EEE8", W2: "#C4CBC4", DIM: "#3A423E", DIM2: "#222826", GLOW: "#1A201E" };
const BANDS = [STRIP.RED, STRIP.ORANGE, STRIP.GREEN, STRIP.YELLOW];

function fillGlass(c) { const d = c.d, [r, g, b] = PH.BG; for (let y = GL.y0; y < GL.y1; y++) { const [x0, x1] = ROWS[y]; for (let x = x0; x < x1; x++) { const i = (y * GW + x) * 3; d[i] = r; d[i + 1] = g; d[i + 2] = b; } } }
const glow = (c, x, y, w, h, col = PH.GLOW) => { c.rect(x - 1, y, 1, h, col); c.rect(x + w, y, 1, h, col); c.rect(x, y - 1, w, 1, col); c.rect(x, y + h, w, 1, col); };

/** Odometer digits (continuous value v): each digit rolls up into the next, clipped to its cell. */
export function odo(c, v, x, y, n, scale, col, a = 1) {
  const h = 7 * scale + scale, dw = 6 * scale, g = fade(c, a);
  for (let k = 0; k < n; k++) {
    const p = Math.pow(10, n - 1 - k), q = v / p, d = Math.floor(q) % 10, rem = v % p, f = p === 1 ? v - Math.floor(v) : clamp01(rem - (p - 1)), oy = R(f * h), X = x + k * dw;
    const clip = (Y) => Y >= y && Y < y + 7 * scale;
    g.text(MAIN, String(d), X, y - oy, null, { scale, colorAt: (_, Y) => (clip(Y) ? col : null) });
    if (oy > 0) g.text(MAIN, String((d + 1) % 10), X, y - oy + h, null, { scale, colorAt: (_, Y) => (clip(Y) ? col : null) });
  }
}

// ---------------------------------------------------------------- HUD on the tube
export const GAUGE = { cx: 134, cy: 282, ro: 56, ri: 39 };
export const HITBOX = { x: 286, y: 212, w: 146, h: 74 };
function hud(c, t) {
  // score (top left), ball number (top right): the original game also shows its numbers above the wall
  odo(c, G.score(t), 50, 154, 3, 4, PH.W);
  const ball = t < G.SERVE2 ? 1 : 2, bA = t < G.SERVE2 - 0.2 ? 1 : 1 - sm(t, G.SERVE2 - 0.2, G.SERVE2), bB = sm(t, G.SERVE2, G.SERVE2 + 0.25);
  c.text(TINY, "BALL", 360, 160, PH.W2, { scale: 2 });
  if (bA > 0) fade(c, bA).text(MAIN, "1", 406, 154, PH.W, { scale: 4 }); if (bB > 0) fade(c, bB).text(MAIN, "2", 406, 154, PH.W, { scale: 4 });
  // the speed gauge (dim until "speeds up", then lit) and HITS
  const on = 0.42 + 0.58 * sm(t, EV.speeds - 0.5, EV.speeds), pulse = Math.max(0, 1 - Math.abs(t - EV.times) / 0.45), nd = G.needle(t);
  const lvA = (i) => clamp01(nd - i + 1);
  const { cx, cy, ro, ri } = GAUGE, top = G.level(t) === 3 && t > EV.fastest - 0.2 && t < EV.but ? 0.5 + 0.5 * Math.sin((t - EV.fastest) * 12) : 0;
  for (let y = cy - ro - 1; y <= cy; y++) for (let x = cx - ro - 1; x <= cx + ro + 1; x++) {
    const dx = x + 0.5 - cx, dy = cy - (y + 0.5), d = Math.hypot(dx, dy); if (d > ro || d < ri || dy < 0) continue;
    const ang = Math.atan2(dy, dx), s = (Math.PI - ang) / (Math.PI / 4), i = Math.min(3, Math.floor(s)), fr = s - i; if (fr < 0.06 || fr > 0.94) continue;
    const edge = d > ro - 1.5 || d < ri + 1.5 || fr < 0.12 || fr > 0.88, lit = lvA(i), pk = i === 3 ? top : 0;
    const col = edge ? mix(PH.DIM, PH.W, Math.max(lit, pulse * 0.6)) : lit > bayer(x, y) ? mix(PH.W2, "#FFFFFF", pk) : mix(PH.BG, PH.DIM2, 1);
    c.px(x, y, mix(PH.BG, col, on));
  }
  { const ang = Math.PI - (nd + 0.5) * (Math.PI / 4), ca = Math.cos(ang), sa = Math.sin(ang);
    for (let r = 3; r <= ri - 3; r += 0.5) { const x = R(cx + ca * r), y = R(cy - sa * r); c.px(x, y, mix(PH.BG, PH.W, on)); c.px(x + 1, y, mix(PH.BG, PH.W2, on)); c.px(x, y - 1, mix(PH.BG, PH.W2, on)); } }
  const lab = (s, x, y, i) => c.text(TINY, s, x, y, mix(PH.BG, mix(PH.DIM, PH.W, Math.max(0.35, lvA(i))), on), { scale: 2 });
  lab("SLOW", cx - ro - 6 - c.measure(TINY, "SLOW", { scale: 2 }), cy - 12, 0); lab("TOP", cx + ro + 6, cy - 12, 3);
  for (const [s, deg, i] of [["2", 112.5, 1], ["3", 67.5, 2]]) { const a = (deg * Math.PI) / 180, w = c.measure(TINY, s, { scale: 2 }); lab(s, R(cx + Math.cos(a) * (ro + 9) - w / 2), R(cy - Math.sin(a) * (ro + 9) - 5), i); }
  c.text(TINY, "SPEED", 46, 216, mix(PH.BG, PH.W2, on), { scale: 2 }); c.rect(cx - 3, cy - 4, 7, 4, mix(PH.BG, PH.W, on));
  // HITS box: flashes on the 4th and 12th hit
  const fl = Math.max(0, ...[G.HIT4, G.HIT12].map((h) => (t > h ? Math.max(0, 1 - (t - h) / 0.5) : 0)));
  const B = HITBOX; c.rframe(B.x, B.y, B.w, B.h, mix(PH.BG, mix(PH.DIM, PH.W, fl), on), 2);
  c.text(TINY, "HITS", B.x + 10, B.y + 9, mix(PH.BG, PH.W2, on), { scale: 2 });
  const hv = G.hitsValue(t), rs = t > G.SERVE2 - 0.25 && t < G.SERVE2 + 0.25;
  if (!rs) odo(c, hv, B.x + 62, B.y + 22, 2, 6, mix(PH.BG, mix(PH.W2, "#FFFFFF", fl), on));
  else { const k = sm(t, G.SERVE2 - 0.25, G.SERVE2 + 0.25); odo(c, t < G.SERVE2 ? hv : 0, B.x + 62, B.y + 22, 2, 6, mix(PH.BG, PH.W2, on), t < G.SERVE2 ? 1 - k : k); }
}

// ---------------------------------------------------------------- the playfield
function walls(c) { c.rect(F.L - 6, F.T - 6, 6, 306, PH.W2); c.rect(F.R, F.T - 6, 6, 306, PH.W2); c.rect(F.L - 6, F.T - 6, F.R - F.L + 12, 6, PH.W2); c.rect(F.L - 6, F.T - 6, F.R - F.L + 12, 1, PH.W); }
function bricks(c, t) {
  for (const b of G.BRICKS) {
    const { a, flash } = G.brickA(b, t); if (a <= 0 && flash <= 0) continue;
    const x = F.BX0 + b.col * F.BW + 1, y = F.BY0 + b.row * F.BH + 1, g = fade(c, a);
    if (a > 0) { g.rect(x, y, F.BW - 2, F.BH - 2, PH.W); g.rect(x, y + F.BH - 3, F.BW - 2, 1, PH.W2); }
    if (flash > 0) { const f = fade(c, flash * 0.9); f.rect(x - 1, y - 1, F.BW, F.BH, "#FFFFFF"); }
  }
}
function paddle(c, t) {
  const w = G.paddleW(t), cx = G.paddleX(t), x0 = R(cx - w / 2), x1 = R(cx + w / 2);
  c.rect(x0, F.PY, x1 - x0, F.PH, PH.W); c.rect(x0, F.PY + F.PH - 1, x1 - x0, 1, PH.W2); glow(c, x0, F.PY, x1 - x0, F.PH);
  // the hook: a dashed cut line over the paddle's middle on "cut in half"
  const k = Math.min(sm(t, EV.cut - 0.1, EV.cut + 0.15), 1 - sm(t, EV.worst + 0.2, EV.moment + 0.2));
  if (k > 0) { const g = fade(c, k); for (let y = F.PY - 12; y < F.PY + F.PH + 6; y += 3) g.rect(R(cx) - 1, y, 2, 2, y >= F.PY && y < F.PY + F.PH ? "#05070A" : "#FFE448"); }
}
function ball(c, t) {
  const p = G.ballAt(t); if (!p) return; const a = G.ballAlpha(t); if (a <= 0) return;
  const rt = t > FF1.a && t < FF1.b ? G.rate(t) : 1, n = Math.min(90, R(10 * rt)), span = 0.045;
  for (let j = n; j >= 1; j--) { const q = G.ballAt(t - (j * span) / n); if (!q) continue; const k = (1 - j / (n + 1)) * 0.55 * a; fade(c, k).rect(R(q[0]) + 1, R(q[1]) + 1, 4, 4, PH.W2); }
  const g = fade(c, a); g.rect(R(p[0]), R(p[1]), F.B, F.B, "#FFFFFF"); glow(g, R(p[0]), R(p[1]), F.B, F.B, "#3A423E");
}

// ---------------------------------------------------------------- the coloured plastic strips on the glass
export function stripOff(k, t) {
  const a0 = STRIPS.off[0] + k * 0.09, b0 = STRIPS.back[0] + (3 - k) * 0.09;
  return 470 * (ease((t - a0) / 0.62) - ease((t - b0) / 0.7));
}
function strips(c, t) {
  const d = c.d;
  for (let k = 0; k < 4; k++) {
    const off = stripOff(k, t), y0 = F.BY0 + 20 * k - 1, y1 = y0 + 20, sx0 = Math.max(0, R(GL.x0 + off)), sx1 = Math.min(GW, R(GL.x1 + off)); if (sx0 >= sx1) continue;
    const lift = clamp01(off / 120), al = 1 - 0.35 * lift, col = BANDS[k], [cr, cg, cb] = [1, 3, 5].map((i) => parseInt(col.slice(i, i + 2), 16));
    for (let y = y0; y < y1; y++) for (let x = sx0; x < sx1; x++) {
      if (al < 1 && al <= bayer(x, y)) continue;
      const i = (y * GW + x) * 3; d[i] = (d[i] * cr) / 255 + cr * 0.09; d[i + 1] = (d[i + 1] * cg) / 255 + cg * 0.09; d[i + 2] = (d[i + 2] * cb) / 255 + cb * 0.09;
    }
    if (off > 1) { const ex = R(GL.x0 + off); c.rect(ex, y0, 1, 20, mix(col, "#FFFFFF", 0.55)); c.rect(ex - 1, y0 + 1, 1, 19, mix(col, "#000000", 0.5)); }
  }
}

/** A view of the canvas that only paints inside the rounded glass (the lost ball slides under the bezel). */
function clipGlass(c) { const o = Object.create(c); o.px = (x, y, col) => { const r = ROWS[Math.floor(y)]; if (r && x >= r[0] && x < r[1]) c.px(x, y, col); }; return o; }
export function drawScreen(c, t) {
  fillGlass(c); walls(c); hud(c, t); bricks(c, t); const g = clipGlass(c); paddle(g, t); ball(g, t); strips(c, t);
}
export { ZONE_DEG, PW };
