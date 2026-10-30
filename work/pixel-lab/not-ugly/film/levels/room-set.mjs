// «You're not ugly» — the bedroom set (Builder ROOM). One side-view bedroom at night, painted ONCE into a cached world
// buffer (albedo + a per-pixel kind), lit in one pass (cool night ambient, the bedside lamp's warm pool with up/down
// cones, a cool moon glow by the window, the fairy-light glow at the top), then copied row by row into every frame
// (the camera only drifts by whole pixels). Live details (fairy-bulb twinkle, stars, city windows, cocoa steam) are
// drawn per frame on top, all smooth sine functions of t — nothing changes in one frame.
// World: floor (feet) wy = 0 → screen y 640 at rest; the wall base is at wy −22; the window and the moon are on the right,
// the standing mirror on the left (MIRROR), the lamp between YOU and YOUR FRIEND, the bed behind the friend.
import { Canvas, hex, mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { MIRROR } from "../timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), PI = Math.PI;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- geometry shared with the actors
export const WALL_BASE = -22;
export const LAMP = { x: 15, shadeTop: -128, shadeBot: -99, cx: 15, cy: -112 };
export const WINDOW = { x0: 140, x1: 262, y0: -505, y1: -248 };
export const MOON = { x: 228, y: -446, r: 15 };
export const GLASS = { x0: MIRROR.x - 32, x1: MIRROR.x + 32, y0: MIRROR.y0 + 6, y1: MIRROR.y1 - 6, arcR: 32 };   // mirror glass (world)
GLASS.arcY = GLASS.y0 + GLASS.arcR;
export function inGlass(wx, wy) {
  if (wx < GLASS.x0 || wx >= GLASS.x1 || wy >= GLASS.y1) return false;
  if (wy >= GLASS.arcY) return true;
  return (wx + 0.5 - MIRROR.x) ** 2 + (wy + 0.5 - GLASS.arcY) ** 2 <= GLASS.arcR ** 2;
}
export const BED = { head: 54, x0: 66, top: -70 };

// ---------------------------------------------------------------- the cached buffer (world coords → buffer coords)
const OX = -340, OY = -660, BW = 690, BH = 1000;
let ROOM = null, BULBS = [], CITY = [], STARS = [];

function painter(A, KIND) {
  const P = Object.create(A); P.kind = 0;
  P.px = (x, y, c) => { x = Math.floor(x - OX); y = Math.floor(y - OY); if (!c || x < 0 || y < 0 || x >= BW || y >= BH) return; A.px(x, y, c); KIND[y * BW + x] = P.kind; };
  P.R = (x0, y0, x1, y1, c) => { for (let y = R(y0); y < R(y1); y++) for (let x = R(x0); x < R(x1); x++) P.px(x, y, typeof c === "function" ? c(x, y) : c); };
  P.E = (cx, cy, rx, ry, c) => { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2; if (d <= 1) P.px(x, y, typeof c === "function" ? c(x, y, d) : c); } };
  P.Q = (pts, c) => P.poly(pts, typeof c === "function" ? null : c, typeof c === "function" ? c : undefined);
  P.L = (x0, y0, x1, y1, c) => P.line(R(x0), R(y0), R(x1), R(y1), c);
  return P;
}

// palette (albedo; the light pass turns these into the night/lamp look)
const WALL = "#A492C2", WALL_DOT = "#9282B4", PANEL = "#8C7AAA", PANEL_HI = "#B4A2D6", PANEL_LO = "#6E5C92", TRIM = "#D6C6EC", TRIM_LO = "#7A68A2";
const WOOD = ["#3A2016", "#5C3420", "#7E4C2E", "#9C6640", "#B88050", "#D29E6A"];
const FLOOR = ["#B07A52", "#A6714C", "#BA845A", "#A97650"], SEAM = "#4E3024";
const BLANKET = ["#22102A", "#3E1C46", "#5E2C62", "#80427E", "#A05E98", "#BE80B2", "#D8A8CC", "#F0D4E6"];

function build() {
  const A = new Canvas(BW, BH, WALL), KIND = new Uint8Array(BW * BH), S = painter(A, KIND);
  // ---- back wall: dotted wallpaper (small diamonds), ceiling and crown moulding
  S.R(OX, OY, OX + BW, WALL_BASE, (x, y) => { const u = ((x % 22) + 22) % 22, v = ((y % 22) + 22) % 22, o = (Math.floor(y / 22) & 1) * 11, uu = ((u + o) % 22); return Math.abs(uu - 11) + Math.abs(v - 11) <= 1.5 ? WALL_DOT : WALL; });
  S.R(OX, OY, OX + BW, -624, "#4A3C70"); S.R(OX, -626, OX + BW, -624, "#2E2448");
  S.R(OX, -624, OX + BW, -616, TRIM); S.R(OX, -617, OX + BW, -614, TRIM_LO);
  // ---- wainscot: chair rail, raised panels, skirting
  S.R(OX, -152, OX + BW, WALL_BASE, PANEL);
  for (let x0 = -330; x0 < 350; x0 += 74) { S.R(x0 + 6, -140, x0 + 68, -42, PANEL_HI); S.R(x0 + 7, -139, x0 + 68, -42, PANEL_LO); S.R(x0 + 7, -139, x0 + 67, -43, PANEL); }
  S.R(OX, -158, OX + BW, -150, TRIM); S.R(OX, -151, OX + BW, -148, TRIM_LO); S.R(OX, -159, OX + BW, -158, TRIM_LO);
  S.R(OX, -36, OX + BW, WALL_BASE, "#6A5690"); S.R(OX, -36, OX + BW, -34, TRIM); S.R(OX, -24, OX + BW, WALL_BASE, "#4A3A6A");
  // ---- floor: boards running along the wall, joints converging toward the camera's vanishing point
  const rows = [WALL_BASE, -15, -7, 3, 15, 30, 48, 70, 96, 127, 164, 208, 260, 322, 400];
  const VPx = 0, VPy = -170;
  for (let i = 0; i + 1 < rows.length; i++) {
    const y0 = rows[i], y1 = rows[i + 1];
    let jx = -400 + rnd(i * 13) * 120; const joints = [];
    while (jx < 420) { joints.push(jx); jx += 110 + rnd(i * 7 + joints.length) * 120; }
    for (let y = y0; y < y1; y++) {
      const kx = (y - VPy) / (WALL_BASE - VPy);
      for (let x = OX; x < OX + BW; x++) {
        const xb = VPx + (x - VPx) / kx;            // the wall-base x this floor point belongs to
        let j = 0; while (j < joints.length && joints[j] <= xb) j++;
        const id = i * 31 + j, base = FLOOR[Math.floor(rnd(id) * FLOOR.length)];
        const nearJ = j > 0 && Math.abs(xb - joints[j - 1]) * kx < 0.8;
        const grain = rnd(id * 5 + Math.floor((xb + rnd(id) * 40) / 26) * 3 + (y - y0)) < 0.06;
        S.px(x, y, y === y0 ? SEAM : nearJ ? SEAM : grain ? mix(base, SEAM, 0.35) : base);
      }
    }
  }
  // ---- the rug (perspective oval under the two people), with fringe
  { const cx = 10, cy = 34, rx = 262, ry = 47;
    S.E(cx, cy + 3, rx + 2, ry + 2, "#3A1E30");
    S.E(cx, cy, rx, ry, (x, y, d) => {
      const r = Math.sqrt(d), ang = Math.atan2((y - cy) / ry, (x - cx) / rx);
      if (r > 0.93) return "#6A3058"; if (r > 0.89) return "#CDB08E"; if (r > 0.8) return (Math.floor((ang + PI) * 14) & 1) ? "#A84A62" : "#8E3E58";
      if (r > 0.77) return "#CDB08E";
      const dm = Math.abs((x - cx) / rx) + Math.abs((y - cy) / ry) * 0.9;
      if (dm < 0.22) return dm < 0.12 ? "#E0A85A" : "#A84A62"; if (dm < 0.26) return "#6A3058";
      return (Math.floor((x - cx) / 18) + Math.floor((y - cy) / 9)) % 2 === 0 && r < 0.7 ? "#C89488" : "#D2A294"; });
    for (const s of [-1, 1]) for (let k = -5; k <= 5; k++) { const yy = cy + k * 7.5, xx = cx + s * rx * Math.sqrt(Math.max(0, 1 - (k * 7.5 / ry) ** 2)); S.L(xx, yy, xx + s * 7, yy + 1, "#E8D2B0"); S.px(xx + s * 7, yy + 1, "#B89A80"); }
  }
  // ---- window: curtains, frame, night city
  const Wn = WINDOW;
  S.R(Wn.x0 - 8, Wn.y0 - 8, Wn.x1 + 8, Wn.y1 + 4, "#E2D8EE"); S.R(Wn.x0 - 6, Wn.y0 - 6, Wn.x1 + 6, Wn.y1 + 2, "#BEB0D4");
  S.kind = 1;
  for (let y = Wn.y0; y < Wn.y1; y++) for (let x = Wn.x0; x < Wn.x1; x++) {
    const v = (y - Wn.y0) / (Wn.y1 - Wn.y0), s = v * 4, lo = Math.floor(s), f = s - lo, cols = ["#0C0F30", "#141A44", "#1E2258", "#2E2A68", "#463876"];
    S.px(x, y, cols[Math.min(4, f > bayer(x, y) ? lo + 1 : lo)]);
  }
  for (let i = 0; i < 46; i++) { const x = Wn.x0 + 3 + rnd(i * 3 + 101) * (Wn.x1 - Wn.x0 - 6), y = Wn.y0 + 3 + rnd(i * 3 + 102) * 150; STARS.push({ x: R(x), y: R(y), b: rnd(i + 9) < 0.25, ph: rnd(i * 5) * 6.28, w: 0.8 + rnd(i * 11) * 1.6 }); }
  // moon with a soft halo and craters
  for (let y = MOON.y - 30; y <= MOON.y + 30; y++) for (let x = MOON.x - 30; x <= MOON.x + 30; x++) {
    if (x < Wn.x0 || x >= Wn.x1) continue; const d = Math.hypot(x + 0.5 - MOON.x, y + 0.5 - MOON.y);
    if (d < MOON.r) { const u = Math.hypot(x - MOON.x + 4, y - MOON.y + 5) / MOON.r; let col = u < 0.7 ? "#FFF6D8" : u < 0.95 ? ((u - 0.7) / 0.25 > bayer(x, y) ? "#EADBB0" : "#FFF6D8") : "#EADBB0";
      for (const [a, b, r] of [[-5, -4, 3.2], [4, -6, 2.2], [5, 3, 3.6], [-3, 6, 2.4]]) if (Math.hypot(x - MOON.x - a, y - MOON.y - b) < r) col = "#D8C48E";
      S.px(x, y, d > MOON.r - 1 ? "#E0CC98" : col); }
    else if (d < MOON.r + 13 && (1 - (d - MOON.r) / 13) * 0.6 > bayer(x, y)) S.px(x, y, mix(A.get(x - OX, y - OY), "#8A7AC8", 0.45));
  }
  // skyline: two layers of blocks with lit windows
  const sky = [[140, -300, 18], [158, -318, 14], [172, -286, 20], [192, -334, 16], [208, -296, 22], [230, -322, 14], [244, -290, 18]];
  for (const layer of [0, 1]) for (let i = 0; i < sky.length; i++) {
    const [x0, top, w] = sky[i], X0 = x0 + (layer ? 8 : 0) - (layer ? 4 : 0), T = top + (layer ? 22 : 0) + R(rnd(i + layer * 9) * 10), Wd = w + (layer ? 6 : 0);
    S.R(Math.max(Wn.x0, X0), T, Math.min(Wn.x1, X0 + Wd), Wn.y1, layer ? "#141634" : "#1E1E46");
    if (!layer) S.R(Math.max(Wn.x0, X0), T, Math.min(Wn.x1, X0 + Wd), T + 1, "#34306A");
    for (let y = T + 4; y < Wn.y1 - 3; y += 6) for (let x = X0 + 3; x < X0 + Wd - 3; x += 5) {
      if (x < Wn.x0 + 1 || x >= Wn.x1 - 2) continue; const h = rnd(x * 7 + y * 13 + layer * 5);
      if (h < (layer ? 0.42 : 0.3)) { const col = h < 0.05 ? "#9AD8FF" : layer ? "#F8D27A" : "#E8B86A"; S.R(x, y, x + 2, y + 2, col); if (h > 0.2 && h < 0.26) CITY.push({ x, y, col, ph: h * 100 }); }
    }
  }
  S.kind = 0;
  // muntins + frame + sill
  S.R(R((Wn.x0 + Wn.x1) / 2) - 2, Wn.y0, R((Wn.x0 + Wn.x1) / 2) + 2, Wn.y1, "#E2D8EE"); S.R(Wn.x0, -380, Wn.x1, -376, "#E2D8EE");
  S.R(R((Wn.x0 + Wn.x1) / 2) + 1, Wn.y0, R((Wn.x0 + Wn.x1) / 2) + 2, Wn.y1, "#A898C0"); S.R(Wn.x0, -377, Wn.x1, -376, "#A898C0");
  S.R(Wn.x0 - 14, Wn.y1 + 2, Wn.x1 + 14, Wn.y1 + 9, "#EEE6F6"); S.R(Wn.x0 - 14, Wn.y1 + 8, Wn.x1 + 14, Wn.y1 + 11, "#9A8AB8");
  // a little cactus on the sill
  { const x = 160, y = Wn.y1 + 2; S.Q([[x - 7, y], [x + 7, y], [x + 5, y - 10], [x - 5, y - 10]], "#C0643E"); S.R(x - 6, y - 12, x + 7, y - 9, "#D87A50");
    S.E(x, y - 20, 4.5, 9, "#4E9A5E"); S.E(x - 1.5, y - 21, 1.6, 6, "#72BE7A"); S.E(x + 6, y - 18, 2.6, 4, "#4E9A5E"); S.px(x, y - 30, "#F27A9A"); S.px(x + 1, y - 30, "#F8B0C4"); }
  // curtains (dusty rose, soft vertical folds) and the rod
  const curtain = (x0, x1, sgn) => { for (let y = Wn.y0 - 20; y < Wn.y1 + 34; y++) { const tie = y > Wn.y1 - 40 && y < Wn.y1 - 30, pinch = tie ? 0.55 : y > Wn.y1 - 40 ? 0.75 + 0.25 * clamp01((y - Wn.y1 + 30) / 60) : 1;
    const w = (x1 - x0) * pinch, xa = sgn > 0 ? x0 : x1 - w, xb = sgn > 0 ? x0 + w : x1;
    for (let x = R(xa); x < R(xb); x++) { const u = (x - xa) / Math.max(1, w), fold = Math.sin(u * PI * 3.2 + 0.4), col = fold > 0.55 ? "#E8A4B0" : fold > -0.2 ? "#D48898" : fold > -0.7 ? "#B86C80" : "#9A5468"; S.px(x, y, tie ? (Math.abs(y - (Wn.y1 - 35)) < 2 ? "#F4CA50" : "#C99A2A") : col); } } };
  curtain(Wn.x0 - 30, Wn.x0 + 2, 1); curtain(Wn.x1 - 2, Wn.x1 + 34, -1);
  S.R(Wn.x0 - 40, Wn.y0 - 24, Wn.x1 + 44, Wn.y0 - 20, "#5A3A2A"); S.R(Wn.x0 - 40, Wn.y0 - 24, Wn.x1 + 44, Wn.y0 - 23, "#8A5A3C");
  for (const x of [Wn.x0 - 42, Wn.x1 + 44]) S.E(x, Wn.y0 - 22, 4, 4, "#C99A2A");
  // ---- left poster: a ringed planet in a starry sky (frame + mat)
  { const x0 = -262, y0 = -502, x1 = -168, y1 = -370;
    S.R(x0 - 4, y0 - 4, x1 + 4, y1 + 4, "#2A1E36"); S.R(x0, y0, x1, y1, "#1E2A62");
    S.R(x0, y0, x1, y0 + 44, "#2A2470");
    for (let i = 0; i < 26; i++) S.px(x0 + 3 + rnd(i * 4 + 501) * (x1 - x0 - 6), y0 + 3 + rnd(i * 4 + 502) * (y1 - y0 - 6), rnd(i) < 0.3 ? "#FFF6D8" : "#9A9AE0");
    const pcx = -216, pcy = -440;
    S.E(pcx, pcy, 30, 7, "#E0C890"); S.E(pcx, pcy, 25, 4.5, "#1E2A62");
    S.E(pcx, pcy, 19, 19, (x, y) => { const u = (y - pcy + 19) / 38, b = Math.floor(u * 6); return ["#FFD08A", "#F4A85A", "#E88A4A", "#F4A85A", "#D8703E", "#B85A36"][Math.min(5, b)]; });
    for (let x = pcx - 30; x <= pcx + 30; x++) { const dy = 7 * Math.sqrt(Math.max(0, 1 - ((x - pcx) / 30) ** 2)); if (Math.abs(x - pcx) > 17 || true) { const y = R(pcy + dy); if (Math.abs(x - pcx) > 16 || y > pcy + 3) S.px(x, y, "#E0C890"); } }
    S.E(pcx - 7, pcy - 8, 4, 3, "#FFE4B0");
    S.R(x0 + 8, y1 - 22, x1 - 8, y1 - 18, "#F4CA50"); S.R(x0 + 18, y1 - 13, x1 - 18, y1 - 10, "#7FE3F0"); }
  // ---- cork board with polaroids (centre-left, seen before the VIEW opens and after it closes)
  { const x0 = -140, y0 = -372, x1 = -24, y1 = -296;
    S.R(x0 - 3, y0 - 3, x1 + 3, y1 + 3, "#7A4C2C"); S.R(x0, y0, x1, y1, (x, y) => (rnd(x * 31 + y * 17) < 0.18 ? "#B0784A" : "#C48A58"));
    const pics = [[x0 + 8, y0 + 8, -0.06, "#7FE3F0", "#F4CA50"], [x0 + 38, y0 + 14, 0.05, "#F27A9A", "#FDFEED"], [x0 + 70, y0 + 6, -0.03, "#65DA41", "#7FE3F0"], [x0 + 22, y0 + 40, 0.04, "#B08AE8", "#F27A9A"], [x0 + 80, y0 + 40, -0.05, "#F4CA50", "#E05A44"]];
    for (const [px0, py0, tilt, c1, c2] of pics) { const w = 24, h = 28; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const X = px0 + x + R(tilt * y), Y = py0 + y; const inPic = x >= 3 && x < w - 3 && y >= 3 && y < h - 8; S.px(X, Y, inPic ? (y < 3 + (h - 11) * 0.55 ? c1 : c2) : "#F4F0E8"); } S.E(px0 + 12, py0 + 1, 2, 2, "#E03056"); }
  }
  // ---- string of fairy lights along the top of the wall (bulbs recorded for the live twinkle)
  { const hooks = [-360, -250, -140, -30, 80, 190, 300, 410];
    for (let i = 0; i + 1 < hooks.length; i++) { const a = hooks[i], b = hooks[i + 1];
      for (let x = a; x <= b; x++) { const u = (x - a) / (b - a), y = -606 + 26 * Math.sin(PI * u); S.px(x, R(y), "#2A2236"); }
      for (let k = 1; k < 5; k++) { const u = k / 5, x = a + (b - a) * u, y = -606 + 26 * Math.sin(PI * u); BULBS.push({ x: R(x), y: R(y) + 3, col: ["#FFD27A", "#FF9AB0", "#FFE9A8", "#9AE8D8"][(i * 4 + k) % 4], ph: rnd(i * 9 + k) * 6.28 }); } }
    for (const b of BULBS) { S.R(b.x - 1, b.y - 2, b.x + 1, b.y, "#3A3046"); }
  }
  // ---- dresser behind YOU, with a trailing plant and a book stack
  { const x0 = -200, x1 = -54, top = -88;
    S.R(x0 + 4, top + 6, x1 - 4, WALL_BASE + 2, WOOD[2]); S.R(x0, top, x1, top + 6, WOOD[4]); S.R(x0, top, x1, top + 1, WOOD[5]); S.R(x0 + 1, top + 5, x1 - 1, top + 6, WOOD[1]);
    for (const [y0, y1] of [[top + 10, top + 34], [top + 38, top + 62]]) { S.R(x0 + 8, y0, x1 - 8, y1, WOOD[3]); S.R(x0 + 8, y0, x1 - 8, y0 + 1, WOOD[4]); S.R(x0 + 8, y1 - 1, x1 - 8, y1, WOOD[1]); for (const hx of [x0 + 34, x1 - 34]) { S.R(hx - 6, R((y0 + y1) / 2) - 1, hx + 6, R((y0 + y1) / 2) + 2, "#C99A2A"); S.px(hx - 5, R((y0 + y1) / 2) - 1, "#FDF0A8"); } }
    S.R(x0 + 6, WALL_BASE - 4 + 2, x0 + 12, WALL_BASE + 2, WOOD[1]); S.R(x1 - 12, WALL_BASE - 2, x1 - 6, WALL_BASE + 2, WOOD[1]);
    // plant pot (left end) with trailing leaves
    const px = x0 + 16; S.Q([[px - 11, top], [px + 11, top], [px + 9, top - 18], [px - 9, top - 18]], "#E8E0F0"); S.R(px - 10, top - 20, px + 11, top - 16, "#F4F0F8");
    const leaf = (x, y, a, s) => { for (let k = -s; k <= s; k++) for (let j = -2; j <= 2; j++) { const X = x + k * Math.cos(a) - j * Math.sin(a), Y = y + k * Math.sin(a) + j * Math.cos(a); if (Math.abs(j) <= 2 * (1 - Math.abs(k) / (s + 1))) S.px(R(X), R(Y), j < 0 ? "#6AB87A" : "#3E8A58"); } };
    for (let i = 0; i < 9; i++) leaf(px - 8 + i * 2.2, top - 22 - rnd(i + 40) * 14, -1.2 + i * 0.3, 4);
    for (let i = 0; i < 7; i++) { const x = px - 12 + rnd(i + 70) * 3, y = top - 6 + i * 9; S.L(x + 2, y - 8, x, y, "#2E6A44"); leaf(x - 2, y, 0.9 + (i % 2) * 0.8, 3); }
    // book stack (right end) and a tiny frame
    const bx = x1 - 34; [["#7FE3F0", 30, 6], ["#F27A9A", 26, 5], ["#F4CA50", 28, 6]].forEach(([c, w, h], i) => { const y = top - 1 - (i + 1) * 6; S.R(bx - w / 2 + i * 2, y, bx + w / 2 + i * 2, y + h, c); S.R(bx - w / 2 + i * 2, y + h - 1, bx + w / 2 + i * 2, y + h, mix(c, "#000000", 0.35)); S.R(bx + w / 2 + i * 2 - 3, y + 1, bx + w / 2 + i * 2 - 1, y + h - 1, "#FDFEED"); });
    S.R(x0 + 50, top - 24, x0 + 68, top, "#4A2C18"); S.R(x0 + 52, top - 22, x0 + 66, top - 2, "#F4F0E8"); S.R(x0 + 54, top - 20, x0 + 64, top - 8, "#9AD8FF"); S.E(x0 + 59, top - 9, 4, 3, "#65DA41");
  }
  // ---- the standing mirror (frame + arched glass with the dark, cool reflected room)
  { const g = GLASS, fx0 = g.x0 - 6, fx1 = g.x1 + 6;
    for (const s of [-1, 1]) { const x = MIRROR.x + s * 26; S.Q([[x - 3, MIRROR.y1 - 6], [x + 3, MIRROR.y1 - 6], [x + 3 + s * 8, 0], [x - 3 + s * 8, 0]], WOOD[2]); S.R(x - 3 + s * 8, -2, x + 3 + s * 8, 0, WOOD[1]); }
    for (let y = g.y0 - 6; y < MIRROR.y1; y++) for (let x = fx0; x < fx1; x++) {
      const inF = y >= g.arcY ? true : (x + 0.5 - MIRROR.x) ** 2 + (y + 0.5 - g.arcY) ** 2 <= (g.arcR + 6) ** 2; if (!inF) continue;
      const inner = inGlass(x, y), edge = y >= g.arcY ? Math.min(x - fx0, fx1 - 1 - x, MIRROR.y1 - 1 - y) : (g.arcR + 6) - Math.hypot(x + 0.5 - MIRROR.x, y + 0.5 - g.arcY);
      if (inner) continue;
      S.px(x, y, edge < 1 ? "#5A3A1E" : edge < 2.2 ? "#E8C07A" : edge < 4 ? "#C8964E" : "#9A6A34");
    }
    S.kind = 2;
    for (let y = g.y0; y < g.y1; y++) for (let x = g.x0; x < g.x1; x++) {
      if (!inGlass(x, y)) continue;
      const v = (y - g.y0) / (g.y1 - g.y0); let col = v < 0.62 ? (v * 3 % 1 > bayer(x, y) ? "#4A4680" : "#443E78") : v < 0.64 ? "#6A5E98" : v < 0.9 ? "#3E3666" : "#3A2A44";
      const lg = Math.hypot((x - (g.x1 - 6)) / 14, (y - (-112)) / 18); if (lg < 1 && (1 - lg) * 1.4 > bayer(x, y)) col = lg < 0.35 ? "#FFE3A6" : "#C88A72";
      S.px(x, y, col);
    }
    S.kind = 0;
  }
  // ---- nightstand + lamp (between the two people)
  { const x0 = -14, x1 = 44;
    S.R(x0 + 3, -64, x1 - 3, -28, WOOD[3]); S.R(x0, -70, x1, -64, WOOD[4]); S.R(x0, -70, x1, -69, WOOD[5]); S.R(x0 + 1, -65, x1 - 1, -64, WOOD[1]);
    S.R(x0 + 7, -58, x1 - 7, -38, WOOD[2]); S.R(x0 + 7, -58, x1 - 7, -57, WOOD[4]); S.E(15, -48, 2.5, 2.5, "#C99A2A");
    S.R(x0 + 4, -28, x0 + 9, WALL_BASE + 2, WOOD[1]); S.R(x1 - 9, -28, x1 - 4, WALL_BASE + 2, WOOD[1]);
    S.E(15, -80, 9, 10, (x, y) => (x < 13 ? "#F4C2D4" : x < 19 ? "#E8A4BC" : "#C8809C")); S.R(11, -92, 19, -88, "#C8809C"); S.R(13, -100, 17, -91, "#8A5A3C");
    S.R(31, -80, 40, -70, "#7FE3F0"); S.R(31, -80, 40, -79, "#C4F4FA"); S.R(40, -77, 42, -73, "#5AB4C8");
    S.kind = 1;
    S.Q([[2, LAMP.shadeTop], [28, LAMP.shadeTop], [36, LAMP.shadeBot], [-6, LAMP.shadeBot]], (x, y) => { const v = (y - LAMP.shadeTop) / (LAMP.shadeBot - LAMP.shadeTop); return v < 0.12 ? "#E8A860" : v > 0.86 ? "#FFF6D8" : (v * 3 % 1 > bayer(x, y) ? "#FFE6AE" : "#FFD890"); });
    S.R(2, LAMP.shadeTop - 1, 28, LAMP.shadeTop, "#B87840");
    S.kind = 0;
  }
  // ---- the bed behind the friend: headboard, frame, mattress, pillow, a plush bear, the starry blanket
  { const hx = BED.head;
    S.R(hx, -150, hx + 12, WALL_BASE + 2, WOOD[3]); S.E(hx + 6, -150, 6, 6, WOOD[4]); S.R(hx + 3, -140, hx + 9, -60, WOOD[2]); S.R(hx, -150, hx + 1, WALL_BASE, WOOD[4]);
    S.R(hx + 12, -52, 360, -30, WOOD[3]); S.R(hx + 12, -52, 360, -50, WOOD[4]); S.R(hx + 12, -31, 360, -30, WOOD[1]);
    S.R(hx + 14, -30, hx + 20, WALL_BASE + 2, WOOD[1]);
    S.R(hx + 12, BED.top, 360, -52, "#E6DCEE"); S.R(hx + 12, BED.top, 360, BED.top + 2, "#F8F2FC");
    S.E(hx + 38, BED.top - 10, 26, 11, (x, y, d) => (d > 0.82 ? "#9A88C4" : y < BED.top - 13 ? "#ECE2FA" : "#D2C2EE"));
    // plush bear sitting on the pillow
    { const bx = hx + 40, by = BED.top - 20; S.E(bx, by - 2, 9, 9, "#B07A4E"); S.E(bx, by - 15, 7.5, 7, "#C08A5A"); S.E(bx - 6, by - 21, 3, 3, "#B07A4E"); S.E(bx + 6, by - 21, 3, 3, "#B07A4E"); S.E(bx, by - 12, 3.4, 2.4, "#E8C49A"); S.px(bx - 3, by - 16, "#1A0E0C"); S.px(bx + 3, by - 16, "#1A0E0C"); S.px(bx, by - 13, "#3A1E14"); S.E(bx - 7, by + 1, 3, 4, "#C08A5A"); S.E(bx + 7, by + 1, 3, 4, "#C08A5A"); S.E(bx, by + 4, 5, 3, "#E8C49A"); }
    for (let y = -84; y < -36; y++) for (let x = hx + 52; x < 360; x++) {
      const topY = -82 + 3 * Math.sin(x * 0.05) + 2 * Math.sin(x * 0.13 + 1), hem = -38 + 2 * Math.sin(x * 0.11);
      if (y < topY || y > hem) continue; if (x < hx + 52 + 6 && y < topY + 6 - (x - hx - 52)) continue;
      const v = (y - topY) / (hem - topY), tone = y < topY + 2 ? 6 : v < 0.35 ? 5 : v < 0.45 ? (bayer(x, y) < 0.5 ? 5 : 4) : 4 - (v > 0.8 ? 1 : 0);
      const u = (x - hx) / 9, w2 = (y - topY) / 9, iu = Math.floor(u), iv = Math.floor(w2), fu = u - iu - 0.5, fv = w2 - iv - 0.5, star = rnd(iu * 7 + iv * 13) < 0.4 && (Math.abs(fu) + Math.abs(fv) < 0.16 || (Math.min(Math.abs(fu), Math.abs(fv)) < 0.05 && Math.abs(fu) + Math.abs(fv) < 0.32));
      S.px(x, y, star ? BLANKET[7] : y > hem - 1 ? BLANKET[2] : BLANKET[tone]);
    }
  }
  // ---- foreground (near the camera): a big plant, fluffy slippers, a book stack with a cocoa mug, a game pad
  { // plant (bottom-left)
    const px = -232, py = 262;
    S.Q([[px - 52, py], [px + 52, py], [px + 42, 400], [px - 42, 400]], "#B8643C"); S.R(px - 56, py - 10, px + 56, py + 4, "#CC7448"); S.R(px - 56, py - 10, px + 56, py - 8, "#E08A5A");
    for (let x = px - 40; x < px + 40; x += 9) S.R(x, py + 14, x + 4, 400, "#A85834");
    const big = (cx, cy, a, L, W) => { for (let k = 0; k <= L; k++) for (let j = -W; j <= W; j++) { const half = W * Math.sin(PI * Math.min(1, (k + 2) / (L + 2))) * (1 - 0.3 * k / L); if (Math.abs(j) > half) continue; const X = cx + k * Math.cos(a) - j * Math.sin(a), Y = cy + k * Math.sin(a) + j * Math.cos(a); const vein = Math.abs(j) < 0.8, cut = Math.abs(j) > half * 0.55 && (k % 9) < 2; if (cut) continue; S.px(R(X), R(Y), vein ? "#7ACB8A" : j < 0 ? "#4E9A62" : "#2E6E48"); } };
    big(px - 6, py - 10, -2.2, 70, 18); big(px + 4, py - 10, -1.1, 64, 17); big(px, py - 10, -1.65, 86, 20); big(px - 10, py - 6, -2.8, 52, 14); big(px + 10, py - 6, -0.4, 50, 14);
    // slippers (pink, fluffy) — slightly toward the centre
    for (const [sx, sy] of [[-104, 262], [-50, 276]]) { S.E(sx, sy + 6, 34, 13, "#2A1428"); S.E(sx, sy, 32, 14, (x, y, d) => (d > 0.72 ? (bayer(x, y) < 0.6 ? "#FFC4D4" : "#F094AA") : y < sy - 3 ? "#F8BCCB" : "#E26A88")); S.E(sx + 12, sy - 3, 13, 8, "#F8BCCB"); S.E(sx - 12, sy - 3, 10, 7, "#C84468"); S.E(sx - 13, sy - 5, 6, 3, "#9C2A4C");
      for (const ex of [18, 9]) { S.E(sx + ex, sy - 15, 4, 9, "#F8BCCB"); S.E(sx + ex, sy - 15, 2, 6, "#FFE2EA"); }
      S.px(sx + 22, sy - 4, "#1A0E14"); S.px(sx + 16, sy - 4, "#1A0E14"); S.px(sx + 19, sy - 1, "#E03056"); }
    // book stack + cocoa mug (bottom-right)
    const bx = 178, by = 300;
    [["#3A5A9A", 132, 22], ["#C25C6E", 122, 18], ["#F4CA50", 128, 20]].forEach(([c, w, h], i) => { const y = by - (i + 1) * h + i * 2 - (i ? 2 : 0) * i, x0 = bx - w / 2 + (i % 2 ? 6 : -4); S.R(x0, y, x0 + w, y + h, c); S.R(x0, y + h - 3, x0 + w, y + h, mix(c, "#000000", 0.4)); S.R(x0 + w - 8, y + 3, x0 + w - 2, y + h - 3, "#F4EEE0"); S.R(x0 + 10, y + 6, x0 + 40, y + 9, mix(c, "#FFFFFF", 0.35)); });
    const my = by - 60, mx = bx - 10;
    S.R(mx - 18, my - 34, mx + 18, my, "#F4F0F8"); S.R(mx - 18, my - 34, mx - 12, my, "#FFFFFF"); S.R(mx + 10, my - 34, mx + 18, my, "#D2C8E2"); S.E(mx, my - 34, 18, 4, "#6A3A22"); S.E(mx - 3, my - 35, 9, 2, "#8A5232");
    for (let k = 0; k < 14; k++) { const a = -PI / 2 + (k / 13) * PI; S.R(R(mx + 18 + Math.cos(a) * 9), R(my - 18 + Math.sin(a) * 10), R(mx + 18 + Math.cos(a) * 9) + 4, R(my - 18 + Math.sin(a) * 10) + 3, "#E2D8EE"); }
    S.E(mx, my - 18, 6, 5, "#F27A9A"); S.E(mx - 3, my - 20, 2.5, 2, "#F27A9A"); S.E(mx + 3, my - 20, 2.5, 2, "#F27A9A");
    // game pad on the floor (generic)
    const gx = 40, gy = 300; S.E(gx, gy + 4, 32, 10, "#1A1024"); S.E(gx - 18, gy, 16, 12, "#5A5A8A"); S.E(gx + 18, gy, 16, 12, "#5A5A8A"); S.R(gx - 18, gy - 10, gx + 18, gy + 6, "#5A5A8A"); S.R(gx - 18, gy - 10, gx + 18, gy - 8, "#7A7AAE");
    S.R(gx - 24, gy - 2, gx - 12, gy + 1, "#2A2A44"); S.R(gx - 20, gy - 6, gx - 17, gy + 5, "#2A2A44"); for (const [dx, dy, c] of [[18, -5, "#F27A9A"], [24, 0, "#7FE3F0"], [12, 0, "#F4CA50"], [18, 4, "#65DA41"]]) S.E(gx + dx, gy + dy, 2.2, 2.2, c);
  }
  // ---- light pass (kind 0 only): night ambient + lamp pool + moon glow + fairy glow, quantised with Bayer dither
  const d = A.d, AMB = [0.3, 0.27, 0.5], LW = [1.16, 0.8, 0.4], MW = [0.2, 0.28, 0.52], FW = [0.55, 0.38, 0.26];
  const q = (v, X, Y, n = 6) => { const s = v * n, lo = Math.floor(s); return (s - lo > bayer(X, Y) ? lo + 1 : lo) / n; };
  for (let by = 0; by < BH; by++) for (let bx = 0; bx < BW; bx++) {
    const i = by * BW + bx; if (KIND[i] === 1) continue;
    const x = bx + OX, y = by + OY, floor = y > WALL_BASE;
    let lamp;
    if (!floor) {
      const dx = x - LAMP.cx, dy = y - LAMP.cy, dd = Math.hypot(dx, dy * 1.05), radial = 1 / (1 + (dd / 92) ** 2);
      const above = y < LAMP.shadeTop ? clamp01(1.4 - Math.abs(dx) / (14 + (LAMP.shadeTop - y) * 0.62)) : 0, below = y > LAMP.shadeBot ? clamp01(1.4 - Math.abs(dx) / (22 + (y - LAMP.shadeBot) * 1.1)) : 0;
      lamp = radial * (0.55 + 0.6 * Math.max(above, below));
    } else {
      const pool = ((x - LAMP.cx) / 185) ** 2 + ((y - 8) / 50) ** 2, radial = 1 / (1 + (Math.hypot(x - LAMP.cx, (y + 60) * 1.6) / 140) ** 2);
      lamp = 0.52 * Math.max(0, 1 - pool) ** 1.4 + 0.3 * radial;
    }
    lamp = Math.min(0.92, lamp);
    const wdx = Math.max(WINDOW.x0 - x, 0, x - WINDOW.x1), wdy = Math.max(WINDOW.y0 - y, 0, y - WINDOW.y1), moon = floor ? 0.35 * clamp01(1 - (((x - 150 + (y - 40) * 0.5) / 120) ** 2 + ((y - 40) / 40) ** 2)) : 0.5 / (1 + (Math.hypot(wdx, wdy) / 60) ** 2);
    const fairy = y < -560 ? 0.5 * clamp01((-540 - y) / 60) : 0;
    const lq = q(lamp, bx, by), mq = q(moon, bx + 1, by + 2, 4), fq = q(fairy, bx + 2, by + 1, 4);
    const far = floor ? clamp01((y - 90) / 220) * 0.26 : 0, kind2 = KIND[i] === 2;
    for (let k = 0; k < 3; k++) {
      const m = kind2 ? 1 : (AMB[k] + lq * LW[k] * 1.25 + mq * MW[k] + fq * FW[k]) * (1 - far);
      d[i * 3 + k] = Math.min(255, d[i * 3 + k] * m + (kind2 ? 0 : [6, 2, 12][k]));
    }
  }
  return { d, W: BW, H: BH };
}

/** Copy the cached room into the frame (whole-pixel camera). */
export function drawRoom(c, V) {
  if (!ROOM) ROOM = build();
  const src = ROOM.d, dst = c.d, W = c.w;
  for (let y = 0; y < c.h; y++) {
    const wy = y - 480 + V.cy, by = wy - OY; if (by < 0 || by >= BH) continue;
    const wx0 = V.cx - 270, bx0 = wx0 - OX, a = Math.max(0, -bx0), b = Math.min(W, BW - bx0); if (b <= a) continue;
    dst.set(src.subarray((by * BW + bx0 + a) * 3, (by * BW + bx0 + b) * 3), (y * W + a) * 3);
  }
}

/** Live details over the cached room: fairy bulbs breathing, stars twinkling, a few city windows, cocoa steam. */
export function drawRoomLive(c, V, t) {
  if (!ROOM) ROOM = build();
  for (const b of BULBS) {
    const X = V.X(b.x), Y = V.Y(b.y); if (X < -6 || X > 546) continue;
    const k = 0.62 + 0.38 * Math.sin(t * 1.3 + b.ph), core = mix(b.col, "#FFFFFF", 0.25 * k);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { const dd = Math.hypot(dx, dy - 1); if (dd < 2.2 || dd > 6) continue; if ((1 - dd / 6) * 0.75 * k > bayer(X + dx, Y + dy)) c.px(X + dx, Y + dy, mix(c.get(X + dx, Y + dy), b.col, 0.4)); }
    c.rect(X - 1, Y, 3, 3, b.col); c.px(X, Y + 1, core); c.px(X - 1, Y, mix(b.col, "#FFFFFF", 0.5));
  }
  for (const s of STARS) {   // brightness eases with a sine: the colour slides from the sky to the star, never pops
    const X = V.X(s.x), Y = V.Y(s.y), k = 0.5 + 0.5 * Math.sin(t * s.w + s.ph), bg = c.get(X, Y);
    c.px(X, Y, mix(bg, s.b ? "#FFF6D8" : "#C8C0F0", 0.25 + 0.75 * k));
    if (s.b) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) c.px(X + dx, Y + dy, mix(c.get(X + dx, Y + dy), "#8A80C8", 0.6 * k * k));
  }
  for (const w of CITY) { const k = 0.5 + 0.5 * Math.sin(t * 0.7 + w.ph); const X = V.X(w.x), Y = V.Y(w.y); for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) c.px(X + i, Y + j, k > bayer(X + i, Y + j) ? w.col : "#1E1E46"); }
  // cocoa steam: three soft wisps rising from the mug and dissolving
  const mx = 168, my = 206;
  for (let k = 0; k < 3; k++) for (let i = 0; i < 26; i++) {
    const u = ((t * 0.32 + k / 3 + i / 26 * 0.0) % 1), life = (i / 26 + t * 0.35 + k * 0.33) % 1, y = my - 6 - life * 56, x = mx - 8 + k * 8 + Math.sin(life * 7 + t * 1.6 + k * 2) * 5 * life;
    const a = Math.sin(PI * life) * 0.55; void u;
    const X = R(V.X(x)), Y = R(V.Y(y)); if (a > bayer(X, Y)) c.px(X, Y, mix(c.get(X, Y), "#F4F0F8", 0.5));
  }
}
