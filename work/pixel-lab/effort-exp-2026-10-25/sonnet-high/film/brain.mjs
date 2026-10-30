// «Pumpkin face» — everything the idea needs besides the pumpkin itself: the dotted «perception» guides and the face-detect box,
// the sixth-of-a-second clock (0 → 165 ms), the illustrated brain (side view, NOT a scan) with its face area, the signal beams
// from the pumpkin's eyes, the light that comes back. All pure functions of t and the pumpkin state P.
import { MAIN, TINY, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, sm, lerp, win, ease } from "./layout.mjs";
import { B, EV } from "./timeline.mjs";
import { COL } from "./scene.mjs";

export const BRAIN = { cx: 238, cy: 274 };
const PATCH = { u: 42, v: 28, rx: 21, ry: 10 };            // the face area, on the underside toward the back
const PINK = ["#3F1E46", "#63306A", "#8C4A8A", "#B466A6", "#D68CBE", "#EDB4D4"];
const BORDER = "#1E0C28";
const GLOWC = ["#8C4A8A", "#C25A5A", "#F08A3C", "#F4B04A", "#F4CA50", "#FFF1B8"];
const bandQ = (v, X, Y) => { const fl = Math.floor(v), f = v - fl; return f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(X, Y) ? fl + 1 : fl; };

// ---------------------------------------------------------------- the brain
import { vnoise } from "./scene.mjs";
const fold = (u, v) => { const n = vnoise(u * 0.055 + 3, v * 0.065 + 1.3, 7) * 0.7 + vnoise(u * 0.12, v * 0.13, 8) * 0.3, ph = n * 8; return Math.abs(ph - Math.round(ph)) < 0.1 ? 1 : 0; };
function brainClass(u, v) { // 0 outside · 1 cerebrum/temporal · 2 cerebellum · 3 stem
  const a = Math.atan2(v + 8, u), f = 1 + 0.035 * Math.sin(7 * a + 0.5) + 0.02 * Math.sin(13 * a + 1.3) + 0.012 * Math.sin(23 * a);
  if ((u / 94) ** 2 + ((v + 8) / 60) ** 2 < f * f) return 1;
  if (((u + 18) / 58) ** 2 + ((v - 34) / 24) ** 2 < 1) return 1;
  if (((u - 60) / 34) ** 2 + ((v - 48) / 20) ** 2 < 1) return 2;
  if (v > 38 && v < 84 && u > 6 + (v - 38) * 0.3 && u < 28 + (v - 38) * 0.3) return 3;
  return 0;
}
function drawBrain(c, S) { // S: { cx, cy, s, glow, t }
  const { cx, cy, s } = S, x0 = Math.floor(cx - 112 * s), x1 = Math.ceil(cx + 112 * s), y0 = Math.floor(cy - 70 * s), y1 = Math.ceil(cy + 88 * s), W = x1 - x0 + 1, H = y1 - y0 + 1;
  const m = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) m[j * W + i] = brainClass((x0 + i + 0.5 - cx) / s, (y0 + j + 0.5 - cy) / s);
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H ? 0 : m[j * W + i]);
  const g = S.glow, fl = 0.92 + 0.08 * Math.sin(S.t * 11) * Math.sin(S.t * 7.3);
  // halo around the face area (outside and inside the outline, dithered)
  const px = cx + PATCH.u * s, py = cy + PATCH.v * s;
  if (g > 0.01) c.tint(Math.floor(px - 70 * s), Math.floor(py - 55 * s), Math.ceil(140 * s), Math.ceil(110 * s), (X, Y) => g * 0.55 * fl * Math.max(0, 1 - (((X - px) / (46 * s)) ** 2 + ((Y - py) / (34 * s)) ** 2)) ** 1.3, COL.orange, 5);
  const pc = (k) => k; void pc;
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const k = m[j * W + i]; if (!k) continue; const X = x0 + i, Y = y0 + j, u = (X + 0.5 - cx) / s, v = (Y + 0.5 - cy) / s;
    let col;
    if (!at(i - 1, j) || !at(i + 1, j) || !at(i, j - 1) || !at(i, j + 1) || (k !== 3 && [at(i - 1, j), at(i + 1, j), at(i, j - 1), at(i, j + 1)].some((q) => q && q !== k && (q === 2 || k === 2)))) col = BORDER;
    else if (k === 3) col = PINK[1 + (bandQ(1.2 + 0.8 * Math.sin(v * 0.4), X, Y) > 1 ? 1 : 0)];
    else if (k === 2) { const stripe = Math.sin(v * 1.35 + u * 0.12) > 0.35; col = PINK[stripe ? 1 : 2 + ((u + 20) / 60 > bayer(X, Y) ? 1 : 0)]; }
    else {
      const lam = 0.5 + 0.42 * (-(v + 6) / 58) + 0.12 * (-u / 100) + 0.06 * Math.sin(u * 0.1);
      col = PINK[Math.max(1, Math.min(5, bandQ(lam * 4.6 + 0.6, X, Y)))];
      if (fold(u, v) && v < 40) col = PINK[Math.max(0, bandQ(lam * 4.6 + 0.6, X, Y) - 2)];
      { const q = clamp01((u + 64) / 96), lf = 24 - 26 * Math.sqrt(q); if (u > -64 && u < 32 && Math.abs(v - lf) < 0.55 / s + 0.35) col = PINK[0]; }                 // lateral fissure
    }
    // the face area: a bluer patch with a dotted edge when quiet, orange light when it lights up
    const pd = ((u - PATCH.u) / PATCH.rx) ** 2 + ((v - PATCH.v) / PATCH.ry) ** 2;
    if (k === 1 && pd < 1.32) {
      const inside = pd < 1;
      if (inside) { const lit = clamp01(g * fl * (1.05 - 0.55 * pd)), idx = bandQ(lit * 5.6, X, Y);
        col = lit > 0.08 ? GLOWC[Math.max(0, Math.min(5, idx))] : mix(col, "#6C74C8", 0.45); }
      else if (((X + Y) & 3) < 2) col = mix(col, lit0(g, "#B9C8F0", "#FFF1B8"), 0.7);
    }
    c.px(X, Y, col);
  }
}
const lit0 = (g, a, b) => mix(a, b, clamp01(g));

// ---------------------------------------------------------------- small drawing helpers
function dotted(c, x0, y0, x1, y1, phase, col, a = 1, gap = 5) {
  const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(L / gap)), cc = fade(c, a);
  for (let i = 0; i <= n; i++) { const u = (i + (phase % 1)) / n; if (u > 1) continue; cc.px(Math.round(lerp(x0, x1, u)), Math.round(lerp(y0, y1, u)), col); }
}
function ringDither(c, cx, cy, r, th, col, a) { // expanding dithered ring
  if (a <= 0) return; const R = Math.ceil(r + th);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y), k = 1 - Math.abs(d - r) / th; if (k > 0 && k * a > bayer(cx + x, cy + y)) c.px(cx + x, cy + y, col); }
}
const bez = (p0, p1, p2, p3, u) => { const v = 1 - u; return [v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0], v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1]]; };

// ---------------------------------------------------------------- the beams (final layout only: the pumpkin is at scale 0.7 by then)
const PS = 0.7, PCX = 238, PCY = 560 - 91 * PS;
const eyeTop = (sg) => [PCX + sg * 49 * 1.0 * PS * 0.97 + 0, PCY + (-22 - 17 * 1.2) * PS + 6];
const MERGE = [262, 386], PATCHSCR = [BRAIN.cx + PATCH.u, BRAIN.cy + PATCH.v + 2];
function pathPts(sg) { // eye → merge → face area, as a polyline sampled by arc length
  const e = eyeTop(sg), pts = []; for (let i = 0; i <= 24; i++) pts.push(bez(e, [e[0] + sg * 4, e[1] - 34], [MERGE[0] - sg * 12, MERGE[1] + 26], MERGE, i / 24));
  for (let i = 1; i <= 30; i++) pts.push(bez(MERGE, [MERGE[0] - 4, MERGE[1] - 34], [PATCHSCR[0] + 10, PATCHSCR[1] + 44], PATCHSCR, i / 30));
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, len: cum[cum.length - 1] };
}
const PATHS = { "-1": pathPts(-1), "1": pathPts(1) };
const along = (P, u) => { const d = clamp01(u) * P.len; let i = 1; while (i < P.cum.length - 1 && P.cum[i] < d) i++; const k = (d - P.cum[i - 1]) / Math.max(1e-6, P.cum[i] - P.cum[i - 1]); return [lerp(P.pts[i - 1][0], P.pts[i][0], k), lerp(P.pts[i - 1][1], P.pts[i][1], k)]; };
const PK = { start: B.beam[0] + 0.12, gap: 0.09, travel: 0.6, n: 5 };           // packets leave the eyes on «reads», arrive as «lights» begins
export const ARRIVE = Array.from({ length: PK.n }, (_, k) => PK.start + k * PK.gap + PK.travel);

// ---------------------------------------------------------------- the whole stage
export function drawBrainStage(c0, t, P) {
  const outK = ease(clamp01((t - B.back[0]) / 0.7)), c = outK > 0 ? fade(c0, 1 - outK) : c0;
  const camK = ease(clamp01((t - B.cam[0]) / (B.cam[1] - B.cam[0])));
  const F = faceBox(P);
  // 1) perception guides + the face-detect box
  guides(c0, t, P, F);
  // 2) clock
  clock(c, t, camK);
  // 3) the brain (dithers in while the pumpkin settles smaller)
  const brA = ease(clamp01((t - (B.cam[0] + 0.3)) / (B.cam[1] - B.cam[0] - 0.1)));
  const glowMain = sm(t, B.glow[0], B.glow[1]), answer = win(t, B.answer[0], B.answer[1] + 0.9, 0.4, 0.7);
  const pulse = 0.08 * Math.sin(t * 5.2) * glowMain, glow = (glowMain * 0.92 + 0.35 * answer + pulse) * (t > EV.pumpkinEnd ? 1 : 1);
  if (brA > 0) drawBrain(fade(c, brA), { cx: BRAIN.cx, cy: BRAIN.cy, s: lerp(0.9, 1, brA), glow: glow * brA, t });
  // 4) beams + packets
  if (t > B.cam[1] - 0.3) beams(c, t, answer);
  // 5) rings from the face area, label card
  for (let i = 0; i < 3; i++) { const u = (t - (B.glow[0] + 0.02 + i * 0.3)) / 0.85; if (u > 0 && u < 1) ringDither(c, PATCHSCR[0], PATCHSCR[1] - 4, lerp(6, 56, ease(u)), 3, COL.orange, (1 - u) * 0.85); }
  { const u = (t - (B.wink[0] + 0.2)) / 0.9; if (u > 0 && u < 1) ringDither(c, PATCHSCR[0], PATCHSCR[1] - 4, lerp(6, 40, ease(u)), 3, COL.gold, (1 - u) * 0.6); }
  for (const a of ARRIVE) { const u = (t - a) / 0.22; if (u > 0 && u < 1) ringDither(c, PATCHSCR[0], PATCHSCR[1], lerp(3, 13, u), 1.6, COL.gold, 1 - u); }
  label(c, t);
  // 6) the pumpkin answers: a ring from its face when the light comes back
  { const u = (t - (B.answer[0] + 0.36)) / 0.7; if (u > 0 && u < 1) ringDither(c0, Math.round(P.cx), Math.round(P.cy - 4), lerp(30, 120, ease(u)), 3.2, COL.gold, (1 - u) * 0.8); }
}

function faceBox(P) { return { cx: P.cx, cy: P.cy, s: P.s }; }
function guides(c, t, P, F) {
  const X = (u) => P.cx + u * P.s, Y = (v) => P.cy + v * P.s;
  const gIn = sm(t, B.guide[0], B.guide[0] + 0.4), gOut = 1 - sm(t, EV.faceEnd + 0.35, EV.faceEnd + 0.8), a = Math.min(gIn, gOut);
  if (a > 0) {
    const sag = 15 * P.decide, M = [0, 34 + sag * 0.5];
    const E = [[-48, -22], [48, -22], M];
    const conn = ease(clamp01((t - B.guide[0]) / (B.guide[1] - B.guide[0])));            // dotted lines grow between the three marks
    const edges = [[E[0], E[1]], [E[1], E[2]], [E[2], E[0]]];
    edges.forEach(([p, q], i) => { const k = clamp01(conn * 3 - i); if (k > 0) dotted(c, X(p[0]), Y(p[1]), lerp(X(p[0]), X(q[0]), k), lerp(Y(p[1]), Y(q[1]), k), -t * 1.6, "#B9C8F0", a * 0.9, 5); });
    for (const p of E) { const r = 3 + 2 * Math.sin(t * 6 + p[0]); c.ering(Math.round(X(p[0])), Math.round(Y(p[1])), Math.round(r + 4), Math.round(r + 4), "#B9C8F0"); }
  }
  // face-detect box: snaps from large to the face on the decision
  const dk = ease(clamp01((t - B.decide[0]) / 0.32)), boxA = Math.min(dk, 1 - sm(t, EV.faceEnd + 0.3, EV.faceEnd + 0.75));
  if (boxA > 0) {
    const grow = lerp(1.35, 1, dk), hw = 90 * grow * P.s, top = -58 * grow, bot = 62 * grow, cx = P.cx, x0 = Math.round(cx - hw), x1 = Math.round(cx + hw), y0 = Math.round(Y(top)), y1 = Math.round(Y(bot)), L = 14, cc = fade(c, boxA);
    for (const col of ["#1A0816", COL.gold]) for (const [bx, by, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) for (let k = col === COL.gold ? 0 : -1; k < (col === COL.gold ? L : L + 1); k++) for (let w = col === COL.gold ? 0 : -1; w < (col === COL.gold ? 2 : 3); w++) { cc.px(bx + dx * k, by + dy * w, col); cc.px(bx + dx * w, by + dy * k, col); }
    const lw = c.measure(TINY, "FACE", { scale: 2 }) + 8;
    cc.rect(x0, y0 - 18, lw, 15, COL.gold); c.text(TINY, "FACE", x0 + 4, y0 - 15, "#1D1430", { scale: 2, colorAt: (X2, Y2) => (boxA > bayer(X2, Y2) ? "#1D1430" : null) });
    ringDither(c, Math.round(cx), Math.round(P.cy), lerp(20, 110, dk), 3, COL.gold, (1 - dk) * 0.8);
  }
}
function clock(c, t, camK) {
  const inA = ease(clamp01((t - B.clock[0]) / 0.3)); if (inA <= 0) return;
  const p0 = clamp01((t - B.clock[0] - 0.1) / (B.clock[1] - B.clock[0] - 0.1)), p = p0 * p0 * (3 - 2 * p0) * 0.35 + p0 * 0.65;     // mostly linear, soft ends
  const cx = lerp(238, 92, camK), cy = lerp(228, 222, camK), r = Math.round(lerp(34, 22, camK)), cc = fade(c, inA);
  const sector = p * (Math.PI / 3), pop = 1 + 0.06 * Math.sin(Math.PI * clamp01((t - B.clock[1]) / 0.35));
  const R = Math.round(r * pop);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) { const d = Math.hypot(x, y); if (d > R + 0.3) continue; const X = Math.round(cx) + x, Y = Math.round(cy) + y;
    let col = d > R - 1.2 ? "#B9C8F0" : "#1D1430";
    if (d <= R - 1.2) { const ang = (Math.atan2(x, -y) + 2 * Math.PI) % (2 * Math.PI); if (ang < sector) col = d > R - 4 ? COL.gold : COL.orange;
      else if (d > R - 3.2 && Math.abs(((ang / (Math.PI / 3)) % 1) - 0) < 0.03) col = "#B9C8F0"; }
    cc.px(X, Y, col); }
  for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; cc.line(Math.round(cx + Math.sin(a) * (R - 5)), Math.round(cy - Math.cos(a) * (R - 5)), Math.round(cx + Math.sin(a) * (R - 1)), Math.round(cy - Math.cos(a) * (R - 1)), "#B9C8F0"); }
  { const a = sector; cc.line(Math.round(cx), Math.round(cy), Math.round(cx + Math.sin(a) * (R - 3)), Math.round(cy - Math.cos(a) * (R - 3)), "#FFF1B8"); cc.disc(Math.round(cx), Math.round(cy), 1, "#FFF1B8"); }
  // readout: 0 → 165 ms (big while centred, small badge after the move; the two dissolve into each other)
  const val = Math.round(165 * p), txt = `${val} MS`, hot = sm(t, B.clock[1] - 0.05, B.clock[1] + 0.15) * (1 - sm(t, B.clock[1] + 0.4, B.clock[1] + 0.9));
  const colr = mix(COL.gold, "#FFFFFF", hot * 0.6);
  const big = (1 - sm(camK, 0.05, 0.5)) * inA, small = sm(camK, 0.5, 0.95) * inA;
  const dr = (sc, a, y) => { if (a <= 0) return; const w = c.measure(MAIN, txt, { scale: sc }), x = Math.round(cx - w / 2);
    c.text(MAIN, txt, x + sc, y + sc, "#0B0812", { scale: sc, colorAt: (X, Y) => (a > bayer(X, Y) ? "#0B0812" : null) });
    c.text(MAIN, txt, x, y, colr, { scale: sc, colorAt: (X, Y) => (a > bayer(X, Y) ? colr : null) }); };
  dr(3, big, Math.round(cy + R + 10)); dr(2, small, Math.round(cy + R + 9));
}
function beams(c, t, answer) {
  const show = sm(t, B.cam[1] - 0.3, B.beam[0] + 0.4), conn = answer;
  for (const sg of [-1, 1]) { const P = PATHS[sg]; const n = Math.floor(P.len / 6);
    for (let i = 0; i <= n; i++) { const [x, y] = along(P, i / n), a = show * (0.55 + 0.45 * Math.sin(i * 0.5 - t * 7)) * (1 - 0.5 * conn); if (a > bayer(Math.round(x), Math.round(y))) { const cc2 = conn > 0.3 ? COL.gold : "#D8E0FF"; c.px(Math.round(x), Math.round(y), cc2); c.px(Math.round(x) + 1, Math.round(y), cc2); } }
    if (conn > 0.05) for (let i = 0; i < P.len; i++) { const [x, y] = along(P, i / P.len); if (conn * 0.9 > bayer(Math.round(x), Math.round(y)) && i % 2 === 0) c.px(Math.round(x), Math.round(y), COL.gold); }
    // outgoing packets: eyes → face area
    for (let k = 0; k < PK.n; k++) { const u = (t - (PK.start + k * PK.gap)) / PK.travel; if (u < 0 || u > 1) continue; const e = ease(u) * 0.6 + u * 0.4, fa = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
      for (let tr = 0; tr < 5; tr++) { const [x, y] = along(P, Math.max(0, e - tr * 0.022)); const q = fade(c, fa * (1 - tr / 5)); q.px(Math.round(x), Math.round(y), tr < 2 ? "#FFF1B8" : COL.orange); q.px(Math.round(x) + 1, Math.round(y), tr < 2 ? COL.gold : COL.orange); if (tr < 2) { q.px(Math.round(x), Math.round(y) + 1, COL.gold); q.px(Math.round(x) + 1, Math.round(y) + 1, COL.gold); } } }
    // returning packets: face area → eyes (the light answers)
    for (let k = 0; k < 3; k++) { const u = (t - (B.answer[0] + k * 0.1)) / 0.42; if (u < 0 || u > 1) continue; const e = 1 - (ease(u) * 0.7 + u * 0.3), fa = Math.min(1, u * 8) * Math.min(1, (1 - u) * 6);
      for (let tr = 0; tr < 5; tr++) { const [x, y] = along(P, Math.min(1, e + tr * 0.022)); const q = fade(c, fa * (1 - tr / 5)); q.px(Math.round(x), Math.round(y), tr < 2 ? "#FFF1B8" : COL.orange); q.px(Math.round(x) + 1, Math.round(y), COL.gold); q.px(Math.round(x), Math.round(y) + 1, COL.gold); } }
  }
}
function label(c, t) {
  const a = ease(clamp01((t - B.label[0]) / (B.label[1] - B.label[0]))); if (a <= 0) return;
  const x = 348, y = 306, w = 80, h = 20, q = fade(c, a), glow = sm(t, B.glow[0], B.glow[1]);
  q.rect(x, y, w, h, "#1D1430"); q.frame(x, y, w, h, mix("#7A5AA8", COL.orange, glow)); q.rect(x + 1, y + 1, w - 2, 1, "#2B2048");
  c.text(TINY, "FACE AREA", x + 6, y + 6, COL.orange, { scale: 2, colorAt: (X, Y) => (a > bayer(X, Y) ? mix("#C8B8F0", COL.orange, glow) : null) });
  // leader line to the patch
  const px = BRAIN.cx + PATCH.u + 20, py = BRAIN.cy + PATCH.v; dotted(c, x - 1, y + 10, px + 6, py + 2, 0, mix("#C8B8F0", COL.orange, glow), a, 3);
}
