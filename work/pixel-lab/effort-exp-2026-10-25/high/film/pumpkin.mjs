// The hero: a big carved pumpkin, drawn per pixel from its local shape so it can rock, hop, squash and be lit without
// any one-frame change. Features: two round holes and a straight slit; `smile` bends the slit into a grin (with one
// tooth growing in), `wink` closes the right hole, `lit` lights the candle inside. Diagram outlines (moon blue) trace
// round the holes and along the slit before the brain "decides" it is a face.
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, lerp } from "./util.mjs";

export const RX = 118, RY = 90;
const RAMP = ["#4A1C12", "#7A3018", "#A84822", "#D2662A", "#F08A3C", "#FFAE5C"];
const NIGHT = "#2C2150", OUT = "#160A12";
const STEM = ["#2E3518", "#4A5628", "#6B7A3A"];
const GLOW = ["#5A1C10", "#B03C18", "#E86A28", "#F4A23C", "#F4CA50", "#FFF0A8"];
const BLUE = "#B9C8F0";

/** Local feature geometry. Returns { inHole, dist (≈ px in local units to the nearest hole edge), rimK, which }. */
function features(u, v, P) {
  let best = 1e9, inHole = false, which = -1, rim = 0, depth = 0;
  // eyes: round holes
  for (let i = 0; i < 2; i++) {
    const ex = i ? 40 : -40, ey = -16, rx = 15, ry = 16 * (i ? 1 - 0.9 * P.wink : 1);
    const du = (u - ex) / rx, dv = (v - ey) / ry, e = Math.hypot(du, dv), d = (e - 1) * Math.min(rx, ry * 1.6 + 0.01);
    if (e <= 1) { inHole = true; which = i; rim = dv < -0.55 + 0.25 * (1 - Math.abs(du)) ? 1 : 0; depth = 1 - e; }
    if (d < best) best = d;
  }
  // mouth: a slit that bends into a grin
  { const s = P.smile, hw = 48 + 10 * s, q = 1 - (u / hw) ** 2;
    if (q > 0) {
      const top = 26 + s * 6 * q, bot = top + 7 + s * 15 * q, tooth = s > 0.05 && Math.abs(u - 4) < 6 * Math.min(1, s * 2) && v < top + 9 * s * s;
      const inside = v >= top && v <= bot && !tooth;
      const d = Math.max(top - v, v - bot, Math.abs(u) - hw);
      if (inside) { inHole = true; which = 2; rim = v - top < 2.5 ? 1 : 0; depth = clamp01(Math.min(v - top, bot - v) / 6) * 0.8 + 0.2 * q; }
      if (!tooth && d < best) best = d;
    } else { const d = Math.hypot(Math.abs(u) - hw, Math.max(0, 26 - v, v - 33)); if (d < best) best = d; }
  }
  return { inHole, dist: best, rim, which, depth };
}

/** Distance (local units) from (u, v) to the diagram outline path, with the draw-on progress test. */
function outlineHit(u, v, P) {
  let hit = false;
  for (let i = 0; i < 2; i++) { const pr = i ? P.hi.e2 : P.hi.e1; if (pr <= 0) continue;
    const ex = i ? 40 : -40, ey = -16, r = Math.hypot(u - ex, (v - ey) * 0.94);
    if (Math.abs(r - 20.5) < 1.25) { const ang = (Math.atan2(u - ex, -(v - ey)) / (2 * Math.PI) + 1) % 1; if (ang <= pr) hit = true; } }
  if (P.hi.line > 0) { const hw = 48, x = -hw - 4 + (2 * hw + 8) * P.hi.line;
    if (u <= x && u >= -hw - 4 && (Math.abs(v - 21) < 1.25 || Math.abs(v - 38) < 1.25)) hit = true;
    if (Math.abs(Math.abs(u) - (hw + 4)) < 1.25 && v > 21 && v < 38 && (u < 0 || P.hi.line > 0.98)) hit = true; }
  return hit;
}

/**
 * P: { cx, base, s, rot, sq, lit, flick, smile, wink, hi: { e1, e2, line, a }, glowBoost }
 * cx/base: screen x of the pumpkin's middle and y of its bottom; s: scale; rot: rocking about the base (rad); sq: squash.
 */
export function drawPumpkin(c, P) {
  const s = P.s, cos = Math.cos(P.rot), sin = Math.sin(P.rot), sx = 1 + P.sq, sy = 1 - P.sq;
  const x0 = Math.floor(P.cx - (RX + 14) * s * sx), x1 = Math.ceil(P.cx + (RX + 14) * s * sx), y0 = Math.floor(P.base - (2 * RY + 34) * s * sy), y1 = Math.ceil(P.base + 3);
  const edge = 1.35 / (RY * s), lit = P.lit, fl = P.flick;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - P.cx) / s, dy = (y + 0.5 - P.base) / s;
    const lx = (dx * cos + dy * sin) / sx, ly = (-dx * sin + dy * cos) / sy, u = lx, v = ly + RY;
    // stem (in front of the top dimple)
    if (v < -RY + 8 && v > -RY - 24) { const k = clamp01((-RY + 8 - v) / 32), bend = 9 * k * k, w = lerp(9, 5.5, k), e = Math.abs(u - bend) - w;
      if (e < 0) { const sh = e > -1.3 || v < -RY - 22.5 ? OUT : u - bend < -w * 0.35 ? STEM[2] : u - bend > w * 0.4 ? STEM[0] : STEM[1]; c.px(x, y, mix(sh, NIGHT, 0.25)); continue; } }
    // body: an ellipse with a top dimple and rib bumps on the outline
    const ryE = v < 0 ? RY * (1 - 0.07 * Math.exp(-((u / 26) ** 2))) : RY;
    const cw = Math.sqrt(Math.max(0.04, 1 - (v / RY) ** 2)), a = Math.asin(clamp01(Math.abs(u) / (RX * cw))) * Math.sign(u);
    const d = Math.sqrt((u / (RX * (1 + 0.028 * Math.cos(6.5 * a)))) ** 2 + (v / ryE) ** 2);
    if (d > 1) continue;
    if (d > 1 - edge) { c.px(x, y, OUT); continue; }
    const f = features(u, v, P);
    if (f.inHole) {
      // the inside of the carving: dark until the candle catches, then a flickering glow (yellow at the core)
      const g = clamp01(lit * (0.82 + 0.18 * fl) * (0.55 + 0.6 * f.depth) * (P.glowBoost ?? 1));
      let col;
      if (f.rim) col = lit < 0.02 ? "#10070C" : mix("#10070C", "#FFD07A", clamp01(lit * 1.1));
      else { const q = g * 5 + bayer(x, y) * 0.9 - 0.45, i = Math.max(0, Math.min(5, Math.floor(q + 0.5))); col = g < 0.06 ? "#10070C" : mix("#10070C", GLOW[i], clamp01(g * 4)); }
      c.px(x, y, col); continue;
    }
    // shading: sphere + ribs, moonlight from the upper right, grooves darker
    const nz = Math.sqrt(Math.max(0, 1 - d * d));
    let L = 0.18 + 0.5 * nz + 0.3 * (0.4 * u / RX - 0.65 * v / RY);
    L *= 0.5 + 0.5 * Math.pow(0.5 + 0.5 * Math.cos(6.5 * a), 0.7);
    L += 0.12 * Math.pow(Math.max(0, Math.cos(6.5 * a - 0.9)), 6) * (v < 0 ? 1 : 0.4);   // a thin highlight down each rib
    const q = clamp01(L) * 5 + bayer(x, y) * 0.9 - 0.45, i = Math.max(0, Math.min(5, Math.floor(q + 0.5)));
    let col = mix(RAMP[i], NIGHT, 0.3 * (1 - 0.6 * lit));
    // warm bloom round the carving once lit
    const ds = f.dist;
    if (lit > 0 && ds < 9) { const b = lit * (0.62 + 0.15 * fl) * (1 - ds / 9) ** 1.5 * (P.glowBoost ?? 1); const qq = Math.floor(b * 3 + bayer(x + 1, y) * 0.99) / 3; if (qq > 0) col = mix(col, "#FFB04A", Math.min(0.85, qq)); }
    // a dark lip right at the cut edge
    if (ds < 1.2) col = mix(col, OUT, 0.55);
    c.px(x, y, col);
    // diagram outlines (moon blue) — drawn on top of the skin, dissolving out with hi.a
    if (P.hi.a > 0 && P.hi.a > bayer(x, y) && outlineHit(u, v, P)) c.px(x, y, BLUE);
  }
}

/** Screen position of a local point (u, v centre coords) under the same transform. */
export function toScreen(P, u, v) {
  const lx = u * (1 + P.sq), ly = (v - RY) * (1 - P.sq), cos = Math.cos(P.rot), sin = Math.sin(P.rot);
  return { x: P.cx + (lx * cos - ly * sin) * P.s, y: P.base + (lx * sin + ly * cos) * P.s };
}
