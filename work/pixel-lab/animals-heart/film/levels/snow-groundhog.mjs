// The LV2 groundhog in the reference style (chibi, facing the camera, glossy eyes with two highlights, dithered blush,
// dark selective outline, volume shading): standing on its hind legs with its paws folded at the chest, and curled up
// asleep in a ball. (x, y) = screen point between the feet / bottom centre of the ball. Static parts are memoised
// sprites (keyed by squash/scale), the face is drawn per frame so blinks, looks and the sleepy face stay continuous.
import { blob, flat, ell, tube, bez, eye, blush, mouthW, smile, RAMP, fade, mix, bayer, lerp, clamp01 } from "../cute.mjs";
import { spriteCache, R } from "./snow-kit.mjs";

export const FUR = ["#1A0C06", "#36200E", "#5A3818", "#7C5226", "#9C6C34", "#B88848", "#D2A564", "#E8C488"];
export const BELLY = ["#3A2212", "#6A4626", "#966C40", "#B88E5C", "#D2AE7E", "#E6CA9E", "#F4E2C0", "#FCF2DE"];
export const DARK = ["#0E0805", "#1E120A", "#2E1C10", "#422A18", "#583A22", "#704C2E", "#8A603C", "#A4784E"];
const IRIS = ["#0E0604", "#24140A", "#3E2412", "#5C381C", "#7A4E28", "#9A6838", "#BC8A52", "#DCB078"];
const OUT = "#140A06", LIT = "#F8CDB4";
const sprites = spriteCache(24);

/** Standing groundhog. o: sq (0 stand → 1 crouched), lean (−1..1 body sway while waddling), step (walk phase 0..1),
 *  walk (0..1 amount), look [dx, dy], blink, a (dissolve), breathe (−1..1), yawn (0..1). */
export function drawStand(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const sq = clamp01(o.sq ?? 0), walk = o.walk ?? 0, ph = o.step ?? 0, br = o.breathe ?? 0;
  const sy = 1 - 0.42 * sq, wob = Math.sin(2 * Math.PI * ph) * walk, hop = Math.abs(Math.sin(2 * Math.PI * ph)) * walk * 3;
  const lean = (o.lean ?? 0) * 6 + wob * 3;
  // feet (step alternately while walking)
  for (const sd of [-1, 1]) {
    const lift = Math.max(0, Math.sin(2 * Math.PI * ph + (sd > 0 ? Math.PI : 0))) * walk * 5;
    blob(c, [ell(x + sd * 30, y - 6 - lift, 22, 10)], { ramp: DARK, thick: 5, base: 3.6, outline: OUT, a });
    const g = fade(c, a); for (const k of [-1, 0, 1]) g.px(R(x + sd * 30 + k * 7 + sd * 2), R(y - 1 - lift), "#E8D8C0");
  }
  // tail (behind, right) — a short bushy paddle
  const bodyKey = `b${R(sq * 12)}`, by = y - hop;
  const body = sprites(bodyKey, 260, 280, 130, 270, (g, ox, oy) => {
    const P = (dx, dy) => [ox + dx, oy + dy * sy];
    // short bushy tail peeking out at the right
    blob(g, [tube(bez(P(40, -24), P(74, -40), P(92, -20), 8), 16, 13)], { ramp: DARK, thick: 8, base: 3.5, outline: OUT, litOutline: LIT });
    for (const [dx, dy] of [[84, -30], [90, -22], [78, -36], [93, -27]]) { const p = P(dx, dy); g.px(R(p[0]), R(p[1]), DARK[7]); }
    // chubby pear body, no neck: wide shoulders carry the head
    blob(g, [ell(...P(0, -66), 80, 66 * sy), ell(...P(0, -146), 70, 72 * sy), ell(...P(0, -196), 62, 34 * sy)], { ramp: FUR, thick: 34, base: 2.9, gain: 2.4, slope: 1.0, outline: OUT, litOutline: LIT });
    blob(g, [ell(...P(0, -88), 46, 56 * sy)], { ramp: BELLY, thick: 22, base: 3.0, gain: 2.0, outline: FUR[3], rimLit: 0.3, rimShade: 0.4 });
    // grizzled fur ticks on the flanks
    for (let i = 0; i < 80; i++) { const u = (i * 0.618) % 1, v = (i * 0.381) % 1, sd = i % 2 ? 1 : -1, dx = sd * (52 + u * 20) * (1 - v * 0.3), dy = -30 - v * 170; const p = P(dx, dy); const q = g.get(R(p[0]), R(p[1])); if (q[0] + q[1] + q[2] > 0 && q[0] !== 0x14) g.px(R(p[0]), R(p[1]), i % 3 ? FUR[6] : FUR[2]); }
  });
  body.blit(c, R(x + lean * 0.4), R(by + br * 0.6), { a });
  // head (wide, chubby cheeks) with ears, dark crown, cream muzzle
  const hy = by - 248 * sy - 4 * sq + br, hx = x + lean;
  const head = sprites("h", 200, 150, 100, 80, (g, ox, oy) => {
    for (const sd of [-1, 1]) { blob(g, [ell(ox + sd * 44, oy - 38, 15, 13)], { ramp: FUR, thick: 6, base: 3.0, outline: OUT, litOutline: LIT }); flat(g, [ell(ox + sd * 44, oy - 36, 7, 6)], "#6A3A2A"); }
    blob(g, [ell(ox, oy, 60, 48), ell(ox - 38, oy + 18, 32, 26), ell(ox + 38, oy + 18, 32, 26)], { ramp: FUR, thick: 26, base: 3.0, gain: 2.2, outline: OUT, litOutline: LIT });
    // darker crown: a soft cap on the top of the head
    for (let Y = oy - 48; Y <= oy - 16; Y++) for (let X = ox - 46; X <= ox + 46; X++) { const d = ((X - ox) / 42) ** 2 + ((Y - oy + 34) / 18) ** 2; if (d < 1 && (1 - d) * 2.2 > bayer(X, Y) + 0.4) { const q = g.get(X, Y); if (q[0] > 40 && q[0] !== 0x14) g.px(X, Y, mix(q, DARK[3], 0.5)); } }
    // cream muzzle and cheeks
    blob(g, [ell(ox, oy + 22, 28, 19), ell(ox - 15, oy + 26, 17, 12), ell(ox + 15, oy + 26, 17, 12)], { ramp: BELLY, thick: 10, base: 4.1, gain: 1.6, outline: FUR[2], rimLit: 0.2, rimShade: 0.3 });
    // whiskers
    for (const sd of [-1, 1]) { g.line(ox + sd * 26, oy + 24, ox + sd * 56, oy + 18, "#F4E2C0"); g.line(ox + sd * 26, oy + 28, ox + sd * 56, oy + 31, "#F4E2C0"); }
  });
  head.blit(c, R(hx), R(hy), { a });
  face(c, hx, hy, o, a);
  // short chubby arms folded at the chest, paws touching (in front of the body)
  const sh = by - 176 * sy + br;
  for (const sd of [-1, 1]) {
    const s0 = [x + lean * 0.6 + sd * 46, sh - 4], p1 = [x + lean * 0.7 + sd * 13, sh + 26 - sq * 8];
    blob(c, [tube(bez(s0, [s0[0] + sd * 10, sh + 26], p1, 8), 14, 11), ell(s0[0], s0[1] + 2, 14, 14)], { ramp: FUR, thick: 9, base: 3.3, gain: 1.8, outline: OUT, litOutline: LIT, a });
    blob(c, [ell(p1[0], p1[1] + 2, 12, 10)], { ramp: DARK, thick: 5, base: 3.8, outline: OUT, a });
    const g = fade(c, a); for (const k of [-5, 0, 5]) g.px(R(p1[0] + k), R(p1[1] + 11), "#E8D8C0");
  }
}

/** Face of the standing groundhog at head centre (hx, hy). */
function face(c, hx, hy, o, a) {
  const g = fade(c, a), look = o.look ?? [0, 0.1], blink = o.blink ?? 0, yawn = o.yawn ?? 0;
  for (const sd of [-1, 1]) eye(c, hx + sd * 24, hy - 6, 10, { ry: 11, iris: IRIS, pupil: "round", look, blink: Math.max(blink, yawn * 0.8), lid: FUR[4], outline: OUT, a });
  blush(c, hx - 39, hy + 12, 10, 5, "#F27A9A", a); blush(c, hx + 39, hy + 12, 10, 5, "#F27A9A", a);
  // nose: dark rounded triangle with a highlight
  for (let j = 0; j < 6; j++) { const half = R(7 - j * 1.1); g.rect(R(hx - half), R(hy + 10 + j), half * 2 + 1, 1, j === 0 ? "#6A4A40" : "#24140E"); }
  g.px(R(hx - 3), R(hy + 11), "#C8A8A0"); g.px(R(hx - 2), R(hy + 11), "#C8A8A0");
  if (yawn > 0.05) { smile(g, hx, hy + 20, 6, { open: yawn, col: OUT, tongue: "#E86A88" }); }
  else { mouthW(c, hx, hy + 18, OUT, 4, a); }
  // two big front teeth
  const ty = R(hy + 21 + (yawn > 0.05 ? yawn * 6 : 0));
  g.rect(R(hx - 4), ty, 4, 6, OUT); g.rect(R(hx + 1), ty, 4, 6, OUT); g.rect(R(hx - 3), ty, 3, 5, "#FFFDF4"); g.rect(R(hx + 1), ty, 3, 5, "#FFFDF4"); g.px(R(hx - 3), ty + 4, "#D8D0C0"); g.px(R(hx + 3), ty + 4, "#D8D0C0");
}

/** Curled-up sleeping groundhog (ball), bottom centre at (x, y). o: eyes (0 open → 1 shut), breathe, frost 0..1,
 *  fat 0..1 (golden glow inside), a, look. */
export function drawSleep(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const br = o.breathe ?? 0, s = sprites("ball", 220, 150, 110, 140, (g, ox, oy) => {
    // body ball with the back hump, the tail wrapped round the front
    blob(g, [ell(ox + 8, oy - 54, 86, 54), ell(ox + 28, oy - 66, 62, 50)], { ramp: FUR, thick: 34, base: 2.9, gain: 2.4, outline: OUT, litOutline: LIT });
    for (let i = 0; i < 90; i++) { const u = (i * 0.618) % 1, v = (i * 0.381) % 1, px = ox + 8 + (u - 0.5) * 150, py = oy - 54 + (v - 0.5) * 80; if (((px - ox - 8) / 80) ** 2 + ((py - oy + 54) / 48) ** 2 < 0.8) g.px(R(px), R(py), i % 3 ? FUR[6] : FUR[2]); }
    blob(g, [tube(bez([ox + 86, oy - 30], [ox + 74, oy + 2], [ox + 6, oy - 4], 10), 15, 11)], { ramp: FUR, thick: 8, base: 2.6, outline: OUT, litOutline: LIT });
    for (const [dx, dy] of [[20, -6], [34, -4], [48, -6], [62, -10]]) g.px(ox + dx, oy + dy, FUR[6]);
  });
  s.blit(c, R(x), R(y + br * 0.5), { a });
  // head tucked at the front-left, turned to the camera, eyes closing into happy sleeping arcs
  const hx = R(x - 34), hy = R(y - 46 + br * 0.4), h = sprites("sleephead", 150, 120, 75, 64, (g, ox, oy) => {
    for (const [dx, dy] of [[-34, -34], [30, -38]]) { blob(g, [ell(ox + dx, oy + dy, 12, 10)], { ramp: FUR, thick: 5, base: 3.0, outline: OUT, litOutline: LIT }); flat(g, [ell(ox + dx, oy + dy + 2, 5, 4)], "#6A3A2A"); }
    blob(g, [ell(ox, oy, 46, 38), ell(ox - 28, oy + 14, 22, 18), ell(ox + 28, oy + 14, 22, 18)], { ramp: FUR, thick: 20, base: 3.1, gain: 2.0, outline: OUT, litOutline: LIT });
    for (let Y = oy - 38; Y <= oy - 8; Y++) for (let X = ox - 38; X <= ox + 38; X++) { const d = ((X - ox) / 36) ** 2 + ((Y - oy + 24) / 18) ** 2; if (d < 1 && (1 - d) * 1.4 > bayer(X, Y) && g.get(X, Y)[0] > 40) g.px(X, Y, mix(g.get(X, Y), DARK[3], 0.55)); }
    blob(g, [ell(ox, oy + 18, 22, 15), ell(ox - 11, oy + 22, 13, 10), ell(ox + 11, oy + 22, 13, 10)], { ramp: BELLY, thick: 9, base: 4.1, gain: 1.6, outline: FUR[2], rimLit: 0.2, rimShade: 0.3 });
    for (const sd of [-1, 1]) { g.line(ox + sd * 20, oy + 20, ox + sd * 42, oy + 15, "#F4E2C0"); g.line(ox + sd * 20, oy + 23, ox + sd * 42, oy + 25, "#F4E2C0"); }
    // paws tucked under the chin
    for (const sd of [-1, 1]) blob(g, [ell(ox + sd * 14, oy + 40, 11, 8)], { ramp: DARK, thick: 5, base: 3.8, outline: OUT });
  });
  h.blit(c, hx, hy, { a });
  const g = fade(c, a), shut = clamp01(o.eyes ?? 1);
  for (const sd of [-1, 1]) {
    const ex = hx + sd * 19, ey = hy - 4;
    if (shut < 0.98) eye(c, ex, ey, 8, { ry: 9, iris: IRIS, pupil: "round", look: o.look ?? [0, 0.2], blink: shut, lid: FUR[4], outline: OUT, a });
    if (shut > 0.6) { const k = (shut - 0.6) / 0.4, gg = fade(c, a * k); for (let X = -7; X <= 7; X++) { const u = X / 7, yy = R(ey + 1 + 3 * (1 - u * u)); gg.px(ex + X, yy, OUT); if (Math.abs(X) < 6) gg.px(ex + X, yy + 1, OUT); } for (const k2 of [-1, 1]) gg.px(ex + k2 * 8, ey, OUT); }
  }
  blush(c, hx - 32, hy + 10, 9, 4, "#F27A9A", a); blush(c, hx + 32, hy + 10, 9, 4, "#F27A9A", a);
  for (let j = 0; j < 5; j++) { const half = R(6 - j * 1.2); g.rect(R(hx - half), R(hy + 8 + j), half * 2 + 1, 1, j === 0 ? "#6A4A40" : "#24140E"); }
  mouthW(c, hx, hy + 15, OUT, 3, a);
  g.rect(hx - 3, hy + 17, 3, 4, OUT); g.rect(hx + 1, hy + 17, 3, 4, OUT); g.rect(hx - 2, hy + 17, 2, 3, "#FFFDF4"); g.rect(hx + 1, hy + 17, 2, 3, "#FFFDF4");
  // frost on the fur (small crystals just inside the top of the ball and on the head) as the body cools
  const fr = clamp01(o.frost ?? 0);
  if (fr > 0) for (let i = 0; i < 26; i++) {
    if (fr <= ((i * 0.7548) % 1)) continue;
    const u = ((i * 0.618 + 0.11) % 1) * 2 - 1, onHead = i % 4 === 0, cx0 = onHead ? x - 34 : x + 8, rx = onHead ? 40 : 82, ry = onHead ? 34 : 50, cy0 = onHead ? y - 46 : y - 58;
    const px = R(cx0 + u * rx * 0.8), py = R(cy0 - ry * Math.sqrt(Math.max(0, 1 - u * u * 0.64)) + 5 + ((i * 0.381) % 1) * 5), gg = fade(c, Math.min(1, (fr - ((i * 0.7548) % 1)) * 4) * a);
    gg.px(px, py, "#F4FAFF"); gg.px(px - 1, py, "#C8E0F8"); gg.px(px + 1, py, "#C8E0F8"); gg.px(px, py - 1, "#C8E0F8"); gg.px(px, py + 1, "#C8E0F8");
  }
  // fat reserve: a warm golden glow inside the body (dithered, pulsing slowly)
  const fat = clamp01(o.fat ?? 0);
  if (fat > 0) {
    const cx = x + 22, cy = y - 58, rx = 52, ry = 30, pulseK = o.fatPulse ?? 0.5;
    for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) {
      const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (d > 1) continue;
      const k = fat * (1 - d) * (0.75 + 0.25 * pulseK);
      if (k * 1.3 > bayer(X, Y)) { const p = c.get(X, Y); if (p[0] + p[1] < 60) continue; c.px(X, Y, mix(p, d < 0.35 ? "#FFE98A" : "#FFB848", 0.35 + 0.35 * (1 - d))); }
    }
  }
}
