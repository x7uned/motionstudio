// «Computers inside Minecraft» — voxel renderer on the 540×960 pixel grid (from the Minecraft film's engine, iso part):
// a true isometric orthographic camera {x, y, z, b}: screen = ((x−z)·b, ((x+z)/2 − y)·b) around the anchor, view ray
// along (−1,−1,−1), visible faces +y (top), +x, +z. Our own 8×8 procedural textures with mips blended by dither (zooms
// never pop), face light, sky occlusion. Lamps are emissive and switch by dither (S.lamp), blocks of a group appear by
// dither (S.grpA), never in one frame. The hit buffer (S.hit) lets redstone.mjs paint dust onto the top faces.
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { B } from "./world.mjs";
import { hash } from "./noise.mjs";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

// ---------------------------------------------------------------- textures (8×8, faces: 0 top, 1 side, 2 bottom)
const RAMP = {
  stone: ["#55555F", "#666671", "#777782", "#878792"], dirt: ["#553621", "#68452A", "#7A5534", "#8A6440"],
  grass: ["#3D7A2A", "#4A8C32", "#58A03A", "#68B246"], bark: ["#43291A", "#553521", "#664129", "#4A2E1C"], ring: ["#8A6A3C", "#9C7A48", "#AE8A54", "#7A5C32"],
  leaves: ["#1F4E1A", "#2A6222", "#36762A", "#448A30"], smooth: ["#8E8E98", "#A2A2AC", "#B0B0BA", "#76767F"], quartz: ["#D8D2C8", "#E6E0D6", "#F0EBE3", "#C4BDB2"],
  concrete: ["#4E525A", "#585C64", "#62666E", "#44474E"], iron: ["#B8B8C0", "#CACAD2", "#DADAE2", "#A2A2AA"], black: ["#16161C", "#1E1E26", "#26262E", "#101016"],
  planks: ["#8E6C3A", "#A07C46", "#B08C52", "#76582E"], glass: ["#86C2E2", "#A6D6F0", "#C8E8FA", "#E8F6FF"],
};
const WOOL = { [B.W_WHITE]: "#E4E4E8", [B.W_LGRAY]: "#9C9CA6", [B.W_GRAY]: "#4A4E56", [B.W_BLUE]: "#3C4EAE", [B.W_CYAN]: "#2A8C9C", [B.W_RED]: "#A83434",
  [B.W_LIME]: "#6CB232", [B.W_YELLOW]: "#E2BE3E", [B.W_ORANGE]: "#DE7A2A", [B.W_PURPLE]: "#7A3EAE" };
function texFn(type) {
  const r = (name) => RAMP[name].map(hx);
  const pick = (rm, i) => rm[clamp(i, 0, rm.length - 1) | 0];
  if (WOOL[type]) { const b = hx(WOOL[type]), d = b.map((v) => v * 0.86), l = b.map((v) => Math.min(255, v * 1.08)); return (u, v) => (hash(u, v, type) < 0.18 ? d : hash(u, v, type + 40) < 0.12 ? l : b); }
  switch (type) {
    case B.STONE: { const s = r("stone"); return (u, v) => pick(s, 1 + (hash(u, v, 1) < 0.25 ? -1 : hash(u, v, 2) < 0.18 ? 1 : 0)); }
    case B.DIRT: { const s = r("dirt"); return (u, v) => pick(s, 1 + (hash(u, v, 4) < 0.3 ? -1 : hash(u, v, 5) < 0.25 ? 1 : 0)); }
    case B.GRASS: { const g = r("grass"), d = r("dirt"); return (u, v, f) => f === 0 ? pick(g, 1 + (hash(u, v, 6) < 0.3 ? -1 : hash(u, v, 7) < 0.3 ? 1 : 0) + (hash(u, v, 8) < 0.08 ? 1 : 0))
      : f === 2 ? pick(d, 1) : (v < 2 + (hash(u, 0, 9) < 0.5 ? 1 : 0) ? pick(g, 1 + (hash(u, v, 10) < 0.35 ? -1 : 0)) : pick(d, 1 + (hash(u, v, 11) < 0.3 ? -1 : hash(u, v, 12) < 0.25 ? 1 : 0))); }
    case B.LOG: { const s = r("bark"), g = r("ring"); return (u, v, f) => f !== 1 ? pick(g, (Math.max(Math.abs(u - 3.5), Math.abs(v - 3.5)) | 0) % 2 ? 1 : 2) : pick(s, ((u + (hash(u, v >> 2, 20) < 0.3 ? 1 : 0)) % 3 === 0 ? 0 : 1 + (hash(u, v, 21) < 0.3 ? 1 : 0))); }
    case B.LEAVES: { const s = r("leaves"); return (u, v) => pick(s, hash(u, v, 22) < 0.22 ? 0 : 1 + (hash(u, v, 23) < 0.4 ? 1 : 0) + (hash(u, v, 24) < 0.1 ? 1 : 0)); }
    case B.SMOOTH: { const s = r("smooth"); return (u, v, f) => (f === 0 ? (u === 0 || v === 0 ? pick(s, 3) : u === 7 || v === 7 ? pick(s, 2) : pick(s, 1)) : v === 0 ? pick(s, 2) : pick(s, 1 + (hash(u, v, 41) < 0.12 ? -1 : 0))); }
    case B.QUARTZ: { const s = r("quartz"); return (u, v) => (u === 0 || v === 0 ? pick(s, 3) : pick(s, 1 + (hash(u, v, 42) < 0.15 ? 1 : 0))); }
    case B.CONCRETE: { const s = r("concrete"); return (u, v) => pick(s, 1 + (hash(u, v, 43) < 0.1 ? 1 : 0)); }
    case B.IRON: { const s = r("iron"); return (u, v) => (v === 0 || v === 4 ? pick(s, 3) : pick(s, 1 + (u === 7 ? -1 : 0))); }
    case B.BLACK: { const s = r("black"); return (u, v) => pick(s, 1 + (hash(u, v, 44) < 0.15 ? 1 : 0)); }
    case B.PLANKS: { const s = r("planks"); return (u, v) => v % 4 === 3 ? pick(s, 3) : pick(s, 1 + (hash(u >> 2, v >> 2, 30) < 0.5 ? 1 : 0)); }
    case B.GLASS: { const s = r("glass"); return (u, v) => u === 0 || v === 0 || u === 7 || v === 7 ? hx("#E6EEF4") : pick(s, (u + v) % 5 === 0 ? 3 : 1); }
    // the redstone lamp: a frame and a glass grid; off = brown, dark glass; on = warm, bright glass
    case B.LAMP: { const fr = hx("#5A3C22"), fr2 = hx("#704C2C"), gl = hx("#3A2416"), gl2 = hx("#4A3020"); return (u, v) => (u === 0 || v === 0 || u === 7 || v === 7 ? fr : (u === 3 || v === 3 || u === 4 && v === 4) ? fr2 : (hash(u, v, 45) < 0.3 ? gl2 : gl)); }
    case B.LAMP_ON: { const fr = hx("#C88A3A"), fr2 = hx("#E8B058"), gl = hx("#FFE8A8"), gl2 = hx("#FFF6D8"); return (u, v) => (u === 0 || v === 0 || u === 7 || v === 7 ? fr : (u === 3 || v === 3) ? fr2 : (hash(u, v, 46) < 0.35 ? gl2 : gl)); }
    // a giant key: a light cap with a darker rim; pressed = warm light
    case B.KEY: { const rim = hx("#7E7E8A"), cap = hx("#D6D6DE"), cap2 = hx("#C8C8D2"), side = hx("#9A9AA6"); return (u, v, f) => (f !== 0 ? (v < 2 ? cap2 : side) : u === 0 || v === 0 || u === 7 || v === 7 ? rim : hash(u, v, 48) < 0.2 ? cap2 : cap); }
    case B.KEY_ON: { const rim = hx("#D89A3A"), cap = hx("#FFE6A0"), cap2 = hx("#FFF4CC"), side = hx("#E8B058"); return (u, v, f) => (f !== 0 ? (v < 2 ? cap : side) : u === 0 || v === 0 || u === 7 || v === 7 ? rim : hash(u, v, 49) < 0.3 ? cap2 : cap); }
    case B.RSBLOCK: { const a = hx("#B4180E"), b = hx("#D82A18"), c = hx("#7E0E08"); return (u, v) => ((u + v) % 4 === 0 ? c : hash(u, v, 47) < 0.3 ? b : a); }
    default: { const s = r("stone"); return () => s[1]; }
  }
}
const TEX = [];
for (let type = 0; type < 32; type++) for (let face = 0; face < 3; face++) {
  const fn = texFn(type), l8 = new Float32Array(8 * 8 * 3);
  for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) l8.set(fn(u, v, face), (v * 8 + u) * 3);
  const down = (src, n) => { const m = n / 2, out = new Float32Array(m * m * 3); for (let v = 0; v < m; v++) for (let u = 0; u < m; u++) for (let k = 0; k < 3; k++) out[(v * m + u) * 3 + k] = (src[((2 * v) * n + 2 * u) * 3 + k] + src[((2 * v) * n + 2 * u + 1) * 3 + k] + src[((2 * v + 1) * n + 2 * u) * 3 + k] + src[((2 * v + 1) * n + 2 * u + 1) * 3 + k]) / 4; return out; };
  const l4 = down(l8, 8), l2 = down(l4, 4), l1 = down(l2, 2);
  TEX[type * 3 + face] = { 8: l8, 4: l4, 2: l2, 1: l1 };
}
export const avgColor = (type, face = 0) => Array.from(TEX[type * 3 + face][1]);
function sampleTex(out, type, face, fu, fv, bs, X, Y) {
  const T = TEX[type * 3 + face], l = Math.log2(Math.max(0.5, bs)) - 0.5;
  let lev = l >= 3 ? 8 : l >= 2 ? 4 : l >= 1 ? 2 : 1; const frac = l - Math.floor(l);
  if (lev < 8 && l >= 0 && frac > bayer(X, Y)) lev *= 2;
  const tex = T[lev], u = Math.min(lev - 1, (fu * lev) | 0), v = Math.min(lev - 1, (fv * lev) | 0), i = (v * lev + u) * 3;
  out[0] = tex[i]; out[1] = tex[i + 1]; out[2] = tex[i + 2];
}

// ---------------------------------------------------------------- per-frame state
/** S.lamp(ix, iy, iz) → 0..1 brightness of a lamp; S.grpA[g] → 0..1 visibility of group g (0 = always on) */
export function makeState(r) {
  return { r, t: 0, grpA: new Float32Array(64).fill(1), lamp: () => 0, shadowK: 0.55, outside: null, outsideY: null };
}
function tiles(r) {
  if (r._tiles) return r._tiles;
  const tx = Math.ceil(r.nx / 8), tz = Math.ceil(r.nz / 8), m = new Int16Array(tx * tz);
  for (let z = 0; z < r.nz; z++) for (let x = 0; x < r.nx; x++) { const k = (z >> 3) * tx + (x >> 3), h = r.top[z * r.nx + x]; if (h > m[k]) m[k] = h; }
  return (r._tiles = { tx, tz, m });
}
// displayed type or 0; lamps resolve to LAMP_ON by dither of their brightness
function shown(S, v, vidx, ix, iy, iz, X, Y) {
  if (!v) return 0;
  const g = S.r.grp[vidx]; if (g && S.grpA[g] < 1 && !(S.grpA[g] > bayer(X + 1, Y + 2))) return 0;
  if (v === B.LAMP) { const k = S.lamp(ix, iy, iz); if (k > 0 && k > bayer(X, Y)) return B.LAMP_ON; }
  if (v === B.KEY) { const k = S.lamp(ix, iy, iz); if (k > 0 && k > bayer(X, Y)) return B.KEY_ON; }
  return v;
}

// ---------------------------------------------------------------- shading of a hit
const FACE_L = [1.0, 0.8, 0.62, 0.45];
function shadeHit(out, S, type, axis, sign, fu, fv, ix, iy, iz, bs, X, Y) {
  const face = axis === 1 ? (sign > 0 ? 0 : 2) : 1;
  sampleTex(out, type, face, fu, axis === 1 ? fv : 1 - fv, bs, X, Y);
  if (type === B.LAMP_ON || type === B.KEY_ON) { const L = axis === 1 ? 1.06 : 0.97; out[0] *= L; out[1] *= L; out[2] *= L; return; }       // emissive
  let L = axis === 1 ? (sign > 0 ? FACE_L[0] : FACE_L[3]) : axis === 0 ? FACE_L[1] : FACE_L[2];
  const r = S.r, nx = ix + (axis === 0 ? sign : 0), ny = iy + (axis === 1 ? sign : 0), nz = iz + (axis === 2 ? sign : 0);
  if (nx >= r.ox && nz >= r.oz && nx < r.ox + r.nx && nz < r.oz + r.nz) { const cc = (nz - r.oz) * r.nx + (nx - r.ox); if (ny < r.top[cc]) L *= S.shadowK; }
  out[0] *= L; out[1] *= L; out[2] *= L;
}
function put(c, X, Y, col) { const i = (Y * c.w + X) * 3; c.d[i] = col[0] < 0 ? 0 : col[0] > 255 ? 255 : col[0]; c.d[i + 1] = col[1] < 0 ? 0 : col[1] > 255 ? 255 : col[1]; c.d[i + 2] = col[2] < 0 ? 0 : col[2] > 255 ? 255 : col[2]; }
const GRASSC = avgColor(B.GRASS, 0);
function floorColor(out, S, wx, wz, bs, X, Y) { if (S.outside) { S.outside(out, wx, wz, bs, X, Y); return; } out[0] = GRASSC[0]; out[1] = GRASSC[1]; out[2] = GRASSC[2]; }

// ---------------------------------------------------------------- render distance: chunks beyond it are drawn as fog (dithered edge)
const FOG = [178, 206, 236], FOG2 = [196, 220, 244];
function fogPx(out, S, wx, wz, X, Y) {
  const v = S.fog(wx, wz); if (v >= 1 || v > bayer(X, Y)) return false;
  const f = ((Math.floor(wx / 16) + Math.floor(wz / 16)) & 1) ? FOG : FOG2; out[0] = f[0]; out[1] = f[1]; out[2] = f[2]; return true;
}
// ---------------------------------------------------------------- iso renderer
/** cam {x, y, z, b, ax?, ay?}; clip [x0,y0,x1,y1]. depth gets x+y+z of each hit (for actors and parts). */
export function renderIso(c, clip, cam, S, depth = null) {
  const r = S.r, b = cam.b, W = c.w, H = c.h, T = tiles(r), Ys = r.maxTop + 1, out = [0, 0, 0];
  const AXS = cam.ax ?? W / 2, AYS = cam.ay ?? H / 2, AX = cam.x - cam.z, BY = (cam.x + cam.z) / 2 - cam.y, X0 = r.ox, Z0 = r.oz, X1 = r.ox + r.nx, Z1 = r.oz + r.nz, NX = r.nx, NZ = r.nz, vox = r.vox;
  const [cx0, cy0, cx1, cy1] = clip;
  for (let Y = Math.max(0, cy0); Y < Math.min(H, cy1); Y++) for (let X = Math.max(0, cx0); X < Math.min(W, cx1); X++) {
    const A = (X + 0.5 - AXS) / b + AX, Bv = (Y + 0.5 - AYS) / b + BY, S0 = 2 * (Bv + Ys), x0 = (S0 + A) / 2, z0 = (S0 - A) / 2;
    let lam = Math.max(0, x0 - X1 + 1e-4, z0 - Z1 + 1e-4), hitType = 0;
    if (S.outside && S.outsideY != null) { const lp = Ys - S.outsideY, px = x0 - lp, pz = z0 - lp;
      if ((px < X0 || pz < Z0 || px >= X1 || pz >= Z1) && lp <= lam) { S.outside(out, px, pz, b, X, Y); if (depth) depth[Y * W + X] = -1e9; if (S.hit) S.hit.ax[Y * W + X] = 0; if (S.fog) fogPx(out, S, px, pz, X, Y); put(c, X, Y, out); continue; } }
    let hitAxis = 1, hitLam = 0, ix = 0, iy = 0, iz = 0;
    if (lam < Ys) {
      for (let guard = 0; guard < 400; guard++) {
        const px = x0 - lam, pz = z0 - lam, py = Ys - lam; if (px < X0 || pz < Z0 || py <= 0) break;
        const tx = ((Math.floor(px) - X0) >> 3), tz = ((Math.floor(pz) - Z0) >> 3), tm = T.m[tz * T.tx + tx] + 1;
        if (py <= tm) break;
        const bx = px - (X0 + tx * 8), bz = pz - (Z0 + tz * 8);
        lam += Math.max(1e-3, Math.min(py - tm, bx + 1e-4, bz + 1e-4));
      }
      const px = x0 - lam, py = Ys - lam, pz = z0 - lam;
      ix = Math.floor(px); iy = Math.ceil(py) - 1; iz = Math.floor(pz);
      let tX = lam + (px - ix), tY = lam + (py - iy), tZ = lam + (pz - iz);
      let axis = 1; { const dx = px - ix, dy = py - iy, dz = pz - iz; const mx = Math.max(dx, dy, dz); axis = mx === dy ? 1 : mx === dx ? 0 : 2; }
      let lamIn = lam;
      for (let guard = 0; guard < 1200; guard++) {
        if (ix < X0 || iz < Z0 || iy < 0) break;
        if (ix < X1 && iz < Z1 && iy < r.ny) {
          const vidx = (iy * NZ + (iz - Z0)) * NX + (ix - X0), v = vox[vidx];
          if (v) { const s = shown(S, v, vidx, ix, iy, iz, X, Y); if (s) { hitType = s; hitAxis = axis; hitLam = lamIn; break; } }
        }
        if (tX <= tY && tX <= tZ) { lamIn = tX; tX += 1; ix--; axis = 0; } else if (tZ <= tY) { lamIn = tZ; tZ += 1; iz--; axis = 2; } else { lamIn = tY; tY += 1; iy--; axis = 1; }
      }
    }
    if (hitType) {
      const hx_ = x0 - hitLam, hy = Ys - hitLam, hz = z0 - hitLam;
      const fu = hitAxis === 0 ? hz - Math.floor(hz) : hx_ - Math.floor(hx_), fv = hitAxis === 1 ? hz - Math.floor(hz) : hy - Math.floor(hy);
      shadeHit(out, S, hitType, hitAxis, 1, hitAxis === 0 ? 1 - fu : fu, fv, ix, iy, iz, b, X, Y);
      if (depth) depth[Y * W + X] = hx_ + hy + hz;
      if (S.hit) { const k = Y * W + X; S.hit.x[k] = hx_; S.hit.y[k] = hy; S.hit.z[k] = hz; S.hit.ax[k] = hitAxis + 1; S.hit.ty[k] = hitType; }
      if (S.fog && fogPx(out, S, hx_, hz, X, Y) && S.hit) S.hit.ax[Y * W + X] = 0;
    } else {
      floorColor(out, S, x0 - Ys, z0 - Ys, b, X, Y);
      if (S.fog) fogPx(out, S, x0 - Ys, z0 - Ys, X, Y);
      if (depth) depth[Y * W + X] = -1e9;
      if (S.hit) { const k = Y * W + X; S.hit.ax[k] = 0; S.hit.ty[k] = 0; }
    }
    put(c, X, Y, out);
  }
}
/** world → iso screen */
export function isoProject(cam, W, H, x, y, z) { return [(cam.ax ?? W / 2) + ((x - z) - (cam.x - cam.z)) * cam.b, (cam.ay ?? H / 2) + ((x + z) / 2 - y - ((cam.x + cam.z) / 2 - cam.y)) * cam.b]; }
