// STREET sprites for «Fake buttons»: cars (side view) and pedestrians (side view walking, and front/back view walking for
// the crossing), drawn once into small offscreen canvases with a dark 1-px outline and a warm golden rim on top edges.
// Adapted from gta/film/levels/actors-sprites.mjs (single drawn look, New York palette: yellow cabs, sedans, a van, a bus).
import { Canvas, hex, mix, bayer, TINY, R } from "./street-kit.mjs";

const KEY = "#FF00FF", OUTC = hex("#1A0E1C"), RIMC = hex("#FFC888");

/** draw(g, P) paints into a w×h canvas (magenta = empty); origin (ox, oy) = the point that stands on the ground. */
export function makeSprite(w, h, ox, oy, draw, { rim = 1, flip = false, labels = true } = {}) {
  const P = 2, W = w + 2 * P, H = h + 2 * P, g = new Canvas(W, H, KEY), LB = [];
  draw(g, P, LB);
  if (flip) { for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { const a = (y * W + x) * 3, b = (y * W + W - 1 - x) * 3; for (let k = 0; k < 3; k++) { const v = g.d[a + k]; g.d[a + k] = g.d[b + k]; g.d[b + k] = v; } } ox = w - 1 - ox; }
  if (labels) for (const L of LB) { const x = flip ? W - L.x - L.w : L.x; g.rect(x, L.y, L.w, L.h, L.bg); g.text(L.font, L.text, x + L.dx, L.y + L.dy, L.col, { spacing: L.sp ?? 1 }); }
  const key = hex(KEY), N = W * H, m = new Uint8Array(N), d = new Uint8ClampedArray(N * 3);
  for (let i = 0; i < N; i++) if (!(g.d[i * 3] === key[0] && g.d[i * 3 + 1] === key[1] && g.d[i * 3 + 2] === key[2])) m[i] = 1;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!m[i]) { if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { m[i] = 2; d.set(OUTC, i * 3); } continue; }
    let c = [g.d[i * 3], g.d[i * 3 + 1], g.d[i * 3 + 2]];
    const up = !on(x, y - 1) ? 1 : !on(x, y - 2) ? 0.35 : 0, left = !on(x - 1, y) ? 0.4 : 0;
    const k = Math.max(up, left) * rim; if (k) c = c.map((v, j) => v + (RIMC[j] - v) * 0.4 * k);
    d.set(c, i * 3);
  }
  return { w: W, h: H, ox: ox + P, oy: oy + P, m, d };
}
/** Blit a sprite with its origin at screen (x, y); a = dissolve (dither), flip mirrors, clip x range [x0, x1). */
export function drawSprite(c, s, x, y, { a = 1, flip = false, x0 = 0, x1 = c.w, scale = 1 } = {}) {
  if (a <= 0) return;
  const d = c.d, W = c.w, H = c.h, X0 = R(x), Y0 = R(y);
  if (scale !== 1) {
    const sx = X0 - (flip ? s.w - 1 - s.ox : s.ox) * scale, sy = Y0 - s.oy * scale;
    for (let Y = Math.max(0, Math.floor(sy)); Y < Math.min(H, sy + s.h * scale); Y++) {
      const v = Math.floor((Y + 0.5 - sy) / scale); if (v < 0 || v >= s.h) continue;
      for (let X = Math.max(x0, Math.floor(sx)); X < Math.min(x1, sx + s.w * scale); X++) {
        let u = Math.floor((X + 0.5 - sx) / scale); if (u < 0 || u >= s.w) continue; if (flip) u = s.w - 1 - u;
        const i = v * s.w + u; if (!s.m[i] || (a < 1 && a <= bayer(X + 1, Y + 2))) continue;
        const p = (Y * W + X) * 3; d[p] = s.d[i * 3]; d[p + 1] = s.d[i * 3 + 1]; d[p + 2] = s.d[i * 3 + 2];
      }
    }
    return;
  }
  const bx = flip ? X0 - (s.w - 1 - s.ox) : X0 - s.ox, by = Y0 - s.oy;
  for (let v = 0; v < s.h; v++) {
    const Y = by + v; if (Y < 0 || Y >= H) continue;
    for (let u = 0; u < s.w; u++) {
      const X = bx + u; if (X < x0 || X >= x1 || X < 0 || X >= W) continue;
      const su = flip ? s.w - 1 - u : u, i = v * s.w + su; if (!s.m[i]) continue;
      if (a < 1 && a <= bayer(X + 1, Y + 2)) continue;
      const p = (Y * W + X) * 3; d[p] = s.d[i * 3]; d[p + 1] = s.d[i * 3 + 1]; d[p + 2] = s.d[i * 3 + 2];
    }
  }
}

// ---------------------------------------------------------------- cars (side view, facing right; origin = centre on the ground)
export const PAL = {
  taxi: ["#F6C632", "#FFE27A", "#C48E1A"], navy: ["#3A4E8A", "#6A82C4", "#24305A"], silver: ["#B8BCC8", "#E4E8F0", "#7E8494"],
  maroon: ["#8A2E3E", "#C25A66", "#5A1A28"], white: ["#EEEAE4", "#FFFFFF", "#ACA6B4"], teal: ["#2E8A8A", "#6AC4C0", "#1E5A60"],
  black: ["#2E2A36", "#5A566A", "#1A1820"], orange: ["#E0743A", "#F8A86A", "#A44A24"], blue: ["#2A6AC8", "#6AA4F0", "#1A4486"],
};
const GLASS = "#2B2645", GLASS_HI = "#9AA8E8", TIRE = "#1E1A26", RIMW = "#CFCBE0", HUB = "#6E6A86", HEAD = "#FFF6C8", TAIL = "#FF3A4A";
const P2 = (pts, dx, dy) => pts.map(([x, y]) => [x + dx, y + dy]);
function wheel(g, x, y, r) { g.disc(x, y, r + 1, "#120E18"); g.disc(x, y, r, TIRE); g.disc(x, y, Math.max(1, r - 2), RIMW); g.px(x, y, HUB); g.px(x - 1, y - 1, "#FFFFFF"); }
export const CAR_DIM = {
  sedan: { w: 88, h: 26, wheels: [18, 70], r: 5, head: [86, 15], tail: [1, 14] },
  taxi: { w: 86, h: 31, wheels: [17, 68], r: 6, head: [84, 21], tail: [1, 20] },
  hatch: { w: 74, h: 27, wheels: [15, 58], r: 5, head: [72, 16], tail: [1, 13] },
  van: { w: 104, h: 42, wheels: [20, 84], r: 6, head: [102, 30], tail: [1, 28] },
  bus: { w: 152, h: 52, wheels: [26, 124], r: 7, head: [150, 42], tail: [1, 40] },
};
const carCache = new Map();
export function carSprite(kind, col, dir = 1) {
  const key = kind + ":" + col + ":" + dir; let s = carCache.get(key); if (s) return s;
  const D = CAR_DIM[kind], [B, L, Dk] = PAL[col] ?? PAL.white, w = D.w, h = D.h;
  s = makeSprite(w, h, R(w / 2), h - 1, (g, P, LB) => {
    const T = (pts) => P2(pts, P, P), wy = h - 1 - D.r + P;
    if (kind === "sedan") {
      g.poly(T([[1, 22], [1, 14], [6, 12], [22, 11], [32, 4], [56, 4], [66, 11], [84, 12], [87, 15], [87, 22]]), B);
      g.poly(T([[6, 12], [22, 11], [66, 11], [84, 12], [86, 14], [6, 14]]), L);
      g.poly(T([[30, 11], [35, 5.5], [55, 5.5], [62, 11]]), GLASS); g.rect(P + 44, P + 6, 2, 5, B); g.rect(P + 36, P + 6, 7, 1, GLASS_HI);
      g.rect(P + 1, P + 19, 86, 2, Dk); g.rect(P + 44, P + 12, 1, 8, Dk); g.rect(P + 50, P + 14, 4, 1, Dk);
      g.rect(P + 84, P + 14, 3, 2, HEAD); g.rect(P + 1, P + 14, 2, 2, TAIL);
    } else if (kind === "taxi") {   // NYC yellow cab: roof light, checker band, number on the door
      g.poly(T([[1, 27], [1, 18], [14, 17], [22, 10], [56, 10], [64, 17], [83, 18], [85, 21], [85, 27]]), B);
      g.poly(T([[24, 16], [28, 11.5], [52, 11.5], [58, 16]]), GLASS); g.rect(P + 40, P + 12, 2, 4, B); g.rect(P + 29, P + 12, 8, 1, GLASS_HI);
      for (let x = 2; x < 84; x += 2) { g.rect(P + x, P + 20, 1, 1, (x / 2) % 2 ? "#1E1A26" : "#FFFFFF"); g.rect(P + x + 1, P + 20, 1, 1, (x / 2) % 2 ? "#FFFFFF" : "#1E1A26"); g.rect(P + x, P + 21, 1, 1, (x / 2) % 2 ? "#FFFFFF" : "#1E1A26"); g.rect(P + x + 1, P + 21, 1, 1, (x / 2) % 2 ? "#1E1A26" : "#FFFFFF"); }
      g.rect(P + 1, P + 25, 84, 2, Dk); g.rect(P + 38, P + 12, 1, 13, Dk);
      g.rect(P + 33, P + 7, 15, 3, "#FFF4C8"); g.rect(P + 33, P + 9, 15, 1, Dk);
      LB.push({ x: P + 46, y: P + 14, w: 9, h: 5, bg: B, font: TINY, text: "7", dx: 3, dy: 0, col: "#2A1A08" });
      g.rect(P + 82, P + 19, 3, 2, HEAD); g.rect(P + 1, P + 19, 2, 2, TAIL);
    } else if (kind === "hatch") {
      g.poly(T([[1, 23], [1, 10], [6, 5], [40, 4], [52, 11], [70, 13], [73, 16], [73, 23]]), B);
      g.poly(T([[8, 11], [10, 6.5], [38, 6], [48, 11]]), GLASS); g.rect(P + 26, P + 6, 2, 5, B); g.rect(P + 12, P + 7, 8, 1, GLASS_HI);
      g.rect(P + 1, P + 13, 72, 2, L); g.rect(P + 1, P + 20, 72, 2, Dk); g.rect(P + 70, P + 15, 3, 2, HEAD); g.rect(P + 1, P + 12, 2, 3, TAIL);
    } else if (kind === "van") {    // white delivery van (box body, no logo)
      g.rrect(P + 1, P + 2, 74, 36, B, 1); g.poly(T([[75, 38], [75, 10], [88, 10], [98, 22], [103, 26], [103, 38]]), B);
      g.poly(T([[78, 21], [78, 12], [87, 12], [95, 21]]), GLASS); g.rect(P + 80, P + 13, 4, 1, GLASS_HI);
      g.rect(P + 1, P + 32, 102, 2, L); g.rect(P + 1, P + 36, 102, 2, Dk); g.rect(P + 75, P + 10, 1, 28, Dk);
      for (let x = 6; x < 72; x += 22) g.rect(P + x, P + 6, 1, 26, mix(B, Dk, 0.4));
      g.rect(P + 100, P + 28, 3, 2, HEAD); g.rect(P + 1, P + 28, 2, 3, TAIL);
    } else if (kind === "bus") {    // city bus (blue stripe, passengers)
      g.rrect(P + 1, P + 2, 149, 43, B, 2); g.rect(P + 1, P + 32, 149, 4, L); g.rect(P + 1, P + 40, 149, 4, Dk);
      LB.push({ x: P + 128, y: P + 3, w: 21, h: 7, bg: "#1E1A26", font: TINY, text: "M15", dx: 4, dy: 1, col: "#FFB040", sp: 1 });
      for (let i = 0; i < 8; i++) { const x = P + 8 + i * 14; g.rect(x, P + 10, 11, 14, GLASS); g.rect(x + 1, P + 11, 4, 1, GLASS_HI);
        if ([0, 2, 3, 5, 7].includes(i)) { g.disc(x + 6, P + 19, 3, ["#E8B08A", "#C88A5E", "#F2C6A0", "#8A5634"][i % 4]); g.rect(x + 3, P + 15, 7, 2, ["#3A2A20", "#F4D06A", "#5A3A8A", "#C46A3A"][i % 4]); g.rect(x + 3, P + 22, 7, 2, ["#F48FB8", "#7EE0C0", "#FFD166", "#B49AF0"][i % 4]); } }
      g.rect(P + 126, P + 9, 22, 22, GLASS); g.rect(P + 128, P + 10, 8, 1, GLASS_HI); g.rect(P + 120, P + 10, 4, 30, Dk);
      g.rect(P + 148, P + 36, 2, 3, HEAD); g.rect(P + 1, P + 36, 2, 3, TAIL);
    }
    for (const x of D.wheels) { g.disc(P + x, wy, D.r + 2, "#120E18"); wheel(g, P + x, wy, D.r); }
  }, { flip: dir < 0 });
  carCache.set(key, s); return s;
}

// ---------------------------------------------------------------- pedestrians
const SKINS = ["#F2C6A0", "#C88A5E", "#8A5634", "#E8B08A"];
export const PERSON = {
  tote: { skin: 3, hair: "#2A1A14", top: "#E8A23A", bottom: "#3A4A7A", shoe: "#F4F0E8", hat: "bun", extra: "tote", bagCol: "#F4E8D0" },
  cap: { skin: 1, hair: "#1A1014", top: "#3E8A6A", bottom: "#2A2A3A", shoe: "#E8E4DC", hat: "cap", hatCol: "#C8343A" },
  suit: { skin: 0, hair: "#6A3A1E", top: "#3A3E5A", bottom: "#2A2E44", shoe: "#1E1A26", hat: "none", extra: "case" },
  lady: { skin: 0, hair: "#D8D4DC", top: "#B85A8A", bottom: "#B85A8A", shoe: "#5A2A3A", hat: "beret", hatCol: "#5A3A8A", dress: 1 },
  phones: { skin: 2, hair: "#1A1014", top: "#F2EEE6", bottom: "#4A5A8A", shoe: "#C8343A", hat: "phones", hatCol: "#2A2A3A" },
  jogger: { skin: 1, hair: "#2A1A14", top: "#FF7A5A", bottom: "#2A2A3A", shoe: "#7FE3F0", hat: "band", hatCol: "#FFE15A", run: 1 },
  kid: { skin: 3, hair: "#8A4A1E", top: "#5AB4F0", bottom: "#E8C840", shoe: "#C8343A", hat: "none", extra: "pack", bagCol: "#C8343A" },
};
export const PHASES = 16;
const pCache = new Map();
function tubeLine(g, x0, y0, x1, y1, r, col) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i <= n; i++) { const t = i / n; g.disc(R(x0 + (x1 - x0) * t), R(y0 + (y1 - y0) * t), r, col); } }
const dim = (c, k) => mix(c, "#2A1838", k);
function hatOn(g, K, X, Y, hy, hr, s, front) {
  if (K.hat === "cap") { g.rrect(R(X(-hr + 0.8)), R(Y(hy - hr - 0.6)), R((2 * hr - 1) * s), R(3.2 * s), K.hatCol, 1); if (!front) g.rect(R(X(hr - 1)), R(Y(hy - hr + 1.6)), R(3.6 * s), R(1.2 * s), K.hatCol); else g.rect(R(X(-hr + 1)), R(Y(hy - hr + 2)), R((2 * hr - 2) * s), R(1.2 * s), dim(K.hatCol, 0.3)); }
  if (K.hat === "beret") { g.rrect(R(X(-hr - 0.5)), R(Y(hy - hr - 1.4)), R((2 * hr + 1.5) * s), R(3.6 * s), K.hatCol, 1); g.px(R(X(0.5)), R(Y(hy - hr - 2.2)), K.hatCol); }
  if (K.hat === "band") g.rect(R(X(-hr + 0.6)), R(Y(hy - 3.2)), R((2 * hr - 0.4) * s), R(1.3 * s), K.hatCol);
  if (K.hat === "bun") g.disc(R(X(front ? 0.6 : -2.5)), R(Y(hy - hr - 0.8)), Math.max(1, R(2.2 * s)), K.hair);
  if (K.hat === "phones") { for (let a = 0; a <= 10; a++) { const an = Math.PI * (a / 10); g.px(R(X(0.6 - Math.cos(an) * (hr + 0.6))), R(Y(hy - Math.sin(an) * (hr + 0.8))), K.hatCol); } for (const sx of front ? [-hr - 0.4, hr + 0.2] : [-0.8]) g.rrect(R(X(sx)), R(Y(hy - 1.5)), R(2.4 * s), R(3.4 * s), "#E0303E", 1); }
}

/** Side-view walker: kind, scale, walk phase 0..PHASES−1 (faces right; mirror when drawing). */
export function personSprite(kind, s, ph) {
  const key = `S:${kind}:${s}:${ph}`; let sp = pCache.get(key); if (sp) return sp;
  const K = PERSON[kind], w = R(34 * s), h = R(44 * s), ox = R(17 * s), oy = h - 1;
  sp = makeSprite(w, h, ox, oy, (g, P) => {
    const X = (v) => P + ox + v * s, Y = (v) => P + oy + v * s, skin = SKINS[K.skin], phi = (2 * Math.PI * ph) / PHASES;
    const leg = 9, torso = 11, hr = 6.5, run = K.run ? 1 : 0, stride = run ? 4.6 : 3.2, bob = -Math.abs(Math.sin(phi)) * (run ? 1.6 : 0.9);
    const hip = -leg + bob, top = hip - torso, hy = top - hr + 1.5;
    const legs = [0, Math.PI].map((o) => [stride * Math.sin(phi + o), Math.max(0, -Math.cos(phi + o)) * (run ? 2.6 : 1.5)]);
    const legCol = K.dress ? skin : K.bottom;
    const drawLeg = (i, dark) => { const [fx, lift] = legs[i], c = dark ? dim(legCol, 0.25) : legCol, sc = dark ? dim(K.shoe, 0.25) : K.shoe; tubeLine(g, X(0), Y(hip + 1), X(fx), Y(-lift - 1.4), Math.max(1, 1.25 * s), c); g.rect(R(X(fx - 1.6)), R(Y(-lift - 1.6)), R(4 * s), R(1.8 * s), sc); };
    drawLeg(1, true);
    const swing = (run ? 3.2 : 2.6) * Math.sin(phi + Math.PI), shoulderY = top + 2.5, armL = run ? 6 : 7.5;
    const hand = (sw) => run ? [sw * 0.9 + 1.5, shoulderY + armL - 1.5 - Math.abs(sw) * 0.3] : [sw, shoulderY + armL];
    { const [hx, hyy] = hand(-swing); tubeLine(g, X(0), Y(shoulderY), X(hx), Y(hyy), Math.max(1, 1.1 * s), dim(K.top, 0.3)); g.disc(R(X(hx)), R(Y(hyy + 0.6)), Math.max(1, R(1 * s)), dim(skin, 0.25)); }
    if (K.extra === "pack") g.rrect(R(X(-7.5)), R(Y(top + 1)), R(4 * s), R(8 * s), K.bagCol, 1);
    drawLeg(0, false);
    if (K.dress) g.poly([[X(-4.2), Y(top)], [X(3.8), Y(top)], [X(5.5), Y(hip + 4)], [X(-5.5), Y(hip + 4)]], K.top);
    else { g.rrect(R(X(-4.3)), R(Y(top)), R(8.8 * s), R((torso + 1.5) * s), K.top, 1); g.rect(R(X(-4.3)), R(Y(hip)), R(8.8 * s), R(2.4 * s), K.bottom); }
    g.disc(R(X(0.6)), R(Y(hy)), R(hr * s), skin);
    g.poly([[X(-hr + 0.2), Y(hy + 2)], [X(-hr + 0.6), Y(hy - 3)], [X(-2), Y(hy - hr - 0.4)], [X(3.5), Y(hy - hr)], [X(hr + 0.8), Y(hy - 2.5)], [X(1.5), Y(hy - 3.2)], [X(-1.5), Y(hy - 1)], [X(-3), Y(hy + 3)]], K.hair);
    const ex = R(X(3.6)), ey = R(Y(hy - 0.2)); g.rect(ex, ey, Math.max(1, R(1.1 * s)), Math.max(2, R(1.6 * s)), "#1E1420"); g.px(ex + R(1.2 * s), ey + R(2.4 * s), "#F27A9A");
    hatOn(g, K, X, Y, hy, hr, s, false);
    { const [hx, hyy] = hand(swing); tubeLine(g, X(0.4), Y(shoulderY), X(hx), Y(hyy), Math.max(1, 1.1 * s), K.top); g.disc(R(X(hx)), R(Y(hyy + 0.6)), Math.max(1, R(1 * s)), skin);
      if (K.extra === "tote") { g.rect(R(X(hx - 2.5)), R(Y(hyy + 1)), R(5.5 * s), R(6 * s), K.bagCol); g.rect(R(X(hx - 2.5)), R(Y(hyy + 1)), R(5.5 * s), 1, "#FFFFFF"); }
      if (K.extra === "case") { g.rect(R(X(hx - 3)), R(Y(hyy + 1)), R(6.5 * s), R(4.5 * s), "#5A3A26"); g.rect(R(X(hx - 1)), R(Y(hyy)), R(2.5 * s), 1, "#2A1A10"); } }
  });
  pCache.set(key, sp); return sp;
}

/** Front-view (toward us) or back-view (away from us) walker for the crossing: legs alternate, arms swing a little. */
export function personFront(kind, s, ph, back = false) {
  const key = `F:${kind}:${s}:${ph}:${back}`; let sp = pCache.get(key); if (sp) return sp;
  const K = PERSON[kind], w = R(26 * s), h = R(44 * s), ox = R(13 * s), oy = h - 1;
  sp = makeSprite(w, h, ox, oy, (g, P) => {
    const X = (v) => P + ox + v * s, Y = (v) => P + oy + v * s, skin = SKINS[K.skin], phi = (2 * Math.PI * ph) / PHASES;
    const leg = 9, torso = 11, hr = 6.5, lift = (o) => Math.max(0, Math.sin(phi + o)) * 2.2, bob = -Math.abs(Math.sin(phi)) * 0.8;
    const hip = -leg + bob, top = hip - torso, hy = top - hr + 1.5, legCol = K.dress ? skin : K.bottom;
    // legs: the lifted one is shorter (coming toward / going away), shoes
    for (const [sx, o] of [[-2.3, 0], [2.3, Math.PI]]) {
      const l = lift(o), c = l > 0.3 ? dim(legCol, 0.15) : legCol;
      tubeLine(g, X(sx), Y(hip + 1), X(sx), Y(-l - 1.6), Math.max(1, 1.3 * s), c);
      g.rect(R(X(sx - 1.8)), R(Y(-l - 1.8)), R(3.8 * s), R(back ? 1.6 * s : 2 * s), l > 0.3 ? dim(K.shoe, 0.2) : K.shoe);
    }
    // arms (swing = hands move up/down a little, opposite to the legs)
    const sw = Math.sin(phi) * 1.4;
    for (const [sx, dir] of [[-5.6, 1], [5.6, -1]]) { const hyy = top + 9.5 + sw * dir; tubeLine(g, X(sx), Y(top + 2), X(sx * 1.08), Y(hyy), Math.max(1, 1.1 * s), dim(K.top, 0.12)); g.disc(R(X(sx * 1.08)), R(Y(hyy + 0.8)), Math.max(1, R(1.05 * s)), skin); }
    if (K.extra === "tote") { const hyy = top + 9.5 - sw; g.rect(R(X(5.2)), R(Y(hyy + 1)), R(4.5 * s), R(6 * s), K.bagCol); }
    if (K.extra === "case") { const hyy = top + 9.5 + sw; g.rect(R(X(-8.6)), R(Y(hyy + 1)), R(4.5 * s), R(5 * s), "#5A3A26"); }
    // torso
    if (K.dress) g.poly([[X(-4.6), Y(top)], [X(4.6), Y(top)], [X(6), Y(hip + 4)], [X(-6), Y(hip + 4)]], K.top);
    else { g.rrect(R(X(-5)), R(Y(top)), R(10 * s), R((torso + 1.5) * s), back ? dim(K.top, 0.1) : K.top, 1); g.rect(R(X(-5)), R(Y(hip)), R(10 * s), R(2.4 * s), K.bottom); }
    if (K.extra === "pack" && back) g.rrect(R(X(-4)), R(Y(top + 1)), R(8 * s), R(8 * s), K.bagCol, 1);
    // head
    g.disc(R(X(0)), R(Y(hy)), R(hr * s), back ? K.hair : skin);
    if (!back) {
      g.poly([[X(-hr), Y(hy - 0.5)], [X(-hr + 1), Y(hy - hr + 1)], [X(0), Y(hy - hr - 0.6)], [X(hr - 1), Y(hy - hr + 1)], [X(hr), Y(hy - 0.5)], [X(hr - 2), Y(hy - 2.6)], [X(-hr + 2), Y(hy - 2.6)]], K.hair);
      g.rect(R(X(-2.6)), R(Y(hy)), Math.max(1, R(1.2 * s)), Math.max(2, R(1.5 * s)), "#1E1420"); g.rect(R(X(1.6)), R(Y(hy)), Math.max(1, R(1.2 * s)), Math.max(2, R(1.5 * s)), "#1E1420");
      g.px(R(X(-3.8)), R(Y(hy + 2)), "#F27A9A"); g.px(R(X(3.6)), R(Y(hy + 2)), "#F27A9A"); g.rect(R(X(-0.8)), R(Y(hy + 3)), Math.max(1, R(1.6 * s)), 1, "#8A3A3A");
    } else { g.rect(R(X(-hr + 1)), R(Y(hy + hr - 2.2)), R((2 * hr - 2) * s), R(1.2 * s), mix(K.hair, skin, 0.5)); }
    hatOn(g, K, X, Y, hy, hr, s, true);
  });
  pCache.set(key, sp); return sp;
}
export { mix, bayer };
