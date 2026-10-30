// «Zombie ants» — the one rainforest of the film in side view (our own pixel drawing, Halloween night look):
// sky (night purple ↔ green noon light under the canopy) with a big moon and bats; a far layer of canopy masses and
// trunks; a mid layer of undergrowth, fireflies and fog; the subject plane: the tree with the ants' nest, the forest
// floor (litter, soil), the small plant with its leaves (A: an earlier victim, B: the hero's) and a cobweb.
// Depth by a pinhole model: a layer at extra depth q has scale zb = z / (1 + z·q) (q = 0 is the subject plane).
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { TRUNK, NEST, STEM, LEAF_A, LEAF_B, leafTop, leafUnder, smooth, clamp01, wrap } from "./scene.mjs";
import { END } from "./timeline.mjs";

const W = 540, H = 960, R = Math.round;
const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const h2 = (a, b) => rnd(a * 7919 + b * 104729);
export function layer(cam, q) { const zb = cam.z / (1 + cam.z * q), ay = cam.ay ?? 480; return { z: zb, X: (wx) => 270 + (wx - cam.cx) * zb, Y: (wy) => ay + (wy - cam.cy) * zb, wx: (sx) => cam.cx + (sx - 270) / zb, wy: (sy) => cam.cy + (sy - ay) / zb }; }
const NM = (night, day, L) => mix(night, day, L * 0.72);
const PH = (t, f) => { const n = Math.max(1, Math.round(f * END)); return 2 * Math.PI * (n / END) * wrap(t); };
const STEP = (t, f) => Math.floor((Math.max(4, 4 * Math.round(f * END / 4)) / END) * wrap(t));      // a counter at ~f Hz that is a multiple of 4 over the loop
/** a texture value 0..1 with a grain of about `px` screen pixels at any zoom: two cell sizes blended by dither (no swimming) */
export function texLOD(wx, wy, z, X, Y, seed = 0, px = 6, ax = 1, ay = 1) { const l = Math.log2(Math.max(0.05, px / z)), l0 = Math.floor(l), s = Math.pow(2, (l - l0) > bayer(X + 2, Y + 1) ? l0 + 1 : l0); return h2(Math.floor(wx / (s * ax)) + seed * 131, Math.floor(wy / (s * ay)) - seed * 71); }

// ---------------------------------------------------------------- sky, moon, bats
export const MOON = { x: 36, y: -3563, r: 210, q: 1.4 };
const CRATERS = [[-0.35, -0.25, 0.22], [0.3, 0.1, 0.16], [0.05, 0.45, 0.13], [-0.1, -0.05, 0.08], [0.45, -0.4, 0.1], [-0.5, 0.3, 0.09]];
export function drawSky(c, cam, t, L) {
  const top = NM("#07050F", "#1E3A2C", L), mid = NM("#15102A", "#35583C", L), bot = NM("#2A1B48", "#5C7E4A", L);
  for (let y = 0; y < H; y++) { const k = y / H, col = k < 0.5 ? mix(top, mid, k * 2) : mix(mid, bot, (k - 0.5) * 2); for (let x = 0; x < W; x++) { const i = (y * W + x) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  if (L < 1) { const g = fade(c, 1 - L), Lm = layer(cam, MOON.q); for (let i = 0; i < 70; i++) { const x = R(Lm.X(MOON.x + (rnd(i * 3) - 0.5) * 9000)), y = R(Lm.Y(MOON.y + (rnd(i * 5) - 0.5) * 7000)); if (x >= 0 && x < W && y >= 0 && y < H) g.px(x, y, i % 6 ? "#5E5478" : "#FDFEED"); }
    const mx = Lm.X(MOON.x), my = Lm.Y(MOON.y), r = MOON.r * Lm.z;
    if (mx > -r * 2 && mx < W + r * 2 && my > -r * 2 && my < H + r * 2) {
      fade(g, 0.35).disc(R(mx), R(my), R(r * 1.5), "#3A2440"); fade(g, 0.5).disc(R(mx), R(my), R(r * 1.18), "#6A3A3A");
      fade(g, 0.25).disc(R(mx), R(my), R(r * 1.9), "#2A1838");
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { if (x * x + y * y > r * r) continue; const X = R(mx + x), Y = R(my + y), nx = x / r, ny = y / r, edge = nx * nx + ny * ny;
        let col = edge > 0.82 ? "#EAC890" : "#F4E6C4"; for (const [cx, cy, cr] of CRATERS) { const d = Math.hypot(nx - cx, ny - cy); if (d < cr) col = d < cr * 0.7 ? "#CDBA96" : "#DCCAA4"; }
        if (nx + ny > 0.9 && (X + Y) % 2 === 0) col = "#D8B880"; g.px(X, Y, col); }
      // bats across the moon: whole crossings over the film, wings flapping
      for (let b = 0; b < 3; b++) { const n = 2 + b, u = ((wrap(t) / END) * n + b * 0.37) % 1, bx = mx + (u * 2 - 1) * r * 3.2, by = my + (b - 1) * r * 0.55 + Math.sin(u * 9 + b) * r * 0.15, s = Math.max(2, r * 0.09), f = Math.sin(PH(t, 2.5) + b * 2);
        g.poly([[bx - s * 2, by - s * f], [bx - s * 0.4, by + s * 0.2], [bx, by - s * 0.3], [bx + s * 0.4, by + s * 0.2], [bx + s * 2, by - s * f], [bx, by + s * 0.6]], "#0B0812"); } } }
}

// ---------------------------------------------------------------- far layer: canopy masses with gaps, trunks, vines
export function drawFar(c, cam, t, L) {
  const F = layer(cam, 1.4), col = NM("#120C22", "#183424", L), col2 = NM("#1A1230", "#22442E", L), x0 = F.wx(-40), x1 = F.wx(W + 40), y0 = F.wy(-40), y1 = F.wy(H + 40);
  // trunks
  for (let k = Math.floor(x0 / 700) - 1; k <= Math.ceil(x1 / 700) + 1; k++) { const wx = k * 700 + rnd(k * 3) * 300, w = 90 + rnd(k * 5) * 160; if (Math.abs(wx - MOON.x) < 520) continue; const X0 = R(F.X(wx)), X1 = R(F.X(wx + w)); if (X1 < 0 || X0 > W) continue; c.rect(Math.max(0, X0), 0, Math.min(W, X1) - Math.max(0, X0), H, col); }
  // canopy masses (above y −2600) and undergrowth masses (near the ground), leaving a gap around the moon
  for (let k = Math.floor(x0 / 260) - 2; k <= Math.ceil(x1 / 260) + 2; k++) for (let j = 0; j < 9; j++) {
    const wx = k * 260 + rnd(k * 11 + j) * 260, wy = j < 6 ? -2700 - j * 520 - rnd(k * 13 + j) * 300 : -60 - (j - 6) * 260 - rnd(k * 17 + j) * 120, r = (j < 6 ? 260 : 210) + rnd(k * 19 + j) * 180;
    if (Math.hypot(wx - MOON.x, wy - MOON.y) < MOON.r * 1.9 + r) continue; if (wy + r < y0 || wy - r > y1) continue;
    const X = F.X(wx), Y = F.Y(wy), rr = r * F.z; if (X + rr < 0 || X - rr > W) continue; c.disc(R(X), R(Y), R(rr), j % 2 ? col : col2); }
  // hanging vines
  for (let k = Math.floor(x0 / 330); k <= Math.ceil(x1 / 330); k++) { const wx = k * 330 + rnd(k * 23) * 200; if (Math.abs(wx - MOON.x) < MOON.r * 1.4) continue; const len = 1800 + rnd(k * 29) * 1600; let px = F.X(wx), py = F.Y(-6000);
    for (let s = 1; s <= 30; s++) { const wy = -6000 + (s / 30) * len, nx = F.X(wx + Math.sin(s * 0.5 + k) * 30 + Math.sin(PH(t, 0.11) + k) * 8), ny = F.Y(wy); c.line(R(px), R(py), R(nx), R(ny), col2); px = nx; py = ny; } }
  // the floor far away
  { const Yg = F.Y(0); if (Yg < H) c.rect(0, Math.max(0, R(Yg)), W, H - Math.max(0, R(Yg)), NM("#0E0A1A", "#16281C", L)); }
}

// ---------------------------------------------------------------- mid layer: undergrowth, fog, fireflies
export function drawMid(c, cam, t, L) {
  const M = layer(cam, 0.35), col = NM("#0F0A1C", "#14301E", L), rim = NM("#2A2050", "#3A6A44", L), x0 = M.wx(-60), x1 = M.wx(W + 60);
  // ferns: arcs of fronds
  for (let k = Math.floor(x0 / 180) - 1; k <= Math.ceil(x1 / 180) + 1; k++) { const bx = k * 180 + rnd(k * 31) * 120, hgt = 160 + rnd(k * 37) * 320, n = 5 + Math.floor(rnd(k * 41) * 4);
    for (let f = 0; f < n; f++) { const ang = -Math.PI / 2 + (f / (n - 1) - 0.5) * 2.4, len = hgt * (0.7 + 0.3 * rnd(k * 43 + f)); let px = M.X(bx), py = M.Y(0);
      for (let s = 1; s <= 12; s++) { const q = s / 12, wx = bx + Math.cos(ang) * len * q, wy = -Math.abs(Math.sin(ang)) * len * q + len * 0.45 * q * q * Math.abs(Math.cos(ang)), nx = M.X(wx), ny = M.Y(wy), w = Math.max(1, (1 - q) * 9 * M.z);
        c.line(R(px), R(py), R(nx), R(ny), col); if (w > 1.5) { const dxn = (ny - py), dyn = -(nx - px), l = Math.hypot(dxn, dyn) || 1; for (let e = 1; e < w; e++) c.px(R(nx + dxn / l * e), R(ny + dyn / l * e), col); }
        if (s % 2 === 0 && M.z > 0.25) { const lx = M.X(wx + Math.cos(ang + 1.2) * 20), ly = M.Y(wy - 14); c.line(R(nx), R(ny), R(lx), R(ly), s % 4 ? col : rim); }
        px = nx; py = ny; } } }
  // the floor at this depth
  { const Yg = M.Y(0); if (Yg < H) c.rect(0, Math.max(0, R(Yg)), W, H - Math.max(0, R(Yg)), NM("#0D0918", "#142818", L)); }
  // fog bands (dither) near the ground, and fireflies at night
  { const Yg = M.Y(0); for (let y = Math.max(0, R(Yg - 220 * M.z)); y < Math.min(H, R(Yg + 30)); y++) { const k = 1 - Math.abs((y - (Yg - 70 * M.z)) / (150 * M.z + 1)); if (k <= 0) continue; const colF = NM("#4E3E80", "#7A9A7A", L);
      for (let x = 0; x < W; x++) { const dk = 0.8 + 0.2 * Math.sin(M.wx(x) * 0.006 + PH(t, 0.05)); if (k * 0.32 * dk > bayer(x, y)) c.px(x, y, colF); } } }
  if (L < 0.95) { const g = fade(c, 1 - L); for (let i = 0; i < 40; i++) { const n = 2 + (i % 3), u = (wrap(t) / END) * n + rnd(i * 5), fx = (rnd(i * 7) * 2.4 - 1.2) * 700 + Math.sin(u * 6.28) * 60, fy = -60 - rnd(i * 11) * 600 + Math.cos(u * 6.28 * 1.3) * 30;
      const X = M.X(fx), Y = M.Y(fy); if (X < -4 || X > W + 4 || Y < -4 || Y > H + 4) continue; const blink = 0.5 + 0.5 * Math.sin(u * 6.28 * 3 + i), gg = fade(g, blink);
      fade(gg, 0.55).disc(R(X), R(Y), 4, "#5A3010"); gg.disc(R(X), R(Y), 2, "#F08A3C"); gg.px(R(X), R(Y), "#FFE2A0"); } }
}

// ---------------------------------------------------------------- the subject plane
export const groundY = (x) => 1.0 * Math.sin(x * 0.05) + 0.7 * Math.sin(x * 0.13 + 1);
export function drawTrunk(c, cam, t, L) {
  const P = layer(cam, 0), X0 = P.X(TRUNK.x0), X1 = P.X(TRUNK.x1); if (X1 < -60 || X0 > W + 60) return;
  const bark = [NM("#1C1420", "#3A2C20", L), NM("#261A2A", "#4A3826", L), NM("#33243A", "#5A4430", L)], moss = NM("#1E3A2C", "#3E6A34", L);
  const yTop = Math.max(0, R(P.Y(TRUNK.top))), yBot = Math.min(H, R(P.Y(20)));
  for (let y = yTop; y < yBot; y++) { const wy = P.wy(y);
    // buttress: the trunk widens near the ground
    const flare = wy > -260 ? Math.pow((wy + 260) / 260, 2) * 120 : 0, xa = Math.max(0, R(P.X(TRUNK.x0 - flare))), xb = Math.min(W, R(P.X(TRUNK.x1 + flare * 0.6)));
    for (let x = xa; x < xb; x++) { const wx = P.wx(x), v = texLOD(wx, wy, P.z, x, y, 3, 4, 1, 5), m = texLOD(wx, wy, P.z, x, y, 9, 18, 1, 1.4);
      let col = v < 0.3 ? bark[0] : v < 0.75 ? bark[1] : bark[2]; if (m < 0.1) col = moss;
      if (x === xb - 1 || x === xb - 2) col = NM("#4A3A6A", "#7A6440", L);        // the moonlit right edge
      const i = (y * W + x) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  // the nest: a dark hole in the bark with a lip
  { const X = P.X(NEST.x - 12), Y = P.Y(NEST.y), rx = Math.max(1, 12 * P.z), ry = Math.max(1, 22 * P.z); if (X > -rx && X < W + rx && Y > -ry && Y < H + ry) { c.ellipse(R(X), R(Y), R(rx + 2 * P.z), R(ry + 2 * P.z), NM("#3A2A3A", "#5A4430", L)); c.ellipse(R(X), R(Y), R(rx), R(ry), "#06040A"); } }
}
export function drawGround(c, cam, t, L) {
  const P = layer(cam, 0), soil = [NM("#120C16", "#20160E", L), NM("#1A1220", "#2C2014", L), NM("#24182A", "#3A2A1A", L)], top = NM("#3A2A4A", "#5A4A2A", L);
  for (let x = 0; x < W; x++) { const wx = P.wx(x), gy = P.Y(groundY(wx)); for (let y = Math.max(0, R(gy)); y < H; y++) { const wy = P.wy(y), d = wy - groundY(wx);
      let col; if (d < Math.max(1.2, 1.5 / P.z)) col = top; else { col = soil[(texLOD(wx, wy, P.z, x, y, 5, 5) * 3) | 0]; if (d > 40) col = mix(col, "#07050A", Math.min(0.7, (d - 40) / 200)); }
      const i = (y * W + x) * 3; c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2]; } }
  // litter: dead leaves lying on and in the top of the floor
  const lit = [NM("#3A2418", "#6A4424", L), NM("#4A2E1C", "#7A5230", L), NM("#2E1E2A", "#4A3428", L)], x0 = P.wx(-30), x1 = P.wx(W + 30);
  for (let k = Math.floor(x0 / 13); k <= Math.ceil(x1 / 13); k++) { const wx = k * 13 + rnd(k * 3) * 10, wy = 0.5 + rnd(k * 5) * 7, len = 7 + rnd(k * 7) * 9, ang = (rnd(k * 11) - 0.5) * 0.5, X = P.X(wx), Y = P.Y(wy), a = len * P.z / 2, b = Math.max(1, len * 0.28 * P.z / 2);
    if (a < 1.2 || X < -a || X > W + a) continue; const ca = Math.cos(ang), sa = Math.sin(ang), pts = []; for (let i = 0; i < 12; i++) { const th = (i / 12) * 2 * Math.PI; pts.push([X + Math.cos(th) * a * ca - Math.sin(th) * b * sa, Y + Math.cos(th) * a * sa + Math.sin(th) * b * ca]); }
    const lc = lit[((k % 3) + 3) % 3]; c.poly(pts, lc); if (a > 6) c.line(R(X - a * ca), R(Y - a * sa), R(X + a * ca), R(Y + a * sa), mix(lc, "#000000", 0.3)); }
}
// leaf outline from its top and underside curves
function leafPoly(P, Lf) { const pts = [], n = 28; for (let i = 0; i <= n; i++) { const x = Lf.x + Lf.dir * Lf.len * (i / n); pts.push([P.X(x), P.Y(leafTop(Lf, x))]); } for (let i = n; i >= 0; i--) { const x = Lf.x + Lf.dir * Lf.len * (i / n); pts.push([P.X(x), P.Y(leafUnder(Lf, x))]); } return pts; }
export const LEAVES = [LEAF_A, LEAF_B, { x: 1.6, y: -300, dir: 1, len: 70 }, { x: -1.6, y: -322, dir: -1, len: 60 }, { x: 1.6, y: -110, dir: 1, len: 64 }];
export function drawPlant(c, cam, t, L) {
  const P = layer(cam, 0); if (P.X(130) < -10 || P.X(-130) > W + 10) return;
  const stem = NM("#24402E", "#3E6A34", L), stemR = NM("#4E6A8A", "#6A9A4A", L);
  // stem
  { const xa = P.X(STEM.x - STEM.w / 2), xb = P.X(STEM.x + STEM.w / 2), ya = Math.max(0, R(P.Y(STEM.top))), yb = Math.min(H, R(P.Y(1))); for (let y = ya; y < yb; y++) { const sway = 0; for (let x = Math.max(0, R(xa + sway)); x < Math.min(W, R(xb + sway)); x++) c.px(x, y, x >= R(xb + sway) - Math.max(1, R(P.z * 0.6)) ? stemR : stem); } }
  // the cobweb between the stem and leaf A (catches the moonlight)
  if (P.z > 0.9 && P.z < 9) { const g = fade(c, 0.5 * (1 - L * 0.6)), cx = 22, cy = -150, web = "#B8B0D8";
    const anchors = [[STEM.x + 1.6, -205], [STEM.x + 1.6, -120], [48, leafUnder(LEAF_A, 48)], [70, -110], [40, -95]];
    for (const [ax, ay] of anchors) g.line(R(P.X(cx)), R(P.Y(cy)), R(P.X(ax)), R(P.Y(ay)), web);
    for (let r = 6; r < 34; r += 6) { let pp = null; for (let i = 0; i <= 18; i++) { const an = (i / 18) * 2 * Math.PI, q = [P.X(cx + Math.cos(an) * r), P.Y(cy + Math.sin(an) * r * 0.9)]; if (pp) g.line(R(pp[0]), R(pp[1]), R(q[0]), R(q[1]), web); pp = q; } } }
  // leaves (the stalks to them first)
  for (const Lf of LEAVES) { const top = NM("#1E4A38", "#3E7A40", L), body = NM("#173A2C", "#2E6234", L), under = NM("#10281E", "#24502A", L), rim = NM("#5E9A8A", "#8ACA6A", L);
    const pts = leafPoly(P, Lf); c.poly(pts, body);
    // underside shade and the midrib along it
    const n = 28; for (let i = 0; i < n; i++) { const xa = Lf.x + Lf.dir * Lf.len * (i / n), xb = Lf.x + Lf.dir * Lf.len * ((i + 1) / n); const A = [P.X(xa), P.Y(leafUnder(Lf, xa))], Bq = [P.X(xb), P.Y(leafUnder(Lf, xb))], A2 = [P.X(xa), P.Y((leafUnder(Lf, xa) * 2 + leafTop(Lf, xa)) / 3)];
      c.line(R(A[0]), R(A[1]), R(Bq[0]), R(Bq[1]), mix(under, rim, 0.25)); if (P.z > 3) c.line(R(A2[0]), R(A2[1]), R(Bq[0]), R(Bq[1] - 1), under);
      const T1 = [P.X(xa), P.Y(leafTop(Lf, xa))], T2 = [P.X(xb), P.Y(leafTop(Lf, xb))]; c.line(R(T1[0]), R(T1[1]), R(T2[0]), R(T2[1]), rim); }
    // drops of water on top (warm and wet)
    if (P.z > 2.5 && P.z < 14) for (let k = 0; k < 4; k++) { const x = Lf.x + Lf.dir * Lf.len * (0.2 + 0.18 * k), y = leafTop(Lf, x) - 0.4; c.disc(R(P.X(x)), R(P.Y(y)), Math.max(1, Math.min(3, R(0.3 * P.z))), NM("#7A9ACA", "#BFE6F0", L)); c.px(R(P.X(x)) - 1, R(P.Y(y)) - 1, "#FDFEED"); }
  }
}
/** soft mist over the plant (stronger on "warm and wet") */
export function drawMist(c, cam, t, L, k) {
  if (k <= 0) return; const P = layer(cam, 0), g = fade(c, k), col = NM("#5A4E80", "#CFE6D0", L);
  for (let y = 0; y < H; y += 1) { const wy = P.wy(y); if (wy < -340 || wy > 0) continue; const vy = 1 - Math.abs((wy + 170) / 170);
    for (let x = (y & 1); x < W; x += 2) { const wx = P.wx(x), d = Math.abs(wx) / 170; if (d > 1) continue; const n = texLOD(wx + 40 * Math.sin(PH(t, 0.05)), wy, P.z, x, y, 21, 9); if (vy * (1 - d) * (0.1 + 0.28 * n) > bayer(x, y)) g.px(x, y, col); } }
}
