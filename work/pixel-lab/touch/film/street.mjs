// Winter street at night in side view with depth layers (parallax): overcast sky with city glow, far and mid skylines,
// the storefront row (café, grocery, brick walls), street lamps with light cones, bus stop, hot-dog cart, snowy pavement
// (the walk line is wy = 0), curb, slushy road, the near snowbank with a low fence, and three layers of falling snow.
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";

const W = 540, TOP = 190, BOT = 960, BASE_CY = -64, R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export function layer(cam, p) { const z = 1 + (cam.z - 1) * p, cx = cam.cx * p, cy = BASE_CY + (cam.cy - BASE_CY) * p; return { z, cx, cy, X: (wx) => 270 + (wx - cx) * z, Y: (wy) => 520 + (wy - cy) * z, wx: (sx) => cx + (sx - 270) / z, wy: (sy) => cy + (sy - 520) / z }; }
export const ground = (cam) => layer(cam, 1);
export const LAMPS = [-300, 40, 380, 720];
export const LAMP_HEAD = (lx) => ({ x: lx - 26, y: -158 });
export const CART = { x0: 86, x1: 152, K: 1.45, cx: 119, base: -6 };
// the first sausage on the grill is the one the hero takes: its world position after the cart's ×K scale
CART.grill = { x: CART.cx + (103 - CART.cx) * CART.K, y: CART.base + (-41 - CART.base) * CART.K };

const SNOW = ["#2A2A48", "#3A3A5C", "#4E4E78", "#6A6A96", "#8C8CB4", "#B4B4D2", "#D8D8EC", "#F0F0FA"];
const WARM = "#F4CA50";
const band = (c, y0, y1, cols) => { y0 = R(y0); y1 = R(y1); for (let y = Math.max(TOP - 2, y0); y < Math.min(BOT + 3, y1); y++) { const k = Math.max(0, Math.min(cols.length - 1.001, ((y - y0) / Math.max(1, y1 - y0)) * (cols.length - 1))), i = Math.floor(k); for (let x = 0; x < W; x++) c.px(x, y, k - i > bayer(x, y) ? cols[i + 1] : cols[i]); } };
const rectW = (c, L, x0, y0, x1, y1, col) => { const a = Math.max(0, R(L.X(x0))), b = Math.min(W, R(L.X(x1))), t = Math.max(TOP - 2, R(L.Y(y0))), u = Math.min(BOT + 3, R(L.Y(y1))); for (let y = t; y < u; y++) for (let x = a; x < b; x++) c.px(x, y, col); };

/** Warm light reaching (wx, wy) from the lamps: 0..1 (used for snow tint and sparkles). */
export function lampLight(wx, wy) { let k = 0; for (const lx of LAMPS) { const h = LAMP_HEAD(lx), dx = (wx - h.x) / 70, dy = (wy - 0) / 34; k = Math.max(k, Math.exp(-(dx * dx + dy * dy))); } return k; }

function skyline(c, L, base, hmin, hmax, wmin, wmax, col, roof, winA, winB, seed, winP) {
  let wx = Math.floor(L.wx(-60) / 40) * 40 - 200; const y0 = L.Y(base);
  while (L.X(wx) < W + 40) {
    const k = Math.round(wx * 7 + seed), w = wmin + rnd(k) * (wmax - wmin), h = hmin + rnd(k + 1) * (hmax - hmin);
    rectW(c, L, wx, base - h, wx + w, base + 400, col);
    rectW(c, L, wx, base - h, wx + w, base - h + 2.5 / L.z, roof);
    for (let wy = base - h + 8; wy < base - 4; wy += 9) for (let xx = wx + 5; xx < wx + w - 5; xx += 8) { const r = rnd(Math.round(xx * 13 + wy * 31 + seed)); if (r < winP) rectW(c, L, xx, wy, xx + 3.2, wy + 4, r < winP * 0.18 ? winB : winA); }
    wx += w + 4 + rnd(k + 2) * 10;
  }
  void y0;
}

function facades(c, L, t) {
  // ground-floor storefronts right behind the pavement (base at wy = -30)
  const B = -30;
  const brick = (x0, x1, top, col, mortar) => { rectW(c, L, x0, top, x1, B + 60, col); for (let wy = top + 4; wy < B; wy += 6) for (let x = 0; x < W; x++) { const wx = L.wx(x); if (wx < x0 || wx > x1) continue; const y = R(L.Y(wy)); if (y > TOP && y < BOT) c.px(x, y, mortar); const off = (Math.floor((wy - top) / 6) % 2) * 7; if ((Math.floor(wx + off) % 14 + 14) % 14 < 0.9 * (1 / L.z + 0.2)) for (let j = 1; j < 6 * L.z; j++) if (R(L.Y(wy)) + j > TOP) c.px(x, R(L.Y(wy)) + j, mortar); } };
  const win = (x0, x1, y0, y1, glass, frame, glow) => { rectW(c, L, x0 - 2, y0 - 2, x1 + 2, y1 + 2, frame); rectW(c, L, x0, y0, x1, y1, glass); if (glow) for (let x = Math.max(0, R(L.X(x0))); x < Math.min(W, R(L.X(x1))); x++) for (let y = Math.max(TOP, R(L.Y(y0))); y < Math.min(BOT, R(L.Y(y1))); y++) { const k = (L.Y(y1) - y) / ((y1 - y0) * L.z); if (k * 0.5 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), glow, 0.35)); } };
  // apartment entrance (brick), shop, café, wall behind the lamp, grocery 24/7, apartment
  brick(-640, -390, -260, "#2A1C2E", "#1C1220");
  win(-560, -500, -120, -60, "#1A1430", "#120C1D"); win(-470, -420, -86, B, "#3A2A50", "#120C1D"); rectW(c, L, -466, -96, -424, -88, "#C9A040");
  rectW(c, L, -390, -260, -210, B + 60, "#1E1834"); win(-380, -220, -100, -40, "#22305A", "#120C1D", "#5470B8"); for (let k = 0; k < 4; k++) rectW(c, L, -370 + k * 38, -66, -344 + k * 38, -42, "#2C4670");
  // café: warm window, people silhouettes at tables, hanging lamps, striped awning with snow, cup sign
  rectW(c, L, -210, -260, -40, B + 60, "#2E2038");
  win(-200, -50, -104, -36, "#7A4A2A", "#1A1018", "#F4CA50");
  for (const [px, s] of [[-176, 1], [-118, -1], [-84, 1]]) { rectW(c, L, px - 5, -58, px + 5, -36, "#3A2418"); rectW(c, L, px - 3.5, -66, px + 3.5, -58, "#3A2418"); }
  rectW(c, L, -150, -46, -100, -43, "#2A1A12"); for (const lx of [-170, -125, -80]) { rectW(c, L, lx - 0.5, -104, lx + 0.5, -92, "#1A1018"); rectW(c, L, lx - 4, -92, lx + 4, -88, "#FAE375"); }
  for (let k = 0; k < 10; k++) { const x0 = -206 + k * 16; rectW(c, L, x0, -122, x0 + 16, -108, k % 2 ? "#E0CDF8" : "#6E4FB0"); }
  rectW(c, L, -208, -125, -46, -121, SNOW[6]); for (let k = 0; k < 9; k++) rectW(c, L, -204 + k * 18, -108, -194 + k * 18, -104, k % 2 ? "#E0CDF8" : "#6E4FB0");
  { const cx = -125, cy = -150, g = 0.7 + 0.3 * Math.sin(t * 3.1); rectW(c, L, cx - 10, cy - 8, cx + 8, cy + 8, mix("#3A2A50", WARM, 0.5 * g)); rectW(c, L, cx + 8, cy - 4, cx + 13, cy + 3, mix("#3A2A50", WARM, 0.5 * g)); rectW(c, L, cx - 8, cy - 6, cx + 6, cy + 6, "#2E2038"); rectW(c, L, cx - 5, cy - 15, cx - 3, cy - 10, "#8C8CB4"); rectW(c, L, cx + 1, cy - 17, cx + 3, cy - 11, "#8C8CB4"); }
  // dark wall behind the lamp and the hero (keeps the figure readable), poster board
  brick(-40, 110, -260, "#241A30", "#181022"); win(-12, 64, -150, -112, "#16122A", "#120C1D"); win(-26, 6, -90, -50, "#2A2040", "#1A1428");
  rectW(c, L, 20, -96, 84, -52, "#1A1428"); rectW(c, L, 23, -93, 81, -55, "#3B2C5C"); rectW(c, L, 28, -88, 60, -82, "#8D59DA"); rectW(c, L, 28, -78, 76, -75, "#6E4FB0"); rectW(c, L, 28, -71, 70, -68, "#6E4FB0");
  // grocery 24/7: bright cool window with shelves
  rectW(c, L, 110, -260, 300, B + 60, "#1C1A30"); win(124, 290, -100, -38, "#BFD4F2", "#14122A", "#E8F0FF");
  for (const wy of [-88, -72, -56]) { rectW(c, L, 126, wy, 288, wy + 2, "#6A74BC"); for (let xx = 128; xx < 286; xx += 7) rectW(c, L, xx, wy - 6, xx + 4, wy, ["#E03056", "#F4CA50", "#65DA41", "#5470B8", "#E0CDF8"][Math.floor(rnd(xx * 3 + wy) * 5)]); }
  rectW(c, L, 150, -122, 264, -108, "#0E0C1A"); { const g = 0.75 + 0.25 * Math.sin(t * 5); for (const [x0, x1] of [[160, 178], [186, 196], [204, 220], [228, 250]]) rectW(c, L, x0, -118, x1, -112, mix("#14122A", "#65DA41", g)); }
  brick(300, 700, -260, "#2A1C2E", "#1C1220"); for (const xx of [330, 420, 510, 600]) win(xx, xx + 50, -110, -60, rnd(xx) < 0.5 ? "#5A3A26" : "#16122A", "#120C1D", rnd(xx) < 0.5 ? WARM : null);
  // second-floor windows above the shops
  for (let xx = -620; xx < 700; xx += 44) { const lit = rnd(xx * 3 + 1) < 0.45; win(xx, xx + 22, -230, -186, lit ? "#6A4428" : "#14102A", "#120C1D", lit ? WARM : null); rectW(c, L, xx - 3, -186, xx + 25, -183, SNOW[5]); }
}

function busStop(c, G, x0) {
  const B = -22;
  for (const px of [x0, x0 + 110]) { c.rect(R(G.X(px)), R(G.Y(-118)), Math.max(1, R(2.5 * G.z)), R(96 * G.z + 24 * G.z), "#4A4466"); }
  rectW(c, G, x0 - 6, -124, x0 + 118, -116, "#2E2A40"); rectW(c, G, x0 - 6, -127, x0 + 118, -124, SNOW[6]);
  for (let x = Math.max(0, R(G.X(x0 + 3))); x < Math.min(W, R(G.X(x0 + 108))); x++) for (let y = Math.max(TOP, R(G.Y(-114))); y < Math.min(BOT, R(G.Y(B))); y++) if (bayer(x, y) < 0.22) c.px(x, y, mix(c.get(x, y), "#A9C4FF", 0.3));
  rectW(c, G, x0 + 70, -100, x0 + 104, -48, "#3B2C5C"); rectW(c, G, x0 + 73, -97, x0 + 101, -51, "#E0CDF8"); rectW(c, G, x0 + 77, -92, x0 + 97, -86, "#6E4FB0");
  rectW(c, G, x0 + 10, -44, x0 + 60, -40, "#4A4466"); rectW(c, G, x0 + 12, -46, x0 + 58, -44, SNOW[6]);
}

function lampPost(c, G, lx, t) {
  const h = LAMP_HEAD(lx);
  rectW(c, G, lx - 2.2, -172, lx + 2.2, -22, "#2E2A40"); rectW(c, G, lx - 1, -172, lx, -22, "#4A4466");
  rectW(c, G, lx - 4, -30, lx + 4, -22, "#2E2A40");
  rectW(c, G, h.x - 2, -176, lx + 2, -172, "#2E2A40"); rectW(c, G, h.x - 2, -179, lx + 1, -176, SNOW[6]);
  rectW(c, G, h.x - 8, -172, h.x + 8, -164, "#2E2A40"); rectW(c, G, h.x - 9, -174, h.x + 9, -172, SNOW[6]);
  rectW(c, G, h.x - 6, -164, h.x + 6, h.y + 2, "#FFF4C0"); rectW(c, G, h.x - 4, -164, h.x + 4, h.y, "#FFFDF0");
}
function lampCones(c, G, t) {
  for (const lx of LAMPS) {
    const h = LAMP_HEAD(lx), x0 = G.X(h.x), y0 = G.Y(h.y + 1), y1 = G.Y(4);
    for (let y = Math.max(TOP, R(y0)); y < Math.min(BOT, R(y1)); y++) {
      const k = (y - y0) / (y1 - y0), half = (6 + 54 * k) * G.z, a = 0.12 * (1 - k * 0.5);
      for (let x = Math.max(0, R(x0 - half)); x < Math.min(W, R(x0 + half)); x++) { const e = 1 - Math.abs(x - x0) / half; if (a * e * e * 1.6 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#FFE9A8", 0.22)); }
    }
    // glow around the head
    for (let y = R(y0 - 30 * G.z); y < R(y0 + 14 * G.z); y++) for (let x = R(x0 - 30 * G.z); x < R(x0 + 30 * G.z); x++) { if (y < TOP || y >= BOT || x < 0 || x >= W) continue; const d = Math.hypot(x - x0, (y - y0) * 1.2) / (30 * G.z); if (d < 1 && (1 - d) * 0.6 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#FFE9A8", 0.25)); }
  }
}

/** Hot-dog cart: wheels, red body, grill with sausages, steam, striped umbrella with snow. `taken` hides one sausage. */
function cart(c, G0, t, taken) {
  const { x0, x1, K, cx: kx, base: B } = CART;
  const G = { z: G0.z * K, X: (wx) => G0.X(kx + (wx - kx) * K), Y: (wy) => G0.Y(B + (wy - B) * K), wx: (sx) => kx + (G0.wx(sx) - kx) / K, wy: (sy) => B + (G0.wy(sy) - B) / K };
  rectW(c, G, x0 + 4, -36, x1 - 4, B - 10, "#8A2840"); rectW(c, G, x0 + 4, -36, x1 - 4, -33, "#E0565A"); rectW(c, G, x0 + 10, -30, x1 - 10, -18, "#B83A50");
  rectW(c, G, x0 + 14, -27, x1 - 14, -21, "#F4CA50"); rectW(c, G, x0 + 18, -26, x0 + 30, -22, "#8A2840"); rectW(c, G, x0 + 36, -26, x0 + 48, -22, "#8A2840");
  for (const wx of [x0 + 14, x1 - 14]) { const cx = G.X(wx), cy = G.Y(B - 6), r = Math.max(2, R(7 * G.z)); c.disc(R(cx), R(cy), r, "#1A1428"); c.disc(R(cx), R(cy), Math.max(1, R(r * 0.45)), "#6A6A96"); }
  rectW(c, G, x1 - 4, -44, x1 - 1, -10, "#4A4466"); rectW(c, G, x1 - 6, -46, x1 + 6, -43, "#4A4466");
  // grill and sausages
  rectW(c, G, x0 + 6, -40, x1 - 6, -36, "#2E2A40"); for (let k = 0; k < 4; k++) { if (taken && k === 0) continue; const sx = x0 + 12 + k * 13; rectW(c, G, sx, -42.5, sx + 10, -39.5, "#B85A38"); rectW(c, G, sx + 1, -42.5, sx + 9, -41.6, "#E28A5A"); }
  // steam
  for (let k = 0; k < 6; k++) { const ph = ((t * 0.45 + k / 6) % 1), wx = x0 + 18 + k * 8 + Math.sin(t * 1.7 + k) * 3, wy = -44 - ph * 34, r = (2 + ph * 4) * G.z; const a = 0.45 * (1 - ph); for (let y = R(G.Y(wy) - r); y < R(G.Y(wy) + r); y++) for (let x = R(G.X(wx) - r); x < R(G.X(wx) + r); x++) { if (x < 0 || x >= W || y < TOP || y >= BOT) continue; if (Math.hypot(x - G.X(wx), y - G.Y(wy)) < r && a > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#E0E0F0", 0.5)); } }
  // umbrella
  rectW(c, G, (x0 + x1) / 2 - 1, -96, (x0 + x1) / 2 + 1, -36, "#4A4466");
  const ux = (x0 + x1) / 2, uy = -96, uw = 52;
  for (let x = Math.max(0, R(G.X(ux - uw))); x < Math.min(W, R(G.X(ux + uw))); x++) { const wx = G.wx(x), u = (wx - ux) / uw, top = uy - 16 * Math.sqrt(Math.max(0, 1 - u * u)), bot = uy + 2 + 2 * Math.cos(u * 9 * Math.PI) ** 2;
    for (let y = Math.max(TOP, R(G.Y(top))); y < Math.min(BOT, R(G.Y(bot))); y++) { const seg = Math.floor((u + 1) * 4); c.px(x, y, y < G.Y(top) + 2.2 * G.z ? SNOW[6] : seg % 2 ? "#F4CA50" : "#E03056"); } }
}

function snowLayer(c, cam, t, p, n, size, speed, col, seed, alpha = 1) {
  const L = layer(cam, p), span = 760 / L.z + 40, xs = 600 / L.z + 40;
  for (let i = 0; i < n; i++) {
    const r1 = rnd(i * 31 + seed), r2 = rnd(i * 17 + seed * 3), r3 = rnd(i * 7 + seed * 5);
    const wy0 = L.wy(TOP - 20) + ((r2 * 2000 + t * speed * (0.7 + 0.6 * r3)) % span);
    const wx = L.wx(-20) + (((r1 * 3000 + t * speed * 0.25 + Math.sin(t * (0.6 + r3) + i) * 6) % xs) + xs) % xs;
    const x = R(L.X(wx)), y = R(L.Y(wy0)), s = Math.max(1, R(size * (0.7 + 0.6 * r3) * Math.min(L.z, 3)));
    if (y < TOP || y > BOT || x < -6 || x > W + 6) continue;
    const lit = lampLight(layer(cam, 1).wx(x), -20) > 0.25;
    if (s <= 2) { c.rect(x, y, s, s, lit ? "#FFF6D6" : col); continue; }
    for (let j = 0; j < s; j++) for (let k = 0; k < s; k++) { const d = Math.hypot(k - (s - 1) / 2, j - (s - 1) / 2) / (s / 2); if (d < 1 && (1 - d * d) * alpha * 1.2 > bayer(x + k, y + j)) c.px(x + k, y + j, lit ? "#FFF6D6" : col); }
  }
}

/** Everything behind the hero. */
export function drawStreetBack(c, cam, t, o = {}) {
  const L0 = layer(cam, 0.04), H = L0.Y(-150);
  band(c, TOP - 2, H, ["#07060F", "#0B0918", "#100D22", "#17122C", "#201836", "#2C2040", "#3E2A4A", "#54344E"]);
  for (let i = 0; i < 40; i++) { const x = R(((rnd(i * 5) * 1.3 - 0.15) * W) - cam.cx * 0.02), y = TOP + R(rnd(i * 9) * (H - TOP) * 0.6); if (x >= 0 && x < W && y < H) c.px(x, y, "#2E2A48"); }
  skyline(c, layer(cam, 0.12), -120, 50, 150, 30, 70, "#140F24", "#3A3456", "#5A4630", "#3A4A7A", 11, 0.18);
  band(c, layer(cam, 0.12).Y(-120) - 10, layer(cam, 0.12).Y(-120) + 4, ["#3E2A4A", "#3E2A4A"]);
  skyline(c, layer(cam, 0.3), -70, 70, 190, 44, 90, "#1A1430", "#4E4870", "#7A5A30", "#4A5A9A", 23, 0.24);
  // haze between the layers
  { const Lh = layer(cam, 0.3), y0 = Lh.Y(-140), y1 = Lh.Y(-40); for (let y = Math.max(TOP, R(y0)); y < Math.min(BOT, R(y1)); y++) { const k = (y - y0) / (y1 - y0); for (let x = 0; x < W; x++) if (k * 0.35 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), "#3E2A4A", 0.4)); } }
  snowLayer(c, cam, t, 0.3, 140, 1, 26, "#6A6A96", 3);
  const Lf = layer(cam, 0.75); facades(c, Lf, t);
  // pavement, curb, road, near snowbank — the ground plane (wy ≥ −30)
  const G = ground(cam);
  for (let y = Math.max(TOP - 2, R(G.Y(-30))); y < BOT + 3; y++) {
    const wy = G.wy(y + 0.5);
    for (let x = 0; x < W; x++) {
      const wx = G.wx(x + 0.5); let col;
      if (wy < 30) { // snowy pavement, warm under the lamps, sparkles
        const lit = lampLight(wx, wy), n = rnd(Math.floor(wx * 0.8) * 7 + Math.floor(wy * 0.8) * 131);
        let k = 4.2 + (wy + 30) / 60 * 0.8 + (n - 0.5) * 0.7 + (bayer(x, y) - 0.5) * 0.6; col = SNOW[Math.max(2, Math.min(6, R(k)))];
        if (lit > 0.05) col = mix(col, "#FFE3A0", Math.min(0.45, lit * 0.5));
        if (n > 0.985 && lit > 0.2 && Math.sin(t * 6 + wx) > 0.3) col = "#FFFDF0";
        if (wy < -27) col = mix(col, "#1A1428", 0.5);
      } else if (wy < 37) { col = wy < 31.5 ? SNOW[6] : mix("#4A4466", "#2E2A40", (wy - 31.5) / 5.5); if ((Math.floor(wx / 26) + 99) % 2 && wy >= 31.5 && Math.abs(((wx % 26) + 26) % 26) < 0.9 / G.z + 0.5) col = "#1A1428"; }
      else if (wy < 122) { // road: asphalt with slush, two tyre tracks, warm reflections under the lamps
        const n = rnd(Math.floor(wx / 3) * 17 + Math.floor(wy / 2) * 101), m = rnd(Math.floor(wx / 23) * 5 + Math.floor(wy / 9) * 77), track = Math.abs(wy - 60) < 4 || Math.abs(wy - 96) < 4;
        col = track ? (n < 0.3 ? "#2A2440" : "#302A48") : m < 0.18 ? (n < 0.5 ? "#2A2440" : "#252038") : n < 0.06 ? "#2A2440" : n < 0.5 ? "#1A1626" : "#17131F";
        let refl = 0; for (const lx of LAMPS) { const h = LAMP_HEAD(lx), d = Math.abs(wx - h.x - (wy - 37) * 0.08); if (d < 9) refl = Math.max(refl, (1 - d / 9) * (1 - (wy - 37) / 90)); }
        if (refl > 0 && refl * 0.7 > bayer(x, y) && (Math.floor(wy) % 3)) col = mix(col, "#C9A040", 0.6);
        if (wy > 116) col = mix(col, SNOW[2], (wy - 116) / 6);
      } else { // near snowbank (rising mound) and its shading
        const top = 128 + 6 * Math.sin(wx * 0.021) + 3 * Math.sin(wx * 0.07 + 1);
        if (wy < top) col = mix("#17131F", SNOW[3], (wy - 122) / Math.max(1, top - 122));
        else { const d = wy - top, n = rnd(Math.floor(wx * 0.6) * 7 + Math.floor(wy * 0.6) * 29); col = SNOW[Math.max(1, Math.min(6, R(6 - d / 22 + (n - 0.5) * 0.8 + (bayer(x, y) - 0.5) * 0.5)))]; }
      }
      c.px(x, y, col);
    }
  }
  // footprints in the snow (behind the hero)
  for (const f of o.prints ?? []) { const x = G.X(f.x), y = G.Y(f.y); if (x < -10 || x > W + 10) continue; c.ellipse(R(x), R(y), Math.max(1, R(4.5 * G.z)), Math.max(1, R(1.3 * G.z)), SNOW[2]); c.ellipse(R(x - 0.5 * G.z), R(y - 0.4 * G.z), Math.max(1, R(3 * G.z)), Math.max(1, R(0.6 * G.z)), SNOW[1]); }
  busStop(c, G, -420);
  for (const lx of LAMPS) lampPost(c, G, lx, t);
  cart(c, G, t, o.taken);
  lampCones(c, G, t);
  snowLayer(c, cam, t, 0.8, 120, 2, 34, "#B4B4D2", 7);
}

/** Things in front of the hero: low fence on the near snowbank, the nearest flakes. */
export function drawStreetFront(c, cam, t) {
  const G = ground(cam);
  for (let wx = Math.floor(G.wx(-20) / 14) * 14; G.X(wx) < W + 20; wx += 14) { const x = G.X(wx), y0 = G.Y(130 + 6 * Math.sin(wx * 0.021) - 2), y1 = G.Y(104); if (y1 > BOT) continue; c.rect(R(x), R(y1), Math.max(1, R(1.6 * G.z)), Math.max(1, R(y0 - y1)), "#1A1428"); c.rect(R(x), R(y1) - Math.max(1, R(1.4 * G.z)), Math.max(2, R(2.4 * G.z)), Math.max(1, R(1.4 * G.z)), SNOW[6]); }
  { const y = G.Y(108); if (y < BOT) { c.rect(0, R(y), W, Math.max(1, R(1.6 * G.z)), "#1A1428"); c.rect(0, R(y) - 1, W, 1, SNOW[5]); } }
  snowLayer(c, cam, t, 1.6, 26, 4, 60, "#D8D8EC", 13, 0.75);
}
