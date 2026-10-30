// The living room of «How the Duck Hunt gun knew»: world units (the room is 540 × 960 at zoom 1) seen through a camera
// V, so zooms into the TV and into the gun stay crisp. A dark room at night, a CRT TV on a low stand with a generic grey
// console, the TV's glow on the wall, and a kid seen from behind aiming a generic light gun (our own drawing, no brand).
import { bayer, mix, hex } from "./lib/raster.mjs";

export const GW = 540, GH = 960;
export const TV = { x0: 70, y0: 120, x1: 470, y1: 460 }, SCR = { x: 100, y: 146, w: 340, h: 255 }, STAND = { y0: 460, y1: 560 };
export const view = (cam) => ({ z: cam.z, cx: cam.cx, cy: cam.cy, X: (wx) => GW / 2 + (wx - cam.cx) * cam.z, Y: (wy) => (cam.ay ?? GH / 2) + (wy - cam.cy) * cam.z, inv: (sx, sy) => [cam.cx + (sx - GW / 2) / cam.z, cam.cy + (sy - (cam.ay ?? GH / 2)) / cam.z] });
const R = Math.round;
export function put(c, X, Y, col, a = 1) { if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; if (a < 1 && !(a > bayer(X, Y))) return; const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; }
export function wrect(c, V, x0, y0, x1, y1, col, a = 1) { const X0 = Math.max(0, R(V.X(x0))), X1 = Math.min(GW, R(V.X(x1))), Y0 = Math.max(0, R(V.Y(y0))), Y1 = Math.min(GH, R(V.Y(y1))); const k = hex(col); for (let Y = Y0; Y < Y1; Y++) for (let X = X0; X < X1; X++) put(c, X, Y, k, a); }
export function wpoly(c, V, pts, col, a = 1) {
  const s = pts.map(([x, y]) => [V.X(x), V.Y(y)]), k = typeof col === "function" ? null : hex(col); let y0 = Infinity, y1 = -Infinity; for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let Y = Math.max(0, Math.ceil(y0 - 0.5)); Y <= Math.min(GH - 1, Math.floor(y1 - 0.5)); Y++) { const yc = Y + 0.5, xs = []; for (let i = 0; i < s.length; i++) { const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((p, q) => p - q);
    for (let j = 0; j + 1 < xs.length; j += 2) for (let X = Math.max(0, Math.ceil(xs[j] - 0.5)); X <= Math.min(GW - 1, Math.floor(xs[j + 1] - 0.5)); X++) put(c, X, Y, k || hex(col(X, Y)), a); }
}
export const wdisc = (c, V, cx, cy, r, col, a = 1) => { const n = 24, pts = []; for (let i = 0; i < n; i++) { const an = (i / n) * 2 * Math.PI; pts.push([cx + Math.cos(an) * r, cy + Math.sin(an) * r]); } wpoly(c, V, pts, col, a); };
export function wline(c, V, x0, y0, x1, y1, w, col, a = 1) { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2; wpoly(c, V, [[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col, a); wdisc(c, V, x1, y1, w / 2, col, a); wdisc(c, V, x0, y0, w / 2, col, a); }

// ---------------------------------------------------------------- the room
/** glow: [r,g,b] average screen colour (kept smooth by the caller), flash: 0..1 extra brightness on the wall */
export function drawRoom(c, V, t, glow, drawScreen, flat = 0) {
  const W0 = hex("#140F22"), W1 = hex("#221A38"), G = glow;
  for (let Y = 0; Y < GH; Y++) { const wy = (Y - V.Y(0)) / V.z; if (wy > STAND.y1) continue;
    for (let X = 0; X < GW; X++) { const wx = (X - V.X(0)) / V.z, k = Math.floor((0.4 + 0.6 * Math.min(1, Math.max(0, wy) / 560)) * 4 + bayer(X, Y)) / 4; let col = [W0[0] + (W1[0] - W0[0]) * k, W0[1] + (W1[1] - W0[1]) * k, W0[2] + (W1[2] - W0[2]) * k];
      const d = Math.hypot((wx - 270) / 1.15, wy - 290), gk = Math.max(0, 1 - d / 340) * 0.6, q = Math.floor(gk * 5 + bayer(X + 1, Y + 2)) / 5; col = [col[0] + (G[0] - col[0]) * q * 0.6, col[1] + (G[1] - col[1]) * q * 0.6, col[2] + (G[2] - col[2]) * q * 0.6];
      const i = (Y * GW + X) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  // a floor lamp on the left (its bulb matters later) and a framed duck picture on the right
  wrect(c, V, -2, 330, 22, 340, "#2A2236"); wrect(c, V, 8, 120, 12, 560, "#3A3046"); wpoly(c, V, [[-26, 60], [46, 60], [58, 120], [-38, 120]], "#C8A050"); wpoly(c, V, [[-20, 66], [40, 66], [50, 114], [-30, 114]], "#E8C878");
  wrect(c, V, 488, 60, 536, 120, "#3A2A20"); wrect(c, V, 492, 64, 532, 116, "#5A8AC8"); wrect(c, V, 492, 98, 532, 116, "#3A7A3A");
  // floor
  wrect(c, V, -500, STAND.y1, 1040, 1500, "#120C18"); for (let k = 0; k < 7; k++) wrect(c, V, -500, STAND.y1 + 40 + k * 70, 1040, STAND.y1 + 42 + k * 70, "#1A1222");
  // stand + console + the gun's cable
  wrect(c, V, 54, STAND.y0, 486, STAND.y0 + 10, "#4A3426"); wrect(c, V, 64, STAND.y0 + 10, 476, STAND.y1, "#3A281E"); wrect(c, V, 74, STAND.y0 + 18, 466, STAND.y1 - 8, "#2A1C16");
  wrect(c, V, 110, STAND.y0 + 46, 250, STAND.y0 + 86, "#8E8E98"); wrect(c, V, 110, STAND.y0 + 46, 250, STAND.y0 + 52, "#A8A8B2"); wrect(c, V, 124, STAND.y0 + 62, 180, STAND.y0 + 74, "#2A2A30"); wrect(c, V, 210, STAND.y0 + 62, 222, STAND.y0 + 66, "#E03056");
  // TV: the tube TV, or (flat > 0) a flat panel dissolving in over it
  if (flat < 1) drawCRT(c, V, 1 - flat);
  if (flat > 0) drawFlat(c, V, flat);
  drawScreen(c, V);
  if (flat < 1) {
    for (const [cx, cy] of [[SCR.x, SCR.y], [SCR.x + SCR.w - 5, SCR.y], [SCR.x, SCR.y + SCR.h - 5], [SCR.x + SCR.w - 5, SCR.y + SCR.h - 5]]) wrect(c, V, cx, cy, cx + 5, cy + 5, "#141218", 1 - flat); }
}
function drawCRT(c, V, a) {
  wrect(c, V, TV.x0 + 8, TV.y0, TV.x1 - 8, TV.y1, "#2E2A36", a); wrect(c, V, TV.x0, TV.y0 + 8, TV.x1, TV.y1 - 8, "#2E2A36", a); wrect(c, V, TV.x0 + 8, TV.y0 + 4, TV.x1 - 8, TV.y0 + 10, "#4A4656", a);
  wrect(c, V, SCR.x - 6, SCR.y - 6, SCR.x + SCR.w + 6, SCR.y + SCR.h + 6, "#141218", a);
  wrect(c, V, TV.x0 + 40, TV.y1 - 40, TV.x1 - 40, TV.y1 - 34, "#24202C", a); wdisc(c, V, TV.x1 - 34, TV.y1 - 22, 6, "#5A5666", a); wdisc(c, V, TV.x1 - 54, TV.y1 - 22, 6, "#5A5666", a); wdisc(c, V, TV.x0 + 30, TV.y1 - 22, 3, "#65DA41", a);
}
function drawFlat(c, V, a) {
  // a slim flat panel: wider than the picture (black side bars), thin bezel, a small stand
  wrect(c, V, SCR.x - 64, SCR.y - 16, SCR.x + SCR.w + 64, SCR.y + SCR.h + 22, "#0E0D12", a);
  wrect(c, V, SCR.x - 60, SCR.y - 12, SCR.x + SCR.w + 60, SCR.y + SCR.h + 12, "#050508", a);
  wrect(c, V, SCR.x - 64, SCR.y + SCR.h + 16, SCR.x + SCR.w + 64, SCR.y + SCR.h + 22, "#2A2834", a);
  wrect(c, V, 250, SCR.y + SCR.h + 22, 290, STAND.y0, "#2A2834", a); wrect(c, V, 210, STAND.y0 - 6, 330, STAND.y0, "#3A3846", a);
  wdisc(c, V, SCR.x + SCR.w + 52, SCR.y + SCR.h + 18, 1.5, "#E8344E", a);
}

// ---------------------------------------------------------------- the kid from behind, aiming the light gun with both hands
// aim: a world point the barrel points at; recoil 0..1 (a small kick when the trigger is pulled)
export function drawKid(c, V, t, aim, recoil = 0, lamp = 0) {
  const cx = 250, hy = 604, HOOD = "#7A2A3A", HOOD2 = "#9A3A4A", HOODD = "#5A1E2C", RIM = "#F4CA50", HAIR = "#2A1A14", HAIR2 = "#3E281C", SKIN = "#C98E6A", SKIN2 = "#A8704E";
  // the gun is held out in front, a little right of the head and above it, its barrel toward the aim point
  const th = Math.atan2(aim[0] - 250, 600 - aim[1]), gx = 330 + th * 120 - lamp * 150, gy = 524 + (aim[1] - 280) * 0.06 + lamp * 10 - recoil * 6;
  // back and shoulders
  wpoly(c, V, [[cx - 160, 1000], [cx - 150, 690], [cx - 106, 640], [cx + 106, 640], [cx + 150, 690], [cx + 160, 1000]], HOOD);
  wpoly(c, V, [[cx - 106, 642], [cx + 106, 642], [cx + 126, 662], [cx - 126, 662]], RIM, 0.35);
  wpoly(c, V, [[cx - 56, 638], [cx + 56, 638], [cx + 42, 690], [cx - 42, 690]], HOOD2);
  // arms: from both shoulders up to the hands under the gun (the left arm crosses behind the head)
  const hands = () => { wline(c, V, cx - 104, 676, gx - 20, gy + 62, 34, HOODD); wline(c, V, cx + 112, 672, gx + 14, gy + 62, 38, HOOD);
    const tip = drawGun(c, V, gx, gy, aim, 1); wdisc(c, V, gx - 12, gy + 56, 17, SKIN2); wdisc(c, V, gx + 12, gy + 58, 17, SKIN); wdisc(c, V, gx - 2, gy + 44, 13, SKIN); return tip; };
  // the gun passes behind the head when it swings across: draw it before the head when it is near the middle
  const behind = Math.abs(gx - cx) < 70; let tip = null; if (behind) tip = hands();
  // head
  wdisc(c, V, cx, hy, 56, HAIR); wdisc(c, V, cx - 8, hy - 12, 42, HAIR2, 0.6);
  wdisc(c, V, cx - 54, hy + 8, 10, SKIN2); wdisc(c, V, cx + 54, hy + 8, 10, SKIN);
  if (!behind) tip = hands();
  return tip;
}
/** a generic light gun (our own shape) seen from behind: the back of the body, the grip going down, and the barrel
 *  receding toward the aim point (its orange tip smaller, further away). Returns the screen-world tip. */
export function drawGun(c, V, gx, gy, aim, a = 1) {
  const dx = aim[0] - gx, dy = aim[1] - gy, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, reach = 54, S = 1.4;
  const tx = gx + ux * reach, ty = gy + uy * reach * 0.8;
  // barrel: a tapering prism from the back face (w 30, h 20) to the tip (w 16, h 11)
  const back = [[gx - 15 * S, gy - 10 * S], [gx + 15 * S, gy - 10 * S], [gx + 15 * S, gy + 10 * S], [gx - 15 * S, gy + 10 * S]], tip = [[tx - 8 * S, ty - 5.5 * S], [tx + 8 * S, ty - 5.5 * S], [tx + 8 * S, ty + 5.5 * S], [tx - 8 * S, ty + 5.5 * S]];
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; wpoly(c, V, [back[i], back[j], tip[j], tip[i]], i === 0 ? "#9A96A6" : i === 1 ? "#6E6A7A" : i === 2 ? "#4A4656" : "#7E7A8C", a); }
  wpoly(c, V, tip, "#F08A3C", a); wpoly(c, V, [[tx - 5.6, ty - 3.5], [tx + 5.6, ty - 3.5], [tx + 5.6, ty + 3.5], [tx - 5.6, ty + 3.5]], "#2A2430", a);
  wpoly(c, V, back, "#5E5A6A", a); wpoly(c, V, [[gx - 18, gy - 11], [gx + 18, gy - 11], [gx + 18, gy - 6], [gx - 18, gy - 6]], "#8E8A9C", a);
  // grip down to the hands, trigger guard
  wpoly(c, V, [[gx - 14, gy + 11], [gx + 11, gy + 11], [gx + 17, gy + 62], [gx - 8, gy + 64]], "#3E3A48", a);
  return [tx, ty];
}
