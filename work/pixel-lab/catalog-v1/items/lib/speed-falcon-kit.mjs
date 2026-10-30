// catalog-v1 (2026-10-26): helpers that city-falcon.mjs needs from the film's city-kit (spriteCache, xform, R, clamp01, lerp), copied verbatim or re-exported from speed-jungle-kit.
export { spriteCache } from "./speed-jungle-kit.mjs";
export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const lerp = (a, b, k) => a + (b - a) * k;
export function xform(poly, ox, oy, ang = 0, sx = 1, sy = sx, dx = 0, dy = 0) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return poly.map(([x, y]) => { const u = (x - ox) * sx, v = (y - oy) * sy; return [ox + dx + u * c - v * s, oy + dy + u * s + v * c]; });
}
/** Thick pixel polyline (radius r, round caps) in one colour. */
export function thick(g, pts, r, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) { const x = ax + ((bx - ax) * k) / n, y = ay + ((by - ay) * k) / n; for (let j = -r; j <= r; j++) for (let i2 = -r; i2 <= r; i2++) if (i2 * i2 + j * j <= r * r + 0.5) g.px(R(x) + i2, R(y) + j, col); }
  }
}
