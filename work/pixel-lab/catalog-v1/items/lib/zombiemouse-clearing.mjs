// catalog-v1 copy (2026-10-26) of work/pixel-lab/zombie-mouse/film/clearing.mjs (build, floor, texture sampling, shade, tufts,
// moonbeams, front plants); changes: no campfire, log, stone ring, firewood, grass strip blades or glow; the camera is the
// catalog camera mapped to a film camera (stage x = film x − 1000, stage y = film y + 560, horizon y 450, ground y 560 at the wide
// shot); the moon sits at the upper right, the canopy gap moves to the right-centre; the deep-forest side is plain open forest;
// the sky is drawn from the same cached gradient, moon and stars. Deterministic.
import { mix, hex, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, sm, lerp, rnd, clamp01, ease, frac } from "./zombiemouse-layout.mjs";
import { CLEARING, DEEP } from "./zombiemouse-places.mjs";
import { vnoise, fbm, hash2, hash2s } from "./zombiemouse-W-util.mjs";
import { MAT, Tex, texPine, texDeadTree, texBush, texStone, texLog, texFirewood, texFern, texSpruce } from "./zombiemouse-clearing-tex.mjs";
const R = Math.round;
const BYF = new Float32Array([0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16));
const by = (X, Y) => BYF[((Y & 3) << 2) | (X & 3)];
const bandQ = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > by(X, Y) ? fl + 1 : fl; };
const bandN = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.42 ? fl : f > 0.58 ? fl + 1 : (f - 0.42) / 0.16 > by(X, Y) ? fl + 1 : fl; };
// ---------------------------------------------------------------- materials: albedo ramps (lit later)
const RAMPS = {
  [MAT.needle]: ["#16302A", "#1E4034", "#2A543E", "#38684A", "#4A7E56", "#5E9462"],
  [MAT.bark]: ["#2C1E18", "#3E2C22", "#543C2C", "#6A4E38", "#826246", "#9A7856"],
  [MAT.moss]: ["#22382A", "#2E4A32", "#3C5E3A", "#4C7244", "#5E864E", "#729A5A"],
  [MAT.dirt]: ["#3A2E28", "#4C3C32", "#5E4C3E", "#725E4C", "#86705A", "#9A8468"],
  [MAT.ffloor]: ["#26221E", "#332C26", "#423830", "#52463A", "#625444", "#72624E"],
  [MAT.stone]: ["#3E3E48", "#55555F", "#6E6E78", "#888892", "#A2A2AC", "#BCBCC4"],
  [MAT.logbark]: ["#2E2016", "#433020", "#5A422C", "#725638", "#8A6A46", "#A48056"],
  [MAT.wood]: ["#6A4A30", "#86603C", "#A27A4C", "#BC925C", "#D4AA6E", "#E8C284"],
  [MAT.fern]: ["#1A3622", "#264A2C", "#346036", "#447642", "#588C4E", "#6CA05A"],
  [MAT.ash]: ["#2A2626", "#3A3434", "#4C4544", "#5E5654", "#706866", "#827A76"],
  [MAT.dead]: ["#3C3438", "#4E4448", "#605658", "#746A6A", "#8A8080", "#A09696"],
  [MAT.root]: ["#2A1E18", "#3A2A20", "#4C382A", "#5E4834", "#725A40", "#866C4E"],
  [MAT.char]: ["#141010", "#1E1816", "#2A201C", "#3A2C24", "#4A382C", "#5A4434"],
  [MAT.grass]: ["#1C3424", "#26462C", "#325A34", "#406E3E", "#508248", "#629652"],
};
const ALB = []; for (const k in RAMPS) ALB[k] = RAMPS[k].map(hex);
const AMB = [0.07, 0.085, 0.15], MOONC = [0.42, 0.56, 0.86], FIREC = [1.55, 0.98, 0.44], FIREADD = [40, 20, 4], FOGC = [52, 68, 112], FOGW = [160, 90, 56];
// ---------------------------------------------------------------- a tileable noise for fog and the ground (cheap lookups)
const NT = 256, NOISE = new Float32Array(NT * NT);
{ const per = (x, y, P) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const h = (a, b) => hash2(((a % P) + P) % P, ((b % P) + P) % P + 977); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v); };
  for (let y = 0; y < NT; y++) for (let x = 0; x < NT; x++) NOISE[y * NT + x] = 0.55 * per(x / 16, y / 16, 16) + 0.3 * per(x / 8, y / 8, 32) + 0.15 * per(x / 4, y / 4, 64); }
const nz = (x, y) => NOISE[((y | 0) & 255) * NT + ((x | 0) & 255)];
// ---------------------------------------------------------------- build: cameras, textures, sky
let B = null;
const DZ = 900;
function build() {
  // catalog cameras: film cam = { cx: stage cx + 1000, cy: stage cy − 560, z, sx 270, sy 450 }; the textures cover every camera the stage allows
  const CAMS = []; for (const z of [1, 1.85, 2.4]) for (const cx of [1000, 1270, 1540]) for (const cy of [-330, -110, -20]) CAMS.push({ cx, cy, z, sx: 270, sy: 450 });
  const SX = 270, SY = 450, WIDE = { cx: 1270, cy: -110, z: 1, sx: 270, sy: 450 };
  const zp = (cam, p) => 1 + (cam.z - 1) * p;
  const range = (p) => { let a = Infinity, b = -Infinity; for (const c of CAMS) { const z = zp(c, p); a = Math.min(a, c.cx * p - SX / z); b = Math.max(b, c.cx * p + (GW - SX) / z); } return [a - 14, b + 14]; };
  const XW = (p, x) => SX + (x - WIDE.cx * p) * zp(WIDE, p);
  const gyW = (p) => SY - WIDE.cy * p * zp(WIDE, p);
  const resOf = (p) => Math.min(3.4, Math.max(1.2, 2 * zp(WIDE, p)));
  const texes = [];
  const mkTex = (p, top, bottom = 12) => { const [u0, u1] = range(p), T = new Tex(p, u0, u1, top, bottom, resOf(p), texes.length + 1); texes.push(T); return T; };
  const eOf = (T) => Math.max(1, R(T.R / zp(WIDE, T.p)));
  const deepAt = () => false;
  const MOONP = { x: 400, y: 200, r: 34 };
  const gapTop = (X) => { const d = Math.abs(X - 330) / 190; return d < 1 ? 420 - 70 * (1 - d * d) : -9999; }; // the canopy gap (wide shot)

  // far hills with a fringe of tiny pines (p 0.1)
  { const T = mkTex(0.1, -200, 6), oid = T.newId();
    for (let i = 0; i < T.w; i++) { const wx = T.u0 + i / T.R, ridge = -(70 + 55 * fbm(wx * 0.006, 3) + 22 * vnoise(wx * 0.03, 9)), fringe = ((wx * 0.9) % 6 + 6) % 6 < 3 ? 4 + 6 * vnoise(wx * 0.4, 2) : 0;
      for (let j = Math.floor(T.J(ridge - fringe)); j < T.h; j++) { const wy = T.v0 + j / T.R, top = wy < ridge + 3; T.put(i, j, MAT.needle, top ? 6 : 3, top ? 12 : 4, 0, oid); } } }

  // pine layers: back to front; the clearing stays open in the middle, the deep forest is dense
  const SPEC = [
    { p: 0.2, h: [140, 230], w: 0.46, sp: 16, bare: 0.06 },
    { p: 0.32, h: [200, 320], w: 0.44, sp: 24, bare: 0.1 },
    { p: 0.46, h: [260, 420], w: 0.42, sp: 34, bare: 0.18 },
    { p: 0.6, h: [340, 520], w: 0.4, sp: 50, bare: 0.32, bush: true },
    { p: 0.74, h: [420, 620], w: 0.38, sp: 64, bare: 0.4, bush: true, open: [60, 470] },
    { p: 0.86, h: [500, 700], w: 0.36, sp: 70, bare: 0.46, open: [20, 520] },
    { p: 0.95, h: [560, 760], w: 0.34, sp: 84, bare: 0.5, open: [-10, 530], frame: true },
  ];
  for (const S of SPEC) {
    const T = mkTex(S.p, -S.h[1] * 1.08, 8), e = eOf(T); let x = T.u0 - 20, i = 0;
    while (x < T.u0 + T.w / T.R + 20) {
      const seed = R(S.p * 1000) + i * 13, xw = XW(S.p, x), deep = deepAt(S.p, x);
      let H = lerp(S.h[0], S.h[1], Math.pow(rnd(seed + 1), 0.8)) * (rnd(seed + 9) > 0.82 ? 0.55 : 1), W = H * S.w * (0.7 + 0.6 * rnd(seed + 2));
      let skip = S.open && xw > S.open[0] && xw < S.open[1] && !deep;
      const gt = gapTop(xw); if (!skip && gt > -999 && S.p >= 0.32) { const maxH = (gyW(S.p) - gt) / zp(WIDE, S.p); if (maxH < S.h[0] * 0.5) skip = S.p >= 0.6; else H = Math.min(H, maxH); W = H * S.w; }
      if (!skip) {
        texSpruce(T, x, seed, H, W, S.bare * (0.8 + 0.4 * rnd(seed + 4)), { dark: deep ? 2 : 0, rim: R(7 + 8 * clamp01((S.p - 0.2) / 0.7)) });
        if (S.bush && rnd(seed + 5) > 0.3) texFern(T, x + (rnd(seed + 6) - 0.5) * 30, seed, 18 + rnd(seed + 7) * 16, 30);
      }
      x += S.sp * (deep ? 0.55 : 1) * (0.35 + 1.3 * rnd(seed + 8)); i++;
    }
  }
  // the actors' plane: a few rocks and ferns on the ground (no log, no fire ring, no firewood)
  const T1 = mkTex(1, -40, 6);
  for (const [x, w, h] of [[1094, 9, 5], [1228, 5, 3], [1404, 8, 4], [1418, 5, 3], [1030, 12, 6], [1510, 10, 5], [1600, 14, 7]]) texStone(T1, x, w, h, x, 5);
  for (const x of [1004, 1046, 1420, 1470, 1530, 1585, 1640, 1700]) texFern(T1, x, x, 16 + rnd(x) * 12, 26);
  // front plants (p > 1): never rise into the main zone above y ≈ 615 in any camera of the shots
  const FRONT = [{ p: 1.12, n: 14, s: 0.5 }, { p: 1.3, n: 18, s: 0.65 }, { p: 1.55, n: 18, s: 0.8 }, { p: 1.9, n: 22, s: 1 }, { p: 2.35, n: 22, s: 1.2 }, { p: 2.9, n: 26, s: 1.4 }].map((F, fi) => {
    const hMax = 60 * F.s, T = new Tex(F.p, ...range(F.p), -hMax * 1.3, 8, Math.min(4, resOf(F.p)), 91 + fi);
    for (let i = 0; i < F.n * 6 && T.nobj < F.n; i++) {
      const x = T.u0 + rnd(i * 7 + fi * 101) * (T.w / T.R), kind = rnd(i * 11 + fi), h = (10 + rnd(i * 3 + fi) * 30) * F.s, wdt = h * 1.5;
      let ok = true; for (let k = 0; k < CAMS.length && ok; k += 3) { const c = CAMS[k], z = zp(c, F.p), X = SX + (x - c.cx * F.p) * z, Yt = SY + (-h - c.cy * F.p) * z; if (X + wdt * z * 0.6 > 50 && X - wdt * z * 0.6 < 490 && Yt < 640) ok = false; }
      if (!ok) continue;
      if (kind < 0.62) texFern(T, x, i + fi * 1000, h, wdt * 0.8); else if (kind < 0.8) texStone(T, x, h * 0.9, h * 0.45, i, 2); else texFern(T, x, i + fi * 1000 + 3, h * 0.6, wdt * 0.5, MAT.grass);
    }
    return T;
  });
  // small grass tufts scattered on the ground (vector blades, drawn with a depth test)
  const TUFTS = [];
  for (let i = 0; i < 1500; i++) {
    const p = 0.62 + Math.pow(rnd(i * 3 + 1), 1.15) * 2.6, xr = 900 + rnd(i * 3 + 2) * 900, xr0 = xr;
    const inClear = xr > CLEARING.x0 && xr < CLEARING.x1; if (!inClear && rnd(i * 5) > 0.45) continue;
    TUFTS.push({ xr, p, h: (3 + rnd(i * 7) * 6) * (inClear ? 1 : 1.3), n: 3 + Math.floor(rnd(i * 9) * 5), seed: i, dry: rnd(i * 11) > 0.8 });
  }
  TUFTS.sort((a, b) => a.p - b.p);
  // ---- sky (static, screen space): gradient, the Milky Way, stars, the moon with a halo, thin clouds
  const SKYH = 760, sky = new Float32Array(GW * SKYH * 3);
  const SK = ["#03040A", "#060914", "#0A0F20", "#0E152C", "#131C38", "#182444", "#1E2C50"].map(hex);
  for (let Y = 0; Y < SKYH; Y++) for (let X = 0; X < GW; X++) {
    const mw = Math.exp(-(((Y - 120 - (X - 270) * 0.55) / 70) ** 2)) * (0.6 + 0.6 * nz(X * 0.6, Y * 0.6)), moonG = Math.exp(-((X - MOONP.x) ** 2 + (Y - MOONP.y) ** 2) / (2 * 110 * 110));
    const u = Math.min(6, (Y / 420) * 4.2 + mw * 1.1 + moonG * 2.4), q = Math.min(6, bandQ(u, X, Y)), k = (Y * GW + X) * 3;
    sky[k] = SK[q][0]; sky[k + 1] = SK[q][1]; sky[k + 2] = SK[q][2];
    if (mw > 0.45 && hash2(X * 3 + 1, Y * 7) > 0.93) { const b = 60 + 80 * hash2(X, Y); sky[k] += b * 0.6; sky[k + 1] += b * 0.65; sky[k + 2] += b * 0.8; }
  }
  const stars = []; for (let i = 0; i < 170; i++) { const X = R(rnd(i * 5 + 3) * (GW - 1)), Y = R(Math.pow(rnd(i * 5 + 4), 1.3) * 520); if (Math.hypot(X - MOONP.x, Y - MOONP.y) < 50) continue; stars.push({ X, Y, b: 0.4 + 0.6 * rnd(i * 5 + 5), f: 1 + rnd(i) * 3, ph: rnd(i * 9) * 6.28, big: rnd(i * 13) > 0.92 }); }
  // the moon: pale disc, maria, a soft halo ring
  for (let Y = MOONP.y - 70; Y < MOONP.y + 70; Y++) for (let X = MOONP.x - 70; X < MOONP.x + 70; X++) {
    if (X < 0 || Y < 0 || X >= GW) continue; const d = Math.hypot(X - MOONP.x, Y - MOONP.y), k = (Y * GW + X) * 3;
    if (d <= MOONP.r) { const sh = (X - MOONP.x) * 0.02 + (Y - MOONP.y) * 0.015, mar = fbm(X * 0.09, Y * 0.09) > 0.56, rim = d > MOONP.r - 1.2; const col = hex(rim ? "#AEB6CC" : mar ? (sh > 0.1 ? "#9AA4BE" : "#AEB8D0") : sh > 0.25 ? "#C6CEE0" : "#E2E8F2"); sky[k] = col[0]; sky[k + 1] = col[1]; sky[k + 2] = col[2]; }
    else if (d < MOONP.r + 22) { const a = (1 - (d - MOONP.r) / 22) ** 2 * 0.5; if (a > by(X, Y) * 0.9) { sky[k] += (70 - sky[k]) * 0.5; sky[k + 1] += (86 - sky[k + 1]) * 0.5; sky[k + 2] += (128 - sky[k + 2]) * 0.5; } }
  }
  for (const [cy0, xa, xb, th] of []) for (let Y = cy0 - 12; Y < cy0 + 12; Y++) for (let X = Math.max(0, xa); X < Math.min(GW, xb); X++) {
    const env = Math.min(clamp01((X - xa) / 80), clamp01((xb - X) / 80)), yc = cy0 + 2 * Math.sin(X * 0.01 + cy0), dv = (Y - yc) / (th * (0.5 + nz(X * 0.5, cy0))), den = (1 - dv * dv) * env + (nz(X * 1.3, Y * 2) - 0.5) * 0.8;
    if (den < 0.4) continue; const k = (Y * GW + X) * 3, lit = Math.exp(-((X - MOONP.x) ** 2 + (Y - MOONP.y) ** 2) / (2 * 120 * 120)), col = dv < -0.3 ? [46 + 60 * lit, 56 + 66 * lit, 86 + 70 * lit] : [22, 28, 48];
    sky[k] = col[0]; sky[k + 1] = col[1]; sky[k + 2] = col[2];
  }
  return { texes, FRONT, TUFTS, sky, SKYH, stars, MOONP };
}
const get = () => (B ??= build());
const N = GW * GH, GA = new Uint8Array(N), GBb = new Uint8Array(N), GK = new Float32Array(N), GP = new Float32Array(N), GF = new Uint8Array(N);
function floorTexel(xr, p, X, Y, k) {
  const wz = DZ / p, n1 = nz(xr * 0.16, wz * 0.12), n2 = nz(xr * 0.7 + 50, wz * 0.5), sp = hash2s(Math.floor(xr * 1.3), Math.floor(wz * 0.7));
  let mat = MAT.ffloor, tone = 6 + (n1 - 0.5) * 6, moon = 6 + (n2 - 0.5) * 4 - Math.max(0, p - 1.3) * 1.2;
  const inClear = xr > CLEARING.x0 + (n1 - 0.5) * 80 && xr < CLEARING.x1 + (n1 - 0.5) * 120 && p > 0.5;
  if (inClear) { mat = MAT.moss; moon = 8 + (n2 - 0.5) * 4 - Math.max(0, p - 1.3) * 1.5; tone = 6 + (n1 - 0.5) * 5 + (n2 > 0.66 ? 2 : n2 < 0.32 ? -2 : 0); const st = hash2s(Math.floor(xr * 2.4), Math.floor(wz * 1.1)); if (st > 0.88) { tone += 3; moon += 4; } else if (st < 0.08) tone -= 3; }
  const deepK = clamp01((xr - DEEP.x0 + 70) / 170); if (deepK > nz(xr * 0.45 + 11, wz * 0.35 + 5) * 1.1 - 0.05) { mat = MAT.ffloor; tone -= 1.5 * deepK; if (n2 > 0.6) { mat = MAT.fern; tone = 4 + (n2 - 0.6) * 12; } }
  // the trampled path he came along, and the ash patch around the fire
  if (Math.abs(wz - DZ) < 18 + n1 * 10 && xr < 1262 && xr > 960) { mat = MAT.dirt; tone = 6 + (n2 - 0.5) * 5; }
  if (sp > 0.994) { mat = MAT.stone; tone = 6; moon = 9; } else if (sp > 0.99) { mat = MAT.root; tone = 4; }
  GA[k] = (mat << 4) | Math.max(0, Math.min(15, tone | 0)); GBb[k] = (Math.max(0, Math.min(15, moon | 0)) << 4) | 8;
}

function sampleTex(T, cam, SX, SY) {
  const p = T.p, z = 1 + (cam.z - 1) * p, cxp = cam.cx * p, cyp = cam.cy * p, Rr = T.R;
  const y0 = Math.max(0, Math.floor(SY + (T.v0 - cyp) * z)), y1 = Math.min(GH - 1, Math.ceil(SY + (T.v1 - cyp) * z));
  const di = Rr / z, base = (cxp + (0 - SX) / z - T.u0) * Rr, keyBase = p;
  for (let Y = y0; Y <= y1; Y++) {
    const j = Math.floor(((cyp + (Y + 0.5 - SY) / z) - T.v0) * Rr); if (j < 0 || j >= T.h) continue;
    const row = j * T.w, out = Y * GW;
    let fi = base + 0.5 * di;
    for (let X = 0; X < GW; X++, fi += di) {
      const i = fi | 0; if (i < 0 || i >= T.w) continue;
      const a = T.a[row + i]; if (!a) continue;
      const k = out + X; GA[k] = a; GBb[k] = T.b[row + i]; GK[k] = keyBase + (T.o[row + i] % 1000) * 1e-6; GP[k] = p; GF[k] = 0;
    }
  }
}

let GF_cur = 0;
function shade(a, b, p, X, Y, L, o) {
  const mat = a >> 4, ramp = ALB[mat], n = ramp.length - 1, tone = (a & 15) / 15 * n, ti = Math.max(0, Math.min(n, bandN(tone, X, Y))), al = ramp[ti];
  const moon = (b >> 4) / 15, nrm = ((b & 15) - 8) / 7;
  const z = 1 + (L.cz - 1) * p, dx = (X - L.fx) / z, dy = (Y - L.fy) / z, ip = 1 / p, dz = ip > 1 ? (ip - 1) * 150 : (1 - ip) * 420;
  const fac = mat === MAT.moss || mat === MAT.ffloor || mat === MAT.dirt || mat === MAT.ash ? (GF_cur ? 0.85 : 0.7) : Math.max(0.15, 0.55 + 0.45 * nrm * ((L.fx - X) / Math.sqrt((L.fx - X) * (L.fx - X) + 900 * z * z)));
  const I = 0, Iq = 0;
  const ml = (0.08 + 0.92 * moon * moon) * L.moonK, am = L.ambK;
  let r = al[0] * (AMB[0] * am + MOONC[0] * ml + FIREC[0] * Iq) + FIREADD[0] * Iq, g = al[1] * (AMB[1] * am + MOONC[1] * ml + FIREC[1] * Iq) + FIREADD[1] * Iq, bb = al[2] * (AMB[2] * am + MOONC[2] * ml + FIREC[2] * Iq) + FIREADD[2] * Iq;
  // fog: farther layers sink into moonlit haze; low ground fog drifts between the trunks; warm near the fire
  let f = p < 1 ? 1 - Math.exp(-(1 / p - 1) * 0.3) : 0;
  if (p < 1.02 && p > 0.12) { const gyp = L.SY - L.cy * p * z, hgt = (gyp - Y) / z; if (hgt > -2) { const w = clamp01((1.05 - p) / 0.45) * (0.45 + 0.75 * nz(X * 0.5 + L.t * 7, Y * 0.9 + p * 40)); f = 1 - (1 - f) * (1 - Math.exp(-Math.max(0, hgt) / 40) * 0.7 * w); } }
  f = Math.min(0.92, f + L.dark * 0.25 * (p < 1 ? 1 : 0));
  const fq = bandN(f * 6, X, Y) / 6, warm = Math.min(1, I * 0.7);
  const fr = (FOGC[0] + (FOGW[0] - FOGC[0]) * warm) * L.fogK, fg = (FOGC[1] + (FOGW[1] - FOGC[1]) * warm) * L.fogK, fb = (FOGC[2] + (FOGW[2] - FOGC[2]) * warm) * L.fogK;
  o[0] = r + (fr - r) * fq; o[1] = g + (fg - g) * fq; o[2] = bb + (fb - bb) * fq;
  return I;
}
function drawTufts(c, Bc, cam, t, L, pFrom, pTo, depthTest) {
  const d = c.d, o = [0, 0, 0];
  for (const tf of Bc.TUFTS) {
    if (tf.p < pFrom || tf.p >= pTo) continue;
    const z = 1 + (cam.z - 1) * tf.p, bx = cam.sx + (tf.xr * tf.p - cam.cx * tf.p) * z, by0 = cam.sy + (0 - cam.cy * tf.p) * z;
    if (bx < -20 || bx > GW + 20 || by0 > GH + 2 || by0 < 0) continue;
    for (let b = 0; b < tf.n; b++) {
      const lean = (rnd(tf.seed * 13 + b) - 0.5) * 0.9 + 0.06 * Math.sin(t * 1.4 + tf.xr * 0.07), hh = tf.h * (0.55 + 0.45 * rnd(tf.seed * 17 + b)) * z, x0 = bx + (b - tf.n / 2) * 0.7 * Math.sqrt(z);
      const n = Math.max(2, Math.ceil(hh));
      for (let i = 0; i < n; i++) {
        const u = i / n, X = R(x0 + Math.sin(lean) * hh * u * u), Y = R(by0 - Math.cos(lean) * hh * u);
        if (X < 0 || X >= GW || Y < 0 || Y >= GH) continue;
        const k = Y * GW + X; if (depthTest && GK[k] >= tf.p - 0.004) continue;
        GF_cur = 0; shade(((tf.dry ? MAT.wood : MAT.grass) << 4) | (tf.dry ? 1 + (u * 4 | 0) : 2 + (u * 10 | 0)), ((3 + u * 9) << 4) | 8, tf.p, X, Y, L, o);
        const q = k * 3; d[q] = Math.min(255, o[0]); d[q + 1] = Math.min(255, o[1]); d[q + 2] = Math.min(255, o[2]);
      }
    }
  }
}

function drawMoonbeams(c, cam, t, L) {
  const d = c.d, p = 0.6, z = 1 + (cam.z - 1) * p, k = 0.55 * (1 - 0.35 * L.dark);
  for (const [lx, w, ph] of [[905, 26, 0], [968, 18, 1.7], [1032, 30, 3.1]]) {
    const X0 = cam.sx + (lx - cam.cx * p) * z; if (X0 < -200 || X0 > GW + 260) continue;
    const yTop = 0, yBot = cam.sy + (0 - cam.cy * p) * z;
    for (let Y = yTop; Y < Math.min(GH, yBot); Y++) {
      const xc = X0 + (Y - yBot) * -0.42, ww = w * z * (0.6 + 0.4 * Y / yBot), fade = Math.min(1, Y / 120) * (0.75 + 0.25 * Math.sin(t * 0.6 + ph + Y * 0.01));
      for (let X = Math.max(0, R(xc - ww)); X <= Math.min(GW - 1, R(xc + ww)); X++) {
        const u = Math.abs(X - xc) / ww, I = (1 - u * u) * k * fade * (0.6 + 0.5 * nz(X * 0.4, Y * 0.2 - t * 6));
        const lv = bandN(I * 2.6, X, Y); if (lv <= 0 || GK[Y * GW + X] >= 0.9) continue;
        const q = (Y * GW + X) * 3, a = Math.min(2, lv) * 0.085; d[q] += (110 - d[q]) * a; d[q + 1] += (140 - d[q + 1]) * a; d[q + 2] += (196 - d[q + 2]) * a;
      }
    }
  }
}

function directTex(c, T, cam, t, L) {
  const p = T.p, z = 1 + (cam.z - 1) * p, cxp = cam.cx * p, cyp = cam.cy * p, Rr = T.R, SX = cam.sx, SY = cam.sy, d = c.d, o = [0, 0, 0];
  const y0 = Math.max(0, Math.floor(SY + (T.v0 - cyp) * z)), y1 = Math.min(GH - 1, Math.ceil(SY + (T.v1 - cyp) * z)), di = Rr / z, base = (cxp - SX / z - T.u0) * Rr;
  const at = (X, Y) => { const j = Math.floor(((cyp + (Y + 0.5 - SY) / z) - T.v0) * Rr), i = Math.floor(base + (X + 0.5) * di); return i >= 0 && j >= 0 && i < T.w && j < T.h ? j * T.w + i : -1; };
  GF_cur = 0;
  for (let Y = y0; Y <= y1; Y++) for (let X = 0; X < GW; X++) {
    const ti = at(X, Y); if (ti < 0) continue; const a = T.a[ti]; if (!a) continue;
    shade(a, T.b[ti], p, X, Y, L, o);
    const oid = T.o[ti], edge = (dx, dy) => { const t2 = at(X + dx, Y + dy); return t2 < 0 || !T.a[t2] || T.o[t2] < oid; };
    if (edge(-1, 0) || edge(1, 0) || edge(0, -1) || edge(0, 1)) { o[0] *= 0.32; o[1] *= 0.32; o[2] *= 0.36; }
    const q = (Y * GW + X) * 3; d[q] = Math.min(255, o[0]); d[q + 1] = Math.min(255, o[1]); d[q + 2] = Math.min(255, o[2]);
  }
}


function lightCtx(cam, t, dark) { return { fx: 0, fy: 0, cz: cam.z, cy: cam.cy, SY: cam.sy, t, fire: 0, dark, moonK: 1 - 0.55 * dark, ambK: 1 - 0.45 * dark, fogK: 1 - 0.5 * dark }; }

/** Everything behind the props, into c (a canvas or a dissolve view); cam is a film camera { cx, cy, z, sx, sy }. */
export function drawClearing(c, cam, t) {
  const Bc = get(), SX = cam.sx, SY = cam.sy, L = lightCtx(cam, t, 0), d = c.d;
  GA.fill(0); GK.fill(-1); GF.fill(0);
  // objects first, then the floor only where no object covers it (the film overwrote the floor there anyway: same pixels)
  for (const T of Bc.texes) sampleTex(T, cam, SX, SY);
  const a2 = -(cam.z - 1) * cam.cy, b2 = -cam.cy;
  for (let Y = Math.max(0, Math.floor(SY) + 1); Y < GH; Y++) {
    const p = a2 > 1e-9 ? (-b2 + Math.sqrt(b2 * b2 + 4 * a2 * (Y + 0.5 - SY))) / (2 * a2) : (Y + 0.5 - SY) / b2; if (!(p > 0.04)) continue;
    const z = 1 + (cam.z - 1) * p, row = Y * GW;
    for (let X = 0; X < GW; X++) { const k = row + X; if (GA[k]) continue; const xr = (cam.cx * p + (X + 0.5 - SX) / z) / p; floorTexel(xr, p, X, Y, k); GK[k] = p - 0.003; GP[k] = p; GF[k] = 1; }
  }
  const o = [0, 0, 0], sk = Bc.sky, skyK = 1;
  for (let Y = 0; Y < GH; Y++) for (let X = 0; X < GW; X++) {
    const k = Y * GW + X, q = k * 3;
    if (GK[k] < 0) { const s = Math.min(Bc.SKYH - 1, Y) * GW * 3 + X * 3; d[q] = sk[s] * skyK; d[q + 1] = sk[s + 1] * skyK; d[q + 2] = sk[s + 2] * skyK; continue; }
    GF_cur = GF[k];
    shade(GA[k], GBb[k], GP[k], X, Y, L, o);
    if (!GF[k]) { const key = GK[k] - 1e-5; if ((X > 0 && GK[k - 1] < key) || (X < GW - 1 && GK[k + 1] < key) || (Y > 0 && GK[k - GW] < key) || (Y < GH - 1 && GK[k + GW] < key)) { o[0] *= 0.32; o[1] *= 0.32; o[2] *= 0.36; } }
    d[q] = o[0] > 255 ? 255 : o[0]; d[q + 1] = o[1] > 255 ? 255 : o[1]; d[q + 2] = o[2] > 255 ? 255 : o[2];
  }
  for (const s of Bc.stars) { const k = s.Y * GW + s.X; if (GK[k] >= 0) continue; const tw = s.b * (0.55 + 0.45 * Math.sin(t * s.f + s.ph)) * skyK, q = k * 3, col = s.big ? [236, 240, 255] : [180, 196, 240];
    for (let j = 0; j < 3; j++) d[q + j] += (col[j] - d[q + j]) * tw;
    if (s.big && tw > 0.45) for (const dd of [1, -1, GW, -GW]) { const k2 = k + dd; if (k2 < 0 || k2 >= N || GK[k2] >= 0) continue; for (let j = 0; j < 3; j++) d[k2 * 3 + j] += (col[j] - d[k2 * 3 + j]) * (tw - 0.45) * 0.6; } }
  drawMoonbeams(c, cam, t, L);
  drawTufts(c, Bc, cam, t, L, 0, 1.0, true);
}
/** Foreground plants and tufts (p ≥ 1), over the props. */
export function drawClearingFront(c, cam, t) {
  const Bc = get(), L = lightCtx(cam, t, 0);
  drawTufts(c, Bc, cam, t, L, 1.0, 9, false);
  for (const T of Bc.FRONT) directTex(c, T, cam, t, L);
}
