// catalog-v1 copy (2026-10-26) of work/pixel-lab/deadliest/film/levels/ocean-shark.mjs (drawFrontShark, frontSprite,
// finSprite, frontFace, mouth, drop) with the Layer and spriteCache of levels/ocean-kit.mjs.
// changes: imports point at cute.mjs / raster.mjs; fin angles are quantised to 0.1 (the film used whole units: a one-unit
// step re-cut the whole fin in alternate frames); the drawing is resampled to the item scale `o.s` (nearest neighbour,
// written through dissolve views), so the shark grows with the camera zoom; the underwater options (below/tint/k/wob)
// are dropped (a prop stands in air); the happy arcs crossfade with the round eyes instead of switching at happy 0.5;
// the mouth's lower lip and interior fade in from a closed mouth instead of popping at open 0.05; the happy-driven lid
// stops at 0.9 (the eye code pops its lid line above 0.95).
import { Canvas, hex, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { blob, eye, blush, smooth, fade, clamp01, lerp } from "./cute.mjs";

const R = Math.round;
export const GREY = ["#0B111C", "#172130", "#243346", "#34485E", "#486079", "#5F7A95", "#7E98B2", "#A6BCD0"];
export const BELLY = ["#283040", "#4A566C", "#76849A", "#9EABBE", "#C0CAD8", "#D9E1EA", "#EDF2F7", "#FFFFFF"];
export const EYE = ["#04060C", "#0A0F1E", "#121A30", "#1C2846", "#28385E", "#384C78", "#4E6494", "#6C84B2"];
const OUT = "#0A0E18", LIT = "#C8DCEC";

// ---------------------------------------------------------------- masked offscreen layer (ocean-kit Layer, water removed)
class Layer {
  constructor(w, h) {
    this.w = w; this.h = h; this.c = new Canvas(w, h, "#000000"); this.m = new Uint8Array(w * h);
    const c = this.c, m = this.m, base = Canvas.prototype.px;
    c.px = function (x, y, col) { x = Math.floor(x); y = Math.floor(y); if (!col || x < 0 || y < 0 || x >= w || y >= h) return; base.call(c, x, y, col); m[y * w + x] = 1; };
    c.has = (x, y) => { x = Math.floor(x); y = Math.floor(y); return x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1; };
    c._mask = m;                                  // a Layer blitted into another Layer marks the destination mask too
    this.g = c;
  }
  /** Unscaled copy of covered pixels with anchor (ox, oy) at (x, y), into a plain canvas (used to compose sprites). */
  blit(c, x, y, ox, oy) {
    const W = this.w, H = this.h, s = this.c.d, m = this.m, d = c.d, CW = c.w, dm = c._mask;
    const top = R(y - oy), left = R(x - ox);
    const ya = Math.max(0, top), yb = Math.min(c.h, top + H), xa = Math.max(0, left), xb = Math.min(CW, left + W);
    for (let Y = ya; Y < yb; Y++) for (let X = xa; X < xb; X++) {
      const li = (Y - top) * W + (X - left); if (!m[li]) continue;
      const q = li * 3, p = (Y * CW + X) * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; if (dm) dm[Y * CW + X] = 1;
    }
  }
}

/** Memoised sprite: key → { layer, ox, oy } with (ox, oy) the anchor inside the layer. Small LRU. */
function spriteCache(max = 64) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h); paint(L.g, ox, oy, L);
    s = { layer: L, ox, oy };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}

/**
 * Scaled copy of a layer onto c: anchor (ax, ay) on screen, anchor (ox, oy) in the layer, scale S (1 = native pixels).
 * Nearest-neighbour sampling; every write goes through c.px when c is a dissolve view (engine enter/exit).
 */
function blitScaled(src, c, ax, ay, ox, oy, S) {
  const W = src.w, H = src.h, s = src.c.d, m = src.m, CW = c.w, view = Object.prototype.hasOwnProperty.call(c, "px");
  const d = c.d, dm = c._mask;
  const xa = Math.max(0, Math.floor(ax - ox * S)), xb = Math.min(CW, Math.ceil(ax + (W - ox) * S));
  const ya = Math.max(0, Math.floor(ay - oy * S)), yb = Math.min(c.h, Math.ceil(ay + (H - oy) * S));
  for (let Y = ya; Y < yb; Y++) {
    const ly = Math.floor(oy + (Y + 0.5 - ay) / S); if (ly < 0 || ly >= H) continue;
    for (let X = xa; X < xb; X++) {
      const lx = Math.floor(ox + (X + 0.5 - ax) / S); if (lx < 0 || lx >= W) continue;
      const li = ly * W + lx; if (!m[li]) continue;
      const q = li * 3;
      if (view) { c.px(X, Y, [s[q], s[q + 1], s[q + 2]]); continue; }
      const p = (Y * CW + X) * 3; d[p] = s[q]; d[p + 1] = s[q + 1]; d[p + 2] = s[q + 2]; if (dm) dm[Y * CW + X] = 1;
    }
  }
}

// ---------------------------------------------------------------- the front shark (source: ocean-shark.mjs)
const SPR = spriteCache(80);
export const FRONT = { W: 236, H: 660, OX: 118, OY: 168, FIN_TIP: [6, -150], EYES: 84, EYE_Y: -12 };
const FRONT_BODY = [[0, -88], [32, -84], [60, -70], [82, -46], [96, -14], [102, 22], [102, 58], [98, 92], [92, 130], [82, 176], [68, 226], [52, 272], [36, 312], [22, 340], [14, 352],
  [-14, 352], [-22, 340], [-36, 312], [-52, 272], [-68, 226], [-82, 176], [-92, 130], [-98, 92], [-102, 58], [-102, 22], [-96, -14], [-82, -46], [-60, -70], [-32, -84]];

function frontSprite() {
  return SPR("front", FRONT.W, FRONT.H, FRONT.OX, FRONT.OY, (g, ox, oy, L) => {
    const T = (pts) => pts.map(([x, y]) => [x + ox, y + oy]);
    // dorsal fin poking up behind the head (cute front-view convention): the classic curved shark-fin silhouette
    blob(g, [T(smooth([[-28, -66], [-18, -96], [-4, -124], [12, -146], [18, -147], [17, -132], [16, -112], [20, -90], [28, -66]], new Set([3, 4]), 4))], { ramp: GREY, thick: 10, base: 3.0, gain: 2.0, outline: OUT, litOutline: LIT });
    // tail: a crescent far below, seen at an angle
    blob(g, [T(smooth([[-8, 344], [-28, 362], [-50, 390], [-46, 396], [-20, 380], [0, 372], [20, 380], [46, 396], [50, 390], [28, 362], [8, 344]], new Set([3, 4, 7, 8]), 3))], { ramp: GREY, thick: 6, base: 3.0, outline: OUT });
    // the body: a big round head flowing into the chubby body hanging below
    blob(g, [T(smooth(FRONT_BODY, new Set(), 4))], { ramp: GREY, thick: 54, base: 2.4, gain: 3.0, slope: 0.5, outline: OUT, litOutline: LIT, rimLit: 0.9 });
    // white belly bib: a gentle arc under the eyes, then down the whole front with a slim grey rim at the sides
    const idx = new Map(GREY.map((c, i) => [hex(c).join(","), i]));
    for (let Y = oy - 10; Y < L.h; Y++) {
      let x0 = -1, x1 = -1; for (let X = 0; X < L.w; X++) if (L.m[Y * L.w + X]) { if (x0 < 0) x0 = X; x1 = X; }
      if (x0 < 0) continue;
      const half = (x1 - x0) / 2, yy = Y - oy, rim = half * 0.16 + 4 + (yy > 40 ? 1.2 * Math.sin(yy * 0.9) : 0);
      for (let X = x0 + 1; X < x1; X++) {
        const x = X - ox, u = Math.min(1, Math.abs(x) / 96), top = 4 + 30 * u * u + (u > 0.8 ? (u - 0.8) * 60 : 0);
        if (yy < top || Math.abs(x) > half - rim) continue;
        const p = (Y * L.w + X) * 3, i = idx.get(`${L.c.d[p]},${L.c.d[p + 1]},${L.c.d[p + 2]}`); if (i === undefined || i === 0) continue;
        g.px(X, Y, BELLY[Math.min(7, i + 1)]);
      }
    }
    // gill slits on both sides, at the throat
    for (const sd of [-1, 1]) for (const gy of [58, 72, 86]) for (let k = -9; k <= 9; k++) { const x = R(ox + sd * (88 - (k * k) / 26 - (gy - 72) * 0.06)), y = R(oy + gy + k * 0.45); if (L.m[y * L.w + x]) { g.px(x, y, GREY[1]); g.px(x - sd, y, GREY[1]); g.px(x - 2 * sd, y + 1, GREY[5]); } }
    // nostrils on the snout and a wet sheen on top of the head
    for (const sd of [-1, 1]) for (let k = 0; k < 5; k++) g.px(ox + sd * (11 + k), oy - 52 + (k > 2 ? 1 : 0) + (k > 3 ? 1 : 0), OUT);
    for (let k = -22; k <= 14; k++) { const yy = R(oy - 78 + (k * k) / 60); if ((k & 3) !== 3 && L.m[yy * L.w + ox + k - 16]) g.px(ox + k - 16, yy, GREY[7]); }
  });
}

function finSprite(sd, q) {
  return SPR(`fin|${sd}|${q}`, 240, 240, 120, 120, (g, ox, oy) => {
    const ang = 0.62 + q * 0.05, cs = Math.cos(ang), sn = Math.sin(ang);
    const P = (u, v) => [ox + sd * (u * cs - v * sn), oy + u * sn + v * cs];        // u along the fin, v across (v > 0 = trailing side)
    const pts = [P(-6, -18), P(30, -16), P(62, -8), P(88, 0), P(96, 4), P(90, 10), P(62, 18), P(30, 22), P(-6, 22)];
    blob(g, [smooth(pts, new Set([3, 4, 5]), 4)], { ramp: GREY, thick: 10, base: 3.0, gain: 2.0, outline: OUT, litOutline: LIT });
    for (let u = 6; u < 86; u++) { const [x, y] = P(u, 14 - u * 0.11); if (g.has(R(x), R(y))) g.px(R(x), R(y), BELLY[4]); }   // pale underside edge
  });
}

const FRONT_TMP = new Layer(460, 680), FT_OX = 230, FT_OY = 178;

/**
 * Draws the front shark on c with its origin (the body's eye-line centre at scale 1) at screen (x, y).
 * o.s scale (1 = film size), o.a dissolve, o.grin 0..1 (mouth opening), o.worry, o.happy (closed ^ ^ eyes), o.shy
 * (blush, small mouth), o.sweat 0..1 (a drop sliding down the head), o.look [dx, dy] eye aim, o.blink 0..1,
 * o.finL / o.finR pectoral fin angles (q, clamped to −30…8, quantised to 0.1 so a swing never steps a whole fin), o.face false hides the face.
 */
export function drawFrontShark(c, x, y, o = {}) {
  const L = FRONT_TMP, g = L.g, ox = FT_OX, oy = FT_OY;
  L.m.fill(0);
  for (const [sd, q] of [[-1, o.finL ?? 0], [1, o.finR ?? 0]]) { const F = finSprite(sd, Math.max(-30, Math.min(8, Math.round(q * 10) / 10))); F.layer.blit(g, ox + sd * 90, oy + 98, F.ox, F.oy); }
  const B = frontSprite(); B.layer.blit(g, ox, oy, B.ox, B.oy);
  if (o.face !== false) frontFace(g, ox, oy, o);
  blitScaled(L, c, x, y, ox, oy, o.s ?? 1);
}

function frontFace(g, ox, oy, o) {
  const happy = clamp01(o.happy ?? 0), worry = clamp01(o.worry ?? 0), shy = clamp01(o.shy ?? 0), grin = o.grin ?? 1, look = o.look ?? [0, 0.05];
  const ey = oy + FRONT.EYE_Y, gap = FRONT.EYES / 2;
  // eyes: big glossy dark eyes, crossfading into happy "^" arcs (no switch at happy 0.5)
  const arcW = clamp01((happy - 0.25) / 0.5), round = fade(g, 1 - arcW), arc = fade(g, arcW);
  if (arcW < 0.99) for (const sd of [-1, 1]) eye(round, ox + sd * gap, ey, 16, { iris: EYE, pupil: "round", ry: 18 + worry * 1.5, look, blink: Math.max(o.blink ?? 0, Math.min(0.9, happy * 2)), lid: GREY[4], outline: OUT });
  if (arcW > 0.01) for (const sd of [-1, 1]) {
    const ex = ox + sd * gap, w = 14;
    for (let k = -w; k <= w; k++) { const u = k / w, yy = R(ey + 4 - 8 * (1 - u * u)); arc.px(R(ex + k), yy, OUT); arc.px(R(ex + k), yy + 1, OUT); if (Math.abs(u) < 0.8) arc.px(R(ex + k), yy - 1, GREY[6]); }
  }
  // worried brows
  if (worry > 0.02) { const f = fade(g, worry); for (const sd of [-1, 1]) for (let k = 0; k <= 16; k++) { const xx = R(ox + sd * (gap - 10 + k)), yy = R(ey - 27 - 6 + k * 0.42); f.px(xx, yy, OUT); f.px(xx, yy + 1, GREY[1]); } }
  // blush (stronger and wider when shy)
  for (const sd of [-1, 1]) { blush(g, ox + sd * 64, oy + 16, 13, 4.5, "#F27A9A"); if (shy > 0.02) blush(g, ox + sd * 64, oy + 18, 17, 6.5, "#FF6A92", shy); }
  // mouth
  mouth(g, ox, oy + 34, { grin, worry, shy });
  // sweat drop sliding down the right side of the head
  const sw = o.sweat ?? 0;
  if (sw > 0 && sw < 1) { const a = Math.min(1, sw * 6) * (1 - clamp01((sw - 0.7) / 0.3)), sx = ox + 82 + sw * 8, sy = oy - 52 + sw * 46; drop(fade(g, a), sx, sy, 6); }
}

function mouth(g, x, y, { grin = 1, worry = 0, shy = 0 }) {
  const w = lerp(lerp(56, 26, worry), 30, shy * (1 - worry)), curve = lerp(1, -0.35, worry), open = clamp01(grin) * (1 - worry) * (1 - shy * 0.85), wob = worry;
  const yl = (u) => y + curve * 8 * (1 - u * u) + wob * 2.6 * Math.sin(u * Math.PI * 3);
  const yb = (u) => yl(u) + open * 15 * Math.pow(Math.max(0, 1 - u * u), 0.7);
  // the open mouth (interior and lower lip) fades in from a closed mouth; it used to pop at open 0.05
  const fo = fade(g, clamp01((open - 0.02) / 0.08));
  for (let X = -R(w); X <= R(w); X++) {
    const u = X / w, t0 = yl(u), b0 = yb(u);
    if (b0 - t0 > 1.5) for (let Y = R(t0) + 1; Y < R(b0); Y++) fo.px(R(x + X), Y, Y > b0 - 4 && Math.abs(u) < 0.45 ? "#E8607E" : "#4A0E1E");
    g.px(R(x + X), R(t0), OUT); fo.px(R(x + X), R(b0), OUT);
    if (Math.abs(u) > 0.94) g.px(R(x + X), R(t0) - 1, OUT);
  }
  // teeth: little white triangles hanging from the top lip and standing on the bottom lip
  if (open > 0.2) {
    const ta = clamp01((open - 0.2) / 0.3), f = fade(g, ta);
    for (let k = -4; k <= 4; k++) {
      const tx = x + k * 11, u = (tx - x) / w; if (Math.abs(u) > 0.86) continue;
      const t0 = R(yl(u)) + 1, b0 = R(yb(u)) - 1, h = Math.min(4, Math.max(2, R((b0 - t0) * 0.35)));
      for (let j = 0; j < h; j++) for (let i = -(h - j); i <= h - j - 1; i++) f.px(R(tx + i), t0 + j, j === 0 ? "#FFFFFF" : "#E8EEF4");
      const bx = tx + 5.5, ub = (bx - x) / w; if (Math.abs(ub) > 0.8) continue; const b1 = R(yb(ub)) - 1;
      for (let j = 0; j < h - 1; j++) for (let i = -(h - 1 - j); i <= h - 2 - j; i++) f.px(R(bx + i), b1 - j, "#F4F8FC");
    }
  }
  // dimples at the corners
  for (const sd of [-1, 1]) { const cx = R(x + sd * (w + 1)), cy = R(yl(1)); g.px(cx, cy - 1, OUT); g.px(cx + sd, cy - 2, OUT); }
}

export function drop(g, x, y, r = 5) {
  for (let Y = R(y - r * 2.2); Y <= R(y + r); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const dy = Y - y, inside = dy >= 0 ? (X - x) ** 2 + dy * dy <= r * r : Math.abs(X - x) <= r * (1 + dy / (r * 2.2));
    const inner = dy >= 0 ? (X - x) ** 2 + dy * dy <= (r - 1.2) ** 2 : Math.abs(X - x) <= (r - 1.2) * (1 + (dy + 1.2) / (r * 2.2));
    if (!inside) continue; g.px(X, Y, !inner ? "#1A4A7A" : X < x - r * 0.2 && dy > -r * 0.6 && dy < r * 0.3 ? "#E8FCFF" : "#8AE0FA");
  }
}
