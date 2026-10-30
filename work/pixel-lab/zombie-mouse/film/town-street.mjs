// «The last person alive» — Builder W: the street of the dead town (shot A): facades, props, cars, the tally wall, the
// road's end. Static painters into layer strips (see town-art.mjs `painter`). Sun low on the left: warm rims on left
// edges and tops, violet shade elsewhere. No text anywhere except the scratched "300" and the tally marks.
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";
import { rnd, clamp01, lerp } from "./layout.mjs";
import { vnoise, fbm, band, pick } from "./W-util.mjs";
import { painter, BRICK, PLAST, RIM, GLASS, INSIDE, WOOD, RUST, VINE, METAL, OUT } from "./town-art.mjs";

const R = Math.round;

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

// ---------------------------------------------------------------- the faded billboard on legs (vacant lot)
export function billboard(L, x0, w, hBase, hPanel, seed) {
  const P = painter(L), g = P.g;
  const a = R(P.X(x0)), b = R(P.X(x0 + w)), t = R(P.Y(-hBase - hPanel)), d = R(P.Y(-hBase)), gy = R(P.Y(0));
  for (const lx of [a + R((b - a) * 0.22), b - R((b - a) * 0.22)]) { g.rect(lx - 2, d, 4, gy - d, METAL[2]); g.rect(lx - 2, d, 1, gy - d, RIM[0]); g.line(lx - 2, gy - 2, lx + 16, d + 4, METAL[1]); }
  // catwalk
  for (let X = a - 3; X < b + 3; X++) { g.px(X, d + 4, METAL[3]); g.px(X, d + 5, OUT); if ((X - a) % 5 === 0) for (let Y = d - 6; Y < d + 4; Y++) g.px(X, Y + 0, METAL[1]); }
  // panel: a faded poster with no words (pale field, a faded disc and a band), peeling off in vertical strips
  const PAPER = ["#4A4256", "#5A5266", "#6A6276", "#7C7486", "#8E8496"], DISC = ["#5A3E52", "#6E4A5E", "#82586A"], BAND = ["#3A4458", "#4A5468", "#5A6478"];
  const dcx = a + (b - a) * 0.66, dcy = t + (d - t) * 0.45, dr = (d - t) * 0.36;
  for (let Y = t; Y < d; Y++) for (let X = a; X < b; X++) {
    const u = (X - a) / (b - a), v = (Y - t) / (d - t);
    const strip = vnoise(X * 0.35, 3) > 0.62 && v > 0.15 + 0.5 * vnoise(X * 0.2, 7), corner = u + (1 - v) * 0.6 < 0.28;
    let col;
    if (strip || corner) col = pick(["#161220", "#1E1828", "#262032"], band(1 + v, X, Y));
    else if (Math.hypot(X - dcx, Y - dcy) < dr) col = pick(DISC, band(1.2 + (1 - v) * 1.2, X, Y));
    else if (v > 0.68 && v < 0.84) col = pick(BAND, band(1 + (1 - u) * 1.2, X, Y));
    else col = pick(PAPER, band(1.6 + (1 - v) * 1.4 + (fbm(X * 0.15, Y * 0.15) - 0.5) * 1.2, X, Y));
    if (u < 0.025) col = RIM[1];
    g.px(X, Y, col);
  }
  for (let k = 0; k < 7; k++) { const sx = a + R(rnd(seed * 5 + k) * (b - a)), len = 4 + R(rnd(seed * 7 + k) * 16); for (let Y = d; Y < d + len; Y++) g.px(sx + R(Math.sin(Y * 0.4 + k)), Y, "#6E6680"); }
  g.frame(a - 1, t - 1, b - a + 2, d - t + 2, OUT); for (let X = a; X < b; X++) g.px(X, t - 2, RIM[1]);
}

// ---------------------------------------------------------------- props on the far sidewalk
export function lampPost(L, x, h, seed, lean = 0) {
  const P = painter(L), g = P.g, gy = R(P.Y(0));
  const n = R(h * P.z), x0 = P.X(x);
  for (let i = 0; i < n; i++) { const X = R(x0 + i * lean), Y = gy - i, w = i < 10 ? 4 : 2; g.rect(X - (w >> 1), Y, w, 1, METAL[2]); g.px(X - (w >> 1) - 1, Y, OUT); g.px(X - (w >> 1), Y, RIM[0]); g.px(X + w - (w >> 1), Y, OUT); }
  const tx = R(x0 + n * lean), ty = gy - n;
  // the arm bends over and the head hangs broken, glass cracked
  const arm = R(22 * P.z);
  for (let i = 0; i < arm; i++) { const X = tx + i, Y = ty - R(Math.sin((i / arm) * 1.7) * 6); g.px(X, Y, METAL[3]); g.px(X, Y - 1, OUT); g.px(X, Y + 1, OUT); }
  const hx = tx + arm, hy = ty + 2;
  g.poly([[hx - 2, hy - 1], [hx + 6, hy + 3], [hx + 4, hy + 9], [hx - 4, hy + 5]], METAL[2]);
  g.line(hx - 4, hy + 5, hx + 4, hy + 9, "#3A3448"); g.px(hx, hy + 6, "#6A6080"); g.px(hx + 1, hy + 7, "#4A4458");
  g.line(hx - 2, hy - 1, hx + 6, hy + 3, RIM[1]);
}

export function powerPole(L, x, h) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), X = R(P.X(x)), top = gy - R(h * P.z);
  for (let Y = top; Y < gy; Y++) { g.px(X - 2, Y, OUT); g.px(X - 1, Y, RIM[0]); g.px(X, Y, WOOD[2]); g.px(X + 1, Y, WOOD[1]); g.px(X + 2, Y, OUT); }
  for (const dy of [8, 18]) { const y = top + R(dy * P.z * 0.6); for (let k = -R(20 * P.z); k <= R(20 * P.z); k++) { g.px(X + k, y, WOOD[2]); g.px(X + k, y + 1, OUT); } for (const k of [-16, -6, 6, 16]) { const ix = X + R(k * P.z); g.px(ix, y - 1, "#6A6080"); g.px(ix, y - 2, "#8A80A0"); } }
  return { x, top: -h, arms: [8, 18].map((dy) => -h + dy * 0.6) };
}
/** Sagging wires between two pole tops (layer units), hanging by sag; returns a function y(x) for crows. */
export function wire(L, xa, ya, xb, yb, sag, col = "#140F1C") {
  const P = painter(L), g = P.g, a = P.X(xa), b = P.X(xb);
  const y = (wx) => { const u = (wx - xa) / (xb - xa); return lerp(ya, yb, u) + sag * 4 * u * (1 - u); };
  for (let X = Math.floor(a); X <= Math.ceil(b); X++) { const wx = L.W0 + X / L.z; g.px(X, R(P.Y(y(wx))), col); }
  return y;
}

export function busShelter(L, x, seed) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), a = R(P.X(x)), b = R(P.X(x + 74)), t = R(P.Y(-104));
  for (let X = a - 2; X < b + 4; X++) { g.px(X, t, METAL[4]); g.px(X, t + 1, METAL[2]); g.px(X, t + 2, OUT); g.px(X, t - 1, RIM[1]); }
  for (const px of [a, b]) for (let Y = t; Y < gy; Y++) { g.px(px, Y, METAL[3]); g.px(px + 1, Y, OUT); }
  // glass panels: mostly gone, a few cracked panes catching the sky
  for (let k = 0; k < 3; k++) { const pa = a + 2 + R(k * (b - a) / 3), pb = a + R((k + 1) * (b - a) / 3) - 1; if (k === 1) continue;
    for (let Y = t + 3; Y < gy - 6; Y++) for (let X = pa; X < pb; X++) { const v = (Y - t) / (gy - t); if (k === 2 && v > 0.55 + 0.2 * Math.sin(X * 0.5)) continue; if (bayer(X, Y) < 0.42) g.px(X, Y, pick(GLASS, band(2.5 + v * 2, X, Y))); }
    g.line(pa + 2, t + 5, pb - 3, gy - 20, "#9A6A80"); }
  // bench
  const by = gy - R(20 * P.z); for (let X = a + 6; X < b - 6; X++) { g.px(X, by, WOOD[4]); g.px(X, by + 1, WOOD[2]); g.px(X, by + 2, OUT); }
  g.rect(a + 8, by + 2, 2, gy - by - 2, METAL[2]); g.rect(b - 10, by + 2, 2, gy - by - 2, METAL[2]);
}

export function hydrant(L, x) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), X = R(P.X(x)), h = R(26 * P.z), w = R(9 * P.z);
  for (let Y = gy - h; Y < gy; Y++) for (let k = -(w >> 1); k <= w >> 1; k++) g.px(X + k, Y, pick(RUST, band(3.2 - (k + (w >> 1)) / w * 1.8 + (fbm(X + k, Y * 0.3) - 0.5), X + k, Y)));
  g.rect(X - (w >> 1) - 2, gy - h + 4, w + 4, 3, RUST[2]); g.disc(X, gy - h, w >> 1, RUST[3]); g.px(X - 1, gy - h - 2, RIM[2]);
}

// ---------------------------------------------------------------- abandoned cars (side view)
export function car(L, x, w, seed, paint, facing = 1) {
  const P = painter(L), g = P.g, z = P.z, gy = P.Y(0), s = (u) => u * (w / 230);
  const X = (u) => P.X(facing > 0 ? x + s(u) : x + w - s(u)), Y = (v) => P.Y(-s(v));
  // body silhouette (u along the car, v height): trunk → cabin → hood
  const body = [[4, 20], [2, 42], [10, 50], [52, 54], [74, 82], [146, 84], [172, 56], [222, 50], [229, 40], [228, 20], [212, 16], [196, 24], [160, 24], [64, 24], [44, 16], [20, 16]].map(([u, v]) => [X(u), Y(v)]);
  g.poly(body, paint[2], (XX, YY) => {
    const v = (gy - YY) / (s(84) * z), rust = fbm(XX * 0.07 + seed, YY * 0.09) > 0.6 && v < 0.6;
    if (rust) return pick(RUST, band(2.2 + (fbm(XX * 0.3, YY * 0.3) - 0.5) * 2, XX, YY));
    return pick(paint, band(1.6 + v * 2.2 + (v > 0.52 && v < 0.6 ? 0.8 : 0) + (fbm(XX * 0.1, YY * 0.1) - 0.5) * 0.8, XX, YY));
  });
  // windows: dark, a cracked windscreen catching the pink sky
  const win = (pts, crack) => { g.poly(pts.map(([u, v]) => [X(u), Y(v)]), GLASS[1], (XX, YY) => pick(GLASS, band(1.2 + (YY - Y(80)) / (Y(56) - Y(80)) * 2.4 + ((XX + YY) % 9 < 2 ? 0.6 : 0), XX, YY))); if (crack) { const cx = X(crack[0]), cy = Y(crack[1]); for (let k = 0; k < 5; k++) g.line(R(cx), R(cy), R(cx + Math.cos(k * 1.3) * 8 * z / 1.5), R(cy + Math.sin(k * 1.3) * 6 * z / 1.5), "#C27A86"); } };
  win([[80, 79], [108, 80], [108, 57], [60, 57]], null);
  win([[114, 80], [143, 80], [166, 57], [114, 57]], [135, 68]);
  // door seams, handle, bumper, a dead headlight
  g.line(R(X(110)), R(Y(56)), R(X(110)), R(Y(22)), OUT); g.line(R(X(60)), R(Y(54)), R(X(60)), R(Y(24)), OUT);
  g.rect(R(X(92)), R(Y(46)), 4, 1, paint[5]); g.rect(R(X(125)), R(Y(46)), 4, 1, paint[5]);
  g.rect(R(Math.min(X(214), X(229))), R(Y(36)), R(Math.abs(X(229) - X(214))), 3, METAL[3]);
  g.rect(R(Math.min(X(220), X(227))), R(Y(46)), 3, 3, "#5A5266"); g.px(R(X(224)), R(Y(45)), "#2A2436");
  // wheels: flat tyres sitting low, rusty rims
  for (const wu of [44, 196]) { const cx = R(X(wu)), cy = R(gy - s(13) * z), r = R(s(16) * z);
    g.ellipse(cx, cy + 2, r, r - 2, "#16121C"); g.ellipse(cx, cy + 2, R(r * 0.55), R(r * 0.5), RUST[2]); g.px(cx - 1, cy, RUST[4]); g.ellipse(cx, cy + 2, R(r * 0.2), R(r * 0.2), "#16121C");
    for (let k = -r; k <= r; k++) g.px(cx + k, R(gy), "#0E0A14"); }
  // outline and the sunset rim along the roof and the rear
  g.outline(OUT, (XX, YY) => YY < gy + 1);
  for (let i = 0; i + 1 < 6; i++) { const [a, b] = [body[i + 2], body[i + 3]]; g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), RIM[1]); }
}

// ---------------------------------------------------------------- rubble, concrete barrier, chain-link fence, signs
export function rubble(L, x, w, h, seed, ramp = PLAST) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), a = R(P.X(x)), b = R(P.X(x + w)), H = h * P.z;
  for (let k = 0; k < Math.max(3, (b - a) / 3); k++) {
    const cx = a + rnd(seed * 3 + k) * (b - a), u = (cx - a) / (b - a), top = Math.sin(Math.PI * u) * H * (0.6 + 0.4 * rnd(seed + k));
    const r = 2 + R(rnd(seed * 7 + k) * (3 + P.z * 2)), cy = gy - R(Math.max(r, top * rnd(seed * 11 + k)));
    const pts = []; const n = 5 + (k % 3); for (let i = 0; i < n; i++) { const a2 = (i / n) * Math.PI * 2 + rnd(seed + i + k), rr = r * (0.7 + 0.5 * rnd(k * 7 + i)); pts.push([cx + Math.cos(a2) * rr * 1.3, cy + Math.sin(a2) * rr]); }
    g.poly(pts, ramp[2], (XX, YY) => pick(ramp, band(2.4 - (YY - cy) / r * 1.2 - (XX - cx) / r * 0.7, XX, YY)));
    if (rnd(seed * 13 + k) > 0.93) g.line(R(cx), R(cy - r), R(cx + (rnd(k) - 0.5) * 8), R(cy - r - 3 - rnd(k + 1) * 5), RUST[2]);
  }
  g.outline(OUT, (XX, YY) => YY <= gy && XX >= a - 2 && XX <= b + 2);
}

export function barrier(L, x, w, seed) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), a = R(P.X(x)), b = R(P.X(x + w)), h = R(34 * P.z);
  const pts = [[a, gy], [a + 4, gy - R(h * 0.35)], [a + 7, gy - h], [b - 7, gy - h], [b - 4, gy - R(h * 0.35)], [b, gy]];
  g.poly(pts, PLAST[4], (XX, YY) => pick(PLAST, band(4.3 - (YY - (gy - h)) / h * 1.6 + (fbm(XX * 0.1 + seed, YY * 0.1) - 0.5) * 1.2 + (YY < gy - h + 2 ? 1 : 0), XX, YY)));
  for (let X = a + 4; X < b - 4; X++) if ((X - a) % 22 < 11) for (let Y = gy - R(h * 0.75); Y < gy - R(h * 0.62); Y++) g.px(X, Y, (X + Y) % 2 ? "#6A4A3A" : "#7E5A40");
  g.outline(OUT);
  for (let Y = gy - h; Y < gy - 2; Y++) g.px(a + 7 - R((Y - (gy - h)) * 0.12), Y, RIM[1]);
}

export function chainFence(L, x0, x1, h, seed, gapFrom = null, gapTo = null) {
  const P = painter(L), g = P.g, gy = R(P.Y(0)), a = R(P.X(x0)), b = R(P.X(x1)), H = R(h * P.z);
  const inGap = (X) => gapFrom !== null && X > P.X(gapFrom) && X < P.X(gapTo);
  // mesh: diagonal wires, sagging at the top, a torn hole curling out
  for (let X = a; X < b; X++) {
    const sag = R(Math.sin(((X - a) / (b - a)) * Math.PI * 3) ** 2 * 6), top = gy - H + sag;
    for (let Y = top; Y < gy; Y++) {
      if (inGap(X) && Y > top + (Math.abs(X - (P.X(gapFrom) + P.X(gapTo)) / 2) < 6 ? 0 : 6)) continue;
      const d1 = (X + Y) % 5 === 0, d2 = (X - Y + 1000) % 5 === 0;
      if (d1 || d2) g.px(X, Y, (Y - top) < 2 ? "#8A7E96" : "#4A4258");
    }
    g.px(X, top - 1, METAL[4]); g.px(X, top, OUT);
  }
  for (let X = a; X <= b; X += R(40 * P.z)) { const tilt = (rnd(X + seed) - 0.5) * 0.25; for (let i = 0; i < H + 4; i++) { g.px(R(X + i * tilt), gy - i, METAL[3]); g.px(R(X + i * tilt) + 1, gy - i, OUT); g.px(R(X + i * tilt) - 1, gy - i, RIM[0]); } }
}

// ---------------------------------------------------------------- the tally wall (p = 1): ≈ 300 scratched day marks and "300"
/** Returns the list of scratch pixels [X(strip), Y, wx] so town.mjs can make them glint. */
export function tallyWall(L, T, seed) {
  const P = painter(L), g = P.g, z = P.z, gy = R(P.Y(0));
  const x0 = T.x0 - 22, x1 = T.x1 + 20;
  const topAt = (wx) => -(T.y0 * -1 + 14 + 8 * Math.sin((wx - x0) * 0.09) + 6 * vnoise(wx * 0.2, 3) - 26 * clamp01((wx - (x1 - 26)) / 26) - 16 * clamp01((x0 + 12 - wx) / 12));
  const WALL = ["#2A2234", "#3A3044", "#4C4054", "#5E5064", "#706072", "#847282", "#9A8592", "#B29AA2"];
  const a = R(P.X(x0)), b = R(P.X(x1));
  for (let X = a; X < b; X++) {
    const wx = L.W0 + X / z, top = R(P.Y(topAt(wx)));
    for (let Y = top; Y < gy + 1; Y++) {
      const v = (Y - top) / (gy - top), u = (X - a) / (b - a);
      let tone = 4.4 - v * 1.6 + (fbm(X * 0.06 + seed, Y * 0.05) - 0.5) * 1.3 + (u < 0.06 ? 1.2 : 0) - clamp01((v - 0.86) / 0.14) * 1.4;
      let ramp = WALL;
      if (fbm(X * 0.035 + 11, Y * 0.04 + 3) > 0.67) { ramp = BRICK; tone -= 1.2; const row = Math.floor(Y / 4); if (Y % 4 === 3 || (X + (row % 2) * 4) % 8 === 0) tone -= 0.6; }
      let col = pick(ramp, band(tone, X, Y));
      if (Y === top) col = OUT; else if (Y === top + 1) col = RIM[2]; else if (Y === top + 2) col = WALL[6];
      g.px(X, Y, col);
    }
  }
  // cracks, a stain, rebar sticking out of the broken top
  for (let k = 0; k < 5; k++) { let cx = a + R(rnd(seed + k * 7) * (b - a)), cy = R(P.Y(topAt(L.W0 + cx / z))) + 2; for (let i = 0; i < 20 + R(rnd(k) * 30); i++) { cx += R((rnd(k * 31 + i) - 0.5) * 2.2); cy += 1; if (g.has(cx, cy)) { g.px(cx, cy, WALL[1]); g.px(cx + 1, cy, WALL[5]); } } }
  for (let k = 0; k < 4; k++) { const rx = a + 6 + R(k * (b - a - 12) / 3 + rnd(seed * 3 + k) * 8), ry = R(P.Y(topAt(L.W0 + rx / z))); const len = 6 + R(rnd(seed + k) * 10), bend = (rnd(k + 9) - 0.5) * 6; for (let i = 0; i < len; i++) g.px(rx + R(bend * (i / len) ** 2), ry - i, i > len - 3 ? RUST[4] : RUST[2]); }
  // the tally: groups of five (4 verticals + a strike), oldest first (dimmer), "300" in big scratched digits top right
  const pts = [];
  const scratch = (x, y, col) => { if (!g.has(x, y)) return; g.px(x, y, col); pts.push(x, y); };
  const groove = (x, y) => { if (g.has(x, y)) g.px(x, y, WALL[1]); };
  const ax = R(P.X(T.x0)), bx = R(P.X(T.x1)), ay = R(P.Y(T.y0)), by = R(P.Y(T.y1));
  const digitsW = R(54 * z / 1.6), digitsX = bx - digitsW - 2, rowH = R(20 * z / 1.6), markH = R(14 * z / 1.6), pitch = R(15 * z / 1.6);
  let n = 0; const total = 60;
  for (let row = 0; n < total; row++) {
    const y = ay + 2 + row * rowH, xEnd = row < 3 ? digitsX - 6 : bx - 2;
    for (let x = ax + 2; x + 12 <= xEnd && n < total; x += pitch, n++) {
      const age = n / total, col = age > 0.9 ? "#E8D2C8" : age > 0.6 ? "#CDB6B6" : "#B49EA6", jit = R((rnd(n * 13) - 0.5) * 2);
      for (let k = 0; k < 4; k++) { const xx = x + k * 3 + (k === 2 ? 0 : 0); for (let i = 0; i < markH; i++) { const dx = R((i / markH) * (rnd(n * 7 + k) - 0.5) * 2); scratch(xx + dx, y + i + jit, col); groove(xx + dx + 1, y + i + jit); } }
      for (let i = 0; i < 14; i++) { const xx = x - 2 + i, yy = y + markH - 2 - R(i * (markH - 4) / 13) + jit; scratch(xx, yy, col); groove(xx, yy + 1); }
    }
  }
  // "300": each digit a scratched polyline, two strokes thick
  const dw = R(14 * z / 1.6), dh = R(26 * z / 1.6), dy = ay + 1;
  const glyph = { "3": [[0, 0.05], [0.5, 0], [0.95, 0.12], [0.95, 0.38], [0.45, 0.5], [0.95, 0.62], [1, 0.88], [0.5, 1], [0, 0.94]], "0": [[0.5, 0], [0.92, 0.15], [1, 0.5], [0.92, 0.85], [0.5, 1], [0.08, 0.85], [0, 0.5], [0.08, 0.15], [0.5, 0], [0.62, 0.05]] };
  ["3", "0", "0"].forEach((ch, i) => {
    const gx = digitsX + i * (dw + 5), poly = glyph[ch];
    for (let k = 0; k + 1 < poly.length; k++) {
      const [u0, v0] = poly[k], [u1, v1] = poly[k + 1], steps = Math.ceil(Math.hypot((u1 - u0) * dw, (v1 - v0) * dh) * 1.5);
      for (let s2 = 0; s2 <= steps; s2++) { const u = lerp(u0, u1, s2 / steps), v = lerp(v0, v1, s2 / steps), xx = R(gx + u * dw), yy = R(dy + v * dh); scratch(xx, yy, "#EAD6CC"); scratch(xx + 1, yy, "#D2BCBA"); groove(xx + 2, yy + 1); groove(xx + 1, yy + 1); }
    }
  });
  // a small rubble heap and a dusty rag at its foot
  g.outline(OUT, (X, Y) => Y < gy);
  pts.topAt = topAt;
  return pts;
}
