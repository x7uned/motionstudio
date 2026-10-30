// The real world of the ping film: one night city in side elevation, drawn on the 540×960 grid through a camera
// {cx, cy, z}: screen = (270 + (wx - cx)·z, 480 + (wy - cy)·z). Ground at y = 0, underground y > 0, up is −y.
// Left: your apartment block (your room on floor 1, your friend's on floor 3, both cut away). Middle: the game server
// (a data-centre hall, cut away, with the tall portrait "map" screen). Right: the enemy's house (his room cut away).
// One fibre cable runs underground between them; packets travel along it.
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";

const GW = 540, GH = 960, R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- camera transform
export function G(cam) {
  const z = cam.z;
  return { z, cx: cam.cx, cy: cam.cy, X: (wx) => 270 + (wx - cam.cx) * z, Y: (wy) => 480 + (wy - cam.cy) * z, inv: (sx, sy) => [cam.cx + (sx - 270) / z, cam.cy + (sy - 480) / z] };
}
/** Fast clipped fill of the world rect [x0,x1)×[y0,y1) (world units). col may be a function (sx, sy) → colour. */
export function wrect(c, g, x0, y0, x1, y1, col) {
  let a = R(g.X(x0)), b = R(g.Y(y0)), e = R(g.X(x1)), f = R(g.Y(y1));
  if (e <= 0 || f <= 0 || a >= GW || b >= GH) return;
  a = Math.max(0, a); b = Math.max(0, b); e = Math.min(GW, e); f = Math.min(GH, f);
  if (typeof col === "function") { for (let y = b; y < f; y++) for (let x = a; x < e; x++) { const cc = col(x, y); if (cc) c.px(x, y, cc); } return; }
  for (let y = b; y < f; y++) for (let x = a; x < e; x++) c.px(x, y, col);
}
/** screen-space clipped fill */
export function srect(c, x, y, w, h, col) { const a = Math.max(0, R(x)), b = Math.max(0, R(y)), e = Math.min(GW, R(x + w)), f = Math.min(GH, R(y + h)); for (let j = b; j < f; j++) for (let i = a; i < e; i++) c.px(i, j, col); }

// ---------------------------------------------------------------- text that scales smoothly with the camera (nearest sampling of a 1× bitmap)
const textCache = new Map();
function textBitmap(font, str) {
  const key = (font === TINY ? "T" : "M") + str; let b = textCache.get(key); if (b) return b;
  const w = Math.max(1, new Canvas(1, 1).measure(font, str)) + 2, h = font.height + 2, cv = new Canvas(w, h, "#000000");
  cv.text(font, str, 1, 1, "#FFFFFF"); const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = cv.d[i * 3] > 128 ? 1 : 0;
  b = { w, h, m }; textCache.set(key, b); return b;
}
/** draw text with its left/top at (sx, sy) screen px, pixel size `ps` (any positive float). align: 0 left, 0.5 centre. */
export function stext(c, font, str, sx, sy, ps, col, { align = 0, alpha = 1, shadow = null } = {}) {
  const b = textBitmap(font, str), W = b.w * ps, H = b.h * ps, x0 = sx - W * align;
  if (shadow) stext(c, font, str, sx + Math.max(1, R(ps * 0.6)), sy + Math.max(1, R(ps * 0.6)), ps, shadow, { align, alpha });
  const a = Math.max(0, Math.floor(x0)), e = Math.min(GW, Math.ceil(x0 + W)), top = Math.max(0, Math.floor(sy)), bot = Math.min(GH, Math.ceil(sy + H));
  for (let y = top; y < bot; y++) { const v = Math.floor((y - sy) / ps); if (v < 0 || v >= b.h) continue;
    for (let x = a; x < e; x++) { const u = Math.floor((x - x0) / ps); if (u < 0 || u >= b.w || !b.m[v * b.w + u]) continue; if (alpha < 1 && alpha <= bayer(x, y)) continue; c.px(x, y, typeof col === "function" ? col(x, y) : col); } }
  return { x: x0, w: W, h: H };
}
export function textW(font, str, ps) { return textBitmap(font, str).w * ps; }

// ---------------------------------------------------------------- palette
export const P = {
  ink: "#0B0812", card: "#120C1D", iv: "#FDFEED", y: "#F4CA50", yl: "#FAE375", l: "#E0CDF8", p: "#8D59DA", pk: "#E03056", gr: "#65DA41",
  p1: "#1D1628", p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", cy: "#5FD3F0", cyD: "#2A6E9A", or: "#F08A3C", orD: "#8A3A18", red: "#E8344E",
  sky0: "#07050D", sky1: "#120C22", sky2: "#22183E", sky3: "#33255A", sky4: "#4A3470",
};
const BRICK = ["#140F20", "#1C1530", "#251C3E", "#2E2350", "#3A2D62"];
const HOUSE = ["#1A0F18", "#2A1724", "#3A2030", "#4C2A3C", "#5E3648"];
const DC = ["#0F1220", "#171C30", "#202842", "#2C3656", "#3C4870"];
const SOIL = ["#0C0810", "#140D18", "#1C1322", "#261A2C"];

// ---------------------------------------------------------------- geometry
export const FH = 130;
export const B1 = { x0: -180, x1: 180, floors: 5 };                  // your apartment block
export const ROOM_YOU = { x0: -150, x1: 110, y0: -260, y1: -130, floor: 1, chairX: -52, led: "#8D59DA", led2: "#5FD3F0" };
export const ROOM_FRIEND = { x0: -150, x1: 110, y0: -520, y1: -390, floor: 3, chairX: -52, led: "#65DA41", led2: "#B08AE8" };
export const B2 = { x0: 700, x1: 1010, top: -200 };                    // the game server hall
export const SCREEN = { x: 827, y: -158, w: 54, h: 96 };              // portrait map screen on the back wall (9:16)
export const B3 = { x0: 1300, x1: 1560 };                             // the enemy's house
export const ROOM_ENEMY = { x0: 1316, x1: 1546, y0: -260, y1: -130, floor: 1, chairX: 1384, led: "#F08A3C", led2: "#E03056" };
export const CABLE_Y = 64;

// ---------------------------------------------------------------- sky, stars, moon, far skyline
export function drawSky(c, cam, t) {
  const g = G(cam), hz = g.Y(-40); // the horizon glow sits just above the street
  for (let y = 0; y < GH; y++) {
    const k = clamp01(1 - (hz - y) / 900), q = k * 4, lo = Math.floor(q), f = q - lo, ramp = [P.sky0, P.sky1, P.sky2, P.sky3, P.sky4];
    for (let x = 0; x < GW; x++) c.px(x, y, ramp[Math.min(4, f > bayer(x, y) ? lo + 1 : lo)]);
  }
  // stars: fixed field drifting slowly with the camera (deep parallax), twinkling
  const sx = cam.cx * 0.04, sy = cam.cy * 0.04;
  for (let i = 0; i < 260; i++) {
    const x = ((rnd(i * 7 + 1) * 900 - sx) % 900 + 900) % 900 - 180, y = rnd(i * 7 + 2) * 760 - sy * 0.5 - 40; if (x < 0 || x >= GW || y < 0 || y > hz - 30) continue;
    const tw = 0.55 + 0.45 * Math.sin(t * (1.3 + rnd(i) * 2) + i), b = rnd(i * 7 + 3);
    c.px(x, y, mix(P.sky2, b > 0.85 ? P.iv : P.l, tw * (0.5 + b * 0.5)));
    if (b > 0.94) { c.px(x + 1, y, mix(P.sky2, P.l, tw * 0.5)); c.px(x - 1, y, mix(P.sky2, P.l, tw * 0.5)); c.px(x, y - 1, mix(P.sky2, P.l, tw * 0.5)); c.px(x, y + 1, mix(P.sky2, P.l, tw * 0.5)); }
  }
  // moon, deep parallax
  const mx = R(420 - cam.cx * 0.03), my = R(Math.min(hz - 260, 150 - cam.cy * 0.03));
  for (let r = 34; r > 14; r -= 4) fade(c, 0.12).disc(mx, my, r, P.sky4);
  c.disc(mx, my, 13, "#E9E2F6"); c.disc(mx + 3, my - 2, 11, "#F7F3FC"); c.disc(mx - 4, my + 3, 2, "#CFC6E2"); c.disc(mx + 4, my + 5, 1, "#CFC6E2"); c.disc(mx - 1, my - 5, 1, "#D8D0EA");
}
function skylineLayer(c, cam, t, p, seed, base, hMin, hMax, col, winCol) {
  // a parallax layer: world x scaled by p, buildings sit on the horizon line
  const z = cam.z * (0.35 + 0.65 * p), X = (wx) => 270 + (wx - cam.cx * p) * z, gy = 480 + (base - cam.cy * p) * z;
  const w0 = (cam.cx * p - 270 / z) - 200, w1 = (cam.cx * p + 270 / z) + 200;
  for (let k = Math.floor(w0 / 70); k <= Math.ceil(w1 / 70); k++) {
    const bw = 40 + rnd(seed + k * 3) * 50, bh = hMin + rnd(seed + k * 5) * (hMax - hMin), bx = k * 70 + rnd(seed + k * 7) * 20;
    const a = R(X(bx)), e = R(X(bx + bw)), top = R(gy - bh * z), bot = R(gy) + 2; if (e < 0 || a > GW) continue;
    srect(c, a, top, e - a, bot - top, col);
    if (rnd(seed + k * 11) > 0.6) srect(c, R(X(bx + bw * 0.4)), R(top - 10 * z), Math.max(1, R(2 * z)), R(10 * z), col);
    // windows: a few warm/lavender pixels
    const nx = Math.max(1, Math.floor(bw / 9)), ny = Math.max(1, Math.floor(bh / 11));
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const id = seed + k * 997 + i * 31 + j * 7; if (rnd(id) > 0.18) continue;
      const on = 0.5 + 0.5 * Math.sin(t * 0.3 + id); if (on < 0.15) continue;
      const wx = R(X(bx + 4 + i * 9)), wy = R(gy - (bh - 5 - j * 11) * z), s = Math.max(1, R(2.5 * z)); srect(c, wx, wy, s, Math.max(1, R(3 * z)), rnd(id + 1) > 0.5 ? winCol : P.p7); }
  }
}
export function drawSkyline(c, cam, t) {
  skylineLayer(c, cam, t, 0.35, 1000, -6, 60, 170, "#191230", "#7E5A3A");
  skylineLayer(c, cam, t, 0.6, 2000, -2, 40, 120, "#1F1638", "#B88A4E");
}

// ---------------------------------------------------------------- ground: street, sidewalk, soil, the fibre conduit
export function drawGround(c, cam, t) {
  const g = G(cam);
  const top = g.Y(0); if (top >= GH) return;
  // street surface (side view: kerb + asphalt strip), then the soil cross-section
  wrect(c, g, g.inv(0, 0)[0] - 10, -1, g.inv(GW, 0)[0] + 10, 4, (x, y) => (y === R(g.Y(-1)) ? "#5A4A7A" : "#3A2E54"));
  wrect(c, g, g.inv(0, 0)[0] - 10, 4, g.inv(GW, 0)[0] + 10, 16, "#1A1428");
  // lane dashes on the asphalt top edge
  for (let k = Math.floor(g.inv(0, 0)[0] / 60) - 1; k <= Math.ceil(g.inv(GW, 0)[0] / 60) + 1; k++) wrect(c, g, k * 60, 9, k * 60 + 26, 11, "#4E4468");
  wrect(c, g, g.inv(0, 0)[0] - 10, 16, g.inv(GW, 0)[0] + 10, 4000, (x, y) => {
    const [wx, wy] = g.inv(x + 0.5, y + 0.5), d = clamp01((wy - 16) / 200), q = 1 + d * 2.2, lo = Math.floor(q);
    let col = SOIL[Math.min(3, Math.max(0, 3 - (q - lo > bayer(x, y) ? lo + 1 : lo)))];
    // stones: hashed cells
    const cx = Math.floor(wx / 14), cy = Math.floor(wy / 12), h = rnd(cx * 73 + cy * 919);
    if (h > 0.82) { const ox = cx * 14 + 3 + rnd(h * 1e4) * 7, oy = cy * 12 + 3 + rnd(h * 3e4) * 5, rr = 2 + rnd(h * 5e4) * 2.5; if ((wx - ox) ** 2 + ((wy - oy) * 1.4) ** 2 < rr * rr) col = (wy - oy) < -0.5 ? "#3A2D44" : "#2A2034"; }
    return col;
  });
  // the conduit with the fibre
  const cy0 = CABLE_Y - 5, cy1 = CABLE_Y + 5;
  wrect(c, g, g.inv(0, 0)[0] - 10, cy0, g.inv(GW, 0)[0] + 10, cy1, (x, y) => { const v = (y - g.Y(cy0)) / Math.max(1, g.Y(cy1) - g.Y(cy0)); return v < 0.18 ? "#4A4060" : v > 0.82 ? "#14101E" : "#2C243C"; });
  const glow = 0.55 + 0.1 * Math.sin(t * 2);
  wrect(c, g, g.inv(0, 0)[0] - 10, CABLE_Y - 0.8, g.inv(GW, 0)[0] + 10, CABLE_Y + 0.8, mix("#1E4A66", P.cy, glow));
  // conduit joints
  for (let k = Math.floor(g.inv(0, 0)[0] / 80) - 1; k <= Math.ceil(g.inv(GW, 0)[0] / 80) + 1; k++) wrect(c, g, k * 80, cy0 - 1, k * 80 + 4, cy1 + 1, "#5A4E74");
}

// ---------------------------------------------------------------- facade helpers
function brickWall(c, g, x0, y0, x1, y1, ramp, seed, lightFrom = -1) {
  const bw = 12, bh = 5;
  wrect(c, g, x0, y0, x1, y1, (x, y) => {
    const [wx, wy] = g.inv(x + 0.5, y + 0.5), row = Math.floor((wy - y0) / bh), off = row % 2 ? bw / 2 : 0, col = Math.floor((wx - x0 + off) / bw);
    const fy = (wy - y0) - row * bh, fx = (wx - x0 + off) - col * bw, mortar = (fy < 0.8 || fx < 0.8) && g.z > 0.7;
    const v = rnd(seed + row * 131 + col * 17), edge = clamp01((wx - x0) / 40) * clamp01((x1 - wx) / 40);
    let k = 2 + (v > 0.8 ? 1 : v < 0.15 ? -1 : 0) + (lightFrom < 0 ? (1 - clamp01((wx - x0) / 60)) * 0.9 : 0);
    if (mortar) k -= 1.4;
    const q = Math.max(0, Math.min(ramp.length - 1, Math.floor(k + 0.5 * (1 - edge) * -1 + (k % 1 > bayer(x, y) ? 1 : 0))));
    return ramp[q];
  });
}
function windowLit(c, g, x, y, w, h, t, id, mode) {
  // frame + glass; mode: 0 dark, 1 warm lamp, 2 tv blue flicker, 3 curtains
  wrect(c, g, x - 2, y - 2, x + w + 2, y + h + 3, "#4A3A6A"); wrect(c, g, x - 3, y + h + 1, x + w + 3, y + h + 4, "#5E4C84");
  const fl = mode === 2 ? 0.75 + 0.25 * Math.sin(t * 9 + id) * Math.sin(t * 3.3 + id * 2) : 1;
  const base = mode === 0 ? ["#120C1E", "#1A1230"] : mode === 2 ? [mix("#16244A", "#3E7AC0", 0.5 * fl), mix("#2A4A86", "#7EB4F0", 0.6 * fl)] : ["#7A4A26", "#E0A050"];
  wrect(c, g, x, y, x + w, y + h, (sx, sy) => { const [, wy] = g.inv(sx, sy + 0.5), v = (wy - y) / h; return v < 0.5 ? (v * 2 > bayer(sx, sy) ? base[1] : base[0]) : base[0]; });
  if (mode === 3) { wrect(c, g, x, y, x + w * 0.3, y + h, "#8A4A5A"); wrect(c, g, x + w * 0.7, y, x + w, y + h, "#8A4A5A"); wrect(c, g, x + w * 0.3, y, x + w * 0.7, y + h, "#D89A50"); }
  if (mode === 1 && rnd(id) > 0.5) { // a plant on the sill
    wrect(c, g, x + w * 0.65, y + h - 7, x + w * 0.65 + 6, y + h, "#6A3A2A"); for (let k = 0; k < 5; k++) wrect(c, g, x + w * 0.62 + k * 2, y + h - 11 - (k % 2) * 3, x + w * 0.62 + k * 2 + 2, y + h - 6, "#3C7A3A"); }
  wrect(c, g, x + w / 2 - 1, y, x + w / 2 + 1, y + h, "#4A3A6A"); wrect(c, g, x, y + h * 0.45, x + w, y + h * 0.45 + 2, "#4A3A6A");
}
function slab(c, g, x0, x1, y) { wrect(c, g, x0, y - 3, x1, y + 3, (sx, sy) => (sy <= R(g.Y(y - 3)) + 0 ? "#6A5A8A" : "#3A2E54")); }

// ---------------------------------------------------------------- room interior (cut-away); the desk set is drawn by the caller
export function drawRoomShell(c, g, room, t, st = {}) {
  const { x0, x1, y0, y1 } = room, led = room.led, led2 = room.led2;
  // back wall: dark, lit by the monitor (cool) from the desk and by the LED strip under the ceiling
  const mx = room.chairX + 95, my = y1 - 40;
  wrect(c, g, x0, y0, x1, y1, (sx, sy) => {
    const [wx, wy] = g.inv(sx + 0.5, sy + 0.5);
    const dm = Math.hypot((wx - mx) / 70, (wy - my) / 45), mon = clamp01(1 - dm) * (st.screenGlow ?? 1), top = clamp01(1 - (wy - y0) / 26);
    let base = (Math.floor((wx - x0) / 10) % 2 ? "#1A1328" : "#1C152C");
    let col = base;
    if (top > bayer(sx, sy) * 1.3) col = mix(base, led, 0.35 * top);
    if (mon > 0.04) { const q = Math.pow(mon, 1.4) * 4, lo = Math.floor(q), k = (q - lo > bayer(sx, sy) ? lo + 1 : lo) / 4; col = mix(col, st.screenColor ?? "#5E8EC8", 0.3 * k); }
    return col;
  });
  // LED strip under the ceiling
  wrect(c, g, x0 + 2, y0 + 2, x1 - 2, y0 + 4, (sx) => mix(led, led2, 0.5 + 0.5 * Math.sin((sx * 0.08) / Math.max(0.5, g.z) + t * 1.6)));
  // floor: wooden planks
  wrect(c, g, x0, y1 - 4, x1, y1, (sx, sy) => { const [wx] = g.inv(sx + 0.5, sy); return Math.floor(wx / 16) % 2 ? "#4A2E26" : "#55362C"; });
  wrect(c, g, x0, y1 - 4, x1, y1 - 3, "#6E4A3A");
  // poster (game-themed shapes only, no text): a stylised soldier silhouette on a sand-orange sunset
  const px0 = room.chairX - 70, py0 = y0 + 18;
  if (px0 > x0 + 4) {
    wrect(c, g, px0 - 1, py0 - 1, px0 + 31, py0 + 41, "#0B0812");
    wrect(c, g, px0, py0, px0 + 30, py0 + 40, (sx, sy) => { const [, wy] = g.inv(sx, sy + 0.5), v = (wy - py0) / 40; return v < 0.55 ? (room.floor === 3 ? "#2E6A4E" : room === ROOM_ENEMY ? "#B04A2A" : "#C8784A") : "#E0A85A"; });
    wrect(c, g, px0 + 12, py0 + 12, px0 + 18, py0 + 18, "#120C1D"); wrect(c, g, px0 + 10, py0 + 18, px0 + 20, py0 + 32, "#120C1D"); wrect(c, g, px0 + 18, py0 + 21, px0 + 28, py0 + 23, "#120C1D"); wrect(c, g, px0 + 10, py0 + 32, px0 + 13, py0 + 40, "#120C1D"); wrect(c, g, px0 + 17, py0 + 32, px0 + 20, py0 + 40, "#120C1D");
  }
  // shelf on the right wall with small objects
  const shx = x1 - 52, shy = y0 + 30;
  wrect(c, g, shx, shy, shx + 44, shy + 3, "#5A3E34"); wrect(c, g, shx, shy + 3, shx + 44, shy + 4, "#2A1A18");
  wrect(c, g, shx + 4, shy - 9, shx + 9, shy, "#B08AE8"); wrect(c, g, shx + 5, shy - 12, shx + 8, shy - 9, "#E0CDF8");                 // figurine
  wrect(c, g, shx + 14, shy - 12, shx + 18, shy, "#3B2C5C"); wrect(c, g, shx + 18, shy - 10, shx + 22, shy, "#6E4FB0"); wrect(c, g, shx + 22, shy - 11, shx + 25, shy, "#8A3A3A"); // books
  // ceiling slab and side walls
  wrect(c, g, x0 - 3, y0 - 3, x1 + 3, y0, "#4A3C6A"); wrect(c, g, x0 - 3, y0, x0, y1, "#2A2040"); wrect(c, g, x1, y0, x1 + 3, y1, "#2A2040");
  return { monitorWall: [mx, my] };
}

// ---------------------------------------------------------------- your apartment block
export function drawBlock(c, cam, t, st = {}) {
  const g = G(cam), { x0, x1 } = B1, top = -FH * B1.floors;
  if (g.X(x1 + 30) < 0 || g.X(x0 - 30) > GW) return;
  brickWall(c, g, x0, top, x1, 0, BRICK, 11);
  // floor slabs and windows
  for (let f = 0; f < B1.floors; f++) {
    const fy1 = -f * FH, fy0 = fy1 - FH;
    if (f > 0) slab(c, g, x0, x1, fy1);
    if (f === ROOM_YOU.floor || f === ROOM_FRIEND.floor) {
      for (const wx of [128]) windowLit(c, g, wx, fy0 + 30, 34, 60, t, f * 10 + 3, f === 1 ? 0 : 3);
      continue;
    }
    if (f === 0) continue;
    for (const [i, wx] of [-150, -60, 30, 120].entries()) windowLit(c, g, wx, fy0 + 30, 34, 60, t, f * 10 + i, [1, 0, 2, 3, 0, 1, 2, 0, 3, 1, 0, 2][(f * 4 + i) % 12]);
  }
  // ground floor: entrance, lamp, mailbox
  wrect(c, g, -40, -58, 20, 0, "#120C1E"); wrect(c, g, -44, -62, 24, -58, "#5E4C84"); wrect(c, g, -38, -56, -11, 0, "#3A2A20"); wrect(c, g, -9, -56, 18, 0, "#3A2A20"); wrect(c, g, -14, -30, -12, -26, "#C8A060");
  { const k = 0.8 + 0.2 * Math.sin(t * 1.3); for (let r = 3; r >= 1; r--) fade(c, 0.07 * k).disc(R(g.X(-10)), R(g.Y(-68)), R(r * 5 * g.z), "#F4CA50"); wrect(c, g, -13, -72, -7, -66, "#FAE375"); }
  for (const [i, wx] of [-150, 60, 120].entries()) windowLit(c, g, wx, -100, 34, 60, t, 90 + i, [1, 0, 1][i]);
  // roof: parapet, water tank, antenna with a blinking light
  wrect(c, g, x0 - 4, top - 8, x1 + 4, top, "#4A3C6A"); wrect(c, g, x0 - 4, top - 8, x1 + 4, top - 7, "#6A5A8A");
  wrect(c, g, 90, top - 46, 140, top - 8, "#2A2040"); wrect(c, g, 86, top - 50, 144, top - 44, "#3A2E54"); for (const lx of [94, 134]) wrect(c, g, lx, top - 8, lx + 3, top, "#2A2040");
  wrect(c, g, -130, top - 70, -128, top - 8, "#5A4A7A"); for (let k = 0; k < 4; k++) wrect(c, g, -136 + k, top - 60 + k * 14, -122 - k, top - 59 + k * 14, "#5A4A7A");
  const blink = Math.sin(t * 3) > 0.2 ? 1 : 0.25; wrect(c, g, -131, top - 74, -127, top - 70, mix("#5A1A2A", P.pk, blink));
  // external conduit down the facade (the fibre comes out of the ground and up to your floor)
  wrect(c, g, 162, ROOM_YOU.y1 - 12, 168, CABLE_Y, (sx) => (sx === R(g.X(162)) ? "#6A5A8A" : "#3A2E54"));
  wrect(c, g, 150, ROOM_YOU.y1 - 14, 168, ROOM_YOU.y1 - 8, "#3A2E54");
}

// ---------------------------------------------------------------- the game server hall
export function drawServerHall(c, cam, t, st = {}) {
  const g = G(cam), { x0, x1, top } = B2;
  if (g.X(x1 + 40) < 0 || g.X(x0 - 40) > GW) return;
  // outer shell: corrugated panels; the front is cut away between x0+12 and x1-12
  wrect(c, g, x0, top, x1, 0, (sx, sy) => { const [wx] = g.inv(sx + 0.5, sy); const k = Math.floor(wx / 6) % 2; return DC[1 + k]; });
  wrect(c, g, x0 + 12, top + 14, x1 - 12, -2, (sx, sy) => {
    const [wx, wy] = g.inv(sx + 0.5, sy + 0.5), d = Math.hypot((wx - (SCREEN.x + SCREEN.w / 2)) / 120, (wy - (SCREEN.y + SCREEN.h / 2)) / 90), k = clamp01(1 - d);
    const base = Math.floor((wy - top) / 10) % 2 ? "#0E1120" : "#10142A"; return k > bayer(sx, sy) * 1.2 ? mix(base, "#2A3A7A", 0.5 * k) : base; });
  // raised floor tiles and ceiling cable trays
  wrect(c, g, x0 + 12, -8, x1 - 12, -2, (sx) => { const [wx] = g.inv(sx + 0.5, 0); return Math.floor(wx / 14) % 2 ? "#2C3656" : "#3C4870"; });
  wrect(c, g, x0 + 12, top + 14, x1 - 12, top + 18, "#2C3656");
  for (let k = 0; k < 14; k++) { const yy = top + 22 + (k % 2) * 3; wrect(c, g, x0 + 20 + k * 21, yy, x0 + 32 + k * 21, yy + 2, ["#E03056", "#5FD3F0", "#F4CA50", "#65DA41"][k % 4]); }
  // racks: left and right of the screen, LEDs blinking (deterministic)
  const busy = st.busy ?? 0;
  for (const rx of [x0 + 22, x0 + 56, x0 + 90, SCREEN.x + SCREEN.w + 16, SCREEN.x + SCREEN.w + 50, SCREEN.x + SCREEN.w + 84]) {
    if (rx + 28 > x1 - 12) continue;
    wrect(c, g, rx, -128, rx + 28, -8, "#0A0C16"); wrect(c, g, rx + 1, -127, rx + 27, -9, "#161B2E"); wrect(c, g, rx, -128, rx + 28, -127, "#3C4870");
    for (let u = 0; u < 14; u++) {
      const uy = -122 + u * 8; wrect(c, g, rx + 3, uy, rx + 25, uy + 6, u % 3 === 0 ? "#222A44" : "#1C2238"); wrect(c, g, rx + 3, uy, rx + 25, uy + 1, "#2C3656");
      for (let l = 0; l < 3; l++) { const id = rx * 31 + u * 7 + l, on = Math.sin(t * (3 + rnd(id) * 9) * (1 + busy) + id) > 0.1; wrect(c, g, rx + 18 + l * 2, uy + 3, rx + 19 + l * 2, uy + 4, on ? ["#65DA41", "#5FD3F0", "#F4CA50"][l] : "#16301E"); }
    }
  }
  // the tall portrait map screen (contents drawn by the caller into screenRect)
  wrect(c, g, SCREEN.x - 4, SCREEN.y - 4, SCREEN.x + SCREEN.w + 4, SCREEN.y + SCREEN.h + 4, "#05060C"); wrect(c, g, SCREEN.x - 4, SCREEN.y - 4, SCREEN.x + SCREEN.w + 4, SCREEN.y - 3, "#3C4870");
  wrect(c, g, SCREEN.x + SCREEN.w / 2 - 3, SCREEN.y + SCREEN.h + 4, SCREEN.x + SCREEN.w / 2 + 3, -8, "#2C3656");
  // cable comes up from the ground under the screen
  wrect(c, g, 851, SCREEN.y + SCREEN.h + 4, 855, CABLE_Y, "#2C243C"); wrect(c, g, 852.5, SCREEN.y + SCREEN.h + 4, 853.5, CABLE_Y, mix("#1E4A66", P.cy, 0.6));
  // side walls, roof, cooling units with spinning fans, the sign
  wrect(c, g, x0, top, x0 + 12, 0, DC[2]); wrect(c, g, x1 - 12, top, x1, 0, DC[2]); wrect(c, g, x0 - 4, top - 6, x1 + 4, top, "#3C4870"); wrect(c, g, x0 - 4, top - 6, x1 + 4, top - 5, "#5A6A9A");
  for (const ux of [x0 + 20, x0 + 80, x1 - 90]) { wrect(c, g, ux, top - 30, ux + 54, top - 6, "#202842"); wrect(c, g, ux, top - 30, ux + 54, top - 29, "#5A6A9A");
    for (const fx of [ux + 14, ux + 40]) { const cx = R(g.X(fx)), cy = R(g.Y(top - 18)), r = Math.max(2, R(9 * g.z)); c.disc(cx, cy, r, "#0A0C16"); const a = t * 9 + fx; for (let k = 0; k < 3; k++) { const an = a + (k * 2 * Math.PI) / 3; c.line(cx, cy, R(cx + Math.cos(an) * r * 0.9), R(cy + Math.sin(an) * r * 0.9), "#5A6A9A"); } } }
  // sign GAME SERVER on the roof edge (glows; lit up harder when `st.sign` = 1)
  const sk = st.sign ?? 1, sx0 = g.X((x0 + x1) / 2), sy0 = g.Y(top - 58), ps = 2.2 * g.z;
  const sw = textW(MAIN, "GAME SERVER", ps); srect(c, sx0 - sw / 2 - 6 * g.z, sy0 - 5 * g.z, sw + 12 * g.z, 9 * 2.2 * g.z + 10 * g.z, "#0A0C16");
  for (const lx of [-0.35, 0.35]) wrect(c, g, (x0 + x1) / 2 + lx * 160 - 1.5, top - 40, (x0 + x1) / 2 + lx * 160 + 1.5, top - 6, "#2C3656");
  stext(c, MAIN, "GAME SERVER", sx0, sy0, ps, mix("#6A5A30", P.y, 0.35 + 0.65 * sk), { align: 0.5 });
  // fence in front
  for (let k = 0; k < 18; k++) wrect(c, g, x0 - 30 + k * 20, -22, x0 - 28 + k * 20, 0, "#2C3656"); wrect(c, g, x0 - 30, -20, x1 + 30, -18, "#2C3656"); wrect(c, g, x0 - 30, -10, x1 + 30, -9, "#2C3656");
}
export function screenRect(cam) { const g = G(cam); return { x: g.X(SCREEN.x), y: g.Y(SCREEN.y), w: SCREEN.w * g.z, h: SCREEN.h * g.z }; }

// ---------------------------------------------------------------- the enemy's house
export function drawHouse(c, cam, t, st = {}) {
  const g = G(cam), { x0, x1 } = B3, top = -2 * FH;
  if (g.X(x1 + 60) < 0 || g.X(x0 - 60) > GW) return;
  brickWall(c, g, x0, top, x1, 0, HOUSE, 77);
  slab(c, g, x0, x1, -FH);
  // pitched roof
  const rx0 = g.X(x0 - 16), rx1 = g.X(x1 + 16), ry = g.Y(top), apex = g.Y(top - 90), mid = g.X((x0 + x1) / 2);
  c.poly([[rx0, ry], [mid, apex], [rx1, ry]], "#2A1420", (sx, sy) => { const k = (Math.floor((sy - apex) / Math.max(1, 6 * g.z)) % 2) ? "#3A1C2A" : "#2E1622"; return k; });
  c.line(R(rx0), R(ry), R(mid), R(apex), "#5E3648"); c.line(R(mid), R(apex), R(rx1), R(ry), "#5E3648");
  wrect(c, g, x1 - 60, top - 80, x1 - 40, top - 30, "#3A2030"); wrect(c, g, x1 - 63, top - 84, x1 - 37, top - 80, "#5E3648");
  // ground floor windows and door
  windowLit(c, g, x0 + 30, -100, 40, 60, t, 301, 1); windowLit(c, g, x1 - 80, -100, 40, 60, t, 302, 2);
  wrect(c, g, (x0 + x1) / 2 - 18, -60, (x0 + x1) / 2 + 18, 0, "#2A1810"); wrect(c, g, (x0 + x1) / 2 - 18, -60, (x0 + x1) / 2 + 18, -58, "#5E3648"); wrect(c, g, (x0 + x1) / 2 + 10, -32, (x0 + x1) / 2 + 13, -29, "#C8A060");
  // conduit to his floor
  wrect(c, g, x0 - 8, ROOM_ENEMY.y1 - 12, x0 - 2, CABLE_Y, (sx) => (sx === R(g.X(x0 - 8)) ? "#6A4A5A" : "#3A2030"));
  wrect(c, g, x0 - 8, ROOM_ENEMY.y1 - 14, x0 + 16, ROOM_ENEMY.y1 - 8, "#3A2030");
}

// ---------------------------------------------------------------- street props
function lamp(c, g, x, t) {
  wrect(c, g, x - 1.5, -110, x + 1.5, 0, "#3A2E54"); wrect(c, g, x - 1.5, -112, x + 18, -109, "#3A2E54"); wrect(c, g, x + 12, -110, x + 22, -106, "#5A4A7A");
  const lx = R(g.X(x + 17)), ly = R(g.Y(-104));
  for (let r = 5; r >= 1; r--) fade(c, 0.1).disc(lx, ly, R(r * 7 * g.z), "#F4CA50");
  // light cone to the ground
  const cone = fade(c, 0.16); cone.poly([[g.X(x + 13), g.Y(-105)], [g.X(x + 21), g.Y(-105)], [g.X(x + 50), g.Y(0)], [g.X(x - 16), g.Y(0)]], "#B88A4E");
  wrect(c, g, x + 13, -106, x + 21, -104, "#FAE375");
}
function tree(c, g, x, s, t, id) {
  wrect(c, g, x - 3 * s, -40 * s, x + 3 * s, 0, "#2A1A20"); wrect(c, g, x - 3 * s, -40 * s, x - 1.5 * s, 0, "#3A2430");
  const sway = Math.sin(t * 0.8 + id) * 1.2;
  for (const [ox, oy, r, col] of [[0, -58, 26, "#1C2E2A"], [-14, -48, 18, "#1C2E2A"], [14, -46, 18, "#1C2E2A"], [-4, -62, 20, "#24403A"], [8, -56, 14, "#2E5048"], [-10, -66, 10, "#3A6458"]])
    c.disc(R(g.X(x + (ox + sway * (oy / -60)) * s)), R(g.Y(oy * s)), Math.max(1, R(r * s * g.z)), col);
}
function car(c, g, x, col) {
  const pts = [[x, -6], [x + 4, -16], [x + 18, -18], [x + 26, -28], [x + 52, -28], [x + 62, -18], [x + 78, -16], [x + 80, -6]];
  c.poly(pts.map(([a, b]) => [g.X(a), g.Y(b)]), col); wrect(c, g, x + 28, -26, x + 39, -19, "#2A3A5A"); wrect(c, g, x + 41, -26, x + 52, -19, "#2A3A5A");
  for (const wx of [x + 16, x + 64]) { c.disc(R(g.X(wx)), R(g.Y(-6)), Math.max(1, R(7 * g.z)), "#0A0810"); c.disc(R(g.X(wx)), R(g.Y(-6)), Math.max(1, R(3 * g.z)), "#5A4A7A"); }
  wrect(c, g, x + 76, -15, x + 80, -12, "#F4CA50"); wrect(c, g, x, -15, x + 3, -12, "#E03056");
}
export function drawProps(c, cam, t) {
  const g = G(cam);
  for (const x of [250, 470, 1110]) lamp(c, g, x, t);
  tree(c, g, 330, 1.1, t, 1); tree(c, g, 590, 0.9, t, 2); tree(c, g, 1190, 1.0, t, 3); tree(c, g, -260, 1.2, t, 4); tree(c, g, 1640, 1.1, t, 5);
  car(c, g, 380, "#4A2A5A"); car(c, g, 1040, "#2A4A5A");
  // a bench and a bush near the server, a sign post "FAR" is not used: distance is told by the camera move
  wrect(c, g, 640, -12, 676, -9, "#5A3E34"); wrect(c, g, 642, -9, 645, 0, "#3A2A20"); wrect(c, g, 671, -9, 674, 0, "#3A2A20");
}

// ---------------------------------------------------------------- cable routes and packets
// routes in world units; packets are drawn by the caller with packetAt(route, u)
export function routeYou(pc) { return [[pc[0], pc[1]], [pc[0], ROOM_YOU.y1 - 6], [165, ROOM_YOU.y1 - 11], [165, CABLE_Y], [853, CABLE_Y], [853, SCREEN.y + SCREEN.h + 4]]; }
export function routeEnemy(pc) { return [[pc[0], pc[1]], [pc[0], ROOM_ENEMY.y1 - 6], [B3.x0 - 5, ROOM_ENEMY.y1 - 11], [B3.x0 - 5, CABLE_Y], [853, CABLE_Y], [853, SCREEN.y + SCREEN.h + 4]]; }
export function routeLen(r) { let L = 0; for (let i = 1; i < r.length; i++) L += Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); return L; }
export function routeAt(r, u) { // u 0..1 along the polyline
  const L = routeLen(r) * clamp01(u); let acc = 0;
  for (let i = 1; i < r.length; i++) { const d = Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]); if (acc + d >= L) { const k = (L - acc) / (d || 1); return [r[i - 1][0] + (r[i][0] - r[i - 1][0]) * k, r[i - 1][1] + (r[i][1] - r[i - 1][1]) * k]; } acc += d; }
  return r[r.length - 1];
}
export const ICON = {
  cross: [".......", "...#...", "...#...", ".##.##.", "...#...", "...#...", "......."],
  skull: [".#####.", "#######", "#..#..#", "#######", ".##.##.", ".#.#.#.", "......."],
  arrow: [".......", "...#...", "....#..", "######.", "....#..", "...#...", "......."],
};
/** a glowing packet at world point p; size in screen px; trail = previous world points */
export function drawPacket(c, cam, p, col, { size = 6, icon = null, alpha = 1, trail = [] } = {}) {
  const g = G(cam), x = g.X(p[0]), y = g.Y(p[1]), f = fade(c, alpha);
  trail.forEach((q, i) => { const a = alpha * (1 - i / trail.length) * 0.6, s = Math.max(1, R(size * 0.6 * (1 - i / trail.length))); fade(c, a).rect(R(g.X(q[0]) - s / 2), R(g.Y(q[1]) - s / 2), s, s, col); });
  for (let r = 3; r >= 1; r--) fade(c, alpha * 0.18).disc(R(x), R(y), R(size * 0.5 + r * 3), col);
  const s = R(size); f.rect(R(x - s / 2) - 1, R(y - s / 2) - 1, s + 2, s + 2, P.ink); f.rect(R(x - s / 2), R(y - s / 2), s, s, col); f.rect(R(x - s / 2), R(y - s / 2), s, 1, P.iv);
  if (icon) { const rows = ICON[icon], k = Math.max(1, R(size / 5)); const ox = R(x - (rows[0].length * k) / 2), oy = R(y - s / 2 - 4 - rows.length * k);
    f.rect(ox - 2, oy - 2, rows[0].length * k + 4, rows.length * k + 4, P.ink); rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") f.rect(ox + i * k, oy + j * k, k, k, col); })); }
}
