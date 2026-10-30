// «A 13-year-old "beat" Tetris» — the room and the TV, drawn in world units (the room is 540 × 960 at zoom 1) through a
// camera V, so zooms into the TV stay crisp pixel art: a dark bedroom at night, a CRT TV on a low stand with a generic grey
// console, the TV's glow on the wall, and a kid seen from behind (headset, hoodie) who plays or throws both arms up.
// The kid is a generic figure, not a likeness. The game on the screen is drawn by drawGame() into the screen rectangle.
import { bayer, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { COLS, ROWS, boardAt, gameAt, levelAt, palette, DEMO, demoPiece, SEG } from "./game.mjs";

export const GW = 540, GH = 960;
export const TV = { x0: 86, y0: 128, x1: 454, y1: 452 }, SCR = { x: 116, y: 152, w: 308, h: 244 }, STAND = { y0: 452, y1: 560 };
// the game layout inside the screen (world units)
export const CS = 10.6, WELL = { x: SCR.x + SCR.w / 2 - (COLS * CS) / 2, y: SCR.y + 14, w: COLS * CS, h: ROWS * CS };
export const view = (cam) => ({ z: cam.z, X: (wx) => GW / 2 + (wx - cam.cx) * cam.z, Y: (wy) => (cam.ay ?? GH / 2) + (wy - cam.cy) * cam.z });
const R = Math.round;
function put(c, X, Y, col, a = 1) { if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; if (a < 1 && !(a > bayer(X, Y))) return; const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; }
/** a world rectangle → screen pixels (edges rounded, so neighbours always meet) */
export function wrect(c, V, x0, y0, x1, y1, col, a = 1) { const X0 = Math.max(0, R(V.X(x0))), X1 = Math.min(GW, R(V.X(x1))), Y0 = Math.max(0, R(V.Y(y0))), Y1 = Math.min(GH, R(V.Y(y1))); const k = hex(col); for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) put(c, X, Y, k, a); }
function wpoly(c, V, pts, col, a = 1) {
  const s = pts.map(([x, y]) => [V.X(x), V.Y(y)]), k = hex(col); let y0 = Infinity, y1 = -Infinity; for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let Y = Math.max(0, Math.ceil(y0 - 0.5)); Y <= Math.min(GH - 1, Math.floor(y1 - 0.5)); Y++) { const yc = Y + 0.5, xs = []; for (let i = 0; i < s.length; i++) { const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((p, q) => p - q);
    for (let j = 0; j + 1 < xs.length; j += 2) for (let X = Math.max(0, Math.ceil(xs[j] - 0.5)); X <= Math.min(GW - 1, Math.floor(xs[j + 1] - 0.5)); X++) put(c, X, Y, k, a); }
}
const wdisc = (c, V, cx, cy, r, col, a = 1) => { const n = 18, pts = []; for (let i = 0; i < n; i++) { const an = (i / n) * 2 * Math.PI; pts.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); } wpoly(c, V, pts, col, a); };
function wline(c, V, x0, y0, x1, y1, w, col, a = 1) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2; wpoly(c, V, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col, a); wdisc(c, V, x1, y1, w / 2, col, a); wdisc(c, V, x0, y0, w / 2, col, a); }

// ---------------------------------------------------------------- the room
export function drawRoom(c, V, t, glow) {
  // wall: dark violet with a soft dither gradient; the TV's glow (its average colour) spreads on the wall around it
  const W0 = hex("#140F22"), W1 = hex("#221A38"), G = glow;
  for (let Y = 0; Y < GH; Y++) { const wy = (Y - (V.Y(0))) / V.z; if (wy > STAND.y1) continue;
    for (let X = 0; X < GW; X++) { const wx = (X - V.X(0)) / V.z, k = Math.floor((0.4 + 0.6 * Math.min(1, wy / 560)) * 4 + bayer(X, Y)) / 4; let col = [W0[0] + (W1[0] - W0[0]) * k, W0[1] + (W1[1] - W0[1]) * k, W0[2] + (W1[2] - W0[2]) * k];
      const d = Math.hypot((wx - 270) / 1.15, wy - 290), gk = Math.max(0, 1 - d / 330) * 0.55, q = Math.floor(gk * 5 + bayer(X + 1, Y + 2)) / 5; col = [col[0] + (G[0] - col[0]) * q * 0.6, col[1] + (G[1] - col[1]) * q * 0.6, col[2] + (G[2] - col[2]) * q * 0.6];
      const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  // window (left) with the night outside, and a poster (right)
  wrect(c, V, 14, 40, 70, 176, "#0B0820"); wrect(c, V, 18, 44, 66, 172, "#18224A"); wrect(c, V, 40, 44, 44, 172, "#2A2240"); wrect(c, V, 18, 106, 66, 110, "#2A2240"); wdisc(c, V, 30, 64, 6, "#E8E4C8");
  wrect(c, V, 474, 54, 528, 150, "#3A2A58"); wrect(c, V, 478, 58, 524, 146, "#5A3A8A"); for (let k = 0; k < 4; k++) wrect(c, V, 484 + k * 9, 120 - k * 12, 492 + k * 9, 128 - k * 12, ["#F4CA50", "#5FD3F0", "#E03056", "#65DA41"][k]);
  // floor: a dark carpet
  wrect(c, V, -400, STAND.y1, 940, 1400, "#120C18"); for (let k = 0; k < 6; k++) wrect(c, V, -400, STAND.y1 + 40 + k * 70, 940, STAND.y1 + 42 + k * 70, "#1A1222");
  // the stand + the console with its cable, then the TV
  wrect(c, V, 70, STAND.y0, 470, STAND.y0 + 10, "#4A3426"); wrect(c, V, 80, STAND.y0 + 10, 460, STAND.y1, "#3A281E"); wrect(c, V, 90, STAND.y0 + 18, 450, STAND.y1 - 8, "#2A1C16");
  wrect(c, V, 200, STAND.y0 + 46, 340, STAND.y0 + 86, "#8E8E98"); wrect(c, V, 200, STAND.y0 + 46, 340, STAND.y0 + 52, "#A8A8B2"); wrect(c, V, 214, STAND.y0 + 62, 270, STAND.y0 + 74, "#2A2A30"); wrect(c, V, 300, STAND.y0 + 62, 312, STAND.y0 + 66, "#E03056");
  wline(c, V, 320, STAND.y0 + 86, 340, STAND.y1 + 60, 3, "#2A2A30");
  drawTV(c, V, t);
}
export function drawTV(c, V, t) {
  wrect(c, V, TV.x0 + 6, TV.y0, TV.x1 - 6, TV.y1, "#2E2A36"); wrect(c, V, TV.x0, TV.y0 + 6, TV.x1, TV.y1 - 6, "#2E2A36"); wrect(c, V, TV.x0 + 6, TV.y0 + 4, TV.x1 - 6, TV.y0 + 10, "#4A4656");
  wrect(c, V, SCR.x - 6, SCR.y - 6, SCR.x + SCR.w + 6, SCR.y + SCR.h + 6, "#141218");
  wrect(c, V, SCR.x, SCR.y, SCR.x + SCR.w, SCR.y + SCR.h, "#05050A");
  drawGame(c, V, t);
  // glass: a faint highlight in the top-left corner and dark rounded corners
  for (let k = 0; k < 3; k++) wrect(c, V, SCR.x + 8 + k * 6, SCR.y + 6, SCR.x + 60 - k * 6, SCR.y + 8, "#2A2A3A", 0.35);
  for (const [cx, cy] of [[SCR.x, SCR.y], [SCR.x + SCR.w - 6, SCR.y], [SCR.x, SCR.y + SCR.h - 6], [SCR.x + SCR.w - 6, SCR.y + SCR.h - 6]]) wrect(c, V, cx, cy, cx + 6, cy + 6, "#141218");
  // knobs and the speaker grille
  wrect(c, V, TV.x0 + 40, TV.y1 - 40, TV.x1 - 40, TV.y1 - 34, "#24202C"); wdisc(c, V, TV.x1 - 34, TV.y1 - 22, 6, "#5A5666"); wdisc(c, V, TV.x1 - 54, TV.y1 - 22, 6, "#5A5666"); wdisc(c, V, TV.x0 + 30, TV.y1 - 22, 3, "#65DA41");
}

// ---------------------------------------------------------------- the game on the screen
const cellCols = (p, style) => (style === 1 ? [p.a, p.w] : style === 2 ? [p.a, null] : [p.b, null]);
function cell(c, V, x, y, p, style, a = 1, white = 0) {
  const [o, inner] = cellCols(p, style), x0 = WELL.x + x * CS, y0 = WELL.y + y * CS, s = CS - 1.2;
  if (white > 0) { wrect(c, V, x0, y0, x0 + s, y0 + s, mix(o, "#FFFFFF", white), a); return; }
  wrect(c, V, x0, y0, x0 + s, y0 + s, o, a);
  if (inner) wrect(c, V, x0 + 2, y0 + 2, x0 + s - 2, y0 + s - 2, inner, a); else wrect(c, V, x0 + 1.2, y0 + 1.2, x0 + 3.2, y0 + 3.2, "#FFFFFF", a * 0.9);
}
function htext(c, V, txt, x, y, size, col, a = 1, align = 0) { STX(c, txt, V.X(x), V.Y(y), size * V.z, col, { align, alpha: a }); }
let STX = null; export function setText(fn) { STX = fn; }
// the palette shown: in the race past 29 it updates at most every 0.4 s (the counter itself runs every frame); every
// palette change crossfades over 0.2 s by dither
const palLevel = (t) => { const g = gameAt(t); if (!g.frozen && g.seg === SEG.race) { const q = SEG.race.t0 + Math.floor((t - SEG.race.t0) / 0.4) * 0.4; return levelAt(q); } return levelAt(t); };
function palAt(t) { const L1 = palLevel(t); for (let d = 1 / 60; d <= 0.2; d += 1 / 60) { const L0 = palLevel(t - d); if (L0 !== L1) return { from: palette(L0), to: palette(L1), k: d / 0.2 }; } return { from: null, to: palette(L1), k: 1 }; }
// the game's state at time t (board, falling piece, clearing rows, curtain, the demo piece)
function stateAt(t) { const g = gameAt(t); if (g.demo) return { board: DEMO.board, falling: null, clear: null, top: null, demo: demoPiece(t) }; return boardAt(g.seg, g.tg); }
function drawState(c, V, st, P0, alpha) {
  if (alpha < 1) wrect(c, V, WELL.x, WELL.y, WELL.x + WELL.w, WELL.y + WELL.h, "#05050A", alpha);
  const pals = P0.from ? [[P0.from, alpha], [P0.to, alpha * P0.k]] : [[P0.to, alpha]];
  for (const [p, a] of pals) {
    // a clearing row turns white, then dissolves while the rows above slide down into its place
    const slide = st.clear ? Math.max(0, Math.min(1, (st.clear.k - 0.45) / 0.55)) : 0, sl = slide * slide * (3 - 2 * slide);
    for (let r = 0; r < ROWS; r++) for (let x = 0; x < COLS; x++) { const v = st.board[r][x]; if (!v) continue; let aa = a, wh = 0, dy = 0;
      if (st.clear && st.clear.rows.includes(r)) { const k = st.clear.k; wh = Math.min(1, k / 0.35); aa = a * (k < 0.35 ? 1 : Math.max(0, 1 - (k - 0.35) / 0.45)); }
      else if (st.clear) dy = st.clear.rows.filter((q) => q > r).length * sl;
      cell(c, V, x, r + dy, p, v, aa, wh); }
    if (st.falling) { const yy = st.falling.yy; for (const [cx, cy] of st.falling.cells) if (yy + cy >= -0.9) cell(c, V, st.falling.x + cx, Math.max(0, yy + cy), p, st.falling.style, a); }
    if (st.demo && st.demo.shown) for (const [cx, cy] of st.demo.cells) { const y = Math.floor(st.demo.y) + cy; if (y >= 0) cell(c, V, st.demo.x + cx, y, p, 1, a); }
  }
  if (st.top) { const n = Math.floor(st.top.k * ROWS); for (let r = ROWS - 1; r >= ROWS - n; r--) wrect(c, V, WELL.x, WELL.y + r * CS, WELL.x + WELL.w, WELL.y + (r + 1) * CS - 1, "#5A5A66", alpha); }
}
const BOUNDS = () => [SEG.climb.t0, SEG.l29.t0, DEMO.t0, SEG.race.t0, SEG.late.t0];
export function drawGame(c, V, t) {
  const L = levelAt(t), P0 = palAt(t), pal = P0.to;
  wrect(c, V, WELL.x - 4, WELL.y - 4, WELL.x + WELL.w + 4, WELL.y + WELL.h + 4, pal.glitch ? "#3A3A30" : "#5A5A6A"); wrect(c, V, WELL.x - 2, WELL.y - 2, WELL.x + WELL.w + 2, WELL.y + WELL.h + 2, "#05050A");
  // a new stretch of play dissolves in over the last board of the previous one (never a one-frame swap)
  let prev = null, k = 1; for (const b of BOUNDS()) if (t >= b && t < b + 0.35) { prev = b; k = (t - b) / 0.35; }
  if (prev != null) { drawState(c, V, stateAt(prev - 1e-3), palAt(prev - 1e-3), 1); drawState(c, V, stateAt(t), P0, k); }
  else drawState(c, V, stateAt(t), P0, 1);
  // the HUD (our own layout): level on the left, lines and score on the right
  const hx0 = SCR.x + 10, hx1 = WELL.x + WELL.w + 12;
  htext(c, V, "LEVEL", hx0, SCR.y + 26, 1.2, "#9AA0C8"); htext(c, V, String(L).padStart(2, "0"), hx0, SCR.y + 42, 2.4, pal.glitch ? pal.b : "#FDFEED");
  const lines = Math.max(0, L * 10 + 4), score = L >= 29 ? 999999 : Math.min(999999, Math.round(L * L * 980 + L * 4200));
  htext(c, V, "LINES", hx1, SCR.y + 26, 1.2, "#9AA0C8"); htext(c, V, String(lines).padStart(3, "0"), hx1, SCR.y + 40, 1.6, "#FDFEED");
  htext(c, V, "SCORE", hx1, SCR.y + 72, 1.2, "#9AA0C8"); htext(c, V, String(score).padStart(6, "0"), hx1, SCR.y + 86, 1.6, "#FDFEED");
  htext(c, V, "NEXT", hx1, SCR.y + 124, 1.2, "#9AA0C8"); wrect(c, V, hx1 - 2, SCR.y + 136, hx1 + 50, SCR.y + 180, "#1A1A24");
  const nx = hx1 + 8, ny = SCR.y + 146; for (const [cx, cy] of [[0, 0], [1, 0], [2, 0], [1, 1]]) { const [o] = cellCols(pal, 1); wrect(c, V, nx + cx * 10, ny + cy * 10, nx + cx * 10 + 9, ny + cy * 10 + 9, o); }
  return { L, pal };
}
/** the average glow of the screen (for the wall) */
export function screenGlow(t) { return hex("#34407A"); }   // a steady cool glow (a palette-dependent one flickered the whole wall)

// ---------------------------------------------------------------- the kid, from behind: play (0) ↔ hands up (1)
export function drawKid(c, V, t, up) {
  const bob = Math.sin(t * 2.1) * 1.5 * (1 - up), cx = 270, hy = 598 + bob;
  const HOOD = "#232F66", HOOD2 = "#37498F", RIM = "#5FD3F0", HAIR = "#2A1A14", HAIR2 = "#3E281C", BAND = "#1A1A22", SKIN = "#C98E6A";
  // arms: play → elbows out, hands forward (hidden); up → both fists above the head
  const arm = (side) => { const sx = cx + side * 104, sy = 660, ex = cx + side * lerp(128, 120, up), ey = lerp(744, 560, up), hx2 = cx + side * lerp(70, 92, up), hy2 = lerp(720, 470 + Math.sin(t * 9) * 6 * up, up);
    wline(c, V, sx, sy, ex, ey, 40, HOOD); wline(c, V, ex, ey, hx2, hy2, 34, HOOD); if (up > 0.3) { wdisc(c, V, hx2, hy2 - 8, 17, SKIN, Math.min(1, (up - 0.3) * 3)); } };
  if (up > 0.02) { arm(-1); arm(1); }
  // shoulders and back
  wpoly(c, V, [[cx - 150, 980], [cx - 140, 700], [cx - 100, 650], [cx + 100, 650], [cx + 140, 700], [cx + 150, 980]], HOOD);
  wpoly(c, V, [[cx - 100, 652], [cx + 100, 652], [cx + 120, 672], [cx - 120, 672]], RIM, 0.5);
  wpoly(c, V, [[cx - 54, 650], [cx + 54, 650], [cx + 40, 700], [cx - 40, 700]], HOOD2);                    // the hood lying on the back
  if (up <= 0.02) { arm(-1); arm(1); }
  // head: hair, headset band and cups
  wdisc(c, V, cx, hy, 52, HAIR); wdisc(c, V, cx - 6, hy - 10, 40, HAIR2, 0.6);
  wpoly(c, V, [[cx - 54, hy - 2], [cx - 40, hy - 40], [cx, hy - 54], [cx + 40, hy - 40], [cx + 54, hy - 2], [cx + 46, hy - 4], [cx + 34, hy - 34], [cx, hy - 46], [cx - 34, hy - 34], [cx - 46, hy - 4]], BAND);
  wrect(c, V, cx - 64, hy - 12, cx - 46, hy + 26, BAND); wrect(c, V, cx + 46, hy - 12, cx + 64, hy + 26, BAND); wrect(c, V, cx - 60, hy - 8, cx - 50, hy + 22, "#3B2C5C"); wrect(c, V, cx + 50, hy - 8, cx + 60, hy + 22, "#3B2C5C");
  wdisc(c, V, cx, hy - 50, 6, RIM, 0.5);
}
const lerp = (a, b, k) => a + (b - a) * k;
