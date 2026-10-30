// «The last person alive» · Builder P — a first-person night forest (pinhole camera, painter's order).
// World: metres, x right, y up, z forward (away from the camera). Screen: X = cx + f·(x − cam.x)/d, Y = H0 − f·(y − cam.y)/d,
// d = z − cam.z. Lighting = ambient + moonlight (cool, direction md) + one firelight point (warm, falloff r0), each
// quantised to a few steps with an ordered dither, then depth/ground fog (also quantised) toward a per-pixel fog colour
// (vertical gradient + slanted moon beams + a warm haze around the fire), computed once per frame in drawBackdrop.
import { BT, vn, clamp01, GW, GH } from "./pov-core.mjs";
import { rnd } from "./layout.mjs";

const R = Math.round, PI = Math.PI;
// flat-zone quantiser (v ≥ 0): flat tone bands, ordered dither only in the middle 40 % of each step
const q = (v, n, b) => { const s = v * n, lo = s | 0, fr = s - lo; return (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / n; };
export { q as qz };

// ---------------------------------------------------------------- static screen-space tables
const BEAM = new Float32Array(GW * (GH + 200));
for (let Y = 0; Y < GH + 200; Y++) for (let X = 0; X < GW; X++) {
  const v = (X * 0.55 + (Y - 100) * 0.83) * 0.016;
  const a = vn(v, 3.3) * 0.62 + vn(v * 2.3 + 11, 7.7) * 0.38;
  const b = Math.max(0, a - 0.52) / 0.48;
  const fall = clamp01(1.2 - (Y - 100) / 700);
  BEAM[Y * GW + X] = b * b * fall * (0.7 + 0.3 * vn(X * 0.02, Y * 0.01 + 4));
}
const MIST = new Float32Array(GW * (GH + 200));                              // slow break-up of the deep fog
for (let Y = 0; Y < GH + 200; Y++) for (let X = 0; X < GW; X++) MIST[Y * GW + X] = vn(X * 0.035 + 3, Y * 0.022) * 0.65 + vn(X * 0.09, Y * 0.05 + 9) * 0.35 - 0.5;
// bark: 256 (around, 0.4 cm) × 1024 (height, 1 cm), tone 0 dark fissure · 1 mid · 2 light ridge
const BARKT = new Uint8Array(256 * 1024);
for (let y = 0; y < 1024; y++) for (let x = 0; x < 256; x++) {
  const a = x / 256 * 26, h = y / 100;
  const v = vn(a * 1.0 + 3, h * 2.1) * 0.62 + vn(a * 2.4 + 9, h * 8.5) * 0.25 + vn(a * 5, h * 20) * 0.13;
  BARKT[y * 256 + x] = v < 0.4 ? 0 : v > 0.6 ? 2 : 1;
}

const FOGBUF = new Float32Array(GW * GH * 3);
/** Prepare per-frame caches on S. Call once per frame before drawing. */
export function prep(S) {
  S.fd = (d) => 1 - Math.exp(-d / S.fogD);
  S.fog = FOGBUF;
  S.beamOff = Math.max(0, Math.min(190, R(100 + (S.beamShift || 0))));
  return S;
}

// ---------------------------------------------------------------- backdrop: deep fog where nothing stands (fills S.fog too)
export function drawBackdrop(c, S) {
  const d = c.d, F = S.fog, H = S.H0, h = S.haze, bo = S.beamOff, mo = R(S.mistOff || 0) + 100;
  const lo = S.fogLo, hi = S.fogHi, bc = S.beamCol, bs = S.beams || 0;
  for (let Y = 0; Y < GH; Y++) {
    const k0 = clamp01((H + 30 - Y) / (H + 30)), kk = Math.pow(k0, 0.75);
    const r0 = lo[0] + (hi[0] - lo[0]) * kk, g0 = lo[1] + (hi[1] - lo[1]) * kk, b0 = lo[2] + (hi[2] - lo[2]) * kk;
    const by = (Y + bo) * GW, my = Math.min(GH + 199, Y + mo) * GW;
    // a lighter fog band hugging the horizon (the far forest floor mist)
    const band = S.band ? S.band * Math.exp(-((Y - H - S.bandY) ** 2) / (S.bandH * S.bandH)) : 0;
    for (let X = 0; X < GW; X++) {
      let r = r0, g = g0, b = b0;
      const bm = BEAM[by + X] * bs; r += bc[0] * bm; g += bc[1] * bm; b += bc[2] * bm;
      if (band > 0) { r += S.bandCol[0] * band; g += S.bandCol[1] * band; b += S.bandCol[2] * band; }
      if (h && h.a > 0) {
        const dx = (X - h.X) / h.rx, dy = (Y - h.Y) / h.ry, w = h.a / (1 + (dx * dx + dy * dy) * 2.4);
        r += h.col[0] * w; g += h.col[1] * w; b += h.col[2] * w;
      }
      const k = (Y * GW + X) * 3;
      F[k] = r; F[k + 1] = g; F[k + 2] = b;
      const qv = (q(MIST[my + X] * 0.5 + 0.5, 3, BT[((Y & 3) << 2) | (X & 3)]) - 0.5) * 0.2;
      d[k] = r * (1 + qv); d[k + 1] = g * (1 + qv); d[k + 2] = b * (1 + qv * 0.9);
    }
  }
}

// ---------------------------------------------------------------- shading
function fireAt(S, px, py, pz, nx, ny, nz, wrap) {
  const F = S.fire; if (!F || F.I <= 0) return 0;
  const dx = F.x - px, dy = F.y - py, dz = F.z - pz, d2 = dx * dx + dy * dy + dz * dz, dl = Math.sqrt(d2) + 1e-6;
  const lam = ((nx * dx + ny * dy + nz * dz) / dl + wrap) / (1 + wrap);
  return lam <= 0 ? 0 : F.I * lam * (F.r0 * F.r0) / (F.r0 * F.r0 + d2);
}
export { fireAt };

/** Write albedo·light (quantised) fogged (quantised) at pixel k. */
function sw(S, d, k, b, ar, ag, ab, lm, lf, fog) {
  let v = lm * 4, lo = v | 0, fr = v - lo; const qm = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) * 0.25;
  v = lf * 6; lo = v | 0; fr = v - lo; const qf = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / 6;
  v = fog * 6; lo = v | 0; fr = v - lo; const qg = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / 6;
  const A = S.amb, M = S.moon, Fc = S.fireCol;
  let r = ar * (A[0] + qm * M[0] + qf * Fc[0]) * 255, g = ag * (A[1] + qm * M[1] + qf * Fc[1]) * 255, bl = ab * (A[2] + qm * M[2] + qf * Fc[2]) * 255;
  if (qg > 0) { const F = S.fog; r += (F[k] - r) * qg; g += (F[k + 1] - g) * qg; bl += (F[k + 2] - bl) * qg; }
  d[k] = r; d[k + 1] = g; d[k + 2] = bl;
}
/** Same, returning nothing but usable from item code with (X, Y). */
export function shadePx(c, S, X, Y, al, lm, lf, fog) {
  X |= 0; Y |= 0; if (X < 0 || Y < 0 || X >= GW || Y >= GH) return;
  sw(S, c.d, (Y * GW + X) * 3, BT[((Y & 3) << 2) | (X & 3)], al[0], al[1], al[2], lm, lf, fog);
}

// ---------------------------------------------------------------- the ground (y = 0)
const N0 = new Float32Array(GW / 4 + 4), N1 = new Float32Array(GW / 4 + 4), ND = new Float32Array(GW / 4 + 4);
export function drawGround(c, S, maxD = 80) {
  const d = c.d, f = S.f, cx = S.cx, H0 = S.H0, cam = S.cam, G = S.ground, F = S.fire;
  const yStart = Math.max(0, Math.floor(H0 + f * cam.y / maxD));
  const fI = F ? F.I : 0, r02 = F ? F.r0 * F.r0 : 1;
  for (let Y = yStart; Y < GH; Y++) {
    const dy = Y + 0.5 - H0; if (dy <= 0.5) continue;
    const dist = f * cam.y / dy, wz = cam.z + dist, fogD = S.fd(dist);
    const gf = S.gfA ? S.gfA * (1 - Math.exp(-dist / S.gfD)) : 0, fog = Math.min(1, fogD + gf * (1 - fogD));
    const px = S.path ? S.path(wz) : null, pw = typeof S.pathW === "function" ? S.pathW(wz) : S.pathW || 0.5;
    const tc = clamp01(1.4 - dist / 12), litter = clamp01(1.2 - dist / 9);
    const step = dist / f;
    // low-frequency noises sampled every 4 px and interpolated (they are smooth at pixel scale)
    for (let X = 0; X <= GW + 4; X += 4) {
      const wx = cam.x + (X + 0.5 - cx) * step, j = X >> 2;
      N0[j] = vn(wx * 1.3 + 40, wz * 1.3); N1[j] = vn(wx * 7 + 7, wz * 7 + 3); ND[j] = vn(wx * 1.5 + 3.3, wz * 1.5 + 1.7);
    }
    const zrow = Y * GW, zt = S.zt;
    for (let X = 0; X < GW; X++) {
      if (zt && zt[zrow + X] < dist) continue;
      const wx = cam.x + (X + 0.5 - cx) * step;
      const b = BT[((Y & 3) << 2) | (X & 3)];
      const j = X >> 2, fx = (X & 3) * 0.25;
      const n0 = N0[j] + (N0[j + 1] - N0[j]) * fx, n1v = N1[j] + (N1[j + 1] - N1[j]) * fx, ndp = ND[j] + (ND[j + 1] - ND[j]) * fx;
      let al = G.floor;
      const pathK = px == null ? 0 : clamp01((pw + (n0 - 0.5) * 0.4 - Math.abs(wx - px)) * 5);
      if (pathK > b) al = G.dirt;
      else if (clamp01((n0 - 0.55) * 4) > b) al = G.moss;
      // leaf litter: at most one leaf per cell, jittered, rotated, sized by hash
      let leaf = -1;
      if (litter > 0) {
        const u = wx * 26, v = wz * 20, iu = Math.floor(u), iv = Math.floor(v), h = rnd(iu * 7349 + iv * 15731 + 77);
        if (h < 0.42 * litter * (pathK > 0.5 ? 0.6 : 1)) {
          const h2 = rnd(iu * 1931 + iv * 7717 + 3), h3 = rnd(iu * 3001 + iv * 5003 + 9), ang = h * 97;
          const fu = u - iu - (0.2 + 0.6 * h2), fv = v - iv - (0.2 + 0.6 * h3), ca = Math.cos(ang), sa = Math.sin(ang);
          const ru = fu * ca + fv * sa, rv = -fu * sa + fv * ca, sz = 0.35 + 0.45 * h3;
          if (ru * ru * 3 + rv * rv * 11 < sz * sz) leaf = ((h2 * 40) | 0) % 4;
        }
      }
      let tk = 0.82 + q(clamp01(0.5 + (n1v - 0.5) * 2.0 * tc), 2, b) * 0.3;
      let ar = al[0] * tk, ag = al[1] * tk, ab = al[2] * tk;
      if (leaf >= 0) { const L = G.leaves[leaf]; ar = L[0]; ag = L[1]; ab = L[2]; }
      // moonlight: dappled through the canopy (open in the clearing)
      let open = 0;
      if (S.clear) { const ex = wx - S.clear.x, ez = (wz - S.clear.z) * 0.9; open = clamp01(1.5 - Math.sqrt(ex * ex + ez * ez) / S.clear.r); }
      const dap = clamp01((ndp - 0.52) * 2.2) * 0.55;
      const lm = S.moonGround * (0.35 + 0.65 * (dap > open * 0.8 ? dap : open * 0.8));
      let lf = 0;
      if (fI > 0) { const ex = F.x - wx, ez = F.z - wz, ey = F.y, d2 = ex * ex + ez * ez + ey * ey; lf = fI * (ey / Math.sqrt(d2) + 0.4) / 1.4 * r02 / (r02 + d2) * 1.4; }
      if (S.groundLight) lf += S.groundLight(wx, wz);
      sw(S, d, (Y * GW + X) * 3, b, ar, ag, ab, lm, lf, fog);
    }
  }
}

// ---------------------------------------------------------------- trunks
const BARK = [[0.15, 0.12, 0.12], [0.34, 0.28, 0.26], [0.5, 0.43, 0.39]];
const MOSS = [0.2, 0.31, 0.16];
const ZT = new Float32Array(GW * GH);
const TAB_N = 4096, TAB = { cu: new Float32Array(TAB_N), cnx: new Float32Array(TAB_N), cnz: new Float32Array(TAB_N), ctx: new Int32Array(TAB_N), clm: new Float32Array(TAB_N), cfa: new Float32Array(TAB_N), cfb: new Float32Array(TAB_N) };
/** Trunk row geometry shared by the depth pass and the shader. */
function trunkFrame(S, T) {
  const cam = S.cam, d = T.z - cam.z; if (d < 0.3) return null;
  const s = S.f / d, Xc = S.cx + (T.x - cam.x) * s, w = T.r * s, lean = T.lean || 0;
  if (Xc + w * 2.5 + Math.abs(lean) * 14 * s < 0 || Xc - w * 2.5 - Math.abs(lean) * 14 * s > GW) return null;
  const Yg = S.H0 + cam.y * s, top = T.top ?? 99, Ytop = Math.max(0, Math.floor(S.H0 - (top - cam.y) * s));
  return { d, s, Xc, w, lean, Yg, Ytop, yEnd: Math.min(GH - 1, Math.ceil(Yg)) };
}
const flareOf = (wyp) => 1 + 0.75 * Math.exp(-wyp / 0.15) + 0.14 * Math.exp(-wyp / 0.7);
/** Depth pass: the nearest trunk depth per pixel (S.zt). Call after prep, before drawing. */
export function trunkDepth(S, trunks) {
  ZT.fill(1e9); S.zt = ZT;
  for (const T of trunks) {
    const F = trunkFrame(S, T); if (!F) continue;
    const { d, s, Xc, w, lean, Ytop, yEnd } = F;
    for (let Y = Ytop; Y <= yEnd; Y++) {
      const wy = S.cam.y - (Y + 0.5 - S.H0) / s, wyp = wy > 0 ? wy : 0, hw = w * flareOf(wyp), xc = Xc + lean * wyp * s;
      if (hw < 0.4) continue;
      const xa = Math.max(0, Math.ceil(xc - hw - 0.5)), xb = Math.min(GW - 1, Math.floor(xc + hw - 0.5)), row = Y * GW;
      for (let X = xa; X <= xb; X++) if (ZT[row + X] > d) ZT[row + X] = d;
    }
  }
}
/** T = { x, z, r, seed, lean (m/m), top (world height where the trunk ends, or 99), moss 0..1 } */
export function drawTrunk(c, S, T) {
  const Fr = trunkFrame(S, T); if (!Fr) return;
  const cam = S.cam, { d, s, Xc, w, lean, Ytop, yEnd } = Fr, H0 = S.H0;
  const vx = T.x - cam.x, vl = Math.hypot(vx, d), ux = vx / vl, uz = d / vl, px_ = uz, pz_ = -ux;
  const fog0 = S.fd(d), dd = c.d, md = S.md, ol = S.outline, Fg = S.fog, zt = S.zt, dz = d + 0.005;
  const tc = clamp01(1.6 - d / 9), seedOff = (T.seed * 977 | 0) & 255, rim = S.rim || null;
  const F = S.fire, fI = F && F.I > 0 ? F.I : 0, r02 = F ? F.r0 * F.r0 : 1;
  // column tables for the straight part (no flare): u, normal, bark column, moon term, fire xz terms
  const NC = Math.min(TAB_N, Math.ceil(w) * 2 + 4), cu = TAB.cu, cnx = TAB.cnx, cnz = TAB.cnz, ctx = TAB.ctx, clm = TAB.clm, cfa = TAB.cfa, cfb = TAB.cfb;
  let tabHw = -1;
  const buildTab = (hw) => {
    tabHw = hw;
    for (let i = 0; i < NC; i++) {
      let u = (i - NC / 2 + 0.5) / hw; u = u < -0.999 ? -0.999 : u > 0.999 ? 0.999 : u;
      const sq = Math.sqrt(1 - u * u), nx = u * px_ - sq * ux, nz = u * pz_ - sq * uz;
      cu[i] = u; cnx[i] = nx; cnz[i] = nz;
      ctx[i] = (((Math.asin(u) + 1.6) * T.r * 64) | 0) + seedOff & 255;
      clm[i] = Math.max(0, nx * md[0] + nz * md[2]) * 0.9 + 0.1;
      if (fI) { const dx = F.x - (T.x + nx * T.r), dz2 = F.z - (T.z + nz * T.r); cfa[i] = nx * dx + nz * dz2; cfb[i] = dx * dx + dz2 * dz2; }
    }
  };
  for (let Y = Ytop; Y <= yEnd; Y++) {
    const wy = cam.y - (Y + 0.5 - H0) / s, wyp = wy > 0 ? wy : 0;
    const flare = flareOf(wyp), xc = Xc + lean * wyp * s, hw = w * flare;
    if (hw < 0.4) continue;
    const xa = Math.max(0, Math.ceil(xc - hw - 0.5)), xb = Math.min(GW - 1, Math.floor(xc + hw - 0.5));
    if (xa > xb) continue;
    const straight = flare < 1.02;
    if (straight && tabHw !== w) buildTab(w);
    const gf = S.gfA && wy < S.gfH ? S.gfA * (1 - wy / S.gfH) * (1 - Math.exp(-d / S.gfD)) : 0;
    const fog = Math.min(1, fog0 + gf * (1 - fog0));
    const mossK = (T.moss || 0) * clamp01(1 - wy / 1.4);
    const ty = ((Math.floor(wy * 100 / (flare > 1.25 ? 1.6 : 1)) + seedOff * 3) & 1023) * 256;
    const fy = fI ? F.y - wy : 0, fy2 = fy * fy;
    const lmH = S.moonTrunk * (0.5 + 0.5 * clamp01(wy / 5));
    const row = Y * GW;
    for (let X = xa; X <= xb; X++) {
      if (zt[row + X] < d - 0.001) continue;                              // hidden behind a nearer trunk
      const b = BT[((Y & 3) << 2) | (X & 3)], k = (row + X) * 3;
      let u, nx, nz, tx, lmD, fa, fb;
      if (straight) {
        const i = Math.max(0, Math.min(NC - 1, Math.floor(X + 0.5 - xc + NC / 2)));
        u = cu[i]; nx = cnx[i]; nz = cnz[i]; tx = ctx[i]; lmD = clm[i]; fa = cfa[i]; fb = cfb[i];
      } else {
        u = (X + 0.5 - xc) / hw; u = u < -0.999 ? -0.999 : u > 0.999 ? 0.999 : u;
        const sq = Math.sqrt(1 - u * u); nx = u * px_ - sq * ux; nz = u * pz_ - sq * uz;
        tx = (((Math.asin(u) + 1.6) * T.r * 64) | 0) + seedOff & 255;
        lmD = Math.max(0, nx * md[0] + nz * md[2]) * 0.9 + 0.1;
        if (fI) { const dx = F.x - (T.x + nx * T.r), dz2 = F.z - (T.z + nz * T.r); fa = nx * dx + nz * dz2; fb = dx * dx + dz2 * dz2; }
      }
      let tone = BARKT[ty + tx];
      if (tc < 1 && tone !== 1 && tc <= b) tone = 1;
      let ar, ag, ab;
      if (mossK > b + 0.15 && nx * md[0] + nz * md[2] < 0.3) { ar = MOSS[0]; ag = MOSS[1]; ab = MOSS[2]; }
      else { const a = BARK[tone]; ar = a[0]; ag = a[1]; ab = a[2]; }
      const lm = lmH * lmD;
      let lf = 0;
      if (fI) { const d2 = fb + fy2, lam = (fa / Math.sqrt(d2) + 0.12) / 1.12; if (lam > 0) lf = fI * lam * r02 / (r02 + d2); }
      if (rim) lf += rim(nx, nz, wy, d);
      if ((X === xa || X === xb) && lf < 0.22) {
        const qv = fog * 6, lo = qv | 0, fr = qv - lo, qg = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / 6;
        dd[k] = ol[0] + (Fg[k] - ol[0]) * qg; dd[k + 1] = ol[1] + (Fg[k + 1] - ol[1]) * qg; dd[k + 2] = ol[2] + (Fg[k + 2] - ol[2]) * qg;
        continue;
      }
      sw(S, dd, k, b, ar, ag, ab, lm, lf, fog);
    }
  }
}

/** Thin dead twigs on the lower trunk and live spruce boughs from T.bough metres up (column fills, jagged needle fringe). */
export function drawBranches(c, S, T) {
  const cam = S.cam, d = T.z - cam.z; if (d < 0.4) return;
  const f = S.f, cx = S.cx, H0 = S.H0, s = f / d, fog = S.fd(d), dd = c.d;
  const Xat = (wy) => cx + (T.x - cam.x) * s + (T.lean || 0) * wy * s;
  const Yw = (wy) => H0 - (wy - cam.y) * s;
  const topVis = cam.y + (H0 + 6) / s;
  const twigCol = [0.17, 0.14, 0.13];
  // dead twigs (short, irregular, a few side twiglets)
  const twA = clamp01((s - 22) / 12);
  if (T.twigs !== false && s > 22) {
    for (let i = 0; i < 9; i++) {
      const wy = 1.3 + i * 0.36 + rnd(T.seed * 31 + i) * 0.25; if (wy > Math.min(topVis, T.bough ?? 9) - 0.2) break;
      if (rnd(T.seed * 3 + i * 7) < 0.35) continue;
      const side = rnd(T.seed * 5 + i) < 0.5 ? 1 : -1, len = (0.12 + rnd(T.seed * 7 + i) * 0.32);
      let x = Xat(wy) + side * T.r * s * 0.85, y = Yw(wy);
      const segs = 3, dir = 0.25 + rnd(i + T.seed) * 0.35;
      const lf = fireAt(S, T.x + side * (T.r + len / 2), wy, T.z, side * 0.7, -0.3, -0.6, 0.3);
      for (let g = 0; g < segs; g++) {
        const L = len * s / segs, nxp = x + side * L, nyp = y + L * (dir + (rnd(T.seed + i * 11 + g) - 0.5) * 0.6);
        const n = Math.max(1, Math.ceil(Math.abs(nxp - x)));
        for (let k = 0; k <= n; k++) { const X1 = R(x + (nxp - x) * k / n), Y1 = R(y + (nyp - y) * k / n); if (twA < 1 && twA <= BT[((Y1 & 3) << 2) | (X1 & 3)]) continue; shadePx(c, S, X1, Y1, twigCol, 0.05, lf * 0.8, fog); }
        if (g === 1 && s > 45 && twA >= 1) { const tx = nxp + side * L * 0.5, tyy = nyp - L * 0.45; const m = Math.ceil(Math.abs(tx - nxp)); for (let k = 0; k <= m; k++) shadePx(c, S, nxp + (tx - nxp) * k / m, nyp + (tyy - nyp) * k / m, twigCol, 0.05, lf * 0.7, fog); }
        x = nxp; y = nyp;
      }
    }
  }
  if (T.bough == null || d > 30) return;
  const boughA = clamp01((30 - d) / 6);
  const NEED = [0.085, 0.13, 0.11], NEED_L = [0.2, 0.3, 0.25], NEED_W = [0.16, 0.2, 0.15];
  const zt = S.zt, Fg = S.fog, A = S.amb, M = S.moon, Fc = S.fireCol, topRows = 1.2 + (s > 60 ? 1 : 0);
  const flat = (al, lm, lf) => { const qm = Math.round(lm * 4) / 4, qf = Math.round(lf * 6) / 6; return [al[0] * (A[0] + qm * M[0] + qf * Fc[0]) * 255, al[1] * (A[1] + qm * M[1] + qf * Fc[1]) * 255, al[2] * (A[2] + qm * M[2] + qf * Fc[2]) * 255]; };
  for (let i = 0; i < 44; i++) {
    const wy = T.bough + i * (0.4 + rnd(T.seed + i * 3) * 0.14);
    if (wy > topVis + 1.4 || wy > T.height) break;
    const life = clamp01((T.height - wy) / (T.height - T.bough));
    for (const side of [-1, 1]) {
      if (rnd(T.seed * 13 + i * 2 + side) < 0.1) continue;
      const L = (0.3 + 1.3 * life) * (0.7 + 0.55 * rnd(T.seed * 3 + i * 5 + side)), Ls = L * s;
      const x0 = Xat(wy) + side * T.r * s * 0.5, y0 = Yw(wy);
      const xEnd = x0 + side * Ls;
      if (Math.max(x0, xEnd) < 0 || Math.min(x0, xEnd) >= GW) continue;
      if (y0 - 4 > GH || y0 + (0.5 * L + 0.5) * s < 0) continue;
      const droop = (0.22 + 0.16 * rnd(T.seed + i)) * L, curl = 0.1 * L;
      const lfB = fireAt(S, T.x + side * L * 0.5, wy - 0.2, T.z, 0, -0.8, -0.6, 0.5);
      const lmT = S.moonTrunk * (0.9 + 0.3 * (side * S.md[0] < 0 ? 1 : 0));
      const seedI = T.seed * 101 + i * 13 + side;
      const bc = [flat(NEED_L, lmT, lfB * 0.2), flat(NEED, S.moonTrunk * 0.2, lfB * 0.35), flat(NEED_W, 0.05, lfB)];
      const xs = Math.floor(Math.min(x0, xEnd)), xe = Math.ceil(Math.max(x0, xEnd));
      for (let X = Math.max(0, xs); X <= Math.min(GW - 1, xe); X++) {
        const u = (X + 0.5 - x0) / (side * Ls); if (u < 0 || u > 1) continue;
        // centre line: droops, then the tip curls up a little
        const yc = y0 + (droop * u * u - curl * Math.max(0, u - 0.8) * 5 * Math.max(0, u - 0.8)) * s;
        const wu = u * L * 22 + seedI;                                                    // needle tufts in world units
        const tuft = vn(wu, seedI * 0.37) , fine = rnd(((u * L * 60) | 0) * 131 + (seedI | 0));
        const thickTop = (0.03 + 0.05 * Math.sin(PI * Math.min(1, u * 1.1)) * (0.5 + tuft)) * s;
        const hang = ((0.05 + 0.2 * Math.sin(PI * Math.min(1, u * 1.08)) * (0.4 + 0.6 * life)) * (0.55 + 0.7 * tuft) + (fine > 0.75 ? 0.05 : 0)) * s;
        const ya = Math.max(0, Math.round(yc - thickTop)), yb = Math.min(GH - 1, Math.round(yc + hang));
        for (let Y = ya; Y <= yb; Y++) {
          const zi = Y * GW + X;
          if (zt && zt[zi] < d - 0.01) continue;
          if (boughA < 1 && boughA <= BT[((Y & 3) << 2) | (X & 3)]) continue;
          const dy = Y - ya, ci = dy < topRows ? 0 : (yb - Y < 1.2 && hang > 3) ? 2 : 1, col = bc[ci];
          const k = zi * 3, bt = BT[((Y & 3) << 2) | (X & 3)];
          const v = fog * 6, lo = v | 0, fr = v - lo, qg = (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > bt ? lo + 1 : lo) / 6;
          dd[k] = col[0] + (Fg[k] - col[0]) * qg; dd[k + 1] = col[1] + (Fg[k + 1] - col[1]) * qg; dd[k + 2] = col[2] + (Fg[k + 2] - col[2]) * qg;
        }
      }
    }
  }
}

// ---------------------------------------------------------------- undergrowth
export const proj = (S, x, y, z) => { const d = z - S.cam.z, s = S.f / d; return [S.cx + (x - S.cam.x) * s, S.H0 - (y - S.cam.y) * s, d, s]; };

/** A small filled triangle (screen points a, b, c2) shaded flat with (al, lm, lf, fog). */
function tri(c, S, a, b, c2, al, lm, lf, fog) {
  const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0], c2[0]))), x1 = Math.min(GW - 1, Math.ceil(Math.max(a[0], b[0], c2[0])));
  const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1], c2[1]))), y1 = Math.min(GH - 1, Math.ceil(Math.max(a[1], b[1], c2[1])));
  if (x1 - x0 > 200 || y1 - y0 > 200) return;
  const e = (p, q2, x, y) => (q2[0] - p[0]) * (y - p[1]) - (q2[1] - p[1]) * (x - p[0]);
  const area = e(a, b, c2[0], c2[1]); if (Math.abs(area) < 0.3) { shadePx(c, S, R(c2[0]), R(c2[1]), al, lm, lf, fog); return; }
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const px = x + 0.5, py = y + 0.5, w0 = e(b, c2, px, py), w1 = e(c2, a, px, py), w2 = e(a, b, px, py);
    if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) shadePx(c, S, x, y, al, lm, lf, fog);
  }
}
function stroke(c, S, a, b, al, lm, lf, fog, wpx = 1) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]))));
  for (let k = 0; k <= n; k++) {
    const X = R(a[0] + ((b[0] - a[0]) * k) / n), Y = R(a[1] + ((b[1] - a[1]) * k) / n);
    shadePx(c, S, X, Y, al, lm, lf, fog);
    if (wpx > 1) shadePx(c, S, X + 1, Y, al, lm, lf, fog);
  }
}
export { stroke };

const GRASS = [0.22, 0.3, 0.15], GRASS_L = [0.44, 0.5, 0.26], FERN = [0.16, 0.27, 0.12], FERN_L = [0.36, 0.5, 0.22];
const STONE = [0.32, 0.29, 0.27], STONE_L = [0.5, 0.45, 0.4], STICK = [0.42, 0.32, 0.24], STICK_L = [0.66, 0.54, 0.4], ROOT = [0.3, 0.23, 0.19];

/** Item kinds: tuft, fern, stick, stone, root. it = { kind, x, z, s (size m), seed, sway } */
export function drawItem(c, S, it, t) {
  const p = proj(S, it.x, 0, it.z); if (p[2] < 0.35) return;
  const [X, Y, d, s] = p; if (X < -s * 1.2 || X > GW + s * 1.2 || Y < -50 || Y > GH + s * 0.6) return;
  const fog = Math.min(1, S.fd(d) + (S.gfA ? S.gfA * (1 - Math.exp(-d / S.gfD)) * 0.6 : 0));
  const lfBase = fireAt(S, it.x, 0.15, it.z, 0, 0.5, -0.7, 0.5);
  const lm = S.moonGround * 0.7;
  const sw0 = (it.sway || 0) * (Math.sin(t * 1.3 + it.seed * 6) * 0.025) + (S.wind ? S.wind(it.x, it.z, t) : 0);
  if (it.kind === "tuft") {
    const n = 5 + ((it.seed * 7) | 0) % 6;
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 1.4 + (rnd(it.seed * 11 + i) - 0.5) * 0.4, h = it.s * (0.55 + 0.55 * rnd(it.seed * 13 + i));
      const bx = it.x + (rnd(it.seed * 5 + i) - 0.5) * it.s * 0.35;
      const P0 = proj(S, bx, 0, it.z), Pm = proj(S, bx + Math.sin(a) * h * 0.25 + sw0 * h, h * 0.55, it.z), P1 = proj(S, bx + Math.sin(a) * h * 0.65 + sw0 * h * 3, h * Math.cos(a * 0.7), it.z);
      const lit = i % 3 === 0;
      stroke(c, S, P0, Pm, lit ? GRASS_L : GRASS, lm * (lit ? 1.1 : 0.5), lfBase * (lit ? 1.1 : 0.7), fog, s > 200 ? 2 : 1);
      stroke(c, S, Pm, P1, lit ? GRASS_L : GRASS, lm * (lit ? 1.2 : 0.6), lfBase * (lit ? 1.2 : 0.8), fog, 1);
    }
  } else if (it.kind === "fern") {
    // fronds arching out from the crown; each leaflet is a small filled blade (lit upper side, dark lower side)
    const n = 6 + ((it.seed * 5) | 0) % 4;
    const fronds = [];
    for (let i = 0; i < n; i++) fronds.push([(i / n) * PI * 2 + it.seed * 3, it.s * (0.7 + 0.4 * rnd(it.seed * 3 + i))]);
    fronds.sort((p, q2) => Math.sin(q2[0]) - Math.sin(p[0]));                 // far fronds first
    for (const [ang, L] of fronds) {
      const dx = Math.cos(ang), dz = Math.sin(ang) * 0.85;
      const M = Math.max(4, Math.min(14, Math.ceil(L * s / 7)));
      let prev = null;
      for (let k = 0; k <= M; k++) {
        const u = k / M, hx = it.x + dx * L * u + sw0 * u * 2, hz = it.z + dz * L * u, hy = Math.max(0.01, L * (0.62 * u - 0.78 * u * u) + 0.04);
        const P = proj(S, hx, hy, hz);
        if (prev && k > 0 && k < M) {
          const lw = it.s * 0.2 * Math.sin(PI * Math.min(1, u * 1.1)) + 0.012;
          for (const sd of [-1, 1]) {
            const T1 = proj(S, hx - dz * lw * sd + dx * lw * 0.5, Math.max(0.01, hy - lw * 0.5), hz + dx * lw * sd + dz * lw * 0.5);
            const lit = sd > 0, al = lit ? FERN_L : FERN, lmv = lm * (lit ? 1.1 : 0.4), lfv = lfBase * (lit ? 1.0 : 0.5);
            tri(c, S, prev, P, T1, al, lmv, lfv, fog);
          }
        }
        if (prev) stroke(c, S, prev, P, FERN, lm * 0.35, lfBase * 0.5, fog, 1);
        prev = P;
      }
    }
  } else if (it.kind === "stick") {
    // a fallen twig: two bent segments, a lit top edge, a dark underside (reads as wood, not a crack)
    const a = it.seed * PI, L = it.s;
    const P0 = proj(S, it.x - Math.cos(a) * L / 2, 0.015, it.z - Math.sin(a) * L / 2), P1 = proj(S, it.x + Math.cos(a) * L / 2, 0.015, it.z + Math.sin(a) * L / 2), Pm = proj(S, it.x + 0.03, 0.022, it.z);
    if (P0[2] > 0.4 && P1[2] > 0.4) {
      const lmS = Math.max(0.3, lm * 1.4), wp = s > 55 ? 2 : 1;
      stroke(c, S, P0, Pm, STICK, lmS, lfBase * 1.1, fog, wp); stroke(c, S, Pm, P1, STICK, lmS, lfBase * 1.1, fog, wp);
      if (s > 55) { stroke(c, S, [P0[0], P0[1] - 1], [Pm[0], Pm[1] - 1], STICK_L, lmS * 1.3, lfBase * 1.3, fog, 1); stroke(c, S, [Pm[0], Pm[1] - 1], [P1[0], P1[1] - 1], STICK_L, lmS * 1.3, lfBase * 1.3, fog, 1); }
    }
  } else if (it.kind === "stone") {
    // an irregular rounded rock: lit top, dark outline, sits in the ground
    const r = it.s * s, h = r * (0.5 + 0.2 * rnd(it.seed * 3));
    if (r < 0.8) return;
    const ri = Math.ceil(r), hi = Math.ceil(h);
    for (let y = -hi; y <= 1; y++) for (let x = -ri - 1; x <= ri + 1; x++) {
      const ang = Math.atan2(y, x), rr = r * (0.85 + 0.15 * vn(ang * 2 + it.seed * 9, 1)), e = (x * x) / (rr * rr) + (y * y) / (h * h);
      if (e > 1 || y > 0.5) continue;
      const top = y < -h * 0.4 + x * 0.15, edge = e > 0.72 || y > -0.5;
      shadePx(c, S, X + x, Y + y, edge ? [0.08, 0.08, 0.1] : top ? STONE_L : STONE, edge ? 0.04 : lm * (top ? 0.85 : 0.35), lfBase * (edge ? 0.4 : top ? 1.1 : 0.6), fog);
    }
  } else if (it.kind === "root") {
    let px = it.x, pz = it.z, ang = it.seed * PI * 2;
    let prev = proj(S, px, 0.03, pz);
    for (let k = 0; k < 10; k++) {
      ang += (rnd(it.seed * 19 + k) - 0.5) * 0.9; px += Math.cos(ang) * it.s / 10; pz += Math.sin(ang) * it.s / 10 * 0.6;
      const P = proj(S, px, 0.035 * (1 - k / 11), pz);
      if (P[2] > 0.4 && prev[2] > 0.4) { stroke(c, S, prev, P, ROOT, lm * 0.9, lfBase, fog, P[3] > 90 ? 2 : 1); if (P[3] > 120) stroke(c, S, [prev[0], prev[1] - 1], [P[0], P[1] - 1], [0.4, 0.32, 0.27], lm * 1.2, lfBase * 1.2, fog, 1); }
      prev = P;
    }
  }
}
