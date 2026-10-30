// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/city-falcon.mjs (drawFalcon and its sprites verbatim); changes: imports re-pointed to ./cute.mjs and ./speed-falcon-kit.mjs.
// LV8 · the peregrine falcon, a cute chibi facing the camera: a slate-blue hood with the dark "moustache" stripes,
// a cream throat and cheeks, big glossy dark eyes in bright yellow eye-rings, a small hooked blue-grey beak with a
// yellow cere, blush, a barred cream chest, slate wings folded at the sides, a barred tail, yellow feet.
// Three bodies share one head: "perch" (wings folded), "fly" (front view, wings raised / beating, legs dangling)
// and "streak" (the stoop / dash: a tucked teardrop along the direction of motion, face upright at the front).
// Expensive volume shading is cached as sprites (per scale, puff, wing angle, streak angle); eyes are per frame.
import { blob, flat, ell, tube, blush, fade, mix, bayer } from "./cute.mjs";
import { spriteCache, xform, R, clamp01, lerp } from "./speed-falcon-kit.mjs";

export const SLATE = ["#121828", "#1C2640", "#283656", "#384A70", "#4C628C", "#667EA8", "#88A0C6", "#B2C4E2"];
const HOOD = ["#0E1220", "#161C30", "#202A46", "#2C3A5C", "#3C4E76", "#526892", "#6E86AE", "#94AACC"];
export const CREAM = ["#4A3A30", "#6E5A48", "#968066", "#B8A486", "#D6C8AA", "#EAE0C8", "#F8F2E2", "#FFFCF4"];
const UNDER = ["#3A3C52", "#5A5E78", "#7C8098", "#9CA0B8", "#BABED2", "#D4D6E4", "#E8EAF2", "#F8F8FC"];
const BAR = "#2E3448", BAR_L = "#5A5E74";
const YEL = "#F6C83A", YEL_D = "#C8901C", YEL_L = "#FFE68A";
const IRIS = ["#06050A", "#120C12", "#24161A", "#40281E", "#6A4430"];
const SPR = spriteCache(240);

// ---------------------------------------------------------------- head (shared by every body and by the icon)
function headSprite(s) {
  const W = R(150 * s) + 10, H = R(134 * s) + 10, ox = R(W / 2), oy = R(66 * s) + 5;
  return SPR(`fh:${s.toFixed(3)}`, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => pts.map(([u, v]) => [x + u * s, y + v * s]), E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 48));
    // hood: big round head with soft cheek fluff at the sides
    blob(g, [E(0, 0, 62, 54), E(-50, 18, 16, 18), E(50, 18, 16, 18)], { ramp: HOOD, thick: 28 * s, base: 3.3, gain: 2.2, litOutline: HOOD[6] });
    // cream face: cheeks and throat below the eyes
    blob(g, [E(0, 26, 52, 30), E(0, 46, 32, 15)], { ramp: CREAM, thick: 14 * s, base: 4.3, gain: 1.7, slope: 0.5, outline: CREAM[2], litOutline: null });
    // the dark "moustache" stripes dropping from under the eyes
    for (const sd of [-1, 1]) blob(g, [T(tube([[sd * 24, -4], [sd * 25, 14], [sd * 27, 32]], 12, 5))], { ramp: HOOD, thick: 6 * s, base: 3.0, gain: 1.6, litOutline: HOOD[5] });
    // yellow cere and the small hooked beak (blue-grey, dark tip)
    blob(g, [T([[-11, 5], [11, 5], [10, 12], [-10, 12]])], { ramp: ["#5A3A0A", "#8A5A10", "#C88A1C", "#E8AE2C", YEL, "#FAD860", YEL_L, "#FFF4C0"], thick: 3 * s, base: 4.2, gain: 1.4, outline: "#3A2A10", litOutline: null });
    blob(g, [T([[-10, 10], [10, 10], [9, 18], [5, 27], [0, 34], [-5, 27], [-9, 18]])], { ramp: ["#1A2030", "#2A3248", "#3E4864", "#566284", "#707EA2", "#8E9CBE", "#B0BCD8", "#D4DCEE"], thick: 6 * s, base: 3.8, gain: 1.6, outline: "#141826", litOutline: "#B0BCD8" });
    flat(g, [T([[-4.5, 26], [4.5, 26], [0, 34]])], "#141826");
    for (let k = 0; k < 3; k++) g.px(R(x - 5 * s), R(y + (14 + k * 3) * s), "#D4DCEE");
    // nostrils on the cere
    g.px(R(x - 5 * s), R(y + 8 * s), "#7A5010"); g.px(R(x + 5 * s), R(y + 8 * s), "#7A5010");
    // crown feather tuft
    flat(g, [T([[-7, -51], [-3, -62], [1, -52], [6, -60], [9, -50]])], HOOD[4], { outline: HOOD[0] });
  });
}
/** Eye with the yellow eye-ring; happy = closed "^" arcs; blink as usual. */
function falconEye(c, x, y, r, o) {
  const g = fade(c, o.a ?? 1), ry = r * 1.07, ring = Math.max(2.5, r * 0.25), blink = clamp01(o.blink ?? 0), happy = clamp01(o.happy ?? 0);
  // yellow ring
  for (let Y = R(y - ry - ring - 1); Y <= R(y + ry + ring + 1); Y++) for (let X = R(x - r - ring - 1); X <= R(x + r + ring + 1); X++) {
    const d = ((X + 0.5 - x) / (r + ring)) ** 2 + ((Y + 0.5 - y) / (ry + ring)) ** 2; if (d > 1) continue;
    const d2 = ((X + 0.5 - x) / (r + ring + 1)) ** 2 + ((Y + 0.5 - y) / (ry + ring + 1)) ** 2;
    g.px(X, Y, d2 > 0.9 ? YEL_D : Y < y - ry * 0.35 ? YEL_L : YEL);
  }
  if (happy > 0.5) {
    // closed happy eye: a thick upward arc on the yellow ring
    for (let Y = R(y - ry); Y <= R(y + ry); Y++) for (let X = R(x - r); X <= R(x + r); X++) { if (((X + 0.5 - x) / r) ** 2 + ((Y + 0.5 - y) / ry) ** 2 <= 1) g.px(X, Y, YEL); }
    for (let X = R(x - r * 0.8); X <= R(x + r * 0.8); X++) { const u = (X - x) / (r * 0.8), yy = y + ry * 0.15 - (1 - u * u) * ry * 0.55; g.px(X, R(yy), "#1A1018"); g.px(X, R(yy) + 1, "#1A1018"); if (Math.abs(u) < 0.85) g.px(X, R(yy) + 2, "#3A2420"); }
    return;
  }
  // big glossy dark eye (cute.mjs-style highlights)
  const look = o.look ?? [0, 0], lidY = y - ry + 2 * ry * blink;
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const q = ((X + 0.5 - x) / (r + 0.6)) ** 2 + ((Y + 0.5 - y) / (ry + 0.6)) ** 2; if (q > 1) continue;
    const edge = ((X + 0.5 - x) / (r - 0.6)) ** 2 + ((Y + 0.5 - y) / (ry - 0.6)) ** 2 > 1;
    if (Y + 0.5 < lidY) { g.px(X, Y, edge ? "#1A1018" : HOOD[3]); continue; }
    if (edge) { g.px(X, Y, "#06050A"); continue; }
    const v = (Y - (y - ry)) / (2 * ry); g.px(X, Y, v > 0.7 ? ((v - 0.7) * 3.3 > bayer(X, Y) ? IRIS[4] : IRIS[3]) : v > 0.5 ? IRIS[2] : IRIS[v < 0.2 ? 0 : 1]);
  }
  if (blink > 0.02) for (let X = R(x - r); X <= R(x + r); X++) g.px(X, R(lidY), "#1A1018");
  const hx = x - r * 0.36 + look[0] * r * 0.22, hy = y - ry * 0.4 + look[1] * ry * 0.18, hr = Math.max(1.2, r * 0.3);
  if (hy - hr > lidY) for (let Y = R(hy - hr); Y <= R(hy + hr); Y++) for (let X = R(hx - hr); X <= R(hx + hr); X++) if (((X + 0.5 - hx) / hr) ** 2 + ((Y + 0.5 - hy) / (hr * 1.1)) ** 2 <= 1) g.px(X, Y, "#FFFFFF");
  const sx = x + r * 0.34 + look[0] * r * 0.2, sy = y + ry * 0.32 + look[1] * ry * 0.1;
  if (sy - 1 > lidY) { g.px(R(sx), R(sy), "#FFFFFF"); if (r >= 8) { g.px(R(sx) + 1, R(sy), "#FFFFFF"); g.px(R(sx), R(sy) + 1, "#E8E4FF"); } }
}
/** The head with its face at (x, y), scale s. o: look, blink, happy, a, fierce (0..1 brows for the stoop). */
export function drawFalconHead(c, x, y, s, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  headSprite(s).blit(c, x, y, { a });
  for (const sd of [-1, 1]) falconEye(c, x + sd * 24 * s, y - 7 * s, 13.5 * s, { look: o.look, blink: o.blink, happy: o.happy, a });
  for (const sd of [-1, 1]) blush(c, x + sd * 43 * s, y + 24 * s, 7 * s, 3.4 * s, "#F27A9A", a);
  if ((o.fierce ?? 0) > 0.05) { const g = fade(c, a * clamp01(o.fierce)); for (const sd of [-1, 1]) for (let i = 0; i <= R(14 * s); i++) { const X = R(x + sd * (12 * s + i)), Y = R(y - 25 * s + i * 0.35); g.px(X, Y, "#0A0C16"); g.px(X, Y + 1, "#0A0C16"); } }
}

// ---------------------------------------------------------------- perched body (wings folded)
function perchSprite(s, puff) {
  const W = R(170 * s) + 10, H = R(250 * s) + 10, ox = R(W / 2), oy = R(10 * s) + 5;
  return SPR(`fp:${s.toFixed(3)}:${puff.toFixed(2)}`, W, H, ox, oy, (g, x, y) => {
    const px = 1 + 0.07 * puff, T = (pts) => pts.map(([u, v]) => [x + u * s * (v > 40 && v < 170 ? px : 1), y + v * s]), E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 56));
    // tail (behind): barred, dark band and white tip
    blob(g, [T([[-15, 178], [15, 178], [17, 222], [0, 226], [-17, 222]])], { ramp: SLATE, thick: 6 * s, base: 3.2, litOutline: SLATE[5] });
    for (let k = 0; k < 4; k++) flat(g, [T([[-14, 186 + k * 9], [14, 186 + k * 9], [14, 188 + k * 9], [-14, 188 + k * 9]])], SLATE[1]);
    flat(g, [T([[-16, 216], [16, 216], [15, 221], [0, 224], [-15, 221]])], "#ECEEF6");
    // body
    blob(g, [E(0, 112, 62, 80)], { ramp: SLATE, thick: 30 * s, base: 3.0, gain: 2.2, litOutline: SLATE[6] });
    // chest: cream, white throat, barred belly
    blob(g, [E(0, 104, 46, 70)], { ramp: CREAM, thick: 22 * s, base: 4.0, gain: 2.0, slope: 0.8, outline: CREAM[2], litOutline: null });
    for (let row = 0; row < 7; row++) {
      const yy = 116 + row * 10, half = 40 * Math.sqrt(Math.max(0, 1 - ((yy - 104) / 72) ** 2)) - 4;
      for (let k = -3; k <= 3; k++) { const cx = k * 11 + (row % 2) * 5.5; if (Math.abs(cx) > half - 3) continue; flat(g, [T([[cx - 4, yy], [cx, yy + 2.6], [cx + 4, yy], [cx + 4, yy + 1.6], [cx, yy + 4.4], [cx - 4, yy + 1.6]])], row < 2 ? BAR_L : BAR); }
    }
    for (let k = 0; k < 6; k++) { const cx = (k - 2.5) * 12, yy = 82 + (k % 2) * 8; flat(g, [T(ell(cx, yy, 1.6, 2.6))], BAR_L); }
    // wings folded at the sides: slate with lighter feather edges, primaries crossing low
    for (const sd of [-1, 1]) {
      const wing = T([[sd * 46, 52], [sd * 66, 80], [sd * 70, 128], [sd * 60, 172], [sd * 34, 214], [sd * 22, 206], [sd * 32, 160], [sd * 40, 104]]);
      blob(g, [wing], { ramp: SLATE, thick: 12 * s, base: 3.0, gain: 1.8, light: [-0.6 * sd, -0.8], litOutline: SLATE[6] });
      // feather rows (scallops) and dark bars on the coverts
      for (let row = 0; row < 5; row++) { const yy = 84 + row * 22; for (let k = 0; k < 2; k++) { const cx = sd * (50 + k * 9 - row * 3); flat(g, [T([[cx - 5, yy], [cx, yy + 4], [cx + 5, yy], [cx + 5, yy + 1.5], [cx, yy + 5.5], [cx - 5, yy + 1.5]])], row > 2 ? SLATE[1] : SLATE[2]); } }
      for (let k = 0; k < 3; k++) { const p0 = [sd * (58 - k * 8), 150 + k * 6], p1 = [sd * (36 - k * 3), 208 - k * 4]; const pts = T([p0, p1]); g.line(R(pts[0][0]), R(pts[0][1]), R(pts[1][0]), R(pts[1][1]), SLATE[1]); }
    }
    // feet gripping the perch (yellow toes, dark talons)
    for (const sd of [-1, 1]) {
      const [fx, fy] = T([[sd * 18, 190]])[0], X = R(fx), Y = R(fy), w = R(16 * s), h = Math.max(3, R(7 * s));
      g.rrect(X - (w >> 1) - 1, Y - 1, w + 2, h + 2, "#3A2A0A", 1); g.rect(X - (w >> 1), Y, w, h, YEL); g.rect(X - (w >> 1), Y, w, 1, YEL_L);
      for (let k = 0; k < 3; k++) { const tx = X - (w >> 1) + 1 + R((k * (w - 3)) / 2); g.rect(tx, Y + h, 2, Math.max(2, R(3 * s)), "#14101A"); }
    }
  });
}

// ---------------------------------------------------------------- fly body (front view): body + legs; wings drawn separately
function flySprite(s, legs) {
  const W = R(170 * s) + 10, H = R(270 * s) + 10, ox = R(W / 2), oy = R(10 * s) + 5;
  return SPR(`ff:${s.toFixed(3)}:${legs.toFixed(1)}`, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => pts.map(([u, v]) => [x + u * s, y + v * s]), E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 56));
    // tail fanned a little
    blob(g, [T([[-14, 170], [14, 170], [30, 226], [0, 234], [-30, 226]])], { ramp: SLATE, thick: 6 * s, base: 3.2, litOutline: SLATE[5] });
    for (let k = 0; k < 4; k++) flat(g, [T([[-16 - k * 3, 186 + k * 10], [16 + k * 3, 186 + k * 10], [16 + k * 3, 188 + k * 10], [-16 - k * 3, 188 + k * 10]])], SLATE[1]);
    flat(g, [T([[-28, 222], [28, 222], [26, 228], [0, 233], [-26, 228]])], "#ECEEF6");
    // legs: dangling down and forward with open talons when landing (legs = 1), tucked when 0
    if (legs > 0.05) for (const sd of [-1, 1]) {
      const top = [sd * 16, 160], foot = [sd * (18 + 6 * legs), 160 + 48 * legs];
      blob(g, [T(tube([top, foot], 6, 4))], { ramp: ["#5A3A0A", "#8A5A10", "#B8801A", "#E0A82A", YEL, "#FAD860", YEL_L, "#FFF4C0"], thick: 3 * s, base: 3.6, litOutline: YEL_L });
      const [fx, fy] = T([foot])[0]; for (let k = -1; k <= 1; k++) { const ex = fx + k * 5 * s, ey = fy + 6 * s; g.line(R(fx), R(fy), R(ex), R(ey), YEL_D); g.px(R(ex), R(ey) + 1, "#14101A"); g.px(R(ex) + (k < 0 ? -1 : k > 0 ? 1 : 0), R(ey) + 2, "#14101A"); }
    }
    // body and chest (same marks as perched)
    blob(g, [E(0, 108, 58, 74)], { ramp: SLATE, thick: 28 * s, base: 3.0, gain: 2.2, litOutline: SLATE[6] });
    blob(g, [E(0, 102, 44, 66)], { ramp: CREAM, thick: 22 * s, base: 4.0, gain: 2.0, slope: 0.8, outline: CREAM[2], litOutline: null });
    for (let row = 0; row < 6; row++) { const yy = 114 + row * 10, half = 38 * Math.sqrt(Math.max(0, 1 - ((yy - 102) / 68) ** 2)) - 4; for (let k = -3; k <= 3; k++) { const cx = k * 11 + (row % 2) * 5.5; if (Math.abs(cx) > half - 3) continue; flat(g, [T([[cx - 4, yy], [cx, yy + 2.6], [cx + 4, yy], [cx + 4, yy + 1.6], [cx, yy + 4.4], [cx - 4, yy + 1.6]])], row < 2 ? BAR_L : BAR); } }
  });
}
/** One raised/beating wing seen from the front (underside: pale and finely barred, dark leading edge and tips). */
function wingSprite(s, sd, ang) {
  const W = R(360 * s) + 10, H = R(360 * s) + 10, ox = R(W / 2), oy = R(H / 2);
  return SPR(`fw:${s.toFixed(3)}:${sd}:${ang.toFixed(2)}`, W, H, ox, oy, (g, x, y) => {
    const LE = [[0, -4], [20, -26], [38, -42], [64, -58], [96, -72], [126, -82], [154, -88]];
    const TE = [[154, -88], [136, -74], [142, -68], [122, -60], [128, -53], [108, -45], [112, -38], [94, -30], [96, -23], [78, -15], [80, -8], [62, -1], [62, 6], [44, 12], [26, 22], [8, 28], [-6, 22]];
    const base = [...LE, ...TE.slice(1)];
    const P = (pts) => xform(pts.map(([u, v]) => [x + sd * u * s, y + v * s]), x, y, sd * ang);
    blob(g, [P(base)], { ramp: UNDER, thick: 14 * s, base: 3.8, gain: 1.6, slope: 0.3, light: [0, -1], outline: SLATE[0], litOutline: null });
    // fine bars across the underside coverts
    for (let k = 0; k < 6; k++) { const u0 = 18 + k * 14, pts = P([[u0, 16 - k * 7], [u0 + 18, -22 - k * 8]]); fade(g, 0.8).line(R(pts[0][0]), R(pts[0][1]), R(pts[1][0]), R(pts[1][1]), UNDER[2]); }
    // dark primaries (wing tip) with feather separations
    blob(g, [P([[96, -72], [126, -82], [154, -88], [136, -74], [142, -68], [122, -60], [128, -53], [108, -45], [112, -38], [94, -30], [92, -50]])], { ramp: SLATE, thick: 6 * s, base: 2.8, gain: 1.4, light: [0, -1], litOutline: SLATE[5] });
    for (const [u, v] of [[122, -60], [108, -45], [94, -30]]) { const pts = P([[u, v], [u + 18, v - 14]]); g.line(R(pts[0][0]), R(pts[0][1]), R(pts[1][0]), R(pts[1][1]), SLATE[0]); }
    // slate leading edge (the arm)
    blob(g, [P(tube(LE.slice(0, 5), 8, 4))], { ramp: SLATE, thick: 4 * s, base: 3.0, gain: 1.6, light: [0, -1], litOutline: SLATE[6] });
  });
}

// ---------------------------------------------------------------- streak body (stoop / dash): a tucked teardrop
function streakSprite(s, ang) {
  const W = R(340 * s) + 12, H = W, ox = R(W / 2), oy = R(H / 2);
  return SPR(`fs:${s.toFixed(3)}:${ang.toFixed(2)}`, W, H, ox, oy, (g, x, y) => {
    // local frame: u along the motion (head at u = 0), v across (v < 0 = the back); rotate by ang
    const P = (pts) => xform(pts.map(([u, v]) => [x + u * s, y + v * s]), x, y, ang);
    const up = Math.cos(ang) >= 0 ? -1 : 1;                  // keep the back on top whichever way it flies
    const V = (pts) => P(pts.map(([u, v]) => [u, v * -up]));
    blob(g, [V([[-128, 0], [-104, -10], [-70, -26], [-36, -38], [-6, -40], [14, -24], [18, 0], [14, 24], [-6, 34], [-40, 30], [-76, 20], [-106, 8]])], { ramp: SLATE, thick: 20 * s, base: 3.0, gain: 2.2, light: [-0.4, -0.9], litOutline: SLATE[6] });
    // cream barred belly on the lower side
    blob(g, [V([[-4, 8], [-40, 14], [-84, 10], [-60, 24], [-20, 28], [0, 22]])], { ramp: CREAM, thick: 6 * s, base: 4.0, gain: 1.4, outline: CREAM[2], litOutline: null });
    for (let k = 0; k < 5; k++) { const pts = V([[-12 - k * 14, 16], [-16 - k * 14, 22]]); g.line(R(pts[0][0]), R(pts[0][1]), R(pts[1][0]), R(pts[1][1]), BAR); }
    // the folded wing on top: darker, with feather tips trailing past the tail
    blob(g, [V([[-10, -30], [-50, -34], [-100, -18], [-160, -6], [-150, 2], [-96, -2], [-44, -12], [-12, -12]])], { ramp: SLATE, thick: 8 * s, base: 2.4, gain: 1.6, light: [-0.4, -0.9], litOutline: SLATE[5] });
    for (let k = 0; k < 4; k++) { const pts = V([[-60 - k * 22, -18 + k * 3], [-74 - k * 22, -10 + k * 2]]); g.line(R(pts[0][0]), R(pts[0][1]), R(pts[1][0]), R(pts[1][1]), SLATE[1]); }
    // tail
    blob(g, [V([[-118, -4], [-150, -8], [-152, 6], [-118, 6]])], { ramp: SLATE, thick: 3, base: 2.6, litOutline: SLATE[5] });
  });
}

/**
 * drawFalcon(c, x, y, o): (x, y) = head centre (screen).
 * o.mode "perch" | "fly" | "streak"; s scale; a dissolve; look, blink, happy, fierce; puff (perch, 0..1);
 * wing (fly: 0 raised … 1 fully down), legs (fly: 0..1); dir (streak: motion angle in rad, 0 = right);
 * squash (perch: crouch 0..1); bob (px).
 */
export function drawFalcon(c, x, y, o = {}) {
  const s = o.s ?? 1, a = o.a ?? 1, mode = o.mode ?? "perch";
  if (a <= 0) return;
  x = R(x); y = R(y);
  const qs = Math.round(s * 40) / 40;
  if (mode === "perch") {
    const puff = Math.round(clamp01(o.puff ?? 0) * 4) / 4, sq = clamp01(o.squash ?? 0), dy = R(sq * 14 * qs);
    perchSprite(qs, puff).blit(c, x, y + dy, { a });
    drawFalconHead(c, x, y + R(dy * 1.4) - R(4 * puff * qs), qs, o);
    return;
  }
  if (mode === "fly") {
    const wv = Math.round(clamp01(o.wing ?? 0) * 12) / 12, ang = lerp(-0.18, 1.5, wv), legs = Math.round(clamp01(o.legs ?? 0) * 4) / 4;
    for (const sd of [-1, 1]) wingSprite(qs, sd, ang).blit(c, x + sd * 46 * qs, y + 64 * qs, { a });
    flySprite(qs, legs).blit(c, x, y, { a });
    drawFalconHead(c, x, y, qs, o);
    return;
  }
  // streak: rotate the teardrop so the head leads along dir; the face stays upright on the leading end
  const dir = o.dir ?? 0, q = Math.round(dir * 24 / (2 * Math.PI)) * (2 * Math.PI) / 24;
  streakSprite(qs, q).blit(c, x, y, { a });
  drawFalconHead(c, x, y, qs * 0.78, { ...o, look: o.look ?? [Math.cos(dir), Math.sin(dir)] });
}

/** Icon portrait (~56 px): the head only. */
export function falconIcon(c, cx, cy, a = 1) { drawFalconHead(c, cx, cy - 1, 0.45, { a, look: [0, 0.1] }); }
export { SPR };
