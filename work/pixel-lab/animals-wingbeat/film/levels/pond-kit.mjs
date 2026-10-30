// LV4 pond painters: weeping willow, alder, cattails, rushes, yellow flag iris, lily pads, a water lily, mossy stones,
// swaying foreground reeds and a small cute frog peeking out of the water. Deterministic (rnd), no clock: every moving
// part takes its phase from the caller.
import { blob, ell, tube, bez, eye, blush, smile, rnd, fade, mix, bayer, RAMP } from "../cute.mjs";
import { leafBall } from "./meadow-kit.mjs";

const R = Math.round;
export const WILLOW = ["#2A4A16", "#3A6420", "#4E7E2A", "#649834", "#7CB040", "#96C452", "#B2D86A", "#D0EA90"];
export const ALDER = ["#123A20", "#1A4C28", "#245E30", "#30723A", "#3E8644", "#529A50", "#6CB060", "#8AC678"];
export const PAD = ["#0E3418", "#16481E", "#205E26", "#2C742E", "#3C8A38", "#54A246", "#72BA58", "#98D27A"];
const BARK = ["#24160E", "#3A2416", "#523420", "#6A462C", "#84603E"];

/** Weeping willow: leaning trunk, a soft crown, long hanging strands down to the bank. (x, y) = trunk foot. */
export function willow(g, x, y, sc = 1, seed = 0) {
  const h = 92 * sc;
  for (let i = 0; i <= h; i++) { const k = i / h, cx = x + Math.sin(k * 2.2) * 8 * sc, w = (7 - 3 * k) * sc; for (let j = -w; j <= w; j++) g.px(R(cx + j), R(y - i), Math.abs(j) > w - 1 ? BARK[0] : j < -w * 0.3 ? BARK[3] : (R(i * 0.5 + j) % 5 === 0 ? BARK[1] : BARK[2])); }
  for (const [dx, dy, r] of [[-30, -100, 26], [10, -112, 30], [44, -98, 24], [-50, -80, 20], [62, -78, 18], [-10, -128, 22]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, WILLOW, seed + dx, { amp: 0.12, bumps: 11 });
  // hanging strands: thin curtains of little leaves from the crown down toward the water
  for (let i = 0; i < 46; i++) {
    const sx = x + (-70 + rnd(seed + i * 7) * 150) * sc, sy = y - (96 + rnd(seed + i * 3) * 30) * sc - Math.abs(sx - x - 6) * 0.25, len = (60 + rnd(seed + i * 11) * 50) * sc * (1 - Math.abs(sx - x) / (110 * sc) * 0.5);
    for (let j = 0; j < len; j++) { const k = j / len, px = R(sx + Math.sin(k * 2 + i) * 2 * k), py = R(sy + j); g.px(px, py, WILLOW[(j + i) % 3 === 0 ? 2 : k > 0.7 ? 3 : 4]); if (j % 3 === 0) g.px(px + ((i + j) % 2 ? 1 : -1), py + 1, WILLOW[k > 0.6 ? 5 : 6]); }
  }
}
/** Round dark alder/bush crown on a short trunk. */
export function alder(g, x, y, sc = 1, seed = 0) {
  g.rect(R(x - 2 * sc), R(y - 30 * sc), R(4 * sc), R(30 * sc), BARK[1]);
  for (const [dx, dy, r] of [[-14, -40, 18], [12, -44, 20], [0, -62, 18]]) leafBall(g, x + dx * sc, y + dy * sc, r * sc, ALDER, seed + dx, { amp: 0.1, bumps: 8 });
}
/** Cattail (bulrush): stem, brown velvet head with a thin spike, two long leaves. h total height; sway shifts the tip. */
export function cattail(g, x, y, h, sway = 0, seed = 0, s = 1) {
  const at = (k) => [x + sway * k * k, y - h * k];
  for (let i = 0; i <= h; i++) { const [px, py] = at(i / h); g.px(R(px), R(py), "#4E7A34"); if (s > 1.4) g.px(R(px) + 1, R(py), "#3A6028"); }
  const k0 = 0.72, k1 = 0.9, w = Math.max(1.5, 2.6 * s);
  for (let i = R(h * k0); i <= R(h * k1); i++) { const [px, py] = at(i / h); for (let j = -w; j <= w; j++) g.px(R(px + j), R(py), Math.abs(j) > w - 0.8 ? "#3A1E0E" : j < -w * 0.2 ? "#A8683A" : (i + R(j)) % 4 === 0 ? "#6A3A1A" : "#86502A"); }
  for (let i = R(h * k1); i <= h + 6 * s; i++) { const [px, py] = at(Math.min(1, i / h)); g.px(R(px), R(py) - (i > h ? i - h : 0), "#8A7A5A"); }
  for (const sd of [-1, 1]) { const L = h * (0.7 + rnd(seed + sd) * 0.3); for (let i = 0; i < L; i++) { const k = i / L, px = x + sd * (k * k) * h * 0.18 + sway * k * k * 0.6, py = y - i; g.px(R(px), R(py), k > 0.8 ? "#8ABE58" : "#5E9A3C"); if (s > 1.2) g.px(R(px) + sd, R(py), "#3E7028"); } }
}
/** Rush clump: many thin straight blades fanning from a base point. */
export function rushes(g, x, y, h, n, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * 0.7 + (rnd(seed + i) - 0.5) * 0.15, L = h * (0.6 + rnd(seed + i * 3) * 0.4); for (let j = 0; j < L; j++) { const k = j / L; g.px(R(x + Math.sin(a) * j + sway * k * k), R(y - Math.cos(a) * j), j > L * 0.85 ? "#B4D27A" : i % 3 ? "#5A9440" : "#467A34"); } }
}
/** Yellow flag iris: sword leaves and a few yellow flowers. */
export function iris(g, x, y, h, seed = 0) {
  for (let i = 0; i < 5; i++) { const a = (i - 2) * 0.16, L = h * (0.7 + rnd(seed + i) * 0.3); for (let j = 0; j < L; j++) { const w = j < L * 0.8 ? 1 : 0; g.px(R(x + Math.sin(a) * j), R(y - j), "#4E8A3A"); if (w) g.px(R(x + Math.sin(a) * j) + 1, R(y - j), "#6AA84A"); } }
  for (let i = 0; i < 2; i++) { const fx = R(x + (i ? 5 : -4)), fy = R(y - h * (0.8 + i * 0.15)); g.rect(fx - 2, fy, 5, 2, "#F8D030"); g.px(fx - 3, fy + 2, "#E8B020"); g.px(fx + 3, fy + 2, "#E8B020"); g.px(fx, fy - 2, "#FFE870"); g.px(fx, fy - 1, "#FFE870"); g.px(fx, fy + 1, "#B07A10"); }
}
/** Purple loosestrife: upright stems topped by tapering spikes of little magenta florets, narrow paired leaves. */
export function loosestrife(g, x, y, h, seed = 0, s = 1) {
  const sw = Math.max(1, R(s * 0.8));
  for (let k = 0; k < 3; k++) {
    const bx = x + (k - 1) * 5 * s, hh = h * (0.72 + rnd(seed + k) * 0.28), lean = (k - 1) * 4 * s, at = (q) => [bx + lean * q * q, y - hh * q];
    for (let j = 0; j <= hh; j++) { const [px, py] = at(j / hh); for (let w = 0; w < sw; w++) g.px(R(px) + w, R(py), w ? "#2E5420" : "#4A7A34"); }
    for (let j = 0; j < 4; j++) { const q = 0.18 + j * 0.12, [lx, ly] = at(q); leafPair(g, lx, ly, 6 * s, 1.6 * s); }
    // the spike: florets stacked from 55 % of the height to the top, tapering
    const n = R(hh * 0.45 / Math.max(1.6, 2.2 * s));
    for (let f = 0; f < n; f++) {
      const q = 0.55 + (f / n) * 0.45, [fx, fy] = at(q), r = Math.max(0.9, (2.6 - 1.6 * (f / n)) * s), side = (f & 1 ? 1 : -1) * r * 0.5;
      for (let Y = R(fy - r); Y <= R(fy + r); Y++) for (let X = R(fx + side - r); X <= R(fx + side + r); X++) { const d = Math.hypot(X - fx - side, Y - fy) / r; if (d > 1) continue; g.px(X, Y, d > 0.8 ? "#8A1C78" : X - fx - side + Y - fy < -r * 0.3 ? "#F79AE2" : "#D84AC0"); }
    }
    const [tx, ty] = at(1); g.px(R(tx), R(ty) - 1, "#B03AA0");
  }
}
function leafPair(g, x, y, L, w) { for (const sd of [-1, 1]) for (let i = 0; i < L; i++) { const k = i / L, half = Math.sin(Math.PI * k) * w; for (let j = -half; j <= half; j += 0.5) g.px(R(x + sd * i), R(y - i * 0.45 + j), j < 0 ? "#6A9A44" : "#466E2E"); } }
/** Reed leaf blade: a tapering curved strap from the base (width w) to a point; light side left, dark side right. */
export function blade(g, x, y, h, lean, w = 3) {
  const n = R(h);
  for (let i = 0; i <= n; i++) {
    const k = i / n, cx = x + lean * k * k, cy = y - i, half = Math.max(0.5, w * (1 - k) ** 0.8);
    for (let j = -half; j <= half; j += 0.5) { const X = R(cx + j); g.px(X, R(cy), Math.abs(j) > half - 0.6 ? "#24481C" : j < 0 ? (k > 0.85 ? "#C4DC86" : "#7EB44E") : (k > 0.85 ? "#9AC064" : "#4E8A34")); }
  }
}
/** Marsh marigold: a clump of round glossy leaves with yellow cup flowers. */
export function marigold(g, x, y, s = 1, seed = 0) {
  for (let i = 0; i < 5; i++) { const lx = x + (rnd(seed + i) - 0.5) * 16 * s, ly = y - rnd(seed + i * 3) * 6 * s, r = (3.5 + rnd(seed + i * 5) * 2) * s; for (let Y = R(ly - r * 0.8); Y <= R(ly + r * 0.8); Y++) for (let X = R(lx - r); X <= R(lx + r); X++) { const d = ((X - lx) / r) ** 2 + ((Y - ly) / (r * 0.8)) ** 2; if (d > 1) continue; g.px(X, Y, d > 0.75 ? "#1E4A1E" : X - lx + Y - ly < -r * 0.4 ? "#6AAE4A" : "#3E7E32"); } }
  for (let i = 0; i < 3; i++) { const fx = R(x + (rnd(seed + i * 7) - 0.5) * 14 * s), fy = R(y - (5 + rnd(seed + i * 9) * 5) * s), r = Math.max(1.5, 2.4 * s); for (let Y = R(fy - r); Y <= R(fy + r); Y++) for (let X = R(fx - r); X <= R(fx + r); X++) if ((X - fx) ** 2 + (Y - fy) ** 2 <= r * r + 0.5) g.px(X, Y, (X - fx) + (Y - fy) < 0 ? "#FFE860" : "#F0B820"); g.px(fx, fy, "#C88A10"); }
}
/** Lily pad in perspective: an ellipse with a notch, two-tone green, radial veins, dark rim. */
export function lilyPad(g, x, y, rx, ry, seed = 0, notch = 0.6) {
  const rot = rnd(seed) * 6.283;
  for (let Y = R(y - ry) - 1; Y <= R(y + ry) + 1; Y++) for (let X = R(x - rx) - 1; X <= R(x + rx) + 1; X++) {
    const dx = (X - x) / rx, dy = (Y - y) / ry, d = dx * dx + dy * dy; if (d > 1) continue;
    let an = Math.atan2(dy, dx) - rot; an = ((an % 6.283) + 6.283) % 6.283; if (an < notch * 0.5 && d > 0.02) continue;   // the notch (a narrow wedge)
    const rim = d > 0.82 || an < notch * 0.5 + 0.14, vein = R((an / 6.283) * 14) % 1 === 0 && Math.abs((an / 6.283) * 14 - R((an / 6.283) * 14)) < 0.08 && d > 0.1;
    const lit = -dx * 0.5 - dy * 0.9;
    g.px(X, Y, rim ? PAD[1] : vein ? PAD[3] : lit > 0.35 ? PAD[6] : lit > -0.25 ? PAD[5] : PAD[4]);
  }
}
/** Water lily flower (pink-white pointed petals in layers, yellow heart). */
export function waterLily(g, x, y, r) {
  x = R(x); y = R(y);
  const P = ["#8A2A5A", "#C24A86", "#E87AAE", "#F8A8CC", "#FFD6E8", "#FFFFFF"];
  for (const [n, len, wid, rot, lift, base] of [[8, 1.0, 0.32, 0.2, 0.35, 2], [7, 0.8, 0.3, 0.6, 0.6, 3], [5, 0.55, 0.28, 0.1, 0.9, 4]]) {
    for (let k = 0; k < n; k++) {
      const a = rot + (k * 2 * Math.PI) / n, cx = Math.cos(a), sy = Math.sin(a);
      for (let i = 0; i <= r * len * 2; i++) { const u = i / (r * len * 2), half = Math.sin(Math.PI * u) * r * wid * (1 - u * 0.4); for (let j = -half; j <= half; j += 0.5) { const px = x + cx * u * r * len - sy * j * 0.5, py = y + sy * u * r * len * 0.45 - u * r * lift * (sy < 0 ? 1 : 0.4) + cx * j * 0.25; g.px(R(px), R(py), Math.abs(j) > half - 0.7 ? P[base - 1] : j < 0 ? P[base + 1] : P[base]); } }
    }
  }
  g.rect(x - 2, y - R(r * 0.6) - 1, 5, 3, "#F8C830"); g.px(x - 1, y - R(r * 0.6) - 2, "#FFE880"); g.px(x + 1, y - R(r * 0.6) - 2, "#FFE880");
}
/** Mossy pond stone (rounded, wet highlight, moss cap). */
export function mossStone(g, x, y, rx, ry, seed = 0) {
  const ST = ["#1E2428", "#2E363C", "#424C52", "#58646A", "#727E84", "#909CA0", "#B2BCBE"], MOSS = ["#2A4A1A", "#3E6626", "#548232", "#6E9E40", "#8CB656"];
  for (let Y = R(y - ry) - 1; Y <= R(y + ry); Y++) for (let X = R(x - rx) - 1; X <= R(x + rx) + 1; X++) {
    const an = Math.atan2(Y - y, X - x), wob = 1 + 0.07 * Math.sin(an * 4 + seed) + 0.04 * Math.sin(an * 9 + seed * 2), dx = (X - x) / (rx * wob), dy = (Y - y) / (ry * wob), d = dx * dx + dy * dy; if (d > 1 || Y > y + ry * 0.55) continue;
    const lit = -dx * 0.6 - dy * 0.8, edge = d > 0.86;
    let col = edge ? ST[0] : lit > 0.55 ? ST[5] : lit > 0.1 ? ST[4] : lit > -0.35 ? ST[3] : ST[2];
    const moss = dy < -0.15 + 0.25 * Math.sin(dx * 5 + seed) && d < 0.9; if (moss) col = edge ? MOSS[0] : MOSS[lit > 0.4 ? 4 : lit > 0 ? 3 : 2];
    if (!moss && lit > 0.5 && d < 0.4 && ((X + Y) & 1)) col = ST[6];
    g.px(X, Y, col);
  }
}

/**
 * Small cute frog peeking out of the water: only its head is above the surface (eyes on top, golden irises, two highlights,
 * blush, a wide smile); the rest shows faintly under the water. (x, y) = waterline centre. o: look, blink, throat 0..1, a.
 */
export function peekFrog(c, x, y, o = {}) {
  const a = o.a ?? 1, g = fade(c, a); x = R(x); y = R(y);
  const F = ["#0E2A10", "#1A4418", "#2A6020", "#3E7E2A", "#56983A", "#74B24C", "#98CA6A", "#C4E296"];
  // the submerged body: a darker, dithered shape under the waterline
  for (let Y = y + 1; Y <= y + 16; Y++) for (let X = x - 24; X <= x + 24; X++) { const d = ((X - x) / 24) ** 2 + ((Y - y - 4) / 13) ** 2; if (d < 1 && 0.45 > bayer(X, Y)) g.px(X, Y, mix("#2A6A6A", F[2], 0.5)); }
  // head dome + eye bumps (volume shaded), cut at the waterline
  const throat = o.throat ?? 0;
  const head = ell(x, y + 2, 22, 11 + throat * 0.8, 0, 40), bumps = [ell(x - 11, y - 9, 9, 8, 0, 24), ell(x + 11, y - 9, 9, 8, 0, 24)];
  blob(c, [head, ...bumps], { ramp: F, base: 3.8, gain: 2.0, thick: 7, litOutline: F[2], outline: F[0], a });
  // waterline: cover the lower half of the dome with a light ring (the meniscus)
  for (let X = x - 24; X <= x + 24; X++) { const k = (X - x) / 24; if (Math.abs(k) > 1) continue; g.px(X, y + 3, "#E8FCFF"); if (Math.abs(k) < 0.92) g.px(X, y + 4, "#9AD8E8"); }
  for (let Y = y + 5; Y <= y + 14; Y++) for (let X = x - 24; X <= x + 24; X++) { const d = ((X - x) / 24) ** 2 + ((Y - y - 2) / 12) ** 2; if (d < 1) g.px(X, Y, ((X + Y) & 1) ? "#4AA0B8" : "#3A8AA4"); }
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) eye(c, x + sd * 11, y - 9, 6, { ry: 6.5, iris: ["#3A2A04", "#7A5A0C", "#C8961C", "#F0C040", "#FFE47A"], pupil: "round", look, blink, lid: F[4], a });
  blush(c, x - 15, y - 1, 4, 2, "#FF7FA6", a); blush(c, x + 15, y - 1, 4, 2, "#FF7FA6", a);
  for (let X = -9; X <= 9; X++) { const k = X / 9; g.px(x + X, R(y + 0 + 1.6 * (1 - k * k)), F[0]); }
}
/** Ellipse ring (perspective ripple) of radius rx, alpha a. */
export function ripple(c, x, y, rx, a, col = "#E8FCFF", squash = 0.3) {
  if (a <= 0 || rx < 1) return; const g = fade(c, a), ry = Math.max(1, rx * squash), n = Math.ceil(rx * 5);
  for (let i = 0; i < n; i++) { const an = (i / n) * 2 * Math.PI; if (Math.sin(an) < -0.2 && (i & 1)) continue; g.px(R(x + Math.cos(an) * rx), R(y + Math.sin(an) * ry), Math.sin(an) > 0 ? col : mix(col, "#7AC0D8", 0.4)); }
}
export { R, RAMP, tube, bez };
