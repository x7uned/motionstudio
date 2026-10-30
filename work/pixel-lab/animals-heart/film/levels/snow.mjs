// LV2 · groundhog — a snowy winter coast at dawn (RANGE BIOME.snow = 540..1080). The deep ocean column meets an icy
// rocky shore at x 540 (ice shelf at the waterline, a snow-capped granite outcrop, an underwater rock face with kelp,
// a starfish and urchins for the rise from the whale); a snowy meadow with pines and far pink-lit mountains; the snow
// thins into sand at x 1080 where the warm lagoon begins. The ground is a cutaway: snow, frozen topsoil, soil with
// roots, clay, granite, and the groundhog's burrow: a tunnel from a snowy mound down to a cosy round chamber with dry
// grass bedding (world y ≈ 80…220).
// A chubby groundhog stands on the snow facing the camera, its heart icon pulsing with pulse("groundhog", t).
// "eighty" → +80 BPM · "winter" → snow starts falling, it looks up and yawns · "hibernates" → it waddles to its mound,
// crouches into the hole and rolls down the tunnel while the camera tilts down (CAM keys), curls up asleep (eyes shut,
// Z's, frost creeping over the walls and its fur, a thermometer falling to blue) · "drops … five" → the heart icon beats
// slower and slower (BEATS), +5 BPM, HIBERNATING · "fat" → a golden fat glow inside it, FAT LASTS TILL SPRING ·
// "spring" → a snowdrop pushes up through the snow above the burrow. Pure functions of t.
import { BIOME, LAND, EV, LV, END, WORLD_W, pulse } from "../timeline.mjs";
import { sign, pickup, tag, blob, ell, tube, bez, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, C, MAIN } from "../cute.mjs";
import { worldLayer, profile, seaStripExact, underTint, heartIcon, clipped, gaze, R } from "./snow-kit.mjs";
import { drawStand, drawSleep } from "./snow-groundhog.mjs";

export const RANGE = BIOME.snow;
const [X0, X1] = RANGE;
const GX = 810;                                     // where the groundhog stands
const SHORE = 546;                                  // rock face at the waterline
const CH = { x: 796, y: 146, rx: 124, ry: 76, floor: 210 };   // the sleeping chamber
const BALL = { x: 806, y: 210 };                    // bottom centre of the sleeping ball
const TUN = bez([956, -50], [950, 34], [884, 118], 24);      // tunnel centreline (mound → chamber)
const TUN_R = 29;

// ---------------------------------------------------------------- terrain shape
const gProf = profile([[X0, -29], [556, -31], [580, -40], [612, -47], [642, -43], [668, -28], [700, -20], [918, -20], [944, -27], [972, -32], [1000, -29], [1030, -21], [1050, -20], [X1 + 60, -20]]);
const GT = new Float32Array(X1 + 61 - 500);
for (let x = 500; x <= X1 + 60; x++) GT[x - 500] = x < X0 ? 1e9 : gProf(x);
/** Snow top (world y) at x; +1e9 over the water. */
export const G = (x) => { const i = Math.round(x) - 500; return i < 0 ? 1e9 : i >= GT.length ? LAND : GT[i]; };
const snowT = (x) => (x < 690 ? 9 : 15) + R(2 * Math.sin(x * 0.07)) - R(14 * sm(x, 1010, 1074));   // thins out toward the beach
const rockTop = profile([[X0, -60], [626, -50], [660, 30], [700, 190], [760, 280], [880, 300], [X1, 330]]);
/** Underwater rock face (world x where rock begins) at depth y ≥ 0. */
const EDGE = (() => { const e = new Float32Array(1600); for (let y = 0; y < 1600; y++) { const ledge = (y % 150) < 14 ? 8 * Math.sin(Math.PI * (y % 150) / 14) : 0; e[y] = X0 + (SHORE + 4 - X0 + 6 * Math.sin(y / 41) + 4 * Math.sin(y / 13 + 1) + (rnd(Math.floor(y / 4) * 7) - 0.5) * 2 - ledge) * sm(y, 400, 470); } return e; })();
const edgeAt = (y) => (y < 0 ? X0 : EDGE[Math.min(1599, Math.max(0, Math.floor(y)))]);


// burrow interior (tunnel ∪ chamber), world coordinates
function distSeg(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, k = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * k, py - ay - dy * k); }
function inTunnel(x, y) { if (y < -60 || y > 160 || x < 840 || x > 1000) return false; for (let i = 0; i < TUN.length - 1; i++) if (distSeg(x, y, ...TUN[i], ...TUN[i + 1]) <= TUN_R) return true; return false; }
const inChamber = (x, y) => y <= CH.floor + 3 && ((x - CH.x) / CH.rx) ** 2 + ((y - CH.y) / CH.ry) ** 2 <= 1;
const inBurrow = (x, y) => inChamber(x, y) || (y > G(x) - 2 && inTunnel(x, y));

// ---------------------------------------------------------------- palettes
const SNOW = { lip: "#FFF8F2", top: "#FBEFF0", body: "#ECE6F6", mid: "#DCD6F0", shade: "#C2BEE6", deep: "#A6A4D6", out: "#6A68A8" };
const TOPS = ["#33242A", "#2A1E24"], SOIL = ["#4A3634", "#42302E", "#56403A"], CLAY = ["#5A4034", "#50392E", "#64483A"], SAND = ["#E2CC9C", "#D4BA86", "#C6A874"];
const ROCK = ["#3E4558", "#454C60", "#4B5266", "#41475A", "#50586C", "#3A4052"];
const PINE = ["#152C36", "#1C3A44", "#24505A", "#2E6468", "#3C7A78"];

// strata colour at world (x, y) below the snow (cutaway), before any underwater tint
const BANDS = (() => { const b = []; let y = 0, i = 0; while (y < 1700) { const h = 16 + Math.floor(rnd(i * 13 + 5) * 34); b.push({ y0: y, y1: y + h, col: ROCK[Math.floor(rnd(i * 7 + 3) * ROCK.length)], tex: Math.floor(rnd(i * 11 + 1) * 3), seed: i }); y += h; i++; } return b; })();
const bandAt = (yRel) => { for (const b of BANDS) if (yRel < b.y1) return b; return BANDS[BANDS.length - 1]; };
function ground(x, y) {
  const g = G(x), s = snowT(x), d = y - g;                          // depth below the snow top
  if (d < s) {                                                     // snow layer, lit from the dawn sky
    if (d <= 0) return SNOW.lip; if (d === 1) return SNOW.top;
    const v = d / Math.max(1, s); let col = v < 0.35 ? SNOW.body : v < 0.7 ? ((v - 0.35) / 0.35 > bayer(x, y) ? SNOW.mid : SNOW.body) : v < 0.92 ? SNOW.mid : SNOW.shade;
    if (rnd(x * 31 + y * 17) < 0.03) col = "#FFFFFF"; else if (rnd(x * 7 + y * 41) < 0.03) col = SNOW.shade;
    return col;
  }
  if (d === s) return SNOW.out;
  const rt = rockTop(x) + (rnd(Math.floor(x / 5) * 5) - 0.5) * 8;
  if (y >= rt) return rock(x, y);                                                // granite: stacked rounded blocks
  const ds = d - s, sand = sm(x, 1046, 1080) * (1 - sm(ds, 6, 26));
  let col;
  if (ds < 22) { col = TOPS[(rnd(x * 13 + y * 7) < 0.25) | 0]; if (rnd(x * 17 + y * 3) < 0.025) col = "#8A98B8"; }   // frozen topsoil with frost
  else if (y < 150) { col = SOIL[rnd(x * 5 + y * 29) < 0.18 ? 1 : rnd(x * 3 + y * 11) < 0.1 ? 2 : 0]; if ((y + R(Math.sin(x * 0.05) * 3)) % 23 === 0) col = SOIL[1]; }
  else { col = CLAY[rnd(x * 5 + y * 29) < 0.18 ? 1 : rnd(x * 3 + y * 11) < 0.1 ? 2 : 0]; if ((y + R(Math.sin(x * 0.04) * 4)) % 19 === 0) col = CLAY[1]; }
  if (ds === 22 || (y >= 149 && y < 150 && ds > 22)) col = mix(col, "#1E120A", 0.25);
  if (sand > 0 && sand > bayer(x, y) * 0.95) col = SAND[ds < 3 ? 0 : rnd(x * 7 + y * 3) < 0.2 ? 2 : 1];
  if (rnd(x * 97 + y * 31) < 0.006) col = "#6E6A78";                                           // pebbles
  if (y > rt - 3) col = mix(col, "#1E1610", 0.35);
  return col;
}
/** Granite as cobbled blocks (jittered grid cells): dark cracks, top-left lit faces, a few quartz flecks. */
function rock(x, y) {
  const S = 38, cx = Math.floor(x / S), cy = Math.floor(y / (S * 0.8));
  let d1 = 1e9, d2 = 1e9, id = 0, px0 = 0, py0 = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const gx = cx + i, gy = cy + j, k = gx * 7919 + gy * 104729, px = (gx + 0.2 + rnd(k) * 0.6) * S, py = (gy + 0.2 + rnd(k + 1) * 0.6) * S * 0.8;
    const d = Math.hypot((x - px) * 0.9, y - py);
    if (d < d1) { d2 = d1; d1 = d; id = k; px0 = px; py0 = py; } else if (d < d2) d2 = d;
  }
  if (d2 - d1 < 1.4) return "#1E2230";
  const base = ROCK[Math.floor(rnd(id + 3) * ROCK.length)], u = (x - px0) / S, v = (y - py0) / (S * 0.8);
  let col = base;
  if (d2 - d1 < 3.2 && (u > 0.05 || v > 0.05)) col = mix(base, "#1E2230", 0.3);           // shadowed lower-right rim
  else if (d2 - d1 < 3.2) col = mix(base, "#C8D4EC", 0.18);                                // lit upper-left rim
  else if (u + v < -0.45) col = mix(base, "#C8D4EC", 0.07);
  if (rnd(x * 131 + y * 71) < 0.006) col = mix(base, "#C8D0E0", 0.35);
  return col;
}

// ---------------------------------------------------------------- static layers (drawn once)
function pine(g, x, base, h, w, seed) {
  const tiers = Math.max(4, Math.floor(h / 34));
  g.rect(R(x - 3), R(base - h * 0.22), 6, R(h * 0.22) + 4, "#3A2620"); g.rect(R(x - 3), R(base - h * 0.22), 2, R(h * 0.22) + 4, "#5A3C2E");
  for (let k = 0; k < tiers; k++) {
    const ty = base - h * 0.16 - (k / tiers) * h * 0.84, th = (h * 0.84) / tiers * 1.55, tw = w * (1 - k / tiers * 0.82);
    for (let yy = R(ty - th); yy <= R(ty); yy++) {
      const v = (yy - (ty - th)) / th, half = tw * (0.18 + 0.82 * v) + (rnd(yy * 7 + seed) - 0.5) * 3;
      for (let xx = R(x - half); xx <= R(x + half); xx++) {
        const u = (xx - x) / Math.max(1, half);
        let col = u < -0.35 ? PINE[3] : u < 0.25 ? PINE[2] : PINE[1];
        if (v > 0.85) col = PINE[0];
        if (Math.abs(u) > 0.92 || yy === R(ty)) col = PINE[0];
        // snow resting on each tier: a lumpy white band on the upper part of the tier, heavier on the lit side
        const snowLine = 0.32 + 0.1 * Math.sin(xx * 0.6 + k) + (u < 0 ? -0.05 : 0.06);
        if (v < snowLine && Math.abs(u) < 0.98) col = v < snowLine - 0.12 ? SNOW.top : u < 0.1 ? SNOW.body : SNOW.mid;
        g.px(xx, yy, col);
      }
    }
  }
  g.px(R(x), R(base - h - 2), SNOW.lip); g.px(R(x), R(base - h - 1), SNOW.top);
}
// far mountains: a row of peaks, lit (pink) on the faces toward the sun behind the groundhog, lavender in shadow
const PEAKS = [[562, 120, 1.1], [612, 205, 1.05], [676, 250, 0.95], [742, 168, 1.0], [880, 186, 1.05], [944, 262, 0.92], [1010, 214, 1.0], [1072, 236, 0.95], [1118, 170, 1.0]];
function peakAt(x) { let best = -1e9, pk = null; for (const p of PEAKS) { const h = p[1] - Math.abs(x - p[0]) * p[2] - 8 * Math.sin(x * 0.11 + p[0]) * (Math.abs(x - p[0]) > 14 ? 0.35 : 0); if (h > best) { best = h; pk = p; } } return [best * sm(x, 546, 600), pk]; }
function farRidge(x) { return -24 - Math.max(0, peakAt(x)[0]); }
function nearRidge(x) { return -20 - (52 + 18 * Math.sin(x * 0.021 + 1.3) + 8 * Math.sin(x * 0.07)) * sm(x, 560, 700); }
const BACK = worldLayer(X0, -420, X1 - X0 + 40, 400, (g) => {
  for (let x = X0; x < X1 + 40; x++) {
    // far mountains: pink-lit on the faces toward the sun, lavender in shadow, snowy crests
    const [h, pk] = peakAt(x), top = R(-24 - Math.max(0, h)), lit = pk ? (x > pk[0]) === (pk[0] < 810) : false;
    for (let y = top; y < -20; y++) {
      const v = (y - top) / Math.max(1, -20 - top), cap = pk ? y < -24 - pk[1] * 0.62 + 6 * Math.sin(x * 0.3) : false;
      let col = lit ? (v < 0.4 ? "#F2CCD8" : v < 0.55 ? ((v - 0.4) / 0.15 > bayer(x, y) ? "#D6BCD8" : "#F2CCD8") : "#D6BCD8") : v < 0.5 ? "#B6A8D8" : "#A698CC";
      if (cap) col = lit ? "#FFF2F2" : "#D8D0F0";
      if (y < top + 1) col = lit ? "#FFFFFF" : "#E8E2F8";
      g.px(x, y, col);
    }
  }
  for (let x = X0; x < X1 + 40; x++) {
    // near snowy hills with tiny pines
    const top = R(nearRidge(x));
    for (let y = top; y < -18; y++) { const v = (y - top) / Math.max(1, -18 - top); g.px(x, y, y === top ? "#FFFFFF" : v < 0.3 ? "#F4EEF8" : v < 0.65 ? (v - 0.3 > bayer(x, y) * 0.35 ? "#E2DCF0" : "#F4EEF8") : "#D4CEEA"); }
  }
  for (let k = 0; k < 26; k++) { const x = 580 + rnd(k * 3 + 1) * 500; if (Math.abs(x - 810) < 80) continue; const b = nearRidge(x) + 4 + rnd(k) * 10, h = 14 + rnd(k * 5) * 16; for (let j = 0; j < h; j++) { const half = R((j / h) * (3 + h * 0.18)); g.rect(R(x) - half, R(b - h + j), half * 2 + 1, 1, j < 2 ? "#E8E4F4" : j % 4 === 0 ? "#3A5A6A" : "#2A4656"); } }
  // big pines on the cut plane, left and right of the sun (their roots show in the cutaway)
  pine(g, 652, -40, 232, 54, 1); pine(g, 600, -44, 168, 40, 2); pine(g, 1032, -24, 252, 58, 3); pine(g, 1080, -20, 186, 44, 4); pine(g, 708, -20, 120, 30, 5);
});
// granite outcrop at the shore, the ground cutaway, the burrow, the underwater rock face
const YG0 = -70, YG1 = 1560;
const GROUND = worldLayer(516, YG0, X1 - 516, YG1 - YG0, (g, L) => {
  for (let x = X0; x < X1; x++) {
    const top = Math.max(YG0, Math.ceil(G(x)));
    for (let y = top; y < YG1; y++) {
      if (y >= 0 && x < edgeAt(y)) continue;                         // water left of the underwater face
      let col = ground(x, y);
      // the rock face itself: dark outline, lit rim, shadowed lower edge of each ledge
      if (y >= 420) { const e = edgeAt(y); if (x < e + 1) col = "#1A2234"; else if (x < e + 2) col = mix(col, "#E8F4FF", 0.35); else if (x < edgeAt(y + 1)) col = mix(col, "#1A2234", 0.4); }
      if (inBurrow(x, y)) continue;
      g.px(x, y, col);
    }
  }
  // burrow interior: warm dark earth, darker ceiling, lit rim where the cut meets the soil, dry grass bedding
  for (let y = -60; y < 230; y++) for (let x = 668; x < 1000; x++) {
    if (!inBurrow(x, y)) continue;
    const edge = !inBurrow(x - 1, y) || !inBurrow(x + 1, y) || !inBurrow(x, y - 1) || !inBurrow(x, y + 1);
    const edge2 = !inBurrow(x - 2, y) || !inBurrow(x + 2, y) || !inBurrow(x, y - 2) || !inBurrow(x, y + 2);
    if (y < G(x) + 1) continue;
    const up = !inBurrow(x, y - 3) || !inBurrow(x, y - 2);
    const v = clamp01((y - 70) / 140), sh = 0.5 + 0.5 * bayer(x, y), glow = clamp01(1 - Math.hypot((x - CH.x) / 130, (y - CH.floor) / 70));
    let col = v < 0.3 ? "#241819" : v < 0.55 ? (v - 0.3 > sh * 0.25 ? "#2E1F1F" : "#241819") : v < 0.8 ? "#2E1F1F" : "#382622";
    if (glow > 0.1 && glow * 1.1 > bayer(x, y)) col = mix(col, "#7A5434", 0.32 + 0.2 * glow);
    if (rnd(x * 3 + y * 5) < 0.04) col = mix(col, "#4A3630", 0.6);
    if (edge2 && !edge) col = up ? "#140E10" : "#6A4E44";
    if (edge) col = up ? "#0C080A" : "#8A6A56";
    g.px(x, y, col);
  }
  // dry grass bedding on the chamber floor
  for (let i = 0; i < 700; i++) {
    const x = CH.x - 112 + rnd(i * 3 + 1) * 224, y0 = CH.floor + 2 - rnd(i * 5 + 2) * 20 * Math.sqrt(Math.max(0, 1 - ((x - CH.x) / 116) ** 2)), len = 4 + rnd(i * 7) * 9, ang = (rnd(i * 11) - 0.5) * 1.2;
    const col = ["#F2D27A", "#E0B85C", "#C8963E", "#A87A2C", "#F8E4A0"][i % 5];
    for (let k = 0; k < len; k++) { const px = R(x + Math.cos(ang) * k), py = R(y0 + Math.sin(ang) * k * 0.35); if (inChamber(px, py)) g.px(px, py, col); }
  }
  // roots hanging from the chamber ceiling and under the pines
  const root = (pts, col) => { for (let i = 0; i < pts.length - 1; i++) g.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), col); };
  for (const [x, len] of [[730, 14], [758, 18], [790, 9], [834, 14], [868, 8]]) { const y0 = CH.y - CH.ry * Math.sqrt(Math.max(0, 1 - ((x - CH.x) / CH.rx) ** 2)) + 1; root(bez([x, y0], [x + 3, y0 + len * 0.5], [x - 2, y0 + len], 6), "#C8A07A"); g.px(x - 2, R(y0 + len), "#E8C8A0"); }
  for (const [x, sc] of [[652, 1], [600, 0.7], [1032, 1.1], [708, 0.7]]) {
    const top = G(x) + snowT(x) + 1;
    for (let k = 0; k < 4; k++) {
      const dir = k % 2 ? 1 : -1, Lr = (26 + rnd(k * 7 + x) * 26) * sc, spread = (k < 2 ? 0.5 : 1) * Lr;
      const pts = bez([x + dir * 2, top], [x + dir * spread * 0.7, top + Lr * 0.25], [x + dir * spread, top + Lr * 0.8], 12);
      for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; if (ay < rockTop(ax) - 2 && !inBurrow(ax, ay) && !inBurrow(bx, by) && ay >= top) { g.line(R(ax), R(ay), R(bx), R(by), "#20161A"); if (i < 6) g.line(R(ax) + 1, R(ay), R(bx) + 1, R(by), "#5A4038"); } }
    }
  }
  // a sleeping earthworm and a pinecone stash in the soil, quartz veins in the granite
  for (let k = 0; k < 18; k++) { const a = k * 0.5, px = R(626 + Math.cos(a) * (6 - k * 0.2)), py = R(112 + Math.sin(a) * (4 - k * 0.15)); g.rect(px, py, 2, 2, k % 3 ? "#E88AA0" : "#C86A84"); }
  for (const [px, py] of [[1042, 66], [1052, 72]]) { for (let j = 0; j < 9; j++) for (let i = -3; i <= 3; i++) if (Math.abs(i) <= 3 - Math.abs(j - 4) * 0.5) g.px(px + i, py + j, (i + j) % 3 === 0 ? "#3A2414" : "#8A5A30"); }
  // snow-capped coast: heavier snow on the outcrop top, icicles off its lip, an ice shelf at the waterline
  for (let x = X0; x < 700; x++) { const gy = R(G(x)); for (let j = -3; j < 0; j++) if (rnd(x * 3 + j) < 0.85 - j * -0.2 || j === -1) g.px(x, gy + j, j === -3 ? SNOW.lip : SNOW.top); }
  // underwater life on the cold rock face: a starfish, sea urchins, barnacle crust
  for (const [sx, sy] of [[R(edgeAt(640)) + 8, 640]]) for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; for (let r = 0; r < 9; r++) { const w = r < 3 ? 2 : r < 7 ? 1 : 0; for (let q = -w; q <= w; q++) g.px(R(sx + Math.cos(a) * r - Math.sin(a) * q * 0.6), R(sy + Math.sin(a) * r + Math.cos(a) * q * 0.6), r > 6 ? "#F8A070" : "#E8604A"); } g.px(sx, sy, "#FFD0A0"); }
  for (const [ux, uy] of [[R(edgeAt(520)) + 7, 520], [R(edgeAt(534)) + 14, 534], [R(edgeAt(860)) + 6, 860]]) { for (let k = 0; k < 12; k++) { const a = k * 0.5236; g.line(ux, uy, R(ux + Math.cos(a) * 7), R(uy + Math.sin(a) * 6), "#6A2A7A"); } for (let j = -4; j <= 4; j++) for (let i = -5; i <= 5; i++) if ((i / 5) ** 2 + (j / 4) ** 2 <= 1) g.px(ux + i, uy + j, j < -1 ? "#A45AB4" : "#7A3A8A"); }
  // the depth tint: rock below the surface fades into the cold blue water
  for (let y = 420; y < YG1; y++) { const T = underTint(y); if (!T) continue; const [tc, k0] = T, e = edgeAt(y); for (let x = 516; x < Math.min(X1, e + 44); x++) { const lx = x - 516, ly = y - YG0; if (!L.has(lx, ly)) continue; const k = k0 * (x < e + 6 ? 1 : 1 - (x - e - 6) / 38), i = (ly * L.w + lx) * 3, d = L.c.d; d[i] = R(d[i] + (tc[0] - d[i]) * k); d[i + 1] = R(d[i + 1] + (tc[1] - d[i + 1]) * k); d[i + 2] = R(d[i + 2] + (tc[2] - d[i + 2]) * k); } }
});

// ---------------------------------------------------------------- the groundhog's motion through the scene
const T_YAWN = EV.winter + 0.12, T_WALK = EV.hibernates + 0.12, T_HOLE = T_WALK + 0.85, T_DOWN = T_HOLE + 1.05, T_SLEEP = T_DOWN + 0.55;
const STEMS = [[738, 0, 24, 1], [748, 0.18, 18, -1], [730, 0.32, 14, 1]];     // snowdrops: x, delay, height, lean
/** Every timed motion of this level as [t0, t1] (s); the drawing code below reads these, levels/snow-motions.mjs too. */
export const SNOW_T = {
  snowfall: [EV.winter - 0.1, EV.winter + 1.4], yawn: [T_YAWN, T_YAWN + 0.42], walk: [T_WALK, T_HOLE], stepCycles: 3.5,
  walkIn: [T_WALK, T_WALK + 0.15], walkOut: [T_HOLE - 0.25, T_HOLE - 0.08], hop: [T_HOLE - 0.05, T_HOLE + 0.25],
  sink: [T_HOLE + 0.08, T_HOLE + 0.4], standOut: [T_HOLE + 0.14, T_HOLE + 0.36], ballIn: [T_HOLE + 0.3, T_HOLE + 0.46],
  puff: [T_HOLE + 0.06, T_HOLE + 0.91], roll: [T_HOLE + 0.3, T_DOWN], settle: [T_DOWN, T_DOWN + 0.45], eyesShut: [T_DOWN + 0.15, T_SLEEP + 0.25],
  zzz: { t0: T_SLEEP - 0.2, every: 1.15, life: 2.3, n: 8 },
  frostWalls: [EV.months - 0.6, EV.five + 0.4], frostFur: [EV.months - 0.4, EV.five + 0.6],
  thermoIn: [EV.hibernates + 0.8, EV.hibernates + 1.4], thermoFall: [EV.hibernates + 1.6, EV.five + 0.2],
  fat: [EV.fat - 0.1, EV.fat + 0.5], drops: STEMS.map(([, dt]) => [EV.spring - 0.1 + dt, EV.spring + 0.55 + dt]),
  tagHib: [EV.months - 0.35, EV.months + 0.05], tagFat: [EV.fat - 0.05, EV.fat + 0.3], tagsOut: [LV.groundhog[1] - 0.25, LV.groundhog[1] + 0.2],
};
const ST = SNOW_T;
/** How much the groundhog is waddling at t (0..1): the step sounds follow its feet. */
export const walkAmount = (t) => sm(t, ...ST.walkIn) * (1 - sm(t, ...ST.walkOut));
const HOLE_X = 948;
// path of the ball's bottom centre from the tunnel's lower end into the chamber
const ROLL = [[930, 112], [904, 156], [862, 194], [BALL.x, BALL.y]];
function along(pts, f) { let L = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; } let s = clamp01(f) * L, i = 0; while (i < seg.length - 1 && s > seg[i]) s -= seg[i++]; const k = seg[i] ? s / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k]; }
/** Pose of the groundhog at t: standing (waddle, crouch, sink into the hole) and/or the ball rolling into the chamber. */
function pose(t) {
  const walkK = clamp01((t - T_WALK) / (T_HOLE - T_WALK)), wx = lerp(GX, HOLE_X, ease(walkK));
  // a little hop, then a dive into the hole (hidden in a puff of snow), then the ball rolls out of the tunnel
  const hop = Math.sin(Math.PI * clamp01((t - ST.hop[0]) / (ST.hop[1] - ST.hop[0]))) * 16;
  const sinkK = clamp01((t - ST.sink[0]) / (ST.sink[1] - ST.sink[0])) ** 2, sq = sm(t, T_HOLE - 0.25, T_HOLE - 0.05) * (1 - sm(t, T_HOLE - 0.05, T_HOLE + 0.08)) * 0.7 + sm(t, T_HOLE + 0.08, T_HOLE + 0.3) * 0.6;
  const standA = 1 - sm(t, ...ST.standOut), ballA = sm(t, ...ST.ballIn);
  const rollK = clamp01((t - ST.roll[0]) / (ST.roll[1] - ST.roll[0])), b = along(ROLL, 1 - (1 - rollK) ** 2);
  const settle = t > ST.settle[0] ? Math.sin(Math.PI * clamp01((t - ST.settle[0]) / 0.3)) * (1 - clamp01((t - ST.settle[0]) / (ST.settle[1] - ST.settle[0]))) : 0;
  const walk = walkAmount(t);
  return { sx: wx + sinkK * 6, sy: G(wx) - hop + sinkK * 96, sq, walk, step: walkK * ST.stepCycles, standA, ballA, bx: b[0], by: b[1], settle, roll: rollK };
}
/** Puff of snow at the burrow entrance as the groundhog dives in. */
function puff(c, V, t) {
  const u = (t - ST.puff[0]) / (ST.puff[1] - ST.puff[0]); if (u <= 0 || u >= 1) return;
  const ox = V.X(HOLE_X + 6), oy = V.Y(-34);
  const ca = (1 - u) * 0.9, rx = 18 + 40 * ease(Math.min(1, u * 1.6)), ry = 9 + 20 * ease(Math.min(1, u * 1.6));
  for (let y = R(oy - ry * 1.6); y <= R(oy + ry * 0.5); y++) for (let x = R(ox - rx); x <= R(ox + rx); x++) {
    const d = ((x - ox) / rx) ** 2 + ((y - oy + ry * 0.6) / ry) ** 2 + 0.25 * Math.sin(x * 0.7 + y * 0.5 + u * 6); if (d >= 1) continue;
    if (ca * (1.1 - d) > bayer(x, y)) c.px(x, y, d < 0.45 ? "#FFFFFF" : "#E2DEF4");
  }
  for (let i = 0; i < 40; i++) {
    const vx = (rnd(i * 3 + 1) - 0.5) * 150, vy = -60 - rnd(i * 5 + 2) * 110, tt = u * 0.85, x = R(ox + vx * tt), y = R(oy - 6 + vy * tt + 260 * tt * tt);
    if (rnd(i * 7) > 1 - u * 0.9 && u > 0.6) continue;
    c.px(x, y, "#FFFFFF"); if (i % 3 === 0) { c.px(x + 1, y, "#E8E8FF"); c.px(x, y + 1, "#C8C8F0"); }
  }
}

// ---------------------------------------------------------------- module interface
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function fill(c, V, t) {
  if (!onScreen(V)) return;
  // the sea in front of the shore rock (matches the ocean column's water)
  // (the ocean column is drawn with this same view here, wrapped or not)
  if (V.Y(400) < 960) seaStripExact(c, V, V, t, X0, SHORE + 30, () => X0, (wy) => (wy < 400 ? X0 : edgeAt(wy) + 1));
}
export function back(c, V, t) {
  if (!onScreen(V)) return;
  BACK.blit(c, V); GROUND.blit(c, V);
  // frost creeping over the chamber walls while it sleeps
  const fr = sm(t, ...ST.frostWalls);
  if (fr > 0) { const g = c; for (let i = 0; i < FROST.length; i++) { const [x, y, k] = FROST[i]; if (fr * 1.15 <= k) continue; const sx = V.X(x), sy = V.Y(y); if (sx < 1 || sx > 538 || sy < 1 || sy > 958) continue; g.px(sx, sy, "#EAF6FF"); if (k < fr * 0.6) { g.px(sx + 1, sy, "#B8DCF4"); g.px(sx - 1, sy, "#B8DCF4"); g.px(sx, sy + 1, "#B8DCF4"); } } }
  // thermometer leaning on the chamber wall: the body temperature falls from warm red to icy blue
  thermometer(c, V, t);
}
const FROST = (() => { const out = []; for (let y = 68; y < 214; y++) for (let x = 668; x < 924; x++) if (inChamber(x, y) && (!inChamber(x, y - 2) || !inChamber(x - 2, y) || !inChamber(x + 2, y)) && !inTunnel(x, y) && y < 196 && rnd(x * 17 + y * 3) < 0.4) out.push([x, y, rnd(x * 5 + y * 7)]); return out; })();
function thermometer(c, V, t) {
  const x = V.X(696), y = V.Y(150); if (x < -20 || x > 560 || y < -60 || y > 1000) return;
  const cold = sm(t, ...ST.thermoFall), a = sm(t, ...ST.thermoIn);
  if (a <= 0) return; const g = fade(c, a);
  g.rrect(x - 4, y - 34, 9, 40, "#1A1430", 2); g.rect(x - 3, y - 33, 7, 38, "#E8F0FA"); g.rect(x - 2, y - 32, 2, 34, "#FFFFFF");
  const lvl = R(lerp(28, 4, cold)), merc = mix("#E8384A", "#4AA8F0", cold);
  g.rect(x, y + 2 - lvl, 2, lvl + 2, merc);
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = i * i + j * j; if (d <= 64) g.px(x + i + 1, y + 10 + j, d > 49 ? "#1A1430" : d < 10 ? mix(merc, "#FFFFFF", 0.4) : merc); }
  for (const k of [-24, -16, -8]) g.rect(x + 5, y + k, 3, 1, "#1A1430");
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  // level sign with a snow cap, beside the groundhog
  const sx = R(V.X(690)), sy = R(V.Y(G(690))) + 2;
  if (sx > -60 && sx < 600) { sign(c, sx, sy, "LV 2", "wood", 1, t); const g = c, bw = c.measure(MAIN, "LV 2", { scale: 2 }) + 16, bx = R(sx - bw / 2), by = sy - 2 - 30 - 24; for (let i = -1; i <= bw; i++) { const h = 2 + R(1.5 * Math.sin(i * 0.5)) + (i > 2 && i < bw - 3 ? 1 : 0); for (let j = 0; j < h; j++) g.px(bx + i, by - j + 1, j === h - 1 ? SNOW.lip : SNOW.body); } c.rect(sx - 6, sy - 3, 13, 3, SNOW.body); c.rect(sx - 5, sy - 4, 11, 1, SNOW.lip); }
  kelp(c, V, t);
  groundhog(c, V, t);
}
function kelp(c, V, t) {
  for (const [y, h, ph] of [[520, 80, 1.7], [700, 64, 3.1], [930, 110, 4.2], [1180, 86, 0.9], [1420, 70, 2.4]]) {
    const x = edgeAt(y) + 3, sx = V.X(x), sy = V.Y(y); if (sx < -30 || sx > 570 || sy < -10 || sy - h > 970) continue;
    const T = underTint(y), col = mix("#4A7A3A", T[0], T[1]), col2 = mix("#6A9A44", T[0], T[1]);
    // kelp leans away from the face but never crosses into the ocean column (x 540 belongs to the whale's opening frame)
    const minX = R(V.X(X0 + 1)), put = (X, Y, cc) => { if (X >= minX) c.px(X, Y, cc); };
    for (let j = 0; j < h; j++) { const sway = (0.5 + 0.5 * Math.sin(t * 1.3 + ph + j * 0.06)) * (j / h) * 7; const X = R(sx + sway + j * 0.04), Y = sy - j; put(X, Y, col); put(X + 1, Y, col2); if (j % 9 === 4) { put(X - 1, Y - 1, col2); put(X - 2, Y - 2, col2); put(X + 2, Y - 1, col); put(X + 3, Y - 2, col); } }
  }
}
// the clip mask for the groundhog: only the air above the snow and the burrow interior show it
function openAt(V) { return (x, y) => { const wx = x - 270 + V.cx, wy = y - 480 + V.cy, g = G(wx); return wy < g + 3 || inBurrow(wx, wy); }; }
function groundhog(c, V, t) {
  const P = pose(t), cc = clipped(c, openAt(V));
  const look = gaze(t, [[0, [0, 0.1]], [EV.groundhog - 0.5, [0.3, 0.2]], [EV.groundhog + 0.2, [0, 0.12]], [EV.eighty + 0.3, [-0.3, 0]], [EV.eighty + 1.0, [0, 0.12]], [EV.winter, [0.15, -0.9]], [T_WALK - 0.1, [0.9, 0.1]], [T_HOLE, [0, 0.3]]], 0.25);
  const yawn = Math.sin(Math.PI * clamp01((t - ST.yawn[0]) / (ST.yawn[1] - ST.yawn[0]))) * (t > ST.yawn[0] ? 1 : 0);
  const shiver = t > EV.winter && t < EV.winter + 0.5 ? Math.sin(t * 60) * (1 - (t - EV.winter) / 0.5) * 1.2 : 0;
  const breathe = Math.sin(t * 2.6) * 1.0;
  let hx, hy;
  if (P.standA > 0) {
    const x = V.X(P.sx) + shiver, y = V.Y(P.sy);
    drawStand(cc, x, y, { sq: P.sq, walk: P.walk, step: P.step, lean: P.walk * 0.6, look, blink: blinkAt(t, 3.3, 0.4), breathe, yawn, a: P.standA });
    hx = x + 70; hy = y - 300 * (1 - 0.42 * P.sq) + 2;
  }
  if (P.ballA > 0) {
    const x = V.X(P.bx), y = V.Y(P.by) + P.settle * 4;
    const fat = sm(t, ...ST.fat), frost = sm(t, ...ST.frostFur);
    drawSleep(cc, x, y, { eyes: sm(t, ...ST.eyesShut), breathe: Math.sin(t * 1.1) * 0.8, a: P.ballA, look: [-0.3, 0.4], frost, fat, fatPulse: 0.5 + 0.5 * Math.sin(t * 3) });
    zzz(c, x - 40, y - 100, t);
    const bhx = x + 58, bhy = y - 132; hx = hx === undefined ? bhx : lerp(hx, bhx, P.ballA); hy = hy === undefined ? bhy : lerp(hy, bhy, P.ballA);
  }
  heart(c, hx, hy, t, 1);
}
/** Heart icon that beats with the groundhog's BEATS; each beat sends out a soft ring so the slow beats read. */
function heart(c, x, y, t, a) {
  if (x === undefined || a <= 0) return;
  const p = pulse("groundhog", t), cold = sm(t, EV.hibernates + 1.5, EV.five + 0.2);
  // the ring of the latest beat (expands over 0.6 s)
  const r = 9 + 5 * p, col = mix(mix("#E83A5C", "#C85A9A", cold * 0.6), "#FF8AA6", p * 0.6);
  if (p > 0.05) { const rr = R(r + (1 - p) * 16), g = fade(c, p * 0.8 * a); g.ering(R(x), R(y), rr, rr, "#FFB4C4"); }
  heartIcon(c, R(x), R(y), r, col, a);
}
function zzz(c, x, y, t) {
  const { t0, every, life, n } = ST.zzz; if (t < t0) return;
  for (let k = 0; k < n; k++) {
    const s = t0 + k * every, u = (t - s) / life; if (u < 0 || u > 1) continue;
    const a = Math.min(sm(u, 0, 0.15), 1 - sm(u, 0.7, 1)), zx = R(x - 6 - u * 26 + Math.sin(u * 6 + k) * 4), zy = R(y - u * 44), sc = u < 0.4 ? 2 : 3;
    const g = fade(c, a); g.text(MAIN, "Z", zx + 1, zy + 1, "#2A1A3A", { scale: sc }); g.text(MAIN, "Z", zx, zy, "#E8F0FF", { scale: sc });
  }
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  puff(c, V, t);
  // snowdrops push up through the snow above the burrow on "spring" (three stems, each bell opening in turn)
  if (t > EV.spring - 0.2 && t < LV.turtle[0] + 3) for (const [i, [wx, , hh, lean]] of STEMS.entries()) {
    const k = sm(t, ...ST.drops[i]); if (k <= 0) continue;
    const x = R(V.X(wx)), y = R(V.Y(G(wx))) + 1, h = R(3 + hh * k); if (x < -10 || x > 550 || y < 0 || y > 980) continue;
    for (let j = 0; j < h; j++) { const bend = j > h - 6 ? R((j - h + 6) * 0.7 * lean) : 0; c.px(x + bend, y - j, j < 4 ? "#2E6A3A" : "#4E9E4A"); if (j > 3 && j < h - 6) c.px(x + 1, y - j, "#3E8A40"); }
    if (k > 0.25) for (const sd of [-1, 1]) { const ly = y - 3; for (let q = 0; q < 6; q++) c.px(x + sd * R(q * 0.5), ly - q, q < 3 ? "#3E8A40" : "#6ABA5A"); }
    const fk = sm(k, 0.55, 1); if (fk <= 0) continue;
    const g = fade(c, fk), fx = x + R(6 * lean * 0.7), fy = y - h + 3;
    g.px(fx, fy - 2, "#3E8A40"); g.rect(fx - 1, fy - 1, 3, 1, "#6ABA5A");
    g.rect(fx - 2, fy, 5, 5, "#FFFFFF"); g.rect(fx - 3, fy + 2, 7, 4, "#F4F4FF"); g.px(fx - 3, fy + 6, "#D8DCF4"); g.px(fx + 3, fy + 6, "#D8DCF4"); g.px(fx, fy + 6, "#D8DCF4"); g.px(fx - 1, fy + 1, "#FFFFFF"); g.px(fx, fy + 5, "#A8DA8A");
    g.px(fx + 2, fy + 1, "#E0E4F8"); g.px(fx + 2, fy + 3, "#E0E4F8");
    if (fk < 1) { const sp = fade(c, 1 - fk); sp.px(fx - 6, fy - 4, "#FFFFFF"); sp.px(fx + 6, fy - 2, "#FFFFFF"); sp.px(fx, fy - 8, "#FFFFFF"); }
  }
  snowfall(c, V, t);
}
/** Snow starts falling on "winter": world-fixed flakes, landing on the snow, thinning toward the lagoon. */
function snowfall(c, V, t) {
  const dens = sm(t, ...ST.snowfall); if (dens <= 0 || t > LV.turtle[0] + 3) return;
  const T = t - EV.winter + 30;
  for (let i = 0; i < 300; i++) {
    if (rnd(i * 5 + 3) > dens) continue;
    const sp = 22 + rnd(i * 7) * 30, x0 = X0 + rnd(i * 3 + 1) * (X1 - X0 + 40), span = 820;
    const wy = -800 + ((rnd(i * 11) * span + T * sp) % span), wx = x0 + Math.sin(T * (0.6 + rnd(i) * 0.8) + i) * 8;
    if (wy > G(wx) - 1) continue;
    const thin = 1 - sm(wx, X1 - 50, X1 + 20); if (rnd(i * 13 + 7) > thin) continue;
    const sx = R(V.X(wx)), sy = R(V.Y(wy)); if (sx < 1 || sx > 538 || sy < 1 || sy > 958) continue;
    const size = rnd(i * 17);
    if (size < 0.2) { c.px(sx, sy, "#FFFFFF"); c.px(sx - 1, sy, "#E4E4FA"); c.px(sx + 1, sy, "#E4E4FA"); c.px(sx, sy - 1, "#E4E4FA"); c.px(sx, sy + 1, "#E4E4FA"); }
    else if (size < 0.65) { c.px(sx, sy, "#FFFFFF"); c.px(sx + 1, sy, "#F0F0FF"); c.px(sx, sy + 1, "#F0F0FF"); c.px(sx + 1, sy + 1, "#C8C8F0"); }
    else c.px(sx, sy, "#FFFFFF");
  }
}

export function hud(c, V, t) {
  if (t < LV.groundhog[0] || t > LV.groundhog[1] + 0.6 || V.wrap) return;
  const gx = R(V.X(GX));
  pickup(c, gx, R(V.Y(-376)), "80 BPM", (t - EV.eighty) / 1.6, C.Y);
  pickup(c, R(V.X(BALL.x)) + 8, R(V.Y(BALL.y - 152)), "5 BPM", (t - EV.five) / 1.6, C.CY);
  const out = 1 - sm(t, ...ST.tagsOut);
  tag(c, ["HIBERNATING"], 270, 212, sm(t, ...ST.tagHib) * out, C.CY, 2);
  tag(c, ["FAT LASTS TILL SPRING"], 270, 252, sm(t, ...ST.tagFat) * out, C.Y, 2);
}
