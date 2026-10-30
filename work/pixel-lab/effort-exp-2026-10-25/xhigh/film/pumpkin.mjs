// «Pumpkin face» — the hero: a ribbed pumpkin on the hay bale, front view. Two round holes and a straight slit are cut on
// the words; the candle light inside shows through them (bright back wall, lit flesh on the lower rim, shadowed upper rim).
// It can blink / wink (a skin "lid" slides over a hole) and its slit can bend into a smile. Volume is shaded per pixel from
// a lobed normal (7 ribs) in flat tone bands with narrow dithered seams, a thin moon rim on the upper left and a dark 1-px
// outline elsewhere. Re-rasterised per frame at the camera's zoom, so it stays crisp from the close-up to the wide shot.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, lerp, rnd, layer, band, tintPx } from "./layout.mjs";
import { PUMPKIN_BASE } from "./world.mjs";

export const A = 88, BH = 67;                // half width, half height (world units)
export const FACE = { eyeX: 32, eyeY: -15, eyeR: 14.5, mouthY: 25, mouthHW: 42, mouthTh: 7.5 };   // centre-relative
const SKIN = ["#1C0905", "#3E170A", "#6A280E", "#9A3C14", "#C9561C", "#E8762C", "#F49A4E"];
const STEM = ["#161A0A", "#2A3314", "#424E1E", "#5E6A2C", "#7E8840"];
const IN = { core: "#FFF6CE", hot: "#FFE38E", mid: "#F7C24E", warm: "#F08A3C", deep: "#C55A1C", flesh: "#FBE3A6", fleshD: "#E2A55A", cutD: "#3A1206" };
const OUTLINE = "#140604", RIM = "#EDB89C", RIM_IN = "#D9895C", RING = "#5A1E0A";

/** Pumpkin body test in body-local units (origin at body centre, y down). */
function inBody(u, v) {
  const x = u / A, y = v / BH, yy = y < 0 ? y / (1 - 0.12 * Math.exp(-((x / 0.2) ** 2))) : y / 0.96;
  const s = clamp01(Math.abs(x) / Math.sqrt(Math.max(1e-6, 1 - Math.min(0.999, yy * yy))));
  const rip = 0.02 * Math.cos(Math.asin(Math.min(1, s)) * 7);
  return x * x + yy * yy <= 1 + rip;
}

/**
 * st: { dy, sx, sy, open1, open2, cut, lidL, lidR, smile, glow }
 *  open1/open2 ∈ [0, 1.1] hole radius factor; cut ∈ [0,1] slit progress; lid ∈ [0,1]; smile ∈ [0,1]; glow ≥ 0.
 * Returns screen anchors { eyeL, eyeR, mouth, face, top, z, toS }.
 */
export function drawPumpkin(c, cam, t, st) {
  const L = layer(cam, 1), z = L.z, bx = L.X(PUMPKIN_BASE.x), by = L.Y(PUMPKIN_BASE.y + st.dy);
  const sx = st.sx * z, sy = st.sy * z;
  const toS = (u, v) => [bx + u * sx, by + (v - BH) * sy];                         // body-local (centre-relative) → screen
  const half = (A + 4) * sx, top = by - (2 * BH + 34) * sy;
  const x0 = Math.max(0, Math.floor(bx - half)), x1 = Math.min(c.w - 1, Math.ceil(bx + half)), y0 = Math.max(0, Math.floor(top)), y1 = Math.min(c.h - 1, Math.ceil(by + 1));
  const g = st.glow, F = FACE;

  // contact shadow on the hay
  { const k = clamp01(1 - (-st.dy) / 60), w = (A * 0.92) * z * st.sx * (0.6 + 0.4 * k), cy = L.Y(PUMPKIN_BASE.y) - 1;
    for (let y = Math.floor(cy - 5 * z); y <= Math.ceil(cy + 5 * z); y++) for (let x = Math.floor(bx - w); x <= Math.ceil(bx + w); x++) {
      const dx = (x - bx) / w, dy = (y - cy) / (5 * z); const d = dx * dx + dy * dy; if (d < 1) tintPx(c, x, y, "#120804", 0.75 * k * (1 - d * 0.5), 3); } }

  const eyeHole = (u, v, cx, open, lid) => {
    if (open <= 0.02) return null;
    const r = F.eyeR * open, dx = u - cx, dy = v - F.eyeY, d = Math.hypot(dx, dy);
    if (d > r + 1.4 / sx) return null;
    if (d > r) return { ring: true };
    const lidEdge = (F.eyeY - r) + lid * 2 * r;          // lid slides down from the top
    if (lid > 0.001 && v < lidEdge) return { lid: true, edge: lidEdge - v < 1.3 / sy };
    return { e: d / r, dy: dy / r, dx: dx / r, r };
  };
  const mouthCenterY = (u) => F.mouthY + st.smile * (5 * (1 - (u / F.mouthHW) ** 2) - 3.6);
  const mouthHole = (u, v) => {
    if (st.cut <= 0) return null;
    const hw = F.mouthHW, tip = -hw + 2 * hw * st.cut; if (u < -hw - 4 || u > Math.min(hw + 4, tip + 1)) return null;
    const cy = mouthCenterY(u), openK = 0.28 + 0.72 * clamp01((tip - u) / 16);
    const th = (F.mouthTh + st.smile * 4 * (1 - (u / hw) ** 2)) * openK, ends = Math.max(0, Math.abs(u) - (hw - th / 2));
    const dv = v - cy, dd = Math.hypot(ends, dv);
    if (dd > th / 2 + 1.3 / sy) return null;
    if (dd > th / 2) return { ring: true };
    return { e: dd / (th / 2), dy: dv / (th / 2), dx: u / hw, r: th / 2 };
  };

  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = (x + 0.5 - bx) / sx, bodyV = (y + 0.5 - by) / sy + BH;   // body-local: centre at 0, −BH top … +BH base
    // stem: rises from the top dimple and bends to the right
    if (bodyV < -BH * 0.82) {
      const h = -BH * 0.86 - bodyV;
      if (h > -3 && h < 29) { const k = clamp01(h / 29), cxs = 2 + 10 * k * k, w = lerp(8.5, 5, k) + (k > 0.93 ? 1.3 : 0);
        if (Math.abs(u - cxs) < w) { const s = (u - cxs) / w, ridge = Math.cos(s * 5.2) * 0.12, vS = 0.55 - s * 0.4 + ridge - (h < 2.5 ? 0.18 : 0) + (k > 0.92 ? 0.15 : 0);
          c.px(x, y, Math.abs(s) > 0.84 ? (s > 0 ? STEM[0] : STEM[3]) : band(STEM, vS, x, y)); continue; } }
    }
    if (!inBody(u, bodyV)) continue;
    const hL = eyeHole(u, bodyV, -F.eyeX, st.open1, st.lidL), hR = eyeHole(u, bodyV, F.eyeX, st.open2, st.lidR), hM = mouthHole(u, bodyV);
    const hole = (hL && hL.e !== undefined ? hL : null) || (hR && hR.e !== undefined ? hR : null) || (hM && hM.e !== undefined ? hM : null);
    if (hole) { c.px(x, y, holeColor(hole, g, x, y)); continue; }
    const lidEdge = (hL && hL.lid && hL.edge) || (hR && hR.lid && hR.edge);
    const ring = (hL && hL.ring) || (hR && hR.ring) || (hM && hM.ring);
    // skin shading: lobed normal
    const X = u / A, Y = bodyV / BH, yy = Math.max(-0.999, Math.min(0.999, Y)), w = Math.sqrt(1 - yy * yy), s = Math.max(-1, Math.min(1, X / Math.max(0.05, w)));
    const th = Math.asin(s), q = (th + Math.PI / 2) / Math.PI * 7, l = q - Math.floor(q), phi = (l - 0.5) * 1.2;
    const nx = Math.sin(th + phi) * w, ny = yy, nz = Math.cos(th + phi) * w;
    const key = Math.max(0, -0.48 * nx - 0.5 * ny + 0.72 * nz), crease = Math.exp(-((Math.min(l, 1 - l) / 0.07) ** 2));
    let val = 0.14 + 0.66 * key - 0.32 * crease - 0.14 * Math.max(0, Y) + 0.04 * Math.max(0, -Y);
    const hi = Math.max(0, 1 - Math.abs(l - 0.34) / 0.1) * Math.max(0, 0.2 - Y) * Math.max(0, 0.25 - nx);   // a soft highlight band per rib
    val += hi * 0.28;
    let col = band(SKIN, val, x, y);
    const edge = !inBody(u - 1 / sx, bodyV) || !inBody(u + 1 / sx, bodyV) || !inBody(u, bodyV - 1 / sy) || !inBody(u, bodyV + 1 / sy);
    if (edge) col = nx < -0.15 && ny < 0.3 ? RIM : OUTLINE;
    else { const edge2 = !inBody(u - 2 / sx, bodyV) || !inBody(u, bodyV - 2 / sy); if (edge2 && nx < -0.2 && ny < 0.15) col = RIM_IN; }
    if (lidEdge) col = OUTLINE; else if (ring && !edge) col = RING;
    c.px(x, y, col);
  }
  // bloom around the open holes (a camera glow, not physics)
  const bloom = (cx, cy, r, k) => { if (k <= 0.01) return; const rr = r * 2.2 + 4; for (let y = Math.floor(cy - rr); y <= Math.ceil(cy + rr); y++) for (let x = Math.floor(cx - rr); x <= Math.ceil(cx + rr); x++) { const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy); if (d < rr && d > r + 1.5) tintPx(c, x, y, "#F7B04A", k * 0.3 * Math.pow(1 - (d - r) / (rr - r), 1.7), 4); } };
  const [eLx, eLy] = toS(-F.eyeX, F.eyeY), [eRx, eRy] = toS(F.eyeX, F.eyeY), [mx, my] = toS(0, F.mouthY);
  bloom(eLx, eLy, F.eyeR * st.open1 * sx, g * Math.min(1, st.open1) * (1 - st.lidL));
  bloom(eRx, eRy, F.eyeR * st.open2 * sx, g * Math.min(1, st.open2) * (1 - st.lidR));
  if (st.cut > 0) for (let k = 0; k <= 8; k++) { const u = -F.mouthHW + (2 * F.mouthHW * Math.min(st.cut, 1) * k) / 8, [qx, qy] = toS(u, mouthCenterY(u)); bloom(qx, qy, F.mouthTh * 0.5 * sx, g * 0.45); }
  const [tx, ty] = toS(0, -BH);
  return { eyeL: [eLx, eLy], eyeR: [eRx, eRy], mouth: [mx, my], face: [(eLx + eRx) / 2, (eLy + my) / 2], top: [tx, ty], z, sx, sy, toS };
}

function holeColor(h, g, x, y) {
  // looking into the lit pumpkin: the candle below lights the cut wall along the TOP of each opening (cream flesh), the back
  // wall glows, and a thin shadow line runs along the bottom edge — so an opening reads as a carved hole, not an eyelid
  const e = h.e, dy = h.dy;
  if (e > 0.62 && dy < -0.3) return e > 0.86 ? IN.fleshD : IN.flesh;
  if (e > 0.84 && dy > 0.35) return IN.cutD;
  const heat = clamp01(g) * (1.02 - 0.55 * e * e) + (g > 1 ? (g - 1) * 0.7 : 0) - 0.12 * Math.max(0, dy);
  return band([IN.deep, IN.warm, IN.mid, IN.hot, IN.core], heat, x, y, 0.5);
}

/** Bursts when a hole opens: short light rays and flying flesh chips (screen space at the hole centre). */
export function drawBurst(c, cx, cy, k, z, seed) {
  if (k <= 0 || k >= 1) return;
  const fadeA = 1 - k;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3 + seed, r0 = (13 + 14 * k) * z, r1 = r0 + (6 + 10 * (1 - k)) * z;
    for (let s = 0; s <= 1; s += 0.08) { const r = lerp(r0, r1, s), X = R(cx + Math.cos(a) * r), Y = R(cy + Math.sin(a) * r); if (fadeA * (1 - s * 0.5) > bayer(X, Y)) c.px(X, Y, s < 0.5 ? "#FFE38E" : "#F7C24E"); } }
  for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (rnd(i * 3 + seed * 10) - 0.5) * 2.6, sp = (30 + 30 * rnd(i * 5 + seed * 7)) * z, X = R(cx + Math.cos(a) * sp * k), Y = R(cy + Math.sin(a) * sp * k + 60 * z * k * k);
    if (fadeA > bayer(X, Y) * 0.9) { c.px(X, Y, "#F2B24E"); c.px(X + 1, Y, "#C9671E"); if (z > 1.5) { c.px(X, Y + 1, "#C9671E"); c.px(X + 1, Y + 1, "#8A3A12"); } } }
}

/** Sparks at the cutting tip of the slit. */
export function drawSparks(c, x, y, t, z, k) {
  if (k <= 0) return;
  for (let i = 0; i < 8; i++) { const ph = (t * 6 + rnd(i * 11)) % 1, a = -Math.PI * (0.15 + 0.7 * rnd(i * 7 + Math.floor(t * 6 + rnd(i * 11)))), r = ph * (10 + 8 * rnd(i)) * z;
    const X = R(x + Math.cos(a) * r), Y = R(y + Math.sin(a) * r + 14 * z * ph * ph); if ((1 - ph) * k > bayer(X, Y)) c.px(X, Y, ph < 0.4 ? "#FFF6CE" : "#F7C24E"); }
}
