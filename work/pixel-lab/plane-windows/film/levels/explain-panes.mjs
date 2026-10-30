// EXPLAIN · the exploded three-pane window (screen space, anchored to the hero window's screen centre).
// On "three layers" the OUTER (thick), MIDDLE (with the tiny ringed breather hole) and INNER (thin scratch pane) panes
// slide out of the window toward the lower right into an oblique stack (×1.5 … ×1.8 by the room), labelled with leader lines; then air flows
// through the hole into the gap, pressure arrows push on the OUTER pane only, the what-if crack moves the load onto the
// MIDDLE pane (BACKUP), fog fills the gap and vents through the hole (NO FOG), the hole sparkles on "safety feature", and the
// panes slide back into the window. Everything continuous: eased motion, dithered dissolves, no one-frame changes.
// Illustration, not to scale; not a real window's dimensions.
import { EV, WIN, HERO_WIN, WIN_Y, EXPLODE, AIRFLOW, LOAD, BACKUP_TEST, FOG, CAM } from "../timeline.mjs";
import { MAIN, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { GW, R, clamp01, sm, ease, lerp, win, rnd, MASK, bbox, clearMask, fillMask, rrect, put, blend, rgb, line } from "./explain-geo.mjs";

// ---------------------------------------------------------------- geometry of the exploded state (window units: the window is 108 × 150)
// The stack ends at a fixed screen point (TARGET) on a dark diagram card that starts just right of the hero window's frame
// at the explode camera (read from CAM, eased like render.mjs) and ends at x 470; the scale grows with the room (×1.5 … ×1.8).
export const PANES = {
  inner: { z: -31, th: 2.5, lag: 0.16, backLag: 0, text: "INNER" },
  middle: { z: 0, th: 5, lag: 0.08, backLag: 0.08, text: "MIDDLE" },
  outer: { z: 42, th: 9, lag: 0, backLag: 0.16, text: "OUTER" },
};
const camCx = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1]; return Math.round(lerp(a.cx, b.cx, ease((t - a.t) / (b.t - a.t || 1)))); };
const TH = (64 * Math.PI) / 180, AL = (18 * Math.PI) / 180;
const FRAME_R = 270 + HERO_WIN.x - camCx(EXPLODE.out[1] + 0.3) + WIN.w / 2 + 8;            // the hero window frame's right edge (screen)
const SPAN = 2 * (WIN.w / 2) * Math.cos(TH) + (PANES.outer.z - PANES.inner.z + PANES.inner.th) * Math.sin(TH);
const CARD_X = Math.min(330, Math.max(240, FRAME_R)), CARD_W = 470 - CARD_X;
export const EX = { th: TH, al: AL, s: Math.min(1.8, (CARD_W - 4) / SPAN), D: PANES.outer.z };
const stackBox = (() => {      // extents of the exploded stack around its centre (screen px)
  const ct = Math.cos(TH), st = Math.sin(TH), ca = Math.cos(AL), sa = Math.sin(AL); let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of Object.values(PANES)) for (const z of [p.z, p.z - p.th]) for (const [u, v] of rrect(WIN.w, WIN.h, WIN.r, 7)) { const X = u * ct + z * st, Zd = -u * st + z * ct, x = EX.s * X, y = EX.s * (v * ca + Zd * sa); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, x1, y0, y1 };
})();
export const TARGET = [CARD_X + 2 - stackBox.x0, 618 - stackBox.y1];
const CARD_Y = Math.round(TARGET[1] + stackBox.y0 - 76);
export const CARD = { x: CARD_X, y: CARD_Y, w: CARD_W, h: 630 - CARD_Y };
export const HOLE = { u: -14, v: 56, r: 3.6, ring: 10 };
const OUTL = rrect(WIN.w, WIN.h, WIN.r, 7);
const LOOK = {
  outer: { glass: "#86DCE6", k: 0.3, edge: ["#1E5E68", "#3E9AA2", "#86DCD8"], out: "#08222A", rim: "#E4FFFF" },
  middle: { glass: "#B8E0FF", k: 0.24, edge: ["#2C5C86", "#5A94C2", "#A6D2F2"], out: "#0C1C34", rim: "#F0FAFF" },
  inner: { glass: "#ECEAF6", k: 0.4, edge: ["#6E6A8C", "#A8A4C4", "#E2DEF2"], out: "#221E38", rim: "#FFFFFF" },
};
for (const L of Object.values(LOOK)) { L.glassC = rgb(L.glass); L.edgeC = L.edge.map(rgb); L.outC = rgb(L.out); L.rimC = rgb(L.rim); }
const COL = { O: rgb("#0B0812"), IV: rgb("#FDFEED"), Y: rgb("#F4CA50"), CY: rgb("#7FE3F0"), CYD: rgb("#2A8AA0"), W: rgb("#FFFFFF"), RED: rgb("#FF5468"), GR: rgb("#65DA41"), FOG: rgb("#DDE2EA"), FOGD: rgb("#A8B0C0") };

// ---------------------------------------------------------------- timing
const OUT = EXPLODE.out, BACK = EXPLODE.back;
/** Explode progress of one pane (0 in the window … 1 in the stack), staggered: OUTER leaves first, returns last. */
export function explodeK(t, p) {
  const dOut = OUT[1] - OUT[0] - 0.16, dBack = BACK[1] - BACK[0] - 0.16;
  return ease((t - OUT[0] - p.lag) / dOut) * (1 - ease((t - BACK[0] - p.backLag) / dBack));
}
export const HOLE_IN = EV.hole1 - 0.12;                              // the ringed hole appears on "that tiny hole?"
export const HOLE_OUT = BACK[1] + 0.1;                               // … and dissolves with the panes as they arrive home
export const LABELS = [OUT[1] - 0.2, BACK[0] + 0.05];               // pane labels (staggered in, out before the slide back)
export const AIR = { flow: AIRFLOW, fill: [AIRFLOW[0] + 0.45, AIRFLOW[1] + 0.2], gone: [BACKUP_TEST[0] + 0.5, BACKUP_TEST[0] + 1.0] };
export const ARROWS = { in: [LOAD[0] + 0.05, LOAD[0] + 0.5], shift: [EV.waits - 0.28, EV.waits + 0.22], out: [BACKUP_TEST[1] - 0.2, BACKUP_TEST[1] + 0.25] };
export const CRACK = { grow: [BACKUP_TEST[0] + 0.02, BACKUP_TEST[0] + 0.32], gone: [BACKUP_TEST[1] - 0.4, BACKUP_TEST[1]] };
export const FOGT = { fill: [FOG[0], FOG[0] + 0.5], drain: [EV.out - 0.1, EV.fog - 0.15], tag: [EV.fog - 0.1, FOG[1] + 0.35] };
export const CALLOUTS = [
  { text: "CARRIES THE PRESSURE", at: "outer", t: [EV.carries - 0.12, EV.middle2 + 0.32], col: "#7FE3F0" },
  { text: "BACKUP", at: "middle", t: [EV.backup - 0.12, AIR.gone[1] + 0.35 + 0.45], col: "#65DA41", icon: "shield" },
  { text: "NO FOG", at: "gap", t: [FOGT.tag[0], FOGT.tag[1]], col: "#FDFEED", icon: "check" },
];
export const SPARKLE = [EV.safety - 0.05, EV.featureEnd + 0.15];

// ---------------------------------------------------------------- projection: window-local (u, v) on a pane at depth z → screen
export function projector(e, O) {
  const th = EX.th * e, al = EX.al * e, s = 1 + (EX.s - 1) * e, cx = lerp(O[0], TARGET[0], e), cy = lerp(O[1], TARGET[1], e);
  const ct = Math.cos(th), st = Math.sin(th), ca = Math.cos(al), sa = Math.sin(al);
  const P = (u, v, z) => { const X = u * ct + z * st, Zd = -u * st + z * ct; return [cx + s * X, cy + s * (v * ca + Zd * sa)]; };
  P.s = s; P.ct = ct; P.ca = ca; P.e = e; P.dz = [s * st, s * ct * sa];   // screen step per +1 z (toward the outside)
  return P;
}
export const anchor = (V) => [V.X(HERO_WIN.x), V.Y(WIN_Y)];

// ---------------------------------------------------------------- one pane (a glass slab): edge band, see-through face, rim, outline
function drawPane(c, P, p, L, a, glow = 0) {
  if (a <= 0) return;
  const z = p.z * P.e, F = OUTL.map(([u, v]) => P(u, v, z)), B = OUTL.map(([u, v]) => P(u, v, z - p.th));
  const bb = bbox([F, B], 2); clearMask(bb);
  fillMask(F, 1); fillMask(B, 2);
  for (let i = 0; i < F.length; i++) { const j = (i + 1) % F.length; fillMask([F[i], F[j], B[j], B[i]], 2); }
  const out = glow > 0 ? mix(L.outC, COL.Y, glow * 0.85) : L.outC, rim = glow > 0 ? mix(L.rimC, "#FFF4B0", glow) : L.rimC;
  for (let y = bb.y0 + 1; y < bb.y1; y++) for (let x = bb.x0 + 1; x < bb.x1; x++) {
    const i = y * GW + x, m = MASK[i]; if (!m) continue;
    const l = MASK[i - 1], r = MASK[i + 1], u = MASK[i - GW], d = MASK[i + GW];
    if (!l || !r || !u || !d) { put(c, x, y, out, a); if (glow > 0.3 && !u) put(c, x, y - 1, out, a * glow); continue; }
    if (m & 1) {
      if (!(l & 1) || !(r & 1) || !(u & 1) || !(d & 1)) { put(c, x, y, rim, a); continue; }
      blend(c, x, y, L.glassC, L.k * (0.3 + 0.7 * P.e) * (1.25 - 0.5 * (y - bb.y0) / (bb.y1 - bb.y0)) + glow * 0.12, a, 4);
    } else {
      const col = !(MASK[i - 2 * GW]) ? L.edgeC[2] : !(MASK[i + 2 * GW]) || !(MASK[i + 2]) ? L.edgeC[0] : L.edgeC[1];
      put(c, x, y, col, a);
    }
  }
  // two reflection streaks on the face (clipped to it)
  for (const [u0, v0, u1, v1, k] of [[-46, -18, -8, -70, 0.7], [-46, 12, 6, -60, 0.4], [-40, 30, -30, 16, 0.4]]) {
    const A = P(u0, v0, z), Bp = P(u1, v1, z), n = Math.ceil(Math.hypot(Bp[0] - A[0], Bp[1] - A[1]));
    for (let q = 0; q <= n; q++) { const x = R(A[0] + ((Bp[0] - A[0]) * q) / n), y = R(A[1] + ((Bp[1] - A[1]) * q) / n), i = y * GW + x; if (MASK[i] & 1 && MASK[i - 1] & 1 && MASK[i + 1] & 1) blend(c, x, y, COL.W, k, a, 3); }
  }
  return { F, B };
}

/** Solid elliptical ring of the given pixel width. */
function eRing(c, cx, cy, rx, ry, w, col, a) {
  const m = Math.min(rx, ry);
  for (let y = Math.floor(cy - ry - w); y <= Math.ceil(cy + ry + w); y++) for (let x = Math.floor(cx - rx - w); x <= Math.ceil(cx + rx + w); x++) {
    const q = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry), d = Math.abs(q - 1) * m * (1 + 0.6 * Math.abs((y + 0.5 - cy) / ry) * (ry / rx - 1) / Math.max(1, ry / rx));
    if (d < w / 2) put(c, x, y, col, a);
  }
}

// ---------------------------------------------------------------- the breather hole (on the MIDDLE pane), with a yellow ring
function drawHole(c, P, z, a, t) {
  if (a <= 0) return;
  const [hx, hy] = P(HOLE.u, HOLE.v, z), rx = Math.max(1.2, HOLE.r * P.s * P.ct), ry = HOLE.r * P.s * P.ca;
  // ring: pulses on each "hole" word, turns green and sparkles on "safety feature"
  const pulse = Math.max(...[EV.hole1, EV.hole2, EV.hole3].map((w) => { const u = (t - w + 0.05) / 0.7; return u > 0 && u < 1 ? Math.sin(Math.PI * u) : 0; }));
  const safe = sm(t, SPARKLE[0], SPARKLE[0] + 0.3), ringCol = mix("#F4CA50", "#65DA41", safe);
  const rr = HOLE.ring * (1 + 0.35 * pulse);
  const rxx = Math.max(3, rr * P.s * P.ct), ryy = rr * P.s * P.ca;
  eRing(c, hx, hy, rxx, ryy, 3.4, COL.O, a);                          // dark outline ring, then the bright ring
  eRing(c, hx, hy, rxx, ryy, 1.5, rgb(ringCol), a);
  // "safety feature": two bright rings burst out of the hole and fade
  for (const [d0, col] of [[0, "#FFF4B0"], [0.18, "#65DA41"]]) {
    const u = (t - SPARKLE[0] - d0) / 0.75; if (u <= 0 || u >= 1) continue;
    const k = 1 + 2.6 * ease(u); eRing(c, hx, hy, rxx * k + 2 * u, ryy * k, 1.6, rgb(col), a * (1 - u));
  }
  // the hole: dark core with a light lower lip
  for (let y = Math.floor(hy - ry - 1); y <= Math.ceil(hy + ry + 1); y++) for (let x = Math.floor(hx - rx - 1); x <= Math.ceil(hx + rx + 1); x++) {
    const d = ((x + 0.5 - hx) / (rx + 0.6)) ** 2 + ((y + 0.5 - hy) / (ry + 0.6)) ** 2; if (d > 1) continue;
    const din = ((x + 0.5 - hx) / rx) ** 2 + ((y + 0.5 - hy) / ry) ** 2;
    put(c, x, y, din > 1 ? (y + 0.5 > hy ? COL.IV : rgb("#8AA8C8")) : rgb("#05040A"), a);
  }
  // sparkles on "safety feature"
  const sp = win(t, SPARKLE[0], SPARKLE[1], 0.2, 0.35);
  if (sp > 0) for (let i = 0; i < 7; i++) {
    const ph = ((t - SPARKLE[0]) * 1.3 + i / 7) % 1, ang = i * 2.39 + 0.6, dist = 12 + 24 * ph, size = Math.sin(Math.PI * ph);
    const x = R(hx + Math.cos(ang) * dist * 1.1), y = R(hy + Math.sin(ang) * dist * 1.25), L = R(1 + 5 * size), col = i % 2 ? COL.W : rgb("#FFF4B0");
    for (let q = -L; q <= L; q++) { put(c, x + q, y, Math.abs(q) === L ? COL.Y : col, sp * size); put(c, x, y + q, Math.abs(q) === L ? COL.Y : col, sp * size); }
  }
}

// ---------------------------------------------------------------- gap volume between two faces (for air tint and fog)
function gapMask(F, B) {
  const bb = bbox([F, B], 2); clearMask(bb);
  fillMask(F, 1); fillMask(B, 1);
  for (let i = 0; i < F.length; i++) { const j = (i + 1) % F.length; fillMask([F[i], F[j], B[j], B[i]], 1); }
  return bb;
}

// ---------------------------------------------------------------- arrows (pressure), drawn along +z in screen space
function arrow(c, x0, y0, x1, y1, col, a) {
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const pts = (w) => { const out = []; for (let s = 0; s <= L - 5; s += 0.5) for (let q = -w; q <= w; q++) out.push([x0 + ux * s + nx * q * 0.5, y0 + uy * s + ny * q * 0.5]); for (let s = 0; s <= 6; s += 0.5) { const hw = (6 - s) * 1.05 + (w - 2) * 0.5; for (let q = -hw * 2; q <= hw * 2; q++) out.push([x1 - ux * (6 - s) + nx * q * 0.5, y1 - uy * (6 - s) + ny * q * 0.5]); } return out; };
  for (const [x, y] of pts(4)) put(c, R(x), R(y), COL.O, a);            // outline (wider)
  for (const [x, y] of pts(2)) put(c, R(x), R(y), col, a);
}

// ---------------------------------------------------------------- the crack (what-if), a dashed zigzag on the OUTER face
const CRACK_PTS = [[8, -66], [-8, -46], [4, -26], [-14, -4], [-2, 16], [-20, 40], [-10, 58]];
function drawCrack(c, P, z, grow, a) {
  if (a <= 0 || grow <= 0) return;
  const S = CRACK_PTS.map(([u, v]) => P(u, v, z + 0.5)); let total = 0; const segs = [];
  for (let i = 0; i + 1 < S.length; i++) { const L = Math.hypot(S[i + 1][0] - S[i][0], S[i + 1][1] - S[i][1]); segs.push(L); total += L; }
  let left = grow * total, n = 0;
  for (let i = 0; i + 1 < S.length && left > 0; i++) {
    const k = Math.min(1, left / segs[i]); left -= segs[i];
    const x1 = S[i][0] + (S[i + 1][0] - S[i][0]) * k, y1 = S[i][1] + (S[i + 1][1] - S[i][1]) * k, m = Math.ceil(segs[i] * k);
    for (let q = 0; q <= m; q++, n++) { if (n % 6 >= 4) continue; const x = R(S[i][0] + ((x1 - S[i][0]) * q) / m), y = R(S[i][1] + ((y1 - S[i][1]) * q) / m); put(c, x - 1, y, COL.O, a); put(c, x + 2, y, COL.O, a); put(c, x, y - 1, COL.O, a); put(c, x + 1, y + 1, COL.O, a); put(c, x, y, COL.RED, a); put(c, x + 1, y, COL.RED, a); }
  }
}

// ---------------------------------------------------------------- tags (labels, callouts)
const TAGC = { panel: rgb("#120C1D"), edge2: rgb("#3B2C5C") };
function tagBox(c, x, y, w, h, edge, a) {
  const E = rgb(edge);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1); if (corner) continue;
    const border = i === 0 || j === 0 || i === w - 1 || j === h - 1;
    put(c, x + i, y + j, border ? E : j === 1 || i === 1 || i === w - 2 || j === h - 2 ? TAGC.edge2 : mix("#120C1D", "#1D1430", j / h), a);
  }
  for (let i = 2; i < w - 2; i++) put(c, x + i, y + h, COL.O, a);      // drop shadow
}
function text(c, s, x, y, col, a, scale = 2, font = MAIN) { if (a > 0) { const g = fade(c, a); g.text(font, s, x + 1, y + 1, "#0B0812", { scale }); g.text(font, s, x, y, col, { scale }); } }
function shield(c, x, y, col, a) { // 11 × 13 pixel shield with a check
  const rows = ["XXXXXXXXXXX", "XGGGGGGGGGX", "XGGGGGGGGGX", "XGGGGGGGWGX", "XGGGGGGWWGX", "XGWGGGWWGGX", "XGWWGWWGGGX", ".XGWWWGGGX.", ".XGGWGGGGX.", "..XGGGGGX..", "...XGGGX...", "....XGX....", ".....X....."];
  const g = fade(c, a); rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== ".") g.px(x + i, y + j, ch === "X" ? "#0B0812" : ch === "W" ? "#FDFEED" : col); }));
}

// ---------------------------------------------------------------- particles (air in, fog out)
const NAIR = 46;
/** The air's way: from inside the hero's window (cabin) to the hole (screen space), then from the hole into the gap. */
function guidePts(P, O) {
  const [hx, hy] = P(HOLE.u, HOLE.v, 0), A = [O[0] + 22, O[1] + 46], B = [hx - 30, hy + 26], q = (p0, p1, p2, k) => [0, 1].map((i) => (1 - k) * (1 - k) * p0[i] + 2 * (1 - k) * k * p1[i] + k * k * p2[i]);
  const seg1 = [], seg2 = [], E = P(-4, 4, 26), Cc = P(HOLE.u, HOLE.v - 26, 12);
  for (let i = 0; i <= 40; i++) seg1.push(q(A, B, [hx, hy], i / 40));
  for (let i = 0; i <= 24; i++) seg2.push(q([hx, hy], Cc, E, i / 24));
  return { seg1, seg2 };
}
function dashes(c, S, t, a, len0 = 0) {
  let len = len0;
  for (let i = 1; i < S.length; i++) {
    const [x0, y0] = S[i - 1], [x1, y1] = S[i], d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.ceil(d));
    for (let k = 0; k < n; k++) { const L = len + (d * k) / n, x = R(x0 + ((x1 - x0) * k) / n), y = R(y0 + ((y1 - y0) * k) / n); if (((L - t * 46) % 12 + 12) % 12 < 6) { put(c, x, y + 2, COL.O, a * 0.8); put(c, x + 1, y + 2, COL.O, a * 0.8); put(c, x, y, COL.CY, a); put(c, x + 1, y, COL.CY, a); put(c, x, y + 1, COL.CYD, a); put(c, x + 1, y + 1, COL.CY, a); } }
    len += d;
  }
  return len;
}
function airDot(c, x, y, a, col = COL.W, rim = COL.CYD) {
  for (const [dx, dy] of [[0, -1], [1, -1], [-1, 0], [2, 0], [-1, 1], [2, 1], [0, 2], [1, 2]]) put(c, x + dx, y + dy, rim, a * 0.85);
  put(c, x, y, col, a); put(c, x + 1, y, col, a); put(c, x, y + 1, col, a); put(c, x + 1, y + 1, mix(col, "#7FE3F0", 0.4), a);
}
/** Air particle i at time t: phase 1 = screen point along the guide (cabin → hole), phase 2 = 3D point (hole → spread in the gap). */
function airPos(i, t, G) {
  const [a, b] = AIR.flow, dur = 0.95, t0 = a + (i / NAIR) * (b - a - dur * 0.6), s = (t - t0) / dur;
  if (s <= 0) return null;
  if (s < 0.6) { const k = ease(s / 0.6), n = G.seg1.length - 1, f = k * n, j = Math.min(n - 1, Math.floor(f)), r = f - j, p = G.seg1[j], q = G.seg1[j + 1], off = (1 - k) * 10;
    return { scr: [p[0] + (q[0] - p[0]) * r + (rnd(i * 7 + 1) - 0.5) * off, p[1] + (q[1] - p[1]) * r + (rnd(i * 7 + 2) - 0.5) * off] }; }
  const u1 = (rnd(i * 7 + 4) - 0.5) * 84, v1 = -60 + rnd(i * 7 + 5) * 118, z1 = PANES.middle.z + 6 + rnd(i * 7 + 6) * (EX.D - PANES.outer.th - 14);
  const k = ease(Math.min(1, (s - 0.6) / 0.4)), jig = Math.max(0, s - 1);
  return { p3: [lerp(HOLE.u, u1, k) + Math.sin(t * 3 + i) * 2 * Math.min(1, jig * 3), lerp(HOLE.v, v1, Math.sqrt(k)) + Math.cos(t * 2.6 + i * 1.7) * 2 * Math.min(1, jig * 3), lerp(1, z1, k)] };
}

// ---------------------------------------------------------------- the dark diagram card behind the stack (so glass, air and fog read)
function drawCard(c, a) {
  if (a <= 0) return;
  const { x, y, w, h } = CARD, edge = rgb("#7FE3F0"), edge2 = rgb("#2C4E6E");
  for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) {
    const X = x + i, Y = y + j, cr = (i < 3 || i >= w - 3) && (j < 3 || j >= h - 3);
    if (cr) { const dx = i < 3 ? 3 - i : i - (w - 4), dy = j < 3 ? 3 - j : j - (h - 4); if (dx * dx + dy * dy > 10) continue; }
    if (j === h || (i === w && j > 2)) { put(c, X + 1, Y + 2, COL.O, a); continue; }
    if (i < 0 || j < 0) continue;
    const border = i === 0 || j === 0 || i === w - 1 || j === h - 1 || (cr && (i < 2 || i >= w - 2 || j < 2 || j >= h - 2));
    if (border) { put(c, X, Y, edge, a); continue; }
    if (i === 1 || j === 1 || i === w - 2 || j === h - 2) { put(c, X, Y, edge2, a); continue; }
    const v = j / h, s = v * 5, lo = Math.floor(s), q = (s - lo > bayer(X, Y) ? lo + 1 : lo) / 5;
    put(c, X, Y, mix("#1A2A48", "#0E1426", q), a);
  }
  // faint grid, like a technical drawing
  for (let j = 14; j < h - 6; j += 16) for (let i = 8; i < w - 6; i += 2) put(c, x + i, y + j, rgb("#22355A"), a);
}

// ---------------------------------------------------------------- the whole thing
export function drawPanes(c, V, t) {
  const holeA = sm(t, HOLE_IN, HOLE_IN + 0.3) * (1 - sm(t, HOLE_OUT - 0.4, HOLE_OUT));
  if (t < HOLE_IN || t > HOLE_OUT + 0.1) return;
  const O = anchor(V);
  const E = { inner: explodeK(t, PANES.inner), middle: explodeK(t, PANES.middle), outer: explodeK(t, PANES.outer) };
  const Pj = { inner: projector(E.inner, O), middle: projector(E.middle, O), outer: projector(E.outer, O) };
  // pane visibility (time-based): the panes appear in the window frame as the slide starts (the plane's glass leaves
  // the frame at the same time) and, once home again, dissolve back into the plane's glass
  const PA = (p) => sm(t, OUT[0] + p.lag - 0.12, OUT[0] + p.lag + 0.22) * (1 - sm(t, BACK[1] - 0.3, BACK[1] + 0.08));   // cross-fades with the plane's glass (glassA)
  const out = t > OUT[0] - 0.15 && t < BACK[1] + 0.1;
  const paneA = (k, p) => PA(p);
  const glow = (name) => {
    if (name === "middle") return Math.max(win(t, EV.middle1 - 0.1, EV.middle1 + 0.9, 0.15, 0.4), win(t, EV.middle2 - 0.1, EV.backup + 0.6, 0.2, 0.4));
    if (name === "outer") return win(t, EV.outer - 0.1, EV.middle2 - 0.1, 0.15, 0.3);
    return 0;
  };
  const Pm = Pj.middle, airLevel = sm(t, ...AIR.fill) * (1 - sm(t, ...AIR.gone));
  const fogFill = sm(t, ...FOGT.fill), fogDrain = sm(t, ...FOGT.drain), fogOn = t > FOGT.fill[0] && t < FOGT.drain[1] + 0.1;

  drawCard(c, sm(Math.min(E.outer, E.middle, E.inner), 0.05, 0.85));
  // air particles in the cabin (behind the inner pane)
  const G = guidePts(Pm, O), gA = win(t, AIR.flow[0] - 0.1, AIR.flow[1] + 0.5, 0.3, 0.45);
  const dots = [];
  if (t > AIR.flow[0] && t < AIR.gone[1]) for (let i = 0; i < NAIR; i++) { const p = airPos(i, t, G); if (p) dots.push(p); }
  const dotA = (t) => 1 - sm(t, AIR.flow[1] + 0.2, AIR.flow[1] + 0.9);
  const drawDots = (zlo, zhi) => { const a = dotA(t); if (a <= 0) return; for (const d of dots) if (d.p3 && d.p3[2] >= zlo && d.p3[2] < zhi) { const [x, y] = Pm(...d.p3); airDot(c, R(x), R(y), a); } };
  const drawCabinDots = () => { const a = dotA(t); if (a <= 0) return; for (const d of dots) if (d.scr) airDot(c, R(d.scr[0]), R(d.scr[1]), a); };
  // fog particles venting: gap → hole → cabin side
  const fogDots = [];
  if (fogOn && fogDrain > 0) for (let i = 0; i < 26; i++) {
    const t0 = FOGT.drain[0] + (i / 26) * (FOGT.drain[1] - FOGT.drain[0] - 0.5), s = (t - t0) / 0.75; if (s <= 0 || s >= 1) continue;
    const u0 = (rnd(i * 5 + 11) - 0.5) * 80, v0 = -50 + rnd(i * 5 + 12) * 100, z0 = 8 + rnd(i * 5 + 13) * (EX.D - 22);
    let p; if (s < 0.6) { const k = ease(s / 0.6); p = [lerp(u0, HOLE.u, k), lerp(v0, HOLE.v, k * k), lerp(z0, 2, k)]; } else { const k = (s - 0.6) / 0.4; p = [HOLE.u + (rnd(i) - 0.5) * 20 * k, HOLE.v - 14 * k, lerp(-PANES.middle.th - 1, -26, k)]; }
    fogDots.push([...p, Math.sin(Math.PI * Math.min(1, s * 1.4))]);
  }
  const drawFogDots = (zlo, zhi) => { for (const [u, v, z, a] of fogDots) if (z >= zlo && z < zhi) { const [x, y] = Pm(u, v, z); airDot(c, R(x), R(y), a, COL.FOG, COL.FOGD); } };

  drawDots(-1e9, PANES.inner.z * E.inner - PANES.inner.th);
  drawFogDots(-1e9, PANES.inner.z - PANES.inner.th);
  // INNER
  if (out) drawPane(c, Pj.inner, PANES.inner, LOOK.inner, paneA(E.inner, PANES.inner), glow("inner"));
  drawDots(PANES.inner.z * E.inner - PANES.inner.th, -PANES.middle.th);
  drawFogDots(PANES.inner.z - PANES.inner.th, -PANES.middle.th);
  // MIDDLE + its hole
  let mid = null; if (out) mid = drawPane(c, Pm, PANES.middle, LOOK.middle, paneA(E.middle, PANES.middle), glow("middle"));
  // the gap between MIDDLE and OUTER: cabin air (cyan tint), fog
  if (out && E.outer > 0.9 && (airLevel > 0 || (fogOn && fogFill > 0))) {
    const F = OUTL.map(([u, v]) => Pm(u, v, 0)), Bk = OUTL.map(([u, v]) => Pj.outer(u, v, PANES.outer.z * E.outer - PANES.outer.th));
    const bb = gapMask(F, Bk), [hx, hy] = Pm(HOLE.u, HOLE.v, 0), dmax = 190;
    for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x <= bb.x1; x++) {
      if (!MASK[y * GW + x]) continue;
      if (airLevel > 0) blend(c, x, y, COL.CY, 0.22 * airLevel, 1, 3);
      if (fogOn && fogFill > 0) {
        const d = Math.hypot(x - hx, (y - hy) * 0.8) / dmax, clear = sm(fogDrain * 1.25, 1 - d - 0.12, 1 - d + 0.12);
        const f = fogFill * (1 - clear); if (f <= 0) continue;
        const n = 0.72 + 0.16 * Math.sin(x * 0.09 + y * 0.05 + t * 1.1) + 0.12 * Math.sin(y * 0.11 - x * 0.04 - t * 0.8);
        blend(c, x, y, COL.FOG, 0.8 * f * n, 1, 5);
        if ((((x * 7 + y * 13) % 29) === 0) && f > 0.5) put(c, x, y, COL.W, f);       // droplets
      }
    }
  }
  if (gA > 0) { const L = dashes(c, G.seg2, t, gA * 0.9, 1e3); const [xe, ye] = G.seg2[G.seg2.length - 1], [xp, yp] = G.seg2[G.seg2.length - 5]; arrow(c, xp, yp, xe, ye, COL.CY, gA); }
  drawHole(c, Pm, 0, holeA, t);                                       // the hole stays readable above the fog
  if (gA > 0) dashes(c, G.seg1, t, gA);
  drawCabinDots();
  drawDots(-PANES.middle.th, 1e9);
  drawFogDots(-PANES.middle.th, 1e9);
  // OUTER
  let outer = null; if (out) outer = drawPane(c, Pj.outer, PANES.outer, LOOK.outer, paneA(E.outer, PANES.outer), glow("outer"));
  const zo = PANES.outer.z * E.outer;
  // the pane clears on "doesn't fog up": a bright shine sweeps across the OUTER face (MASK still holds its face)
  if (outer && t > FOGT.tag[0] && t < FOGT.tag[0] + 0.7) {
    const u = (t - FOGT.tag[0]) / 0.7, bb = bbox([outer.F], 1), pos = bb.x0 - 10 + (bb.x1 - bb.x0 + 90) * u;
    for (let y = bb.y0; y <= bb.y1; y++) for (let x = bb.x0; x <= bb.x1; x++) { const d = Math.abs(x + (y - bb.y0) * 0.35 - pos); if (d < 7 && MASK[y * GW + x] & 1) blend(c, x, y, COL.W, (1 - d / 7) * 0.75 * Math.sin(Math.PI * u), 1, 4); }
  }
  // the what-if crack on the OUTER pane
  drawCrack(c, Pj.outer, zo, sm(t, ...CRACK.grow), 1 - sm(t, ...CRACK.gone));
  // pressure arrows: on the OUTER pane (LOAD), shifting to the MIDDLE pane (BACKUP_TEST)
  const arrA = sm(t, ...ARROWS.in) * (1 - sm(t, ...ARROWS.out)), shift = sm(t, ...ARROWS.shift);
  if (arrA > 0 && out) {
    const push = 1.5 * Math.sin(t * 7), grow = ease(sm(t, ARROWS.in[0], ARROWS.in[1] + 0.2));
    for (const [u, v] of [[-14, -44], [-14, 0], [-14, 44]]) {
      for (const [tgt, aa] of [["outer", arrA * (1 - shift)], ["middle", arrA * shift]]) {
        if (aa <= 0.02) continue;
        const zt = tgt === "outer" ? zo - PANES.outer.th : -PANES.middle.th, L = tgt === "outer" ? 30 : 24, slide = tgt === "outer" ? -10 * shift : -10 * (1 - shift);
        const z1 = zt - 2 + push * 0.6 + slide, z0 = z1 - L * grow;
        const A = Pm(u, v, z0), B = Pm(u, v, z1);
        arrow(c, A[0], A[1], B[0], B[1], tgt === "outer" ? COL.CY : COL.GR, aa);
      }
    }
  }
  return { E, Pj, O };
}

// ---------------------------------------------------------------- labels and callouts (drawn after everything, still screen space)
export function drawLabels(c, V, t) {
  if (t < LABELS[0] - 0.1 || t > Math.max(LABELS[1], ...CALLOUTS.map((co) => co.t[1])) + 0.1) return;
  const O = anchor(V), Pm = projector(explodeK(t, PANES.middle), O);
  const rows = { inner: CARD.y + 16, middle: CARD.y + 42, outer: CARD.y + 16 };
  const xs = {};
  ["inner", "middle", "outer"].forEach((name, i) => {
    const p = PANES[name], e = explodeK(t, p), P = projector(e, O), z = p.z * e;
    const a = sm(t, LABELS[0] + i * 0.12, LABELS[0] + i * 0.12 + 0.3) * (1 - sm(t, LABELS[1] - 0.35, LABELS[1]));
    const top = P(0, -WIN.h / 2, z), s = 2, tw = c.measure(MAIN, p.text, { scale: s }), w = tw + 12, h = 22, x = R(Math.max(CARD.x + 4, Math.min(CARD.x + CARD.w - 4 - w, top[0] - w / 2))), y = rows[name];
    xs[name] = { x, w, top };
    if (a <= 0) return;
    const hi = name === "outer" ? win(t, EV.outer - 0.1, EV.middle2 - 0.1, 0.15, 0.3) : name === "middle" ? Math.max(win(t, EV.middle1 - 0.1, EV.middle1 + 0.9, 0.15, 0.4), win(t, EV.middle2 - 0.1, EV.backup + 0.6, 0.2, 0.4)) : 0;
    const edge = mix(name === "outer" ? "#7FE3F0" : name === "middle" ? "#A6D2F2" : "#E0CDF8", "#F4CA50", hi);
    // leader line: tag bottom → the pane's top edge (dashed while it draws itself)
    const lx = R(top[0]), y0 = y + h + 1, y1 = R(top[1]) - 2, grow = sm(t, LABELS[0] + i * 0.12 + 0.1, LABELS[0] + i * 0.12 + 0.45);
    if (y1 > y0) { const ye = R(y0 + (y1 - y0) * grow); line(c, lx + 1, y0, lx + 1, ye, COL.O, a); line(c, lx, y0, lx, ye, rgb(edge), a); put(c, lx - 1, ye, rgb(edge), a * grow); put(c, lx + 1, ye, rgb(edge), a * grow); }
    tagBox(c, x, y, w, h, edge, a);
    text(c, p.text, x + 6, y + 5, edge, a, s);
  });
  // callouts in one slot above the labels
  for (const co of CALLOUTS) {
    const a = win(t, co.t[0], co.t[1], 0.25, 0.3); if (a <= 0) continue;
    const s = 2, tw = c.measure(MAIN, co.text, { scale: s }), icon = co.icon ? 16 : 0, w = tw + 20 + icon, h = 26;
    const ax = co.at === "gap" ? (Pm(0, -WIN.h / 2, EX.D * 0.5)[0]) : xs[co.at]?.top[0] ?? 350;
    const x = R(Math.max(14, Math.min(470 - w, ax - w / 2))), rise = (1 - ease(clamp01((t - co.t[0]) / 0.35))) * 8, y = R(CARD.y - 16 + rise);
    tagBox(c, x, y, w, h, co.col, a);
    if (co.icon === "shield") shield(c, x + 8, y + 7 - 1, "#3CB85A", a);
    if (co.icon === "check") text(c, "✓", x + 7, y + 6, "#65DA41", a, 2);
    text(c, co.text, x + 10 + icon, y + 7, co.col, a, s);
  }
}
