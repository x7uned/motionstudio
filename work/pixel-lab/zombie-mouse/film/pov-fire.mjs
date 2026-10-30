// «The last person alive» · Builder P — the campfire seen in first person: stone ring, crossed logs with glowing cracks,
// ember bed, pixel flames (noise tongues scrolling up, flat colour bands), rising sparks, a thin smoke column and a glow.
// drawFireBack / drawFireFront split the ring so the flames sit between the far and the near stones.
import { BT, vn, clamp01, glow, GW, GH } from "./pov-core.mjs";
import { proj, qz } from "./pov-forest.mjs";
import { rnd } from "./layout.mjs";

const R = Math.round, PI = Math.PI;
const FL = [[150, 30, 16], [222, 76, 24], [255, 146, 40], [255, 206, 74], [255, 246, 200]];   // red → white core
const STONES = Array.from({ length: 10 }, (_, i) => ({ a: (i / 10) * PI * 2 + rnd(i * 3) * 0.4, r: 0.065 + rnd(i * 5) * 0.035, h: 0.05 + rnd(i * 7) * 0.035, s: rnd(i * 11) * 10 }));
const LOGS = [{ a: 0.4, l: 0.38 }, { a: 2.5, l: 0.36 }, { a: 4.3, l: 0.4 }, { a: 1.5, l: 0.3 }];
const RING = 0.33;
const TONG = [[-0.42, 0.64, 0.4, 3.1], [0.04, 0.86, 0.44, 2.3], [0.46, 0.68, 0.38, 3.7], [-0.14, 0.5, 0.3, 4.4]];   // flame tongues: centre, height, half width, rate

/** One stone (world) as a rounded lump lit warm on its inner side / top. */
function stone(c, S, F, st, k) {
  const wx = F.x + Math.cos(st.a) * RING, wz = F.z + Math.sin(st.a) * RING * 0.95;
  const [X, Y, d, s] = proj(S, wx, 0, wz); if (d < 0.3) return;
  const r = st.r * s, h = st.h * s; if (r < 0.8) return;
  const fog = S.fd(d) * 0.8;
  const inner = Math.sin(st.a) > 0;                                   // far stones show their inner (fire-facing) side
  for (let y = -Math.ceil(h) - 1; y <= 1; y++) for (let x = -Math.ceil(r) - 1; x <= Math.ceil(r) + 1; x++) {
    const ang = Math.atan2(y, x), rr = r * (0.82 + 0.18 * vn(ang * 1.6 + st.s, st.s)), e = (x * x) / (rr * rr) + ((y + 0.5) * (y + 0.5)) / (h * h);
    if (e > 1 || y > 0.6) continue;
    const XX = R(X + x), YY = R(Y + y); if (XX < 0 || XX >= GW || YY < 0 || YY >= GH) continue;
    const b = BT[((YY & 3) << 2) | (XX & 3)], top = y < -h * 0.35 + x * 0.12;
    let v;                                                             // 0 dark … 1 hot-lit
    if (e > 0.74) v = top ? 0.35 : 0.05;
    else if (inner) v = top ? 0.95 : 0.72 - (y + h) / (2 * h) * 0.25;
    else v = top ? 0.7 : 0.18;
    v *= k * S.fire.I * 0.95 + 0.08;
    const qv = qz(clamp01(v), 4, b);
    const col = [24 + qv * 180, 18 + qv * 100, 22 + qv * 40];
    const kk = (YY * GW + XX) * 3, F2 = S.fog;
    const qg = qz(fog, 6, b);
    c.d[kk] = col[0] + (F2[kk] - col[0]) * qg; c.d[kk + 1] = col[1] + (F2[kk + 1] - col[1]) * qg; c.d[kk + 2] = col[2] + (F2[kk + 2] - col[2]) * qg;
  }
}

function logs(c, S, F, t, k) {
  for (const [i, L] of LOGS.entries()) {
    const ox = F.x + Math.cos(L.a) * L.l, oz = F.z + Math.sin(L.a) * L.l * 0.95, ix = F.x + Math.cos(L.a) * 0.04, iz = F.z + Math.sin(L.a) * 0.04;
    const A = proj(S, ox, 0.035, oz), B = proj(S, ix, 0.17 + (i % 2) * 0.03, iz);
    if (A[2] < 0.3 || B[2] < 0.3) continue;
    const rad = 0.04 * (A[3] + B[3]) / 2, n = Math.max(2, Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])));
    for (let j = 0; j <= n; j++) {
      const u = j / n, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u, rr = Math.max(1, rad * (1 - u * 0.25));
      for (let dy = -Math.ceil(rr); dy <= Math.ceil(rr); dy++) for (let dx = -Math.ceil(rr); dx <= Math.ceil(rr); dx++) {
        if (dx * dx + dy * dy > rr * rr + 0.5) continue;
        const X = R(x + dx), Y = R(y + dy); if (X < 0 || X >= GW || Y < 0 || Y >= GH) continue;
        const b = BT[((Y & 3) << 2) | (X & 3)], kk = (Y * GW + X) * 3;
        const crack = vn(u * 9 + i * 7, dx * 0.6 + t * 0.7 + i) , hot = u * 0.9 + (dy < 0 ? 0.2 : 0);
        let col = dy < -rr * 0.4 ? [70, 46, 36] : [30, 20, 18];
        if (crack > 0.62 - hot * 0.25 && k > b * 0.8) col = crack > 0.72 ? [255, 170, 60] : [210, 70, 26];
        else if (hot > 0.75 && k * 0.9 > b) col = [140, 40, 18];
        c.d[kk] = col[0]; c.d[kk + 1] = col[1]; c.d[kk + 2] = col[2];
      }
    }
  }
}

function embers(c, S, F, t, k, half = 0) {
  const [X0, Y0, d, s] = proj(S, F.x, 0, F.z); if (d < 0.3 || k <= 0) return;
  // ember bed (an ellipse on the ground)
  const ex = 0.22 * s, ey = Math.max(2, 0.22 * s * (S.cam.y / d) * 1.2 + 1);
  for (let y = -Math.ceil(ey); y <= Math.ceil(ey); y++) for (let x = -Math.ceil(ex); x <= Math.ceil(ex); x++) {
    const e = (x * x) / (ex * ex) + (y * y) / (ey * ey); if (e > 1) continue;
    if (half > 0 && y < -ey * 0.1 + (vn(x * 0.5 + 2, t * 2) - 0.5) * ey * 0.9) continue;
    const XX = R(X0 + x), YY = R(Y0 + y - ey * 0.3); if (XX < 0 || XX >= GW || YY < 0 || YY >= GH) continue;
    const b = BT[((YY & 3) << 2) | (XX & 3)], n = vn(x * 0.35 + 3, y * 0.6 + t * 1.3);
    const v = (1 - e) * 0.9 + (n - 0.5) * 0.8;
    if (v * k < 0.12 && e > 0.75) continue;
    const qi = Math.max(0, Math.min(3, Math.floor(qz(clamp01(v * k), 4, b) * 4 - 0.5)));
    const col = [[60, 18, 12], [150, 34, 16], [228, 92, 28], [255, 170, 60]][qi];
    const kk = (YY * GW + XX) * 3; c.d[kk] = col[0]; c.d[kk + 1] = col[1]; c.d[kk + 2] = col[2];
  }
}

/** Flames + detached licks. k = strength 0..1. */
function flames(c, S, F, t, k) {
  const [X0, Y0, d, s] = proj(S, F.x, 0, F.z); if (d < 0.3 || k <= 0) return;
  const I = S.fire.I, W = 0.24 * s * (0.6 + 0.4 * k), H = 0.7 * s * (0.35 + 0.65 * k) * (0.92 + 0.12 * (I - 1) * 4);
  // flames: density field with tongues; flat colour bands, dithered edges
  const ya = Math.max(0, Math.floor(Y0 - H * 1.15)), yb = Math.min(GH - 1, Math.ceil(Y0 + 2));
  const xa = Math.max(0, Math.floor(X0 - W * 1.5)), xb = Math.min(GW - 1, Math.ceil(X0 + W * 1.5));
  const sway = 0.12 * Math.sin(t * 1.7) + 0.06 * Math.sin(t * 3.9);
  for (let Y = ya; Y <= yb; Y++) {
    const v = (Y0 - Y) / H;                                         // 0 at the base, 1 at the tip
    if (v < -0.04) continue;
    const vv = Math.max(0, v), wv = Math.pow(Math.max(0, 1 - vv), 0.75) * (1 + 0.25 * Math.sin(vv * 5 - t * 6)) + 0.08;
    const lean = sway * vv * vv * W * 1.8;
    for (let X = xa; X <= xb; X++) {
      const u = (X - X0 - lean) / W;
      const n = vn(u * 3.3 + 5, vv * 1.7 - t * 2.7) * 0.62 + vn(u * 7.1 + 11, vv * 3.6 - t * 4.6) * 0.38;
      let hL = 0.13;
      for (let q = 0; q < 4; q++) { const tc = TONG[q], cu = tc[0] + 0.12 * Math.sin(t * tc[3] + q), hh = tc[1] * (0.7 + 0.45 * vn(t * tc[3] * 0.6 + q * 7, 1.3)), ww = tc[2], du = (u - cu) / ww; if (du * du < 1) hL = Math.max(hL, hh * (1 - du * du)); }   // tongue height for this column
      const au = Math.abs(u), base = 1.2 * (1 - au * Math.sqrt(au));
      let dens = Math.min(base, 1.15 * (1 - vv / hL)) + (n - 0.5) * (0.55 + vv * 0.5) - Math.max(0, vv - hL) * 4;
      if (v < 0.05) dens = Math.max(dens, (1 - Math.abs(u) / 1.1) * 0.5);
      dens *= 0.75 + 0.25 * k;
      if (dens < 0.08) continue;
      const b = BT[((Y & 3) << 2) | (X & 3)];
      let qi = dens > 0.92 ? 4 : dens > 0.66 ? 3 : dens > 0.42 ? 2 : dens > 0.22 ? 1 : 0;
      if (qi === 0 && dens * 6 < b) continue;
      // dithered transition between bands
      const edges = [0.08, 0.22, 0.42, 0.66, 0.92], lo = edges[qi], hi = edges[qi + 1] ?? 9;
      if (qi < 4 && (dens - lo) / (hi - lo) > 0.75 && b > 0.5) qi++;
      const col = FL[qi], kk = (Y * GW + X) * 3; c.d[kk] = col[0]; c.d[kk + 1] = col[1]; c.d[kk + 2] = col[2];
    }
  }
}

function sparks(c, S, F, t, k, n = 26) {
  const [X0, Y0, d, s] = proj(S, F.x, 0.25, F.z); if (d < 0.3 || k <= 0) return;
  for (let i = 0; i < n; i++) {
    const per = 1.1 + rnd(i * 5) * 1.2, ph = rnd(i * 5 + 1) * per, a = ((t + ph) % per) / per;
    const rise = (0.5 + rnd(i * 5 + 2) * 1.4) * s * a, drift = (rnd(i * 5 + 3) - 0.5) * 0.5 * s * a + Math.sin(t * 2.3 + i) * 0.04 * s * a;
    const X = R(X0 + (rnd(i * 5 + 4) - 0.5) * 0.18 * s + drift), Y = R(Y0 - 0.25 * s - rise);
    if (X < 0 || X >= GW || Y < 0 || Y >= GH) continue;
    const life = (1 - a) * k, b = BT[((Y & 3) << 2) | (X & 3)];
    if (life < b * 0.9) continue;
    const col = a < 0.3 ? [255, 236, 160] : a < 0.65 ? [255, 160, 50] : [220, 70, 26];
    const kk = (Y * GW + X) * 3; c.d[kk] = col[0]; c.d[kk + 1] = col[1]; c.d[kk + 2] = col[2];
    if (s > 120 && a < 0.4 && rnd(i * 9) > 0.5 && X + 1 < GW) { c.d[kk + 3] = col[0]; c.d[kk + 4] = col[1]; c.d[kk + 5] = col[2]; }
  }
}

function smoke(c, S, F, t, k) {
  const [X0, Y0, d, s] = proj(S, F.x, 0.55, F.z); if (d < 0.3) return;
  const top = Math.max(0, Math.floor(Y0 - 2.6 * s)), bot = Math.min(GH - 1, Math.ceil(Y0 + 0.1 * s));
  for (let Y = top; Y <= bot; Y++) {
    const h = (Y0 - Y) / s;                                          // metres above the flame tips
    const cxs = X0 + (Math.sin(h * 1.7 - t * 0.9) * 0.08 + h * (S.smokeDrift ?? -0.12)) * s, w = (0.06 + h * 0.13) * s;
    const fade = clamp01(1 - h / 2.6) * clamp01(h / 0.15 + 0.2) * (0.35 + 0.65 * k);
    for (let X = Math.max(0, Math.floor(cxs - w * 1.6)); X <= Math.min(GW - 1, Math.ceil(cxs + w * 1.6)); X++) {
      const u = (X - cxs) / w, n = vn(u * 1.3 + 2, h * 3.5 - t * 1.2) * 0.65 + vn(u * 3 + 8, h * 7 - t * 1.9) * 0.35;
      const v = (1 - Math.abs(u) * 0.7) * fade * (n * 1.4 - 0.35);
      const b = BT[((Y & 3) << 2) | (X & 3)];
      if (v < 0.12 || qz(v * 0.8, 2, b) <= 0) continue;
      const kk = (Y * GW + X) * 3, warm = clamp01(1 - h / 0.8) * k;
      const col = [70 + warm * 70, 72 + warm * 30, 86 - warm * 20], m = v > 0.4 ? 0.55 : 0.35;
      c.d[kk] += (col[0] - c.d[kk]) * m; c.d[kk + 1] += (col[1] - c.d[kk + 1]) * m; c.d[kk + 2] += (col[2] - c.d[kk + 2]) * m;
    }
  }
}

/** Everything behind the flames' front: far stones, the smoke, the glow. */
/** The warm light haze around the flames (drawn behind the people near the fire). */
export function drawFireGlow(c, S, F, t, k = 1) {
  const [X0, Y0, d, s] = proj(S, F.x, 0.3, F.z);
  glow(c, X0, Y0, 1.0 * s, [255, 150, 60], 0.3 * k * S.fire.I, 0.8, 3);
}
export function drawFireBack(c, S, F, t, k = 1) {
  for (const st of STONES) if (Math.sin(st.a) > 0) stone(c, S, F, st, k);
  smoke(c, S, F, t, k);
}
/** Logs, embers, flames, sparks and the near stones. */
export function drawFireFront(c, S, F, t, k = 1) {
  embers(c, S, F, t, k);
  logs(c, S, F, t, k);
  flames(c, S, F, t, k);
  embers(c, S, F, t + 0.37, k, 1);
  for (const st of STONES) if (Math.sin(st.a) <= 0) stone(c, S, F, st, k);
  sparks(c, S, F, t, k);
}
