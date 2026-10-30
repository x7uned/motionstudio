// The GAME CAMERA of «GTA 6: the city behind you»: a cute pixel camcorder (box body, lens barrel, two film reels, a
// red REC lamp) rendered as a tiny 3-D model, so camDir() turns it continuously: +1 faces right, 0 faces the viewer,
// −1 faces left (never a sprite swap). Plus its translucent view cone: a light fan from the lens over the side it faces.
// The fan's footprint on the street is the timeline's view WITHOUT the drawing lag (the cone shows where the camera
// looks; drawnAt() — the drawing — lags behind it on the fast turn).
import { EV, camDir, CAM_ICON, HERO_X, TURN2 } from "../timeline.mjs";
import { hex, mix, bayer, sm, clamp01, ease, lerp } from "./street-kit.mjs";

const R = Math.round;
export const CAM_IN = [EV.camera - 0.32, EV.camera + 0.12];        // the camera dissolves in on "camera"
export const CONE_IN = [EV.camera + 0.1, EV.see + 0.05];          // the cone opens out of the lens toward "see"
const PITCH = 0.32, LIGHT = (() => { const v = [-0.55, -0.65, 0.55], l = Math.hypot(...v); return v.map((a) => a / l); })();
const BODY = ["#07060E", "#141026", "#221C3C", "#30285A", "#40367A", "#564C98", "#7268B8", "#9890D4"];
const REEL = ["#1A1A2A", "#2C2C42", "#40405C", "#58587A", "#727296", "#8E8EB0", "#AEAECC", "#D0D0E4"];
const LENS = ["#1A1E2E", "#2A3046", "#3E4662", "#56607E", "#727C9A", "#949CB8", "#B8C0D6", "#E0E6F2"];

// ---------------------------------------------------------------- mesh (local units = grid px; +x = lens direction)
const FACES = [];
function quad(vs, n, ramp, tag) { FACES.push({ vs, n, ramp, tag }); }
function box(x0, x1, y0, y1, z0, z1, ramp, tag) {
  quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], [1, 0, 0], ramp, tag);
  quad([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], [-1, 0, 0], ramp, tag);
  quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]], [0, -1, 0], ramp, tag);
  quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], [0, 1, 0], ramp, tag);
  quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], [0, 0, 1], ramp, tag === "body" ? "bodyZ+" : tag);
  quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], [0, 0, -1], ramp, tag === "body" ? "bodyZ-" : tag);
}
/** Prism of an n-gon: axis "x" (lens) or "z" (reels), centre c, radius r, from a to b along the axis. */
function prism(axis, c, r, a, b, n, ramp, tag, capTag) {
  const P = (ang, s) => (axis === "x" ? [s, c[1] + Math.sin(ang) * r, c[2] + Math.cos(ang) * r] : [c[0] + Math.cos(ang) * r, c[1] + Math.sin(ang) * r, s]);
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, am = (a0 + a1) / 2;
    const nrm = axis === "x" ? [0, Math.sin(am), Math.cos(am)] : [Math.cos(am), Math.sin(am), 0];
    quad([P(a0, a), P(a1, a), P(a1, b), P(a0, b)], nrm, ramp, tag);
  }
  const cap = (s, sign) => { const vs = []; for (let i = 0; i < n; i++) vs.push(P((i / n) * Math.PI * 2, s)); quad(vs, axis === "x" ? [sign, 0, 0] : [0, 0, sign], ramp, capTag ?? tag); };
  cap(b, 1); cap(a, -1);
}
box(-10, 10, -6, 6, -6, 6, BODY, "body");
box(-14, -10, -5, 0, -3, 3, BODY, "eye");
prism("x", [0, 0, 0], 4.6, 10, 15, 12, LENS, "barrel", "ring");
prism("x", [0, 0, 0], 3.2, 15, 15.6, 12, LENS, "glassrim", "glass");
prism("z", [-4.6, -10.6, 0], 4.6, -1.7, 1.7, 14, REEL, "reel", "reelcap");
prism("z", [4.6, -10.6, 0], 4.6, -1.7, 1.7, 14, REEL, "reel", "reelcap");

function xf(p, th) {
  const c = Math.cos(th), s = Math.sin(th), x = p[0] * c - p[2] * s, zd = p[0] * s + p[2] * c;
  return [x, p[1] * Math.cos(PITCH) + zd * Math.sin(PITCH), -p[1] * Math.sin(PITCH) + zd * Math.cos(PITCH)];
}
export const SC = 1.4;   // model scale (grid px per model unit)
const xfP = (p, th) => xf(p, th).map((v) => v * SC);
/** Yaw angle for a facing d (−1..+1): ≈0 = right, π/2 = toward the viewer, ≈π = left. */
export const yawOf = (d) => 0.38 + (Math.PI - 0.76) * (Math.acos(Math.max(-1, Math.min(1, d))) / Math.PI);   // a 3/4 bias so the lens shows

/** Lens centre on screen (the cone's apex) for camera centre (x, y) and facing d. */
export function lensAt(x, y, d) { const p = xfP([16.2, 0, 0], yawOf(d)); return [x + p[0], y + p[1]]; }

// scratch buffer for the camera sprite
const SW = 84, SH = 76, buf = new Uint8ClampedArray(SW * SH * 3), msk = new Uint8Array(SW * SH);
function put(x, y, c) { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= SW || y >= SH) return; const i = y * SW + x, p = hex(c); buf[i * 3] = p[0]; buf[i * 3 + 1] = p[1]; buf[i * 3 + 2] = p[2]; msk[i] = 1; }
function fillPoly(pts, colAt) {
  let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++) put(x, y, colAt(x, y));
  }
}

/** Draw the game camera centred at screen (x, y) facing d, alpha a (dither dissolve), REC lamp pulse rec 0..1. */
export function drawCamera(c, x, y, d, a, t) {
  if (a <= 0) return;
  msk.fill(0);
  const th = yawOf(d), ox = SW / 2, oy = SH / 2 + 2;
  const vis = [];
  for (const F of FACES) {
    const n = xf(F.n, th); if (n[2] <= 0.02) continue;
    const ps = F.vs.map((v) => xfP(v, th)); const depth = ps.reduce((s, p) => s + p[2], 0) / ps.length;
    const b = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
    vis.push({ F, ps, depth, b, n });
  }
  vis.sort((p, q) => p.depth - q.depth);
  for (const V of vis) {
    const pts = V.ps.map((p) => [ox + p[0], oy + p[1]]), F = V.F;
    let lv = 1.6 + V.b * 5.2;
    if (F.tag === "glass") {
      const [cx, cy] = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      fillPoly(pts, (X, Y) => { const u = (Y - cy + 3) / 6; return u < 0.35 ? "#7AE8FF" : u < 0.7 ? "#2E9AD0" : "#1A4A8A"; });
      put(cx - 1, cy - 1, "#FFFFFF"); put(cx, cy - 1, "#E8FCFF"); put(cx + 1, cy + 1, "#9AF4FF");
      continue;
    }
    if (F.tag === "reelcap") {
      const [cx, cy] = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      fillPoly(pts, (X, Y) => (bayer(X, Y) < 0.5 ? F.ramp[Math.min(7, R(lv))] : F.ramp[Math.min(7, R(lv - 0.5))]));
      // spokes rotating slowly (the reels turn while it films)
      const spin = t * 2.2 * (d >= 0 ? 1 : -1);
      for (let k = 0; k < 3; k++) { const an = spin + (k * Math.PI * 2) / 3, sx = Math.cos(an) * Math.abs(V.n[2]), sy = Math.sin(an); put(cx + sx * 2.2, cy + sy * 2.2, F.ramp[1]); }
      put(cx, cy, F.ramp[0]);
      continue;
    }
    if (F.tag === "ring") lv += 0.6;
    if (F.tag === "bodyZ+" || F.tag === "bodyZ-") lv += 0.3;
    const lo = Math.floor(lv), fr = lv - lo;
    fillPoly(pts, (X, Y) => F.ramp[Math.max(0, Math.min(7, fr > bayer(X, Y) ? lo + 1 : lo))]);
    // REC lamp on the side panels, a soft pulse
    if (F.tag === "bodyZ+" || F.tag === "bodyZ-") {
      const sgn = F.tag === "bodyZ+" ? 1 : -1, p = xfP([-6.2, -3.2, 6 * sgn], th), q = [ox + p[0], oy + p[1]], pulse = 0.5 + 0.5 * Math.sin(t * 5.2);
      const core = mix("#C81E36", "#FF5A6A", pulse);
      for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (Math.abs(i) + Math.abs(j) < 2) put(q[0] + i, q[1] + j, Math.abs(i) + Math.abs(j) ? mix("#8A1424", "#E8303E", pulse) : core);
      if (pulse > 0.6) put(q[0], q[1], "#FFD0D4");
      // a little stripe of the brand-less panel
      const s0 = xfP([2, 3.6, 6.05 * sgn], th), s1 = xfP([8, 3.6, 6.05 * sgn], th); for (let k = 0; k <= 6; k++) put(ox + lerp(s0[0], s1[0], k / 6), oy + lerp(s0[1], s1[1], k / 6), "#E8546E");
    }
    if (F.tag === "body" && V.n[1] < -0.2) { // top face highlight edge
      for (let k = 0; k <= 10; k++) { const u = k / 10; put(lerp(pts[0][0], pts[1][0], u), lerp(pts[0][1], pts[1][1], u), F.ramp[7]); }
    }
  }
  // dark outline around the silhouette, then copy with a dither dissolve
  const out = hex("#0B0812"), d0 = c.d, CW = c.w, x0 = R(x - ox), y0 = R(y - oy);
  for (let j = 0; j < SH; j++) for (let i = 0; i < SW; i++) {
    const k = j * SW + i, X = x0 + i, Y = y0 + j; if (X < 0 || Y < 0 || X >= CW || Y >= c.h) continue;
    if (a < 1 && a <= bayer(X, Y)) continue;
    const p = (Y * CW + X) * 3;
    if (msk[k]) { d0[p] = buf[k * 3]; d0[p + 1] = buf[k * 3 + 1]; d0[p + 2] = buf[k * 3 + 2]; }
    else if ((i > 0 && msk[k - 1]) || (i < SW - 1 && msk[k + 1]) || (j > 0 && msk[k - SW]) || (j < SH - 1 && msk[k + SW])) { d0[p] = out[0]; d0[p + 1] = out[1]; d0[p + 2] = out[2]; }
  }
}

/** The camera's screen centre for a view V and time t (gentle bob; drops in 6 px as it appears). */
export function camPos(V, t) {
  const appear = sm(t, CAM_IN[0], CAM_IN[1]);
  return [V.X(CAM_ICON.x), V.Y(CAM_ICON.y) + Math.sin(t * 2.3) * 1.6 - (1 - ease(appear)) * 8];
}

/** The cone footprint (world x range on the street) for facing d: same constants as timeline drawnAt, no lag. */
export function footprint(d) {
  const a = Math.abs(d), near = -40 - (1 - a) * 90, far = 130 + a * 640;
  return d >= 0 ? [HERO_X + near, HERO_X + far] : [HERO_X - far, HERO_X - near];
}
/** Continuous version for the drawn cone: identical to footprint() for |d| ≥ 0.45, blended through d = 0 (where the
 *  timeline's side flips) so the fan never jumps in one frame. Returns [left, right] world x and the side weight s. */
export function fanFoot(d) {
  const a = Math.abs(d), near = -40 - (1 - a) * 90, far = 130 + a * 640, s = Math.max(-1, Math.min(1, Math.sin((Math.PI / 2) * Math.max(-1, Math.min(1, d / 0.45))))), w = (s + 1) / 2;
  return { L: HERO_X + lerp(-far, near, w), R: HERO_X + lerp(-near, far, w), s, a };
}

/**
 * The translucent light fan from the lens. open 0..1 grows it out of the lens; a = fill strength. Edges: bright
 * dithered rays with dashes marching outward. Pixels are tinted (integer math), not redrawn.
 */
export function drawCone(c, V, t, d, open, a = 1) {
  if (open <= 0 || a <= 0) return;
  const [cx, cy] = camPos(V, t), [lx, ly] = lensAt(cx, cy, d);
  const F = fanFoot(d), xL = Math.max(-80, V.X(F.L)), xR = Math.min(620, V.X(F.R)), wR = (F.s + 1) / 2, wL = 1 - wR;
  const TAN = 0.62 * (0.25 + 0.75 * F.a);   // mid-turn (facing us) the fan tips down
  // fan polygon (scaled about the apex by open): apex → right top → right bottom → left bottom → left top. The top
  // corner on the side the camera faces rises at TAN; the one behind it sits on the apex (blended through the turn).
  const S = (p) => [lx + (p[0] - lx) * open, ly + (p[1] - ly) * open];
  const TR = [lerp(lx, xR, wR), lerp(ly, ly - Math.abs(xR - lx) * TAN, wR)], TL = [lerp(lx, xL, wL), lerp(ly, ly - Math.abs(xL - lx) * TAN, wL)];
  const pts = [[lx, ly], S(TR), S([xR, 960]), S([xL, 960]), S(TL)];
  const L = hex("#FFF2C8"), dd = c.d, W = c.w;
  let ya = Infinity, yb = -Infinity; for (const p of pts) { ya = Math.min(ya, p[1]); yb = Math.max(yb, p[1]); }
  ya = Math.max(0, Math.floor(ya)); yb = Math.min(c.h - 1, Math.ceil(yb));
  for (let y = ya; y <= yb; y++) {
    const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    if (xs.length < 2) continue; xs.sort((p, q) => p - q);
    const xa = Math.max(0, Math.round(xs[0])), xb = Math.min(W, Math.round(xs[xs.length - 1]));
    const ea = xs[0], eb = xs[xs.length - 1];
    for (let x = xa; x < xb; x++) {
      const dist = Math.hypot(x - lx, y - ly), e = Math.min(x - ea, eb - x), rim = 0.26 * Math.exp(-e / 6) * (1 - sm(dist, 120, 560));
      const k = a * ((0.15 + 0.3 * Math.exp(-dist / 90)) * (0.7 + 0.3 * Math.sin(dist * 0.06 - t * 3.2)) * (y > 560 ? 0.6 : 1) + rim);
      const s = k * 8, lo = Math.floor(s), q = (s - lo > bayer(x, y) ? lo + 1 : lo) / 8; if (q <= 0) continue;
      const p = (y * W + x) * 3; dd[p] += (L[0] - dd[p]) * q; dd[p + 1] += (L[1] - dd[p + 1]) * q; dd[p + 2] += (L[2] - dd[p + 2]) * q;
    }
  }
  // edge rays: bright core with marching dashes, fading with distance
  const ray = (q, p, w) => {
    if (w <= 0.02) return; const i0 = Math.hypot(q[0] - lx, q[1] - ly), n = Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1])); if (n < 2) return;
    for (let i = 3; i <= n; i++) {
      const u = i / n, x = R(q[0] + (p[0] - q[0]) * u), y = R(q[1] + (p[1] - q[1]) * u); if (x < 0 || y < 0 || x >= W || y >= c.h) continue;
      const fadeK = w * (a * (1 - sm(i + i0, 60, 420)) * 0.95 + 0.05 * a), dash = ((i + i0 - t * 40) % 9 + 9) % 9 < 6;
      if (fadeK > bayer(x, y) && dash) { const pp = (y * W + x) * 3; dd[pp] = 255; dd[pp + 1] = 248; dd[pp + 2] = 214; }
      else if (fadeK * 0.5 > bayer(x, y)) { const pp = (y * W + x) * 3; dd[pp] += (255 - dd[pp]) * 0.4; dd[pp + 1] += (240 - dd[pp + 1]) * 0.4; dd[pp + 2] += (190 - dd[pp + 2]) * 0.4; }
    }
  };
  ray(pts[0], pts[1], wR); ray(pts[0], pts[4], wL); ray(pts[4], pts[3], Math.max(wR, 0.5)); ray(pts[1], pts[2], Math.max(wL, 0.5));
  // lens glow
  for (let y = R(ly - 7); y <= R(ly + 7); y++) for (let x = R(lx - 7); x <= R(lx + 7); x++) { const r = Math.hypot(x - lx, y - ly) / 7; if (r < 1 && a * open * (1 - r) ** 1.5 * 0.8 > bayer(x, y)) { if (x < 0 || y < 0 || x >= W || y >= c.h) continue; const p = (y * W + x) * 3; dd[p] += (255 - dd[p]) * 0.5; dd[p + 1] += (246 - dd[p + 1]) * 0.5; dd[p + 2] += (200 - dd[p + 2]) * 0.5; } }
}
export { TURN2 };
