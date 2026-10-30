// Minecraft film — the one block world of the film (an illustration in the spirit of the game, our own generator,
// textures and numbers; no Mojang assets, names or logos). Two voxel regions:
//   MAIN — spawn cliff with the tunnel, the valley the player runs through, and the "next" area beyond the frontier where
//          the film shows the generation steps (noise → land/ocean → flat/rough → biomes → 3D noise → surface & features);
//   FAR  — the old-version Far Lands at x = −12,550,821 (normal land at lx ≥ 0, the broken walls at lx < 0).
// Everything is precomputed once and deterministic.
import { perlin2, perlin3, fbm2, hash } from "./noise.mjs";

export const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, SNOW: 5, WATER: 6, LOG: 7, LEAVES: 8, BEDROCK: 9, COAL: 10, IRON: 11, DIAMOND: 12, GRAVEL: 13,
  PLANKS: 14, COBBLE: 15, PATH: 16, GLASS: 17, JLEAVES: 18, CACTUS: 19, SLEAVES: 20, SANDSTONE: 21, CROP: 22, ROOF: 23, JLOG: 24, SLOG: 25, CLAY: 26, GHOST: 27 };
export const FEATURE = new Uint8Array(32); for (const k of [B.LOG, B.LEAVES, B.JLEAVES, B.CACTUS, B.SLEAVES, B.JLOG, B.SLOG]) FEATURE[k] = 1; for (const k of [B.PLANKS, B.COBBLE, B.PATH, B.GLASS, B.CROP, B.ROOF]) FEATURE[k] = 2;
export const ORE = new Uint8Array(32); ORE[B.COAL] = ORE[B.IRON] = ORE[B.DIAMOND] = 1;
export const SURFACE = new Uint8Array(32); for (const k of [B.GRASS, B.SAND, B.SNOW, B.DIRT, B.SANDSTONE, B.GRAVEL, B.CLAY]) SURFACE[k] = 1;
export const SEA = 30;
export const BIOME = { PLAINS: 0, FOREST: 1, DESERT: 2, JUNGLE: 3, SNOW: 4, MOUNTAIN: 5, OCEAN: 6, BEACH: 7, RIVER: 8 };

const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

function makeRegion(ox, oz, nx, nz, ny) {
  const N = nx * nz;
  return { ox, oz, nx, nz, ny, vox: new Uint8Array(nx * nz * ny), top: new Int16Array(N), ground: new Int16Array(N), hLO: new Int16Array(N), hHF: new Int16Array(N),
    biome: new Uint8Array(N), flag: new Uint8Array(N), cont: new Float32Array(N), temp: new Float32Array(N), hum: new Float32Array(N), ero: new Float32Array(N), maxTop: 0 };
}
const vi = (r, x, y, z) => (y * r.nz + (z - r.oz)) * r.nx + (x - r.ox);
function set(r, x, y, z, b) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return; r.vox[vi(r, x, y, z)] = b; }
function get(r, x, y, z) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return 0; return r.vox[vi(r, x, y, z)]; }
export const colIndex = (r, x, z) => (z - r.oz) * r.nx + (x - r.ox);

// ---------------------------------------------------------------- MAIN region layout
// Spawn: the player walks north (−z) through a tunnel in a mountain and comes out on a cliff top at (0, 60, 0).
// Iso views look along (−1,−1,−1): north-west (−x,−z) is "up" on screen. The player later runs north-west.
export const MAIN = makeRegion(-576, -576, 736, 736, 112);
export const SPAWN = { x: 0, y: 61, z: -2 }, CLIFF_Y = 60, TUNNEL = { x0: -1, x1: 0, y0: 61, y1: 63, z0: 0, z1: 20 };
// the area beyond the frontier where the generation steps are shown (columns with flag DEMO), and the 3D-noise box
export const F = { DEMO: 1, BOX: 2, VILLAGE: 4 };
export const BOX = { x0: -342, x1: -300, z0: -286, z1: -256, zc: -268, y1: 96, cutY: 18 };   // cut plane: voxels with z ≥ zc are cut away
export const VILLAGE = { x: -290, z: -346 };

// natural fields (shared formulas for both regions; `o` offsets the noise for the Far Lands)
function fields(x, z, o = 0) {
  let cont = fbm2((x + o) / 230, (z + o) / 230, 4, 1) * 1.25 + 0.18;
  const ero = fbm2((x + o) / 150, (z + o) / 150, 3, 2);
  const pv = 1 - Math.abs(fbm2((x + o) / 70, (z + o) / 70, 4, 3));
  let temp = fbm2((x + o) / 330, (z + o) / 330, 2, 4) * 1.3, hum = fbm2((x + o) / 280, (z + o) / 280, 2, 5) * 1.3;
  return { cont, ero, pv, temp, hum };
}
function heights(fl, x, z, o = 0) {
  const { cont, ero, pv } = fl, land = sstep(-0.06, 0.12, cont);
  const hLO = cont < 0 ? SEA - 3 + cont * 16 : SEA + 1 + Math.min(cont, 0.9) * 9;
  const rough = sstep(-0.05, 0.45, -ero) * land;
  const detail = fbm2((x + o) / 22, (z + o) / 22, 3, 6) * 2.4 * land;
  const h = hLO + rough * Math.pow(pv, 2.2) * 54 + detail;
  return { hLO: Math.max(4, hLO), h: Math.max(4, h), rough, land };
}

/** spawn shaping: a mountain south of spawn with a ledge at y = 60 in front of the tunnel mouth and a sheer cliff to
 *  the north; the valley with a river below; a lake to the north-west and snowy peaks to the north-east. */
function spawnShape(x, z, h) {
  const dV = Math.hypot(x, z + 40), near = sstep(150, 90, dV);
  let valley = SEA + 3 + fbm2(x / 28, z / 28, 3, 7) * 2.4 + sstep(-70, -120, z) * fbm2(x / 40, z / 40, 2, 17) * 10;
  let out = lerp(h, valley, near);
  // the lake (north-west) and the snowy peaks beyond the valley
  const dl = Math.hypot((x + 46) / 1.25, z + 82); if (dl < 38) out = lerp(out, SEA - 7 + dl * 0.14, sstep(38, 24, dl));
  for (const [px, pz, pr, ph] of [[52, -112, 48, 66], [-112, -132, 52, 62], [6, -150, 40, 50]]) { const dp = Math.hypot(x - px, z - pz); if (dp < pr) out = Math.max(out, SEA + 4 + ph * Math.pow(Math.max(0, 1 - dp / pr), 1.45) + fbm2(x / 8, z / 8, 3, 16) * 5 * (1 - dp / pr)); }
  // the river through the valley into the lake
  if (RIVER(x, z)) out = Math.min(out, SEA - 2);
  // the mountain behind the ledge: slopes to the valley on the east, west and south, a sheer cliff on the north face
  { const e = Math.sqrt((x / 30) ** 2 + ((z - 16) / 22) ** 2) * (1 + 0.12 * perlin2(x / 12, z / 12, 14));
    if (e < 1.75 && (z >= -4 || (Math.abs(x) > 8 && z >= -9 + Math.abs(x) * 0.08))) {
      const ridge = 1 - Math.abs(perlin2(x / 11, z / 11, 19)), m = 33 + 62 * Math.pow(Math.max(0, 1 - e / 1.75), 1.25) + (ridge * 7 - 3) * Math.max(0, 1 - e / 1.75) + fbm2(x / 6, z / 6, 2, 15) * 1.5;
      out = Math.max(out, m); } }
  if (Math.abs(x) <= 6 && z >= -4 && z < 1) out = CLIFF_Y;
  return out;
}
export const RIVER = (x, z) => x > -40 && x < 130 && Math.abs(z - (-38 + 7 * Math.sin(x / 19) - Math.max(0, -x) * 0.9)) < 3.2 && Math.hypot((x + 46) / 1.25, z + 82) > 22;

function biomeOf(fl, h, x, z) {
  if (h < SEA - 1) return BIOME.OCEAN;
  if (h <= SEA + 1 && fl.cont < 0.08) return BIOME.BEACH;
  if (h > SEA + 48) return BIOME.SNOW;
  if (fl.temp < -0.32) return BIOME.SNOW;
  if (h > SEA + 31) return BIOME.MOUNTAIN;
  if (fl.temp > 0.22 && fl.hum < -0.02) return BIOME.DESERT;
  if (fl.temp > 0.1 && fl.hum > 0.2) return BIOME.JUNGLE;
  return fl.hum > -0.05 ? BIOME.FOREST : BIOME.PLAINS;
}

function fillColumn(r, x, z, h, biome, density = null) {
  const top = Math.min(r.ny - 1, Math.round(h));
  for (let y = 0; y <= (density ? Math.min(r.ny - 1, top + 14) : top); y++) {
    let b = y <= 1 ? B.BEDROCK : B.STONE;
    if (density && y > 1 && !density(y)) { continue; }
    if (y > top) { set(r, x, y, z, B.STONE); continue; }
    const d = top - y;
    if (y > 1 && d < 4) {
      if (biome === BIOME.DESERT) b = d < 3 ? B.SAND : B.SANDSTONE;
      else if (biome === BIOME.BEACH || biome === BIOME.OCEAN || biome === BIOME.RIVER) b = top < SEA - 6 ? B.GRAVEL : d < 3 ? B.SAND : B.STONE;
      else if (biome === BIOME.MOUNTAIN) b = B.STONE;
      else if (biome === BIOME.SNOW) b = d === 0 ? B.SNOW : top > SEA + 40 ? B.STONE : B.DIRT;
      else b = d === 0 ? B.GRASS : B.DIRT;
    }
    // ores in deep stone (small clusters by hash)
    if (b === B.STONE && y > 1) { const hh = hash(x >> 1, y >> 1, z >> 1); if (y < 14 && hh < 0.012) b = B.DIAMOND; else if (y < 40 && hh > 0.965) b = B.IRON; else if (hh > 0.93 && y < top - 3) b = B.COAL; }
    set(r, x, y, z, b);
  }
  if (top < SEA) for (let y = top + 1; y <= SEA; y++) set(r, x, y, z, B.WATER);
  return top;
}

// ---------------------------------------------------------------- trees
function oak(r, x, y, z, s) { const th = 4 + (s * 3 | 0);
  for (let dy = th - 2; dy <= th + 1; dy++) { const rr = dy >= th ? 1 : 2; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (rr === 2 && Math.abs(dx) === 2 && Math.abs(dz) === 2 && hash(x + dx, dy, z + dz) < 0.6) continue; if (!get(r, x + dx, y + dy, z + dz)) set(r, x + dx, y + dy, z + dz, B.LEAVES); } }
  for (let dy = 0; dy < th; dy++) set(r, x, y + dy, z, B.LOG); }
function spruce(r, x, y, z, s) { const th = 6 + (s * 4 | 0);
  for (let dy = 2; dy <= th + 1; dy++) { const rr = dy > th ? 0 : Math.max(0, Math.round((th - dy) / 2.2)) % 3; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (rr && Math.abs(dx) === rr && Math.abs(dz) === rr) continue; if (!get(r, x + dx, y + dy, z + dz)) set(r, x + dx, y + dy, z + dz, B.SLEAVES); } }
  for (let dy = 0; dy < th; dy++) set(r, x, y + dy, z, B.SLOG); }
function jungleTree(r, x, y, z, s) { const th = 9 + (s * 6 | 0);
  for (let dy = th - 3; dy <= th + 1; dy++) { const rr = dy >= th ? 2 : 3; for (let dx = -rr; dx <= rr; dx++) for (let dz = -rr; dz <= rr; dz++) { if (dx * dx + dz * dz > rr * rr + 1) continue; if (!get(r, x + dx, y + dy, z + dz)) set(r, x + dx, y + dy, z + dz, B.JLEAVES); } }
  for (let dy = 0; dy < th; dy++) set(r, x, y + dy, z, B.JLOG);
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (hash(x, dx, dz) < 0.5) set(r, x + dx, y + th - 4, z + dz, B.JLEAVES); }
function cactus(r, x, y, z, s) { for (let dy = 0; dy < 2 + (s * 2 | 0); dy++) set(r, x, y + dy, z, B.CACTUS); }

function plantTrees(r, inside) {
  const CELL = 6;
  for (let gz = Math.floor(r.oz / CELL); gz < (r.oz + r.nz) / CELL; gz++) for (let gx = Math.floor(r.ox / CELL); gx < (r.ox + r.nx) / CELL; gx++) {
    const x = gx * CELL + (hash(gx, gz, 1) * (CELL - 2) | 0) + 1, z = gz * CELL + (hash(gx, gz, 2) * (CELL - 2) | 0) + 1;
    if (x < r.ox + 3 || z < r.oz + 3 || x >= r.ox + r.nx - 3 || z >= r.oz + r.nz - 3) continue;
    if (inside && !inside(x, z)) continue;
    const c = colIndex(r, x, z), bi = r.biome[c], top = r.ground[c], s = hash(gx, gz, 3), p = hash(gx, gz, 4);
    if (top < SEA + 1 || (r.flag[c] & (F.BOX | F.VILLAGE))) continue;
    if (get(r, x, top, z) === B.WATER || get(r, x, top + 1, z)) continue;
    const dens = (top > SEA + 24 ? 0.25 : 1) * (bi === BIOME.FOREST ? 0.42 : bi === BIOME.JUNGLE ? 0.95 : bi === BIOME.PLAINS ? 0.08 : bi === BIOME.SNOW ? 0.35 : bi === BIOME.DESERT ? 0.16 : 0);
    if (p > dens) continue;
    if (bi === BIOME.JUNGLE) jungleTree(r, x, top + 1, z, s); else if (bi === BIOME.SNOW) { if (top < SEA + 40) spruce(r, x, top + 1, z, s); }
    else if (bi === BIOME.DESERT) cactus(r, x, top + 1, z, s); else oak(r, x, top + 1, z, s);
  }
}

// ---------------------------------------------------------------- village (a few houses, paths, a farm and a well)
function house(r, x0, y, z0, w, d) {
  for (let x = x0; x < x0 + w; x++) for (let z = z0; z < z0 + d; z++) {
    set(r, x, y, z, B.COBBLE); const edge = x === x0 || x === x0 + w - 1 || z === z0 || z === z0 + d - 1, corner = (x === x0 || x === x0 + w - 1) && (z === z0 || z === z0 + d - 1);
    for (let dy = 1; dy <= 3; dy++) set(r, x, y + dy, z, edge ? (corner ? B.LOG : dy === 2 && (x - x0 + z - z0) % 2 === 1 ? B.GLASS : B.PLANKS) : B.AIR);
  }
  // door gap on the +z side
  set(r, x0 + (w >> 1), y + 1, z0 + d - 1, B.AIR); set(r, x0 + (w >> 1), y + 2, z0 + d - 1, B.AIR);
  // stepped roof
  for (let k = 0; k <= Math.ceil(w / 2); k++) for (let z = z0 - 1; z <= z0 + d; z++) { set(r, x0 - 1 + k, y + 4 + k, z, B.ROOF); set(r, x0 + w - k, y + 4 + k, z, B.ROOF); }
}
function buildVillage(r) {
  const { x: vx, z: vz } = VILLAGE, y = SEA + 4;
  // flatten a patch
  for (let x = vx - 22; x <= vx + 22; x++) for (let z = vz - 22; z <= vz + 22; z++) {
    const c = colIndex(r, x, z), k = sstep(22, 15, Math.max(Math.abs(x - vx), Math.abs(z - vz)));
    if (k <= 0) continue; r.flag[c] |= F.VILLAGE;
    const top = Math.round(lerp(r.ground[c], y, k));
    for (let yy = 2; yy < r.ny; yy++) if (yy <= top) { if (get(r, x, yy, z) === B.AIR || get(r, x, yy, z) === B.WATER) set(r, x, yy, z, B.DIRT); } else set(r, x, yy, z, B.AIR);
    set(r, x, top, z, B.GRASS); r.ground[c] = top; r.biome[c] = BIOME.PLAINS;
  }
  for (let x = vx - 16; x <= vx + 16; x++) set(r, x, y, vz, B.PATH);
  for (let z = vz - 16; z <= vz + 16; z++) set(r, vx, y, z, B.PATH);
  house(r, vx - 13, y, vz - 10, 7, 6); house(r, vx + 4, y, vz - 11, 6, 6); house(r, vx - 12, y, vz + 4, 6, 7); house(r, vx + 5, y, vz + 5, 8, 6);
  // the well
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { set(r, vx + 2 + dx, y + 1, vz + 2 + dz, dx || dz ? B.COBBLE : B.WATER); set(r, vx + 2 + dx, y + 4, vz + 2 + dz, B.ROOF); }
  for (const [dx, dz] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) for (let dy = 2; dy <= 3; dy++) set(r, vx + 2 + dx, y + dy, vz + 2 + dz, B.LOG);
  // the farm
  for (let x = vx + 14; x <= vx + 20; x++) for (let z = vz - 6; z <= vz - 1; z++) set(r, x, y + 1, z, z === vz - 4 ? B.WATER : B.CROP);
}

// ---------------------------------------------------------------- the 3D-noise box (cliff with caves and an overhang)
export function boxDensity(x, y, z, hHF) {
  const ex = Math.min(x - BOX.x0, BOX.x1 - 1 - x, z - BOX.z0) / 5, taper = clamp(ex);
  if (y <= 1) return 1;
  let d = (hHF - y) / 12 + 0.45 * perlin3(x / 10, y / 7, z / 10, 7) * taper;
  // cheese caves (pockets) and spaghetti caves (tunnels) below the surface
  const deep = sstep(hHF - 3, hHF - 7, y) * taper;
  const cheese = perlin3(x / 8, y / 6, z / 8, 8) - 0.16; if (cheese > 0) d -= cheese * 12 * deep;
  const sp = 0.16 - Math.abs(perlin3(x / 12, y / 6, z / 12, 9)) - 0.5 * Math.abs(perlin3(x / 12 + 31, y / 6, z / 12, 10)); if (sp > 0) d -= sp * 30 * deep;
  // an overhanging lip: the top of the high west side sticks out over the steep east slope
  const lip = Math.exp(-(((y - 67.5) / 1.8) ** 2)) * sstep(-311, -315, x) * sstep(-334, -328, x) * taper;
  d += lip * 2.2;
  return d;
}

// ---------------------------------------------------------------- build MAIN
function buildMain() {
  const r = MAIN, t0 = Date.now();
  for (let z = r.oz; z < r.oz + r.nz; z++) for (let x = r.ox; x < r.ox + r.nx; x++) {
    const c = colIndex(r, x, z), fl = fields(x, z);
    // the area beyond the frontier (centre C = (−275, −275)): a screen-aligned design so the generation steps show ocean
    // (top-left), jungle (left), the cliff hill (the 3D-noise box), plains + village (right of centre), desert (right),
    // snowy mountains (top-right). U = x − z (screen right), V = (x + z)/2 + 275 (screen down).
    { const U = x - z, V = (x + z) / 2 + 275, dc = Math.hypot(U / 1.5, V + 40), k = sstep(330, 240, dc);
      if (k > 0) {
        const n1 = perlin2(x / 55, z / 55, 12) * 0.22, n2 = perlin2(x / 45, z / 45, 13) * 0.25;
        const ocean = sstep(-10, -60, U + n1 * 60) * sstep(-105, -140, V + n2 * 40), snowy = sstep(25, 70, U) * sstep(-125, -165, V);
        const Un = U + perlin2(x / 30, z / 30, 21) * 38, hot = Math.max(sstep(-50, -95, Un) * sstep(-115, -85, V), sstep(62, 88, Un) * sstep(-135, -105, V)), wet = sstep(-20, -70, Un), dry = sstep(58, 86, Un);
        fl.cont = lerp(fl.cont, 0.3 + n1 - ocean * 1.0, k);
        fl.temp = lerp(fl.temp, 0.02 + hot * 0.5 - snowy * 0.65 + n1 * 0.3, k);
        fl.hum = lerp(fl.hum, 0.05 + wet * 0.45 - dry * 0.55 + n2 * 0.3, k);
        fl.ero = lerp(fl.ero, 0.15 - snowy * 0.7 + n2 * 0.6, k);
      } }
    { const ds = Math.hypot(x, z + 40), k = sstep(200, 140, ds); fl.temp = lerp(fl.temp, 0.02, k); fl.hum = lerp(fl.hum, fl.hum * 0.6 + 0.02, k); fl.cont = lerp(fl.cont, Math.max(fl.cont, 0.3), k); }
    let { hLO, h } = heights(fl, x, z);
    h = spawnShape(x, z, h);
    // the hill for the 3D-noise box: a ridge that is high on its west side and drops steeply to the east
    { const dh = Math.hypot((x - BOX.x0 - 18) / 1.3, z - BOX.z0 - 16); if (dh < 48) { const prof = SEA + 10 + 30 * sstep(BOX.x1 - 2, BOX.x0 + 16, x + perlin2(z / 10, 1, 18) * 4) + fbm2(x / 9, z / 9, 2, 18) * 2;
      h = Math.max(h, lerp(h, prof, sstep(48, 30, dh))); } }
    const bi = RIVER(x, z) ? BIOME.RIVER : biomeOf(fl, h, x, z);
    r.cont[c] = fl.cont; r.temp[c] = fl.temp; r.hum[c] = fl.hum; r.ero[c] = fl.ero; r.biome[c] = bi;
    r.hLO[c] = Math.round(hLO); r.hHF[c] = Math.round(h);
    if (x >= BOX.x0 && x < BOX.x1 && z >= BOX.z0 && z < BOX.z1) r.flag[c] |= F.BOX;
    let dens = null;
    if (r.flag[c] & F.BOX) { const hh = h; dens = (y) => boxDensity(x, y, z, hh) > 0; }
    r.ground[c] = fillColumn(r, x, z, h, bi, dens);
    if (dens) { let top = 0; for (let y = r.ny - 1; y > 0; y--) if (get(r, x, y, z) && get(r, x, y, z) !== B.WATER) { top = y; break; } r.ground[c] = top;
      // surface on the 3D terrain: grass on exposed tops
      for (let y = r.ny - 2, open = true; y >= 2; y--) { const b = get(r, x, y, z); if (!b) continue; if (b === B.STONE && open && !get(r, x, y + 1, z)) { set(r, x, y, z, B.GRASS); if (get(r, x, y - 1, z) === B.STONE) set(r, x, y - 1, z, B.DIRT); } open = false; } }
  }
  // the tunnel through the mountain and the shelf in front of it
  for (let z = TUNNEL.z0; z <= TUNNEL.z1; z++) for (let x = TUNNEL.x0; x <= TUNNEL.x1; x++) { for (let y = TUNNEL.y0; y <= TUNNEL.y1; y++) set(r, x, y, z, B.AIR); set(r, x, TUNNEL.y0 - 1, z, B.STONE); }
  // torches would be nice, but the mouth light is enough; the ledge: grass, nothing above it
  for (let z = -4; z < TUNNEL.z0; z++) for (let x = -6; x <= 6; x++) { for (let y = CLIFF_Y + 1; y < r.ny; y++) set(r, x, y, z, B.AIR); set(r, x, CLIFF_Y, z, B.GRASS); set(r, x, CLIFF_Y - 1, z, B.DIRT); }
  buildVillage(r);
  plantTrees(r, (x, z) => !(Math.abs(x) < 14 && z > -9 && z < 34));
  // per-column top (incl. features) and the global max
  let mx = 0;
  for (let z = r.oz; z < r.oz + r.nz; z++) for (let x = r.ox; x < r.ox + r.nx; x++) { const c = colIndex(r, x, z); let top = 0; for (let y = r.ny - 1; y >= 0; y--) if (r.vox[vi(r, x, y, z)]) { top = y; break; } r.top[c] = top; if (top > mx) mx = top; }
  r.maxTop = mx;
  return Date.now() - t0;
}

// ---------------------------------------------------------------- FAR (old-version Far Lands)
export const FAR_X = -12550821;                      // world x of the Far Lands edge (lx = 0)
export const FAR = makeRegion(-200, -170, 330, 340, 128);
function buildFar() {
  const r = FAR, t0 = Date.now(), O = 9000;
  for (let z = r.oz; z < r.oz + r.nz; z++) for (let x = r.ox; x < r.ox + r.nx; x++) {
    const c = colIndex(r, x, z), fl = fields(x, z, O); fl.cont = Math.max(fl.cont, 0.35); fl.temp = 0; fl.hum = 0.1;
    const { h } = heights(fl, x, z, O), hh = Math.min(SEA + 12, h);
    if (x >= 0) { r.biome[c] = BIOME.FOREST; r.ground[c] = fillColumn(r, x, z, hh, BIOME.FOREST); continue; }
    // the broken land (an illustration of the old-version Far Lands): a towering cliff at lx = 0, then a lattice of walls
    // with long horizontal tunnels and vertical slots, strata of dirt/stone, grass on every ledge
    r.biome[c] = BIOME.PLAINS;
    let top = 0;
    const zz = ((z % 14) + 14) % 14, slot = zz >= 10;                                   // vertical slots between walls (along x)
    for (let y = 2; y < 120; y++) {
      const band = (((y + 0.35 * z + 4 * Math.sin(x / 13)) % 15) + 15) % 15;            // tilted horizontal tunnels
      const tunnel = band < 4.2 && y > 34 + 6 * Math.sin(z / 9);
      const pit = x < -6 && (((x % 23) + 23) % 23) < 5 && y > 30 && y < 96;           // tunnels running into the face
      const keep = !(tunnel || (slot && y > 40 + 10 * Math.sin(x / 7 + z)) || (pit && band < 8));
      if (keep) { set(r, x, y, z, ((y >> 3) & 1) && x > -40 ? B.DIRT : B.STONE); top = y; }
    }
    for (let y = 0; y < 2; y++) set(r, x, y, z, B.BEDROCK);
    for (let y = 2; y <= SEA; y++) if (!get(r, x, y, z)) set(r, x, y, z, B.WATER);
    for (let y = 3; y < 120; y++) { const b0 = get(r, x, y, z); if ((b0 === B.STONE || b0 === B.DIRT) && !get(r, x, y + 1, z)) { set(r, x, y, z, B.GRASS); if (get(r, x, y - 1, z) === B.STONE) set(r, x, y - 1, z, B.DIRT); } }
    r.ground[c] = top;
  }
  plantTrees(r, (x, z) => x > 30 || z > 70 || z < -50);
  let mx = 0;
  for (let z = r.oz; z < r.oz + r.nz; z++) for (let x = r.ox; x < r.ox + r.nx; x++) { const c = colIndex(r, x, z); let top = 0; for (let y = r.ny - 1; y >= 0; y--) if (r.vox[vi(r, x, y, z)]) { top = y; break; } r.top[c] = top; if (top > mx) mx = top; }
  r.maxTop = mx;
  return Date.now() - t0;
}

export const BUILD_MS = { main: buildMain(), far: buildFar() };
{ let m = 0; for (let z = BOX.z0; z < BOX.z1; z++) for (let x = BOX.x0; x < BOX.x1; x++) m = Math.max(m, MAIN.hHF[colIndex(MAIN, x, z)]); BOX.ghostTop = m + 5; }
export { vi, get };
