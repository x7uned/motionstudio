// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/forest.mjs (static layers: build, tree, branch, fern,
// mushroom, fallenLog, strata) + the needed parts of meadow-kit.mjs (MaskCanvas, Layer, flower, stem, tuft, leafBall, GRASS,
// paintHills, grassAt). Changes: the film's crow/hero/actors are not copied; the layers are built over a wider world strip
// (XA..XB) so side camera moves stay filled, the seam fades to the yard/bay (floor shading, sandy bank, path fade, hill
// envelope, far-forest taper) are removed; paintHills takes a constant envelope; imports point to catalog libs.
import { Canvas, hex, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm, lerp } from "./cute.mjs";

const R = Math.round;
export const RX0 = 2160, RX1 = 2700, XA = RX0 - 180, XB = RX1 + 180, LAND = -20;
const LOG = { x0: 2296, x1: 2584, cy: -75, r: 55 };
const HOLE = [2512, -64];
/** Canvas that also records which pixels were painted (the layer's alpha). */
export class MaskCanvas extends Canvas {
  constructor(w, h) { super(w, h, "#000000"); this.m = new Uint8Array(w * h); }
  px(x, y, c) {
    x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), i = y * this.w + x; this.d[i * 3] = r; this.d[i * 3 + 1] = g; this.d[i * 3 + 2] = b;
    if (this.m) this.m[i] = 1;
  }
  /** Blend an already painted pixel toward colour col by k (keeps the mask). */
  blend(x, y, col, k) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h || !this.m[y * this.w + x]) return; this.px(x, y, mix(this.get(x, y), col, k)); }
}

/** World-space cached layer: draw with world coordinates through `g` (offset applied), blit each frame. */
export class Layer {
  constructor(wx0, wy0, wx1, wy1) {
    this.wx0 = wx0; this.wy0 = wy0; this.c = new MaskCanvas(wx1 - wx0, wy1 - wy0);
    const L = this, c = this.c;
    // drawing view taking WORLD coordinates: every Canvas method (rect, poly, line, text…) routes through px/get
    const g = Object.create(c);
    g.px = (x, y, col) => c.px(x - L.wx0, y - L.wy0, col);
    g.get = (x, y) => c.get(x - L.wx0, y - L.wy0);
    g.blend = (x, y, col, k) => c.blend(x - L.wx0, y - L.wy0, col, k);
    g.has = (x, y) => { x = Math.floor(x - L.wx0); y = Math.floor(y - L.wy0); return x >= 0 && y >= 0 && x < c.w && y < c.h && c.m[y * c.w + x] === 1; };
    this.g = g;
  }
  /** Copy the painted pixels into the frame canvas (screen = V.X/V.Y of world). */
  blit(dst, V) {
    const src = this.c, W = src.w, ox = R(V.X(this.wx0)), oy = R(V.Y(this.wy0));
    const y0 = Math.max(0, oy), y1 = Math.min(dst.h, oy + src.h), x0 = Math.max(0, ox), x1 = Math.min(dst.w, ox + W);
    if (x1 <= x0 || y1 <= y0) return;
    const sd = src.d, sm = src.m, dd = dst.d, DW = dst.w;
    for (let y = y0; y < y1; y++) {
      let li = (y - oy) * W + (x0 - ox), ci = y * DW + x0;
      for (let x = x0; x < x1; x++, li++, ci++) if (sm[li]) { const a = li * 3, b = ci * 3; dd[b] = sd[a]; dd[b + 1] = sd[a + 1]; dd[b + 2] = sd[a + 2]; }
    }
  }
}


/** Small 5-petal flower (s = petal radius 1..4) at x, y (centre), petals col, centre eye. */
export function flower(g, x, y, s, col, eye = "#F8D040", dark = null) {
  x = R(x); y = R(y);
  if (s <= 1) { g.px(x, y, col); g.px(x - 1, y, col); g.px(x + 1, y, col); g.px(x, y - 1, col); g.px(x, y + 1, dark ?? col); g.px(x, y, eye); return; }
  const d = dark ?? mix(col, "#000000", 0.25);
  for (let k = 0; k < 5; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5, px = x + Math.cos(a) * s * 0.95, py = y + Math.sin(a) * s * 0.95, r = s * 0.62;
    for (let Y = R(py - r); Y <= R(py + r); Y++) for (let X = R(px - r); X <= R(px + r); X++) if ((X - px) ** 2 + (Y - py) ** 2 <= r * r + 0.4) g.px(X, Y, Y > y + s * 0.3 ? d : col);
  }
  const er = Math.max(1, s * 0.42);
  for (let Y = R(y - er); Y <= R(y + er); Y++) for (let X = R(x - er); X <= R(x + er); X++) if ((X - x) ** 2 + (Y - y) ** 2 <= er * er + 0.3) g.px(X, Y, eye);
  if (s >= 3) g.px(x - 1, y - 1, mix(eye, "#FFFFFF", 0.5));
}
/** Stem from (x, y0) down to (x + lean, y1), with an optional leaf. */
export function stem(g, x, y0, y1, col, lean = 0, leaf = true) {
  const n = Math.max(1, y1 - y0);
  for (let i = 0; i <= n; i++) { const k = i / n; g.px(R(x + lean * (1 - k) * (1 - k)), y0 + i, col); }
  if (leaf && n > 8) { const ly = R(y0 + n * 0.6), lx = R(x + lean * 0.16); g.px(lx + 1, ly, col); g.px(lx + 2, ly - 1, col); g.px(lx + 3, ly - 1, col); g.px(lx - 1, ly + 2, col); g.px(lx - 2, ly + 1, col); }
}
/** Grass tuft of n blades (h tall) at the ground point x, y. cols = [dark, mid, light]. sway shifts the tips. */
export function tuft(g, x, y, h, n, cols, seed = 0, sway = 0) {
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway;
    const col = cols[Math.min(cols.length - 1, i % cols.length)];
    for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.65 ? cols[cols.length - 1] : col); }
  }
}

/** Leafy cluster ball (canopy/hedge chunk): dithered tone bands lit from the upper left, bumpy outline. */
export function leafBall(g, cx, cy, r, ramp, seed = 0, o = {}) {
  const out = o.outline ?? ramp[0], bumps = o.bumps ?? 9, amp = o.amp ?? 0.12;
  const rad = (a) => r * (1 + amp * Math.sin(a * bumps + seed) + amp * 0.5 * Math.sin(a * (bumps * 2 + 1) + seed * 2.3));
  for (let Y = R(cy - r * 1.25); Y <= R(cy + r * 1.25); Y++) for (let X = R(cx - r * 1.25); X <= R(cx + r * 1.25); X++) {
    const dx = X - cx, dy = Y - cy, d = Math.hypot(dx, dy), a = Math.atan2(dy, dx), rr = rad(a);
    if (d > rr) continue;
    if (d > rr - 1.1) { g.px(X, Y, out); continue; }
    // light from upper-left: v in 0..1
    const lx = (-dx * 0.6 - dy * 0.8) / r, v = 0.5 + lx * 0.45 - (d / rr) * 0.18 + (o.lift ?? 0);
    const n = ramp.length - 1, s = Math.max(1, Math.min(n, v * n + (rnd((X * 31 + Y * 17) ^ seed) - 0.5) * 0.9)), lo = Math.floor(s);
    g.px(X, Y, ramp[Math.min(n, s - lo > bayer(X, Y) ? lo + 1 : lo)]);
  }
}

export const GRASS = ["#B4E07A", "#A2D86E", "#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A", "#36713A", "#2C6234", "#24542E"];
export const HILL_FAR = ["#9CCBB0", "#AAD6B6", "#BBE2BE", "#CDEBC8"], HILL_NEAR = ["#6FB06A", "#7EBE72", "#90CC7C", "#A6DA8C"];


const hillFar = (x) => 70 + 26 * Math.sin(x * 0.0105 + 0.7) + 14 * Math.sin(x * 0.031 + 2.1);
const hillNear = (x) => 34 + 14 * Math.sin(x * 0.017 + 4.0) + 8 * Math.sin(x * 0.043);
export function paintHills(g, x0, x1, land, far = HILL_FAR, near = HILL_NEAR) {
  for (let x = x0; x < x1; x++) {
    const hf = hillFar(x), hn = hillNear(x);
    for (let y = Math.round(land - hf); y < land; y++) { const k = (y - (land - hf)) / Math.max(1, hf); const s = k < 0.06 ? 3 : k < 0.3 ? ((k - 0.06) / 0.24 > bayer(x, y) ? 2 : 3) : k < 0.7 ? 2 - ((k - 0.3) / 0.4 > bayer(x, y) ? 1 : 0) : 1; g.px(x, y, far[s]); }
    for (let y = Math.round(land - hn); y < land; y++) { const k = (y - (land - hn)) / Math.max(1, hn); const s = k < 0.08 ? 3 : k < 0.35 ? 2 : k < 0.75 ? ((k - 0.35) / 0.4 > bayer(x, y) ? 1 : 2) : 0; g.px(x, y, near[s]); }
  }
}
/** Ground ramp index by depth below the ground line (perspective: narrow bands near the horizon). `shift` darkens. */
export function grassIdx(d, shift = 0) { return Math.min(GRASS.length - 1.001, Math.sqrt(Math.max(0, d) / 330) * 6.6 + shift); }
export function grassAt(x, y, d, shift = 0) { const v = grassIdx(d, shift), lo = Math.floor(v), fr = v - lo; return GRASS[Math.min(GRASS.length - 1, fr > 0.5 + 0.45 * (bayer(x, y) - 0.5) ? lo + 1 : lo)]; }

const BARK = ["#1E120C", "#3A2416", "#583822", "#74502E", "#906840", "#AA8456", "#C4A274", "#DCC29A"];
const CANOPY = ["#0E2A16", "#163C1E", "#1F5028", "#2A6632", "#387C3C", "#4A9446", "#64AC54", "#88C46C"];
const FARF = ["#5E9A86", "#70AA92", "#84BAA0", "#9ACAB0"], MIDF = ["#2E6A50", "#3A7C5A", "#4A8E64", "#5EA070"];
const FERN = ["#163C1E", "#22562A", "#2E7034", "#3E8A40", "#56A44E", "#76BC62"];
const CROW = ["#040308", "#08071A", "#0E0C22", "#161430", "#201E44", "#2C2C5E", "#3E4488", "#5E66B8"];
const SHEEN = "#8A92E4", BEAK = ["#0C0A12", "#1C1A26", "#2C2A3A", "#3E3C50", "#545268", "#6E6C84", "#8C8AA2", "#ACAAC0"];
const GRUB = ["#6A4A2A", "#B49464", "#E2CC9C", "#F6E8C6", "#FFF8E4"];

let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(XA, -660, XB, 840); FRONT = new Layer(XA, -160, XB, 840);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, XA, XB, LAND);
  // far forest silhouettes behind the clearing (kept low in the middle so the sun disc stays free)
  const env = (x) => 1 - 0.55 * Math.exp(-(((x - 2430) / 110) ** 2));
  for (const [layer, ramp, base, amp, seed] of [[0, FARF, 150, 70, 3], [1, MIDF, 96, 56, 9]]) {
    for (let i = 0; i < 50; i++) {
      const x = XA + 12 + i * 19 + rnd(i * 7 + seed) * 10, h = (base + rnd(i * 13 + seed) * amp) * env(x), w = 16 + rnd(i * 5 + seed) * 14, cone = rnd(i * 3 + seed) < 0.45;
      if (h < 30) continue; const top = LAND - h;
      if (cone) { for (let y = R(top); y < LAND; y++) { const k = (y - top) / h, half = w * 0.25 + k * w; for (let X = R(x - half); X <= R(x + half); X++) { if (Math.abs(X - x) > half - 1 || (y - top) % 9 === 0 && Math.abs(X - x) > half * 0.6) g.px(X, y, ramp[1]); else g.px(X, y, ramp[k < 0.25 ? 3 : (X - x) < 0 ? 2 : 1]); } } }
      else { g.rect(R(x - 2), R(top + w), 5, R(h - w), ramp[0]); leafBall(g, x, top + w * 0.8, w * 0.9, [ramp[0], ramp[1], ramp[2], ramp[3]], i + seed * 10, { amp: 0.1, bumps: 6, outline: ramp[0] }); }
    }
  }
  // forest floor: shared ramp, darker inside the forest (fades back at both seams), moss and leaf litter
  for (let y = LAND; y < 840; y++) for (let x = XA; x < XB; x++) {
    const d = y - LAND, w = 1, bank = 0;
    let col = grassAt(x, y, d, 1.6 * w);
    if (bank > bayer(x, y) * 0.98 + 0.01) col = d < 1.5 ? "#B0D46E" : d < 4 ? "#6EA844" : d < 16 + Math.sin(x * 0.3) * 2 ? (d < 6 ? "#7A5232" : "#6A4628") : strata(x, y, d);
    g.px(x, y, col);
  }
  g.rect(XA, LAND, XB - XA, 1, "#8ABE6A");
  for (let i = 0; i < 5200; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 501), 1.4) * 850), x = R(XA + rnd(i * 3 + 502) * (XB - XA - 120)), d = y - LAND, h = d < 50 ? 1 : d < 180 ? 2 : 3, r = rnd(i * 5 + 503);
    const col = r < 0.4 ? mix(g.get(x, y), "#0E2A16", 0.3) : r < 0.75 ? mix(g.get(x, y), "#C8E890", 0.22) : r < 0.88 ? "#A0602A" : "#C88A3A";
    for (let j = 0; j < (r < 0.75 ? h : 1); j++) g.px(x, y - j, col); if (r >= 0.75 && d > 60) g.px(x + 1, y, col);
  }
  // the dirt path (in front of the log), widening toward the viewer, sandy toward the bay
  const pathC = (x) => 30 + Math.sin((x - RX0) * 0.012) * 8, pathW = () => 14;
  for (let x = XA; x < XB; x++) { const c0 = pathC(x), w = pathW(x), fadeP = 1; for (let y = R(c0 - w); y <= R(c0 + w); y++) { const e = Math.abs(y - c0) / w, sand = 0; if (e > 1 || fadeP <= bayer(x, y)) continue; let col = e > 0.82 ? "#6A4A2A" : y < c0 - w * 0.3 ? "#B48A58" : "#A07648"; if (sand > 0) col = mix(col, "#E2D0A0", sand); if (e <= 0.82 && rnd(x * 31 + y * 7) < 0.06) col = "#7A5634"; if (e > 0.82 && bayer(x, y) > 0.6) col = mix(g.get(x, y), "#4A3420", 0.6); g.px(x, y, col); } }
  // dappled light on the floor
  for (let i = 0; i < 44; i++) { const cx = XA + rnd(i * 11 + 601) * (XB - XA - 150), cy = LAND + 8 + rnd(i * 11 + 602) * 260, rx = 8 + rnd(i * 3) * 18, ry = rx * (0.2 + (cy - LAND) / 700); for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) { const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (d < 1 && (1 - d) * 0.9 > bayer(X, Y)) g.blend(X, Y, "#E8F4A0", 0.32); } }
  // big trees at both sides (trunks, roots, bark) + their canopies; the right one has a low branch for the crow
  tree(g, 2196, 34, 1); tree(g, 2640, 30, 2);
  branch(g, 2618, -196, 2532, -186);
  // canopy masses (top corners), dappled with light leaves, leaving the clearing open
  for (const [x, y, r, s] of [[2236, -640, 70, 1], [2262, -592, 62, 2], [2314, -642, 56, 3], [2214, -520, 52, 4], [2256, -500, 44, 5], [2348, -604, 44, 6], [2198, -440, 36, 7], [2222, -420, 32, 8],
    [2652, -640, 70, 11], [2600, -600, 62, 12], [2540, -642, 56, 13], [2672, -520, 52, 14], [2610, -490, 44, 15], [2512, -610, 42, 16], [2690, -440, 38, 17], [2640, -415, 32, 18]]) leafBall(g, x, y, r, CANOPY, s, { amp: 0.13, bumps: 9 });
  for (let i = 0; i < 260; i++) { const x = R(XA + rnd(i * 7 + 701) * (XB - XA)), _ = 0, y = R(-660 + rnd(i * 7 + 702) * 280); if (g.has(x, y) && g.get(x, y)[1] > 60 && rnd(i) < 0.6) { g.px(x, y, "#9ED27A"); if (rnd(i * 3) < 0.5) g.px(x + 1, y, "#7EBE64"); } }
  // ferns and mushrooms around the roots and the log, bluebells
  for (const [x, y, s, fl] of [[2236, -16, 1, 1], [2262, -10, 0.8, -1], [2176, -8, 0.9, 1], [2596, -14, 1, -1], [2620, -6, 0.85, 1], [2560, -12, 0.7, 1], [2318, -14, 0.7, -1], [2470, -18, 0.6, 1]]) fern(g, x, y, s, fl);
  for (const [x, y, s, red] of [[2246, -18, 1.1, 1], [2258, -16, 0.8, 1], [2600, -20, 1, 1], [2590, -18, 0.7, 0], [2290, -20, 0.9, 0], [2340, -126, 0.6, 1], [2552, -122, 0.7, 0], [2566, -124, 0.5, 0]]) mushroom(g, x, y, s, red);
  for (let i = 0; i < 38; i++) { const x = R(XA + 20 + rnd(i * 13 + 801) * (XB - XA - 120)), y = R(LAND + 46 + rnd(i * 13 + 802) * 200); if (Math.abs(y - LAND - 30) < 22) continue; stem(g, x, y - 6, y, "#2E6A30", 0, false); flower(g, x, y - 7, 2, rnd(i) < 0.5 ? "#8A9CF0" : "#B48AE8", "#E8E0FF"); }
  fallenLog(g);
  // FRONT: big foreground ferns in the bottom corners, tufts
  for (const [x, y, s, fl] of [[2176, 250, 2.2, 1], [2640, 250, 2.0, -1], [2560, 306, 1.5, -1], [2250, 296, 1.5, 1]]) fern(f, x, y, s, fl);
  for (let i = 0; i < 54; i++) { const x = R(XA + rnd(i * 13 + 901) * (XB - XA - 70)), y = R(LAND + 250 + rnd(i * 13 + 905) * 330); tuft(f, x, y, 10 + rnd(i) * 12, 3 + Math.floor(rnd(i * 3) * 3), ["#163C1E", "#22562A", "#3A7A3A"], i * 5 + 900, (rnd(i * 9) - 0.5) * 4); }
}

function tree(g, x, w, seed) {
  const top = -700, O = BARK[0];
  for (let y = top; y < LAND + 2; y++) {
    const flare = Math.max(0, (y - (LAND - 46)) / 46), half = w / 2 + flare * flare * 22, sway = Math.sin(y * 0.012 + seed) * 3;
    for (let X = R(x - half + sway); X <= R(x + half + sway); X++) {
      const u = (X - (x + sway)) / half, edge = Math.abs(u) > 0.94; let s = edge ? 0 : 4 - (u > 0.35 ? 1 : 0) - (u > 0.7 ? 1 : 0) + (u < -0.5 ? 1 : 0);
      const groove = Math.sin(X * 0.9 + Math.sin(y * 0.05 + seed) * 2.2) > 0.82; if (!edge && groove) s -= 2;
      if (!edge && rnd(X * 13 + y * 7 + seed) < 0.03) s += 1;
      g.px(X, y, BARK[Math.max(0, Math.min(6, s))]);
    }
  }
  // moss on the shaded side near the base
  for (let i = 0; i < 80; i++) { const y = R(LAND - 6 - rnd(i * 3 + seed) * 120), X = R(x + w * 0.2 + rnd(i * 5 + seed) * w * 0.35); if (g.has(X, y)) g.px(X, y, rnd(i) < 0.5 ? "#4A8A3A" : "#6AA84A"); }
  g.rect(x - w / 2 - 22, LAND, w + 44, 2, "#2A3A1A"); void O;
}
function branch(g, x0, y0, x1, y1) {
  for (let i = 0; i <= 90; i++) { const k = i / 90, x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 6, r = lerp(7, 3, k); for (let d = -r; d <= r; d++) g.px(R(x), R(y + d), Math.abs(d) >= r - 0.6 ? BARK[0] : d < -r * 0.3 ? BARK[5] : BARK[3]); }
  leafBall(g, x1 - 4, y1 - 10, 12, CANOPY, 41, { amp: 0.15, bumps: 7 }); leafBall(g, x1 + 16, y1 - 18, 9, CANOPY, 42, { amp: 0.15, bumps: 7 });
}
function fern(g, x, y, s, flip) {
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI / 2 + (k - 3) * 0.42 * flip, len = (28 + (3 - Math.abs(k - 3)) * 10) * s, droop = 0.9;
    let px = x, py = y, a = ang; const n = R(len / 2);
    for (let i = 0; i < n; i++) {
      a += (ang < -Math.PI / 2 ? -1 : 1) * 0.035 * droop * (k === 3 ? 0.3 : 1); px += Math.cos(a) * 2; py += Math.sin(a) * 2;
      g.px(R(px), R(py), FERN[1]);
      const leaf = Math.max(1, (1 - i / n) * 6 * s);
      for (let j = 1; j <= leaf; j++) { const col = j > leaf - 1 ? FERN[2] : FERN[3 + (k % 2)]; g.px(R(px + Math.cos(a - 1.2) * j), R(py + Math.sin(a - 1.2) * j), col); g.px(R(px + Math.cos(a + 1.2) * j), R(py + Math.sin(a + 1.2) * j), j > leaf - 1 ? FERN[2] : FERN[4]); }
    }
  }
}
function mushroom(g, x, y, s, red) {
  const h = R(10 * s), cw = R(9 * s), ch = R(6 * s);
  g.rect(x - R(2 * s), y - h, R(4 * s) + 1, h, "#5A4A3A"); g.rect(x - R(2 * s) + 1, y - h, Math.max(1, R(4 * s) - 1), h, "#F4ECDC");
  for (let Y = -ch; Y <= 0; Y++) for (let X = -cw; X <= cw; X++) { const d = (X / cw) ** 2 + (Y / ch) ** 2; if (d > 1) continue; const edge = d > 0.78 && (Y === 0 || d > 0.85); g.px(x + X, y - h + Y, edge ? (red ? "#5A0A12" : "#3A2414") : red ? (Y < -ch * 0.5 && X < 0 ? "#F45A4A" : "#D8322E") : (Y < -ch * 0.5 && X < 0 ? "#C8946A" : "#A87448")); }
  if (red) for (const [dx, dy] of [[-0.5, -0.6], [0.3, -0.75], [0.6, -0.3], [-0.15, -0.3]]) { const X = R(x + dx * cw), Y = R(y - h + dy * ch); g.px(X, Y, "#FFFFFF"); if (s > 0.8) g.px(X + 1, Y, "#FFFFFF"); }
}
function fallenLog(g) {
  const { x0, x1, cy, r } = LOG;
  for (let x = x0; x < x1; x++) for (let y = cy - r; y <= cy + r; y++) {
    const v = (y - cy) / r; if (Math.abs(v) > 1) continue;
    const edge = Math.abs(v) > 0.96 || x === x0 || x === x1 - 1, light = -v * 0.9 + 0.2;
    let s = edge ? 0 : 3 + light * 1.6 + (Math.sin(x * 0.55 + Math.sin(y * 0.09) * 2.5) > 0.86 ? -1.6 : 0) + (rnd(x * 7 + y * 13) < 0.04 ? 1 : 0);
    s = Math.max(0, Math.min(7, s)); const fl = Math.floor(s); g.px(x, y, BARK[s - fl > bayer(x, y) ? Math.min(7, fl + 1) : fl]);
  }
  // cut end (left) with rings, jagged broken end (right)
  for (let y = cy - r; y <= cy + r; y++) for (let x = x0 - 14; x <= x0 + 14; x++) { const d = ((x - x0) / 14) ** 2 + ((y - cy) / r) ** 2; if (d > 1) continue; const q = Math.sqrt(d); g.px(x, y, d > 0.86 ? BARK[1] : (Math.floor(q * 7) % 2 ? "#C8A070" : "#E0BC88")); }
  g.px(x0, cy, "#7A5634"); g.px(x0 + 1, cy, "#7A5634");
  for (let y = cy - r; y <= cy + r; y++) { const d = ((y - cy) / r) ** 2; for (let x = x1 - 1; x <= x1 + R(10 * Math.sqrt(Math.max(0, 1 - d))); x++) { const e = ((x - x1 + 1) / 11) ** 2 + d; g.px(x, y, e > 0.82 ? BARK[1] : Math.floor(Math.sqrt(e) * 6) % 2 ? "#B8905E" : "#D0AA78"); } }
  // moss on top, a few leaves
  for (let x = x0 + 4; x < x1 - 4; x++) { const th = 3 + Math.sin(x * 0.07) * 2 + Math.sin(x * 0.21) * 1.5; for (let j = 0; j < th; j++) { const y = cy - r + 1 + j + R(Math.max(0, Math.abs(x - (x0 + x1) / 2) - 100) * 0.02); g.px(x, y, j === 0 ? "#86C25A" : rnd(x * 3 + j) < 0.5 ? "#5A9A3E" : "#4A8636"); } }
  // the grub hole on the front face
  const [hx, hy] = HOLE; for (let Y = -9; Y <= 9; Y++) for (let X = -10; X <= 10; X++) { const d = (X / 10) ** 2 + (Y / 9) ** 2; if (d <= 1) g.px(hx + X, hy + Y, d > 0.7 ? (Y < 0 ? "#3A2416" : "#AA8456") : "#140A06"); }
  // soft contact shadow under the log
  for (let x = x0 - 10; x < x1 + 14; x++) for (let y = LAND; y < LAND + 7; y++) g.blend(x, y, "#0E2A16", 0.45 * (1 - (y - LAND) / 7));
}

const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
function strata(wx, wy, d) {
  const wv = Math.sin(wx * 0.031) * 5 + Math.sin(wx * 0.11) * 2, v = (wy + wv + 400) / 22, band = Math.floor(v), f = v - band;
  let col = STRATA[band % STRATA.length]; if (f < 0.08 && bayer(wx, wy) > 0.4) col = mix(col, "#7A5636", 0.22);
  if (wy > 120) col = mix(col, "#8A6440", Math.min(0.45, (wy - 120) / 700));
  return col;
}

export const buildForest = () => { build(); return { BACK, FRONT }; };
