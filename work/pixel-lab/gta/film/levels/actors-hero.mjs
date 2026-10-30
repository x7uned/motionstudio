// The channel's own character (the user's pixel avatar, data/branding/xtuned-outro/v1/spritesheet.png, cells 192×208)
// standing on the front sidewalk of the sunset street. The sprite is never redrawn: it is only lit for golden hour (a
// gentle warm grade, a warm rim of sunlight on the edges that face the sun behind him), outlined (dark 1 px), mirrored
// (he turns with the game camera) and transformed (a small squash while turning, a startled hop). Pose / frame changes
// and the mirror dissolve with an ordered dither over ≥ 6 frames. The player is always rendered: never culled.
import sharp from "sharp";
import { bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, sm } from "../cute.mjs";
import { view } from "../world.mjs";
import { CAM } from "../timeline.mjs";
import { POSES, XF, MIRROR, HOP, HERO_X, LAND } from "./actors-time.mjs";

const R = Math.round;
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
export const CW = 192, CH = 208;
const SW = 1536;
const { data: SRC } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
export const AX = 101, FOOT = 201;          // cell x of the centre between his feet (mirror axis), cell row of the soles

// ---------------------------------------------------------------- golden-hour lighting, baked once per cell
const RIM = hex("#FFC46E"), RIM2 = hex("#FF9E6A"), OUT = hex("#1A0E1C");
const cells = new Map();
function bake(row, f) {
  const N = CW * CH, m = new Uint8Array(N), lit = new Uint8ClampedArray(N * 3);
  const A = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? 0 : SRC[((row * CH + y) * SW + f * CW + x) * 4 + 3]);
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (A(x, y) >= 128) { m[y * CW + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const on = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && m[y * CW + x] === 1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x;
    if (!m[i]) { if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) m[i] = 2; continue; }
    const s = ((row * CH + y) * SW + f * CW + x) * 4, r = SRC[s], g = SRC[s + 1], b = SRC[s + 2];
    // golden-hour grade: a touch warmer and softer (backlit by the low sun), shadows lean violet
    const lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    let c = [r * 0.95 + 10, g * 0.9 + 5, b * 0.86 + 10 + 10 * (1 - lum)];
    // warm rim on edges that face up / sideways (the sun sits right behind him, low in the sky)
    const low = clamp01((y - y0) / Math.max(1, y1 - y0));
    const up = !on(x, y - 1) ? 1 : !on(x, y - 2) ? 0.55 : !on(x, y - 3) ? 0.2 : 0;
    const side = !on(x - 1, y) || !on(x + 1, y) ? 0.55 : 0;
    const w = Math.max(up, side * (1 - 0.7 * low)) * (1 - 0.55 * low);
    if (w > 0) { const rc = up ? RIM : RIM2; c = c.map((v, k) => v + (rc[k] - v) * 0.58 * w); }
    lit.set(c.map((v) => Math.max(0, Math.min(255, v))), i * 3);
  }
  return { m, lit, box: [x0, y0, x1, y1] };
}
export function cell(row, f) { const key = row * 16 + f; let c = cells.get(key); if (!c) { c = bake(row, f); cells.set(key, c); } return c; }

// ---------------------------------------------------------------- pose timeline → the two cells to show and the blend
function lastOf(i, tEnd) { const [t0, row, seq, dur] = POSES[i], n = Math.max(0, Math.floor((tEnd - 1e-6 - t0) / dur)); return [row, seq[n % seq.length]]; }
export function poseAt(t) {
  let i = 0; while (i < POSES.length - 1 && POSES[i + 1][0] <= t) i++;
  const [t0, row, seq, dur] = POSES[i], n = Math.max(0, Math.floor((t - t0) / dur)), since = t - (t0 + n * dur);
  const B = [row, seq[n % seq.length]], prev = n > 0 ? [row, seq[(n - 1) % seq.length]] : i > 0 ? lastOf(i - 1, t0) : B;
  const k = clamp01(since / XF), A = k >= 1 ? B : prev;
  return { A, B, k: A[0] === B[0] && A[1] === B[1] ? 1 : k };
}
/** 0 = faces right (sprite as drawn), 1 = mirrored (faces left); the squash factor while turning. */
export function facing(t) {
  let mk = 0, sq = 1;
  for (const m of MIRROR) {
    if (t >= m.t[0]) mk = m.to ? clamp01((t - m.t[0]) / (m.t[1] - m.t[0])) : 1 - clamp01((t - m.t[0]) / (m.t[1] - m.t[0]));
    const u = (t - m.sq[0]) / (m.sq[1] - m.sq[0]);
    if (u > 0 && u < 1) sq = Math.min(sq, 1 - 0.42 * Math.sin(Math.PI * u) ** 1.5);
  }
  return { mk, sq };
}
export function hopAt(t) { const u = (t - HOP[0]) / (HOP[1] - HOP[0]); return u > 0 && u < 1 ? (u < 0.7 ? 9 * Math.sin((Math.PI * u) / 0.7) : 2 * Math.sin((Math.PI * (u - 0.7)) / 0.3)) : 0; }

export function heroState(t) { const p = poseAt(t), f = facing(t); return { ...p, cA: cell(...p.A), cB: cell(...p.B), ...f, lift: hopAt(t) }; }

// ---------------------------------------------------------------- camera (same easing as render.mjs) for HERO_BOX
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function cameraAt(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k }; }

/** Screen box of the character at time t (for layout checks): {x, y, w, h}. */
export function HERO_BOX(t) {
  const st = heroState(t), cam = cameraAt(t), V = view(cam.cx, cam.cy, { t }), sx = V.X(HERO_X), sy = V.Y(LAND);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const c of [st.cA, st.cB]) for (const fl of st.mk <= 0 ? [0] : st.mk >= 1 ? [1] : [0, 1]) {
    const b = c.box, a = (b[0] - AX) * st.sq, z = (b[2] + 1 - AX) * st.sq;
    const L = fl ? -z : a, Rr = fl ? -a : z; x0 = Math.min(x0, sx + L); x1 = Math.max(x1, sx + Rr);
    y0 = Math.min(y0, sy + (b[1] - FOOT - 1) - st.lift); y1 = Math.max(y1, sy + (b[3] - FOOT) - st.lift);
  }
  return { x: R(x0), y: R(y0), w: R(x1 - x0), h: R(y1 - y0 + 1) };
}

// ---------------------------------------------------------------- drawing
/** Contact shadow under his feet (the low sun is behind him, so it falls a little toward the viewer). */
export function drawHeroShadow(c, V, t, st = heroState(t)) {
  const cx = V.X(HERO_X) + 1, cy = V.Y(LAND) + 1, k = 1 - 0.35 * clamp01(st.lift / 9), rx = 40 * (1 - 0.15 * clamp01(st.lift / 9));
  c.tint(R(cx - rx - 2), R(cy - 4), R(rx * 2 + 4), 14, (X, Y) => { const q = ((X - cx) / rx) ** 2 + ((Y - cy - 2) / 5) ** 2; return q >= 1 ? 0 : 0.55 * k * (1 - q); }, "#160A1E", 3);
}

export function drawHero(c, V, t, st = heroState(t)) {
  const ax = V.X(HERO_X), oy = V.Y(LAND) - FOOT - R(st.lift), d = c.d, W = c.w, H = c.h;
  const bA = st.cA.box, bB = st.cB.box, v0 = Math.min(bA[1], bB[1]) - 1, v1 = Math.max(bA[3], bB[3]) + 1;
  const half = R((Math.max(AX - Math.min(bA[0], bB[0]), Math.max(bA[2], bB[2]) - AX) + 2) * st.sq) + 1;
  const mk = st.mk, sq = st.sq, k = st.k;
  for (let v = v0; v <= v1; v++) {
    const Y = oy + v; if (Y < 0 || Y >= H) continue;
    for (let X = R(ax - half); X <= R(ax + half); X++) {
      if (X < 0 || X >= W) continue;
      const flip = mk >= 1 ? true : mk <= 0 ? false : mk > bayer(X + 1, Y + 2);
      const dx = (X + 0.5 - ax) / sq, u = Math.floor(flip ? AX - dx : AX + dx);
      if (u < 0 || u >= CW) continue;
      const cl = k >= 1 || k > bayer(X, Y) ? st.cB : st.cA, i = v * CW + u, m = cl.m[i];
      if (!m) continue;
      const p = (Y * W + X) * 3;
      if (m === 2) { d[p] = OUT[0]; d[p + 1] = OUT[1]; d[p + 2] = OUT[2]; continue; }
      d[p] = cl.lit[i * 3]; d[p + 1] = cl.lit[i * 3 + 1]; d[p + 2] = cl.lit[i * 3 + 2];
    }
  }
  return st;
}
