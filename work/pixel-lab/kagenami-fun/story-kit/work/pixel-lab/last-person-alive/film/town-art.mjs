// «The last person alive» — Builder W: static painters of the dead town at dusk (shot A). Everything here is drawn once
// into masked strips (W-util Strip) in each layer's own pixel scale; town.mjs composites them with parallax.
// The sun sits low on the left: facades are in violet shade, left edges and roof lines catch a warm rim.
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { rnd, clamp01, lerp } from "./layout.mjs";
import { vnoise, fbm, band, pick } from "./W-util.mjs";
import { pineRaster, spruceRaster, deadTree } from "./W-trees.mjs";

const R = Math.round, PI = Math.PI;

// ---------------------------------------------------------------- palettes (dark → light)
export const SKY = ["#0E0A22", "#140E2C", "#1C1236", "#261640", "#321A49", "#421F51", "#552557", "#6B2C5B", "#84345C", "#9F3E5B", "#BA4B58", "#D25D52", "#E5744C", "#F18F4E", "#F8AC58", "#FCC86C", "#FFE09A"];
export const CLOUD = ["#160E2C", "#21143A", "#2E1946", "#401F50", "#562658", "#70305C", "#8E3A5C", "#B04A5A", "#CE5E54", "#E8784C", "#F6A056", "#FFCB78"];
const FAR = ["#2A1A42", "#33204A", "#3D2552", "#4A2B5A", "#593260", "#6A3964", "#7E4268", "#944C6A"];
const MID = ["#180F2C", "#1E1334", "#25173D", "#2D1C45", "#37214D", "#432755", "#522E5C", "#643560"];
const N2 = ["#120C22", "#170F2A", "#1D1332", "#24173A", "#2C1B42", "#36204A", "#432654"];
export const BRICK = ["#1E1220", "#2C1828", "#3A2030", "#4A2836", "#5A303C", "#6C3A42", "#80464A", "#985650"];
export const PLAST = ["#1C1726", "#262033", "#312A40", "#3D354D", "#4A415A", "#584E68", "#685D76", "#7C7088"];
export const RIM = ["#7A3A50", "#A44E54", "#C86656", "#E0845C", "#F2A466"];
export const GLASS = ["#1A1026", "#2E1A3C", "#4A2450", "#6E3058", "#9A405C", "#C4585A", "#E07A56"];
export const INSIDE = ["#0A0710", "#100B18", "#171020"];
export const WOOD = ["#1E1418", "#2E1E20", "#402A28", "#543830", "#6A4A3A", "#806048"];
export const RUST = ["#2A1414", "#40201A", "#5A2E20", "#743C24", "#8E4E2C", "#A86436"];
export const VINE = ["#0E1414", "#141E1C", "#1C2A22", "#26382A", "#324830", "#425C36", "#58723E"];
export const METAL = ["#141020", "#1E1A2C", "#2A2538", "#383246", "#484058", "#5C526C", "#746A82"];
export const OUT = "#0B0812";

// ---------------------------------------------------------------- a layer painter: world (layer units) → strip pixels
export function painter(L) {
  const g = L.s, X = (wx) => (wx - L.W0) * L.z, Y = (wy) => L.SY + (wy - L.CY * L.p) * L.z, z = L.z;
  return {
    g, X, Y, z,
    rect: (x0, y0, x1, y1, col) => { const a = R(X(x0)), b = R(Y(y0)), c = R(X(x1)), d = R(Y(y1)); g.rect(Math.min(a, c), Math.min(b, d), Math.abs(c - a), Math.abs(d - b), col); },
    poly: (pts, col, shade) => g.poly(pts.map(([x, y]) => [X(x), Y(y)]), col, shade),
    line: (x0, y0, x1, y1, col) => g.line(R(X(x0)), R(Y(y0)), R(X(x1)), R(Y(y1)), col),
    /** pixel-space fill of a world rect with a shade(X, Y, u, v) → colour (u, v ∈ 0..1 across the rect) */
    fill: (x0, y0, x1, y1, shade) => {
      const a = R(X(x0)), b = R(Y(y0)), c = R(X(x1)), d = R(Y(y1)), w = Math.max(1, c - a), h = Math.max(1, d - b);
      for (let yy = b; yy < d; yy++) for (let xx = a; xx < c; xx++) { const col = shade(xx, yy, (xx - a) / w, (yy - b) / h); if (col) g.px(xx, yy, col); }
    },
  };
}

/** Rim pass over a silhouette strip: pixels whose left / top neighbour is empty get a warm sunset rim. */
export function rimPass(g, left, top, width = 1, only = null) {
  const W = g.w, H = g.h, m = g.m, put = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    let l = false, t = false;
    for (let k = 1; k <= width; k++) { if (x - k < 0 || !m[y * W + x - k]) l = true; }
    if (y > 0 && !m[(y - 1) * W + x]) t = true;
    if (l && left) put.push(x, y, left); else if (t && top) put.push(x, y, top);
  }
  for (let i = 0; i < put.length; i += 3) if (!only || only(put[i], put[i + 1] + g.ya)) g.px(put[i], put[i + 1] + g.ya, put[i + 2]);
}

// ---------------------------------------------------------------- far skyline (p ≈ 0.12): hazy towers, a crane
export function farSkyline(L, x0, x1) {
  const P = painter(L), g = P.g, gy = P.Y(0);
  let x = x0, i = 0;
  while (x < x1) {
    const w = 22 + rnd(i * 7 + 1) * 40, h = 95 + rnd(i * 7 + 2) * 150 * (0.5 + 0.5 * Math.sin(i * 0.9 + 1) ** 2), gap = rnd(i * 7 + 3) < 0.35 ? 4 + rnd(i * 7 + 4) * 16 : 0, type = Math.floor(rnd(i * 7 + 5) * 5);
    const a = R(P.X(x)), b = R(P.X(x + w)), top = R(P.Y(-h));
    const shade = (X, Y) => { const v = 2.2 + 3.2 * clamp01((Y - (gy - 80)) / 80) + (X - a < 2 ? 0.8 : 0); return pick(FAR, band(v, X, Y)); };
    for (let Y = top; Y < gy + 2; Y++) for (let X = a; X < b; X++) g.px(X, Y, shade(X, Y));
    // roof shapes
    if (type === 1) { const s = R((b - a) * 0.22); for (let Y = top - R(h * 0.12); Y < top; Y++) for (let X = a + s; X < b - s; X++) g.px(X, Y, shade(X, Y)); }
    if (type === 2) { const m = R((a + b) / 2); for (let Y = top - R(h * 0.28); Y < top; Y++) g.px(m, Y, FAR[2]); g.px(m, top - R(h * 0.28) - 1, FAR[5]); for (let Y = top - 6; Y < top; Y++) for (let X = m - 3; X <= m + 3; X++) g.px(X, Y, FAR[2]); }
    if (type === 3) { // broken top: jagged notch + girders
      for (let X = a; X < b; X++) { const d = R(Math.abs(Math.sin((X - a) * 0.7 + i)) * 5 + (rnd(X * 13 + i) * 3) + ((X - a) / (b - a)) * 10); for (let Y = top; Y < top + d; Y++) g.erase(X, Y); }
      for (let k = 0; k < 3; k++) { const gx = a + 2 + R(rnd(i * 11 + k) * (b - a - 4)); for (let Y = top - 4 - R(rnd(k + i) * 6); Y < top + 6; Y++) g.px(gx, Y, FAR[1]); }
    }
    // dead windows: a grid of darker cells, a few catching the sunset
    for (let Y = top + 4; Y < gy - 20; Y += 4) for (let X = a + 2; X < b - 2; X += 3) {
      if (!g.has(X, Y)) continue;
      const r = rnd(X * 31 + Y * 17 + i);
      if (r < 0.62) g.px(X, Y, FAR[1]); else if (r > 0.975 && X - a < (b - a) * 0.5) g.px(X, Y, FAR[7]);
    }
    x += w + gap; i++;
  }
  // a construction crane on one of the towers
  const cx = lerp(x0, x1, 0.42), cb = P.Y(-230), ct = P.Y(-320), mx = R(P.X(cx));
  for (let Y = R(ct); Y < R(cb) + 30; Y++) { g.px(mx, Y, FAR[1]); g.px(mx + 3, Y, FAR[1]); if ((Y & 3) === 0) { g.px(mx + 1, Y, FAR[1]); g.px(mx + 2, Y + 1, FAR[1]); } }
  const jl = R(70 * P.z), jr = R(26 * P.z);
  for (let X = mx - jr; X <= mx + jl; X++) { g.px(X, R(ct), FAR[1]); g.px(X, R(ct) + 2, FAR[1]); if ((X & 3) === 0) g.px(X, R(ct) + 1, FAR[1]); }
  for (let X = mx - jr; X < mx - jr + 8; X++) for (let Y = R(ct) + 2; Y < R(ct) + 7; Y++) g.px(X, Y, FAR[1]);
  g.line(mx + 1, R(ct) - 12, mx + jl, R(ct), FAR[1]); g.line(mx + 1, R(ct) - 12, mx - jr, R(ct), FAR[1]);
  const hx = mx + R(jl * 0.7); for (let Y = R(ct) + 3; Y < R(ct) + 60; Y++) g.px(hx, Y, FAR[2]); g.rect(hx - 1, R(ct) + 60, 3, 3, FAR[1]);
  rimPass(g, FAR[6], FAR[5]);
}

// ---------------------------------------------------------------- mid skyline (p ≈ 0.27): blocks, ruins, a water tower
export function midSkyline(L, x0, x1) {
  const P = painter(L), g = P.g, gy = P.Y(0);
  let x = x0, i = 0;
  while (x < x1) {
    const w = 46 + rnd(i * 5 + 1) * 70, h = 110 + rnd(i * 5 + 2) * 120, gap = 6 + rnd(i * 5 + 3) * 34, kind = Math.floor(rnd(i * 5 + 4) * 4);
    const a = R(P.X(x)), b = R(P.X(x + w)), top = R(P.Y(-h)), H = gy - top;
    const shade = (X, Y) => pick(MID, band(2.1 + 2.6 * clamp01((Y - (gy - 60)) / 60) + (fbm(X * 0.05, Y * 0.05) - 0.5) * 0.7, X, Y));
    for (let Y = top; Y < gy + 2; Y++) for (let X = a; X < b; X++) g.px(X, Y, shade(X, Y));
    if (kind === 0) { // apartment block: balcony slabs every floor
      for (let fy = top + 8; fy < gy - 16; fy += 11) { for (let X = a + 2; X < b - 2; X++) { if (((X - a) % 14) < 10) { g.px(X, fy, MID[4]); g.px(X, fy + 1, MID[1]); } } for (let X = a + 4; X < b - 4; X += 7) if (rnd(X + fy * 3) > 0.25) { g.rect(X, fy - 6, 3, 4, rnd(X * 3 + fy) > 0.96 ? "#9A4660" : MID[0]); } }
    } else if (kind === 1) { // office: horizontal window bands
      for (let fy = top + 6; fy < gy - 14; fy += 8) for (let X = a + 2; X < b - 2; X++) { const r = rnd(X * 7 + fy * 13 + i); g.px(X, fy, r > 0.985 ? "#A24A62" : r > 0.2 ? MID[0] : MID[3]); g.px(X, fy + 1, MID[1]); }
    } else if (kind === 2) { // collapsed corner: a diagonal bite out of the top right, exposed floor slabs, holes to the sky
      const bite = R((b - a) * 0.55), bh = R(H * 0.45);
      for (let Y = top; Y < top + bh; Y++) for (let X = b - bite + R((Y - top) * (bite / bh) * 0.9 * (0.7 + 0.3 * rnd(Y))); X < b; X++) g.erase(X, Y);
      for (let fy = top + 10; fy < top + bh + 10; fy += 10) for (let X = b - bite - 4; X < b - R((fy - top) * 0.3); X++) if (rnd(X * 3 + fy) > 0.15) g.px(X, fy, MID[3]);
      for (let k = 0; k < 6; k++) { const hx = a + 3 + R(rnd(i * 9 + k) * (b - a - bite)), hy = top + 6 + R(rnd(i * 9 + k + 50) * H * 0.5); for (let Y = hy; Y < hy + 4; Y++) for (let X = hx; X < hx + 3; X++) g.erase(X, Y); }
      for (let fy = top + 6; fy < gy - 14; fy += 9) for (let X = a + 3; X < b - bite; X += 5) if (g.has(X, fy)) g.rect(X, fy, 2, 3, MID[0]);
    } else { // tower with a water tank on legs
      for (let fy = top + 6; fy < gy - 14; fy += 9) for (let X = a + 3; X < b - 3; X += 5) g.rect(X, fy, 2, 3, rnd(X + fy * 5) > 0.97 ? "#9A4660" : MID[0]);
      const tx = R((a + b) / 2), tw = 9, th = 10, ty = top - 14;
      g.rect(tx - 5, ty + th, 1, 14, MID[2]); g.rect(tx + 4, ty + th, 1, 14, MID[2]); g.line(tx - 5, ty + th + 2, tx + 4, top - 1, MID[2]);
      g.rect(tx - tw / 2 - 1, ty, tw + 1, th, MID[3]); for (let X = tx - 6; X <= tx + 4; X++) g.px(X, ty - 1 - (Math.abs(X - tx + 1) < 3 ? 1 : 0), MID[3]);
    }
    // rooftop clutter
    if (rnd(i * 5 + 9) > 0.5) { const ax = a + R(rnd(i) * (b - a - 4)); for (let Y = top - 10; Y < top; Y++) g.px(ax, Y, MID[2]); g.px(ax - 1, top - 8, MID[2]); g.px(ax + 1, top - 8, MID[2]); }
    x += w + gap; i++;
  }
  rimPass(g, "#B04E5C", "#8E4260");
}

// ---------------------------------------------------------------- near ruins (p ≈ 0.42): low houses with pitched roofs, round trees
export function ruinsLayer(L, x0, x1) {
  const P = painter(L), g = P.g, gy = P.Y(0);
  let x = x0, i = 0;
  while (x < x1) {
    const w = 60 + rnd(i * 3 + 11) * 50, h = 70 + rnd(i * 3 + 12) * 60, roof = 26 + rnd(i * 3 + 13) * 20;
    const a = R(P.X(x)), b = R(P.X(x + w)), top = R(P.Y(-h)), peak = R(P.Y(-h - roof)), m = R((a + b) / 2), broken = rnd(i * 3 + 14) > 0.55;
    const shade = (X, Y) => pick(N2, band(2.2 + 2 * clamp01((Y - (gy - 40)) / 40) + (fbm(X * 0.06, Y * 0.06) - 0.5) * 0.6, X, Y));
    for (let Y = top; Y < gy + 2; Y++) for (let X = a; X < b; X++) g.px(X, Y, shade(X, Y));
    for (let Y = peak; Y < top; Y++) { const half = ((Y - peak) / Math.max(1, top - peak)) * (b - a) * 0.56; for (let X = R(m - half); X < R(m + half); X++) g.px(X, Y, N2[1]); }
    if (broken) { for (let k = 0; k < 4; k++) { const hx = m - 6 + R(rnd(i * 13 + k) * 18), hy = peak + 4 + R(rnd(i * 17 + k) * (top - peak - 4)); for (let Y = hy; Y < hy + 3; Y++) for (let X = hx; X < hx + 4; X++) g.erase(X, Y); } for (let k = 0; k < 4; k++) g.line(m - 10 + k * 6, peak + 8, m - 8 + k * 6, top, N2[3]); }
    for (let wy = top + 8; wy < gy - 12; wy += 16) for (let wx = a + 6; wx < b - 8; wx += 14) g.rect(wx, wy, 5, 7, N2[0]);
    // a tree between houses
    if (rnd(i * 3 + 15) > 0.35) {
      const tx = b + R(4 + rnd(i) * 10), tr = 12 + R(rnd(i * 7) * 9), ty = gy - R(tr * 1.6);
      for (let Y = ty; Y < gy; Y++) for (let X = tx - 1; X <= tx + 1; X++) g.px(X, Y, N2[1]);
      for (let k = 0; k < 6; k++) { const bx = tx + R((rnd(i * 31 + k) - 0.5) * tr * 1.3), by = ty - R(rnd(i * 37 + k) * tr * 0.9), br = R(tr * (0.45 + 0.35 * rnd(i * 41 + k))); g.disc(bx, by, br, N2[2]); }
    }
    x += w + 8 + rnd(i * 3 + 16) * 36; i++;
  }
  rimPass(g, "#B8545A", "#94465C");
}

// ---------------------------------------------------------------- dusk pines (forest beyond the end of the road)
/** Draw a pine into a painter at layer x (base on the ground): dusk colours per raster code (W-trees.mjs PINE). */
export function townPine(P, wx, seed, H, W, col, bare = 0.3, clumps = false) {
  const r = clumps ? spruceRaster(seed, H, W, bare, P.z) : pineRaster(seed, H * P.z, W * P.z, bare), X0 = Math.round(P.X(wx)) - r.ax, Y0 = Math.round(P.Y(0)) - r.ay, g = P.g;
  const map = [null, col.body, col.lit, col.dark, col.trunk, col.trunkLit, clumps ? col.dark : col.clump];
  for (let y = 0; y < r.h; y++) for (let x = 0; x < r.w; x++) { const v = r.c[y * r.w + x]; if (v) g.px(X0 + x, Y0 + y, map[v]); }
}
export function deadTreeDraw(P, wx, seed, H, col) {
  for (const [x0, y0, x1, y1, w] of deadTree(seed, H)) {
    const n = Math.max(2, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * P.z));
    for (let k = 0; k <= n; k++) { const u = k / n, x = P.X(wx + lerp(x0, x1, u)), y = P.Y(lerp(y0, y1, u)), r = Math.max(0.5, w * P.z * 0.5); P.g.rect(R(x - r), R(y), Math.max(1, R(2 * r)), 1, col); }
  }
}
