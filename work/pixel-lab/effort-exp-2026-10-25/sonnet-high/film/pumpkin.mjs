// «Pumpkin face» — the hero: a ribbed pumpkin evaluated per pixel at any scale (so the camera can move without resampling).
// Local units: origin = body centre, 1 unit = 1 grid pixel at scale 1. Four ribs per side, front rib on top; a banded orange
// ramp lit by the moon from the upper right; the carved holes are signed-distance shapes that dissolve open with a Bayer dither.
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, lerp, ease } from "./layout.mjs";

const RIB = [{ cx: 0, rx: 40, ry: 90, cy: 0 }, { cx: 38, rx: 40, ry: 88, cy: 0 }, { cx: 72, rx: 36, ry: 80, cy: 3 }, { cx: 90, rx: 24, ry: 66, cy: 8 }];
const SKIN = ["#2A1024", "#4E1D2A", "#7E2E22", "#B24A1C", "#DB6A24", "#F08A3C", "#F7B55E"];
const OUT = "#1A0816", RIM = "#2A0E10", VOID = "#0E0716";
const GLOW = [VOID, "#5E2216", "#B8461A", "#F08A3C", "#F4B04A", "#F4CA50", "#FFF1B8"];
const bandQ = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(X, Y) ? fl + 1 : fl; };
const L = (() => { const x = 0.55, y = -0.45, z = 0.7, n = Math.hypot(x, y, z); return [x / n, y / n, z / n]; })();

function sdTri(px, py, ax, ay, bx, by, cx, cy) { // iq's triangle distance (negative inside)
  const e0x = bx - ax, e0y = by - ay, e1x = cx - bx, e1y = cy - by, e2x = ax - cx, e2y = ay - cy, v0x = px - ax, v0y = py - ay, v1x = px - bx, v1y = py - by, v2x = px - cx, v2y = py - cy;
  const t0 = clamp01((v0x * e0x + v0y * e0y) / (e0x * e0x + e0y * e0y)), t1 = clamp01((v1x * e1x + v1y * e1y) / (e1x * e1x + e1y * e1y)), t2 = clamp01((v2x * e2x + v2y * e2y) / (e2x * e2x + e2y * e2y));
  const q0x = v0x - e0x * t0, q0y = v0y - e0y * t0, q1x = v1x - e1x * t1, q1y = v1y - e1y * t1, q2x = v2x - e2x * t2, q2y = v2y - e2y * t2;
  const s = Math.sign(e0x * e2y - e0y * e2x) || 1;
  const dx = Math.min(q0x * q0x + q0y * q0y, q1x * q1x + q1y * q1y, q2x * q2x + q2y * q2y);
  const dy = Math.min(s * (v0x * e0y - v0y * e0x), s * (v1x * e1y - v1y * e1x), s * (v2x * e2y - v2y * e2x));
  return -Math.sqrt(dx) * Math.sign(dy);
}

/** Face geometry for a state: eyes (triangles) and the mouth curve. */
export function faceShape(S) {
  const g0 = lerp(0.72, 1, ease(S.holes0)), g1 = lerp(0.72, 1, ease(S.holes1)), wide = 1 + 0.2 * S.decide, tilt = 6 * S.decide;
  const eye = (sg, g, ky) => { const cx = sg * 48, cy = -22, w = 16 * g * wide, h = 15 * g * wide, ap = 17 * g * wide; return [cx - w, cy + h, cx + w, cy + h, cx - sg * tilt, cy + h - (h + ap) * ky]; };
  return { eyeL: eye(-1, g0, 1), eyeR: eye(1, g1, S.wink), mouthP: S.line, sag: 15 * S.decide, thick: 2.6 + 1.1 * S.decide };
}
const MOUTH = { x0: -62, x1: 62, y: 34 };
function sdMouth(u, v, F) {
  const x = Math.max(MOUTH.x0, Math.min(MOUTH.x1, u)), k = (x / 62) ** 2, y = MOUTH.y + F.sag * (1 - k), slope = (-2 * x / 3844) * F.sag * 1, d = Math.abs(v - y) / Math.sqrt(1 + slope * slope);
  const over = Math.abs(u) > 62 ? Math.abs(u) - 62 : 0; return Math.hypot(d, over) - F.thick;
}

/** S: { cx, cy, s, rot, holes0, holes1, line, decide, wink, candle (0..1), flick, spill (extra light 0..1), t } — rot rotates about the base. */
const STEM_TOP = -126;
const stemAt = (u, v) => { if (v > -80 || v < STEM_TOP) return false; const q = (-v - 80) / 46, xc = 2 + 9 * Math.pow(q, 1.7), hw = 8.2 - 2.4 * q; return Math.abs(u - xc) < hw && v > STEM_TOP + 0.35 * (u - xc) + 3; };
export function drawPumpkin(c, S) {
  const { cx, cy, s } = S, F = faceShape(S), rot = S.rot || 0, co = Math.cos(rot), si = Math.sin(rot), pivx = cx, pivy = cy + 91 * s;
  const loc = (px, py) => { const dx = px - pivx, dy = py - pivy; return [(dx * co + dy * si) / s, (-dx * si + dy * co) / s + 91]; };
  const grow = 1 + Math.abs(rot) * 1.4, x0 = Math.floor(cx - 132 * s * grow), x1 = Math.ceil(cx + 132 * s * grow), y0 = Math.floor(cy - 140 * s * grow), y1 = Math.ceil(cy + 100 * s), W = x1 - x0 + 1, H = y1 - y0 + 1;
  const mask = new Int8Array(W * H).fill(-1);
  const inLobe = (u, v, k, sg) => { const r = RIB[k], nx = (u - sg * r.cx) / r.rx, ny = (v - r.cy) / r.ry; return nx * nx + ny * ny <= 1; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const [u, v] = loc(x0 + i + 0.5, y0 + j + 0.5), sg = u < 0 ? -1 : 1;
    let k = -1; for (let q = 0; q < 4; q++) if (inLobe(u, v, q, sg)) { k = q; break; }
    if (k < 0 && stemAt(u, v)) k = 5;
    mask[j * W + i] = k; }
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? -1 : mask[j * W + i]);
  const eyes = [[F.eyeL, S.holes0], [F.eyeR, S.holes1]], flick = S.flick ?? 1, candle = S.candle * flick, spillK = Math.max(candle, 0) * 0.62 + (S.spill ?? 0) * 0.5;
  const lightPts = [[-48, -22, 52], [48, -22, 52], [-34, 34 + F.sag * 0.5, 40], [0, 34 + F.sag, 44], [34, 34 + F.sag * 0.5, 40]];
  const mouthShown = (u, X, Y) => S.line > 0 && (u - MOUTH.x0) / (MOUTH.x1 - MOUTH.x0) < S.line * 1.12 - 0.06 + (bayer(X, Y) - 0.5) * 0.12;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = mask[j * W + i]; if (k < 0) continue; const X = x0 + i, Y = y0 + j, [u, v] = loc(X + 0.5, Y + 0.5), sg = u < 0 ? -1 : 1;
    let col;
    const nb = [at(i + 1, j), at(i, j + 1), at(i - 1, j), at(i, j - 1)];
    if (nb.some((q) => q < 0) || (k < 4 && nb.some((q) => q === 5))) col = OUT;
    else if (k === 5) {
      const q = (-v - 80) / 46, xc = 2 + 9 * Math.pow(q, 1.7), side = (u - xc) / 8, lit = 0.55 - 0.45 * side + 0.1 * q, rib = Math.sin(u * 1.7) > 0.6 ? -0.18 : 0, kk = Math.max(0, lit + rib) * 3.2, b = Math.floor(kk) + (kk - Math.floor(kk) > bayer(X, Y) ? 1 : 0);
      col = ["#162210", "#27401A", "#46691F", "#7F9C3A"][Math.max(0, Math.min(3, b))];
    } else if (nb.some((q) => q >= 0 && q < k)) col = SKIN[1];                        // seam where a front rib begins
    else {
      const r = RIB[k], nx = (u - sg * r.cx) / r.rx, ny = (v - r.cy) / r.ry, nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      let lam = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]) * 0.9 + 0.22 + 0.07 * Math.sin(nx * 9 + ny * 2.5) - 0.12 * Math.abs(nx) ** 3;
      let sp = 0; for (const [lx, ly, R] of lightPts) { const d2 = ((u - lx) ** 2 + (v - ly) ** 2) / (R * R); sp += 1 / (1 + d2 * 4) * 0.5; }
      lam += Math.min(0.55, sp * spillK);
      col = SKIN[Math.max(0, Math.min(6, bandQ(lam * 5.2, X, Y)))];
      { const dd = (u / 15) ** 2 + ((v + 90) / 7) ** 2; if (dd < 1) col = SKIN[Math.max(0, bandQ(lam * 3.2, X, Y))]; }   // the dimple around the stem
    }
    if (k !== 5) {
      let dl = 1e9, hs = 0, mouth = false;
      for (const [e, p] of eyes) { if (p <= 0) continue; const d = sdTri(u, v, e[0], e[1], e[2], e[3], e[4], e[5]) - 3; if (d < dl) { dl = d; hs = p; } }
      if (S.line > 0) { const d = sdMouth(u, v, F); if (d < dl && mouthShown(u, X, Y)) { dl = d; hs = 1; mouth = true; } }
      if (dl < 0.4 / s && hs > bayer(X, Y) && Math.abs(u) < 125) {
        const dp = dl * s;
        if (dp > -1.0) col = RIM;
        else {
          const depth = mouth ? 0.85 : clamp01(-dl / 9), I = candle * (0.62 + 0.5 * depth) * (1.0 - 0.18 * ((v + 22) / 60)), idx = Math.max(0, Math.min(6, bandQ(I * 6.0, X, Y)));
          col = GLOW[idx];
          if (dp > -3.4 && candle > 0.05 && idx > 0 && v < dl + 10) col = GLOW[Math.max(1, idx - 2)];     // the cut's inner wall on the upper edge
        }
      }
    }
    c.px(X, Y, col);
  }
  drawVine(c, S, loc, pivx, pivy, co, si);
}
function drawVine(c, S, loc, pivx, pivy, co, si) {
  const { s } = S, P = (u, v) => { const dx = u * s, dy = (v - 91) * s; return [pivx + dx * co - dy * si, pivy + dx * si + dy * co]; };
  let prev = P(10, -112), n = 44;
  for (let k = 1; k <= n; k++) { const q = k / n, a = q * 5.4 - 0.3, r = 17 * (1 - q * 0.82), pt = P(12 + Math.cos(a) * r + 4, -108 - Math.sin(a) * r * 0.85 + q * 6); c.line(prev[0], prev[1], pt[0], pt[1], q > 0.85 ? "#9ABF48" : k % 6 < 3 ? "#4F7A28" : "#3A5E22"); prev = pt; }
}
