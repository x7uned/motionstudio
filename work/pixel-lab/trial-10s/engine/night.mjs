// Trial 10 s · backdrop "night-hill", copied from effort-exp-2026-10-25/xhigh/film/world.mjs (bale/dust/warm light moved
// to props/pumpkin.mjs; bat times fixed). «Pumpkin face» — the Halloween night set: purple sky with stars, a big moon, far hills with one lit house, a bare tree,
// a crooked picket fence, the hay bale the pumpkin sits on, dithered ground fog, foreground grass with small pumpkins and
// leaves, bats. All world-unit geometry re-rasterised per frame through layer(cam, p), so every zoom stays crisp.
import { Canvas, bayer, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, TAU, R, clamp01, sm, lerp, rnd, frac, noise1, layer, ramp, band, tintPx, kOf, ease } from "./layout.mjs";


export const C = {
  sky0: "#140D24", sky1: "#1D1430", sky2: "#2A1F45", sky3: "#3B2C5C", sky4: "#4A3870",
  moon: ["#7F8DBE", "#9FAED8", "#B9C8F0", "#D6DEF6", "#EEF1FB"], halo: "#5C5490",
  hill0: "#191127", hill1: "#22183A", hill2: "#2C2048",
  wood0: "#140E20", wood1: "#22183A", wood2: "#3A2E5A", woodRim: "#6E6AA8",
  ground0: "#0E0A18", ground1: "#171024", ground2: "#21173A", grass: "#2B2148", grassRim: "#4C4378",
  hay: ["#1E150C", "#36260F", "#553C18", "#775722", "#9C7630", "#C49A42", "#E2BE62"], twine: "#2A1A0E", twineHi: "#5A3A1E",
  fog: "#7A6CA6", warm: "#F08A3C", warm2: "#F4CA50", ink: "#0B0812",
};
export const MOON = { x: 236, y: 132, r: 66, p: 0.25 };

// ---------------------------------------------------------------- sky (screen-fixed gradient, banded + dithered)
const SKY = new Canvas(GW, GH, "#000000");
{ const stops = [[0, C.sky0], [180, C.sky1], [380, C.sky2], [560, C.sky3], [700, C.sky4]];
  for (let y = 0; y < GH; y++) { let i = 0; while (i + 1 < stops.length - 1 && y > stops[i + 1][0]) i++;
    const [y0, a] = stops[i], [y1, b] = stops[i + 1], k = clamp01((y - y0) / (y1 - y0));
    for (let x = 0; x < GW; x++) SKY.px(x, y, k > bayer(x, y) ? b : a); } }
const STARS = Array.from({ length: 90 }, (_, i) => ({ x: rnd(i * 3 + 1) * 560 - 10, y: rnd(i * 3 + 2) * 470 - 20, b: rnd(i * 3 + 3), ph: rnd(i + 77) * TAU, sp: 0.6 + rnd(i + 99) * 1.4 }));

export function drawSky(c, cam, t) {
  c.d.set(SKY.d);
  const L = layer(cam, 0.12);
  for (const s of STARS) {
    const x = R(L.X(s.x)), y = R(L.Y(s.y)); if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
    const tw = 0.55 + 0.45 * Math.sin(t * s.sp * 2.2 + s.ph);
    const col = s.b > 0.85 ? "#EEF1FB" : s.b > 0.5 ? "#B9C8F0" : "#7F8DBE";
    if (tw > 0.35) c.px(x, y, tw > 0.75 || s.b > 0.85 ? col : mix(col, C.sky1, 0.45));
    if (s.b > 0.93 && tw > 0.8) { c.px(x - 1, y, "#7F8DBE"); c.px(x + 1, y, "#7F8DBE"); c.px(x, y - 1, "#7F8DBE"); c.px(x, y + 1, "#7F8DBE"); }
  }
}

// ---------------------------------------------------------------- moon with craters and a dithered halo
export function drawMoon(c, cam, t) {
  const L = layer(cam, MOON.p), cx = L.X(MOON.x), cy = L.Y(MOON.y), r = MOON.r * L.z, hr = r * 1.9;
  const x0 = Math.max(0, Math.floor(cx - hr)), x1 = Math.min(GW - 1, Math.ceil(cx + hr)), y0 = Math.max(0, Math.floor(cy - hr)), y1 = Math.min(GH - 1, Math.ceil(cy + hr));
  const craters = [[-0.32, -0.18, 0.2], [0.28, 0.22, 0.16], [0.05, -0.45, 0.11], [-0.12, 0.42, 0.13], [0.46, -0.2, 0.09], [-0.5, 0.18, 0.08]];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const dx = (x + 0.5 - cx) / r, dy = (y + 0.5 - cy) / r, d = Math.hypot(dx, dy);
    if (d <= 1) {
      // lit sphere, light from the upper right a touch; craters are darker discs with a lit lower rim
      const nz = Math.sqrt(Math.max(0, 1 - d * d)), lv = 0.55 + 0.35 * (0.3 * dx * -1 + -0.25 * dy + 0.9 * nz) * 0.9;
      let v = lv;
      for (const [ax, ay, ar] of craters) { const e = Math.hypot(dx - ax, dy - ay) / ar; if (e < 1) v -= 0.22 * (1 - e * e * 0.6); else if (e < 1.18 && dy > ay) v += 0.06; }
      const mottle = 0.05 * (noise1(dx * 9 + 3, 1) + noise1(dy * 11 + 5, 2) - 1);
      c.px(x, y, band(C.moon, v + mottle, x, y, 0.4));
    } else {
      const k = 0.62 * Math.pow(clamp01((1.9 - d) / 0.9), 2.2);
      tintPx(c, x, y, C.halo, k, 5);
    }
  }
}

// ---------------------------------------------------------------- cobweb in the top-left corner (p 0.55, background only)
export function drawWeb(c, cam, t) {
  const L = layer(cam, 0.55), ax = -6, ay = -6, sway = 1.5 * Math.sin(t * 1.1), col = "#5C5490", col2 = "#3E3868";
  const spokes = [0.08, 0.36, 0.66, 0.98, 1.3, 1.5].map((a) => a), Rmax = 120;
  const pt = (a, r) => [L.X(ax + Math.cos(a) * r + sway * r / Rmax), L.Y(ay + Math.sin(a) * r)];
  for (const a of spokes) { const [x0, y0] = pt(a, 0), [x1, y1] = pt(a, Rmax); c.line(R(x0), R(y0), R(x1), R(y1), col2); }
  for (let ring = 1; ring <= 6; ring++) { const r = ring * 19; for (let k = 0; k + 1 < spokes.length; k++) { const n = 8; let prev = null;
    for (let i = 0; i <= n; i++) { const a = lerp(spokes[k], spokes[k + 1], i / n), sag = Math.sin(Math.PI * i / n) * 4 * (ring / 6), p = pt(a, r - sag); if (prev) c.line(R(prev[0]), R(prev[1]), R(p[0]), R(p[1]), ring % 2 ? col : col2); prev = p; } } }
}

// ---------------------------------------------------------------- far hills with a lit house and small dead trees (p 0.42)
const hillY = (wx) => 512 - 26 * Math.sin(wx * 0.011 + 0.6) - 12 * Math.sin(wx * 0.027 + 2.1) - 5 * Math.sin(wx * 0.07);
export function drawHills(c, cam, t) {
  const L = layer(cam, 0.42);
  for (let x = 0; x < GW; x++) {
    const wx = L.wx(x + 0.5), top = L.Y(hillY(wx)); const y0 = Math.max(0, Math.floor(top));
    for (let y = y0; y < GH; y++) { const depth = (y - top) / (40 * L.z); c.px(x, y, depth < 0.6 && bayer(x, y) > 0.55 ? C.hill2 : depth < 1.6 && bayer(x, y) > 0.8 ? C.hill2 : C.hill1); }
  }
  // the house on the hill (left of the pumpkin): roof, chimney, two warm windows that glow softly
  const hx = 232, hy = hillY(232) + 4;
  const P = (pts) => pts.map(([a, b]) => [L.X(hx + a), L.Y(hy + b)]);
  c.poly(P([[-15, 0], [-15, -16], [0, -27], [15, -16], [15, 0]]), C.hill0);
  c.poly(P([[7, -24], [7, -31], [11, -31], [11, -20]]), C.hill0);
  const glow = 0.75 + 0.25 * noise1(t * 1.3, 4);
  for (const wx0 of [-10, 4]) { const X0 = R(L.X(hx + wx0)), Y0 = R(L.Y(hy - 11)), w = Math.max(2, R(5 * L.z)), h = Math.max(2, R(5 * L.z));
    for (let y = Y0 - 3; y < Y0 + h + 3; y++) for (let x = X0 - 3; x < X0 + w + 3; x++) tintPx(c, x, y, C.warm, 0.25 * glow, 3);
    c.rect(X0, Y0, w, h, glow > 0.85 ? C.warm2 : C.warm); }
  // dead trees on the ridge
  for (const [tx, s] of [[98, 1], [470, 0.8], [520, 1.1]]) {
    const by = hillY(tx) + 2, X = (a) => L.X(tx + a * s), Y = (b) => L.Y(by - b * s);
    c.poly([[X(-1.5), Y(0)], [X(-0.8), Y(30)], [X(0.8), Y(30)], [X(1.5), Y(0)]], C.hill0);
    for (const [ax, ay, bx, bb] of [[0, 18, -9, 28], [0, 22, 8, 33], [0, 27, -4, 38], [-5, 23, -11, 24], [4, 28, 11, 30]]) c.line(R(X(ax)), R(Y(ay)), R(X(bx)), R(Y(bb)), C.hill0);
  }
}

// ---------------------------------------------------------------- bare spooky tree on the right (p 0.7), gnarled branches over the top
const BRANCHES = (() => {
  const out = [];
  // a branch is a bent, tapering polyline; children sprout along it
  const grow = (x, y, ang, len, w, depth, seed) => {
    const n = 6, bend = (rnd(seed) - 0.5) * 0.9, pts = [];
    for (let i = 0; i <= n; i++) { const u = i / n, a = ang + bend * u * u + 0.12 * Math.sin(u * 5 + seed); const px = i ? pts[i - 1][0] + Math.cos(a) * len / n : x, py = i ? pts[i - 1][1] + Math.sin(a) * len / n : y; pts.push([px, py, lerp(w, w * 0.45, u)]); }
    out.push(pts);
    if (depth <= 0) return;
    const kids = depth >= 3 ? 3 : 2;
    for (let k = 0; k < kids; k++) { const at = 0.45 + 0.5 * (k + rnd(seed + k * 7) * 0.6) / kids, i = Math.min(n - 1, Math.round(at * n)), [px, py, pw] = pts[i];
      const side = (k % 2 ? 1 : -1) * (0.55 + 0.35 * rnd(seed + k * 13)), na = ang + bend * at * at + side;
      grow(px, py, na, len * (0.5 + 0.2 * rnd(seed + k * 3)), pw * 0.75, depth - 1, seed * 5 + k + 3); }
    // tip continues
  };
  grow(512, 650, -Math.PI / 2 - 0.12, 230, 30, 4, 11);
  grow(540, 420, -Math.PI + 0.35, 150, 14, 3, 29);
  return out;
})();
export function drawTree(c, cam, t) {
  const L = layer(cam, 0.7), sway = Math.sin(t * 0.8);
  for (const pts of BRANCHES) for (let i = 1; i < pts.length; i++) {
    const [x0, y0, w0] = pts[i - 1], [x1, y1, w1] = pts[i], sw0 = sway * clamp01((620 - y0) / 500) * 2.5, sw1 = sway * clamp01((620 - y1) / 500) * 2.5;
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len;
    const q = [[x0 + sw0 + nx * w0 / 2, y0 + ny * w0 / 2], [x1 + sw1 + nx * w1 / 2, y1 + ny * w1 / 2], [x1 + sw1 - nx * w1 / 2, y1 - ny * w1 / 2], [x0 + sw0 - nx * w0 / 2, y0 - ny * w0 / 2]];
    c.poly(q.map(([a, b]) => [L.X(a), L.Y(b)]), C.wood0);
    // round joints
    const jr = Math.max(0, R(w1 / 2 * L.z) - 1); if (jr > 0) c.disc(R(L.X(x1 + sw1)), R(L.Y(y1)), jr, C.wood0);
    // moonlit upper-left edge (the moon is up and to the left)
    const lit = nx * -0.6 + ny * -0.8 > 0 ? 1 : -1, ex0 = x0 + sw0 + lit * nx * w0 / 2, ey0 = y0 + lit * ny * w0 / 2, ex1 = x1 + sw1 + lit * nx * w1 / 2, ey1 = y1 + lit * ny * w1 / 2;
    if (w0 * L.z > 2.5) c.line(R(L.X(ex0)), R(L.Y(ey0)), R(L.X(ex1)), R(L.Y(ey1)), w0 > 9 ? "#3A3060" : C.wood1);
  }
}

// ---------------------------------------------------------------- crooked picket fence (p 0.78)
const PICKETS = Array.from({ length: 30 }, (_, i) => ({ x: -60 + i * 23 + (rnd(i + 5) - 0.5) * 4, h: 70 + rnd(i + 11) * 12, lean: (rnd(i + 23) - 0.5) * 0.12, gone: rnd(i + 41) > 0.9 }));
export function drawFence(c, cam, t) {
  const L = layer(cam, 0.78), base = 588;
  // two rails
  for (const ry of [base - 22, base - 56]) { const y0 = R(L.Y(ry)), h = Math.max(2, R(5 * L.z)); c.rect(0, y0, GW, h, C.wood1); c.rect(0, y0, GW, 1, C.wood2); }
  for (const p of PICKETS) { if (p.gone) continue;
    const w = 13, top = base - p.h, lx = p.lean * p.h;
    const pts = [[p.x, base], [p.x + w, base], [p.x + w + lx, top + 4], [p.x + w / 2 + lx, top - 3], [p.x + lx, top + 4]];
    c.poly(pts.map(([a, b]) => [L.X(a), L.Y(b)]), C.wood1);
    // moonlit left edge and tip (the moon is upper left)
    c.line(R(L.X(p.x + 0.6)), R(L.Y(base)), R(L.X(p.x + lx + 0.6)), R(L.Y(top + 4)), C.wood2);
    c.line(R(L.X(p.x + lx + 0.6)), R(L.Y(top + 4)), R(L.X(p.x + w / 2 + lx)), R(L.Y(top - 3)), C.woodRim);
  }
}

// ---------------------------------------------------------------- the ground behind and in front of the bale (p 1)
export function drawGround(c, cam, t) {
  const L = layer(cam, 1), y0 = Math.max(0, Math.floor(L.Y(578)));
  for (let y = y0; y < GH; y++) { const wy = L.wy(y + 0.5), k = clamp01((wy - 578) / 260);
    for (let x = 0; x < GW; x++) { const wx = L.wx(x + 0.5), n = noise1(wx * 0.08 + Math.floor(wy * 0.25) * 13.1, 2);
      c.px(x, y, band([C.ground2, C.ground1, C.ground0], k + (n - 0.5) * 0.35, x, y, 0.5)); } }
  // grass tufts on the ground plane
  for (let i = 0; i < 70; i++) { const wx = -40 + rnd(i * 5 + 1) * 640, wy = 590 + rnd(i * 5 + 2) * 180, h = 5 + rnd(i * 5 + 3) * 7, X = L.X(wx), Y = L.Y(wy);
    for (let b = -2; b <= 2; b++) c.line(R(X + b * 1.5 * L.z), R(Y), R(X + (b * 2.6 + Math.sin(t * 1.4 + i) * 0.8) * L.z), R(Y - h * L.z * (1 - Math.abs(b) * 0.18)), b === -2 ? C.grassRim : C.grass); }
}




// ---------------------------------------------------------------- ground fog: two drifting dithered bands
export function drawFog(c, cam, t, band) {
  const p = band === 0 ? 0.88 : 1.18, L = layer(cam, p), wy0 = band === 0 ? 556 : 660, wy1 = band === 0 ? 640 : 800, amp = band === 0 ? 0.34 : 0.28;
  const y0 = Math.max(0, Math.floor(L.Y(wy0))), y1 = Math.min(GH - 1, Math.ceil(L.Y(wy1)));
  for (let y = y0; y <= y1; y++) { const wy = L.wy(y + 0.5), v = Math.sin(Math.PI * clamp01((wy - wy0) / (wy1 - wy0)));
    for (let x = 0; x < GW; x++) { const wx = L.wx(x + 0.5) + t * (band === 0 ? 9 : -12);
      const n = noise1(wx * 0.018 + band * 10, 11) * 0.6 + noise1(wx * 0.05 + wy * 0.03 + band * 3, 12) * 0.4;
      tintPx(c, x, y, C.fog, amp * v * clamp01(n * 1.6 - 0.25), 4); } }
}

// ---------------------------------------------------------------- foreground (p 1.32): big grass blades, small uncarved pumpkins, leaves
const FG_PUMPKINS = [[40, 872, 26], [500, 905, 30], [150, 948, 18]];
export function drawForeground(c, cam, t, glow) {
  const L = layer(cam, 1.32);
  for (const [wx, wy, r] of FG_PUMPKINS) {
    const X = L.X(wx), Y = L.Y(wy), rx = r * L.z * 1.25, ry = r * L.z;
    for (let y = Math.floor(Y - ry); y <= Math.ceil(Y + ry); y++) for (let x = Math.floor(X - rx); x <= Math.ceil(X + rx); x++) {
      const dx = (x + 0.5 - X) / rx, dy = (y + 0.5 - Y) / ry; if (dx * dx + dy * dy > 1) continue;
      const lobe = Math.cos(Math.asin(clamp01(Math.abs(dx))) * 5 + (dx < 0 ? 0 : 0)) * 0.12, v = 0.32 - dx * 0.18 - dy * 0.2 + lobe;
      c.px(x, y, ramp(["#1E0C08", "#3A1A0E", "#5E2A12", "#84401A"], v, x, y));
    }
    c.rect(R(X - 1.5 * L.z), R(Y - ry - 5 * L.z), Math.max(2, R(3 * L.z)), Math.max(2, R(6 * L.z)), "#2A2A12");
  }
  for (let i = 0; i < 46; i++) { const wx = -30 + rnd(i * 13 + 1) * 600, wy = 800 + rnd(i * 13 + 2) * 170, h = 14 + rnd(i * 13 + 3) * 22, X = L.X(wx), Y = L.Y(wy), bend = Math.sin(t * 1.1 + i * 0.7) * 2 + (rnd(i) - 0.5) * 6;
    for (let b = 0; b < 3; b++) { const ox = (b - 1) * 3 * L.z; c.line(R(X + ox), R(Y), R(X + ox + bend * L.z), R(Y - h * L.z * (1 - b * 0.15)), b === 0 ? "#1C1530" : "#120D20"); } }
  for (let i = 0; i < 18; i++) { const wx = -20 + rnd(i * 17 + 4) * 580, wy = 780 + rnd(i * 17 + 5) * 190, X = R(L.X(wx)), Y = R(L.Y(wy)), s = Math.max(2, R(3 * L.z));
    c.rect(X, Y, s * 2, s, rnd(i) > 0.5 ? "#5A2A16" : "#3E2A14"); c.px(X + s * 2, Y - 1, "#2A1A10"); }
}

// ---------------------------------------------------------------- bats: procedural flapping silhouettes (continuous wing angle)
export const BATS = [
  { t0: 0.5, t1: 2.1, a: [600, 70], b: [-60, 120], p: 0.2, s: 1.0 },            // top background in the close-up
  { t0: 4.4, t1: 6.4, a: [-40, 70], b: [600, 40], p: 0.35, s: 0.8 },
  { t0: 8.2, t1: 9.75, a: [430, 112], b: [-40, 160], p: 0.25, s: 1.6 },          // crosses the moon in the payoff
];
export function batPos(bt, t, cam) {
  const u = clamp01((t - bt.t0) / (bt.t1 - bt.t0)), L = layer(cam, bt.p);
  const wx = lerp(bt.a[0], bt.b[0], u), wy = lerp(bt.a[1], bt.b[1], u) + Math.sin(u * TAU * 1.5) * 10;
  return { x: L.X(wx), y: L.Y(wy), s: bt.s * L.z, u };
}
export function drawBats(c, cam, t) {
  for (const [i, bt] of BATS.entries()) {
    if (t < bt.t0 || t > bt.t1) continue;
    const { x, y, s } = batPos(bt, t, cam), dir = bt.b[0] > bt.a[0] ? 1 : -1, flap = Math.sin(t * 15 + i * 2), up = flap * 6 * s;
    const pts = [[-1.5, -2], [-5, -3 + up * 0.3], [-11, -4 - up], [-14, 0 - up * 0.6], [-9, 0 - up * 0.2], [-6, 3], [-2, 2], [0, 4], [2, 2], [6, 3], [9, 0 - up * 0.2], [14, 0 - up * 0.6], [11, -4 - up], [5, -3 + up * 0.3], [1.5, -2]];
    c.poly(pts.map(([a, b]) => [x + a * s * dir, y + b * s]), "#0A0612");
    c.px(R(x - 1.2 * s * dir), R(y - 3.2 * s), "#0A0612"); c.px(R(x + 1.2 * s * dir), R(y - 3.2 * s), "#0A0612");   // ears
  }
}
