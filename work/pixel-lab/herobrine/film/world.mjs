// Herobrine film — the one block world of the film (our own generator, textures and layout in the spirit of the game;
// no Mojang assets, names or logos in the world). One voxel region H, compatible with the Minecraft film's engine:
//   the CLEARING — where the player stands in the fog, looking north at a RIDGE where the figure appears;
//   the HILL     — a mound with a perfectly straight 2×2 tunnel dug into its east side;
//   the LAKE     — with three little sand pyramids sticking out of the water;
//   the DEAD TREES — logs with no leaves;
//   the HOUSE    — a small plank house; its camera-facing walls and roof belong to group 1, so the iso view can cut
//                  them away and show the painting of "Herobrine" hidden on the inside back wall.
import { perlin2, fbm2, hash } from "./noise.mjs";

export const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, SNOW: 5, WATER: 6, LOG: 7, LEAVES: 8, BEDROCK: 9, COAL: 10, IRON: 11, DIAMOND: 12, GRAVEL: 13,
  PLANKS: 14, COBBLE: 15, PATH: 16, GLASS: 17, JLEAVES: 18, CACTUS: 19, SLEAVES: 20, SANDSTONE: 21, CROP: 22, ROOF: 23, JLOG: 24, SLOG: 25, CLAY: 26, GHOST: 27, PAINTING: 28 };
export const FEATURE = new Uint8Array(32); for (const k of [B.LOG, B.LEAVES]) FEATURE[k] = 1; for (const k of [B.PLANKS, B.COBBLE, B.GLASS, B.ROOF]) FEATURE[k] = 2;
export const ORE = new Uint8Array(32); ORE[B.COAL] = ORE[B.IRON] = ORE[B.DIAMOND] = 1;
export const SURFACE = new Uint8Array(32); for (const k of [B.GRASS, B.SAND, B.DIRT, B.GRAVEL]) SURFACE[k] = 1;
export const SEA = 30;
export const BIOME = { PLAINS: 0, FOREST: 1, DESERT: 2, JUNGLE: 3, SNOW: 4, MOUNTAIN: 5, OCEAN: 6, BEACH: 7, RIVER: 8 };
export const F = { DEMO: 1, BOX: 2, VILLAGE: 4 };
export const BOX = { x0: 1e6, x1: 1e6, z0: 1e6, z1: 1e6, zc: 1e6, y1: 0, cutY: 0, ghostTop: -1 };   // unused here
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k;
const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };

function makeRegion(ox, oz, nx, nz, ny) {
  const N = nx * nz;
  return { ox, oz, nx, nz, ny, vox: new Uint8Array(nx * nz * ny), grp: new Uint8Array(nx * nz * ny), top: new Int16Array(N), ground: new Int16Array(N), hLO: new Int16Array(N), hHF: new Int16Array(N),
    biome: new Uint8Array(N).fill(BIOME.FOREST), flag: new Uint8Array(N), cont: new Float32Array(N), temp: new Float32Array(N), hum: new Float32Array(N), ero: new Float32Array(N), maxTop: 0 };
}
const vi = (r, x, y, z) => (y * r.nz + (z - r.oz)) * r.nx + (x - r.ox);
const inR = (r, x, y, z) => !(x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny);
export function set(r, x, y, z, b, g = 0) { if (!inR(r, x, y, z)) return; const i = vi(r, x, y, z); r.vox[i] = b; r.grp[i] = g; }
export function get(r, x, y, z) { if (!inR(r, x, y, z)) return 0; return r.vox[vi(r, x, y, z)]; }
export const colIndex = (r, x, z) => (z - r.oz) * r.nx + (x - r.ox);

export const H = makeRegion(-170, -170, 340, 340, 80);
export const MAIN = H;                                        // the engine's name for the region

// ---------------------------------------------------------------- landmarks
export const CLEARING = { x: 0, z: 14 };                      // the player stands here, looking north (−z)
export const RIDGE = { x: -3, z: -22 };                       // the figure appears on this rise
export const HILL = { x: -64, z: -26, r: 20, h: 15 };         // the tunnel hill
export const TUNNEL = { x0: -50, x1: -63, y0: 0, z: -26 };    // 2×2 tunnel dug west from the hill's east face (y set below)
export const LAKE = { x: 52, z: -46, r: 32 };
export const PYRAMIDS = [[44, -50], [58, -38], [62, -58]];
export const DEAD = { x: 34, z: 34 };
export const HOUSE = { x0: -40, x1: -32, z0: 26, z1: 32 };   // inclusive footprint
export const BASE = 38;

// ---------------------------------------------------------------- terrain
function baseH(x, z) {
  let h = BASE + fbm2(x / 60, z / 60, 4, 1) * 7 + fbm2(x / 18, z / 18, 2, 2) * 1.6;
  // the ridge where the figure stands: a soft rise across the view
  h += 5.5 * Math.exp(-((z - RIDGE.z) ** 2) / 90) * sstep(70, 20, Math.abs(x - RIDGE.x));
  // the clearing and the walk towards the ridge are flat (no steps in front of the camera)
  { const d = Math.hypot(x - CLEARING.x, z - CLEARING.z); h = lerp(h, BASE, sstep(16, 7, d)); }
  { const inCorr = Math.max(Math.abs(x - CLEARING.x) - 7, RIDGE.z + 9 - z, z - CLEARING.z - 4); h = lerp(h, BASE, sstep(6, 0, inCorr)); }
  // the tunnel hill
  { const d = Math.hypot(x - HILL.x, z - HILL.z); if (d < HILL.r) h = Math.max(h, BASE + 1 + HILL.h * Math.pow(1 - d / HILL.r, 0.9)); }
  // a steep east face on the hill where the tunnel goes in
  if (x <= TUNNEL.x0 && x >= TUNNEL.x0 - 12 && Math.abs(z - (TUNNEL.z + 0.5)) <= 7.5) h = Math.max(h, BASE + 8 + (TUNNEL.x0 - x) * 0.5 - Math.max(0, Math.abs(z - TUNNEL.z - 0.5) - 5));
  // a flat apron in front of the face, level with the tunnel floor
  if (x > TUNNEL.x0 && x <= TUNNEL.x0 + 9 && Math.abs(z - (TUNNEL.z + 0.5)) <= 6.5) h = Math.min(h, BASE + 1);
  // the lake basin
  { const d = Math.hypot((x - LAKE.x) / 1.25, z - LAKE.z); if (d < LAKE.r + 8) h = lerp(h, SEA - 5 + d * 0.12, sstep(LAKE.r + 8, LAKE.r - 6, d)); }
  // the house plot is flat
  if (x >= HOUSE.x0 - 4 && x <= HOUSE.x1 + 4 && z >= HOUSE.z0 - 4 && z <= HOUSE.z1 + 4) h = BASE + 1;
  return h;
}
for (let z = H.oz; z < H.oz + H.nz; z++) for (let x = H.ox; x < H.ox + H.nx; x++) {
  const h = Math.round(baseH(x, z)), c = colIndex(H, x, z), nearLake = Math.hypot((x - LAKE.x) / 1.25, z - LAKE.z) < LAKE.r + 4;
  for (let y = 0; y <= h; y++) set(H, x, y, z, y === 0 ? B.BEDROCK : y < h - 3 ? B.STONE : y < h ? (nearLake ? B.SAND : B.DIRT) : (nearLake && h <= SEA + 1 ? B.SAND : B.GRASS));
  for (let y = h + 1; y <= SEA; y++) set(H, x, y, z, B.WATER);
  H.ground[c] = h; H.hHF[c] = h; H.hLO[c] = h;
}
const gnd = (x, z) => H.ground[colIndex(H, x, z)];
// sand pyramids in the lake: 5×5, 3×3, 1×1 steps rising out of the water
for (const [px, pz] of PYRAMIDS) for (let s = 0; s < 3; s++) { const hw = 2 - s, y = SEA + 1 + s; for (let dz = -hw; dz <= hw; dz++) for (let dx = -hw; dx <= hw; dx++) { for (let yy = gnd(px + dx, pz + dz) + 1; yy <= y; yy++) set(H, px + dx, yy, pz + dz, B.SAND); } }
// the tunnel: 2 wide (z, z+1), 2 high, straight into the hill from its east face
{ const y0 = BASE + 2; TUNNEL.y0 = y0; for (let x = TUNNEL.x0; x >= TUNNEL.x1; x--) for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) set(H, x, y0 + dy, TUNNEL.z + dz, B.AIR); }
// trees: oaks everywhere except the clearing, the lake, the hill top, the house plot and the dead-tree glade
function oak(x, z, s) {
  const h = gnd(x, z); if (h <= SEA) return; const th = 4 + (s * 3 | 0);
  for (let y = h + 1; y <= h + th; y++) set(H, x, y, z, B.LOG);
  for (let y = h + th - 2; y <= h + th + 1; y++) { const rr = y >= h + th ? 1 : 2; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && hash(x + dx, z + dz, y) < 0.55) continue; if (!get(H, x + dx, y, z + dz)) set(H, x + dx, y, z + dz, B.LEAVES); } }
}
function deadTree(x, z, s) { const h = gnd(x, z), th = 5 + (s * 3 | 0); for (let y = h + 1; y <= h + th; y++) set(H, x, y, z, B.LOG); if (s > 0.4) { set(H, x + 1, h + th - 1, z, B.LOG); set(H, x + 2, h + th, z, B.LOG); } if (s < 0.6) { set(H, x, h + th - 2, z - 1, B.LOG); set(H, x, h + th - 1, z - 2, B.LOG); } }
for (let z = H.oz + 3; z < H.oz + H.nz - 3; z++) for (let x = H.ox + 3; x < H.ox + H.nx - 3; x++) {
  const dC = Math.hypot(x - CLEARING.x, z - CLEARING.z), dL = Math.hypot((x - LAKE.x) / 1.25, z - LAKE.z), dH = Math.hypot(x - HILL.x, z - HILL.z), dD = Math.hypot(x - DEAD.x, z - DEAD.z);
  const view = Math.abs(x - (CLEARING.x + (RIDGE.x - CLEARING.x) * clamp((CLEARING.z - z) / (CLEARING.z - RIDGE.z)))) < 5 && z < CLEARING.z && z > RIDGE.z;   // a gap in the trees to the ridge
  const house = x >= HOUSE.x0 - 5 && x <= HOUSE.x1 + 5 && z >= HOUSE.z0 - 5 && z <= HOUSE.z1 + 5, ex = x - TUNNEL.x0, ez = z - TUNNEL.z, tunnelFace = (ex > -2 && ex < 12 && Math.abs(ez) < 6) || (Math.abs(ex - ez) < 9 && ex > -3 && ex < 30);   // the face and the iso line of sight to it
  if (dC < 11 || dL < LAKE.r + 2 || dH < HILL.r * 0.75 || house || view || tunnelFace) continue;
  if (dD < 13) { if (hash(x, z, 31) < 0.06) deadTree(x, z, hash(x, z, 32)); continue; }
  const dens = 0.035 + 0.04 * clamp(perlin2(x / 26, z / 26, 9) + 0.3);
  if (hash(x, z, 4) < dens) oak(x, z, hash(x, z, 5));
}
// the house: planks walls 4 high, a roof, a door and a window; the walls facing the iso camera (+x, +z) and the roof are
// group 1 (cut away on cue); the painting of the figure on the inside of the back (−z) wall
{
  const { x0, x1, z0, z1 } = HOUSE, y0 = BASE + 2, yTop = y0 + 3;
  for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) { set(H, x, y0 - 1, z, B.PLANKS); for (let y = y0; y <= yTop; y++) { const wall = x === x0 || x === x1 || z === z0 || z === z1; if (!wall) continue; const near = x === x1 || z === z1; set(H, x, y, z, B.PLANKS, near ? 1 : 0); } }
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let z = z0 - 1; z <= z1 + 1; z++) set(H, x, yTop + 1, z, B.ROOF, 1);
  set(H, x1, y0, z0 + 3, B.AIR); set(H, x1, y0 + 1, z0 + 3, B.AIR);                        // the door (east)
  set(H, x0 + 3, y0 + 1, z1, B.GLASS, 1); set(H, x0 + 4, y0 + 1, z1, B.GLASS, 1);            // a window (south)
  for (let x = x0 + 3; x <= x0 + 4; x++) for (let y = y0 + 1; y <= y0 + 2; y++) set(H, x, y, z0 + 1, B.PAINTING);   // the painting, hung inside the back wall
}
export const PAINTING_AT = { x: HOUSE.x0 + 3, y: BASE + 3, z: HOUSE.z0 + 1 };
// tops
for (let z = H.oz; z < H.oz + H.nz; z++) for (let x = H.ox; x < H.ox + H.nx; x++) { let h = 0; for (let y = H.ny - 1; y >= 0; y--) if (get(H, x, y, z)) { h = y; break; } H.top[colIndex(H, x, z)] = h; if (h > H.maxTop) H.maxTop = h; }
export const groundY = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z); if (!inR(H, ix, 0, iz)) return BASE + 1; return Math.max(gnd(ix, iz), SEA) + 1; };

// beyond the region (iso views): the same forest seen from above as a plane at the ground — crowns with a shadow
export function outsideColor(out, wx, wz, bs, X, Y, grass, leaves, leavesD) {
  const ix = Math.floor(wx), iz = Math.floor(wz), cx = Math.floor(ix / 5), cz = Math.floor(iz / 5);
  let col = grass;
  const hasTree = hash(cx, cz, 91) < 0.55, tx = cx * 5 + 1 + Math.floor(hash(cx, cz, 92) * 3), tz = cz * 5 + 1 + Math.floor(hash(cx, cz, 93) * 3);
  if (hasTree) { const dx = wx - (tx + 0.5), dz = wz - (tz + 0.5); if (Math.max(Math.abs(dx + 1.4), Math.abs(dz + 1.4)) < 2.2) col = leaves; else if (Math.max(Math.abs(dx + 0.4), Math.abs(dz + 0.4)) < 2.4) col = leavesD; }
  const g = hash(ix, iz, 94); out[0] = col[0] * (g < 0.25 ? 0.92 : 1); out[1] = col[1] * (g < 0.25 ? 0.92 : 1); out[2] = col[2] * (g < 0.25 ? 0.92 : 1);
}
