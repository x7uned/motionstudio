// The night around the plane, side view: sky graded by altitude, stars and moon far away, a moonlit cloud carpet
// (y 200…380), the city 10 km below (compressed: ground y = 900) with cell towers whose antennas tilt down, a car on the
// road, and a satellite above (y −820). The plane stays put; clouds and ground scroll past. Illustration, not to scale.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { EV } from "./timeline.mjs";

const W = 540, TOP = 190, BOT = 960, R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const GROUND = 900, TOWER_GAP = 150, TOWER_H = 120;
export const view = (cam) => ({ z: cam.z, X: (wx) => 270 + (wx - cam.cx) * cam.z, Y: (wy) => 520 + (wy - cam.cy) * cam.z, wx: (sx) => cam.cx + (sx - 270) / cam.z, wy: (sy) => cam.cy + (sy - 520) / cam.z });

// scrolling: the plane flies right, so clouds and ground move left; the ground pauses while we watch the car
const DT = 1 / 120, CLOUD_V = 150, GROUND_V = 110;
const OFF = (() => { const n = Math.ceil(80 / DT), g = new Float32Array(n); let x = 0; for (let i = 0; i < n; i++) { g[i] = x; const t = i * DT, still = Math.min(sm(t, EV.towers[0] - 1.2, EV.towers[0] - 0.4), 1 - sm(t, EV.car[1] + 0.2, EV.car[1] + 1.0)), fast = Math.min(sm(t, EV.fly[0], EV.fly[0] + 0.4), 1 - sm(t, EV.fly[1], EV.fly[1] + 0.6)); x += GROUND_V * (1 - still) * (1 + 2.5 * fast) * DT; } return g; })();
export const groundOff = (t) => OFF[Math.max(0, Math.min(OFF.length - 1, R(t / DT)))];
const cloudOff = (t) => CLOUD_V * t;

/** Towers in view (world x after scrolling), for links and beams. */
export function towersNear(t, x0, x1) { const off = groundOff(t), out = []; for (let k = Math.floor((x0 + off) / TOWER_GAP) - 1; k * TOWER_GAP - off < x1 + TOWER_GAP; k++) out.push({ k, x: k * TOWER_GAP + 40 * rnd(k * 7) - off, top: GROUND - TOWER_H }); return out; }

function skyColor(wy) {
  const stops = [[-900, "#030209"], [-400, "#07061A"], [-60, "#120E2A"], [160, "#1E1840"], [260, "#2A2350"], [420, "#0E0C1E"], [820, "#151230"], [900, "#251C3C"]];
  for (let i = 0; i + 1 < stops.length; i++) { const [a, ca] = stops[i], [b, cb] = stops[i + 1]; if (wy <= b) return mix(ca, cb, clamp01((wy - a) / (b - a))); }
  return mix("#251C3C", "#251C3C", 0);
}

export function drawWorld(c, cam, t, o = {}) {
  const V = view(cam);
  // sky by altitude, dithered between rows
  for (let y = TOP; y < BOT; y++) { const wy = V.wy(y + 0.5), a = skyColor(wy), b = skyColor(wy + 6 / cam.z); for (let x = 0; x < W; x++) c.px(x, y, bayer(x, y) < 0.5 ? a : b); }
  // stars and moon (far away: they barely move)
  for (let i = 0; i < 160; i++) { const x = R(((rnd(i * 3) * 1.6 - 0.3) * W - cam.cx * 0.02) % W), wy = -900 + rnd(i * 5) * 1000; const y = R(520 + (wy - cam.cy) * Math.min(1, cam.z) * 0.25 + (wy < 100 ? 0 : 9999)); if (y < TOP || y >= BOT || x < 0) continue; const tw = Math.sin(t * (1 + rnd(i) * 3) + i) > 0.7; c.px(x, y, tw ? "#FDFEED" : i % 4 ? "#5E5478" : "#B08AE8"); }
  { const mx = R(430 - cam.cx * 0.01), my = R(330 + (-500 - cam.cy) * Math.min(1, cam.z) * 0.1); if (my > TOP - 30 && my < BOT) { for (let y = -40; y <= 40; y++) for (let x = -40; x <= 40; x++) { const d = Math.hypot(x, y) / 40; if (d > 1 || my + y < TOP) continue; if ((1 - d) * 0.35 > bayer(mx + x, my + y)) c.px(mx + x, my + y, mix(c.get(mx + x, my + y), "#E0CDF8", 0.25)); } c.disc(mx, my, 14, "#E8E4F4"); c.disc(mx + 4, my - 3, 3, "#C8C0DC"); c.disc(mx - 5, my + 5, 2, "#C8C0DC"); } }
  // satellite high above
  { const sx = V.X(60), sy = V.Y(-820), s = Math.max(2.6, cam.z * 2.6); if (sy > TOP - 40 && sy < BOT + 40) { c.rect(R(sx - 4 * s), R(sy - 3 * s), R(8 * s), R(6 * s), "#C8C8D8"); c.rect(R(sx - 4 * s), R(sy - 3 * s), R(8 * s), Math.max(1, R(s)), "#FDFEED"); for (const d of [-1, 1]) { c.rect(R(sx + d * 6 * s - (d < 0 ? 14 * s : 0)), R(sy - 2 * s), R(14 * s), R(4 * s), "#33458A"); for (let k = 1; k < 4; k++) c.rect(R(sx + d * 6 * s - (d < 0 ? 14 * s : 0) + k * 3.5 * s), R(sy - 2 * s), 1, R(4 * s), "#7E98DA"); } c.rect(R(sx), R(sy + 3 * s), 1, R(4 * s), "#C8C8D8"); if (Math.sin(t * 5) > 0.3) c.rect(R(sx - 1), R(sy + 7 * s), 2, 2, "#E03056"); } }
  drawGround(c, V, t, o);
  drawClouds(c, V, t);
}

function drawClouds(c, V, t) {
  const off = cloudOff(t), y0 = V.Y(200), y1 = V.Y(400); if (y1 < TOP || y0 > BOT) return;
  for (let x = 0; x < W; x++) {
    const wx = V.wx(x + 0.5) + off, top = 228 + 16 * Math.sin(wx * 0.013) + 9 * Math.sin(wx * 0.041 + 1.3) + 5 * Math.sin(wx * 0.11), bot = 352 + 10 * Math.sin(wx * 0.017 + 2), gap = Math.sin(wx * 0.0042 + 0.7) > 0.86;
    if (gap) continue;
    for (let y = Math.max(TOP, R(V.Y(top))); y < Math.min(BOT, R(V.Y(bot))); y++) {
      const wy = V.wy(y + 0.5), d = (wy - top) / (bot - top), lit = d < 0.08 ? 1 : d < 0.3 ? 0.7 : 0.25 + 0.2 * Math.sin(wx * 0.05 + wy * 0.08);
      const edge = bot - wy < 12 ? (bot - wy) / 12 : 1; if (edge < 1 && edge <= bayer(x, y)) continue;
      const k = lit + (bayer(x, y) - 0.5) * 0.25; c.px(x, y, k > 0.9 ? "#B8B0D8" : k > 0.62 ? "#8C84B4" : k > 0.42 ? "#5E5688" : k > 0.3 ? "#443C6C" : "#2E2852");
    }
  }
}

function drawGround(c, V, t, o) {
  const yTop = V.Y(GROUND - TOWER_H - 30); if (yTop > BOT) return;
  const off = groundOff(t);
  // far hills and the city haze
  for (let x = 0; x < W; x++) { const wx = V.wx(x + 0.5) + off * 0.6, h = 30 + 18 * Math.sin(wx * 0.006) + 10 * Math.sin(wx * 0.017 + 2); for (let y = Math.max(TOP, R(V.Y(GROUND - h))); y < Math.min(BOT, R(V.Y(GROUND))); y++) c.px(x, y, "#16122A"); }
  // houses with lit windows
  for (let k = Math.floor((V.wx(-20) + off) / 22) - 1; (k * 22 - off) < V.wx(W + 20); k++) {
    const hx = k * 22 - off, hh = 14 + rnd(k * 3) * 26, hw = 16 + rnd(k * 5) * 5; if (rnd(k * 11) < 0.25) continue;
    const x0 = R(V.X(hx)), x1 = R(V.X(hx + hw)), y0 = R(V.Y(GROUND - hh)), y1 = R(V.Y(GROUND)); if (x1 < 0 || x0 > W) continue;
    c.rect(x0, Math.max(TOP, y0), x1 - x0, Math.max(0, y1 - Math.max(TOP, y0)), "#1E1834");
    for (let wy = GROUND - hh + 4; wy < GROUND - 4; wy += 7) for (let wx = hx + 3; wx < hx + hw - 3; wx += 6) if (rnd(R(wx * 7 + wy * 13 + k)) < 0.45) { const X = R(V.X(wx)), Y = R(V.Y(wy)); if (Y >= TOP) c.rect(X, Y, Math.max(1, R(2.5 * V.z)), Math.max(1, R(3 * V.z)), rnd(k + wy) < 0.2 ? "#7E98DA" : "#F4CA50"); }
  }
  // road and the ground below it
  for (let y = Math.max(TOP, R(V.Y(GROUND))); y < BOT; y++) { const wy = V.wy(y + 0.5); for (let x = 0; x < W; x++) { const wx = V.wx(x + 0.5) + off; c.px(x, y, wy < GROUND + 5 ? (Math.abs(wy - GROUND - 2.5) < 0.4 && ((wx % 14) + 14) % 14 < 7 ? "#C9A040" : "#2A2440") : wy < GROUND + 8 ? "#3A3456" : rnd(Math.floor(wx / 3) * 7 + Math.floor(wy / 3) * 31) < 0.05 ? "#1A1428" : "#120E20"); } }
  // the car (only drives while we watch it)
  const carX = -150 + 46 * Math.max(0, t - EV.towers[0] + 0.6), cx = V.X(carX), cy = V.Y(GROUND - 1);
  if (t > EV.towers[0] - 2 && t < EV.fly[1] + 1 && cx > -60 && cx < W + 60) { const s = V.z; c.rrect(R(cx - 13 * s), R(cy - 8 * s), R(26 * s), R(6 * s), "#E03056", 2); c.rrect(R(cx - 7 * s), R(cy - 12 * s), R(14 * s), R(5 * s), "#B83A50", 2); c.rect(R(cx - 5 * s), R(cy - 11 * s), R(5 * s), R(3 * s), "#7E98DA"); c.rect(R(cx + 1 * s), R(cy - 11 * s), R(5 * s), R(3 * s), "#7E98DA"); for (const d of [-8, 8]) c.disc(R(cx + d * s), R(cy - 1.5 * s), Math.max(1, R(2.6 * s)), "#120E20"); c.rect(R(cx + 12 * s), R(cy - 7 * s), Math.max(1, R(2 * s)), Math.max(1, R(2 * s)), "#FFF4C0"); for (let k = 0; k < 6; k++) fade(c, 0.3).rect(R(cx + (13 + k * 4) * s), R(cy - (7 + k * 0.6) * s), R(4 * s), Math.max(1, R((2 + k * 1.2) * s)), "#FFF4C0"); }
  // cell towers: lattice mast, three panel antennas tilted down, beams to the ground, blinking red light
  for (const tw of towersNear(t, V.wx(-60), V.wx(W + 60))) drawTower(c, V, tw, t, o);
}

function drawTower(c, V, tw, t, o) {
  const s = V.z, X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy)), x = tw.x, top = tw.top;
  // beams: wide soft wedges aimed down at the ground on both sides
  const beam = o.beams ?? 1; if (beam > 0) for (const d of [-1, 1]) { for (let wy = top + 10; wy < GROUND; wy += 1 / Math.max(0.6, s)) { const k = (wy - top - 10) / (GROUND - top - 10), cxw = x + d * (10 + 70 * k), half = 6 + 26 * k; const y = Y(wy); if (y < TOP || y >= BOT) continue; for (let xx = X(cxw - half); xx < X(cxw + half); xx++) { const e = 1 - Math.abs(V.wx(xx) - cxw) / half; if (e * 0.16 * beam * (1 - k * 0.4) > bayer(xx, y)) c.px(xx, y, mix(c.get(xx, y), "#B08AE8", 0.35)); } } }
  // mast
  const x0 = X(x - 7), x1 = X(x + 7), xt0 = X(x - 2.5), xt1 = X(x + 2.5), yb = Y(GROUND), yt = Y(top);
  c.line(x0, yb, xt0, yt, "#6A6A96"); c.line(x1, yb, xt1, yt, "#6A6A96"); for (let k = 0; k < 8; k++) { const ya = Y(GROUND - (k * TOWER_H) / 8), yb2 = Y(GROUND - ((k + 1) * TOWER_H) / 8), wa = 7 - 4.5 * (k / 8), wb = 7 - 4.5 * ((k + 1) / 8); c.line(X(x - wa), ya, X(x + wb), yb2, "#4E4E78"); c.line(X(x + wa), ya, X(x - wb), yb2, "#4E4E78"); }
  c.rect(X(x - 6), Y(GROUND - 8), R(12 * s), R(8 * s), "#2E2A40");
  for (const d of [-1, 0, 1]) { const ax = x + d * 5, a0 = [X(ax - 1.5), Y(top + 2)], tilt = d * 1.2; c.poly([[X(ax - 1.6 + tilt * 0.2), Y(top - 6)], [X(ax + 1.6 + tilt * 0.2), Y(top - 6)], [X(ax + 1.6 - tilt * 0.4), Y(top + 10)], [X(ax - 1.6 - tilt * 0.4), Y(top + 10)]], d === 0 ? "#B4B4D2" : "#8C8CB4"); void a0; }
  const lit = o.lit?.(tw) ?? 0; if (lit > 0) { const g = fade(c, lit); g.disc(X(x), Y(top - 10), Math.max(2, R(5 * s)), "#F4CA50"); g.disc(X(x), Y(top - 10), Math.max(1, R(2.5 * s)), "#FDFEED"); }
  if (Math.sin(t * 3 + tw.k) > 0.2) c.rect(X(x) - 1, Y(top - 8) - 1, Math.max(2, R(2 * s)), Math.max(2, R(2 * s)), "#E03056");
}
