// Cute-animal kit for «From the dumbest animal to the smartest»: every animal sits facing the camera like the user's
// reference (a black pixel cat under a full moon): big glossy eyes with two highlights, dithered blush, dark outline,
// volume shading in flat tone bands (dog/shade.mjs engine), a soft contact shadow. Everything is drawn in screen grid
// pixels (540×960), z = 1, so the art stays pixel-crisp. Nothing appears in one frame: pass `a` (0..1) to dissolve.
import { mix, bayer, fade, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { drawPart, smooth } from "../../dog/shade.mjs";
export { smooth };

const R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
/** 0 → 1 → 0 window with smooth edges: visible between a and b. */
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- palette (shared UI colours) and ramps (8 steps, dark → light)
export const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", MU: "#959595", p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A" };
export const RAMP = {
  black: ["#07060E", "#120F22", "#1C1834", "#282248", "#352D5E", "#463C78", "#5C5294", "#7A70B4"],       // the reference cat
  amber: ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"],
  sponge: ["#3A1E08", "#6E3C10", "#A8601A", "#D88A26", "#F2B23A", "#F9CF5A", "#FCE38C", "#FFF4C4"],
  pink: ["#3A0E1E", "#6A1A34", "#9C2A4C", "#C84468", "#E26A88", "#F094AA", "#F8BCCB", "#FFE2EA"],
  jelly: ["#24104A", "#3A1C70", "#5A2E9A", "#7E4AC2", "#A070DE", "#C49AF0", "#E0C4FA", "#F6ECFF"],
  coral: ["#2E0A0C", "#5E1618", "#8E2626", "#BE3C34", "#E05A44", "#F08060", "#F8A88A", "#FDD4C0"],
  bee: ["#2A1A02", "#5A3A04", "#946006", "#C88A0C", "#F0B416", "#F8CE3E", "#FCE47E", "#FFF6C2"],
  ink: ["#06050C", "#0E0C1A", "#18152A", "#23203C", "#302C50", "#403B66", "#55507E", "#6E6A98"],
  white: ["#2A2A3A", "#4A4A60", "#6E6E88", "#9494AE", "#B8B8CE", "#D4D4E4", "#EAEAF4", "#FFFFFF"],
  brown: ["#1E0E06", "#3E200E", "#623418", "#8A4C24", "#B06A34", "#CC8A4C", "#E2AC70", "#F2CEA0"],
  gray: ["#141820", "#232A36", "#36404E", "#4C5868", "#647284", "#808EA0", "#A0ACBC", "#C4CEDA"],
  dolphin: ["#0E1A2E", "#18304E", "#244870", "#336296", "#4A7EB4", "#6A9CCC", "#94BEE0", "#C4DEF2"],
  skin: ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"],
};
export const BLUSH = "#F27A9A";

// ---------------------------------------------------------------- shapes
/** Polygon of an ellipse (optionally rotated), for drawPart / masks. */
export function ell(cx, cy, rx, ry, rot = 0, n = 0) {
  n = n || Math.max(16, Math.ceil((rx + ry) * 1.2));
  const c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push([cx + x * c - y * s, cy + x * s + y * c]); }
  return out;
}
/** Capsule (thick rounded segment) polygon from p to q with radius r. */
export function capsule(p, q, r) { return tube([p, q], r, r); }
/** Tapered tube along a polyline: radius r0 at the start → r1 at the end (tails, arms, trunks, tentacles). */
export function tube(pts, r0, r1) {
  const L = [], Rr = [], n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = lerp(r0, r1, i / (n - 1));
    L.push([pts[i][0] - (dy / d) * r, pts[i][1] + (dx / d) * r]); Rr.push([pts[i][0] + (dy / d) * r, pts[i][1] - (dx / d) * r]);
  }
  const tip = pts[n - 1], cap = [];
  { const a = pts[n - 2], dx = tip[0] - a[0], dy = tip[1] - a[1], ang = Math.atan2(dy, dx); for (let k = 1; k < 6; k++) { const t = ang - Math.PI / 2 + (Math.PI * k) / 6; cap.push([tip[0] + Math.cos(t) * r1, tip[1] + Math.sin(t) * r1]); } }
  return [...L, ...cap.reverse(), ...Rr.reverse()];
}
/** Quadratic Bézier sample (for curved limbs and tails). */
export function bez(p0, p1, p2, n = 12) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }

/**
 * Volume-shaded blob: union of polygons → banded ramp shading with a dark selective outline (lit edges lighter).
 * Defaults tuned for the reference look: soft pillow volume, light from the upper left.
 */
export function blob(c, polys, { ramp = RAMP.black, base = 3.2, gain = 2.0, slope = 0.9, thick = 14, light = [-0.6, -0.8], rimLit = 0.8, rimShade = 0.7, outline, litOutline, a = 1 } = {}) {
  if (a <= 0) return;
  drawPart(c, polys, { ramp, base, gain, slope, thick, light, rimLit, rimShade, outline: outline ?? "#07060E", litOutline: litOutline ?? null, alpha: a });
}
/** Flat fill of the union of polygons, with an optional 1-px outline (used for markings, inner ears, bellies). */
export function flat(c, polys, col, { a = 1, outline = null } = {}) {
  const g = fade(c, a); for (const p of polys) g.poly(p, col);
  if (outline) for (const p of polys) for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; g.line(R(p[i][0]), R(p[i][1]), R(q[0]), R(q[1]), outline); }
}
/** Soft dithered contact shadow under an animal. */
export function shadow(c, x, y, rx, ry, col = "#000000", k = 0.45) {
  c.tint(R(x - rx), R(y - ry), R(rx * 2), R(ry * 2), (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : k * (1 - d); }, col, 3);
}

// ---------------------------------------------------------------- face parts
/**
 * Big glossy cartoon eye. r = horizontal radius (8–18 for portraits), o.ry vertical radius.
 * o.iris: ramp or colour list (dark top → light bottom); o.pupil: "slit" | "round" | "bead" (all-dark eye, sponge/jelly/bird);
 * o.look [dx, dy] shifts pupil and highlights (−1..1); o.blink 0 open → 1 closed (curved lid line); o.lid lid colour.
 */
export function eye(c, x, y, r, o = {}) {
  const ry = o.ry ?? r * 1.12, iris = o.iris ?? RAMP.amber, look = o.look ?? [0, 0], blink = clamp01(o.blink ?? 0), a = o.a ?? 1, g = fade(c, a);
  const out = o.outline ?? "#07060E", lid = o.lid ?? RAMP.black[2], pupil = o.pupil ?? "round";
  const inE = (X, Y, rx, ryy, cx = x, cy = y) => ((X - cx) / rx) ** 2 + ((Y - cy) / ryy) ** 2 <= 1;
  const lidY = y - ry + 2 * ry * blink;                                   // everything above lidY is covered by the lid
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    if (!inE(X + 0.5, Y + 0.5, r + 0.6, ry + 0.6)) continue;
    const edge = !inE(X + 0.5, Y + 0.5, r - 0.6, ry - 0.6);
    if (Y + 0.5 < lidY) { g.px(X, Y, edge ? out : lid); continue; }
    if (edge) { g.px(X, Y, out); continue; }
    let col;
    if (pupil === "bead") {                                                // dark glossy bead with a faint coloured bottom
      const v = (Y - (y - ry)) / (2 * ry); col = v > 0.72 ? (v - 0.72) * 3.5 > bayer(X, Y) ? iris[3] : iris[1] : iris[0];
    } else {
      const v = (Y - (y - ry)) / (2 * ry), s = v * (iris.length - 2) + 0.2, lo = Math.floor(s);  // vertical gradient, dithered bands
      col = iris[Math.max(1, Math.min(iris.length - 1, s - lo > 0.35 + 0.3 * bayer(X, Y) ? lo + 1 : lo))];
      if (v < 0.24) col = iris[1];                                         // lid shadow band on top
      const px = x + look[0] * r * 0.25, py = y + look[1] * ry * 0.2;
      if (pupil === "slit" ? inE(X + 0.5, Y + 0.5, Math.max(1.6, r * 0.24), ry * 0.66, px, py) : inE(X + 0.5, Y + 0.5, r * 0.5, ry * 0.52, px, py)) col = out;
    }
    g.px(X, Y, col);
  }
  if (blink > 0.02) { for (let X = R(x - r); X <= R(x + r); X++) { const u = (X - x) / r, yy = lidY + (blink > 0.85 ? -2.5 * (1 - u * u) * (blink - 0.85) / 0.15 : 0); if (inE(X + 0.5, yy + 0.5, r + 0.6, ry + 0.6) || blink > 0.95) g.px(X, R(yy), out); } }
  // highlights: a big one upper-left, a small one lower-right (hidden as the lid closes)
  const hx = x - r * 0.38 + look[0] * r * 0.2, hy = y - ry * 0.42 + look[1] * ry * 0.15, hr = Math.max(1.2, r * 0.3);
  if (hy - hr > lidY) for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) if (inE(X + 0.5, Y + 0.5, hr, hr * 1.1, hx, hy)) g.px(X, Y, "#FFFFFF");
  const sx = x + r * 0.36 + look[0] * r * 0.2, sy = y + ry * 0.34;
  if (sy - 1 > lidY) { g.px(R(sx), R(sy), "#FFFFFF"); if (r >= 9) { g.px(R(sx) + 1, R(sy), "#FFFFFF"); g.px(R(sx), R(sy) + 1, "#FFFFFF"); g.px(R(sx) + 1, R(sy) + 1, "#E8E4FF"); } }
}
/** Two eyes at once (mirror pair) with a shared blink and look. */
export function eyes(c, x, y, gap, r, o = {}) { eye(c, x - gap / 2, y, r, o); eye(c, x + gap / 2, y, r, o); }
/** Natural blink curve: blinks for ~0.18 s every `every` seconds (phase offset `ph`), returns 0..1 (continuous, never one frame). */
export function blinkAt(t, every = 3.7, ph = 0) { const p = ((t + ph) % every + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; }
/** Checker-dithered blush oval (the reference's pink cheek dots). */
export function blush(c, x, y, rx, ry, col = BLUSH, a = 1) {
  const g = fade(c, a);
  for (let Y = R(y - ry); Y <= R(y + ry); Y++) for (let X = R(x - rx); X <= R(x + rx); X++) { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; if (d <= 1 && ((X + Y) & 1) === 0 && (d < 0.55 || bayer(X, Y) > d - 0.3)) g.px(X, Y, col); }
}
/** Tiny cat-like "w" mouth centred at x, y. */
export function mouthW(c, x, y, col = "#07060E", w = 3, a = 1) { const g = fade(c, a); for (let i = 0; i <= w; i++) { g.px(R(x - i), R(y + (i === w ? 0 : i >= 1 ? 1 : 0)), col); g.px(R(x + i), R(y + (i === w ? 0 : i >= 1 ? 1 : 0)), col); } g.px(R(x), R(y), col); }
/** Small smile arc of half-width w. open 0..1 opens it into a little "o"/D-mouth with a pink tongue. */
export function smile(c, x, y, w, { col = "#07060E", open = 0, tongue = "#F07090", a = 1 } = {}) {
  const g = fade(c, a), h = Math.max(1, w * 0.45);
  if (open > 0.05) { const oh = Math.max(2, R(h + open * w * 0.8)); for (let Y = 0; Y <= oh; Y++) { const half = R(w * Math.sqrt(Math.max(0, 1 - (Y / (oh + 0.5)) ** 2)) * (Y === 0 ? 1 : 0.92)); for (let X = -half; X <= half; X++) g.px(R(x + X), R(y + Y), Y === 0 || Math.abs(X) === half || Y === oh ? col : Y > oh * 0.55 ? tongue : "#3A0A18"); } return; }
  for (let X = -w; X <= w; X++) { const u = X / w; g.px(R(x + X), R(y + h * (1 - u * u)), col); }
}
/** Little nose: a rounded triangle (cat/dog/bear) of half-width w. */
export function nose(c, x, y, w, col = "#F07090", a = 1) { const g = fade(c, a); for (let j = 0; j <= R(w * 0.9); j++) { const half = Math.max(0, R(w - j * 1.1)); g.rect(R(x - half), R(y + j), half * 2 + 1, 1, j === 0 ? mix(col, "#FFFFFF", 0.35) : col); } }

// ---------------------------------------------------------------- in-world labels
/**
 * Level sign standing in the world (not an overlay): text like "LV 3" on a board whose look fits the habitat.
 * (x, y) = screen point where the post meets the ground (or the anchor of a hanging/floating sign).
 * style: "stone" | "wood" | "plate" | "bubble" | "neon" | "buoy". a dissolves it.
 */
export function sign(c, x, y, text, style = "wood", a = 1, t = 0) {
  if (a <= 0) return; const g = fade(c, a), s = 2, tw = c.measure(MAIN, text, { scale: s }), w = tw + 16, h = 24, bx = R(x - w / 2);
  if (style === "wood") {
    g.rect(R(x) - 2, R(y - 30), 5, 30, "#4A2C18"); g.rect(R(x) - 2, R(y - 30), 2, 30, "#6A4024");
    const by = R(y - 30 - h); g.rrect(bx, by, w, h, "#2E1A10", 2); g.rrect(bx + 1, by + 1, w - 2, h - 2, "#8A5834", 2); g.rect(bx + 2, by + 2, w - 4, 2, "#A87448"); g.rect(bx + 2, by + h / 2, w - 4, 1, "#6A4024");
    g.px(bx + 4, by + 5, "#2E1A10"); g.px(bx + w - 5, by + 5, "#2E1A10");
    g.text(MAIN, text, bx + 8, by + 5, "#2E1A10", { scale: s }); g.text(MAIN, text, bx + 8, by + 4, "#FDF0C8", { scale: s });
  } else if (style === "stone") {
    const by = R(y - h - 6); g.poly([[bx - 4, y], [bx - 2, by + 4], [bx + 6, by - 2], [bx + w - 6, by - 3], [bx + w + 3, by + 5], [bx + w + 5, y]], "#3A4258");
    g.poly([[bx - 1, y - 2], [bx + 1, by + 5], [bx + 7, by + 1], [bx + w - 7, by], [bx + w, by + 6], [bx + w + 2, y - 2]], "#5A6684");
    g.rect(bx + 6, by + 1, w - 14, 2, "#7E8AA8");
    g.text(MAIN, text, bx + 8, by + 7, "#9AA6C4", { scale: s }); g.text(MAIN, text, bx + 8, by + 6, "#1E2234", { scale: s });
  } else if (style === "plate") {
    g.rrect(bx, R(y - h), w, h, "#1C2A44", 2); g.rrect(bx + 1, R(y - h) + 1, w - 2, h - 2, "#3A5A8A", 2); g.rect(bx + 2, R(y - h) + 2, w - 4, 1, "#6A8CC0");
    g.text(MAIN, text, bx + 8, R(y - h) + 5, "#FDFEED", { scale: s });
  } else if (style === "bubble") {
    const r = R(w / 2 + 4), cy = R(y - r); g.ring(R(x), cy, r, "#B8F0FF"); g.ring(R(x), cy, r - 1, "#5AB4D0");
    g.px(R(x - r * 0.5), R(cy - r * 0.55), "#FFFFFF"); g.px(R(x - r * 0.5) + 1, R(cy - r * 0.55), "#FFFFFF"); g.px(R(x - r * 0.6), R(cy - r * 0.45), "#FFFFFF");
    g.text(MAIN, text, R(x - tw / 2), cy - 7, "#E8FCFF", { scale: s });
  } else if (style === "neon") {
    const by = R(y - h), flick = 0.82 + 0.18 * Math.sin(t * 9.1) * Math.sin(t * 3.3);
    g.rrect(bx - 2, by - 2, w + 4, h + 4, "#1A0E2A", 2); g.rframe(bx, by, w, h, mix("#5A1A6A", "#FF5AD8", flick), 2);
    g.text(MAIN, text, bx + 8, by + 6, "#5A1A6A", { scale: s }); g.text(MAIN, text, bx + 8, by + 5, mix("#FF9AE8", "#FFE4FA", flick), { scale: s });
  } else if (style === "buoy") {
    g.line(R(x), R(y), R(x), R(y - 40), "#2A3A4A"); const by = R(y - 40 - h); g.rrect(bx, by, w, h, "#7A1A24", 3); g.rrect(bx + 1, by + 1, w - 2, h - 2, "#D8443C", 3); g.rect(bx + 1, by + 9, w - 2, 6, "#F4EEE0");
    g.text(MAIN, text, bx + 8, by + 5, "#2A0A10", { scale: s });
  }
}
/** Game-style skill pickup: "+SWIM" rises from (x, y) and dissolves; k = 0..1 progress over its ~1.6 s life. */
export function pickup(c, x, y, text, k, col = C.Y) {
  if (k <= 0 || k >= 1) return; const a = Math.min(sm(k, 0, 0.18), 1 - sm(k, 0.75, 1)), yy = R(y - 26 * ease(Math.min(1, k * 1.6))), s = 3;
  const w = c.measure(MAIN, text, { scale: s }), x0 = R(x - w / 2), g = fade(c, a);
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, text, x0 + dx, yy + dy, C.O, { scale: s });
  g.text(MAIN, text, x0, yy, col, { scale: s });
  // sparkle pixels around the word
  for (let i = 0; i < 6; i++) { const ang = i * 1.047 + k * 3, rr = w * 0.55 + 8 * k; const px = R(x + Math.cos(ang) * rr), py = R(yy + 10 + Math.sin(ang) * 18); if (rnd(i + 7) < 0.8) { g.px(px, py, "#FFFFFF"); g.px(px + 1, py, col); } }
}
/** Panel with lines of pixel text (first line in `col`, the rest ivory); used for counters like "500,000,000". */
export function panel(c, x, y, w, h, a = 1, edge = C.p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(C.CARD, "#1D1430", (j - y) / h)); }
export function tag(c, lines, cx, y, a, col = C.Y, scale = 2) {
  if (a <= 0) return null; const tw = (s) => c.measure(MAIN, s, { scale }), w = Math.max(...lines.map(tw)) + 20, h = lines.length * (8 * scale + 4) + 10, x = R(Math.max(12, Math.min(540 - 12 - w, cx - w / 2)));
  panel(c, x, R(y), w, h, a, col); lines.forEach((l, i) => fade(c, a).text(MAIN, l, x + 10, R(y) + 7 + i * (8 * scale + 4), i ? C.IV : col, { scale })); return { x, w, h };
}
export { MAIN, TINY, mix, bayer, fade };
