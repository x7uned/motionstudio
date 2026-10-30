// Minecraft film — the world-scale view: the whole world square (±29,999,984 blocks) as an iso diamond. Outside the area that
// was actually built it is drawn as a dim "not built yet" world (our own noise, an illustration — not a real seed's map),
// with the glowing world border on its edges. Same iso projection as the voxel views, so zooms are continuous.
import { bayer, mix, fade } from "../../../../renderer/pixel/raster.mjs";
import { ground } from "../../../../renderer/pixel/earth.mjs";
import { perlin2 } from "./noise.mjs";
import { MAIN, SEA, colIndex } from "./world.mjs";
import { avgColor } from "./voxel.mjs";

export const HALF = 29999984;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const VOID = hx("#0A0812");

// ---------------------------------------------------------------- the "not built yet" world: LOD noise down to the pixel footprint
const OCEAN = hx("#2A4E8E"), LAND = hx("#4C8A36"), DRY = hx("#C2A86A"), SNOWC = hx("#DCE4EE"), HILL = hx("#7E7E88");
export function worldColor(out, x, z, bs, X, Y, ghost = 1) {
  // continents at ~3M blocks, finer octaves only while they are bigger than ~2 px
  let n = 0, amp = 1, norm = 0;
  for (let lam = 3.2e6, k = 0; lam * bs > 0.75 && k < 22; lam /= 2, k++) { const w = Math.min(1, (lam * bs - 0.75) / 1.5); n += amp * w * perlin2(x / lam, z / lam, 40 + k); norm += amp * w; amp *= 0.55; }
  n = norm ? n / norm : 0;
  n += 0.45 * Math.exp(-(x * x + z * z) / (2.6e6 * 2.6e6));            // spawn sits on a continent
  const tmp = perlin2(x / 5.5e6, z / 5.5e6, 70), wet = perlin2(x / 4.1e6, z / 4.1e6, 71);
  let c;
  if (n < -0.02) { const d = clamp(-n * 3); c = [OCEAN[0] * (1 - d * 0.35), OCEAN[1] * (1 - d * 0.35), OCEAN[2] * (1 - d * 0.25)]; }
  else { c = tmp > 0.3 && wet < 0 ? DRY : tmp < -0.35 ? SNOWC : n > 0.32 ? HILL : LAND; c = [...c]; }
  // dim "blueprint" look for the part nobody has visited: darker, cooler, with a fine dither grid
  if (ghost > 0) { const g = 0.36 + 0.1 * (bayer(X, Y) > 0.5 ? 1 : 0); for (let i = 0; i < 3; i++) c[i] = c[i] * (1 - ghost) + (c[i] * g + [18, 14, 40][i] * (1 - g)) * ghost; }
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
}

// ---------------------------------------------------------------- the built area's top colours (MAIN) with mips
const TOPC = (() => {
  const r = MAIN, n = r.nx, img = new Float32Array(n * n * 3);
  const cache = new Map(), col = (v) => { let c = cache.get(v); if (!c) { c = avgColor(v, 0); cache.set(v, c); } return c; };
  for (let z = 0; z < r.nz; z++) for (let x = 0; x < r.nx; x++) {
    const ci = z * r.nx + x, top = r.top[ci]; let v = 0; for (let y = top; y >= 0; y--) { v = r.vox[(y * r.nz + z) * r.nx + x]; if (v) break; }
    const c = col(v), sh = 0.86 + 0.14 * clamp((top - SEA) / 30); img.set([c[0] * sh, c[1] * sh, c[2] * sh], ci * 3);
  }
  const mips = [{ n, img }]; let cur = { n, img };
  while (cur.n > 2) { const m = cur.n >> 1, o = new Float32Array(m * m * 3); for (let z = 0; z < m; z++) for (let x = 0; x < m; x++) for (let k = 0; k < 3; k++) o[(z * m + x) * 3 + k] = (cur.img[((2 * z) * cur.n + 2 * x) * 3 + k] + cur.img[((2 * z) * cur.n + 2 * x + 1) * 3 + k] + cur.img[((2 * z + 1) * cur.n + 2 * x) * 3 + k] + cur.img[((2 * z + 1) * cur.n + 2 * x + 1) * 3 + k]) / 4; cur = { n: m, img: o }; mips.push(cur); }
  return mips;
})();
function builtColor(out, x, z, bs) {
  const r = MAIN, lx = x - r.ox, lz = z - r.oz; if (lx < 0 || lz < 0 || lx >= r.nx || lz >= r.nz) return false;
  let lev = 0; while (lev < TOPC.length - 1 && (1 << lev) * bs < 1) lev++;
  const m = TOPC[lev], s = 1 << lev, ix = Math.min(m.n - 1, (lx / s) | 0), iz = Math.min(m.n - 1, (lz / s) | 0), i = (iz * m.n + ix) * 3;
  out[0] = m.img[i]; out[1] = m.img[i + 1]; out[2] = m.img[i + 2]; return true;
}

// ---------------------------------------------------------------- the map renderer
/** cam {x, y, z, b, ax?, ay?}: same iso projection as renderIso, on the plane y = SEA. strips: Earth surface bands (0..7 alpha array). */
export function renderMap(c, clip, cam, t, { strips = null, ringA = 0 } = {}) {
  const W = c.w, H = c.h, b = cam.b, ax = cam.ax ?? W / 2, ay = cam.ay ?? H / 2, out = [0, 0, 0];
  const AX = cam.x - cam.z, BY = (cam.x + cam.z) / 2 - cam.y;
  for (let Y = Math.max(0, clip[1]); Y < Math.min(H, clip[3]); Y++) for (let X = Math.max(0, clip[0]); X < Math.min(W, clip[2]); X++) {
    const A = (X + 0.5 - ax) / b + AX, Bv = (Y + 0.5 - ay) / b + BY, S = 2 * (Bv + SEA), x = (S + A) / 2, z = (S - A) / 2;
    if (Math.abs(x) > HALF || Math.abs(z) > HALF) { out[0] = VOID[0]; out[1] = VOID[1]; out[2] = VOID[2]; }
    else if (!builtColor(out, x, z, b)) worldColor(out, x, z, b, X, Y, 1);
    // Earth's surface laid flat as 7 bands across the world
    if (strips) { const i = Math.floor((z + HALF) / (2 * HALF / 7)); if (i >= 0 && i < 7 && strips[i] > bayer(X, Y) && Math.abs(x) <= HALF) earthBand(out, x, z, i, b, X, Y); }
    // the old Far Lands ring at ±12,550,821
    if (ringA > 0) { const R = 12550821, e = 1.2 / b, dx = Math.abs(Math.abs(x) - R), dz = Math.abs(Math.abs(z) - R);
      if (((dx < e && Math.abs(z) <= R + e) || (dz < e && Math.abs(x) <= R + e)) && ((Math.floor((x + z) * b / 5) & 1) === 0) && ringA > bayer(X, Y)) { out[0] = 244; out[1] = 202; out[2] = 80; } }
    const i = (Y * W + X) * 3; c.d[i] = out[0]; c.d[i + 1] = out[1]; c.d[i + 2] = out[2];
  }
}
function earthBand(out, x, z, i, b, X, Y) {
  const L = 2 * HALF / 7, s = (x + HALF) / (2 * HALF), tt = (z + HALF - i * L) / L, lon = -180 + 360 * s, lat = 88 - 176 * tt;
  const land = ground(lat, lon);
  let c = land ? (Math.abs(lat) > 64 ? [226, 232, 240] : Math.abs(lat) < 28 && (lon > -20 && lon < 60) && lat > 12 ? [200, 170, 104] : [92, 156, 70]) : [48, 92, 170];
  // band edges
  if (tt < 0.6 * 1 / (L * b) || tt > 1 - 0.6 / (L * b)) c = [20, 16, 34];
  out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
}
export function mapProject(cam, W, H, x, y, z) { const ax = cam.ax ?? W / 2, ay = cam.ay ?? H / 2; return [ax + ((x - z) - (cam.x - cam.z)) * cam.b, ay + ((x + z) / 2 - y - ((cam.x + cam.z) / 2 - cam.y)) * cam.b]; }

/** the world border: glowing translucent walls on the four edges (screen-space height hpx) */
export function drawBorder(c, cam, a, hpx = 16, t = 0) {
  if (a <= 0) return; const W = c.w, H = c.h, P = (x, z) => mapProject(cam, W, H, x, SEA, z);
  const corners = [P(-HALF, -HALF), P(HALF, -HALF), P(HALF, HALF), P(-HALF, HALF)];   // top, right, bottom, left (screen)
  const edges = [[0, 1], [1, 2], [2, 3], [3, 0]], f = fade(c, a);
  for (const [i, j] of edges) {
    const [x0, y0] = corners[i], [x1, y1] = corners[j], len = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(len);
    for (let k = 0; k <= n; k++) { const u = k / n, x = Math.round(x0 + (x1 - x0) * u), yb = y0 + (y1 - y0) * u;
      for (let h = 0; h < hpx; h++) { const y = Math.round(yb - h), stripe = ((x + h + Math.floor(t * 18)) % 8 + 8) % 8 < 3, k2 = 1 - h / hpx;
        if (y < 0 || y >= H || x < 0 || x >= W) continue;
        const q = (stripe ? 0.75 : 0.32) * (0.4 + 0.6 * k2); if (q > bayer(x, y)) f.px(x, y, stripe ? "#7FE8FF" : "#3A9EC8"); }
      if (x >= 0 && x < W) { const y = Math.round(yb); if (y >= 0 && y < H) f.px(x, y, "#C8F6FF"); } }
  }
}
