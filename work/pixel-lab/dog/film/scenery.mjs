// Dusk riverbank in side view with depth layers (parallax): sky + striped sun, hills, two tree lines, river with the
// sun path, the near bank (ground y = 0 in world units), shallows on the right where the dog climbs out.
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";

const W = 540, TOP = 190, BOT = 960, BASE_CY = -132;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
/** Layer transform for depth p (0 = infinitely far, 1 = the ground plane). */
export function layer(cam, p) { const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = BASE_CY + (cam.cy - BASE_CY) * p; return { z, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => 520 + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z }; }
export const ground = (cam) => layer(cam, 1);
const band = (c, y0, y1, cols) => { y0 = Math.round(y0); y1 = Math.round(y1); for (let y = Math.max(TOP - 2, y0); y < Math.min(BOT + 3, y1); y++) { const k = Math.max(0, Math.min(cols.length - 1.001, ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1))), i = Math.floor(k); for (let x = 0; x < W; x++) c.px(x, y, k - i > bayer(x, y) ? cols[i + 1] : cols[i]); } };

export function drawScenery(c, cam, t) {
  // sky (screen-fixed apart from a slight tilt with the camera)
  const L0 = layer(cam, 0.04), H = L0.Y(-200);
  band(c, TOP - 2, H, ["#0E0A22", "#1D1438", "#33204E", "#5A2E5E", "#8A4466", "#C8665A", "#F2A65A"]);
  for (let i = 0; i < 50; i++) { const x = Math.round((rnd(i * 7) * 1.4 - 0.2) * W - cam.cx * 0.02), y = TOP + Math.round(rnd(i * 11) * (H - TOP) * 0.45); if (x >= 0 && x < W) c.px(x, y, i % 5 ? "#5E5478" : (Math.sin(t * 2 + i) > 0.6 ? "#FDFEED" : "#B08AE8")); }
  // striped sun on the horizon
  { const sx = L0.X(130), r = 40 * L0.z; for (let y = -r; y <= 0; y++) { const w = Math.sqrt(Math.max(0, r * r - y * y)); if ((-y) % 7 < 2 && y > -26) continue; for (let x = -w; x <= w; x++) c.px(Math.round(sx + x), Math.round(H + y), mix("#FAE375", "#F28A4A", (y + r) / r)); } }
  // hills
  for (const [p, base, amp, freq, col, seed] of [[0.1, 26, 9, 0.012, "#3A2550", 1], [0.16, 14, 6, 0.02, "#271A3C", 4]]) {
    const Lh = layer(cam, p), Hy = Lh.Y(-200);
    for (let x = 0; x < W; x++) { const wx = Lh.wx(x), h = (base + Math.sin(wx * freq + seed) * amp + Math.sin(wx * freq * 2.7 + seed * 3) * amp * 0.4) * Lh.z; for (let y = Math.round(Hy - h); y < Hy + 2; y++) if (y >= TOP - 2) c.px(x, y, col); }
  }
  // far tree line
  forest(c, layer(cam, 0.26), -194, "#1D1430", "#8A4466", 17, 22, 42, 3);
  // river (between the far bank and the near bank)
  { const Lr = layer(cam, 0.55), y0 = Lr.Y(-194), y1 = Math.max(Lr.Y(-40), ground(cam).Y(12)), sun = layer(cam, 0.04).X(130);
    band(c, y0, y1, ["#3A2C66", "#2B2D76", "#22215E", "#1A1748"]);
    for (let y = Math.round(y0) + 3; y < y1; y += 5) for (let k = 0; k < 40; k++) { const wx = Math.floor(Lr.wx(0) / 23) * 23 + k * 23 + ((y * 7) % 23), x = Math.round(Lr.X(wx) + Math.sin(t * 1.5 + y) * 2); if (x < -10 || x > W) continue; c.rect(x, y, Math.max(2, Math.round((6 + (wx % 5)) * Lr.z)), 1, Math.abs(x - sun) < 40 - (y - y0) * 0.2 ? "#FAE375" : "#4A58B8"); }
    for (let y = Math.round(y0); y < y1; y += 3) { const w = 26 - (y - y0) * 0.15; if (w > 2) for (let x = -w; x < w; x += 4 + (y % 3)) c.rect(Math.round(sun + x + Math.sin(y + t * 3) * 3), y, 2, 1, "#F6C860"); }
    forest(c, layer(cam, 0.45), -182, "#140E24", "#5A2E5E", 23, 34, 64, 9); }
  // near bank: the ground plane (y = 0 is where the animals stand); top edge meets the water
  const G = ground(cam);
  for (let x = 0; x < W; x++) {
    const wx = G.wx(x), dip = wx > 112 && wx < 340 ? 40 * Math.sin(Math.PI * (wx - 112) / 228) : 0, top = G.Y(-44 + 4 * Math.sin(wx * 0.013) + dip);
    for (let y = Math.max(TOP - 2, Math.round(top)); y < BOT + 3; y++) { const wy = (y - 520) / G.z + (BASE_CY + (cam.cy - BASE_CY)); c.px(x, y, y === Math.round(top) ? "#4E3B7C" : bayer(x, y) < 0.12 ? "#3B2C5C" : wy > 30 ? "#1A1328" : "#231A36"); }
  }
  // grass tufts and pebbles (seeded along world x)
  for (let k = -60; k < 140; k++) {
    const wx = k * 15 + rnd(k * 5) * 14, wy = -38 + rnd(k * 9) * 300; const x = G.X(wx), y = G.Y(wy), near = 1 + Math.max(0, wy) / 110;
    if (x < -20 || x > W + 20 || y < TOP || y > BOT) continue;
    if (wx > 120 && wx < 335 && wy < 70) continue;
    if (k % 3 === 0) { const rx = Math.max(1, Math.round(3 * G.z * near)), ry = Math.max(1, Math.round(1.5 * G.z * near)); c.ellipse(Math.round(x), Math.round(y) + 1, rx, ry, "#140E20"); c.ellipse(Math.round(x), Math.round(y), rx, ry, "#3B3252"); c.ellipse(Math.round(x - rx / 3), Math.round(y - ry / 3), Math.max(1, Math.round(rx / 2)), Math.max(1, Math.round(ry / 2)), "#5E5478"); continue; }
    for (let j = -2; j <= 2; j++) c.line(Math.round(x), Math.round(y), Math.round(x + j * 2 * G.z * near), Math.round(y - (4 + Math.abs(j) * 2 + rnd(k + j) * 3) * G.z * near), j % 2 ? "#6E58A8" : "#4E3B7C");
  }
  // reeds at the water's edge
  for (let k = -30; k < 60; k++) {
    const wx = k * 31 + rnd(k * 13) * 20, top = -44 + 4 * Math.sin(wx * 0.013); if (wx > 110 && wx < 260) continue;
    const x = G.X(wx), y = G.Y(top + 4), h = (22 + rnd(k) * 22) * G.z; if (x < -10 || x > W + 10 || (wx > 100 && wx < 350)) continue;
    c.line(Math.round(x), Math.round(y), Math.round(x + (rnd(k * 3) - 0.5) * 8 * G.z + Math.sin(t * 1.3 + k) * 1.5), Math.round(y - h), k % 3 ? "#2E2445" : "#4E3B7C");
    if (k % 4 === 0) c.rect(Math.round(x) - 1, Math.round(y - h) - 3, Math.max(2, Math.round(2.5 * G.z)), Math.max(4, Math.round(6 * G.z)), "#6E4632");
  }
}
function forest(c, L, wy, col, rim, step, hmin, hmax, seed) {
  const y = L.Y(wy), x0 = Math.floor(L.wx(-30) / step) * step;
  for (let wx = x0; L.X(wx) < W + 30; wx += step) { const x = L.X(wx), h = (hmin + rnd(Math.round(wx) * 3 + seed) * (hmax - hmin)) * L.z, w = h * 0.38; c.poly([[x - w, y], [x + w, y], [x, y - h]], col); c.line(Math.round(x), Math.round(y - h), Math.round(x + w), Math.round(y), rim); }
}
/** Shallows in front of the dog on the right (drawn after the dog so its legs sink into the water). */
export function drawShallows(c, cam, t) {
  // a small inlet where the dog climbs out: wx 112..340, from the waterline down to a muddy edge (not to the frame bottom)
  const G = ground(cam);
  for (let x = 0; x < W; x++) {
    const wx = G.wx(x); if (wx < 112 || wx > 340) continue; const edge = Math.min(1, (wx - 112) / 40, (340 - wx) / 40);
    const top = Math.round(G.Y(-9 + Math.sin(wx * 0.08 + t * 2) * 1.2)), depth = 20 + 50 * Math.sin(Math.PI * (wx - 112) / 228), bot = Math.round(G.Y(depth));
    for (let y = Math.max(TOP - 2, top); y < Math.min(BOT + 3, bot + 6); y++) {
      const fadeBottom = y > bot ? 1 - (y - bot) / 6 : 1; if ((0.55 + 0.45 * edge) * fadeBottom <= bayer(x, y)) continue;
      c.px(x, y, y === top ? "#6A78D0" : y >= bot - 2 ? "#2A2140" : ((x * 3 + y * 7 + Math.round(t * 20)) % 29 < 2 ? "#4A58B8" : (y - top) % 9 < 1 ? "#2B2D76" : "#22215E"));
    }
  }
}
