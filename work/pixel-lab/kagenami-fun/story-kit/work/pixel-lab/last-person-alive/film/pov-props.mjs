// «The last person alive» · Builder P — props for the first-person shots: the log she sits on (a cylinder whose cut end
// faces us, tree rings, bark side lit by the fire), a small stack of firewood.
import { BT, vn, clamp01, GW, GH } from "./pov-core.mjs";
import { proj, qz } from "./pov-forest.mjs";

const R = Math.round;
const BARK = [[18, 12, 12], [40, 28, 24], [66, 46, 36], [98, 66, 46], [136, 90, 58], [176, 118, 72]];
const WOOD = [[48, 32, 24], [92, 62, 40], [140, 98, 62], [184, 134, 86], [222, 172, 116]];

/** A log lying on the ground from world A (near) to B (far), radius r; fire light from the left (fx, fz). */
export function drawLog(c, S, A, B, r, t) {
  const pa = proj(S, A[0], A[1], A[2]), pb = proj(S, B[0], B[1], B[2]); if (pa[2] < 0.3) return;
  const r1 = r * pa[3], r2 = r * pb[3];
  const x0 = Math.max(0, Math.floor(Math.min(pa[0] - r1, pb[0] - r2)) - 1), x1 = Math.min(GW - 1, Math.ceil(Math.max(pa[0] + r1, pb[0] + r2)) + 1);
  const y0 = Math.max(0, Math.floor(Math.min(pa[1] - r1, pb[1] - r2)) - 1), y1 = Math.min(GH - 1, Math.ceil(Math.max(pa[1] + r1, pb[1] + r2)) + 1);
  const ax = pb[0] - pa[0], ay = pb[1] - pa[1], al2 = ax * ax + ay * ay || 1;
  const I = S.fire ? S.fire.I : 0, fog = S.fd(pa[2]) * 0.9, F = S.fog;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const dx1 = X + 0.5 - pa[0], dy1 = Y + 0.5 - pa[1], e1 = (dx1 * dx1 + dy1 * dy1) / (r1 * r1);
    const b = BT[((Y & 3) << 2) | (X & 3)];
    let col;
    if (e1 <= 1) {
      // cut end: rings, a radial crack, lit from the left by the fire
      const rr = Math.sqrt(e1), ang = Math.atan2(dy1, dx1);
      if (rr > 0.86) { col = BARK[rr > 0.95 ? 0 : 2]; }
      else {
        const ring = Math.sin(rr * 26 + vn(ang * 2, rr * 3) * 2.2) > 0.55, crack = Math.abs(ang - 0.9) < 0.05 && rr > 0.2;
        const lit = clamp01(0.45 - dx1 / r1 * 0.45 - dy1 / r1 * 0.15) * (0.6 + 0.5 * I);
        let v = 1.2 + lit * 2.6 - rr * 0.4;
        if (ring) v -= 0.8; if (crack) v = 0.2;
        col = WOOD[Math.max(0, Math.min(4, Math.round(qz(clamp01(v / 4), 4, b) * 4)))];
      }
    } else {
      const u = clamp01((dx1 * ax + dy1 * ay) / al2), cxu = pa[0] + ax * u, cyu = pa[1] + ay * u, ru = r1 + (r2 - r1) * u;
      const ox = X + 0.5 - cxu, oy = Y + 0.5 - cyu, e = (ox * ox + oy * oy) / (ru * ru);
      if (e > 1) continue;
      const nx = ox / ru, ny = oy / ru;
      const lit = clamp01(-nx * 0.85 + 0.15) * (0.55 + 0.5 * I) + clamp01(-ny) * 0.25;
      const tex = vn(u * 30 + 2, Math.atan2(ny, nx) * 4) > 0.6 ? -0.9 : 0;
      let v = 0.6 + lit * 3.4 + tex;
      if (e > 0.88) v = Math.min(v, 0.6);
      col = BARK[Math.max(0, Math.min(5, Math.round(qz(clamp01(v / 5), 5, b) * 5)))];
    }
    const k = (Y * GW + X) * 3, qg = qz(fog, 6, b);
    c.d[k] = col[0] + (F[k] - col[0]) * qg; c.d[k + 1] = col[1] + (F[k + 1] - col[1]) * qg; c.d[k + 2] = col[2] + (F[k + 2] - col[2]) * qg;
  }
}
