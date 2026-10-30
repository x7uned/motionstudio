// Macro slow-motion close-up for the cat film (full stage, grid 540×960): the cat's mouth at the top, the tongue tip
// curling back and touching the water with its top surface, the water column riding up, the jaw pinching it off,
// and the "too late" replay where the column breaks and the tongue comes back empty. Labels live in this layer.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";
import { CAT_RAMP as CAT, CREAM_RAMP as CREAM, TONGUE_RAMP as PINK } from "./cat.mjs";

const W = 540, H = 960, WL = 600, R = Math.round;
const WATER = ["#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF"];
const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", p5: "#6E4FB0", p7: "#B08AE8", MU: "#959595" };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

const ROOT = [356, 214], RC = 30, TW = 54, JAW_Y = 236;
const HEAD = [[-40, -20], [400, -20], [430, 60], [436, 130], [422, 178], [392, 200], [340, 212], [260, 214], [160, 206], [60, 190], [-40, 180]];
const MUZZLE = [[300, 110], [410, 90], [436, 130], [422, 178], [392, 200], [340, 212], [300, 206], [280, 160]];
const JAW = [[90, 200], [340, 212], [372, 222], [364, 246], [316, 262], [216, 262], [124, 248], [84, 226]], HINGE = [120, 205];

// ---------------------------------------------------------------- state
/** Main slow-motion story, all keyed to the narration. */
export function mainState(t, EV) {
  const s = { curl: sm(t, EV.curl - 0.1, EV.curl + 0.9), contact: 0, low: 0, neck: 70, jaw: 0.1, pinchK: 0, fall: -1, broke: -1, drip: -1, empty: 0 };
  // descent: lowest point of the tongue from just under the lips to the water surface
  const down = sm(t, EV.macroIn[0], EV.top - 0.05);
  s.low = lerp(JAW_Y + 40, WL, down);
  s.contact = win(t, EV.top - 0.15, EV.pull + 0.1, 0.25, 0.3);
  // rise: fast at first, then slow; the column hangs between the tongue and the water
  if (t > EV.pull) { const u = (t - EV.pull) / (EV.pinch - EV.pull); s.low = lerp(WL, JAW_Y + 18, 0.35 * easeOut(u * 5) + 0.65 * sm(u, 0.15, 0.85)); }
  s.column = sm(t, EV.pull, EV.pull + 0.35);
  s.neck = lerp(lerp(lerp(78, 40, sm(t, EV.sticks, EV.column + 0.6)), 16, sm(t, EV.gravity, EV.down + 0.4)), 7, sm(t, EV.shuts, EV.pinch));
  s.jaw = lerp(0.1, 0, sm(t, EV.shuts + 0.3, EV.pinch));
  if (t >= EV.pinch) { s.fall = t - EV.pinch; s.pinchK = 1; }
  return s;
}
/** "Too late" replay: the jaw waits, the neck breaks, both halves fall, the tongue comes back empty. */
export function lateState(t, EV) {
  const t0 = EV.late, brk = EV.late + 0.55, s = { curl: 1, contact: 0, low: 0, neck: 0, jaw: 0.1, pinchK: 0, fall: -1, broke: -1, drip: -1, empty: 0, column: 1 };
  s.low = t < brk + 0.4 ? lerp(430, 336, easeOut((t - t0) / (brk + 0.4 - t0))) : lerp(336, JAW_Y + 18, sm(t, brk + 0.4, EV.empty - 0.2));
  s.neck = lerp(12, 3, sm(t, t0, brk));
  if (t >= brk) { s.broke = t - brk; s.fall = t - brk; }
  s.drip = t >= brk + 0.15 ? t - brk - 0.15 : -1;
  s.jaw = lerp(0.1, 0, sm(t, EV.empty - 0.9, EV.empty - 0.2));
  s.empty = sm(t, EV.empty, EV.empty + 0.3);
  return s;
}

// ---------------------------------------------------------------- geometry
/** Tongue centreline: down from the root, then an arc curling back (toward the chest, left). Returns pts and the lowest point. */
function tongueLine(s) {
  const phi = (0.08 + 0.8 * s.curl) * Math.PI, cx = ROOT[0] - RC;
  // the straight part ends at yc so that the lowest point of the J sits at s.low
  const lowest = phi >= Math.PI / 2 ? RC : RC * Math.sin(phi);
  const yc = s.low - lowest - TW * 0.42;
  const pts = []; const n1 = 14;
  for (let i = 0; i <= n1; i++) pts.push([ROOT[0], ROOT[1] + ((yc - ROOT[1]) * i) / n1]);
  for (let i = 1; i <= 18; i++) { const a = (phi * i) / 18; pts.push([cx + RC * Math.cos(a), yc + RC * Math.sin(a)]); }
  return { pts, yc, cx, bottom: [phi >= Math.PI / 2 ? cx : cx + RC * Math.cos(phi), s.low] };
}
function ribbon(pts, w0, w1) {
  const L = [], Rr = [];
  for (let i = 0; i < pts.length; i++) { const [x, y] = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, w = lerp(w0, w1, i / (pts.length - 1)) / 2;
    L.push([x - (dy / d) * w, y + (dx / d) * w]); Rr.unshift([x + (dy / d) * w, y - (dx / d) * w]); }
  // rounded tip
  const [tx, ty] = pts[pts.length - 1], [px, py] = pts[pts.length - 2], dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy) || 1, cap = [];
  for (let k = 1; k < 6; k++) { const a = Math.atan2(dy, dx) - Math.PI / 2 + (Math.PI * k) / 6; cap.push([tx + Math.cos(a) * w1 / 2, ty + Math.sin(a) * w1 / 2]); }
  return [...L, ...cap.reverse(), ...Rr];
}
/** Column outline between y0 (top, under the tongue) and y1 (bottom), centred at x; neck in the middle, meniscus foot. */
function columnPoly(x, y0, y1, topW, neck, footW) {
  const L = [], Rr = [], n = 28;
  for (let i = 0; i <= n; i++) { const v = i / n, y = lerp(y0, y1, v);
    const hw = v < 0.55 ? neck / 2 + (topW / 2 - neck / 2) * Math.pow(1 - v / 0.55, 2) : neck / 2 + (footW / 2 - neck / 2) * Math.pow((v - 0.55) / 0.45, 2.6);
    L.push([x - hw, y]); Rr.unshift([x + hw, y]); }
  return [...L, ...Rr];
}
function fillWater(c, poly, lightX) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) { const yc = y + 0.5, xs = []; for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) { const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); for (let x = a; x < b; x++) { const u = (x - a) / Math.max(1, b - a); let col = x === a || x === b - 1 ? WATER[1] : u < 0.18 ? WATER[4] : u < 0.3 ? WATER[3] : u > 0.82 ? WATER[1] : u + (bayer(x, y) - 0.5) * 0.2 > 0.6 ? WATER[2] : WATER[3]; if (Math.abs(x - (a + (b - a) * 0.22)) < 1 && (y % 9) < 5) col = WATER[5]; c.px(x, y, col); } } }
}

// ---------------------------------------------------------------- drawing
function background(c, t) {
  // dark kitchen behind, then the inside of the glazed bowl (ceramic, with a glossy streak) down to the water
  for (let y = 0; y < WL; y++) for (let x = 0; x < W; x++) { const k = y / WL; let col = k + (bayer(x, y) - 0.5) * 0.18 < 0.55 ? "#1A1430" : "#1E1838";
    if (y > 440) { const u = (y - 440) / 160; col = u + (bayer(x, y) - 0.5) * 0.3 < 0.45 ? "#3A3F86" : "#2E3474"; if (Math.abs(x - 96 - u * 30) < 10 - u * 4 && bayer(x, y) < 0.7) col = "#6A70B8"; }
    c.px(x, y, col); }
  for (let x = 0; x < W; x++) { c.px(x, 440, "#8A90D0"); c.px(x, 441, "#5A60A8"); }
  // soft bokeh of moonlight behind
  for (let i = 0; i < 9; i++) { const x = rnd(i * 3) * W, y = 260 + rnd(i * 5) * 160, r = 14 + rnd(i) * 22; c.tint(R(x - r), R(y - r), R(r * 2), R(r * 2), (px, py) => (Math.hypot(px - x, py - y) < r ? 0.22 : 0), i % 2 ? "#4A4A8E" : "#6E4FB0", 2); }
  // the bowl's rim edge far behind (a highlight line) and the water body
  for (let y = WL; y < H; y++) for (let x = 0; x < W; x++) { const k = (y - WL) / (H - WL); c.px(x, y, k + (bayer(x, y) - 0.5) * 0.25 < 0.25 ? WATER[2] : k < 0.6 ? WATER[1] : WATER[0]); }
  // slow caustic lines in the water
  for (let k = 0; k < 16; k++) { const yy = WL + 20 + k * 22, ph = t * 0.6 + k; for (let x = 0; x < W; x += 2) { const y = R(yy + Math.sin(x * 0.03 + ph) * 4); if ((x + k * 13) % 40 < 18) c.px(x, y, k < 5 ? WATER[3] : WATER[2]); } }
}
function surface(c, t, skip, ripples) {
  for (let x = 0; x < W; x++) { if (skip && x > skip[0] && x < skip[1]) continue; const y = R(WL + Math.sin(x * 0.05 + t * 1.2) * 1.2); c.px(x, y, WATER[4]); c.px(x, y + 1, WATER[3]); if ((x * 7) % 23 < 4) c.px(x, y - 1, WATER[5]); }
  for (const rp of ripples) { if (rp.a <= 0) continue; const f = fade(c, rp.a); f.ering(R(rp.x), WL + 2, R(rp.r), Math.max(2, R(rp.r * 0.12)), WATER[5]); }
}
function mouth(c, s) {
  const jawRot = ([x, y]) => { const a = s.jaw, dx = x - HINGE[0], dy = y - HINGE[1]; return [HINGE[0] + dx * Math.cos(a) - dy * Math.sin(a), HINGE[1] + dx * Math.sin(a) + dy * Math.cos(a)]; };
  const jaw = JAW.map(jawRot);
  // mouth interior between the lip line and the dropped jaw
  if (s.jaw > 0.01) c.poly([[150, 206], [340, 212], [372, 220], jawRot([372, 222]), jawRot([300, 214]), jawRot([150, 206])], "#5A1A2A");
  return jaw;
}
function head(c, jaw) {
  const opt = { light: [-0.6, -0.8], litOutline: "#E0CDF8", outline: "#24100A" };
  drawPart(c, [spline(jaw, new Set(), 5)], { ...opt, ramp: CREAM, base: 3.4, gain: 1.4, slope: 1.2, thick: 18 });
  drawPart(c, [spline(HEAD, new Set([0, 1, 10]), 6)], { ...opt, ramp: CAT, base: 3.2, gain: 2.0, slope: 1.6, thick: 40 });
  for (const [x0, y0, x1, y1] of [[40, 30, 70, 120], [110, 20, 136, 110], [180, 16, 200, 96]]) for (let k = 0; k < 5; k++) c.line(x0 + k, y0, x1 + k, y1, CAT[2]);
  drawPart(c, [spline(MUZZLE, new Set(), 6)], { ...opt, ramp: CREAM, base: 3.6, gain: 1.2, thick: 22, litOutline: null, outline: CAT[3] });
  c.ellipse(428, 112, 9, 7, "#9A2E48"); c.ellipse(426, 109, 4, 2, "#E26E80");
  for (const [y0, y1] of [[150, 128], [162, 160], [174, 196]]) { c.line(420, y0, 539, y1, "#FDFEED"); c.line(420, y0 + 1, 539, y1 + 1, "#B8946A"); }
  for (let k = 0; k < 12; k++) c.disc(330 + (k % 4) * 18 + (k >> 2) * 6, 150 + (k >> 2) * 14, 1, "#7A5A3A");
}

function panel(c, x, y, w, h, a = 1, edge = C.p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(C.CARD, "#1D1430", (j - y) / h)); }
const dtext = (c, s, x, y, col, a = 1, scale = 2) => { if (a > 0) fade(c, a).text(MAIN, s, R(x), R(y), col, { scale }); };
const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
function label(c, lines, x, y, a, col = C.Y) { if (a <= 0) return; const w = Math.max(...lines.map((l) => tw(c, l))) + 20, h = lines.length * 20 + 12; panel(c, x, y, w, h, a, col); lines.forEach((l, i) => dtext(c, l, x + 10, y + 8 + i * 20, i ? C.IV : col, a)); }
function arrow(c, x, y0, y1, col, a) { if (a <= 0) return; const g = fade(c, a), d = Math.sign(y1 - y0); for (let k = -2; k <= 2; k++) g.line(x + k, R(y0), x + k, R(y1), col); for (let k = 0; k < 12; k++) g.rect(x - 12 + k, R(y1 - d * k), 25 - 2 * k, 1, col); }

/** Render one macro state into c (full stage). */
function scene(c, t, s, EV, late) {
  background(c, t);
  const tl = tongueLine(s), bx = tl.bottom[0], ripples = [];
  // the column (under the tongue) and, after the pinch or the break, the falling lower part
  let skip = null;
  if (s.column > 0) {
    const topY = s.low - 3, foot = 150;
    if (s.fall < 0) { const poly = columnPoly(bx, topY, WL + 2, 58, s.neck * s.column + (1 - s.column) * 40, foot * s.column + 30); fillWater(c, poly, bx - 20); skip = [bx - foot / 2, bx + foot / 2]; }
    else {
      const g = 900, cut = late ? lerp(topY, WL, 0.52) : JAW_Y + 6, yTop = cut + 0.5 * g * s.fall * s.fall, k = clamp01((yTop - cut) / (WL - cut));
      if (yTop < WL - 4) { const poly = columnPoly(bx, yTop, WL + 2, 26 * (1 - k) + 6, Math.max(3, 10 * (1 - k)), foot * (1 - 0.6 * k) + 20); fillWater(c, poly, bx - 20); skip = [bx - foot / 2, bx + foot / 2]; }
      const rk = clamp01((yTop - WL + 40) / 60); if (rk > 0) for (let i = 0; i < 3; i++) ripples.push({ x: bx, r: 30 + rk * (60 + i * 50), a: (1 - rk) * (1 - i * 0.25) });
      if (late && s.broke >= 0) { // upper part shrinks into a drop on the tongue tip
        const hang = clamp01(s.broke / 0.25), poly = columnPoly(bx, topY, topY + lerp(cut - topY, 22, hang), 58 * (1 - hang) + 30, 30, 18); fillWater(c, poly, bx - 12); }
      for (let i = 0; i < 6; i++) { const tt = s.fall - 0.25 - i * 0.04; if (tt < 0 || tt > 0.6) continue; const x = bx + (rnd(i) - 0.5) * 120 * tt * 2, y = WL - 60 * Math.sin(Math.PI * tt / 0.6) - 4; c.disc(R(x), R(y), 3, WATER[4]); c.px(R(x - 1), R(y - 1), WATER[5]); }
    }
  }
  // the drip that falls off the empty tongue in the replay
  if (late && s.drip >= 0) { const y = s.low + 6 + 0.5 * 900 * s.drip * s.drip; if (y < WL) { c.disc(R(bx), R(y), 9, WATER[3]); c.disc(R(bx - 3), R(y - 3), 3, WATER[5]); } else { const rk = clamp01((y - WL) / 200); ripples.push({ x: bx, r: 20 + rk * 80, a: 1 - rk }); } }
  surface(c, t, skip, ripples);
  // contact: the top of the curled tip just touches; a dimple and a bright line
  if (s.contact > 0) { const f = fade(c, s.contact); for (let x = R(bx - 30); x < bx + 30; x++) f.px(x, WL - 1, C.IV); f.ering(R(bx), WL, 44, 5, WATER[5], 0, Math.PI); }
  // tongue
  const poly = ribbon(tl.pts, TW, TW * 0.84);
  drawPart(c, [poly], { ramp: PINK, base: 3.4, gain: 1.8, slope: 0.6, thick: 16, light: [-0.6, -0.8], litOutline: "#FDE8EA", outline: "#3A0A18" });
  for (let i = 3; i < tl.pts.length - 3; i += 2) { const [x, y] = tl.pts[i]; c.px(R(x) + ((i * 7) % 5) - 2, R(y), "#F29AA6"); c.px(R(x) + ((i * 3) % 7) - 3, R(y) + 3, "#FAC6CC"); }
  const jaw = mouth(c, s); head(c, jaw);
  if (s.pinchK > 0 && !late) { const a = 1 - sm(s.fall, 0.4, 1.0); if (a > 0) { const f = fade(c, a); f.ellipse(372, 226, 10, 5, WATER[3]); f.px(368, 224, WATER[5]); } }
  return tl;
}

/** Full macro layer at film time t (main story, crossfading into the replay at "Too late"). */
export function drawMacro(c, t, EV, tmp) {
  const lateA = sm(t, EV.late - 0.05, EV.late + 0.3);
  let tl;
  if (lateA < 1) tl = scene(c, t, mainState(t, EV), EV, false);
  if (lateA > 0) { tmp.d.fill(0); const tl2 = scene(tmp, t, lateState(t, EV), EV, true); tmp.tint(0, 0, W, H, () => 0.14, "#E03056", 4);
    if (lateA >= 1) c.d.set(tmp.d); else for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (lateA > bayer(x, y)) { const i = (y * W + x) * 3; c.d[i] = tmp.d[i]; c.d[i + 1] = tmp.d[i + 1]; c.d[i + 2] = tmp.d[i + 2]; }
    tl = tl ?? tl2; }
  // ---- labels and gauges (left column x 20..300, right column x 400..520)
  const top = 300;
  // one label at a time: each fades out fully before the next fades in at the same spot
  const steps = [[["TONGUE TIP", "CURLS BACK"], EV.curl, C.Y], [["ONLY THE TOP", "TOUCHES"], EV.top, C.Y], [["UP, FAST"], EV.pull + 0.1, C.Y], [["WATER STICKS", "AND RISES"], EV.sticks + 0.15, C.L],
    [["GRAVITY", "PULLS DOWN"], EV.gravity, C.PK], [["MOUTH SHUTS"], EV.shuts, C.Y], [["JUST IN TIME"], EV.moment, C.Y], [["TOO LATE"], EV.late + 0.05, C.PK]];
  steps.forEach(([lines, a0, col], i) => { const next = steps[i + 1]?.[1] ?? 99; label(c, lines, 22, top, win(t, a0, next - 0.32, 0.25, 0.27), col); });
  arrow(c, 470, 470, 330, C.Y, win(t, EV.pull + 0.1, EV.sticks + 0.15 - 0.32, 0.25, 0.27));
  arrow(c, 470, 360, 520, C.PK, win(t, EV.gravity, EV.shuts - 0.32, 0.25, 0.27));
  // balance: up (tongue) vs down (gravity) levels out at the right moment
  { const a = win(t, EV.moment, EV.late + 0.05 - 0.32, 0.25, 0.27); if (a > 0) { panel(c, 392, top, 130, 92, a); const tilt = lerp(-0.35, 0, sm(t, EV.moment, EV.pinch)), g = fade(c, a), cx = 457, cy = top + 50;
    g.poly([[cx - 6, cy + 26], [cx + 6, cy + 26], [cx, cy + 6]], C.MU); for (let k = -1; k <= 1; k++) g.line(R(cx - 48 * Math.cos(tilt)), R(cy + 4 + k - 48 * Math.sin(tilt)), R(cx + 48 * Math.cos(tilt)), R(cy + 4 + k + 48 * Math.sin(tilt)), C.IV);
    dtext(c, "UP", R(cx - 52 * Math.cos(tilt) - 8), R(cy - 16 - 48 * Math.sin(tilt)), C.Y, a, 1); dtext(c, "DOWN", R(cx + 44 * Math.cos(tilt) - 16), R(cy - 16 + 48 * Math.sin(tilt)), C.PK, a, 1); dtext(c, "= ", cx - 4, top + 8, C.IV, a * sm(t, EV.pinch - 0.4, EV.pinch), 2); } }
  { const a = sm(t, EV.empty, EV.empty + 0.3); if (a > 0) label(c, ["EMPTY"], 22, top + 52, a, C.PK); }
  // slow-motion chip, top left (stays for the whole macro)
  { const a = sm(t, EV.slow, EV.slow + 0.3); panel(c, 22, 120, 168, 30, a, C.p7); const g = fade(c, a); g.rect(34, 129, 4, 12, C.L); g.rect(41, 129, 4, 12, C.L); dtext(c, "SLOW MOTION", 52, 128, C.L, a, 2); }
  return tl;
}

/** The main slow-motion scene alone (no labels), e.g. for the cover. */
export function drawMacroScene(c, t, EV) { return scene(c, t, mainState(t, EV), EV, false); }
