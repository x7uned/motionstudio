// «The last person alive» · Builder P — POV2 helpers: tall grass in front of us (firelight from behind on the blades),
// the small dark shape that bursts out and leaps at the camera, the "looking up" sky we fall back into (converging
// trunks, spruce crowns, a moon and stars; painted once), and the final roll/shake resample.
import { BT, vn, clamp01, GW, GH, Sprite } from "./pov-core.mjs";
import { proj, shadePx } from "./pov-forest.mjs";
import { rnd } from "./layout.mjs";

const R = Math.round, PI = Math.PI;

// ---------------------------------------------------------------- tall grass (world blades in clumps), generated once
export const RUSTLE = { x: 0.05, z: 4.3, r: 0.45 };
const BLADES = (() => {
  const out = [];
  for (let c = 0; c < 400; c++) {
    const near = c >= 340, z = near ? 1.35 + rnd(c * 11 + 1) * 0.9 : 1.75 + Math.pow(rnd(c * 11 + 1), 0.8) * 6.2, x = (rnd(c * 11 + 2) - 0.5) * (0.82 * z + 1.8);
    const H = (0.45 + 0.4 * rnd(c * 11 + 3)) * (z > 6.8 ? 0.85 : 1), nb = 9 + ((rnd(c * 11 + 4) * 12) | 0);
    for (let i = 0; i < nb; i++) {
      const a = (rnd(c * 97 + i * 3) - 0.5) * 2, bx = x + a * 0.07, bz = z + (rnd(c * 97 + i * 3 + 1) - 0.5) * 0.1;
      out.push({ x: bx, z: bz, h: H * (0.55 + 0.5 * rnd(c * 97 + i * 3 + 2)), lean: a * 0.22 + (rnd(c * 31 + i) - 0.5) * 0.12, droop: rnd(c * 53 + i) < 0.3 ? 0.25 + rnd(i + c) * 0.3 : 0, seed: rnd(c * 71 + i), head: rnd(c * 13 + i * 7) < 0.15, tone: rnd(c * 17 + i * 5) });
    }
  }
  out.sort((p, q) => q.z - p.z);                                            // far → near
  return out;
})();
const BL = [[0.07, 0.08, 0.05], [0.2, 0.22, 0.11], [0.36, 0.36, 0.18], [0.58, 0.52, 0.28], [0.72, 0.62, 0.36]];

/** Draw the grass. rustle = { k: shake strength 0..1, part: 0..1 (blades bend away from the burst) }. */
export function drawGrass(c, S, t, rustle) {
  const camz = S.cam.z, A = S.amb, M = S.moon, Fc = S.fireCol, F = S.fire, Fg = S.fog, D = c.d;
  const tones = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (const B of BLADES) {
    const d = B.z - camz; if (d < 0.35) continue;
    const s = S.f / d, X0 = S.cx + (B.x - S.cam.x) * s; if (X0 < -80 || X0 > GW + 80) continue;
    const Yb = S.H0 + S.cam.y * s; if (Yb < -20) continue;
    let bx = Math.sin(t * 1.3 + B.seed * 9) * 0.025 + Math.sin(t * 0.7 + B.x * 2) * 0.02;
    const rx = B.x - RUSTLE.x, rz = (B.z - RUSTLE.z) * 1.4, rd = Math.hypot(rx, rz);
    let hk = 1;
    if (rd < RUSTLE.r * 1.8) {
      const w = clamp01(1 - rd / (RUSTLE.r * 1.8));
      bx += rustle.k * w * 0.24 * Math.sin(t * 38 + B.seed * 20) + rustle.part * w * 0.32 * (rx >= 0 ? 1 : -1);
      hk = 1 - rustle.part * 0.4 * w;
    }
    // lighting (per blade): the fire behind us lights the blades facing us; quantised flat tones, fogged
    const dx = F.x - B.x, dz = F.z - B.z, dist2 = dx * dx + dz * dz + 0.15, lf = F.I * F.r0 * F.r0 / (F.r0 * F.r0 + dist2);
    const fog = Math.min(1, S.fd(d) * 0.95), qg = Math.round(fog * 6) / 6;
    const kf = Math.min(R(Yb), GH - 1) >= 0 ? (Math.max(0, Math.min(GH - 1, R(Yb - B.h * s * 0.6))) * GW + Math.max(0, Math.min(GW - 1, R(X0)))) * 3 : 0;
    for (let i = 0; i < 5; i++) {
      const al = BL[i], li = i === 0 ? 0.15 : i === 1 ? 0.45 : 1, qf = Math.round(lf * li * 6 * (0.7 + 0.3 * B.tone)) / 6, qm = Math.round(S.moonGround * (i >= 3 ? 1 : 0.4) * 4) / 4;
      let r = al[0] * (A[0] + qm * M[0] + qf * Fc[0]) * 255, g = al[1] * (A[1] + qm * M[1] + qf * Fc[1]) * 255, bl = al[2] * (A[2] + qm * M[2] + qf * Fc[2]) * 255;
      r += (Fg[kf] - r) * qg; g += (Fg[kf + 1] - g) * qg; bl += (Fg[kf + 2] - bl) * qg;
      tones[i][0] = r; tones[i][1] = g; tones[i][2] = bl;
    }
    // a tapered, curved blade: quadratic curve base → tip (lean + droop), width shrinking to the tip
    const h = B.h * hk, lean = B.lean * 0.5 + bx, w0 = Math.max(1, 0.009 * s);
    const tipx = B.x + lean * h * 1.2, tipy = h * (1 - B.droop * 0.5), cxw = B.x + lean * h * 0.35, cyw = h * 0.85;
    const P0x = X0, P0y = Yb, P1x = S.cx + (cxw - S.cam.x) * s, P1y = S.H0 - (cyw - S.cam.y) * s, P2x = S.cx + (tipx - S.cam.x) * s, P2y = S.H0 - (tipy - S.cam.y) * s;
    const n = Math.max(4, Math.ceil((Math.abs(P0y - P1y) + Math.abs(P1y - P2y) + Math.abs(P0x - P2x)) * 1.25));
    for (let k = 0; k <= n; k++) {
      const u = k / n, a1 = (1 - u) * (1 - u), b1 = 2 * u * (1 - u), c1 = u * u;
      const X = a1 * P0x + b1 * P1x + c1 * P2x, Y = R(a1 * P0y + b1 * P1y + c1 * P2y);
      if (Y < 0 || Y >= GH) continue;
      const ti = B.head && u > 0.86 ? 4 : u < 0.18 ? 0 : u < 0.42 ? 1 : B.tone > 0.45 ? 3 : 2, col = tones[ti];
      const w = w0 * (1 - u * 0.85), xa = Math.max(0, R(X - w / 2)), xb = Math.min(GW - 1, R(X + w / 2 - 0.01));
      const row = Y * GW;
      for (let x = xa; x <= xb; x++) { const kk = (row + x) * 3; D[kk] = col[0]; D[kk + 1] = col[1]; D[kk + 2] = col[2]; }
    }
  }
}

// ---------------------------------------------------------------- the leaping shape
/**
 * The thing leaping at us: a near-black, motion-blurred mass (stretched along its screen motion), two front paws splayed
 * toward the camera, a thin tail whipping behind, a dim warm rim from the fire behind the camera, two eye glints.
 * Deliberately unreadable as an animal. o = { dir: [dx, dy] screen motion (unit), stretch 0..1, blur 0..1, a, glint, t }
 */
export function drawCritter(c, x, y, r, o) {
  const a = o.a ?? 1; if (r < 0.6 || a <= 0) return;
  const [ux, uy] = o.dir ?? [0, -1], st = o.stretch ?? 0, bl = o.blur ?? 0, t = o.t ?? 0;
  const ra = r * (1.12 + 0.5 * st), rb = r * 0.88;                          // along / across the motion
  const ext = Math.max(ra, rb) * (1.4 + bl * 0.4);
  const x0 = Math.max(0, Math.floor(x - ext)), x1 = Math.min(GW - 1, Math.ceil(x + ext)), y0 = Math.max(0, Math.floor(y - ext)), y1 = Math.min(GH - 1, Math.ceil(y + ext));
  const D = c.d;
  const putc = (X, Y, col, al) => { if (X < 0 || Y < 0 || X >= GW || Y >= GH) return; if (al < 1 && al <= BT[((Y & 3) << 2) | (X & 3)]) return; const k = (Y * GW + X) * 3; D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; };
  // tail: a thin curve trailing behind (opposite to the motion), whipping
  const tl = r * 1.9, n = Math.max(6, R(tl));
  for (let i = 0; i <= n; i++) {
    const u = i / n, w = Math.sin(u * 5 + t * 30) * r * 0.25 * u;
    const X = R(x - ux * (rb * 0.8 + tl * u) - uy * w), Y = R(y - uy * (rb * 0.8 + tl * u) + ux * w), th = Math.max(1, R(r * 0.07 * (1 - u)));
    for (let j = 0; j < th; j++) putc(X + j, Y, [20, 14, 16], a * (1 - u * 0.6));
  }
  // body
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const dx = X + 0.5 - x, dy = Y + 0.5 - y, pa = (dx * ux + dy * uy) / ra, pb = (-dx * uy + dy * ux) / rb;
    const ang = Math.atan2(pb, pa), fur = 1 + 0.09 * (vn(ang * 4 + 3, t * 2.5) - 0.5) + 0.07 * (vn(ang * 13 + 1, 2.3) - 0.5);
    const e = Math.sqrt(pa * pa + pb * pb) / fur;
    const soft = 0.06 + bl * 0.35, al = clamp01((1 - e) / soft + 0.5) * a;
    if (al <= 0) continue;
    let col = [11, 8, 10];
    const rimSide = dx < 0 && dy > -r * 0.2;                                // lit low-left by the fire behind us
    if (e > 0.8 && e < 1 && rimSide && !o.ghost && bl < 0.45) col = e > 0.92 ? [70, 38, 24] : [34, 22, 20];
    else if (e < 0.55 && vn(dx * 0.2 + 3, dy * 0.2) > 0.72) col = [20, 15, 18];
    putc(X, Y, col, al);
  }
  // front paws splayed toward us (low left and right), with tiny pale claw tips
  if (r > 5 && !o.ghost) for (const sd of [-1, 1]) {
    const px = x + sd * rb * 0.8, py = y + rb * 0.62, len = r * 0.38;
    for (let i = 0; i <= R(len); i++) {
      const u = i / len, X = R(px + sd * len * u * 0.45), Y = R(py + len * u * 0.8), th = Math.max(1, R(r * 0.09 * (1 - u * 0.6)));
      for (let j = -th; j <= th; j++) putc(X, Y + j, [14, 10, 12], a);
    }
    if (r > 14) for (let k = -1; k <= 1; k++) { const X = R(px + sd * len * 0.45 + k * r * 0.05), Y = R(py + len * 0.8); putc(X, Y + 1, [110, 96, 94], a); putc(X, Y + 2, [70, 60, 62], a); }
  }
  // eye glints (firelight), small even when it is big
  const g = o.glint ?? 0;
  if (g > 0 && r > 2.5) {
    const sp = Math.max(2, r * 0.4), gy = y - r * 0.2, gs = r > 70 ? 2 : 1;
    for (const sd of [-1, 1]) for (let j = 0; j < gs; j++) for (let i = 0; i < gs; i++) {
      const X = R(x + sd * sp * 0.5) + i, Y = R(gy) + j, hot = i === 0 && j === 0;
      putc(X, Y, hot ? [255, 226, 170] : [214, 130, 50], g * a);
    }
  }
}

// ---------------------------------------------------------------- the sky we fall back into (painted once)
export const UPH = 1150;
let UP = null;
/** Lying on the back in the clearing: trunks rise from the edges and converge on the vanishing point; spruce tops ring
 *  an opening of night sky with the moon and stars. The bottom of the painting is a dark canopy band (the seam with
 *  the forward view while we tip back). */
export function upView() {
  if (UP) return UP;
  const W = GW, H = UPH, g = { w: W, h: H, d: new Float32Array(W * H * 3) };
  const put = (x, y, col) => { x = R(x); y = R(y); if (x < 0 || y < 0 || x >= W || y >= H) return; const k = (y * W + x) * 3; g.d[k] = col[0]; g.d[k + 1] = col[1]; g.d[k + 2] = col[2]; };
  const q = (v, n, b) => { const s = v * n, lo = Math.floor(s), fr = s - lo; return (fr < 0.36 ? lo : fr > 0.64 ? lo + 1 : (fr - 0.36) * 3.57 > b ? lo + 1 : lo) / n; };
  const VX = 266, VY = 600, MX = 296, MY = 470;
  // sky: deep indigo, lighter round the moon
  const SKY = [[5, 7, 18], [10, 13, 30], [17, 21, 44], [27, 33, 62], [44, 54, 90]];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dm = Math.hypot(x - MX, (y - MY) * 1.05), b = BT[((y & 3) << 2) | (x & 3)];
    const v = clamp01(0.22 + 0.8 / (1 + (dm / 150) ** 2) + 0.1 * (vn(x * 0.012, y * 0.012) - 0.5));
    put(x, y, SKY[Math.min(4, Math.round(q(v, 4, b) * 4))]);
  }
  for (let i = 0; i < 300; i++) {
    const x = rnd(i * 3 + 1) * W, y = rnd(i * 3 + 2) * H, br = rnd(i * 3 + 3);
    if (Math.hypot(x - MX, y - MY) < 60) continue;
    put(x, y, br > 0.85 ? [255, 250, 230] : br > 0.5 ? [186, 192, 228] : [112, 120, 164]);
    if (br > 0.94) { put(x - 1, y, [100, 108, 150]); put(x + 1, y, [100, 108, 150]); put(x, y - 1, [100, 108, 150]); put(x, y + 1, [100, 108, 150]); }
  }
  for (let y = -58; y <= 58; y++) for (let x = -58; x <= 58; x++) {
    const d = Math.hypot(x, y), b = BT[(((y + 64) & 3) << 2) | ((x + 64) & 3)];
    if (d < 24) { const lit = clamp01(0.78 - (x + y) / 64); const crater = vn(x * 0.14 + 2, y * 0.14 + 9) > 0.63; put(MX + x, MY + y, crater ? [172, 180, 210] : lit > 0.55 ? [238, 240, 252] : [206, 212, 238]); }
    else if (d < 25.2) put(MX + x, MY + y, [146, 154, 194]);
    else if (d < 50 && q(0.55 * (1 - (d - 24) / 26), 3, b) > 0) { const k = ((MY + y) * W + MX + x) * 3; g.d[k] += 16; g.d[k + 1] += 20; g.d[k + 2] += 32; }
  }
  // trunks: from the frame edges toward the vanishing point, ending at the crown ring (r ≈ 230 from VP)
  const TR = [];
  for (let i = 0; i < 22; i++) {
    const ang = Math.PI * 2 * (i / 22) + (rnd(i * 7) - 0.5) * 0.18;           // all round the opening
    if (Math.abs(Math.sin(ang) + 0.95) < 0.12) continue;                      // leave the moon side a little more open
    TR.push({ ang, w: 30 + rnd(i * 3) * 44, end: 200 + rnd(i * 5) * 80, seed: i });
  }
  for (const T of TR.sort((a, b2) => a.w - b2.w)) {
    const dx = Math.cos(T.ang), dy = Math.sin(T.ang), L = 1200;
    for (let k = T.end; k < L; k += 0.5) {
      const cx = VX + dx * k, cy = VY + dy * k; if (cy > H + 20 || cy < -60 || cx < -60 || cx > W + 60) break;
      const w = T.w * (k / 700) + 2, nx = -dy, ny = dx;
      for (let j = -w / 2; j <= w / 2; j += 0.5) {
        const X = cx + nx * j, Y = cy + ny * j, u = j / (w / 2), b = BT[((R(Y) & 3) << 2) | (R(X) & 3)];
        const moonSide = u * (nx * (MX - VX) + ny * (MY - VY)) < 0 ? 0 : 1;
        put(X, Y, Math.abs(u) > 0.88 ? [5, 5, 9] : moonSide && Math.abs(u) > 0.55 && b > 0.35 ? [38, 42, 60] : vn(u * 2 + T.seed, k * 0.03) > 0.62 ? [19, 17, 23] : [11, 10, 15]);
      }
    }
    // the spruce top at the inner end: a dark jagged cone pointing at the VP
    const tx = VX + dx * T.end, ty = VY + dy * T.end, len = 70 + T.w * 0.8;
    for (let k = -20; k < len; k += 0.5) {
      const cx = tx + dx * k, cy = ty + dy * k, half = (k + 20) / (len + 20) * (T.w * 1.2 + 26) * (0.75 + 0.35 * (((k / 9) | 0) % 2));
      for (let j = -half; j <= half; j += 0.6) { const X = cx - dy * j, Y = cy + dx * j; put(X, Y, Math.abs(j) > half - 1.2 && j * (dx * (MX - VX) - dy * 0) < 0 ? [30, 36, 52] : [8, 10, 14]); }
    }
  }
  // the canopy band at the bottom of the painting: solid dark with a jagged top edge (the seam)
  for (let x = 0; x < W; x++) {
    const top = H - 70 - 34 * vn(x * 0.02, 4) - 24 * vn(x * 0.07, 9) - (rnd(x * 13) > 0.8 ? 10 : 0);
    for (let y = Math.floor(top); y < H; y++) put(x, y, (y - top < 2 && vn(x * 0.1, 2) > 0.5) ? [26, 32, 46] : [7, 8, 12]);
  }
  g.edge = new Float32Array(W);
  for (let x = 0; x < W; x++) g.edge[x] = H - 20 * vn(x * 0.05, 1.3) - 26 * (rnd(((x / 3) | 0) * 31) > 0.7 ? 1 : 0) * vn(x * 0.3, 7);
  UP = g; return g;
}

upView();                                                                 // baked once at load (≈ 50 ms), not on a frame

/** Copy the up-view painting with its bottom edge at screen Y = yb (cut along its jagged edge). */
export function drawUp(c, yb) {
  const g = upView(), top = R(yb - UPH);
  for (let Y = Math.max(0, top); Y < Math.min(GH, R(yb) + 1); Y++) {
    const y = Y - top; if (y < 0 || y >= UPH) continue;
    for (let X = 0; X < GW; X++) {
      if (y > g.edge[X]) continue;
      const k = (y * GW + X) * 3, kk = (Y * GW + X) * 3; c.d[kk] = g.d[k]; c.d[kk + 1] = g.d[k + 1]; c.d[kk + 2] = g.d[k + 2];
    }
  }
}

/** Resample src (Float/Uint rgb 540×960) into c with roll (rad), zoom and offset about the centre (nearest). */
export function rollShake(c, src, roll, zoom, ox, oy) {
  const ca = Math.cos(roll), sa = Math.sin(roll), cx = GW / 2, cy = GH / 2, d = c.d;
  for (let Y = 0; Y < GH; Y++) {
    const dy = Y + 0.5 - cy - oy;
    for (let X = 0; X < GW; X++) {
      const dx = X + 0.5 - cx - ox;
      let sx = (dx * ca + dy * sa) / zoom + cx, sy = (-dx * sa + dy * ca) / zoom + cy;
      sx = sx < 0 ? 0 : sx > GW - 1 ? GW - 1 : sx; sy = sy < 0 ? 0 : sy > GH - 1 ? GH - 1 : sy;
      const k = ((sy | 0) * GW + (sx | 0)) * 3, kk = (Y * GW + X) * 3;
      d[kk] = src[k]; d[kk + 1] = src[k + 1]; d[kk + 2] = src[k + 2];
    }
  }
}
