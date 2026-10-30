// The two big pixel hands (our own drawing): forearms that come in from the left (YOU: the channel hero's white T-shirt
// sleeve) and the right edge (FRIEND: coral hoodie sleeve), palms facing the camera so every move reads at phone size.
// Poses: F fist (pumping), R rock, P paper (flat hand, fingers fanned forward), S scissors (index + middle in a V).
// Every pose is baked once into an offscreen sprite (wrist at the origin); a pose change is a per-pixel ordered-dither
// crossfade between two sprites (≥ 6 frames), the pump is an eased bob with a small elbow tilt (column shear).
import { Canvas, bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import { blob, ell, tube, bez, RAMP } from "./cute.mjs";
import { ROUNDS, ARMS, EV } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const KEY = "#FF00FE";
export const SKIN_FRIEND = ["#1E0E08", "#3E1E10", "#5E3018", "#7E4624", "#9C5E34", "#B87A4A", "#D09A68", "#E4BC90"];
const SLEEVE = { you: ["#2A2A3A", "#4A4A60", "#6E6E88", "#9494AE", "#B8B8CE", "#D4D4E4", "#EAEAF4", "#FFFFFF"], friend: ["#2E0A0C", "#5E1618", "#8E2626", "#BE3C34", "#E05A44", "#F08060", "#F8A88A", "#FDD4C0"] };
// sprite frame: local x −300..130, y −80..80
const SX0 = -300, SW = 430, SY0 = -80, SH = 160;

function drawPose(c, pose, dir, skin, sleeve, { Z = 1.65, ox = 0, oy = 0, arm = true, icon = false } = {}) {
  // local hand units (wrist at 0, 0, +x = towards the opponent), scaled by Z; the forearm keeps its length
  const P = (x, y) => { const X = x * (x > -12 ? Z : 1) + (x > -12 ? 0 : -12 * (Z - 1)); return [ox + (dir > 0 ? X - SX0 : SW - (X - SX0)), oy + y * Z - SY0]; };
  const Pp = (pts) => pts.map(([x, y]) => P(x, y));
  const o0 = { ramp: skin, base: icon ? 4.6 : 3.6, gain: icon ? 1.2 : 1.8, slope: 0.9, thick: icon ? 4 : 10, light: [-0.55, -0.85], outline: "#1A0C10" };
  const S = (polys, o = {}) => blob(c, polys.map(Pp), { ...o0, ...o });
  const crease = (x0, y0, x1, y1) => { const a = P(x0, y0), b = P(x1, y1); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), skin[icon ? 2 : 1]); };
  const fore = arm ? [tube([[-300, 3], [-120, 1], [-12, 0], [6, 0]], 19, 15.5)] : [];
  const finger = (x0, y0, len, ang, r = 5.4) => tube([[x0, y0], [x0 + Math.cos(ang) * len * 0.5, y0 + Math.sin(ang) * len * 0.5], [x0 + Math.cos(ang) * len, y0 + Math.sin(ang) * len]], r, r * 0.88);
  const roll = (y, w, h = 5.6) => tube([[16, y], [16 + w, y]], h, h);
  if (pose === "F" || pose === "R") {
    // fist: back of the hand + four curled fingers (index on top) in ONE outline, creases between them, thumb across
    S([...fore, ell(12, 1, 19, 21), roll(-15.5, 26), roll(-5, 28), roll(5.5, 27), roll(15.5, 22)]);
    crease(30, -10.2, 44, -10.2); crease(30, 0.2, 45, 0.2); crease(30, 10.6, 42, 10.6);
    S([tube(bez([2, -17], [22, -21], [27, -6], 8), 6, 5.2)]);
  } else if (pose === "P") {
    // paper: four fingers fanned forward (drawn behind the palm), thumb up and out, palm + forearm in one outline
    for (const [y0, len, ang] of [[15, 31, 0.2], [5, 37, 0.07], [-5, 39, -0.05], [-14, 35, -0.17]]) S([finger(22, y0, len, ang, 5.3)]);
    S([...fore, ell(12, 1, 19, 21)]);
    S([tube(bez([6, -14], [14, -28], [27, -36], 8), 6, 4.8)]);
    crease(10, -8, 20, 5); crease(6, 6, 18, 12);
  } else if (pose === "S") {
    // scissors: index and middle out in a V (behind), ring + pinky curled in the palm outline, thumb across them
    S([finger(22, -5, 41, 0.17, 5.4)]);
    S([finger(22, -14, 41, -0.3, 5.4)]);
    S([...fore, ell(12, 3, 19, 19), roll(5.5, 24), roll(15.5, 20)]);
    crease(30, 10.6, 39, 10.6);
    S([tube(bez([2, -4], [20, -9], [26, 6], 8), 6, 5.2)]);
  }
  if (arm) { // the sleeve at the screen edge: the hero's white T-shirt / the friend's coral hoodie
    blob(c, [Pp(tube([[-300, 3], [-96, 2]], 23, 22))], { ramp: sleeve, base: 4.4, gain: 1.6, thick: 12, light: [-0.55, -0.85], outline: "#14101E" });
    for (let y = -21; y <= 23; y++) { const [X, Y] = P(-96, y); c.px(X, Y, mix(sleeve[3], "#000000", 0.2)); c.px(X + (dir > 0 ? -1 : 1), Y, sleeve[2]); }
  }
}

const CACHE = new Map();
function sprite(side, pose) {
  const key = side + pose; if (CACHE.has(key)) return CACHE.get(key);
  const c = new Canvas(SW, SH, KEY), dir = side === "you" ? 1 : -1;
  drawPose(c, pose === "F" ? "F" : pose, dir, side === "you" ? RAMP.skin : SKIN_FRIEND, SLEEVE[side]);
  const k = [0xff, 0x00, 0xfe], m = new Uint8Array(SW * SH);
  for (let i = 0; i < SW * SH; i++) m[i] = c.d[i * 3] === k[0] && c.d[i * 3 + 1] === k[1] && c.d[i * 3 + 2] === k[2] ? 0 : 1;
  const s = { d: c.d, m }; CACHE.set(key, s); return s;
}

// ---------------------------------------------------------------- state per side over time
export const REST = { you: { x: 118, y: 378 }, friend: { x: 422, y: 378 } };
const XF = 0.24;               // pose crossfade (s) → 7 frames
/** Pose keys per side: [[t, pose], …] built from ROUNDS (fist from the pump start, the move at the reveal). */
function keys(side) {
  const out = [[-10, "F"]];
  for (const r of ROUNDS) {
    if (r.change !== undefined) { if (r[side]) out.push([r.change, r[side]]); continue; }
    if (r.only && r.only !== side) continue;
    out.push([r.pumps[0] - XF, "F"]);
    if (r[side]) out.push([r.at - XF * 0.5, r[side]]);
  }
  return out.sort((a, b) => a[0] - b[0]);
}
const KEYS = { you: keys("you"), friend: keys("friend") };
function poseAt(side, t) {
  const K = KEYS[side]; let i = 0; while (i < K.length - 1 && K[i + 1][0] <= t) i++;
  const B = K[i][1], A = i > 0 ? K[i - 1][1] : B, k = clamp01((t - K[i][0]) / XF);
  return { A, B, k: A === B ? 1 : k };
}
function pumpAt(side, t) {
  for (const r of ROUNDS) { if (!r.pumps || (r.only && r.only !== side)) continue; const [a, b] = r.pumps; if (t < a || t > b + 0.12) continue;
    const n = Math.max(1, Math.round((b - a) / 0.45)), u = clamp01((t - a) / (b - a)), ph = u * n, f = ph - Math.floor(ph);
    const bob = u >= 1 ? 0 : Math.sin(Math.PI * f) ** 1.4;                   // up and down n times, landing on the reveal
    const settle = t > b ? Math.sin(Math.PI * clamp01((t - b) / 0.12)) * 0.12 : 0;
    return { dy: -10 * bob + 3 * settle, tilt: -0.1 * bob };
  }
  return { dy: 0, tilt: 0 };
}
/** Horizontal slide of each arm (0 = in place, 1 = fully out of the frame). */
function outAt(side, t) {
  let o = sm(t, ...ARMS.outA) * (1 - sm(t, ...ARMS.inA));
  if (side === "friend") o = Math.max(o, sm(t, ...ARMS.robotOut) * (1 - sm(t, ...ARMS.robotIn)));
  return ease(o);
}
export function handState(side, t) {
  const p = poseAt(side, t), q = pumpAt(side, t), o = outAt(side, t), breathe = Math.sin(t * 2.1 + (side === "you" ? 0 : 1.7)) * 1.2;
  const dir = side === "you" ? 1 : -1, x = REST[side].x - dir * o * 260, y = REST[side].y + q.dy + breathe;
  return { ...p, x, y, tilt: q.tilt, out: o, dir };
}
/** Fingertip-ish point of the hand (for tags and sparkles). */
export function handTip(side, t) { const s = handState(side, t); return [s.x + s.dir * 62, s.y]; }

/** Draw one arm at time t. */
export function drawHand(c, side, t, dx = 0) {
  const s = handState(side, t); if (s.out >= 0.999 || dx < -560) return s;
  const A = sprite(side, s.A), B = sprite(side, s.B), d = c.d, W = c.w, H = c.h;
  const ox = R(s.x) + dx + (s.dir > 0 ? SX0 : -(SW + SX0)), oy = R(s.y) + SY0, pivot = -260;
  for (let lx = 0; lx < SW; lx++) {
    const X = ox + lx; if (X < 0 || X >= W) continue;
    const local = s.dir > 0 ? lx + SX0 : SX0 + SW - lx, off = R(s.tilt * (local - pivot) * 0.5);
    for (let ly = 0; ly < SH; ly++) {
      const Y = oy + ly + off; if (Y < 0 || Y >= H) continue;
      const sp = s.k >= 1 || s.k > bayer(X, Y) ? B : A, i = ly * SW + lx; if (!sp.m[i]) continue;
      const p = (Y * W + X) * 3; d[p] = sp.d[i * 3]; d[p + 1] = sp.d[i * 3 + 1]; d[p + 2] = sp.d[i * 3 + 2];
    }
  }
  return s;
}
/** Small icon of a move (for the circle, the bars, the cards): the same hand drawn small, baked once; a dissolves it. */
const ICONS = new Map();
function iconSprite(move, Z) {
  const key = move + Z; if (ICONS.has(key)) return ICONS.get(key);
  const c = new Canvas(SW, SH, KEY); drawPose(c, move, 1, RAMP.skin, SLEEVE.you, { Z, arm: false, icon: true });
  const k = [0xff, 0x00, 0xfe]; let x0 = SW, x1 = 0, y0 = SH, y1 = 0; const m = new Uint8Array(SW * SH);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const i = y * SW + x; if (!(c.d[i * 3] === k[0] && c.d[i * 3 + 1] === k[1] && c.d[i * 3 + 2] === k[2])) { m[i] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  const s = { d: c.d, m, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 + 1, h: y1 - y0 + 1 }; ICONS.set(key, s); return s;
}
export function moveIcon(c, cx, cy, move, a = 1, Z = 0.62) {
  if (a <= 0) return; const s = iconSprite(move, Z), d = c.d, ox = R(cx - s.cx), oy = R(cy - s.cy);
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const i = y * SW + x; if (!s.m[i]) continue; const X = ox + x, Y = oy + y; if (X < 0 || Y < 0 || X >= c.w || Y >= c.h) continue; if (a < 1 && a <= bayer(X, Y)) continue; const p = (Y * c.w + X) * 3; d[p] = s.d[i * 3]; d[p + 1] = s.d[i * 3 + 1]; d[p + 2] = s.d[i * 3 + 2]; }
}
export { EV };
