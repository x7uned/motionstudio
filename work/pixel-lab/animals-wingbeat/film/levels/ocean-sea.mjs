// LV1's open Southern Ocean seen from just above the swells (screen space, per frame): rows of long swells roll toward
// the camera from the horizon (y = LAND) to the bottom edge, small and hazy far away, big with whitecaps, lace foam and
// flying spray in front. Each swell: a bright crest line, a translucent teal lip, a dark front face, the trough and a
// back slope that mirrors the sky. A glitter path of sparkles lies under the morning sun (the sky disc is screen-fixed,
// so is its reflection). All motion is periodic over the film (whole cycles per END). Direct buffer writes, sine table.
import { END } from "../timeline.mjs";
import { hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, TAU = Math.PI * 2;
const ST = new Float32Array(4096); for (let i = 0; i < 4096; i++) ST[i] = Math.sin((i / 4096) * TAU);
const sinT = (x) => ST[((x * 651.8986469044033) | 0) & 4095 & 4095] ;       // x in radians (4096 / 2π), wraps (x ≥ 0 only)
const sinS = (x) => (x >= 0 ? sinT(x) : -sinT(-x));
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** smooth 1-D value noise */
function vnoise(x, seed) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hash(i * 7 + seed * 131) * (1 - u) + hash((i + 1) * 7 + seed * 131) * u; }

// sea ramp, dark → light (deep navy · steel blue · teal · sky reflection · crest white)
const SEA = ["#0F3058", "#133A66", "#174472", "#1C507E", "#235E8C", "#2C6E9A", "#3A80AA", "#4C94BA", "#64A8CA", "#82BCD8", "#A6D2E6", "#CCE6F2", "#EEF8FC"].map(hex);
const LIP = hex("#3E9AAE"), LIP2 = hex("#55B2BE");                     // translucent teal lip under the crest
const FOAM = hex("#FFFFFF"), FOAM2 = hex("#E2F2F8"), FOAMS = hex("#A4CADC"), GLIT = hex("#FFFBE6"), GLIT2 = hex("#FFE9A8");
const HAZE = 8.9;                                                     // value the far sea fades to (the bright horizon)

export const D0 = 7, K1 = 4.3;
export const OMEGA = 30 / END;                                        // swells per second passing a row (30 per film)
const W1 = (7 * TAU) / END, W2 = (4 * TAU) / END, WF = (3 * TAU) / END;
/** horizontal wavelength of the crest meander at depth d (px below the horizon) */
const lam = (d) => 30 + 420 * ((d + D0) / (D0 + 320));
const meander = (u, t) => 0.13 * sinS(TAU * u + W1 * t + 1.3) + 0.06 * sinS(TAU * 2.7 * u - W2 * t + 0.4);
/** row coordinate (swells counted from the horizon, minus the roll) at screen depth d, world x, time t */
export function rowAt(d, wx, t) { return Math.log(1 + d / D0) * K1 - OMEGA * t + meander((wx - 270) / lam(d), t); }
/** foam strength of swell n at world x (0..1) — whitecaps come and go slowly along each crest */
export function foamAt(n, wx, d, t) {
  const u = (wx - 270) / lam(d);
  return vnoise(u * 2.2 + n * 3.37 + 0.3 * Math.sin(WF * t + n), 3) * 0.72 + vnoise(u * 6.3 - n * 1.9, 9) * 0.28;
}
/** swell height along its crest (0.3..1): long swells rise and fade along x */
const ampAt = (n, u) => { const v = vnoise(u * 1.1 + n * 1.618, 5); return 0.3 + 0.7 * v * v * (3 - 2 * v); };

/** Paint the sea between world x xa..xb, horizon at world y `land`. */
export function drawSea(c, V, t, xa, xb, land) {
  const HY = R(V.Y(land)), sx0 = Math.max(0, R(V.X(xa))), sx1 = Math.min(c.w, R(V.X(xb)));
  if (sx0 >= sx1 || HY >= c.h) return;
  const d8 = c.d, W = c.w, cx = V.cx;
  for (let y = Math.max(0, HY); y < c.h; y++) {
    const d = y - HY + 0.5, sc = (d + D0) / (D0 + 320), haze = Math.exp(-d / 44), near = Math.min(1, Math.max(0, (sc - 0.3) / 0.5));
    const L = lam(d), q = Math.log(1 + d / D0) * K1 - OMEGA * t, gw = 7 + d * 0.15, rowPx = (d + D0) / K1;   // glitter half-width, px per swell
    const crestW = Math.min(0.12, 1.3 / rowPx), lipW = crestW + Math.min(0.1, 2.5 / rowPx) * (0.4 + near), dashH = 1 / Math.max(1, rowPx / 9);
    for (let x = sx0; x < sx1; x++) {
      const wx = x + cx - 270, u = (wx - 270) / L, rc = q + meander(u, t), n = Math.floor(rc), p = rc - n;
      const amp = ampAt(n, u), ampN = ampAt(n + 1, u);
      let v, col = null;
      if (p < crestW) v = 6.6 + 4.6 * amp;                                         // crest line (bright where the swell stands tall)
      else if (p < lipW) { v = 5.2 + amp * 1.6; if (amp > 0.6 && near > 0.05 && bayer(x, y) < (amp - 0.6) * 2.4) col = (p - crestW) < (lipW - crestW) * 0.5 ? LIP2 : LIP; }
      else if (p < 0.45) v = 4.8 - ((p - lipW) / (0.45 - lipW)) * (1.4 + 2.2 * amp);    // front face, darkening down to the trough
      else if (p < 0.74) v = 2.4 - 1.1 * amp - 0.5 * Math.sin(((p - 0.45) / 0.29) * Math.PI);
      else { const k = (p - 0.74) / 0.26; v = 2.0 + k * k * (2.5 + 5.2 * ampN); }      // back slope of the next swell mirrors the sky
      // small wind chop: short light dashes riding the swells
      if (p > 0.18 && p < 0.92) { const cw = 3 + 9 * sc, ix = Math.floor(u * L / cw + n * 0.37), slot = p * 9, js = Math.floor(slot);
        if (slot - js < dashH && hash(ix * 977 + js * 131 + n * 7919) < 0.16 + 0.1 * near && ((u * L / cw + n * 0.37) % 1 + 1) % 1 < 0.7) v += 2.6 + 1.2 * (1 - near); }
      v = (v + 0.5) * (1 - haze) + HAZE * haze;
      // whitecaps: foam clumps sitting on the taller crests, spilling down the front face
      if (sc > 0.06 && amp > 0.45 && (p < 0.3 || p > 0.9)) {
        const nn = p > 0.9 ? n + 1 : n, f = foamAt(nn, wx, d, t) * (0.55 + 0.45 * (p > 0.9 ? ampN : amp)), thr = 0.47 - 0.08 * near;
        if (f > thr) {
          const s = Math.min(1, (f - thr) / 0.3), wpx = u * L / (2 + 5 * sc), bump = 0.45 + 0.55 * Math.abs(sinS(wpx + nn * 1.3)) * (0.6 + 0.4 * Math.abs(sinS(wpx * 0.37 + nn)));
          const up = (0.025 + 0.085 * s * bump) * (0.5 + near), dn = (0.04 + 0.22 * s * (0.6 + 0.4 * bump)) * (0.4 + 0.8 * near);
          if (p > 0.9 && 1 - p < up) col = (1 - p) > up * 0.55 ? FOAM2 : FOAM;
          else if (p < dn) { const r = p / dn; if (r < 0.4 || bayer(x, y) < (1 - r) * 1.6 * s) col = r > 0.78 ? FOAMS : r > 0.4 ? (((x ^ y) & 3) === 0 ? FOAM : FOAM2) : FOAM; }
          else if (p < dn * 1.5 && near > 0.3 && bayer(x, y) < 0.3) col = LIP;                  // the shadow under the foam
        }
      }
      // sun glitter path: sparkles on slopes facing the sun, under the disc
      if (!col && (p > 0.78 || p < 0.08)) {
        const dx = (x - 270) / gw, gwt = Math.exp(-dx * dx);
        if (gwt > 0.03) { const h = hash((wx >> 1) * 92821 + n * 68917 + (y >> 1) * 31), tw = 0.5 + 0.5 * Math.sin(TAU * (h * 7 + ((11 + R(h * 9)) * t) / END)); if (h < gwt * tw * (0.22 + 0.25 * haze)) col = tw > 0.72 ? GLIT : GLIT2; }
      }
      const o = (y * W + x) * 3;
      if (!col) { const vv = Math.max(0, Math.min(12, v)), lo = Math.floor(vv), fr = vv - lo; col = SEA[fr > bayer(x, y) ? Math.min(12, lo + 1) : lo]; }
      d8[o] = col[0]; d8[o + 1] = col[1]; d8[o + 2] = col[2];
    }
  }
  // the horizon line: a thin bright rim where the sea meets the sky
  if (HY >= 0 && HY < c.h) for (let x = sx0; x < sx1; x++) { const o = (HY * W + x) * 3, cc = SEA[11]; d8[o] = cc[0]; d8[o + 1] = cc[1]; d8[o + 2] = cc[2]; }
}

/** Flying spray above the biggest near whitecaps: droplets thrown up and falling back (periodic per droplet). */
export function drawSpray(c, V, t, xa, xb, land) {
  const HY = V.Y(land);
  for (let i = 0; i < 140; i++) {
    const P = END / (10 + (i % 7)), ph = ((t / P + hash(i * 13)) % 1 + 1) % 1, wx = xa + hash(i * 3 + 1) * (xb - xa);
    const x0 = R(V.X(wx)); if (x0 < 0 || x0 >= c.w) continue;
    // find the nearest big crest below the bottom third at this x: scan rows upward from the bottom
    const dTarget = 170 + hash(i * 5 + 2) * 140, d = dTarget, rc = rowAt(d, wx, t), n = Math.floor(rc);
    const f = foamAt(n, wx, d, t); if (f < 0.7) continue;
    // crest screen depth for swell n at this x (solve rowAt(d) = n with the meander at depth d)
    const wob = meander((wx - 270) / lam(d), t), dc = D0 * (Math.exp((n - wob + OMEGA * t) / K1) - 1);
    const yc = HY + dc; if (yc < HY + 120 || yc > c.h + 10) continue;
    const up = Math.sin(Math.PI * ph) * (10 + hash(i * 9) * 22) * Math.min(1, (f - 0.7) * 4), dx = (ph - 0.5) * (6 + hash(i) * 10);
    const X = R(x0 + dx), Y = R(yc - up); if (Y < 0 || Y >= c.h) continue;
    const big = hash(i * 17) < 0.45 || yc > HY + 250;
    c.px(X, Y, ph < 0.8 ? "#FFFFFF" : "#CDE8F2"); if (big) { c.px(X + 1, Y, "#E2F2F8"); c.px(X, Y + 1, "#B8DCEA"); c.px(X + 1, Y + 1, "#9CCAE0"); }
  }
}
export { mix };
