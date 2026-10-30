// «Computers inside Minecraft» — the one block world of the film (an illustration in the spirit of the game: our own
// textures, layout and numbers; no Mojang assets, names or logos). One voxel region:
//   the LAB   — a smooth-stone floor in front (south-east) with five small exhibits in a column along −z:
//               E1 wire · E2 NOT (block + wall torch) · E3 AND (the classic two-torch gate) · E4 OR · E5 half adder,
//               then a row of adder copies that grows towards the computer;
//   the COMPUTER — a huge build behind (north-west): a lamp-screen wall facing the camera (+z), memory towers, buses
//               and long rows of logic modules with traces on top.
// Redstone parts that are not full blocks (dust, torches, levers, repeaters) are listed in PARTS and drawn as decals and
// small boxes by redstone.mjs; full blocks (lamps, wool, quartz…) live in the voxel grid. Deterministic.
import { perlin2, fbm2, hash } from "./noise.mjs";

export const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, LOG: 4, LEAVES: 5, SMOOTH: 6, QUARTZ: 7, CONCRETE: 8, LAMP: 9, LAMP_ON: 10,
  RSBLOCK: 11, IRON: 12, W_WHITE: 13, W_LGRAY: 14, W_GRAY: 15, W_BLUE: 16, W_CYAN: 17, W_RED: 18, W_LIME: 19, W_YELLOW: 20, W_ORANGE: 21,
  W_PURPLE: 22, GLASS: 23, BLACK: 24, PLANKS: 25 };
export const GROUND = 10;                        // grass top at y = 10; parts stand at y = 11
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);

function makeRegion(ox, oz, nx, nz, ny) {
  const N = nx * nz;
  return { ox, oz, nx, nz, ny, vox: new Uint8Array(nx * nz * ny), grp: new Uint8Array(nx * nz * ny), top: new Int16Array(N), maxTop: 0 };
}
const vi = (r, x, y, z) => (y * r.nz + (z - r.oz)) * r.nx + (x - r.ox);
export function set(r, x, y, z, b, g = 0) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return; const i = vi(r, x, y, z); r.vox[i] = b; r.grp[i] = g; }
export function get(r, x, y, z) { if (x < r.ox || z < r.oz || x >= r.ox + r.nx || z >= r.oz + r.nz || y < 0 || y >= r.ny) return 0; return r.vox[vi(r, x, y, z)]; }
export const colIndex = (r, x, z) => (z - r.oz) * r.nx + (x - r.ox);

export const RS = makeRegion(-192, -192, 288, 288, 60);

// ---------------------------------------------------------------- groups: blocks that appear on cue (dither, never a pop)
// 0 = always there; 1..8 adder copies; 9 the half-adder exhibit; 20+ computer sections that grow in on the zoom out
export const GRP = { E5: 9, COPY0: 1, COMP: 20 };

// ---------------------------------------------------------------- terrain
const BUILD = { x0: -150, x1: -14, z0: -170, z1: -34 };            // the computer's footprint
const LABF = { x0: -3, x1: 14, z0: -52, z1: 5 };                    // the lab floor
// a superflat world (where redstone builders usually work): flat grass everywhere, a few trees for depth
function groundH(x, z) { return GROUND; }
for (let z = RS.oz; z < RS.oz + RS.nz; z++) for (let x = RS.ox; x < RS.ox + RS.nx; x++) {
  const h = groundH(x, z);
  for (let y = 0; y <= h; y++) set(RS, x, y, z, y === h ? B.GRASS : y >= h - 2 ? B.DIRT : B.STONE);
}
// trees around (not on the build, the lab or the paths)
function tree(x, z) {
  const h = groundH(x, z), th = 4 + Math.floor(hash(x, z, 5) * 2);
  for (let y = h + 1; y <= h + th; y++) set(RS, x, y, z, B.LOG);
  for (let y = h + th - 2; y <= h + th + 1; y++) { const rr = y >= h + th ? 1 : 2; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && hash(x + dx, z + dz, y) < 0.6) continue; if (!get(RS, x + dx, y, z + dz)) set(RS, x + dx, y, z + dz, B.LEAVES); } }
}
for (let z = RS.oz + 4; z < RS.oz + RS.nz - 4; z += 1) for (let x = RS.ox + 4; x < RS.ox + RS.nx - 4; x += 1) {
  const inBuild = x > BUILD.x0 - 8 && x < BUILD.x1 + 8 && z > BUILD.z0 - 8 && z < BUILD.z1 + 8, inLab = x > LABF.x0 - 7 && x < LABF.x1 + 9 && z > LABF.z0 - 7 && z < LABF.z1 + 9;
  if (inBuild || inLab) continue;
  const dens = 0.012 + 0.03 * clamp(perlin2(x / 30, z / 30, 9) + 0.2);
  if (hash(x, z, 4) < dens && hash(x >> 2, z >> 2, 6) < 0.5) tree(x, z);
}

// ---------------------------------------------------------------- the lab floor
for (let z = LABF.z0; z <= LABF.z1; z++) for (let x = LABF.x0; x <= LABF.x1; x++) set(RS, x, GROUND, z, B.SMOOTH);

// ---------------------------------------------------------------- redstone parts
// dust: {x, y, z, sig}  — the signal it carries; torch: {x, y, z, on: dir ('up' | '+x' …), sig (its OUTPUT signal)};
// lever: {x, y, z, sig, face}; lamp blocks are voxels with a signal in LAMPS.
export const PARTS = { dust: [], torch: [], lever: [], repeater: [] };
export const LAMPS = new Map();                                   // "x,y,z" → signal name
export const LABEL = {};                                         // exhibit anchor points for tags
const dust = (x, z, sig, y = GROUND + 1, g = 0) => PARTS.dust.push({ x, y, z, sig, g });
const lamp = (x, z, sig, y = GROUND + 1, g = 0) => { set(RS, x, y, z, B.LAMP, g); LAMPS.set(`${x},${y},${z}`, sig); };
const lever = (x, z, sig, g = 0) => PARTS.lever.push({ x, y: GROUND + 1, z, sig, g });
const torch = (x, y, z, on, sig, g = 0) => PARTS.torch.push({ x, y, z, on, sig, g });

// E1 — the wire: lever → 8 dust → lamp
{ const z = 0; lever(0, z, "A1"); for (let x = 1; x <= 8; x++) dust(x, z, "A1"); lamp(9, z, "A1"); LABEL.E1 = { x: 4.5, y: GROUND + 1, z, lever: [0, z], lamp: [9, z] }; }
// E2 — NOT: lever → dust → wool block with a wall torch on its far side → dust → lamp
{ const z = -7; lever(0, z, "A2"); for (let x = 1; x <= 3; x++) dust(x, z, "A2"); set(RS, 4, GROUND + 1, z, B.W_RED); torch(5, GROUND + 1, z, "+x", "N2"); for (let x = 6; x <= 8; x++) dust(x, z, "N2"); lamp(9, z, "N2");
  LABEL.E2 = { x: 4.5, y: GROUND + 1, z, block: [4, z], torch: [5, z], lever: [0, z], lamp: [9, z] }; }
// E3 — AND (the classic torch gate): inputs A and B run into two blocks; torches on top of them invert; dust on the middle
// block joins the torches (= NOT A OR NOT B); the wall torch on the middle block inverts that again = A AND B.
{ const zm = -15, bx = 5; lever(0, zm - 1, "A3"); lever(0, zm + 1, "B3");
  for (let x = 1; x < bx; x++) { dust(x, zm - 1, "A3"); dust(x, zm + 1, "B3"); }
  for (const dz of [-1, 0, 1]) set(RS, bx, GROUND + 1, zm + dz, B.W_BLUE);
  torch(bx, GROUND + 2, zm - 1, "up", "nA3"); torch(bx, GROUND + 2, zm + 1, "up", "nB3"); dust(bx, zm, "nand3", GROUND + 2);
  torch(bx + 1, GROUND + 1, zm, "+x", "and3"); for (let x = bx + 2; x <= 8; x++) dust(x, zm, "and3"); lamp(9, zm, "and3");
  LABEL.E3 = { x: bx, y: GROUND + 2, z: zm, lamp: [9, zm], levers: [[0, zm - 1], [0, zm + 1]] }; }
// E4 — OR: two wires that simply join
{ const zm = -23; lever(0, zm - 2, "A4"); lever(0, zm + 2, "B4");
  for (let x = 1; x <= 3; x++) { dust(x, zm - 2, "A4"); dust(x, zm + 2, "B4"); }
  dust(4, zm - 2, "A4"); dust(4, zm - 1, "A4"); dust(4, zm + 2, "B4"); dust(4, zm + 1, "B4");
  for (let x = 4; x <= 8; x++) dust(x, zm, "or4"); lamp(9, zm, "or4");
  LABEL.E4 = { x: 4, y: GROUND + 1, z: zm, lamp: [9, zm], levers: [[0, zm - 2], [0, zm + 2]] }; }
// E5 — a half adder: two inputs, a compact gate block (XOR + AND), two output lamps: SUM (front) and CARRY (back).
// Shown as a module (block cluster with torches), not as a wiring diagram.
function adder(ox, oz, g, tag) {
  // inputs A (z−2) and B (z+2)
  lever(ox, oz - 2, tag + "A", g); lever(ox, oz + 2, tag + "B", g);
  for (let x = ox + 1; x <= ox + 2; x++) { dust(x, oz - 2, tag + "A", GROUND + 1, g); dust(x, oz + 2, tag + "B", GROUND + 1, g); }
  // the gate cluster 3×5 (quartz with blue trim), torches on top
  for (let dz = -2; dz <= 2; dz++) for (let dx = 3; dx <= 5; dx++) set(RS, ox + dx, GROUND + 1, oz + dz, dx === 4 && dz !== 0 ? B.QUARTZ : B.W_CYAN, g);
  for (let dz = -1; dz <= 1; dz++) set(RS, ox + 4, GROUND + 2, oz + dz, B.QUARTZ, g);
  torch(ox + 3, GROUND + 2, oz - 2, "up", tag + "nA", g); torch(ox + 3, GROUND + 2, oz + 2, "up", tag + "nB", g);
  torch(ox + 5, GROUND + 2, oz - 1, "up", tag + "x1", g); torch(ox + 5, GROUND + 2, oz + 1, "up", tag + "x2", g);
  dust(ox + 4, oz, tag + "mid", GROUND + 3, g); dust(ox + 4, oz - 1, tag + "mid", GROUND + 3, g); dust(ox + 4, oz + 1, tag + "mid", GROUND + 3, g);
  // outputs: SUM on z−1 row… CARRY on z+1 row, each to a lamp
  torch(ox + 6, GROUND + 1, oz - 1, "+x", tag + "S", g); torch(ox + 6, GROUND + 1, oz + 1, "+x", tag + "C", g);
  for (let x = ox + 7; x <= ox + 8; x++) { dust(x, oz - 1, tag + "S", GROUND + 1, g); dust(x, oz + 1, tag + "C", GROUND + 1, g); }
  lamp(ox + 9, oz - 1, tag + "S", GROUND + 1, g); lamp(ox + 9, oz + 1, tag + "C", GROUND + 1, g);
}
adder(0, -32, GRP.E5, "h"); LABEL.E5 = { x: 4, y: GROUND + 2, z: -32, sum: [9, -33], carry: [9, -31] };
// the copies: a row of adders that grows along −z from the exhibit (groups 1..8), on an extension of the floor
for (let k = 0; k < 8; k++) { const oz = -40 - k * 6; for (let z = oz - 3; z <= oz + 3; z++) for (let x = -3; x <= 14; x++) set(RS, x, GROUND, z, B.SMOOTH); adder(0, oz, GRP.COPY0 + k, "c" + k); }
LABEL.COPIES = { x: 5, y: GROUND + 1, z: -60 };

// ---------------------------------------------------------------- the computer
// footprint BUILD; a stone/concrete base, then sections. Section groups fade in from the front (20) to the back (27).
export const SCREEN = { x0: -138, x1: -26, y0: GROUND + 4, y1: GROUND + 46, z: -34 };   // lamp wall facing +z (front face at z = −33)
export const SCREEN_W = SCREEN.x1 - SCREEN.x0, SCREEN_H = SCREEN.y1 - SCREEN.y0;
{
  // base slab
  for (let z = BUILD.z0; z <= BUILD.z1; z++) for (let x = BUILD.x0; x <= BUILD.x1; x++) { set(RS, x, GROUND, z, B.CONCRETE); set(RS, x, GROUND + 1, z, (x + z) % 9 === 0 ? B.W_GRAY : B.SMOOTH, GRP.COMP + 7); }
  // the screen: a frame of black concrete with lamps inside; a support wall of iron behind it
  for (let y = SCREEN.y0 - 2; y <= SCREEN.y1 + 2; y++) for (let x = SCREEN.x0 - 2; x <= SCREEN.x1 + 2; x++) {
    const inside = x >= SCREEN.x0 && x < SCREEN.x1 && y >= SCREEN.y0 && y < SCREEN.y1;
    if (inside) { set(RS, x, y, SCREEN.z, B.LAMP, GRP.COMP); LAMPS.set(`${x},${y},${SCREEN.z}`, "screen"); } else set(RS, x, y, SCREEN.z, B.BLACK, GRP.COMP);
    set(RS, x, y, SCREEN.z - 1, B.IRON, GRP.COMP);
  }
  for (let y = GROUND + 1; y < SCREEN.y0 - 2; y++) for (let x = SCREEN.x0 - 2; x <= SCREEN.x1 + 2; x += 6) for (const z of [SCREEN.z, SCREEN.z - 1]) set(RS, x, y, z, B.BLACK, GRP.COMP);
  // logic rows behind the screen: long modules (quartz/cyan/blue) with traces and torches on top, separated by buses
  let row = 0;
  for (let z = SCREEN.z - 6; z > BUILD.z0 + 30; z -= 7, row++) {
    const g = GRP.COMP + 1 + Math.min(4, Math.floor(row / 2)), hgt = 2 + (row % 3 === 1 ? 1 : 0);
    for (let x = BUILD.x0 + 4; x <= BUILD.x1 - 4; x++) {
      const seg = Math.floor((x - BUILD.x0) / 9), gap = (x - BUILD.x0) % 9 === 0;
      if (gap) continue;
      const col = [B.QUARTZ, B.W_CYAN, B.W_BLUE, B.W_LGRAY][(seg + row) % 4];
      for (let dz = 0; dz < 4; dz++) for (let y = GROUND + 2; y < GROUND + 2 + hgt; y++) set(RS, x, y, z - dz, y === GROUND + 1 + hgt && dz === 1 && (x + row) % 4 === 0 ? B.LAMP : col, g);
      for (let dz = 0; dz < 4; dz++) if (get(RS, x, GROUND + 1 + hgt, z - dz) === B.LAMP) LAMPS.set(`${x},${GROUND + 1 + hgt},${z - dz}`, "blink");
    }
    // the bus between rows: a long red line (wool) with dust on top
    for (let x = BUILD.x0 + 2; x <= BUILD.x1 - 2; x++) set(RS, x, GROUND + 1, z - 5, (row % 2) ? B.W_RED : B.W_YELLOW, g);
  }
  // memory towers at the back: tall blocks with lamp grids on their visible faces
  for (let k = 0; k < 6; k++) {
    const x0 = BUILD.x0 + 10 + k * 21, z0 = BUILD.z0 + 6, hgt = 26 + (k % 3) * 5, g = GRP.COMP + 6;
    for (let y = GROUND + 2; y < GROUND + 2 + hgt; y++) for (let z = z0; z < z0 + 16; z++) for (let x = x0; x < x0 + 12; x++) {
      const face = x === x0 + 11 || z === z0 + 15 || y === GROUND + 1 + hgt;
      if (!face && x > x0 && z > z0) continue;
      const lampHere = face && (y - GROUND) % 2 === 0 && ((x === x0 + 11 && (z - z0) % 2 === 1) || (z === z0 + 15 && (x - x0) % 2 === 1)) && y < GROUND + hgt;
      set(RS, x, y, z, lampHere ? B.LAMP : y % 6 === 0 ? B.W_PURPLE : B.W_WHITE, g);
      if (lampHere) LAMPS.set(`${x},${y},${z}`, "mem");
    }
  }
}
// tops
for (let z = RS.oz; z < RS.oz + RS.nz; z++) for (let x = RS.ox; x < RS.ox + RS.nx; x++) { let h = 0; for (let y = RS.ny - 1; y >= 0; y--) if (get(RS, x, y, z)) { h = y; break; } RS.top[colIndex(RS, x, z)] = h; if (h > RS.maxTop) RS.maxTop = h; }
// dust on the computer: traces along the module tops are procedural (redstone.mjs → traceAt); the screen image too.
export const COMPUTER = BUILD, LAB = LABF;
// virtual sources for wires that start at a junction or on a gate top (for the travelling change)
export const VSRC = { or4: { x: 4, z: -23 }, nand3: { x: 5, z: -15 } };

// ---------------------------------------------------------------- beyond the region: the same flat meadow with trees
// (seen from above as a plane at the grass top; trees as flat crowns with a shadow), so the region never shows its sides
export function outsideColor(out, wx, wz, bs, X, Y, grass, leaves, leavesD) {
  const ix = Math.floor(wx), iz = Math.floor(wz), cx = Math.floor(ix / 7), cz = Math.floor(iz / 7);
  let col = grass;
  const hasTree = hash(cx, cz, 91) < 0.22 + 0.25 * clamp(perlin2(cx / 5, cz / 5, 9) + 0.2), tx = cx * 7 + 1 + Math.floor(hash(cx, cz, 92) * 4), tz = cz * 7 + 1 + Math.floor(hash(cx, cz, 93) * 4);
  if (hasTree) { const dx = wx - (tx + 0.5), dz = wz - (tz + 0.5); if (Math.max(Math.abs(dx + 1.6), Math.abs(dz + 1.6)) < 2.2) col = leaves; else if (Math.max(Math.abs(dx + 0.6), Math.abs(dz + 0.6)) < 2.4) col = leavesD; }
  const g = hash(ix, iz, 94); out[0] = col[0] * (g < 0.25 ? 0.92 : 1); out[1] = col[1] * (g < 0.25 ? 0.92 : 1); out[2] = col[2] * (g < 0.25 ? 0.92 : 1);
}
