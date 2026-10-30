// ============================================================================================================================
// CASINO KIT · casino-house.mjs (added for film 3 casino-floor, 2026-10-27): the WHOLE casino as a dollhouse (no roof), seen
// through the kit camera (casino-core.mjs makeView / camAt, world in cm) from high above, so it reads as the same casino as
// films 1–2 (same carpet, slot machines, roulette and card tables, dealers, guests) — only the camera is up in the air.
//
// Plan (x right, z toward the camera = south; the camera always looks north and down):
//   OLD casino  x −1000…1000, z −2400…0, walls 330 cm (low ceiling, no windows). Entrance gap x −150…150 in the front wall
//               (cut to a 46 cm sill), red carpet and marquee outside. Slot islands right inside the door, a maze of slot
//               islands and columns on the left, the table pit on the right (two card tables, a slot island, the roulette
//               table at the back), the restaurant (FOOD) at the back left, the hotel desk with two lifts (HOTEL) at the back.
//               The back wall carries the clock, two air vents, sconces and the lifts. The right wall's ARCH (z −1010…−700) can open.
//   NEW casino  x 1000…3000, z −2400…0, right next door, grows out of the old right wall: floor (cream marble) spreads from the
//               arch, the old right wall sinks to the cut height, new walls rise to 900 cm with tall windows (sky by time of day,
//               the sun disc), a glass skylight strip, a big wall clock and two post clocks, palms, a fountain, pale slot
//               islands, a card table.
//
// drawHouse(c, V, t, st) → draws floor, walls, furniture, people in depth order. st (all optional, 0..1 unless noted):
//   { items: [{ z, x?, draw }] film actors put into the depth sort, dark (old hall dimmed), clockA (old clock visible),
//     clockT (hours on the old clock), grow (new casino), arch (arch open), low (old back wall lowered to the cut height),
//     sun (0 = day … 1 = sunset over), newClockT (hours on the new clocks), lampsNew, life (background action) }.
// Helpers: islandMachines() (positions), PATHS, SEATS, vfScale(pitch) (billboard squash for a high camera), box(), wallFace.
// Speed: ≈ 60–140 ms a frame (per-pixel floor + wall faces).
// ============================================================================================================================
import { hex, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, glow, shadow, bayer, rampAt, shadePoly, ringPts, flatPts, rrectXZ, bbox } from "./casino-core.mjs";
import { slotMachine, stool, cardTable, chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { drawRouletteTable, ballState, TOP } from "./casino-roulette.mjs";
import { drawPerson, drawDealer, idlePose, walkPose, LOOKS, GUEST_LOOKS } from "./casino-people.mjs";

export const OLD = { x0: -1000, x1: 1000, z0: -2400, z1: 0, H: 330 };
export const NEW = { x0: 1000, x1: 3000, z0: -2400, z1: 0, H: 900 };
export const DOOR = { x0: -150, x1: 150 };
export const ARCH = { z0: -1010, z1: -700, x: 1000, zc: -855 };
export const CUT_H = 110, WT = 24, SILL = 46;
/** The hotel tower right behind the old casino (the rooms the routes lead to). */
export const TOWER = { x0: -1000, x1: 1000, z0: -3100, z1: -2440, H: 2600 };
export const SAND = ["#2E241C", "#4C3E30", "#6E5C48", "#927C62", "#B49C7E", "#CFB998", "#E4D2B2", "#F6EAD2"];
export const MARBLE = ["#4A4238", "#6A6052", "#8A806E", "#A89E8A", "#C4BAA4", "#DAD2BC", "#ECE6D4", "#FAF6EA"];
const ASPH = ["#06070C", "#0B0D14", "#10131C", "#161A26", "#1E2232", "#282D40", "#343A50", "#444A62"];
const GRASS = ["#040A08", "#081410", "#0C1E16", "#12281C", "#183424", "#20422C", "#2A5236", "#386442"];
export const BODIES = [RAMP.purple, RAMP.blue, RAMP.red, RAMP.teal, RAMP.green];
export const PALE = [RAMP.teal, RAMP.green, RAMP.blue, RAMP.yellow, RAMP.purple];
export const vfScale = (pitch) => Math.max(0.62, Math.min(1, (Math.cos(pitch) / Math.cos(0.15)) * 1.12));

// ---------------------------------------------------------------- the floor plan
/** Slot islands: two rows back to back (front faces at z, backs at z − 40). */
export const ISLANDS = [
  { x: -520, z: -190, n: 5 }, { x: 520, z: -190, n: 5 }, { x: 0, z: -470, n: 5 },
  { x: -620, z: -760, n: 4 }, { x: -200, z: -1040, n: 3 }, { x: -760, z: -1260, n: 3 }, { x: -380, z: -1520, n: 4 }, { x: -820, z: -1760, n: 2 },
  { x: 640, z: -1360, n: 4 },
];
/** Columns: front-facing machines one behind the other (a north–south row): x, z of the front machine, n, step. */
export const COLUMNS = [{ x: -360, z: -660, n: 4, dz: 92 }, { x: 140, z: -760, n: 6, dz: 92 }, { x: -560, z: -1110, n: 3, dz: 92 }, { x: -900, z: -900, n: 3, dz: 92 }, { x: 0, z: -1420, n: 4, dz: 92 }];
export const NEW_ISLANDS = [{ x: 1560, z: -1000, n: 4, pale: true }, { x: 2480, z: -620, n: 3, pale: true }, { x: 2520, z: -1640, n: 3, pale: true }];
export const TABLES_OLD = [{ id: "c1", kind: "cards", x: 420, z: -760 }, { id: "c2", kind: "cards", x: 790, z: -760 }, { id: "r1", kind: "roulette", x: 560, z: -1950 }];
export const TABLES_NEW = [{ id: "c3", kind: "cards", x: 1560, z: -1980 }];
export const FOUNTAIN = { x: 2080, z: -1300, r: 170 };
export const PALMS = [[1180, -300], [2860, -260], [1820, -640], [2300, -1060], [1780, -1560], [2860, -2120], [1160, -2160], [2200, -2160]];
export const POST_CLOCKS = [[1840, -930], [1250, -1350]];
export const RESTO = [[-860, -2120], [-640, -2260], [-860, -2330]];
export const DESK = { x0: -330, x1: 150, z: -2230 };

/** Machine positions of an island: [{ x, z, back }]. */
export function islandMachines(is) { const out = []; for (let i = 0; i < is.n; i++) { const x = is.x + (i - (is.n - 1) / 2) * 82; out.push({ x, z: is.z, back: false, i }); out.push({ x, z: is.z - 40, back: true, i }); } return out; }

// ---------------------------------------------------------------- per-pixel floor
const RGB = {}; for (const k of ["carpet", "gold", "teal", "wood", "maple", "ivory", "wall", "red"]) RGB[k] = RAMP[k].map(hex);
RGB.asph = ASPH.map(hex); RGB.grass = GRASS.map(hex); RGB.marble = MARBLE.map(hex); RGB.sand = SAND.map(hex);
const B4 = new Float32Array(16); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) B4[y * 4 + x] = bayer(x, y);
function put(d, i, ramp, level, x, y) { const l = level < 0 ? 0 : level > 7 ? 7 : level, lo = l | 0, idx = l - lo > B4[(y & 3) * 4 + (x & 3)] ? Math.min(7, lo + 1) : lo, col = ramp[idx]; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
const TILE = 72;
function carpet(x, z, pxcm) {
  const u = x / TILE, v = z / TILE, fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5, au = Math.abs(fu), av = Math.abs(fv), d = au + av;
  const lw = Math.max(0.022, 0.62 / (TILE * pxcm));
  if (Math.abs(d - 0.5) < lw) return [RGB.gold, 1.3];
  const r = Math.hypot(fu, fv);
  if (r < 0.13) { if (r < 0.035) return [RGB.gold, 2.0]; const th = Math.atan2(fv, fu); if (r > 0.06 && r < 0.12 && Math.cos(8 * th) > -0.25) return [RGB.teal, 1.2]; if (r < 0.06) return [RGB.carpet, 1.6]; }
  const rc = Math.hypot(0.5 - au, 0.5 - av);
  if (rc < 0.075 && pxcm * TILE > 30) return rc < 0.035 ? [RGB.gold, 1.6] : [RGB.carpet, 1.4];
  if (Math.abs(d - 0.33) < lw * 0.7) return [RGB.carpet, -1.1];
  if (pxcm * TILE > 60 && Math.abs(Math.abs(fu - fv) - 0.5) < lw * 0.6 && d < 0.5) return [RGB.teal, -0.2];
  return [RGB.carpet, 0];
}
// static light map (old casino lamps, slot glow, restaurant, hotel, entrance, street lamps): 20 cm cells
const LX0 = -1600, LZ0 = -3000, LS = 20, NX = 260, NZ = 200, LM = new Float32Array(NX * NZ);
const LAMPS = [];
for (const tb of TABLES_OLD) LAMPS.push([tb.x, tb.z - (tb.kind === "roulette" ? 40 : 20), 0.95, 42000]);
for (const is of ISLANDS) for (const m of islandMachines(is)) LAMPS.push([m.x, m.back ? m.z - 50 : m.z + 50, 0.16, 7000]);
for (const col of COLUMNS) for (let i = 0; i < col.n; i++) LAMPS.push([col.x, col.z - i * col.dz + 40, 0.14, 7000]);
for (const [x, z] of RESTO) LAMPS.push([x, z, 0.7, 16000]);
LAMPS.push([-100, -2300, 0.6, 30000], [0, -120, 0.55, 26000], [0, 160, 0.8, 40000], [-760, 330, 0.7, 50000], [760, 330, 0.7, 50000], [2000, 330, 0.7, 50000]);
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const x = LX0 + i * LS, z = LZ0 + j * LS; let L = 0;
  for (const [lx, lz, s, w] of LAMPS) { const dd = (x - lx) ** 2 + (z - lz) ** 2; if (dd < w * 9) L += s * Math.exp(-dd / w); }
  LM[j * NX + i] = L;
}
const lmAt = (x, z) => { const i = ((x - LX0) / LS) | 0, j = ((z - LZ0) / LS) | 0; return i < 0 || j < 0 || i >= NX || j >= NZ ? 0 : LM[j * NX + i]; };
const inOld = (x, z) => x > OLD.x0 && x < OLD.x1 && z > OLD.z0 && z < OLD.z1;
const inNew = (x, z) => x > NEW.x0 + WT && x < NEW.x1 && z > NEW.z0 && z < NEW.z1;
export const SIDE_WIN = [-1900, -1200, -500], BACK_WIN = [1300, 1766, 2233, 2700];
const inResto = (x, z) => x < -470 && z < -1990;
const inHotel = (x, z) => x > -400 && x < 230 && z < -2060;
/** Daylight on the new floor: sky light + sun patches through the west windows and the skylight. */
function dayAt(x, z, st) {
  const sun = st.sun ?? 0, day = 1 - 0.62 * sm(sun, 0.25, 1);
  let patch = 0;
  const reach = lerp(520, 1500, sun), skew = lerp(120, 520, sun);
  for (const zc of SIDE_WIN) { const u = (NEW.x1 - x) / reach; if (u > 0 && u < 1) { const zz = z - (zc + u * skew); if (Math.abs(zz) < 105 * (1 - 0.2 * u)) patch = Math.max(patch, 1 - u * 0.8); } }
  if (z < NEW.z0 + 300 && z > NEW.z0 + 40) { const fx = ((x + 4000 + sun * 300) / 200) % 1; if (fx > 0.15 && fx < 0.85) patch = Math.max(patch, 0.7 * (1 - sun)); }
  const dk = st.day ?? 1; patch *= dk;
  return { L: (0.1 + 0.52 * dk) * day + 0.42 * patch * (1 - 0.7 * sm(sun, 0.6, 1)), warm: sun, patch };
}
function drawFloor(c, V, t, st) {
  const d = c.d, { cam } = V, da = 1 / V.f, a0 = -V.sx0 / V.f, dark = st.dark ?? 0, grow = st.grow ?? 0, sun = st.sun ?? 0, lampsNew = st.lampsNew ?? 0;
  const oldK = 1 - 0.45 * dark, od = (st.day ?? 0) * (1 - 0.85 * sm(sun, 0.3, 1));
  for (let py = 0; py < 960; py++) {
    const b = -(py + 0.5 - V.sy0) / V.f, dy = -V.sp + b * V.cp, dz = -V.cp - b * V.sp;
    if (dy >= -1e-4) { for (let px = 0; px < 540; px++) put(d, (py * 540 + px) * 3, RGB.asph, 0.5 + 3 * od, px, py); continue; }
    const tf = -cam.y / dy, z = cam.z + tf * dz, pxcm = V.f / tf;
    for (let px = 0; px < 540; px++) {
      const x = cam.x + tf * (a0 + (px + 0.5) * da), i = (py * 540 + px) * 3;
      if (inOld(x, z)) {
        const L = (0.1 + lmAt(x, z)) * oldK;
        if (inResto(x, z)) { const pu = Math.floor(x / 60), pz = (z + (pu & 1) * 30) / 15, seam = pz - Math.floor(pz) < 0.12 || x / 60 - pu < 0.03; put(d, i, RGB.maple, (seam ? 0.6 : 1.4) + 4.4 * Math.min(1.1, L), px, py); }
        else if (inHotel(x, z)) { const tx = Math.floor(x / 80), tz = Math.floor(z / 80), g = x / 80 - tx < 0.04 || z / 80 - tz < 0.04; put(d, i, g ? RGB.gold : RGB.ivory, (g ? 1.6 : ((tx + tz) & 1 ? 1.2 : 0.4)) + 4.2 * Math.min(1.1, L), px, py); }
        else { const [ramp, off] = carpet(x, z, pxcm); put(d, i, ramp, off + 0.7 + 4.9 * Math.min(1.15, L), px, py); }
        continue;
      }
      if (inNew(x, z)) {
        const dd = Math.hypot(x - ARCH.x, z - ARCH.zc), front = grow * 2900, edge = (front - dd) / 140;
        if (clamp01(edge) > B4[(py & 3) * 4 + (px & 3)]) {
          const D = dayAt(x, z, st), Ln = D.L + lampsNew * 0.55 * Math.exp(-(((x - 1560) ** 2 + (z + 960) ** 2) / 260000)) + lampsNew * 0.25;
          const tx = Math.floor(x / 120), tz = Math.floor(z / 120), fx = x / 120 - tx, fz = z / 120 - tz, grout = fx < 0.025 || fz < 0.025;
          const fr = Math.hypot(x - FOUNTAIN.x, (z - FOUNTAIN.z)), ring = fr > FOUNTAIN.r + 30 && fr < FOUNTAIN.r + 60;
          const ramp = ring ? RGB.teal : grout ? RGB.gold : D.patch > 0.3 && sun > 0.35 ? RGB.sand : RGB.marble;
          put(d, i, ramp, (ring ? 3 : grout ? 3.2 : ((tx + tz) & 1 ? 1.1 : 1.6)) + 4.6 * Ln - (ring ? 0 : 0.3), px, py); continue;
        }
        // before it grows: the dark lot north of the old casino
        const sx = ((z + 4000) / 260) % 1, stripe = sx < 0.04 && ((x + 4000) % 600) < 480;
        put(d, i, stripe ? RGB.ivory : RGB.asph, stripe ? 0.4 + 3 * od : 1.2 + 2 * lmAt(x, z) + 2.5 * od, px, py); continue;
      }
      // outside: sidewalk, street, lawn strips
      const Lo = lmAt(x, z) + od * 1.1;
      if (z > 0 && z < 260 && Math.abs(x) < 1500) { if (Math.abs(x) < 110 && z < 240) { put(d, i, RGB.red, 2.4 + 3.2 * Lo, px, py); continue; } const g = (x + 3000) % 90 < 4 || z % 90 < 4; put(d, i, RGB.asph, (g ? 1.6 : 2.6) + 3.6 * Lo, px, py); continue; }
      if (z >= 260) { const lane = Math.abs(z - 560) < 5 && ((x + 4000) % 300) < 160; put(d, i, lane ? RGB.gold : RGB.asph, lane ? 2 + 2 * Lo : 0.9 + 3 * Lo, px, py); continue; }
      put(d, i, RGB.grass, 0.8 + 3 * Lo + ((Math.floor(x / 30) * 7 + Math.floor(z / 30) * 3) % 5 === 0 ? 0.6 : 0), px, py);
    }
  }
}

// ---------------------------------------------------------------- boxes and wall faces
/** Canvas.poly with the scan clipped to the 540×960 grid (huge projected polygons cost nothing off screen). */
export function fillPoly(g, pts, col, shade) {
  let minY = Infinity, maxY = -Infinity; for (const [, y] of pts) { if (y < minY) minY = y; if (y > maxY) maxY = y; }
  const y0 = Math.max(0, Math.floor(minY)), y1 = Math.min(959, Math.ceil(maxY)), xs = [];
  for (let y = y0; y <= y1; y++) { const yc = y + 0.5; xs.length = 0;
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) { const xa = Math.max(0, Math.round(xs[k])), xb = Math.min(540, Math.round(xs[k + 1])); for (let x = xa; x < xb; x++) g.px(x, y, shade ? shade(x, y) : col); } }
}
const P2 = (V, x, y, z) => { const p = V.P(x, y, z); return [p[0], p[1]]; };
/**
 * Axis-aligned box x0..x1, y0..y1, z0..z1. faces = { s, n, w, e, top }: a colour, or fn(x, y, z, px, py) → colour (per pixel,
 * the point on that face under the pixel). Only faces turned to the camera are drawn (then the top).
 */
export function box(c, V, b, faces, a = 1) {
  const { cam } = V, g = fade(c, a);
  const fill = (pts, f, plane) => {
    if (!f) return; for (const p of pts) if (V.depth(...p) < 40) return;
    const sp = pts.map((p) => P2(V, ...p)), bb = bbox(sp); if (bb.x1 < 0 || bb.x0 > 540 || bb.y1 < 0 || bb.y0 > 960) return;
    if (typeof f !== "function") { fillPoly(g, sp, f); return; }
    fillPoly(g, sp, null, (px, py) => { const bb = -(py + 0.5 - V.sy0) / V.f, ax = (px + 0.5 - V.sx0) / V.f, dy = -V.sp + bb * V.cp, dz = -V.cp - bb * V.sp;
      let tt; if (plane[0] === "z") tt = (plane[1] - cam.z) / dz; else if (plane[0] === "x") tt = (plane[1] - cam.x) / ax; else tt = (plane[1] - cam.y) / dy;
      return f(cam.x + tt * ax, cam.y + tt * dy, cam.z + tt * dz, px, py); });
  };
  const { x0, x1, y0, y1, z0, z1 } = b;
  if (cam.z > z1) fill([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], faces.s, ["z", z1]);
  if (cam.z < z0) fill([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], faces.n, ["z", z0]);
  if (cam.x < x0) fill([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]], faces.w, ["x", x0]);
  if (cam.x > x1) fill([[x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0]], faces.e, ["x", x1]);
  if (cam.y > y1) fill([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], faces.top, ["y", y1]);
}
const col3 = (ramp, level, px, py) => rampAt(ramp, level, px, py);
/** The old casino's wall (inside face): wood wainscot, gold rail, damask, crown, sconce light. u runs along the wall. */
function oldWall(u, y, px, py, dark, H) {
  const sc = u / 300 - Math.floor(u / 300) - 0.5, sconce = Math.exp(-((sc * 300) ** 2) / 9000 - ((y - 230) ** 2) / 9000), low = Math.exp(-y / 140) * 0.7, Lw = (0.3 + 0.9 * sconce + low) * (1 - 0.45 * dark);
  if (y < 12) return col3(RAMP.wood, 1 + Lw * 2, px, py);
  if (y < 96) { const pu = u / 150 - Math.floor(u / 150), frame = pu < 0.07 || pu > 0.93 || y < 22 || y > 88; return col3(RAMP.wood, (frame ? 2.6 : 1.8) + Lw * 2.6, px, py); }
  if (y < 104) return col3(RAMP.gold, 2 + Lw * 3, px, py);
  if (y > H - 34 && H > 200) return col3(y > H - 28 && y < H - 22 ? RAMP.gold : RAMP.wood, 1.6 + Lw * 2.4, px, py);
  const uu = u / 56, v = y / 56, fu = uu - Math.floor(uu) - 0.5, fv = v - Math.floor(v) - 0.5, dd = Math.abs(fu) + Math.abs(fv) * 0.8, motif = Math.abs(dd - 0.42) < 0.035 || Math.hypot(fu, fv) < 0.07;
  return col3(motif ? RAMP.gold : RAMP.wall, (motif ? 0.6 : 1.4) + Lw * 3.6, px, py);
}
const CAP = (px, py) => ((px + py) & 3 ? "#C9B596" : "#B8A282");
/** Sky colour inside a window at wall height y (0 at the floor) for sun 0..1. */
function skyAt(y, sun, px, py) {
  const h = clamp01((y - 100) / 700), day = ["#2C6AB8", "#4A8AD0", "#7EB2E4", "#B4D6F0"], dusk = ["#2A1E48", "#7A3A5A", "#E0704A", "#FFC070"], night = ["#0A0C22", "#141A3A", "#2A2A58", "#4A3A6A"];
  const k = 3 * (1 - h), lo = Math.min(2, Math.floor(k)), f = k - lo;
  const pick = (pal) => mix(pal[lo], pal[lo + 1], f);
  const a = sm(sun, 0.15, 0.7), b = sm(sun, 0.7, 1);
  let col = mix(pick(day), pick(dusk), a); if (b > 0) col = mix(col, pick(night), b * 0.8);
  return col;
}
/** New casino wall (inside face): plaster with pilasters and tall arched windows; returns colour. win = { centers, hw, y0, ytop } */
function newWall(u, y, px, py, st, W, sunPos) {
  const sun = st.sun ?? 0, day = (1 - 0.55 * sm(sun, 0.3, 1)) * (0.55 + 0.45 * (st.day ?? 1));
  for (const cu of W.centers) {
    const du = Math.abs(u - cu); if (du > W.hw + 14) continue;
    const top = W.ytop, inArch = y <= top ? du <= W.hw : Math.hypot(du, y - top) <= W.hw;
    const inFrame = y <= top + W.hw + 14 && (y <= top ? du <= W.hw + 12 : Math.hypot(du, y - top) <= W.hw + 12) && y >= W.y0 - 12;
    if (inArch && y >= W.y0) {
      if (du < 4 || Math.abs(((y - W.y0) % 140) - 70) < 3) return mix("#E8DCC0", "#5A4A38", 0.5 * sm(sun, 0.5, 1));
      let col = skyAt(y, sun, px, py); const dk = st.day ?? 1; if (dk < 1) col = mix(skyAt(y, 1, px, py), col, dk);
      const sk = clamp01((dk - 0.3) / 0.5);
      if (sunPos && Math.abs(cu - sunPos[2]) < 1 && sk > 0) { const ds = Math.hypot(u - sunPos[0], y - sunPos[1]); if (ds < 46) col = mix(col, ds < 34 ? mix("#FFF6D0", "#FF9A50", sm(sun, 0.4, 1)) : "#FFD890", (ds < 34 ? 1 : 0.5) * sk); else if (ds < 120) col = mix(col, "#FFE0A0", 0.35 * (1 - ds / 120) * sk); }
      return col;
    }
    if (inFrame) return col3(MARBLE, 5.4 * day + 0.6, px, py);
  }
  const pil = Math.abs(((u + 4000) % 460) - 230) > 214, base = y < 40, cornice = y > NEW.H - 40;
  return col3(SAND, (base ? 2.6 : cornice ? 5.2 : pil ? 5.6 : 4.6) * day + (pil ? 0.4 : 0) + 0.8, px, py);
}
/** Clock face on a south-facing wall plane at (x, y, z), radius r cm; hours h (float). */
export function wallClock(c, V, x, y, z, r, h, a = 1, o = {}) {
  if (a <= 0) return; const g = fade(c, a);
  const ring = (rr) => { const out = []; for (let i = 0; i <= 28; i++) { const an = (i / 28) * Math.PI * 2; out.push(P2(V, x + Math.cos(an) * rr, y + Math.sin(an) * rr, z)); } return out; };
  const [cx, cy, k] = V.P(x, y, z);
  if (o.glow) glow(c, cx, cy, r * k * 1.8, r * k * 1.6, "#FFF0C0", 0.3 * a * o.glow);
  g.poly(ring(r * 1.14), o.rim ?? RAMP.gold[2]); g.poly(ring(r * 1.06), o.rim2 ?? RAMP.gold[5]); g.poly(ring(r), o.face ?? "#F6EEDA");
  for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2, p = P2(V, x + Math.cos(an) * r * 0.84, y + Math.sin(an) * r * 0.84, z), q = P2(V, x + Math.cos(an) * r * (i % 3 ? 0.76 : 0.68), y + Math.sin(an) * r * (i % 3 ? 0.76 : 0.68), z); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#2A2030"); }
  const hand = (ang, len, col, w) => { const p = P2(V, x, y, z), q = P2(V, x + Math.sin(ang) * len, y + Math.cos(ang) * len, z); for (let d = -(w >> 1); d <= w >> 1; d++) g.line(R(p[0]) + d, R(p[1]), R(q[0]) + d, R(q[1]), col); };
  const hh = ((h % 12) + 12) % 12, mm = (h - Math.floor(h)) * 60;
  hand((hh / 12) * Math.PI * 2, r * 0.5, "#1A1424", Math.max(1, R(r * k * 0.14))); hand((mm / 60) * Math.PI * 2, r * 0.78, "#1A1424", Math.max(1, R(r * k * 0.09)));
  g.px(R(cx), R(cy), RAMP.red[5]);
}

// ---------------------------------------------------------------- the hotel tower facade (lit windows at night, glass by day)
function towerFace(u, y, px, py, od) {
  const base = y < 380, crown = y > TOWER.H - 120;
  if (base) { if (y > 330 && y < 350) return col3(RAMP.gold, 3.6 + 2 * od, px, py); return col3(RAMP.black, 2.2 + 2.4 * od + (y > 350 ? 1 : 0), px, py); }
  if (crown) { if (y > TOWER.H - 90 && y < TOWER.H - 70) return ((Math.floor(u / 30) + Math.floor(y)) & 1) ? "#FFE6A0" : RAMP.gold[4]; return col3(RAMP.black, 2.6 + 2.6 * od, px, py); }
  const cu = (u + 4000) / 90, fy = (y - 380) / 200, ci = Math.floor(cu), fi = Math.floor(fy), wx = cu - ci, wy = fy - fi;
  if (wx > 0.18 && wx < 0.82 && wy > 0.22 && wy < 0.86) {
    const r = rnd(ci * 131 + fi * 17), lit = r < 0.62 ? 1 : 0, warm = r < 0.2 ? "#FFF0B8" : r < 0.45 ? "#FFD27A" : "#F2B060";
    const night = lit ? (wy > 0.78 ? mix(warm, "#000000", 0.35) : warm) : mix(RAMP.glass[2], "#000000", 0.2);
    return od > 0 ? mix(night, mix(RAMP.glass[6], "#FFFFFF", 0.25 * (1 - wy)), od) : night;
  }
  return col3(RAMP.glass, 0.8 + 3.4 * od + (wx < 0.06 ? 0.8 : 0), px, py);
}

// ---------------------------------------------------------------- furniture
function plinth(c, V, x0, z0, x1, z1, a = 1) { box(c, V, { x0, x1, y0: 0, y1: 9, z0, z1 }, { s: RAMP.gold[3], e: RAMP.gold[2], w: RAMP.gold[2], top: RAMP.wood[2] }, a); }
function restoTable(c, V, x, z, t, k) {
  const ring = (r, y) => ringPts(V, x, y, z, r, 0, Math.PI * 2, 20);
  const [bx, by, kk] = V.P(x, 0, z); shadow(c, bx, by, 70 * kk, 40 * kk, 0.5);
  for (const [dx, dz] of [[-62, 0], [62, 0], [0, -58], [0, 58]]) { const p = V.P(x + dx, 46, z + dz); c.ellipse(R(p[0]), R(p[1]), Math.max(1, R(14 * kk)), Math.max(1, R(9 * kk)), RAMP.wood[4]); }
  const top = ring(52, 76), skirt = ring(56, 40); c.poly(skirt, MARBLE[4]); c.poly(top, MARBLE[6]);
  const p = V.P(x, 77, z); c.disc(R(p[0]), R(p[1]), Math.max(1, R(5 * kk)), RAMP.red[4]); glow(c, p[0], p[1], 40 * kk, 30 * kk, "#FFD890", 0.35 * k);
  for (const [dx, dz] of [[-28, 10], [28, -8]]) { const q = V.P(x + dx, 77, z + dz); c.ellipse(R(q[0]), R(q[1]), Math.max(1, R(9 * kk)), Math.max(1, R(6 * kk)), "#FFFFFF"); c.px(R(q[0]), R(q[1]), RAMP.yellow[5]); }
}
function deskBlock(c, V, t) {
  const { x0, x1, z } = DESK;
  box(c, V, { x0, x1, y0: 0, y1: 104, z0: z - 30, z1: z + 30 }, { s: (x, y, zz, px, py) => col3(RAMP.wood, (y > 90 ? 4.5 : Math.abs(((x + 2000) % 80) - 40) > 36 ? 3.6 : 2.6), px, py), e: RAMP.wood[2], w: RAMP.wood[2], top: (x, y, zz, px, py) => col3(MARBLE, 5.2, px, py) });
  const b = V.P(x1 - 40, 105, z); c.disc(R(b[0]), R(b[1]) - 1, Math.max(1, R(5 * V.k(x1, 105, z))), RAMP.gold[6]);
}
function palm(c, V, x, z, t, s = 1, seed = 0) {
  if (s <= 0.02) return;
  const G = V.bill(x, z, s, 0.86), k = G.z;
  shadow(c, G.bx, G.by, 46 * k, 14 * k, 0.45);
  // planter (brass-rimmed, cream)
  const pts = [[-30, 0], [30, 0], [36, -50], [-36, -50]].map(([u, v]) => [G.X(u), G.Y(v)]); c.poly(pts, null, (px, py) => col3(MARBLE, 3.4 + 2 * ((px - G.bx) / (36 * k) < -0.2 ? 0 : 1), px, py));
  c.rect(R(G.X(-38)), R(G.Y(-56)), Math.max(1, R(76 * k)), Math.max(1, R(7 * k * G.vf)), RAMP.gold[5]);
  // trunk: segmented, gently bent
  const sw = Math.sin(t * 0.8 + seed) * 2, top = [G.X(10 + sw), G.Y(-250)];
  for (let i = 0; i < 14; i++) { const u = i / 14, cx = lerp(G.X(0), top[0], u) + Math.sin(u * 2.4) * 8 * k, cy = lerp(G.Y(-54), top[1], u), w = Math.max(1, R((9 - u * 3) * k)); c.rect(R(cx - w), R(cy - 10 * k * G.vf), w * 2, Math.max(1, R(10 * k * G.vf)), i % 2 ? RAMP.maple[3] : RAMP.maple[4]); c.rect(R(cx - w), R(cy - 10 * k * G.vf), w * 2, 1, RAMP.maple[1]); }
  // fronds
  for (let f = 0; f < 8; f++) { const an = (f / 8) * Math.PI * 2 + seed + Math.sin(t * 0.9 + f) * 0.06, len = (95 + 25 * ((f * 37) % 3)) * k, droop = 0.55;
    let px = top[0], py = top[1];
    for (let s2 = 1; s2 <= 12; s2++) { const u = s2 / 12, nx = top[0] + Math.cos(an) * len * u, ny = top[1] + Math.sin(an) * len * u * 0.45 * G.vf + (u * u) * len * droop * G.vf, w = Math.max(1, R((1 - Math.abs(u - 0.4)) * 9 * k));
      const colL = u < 0.5 ? "#3E8A3A" : "#5AAA48";
      c.line(R(px), R(py), R(nx), R(ny), "#1E4A22"); for (let q = 1; q <= w; q++) { c.px(R(nx), R(ny) - q, colL); c.px(R(nx), R(ny) + q, q > w / 2 ? "#2E6A30" : colL); }
      px = nx; py = ny; } }
  c.disc(R(top[0]), R(top[1]), Math.max(1, R(6 * k)), "#6A4A20");
}
function flowerBox(c, V, x, z, t, a) {
  const g = fade(c, a);
  box(c, V, { x0: x - 130, x1: x + 130, y0: 0, y1: 48, z0: z - 26, z1: z + 26 }, { s: (X, Y, Z, px, py) => col3(MARBLE, 3.6 + Y / 30, px, py), top: RAMP.wood[2], e: MARBLE[2], w: MARBLE[2] }, a);
  for (let i = 0; i < 14; i++) { const u = x - 120 + i * 18.5, w = z + ((i * 37) % 30) - 15, [px, py, k] = V.P(u, 58 + ((i * 13) % 12), w), r = Math.max(1, R(7 * k));
    g.disc(R(px), R(py), r, i % 3 ? "#3E8A3A" : "#2E6A30"); g.disc(R(px) + R(2 * k), R(py) - R(2 * k), Math.max(1, R(3 * k)), ["#F27AA0", "#FFF0A0", "#F6A050", "#FFFFFF"][i % 4]); }
}
function fountain(c, V, t, a) {
  if (a <= 0) return; const g = fade(c, a), { x, z, r } = FOUNTAIN, [bx, by, k] = V.P(x, 0, z);
  shadow(c, bx, by, r * k * 1.2, r * k * 0.8, 0.4 * a);
  g.poly(ringPts(V, x, 0, z, r + 14, 0, Math.PI * 2, 40), MARBLE[3]); g.poly(ringPts(V, x, 38, z, r + 14, 0, Math.PI * 2, 40), MARBLE[6]);
  g.poly(ringPts(V, x, 30, z, r, 0, Math.PI * 2, 40), null, (px, py) => col3(RAMP.teal, 4.6 + 1.2 * Math.sin(px * 0.3 + py * 0.5 + t * 3), px, py));
  for (let i = 0; i < 3; i++) { const rr = ((t * 50 + i * (r / 3)) % r); g.poly(ringPts(V, x, 31, z, rr + 3, 0, Math.PI * 2, 36), null, () => null); const pts = ringPts(V, x, 31, z, rr, 0, Math.PI * 2, 36); for (const [px, py] of pts) g.px(R(px), R(py), "#BFF0EC"); }
  // the central basin and spout
  g.poly(ringPts(V, x, 70, z, 34, 0, Math.PI * 2, 20), MARBLE[6]); const top = V.P(x, 150, z), base = V.P(x, 70, z); g.rect(R(top[0]) - 1, R(top[1]), 3, R(base[1] - top[1]), "#DFFAF8");
  for (let i = 0; i < 18; i++) { const u = ((t * 0.9 + i / 18) % 1), an = (i / 18) * Math.PI * 2, rr = 40 * u, yy = 150 + 40 * u - 120 * u * u, p = V.P(x + Math.cos(an) * rr, Math.max(32, yy), z + Math.sin(an) * rr); g.px(R(p[0]), R(p[1]), u < 0.8 ? "#E8FFFF" : "#9AD8E0"); }
}
function postClock(c, V, x, z, t, h, a) {
  if (a <= 0) return; const g = fade(c, a), G = V.bill(x, z, 1, 0.86), k = G.z;
  shadow(c, G.bx, G.by, 20 * k, 6 * k, 0.45 * a);
  g.rect(R(G.X(-4)), R(G.Y(-260)), Math.max(2, R(8 * k)), R(G.Y(0) - G.Y(-260)), RAMP.black[3]); g.rect(R(G.X(-4)), R(G.Y(-260)), 1, R(G.Y(0) - G.Y(-260)), RAMP.black[6]);
  g.ellipse(R(G.bx), R(G.by), Math.max(1, R(18 * k)), Math.max(1, R(6 * k)), RAMP.black[2]);
  const cx = G.bx, cy = G.Y(-280), r = 34 * k;
  g.disc(R(cx), R(cy), Math.max(2, R(r + 3 * k)), RAMP.gold[3]); g.disc(R(cx), R(cy), Math.max(2, R(r)), "#FBF4E2");
  for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2; g.px(R(cx + Math.sin(an) * r * 0.82), R(cy - Math.cos(an) * r * 0.82), "#3A3040"); }
  const hh = ((h % 12) + 12) % 12, mm = (h - Math.floor(h)) * 60, hand = (an, len, w) => { for (let s2 = 0; s2 <= 10; s2++) { const u = s2 / 10; g.rect(R(cx + Math.sin(an) * len * u) - (w >> 1), R(cy - Math.cos(an) * len * u) - (w >> 1), w, w, "#1A1424"); } };
  hand((hh / 12) * Math.PI * 2, r * 0.5, Math.max(1, R(3 * k))); hand((mm / 60) * Math.PI * 2, r * 0.8, Math.max(1, R(2 * k)));
}
function pendant(c, V, x, z, k, lit = 1) {
  const [sx, sy, kk] = V.P(x, 250, z); if (sy < -40 || sy > 1000) return;
  glow(c, sx, sy + 20 * kk, 120 * kk, 80 * kk, "#FFD890", 0.22 * lit);
  c.ellipse(R(sx), R(sy), Math.max(2, R(30 * kk)), Math.max(1, R(9 * kk)), RAMP.gold[3]); c.ellipse(R(sx), R(sy) + 1, Math.max(1, R(24 * kk)), Math.max(1, R(6 * kk)), "#FFE6A8");
}

// ---------------------------------------------------------------- people
const roulBall = (seed, t) => { const per = 9 + rnd(seed) * 4, off = rnd(seed + 3) * per, cyc = Math.floor((t + off) / per), u = t + off - cyc * per, t0 = t - u + 0.5; return ballState(t, { t0, tDrop: t0 + 4.2, tLand: t0 + 5.6, from: [0, 32, 15, 19][cyc & 3], to: [5, 24, 16, 33][(cyc + 1) & 3], turns: 5 }, (tt) => 1.4 * tt + seed); };
function guestsOld() {
  const out = []; let s = 3;
  const look = () => LOOKS[GUEST_LOOKS[Math.floor(rnd(s++ * 7) * GUEST_LOOKS.length)]];
  for (const is of ISLANDS) for (let i = 0; i < is.n; i++) if (rnd(is.x * 3 + is.z + i) < 0.42) out.push({ x: is.x + (i - (is.n - 1) / 2) * 82 + 12, z: is.z + 66, look: look(), seed: s, mirror: rnd(s) < 0.5 });
  for (const col of COLUMNS) for (let i = 0; i < col.n; i += 2) if (rnd(col.x + i * 5) < 0.5) out.push({ x: col.x + 14, z: col.z - i * col.dz + 60, look: look(), seed: s, mirror: false });
  for (const tb of TABLES_OLD) { const slots = tb.kind === "roulette" ? [[102, 30, true], [102, -60, true], [-102, -60, false]] : tb.id === "c2" ? [[-128, -10, false], [-96, 60, false]] : [[-128, -10, false], [128, 0, true], [-96, 60, false]]; for (const [dx, dz, m] of slots) out.push({ x: tb.x + dx, z: tb.z + dz, look: look(), seed: s, mirror: m }); }
  for (const [x, z] of RESTO) out.push({ x: x - 70, z: z + 10, look: look(), seed: s, mirror: false });
  return out;
}
const GUESTS_OLD = guestsOld();
export const GUESTS_NEW = [{ x: 1695, z: -934, look: LOOKS.dress, seed: 41 }, { x: 2410, z: -554, look: LOOKS.sweater, seed: 42 }, { x: 2614, z: -1574, look: LOOKS.navy, seed: 43, mirror: true }, { x: 1432, z: -1990, look: LOOKS.gray, seed: 44 }, { x: 1688, z: -1980, look: LOOKS.teal, seed: 45, mirror: true }, { x: 1890, z: -1060, look: LOOKS.mustard, seed: 46 }, { x: 2560, z: -2060, look: LOOKS.suit, seed: 47 }];
export const WALK_NEW = [{ pts: [[1820, -1700], [2400, -1700], [2400, -900], [1820, -900], [1820, -1700]], v: 55, look: "suit", off: 100 }, { pts: [[1250, -200], [2700, -200], [2700, -330], [1250, -330], [1250, -200]], v: 45, look: "teal", off: 900 }];
/** Guests strolling the aisles: closed loops of waypoints (cm), speed cm/s. */
export const WALK_LOOPS = [
  { pts: [[-120, -300], [-120, -620], [-480, -620], [-480, -900], [-120, -900], [-120, -300]], v: 70, look: "navy", off: 0 },
  { pts: [[260, -560], [260, -1180], [880, -1180], [880, -560], [260, -560]], v: 80, look: "dress", off: 300 },
  { pts: [[-660, -1380], [-120, -1380], [-120, -1160], [-660, -1160], [-660, -1380]], v: 60, look: "mustard", off: 500 },
];
export function pathAt(pts, s) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); s = ((s % L) + L) % L;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); if (s <= l) { const u = s / l; return { x: lerp(pts[i - 1][0], pts[i][0], u), z: lerp(pts[i - 1][1], pts[i][1], u), dx: pts[i][0] - pts[i - 1][0], dz: pts[i][1] - pts[i - 1][1] }; } s -= l; }
  const q = pts[pts.length - 1]; return { x: q[0], z: q[1], dx: 0, dz: 0 }; }

// ---------------------------------------------------------------- the whole house
export function drawHouse(c, V, t, st = {}) {
  drawFloor(c, V, t, st);
  const items = [], dark = st.dark ?? 0, grow = st.grow ?? 0, wallsUp = st.walls ?? ease(clamp01((grow - 0.15) / 0.75)), life = st.life ?? 1;
  const lowK = ease(st.low ?? 0), archK = ease(st.arch ?? 0), Hb = lerp(OLD.H, CUT_H, lowK);
  const W = (it) => items.push(it);
  // ---- walls of the old casino (chunks so the depth sort works)
  const wallFaceNew = (x, y, z, px, py) => col3(SAND, 3.4, px, py);
  const wallFaceOld = (axis, sign) => (x, y, z, px, py) => oldWall(axis === "z" ? x : -z * sign, y, px, py, dark, OLD.H);
  const backFace = (x, y, z, px, py) => {
    // lifts (hotel), air vents, then the damask wall
    for (const lx of [-230, 40]) if (Math.abs(x - lx) < 58 && y < 232) { if (Math.abs(x - lx) > 50 || y > 222) return col3(RAMP.gold, 4.6 - (y > 222 ? 0.6 : 0), px, py); return col3(RAMP.chrome, Math.abs(x - lx) < 1.5 ? 1.5 : 3.6 + 1.6 * (1 - y / 232), px, py); }
    for (const lx of [-230, 40]) if (Math.abs(x - lx) < 10 && y > 240 && y < 258) return "#FFD060";
    for (const vx of [-560, 560]) if (Math.abs(x - vx) < 58 && Math.abs(y - 286) < 20) { if (Math.abs(x - vx) > 52 || Math.abs(y - 286) > 15) return col3(RAMP.chrome, 4.6, px, py); return col3(RAMP.chrome, ((y + 300) % 7) < 3 ? 0.8 : 2.6, px, py); }
    return oldWall(x, y, px, py, dark, OLD.H);
  };
  const segs = (a, b, n) => { const out = []; for (let i = 0; i < n; i++) out.push([lerp(a, b, i / n), lerp(a, b, (i + 1) / n)]); return out; };
  const wallC = RAMP.wall[2];
  // the hotel tower behind the old casino
  { const od = (st.day ?? 0) * (1 - 0.85 * sm(st.sun ?? 0, 0.3, 1)), T = TOWER;
    W({ z: T.z1 - 1, draw: () => box(c, V, { x0: T.x0, x1: T.x1, y0: 0, y1: T.H, z0: T.z0, z1: T.z1 }, { s: (x, y, z, px, py) => towerFace(x, y, px, py, od), e: (x, y, z, px, py) => towerFace(-z, y, px, py, od * 0.8), w: (x, y, z, px, py) => towerFace(z, y, px, py, od * 0.7), top: (x, y, z, px, py) => col3(RAMP.black, 2 + 2 * od + (Math.abs(x) > T.x1 - 40 || z > T.z1 - 40 ? 2 : 0), px, py) }) }); }
  // back wall (full height: clock, vents, lifts)
  for (const [xa, xb] of segs(OLD.x0 - WT, OLD.x1 + WT, 2)) W({ z: OLD.z0 + WT / 2, draw: () => box(c, V, { x0: xa, x1: xb, y0: 0, y1: OLD.H, z0: OLD.z0 - WT / 2, z1: OLD.z0 + WT / 2 }, { s: backFace, top: CAP }) });
  // left wall (full height), right wall: sinks to the cut height as the new casino grows, its arch opens
  for (const [za, zb, i, n] of segs(OLD.z0 + WT / 2, OLD.z1 + WT, 6).map((s2, i) => [...s2, i, 6])) W({ z: zb, draw: () => box(c, V, { x0: OLD.x0 - WT, x1: OLD.x0, y0: 0, y1: OLD.H, z0: za, z1: zb }, { e: wallFaceOld("x", 1), s: i === n - 1 ? wallC : null, top: CAP }) });
  const rightSegs = [...segs(OLD.z0 + WT / 2, ARCH.z0, 4).map((s2) => [...s2, false]), [ARCH.z0, ARCH.z1, true], ...segs(ARCH.z1, OLD.z1 + WT, 2).map((s2) => [...s2, false])];
  rightSegs.forEach(([za, zb, isArch], i) => { const h = isArch ? Hb * (1 - archK) : Hb; if (h < 1) return;
    const open = archK > 0.001, s = i === rightSegs.length - 1 || (open && i === rightSegs.length - 3) ? wallC : null, n = open && i === rightSegs.length - 2 + 0 && false ? wallC : null;
    W({ z: zb, draw: () => box(c, V, { x0: OLD.x1, x1: OLD.x1 + WT, y0: 0, y1: h, z0: za, z1: zb }, { w: wallFaceOld("x", -1), e: wallFaceNew, s, n, top: CAP }) }); });
  // the front sill with the entrance gap, marquee bulbs on it
  const sillFace = (x, y, z, px, py) => { const bulb = y > SILL - 12 && ((x + 4000) % 40) < 14; if (bulb) return (Math.floor((x + 4000) / 40) + Math.floor(t * 6)) % 3 === 0 ? "#FFF6C8" : "#E09A30"; return col3(RAMP.wood, 2 + 1.4 * (y / SILL), px, py); };
  for (const [xa, xb] of [[OLD.x0 - WT, DOOR.x0], [DOOR.x1, OLD.x1 + WT]]) for (const [x0, x1] of segs(xa, xb, 3)) W({ z: OLD.z1 + WT, draw: () => box(c, V, { x0, x1, y0: 0, y1: SILL, z0: OLD.z1, z1: OLD.z1 + WT }, { s: sillFace, top: CAP, e: x1 === DOOR.x0 ? RAMP.wood[2] : null, w: x0 === DOOR.x1 ? RAMP.wood[2] : null }) });
  // ---- the new casino walls (rise with the growth)
  if (wallsUp > 0.001) {
    const Hn = NEW.H * wallsUp, sunPos = sunOnWall(st.sun ?? 0);
    const WB = { centers: BACK_WIN, hw: 120, y0: 130, ytop: 600 }, WS = { centers: SIDE_WIN, hw: 110, y0: 130, ytop: 600 };
    for (const [xa, xb] of segs(NEW.x0 + WT, NEW.x1 + WT, 2)) W({ z: NEW.z0 + WT / 2, draw: () => box(c, V, { x0: xa, x1: xb, y0: 0, y1: Hn, z0: NEW.z0 - WT / 2, z1: NEW.z0 + WT / 2 }, { s: (x, y, z, px, py) => newWall(x, y, px, py, st, WB, sunPos), top: CAP }) });
    segs(NEW.z0 + WT / 2, NEW.z1 + WT, 5).forEach(([za, zb], i) => W({ z: zb, draw: () => box(c, V, { x0: NEW.x1, x1: NEW.x1 + WT, y0: 0, y1: Hn, z0: za, z1: zb }, { w: (x, y, z, px, py) => newWall(-z, y, px, py, st, WS, null), s: i === 4 ? SAND[3] : null, top: CAP }) }));
    for (const [x0, x1] of segs(NEW.x0 + WT, NEW.x1 + WT, 3)) W({ z: NEW.z1 + WT, draw: () => box(c, V, { x0, x1, y0: 0, y1: SILL * wallsUp, z0: NEW.z1, z1: NEW.z1 + WT }, { s: (x, y, z, px, py) => col3(SAND, 3 + 2 * (y / SILL), px, py), top: CAP }) });
    // the big clock on the back wall, the skylight strip along its top
    W({ z: NEW.z0 + WT / 2 + 1, draw: () => wallClock(c, V, 2000, Math.min(Hn - 130, 470), NEW.z0 + WT / 2 + 1, 80, st.newClockT ?? 3, sm(wallsUp, 0.6, 0.9) * (st.clocks ?? 1), { glow: 0.4 * (1 - (st.sun ?? 0)) * (st.day ?? 1) }) });
    W({ z: NEW.z0 + 160, draw: () => skylight(c, V, t, Hn, sm(wallsUp, 0.8, 1), st.sun ?? 0) });
  }
  // the old clock (on the back wall, above the lifts)
  W({ z: OLD.z0 + WT / 2 + 1, draw: () => wallClock(c, V, -95, 266, OLD.z0 + WT / 2 + 1, 42, st.clockT ?? 11.2, st.clockA ?? 0) });
  // ---- old casino furniture
  for (const is of ISLANDS) {
    const xa = is.x - (is.n / 2) * 82 - 4, xb = is.x + (is.n / 2) * 82 + 4;
    W({ x: is.x, z: is.z - 70, draw: () => plinth(c, V, xa, is.z - 62, xb, is.z + 22) });
    for (const m of islandMachines(is)) W({ x: m.x, z: m.z - (m.back ? 1 : 0), draw: () => slotMachine(c, V.bill(m.x, m.z, 1, 0.9), t, { back: m.back, body: BODIES[(m.i + Math.abs(is.x / 7 | 0) + (m.back ? 2 : 0)) % 5], seed: m.i * 7 + is.x + is.z, lights: (1 - 0.5 * dark) * life + (st.flash?.(m.x, m.z) ?? 0) }) });
  }
  for (const col of COLUMNS) {
    W({ x: col.x, z: col.z - col.n * col.dz, draw: () => plinth(c, V, col.x - 36, col.z - (col.n - 1) * col.dz - 30, col.x + 36, col.z + 22) });
    for (let i = 0; i < col.n; i++) { const z = col.z - i * col.dz; W({ x: col.x, z, draw: () => slotMachine(c, V.bill(col.x, z, 1, 0.9), t, { body: BODIES[(i + Math.abs(col.x / 9 | 0)) % 5], seed: i * 11 + col.x, lights: (1 - 0.5 * dark) * life + (st.flash?.(col.x, z) ?? 0) }) }); }
  }
  for (const tb of TABLES_OLD) {
    const seed = TABLES_OLD.indexOf(tb) + 1;
    if (tb.kind === "roulette") {
      W({ x: tb.x, z: tb.z - 200, draw: () => drawDealer(c, V, tb.x, tb.z - 205, t + seed, { hands: [[tb.x - 30, TOP + 2, tb.z - 168], [tb.x + 30, TOP + 2, tb.z - 168]] }) });
      W({ x: tb.x, z: tb.z, draw: () => { const ang = 1.4 * t + seed; drawRouletteTable(c, V, tb, { wheel: { ang, ball: roulBall(seed, t) }, chips: [...(st.heroChips ?? []), { n: 20, count: 3 }, { n: 31, count: 4, ramp: CHIP_RAMPS.green }] }); } });
      W({ x: tb.x, z: tb.z + 1, draw: () => pendant(c, V, tb.x, tb.z - 40, 1, 1 - 0.4 * dark) });
    } else {
      W({ x: tb.x, z: tb.z - 80, draw: () => drawDealer(c, V, tb.x, tb.z - 78, t + tb.x, { hands: [[tb.x - 26, TOP + 2, tb.z - 36], [tb.x + 26, TOP + 2, tb.z - 36]] }) });
      W({ x: tb.x, z: tb.z, draw: () => cardTable(c, V, tb.x, tb.z, t) });
      W({ x: tb.x, z: tb.z + 1, draw: () => pendant(c, V, tb.x, tb.z - 20, 1, 1 - 0.4 * dark) });
    }
  }
  // restaurant: round tables; low partition walls (cut)
  for (const [x, z] of RESTO) W({ x, z, draw: () => restoTable(c, V, x, z, t, 1 - 0.4 * dark) });
  W({ z: -1990 + WT, draw: () => box(c, V, { x0: OLD.x0, x1: -600, y0: 0, y1: CUT_H, z0: -1990, z1: -1990 + WT }, { s: (x, y, z, px, py) => oldWall(x, y, px, py, dark, CUT_H), top: CAP, e: RAMP.wall[2] }) });
  for (const [za, zb] of segs(OLD.z0 + WT / 2, -1990 + WT, 2)) W({ z: zb, draw: () => box(c, V, { x0: -470 - WT, x1: -470, y0: 0, y1: CUT_H, z0: za, z1: zb }, { e: (x, y, z, px, py) => oldWall(-z, y, px, py, dark, CUT_H), w: RAMP.wall[2], s: RAMP.wall[2], top: CAP }) });
  // hotel desk + clerk
  W({ x: -90, z: DESK.z - 60, draw: () => drawPerson(c, V, -60, DESK.z - 60, t, idlePose(t, 9, { near: [14, -48] }), LOOKS.navy) });
  W({ x: -90, z: DESK.z + 30, draw: () => deskBlock(c, V, t) });
  // guests and walkers
  for (const g of GUESTS_OLD) W({ x: g.x, z: g.z + 0.5, draw: () => drawPerson(c, V, g.x, g.z, t, idlePose(t, g.seed), g.look, { mirror: g.mirror }) });
  for (const lp of WALK_LOOPS) { const s = lp.off + lp.v * t, p = pathAt(lp.pts, s); W({ x: p.x, z: p.z + 0.5, draw: () => drawPerson(c, V, p.x, p.z, t, walkPose(s), LOOKS[lp.look], { mirror: p.dx < 0 }) }); }
  // ---- new casino furniture (dissolves in with the growth, staggered by distance from the arch)
  if (grow > 0.05) {
    const appear = (x, z) => sm(grow * 2900 - Math.hypot(x - ARCH.x, z - ARCH.zc), 0, 500);
    for (const is of NEW_ISLANDS) for (const m of islandMachines(is)) { const a = appear(m.x, m.z); if (a > 0) W({ x: m.x, z: m.z - (m.back ? 1 : 0), draw: () => slotMachine(c, V.bill(m.x, m.z, 1, 0.9), t, { back: m.back, body: PALE[(m.i + (m.back ? 1 : 0)) % 5], seed: m.i * 5 + is.z, lights: 0.6, a }) }); }
    for (const [i, [x, z]] of PALMS.entries()) { const a = appear(x, z) * sm(st.plants ?? 1, i * 0.06, 0.55 + i * 0.06); if (a > 0) W({ x, z, draw: () => palm(c, V, x, z, t, ease(a), i * 1.7) }); }
    { const a = appear(FOUNTAIN.x, FOUNTAIN.z); if (a > 0) W({ x: FOUNTAIN.x, z: FOUNTAIN.z, draw: () => fountain(c, V, t, a) }); }
    for (const [x, z] of POST_CLOCKS) { const a = appear(x, z) * (st.clocks ?? 1); if (a > 0) W({ x, z, draw: () => postClock(c, V, x, z, t, st.newClockT ?? 3, a) }); }
    for (const tb of TABLES_NEW) { const a = appear(tb.x, tb.z); if (a > 0.5) { W({ x: tb.x, z: tb.z - 80, draw: () => drawDealer(c, V, tb.x, tb.z - 78, t + 7, { a, hands: [[tb.x - 26, TOP + 2, tb.z - 36], [tb.x + 26, TOP + 2, tb.z - 36]] }) }); W({ x: tb.x, z: tb.z, draw: () => cardTable(c, V, tb.x, tb.z, t) }); } }
    for (const g of GUESTS_NEW) { const a = appear(g.x, g.z) * sm(grow, 0.5, 0.9); if (a > 0) W({ x: g.x, z: g.z + 0.5, draw: () => drawPerson(c, V, g.x, g.z, t, idlePose(t, g.seed), g.look, { mirror: g.mirror, a }) }); }
    for (const lp of WALK_NEW) { const s = lp.off + lp.v * t, p = pathAt(lp.pts, s), a = sm(grow, 0.6, 1); W({ x: p.x, z: p.z + 0.5, draw: () => drawPerson(c, V, p.x, p.z, t, walkPose(s), LOOKS[lp.look], { mirror: p.dx < 0, a }) }); }
    // flower boxes under the back windows
    for (const wx of BACK_WIN) { const a = appear(wx, NEW.z0 + 60) * sm(st.plants ?? grow, 0, 1); if (a > 0) W({ x: wx, z: NEW.z0 + 70, draw: () => flowerBox(c, V, wx, NEW.z0 + 50, t, a) }); }
  }
  for (const it of st.items ?? []) items.push(it);
  items.sort((p, q) => p.z - q.z);
  for (const it of items) if (it.x === undefined || (V.depth(it.x, 80, it.z) > 140 && Math.abs(V.P(it.x, 0, it.z)[0] - 270) < 700)) it.draw(c, V, t);
}
/** Where the sun sits on the back wall (u, y, window centre) for sun 0..1: high in the 2nd window, sinking to its sill. */
export function sunOnWall(sun) { return [1766 + lerp(-30, 40, sun), lerp(560, 150, ease(sun)), 1766]; }
function skylight(c, V, t, Hn, a, sun) {
  if (a <= 0) return; const g = fade(c, a), z0 = NEW.z0 + WT / 2, z1 = NEW.z0 + 150, y = Hn;
  const quad = (xa, xb, za, zb) => [P2(V, xa, y, za), P2(V, xb, y, za), P2(V, xb, y, zb), P2(V, xa, y, zb)];
  const glass = mix("#A8D8F0", "#F0A060", sm(sun, 0.3, 0.9));
  g.poly(quad(NEW.x0 + WT, NEW.x1, z0, z1), null, (px, py) => ((px + py * 2) % 4 === 0 ? glass : null));
  for (let x = NEW.x0 + WT; x <= NEW.x1; x += 200) g.poly(quad(x - 6, x + 6, z0, z1), SAND[6]);
  g.poly(quad(NEW.x0 + WT, NEW.x1, z1 - 8, z1), SAND[6]);
}
export { pendant, palm, postClock, plinth };
