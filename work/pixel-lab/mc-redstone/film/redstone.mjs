// «Computers inside Minecraft» — redstone parts that are not full blocks, drawn over the iso voxel image:
//   dust     — a decal painted onto the top face under it (from the hit buffer), with arms to its connections; it glows
//              when its signal is on, and the change travels along the wire from the source (a few ms per block, so
//              the eye can follow it — in the game dust is effectively instant within a tick);
//   torches  — a stick with a glowing head (standing on a block, or leaning out of a block's side);
//   levers   — a cobblestone plate with a handle that swings over;
//   traces   — the computer's module tops carry procedural dust traces with travelling pulses.
// The signal levels come from the film's scene (SIG(name, t) → 0..1). Changes are always continuous (dither).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { RS, B, PARTS, LAMPS, COMPUTER, GROUND, VSRC, get } from "./world.mjs";
import { drawBox } from "./actors.mjs";
import { hash } from "./noise.mjs";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const R0 = RS, NX = R0.nx, NZ = R0.nz;
const key = (x, y, z) => (y * NZ + (z - R0.oz)) * NX + (x - R0.ox);

// ---------------------------------------------------------------- dust index + connections + distance from the source
const DUST = new Int16Array(NX * NZ * R0.ny);
PARTS.dust.forEach((d, i) => { DUST[key(d.x, d.y, d.z)] = i + 1; });
const at = (arr, x, y, z) => arr.find((p) => p.x === x && p.y === y && p.z === z);
const GATE = new Set([B.W_RED, B.W_BLUE, B.W_CYAN, B.QUARTZ]);
const SRC = new Map(); for (const p of [...PARTS.lever, ...PARTS.torch]) SRC.set(p.sig, p);
for (const d of PARTS.dust) {
  let m = 0; const dirs = [[1, 0, 1], [-1, 0, 2], [0, 1, 4], [0, -1, 8]];
  for (const [dx, dz, bit] of dirs) {
    const x = d.x + dx, z = d.z + dz;
    if (x < R0.ox || z < R0.oz || x >= R0.ox + NX || z >= R0.oz + NZ) continue;
    if (DUST[key(x, d.y, z)] || at(PARTS.lever, x, d.y, z) || at(PARTS.torch, x, d.y, z) || LAMPS.has(`${x},${d.y},${z}`) || GATE.has(get(R0, x, d.y, z))) m |= bit;
  }
  const n = ((m & 1) ? 1 : 0) + ((m & 2) ? 1 : 0) + ((m & 4) ? 1 : 0) + ((m & 8) ? 1 : 0);
  if (n === 0) m = 15; else if (n === 1) m |= m & 3 ? 3 : 12;
  d.mask = m;
  const s = SRC.get(d.sig) || VSRC[d.sig]; d.dist = s ? Math.abs(s.x - d.x) + Math.abs(s.z - d.z) : 0;
}

// ---------------------------------------------------------------- colours
const OFF = hx("#5E100C"), OFF2 = hx("#7A1810"), ON = hx("#FF2E1C"), ON2 = hx("#FF7A52"), HOT = hx("#FFD2B0");
export const TRAVEL = 0.03, TRAVELS = {};                    // seconds per block for the visible change to run along a wire
/** level of one dust cell: its signal, delayed by its distance from the source */
export const dustLevel = (SIG, d, t) => SIG(d.sig, t - d.dist * (TRAVELS[d.sig] ?? TRAVEL));
export const sourceOf = (sig) => SRC.get(sig) || VSRC[sig];

/** paint dust onto top faces. hit = S.hit; SIG(name, t); grpA visibility per group. */
export function paintDust(c, S, SIG, t) {
  const W = c.w, H = c.h, hit = S.hit, cb = COMPUTER;
  for (let Y = 0; Y < H; Y++) for (let X = 0; X < W; X++) {
    const k = Y * W + X; if (hit.ax[k] !== 2) continue;
    const hy = Math.round(hit.y[k]), fx = hit.x[k], fz = hit.z[k], ix = Math.floor(fx), iz = Math.floor(fz), u = fx - ix, v = fz - iz;
    if (ix < R0.ox || iz < R0.oz || ix >= R0.ox + NX || iz >= R0.oz + NZ || hy < 0 || hy >= R0.ny) continue;
    const di = DUST[key(ix, hy, iz)];
    let lev = -1, m = 0;
    if (di) { const d = PARTS.dust[di - 1]; if (d.g && S.grpA[d.g] < 1 && !(S.grpA[d.g] > bayer(X + 1, Y + 2))) continue; m = d.mask; lev = dustLevel(SIG, d, t); }
    else if (ix > cb.x0 && ix < cb.x1 && iz > cb.z0 && iz < cb.z1 && hy > GROUND + 1) { const tr = traceAt(ix, hy, iz, t); if (tr) { m = tr.m; lev = tr.lev; } }
    if (lev < 0) continue;
    // the cross-section of a dust line: a 0.28-wide band from the centre to each connected side
    const w = 0.15, cu = Math.abs(u - 0.5), cv = Math.abs(v - 0.5);
    let inside = cu < w + 0.04 && cv < w + 0.04;
    if (!inside && (m & 1) && u > 0.5 && cv < w) inside = true;
    if (!inside && (m & 2) && u < 0.5 && cv < w) inside = true;
    if (!inside && (m & 4) && v > 0.5 && cu < w) inside = true;
    if (!inside && (m & 8) && v < 0.5 && cu < w) inside = true;
    if (!inside) continue;
    const i = k * 3, speck = hash(Math.floor(u * 8), Math.floor(v * 8), ix * 7 + iz) < 0.3, on = lev > bayer(X, Y);
    const col = on ? (cu < 0.06 || cv < 0.06 ? (lev > 0.9 && speck ? HOT : ON2) : speck ? ON2 : ON) : speck ? OFF2 : OFF;
    c.d[i] = col[0]; c.d[i + 1] = col[1]; c.d[i + 2] = col[2];
  }
}

// ---------------------------------------------------------------- the computer's traces (procedural)
const MODULE = new Set([B.QUARTZ, B.W_CYAN, B.W_BLUE, B.W_LGRAY, B.W_RED, B.W_YELLOW]);
/** a trace on top of the block under (ix, hy, iz)? Lines along x every other row, cross links every 4–6 blocks, and
 *  pulses that run along x (data moving through the machine). */
export function traceAt(ix, hy, iz, t) {
  const below = get(R0, ix, hy - 1, iz); if (!MODULE.has(below) || get(R0, ix, hy, iz)) return null;
  const bus = below === B.W_RED || below === B.W_YELLOW;
  if (!bus && (iz & 1)) { const link = hash(ix >> 2, iz >> 1, 61) < 0.35 && (ix & 3) === 1; if (!link) return null; return { m: 12, lev: pulse(ix, iz - 1, t) }; }
  if (!bus && hash(ix >> 3, iz, 62) < 0.18) return null;
  return { m: 3, lev: pulse(ix, iz, t, bus ? 2.2 : 1) };
}
// pulses: every row has its own speed and spacing; a whole number of cycles over the film keeps the loop seamless
let LOOP = 50; export function setLoop(T) { LOOP = T; }
function pulse(ix, iz, t, k = 1) {
  const sp = 6 + Math.floor(hash(iz, 3, 63) * 4), per = 18 + Math.floor(hash(iz, 4, 64) * 14);           // blocks/s, spacing
  const cyc = Math.max(1, Math.round((sp * k * LOOP) / per)), rate = (cyc * per) / LOOP;                // whole cycles over LOOP
  const ph = ((ix - rate * t + hash(iz, 5, 65) * per) % per + per) % per;
  return ph < 4 ? 1 : ph < 5 ? 1 - (ph - 4) : 0;
}

// ---------------------------------------------------------------- torches, levers
const STICK = hx("#7A5A30"), STICK2 = hx("#5E4424"), HEAD_ON = hx("#FF5A28"), CORE = hx("#FFE08A"), HEAD_OFF = hx("#5E1A12"), COB = hx("#6E6E78"), COB2 = hx("#55555E");
const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
/** draw one torch; lev 0..1 (lit); lean "+x" etc. for wall torches */
function torchBox(c, cam, depth, p, lev, a) {
  const W = c.w, H = c.h, F = [0, 0, 1], Rr = [1, 0, 0];
  let o, U = [0, 1, 0];
  if (p.on === "up") o = [p.x + 0.5, p.y, p.z + 0.5];
  else { const s = 0.38, cs = Math.cos(s), sn = Math.sin(s); const d = p.on === "+x" ? [1, 0] : p.on === "-x" ? [-1, 0] : p.on === "+z" ? [0, 1] : [0, -1];
    o = [p.x + 0.5 - d[0] * 0.42, p.y + 0.18, p.z + 0.5 - d[1] * 0.42]; U = [d[0] * sn, cs, d[1] * sn]; }
  const fr = (n, X, Y) => (n[1] === 1 ? STICK2 : STICK);
  drawBox(c, cam, W, H, o, Rr, U, F, [0, 0.3, 0], [0.07, 0.3, 0.07], fr, depth, a);
  const head = (n, X, Y) => { const q = lev > bayer(X, Y) ? (n[1] === 1 ? CORE : HEAD_ON) : HEAD_OFF; return q; };
  drawBox(c, cam, W, H, o, Rr, U, F, [0, 0.66, 0], [0.085, 0.07, 0.085], head, depth, a);
  return o;
}
function leverBox(c, cam, depth, p, k, a) {
  const W = c.w, H = c.h, o = [p.x + 0.5, p.y, p.z + 0.5];
  drawBox(c, cam, W, H, o, [1, 0, 0], [0, 1, 0], [0, 0, 1], [0, 0.09, 0], [0.19, 0.09, 0.27], (n) => (n[1] === 1 ? COB : COB2), depth, a);
  const ang = -0.75 + 1.5 * k, U = [Math.sin(ang), Math.cos(ang), 0];
  const piv = [o[0], o[1] + 0.12, o[2]];
  drawBox(c, cam, W, H, piv, [Math.cos(ang), -Math.sin(ang), 0], U, [0, 0, 1], [0, 0.28, 0], [0.055, 0.28, 0.055], (n) => (n[1] === 1 ? STICK : STICK2), depth, a);
  drawBox(c, cam, W, H, piv, [Math.cos(ang), -Math.sin(ang), 0], U, [0, 0, 1], [0, 0.58, 0], [0.07, 0.05, 0.07], () => mixc(STICK, HEAD_ON, 0.25 * k), depth, a);
}
/** draw all torches and levers that are in view (sorted back to front). SIG for torch/lever states, LEVER(name,t) 0..1 */
export function drawParts(c, cam, depth, S, SIG, t, lever) {
  const items = [];
  for (const p of PARTS.torch) items.push({ p, k: p.x + p.y + p.z, kind: 0 });
  for (const p of PARTS.lever) items.push({ p, k: p.x + p.y + p.z, kind: 1 });
  items.sort((a, b) => a.k - b.k);
  for (const it of items) {
    const p = it.p, a = p.g ? S.grpA[p.g] : 1; if (a <= 0) continue;
    // cull: project the block centre
    const sx = (cam.ax ?? c.w / 2) + ((p.x + 0.5 - p.z - 0.5) - (cam.x - cam.z)) * cam.b, sy = (cam.ay ?? c.h / 2) + ((p.x + p.z + 1) / 2 - p.y - ((cam.x + cam.z) / 2 - cam.y)) * cam.b;
    if (sx < -cam.b * 2 || sx > c.w + cam.b * 2 || sy < -cam.b * 2 || sy > c.h + cam.b * 2) continue;
    if (cam.b < 2.2) { // too small for boxes: one or two pixels
      if (it.kind === 0) { const lev = SIG(p.sig, t), X = Math.round(sx), Y = Math.round(sy - cam.b * 0.6); if (X >= 0 && Y >= 0 && X < c.w && Y < c.h && (!depth || depth[Y * c.w + X] <= p.x + p.y + p.z + 2.6) && a > bayer(X, Y)) { const q = lev > bayer(X + 1, Y) ? HEAD_ON : HEAD_OFF, i = (Y * c.w + X) * 3; c.d[i] = q[0]; c.d[i + 1] = q[1]; c.d[i + 2] = q[2]; } }
      continue;
    }
    if (it.kind === 0) torchBox(c, cam, depth, p, SIG(p.sig, t), a); else leverBox(c, cam, depth, p, lever(p.sig, t), a);
  }
}
/** screen position of a lit torch head / lamp, for small glow sparkles */
export const torchHead = (p) => (p.on === "up" ? [p.x + 0.5, p.y + 0.66, p.z + 0.5] : [p.x + 0.5 + (p.on === "+x" ? -0.15 : p.on === "-x" ? 0.15 : 0), p.y + 0.8, p.z + 0.5 + (p.on === "+z" ? -0.15 : p.on === "-z" ? 0.15 : 0)]);
