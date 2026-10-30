// ed138 «sky-photo» (new, 2026-10-28): one survey frame of a crowded Milky Way patch, as a square print in a film-strip border
// (sprocket holes top and bottom, the year from s.label on the strip). The star field is fixed by s.seed (same sky in every
// frame); one faint moving dot sits at s.v.dot (0..1 along a short track), so a stack of frames shows the dot shifting.
// States: idle, blink (the frame flashes as it is taken), circle (a pixel reticle closes on the dot), fade (the print dims).
// Stars keep 1–2 px at any size, so the print stays crisp from a small tile to a full close-up. Pure function of its inputs.
import { bayer, MAIN, TINY, mix } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, tintPx } from "../lib/layout.mjs";
import { n3 } from "../lib/space-kit.mjs";

const R = Math.round;
const BG = ["#07060F", "#0C0A1C", "#13102A", "#1C173A", "#28204C", "#35295E", "#453470", "#584484"];
const STRIP = "#1A1622", STRIP2 = "#2A2434", HOLE = "#05040A", EDGE = "#0B0812";
const TINT = ["#FFFFFF", "#DCE8FF", "#FFF0D6", "#C8D6FF", "#FFE0EA", "#E8F0FF"];
export const TRACK = [[0.36, 0.6], [0.62, 0.44]];               // the moving dot's short track in print coordinates
const fieldCache = new Map();
/** deterministic star list for a seed: [u, v, bright, size, tint, phase] in 0..1 print coordinates (band-weighted) */
export function field(seed = 1) {
  if (fieldCache.has(seed)) return fieldCache.get(seed);
  let h = seed * 9973 + 17; const r = () => ((h = (Math.imul(h, 1664525) + 1013904223) >>> 0) / 4294967296), out = [];
  for (let i = 0; out.length < 1500; i++) {
    const u = r(), v = r(), band = Math.exp(-(((u - v * 0.7 - 0.15) / 0.28) ** 2));        // the Milky Way crosses the print diagonally
    if (r() > 0.25 + 0.75 * band) continue;
    const b = Math.pow(r(), 2.6), size = b > 0.82 ? 2 : 1;
    out.push([u, v, 0.25 + 0.75 * b, size, (r() * TINT.length) | 0, r() * 6.28]);
  }
  fieldCache.set(seed, out); return out;
}
/** Print-space → screen helper for a frame drawn at (cx, cy) with half size hw*z. */
export const toScreen = (cx, cy, z, u, v, hw = 60) => [cx - hw * z + u * 2 * hw * z, cy - hw * z + v * 2 * hw * z];
export const dotAt = (k) => [TRACK[0][0] + (TRACK[1][0] - TRACK[0][0]) * k, TRACK[0][1] + (TRACK[1][1] - TRACK[0][1]) * k];

/**
 * o: { a, dot (0..1 position), dotB (dot brightness 0..1), ring (0..1), dim (0..1), flash (0..1), label, seed, stars (0..1
 * star visibility, for the blink comparison), crowd (0..1 extra faint stars), border (0..1 strip visibility) }
 */
export function drawPhoto(c, cx, cy, z, t, o) {
  const hw = R(60 * z), x0 = R(cx - hw), y0 = R(cy - hw), S = 2 * hw, bw = Math.max(o.label ? 5 * (o.labelScale ?? 1) + 5 : 3, R(9 * z)), dim = o.dim ?? 0, fl = o.flash ?? 0, A = o.a ?? 1;
  const border = o.border ?? 1;
  // film strip (frame) with sprocket holes
  if (border > 0) {
    const gate = (base, k) => { if (k >= 1) return base; const v = Object.create(base); v.px = (x, y, col) => { if (k > bayer(x, y)) base.px(x, y, col); }; return v; }, g = gate(c, border);
    for (let y = y0 - bw; y < y0 + S + bw; y++) for (let x = x0 - 2; x < x0 + S + 2; x++) {
      const inside = x >= x0 && x < x0 + S && y >= y0 && y < y0 + S; if (inside) continue;
      const edge = x === x0 - 2 || x === x0 + S + 1 || y === y0 - bw || y === y0 + S + bw - 1;
      g.px(x, y, edge ? EDGE : y < y0 - bw + 2 ? STRIP2 : STRIP);
    }
    const hs = Math.max(2, R(4 * z)), step = Math.max(6, R(14 * z));
    for (let x = x0 + R(step / 2); x < x0 + S - hs; x += step) for (const yy of [y0 - bw + R((bw - hs) / 2), y0 + S + R((bw - hs) / 2)]) for (let j = 0; j < hs; j++) for (let i = 0; i < hs; i++) g.px(x + i, yy + j, HOLE);
    const la = o.labelA ?? 1;
    if (o.label && la > 0) {
      const sc = o.labelScale ?? (z > 1.6 ? 2 : 1), tw = c.measure(TINY, o.label, { scale: sc }), ty = y0 + S + R((bw - 5 * sc) / 2), gl = gate(g, la);
      const lx = x0 + S - tw - R(6 * z); for (let j = -1; j < 5 * sc + 1; j++) for (let i = -2; i < tw + 2; i++) gl.px(lx + i, ty + j, STRIP); gl.text(TINY, o.label, lx, ty, mix("#F4CA50", STRIP, dim * 0.6), { scale: sc });
    }
  }
  // the print: crowded sky glow (band of the Milky Way, dust lane), dimmed by o.dim, flash brightens
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, X = x0 + i, Y = y0 + j;
    const band = Math.exp(-(((u - v * 0.7 - 0.15) / 0.3) ** 2)), dust = n3(u * 6 + 3, v * 6, 2, 4) * 0.7 + n3(u * 15, v * 15, 5, 6) * 0.3;
    let lv = 0.16 + 0.8 * band * (0.75 + 0.5 * n3(u * 4, v * 4, 11, 3)) - (dust > 0.6 ? 0.22 * band : 0) + 0.1 * (n3(u * 3, v * 3, 7, 2) - 0.5);
    lv = lv * (1 - 0.55 * dim) + 0.35 * fl;
    const s = clamp01(lv) * (BG.length - 1), k = Math.floor(s), f = s - k;
    c.px(X, Y, BG[Math.min(BG.length - 1, f > bayer(X, Y) ? k + 1 : k)]);
  }
  // stars
  const sv = (o.stars ?? 1) * (1 - 0.6 * dim), list = field(o.seed ?? 1), crowd = o.crowd ?? 0;
  for (let q = 0; q < list.length; q++) {
    const [u, v, b, size, ti] = list[q], faint = b < 0.4;
    if (faint && q % 3 && crowd < 1 && (q % 7) / 7 >= crowd + 0.35) continue;
    const X = x0 + R(u * (S - 1)), Y = y0 + R(v * (S - 1)), lv = Math.round(clamp01(b * sv) * 5) / 5; if (lv <= 0) continue;
    const col = mix("#0A0918", TINT[ti], lv);
    c.px(X, Y, col);
    if (size === 2 && z > 0.9) { const e = mix("#0A0918", TINT[ti], lv * 0.5); c.px(X - 1, Y, e); c.px(X + 1, Y, e); c.px(X, Y - 1, e); c.px(X, Y + 1, e); if (z > 2.2 && lv > 0.6) c.px(X + 1, Y + 1, col); }
  }
  // the moving dot: faint, a cold blue-white; dotB lifts it
  const [du, dv] = dotAt(o.dot ?? 0), DX = x0 + R(du * (S - 1)), DY = y0 + R(dv * (S - 1)), db = clamp01(o.dotB ?? 0.45);
  if (db > 0) { const col = mix("#0A0918", "#BFE0FF", Math.round(db * 6) / 6); c.px(DX, DY, col); if (z > 1.1) { c.px(DX + 1, DY, mix("#0A0918", "#BFE0FF", Math.round(db * 3) / 6)); c.px(DX, DY + 1, mix("#0A0918", "#BFE0FF", Math.round(db * 3) / 6)); }
    if (db > 0.7 && z > 1.1) for (const [i, j] of [[-1, 0], [0, -1], [2, 0], [0, 2], [1, 1]]) tintPx(c, DX + i, DY + j, "#BFE0FF", A * (db - 0.6), 4); }
  // reticle ring: closes from wide to tight, four ticks
  const ring = o.ring ?? 0;
  if (ring > 0.01) {
    const rr = Math.max(4, (5 + 26 * (1 - ring)) * Math.max(0.7, z * 0.75)), col = "#F4CA50", n = Math.ceil(rr * 6.3);
    for (let q = 0; q < n; q++) { const an = (q / n) * Math.PI * 2, X = R(DX + Math.cos(an) * rr), Y = R(DY + Math.sin(an) * rr); if (Math.min(1, ring * 1.6) > bayer(X, Y) && (q % 8 < 6)) c.px(X, Y, col); }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 0; k < R(4 * Math.max(1, z * 0.6)); k++) { const X = R(DX + dx * (rr + 2 + k)), Y = R(DY + dy * (rr + 2 + k)); if (ring > bayer(X, Y)) c.px(X, Y, col); }
  }
  return { box: { x0: x0 - 2, y0: y0 - bw, x1: x0 + S + 2, y1: y0 + S + bw }, pt: [DX, DY], dot: [DX, DY] };
}

export default {
  kind: "sky-photo",
  covers: ["sky photo", "telescope image", "survey image", "astronomy photo", "star field photo", "film frame"],
  source: "ed138 (new)",
  desc: "a square telescope photo of a crowded starry sky in a film-strip frame with a year; one faint dot",
  hw: 62, hh: 70, start: "stars twinkle faintly; the faint dot sits still",
  states: {
    idle: [0.4, "a print of a starry sky, one faint dot"],
    blink: [0.35, "the frame flashes as the picture is taken", "tick"],
    circle: [0.6, "a yellow reticle closes in on the faint dot", "lock"],
    move: [0.8, "the faint dot slides along its short track", "swish"],
    fade: [0.6, "the print dims", "dim"],
  },
  base: { dot: 0, ring: 0, dim: 0 },
  st: { idle: { ring: 0, dim: 0 }, circle: { ring: 1 }, move: { dot: 1 }, fade: { dim: 1, ring: 0 }, blink: {} },
  linear: ["dot"],
  text: true,
  notes: "s.label = the year on the strip; s.seed picks the star field",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, fl = Math.sin(Math.PI * s.acc("blink"));
    return drawPhoto(c, cx, cy, z, t, { a: s.a, dot: v.dot, ring: v.ring, dim: v.dim, flash: fl * 0.8, label: s.label, seed: s.seed ?? 1, dotB: 0.5 + 0.1 * Math.sin(t * 2) });
  },
};
