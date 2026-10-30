// Living things of the sea column, drawn per frame in screen pixels: the barrel sponge (LV1), the moon jelly (LV2),
// the octopus with the crab jar (LV3), fish, kelp, anemones, sea grass, tube worms. Shapes come from cute.mjs (volume
// shading, glossy eyes, blush); every idle motion uses the loop clock (osc/cyc/blinkP) so t = 0 and t = END match.
import { blob, ell, tube, bez, eye, eyes, blush, smile as smile0, RAMP, fade, mix, bayer, smooth } from "../cute.mjs";
/** smile() whose opening never pops: the closed arc dissolves into a small open mouth that then grows. */
function smile(c, x, y, w, o = {}) { const op = o.open ?? 0, k = clamp01(op / 0.3); if (k < 1) smile0(c, x, y, w, { ...o, open: 0, a: 1 - k }); if (k > 0) smile0(c, x, y, w, { ...o, open: Math.max(op, 0.3), a: k }); }
import { drawPart } from "../../../dog/shade.mjs";
import { R, clamp01, sm, lerp, rnd, osc, ang, cyc, blinkP, dcol as dcol0 } from "./sea-common.mjs";
let NIGHT = false;
/** The dive copy under the night city tints near-surface decor for night water. */
export const setNight = (v) => { NIGHT = !!v; };
const dcol = (col, wy) => dcol0(col, wy, NIGHT);

const OUT = "#120A18";
const BEAD = ["#07060E", "#120F22", "#1C1834", "#3A3466", "#5C5294", "#7A70B4", "#A098D0", "#C8C0F0"];

// ---------------------------------------------------------------- translucent drawing (jelly bell, oral arms, glass)
/** Canvas view that blends every drawn pixel with what is already there (k for fills, ko for the outline colour). */
export function glass(c, k, ko = k, outline = null) {
  const o = Object.create(c);
  o.px = (x, y, col) => { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= c.w || y >= c.h || !col) return; c.px(x, y, mix(c.get(x, y), col, col === outline ? ko : k)); };
  return o;
}

// ---------------------------------------------------------------- LV1 · barrel sponge
/** (x, y) = screen point of the base centre on the sand. o: breathe −1..1, blink, look, open (smile), a. Returns the osculum centre. */
export function drawSponge(c, x, y, o = {}) {
  const br = o.breathe ?? 0, sy = 1 + 0.012 * br, sx = 1 - 0.006 * br;
  const P = (dx, dy) => [x + dx * sx, y + dy * sy];
  const body = smooth([P(-46, 0), P(-64, -30), P(-75, -96), P(-73, -160), P(-64, -212), P(-56, -232), P(56, -232), P(64, -212), P(73, -160), P(75, -96), P(64, -30), P(46, 0)], new Set([0, 11]), 6);
  blob(c, [body], { ramp: RAMP.sponge, base: 3.3, gain: 2.4, thick: 36, slope: 0.6, litOutline: "#7A4A18", outline: "#2A1406" });
  // pores: little craters of varied size, scattered (fixed seed), none on the face; smaller toward the sides
  for (let k = 0; k < 120; k++) {
    const u = rnd(k * 3 + 11) * 2 - 1, v = rnd(k * 3 + 12), dy = -14 - v * 206, half = dy > -30 ? 52 : dy < -205 ? 58 : 68, dx = u * (half - 9);
    if (Math.abs(dx) < 58 && dy > -214 && dy < -140) continue;                      // face zone
    let ok = true; for (let j = 0; j < k; j++) { const u2 = rnd(j * 3 + 11) * 2 - 1, v2 = rnd(j * 3 + 12), dy2 = -14 - v2 * 206, h2 = dy2 > -30 ? 52 : dy2 < -205 ? 58 : 68; if (Math.hypot(u2 * (h2 - 9) - dx, dy2 - dy) < 14) { ok = false; break; } }
    if (!ok) continue;
    const f = Math.sqrt(Math.max(0.2, 1 - (dx / half) ** 2)), rr = 2.2 + rnd(k * 7) * 2, rx = rr * f, ry = rr * 0.8, [px, py] = P(dx, dy);
    for (let Y = R(py - ry - 2); Y <= R(py + ry + 2); Y++) for (let X = R(px - rx - 2); X <= R(px + rx + 2); X++) {
      const d = ((X - px) / rx) ** 2 + ((Y - py) / ry) ** 2;
      if (d <= 1) c.px(X, Y, Y < py - ry * 0.2 ? RAMP.sponge[0] : RAMP.sponge[1]);
      else if (d <= 2.1 && Y > py) c.px(X, Y, RAMP.sponge[6]);
      else if (d <= 1.9 && Y <= py - ry * 0.3) c.px(X, Y, RAMP.sponge[2]);
    }
  }
  // lip of the osculum (a thick rim) and the dark opening
  const ly = y - 228 * sy;
  blob(c, [ell(x, ly, 60 * sx, 13), ell(x, ly + 4, 57 * sx, 10)], { ramp: RAMP.sponge, base: 4.2, gain: 1.6, thick: 8, slope: 0.2, litOutline: "#9A6A28", outline: "#2A1406" });
  for (let Y = R(ly - 7); Y <= R(ly + 6); Y++) for (let X = R(x - 47); X <= R(x + 47); X++) {
    const d = ((X - x) / (46 * sx)) ** 2 + ((Y - ly + 1) / 6.5) ** 2; if (d > 1) continue;
    c.px(X, Y, d > 0.78 ? "#5A2C0C" : Y < ly - 2 ? "#3A1A06" : (Y - ly + 2) / 8 > bayer(X, Y) ? "#2A1406" : "#3A1A06");
  }
  // face
  const fy = y - 184 * sy, look = o.look ?? [0, 0];
  eyes(c, x, fy, 62, 15, { ry: 17, iris: BEAD, pupil: "bead", look, blink: o.blink ?? 0, lid: RAMP.sponge[4] });
  blush(c, x - 46, fy + 24, 12, 5, "#F27A7A"); blush(c, x + 46, fy + 24, 12, 5, "#F27A7A");
  smile(c, x, fy + 25, 7, { col: "#3A1406", open: o.open ?? 0, tongue: "#F07070" });
  return [x, ly - 2];
}

/** Small purple tube sponge in the back with a sleepy little face. */
export function drawBabySponge(c, x, y, t, wy) {
  const br = osc(t, 18, 1.3), col = (i) => dcol(RAMP.jelly[i], wy + 200);
  const ramp = [0, 1, 2, 3, 4, 5, 6, 7].map(col);
  const tubes = [[-15, 38, 10], [3, 56, 13], [19, 30, 9]];
  blob(c, tubes.map(([dx, h, w]) => ell(x + dx, y - (h + br) / 2 + 2, w, (h + br) / 2 + 2)), { ramp, base: 3.4, gain: 2.2, thick: 9, outline: "#1A1030" });
  for (const [dx, h, w] of tubes) { const ty = y - h - br + 4; for (let Y = R(ty - 2); Y <= R(ty + 2); Y++) for (let X = R(x + dx - w); X <= R(x + dx + w); X++) { const d = ((X - x - dx) / (w - 3)) ** 2 + ((Y - ty) / 2.2) ** 2; if (d <= 1) c.px(X, Y, d > 0.55 ? ramp[2] : "#1A1030"); } }
  for (const [px, py] of [[-20, -12], [-12, -24], [12, -8], [8, -22], [22, -14], [-1, -38]]) { c.px(x + px, y + py, ramp[1]); c.px(x + px, y + py + 1, ramp[6]); }
  const bl = Math.max(0.5, blinkP(t, 14, 2.1));
  eyes(c, x + 3, y - 30 - br, 12, 3, { ry: 3, iris: BEAD, pupil: "bead", blink: bl, lid: ramp[4] });
  blush(c, x - 6, y - 25 - br, 3, 1.5, "#E07AA8"); blush(c, x + 12, y - 25 - br, 3, 1.5, "#E07AA8");
}

// ---------------------------------------------------------------- LV2 · moon jelly
/** Bell centre (rim middle) at (x, y). o: p = contraction 0..1, t, glow (nerve net 0..1), front (net light-up radius 0..1.2), flash, trail (swim), look, blink. */
export function drawJelly(c, x, y, o = {}) {
  const t = o.t ?? 0, p = o.p ?? 0, trail = o.trail ?? 0;
  const rx = 78 * (1 - 0.16 * p), ry = 62 * (1 + 0.16 * p);
  // tentacles (thin, behind)
  const tg = glass(c, 0.55);
  for (let i = 0; i < 22; i++) {
    const u = (i / 21) * 2 - 1, x0 = x + u * rx * 0.92, y0 = y + 4 + 5 * u * u, len = 70 + rnd(i * 5) * 48 + trail * 30;
    let px = x0, py = y0;
    for (let s = 0; s < len; s += 1) {
      const sw = Math.sin(s * 0.07 + ang(t, 24) + i * 0.9) * (3 + s * 0.06) * (1 - trail * 0.7), drift = u * s * (0.12 - p * 0.1) * (1 - trail);
      const nx = x0 + sw + drift, ny = y0 + s;
      tg.px(R(nx), R(ny), s > len - 8 ? "#F6ECFF" : "#E0C4FA"); px = nx; py = ny;
    }
  }
  // oral arms: four frilly, ruffled ribbons hanging from the centre
  const arms = [];
  for (let i = 0; i < 4; i++) {
    const ox = x + (i - 1.5) * 9, len = 64 + (i % 2) * 16 + trail * 14, spread = (i - 1.5) * 0.16 * (1 - trail);
    let prev = null;
    for (let s = 0; s <= len; s += 3) {
      const px = ox + spread * s + Math.sin(s * 0.09 + ang(t, 20) + i * 1.7) * (1.5 + s * 0.08), py = y + 2 + s, r = (2.2 + 1.8 * Math.abs(Math.sin(s * 0.42 + i))) * (1 - (s / len) * 0.45);
      if (prev) arms.push(tube([prev, [px, py]], r, r)); prev = [px, py];
    }
  }
  drawPart(glass(c, 0.62, 0.8, "#9C2A4C"), arms, { ramp: RAMP.pink, base: 4.6, gain: 1.4, thick: 3, slope: 0.3, outline: "#9C2A4C" });
  // the bell: translucent dome with a scalloped rim
  const pts = [];
  for (let i = 0; i <= 28; i++) { const a = Math.PI + (i / 28) * Math.PI; pts.push([x + Math.cos(a) * rx, y - 4 + Math.sin(a) * ry]); }
  for (let i = 0; i <= 32; i++) { const u = 1 - (i / 32) * 2; pts.push([x + u * rx, y - 4 + 8 * u * u + 2.2 * Math.abs(Math.sin(u * 8 * Math.PI / 2 * 2))]); }
  drawPart(glass(c, 0.62, 0.95, "#3A1C70"), [pts], { ramp: RAMP.jelly, base: 4.0, gain: 2.0, thick: 18, slope: 1.2, light: [-0.6, -0.8], rimLit: 1.2, rimShade: 0.5, outline: "#3A1C70" });
  // inner bell shine (upper left) and the rim frill highlight
  const sh = glass(c, 0.7);
  for (let Y = R(y - ry * 0.86); Y <= R(y - ry * 0.55); Y++) for (let X = R(x - rx * 0.62); X <= R(x - rx * 0.2); X++) { const d = ((X - (x - rx * 0.42)) / (rx * 0.22)) ** 2 + ((Y - (y - ry * 0.7)) / (ry * 0.13)) ** 2; if (d < 1) sh.px(X, Y, "#FFFFFF"); }
  for (let i = 0; i <= 64; i++) { const u = (i / 64) * 2 - 1, X = R(x + u * rx * 0.97), Y = R(y - 4 + 8 * u * u + 2.2 * Math.abs(Math.sin(u * 8 * Math.PI)) - 1); sh.px(X, Y, "#F6ECFF"); }
  // the moon jelly's four-leaf clover (gonads) seen through the dome
  const gg = glass(c, 0.7);
  for (const [dx, dy, ex, ey] of [[-17, -36, 9, 6], [17, -36, 9, 6], [0, -45, 8, 5], [0, -30, 6, 4]]) {
    const gx = x + dx * (1 - 0.16 * p), gy = y + dy * (1 + 0.16 * p);
    for (let Y = R(gy - ey - 1); Y <= R(gy + ey + 1); Y++) for (let X = R(gx - ex - 1); X <= R(gx + ex + 1); X++) {
      const d = ((X - gx) / ex) ** 2 + ((Y - gy) / ey) ** 2; if (d > 1.15) continue;
      gg.px(X, Y, d > 0.7 ? "#E26A88" : d < 0.25 ? "#FFE2EA" : "#F8BCCB");
    }
  }
  // glowing nerve net
  if ((o.glow ?? 0) > 0.01) {
    const k = o.glow * Math.min(1, (o.front ?? 1.2) / 1.2) * (0.7 + 0.3 * (o.flash ?? 0));
    c.tint(R(x - rx - 14), R(y - ry - 18), R(rx * 2 + 28), R(ry + 34), (X, Y) => { const d = Math.hypot((X - x) / (rx + 12), (Y - (y - 6)) / (ry + 12)); return d > 1 || Y > y + 12 ? 0 : k * 0.35 * (1 - d * 0.6); }, "#9FF6FF", 3);
    nerveNet(c, x, y, rx, ry, o.glow, o.front ?? 1.2, o.flash ?? 0, t);
  }
  // face
  const fy = y - 19 * (1 + 0.1 * p);
  eyes(c, x, fy, 44, 9, { ry: 10, iris: BEAD, pupil: "bead", look: o.look ?? [0, 0], blink: o.blink ?? 0, lid: RAMP.jelly[4] });
  blush(c, x - 34, fy + 9, 8, 3, "#F27A9A"); blush(c, x + 34, fy + 9, 8, 3, "#F27A9A");
  smile(c, x, fy + 10, 4, { col: "#3A1C70", open: o.open ?? 0, tongue: "#F07090" });
}
const NET = (() => {
  const nodes = []; for (let i = 0; nodes.length < 26 && i < 400; i++) { const u = rnd(i * 3 + 1) * 2 - 1, v = -rnd(i * 3 + 2) * 0.95; if (u * u + v * v < 0.82 && v < -0.08 && !(Math.abs(u) < 0.45 && v > -0.42)) nodes.push([u, v]); }
  nodes.push([-0.62, -0.18], [0.62, -0.18], [0, -0.5], [-0.3, -0.2], [0.3, -0.2]);
  const edges = []; nodes.forEach((a, i) => { const near = nodes.map((b, j) => [Math.hypot(a[0] - b[0], a[1] - b[1]), j]).filter(([d, j]) => j !== i).sort((p, q) => p[0] - q[0]).slice(0, 3); for (const [, j] of near) if (i < j || !edges.some(([p, q]) => p === j && q === i)) edges.push([i, j]); });
  return { nodes, edges };
})();
function nerveNet(c, x, y, rx, ry, glow, front, flash, t) {
  const P = ([u, v]) => [x + u * rx * 0.9, y - 6 + v * ry * 0.95], lit = (n) => clamp01((front - Math.hypot(n[0], n[1] * 1.2)) / 0.25) * glow;
  const halo = glass(c, 0.55);
  for (const [i, j] of NET.edges) {
    const a = NET.nodes[i], b = NET.nodes[j], k = Math.min(lit(a), lit(b)); if (k <= 0.02) continue;
    const [x0, y0] = P(a), [x1, y1] = P(b), n = Math.max(2, R(Math.hypot(x1 - x0, y1 - y0))), g = fade(c, Math.min(1, k * 1.3));
    for (let s = 0; s <= n; s++) { const X = R(lerp(x0, x1, s / n)), Y = R(lerp(y0, y1, s / n)); halo.px(X, Y + 1, "#5AD0E8"); halo.px(X + 1, Y, "#5AD0E8"); g.px(X, Y, flash > 0.5 ? "#FFFFFF" : "#CFFFFF"); }
  }
  for (let i = 0; i < NET.nodes.length; i++) {
    const k = lit(NET.nodes[i]); if (k <= 0.02) continue; const [X, Y] = P(NET.nodes[i]).map(R), tw = 0.75 + 0.25 * Math.sin(t * 9 + i * 1.7);
    const f = fade(c, Math.min(1, k * 1.3));
    for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 2], [1, 2], [-1, 1], [2, 1]]) f.px(X + dx, Y + dy, "#7FE3F0");
    f.px(X, Y, "#FFFFFF"); f.px(X + 1, Y, "#FFFFFF"); f.px(X, Y + 1, "#FFFFFF"); f.px(X + 1, Y + 1, "#DFFFFF");
    for (const [dx, dy] of [[-2, 0], [3, 1], [1, -2], [0, 3]]) if (k * tw > bayer(X + dx, Y + dy) + 0.1) halo.px(X + dx, Y + dy, "#9FF6FF");
  }
}

// ---------------------------------------------------------------- LV3 · octopus
const CORAL = RAMP.coral, CORAL_BACK = [CORAL[0], CORAL[0], CORAL[1], CORAL[2], CORAL[3], CORAL[4], CORAL[5], CORAL[6]];
/** Arm centreline: root → bezier → curling tip. side = curl direction (+1 clockwise on screen). */
export function armPath(root, ctrl, tipBase, curl, side, n = 16) {
  const main = bez(root, ctrl, tipBase, n), a = main[main.length - 2], b = main[main.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d * side, ny = dx / d * side;
  const cx = b[0] + nx * curl, cy = b[1] + ny * curl, a0 = Math.atan2(b[1] - cy, b[0] - cx), out = [...main];
  if (curl > 0.5) for (let k = 1; k <= 10; k++) { const th = a0 + side * (k / 10) * Math.PI * 1.45, r = curl * (1 - (k / 10) * 0.62); out.push([cx + Math.cos(th) * r, cy + Math.sin(th) * r]); }
  out.main = main.length;
  return out;
}
function armPolys(path, r0, r1) {
  // the smooth main part as one tapered tube, the curl (which may overlap itself) as a chain of capsules
  const polys = [], n = path.length, m = path.main ?? 0, r = (i) => lerp(r0, r1, i / (n - 1));
  if (m > 2) polys.push(tube(path.slice(0, m), r0, r(m - 1)));
  for (let i = Math.max(0, m - 1); i < n - 1; i++) { const q = r(i + 0.5); polys.push(tube([path[i], path[i + 1]], q, q)); }
  return polys;
}
function suckers(c, path, r0, r1, side, from = 0.42) {
  const n = path.length;
  for (let i = Math.floor(n * from); i < n - 1; i++) {
    const r = lerp(r0, r1, i / (n - 1)), [x0, y0] = path[i], [x1, y1] = path[i + 1], dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    const sx = x0 - (dy / d) * r * 0.42 * side, sy = y0 + (dx / d) * r * 0.42 * side, sr = Math.max(1, r * 0.34);
    if (i % 2) continue;
    for (let Y = R(sy - sr); Y <= R(sy + sr); Y++) for (let X = R(sx - sr); X <= R(sx + sr); X++) { const q = Math.hypot(X - sx, Y - sy); if (q <= sr) c.px(X, Y, q < sr * 0.45 && sr > 1.6 ? CORAL[4] : CORAL[7]); }
  }
}
/**
 * Octopus sitting on the rock: (x, y) = screen point of the rock top under its centre.
 * o: t, look, blink, open, breathe, jar {x, y} (screen point of the jar base) and wrap 0..1 (two left arms on the jar),
 * twist (lid twist angle, rad), lift 0..1 (lid lifting), wave 0..1 (back arm wave).
 * Returns { arms: [{path, r0, r1}], head: [hx, hy] } for the brain-cell dots.
 */
export function drawOctopus(c, x, y, o = {}) {
  const t = o.t ?? 0, br = o.breathe ?? 0, wrap = o.wrap ?? 0, jx = o.jar?.x ?? x + 146, jy = o.jar?.y ?? y;
  const hx = x, hy = y - 254 - br * 1.5, ry0 = y - 160 - br;                    // head centre, arm roots row
  const A = (k, n = 1) => osc(t, n * 9, k * 1.3);                                // idle arm sway
  const mk = (rootDx, cDx, cDy, tDx, tDy, curl, side, k) => { const s = A(k) * 3; return armPath([x + rootDx * 0.78, ry0 - 26], [x + cDx + s * 0.5, y + cDy], [x + tDx + s * 1.3, y + tDy + Math.abs(s) * 0.3], curl + A(k + 3) * 1.1, side, 14); };
  // back arms (darker): out to the sides; the left one lifts in a little hello wave
  const wv = o.wave ?? 0, wa = Math.sin(ang(t, 40)) * 0.5 + 0.5;
  const back = [
    armPath([x - 26, ry0 - 30], [x - 104 - 6 * wv * wa, y - 170 - 50 * wv], [x - 136 - 8 * wv * wa, y - 84 - 116 * wv + A(1) * 3], 9 + A(4), -1, 14),
    mk(34, 108, -150, 140, -70, 9, 1, 0),
  ];
  blob(c, back.flatMap((p) => armPolys(p, 13, 3.2)), { ramp: CORAL_BACK, base: 3.0, gain: 1.6, thick: 9, outline: OUT, litOutline: CORAL[2] });
  // front arms splay out over the rock like a skirt: tips curl up and outward, the inner pair curls toward each other
  const rest = [
    mk(-44, -96, -64, -124, -40, 10, -1, 1), mk(-26, -44, -18, -84, -14, 9, -1, 2), mk(-9, -10, -10, -36, -12, 7, 1, 3),
    mk(9, 10, -10, 36, -12, 7, -1, 4), mk(26, 30, -40, 44, -12, 8, 1, 5), mk(44, 150, -112, 140, -34, 9, 1, 6),
  ];
  if (wrap > 0.001) {
    // arm 5 coils around the jar body, arm 4 grips the lid (its tip twists with the lid)
    const tw = Math.sin(o.twist ?? 0) * 3, lift = (o.lift ?? 0) * 28;
    const coil = armPath([x + 34, ry0 - 26], [jx - 70, y - 110], [jx - 32, jy - 32], 0, 1, 10)
      .concat(bez([jx - 32, jy - 32], [jx, jy - 20], [jx + 32, jy - 30], 8).slice(1), armPath([jx + 32, jy - 30], [jx + 38, jy - 38], [jx + 35, jy - 46], 5, -1, 3).slice(1));
    const grip = armPath([x + 20, ry0 - 26], [jx - 54, y - 150 - lift * 0.6], [jx - 28, jy - 86 - lift], 0, 1, 10)
      .concat(bez([jx - 28, jy - 86 - lift], [jx + tw, jy - 98 - lift], [jx + 26 + tw, jy - 86 - lift], 8).slice(1), armPath([jx + 26 + tw, jy - 86 - lift], [jx + 32 + tw, jy - 82 - lift], [jx + 30 + tw, jy - 74 - lift], 4, 1, 3).slice(1));
    rest[5] = blendPath(rest[5], coil, wrap); rest[4] = blendPath(rest[4], grip, wrap);
  }
  const R0 = [15, 17, 16, 16, 17, 15], R1 = 3.4, thin = (i) => (i >= 4 ? R0[i] - 4 * wrap : R0[i]);
  const armStyle = { ramp: CORAL, base: 3.4, gain: 1.7, thick: 11, outline: OUT, litOutline: CORAL[3] };
  blob(c, [0, 5, 1, 4, 2, 3].flatMap((i) => armPolys(rest[i], thin(i), R1)), armStyle);
  rest.forEach((p, i) => i < 4 && suckers(c, p, thin(i), R1, [1, 1, -1, 1][i], 0.45));
  // head (mantle) + a soft skirt over the arm roots
  blob(c, [ell(hx, hy - 6, 62, 60), ell(hx, hy + 40, 55, 58)], { ramp: CORAL, base: 3.5, gain: 2.3, thick: 34, slope: 0.9, outline: OUT, litOutline: CORAL[3] });
  // freckles and a soft shine on the mantle
  for (const [dx, dy, r] of [[-30, -44, 3], [-14, -56, 2], [22, -50, 3], [36, -30, 2], [6, -38, 2], [-40, -18, 2], [44, -10, 2]]) { const fx = hx + dx, fy = hy + dy; for (let Y = R(fy - r); Y <= R(fy + r); Y++) for (let X = R(fx - r); X <= R(fx + r); X++) if (Math.hypot(X - fx, Y - fy) <= r * 0.95) c.px(X, Y, (X + Y) & 1 ? CORAL[3] : CORAL[4]); }
  for (let Y = R(hy - 56); Y <= R(hy - 42); Y++) for (let X = R(hx - 38); X <= R(hx - 16); X++) { const d = ((X - (hx - 27)) / 11) ** 2 + ((Y - (hy - 49)) / 6.5) ** 2; if (d < 1) c.px(X, Y, d < 0.3 ? "#FFFFFF" : CORAL[7]); }
  // face
  const fy = hy + 22, look = o.look ?? [0, 0];
  eyes(c, hx, fy, 54, 16, { ry: 18, iris: RAMP.amber, pupil: "round", look, blink: o.blink ?? 0, lid: CORAL[4] });
  blush(c, hx - 44, fy + 21, 9, 4, "#FF8AA8"); blush(c, hx + 44, fy + 21, 9, 4, "#FF8AA8");
  smile(c, hx, fy + 23, 6, { col: OUT, open: o.open ?? 0, tongue: "#F07090" });
  // the jar stands in front of the body; the two right arms hold it (drawn again in front, below the skirt)
  if (o.between) {
    o.between();
    const cy0 = R(jy - 110 - (o.lift ?? 0) * 30), cv = Object.create(c); cv.px = (X, Y, col) => { if (Y >= cy0 && Y <= jy + 6 && X >= jx - 36 && X <= jx + 48) c.px(X, Y, col); };
    blob(cv, [5, 4].flatMap((i) => armPolys(rest[i], thin(i), R1)), armStyle);
  }
  rest.forEach((p, i) => i >= 4 && suckers(c, p, thin(i), R1, -1, 0.45 + 0.1 * wrap));
  return { arms: rest.map((p, i) => ({ path: p, r0: R0[i], r1: R1 })), head: [hx, hy] };
}
function blendPath(a, b, k) {
  const n = Math.max(a.length, b.length), at = (p, i) => p[Math.min(p.length - 1, Math.round((i / (n - 1)) * (p.length - 1)))];
  const out = []; for (let i = 0; i < n; i++) { const p = at(a, i), q = at(b, i); out.push([lerp(p[0], q[0], k), lerp(p[1], q[1], k)]); }
  return out;
}

// ---------------------------------------------------------------- the jar with a crab
/** (x, y) = screen point of the jar base centre. o: lift 0..1 (lid up), twist (rad), crab 0..1 (crab perks up), t. Draws back + crab. */
export function drawJarBack(c, x, y, o = {}) {
  const t = o.t ?? 0, w = JW, h = JH;
  const g = glass(c, 0.22);
  for (let Y = y - h; Y < y; Y++) { const k = jarHalf(Y - (y - h), h, w); for (let X = x - k + 1; X < x + k; X++) g.px(X, Y, "#D8FCFF"); }
  // sand at the bottom of the jar and the crab
  for (let X = x - w + 3; X <= x + w - 3; X++) { c.px(X, y - 2, "#D6B47C"); c.px(X, y - 3, (X & 1) ? "#E8CC94" : "#F6E2B4"); }
  drawCrab(c, x, y - 4, { t, up: o.crab ?? 0, s: 1.25 });
}
const JW = 28, JH = 66;
function jarHalf(dy, h, w) { if (dy < 7) return w - 7 + dy * 0.6; if (dy < 13) return w - 3 + (dy - 7) * 0.5; return w; }
export function drawJarFront(c, x, y, o = {}) {
  const w = JW, h = JH, lift = o.lift ?? 0, tw = o.twist ?? 0, E = "#2A5A70", G = "#BFF6FF";
  // glass edges + bottom + highlights
  for (let Y = y - h; Y <= y; Y++) { const k = jarHalf(Y - (y - h), h, w); c.px(R(x - k), Y, E); c.px(R(x + k), Y, E); if (Y > y - h + 6) { glass(c, 0.8).px(R(x - k) + 1, Y, "#F0FFFF"); glass(c, 0.5).px(R(x + k) - 1, Y, G); } }
  for (let X = x - w; X <= x + w; X++) { c.px(X, y, E); glass(c, 0.6).px(X, y - 1, "#E8FFFF"); }
  const hl = glass(c, 0.85); for (let Y = y - 54; Y < y - 10; Y++) { hl.px(x - 18, Y, "#FFFFFF"); hl.px(x - 17, Y, "#FFFFFF"); if (Y > y - 50 && Y < y - 34) hl.px(x - 14, Y, "#FFFFFF"); }
  for (let Y = y - 44; Y < y - 32; Y++) hl.px(x + 19, Y, "#FFFFFF");
  // neck rim with threads
  for (let X = x - 21; X <= x + 21; X++) { c.px(X, y - h, E); glass(c, 0.7).px(X, y - h + 1, "#E8FFFF"); if ((X + R(tw * 3)) % 4 === 0) { glass(c, 0.6).px(X, y - h - 1, G); glass(c, 0.6).px(X, y - h - 2, G); } }
  // lid (red screw cap with rotating ridges); lifts and tilts away when opened
  const lw = 48, ly = R(y - h - 13 - lift * 28), lx = R(x - lw / 2 + lift * 8), tilt = -lift * 0.16;
  for (let j = 0; j < 13; j++) for (let i = 0; i < lw; i++) {
    const X = lx + i, Y = R(ly + j + (i - lw / 2) * tilt), edge = j === 0 || j === 12 || i === 0 || i === lw - 1;
    if ((j === 0 || j === 12) && (i === 0 || i === lw - 1)) continue;
    let col = j < 3 ? "#F07060" : j > 9 ? "#8A1A24" : "#D8443C"; if (!edge && j > 2 && j < 11 && ((i + Math.floor(tw * 4)) % 5 === 0)) col = "#A42A30"; if (!edge && j === 1 && i > 4 && i < 20) col = "#FFC8B8";
    c.px(X, Y, edge ? "#2A0A10" : col);
  }
}
/** Small cute crab (amber shell, eyes on stalks, raised claws). up 0..1 = perked up / waving. */
export function drawCrab(c, x, y, o = {}) {
  const t = o.t ?? 0, up = o.up ?? 0, wave = Math.sin(t * 9) * up, CR = o.ramp ?? RAMP.amber, S = o.s ?? 1, P = (dx, dy) => [R(x + dx * S), R(y + dy * S)];
  // legs
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) { const a = P(s * (6 + k * 3), -4), b = P(s * (11 + k * 3), -1 - (k === 1 ? 1 : 0)), e = P(s * (12 + k * 3), 1); c.line(a[0], a[1], b[0], b[1], OUT); c.line(b[0], b[1], e[0], e[1], OUT); }
  // claws (raised, waving when it perks up)
  for (const s of [-1, 1]) {
    const [cx, cy] = [x + s * 15 * S, y + (-12 - up * 9 + (s > 0 ? wave * 2 : -wave * 2)) * S], [ax, ay] = P(s * 8, -6);
    c.line(ax, ay, R(cx), R(cy + 3 * S), OUT); c.line(ax, ay + 1, R(cx), R(cy + 4 * S), CR[3]);
    blob(c, [ell(cx, cy, 4.5 * S, 4 * S), [[cx - S, cy - 3 * S], [cx + s * 6 * S, cy - 7 * S], [cx + s * 2 * S, cy - S]]], { ramp: CR, base: 3.6, thick: 3, outline: OUT });
  }
  blob(c, [ell(x, y - 7 * S, 11 * S, 7 * S)], { ramp: CR, base: 3.6, gain: 2, thick: 5, outline: OUT });
  // eye stalks + bead eyes
  const sh = 4 + up * 4;
  for (const s of [-1, 1]) { const [ex, e0] = P(s * 4, -12), ey = R(y + (-13 - sh) * S); c.line(ex, e0, ex, ey, OUT); c.rect(ex - 1, ey - 2, 3, 3, OUT); c.px(ex - 1, ey - 2, "#FFFFFF"); }
  blush(c, x - 7 * S, y - 5 * S, 2 * S, 1, "#FF7A9A"); blush(c, x + 7 * S, y - 5 * S, 2 * S, 1, "#FF7A9A");
  smile(c, x, R(y - 5 * S), 2, { col: OUT, open: sm(up, 0.5, 0.9) * 0.5 });
}

// ---------------------------------------------------------------- fish
const FISH = {
  blue: { back: "#2E6AA0", body: "#5AB4E8", belly: "#C4F0FF", fin: "#F8D058", out: "#0E1A2E" },
  teal: { back: "#1E7A84", body: "#3ACCC0", belly: "#B8FFF0", fin: "#F890B0", out: "#0A1A20" },
  yellow: { back: "#C88A0C", body: "#F8CE3E", belly: "#FFF2B8", fin: "#5AB4E8", out: "#2A1A02" },
  pink: { back: "#B04A78", body: "#F07AA8", belly: "#FFD4E4", fin: "#FFF2B8", out: "#2A0A18" },
  clown: { back: "#C84A10", body: "#F58A2A", belly: "#FFC890", fin: "#F58A2A", out: "#1A0A04", band: "#FFFFFF" },
  chromis: { back: "#3A58C8", body: "#6A9AF0", belly: "#C8E0FF", fin: "#9AC8FF", out: "#0A1030" },
};
/** Cute round fish centred at (x, y), facing dir (±1), length L, palette name, tail wag phase. */
export function drawFish(c, x, y, dir, L, pal, wag = 0, a = 1) {
  const turn = Math.max(0.3, Math.abs(dir)); dir = dir < 0 ? -1 : 1;
  const P = FISH[pal] ?? pal, rx = (L / 2) * turn, ry = L * 0.34, g = fade(c, a);
  // tail
  const tx = x - dir * rx * 0.85, tw = Math.sin(wag) * L * 0.08, tl = L * 0.36 * turn;
  const tail = [[tx, y], [tx - dir * tl, y - L * 0.27 + tw], [tx - dir * tl * 0.78, y + tw * 0.5], [tx - dir * tl, y + L * 0.27 + tw]];
  g.poly(tail, P.fin === P.body ? P.back : P.fin);
  for (let i = 0; i < tail.length; i++) { const q = tail[(i + 1) % tail.length]; g.line(R(tail[i][0]), R(tail[i][1]), R(q[0]), R(q[1]), P.out); }
  // dorsal fin
  g.poly([[x - dir * rx * 0.3, y - ry + 1], [x - dir * rx * 0.05, y - ry - L * 0.16], [x + dir * rx * 0.3, y - ry + 2]], P.fin === P.body ? P.back : P.fin);
  // body
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
    const d = ((X + 0.5 - x) / rx) ** 2 + ((Y + 0.5 - y) / ry) ** 2; if (d > 1.18) continue;
    if (d > 0.82) { g.px(X, Y, P.out); continue; }
    const v = (Y - (y - ry)) / (2 * ry); let col = v < 0.32 ? P.back : v > 0.7 ? P.belly : P.body;
    if (v > 0.25 && v < 0.4 && ((X + Y) & 1)) col = P.body;
    if (P.band && (Math.abs(X - (x + dir * rx * 0.25)) < 1.5 || Math.abs(X - (x - dir * rx * 0.45)) < 1.2)) col = P.band;
    g.px(X, Y, col);
  }
  // big eye + blush
  const ex = R(x + dir * rx * 0.42), ey = R(y - ry * 0.18), er = L >= 18 ? 2 : 1;
  for (let Y = ey - er; Y <= ey + er; Y++) for (let X = ex - er; X <= ex + er; X++) g.px(X, Y, OUT);
  g.px(ex - (dir > 0 ? 0 : 1) - (er > 1 ? 1 : 0), ey - er, "#FFFFFF"); if (er > 1) g.px(ex + dir, ey + 1, "#C8C0F0");
  if (L >= 16) { g.px(R(x + dir * rx * 0.15), R(y + ry * 0.35), "#FF8AA8"); g.px(R(x + dir * rx * 0.15) + 1, R(y + ry * 0.35), "#FF8AA8"); }
}

// ---------------------------------------------------------------- plants and small life (screen coords; wy = world y for depth tint)
/** Kelp stalk from (x, y) up to height h; t for sway. */
export function drawKelp(c, x, y, h, t, ph, wy) {
  const stem = dcol("#5A6A1A", wy), leaf = dcol("#8AA03A", wy), leafL = dcol("#B8CC5A", wy), dark = dcol("#2E3A10", wy), bulb = dcol("#C8B84A", wy);
  const X = (s) => x + Math.sin(ang(t, 7, ph) + s * 0.018) * 12 * (s / h) ** 1.3 + Math.sin(ang(t, 17, ph * 2) + s * 0.05) * 2 * (s / h);
  for (let s = 0; s < h; s++) { const px = R(X(s)), py = y - s; c.px(px - 1, py, dark); c.px(px, py, stem); c.px(px + 1, py, dark); }
  for (let s = 14, k = 0; s < h - 6; s += 15, k++) {
    const side = k % 2 ? 1 : -1, px = X(s), py = y - s, len = 16 + (k % 3) * 4, lift = 0.55 + 0.2 * Math.sin(ang(t, 11, ph + k));
    for (let i = 0; i < len; i++) { const lx = px + side * i * Math.cos(lift), ly = py - i * Math.sin(lift) + Math.sin(i * 0.5) * 0.6, wdt = Math.max(0, Math.sin((i / len) * Math.PI) * 3.4); for (let j = -R(wdt); j <= R(wdt); j++) c.px(R(lx), R(ly + j), Math.abs(j) === R(wdt) ? dark : j < 0 ? leafL : leaf); }
    c.px(R(px + side * 2), R(py - 1), bulb); c.px(R(px + side * 2), R(py), bulb);
  }
}
/** Sea grass clump at (x, y): n blades. */
export function drawGrass(c, x, y, n, hgt, t, ph, wy, cols = ["#2E8A6A", "#4AB48A", "#1A5A48"]) {
  const [mid, lit, dark] = cols.map((q) => dcol(q, wy));
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 4 + rnd(i + ph * 7) * 3, h = hgt * (0.6 + rnd(i * 3 + ph) * 0.5), lean = (rnd(i * 5 + ph) - 0.5) * 0.6;
    for (let s = 0; s < h; s++) { const k = s / h, px = bx + lean * s + Math.sin(ang(t, 13, ph + i * 0.7) + s * 0.08) * 5 * k * k; c.px(R(px), y - s, k > 0.7 ? lit : mid); if (k < 0.75) c.px(R(px) + 1, y - s, dark); }
  }
}
/** Christmas-tree tube worm pair at (x, y): out 0..1 (extended). */
export function drawTubeWorm(c, x, y, col, out, wy) {
  const C1 = dcol(col, wy), C2 = dcol(mix(col, "#FFFFFF", 0.45), wy), T = dcol("#E8DCC8", wy), TD = dcol("#9A8C7C", wy);
  c.rect(x - 2, y - 6, 5, 6, T); c.rect(x + 2, y - 6, 1, 6, TD); c.rect(x - 2, y - 7, 5, 1, TD);
  if (out < 0.05) return;
  for (const s of [-1, 1]) { const h = 11 * out, cx = x + s * 3.2; for (let j = 0; j < h; j++) { const w = (1 - j / h) * 3.6 * out; for (let i = -R(w); i <= R(w); i++) c.px(R(cx + i), R(y - 7 - j), (j + i + 20) % 3 === 0 ? C2 : C1); } }
}
/** Sea anemone at (x, y): column + swaying tentacles. */
export function drawAnemone(c, x, y, t, ph, wy, col = "#F07AA8", tip = "#FFE2EA") {
  const C = dcol(col, wy), T = dcol(tip, wy), D = dcol(mix(col, "#2A0A18", 0.45), wy), body = dcol(mix(col, "#F8C890", 0.35), wy);
  for (let j = 0; j < 9; j++) { const w = 7 - j * 0.15; for (let i = -R(w); i <= R(w); i++) c.px(x + i, y - j, Math.abs(i) === R(w) ? D : i < -2 ? mix(body, "#FFFFFF", 0.2) : body); }
  for (let k = 0; k < 15; k++) {
    const a0 = -Math.PI / 2 + (k / 14 - 0.5) * 2.4, len = 14 + (k % 3) * 3, sw = Math.sin(ang(t, 15, ph + k * 0.4)) * 0.25;
    for (let s = 0; s < len; s++) { const a = a0 + sw * (s / len) + Math.sin(s * 0.3 + k) * 0.08, X = R(x + Math.cos(a) * (s * 0.95) + (k - 7) * 0.6), Y = R(y - 9 + Math.sin(a) * s); c.px(X, Y, s > len - 3 ? T : C); if (s < len - 3) c.px(X + 1, Y, D); }
  }
}
export { mix, bayer, fade, blinkP, osc, cyc, ang };
