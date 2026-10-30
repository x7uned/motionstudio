// Builder PLANE · the stress view on the skin around the hero window, the crack, the hook's square ghost and the
// ✓ sparkle along the row.
//
// Stress view: two families of flow lines (iso-lines of ψ = u·F(d) and φ = v·F(d), d = distance to the window's
// rounded-rectangle edge) bend around the window like water around a stone; where they crowd the "stress" S = |∇| is
// high and the heat runs blue → cyan → green → yellow → orange → red → white-hot. A sharp corner adds a concentration
// bump (lines pile up, corners glow red); a round window spreads S evenly. The crack tip is a concentrator too.
// It is an illustration of the idea, not a computed stress field.
import { fade } from "../../../../../renderer/pixel/raster.mjs";
import { R, clamp01, sm, lerp, rnd, bayer, mix, hex, put, blend, sdRR, HW, HH, RING, WIN, winScreen, radiusOf, cornerR, pressure, EV, STRESS_VIEW } from "./plane-kit.mjs";
import { CYCLES, N_CYCLES, crack, TO_SQUARE, TO_ROUND, SQUARE_GHOST } from "../timeline.mjs";
import { FRAME0, SEAMS_H, edges } from "./plane-body.mjs";
import { WIN_Y } from "../timeline.mjs";

const GW = 540, GH = 960, RX = 118, RY = 186;
const HEAT = ["#1E2C78", "#2448A8", "#2A72D0", "#2EA2D6", "#38C2B8", "#58CE78", "#A8DA48", "#F0D04C", "#F6A23C", "#EC6A30", "#DC3434", "#F27A6E", "#FFD2C2", "#FFF6EC"];
const HEATRGB = HEAT.map(hex);

/** 0 = round … 1 = square (from the one corner-radius source of truth). */
export const squareness = (t) => clamp01((WIN.r - cornerR(t)) / (WIN.r - 4));
export function svAlpha(t) { return Math.min(sm(t, STRESS_VIEW[0], STRESS_VIEW[0] + 0.7), 1 - sm(t, STRESS_VIEW[1] - 0.7, STRESS_VIEW[1])); }

// ---------------------------------------------------------------- crack geometry (relative to the hero window centre)
const CRACK_END = [FRAME0 - 1, SEAMS_H[1] - WIN_Y];            // it runs to the lap seam where it meets the frame's rivet line
/** Start of the crack: the outer corner of the seal ring, top right, for corner radius r. */
export function crackStart(r) { const q = (r + RING) / Math.SQRT2; return [HW - r + q, -(HH - r) - q]; }
const ZIG = (() => { const n = 9, out = [0]; for (let i = 1; i < n; i++) out.push((i % 2 ? 1 : -1) * (2.2 + rnd(i * 17) * 2.6)); out.push(0); return out; })();
export function crackPath(r) {
  const [x0, y0] = crackStart(r), [x1, y1] = CRACK_END, dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, pts = [];
  for (let i = 0; i < ZIG.length; i++) { const f = i / (ZIG.length - 1), w = f ** 1.1; pts.push([x0 + dx * w + nx * ZIG[i], y0 + dy * w + ny * ZIG[i]]); }
  return pts;
}
/** Visible crack length 0..1: the timeline's crack(t), advancing in steps with each pressure pulse. */
export function crackLen(t) {
  let ts = t;
  if (t > CYCLES[0] && t < CYCLES[1]) { const T = (CYCLES[1] - CYCLES[0]) / N_CYCLES, u = (t - CYCLES[0]) / T, n = Math.floor(u); ts = CYCLES[0] + T * (n + sm(u - n, 0.22, 0.72)); }
  if (t >= EV.round2 - 0.3) return 1;
  return crack(ts);
}
export const healK = (t) => sm(t, EV.round2 - 0.3, EV.round2 + 0.3);
export const openK = (t) => sm(t, EV.tore2, EV.openEnd + 0.15) * (1 - healK(t));
/** Point at fraction f (0..1) of the crack's length. */
function along(pts, f) {
  const seg = []; let tot = 0; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); tot += l; }
  let rem = f * tot; for (let i = 0; i < seg.length; i++) { if (rem <= seg[i]) { const k = rem / seg[i]; return { i, p: [lerp(pts[i][0], pts[i + 1][0], k), lerp(pts[i][1], pts[i + 1][1], k)] }; } rem -= seg[i]; }
  return { i: seg.length - 1, p: pts[pts.length - 1] };
}

// ---------------------------------------------------------------- the stress view
let BUF = null;
export function drawStress(c, V, t) {
  const sv = svAlpha(t); if (sv <= 0) return;
  const [sx, sy] = winScreen(V, t, 0), r = cornerR(t), p = pressure(t), st = 1 + 0.012 * p, sq = squareness(t);
  const ow = HW + RING, oh = HH + RING, orr = r + RING, Lf = 27, kap = 3.4 * sq * sq;
  const q = orr * (1 - 1 / Math.SQRT2), corners = [[ow - q, oh - q], [-(ow - q), oh - q], [ow - q, -(oh - q)], [-(ow - q), -(oh - q)]];
  const cl = crackLen(t) * (1 - healK(t)), tipP = cl > 0.02 ? along(crackPath(r), crackLen(t)).p : null, tipK = cl > 0.02 ? 2.6 * (1 - healK(t)) : 0;
  const calm = sm(t, TO_ROUND[0], TO_ROUND[1] + 0.4), emph = (0.62 + 0.38 * Math.max(p, sq, calm)) * (0.9 + 0.1 * Math.max(p, calm)), Le = 15 + 9 * calm, Ae = 1.35 + 0.25 * calm;
  const x0 = Math.max(0, sx - RX), x1 = Math.min(GW - 1, sx + RX), W = x1 - x0 + 2;
  const [eT, eB] = edges(V, t, V.cx + sx - 270, p), y0 = Math.max(eT + 3, sy - RY), y1 = Math.min(eB - 3, sy + RY), H = y1 - y0 + 2;
  if (W <= 2 || H <= 2) return;
  if (!BUF || BUF.n < W * H) { const n = Math.ceil(W * H * 1.3); BUF = { n, psi: new Float32Array(n), phi: new Float32Array(n), heat: new Float32Array(n), dist: new Float32Array(n), ok: new Uint8Array(n) }; }
  const { psi, phi, heat, dist, ok } = BUF, ar = ow / oh, iRX = 1 / RX, iRY = 1 / RY, sq2 = 6 * sq * sq, hasK = kap > 0.01;
  const cxs = corners.map((q) => q[0]), cys = corners.map((q) => q[1]), tx = tipP ? tipP[0] : 0, ty = tipP ? tipP[1] : 0;
  const hw0 = ow - orr, hh0 = oh - orr;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = j * W + i, u = (x0 + i - sx + 0.5) / st, v = (y0 + j - sy + 0.5) / st;
    const ru = u * iRX, rv = v * iRY; if (ru * ru + rv * rv > 1.05) { ok[k] = 0; continue; }
    const qx = Math.abs(u) - hw0, qy = Math.abs(v) - hh0, mx = qx > 0 ? qx : 0, my = qy > 0 ? qy : 0;
    const d = Math.sqrt(mx * mx + my * my) + Math.min(Math.max(qx, qy), 0) - orr; if (d < 0) { ok[k] = 0; continue; }
    let bump = 0, hot = 0;
    if (hasK) for (let n = 0; n < 4; n++) { const ex = u - cxs[n], ey = v - cys[n], dc = Math.sqrt(ex * ex + ey * ey); if (dc < 70) { const e = Math.exp(-dc / 12); bump += e; hot += e; } }
    let de = d * (1 + kap * bump), tipH = 0;
    if (tipP) { const ex = u - tx, ey = v - ty, dd = ex * ex + ey * ey; if (dd < 2500) { const e = Math.exp(-Math.sqrt(dd) / 8); de *= 1 + tipK * e; tipH = tipK * 2.2 * e; } }
    const F = 1 - Math.exp(-de / Lf); psi[k] = u * F; phi[k] = v * ar * F; ok[k] = 1; dist[k] = d;
    heat[k] = emph * (Ae * Math.exp(-d / Le) * (1 - 0.4 * sq) + sq2 * hot) + tipH;
  }
  const flow = t * 16, D = c.d, DP = 7, DH = 9, NH = HEAT.length - 1;
  const nb = [-1, 1].map((kk) => winScreen(V, t, kk)), near = (X, Y) => { for (const [nx, ny] of nb) if (Math.abs(X - nx) < HW + RING + 3 && sdRR(X - nx + 0.5, Y - ny + 0.5, HW, HH, WIN.r) < RING + 1.5) return true; return false; };
  for (let j = 0; j < H - 1; j++) for (let i = 0; i < W - 1; i++) {
    const k = j * W + i; if (!ok[k] || !ok[k + 1] || !ok[k + W]) continue;
    const X = x0 + i, Y = y0 + j, u = (X - sx + 0.5) / st, v = (Y - sy + 0.5) / st;
    const rho = Math.sqrt(u * u * iRX * iRX + v * v * iRY * iRY), m = (1 - sm(rho, 0.8, 1)) * sv;
    if (m <= 0.01 || (m < 0.98 && m <= bayer(X + 2, Y + 1)) || near(X, Y)) continue;      // dithered edge of the view
    const hv = Math.max(0, Math.min(NH, 1.3 + heat[k] * 2.5)), lo = Math.floor(hv), f = hv - lo, hi = lo < NH ? lo + 1 : NH;
    const cc = f > 0.62 ? HEATRGB[hi] : f < 0.38 ? HEATRGB[lo] : (f - 0.38) / 0.24 > bayer(X, Y) ? HEATRGB[hi] : HEATRGB[lo];
    // iso-lines: the cell boundary of ψ (vertical family) and φ (horizontal family)
    const a0 = Math.floor(psi[k] / DP), lineV = a0 !== Math.floor(psi[k + 1] / DP) || a0 !== Math.floor(psi[k + W] / DP);
    const b0 = Math.floor(phi[k] / DH), lineH = b0 !== Math.floor(phi[k + 1] / DH) || b0 !== Math.floor(phi[k + W] / DH);
    const p3 = (Y * GW + X) * 3, mk = 0.5 + 0.38 * Math.exp(-dist[k] / 34) + 0.12 * Math.min(1, heat[k]);
    let r0 = D[p3] + (cc[0] - D[p3]) * mk, g0 = D[p3 + 1] + (cc[1] - D[p3 + 1]) * mk, b1 = D[p3 + 2] + (cc[2] - D[p3 + 2]) * mk;
    if (lineV || lineH) { const w = lineV ? 0.62 + 0.25 * (0.5 + 0.5 * Math.sin((v - flow) * 0.28 + a0 * 1.7)) : 0.38; r0 += (255 - r0) * w; g0 += (255 - g0) * w; b1 += (255 - b1) * w; }
    D[p3] = r0; D[p3 + 1] = g0; D[p3 + 2] = b1;
  }
}

// ---------------------------------------------------------------- the crack, the tear-open flap and the wind
const DARK = "#140C1C", LIP = "#FFFFFF", PRIMER = ["#3E5A34", "#5E7E4A", "#86A466"];
export function drawCrack(c, V, t) {
  const L = crackLen(t), heal = healK(t), a = (1 - heal) * (L > 0.005 ? 1 : 0); if (a <= 0) return;
  const [sx, sy] = winScreen(V, t, 0), r = cornerR(t), pts = crackPath(r), op = openK(t), S = (p) => [sx + p[0], sy + p[1]];
  const { i: iT, p: tip } = along(pts, L), path = [...pts.slice(0, iT + 1), tip];
  const g = (X, Y, col) => { X = R(X); Y = R(Y); if (a >= 1 || a > bayer(X + 1, Y + 3)) put(c, X, Y, hex(col)); };
  // "tore open": the sliver of skin between the crack and the frame's rivet line swings out on that riveted line like a
  // little door: its free edge comes toward us and slides right (foreshortened), a dark hole opens along the crack
  if (op > 0.01) {
    const hx = FRAME0 - 2, cs = Math.cos(op * 1.05), sw = (p) => [hx - (hx - p[0]) * cs, p[1] - (1 - cs) * 3];
    const fg = fade(c, a), Sp = (p) => { const q = S(p); return [R(q[0]), R(q[1])]; };
    const crackScreen = path.map(Sp), edge = path.map((p) => Sp(sw(p))), bot = Sp([hx, path[0][1] + 1]), topH = Sp([hx, path[path.length - 1][1]]);
    fg.poly([...crackScreen, ...edge.slice().reverse()], "#140C1C");                                  // the hole
    fg.poly([...edge, topH, bot], mix("#B6B5CF", "#9896B6", op));                                       // the flap, turned away from the sun
    const hxs = R(S([hx, 0])[0]);
    for (let y = topH[1]; y <= bot[1]; y++) { const x0 = edgeX(edge, y); if (x0 == null) continue; for (let x = R(x0) + 2; x < hxs; x++) if (x - R(x0) < 3) fg.px(x, y, mix("#E3E3EF", "#B6B5CF", op * 0.6)); }
    for (let i = 0; i < edge.length - 1; i++) { fg.line(edge[i][0], edge[i][1], edge[i + 1][0], edge[i + 1][1], PRIMER[2]); fg.line(edge[i][0] - 1, edge[i][1], edge[i + 1][0] - 1, edge[i + 1][1], PRIMER[0]); }
    fg.line(bot[0], bot[1], edge[0][0], edge[0][1], "#2A2440"); fg.line(topH[0], topH[1], edge[edge.length - 1][0], edge[edge.length - 1][1], "#2A2440");
    // a glimpse of the yellow insulation blanket inside the hole
    for (let i = 1; i < crackScreen.length - 1; i += 2) { const [x, y] = crackScreen[i], [ex] = edge[i]; if (ex - x > 4) { fg.px(R((x + ex) / 2), y, "#8A6A2A"); fg.px(R((x + ex) / 2) + 1, y, "#6A4E1E"); } }
  }
  // a white flash where the metal gives way
  const fl = sm(t, EV.tore2 - 0.02, EV.tore2 + 0.08) * (1 - sm(t, EV.tore2 + 0.1, EV.tore2 + 0.42));
  if (fl > 0.02) { const [mx, my] = S(along(pts, 0.55).p), rr = 5 + 22 * sm(t, EV.tore2, EV.tore2 + 0.42); for (let Y = R(my - rr - 2); Y <= R(my + rr + 2); Y++) for (let X = R(mx - rr - 2); X <= R(mx + rr + 2); X++) { const q = Math.abs(Math.hypot(X - mx, Y - my) - rr); if (q < 1.6 && fl > bayer(X, Y)) put(c, X, Y, hex(q < 0.7 ? "#FFFFFF" : "#FFE6A0")); else if (Math.hypot(X - mx, Y - my) < rr * 0.5 && fl * 0.6 > bayer(X, Y)) put(c, X, Y, hex("#FFFFFF")); } }
  // the crack line itself: dark core, a white lip on its lit side, a hot tip while it grows
  for (let s = 0; s < path.length - 1; s++) {
    const [ax, ay] = S(path[s]), [bx, by] = S(path[s + 1]), n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let q = 0; q <= n; q++) { const x = lerp(ax, bx, q / n), y = lerp(ay, by, q / n); g(x, y, DARK); g(x - 1, y - 1, LIP); if (s < 2) g(x + 1, y, DARK); }
  }
  // two hairline branches once it is long enough
  for (const [si, ang, len] of [[2, -0.9, 7], [5, 0.8, 6]]) {
    const f = (si + 1) / (pts.length - 1); if (L < f) continue;
    const grow = clamp01((L - f) / 0.15), [bx, by] = S(pts[si]);
    for (let q = 0; q <= len * grow; q++) g(bx + Math.cos(ang) * q, by - Math.sin(Math.abs(ang)) * q * 0.8 + (ang > 0 ? q * 0.3 : -q * 0.2), DARK);
  }
  const tipA = sm(L, 0, 0.04) * (1 - sm(t, EV.openEnd - 0.1, EV.openEnd + 0.25)) * (t > EV.cracks - 0.2 ? 1 : 0);
  if (tipA > 0.02) { const [tx, ty] = S(tip), gt = (X, Y, col) => { if (tipA * a > bayer(X, Y)) put(c, R(X), R(Y), hex(col)); }; gt(tx, ty, "#FFFFFF"); gt(tx + 1, ty, "#FFE6A0"); gt(tx, ty - 1, "#FFE6A0"); gt(tx - 1, ty, "#F6A23C"); gt(tx, ty + 1, "#F6A23C"); }
  // wind streaks + puffs: cabin air rushing out of the tear, swept back along the fuselage
  const wa = op * (1 - sm(t, EV.openEnd + 0.3, EV.round2 + 0.05));
  if (wa > 0.02) for (let n = 0; n < 10; n++) {
    const ph = ((t - EV.tore2) * 1.9 + rnd(n * 13)) % 1, sp = along(pts, 0.15 + 0.8 * rnd(n * 7)).p, len = 40 + rnd(n * 3) * 50, [px, py] = S(sp);
    const x1 = px - 2 - ph * 190, y1 = py - ph * (6 + rnd(n) * 16), aa = wa * Math.sin(Math.PI * Math.min(1, ph * 1.3));
    for (let q = 0; q < len; q++) { const X = R(x1 - q), Y = R(y1 - q * 0.08), k = aa * (1 - (q / len) ** 2); if (k * 1.4 > bayer(X, Y)) { put(c, X, Y - 2, hex("#5E7EC0")); put(c, X, Y - 1, hex("#FFFFFF")); put(c, X, Y, hex(q < 6 ? "#FFFFFF" : "#DDEEFF")); put(c, X, Y + 1, hex("#5E7EC0")); } }
  }
  for (let n = 0; n < 6; n++) {
    const t0 = EV.tore2 + n * 0.09, u = (t - t0) / 0.8; if (u <= 0 || u >= 1) continue;
    const [px, py] = S(along(pts, 0.35 + 0.1 * n).p), x = px - 8 - u * (70 + n * 12), y = py - u * (14 + rnd(n) * 20), rr = 3 + 7 * Math.sqrt(u), aa = Math.min(1, u * 6) * (1 - u) * (1 - healK(t));
    for (let Y = R(y - rr - 1); Y <= R(y + rr + 1); Y++) for (let X = R(x - rr - 1); X <= R(x + rr + 1); X++) { const q = Math.hypot(X - x, Y - y); if (q > rr + 0.5 || aa <= bayer(X, Y)) continue; put(c, X, Y, hex(q > rr - 1 ? "#8EA6D8" : X - x + Y - y < -rr * 0.4 ? "#FFFFFF" : "#E6EEFA")); }
  }
}
function edgeX(e, y) { for (let i = 0; i < e.length - 1; i++) { const [ax, ay] = e[i], [bx, by] = e[i + 1]; if ((y <= ay && y >= by) || (y >= ay && y <= by)) return ax + (bx - ax) * ((y - ay) / (by - ay || 1e-6)); } return null; }
function rightOf(pts, [x, y]) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; if ((y <= ay && y >= by) || (y >= ay && y <= by)) { const k = (y - ay) / (by - ay || 1e-6), cx = ax + (bx - ax) * k; return x > cx + 1 && x < FRAME0 - 2; } } return false; }

// ---------------------------------------------------------------- the hook: a red square ghost over the round window
const RED = "#E03056", RED2 = "#FF8AA0";
export function drawGhost(c, V, t) {
  const [g0, g1] = SQUARE_GHOST; if (t < g0 || t > g1) return;
  const flick = t < g0 + 0.5 ? 0.6 + 0.4 * Math.abs(Math.sin(t * 31)) : 1, a = sm(t, g0, g0 + 0.3) * flick * (1 - sm(t, g1 - 0.6, g1)); if (a <= 0.01) return;
  const [sx, sy] = winScreen(V, t, 0), r = cornerR(t);
  for (let y = sy - HH - RING - 3; y <= sy + HH + RING + 3; y++) for (let x = sx - HW - RING - 3; x <= sx + HW + RING + 3; x++) {
    if (a < 1 && a <= bayer(x + 2, y)) continue;
    const u = x - sx + 0.5, v = y - sy + 0.5, ds = sdRR(u, v, HW + 3, HH + 3, 3), dr = sdRR(u, v, HW, HH, r);
    if (Math.abs(ds) < 1.6) put(c, x, y, hex(ds < -0.4 ? RED2 : RED));
    else if (ds < 0 && dr >= 0) { if ((x + y) % 2 === 0) put(c, x, y, hex(RED)); }          // the sharp corners the round window doesn't have
  }
  // a zigzag crack shoots from the square's top-right corner on "tore"
  const k = sm(t, EV.tore1 - 0.04, EV.tore1 + 0.22); if (k <= 0) return;
  const pts = [[0, 0], [5, -4], [3, -9], [10, -13], [8, -19], [15, -24], [14, -30], [21, -36]], n = pts.length - 1, upto = k * n;
  const ox = sx + HW + 3, oy = sy - HH - 3;
  for (let s = 0; s < Math.min(n, Math.ceil(upto)); s++) {
    const f = Math.min(1, upto - s), [ax, ay] = pts[s], [bx, by] = pts[s + 1], m = Math.ceil(Math.hypot(bx - ax, by - ay) * f);
    for (let q = 0; q <= m; q++) { const X = R(ox + ax + (bx - ax) * (q / Math.max(1, Math.hypot(bx - ax, by - ay)))), Y = R(oy + ay + (by - ay) * (q / Math.max(1, Math.hypot(bx - ax, by - ay)))); if (a < 1 && a <= bayer(X, Y)) continue; put(c, X, Y, hex("#4A0A1C")); put(c, X + 1, Y, hex(RED)); put(c, X - 1, Y - 1, hex("#FFFFFF")); }
  }
  if (k < 1 && k > 0) { const s = Math.min(n, Math.floor(upto)), [px, py] = pts[s]; const X = R(ox + px), Y = R(oy + py); for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) put(c, X + dx, Y + dy, hex(dx || dy ? "#FFE6A0" : "#FFFFFF")); }
}

// ---------------------------------------------------------------- glints running around a ring, and the ✓ badges
/** A bright highlight travelling once around window k's seal ring during [t0, t1]. */
export function drawGlint(c, V, t, k, t0, t1) {
  if (t < t0 || t > t1) return;
  const u = sm(t, t0, t1), a = Math.sin(Math.PI * u), [sx, sy] = winScreen(V, t, k), r = radiusOf(k, t), th = -2.4 + u * 2 * Math.PI;
  for (let y = sy - HH - RING - 1; y <= sy + HH + RING + 1; y++) for (let x = sx - HW - RING - 1; x <= sx + HW + RING + 1; x++) {
    const dx = x - sx + 0.5, dy = y - sy + 0.5, dd = sdRR(dx, dy, HW, HH, r); if (dd < 0.5 || dd > RING - 0.5) continue;
    let da = Math.atan2(dy / HH, dx / HW) - th; da = Math.atan2(Math.sin(da), Math.cos(da));
    const w = Math.exp(-((da / 0.32) ** 2)) * a; if (w > bayer(x, y) * 0.95) put(c, x, y, hex(w > 0.6 ? "#FFFFFF" : "#E6F4FF"));
  }
}
const CHECK = ["......##", ".....##.", "##..##..", ".####...", "..##...."];
export function drawBadge(c, x, y, a) {
  if (a <= 0) return;
  const g = (X, Y, col) => { if (a >= 1 || a > bayer(X, Y)) put(c, X, Y, hex(col)); };
  for (let Y = -12; Y <= 12; Y++) for (let X = -12; X <= 12; X++) { const q = Math.hypot(X, Y); if (q > 11.6) continue; g(x + X, y + Y, q > 10.4 ? "#123E14" : X + Y < -9 ? "#9BF07A" : X + Y > 9 ? "#3E9A2C" : "#65DA41"); }
  CHECK.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== "#") return; for (let b = 0; b < 2; b++) for (let q = 0; q < 2; q++) { g(x - 8 + i * 2 + q + 1, y - 5 + j * 2 + b + 1, "#1E5A20"); g(x - 8 + i * 2 + q, y - 5 + j * 2 + b, "#FFFFFF"); } }));
}
/** "…every airliner has rounded windows": a glint runs round each window frame, left → right, then a ✓ pops beside it. */
export function drawRowSparkle(c, V, t, ks) {
  const t0 = EV.rounded - 0.12, tEnd = EV.windows2End + 1.0; if (t < t0 - 0.1 || t > tEnd) return;
  const order = ks.map((k) => [k, winScreen(V, t, k)[0]]).filter(([, x]) => x > -60 && x < GW + 60).sort((a, b) => a[1] - b[1]);
  order.forEach(([k, x], n) => {
    const tk = t0 + n * 0.12;
    drawGlint(c, V, t, k, tk, tk + 0.5);
    const a = sm(t, tk + 0.18, tk + 0.4) * (1 - sm(t, tEnd - 0.45, tEnd)), [sx, sy] = winScreen(V, t, k);
    drawBadge(c, R(sx + HW - 4), R(sy - HH - 2), a);
    // twinkles around the badge as it lands
    const tw = sm(t, tk + 0.2, tk + 0.35) * (1 - sm(t, tk + 0.5, tk + 0.8));
    if (tw > 0.05) for (let q = 0; q < 4; q++) { const an = q * 1.57 + 0.6, rr = 15 + 6 * sm(t, tk + 0.2, tk + 0.8), X = R(sx + HW - 4 + Math.cos(an) * rr), Y = R(sy - HH - 2 + Math.sin(an) * rr); if (tw > bayer(X, Y)) { put(c, X, Y, hex("#FFFFFF")); put(c, X + 1, Y, hex("#FFF2A8")); put(c, X - 1, Y, hex("#FFF2A8")); put(c, X, Y + 1, hex("#FFF2A8")); put(c, X, Y - 1, hex("#FFF2A8")); } }
  });
}
