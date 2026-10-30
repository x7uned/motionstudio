// Trial 10 s · sky props: sun (new), moon (from effort-exp-2026-10-25/xhigh/film/world.mjs drawMoon, now any position and
// size), earth (renderer/pixel/earth.mjs v1, imported unchanged: day/night by the subsolar point, city lights at night).
// Each draw(c, cx, cy, z, t, st) works in screen space around the prop's centre; z = camera zoom × prop size.
import { bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe } from "../../../../renderer/pixel/earth.mjs";
import { GW, GH, TAU, R, clamp01, lerp, rnd, noise1, band, tintPx } from "../engine/layout.mjs";

const noise2 = (x, y, seed = 0) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => rnd(a * 157 + b * 311 + seed * 977);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), u), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v); };
const SUN = ["#7A2410", "#B8401A", "#E06A1E", "#F49A2E", "#FAC64A", "#FDE58A", "#FFF8D6"];
const SUN_DIM = ["#3A1A14", "#5A2A1C", "#7A3A22", "#9A5030", "#B8683C"];

// ---------------------------------------------------------------- sun: st { spin (rad), flare 0..1, dim 0..1, a }
export function drawSun(c, cx, cy, z, t, st) {
  const r = 62 * z, dim = st.dim, fl = st.flare;
  // corona (dithered warm tint), bigger on a flare
  const hr = r * (1.9 + 0.5 * fl);
  for (let y = Math.max(0, Math.floor(cy - hr)); y <= Math.min(GH - 1, Math.ceil(cy + hr)); y++) for (let x = Math.max(0, Math.floor(cx - hr)); x <= Math.min(GW - 1, Math.ceil(cx + hr)); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d <= 1 || d > hr / r) continue;
    tintPx(c, x, y, fl > 0.3 ? "#FDE58A" : "#F49A2E", st.a * (0.55 + 0.4 * fl) * (1 - 0.7 * dim) * Math.pow(clamp01((hr / r - d) / (hr / r - 1)), 1.8), 5);
  }
  // rays: 14 tapered rays rotating, every other one longer; a flare stretches them
  for (let k = 0; k < 14; k++) {
    const a0 = st.spin + (k / 14) * TAU, long = k % 2 === 0, len = r * ((long ? 0.42 : 0.26) + 0.35 * fl) * (1 - 0.6 * dim) * (0.92 + 0.08 * Math.sin(t * 3 + k));
    const w0 = (long ? 0.13 : 0.1) * r;
    for (let s = 0; s <= 1; s += 1 / Math.max(8, len)) { const rr = r * 1.06 + s * len, w = w0 * (1 - s), X0 = cx + Math.cos(a0) * rr, Y0 = cy + Math.sin(a0) * rr;
      for (let q = -w; q <= w; q += 0.7) { const X = R(X0 - Math.sin(a0) * q), Y = R(Y0 + Math.cos(a0) * q), lv = (1 - s) * (1 - Math.abs(q) / (w + 0.5));
        if (st.a * (0.35 + 0.65 * lv) > bayer(X, Y)) c.px(X, Y, dim > 0.5 ? SUN_DIM[3] : lv > 0.6 ? SUN[5] : lv > 0.3 ? SUN[4] : SUN[3]); } }
  }
  // disc: limb darkening, light from the upper left, slow granulation
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = Math.hypot(dx, dy); if (d > 1 + 1 / r) continue;
    if (st.a <= bayer(x, y)) continue;
    if (d > 1) { c.px(x, y, dim > 0.5 ? "#2A1210" : "#7A2410"); continue; }
    const nz = Math.sqrt(Math.max(0, 1 - d * d)), gran = 0.09 * (noise2(dx * 6 + t * 0.25, dy * 6 - t * 0.2, 3) + 0.5 * noise2(dx * 13, dy * 13 + t * 0.3, 5) - 0.75);
    let v = 0.35 + 0.55 * nz + 0.12 * (-dx - dy) * 0.5 + gran + 0.25 * fl * nz;
    const col = dim > 0 ? (dim > bayer(x + 1, y) ? band(SUN_DIM, v * 0.9, x, y, 0.4) : band(SUN, v, x, y, 0.4)) : band(SUN, v, x, y, 0.4);
    c.px(x, y, col);
  }
  // flare: a prominence loop on the upper-right limb and one bright ring
  if (fl > 0.02) {
    const base = -0.75, n = 40;
    for (let i = 0; i <= n; i++) { const u = i / n, ang = base + (u - 0.5) * 0.5, h = Math.sin(Math.PI * u) * r * 0.45 * fl, rr = r + h, X = R(cx + Math.cos(ang) * rr), Y = R(cy + Math.sin(ang) * rr);
      for (let j = 0; j < 3; j++) if (st.a * fl > bayer(X + j, Y)) c.px(X + (j % 2), Y + (j >> 1), j ? SUN[4] : SUN[6]); }
  }
  return { cx, cy, box: { x0: cx - r * 1.3, y0: cy - r * 1.3, x1: cx + r * 1.3, y1: cy + r * 1.3 }, pt: [cx, cy] };
}

// ---------------------------------------------------------------- moon: st { bright 0..1, a }
const MOON = ["#7F8DBE", "#9FAED8", "#B9C8F0", "#D6DEF6", "#EEF1FB"];
export function drawMoonProp(c, cx, cy, z, t, st) {
  const r = 58 * z, hr = r * (1.9 + 0.5 * st.bright), breathe = 1 + 0.04 * Math.sin(t * 1.6);
  const craters = [[-0.32, -0.18, 0.2], [0.28, 0.22, 0.16], [0.05, -0.45, 0.11], [-0.12, 0.42, 0.13], [0.46, -0.2, 0.09], [-0.5, 0.18, 0.08]];
  for (let y = Math.max(0, Math.floor(cy - hr)); y <= Math.min(GH - 1, Math.ceil(cy + hr)); y++) for (let x = Math.max(0, Math.floor(cx - hr)); x <= Math.min(GW - 1, Math.ceil(cx + hr)); x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = Math.hypot(dx, dy);
    if (d <= 1) { if (st.a <= bayer(x, y)) continue;
      const nz = Math.sqrt(Math.max(0, 1 - d * d)); let v = 0.55 + 0.35 * (-0.3 * dx - 0.25 * dy + 0.9 * nz) * 0.9 + 0.12 * st.bright;
      for (const [ax, ay, ar] of craters) { const e = Math.hypot(dx - ax, dy - ay) / ar; if (e < 1) v -= 0.22 * (1 - e * e * 0.6); else if (e < 1.18 && dy > ay) v += 0.06; }
      v += 0.05 * (noise1(dx * 9 + 3, 1) + noise1(dy * 11 + 5, 2) - 1);
      c.px(x, y, d > 1 - 1.2 / r ? "#5C5490" : band(MOON, v, x, y, 0.4));
    } else tintPx(c, x, y, "#8C86C8", st.a * (0.5 + 0.35 * st.bright) * breathe * Math.pow(clamp01((hr / r - d) / (hr / r - 1)), 2.2), 5);
  }
  return { cx, cy, box: { x0: cx - r, y0: cy - r, x1: cx + r, y1: cy + r }, pt: [cx, cy] };
}

// ---------------------------------------------------------------- earth: st { lon (deg, integrated spin), night 0..1, a }, sunDir = screen dir to a sun prop or null
export function drawEarth(c, cx, cy, z, t, st, sunDir) {
  const Rr = 82 * z, view = { lat0: 18, lon0: st.lon, R: Rr, cx, cy };
  // subsolar point from a direction in view space: x right, y up, z toward the viewer
  let sx = sunDir ? sunDir[0] : -0.55, sy = sunDir ? -sunDir[1] : 0.35;
  const nl = Math.hypot(sx, sy) || 1; sx /= nl; sy /= nl;
  const zc = lerp(0.75, -0.85, st.night), side = Math.sqrt(Math.max(0, 1 - zc * zc)); const vx = sx * side, vy = sy * side, vz = zc;
  const D = Math.PI / 180, p0 = view.lat0 * D, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
  const sun = { lat: Math.asin(Math.max(-1, Math.min(1, vz * sp0 + vy * cp0))) / D, lon: view.lon0 + Math.atan2(vx, vz * cp0 - vy * sp0) / D };
  drawGlobe(c, view, sun, { alpha: st.a });
  // a thin dark outline so the globe reads on the star field
  for (let q = 0; q < Math.ceil(TAU * Rr * 1.2); q++) { const an = q / (Rr * 1.2), X = R(cx + Math.cos(an) * (Rr + 0.6)), Y = R(cy + Math.sin(an) * (Rr + 0.6)); if (st.a > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), "#0B0812", 0.5)); }
  return { cx, cy, box: { x0: cx - Rr, y0: cy - Rr, x1: cx + Rr, y1: cy + Rr }, pt: [cx, cy] };
}
