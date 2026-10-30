// steve-real block kit (new, 2026-10-28): our own 16×16 texel paintings for a gold block, a concrete block, a log and a
// purple shulker-style box, a cube renderer on top of lib/box3d.mjs (yaw, tilt, scale, lid), the 10-stage crack pattern
// (texels dither in as the stage grows) and cached small cube icons for the inventory slots. No game files.
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { render, chain, T, RX, RY, RZ, S, grain, rnd } from "./box3d.mjs";
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const N = 16;
const GOLD = { base: ["#F2C23A", "#E6B22C", "#F8D458"], hi: "#FFF2A6", lo: "#B57C14", mid: "#D49A22", spark: "#FFFBE0" };
const CONC = ["#B4B2BC", "#A6A4B0", "#C2C0CA"], CONCD = "#8E8C9A";
const BARK = ["#6B4A2A", "#5A3C20", "#7A5634"], BARKD = "#3E2814", RING = ["#C8A060", "#B88E50", "#D8B274"], RINGD = "#8E6A3A";
const SHU = ["#8C5CB8", "#7E50AA", "#9A6AC6"], SHUD = "#4E2A72", SHUL = "#B88EE0", SHUIN = "#2A1640";

export function goldTex(face, iu, iv) {
  const e = Math.min(iu, iv, N - 1 - iu, N - 1 - iv);
  if (e === 0) return iu === 0 || iv === 0 ? GOLD.hi : GOLD.lo;
  if (e === 1) return iu === 1 || iv === 1 ? "#FFE478" : GOLD.mid;
  if ((iu + iv * 3) % 23 === 4 && e > 2) return GOLD.hi;
  if (iu - iv === 3 && iu > 3 && iu < 9) return "#FFE88A";      // a soft diagonal sheen (our own)
  return grain(GOLD.base, iu, iv, face.length * 7 + 1, [0.75, 0.9]);
}
export function concreteTex(face, iu, iv) {
  const e = Math.min(iu, iv, N - 1 - iu, N - 1 - iv);
  if (e === 0) return iu === 0 || iv === 0 ? "#D2D0D8" : CONCD;
  return rnd(iu * 13 + iv * 71 + face.length) < 0.07 ? CONCD : grain(CONC, iu, iv, face.length * 5 + 2, [0.7, 0.88]);
}
export function logTex(face, iu, iv) {
  if (face === "top" || face === "bottom") {
    const d = Math.max(Math.abs(iu - 7.5), Math.abs(iv - 7.5));
    if (d > 6.6) return grain(BARK, iu, iv, 3);
    return Math.round(d) % 3 === 0 ? RINGD : grain(RING, iu, iv, 4, [0.8, 0.92]);
  }
  const groove = (iu * 5 + Math.floor(iv / 5) * 3) % 7 === 0 || rnd(iu * 3 + Math.floor(iv / 3) * 41) < 0.08;
  return groove ? BARKD : grain(BARK, iu, iv, 5);
}
export function shulkerTex(face, iu, iv, nu, nv, lid = 0) {
  const e = Math.min(iu, iv, N - 1 - iu, N - 1 - iv);
  if (face === "top" || face === "bottom") return e === 0 ? SHUD : e === 1 ? SHUL : (iu + iv) % 9 === 0 ? SHUL : grain(SHU, iu, iv, 6);
  if (iu === 0 || iu === N - 1) return SHUD;
  if (iv === 0) return SHUL;
  if (iv === 9) return SHUD;                                  // the lid seam
  if (iv === 10) return "#6A3E92";
  if (iv === N - 1) return SHUD;
  if (face === "front" && iv >= 6 && iv <= 11 && iu >= 6 && iu <= 9) return iv === 6 || iu === 6 || iu === 9 || iv === 11 ? SHUD : "#C9A8EE";  // latch
  return grain(SHU, iu, iv, 7);
}
export const TEX = { gold: goldTex, concrete: concreteTex, log: logTex, shulker: shulkerTex };

// ---------------------------------------------------------------- cracks: 10 stages over a 16×16 face
const CRACK = (() => {
  const o = new Float32Array(N * N).fill(2);
  const walk = (x, y, ang, len, t0, seed) => { for (let i = 0; i < len; i++) { const xi = Math.round(x), yi = Math.round(y); if (xi < 1 || yi < 1 || xi > N - 2 || yi > N - 2) return; o[yi * N + xi] = Math.min(o[yi * N + xi], t0 + (i / len) * 0.55); ang += (rnd(seed * 31 + i) - 0.5) * 0.9; x += Math.cos(ang); y += Math.sin(ang); if (i === 3 && rnd(seed + 9) < 0.7) walk(x, y, ang + 1.1, len * 0.6, t0 + 0.25, seed + 17); } };
  for (let k = 0; k < 6; k++) walk(7.5, 7.5, (k / 6) * Math.PI * 2 + 0.4, 9, k * 0.07, k * 13 + 3);
  return o;
})();
/** crack darkness of texel (iu, iv) at stage s ∈ [0, 1] (dithered in per texel) — 0 none, 1 full */
export function crackAt(iu, iv, s) { const o = CRACK[iv * N + iu]; return Math.max(0, Math.min(1, (s * 1.05 - o) * 9)); }
export function withCracks(tex, s, faces = ["front", "right", "left", "top"]) {
  if (s <= 0) return tex;
  return (face, iu, iv, nu, nv) => { const base = tex(face, iu, iv, nu, nv); if (!faces.includes(face)) return base; const k = crackAt(iu, iv, s); return k > 0 && k > bayer(iu, iv) * 0.999 ? "#1E1A26" : base; };
}

/**
 * Draw a cube of side `side` px (screen, at the given scale) standing with its bottom centre at (x, y).
 * o: { yaw, tilt (about x), roll, tex, crack, lid (0..1 opens the top half of a shulker), ox, oy offsets, light }
 */
export function cube(c, x, y, side, o = {}) {
  const k = side / N, tex0 = o.tex ?? goldTex, tex = withCracks(tex0, o.crack ?? 0);
  const center = chain(T(0, N / 2, 0), RY(o.yaw ?? 0), RX(o.tilt ?? 0), RZ(o.roll ?? 0));
  const parts = [];
  if (o.lid && o.lid > 0) {                                      // a shulker-style box: base (bottom 6) + lid (top 10) that lifts and tips
    const lid = o.lid;
    parts.push({ X: chain(center, T(-8, -8, -8)), size: [N, 6, N], tex: (f, iu, iv, nu, nv) => f === "top" ? (Math.min(iu, iv, N - 1 - iu, N - 1 - iv) === 0 ? SHUD : SHUIN) : tex(f, iu, iv + 10, nu, nv), group: 1 });
    parts.push({ X: chain(center, T(0, -2 + 1.5 * lid, -8), RX(-0.95 * lid), T(-8, 0, 0)), size: [N, 10, N], tex: (f, iu, iv, nu, nv) => tex(f, iu, iv, nu, nv), group: 2 });
  } else parts.push({ X: chain(center, T(-8, -8, -8)), size: [N, N, N], tex, group: 1 });
  return render(c, parts, { ox: x, oy: y, k, pitch: o.pitch ?? 0.24, outline: o.outline ?? true, light: o.light ?? 0, clipY: o.clipY });
}

// ---------------------------------------------------------------- cached icons (slot items): a small cube at a 3/4 view
const ICONS = new Map();
export function icon(kind, side = 20) {
  const key = kind + side; let ic = ICONS.get(key);
  if (!ic) { const W = Math.ceil(side * 1.8) + 4; ic = new Canvas(W, W, "#FF00FF"); cube(ic, W / 2, W / 2 + side * 0.62, side, { tex: TEX[kind], yaw: 0.78, pitch: 0.55, light: 0.04 }); ICONS.set(key, ic); }
  return ic;
}
/** blit a cached icon centred at (x, y) through c (a dissolve view keeps working) */
export function putIcon(c, kind, x, y, side = 20, scale = 1) {
  const ic = icon(kind, side), W = ic.w, s = scale;
  if (s <= 0.02) return;
  const x0 = Math.round(x - (W * s) / 2), y0 = Math.round(y - (W * s) / 2), n = Math.round(W * s);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const sx = Math.floor(i / s), sy = Math.floor(j / s), q = (sy * W + sx) * 3; if (sx >= W || sy >= W) continue; const r = ic.d[q], g = ic.d[q + 1], b = ic.d[q + 2]; if (r === 255 && g === 0 && b === 255) continue; c.px(x0 + i, y0 + j, [r, g, b]); }
}
