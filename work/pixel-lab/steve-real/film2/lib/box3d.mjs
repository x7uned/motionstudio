// steve-real box renderer (new, 2026-10-28): blocky things (Steve, gold / concrete / log blocks, the shulker box, item drops)
// are small textured cuboids rendered through a z-buffer into the pixel grid: orthographic view with a slight top-down
// pitch, nearest texels (our own textures, no game files), flat light levels, a dark 1-px silhouette outline and a darker
// seam where a nearer part overlaps a farther one. Pure: everything is a function of the arguments.
import { hex, mix } from "../../../../../renderer/pixel/raster.mjs";

export const OL = "#0B0812";
const DARK = "#1B1235", LIGHT = "#FFF6E6";

// ---------------------------------------------------------------- 3×4 transforms { m: [9] row-major, t: [3] }
export const I = () => ({ m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [0, 0, 0] });
export function mul(A, B) { // A ∘ B
  const a = A.m, b = B.m, m = new Array(9);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) m[r * 3 + c] = a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
  const t = [0, 1, 2].map((r) => a[r * 3] * B.t[0] + a[r * 3 + 1] * B.t[1] + a[r * 3 + 2] * B.t[2] + A.t[r]);
  return { m, t };
}
export const T = (x, y, z) => ({ m: [1, 0, 0, 0, 1, 0, 0, 0, 1], t: [x, y, z] });
export const RX = (a) => { const c = Math.cos(a), s = Math.sin(a); return { m: [1, 0, 0, 0, c, -s, 0, s, c], t: [0, 0, 0] }; };
export const RY = (a) => { const c = Math.cos(a), s = Math.sin(a); return { m: [c, 0, s, 0, 1, 0, -s, 0, c], t: [0, 0, 0] }; };
export const RZ = (a) => { const c = Math.cos(a), s = Math.sin(a); return { m: [c, -s, 0, s, c, 0, 0, 0, 1], t: [0, 0, 0] }; };
export const S = (k) => ({ m: [k, 0, 0, 0, k, 0, 0, 0, k], t: [0, 0, 0] });
export const chain = (...xs) => xs.reduce((A, B) => mul(A, B));
export const apply = (X, p) => [0, 1, 2].map((r) => X.m[r * 3] * p[0] + X.m[r * 3 + 1] * p[1] + X.m[r * 3 + 2] * p[2] + X.t[r]);
const lin = (X, p) => [0, 1, 2].map((r) => X.m[r * 3] * p[0] + X.m[r * 3 + 1] * p[1] + X.m[r * 3 + 2] * p[2]);

// faces of a box [w, h, d] with its min corner at the local origin: origin, U (texture u), V (texture v, downward), normal
const FACES = (w, h, d) => [
  ["front", [0, h, d], [w, 0, 0], [0, -h, 0], [0, 0, 1], w, h],
  ["back", [w, h, 0], [-w, 0, 0], [0, -h, 0], [0, 0, -1], w, h],
  ["right", [w, h, d], [0, 0, -d], [0, -h, 0], [1, 0, 0], d, h],
  ["left", [0, h, 0], [0, 0, d], [0, -h, 0], [-1, 0, 0], d, h],
  ["top", [0, h, 0], [w, 0, 0], [0, 0, d], [0, 1, 0], w, d],
  ["bottom", [0, 0, d], [w, 0, 0], [0, 0, -d], [0, -1, 0], w, d],
];

const LCACHE = new Map();
function lit(col, lv) { // col: hex string, lv: light level (1 = as painted), quantised by the caller
  const key = col + lv; let v = LCACHE.get(key);
  if (!v) { v = lv >= 1 ? mix(col, LIGHT, Math.min(0.6, (lv - 1) * 1.4)) : mix(col, DARK, Math.min(0.8, (1 - lv) * 1.15)); LCACHE.set(key, v); }
  return v;
}
const L0 = (() => { const v = [-0.42, 0.8, 0.45], n = Math.hypot(...v); return v.map((x) => x / n); })();

/**
 * Render parts into canvas c. parts: [{ X: transform of the box's local frame (units), size: [w,h,d], tex(face, iu, iv, nu, nv) → hex|null,
 * id, glow? }]. view: { ox, oy, k (px per unit), pitch (rad), clipY?, clipX?: [x0,x1], outline=true, seam=true, light?: number }
 * Returns { box: {x0,y0,x1,y1}, pts: (p) → screen } or null.
 */
export function render(c, parts, view) {
  const { ox, oy, k } = view, cp = Math.cos(view.pitch ?? 0.24), sp = Math.sin(view.pitch ?? 0.24);
  const P = (p) => [ox + k * p[0], oy - k * (p[1] * cp - p[2] * sp), p[2] * cp + p[1] * sp];
  const PV = (v) => [k * v[0], -k * (v[1] * cp - v[2] * sp), v[2] * cp + v[1] * sp];
  const faces = []; let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (const part of parts) {
    const [w, h, d] = part.size;
    for (const [name, o0, U0, V0, n0, nu, nv] of FACES(w, h, d)) {
      const n = lin(part.X, n0), nz = n[2] * cp + n[1] * sp; if (nz <= 1e-4) continue;    // back face
      const o = P(apply(part.X, o0)), eu = PV(lin(part.X, U0)), ev = PV(lin(part.X, V0)), det = eu[0] * ev[1] - eu[1] * ev[0];
      if (Math.abs(det) < 1e-3) continue;
      const xs = [o[0], o[0] + eu[0], o[0] + ev[0], o[0] + eu[0] + ev[0]], ys = [o[1], o[1] + eu[1], o[1] + ev[1], o[1] + eu[1] + ev[1]];
      const f = { part, name, o, eu, ev, det, nu, nv, x0: Math.floor(Math.min(...xs)), x1: Math.ceil(Math.max(...xs)), y0: Math.floor(Math.min(...ys)), y1: Math.ceil(Math.max(...ys)) };
      const nl = Math.hypot(...n) || 1, l = Math.max(0, (n[0] * L0[0] + n[1] * L0[1] + n[2] * L0[2]) / nl);
      f.lv = Math.round((0.64 + 0.46 * l + (view.light ?? 0)) * 12) / 12;
      faces.push(f); bx0 = Math.min(bx0, f.x0); by0 = Math.min(by0, f.y0); bx1 = Math.max(bx1, f.x1); by1 = Math.max(by1, f.y1);
    }
  }
  if (!faces.length) return null;
  bx0 -= 1; by0 -= 1; bx1 += 1; by1 += 1;
  const W = bx1 - bx0 + 1, H = by1 - by0 + 1; if (W * H > 4e6) return null;
  const zb = new Float32Array(W * H).fill(-Infinity), col = new Array(W * H), pid = new Int16Array(W * H).fill(-1);
  for (const f of faces) {
    const { o, eu, ev, det, part } = f, pi = parts.indexOf(part);
    for (let y = Math.max(f.y0, by0); y <= f.y1; y++) {
      if (view.clipY !== undefined && y > view.clipY) break;
      for (let x = f.x0; x <= f.x1; x++) {
        const px = x + 0.5 - o[0], py = y + 0.5 - o[1];
        const a = (px * ev[1] - py * ev[0]) / det, b = (eu[0] * py - eu[1] * px) / det;
        if (a < -0.002 || a > 1.002 || b < -0.002 || b > 1.002) continue;
        const z = o[2] + a * eu[2] + b * ev[2], i = (y - by0) * W + (x - bx0);
        if (z <= zb[i]) continue;
        const iu = Math.min(f.nu - 1, Math.max(0, Math.floor(a * f.nu))), iv = Math.min(f.nv - 1, Math.max(0, Math.floor(b * f.nv)));
        const tc = part.tex(f.name, iu, iv, f.nu, f.nv); if (!tc) continue;
        zb[i] = z; pid[i] = pi; col[i] = part.flat ? hex(tc) : lit(tc, f.lv);
      }
    }
  }
  const outline = view.outline ?? true, seam = view.seam ?? true;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, X = x + bx0, Y = y + by0;
    if (pid[i] < 0) {
      if (!outline) continue;
      if ((x > 0 && pid[i - 1] >= 0) || (x < W - 1 && pid[i + 1] >= 0) || (y > 0 && pid[i - W] >= 0) || (y < H - 1 && pid[i + W] >= 0)) { if (view.clipY === undefined || Y <= view.clipY) c.px(X, Y, OL); }
      continue;
    }
    let cc = col[i];
    if (seam) { for (const j of [i - 1, i + 1, i - W, i + W]) { if (j < 0 || j >= W * H || pid[j] < 0 || pid[j] === pid[i]) continue; if (zb[j] > zb[i] + 1.2 && (parts[pid[j]].group ?? pid[j]) !== (parts[pid[i]].group ?? pid[i])) { cc = mix(cc, OL, 0.7); break; } } }
    c.px(X, Y, cc);
  }
  return { box: { x0: bx0 + 1, y0: by0 + 1, x1: bx1 - 1, y1: by1 - 1 }, P };
}

// ---------------------------------------------------------------- texture helpers
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** pick base / darker / lighter by a fixed texel noise (our own speckle, not a game texture) */
export function grain(cols, iu, iv, seed, p = [0.72, 0.9]) { const r = rnd(iu * 31 + iv * 977 + seed * 7919); return r < p[0] ? cols[0] : r < p[1] ? cols[1] : cols[2] ?? cols[0]; }
