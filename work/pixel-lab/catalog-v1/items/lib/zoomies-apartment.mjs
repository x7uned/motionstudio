// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-zoomies/film/apartment.mjs (drawApartment and its passes; lightAt, the
// bowl and the foreground are not ported). Changes: import paths (zoomies-*.mjs); only the living room is drawn (living
// wallpaper and planks everywhere, no bedroom / door / kitchen corner, no round bedroom rug); positions come from the
// re-laid-out catalog LAYOUT; the camera is the catalog camera through the zoomies-layout.mjs adapter; plank seams and the
// plank highlight / shadow bands are always exactly ≥ 1 pixel (the catalog camera drifts every frame, and a 0.9-px seam
// vanished for single frames).
// «Why your cat sleeps all day…» — the ONE persistent world: a side-view cross-section of an apartment.
// Bedroom (left) | open door | living room (sofa, clock, big window, curtain, floor lamp, rug) | kitchen corner (bowl,
// counter, fridge). Above the ceiling: the cut concrete slab, the roof and the sky. The hour `tod` drives the sky, the
// interior light and the sun patch on the floor continuously.
//
// Layers: walls and furniture at PROP_P = 0.96 (feet on wy = 0), floor plane and the bowl at p = 1 (= ground(cam)),
// foreground props at p ≈ 1.15–1.35. Everything is painted in albedo colours into a private scratch buffer, lit in one
// pass (ambient by hour, lamps, sun / moon shaft and floor patch), the sky and emissive bits go on top, then the buffer
// is copied into the caller's canvas.
import { LAYOUT, CEIL, layer, ground, rnd } from "./zoomies-layout.mjs";
import { hex, toHex } from "../../../../../renderer/pixel/raster.mjs";
import { W, H, D, K, BY, P, rgb, ramp, put, span, rect, poly, ellipse, disc, line, vol, smooth } from "./zoomies-px.mjs";
import { environment, sunPatch as envSunPatch } from "./zoomies-env.mjs";
import { PAL, WALLC, ROOF_Y, drawRoof, drawTrims, drawClockFace, clockMarks, drawLiving, drawWindow, glassRect, drawCurtain, drawFloorLamp, lampFloorGeom } from "./zoomies-props.mjs";
const lampBedGeom = () => ({ x: -1e9, cy: 0, shadeTop: 0, shadeBot: 0, wTop: 0, wBot: 0 });   // no bedroom lamp (lampBed stays 0)

export const PROP_P = 0.96, SKY_P = 0.12, SUN_P = 0.2, CLOUD_P = 0.25, FAR_P = 0.3, NEAR_P = 0.45;
export const propLayer = (cam) => layer(cam, PROP_P);
/** Ground-plane world point that lands on the same screen pixel as prop point (wx, wy) — e.g. to seat the cat on the
 *  sofa: toGround(cam, x, LAYOUT.sofa.seatTop). */
export function toGround(cam, wx, wy) { const Lp = propLayer(cam), G = ground(cam); return { wx: G.wx(Lp.X(wx)), wy: G.wy(Lp.Y(wy)) }; }
export { environment };
export const sunPatch = envSunPatch;

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const KIT_X = 1e9;              // catalog: no kitchen corner
const RUG = { x0: LAYOUT.rug.x0, x1: LAYOUT.rug.x1, y0: -10, y1: 40 };
const RUG2 = { cx: -1e9, cy: 12, rx: 74, ry: 17 };   // catalog: no bedroom rug
const LAMP_RGB = [1.0, 0.7, 0.36], FILL = 0.085, DOOR0 = LAYOUT.door.x0, DOOR1 = LAYOUT.door.x1;

// plank rows of the floor (world floor depth), taller toward the viewer
const ROWS = [-20]; while (ROWS[ROWS.length - 1] < 3000) { const l = ROWS[ROWS.length - 1]; ROWS.push(l + 6.5 + Math.max(0, l + 20) * 0.3); }

const FL = { a: rgb("#C68C54"), b: rgb("#BA7E48"), c: rgb("#D29C62"), seam: rgb("#6C4222"), grain: rgb("#A87040"), hi: rgb("#DEB07A"), sh: rgb("#9A6438"),
  tA: rgb("#E9DFC8"), tB: rgb("#D2A287"), tSeam: rgb("#9C8068"), tHi: rgb("#F6EEDA"), thr: rgb("#9A8A70"),
  rug: rgb("#E2D2AE"), rugD: rgb("#D2BE96"), rugB: rgb("#2E3A6A"), rugC: rgb("#B4513A"), rugG: rgb("#D8A040"), rugE: rgb("#3A2C40"), rugL: rgb("#F4EAD2"),
  r2: rgb("#F2E8D6"), r2b: rgb("#DCCFB8"), r2c: rgb("#C9BBA2") };
const WX = new Float32Array(W), FX = new Float32Array(W), WY = new Float32Array(H), FY = new Float32Array(H);

// ================================================================ base pass: wall, floor, sky marker
function basePass(L, G) {
  const yWall = Math.min(H, Math.max(0, R(L.Y(-20)))), z = L.z, zg = G.z;
  for (let x = 0; x < W; x++) { WX[x] = L.wx(x + 0.5); FX[x] = G.wx(x + 0.5); }
  for (let y = 0; y < H; y++) { WY[y] = L.wy(y + 0.5); FY[y] = G.wy(y + 0.5); }
  const lw = Math.max(0.42, 0.62 / z);
  for (let y = 0; y < yWall; y++) {
    const wy = WY[y], row = y * W;
    if (wy < ROOF_Y) { for (let x = 0; x < W; x++) K[row + x] = 3; continue; }
    const gyL = ((wy % 30) + 30) % 30, gyB = ((wy % 20) + 20) % 20, gyB2 = (((wy + 10) % 20) + 20) % 20;
    for (let x = 0; x < W; x++) {
      const wx = WX[x], i = row + x, j = i * 3; let c;
      if (wx < -1e9) {           // catalog: no bedroom (periwinkle paper with staggered dots)
        const cell = Math.floor(wx / 20), gx = ((wx % 20) + 20) % 20, gy = (cell & 1) ? gyB2 : gyB, d = Math.abs(gx - 10) + Math.abs(gy - 10);
        c = d < 1.9 + 0.3 / z ? WALLC.bedD : (d < 3.4 && z > 2.2 && (Math.abs(gx - 10) < 0.5 / z * 2 || Math.abs(gy - 10) < 0.5 / z * 2)) ? WALLC.bedF : WALLC.bed;
      } else if (wx < KIT_X) {   // living room: warm cream with a fine diamond lattice and a dot in each diamond
        const gx = ((wx % 30) + 30) % 30, d = Math.abs(gx - 15) + Math.abs(gyL - 15);
        c = Math.abs(d - 15) < lw ? WALLC.livL : d < 1.2 + 0.35 / z ? WALLC.livD : WALLC.liv;
      } else {                   // kitchen: sage paint with a faint vertical texture
        c = (((wx % 7) + 7) % 7 < 0.5 && z > 1.6) ? WALLC.kitL : WALLC.kit;
      }
      D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; K[i] = 0;
    }
  }
  // ---- floor: planks (living/bedroom), tiles (kitchen), rugs
  let r = 0;
  const seam = 1 / zg;   // catalog: exactly one pixel row/column per seam (0.9/zg let a seam fall between two samples for a frame)
  for (let y = yWall; y < H; y++) {
    const wy = FY[y]; while (r < ROWS.length - 2 && ROWS[r + 1] <= wy) r++;
    const r0 = ROWS[r], rh = ROWS[r + 1] - r0, fy = wy - r0, v = fy / rh, seamY = fy < seam, row = y * W;
    const PLn = 104 + (r % 3) * 18, off = rnd(r * 13 + 7) * PLn, tw = 32 + r * 2.6, toff = (r % 2) * tw / 2, gline = 0.3 + 0.4 * rnd(r * 5 + 1);
    const nearWall = wy < -15.5 ? (wy < -18 ? 0.75 : 0.45) : 0;
    const inRugY = wy >= RUG.y0 && wy < RUG.y1, rv = (wy - RUG.y0) / (RUG.y1 - RUG.y0);
    const r2y = (wy - RUG2.cy) / RUG2.ry;
    for (let x = 0; x < W; x++) {
      const wx = FX[x], i = row + x, j = i * 3, b = BY[(y & 3) * 4 + (x & 3)]; let c;
      if (inRugY && wx >= RUG.x0 && wx < RUG.x1) c = rugAt(wx, rv, b, zg);
      else if (r2y > -1 && r2y < 1 && Math.abs(wx - RUG2.cx) < RUG2.rx * Math.sqrt(1 - r2y * r2y) + (b - 0.5) * 3) {
        const e = Math.hypot((wx - RUG2.cx) / RUG2.rx, r2y); c = e > 0.86 ? (b < 0.5 ? FL.r2b : FL.r2c) : e > 0.62 && e < 0.7 ? FL.r2b : ((R(wx * 0.5) + R(wy)) % 3 === 0 && b < 0.3 ? FL.r2b : FL.r2);
      } else if (wx >= KIT_X) {
        if (wx < KIT_X + 3) c = FL.thr;
        else { const u = wx - KIT_X + toff, col = Math.floor(u / tw), fx = u - col * tw; c = seamY || fx < seam ? FL.tSeam : ((col + r) & 1) ? FL.tA : FL.tB; if (c === FL.tA && v < 0.16 && b < 0.4) c = FL.tHi; }
      } else {
        const u = wx + off, pi = Math.floor(u / PLn), fx = u - pi * PLn;
        if (seamY || fx < seam) c = FL.seam;
        else {
          const tone = rnd(pi * 31 + r * 131); c = tone < 0.34 ? FL.a : tone < 0.67 ? FL.b : FL.c;
          if (Math.abs(v - gline) < 0.5 / Math.max(1, rh * zg) + 0.012 && fx > PLn * rnd(pi * 7 + r) * 0.5 && fx < PLn * (0.5 + rnd(pi * 11 + r) * 0.5)) c = FL.grain;
          else if (v < Math.max(0.13, 2 / (rh * zg)) && b < 0.45) c = FL.hi;   // catalog: the highlight band is at least one pixel row below the 1-px seam (with 1/(rh·zg) it fell inside the seam and blinked; found by the bedroom port)
          else if (v >= Math.min(0.9, 1 - 1 / (rh * zg)) && b < 0.3) c = FL.sh;   // catalog: >= so exactly one pixel row always falls in the band
        }
      }
      if (nearWall && b < nearWall) c = FL.seam;
      D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; K[i] = 1;
    }
  }
}
function rugAt(wx, v, b, zg) {
  const fr = 7, x0 = RUG.x0, x1 = RUG.x1;
  if (wx < x0 + fr || wx >= x1 - fr) { // fringe: cream threads on a dark gap
    if (v < 0.08 || v > 0.92) return b < 0.5 ? FL.rugE : FL.seam;
    return (((wx % 2.4) + 2.4) % 2.4) < Math.max(1.1, 1.2 / zg) ? FL.rugL : FL.seam;
  }
  if (v > 0.935) return v > 0.975 ? FL.rugE : FL.rugD;         // near edge (thickness)
  const u = wx - x0 - fr, len = x1 - x0 - 2 * fr;
  if (v < 0.14 || v > 0.8 || u < 12 || u > len - 12) {         // navy border with cream lines and gold ticks
    if ((v > 0.05 && v < 0.085) || (v > 0.855 && v < 0.89) || (u > 4 && u < 6) || (u > len - 6 && u < len - 4)) return FL.rugL;
    const tk = ((u % 12) + 12) % 12; if ((v > 0.1 && v < 0.13) || (v > 0.81 && v < 0.84)) return tk < 3 ? FL.rugG : FL.rugB;
    return FL.rugB;
  }
  // cream field with stepped terracotta diamonds around navy/gold centres and little terracotta dashes between
  const P0 = 44, cu = (((u - 22) % P0) + P0) % P0 - P0 / 2, vv = (v - 0.47) / 0.3, d = Math.abs(cu) / 18 + Math.abs(vv);
  if (Math.abs(d - 0.8) < 0.11) return FL.rugC;
  if (d < 0.3) return FL.rugB;
  if (d < 0.42) return FL.rugG;
  if (Math.abs(cu) > 19.5 && Math.abs(vv) < 0.22) return FL.rugC;
  return d > 0.95 && ((R(u) + R(v * 40)) & 7) === 0 ? FL.rugD : FL.rug;
}

// ================================================================ light model (shared by the pass, lightAt and the bowl/foreground)
function lamps(st) {
  const out = [], gb = lampBedGeom(), gf = lampFloorGeom();
  if ((st.lampBed ?? 0) > 0.001) out.push({ k: st.lampBed, x: gb.x, y: gb.cy, top: gb.shadeTop, bot: gb.shadeBot, wT: gb.wTop, wB: gb.wBot, R: 210, up: 0.34, down: 0.42, upLen: 150, downLen: 120, xMin: -1e9, xMax: LAYOUT.door.x0, pool: [gb.x + 14, 2, 120, 32] });
  if ((st.lampLiving ?? 0) > 0.001) out.push({ k: st.lampLiving, x: gf.x, y: gf.cy, top: gf.shadeTop, bot: gf.shadeBot, wT: gf.wTop, wB: gf.wBot, R: 300, up: 0.34, down: 0.3, upLen: 170, downLen: 260, xMin: LAYOUT.door.x1, xMax: 1e9, pool: [gf.x - 20, 6, 235, 62] });
  return out;
}
/** Unquantised light of one lamp at a world point. floor = true → (wx, wy) are floor-plane coordinates. */
function lampField(l, wx, wy, floor) {
  if (floor) { const [px, py, rx, ry] = l.pool, dx = (wx - px) / rx, dy = (wy - py) / ry, d = dx * dx + dy * dy; return d < 1 ? l.k * 1.05 * Math.pow(1 - Math.sqrt(d), 1.25) : 0; }
  if (wy < CEIL + 0.5 || wx < l.xMin || wx > l.xMax) return 0;
  const dx = wx - l.x, dy = wy - l.y, d2 = dx * dx + dy * dy; if (d2 > l.R * l.R) return 0;
  const f = 1 - Math.sqrt(d2) / l.R; let v = Math.pow(f, 1.8) * 0.95;
  // soft cones out of the top and bottom openings of the shade
  if (wy < l.top) { const s = l.top - wy, a = Math.abs(dx) - (l.wT + s * 0.42), e = 6 + s * 0.4, edge = a <= -e ? 1 : a >= e ? 0 : 0.5 - a / (2 * e); if (edge > 0) v += l.up * edge * Math.pow(Math.max(0, 1 - s / l.upLen), 1.4); }
  else if (wy > l.bot) { const s = wy - l.bot, a = Math.abs(dx) - (l.wB + s * 0.5), e = 6 + s * 0.4, edge = a <= -e ? 1 : a >= e ? 0 : 0.5 - a / (2 * e); if (edge > 0) v += l.down * edge * Math.pow(Math.max(0, 1 - s / l.downLen), 1.4); }
  return l.k * v;
}
/** Sun/moon patch on the floor (floor coords). */
function patchField(b, wx, wy) {
  if (wy < b.y0 - 2 || wy > b.y1 + 2) return 0;
  const sk = b.skew * (wy - b.y0), xa = b.x0 + sk, xb = b.x1 + sk, e = 7;
  if (wx < xa - 1 || wx > xb + 1) return 0;
  let v = Math.min(1, (wx - xa) / e, (xb - wx) / e, (wy - b.y0 + 2) / 6, (b.y1 + 2 - wy) / 9);
  const u = (wx - xa) / (xb - xa), vv = (wy - b.y0) / (b.y1 - b.y0);
  if (Math.abs(u - 0.5) < 0.028 || Math.abs(vv - 0.42) < 0.05) v *= 0.35;   // window cross shadow
  return Math.max(0, v) * b.a;
}
/** Light shaft on the wall between the sill and the floor patch (wall coords). */
function shaftField(b, wx, wy) {
  const Wn = LAYOUT.window; if (wy < Wn.sill || wy > -18) return 0;
  const k = (wy - Wn.sill) / (-20 - Wn.sill), xa = Wn.x0 + 8 + (b.x0 - Wn.x0 - 8) * k, xb = Wn.x1 - 8 + (b.x1 - Wn.x1 + 8) * k;
  if (wx < xa || wx > xb) return 0;
  const u = (wx - xa) / (xb - xa); let v = Math.min(1, (wx - xa) / 10, (xb - wx) / 10, (wy - Wn.sill) / 14);
  if (Math.abs(u - 0.5) < 0.03) v *= 0.4;
  return v * b.a * b.shaft * 0.5;
}

/** Quantise a light amount into flat bands of 1/4 with a narrow dithered transition. */
const q4 = (v, b) => { if (v <= 0.02) return 0; const s = v * 4, n = Math.floor(s), f = s - n; return (f > 0.64 || (f > 0.36 && (f - 0.36) / 0.28 > b) ? n + 1 : n) * 0.25; };
const q6 = (v, b) => { if (v <= 0.015) return 0; const s = v * 6, n = Math.floor(s), f = s - n; return (f > 0.66 || (f > 0.34 && (f - 0.34) / 0.32 > b) ? n + 1 : n) / 6; };

function lightPass(L, G, st, E) {
  const yWall = Math.min(H, Math.max(0, R(L.Y(-20)))), LS = lamps(st), BM = E.beams;
  const [ar, ag, ab] = E.amb, sat = E.sat, [dr, dg, db] = E.add, ns = 1 - sat;
  const lr = LAMP_RGB[0], lg = LAMP_RGB[1], lb = LAMP_RGB[2], fillB = FILL * (st.lampBed ?? 0), fillL = FILL * (st.lampLiving ?? 0);
  for (let y = 0; y < H; y++) {
    const floorRow = y >= yWall, wyW = WY[y], wyF = FY[y], row = y * W, br = (y & 3) * 4;
    // wall ambient occlusion: darker toward the ceiling (three bands), lighter near the floor
    const aoV = floorRow ? 0 : clamp01((-wyW - 230) / 200);
    // which lights can touch this row
    const lrow = LS.filter((l) => floorRow ? Math.abs(wyF - l.pool[1]) < l.pool[3] + 2 : Math.abs(wyW - l.y) < l.R + 2 || wyW < l.top);
    const brow = BM.filter((b) => floorRow ? wyF > b.y0 - 3 && wyF < b.y1 + 3 : wyW > LAYOUT.window.sill && wyW < -18);
    const fillRow = (fillB > 0 || fillL > 0) && (floorRow || wyW > CEIL);
    for (let x = 0; x < W; x++) {
      const i = row + x, kd = K[i]; if (kd >= 3) continue;
      const bb = BY[br + (x & 3)];
      let ao = 1; if (aoV > 0) { const s = aoV * 5, n = Math.floor(s), f = s - n; ao = 1 - 0.036 * (f > bb ? n + 1 : n); }
      let mr = ar * ao, mg = ag * ao, mb = ab * ao, warmR = 0, warmG = 0;
      if (fillRow) { const wx = floorRow ? FX[x] : WX[x], f = wx < DOOR0 ? fillB : wx > DOOR1 ? fillL : 0; mr += f * lr; mg += f * lg; mb += f * lb; }
      if (lrow.length) { const wx = floorRow ? FX[x] : WX[x], wy = floorRow ? wyF : wyW; for (const l of lrow) { const v = q6(lampField(l, wx, wy, floorRow && kd === 1), bb); if (v) { mr += v * lr; mg += v * lg; mb += v * lb; } } }
      if (brow.length && (!floorRow || kd === 1)) {
        for (const b of brow) { const v = floorRow ? q4(patchField(b, FX[x], wyF), bb) : q4(shaftField(b, WX[x], wyW), bb); if (v) { mr += v * b.col[0]; mg += v * b.col[1]; mb += v * b.col[2]; if (floorRow) { warmR += v * b.col[0] * 26; warmG += v * b.col[1] * 14; } } }
      }
      const j = i * 3, r = D[j], g = D[j + 1], bl = D[j + 2], lum = (0.3 * r + 0.59 * g + 0.11 * bl) * ns;
      D[j] = (sat * r + lum) * mr + dr + warmR; D[j + 1] = (sat * g + lum) * mg + dg + warmG; D[j + 2] = (sat * bl + lum) * mb + db;
    }
  }
}

// ================================================================ sky pass (only pixels with K = 3)
const STARS = Array.from({ length: 520 }, (_, i) => ({ x: -1000 + rnd(i * 3 + 1) * 2000, y: -1000 + rnd(i * 5 + 2) * 900, m: rnd(i * 7 + 3), f: 1.3 + rnd(i * 11) * 2.4, ph: rnd(i * 13) * 6.28 }));
const CLOUDS = Array.from({ length: 9 }, (_, i) => {
  const w = 54 + rnd(i * 17) * 70, n = 6 + Math.floor(rnd(i * 19) * 3), puffs = [];
  for (let k = 0; k < n; k++) {
    const u = (k + 0.5) / n, bump = Math.pow(Math.sin(Math.PI * u), 0.8), r = 6 + 12 * bump * (0.7 + 0.6 * rnd(i * 29 + k));
    puffs.push([(u - 0.5) * w, -r * 0.62 - 3 * bump * rnd(i * 23 + k), r]);
  }
  return { x: [30, -420, -330, -150, 170, 520, 280, -40, 700][i], y: [-150, -215, -300, -505, -565, -180, -470, -650, -260][i], v: 1.1 + rnd(i * 37) * 1.6, w, puffs };
});
function skyline(seed, n, x0, wMin, wMax, hMin, hMax) {
  const out = []; let x = x0;
  for (let i = 0; i < n; i++) { const w = wMin + rnd(seed + i * 3) * (wMax - wMin), h = hMin + rnd(seed + i * 7) * (hMax - hMin); out.push({ x0: x, x1: x + w, top: -h, i, roof: rnd(seed + i * 11) }); x += w + (rnd(seed + i * 13) < 0.25 ? 4 + rnd(seed + i) * 10 : 0); }
  return out;
}
const FAR = skyline(1000, 70, -1300, 26, 60, 110, 182), NEAR = skyline(5000, 60, -1250, 30, 64, 92, 150);

function mixPx(i, c, k) { const j = i * 3; D[j] += (c[0] - D[j]) * k; D[j + 1] += (c[1] - D[j + 1]) * k; D[j + 2] += (c[2] - D[j + 2]) * k; }

function skyPass(cam, E, t) {
  const S = layer(cam, SKY_P), [cb, cm, ct] = E.sky, NB = 9;
  const col = (g) => (g < 0.38 ? lerp3(cb, cm, g / 0.38) : lerp3(cm, ct, (g - 0.38) / 0.62));
  for (let y = 0; y < H; y++) {
    const wy = S.wy(y + 0.5), g = clamp01((-70 - wy) / 640), s = g * NB, n = Math.floor(s), f = s - n;
    const lo = col(n / NB), hi = col(Math.min(1, (n + 1) / NB)), row = y * W, br = (y & 3) * 4, th = (f - 0.55) / 0.45;
    for (let x = 0; x < W; x++) { const i = row + x; if (K[i] !== 3) continue; const c = th > BY[br + (x & 3)] ? hi : lo, j = i * 3; D[j] = c[0]; D[j + 1] = c[1]; D[j + 2] = c[2]; }
  }
  P.mask = 3; P.kind = 3;
  // stars
  if (E.stars > 0.01) {
    const SL = S, starC = [253, 254, 237];
    for (let i = 0; i < STARS.length; i++) {
      const s = STARS[i], X = R(SL.X(s.x)), Y = R(SL.Y(s.y)); if (X < 1 || Y < 1 || X >= W - 1 || Y >= H - 1) continue;
      const k = Y * W + X; if (K[k] !== 3) continue;
      const tw = 0.62 + 0.38 * Math.sin(t * s.f + s.ph), lv = E.stars * clamp01((-s.y - 90) / 120) * tw * (s.m < 0.15 ? 1 : s.m < 0.55 ? 0.75 : 0.5);
      mixPx(k, starC, lv);
      if (s.m < 0.06 && lv > 0.3) for (const d of [1, -1, W, -W]) if (K[k + d] === 3) mixPx(k + d, starC, lv * 0.45);
    }
  }
  // sun with a dithered glow
  { const SP = layer(cam, SUN_P), sp = E.sunP; if (sp.vis > 0.01) {
    const cx = SP.X(sp.x), cy = SP.Y(sp.y), r = (11 + 4 * (1 - sp.up)) * SP.z, gr = r * 3.2;
    const ya = Math.max(0, Math.floor(cy - gr)), yb = Math.min(H - 1, Math.ceil(cy + gr));
    for (let y = ya; y <= yb; y++) for (let x = Math.max(0, Math.floor(cx - gr)); x <= Math.min(W - 1, Math.ceil(cx + gr)); x++) {
      const i = y * W + x; if (K[i] !== 3) continue; const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy), b = BY[(y & 3) * 4 + (x & 3)];
      if (d < r) mixPx(i, d < r * 0.62 ? [255, 255, 244] : E.sun, sp.vis);
      else if (d < gr) { const g = (1 - (d - r) / (gr - r)), lvl = g * g * 3, n = Math.floor(lvl), f = lvl - n, q = (f > b ? n + 1 : n) / 3; if (q > 0) mixPx(i, E.glow, q * 0.42 * sp.vis); }
    }
  } }
  // moon with craters and a soft halo
  { const SP = layer(cam, SUN_P), mp = E.moonP; if (mp.vis > 0.01) {
    const cx = SP.X(mp.x), cy = SP.Y(mp.y), r = 11 * SP.z, gr = r * 2.6, cr = [[-0.35, -0.25, 0.22], [0.28, 0.18, 0.17], [-0.08, 0.45, 0.12], [0.3, -0.42, 0.1]];
    for (let y = Math.max(0, Math.floor(cy - gr)); y <= Math.min(H - 1, Math.ceil(cy + gr)); y++) for (let x = Math.max(0, Math.floor(cx - gr)); x <= Math.min(W - 1, Math.ceil(cx + gr)); x++) {
      const i = y * W + x; if (K[i] !== 3) continue; const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy), b = BY[(y & 3) * 4 + (x & 3)];
      if (d < r) { let c = d > r - Math.max(1, 0.8 * SP.z) ? [184, 184, 220] : (-dx * 0.5 - dy * 0.6 + r * 0.25 > b * r * 0.6 ? [253, 254, 237] : [216, 216, 240]); for (const [ux, uy, ur] of cr) if (Math.hypot(dx / r - ux, dy / r - uy) < ur) c = [184, 184, 220]; mixPx(i, c, mp.vis); }
      else if (d < gr) { const g = 1 - (d - r) / (gr - r), q = (g * g * 2 > b ? 1 : 0) * 0.5 + (g > 0.7 ? 0.5 : 0); if (q > 0) mixPx(i, [120, 124, 190], q * 0.22 * mp.vis); }
    }
  } }
  // clouds drifting in their own layer
  if (E.cloudA > 0.02) {
    const CL = layer(cam, CLOUD_P), per = 1900, [chi, cmi, clo] = E.cloud.map((c) => lerp3(E.sky[1], c, E.cloudA));
    for (const cl of CLOUDS) {
      const x = ((cl.x + t * cl.v + per / 2) % per + per) % per - per / 2, by = cl.y;
      if (CL.X(x + cl.w) < -20 || CL.X(x - cl.w) > W + 20) continue;
      const top = by - 26, ybase = CL.Y(by + 1);
      const shade = (sx, sy) => { if (sy > ybase) return null; const wy = CL.wy(sy + 0.5), v = (wy - top) / 27, b = BY[(sy & 3) * 4 + (sx & 3)]; return v < 0.42 + (b - 0.5) * 0.12 ? chi : v < 0.8 + (b - 0.5) * 0.12 ? cmi : clo; };
      for (const [dx, dy, r] of cl.puffs) ellipse(CL.X(x + dx), CL.Y(by + dy), r * CL.z, r * CL.z, shade);
      rect(CL.X(x - cl.w * 0.42), CL.Y(by - 6), CL.X(x + cl.w * 0.42), ybase, shade);
    }
  }
  // skyline: far (hazy) and near (darker, windows)
  for (const [lp, list, base, near] of [[FAR_P, FAR, E.far, false], [NEAR_P, NEAR, E.near, true]]) {
    const SL = layer(cam, lp), z = SL.z, edge = lerp3(base, [255, 255, 255], near ? 0.16 : 0.1), dark = lerp3(base, [0, 0, 0], 0.18);
    const win = lerp3(base, [255, 246, 214], 0.22), lit = [244, 202, 80], lit2 = [255, 226, 140];
    for (const b of list) {
      const x0 = SL.X(b.x0), x1 = SL.X(b.x1), y0 = SL.Y(b.top); if (x1 < 0 || x0 > W || y0 > H) continue;
      rect(x0, y0, x1, H, base);
      rect(x0, y0, x0 + Math.max(1, R(1.2 * z)), H, edge); rect(x1 - Math.max(1, R(1.5 * z)), y0, x1, H, dark);
      if (b.roof < 0.25) { const ax = (b.x0 + b.x1) / 2; rect(SL.X(ax) - Math.max(0.5, 0.5 * z), SL.Y(b.top - 14), SL.X(ax) + Math.max(1, 0.8 * z), y0, base); }
      else if (b.roof > 0.82) { rect(SL.X(b.x0 + 5), SL.Y(b.top - 7), SL.X(b.x0 + 15), y0, dark); }
      // windows
      const ww = 3.2, wh = 4.2, gx = 6.6, gy = 8.4, nightK = clamp01((E.lit - 0.04) / 0.2), unlit = lerp3(win, near ? dark : base, nightK);
      for (let wy = b.top + 6; wy < b.top + 240; wy += gy) { const Y0 = SL.Y(wy); if (Y0 > H) break; for (let wx = b.x0 + 4; wx < b.x1 - 5; wx += gx) {
        const h = rnd(b.i * 997 + R(wx * 3) * 31 + R(wy * 7)), on = clamp01((E.lit * (near ? 1 : 0.8) - h) / 0.06);
        if (!near && on <= 0 && nightK >= 1) continue;
        const c = on > 0 ? lerp3(unlit, h < E.lit * 0.35 ? lit2 : lit, on) : unlit;
        rect(SL.X(wx), Y0, Math.max(SL.X(wx) + 1, SL.X(wx + ww)), Math.max(Y0 + 1, SL.Y(wy + wh)), c);
      } }
    }
  }
  P.mask = -1; P.kind = 2;
}
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/** Faint diagonal reflections on the window glass (on top of the sky, inside the glass only). */
function glassShine(L, E) {
  const g = glassRect(), x0 = L.X(g.x0), x1 = L.X(g.x1), y0 = L.Y(g.y0), y1 = L.Y(g.y1), z = L.z, k = 0.13 * (1 - 0.6 * E.dark);
  if (x1 < 0 || x0 > W || y1 < 0 || y0 > H) return;
  for (let y = Math.max(0, R(y0)); y < Math.min(H, R(y1)); y++) for (let x = Math.max(0, R(x0)); x < Math.min(W, R(x1)); x++) {
    const i = y * W + x; if (K[i] !== 3) continue;
    const s = ((x - x0) + (y - y0) * 0.9) / z, m = ((s % 120) + 120) % 120;
    if ((m > 18 && m < 30) || (m > 36 && m < 40)) mixPx(i, [255, 255, 255], k);
  }
}

// ================================================================ emissive pass: lamp shades, halos, motes, luminous clock
function emissive(L, G, st, E) {
  const t = st.t ?? 0;
  for (const [geom, k] of [[lampBedGeom(), st.lampBed ?? 0], [lampFloorGeom(), st.lampLiving ?? 0]]) {
    if (k <= 0.001) continue;
    const z = L.z, cx = L.X(geom.x), cyS = L.Y(geom.cy), Rg = 46 * z;
    // halo in the air around the shade
    for (let y = Math.max(0, R(cyS - Rg)); y < Math.min(H, R(cyS + Rg)); y++) for (let x = Math.max(0, R(cx - Rg)); x < Math.min(W, R(cx + Rg)); x++) {
      const d = Math.hypot(x - cx, (y - cyS) * 1.15) / Rg; if (d >= 1) continue; const b = BY[(y & 3) * 4 + (x & 3)], lv = (1 - d) * (1 - d) * 3, n = Math.floor(lv), q = (lv - n > b ? n + 1 : n) / 3;
      if (q > 0) mixPx(y * W + x, [255, 214, 140], q * 0.38 * k);
    }
    // glowing shade
    P.alpha = Math.min(1, k * 1.15); P.kind = 4;
    const q = [[geom.x - geom.wTop, geom.shadeTop], [geom.x + geom.wTop, geom.shadeTop], [geom.x + geom.wBot, geom.shadeBot], [geom.x - geom.wBot, geom.shadeBot]].map((p) => [L.X(p[0]), L.Y(p[1])]);
    const sx0 = L.X(geom.x - geom.wBot), sw = geom.wBot * 2 * z, syT = L.Y(geom.shadeTop), sh = (geom.shadeBot - geom.shadeTop) * z;
    poly(q, (x, y) => { const u = Math.abs((x + 0.5 - sx0) / sw - 0.5) * 2, v = (y + 0.5 - syT) / sh; return u > 0.86 ? [246, 190, 104] : v > 0.86 ? [255, 250, 226] : u < 0.45 ? [255, 238, 178] : [252, 214, 130]; });
    for (let i = 0; i < 4; i++) line(q[i][0], q[i][1], q[(i + 1) % 4][0], q[(i + 1) % 4][1], [214, 150, 70]);
    ellipse(cx, L.Y(geom.shadeBot) + 0.5, geom.wBot * 0.8 * z, Math.max(1, 2.2 * z), [255, 252, 236]);
    P.alpha = 1; P.kind = 2;
  }
  // dust motes drifting in the sun shaft
  for (const b of E.beams) {
    if (b.a * b.motes < 0.08) continue;
    const Wn = LAYOUT.window;
    for (let i = 0; i < 26; i++) {
      const v = (rnd(i * 17 + 3) + t * (0.018 + 0.02 * rnd(i * 5))) % 1, k = v, wy = Wn.sill + 6 + k * (-28 - Wn.sill);
      const xa = Wn.x0 + 8 + (b.x0 - Wn.x0 - 8) * k, xb = Wn.x1 - 8 + (b.x1 - Wn.x1 + 8) * k, u = 0.12 + 0.76 * rnd(i * 23 + 1) + 0.04 * Math.sin(t * 0.7 + i);
      const X = R(L.X(xa + (xb - xa) * u)), Y = R(L.Y(wy)), lv = Math.sin(Math.PI * v) * b.a * b.motes * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 2.1));
      if (X < 0 || Y < 0 || X >= W || Y >= H || lv < 0.05) continue; const s = Math.max(1, R(L.z * 0.8));
      for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) if (X + dx < W && Y + dy < H) mixPx((Y + dy) * W + X + dx, [255, 246, 210], Math.min(0.8, lv));
    }
  }
  // at night the pale clock face catches a little light; luminous hands/ticks
  if (E.dark > 0.25) {
    const C0 = LAYOUT.clock, cxs = L.X(C0.x), cys = L.Y(C0.y), rf = (C0.r - 4.6) * L.z, kf = (E.dark - 0.25) / 0.75 * 0.3;
    for (let y = Math.max(0, R(cys - rf)); y <= Math.min(H - 1, R(cys + rf)); y++) for (let x = Math.max(0, R(cxs - rf)); x <= Math.min(W - 1, R(cxs + rf)); x++) {
      if (Math.hypot(x + 0.5 - cxs, y + 0.5 - cys) > rf) continue; const j = (y * W + x) * 3; if (D[j] + D[j + 1] + D[j + 2] < 130) continue; mixPx(y * W + x, [200, 196, 238], kf);
    }
  }
  if (E.dark > 0.25) {
    const m = clockMarks(L, st.clock ?? 3), k = (E.dark - 0.25) / 0.75 * 0.8, cc = [190, 246, 214];
    for (const [x, y, s] of m.dots) { const r = Math.max(0.5, s * m.z * 0.7); for (let yy = R(y - r); yy <= R(y + r); yy++) for (let xx = R(x - r); xx <= R(x + r); xx++) if (xx >= 0 && yy >= 0 && xx < W && yy < H && Math.hypot(xx - x, yy - y) <= r + 0.3) mixPx(yy * W + xx, cc, k); }
    for (const [a, len] of m.hands) { const n = Math.ceil(len * m.z * 1.5); for (let s = 0; s <= n; s++) { const f = 0.25 + 0.7 * (s / n), X = R(m.cx + Math.cos(a) * len * f * m.z), Y = R(m.cy + Math.sin(a) * len * f * m.z); if (X >= 0 && Y >= 0 && X < W && Y < H) mixPx(Y * W + X, cc, k); } }
  }
}

// ================================================================ API
/**
 * Everything behind the actors, full frame to every edge.
 * st = { t, tod, lampBed = 0, lampLiving = 0, clock, bedBlanket = 1, curtainSwing = 0 }
 */
export function drawApartment(c, cam, st) {
  st = { t: 0, tod: 12, lampBed: 0, lampLiving: 0, clock: st?.tod ?? 12, bedBlanket: 1, curtainSwing: 0, ...st };
  const E = environment(st.tod), L = propLayer(cam), G = ground(cam);
  P.kind = 2; P.alpha = 1; P.mask = -1;
  basePass(L, G);
  drawRoof(L); drawTrims(L);
  drawWindow(L);
  drawClockFace(L, st.clock);
  drawLiving(L, st);
  drawFloorLamp(L);
  drawCurtain(L, st.t, st.curtainSwing);
  lightPass(L, G, st, E);
  skyPass(cam, E, st.t);
  glassShine(L, E);
  emissive(L, G, st, E);
  blit(c);
  return E;
}
function blit(c) {
  if (!Object.prototype.hasOwnProperty.call(c, "px") && c.d && c.d.length === D.length) { c.d.set(D); return; }
  const v = [0, 0, 0];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const j = (y * W + x) * 3; c.px(x, y, [D[j], D[j + 1], D[j + 2]]); }
  void v;
}

