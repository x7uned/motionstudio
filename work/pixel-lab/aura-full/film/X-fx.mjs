// «Infinite aura» · builder X shared kit (2026-10-25): a tileable noise texture, fire/smoke/rock palettes, the pixel
// explosion (ramped flash, comic star burst, fireball cooling into dithered smoke, shock ring, debris with fire trails,
// sparks, cloud spray for sea impacts), the flaming meteor, and anchors that keep effects glued to the cloud sea, the
// floating islands and his plane. Everything is a pure function of its arguments (ages are world time τ = X.T).
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { rnd, clamp01, sm, lerp, ease, layer, GW, GH } from "./layout.mjs";
import { EV, stairQ } from "./timeline.mjs";

const R = Math.round, PI = Math.PI;
export const hexA = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// ---------------------------------------------------------------- palettes (arrays: no per-pixel hex parsing)
export const FIRE = ["#FFFFF2", "#FFF3A6", "#FFD94A", "#FFA92E", "#FF6B26", "#E9352F", "#AE1F3E", "#651847"].map(hexA);
export const SMOKE = ["#170D1E", "#2B1D37", "#41304F", "#5A4769", "#776486", "#9887A6"].map(hexA);
export const ROCK = ["#1A0E16", "#3A222E", "#5E3436", "#8A4A3A", "#B8673E"].map(hexA);
export const INK = hexA("#14091A");

// ---------------------------------------------------------------- a 256² tileable value-noise fbm (built once)
const NS = 256, NM = 255;
export const NZ = (() => {
  const out = new Float32Array(NS * NS), oct = [[8, 0.5, 11], [16, 0.3, 23], [32, 0.2, 37]];
  for (const [p, w, s] of oct) {
    const lat = (i, j) => rnd((((i % p) + p) % p) * 7919 + (((j % p) + p) % p) * 104729 + s * 15485863);
    for (let y = 0; y < NS; y++) for (let x = 0; x < NS; x++) {
      const fx = (x * p) / NS, fy = (y * p) / NS, xi = Math.floor(fx), yi = Math.floor(fy), u = fx - xi, v = fy - yi, uu = u * u * (3 - 2 * u), vv = v * v * (3 - 2 * v);
      out[y * NS + x] += w * lerp(lerp(lat(xi, yi), lat(xi + 1, yi), uu), lerp(lat(xi, yi + 1), lat(xi + 1, yi + 1), uu), vv);
    }
  }
  return out;
})();
/** Noise 0..1 at integer-ish coordinates (wraps every 256). */
export const nz = (x, y) => NZ[((y | 0) & NM) * NS + ((x | 0) & NM)];
/** Bilinear noise (smooth at any scale). */
export function nzs(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, x0 = xi & NM, y0 = yi & NM, x1 = (xi + 1) & NM, y1 = (yi + 1) & NM;
  const a = NZ[y0 * NS + x0], b = NZ[y0 * NS + x1], c = NZ[y1 * NS + x0], d = NZ[y1 * NS + x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** Index into a ramp with a crisp band and a narrow Bayer-dithered seam between bands. */
export const band = (v, X, Y, w = 0.42) => { const i = Math.floor(v), f = v - i; return clamp01((f - 0.5 + w / 2) / w) > bayer(X, Y) ? i + 1 : i; };

// ---------------------------------------------------------------- the lead's camera (render.mjs camera()), replicated for anchors
function camQ(t) { let s = 0; for (let k = -3; k <= 3; k++) s += stairQ(Math.max(0, t + k * 0.1)) + (t + k * 0.1 < 0 ? (t + k * 0.1) * 1.6 : 0); return s / 7; }
const ZK = [[0, 1.75, 252], [EV.ten - 0.3, 1.75, 252], [EV.ten + 0.5, 1.45, 240], [EV.fifty - 0.3, 1.45, 240], [EV.fifty + 0.4, 1.55, 248], [EV.million - 0.1, 1.55, 248], [EV.time + 0.6, 1.95, 252], [EV.billion - 0.05, 1.95, 252], [EV.billion + 0.35, 1.35, 250]];
function zoomAt(t) { let i = 0; while (i + 1 < ZK.length && t >= ZK[i + 1][0]) i++; if (i + 1 >= ZK.length) return ZK[i]; const [a, za, xa] = ZK[i], [b, zb, xb] = ZK[i + 1], k = ease((t - a) / (b - a)); return [t, lerp(za, zb, k), lerp(xa, xb, k)]; }
export const camAt = (t) => { const q = camQ(t), [, z, sx] = zoomAt(t); return { cx: q * 34.1 + 10, cy: -(q - 0.5) * 15.5 - 70, z, sx, sy: 400 }; };
/** World point (his plane) under screen point (x, y) at film time t, by the replicated camera. */
export const toWorld = (t, x, y) => { const c = camAt(t); return [c.cx + (x - c.sx) / c.z, c.cy + (y - c.sy) / c.z]; };

// ---------------------------------------------------------------- anchors: cloud-sea rows (world.mjs SEA), islands (world.mjs ISLANDS)
export const SEA = [{ y: 668, r: 13, px: 0.16, py: 0.012, drift: 3 }, { y: 712, r: 20, px: 0.3, py: 0.02, drift: 5 }, { y: 770, r: 30, px: 0.52, py: 0.03, drift: 8 }, { y: 850, r: 46, px: 0.85, py: 0.045, drift: 12 }];
/** Screen x now of a point placed at screen x0 on sea row j at world time ts (it scrolls with that row). */
export function seaX(x0, j, ts, X) { const row = SEA[j], c0 = camAt(ts); return x0 - row.px * (X.cam.cx * X.cam.z - c0.cx * c0.z) - row.drift * (X.T - ts); }
/** Screen y of the tops of sea row j (≈ where the billows crest). */
export const seaY = (j, X) => { const row = SEA[j]; return row.y - (X.cam.cy + 70) * row.py * X.cam.z - row.r * 0.62; };
const ISL = [{ x: -150, y: -215, w: 62 }, { x: 205, y: -45, w: 44 }, { x: 600, y: -260, w: 56 }, { x: 40, y: -520, w: 50 }, { x: 640, y: -640, w: 60 }, { x: 260, y: -860, w: 48 }, { x: 900, y: -980, w: 58 }];
export function island(i, X) { const L = layer(X.cam, 0.32), s = ISL[i]; return { x: L.X(s.x), y: L.Y(s.y) - 6, w: s.w * L.z }; }

// ---------------------------------------------------------------- the explosion
const PUFFS = new Map();
function puffs(seed) {
  let p = PUFFS.get(seed); if (p) return p;
  p = [{ ox: 0, oy: 0.05, r: 0.56, up: 0.5 }];
  const n = 8 + Math.floor(rnd(seed * 3 + 1) * 4), a0 = rnd(seed * 5) * PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * PI * 2 + (rnd(seed * 7 + i) - 0.5) * 0.8, d = 0.3 + 0.32 * rnd(seed * 11 + i), r = 0.22 + 0.2 * rnd(seed * 13 + i);
    p.push({ ox: Math.cos(a) * d, oy: Math.sin(a) * d * 0.92, r, up: 0.5 - Math.sin(a) * 0.5 });
  }
  PUFFS.set(seed, p); return p;
}
const SPRAY_DAY = ["#7E92C8", "#A8BCE6", "#DCE8FA", "#FFFFFF"], SPRAY_NIGHT = ["#2C1C50", "#432C6E", "#6A4C98", "#9A78C8"];
export const sprayRamp = (dark) => SPRAY_DAY.map((d, i) => mix(d, SPRAY_NIGHT[i], dark));

/**
 * A pixel explosion. o = { x, y, a (age s), S (size px), seed, kind "air" | "sea" (sits on a surface at y: dome, flat ring,
 * cloud spray), life (s), star (comic burst, default S ≥ 34), spray (ramp from sprayRamp) , ring (default true) }.
 */
export function boom(c, o) {
  const { x, y, a, S, seed } = o, life = o.life ?? 1.5, surf = o.kind === "sea";
  if (!(a > 0) || a >= life) return;
  const g = 1 - Math.pow(1 - clamp01(a / 0.28), 3);
  const cy = surf ? y - S * 0.34 * (0.4 + 0.6 * g) : y;
  const clipY = surf ? y + 1 : 1e9;
  // 1. flash glow (ramps over ~3 frames, then falls)
  const fk = sm(a, 0, 0.075) * (1 - sm(a, 0.1, 0.34));
  if (fk > 0) {
    const rad = S * (0.55 + 0.75 * g), x0 = Math.max(0, Math.floor(x - rad * 1.5)), x1 = Math.min(GW - 1, Math.ceil(x + rad * 1.5)), y0 = Math.max(0, Math.floor(cy - rad * 1.5)), y1 = Math.min(GH - 1, Math.ceil(Math.min(clipY + 3, cy + rad * 1.5)));
    for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
      const d = Math.hypot(X + 0.5 - x, (Y + 0.5 - cy) * (surf ? 1.25 : 1)) / rad; if (d >= 1.5) continue;
      const k = fk * (d < 1 ? 1 - d * 0.55 : (1.5 - d) * 0.9), b = bayer(X, Y);
      if (k > b) c.px(X, Y, d < 0.7 && k > 0.55 ? FIRE[0] : mix(c.get(X, Y), d < 1 ? FIRE[1] : FIRE[2], d < 1 ? 0.85 : 0.55));
    }
  }
  // 2. comic star burst (a few frames, behind the fireball)
  const sk = sm(a, 0, 0.06) * (1 - sm(a, 0.13, 0.32));
  if (sk > 0 && (o.star ?? S >= 34)) {
    const n = 14, rot = rnd(seed * 17) * PI, sc = S * (0.6 + 0.85 * sm(a, 0, 0.16)), pts = (k) => { const out = []; for (let i = 0; i < n; i++) { const an = rot + (i / n) * PI * 2, r = (i % 2 ? 0.5 : 0.95 + 0.38 * rnd(seed * 19 + i)) * sc * k; out.push([x + Math.cos(an) * r, cy + Math.sin(an) * r * (surf ? 0.85 : 1)]); } return out; };
    const gk = fade(c, sk), clip = (col) => (X, Y) => (Y > clipY && (Y - clipY) / (S * 0.2) >= bayer(X, Y) ? null : col);
    gk.poly(pts(1.08), null, clip(FIRE[6])); gk.poly(pts(1), null, clip(FIRE[4])); gk.poly(pts(0.8), null, clip(FIRE[2])); gk.poly(pts(0.52), null, clip(FIRE[1]));
  }
  // 3. shock ring (flat on a surface, round in the air)
  if (o.ring !== false) for (const [d0, dur, w] of [[0.02, 0.5, 1], [0.09, 0.6, 0.6]]) {
    const kr = (a - d0) / dur; if (kr <= 0 || kr >= 1 || (!surf && w < 1 && S < 50)) continue;
    const rs = S * (0.25 + 2.4 * (1 - (1 - kr) * (1 - kr))) * w + S * 0.3 * (1 - w), ry = surf ? rs * 0.27 : rs, gk = fade(c, Math.min(1, kr * 6) * Math.pow(1 - kr, 1.3)), ry0 = surf ? y : cy;
    gk.ering(R(x), R(ry0), R(rs), Math.max(1, R(ry)), FIRE[0]);
    if (kr < 0.6) gk.ering(R(x), R(ry0), R(rs) - 1, Math.max(1, R(ry) - 1), FIRE[1]);
    if (kr < 0.35) gk.ering(R(x), R(ry0), R(rs) + 1, Math.max(1, R(ry) + 1), FIRE[3]);
  }
  // 5. cloud spray from a sea impact
  if (surf && o.spray) {
    const ramp = o.spray, n = 5 + Math.floor(S / 12);
    for (let i = 0; i < n; i++) {
      const s = seed * 31 + i, side = i % 2 ? 1 : -1, vx = side * S * (0.9 + 1.6 * rnd(s)), vy = -S * (2.2 + 1.8 * rnd(s + 1)), gy = S * 7.5, L = 0.55 + 0.4 * rnd(s + 2);
      if (a > L) continue;
      const px = x + vx * a * (1 - a * 0.3), py = y - S * 0.1 + vy * a + 0.5 * gy * a * a, r = Math.max(1, R(S * (0.07 + 0.06 * rnd(s + 3)) * (1 - 0.6 * a / L))), k = 1 - sm(a, L * 0.6, L);
      if (py - r > clipY + 4) continue;
      const gk = fade(c, k);
      gk.disc(R(px), R(py), r, ramp[1]); gk.disc(R(px - r * 0.3), R(py - r * 0.35), Math.max(1, r - 1), ramp[2]); if (r > 2) gk.disc(R(px - r * 0.45), R(py - r * 0.5), Math.max(1, R(r * 0.45)), ramp[3]);
    }
  }
  // 4. the fireball, cooling into smoke and rising, then dissolving
  fireball(c, x, cy, clipY, a, S, seed, life);
  // 6. debris with fire trails, 7. sparks
  debris(c, x, cy, a, S, seed, surf, clipY);
}

function fireball(c, x, cy, clipY, a, S, seed, life) {
  const P = puffs(seed), g = 1 - Math.pow(1 - clamp01(a / 0.26), 3), Rf = S * (0.08 + 0.92 * g) * (1 + 0.22 * Math.max(0, a - 0.26));
  const lk = life / 1.5, heat = 1.25 * Math.exp(-a / (0.75 * lk)), grow = sm(a, 0.2, life), erode = S * 0.5 * sm(a, life * 0.38, life), fadeK = 1 - sm(a, life * 0.5, life * 0.95), soft = S * 0.22;
  const n = P.length, px = new Float32Array(n), py = new Float32Array(n), pr = new Float32Array(n);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, ry = 0;
  for (let i = 0; i < n; i++) {
    const p = P[i], rise = S * (0.12 + 0.34 * p.up) * Math.pow(Math.max(0, a - 0.18), 1.1);
    px[i] = x + p.ox * Rf * (1 + 0.3 * grow); py[i] = cy + p.oy * Rf - rise; pr[i] = p.r * Rf * (1 + 0.45 * grow); ry += rise / n;
    x0 = Math.min(x0, px[i] - pr[i]); x1 = Math.max(x1, px[i] + pr[i]); y0 = Math.min(y0, py[i] - pr[i]); y1 = Math.max(y1, py[i] + pr[i]);
  }
  const gx = x, gy = cy - ry, E = Math.max(4, Rf * (0.9 + 0.3 * grow));               // the whole cloud: centre and extent
  const m = S * 0.16 + 2, ns = Math.min(1.1, 26 / S), ox = seed * 53, oy = seed * 29 + a * 18, amp = S * 0.3 * (0.45 + 0.55 * g);
  const X0 = Math.max(0, Math.floor(x0 - m)), X1 = Math.min(GW - 1, Math.ceil(x1 + m)), Y0 = Math.max(0, Math.floor(y0 - m)), Y1 = Math.min(GH - 1, Math.ceil(Math.min(clipY + soft, y1 + m)));
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
    if (fadeK < 1 && fadeK <= bayer(X, Y)) continue;
    if (Y > clipY && (Y - clipY) / soft >= bayer(X, Y)) continue;          // sinks softly into the cloud it sits on
    let best = -1e9, bi = 0;
    for (let i = 0; i < n; i++) { const dx = X + 0.5 - px[i], dy = Y + 0.5 - py[i], s = pr[i] - Math.sqrt(dx * dx + dy * dy); if (s > best) { best = s; bi = i; } }
    if (best < -m) continue;
    const nn = nzs((X + ox) * ns, (Y + oy) * ns), s = best + (nn - 0.5) * amp - erode;
    if (s <= 0) continue;
    const hG = clamp01(1 - Math.hypot(X + 0.5 - gx, (Y + 0.5 - gy) * 1.08) / E), nx = (X + 0.5 - px[bi]) / pr[bi], ny = (Y + 0.5 - py[bi]) / pr[bi], lit = -0.45 * nx - 0.7 * ny;
    const top = clamp01((gy - Y) / E) * sm(a, 0.15, 0.6);   // the top cools first
    const n2 = nz(X * 0.9 + ox, Y * 0.9 + oy), temp = heat * (0.45 + 0.8 * Math.pow(hG, 0.85)) + 0.14 * lit + 0.2 * (nn - 0.5) + 0.42 * (n2 - 0.5) * sm(a, 0.22, 0.6) - 0.22 * top;
    let col;
    if (s < 1.25) col = temp > 0.46 ? INK : SMOKE[1];
    else if (temp > 0.44) col = FIRE[Math.max(0, Math.min(7, band((1.15 - temp) / 0.09, X, Y)))];
    else col = SMOKE[Math.max(2, Math.min(5, band(2.9 + 2.1 * lit + 1.0 * (nn - 0.5) - 0.6 * (1 - hG) + 0.5 * sm(a, 0.5, life) - (s < 3 ? 0.8 : 0), X, Y)))];
    c.px(X, Y, col);
  }
}

function debris(c, x, cy, a, S, seed, surf, clipY) {
  const nd = 4 + Math.floor(S / 9);
  for (let i = 0; i < nd; i++) {
    const s = seed * 41 + i, th = surf ? -PI * (0.1 + 0.8 * rnd(s)) : PI * 2 * rnd(s), sp = S * (2.2 + 2.6 * rnd(s + 1)), gy = S * 3.4, L = 0.75 + 0.6 * rnd(s + 2);
    if (a > L) continue;
    const vx = Math.cos(th) * sp, vy0 = Math.sin(th) * sp, X = x + vx * a, Y = cy + vy0 * a + 0.5 * gy * a * a, vy = vy0 + gy * a;
    if (Y > clipY + S * 0.2) continue;
    const k = 1 - sm(a, L * 0.65, L), gk = fade(c, k), vl = Math.hypot(vx, vy) || 1, ux = vx / vl, uy = vy / vl, tl = Math.min(9, 3 + R(S / 14));
    for (let j = tl; j >= 1; j--) { const tx = R(X - ux * j * 1.4), ty = R(Y - uy * j * 1.4); if (1 - j / (tl + 1) > bayer(tx, ty) * 0.9) gk.px(tx, ty, FIRE[Math.min(7, 1 + R((j / tl) * 5))]); }
    const big = S >= 60 && rnd(s + 3) > 0.4, rx = R(X), ry = R(Y);
    gk.rect(rx - 1, ry - 1, big ? 3 : 2, big ? 3 : 2, ROCK[1]); gk.px(rx - 1, ry - 1, ROCK[3]); gk.px(rx, ry, FIRE[2]);
  }
  const nsp = 6 + Math.floor(S / 6);
  for (let i = 0; i < nsp; i++) {
    const s = seed * 59 + i, th = surf ? -PI * rnd(s) : PI * 2 * rnd(s), sp = S * (4 + 4 * rnd(s + 1)), L = 0.22 + 0.3 * rnd(s + 2);
    if (a > L) continue;
    const d = sp * a * (1 - (a / L) * 0.5), ux = Math.cos(th), uy = Math.sin(th), X = x + ux * d, Y = cy + uy * d + S * 1.2 * a * a, k = 1 - sm(a, L * 0.5, L), gk = fade(c, k);
    if (Y > clipY + 2) continue;
    for (let j = 0; j < 3; j++) gk.px(R(X - ux * j), R(Y - uy * j), FIRE[j === 0 ? 0 : j === 1 ? 1 : 3]);
  }
}

// ---------------------------------------------------------------- the meteor: a tumbling rock in a streaming flame tail
export const MDIR = (() => { const an = (62 * PI) / 180; return [-Math.cos(an), Math.sin(an)]; })();   // flight: top-right → bottom-left
/** Head at (hx, hy), size r (px), T world time, alpha 0..1 (dithered), nothing drawn below clipY. */
export function meteor(c, hx, hy, r, T, seed, alpha = 1, clipY = 1e9) {
  const [vx, vy] = MDIR, Lt = r * (13 + 1.5 * Math.sin(T * 9 + seed)), W = r * 1.55, G = W + 3 + r * 0.5, ex = hx - vx * Lt, ey = hy - vy * Lt;
  const X0 = Math.max(0, Math.floor(Math.min(hx, ex) - G - 2)), X1 = Math.min(GW - 1, Math.ceil(Math.max(hx, ex) + G + 2)), Y0 = Math.max(0, Math.floor(Math.min(hy, ey) - G - 2)), Y1 = Math.min(GH - 1, Math.floor(clipY), Math.ceil(Math.max(hy, ey) + G + 2));
  const sc = 7 / Math.max(3, r), glow = FIRE[3];
  for (let Y = Y0; Y <= Y1; Y++) for (let X = X0; X <= X1; X++) {
    if (alpha < 1 && alpha <= bayer(X, Y)) continue;
    const dx = X + 0.5 - hx, dy = Y + 0.5 - hy, u = -(dx * vx + dy * vy), w = dx * vy - dy * vx;
    if (u < -G || u > Lt) continue;
    const k = Math.max(0, u) / Lt, wid = u < 0 ? Math.sqrt(Math.max(0, W * W - u * u)) : W * Math.pow(1 - k, 0.55) * (1 + 0.14 * Math.sin(u * 0.4 - T * 26 + seed));
    const nn = nzs(u * sc * 0.8 + T * 160 + seed * 37, w * sc * 1.3 + seed * 11), v = 1 - Math.abs(w) / Math.max(0.7, wid) + (nn - 0.5) * 0.8;
    if (v <= 0) {   // a soft dithered glow just outside the flame
      const gw = u < 0 ? Math.sqrt(Math.max(0, G * G - u * u)) : G * Math.pow(1 - k, 0.8), gv = 1 - Math.abs(w) / Math.max(0.7, gw);
      if (gv > 0 && gv * 0.55 * (1 - k) > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), glow, 0.45));
      continue;
    }
    const temp = 0.5 * v + 0.92 * Math.pow(1 - k, 0.7) + 0.12 * (nn - 0.5) - 0.12;
    if (temp < 0.42) { if (k > 0.5 && (1 - k) / 0.5 <= bayer(X, Y) * 1.1) continue; c.px(X, Y, SMOKE[band(2.4 + v * 2, X, Y) > 3 ? 4 : 3]); continue; }
    c.px(X, Y, FIRE[Math.max(0, Math.min(7, band((1.18 - temp) / 0.095, X, Y)))]);
  }
  // embers peeling off the tail
  for (let i = 0; i < 5 + Math.floor(r * 1.2); i++) {
    const s = seed * 23 + i, u = ((T * (1.4 + rnd(s)) + rnd(s + 1)) % 1) * Lt * 1.25, w = (rnd(s + 2) - 0.5) * W * 2.8 + Math.sin(T * 5 + i) * 2, X = R(hx - vx * u + vy * w), Y = R(hy - vy * u - vx * w);
    if (Y <= clipY && (1 - u / (Lt * 1.25)) * alpha > bayer(X, Y)) { const col = FIRE[u < Lt * 0.4 ? 1 : u < Lt * 0.8 ? 3 : 5]; c.px(X, Y, col); if (r >= 6 && u < Lt * 0.5) c.px(X + 1, Y, col); }
  }
  if (hy - r > clipY) return;
  if (r >= 3.5) rock(alpha < 1 ? fade(c, alpha) : c, hx, hy, r * 0.8, T, seed);
  else { c.px(R(hx), R(hy), FIRE[0]); c.px(R(hx) + 1, R(hy), FIRE[1]); }
}
function rock(c, x, y, r, T, seed) {
  const n = 8, rot = T * 5 + seed, pts = (k) => { const out = []; for (let i = 0; i < n; i++) { const an = rot + (i / n) * PI * 2, rr = r * (0.82 + 0.3 * rnd(seed * 7 + i)) + k; out.push([x + Math.cos(an) * rr, y + Math.sin(an) * rr]); } return out; };
  const [vx, vy] = MDIR;
  c.poly(pts(1.2), INK);
  c.poly(pts(0), null, (X, Y) => {
    const nx = (X + 0.5 - x) / r, ny = (Y + 0.5 - y) / r, front = nx * vx + ny * vy, lit = -0.5 * nx - 0.7 * ny;
    if (front > 0.55) return FIRE[1]; if (front > 0.25) return FIRE[3];
    const crater = nz(X * 3 + seed * 13 + R(T * 5) * 7, Y * 3) > 0.68;
    return ROCK[Math.max(1, Math.min(4, band(2 + lit * 1.6 - (crater ? 1 : 0), X, Y)))];
  });
}

/** Optional profiler: XPROF=1 node render.mjs … prints the mean ms of each wrapped slot function at exit. */
const PROF = process.env.XPROF ? (globalThis.__XPROF ??= {}) : null;
if (PROF && !globalThis.__XPROF_HOOK) { globalThis.__XPROF_HOOK = 1; process.on("exit", () => { for (const [k, v] of Object.entries(PROF)) console.log(`XPROF ${k}: ${(v.ms / v.n).toFixed(1)} ms mean, ${v.max.toFixed(1)} max over ${v.n}`); }); }
export function prof(name, fn) {
  if (!PROF) return fn;
  return (c, X) => { const t0 = performance.now(); fn(c, X); const ms = performance.now() - t0, e = (PROF[name] ??= { ms: 0, n: 0, max: 0 }); e.ms += ms; e.n++; e.max = Math.max(e.max, ms); };
}
