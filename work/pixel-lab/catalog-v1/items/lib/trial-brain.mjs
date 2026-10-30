// catalog-v1 copy (2026-10-26) of work/pixel-lab/trial-10s/props/kid.mjs — the brain inside the kid's X-ray window, as a
// standalone brain. Changes: only the brain geometry (lobes, Sylvian fissure, central sulcus, cerebellum, brain stem, the
// face area FFA and the signal path), its palette and the per-pixel colour functions (brainColor; cerebellum / stem from
// xrayPixel) are kept; the head, hoodie, glass window and skull are not ported; a dark selective outline is added around
// the silhouette (drawBrain below), since the film drew the brain inside a glass window; the stem ends in a rounded
// tip; brainColor gains two catalog terms (st.think: bright waves rolling over the cortex, st.spark: a lift of every band);
// the overlays (signal route + pulse, face-area dashes, ring wave, halo + rays) are copied from drawKidOverlays; the fissure
// distance tests get a bounding-box pre-test (speed).
import { bayer, mix, hex } from "../../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, sm, lerp, ramp, band, tintPx, easeOut } from "../../engine/layout.mjs";

// ---------------------------------------------------------------- geometry (head-local units, origin = cranium centre, y down)
function spline(pts, n = 6, closed = true) {
  const out = [], m = pts.length, P = (i) => pts[closed ? (i + m) % m : Math.max(0, Math.min(m - 1, i))];
  for (let i = 0; i < (closed ? m : m - 1); i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
  if (!closed) out.push(pts[m - 1]);
  return out;
}
// brain (lateral view, front to the right); drawn 7 % larger than first sketched so it fills the cranium window
const BS = (pts) => pts.map(([x, y]) => [-2 + (x + 2) * 1.07, -12 + (y + 12) * 1.07]);
const BRAIN = BS(spline([[74, -14], [70, -38], [56, -58], [34, -70], [8, -74], [-20, -70], [-46, -58], [-66, -38], [-76, -12], [-72, 6], [-60, 18], [-40, 27], [-14, 36], [12, 40], [34, 35], [47, 25], [46, 15], [56, 9], [68, 3]], 5));
const CEREB = { x: -52, y: 36, rx: 26, ry: 14 };
export const FFA = { x: -13, y: 35.5, rx: 21, ry: 7.8, rot: -0.17 };
export const EYE = { x: 70, y: 25 };
const PATH = [[66, 25], [44, 21], [16, 16], [-16, 8], [-48, 2], [-73, -3], [-72, 13], [-54, 24], [-33, 33], [-13, 36]];
const PATH_S = (() => { const cum = [0]; for (let i = 1; i < PATH.length; i++) cum.push(cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1])); return cum; })();
export function pathAt(u) { const L = PATH_S[PATH_S.length - 1], s = clamp01(u) * L; let i = 1; while (i < PATH.length - 1 && PATH_S[i] < s) i++; const k = (s - PATH_S[i - 1]) / (PATH_S[i] - PATH_S[i - 1]); return [lerp(PATH[i - 1][0], PATH[i][0], k), lerp(PATH[i - 1][1], PATH[i][1], k)]; }

const PAL = {
  skin: ["#1E1220", "#2E1A2C", "#43263A", "#6A3A44", "#9C5648", "#C8784E", "#EBA064"],
  hair: ["#120A16", "#1E1224", "#2C1C36", "#4A3E70", "#6E6AA8"],
  hood: ["#130E22", "#1D1534", "#2A1F45", "#3B2C5C", "#5C5490"],
  cat: ["#0A0610", "#16101E", "#2A2238"], catIn: "#7A3E62",
  glass: "#14112C", glass2: "#1B1738", rimX: "#8FB0F0", scan: "#D6E4FF",
  brain: ["#4A2C58", "#6C4478", "#8E5E96", "#B07EB2", "#CC9CCB", "#E4BEE0", "#F5DCF0"], sulcus: "#5A3466",
  cereb: ["#3E2650", "#5C3C6E", "#7C5690", "#9C74AE"],
  ffa: ["#C55A1C", "#F08A3C", "#F7C24E", "#FFE38E", "#FFF6CE"],
};

const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const BRAIN_BB = (() => { let a = [1e9, 1e9, -1e9, -1e9]; for (const [x, y] of BRAIN) a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; return a; })();
// cache of brain pixels per (z, sub-pixel offset): brain is re-sampled only when the zoom changes noticeably
const sulcusField = (x, y) => Math.sin(x * 0.19 + 2.1 * Math.sin(y * 0.13 + 0.7) + 0.6 * Math.sin(y * 0.31)) + Math.sin(y * 0.23 + 1.9 * Math.sin(x * 0.11 + 1.3) + 0.5 * Math.cos(x * 0.29));
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, k = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * k, py - ay - dy * k); };
const SYLVIAN = BS(spline([[47, 17], [30, 10], [10, 4], [-12, -2], [-22, -8]], 4, false)), CENTRAL = BS(spline([[-2, -73], [4, -50], [14, -32], [22, -12]], 4, false));
const polyDist = (P, x, y) => { let d = 1e9; for (let i = 1; i < P.length; i++) d = Math.min(d, segDist(x, y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1])); return d; };
const bbOf = (P, m) => { let a = [1e9, 1e9, -1e9, -1e9]; for (const [x, y] of P) a = [Math.min(a[0], x - m), Math.min(a[1], y - m), Math.max(a[2], x + m), Math.max(a[3], y + m)]; return a; };
const SYL_BB = bbOf(SYLVIAN, 2), CEN_BB = bbOf(CENTRAL, 2);
export { BRAIN, BRAIN_BB, CEREB, PATH, PAL, inPoly, polyDist };
export function brainColor(lx, ly, x, y, z, t, st) {
  // volume: lit from the upper front; darker toward the bottom and the back
  const nx = (lx - 0) / 76, ny = (ly + 18) / 58, d = Math.min(1, nx * nx + ny * ny);
  let v = 0.62 + 0.18 * (nx * 0.3 - ny * 0.7) - 0.25 * d * d;
  // catalog-v1: «think» = bright waves rolling across the cortex; «spark» = the whole brain lifts a band
  if (st.think > 0) v += st.think * 0.16 * Math.pow(Math.max(0, Math.sin(0.085 * (lx * 0.8 - ly * 0.6) - t * 5.2)), 6);
  if (st.spark > 0) v += 0.2 * st.spark;
  // sulci: iso-lines of a smooth field, plus the Sylvian fissure and the central sulcus
  const f = sulcusField(lx, ly), sul = Math.abs(f) < 0.16 + 0.04 * Math.sin(lx * 0.5);
  const syl = lx > SYL_BB[0] && lx < SYL_BB[2] && ly > SYL_BB[1] && ly < SYL_BB[3] && polyDist(SYLVIAN, lx, ly) < 1.4, cen = lx > CEN_BB[0] && lx < CEN_BB[2] && ly > CEN_BB[1] && ly < CEN_BB[3] && polyDist(CENTRAL, lx, ly) < 1.1;   // catalog: bbox pre-test (speed)
  let col = band(PAL.brain, v + (Math.abs(f) > 0.5 && Math.abs(f) < 0.8 ? 0.06 : 0), x, y, 0.45);
  if (sul) col = v > 0.55 ? PAL.brain[2] : PAL.sulcus;
  if (syl || cen) col = PAL.sulcus;
  // the face area: outlined (mark) then lit (light) — glows from inside, brightest along the underside
  const fx = lx - FFA.x, fy = ly - FFA.y, cr = Math.cos(FFA.rot), sr = Math.sin(FFA.rot), u = (fx * cr + fy * sr) / FFA.rx, w = (-fx * sr + fy * cr) / FFA.ry, e = u * u + w * w;
  if (e < 1 && (st.light > 0 || st.mark > 0)) {
    const heat = st.light * (1.05 - 0.6 * e) + (st.mark > 0 ? 0.12 * st.mark : 0) + 0.06 * Math.sin(t * 9) * st.light;
    if (heat > 0.05) col = heat > bayer(x, y) * 0.25 + 0.02 ? ramp(PAL.ffa, heat, x, y) : col;
  }
  // brain glow near the lit area
  if (st.light > 0 && e >= 1 && e < 7) { const k = st.light * 0.6 * (1 - (e - 1) / 6); const p = hex(col), q = hex("#F08A3C"); if (k > bayer(x, y)) col = [Math.round(p[0] + (q[0] - p[0]) * 0.45), Math.round(p[1] + (q[1] - p[1]) * 0.45), Math.round(p[2] + (q[2] - p[2]) * 0.45)]; }
  return col;
}


// ---------------------------------------------------------------- catalog-v1: the standalone brain
const OUTL = "#24122E", OUTL_LIT = "#6C4478";
let MB = new Uint8Array(1);
/**
 * Brain at screen (cx, cy) (local origin = cranium centre of the kid; the drawing spans local x −82…80, y −82…66),
 * scale z. st: { light, mark, ring, pulse (−1 none), trail, think, spark, sparkRing, a (presence, for direct tints) }.
 */
export function drawBrain(c, cx, cy, z, t, st) {
  const X0 = Math.floor(cx - 84 * z), X1 = Math.ceil(cx + 82 * z), Y0 = Math.floor(cy - 84 * z), Y1 = Math.ceil(cy + 68 * z), w = X1 - X0 + 1, h = Y1 - Y0 + 1;
  if (MB.length < w * h) MB = new Uint8Array(w * h); const m = MB; m.fill(0, 0, w * h);
  const L = (x) => (x + 0.5 - cx) / z, Ly = (y) => (y + 0.5 - cy) / z;
  // regions: 1 lobes (scanline fill), 2 cerebellum, 3 stem (rounded tip)
  const pts = BRAIN.map(([x, y]) => [cx + x * z, cy + y * z]);
  for (let y = 0; y < h; y++) { const yc = Y0 + y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(X0, Math.round(xs[k])); x < Math.min(X1 + 1, Math.round(xs[k + 1])); x++) m[y * w + (x - X0)] = 1; }
  for (let y = 0; y < h; y++) { const ly = Ly(Y0 + y); if (ly < 18) continue; for (let x = 0; x < w; x++) { const i = y * w + x; if (m[i]) continue; const lx = L(X0 + x);
    if (((lx - CEREB.x) / CEREB.rx) ** 2 + ((ly - CEREB.y) / CEREB.ry) ** 2 <= 1) { m[i] = 2; continue; }
    const sx = lx + 12 + (ly - 40) * 0.12; if (Math.abs(sx) < 6 && ly > 30 && (ly < 60 || Math.hypot(sx, ly - 60) < 6)) m[i] = 3; } }
  const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = m[y * w + x]; if (!k) continue; const sx = X0 + x, sy = Y0 + y;
    if (!at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1)) { c.px(sx, sy, !at(x - 1, y - 1) && (!at(x - 1, y) || !at(x, y - 1)) ? OUTL_LIT : OUTL); continue; }
    const lx = L(sx), ly = Ly(sy); let col;
    if (k === 1) col = brainColor(lx, ly, sx, sy, z, t, st);
    else if (k === 2) { const stripe = Math.sin((ly - CEREB.y) * 1.25 + (lx - CEREB.x) * 0.12) > 0.55; col = ramp(PAL.cereb, 0.55 - 0.3 * (ly - CEREB.y) / CEREB.ry - (stripe ? 0.3 : 0) + 0.15 * (st.spark ?? 0), sx, sy); }
    else col = ramp(PAL.cereb, 0.5 - Math.abs(lx + 12 + (ly - 40) * 0.12) / 8 + 0.15 * (st.spark ?? 0), sx, sy);
    c.px(sx, sy, col);
  }
  // overlays (from drawKidOverlays): the signal route + pulse, the face-area dashes, the ring wave, the halo + rays
  const P = (x, y) => [cx + x * z, cy + y * z], A = st.a ?? 1;
  if (st.pulse >= 0 || st.trail > 0) {
    const n = 120;
    for (let k = 0; k <= n; k++) { const u = k / n; if (u > Math.max(0, st.pulse)) break;
      const age = Math.max(0, st.pulse) - u, a = (st.pulse < 1 ? Math.max(0.25, 1 - age * 2.2) : 0.6) * (st.pulse >= 1 ? st.trail : 1);
      const [px, py] = P(...pathAt(u)), X = R(px), Y = R(py); if (k % 2 === 0 && a > bayer(X, Y)) { const col = age < 0.15 ? "#FFE38E" : "#F7B04A"; c.px(X, Y, col); c.px(X + 1, Y, col); c.px(X, Y + 1, "#C55A1C"); } }
    if (st.pulse >= 0 && st.pulse < 1) { const [px, py] = P(...pathAt(st.pulse)), rr = 3.6 * z;
      for (let y = Math.floor(py - rr * 2); y <= Math.ceil(py + rr * 2); y++) for (let x = Math.floor(px - rr * 2); x <= Math.ceil(px + rr * 2); x++) { const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) / rr; if (d < 1) c.px(x, y, d < 0.5 ? "#FFF6CE" : "#FFE38E"); else if (d < 2) tintPx(c, x, y, "#F7C24E", 0.6 * (2 - d) * A, 3); } }
  }
  if (st.mark > 0) {
    const n = 64, cr = Math.cos(FFA.rot), sr = Math.sin(FFA.rot), grow = 1 + 0.5 * (1 - easeOut(st.mark));
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, ux = Math.cos(a) * (FFA.rx + 4) * grow, uy = Math.sin(a) * (FFA.ry + 4) * grow;
      const [px, py] = P(FFA.x + ux * cr - uy * sr, FFA.y + ux * sr + uy * cr), X = R(px), Y = R(py);
      if (((k + Math.floor(t * 10)) % 4) < 2 && st.mark > bayer(X, Y)) { c.px(X, Y, "#F4CA50"); if (z > 1.4) c.px(X + 1, Y, "#F4CA50"); } }
  }
  const rings = [];
  if (st.ring > 0 && st.ring < 1) rings.push([FFA.x, FFA.y, st.ring, 12, 62, 1.35]);
  if (st.sparkRing > 0 && st.sparkRing < 1) rings.push([-2, -20, st.sparkRing, 40, 70, 1.15]);
  for (const [rx0, ry0, k, r0, dr, sx] of rings) { const [ccx, ccy] = P(rx0, ry0), rr = (r0 + dr * easeOut(k)) * z, aa = Math.pow(1 - k, 1.2), n = Math.ceil(rr * 7);
    for (let q = 0; q < n; q++) { const an = (q / n) * TAU, X = R(ccx + Math.cos(an) * rr * sx), Y = R(ccy + Math.sin(an) * rr); if (aa > bayer(X, Y)) { c.px(X, Y, "#FFE38E"); if (aa > 0.5) c.px(X, Y + 1, "#F7B04A"); } } }
  const halos = [];
  if (st.light > 0.02) halos.push([FFA.x, FFA.y, 46, Math.min(1.2, st.light), 22, 1.4, false]);
  if ((st.spark ?? 0) > 0.02) halos.push([-2, -20, 70, st.spark, 76, 1.12, true]);   // the spark glows outside the silhouette
  for (const [hx, hy, R0, k, rIn, sx, outside] of halos) {
    const [ccx, ccy] = P(hx, hy), rad = R0 * z * k, kk = Math.min(1, k);
    for (let y = Math.floor(ccy - rad); y <= Math.ceil(ccy + rad); y++) for (let x = Math.floor(ccx - rad * sx); x <= Math.ceil(ccx + rad * sx); x++) { const d = Math.hypot((x + 0.5 - ccx) / sx, y + 0.5 - ccy) / rad; if (d < 1 && d > 0.3 && !(outside && at(x - X0, y - Y0))) tintPx(c, x, y, "#F7B04A", 0.38 * kk * (1 - d) * (1 - d) * A, 4); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 6.5);
    for (let q = 0; q < 12; q++) { const a = (q / 12) * TAU + 0.2, r0 = (rIn + 3 * pulse) * z, r1 = r0 + (8 + 10 * kk) * z;
      for (let s = 0; s <= 1; s += 0.1 / Math.max(1, z)) { const r = lerp(r0, r1, s), X = R(ccx + Math.cos(a) * r * sx), Y = R(ccy + Math.sin(a) * r); if (outside && at(X - X0, Y - Y0)) continue; if (kk * (1 - s) * (0.6 + 0.4 * pulse) > bayer(X, Y)) c.px(X, Y, "#FFE38E"); } }
  }
}
