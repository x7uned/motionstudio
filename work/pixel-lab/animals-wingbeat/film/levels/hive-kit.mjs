// Scenery kit shared by my two levels (LV7 clover, LV8 hive): one continuous meadow that warms from late afternoon
// (clover, tod 3.6) into golden hour (hive, tod 4.2), low sun behind the scene → backlit plants with glowing rims and
// long soft shadows that fall toward the viewer. Painters draw through any canvas-like `g` (a Layer view in world
// coordinates, or a screen canvas). Deterministic: rnd(seed) only; caches only memoise.
import { hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, fade, blob, ell } from "../cute.mjs";
import { grade, spriteCache, GRASS } from "./meadow-kit.mjs";

const R = Math.round;
export const toHex = (c) => "#" + hex(c).map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
const ID = { mul: [1, 1, 1], add: [0, 0, 0] };
/** Grade that turns art painted for tod B into its look at tod T (null when T ≈ B). */
export function relGrade(T, B) {
  if (Math.abs(T - B) < 0.01) return null;
  const gT = grade(T) ?? ID, gB = grade(B) ?? ID, mul = gT.mul.map((m, j) => m / gB.mul[j]);
  return { mul, add: gT.add.map((a, j) => a - gB.add[j] * mul[j]) };
}
/** A colour as the neutral (day) palette would look at tod T. */
export function tinted(col, T) { const g = grade(T); if (!g) return toHex(col); const c = hex(col); return toHex(c.map((v, j) => Math.max(0, Math.min(255, R(v * g.mul[j] + g.add[j]))))); }
export const grassRamp = (T) => GRASS.map((c) => tinted(c, T));

// ---------------------------------------------------------------- ground
/** Meadow floor in perspective tone bands (narrow near the horizon); fx(x, y, d, col) may recolour (haze, warm light). */
export function paintGround(g, x0, x1, land, y1, ramp, fx = null) {
  for (let y = land; y < y1; y++) for (let x = x0; x < x1; x++) {
    const d = y - land, v = Math.min(ramp.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6), lo = Math.floor(v), fr = v - lo;
    const col = ramp[Math.min(ramp.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)];
    g.px(x, y, fx ? fx(x, y, d, col) : col);
  }
}
/** Dithered, quantised mix of col toward to by k (0..1) in 4 steps — keeps the flat pixel-art bands. */
export function dmix(col, to, k, x, y, max = 0.8) { if (k <= 0.02) return col; const q = Math.min(1, k), st = Math.floor(q * 4), f = q * 4 - st; return mix(col, to, ((st + (f > bayer(x + 1, y) ? 1 : 0)) / 4) * max); }
/** Short grass strokes all over the floor (dark seams + backlit golden tips), taller toward the viewer. */
export function grassStrokes(g, x0, x1, land, y1, n, seed, dark, light, lightK = 0.34) {
  for (let i = 0; i < n; i++) {
    const y = R(land + 2 + Math.pow(rnd(seed + i * 3 + 1), 1.35) * (y1 - land - 2)), x = R(x0 + rnd(seed + i * 3 + 2) * (x1 - x0)), d = y - land, h = d < 30 ? 1 : d < 110 ? 2 : d < 200 ? 3 : d < 260 ? 4 : 5;
    const isLight = rnd(seed + i * 5) < 0.42, base = g.get(x, y);
    const col = isLight ? mix(base, light, lightK) : mix(base, dark, 0.34), lean = rnd(seed + i * 7) < 0.5 ? 1 : -1;
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && h > 1 && rnd(seed + i) < 0.6 ? lean : 0), y - j, j === h - 1 && isLight ? mix(col, light, 0.35) : col);
  }
}
/** Soft long shadow on the ground: from a footprint of width w at (x, y) along (vx, vy) per unit length, len px. */
export function shadowStreak(g, x, y, w, len, vx, vy, col, k = 0.42, has = null, mixK = 0.42) {
  const n = Math.max(2, R(len));
  for (let i = 0; i < n; i++) {
    const u = i / n, cx = x + vx * i, cy = y + vy * i, hw = (w / 2) * (1 - u * 0.25), dens = k * Math.pow(1 - u, 1.3), soft = 2 + u * 5;
    for (let X = R(cx - hw - soft); X <= R(cx + hw + soft); X++) {
      const e = Math.min(1, (hw + soft - Math.abs(X - cx)) / (2 * soft)), Y = R(cy);
      if (dens * e <= bayer(X, Y) * 0.95) continue; if (has && !has(X, Y)) continue;
      g.px(X, Y, mix(g.get(X, Y), col, mixK));
    }
  }
}

// ---------------------------------------------------------------- hills and trees (backlit)
// one hill profile for the whole clover → hive stretch (3240..4320), so the hills run on through the seam at x 3780
export const hillFar = (x) => 64 + 26 * Math.sin(x * 0.0093 + 0.4) + 12 * Math.sin(x * 0.027 + 1.9);
export const hillMid = (x) => 38 + 16 * Math.sin(x * 0.0141 + 2.6) + 7 * Math.sin(x * 0.039 + 0.3);
export const hillNear = (x) => 18 + 10 * Math.sin(x * 0.0203 + 4.1) + 5 * Math.sin(x * 0.051 + 1.2);
/** hill palettes painted for golden hour (tod 4.2, the hive); regrade() derives the clover's (tod 3.6) from them */
export const HILL42 = {
  FAR: ["#D88E8C", "#CF8488", "#C47C86", "#BA7684"], FAR_RIM: "#FFC89A", MID: ["#A87A6C", "#9A6E66", "#8C6462", "#7E5C5E"], MID_RIM: "#FFD9A0",
  NEAR: ["#8C8A4C", "#7E7C44", "#706E3E", "#646238"], NEAR_RIM: "#FFE7A0",
  TREE: ["#1E2414", "#2A3218", "#36401E", "#424E24", "#505C2A", "#5E6A30"], TREE_RIM: ["#FFE9A8", "#F8C866", "#D8A04A"],
};
/** A colour (or a palette / object of palettes) painted for tod B, as it looks at tod T (same rule as relGrade). */
export function regrade(v, T, B) {
  const g = relGrade(T, B); if (!g) return v;
  const one = (c) => toHex(hex(c).map((q, j) => Math.max(0, Math.min(255, R(q * g.mul[j] + g.add[j])))));
  const rec = (x) => (typeof x === "string" ? one(x) : Array.isArray(x) ? x.map(rec) : Object.fromEntries(Object.entries(x).map(([k, w]) => [k, rec(w)])));
  return rec(v);
}
/** One hill band between x0..x1: top at land − h(x), vertical tone bands, a glowing rim on the crest. */
export function paintHill(g, x0, x1, land, h, cols, rim, rim2) {
  for (let x = x0; x < x1; x++) {
    const hh = h(x); if (hh < 0.5) continue; const top = R(land - hh);
    for (let y = top; y < land; y++) {
      const k = (y - top) / Math.max(1, hh), v = k * (cols.length - 1), lo = Math.floor(v), f = v - lo;
      let col = cols[Math.min(cols.length - 1, f > 0.55 + 0.4 * (bayer(x, y) - 0.5) ? lo + 1 : lo)];
      if (y === top) col = rim; else if (y === top + 1 && rim2) col = ((x + y) & 1) ? rim2 : col;
      g.px(x, y, col);
    }
  }
}
/** Backlit bumpy foliage ball: dark-to-mid body, bright rim along the top edge (sun behind), dark outline below. */
export function backlitBall(g, cx, cy, r, ramp, rim, seed = 0, o = {}) {
  const bumps = o.bumps ?? 9, amp = o.amp ?? 0.12, sy = o.sy ?? 1, out = o.outline ?? ramp[0];
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25 * sy); Y <= R(cy + r * 1.25 * sy); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = (Y - cy) / sy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    const top = -dy / Math.max(1, d), sx = (o.sunX ?? cx) - cx, side = sx ? Math.sign(sx) * dx / Math.max(1, d) : 0;
    if (d > rr - 1.1) { g.px(X, Y, top > 0.15 + 0.2 * (1 - Math.max(0, side)) ? rim[0] : out); continue; }
    if (d > rr - 2.6 && top > 0.35 - 0.25 * Math.max(0, side)) { g.px(X, Y, ((X + Y) & 1) || top > 0.7 ? rim[1] : rim[2] ?? rim[1]); continue; }
    const v = 0.3 + 0.35 * top + 0.12 * side - (d / rr) * 0.1, n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}

// ---------------------------------------------------------------- flowers (small, for the cached floor)
export const POPPY = ["#4A0A0C", "#8E160E", "#C8281A", "#EC4422", "#FF6E34", "#FF9A54", "#FFC886"];
export const DAISY = { pet: "#F2E8EE", lit: "#FFFDF2", dark: "#B8A6BC", eye: "#F6BC1E", eyeD: "#C27E0E" };
export const CLOVER_P = { out: "#5A1640", dark: "#9A2E6E", mid: "#C8549A", light: "#E68CC0", tip: "#FAD0E6" };
export const CLOVER_W = { out: "#7A6A7A", dark: "#C8B8C8", mid: "#E8DCE6", light: "#FAF4F8", tip: "#FFFFFF" };
export const CLOVER_V = { out: "#3A1450", dark: "#6A2A8A", mid: "#9A4AB8", light: "#C47ED8", tip: "#EAC0F4" };
export const LAV = ["#2E1A5A", "#4A2E8A", "#6A48B4", "#8E6AD6", "#B496EE", "#D6C0FA"];
/** Poppy cup (s = radius px). Backlit: the translucent petal rims glow orange-gold. */
export function poppy(g, x, y, s, seed = 0) {
  x = R(x); y = R(y);
  if (s < 1.6) { g.px(x, y, POPPY[3]); g.px(x + 1, y, POPPY[2]); g.px(x, y - 1, POPPY[5]); return; }
  const rx = s, ry = s * 0.82, open = s * 0.42;
  for (let Y = R(y - ry); Y <= R(y + ry); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) {
    const u = (X + 0.5 - x) / rx, v = (Y + 0.5 - y) / ry, scal = 0.12 * Math.abs(Math.sin(u * 3.1 + seed)) * (v < 0 ? 1 : 0); if (u * u + v * v > 1 - scal) continue;
    const edge = u * u + v * v > 0.72 - scal, inside = ((X + 0.5 - x) / (rx * 0.62)) ** 2 + ((Y + 0.5 - (y - ry * 0.45)) / (open * 0.7)) ** 2 < 1;
    let col = v < -0.25 ? POPPY[4] : v < 0.3 ? POPPY[3] : POPPY[2];
    if (Math.abs(u) < 0.08 && v > -0.1 && s >= 4) col = POPPY[2];
    if (edge) col = v < 0.2 ? (((X + Y) & 1) || s < 4 ? POPPY[6] : POPPY[5]) : POPPY[1];
    if (inside && s >= 7) col = v < -0.55 ? "#2A0610" : "#1A0408";
    else if (inside && s >= 2.5 && v < -0.45) col = POPPY[2];
    g.px(X, Y, col);
  }
  if (s >= 7) { g.px(x, R(y - ry * 0.5), "#6A5A20"); g.px(x - 1, R(y - ry * 0.55), "#E8D060"); g.px(x + 1, R(y - ry * 0.45), "#E8D060"); }
}
/** Daisy seen slightly from the side: ring of white rays + yellow eye. */
export function daisy(g, x, y, s, seed = 0, sq = 0.62) {
  x = R(x); y = R(y);
  if (s < 1.6) { g.px(x - 1, y, DAISY.pet); g.px(x + 1, y, DAISY.pet); g.px(x, y, DAISY.eye); g.px(x, y - 1, DAISY.lit); return; }
  const n = s >= 6 ? 14 : 10;
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI + seed, ca = Math.cos(a), sa = Math.sin(a), L = s * (0.95 + 0.1 * Math.sin(k * 2.7 + seed));
    for (let j = R(s * 0.3); j <= L; j++) {
      const px = x + ca * j, py = y + sa * j * sq, front = sa > 0.2;
      const col = j > L - 1.2 ? (sa < 0 ? DAISY.lit : DAISY.dark) : front ? DAISY.pet : sa < -0.3 ? DAISY.lit : DAISY.pet;
      g.px(R(px), R(py), col); if (s >= 5 && j < L - 1) g.px(R(px + sa * 0.8), R(py - ca * 0.8 * sq), front ? DAISY.dark : col);
    }
  }
  const er = Math.max(1, s * 0.3);
  for (let Y = R(y - er * sq - 1); Y <= R(y + er * sq + 1); Y++) for (let X = R(x - er); X <= R(x + er); X++) if (((X - x) / er) ** 2 + ((Y - y) / (er * Math.max(0.7, sq))) ** 2 <= 1.05) g.px(X, Y, Y > y ? DAISY.eyeD : DAISY.eye);
  if (s >= 4) g.px(R(x - er * 0.4), R(y - er * 0.4), "#FFF0A0");
}
/** Clover head (r = radius): a ball of tiny florets, lit along the top. pal = CLOVER_P | CLOVER_W. */
export function cloverHead(g, x, y, r, pal = CLOVER_P, seed = 0) {
  x = R(x); y = R(y);
  if (r < 1.6) { g.px(x, y, pal.mid); g.px(x + 1, y, pal.dark); g.px(x, y - 1, pal.light); return; }
  const ry = r * 1.05;
  for (let Y = R(y - ry - 1); Y <= R(y + ry); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const u = (X + 0.5 - x) / r, v = (Y + 0.5 - y) / ry, bump = 0.14 * Math.sin(Math.atan2(v, u) * 7 + seed), d = Math.hypot(u, v);
    if (d > 1 + bump * (v < 0.3 ? 1 : 0.3)) continue;
    let col; const q = rnd((X * 13 + Y * 7) ^ (seed * 97)), lit = -v * 0.7 - u * 0.25;
    if (d > 0.86 + bump) col = v < -0.1 ? pal.tip : pal.out;
    else col = lit + (q - 0.5) * 0.6 > 0.35 ? pal.light : lit + (q - 0.5) * 0.6 > -0.25 ? pal.mid : pal.dark;
    if (r >= 4 && q < 0.12 && v < 0.4) col = pal.tip;
    g.px(X, Y, col);
  }
}
/** Trefoil clover leaf (three hearts with a pale chevron), size s px. */
export function trefoil(g, x, y, s, col = "#2E6E36", hi = "#5AA050", mark = "#A6D08A") {
  x = R(x); y = R(y);
  if (s <= 2) { for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2]]) { g.px(x + dx, y + dy, col); g.px(x + dx + (dx > 0 ? -1 : dx < 0 ? 1 : 0), y + dy + (dy < 0 ? 1 : 0), hi); } g.px(x, y + 1, col); return; }
  for (const [ang] of [[-Math.PI / 2], [Math.PI / 6 + 0.1], [(5 * Math.PI) / 6 - 0.1]]) {
    const cx = x + Math.cos(ang) * s * 0.75, cy = y + Math.sin(ang) * s * 0.55;
    for (let Y = R(cy - s * 0.7); Y <= R(cy + s * 0.7); Y++) for (let X = R(cx - s * 0.7); X <= R(cx + s * 0.7); X++) {
      const d = ((X - cx) / (s * 0.66)) ** 2 + ((Y - cy) / (s * 0.5)) ** 2; if (d > 1) continue;
      g.px(X, Y, d > 0.7 ? col : Y < cy ? hi : col);
      if (s >= 4 && Math.abs(d - 0.3) < 0.08) g.px(X, Y, mark);
    }
  }
}
/** Lavender: thin grey-green stem from (x, y) to (x + lean, y − h), the top 45 % a spike of purple whorls. */
export function lavender(g, x, y, h, lean = 0, seed = 0, rim = "#F4DCFF") {
  const n = Math.max(2, R(h)), w = h > 40 ? 2 : 1;
  for (let j = 0; j <= n; j++) { const k = j / n, px = R(x + lean * k * k), py = R(y - j); if (k < 0.55) { g.px(px, py, k < 0.3 ? "#4E6A50" : "#6A8A6A"); if (w > 1) g.px(px + 1, py, "#3E5A42"); } }
  for (let j = R(n * 0.5); j <= n; j += h > 30 ? 3 : 2) {
    const k = j / n, px = x + lean * k * k, py = y - j, ww = Math.max(1, (h > 30 ? 3.2 : 1.8) * (1 - (k - 0.5) * 0.9));
    for (let X = R(px - ww); X <= R(px + ww); X++) for (let Y = R(py - 1); Y <= R(py + 1); Y++) {
      const u = (X - px) / (ww + 0.5), v = Y - py; if (u * u + (v / 1.4) ** 2 > 1) continue;
      g.px(X, Y, v < 0 && u < 0.3 ? (rnd(X * 7 + Y + seed) < 0.3 ? LAV[5] : LAV[4]) : u > 0.4 || v > 0 ? LAV[2] : LAV[3]);
    }
  }
  g.px(R(x + lean), R(y - n - 1), rim);
}
/** Grass blade: curved, dark at the base, mid, a backlit glowing tip. w = 1 or 2 px wide. */
export function blade(g, x, y, h, lean, cols, w = 1) {
  const n = Math.max(1, R(h));
  for (let j = 0; j <= n; j++) {
    const k = j / n, px = R(x + lean * k * k), py = R(y - j), col = k > 0.78 ? cols[2] : k > 0.4 ? cols[1] : cols[0];
    g.px(px, py, col); if (w > 1 && k < 0.7) g.px(px + 1, py, k > 0.3 ? cols[0] : mix(cols[0], "#000000", 0.2));
  }
}
/** Wildflower-drift scatter: weighted kinds drawn with their small painters; sizes grow toward the viewer. */
export function scatterFlowers(g, x0, x1, land, y1, n, seed, kinds, skip = null) {
  const tot = kinds.reduce((s, k) => s + k.w, 0);
  for (let i = 0; i < n; i++) {
    const y = R(land + 3 + Math.pow(rnd(seed + i * 7 + 3), 1.25) * (y1 - land - 3)), x = R(x0 + rnd(seed + i * 7 + 4) * (x1 - x0)), d = y - land;
    if (skip && skip(x, y)) continue;
    let q = rnd(seed + i * 11) * tot, kind = kinds[0]; for (const k of kinds) { if ((q -= k.w) <= 0) { kind = k; break; } }
    const s = d < 24 ? 1 : d < 80 ? 1.8 + rnd(i + seed) : d < 170 ? 2.6 + rnd(i * 3 + seed) * 1.2 : 3.4 + rnd(i * 5 + seed) * 1.6;
    kind.draw(g, x, y, s, i + seed, d);
  }
}

// ---------------------------------------------------------------- sprites for big foreground flowers (blob shading)
const BIG = spriteCache(40);
const POP_RAMP = ["#3A0608", "#740E0E", "#A8161A", "#D42822", "#F04428", "#FF6A3A", "#FF9A60", "#FFD0A0"];
/** Big poppy head sprite (r ≈ 8..24), drawn once, blitted per frame with sway. Anchor = cup centre. A wide cup of four
 *  crinkled petals seen a little from above: two glowing back petals (sun shining through), the dark heart with the
 *  green seed pod and black stamens, two front petals with darker veins running to the base. */
export function bigPoppy(c, x, y, r, seed = 0, a = 1) {
  const key = `pop3:${r}:${seed}`, W = R(r * 2.8) + 8, H = R(r * 2.6) + 8, ox = R(W / 2), oy = R(H * 0.5);
  BIG(key, W, H, ox, oy, (g, cx, cy) => {
    const crinkle = (px, py, rx, ry, rot, n, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 2 * Math.PI, k = 1 + 0.06 * Math.sin(an * 5 + ph) + 0.03 * Math.sin(an * 11 + ph * 2); const ex = Math.cos(an) * rx * k, ey = Math.sin(an) * ry * k; out.push([cx + px * r + ex * Math.cos(rot) - ey * Math.sin(rot), cy + py * r + ex * Math.sin(rot) + ey * Math.cos(rot)]); } return out; };
    // back petals (one wide shape + two lobes), lit through: bright, glowing rim
    blob(g, [crinkle(-0.44, -0.4, r * 0.64, r * 0.52, -0.3, 40, seed), crinkle(0.44, -0.4, r * 0.64, r * 0.52, 0.3, 40, seed + 1), crinkle(0, -0.56, r * 0.6, r * 0.42, 0, 36, seed + 2)],
      { ramp: POP_RAMP, base: 3.3, gain: 1.8, slope: 0.5, thick: r * 0.45, light: [0, -1], rimLit: 1.3, outline: "#5A0C0C", litOutline: "#FFC98A" });
    // the dark heart: a squashed ellipse, black blotches, green pod with a dark star cap, stamens
    g.poly(ell(cx, cy - r * 0.3, r * 0.6, r * 0.24, 0, 28), "#22060A"); g.poly(ell(cx, cy - r * 0.36, r * 0.5, r * 0.14, 0, 24), "#3A0A10");
    for (let i = 0; i < 16; i++) { const an = (i / 16) * Math.PI * 2 + seed, px = cx + Math.cos(an) * r * 0.42, py = cy - r * 0.3 + Math.sin(an) * r * 0.14; g.px(R(px), R(py), i % 2 ? "#0E0204" : "#3A2A30"); }
    g.poly(ell(cx, cy - r * 0.33, r * 0.2, r * 0.1, 0, 16), "#6E8E44"); g.poly(ell(cx, cy - r * 0.36, r * 0.14, r * 0.05, 0, 12), "#A6C070");
    for (let i = -2; i <= 2; i++) g.px(R(cx + i * r * 0.05), R(cy - r * 0.36), "#3A2A50");
    // front petals: overlap below the heart, cup down to the stem, darker veins
    blob(g, [crinkle(-0.3, 0.34, r * 0.6, r * 0.5, -0.35, 40, seed + 3), crinkle(0.32, 0.36, r * 0.58, r * 0.48, 0.32, 40, seed + 4)],
      { ramp: POP_RAMP, base: 2.5, gain: 2.1, slope: 0.9, thick: r * 0.5, light: [0.2, -1], rimLit: 1.5, outline: "#4A0A0A", litOutline: "#FFB070" });
    for (let i = 0; i < 6; i++) { const ux = (i - 2.5) / 2.5, x0 = cx + ux * r * 0.6, y0 = cy + r * 0.04 + Math.abs(ux) * r * 0.14; g.line(R(x0), R(y0 + 2), R(cx + ux * r * 0.2), R(cy + r * 0.74), "#A01C14"); }
    g.line(R(cx), R(cy + r * 0.08), R(cx + r * 0.02), R(cy + r * 0.8), "#6A100C");
  }).blit(c, x, y, { a });
}
/** Poppy bud: nodding hairy green bud on a curved stem tip (s ≈ 3..6). */
export function poppyBud(g, x, y, s) {
  for (let Y = R(y - s); Y <= R(y + s * 1.3); Y++) for (let X = R(x - s); X <= R(x + s); X++) { const u = (X - x) / s, v = (Y - y) / (s * 1.3); if (u * u + v * v > 1) continue; g.px(X, Y, u * u + v * v > 0.75 ? (v < 0 ? "#E8D888" : "#2A3A1C") : v < -0.2 ? "#8AA050" : "#5A7034"); }
  g.px(R(x), R(y + s * 1.3), "#E04A22");
}
/** Backlit grass with a seed plume (timothy / foxtail): thin stem, a glowing spike of tiny dots at the top. */
export function seedGrass(g, x, y, h, lean, cols = ["#4A5A28", "#FFE9A0", "#F2C460", "#B8903A"]) {
  const n = Math.max(3, R(h));
  for (let j = 0; j <= n; j++) { const k = j / n, px = R(x + lean * k * k), py = R(y - j); if (k < 0.72) g.px(px, py, cols[0]); else { const w = h > 40 ? 1 : 0; g.px(px, py, ((py + px) & 1) ? cols[1] : cols[2]); if (w) { g.px(px - 1, py, cols[3]); g.px(px + 1, py, cols[2]); } } }
  g.px(R(x + lean), R(y - n - 1), cols[1]);
}
/** Big daisy head sprite (r ≈ 8..16), seen a little from the side. */
export function bigDaisy(c, x, y, r, seed = 0, a = 1) {
  const key = `dai:${r}:${seed}`, W = R(r * 2.4) + 8, H = R(r * 1.8) + 8, ox = R(W / 2), oy = R(H / 2);
  BIG(key, W, H, ox, oy, (g, cx, cy) => {
    const n = 16, sq = 0.6, rays = [];
    for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2 + seed * 0.3, L = r * (0.92 + 0.12 * Math.sin(k * 2.3 + seed)); rays.push([an, L]); }
    rays.sort((p, q) => Math.sin(p[0]) - Math.sin(q[0]));                      // back rays first
    for (const [an, L] of rays) {
      const tip = [cx + Math.cos(an) * L, cy + Math.sin(an) * L * sq], mid = [cx + Math.cos(an) * L * 0.55, cy + Math.sin(an) * L * 0.55 * sq], wv = r * 0.17;
      const nx = -Math.sin(an) * wv, ny = Math.cos(an) * wv * sq, back = Math.sin(an) < 0;
      const poly = [[cx, cy], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]];
      g.poly(poly, back ? "#E6DAE6" : "#F6F0F2");
      for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), back ? "#B4A2B8" : "#A898AE"); }
      if (back) { g.px(R(tip[0]), R(tip[1]) + 1, "#FFFBEA"); g.px(R(tip[0] + (mid[0] - tip[0]) * 0.2), R(tip[1] + (mid[1] - tip[1]) * 0.2) + 1, "#FFF6DA"); }
    }
    blob(g, [ell(cx, cy, r * 0.32, r * 0.24, 0, 20)], { ramp: ["#3A2404", "#7A4A08", "#B87A10", "#E8A818", "#F8C830", "#FFE070", "#FFF2B0", "#FFFFFF"], base: 3.6, thick: r * 0.2, light: [-0.3, -1], outline: "#6A4008" });
  }).blit(c, x, y, { a });
}
/** Big clover head sprite (r ≈ 6..14). */
export function bigClover(c, x, y, r, seed = 0, a = 1, pal = CLOVER_P) {
  const key = `clo:${r}:${seed}:${pal.mid}`, W = R(r * 2.4) + 8, H = R(r * 2.6) + 8, ox = R(W / 2), oy = R(H / 2);
  BIG(key, W, H, ox, oy, (g, cx, cy) => {
    // florets: many little tubes pointing up and out, back to front, lit tips
    const fl = []; for (let i = 0; i < 70; i++) { const an = rnd(i * 3 + seed) * Math.PI * 2, rr = Math.sqrt(rnd(i * 5 + seed)) * r * 0.82; fl.push([cx + Math.cos(an) * rr, cy + Math.sin(an) * rr * 1.05 - r * 0.05, an]); }
    fl.sort((p, q) => p[1] - q[1]);
    g.poly(ell(cx, cy, r * 0.86, r * 0.92, 0, 24), pal.dark);
    for (const [fx, fy, an] of fl) {
      const dx = (fx - cx) / r, dy = (fy - cy) / r, len = Math.max(2, r * 0.28), ux = dx * 0.6, uy = -0.8 + dy * 0.3, nn = Math.hypot(ux, uy);
      const tx = fx + (ux / nn) * len, ty = fy + (uy / nn) * len, lit = -dy * 0.8 - dx * 0.3;
      g.line(R(fx), R(fy), R(tx), R(ty), lit > 0.2 ? pal.light : lit > -0.3 ? pal.mid : pal.dark);
      g.px(R(tx), R(ty), lit > -0.1 ? pal.tip : pal.light);
    }
    // two small sepal leaves under the head
    g.poly([[cx - r * 0.7, cy + r * 0.8], [cx - r * 0.1, cy + r * 0.62], [cx - r * 0.2, cy + r * 1.05]], "#2E6236"); g.poly([[cx + r * 0.7, cy + r * 0.8], [cx + r * 0.1, cy + r * 0.62], [cx + r * 0.2, cy + r * 1.05]], "#3A7440");
  }).blit(c, x, y, { a });
}

// ---------------------------------------------------------------- screen-space light (per frame, cheap)
/** Pollen / dust motes drifting in the low sun: n tiny glints, periodic over P (integer cycles). */
export function motes(c, n, P, t, box, seed, a = 1, cols = ["#FFF4C8", "#FFD27A"]) {
  if (a <= 0) return; const g = fade(c, a), [x0, y0, x1, y1] = box;
  for (let i = 0; i < n; i++) {
    const nx = 2 + Math.floor(rnd(seed + i) * 4), ny = 3 + Math.floor(rnd(seed + i * 3) * 5), ph = rnd(seed + i * 7) * 6.283;
    const x = x0 + (x1 - x0) * (0.5 + 0.45 * Math.sin((2 * Math.PI * nx * t) / P + ph) * (0.6 + 0.4 * rnd(seed + i * 11))), y = y0 + (y1 - y0) * (0.5 + 0.45 * Math.sin((2 * Math.PI * ny * t) / P + ph * 1.7));
    const tw = 0.5 + 0.5 * Math.sin((2 * Math.PI * (40 + Math.floor(rnd(seed + i * 13) * 30)) * t) / P + ph), k = sm01(tw, 0.2, 0.75);
    if (k <= 0) continue; const X = R(x), Y = R(y);                       // twinkle = colour blend, never a one-frame pop
    g.px(X, Y, mix(c.get(X, Y), mix(cols[1], cols[0], sm01(tw, 0.6, 0.85)), k)); if (rnd(seed + i * 17) < 0.5) { const k2 = sm01(tw, 0.75, 0.95); if (k2 > 0) { g.px(X + 1, Y, mix(c.get(X + 1, Y), cols[1], k2)); g.px(X, Y + 1, mix(c.get(X, Y + 1), cols[1], k2)); } }
  }
}
const sm01 = (v, a, b) => { const x = Math.max(0, Math.min(1, (v - a) / (b - a))); return x * x * (3 - 2 * x); };
/** Precomputed sun rays (screen space) around a disc centre: sparse dithered pixel list, brightened per frame. */
const RAYS = new Map();
export function sunRays(c, cx, cy, r0, r1, n, seed, col, k, rot = 0) {
  if (k <= 0.02) return; const key = `${cx}:${cy}:${r0}:${r1}:${n}:${seed}`;
  let L = RAYS.get(key);
  if (!L) {
    const list = [];
    for (let Y = Math.max(0, cy - r1); Y < Math.min(960, cy + r1); Y++) for (let X = Math.max(0, cx - r1); X < Math.min(540, cx + r1); X++) {
      const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy); if (d < r0 || d > r1) continue;
      const an = Math.atan2(dy, dx); let s = 0;
      for (let i = 0; i < n; i++) { const a0 = rnd(seed + i * 5) * Math.PI * 2, w = 0.035 + rnd(seed + i * 7) * 0.05, da = Math.abs(((an - a0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI); if (da < w) s = Math.max(s, (1 - da / w) * (0.5 + 0.5 * rnd(seed + i * 9))); }
      const fall = 1 - (d - r0) / (r1 - r0); s *= fall * fall;
      if (s > 0.02) list.push(Y * 540 + X, s);
    }
    L = new Float64Array(list); RAYS.set(key, L);
  }
  const [cr, cg, cb] = hex(col), d = c.d;
  for (let i = 0; i < L.length; i += 2) {
    const p = L[i], s = L[i + 1] * k, X = p % 540, Y = (p - X) / 540; if (s <= bayer(X, Y) * 0.9 + 0.05) continue;
    const q = p * 3; d[q] = d[q] + (cr - d[q]) * 0.28; d[q + 1] = d[q + 1] + (cg - d[q + 1]) * 0.28; d[q + 2] = d[q + 2] + (cb - d[q + 2]) * 0.28;
  }
  void rot;
}
export { R, mix, bayer };
