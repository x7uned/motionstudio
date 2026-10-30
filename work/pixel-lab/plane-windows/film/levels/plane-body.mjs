// Builder PLANE · the fuselage band: pearl skin with cylinder shading (light from above, cloud bounce on the belly),
// a purple cheatline (our palette, no airline livery), lap seams, frame rivet lines, a ±1 px bob and the "breathing":
// with pressure(t) the top and bottom edges bow out (up to 6 px, most between the frames) and the panel grid around
// the hero window stretches a hair. Cyan arrows under the top edge push outward while the cabin is pumped up.
import { R, clamp01, sm, bayer, mix, hex, band, put, blend, SKIN, LIV, CY, CYD, BODY, WIN_Y, PITCH, HERO_WIN, pressure, bob } from "./plane-kit.mjs";

const GW = 540, GH = 960, NROW = BODY.bot - BODY.top + 1, YC = (BODY.top + BODY.bot) / 2, RAD = (BODY.bot - BODY.top) / 2;
export const SEAMS_H = [-232, -195, 80, 148];                 // horizontal lap seams (world y)
export const FRAME0 = HERO_WIN.x + PITCH / 2;                  // frame (rib) rivet lines every PITCH, midway between windows
export const BUTT = (wx) => (((Math.round((wx - FRAME0) / PITCH) % 2) + 2) % 2) === 0;   // every other frame line is also a panel butt seam
export const CHEAT = [30, 47], PIN = [53, 55];                 // cheatline and pinstripe (world y)

// ---------------------------------------------------------------- per-row skin colours (4 dither phases), baked once
const ROWS = new Uint8ClampedArray(NROW * 4 * 3);
{
  const L = [0.22, -0.82, 0.53], ln = Math.hypot(...L);
  for (let j = 0; j < NROW; j++) {
    const wy = BODY.top + j, v = (wy - YC) / RAD, nz = Math.sqrt(Math.max(0, 1 - v * v));
    const lam = (v * L[1] + nz * L[2]) / ln;                      // cylinder: normal (0, v, nz)
    let idx = 4.3 + 3.5 * clamp01((lam + 0.35) / 1.3);
    idx += 0.9 * Math.pow(clamp01((v - 0.55) / 0.45), 1.4);        // bounce light from the sunlit clouds below
    const spec = Math.exp(-(((v + 0.7) / 0.035) ** 2));           // glossy highlight streak along the top third
    for (let ph = 0; ph < 4; ph++) {
      let col = band(SKIN, idx, ph, j, 0.5);
      if (spec > 0.25 && spec > bayer(ph, j) * 0.9) col = "#FFFFFF";
      const inC = wy >= CHEAT[0] && wy <= CHEAT[1], inP = wy >= PIN[0] && wy <= PIN[1];
      if (inC) { const k = clamp01(lam * 1.1); col = wy === CHEAT[0] ? mix(LIV.P7, "#FFFFFF", 0.25) : wy >= CHEAT[1] - 1 ? mix(LIV.P3, LIV.P5, k) : band([LIV.P3, LIV.P5, LIV.P, LIV.P7], 0.6 + k * 2.4, ph, j); }
      if (inP) col = mix(LIV.P7, SKIN[5], 0.2);
      if (wy === CHEAT[1] + 1) col = mix(hex(col), LIV.P3, 0.35);   // soft shadow under the stripe edge
      ROWS.set(hex(col), (j * 4 + ph) * 3);
    }
  }
}
const OUT = hex("#2A2440");

/** Edge bulge (px, ≥ 0) at world x for pressure p: most between the frames, a little at them (quilted balloon). */
export function bulge(wx, p) { const s = Math.sin((Math.PI * (wx - FRAME0)) / PITCH); return p * (3.4 + 2.6 * s * s); }
/** Screen rows of the skin's top and bottom edge at world x. */
export function edges(V, t, wx, p = pressure(t)) { const b = bulge(wx, p), by = bob(t); return [V.Y(BODY.top) + by - R(b), V.Y(BODY.bot) + by + R(b)]; }

export function drawSkin(c, V, t) {
  const p = pressure(t), by = bob(t), topS = V.Y(BODY.top) + by, botS = V.Y(BODY.bot) + by, E = 36, d = c.d;
  const bT = new Int16Array(GW);
  for (let x = 0; x < GW; x++) bT[x] = R(bulge(x - 270 + V.cx, p));
  const y0 = Math.max(0, topS - 7), y1 = Math.min(GH - 1, botS + 7);
  for (let y = y0; y <= y1; y++) {
    const mid = y >= topS + E && y <= botS - E;
    for (let x = 0; x < GW; x++) {
      const b = bT[x], yT = topS - b, yB = botS + b; if (y < yT || y > yB) continue;
      const i = (y * GW + x) * 3;
      if (y === yT || y === yB) { d[i] = OUT[0]; d[i + 1] = OUT[1]; d[i + 2] = OUT[2]; continue; }
      let j;
      if (mid) j = y - topS;
      else if (y < topS + E) j = R(((y - yT) * E) / (topS + E - yT));
      else j = NROW - 1 - R(((yB - y) * E) / (yB - (botS - E)));
      j = Math.max(0, Math.min(NROW - 1, j));
      const s = (j * 4 + ((x + V.cx) & 3)) * 3; d[i] = ROWS[s]; d[i + 1] = ROWS[s + 1]; d[i + 2] = ROWS[s + 2];
    }
  }
}

/** Panel seams and rivets; the grid stretches a hair away from the hero window with the pressure. */
export function stretchK(t) { return 0.012 * pressure(t); }
export function drawSeams(c, V, t, skip) {
  const by = bob(t), k = stretchK(t), p = pressure(t);
  const SX = (wx) => V.X(HERO_WIN.x + (wx - HERO_WIN.x) * (1 + k)), SY = (wy) => V.Y(WIN_Y + (wy - WIN_Y) * (1 + k)) + by;
  const inSkin = (x, y) => { const [a, b] = edges(V, t, x - 270 + V.cx, p); return y > a + 2 && y < b - 2; };
  for (const wy of SEAMS_H) {
    const y = R(SY(wy));
    for (let x = 0; x < GW; x++) { if (!inSkin(x, y) || skip(x, y)) continue; blend(c, x, y, SKIN[2], 0.42, 2); if (!skip(x, y + 1)) blend(c, x, y + 1, "#FFFFFF", 0.5, 2); }
    for (let wx = Math.floor((V.x0 - 10) / 6) * 6; wx < V.x1 + 10; wx += 6) { const x = R(SX(wx)) + 2, yy = y + 4; if (x < 0 || x >= GW || !inSkin(x, yy) || skip(x, yy)) continue; blend(c, x, yy, SKIN[3], 0.55, 2); blend(c, x - 1, yy - 1, "#FFFFFF", 0.6, 2); }
  }
  const k0 = Math.floor((V.x0 - FRAME0) / PITCH) - 1, k1 = Math.ceil((V.x1 - FRAME0) / PITCH) + 1;
  for (let kk = k0; kk <= k1; kk++) {
    const wx = FRAME0 + kk * PITCH, x = R(SX(wx)); if (x < -2 || x > GW + 1) continue;
    const butt = BUTT(wx);
    for (let wy = BODY.top + 8; wy < BODY.bot - 6; wy++) {
      const y = R(SY(wy)); if (!inSkin(x, y)) continue;
      if (wy >= 26 && wy <= 58) continue;                                   // no rivets across the cheatline
      if (butt && !skip(x, y)) { blend(c, x, y, SKIN[2], 0.4, 2); if (!skip(x + 1, y)) blend(c, x + 1, y, "#FFFFFF", 0.45, 2); }
      if ((wy - BODY.top) % 7 === 0) { const rx = x + (butt ? -3 : 0); if (!skip(rx, y)) { blend(c, rx, y, SKIN[3], 0.6, 2); blend(c, rx - 1, y - 1, "#FFFFFF", 0.6, 2); } if (butt && !skip(x + 4, y)) { blend(c, x + 4, y, SKIN[3], 0.6, 2); blend(c, x + 3, y - 1, "#FFFFFF", 0.6, 2); } }
    }
  }
}

/** Cyan outward arrows under the top edge (and over the belly) while the cabin is pumped up. */
export function drawEdgeArrows(c, V, t) {
  const p = pressure(t); if (p < 0.03) return;
  const k0 = Math.floor(V.x0 / (PITCH / 2)) - 1, k1 = Math.ceil(V.x1 / (PITCH / 2)) + 1;
  for (let kk = k0; kk <= k1; kk++) {
    const wx = HERO_WIN.x + kk * (PITCH / 2), x = V.X(wx); if (x < 8 || x > GW - 8) continue;
    const [yT] = edges(V, t, wx, p), a = Math.min(1, p * 1.25) * 0.9, len = R(8 + 10 * p);
    arrow(c, x, yT + 16 + len, 0, -1, len, a);
  }
}
/** A small cyan arrow from (x, y) along (dx, dy) (unit), length len, alpha a. */
export function arrow(c, x, y, dx, dy, len, a) {
  if (a <= 0.02) return;
  const px = -dy, py = dx, pts = [];
  for (let s = 0; s <= len; s++) pts.push([x + dx * s, y + dy * s]);
  const hx = x + dx * len, hy = y + dy * len, head = [];
  for (let s = 1; s <= 4; s++) for (let w = -s; w <= s; w++) head.push([hx - dx * s + px * w, hy - dy * s + py * w]);
  const g = (X, Y, col) => { X = R(X); Y = R(Y); if (a >= 1 || a > bayer(X, Y)) put(c, X, Y, hex(col)); };
  for (const [X, Y] of [...pts, ...head]) for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) g(X + ox, Y + oy, CYD);
  for (const [X, Y] of pts) { g(X, Y, CY); g(X + px, Y + py, CY); }
  for (const [X, Y] of head) g(X, Y, CY);
  g(hx + dx, hy + dy, "#E8FCFF");
}
