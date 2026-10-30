// catalog-v1 copy (2026-10-26) of work/pixel-lab/zombie-mouse/film/town-street.mjs#building (+ window_, acUnit, shutter,
// shopWindow, door, awning, collapse, fireEscape, signBox, vines verbatim), with the helpers it needs copied from
// zombie-mouse/film/W-util.mjs (vnoise, fbm, band, pick, Strip) and town-art.mjs (painter, palettes).
// changes: imports re-pointed (raster.mjs, engine/layout.mjs); nothing else edited. The catalog item (items/building.mjs)
// paints one facade into a Strip per quantised zoom and adds its lit windows, night grade and shake per frame.
import { mix, bayer, Canvas, hex } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, clamp01, lerp } from "../../engine/layout.mjs";

const R = Math.round;
// ---------------------------------------------------------------- noise
const h2 = (x, y) => rnd((x * 7919) ^ (y * 104729) ^ 0x5bd1e995);
/** A well-mixed integer hash → [0, 1) (murmur-style finaliser; no streaks along rows or columns). */
export const hash2s = (x, y) => { let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul((y | 0) + 0x9e3779b9, 0x165667b1); h = Math.imul(h ^ (h >>> 15), 0x85ebca6b); h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}
export const fbm = (x, y) => 0.55 * vnoise(x, y) + 0.3 * vnoise(x * 2.1 + 17, y * 2.1 + 5) + 0.15 * vnoise(x * 4.3 + 3, y * 4.3 + 29);
export function band(v, X, Y) {
  const fl = Math.floor(v), f = v - fl;
  return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(X, Y) ? fl + 1 : fl;
}
/** Full ordered-dither quantisation (smooth gradients like skies). */
export const dq = (v, X, Y) => { const fl = Math.floor(v); return v - fl > bayer(X, Y) ? fl + 1 : fl; };
export const pick = (ramp, i) => ramp[Math.max(0, Math.min(ramp.length - 1, i))];
export class Strip extends Canvas {
  constructor(w, ya, h) {
    super(Math.max(1, w), Math.max(1, h), "#000000");
    this.ya = ya; this.m = new Uint8Array(this.w * this.h); this.top = Infinity; this.bot = -Infinity;
  }
  px(x, y, c) {
    if (!this.m) return;
    x = Math.floor(x); y = Math.floor(y) - this.ya;
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x, k = i * 3; this.d[k] = r; this.d[k + 1] = g; this.d[k + 2] = b; this.m[i] = 1;
    if (y < this.top) this.top = y; if (y > this.bot) this.bot = y;
  }
  get(x, y) { x = Math.max(0, Math.min(this.w - 1, x | 0)); y = Math.max(0, Math.min(this.h - 1, (y | 0) - this.ya)); const i = (y * this.w + x) * 3; return [this.d[i], this.d[i + 1], this.d[i + 2]]; }
  has(x, y) { x |= 0; y = (y | 0) - this.ya; return x >= 0 && y >= 0 && x < this.w && y < this.h && this.m[y * this.w + x] === 1; }
  erase(x, y) { x = Math.floor(x); y = Math.floor(y) - this.ya; if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.m[y * this.w + x] = 0; }
  /** 1-px outline around everything drawn so far (outside pixels touching the mask). */
  outline(col, only = null) {
    const W = this.w, H = this.h, m = this.m, add = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (m[y * W + x]) continue;
      if ((x > 0 && m[y * W + x - 1] === 1) || (x < W - 1 && m[y * W + x + 1] === 1) || (y > 0 && m[(y - 1) * W + x] === 1) || (y < H - 1 && m[(y + 1) * W + x] === 1)) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) if (!only || only(add[i], add[i + 1] + this.ya)) this.px(add[i], add[i + 1] + this.ya, col);
  }
}

/** Composite strip s onto canvas c with its column 0 at screen x = ox (integer); rows keep their screen y. */
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
// ---------------------------------------------------------------- building facades
/**
 * spec: { x0, x1, h, mat: "brick"|"plaster", storeys, ground: "shutter"|"shop"|"door", wins: 0..1 boarded share,
 *         roof: "flat"|"collapsed"|"parapet", vines: 0..1, seed, rim: bool, escape: bool, sign: bool, ac: bool }
 */
export function building(L, s) {
  const P = painter(L), g = P.g, z = P.z, seed = s.seed;
  const ramp = s.mat === "brick" ? BRICK : PLAST;
  const a = R(P.X(s.x0)), b = R(P.X(s.x1)), gy = R(P.Y(0)), top = R(P.Y(-s.h)), H = gy - top, W = b - a;
  const storeyH = (s.h - 20) / s.storeys;
  // the body
  for (let Y = top; Y < gy + 1; Y++) for (let X = a; X < b; X++) {
    const u = (X - a) / W, v = (Y - top) / H;
    let tone = 2.5 + 0.8 * (1 - v) - 1.1 * clamp01((v - 0.82) / 0.18) + (fbm(X * 0.045 + seed, Y * 0.04) - 0.5) * 1.0;
    let rr = ramp;
    if (s.mat === "brick") { const row = Math.floor((Y - top) / 4); if ((Y - top) % 4 === 3) tone -= 0.7; else if ((X - a + (row % 2) * 4) % 8 === 0) tone -= 0.55; }
    else if (fbm(X * 0.05 + seed * 3, Y * 0.05 + 7) > 0.72) { rr = BRICK; const row = Math.floor((Y - top) / 4); tone -= 0.6; if ((Y - top) % 4 === 3 || (X - a + (row % 2) * 4) % 8 === 0) tone -= 0.6; }
    if (u < 2.5 / W && s.rim) { g.px(X, Y, RIM[Y % 3 === 0 ? 1 : 2]); continue; }
    g.px(X, Y, pick(rr, band(tone, X, Y)));
  }
  // rain stains running down from the roof line
  for (let k = 0; k < Math.floor(W / 14); k++) { const sx = a + 3 + R(rnd(seed * 19 + k) * (W - 6)), len = 8 + R(rnd(seed * 23 + k) * H * 0.3); for (let Y = top + 3; Y < top + len; Y++) if (bayer(sx, Y) < 0.6 * (1 - (Y - top) / len)) g.px(sx, Y, ramp[1]); }
  // cornice / parapet
  const cy = top;
  for (let X = a - 2; X < b + 2; X++) { g.px(X, cy - 1, OUT); g.px(X, cy, RIM[1]); g.px(X, cy + 1, ramp[5]); g.px(X, cy + 2, ramp[2]); g.px(X, cy + 3, ramp[1]); }
  // storey ledges
  for (let k = 1; k < s.storeys; k++) { const ly = R(P.Y(-s.h + 20 + storeyH * k)) - 2; for (let X = a; X < b; X++) { g.px(X, ly, ramp[5]); g.px(X, ly + 1, ramp[1]); } }
  // windows on upper storeys
  const nW = Math.max(1, Math.floor((s.x1 - s.x0) / 52)), ww = 26, wh = Math.min(62, storeyH * 0.5);
  for (let st = 0; st < s.storeys - 1; st++) {
    const sy0 = -s.h + 20 + storeyH * st, wy0 = sy0 + storeyH * 0.24;
    for (let k = 0; k < nW; k++) {
      const cx = s.x0 + ((k + 0.5) / nW) * (s.x1 - s.x0), state = rnd(seed * 101 + st * 13 + k);
      window_(P, cx - ww / 2, wy0, ww, wh, state < s.wins ? "boarded" : state < s.wins + 0.35 ? "broken" : state < 0.93 ? "glass" : "empty", seed * 7 + st * 3 + k, ramp);
      if (s.ac && rnd(seed * 5 + k + st) > 0.55) acUnit(P, cx + ww * 0.15, wy0 + wh + 10);
    }
  }
  // ground storey
  const gTop = -storeyH * 0.82 + 0;
  if (s.ground === "shutter") shutter(P, s.x0 + 14, gTop, s.x1 - s.x0 - 28, seed);
  else if (s.ground === "shop") shopWindow(P, s.x0 + 12, gTop, s.x1 - s.x0 - 50, seed, ramp), door(P, s.x1 - 34, -112, 26, seed);
  else door(P, (s.x0 + s.x1) / 2 - 15, -118, 30, seed, true);
  if (s.ground !== "door" && s.awning) awning(P, s.x0 + 6, gTop - 14, s.x1 - s.x0 - 12, seed);
  // roof states
  if (s.roof === "collapsed") collapse(P, a, b, top, seed, ramp);
  if (s.escape) fireEscape(P, s.x1 - 46, s, storeyH);
  if (s.sign) signBox(P, s.x0 + 8, -s.h + 20 + storeyH * (s.storeys - 1) - 6, seed);
  // moss at the base, vines from the roof and from the ground
  for (let X = a; X < b; X++) { const hgt = 3 + R(vnoise(X * 0.15, seed) * 9); for (let Y = gy - hgt; Y < gy; Y++) if (bayer(X, Y) < 0.75 - (gy - Y) / (hgt * 1.6)) g.px(X, Y, VINE[2 + ((X + Y) % 3 === 0 ? 1 : 0)]); }
  vines(P, a, b, top, gy, s.vines, seed);
  // side edges
  for (let Y = top; Y < gy; Y++) { g.px(a - 1, Y, OUT); g.px(b, Y, OUT); }
}

function window_(P, x, y, w, h, kind, seed, ramp) {
  const g = P.g, a = R(P.X(x)), b = R(P.X(x + w)), t = R(P.Y(y)), d = R(P.Y(y + h));
  for (let Y = t; Y < d; Y++) for (let X = a; X < b; X++) {
    let col;
    if (kind === "glass") { const v = (Y - t) / (d - t); col = pick(GLASS, band(1.4 + v * 3.2 + ((X - a) - (Y - t) * 0.6 > (b - a) * 0.55 ? 0.8 : 0), X, Y)); }
    else col = pick(INSIDE, band(1.6 - (Y - t) / (d - t) * 1.2, X, Y));
    g.px(X, Y, col);
  }
  if (kind === "broken") { // jagged shards left in the corners, catching the sky
    const shard = (cx, cy, dx, dy, n) => { for (let i = 0; i < n; i++) for (let j = 0; j < n - i; j++) g.px(cx + dx * j, cy + dy * i, pick(GLASS, 3 + ((i + j) % 2))); };
    shard(a, t, 1, 1, 4 + R(rnd(seed) * 5)); shard(b - 1, t, -1, 1, 3 + R(rnd(seed + 1) * 4)); shard(b - 1, d - 1, -1, -1, 5 + R(rnd(seed + 2) * 6)); shard(a, d - 1, 1, -1, 2 + R(rnd(seed + 3) * 3));
  }
  if (kind === "boarded") {
    const n = 3; for (let k = 0; k < n; k++) {
      const y0 = t + R(((k + 0.5) / n) * (d - t)) + R((rnd(seed * 3 + k) - 0.5) * 6), tilt = (rnd(seed * 5 + k) - 0.5) * 0.5;
      for (let X = a - 2; X < b + 2; X++) { const yy = y0 + R((X - a) * tilt); g.px(X, yy - 2, OUT); g.px(X, yy - 1, WOOD[4]); g.px(X, yy, WOOD[3]); g.px(X, yy + 1, WOOD[2]); g.px(X, yy + 2, OUT); }
      g.px(a, y0, METAL[5]); g.px(b - 1, y0 + R((b - 1 - a) * tilt), METAL[5]);
    }
  }
  // frame, lit right jamb (the sun is on the left), sill and a stain under it
  for (let Y = t - 1; Y <= d; Y++) { g.px(a - 1, Y, OUT); g.px(b, Y, OUT); }
  for (let X = a - 1; X <= b; X++) g.px(X, t - 1, OUT);
  for (let Y = t; Y < d; Y++) if (kind !== "glass") g.px(b - 1, Y, ramp[3]);
  for (let X = a - 3; X < b + 3; X++) { g.px(X, d, ramp[6]); g.px(X, d + 1, ramp[2]); g.px(X, d + 2, OUT); }
  for (let k = 0; k < 3; k++) { const sx = a + R(rnd(seed * 9 + k) * (b - a)); for (let Y = d + 3; Y < d + 10 + R(rnd(seed + k) * 14); Y++) if (bayer(sx, Y) < 0.5) g.px(sx, Y, ramp[1]); }
}

function acUnit(P, x, y) {
  const g = P.g, a = R(P.X(x)), t = R(P.Y(y)), w = R(15 * P.z), h = R(10 * P.z);
  g.rect(a, t, w, h, METAL[3]); g.rect(a, t, w, 1, METAL[5]); for (let X = a + 2; X < a + w - 2; X += 2) for (let Y = t + 2; Y < t + h - 1; Y++) g.px(X, Y, METAL[1]);
  g.frame(a - 1, t - 1, w + 2, h + 2, OUT); g.rect(a, t + h + 1, 1, 3, METAL[2]);
}

function shutter(P, x, y, w, seed) {
  const g = P.g, a = R(P.X(x)), b = R(P.X(x + w)), t = R(P.Y(y)), d = R(P.Y(0)), open = R((d - t) * (0.12 + 0.25 * rnd(seed)));
  for (let Y = t; Y < d; Y++) for (let X = a; X < b; X++) {
    if (Y > d - open) { g.px(X, Y, INSIDE[(Y + X) % 5 === 0 ? 1 : 0]); continue; }
    const rib = (Y - t) % 3, rust = fbm(X * 0.08 + seed, Y * 0.06) > 0.58;
    g.px(X, Y, rust ? pick(RUST, band(2.6 - rib * 0.8 + (X - a < 3 ? 1 : 0), X, Y)) : pick(METAL, band(3.4 - rib * 0.9, X, Y)));
  }
  for (let X = a; X < b; X++) { g.px(X, d - open - 1, METAL[5]); g.px(X, t - 1, OUT); g.px(X, t - 2, METAL[4]); g.px(X, t - 3, METAL[4]); }
  for (let Y = t - 3; Y < d; Y++) { g.px(a - 1, Y, OUT); g.px(b, Y, OUT); }
}

function shopWindow(P, x, y, w, seed, ramp) {
  window_(P, x, y + 8, w, -y - 30, "broken", seed + 900, ramp);
  const g = P.g, a = R(P.X(x)), b = R(P.X(x + w)), d = R(P.Y(-22));
  for (let X = a - 2; X < b + 2; X++) for (let Y = d + 2; Y < R(P.Y(0)); Y++) g.px(X, Y, pick(ramp, band(2 + ((Y - d) % 5 === 0 ? -0.8 : 0), X, Y)));
  // shards on the ground inside the frame line
  for (let k = 0; k < 9; k++) { const sx = a + R(rnd(seed * 3 + k) * (b - a)); g.px(sx, d - 1, GLASS[4]); g.px(sx + 1, d - 1, GLASS[2]); }
}

function door(P, x, y, w, seed, boarded = false) {
  const g = P.g, a = R(P.X(x)), b = R(P.X(x + w)), t = R(P.Y(y)), d = R(P.Y(0));
  for (let Y = t; Y < d; Y++) for (let X = a; X < b; X++) g.px(X, Y, pick(WOOD, band(1.4 + ((X - a) % 6 === 0 ? -0.6 : 0) + (Y - t) / (d - t) * -0.6, X, Y)));
  if (rnd(seed * 11) > 0.4 || boarded) for (let k = 0; k < 2; k++) { const y0 = t + R((0.3 + k * 0.4) * (d - t)); for (let X = a - 3; X < b + 3; X++) { const yy = y0 + R((X - a) * (k ? 0.3 : -0.3)); g.px(X, yy - 1, OUT); g.px(X, yy, WOOD[4]); g.px(X, yy + 1, WOOD[3]); g.px(X, yy + 2, OUT); } }
  g.rect(b - R(6 * P.z), t + R((d - t) * 0.52), 2, 2, METAL[5]);
  for (let Y = t - 1; Y < d; Y++) { g.px(a - 1, Y, OUT); g.px(b, Y, OUT); } for (let X = a - 1; X <= b; X++) { g.px(X, t - 1, OUT); g.px(X, t - 2, RIM[0]); }
}

function awning(P, x, y, w, seed) {
  const g = P.g, a = R(P.X(x)), b = R(P.X(x + w)), t = R(P.Y(y)), dep = R(18 * P.z);
  // bare metal frame with torn fabric strips hanging
  for (let X = a; X < b; X++) { g.px(X, t, METAL[2]); g.px(X, t + dep, METAL[3]); g.px(X, t + dep + 1, OUT); }
  for (let X = a; X < b; X += R(30 * P.z)) g.line(X, t, X + 2, t + dep, METAL[2]);
  for (let k = 0; k < Math.floor((b - a) / 9); k++) {
    const sx = a + R(rnd(seed * 13 + k) * (b - a)), len = 6 + R(rnd(seed * 17 + k) * 22), col = rnd(seed * 19 + k) > 0.5 ? "#5A2A36" : "#3E3A52";
    for (let Y = t + dep; Y < t + dep + len; Y++) { const sw = R(Math.sin((Y - t) * 0.3 + k) * 1.2); g.px(sx + sw, Y, col); g.px(sx + sw + 1, Y, (Y - t - dep) < 2 ? RIM[0] : mix(col, "#000000", 0.3)); }
  }
}

function collapse(P, a, b, top, seed, ramp) {
  const g = P.g, W = b - a;
  // the roof line sags and breaks; the sky shows through; rafters stick out
  for (let X = a - 2; X < b + 2; X++) {
    const u = (X - a) / W, sag = R(Math.max(0, Math.sin(Math.PI * clamp01((u - 0.15) / 0.75))) * 46 * P.z / 1.4 + rnd(X * 7 + seed) * 4);
    for (let Y = top - 4; Y < top + sag; Y++) g.erase(X, Y);
    if (sag > 2) { g.px(X, top + sag, OUT); g.px(X, top + sag + 1, RIM[1]); g.px(X, top + sag + 2, ramp[2]); }
  }
  for (let k = 0; k < 6; k++) { const x0 = a + R(W * (0.2 + 0.11 * k)), len = R((22 + rnd(seed + k) * 30) * P.z / 1.4); g.line(x0, top + R(30 * P.z / 1.4), x0 + R(len * 0.7) * (k % 2 ? 1 : -1), top + R(30 * P.z / 1.4) - len, WOOD[1]); g.line(x0 + 1, top + R(30 * P.z / 1.4), x0 + 1 + R(len * 0.7) * (k % 2 ? 1 : -1), top + R(30 * P.z / 1.4) - len, WOOD[3]); }
}

function fireEscape(P, x, s, storeyH) {
  const g = P.g, a = R(P.X(x)), w = R(40 * P.z);
  for (let st = 1; st < s.storeys; st++) {
    const py = R(P.Y(-s.h + 20 + storeyH * st)) - 3;
    for (let X = a; X < a + w; X++) { g.px(X, py, METAL[4]); g.px(X, py + 1, OUT); if ((X - a) % 4 === 0) for (let Y = py - R(12 * P.z); Y < py; Y++) g.px(X, Y, METAL[2]); g.px(X, py - R(12 * P.z), METAL[3]); }
    const ny = R(P.Y(-s.h + 20 + storeyH * (st + 1))) - 3;
    if (st < s.storeys - 1) for (let k = 0; k < 3; k++) g.line(a + 3 + k, py - 1, a + w - 6 + k, ny + 1, k === 1 ? METAL[3] : OUT);
  }
}

function signBox(P, x, y, seed) {
  // a bracket arm with an empty, crooked sign box hanging from one chain (the other snapped)
  const g = P.g, a = R(P.X(x)), t = R(P.Y(y)), arm = R(30 * P.z);
  for (let X = a; X < a + arm; X++) { g.px(X, t, METAL[3]); g.px(X, t + 1, OUT); }
  g.line(a, t + 8, a + 10, t, METAL[2]);
  const bx = a + arm - 4, by = t + 4, bw = R(26 * P.z), bh = R(16 * P.z);
  g.line(bx, t + 1, bx, by, METAL[4]);
  const pts = [[bx - 1, by], [bx + bw * 0.25, by + 2], [bx + bw * 0.22, by + bh + 3], [bx - 4, by + bh]];
  g.poly(pts, "#3A3448", (X, Y) => pick(["#2A2436", "#3A3448", "#4C4458", "#5E556A"], band(1.5 + (Y - by) / bh * -1 + (fbm(X * 0.2, Y * 0.2) - 0.5), X, Y)));
  g.line(pts[0][0], pts[0][1], pts[1][0], pts[1][1], RIM[1]);
}

function vines(P, a, b, top, gy, amount, seed) {
  const g = P.g, n = Math.round(((b - a) / 10) * amount);
  for (let k = 0; k < n; k++) {
    const fromTop = rnd(seed * 41 + k) > 0.45;
    let x = a + rnd(seed * 43 + k) * (b - a), y = fromTop ? top + 2 : gy;
    const len = (fromTop ? 40 : 30) + rnd(seed * 47 + k) * (gy - top) * (fromTop ? 0.55 : 0.5);
    for (let i = 0; i < len; i++) {
      x += (vnoise(i * 0.15 + k * 3, seed) - 0.5) * 1.3; y += fromTop ? 1 : -1;
      const X = R(x), Y = R(y);
      g.px(X, Y, VINE[2]);
      if (rnd(k * 131 + i) > 0.55) { const s = rnd(k * 137 + i) > 0.5 ? 1 : -1; g.px(X + s, Y, VINE[3]); g.px(X + 2 * s, Y - 1, VINE[4]); if (rnd(k * 139 + i) > 0.6) { g.px(X + s, Y - 1, VINE[5]); g.px(X + 2 * s, Y - 2, "#6E7A42"); } }
    }
  }
}

