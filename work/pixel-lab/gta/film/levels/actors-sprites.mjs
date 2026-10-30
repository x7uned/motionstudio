// Sprite kit for the street actors: pastel cars and cute pedestrians drawn once into small offscreen canvases, then
// baked into two looks — DRAWN (full pixel art: flat tone bands, dark 1-px outline, warm sunset rim on the top edges) and
// NOT DRAWN (blueprint: dark navy fill, cyan outline, dimmer cyan inner edges, like an empty game level). Every frame the
// look is chosen per pixel from drawnAt() + Bayer, so an object driving through the cone edge dissolves between the two.
import { Canvas, hex, mix, bayer, TINY, MAIN } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, KEY = "#FF00FF";
export const BP = { fill: "#0E1940", line: "#6FD6FF", inner: "#2F7FC0", red: "#FF5468" };
const OUTC = hex("#1A0E1C"), RIMC = hex("#FFD08A"), BPF = hex(BP.fill), BPL = hex(BP.line), BPI = hex(BP.inner);

// ---------------------------------------------------------------- bake a canvas into a sprite (mask, art, blueprint)
/** draw(g) paints into a Canvas of w×h (magenta = empty); origin (ox, oy) = the point that stands on the ground. */
export function makeSprite(w, h, ox, oy, draw, { rim = 1, noOutline = false, flip = false } = {}) {
  const P = 2, W = w + 2 * P, H = h + 2 * P, g = new Canvas(W, H, KEY), labels = [];
  draw(g, P, labels);
  if (flip) {   // mirror the drawing, but keep lettering readable: labels are drawn after the mirror
    for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { const a = (y * W + x) * 3, b = (y * W + W - 1 - x) * 3; for (let k = 0; k < 3; k++) { const v = g.d[a + k]; g.d[a + k] = g.d[b + k]; g.d[b + k] = v; } }
    ox = w - 1 - ox;
  }
  for (const L of labels) { const x = flip ? W - L.x - L.w : L.x; g.rect(x, L.y, L.w, L.h, L.bg); g.text(L.font, L.text, x + L.dx, L.y + L.dy, L.col, { spacing: L.sp ?? 1 }); }
  const key = hex(KEY), N = W * H, m = new Uint8Array(N), art = new Uint8ClampedArray(N * 3), bp = new Uint8ClampedArray(N * 3);
  for (let i = 0; i < N; i++) if (!(g.d[i * 3] === key[0] && g.d[i * 3 + 1] === key[1] && g.d[i * 3 + 2] === key[2])) m[i] = 1;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  const lum = (i) => 0.3 * g.d[i * 3] + 0.59 * g.d[i * 3 + 1] + 0.11 * g.d[i * 3 + 2];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!m[i]) { if (!noOutline && (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1))) { m[i] = 2; art.set(OUTC, i * 3); bp.set(BPL, i * 3); } continue; }
    let c = [g.d[i * 3], g.d[i * 3 + 1], g.d[i * 3 + 2]];
    const up = !on(x, y - 1) ? 1 : !on(x, y - 2) ? 0.35 : 0;
    if (up && rim) c = c.map((v, k) => v + (RIMC[k] - v) * 0.42 * up * rim);
    art.set(c, i * 3);
    // blueprint: inner edges where the drawn colour changes a lot (windows, wheels, doors)
    const e = (on(x + 1, y) && Math.abs(lum(i) - lum(i + 1)) > 34) || (on(x, y + 1) && Math.abs(lum(i) - lum(i + W)) > 34);
    bp.set(noOutline && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1)) ? BPL : e ? BPI : BPF, i * 3);
  }
  return { w: W, h: H, ox: ox + P, oy: oy + P, m, art, bp };
}

/**
 * Blit a sprite with its origin at screen (x, y). k(X) → 0..1 drawn-ness of screen column X (1 = art, 0 = blueprint),
 * ex = existence 0..1 (dithered dissolve), flip mirrors it, lineCol overrides the blueprint line colour (e.g. red when deleted).
 */
export function blitSprite(c, s, x, y, { k = () => 1, ex = 1, flip = false, lineCol = null, scale = 1, inv = false } = {}) {
  if (ex <= 0 && !inv) return;
  if (inv && ex >= 1) return;
  const d = c.d, W = c.w, H = c.h, X0 = R(x), Y0 = R(y), LC = lineCol ? hex(lineCol) : null;
  if (scale !== 1) {   // scaled (nearest) — used only for the shrinking ghost
    const w = s.w * scale, h = s.h * scale, x0 = Math.floor(X0 - s.ox * scale), y0 = Math.floor(Y0 - s.oy * scale);
    for (let Y = y0; Y < y0 + h + 1; Y++) for (let X = x0; X < x0 + w + 1; X++) {
      if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
      let u = Math.floor((X + 0.5 - x0) / scale), v = Math.floor((Y + 0.5 - y0) / scale); if (u < 0 || v < 0 || u >= s.w || v >= s.h) continue; if (flip) u = s.w - 1 - u;
      const i = v * s.w + u; if (!s.m[i] || (ex < 1 && ex <= bayer(X + 1, Y + 2))) continue;
      const kk = k(X), src = kk >= 1 || kk > bayer(X, Y) ? s.art : s.bp, p = (Y * W + X) * 3;
      if (LC && src === s.bp && (s.m[i] === 2 || (s.bp[i * 3] === BPI[0] && s.bp[i * 3 + 1] === BPI[1]))) { d[p] = LC[0]; d[p + 1] = LC[1]; d[p + 2] = LC[2]; continue; }
      d[p] = src[i * 3]; d[p + 1] = src[i * 3 + 1]; d[p + 2] = src[i * 3 + 2];
    }
    return;
  }
  const bx = flip ? X0 - (s.w - 1 - s.ox) : X0 - s.ox, by = Y0 - s.oy;
  for (let v = 0; v < s.h; v++) {
    const Y = by + v; if (Y < 0 || Y >= H) continue;
    for (let u = 0; u < s.w; u++) {
      const su = flip ? s.w - 1 - u : u, i = v * s.w + su; if (!s.m[i]) continue;
      const X = bx + u; if (X < 0 || X >= W) continue;
      if (inv ? ex > bayer(X + 1, Y + 2) : ex < 1 && ex <= bayer(X + 1, Y + 2)) continue;
      const kk = k(X), src = kk >= 1 || kk > bayer(X, Y) ? s.art : s.bp, p = (Y * W + X) * 3;
      if (LC && src === s.bp && (s.m[i] === 2 || (s.bp[i * 3] === BPI[0] && s.bp[i * 3 + 1] === BPI[1]))) { d[p] = LC[0]; d[p + 1] = LC[1]; d[p + 2] = LC[2]; continue; }
      d[p] = src[i * 3]; d[p + 1] = src[i * 3 + 1]; d[p + 2] = src[i * 3 + 2];
    }
  }
}

// ---------------------------------------------------------------- cars (side view, facing right; origin = between the wheels on the ground)
export const PAL = {
  pink: ["#F48FB8", "#FFC4DC", "#C2588A"], mint: ["#7EE0C0", "#C8F7E6", "#3EA88C"], aqua: ["#6CCFE0", "#C0F0F7", "#3492AE"],
  yellow: ["#F6C83E", "#FFE68C", "#C48A1C"], lilac: ["#B49AF0", "#DED0FF", "#7A5CC4"], sunset: ["#FF9E5E", "#FFCC9C", "#D0603A"],
  teal: ["#3EC0C0", "#9AE9E4", "#1F8890"], white: ["#F2EEE6", "#FFFFFF", "#B8B0C4"], peach: ["#FFB898", "#FFDDCA", "#D07A68"],
  red: ["#F2545E", "#FF9CA2", "#B02A44"],
};
const GLASS = "#2B2645", GLASS_HI = "#8A9AE0", TIRE = "#1E1A26", RIM = "#CFCBE0", HUB = "#6E6A86", HEAD = "#FFF6C8", TAIL = "#FF3A4A", TRIM = "#3A3348";
const P2 = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);

function wheel(g, x, y, r) {
  g.disc(x, y, r + 1, "#120E18"); g.disc(x, y, r, TIRE); g.disc(x, y, Math.max(1, r - 2), RIM); g.px(x, y, HUB); g.px(x - 1, y - 1, "#FFFFFF");
}
export const CAR_DIM = {
  coupe: { w: 88, h: 24, wheels: [18, 70], r: 5, head: [86, 13], tail: [1, 12] },
  sport: { w: 88, h: 22, wheels: [18, 70], r: 5, head: [86, 12], tail: [1, 11] },
  convertible: { w: 86, h: 24, wheels: [17, 68], r: 5, head: [84, 14], tail: [1, 13] },
  taxi: { w: 84, h: 30, wheels: [17, 66], r: 6, head: [82, 21], tail: [1, 20] },
  muscle: { w: 90, h: 25, wheels: [18, 72], r: 6, head: [88, 16], tail: [1, 15] },
  bus: { w: 150, h: 50, wheels: [26, 122], r: 7, head: [148, 40], tail: [1, 38] },
};
const carCache = new Map();
/** Car sprite of a kind in a colour; origin = the car's centre on the ground line (wheel bottoms). */
export function carSprite(kind, col, dir = 1) {
  const key = kind + ":" + col + ":" + dir; let s = carCache.get(key); if (s) return s;
  const D = CAR_DIM[kind], [B, L, Dk] = PAL[col] ?? PAL.white, w = D.w, h = D.h;
  s = makeSprite(w, h, R(w / 2), h - 1, (g, P, LB) => {
    const T = (pts) => P2(pts, P, P), wy = h - 1 - D.r + P;      // wheel centre row
    if (kind === "coupe") {           // 80s wedge with pop-up lights and side strakes
      g.poly(T([[1, 20], [1, 12], [4, 10], [24, 9], [34, 3], [54, 3], [64, 9], [84, 11], [87, 13], [87, 20]]), B);
      g.poly(T([[1, 12], [4, 10], [24, 9], [64, 9], [84, 11], [87, 13], [87, 14], [1, 14]]), L);
      g.rect(P + 1, P + 17, 86, 3, Dk); for (const y of [14, 16]) g.rect(P + 30, P + y, 22, 1, Dk);
      g.poly(T([[30, 9], [36, 4.5], [53, 4.5], [61, 9]]), GLASS); g.rect(P + 37, P + 5, 10, 1, GLASS_HI); g.rect(P + 45, P + 5, 2, 4, B);
      g.rect(P + 78, P + 10, 6, 1, Dk); g.rect(P + 85, P + 12, 2, 2, HEAD); g.rect(P + 1, P + 12, 2, 2, TAIL);
    } else if (kind === "sport") {    // modern rounded supercar with a rear wing
      g.poly(T([[1, 18], [1, 12], [6, 9], [22, 8], [34, 2], [52, 2], [66, 8], [82, 10], [87, 13], [87, 18]]), B);
      g.poly(T([[6, 9], [22, 8], [66, 8], [82, 10], [86, 12], [6, 12]]), L);
      g.poly(T([[32, 8], [38, 3.5], [51, 3.5], [62, 8]]), GLASS); g.rect(P + 39, P + 4, 8, 1, GLASS_HI);
      g.rect(P + 24, P + 11, 7, 4, TRIM); g.rect(P + 1, P + 16, 86, 2, Dk);
      g.rect(P + 0, P + 5, 9, 2, Dk); g.rect(P + 4, P + 7, 2, 3, Dk);
      g.rect(P + 84, P + 11, 3, 2, HEAD); g.rect(P + 1, P + 11, 2, 2, TAIL);
    } else if (kind === "convertible") {   // open top, a driver with a flowing headscarf
      g.poly(T([[1, 20], [1, 11], [22, 10], [56, 10], [84, 12], [85, 15], [85, 20]]), B);
      g.rect(P + 1, P + 11, 84, 3, L); g.rect(P + 1, P + 18, 84, 2, Dk);
      g.rect(P + 32, P + 6, 3, 5, Dk);                                     // seat back
      g.disc(P + 40, P + 5, 4, "#E8B08A"); g.rect(P + 36, P + 1, 9, 3, "#F2547A"); g.rect(P + 30, P + 2, 7, 2, "#F2547A"); g.px(P + 29, P + 3, "#F2547A");
      g.px(P + 43, P + 5, "#2A1A20"); g.px(P + 42, P + 7, "#C8605A"); g.rect(P + 41, P + 9, 2, 2, "#E8B08A");   // eye, smile, hand on wheel
      g.line(P + 54, P + 10, P + 58, P + 4, "#3A3A52"); g.line(P + 55, P + 10, P + 59, P + 4, GLASS_HI);   // windshield
      g.rect(P + 82, P + 13, 3, 2, HEAD); g.rect(P + 1, P + 12, 2, 2, TAIL);
    } else if (kind === "taxi") {     // yellow sedan, roof sign, checker strip
      g.poly(T([[1, 26], [1, 18], [14, 17], [22, 10], [56, 10], [64, 17], [81, 18], [83, 21], [83, 26]]), B);
      g.poly(T([[24, 16], [28, 11.5], [52, 11.5], [58, 16]]), GLASS); g.rect(P + 40, P + 12, 2, 4, B); g.rect(P + 29, P + 12, 8, 1, GLASS_HI);
      for (let x = 2; x < 82; x += 2) g.rect(P + x, P + 20, 1, 1, (x / 2) % 2 ? "#1E1A26" : "#FFFFFF"), g.rect(P + x + 1, P + 20, 1, 1, (x / 2) % 2 ? "#FFFFFF" : "#1E1A26");
      for (let x = 2; x < 82; x += 2) g.rect(P + x, P + 21, 1, 1, (x / 2) % 2 ? "#FFFFFF" : "#1E1A26"), g.rect(P + x + 1, P + 21, 1, 1, (x / 2) % 2 ? "#1E1A26" : "#FFFFFF");
      g.rect(P + 1, P + 24, 82, 2, Dk); g.rect(P + 38, P + 12, 1, 12, Dk);
      g.rect(P + 31, P + 9, 19, 1, Dk); LB.push({ x: P + 31, y: P + 3, w: 19, h: 6, bg: "#FFF4C8", font: TINY, text: "TAXI", dx: 2, dy: 1, col: "#2A1A08" });
      g.rect(P + 80, P + 19, 3, 2, HEAD); g.rect(P + 1, P + 19, 2, 2, TAIL);
    } else if (kind === "muscle") {   // long hood, double side stripe
      g.poly(T([[1, 21], [1, 13], [10, 11], [26, 11], [32, 4], [50, 4], [58, 11], [86, 12], [89, 15], [89, 21]]), B);
      g.rect(P + 1, P + 15, 88, 2, "#FFFFFF"); g.rect(P + 1, P + 18, 88, 1, "#FFFFFF");
      g.poly(T([[33, 10], [37, 5.5], [49, 5.5], [55, 10]]), GLASS); g.rect(P + 38, P + 6, 7, 1, GLASS_HI);
      g.rect(P + 1, P + 19, 88, 2, Dk); g.rect(P + 64, P + 10, 10, 2, Dk);
      g.rect(P + 87, P + 13, 2, 2, HEAD); g.rect(P + 1, P + 13, 2, 2, TAIL);
    } else if (kind === "bus") {      // pastel city bus: windows with passengers, a "BEACH" destination sign
      g.rrect(P + 1, P + 2, 147, 41, B, 2); g.rect(P + 1, P + 30, 147, 4, L); g.rect(P + 1, P + 38, 147, 4, Dk);
      LB.push({ x: P + 127, y: P + 3, w: 20, h: 7, bg: "#1E1A26", font: TINY, text: "BEACH", dx: 0, dy: 1, col: "#FFB040", sp: 0 });
      for (let i = 0; i < 8; i++) { const x = P + 8 + i * 14; g.rect(x, P + 9, 11, 14, GLASS); g.rect(x + 1, P + 10, 4, 1, GLASS_HI);
        if ([1, 2, 4, 6].includes(i)) { const hc = ["#3A2A20", "#F4D06A", "#5A3A8A", "#C46A3A"][i % 4]; g.disc(x + 6, P + 18, 3, ["#E8B08A", "#C88A5E", "#F2C6A0", "#8A5634"][i % 4]); g.rect(x + 3, P + 14, 7, 2, hc); g.rect(x + 3, P + 21, 7, 2, ["#F48FB8", "#7EE0C0", "#FFD166", "#B49AF0"][i % 4]); } }
      g.rect(P + 124, P + 8, 22, 22, GLASS); g.rect(P + 126, P + 9, 8, 1, GLASS_HI); g.rect(P + 118, P + 9, 4, 28, Dk);   // windshield + door
      g.rect(P + 146, P + 34, 2, 3, HEAD); g.rect(P + 1, P + 34, 2, 3, TAIL);
    }
    for (const x of D.wheels) { g.disc(P + x, wy, D.r + 2, "#120E18"); wheel(g, P + x, wy, D.r); }
  }, { flip: dir < 0 });
  carCache.set(key, s); return s;
}

// ---------------------------------------------------------------- pedestrians (side view, facing right; origin = between the feet)
const SKINS = ["#F2C6A0", "#C88A5E", "#8A5634", "#E8B08A"];
export const PERSON = {
  tourist: { skin: 0, hair: "#6A3A1E", top: "#F0789A", dots: "#FFE46A", bottom: "#E8D2A0", shoe: "#F4F0E8", hat: "bucket", hatCol: "#F4E2A8", extra: "camera" },
  dress: { skin: 3, hair: "#2A1A14", top: "#FFD166", bottom: "#FFD166", shoe: "#C8605A", hat: "pony", extra: "bag", bagCol: "#F48FB8", dress: 1 },
  retiree: { skin: 1, hair: "#D8D4DC", top: "#8EE0C8", bottom: "#3A4A7A", shoe: "#F4F0E8", hat: "visor", hatCol: "#FFFFFF", socks: 1 },
  jogger: { skin: 2, hair: "#1A1014", top: "#FF9A4A", bottom: "#6A4AB0", shoe: "#7FE3F0", hat: "band", hatCol: "#F2545E", run: 1 },
  skater: { skin: 0, hair: "#C47A2A", top: "#40B8C0", bottom: "#4A5A9A", shoe: "#1E1A26", hat: "cap", hatCol: "#F2545E", skate: 1 },
  dogwalker: { skin: 1, hair: "#2A1A14", top: "#F4A6C8", bottom: "#E8E0D0", shoe: "#4A3A5A", hat: "bun", extra: "dog" },
};
export const PHASES = 16;
const pCache = new Map();
function tubeLine(g, x0, y0, x1, y1, r, col) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const t = i / n; g.disc(R(x0 + (x1 - x0) * t), R(y0 + (y1 - y0) * t), r, col); } }
const shade = (c, k) => mix(c, "#2A1838", k);

/** Person sprite: kind, scale (1 = far sidewalk ≈ 36 px, 1.5 = front sidewalk), walk phase index 0..PHASES−1, or pose "t" (front-view T-pose). */
export function personSprite(kind, s, ph, pose = "walk") {
  const key = `${kind}:${s}:${ph}:${pose}`; let sp = pCache.get(key); if (sp) return sp;
  const K = PERSON[kind], dog = K.extra === "dog", w = R((dog ? 64 : 34) * s), h = R(44 * s), ox = R((dog ? 18 : 17) * s), oy = h - 1;
  sp = makeSprite(w, h, ox, oy, (g, P) => {
    const X = (v) => P + ox + v * s, Y = (v) => P + oy + v * s, skin = SKINS[K.skin], phi = (2 * Math.PI * ph) / PHASES;
    const leg = 9, torso = 11, hr = 6.5;
    if (pose === "t") {   // front view, stiff T-pose (the classic "animation not loaded" glitch)
      const hip = -leg, top = hip - torso, hy = top - hr + 1;
      for (const sx of [-2.2, 2.2]) { tubeLine(g, X(sx), Y(hip), X(sx), Y(-1.5), Math.max(1, 1.4 * s), K.bottom === K.top ? skin : K.bottom); g.rect(R(X(sx) - 2 * s), R(Y(-1.5)), R(4 * s), R(2 * s), K.shoe); }
      g.rrect(R(X(-5)), R(Y(top)), R(10 * s), R((torso + 1) * s), K.top, 1);
      for (const sx of [-1, 1]) { tubeLine(g, X(sx * 5), Y(top + 2), X(sx * 14.5), Y(top + 2), Math.max(1, 1.3 * s), K.top); g.disc(R(X(sx * 15.5)), R(Y(top + 2)), Math.max(1, R(1.4 * s)), skin); }
      if (K.dots) for (const [a, b] of [[-3, 3], [2, 6], [-1, 9], [3, 1]]) g.px(R(X(a)), R(Y(top + b)), K.dots);
      g.disc(R(X(0)), R(Y(hy)), R(hr * s), skin);
      g.poly([[X(-hr), Y(hy - 1)], [X(-hr + 1), Y(hy - hr + 1)], [X(0), Y(hy - hr - 0.5)], [X(hr - 1), Y(hy - hr + 1)], [X(hr), Y(hy - 1)], [X(hr - 2), Y(hy - 2.5)], [X(-hr + 2), Y(hy - 2.5)]], K.hair);
      if (K.hat === "bucket") { g.rect(R(X(-hr - 2)), R(Y(hy - hr + 1)), R((2 * hr + 4) * s), R(1.6 * s), K.hatCol); g.rrect(R(X(-hr + 1)), R(Y(hy - hr - 3)), R((2 * hr - 2) * s), R(4 * s), K.hatCol, 1); }
      g.rect(R(X(-2.6)), R(Y(hy)), R(1.2 * s), R(1.4 * s), "#1E1420"); g.rect(R(X(1.6)), R(Y(hy)), R(1.2 * s), R(1.4 * s), "#1E1420");
      g.rect(R(X(-0.8)), R(Y(hy + 3)), R(1.6 * s), 1, "#7A3A3A");
      return;
    }
    const run = K.run ? 1 : 0, stride = run ? 4.6 : 3.2, bob = -Math.abs(Math.sin(phi)) * (run ? 1.6 : 0.9);
    const hip = -leg + bob, top = hip - torso, hy = top - hr + 1.5;
    // legs (back one darker), feet with shoes
    const legs = K.skate ? [[3.2, 0], [-3.4, Math.max(0, Math.sin(phi)) * 1.4]] : [0, Math.PI].map((o) => [stride * Math.sin(phi + o), Math.max(0, -Math.cos(phi + o)) * (run ? 2.6 : 1.5)]);
    const pushX = K.skate ? -3.4 - 5 * Math.max(0, Math.sin(phi)) : 0;
    if (K.skate) { legs[1][0] = pushX; legs[1][1] = Math.max(0, Math.sin(phi)) > 0.2 ? 0 : 2.5; }
    const footY = (lift) => (K.skate ? -2.6 : 0) - lift;
    const legCol = K.dress ? skin : K.bottom;
    const drawLeg = (i, dark) => { const [fx, lift] = legs[i], c = dark ? shade(legCol, 0.25) : legCol, sc = dark ? shade(K.shoe, 0.25) : K.shoe;
      tubeLine(g, X(0), Y(hip + 1), X(fx), Y(footY(lift) - 1.4), Math.max(1, 1.25 * s), c);
      if (K.socks) g.rect(R(X(fx - 1)), R(Y(footY(lift) - 3)), R(2 * s), R(1.5 * s), "#FFFFFF");
      g.rect(R(X(fx - 1.6)), R(Y(footY(lift) - 1.6)), R(4 * s), R(1.8 * s), sc); };
    if (K.skate) { g.rect(R(X(-8)), R(Y(-2.6)), R(17 * s), R(1.4 * s), "#E86A4A"); g.rect(R(X(-8)), R(Y(-2.6)), R(17 * s), 1, "#FFB08A"); for (const wx of [-5.5, 5.5]) g.disc(R(X(wx)), R(Y(-0.8)), Math.max(1, R(0.9 * s)), "#F4F0E8"); }
    drawLeg(1, true);
    // back arm
    const swing = K.skate ? 1.5 * Math.sin(phi) : (run ? 3.2 : 2.6) * Math.sin(phi + Math.PI) ;
    const shoulderY = top + 2.5, armL = run ? 6 : 7.5;
    const hand = (sw) => run ? [sw * 0.9 + 1.5, shoulderY + armL - 1.5 - Math.abs(sw) * 0.3] : [sw, shoulderY + armL];
    { const [hx, hyy] = hand(-swing); tubeLine(g, X(0), Y(shoulderY), X(hx), Y(hyy), Math.max(1, 1.1 * s), shade(K.top, 0.3)); g.disc(R(X(hx)), R(Y(hyy + 0.6)), Math.max(1, R(1 * s)), shade(skin, 0.25)); }
    drawLeg(0, false);
    // torso (a dress flares out)
    if (K.dress) g.poly([[X(-4.2), Y(top)], [X(3.8), Y(top)], [X(5.5), Y(hip + 4)], [X(-5.5), Y(hip + 4)]], K.top);
    else g.rrect(R(X(-4.3)), R(Y(top)), R(8.8 * s), R((torso + 1.5) * s), K.top, 1);
    if (!K.dress) g.rect(R(X(-4.3)), R(Y(hip)), R(8.8 * s), R(2.4 * s), K.bottom);
    if (K.dots) for (const [a, b] of [[-2, 2], [2, 4], [-1, 7], [2, 9], [0, 5]]) g.px(R(X(a)), R(Y(top + b)), K.dots);
    if (K.extra === "camera") { g.line(R(X(-3)), R(Y(top + 1)), R(X(2.5)), R(Y(top + 5)), "#2A1A20"); g.rect(R(X(2)), R(Y(top + 4.5)), R(3.4 * s), R(2.6 * s), "#2A2436"); g.px(R(X(4.4)), R(Y(top + 5.4)), "#8AB4F0"); }
    // head: skin circle, hair cap toward the back, one eye toward the front, blush
    g.disc(R(X(0.6)), R(Y(hy)), R(hr * s), skin);
    g.poly([[X(-hr + 0.2), Y(hy + 2)], [X(-hr + 0.6), Y(hy - 3)], [X(-2), Y(hy - hr - 0.4)], [X(3.5), Y(hy - hr)], [X(hr + 0.8), Y(hy - 2.5)], [X(1.5), Y(hy - 3.2)], [X(-1.5), Y(hy - 1)], [X(-3), Y(hy + 3)]], K.hair);
    const ex = R(X(3.6)), ey = R(Y(hy - 0.2)); g.rect(ex, ey, Math.max(1, R(1.1 * s)), Math.max(2, R(1.6 * s)), "#1E1420");
    g.px(ex + R(1.2 * s), ey + R(2.4 * s), "#F27A9A"); g.px(R(X(hr + 0.4)), R(Y(hy + 0.8)), skin);
    if (K.hat === "bucket") { g.rect(R(X(-hr - 1.5)), R(Y(hy - hr + 1.6)), R((2 * hr + 4.5) * s), R(1.5 * s), K.hatCol); g.rrect(R(X(-hr + 1.2)), R(Y(hy - hr - 2.4)), R((2 * hr - 1.4) * s), R(4.2 * s), K.hatCol, 1); g.rect(R(X(-hr + 1.2)), R(Y(hy - hr + 0.6)), R((2 * hr - 1.4) * s), 1, "#E07A5A"); }
    if (K.hat === "visor") { g.rect(R(X(-hr + 0.5)), R(Y(hy - hr + 1.5)), R((2 * hr) * s), R(1.4 * s), K.hatCol); g.rect(R(X(hr - 0.5)), R(Y(hy - hr + 2)), R(3.6 * s), R(1 * s), K.hatCol); }
    if (K.hat === "cap") { g.rrect(R(X(-hr + 0.8)), R(Y(hy - hr - 0.6)), R((2 * hr - 1) * s), R(3.2 * s), K.hatCol, 1); g.rect(R(X(-hr - 2.4)), R(Y(hy - hr + 1.6)), R(3.6 * s), R(1.2 * s), K.hatCol); }
    if (K.hat === "band") g.rect(R(X(-hr + 0.6)), R(Y(hy - 3.2)), R((2 * hr - 0.4) * s), R(1.3 * s), K.hatCol);
    if (K.hat === "pony" || K.hat === "band") { const sw = Math.sin(phi * (run ? 2 : 1)) * 1.4; tubeLine(g, X(-hr + 0.4), Y(hy - 2.6), X(-hr - 3.6), Y(hy + 0.6 + sw), Math.max(1, 1.2 * s), K.hair); }
    if (K.hat === "bun") g.disc(R(X(-2.5)), R(Y(hy - hr - 0.6)), Math.max(1, R(2.2 * s)), K.hair);
    // front arm (+ bag / leash)
    { const [hx, hyy] = hand(swing); tubeLine(g, X(0.4), Y(shoulderY), X(hx), Y(hyy), Math.max(1, 1.1 * s), K.top); g.disc(R(X(hx)), R(Y(hyy + 0.6)), Math.max(1, R(1 * s)), skin);
      if (K.extra === "bag") { g.rect(R(X(hx - 2)), R(Y(hyy + 1.5)), R(4.6 * s), R(4.8 * s), K.bagCol); g.rect(R(X(hx - 2)), R(Y(hyy + 1.5)), R(4.6 * s), 1, "#FFD4E6"); }
      if (dog) {   // a small white puppy trotting ahead on a red leash
        const dx = 22, dy = -4.2, dph = phi * 2;
        for (const [o, lx] of [[0, -2.6], [Math.PI, -1.6], [Math.PI, 2.6], [0, 3.6]]) { const fx = lx + 1.2 * Math.sin(dph + o); tubeLine(g, X(dx + lx), Y(dy + 1.5), X(dx + fx), Y(-0.6), Math.max(1, 0.8 * s), "#E8E2EC"); }
        g.rrect(R(X(dx - 4.6)), R(Y(dy - 2.2)), R(10 * s), R(4.4 * s), "#F8F4F8", 1);
        g.disc(R(X(dx + 6.4)), R(Y(dy - 3.6)), Math.max(2, R(2.8 * s)), "#F8F4F8"); g.rect(R(X(dx + 4.6)), R(Y(dy - 6.4)), R(2 * s), R(3.2 * s), "#B87A4A");
        g.px(R(X(dx + 7.4)), R(Y(dy - 4.2)), "#1E1420"); g.px(R(X(dx + 9)), R(Y(dy - 3.2)), "#1E1420");
        const tw = Math.sin(dph * 1.5) * 1.4; tubeLine(g, X(dx - 4.6), Y(dy - 1.2), X(dx - 7), Y(dy - 4.2 + tw), Math.max(1, 0.6 * s), "#F8F4F8");
        g.line(R(X(hx)), R(Y(hyy + 0.6)), R(X(dx + 4.2)), R(Y(dy - 1.6)), "#E0304A");
      }
    }
  });
  pCache.set(key, sp); return sp;
}

// ---------------------------------------------------------------- the console prop (our own generic tower design)
export function consoleSprite() {
  const w = 34, h = 66;
  return makeSprite(w, h, 17, h - 1, (g, P) => {
    const X = (v) => P + v, Y = (v) => P + v;
    // stand
    g.rrect(X(5), Y(61), 24, 5, "#1E1A26", 1);
    // left and right white fins (curved tops), black core with a blue light strip
    g.poly([[X(1), Y(62)], [X(1), Y(10)], [X(4), Y(4)], [X(9), Y(1)], [X(13), Y(0)], [X(13), Y(62)]], "#F4F2F8");
    g.poly([[X(21), Y(62)], [X(21), Y(0)], [X(25), Y(1)], [X(30), Y(4)], [X(33), Y(10)], [X(33), Y(62)]], "#F4F2F8");
    g.rect(X(13), Y(2), 8, 60, "#24202E"); g.rect(X(16), Y(6), 2, 44, "#5ABEFF"); g.rect(X(16), Y(6), 1, 44, "#B8E8FF");
    // fin shading (curved surface): darker band near the core
    g.rect(X(11), Y(4), 2, 58, "#C8C4D4"); g.rect(X(21), Y(4), 2, 58, "#C8C4D4"); g.rect(X(2), Y(12), 1, 50, "#FFFFFF"); g.rect(X(31), Y(12), 1, 50, "#DCD8E6");
    // power + disc slot details and the little label plate
    g.rect(X(14), Y(52), 6, 1, "#5A5470"); g.px(X(17), Y(56), "#FFFFFF");
    g.rrect(X(2), Y(53), 14, 8, "#24202E", 1); g.text(TINY, "PS5", X(4), Y(54), "#F4F2F8");
  });
}
export { mix, bayer, hex, TINY, MAIN, Canvas };
