// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/stadium.mjs (static scenery: strips, drawTrack, stripBlit,
// flagsRow). Changes: the 540-px strip is centred on world x 0..540 (= stage columns); runner, speed board (text/numbers),
// start/finish lines, cheering crowd, camera flashes and the run distance are not copied (D = 0); HEXC -> hex; the stand
// and track are painted once into a 1× cache (buildStadium) that items/race-track.mjs samples through the camera.
import { Canvas, hex, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { rnd, sm, clamp01 } from "./cute.mjs";
import { Layer, MaskCanvas, leafBall, tuft } from "./animals-forest.mjs";
const LAND = -20;


const R = Math.round, RX0 = 0, RX1 = 540;   // world = stage columns (the film strip is 540 wide)


const HZ = 560, YR = 680;                          // horizon row and the runner's ground row (screen, at rest)

const fy = (y) => (y - HZ) / (YR - HZ);             // ground-plane scale of a screen row (1 at the runner's feet)

const MID = 270;   // runner world x, scale, ground (world y)

const TX0 = RX0 + 26, TX1 = RX1 - 24;              // the track/stand strip (inside the edge hedges)

const LANES = [645, 662, 696, 738, 790, 852, 926]; // lane-line rows (screen, rest)


const TRACK = ["#A8432E", "#B84C34", "#C4563C", "#CC6046", "#D46C50"];

const LINE = "#F6F2EA", KERB = "#E4E6EA";

const CONC = ["#4A505C", "#646C7A", "#7E8898", "#98A2B2", "#B4BCCA", "#CCD2DC"];

const SEATS = ["#2A5AA8", "#3A6EC0", "#E8B030", "#D84040"];

const SHIRTS = ["#E84A4A", "#F8C83A", "#3A8AE0", "#5AB84A", "#F48AB0", "#FFFFFF", "#8A5AD8", "#F08A3A", "#3AC0C0", "#2A2A3A"];

const SKINS = ["#F3CBAA", "#E2A47C", "#C8845C", "#9A5E3C", "#6E4028", "#FADFC2"];

const HAIRS = ["#2A1A10", "#4A2A18", "#8A5A2A", "#E8C060", "#1A1418", "#C04A2A", "#6A6A72"];

const LEAF = ["#12301A", "#1A4222", "#24582C", "#307034", "#40883E", "#58A04A", "#76B85A", "#9CD072"];

const JUNG = ["#0C2618", "#123620", "#1A4A28", "#226032", "#2E783C", "#3E9048", "#58A858", "#7EC070"];


const PC = 252, PW = 120;                           // crowd strip and padded-wall strip periods

let CROWD = null, CHEER = null, WALL = null, STATIC = null, EDGE = null, TEX = null;

const STAND_TOP = 452, STAND_BOT = 612;            // screen rows (rest)

const TIERS = [598, 564, 530, 496];                // tier base rows (seat line)

function people(cheer) {
  const out = []; let i = 0;
  TIERS.forEach((by, tier) => { for (let x = 4 + (tier % 2) * 6; x < PC - 4; x += 12, i++) { if (rnd(i * 13 + tier) < 0.12) continue; out.push({ x, y: by, i, tier }); } });
  return out;
}

const CROWD_PEOPLE = people();

function buildStrips() {
  const mk = (w, h) => new MaskCanvas(w, h);
  CROWD = mk(PC, STAND_BOT - STAND_TOP); CHEER = mk(PC, STAND_BOT - STAND_TOP); WALL = mk(PW, 28);
  for (const [cv, up] of [[CROWD, false], [CHEER, true]]) {
    const g = cv, oy = STAND_TOP;
    // stand structure: back wall, tiers (concrete steps with coloured seat backs)
    g.rect(0, 0, PC, 6, CONC[1]); g.rect(0, 0, PC, 1, CONC[3]);
    for (let y = 6; y < cv.h; y++) for (let x = 0; x < PC; x++) g.px(x, y, CONC[2]);
    TIERS.forEach((by, k) => { const y = by - oy; g.rect(0, y, PC, 3, CONC[4]); g.rect(0, y + 3, PC, 2, CONC[1]); g.rect(0, y - 14, PC, 14, mix(CONC[2], "#000000", 0.08 * (3 - k))); for (let x = 0; x < PC; x += 12) { g.rect(x + 1 + (k % 2) * 6, y - 9, 9, 8, SEATS[(Math.floor(x / 12) + k) % 2]); g.rect(x + 1 + (k % 2) * 6, y - 9, 9, 1, mix(SEATS[(Math.floor(x / 12) + k) % 2], "#FFFFFF", 0.35)); } });
    // aisles (stairs) every half strip
    for (const ax of [60, 186]) for (let y = 8; y < cv.h; y++) { g.rect(ax, y, 10, 1, (y % 4) < 2 ? CONC[4] : CONC[3]); }
    // people
    for (const p of CROWD_PEOPLE) {
      if (Math.abs(p.x - 60) < 8 || Math.abs(p.x - 186) < 8) continue;
      const y = p.y - oy, shirt = SHIRTS[Math.floor(rnd(p.i * 7) * SHIRTS.length)], skin = SKINS[Math.floor(rnd(p.i * 11) * SKINS.length)], hair = HAIRS[Math.floor(rnd(p.i * 17) * HAIRS.length)], x = p.x;
      g.rect(x, y - 13, 9, 10, "#1A1420"); g.rect(x + 1, y - 12, 7, 9, shirt); g.rect(x + 1, y - 12, 7, 1, mix(shirt, "#FFFFFF", 0.35));
      g.rect(x + 1, y - 20, 7, 8, "#1A1420"); g.rect(x + 2, y - 19, 5, 6, skin); g.rect(x + 2, y - 20, 5, 2, hair); g.px(x + 1, y - 19, hair);
      g.px(x + 3, y - 16, "#1A1420"); g.px(x + 5, y - 16, "#1A1420");
      if (up) { for (const sd of [-1, 1]) { const ax = sd < 0 ? x : x + 8; for (let j = 0; j < 7; j++) g.px(ax + sd * (j > 4 ? 1 : 0), y - 13 - j, j > 5 ? skin : shirt); } g.px(x + 4, y - 14, "#5A1A24"); }
      else if (rnd(p.i * 3) < 0.3) { g.px(x - 1, y - 9, skin); g.px(x + 9, y - 9, skin); }
    }
  }
  // padded wall (blue panels with white chevrons)
  for (let y = 0; y < 28; y++) for (let x = 0; x < PW; x++) { const u = x % 60; WALL.px(x, y, y === 0 ? "#B8D0F0" : y > 24 ? "#1A2A5A" : u === 0 ? "#1A2A5A" : y < 4 ? "#4A7AD0" : "#2E58B0"); }
  for (let k = 0; k < 2; k++) for (let j = 0; j < 8; j++) { const x0 = k * 60 + 18 + j * 3; for (let y = 8; y < 20; y++) { const dy = Math.abs(y - 14); if ((x0 + dy) % 9 < 3) WALL.px(x0 + dy - 3, y, "#E8F0FF"); } }
  // static scenery: floodlight tower, speed board on legs, end walls, hedges, verges
  STATIC = new Layer(RX0 - 40, -470, RX1 + 40, 300); const g = STATIC.g, S = (x, y) => [RX0 + x, y - 660];
  // floodlight tower (right)
  { const [x] = S(486, 0); for (let y = -420; y < -200; y++) { g.px(x, y, CONC[1]); g.px(x + 1, y, CONC[3]); g.px(x + 2, y, CONC[2]); for (const d of [-6, 7]) if ((y + 420) % 14 < 1) g.line(x + 1, y, x + 1 + d, y + 7, CONC[2]); }
    g.rect(x - 34, -436, 70, 26, "#2A2E3A"); for (let j = 0; j < 3; j++) for (let i = 0; i < 6; i++) { g.rect(x - 32 + i * 11, -434 + j * 8, 9, 6, "#FFF6D0"); g.px(x - 32 + i * 11, -434 + j * 8, "#FFFFFF"); g.rect(x - 32 + i * 11, -429 + j * 8, 9, 1, "#E8D890"); } }
  // stand end walls
  for (const [ex, w] of [[16, 14], [512, 14]]) { const [x] = S(ex, 0); for (let y = STAND_TOP - 666; y < LAND; y++) for (let k = 0; k < w; k++) g.px(x + k, y, k === 0 || k === w - 1 ? CONC[0] : k < 4 ? CONC[4] : CONC[3]); g.rect(x - 2, STAND_TOP - 668, w + 4, 4, CONC[5]); }
  // verges (grass) at both ends below the ground line
  for (let y = LAND; y < 300; y++) for (const [a, b] of [[RX0 - 40, TX0], [TX1, RX1 + 40]]) for (let x = a; x < b; x++) { const d = y - LAND, v = Math.min(5.9, Math.sqrt(d / 330) * 6); g.px(x, y, ["#8ECC62", "#7CBE58", "#6AB04E", "#5AA046", "#4C9040", "#40803A"][Math.floor(v + (bayer(x, y) - 0.5) * 0.8 + 0.5) % 6]); }
  // hedges: rainforest edge on the left, garden hedge + picket fence on the right
  EDGE = new Layer(RX0 - 60, -300, RX1 + 60, 300); const e = EDGE.g;
  for (let i = 0; i < 9; i++) leafBall(e, RX0 - 30 + rnd(i * 5) * 52, LAND - 14 - i * 26 + rnd(i) * 10, 22 + rnd(i * 3) * 8, JUNG, i * 7, { amp: 0.16, bumps: 8 });
  for (let i = 0; i < 5; i++) leafBall(e, RX0 + 2 + rnd(i * 9) * 20, LAND + 30 + i * 52, 26, JUNG, i * 11 + 3, { amp: 0.18, bumps: 8 });
  for (let i = 0; i < 8; i++) leafBall(e, RX1 + 4 - rnd(i * 5) * 34, LAND - 16 - i * 22 + rnd(i) * 8, 18 + rnd(i * 3) * 6, LEAF, i * 7 + 1, { amp: 0.12, bumps: 8 });
  for (let x = RX1 - 22; x < RX1 + 40; x += 12) for (let y = LAND - 46; y < LAND + 4; y++) for (let k = 0; k < 8; k++) { const tip = LAND - 46 + Math.abs(k - 3.5); if (y >= tip) e.px(x + k, y, k === 0 || k === 7 ? "#6A5844" : k < 3 ? "#FBF6EA" : "#E2D8C6"); }
  for (let x = RX1 - 22; x < RX1 + 40; x++) for (const yy of [LAND - 34, LAND - 14]) { e.px(x, yy, "#D8CCB8"); e.px(x, yy + 1, "#B8A890"); }
  for (let i = 0; i < 5; i++) leafBall(e, RX1 - 6 + rnd(i * 9) * 20, LAND + 34 + i * 52, 24, LEAF, i * 13, { amp: 0.15, bumps: 8 });
  for (let i = 0; i < 16; i++) tuft(e, RX1 - 30 + rnd(i * 3) * 60, LAND + 4 + rnd(i * 7) * 280, 10 + rnd(i) * 10, 4, ["#2E6A30", "#3E8238", "#58A044"], i * 5, 0);
  // track texture per row: base tone + lane lines (rows are horizontal, so they never move)
  TEX = [];
  for (let y = 640; y < 1020; y++) {
    const isLine = LANES.some((ly) => y >= ly && y < ly + Math.max(1, R(fy(ly) * 1.6))), kerb = y < 645;
    const k = clamp01((y - 640) / 380), base = kerb ? KERB : TRACK[Math.min(4, Math.floor(4 - k * 3.2 + 0.0))];
    TEX.push({ y, line: isLine, kerb, base, alt: mix(base, "#7A2A1C", 0.18), lite: mix(base, "#F0A080", 0.14) });
  }
}


function drawTrack(c, V, D) {
  const xa = Math.max(0, R(V.X(TX0))), xb = Math.min(c.w, R(V.X(TX1))), X0 = V.X(MID), d = c.d, W = c.w;
  if (xb <= xa) return;
  const dy = V.cy + 180;   // camera vertical offset (always 0 in this film, kept for safety)
  for (const row of TEX) {
    const y = row.y - dy; if (y < 0 || y >= c.h) continue;
    const f = fy(row.y), inv = 1 / f, lineCol = row.line ? LINE : null;
    for (let x = xa; x < xb; x++) {
      const u = (x - X0) * inv + D;
      let col;
      if (row.kerb) col = (Math.floor(u / 40) & 1) ? KERB : "#C8CCD4";
      else if (lineCol) {
        // hurdle/relay marks on the lane lines: short coloured dashes every 120 px of track
        const m = ((u % 120) + 120) % 120; col = m < 5 ? (Math.floor(u / 120) & 1 ? "#F8C83A" : "#3A8AE0") : lineCol;
      } else {
        const h = rnd((Math.floor(u / 3) * 977 + row.y * 131) | 0); col = h < 0.1 ? row.alt : h > 0.94 ? row.lite : row.base;
      }
      const q = (y * W + x) * 3, cc = hex(col); d[q] = cc[0]; d[q + 1] = cc[1]; d[q + 2] = cc[2];
    }
  }
}

function stripBlit(c, src, P, y0, off, xa, xb, a = 1) {
  const d = c.d, W = c.w, sd = src.d, m = src.m, sw = src.w;
  for (let y = 0; y < src.h; y++) { const Y = y0 + y; if (Y < 0 || Y >= c.h) continue;
    for (let x = Math.max(0, xa); x < Math.min(W, xb); x++) { const u = (((x + off) % P) + P) % P, i = y * sw + u; if (!m[i]) continue; if (a < 1 && a <= bayer(x, Y)) continue; const q = (Y * W + x) * 3, s = i * 3; d[q] = sd[s]; d[q + 1] = sd[s + 1]; d[q + 2] = sd[s + 2]; } }
}

function flagsRow(c, V, t, off, xa, xb, cheer) {
  // generic stadium pennants (single colours, swallowtail) — no national flags
  const cols = ["#E84A4A", "#F8C83A", "#3A8AE0", "#5AB84A", "#F48AB0", "#8A5AD8"];
  for (let k = -2; k < 6; k++) {
    const x = R(k * 126 - (((off % 126) + 126) % 126)) + 40 + xa; if (x < xa - 2 || x > xb + 30) continue;
    const id = Math.floor((k * 126 + off) / 126), c1 = cols[((id % 6) + 6) % 6], top = STAND_TOP - 46;
    for (let y = top - 2; y < STAND_TOP; y++) { if (x >= xa && x < xb) { c.px(x, y, "#5A6070"); c.px(x + 1, y, "#9AA2B2"); } }
    if (x >= xa && x < xb) { c.px(x, top - 3, "#F8D040"); c.px(x + 1, top - 3, "#F8D040"); }
    for (let i = 0; i < 28; i++) { const notch = Math.max(0, i - 19) * 0.8, wv = Math.sin(t * (5 + cheer * 4) - i * 0.35 + id) * 2.4 * (i / 28);
      for (let j = 0; j < 16; j++) { if (i > 19 && Math.abs(j - 7.5) < notch) continue; const X = x + 2 + i, Y = R(top + j + wv); if (X < xa || X >= xb) continue;
        c.px(X, Y, j === 0 || j === 15 ? mix(c1, "#000000", 0.35) : j < 5 ? mix(c1, "#FFFFFF", 0.25) : j > 11 ? mix(c1, "#000000", 0.15) : c1); } }
  }
}



export const CW = 620, CH = 1020, PADX = 40, SH = 60;   // cache size, column pad, rows the scene is lifted when sampled
const SKYC = ["#78AEE8", "#92C0EE", "#AED2F4", "#CCE4F6", "#E4F0F4"];
let CACHE = null;
export function buildStadium() {
  if (CACHE) return CACHE;
  buildStrips();
  const c = new Canvas(CW, CH, "#000000"), V = { X: (x) => x + PADX, Y: (y) => y, cy: -180 };
  for (let y = 0; y < CH; y++) { const v = Math.min(0.999, y / 560) * (SKYC.length - 1), lo = Math.floor(v), fr = v - lo; for (let x = 0; x < CW; x++) { const [r, g, b] = hex(SKYC[Math.min(SKYC.length - 1, fr > bayer(x, y) ? lo + 1 : lo)]); const q = (y * CW + x) * 3; c.d[q] = r; c.d[q + 1] = g; c.d[q + 2] = b; } }
  const xa = R(V.X(TX0 + 4)), xb = R(V.X(TX1 - 2));
  STATIC.blit(c, { X: V.X, Y: (y) => y + 660 });
  stripBlit(c, CROWD, PC, STAND_TOP, 0, xa, xb, 1);
  stripBlit(c, WALL, PW, STAND_BOT, 0, xa, xb, 1);
  drawTrack(c, V, 0);
  EDGE.blit(c, { X: V.X, Y: (y) => y + 660 });
  CACHE = c; return c;
}
/** Waving pennants of this frame (screen = stage coords, columns offset by PADX in the returned layer). */
export function flagsLayer(t) {
  const Ly = new Layer(-PADX, STAND_TOP - 56, CW - PADX, STAND_TOP + 6);
  flagsRow(Ly.g, null, t, 0, TX0 + 4, TX1 - 2, 0);
  return Ly;
}
export const STAND = { top: STAND_TOP, bot: STAND_BOT };
