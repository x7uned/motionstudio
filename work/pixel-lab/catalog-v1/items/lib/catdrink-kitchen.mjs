// catalog-v1 copy (2026-10-26) of work/pixel-lab/cat-drink/film/kitchen.mjs (drawKitchen, drawForeground). Changes: import
// path; the film's camera layer is replaced by an adapter onto the catalog camera (film world (wx, wy), animals on wy = 0
// → catalog (270 + wx, FLOOR_Y + wy), same depth p); END is the trial's 10 s; the stars in the window twinkle through
// four colour steps instead of switching on/off; the yarn ball in the foreground is not ported (cat-specific), nor the
// child's cat drawing on the fridge. Re-laid out for the catalog's wide frame (the film only showed a close corner):
// three cabinets on the left (x +190), the window top-right of the middle (+190, with its moonbeam), the fish picture
// between them (−160), the fridge at the right edge (−196). Wallpaper diamonds are drawn at pixel-snapped centres and
// the floor's first row / tile highlights are tied to screen rows, so the slowly drifting camera never flips a whole
// row of pattern in one frame (the dithered tile highlight under each seam is left out for the same reason).
// Night kitchen in side view: wall with wallpaper, a moonlit window, cabinets with a warm under-cabinet light, the fridge,
// a framed fish picture, a tiled floor running to the bottom edge, and dark chair legs in the foreground (parallax).
// World units; animals stand on y = 0, the baseboard is at y = -20. Layer transform as in the dog film.
import { mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { layer as catLayer } from "../../engine/layout.mjs";

const W = 540, H = 960, BASE_CY = -24, R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Layer transform for depth p (1 = the floor plane where the animals stand; < 1 further; > 1 nearer). */
export const FLOOR_Y = 560, X_OFF = 270;
export function layer(cam, p) { const C = catLayer(cam, p); return { z: C.z, X: (wx) => C.X(X_OFF + wx), Y: (wy) => C.Y(FLOOR_Y + wy), wx: (sx) => C.wx(sx) - X_OFF, wy: (sy) => C.wy(sy) - FLOOR_Y }; }
export const ground = (cam) => layer(cam, 1);
const WALLP = 0.96, DXC = 190, DXW = 190, DXF = -160, DXR = -196;   // catalog re-layout offsets (film units)
const shiftX = (Lr, dx) => ({ ...Lr, X: (wx) => Lr.X(wx + dx), wx: (sx) => Lr.wx(sx) - dx });
export const wallLayer = (cam) => layer(cam, WALLP);

const COL = { wall0: "#2A2046", wall1: "#1E1734", wall2: "#130E24", paper: "#33285A", base: "#3B2C5C", baseHi: "#6E4FB0",
  tileA: "#2B2248", tileB: "#221B3A", seam: "#15102A", beam: "#4A4A8E", frame: "#523D82", frameHi: "#8D59DA", warm: "#F4CA50" };

/** Moonbeam: the window's light falls down-right across the wall and floor. Returns light amount 0..1 at a world point. */
function beam(wx, wy) {
  // quad: window bottom (-150..-30, -160) → floor patch (−60..+120 at y = 70)
  if (wy < -160 || wy > 90) return 0; const k = (wy + 160) / 230, x0 = -150 + 90 * k, x1 = -30 + 150 * k;
  if (wx < x0 || wx > x1) return 0; const e = Math.min((wx - x0) / 22, (x1 - wx) / 22, 1);
  return e * (0.55 - 0.25 * k);
}

export function drawKitchen(c, cam, t, END) {
  const L = wallLayer(cam), G = ground(cam), yBase = L.Y(-20), yFloorTop = Math.round(yBase);
  // ---- wall (per pixel: gradient by height, wallpaper diamonds, moonbeam)
  for (let y = 0; y < Math.min(H, yFloorTop); y++) {
    const wy = L.wy(y), k = Math.max(0, Math.min(1, (-20 - wy) / 520));
    for (let x = 0; x < W; x++) {
      const wx = L.wx(x); let col = k + (bayer(x, y) - 0.5) * 0.12 < 0.45 ? COL.wall0 : k < 0.8 ? COL.wall1 : COL.wall2;
      const dcx = Math.round(L.X(Math.floor(wx / 26) * 26 + 13)), dcy = Math.round(L.Y(Math.floor(wy / 26) * 26 + 13));   // catalog: pixel-snapped diamond centres
      if (Math.abs(x - dcx) + Math.abs(y - dcy) < 1.6 * Math.max(1, 1 / L.z) + 0.4) col = COL.paper;
      const b = beam(wx - DXW, wy); if (b > 0 && b > bayer(x + 1, y)) col = mix(col, COL.beam, 0.55);
      c.px(x, y, col);
    }
  }
  // ---- window with the night outside (parallax layer), frame, mullions, sill
  const L0 = L;
  { const L = shiftX(L0, DXW), O = shiftX(layer(cam, 0.35), DXW), x0 = L.X(-150), x1 = L.X(-30), y0 = L.Y(-290), y1 = L.Y(-160), cxm = O.X(-70), cym = O.Y(-250);
    for (let y = Math.max(0, R(y0)); y < Math.min(H, R(y1)); y++) for (let x = Math.max(0, R(x0)); x < Math.min(W, R(x1)); x++) {
      const k = (y - y0) / (y1 - y0); c.px(x, y, k + (bayer(x, y) - 0.5) * 0.2 < 0.5 ? "#0E1636" : k < 0.85 ? "#16224A" : "#1E2E5E"); }
    const inside = (x, y) => x >= x0 && x < x1 && y >= y0 && y < y1;
    for (let i = 0; i < 40; i++) { const x = R(O.X(-150 + rnd(i * 3) * 160)), y = R(O.Y(-300 + rnd(i * 5) * 90)); if (inside(x, y)) { const k = 0.5 + 0.5 * Math.sin((2 * Math.PI * (i % 3 + 1) * t) / END + i), q = Math.min(3, Math.floor(k * 4)); c.px(x, y, ["#6A6A96", "#9A9AC0", "#CCCCE0", "#FDFEED"][q]); } }
    const mr = Math.max(2, R(13 * O.z)); for (let y = -mr; y <= mr; y++) for (let x = -mr; x <= mr; x++) { const d = Math.hypot(x, y); if (d > mr + 0.3) continue; const X = R(cxm + x), Y = R(cym + y); if (!inside(X, Y)) continue; const lit = -x * 0.5 - y * 0.6 + mr * 0.2; c.px(X, Y, d > mr - 1 ? "#B8B8DC" : lit > bayer(X, Y) * mr * 0.5 ? "#FDFEED" : "#D8D8F0"); }
    for (const [dx, dy, r] of [[-4, -3, 2.4], [3, 2, 1.8], [-1, 5, 1.4]]) { const X = R(cxm + dx * O.z), Y = R(cym + dy * O.z), rr = Math.max(1, R(r * O.z)); for (let y = -rr; y <= rr; y++) for (let x = -rr; x <= rr; x++) if (x * x + y * y <= rr * rr && inside(X + x, Y + y)) c.px(X + x, Y + y, "#B8B8DC"); }
    // skyline across the bottom of the window
    for (let k = 0; k < 14; k++) { const bx0 = O.X(-160 + k * 13), bw = (10 + rnd(k * 7) * 6) * O.z, bh = (16 + rnd(k * 11) * 34) * O.z, by = y1; for (let y = R(by - bh); y < R(by); y++) for (let x = R(bx0); x < R(bx0 + bw); x++) if (inside(x, y)) c.px(x, y, (x * 7 + y * 3) % 13 === 0 && rnd(x * 31 + y) > 0.5 ? "#F4CA50" : "#0B0F24"); }
    const f = Math.max(2, R(6 * L.z)), m = Math.max(1, R(3 * L.z));
    c.rect(R(x0) - f, R(y0) - f, R(x1 - x0) + 2 * f, f, COL.frame); c.rect(R(x0) - f, R(y1), R(x1 - x0) + 2 * f, f, COL.frame);
    c.rect(R(x0) - f, R(y0), f, R(y1 - y0), COL.frame); c.rect(R(x1), R(y0), f, R(y1 - y0), COL.frame);
    c.rect(R((x0 + x1) / 2) - m, R(y0), 2 * m, R(y1 - y0), COL.frame); c.rect(R(x0), R((y0 + y1) / 2) - m, R(x1 - x0), 2 * m, COL.frame);
    c.rect(R(x0) - f, R(y0) - f, R(x1 - x0) + 2 * f, Math.max(1, R(f / 3)), COL.frameHi);
    c.rect(R(L.X(-160)), R(y1) + f, R(L.X(-20) - L.X(-160)), Math.max(2, R(5 * L.z)), COL.base); c.rect(R(L.X(-160)), R(y1) + f, R(L.X(-20) - L.X(-160)), Math.max(1, R(1.5 * L.z)), COL.baseHi);
    // a small plant on the sill
    { const px = L.X(-58), py = R(y1) + f; c.rect(R(px - 7 * L.z), R(py - 9 * L.z), R(14 * L.z), R(9 * L.z), "#B8642A"); c.rect(R(px - 7 * L.z), R(py - 9 * L.z), R(14 * L.z), Math.max(1, R(1.5 * L.z)), "#D9873E");
      for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.45; c.line(R(px), R(py - 9 * L.z), R(px + Math.cos(a) * 14 * L.z), R(py - 9 * L.z + Math.sin(a) * 14 * L.z), k % 2 ? "#3E8A4A" : "#65DA41"); } } }
  // ---- cabinets on the left with a warm under-cabinet light
  { const X = (wx) => L.X(wx + DXC), Y = L.Y;   // catalog: three cabinets (the film had four), shifted into the frame
    // warm glow on the wall between the cabinets
    for (let y = Math.max(0, R(Y(-230))); y < Math.min(H, R(Y(-120))); y++) for (let x = Math.max(0, R(X(-470))); x < Math.min(W, R(X(-256.25))); x++) { const k = 1 - (y - Y(-230)) / (Y(-120) - Y(-230)); if (k * 0.5 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), COL.warm, 0.25)); }
    const box = (wx0, wx1, wy0, wy1, body, edge) => { const x0 = R(X(wx0)), x1 = R(X(wx1)), y0 = R(Y(wy0)), y1 = R(Y(wy1)); if (x1 < 0 || x0 > W) return; c.rect(x0, y0, x1 - x0, y1 - y0, body); c.frame(x0, y0, x1 - x0, y1 - y0, edge); };
    for (let k = 0; k < 3; k++) { const a = -470 + k * 71.25; box(a, a + 71.25, -112, -24, "#3B2C5C", "#1A1328"); box(a + 6, a + 65, -106, -30, "#45346A", "#2A1F40"); const hx = R(X(a + (k % 2 ? 12 : 59))), hy0 = R(Y(-92)), hy1 = R(Y(-76)); c.rect(hx, hy0, Math.max(1, R(2 * L.z)), hy1 - hy0, "#B08AE8"); }
    box(-478, -248, -120, -112, "#6E4FB0", "#2A1F40"); c.rect(R(X(-478)), R(Y(-120)), R(X(-248) - X(-478)), Math.max(1, R(1.5 * L.z)), "#B08AE8");
    for (let k = 0; k < 3; k++) { const a = -470 + k * 71.25; box(a, a + 71.25, -330, -232, "#33275A", "#1A1328"); box(a + 6, a + 65, -324, -238, "#3B2C5C", "#241A3C"); }
    c.rect(R(X(-470)), R(Y(-232)), R(X(-256.25) - X(-470)), Math.max(1, R(2 * L.z)), COL.warm);
    // kettle and a mug on the counter
    { const kx = X(-420), ky = Y(-120); c.ellipse(R(kx), R(ky - 12 * L.z), R(13 * L.z), R(11 * L.z), "#959595"); c.ellipse(R(kx - 3 * L.z), R(ky - 15 * L.z), R(5 * L.z), R(4 * L.z), "#D8D8F0"); c.rect(R(kx - 4 * L.z), R(ky - 25 * L.z), R(8 * L.z), R(3 * L.z), "#2A2140"); c.line(R(kx + 12 * L.z), R(ky - 14 * L.z), R(kx + 20 * L.z), R(ky - 20 * L.z), "#959595"); }
    { const mx = X(-300), my = Y(-120); c.rect(R(mx - 5 * L.z), R(my - 12 * L.z), R(10 * L.z), R(12 * L.z), "#E03056"); c.rect(R(mx - 5 * L.z), R(my - 12 * L.z), R(10 * L.z), Math.max(1, R(1.5 * L.z)), "#F29AA6"); c.ering(R(mx + 6 * L.z), R(my - 6 * L.z), Math.max(1, R(3 * L.z)), Math.max(1, R(3 * L.z)), "#E03056", -Math.PI / 2, Math.PI / 2); } }
  // ---- framed fish picture
  { const x0 = R(L.X(110 + DXF)), x1 = R(L.X(172 + DXF)), y0 = R(L.Y(-258)), y1 = R(L.Y(-206)); if (x1 > 0 && x0 < W) { c.rect(x0, y0, x1 - x0, y1 - y0, "#B8642A"); c.rect(x0 + 2, y0 + 2, x1 - x0 - 4, y1 - y0 - 4, "#EEDDB8");
    const fx = (x0 + x1) / 2, fy = (y0 + y1) / 2, s = L.z; c.ellipse(R(fx - 3 * s), R(fy), R(13 * s), R(7 * s), "#4A58B8"); c.poly([[fx + 8 * s, fy], [fx + 18 * s, fy - 8 * s], [fx + 18 * s, fy + 8 * s]], "#4A58B8"); c.disc(R(fx - 11 * s), R(fy - 2 * s), Math.max(1, R(1.4 * s)), "#FDFEED"); c.px(R(fx - 11 * s), R(fy - 2 * s), "#0B0812"); for (let k = 0; k < 3; k++) c.line(R(fx - 6 * s + k * 5 * s), R(fy - 5 * s), R(fx - 8 * s + k * 5 * s), R(fy + 5 * s), "#6A78D0"); } }
  // ---- fridge on the right
  { const x0 = R(L.X(380 + DXR)), x1 = R(L.X(486 + DXR)), y0 = R(L.Y(-372)), y1 = R(L.Y(-22)), ym = R(L.Y(-250));
    if (x1 > 0 && x0 < W) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const k = (x - x0) / (x1 - x0); c.px(x, y, k < 0.08 ? "#8A86B8" : k + (bayer(x, y) - 0.5) * 0.1 < 0.75 ? "#5E5A86" : "#4A466E"); }
      c.frame(x0, y0, x1 - x0, y1 - y0, "#1A1328"); c.rect(x0, ym, x1 - x0, Math.max(1, R(1.5 * L.z)), "#1A1328");
      for (const [a, b] of [[-340, -280], [-220, -120]]) c.rect(R(L.X(392 + DXR)), R(L.Y(a)), Math.max(2, R(3 * L.z)), R(L.Y(b) - L.Y(a)), "#B8B8DC");
      for (const [mx, my, col] of [[420, -320, "#E03056"], [450, -300, "#F4CA50"], [435, -200, "#65DA41"]]) c.rect(R(L.X(mx + DXR)), R(L.Y(my)), Math.max(2, R(7 * L.z)), Math.max(2, R(7 * L.z)), col); } }
  // ---- baseboard
  c.rect(0, R(L.Y(-26)), W, Math.max(2, yFloorTop - R(L.Y(-26))), COL.base);   // catalog: ends exactly at the floor's first row c.rect(0, R(L.Y(-26)), W, Math.max(1, R(1.5 * L.z)), COL.baseHi);
  // ---- floor tiles to the bottom edge (rows get taller toward the viewer)
  const rows = [-20]; while (rows[rows.length - 1] < 2000) { const last = rows[rows.length - 1]; rows.push(last + 7 + Math.max(0, last + 20) * 0.32); }
  for (let y = Math.max(0, yFloorTop); y < H; y++) {
    const wy = Math.max(G.wy(y), rows[0] + 1 / G.z); let r = 0; while (r < rows.length - 1 && rows[r + 1] <= wy) r++;   // catalog: rows above rows[0] (wall/floor parallax) are tile, not seam
    const rh = rows[r + 1] - rows[r], seamY = r > 0 && wy - rows[r] < Math.max(0.6, 1 / G.z), tw = 34 + r * 3;   // catalog: the junction line is the contact shadow below
    for (let x = 0; x < W; x++) {
      const wx = G.wx(x), col = Math.floor((wx + (r % 2) * tw / 2) / tw), seamX = ((wx + (r % 2) * tw / 2) % tw + tw) % tw < Math.max(0.6, 1 / G.z);
      let cc = seamY || seamX ? COL.seam : (col + r) % 2 ? COL.tileA : COL.tileB;
      // catalog: the film's dithered highlight under each seam is left out (it re-dithered whole rows as the camera drifted)
      const b = beam(wx - DXW, wy); if (b > 0 && b > bayer(x, y + 1)) cc = mix(cc, COL.beam, 0.5);
      c.px(x, y, cc);
    }
  }
  // soft contact shadow line under the baseboard
  // catalog: two solid rows (the film's three dithered rows re-dithered whenever the line moved by a pixel)
  for (let x = 0; x < W; x++) { c.px(x, yFloorTop, COL.seam); c.px(x, yFloorTop + 1, mix(COL.seam, COL.tileB, 0.5)); }
}

/** Bowl in side view, centred at world x; drawn in two halves so the cat's tongue sits between them. */
export function drawBowl(c, G, wx, part, { rim = -10, r = 19, color = ["#22306A", "#33458A", "#4A58B8", "#6A78D0", "#A9C4FF"], ripples = [], stand = 0 } = {}) {
  const X = G.X, Y = G.Y, z = G.z, rx = r * z, ry = 3 * z, cx = X(wx), cy = Y(rim - stand);
  if (part === "back") {
    if (stand > 0) { // raised wooden feeder for the dog
      const top = Y(-stand), x0 = X(wx - r - 8), x1 = X(wx + r + 8); c.rect(R(x0), R(top), R(x1 - x0), Math.max(2, R(4 * z)), "#8A4418"); c.rect(R(x0), R(top), R(x1 - x0), Math.max(1, R(1.2 * z)), "#B8642A");
      for (const lx of [wx - r - 4, wx + r + 1]) { c.rect(R(X(lx)), R(top + 4 * z), Math.max(2, R(3 * z)), R(Y(0) - top - 4 * z), "#5A2A10"); c.rect(R(X(lx)), R(top + 4 * z), Math.max(1, R(1 * z)), R(Y(0) - top - 4 * z), "#8A4418"); }
    }
    c.ellipse(R(cx), R(cy), R(rx), R(ry), color[0]);
    c.ellipse(R(cx), R(cy + 0.5 * z), R(rx - 1.5 * z), R(ry - 0.8 * z), "#33458A");
    for (let x = R(cx - rx + 2 * z); x < cx + rx - 2 * z; x++) if ((x * 5) % 17 < 3) c.px(x, R(cy + 0.5 * z), "#7E98DA");
    c.px(R(cx - rx * 0.4), R(cy), "#D8E4FF"); c.rect(R(cx - rx * 0.5), R(cy - 0.3 * z), Math.max(1, R(4 * z)), 1, "#A9C4FF");
    for (const rp of ripples) { if (rp.a <= 0) continue; const f = fade(c, rp.a); f.ering(R(X(rp.x)), R(cy + 0.5 * z), R(rp.r * z), Math.max(1, R(rp.r * 0.16 * z)), "#A9C4FF"); }
    return;
  }
  // front wall: trapezoid from the rim down to the floor, glazed with a highlight band and a paw print
  const top = cy, bot = Y(-stand), x0t = cx - rx, x1t = cx + rx, x0b = cx - rx * 0.82, x1b = cx + rx * 0.82;
  for (let y = R(top); y < R(bot); y++) { const k = (y - top) / Math.max(1, bot - top), xa = x0t + (x0b - x0t) * k, xb = x1t + (x1b - x1t) * k;
    for (let x = R(xa); x < R(xb); x++) { const u = (x - xa) / Math.max(1, xb - xa), v = u < 0.12 ? 3 : u > 0.8 ? 1 : u + (bayer(x, y) - 0.5) * 0.15 > 0.55 ? 2 : 3; c.px(x, y, x === R(xa) || x === R(xb) - 1 || y === R(bot) - 1 ? color[0] : color[v]); } }
  c.ering(R(cx), R(cy), R(rx), R(ry), color[4], 0, Math.PI); c.ering(R(cx), R(cy) + 1, R(rx), R(ry), color[3], 0, Math.PI);
  if (z >= 2.5) { const px = cx + rx * 0.05, py = (top + bot) / 2 + 1 * z; c.disc(R(px), R(py + 1 * z), Math.max(1, R(1.6 * z)), color[4]); for (const [dx, dy] of [[-2, -1.6], [-0.7, -2.6], [0.8, -2.6], [2.1, -1.6]]) c.disc(R(px + dx * z), R(py + dy * z), Math.max(1, R(0.6 * z)), color[4]); }
}

/** Foreground: chair legs and a ball of yarn nearer than the floor plane (parallax), running past the bottom edge. */
export function drawForeground(c, cam, t) {
  const F = layer(cam, 1.4);
  for (const wx of [-250, -196, 120, 176]) { const x = F.X(wx), w = 7 * F.z, top = F.Y(36); if (x + w < -2 || x - w > W + 2 || top > H) continue;
    c.rect(R(x - w / 2), R(top), Math.max(2, R(w)), H - R(top) + 2, "#0D0918"); c.rect(R(x - w / 2), R(top), Math.max(1, R(w * 0.25)), H - R(top) + 2, "#1E1734"); }
  { const x0 = F.X(-262), x1 = F.X(-184), y = F.Y(30); if (x1 > 0 && x0 < W && y < H) { c.rect(R(x0), R(y), R(x1 - x0), Math.max(3, R(8 * F.z)), "#120C22"); c.rect(R(x0), R(y), R(x1 - x0), Math.max(1, R(1.5 * F.z)), "#2A1F40"); } }

}
