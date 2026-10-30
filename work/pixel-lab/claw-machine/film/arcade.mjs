// The one persistent world: a night arcade with our own cut-away claw machine (world x 26–316, pink cabinet «PRIZE CLAW»),
// its open side service unit (x 318–504) and a neighbour teal «SKILL» machine at NX. Our own plush toys (bunny, bear,
// cube, chick, black kitten) — no licensed characters, no maker logos. Static parts (wall, carpet, cabinets, glass back,
// gantry, the toy piles) are baked once into a world-wide layer and copied each frame with the camera pan; plush prizes
// that move are baked into small sprites and blitted (nearest, optional squash, dithered alpha).
import { Canvas, bayer, mix, MAIN, TINY, fade } from "../../../../renderer/pixel/raster.mjs";
import { blob, flat, ell, tube, eye, blush, nose, smile, RAMP, C } from "./cute.mjs";
import { NX, GLASS, RAIL_Y, CHUTE, SLOT, DOOR, HEAD, GAUGE, COUNTER } from "./timeline.mjs";

const R = Math.round, H = 960, WW = 1060;
export const NX3 = NX + 340;
const hash = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const MINT = ["#0A2620", "#124638", "#1C6A52", "#2A906E", "#44B48C", "#6CD2AA", "#A0EACA", "#D8FAEA"];
export const PINKCAB = ["#2A0614", "#4E0C26", "#7A163A", "#A8224E", "#D03A66", "#EC6A8C", "#F8A2B8", "#FFD8E2"];
export const TEALCAB = ["#04161C", "#0A2C36", "#124654", "#1C6676", "#2A8A9A", "#46AEBC", "#7ED2DA", "#BCEEF0"];
const WALL = ["#08050F", "#0E0919", "#140D24", "#1B1230", "#22173C"];
const METAL = ["#141826", "#232A3C", "#36405A", "#4E5A78", "#6E7C9A", "#98A4BE", "#C6CEDE"];

// ---------------------------------------------------------------- plush toys (our own designs)
/** Draw one plush toy centred at (x, y), size s (≈ body radius). kinds: bunny, bear, cube, chick, kitten. */
export function plush(c, kind, x, y, s, o = {}) {
  const ramp = o.ramp, dark = o.dark ?? 0, look = o.look ?? [0, 0];
  const bead = (ex, ey, r) => eye(c, ex, ey, r, { pupil: "bead", iris: RAMP.ink, outline: "#07060E" });
  const sh = { light: [-0.6, -0.85], base: 3.3 - dark, gain: 2.2, thick: Math.max(8, s * 0.8) };
  if (kind === "bunny") {
    const rp = ramp ?? RAMP.pink;
    for (const sd of [-1, 1]) { const e = tube([[x + sd * 5, y - s + 5], [x + sd * 8, y - s - 8], [x + sd * 9 + sd * 2, y - s - 17]], 4.6, 3.6); blob(c, [e], { ramp: rp, ...sh, thick: 5 }); flat(c, [tube([[x + sd * 5.5, y - s + 3], [x + sd * 8.4, y - s - 8], [x + sd * 9.6, y - s - 14]], 1.6, 1.2)], mix(rp[6], "#FFFFFF", 0.3)); }
    blob(c, [ell(x, y + 1, s, s * 0.92)], { ramp: rp, ...sh });
    bead(x - s * 0.38, y - 1, Math.max(1.8, s * 0.13)); bead(x + s * 0.38, y - 1, Math.max(1.8, s * 0.13));
    nose(c, x, y + s * 0.2, 1.6, "#B02050"); blush(c, x - s * 0.62, y + s * 0.3, 3, 2); blush(c, x + s * 0.62, y + s * 0.3, 3, 2);
  } else if (kind === "bear") {
    const rp = ramp ?? RAMP.brown;
    for (const sd of [-1, 1]) { blob(c, [ell(x + sd * s * 0.72, y - s * 0.72, s * 0.36, s * 0.36)], { ramp: rp, ...sh, thick: 5 }); flat(c, [ell(x + sd * s * 0.72, y - s * 0.7, s * 0.16, s * 0.16)], rp[3]); }
    blob(c, [ell(x, y + 1, s, s * 0.94)], { ramp: rp, ...sh });
    flat(c, [ell(x, y + s * 0.3, s * 0.42, s * 0.3)], rp[6]);
    bead(x - s * 0.36, y - s * 0.12, Math.max(1.8, s * 0.12)); bead(x + s * 0.36, y - s * 0.12, Math.max(1.8, s * 0.12));
    nose(c, x, y + s * 0.18, 2, "#2A140A"); smile(c, x, y + s * 0.34, 2, { col: "#3A1E0C" });
  } else if (kind === "cube") {
    const rp = ramp ?? MINT, k = s * 0.92;
    const sq = []; for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a), p = 6, rx = Math.sign(cx) * Math.pow(Math.abs(cx), 2 / p), ry = Math.sign(sy) * Math.pow(Math.abs(sy), 2 / p); sq.push([x + rx * k, y + ry * k * 0.95]); }
    blob(c, [sq], { ramp: rp, ...sh, gain: 1.6 });
    bead(x - s * 0.34, y - 1, Math.max(1.7, s * 0.12)); bead(x + s * 0.34, y - 1, Math.max(1.7, s * 0.12)); smile(c, x, y + s * 0.26, 2, { col: "#07060E" });
    blush(c, x - s * 0.6, y + s * 0.26, 2.5, 1.6); blush(c, x + s * 0.6, y + s * 0.26, 2.5, 1.6);
  } else if (kind === "chick") {
    const rp = ramp ?? RAMP.bee;
    blob(c, [ell(x, y + 1, s, s * 0.9)], { ramp: rp, ...sh });
    flat(c, [tube([[x - 1, y - s + 2], [x + 1, y - s - 4], [x + 4, y - s - 6]], 1.6, 1)], rp[3]);
    flat(c, [[[x - 3, y + 2], [x + 3, y + 2], [x, y + 6]]], "#F07A20", { outline: "#7A2E08" });
    bead(x - s * 0.36, y - s * 0.12, Math.max(1.7, s * 0.12)); bead(x + s * 0.36, y - s * 0.12, Math.max(1.7, s * 0.12));
    blush(c, x - s * 0.62, y + s * 0.2, 2.5, 1.6); blush(c, x + s * 0.62, y + s * 0.2, 2.5, 1.6);
  } else if (kind === "kitten") {
    const rp = ramp ?? RAMP.black;
    for (const sd of [-1, 1]) { blob(c, [[[x + sd * s * 0.25, y - s * 0.7], [x + sd * s * 0.9, y - s * 1.25], [x + sd * s * 0.95, y - s * 0.35]]], { ramp: rp, ...sh, thick: 4 }); flat(c, [[[x + sd * s * 0.48, y - s * 0.68], [x + sd * s * 0.82, y - s * 1.02], [x + sd * s * 0.82, y - s * 0.55]]], "#C84468"); }
    blob(c, [ell(x, y + 1, s, s * 0.9)], { ramp: rp, ...sh });
    for (const sd of [-1, 1]) eye(c, x + sd * s * 0.4, y - s * 0.05, Math.max(2.4, s * 0.22), { iris: RAMP.amber, pupil: "round", look });
    nose(c, x, y + s * 0.28, 1.4, "#F07090");
  }
}

// ---------------------------------------------------------------- sprites (baked once)
const KEY = [255, 0, 255];
function bakeSprite(kind, s, ramp) {
  const w = R(s * 3.2), h = R(s * 3.6), c = new Canvas(w, h, "#FF00FF");
  plush(c, kind, w / 2, h * 0.6, s, { ramp });
  return { c, w, h, ax: w / 2, ay: h * 0.6 };
}
const SPR = {};
export function sprite(name) {
  if (!SPR[name]) SPR[name] = name === "bunny" ? bakeSprite("bunny", 18) : name === "bear" ? bakeSprite("bear", 18) : bakeSprite("kitten", 17);
  return SPR[name];
}
/** Blit a plush sprite with its anchor (body centre) at (x, y); sx/sy squash around the anchor bottom; a = dithered alpha;
 *  clip(x, y) → false hides a pixel (used by the chute). */
export function drawSprite(c, name, x, y, { sx = 1, sy = 1, a = 1, clip = null, shade = null } = {}) {
  if (a <= 0) return; const s = sprite(name), d = s.c.d, X0 = R(x - s.ax * sx), Y0 = R(y - s.ay * sy), W2 = R(s.w * sx), H2 = R(s.h * sy);
  for (let j = 0; j < H2; j++) { const v = Math.min(s.h - 1, Math.floor(j / sy)), Y = Y0 + j; if (Y < 0 || Y >= c.h) continue;
    for (let i = 0; i < W2; i++) { const u = Math.min(s.w - 1, Math.floor(i / sx)), k = (v * s.w + u) * 3, X = X0 + i; if (X < 0 || X >= c.w) continue;
      if (d[k] === 255 && d[k + 1] === 0 && d[k + 2] === 255) continue; if (a < 1 && a <= bayer(X, Y)) continue; if (clip && !clip(X, Y)) continue;
      const o = (Y * c.w + X) * 3; if (shade && shade(X, Y)) { const m = shade(X, Y); c.d[o] = d[k] + (m[0] - d[k]) * m[3]; c.d[o + 1] = d[k + 1] + (m[1] - d[k + 1]) * m[3]; c.d[o + 2] = d[k + 2] + (m[2] - d[k + 2]) * m[3]; } else { c.d[o] = d[k]; c.d[o + 1] = d[k + 1]; c.d[o + 2] = d[k + 2]; } } }
}

// ---------------------------------------------------------------- the toy pile
const KINDS = ["bunny", "bear", "cube", "chick", "kitten", "cube", "bear", "chick"];
const RAMPS = { bunny: [RAMP.pink, RAMP.white, RAMP.jelly], bear: [RAMP.brown, RAMP.sponge, RAMP.gray], cube: [MINT, RAMP.jelly, RAMP.dolphin, RAMP.pink, RAMP.coral], chick: [RAMP.bee, RAMP.amber], kitten: [RAMP.black, RAMP.gray] };
/** A dense heap of plush toys (back rows small and dim, front rows big), higher in the middle; spots in `free` stay empty
 *  for the prizes that move. */
function pileList(seed, free) {
  const out = [], rows = [[412, 13, 0.85], [430, 14.5, 0.6], [452, 16, 0.35], [477, 18, 0.15], [504, 20, 0]];
  rows.forEach(([y, s, dark], r) => {
    const step = s * 1.75; let i = 0;
    for (let x = 112 + (r % 2) * step * 0.5 + hash(seed + r) * 6; x < 304; x += step * (0.92 + 0.16 * hash(seed * 7 + r * 31 + i)), i++) {
      const yy = y + 16 * ((x - 205) / 105) ** 2 * (r < 2 ? 1.4 : 0.6) + (hash(seed * 3 + r * 17 + i) - 0.5) * 4;
      if (yy > 524 - s * 0.4) continue;
      if (free.some(([fx, fy]) => Math.abs(fx - x) < s + 6 && Math.abs(fy - yy) < 18)) continue;
      const k = KINDS[Math.floor(hash(seed * 11 + r * 53 + i * 7) * KINDS.length)], rl = RAMPS[k];
      out.push([k, x, yy, s * (0.92 + 0.12 * hash(seed + i * 13 + r)), rl[Math.floor(hash(seed * 5 + i * 3 + r * 7) * rl.length)], dark]);
    }
  });
  return out;
}
export const SPOT = { bunny: [172, 436], bear: [238, 436], land1: [166, 436], land3: [158, 438], kitten: [200, 436] };
const PILE = { main: pileList(3, [SPOT.bunny, SPOT.bear, SPOT.land1]), next: pileList(8, [SPOT.kitten]), third: pileList(13, []) };

// ---------------------------------------------------------------- cabinet (one function for both machines)
function cabinet(c, ox, cab, side, pile) {
  const X = (x) => ox + x;
  // shadow on the floor
  c.tint(X(14), 896, 320, 20, (x, y) => 0.5 * (1 - Math.abs((x - X(170)) / 170)), "#000000", 3);
  // body (front face) with a soft vertical light band
  for (let y = 140; y < 900; y++) for (let x = 26; x < 316; x++) {
    const u = (x - 26) / 290, edge = x < 30 || x > 311 ? 1 : 0, band = 3.6 + 1.6 * Math.sin(Math.PI * u) - (y > 560 ? 0.8 : 0) - (y > 820 ? 0.6 : 0);
    let q = Math.floor(band); if (band - q > bayer(X(x), y)) q++; c.px(X(x), y, edge ? cab[1] : cab[Math.max(1, Math.min(6, q))]);
  }
  c.rect(X(26), 140, 290, 2, cab[6]); c.rect(X(26), 898, 290, 2, cab[0]);
  // marquee box
  c.rrect(X(32), 146, 278, 44, cab[0], 3); c.rrect(X(35), 149, 272, 38, "#1A0E26", 2);
  // window frame + interior back wall (lit from the top lamp)
  const G = GLASS; c.rect(X(G.x0 - 5), G.y0 - 5, G.x1 - G.x0 + 10, G.y1 - G.y0 + 10, cab[0]); c.rect(X(G.x0 - 3), G.y0 - 3, G.x1 - G.x0 + 6, G.y1 - G.y0 + 6, METAL[4]);
  for (let y = G.y0; y < G.y1; y++) for (let x = G.x0; x < G.x1; x++) {
    const v = (y - G.y0) / (G.y1 - G.y0), dx = (x - 171) / 150, s = 4.2 - 3.2 * v - 1.2 * dx * dx; let q = Math.floor(s); if (s - q > bayer(X(x), y)) q++;
    const BACK = ["#120A22", "#1E1238", "#2C1A4E", "#3C2666", "#4E3480", "#62469A"]; c.px(X(x), y, BACK[Math.max(0, Math.min(5, q))]);
  }
  // back wall pattern: faint stars printed on the panel
  for (let i = 0; i < 26; i++) { const x = G.x0 + 8 + R(hash(i * 13 + ox) * 246), y = G.y0 + 26 + R(hash(i * 29 + ox) * 170); c.px(X(x), y, "#6E54A8"); c.px(X(x) + 1, y, "#4E3480"); c.px(X(x) - 1, y, "#4E3480"); c.px(X(x), y + 1, "#4E3480"); c.px(X(x), y - 1, "#4E3480"); }
  // top lamp strip
  c.rect(X(G.x0), G.y0, G.x1 - G.x0, 3, "#FFF4D0"); c.rect(X(G.x0), G.y0 + 3, G.x1 - G.x0, 1, "#C8B8E8");
  // gantry: two rails (front and back) with bolts
  c.rect(X(G.x0), RAIL_Y - 2, G.x1 - G.x0, 4, METAL[2]); c.rect(X(G.x0), RAIL_Y - 2, G.x1 - G.x0, 1, METAL[5]); c.rect(X(G.x0), RAIL_Y + 2, G.x1 - G.x0, 1, METAL[0]);
  for (let x = G.x0 + 6; x < G.x1; x += 32) c.px(X(x), RAIL_Y, METAL[6]);
  // machine floor under the pile
  for (let y = 470; y < G.y1; y++) for (let x = G.x0; x < G.x1; x++) c.px(X(x), y, (y - 470) / 52 > bayer(X(x), y) ? "#1A1030" : "#24163E");
  // the toy pile (static toys) — back rows first
  { const m = []; for (let x = GLASS.x0; x <= GLASS.x1; x += 4) m.push([X(x), 410 + 26 * ((x - 205) / 120) ** 2]); m.push([X(GLASS.x1), GLASS.y1], [X(GLASS.x0), GLASS.y1]); c.poly(m, "#1C1232"); }
  for (const [k, x, y, s, rp, dark] of PILE[pile]) plush(c, k, X(x), y, s, { ramp: rp, dark });
  // prize chute (main only): a glass box at front left; its front glass is drawn per frame over a falling prize
  if (side) { const w = CHUTE.x1 - CHUTE.x0, h = G.y1 - CHUTE.top;
    for (let y = CHUTE.top; y < G.y1; y++) for (let x = CHUTE.x0; x < CHUTE.x1; x++) c.px(X(x), y, mix(c.get(X(x), y), "#6A5AA8", 0.25 + 0.2 * ((y - CHUTE.top) / h)));
    c.rect(X(CHUTE.x0), CHUTE.top, w, 5, "#F4CA50"); for (let x = 0; x < w; x += 8) c.rect(X(CHUTE.x0 + x), CHUTE.top, 4, 5, "#1A1426"); c.rect(X(CHUTE.x0), CHUTE.top + 5, w, 1, METAL[0]);
    c.rect(X(CHUTE.x0 + 6), CHUTE.top + 10, 2, h - 14, "#B8A8E8"); c.rect(X(CHUTE.x1 - 2), CHUTE.top, 3, h, METAL[3]);
    for (let j = 0; j < 10; j++) c.rect(X(CHUTE.x0 + w / 2 - 9 + j), CHUTE.top + 40 + j, 19 - 2 * j, 1, "#F4CA50"); }
  // control ledge
  for (let y = 522; y < 562; y++) { const k = (y - 522) / 40; c.rect(X(28), y, 286, 1, k < 0.15 ? cab[6] : k < 0.85 ? mix(cab[4], cab[3], k) : cab[1]); }
  c.rect(X(28), 522, 286, 1, cab[7]);
  // joystick base and button (the knob itself is drawn live)
  c.ellipse(X(130), 548, 16, 6, "#0B0812"); c.ellipse(X(130), 547, 14, 5, METAL[2]); c.ellipse(X(130), 546, 10, 3, METAL[1]);
  c.ellipse(X(196), 546, 13, 6, "#0B0812"); c.ellipse(X(196), 545, 11, 5, "#C8202C"); c.ellipse(X(196), 543, 10, 3, "#F04848"); c.rect(X(191), 541, 4, 1, "#FFA8A0");
  // coin slot plate
  c.rrect(X(SLOT.x - 14), 528, 28, 26, "#0B0812", 2); c.rrect(X(SLOT.x - 12), 530, 24, 22, METAL[4], 2); c.rect(X(SLOT.x - 10), 531, 20, 1, METAL[6]); c.rect(X(SLOT.x - 2), 533, 4, 16, "#07060E"); c.rect(X(SLOT.x - 1), 534, 1, 14, METAL[1]);
  // prize door (main) / blank flap (neighbour)
  { const d = DOOR; c.rrect(X(d.x - 3), d.y - 3, d.w + 6, d.h + 6, "#0B0812", 2); c.rrect(X(d.x), d.y, d.w, d.h, "#140A20", 2); for (let y = d.y + 2; y < d.y + d.h - 2; y++) c.rect(X(d.x + 2), y, d.w - 4, 1, mix("#2A1840", "#0E0818", (y - d.y) / d.h)); c.rect(X(d.x), d.y + d.h - 6, d.w, 6, METAL[3]); c.rect(X(d.x), d.y + d.h - 6, d.w, 1, METAL[5]); }
  // front panel stripes and bulbs (bottom: background)
  for (let i = 0; i < 3; i++) c.rect(X(40), 640 + i * 70, 262, 4, i === 1 ? cab[5] : cab[2]);
  c.rect(X(150), 600, 140, 26, cab[2]); c.rect(X(152), 602, 136, 22, cab[1]);
  for (let x = 160; x < 284; x += 14) { c.disc(X(x), 613, 3, "#3A2010"); c.disc(X(x), 613, 2, "#F4CA50"); }
  c.rect(X(26), 860, 290, 40, cab[1]); c.rect(X(26), 860, 290, 2, cab[3]);
}

// ---------------------------------------------------------------- the side service unit (main machine)
function serviceUnit(c) {
  const box = (x, y, w, h) => { c.rrect(x - 2, y - 2, w + 4, h + 4, "#07060E", 3); c.rrect(x, y, w, h, METAL[2], 3); c.rect(x + 3, y + 2, w - 6, 1, METAL[5]); c.rect(x + 2, y + h - 3, w - 4, 2, METAL[0]); };
  // a bracket joining the unit to the cabinet side
  c.rect(316, 146, 4, 456, METAL[1]); c.rect(316, 146, 1, 456, METAL[3]);
  box(COUNTER.x, COUNTER.y, COUNTER.w, COUNTER.h);
  box(HEAD.x, HEAD.y, HEAD.w, HEAD.h);
  box(GAUGE.x, GAUGE.y, GAUGE.w, GAUGE.h);
  // screws
  for (const [x, y] of [[COUNTER.x + 5, COUNTER.y + 5], [COUNTER.x + COUNTER.w - 6, COUNTER.y + 5], [HEAD.x + 5, HEAD.y + HEAD.h - 6], [HEAD.x + HEAD.w - 6, HEAD.y + HEAD.h - 6], [GAUGE.x + 5, GAUGE.y + GAUGE.h - 6], [GAUGE.x + GAUGE.w - 6, GAUGE.y + GAUGE.h - 6]]) { c.px(x, y, METAL[6]); c.px(x + 1, y + 1, METAL[0]); }
  // cable loom down to the floor (background)
  for (let y = 600; y < 900; y++) { c.px(380 + R(3 * Math.sin(y / 23)), y, "#1A1426"); c.px(381 + R(3 * Math.sin(y / 23)), y, "#2E2440"); }
}

// ---------------------------------------------------------------- arcade room
function room(c) {
  for (let y = 0; y < H; y++) for (let x = 0; x < WW; x++) {
    let col;
    if (y < 880) { const s = 1.2 + 2.6 * (y / 880) + 0.5 * Math.sin(x / 90); let q = Math.floor(s); if (s - q > bayer(x, y)) q++; col = WALL[Math.max(0, Math.min(4, q))]; if ((x % 64) === 0 && y > 130) col = mix(col, "#000000", 0.4); }
    else { const h = hash((x >> 3) * 31 + (y >> 3) * 977); col = (y & 7) < 1 ? "#0C0618" : "#160C26"; if (h < 0.06) col = ["#E03A8C", "#3AD8E8", "#F4CA50"][R(h * 40) % 3]; }
    c.px(x, y, col);
  }
  // neon tubes along the top wall (background)
  for (let x = 0; x < WW; x++) { const k = 0.6 + 0.4 * Math.sin(x / 37); c.px(x, 96, mix("#5A1A6A", "#FF5AD8", k)); c.px(x, 97, "#FFB4F0"); c.px(x, 98, mix("#5A1A6A", "#FF5AD8", k)); c.px(x, 99, "#3A0E44"); c.px(x, 112, "#0E2A3A"); c.px(x, 113, "#3AD8E8"); c.px(x, 114, "#0E2A3A"); }
}

let WORLD = null;
export function world() {
  if (WORLD) return WORLD;
  const c = new Canvas(WW, H, "#000000");
  room(c);
  cabinet(c, NX + 340, ["#140820", "#24103A", "#361A56", "#4A2672", "#5E348C", "#7446A6", "#9A70C8", "#C8A8E8"], false, "third");
  cabinet(c, NX, TEALCAB, false, "next");
  cabinet(c, 0, PINKCAB, true, "main");
  serviceUnit(c);
  WORLD = c; return c;
}
/** Copy the baked world into the frame at camera pan P (screen x = world x − P). */
export function drawWorld(c, P) {
  const w = world(), p = R(P);
  for (let y = 0; y < H; y++) { const s = (y * WW + p) * 3; c.d.set(w.d.subarray(s, s + 540 * 3), y * 540 * 3); }
}

// ---------------------------------------------------------------- marquees (live: bulbs chase, win flash)
export function marquee(c, ox, text, t, flash = 0, neon = false) {
  const x0 = ox + 35, y0 = 149, w = 272, h = 38;
  // bulbs around the sign: brightness is a smooth wave travelling along the ring (never a one-frame switch)
  const pts = []; for (let x = x0 + 4; x < x0 + w - 2; x += 10) { pts.push([x, y0 + 3]); } for (let x = x0 + w - 6; x > x0; x -= 10) pts.push([x, y0 + h - 4]);
  pts.forEach(([x, y], i) => { const k = 0.5 + 0.5 * Math.sin(i * 0.9 - t * (5 + 9 * flash)), b = Math.min(1, 0.35 + 0.65 * k + 0.4 * flash); c.px(x, y, mix("#5A3A10", "#FFF0A0", b)); c.px(x + 1, y, mix("#3A2408", "#F4CA50", b)); c.px(x, y + 1, mix("#3A2408", "#F4CA50", b)); c.px(x + 1, y + 1, mix("#2A1808", "#B88A20", b)); });
  const s = 3, tw = c.measure(MAIN, text, { scale: s }), tx = R(ox + 171 - tw / 2), ty = y0 + 9;
  const col = neon ? mix("#3AD8E8", "#E8FFFF", 0.3 + 0.2 * Math.sin(t * 7.3) * Math.sin(t * 2.1)) : mix("#F4CA50", "#FFFFFF", 0.25 * flash);
  c.text(MAIN, text, tx + 1, ty + 1, neon ? "#0A3A48" : "#5A1A20", { scale: s });
  c.text(MAIN, text, tx, ty, col, { scale: s });
}

// ---------------------------------------------------------------- glass reflections (precomputed mask, applied per frame)
let GLINT = null;
export function glass(c, ox) {
  if (!GLINT) { GLINT = []; for (let y = GLASS.y0; y < GLASS.y1; y++) for (let x = GLASS.x0; x < GLASS.x1; x++) { const d1 = x - GLASS.x0 + (y - GLASS.y0) * 0.55 - 40, d2 = x - GLASS.x0 + (y - GLASS.y0) * 0.55 - 70; const k = (d1 >= 0 && d1 < 12 ? 0.22 : 0) + (d2 >= 0 && d2 < 4 ? 0.16 : 0) + (x > GLASS.x1 - 6 ? 0.12 : 0); if (k > 0) GLINT.push([x, y, k]); } }
  for (const [x, y, k] of GLINT) { const X = x + ox; if (X < 0 || X >= 540) continue; if (k <= bayer(X, y) * 0.5) continue; const o = (y * 540 + X) * 3; c.d[o] = c.d[o] + (255 - c.d[o]) * 0.35; c.d[o + 1] = c.d[o + 1] + (255 - c.d[o + 1]) * 0.35; c.d[o + 2] = c.d[o + 2] + (255 - c.d[o + 2]) * 0.4; }
}
export { METAL };
