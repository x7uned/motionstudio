// catalog-v1 item «airplane-window»: the round-cornered cabin window of the plane-windows film
// (plane-windows/film/levels/plane-window.mjs#drawWindowBack,glass,groove: rubber seal ring, cream bezel with the gap line,
// glass tint with two diagonal streaks and the upper-left glint, pull-down blind with slat lines). The film's film-only
// passengers (sleeper, kid), pressure arrows and cabin parallax layers are not ported; the view outside is a small
// procedural sky (day / night crossfade). plane-kit helpers (sdRR, nRR) were not in the pack, rewritten as plain SDFs.
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const HW = 71, HH = 91, RING = 4, BEZ = 9, RAD = 46;                    // outer extents (ring included), ring, bezel, corner radius
const RG = ["#2E2A3E", "#45405A", "#5E5976", "#7A7592", "#9A96B0", "#C2BFD2"], BZ = ["#8E8272", "#B0A590", "#CBC1AD", "#E2DAC8", "#F2ECDE"];
const DAY = ["#2A66C0", "#3F82D6", "#63A4E8", "#92C6F4", "#C6E4FA"], CLD = ["#A9BCDC", "#D2E0F4", "#F4F8FF"];
const NIT = ["#070A1E", "#0F1332", "#1B1A48", "#31275E", "#4C3774"], NCL = ["#1E2048", "#322E64", "#4E487E"];
const FROST = ["#BCD8EE", "#DCEEFA", "#F6FBFF"];
const sdRR = (u, v, hw, hh, r) => { const qx = Math.abs(u) - (hw - r), qy = Math.abs(v) - (hh - r); return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; };
const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function vnoise(x, y) { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy), a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1); return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy; }
const fbm = (x, y) => 0.6 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 5, y * 2.1) + 0.1 * vnoise(x * 4.3, y * 4.3 + 9);
const pick = (R, v, x, y, w = 0.34) => { const s = clamp01(v) * (R.length - 1), i = Math.floor(s), f = s - i, lo = 0.5 - w / 2, k = f <= lo ? 0 : f >= 1 - lo ? 1 : (f - lo) / w; return R[Math.min(R.length - 1, k > bayer(x, y) ? i + 1 : i)]; };
// u,v in film units from the window centre; night 0..1 handled by the caller through a Bayer gate
function sky(u, v, x, y, t, night) {
  const g = (v + 78) / 156;
  const d = fbm(u * 0.022 + t * 0.045, v * 0.05 + 3) + g * 0.55;
  if (night) {
    if (d > 0.9) return pick(NCL, (d - 0.9) * 3, x, y);
    const mx = u - 26, my = v + 34;
    if (mx * mx + my * my < 81) return mx * 0.6 + my * 0.8 < -2 ? "#FFF6CE" : "#F4E7A8";
    if (mx * mx + my * my < 100) return "#6A5C8C";
    const sx = Math.floor((u + 100) / 7), sy = Math.floor((v + 100) / 7);
    if (hash(sx, sy) > 0.88 && Math.floor(u + 100) % 7 === 3 && Math.floor(v + 100) % 7 === 3) return 0.5 + 0.5 * Math.sin(t * 2.2 + hash(sx + 9, sy) * 6.28) > 0.35 ? "#F2ECFF" : "#8F86C0";
    return pick(NIT, g * 0.95, x, y);
  }
  if (d > 0.88) return pick(CLD, 0.2 + (d - 0.88) * 3.2 - (v - 20) * 0.003, x, y);
  return pick(DAY, 1 - g * 0.9, x, y);
}
export default {
  kind: "airplane-window",
  covers: ["airplane-window"],
  source: "plane-windows/film/levels/plane-window.mjs#drawWindowBack,glass,groove (+ blind)",
  desc: "airliner cabin window with rubber seal and cream bezel; sky outside, day or night, blind, frost, shine",
  hw: 71, hh: 91,
  start: "sky view with slow cloud drift, glass streaks",
  states: {
    day: [0.5, "daylight sky with drifting clouds, open window"],
    night: [0.9, "sky dissolves to a starry night with a moon", "dim"],
    shade: [0.9, "the blind slides down and covers the glass", "fold"],
    frost: [1.0, "frost creeps in from the edges of the glass", "glow"],
    shine: [0.9, "a bright glint sweeps across the glass", "sparkle"],
  },
  base: { night: 0, shade: 0, frost: 0 },
  st: {
    day: { night: 0, shade: 0, frost: 0 },
    night: { night: 1, shade: 0, frost: 0 },
    shade: { shade: 1, frost: 0 },
    frost: { shade: 0, frost: 1 },
    shine: { shade: 0, frost: 0 },
  },
  linear: [],
  demo: {},
  notes: "Seal ring, cream bezel, glass tint, streaks and corner glint follow the film; sky, stars, moon and frost are new, simple procedural fills (the film's cabin interior behind the glass and its passengers are not used). Blind slat spacing and bottom lip follow the film's blind(). Day/night is a Bayer crossfade, blind position eased. Shine reuses the film's streak geometry swept by s.acc.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, night = v.night, shade = v.shade, frost = v.frost;
    const sw = Math.sin(Math.PI * s.acc("shine", 0, 1)), swp = -120 + 240 * s.acc("shine", 0, 1);
    const gl = 78, gh = HH - RING - BEZ, gw = HW - RING - BEZ, yb = -gh - 8 + shade * (2 * gh + 8);
    const x0 = Math.floor(cx - (HW + 2) * z), x1 = Math.ceil(cx + (HW + 2) * z), y0 = Math.floor(cy - (HH + 2) * z), y1 = Math.ceil(cy + (HH + 2) * z);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const u = (x + 0.5 - cx) / z, vv = (y + 0.5 - cy) / z, dd = sdRR(u, vv, HW, HH, RAD);
      if (dd >= 0.5) continue;
      if (dd >= -RING) {                                                     // rubber seal bead, lit from above
        const w = (dd + RING) / RING, nu = u / HW, nv = vv / HH, lit = clamp01(-(nv * 0.8 + nu * 0.4));
        if (dd >= -0.7) { c.px(x, y, "#3A3650"); continue; }
        c.px(x, y, pick(RG, (2.2 + 2.2 * lit - 1.2 * (1 - lit) * 0.5 - (w > 0.85 ? 0.6 : 0) + (w > 0.3 && w < 0.6 ? 0.6 : 0)) / 5, x, y)); continue;
      }
      if (dd >= -RING - BEZ) {                                               // cream bezel, top in shadow
        if (dd >= -RING - 1) { c.px(x, y, "#4A4258"); continue; }
        const nv = vv / HH, nu = u / HW, vq = 2.4 + 1.3 * (-nv) * 0.0 - 1.3 * nv * 0.8 + 0.4 * nu - (dd > -RING - 3 ? 0.5 : 0);
        c.px(x, y, pick(BZ, (dd < -RING - BEZ + 1 ? 0.3 : vq) / 4, x, y)); continue;
      }
      // the glass: sky outside, blind, frost, tint and streaks over it
      let col;
      if (vv < yb - 8 * bayer(x, y)) {                                                         // blind down to yb
        const j = yb - vv;
        col = j < 2 ? "#9A8E7A" : j < 4 ? "#C8BCA6" : (Math.floor(vv) % 6 === 0) ? "#D9CEBA" : dd > -RING - BEZ - 3 ? "#D0C6B2" : "#EEE6D6";
      } else if (vv < yb + 2.5 && shade > 0.02) col = "#6E6456";
      else {
        col = night <= 0 ? sky(u, vv, x, y, t, false) : night >= 1 ? sky(u, vv, x, y, t, true) : (night > bayer(x, y) ? sky(u, vv, x, y, t, true) : sky(u, vv, x, y, t, false));
        if (frost > 0) {
          const f = frost * 0.95 - clamp01(-dd - RING - BEZ) * 0.0 - (-dd - RING - BEZ) / 40 + (fbm(u * 0.09, vv * 0.09) - 0.5) * 0.9;
          if (clamp01(f * 1.4) > bayer(x, y)) col = pick(FROST, 0.2 + f * 1.1 + (hash(Math.floor(u / 2), Math.floor(vv / 2)) - 0.5) * 0.25, x, y, 0.5);
        }
        const wv = u + 0.75 * vv, top = clamp01(1 - (vv + gh) / (gh * 1.1));
        const hl = (wv > -gl - 18 && wv < -gl - 6) ? 0.42 * (0.4 + top) : (wv > -gl && wv < -gl + 3) ? 0.32 * (0.4 + top) : 0;
        if (hl > 0) col = "#" + [1, 3, 5].map((i) => { const a = parseInt(col.slice(i, i + 2), 16); return Math.round(a + (255 - a) * hl).toString(16).padStart(2, "0"); }).join("");
        if (sw > 0.001) { const dw = Math.abs(wv - swp); if (dw < 7) { const k = sw * (1 - dw / 7) * 0.8; col = "#" + [1, 3, 5].map((i) => { const a = parseInt(col.slice(i, i + 2), 16); return Math.round(a + (255 - a) * k).toString(16).padStart(2, "0"); }).join(""); } }
      }
      c.px(x, y, col);
    }
    // crisp glint in the upper-left corner of the glass (film glass())
    const g0x = cx + (-gw + 20) * z, g0y = cy + (-gh + 20) * z;
    if (shade < 0.5) { for (const [dx, dy, w] of [[0, 0, "#FFFFFF"], [1, 0, "#FFFFFF"], [0, 1, "#FFFFFF"], [2, 0, "#E8F4FF"], [0, 2, "#E8F4FF"]]) if ((1 - shade * 2) > bayer(Math.floor(g0x + dx), Math.floor(g0y + dy))) c.px(g0x + dx, g0y + dy, w); }
    return { box: { x0: cx - HW * z, y0: cy - HH * z, x1: cx + HW * z, y1: cy + HH * z }, pt: [cx, cy] };
  },
};
