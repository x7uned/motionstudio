// The channel's own character (the user's pixel avatar, data/branding/xtuned-outro/v1/spritesheet.png, cells 192×208),
// generic version of gta/film/levels/actors-hero.mjs for any pixel film. The sprite is never redrawn: it is only graded
// for the scene's light, outlined (dark 1 px), mirrored, squashed while turning, lifted for a hop, and clipped (e.g. to a
// window). Pose / frame changes and the mirror dissolve with an ordered dither over ≥ 6 frames — never one frame.
//
// Sprite rows (frames): 0 idle (0–6, 2 = wink) · 1 wave (0–3) · 2 talk/explain (0–5) · 3 shrug/open hands (0–5) ·
// 4 point up-right (0–5) · 5 think, hand on chin (0–5) · 6 arms crossed (0–5) · 7 surprised, hands up (0–5) ·
// 8 hands together at the chest (0–5) · 9 excited/happy (0–5).
//
//   const H = makeHero({ poses, mirror, hops, grade: "golden", x: (t) => wx, y: (t) => feetY });
//   H.draw(c, V, t, { clip: (X, Y) => true, a: 1 });  H.shadow(c, V, t);  H.box(V, t);  H.state(t)
// poses: [[t0, row, [frames], secondsPerFrame], …] (sorted); mirror: [{ t: [a, b], sq: [a, b], to: 1|0 }];
// hops: [[t0, t1, height]]; scale: 1 (grid px per sprite px) or 0.5 (half size, drawn into the grid).
import sharp from "sharp";
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
export const CW = 192, CH = 208, SW = 1536;
export const AX = 101, FOOT = 201;          // cell x of the centre between his feet (mirror axis), cell row of the soles
const { data: SRC } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// ---------------------------------------------------------------- light grades (r, g, b, lum, rim weight) → [r, g, b]
const RIMS = {
  golden: { rim: "#FFC46E", rim2: "#FF9E6A", k: 0.58, out: "#1A0E1C" },
  day: { rim: "#FFF4D8", rim2: "#D8ECFF", k: 0.35, out: "#141022" },
  lamp: { rim: "#FFD9A0", rim2: "#FFB070", k: 0.45, out: "#160C14" },
  cabin: { rim: "#E8F4FF", rim2: "#C8DCFF", k: 0.3, out: "#121424" },
  none: { rim: "#FFFFFF", rim2: "#FFFFFF", k: 0, out: "#0B0812" },
};
const GRADE = {
  golden: (r, g, b, lum) => [r * 0.95 + 10, g * 0.9 + 5, b * 0.86 + 10 + 10 * (1 - lum)],
  day: (r, g, b) => [r * 0.98 + 3, g * 0.98 + 3, b * 0.98 + 6],
  lamp: (r, g, b, lum) => [r * 0.96 + 12, g * 0.88 + 6, b * 0.78 + 6 + 14 * (1 - lum)],          // warm bedside lamp, violet shadows
  cabin: (r, g, b, lum) => [r * 0.92 + 4, g * 0.94 + 6, b * 0.98 + 12 + 6 * (1 - lum)],           // cool cabin daylight
  none: (r, g, b) => [r, g, b],
};

const cache = new Map();
function bake(row, f, grade) {
  const N = CW * CH, m = new Uint8Array(N), lit = new Uint8ClampedArray(N * 3), G = GRADE[grade], L = RIMS[grade];
  const RIM = hex(L.rim), RIM2 = hex(L.rim2);
  const A = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? 0 : SRC[((row * CH + y) * SW + f * CW + x) * 4 + 3]);
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (A(x, y) >= 128) { m[y * CW + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const on = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && m[y * CW + x] === 1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x;
    if (!m[i]) { if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) m[i] = 2; continue; }
    const s = ((row * CH + y) * SW + f * CW + x) * 4, r = SRC[s], g = SRC[s + 1], b = SRC[s + 2], lum = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    let c = G(r, g, b, lum);
    if (L.k > 0) {
      const low = clamp01((y - y0) / Math.max(1, y1 - y0)), up = !on(x, y - 1) ? 1 : !on(x, y - 2) ? 0.55 : !on(x, y - 3) ? 0.2 : 0, side = !on(x - 1, y) || !on(x + 1, y) ? 0.55 : 0;
      const w = Math.max(up, side * (1 - 0.7 * low)) * (1 - 0.55 * low);
      if (w > 0) { const rc = up ? RIM : RIM2; c = c.map((v, k) => v + (rc[k] - v) * L.k * w); }
    }
    lit.set(c.map((v) => Math.max(0, Math.min(255, v))), i * 3);
  }
  return { m, lit, box: [x0, y0, x1, y1], out: hex(L.out) };
}
export function cell(row, f, grade = "none") { const key = `${grade}:${row}:${f}`; let c = cache.get(key); if (!c) { c = bake(row, f, grade); cache.set(key, c); } return c; }

export function makeHero({ poses, mirror = [], hops = [], grade = "none", x = () => 0, y = () => 0, xf = 0.2, scale = 1 }) {
  function lastOf(i, tEnd) { const [t0, row, seq, dur] = poses[i], n = Math.max(0, Math.floor((tEnd - 1e-6 - t0) / dur)); return [row, seq[n % seq.length]]; }
  function poseAt(t) {
    let i = 0; while (i < poses.length - 1 && poses[i + 1][0] <= t) i++;
    const [t0, row, seq, dur] = poses[i], n = Math.max(0, Math.floor((t - t0) / dur)), since = t - (t0 + n * dur);
    const B = [row, seq[n % seq.length]], prev = n > 0 ? [row, seq[(n - 1) % seq.length]] : i > 0 ? lastOf(i - 1, t0) : B;
    const k = clamp01(since / xf), A = k >= 1 ? B : prev;
    return { A, B, k: A[0] === B[0] && A[1] === B[1] ? 1 : k };
  }
  function facing(t) {
    let mk = 0, sq = 1;
    for (const m of mirror) {
      if (t >= m.t[0]) mk = m.to ? clamp01((t - m.t[0]) / (m.t[1] - m.t[0])) : 1 - clamp01((t - m.t[0]) / (m.t[1] - m.t[0]));
      const u = (t - m.sq[0]) / (m.sq[1] - m.sq[0]); if (u > 0 && u < 1) sq = Math.min(sq, 1 - 0.42 * Math.sin(Math.PI * u) ** 1.5);
    }
    return { mk, sq };
  }
  function lift(t) { let v = 0; for (const [a, b, h = 9] of hops) { const u = (t - a) / (b - a); if (u > 0 && u < 1) v = Math.max(v, u < 0.7 ? h * Math.sin((Math.PI * u) / 0.7) : (h * 0.22) * Math.sin((Math.PI * (u - 0.7)) / 0.3)); } return v; }
  function state(t) { const p = poseAt(t), f = facing(t); return { ...p, cA: cell(...p.A, grade), cB: cell(...p.B, grade), ...f, lift: lift(t) }; }
  /** Screen box {x, y, w, h} of the character at time t in view V. */
  function box(V, t, st = state(t)) {
    const sx = V.X(x(t)), sy = V.Y(y(t)); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const c of [st.cA, st.cB]) for (const fl of st.mk <= 0 ? [0] : st.mk >= 1 ? [1] : [0, 1]) {
      const b = c.box, a = (b[0] - AX) * st.sq * scale, z = (b[2] + 1 - AX) * st.sq * scale, L = fl ? -z : a, Rr = fl ? -a : z;
      x0 = Math.min(x0, sx + L); x1 = Math.max(x1, sx + Rr); y0 = Math.min(y0, sy + (b[1] - FOOT - 1) * scale - st.lift); y1 = Math.max(y1, sy + (b[3] - FOOT) * scale - st.lift);
    }
    return { x: R(x0), y: R(y0), w: R(x1 - x0), h: R(y1 - y0 + 1) };
  }
  /** Soft contact shadow under the feet. */
  function shadow(c, V, t, { col = "#160A1E", k = 0.55, rx = 40 } = {}) {
    const st = state(t), cx = V.X(x(t)) + 1, cy = V.Y(y(t)) + 1, kk = k * (1 - 0.35 * clamp01(st.lift / 9)), r = rx * scale * (1 - 0.15 * clamp01(st.lift / 9));
    c.tint(R(cx - r - 2), R(cy - 4), R(r * 2 + 4), 14, (X, Y) => { const q = ((X - cx) / r) ** 2 + ((Y - cy - 2) / 5) ** 2; return q >= 1 ? 0 : kk * (1 - q); }, col, 3);
  }
  /** Draw at time t. o.a = existence 0..1 (dithered dissolve), o.clip(X, Y) → false hides a screen pixel. */
  function draw(c, V, t, o = {}) {
    const st = state(t), a = o.a ?? 1; if (a <= 0) return st;
    const ax = V.X(x(t)), oy = V.Y(y(t)) - R(st.lift), d = c.d, W = c.w, H = c.h, clip = o.clip;
    const bA = st.cA.box, bB = st.cB.box, v0 = Math.min(bA[1], bB[1]) - 1, v1 = Math.max(bA[3], bB[3]) + 1;
    const half = R((Math.max(AX - Math.min(bA[0], bB[0]), Math.max(bA[2], bB[2]) - AX) + 2) * st.sq * scale) + 1;
    const top = R(oy + (v0 - FOOT) * scale), bot = R(oy + (v1 - FOOT) * scale);
    for (let Y = Math.max(0, top); Y <= Math.min(H - 1, bot); Y++) {
      const v = Math.floor(FOOT + (Y + 0.5 - oy) / scale); if (v < 0 || v >= CH) continue;
      for (let X = Math.max(0, R(ax - half)); X <= Math.min(W - 1, R(ax + half)); X++) {
        if (a < 1 && a <= bayer(X + 3, Y + 1)) continue;
        if (clip && !clip(X, Y)) continue;
        const flip = st.mk >= 1 ? true : st.mk <= 0 ? false : st.mk > bayer(X + 1, Y + 2);
        const dx = (X + 0.5 - ax) / (st.sq * scale), u = Math.floor(flip ? AX - dx : AX + dx); if (u < 0 || u >= CW) continue;
        const cl = st.k >= 1 || st.k > bayer(X, Y) ? st.cB : st.cA, i = v * CW + u, m = cl.m[i]; if (!m) continue;
        const p = (Y * W + X) * 3;
        if (m === 2) { d[p] = cl.out[0]; d[p + 1] = cl.out[1]; d[p + 2] = cl.out[2]; continue; }
        d[p] = cl.lit[i * 3]; d[p + 1] = cl.lit[i * 3 + 1]; d[p + 2] = cl.lit[i * 3 + 2];
      }
    }
    return st;
  }
  return { state, draw, shadow, box, poseAt };
}

/** Where a sprite-cell point (cell px u, v) lands on screen for the hero at time t (e.g. a fingertip or the hands). */
export function cellToScreen(H, V, t, u, v, { x, y, scale = 1 }) {
  const st = H.state(t), flip = st.mk >= 0.5, dx = (u - AX) * st.sq * scale;
  return [V.X(x(t)) + (flip ? -dx : dx), V.Y(y(t)) - st.lift + (v - FOOT) * scale];
}
