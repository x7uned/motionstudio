// catalog-v1 copy (2026-10-26) of work/pixel-lab/duck-hunt/film/room.mjs drawRoom / drawCRT and its world primitives (put,
// wrect, wpoly, wdisc, wline), plus the night window of work/pixel-lab/tetris/film/room.mjs drawRoom (the same retro room
// drawn for the Tetris film). Changes: import path (renderer/pixel/raster.mjs); the film's camera view is replaced by the
// catalog camera (engine/layout.mjs layer, wall plane p 0.95, floor lines p 1); re-laid out for the 9:16 catalog stage:
// the CRT + stand + console group is scaled 0.56 and stands on the right, the floor lamp (now lit, with a warm wall glow)
// on the left, the night window left of centre, the framed landscape picture above the TV, a calm wall in the middle;
// NO GAME IP: the screen shows only a plain glowing CRT picture (blue glow, scanlines, a slow rolling bright band — no game
// picture), the film's grey console with a red light (close to a real console's look) is replaced by a generic charcoal
// box with a green power light, and the Tetris film's block poster is not ported; a 1-px dark outline and a lit top edge are
// added to the TV, stand, console and frames (house style); stars twinkle smoothly in the window.
// The duck-hunt film's notes: «a dark room at night, a CRT TV on a low stand with a generic grey console, the TV's glow on
// the wall».
import { bayer, mix, hex } from "../../../../../renderer/pixel/raster.mjs";
import { layer } from "../../engine/layout.mjs";

const GW = 540, GH = 960, R = Math.round;
export const WALL_P = 0.95, FLOOR_Y = 560;
// the film's TV / screen / stand rectangles (film world units) and where that group stands in the catalog room
const TV = { x0: 70, y0: 120, x1: 470, y1: 460 }, SCR = { x: 100, y: 146, w: 340, h: 255 }, STAND = { y0: 460, y1: 560 };
const GROUP = { s: 0.56, cx: 398 };          // film x 270 → catalog x 398; film floor y 560 stays on the floor line
const LAMP = { s: 0.8, cx: 52 };             // the film's floor lamp (pole at film x 10), scaled around its foot
const WIN = { s: 1.5, x: 150, y: 92 };       // the Tetris film's window (film x 14…70, y 40…176) → catalog x 150…234, y 92…296
const PIC = { s: 1.3, x: 352, y: 150 };      // the duck-hunt film's framed picture (film x 488…536, y 60…120)
const sub = (V, o, ox, oy) => ({ z: V.z * o.s, X: (fx) => V.X(o.x + (fx - ox) * o.s), Y: (fy) => V.Y(o.y + (fy - oy) * o.s) });
/** Screen-centre and size of the glowing picture in catalog world units (for the wall glow and a prop that points at it). */
export const SCREEN = (() => { const X = (fx) => GROUP.cx + (fx - 270) * GROUP.s, Y = (fy) => FLOOR_Y + (fy - 560) * GROUP.s; return { x0: X(SCR.x), x1: X(SCR.x + SCR.w), y0: Y(SCR.y), y1: Y(SCR.y + SCR.h), cx: X(SCR.x + SCR.w / 2), cy: Y(SCR.y + SCR.h / 2) }; })();

// ---------------------------------------------------------------- primitives (as in the film)
function put(c, X, Y, col, a = 1) { if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; if (a < 1 && !(a > bayer(X, Y))) return; const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; }
function wrect(c, V, x0, y0, x1, y1, col, a = 1) { const X0 = Math.max(0, R(V.X(x0))), X1 = Math.min(GW, R(V.X(x1))), Y0 = Math.max(0, R(V.Y(y0))), Y1 = Math.min(GH, R(V.Y(y1))); const k = hex(col); for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) put(c, X, Y, k, a); }
function wpoly(c, V, pts, col, a = 1) {
  const s = pts.map(([x, y]) => [V.X(x), V.Y(y)]), k = typeof col === "function" ? null : hex(col); let y0 = Infinity, y1 = -Infinity; for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let Y = Math.max(0, Math.ceil(y0 - 0.5)); Y <= Math.min(GH - 1, Math.floor(y1 - 0.5)); Y++) { const yc = Y + 0.5, xs = []; for (let i = 0; i < s.length; i++) { const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((p, q) => p - q);
    for (let j = 0; j + 1 < xs.length; j += 2) for (let X = Math.max(0, Math.ceil(xs[j] - 0.5)); X <= Math.min(GW - 1, Math.floor(xs[j + 1] - 0.5)); X++) put(c, X, Y, k || hex(col(X, Y)), a); }
}
const wdisc = (c, V, cx, cy, r, col, a = 1) => { const n = 24, pts = []; for (let i = 0; i < n; i++) { const an = (i / n) * 2 * Math.PI; pts.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); } wpoly(c, V, pts, col, a); };
function wline(c, V, x0, y0, x1, y1, w, col, a = 1) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2; wpoly(c, V, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col, a); wdisc(c, V, x1, y1, w / 2, col, a); wdisc(c, V, x0, y0, w / 2, col, a); }
const INK = "#0B0812";
/** catalog: a world rect with a 1-px dark outline just outside it (house style). */
function wbox(c, V, x0, y0, x1, y1, col) { const o = 1 / V.z; wrect(c, V, x0 - o, y0 - o, x1 + o, y1 + o, INK); wrect(c, V, x0, y0, x1, y1, col); }

// ---------------------------------------------------------------- the room
const GLOW = hex("#3C5AB4"), WARM = hex("#F4B860");
/** Everything behind the props, full 540×960 frame. */
export function drawRetroRoom(c, cam, t) {
  const V = layer(cam, WALL_P), F = layer(cam, 1), VG = sub(V, { s: GROUP.s, x: GROUP.cx, y: FLOOR_Y }, 270, 560);
  // wall: dark violet with a dithered gradient; the TV's glow spreads on the wall around the screen, the lamp's warm glow
  // around its shade (catalog addition, same dithered quantised glow as the TV's)
  const W0 = hex("#140F22"), W1 = hex("#221A38"), G = GLOW, LS = { x: LAMP.cx, y: FLOOR_Y + (90 - 560) * LAMP.s };
  const yFloor = Math.min(GH, Math.max(0, R(V.Y(FLOOR_Y))));
  for (let Y = 0; Y < yFloor; Y++) { const wy = V.wy(Y + 0.5);
    for (let X = 0; X < GW; X++) { const wx = V.wx(X + 0.5), k = Math.floor((0.4 + 0.6 * Math.min(1, Math.max(0, wy) / 560)) * 4 + bayer(X, Y)) / 4; let col = [W0[0] + (W1[0] - W0[0]) * k, W0[1] + (W1[1] - W0[1]) * k, W0[2] + (W1[2] - W0[2]) * k];
      const d = Math.hypot((wx - SCREEN.cx) / 1.15, wy - SCREEN.cy), gk = Math.max(0, 1 - d / 250) * 0.6, q = Math.floor(gk * 5 + bayer(X + 1, Y + 2)) / 5; col = [col[0] + (G[0] - col[0]) * q * 0.6, col[1] + (G[1] - col[1]) * q * 0.6, col[2] + (G[2] - col[2]) * q * 0.6];
      const dl = Math.hypot(wx - LS.x, (wy - LS.y) * 1.1), lk = Math.max(0, 1 - dl / 150) * 0.55, ql = Math.floor(lk * 4 + bayer(X + 2, Y + 1)) / 4; col = [col[0] + (WARM[0] - col[0]) * ql * 0.45, col[1] + (WARM[1] - col[1]) * ql * 0.45, col[2] + (WARM[2] - col[2]) * ql * 0.45];
      const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  // baseboard (catalog: a thin dark skirting line where the wall meets the floor)
  wrect(c, V, -600, FLOOR_Y - 8, 1200, FLOOR_Y, "#1A1428"); wrect(c, V, -600, FLOOR_Y - 8, 1200, FLOOR_Y - 7, "#2C2242");
  // floor: the film's dark carpet with faint lines (floor plane p 1, to the bottom edge)
  { const yf = Math.max(yFloor, 0); for (let Y = yf; Y < GH; Y++) for (let X = 0; X < GW; X++) put(c, X, Y, hex("#120C18"));
    for (let k = 0; k < 14; k++) wrect(c, F, -900, FLOOR_Y + 40 + k * 70, 1500, FLOOR_Y + 42 + k * 70, "#1A1222");
    // catalog: an oval rug under the stage (plum field, navy border, a muted inner line) — flat bands, dithered rim
    { const RG = { cx: 236, cy: FLOOR_Y + 46, rx: 196, ry: 30 }, C0 = hex("#1E2244"), C1 = hex("#3A1E34"), C2 = hex("#5A4064"), C3 = hex("#2E1A2C");
      const ya = Math.max(yf, Math.floor(F.Y(RG.cy - RG.ry))), yb = Math.min(GH, Math.ceil(F.Y(RG.cy + RG.ry))), xa = Math.max(0, Math.floor(F.X(RG.cx - RG.rx))), xb = Math.min(GW, Math.ceil(F.X(RG.cx + RG.rx)));
      for (let Y = ya; Y < yb; Y++) for (let X = xa; X < xb; X++) { const e = Math.hypot((F.wx(X + 0.5) - RG.cx) / RG.rx, (F.wy(Y + 0.5) - RG.cy) / RG.ry), b = bayer(X, Y); if (e > 1 + (b - 0.5) * 0.04) continue;
        put(c, X, Y, e > 0.86 ? C0 : Math.abs(e - 0.74) < 0.035 ? C2 : e < 0.3 + (b - 0.5) * 0.04 ? C3 : C1); } }
    // the screen's glow on the carpet in front of the stand (dithered, two levels)
    for (let Y = yf; Y < GH; Y++) { const wy = F.wy(Y + 0.5); if (wy > FLOOR_Y + 120) break; for (let X = 0; X < GW; X++) { const wx = F.wx(X + 0.5), e = Math.hypot((wx - SCREEN.cx) / 150, (wy - FLOOR_Y - 10) / 60); if (e >= 1) continue; const q = Math.floor((1 - e) * 2.4 + bayer(X, Y)) / 2.4; if (q > 0) { const i = (Y * GW + X) * 3; c.d[i] += (G[0] - c.d[i]) * q * 0.22; c.d[i + 1] += (G[1] - c.d[i + 1]) * q * 0.22; c.d[i + 2] += (G[2] - c.d[i + 2]) * q * 0.22; } } } }
  // the floor lamp (duck-hunt film), now on: pole, ring, glowing shade
  { const VL = sub(V, { s: LAMP.s, x: LAMP.cx, y: FLOOR_Y }, 10, 560);
    wrect(c, VL, -2, 554, 22, 560, "#2A2236");
    { const pw = Math.max(2, R(4 * VL.z)), x0 = R(VL.X(10) - pw / 2), y0 = R(VL.Y(120)), y1 = R(VL.Y(556)), P0 = hex("#3A3046"), P1 = hex("#5A4E66");   // catalog: the pole at a whole-pixel width with a 1-px lit edge (a 0.8-px edge blinked)
      for (let Y = y0; Y < y1; Y++) for (let k = 0; k < pw; k++) put(c, x0 + k, Y, k === 0 ? P1 : P0); }
    wrect(c, VL, -2, 330, 22, 340, "#2A2236");
    wpoly(c, VL, [[-26, 60], [46, 60], [58, 120], [-38, 120]], "#C8A050"); wpoly(c, VL, [[-20, 66], [40, 66], [50, 114], [-30, 114]], "#E8C878"); wpoly(c, VL, [[-14, 72], [30, 72], [36, 108], [-20, 108]], "#F8E4A8");
    wrect(c, VL, -38, 120, 58, 123, "#A8803A"); }
  // night window (Tetris film) with the moon and a few stars
  { const VW = sub(V, WIN, 14, 40);
    wrect(c, VW, 14, 40, 70, 176, "#0B0820"); wrect(c, VW, 18, 44, 66, 172, "#18224A"); wrect(c, VW, 18, 44, 66, 80, "#141C40");
    wdisc(c, VW, 30, 64, 6, "#E8E4C8"); wdisc(c, VW, 28.5, 62.5, 2, "#FFFBEA");
    for (const [sx, sy, ph] of [[54, 52, 0.3], [24, 92, 1.9], [58, 128, 3.1], [30, 150, 4.4], [50, 84, 5.2]]) { const k = 0.5 + 0.5 * Math.sin(t * 1.1 + ph), X = R(VW.X(sx)), Y = R(VW.Y(sy)), col = mix("#18224A", "#F4F0D8", 0.25 + 0.65 * k); put(c, X, Y, col); }
    wrect(c, VW, 40, 44, 44, 172, "#2A2240"); wrect(c, VW, 18, 106, 66, 110, "#2A2240"); wbox(c, VW, 10, 176, 74, 180, "#2E2448"); wrect(c, VW, 10, 176, 74, 177, "#463A66"); }
  // framed landscape picture (duck-hunt film: sky over grass)
  { const VP = sub(V, PIC, 488, 60);
    wbox(c, VP, 488, 60, 536, 120, "#3A2A20"); wrect(c, VP, 488, 60, 536, 62, "#5A4434"); wrect(c, VP, 492, 64, 532, 116, "#5A8AC8"); wrect(c, VP, 492, 64, 532, 78, "#4A78B8"); wrect(c, VP, 492, 98, 532, 116, "#3A7A3A"); wrect(c, VP, 492, 98, 532, 100, "#4E9A4A"); }
  // stand + console + cable, then the CRT (film group, scaled)
  wbox(c, VG, 54, STAND.y0, 486, STAND.y0 + 10, "#4A3426"); wrect(c, VG, 54, STAND.y0, 486, STAND.y0 + 3, "#6A4C36"); wbox(c, VG, 64, STAND.y0 + 10, 476, STAND.y1, "#3A281E"); wrect(c, VG, 74, STAND.y0 + 18, 466, STAND.y1 - 8, "#2A1C16");
  // catalog: a generic charcoal console with a green power light (not the film's grey box with a red light)
  wbox(c, VG, 110, STAND.y0 + 50, 250, STAND.y0 + 86, "#2C2A34"); wrect(c, VG, 110, STAND.y0 + 50, 250, STAND.y0 + 56, "#46424F"); wrect(c, VG, 122, STAND.y0 + 66, 200, STAND.y0 + 69, "#1A1820");
  wrect(c, VG, 226, STAND.y0 + 64, 236, STAND.y0 + 72, "#4E4A58"); wdisc(c, VG, 214, STAND.y0 + 68, 2.6, "#65DA41");
  wline(c, VG, 240, STAND.y0 + 86, 262, STAND.y1 + 40, 3, "#1E1C26");
  drawCRT(c, VG);
  drawScreen(c, VG, t);
  for (const [cx, cy] of [[SCR.x, SCR.y], [SCR.x + SCR.w - 5, SCR.y], [SCR.x, SCR.y + SCR.h - 5], [SCR.x + SCR.w - 5, SCR.y + SCR.h - 5]]) wrect(c, VG, cx, cy, cx + 5, cy + 5, "#141218");
}
function drawCRT(c, V) {
  const o = 1 / V.z;   // catalog: outline of the rounded body (two crossed rects, each 1 px bigger, in INK first)
  wrect(c, V, TV.x0 + 8 - o, TV.y0 - o, TV.x1 - 8 + o, TV.y1 + o, INK); wrect(c, V, TV.x0 - o, TV.y0 + 8 - o, TV.x1 + o, TV.y1 - 8 + o, INK);
  wrect(c, V, TV.x0 + 8, TV.y0, TV.x1 - 8, TV.y1, "#2E2A36"); wrect(c, V, TV.x0, TV.y0 + 8, TV.x1, TV.y1 - 8, "#2E2A36"); wrect(c, V, TV.x0 + 8, TV.y0 + 4, TV.x1 - 8, TV.y0 + 10, "#4A4656");
  wrect(c, V, SCR.x - 6, SCR.y - 6, SCR.x + SCR.w + 6, SCR.y + SCR.h + 6, "#141218");
  wrect(c, V, TV.x0 + 40, TV.y1 - 40, TV.x1 - 40, TV.y1 - 34, "#24202C"); wdisc(c, V, TV.x1 - 34, TV.y1 - 22, 6, "#5A5666"); wdisc(c, V, TV.x1 - 54, TV.y1 - 22, 6, "#5A5666"); wdisc(c, V, TV.x0 + 30, TV.y1 - 22, 3, "#65DA41");
}
// catalog: the plain glowing CRT picture — no game. A flat blue field, darker toward the curved edges (one narrow dithered
// seam), scanlines, a slow rolling brighter band across the full width (one pass every 12.5 s) and the film's faint glass
// highlight in the top-left corner.
const SC = [hex("#1A2860"), hex("#26387E"), hex("#33499C"), hex("#4664B8"), hex("#5E80D0"), hex("#7C9CE2")], SCAN = hex("#22327A");
const seam = (x, w, b) => (x <= -w ? 0 : x >= w ? 1 : (x + w) / (2 * w) > b ? 1 : 0);   // narrow dithered step at x = 0
function drawScreen(c, V, t) {
  const X0 = Math.max(0, R(V.X(SCR.x))), X1 = Math.min(GW, R(V.X(SCR.x + SCR.w))), Y0 = Math.max(0, R(V.Y(SCR.y))), Y1 = Math.min(GH, R(V.Y(SCR.y + SCR.h)));
  const roll = ((t * 0.08) % 1 + 1) % 1, line = Math.max(3, R(5 * V.z)), sy0 = V.Y(SCR.y), sh = SCR.h * V.z, sx0 = V.X(SCR.x), sw = SCR.w * V.z;
  for (let Y = Y0; Y < Y1; Y++) { const v = (Y + 0.5 - sy0) / sh, dr = Math.min(Math.abs(v - roll), Math.abs(v - roll + 1), Math.abs(v - roll - 1));
    const scan = (((Y - R(sy0)) % line) + line) % line === line - 1, ev = Math.abs(v - 0.5) * 2;
    for (let X = X0; X < X1; X++) { const u = (X + 0.5 - sx0) / sw, b = bayer(X, Y), du = Math.abs(u - 0.5) * 2, e = Math.pow(du ** 4 + ev ** 4, 0.25);   // rounded-rect distance from the centre
      let lv = 1 + seam(0.96 - e, 0.04, b) + seam(0.8 - e, 0.05, b) + seam(0.5 - e, 0.06, b) + seam(0.085 - dr, 0.03, b);   // edge 1 → centre 4, the rolling band +1
      let col = SC[Math.max(0, Math.min(5, lv))];
      if (scan) col = SCAN;   // one flat dark scanline colour (a per-level tint made sparse colours that re-phased)
      const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  for (let k = 0; k < 3; k++) wrect(c, V, SCR.x + 8 + k * 6, SCR.y + 6, SCR.x + 60 - k * 6, SCR.y + 8, "#8CA4E0", 0.35);
}
