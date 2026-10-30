// «Aura stairs» — the aura: built from the climber's own silhouette. The climber is drawn into an actor Layer (colour +
// mask); a chamfer distance field around the mask gives flame bands whose reach grows with the aura level and licks
// upward (value noise scrolled by world time τ). Rim light on the silhouette, rising sparks, landing shock rings,
// small lightning at high levels, glowing eyes with a light trail when time stops. Pure functions of their arguments.
import { Canvas, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, lerp, rnd, GW, GH } from "./layout.mjs";
import { fbm, tone } from "./world.mjs";

const R = Math.round, PI = Math.PI;

/** An actor layer: draws like a Canvas, remembers which pixels were written. */
export class Layer extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); this.bb = [w, h, -1, -1]; }
  px(x, y, c) {
    if (!this.m) return super.px(x, y, c);
    x = Math.floor(x); y = Math.floor(y); if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    super.px(x, y, c); this.m[y * this.w + x] = 1;
    const b = this.bb; if (x < b[0]) b[0] = x; if (y < b[1]) b[1] = y; if (x > b[2]) b[2] = x; if (y > b[3]) b[3] = y;
  }
}

/**
 * Aura behind the actor + rim light, then the actor on top.
 * o = { col (hex), reach (screen px), heat 0..1 (core brightness), T (world time), up (how much more reach above), ground: y
 *       below which nothing is drawn (stairs line, screen), hipY }
 */
export function drawAura(c, A, o) {
  const [bx0, by0, bx1, by1] = A.bb; if (bx1 < 0) return;
  const M = Math.ceil(o.reach * (1 + o.up) + 8), x0 = Math.max(0, bx0 - M), y0 = Math.max(0, by0 - M), x1 = Math.min(GW - 1, bx1 + M), y1 = Math.min(GH - 1, by1 + 6);
  const W = x1 - x0 + 1, H = y1 - y0 + 1, d = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) d[y * W + x] = A.m[(y + y0) * A.w + x + x0] ? 0 : 1e9;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = y * W + x; let v = d[i]; if (!v) continue; if (x > 0) v = Math.min(v, d[i - 1] + 1); if (y > 0) { v = Math.min(v, d[i - W] + 1); if (x > 0) v = Math.min(v, d[i - W - 1] + 1.414); if (x < W - 1) v = Math.min(v, d[i - W + 1] + 1.414); } d[i] = v; }
  for (let y = H - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; let v = d[i]; if (!v) continue; if (x < W - 1) v = Math.min(v, d[i + 1] + 1); if (y < H - 1) { v = Math.min(v, d[i + W] + 1); if (x < W - 1) v = Math.min(v, d[i + W + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + W - 1] + 1.414); } d[i] = v; }
  const col = o.col, dark = tone(col, -0.45), mid = col, bright = tone(col, 0.35), core = tone(col, 0.8), T = o.T, top = by0, hip = o.hipY;
  if (o.reach > 0.5) for (let y = 0; y < H; y++) {
    const Y = y + y0; if (Y > o.ground) break;
    const upK = clamp01((hip - Y) / Math.max(1, hip - top + o.reach)), reachY = o.reach * (1 + o.up * upK) * (1 - 0.55 * clamp01((Y - hip) / 60));
    for (let x = 0; x < W; x++) {
      const i = y * W + x, dist = d[i]; if (dist === 0 || dist > reachY * 1.6 + 2) continue;
      const X = x + x0, n = fbm(X * 0.075, Y * 0.05 + T * 2.6), n2 = fbm(X * 0.16 + 9, Y * 0.11 + T * 4.1);
      const reach = reachY * (0.5 + 0.95 * n) * (0.85 + 0.3 * n2), v = 1 - dist / Math.max(1, reach);
      if (v <= 0) continue;
      let colr = null;
      if (v > 0.84 - 0.08 * o.heat) colr = core;
      else if (v > 0.6) colr = bright;
      else if (v > 0.3) colr = mid;
      else if (v * 2.6 > bayer(X, Y)) colr = v > 0.15 ? mid : dark;
      if (!colr) continue;
      const a = v > 0.3 ? 1 : 0.75;
      c.px(X, Y, a >= 1 ? colr : mix(c.get(X, Y), colr, a));
    }
  }
  // the actor, with a rim of aura light on its outline
  const rimA = clamp01(o.reach / 18);
  for (let y = Math.max(0, by0); y <= Math.min(GH - 1, by1); y++) for (let x = Math.max(0, bx0); x <= Math.min(GW - 1, bx1); x++) {
    const i = y * A.w + x; if (!A.m[i]) continue;
    const k = i * 3; let p = [A.d[k], A.d[k + 1], A.d[k + 2]];
    if (rimA > 0) {
      const edge1 = !A.m[i - 1] || !A.m[i + 1] || !A.m[i - A.w] || !A.m[i + A.w];
      const edge2 = !edge1 && (!A.m[i - 2] || !A.m[i + 2] || !A.m[i - 2 * A.w]);
      if (edge1) p = mix(p, bright, 0.85 * rimA); else if (edge2 && rimA * 0.6 > bayer(x, y)) p = mix(p, mid, 0.5);
      else if (o.heat > 0) p = mix(p, col, 0.12 * o.heat);
    }
    c.px(x, y, p);
  }
}

/** Sparks rising around the climber (screen anchors), frozen when τ stops. */
export function sparks(c, T, hip, top, reach, col, a) {
  if (a <= 0 || reach < 2) return;
  const g = fade(c, a), N = 70;
  for (let i = 0; i < N; i++) {
    const per = 0.9 + rnd(i * 5) * 0.6, ph = rnd(i * 5 + 1) * per, age = ((T + ph) % per) / per;
    const sx = hip[0] + (rnd(i * 5 + 2) - 0.5) * (70 + reach * 2.2) + 6 * Math.sin(T * 3 + i);
    const sy = lerp(hip[1] + 40, top - reach * 1.4, age) - rnd(i * 5 + 3) * 20;
    const s = rnd(i * 5 + 4) > 0.7 ? 2 : 1, cc = age < 0.5 ? tone(col, 0.6) : col;
    if (1 - age > bayer(R(sx), R(sy)) * 0.8) g.rect(R(sx), R(sy), s, s, cc);
  }
}

/** A landing shock ring on the tread: expanding flat ellipse, k = 0..1 age. */
export function shockRing(c, x, y, k, col) {
  if (k <= 0 || k >= 1) return;
  const a = 1 - k, rx = 8 + 70 * Math.pow(k, 0.6), ry = 2 + 12 * Math.pow(k, 0.6), g = fade(c, a);
  g.ering(R(x), R(y), R(rx), R(ry), tone(col, 0.5)); g.ering(R(x), R(y), R(rx) - 1, Math.max(1, R(ry) - 1), col);
  // a burst of dust specks
  for (let i = 0; i < 14; i++) { const ang = PI + (PI * i) / 13, r = rx * (0.6 + 0.4 * rnd(i)), px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * ry * 2.2 - k * 10; g.rect(R(px), R(py), 1, 1, tone(col, 0.7)); }
}

/** Small lightning around the body: each bolt lives 0.16 s of τ with a dithered rise and fall (never one frame). */
export function lightning(c, T, hip, top, reach, col, a) {
  if (a <= 0) return;
  const span = 0.16;
  for (let j = 0; j < 4; j++) {
    const slot = Math.floor(T / span + j * 0.37), age = (T / span + j * 0.37) - slot, s = slot * 4 + j;
    if (rnd(s * 3) > 0.55) continue;
    const env = Math.min(sm(age, 0, 0.3), 1 - sm(age, 0.55, 1)) * a; if (env <= 0) continue;
    const g = fade(c, env), side = rnd(s * 3 + 1) > 0.5 ? 1 : -1;
    let x = hip[0] + side * (16 + rnd(s * 3 + 2) * reach * 0.8), y = lerp(top, hip[1] + 20, rnd(s * 5 + 7));
    for (let k = 0; k < 7; k++) { const nx = x + side * (2 + rnd(s * 11 + k) * 5), ny = y - 4 - rnd(s * 13 + k) * 7; g.line(R(x), R(y), R(nx), R(ny), tone(col, 0.85)); g.line(R(x) + 1, R(y), R(nx) + 1, R(ny), col); x = nx; y = ny; }
  }
}

/** Glowing eye with a streak of light trailing behind (time stop). */
export function eyeGlow(c, eye, a, col, T) {
  if (a <= 0 || !eye) return;
  const g = fade(c, a), [x, y] = eye.map(R);
  for (let k = 0; k < 34; k++) { const tx = x - 2 - k, ty = y - R(k * 0.22 + Math.sin(k * 0.3 + T * 4) * 1.2), w = k < 14 ? 2 : 1; if ((1 - k / 34) > bayer(tx, ty) * 0.8) { g.rect(tx, ty - 1, 1, w + 1, tone(col, 0.2)); g.rect(tx, ty, 1, w, k < 16 ? "#FFFFFF" : tone(col, 0.6)); } }
  g.rect(x - 1, y - 1, 3, 3, tone(col, 0.6)); g.px(x, y, "#FFFFFF");
  g.px(x - 2, y, tone(col, 0.6)); g.px(x + 2, y, tone(col, 0.6)); g.px(x, y - 2, tone(col, 0.6)); g.px(x, y + 2, tone(col, 0.6));
}
