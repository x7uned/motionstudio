// LV3 · human — a bright day running stadium (RANGE BIOME.stadium = 1080..1620; rest camera (1350, −180): screen =
// (wx − 1080, wy + 660)). A low grandstand full of a pixel crowd with flags on top, a padded wall, a terracotta track with
// white lane lines in perspective (vanishing point on the horizon), a floodlight tower and a speed board (with the
// LV 3 plate) on legs. Hedges at x 1080 (rainforest edge) and a hedge + picket fence at x 1620 (into the house yard).
// The sprinter is the same chibi runner as in the hook (garden-runner.mjs), facing the camera at an angle.
// Story: "Usain Bolt" → he waits in the blocks ("on your marks", then "set": hips up), determined face to the camera;
// "the fastest human ever" → BANG, he drives out of the blocks and runs on the spot while the track markings, crowd,
// flags and wall stream past behind him (each layer at its own parallax; the near lanes fastest), speed lines, dust,
// headband tails flying; the board counts the speed up; "forty-four" → he crosses the finish line, the board flashes
// 44 KM/H, the crowd cheers (arms up, camera flashes, confetti); he grins, slows down and stops with a happy "yay"
// before the camera moves on. All scrolling has stopped before the camera pans, so the range edges stay still.
import { BIOME, LAND, EV, LV, W } from "../timeline.mjs";
import { C, sign, fade, mix, bayer, sm, ease, lerp, rnd, blinkAt, clamp01, MAIN, shadow } from "../cute.mjs";
import { Layer, leafBall, tuft, flower, thick, spriteCache, MaskCanvas } from "./garden-kit.mjs";
import { drawRunner, runPose, POSES, mixPose, drawHead } from "./garden-runner.mjs";

export const RANGE = BIOME.stadium;
const R = Math.round, [RX0, RX1] = RANGE;
const off = (V) => RANGE[1] + 140 < V.x0 || RANGE[0] - 140 > V.x1;
const HZ = 560, YR = 680;                          // horizon row and the runner's ground row (screen, at rest)
const fy = (y) => (y - HZ) / (YR - HZ);             // ground-plane scale of a screen row (1 at the runner's feet)
const MID = 1350, S_RUN = 1.35, FEET = YR - 660;   // runner world x, scale, ground (world y)
const TX0 = RX0 + 26, TX1 = RX1 - 24;              // the track/stand strip (inside the edge hedges)
const LANES = [645, 662, 696, 738, 790, 852, 926]; // lane-line rows (screen, rest)

// ---------------------------------------------------------------- timing (word anchored)
export const ST = {
  marks: EV.usain - 0.3, set0: EV.bolt + 0.12, set1: EV.bolt + 0.55,
  bang: EV.fastest3, top: EV.fastest3 + 1.15, smax: 780,
  hit: EV.hit, finish: EV.fortyFour, dec0: EV.fortyFour + 0.85, dec1: LV.human[1] - 0.16,
  cheer0: EV.fortyFour, cheer1: LV.human[1] + 0.6,
};
/** Scroll speed (px/s at the runner's row). */
export function speed(t) { if (t <= ST.bang) return 0; return ST.smax * sm(t, ST.bang, ST.top) * (1 - sm(t, ST.dec0, ST.dec1)); }
const DT = 1 / 240;
/** Track scroll distance D(t) and the runner's gait phase (integrated, pure functions of t). */
export function runState(t) {
  let D = 0, p = 0.62; if (t <= ST.bang) return { D, p, v: 0 };
  const T = Math.min(t, ST.dec1 + 0.4), n = Math.floor((T - ST.bang) / DT);
  for (let i = 0; i < n; i++) { const v = speed(ST.bang + i * DT); D += v * DT; p += cad(v) * DT; }
  const r = T - ST.bang - n * DT, v = speed(T); D += v * r; p += cad(v) * r;
  return { D, p, v: speed(t) };
}
const cad = (v) => 0.9 + 2.0 * (v / ST.smax);     // gait cycles per second
const U_FIN = runState(ST.finish).D;               // the finish line passes under the runner on "forty-four"
const U_START = -16;                               // start line just in front of his fingertips
const OX0 = -104;                                  // in the blocks his hip sits this far behind the run spot
/** Screen offset of the runner from the run spot: he surges forward out of the blocks into the tracked position. */
export const runOX = (t) => OX0 * (1 - ease(clamp01((t - ST.bang) / 0.85)));

// ---------------------------------------------------------------- palette
const TRACK = ["#A8432E", "#B84C34", "#C4563C", "#CC6046", "#D46C50"];
const LINE = "#F6F2EA", KERB = "#E4E6EA";
const CONC = ["#4A505C", "#646C7A", "#7E8898", "#98A2B2", "#B4BCCA", "#CCD2DC"];
const SEATS = ["#2A5AA8", "#3A6EC0", "#E8B030", "#D84040"];
const SHIRTS = ["#E84A4A", "#F8C83A", "#3A8AE0", "#5AB84A", "#F48AB0", "#FFFFFF", "#8A5AD8", "#F08A3A", "#3AC0C0", "#2A2A3A"];
const SKINS = ["#F3CBAA", "#E2A47C", "#C8845C", "#9A5E3C", "#6E4028", "#FADFC2"];
const HAIRS = ["#2A1A10", "#4A2A18", "#8A5A2A", "#E8C060", "#1A1418", "#C04A2A", "#6A6A72"];
const LEAF = ["#12301A", "#1A4222", "#24582C", "#307034", "#40883E", "#58A04A", "#76B85A", "#9CD072"];
const JUNG = ["#0C2618", "#123620", "#1A4A28", "#226032", "#2E783C", "#3E9048", "#58A858", "#7EC070"];

// ---------------------------------------------------------------- cached strips and static layers
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
  // board legs (the board itself is drawn per frame)
  { const [x0] = S(30, 0), [x1] = S(156, 0); for (const x of [x0, x1]) for (let y = -334; y < -206; y++) { g.px(x, y, CONC[0]); g.px(x + 1, y, CONC[2]); g.px(x + 2, y, CONC[3]); g.px(x + 3, y, CONC[1]); } }
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
  for (let y = 640; y < 960; y++) {
    const isLine = LANES.some((ly) => y >= ly && y < ly + Math.max(1, R(fy(ly) * 1.6))), kerb = y < 645;
    const k = clamp01((y - 640) / 320), base = kerb ? KERB : TRACK[Math.min(4, Math.floor(4 - k * 3.2 + 0.0))];
    TEX.push({ y, line: isLine, kerb, base, alt: mix(base, "#7A2A1C", 0.18), lite: mix(base, "#F0A080", 0.14) });
  }
}

// ---------------------------------------------------------------- per-frame drawing helpers
/** Screen x of track coordinate u on screen row y (perspective; the camera pan shifts every row equally). */
const trackX = (V, u, D, y) => V.X(MID) + (u - D) * fy(y);
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
      // start line and finish line (white bands across all lanes), lane numbers before the start line
      if (!row.kerb && ((u >= U_START && u < U_START + 4) || (u >= U_FIN && u < U_FIN + 5))) col = LINE;
      if (!row.kerb && u >= U_FIN + 5 && u < U_FIN + 11 && ((Math.floor(u - U_FIN) + Math.floor(row.y / 3)) & 1)) col = "#2A2A3A";
      const q = (y * W + x) * 3, cc = typeof col === "string" ? HEXC(col) : col; d[q] = cc[0]; d[q + 1] = cc[1]; d[q + 2] = cc[2];
    }
  }
}
const HC = new Map(); function HEXC(h) { let v = HC.get(h); if (!v) { v = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); HC.set(h, v); } return v; }
/** Blit a periodic strip (MaskCanvas, period P) at screen row y0, scrolled by `off`, clipped to [xa, xb). */
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
function puff(c, x, y, r, age, col = "#E8B8A0") {
  if (age <= 0 || age >= 1) return; const rr = r * (0.5 + age), a = (1 - age) * 0.85, cy = y - age * 8;
  for (let Y = R(cy - rr); Y <= R(cy + rr * 0.6); Y++) for (let X = R(x - rr); X <= R(x + rr); X++) { const d = ((X - x) / rr) ** 2 + ((Y - cy) / (rr * 0.7)) ** 2; if (d <= 1 && a * (1 - d * 0.6) > bayer(X, Y)) c.px(X, Y, d > 0.6 ? mix(col, "#A06A58", 0.4) : col); }
}
function blocks(c, V, D) {
  // starting blocks: a rail with two angled pedals behind the start line (scroll with the track)
  const y = V.Y(FEET) + 2, X = (u) => trackX(V, u, D, YR + 2);
  const x0 = X(OX0 - 80), x1 = X(OX0 + 20); if (x1 < -20 || x0 > c.w + 20) return;
  c.rect(R(x0), R(y - 3), R(x1 - x0), 4, "#3A3E4A"); c.rect(R(x0), R(y - 3), R(x1 - x0), 1, "#9AA2B2");
  for (const [u, h] of [[OX0 + 10, 18], [OX0 - 48, 22]]) { const bx = X(u); c.poly([[bx - 8, y - 2], [bx + 6, y - 2], [bx - 4, y - h]], "#D8342E"); c.line(R(bx - 4), R(y - h), R(bx + 6), R(y - 2), "#7A1A18"); c.line(R(bx - 8), R(y - 2), R(bx - 4), R(y - h), "#F07070"); }
}
function finishPost(c, V, D) {
  // photo-finish post at the far edge of the track on the finish line
  const x = trackX(V, U_FIN + 2, D, 641); if (x < -30 || x > c.w + 30) return;
  const X = R(x), y0 = STAND_BOT - 4;
  c.rect(X - 2, y0 - 70, 5, 72, "#2A2E3A"); c.rect(X - 1, y0 - 70, 2, 72, "#E8E8F0");
  for (let j = 0; j < 72; j += 8) c.rect(X - 1, y0 - 70 + j, 2, 4, "#2A2A3A");
  c.rect(X - 8, y0 - 84, 17, 14, "#2A2E3A"); c.rect(X - 6, y0 - 82, 13, 10, "#4A5060"); c.disc(X, y0 - 77, 3, "#9AD0F0"); c.px(X - 1, y0 - 78, "#FFFFFF");
}
/** Speed board: header, LED number (counts up with the run), KM/H; flashes on "forty-four". */
function board(c, V, t) {
  const x = R(V.X(RX0 + 18)), y = 234, w = 150, h = 92; if (x > c.w || x + w < 0) return;
  c.rect(x - 1, y - 1, w + 2, h + 2, "#0E0E16"); c.rect(x, y, w, h, "#1A1C26"); c.rect(x + 3, y + 3, w - 6, h - 6, "#06080C");
  c.rect(x, y, w, 2, "#5A6070");
  const fk = clamp01((t - ST.finish) / 0.9), flash = t > ST.finish && fk < 1 ? 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(fk * 2 * Math.PI * 3)) : 1;
  const lit = sm(t, ST.finish, ST.finish + 0.25);
  if (lit < 1) fade(c, 1 - lit).text(MAIN, "SPEED", x + 10, y + 9, "#A08A30", { scale: 2 });
  if (lit > 0) fade(c, lit).text(MAIN, "TOP SPEED", x + 10, y + 9, "#F8C83A", { scale: 2 });
  const kk = clamp01((t - ST.bang) / (ST.finish - ST.bang)), v = t < ST.bang ? 0 : Math.floor(44 * (1 - (1 - kk) * (1 - kk)) + 1e-9), txt = String(v);
  // ghost "88" segments, then the number
  c.text(MAIN, "88", x + 12, y + 32, "#2A1408", { scale: 6 });
  const tw = c.measure(MAIN, txt, { scale: 6 }), tx = x + 12 + c.measure(MAIN, "88", { scale: 6 }) - tw;
  const col = mix("#5A2A10", mix("#FF8A3A", "#FFE070", lit), flash);
  c.text(MAIN, txt, tx + 1, y + 33, mix("#3A1A08", col, 0.4), { scale: 6 }); c.text(MAIN, txt, tx, y + 32, col, { scale: 6 });
  c.text(MAIN, "KM/H", x + 98, y + 62, "#C8C8D8", { scale: 2 });
  const glow = t > ST.finish ? Math.sin(Math.PI * fk) * (0.5 + 0.5 * Math.cos(fk * 2 * Math.PI * 3)) : 0;
  if (glow > 0.02) { const g = fade(c, glow); g.frame(x - 3, y - 3, w + 6, h + 6, "#FFE070"); g.frame(x - 4, y - 4, w + 8, h + 8, "#F8A030"); }
}
function confetti(c, V, t) {
  const k0 = ST.finish + 0.05; if (t < k0 || t > k0 + 2.6) return;
  const cols = ["#E84A4A", "#F8C83A", "#3A8AE0", "#5AB84A", "#F48AB0", "#FFFFFF", "#8A5AD8"];
  for (let i = 0; i < 150; i++) {
    const t0 = k0 + rnd(i * 3) * 0.7, age = t - t0; if (age < 0) continue;
    const x = V.X(RX0) + 20 + rnd(i * 5) * 500 + Math.sin(age * 3 + i) * 10, y = STAND_TOP - 60 + age * (90 + rnd(i * 7) * 70);
    if (y > 700) continue; const a = Math.min(sm(age, 0, 0.15), 1 - sm(age, 1.6, 2.3)); if (a <= bayer(R(x), R(y))) continue;
    const col = cols[i % cols.length], flip = Math.sin(age * 9 + i) > 0;
    c.rect(R(x), R(y), flip ? 3 : 2, flip ? 2 : 3, col); c.px(R(x), R(y) + (flip ? 1 : 2), mix(col, "#000000", 0.3));
  }
}

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (off(V)) return; if (!CROWD) buildStrips();
  const { D } = runState(t), xa = R(V.X(TX0 + 4)), xb = R(V.X(TX1 - 2)), pan = V.cx - MID;
  STATIC.blit(c, V);
  // crowd (parallax 0.55), cheering crowd dissolves in on the finish
  const ck = sm(t, ST.cheer0, ST.cheer0 + 0.35);
  const offC = R(D * 0.55 + pan);
  stripBlit(c, CROWD, PC, STAND_TOP, offC, xa, xb, 1);
  if (ck > 0) stripBlit(c, CHEER, PC, STAND_TOP, offC, xa, xb, ck);
  // waving arms of excited fans during the run, camera flashes (more at the finish)
  const flashRate = (t > ST.bang ? 0.18 : 0.04) + ck * 0.5, now = Math.floor(t * 12);
  for (let slot = now - 3; slot <= now; slot++) for (let i = 0; i < 14; i++) {
    const ts = (slot + rnd(slot * 53 + i * 5)) / 12, age = (t - ts) / 0.25; if (age <= 0 || age >= 1) continue;
    const rate = (ts > ST.bang ? 0.18 : 0.04) + sm(ts, ST.cheer0, ST.cheer0 + 0.35) * 0.5; if (rnd(slot * 31 + i * 7) > rate) continue;
    const p = CROWD_PEOPLE[Math.floor(rnd(slot * 17 + i) * CROWD_PEOPLE.length)], X = R(((p.x - offC) % PC + PC) % PC + xa + Math.floor(rnd(slot + i * 3) * 2) * PC), Y = p.y - 17;
    if (X < xa || X > xb) continue; const a = Math.sin(Math.PI * age), rr = R(1 + 2.5 * a), g = fade(c, Math.min(1, a * 1.6));
    for (let k = -rr; k <= rr; k++) { g.px(X + k, Y, "#FFFFFF"); g.px(X, Y + k, "#FFFFFF"); } g.px(X - 1, Y - 1, "#FFF6C0"); g.px(X + 1, Y + 1, "#FFF6C0");
  }
  flagsRow(c, V, t, offC, xa, xb, ck);
  // padded wall (parallax of the far track edge)
  stripBlit(c, WALL, PW, STAND_BOT, R(D * fy(640) + pan), xa, xb, 1);
  drawTrack(c, V, D);
  EDGE.blit(c, V);
  board(c, V, t);
}

export function actors(c, V, t) {
  if (off(V)) return; if (!CROWD) buildStrips();
  const S = runState(t), D = S.D, vk = S.v / ST.smax;
  blocks(c, V, D); finishPost(c, V, D);
  // dust kicked up at each footfall, left on the track (scrolls away with it)
  if (t > ST.bang) for (let i = 0; i < 8; i++) {
    const tt = t - i * 0.07; if (tt < ST.bang) break; const st = runState(tt), age = (t - tt) / 0.55; if (st.v < 40) continue;
    const u = st.D + runOX(tt) - 18, x = trackX(V, u, D, YR); puff(c, x, V.Y(FEET) - 2, 6 + i * 0.6, age + 0.05);
  }
  // explosion of dust out of the blocks
  { const age = (t - ST.bang) / 0.7; if (age > 0 && age < 1) for (let k = 0; k < 4; k++) puff(c, trackX(V, OX0 - 30 - k * 16, D, YR), V.Y(FEET) - 4 - k * 2, 10 + k * 4, age * (0.8 + k * 0.08)); }
  // speed lines behind the runner (streaming left), bolder near the runner
  if (vk > 0.05) for (let i = 0; i < 22; i++) {
    const yy = R(V.Y(FEET) - 20 - rnd(i * 7) * 330), len = (70 + rnd(i * 3) * 140) * vk, ph = ((t * (2.2 + rnd(i) * 2.2) + rnd(i * 5)) % 1), x1 = R(V.X(MID) - 60 - ph * 300), w2 = rnd(i * 11) < 0.5;
    for (let X = R(x1 - len); X <= x1; X++) { const u = (x1 - X) / len, k = (1 - u) * vk * Math.sin(Math.PI * ph) * 1.6; if (k > bayer(X, yy) + 0.05) { c.px(X, yy, u < 0.3 ? "#FFFFFF" : "#EAF4FF"); if (w2 && k > bayer(X, yy + 1) + 0.25) c.px(X, yy + 1, "#D8ECFF"); } }
  }
  drawRunnerStadium(c, V, t, S);
  // LV 3 plate hanging under the speed board
  const sx = V.X(RX0 + 93); c.line(R(sx - 24), 326, R(sx - 24), 338, "#5A6070"); c.line(R(sx + 24), 326, R(sx + 24), 338, "#5A6070");
  sign(c, sx, 362, "LV 3", "plate");
}

function drawRunnerStadium(c, V, t, S) {
  const sx = V.X(MID) + runOX(t), sy = V.Y(FEET), vk = S.v / ST.smax;
  // poses: on your marks → set (hips up) → drive out of the blocks → sprint → slow down → "yay"
  let P = mixPose(POSES.marks, POSES.set, sm(t, ST.set0, ST.set1));
  P.hy += Math.sin(t * 2.6) * 0.8;                                      // breathing in the blocks
  const drive = sm(t, ST.bang - 0.02, ST.bang + 0.38);
  if (drive > 0) {
    const amp = Math.max(0.55, Math.min(1, 0.55 + vk)), run = runPose(S.p, amp);
    run.lean += 0.35 * (1 - sm(t, ST.bang, ST.bang + 0.9));             // low drive phase leaning far forward
    P = mixPose(P, run, drive);
  }
  const yay = sm(t, ST.dec1 - 0.22, ST.dec1 + 0.2);
  if (yay > 0) { const ch = { ...POSES.cheer }; const hop = Math.max(0, Math.sin((t - ST.dec1) * 7)) * 6 * sm(t, ST.dec1, ST.dec1 + 0.3); ch.hy -= hop; P = mixPose(P, ch, yay); }
  // face: determined in the blocks and on the way → big grin from "hit" on
  const grin = sm(t, ST.hit - 0.05, ST.hit + 0.3), cheerMouth = sm(t, ST.finish, ST.finish + 0.3);
  const face = { flat: 1 - grin, brow: lerp(-1, 0.2, grin), grin, grinOpen: cheerMouth, look: [lerp(0.3, 0.15, grin), lerp(0.2, 0.1, grin)], blink: blinkAt(t, 2.7, 0.4), lid: (1 - grin) * 0.18 };
  shadow(c, sx + 6, sy + 1, 50 * S_RUN * 0.8, 6, "#3A1008", 0.3);
  drawRunner(c, sx, sy, { s: S_RUN, pose: P, face, wind: Math.max(0.15, vk), t });
}

export function front(c, V, t) {}

export function hud(c, V, t) {
  if (off(V)) return;
  // "BANG!" burst from the starter's pistol (left of the blocks)
  const k = (t - ST.bang) / 0.75;
  if (k > -0.02 && k < 1) {
    const a = Math.min(sm(k, 0, 0.2), 1 - sm(k, 0.65, 1)), g = fade(c, a), x = R(V.X(MID) - 150), y = R(500 - 12 * ease(Math.min(1, k * 2)));
    const pts = []; for (let i = 0; i < 20; i++) { const ang = (i / 20) * Math.PI * 2, rr = (i % 2 ? 34 : 56) * (0.7 + 0.3 * ease(Math.min(1, k * 3))); pts.push([x + Math.cos(ang) * rr * 1.25, y + Math.sin(ang) * rr * 0.8]); }
    g.poly(pts, "#2A1408"); g.poly(pts.map(([px, py]) => [x + (px - x) * 0.9, y + (py - y) * 0.88]), "#F8C83A"); g.poly(pts.map(([px, py]) => [x + (px - x) * 0.72, y + (py - y) * 0.7]), "#FFF0A0");
    const tw = c.measure(MAIN, "BANG!", { scale: 3 }); g.text(MAIN, "BANG!", x - R(tw / 2) + 1, y - 9, "#F8C83A", { scale: 3 }); g.text(MAIN, "BANG!", x - R(tw / 2), y - 10, "#C8282A", { scale: 3 });
  }
  confetti(c, V, t);
}

// ---------------------------------------------------------------- ICON: the runner's head with the headband, ~56×56
export function ICON(c, cx, cy, a = 1) {
  drawHead(c, cx - 2, cy + 2, 0.48, { grin: 1, brow: -0.2, look: [0.1, 0.1] }, { a, wind: 0.6, t: 0.3 });
}
