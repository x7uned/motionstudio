// LV8 · the channel's own character (the user's pixel avatar, data/branding/xtuned-outro/v1/spritesheet.png) on the
// city rooftop. The sprite is NEVER redrawn: only a dark 1-px outline, a warm dawn rim light from the sunrise on his
// right, a slight cool backlit tint, crossfades between frames (ordered dither over XF), and transforms (spin, the
// tip-over rotation, the bounce). He holds a small pixel radar speed gun (a separate prop drawn at his hand).
import sharp from "sharp";
import { bayer, mix, hex, MAIN, TINY } from "../../../../../renderer/pixel/raster.mjs";
import { fade } from "../cute.mjs";
import { R, clamp01, sm, ease, easeIn, easeOut, lerp, prog, camAt } from "./city-kit.mjs";
import { POSES, XF, GUN, HIT, EV, END } from "./city-time.mjs";
import { REST } from "../timeline.mjs";

const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const { data: SD, info: SI } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const CW = 192, CH = 208, PAD = 2, FW = CW + 2 * PAD, FH = CH + 2 * PAD;
const AX = 96 + PAD, AY = 201 + PAD;                       // anchor in the padded frame: between the feet, on the ground
const OUTLINE = hex("#1A1222"), RIM = hex("#FFD2A0"), RIM2 = hex("#FFB890"), COOL = hex("#5A4A7A");

// ---------------------------------------------------------------- frames: outline + dawn lighting (cached per row/frame)
const FRAMES = new Map();
function frameOf(row, f) {
  const key = row * 16 + f; let F = FRAMES.get(key); if (F) return F;
  const rgb = new Uint8ClampedArray(FW * FH * 3), m = new Uint8Array(FW * FH);
  const op = (x, y) => x >= 0 && y >= 0 && x < FW && y < FH && m[y * FW + x] === 1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const s = ((row * CH + y) * SI.width + f * CW + x) * 4; if (SD[s + 3] < 128) continue;
    const i = (y + PAD) * FW + x + PAD; m[i] = 1; rgb[i * 3] = SD[s]; rgb[i * 3 + 1] = SD[s + 1]; rgb[i * 3 + 2] = SD[s + 2];
  }
  // lighting: a faint cool backlit tint everywhere, a warm rim on the edges that face the sunrise (right / top-right)
  const out = new Uint8ClampedArray(rgb);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x; if (m[i] !== 1) continue;
    let k = 0, col = RIM;
    if (!op(x + 1, y)) k = 0.55; else if (!op(x + 2, y) || !op(x + 1, y - 1)) k = 0.28;
    if (!op(x, y - 1) && x > AX - 30) { k = Math.max(k, 0.42); col = RIM2; }
    const q = i * 3; let r = rgb[q] + (COOL[0] - rgb[q]) * 0.1, g = rgb[q + 1] + (COOL[1] - rgb[q + 1]) * 0.1, b = rgb[q + 2] + (COOL[2] - rgb[q + 2]) * 0.1;
    if (k) { r += (col[0] - r) * k; g += (col[1] - g) * k; b += (col[2] - b) * k; }
    out[q] = r; out[q + 1] = g; out[q + 2] = b;
  }
  // dark 1-px outline around the silhouette
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) {
    const i = y * FW + x; if (m[i] === 1) continue;
    if (op(x - 1, y) || op(x + 1, y) || op(x, y - 1) || op(x, y + 1)) { m[i] = 2; out[i * 3] = OUTLINE[0]; out[i * 3 + 1] = OUTLINE[1]; out[i * 3 + 2] = OUTLINE[2]; }
  }
  F = { rgb: out, m }; FRAMES.set(key, F); return F;
}

// ---------------------------------------------------------------- pose timeline → (old frame, new frame, crossfade k)
function poseIndex(t) { let i = 0; while (i < POSES.length - 1 && POSES[i + 1][0] <= t) i++; return i; }
function shownAt(i, t) { const [t0, row, seq, spf] = POSES[i], n = Math.max(0, Math.floor((t - Math.max(t0, -1e6)) / spf)); return { row, f: seq[n % seq.length], n, ts: t0 + n * spf }; }
export function heroFrames(t) {
  const i = poseIndex(t), cur = shownAt(i, t);
  let prev, ts = cur.ts;
  if (cur.n > 0) { const [, row, seq] = POSES[i]; prev = { row, f: seq[(cur.n - 1) % seq.length] }; }
  else if (i > 0) prev = shownAt(i - 1, POSES[i][0] - 1e-6); else prev = cur;
  if (POSES[i][0] < -1e5 && cur.n === 0) prev = cur;
  const k = clamp01((t - ts) / XF);
  return { a: prev, b: cur, k: k >= 1 || (prev.row === cur.row && prev.f === cur.f) ? 1 : k };
}

// ---------------------------------------------------------------- placement and the knock-over transform
export const HERO_REST = { sx: 150, sy: 642 };              // feet (rest-screen of the city)
const OX = REST.city.cx - 270, OY = REST.city.cy - 480;
export const HWX = HERO_REST.sx + OX, HWY = HERO_REST.sy + OY;
const PIV = 30;                                             // tip-over pivot: the right edge of his feet (sprite px right of the anchor)
export function heroXform(t) {
  const spinK = ease(prog(t, HIT.spin)), fallK = easeIn(prog(t, HIT.fall)), bK = prog(t, HIT.bounce);
  let sx = t < HIT.spin[0] ? 1 : Math.cos(2 * Math.PI * spinK);
  if (Math.abs(sx) < 0.08) sx = sx < 0 ? -0.08 : 0.08;
  const rot = (Math.PI / 2) * fallK + (bK > 0 && bK < 1 ? -0.06 * Math.sin(Math.PI * bK) : 0);
  const lift = t < HIT.spin[0] ? 0 : t < HIT.spin[1] ? 5 * Math.sin(Math.PI * spinK) : bK > 0 && bK < 1 ? 7 * Math.sin(Math.PI * bK) * (1 - bK * 0.4) : 0;
  return { sx, rot, lift };
}

/** Draw him with the screen anchor (feet) at (hx, hy). grade: {mul, add} or null (night → dawn during the pan). */
export function drawHero(c, hx, hy, t, grade = null) {
  const { a: FA, b: FB, k } = heroFrames(t), A = frameOf(FA.row, FA.f), B = frameOf(FB.row, FB.f), X = heroXform(t);
  hx = R(hx); hy = R(hy);
  const cs = Math.cos(X.rot), sn = Math.sin(X.rot), px = hx + PIV, py = hy, sx = X.sx;
  // forward map of the corners → destination bbox
  const fwd = (u, v) => { const x0 = hx + sx * (u - AX), y0 = hy + (v - AY), dx = x0 - px, dy = y0 - py; return [px + dx * cs - dy * sn, py + dx * sn + dy * cs - X.lift]; };
  const cr = [fwd(0, 0), fwd(FW, 0), fwd(0, FH), fwd(FW, FH)];
  const bx0 = Math.max(0, Math.floor(Math.min(...cr.map((p) => p[0])))), bx1 = Math.min(c.w - 1, Math.ceil(Math.max(...cr.map((p) => p[0])))), by0 = Math.max(0, Math.floor(Math.min(...cr.map((p) => p[1])))), by1 = Math.min(c.h - 1, Math.ceil(Math.max(...cr.map((p) => p[1]))));
  const d = c.d, W = c.w, gr = grade;
  for (let Y = by0; Y <= by1; Y++) for (let Xx = bx0; Xx <= bx1; Xx++) {
    // inverse: undo lift, rotate back about the pivot, undo the spin scale
    const dx = Xx + 0.5 - px, dy = Y + 0.5 + X.lift - py, x0 = px + dx * cs + dy * sn, y0 = py - dx * sn + dy * cs;
    const u = Math.floor(AX + (x0 - hx) / sx), v = Math.floor(AY + (y0 - hy));
    if (u < 0 || v < 0 || u >= FW || v >= FH) continue;
    const i = v * FW + u, useB = k >= 1 || k > bayer(u, v), F = useB ? B : A;
    if (!F.m[i]) continue;
    const q = (Y * W + Xx) * 3, s = i * 3;
    if (gr) { d[q] = F.rgb[s] * gr.mul[0] + gr.add[0]; d[q + 1] = F.rgb[s + 1] * gr.mul[1] + gr.add[1]; d[q + 2] = F.rgb[s + 2] * gr.mul[2] + gr.add[2]; }
    else { d[q] = F.rgb[s]; d[q + 1] = F.rgb[s + 1]; d[q + 2] = F.rgb[s + 2]; }
  }
  return { fwd };
}

/** His current screen box { x, y, w, h } (camera included) — for the share/follow card. */
export function HERO_POSE(t) {
  const cam = camAt(t), hx = 270 + HWX - cam.cx, hy = 480 + HWY - cam.cy, X = heroXform(t);
  const cs = Math.cos(X.rot), sn = Math.sin(X.rot), px = hx + PIV, py = hy;
  const fwd = (u, v) => { const x0 = hx + X.sx * (u - AX), y0 = hy + (v - AY), dx = x0 - px, dy = y0 - py; return [px + dx * cs - dy * sn, py + dx * sn + dy * cs - X.lift]; };
  const cr = [fwd(42 + PAD, 6 + PAD), fwd(150 + PAD, 6 + PAD), fwd(42 + PAD, 202 + PAD), fwd(150 + PAD, 202 + PAD)];
  const x0 = Math.min(...cr.map((p) => p[0])), x1 = Math.max(...cr.map((p) => p[0])), y0 = Math.min(...cr.map((p) => p[1])), y1 = Math.max(...cr.map((p) => p[1]));
  return { x: R(x0), y: R(y0), w: R(x1 - x0), h: R(y1 - y0) };
}

// ---------------------------------------------------------------- the radar speed gun
// hand positions per sprite row (cell px) and the gun's aim angle there (rad, 0 = barrel to the right)
const HAND = { 4: [139, 52, -0.85], 7: [126, 95, -0.4], 9: [108, 106, -0.1], 0: [118, 120, 0.75], 2: [118, 120, 0.75], 3: [118, 120, 0.75], 5: [118, 120, 0.75] };
function handAt(t) {
  const { a, b, k } = heroFrames(t), ha = HAND[a.row] ?? HAND[0], hb = HAND[b.row] ?? HAND[0], e = ease(k);
  return [lerp(ha[0], hb[0], e), lerp(ha[1], hb[1], e), lerp(ha[2], hb[2], e)];
}
/** The gun's display text and brightness at t. */
function display(t) {
  if (t < GUN.count[0]) return { txt: "000", on: 0.35 };
  if (t < GUN.flash) { const k = prog(t, GUN.count); return { txt: String(Math.min(300, Math.round(easeOut(k) * 300))).padStart(3, "0"), on: 1 }; }
  const ph = ((t - GUN.flash) % 0.5) / 0.5; return { txt: "300+", on: 0.55 + 0.45 * Math.cos(2 * Math.PI * ph), flash: true };
}
/** Draw the radar gun with its grip at (x, y), barrel along ang; the little display stays upright. */
export function drawGun(c, x, y, ang, t, a = 1, big = 0) {
  if (a <= 0) return;
  const g = fade(c, a), cs = Math.cos(ang), sn = Math.sin(ang);
  const P = (u, v) => [x + u * cs - v * sn, y + u * sn + v * cs];
  const poly = (pts, col) => g.poly(pts.map(([u, v]) => P(u, v)), col);
  // grip, body, lens barrel (outline first, then fills)
  poly([[-5, -3], [1, -3], [3, 9], [-3, 9]], "#141018"); poly([[-4, -2], [0, -2], [2, 8], [-2, 8]], "#3A3448");
  poly([[-10, -12], [16, -12], [16, -1], [-10, -1]], "#141018"); poly([[-9, -11], [15, -11], [15, -2], [-9, -2]], "#E2463C"); poly([[-9, -11], [15, -11], [15, -9], [-9, -9]], "#FF8A70");
  poly([[15, -14], [23, -15], [23, 2], [15, 1]], "#141018"); poly([[16, -13], [22, -14], [22, 1], [16, 0]], "#4A4458"); poly([[21, -13], [22, -13], [22, 0], [21, 0]], "#9AE0FF");
  poly([[-9, -4], [15, -4], [15, -2], [-9, -2]], "#A8282A");
  // upright display above the body (counts up, then flashes "300+")
  const D = display(t), w = 29, h = 13, X0 = R(x + 8 - (1 - big) * 0), Y0 = R(y - 34);
  g.rect(X0 - 1, Y0 - 1, w + 2, h + 2, "#141018"); g.rect(X0, Y0, w, h, "#1E2A22"); g.rect(X0, Y0, w, 1, "#3A4A3E");
  const tw = c.measure(MAIN, D.txt), col = mix("#2A4A30", D.flash ? "#FFE860" : "#9AFF7A", D.on);
  g.text(MAIN, D.txt, X0 + R((w - tw) / 2), Y0 + 3, col);
  if (D.flash && D.on > 0.8) { const q = fade(c, a * (D.on - 0.8) * 5); for (const [dx, dy, l] of [[-3, -3, 3], [w + 2, -3, 3], [-3, h + 2, 3], [w + 2, h + 2, 3]]) for (let j = 0; j < l; j++) q.px(X0 + dx + (dx < 0 ? -j : j), Y0 + dy + (dy < 0 ? -j : j), "#FFF4A0"); }
}

/** The gun while he holds it (grip at his hand, following the pose) — or flying off after the gust, then lying on the roof. */
export function gunState(t, hx, hy) {
  if (t < GUN.show[0]) return null;
  const a = sm(t, GUN.show[0], GUN.show[1]);
  if (t < HIT.gunFly[0]) {
    const [u, v, ang] = handAt(t), k = ease(prog(t, GUN.show));
    const hand = [hx + (u - 96), hy + (v - 201)], hip = [hx + 22, hy - 70];
    return { x: lerp(hip[0], hand[0], k), y: lerp(hip[1], hand[1], k), ang: lerp(0.9, ang, k), a };
  }
  // flies off in an arc to the right, spinning, lands on the roof with a little bounce
  const [u, v, ang0] = HAND[7], start = [hx + (u - 96), hy + (v - 201)], land = [hx + 252, hy + 2];
  const k = prog(t, HIT.gunFly);
  if (k < 1) {
    const e = easeOut(k), x = lerp(start[0], land[0], k), base = lerp(start[1], land[1], k * k), y = base - 70 * Math.sin(Math.PI * Math.min(1, k * 1.05));
    return { x, y, ang: ang0 + e * (4 * Math.PI - ang0), a: 1 };
  }
  const bk = clamp01((t - HIT.gunFly[1]) / 0.3);
  return { x: land[0] + 6 * bk, y: land[1] - 9 * Math.sin(Math.PI * bk) * (bk < 1 ? 1 : 0), ang: 0.0 + 0.08 * Math.sin(Math.PI * bk) * (bk < 1 ? 1 : 0), a: 1, landed: true };
}
export { EV, END, HIT };
