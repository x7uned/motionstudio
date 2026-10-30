// The cute chibi great white of LV1 (levels/ocean.mjs): a side-view swimmer (fin cutting the surface, body under water)
// and the front view that rises out of the sea facing the camera (dorsal fin on top, grey head, white belly bib,
// big glossy dark eyes with two highlights, blush, a toothy but friendly grin, gill slits, pectoral fins that can wave).
// Bodies are cached sprites; each frame the face is drawn live onto a composed layer, which is then blitted once with
// the underwater tint/wobble (and, for the swimmer, a horizontal squash used for turns). Pure functions of the inputs.
import { blob, ell, tube, bez, eye, blush, smooth, fade, mix, bayer, clamp01, lerp } from "../cute.mjs";
import { Layer, spriteCache, R, hex } from "./ocean-kit.mjs";

export const GREY = ["#0B111C", "#172130", "#243346", "#34485E", "#486079", "#5F7A95", "#7E98B2", "#A6BCD0"];
export const BELLY = ["#283040", "#4A566C", "#76849A", "#9EABBE", "#C0CAD8", "#D9E1EA", "#EDF2F7", "#FFFFFF"];
export const EYE = ["#04060C", "#0A0F1E", "#121A30", "#1C2846", "#28385E", "#384C78", "#4E6494", "#6C84B2"];
const OUT = "#0A0E18", LIT = "#C8DCEC";
const SPR = spriteCache(80);

/** Recolour the body below a boundary y(x) from the GREY ramp to the BELLY ramp (same tone index, one step lighter). */
function bellyRecolour(L, x0, x1, yOf, lift = 1) {
  const g = L.g, idx = new Map(GREY.map((c, i) => [hex(c).join(","), i]));
  for (let X = Math.max(0, x0); X < Math.min(L.w, x1); X++) {
    const yb = yOf(X); if (yb == null) continue;
    for (let Y = Math.max(0, Math.ceil(yb)); Y < L.h; Y++) {
      if (!L.m[Y * L.w + X]) continue;
      const p = (Y * L.w + X) * 3, i = idx.get(`${L.c.d[p]},${L.c.d[p + 1]},${L.c.d[p + 2]}`);
      if (i === undefined || i === 0) continue;
      g.px(X, Y, BELLY[Math.min(7, i + lift)]);
    }
  }
}
/** Jagged counter-shade boundary through [x, y] keys (linear between keys, a small zigzag on top). */
function jag(keys, amp = 1.5, per = 7) {
  return (x) => {
    if (x < keys[0][0] || x > keys[keys.length - 1][0]) return null;
    let y = keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const [a, ya] = keys[i], [b, yb] = keys[i + 1]; if (x <= b) { y = ya + ((yb - ya) * (x - a)) / (b - a); break; } }
    const ph = ((x % per) + per) % per; return y + amp * (Math.abs(ph - per / 2) / (per / 2) * 2 - 1);
  };
}

// ================================================================ SIDE VIEW (swimming, authored facing left)
// local origin = body centre; the back is at y ≈ −38, the dorsal fin tip at y ≈ −84
export const SIDE = { W: 290, H: 176, OX: 128, OY: 98, BACK: -38, FIN_TIP: -84, EYE: [-68, -9], SNOUT: -114, TAIL: 140 };
const SIDE_BODY = [[-114, 2], [-109, -13], [-96, -27], [-74, -36], [-46, -40], [-16, -39], [14, -34], [44, -25], [70, -16], [90, -10], [100, -8],
  [100, 8], [90, 10], [68, 16], [40, 25], [10, 33], [-22, 36], [-52, 33], [-78, 27], [-98, 19], [-110, 11]];
function sideSprite(ph) {
  const q = ((ph % 8) + 8) % 8;
  return SPR(`side|${q}`, SIDE.W, SIDE.H, SIDE.OX, SIDE.OY, (g, ox, oy, L) => {
    const T = (pts) => pts.map(([x, y]) => [x + ox, y + oy]);
    const beat = Math.sin((q / 8) * Math.PI * 2);
    // caudal fin (behind the body): a tall crescent; its sweep narrows and widens with the tail beat
    const sw = 0.62 + 0.38 * Math.abs(Math.cos((q / 8) * Math.PI * 2)), tb = beat * 3;
    const tail = [[92, -8], [104, -22], [118, -40], [136, -56 + tb], [140, -52 + tb], [130, -30], [118, -4], [126, 18], [134, 36 - tb], [130, 40 - tb], [112, 24], [92, 8]].map(([x, y]) => [92 + (x - 92) * sw, y]);
    blob(g, [T(smooth(tail, new Set([3, 4, 9, 10]), 3))], { ramp: GREY, thick: 8, base: 3.2, gain: 1.8, outline: OUT, litOutline: LIT });
    // dorsal fin, second dorsal and anal fin (behind the body outline)
    blob(g, [T(smooth([[-26, -34], [-12, -58], [0, -80], [8, -85], [12, -80], [14, -58], [26, -28]], new Set([2, 3, 4]), 4))], { ramp: GREY, thick: 9, base: 3.0, gain: 2.0, outline: OUT, litOutline: LIT });
    blob(g, [T([[62, -14], [70, -24], [74, -23], [76, -12]])], { ramp: GREY, thick: 3, base: 3.0, outline: OUT });
    blob(g, [T([[60, 14], [70, 24], [74, 23], [76, 12]])], { ramp: GREY, thick: 3, base: 3.0, outline: OUT });
    // the body: one soft torpedo
    blob(g, [T(smooth(SIDE_BODY, new Set(), 4))], { ramp: GREY, thick: 30, base: 2.6, gain: 2.6, slope: 0.6, outline: OUT, litOutline: LIT, rimLit: 0.9 });
    // white belly below a jagged counter-shade line (keeps the volume shading)
    bellyRecolour(L, ox - 116, ox + 104, jag([[-116 + ox, 5 + oy], [-96 + ox, 7 + oy], [-74 + ox, 12 + oy], [-50 + ox, 11 + oy], [-20 + ox, 14 + oy], [20 + ox, 12 + oy], [60 + ox, 8 + oy], [104 + ox, 3 + oy]], 1.6, 8), 1);
    // gill slits
    for (const gx of [-46, -39, -32]) for (let k = -14; k <= 10; k++) { const x = R(ox + gx + (k * k) / 70 - 2), y = R(oy + k); if (L.m[y * L.w + x]) { g.px(x, y, GREY[1]); if (k < 6) g.px(x + 1, y, GREY[5]); } }
    // pectoral fin (in front) and pelvic fin
    blob(g, [T(smooth([[-44, 22], [-30, 34], [-10, 54], [2, 66], [6, 62], [-2, 40], [-14, 24]], new Set([3, 4]), 4))], { ramp: GREY, thick: 7, base: 3.2, gain: 1.8, outline: OUT, litOutline: LIT });
    blob(g, [T([[40, 24], [50, 36], [56, 35], [56, 24]])], { ramp: GREY, thick: 3, base: 3.0, outline: OUT });
    // nostril, a lit sheen along the back
    g.px(ox - 102, oy - 4, OUT); g.px(ox - 101, oy - 4, OUT); g.px(ox - 100, oy - 3, OUT);
    for (let x = -90; x < 40; x++) { const y = R(oy - 34 + Math.max(0, (x + 46) * (x + 46)) / 900 - (x < -46 ? (x + 46) * (x + 46) / 500 : 0)); if (L.m[y * L.w + ox + x] && (x & 3) !== 3) g.px(ox + x, y, GREY[7]); }
  });
}
/** Live face of the swimmer on layer g (sprite-local, anchor at ox, oy): eye (look/blink), grin with teeth, blush. */
function sideFace(g, ox, oy, o) {
  const [ex, ey] = SIDE.EYE;
  eye(g, ox + ex, oy + ey, 12, { iris: EYE, pupil: "round", ry: 13, look: o.look ?? [-0.2, 0], blink: o.blink ?? 0, lid: GREY[4], outline: OUT });
  blush(g, ox + ex - 2, oy + ey + 16, 8, 3, "#F27A9A");
  // grin: from under the snout back to below the eye, corner turned up; little white teeth along it
  const m0 = -106, m1 = -66;
  for (let x = m0; x <= m1; x++) { const u = (x - m0) / (m1 - m0), y = R(oy + 16 + 4 * Math.sin(u * Math.PI) - (u > 0.9 ? (u - 0.9) * 40 : 0)); g.px(ox + x, y, OUT); if (x % 5 === 0 && u > 0.08 && u < 0.88) { g.px(ox + x, y + 1, "#FFFFFF"); g.px(ox + x + 1, y + 1, "#FFFFFF"); g.px(ox + x, y + 2, "#E4ECF4"); } }
}
const SIDE_TMP = new Layer(SIDE.W, SIDE.H);
/**
 * Draw the swimmer with its body centre at screen (x, y). o.sx: +1 faces left, −1 faces right, |sx| < 1 squashes (turn);
 * o.ph tail-beat phase (0..8, wraps); o.look, o.blink; o.a dissolve; o.below/o.tint/o.k/o.wob underwater look.
 */
export function drawSideShark(c, x, y, o = {}) {
  const S = sideSprite(R(o.ph ?? 0)), L = SIDE_TMP;
  L.m.fill(0); S.layer.blit(L.g, S.ox, S.oy, S.ox, S.oy);   // copy body into the temp layer (sets its mask)
  sideFace(L.g, S.ox, S.oy, o);
  L.blit(c, x, y, S.ox, S.oy, { a: o.a, sx: o.sx ?? 1, below: o.below, tint: o.tint, k: o.k, wob: o.wob });
}

// ================================================================ FRONT VIEW (risen, facing the camera)
// local origin = head centre (between the eyes); dorsal fin tip ≈ (6, −150), chin ≈ y 66, waterline at rest ≈ y 100
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
/** Pectoral fin sprite (side ±1, angle step q · 0.05 rad: 0 = drooping out-down at rest, negative = raised): anchor = root. */
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
 * Draw the risen shark with its head centre at screen (x, y).
 * o: a, look [dx, dy], blink, happy (0..1 closes the eyes into "^ ^"), worry (0..1 brows + small wavy mouth),
 * grin (0..1 open toothy grin), shy (0..1 extra blush + small closed smile), finL / finR (angle steps, see finSprite),
 * sweat (0..1 progress of a sweat drop sliding down), below/tint/k/wob underwater look, face false = no face.
 */
export function drawFrontShark(c, x, y, o = {}) {
  const L = FRONT_TMP, g = L.g, ox = FT_OX, oy = FT_OY;
  L.m.fill(0);
  for (const [sd, q] of [[-1, o.finL ?? 0], [1, o.finR ?? 0]]) { const F = finSprite(sd, Math.max(-30, Math.min(8, R(q)))); F.layer.blit(g, ox + sd * 90, oy + 98, F.ox, F.oy); }
  const B = frontSprite(); B.layer.blit(g, ox, oy, B.ox, B.oy);
  if (o.face !== false) frontFace(g, ox, oy, o);
  L.blit(c, x, y, ox, oy, { a: o.a, below: o.below, tint: o.tint, k: o.k, wob: o.wob });
}
function frontFace(g, ox, oy, o) {
  const happy = clamp01(o.happy ?? 0), worry = clamp01(o.worry ?? 0), shy = clamp01(o.shy ?? 0), grin = o.grin ?? 1, look = o.look ?? [0, 0.05];
  const ey = oy + FRONT.EYE_Y, gap = FRONT.EYES / 2;
  // eyes: big glossy dark eyes, or happy "^" arcs
  if (happy < 0.5) for (const sd of [-1, 1]) eye(g, ox + sd * gap, ey, 16, { iris: EYE, pupil: "round", ry: 18 + worry * 1.5, look, blink: Math.max(o.blink ?? 0, happy * 2), lid: GREY[4], outline: OUT });
  else for (const sd of [-1, 1]) {
    const ex = ox + sd * gap, w = 14;
    for (let k = -w; k <= w; k++) { const u = k / w, yy = R(ey + 4 - 8 * (1 - u * u)); g.px(R(ex + k), yy, OUT); g.px(R(ex + k), yy + 1, OUT); if (Math.abs(u) < 0.8) g.px(R(ex + k), yy - 1, GREY[6]); }
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
/** Shark mouth centred at (x, y): grin = open toothy grin (0 closed), worry = small wavy frown, shy = small closed smile. */
function mouth(g, x, y, { grin = 1, worry = 0, shy = 0 }) {
  const w = lerp(lerp(56, 26, worry), 30, shy * (1 - worry)), curve = lerp(1, -0.35, worry), open = clamp01(grin) * (1 - worry) * (1 - shy * 0.85), wob = worry;
  const yl = (u) => y + curve * 8 * (1 - u * u) + wob * 2.6 * Math.sin(u * Math.PI * 3);
  const yb = (u) => yl(u) + open * 15 * Math.pow(Math.max(0, 1 - u * u), 0.7);
  for (let X = -R(w); X <= R(w); X++) {
    const u = X / w, t0 = yl(u), b0 = yb(u);
    if (b0 - t0 > 1.5) for (let Y = R(t0) + 1; Y < R(b0); Y++) g.px(R(x + X), Y, Y > b0 - 4 && Math.abs(u) < 0.45 ? "#E8607E" : "#4A0E1E");
    g.px(R(x + X), R(t0), OUT); if (open > 0.05) g.px(R(x + X), R(b0), OUT);
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
/** A cute sweat / water drop (teardrop, outlined, highlight) with its round bottom centred at (x, y). */
export function drop(g, x, y, r = 5) {
  for (let Y = R(y - r * 2.2); Y <= R(y + r); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const dy = Y - y, inside = dy >= 0 ? (X - x) ** 2 + dy * dy <= r * r : Math.abs(X - x) <= r * (1 + dy / (r * 2.2));
    const inner = dy >= 0 ? (X - x) ** 2 + dy * dy <= (r - 1.2) ** 2 : Math.abs(X - x) <= (r - 1.2) * (1 + (dy + 1.2) / (r * 2.2));
    if (!inside) continue; g.px(X, Y, !inner ? "#1A4A7A" : X < x - r * 0.2 && dy > -r * 0.6 && dy < r * 0.3 ? "#E8FCFF" : "#8AE0FA");
  }
}

// ================================================================ ICON (readout / guess cards): the shark's head, ~56×56
const ICON_S = 0.27;
function iconSprite() {
  return SPR("icon", 64, 64, 32, 38, (g, ox, oy, L) => {
    const s = ICON_S, T = (pts) => pts.map(([x, y]) => [ox + x * s, oy + y * s]);
    blob(g, [T(smooth([[-34, -60], [-20, -100], [-2, -132], [16, -156], [26, -156], [22, -132], [22, -100], [34, -60]], new Set([3, 4]), 4))], { ramp: GREY, thick: 3, base: 3.2, gain: 1.6, outline: OUT, litOutline: LIT });
    const head = [[0, -88], [34, -82], [62, -64], [82, -38], [94, -6], [98, 28], [96, 62], [86, 86], [60, 98], [0, 104], [-60, 98], [-86, 86], [-96, 62], [-98, 28], [-94, -6], [-82, -38], [-62, -64], [-34, -82]];
    blob(g, [T(smooth(head, new Set(), 4))], { ramp: GREY, thick: 11, base: 2.8, gain: 2.4, slope: 0.4, outline: OUT, litOutline: LIT });
    bellyRecolour(L, ox - 27, ox + 28, (X) => { const u = Math.abs(X - ox) / 26; return oy + 1 + 6 * u * u + (u > 0.75 ? (u - 0.75) * 14 : 0); }, 1);
    for (const sd of [-1, 1]) eye(g, ox + sd * 11, oy - 4, 5, { iris: EYE, pupil: "round", ry: 5.6, look: [0, 0.1], lid: GREY[4], outline: OUT });
    for (const sd of [-1, 1]) { g.px(ox + sd * 18, oy + 3, "#F27A9A"); g.px(ox + sd * 18 - sd, oy + 3, "#F27A9A"); }
    // grin with little teeth
    for (let X = -13; X <= 13; X++) { const u = X / 13, t0 = R(oy + 7 + 2.5 * (1 - u * u)), b0 = R(oy + 7 + 2.5 * (1 - u * u) + 4 * Math.pow(Math.max(0, 1 - u * u), 0.7)); for (let Y = t0 + 1; Y < b0; Y++) g.px(ox + X, Y, Y >= b0 - 1 && Math.abs(u) < 0.4 ? "#E8607E" : "#4A0E1E"); g.px(ox + X, t0, OUT); if (b0 > t0 + 1) g.px(ox + X, b0, OUT); }
    for (const tx of [-7, -2, 3, 8]) g.px(ox + tx, R(oy + 7 + 2.5 * (1 - (tx / 13) ** 2)) + 1, "#FFFFFF");
    for (const sd of [-1, 1]) g.px(ox + sd * 14, oy + 6, OUT);
  });
}
/** ~56×56 head portrait centred at (cx, cy) for the readout and the guess cards; a = dissolve. */
export function sharkIcon(c, cx, cy, a = 1) { const S = iconSprite(); S.layer.blit(c, cx, cy + 5, S.ox, S.oy, { a }); }
