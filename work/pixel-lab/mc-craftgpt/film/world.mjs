// «A chatbot built inside Minecraft» — the one block world of the film (an illustration in the spirit of the game: our
// own textures, layout and numbers; no Mojang assets, names or logos; not a copy of sammyuri's build). One voxel region:
//   the FRONT  — a smooth-stone plaza along z ≈ −40…0 with the DESK on the right: a lamp-screen wall facing +z, a giant
//                keyboard on the ground in front of it, the embedding panel (240 lamps) and the next-token picker;
//   the HALLS  — six long halls (the six layers) whose fronts stand in one row along z = −40 and that run back along −z
//                for 1,656 blocks; their roofs are ROM: a "1" is a block standing on the roof, a "0" is no block;
//   the BUS    — a line of dust on the plaza that carries the token's numbers from the embedding panel to layer 1, then
//                through layers 1…6 to the picker and the screen.
// Only what the camera can reach lies in the voxel region; beyond the game's render distance everything is fog.
// Redstone parts that are not full blocks (dust, torches, levers) are listed in PARTS and drawn by redstone.mjs.
import { perlin2, hash } from "./noise.mjs";

export const B = { AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, LOG: 4, LEAVES: 5, SMOOTH: 6, QUARTZ: 7, CONCRETE: 8, LAMP: 9, LAMP_ON: 10,
  RSBLOCK: 11, IRON: 12, W_WHITE: 13, W_LGRAY: 14, W_GRAY: 15, W_BLUE: 16, W_CYAN: 17, W_RED: 18, W_LIME: 19, W_YELLOW: 20, W_ORANGE: 21,
  W_PURPLE: 22, GLASS: 23, BLACK: 24, PLANKS: 25, KEY: 26, KEY_ON: 27 };
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

export const RS = makeRegion(-320, -700, 420, 790, 60);

// ---------------------------------------------------------------- groups: blocks that appear on cue (dither, never a pop)
export const GRP = { ROM: 9 };

// ---------------------------------------------------------------- the build's plan
export const FRONT_Z = -40;                                         // the hall fronts and the screen stand at z = −40
export const BUILD_LEN = 1656;                                      // blocks from front to back (the real build's long side)
export const HALLS = [0, 1, 2, 3, 4, 5].map((k) => ({ k, x0: -262 + k * 30, x1: -262 + k * 30 + 23, cx: -262 + k * 30 + 11.5 }));
export const HALL_H = 14;                                           // roof at GROUND + 14, ROM bits at GROUND + 15
export const SCREEN = { x0: -70, x1: 42, y0: GROUND + 4, y1: GROUND + 46, z: FRONT_Z };   // lamp wall facing +z
export const SCREEN_W = SCREEN.x1 - SCREEN.x0, SCREEN_H = SCREEN.y1 - SCREEN.y0;
export const EMBED = { x0: 50, x1: 62, y0: GROUND + 2, y1: GROUND + 22, z: FRONT_Z };      // 12 × 20 = 240 lamps facing +z
export const PICK = { x0: -86, x1: -74, z0: -48, z1: -40, lamps: [[-83, -41], [-80, -41], [-77, -41]] };
export const BUS_Z = -35;                                           // the bus: dust on the plaza
export const BUS = { x0: -250, x1: 56 };
export const PLAZA = { x0: -272, x1: 70, z0: -39, z1: 4 };
export const KEYB = { x0: -38, z0: -31 };                           // keyboard origin (back-left corner)
// the ROM row that is "built into the world" on cue: on layer 1's roof, near the front
export const ROMPATCH = { x0: HALLS[5].x0 + 1, x1: HALLS[5].x1 - 1, z0: FRONT_Z - 176, z1: FRONT_Z - 144 };
// the close-up byte: 8 lamps on layer 6's roof, near the front (one weight, 8 on-off bits)
export const BYTE = { x0: HALLS[5].x0 + 2, z: FRONT_Z - 160 };  // the first 8-bit number of the row at z = FRONT_Z − 160
export const PLAYER = { x: -22, z: -17 };                            // the player stands at the keyboard: render distance is measured from here

// ---------------------------------------------------------------- terrain: a superflat meadow with a few trees
for (let z = RS.oz; z < RS.oz + RS.nz; z++) for (let x = RS.ox; x < RS.ox + RS.nx; x++) for (let y = 0; y <= GROUND; y++) set(RS, x, y, z, y === GROUND ? B.GRASS : y >= GROUND - 2 ? B.DIRT : B.STONE);
function tree(x, z) {
  const h = GROUND, th = 4 + Math.floor(hash(x, z, 5) * 2);
  for (let y = h + 1; y <= h + th; y++) set(RS, x, y, z, B.LOG);
  for (let y = h + th - 2; y <= h + th + 1; y++) { const rr = y >= h + th ? 1 : 2; for (let dz = -rr; dz <= rr; dz++) for (let dx = -rr; dx <= rr; dx++) { if (Math.abs(dx) === rr && Math.abs(dz) === rr && hash(x + dx, z + dz, y) < 0.6) continue; if (!get(RS, x + dx, y, z + dz)) set(RS, x + dx, y, z + dz, B.LEAVES); } }
}
const inBuild = (x, z) => x > HALLS[0].x0 - 10 && x < EMBED.x1 + 12 && z > FRONT_Z - BUILD_LEN - 10 && z < PLAZA.z1 + 10;
for (let z = RS.oz + 4; z < RS.oz + RS.nz - 4; z++) for (let x = RS.ox + 4; x < RS.ox + RS.nx - 4; x++) {
  if (inBuild(x, z)) continue;
  const dens = 0.012 + 0.03 * clamp(perlin2(x / 30, z / 30, 9) + 0.2);
  if (hash(x, z, 4) < dens && hash(x >> 2, z >> 2, 6) < 0.5) tree(x, z);
}

// ---------------------------------------------------------------- redstone parts
export const PARTS = { dust: [], torch: [], lever: [], repeater: [] };
export const LAMPS = new Map();                                   // "x,y,z" → lamp kind
const dust = (x, z, sig, y = GROUND + 1, g = 0) => PARTS.dust.push({ x, y, z, sig, g });
const lampAt = (x, y, z, kind, g = 0) => { set(RS, x, y, z, B.LAMP, g); LAMPS.set(`${x},${y},${z}`, kind); };

// ---------------------------------------------------------------- the plaza
for (let z = PLAZA.z0; z <= PLAZA.z1; z++) for (let x = PLAZA.x0; x <= PLAZA.x1; x++) set(RS, x, GROUND, z, B.SMOOTH);

// ---------------------------------------------------------------- the six halls (layers)
// a 5×7 digit font for the big lamp numbers on the hall fronts
const D57 = {
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"], 2: ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"], 4: ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  5: ["11111", "10000", "11110", "00001", "00001", "10001", "01110"], 6: ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
};
export const bitAt = (x, z) => hash(x, z, 333) < 0.42 ? 1 : 0;
const ROOF = GROUND + HALL_H, z1 = FRONT_Z, zBack = Math.max(RS.oz + 1, FRONT_Z - BUILD_LEN);
for (const H of HALLS) {
  for (let z = zBack; z <= z1; z++) for (let x = H.x0; x <= H.x1; x++) {
    const u = x - H.x0, w = z1 - z, edge = u === 0 || u === 23, front = z === z1;
    for (let y = GROUND + 1; y <= ROOF; y++) {
      if (!edge && !front && y < ROOF && u > 0 && u < 23) continue;                  // hollow inside (never seen)
      let b = B.W_LGRAY;
      if (front) b = B.BLACK;
      else if (edge) b = (y - GROUND) % 5 === 0 ? B.W_GRAY : (w % 12 === 6 && y > GROUND + 3 && y < ROOF - 1 ? B.LAMP : B.QUARTZ);
      if (y === ROOF) b = front ? B.IRON : edge ? B.IRON : B.W_LGRAY;
      set(RS, x, y, z, b);
      if (b === B.LAMP) LAMPS.set(`${x},${y},${z}`, "side:" + H.k);
    }
    // the roof: ROM. Two numbers of 8 bits across (u 2..9, 11..18) on every other row; a trace lane at u 20..21
    if (!front && w >= 2 && w % 2 === 0 && ((u >= 2 && u <= 9) || (u >= 11 && u <= 18))) {
      const inPatch = H.k === 5 && x >= ROMPATCH.x0 && x <= ROMPATCH.x1 && z >= ROMPATCH.z0 && z <= ROMPATCH.z1;
      if (bitAt(x, z)) set(RS, x, ROOF + 1, z, B.W_WHITE, inPatch ? GRP.ROM : 0);
    }
    if (!front && (u === 20 || u === 21)) set(RS, x, ROOF, z, B.QUARTZ);
    // a few lamps along the roof's trace lane that blink while the layer works
    if (!front && u === 22 && w % 8 === 4) lampAt(x, ROOF + 1, z, "roof:" + H.k);
  }
  // the front: a big lamp number (5×7, 2 blocks per pixel) on the black wall, and a gate at the bottom where the bus enters
  const n = H.k + 1, gx0 = Math.round(H.cx - 5), gy0 = GROUND + 3;
  for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (D57[n][6 - j][i] === "1") for (let a = 0; a < 2; a++) for (let b2 = 0; b2 < 2; b2++) lampAt(gx0 + i * 2 + a, gy0 + j * 2 + b2, z1, "digit:" + H.k);
  for (let x = Math.round(H.cx) - 1; x <= Math.round(H.cx) + 1; x++) set(RS, x, GROUND + 1, z1, B.IRON);
  // torches along the roof's trace lane, every 16 blocks
  for (let w = 8; w < 400; w += 16) PARTS.torch.push({ x: H.x0 + 22, y: ROOF + 1, z: z1 - w, on: "up", sig: `blink:${H.k}:${w}`, g: 0 });
  for (let z = z1 + 1; z < BUS_Z; z++) dust(Math.round(H.cx), z, "gate:" + H.k);
}

// ---------------------------------------------------------------- the desk: screen, embedding panel, picker
{
  for (let y = SCREEN.y0 - 2; y <= SCREEN.y1 + 2; y++) for (let x = SCREEN.x0 - 2; x <= SCREEN.x1 + 2; x++) {
    const inside = x >= SCREEN.x0 && x < SCREEN.x1 && y >= SCREEN.y0 && y < SCREEN.y1;
    if (inside) lampAt(x, y, SCREEN.z, "screen"); else set(RS, x, y, SCREEN.z, B.BLACK);
    set(RS, x, y, SCREEN.z - 1, B.IRON); set(RS, x, y, SCREEN.z - 2, B.W_GRAY);
  }
  for (let y = GROUND + 1; y < SCREEN.y0 - 2; y++) for (let x = SCREEN.x0 - 2; x <= SCREEN.x1 + 2; x += 8) for (const z of [SCREEN.z, SCREEN.z - 1]) set(RS, x, y, z, B.BLACK);
  // behind the screen: the machine that drives it (low modules with traces), out to the halls' length a little way
  for (let z = SCREEN.z - 3; z >= SCREEN.z - 60; z--) for (let x = SCREEN.x0; x < SCREEN.x1; x++) { const row = Math.floor((SCREEN.z - 3 - z) / 6), gap = (SCREEN.z - 3 - z) % 6 === 5 || (x - SCREEN.x0) % 10 === 9; if (gap) continue;
    for (let y = GROUND + 1; y <= GROUND + 3; y++) set(RS, x, y, z, y === GROUND + 3 ? [B.QUARTZ, B.W_CYAN, B.W_BLUE, B.W_LGRAY][(row + ((x - SCREEN.x0) / 10 | 0)) % 4] : B.W_LGRAY); }
  // the embedding panel: a black frame with 12 × 20 lamps (one lamp per number of the token's list)
  for (let y = EMBED.y0 - 1; y <= EMBED.y1; y++) for (let x = EMBED.x0 - 1; x <= EMBED.x1; x++) {
    const inside = x >= EMBED.x0 && x < EMBED.x1 && y >= EMBED.y0 && y < EMBED.y1;
    if (inside) lampAt(x, y, EMBED.z, "embed"); else set(RS, x, y, EMBED.z, B.BLACK);
    for (let dz = 1; dz <= 4; dz++) set(RS, x, y, EMBED.z - dz, dz === 1 ? B.IRON : B.QUARTZ);
  }
  for (let y = GROUND + 1; y < EMBED.y0 - 1; y++) for (const x of [EMBED.x0 - 1, EMBED.x1]) set(RS, x, y, EMBED.z, B.BLACK);
  for (let z = EMBED.z + 1; z < BUS_Z; z++) dust(56, z, "embed-out");
  // the picker: a cyan module with three candidate lamps on its front edge
  for (let z = PICK.z0; z <= PICK.z1; z++) for (let x = PICK.x0; x <= PICK.x1; x++) for (let y = GROUND + 1; y <= GROUND + 3; y++) set(RS, x, y, z, y === GROUND + 3 ? B.QUARTZ : B.W_CYAN);
  PICK.lamps.forEach(([x, z], i) => lampAt(x, GROUND + 4, z, "pick:" + i));
  for (let z = PICK.z1 + 1; z < BUS_Z; z++) dust(-80, z, "pick-in");
}
// the bus along the plaza (one dust cell per block, each knows its x)
for (let x = BUS.x0; x <= BUS.x1; x++) dust(x, BUS_Z, "bus");

// ---------------------------------------------------------------- the keyboard: keys are 2×2 blocks with a 1-block gap
export const KEYS = [];
{ const rows = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM?"];
  rows.forEach((r, j) => [...r].forEach((ch, i) => KEYS.push({ ch, x: KEYB.x0 + i * 3 + j, z: KEYB.z0 + j * 3, w: 2 })));
  KEYS.push({ ch: "ENTER", x: KEYB.x0 + 9 * 3 + 1, z: KEYB.z0 + 3, w: 4 });
  KEYS.push({ ch: "SPACE", x: KEYB.x0 + 6, z: KEYB.z0 + 9, w: 14 });
  // a dark base plate under the keys
  for (let z = KEYB.z0 - 1; z <= KEYB.z0 + 11; z++) for (let x = KEYB.x0 - 1; x <= KEYB.x0 + 32; x++) set(RS, x, GROUND, z, B.CONCRETE);
  KEYS.forEach((k, i) => { k.i = i; for (let dz = 0; dz < 2; dz++) for (let dx = 0; dx < k.w; dx++) { set(RS, k.x + dx, GROUND + 1, k.z + dz, B.KEY); LAMPS.set(`${k.x + dx},${GROUND + 1},${k.z + dz}`, "key:" + i); } });
  // the keyboard's cable to the embedding panel
  for (let x = KEYB.x0 + 33; x <= 63; x++) dust(x, KEYB.z0 + 4, "keys-out");
  for (let z = KEYB.z0 + 3; z > FRONT_Z; z--) dust(63, z, "keys-out");
}
export const keyOf = (ch) => KEYS.find((k) => k.ch === ch);

// tops
for (let z = RS.oz; z < RS.oz + RS.nz; z++) for (let x = RS.ox; x < RS.ox + RS.nx; x++) { let h = 0; for (let y = RS.ny - 1; y >= 0; y--) if (get(RS, x, y, z)) { h = y; break; } RS.top[colIndex(RS, x, z)] = h; if (h > RS.maxTop) RS.maxTop = h; }
export const COMPUTER = { x0: HALLS[0].x0, x1: EMBED.x1, z0: FRONT_Z - BUILD_LEN, z1: FRONT_Z };
export const VSRC = {};

// ---------------------------------------------------------------- beyond the region: the same flat meadow with trees
export function outsideColor(out, wx, wz, bs, X, Y, grass, leaves, leavesD) {
  const ix = Math.floor(wx), iz = Math.floor(wz), cx = Math.floor(ix / 7), cz = Math.floor(iz / 7);
  let col = grass;
  const hasTree = hash(cx, cz, 91) < 0.22 + 0.25 * clamp(perlin2(cx / 5, cz / 5, 9) + 0.2), tx = cx * 7 + 1 + Math.floor(hash(cx, cz, 92) * 4), tz = cz * 7 + 1 + Math.floor(hash(cx, cz, 93) * 4);
  if (hasTree) { const dx = wx - (tx + 0.5), dz = wz - (tz + 0.5); if (Math.max(Math.abs(dx + 1.6), Math.abs(dz + 1.6)) < 2.2) col = leaves; else if (Math.max(Math.abs(dx + 0.6), Math.abs(dz + 0.6)) < 2.4) col = leavesD; }
  const g = hash(ix, iz, 94); out[0] = col[0] * (g < 0.25 ? 0.92 : 1); out[1] = col[1] * (g < 0.25 ? 0.92 : 1); out[2] = col[2] * (g < 0.25 ? 0.92 : 1);
}
// ---------------------------------------------------------------- render distance: chunks farther than 32 from the player are fog
export const RENDER_DIST = 512;
export function chunkVis(wx, wz) {
  const cx = (Math.floor(wx / 16) + 0.5) * 16, cz = (Math.floor(wz / 16) + 0.5) * 16, d = Math.hypot(cx - PLAYER.x, cz - PLAYER.z);
  return 1 - clamp((d - (RENDER_DIST - 40)) / 56);
}
