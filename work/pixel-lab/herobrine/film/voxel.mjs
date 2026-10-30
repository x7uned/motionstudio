// Herobrine film (copied from the Minecraft film; sky/fog colours made adjustable) — voxel renderer on the 540×960 pixel grid. One ray caster for both views of the same world:
//   iso   — true isometric orthographic camera {x, y, z, b}: screen = ((x−z)·b, ((x+z)/2 − y)·b) around the centre,
//           view ray along (−1,−1,−1); visible faces +y (top), +x, +z;
//   persp — first person {pos, yaw, pitch, fov}: Amanatides–Woo DDA, fog, sky, sun and blocky clouds.
// Our own 8×8 procedural textures (mip levels blended by dither, so zooms never pop), face light, sky occlusion,
// translucent water. Per-frame visibility comes from a state S (chunk build heights, generation stages, cut, ghosts).
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { B, FEATURE, ORE, SURFACE, SEA, BIOME, F, BOX, colIndex } from "./world.mjs";
import { hash, perlin2 } from "./noise.mjs";

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

// ---------------------------------------------------------------- textures (8×8, faces: 0 top, 1 side, 2 bottom)
const RAMP = {
  stone: ["#55555F", "#666671", "#777782", "#878792"], dirt: ["#553621", "#68452A", "#7A5534", "#8A6440"],
  grass: ["#3D7A2A", "#4A8C32", "#58A03A", "#68B246"], sand: ["#C4AA6A", "#D2B878", "#DEC486", "#EAD296"],
  snow: ["#C9D3E0", "#DCE4EE", "#ECF1F7", "#FAFCFF"], water: ["#23468E", "#2C56A6", "#3666BA", "#5282D0"],
  bark: ["#43291A", "#553521", "#664129", "#4A2E1C"], ring: ["#8A6A3C", "#9C7A48", "#AE8A54", "#7A5C32"],
  leaves: ["#1F4E1A", "#2A6222", "#36762A", "#448A30"], jleaves: ["#17621A", "#21781F", "#2E8E29", "#3EA230"], sleaves: ["#183626", "#20442F", "#2A5438", "#336242"],
  jbark: ["#56421F", "#685226", "#7A622E", "#4A3A1A"], sbark: ["#33210F", "#432B15", "#52361B", "#2A1A0C"],
  bedrock: ["#25252B", "#34343C", "#46464F", "#5A5A64"], gravel: ["#655B57", "#7A706B", "#8F8580", "#5A504C"],
  planks: ["#8E6C3A", "#A07C46", "#B08C52", "#76582E"], cobble: ["#4A4A52", "#62626B", "#7A7A84", "#36363D"], path: ["#8E7444", "#9C8250", "#AA905C", "#7E6638"],
  glass: ["#86C2E2", "#A6D6F0", "#C8E8FA", "#E8F6FF"], cactus: ["#24662A", "#2E7A32", "#3A8E3C", "#1C5222"], sandstone: ["#BEA266", "#CCB072", "#D8BC7E", "#B09458"],
  crop: ["#5E8A26", "#7AA232", "#9AB83C", "#C4C24A"], farmland: ["#3E2814", "#4C321A", "#5A3C20", "#6A4828"], roof: ["#4E321D", "#5E3C23", "#6E472A", "#3E2816"],
  ghost: ["#A9AAB9", "#B9BAC8", "#C7C8D6", "#8C8D9E"],
};
function texFn(type) {
  const r = (name) => RAMP[name].map(hx);
  const speck = (rm, k = 0) => (u, v, f) => rm[(hash(u, v, k) * 3.2 + (hash(u >> 1, v >> 1, k + 1) < 0.2 ? -1 : 0)) | 0 & 3] ?? rm[0];
  const pick = (rm, i) => rm[clamp(i, 0, rm.length - 1) | 0];
  switch (type) {
    case B.STONE: { const s = r("stone"); return (u, v) => pick(s, 1 + (hash(u, v, 1) < 0.25 ? -1 : hash(u, v, 2) < 0.18 ? 1 : 0) + (hash(u >> 1, v, 3) < 0.15 ? 1 : 0)); }
    case B.DIRT: { const s = r("dirt"); return (u, v) => pick(s, 1 + (hash(u, v, 4) < 0.3 ? -1 : hash(u, v, 5) < 0.25 ? 1 : 0)); }
    case B.GRASS: { const g = r("grass"), d = r("dirt"); return (u, v, f) => f === 0 ? pick(g, 1 + (hash(u, v, 6) < 0.3 ? -1 : hash(u, v, 7) < 0.3 ? 1 : 0) + (hash(u, v, 8) < 0.08 ? 1 : 0))
      : f === 2 ? pick(d, 1) : (v < 2 + (hash(u, 0, 9) < 0.5 ? 1 : 0) ? pick(g, 1 + (hash(u, v, 10) < 0.35 ? -1 : 0)) : pick(d, 1 + (hash(u, v, 11) < 0.3 ? -1 : hash(u, v, 12) < 0.25 ? 1 : 0))); }
    case B.SAND: { const s = r("sand"); return (u, v) => pick(s, 1 + (hash(u, v, 13) < 0.3 ? -1 : hash(u, v, 14) < 0.3 ? 1 : 0)); }
    case B.SNOW: { const s = r("snow"), d = r("dirt"); return (u, v, f) => f === 0 ? pick(s, 2 + (hash(u, v, 15) < 0.25 ? -1 : hash(u, v, 16) < 0.2 ? 1 : 0)) : v < 2 + (hash(u, 1, 17) < 0.5 ? 1 : 0) ? pick(s, 2) : pick(d, 1 + (hash(u, v, 18) < 0.3 ? -1 : 0)); }
    case B.WATER: { const s = r("water"); return (u, v) => pick(s, 1 + (hash(u, v, 19) < 0.25 ? 1 : 0)); }
    case B.LOG: case B.JLOG: case B.SLOG: { const s = r(type === B.LOG ? "bark" : type === B.JLOG ? "jbark" : "sbark"), g = r("ring"); return (u, v, f) => f !== 1 ? pick(g, (Math.max(Math.abs(u - 3.5), Math.abs(v - 3.5)) | 0) % 2 ? 1 : 2) : pick(s, ((u + (hash(u, v >> 2, 20) < 0.3 ? 1 : 0)) % 3 === 0 ? 0 : 1 + (hash(u, v, 21) < 0.3 ? 1 : 0))); }
    case B.LEAVES: case B.JLEAVES: case B.SLEAVES: { const s = r(type === B.LEAVES ? "leaves" : type === B.JLEAVES ? "jleaves" : "sleaves"); return (u, v) => pick(s, hash(u, v, 22) < 0.22 ? 0 : 1 + (hash(u, v, 23) < 0.4 ? 1 : 0) + (hash(u, v, 24) < 0.1 ? 1 : 0)); }
    case B.BEDROCK: { const s = r("bedrock"); return (u, v) => pick(s, (hash(u, v, 25) * 4) | 0); }
    case B.GRAVEL: { const s = r("gravel"); return (u, v) => pick(s, (hash(u, v, 26) * 4) | 0); }
    case B.COAL: case B.IRON: case B.DIAMOND: { const s = r("stone"), o = (type === B.COAL ? ["#1A1A1E", "#2C2C33"] : type === B.IRON ? ["#B08868", "#D8B08C"] : ["#2EC6C0", "#7CF4EC"]).map(hx);
      return (u, v) => { const spot = hash(u >> 1, v >> 1, 27 + type) < 0.42 && hash(u, v, 28) < 0.75; return spot ? o[hash(u, v, 29) < 0.5 ? 0 : 1] : pick(s, 1 + (hash(u, v, 1) < 0.25 ? -1 : 0)); }; }
    case B.PLANKS: case B.ROOF: { const s = r(type === B.PLANKS ? "planks" : "roof"); return (u, v) => v % 4 === 3 ? pick(s, 3) : pick(s, 1 + (hash(u >> 2, v >> 2, 30) < 0.5 ? 1 : 0) - (hash(u, v, 31) < 0.12 ? 1 : 0)); }
    case B.COBBLE: { const s = r("cobble"); return (u, v) => { const cell = hash((u + (v >> 2) * 2) >> 2, v >> 2, 32); return (u + (v >> 2) * 2) % 4 === 0 || v % 4 === 0 ? pick(s, 3) : pick(s, 1 + (cell < 0.4 ? 1 : 0) - (cell > 0.85 ? 1 : 0)); }; }
    case B.PATH: { const s = r("path"); return (u, v, f) => pick(s, f === 0 ? 1 + (hash(u, v, 33) < 0.3 ? -1 : 0) : (hash(u, v, 34) < 0.3 ? 3 : 1)); }
    case B.GLASS: { const s = r("glass"); return (u, v) => u === 0 || v === 0 || u === 7 || v === 7 ? hx("#E6EEF4") : pick(s, (u + v) % 5 === 0 ? 3 : 1); }
    case B.CACTUS: { const s = r("cactus"); return (u, v, f) => f === 0 ? pick(s, 1) : (u % 3 === 1 ? pick(s, 3) : pick(s, 1 + (hash(u, v, 35) < 0.2 ? 1 : 0))); }
    case B.SANDSTONE: { const s = r("sandstone"); return (u, v) => v % 3 === 2 ? pick(s, 3) : pick(s, 1 + (hash(u, v, 36) < 0.25 ? 1 : 0)); }
    case B.CROP: { const s = r("crop"), d = r("farmland"); return (u, v, f) => f === 0 ? (u % 2 === 0 && hash(u, v, 37) < 0.8 ? pick(s, (hash(u, v, 38) * 4) | 0) : pick(d, 1)) : (v < 6 && u % 2 === 0 ? pick(s, 1 + (v < 2 ? 2 : 0)) : pick(d, 1)); }
    // the painting of the legend's figure: a dark wood frame, a face in a teal collar, empty white eyes (our drawing)
    case 28: { const fr = hx("#4A2E1C"), fr2 = hx("#6A4428"), sk = hx("#B98C68"), hr = hx("#3A2414"), ey = hx("#FFFFFF"), sh = hx("#2A9E9E"), bg = hx("#2A2A34");
      return (u, v, f) => { if (u === 0 || v === 0 || u === 7 || v === 7) return (u + v) % 3 ? fr : fr2; if (v <= 2) return u >= 2 && u <= 5 ? hr : bg; if (v === 6) return u >= 1 && u <= 6 ? sh : bg; if (u < 2 || u > 5) return bg; if (v === 3 && (u === 2 || u === 5)) return ey; return sk; }; }
    case B.GHOST: { const s = r("ghost"); return (u, v) => (u === 0 || v === 0 ? pick(s, 3) : pick(s, 1 + (hash(u, v, 39) < 0.2 ? 1 : 0))); }
    default: { const s = r("stone"); return () => s[1]; }
  }
}
// TEX[type*3 + face] = { 8: Uint8Array(8*8*3), 4, 2, 1 } (mips by averaging)
const TEX = [];
for (let type = 0; type < 32; type++) for (let face = 0; face < 3; face++) {
  const fn = texFn(type), l8 = new Float32Array(8 * 8 * 3);
  for (let v = 0; v < 8; v++) for (let u = 0; u < 8; u++) { const col = fn(u, v, face); l8.set(col, (v * 8 + u) * 3); }
  const down = (src, n) => { const m = n / 2, out = new Float32Array(m * m * 3); for (let v = 0; v < m; v++) for (let u = 0; u < m; u++) for (let k = 0; k < 3; k++) out[(v * m + u) * 3 + k] = (src[((2 * v) * n + 2 * u) * 3 + k] + src[((2 * v) * n + 2 * u + 1) * 3 + k] + src[((2 * v + 1) * n + 2 * u) * 3 + k] + src[((2 * v + 1) * n + 2 * u + 1) * 3 + k]) / 4; return out; };
  // side faces keep their top fringe (grass/snow) down to 2×2 so a hill side still reads green on top
  const l4 = down(l8, 8), l2 = down(l4, 4), l1 = down(l2, 2);
  TEX[type * 3 + face] = { 8: l8, 4: l4, 2: l2, 1: l1 };
}
export const avgColor = (type, face = 0) => Array.from(TEX[type * 3 + face][1]);

// biome tints for grass tops/fringes and leaves (multipliers)
const TINT = [];
TINT[BIOME.PLAINS] = [1.05, 1.0, 0.85]; TINT[BIOME.FOREST] = [0.92, 0.98, 0.9]; TINT[BIOME.JUNGLE] = [0.8, 1.12, 0.78]; TINT[BIOME.SNOW] = [0.95, 1.0, 1.05];
TINT[BIOME.MOUNTAIN] = [1.0, 0.95, 0.95]; TINT[BIOME.OCEAN] = [1, 1, 1]; TINT[BIOME.BEACH] = [1.05, 1, 0.85]; TINT[BIOME.DESERT] = [1.1, 0.95, 0.75]; TINT[BIOME.RIVER] = [1, 1, 1];

/** sample a texture at face coords (fu, fv ∈ [0,1)) for an on-screen block size `bs` (px), mip blend by dither */
function sampleTex(out, type, face, fu, fv, bs, X, Y) {
  const T = TEX[type * 3 + face], l = Math.log2(Math.max(0.5, bs)) - 0.5;   // bs 8 → ~2.5
  let lev = l >= 3 ? 8 : l >= 2 ? 4 : l >= 1 ? 2 : 1; const frac = l - Math.floor(l);
  if (lev < 8 && l >= 0 && frac > bayer(X, Y)) lev *= 2;                                // dither towards the finer mip
  const tex = T[lev], u = Math.min(lev - 1, (fu * lev) | 0), v = Math.min(lev - 1, (fv * lev) | 0), i = (v * lev + u) * 3;
  out[0] = tex[i]; out[1] = tex[i + 1]; out[2] = tex[i + 2];
}

// ---------------------------------------------------------------- per-frame state
export function makeState(r) {
  const N = r.nx * r.nz;
  return { r, hv: new Float32Array(N).fill(r.ny), t: 0,
    stage: { water: 1, surf: 1, desert: 1, jungle: 1, snow: 1, trees: 1, village: 1, ores: 1, tempTint: 0, humTint: 0, floorNoise: 0, floorNoiseR: 1e9, seed: [0, 0] },
    box: { on: false, ghost: 0, stone: 0, air: 0, cut: 0, glow: 0 }, demoFlag: false, fog: { start: 1e9, end: 1e9, color: [150, 190, 235] }, sunK: 1,
    voidGrid: 1, ghostWorld: 0 };
}
// coarse 8×8 tile max heights (for empty-space skipping)
function tiles(r) {
  if (r._tiles) return r._tiles;
  const tx = Math.ceil(r.nx / 8), tz = Math.ceil(r.nz / 8), m = new Int16Array(tx * tz);
  for (let z = 0; z < r.nz; z++) for (let x = 0; x < r.nx; x++) { const k = (z >> 3) * tx + (x >> 3), h = r.top[z * r.nx + x]; if (h > m[k]) m[k] = h; }
  return (r._tiles = { tx, tz, m });
}

// ---------------------------------------------------------------- voxel visibility (displayed type or 0)
// the "x-ray window": voxels between the iso camera and the cut face (z = zc, x ∈ [x0, x1), y ≥ cutY) — their view rays
// end on the face, so removing them opens a clean window onto the cross-section without a trench in front of it
function inPrism(ix, iy, iz) { const d = iz - BOX.zc; if (d < 0 || d > 120) return false; const x1 = ix - d, y1 = iy - d; return x1 >= BOX.x0 && x1 < BOX.x1 && y1 >= BOX.cutY && y1 <= BOX.ghostTop; }
// px, py: screen pixel (dither); returns displayed block id
function shown(S, v, c, ix, iy, iz, X, Y) {
  const r = S.r, fl = r.flag[c], b = bayer(X, Y), st = S.stage;
  if (v && r.grp && S.grpA) { const g = r.grp[(iy * r.nz + (iz - r.oz)) * r.nx + (ix - r.ox)]; if (g && !(S.grpA[g] > bayer(X + 1, Y + 2))) return 0; }
  if (S.box.cut > 0 && S.demoFlag && inPrism(ix, iy, iz) && S.box.cut > b) return 0;
  if (!(fl & F.DEMO) || !S.demoFlag) {
    if (!v) return 0;
    const hv = S.hv[c]; if (iy >= hv) return 0; if (iy >= hv - 1 && hv - iy < b) return 0;
    return v;
  }
  // ---- the area where the generation steps are shown
  const box = (fl & F.BOX) && S.box.on;
  if (S.box.cut > 0 && inPrism(ix, iy, iz) && S.box.cut > b) return 0;
  if (box && S.box.ghost > 0 && iy <= BOX.ghostTop && iy >= BOX.cutY && iz >= BOX.zc - 3 && iz < BOX.zc) {
    const solid = v !== 0 && v !== B.WATER, wasHF = iy <= r.hHF[c];
    if (S.box.air >= 1 && !solid) return 0;
    if (!solid && S.box.air > b) return 0;
    if (!wasHF && S.box.ghost < b) return 0;
    if (solid && S.box.stone > b) return S.box.air >= 1 ? showSurf(S, v, c, b) : B.STONE;
    return B.GHOST;
  }
  if (!v) return 0;
  if (FEATURE[v] === 1) { const k = st.trees * 1.6 - hash(ix >> 2, iz >> 2, 77) * 0.6; return k > b ? v : 0; }
  if (FEATURE[v] === 2) { const k = st.village * 1.5 - hash(ix >> 1, iz >> 1, 78) * 0.5; return k > b ? v : 0; }
  if (v === B.WATER) { const hv = S.hv[c]; return hv >= r.ground[c] + 0.5 && st.water > b ? v : 0; }
  if (box && S.box.ghost <= 0) { if (iy > r.hHF[c]) return 0; v = iy === r.hHF[c] ? B.GRASS : B.STONE; }
  const hv = S.hv[c]; if (iy >= hv) return 0; if (iy >= hv - 1 && hv - iy < b) return 0;
  return showSurf(S, v, c, b);
}
function showSurf(S, v, c, b) {
  const st = S.stage;
  if (ORE[v]) return st.ores > b ? v : B.STONE;
  if (SURFACE[v]) { const bi = S.r.biome[c], k = bi === BIOME.DESERT ? st.desert : bi === BIOME.JUNGLE ? st.jungle : bi === BIOME.SNOW ? st.snow : st.surf; return k > b ? v : B.STONE; }
  return v;
}

// ---------------------------------------------------------------- shading of a hit
const tmp = [0, 0, 0], tmp2 = [0, 0, 0];
const FACE_L = [1.0, 0.8, 0.62, 0.45];                     // top, ±x, ±z, bottom
function shadeHit(out, S, type, axis, sign, fu, fv, ix, iy, iz, bs, X, Y, c) {
  const face = axis === 1 ? (sign > 0 ? 0 : 2) : 1;
  sampleTex(out, type, face, fu, axis === 1 ? fv : 1 - fv, bs, X, Y);
  // biome tint for grass (top + side fringe) and leaves
  if (type === B.GRASS || type === B.LEAVES || type === B.JLEAVES) { const tn = TINT[S.r.biome[c]] ?? TINT[0]; if (type !== B.GRASS || face === 0 || out[1] > out[0] * 1.15) { out[0] *= tn[0]; out[1] *= tn[1]; out[2] *= tn[2]; } }
  if (type === B.WATER && face === 0) { const w = Math.sin(ix * 0.9 + iz * 0.6 + S.t * 2.2 + fu * 3) * Math.sin(iz * 0.7 - S.t * 1.6 + fv * 2.5); if (w > 0.72) { out[0] += 40; out[1] += 44; out[2] += 40; } }
  let L = axis === 1 ? (sign > 0 ? FACE_L[0] : FACE_L[3]) : axis === 0 ? FACE_L[1] : FACE_L[2];
  // sky occlusion: the air cell the ray came from — covered by something above?
  const r = S.r, nx = ix + (axis === 0 ? sign : 0), ny = iy + (axis === 1 ? sign : 0), nz = iz + (axis === 2 ? sign : 0);
  if (nx >= r.ox && nz >= r.oz && nx < r.ox + r.nx && nz < r.oz + r.nz) { const cc = colIndex(r, nx, nz); if (ny < r.top[cc] && ny < S.hv[cc] - 1 && !(S.box.cut > 0.5 && inPrism(nx, ny, nz))) L *= S.shadowK ?? 0.5; }
  // generation-stage overlays on demo tops: temperature / humidity maps
  if (S.demoFlag && face === 0 && (S.stage.tempTint > 0 || S.stage.humTint > 0) && (r.flag[c] & F.DEMO)) {
    const tt = S.stage.tempTint, hh = S.stage.humTint;
    if (tt > 0) { const k = clamp(r.temp[c] * 1.4 + 0.5), q = Math.floor(k * 4 + bayer(X + 1, Y)) / 4; tmp2[0] = 70 + 180 * q; tmp2[1] = 90 + 40 * (1 - Math.abs(q - 0.5) * 2) ; tmp2[2] = 230 - 190 * q; mixInto(out, tmp2, tt * 0.75); }
    if (hh > 0) { const k = clamp(r.hum[c] * 1.4 + 0.5), q = Math.floor(k * 4 + bayer(X, Y + 1)) / 4; tmp2[0] = 200 - 150 * q; tmp2[1] = 150 + 40 * q; tmp2[2] = 70 + 30 * q; mixInto(out, tmp2, hh * 0.75); }
  }
  // the cut face reads as a lit cross-section
  if (axis === 2 && iz === BOX.zc - 1 && S.box.cut > 0 && (r.flag[c] & F.BOX)) L = Math.min(1, L * 1.45);
  out[0] *= L; out[1] *= L; out[2] *= L;
}
function mixInto(o, c, k) { o[0] += (c[0] - o[0]) * k; o[1] += (c[1] - o[1]) * k; o[2] += (c[2] - o[2]) * k; }
function put(c, X, Y, col) { const i = (Y * c.w + X) * 3; c.d[i] = col[0] < 0 ? 0 : col[0] > 255 ? 255 : col[0]; c.d[i + 1] = col[1] < 0 ? 0 : col[1] > 255 ? 255 : col[1]; c.d[i + 2] = col[2] < 0 ? 0 : col[2] > 255 ? 255 : col[2]; }

// ---------------------------------------------------------------- the void floor (unbuilt area) and the noise map
const VOID = hx("#0A0812"), VOIDG = hx("#1E1834"), VOIDG2 = hx("#120E20");
function floorColor(out, S, wx, wz, bs, X, Y) {
  out[0] = VOID[0]; out[1] = VOID[1]; out[2] = VOID[2];
  if (S.outside) { const r = S.r; if (wx < r.ox || wz < r.oz || wx >= r.ox + r.nx || wz >= r.oz + r.nz) { S.outside(out, wx, wz, bs, X, Y); return; } }
  const g = S.voidGrid; if (g > 0) {
    const e = Math.max(0.6 / Math.max(bs, 0.01), 0.03);
    const fx = ((wx % 16) + 16) % 16, fz = ((wz % 16) + 16) % 16;
    if ((fx < e * 16 || fz < e * 16) && bs * 16 > 10) mixInto(out, VOIDG, g);
    else if (bs > 8) { const fx1 = ((wx % 1) + 1) % 1, fz1 = ((wz % 1) + 1) % 1; if ((fx1 < 1 / bs || fz1 < 1 / bs)) mixInto(out, VOIDG2, g); }
  }
  // the noise map spreading from the seed over the demo area
  const st = S.stage;
  if (S.demoFlag && st.floorNoise > 0) {
    const r = S.r, ix = Math.floor(wx), iz = Math.floor(wz);
    if (ix >= r.ox && iz >= r.oz && ix < r.ox + r.nx && iz < r.oz + r.nz) { const c = colIndex(r, ix, iz);
      if (r.flag[c] & F.DEMO) { const d = Math.hypot(wx - st.seed[0], wz - st.seed[1]), k = st.floorNoise * clamp((st.floorNoiseR - d) / 30);
        if (k > bayer(X + 2, Y)) { const n = clamp(r.cont[c] * 0.9 + 0.5), q = Math.floor(n * 5 + bayer(X, Y)) / 5, v = 40 + 190 * q; out[0] = v * 0.94; out[1] = v * 0.94; out[2] = v; } } }
  }
}

// ---------------------------------------------------------------- iso renderer
/** cam {x, y, z, b}; clip [x0,y0,x1,y1] in canvas px. depth (Float32Array c.w*c.h, optional) gets x+y+z of the hit. */
export function renderIso(c, clip, cam, S, depth = null) {
  const r = S.r, b = cam.b, W = c.w, H = c.h, T = tiles(r), Ys = r.maxTop + 1, out = [0, 0, 0];
  const AXS = cam.ax ?? W / 2, AYS = cam.ay ?? H / 2, AX = cam.x - cam.z, BY = (cam.x + cam.z) / 2 - cam.y, X0 = r.ox, Z0 = r.oz, X1 = r.ox + r.nx, Z1 = r.oz + r.nz, NX = r.nx, NZ = r.nz, vox = r.vox;
  const [cx0, cy0, cx1, cy1] = clip;
  for (let Y = Math.max(0, cy0); Y < Math.min(H, cy1); Y++) for (let X = Math.max(0, cx0); X < Math.min(W, cx1); X++) {
    const A = (X + 0.5 - AXS) / b + AX, Bv = (Y + 0.5 - AYS) / b + BY, S0 = 2 * (Bv + Ys), x0 = (S0 + A) / 2, z0 = (S0 - A) / 2;
    // enter the region box: λ where x < X1 and z < Z1
    let lam = Math.max(0, x0 - X1 + 1e-4, z0 - Z1 + 1e-4), hitType = 0;
    // the world around the region (outside hook) lies on a plane at ground level: rays that reach it before entering
    // the region see it, so the region never shows its sides like a floating island
    if (S.outside && S.outsideY != null) { const lp = Ys - S.outsideY, px = x0 - lp, pz = z0 - lp;
      if ((px < X0 || pz < Z0 || px >= X1 || pz >= Z1) && lp <= lam) { S.outside(out, px, pz, b, X, Y); if (depth) depth[Y * W + X] = -1e9; if (S.hit) S.hit.ax[Y * W + X] = 0; put(c, X, Y, out); continue; } }
    let hitAxis = 1, hitLam = 0, ix = 0, iy = 0, iz = 0, water = -1, wLam = 0, wfu = 0, wfv = 0, wix = 0, wiy = 0, wiz = 0, wc = 0;
    if (lam < Ys) {
      // coarse skip over tiles that are lower than the ray
      for (let guard = 0; guard < 400; guard++) {
        const px = x0 - lam, pz = z0 - lam, py = Ys - lam; if (px < X0 || pz < Z0 || py <= 0) break;
        const tx = ((Math.floor(px) - X0) >> 3), tz = ((Math.floor(pz) - Z0) >> 3), tm = T.m[tz * T.tx + tx] + 1;
        if (py <= tm) break;
        const bx = px - (X0 + tx * 8), bz = pz - (Z0 + tz * 8);
        lam += Math.max(1e-3, Math.min(py - tm, bx + 1e-4, bz + 1e-4));
      }
      // fine DDA along (−1,−1,−1) from λ
      const px = x0 - lam, py = Ys - lam, pz = z0 - lam;
      ix = Math.floor(px); iy = Math.ceil(py) - 1; iz = Math.floor(pz);
      let tX = lam + (px - ix), tY = lam + (py - iy), tZ = lam + (pz - iz);
      // the first cell: entered at λ through the face whose boundary is nearest behind
      let axis = 1; { const dx = px - ix, dy = py - iy, dz = pz - iz; const mx = Math.max(dx, dy, dz); axis = mx === dy ? 1 : mx === dx ? 0 : 2; }
      let lamIn = lam;
      for (let guard = 0; guard < 1200; guard++) {
        if (ix < X0 || iz < Z0 || iy < 0) break;
        if (ix < X1 && iz < Z1 && iy < r.ny) {
          const cidx = (iz - Z0) * NX + (ix - X0), v = vox[(iy * NZ + (iz - Z0)) * NX + (ix - X0)];
          if (v || ((r.flag[cidx] & F.BOX) && S.box.on && S.box.ghost > 0)) {
            const s = shown(S, v, cidx, ix, iy, iz, X, Y);
            if (s === B.WATER) { if (water < 0) { water = s; wLam = lamIn; wix = ix; wiy = iy; wiz = iz; wc = cidx; } }
            else if (s) { hitType = s; hitAxis = axis; hitLam = lamIn; break; }
          }
        }
        // step to the next cell
        if (tX <= tY && tX <= tZ) { lamIn = tX; tX += 1; ix--; axis = 0; } else if (tZ <= tY) { lamIn = tZ; tZ += 1; iz--; axis = 2; } else { lamIn = tY; tY += 1; iy--; axis = 1; }
      }
    }
    // colour
    if (hitType) {
      const hx_ = x0 - hitLam, hy = Ys - hitLam, hz = z0 - hitLam;
      const fu = hitAxis === 0 ? hz - Math.floor(hz) : hx_ - Math.floor(hx_), fv = hitAxis === 1 ? hz - Math.floor(hz) : hy - Math.floor(hy);
      shadeHit(out, S, hitType, hitAxis, 1, hitAxis === 0 ? 1 - fu : fu, hitAxis === 1 ? fv : fv, ix, iy, iz, b, X, Y, (iz - Z0) * NX + (ix - X0));
      if (depth) depth[Y * W + X] = hx_ + hy + hz;
      if (S.hit) { const k = Y * W + X; S.hit.x[k] = hx_; S.hit.y[k] = hy; S.hit.z[k] = hz; S.hit.ax[k] = hitAxis + 1; S.hit.ty[k] = hitType; }
    } else {
      floorColor(out, S, x0 - Ys, z0 - Ys, b, X, Y);
      if (depth) depth[Y * W + X] = -1e9;
      if (S.hit) { const k = Y * W + X; S.hit.x[k] = x0 - Ys; S.hit.y[k] = 0; S.hit.z[k] = z0 - Ys; S.hit.ax[k] = 0; S.hit.ty[k] = 0; }
    }
    if (water >= 0) {
      const hx_ = x0 - wLam, hz = z0 - wLam; shadeHit(tmp, S, B.WATER, 1, 1, hx_ - Math.floor(hx_), hz - Math.floor(hz), wix, wiy, wiz, b, X, Y, wc);
      const dep = hitType ? (hitLam - wLam) : 30, k = clamp(0.5 + dep * 0.07, 0.5, 0.92); mixInto(out, tmp, k);
      if (depth) depth[Y * W + X] = x0 + z0 + Ys - 3 * wLam;
    }
    put(c, X, Y, out);
  }
}
/** world → iso screen */
export function isoProject(cam, W, H, x, y, z) { return [(cam.ax ?? W / 2) + ((x - z) - (cam.x - cam.z)) * cam.b, (cam.ay ?? H / 2) + ((x + z) / 2 - y - ((cam.x + cam.z) / 2 - cam.y)) * cam.b]; }

// ---------------------------------------------------------------- perspective renderer (first person)
const SKY_TOP = hx("#3E6EC8"), SKY_HOR = hx("#A8CCF2"), SUN = hx("#FFF4C8"), CLOUD = hx("#F4F8FF"), CLOUD_S = hx("#D2DCEC");
const CLOUD_Y = 118;
function skyColor(out, S, dx, dy, dz, ox, oy, oz, X, Y) {
  const k = clamp(dy * 1.6 + 0.12), q = Math.floor(k * 6 + bayer(X, Y)) / 6, ST = S.skyTop ?? SKY_TOP, SH = S.skyHor ?? SKY_HOR;
  out[0] = SH[0] + (ST[0] - SH[0]) * q; out[1] = SH[1] + (ST[1] - SH[1]) * q; out[2] = SH[2] + (ST[2] - SH[2]) * q;
  if (S.noSun) return;
  // square sun
  const sd = S.sunDir ?? [-0.35, 0.42, -0.84], su = dx * sd[0] + dy * sd[1] + dz * sd[2];
  if (su > 0.985) { const p = [dx - sd[0] * su, dy - sd[1] * su, dz - sd[2] * su]; if (Math.abs(p[0]) < 0.075 && Math.abs(p[1]) < 0.075) mixInto(out, SUN, 1); else if (Math.abs(p[0]) < 0.11 && Math.abs(p[1]) < 0.11) mixInto(out, SUN, 0.35); }
  // blocky clouds on a plane
  if (dy > 0.015 && oy < CLOUD_Y) { const tt = (CLOUD_Y - oy) / dy, cx = ox + dx * tt + S.t * 1.2, cz = oz + dz * tt, gx = Math.floor(cx / 12), gz = Math.floor(cz / 12);
    if (tt < 1400 && perlin2(gx * 0.31, gz * 0.31, 30) > 0.18) { const fogk = clamp(tt / 1400); const col = (((cx / 12) % 1 + 1) % 1 < 0.08 || ((cz / 12) % 1 + 1) % 1 < 0.08) ? CLOUD_S : CLOUD; tmp2[0] = col[0]; tmp2[1] = col[1]; tmp2[2] = col[2]; mixInto(out, tmp2, 0.92 * (1 - fogk)); } }
}
/** cam {x,y,z,yaw,pitch,fov (vertical, rad)}; rect = the screen the image fills (may be bigger than clip). */
export function renderPersp(c, rect, clip, cam, S, depth = null) {
  const r = S.r, W = c.w, H = c.h, T = tiles(r), out = [0, 0, 0];
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  // forward (yaw 0 → −z), right, up
  const fwd = [-sy * cp, sp, -cy * cp], right = [cy, 0, -sy], up = [sy * sp, cp, cy * sp];
  const th = Math.tan(cam.fov / 2), aspect = rect.w / rect.h, focal = rect.h / 2 / th;
  const X0 = r.ox, Z0 = r.oz, X1 = r.ox + r.nx, Z1 = r.oz + r.nz, NX = r.nx, NZ = r.nz, vox = r.vox, NY = r.ny, maxY = r.maxTop + 1;
  const fog = S.fog, maxD = Math.min(6000, fog.end + 4);
  const [cx0, cy0, cx1, cy1] = clip;
  for (let Y = Math.max(0, cy0); Y < Math.min(H, cy1); Y++) for (let X = Math.max(0, cx0); X < Math.min(W, cx1); X++) {
    const sx = ((X + 0.5 - rect.x) / rect.w * 2 - 1) * th * aspect, syy = (1 - (Y + 0.5 - rect.y) / rect.h * 2) * th;
    let dx = fwd[0] + right[0] * sx + up[0] * syy, dy = fwd[1] + right[1] * sx + up[1] * syy, dz = fwd[2] + right[2] * sx + up[2] * syy;
    const inv = 1 / Math.hypot(dx, dy, dz); dx *= inv; dy *= inv; dz *= inv;
    let ox = cam.x, oy = cam.y, oz = cam.z, t0 = 0;
    // start at the region box (camera may be far above / outside it)
    if (oy > maxY || ox < X0 || ox >= X1 || oz < Z0 || oz >= Z1) {
      let tn = 0, tf = 1e9;
      for (const [o, d, lo, hi] of [[ox, dx, X0, X1], [oy, dy, 0, maxY], [oz, dz, Z0, Z1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { tn = 1e9; break; } continue; }
        let a = (lo - o) / d, b2 = (hi - o) / d; if (a > b2) [a, b2] = [b2, a]; tn = Math.max(tn, a); tf = Math.min(tf, b2);
      }
      if (tn < tf && tn < 1e8) { t0 = tn + 1e-3; ox += dx * t0; oy += dy * t0; oz += dz * t0; }
      else { t0 = -1; }
    }
    let hitType = 0, hitAxis = 1, hitSign = 1, hitT = 0, ix = Math.floor(ox), iy = Math.floor(oy), iz = Math.floor(oz), water = -1, wT = 0, wix = 0, wiy = 0, wiz = 0, wc = 0;
    const stX = dx > 0 ? 1 : -1, stY = dy > 0 ? 1 : -1, stZ = dz > 0 ? 1 : -1;
    const ddX = Math.abs(1 / dx), ddY = Math.abs(1 / dy), ddZ = Math.abs(1 / dz);
    let tX = (dx > 0 ? ix + 1 - ox : ox - ix) * ddX, tY = (dy > 0 ? iy + 1 - oy : oy - iy) * ddY, tZ = (dz > 0 ? iz + 1 - oz : oz - iz) * ddZ, tIn = 0, axis = 1;
    for (let guard = 0; guard < 3000 && t0 >= 0; guard++) {
      if (tIn + t0 > maxD) break;
      if (iy >= maxY && dy >= 0) break;
      if (iy < 0) break;
      if (ix >= X0 && iz >= Z0 && ix < X1 && iz < Z1) {
        if (iy < NY) {
          const cidx = (iz - Z0) * NX + (ix - X0);
          // empty-space skip: above this tile's max → jump to the tile boundary
          if (iy > T.m[((iz - Z0) >> 3) * T.tx + ((ix - X0) >> 3)] + 1 && dy >= -0.05) {
            const bx0 = X0 + (((ix - X0) >> 3) << 3), bz0 = Z0 + (((iz - Z0) >> 3) << 3);
            const ex = dx > 0 ? (bx0 + 8 - ox) / dx : dx < 0 ? (bx0 - ox) / dx : 1e9, ez = dz > 0 ? (bz0 + 8 - oz) / dz : dz < 0 ? (bz0 - oz) / dz : 1e9, tt = Math.min(ex, ez) + 1e-4;
            if (tt > tIn + 1.5) { tIn = tt; const px = ox + dx * tt, py = oy + dy * tt, pz = oz + dz * tt; ix = Math.floor(px); iy = Math.floor(py); iz = Math.floor(pz);
              tX = tt + (dx > 0 ? ix + 1 - px : px - ix) * ddX; tY = tt + (dy > 0 ? iy + 1 - py : py - iy) * ddY; tZ = tt + (dz > 0 ? iz + 1 - pz : pz - iz) * ddZ; axis = ex < ez ? 0 : 2; continue; }
          }
          const v = vox[(iy * NZ + (iz - Z0)) * NX + (ix - X0)];
          if (v) { const s = shown(S, v, cidx, ix, iy, iz, X, Y);
            if (s === B.WATER) { if (water < 0) { water = 1; wT = tIn; wix = ix; wiy = iy; wiz = iz; wc = cidx; } }
            else if (s && guard > 0) { hitType = s; hitAxis = axis; hitT = tIn; hitSign = axis === 0 ? -stX : axis === 1 ? -stY : -stZ; break; } }
        }
      } else if ((ix < X0 && dx <= 0) || (ix >= X1 && dx >= 0) || (iz < Z0 && dz <= 0) || (iz >= Z1 && dz >= 0)) break;
      if (tX < tY && tX < tZ) { tIn = tX; tX += ddX; ix += stX; axis = 0; } else if (tZ < tY) { tIn = tZ; tZ += ddZ; iz += stZ; axis = 2; } else { tIn = tY; tY += ddY; iy += stY; axis = 1; }
    }
    const oxC = cam.x, oyC = cam.y, ozC = cam.z; if (t0 < 0) t0 = 0;
    let dist = hitT + t0;
    if (hitType) {
      const hx_ = ox + dx * hitT, hy = oy + dy * hitT, hz = oz + dz * hitT;
      const fu = hitAxis === 0 ? hz - Math.floor(hz) : hx_ - Math.floor(hx_), fv = hitAxis === 1 ? hz - Math.floor(hz) : hy - Math.floor(hy);
      shadeHit(out, S, hitType, hitAxis, hitSign, fu, fv, ix, iy, iz, focal / Math.max(0.3, hitT + t0), X, Y, (iz - Z0) * NX + (ix - X0));
      // the tunnel: faces inside the mountain get light from the mouth
      if (S.tunnelLight) S.tunnelLight(out, hx_, hy, hz);
    } else if (dy < -0.02) {
      const tt = -oyC / dy; floorColor(out, S, oxC + dx * tt, ozC + dz * tt, focal / tt, X, Y); dist = tt;
      if (water >= 0) dist = wT + t0;
    } else { skyColor(out, S, dx, dy, dz, oxC, oyC, ozC, X, Y); dist = 1e9; }
    if (water >= 0) { const hx_ = ox + dx * wT, hz = oz + dz * wT; shadeHit(tmp, S, B.WATER, 1, 1, hx_ - Math.floor(hx_), hz - Math.floor(hz), wix, wiy, wiz, focal / Math.max(0.3, wT + t0), X, Y, wc); const dep = hitType ? (hitT - wT) * Math.abs(dy) * 2 : 30; mixInto(out, tmp, clamp(0.55 + dep * 0.08, 0.55, 0.93)); dist = wT + t0; }
    // fog (stepped with dither)
    if (dist < 1e8 && dist > fog.start) { const k = clamp((dist - fog.start) / (fog.end - fog.start)), q = Math.floor(k * 5 + bayer(X + 1, Y + 2)) / 5; if (S.fogColor) { tmp2[0] = S.fogColor[0]; tmp2[1] = S.fogColor[1]; tmp2[2] = S.fogColor[2]; } else skyColor(tmp2, S, dx, Math.max(dy, 0.01), dz, oxC, oyC, ozC, X, Y); mixInto(out, tmp2, q); }
    if (depth) depth[Y * W + X] = dist;
    put(c, X, Y, out);
  }
}
/** world → perspective screen (for drawing actors/labels over a persp view) */
export function perspProject(cam, rect, x, y, z) {
  const cy = Math.cos(cam.yaw), sy = Math.sin(cam.yaw), cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const fwd = [-sy * cp, sp, -cy * cp], right = [cy, 0, -sy], up = [sy * sp, cp, cy * sp], th = Math.tan(cam.fov / 2), aspect = rect.w / rect.h;
  const d = [x - cam.x, y - cam.y, z - cam.z], f = d[0] * fwd[0] + d[1] * fwd[1] + d[2] * fwd[2]; if (f <= 0.05) return null;
  const rr = (d[0] * right[0] + d[1] * right[1] + d[2] * right[2]) / f, uu = (d[0] * up[0] + d[1] * up[1] + d[2] * up[2]) / f;
  return [rect.x + (rr / (th * aspect) + 1) / 2 * rect.w, rect.y + (1 - uu / th) / 2 * rect.h, f];
}
