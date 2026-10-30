// LV6 · crow — a forest clearing in dappled daylight: big trees with canopies at both sides, far forest behind the
// clearing (the sun disc shows behind the crow's head), ferns, mushrooms, a dirt path and a fallen log with a grub hole.
// A glossy black crow (blue-violet sheen) perches on the log facing the camera.
// "carve hooks from twigs": it holds a forked twig under its foot, nibbles a hook into the end (chips fly), tosses the
// twig to re-grip it, pokes the hook into the log hole and pulls out a grub (+TOOLS on "hooks").
// "scare … years": the hero walks in along the path, the crow notices him ("!"), glares, and follows him hopping along
// the log and up into the branches; a REMEMBERS / FOR YEARS tag; the hero looks back nervously.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, ell, tube, bez, eye, blush, smile, smooth, RAMP, C, pickup, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { drawHero } from "../hero.mjs";
import { Layer, flower, stem, tuft, leafBall, xform, paintHills, grassAt } from "./meadow-kit.mjs";

export const RANGE = BIOME.forest;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (2430, -180): screen = (wx − 2160, wy + 660)
const FEET = [2430, -130];                         // crow's feet on the log top (screen 270, 530)
const HEAD = [2430, -282];                         // crow head centre at rest (screen 270, 378)
const LOG = { x0: 2296, x1: 2584, cy: -75, r: 55 }; // fallen log (screen 136–424, top 530)
const HOLE = [2512, -64];                          // grub hole on the log's front face (screen 352, 596)
const BRANCH = [2556, -190];                       // low branch of the right tree (crow perch, screen 396, 470)
const PATH_Y = 2;                                  // hero's feet on the path (screen 662)

const BARK = ["#1E120C", "#3A2416", "#583822", "#74502E", "#906840", "#AA8456", "#C4A274", "#DCC29A"];
const CANOPY = ["#0E2A16", "#163C1E", "#1F5028", "#2A6632", "#387C3C", "#4A9446", "#64AC54", "#88C46C"];
const FARF = ["#5E9A86", "#70AA92", "#84BAA0", "#9ACAB0"], MIDF = ["#2E6A50", "#3A7C5A", "#4A8E64", "#5EA070"];
const FERN = ["#163C1E", "#22562A", "#2E7034", "#3E8A40", "#56A44E", "#76BC62"];
const CROW = ["#040308", "#08071A", "#0E0C22", "#161430", "#201E44", "#2C2C5E", "#3E4488", "#5E66B8"];
const SHEEN = "#8A92E4", BEAK = ["#0C0A12", "#1C1A26", "#2C2A3A", "#3E3C50", "#545268", "#6E6C84", "#8C8AA2", "#ACAAC0"];
const GRUB = ["#6A4A2A", "#B49464", "#E2CC9C", "#F6E8C6", "#FFF8E4"];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 840); FRONT = new Layer(RX0 - 40, -160, RX1 + 40, 840);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0, RX1, LAND);
  // far forest silhouettes behind the clearing (kept low in the middle so the sun disc stays free)
  const env = (x) => 1 - 0.55 * Math.exp(-(((x - 2430) / 110) ** 2));
  for (const [layer, ramp, base, amp, seed] of [[0, FARF, 150, 70, 3], [1, MIDF, 96, 56, 9]]) {
    for (let i = 0; i < 26; i++) {
      const x = RX0 + 12 + i * 19 + rnd(i * 7 + seed) * 10, h = (base + rnd(i * 13 + seed) * amp) * env(x) * (1 - sm(x, RX1 - 60, RX1 + 10) * 0.7), w = 16 + rnd(i * 5 + seed) * 14, cone = rnd(i * 3 + seed) < 0.45;
      if (h < 30) continue; const top = LAND - h;
      if (cone) { for (let y = R(top); y < LAND; y++) { const k = (y - top) / h, half = w * 0.25 + k * w; for (let X = R(x - half); X <= R(x + half); X++) { if (Math.abs(X - x) > half - 1 || (y - top) % 9 === 0 && Math.abs(X - x) > half * 0.6) g.px(X, y, ramp[1]); else g.px(X, y, ramp[k < 0.25 ? 3 : (X - x) < 0 ? 2 : 1]); } } }
      else { g.rect(R(x - 2), R(top + w), 5, R(h - w), ramp[0]); leafBall(g, x, top + w * 0.8, w * 0.9, [ramp[0], ramp[1], ramp[2], ramp[3]], i + seed * 10, { amp: 0.1, bumps: 6, outline: ramp[0] }); }
    }
  }
  // forest floor: shared ramp, darker inside the forest (fades back at both seams), moss and leaf litter
  for (let y = LAND; y < 840; y++) for (let x = RX0; x < RX1; x++) {
    const d = y - LAND, w = sm(x, RX0, RX0 + 90) * (1 - sm(x, RX1 - 160, RX1 - 60)), bank = sm(x, RX1 - 124, RX1 - 52);
    let col = grassAt(x, y, d, 1.6 * w);
    if (bank > bayer(x, y) * 0.98 + 0.01) col = d < 1.5 ? "#B0D46E" : d < 4 ? "#6EA844" : d < 16 + Math.sin(x * 0.3) * 2 ? (d < 6 ? "#7A5232" : "#6A4628") : strata(x, y, d);
    g.px(x, y, col);
  }
  g.rect(RX0, LAND, RX1 - RX0, 1, "#8ABE6A");
  for (let i = 0; i < 3600; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 501), 1.4) * 850), x = R(RX0 + rnd(i * 3 + 502) * (RX1 - RX0 - 120)), d = y - LAND, h = d < 50 ? 1 : d < 180 ? 2 : 3, r = rnd(i * 5 + 503);
    const col = r < 0.4 ? mix(g.get(x, y), "#0E2A16", 0.3) : r < 0.75 ? mix(g.get(x, y), "#C8E890", 0.22) : r < 0.88 ? "#A0602A" : "#C88A3A";
    for (let j = 0; j < (r < 0.75 ? h : 1); j++) g.px(x, y - j, col); if (r >= 0.75 && d > 60) g.px(x + 1, y, col);
  }
  // the dirt path (in front of the log), widening toward the viewer, sandy toward the bay
  const pathC = (x) => 30 + Math.sin((x - RX0) * 0.012) * 8 - sm(x, RX1 - 200, RX1 - 60) * 30, pathW = (x) => 14 - sm(x, RX1 - 200, RX1 - 60) * 6;
  for (let x = RX0; x < RX1 - 50; x++) { const c0 = pathC(x), w = pathW(x), fadeP = 1 - sm(x, RX1 - 150, RX1 - 60); for (let y = R(c0 - w); y <= R(c0 + w); y++) { const e = Math.abs(y - c0) / w, sand = sm(x, RX1 - 100, RX1); if (e > 1 || fadeP <= bayer(x, y)) continue; let col = e > 0.82 ? "#6A4A2A" : y < c0 - w * 0.3 ? "#B48A58" : "#A07648"; if (sand > 0) col = mix(col, "#E2D0A0", sand); if (e <= 0.82 && rnd(x * 31 + y * 7) < 0.06) col = "#7A5634"; if (e > 0.82 && bayer(x, y) > 0.6) col = mix(g.get(x, y), "#4A3420", 0.6); g.px(x, y, col); } }
  // dappled light on the floor
  for (let i = 0; i < 30; i++) { const cx = RX0 + rnd(i * 11 + 601) * (RX1 - RX0 - 150), cy = LAND + 8 + rnd(i * 11 + 602) * 260, rx = 8 + rnd(i * 3) * 18, ry = rx * (0.2 + (cy - LAND) / 700); for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) { const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (d < 1 && (1 - d) * 0.9 > bayer(X, Y)) g.blend(X, Y, "#E8F4A0", 0.32); } }
  // big trees at both sides (trunks, roots, bark) + their canopies; the right one has a low branch for the crow
  tree(g, 2196, 34, 1); tree(g, 2640, 30, 2);
  branch(g, 2618, -196, 2532, -186);
  // canopy masses (top corners), dappled with light leaves, leaving the clearing open
  for (const [x, y, r, s] of [[2236, -640, 70, 1], [2262, -592, 62, 2], [2314, -642, 56, 3], [2214, -520, 52, 4], [2256, -500, 44, 5], [2348, -604, 44, 6], [2198, -440, 36, 7], [2222, -420, 32, 8],
    [2652, -640, 70, 11], [2600, -600, 62, 12], [2540, -642, 56, 13], [2672, -520, 52, 14], [2610, -490, 44, 15], [2512, -610, 42, 16], [2690, -440, 38, 17], [2640, -415, 32, 18]]) leafBall(g, x, y, r, CANOPY, s, { amp: 0.13, bumps: 9 });
  for (let i = 0; i < 260; i++) { const x = R(RX0 - 30 + rnd(i * 7 + 701) * (RX1 - RX0 + 60)), _ = 0, y = R(-660 + rnd(i * 7 + 702) * 280); if (g.has(x, y) && g.get(x, y)[1] > 60 && rnd(i) < 0.6) { g.px(x, y, "#9ED27A"); if (rnd(i * 3) < 0.5) g.px(x + 1, y, "#7EBE64"); } }
  // ferns and mushrooms around the roots and the log, bluebells
  for (const [x, y, s, fl] of [[2236, -16, 1, 1], [2262, -10, 0.8, -1], [2176, -8, 0.9, 1], [2596, -14, 1, -1], [2620, -6, 0.85, 1], [2560, -12, 0.7, 1], [2318, -14, 0.7, -1], [2470, -18, 0.6, 1]]) fern(g, x, y, s, fl);
  for (const [x, y, s, red] of [[2246, -18, 1.1, 1], [2258, -16, 0.8, 1], [2600, -20, 1, 1], [2590, -18, 0.7, 0], [2290, -20, 0.9, 0], [2340, -126, 0.6, 1], [2552, -122, 0.7, 0], [2566, -124, 0.5, 0]]) mushroom(g, x, y, s, red);
  for (let i = 0; i < 26; i++) { const x = R(RX0 + 20 + rnd(i * 13 + 801) * (RX1 - RX0 - 120)), y = R(LAND + 46 + rnd(i * 13 + 802) * 200); if (Math.abs(y - LAND - 30) < 22) continue; stem(g, x, y - 6, y, "#2E6A30", 0, false); flower(g, x, y - 7, 2, rnd(i) < 0.5 ? "#8A9CF0" : "#B48AE8", "#E8E0FF"); }
  fallenLog(g);
  // FRONT: big foreground ferns in the bottom corners, tufts
  for (const [x, y, s, fl] of [[2176, 250, 2.2, 1], [2640, 250, 2.0, -1], [2560, 306, 1.5, -1], [2250, 296, 1.5, 1]]) fern(f, x, y, s, fl);
  for (let i = 0; i < 36; i++) { const x = R(RX0 + rnd(i * 13 + 901) * (RX1 - RX0 - 70)), y = R(LAND + 250 + rnd(i * 13 + 905) * 330); tuft(f, x, y, 10 + rnd(i) * 12, 3 + Math.floor(rnd(i * 3) * 3), ["#163C1E", "#22562A", "#3A7A3A"], i * 5 + 900, (rnd(i * 9) - 0.5) * 4); }
}

function tree(g, x, w, seed) {
  const top = -700, O = BARK[0];
  for (let y = top; y < LAND + 2; y++) {
    const flare = Math.max(0, (y - (LAND - 46)) / 46), half = w / 2 + flare * flare * 22, sway = Math.sin(y * 0.012 + seed) * 3;
    for (let X = R(x - half + sway); X <= R(x + half + sway); X++) {
      const u = (X - (x + sway)) / half, edge = Math.abs(u) > 0.94; let s = edge ? 0 : 4 - (u > 0.35 ? 1 : 0) - (u > 0.7 ? 1 : 0) + (u < -0.5 ? 1 : 0);
      const groove = Math.sin(X * 0.9 + Math.sin(y * 0.05 + seed) * 2.2) > 0.82; if (!edge && groove) s -= 2;
      if (!edge && rnd(X * 13 + y * 7 + seed) < 0.03) s += 1;
      g.px(X, y, BARK[Math.max(0, Math.min(6, s))]);
    }
  }
  // moss on the shaded side near the base
  for (let i = 0; i < 80; i++) { const y = R(LAND - 6 - rnd(i * 3 + seed) * 120), X = R(x + w * 0.2 + rnd(i * 5 + seed) * w * 0.35); if (g.has(X, y)) g.px(X, y, rnd(i) < 0.5 ? "#4A8A3A" : "#6AA84A"); }
  g.rect(x - w / 2 - 22, LAND, w + 44, 2, "#2A3A1A"); void O;
}
function branch(g, x0, y0, x1, y1) {
  for (let i = 0; i <= 90; i++) { const k = i / 90, x = lerp(x0, x1, k), y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 6, r = lerp(7, 3, k); for (let d = -r; d <= r; d++) g.px(R(x), R(y + d), Math.abs(d) >= r - 0.6 ? BARK[0] : d < -r * 0.3 ? BARK[5] : BARK[3]); }
  leafBall(g, x1 - 4, y1 - 10, 12, CANOPY, 41, { amp: 0.15, bumps: 7 }); leafBall(g, x1 + 16, y1 - 18, 9, CANOPY, 42, { amp: 0.15, bumps: 7 });
}
function fern(g, x, y, s, flip) {
  for (let k = 0; k < 7; k++) {
    const ang = -Math.PI / 2 + (k - 3) * 0.42 * flip, len = (28 + (3 - Math.abs(k - 3)) * 10) * s, droop = 0.9;
    let px = x, py = y, a = ang; const n = R(len / 2);
    for (let i = 0; i < n; i++) {
      a += (ang < -Math.PI / 2 ? -1 : 1) * 0.035 * droop * (k === 3 ? 0.3 : 1); px += Math.cos(a) * 2; py += Math.sin(a) * 2;
      g.px(R(px), R(py), FERN[1]);
      const leaf = Math.max(1, (1 - i / n) * 6 * s);
      for (let j = 1; j <= leaf; j++) { const col = j > leaf - 1 ? FERN[2] : FERN[3 + (k % 2)]; g.px(R(px + Math.cos(a - 1.2) * j), R(py + Math.sin(a - 1.2) * j), col); g.px(R(px + Math.cos(a + 1.2) * j), R(py + Math.sin(a + 1.2) * j), j > leaf - 1 ? FERN[2] : FERN[4]); }
    }
  }
}
function mushroom(g, x, y, s, red) {
  const h = R(10 * s), cw = R(9 * s), ch = R(6 * s);
  g.rect(x - R(2 * s), y - h, R(4 * s) + 1, h, "#5A4A3A"); g.rect(x - R(2 * s) + 1, y - h, Math.max(1, R(4 * s) - 1), h, "#F4ECDC");
  for (let Y = -ch; Y <= 0; Y++) for (let X = -cw; X <= cw; X++) { const d = (X / cw) ** 2 + (Y / ch) ** 2; if (d > 1) continue; const edge = d > 0.78 && (Y === 0 || d > 0.85); g.px(x + X, y - h + Y, edge ? (red ? "#5A0A12" : "#3A2414") : red ? (Y < -ch * 0.5 && X < 0 ? "#F45A4A" : "#D8322E") : (Y < -ch * 0.5 && X < 0 ? "#C8946A" : "#A87448")); }
  if (red) for (const [dx, dy] of [[-0.5, -0.6], [0.3, -0.75], [0.6, -0.3], [-0.15, -0.3]]) { const X = R(x + dx * cw), Y = R(y - h + dy * ch); g.px(X, Y, "#FFFFFF"); if (s > 0.8) g.px(X + 1, Y, "#FFFFFF"); }
}
function fallenLog(g) {
  const { x0, x1, cy, r } = LOG;
  for (let x = x0; x < x1; x++) for (let y = cy - r; y <= cy + r; y++) {
    const v = (y - cy) / r; if (Math.abs(v) > 1) continue;
    const edge = Math.abs(v) > 0.96 || x === x0 || x === x1 - 1, light = -v * 0.9 + 0.2;
    let s = edge ? 0 : 3 + light * 1.6 + (Math.sin(x * 0.55 + Math.sin(y * 0.09) * 2.5) > 0.86 ? -1.6 : 0) + (rnd(x * 7 + y * 13) < 0.04 ? 1 : 0);
    s = Math.max(0, Math.min(7, s)); const fl = Math.floor(s); g.px(x, y, BARK[s - fl > bayer(x, y) ? Math.min(7, fl + 1) : fl]);
  }
  // cut end (left) with rings, jagged broken end (right)
  for (let y = cy - r; y <= cy + r; y++) for (let x = x0 - 14; x <= x0 + 14; x++) { const d = ((x - x0) / 14) ** 2 + ((y - cy) / r) ** 2; if (d > 1) continue; const q = Math.sqrt(d); g.px(x, y, d > 0.86 ? BARK[1] : (Math.floor(q * 7) % 2 ? "#C8A070" : "#E0BC88")); }
  g.px(x0, cy, "#7A5634"); g.px(x0 + 1, cy, "#7A5634");
  for (let y = cy - r; y <= cy + r; y++) { const d = ((y - cy) / r) ** 2; for (let x = x1 - 1; x <= x1 + R(10 * Math.sqrt(Math.max(0, 1 - d))); x++) { const e = ((x - x1 + 1) / 11) ** 2 + d; g.px(x, y, e > 0.82 ? BARK[1] : Math.floor(Math.sqrt(e) * 6) % 2 ? "#B8905E" : "#D0AA78"); } }
  // moss on top, a few leaves
  for (let x = x0 + 4; x < x1 - 4; x++) { const th = 3 + Math.sin(x * 0.07) * 2 + Math.sin(x * 0.21) * 1.5; for (let j = 0; j < th; j++) { const y = cy - r + 1 + j + R(Math.max(0, Math.abs(x - (x0 + x1) / 2) - 100) * 0.02); g.px(x, y, j === 0 ? "#86C25A" : rnd(x * 3 + j) < 0.5 ? "#5A9A3E" : "#4A8636"); } }
  // the grub hole on the front face
  const [hx, hy] = HOLE; for (let Y = -9; Y <= 9; Y++) for (let X = -10; X <= 10; X++) { const d = (X / 10) ** 2 + (Y / 9) ** 2; if (d <= 1) g.px(hx + X, hy + Y, d > 0.7 ? (Y < 0 ? "#3A2416" : "#AA8456") : "#140A06"); }
  // soft contact shadow under the log
  for (let x = x0 - 10; x < x1 + 14; x++) for (let y = LAND; y < LAND + 7; y++) g.blend(x, y, "#0E2A16", 0.45 * (1 - (y - LAND) / 7));
}

// the bay's sand cross-section look (same formula as its strata), so the forest floor turns into the beach bank
const STRATA = ["#E4C48C", "#D6B078", "#CBA26A", "#DDB982", "#C2965E", "#D2AA72"];
function strata(wx, wy, d) {
  const wv = Math.sin(wx * 0.031) * 5 + Math.sin(wx * 0.11) * 2, v = (wy + wv + 400) / 22, band = Math.floor(v), f = v - band;
  let col = STRATA[band % STRATA.length]; if (f < 0.08 && bayer(wx, wy) > 0.4) col = mix(col, "#7A5636", 0.22);
  if (wy > 120) col = mix(col, "#8A6440", Math.min(0.45, (wy - 120) / 700));
  return col;
}

// ---------------------------------------------------------------- the crow
const EYE = ["#05040A", "#100E1C", "#1C1A30", "#4A4A90", "#7070C0"];
/** Glossy crow facing the camera. f = feet point; o.head [dx, dy] head offset, tilt, look, blink, glare 0..1, wing 0 folded → 1 spread, flap. */
function drawCrow(c, fx, fy, t, o = {}) {
  const br = Math.sin(t * 2 * Math.PI * 0.6) * 1.2, hd = o.head ?? [0, 0], tilt = o.tilt ?? 0, wing = o.wing ?? 0, flap = o.flap ?? 0, air = o.air ?? 0;
  const lean = Math.max(-0.32, Math.min(0.32, hd[0] / 260)), bx = fx + Math.sin(lean) * 66 + hd[0] * 0.08, by = fy - 66 * Math.cos(lean) + br * 0.5 + Math.max(0, hd[1]) * 0.12, hx = fx + hd[0], hy = fy - 152 + hd[1] + br;
  // tail fan (visible below the body when airborne or hopping)
  if (air > 0.02) { const tl = []; for (let i = -2; i <= 2; i++) tl.push(tube([[bx + i * 6, by + 50], [bx + i * 15, by + 50 + 40 * air]], 6, 7)); blob(c, tl, { ramp: CROW, thick: 5, base: 2.8, litOutline: SHEEN }); }
  // wings (behind the body when spread)
  const wingPoly = (s) => {
    const sh = [bx + s * 34, by - 34], open = wing * (1.35 + 0.5 * Math.sin(flap)), pts = [[0, 0], [14, 4], [24, 24], [30, 50], [32, 74], [28, 88], [22, 80], [18, 94], [11, 84], [5, 96], [-1, 85], [-7, 92], [-10, 76], [-12, 50], [-10, 24], [-6, 6]].map(([px, py]) => [px * s, py]);
    return xform(pts.map(([px, py]) => [sh[0] + px, sh[1] + py]), sh[0], sh[1], -s * open);
  };
  if (wing > 0.02) for (const s of [-1, 1]) { const wp = wingPoly(s); blob(c, [wp], { ramp: CROW, thick: 12, base: 3.0, gain: 2.2, litOutline: SHEEN }); const sh = [bx + s * 34, by - 34], an = -s * wing * (1.35 + 0.5 * Math.sin(flap)); for (const k of [0.45, 0.62]) { const a2 = xform([[s * -8, 60 * k + 6], [s * 26, 60 * k]], 0, 0, an).map(([u, v]) => [sh[0] + u, sh[1] + v]); c.line(R(a2[0][0]), R(a2[0][1]), R(a2[1][0]), R(a2[1][1]), "#3E4488"); } }
  // body egg + chest scallops
  blob(c, [ell(bx, by, 58, 64)], { ramp: CROW, thick: 28, base: 2.6, gain: 2.6, litOutline: SHEEN });
  const g = c; for (let row = 0; row < 4; row++) for (let i = -2; i <= 2; i++) { const cx = bx + i * 14 + (row % 2) * 7, cy = by - 12 + row * 13; if (Math.abs(cx - bx) > 40 - row * 4) continue; for (let a = 0.3; a < 2.85; a += 0.25) g.px(R(cx + Math.cos(a) * 6), R(cy + Math.sin(a) * 3), "#30306A"); }
  // folded wings at the sides
  if (wing < 0.98) for (const s of [-1, 1]) { const fw = xform(smooth([[bx + s * 28, by - 42], [bx + s * 52, by - 30], [bx + s * 64, by + 2], [bx + s * 64, by + 36], [bx + s * 54, by + 62], [bx + s * 46, by + 56], [bx + s * 40, by + 68], [bx + s * 33, by + 56], [bx + s * 26, by + 64], [bx + s * 24, by + 20]], new Set([4, 5, 6, 7, 8]), 4), bx + s * 30, by - 40, -s * wing * 1.2); blob(c, [fw], { ramp: CROW, thick: 14, base: 3.1, gain: 2.0, litOutline: SHEEN, a: 1 - wing }); for (let i = 0; i < 3; i++) { const yy = by + 6 + i * 14; fade(c, 1 - wing).line(R(bx + s * (34 + i * 2)), R(yy), R(bx + s * (58 - i * 3)), R(yy + 8), "#2C2C5E"); } }
  // feet gripping the perch
  for (const s of [-1, 1]) { const x = R(bx + s * 16), y = R(fy - 4); c.rect(x - 2, y - 10 + R(air * 6), 4, 10, "#2C2A3A"); for (const dx of [-6, -1, 4]) { c.line(x, y, x + dx, y + 4 + R(air * 6), "#1C1A26"); c.px(x + dx, y + 5 + R(air * 6), "#3E3C50"); } }
  // neck when the head dips away from the body
  const dl = Math.hypot(hd[0], hd[1]); if (dl > 10) { const nx0 = bx, ny0 = by - 44, mx = lerp(nx0, hx, 0.5), my = lerp(ny0, hy + 12, 0.5), len = Math.hypot(hx - nx0, hy + 12 - ny0); blob(c, [ell(mx, my, 30, len / 2 + 14, Math.atan2(hy + 12 - ny0, hx - nx0) - Math.PI / 2)], { ramp: CROW, thick: 18, base: 2.6, gain: 2.4, litOutline: SHEEN }); }
  // head (round, glossy), feather tuft, eye rings
  const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  const H = (pts) => pts.map(([dx, dy]) => P(dx, dy));
  for (const [dx, h, lean] of [[-6, 9, -4], [1, 13, 1], [8, 9, 5]]) blob(c, [tube([P(dx, -40), P(dx + lean * 0.4, -40 - h * 0.6), P(dx + lean, -40 - h)], 3.2, 1.4)], { ramp: CROW, thick: 2, base: 3.4, litOutline: SHEEN });
  blob(c, [H(ell(0, 0, 47, 44))], { ramp: CROW, thick: 24, base: 2.7, gain: 2.5, litOutline: SHEEN });
  // sheen highlights on the crown
  for (let a = -2.5; a < -0.9; a += 0.06) { const [sx, sy] = P(Math.cos(a) * 36, Math.sin(a) * 33); c.px(R(sx), R(sy), "#5A62A8"); }
  for (let a = -2.3; a < -1.7; a += 0.08) { const [sx, sy] = P(Math.cos(a) * 31, Math.sin(a) * 28); c.px(R(sx), R(sy), "#9AA2F0"); }
  const look = o.look ?? [0, 0], blink = o.blink ?? 0, glare = o.glare ?? 0;
  for (const s of [-1, 1]) {
    const [ex, ey] = P(s * 19, -4);
    for (let Y = -16; Y <= 16; Y++) for (let X = -15; X <= 15; X++) { const d = (X / 15) ** 2 + (Y / 16) ** 2; if (d <= 1 && d > 0.62) c.px(R(ex + X), R(ey + Y), d > 0.86 ? "#14122A" : "#3E3A70"); }
    eye(c, ex, ey, 12, { ry: 13, iris: EYE, pupil: "bead", look, blink: Math.max(blink, glare * 0.22), lid: CROW[3] });
    if (glare > 0.01) {
      // angled lid over the inner-top of the eye + a light brow stroke: a cute glare
      const k = glare, lid = [[ex - s * 15, ey - 16], [ex + s * 15, ey - 16], [ex + s * 15, ey - 16 + 6 * k], [ex - s * 13, ey - 16 + 17 * k]];
      fade(c, Math.min(1, k * 1.5)).poly(lid, CROW[2]);
      const g2 = fade(c, Math.min(1, k * 1.5)); g2.line(R(ex - s * 14), R(ey - 15 + 16 * k), R(ex + s * 14), R(ey - 15 + 4 * k), "#9AA2F0"); g2.line(R(ex - s * 14), R(ey - 16 + 16 * k), R(ex + s * 14), R(ey - 16 + 4 * k), "#C8CCFF");
      const sx = R(ex - 4 + look[0] * 2), sy = R(ey + 3); g2.rect(sx, sy, 3, 3, "#FFFFFF"); g2.px(R(ex + 5), R(ey + 7), "#E8E4FF");
    }
  }
  { const [a1, b1] = P(-33, 16), [a2, b2] = P(33, 16); blush(c, a1, b1, 7, 3.5, "#E86A90"); blush(c, a2, b2, 7, 3.5, "#E86A90"); }
  // small beak pointing down at the viewer, nostril bristles
  const bk = H([[-11, 6], [11, 6], [5, 26], [0, 33], [-5, 26]]); blob(c, [bk], { ramp: BEAK, thick: 4, base: 3.4, outline: "#05040A", litOutline: "#6E6C84" });
  { const [ax, ay] = P(0, 8), [bx2, by2] = P(0, 30); c.line(R(ax), R(ay), R(bx2), R(by2), "#545268"); const [m1, m2] = P(-7, 19), [n1, n2] = P(7, 19); c.line(R(m1), R(m2), R(n1), R(n2), o.beakOpen ? "#5A1A2A" : "#05040A"); }
  for (const s of [-1, 1]) { const [qx, qy] = P(s * 6, 7); c.px(R(qx), R(qy), "#3A3C6E"); c.px(R(qx + s), R(qy - 1), "#3A3C6E"); }
  return { beak: P(0, 33) };
}

// ---------------------------------------------------------------- twig (forked → hooked) and grub
/** Draw the twig from base point b toward angle th (length 84). hook 0 = fork, 1 = carved hook. clip: hide pixels inside the hole. */
function drawTwig(c, b, th, hook, clip = null, a = 1) {
  const g = fade(c, a), L = 84, ux = Math.cos(th), uy = Math.sin(th), nx = -uy, ny = ux;
  const W = (s, n) => [b[0] + ux * s + nx * n, b[1] + uy * s + ny * n];
  const seg = (p, q, col, w) => { const n = Math.max(1, R(Math.hypot(q[0] - p[0], q[1] - p[1]))); for (let i = 0; i <= n; i++) { const x = lerp(p[0], q[0], i / n), y = lerp(p[1], q[1], i / n); for (let d = -w; d <= w; d++) { const X = R(x + nx * d * 0.7), Y = R(y + ny * d * 0.7); if (clip && (X - clip[0]) ** 2 + (Y - clip[1]) ** 2 < 70) continue; g.px(X, Y, Math.abs(d) === w ? "#2A160C" : d < 0 ? "#B8875A" : "#8A5A34"); } } };
  seg(W(0, 0), W(L, 0), "#8A5A34", 2);
  seg(W(26, 0), W(34, -6), "#8A5A34", 1);                                       // a little side stub
  // fork end: prong A (straight on) is nibbled away; prong B bends into the hook
  const pa = 1 - hook; if (pa > 0.05) seg(W(L - 2, 0), W(L + 14 * pa, -5 * pa), "#8A5A34", 1);
  const hb = [[L - 4, 0], [L + 6 - hook * 2, 6 + hook * 2], [L + 8 - hook * 8, 10 + hook * 2], [L + 2 - hook * 12, 10 - hook * 2]].map(([s, n]) => W(s, n));
  seg(hb[0], hb[1], "#8A5A34", 1); if (hook > 0.2) seg(hb[1], hb[2], "#8A5A34", 1); if (hook > 0.6) seg(hb[2], hb[3], "#8A5A34", 1);
  return W(L + 4, 6);
}
function drawGrub(c, x, y, t, a = 1) {
  if (a <= 0) return; const g = fade(c, a);
  for (let i = 0; i < 5; i++) { const w = Math.sin(t * 9 + i * 0.9) * 1.5, cx = x + w * (i / 4), cy = y + i * 4, r = 4 - Math.abs(i - 2) * 0.4; for (let Y = -3; Y <= 3; Y++) for (let X = -5; X <= 5; X++) { const d = (X / (r + 1)) ** 2 + (Y / 3) ** 2; if (d <= 1) g.px(R(cx + X), R(cy + Y), d > 0.7 ? GRUB[1] : Y < 0 ? GRUB[4] : GRUB[3]); } }
  g.rect(R(x) - 2, R(y) - 4, 5, 3, GRUB[0]); g.px(R(x) - 1, R(y) - 3, "#140A06"); g.px(R(x) + 1, R(y) - 3, "#140A06");
}

// ---------------------------------------------------------------- choreography (world coords)
const T = {
  dip: EV.carve - 0.12, carve0: EV.carve + 0.12, carve1: EV.twigs - 0.12, grab: EV.twigs - 0.1, lift: EV.twigs + 0.06, catch: EV.twigs + 0.44,
  poke: EV.twigs + 0.66, pull: EV.twigs + 0.82, held: EV.twigs + 1.08, gulp: EV.twigs + 1.12, drop: EV.twigs + 1.3, dropEnd: EV.twigs + 1.58,
  notice: EV.scare + 0.3, glare: EV.remembers, hop1: EV.face + 0.15, hop2: EV.face + 0.55,
};
// timing table (also read by levels/meadow-motions.mjs for the sound design)
export const FT = { tools: EV.hooks, pickup: 1.6, nibHz: 7, flapHz: 5, hops: [[T.hop1, 0.3], [T.hop2, 0.36]], bangPop: 0.18, bangOut: EV.face + 0.2, tag: [EV.remembers + 0.05, EV.years1 + 1.6], line2: [EV.years1 - 0.25, EV.years1 + 0.1], glare: [T.glare - 0.05, T.glare + 0.3], back: [EV.face - 0.25, EV.years1 + 1.4], turn: [T.notice - 0.1, T.notice + 0.15], chips: [T.carve0, T.carve1 - 0.1], grubIn: [T.pull - 0.02, T.pull + 0.14], holdUp: 0.35 };
const HERO0 = EV.scare - 0.22, HERO_V = 175, HERO_IN = RX0 - 40, HERO_STOP = 2590, HERO_DEC = 0.6, HERO_BRAKE = HERO_V * HERO_DEC / 2, HERO_T1 = HERO0 + (HERO_STOP - HERO_BRAKE - HERO_IN) / HERO_V;
// walks in at a brisk pace, slows down and stops under the branch (never enters the bay)
const heroX = (t) => t < HERO_T1 ? HERO_IN + HERO_V * (t - HERO0) : HERO_STOP - HERO_BRAKE + HERO_BRAKE * (1 - (1 - clamp01((t - HERO_T1) / HERO_DEC)) ** 2);
const STRIDE = (HERO_STOP - HERO_IN) / 5.5;            // ≈ 85 px per step cycle (~2 cycles/s): ends with the feet together
const TW_FOOT = [FEET[0] + 16, FEET[1]], TH0 = -0.95, TWL = 84;
const BEAK_OFF = (tilt) => [-Math.sin(tilt) * 33, Math.cos(tilt) * 33];
const dirv = (a) => [Math.cos(a), Math.sin(a)];
const TW_END0 = [TW_FOOT[0] + TWL * Math.cos(TH0), TW_FOOT[1] + TWL * Math.sin(TH0)];
// head offsets (relative to HEAD) for each pose: beak tip on the twig end (carving), poke the hook into the hole
const headFor = (beakTip, tilt) => { const o = BEAK_OFF(tilt); return [beakTip[0] - o[0] - HEAD[0], beakTip[1] - o[1] - HEAD[1]]; };
const TILT_C = -0.38, H_CARVE = headFor(TW_END0, TILT_C);
const TH_POKE = Math.PI / 2 - 0.22, POKE_END = [HOLE[0] + 1, HOLE[1] + 3], POKE_BEAK = [POKE_END[0] - TWL * Math.cos(TH_POKE), POKE_END[1] - TWL * Math.sin(TH_POKE)], TILT_P = -0.3, H_POKE = headFor(POKE_BEAK, TILT_P);
const H_LIFT = [H_CARVE[0] - 8, H_CARVE[1] - 30], H_CATCH = [H_POKE[0] - 6, H_POKE[1] - 52], H_PULL = [H_POKE[0] - 4, H_POKE[1] - 46], H_HOLD = [8, 4];
const mixP = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];

/** Everything the crow does at time t. */
function crowState(t) {
  let head = [0, 0], tilt = 0, twig = null, grub = 0, chips = 0, hook = 0, feet = [...FEET], wing = 0, flap = 0, air = 0;
  hook = sm(t, T.carve0 + 0.1, T.carve1 - 0.05);
  const k = (a, b) => ease(clamp01((t - a) / (b - a)));
  // head path
  if (t < T.dip) { head = [0, 0]; }
  else if (t < T.carve0) { const q = k(T.dip, T.carve0); head = mixP([0, 0], H_CARVE, q); tilt = TILT_C * q; }
  else if (t < T.grab) { const nib = Math.max(0, Math.sin((t - T.carve0) * 2 * Math.PI * FT.nibHz)) * 3.5 * (t < T.carve1 ? 1 : 0); head = [H_CARVE[0] - nib * 0.5, H_CARVE[1] - nib]; tilt = TILT_C; }
  else if (t < T.lift) { const q = k(T.grab, T.lift); head = mixP(H_CARVE, H_LIFT, q); tilt = TILT_C * (1 - q * 0.6); }
  else if (t < T.catch) { const q = k(T.lift, T.catch); head = mixP(H_LIFT, H_CATCH, q); tilt = lerp(TILT_C * 0.4, TILT_P * 0.5, q); }
  else if (t < T.poke) { const q = k(T.catch, T.poke); head = mixP(H_CATCH, H_POKE, q); tilt = lerp(TILT_P * 0.5, TILT_P, q); }
  else if (t < T.pull) { const w = Math.sin((t - T.poke) * 2 * Math.PI * 9) * 1.5; head = [H_POKE[0] + w, H_POKE[1]]; tilt = TILT_P; }
  else if (t < T.held) { const q = k(T.pull, T.held); head = mixP(H_POKE, H_PULL, q); tilt = TILT_P * (1 - q * 0.5); }
  else { const q = k(T.held, T.held + FT.holdUp); head = mixP(H_PULL, H_HOLD, q); tilt = lerp(TILT_P * 0.5, 0, q); }
  // twig (base point + angle), relative to the moving beak
  const br = Math.sin(t * 2 * Math.PI * 0.6) * 1.2, beakAt = (hd, tl) => { const o = BEAK_OFF(tl); return [HEAD[0] + hd[0] + o[0], HEAD[1] + hd[1] + o[1] + br]; };
  const beak = beakAt(head, tilt);
  if (t < T.grab) twig = { b: TW_FOOT, th: TH0 };
  else if (t < T.lift) { const q = k(T.grab, T.lift), th = lerp(TH0, -Math.PI / 2, q), d = dirv(th); twig = { b: [beak[0] - d[0] * TWL, beak[1] - d[1] * TWL], th }; }   // held by the hook end, swinging to hang
  else if (t < T.catch) {
    // toss: the twig flips once in the air and is caught by its base
    const q = clamp01((t - T.lift) / (T.catch - T.lift)), b0 = beakAt(H_LIFT, TILT_C * 0.4), b1 = beakAt(H_CATCH, TILT_P * 0.5);
    const m0 = [b0[0], b0[1] + TWL / 2], m1 = [b1[0], b1[1] + TWL / 2], m = [lerp(m0[0], m1[0], q), lerp(m0[1], m1[1], q) - Math.sin(q * Math.PI) * 46], th = -Math.PI / 2 + Math.PI * ease(q), d = dirv(th);
    twig = { b: [m[0] - d[0] * TWL / 2, m[1] - d[1] * TWL / 2], th };
  } else if (t < T.dropEnd) {
    const sway = (u) => Math.sin(u * 3) * 0.05 * sm(u, T.held, T.held + 0.3), th = t < T.poke ? lerp(Math.PI / 2, TH_POKE, k(T.catch, T.poke)) : t < T.held ? lerp(TH_POKE, Math.PI / 2 - 0.4, k(T.pull, T.held)) : Math.PI / 2 - 0.4 + sway(t);
    twig = { b: beak, th };
    if (t >= T.drop) { const q = clamp01((t - T.drop) / (T.dropEnd - T.drop)), land = [FEET[0] + 28, FEET[1] - 2]; twig = { b: [lerp(beak[0], land[0], q), lerp(beak[1], land[1], q) + Math.sin(q * Math.PI) * -10 + q * q * 0], th: lerp(Math.PI / 2 - 0.4 + sway(T.drop), -0.04, ease(q)) }; }
  } else twig = { b: [FEET[0] + 28, FEET[1] - 2], th: -0.04 };
  grub = sm(t, FT.grubIn[0], FT.grubIn[1]) * (1 - sm(t, T.gulp, T.drop));
  // hops after the hero (feet move along arcs; wings open in the air)
  const hop = (t0, dur, from, to, h) => { const q = clamp01((t - t0) / dur); if (q <= 0 || q >= 1) return null; return { p: [lerp(from[0], to[0], ease(q)), lerp(from[1], to[1], ease(q)) - Math.sin(q * Math.PI) * h], q }; };
  const H1 = [FEET[0] + 60, FEET[1]], legs = [[FT.hops[0][0], FT.hops[0][1], FEET, H1, 30], [FT.hops[1][0], FT.hops[1][1], H1, BRANCH, 46]];
  for (const [t0, dur, a, b, h] of legs) { if (t >= t0 + dur) feet = [...b]; const s = hop(t0, dur, a, b, h); if (s) { feet = s.p; air = Math.sin(s.q * Math.PI); wing = Math.min(1, air * 1.6); flap = t * 2 * Math.PI * FT.flapHz; } }
  chips = win(t, FT.chips[0], FT.chips[1], 0.1, 0.1);
  return { head, tilt, twig, grub, chips, hook, feet, wing, flap, air, beak };
}

// ---------------------------------------------------------------- passes
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V);
  // light shafts through the canopy gap, slowly breathing (screen-door dither, behind the actors)
  for (const [wx, w, sl, ph] of [[2330, 26, 0.42, 0], [2410, 16, 0.38, 1.7], [2500, 22, 0.45, 3.1]]) {
    const k = 0.18 + 0.06 * Math.sin(t * 0.8 + ph);
    for (let wy = -520; wy < LAND + 40; wy += 1) { const y = R(V.Y(wy)); if (y < 0 || y >= c.h) continue; const cx = V.X(wx + (wy + 520) * sl), fall = 1 - (wy + 520) / 600; for (let x = R(cx - w); x <= R(cx + w); x++) { if (x < 0 || x >= c.w) continue; const e = 1 - Math.abs(x - cx) / w; if (e * k * fall * 1.6 > bayer(x, y) + 0.12) c.px(x, y, mix(c.get(x, y), "#F4F8C0", 0.35)); } }
  }
}

function nailedSign(c, x, y, text) {
  const s = 2, tw = c.measure(MAIN, text, { scale: s }), w = tw + 16, h = 24, bx = R(x - w / 2), by = R(y);
  c.rrect(bx, by, w, h, "#2E1A10", 2); c.rrect(bx + 1, by + 1, w - 2, h - 2, "#8A5834", 2); c.rect(bx + 2, by + 2, w - 4, 2, "#A87448"); c.rect(bx + 2, by + h / 2, w - 4, 1, "#6A4024");
  for (const nx of [bx + 4, bx + w - 5]) { c.px(nx, by + 5, "#C8C8D8"); c.px(nx, by + 6, "#4A4A60"); }
  c.text(MAIN, text, bx + 8, by + 5, "#2E1A10", { scale: s }); c.text(MAIN, text, bx + 8, by + 4, "#FDF0C8", { scale: s });
}

export function actors(c, V, t) {
  if (off(V)) return;
  nailedSign(c, R(V.X(2200)), R(V.Y(-150)), "LV 6");
  const st = crowState(t), S = (p) => [V.X(p[0]), V.Y(p[1])];
  // grub hiding in the hole until it is hooked
  // crow
  const hx = heroX(t), heroOn = t > HERO0;
  const lookX = heroOn && t > T.notice - 0.2 ? Math.max(-1, Math.min(1, (hx - st.feet[0]) / 140)) : 0;
  const lookAtTwig = win(t, EV.crows - 0.4, T.grab, 0.25, 0.2);
  const look = [lerp(0.6 * lookAtTwig, lookX, sm(t, T.notice - 0.2, T.notice + 0.15)), 0.5 * lookAtTwig - 0.2 * sm(t, T.notice, T.notice + 0.3) * (st.feet[1] < FEET[1] - 20 ? -1 : 1)];
  const notice = sm(t, FT.turn[0], FT.turn[1]), turn = lookX * 6 * notice;
  const glare = sm(t, FT.glare[0], FT.glare[1]);
  const [fx, fy] = S(st.feet);
  drawCrow(c, R(fx), R(fy), t, { head: [st.head[0] + turn, st.head[1]], tilt: st.tilt + lookX * 0.08 * notice, look, blink: blinkAt(t, 3.3, 0.4) * (1 - sm(t, T.dip - 0.5, T.dip - 0.3)), glare, wing: st.wing, flap: st.flap, air: st.air, beakOpen: st.chips > 0.5 && Math.sin(t * 44) > 0 });
  // twig + grub
  if (st.twig) {
    const b = S(st.twig.b), inHole = t > T.catch && t < T.held ? S(HOLE) : null;
    const end = drawTwig(c, b, st.twig.th, st.hook, inHole);
    if (st.grub > 0) drawGrub(c, end[0] + 2, end[1] - 1, t, st.grub);
  }
  // wood chips flying off while carving
  if (st.chips > 0) for (let i = 0; i < 6; i++) { const ph = ((t * 3.2 + rnd(i * 7)) % 1), e = S(TW_END0), dir = rnd(i * 3) < 0.5 ? -1 : 1, x = e[0] + dir * (6 + ph * (18 + rnd(i) * 16)), y = e[1] - 6 - ph * 22 + ph * ph * 40; fade(c, (1 - ph) * st.chips).rect(R(x), R(y), 2, 1, i % 2 ? "#E0BC88" : "#B8875A"); }
  // the hero walks in along the path and looks back at the crow
  if (heroOn) {
    const sx = V.X(hx), sy = V.Y(PATH_Y), back = win(t, FT.back[0], FT.back[1], 0.25, 0.4);
    if (sx > -80 && sx < 620) {
      const ph = (hx - HERO_IN) / STRIDE, X = R(sx), Y = R(sy);
      drawHero(c, X, Y, { pose: "walk", phase: ph, facing: 1, look: [lerp(0.6, -1, back), lerp(0, -0.4, back)], mouth: "smile", blink: blinkAt(t, 2.9, 0.3) });
      // nervous face dissolves in: worried brows + an "o" mouth over the smile (same geometry as hero.mjs, facing right)
      if (back > 0.01) {
        const bob = Math.abs(Math.cos(2 * Math.PI * ph)) * 2, fx = X + 3, fy = Y - 124 - bob, g = fade(c, back);
        for (const sd of [-1, 1]) { const bx = fx + sd * 10 + 4; g.line(R(bx - 5), R(fy - 4 + (sd < 0 ? 2 : 0)), R(bx + 5), R(fy - 4 + (sd > 0 ? 2 : 0)), "#4A2A1A"); }
        g.rect(fx + 4 - 4, R(fy + 14) - 1, 9, 4, RAMP.skin[5]); smile(c, fx + 4, fy + 14, 3, { open: 0.8, a: back });
      }
    }
  }
}

export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V);
  // a few leaves drifting down (alive), world-anchored
  for (let i = 0; i < 4; i++) { const ph = ((t * 0.09 + rnd(i * 5 + 1)) % 1), wx = RX0 + 60 + rnd(i * 9) * 420 + Math.sin(t * 1.3 + i) * 16, wy = -600 + ph * 620, x = R(V.X(wx)), y = R(V.Y(wy)), a = Math.min(1, ph * 6, (1 - ph) * 6), g = fade(c, a); const flip = Math.sin(t * 3 + i) > 0; g.rect(x, y, 3, 2, i % 2 ? "#E0A040" : "#88B848"); g.px(x + (flip ? 3 : -1), y + 1, i % 2 ? "#B87020" : "#5A8A30"); }
}

export function hud(c, V, t) {
  if (off(V)) return;
  const ox = R(V.X(HEAD[0])) - 270, oy = R(V.Y(HEAD[1])) - 378, st = crowState(t);
  // +TOOLS on "hooks"
  const k = (t - FT.tools) / FT.pickup; if (k > 0 && k < 1) pickup(c, 270 + ox, 300 + oy, "+TOOLS", k);
  // "!" when it notices the hero
  const na = win(t, T.notice, FT.bangOut, 0.12, 0.3);
  if (na > 0) {
    const pop = 1 - ease(clamp01((t - T.notice) / FT.bangPop)), x = R(V.X(st.feet[0] + st.head[0]) + 44), y = R(V.Y(st.feet[1] - 152 + st.head[1]) - 86 + pop * 8), g = fade(c, na);
    g.rrect(x - 16, y - 4, 32, 44, "#2A1A3A", 3); g.rrect(x - 15, y - 3, 30, 42, "#FDFEED", 3); g.poly([[x - 7, y + 38], [x + 3, y + 38], [x - 13, y + 50]], "#2A1A3A"); g.poly([[x - 6, y + 37], [x + 2, y + 37], [x - 10, y + 46]], "#FDFEED");
    g.text(MAIN, "!", x - 3, y + 4, "#7A1028", { scale: 4 }); g.text(MAIN, "!", x - 4, y + 3, "#E03056", { scale: 4 });
  }
  // REMEMBERS / FOR YEARS
  const ta = win(t, FT.tag[0], FT.tag[1], 0.25, 0.4);
  if (ta > 0) {
    const o2 = { scale: 3 }, l1 = "REMEMBERS", l2 = "FOR YEARS", w = Math.max(c.measure(MAIN, l1, o2), c.measure(MAIN, l2, o2)) + 58, h = 72, x = 270 + ox - R(w / 2), y = 136 + oy + R((1 - ta) * 4), g = fade(c, ta);
    panel(c, x, y, w, h, ta, C.Y);
    // tiny face icon (the hero's hat and eyes) inside the tag
    const fx = x + 20, fy = y + 34; g.rect(fx - 9, fy - 12, 18, 9, "#6E4FB0"); g.rect(fx - 3, fy - 16, 6, 5, "#8D59DA"); g.rect(fx - 9, fy - 4, 18, 2, "#B08AE8"); g.rect(fx - 8, fy - 2, 16, 11, "#E6AD8A"); g.px(fx - 4, fy + 2, "#33458A"); g.px(fx + 3, fy + 2, "#33458A"); g.rect(fx - 1, fy + 6, 3, 1, "#83443C"); g.rect(fx - 10, fy + 9, 20, 3, "#7E98DA");
    g.text(MAIN, l1, x + 43, y + 11, C.O, o2); g.text(MAIN, l1, x + 42, y + 10, C.Y, o2);
    const g3 = fade(c, Math.min(ta, sm(t, FT.line2[0], FT.line2[1]))); g3.text(MAIN, l2, x + 43, y + 42, C.O, o2); g3.text(MAIN, l2, x + 42, y + 41, C.IV, o2);
  }
}
// geometry/timing shared with levels/meadow-motions.mjs (sound design)
export { T, HERO0, HERO_V, HERO_IN, HERO_STOP, HERO_DEC, HERO_T1, STRIDE, heroX, crowState, FEET, HEAD, HOLE, BRANCH };
