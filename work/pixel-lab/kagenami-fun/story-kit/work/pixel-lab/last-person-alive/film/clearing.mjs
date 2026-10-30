// «The last person alive» — Builder W: shots C and E, the forest clearing at night (side view).
//   drawClearing(c, cam, t, st)       — night sky (moon, stars, the Milky Way) through a gap in the canopy, layered pines
//                                       with fog between them, the clearing ground, the stone ring and a living campfire
//                                       (flames, embers, sparks, smoke, light pooling around it), the log she sits on, the
//                                       deep dark forest to the right of DEEP.x0.
//   drawClearingFront(c, cam, t, st)  — the tall grass strip on the actors' plane (sways; shakes and parts where
//                                       st.rustle = { x, k } passes; pressed down where he falls), ferns, roots and stones
//                                       in front, down to the bottom edge.
// st = { fire: 0..1, dark: 0..1, rustle: { x, k } | null }. The camera zooms continuously, so the world is a tiny
// deferred renderer: layer textures (clearing-tex.mjs) are sampled at the current zoom, then lit in screen space with
// the same moon + fire model as light.mjs (banded, Bayer seams), fogged by depth, and outlined 1 px where an object
// stands in front of something farther. Pure functions of (cam, t, st).
import { mix, hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, sm, lerp, rnd, clamp01, ease, frac } from "./layout.mjs";
import { EV, SHOTS } from "./timeline.mjs";
import { CLEARING, FIRE, LOG, GRASS, DEEP, HERO_STAND } from "./places.mjs";
import { camClearing } from "./camera.mjs";
import { fireScreen, flicker, fireFall, FIRE_H } from "./light.mjs";
import { vnoise, fbm, hash2, hash2s } from "./W-util.mjs";
import { MAT, Tex, texPine, texDeadTree, texBush, texStone, texLog, texFirewood, texFern, texSpruce } from "./clearing-tex.mjs";

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
  const ranges = SHOTS.filter((s) => s[0] === "clearing").map((s) => [s[1] - 0.3, s[2] + 0.3]);
  const CAMS = []; for (const [a, b] of ranges) for (let t = a; t <= b; t += 0.05) CAMS.push(camClearing(t));
  const SX = CAMS[0].sx, SY = CAMS[0].sy, WIDE = camClearing(EV.laughs + 0.8), END = camClearing(EV.and1), CLOSE = camClearing(EV.mouse0End + 0.2);
  const zp = (cam, p) => 1 + (cam.z - 1) * p;
  const range = (p) => { let a = Infinity, b = -Infinity; for (const c of CAMS) { const z = zp(c, p); a = Math.min(a, c.cx * p - SX / z); b = Math.max(b, c.cx * p + (GW - SX) / z); } return [a - 14, b + 14]; };
  const XW = (p, x) => SX + (x - WIDE.cx * p) * zp(WIDE, p), XE = (p, x) => SX + (x - END.cx * p) * zp(END, p);
  const gyW = (p) => SY - WIDE.cy * p * zp(WIDE, p);
  const resOf = (p) => Math.min(3.4, Math.max(1.2, 2 * zp(WIDE, p)));
  const texes = [];
  const mkTex = (p, top, bottom = 12) => { const [u0, u1] = range(p), T = new Tex(p, u0, u1, top, bottom, resOf(p), texes.length + 1); texes.push(T); return T; };
  const eOf = (T) => Math.max(1, R(T.R / zp(WIDE, T.p)));
  const deepAt = (p, x) => XE(p, x) > 200 + (1 - p) * 40;                   // the dense forest the mouse came from
  const MOONP = { x: 142, y: 186, r: 30 };
  const gapTop = (X) => { const d = Math.abs(X - 190) / 150; return d < 1 ? 330 - 60 * (1 - d * d) : -9999; }; // the canopy gap (wide shot)

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
  // the actors' plane: the log, the back half of the stone ring, firewood, a few rocks and roots
  const T1 = mkTex(1, -40, 6), e1 = eOf(T1);
  texLog(T1, LOG.x0, LOG.x1, LOG.top, e1);
  const ring = []; for (let k = 0; k < 11; k++) { const a = (k / 11) * Math.PI * 2 + 0.3, sx = FIRE.x + Math.cos(a) * FIRE.r * 1.05, back = Math.sin(a) < 0.05; ring.push({ x: sx, back, w: 8.5 + rnd(k + 40) * 4, h: 6 + rnd(k + 50) * 3, a }); }
  for (const s of ring.filter((s) => s.back).sort((a, b) => Math.sin(b.a) - Math.sin(a.a))) texStone(T1, s.x, s.w * 0.85, s.h * 0.9 + 1.5, R(s.x), 6);
  texFirewood(T1, FIRE.x, e1);
  for (const [x, w, h] of [[1094, 9, 5], [1228, 5, 3], [1404, 8, 4], [1418, 5, 3], [1030, 12, 6], [1510, 10, 5], [1600, 14, 7]]) texStone(T1, x, w, h, x, 5);
  for (const x of [1004, 1046, 1420, 1470, 1530, 1585, 1640, 1700]) texFern(T1, x, x, 16 + rnd(x) * 12, 26);
  // the front half of the ring (in front of the flames)
  const TF = new Tex(1.03, range(1.03)[0], range(1.03)[1], -20, 6, resOf(1.03), 90);
  for (const s of ring.filter((s) => !s.back).sort((a, b) => Math.sin(a.a) - Math.sin(b.a))) texStone(TF, s.x, s.w, s.h, R(s.x) + 7, 7);
  // front plants (p > 1): never rise into the main zone above y ≈ 615 in any camera of the shots
  const FRONT = [{ p: 1.12, n: 14, s: 0.5 }, { p: 1.3, n: 18, s: 0.65 }, { p: 1.55, n: 18, s: 0.8 }, { p: 1.9, n: 22, s: 1 }, { p: 2.35, n: 22, s: 1.2 }, { p: 2.9, n: 26, s: 1.4 }].map((F, fi) => {
    const hMax = 60 * F.s, T = new Tex(F.p, ...range(F.p), -hMax * 1.3, 8, Math.min(4, resOf(F.p)), 91 + fi);
    for (let i = 0; i < F.n * 6 && T.nobj < F.n; i++) {
      const x = T.u0 + rnd(i * 7 + fi * 101) * (T.w / T.R), kind = rnd(i * 11 + fi), h = (10 + rnd(i * 3 + fi) * 30) * F.s, wdt = h * 1.5;
      let ok = true; for (let k = 0; k < CAMS.length && ok; k += 3) { const c = CAMS[k], z = zp(c, F.p), X = SX + (x - c.cx * F.p) * z, Yt = SY + (-h - c.cy * F.p) * z; if (X + wdt * z * 0.6 > 50 && X - wdt * z * 0.6 < 490 && Yt < 618) ok = false; }
      if (!ok) continue;
      if (kind < 0.62) texFern(T, x, i + fi * 1000, h, wdt * 0.8); else if (kind < 0.8) texStone(T, x, h * 0.9, h * 0.45, i, 2); else texFern(T, x, i + fi * 1000 + 3, h * 0.6, wdt * 0.5, MAT.grass);
    }
    return T;
  });
  // small grass tufts scattered on the ground (vector blades, drawn with a depth test)
  const TUFTS = [];
  for (let i = 0; i < 1500; i++) {
    const p = 0.62 + Math.pow(rnd(i * 3 + 1), 1.15) * 2.6, xr = 900 + rnd(i * 3 + 2) * 900, dF = ((xr - FIRE.x) / 30) ** 2 + ((DZ / p - DZ) / 34) ** 2;
    if (dF < 1.3 || (xr > LOG.x0 - 4 && xr < LOG.x1 + 4 && Math.abs(p - 1) < 0.03)) continue;
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
  return { SX, SY, CAMS, WIDE, END, CLOSE, texes, T1, TF, FRONT, TUFTS, sky, SKYH, stars, MOONP, ring, zp, XE };
}
const get = () => (B ??= build());

// ---------------------------------------------------------------- per-frame buffers
const N = GW * GH, GA = new Uint8Array(N), GBb = new Uint8Array(N), GK = new Float32Array(N), GP = new Float32Array(N), GF = new Uint8Array(N);

/** Floor texel at real-world (xr, wz) for depth p → writes GA/GB. Moss in the clearing, ash by the fire, needles in the forest. */
function floorTexel(xr, p, X, Y, k) {
  const wz = DZ / p, n1 = nz(xr * 0.16, wz * 0.12), n2 = nz(xr * 0.7 + 50, wz * 0.5), sp = hash2s(Math.floor(xr * 1.3), Math.floor(wz * 0.7));
  let mat = MAT.ffloor, tone = 5 + (n1 - 0.5) * 6, moon = 4 + (n2 - 0.5) * 4 - Math.max(0, p - 1.3) * 2;
  const inClear = xr > CLEARING.x0 + (n1 - 0.5) * 80 && xr < CLEARING.x1 + (n1 - 0.5) * 120 && p > 0.5;
  if (inClear) { mat = MAT.moss; moon = 6 + (n2 - 0.5) * 4 - Math.max(0, p - 1.3) * 3; tone = 5 + (n1 - 0.5) * 5 + (n2 > 0.66 ? 2 : n2 < 0.32 ? -2 : 0); const st = hash2s(Math.floor(xr * 2.4), Math.floor(wz * 1.1)); if (st > 0.88) { tone += 3; moon += 4; } else if (st < 0.08) tone -= 3; }
  const deepK = clamp01((xr - DEEP.x0 + 70) / 170); if (deepK > nz(xr * 0.45 + 11, wz * 0.35 + 5) * 1.1 - 0.05) { mat = MAT.ffloor; tone -= 1.5 * deepK; if (n2 > 0.6) { mat = MAT.fern; tone = 4 + (n2 - 0.6) * 12; } }
  // the trampled path he came along, and the ash patch around the fire
  const dzF = (wz - DZ) / 40, dxF = (xr - FIRE.x) / 34, dF = dxF * dxF + dzF * dzF;
  if (Math.abs(wz - DZ) < 18 + n1 * 10 && xr < FIRE.x && xr > 960) { mat = MAT.dirt; tone = 6 + (n2 - 0.5) * 5; }
  if (dF < 1 + (n2 - 0.5) * 0.4) { mat = dF < 0.45 ? MAT.ash : MAT.dirt; tone = 6 + (n2 - 0.5) * 6 - (dF < 0.3 ? 2 : 0); }
  if (sp > 0.994) { mat = MAT.stone; tone = 6; moon = 9; } else if (sp > 0.99 && mat !== MAT.ash) { mat = MAT.root; tone = 4; }
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

/** Light one G-buffer pixel → [r, g, b] (written into o). Shared by the world pass and the front pass. */
function shade(a, b, p, X, Y, L, o) {
  const mat = a >> 4, ramp = ALB[mat], n = ramp.length - 1, tone = (a & 15) / 15 * n, ti = Math.max(0, Math.min(n, bandN(tone, X, Y))), al = ramp[ti];
  const moon = (b >> 4) / 15, nrm = ((b & 15) - 8) / 7;
  const z = 1 + (L.cz - 1) * p, dx = (X - L.fx) / z, dy = (Y - L.fy) / z, ip = 1 / p, dz = ip > 1 ? (ip - 1) * 150 : (1 - ip) * 420;
  const fac = mat === MAT.moss || mat === MAT.ffloor || mat === MAT.dirt || mat === MAT.ash ? (GF_cur ? 0.85 : 0.7) : Math.max(0.15, 0.55 + 0.45 * nrm * ((L.fx - X) / Math.sqrt((L.fx - X) * (L.fx - X) + 900 * z * z)));
  const I = L.fire * fireFall(dx * dx + dy * dy + dz * dz) * fac, Iq = bandN(I * 6, X, Y) / 6;
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
let GF_cur = 0;

function lightCtx(cam, t, st) {
  const F = fireScreen(cam), fire = (st?.fire ?? 1) * flicker(t), dark = st?.dark ?? 0;
  return { fx: F.x, fy: F.y, cz: cam.z, cy: cam.cy, SY: cam.sy, t, fire, dark, moonK: 1 - 0.55 * dark, ambK: 1 - 0.45 * dark, fogK: 1 - 0.5 * dark };
}

// ---------------------------------------------------------------- the fire: flames, embers, sparks, smoke, air glow
const FL = ["#FFF8D8", "#FFE07A", "#FFB23C", "#F2702A", "#C83C22", "#7A2018"].map(hex);
function drawFire(c, cam, t, st, Bc) {
  const k = st?.fire ?? 1; if (k <= 0.01) return;
  const z = cam.z, F = fireScreen(cam), baseY = F.y + FIRE_H * z, fx = F.x, d = c.d;
  const put = (X, Y, col, a = 1) => { X |= 0; Y |= 0; if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; const i = (Y * GW + X) * 3; d[i] += (col[0] - d[i]) * a; d[i + 1] += (col[1] - d[i + 1]) * a; d[i + 2] += (col[2] - d[i + 2]) * a; };
  // glow in the smoky air around the flames
  const gr = 52 * z;
  for (let Y = Math.max(0, R(baseY - gr * 1.3)); Y < Math.min(GH, R(baseY + gr * 0.25)); Y++) for (let X = Math.max(0, R(fx - gr)); X < Math.min(GW, R(fx + gr)); X++) {
    const dd = ((X - fx) / gr) ** 2 + ((Y - (baseY - 14 * z)) / (gr * 0.9)) ** 2; if (dd >= 1) continue;
    const I = (1 - dd) ** 2 * 3.2 * k * flicker(t), q = bandQ(I, X, Y); if (q <= 0) continue;
    put(X, Y, q >= 3 ? [255, 150, 70] : q === 2 ? [220, 110, 60] : [170, 80, 60], q >= 3 ? 0.28 : q === 2 ? 0.2 : 0.12);
  }
  // ember bed
  for (let X = R(fx - 14 * z); X <= R(fx + 14 * z); X++) for (let Y = R(baseY - 4 * z); Y <= R(baseY); Y++) {
    const u = (X - fx) / (14 * z), v = (baseY - Y) / (4 * z); if (u * u + v * v > 1) continue;
    const e = 2.4 - Math.abs(u) * 1.6 + (nz(X * 2 / z + t * 3, Y * 2 / z) - 0.5) * 2.2, q = bandQ(e, X, Y); if (q <= 0) continue;
    put(X, Y, q >= 3 ? FL[2] : q === 2 ? FL[3] : FL[4], q >= 2 ? 1 : 0.7 * k);
  }
  // flames: scrolling noise shaped into a teardrop, in world units so the zoom keeps their look
  const H = 46 * k * (0.92 + 0.08 * flicker(t)), Wd = 15;
  for (let Y = R(baseY - (H + 8) * z); Y <= R(baseY - 1); Y++) for (let X = R(fx - (Wd + 3) * z); X <= R(fx + (Wd + 3) * z); X++) {
    const u = (X - fx) / z / Wd, v = (baseY - Y) / z / H; if (v < 0 || v > 1.25) continue;
    const n = nz((X - fx) / z * 2.2 + 30, (Y - baseY) / z * 1.5 + t * 52), n2 = nz((X - fx) / z * 4.5 + 90, (Y - baseY) / z * 3 + t * 80);
    const sway = Math.sin(t * 3.1 + v * 2.5) * 0.18 * v;
    const shape = (1 - v) * 1.15 - Math.abs(u - sway) * (1.1 + v * 1.6);
    const I = shape + (n - 0.5) * 0.85 + (n2 - 0.5) * 0.35 + 0.08 * Math.sin(t * 17 + u * 4);
    if (I < 0.07) continue;
    const q = I > 0.66 ? 0 : I > 0.5 ? 1 : I > 0.35 ? 2 : I > 0.22 ? 3 : I > 0.13 ? 4 : 5;
    if (q === 5 && by(X, Y) > 0.5) continue;
    put(X, Y, FL[q], 1);
  }
  // sparks: each rises, wobbles and cools; reborn inside the flames (never popping in the open)
  for (let i = 0; i < 26; i++) {
    const per = 1.1 + rnd(i * 3 + 1) * 1.6, ph = ((t / per + rnd(i * 3 + 2)) % 1 + 1) % 1, age = ph * per;
    const x = FIRE.x + (rnd(i * 3 + 3) - 0.5) * 12 + Math.sin(age * (2 + rnd(i) * 3) + i) * (3 + age * 6) + age * 5 * (rnd(i + 70) - 0.3);
    const y = -12 - age * (34 + rnd(i * 7) * 30) - age * age * 6;
    const X = R(cam.sx + (x - cam.cx) * z), Y = R(cam.sy + (y - cam.cy) * z), heat = 1 - ph;
    if (ph > 0.92 || k < 0.2) continue;
    put(X, Y, heat > 0.6 ? FL[1] : heat > 0.3 ? FL[2] : FL[3], 1);
    if (z > 1.9 && heat > 0.5) put(X, Y + 1, FL[3], 0.7);
  }
  // smoke: thin wisps that rise, curl, drift right and thin out (two filaments, noise-cut, never a solid column)
  for (let Y = Math.max(0, R(baseY - 130 * z)); Y < R(baseY - H * 0.75 * z); Y++) {
    const hh = (baseY - Y) / z, fade = (1 - hh / 130) * k;
    for (const [ph, amp, wd] of [[0, 4, 1.1], [2.1, 6, 0.8]]) {
      const cx = fx + (Math.sin(hh * 0.05 - t * 1.4 + ph) * amp * (0.4 + hh / 110) + hh * hh * 0.0011 + ph * 2) * z, w = (wd + hh * 0.022) * z;
      for (let X = R(cx - w); X <= R(cx + w); X++) {
        const u = (X - cx) / w, n = nz((X - fx) / z * 1.4 + ph * 30, (Y - baseY) / z * 0.9 + t * 22), den = (1 - u * u) * (n - 0.46) * 3 * fade;
        if (den > by(X, Y) * 0.8 + 0.1) put(X, Y, hh < 40 ? [128, 96, 86] : [88, 96, 122], 0.26);
      }
    }
  }
}

/** Grass tufts on the ground between pFrom and pTo; with depthTest only where the G-buffer surface lies behind. */
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

/** Faint cool moonbeams slanting down between the trunks of the deep forest (anchored to the p 0.6 layer). */
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

// ---------------------------------------------------------------- the exported API
export function drawClearing(c, cam, t, st = { fire: 1, dark: 0, rustle: null }) {
  const Bc = get(), SX = cam.sx, SY = cam.sy, L = lightCtx(cam, t, st), d = c.d;
  GA.fill(0); GK.fill(-1); GF.fill(0);
  // ground rows: p from the row (the camera's own perspective), real-world x = layer x / p
  const a2 = -(cam.z - 1) * cam.cy, b2 = -cam.cy;
  for (let Y = Math.max(0, Math.floor(SY) + 1); Y < GH; Y++) {
    const p = (-b2 + Math.sqrt(b2 * b2 + 4 * a2 * (Y + 0.5 - SY))) / (2 * a2); if (!(p > 0.04)) continue;
    const z = 1 + (cam.z - 1) * p, row = Y * GW;
    for (let X = 0; X < GW; X++) { const k = row + X, xr = (cam.cx * p + (X + 0.5 - SX) / z) / p; floorTexel(xr, p, X, Y, k); GK[k] = p - 0.003; GP[k] = p; GF[k] = 1; }
  }
  for (const T of Bc.texes) sampleTex(T, cam, SX, SY);
  // shade every pixel; outline objects where something farther is next to them
  const o = [0, 0, 0], sk = Bc.sky, skyK = 1 - 0.3 * L.dark;
  for (let Y = 0; Y < GH; Y++) for (let X = 0; X < GW; X++) {
    const k = Y * GW + X, q = k * 3;
    if (GK[k] < 0) { const s = Math.min(Bc.SKYH - 1, Y) * GW * 3 + X * 3; d[q] = sk[s] * skyK; d[q + 1] = sk[s + 1] * skyK; d[q + 2] = sk[s + 2] * skyK; continue; }
    GF_cur = GF[k];
    shade(GA[k], GBb[k], GP[k], X, Y, L, o);
    if (!GF[k]) { const key = GK[k] - 1e-5; if ((X > 0 && GK[k - 1] < key) || (X < GW - 1 && GK[k + 1] < key) || (Y > 0 && GK[k - GW] < key) || (Y < GH - 1 && GK[k + GW] < key)) { o[0] *= 0.32; o[1] *= 0.32; o[2] *= 0.36; } }
    d[q] = o[0] > 255 ? 255 : o[0]; d[q + 1] = o[1] > 255 ? 255 : o[1]; d[q + 2] = o[2] > 255 ? 255 : o[2];
  }
  // stars twinkle where the sky shows
  for (const s of Bc.stars) { const k = s.Y * GW + s.X; if (GK[k] >= 0) continue; const tw = s.b * (0.55 + 0.45 * Math.sin(t * s.f + s.ph)) * skyK, q = k * 3, col = s.big ? [236, 240, 255] : [180, 196, 240];
    for (let j = 0; j < 3; j++) d[q + j] += (col[j] - d[q + j]) * tw;
    if (s.big && tw > 0.45) for (const dd of [1, -1, GW, -GW]) { const k2 = k + dd; if (k2 < 0 || k2 >= N || GK[k2] >= 0) continue; for (let j = 0; j < 3; j++) d[k2 * 3 + j] += (col[j] - d[k2 * 3 + j]) * (tw - 0.45) * 0.6; } }
  drawMoonbeams(c, cam, t, L);
  drawTufts(c, Bc, cam, t, L, 0, 1.0, true);
  drawFire(c, cam, t, st, Bc);
  directTex(c, Bc.TF, cam, t, L);
}

/** Sample, light and outline one texture straight onto the canvas (front stones, front plants). */
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

// ---------------------------------------------------------------- the grass strip and the front
const BLADES = (() => {
  const out = []; let i = 0;
  for (let x = GRASS.x0; x < GRASS.x1; x += 0.9 + rnd(i * 3) * 1.1, i++) {
    if (x > GRASS.gap[0] && x < GRASS.gap[1]) continue;
    const edge = Math.min(clamp01((x - GRASS.x0) / 22), clamp01((GRASS.x1 - x) / 30), x < GRASS.gap[0] ? clamp01((GRASS.gap[0] - x) / 14) : clamp01((x - GRASS.gap[1]) / 14));
    out.push({ x, p: 0.985 + rnd(i * 5 + 1) * 0.05, h: GRASS.h * (0.45 + 0.65 * rnd(i * 5 + 2)) * (0.35 + 0.65 * edge), lean: (rnd(i * 5 + 3) - 0.5) * 0.5, ph: rnd(i * 5 + 4) * 6.28, tone: rnd(i * 5 + 5), seedHead: rnd(i * 7 + 9) > 0.86 });
  }
  return out.sort((a, b) => a.p - b.p);
})();
const FALL0 = EV.jumps + 0.92, FALL1 = EV.jumps + 1.78;
export function drawClearingFront(c, cam, t, st = { fire: 1, dark: 0, rustle: null }) {
  const Bc = get(), L = lightCtx(cam, t, st), d = c.d, ramp = ALB[MAT.grass], o = [0, 0, 0];
  const rus = st?.rustle, press = sm(t, FALL0 + 0.1, FALL1);
  const settle = t > EV.jumps && t < EV.jumps + 0.8 ? (1 - (t - EV.jumps) / 0.8) ** 2 : 0;
  for (const bl of BLADES) {
    const z = 1 + (cam.z - 1) * bl.p, bx = cam.sx + (bl.x - cam.cx * bl.p) * z, byy = cam.sy + (0 - cam.cy * bl.p) * z;
    if (bx < -40 || bx > GW + 40) continue;
    let ang = bl.lean + 0.1 * Math.sin(t * 1.3 + bl.x * 0.05 + bl.ph) + 0.05 * Math.sin(t * 2.9 + bl.x * 0.13), h = bl.h;
    if (rus && rus.k > 0) { const dd = (bl.x - rus.x) / 34; if (Math.abs(dd) < 1) { const w = Math.pow(1 - Math.abs(dd), 0.7) * rus.k; ang += Math.sign(dd || 1) * 1.0 * w + Math.sin(t * 47 + bl.x * 1.7) * 0.55 * w; h *= 1 - 0.3 * w; } else if (dd > 0 && dd < 4) { const w = Math.pow(1 - (dd - 1) / 3, 1.5) * rus.k; ang += Math.sin(t * 29 + bl.x * 0.9) * 0.42 * w + 0.25 * w; } else if (dd < 0 && dd > -1.6) { const w = (1 + (dd + 1) / 0.6) * rus.k; ang += Math.sin(t * 31 + bl.x) * 0.15 * Math.max(0, w); } }
    if (settle > 0) { const dd = (bl.x - 1190) / 30; if (Math.abs(dd) < 1) ang += Math.sin(t * 30 + bl.x) * 0.3 * settle * (1 - Math.abs(dd)); }
    if (press > 0) { const dd = (bl.x - 1180) / 34; if (Math.abs(dd) < 1) { const w = press * (1 - dd * dd); ang += 1.0 * w; h *= 1 - 0.55 * w; } }
    const n = Math.max(2, Math.ceil(h * z));
    for (let i = 0; i < n; i++) {
      const u = i / n, X = R(bx + Math.sin(ang) * h * z * u * (0.6 + 0.4 * u)), Y = R(byy - Math.cos(ang) * h * z * u);
      if (X < 0 || X >= GW || Y < 0 || Y >= GH) continue;
      const tone = (2 + u * 9 + bl.tone * 3) | 0;
      GF_cur = 0; shade((MAT.grass << 4) | Math.min(15, tone), ((6 + u * 8) << 4) | (8 + (ang > 0 ? 3 : -3)), bl.p, X, Y, L, o);
      const q = (Y * GW + X) * 3; d[q] = Math.min(255, o[0]); d[q + 1] = Math.min(255, o[1]); d[q + 2] = Math.min(255, o[2]);
      if (u < 0.4 && z > 1.7) { const q2 = q + 3; if (X + 1 < GW) { d[q2] = o[0] * 0.6; d[q2 + 1] = o[1] * 0.6; d[q2 + 2] = o[2] * 0.6; } }
    }
    if (bl.seedHead && h > 18) { const X = R(bx + Math.sin(ang) * h * z), Y = R(byy - Math.cos(ang) * h * z); GF_cur = 0; shade((MAT.wood << 4) | 6, (12 << 4) | 8, bl.p, X, Y, L, o); for (const [ox, oy] of [[0, 0], [0, -1], [1, -1]]) { const xx = X + ox, yy = Y + oy; if (xx >= 0 && xx < GW && yy >= 0 && yy < GH) { const q = (yy * GW + xx) * 3; d[q] = Math.min(255, o[0]); d[q + 1] = Math.min(255, o[1]); d[q + 2] = Math.min(255, o[2]); } } }
  }
  drawTufts(c, Bc, cam, t, L, 1.0, 9, false);
  for (const T of Bc.FRONT) directTex(c, T, cam, t, L);
}
