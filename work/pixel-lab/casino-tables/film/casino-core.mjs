// Casino kit · core: the perspective camera, ramps (8 steps dark → light), dithered shading helpers. See casino.mjs for the API.
// World units are centimetres: x to the right, y up, z toward the camera (the far back wall is at negative z).
import { bayer, mix, fade } from "../../../../renderer/pixel/raster.mjs";

export const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export { bayer, mix, fade };

// ---------------------------------------------------------------- ramps
export const RAMP = {
  carpet: ["#14030A", "#24060F", "#380A16", "#4E0F1E", "#681628", "#842034", "#A02E42", "#BC4252"],
  gold: ["#2A1A06", "#4A3008", "#6E4A10", "#94661A", "#B88426", "#D4A23A", "#E8C25A", "#F6DE8A"],
  teal: ["#04121A", "#0A222C", "#10363E", "#164C54", "#1E646C", "#2A7E84", "#3E9A9C", "#5EB8B4"],
  felt: ["#031610", "#062418", "#0B3422", "#11472E", "#195C3B", "#227448", "#2F8C57", "#44A86A"],
  wood: ["#120604", "#200C08", "#32140C", "#462012", "#5C2C18", "#743C22", "#8E5030", "#AA6A44"],
  maple: ["#2A1408", "#46220E", "#663416", "#86481E", "#A65E2A", "#C27A3C", "#D89A56", "#EABC7C"],
  leather: ["#0C0505", "#180A09", "#26110E", "#361812", "#482218", "#5C2E20", "#723C2A", "#8C4E38"],
  wall: ["#12040A", "#1E0710", "#2C0C18", "#3C1220", "#4E1A2A", "#622434", "#783040", "#903E4E"],
  chrome: ["#14141E", "#262634", "#3C3C4E", "#56566C", "#74748A", "#9696AA", "#BCBCCC", "#E6E6F0"],
  red: ["#2A0408", "#4E0810", "#78101A", "#A01824", "#C42430", "#E03C40", "#F2665E", "#FCA090"],
  black: ["#050508", "#0C0C12", "#15151E", "#20202C", "#2C2C3C", "#3A3A4E", "#4C4C64", "#64647E"],
  green: ["#021A0A", "#043012", "#06481C", "#0A6428", "#108236", "#1CA046", "#38BE5E", "#6ADA86"],
  ivory: ["#3A3428", "#5A5240", "#7A705A", "#9A9078", "#BAB298", "#D4CCB4", "#ECE6D2", "#FFFCF0"],
  blue: ["#060A2A", "#0C1448", "#142068", "#1E2E8C", "#2C42AE", "#4060CC", "#6084E0", "#90B0F2"],
  purple: ["#16061E", "#280C36", "#3E1452", "#561E70", "#70288E", "#8C38AC", "#A858C6", "#C888DE"],
  yellow: ["#2A1A02", "#4E3204", "#7A5008", "#A6700E", "#D09418", "#ECB42A", "#F8D24E", "#FFEC90"],
  skin: ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"],
  shirt: ["#3A3A4A", "#5A5A6C", "#7A7A8E", "#9A9AAE", "#BABACC", "#D4D4E2", "#ECECF4", "#FFFFFF"],
  vest: ["#06060C", "#0E0E18", "#181826", "#232336", "#303048", "#3E3E5C", "#505072", "#666688"],
  glass: ["#081018", "#0E1C28", "#16283A", "#20384E", "#2C4A64", "#3C607E", "#567C9A", "#7CA0BA"],
};
export const UI = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A", W: "#FFF6DA" };

/** Ramp colour for a float level (0..7) with an ordered-dither step between neighbours. */
export function rampAt(ramp, level, x, y) {
  const l = Math.max(0, Math.min(7, level)), lo = Math.floor(l);
  return ramp[l - lo > bayer(x, y) ? Math.min(7, lo + 1) : lo];
}
/** Fill a polygon with a ramp; level(x, y) → 0..7 (float, dithered). */
export function shadePoly(c, pts, ramp, level) { c.poly(pts, null, (x, y) => rampAt(ramp, level(x, y), x, y)); }
/** Soft additive-looking glow: tint toward `col` with a radial falloff (dithered, quantised). */
export function glow(c, x, y, rx, ry, col, k = 0.5, steps = 4) {
  if (k <= 0 || rx < 1) return;
  c.tint(R(x - rx), R(y - ry), R(rx * 2), R(ry * 2), (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d) * (1 - d); }, col, steps);
}
/** Darken under an object (contact shadow). */
export function shadow(c, x, y, rx, ry, k = 0.5) { glow(c, x, y, rx, ry, "#000000", k, 3); }

// ---------------------------------------------------------------- camera
/**
 * makeView({ tx, ty, tz, D, pitch, f = 1100, sx0 = 270, sy0 = 400 }) → V.
 * The camera looks at the target (tx, ty, tz) from distance D, pitched down by `pitch` radians (no yaw, no roll).
 * V.P(x, y, z) → [sx, sy, k] (k = screen px per cm at that point), V.k(x, y, z), V.ray(px, py), V.cam = { x, y, z }.
 * Billboards (people, slot machines) use V.bill(x, z, cmPerUnit, vf) → G = { X(u), Y(v), z, k, bx, by } for rig units.
 */
export function makeView(o) {
  const { tx, ty, tz, D, pitch: p, f = 1100, sx0 = 270, sy0 = 400 } = o;
  const sp = Math.sin(p), cp = Math.cos(p), cx = tx, cy = ty + D * sp, cz = tz + D * cp;
  const V = { ...o, f, sx0, sy0, sp, cp, cam: { x: cx, y: cy, z: cz } };
  V.P = (x, y, z) => { const dx = x - cx, dy = y - cy, dz = z - cz, d = -dy * sp - dz * cp, u = dy * cp - dz * sp, k = f / Math.max(1, d); return [sx0 + dx * k, sy0 - u * k, k]; };
  V.depth = (x, y, z) => -(y - cy) * sp - (z - cz) * cp;
  V.k = (x, y, z) => f / Math.max(1, V.depth(x, y, z));
  /** Ray through a screen pixel: direction (dx, dy, dz) from the camera, not normalised. */
  V.ray = (px, py) => { const a = (px - sx0) / f, b = -(py - sy0) / f; return [a, -sp + b * cp, -cp - b * sp]; };
  /** Billboard frame at a floor point: rig units → screen, `unit` cm per rig unit, vertical factor vf. mirror flips X. */
  V.bill = (x, z, unit = 1.72, vf = 0.86, mirror = false, y = 0) => {
    const [bx, by, k] = V.P(x, y, z), zz = unit * k;
    return { X: (u) => bx + (mirror ? -u : u) * zz, Y: (v) => by + v * zz * vf, z: zz, k, bx, by, vf, mirror };
  };
  /** Screen point → rig units of billboard G (inverse of G.X / G.Y). */
  V.toRig = (G, sx, sy) => [((sx - G.bx) / G.z) * (G.mirror ? -1 : 1), (sy - G.by) / (G.z * G.vf)];
  return V;
}
/** Blend two camera keys (log-distance so a dolly feels even). */
export function blendCam(a, b, k) {
  const o = {}; for (const key of Object.keys(a)) o[key] = typeof a[key] === "number" ? lerp(a[key], b[key] ?? a[key], k) : a[key];
  o.D = Math.exp(lerp(Math.log(a.D), Math.log(b.D), k)); return o;
}
/** Camera track: keys [[t0, t1, cam]] — eased move from the previous cam during [t0, t1]. */
export function camAt(keys, t) {
  let cam = keys[0][2];
  for (let i = 1; i < keys.length; i++) { const [t0, t1, next] = keys[i]; if (t <= t0) break; cam = blendCam(cam, next, ease((t - t0) / (t1 - t0))); }
  return cam;
}

/** Project a horizontal circle (or arc) at height y: polygon of screen points. */
export function ringPts(V, cx, y, cz, r, a0 = 0, a1 = Math.PI * 2, n = 0) {
  const k = V.k(cx, y, cz); n = n || Math.max(12, Math.min(160, Math.ceil(r * k * 0.9)));
  const out = []; for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, p = V.P(cx + Math.cos(a) * r, y, cz + Math.sin(a) * r); out.push([p[0], p[1]]); }
  return out;
}
/** Annular sector polygon (for wheel pockets): radii r0..r1, angles a0..a1, at height y (or y0 inner, y1 outer). */
export function sectorPts(V, cx, cz, r0, r1, a0, a1, y0, y1 = y0, n = 3) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n, p = V.P(cx + Math.cos(a) * r1, y1, cz + Math.sin(a) * r1); out.push([p[0], p[1]]); }
  for (let i = n; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / n, p = V.P(cx + Math.cos(a) * r0, y0, cz + Math.sin(a) * r0); out.push([p[0], p[1]]); }
  return out;
}
/** Projected polygon of a horizontal (x, z) outline at height y. */
export function flatPts(V, pts, y) { return pts.map(([x, z]) => { const p = V.P(x, y, z); return [p[0], p[1]]; }); }
/** Rounded rectangle outline in the floor plane (x0..x1, z0..z1, corner radius r). */
export function rrectXZ(x0, z0, x1, z1, r, n = 4) {
  const out = [], cs = [[x1 - r, z0 + r, -Math.PI / 2], [x1 - r, z1 - r, 0], [x0 + r, z1 - r, Math.PI / 2], [x0 + r, z0 + r, Math.PI]];
  for (const [cx, cz, a] of cs) for (let i = 0; i <= n; i++) { const b = a + (Math.PI / 2) * (i / n); out.push([cx + Math.cos(b) * r, cz + Math.sin(b) * r]); }
  return out;
}
/** Bounding box of screen points. */
export const bbox = (pts) => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; } return { x0, y0, x1, y1 }; };
export const onScreen = (b, pad = 0) => b.x1 >= -pad && b.x0 <= 540 + pad && b.y1 >= -pad && b.y0 <= 960 + pad;
