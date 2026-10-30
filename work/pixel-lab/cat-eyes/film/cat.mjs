// The world of «Why your cat's eyes glow»: the user's reference — a cute black cat facing the camera on a ledge under a
// full moon, a city behind — drawn with the cute-animal kit (animals/film/cute.mjs) through a zooming camera, plus our
// own eye: amber iris, a pupil that goes continuously from a thin slit to a full circle, and the green eyeshine the
// tapetum sends back. Also the phone in the hero's yellow mitten (touch film) with its flashlight beam.
// Camera: world = the cat-test layout at z = 1; screen = (270 + (x − cx)·z, 360 + (y − cy)·z). Layers with parallax p.
import { mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";
import { drawSky } from "../../animals/film/world.mjs";
import { blob, flat, ell, tube, bez, blush, mouthW, nose, shadow, RAMP } from "../../animals/film/cute.mjs";
import { drawPart } from "../../dog/shade.mjs";
import { MITT, COAT } from "../../touch/film/hero.mjs";
import { smooth as spline } from "../../dog/shade.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;
export const SY = 360;
export function layer(cam, p) {
  const z = 1 + (cam.z - 1) * p, cx = 270 + (cam.cx - 270) * p, cy = 480 + (cam.cy - 480) * p;
  return { z, X: (x) => 270 + (x - cx) * z, Y: (y) => SY + (y - cy) * z };
}
// sky time-of-day through the shared world: tod 6 = night (reference), 2 = clear day
const TOD_CX = (tod) => (tod >= 6 ? 4590 : tod <= 2 ? 1890 : lerp(1890, 4590, (tod - 2) / 4));

// ---------------------------------------------------------------- moon / sun disc (with the reference's soft halo)
function disc(c, x, y, r, tod, a = 1) {
  const n = clamp01((tod - 2) / 4), core = mix("#FFFDF0", "#F8E8BC", n), rim = mix("#FFE9A0", "#E6CE96", n), glow = mix("#FFF4C8", "#7A64B4", n), crater = "#D6BA86";
  for (let Y = R(y - r - 28); Y <= R(y + r + 28); Y++) for (let X = R(x - r - 28); X <= R(x + r + 28); X++) {
    const dd = Math.hypot(X - x, Y - y) - r;
    if (dd > 0 && dd < 28) { const k = (1 - dd / 28) ** 1.6 * 0.55 * a; if (k > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), glow, 0.55)); continue; }
    if (dd > 0) continue; if (a < 1 && a <= bayer(X, Y)) continue;
    const u = Math.hypot(X - x + r * 0.18, Y - y + r * 0.22) / r;
    let col = u < 0.72 ? core : u < 0.92 ? ((u - 0.72) / 0.2 > bayer(X, Y) ? rim : core) : rim;
    if (dd > -2) col = mix(rim, glow, 0.35);
    if (n > 0.5) for (const [cxx, cyy, cr] of [[-0.42, -0.36, 0.14], [0.36, -0.5, 0.1], [0.5, 0.08, 0.16], [-0.18, 0.46, 0.12], [-0.6, 0.18, 0.08], [0.1, -0.08, 0.07]]) { const q = Math.hypot(X - (x + cxx * r), Y - (y + cyy * r)) / (cr * r); if (q < 1 && (n - 0.5) * 2 * (1.1 - q) > bayer(X, Y)) col = crater; }
    c.px(X, Y, col);
  }
}

// ---------------------------------------------------------------- the eye: iris, continuous pupil, eyeshine
// o.open 0 = thin slit … 1 = full circle; o.shine 0..1 green glow from the tapetum inside the pupil; o.dark 0..1 how dark
// the scene is (the iris sinks into the dark, the glow does not); o.blink 0..1; o.look [dx, dy]
export const SHINE = ["#0E3A1C", "#1E7A3A", "#3FD26A", "#9CFF7A", "#EFFFC8"];
export function catEye(c, x, y, rx, ry, o = {}) {
  const open = clamp01(o.open ?? 0.5), shine = clamp01(o.shine ?? 0), dark = clamp01(o.dark ?? 0), blink = clamp01(o.blink ?? 0), look = o.look ?? [0, 0], a = o.a ?? 1, g = fade(c, a);
  const iris = o.iris ?? RAMP.amber, out = "#07060E", lid = o.lid ?? RAMP.black[2];
  const pw = rx * lerp(0.075, 0.84, open), ph = ry * lerp(0.94, 0.86, open), px = x + look[0] * rx * 0.18, py = y + look[1] * ry * 0.12;
  const lidY = y - ry + 2 * ry * blink, ol = Math.max(1.1, rx / 18);
  for (let Y = R(y - ry - 2); Y <= R(y + ry + 2); Y++) for (let X = R(x - rx - 2); X <= R(x + rx + 2); X++) {
    const e = ((X + 0.5 - x) / rx) ** 2 + ((Y + 0.5 - y) / ry) ** 2; if (e > 1.02) continue;
    if (a < 1 && a <= bayer(X, Y)) continue;
    const edge = e > (1 - ol / Math.min(rx, ry)) ** 2;
    if (Y + 0.5 < lidY) { g.px(X, Y, edge ? out : lid); continue; }
    if (edge) { g.px(X, Y, out); continue; }
    const pe = ((X + 0.5 - px) / pw) ** 2 + ((Y + 0.5 - py) / ph) ** 2;
    let col;
    if (pe <= 1) {
      // the pupil: black, or lit from inside by the reflected light (bright core, darker rim)
      const k = shine * (1 - 0.55 * pe), s = k * 4, lo = Math.floor(s);
      col = k <= 0.04 ? out : SHINE[Math.min(4, s - lo > bayer(X, Y) ? lo + 1 : lo)];
    } else {
      const v = (Y - (y - ry)) / (2 * ry), s = v * (iris.length - 2) + 0.2, lo = Math.floor(s);
      col = iris[Math.max(1, Math.min(iris.length - 1, s - lo > 0.35 + 0.3 * bayer(X, Y) ? lo + 1 : lo))];
      if (v < 0.22) col = iris[1];
      // a thin dark ring around the pupil
      if (pe < 1 + 2.2 / Math.max(3, pw)) col = iris[0];
      if (dark > 0) col = mix(col, "#0A0816", dark * 0.82);
      // the glow spills a little onto the iris
      if (shine > 0.3 && pe < 1.6) col = mix(col, SHINE[2], (shine - 0.3) * 0.5 * (1.6 - pe));
    }
    g.px(X, Y, col);
  }
  if (blink > 0.02) for (let X = R(x - rx); X <= R(x + rx); X++) g.px(X, R(lidY), out);
  // highlights (dimmer in the dark)
  const hx = x - rx * 0.38, hy = y - ry * 0.42, hr = Math.max(1.2, rx * 0.26), hc = dark > 0.6 ? "#C8D8C0" : "#FFFFFF";
  if (hy - hr > lidY) for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) if (((X + 0.5 - hx) / hr) ** 2 + ((Y + 0.5 - hy) / (hr * 1.1)) ** 2 <= 1) g.px(X, Y, hc);
  const sx = x + rx * 0.36, sy = y + ry * 0.34, sr = Math.max(0.8, rx * 0.08);
  if (sy - sr > lidY) for (let Y = R(sy - sr); Y <= R(sy + sr); Y++) for (let X = R(sx - sr); X <= R(sx + sr); X++) g.px(X, Y, hc);
}
// soft green bloom around a glowing eye (drawn before the eye)
export function bloom(c, x, y, r, k) {
  if (k <= 0.02) return;
  for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) { const d = Math.hypot(X - x, Y - y) / r; if (d >= 1) continue; const q = (1 - d) ** 2 * k * 0.9; if (q > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), SHINE[3], 0.28 + 0.3 * q)); }
}

// ---------------------------------------------------------------- the world
// o: { tod 2..6, dark 0..1 (scene brightness), shine, open, look, blink, beam {x, y, a} (screen point of the flashlight) }
export function drawWorld(c, cam, t, o = {}) {
  const tod = o.tod ?? 6, dark = clamp01(o.dark ?? 0);
  // sky (screen space) and the disc (parallax 0.3)
  drawSky(c, { cx: TOD_CX(tod), cy: -180 }, 0);   // stars do not twinkle: the loop seam stays exact
  const Ld = layer(cam, 0.3); disc(c, Ld.X(270), Ld.Y(360), 104 * Ld.z, tod);
  // city silhouette (parallax 0.55); windows lit at night
  const Lc = layer(cam, 0.55), night = clamp01((tod - 4) / 2), bld = mix("#3A5A9A", "#241C48", night);
  for (const [x, w, h] of [[-120, 120, 200], [0, 70, 150], [60, 50, 210], [400, 60, 170], [450, 90, 240], [110, 40, 120], [540, 120, 180]]) {
    const X0 = R(Lc.X(x)), X1 = R(Lc.X(x + w)), Y0 = R(Lc.Y(600 - h)), Y1 = R(Lc.Y(600));
    for (let Y = Math.max(0, Y0); Y < Math.min(c.h, Y1); Y++) for (let X = Math.max(0, X0); X < Math.min(c.w, X1); X++) c.px(X, Y, bld);
    if (night > 0.05) for (let j = 600 - h + 8; j < 590; j += 14) for (let i = x + 6; i < x + w - 6; i += 12) if ((i * 7 + j * 3) % 5 === 0) { const wx0 = R(Lc.X(i)), wy0 = R(Lc.Y(j)), ww = Math.max(1, R(4 * Lc.z)), wh = Math.max(1, R(5 * Lc.z)); fade(c, night).rect(wx0, wy0, ww, wh, "#F4CA50"); }
  }
  // ledge (parallax 1) running to the bottom of the frame
  const L = layer(cam, 1), ledY = R(L.Y(604));
  if (ledY < c.h) { const top = Math.max(0, ledY); for (let Y = top; Y < c.h; Y++) { const col = Y < ledY + R(2 * L.z) ? "#D89A60" : Y < ledY + R(10 * L.z) ? "#B07040" : "#6A3A20"; for (let X = 0; X < c.w; X++) c.px(X, Y, col); }
    for (let x = -540; x < 1080; x += 90) { const X = R(L.X(x)); if (X >= 0 && X < c.w) for (let Y = Math.max(0, ledY + R(10 * L.z)); Y < c.h; Y++) c.px(X, Y, "#4A2814"); } }
  // the cat (body, head, face) through the camera
  const P = (pts) => pts.map(([x, y]) => [L.X(x), L.Y(y)]), z = L.z, ramp = RAMP.black, lit = "#9A8CD8";
  shadow(c, L.X(270), L.Y(606), 92 * z, 8 * z);
  blob(c, [tube(P([...bez([222, 598], [120, 590], [148, 470], 10), ...bez([148, 470], [160, 410], [196, 418], 6).slice(1)]), 13 * z, 9 * z)], { ramp, litOutline: lit, thick: 6 * z });
  blob(c, [P([[232, 350], [308, 350], [338, 420], [360, 520], [358, 604], [182, 604], [180, 520], [202, 420]]), P(ell(270, 592, 88, 16))], { ramp, litOutline: lit, thick: 34 * z, base: 2.4, gain: 2.4 });
  blob(c, [P([[236, 440], [262, 440], [264, 596], [234, 596]]), P(ell(249, 596, 18, 9))], { ramp, litOutline: lit, thick: 9 * z, base: 2.8 });
  blob(c, [P([[278, 440], [304, 440], [306, 596], [276, 596]]), P(ell(291, 596, 18, 9))], { ramp, litOutline: lit, thick: 9 * z, base: 2.8 });
  blob(c, [P([[200, 318], [206, 214], [262, 280]]), P([[340, 318], [334, 214], [278, 280]])], { ramp, litOutline: lit, thick: 10 * z });
  flat(c, [P([[212, 300], [214, 238], [248, 280]]), P([[328, 300], [326, 238], [292, 280]])], "#E58AA8");
  blob(c, [P(ell(270, 336, 80, 60)), P([[194, 352], [180, 378], [214, 382]]), P([[346, 352], [360, 378], [326, 382]])], { ramp, litOutline: lit, thick: 24 * z, base: 2.8 });
  nose(c, L.X(270), L.Y(358), Math.max(2, 4 * z), "#F09AB8"); mouthW(c, L.X(270), L.Y(364), "#07060E", Math.max(2, R(3 * z)));
  blush(c, L.X(218), L.Y(366), 15 * z, 7 * z); blush(c, L.X(322), L.Y(366), 15 * z, 7 * z);
  const wk = "#B8B0E0"; for (const s of [-1, 1]) { c.line(R(L.X(270 + s * 50)), R(L.Y(362)), R(L.X(270 + s * 96)), R(L.Y(354)), wk); c.line(R(L.X(270 + s * 50)), R(L.Y(368)), R(L.X(270 + s * 96)), R(L.Y(370)), wk); }
  // the darkness of the scene (everything but the eyes and their glow)
  if (dark > 0) c.tint(0, 0, c.w, c.h, () => dark * 0.86, "#05040C", 6);
  // the flashlight beam (lights the face, wakes the eyeshine)
  if (o.beam && o.beam.a > 0) beam(c, o.beam, [L.X(270), L.Y(330)], 120 * z, dark);
  // eyes
  const eo = { open: o.open ?? 0.5, shine: o.shine ?? 0, dark, blink: o.blink ?? 0, look: o.look ?? [0, 0] };
  for (const sx of [-33, 33]) { bloom(c, L.X(270 + sx), L.Y(330), 46 * z, (o.shine ?? 0) * Math.max(0.35, dark)); catEye(c, L.X(270 + sx), L.Y(330), 19 * z, 21 * z, eo); }
  return { L, eyes: [[L.X(237), L.Y(330)], [L.X(303), L.Y(330)]], eyeR: 19 * z };
}

// a dithered cone of warm light from the phone to the face
function beam(c, b, [fx, fy], fr, dark) {
  const { x, y, a } = b, dx = fx - x, dy = fy - y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
  const x0 = Math.max(0, R(Math.min(x, fx) - fr)), x1 = Math.min(c.w - 1, R(Math.max(x, fx) + fr)), y0 = Math.max(0, R(Math.min(y, fy) - fr)), y1 = Math.min(c.h - 1, R(Math.max(y, fy) + fr));
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const px = X - x, py = Y - y, along = px * ux + py * uy, across = Math.abs(-px * uy + py * ux); if (along < 0 || along > L * 1.15) continue;
    const half = 6 + (fr - 6) * (along / L), q = 1 - across / half; if (q <= 0) continue;
    const k = a * q * (0.35 + 0.6 * dark) * (1 - 0.3 * along / L); if (k > bayer(X, Y) * 1.25) c.px(X, Y, mix(c.get(X, Y), "#FFF2C8", 0.2 + 0.25 * dark));
  }
}

// ---------------------------------------------------------------- the phone in the hero's yellow knitted mitten (screen space)
// the close-up mitten of the touchscreen film (knit stitches, ribbed cuff, coral sleeve), adapted to hold a phone
function mittenCU(c, tip, ang, len, wid, thumb, sq) {
  const a = [Math.cos(ang), Math.sin(ang)], n = [-a[1], a[0]], r = wid / 2;
  const S = (u, v) => [tip[0] + a[0] * u + n[0] * v, tip[1] + a[1] * u + n[1] * v];
  const pouch = []; for (let k = 0; k <= 12; k++) { const th = -Math.PI / 2 + (Math.PI * k) / 12; pouch.push(S(Math.max(sq * Math.cos(th), r - r * Math.cos(th)), r * Math.sin(th))); }
  pouch.push(S(len, r * 0.94), S(len + 6, -r * 0.94));
  const cuff = [S(len - 4, -r * 0.98), S(len - 4, r * 0.98), S(len + 56, r * 1.0), S(len + 56, -r * 1.0)];
  const sleeve = [S(len + 50, -r * 1.2), S(len + 50, r * 1.2), S(len + 320, r * 1.3), S(len + 320, -r * 1.3)];
  const thumbP = [S(len * 0.42, thumb * r * 0.8), S(len * 0.5, thumb * (r + 34)), S(len * 0.66, thumb * (r + 44)), S(len * 0.8, thumb * (r + 26)), S(len * 0.84, thumb * r * 0.8)];
  const L = [-0.4, -0.9];
  drawPart(c, [spline(sleeve, new Set([0, 1, 2, 3]), 3)], { ramp: COAT, base: 3.5, gain: 1.4, slope: 0.6, thick: 40, light: L, outline: COAT[0] });
  drawPart(c, [spline(cuff, new Set([0, 1, 2, 3]), 3)], { ramp: MITT, base: 3.2, gain: 1.2, slope: 0.4, thick: 22, light: L, outline: MITT[0] });
  if (thumb) drawPart(c, [spline(thumbP, new Set(), 5)], { ramp: MITT, base: 3.6, gain: 1.4, slope: 0.4, thick: 18, light: L, outline: MITT[0], litOutline: MITT[5] });
  drawPart(c, [spline(pouch, new Set([13, 14]), 4)], { ramp: MITT, base: 3.9, gain: 1.7, slope: 0.6, thick: r * 0.75, light: L, outline: MITT[0], litOutline: MITT[5] });
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of [...pouch, ...cuff, ...(thumb ? thumbP : [])]) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.max(0, R(y0)); y < Math.min(c.h, R(y1)); y++) for (let x = Math.max(0, R(x0)); x < Math.min(c.w, R(x1)); x++) {
    const o = c.get(x, y), hx = "#" + o.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(); if (!MITT.includes(hx) || hx === MITT[0]) continue;
    const dx = x - tip[0], dy = y - tip[1], u = dx * a[0] + dy * a[1], v = dx * n[0] + dy * n[1];
    if (u > len - 4 && u < len + 56) { if (((Math.floor(v / 5) % 2) + 2) % 2 === 0) c.px(x, y, mix(o, MITT[1], 0.35)); continue; }
    const cu = ((v % 8) + 8) % 8, ru = ((u % 7) + 7) % 7, vv = Math.abs(cu - 4);
    if (Math.abs(ru - (6 - vv * 1.3)) < 0.9) c.px(x, y, mix(o, MITT[1], 0.4)); else if (Math.abs(ru - (5 - vv * 1.3)) < 0.6 && vv < 2) c.px(x, y, mix(o, MITT[7], 0.3));
  }
}
// (x, y) = the flashlight LED at the phone's top edge; we see the screen side; a = dissolve; flash = LED brightness 0..1;
// screen(g, x, y, w, h) draws the screen content. The whole hand rises from below the frame.
export function phone(c, x, y, a = 1, flash = 0, screen = null) {
  if (a <= 0) return;
  const w = 124, h = 250, X0 = R(x - w / 2), Y0 = R(y - 6);
  c.rrect(X0 - 2, Y0 - 2, w + 4, h + 4, "#05030A", 18); c.rrect(X0, Y0, w, h, "#2A2440", 16); c.rrect(X0 + 4, Y0 + 4, w - 8, h - 8, "#120E1E", 14);
  c.rect(X0 + w - 2, Y0 + 60, 2, 34, "#4A4466");
  if (screen) screen(c, X0 + 9, Y0 + 14, w - 18, h - 28);
  // the flashlight LED and its glow (the camera flash is the same LED, much brighter)
  c.disc(R(x + 34), R(y + 2), 4, "#FFF6D8"); c.px(R(x + 34), R(y + 2), "#FFFFFF");
  const fl = Math.max(flash, 0.25);
  for (let Y = R(y - 46); Y <= R(y + 46); Y++) for (let X = R(x + 34 - 46); X <= R(x + 34 + 46); X++) { const d = Math.hypot(X - x - 34, Y - y - 2) / 46; if (d < 1 && (1 - d) ** 1.5 * fl > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), "#FFFFFF", 0.5 + 0.5 * flash)); }
  mittenCU(c, [X0 + w * 0.62, Y0 + h * 0.7], 2.05, 104, 118, 1, 0);
  void a;
}
