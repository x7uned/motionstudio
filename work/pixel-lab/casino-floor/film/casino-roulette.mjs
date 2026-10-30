// Casino kit · roulette: the European wheel (37 pockets, one green 0, real pocket order), the ball as a pure function of t,
// and the full table (leather rail, wood body, green felt with the betting layout 0 + 1–36 + outside boxes, the dealer's
// chip bank). Local table coordinates: x across (±60), z along the table (wheel at the far end, z < 0), y up (felt TOP = 76).
import { TINY } from "../../../../renderer/pixel/raster.mjs";
import { R, RAMP, UI, clamp01, ease, lerp, mix, fade, rampAt, shadePoly, glow, shadow, ringPts, sectorPts, flatPts, rrectXZ, bbox, onScreen } from "./casino-core.mjs";
import { chipStack, CHIP_RAMPS } from "./casino-props.mjs";

export const TOP = 76;
/** European pocket order, clockwise. */
export const POCKETS = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
export const isRed = (n) => REDS.has(n);
export const colorOf = (n) => (n === 0 ? "green" : isRed(n) ? "red" : "black");
const STEP = (Math.PI * 2) / 37;
/** Wheel geometry (local to the table centre). */
export const WHEEL = { z: -100, rim: 48.5, wallIn: 44.5, track: 41, trackIn: 37, numIn: 30.5, pocketIn: 24, ballR: 1.15, pocketR: 27.2 };
export const BANK = { x0: -46, x1: 46, z0: -178, z1: -160 };
export const FELT = { x0: -60, x1: 60, z0: -184, z1: 132 };
/** Angle (relative to the wheel's own rotation) of the centre of pocket n. */
export const pocketRel = (n) => (POCKETS.indexOf(n) + 0.5) * STEP;

// ---------------------------------------------------------------- ball
const g3 = (u) => 1 - Math.pow(1 - u, 3) * (1 + 3 * u);            // 0 → 1, flat at both ends, fastest at u = 1/3
/**
 * Ball state for one spin: spin = { t0 (flick), tDrop (leaves the track), tLand (settles), from (pocket number or null), to, turns }.
 * wheelAng(t) = the wheel's rotation. Returns { a (world angle), r (cm from centre), lift (cm above its surface), moving }.
 * Before t0 the ball rests in `from`; after tLand it rides in `to`.
 */
export function ballState(t, spin, wheelAng) {
  const { t0, tDrop, tLand, from = 0, to, turns = 4 } = spin;
  const A = pocketRel(from ?? 0), B = A - Math.PI * 2 * turns - (((A - pocketRel(to)) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const u = clamp01((t - t0) / (tLand - t0)), rel = A + (B - A) * g3(u);
  let r = WHEEL.pocketR, lift = 0;
  if (t > t0 && t < tLand) {
    const launch = clamp01((t - t0) / 0.35), v = clamp01((t - tDrop) / (tLand - 0.12 - tDrop));
    r = lerp(WHEEL.pocketR, WHEEL.track, ease(launch)); lift = Math.sin(Math.PI * launch) * 3;
    if (t > tDrop) { r = lerp(WHEEL.track, WHEEL.pocketR, ease(v)) + 2.2 * Math.abs(Math.sin(3 * Math.PI * v)) * (1 - v); lift = 2.6 * Math.abs(Math.sin(4 * Math.PI * v)) * Math.pow(1 - v, 1.5); }
  }
  return { a: wheelAng(t) + rel, r, lift, moving: t > t0 && t < tLand };
}

// ---------------------------------------------------------------- wheel
/**
 * Draw a wheel at world centre (wx, y, wz). st = { ang (rotation), ball: ballState | null, glow: {n: 0..1}, dim: {n: 0..1},
 * chase: [{ n, k }] extra highlights, numbers: true }.
 */
export function drawWheel(c, V, wx, y, wz, st) {
  const W = WHEEL, ang = st.ang ?? 0, k0 = V.k(wx, y, wz);
  const E = (r, yy) => ringPts(V, wx, yy, wz, r);
  const box = bbox(E(W.rim, y + 4)); if (!onScreen(box, 20)) return;
  const center = V.P(wx, y, wz);
  // bowl: outer side band, rim, brass edge
  c.poly(E(W.rim + 0.5, y - 1), RAMP.wood[1]);
  shadePoly(c, E(W.rim, y + 4), RAMP.wood, (px, py) => 3.2 + 1.6 * clamp01((center[1] - py) / ((box.y1 - box.y0) / 2)));
  { const pts = E(W.rim - 0.4, y + 4.2); for (let i = 0; i < pts.length - 1; i++) { const up = pts[i][1] < center[1]; c.px(R(pts[i][0]), R(pts[i][1]), up ? RAMP.gold[6] : RAMP.gold[4]); } }
  // the far inner wall (visible as a crescent) then the sloped ball track
  shadePoly(c, E(W.wallIn, y + 4), RAMP.maple, () => 2.4);
  shadePoly(c, E(W.wallIn, y + 0.6), RAMP.maple, (px, py) => { const dx = (px - center[0]) / (W.wallIn * k0), dy = (py - center[1]) / (W.wallIn * k0 * 0.7); return 4.3 + 1.6 * clamp01(1 - Math.abs(Math.hypot(dx + 0.35, dy + 0.55) - 0.75) * 3) - 0.8 * clamp01(dy); });
  { const pts = E(W.wallIn, y + 0.6); for (let i = 0; i < pts.length - 1; i++) c.px(R(pts[i][0]), R(pts[i][1]), RAMP.maple[1]); }
  // deflectors (brass diamonds on the track)
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2, [px, py, kk] = V.P(wx + Math.cos(a) * 39.5, y + 1, wz + Math.sin(a) * 39.5), s = Math.max(1, R(1.6 * kk)); c.poly([[px, py - s], [px + s * 1.4, py], [px, py + s * 0.7], [px - s * 1.4, py]], RAMP.gold[5]); c.px(R(px), R(py - s + 1), RAMP.gold[7]); }
  // number ring (rotating): coloured sectors, separators, numbers
  const sectors = POCKETS.map((n, i) => ({ n, a0: ang + i * STEP, a1: ang + (i + 1) * STEP }));
  const fill = (n, base) => { let col = base; const d = st.dim?.[n] ?? 0, gl = st.glow?.[n] ?? 0; if (d) col = mix(col, "#3A3440", d * 0.8); if (gl) col = mix(col, n === 0 ? "#9CFFB0" : "#FFE68A", gl * 0.55); return col; };
  const baseCol = (n, inner) => (n === 0 ? (inner ? RAMP.green[3] : RAMP.green[4]) : isRed(n) ? (inner ? RAMP.red[3] : RAMP.red[4]) : inner ? RAMP.black[1] : RAMP.black[3]);
  c.poly(E(W.trackIn + 0.6, y - 0.2), RAMP.gold[3]);
  for (const s of sectors) c.poly(sectorPts(V, wx, wz, W.numIn, W.trackIn, s.a0, s.a1, y - 0.5, y - 0.5, 2), fill(s.n, baseCol(s.n, false)));
  // pockets (a step lower) with chrome frets
  c.poly(E(W.numIn, y - 0.5), RAMP.gold[2]);
  for (const s of sectors) c.poly(sectorPts(V, wx, wz, W.pocketIn, W.numIn - 0.6, s.a0, s.a1, y - 1.6, y - 1.6, 2), fill(s.n, baseCol(s.n, true)));
  for (const s of sectors) { const p = V.P(wx + Math.cos(s.a0) * W.pocketIn, y - 1, wz + Math.sin(s.a0) * W.pocketIn), q = V.P(wx + Math.cos(s.a0) * W.numIn, y - 0.5, wz + Math.sin(s.a0) * W.numIn); c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), RAMP.chrome[6]); }
  { const pts = E(W.trackIn, y - 0.4); for (let i = 0; i < pts.length - 1; i++) c.px(R(pts[i][0]), R(pts[i][1]), RAMP.gold[6]); }
  if (st.numbers !== false && W.numIn * k0 > 70) for (const s of sectors) {
    const am = (s.a0 + s.a1) / 2, rm = (W.numIn + W.trackIn) / 2, [px, py] = V.P(wx + Math.cos(am) * rm, y - 0.5, wz + Math.sin(am) * rm);
    const p0 = V.P(wx + Math.cos(s.a0) * rm, y, wz + Math.sin(s.a0) * rm), p1 = V.P(wx + Math.cos(s.a1) * rm, y, wz + Math.sin(s.a1) * rm), wpx = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    if (wpx < 6.5) continue; const txt = String(s.n), tw = c.measure(TINY, txt, { spacing: s.n > 9 && wpx < 9 ? 0 : 1 });
    c.text(TINY, txt, R(px - tw / 2), R(py - 2), "#FFF6E8", { spacing: s.n > 9 && wpx < 9 ? 0 : 1 });
  }
  // cone with the brass turret (rotating)
  shadePoly(c, E(W.pocketIn, y - 1), RAMP.maple, (px, py) => 3 + 2.6 * clamp01(1 - Math.hypot((px - center[0] + 4 * k0) / (W.pocketIn * k0), (py - center[1] + 3 * k0) / (W.pocketIn * k0 * 0.7))));
  { const pts = E(W.pocketIn - 0.5, y - 1); for (let i = 0; i < pts.length - 1; i++) c.px(R(pts[i][0]), R(pts[i][1]), RAMP.gold[5]); }
  shadePoly(c, E(10, y + 3), RAMP.gold, () => 3.4);
  const hub = V.P(wx, y + 7, wz);
  for (let i = 0; i < 4; i++) { const a = ang + (i * Math.PI) / 2 + 0.3, tip = V.P(wx + Math.cos(a) * 12, y + 7, wz + Math.sin(a) * 12), lw = Math.max(1, R(1.2 * k0));
    for (let w = -lw; w <= lw; w++) c.line(R(hub[0]), R(hub[1]) + w, R(tip[0]), R(tip[1]) + w, w < 0 ? RAMP.gold[6] : RAMP.gold[4]);
    c.disc(R(tip[0]), R(tip[1]), Math.max(1, R(1.8 * k0)), RAMP.gold[5]); c.px(R(tip[0] - k0 * 0.6), R(tip[1] - k0 * 0.6), RAMP.gold[7]); }
  { const top = V.P(wx, y + 11, wz), r = Math.max(1, R(3 * k0)); c.rect(R(hub[0] - r * 0.5), R(top[1]), Math.max(1, R(r)), R(hub[1] - top[1]) + 1, RAMP.gold[4]); c.disc(R(top[0]), R(top[1]), r, RAMP.gold[5]); c.px(R(top[0] - r * 0.4), R(top[1] - r * 0.4), RAMP.gold[7]); }
  // glows on lit pockets
  for (const [nn, gl] of Object.entries(st.glow ?? {})) if (gl > 0.65 || ((nn === "0" || nn === "17") && gl > 0)) { const n = Number(nn), a = ang + pocketRel(n), [px, py, kk] = V.P(wx + Math.cos(a) * 30, y, wz + Math.sin(a) * 30); glow(c, px, py, 16 * kk, 12 * kk, n === 0 ? "#7CFF9A" : "#FFE070", 0.55 * gl); }
  // the ball
  if (st.ball) { const b = st.ball, onTrack = b.r > W.trackIn, yy = (onTrack ? y + 0.8 : y - 1.4) + W.ballR + b.lift, [px, py, kk] = V.P(wx + Math.cos(b.a) * b.r, yy, wz + Math.sin(b.a) * b.r), [sx, sy] = V.P(wx + Math.cos(b.a) * b.r, onTrack ? y + 0.8 : y - 1.4, wz + Math.sin(b.a) * b.r), rr = Math.max(1.5, W.ballR * kk);
    shadow(c, sx + rr * 0.3, sy + rr * 0.2, rr * 1.4, rr * 0.8, 0.5);
    c.disc(R(px), R(py), R(rr), "#C8C4D0"); if (rr >= 2.5) c.disc(R(px - rr * 0.15), R(py - rr * 0.15), Math.max(1, R(rr * 0.75)), "#F4F2F8"); c.px(R(px - rr * 0.4), R(py - rr * 0.45), "#FFFFFF"); }
}

// ---------------------------------------------------------------- the betting layout
const COLS = [-42, -14, 14, 42], ROW0 = -26, ROWH = 11, ZERO = [-40, -26];
/** Local (x, z) of the centre of number n's box on the layout (0 = the zero box at the wheel end). */
export function cellLocal(n) { if (n === 0) return [0, (ZERO[0] + ZERO[1]) / 2]; const row = Math.floor((n - 1) / 3), col = (n - 1) % 3; return [(COLS[col] + COLS[col + 1]) / 2, ROW0 + (row + 0.5) * ROWH]; }

/**
 * Draw the table. T = { x, z }; st = { wheel: {…drawWheel state}, cells: { n: 0..1 highlight }, chips: [{ n | x,z (local), count, ramp, a, glow, sway }],
 * bank: 0..1 (pulse of the casino's chip bank), lamp: 0..1 }.
 */
export function drawRouletteTable(c, V, T, st = {}) {
  const X = (x) => T.x + x, Z = (z) => T.z + z;
  const outerXZ = rrectXZ(X(-67), Z(-191), X(67), Z(139), 18), innerXZ = rrectXZ(X(FELT.x0), Z(FELT.z0), X(FELT.x1), Z(FELT.z1), 12);
  const top = flatPts(V, outerXZ, TOP + 3), b = bbox(top); if (!onScreen(b, 60)) return;
  const [cx0, cy0, k] = V.P(T.x, 0, T.z);
  shadow(c, cx0, cy0 + 20 * k, 92 * k, 130 * k * V.sp, 0.55);
  // body: plinth, then the extruded sides (back faces get covered by the top)
  { const base = rrectXZ(X(-56), Z(-180), X(56), Z(128), 10); const bp = flatPts(V, base, 10), bf = flatPts(V, base, 0); for (let i = 0; i < base.length; i++) { const j = (i + 1) % base.length; c.poly([bp[i], bp[j], bf[j], bf[i]], RAMP.wood[0]); } }
  const lo = flatPts(V, outerXZ, 14);
  for (let i = 0; i < outerXZ.length; i++) { const j = (i + 1) % outerXZ.length, nx = outerXZ[j][1] - outerXZ[i][1], facing = nx; void facing;
    const ex = outerXZ[j][0] - outerXZ[i][0], ez = outerXZ[j][1] - outerXZ[i][1], nrmX = ez, nrmZ = -ex, lv = nrmZ < -0.1 ? 2.6 : Math.abs(nrmX) > Math.abs(nrmZ) ? 1.8 : 2.2;
    shadePoly(c, [top[i], top[j], lo[j], lo[i]], RAMP.wood, (px, py) => lv + 1.2 * clamp01((lo[i][1] - py) / Math.max(1, lo[i][1] - top[i][1])));
  }
  for (const yy of [60, 26]) { const tr = flatPts(V, outerXZ, yy); for (let i = 0; i < outerXZ.length; i++) { const j = (i + 1) % outerXZ.length; if (outerXZ[i][1] > Z(100) && outerXZ[j][1] > Z(100)) c.line(R(tr[i][0]), R(tr[i][1]), R(tr[j][0]), R(tr[j][1]), yy === 60 ? RAMP.gold[5] : RAMP.gold[3]); } }
  { const tr = flatPts(V, outerXZ, 8); for (let i = 0; i < outerXZ.length; i++) { const j = (i + 1) % outerXZ.length; if (outerXZ[i][1] > Z(100) || Math.abs(outerXZ[i][0] - T.x) > 60) c.line(R(tr[i][0]), R(tr[i][1]), R(tr[j][0]), R(tr[j][1]), RAMP.gold[4]); } }
  // padded leather rail
  shadePoly(c, top, RAMP.leather, (px, py) => 3.3 + 1.2 * clamp01((b.y1 - py) / (b.y1 - b.y0)));
  { const hl = flatPts(V, rrectXZ(X(-64), Z(-188), X(64), Z(136), 16), TOP + 3.4); for (let i = 0; i < hl.length - 1; i++) if (hl[i][1] > (b.y0 + b.y1) / 2 - 40) c.line(R(hl[i][0]), R(hl[i][1]), R(hl[i + 1][0]), R(hl[i + 1][1]), RAMP.leather[6]); }
  // felt with the lamp pool
  const felt = flatPts(V, innerXZ, TOP + 0.5), lamp = V.P(T.x, TOP, Z(-40)), lr = 110 * k;
  shadePoly(c, felt, RAMP.felt, (px, py) => 6.0 * (st.lamp ?? 1) - 2.6 * Math.hypot((px - lamp[0]) / lr, (py - lamp[1]) / (lr * 0.9)));
  { const e = flatPts(V, innerXZ, TOP + 0.6); for (let i = 0; i < e.length - 1; i++) c.line(R(e[i][0]), R(e[i][1]), R(e[i + 1][0]), R(e[i + 1][1]), RAMP.felt[1]); }
  // the casino's chip bank (tray with columns of chips)
  { const tray = flatPts(V, rrectXZ(X(BANK.x0), Z(BANK.z0), X(BANK.x1), Z(BANK.z1), 3), TOP + 1.2); c.poly(tray.map(([px, py]) => [px, py + Math.max(1, R(2 * k))]), RAMP.wood[1]); c.poly(tray, RAMP.wood[3]);
    const ramps = [CHIP_RAMPS.red, CHIP_RAMPS.blue, CHIP_RAMPS.green, CHIP_RAMPS.black, CHIP_RAMPS.purple, CHIP_RAMPS.yellow];
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) chipStack(c, V, X(BANK.x0 + 6 + i * 8.8), TOP + 1.2, Z(BANK.z0 + 5 + j * 8), 5 + ((i * 3 + j * 5) % 4) + (st.bankGrow ?? 0) * (i % 3), ramps[i % 6], { r: 3.3, glow: st.bank ?? 0 }); }
  // layout lines + number boxes (pale gold)
  const LC = "#D9C99A", line = (x0, z0, x1, z1) => { const p = V.P(X(x0), TOP + 0.6, Z(z0)), q = V.P(X(x1), TOP + 0.6, Z(z1)); c.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), LC); };
  const rowsEnd = ROW0 + 12 * ROWH;
  const cellPoly = (x0, z0, x1, z1) => flatPts(V, [[X(x0), Z(z0)], [X(x1), Z(z0)], [X(x1), Z(z1)], [X(x0), Z(z1)]], TOP + 0.6);
  // zero box (green, curved top)
  { const zp = []; for (let i = 0; i <= 10; i++) { const a = Math.PI + (Math.PI * i) / 10; zp.push([X(Math.cos(a) * 42), Z(-26 + Math.sin(a) * 14)]); } const zpp = flatPts(V, zp, TOP + 0.6); c.poly(zpp, mix(RAMP.green[3], "#9CFFB0", 0.5 * (st.cells?.[0] ?? 0))); for (let i = 0; i < zpp.length - 1; i++) c.line(R(zpp[i][0]), R(zpp[i][1]), R(zpp[i + 1][0]), R(zpp[i + 1][1]), LC); }
  for (let n = 1; n <= 36; n++) { const h = st.cells?.[n] ?? 0; if (h > 0) { const row = Math.floor((n - 1) / 3), col = (n - 1) % 3; c.poly(cellPoly(COLS[col], ROW0 + row * ROWH, COLS[col + 1], ROW0 + (row + 1) * ROWH), mix(RAMP.felt[5], "#FFE68A", 0.55 * h)); } }
  for (let i = 0; i <= 12; i++) line(-42, ROW0 + i * ROWH, 42, ROW0 + i * ROWH);
  for (const x of COLS) line(x, ROW0, x, rowsEnd);
  line(-42, rowsEnd + 12, 42, rowsEnd + 12); line(-42, rowsEnd, -42, rowsEnd + 12); line(42, rowsEnd, 42, rowsEnd + 12); line(-14, rowsEnd, -14, rowsEnd + 12); line(14, rowsEnd, 14, rowsEnd + 12);
  // outside boxes: a column of six on the right with red and black diamonds
  line(42, ROW0, 54, ROW0); line(54, ROW0, 54, rowsEnd); line(42, rowsEnd, 54, rowsEnd);
  for (let i = 1; i < 6; i++) line(42, ROW0 + i * 22, 54, ROW0 + i * 22);
  for (const [i, col] of [[2, RAMP.red[4]], [3, RAMP.black[2]]]) { const cz = ROW0 + i * 22 + 11, pts = flatPts(V, [[X(48), Z(cz - 7)], [X(52), Z(cz)], [X(48), Z(cz + 7)], [X(44), Z(cz)]], TOP + 0.7); c.poly(pts, col); }
  // number ovals + numbers
  const cw = V.P(X(28), TOP, Z(0))[0] - V.P(X(0), TOP, Z(0))[0];
  for (let n = 0; n <= 36; n++) {
    const [lx, lz] = cellLocal(n), [px, py] = V.P(X(lx), TOP + 0.6, Z(lz)), col = n === 0 ? RAMP.green[5] : isRed(n) ? RAMP.red[4] : RAMP.black[2];
    if (cw < 14) { c.rect(R(px - 1), R(py), 2, 1, col); continue; }
    const rx = Math.max(3, R(cw * 0.22)), ry = Math.max(2, R(rx * 0.55)); if (n) c.ellipse(R(px), R(py), rx, ry, col);
    if (cw >= 26) { const txt = String(n), tw = c.measure(TINY, txt); c.text(TINY, txt, R(px - tw / 2), R(py - 2), n === 0 ? "#E8FFE8" : "#FFF4E4"); }
  }
  // the wheel, then the chips on the layout (nearer than the wheel)
  drawWheel(c, V, X(0), TOP, Z(WHEEL.z), st.wheel ?? {});
  for (const ch of st.chips ?? []) { const [lx, lz] = ch.n !== undefined ? cellLocal(ch.n) : [ch.x, ch.z]; chipStack(c, V, X(lx + (ch.dx ?? 0)), TOP + 0.6 + (ch.y ?? 0), Z(lz + (ch.dz ?? 0)), ch.count, ch.ramp ?? CHIP_RAMPS.red, { a: ch.a, glow: ch.glow, sway: ch.sway }); }
}
/** World position of a local table point. */
export const tableWorld = (T, lx, lz) => [T.x + lx, T.z + lz];
