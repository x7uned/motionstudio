// Minecraft film — deterministic gradient noise (our own Perlin-style implementation, fixed seed), used to build
// the illustrated block world. Not Minecraft's generator: same idea (smooth random fields), our own numbers.
const PERM = new Uint8Array(512);
{ let s = 0x2c9277b5; const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { s = (Math.imul(s ^ (s >>> 15), 0x2c1b3c6d) + 0x297a2d39) | 0; const j = ((s >>> 0) % (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
const G2 = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7071, 0.7071], [-0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, -0.7071]];
const G3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
const fadeC = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, k) => a + (b - a) * k;

/** 2D gradient noise in about [-1, 1]; `ch` picks an independent channel. */
export function perlin2(x, y, ch = 0) {
  x += ch * 71.37; y += ch * 113.91;
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const g = (i, j, dx, dy) => { const v = G2[PERM[PERM[X + i] + Y + j] & 7]; return v[0] * dx + v[1] * dy; };
  const u = fadeC(xf), v = fadeC(yf);
  return 1.41 * lerp(lerp(g(0, 0, xf, yf), g(1, 0, xf - 1, yf), u), lerp(g(0, 1, xf, yf - 1), g(1, 1, xf - 1, yf - 1), u), v);
}
/** 3D gradient noise in about [-1, 1]. */
export function perlin3(x, y, z, ch = 0) {
  x += ch * 31.7; z += ch * 57.3;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi, X = xi & 255, Y = yi & 255, Z = zi & 255;
  const g = (i, j, k, dx, dy, dz) => { const v = G3[PERM[PERM[PERM[X + i] + Y + j] + Z + k] % 12]; return v[0] * dx + v[1] * dy + v[2] * dz; };
  const u = fadeC(xf), v = fadeC(yf), w = fadeC(zf);
  return lerp(
    lerp(lerp(g(0, 0, 0, xf, yf, zf), g(1, 0, 0, xf - 1, yf, zf), u), lerp(g(0, 1, 0, xf, yf - 1, zf), g(1, 1, 0, xf - 1, yf - 1, zf), u), v),
    lerp(lerp(g(0, 0, 1, xf, yf, zf - 1), g(1, 0, 1, xf - 1, yf, zf - 1), u), lerp(g(0, 1, 1, xf, yf - 1, zf - 1), g(1, 1, 1, xf - 1, yf - 1, zf - 1), u), v), w);
}
/** fractal sum of octaves of perlin2, normalised to about [-1, 1] */
export function fbm2(x, y, oct = 4, ch = 0, lac = 2, gain = 0.5) {
  let s = 0, a = 1, n = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += a * perlin2(x * f, y * f, ch + i * 3); n += a; a *= gain; f *= lac; }
  return s / n;
}
/** integer hash → [0, 1) */
export function hash(a, b = 0, c = 0) {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296;
}
