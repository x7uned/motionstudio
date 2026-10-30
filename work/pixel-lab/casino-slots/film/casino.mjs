// ============================================================================================================================
// CASINO KIT v1 (Kagenami «Casino secrets» series, built for film 1 casino-math, 2026-10-27). Films 2–5: copy every
// casino*.mjs + hero.mjs into your own film/ folder as a frozen copy and extend it there; never edit this folder.
//
// One warm casino at night, drawn through a real perspective camera, so every move has parallax and everything stays
// pixel-crisp at any zoom (nothing is a scaled bitmap). World units = cm; x right, y up, z toward the camera.
//
// casino-core.mjs    makeView(cam) → V { P(x,y,z) → [sx,sy,k], k(), ray(), bill(x,z,unit,vf,mirror) → G, toRig(G,sx,sy) },
//                    camAt(keys, t) / blendCam (eased dolly, log distance), RAMP (carpet gold teal felt wood maple leather
//                    wall chrome red black green ivory blue purple yellow skin shirt vest glass), UI colours, rampAt,
//                    shadePoly, glow, shadow, ringPts, sectorPts, flatPts, rrectXZ, bbox, onScreen, sm, ease, lerp, win, rnd.
//                    A camera key: { tx, ty, tz, D, pitch, f = 1100, sx0 = 270, sy0 = 400 }.
// casino.mjs (this)  drawCasino(c, V, t, o) — floor (patterned red carpet with lamp pools), back wall (wood wainscot,
//                    damask, sconces), the slot row along the wall, the floor plan TABLES (roulette, card tables, slot
//                    islands) with dealers and guests, aisle walkers, chandeliers, foreground rope rail. The film puts its
//                    own hero table into the depth sort with o.items = [{ z, draw(c, V, t) }] and hides the kit's table
//                    at that place with o.skip = ["hero"]. o.life (0..1) scales the background action.
// casino-roulette.mjs  POCKETS (European order), isRed, colorOf, pocketRel, ballState(t, spin, wheelAng) (pure function
//                    of t: flick → track → bounces over the frets → settles), drawWheel(c, V, x, y, z, st),
//                    drawRouletteTable(c, V, T, st) (rail, body, felt + lamp pool, 0/1–36/outside layout, chip bank,
//                    wheel, chips), cellLocal(n), WHEEL, BANK, FELT, TOP (felt height 76).
// casino-props.mjs   chipStack(c, V, x, y, z, n, ramp, { sway, glow, a }), stackTop, CHIP, CHIP_RAMPS, coin, card (rank +
//                    suit, flat on the felt), slotMachine(c, G, t, { body, reels, win, lights, seed, back }) with
//                    cherry/bell/BAR/7/gem reels, idleReels(seed, t), stool, ropePosts, cardTable (half-moon).
// casino-people.mjs  drawPerson(c, V, x, z, t, pose, look, { mirror, a }) (the hero's rig with LOOKS.teal / suit / mustard
//                    / dress / navy / sweater / gray), drawDealer(c, V, x, z, t, { hands: [[x,y,z],[x,y,z]], smile, nod }),
//                    idlePose, cheerPose, clapPose, walkPose, LOOKS, GUEST_LOOKS.
// hero.mjs           drawHero(c, G, t, pose, look) — «you» (coral puffer, purple bobble hat, blue scarf, yellow mittens),
//                    adapted copy of touch/film/hero.mjs; REST pose, HERO_LOOK.
//
// Typical frame:  const V = makeView(camAt(CAM_KEYS, t)); drawCasino(c, V, t, { skip: ["hero"], items: [{ z: 0, draw: myTable }] });
// Speed: ≈ 40–90 ms a frame on this machine (floor and wall are per-pixel, written straight into c.d).
// ============================================================================================================================
import { hex, bayer } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, sm, ease, lerp, rnd, mix, fade, glow, shadow, bbox, onScreen } from "./casino-core.mjs";
import { slotMachine, stool, ropePosts, cardTable, chipStack, CHIP_RAMPS } from "./casino-props.mjs";
import { drawRouletteTable, ballState, TOP, WHEEL } from "./casino-roulette.mjs";
import { drawPerson, drawDealer, idlePose, walkPose, LOOKS, GUEST_LOOKS } from "./casino-people.mjs";
export * from "./casino-core.mjs";

export const WALL_Z = -1760, WALL_H = 540;
/** The floor plan. Each entry: { id, kind: "roulette" | "cards" | "island", x, z, n (machines in an island) }. */
export const TABLES = [
  { id: "hero", kind: "roulette", x: 0, z: 0 },
  { id: "r-left", kind: "roulette", x: -560, z: 0 }, { id: "r-right", kind: "roulette", x: 560, z: 0 },
  { id: "c-left", kind: "cards", x: -400, z: -480 }, { id: "c-right", kind: "cards", x: 400, z: -480 },
  { id: "i-fl", kind: "island", x: -980, z: -480, n: 4 }, { id: "i-fr", kind: "island", x: 980, z: -480, n: 4 },
  { id: "r-back-l", kind: "roulette", x: -380, z: -920 }, { id: "r-back-r", kind: "roulette", x: 380, z: -920 },
  { id: "c-back-l", kind: "cards", x: -900, z: -920 }, { id: "c-back-r", kind: "cards", x: 900, z: -920 }, { id: "c-back-m", kind: "cards", x: 0, z: -940 },
  { id: "i-l", kind: "island", x: -560, z: -1330, n: 5 }, { id: "i-m", kind: "island", x: 0, z: -1330, n: 3 }, { id: "i-r", kind: "island", x: 560, z: -1330, n: 5 },
  { id: "i-l2", kind: "island", x: -1150, z: -1330, n: 4 }, { id: "i-r2", kind: "island", x: 1150, z: -1330, n: 4 },
  { id: "c-front-l", kind: "cards", x: -330, z: 500 }, { id: "c-front-r", kind: "cards", x: 330, z: 500 },
  { id: "r-far-l", kind: "roulette", x: -1120, z: 0 }, { id: "r-far-r", kind: "roulette", x: 1120, z: 0 },
];
const LAMPS = TABLES.filter((tb) => tb.kind !== "island").map((tb) => [tb.x, tb.z - (tb.kind === "roulette" ? 40 : 0)]);
const BODIES = [RAMP.purple, RAMP.blue, RAMP.red, RAMP.teal, RAMP.green];

// ---------------------------------------------------------------- per-pixel floor and wall
const RGB = {}; for (const k of ["carpet", "gold", "teal", "wall", "wood"]) RGB[k] = RAMP[k].map(hex);
const B4 = new Float32Array(16); for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) B4[y * 4 + x] = bayer(x, y);
function put(d, i, ramp, level, x, y) { const l = level < 0 ? 0 : level > 7 ? 7 : level, lo = l | 0, idx = l - lo > B4[(y & 3) * 4 + (x & 3)] ? Math.min(7, lo + 1) : lo, col = ramp[idx]; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; }
const TILE = 72;
/** Carpet: diamond lattice in gold, teal rosettes, gold corner studs, a darker inner diamond. Returns [ramp, level offset]. */
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
function lightAt(x, z, lamps) {
  let L = 0.04; for (let i = 0; i < lamps.length; i++) { const dx = x - lamps[i][0], dz = z - lamps[i][1]; L += 0.95 * Math.exp(-(dx * dx + dz * dz) / 46000); }
  L += 0.45 * Math.exp(-(z - (WALL_Z + 60)) / 140);           // the glow of the slot row along the wall
  return L > 1.15 ? 1.15 : L;
}
function drawFloorWall(c, V, t) {
  const d = c.d, { cam } = V;
  for (let py = 0; py < 960; py++) {
    const [a0, dy, dz] = V.ray(0, py), da = 1 / V.f;
    if (dy < 0) {
      const tf = -cam.y / dy, zf = cam.z + tf * dz;
      if (zf >= WALL_Z) {
        const pxcm = V.f / (tf * Math.hypot(1, dy, dz) / Math.hypot(1, dy, dz)) / 1, lamps = LAMPS.filter((l) => Math.abs(l[1] - zf) < 700);
        for (let px = 0; px < 540; px++) { const x = cam.x + tf * (a0 + px * da), [ramp, off] = carpet(x, zf, V.f / tf), L = lightAt(x, zf, lamps); put(d, (py * 540 + px) * 3, ramp, off + 0.7 + 4.9 * L, px, py); }
        void pxcm; continue;
      }
    }
    // the back wall (or the dark cove above it)
    const tw = (WALL_Z - cam.z) / dz, yw = cam.y + tw * dy;
    for (let px = 0; px < 540; px++) {
      const x = cam.x + tw * (a0 + px * da), i = (py * 540 + px) * 3;
      if (yw > WALL_H) { put(d, i, RGB.wall, 0.6 + 0.8 * Math.exp(-(yw - WALL_H) / 120), px, py); continue; }
      const sc = x / 300 - Math.floor(x / 300) - 0.5, sconce = Math.exp(-((sc * 300) ** 2) / 9000 - ((yw - 330) ** 2) / 14000), low = Math.exp(-yw / 160) * 0.8;
      const Lw = 0.25 + 0.9 * sconce + low;
      if (yw < 14) put(d, i, RGB.wood, 1 + Lw * 2, px, py);
      else if (yw < 122) { const pu = x / 150 - Math.floor(x / 150), frame = pu < 0.07 || pu > 0.93 || yw < 24 || yw > 112; put(d, i, RGB.wood, (frame ? 2.6 : 1.8) + Lw * 2.6 - (Math.abs(pu - 0.07) < 0.012 ? 1 : 0), px, py); }
      else if (yw < 130) put(d, i, RGB.gold, 2 + Lw * 3, px, py);
      else if (yw > WALL_H - 50) put(d, i, yw > WALL_H - 44 && yw < WALL_H - 38 ? RGB.gold : RGB.wood, 1.6 + Lw * 2.4, px, py);
      else { const u = x / 64, v = yw / 64, fu = u - Math.floor(u) - 0.5, fv = v - Math.floor(v) - 0.5, dd = Math.abs(fu) + Math.abs(fv) * 0.8, motif = Math.abs(dd - 0.42) < 0.03 || Math.hypot(fu, fv) < 0.06;
        put(d, i, motif ? RGB.gold : RGB.wall, (motif ? 0.6 : 1.4) + Lw * 3.6, px, py); }
    }
  }
  // sconces on the wall
  for (let x = -3000; x <= 3000; x += 300) { const [sx, sy, k] = V.P(x + 150, 330, WALL_Z + 2); if (sx < -20 || sx > 560 || sy < -20 || sy > 980) continue; c.rect(R(sx - 2 * k), R(sy), Math.max(1, R(4 * k)), Math.max(1, R(14 * k)), RAMP.gold[4]); c.ellipse(R(sx), R(sy - 3 * k), Math.max(1, R(6 * k)), Math.max(1, R(4 * k)), "#FFE9B0"); glow(c, sx, sy - 3 * k, 46 * k, 40 * k, "#FFC870", 0.45); }
}

// ---------------------------------------------------------------- background actors
const wheelAngBg = (seed) => (t) => 1.4 * t + seed * 2.1;
function bgSpin(seed, t) {
  const per = 9 + rnd(seed) * 4, off = rnd(seed + 3) * per, cyc = Math.floor((t + off) / per), u = t + off - cyc * per;
  const from = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34][Math.floor(rnd(seed * 7 + cyc - 1) * 10)], to = [5, 24, 16, 33, 1, 20, 14, 31, 9, 22][Math.floor(rnd(seed * 7 + cyc) * 10)];
  const t0 = t - u + 0.5; return ballState(t, { t0, tDrop: t0 + 4.2, tLand: t0 + 5.6, from, to, turns: 5 }, wheelAngBg(seed));
}
function guestsFor(tb) {
  const out = [], s = TABLES.indexOf(tb) * 13 + 5;
  if (tb.kind === "roulette") { const slots = [[-102, 50, false], [-102, -40, false], [102, 30, true], [102, -60, true]]; slots.forEach(([dx, dz, m], i) => { if (rnd(s + i) < 0.75) out.push({ x: tb.x + dx, z: tb.z + dz, mirror: m, look: LOOKS[GUEST_LOOKS[Math.floor(rnd(s * 3 + i) * GUEST_LOOKS.length)]], seed: s + i }); }); }
  if (tb.kind === "cards") { const slots = [[-128, -10, false], [128, 0, true], [-96, 60, false]]; slots.forEach(([dx, dz, m], i) => { if (rnd(s + i + 9) < 0.8) out.push({ x: tb.x + dx, z: tb.z + dz, mirror: m, look: LOOKS[GUEST_LOOKS[Math.floor(rnd(s * 5 + i) * GUEST_LOOKS.length)]], seed: s + i }); }); }
  if (tb.kind === "island") { for (let i = 0; i < tb.n; i++) if (rnd(s + i * 3) < 0.5) out.push({ x: tb.x + (i - (tb.n - 1) / 2) * 82 + 10, z: tb.z + 70, mirror: rnd(s + i) < 0.5, look: LOOKS[GUEST_LOOKS[Math.floor(rnd(s * 7 + i) * GUEST_LOOKS.length)]], seed: s + i, play: true }); }
  return out;
}
const GUESTS = new Map(TABLES.map((tb) => [tb.id, guestsFor(tb)]));
const WALKERS = [[-1120, 70, 1, "navy"], [-700, -80, 2, "dress"], [-262, 64, 3, "suit"], [262, -72, 4, "mustard"], [-1120, -60, 5, "sweater"], [-700, 90, 6, "gray"], [-262, -55, 7, "teal"]];
const CHANDELIERS = []; for (const x of [-900, -300, 300, 900]) for (const z of [-1520, -1080, -680, -240, 260]) CHANDELIERS.push([x, z]);

function chandelier(c, V, x, z, t, a) {
  if (V.depth(x, 430, z) < 300) return;
  const [sx, sy, k] = V.P(x, 430, z); if (sx < -60 || sx > 600 || sy < -60 || sy > 1020) return;
  const g = fade(c, a), r = 34 * k;
  glow(c, sx, sy + 8 * k, r * 2.6, r * 1.8, "#FFD890", 0.42 * a);
  for (let ring = 0; ring < 3; ring++) { const rr = r * (1 - ring * 0.3), yy = sy + ring * 7 * k; for (let i = 0; i < 12 - ring * 3; i++) { const ang = (i / (12 - ring * 3)) * Math.PI * 2 + ring * 0.4 + t * 0.15, px = sx + Math.cos(ang) * rr, py = yy + Math.sin(ang) * rr * 0.35, tw = 0.5 + 0.5 * Math.sin(t * 3 + i * 1.7 + x);
    g.px(R(px), R(py), tw > 0.8 ? "#FFFFFF" : "#FFE6A8"); if (k > 0.5) { g.px(R(px), R(py) + 1, "#E8B860"); g.px(R(px), R(py) + 2, "#C88A30"); } } }
  g.ellipse(R(sx), R(sy + 4 * k), Math.max(1, R(r * 0.3)), Math.max(1, R(r * 0.14)), RAMP.gold[5]);
}

/**
 * Draw the whole casino for camera V at time t.
 * o = { skip: [table ids], items: [{ z, draw(c, V, t) }], life: 0..1, rope: true, chandeliers: 0..1 (auto by camera height) }.
 */
export function drawCasino(c, V, t, o = {}) {
  drawFloorWall(c, V, t);
  const items = [], skip = new Set(o.skip ?? []), life = o.life ?? 1;
  // the slot row along the back wall
  for (let i = -30; i <= 30; i++) { const x = i * 84, z = WALL_Z + 58; items.push({ x, z, draw: () => slotMachine(c, V.bill(x, z, 1, 0.9), t, { body: BODIES[(i + 40) % 5], seed: i + 50, lights: life }) }); }
  for (const tb of TABLES) {
    if (skip.has(tb.id)) continue;
    const gs = GUESTS.get(tb.id);
    if (tb.kind === "island") {
      for (let i = 0; i < tb.n; i++) { const x = tb.x + (i - (tb.n - 1) / 2) * 82; items.push({ x, z: tb.z - 1, draw: () => slotMachine(c, V.bill(x, tb.z - 40, 1, 0.9), t, { back: true, body: BODIES[(i + 2) % 5] }) }); items.push({ x, z: tb.z, draw: () => slotMachine(c, V.bill(x, tb.z, 1, 0.9), t, { body: BODIES[(i + tb.x / 7 + 10) % 5 | 0], seed: i * 7 + tb.x, lights: life }) }); }
    } else if (tb.kind === "roulette") {
      const seed = TABLES.indexOf(tb) + 1;
      items.push({ x: tb.x, z: tb.z - 200, draw: () => drawDealer(c, V, tb.x, tb.z - 205, t + seed, { hands: [[tb.x - 30, TOP + 2, tb.z - 168], [tb.x + 30, TOP + 2, tb.z - 168]] }) });
      items.push({ x: tb.x, z: tb.z, draw: () => { const ang = wheelAngBg(seed)(t); drawRouletteTable(c, V, tb, { wheel: { ang, ball: bgSpin(seed, t) }, chips: [{ n: 7 + seed, count: 3, ramp: CHIP_RAMPS.blue }, { n: 20 - seed, count: 2 }, { n: 31, count: 4, ramp: CHIP_RAMPS.green }] }); } });
    } else {
      items.push({ x: tb.x, z: tb.z - 80, draw: () => drawDealer(c, V, tb.x, tb.z - 78, t + tb.x, { hands: [[tb.x - 26, TOP + 2, tb.z - 36], [tb.x + 26, TOP + 2, tb.z - 36]] }) });
      items.push({ x: tb.x, z: tb.z, draw: () => cardTable(c, V, tb.x, tb.z, t) });
      for (const [dx, dz] of [[-40, 62], [0, 70], [40, 62]]) items.push({ x: tb.x + dx * 1.3, z: tb.z + dz + 20, draw: () => stool(c, V, tb.x + dx * 1.3, tb.z + dz + 20) });
    }
    for (const gst of gs) items.push({ x: gst.x, z: gst.z + 0.5, draw: () => drawPerson(c, V, gst.x, gst.z, t, gst.play ? { ...idlePose(t, gst.seed), near: [14, -60 + Math.sin(t * 2 + gst.seed) * 2] } : idlePose(t, gst.seed), gst.look, { mirror: gst.mirror }) });
  }
  // aisle walkers (wrap far off screen)
  WALKERS.forEach(([z, v, seed, look]) => { const span = 3600, x0 = rnd(seed) * span, raw = x0 + v * t, x = ((raw % span) + span) % span - span / 2;
    items.push({ x, z, draw: () => drawPerson(c, V, x, z, t, walkPose(Math.abs(raw)), LOOKS[look], { mirror: v < 0 }) }); });
  for (const it of o.items ?? []) items.push(it);
  items.sort((p, q) => p.z - q.z);
  // cull what is behind or right under the camera (film items without x are always drawn)
  for (const it of items) if (it.x === undefined || (V.depth(it.x, 80, it.z) > 140 && Math.abs(V.P(it.x, 0, it.z)[0] - 270) < 900)) it.draw(c, V, t);
  // foreground: rope rail near the camera, chandeliers above everything (only when the camera is above them)
  if (o.rope !== false && V.depth(0, 90, 760) > 400) ropePosts(c, V, [[-900, 760], [-450, 760], [450, 760], [900, 760]], t);
  const ca = o.chandeliers ?? 0;
  if (ca > 0) for (const [x, z] of CHANDELIERS) chandelier(c, V, x, z, t, ca);
}
export { TOP, WHEEL };
