// Street art («GTA 6: the city behind you»): the sunset "Vice City" street painted once, in its DRAWN look, with ids for
// the blueprint (street-kit.mjs). Coordinates: world x (0..1080) and REST screen y ("sy" = the screen row at the resting
// camera cy −180, i.e. world y + 660). Layers:
//   FAR    — the bay at sunset with the far skyline (parallax 0.3), layer x = REST screen x;
//   STREET — far beach strip, the pastel art-deco row with neon, back-sidewalk palms (trunks) and lamps, the far
//            sidewalk, the road, the front promenade with props (parallax 1: world x);
//   FORE   — the promenade wall and the beach park in front (parallax 1.25), layer x = REST screen x;
//   palms  — crowns (back row and the two big foreground palms) cached per sway step; fore trunks.
// Illustration in our own pixel style: generic signs (OCEAN, SURF, DINER, HOTEL, MOTEL, CAFE, SUNSET), no brands.
import { MAIN } from "../../../../../renderer/pixel/raster.mjs";
import { Art, bakeBlue, vgrad, hline, vline, glowAt, thick, rnd, mix, bayer, lerp, K_WALL, K_GLASS, K_WATER, K_GROUND, K_NEON, K_LAMP, K_PLANT } from "./street-kit.mjs";

const R = Math.round;
export const BASE = 556;            // building base (REST sy) = back edge of the far sidewalk
export const WALK_B = [556, 572];   // far sidewalk (BACKWALK −96 → sy 564 in its middle)
export const ROAD_B = [572, 628];   // road (ROAD −60 → sy 600, lanes at 594 / 612)
export const PROM = [628, 700];     // front promenade (LAND −20 → sy 640, the hero's feet)
export const FAR_P = 0.3, FORE_P = 1.25;
export const NEON = { pink: "#FF5AAE", cyan: "#52F2FF", yellow: "#FFDA4A", red: "#FF4A62", green: "#7CFF96", orange: "#FF9A3A", violet: "#C88AFF" };
const NCORE = { pink: "#FFD2EC", cyan: "#E2FEFF", yellow: "#FFF6C8", red: "#FFC8D0", green: "#E0FFE8", orange: "#FFE2B8", violet: "#F0E0FF" };

// ---------------------------------------------------------------- palettes (golden hour pastels)
const P = {
  pink: { base: "#F6A2C2", light: "#FFD2E2", shade: "#D27098", deep: "#8C3C70", side: "#BA5C8C", trim: "#FFF2F4", acc: "#7FDCD0", acc2: "#FFE08A", awn: ["#FF6FA8", "#FFF4F0"] },
  mint: { base: "#9EE4CE", light: "#D6FAEC", shade: "#62B6A6", deep: "#2E7676", side: "#4E9A96", trim: "#F6FFFA", acc: "#FF8AB8", acc2: "#FFD58A", awn: ["#FF8AB0", "#FFF6F0"] },
  lilac: { base: "#C0A8F2", light: "#E4D6FF", shade: "#8E74CE", deep: "#4E3C90", side: "#7A62B8", trim: "#FBF6FF", acc: "#FFB0D0", acc2: "#9AF0E0", awn: ["#8E74CE", "#FFF8FF"] },
  peach: { base: "#FFD4A8", light: "#FFF0D8", shade: "#E4A074", deep: "#9A5A40", side: "#CC8664", trim: "#FFFBF2", acc: "#F47AA6", acc2: "#7FD8E0", awn: ["#F47AA6", "#FFF8F0"] },
  cream: { base: "#FBEBD2", light: "#FFFAF0", shade: "#DEC0A4", deep: "#8E6A5A", side: "#C8A48C", trim: "#FFFFFF", acc: "#56C8C0", acc2: "#FF8AA8", awn: ["#3EB4B0", "#FFFFFF"] },
  aqua: { base: "#94D8F2", light: "#D4F2FF", shade: "#5AA4CC", deep: "#2E5C8A", side: "#4A88B2", trim: "#F4FCFF", acc: "#FFB0C8", acc2: "#FFE08A", awn: ["#FF9AB8", "#FFFFFF"] },
};

// ---------------------------------------------------------------- the row of buildings (world x)
// sign: horizontal neon {text, col, x, y} (x,y relative to the building's left/top) · fin: vertical neon {text, col, side}
export const BUILDINGS = [
  { id: 10, x: 0, w: 112, h: 150, pal: "lilac", crown: "step", roofNeon: "cyan", balc: true, ground: "lobby" },
  { id: 11, x: 116, w: 128, h: 92, pal: "cream", crown: "flat", ground: "shop", sign: { text: "BAR", col: "red" }, roofNeon: "pink" },
  { id: 12, x: 248, w: 106, h: 142, pal: "pink", crown: "step", roundL: true, balc: true, ground: "lobby", fin: { text: "OCEAN", col: "cyan", at: 0.78 }, roofNeon: "cyan" },
  { id: 13, x: 358, w: 84, h: 84, pal: "mint", crown: "flat", ground: "shop", sign: { text: "SURF", col: "yellow" }, boards: true, roofNeon: "pink" },
  { id: 14, x: 590, w: 48, h: 56, pal: "cream", crown: "diner", ground: "diner", roundR: true },
  { id: 15, x: 642, w: 106, h: 196, pal: "peach", crown: "zig", balc: true, ground: "lobby", fin: { text: "HOTEL", col: "pink", at: 0.86 }, roofNeon: "pink", marquee: true },
  { id: 16, x: 752, w: 100, h: 150, pal: "lilac", crown: "flat", balc: true, ground: "shop", sign: { text: "MOTEL", col: "cyan", top: true }, roofNeon: null },
  { id: 17, x: 856, w: 104, h: 118, pal: "mint", crown: "step", roundR: true, ground: "shop", sign: { text: "CAFE", col: "pink" }, roofNeon: "yellow" },
  { id: 18, x: 964, w: 116, h: 164, pal: "pink", crown: "zig", balc: true, ground: "lobby", fin: { text: "SUNSET", col: "yellow", at: 0.14 }, roofNeon: "cyan" },
];
export const GAP = [446, 588];                      // beach access between SURF and the DINER (behind the hero)
export const BACK_PALMS = [{ x: 318, h: 150, lean: -6, ph: 0.3 }, { x: 452, h: 168, lean: -10, ph: 1.7 }, { x: 864, h: 158, lean: 8, ph: 2.9 }, { x: 1040, h: 140, lean: -4, ph: 4.1 }];
export const LAMPS = [404, 584, 752, 960];
// the building hidden behind the tall HOTEL (shown only as an X-ray wireframe) — world x, REST sy
export const HIDDEN = { x: 662, w: 56, top: 452, base: BASE, depth: 12 };
export const HOTEL = BUILDINGS.find((b) => b.id === 15);
// the LOD tower on the far skyline (far-layer x = REST screen x), drawn live by street-tower.mjs
export const TOWER = { lx: 341, w: 30, h: 166, base: 487 };

let SIGN_ID = 200;

function windowAt(g, A, x, y, w, h, Pl, seed, lit = 0.2) {
  const v = rnd(seed);
  A.with({ f: 2 }, (g) => { g.rect(x - 1, y - 1, w + 2, h + 2, Pl.trim); hline(g, x - 1, y + h + 1, w + 2, Pl.shade); });
  A.with({ f: 1, kind: K_GLASS }, (g) => {
    if (v < lit) { vgrad(g, x, y, w, h, "#FFF0B0", "#F6B05A", 3); vline(g, x + (w >> 1), y, h, "#C8844A"); hline(g, x, y + (h >> 1) - 1, w, "#D89458"); }
    else if (v < lit + 0.18) { vgrad(g, x, y + 4, w, h - 4, "#F8C4B4", "#7E7CCA", 2); for (let j = 0; j < 4; j++) hline(g, x, y + j, w, j & 1 ? Pl.shade : Pl.acc2); }
    else {
      vgrad(g, x, y, w, h, "#FFD8B8", "#6E70C4", 3);
      for (let k = 0; k < Math.min(w, h); k++) { const xx = x + 1 + k, yy = y + h - 3 - k * 1.3; if (yy >= y && xx < x + w) { g.px(xx, R(yy), "#FFF4EC"); if (xx + 1 < x + w) g.px(xx + 1, R(yy), "#FFE2D4"); } }
    }
  });
}

function neonText(A, g, text, x, y, colKey, scale = 1, vertical = false) {
  const id = SIGN_ID++;
  const col = NEON[colKey], core = NCORE[colKey];
  // glow on the wall behind first (keeps the wall's ids)
  const tw = vertical ? 5 * scale : A.g ? 0 : 0;
  A.with({ id, f: 0, kind: K_NEON, bp: 3 }, (g) => {
    if (!vertical) g.text(MAIN, text, x, y, (X, ch) => col, { scale, colorAt: (X, Y) => ((X + Y) % 3 === 0 ? core : col) });
    else [...text].forEach((ch, i) => g.text(MAIN, ch, x, y + i * (7 * scale + 2), col, { scale, colorAt: (X, Y) => ((X + Y) % 3 === 0 ? core : col) }));
  });
  return { id, col: colKey, tw };
}

function building(A, B) {
  const Pl = P[B.pal], g = A.g, x0 = B.x, x1 = B.x + B.w, top = BASE - B.h, GF = 26;
  A.pen = { id: B.id, f: 0, bp: 0, kind: K_WALL };
  // body with a soft top-light gradient, a sunlit left rim and a shaded right return
  vgrad(g, x0, top, B.w, B.h, Pl.light, Pl.base, 3);
  vgrad(g, x0, top + 30, B.w, B.h - 30, Pl.base, mix(Pl.base, Pl.shade, 0.55), 4);
  for (let y = top; y < BASE; y++) { g.px(x0, y, Pl.light); g.px(x0 + 1, y, mix(Pl.light, Pl.base, 0.5)); for (let i = 1; i <= 5; i++) g.px(x1 - i, y, i === 1 ? Pl.deep : mix(Pl.side, Pl.shade, i / 6)); }
  // rounded corners: streamline speed-lines wrapping the corner
  const corner = (cx0, dir) => { for (let i = 0; i < 9; i++) { const xx = cx0 + dir * i, k = Math.sin((i / 8) * Math.PI * 0.5); for (let y = top + 12; y < BASE - GF; y++) g.px(xx, y, mix(dir > 0 ? Pl.light : Pl.shade, Pl.base, k)); } };
  if (B.roundL) corner(x0, 1);
  if (B.roundR) corner(x1 - 6, -1);
  // storeys
  const nS = Math.max(1, Math.floor((B.h - GF - 14) / 22)), colsW = B.w - 18, nC = Math.max(1, Math.floor((colsW + 6) / 14)), wx0 = x0 + 9 + R((colsW - (nC * 14 - 6)) / 2);
  for (let s = 0; s < nS; s++) {
    const sy = BASE - GF - (s + 1) * 22;
    // storey ledge and art-deco eyebrows
    A.with({ f: 3 }, (g) => { hline(g, x0 + 2, sy + 21, B.w - 7, Pl.shade); hline(g, x0 + 2, sy + 20, B.w - 7, mix(Pl.base, Pl.light, 0.4)); });
    for (let c = 0; c < nC; c++) {
      const wx = wx0 + c * 14;
      A.with({ f: 4 }, (g) => { hline(g, wx - 2, sy + 4, 12, Pl.trim); hline(g, wx - 2, sy + 5, 12, Pl.deep); hline(g, wx - 1, sy + 6, 10, mix(Pl.base, Pl.deep, 0.35)); });
      windowAt(g, A, wx, sy + 8, 8, 10, Pl, B.id * 97 + s * 13 + c, s >= nS - 1 ? 0.12 : 0.22);
      if (B.balc && (c % 2 === (s % 2)) && s < nS - 0) {
        A.with({ f: 5, bp: 3 }, (g) => { hline(g, wx - 3, sy + 19, 14, Pl.trim); hline(g, wx - 3, sy + 20, 14, Pl.deep); for (let i = 0; i < 14; i += 2) vline(g, wx - 3 + i, sy + 14, 5, Pl.trim); hline(g, wx - 3, sy + 14, 14, Pl.trim); });
      }
    }
    // pilasters between window pairs (deco verticals)
    if (B.w > 90) for (let c = 1; c < nC; c += 2) { const px = wx0 + c * 14 - 4; A.with({ f: 6 }, (g) => { vline(g, px, sy, 20, Pl.light); vline(g, px + 1, sy, 20, mix(Pl.light, Pl.base, 0.5)); }); }
  }
  // crown / parapet
  const pTop = top;
  A.with({ f: 7 }, (g) => {
    hline(g, x0, pTop + 10, B.w, Pl.deep); hline(g, x0 + 1, pTop + 9, B.w - 2, Pl.trim);
    for (let i = 0; i < 3; i++) hline(g, x0 + 3, pTop + 3 + i * 2, B.w - 8, i === 1 ? Pl.acc : mix(Pl.light, Pl.base, 0.3));
  });
  if (B.crown === "step" || B.crown === "zig") {
    const cw = R(B.w * (B.crown === "zig" ? 0.5 : 0.36)), cx = R(x0 + B.w / 2), steps = B.crown === "zig" ? 4 : 2;
    for (let k = 0; k < steps; k++) {
      const ww = cw - k * R(cw / (steps + 1)), yy = pTop - (k + 1) * 6;
      vgrad(g, cx - (ww >> 1), yy, ww, 6, Pl.light, Pl.base, 2);
      g.rect(cx - (ww >> 1), yy, 1, 6, Pl.light); g.rect(cx + (ww >> 1) - 1, yy, 1, 6, Pl.deep); hline(g, cx - (ww >> 1), yy + 5, ww, Pl.shade);
      A.with({ f: 8 }, (g) => hline(g, cx - (ww >> 1) + 2, yy + 2, ww - 4, Pl.acc));
    }
    if (B.crown === "zig") { const yy = pTop - steps * 6 - 14; A.with({ f: 9, bp: 3 }, (g) => { vline(g, cx, yy, 14, Pl.deep); g.px(cx, yy - 1, "#FF4A4A"); g.px(cx, yy - 2, "#FFB0B0"); }); }
  }
  if (B.crown === "diner") {
    // roof sign board on legs: DINER in red neon
    const bw = 40, bx = R(x0 + B.w / 2 - bw / 2), by = top - 22;
    A.with({ f: 9, bp: 3 }, (g) => { vline(g, bx + 6, by + 14, 8, Pl.deep); vline(g, bx + bw - 7, by + 14, 8, Pl.deep); });
    A.with({ id: SIGN_ID++, bp: 3, kind: 0 }, (g) => { g.rrect(bx, by, bw, 15, "#2A1A3A", 1); g.rrect(bx + 1, by + 1, bw - 2, 13, "#3E2650", 1); hline(g, bx + 2, by + 2, bw - 4, "#5A3A70"); });
    neonText(A, g, "DINER", bx + 6, by + 4, "red");
  }
  // ground floor
  const gy = BASE - GF;
  A.with({ f: 10 }, (g) => { hline(g, x0 + 1, gy - 1, B.w - 2, Pl.deep); });
  if (B.ground === "shop" || B.ground === "diner") {
    const doorX = B.ground === "diner" ? x0 + 6 : x0 + B.w - 22;
    A.with({ f: 1, kind: K_GLASS }, (g) => {
      for (let wx = x0 + 4; wx < x1 - 8; wx += 22) { const ww = Math.min(18, x1 - 8 - wx); if (Math.abs(wx - doorX) < 18) continue; vgrad(g, wx, gy + 7, ww, 15, "#FFF0B4", "#F0A060", 3); hline(g, wx, gy + 13, ww, "#E09858"); vline(g, wx + (ww >> 1), gy + 7, 15, "#D88E50"); }
    });
    A.with({ f: 11 }, (g) => { g.rect(doorX, gy + 8, 10, 18, Pl.deep); g.rect(doorX + 1, gy + 9, 8, 17, "#4A2E48"); g.px(doorX + 7, gy + 17, Pl.acc2); });
    if (B.ground === "diner") { A.with({ f: 12 }, (g) => { for (let i = 0; i < 3; i++) hline(g, x0 + 2, gy + 1 + i * 2, B.w - 6, i === 1 ? "#FF7A9A" : Pl.acc); }); }
    else {
      // striped awning with a scalloped edge
      A.with({ f: 12, bp: 3 }, (g) => {
        for (let y = gy; y < gy + 7; y++) for (let x = x0 + 2; x < x1 - 4; x++) g.px(x, y, ((x - x0) >> 2) & 1 ? Pl.awn[1] : Pl.awn[0]);
        for (let x = x0 + 2; x < x1 - 4; x++) if (((x - x0) & 3) !== 3) g.px(x, gy + 7, ((x - x0) >> 2) & 1 ? Pl.awn[1] : Pl.awn[0]);
        hline(g, x0 + 2, gy, x1 - x0 - 6, mix(Pl.awn[0], "#FFFFFF", 0.4));
      });
      for (let x = x0 + 2; x < x1 - 4; x++) g.tintPx(x, gy + 8, "#3A1E40", 0.4);
    }
  } else {
    // lobby: glass doors, warm light, a canopy
    const dx = R(x0 + B.w / 2 - 14);
    A.with({ f: 1, kind: K_GLASS }, (g) => { vgrad(g, dx, gy + 8, 28, 18, "#FFF2C0", "#F2A862", 3); for (let i = 0; i < 4; i++) vline(g, dx + i * 7, gy + 8, 18, "#C88A50"); });
    A.with({ f: 1, kind: K_GLASS }, (g) => { for (const wx of [x0 + 6, x1 - 22]) { if (wx + 14 > dx && wx < dx + 28) continue; vgrad(g, wx, gy + 9, 14, 12, "#FFE6A8", "#E89A5E", 2); } });
    A.with({ f: 12, bp: 3 }, (g) => { g.rect(dx - 6, gy + 2, 40, 4, Pl.trim); hline(g, dx - 6, gy + 6, 40, Pl.deep); hline(g, dx - 6, gy + 1, 40, Pl.acc); });
    if (B.marquee) A.with({ f: 12, kind: K_LAMP, bp: 3 }, (g) => { for (let i = 0; i < 40; i += 3) g.px(dx - 6 + i, gy + 3, "#FFF4B0"); });
  }
  // signs
  if (B.sign) {
    const s = B.sign, tw = s.text.length * 6 - 1;
    if (s.top) { const bx = R(x0 + B.w / 2 - tw / 2); neonText(A, g, s.text, bx, top - 9, s.col); A.with({ f: 13, bp: 3 }, (g) => { vline(g, bx + 2, top - 2, 2, Pl.deep); vline(g, bx + tw - 3, top - 2, 2, Pl.deep); }); }
    else { const bx = R(x0 + B.w / 2 - tw / 2) - 2, by = gy - 14; A.with({ id: SIGN_ID++, bp: 3, kind: 0 }, (g) => g.rrect(bx - 3, by - 2, tw + 6, 11, "#2A1A34", 1)); neonText(A, g, s.text, bx, by, s.col); }
  }
  if (B.fin) {
    const f = B.fin, n = f.text.length, fh = n * 9 + 6, fx = R(x0 + B.w * f.at) - 6, fy = top - 22;
    A.with({ id: SIGN_ID++, bp: 3, kind: 0 }, (g) => { g.rect(fx, fy, 13, fh, Pl.trim); g.rect(fx + 1, fy + 1, 11, fh - 2, "#2E1E3E"); g.rect(fx + 12, fy + 1, 1, fh - 1, Pl.deep); hline(g, fx, fy, 13, Pl.light); g.rect(fx + 3, fy - 4, 7, 4, Pl.trim); g.rect(fx + 5, fy - 9, 3, 5, Pl.trim); });
    neonText(A, g, f.text, fx + 4, fy + 4, f.col, 1, true);
  }
  if (B.roofNeon) A.with({ id: SIGN_ID++, kind: K_NEON, bp: 3 }, (g) => hline(g, x0 + 2, pTop + 1, B.w - 7, NEON[B.roofNeon]));
  if (B.boards) {
    // surfboards leaning by the door
    const cols = [["#FFD84A", "#C89A1A"], ["#FF7AAE", "#C04A7A"], ["#5AD8F0", "#2A8AB0"]];
    cols.forEach(([a, b], i) => A.with({ id: 300 + i, bp: 3, kind: K_WALL }, (g) => {
      const bx = x0 + 6 + i * 7, by = BASE - 30;
      for (let j = 0; j < 30; j++) { const half = j < 3 ? 1 : j > 26 ? 1 : 2; for (let k = -half; k <= half; k++) g.px(bx + k + R(j * 0.12), by + j, k === -half ? mix(a, "#FFFFFF", 0.4) : k === half ? b : a); }
      vline(g, bx + 3, by + 3, 24, b);
    }));
  }
}

// ---------------------------------------------------------------- palms
function palmTrunk(A, x, base, h, lean, w0 = 3, w1 = 2, id) {
  const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([x + lean * u * u, base - h * u]); }
  A.with({ id, bp: 3, kind: K_PLANT, f: 0 }, (g) => {
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1], r = lerp(w0, w1, i / 24);
      for (let y = R(by); y <= R(ay); y++) { const u = (y - by) / Math.max(1, ay - by), cx = lerp(bx, ax, u); for (let xx = R(cx - r); xx <= R(cx + r); xx++) { const ring = ((base - y) % 5) < 1; const side = (xx - (cx - r)) / (2 * r); g.px(xx, y, xx === R(cx - r) ? "#3A2018" : xx === R(cx + r) ? "#2A1612" : ring ? "#6A4030" : side < 0.4 ? "#C89068" : "#9A6A4A"); } }
    }
  });
  return pts[pts.length - 1];
}
/** Palm crown (fronds + coconuts) at (cx, cy), size s (frond length), sway angle a. Painted on an Art. */
export function paintCrown(A, cx, cy, s, a, id, seed = 0) {
  const g = A.g, N = 9;
  A.with({ id, bp: 3, kind: K_PLANT, f: 0 }, () => {
    const fronds = [];
    for (let i = 0; i < N; i++) {
      const base = -Math.PI / 2 + ((i - (N - 1) / 2) / ((N - 1) / 2)) * 2.25 + (rnd(seed * 31 + i) - 0.5) * 0.25, ang = base + a * (0.6 + 0.8 * Math.abs(Math.cos(base)));
      const len = s * (0.82 + rnd(seed * 17 + i) * 0.3) * (Math.abs(Math.sin(base)) > 0.85 ? 0.8 : 1), droop = s * 0.55 * Math.abs(Math.cos(base)) + s * 0.08;
      const p0 = [cx, cy], p2 = [cx + Math.cos(ang) * len, cy + Math.sin(ang) * len * 0.75 + droop], p1 = [cx + Math.cos(ang) * len * 0.55, cy + Math.sin(ang) * len * 0.55 - s * 0.12];
      fronds.push({ p0, p1, p2, back: Math.sin(base) < -0.6 });
    }
    // back fronds first (darker), then front
    for (const pass of [true, false]) for (const F of fronds) {
      if (F.back !== pass) continue; const n = Math.ceil(s * 1.2), dark = pass ? "#1E5A3E" : "#2E7A48", mid = pass ? "#3A8A4E" : "#56A85A", light = pass ? "#6AAE5E" : "#9AD06A";
      for (let k = 0; k <= n; k++) {
        const u = k / n, uu = 1 - u, x = uu * uu * F.p0[0] + 2 * uu * u * F.p1[0] + u * u * F.p2[0], y = uu * uu * F.p0[1] + 2 * uu * u * F.p1[1] + u * u * F.p2[1];
        const tx = 2 * uu * (F.p1[0] - F.p0[0]) + 2 * u * (F.p2[0] - F.p1[0]), ty = 2 * uu * (F.p1[1] - F.p0[1]) + 2 * u * (F.p2[1] - F.p1[1]), tl = Math.hypot(tx, ty) || 1;
        const nx = -ty / tl, ny = tx / tl, leaf = (1 - u) * s * 0.22 + 1.5;
        // leaflets hang down from the rib on both sides
        for (const sgn of [1, -1]) { const lx = nx * sgn, ly = ny * sgn + 0.9; const ll = Math.hypot(lx, ly) || 1; for (let j = 1; j <= leaf; j++) { const px = R(x + (lx / ll) * j), py = R(y + (ly / ll) * j); g.px(px, py, j > leaf - 1.5 ? dark : (k + j) % 3 === 0 ? light : mid); } }
        g.px(R(x), R(y), light);
      }
    }
    // coconuts
    for (const [dx, dy] of [[-2, 2], [2, 3], [0, 5]]) { g.disc(R(cx + dx), R(cy + dy), 2, "#5A3A1E"); g.px(R(cx + dx) - 1, R(cy + dy) - 1, "#9A6A3A"); }
  });
}

// ---------------------------------------------------------------- FAR: the bay and the skyline (layer x = REST screen x)
export function paintFar() {
  const A = new Art(600, 270, 0, 290), g = A.g;
  // water (sunset reflections) from the far shore down under the beach strip
  A.with({ id: 2, bp: 1, kind: K_WATER, f: 0 }, () => {
    for (let y = 487; y < 560; y++) { const u = (y - 487) / 40; for (let x = 0; x < 600; x++) { const band = u < 0.15 ? mix("#FFC0A0", "#F49AAE", u / 0.15) : mix("#F49AAE", "#8E70C0", Math.min(1, (u - 0.15) / 0.85)); const streak = Math.sin(x * 0.07 + y * 1.7) * 0.5 + 0.5 > 0.82 && rnd(x * 7 + y * 131) > 0.55; g.px(x, y, streak ? mix(band, "#FFE6D8", 0.45) : band); } }
    for (let i = 0; i < 46; i++) { const x = R(rnd(i * 3) * 600), y = R(492 + rnd(i * 5 + 1) * 26), l = 3 + R(rnd(i * 7) * 6); hline(g, x, y, l, "#FFE2D2"); }
  });
  // far shore line with tiny trees
  A.with({ id: 3, bp: 1, kind: K_WALL, f: 0 }, () => { for (let x = 0; x < 600; x++) { g.px(x, 486, "#9A5A86"); g.px(x, 485, "#B0709A"); if (rnd(x * 13) > 0.7) { g.px(x, 484, "#7A4A7E"); if (rnd(x * 17) > 0.6) g.px(x, 483, "#7A4A7E"); } } });
  // skyline: back row (hazier) then front row; backlit by the sun at x 270 (rim light on the side facing it)
  const towers = [];
  const add = (x, w, h, row, top) => towers.push({ x, w, h, row, top });
  // back row
  [[8, 26, 92], [40, 20, 70], [70, 30, 118], [110, 22, 84], [150, 24, 60], [196, 18, 40], [232, 26, 34], [300, 22, 38], [372, 26, 100], [404, 22, 136], [436, 30, 112], [474, 20, 150], [500, 28, 96], [536, 26, 128], [570, 24, 88]].forEach(([x, w, h], i) => add(x, w, h, 0, ["flat", "step", "spire", "dome", "flat"][i % 5]));
  // front row
  [[0, 22, 66], [26, 30, 84], [58, 18, 52], [90, 26, 74], [124, 34, 56], [166, 20, 38], [212, 30, 26], [260, 24, 22], [286, 30, 30], [378, 24, 70], [410, 34, 88], [452, 26, 64], [486, 30, 110], [522, 22, 76], [552, 34, 92]].forEach(([x, w, h], i) => add(x, w, h, 1, ["step", "flat", "antenna", "flat", "slant"][i % 5]));
  towers.forEach((T, i) => {
    const base = 486, top = base - T.h, hazy = T.row === 0;
    const body = hazy ? "#D49AB4" : "#A86A9C", dark = hazy ? "#BC86A8" : "#8A5288", rim = hazy ? "#F4C4C8" : "#E8A8B8";
    const lit = (T.x + T.w / 2) < 270 ? "right" : "left";
    A.with({ id: 20 + i, bp: 1, kind: K_WALL, f: 0 }, () => {
      for (let y = top; y < base; y++) { const u = (y - top) / T.h; for (let x = T.x; x < T.x + T.w; x++) g.px(x, y, mix(body, mix(body, "#FFC0A8", hazy ? 0.5 : 0.3), u * u > bayer(x, y) ? 1 : 0)); }
      for (let y = top; y < base; y++) { g.px(lit === "right" ? T.x + T.w - 1 : T.x, y, rim); g.px(lit === "right" ? T.x : T.x + T.w - 1, y, dark); }
      if (T.top === "step") { g.rect(T.x + 3, top - 5, T.w - 6, 5, body); g.rect(T.x + 7, top - 9, T.w - 14, 4, body); }
      if (T.top === "spire") { g.rect(T.x + R(T.w / 2) - 2, top - 8, 4, 8, body); vline(g, T.x + R(T.w / 2), top - 18, 10, dark); }
      if (T.top === "dome") for (let k = 0; k < 6; k++) hline(g, T.x + 2 + k, top - 1 - k, T.w - 4 - 2 * k, body);
      if (T.top === "antenna") { vline(g, T.x + 6, top - 14, 14, dark); }
      if (T.top === "slant") for (let k = 0; k < 8; k++) hline(g, T.x, top - k, T.w - k * 3, body);
    });
    // faint window rows (front row: some warm lit dots)
    A.with({ id: 20 + i, bp: 1, kind: K_GLASS, f: 1 }, () => {
      for (let y = top + 4; y < base - 3; y += 5) for (let x = T.x + 3; x < T.x + T.w - 3; x += 4) { const r = rnd(x * 31 + y * 7 + i); if (hazy ? r > 0.86 : r > 0.62) g.px(x, y, hazy ? "#F0C0C4" : r > 0.88 ? "#FFE49A" : "#C890B0"); }
    });
    if (T.top === "antenna" || T.top === "spire") towers[i].beacon = [T.x + (T.top === "spire" ? R(T.w / 2) : 6), top - (T.top === "spire" ? 19 : 15)];
  });
  // sailboats far on the bay
  [[120, 500], [452, 508]].forEach(([x, y], i) => A.with({ id: 60 + i, bp: 1, kind: K_WALL }, () => { g.poly([[x, y], [x + 7, y], [x + 3, y - 12]], "#FFF4EC"); hline(g, x - 2, y + 1, 12, "#6A4A7A"); hline(g, x - 1, y + 2, 10, "#6A4A7A"); }));
  bakeBlue(A, 12);
  A.beacons = towers.filter((T) => T.beacon).map((T) => T.beacon);
  return A;
}

// ---------------------------------------------------------------- STREET (world x, REST sy)
export function paintStreet() {
  const A = new Art(1080, 700, 0, 280), g = A.g;
  // far beach strip behind the row (visible in the gap) with a far lifeguard hut and a flag
  A.with({ id: 4, bp: 2, kind: K_GROUND, f: 0 }, () => {
    for (let y = 516; y < 548; y++) for (let x = 0; x < 1080; x++) g.px(x, y, y < 518 ? "#FFE8C8" : mix("#F6CC98", "#E8A880", (y - 518) / 30 > bayer(x, y) ? 1 : 0));
    for (let x = 0; x < 1080; x++) if (rnd(x * 3) > 0.7) g.px(x, 522 + R(rnd(x) * 18), "#E0A47E");
  });
  A.with({ id: 5, bp: 3, kind: K_WALL }, () => {
    const hx = 520; g.rect(hx, 506, 18, 8, "#FF9AC0"); g.rect(hx, 506, 18, 2, "#FFD0E0"); g.rect(hx - 2, 503, 22, 3, "#5AC8D0"); for (const lx of [hx + 2, hx + 14]) vline(g, lx, 514, 8, "#8A5A6A"); g.rect(hx + 5, 508, 4, 4, "#3A2A4A");
    vline(g, 494, 498, 22, "#6A4A5A"); g.rect(495, 498, 7, 5, "#FF5A6A"); g.rect(495, 500, 7, 1, "#FFE08A");
  });
  // the low balustrade along the beach access (visible in the gap)
  A.with({ id: 6, bp: 3, kind: K_WALL, f: 0 }, () => {
    for (let x = 0; x < 1080; x++) { hline(g, x, 538, 1, "#FFF6EC"); g.px(x, 539, "#E8D2C8"); g.px(x, 554, "#B898A8"); g.px(x, 555, "#9A7A90"); }
    A.with({ f: 1 }, () => { for (let x = 0; x < 1080; x += 6) for (let y = 540; y < 554; y++) { const r = Math.abs(y - 547) < 3 ? 2 : 1; for (let k = -r; k <= r; k++) g.px(x + 3 + k, y, k === -r ? "#FFF2E8" : k === r ? "#C8A8B8" : "#F0DED4"); } });
  });
  // lamps (art deco globes) on the far sidewalk
  LAMPS.forEach((lx, i) => A.with({ id: 40 + i, bp: 3, kind: K_WALL, f: 0 }, () => {
    const top = BASE - 78; vline(g, lx, top + 6, 78, "#2E3A54"); vline(g, lx + 1, top + 6, 78, "#4A5A7A"); g.rect(lx - 2, BASE - 6, 6, 6, "#2E3A54"); g.rect(lx - 3, top + 4, 8, 2, "#2E3A54");
  }));
  // buildings
  for (const B of BUILDINGS) building(A, B);
  // lamp globes over everything at their height (front of the facades)
  LAMPS.forEach((lx, i) => { const top = BASE - 78; A.with({ id: 40 + i, bp: 3, kind: K_LAMP, f: 1 }, () => { g.disc(lx, top, 3, "#FFF0B8"); g.px(lx - 1, top - 1, "#FFFFFF"); }); glowAt(g, lx, top, 12, 10, "#FFE8A8", 0.9); });
  // back-sidewalk palm trunks
  BACK_PALMS.forEach((p, i) => { p.top = palmTrunk(A, p.x, BASE + 6, p.h, p.lean, 3, 2, 50 + i); });
  // golden-hour grade on the facades: warm tops, violet street shadow at the base
  for (let y = 300; y < BASE; y++) for (let x = 0; x < 1080; x++) {
    const k = g.kindAt(x, y); if (k !== K_WALL && k !== K_GLASS) continue;
    if (y > BASE - 46) g.tintPx(x, y, "#5A3A8A", ((y - (BASE - 46)) / 46) * 0.32 > bayer(x, y) * 0.4 ? 0.22 : 0);
    else if (k === K_WALL && y < 420) g.tintPx(x, y, "#FFB070", (420 - y) / 120 * 0.18);
  }
  // neon glows on the walls (baked halo; the tubes themselves are live)
  for (let y = 280; y < BASE; y++) for (let x = 0; x < 1080; x++) if (g.kindAt(x, y) === K_NEON) {
    const i = (y - 280) * 1080 + x, c = [A.col[i * 3], A.col[i * 3 + 1], A.col[i * 3 + 2]];
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const d2 = dx * dx + dy * dy; if (d2 === 0 || d2 > 10) continue; const kk = g.kindAt(x + dx, y + dy); if (kk === K_WALL || kk === K_GLASS) if ((1 - d2 / 11) * 0.7 > bayer(x + dx, y + dy)) g.tintPx(x + dx, y + dy, c, 0.28); }
  }
  // far sidewalk: pale pavers, contact shadow under the row
  A.with({ id: 7, bp: 2, kind: K_GROUND, f: 0 }, () => {
    for (let y = WALK_B[0]; y < WALK_B[1]; y++) for (let x = 0; x < 1080; x++) { const tile = ((x + (y > 563 ? 9 : 0)) % 18 === 0) || y === 563; g.px(x, y, y < 559 ? "#B88AA0" : tile ? "#D8B4B8" : (y < 563 ? "#F6DCD4" : "#EED0CC")); }
  });
  A.with({ id: 7, bp: 2, kind: K_GROUND, f: 1 }, () => { for (let x = 0; x < 1080; x += 18) for (let y = 559; y < 572; y++) if (y === 559) g.px(x, y, "#C8A0AC"); });
  // kerb + road
  A.with({ id: 8, bp: 2, kind: K_GROUND }, () => { for (let x = 0; x < 1080; x++) { g.px(x, 572, "#FFF0EC"); g.px(x, 573, "#E4CCD0"); g.px(x, 574, "#8E7290"); g.px(x, 575, "#6A5276"); } });
  A.with({ id: 9, bp: 2, kind: K_GROUND, f: 0 }, () => {
    for (let y = 576; y < 628; y++) { const u = (y - 576) / 52; for (let x = 0; x < 1080; x++) { let c = mix("#5E4C6E", "#4A3C5C", u); const sheen = Math.sin(x * 0.045 + y * 0.9) > 0.6 && rnd(x * 5 + y * 77) > 0.62; if (sheen) c = mix(c, "#B07A98", 0.35); if (rnd(x * 13 + y * 7) > 0.93) c = mix(c, "#2E2438", 0.4); g.px(x, y, c); } }
    // a soft sunset reflection band on the asphalt
    for (let y = 580; y < 590; y++) for (let x = 0; x < 1080; x++) if (rnd(x * 3 + y * 19) > 0.8) g.px(x, y, "#7A5E86");
  });
  A.with({ id: 9, bp: 2, kind: K_GROUND, f: 1 }, () => { for (let x = 0; x < 1080; x++) { if (x % 28 < 16) { g.px(x, 601, "#F4CA50"); g.px(x, 602, "#C89A3A"); } g.px(x, 579, "#D8C8D8"); g.px(x, 624, "#D8C8D8"); } });
  // front kerb + promenade (pastel pavers, rows widen toward the viewer)
  A.with({ id: 30, bp: 2, kind: K_GROUND }, () => { for (let x = 0; x < 1080; x++) { g.px(x, 628, "#8E7290"); g.px(x, 629, "#FFF4F0"); g.px(x, 630, "#F0DAD8"); g.px(x, 631, "#D8BCC4"); } });
  const rows = [632, 640, 649, 660, 673, 688, 700];
  for (let r = 0; r < rows.length - 1; r++) {
    const y0 = rows[r], y1 = rows[r + 1], tw = 22 + r * 4, off = (r % 2) * (tw >> 1);
    for (let y = y0; y < y1; y++) for (let x = 0; x < 1080; x++) {
      const ti = Math.floor((x + off) / tw), edgeX = (x + off) % tw === 0, edgeY = y === y0;
      A.pen = { id: 31, bp: 2, kind: K_GROUND, f: 1 + ((ti + r) & 1) };
      const base = (ti + r) % 3 === 0 ? "#F8C8D0" : (ti + r) % 3 === 1 ? "#FCE6D8" : "#C8EEE2";
      g.px(x, y, edgeX || edgeY ? "#D4AEB8" : y === y0 + 1 ? mix(base, "#FFFFFF", 0.35) : base);
    }
  }
  A.pen = { id: 1, f: 0, bp: 0, kind: K_WALL };
  // long golden-hour shadows of the back palms / lamps across the road and promenade
  // props on the promenade (low; away from the hero at world 540)
  bench(A, 372, 694); hydrant(A, 662, 690); planter(A, 470, 698, 0); planter(A, 618, 698, 1); paperBox(A, 776, 692); trashCan(A, 846, 694); planter(A, 300, 698, 2); bench(A, 930, 694);
  bakeBlue(A, 12);
  return A;
}
function bench(A, x, base) { A.with({ id: 70 + (x & 15), bp: 3, kind: K_WALL }, (g) => { g.rect(x, base - 10, 30, 3, "#6ACAD8"); g.rect(x, base - 10, 30, 1, "#B8F0F8"); g.rect(x, base - 16, 30, 3, "#6ACAD8"); g.rect(x, base - 16, 30, 1, "#B8F0F8"); for (const lx of [x + 2, x + 26]) { vline(g, lx, base - 16, 16, "#2E3A54"); vline(g, lx + 1, base - 7, 7, "#2E3A54"); } hline(g, x - 1, base, 34, "#B898A8"); }); }
function hydrant(A, x, base) { A.with({ id: 90, bp: 3, kind: K_WALL }, (g) => { g.rect(x - 4, base - 14, 9, 14, "#E8404A"); g.rect(x - 4, base - 14, 2, 14, "#FF8A8A"); g.rect(x + 3, base - 14, 2, 14, "#9A1A2A"); g.rect(x - 6, base - 10, 13, 3, "#C8303A"); g.rect(x - 3, base - 18, 7, 4, "#E8404A"); g.px(x, base - 19, "#FFD0D0"); hline(g, x - 5, base, 11, "#9A7A8A"); }); }
function planter(A, x, base, k) {
  A.with({ id: 91 + k, bp: 3, kind: K_WALL }, (g) => { for (let j = 0; j < 12; j++) { const half = 11 - (j >> 2); hline(g, x - half, base - 12 + j, half * 2, j < 2 ? "#FFF0E8" : j < 5 ? "#F2A8C0" : "#D2789E"); } });
  A.with({ id: 94 + k, bp: 3, kind: K_PLANT }, (g) => { for (let i = 0; i < 26; i++) { const a = -Math.PI + (i / 25) * Math.PI, L = 7 + rnd(i * 9 + k) * 6; thick(g, [[x, base - 12], [x + Math.cos(a) * L, base - 12 + Math.sin(a) * L * 0.9]], 0.6, i % 3 ? "#4EA05A" : "#2E7A48"); } for (let i = 0; i < 5; i++) { const fx = x - 8 + R(rnd(i + k * 7) * 16), fy = base - 18 + R(rnd(i * 3 + k) * 6); g.px(fx, fy, "#FF5A8A"); g.px(fx + 1, fy, "#FFB0C8"); } });
}
function paperBox(A, x, base) { A.with({ id: 97, bp: 3, kind: K_WALL }, (g) => { g.rect(x, base - 16, 12, 12, "#3E9AD8"); g.rect(x, base - 16, 12, 2, "#9AD8FF"); g.rect(x + 2, base - 12, 8, 4, "#E8F4FF"); vline(g, x + 1, base - 4, 4, "#2E3A54"); vline(g, x + 10, base - 4, 4, "#2E3A54"); }); }
function trashCan(A, x, base) { A.with({ id: 98, bp: 3, kind: K_WALL }, (g) => { g.rect(x, base - 14, 10, 14, "#5AB4A0"); g.rect(x, base - 14, 2, 14, "#9AE4D0"); g.rect(x - 1, base - 16, 12, 2, "#2E7A6A"); for (let i = 3; i < 10; i += 3) vline(g, x + i, base - 12, 10, "#3E8A7A"); }); }

// ---------------------------------------------------------------- FORE: promenade wall + beach park (layer x = REST screen x, parallax 1.25)
export function paintFore() {
  const A = new Art(760, 290, 0, 696), g = A.g;
  // the promenade edge: cream coping, mint wall with deco grooves
  A.with({ id: 100, bp: 4, kind: K_WALL }, () => { for (let x = 0; x < 760; x++) { g.px(x, 696, "#D4AEB8"); g.px(x, 697, "#FFF6EE"); g.px(x, 698, "#FFF0E4"); g.px(x, 699, "#E6CFC6"); g.px(x, 700, "#B898A8"); for (let y = 701; y < 716; y++) g.px(x, y, (x % 10 === 0) ? "#5AB4A4" : (x % 10 === 1) ? "#C8F4E8" : y > 712 ? "#6CC4B2" : "#8ADCC8"); } });
  A.with({ id: 100, bp: 4, kind: K_WALL, f: 1 }, () => { for (let x = 4; x < 760; x += 40) { g.rect(x, 704, 10, 6, "#FF9AC0"); g.rect(x + 1, 705, 8, 4, "#FFC8DA"); } });
  // grass strip with hibiscus bushes and sea grapes
  A.with({ id: 101, bp: 4, kind: K_PLANT }, () => {
    for (let y = 716; y < 744; y++) for (let x = 0; x < 760; x++) { const u = (y - 716) / 28; g.px(x, y, rnd(x * 7 + y * 3) > 0.7 ? "#3E9A54" : mix("#5AB862", "#4AA058", u)); }
    for (let x = 0; x < 760; x++) if (rnd(x * 11) > 0.45) { const hh = 2 + R(rnd(x * 5) * 4); vline(g, x, 716 - hh, hh, rnd(x) > 0.5 ? "#6ACA6A" : "#3E9A54"); }
  });
  for (let i = 0; i < 9; i++) { const bx = 30 + i * 84 + R(rnd(i * 13) * 30), by = 724; A.with({ id: 110 + i, bp: 4, kind: K_PLANT }, () => { for (let k = 0; k < 40; k++) { const a = -Math.PI + rnd(k * 7 + i) * Math.PI, L = 6 + rnd(k * 3 + i) * 10; g.disc(R(bx + Math.cos(a) * L), R(by + Math.sin(a) * L * 0.7), 2, k % 3 ? "#3E8A4A" : "#5AAE5A"); } for (let k = 0; k < 6; k++) { const fx = bx - 10 + R(rnd(k * 5 + i) * 20), fy = by - 12 + R(rnd(k * 9 + i) * 10); g.px(fx, fy, "#FF4A7A"); g.px(fx + 1, fy, "#FF8AA8"); g.px(fx, fy - 1, "#FF8AA8"); g.px(fx + 1, fy + 1, "#FFE08A"); } }); }
  // sand with ripples, footprints and shells
  A.with({ id: 102, bp: 4, kind: K_GROUND }, () => {
    for (let y = 744; y < 986; y++) for (let x = 0; x < 760; x++) { const u = (y - 744) / 240; let c = mix("#F8D2A0", "#F2BC88", u); const rip = Math.sin(x * 0.05 + y * 0.42 + Math.sin(x * 0.013) * 3); if (rip > 0.86) c = mix(c, "#FFE8C4", 0.6); else if (rip < -0.9) c = mix(c, "#D89A70", 0.5); g.px(x, y, c); }
    for (let i = 0; i < 26; i++) { const x = 300 + i * 9 + R(Math.sin(i) * 4), y = 760 + i * 8; g.px(x, y, "#D8986E"); g.px(x + 1, y, "#D8986E"); g.px(x + 3, y + 3, "#D8986E"); }
    for (let i = 0; i < 14; i++) { const x = R(rnd(i * 41) * 740), y = R(780 + rnd(i * 43) * 190); g.px(x, y, "#FFF4F0"); g.px(x + 1, y, "#F4B8C8"); }
  });
  // long sunset shadows of the foreground palms on the sand
  for (const [bx, by, dir] of [[40, 952, 1], [512, 912, -1]]) {
    for (let i = 0; i < 150; i++) { const x = bx + dir * i * 1.7, y = by - i * 0.42, hw = 5 - i / 60; for (let k = -6; k <= 6; k++) for (let j = -2; j <= 2; j++) { const q = Math.abs(k) / hw; if (q < 1 && (1 - q) * 0.9 > bayer(R(x + k), R(y + j))) g.tintPx(R(x + k), R(y + j), "#C08A90", 0.3); } }
    const ex = bx + dir * 270, ey = by - 66; for (let j = -16; j <= 16; j++) for (let k = -46; k <= 46; k++) { const q = (k / 46) ** 2 + (j / 16) ** 2 + 0.25 * Math.sin(Math.atan2(j, k) * 9) ** 2; if (q < 1 && (1 - q) * 1.2 > bayer(R(ex + k), R(ey + j))) g.tintPx(R(ex + k), R(ey + j), "#C08A90", 0.3); }
  }
  // lifeguard hut (pastel, iconic) bottom left
  A.with({ id: 120, bp: 4, kind: K_WALL }, () => {
    const x = 74, y = 832; for (const lx of [x + 6, x + 46, x + 26]) { vline(g, lx, y + 30, 64, "#8A5A6A"); vline(g, lx + 1, y + 30, 64, "#B88A90"); }
    thick(g, [[x + 6, y + 50], [x + 46, y + 80]], 0.6, "#8A5A6A"); thick(g, [[x + 46, y + 50], [x + 6, y + 80]], 0.6, "#8A5A6A");
    g.rect(x - 4, y + 28, 62, 4, "#FFF0E8"); g.rect(x - 4, y + 31, 62, 1, "#B898A8");
    for (let j = 0; j < 22; j++) hline(g, x + 2, y + 6 + j, 48, j % 6 < 3 ? "#FF8AB8" : "#FFD4E4");
    vline(g, x + 2, y + 6, 22, "#FFE8F0"); vline(g, x + 49, y + 6, 22, "#C05A8A");
    g.rect(x + 14, y + 10, 20, 10, "#5ACAD8"); g.rect(x + 15, y + 11, 18, 8, "#2E6A8A"); hline(g, x + 15, y + 11, 18, "#9AE8F0");
    g.poly([[x - 6, y + 7], [x + 26, y - 12], [x + 58, y + 7]], "#5ACAC0"); hline(g, x - 6, y + 6, 64, "#2E8A8A"); thick(g, [[x - 4, y + 5], [x + 26, y - 11]], 0.5, "#B8F4EC");
    vline(g, x + 26, y - 26, 14, "#6A4A5A"); g.rect(x + 27, y - 26, 10, 6, "#FF5A6A"); g.rect(x + 27, y - 24, 10, 2, "#FFE08A");
  });
  // beach sets: striped umbrellas with towels and a lounger, a surfboard, a ball, a sandcastle, shells and a starfish
  umbrella(A, 404, 846, 34, ["#FF6A9A", "#FFF6EC"], 121); towel(A, 352, 884, "#5AC8E8", "#FFF4D8", 123);
  lounger(A, 432, 876, 124); umbrella(A, 250, 900, 26, ["#3EC8B8", "#FFFDF4"], 125); towel(A, 214, 930, "#FFB04A", "#FFF0D0", 126);
  A.with({ id: 122, bp: 4, kind: K_WALL }, () => { const sx = 488, sy = 806; for (let j = 0; j < 70; j++) { const half = j < 6 ? R(j * 0.8) + 1 : j > 62 ? 2 : 5; for (let k = -half; k <= half; k++) g.px(sx + k + R(j * 0.1), sy + j, k === -half ? "#FFF4B0" : k === half ? "#C8902A" : (Math.abs(k) < 1 ? "#FF7AAE" : "#FFD84A")); } });
  A.with({ id: 127, bp: 4, kind: K_WALL }, () => { const bx = 372, by = 944, r = 7; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = x * x + y * y; if (d > r * r) continue; const a = Math.atan2(y, x), seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 6) % 3; g.px(bx + x, by + y, d > (r - 1) * (r - 1) ? "#6A3A4A" : seg === 0 ? "#FF4A5A" : seg === 1 ? "#FFFFFF" : "#3E9AE8"); } g.px(bx - 3, by - 3, "#FFFFFF"); g.px(bx - 2, by - 4, "#FFFFFF"); });
  A.with({ id: 128, bp: 4, kind: K_WALL }, () => { const cx = 300, by = 952; g.rect(cx - 16, by - 10, 32, 10, "#E8B07A"); g.rect(cx - 16, by - 10, 32, 2, "#FFD8A8"); for (const tx of [cx - 12, cx + 6]) { g.rect(tx, by - 22, 8, 12, "#E8B07A"); g.rect(tx, by - 22, 2, 12, "#FFD8A8"); for (let k = 0; k < 8; k += 2) g.px(tx + k, by - 23, "#E8B07A"); } g.rect(cx - 4, by - 16, 8, 6, "#D89A66"); vline(g, cx + 10, by - 34, 12, "#6A4A5A"); g.rect(cx + 11, by - 34, 6, 4, "#FF5A8A"); g.rect(cx - 3, by - 6, 6, 6, "#9A6A4A"); });
  A.with({ id: 129, bp: 4, kind: K_WALL }, () => { const sx = 150, sy = 952; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 5; thick(g, [[sx, sy], [sx + Math.cos(a) * 6, sy + Math.sin(a) * 5]], 1, "#FF8A5A"); } g.px(sx, sy, "#FFC8A0"); });
  for (let i = 0; i < 10; i++) { const x = 40 + R(rnd(i * 41 + 3) * 680), y = 790 + R(rnd(i * 43 + 5) * 170); A.with({ id: 130 + i, bp: 4, kind: K_WALL }, () => { g.px(x, y, "#FFF4F0"); g.px(x + 1, y, "#F4B8C8"); g.px(x, y - 1, "#FFE0E8"); g.px(x + 1, y + 1, "#D88AA0"); }); }
  bakeBlue(A, 12);
  return A;
}


function umbrella(A, ux, uy, r, cols, id) {
  const g = A.g;
  A.with({ id, bp: 4, kind: K_WALL }, () => {
    vline(g, ux, uy - 34, 70, "#F4ECE4"); vline(g, ux + 1, uy - 34, 70, "#A898A0");
    const top = uy - 34 - R(r * 0.42);
    for (let k = -r; k <= r; k++) {
      const u = k / r, yTop = top + R(r * 0.42 * (u * u)), yBot = uy - 34 + R(Math.abs(u) * 3) - (((k + r) % 8) < 2 ? 0 : 1) + 2;
      const seg = Math.floor((Math.atan2(k, r * 0.6) + Math.PI / 2) / (Math.PI / 7)) & 1;
      for (let y = yTop; y <= yBot; y++) { let c = seg ? cols[1] : cols[0]; if (y === yTop) c = mix(c, "#FFFFFF", 0.45); else if (y >= yBot - 1) c = mix(c, "#6A3A5A", 0.35); else if (u > 0.45) c = mix(c, "#8A4A7A", 0.18); g.px(ux + k, y, c); }
    }
    g.px(ux, top - 1, "#F4ECE4"); g.px(ux, top - 2, "#F4ECE4");
  });
  for (let j = -4; j <= 4; j++) for (let k = -r - 8; k <= r - 8; k++) { const q = (k / r) ** 2 + (j / 4.5) ** 2; if (q < 1 && (1 - q) > bayer(ux - 10 + k, uy + 34 + j) * 0.8) g.tintPx(ux - 10 + k, uy + 34 + j, "#B07A80", 0.32); }
}
function towel(A, x, y, a, b, id) { A.with({ id, bp: 4, kind: K_WALL }, (g) => { g.poly([[x, y], [x + 54, y], [x + 64, y + 14], [x + 10, y + 14]], a); for (let k = 0; k < 4; k++) thick(g, [[x + 6 + k * 14, y], [x + 16 + k * 14, y + 14]], 0.6, b); hline(g, x + 10, y + 14, 55, mix(a, "#2A3050", 0.4)); }); }
function lounger(A, x, y, id) { A.with({ id, bp: 4, kind: K_WALL }, (g) => { for (let k = 0; k < 40; k++) { const yy = y - (k > 28 ? R((k - 28) * 1.1) : 0); g.px(x + k, yy, "#FFFFFF"); g.px(x + k, yy + 1, k & 2 ? "#5AC8E8" : "#FFFFFF"); g.px(x + k, yy + 2, "#3A8AB0"); } for (const lx of [x + 2, x + 24, x + 37]) vline(g, lx, y + 3, 8, "#C8C0D0"); }); }

// ---------------------------------------------------------------- big foreground palms (front pass): trunks + crown slots
export const FORE_PALMS = [{ x: 40, base: 952, h: 570, lean: -64, w0: 11, w1: 7, ph: 0.9, s: 92 }, { x: 512, base: 912, h: 548, lean: 70, w0: 11, w1: 7, ph: 2.4, s: 88 }];
export function paintForeTrunks() {
  const A = new Art(820, 700, -40, 300);
  FORE_PALMS.forEach((p, i) => {
    const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40; pts.push([p.x + p.lean * u * u + Math.sin(u * 3) * 6, p.base - p.h * u]); }
    A.with({ id: 130 + i, bp: 3, kind: K_PLANT }, (g) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, ay] = pts[k], [bx, by] = pts[k + 1], r = lerp(p.w0, p.w1, k / 40);
        for (let y = R(by); y <= R(ay); y++) { const u = (y - by) / Math.max(1, ay - by), cx = lerp(bx, ax, u); for (let xx = R(cx - r); xx <= R(cx + r); xx++) { const side = (xx - (cx - r)) / (2 * r), ring = ((p.base - y + R(side * 3)) % 9) < 2; g.px(xx, y, xx === R(cx - r) ? "#2A1612" : xx === R(cx + r) ? "#1E0E0A" : ring ? (side < 0.5 ? "#8A5A3E" : "#5A3424") : side < 0.3 ? "#D8A070" : side < 0.65 ? "#A87050" : "#7A4A34"); } }
      }
      // root flare in the sand
      for (let k = -p.w0 - 5; k <= p.w0 + 5; k++) { const hh = R(4 * (1 - Math.abs(k) / (p.w0 + 6))); for (let j = 0; j < hh; j++) g.px(p.x + k, p.base - j, j === hh - 1 ? "#A87050" : "#7A4A34"); }
    });
    p.top = pts[pts.length - 1];
  });
  bakeBlue(A, 12);
  return A;
}
