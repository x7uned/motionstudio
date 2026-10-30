// «The Minecraft ghast's cry came from a real cat» — the block world of the film (an illustration in the spirit of the
// game: our own textures, layout and creatures; no Mojang textures, names or logos). Two voxel regions joined by portals:
//   NETHER — a netherrack cave: a lava lake in the middle (the ghast floats above it), cave walls rising behind, glowstone
//            on the walls, and an obsidian portal on the right shore that lights up on "Halloween update";
//   STUDIO — a small 2010 home studio (a cut-away room on a lawn): plank floor, two back walls, a desk with a monitor and a
//            synth keyboard, a chair, a stool with the sleeping cat, a microphone on a stand, a window, a bookshelf, a rug,
//            and a lit portal on the left wall (the way back to the Nether).
// The camera crosses between them only through a portal (render.mjs: zoom into the purple, a dithered portal swirl covers
// the switch, zoom out of the other portal). Deterministic.
import { perlin2, fbm2, hash } from "./noise.mjs";

export const B = { AIR: 0, NRACK: 1, NRACK2: 2, LAVA: 3, OBSIDIAN: 4, PORTAL: 5, GLOW: 6, SOUL: 7, MAGMA: 8,
  PLANKS: 9, PLANKS_D: 10, WALL: 11, WALL2: 12, RUG: 13, GLASS: 14, GRASS: 15, DIRT: 16, STONE: 17, LOG: 18, LEAVES: 19,
  BOOKS: 20, BLACK: 21, IRON: 22, QUARTZ: 23 };
export const EMISSIVE = new Set([B.LAVA, B.PORTAL, B.GLOW, B.MAGMA]);
export const GROUND = 10;
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

function makeRegion(ox, oz, nx, nz, ny) {
  return { ox, oz, nx, nz, ny, vox: new Uint8Array(nx * nz * ny), grp: new Uint8Array(nx * nz * ny), top: new Int16Array(nx * nz), maxTop: 0 };
}
const vi = (r, x, y, z) => (y * r.nz + (z - r.oz)) * r.nx + (x - r.ox);
function set(r, x, y, z, b, g = 0) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return; const i = vi(r, x, y, z); r.vox[i] = b; r.grp[i] = g; }
function get(r, x, y, z) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return 0; return r.vox[vi(r, x, y, z)]; }
function finish(r) {
  for (let z = 0; z < r.nz; z++) for (let x = 0; x < r.nx; x++) { let h = 0; for (let y = r.ny - 1; y >= 0; y--) if (r.vox[(y * r.nz + z) * r.nx + x]) { h = y + 1; break; } r.top[z * r.nx + x] = h; if (h > r.maxTop) r.maxTop = h; }
}
export const GRP = { PORTAL_N: 1 };

// ================================================================ the Nether
export const NR = makeRegion(-44, -44, 92, 92, 52);
export const LAKE = { x: 0, z: 0, r: 13 };
export const GHAST = { x: 0.5, y: 21, z: 0.5 };                       // the ghast's body centre (a 4-block cube)
export const PORTAL_N = { x: 6, z0: -3, y0: GROUND + 1 };             // frame in the plane x = 6, z −3..1, y 11..16, on a rock in the lava
const lakeD = (x, z) => Math.hypot(x - LAKE.x, (z - LAKE.z) * 1.1) - (LAKE.r + 3.2 * perlin2(x / 9, z / 9, 3));
const wallH = (x, z) => { const back = Math.max(-26 - x, -26 - z, 0) + Math.max(0, -20 - Math.min(x, z)) * 0.4; return back > 0 ? Math.min(46, GROUND + 3 + back * 2.4 + 6 * fbm2(x / 7, z / 7, 3, 5)) : 0; };
for (let z = NR.oz; z < NR.oz + NR.nz; z++) for (let x = NR.ox; x < NR.ox + NR.nx; x++) {
  const d = lakeD(x, z), w = wallH(x, z);
  let h = GROUND + (d > 2 ? Math.round(1.4 * clamp(perlin2(x / 6, z / 6, 7) + 0.1, 0, 1) * clamp((d - 2) / 6)) : 0);
  if (w) h = Math.max(h, Math.round(w));
  if (d < 0) { // the lake: lava surface at y 9, a darker rim of magma blocks
    for (let y = 0; y <= GROUND - 1; y++) set(NR, x, y, z, y === GROUND - 1 ? B.LAVA : B.NRACK2);
    continue;
  }
  for (let y = 0; y <= h; y++) { const s = hash(x, y, z); set(NR, x, y, z, y === h && d < 1.6 ? B.MAGMA : s < 0.12 ? B.NRACK2 : (y === h && hash(x, z, 31) < 0.06 && !w) ? B.SOUL : B.NRACK); }
}
// glowstone clusters hanging on the cave walls
for (const [x, z, y] of [[-30, -6, 30], [-12, -31, 33], [-34, -26, 40], [4, -33, 27], [-31, 10, 25]]) {
  for (let k = 0; k < 14; k++) { const dx = Math.round((hash(x, k, 1) - 0.5) * 4), dy = Math.round((hash(x, k, 2) - 0.5) * 3), dz = Math.round((hash(x, k, 3) - 0.5) * 4); if (get(NR, x + dx, y + dy, z + dz) || get(NR, x + dx - 1, y + dy, z + dz) || get(NR, x + dx, y + dy, z + dz - 1)) set(NR, x + dx, y + dy, z + dz, B.GLOW); }
}
// a few netherrack spikes around the shore (depth)
for (const [x, z, hh] of [[-14, 16, 4], [18, 9, 3], [-19, -9, 6], [9, -19, 5], [21, -2, 2]]) for (let y = GROUND + 1; y < GROUND + 1 + hh; y++) { const rr = y < GROUND + 1 + hh - 2 ? 1 : 0; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) if (Math.abs(dx) + Math.abs(dz) <= rr) set(NR, x + dx, y, z + dz, hash(x + dx, y, z + dz) < 0.2 ? B.NRACK2 : B.NRACK); }
// the portal: obsidian frame 5 wide × 6 tall in the plane x = PORTAL_N.x, purple inside (group: lights up on cue)
{ const { x, z0, y0 } = PORTAL_N; for (let z = z0 - 1; z <= z0 + 5; z++) for (let xx = x - 1; xx <= x + 1; xx++) for (let y = 0; y <= GROUND; y++) set(NR, xx, y, z, (xx + z + y) % 5 ? B.NRACK : B.NRACK2); // a rock island
  for (let dz = 0; dz < 5; dz++) for (let dy = 0; dy < 6; dy++) { const edge = dz === 0 || dz === 4 || dy === 0 || dy === 5; set(NR, x, y0 + dy, z0 + dz, edge ? B.OBSIDIAN : B.PORTAL, edge ? 0 : GRP.PORTAL_N); }
  for (let xx = x + 1; xx <= x + 3; xx++) for (let z = z0; z <= z0 + 4; z++) for (let y = GROUND + 1; y <= GROUND + 8; y++) set(NR, xx, y, z, 0); }
finish(NR);
/** the portal's visible (+x) face centre and size, for the camera and the swirl */
export const PORTAL_N_FACE = { x: PORTAL_N.x + 1, y: PORTAL_N.y0 + 3, z: PORTAL_N.z0 + 2.5 };

// ================================================================ the studio (2010, a home studio on a lawn)
export const SR = makeRegion(0, 0, 30, 30, 26);
export const ROOM = { x0: 7, z0: 7, x1: 17, z1: 17, h: 6 };            // walls in the planes x = 7 (left on screen) and z = 7 (right)
export const PORTAL_S = { x: 7, z0: 9, y0: GROUND + 1 };              // on the left wall, z 9..13
export const DESK = { x0: 10, x1: 14, z0: 8, z1: 9 };                 // two blocks deep, along the right wall
export const CHAIR = { x: 11.4, z: 10.7 };                             // the desk chair (empty)
export const CAT = { x: 13.45, y: GROUND + 2, z: 9.05, s: 1.7 };      // the cat asleep on the desk (belly level), drawn ×1.7
export const MIC = { x: 14.62, z: 8.42, y: GROUND + 2, top: GROUND + 2.95 }; // a desk stand right by the cat's head; capsule at `top`
export const MONITOR = { x: 11.0, y: GROUND + 2, z: 8.45 };
for (let z = SR.oz; z < SR.oz + SR.nz; z++) for (let x = SR.ox; x < SR.ox + SR.nx; x++) {
  const inRoom = x >= ROOM.x0 && x <= ROOM.x1 && z >= ROOM.z0 && z <= ROOM.z1;
  for (let y = 0; y <= GROUND; y++) set(SR, x, y, z, y === GROUND ? (inRoom ? B.PLANKS : B.GRASS) : y >= GROUND - 2 ? B.DIRT : B.STONE);
}
// rug
for (let z = 11; z <= 16; z++) for (let x = 10; x <= 16; x++) set(SR, x, GROUND, z, (x === 10 || x === 16 || z === 11 || z === 16) ? B.WALL2 : B.RUG);
// walls (8 high), a window on the right wall, a wood trim at the bottom
for (let y = GROUND + 1; y <= GROUND + ROOM.h; y++) {
  for (let x = ROOM.x0; x <= ROOM.x1; x++) set(SR, x, y, ROOM.z0, y === GROUND + 1 ? B.PLANKS_D : B.WALL);
  for (let z = ROOM.z0; z <= ROOM.z1; z++) set(SR, ROOM.x0, y, z, y === GROUND + 1 ? B.PLANKS_D : B.WALL);
}
for (let x = 14; x <= 16; x++) for (let y = GROUND + 3; y <= GROUND + 5; y++) set(SR, x, y, ROOM.z0, B.GLASS);
// the portal on the left wall (always lit): obsidian 5 wide × 6 tall
{ const { x, z0, y0 } = PORTAL_S; for (let dz = 0; dz < 5; dz++) for (let dy = 0; dy < 6; dy++) { const edge = dz === 0 || dz === 4 || dy === 0 || dy === 5; set(SR, x, y0 + dy, z0 + dz, edge ? B.OBSIDIAN : B.PORTAL); } }
// bookshelf on the left wall, near the corner past the portal
for (let z = 15; z <= 16; z++) for (let y = GROUND + 1; y <= GROUND + 3; y++) set(SR, ROOM.x0 + 1, y, z, B.BOOKS);
// desk: dark planks, top at y 12, along the right wall (x 10..14, z 8..9)
for (let x = DESK.x0; x <= DESK.x1; x++) for (let z = DESK.z0; z <= DESK.z1; z++) set(SR, x, GROUND + 1, z, B.PLANKS_D);
// trees outside on the lawn (front corners only, they never cover the room)
function tree(x, z, th = 5) { for (let y = GROUND + 1; y <= GROUND + th; y++) set(SR, x, y, z, B.LOG); for (let y = GROUND + th - 2; y <= GROUND + th + 1; y++) { const rr = y >= GROUND + th ? 1 : 2; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && hash(x + dx, z + dz, y) < 0.6) continue; if (!get(SR, x + dx, y, z + dz)) set(SR, x + dx, y, z + dz, B.LEAVES); } } }
tree(3, 22); tree(22, 3, 6); tree(24, 25, 4);
finish(SR);
export const PORTAL_S_FACE = { x: PORTAL_S.x + 1, y: PORTAL_S.y0 + 3, z: PORTAL_S.z0 + 2.5 };

// ---------------------------------------------------------------- what lies beyond each region's edge
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const HAZE = [hx("#1A0608"), hx("#240A0C"), hx("#2E0E10")], LAVA_O = [hx("#E2531A"), hx("#F07A22"), hx("#C83A14")];
export function netherOutside(S) {
  return (out, wx, wz, bs, X, Y) => {
    if (wx < NR.ox || wz < NR.oz) { const k = hash(Math.floor(wx / 3), Math.floor(wz / 3), 7); const c = HAZE[k < 0.3 ? 0 : k < 0.7 ? 1 : 2]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; return; }
    const ix = Math.floor(wx), iz = Math.floor(wz), k = 0.5 + 0.5 * Math.sin(S.t * 1.7 + hash(ix, iz, 8) * 6.28), c = LAVA_O[k < 0.33 ? 2 : k < 0.75 ? 0 : 1];
    out[0] = c[0]; out[1] = c[1]; out[2] = c[2];
  };
}
const GR = [hx("#4A8C32"), hx("#58A03A"), hx("#3D7A2A")];
export function studioOutside() { return (out, wx, wz) => { const k = hash(Math.floor(wx), Math.floor(wz), 9), c = GR[k < 0.6 ? 0 : k < 0.85 ? 1 : 2]; out[0] = c[0]; out[1] = c[1]; out[2] = c[2]; }; }
