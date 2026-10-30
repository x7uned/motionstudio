// init «sun»: the engine trial drawing (props/sky.mjs#drawSun) wrapped as an item and cleaned for the no-one-frame-change rule
// (corona colour, ray colour and limb colour now cross-fade by dither instead of switching at a threshold).
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, TAU, R, clamp01, lerp, rnd, noise1, band, tintPx } from "../lib/layout.mjs";

const noise2 = (x, y, seed = 0) => { const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), h = (a, b) => rnd(a * 157 + b * 311 + seed * 977);
  return lerp(lerp(h(ix, iy), h(ix + 1, iy), u), lerp(h(ix, iy + 1), h(ix + 1, iy + 1), u), v); };
const SUN = ["#7A2410", "#B8401A", "#E06A1E", "#F49A2E", "#FAC64A", "#FDE58A", "#FFF8D6"];
const SUN_DIM = ["#3A1A14", "#5A2A1C", "#7A3A22", "#9A5030", "#B8683C"];

function drawSun(c, cx, cy, z, t, st) {
  const r = 58 * z, dim = st.dim, fl = st.flare, A = st.a;
  // corona (dithered warm tint), bigger on a flare; orange and yellow layers cross-fade with the flare
  const hr = r * (1.9 + 0.5 * fl);
  for (let y = Math.max(0, Math.floor(cy - hr)); y <= Math.min(GH - 1, Math.ceil(cy + hr)); y++) for (let x = Math.max(0, Math.floor(cx - hr)); x <= Math.min(GW - 1, Math.ceil(cx + hr)); x++) {
    const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d <= 1 || d > hr / r) continue;
    const k = A * (0.55 + 0.4 * fl) * (1 - 0.7 * dim) * Math.pow(clamp01((hr / r - d) / (hr / r - 1)), 1.8);
    tintPx(c, x, y, "#F49A2E", k * (1 - fl), 5); tintPx(c, x, y, "#FDE58A", k * fl, 5);
  }
  // rays: 14 tapered rays rotating, every other one longer; a flare stretches them
  for (let k = 0; k < 14; k++) {
    const a0 = st.spin + (k / 14) * TAU, long = k % 2 === 0, len = r * ((long ? 0.42 : 0.26) + 0.35 * fl) * (1 - 0.6 * dim) * (0.92 + 0.08 * Math.sin(t * 3 + k));
    const w0 = (long ? 0.13 : 0.1) * r;
    for (let s = 0; s <= 1; s += 1 / Math.max(8, len)) { const rr = r * 1.06 + s * len, w = w0 * (1 - s), X0 = cx + Math.cos(a0) * rr, Y0 = cy + Math.sin(a0) * rr;
      for (let q = -w; q <= w; q += 0.7) { const X = R(X0 - Math.sin(a0) * q), Y = R(Y0 + Math.cos(a0) * q), lv = (1 - s) * (1 - Math.abs(q) / (w + 0.5));
        if (0.35 + 0.65 * lv > bayer(X, Y)) c.px(X, Y, dim > bayer(X + 1, Y + 1) ? SUN_DIM[3] : lv > 0.6 ? SUN[5] : lv > 0.3 ? SUN[4] : SUN[3]); } }
  }
  // disc: limb darkening, light from the upper left, slow granulation
  for (let y = Math.floor(cy - r - 1); y <= Math.ceil(cy + r + 1); y++) for (let x = Math.floor(cx - r - 1); x <= Math.ceil(cx + r + 1); x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = Math.hypot(dx, dy); if (d > 1 + 1 / r) continue;
    if (d > 1) { c.px(x, y, dim > bayer(x, y) ? "#2A1210" : "#7A2410"); continue; }
    const nz = Math.sqrt(Math.max(0, 1 - d * d)), gran = 0.09 * (noise2(dx * 6 + t * 0.25, dy * 6 - t * 0.2, 3) + 0.5 * noise2(dx * 13, dy * 13 + t * 0.3, 5) - 0.75);
    const v = 0.35 + 0.55 * nz + 0.12 * (-dx - dy) * 0.5 + gran + 0.25 * fl * nz;
    c.px(x, y, dim > bayer(x + 1, y) ? band(SUN_DIM, v * 0.9, x, y, 0.4) : band(SUN, v, x, y, 0.4));
  }
  // flare: a prominence loop on the upper-right limb
  if (fl > 0.02) {
    const base = -0.75, n = 40;
    for (let i = 0; i <= n; i++) { const u = i / n, ang = base + (u - 0.5) * 0.5, h = Math.sin(Math.PI * u) * r * 0.45 * fl, rr = r + h, X = R(cx + Math.cos(ang) * rr), Y = R(cy + Math.sin(ang) * rr);
      for (let j = 0; j < 3; j++) if (fl > bayer(X + j, Y)) c.px(X + (j % 2), Y + (j >> 1), j ? SUN[4] : SUN[6]); }
  }
  return { box: { x0: cx - r * 1.3, y0: cy - r * 1.3, x1: cx + r * 1.3, y1: cy + r * 1.3 }, pt: [cx, cy] };
}

export default {
  kind: "sun",
  covers: ["sun", "star (sun)", "sunshine", "solar"],
  source: "init wraps engine trial props/sky.mjs#drawSun",
  desc: "round orange sun with rotating rays and a dithered glowing corona; can flare or dim",
  hw: 88, hh: 88, start: "shines, rays turn slowly, surface shimmers",
  states: {
    shine: [0.6, "steady warm shine, rays turn slowly"],
    flare: [0.8, "flares: corona and rays swell, a bright prominence loop leaps off the limb", "glow"],
    dim: [1.0, "fades to a cool dim ember: short rays, dull corona", "dim"],
  },
  base: { flare: 0, dim: 0 },
  st: { shine: { flare: 0, dim: 0 }, flare: { flare: 1, dim: 0 }, dim: { flare: 0, dim: 1 } },
  notes: "wrapped from the trial; light from the upper left on the disc; dim cross-fades by dither",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    return drawSun(c, cx, cy, z, t, { a: s.a, spin: 0.22 * t + 0.6 * s.integ((q) => q.flare), flare: Math.min(1, v.flare + 0.25 * Math.sin(Math.PI * s.acc("flare"))), dim: v.dim });
  },
};
