// Builder PLANE · the sky above the fuselage (clean gradient + high cirrus wisps) and the sea of clouds below it
// (three parallax layers of sunlit cumulus tops, scrolling LEFT because the plane flies right at cruise).
// All layers are baked once into periodic strips; a frame only copies rows with an offset.
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { view, drawSky } from "../world.mjs";
import { R, clamp01, rnd, bayer, mix, hex, band } from "./plane-kit.mjs";

const GW = 540, GH = 960;

// ---------------------------------------------------------------- clean sky rows (the harness sky without its drifting clouds)
// drawSky's day clouds drift RIGHT (≈17 px/s), against our flight direction; above the fuselage we repaint the plain
// gradient. The gradient is sampled from the harness itself (cloud pixels skipped), so it follows world.mjs.
const SKY_ROWS = 300, SKY = new Uint8ClampedArray(SKY_ROWS * 4 * 3);
{
  const c = new Canvas(GW, GH, "#000000"); drawSky(c, view(0, 0, { t: 0 }), 0);
  const c2 = new Canvas(GW, GH, "#000000"); drawSky(c2, view(0, 0, { t: 0 }), 23.7);
  const cloudy = (p) => (p[0] > 200 && p[1] > 220 && p[2] > 240);
  for (let y = 0; y < SKY_ROWS; y++) for (let ph = 0; ph < 4; ph++) {
    let got = null;
    for (const cc of [c, c2]) { for (let x = ph; x < GW && !got; x += 4) { const p = cc.get(x, y); if (!cloudy(p)) got = p; } if (got) break; }
    got ??= c.get(ph, y); SKY.set(got, (y * 4 + ph) * 3);
  }
}
export function drawCleanSky(c, rows) {
  const d = c.d, n = Math.min(rows, SKY_ROWS);
  for (let y = 0; y < n; y++) for (let x = 0; x < GW; x++) { const s = (y * 4 + (x & 3)) * 3, i = (y * GW + x) * 3; d[i] = SKY[s]; d[i + 1] = SKY[s + 1]; d[i + 2] = SKY[s + 2]; }
}

// ---------------------------------------------------------------- high cirrus wisps (screen y 96 … 214), slow drift left
const WP = 1080, WY0 = 92, WH = 128, WISP = new Float32Array(WP * WH);
{
  const streaks = [];
  for (let i = 0; i < 9; i++) streaks.push({ x: (i + rnd(i * 7 + 1) * 0.6) * (WP / 9), y: 14 + rnd(i * 5 + 2) * (WH - 30), L: 90 + rnd(i * 3 + 4) * 170, th: 2.2 + rnd(i * 9 + 3) * 3.2, a: 0.45 + rnd(i * 11) * 0.4, sl: (rnd(i * 13) - 0.5) * 0.08 });
  for (const s of streaks) for (let dx = -s.L / 2 - 4; dx <= s.L / 2 + 4; dx++) {
    const u = dx / (s.L / 2), taper = clamp01(1 - Math.pow(Math.abs(u), 2.2)); if (taper <= 0) continue;
    const yc = s.y + dx * s.sl + Math.sin(dx * 0.045 + s.x) * 2.2, th = s.th * (0.4 + 0.6 * taper);
    for (let dy = -6; dy <= 6; dy++) {
      const v = Math.abs(dy - (yc - Math.floor(yc))) / th, a = s.a * taper * clamp01(1 - v * v);
      if (a <= 0) continue; const X = ((Math.round(s.x + dx) % WP) + WP) % WP, Y = Math.floor(yc) + dy; if (Y < 0 || Y >= WH) continue;
      WISP[Y * WP + X] = Math.max(WISP[Y * WP + X], a);
    }
  }
}
const W1 = hex("#FFFFFF"), W2 = hex("#D9E9FB");
export function drawWisps(c, V, t, rows) {
  const off = R(t * 5 + V.cx * 0.06), d = c.d;
  for (let j = 0; j < WH; j++) { const y = WY0 + j; if (y >= rows) break;
    for (let x = 0; x < GW; x++) { const a = WISP[j * WP + ((((x + off) % WP) + WP) % WP)]; if (a <= 0.02 || a <= bayer(x, y) * 0.9) continue; const col = a > 0.55 ? W1 : W2, i = (y * GW + x) * 3; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
  }
}

// ---------------------------------------------------------------- the sea of clouds
// Ten rows of cumulus tops from the hazy horizon (small, slow) to the foreground (big, fast): continuous parallax.
// Each row is baked once into a periodic strip. A bump is an egg (round dome, long skirt) drawn in painter's order;
// its tones come from offset copies of its own shape (classic pixel-art crescents): a white sunlit crescent on the
// upper right with a thin warm rim, a lavender shade crescent on the lower left, a 1-px crease where it overlaps the
// bump behind, and the skirt fading into one deep tone (so skirts merge without seams) until the next row covers it.
const HAZE = "#C6DCF3";
const T_RIM = "#FFF3DA", T_LIT = "#FFFFFF", T_BODY = "#EDF0FA", T_SH1 = "#D4DAF0", T_SH2 = "#BCC4E5", T_LINE = "#C8CFEA";
const NROWS = 10, ROWS_C = [];
for (let ri = 0; ri < NROWS; ri++) {
  const k = ri / (NROWS - 1), rx = 15 + 58 * k * k + 16 * k, ry = rx * (0.5 + 0.1 * k), top = R(668 + 240 * Math.pow(k, 1.2)), speed = 7 + 62 * k * k + 8 * k;
  const P = 1080, last = ri === NROWS - 1, M0 = R(ry * 0.9), h = (last ? 980 - top + R(ry) : R(ry * 5.2 + 10)) + M0, haze = 0.6 * Math.pow(1 - k, 1.5);
  const n = Math.max(3, Math.round(P / (rx * 1.15))), bumps = [];
  for (let b = 0; b < n; b++) { const s = ri * 1000 + b * 7 + 3; bumps.push({ cx: (b + 0.5 + (rnd(s) - 0.5) * 0.6) * (P / n), Rx: rx * (0.75 + rnd(s * 3) * 0.5), Ry: ry * (0.75 + rnd(s * 5) * 0.5), cy: M0 + R(ry * 1.2 + (rnd(s * 11) - 0.5) * ry * 0.8) }); }
  bumps.sort((a, b) => a.cy - b.cy);
  // cauliflower: smaller puffs riding on the shoulders of the big ones (drawn right after their parent)
  const all = [];
  bumps.forEach((bp, b) => { all.push(bp); const s = ri * 977 + b * 13; for (let q = 0; q < 2; q++) if (rnd(s + q * 5) < 0.75) { const f = 0.38 + rnd(s + q * 9) * 0.2, side = q === 0 ? -1 : 1; all.push({ cx: bp.cx + side * bp.Rx * (0.3 + rnd(s + q * 3) * 0.25), Rx: bp.Rx * f, Ry: bp.Ry * f * 1.15, cy: R(bp.cy - bp.Ry * (0.55 + rnd(s + q * 7) * 0.2)), child: true }); } });
  bumps.length = 0; bumps.push(...all);
  const col = new Uint8ClampedArray(P * h * 3), m = new Uint8Array(P * h);
  const inEgg = (dx, dy, bp, ox = 0, oy = 0) => { const nx = (dx - ox) / bp.Rx, ny = (dy - oy) / (dy - oy < 0 ? bp.Ry : bp.Ry * (bp.child ? 1.2 : 2.4)); return nx * nx + ny * ny <= 1; };
  for (const bp of bumps) {
    const yA = Math.max(0, Math.floor(bp.cy - bp.Ry)), yB = last && !bp.child ? h : Math.min(h, Math.ceil(bp.cy + bp.Ry * (bp.child ? 1.2 : 2.4)));
    for (let y = yA; y < yB; y++) for (let dx = -Math.ceil(bp.Rx); dx <= Math.ceil(bp.Rx); dx++) {
      const dy = y + 0.5 - bp.cy;
      const inside = inEgg(dx, dy, bp) || (last && !bp.child && dy > 0 && Math.abs(dx) <= bp.Rx * 0.9);
      if (!inside) continue;
      const X = (((Math.round(bp.cx) + dx) % P) + P) % P, i = y * P + X, Y = y + top - M0, behind = m[i];
      let c0;
      const edge = !inEgg(dx - 1, dy, bp) || !inEgg(dx + 1, dy, bp) || !inEgg(dx, dy - 1, bp);
      if (dy > bp.Ry * 0.55) c0 = bp.child ? T_BODY : dy > bp.Ry * 0.95 ? T_SH2 : (dy - bp.Ry * 0.55) / (bp.Ry * 0.4) > bayer(X, Y) ? T_SH2 : T_SH1;
      else if (!inEgg(dx, dy, bp, -bp.Rx * 0.1, bp.Ry * 0.16) && inEgg(dx, dy, bp, -bp.Rx * 0.32, -bp.Ry * 0.02) && dx > -bp.Rx * 0.35) c0 = T_RIM;
      else if (!inEgg(dx, dy, bp, -bp.Rx * 0.3, bp.Ry * 0.45)) c0 = T_LIT;
      else if (!inEgg(dx, dy, bp, bp.Rx * 0.24, -bp.Ry * 0.32)) c0 = T_SH1;
      else c0 = T_BODY;
      if (edge && behind && dy > -bp.Ry * 0.75 && dy < bp.Ry * 0.6) c0 = dx < 0 ? T_SH2 : T_LINE;
      m[i] = 1; col.set(haze > 0.01 ? mix(c0, HAZE, haze) : hex(c0), i * 3);
    }
  }
  ROWS_C.push({ y0: top - M0, h, P, speed, par: 0.1 + 0.45 * k, col, m });
}
export function drawClouds(c, V, t, fromY = 600) {
  const d = c.d;
  for (const L of ROWS_C) {
    const off = R(t * L.speed + V.cx * L.par), dy = R(-V.cy * L.par * 0.5);
    for (let j = 0; j < L.h; j++) {
      const y = L.y0 + j + dy; if (y < fromY || y >= GH) continue;
      const row = j * L.P;
      for (let x = 0; x < GW; x++) { const X = (((x + off) % L.P) + L.P) % L.P, s = row + X; if (!L.m[s]) continue; const i = (y * GW + x) * 3, k = s * 3; d[i] = L.col[k]; d[i + 1] = L.col[k + 1]; d[i + 2] = L.col[k + 2]; }
    }
  }
}

/** The glossy belly mirrors the sunlit cloud tops sliding past: soft horizontal light streaks, screen rows y0..y1. */
const REFL = (() => {                                        // per strip column: brightness of the cloud tops (row 5), blurred
  const L = ROWS_C[5], P = L.P, out = new Float32Array(P), j0 = R(L.h * 0.3);
  for (let X = 0; X < P; X++) { let v = 0; for (let j = j0; j < j0 + 16; j++) { const s = j * P + X; if (L.m[s] && L.col[s * 3 + 2] > 245) v += 1 / 16; } out[X] = v; }
  const b = new Float32Array(P); for (let X = 0; X < P; X++) { let v = 0; for (let q = -12; q <= 12; q++) v += out[(X + q + P) % P]; b[X] = v / 25; }
  return { b, P, L };
})();
export function drawBellyReflection(c, V, t, y0, y1, k = 0.2) {
  const { b, P, L } = REFL, d = c.d, off = R(t * L.speed * 0.7 + V.cx * L.par);
  for (let y = Math.max(0, y0); y < Math.min(GH, y1); y++) {
    const f = (y - y0) / Math.max(1, y1 - y0), prof = k * Math.sin(Math.PI * f) ** 2; if (prof <= 0.01) continue;
    for (let x = 0; x < GW; x++) {
      const v = b[(((x + off + R((y - y0) * 1.5)) % P) + P) % P], a = prof * Math.max(0, v - 0.25) * 1.6; if (a <= 0.02 || a <= bayer(x, y)) continue;
      const i = (y * GW + x) * 3; d[i] += (255 - d[i]) * 0.5; d[i + 1] += (255 - d[i + 1]) * 0.5; d[i + 2] += (255 - d[i + 2]) * 0.45;
    }
  }
}
