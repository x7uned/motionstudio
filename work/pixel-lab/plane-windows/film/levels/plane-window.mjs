// Builder PLANE · the window row: grey seal ring, cream cabin bezel, the warm cabin behind (far side wall with its own
// little windows, overhead bins, a seat with a headrest cover), glass tint and sky reflections, and two cute passengers
// in the neighbouring windows (a sleeping man with an eye mask and a neck pillow, a kid flying a toy plane).
// The hero window (k = 0) has the corner radius cornerR(t) and its glass is drawn in front (after the hero).
import { R, clamp01, sm, rnd, bayer, mix, hex, band, put, blend, clipped, sdRR, nRR, HW, HH, RING, BEZ, WIN, radiusOf, winScreen, CY, CYD, pressure, glassA, EV } from "./plane-kit.mjs";
import { arrow } from "./plane-body.mjs";
import { blob, eyes, blush, smile, blinkAt, ell, tube, RAMP, TINY } from "../cute.mjs";
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";

const GW = 540, GH = 960;

// ---------------------------------------------------------------- the cabin seen through a window, baked once (local u, v)
const FW = 220, FH = 150, FU0 = -110, FV0 = -75;              // far layer (parallax)
const FAR = new Uint8ClampedArray(FW * FH * 3);
const NEAR = new Uint8ClampedArray(108 * 150 * 3), NM = new Uint8Array(108 * 150), NU0 = -54, NV0 = -75;   // the window seat
{
  const set = (buf, w, x, y, col) => buf.set(hex(col), (y * w + x) * 3);
  const BIN = ["#7A7296", "#9C94B2", "#B9B2CC", "#D2CCDE", "#E4DFEC"], WALL = ["#B8A284", "#C9B597", "#D8C6AA", "#E5D6BE", "#F0E6D4"];
  const SEAT = ["#1E1438", "#2E2050", "#43306E", "#5A4290", "#7458AE", "#9276C8"];
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const u = x + FU0, v = y + FV0; let col;
    if (v < -50) {                                              // far-side overhead bins
      const door = ((u + 1000) % 52) < 1, latch = Math.abs(((u + 1000) % 52) - 26) < 4 && v >= -56 && v < -54;
      col = v >= -53 ? BIN[1] : door ? BIN[2] : latch ? BIN[0] : band(BIN, 3.6 - (v + 75) * 0.035, x, y);
      if (v < -70) col = "#F4F0F6";
    } else if (v < -47) col = v === -50 ? "#FFF4C8" : "#FFE3A0";  // warm light strip under the bins
    else {
      const glow = clamp01(1 - (v + 47) / 16) * 0.8;
      col = band(WALL, 3.3 - (v + 47) * 0.022 + glow, x, y, 0.4);
      // the little windows across the aisle (bright sky), shades half down on some
      const wu = ((u + 1000) % 38) - 19, idx = Math.floor((u + 1000) / 38), shade = 3 + R(rnd(idx * 7) * 7);
      if (Math.abs(wu) <= 6 && v >= -34 && v <= -14) {
        const e = Math.abs(wu) === 6 || v === -34 || v === -14;
        col = e ? "#B09A7C" : v < -34 + shade ? "#EDE4D2" : v === -34 + shade ? "#C9BCA2" : wu + (v + 34) * 0.4 < -1 && wu + (v + 34) * 0.4 > -4 ? "#FFFFFF" : v > -20 ? "#CFE8FA" : "#9ACCF2";
      }
      // far seat row across the aisle: purple backs, white headrest covers, a few heads peeking over
      const su = ((u + 1000) % 34) - 17, sid = Math.floor((u + 1000) / 34);
      if (v >= 14 && Math.abs(su) <= 12 && !(v < 17 && Math.abs(su) > 10)) col = v < 24 ? (Math.abs(su) <= 8 ? "#F2EEF8" : SEAT[3]) : band(SEAT, 3.4 - (v - 24) * 0.03 + (su > 6 ? -0.8 : 0), x, y);
      if (rnd(sid * 13 + 5) < 0.45) { const hu = su + 2, hv = v - 8, hr = 9; if (hu * hu + hv * hv * 1.2 < hr * hr && v < 15) col = [ "#2A1A12", "#5A3A22", "#1A1416", "#8A6A40" ][Math.floor(rnd(sid * 3) * 4)]; }
    }
    set(FAR, FW, x, y, col);
  }
  // the window seat right behind the passenger: purple back, white headrest cover
  for (let y = 0; y < 150; y++) for (let x = 0; x < 108; x++) {
    const u = x + NU0, v = y + NV0; let col = null;
    const bk = sdRR(u, v - 34, 40, 68, 16), hd = sdRR(u, v + 16, 29, 13, 5) + Math.max(0, v + 3) * 0.0;
    if (bk < 0) col = bk > -1.2 ? SEAT[0] : band(SEAT, 3.6 - (v + 30) * 0.012 - (u > 30 ? 1.1 : u < -31 ? 0.7 : 0) + (bk > -4 && v < -20 ? 0.8 : 0), x, y);
    if (bk < 0 && hd < 0) col = hd > -1.2 ? "#9890B4" : v > -6 ? "#B8A8DC" : band(["#C2BAD6", "#DCD6EA", "#EEEBF6", "#FBFAFE"], 2.6 - (v + 26) * 0.05 + (u < -18 ? -0.6 : 0), x, y);   // the headrest cover (with a lavender trim)
    if (col) { set(NEAR, 108, x, y, col); NM[y * 108 + x] = 1; }
  }
}

// ---------------------------------------------------------------- ring / bezel / interior pass
const RG = ["#2E2A3E", "#45405A", "#5E5976", "#7A7592", "#9A96B0", "#C2BFD2"], BZ = ["#8E8272", "#B0A590", "#CBC1AD", "#E2DAC8", "#F2ECDE"];
const RING_OUT = hex("#3A3650"), GAP = hex("#4A4258");

/** Draw window k's ring, bezel and cabin (and passengers); glass too unless k === 0 (the hero window gets it in front). */
export function drawWindowBack(c, V, t, k) {
  const [sx, sy] = winScreen(V, t, k), r = radiusOf(k, t), d = c.d, pu = R((sx - 270) * 0.1);
  const x0 = Math.max(0, sx - HW - RING - 4), x1 = Math.min(GW - 1, sx + HW + RING + 4), y0 = Math.max(0, sy - HH - RING - 4), y1 = Math.min(GH - 1, sy + HH + RING + 4);
  if (x0 > x1) return;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = x - sx + 0.5, v = y - sy + 0.5, dd = sdRR(u, v, HW, HH, r);
    if (dd >= RING + 3) continue;
    const i = (y * GW + x) * 3;
    if (dd >= RING + 1) { const n = nRR(u, v, HW, HH, r); if (n[1] > 0.2) blend(c, x, y, "#3A3456", 0.22 * n[1], 2); continue; }   // the ring's soft shadow on the skin below
    if (dd >= RING) { d[i] = RING_OUT[0]; d[i + 1] = RING_OUT[1]; d[i + 2] = RING_OUT[2]; continue; }
    if (dd >= 0) {                                              // rubber seal bead, lit from above
      const n = nRR(u, v, HW, HH, r), w = dd / RING, hl = Math.exp(-(((w - 0.4) / 0.2) ** 2)) * clamp01(-n[1] * 1.4 + 0.2);
      const vv = dd < 1 ? 0.6 : 2.2 - 1.3 * n[1] + 0.4 * n[0] + 1.6 * hl - (w > 0.85 ? 0.6 : 0);
      c.d.set(hex(band(RG, vv, x, y)), i); continue;
    }
    if (dd >= -BEZ) {                                           // cabin-side bezel (cream plastic), its top in shadow
      const n = nRR(u, v, HW, HH, r);
      if (dd >= -1) { d[i] = GAP[0]; d[i + 1] = GAP[1]; d[i + 2] = GAP[2]; continue; }
      const vv = dd < -BEZ + 1 ? 0.3 : 2.4 + 1.3 * n[1] - 0.4 * n[0] + (dd > -3 ? -0.5 : 0);
      c.d.set(hex(band(BZ, vv, x, y)), i); continue;
    }
    // the cabin: near seat over the far wall (parallax)
    const nx = Math.floor(u) - NU0, ny = Math.floor(v) - NV0;
    if (nx >= 0 && ny >= 0 && nx < 108 && ny < 150 && NM[ny * 108 + nx]) { const s = (ny * 108 + nx) * 3; d[i] = NEAR[s]; d[i + 1] = NEAR[s + 1]; d[i + 2] = NEAR[s + 2]; continue; }
    const fx = Math.max(0, Math.min(FW - 1, Math.floor(u) - FU0 + pu)), fy = Math.max(0, Math.min(FH - 1, Math.floor(v) - FV0)), s = (fy * FW + fx) * 3;
    d[i] = FAR[s]; d[i + 1] = FAR[s + 1]; d[i + 2] = FAR[s + 2];
  }
  const inside = (X, Y) => sdRR(X - sx + 0.5, Y - sy + 0.5, HW, HH, r) < -BEZ;
  if (k === -1) sleeper(clipped(c, inside), sx, sy, t);
  if (k === 1) kid(clipped(c, inside), sx, sy, t);
  if (k === -1) blind(c, sx, sy, r, 0.3);
  if (k !== 0) glass(c, V, t, k, 1);
}

/** Pulled-down window shade (cabin side), covering the top `f` of the opening. */
function blind(c, sx, sy, r, f) {
  const yb = R(sy - HH + 2 * HH * f);
  for (let y = sy - HH; y <= yb; y++) for (let x = sx - HW; x <= sx + HW; x++) {
    const dd = sdRR(x - sx + 0.5, y - sy + 0.5, HW, HH, r); if (dd >= -1.5) continue;
    const j = yb - y, col = j < 2 ? "#9A8E7A" : j < 4 ? "#C8BCA6" : (y - sy) % 6 === 0 ? "#D9CEBA" : dd > -BEZ - 1 ? "#D0C6B2" : "#EEE6D6";
    put(c, x, y, hex(col));
  }
  for (let x = sx - 7; x <= sx + 7; x++) { put(c, x, yb + 1, hex("#6E6456")); put(c, x, yb + 2, hex("#8C8070")); }
}

// ---------------------------------------------------------------- glass: a cool tint and sky reflections
const G_TINT = "#CFE6FF";
export function glass(c, V, t, k, a = 1) {
  if (a <= 0) return;
  const [sx, sy] = winScreen(V, t, k), r = radiusOf(k, t), hero = k === 0;
  for (let y = sy - HH; y <= sy + HH; y++) for (let x = sx - HW; x <= sx + HW; x++) {
    if (x < 0 || x >= GW || y < 0 || y >= GH) continue;
    const u = x - sx + 0.5, v = y - sy + 0.5, dd = sdRR(u, v, HW, HH, r); if (dd >= 0) continue;
    if (a < 1 && a <= bayer(x + 1, y + 2)) continue;
    blend(c, x, y, G_TINT, hero ? 0.1 : 0.16, 2);
    const w = u + 0.75 * v, top = clamp01(1 - (v + HH) / (HH * 1.1));
    if (w > -96 && w < -84) blend(c, x, y, "#FFFFFF", (hero ? 0.42 : 0.55) * (0.4 + top), 2);
    else if (w > -78 && w < -75) blend(c, x, y, "#FFFFFF", (hero ? 0.32 : 0.45) * (0.4 + top), 2);
    if (w > 86 && w < 92 && v > 10) blend(c, x, y, "#FFFFFF", 0.32, 2);
    if (v > HH - 14) blend(c, x, y, "#F4F8FF", 0.14 * (v - HH + 14) / 14, 2);   // the cloud sea's glow on the lower glass
  }
  // a crisp glint in the upper-left corner of the glass
  const gx = sx - HW + R(r * 0.35) + 4, gy = sy - HH + R(r * 0.35) + 4, g = (X, Y, col) => { if (a >= 1 || a > bayer(X, Y)) put(c, X, Y, hex(col)); };
  g(gx, gy, "#FFFFFF"); g(gx + 1, gy, "#FFFFFF"); g(gx, gy + 1, "#FFFFFF"); g(gx + 2, gy, "#E8F4FF"); g(gx, gy + 2, "#E8F4FF");
}

/** The empty channel where the panes sat (hero window, while the exploded panes are out). */
export function groove(c, V, t, a) {
  if (a <= 0) return;
  const [sx, sy] = winScreen(V, t, 0), r = radiusOf(0, t);
  for (let y = sy - HH - 1; y <= sy + HH + 1; y++) for (let x = sx - HW - 1; x <= sx + HW + 1; x++) {
    const dd = sdRR(x - sx + 0.5, y - sy + 0.5, HW, HH, r); if (dd >= 0.5 || dd < -2.5) continue;
    if (a < 1 && a <= bayer(x, y)) continue;
    put(c, x, y, hex(dd > -1 ? "#1A1626" : "#5E5874"));
  }
}

/** Faint cyan arrows in the window pushing outward toward its corners while the cabin is under pressure. */
export function windowArrows(c, V, t, k, a = 1) {
  const p = pressure(t) * a; if (p < 0.03) return;
  const [sx, sy] = winScreen(V, t, k), r = radiusOf(k, t);
  for (const [ex, ey] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const dx = ex * 0.62, dy = ey * 0.78, ox = sx + ex * (HW - 30 + r * 0.14), oy = sy + ey * (HH - 33 + r * 0.14), len = R(8 + 8 * p);
    arrow(c, R(ox), R(oy), dx, dy, len, Math.min(1, p * 1.2) * 0.85);
  }
}

// ---------------------------------------------------------------- passengers
const SKN = RAMP.skin, TEAL = ["#0A2026", "#123A44", "#1C5662", "#287684", "#3A96A2", "#5CB4BC", "#8CD0D2", "#C4ECEC"];
const HAIR = ["#100A08", "#20140E", "#322016", "#463020", "#5A402A", "#705236", "#8A6A48", "#A8865E"];
const KIDH = ["#2A0E04", "#4E1E08", "#7A3410", "#A44E18", "#C86A24", "#E08A34", "#F0AC54", "#F8CC80"];
const YEL = ["#3A2A08", "#6A4A10", "#A07418", "#C99A2A", "#F4CA50", "#FAE375", "#FDF0A8", "#FFF8D8"];

/** A man asleep against the window: eye mask with drawn-on closed eyes, neck pillow, hoodie; slow breathing, z's.
 *  The body is baked once (it only rises and falls by a pixel as he breathes); the mouth and the z's move per frame. */
const SL = { W: 128, H: 124, ox: 64, oy: 42 }, SL_A = -0.28, SL_C0 = [-8, 4];
const slQ = (sx, sy, br) => (u, v) => { const cs = Math.cos(SL_A), sn = Math.sin(SL_A), du = u - SL_C0[0], dv = v - SL_C0[1]; return [sx + SL_C0[0] + du * cs - dv * sn, sy + br + SL_C0[1] + du * sn + dv * cs]; };
const SLEEPER = (() => {
  const c = new Canvas(SL.W, SL.H, "#FF00FF"), sx = SL.ox, sy = SL.oy, P = (u, v) => [sx + u, sy + v], Q = slQ(sx, sy, 0), g = c;
  blob(g, [[P(-52, 80), P(-50, 46), P(-36, 33), P(20, 31), P(38, 40), P(48, 80)]], { ramp: TEAL, base: 3.4, thick: 14, outline: TEAL[0] });
  blob(g, [ell(...P(-14, 32), 30, 9)], { ramp: TEAL, base: 2.6, thick: 5, outline: TEAL[0] });
  for (const du of [-8, 4]) for (let v = 40; v < 56; v++) g.px(R(sx + du + (v - 40) * 0.1), R(sy + v), v % 7 === 6 ? "#DDE8E8" : "#F4FAFA");
  blob(g, [ell(...Q(-6, 2), 19, 22, SL_A)], { ramp: SKN, base: 4.5, gain: 1.3, thick: 10, outline: SKN[0] });
  blob(g, [ell(...Q(12, 4), 4.5, 6.5, SL_A)], { ramp: SKN, base: 3.8, thick: 3, outline: SKN[0] });               // ear
  blob(g, [[Q(-26, -2), Q(-27, -14), Q(-20, -23), Q(-8, -27), Q(4, -26), Q(13, -19), Q(14, -9), Q(9, -12), Q(6, -17), Q(-2, -15), Q(-12, -16), Q(-20, -10), Q(-22, 0)]], { ramp: HAIR, base: 3.6, thick: 6, outline: HAIR[0] });
  for (const [u, v] of [[-14, -27], [-6, -29], [2, -28]]) { const [x, y] = Q(u, v); g.px(R(x), R(y), HAIR[1]); g.px(R(x) + 1, R(y) + 1, HAIR[2]); }
  blob(g, [[Q(-26, -10), Q(12, -10), Q(13, -1), Q(-25, -1)]], { ramp: RAMP.jelly, base: 4.2, thick: 4, outline: RAMP.jelly[0] });   // eye mask
  for (const cu of [-15, 1]) for (let du = -4; du <= 4; du++) { const [x, y] = Q(cu + du, -6 + Math.round((du * du) / 6)); g.px(R(x), R(y), "#3A1C70"); }
  for (const cu of [-15, 1]) for (const du of [-4, 0, 4]) { const [x, y] = Q(cu + du, -3 + (du ? 0 : 1)); g.px(R(x), R(y), "#3A1C70"); }
  { const [x, y] = Q(-5, 3); g.px(R(x), R(y), SKN[3]); g.px(R(x) + 1, R(y) + 1, SKN[3]); }
  { const [bx, by] = Q(6, 6); blush(g, bx, by, 4, 2.2); }
  blob(g, [tube([P(-36, 16), P(-30, 28), P(-12, 33), P(8, 31), P(22, 22), P(24, 12)], 7, 6)], { ramp: YEL, base: 3.8, thick: 6, outline: YEL[0] });   // neck pillow
  const m = new Uint8Array(SL.W * SL.H); for (let i = 0; i < m.length; i++) m[i] = c.d[i * 3] === 255 && c.d[i * 3 + 1] === 0 && c.d[i * 3 + 2] === 255 ? 0 : 1;
  return { d: c.d, m };
})();
function sleeper(g, sx, sy, t) {
  const br = R(Math.sin(t * 1.7) * 0.9), d = SLEEPER.d, m = SLEEPER.m;
  for (let j = 0; j < SL.H; j++) for (let i = 0; i < SL.W; i++) { const k = j * SL.W + i; if (m[k]) g.px(sx - SL.ox + i, sy - SL.oy + j + br, [d[k * 3], d[k * 3 + 1], d[k * 3 + 2]]); }
  const Q = slQ(sx, sy, br);
  { const [mx, my] = Q(-4, 11), op = 1.5 + Math.sin(t * 1.7) * 0.8; for (let dy = 0; dy <= R(op) + 1; dy++) for (let dx = -1; dx <= 1; dx++) g.px(R(mx) + dx, R(my) + dy, dy === 0 || dy === R(op) + 1 || Math.abs(dx) === 1 ? "#4A1620" : "#8A3040"); }
  // z z z drifting up and out
  for (let n = 0; n < 3; n++) {
    const ph = ((t * 0.42 + n / 3) % 1 + 1) % 1, a = Math.sin(Math.PI * ph) * 0.95; if (a < 0.05) continue;
    const zx = R(sx + 14 + ph * 20 + Math.sin(ph * 6 + n) * 2), zy = R(sy - 22 - ph * 30);
    const fg = Object.create(g); fg.px = (x, y, col) => { if (a > bayer(x, y)) g.px(x, y, col); };
    fg.text(TINY, "Z", zx + 1, zy + 1, "#3B2C5C", { scale: 2 }); fg.text(TINY, "Z", zx, zy, "#F2EAFF", { scale: 2 });
  }
}

/** A kid looking out, flying a little toy plane in the window. */
function kid(g, sx, sy, t) {
  const fx = Math.sin(t * 1.25) * 9, fy = Math.sin(t * 2.1 + 0.6) * 6, toy = [sx + 20 + fx, sy - 8 + fy], tilt = Math.cos(t * 2.1 + 0.6) * 0.18;
  const hc = [sx - 10, sy + 24], sh = [sx + 6, sy + 46], hand = [toy[0] - 1, toy[1] + 6];
  // elbow: bent outward between the shoulder and the hand
  const mx = (sh[0] + hand[0]) / 2, my = (sh[1] + hand[1]) / 2, dx = hand[0] - sh[0], dy = hand[1] - sh[1], L = Math.hypot(dx, dy), bend = Math.sqrt(Math.max(0, 30 * 30 - (L * L) / 4)) * 0.85, el = [mx - (dy / L) * bend, my + (dx / L) * bend];
  blob(g, [[[sx - 40, sy + 80], [sx - 36, sy + 52], [sx - 24, sy + 42], [sx + 2, sy + 42], [sx + 14, sy + 52], [sx + 20, sy + 80]]], { ramp: YEL, base: 3.6, thick: 12, outline: YEL[0] });
  { const [x, y] = [sx - 12, sy + 60]; for (const [u, v] of [[0, -4], [-1, -2], [1, -2], [-3, -1], [3, -1], [-1, 0], [1, 0], [-2, 1], [2, 1]]) g.px(x + u, y + v, "#FFF8D8"); }   // a little star on the tee
  blob(g, [tube([sh, el], 5, 4.5)], { ramp: YEL, base: 3.8, thick: 4, outline: YEL[0] });
  blob(g, [tube([el, hand], 3.6, 3.2)], { ramp: SKN, base: 4.4, thick: 3, outline: SKN[0] });
  blob(g, [ell(hc[0], hc[1], 19, 18)], { ramp: SKN, base: 4.6, gain: 1.2, thick: 9, outline: SKN[0] });
  blob(g, [ell(hc[0] - 18, hc[1] + 3, 3.5, 5)], { ramp: SKN, base: 4, thick: 3, outline: SKN[0] });
  blob(g, [[[hc[0] - 20, hc[1] - 1], [hc[0] - 19, hc[1] - 13], [hc[0] - 9, hc[1] - 20], [hc[0] + 3, hc[1] - 21], [hc[0] + 8, hc[1] - 28], [hc[0] + 11, hc[1] - 20], [hc[0] + 18, hc[1] - 11], [hc[0] + 19, hc[1] - 4], [hc[0] + 10, hc[1] - 11], [hc[0] + 2, hc[1] - 8], [hc[0] - 6, hc[1] - 11], [hc[0] - 14, hc[1] - 6]]], { ramp: KIDH, base: 4, thick: 5, outline: KIDH[0] });
  const look = [clamp01((toy[0] - hc[0]) / 40) * 0.8, -0.5];
  eyes(g, hc[0] + 1, hc[1] + 2, 15, 4.2, { ry: 5, iris: ["#1A0E06", "#3A1E0C", "#6A3A18", "#94602A", "#B88440"], look, blink: blinkAt(t, 3.3, 0.7), lid: SKN[4] });
  blush(g, hc[0] - 10, hc[1] + 9, 3.5, 2); blush(g, hc[0] + 12, hc[1] + 9, 3.5, 2);
  smile(g, hc[0] + 1, hc[1] + 10, 3, { open: 0.5 + 0.3 * Math.sin(t * 2.1) });
  // the toy plane (white, purple tail, a window strip) held in the small hand
  const T = (u, v) => [toy[0] + u * Math.cos(tilt) - v * Math.sin(tilt), toy[1] + u * Math.sin(tilt) + v * Math.cos(tilt)];
  blob(g, [[T(-14, 0), T(-12, -3), T(8, -4), T(14, -1), T(14, 1), T(8, 3), T(-12, 3)]], { ramp: RAMP.white, base: 5.2, thick: 3, outline: "#2A2A3A" });
  blob(g, [[T(-13, -2), T(-16, -10), T(-11, -10), T(-7, -3)]], { ramp: RAMP.jelly, base: 4.4, thick: 2, outline: RAMP.jelly[0] });
  blob(g, [[T(-3, 0), T(-8, 8), T(-4, 8), T(4, 1)]], { ramp: RAMP.white, base: 4.4, thick: 2, outline: "#2A2A3A" });
  for (let u = -6; u <= 8; u += 3) { const [x, y] = T(u, -1); g.px(R(x), R(y), "#5A8ADA"); }
  blob(g, [ell(hand[0], hand[1], 4, 3.5)], { ramp: SKN, base: 4.6, thick: 3, outline: SKN[0] });
}
