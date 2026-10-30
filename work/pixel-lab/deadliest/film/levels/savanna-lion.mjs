// The cute chibi lion of LV2 (levels/savanna.mjs): sits facing the camera, a big fluffy scalloped mane framing a round
// golden face, round ears, big glossy amber eyes with two highlights, a cream muzzle with whisker dots, a dark nose,
// blush, chest fluff, chunky front paws, haunches, a tufted tail. Poses: idle, ROAR (mouth wide open with little fangs
// and a pink tongue, eyes squeezed shut, mane puffed out) and PROUD (smug half-lidded eyes, closed grin with one fang).
// Body, mane (per puff step), tail (per sway step) and face base are cached sprites; the features are drawn live.
import { blob, ell, tube, bez, eye, blush, smooth, fade, mix, bayer, clamp01, lerp, RAMP } from "../cute.mjs";
import { Layer, spriteCache, R, rnd } from "./ocean-kit.mjs";

export const FUR = ["#3A1E06", "#6A3A10", "#9A5A1A", "#C27C28", "#DC9C3C", "#ECB858", "#F6D07E", "#FFE8B0"];
export const MANE = ["#2A0E04", "#4C1E08", "#743010", "#9C4818", "#C06222", "#D8802E", "#E8A044", "#F4C064"];
export const CREAM = ["#4A3420", "#7A5C38", "#A88A5C", "#CCAE7E", "#E4CA9C", "#F2DEB8", "#FAEED6", "#FFFAEE"];
const OUT = "#1E0C04", LIT = "#FFF0B0", LIT_M = "#FFD890";
const SPR = spriteCache(60);
export const LION = { GROUND: 214, W: 400, H: 420, OX: 170, OY: 190 };

// ---------------------------------------------------------------- cached parts (local origin = head centre)
function bodySprite() {
  return SPR("body", LION.W, LION.H, LION.OX, LION.OY, (g, ox, oy, L) => {
    const T = (pts) => pts.map(([x, y]) => [x + ox, y + oy]), E = (x, y, rx, ry, r = 0) => T(ell(x, y, rx, ry, r));
    // hind haunches and their paws (behind)
    for (const sd of [-1, 1]) {
      blob(g, [E(sd * 66, 172, 40, 36, sd * 0.2)], { ramp: FUR, thick: 22, base: 2.8, gain: 2.2, outline: OUT, litOutline: LIT });
      blob(g, [E(sd * 96, 206, 20, 10, sd * 0.15)], { ramp: FUR, thick: 6, base: 3.4, gain: 1.6, outline: OUT, litOutline: LIT });
      for (const k of [-1, 0, 1]) { const x = R(ox + sd * 96 + k * 7 + sd * 4), y = R(oy + 210); g.px(x, y, FUR[2]); g.px(x, y - 1, FUR[2]); }
    }
    // the body: a soft pear from under the mane to the ground
    blob(g, [smooth(T([[-48, 70], [48, 70], [74, 120], [88, 176], [84, 212], [-84, 212], [-88, 176], [-74, 120]]), new Set(), 4)], { ramp: FUR, thick: 36, base: 2.6, gain: 2.6, slope: 0.6, outline: OUT, litOutline: LIT });
    // chest fluff (cream, scalloped bottom)
    const fl = [[-30, 92], [30, 92], [36, 124], [24, 150], [12, 142], [0, 158], [-12, 142], [-24, 150], [-36, 124]];
    blob(g, [smooth(T(fl), new Set([3, 4, 5, 6, 7]), 4)], { ramp: CREAM, thick: 14, base: 3.4, gain: 2.0, outline: FUR[3], rimShade: 0.3 });
    // front legs with chunky round paws and toe lines
    for (const sd of [-1, 1]) {
      blob(g, [smooth(T([[sd * 12, 118], [sd * 42, 118], [sd * 46, 196], [sd * 8, 196]]), new Set(), 4), E(sd * 27, 204, 22, 12)], { ramp: FUR, thick: 14, base: 3.0, gain: 2.0, outline: OUT, litOutline: LIT });
      for (const k of [-1, 0, 1]) for (let j = 0; j < 5; j++) g.px(R(ox + sd * 27 + k * 8), R(oy + 206 + j - 1), j === 0 ? FUR[4] : FUR[1]);
    }
  });
}
/** Mane sprite for a puff step q (0 calm … 6 fully puffed). */
function maneSprite(q) {
  return SPR(`mane|${q}`, 300, 300, 150, 150, (g, ox, oy) => {
    const p = q / 6, sc = 1 + 0.13 * p, polys = [ell(ox, oy + 6, 84 * sc, 84 * sc)];
    const N = 15;
    for (let i = 0; i < N; i++) {
      const a = -Math.PI / 2 + (i / N) * Math.PI * 2 + Math.sin(i * 2.3) * 0.05 + p * 0.06 * Math.sin(i * 1.7), bottom = Math.max(0, Math.sin(a));
      const r = (84 + bottom * 14) * sc, rx = (25 + bottom * 4) * sc * (1 + 0.1 * p * Math.sin(i * 3.1)), ry = (19 + bottom * 6) * sc;
      polys.push(ell(ox + Math.cos(a) * r, oy + 6 + Math.sin(a) * r * 0.98, rx, ry, a + Math.PI / 2));
    }
    blob(g, polys, { ramp: MANE, thick: 34 * sc, base: 2.7, gain: 2.6, slope: 0.6, outline: OUT, litOutline: LIT_M, rimLit: 1.0 });
    // fur strokes: curved locks radiating from the face
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.12 + rnd(i) * 0.1, r0 = (70 + rnd(i * 3) * 8) * sc, r1 = (88 + 12 * Math.max(0, Math.sin(a))) * sc;
      for (let k = 0; k < 30; k++) { const u = k / 29, r = lerp(r0, r1, u), b = a + 0.18 * u * u; const x = R(ox + Math.cos(b) * r), y = R(oy + 6 + Math.sin(b) * r); if (g.has(x, y) && g.has(x + 2, y) && g.has(x - 2, y) && g.has(x, y + 2) && g.has(x, y - 2)) g.px(x, y, u < 0.6 ? MANE[3] : MANE[4]); }
    }
  });
}
/** Ears (both) for a twitch step q (−2..2: the right ear flicks). */
function earsSprite(q) {
  return SPR(`ears|${q}`, 200, 120, 100, 80, (g, ox, oy) => {
    for (const sd of [-1, 1]) {
      const tw = sd > 0 ? q * 0.08 : 0, cx = ox + sd * 46 + Math.sin(tw) * 6, cy = oy - 48 - Math.abs(Math.sin(tw)) * 2;
      blob(g, [ell(cx, cy, 17, 16, tw)], { ramp: FUR, thick: 8, base: 3.0, gain: 2.0, outline: OUT, litOutline: LIT });
      blob(g, [ell(cx + sd * 1, cy + 2, 9, 9, tw)], { ramp: ["#3A1408", "#5A2410", "#7A3A1E", "#9A5030", "#B46A44", "#C88458", "#D89E70", "#E8B88A"], thick: 5, base: 3.0, gain: 1.4, outline: FUR[2] });
    }
  });
}
function faceSprite() {
  return SPR("face", 200, 180, 100, 90, (g, ox, oy) => {
    const T = (pts) => pts.map(([x, y]) => [x + ox, y + oy]);
    // round face with cheek fluff pointing out-down
    blob(g, [T(ell(0, 6, 68, 61)), T([[-60, 18], [-82, 46], [-52, 42]]), T([[60, 18], [82, 46], [52, 42]])], { ramp: FUR, thick: 28, base: 3.0, gain: 2.4, slope: 0.5, outline: OUT, litOutline: LIT });
    // cream muzzle puffs and chin
    blob(g, [T(ell(-15, 32, 18, 14)), T(ell(15, 32, 18, 14)), T(ell(0, 47, 14, 9))], { ramp: CREAM, thick: 9, base: 3.6, gain: 1.8, outline: FUR[2], rimShade: 0.4 });
    // light brow tufts above the eyes, a darker forehead stripe
    for (const sd of [-1, 1]) for (let k = -7; k <= 7; k++) { const x = R(ox + sd * 29 + k), y = R(oy - 25 + (k * k) / 14); g.px(x, y, FUR[6]); if (Math.abs(k) < 5) g.px(x, y - 1, FUR[7]); }
    for (let j = 0; j < 14; j++) { g.px(ox, oy - 46 + j, FUR[3]); if (j < 9) { g.px(ox - 1, oy - 46 + j, FUR[4]); g.px(ox + 1, oy - 46 + j, FUR[4]); } }
  });
}
/** Tail for a sway step q (−3..3): from the right haunch along the ground, curling up the side like a "?", a dark tuft at the tip. */
function tailSprite(q) {
  return SPR(`tail|${q}`, 200, 220, 40, 150, (g, ox, oy) => {
    const sw = q * 5, top = [ox + 78 + sw * 0.5, oy - 30], tip = [ox + 58 + sw, oy - 46 - Math.abs(sw) * 0.3];
    const pts = [...bez([ox, oy + 50], [ox + 70, oy + 66], [ox + 86, oy + 18], 12), ...bez([ox + 86, oy + 18], [ox + 92 + sw * 0.4, oy - 20], top, 8).slice(1), ...bez(top, [ox + 70 + sw * 0.8, oy - 44], tip, 6).slice(1)];
    blob(g, [tube(pts, 9, 7)], { ramp: FUR, thick: 6, base: 3.0, gain: 1.8, outline: OUT, litOutline: LIT });
    blob(g, [ell(tip[0] - 3, tip[1] - 2, 12, 11, -0.4), ell(tip[0] - 10, tip[1] + 2, 8, 7), ell(tip[0] - 2, tip[1] - 10, 7, 6)], { ramp: MANE, thick: 7, base: 2.8, gain: 1.8, outline: OUT, litOutline: LIT_M });
  });
}

// ---------------------------------------------------------------- the lion
const TMP = new Layer(460, 460), TOX = 230, TOY = 220;
/**
 * Draw the lion with its head centre at screen (x, y); the paws stand at y + LION.GROUND. o:
 * a · head [dx, dy] head offset · puff 0..1 mane puff · roar 0..1 open roaring mouth (eyes squeezed shut) ·
 * proud 0..1 smug half-lidded eyes and closed grin · look [dx, dy] · blink · ear (−2..2 twitch) · tail (−3..3 sway).
 */
export function drawLion(c, x, y, o = {}) {
  const L = TMP, g = L.g, ox = TOX, oy = TOY, hd = o.head ?? [0, 0];
  L.m.fill(0);
  const tl = tailSprite(Math.max(-3, Math.min(3, R(o.tail ?? 0)))); tl.layer.blit(g, ox + 74, oy + 150, tl.ox, tl.oy);
  const B = bodySprite(); B.layer.blit(g, ox, oy, B.ox, B.oy);
  const hx = ox + hd[0], hy = oy + hd[1];
  const M = maneSprite(Math.max(0, Math.min(6, R((o.puff ?? 0) * 6)))); M.layer.blit(g, hx, hy, M.ox, M.oy);
  const Er = earsSprite(Math.max(-2, Math.min(2, R(o.ear ?? 0)))); Er.layer.blit(g, hx, hy, Er.ox, Er.oy);
  const F = faceSprite(); F.layer.blit(g, hx, hy, F.ox, F.oy);
  features(g, hx, hy, o);
  L.blit(c, x, y, ox, oy, { a: o.a });
}
function features(g, x, y, o) {
  const roar = clamp01(o.roar ?? 0), proud = clamp01(o.proud ?? 0), look = o.look ?? [0, 0.1];
  // eyes: open glossy amber; squeezed shut while roaring (lids close, then "> <" chevrons dissolve in);
  // proud = happy closed "^ ^" arcs (the lids close first, then the arcs dissolve in)
  const shut = clamp01(roar * 2.4), happy = clamp01((proud - 0.4) / 0.35), squint = clamp01(o.squint ?? 0), lid = Math.max(o.blink ?? 0, shut, clamp01(proud * 2.4), squint);
  // closed-eye looks: "> <" chevrons while roaring hand over to "^ ^" arcs (they always add up, so the eyes never vanish)
  const chevA = clamp01((roar - 0.2) / 0.3), arcA = Math.max(happy, squint * (1 - chevA));
  if (lid < 0.999 || chevA + arcA < 0.999) for (const sd of [-1, 1]) eye(g, x + sd * 29, y - 2, 15, { iris: RAMP.amber, pupil: "round", ry: 16, look, blink: lid, lid: FUR[4], outline: OUT });
  if (chevA > 0) { const f = fade(g, chevA); for (const sd of [-1, 1]) for (let k = 0; k <= 16; k++) { const u = k / 16, xx = R(x + sd * (19 + Math.abs(u - 0.5) * 2 * 21)), yy = R(y - 2 + (u - 0.5) * 18); for (let q = 0; q < 2; q++) f.px(xx + sd * q, yy, OUT); f.px(xx - sd, yy, FUR[2]); } }
  if (arcA > 0) { const f = fade(g, arcA); for (const sd of [-1, 1]) { const ex = x + sd * 29, w = 13; for (let k = -w; k <= w; k++) { const u = k / w, yy = R(y + 3 - 8 * (1 - u * u)); f.px(R(ex + k), yy, OUT); f.px(R(ex + k), yy + 1, OUT); if (Math.abs(u) < 0.75) f.px(R(ex + k), yy - 1, FUR[6]); } } }
  // blush (a little deeper when proud)
  for (const sd of [-1, 1]) { blush(g, x + sd * 50, y + 22, 11, 4.5, "#F27A9A"); if (proud > 0.05) blush(g, x + sd * 50, y + 23, 13, 5.5, "#FF6A92", proud * 0.8); }
  // whisker dots on the muzzle
  for (const sd of [-1, 1]) for (const [dx, dy] of [[13, 28], [21, 32], [14, 37]]) g.px(R(x + sd * dx), R(y + dy), FUR[2]);
  // mouth: idle "w" smile / open roar / proud wide closed grin with a fang
  const my = y + 37;
  if (roar > 0.02) {
    const h = 2 + roar * 44, w = 7 + roar * 23, cy = my + h * 0.5 - 2 - roar * 2;
    for (let Y = R(cy - h / 2); Y <= R(cy + h / 2); Y++) for (let X = R(x - w); X <= R(x + w); X++) {
      const d = ((X - x) / w) ** 2 + ((Y - cy) / (h / 2)) ** 2; if (d > 1) continue;
      g.px(X, Y, d > 0.84 ? OUT : Y > cy + h * 0.1 && Math.abs(X - x) < w * 0.64 ? (Y > cy + h * 0.3 ? "#E86A88" : "#F48AA2") : Y < cy - h * 0.3 ? "#3A0814" : "#5A1222");
    }
    // little fangs (two up, two down)
    const fh = R(roar * 7);
    for (const sd of [-1, 1]) { const fx = R(x + sd * w * 0.5), ty = R(cy - h / 2) + 1, by = R(cy + h / 2) - 1;
      for (let j = 0; j < fh; j++) for (let i = -(fh - j) + 1; i <= fh - j - 1; i++) g.px(fx + R(i * 0.6), ty + j, j === 0 ? "#FFFFFF" : "#F4F0E8");
      for (let j = 0; j < fh - 1; j++) for (let i = -(fh - 1 - j) + 1; i <= fh - 2 - j; i++) g.px(R(x + sd * w * 0.4) + R(i * 0.6), by - j, "#F4F0E8"); }
  } else if (proud > 0.02) {
    const w = 15 + proud * 7;
    for (let X = -R(w); X <= R(w); X++) { const u = X / w, yy = R(my + 1 + 5 * (1 - u * u) * proud - (Math.abs(u) > 0.82 ? (Math.abs(u) - 0.82) * 16 : 0)); g.px(R(x + X), yy, OUT); if (Math.abs(u) < 0.6 && proud > 0.5) g.px(R(x + X), yy - 1, "#7A2A2A"); }
    const f = fade(g, proud); for (const [dx, dy] of [[7, 5], [8, 5], [7, 6], [8, 6], [7, 7]]) f.px(R(x + dx), R(my + dy + R(5 * proud) - 5 + 1), dy === 7 ? "#E8E0D8" : "#FFFFFF");
  }
  if (roar < 0.18 && proud < 0.5) {   // the idle "w" smile (dissolves as the roar opens or the proud grin forms)
    const f = fade(g, Math.min(1 - proud * 2, 1 - roar / 0.18)); for (const sd of [-1, 1]) for (let k = 0; k <= 8; k++) { const u = k / 8; f.px(R(x + sd * k), R(my + 1 + Math.sin(u * Math.PI) * 3), OUT); }
    f.px(R(x), R(my), OUT);
  }
  // the nose (on top of the mouth's upper edge)
  const ny = y + 14 - roar * 3;
  for (let j = 0; j <= 9; j++) { const half = Math.max(0, R(10 - j * 1.1)); for (let i = -half; i <= half; i++) g.px(R(x + i), R(ny + j), j === 0 || Math.abs(i) === half ? OUT : j < 3 && i < 0 ? "#A0605A" : "#5A2A26"); }
  g.px(R(x - 3), R(ny + 2), "#E8B0A0"); g.px(R(x - 4), R(ny + 2), "#D89A8A");
  if (roar <= 0.3) { const f = fade(g, 1 - roar / 0.3); for (let j = 10; j < 14; j++) f.px(R(x), R(ny + j), OUT); }
}

// ---------------------------------------------------------------- ICON (readout / guess cards): the lion's head, ~56×56
function iconSprite() {
  return SPR("icon", 72, 72, 36, 36, (g, ox, oy) => {
    const s = 0.29, polys = [ell(ox, oy + 2, 84 * s, 84 * s)];
    for (let i = 0; i < 13; i++) { const a = -Math.PI / 2 + (i / 13) * Math.PI * 2, r = 84 * s; polys.push(ell(ox + Math.cos(a) * r, oy + 2 + Math.sin(a) * r, 25 * s, 19 * s, a + Math.PI / 2)); }
    blob(g, polys, { ramp: MANE, thick: 10, base: 2.8, gain: 2.2, outline: OUT, litOutline: LIT_M });
    for (const sd of [-1, 1]) { blob(g, [ell(ox + sd * 13, oy - 12, 5.5, 5)], { ramp: FUR, thick: 3, base: 3.2, outline: OUT }); g.px(ox + sd * 13, oy - 12, "#7A3A1E"); g.px(ox + sd * 13, oy - 11, "#7A3A1E"); }
    blob(g, [ell(ox, oy + 2, 18, 16.5), [[ox - 16, oy + 6], [ox - 22, oy + 13], [ox - 13, oy + 12]], [[ox + 16, oy + 6], [ox + 22, oy + 13], [ox + 13, oy + 12]]], { ramp: FUR, thick: 8, base: 3.0, gain: 2.2, outline: OUT, litOutline: LIT });
    blob(g, [ell(ox - 4, oy + 9, 5.5, 4), ell(ox + 4, oy + 9, 5.5, 4)], { ramp: CREAM, thick: 3, base: 3.8, gain: 1.4, outline: FUR[3] });
    for (const sd of [-1, 1]) eye(g, ox + sd * 8, oy - 1, 4.4, { iris: RAMP.amber, pupil: "round", ry: 4.8, look: [0, 0.1], lid: FUR[4], outline: OUT });
    for (let j = 0; j < 3; j++) for (let i = -(3 - j); i <= 3 - j; i++) g.px(ox + i, oy + 4 + j, j === 0 ? "#3A1A16" : "#5A2A26");
    g.px(ox, oy + 7, OUT); for (const sd of [-1, 1]) { g.px(ox + sd, oy + 8, OUT); g.px(ox + sd * 2, oy + 8, OUT); g.px(ox + sd * 3, oy + 7, OUT); }
    for (const sd of [-1, 1]) { g.px(ox + sd * 14, oy + 6, "#F27A9A"); g.px(ox + sd * 13, oy + 6, "#F27A9A"); }
  });
}
/** ~56×56 head portrait centred at (cx, cy); a = dissolve. */
export function lionIcon(c, cx, cy, a = 1) { const S = iconSprite(); S.layer.blit(c, cx, cy, S.ox, S.oy, { a }); }
