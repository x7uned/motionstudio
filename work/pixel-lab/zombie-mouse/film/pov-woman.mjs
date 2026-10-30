// «The last person alive» · Builder P — the woman by the fire, seen in first person (POV1).
// Sitting on a log in a three-quarter view facing screen-left (toward the fire), leaning a little toward the warmth,
// hands held to the flames. Long wavy dark-auburn hair, olive parka with a cream fur hood rim (hood down), dark-red
// scarf, dark jeans, brown boots. The head is a per-pixel shaded ellipsoid with a face region in head-local
// coordinates, so the yaw from the fire (−1.15 rad) to the camera (0) turns it continuously; a midline profile
// (brow, nose, lips, chin) shows on the silhouette when she looks aside; the features (eyes, brows, nose, smile) sit
// on the 3D head and are drawn pixel by pixel. Light: warm fire from screen-left/below (flickering), cool moon rim.
import { BT, clamp01, GW, GH } from "./pov-core.mjs";
import { ramp, vol, limb, smooth } from "./pov-shade.mjs";

const R = Math.round, PI = Math.PI;
export const PARKA = ramp("#0E110D", "#182014", "#252E18", "#364022", "#4C582E", "#66743C", "#8A9250", "#B4AA6A");
export const HAIR = ramp("#120605", "#220C08", "#3A150D", "#5A2416", "#7A3A22", "#9C5430", "#C27444", "#E09A60");
export const SKIN = ramp("#2E1518", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC");
const JEANS = ramp("#08090F", "#10131E", "#191E2E", "#252C42", "#343E58", "#4A5672");
const BOOTS = ramp("#120A08", "#24150E", "#3E2516", "#5C3A22", "#80542E", "#A8743E");
const SCARF = ramp("#1E070A", "#3C0E14", "#5E1820", "#8A2A2E", "#AE3E38", "#D2644A");
const FUR = ramp("#2A2622", "#4E4640", "#7A6E62", "#A69884", "#CFC2A6", "#EEE2C8");
const OUT = [16, 9, 12], OUT_WARM = [118, 50, 30];
const LIGHT = [-1, 0.3];                                                  // light comes from screen-left, a little below

/**
 * o = { X, Y: screen point of her hips on the log top; s: px per metre; yaw: head yaw (−1.15 → toward the fire,
 *       0 → at the camera); smile 0..1; t; I fire intensity (≈1); turn 0..1 (attention: hands drop a little, shoulders
 *       follow the head); tilt (rad, screen) }
 */
export function drawWoman(c, o) {
  const s = o.s, I = o.I ?? 1, t = o.t ?? 0, tb = o.turn ?? 0;
  const breathe = 0.005 * Math.sin(t * 1.7);
  const P = (x, y) => [o.X + x * s, o.Y - y * s];
  const lift = (I - 1) * 2.2;
  const sh = (rp, base, extra = {}) => ({ ramp: rp, base: base + lift * 0.5, gain: 1.3, thick: Math.max(3, 0.07 * s), light: LIGHT, dir: 1.6, rimLit: 1.2, rimShade: 0.9, slope: 0.5, outline: OUT, litOutline: OUT_WARM, ...extra });
  const rub = 0.007 * Math.sin(t * 5.2) * (1 - tb), drop = 0.03 * tb;     // hands rub, then lower a little when she turns
  const sx = 0.012 * tb;                                                   // shoulders turn toward us a little

  // ---- far leg (her right), behind
  vol(c, [limb([P(-0.0, 0.04), P(-0.31, 0.09), P(-0.33, 0.09)], [0.07 * s, 0.058 * s, 0.056 * s])], sh(JEANS, 1.5));
  vol(c, [limb([P(-0.32, 0.09), P(-0.335, -0.12), P(-0.34, -0.36)], [0.052 * s, 0.046 * s, 0.04 * s])], sh(JEANS, 1.3));
  vol(c, [smooth([P(-0.30, -0.34), P(-0.39, -0.35), P(-0.44, -0.41), P(-0.44, -0.448), P(-0.30, -0.448)], null, 3)], sh(BOOTS, 1.8));
  // ---- far arm (her right)
  vol(c, [limb([P(-0.12 + sx, 0.45), P(-0.22, 0.29 - drop), P(-0.34, 0.31 + rub - drop)], [0.054 * s, 0.05 * s, 0.043 * s])], sh(PARKA, 2.0));
  hand(c, P, s, -0.37, 0.33 + rub - drop, sh, 0.9);
  // ---- long hair down the back (behind the torso's back edge, over the parka)
  const hb = 0.006 * Math.sin(t * 1.3);
  const backHair = smooth([P(-0.07, 0.76), P(0.0, 0.79), P(0.06, 0.73), P(0.095, 0.62), P(0.11, 0.5), P(0.13 + hb, 0.38), P(0.12 + hb, 0.27), P(0.09 + hb, 0.21), P(0.075, 0.27), P(0.05, 0.24), P(0.035, 0.33), P(0.0, 0.43), P(-0.03, 0.56)], null, 4);
  // ---- torso (parka), leaning toward the fire, with a breath
  const by = breathe;
  const torso = smooth([P(0.10, -0.02), P(0.125, 0.12), P(0.115, 0.28), P(0.075, 0.395 + by), P(0.02 + sx, 0.47 + by), P(-0.045 + sx, 0.5 + by), P(-0.115 + sx, 0.48 + by), P(-0.165, 0.39 + by), P(-0.17, 0.24), P(-0.155, 0.07), P(-0.07, -0.035), P(0.035, -0.045)], null, 4);
  vol(c, [torso], { ...sh(PARKA, 2.6), tex: (X, Y) => quilt(Y, o, s) });
  if (s > 60) {
    for (let k = 0; k <= 18; k++) { const p = P(-0.152 + k * 0.0012, 0.455 - k * 0.022); px(c, p[0], p[1], PARKA[1]); }
    line(c, P(-0.145, 0.16), P(-0.04, 0.145), PARKA[1]);
  }
  vol(c, [backHair], { ...sh(HAIR, 2.0), tex: hairTex(), dir: 1.2, rimLit: 0.8 });
  // ---- hood fur rim around the back of the neck (lumpy cream ruff)
  const fur = [];
  for (let k = 0; k <= 16; k++) { const u = k / 16, ang = PI * (0.1 + 1.0 * u), rr = 0.078 + 0.011 * Math.sin(k * 2.7); fur.push(P(-0.03 + Math.cos(ang) * rr * 1.1 + sx, 0.5 + Math.sin(ang) * rr * 0.55)); }
  for (let k = 16; k >= 0; k--) { const u = k / 16, ang = PI * (0.1 + 1.0 * u), rr = 0.045; fur.push(P(-0.03 + Math.cos(ang) * rr + sx, 0.505 + Math.sin(ang) * rr * 0.45)); }
  vol(c, [fur], { ...sh(FUR, 2.0), tex: (X, Y) => (((X * 7 + Y * 3) % 5) === 0 ? -0.6 : 0), dir: 1.3 });
  // ---- near leg (her left)
  vol(c, [limb([P(-0.03, 0.03), P(-0.35, 0.065), P(-0.375, 0.06)], [0.076 * s, 0.062 * s, 0.058 * s])], sh(JEANS, 2.2));
  vol(c, [limb([P(-0.37, 0.055), P(-0.385, -0.15), P(-0.395, -0.38)], [0.056 * s, 0.048 * s, 0.042 * s])], sh(JEANS, 2.0));
  vol(c, [smooth([P(-0.355, -0.355), P(-0.445, -0.365), P(-0.51, -0.42), P(-0.51, -0.452), P(-0.355, -0.452)], null, 3)], sh(BOOTS, 2.4));
  // ---- scarf: a wrap round the neck and a hanging end in front of the chest
  vol(c, [smooth([P(-0.14 + sx, 0.53), P(-0.07 + sx, 0.55), P(0.0 + sx, 0.53), P(0.0 + sx, 0.49), P(-0.07 + sx, 0.5), P(-0.145 + sx, 0.485)], null, 3)], sh(SCARF, 2.6));
  vol(c, [smooth([P(-0.13 + sx, 0.51), P(-0.095 + sx, 0.505), P(-0.1, 0.38), P(-0.105, 0.3), P(-0.14, 0.31), P(-0.142, 0.42)], null, 3)], { ...sh(SCARF, 2.2), tex: (X, Y) => ((Y % 4) === 0 ? -0.5 : 0) });
  // ---- near arm (her left): from the near shoulder across the front toward the fire
  vol(c, [limb([P(0.02 + sx, 0.43), P(-0.085, 0.265 - drop * 0.5), P(-0.22, 0.25 - drop), P(-0.32, 0.29 - rub - drop)], [0.064 * s, 0.058 * s, 0.054 * s, 0.049 * s])], sh(PARKA, 2.8));
  vol(c, [limb([P(-0.30, 0.285 - rub - drop), P(-0.335, 0.295 - rub - drop)], [0.051 * s, 0.051 * s])], sh(PARKA, 3.3));
  hand(c, P, s, -0.355, 0.305 - rub - drop, sh, 1.15);
  // ---- hair curtains beside the face, then the head
  drawHead(c, o, P);
}

function hairTex() {
  return (X, Y) => { const v = Math.sin(X * 0.9 + Y * 0.35 + Math.sin(Y * 0.25) * 2); return v > 0.75 ? 0.7 : v < -0.85 ? -0.6 : 0; };
}
function quilt(Y, o, s) { if (s < 70) return 0; const yy = (o.Y - Y) / s, k = (yy * 9 + 0.3) % 1; return k < 0.08 ? -0.7 : 0; }
function px(c, x, y, col) { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= GW || y >= GH) return; const k = (y * GW + x) * 3; c.d[k] = col[0]; c.d[k + 1] = col[1]; c.d[k + 2] = col[2]; if (c.m) c.m[y * GW + x] = 1; }
function line(c, a, b, col) { const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]))); for (let k = 0; k <= n; k++) px(c, a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n, col); }

/** A hand held up toward the fire: back of the hand to us, fingers up-left, thumb on top. */
function hand(c, P, s, x, y, sh, lit) {
  const pts = smooth([P(x + 0.02, y - 0.025), P(x - 0.02, y - 0.03), P(x - 0.05, y - 0.01), P(x - 0.068, y + 0.025), P(x - 0.062, y + 0.05), P(x - 0.04, y + 0.045), P(x - 0.03, y + 0.06), P(x - 0.012, y + 0.058), P(x + 0.0, y + 0.03), P(x + 0.022, y + 0.02)], null, 3);
  const m = vol(c, [pts], { ...sh(SKIN, 3.0 + lit * 0.7), thick: Math.max(2, 0.03 * s), dir: 2.2, rimLit: 1.5, outline: [70, 30, 26], litOutline: [180, 90, 52] });
  // finger separations (tiny dark strokes) when big enough
  if (s > 110) for (let k = 0; k < 2; k++) { const a = P(x - 0.03 - k * 0.012, y + 0.0 + k * 0.006), b = P(x - 0.05 - k * 0.012, y + 0.02 + k * 0.006); line(c, a, b, SKIN[3]); }
}

// ================================================================ the head
const A = 0.088, BT_ = 0.118, BB = 0.106;                                 // skull half width (= depth), crown, chin (m)
const HAIRLINE = (xl) => 0.06 - 0.03 * (xl / A) * (xl / A) - 0.016 * Math.max(0, -xl / A) - 0.004 * Math.max(0, xl / A);   // side-parted, swept
// midline profile (y, z) from the hairline to under the chin — z grows where the nose and lips stand out
const PROF = [[0.004, 0.082], [-0.008, 0.087], [-0.02, 0.093], [-0.03, 0.099], [-0.036, 0.095], [-0.042, 0.086], [-0.05, 0.088], [-0.056, 0.087], [-0.062, 0.082], [-0.068, 0.085], [-0.075, 0.079]];

function drawHead(c, o, P) {
  const s = o.s, yaw = o.yaw ?? -1.15, I = o.I ?? 1, t = o.t ?? 0, tilt = o.tilt ?? 0;
  const [hcx, hcy] = P(-0.1 + 0.01 * clamp01(1 + yaw / 1.15), 0.655);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
  const Lf = n3(-0.8, -0.25, 0.55), Lm = n3(0.5, 0.55, -0.65);
  const toScr = (xl, yl, zl) => { const xv = xl * cy + zl * sy, zv = -xl * sy + zl * cy; return [hcx + (xv * ct - yl * st) * s, hcy - (xv * st + yl * ct) * s, zv]; };
  // ---- hair curtains (each side of the face, down onto the shoulders/chest), faded in/out with their facing
  for (const side of [-1, 1]) {
    const xl = side * 0.9 * A, zl = -0.05 * A;
    const xv = xl * cy + zl * sy, zv = -xl * sy + zl * cy;
    const vis = clamp01((zv + 0.5 * A) / (0.25 * A));
    if (vis <= 0) continue;
    const out = xv >= 0 ? 1 : -1;
    const top = [hcx + xv * s, hcy - 0.02 * s], len = 0.27 * s, w0 = 0.032 * s, w1 = 0.05 * s, pts = [];
    const sw = 0.004 * Math.sin(t * 1.4 + side);
    for (let k = 0; k <= 10; k++) { const u = k / 10, wave = Math.sin(u * 8.5 + side * 1.3) * 0.012 * s * u; pts.push([top[0] + out * (w0 * 0.55 + u * (w1 - w0 * 0.55)) + wave + sw * s * u, top[1] + u * len]); }
    for (let k = 10; k >= 0; k--) { const u = k / 10, wave = Math.sin(u * 8.5 + side * 1.3 + 0.8) * 0.01 * s * u; pts.push([top[0] - out * w0 * (0.55 - u * 0.5) + wave + sw * s * u, top[1] + u * len * (0.93 + 0.05 * Math.sin(k + side))]); }
    vol(c, [pts], { ramp: HAIR, base: 2.3 + (I - 1), gain: 1.2, thick: Math.max(2, 0.02 * s), light: LIGHT, dir: 1.0, rimLit: 1.0, rimShade: 0.8, slope: 0.7, outline: OUT, litOutline: [74, 30, 18], alpha: vis, tex: hairTex() });
  }
  // ---- per-pixel head: hair shell (slightly bigger, up) + skull with the face region
  const HA = A + 0.016, HB = BT_ + 0.012, hOff = 0.008;
  const rx = Math.ceil(HA * s) + 3, ry = Math.ceil(HB * s) + 3;
  const flick = (I - 1) * 1.5;
  for (let j = -ry; j <= ry; j++) for (let i = -rx; i <= rx; i++) {
    const X = R(hcx) + i, Y = R(hcy) + j; if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue;
    const dx = (X + 0.5 - hcx) / s, dy = -(Y + 0.5 - hcy) / s;
    const xv = dx * ct + dy * st, yv = -dx * st + dy * ct;
    const b = BT[((Y & 3) << 2) | (X & 3)];
    const yn = yv > 0 ? yv / BT_ : yv / BB;
    const jaw = yn < -0.3 ? 1 - 0.3 * Math.pow((-0.3 - yn) / 0.7, 1.7) : 1, Aj = A * jaw;
    const half = Aj * Math.sqrt(Math.max(0, 1 - yn * yn));
    const inSkull = yn > -1 && yn < 1 && Math.abs(xv) < half;
    const hx = xv / HA, hyN = (yv - hOff) / HB, inShell = hx * hx + hyN * hyN <= 1 && yv > -0.3 * BB;
    if (!inSkull && !inShell) continue;
    let col = null;
    if (inSkull) {
      const e = Math.max(0, 1 - (xv / Math.max(1e-4, Aj)) ** 2 - yn * yn), zv = A * Math.sqrt(e);
      const xl = xv * cy - zv * sy, zl = xv * sy + zv * cy, yl = yv;
      const isFace = zl > 0.12 * A && Math.abs(xl) < 0.88 * A && yl < HAIRLINE(xl);
      const nx = xv / A, ny = yn * 0.75, nz = zv / A, nl = Math.hypot(nx, ny, nz) || 1;
      const df = Math.max(0, (nx * Lf[0] + ny * Lf[1] + nz * Lf[2]) / nl), dm = Math.max(0, (nx * Lm[0] + ny * Lm[1] + nz * Lm[2]) / nl);
      if (isFace) {
        let v = 2.4 + 3.3 * df * I + 0.9 * dm + flick * 0.4;
        if (yn < -0.82) v -= 0.7;                                          // under the chin
        const fl = Math.floor(v), f = v - fl, q = f < 0.34 ? fl : f > 0.66 ? fl + 1 : (f - 0.34) / 0.32 > b ? fl + 1 : fl;
        col = SKIN[Math.max(2, Math.min(7, q))];
        if (Math.abs(xv) > half - 1.1 / s || yn < -0.975) col = xv < 0 && df > 0.3 ? [150, 72, 50] : [44, 18, 18];
      } else col = hairCol(xl, yl, zl, df, dm, I, b);
    } else {
      const e = Math.max(0, 1 - hx * hx - hyN * hyN), zv = HA * Math.sqrt(e);
      const xl = xv * cy - zv * sy, zl = xv * sy + zv * cy;
      const faceZone = zl > 0.05 * A && Math.abs(xl) < 0.86 * HA && yv < HAIRLINE(Math.max(-A, Math.min(A, xl))) + 0.003;
      if (faceZone) continue;
      const nx = hx, ny = hyN * 0.8, nz = Math.sqrt(e), nl = Math.hypot(nx, ny, nz) || 1;
      const df = Math.max(0, (nx * Lf[0] + ny * Lf[1] + nz * Lf[2]) / nl), dm = Math.max(0, (nx * Lm[0] + ny * Lm[1] + nz * Lm[2]) / nl);
      col = hairCol(xl, yv, zl, df, dm, I, b);
      if (hx * hx + hyN * hyN > 1 - 2.6 / (HA * s)) col = df > 0.3 ? [66, 26, 15] : OUT;
    }
    const k = (Y * GW + X) * 3; c.d[k] = col[0]; c.d[k + 1] = col[1]; c.d[k + 2] = col[2]; if (c.m) c.m[Y * GW + X] = 1;
  }
  profile(c, s, toScr, cy, sy, I, hcx);
  drawFace(c, o, s, toScr, cy, sy, I);
}

/** When she looks aside, the midline (brow, nose, lips, chin) stands out of the skull outline on the facing side. */
function profile(c, s, toScr, cy, sy, I, hcx) {
  const side = sy < 0 ? -1 : 1, a = clamp01((Math.abs(sy) - 0.35) / 0.3);
  if (a <= 0) return;
  const pts = PROF.map(([y, z]) => toScr(0, y, z));
  for (let k = 0; k + 1 < pts.length; k++) {
    const [x0, y0] = pts[k], [x1, y1] = pts[k + 1], n = Math.max(1, Math.ceil(Math.abs(y1 - y0)) * 2);
    for (let j = 0; j <= n; j++) {
      const X = x0 + (x1 - x0) * j / n, Y = R(y0 + (y1 - y0) * j / n);
      // fill skin from the profile toward the head centre until we meet already-drawn face (skin) pixels
      const xe = R(X);
      for (let x = xe; side < 0 ? x <= R(hcx) : x >= R(hcx); x -= side) {
        if (x < 0 || x >= GW || Y < 0 || Y >= GH) break;
        const kk = (Y * GW + x) * 3, r = c.d[kk], g = c.d[kk + 1];
        const isSkin = r > 120 && g > 60 && r - g < 90 && r - g > 25 && c.d[kk + 2] < g;
        if (isSkin && x !== xe) break;
        const edge = x === xe && !isSkin;
        const col = edge ? [150, 70, 48] : SKIN[Math.min(7, 5 + (I > 1.05 ? 1 : 0))];
        if (a < 1 && a <= BT[((Y & 3) << 2) | (x & 3)]) continue;
        c.d[kk] = col[0]; c.d[kk + 1] = col[1]; c.d[kk + 2] = col[2]; if (c.m) c.m[Y * GW + x] = 1;
      }
    }
  }
}

function hairCol(xl, yl, zl, df, dm, I, b) {
  const ang = Math.atan2(xl + 0.25 * A, zl + 0.3 * A);
  const str = Math.sin(ang * 13 + yl * 55 + Math.sin(yl * 90) * 0.8);
  let v = 1.6 + 3.4 * df * I + 1.4 * dm + (str > 0.7 ? 0.9 : str < -0.8 ? -0.7 : 0);
  const fl = Math.floor(v), f = v - fl, q = f < 0.34 ? fl : f > 0.66 ? fl + 1 : (f - 0.34) / 0.32 > b ? fl + 1 : fl;
  return HAIR[Math.max(1, Math.min(7, q))];
}
const n3 = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
function pp(c, x, y, col, a = 1) {
  x = R(x); y = R(y); if (x < 0 || y < 0 || x >= GW || y >= GH) return;
  if (a < 1 && a <= BT[((y & 3) << 2) | (x & 3)]) return;
  const k = (y * GW + x) * 3; c.d[k] = col[0]; c.d[k + 1] = col[1]; c.d[k + 2] = col[2]; if (c.m) c.m[y * GW + x] = 1;
}

/** Eyes (arched lash line, 2×2 iris with a firelight catchlight, sclera), brows, nose, mouth/smile, cheeks. */
function drawFace(c, o, s, toScr, cy, sy, I) {
  const sm = clamp01(o.smile ?? 0), yaw = o.yaw ?? -1.15, blink = clamp01(o.blink ?? 0);
  const pxs = s * A / 12;                                              // ≈ 1 at a 12-px half-width head
  const LID = [30, 13, 12], IRIS = [84, 44, 26], PUP = [22, 10, 10], SCL = [228, 208, 190], CATCH = [255, 238, 204];
  const BROW = [70, 30, 18], LIP = [150, 58, 54], LIP_D = [92, 30, 32], LIP_L = [210, 118, 98], TEETH = [246, 232, 216], MOUTH = [70, 20, 24];
  const gaze = clamp01(1 + yaw / 0.9);                                 // the eyes reach us a little before the head does
  const dim = 0.72 + 0.28 * Math.min(1.1, I);
  const mul = (col, k) => [col[0] * k, col[1] * k, col[2] * k];
  for (const side of [-1, 1]) {
    const [X, Y] = toScr(side * 0.032, -0.003, 0.074);
    const facing = -(side * 0.4) * sy + cy;
    const vis = clamp01((facing - 0.1) / 0.28); if (vis <= 0) continue;
    const w = Math.max(1, Math.min(5, R(4.6 * pxs * Math.max(0.3, facing))));
    const x0 = R(X - w / 2), y0 = R(Y);
    const outerX = side > 0 ? x0 + w - 1 : x0;
    const open = (1 - blink) * (1 - 0.22 * sm);                         // 1 wide · ≈0.78 smiling · 0 shut
    if (pxs < 0.62 || w < 3) {                                          // tiny: a lid line and one dark pixel
      for (let i = 0; i < w; i++) pp(c, x0 + i, y0 - 1, LID, vis);
      if (open > 0.3) pp(c, R(X - (1 - gaze) * 0.6), y0, LID, vis);
    } else {
      // arched upper lid: corners one row lower than the middle; shut → a soft curve one row down
      for (let i = 0; i < w; i++) {
        const corner = i === 0 || i === w - 1;
        if (open < 0.2) pp(c, x0 + i, y0 + (corner ? 0 : 1), LID, vis);
        else pp(c, x0 + i, y0 - 1 + (corner ? 1 : 0), LID, vis);
      }
      if (open >= 0.2) {
        pp(c, outerX + side, y0 - 1, LID, vis * 0.85);                  // a small lash flick at the outer corner
        const irisW = 2;
        const cxI = x0 + (w - irisW) / 2 - (1 - gaze) * (w - irisW) / 2;
        const ix = Math.max(x0 + 1, Math.min(x0 + w - 1 - irisW, R(cxI)));
        for (let i = 1; i < w - 1; i++) {
          const X1 = x0 + i, isI = X1 >= ix && X1 < ix + irisW;
          pp(c, X1, y0, isI ? mul(IRIS, dim) : open > 0.5 ? mul(SCL, dim) : SKIN[4], vis);
        }
        pp(c, ix + 1, y0, PUP, vis);
        pp(c, ix, y0, CATCH, vis * Math.min(1, 0.55 + 0.45 * I));
        // lower row: the iris continues when the eye is open; a lifted lower lid when she smiles
        const lowA = clamp01((open - 0.72) / 0.08);
        for (let i = 0; i < irisW; i++) pp(c, ix + i, y0 + 1, mul(IRIS, dim * 0.78), vis * lowA);
        if (sm > 0.1) for (let i = 1; i < w - 1; i++) pp(c, x0 + i, y0 + 2, SKIN[3], vis * clamp01((sm - 0.1) * 2.5) * 0.9);
      }
    }
    // brow: a soft arch, the middle one row higher; lifts a little in the smile
    const bw = Math.max(2, Math.min(6, R(5 * pxs * Math.max(0.35, facing))));
    const [BXc, BYc] = toScr(side * 0.034, 0.031 + 0.004 * sm, 0.07);
    for (let i = 0; i < bw; i++) {
      const u = bw === 1 ? 0.5 : i / (bw - 1), outerU = side > 0 ? u : 1 - u;
      const yy = R(BYc) + (outerU > 0.8 ? 1 : 0) + (outerU < 0.15 ? 0 : 0) - (outerU > 0.3 && outerU < 0.75 ? 0 : 0);
      pp(c, R(BXc - bw / 2) + i, yy - (outerU > 0.25 && outerU <= 0.8 ? 0 : 0), BROW, vis * (outerU > 0.9 ? 0.55 : 1));
    }
  }
  // nose (front): shadow on the far side, a nostril, a warm highlight on the tip
  const front = cy, fa = clamp01((front - 0.25) * 2.2);
  if (fa > 0) {
    const [NX, NY] = toScr(0, -0.035, 0.094);
    pp(c, R(NX) + 1, R(NY) - 1, SKIN[3], fa * 0.7); pp(c, R(NX) + 1, R(NY), SKIN[3], fa);
    pp(c, R(NX) + 1, R(NY) + 1, SKIN[2], fa); pp(c, R(NX) - 1, R(NY) + 1, SKIN[3], fa * 0.6);
    pp(c, R(NX), R(NY), SKIN[6], fa * (0.5 + 0.5 * Math.min(1, I)));
  }
  // mouth: a soft line → a curved closed smile → a warm open smile ("D": teeth under a flat upper lip, curved bottom)
  const [MX, MY] = toScr(0, -0.059, 0.084);
  const mvis = clamp01((front - 0.3) * 3);
  if (mvis > 0) {
    const mw = Math.max(2, R((4 + 3 * sm) * pxs * front));
    const x0 = R(MX - mw / 2), y0 = R(MY);
    const op = pxs > 0.85 ? clamp01((sm - 0.62) / 0.2) : 0;                 // how open (0 closed … 1)
    for (let i = 0; i < mw; i++) {
      const e = mw === 1 ? 0 : Math.abs(i / (mw - 1) - 0.5) * 2;           // 0 centre … 1 corner
      const corner = i === 0 || i === mw - 1;
      if (corner) { pp(c, x0 + i, y0 - (sm > 0.25 ? 1 : 0), LIP_D, mvis * (sm < 0.2 ? 0.6 : 1)); continue; }
      if (op > 0) {                                                         // gentle open smile: a teeth line, lit lower lip
        pp(c, x0 + i, y0, e > 0.72 ? LIP_D : mul(TEETH, dim), mvis * op);
        if (e < 0.5) pp(c, x0 + i, y0 + 1, LIP_L, mvis * op);
        else pp(c, x0 + i, y0 + 1, SKIN[4], mvis * op * 0.0);
      }
      if (op < 1) {                                                         // closed: a soft curve, lit lower lip
        pp(c, x0 + i, y0, e > 0.7 ? LIP_D : LIP, mvis * (1 - op));
        if (e < 0.45 && front > 0.75) pp(c, x0 + i, y0 + 1, LIP_L, mvis * (0.5 + 0.4 * sm) * (1 - op));
      }
    }
  }
  // cheeks: soft blush (warmth) + a smile crease
  for (const side of [-1, 1]) {
    const [CX, CY] = toScr(side * 0.048, -0.028, 0.06);
    const facing = -(side * 0.6) * sy + cy, a = clamp01((facing - 0.25) * 2) * (0.18 + 0.32 * sm);
    for (let j = 0; j < 2; j++) for (let i = -1; i <= 1; i++) if (!(j === 1 && i !== 0)) pp(c, R(CX) + i, R(CY) + j, [222, 130, 112], a);
    if (sm > 0.35) { const [KX, KY] = toScr(side * 0.043, -0.052, 0.07); pp(c, R(KX) + side, R(KY), SKIN[3], clamp01((facing - 0.3) * 2) * clamp01((sm - 0.35) * 2)); }
  }
}
