// «Your cat knows its name» — the film's own screen pieces: speech bubbles, the little speaker on the floor that plays the
// study's recorded words, the response chart and the ✓ / ✗ checklist. Same palette and panel look as hud.mjs (C from
// cute.mjs). Every piece takes `a` (0..1, dithered dissolve) and continuous k values: nothing pops in one frame.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { C, panel } from "./cute.mjs";
import { gate } from "./layout.mjs";

const R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const popEase = (x) => { x = clamp01(x); const c1 = 1.7, y = x - 1; return 1 + (c1 + 1) * y * y * y + c1 * y * y; };
const tw = (c, s, scale) => c.measure(MAIN, s, { scale });
const RED = "#FF4D5E";

function brush(g, x, y, r, col) { const s = Math.max(1, R(2 * r)); g.rect(Math.floor(x - s / 2 + 0.5), Math.floor(y - s / 2 + 0.5), s, s, col); }
function stroke(g, pts, w, col) { for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 1.5)); for (let k = 0; k <= n; k++) brush(g, ax + ((bx - ax) * k) / n, ay + ((by - ay) * k) / n, w / 2, col); } }

/**
 * Speech bubble with a pointed tail. (cx, cy) = bubble centre, tail tip at (tx, ty). k 0..1 pops it in (grows from 55 %
 * with a small overshoot, dissolving over the first 40 %); a = overall alpha. o = { col (text), edge, fill, scale = 3,
 * icon: (g, x, y) => void drawn left of the text (16 px wide) }. Returns the bubble box.
 */
export function speech(c, text, cx, cy, tx, ty, k, a = 1, o = {}) {
  if (k <= 0 || a <= 0) return null;
  const s = o.scale ?? 3, ic = o.icon ? (o.iconW ?? 22) : 0, w0 = tw(c, text, s) + 26 + ic, h0 = 7 * s + 18, z = 0.55 + 0.45 * popEase(k);
  const g = fade(c, a * clamp01(k / 0.4)), w = Math.max(12, R(w0 * z)), h = Math.max(8, R(h0 * z));
  const x = R(Math.max(6, Math.min(540 - 6 - w, cx - w / 2))), y = R(cy - h / 2), edge = o.edge ?? C.p7, fill = o.fill ?? C.CARD;
  // tail: a triangle from the bubble's edge toward (tx, ty)
  const bx = Math.max(x + 14, Math.min(x + w - 14, tx)), by = ty > y + h ? y + h - 3 : y + 3, tip = [tx, ty];
  const tri = (grow) => [[bx - 9 - grow, by], [bx + 9 + grow, by], [tip[0] + (tip[0] > bx ? grow : -grow) * 0.3, tip[1] + (ty > by ? grow : -grow)]];
  g.poly(tri(2), C.O); g.poly(tri(1), edge);
  g.rrect(x - 1, y - 1, w + 2, h + 2, C.O, 4); g.rrect(x, y, w, h, edge, 4); g.rrect(x + 2, y + 2, w - 4, h - 4, fill, 3);
  g.poly(tri(-1), fill);
  if (z > 0.9) { const tx0 = x + R((w - tw(c, text, s) - ic) / 2) + ic; g.text(MAIN, text, tx0 + 1, y + R((h - 7 * s) / 2) + 1, C.O, { scale: s }); g.text(MAIN, text, tx0, y + R((h - 7 * s) / 2), o.col ?? C.IV, { scale: s }); if (o.icon) o.icon(g, tx0 - ic, y + R(h / 2)); }
  return { x, y, w, h };
}

/** A small round speaker on the floor (world units through G): wood-grey body, a fabric front, a cone that thumps with
 *  `beat` (0..1), and a green "on" dot. (wx, wy) = floor point under its centre; size ≈ 26 units wide. */
export function speaker(c, G, wx, wy, beat = 0, a = 1) {
  if (a <= 0) return null;
  const g = fade(c, a), z = G.z, X = (u) => G.X(wx + u), Y = (v) => G.Y(wy + v);
  const body = [[-13, 0], [13, 0], [13, -30], [-13, -30]];
  const rr = (x0, y0, x1, y1, col) => g.rect(R(X(x0)), R(Y(y1)), Math.max(1, R((x1 - x0) * z)), Math.max(1, R((y0 - y1) * z)), col);
  rr(-15, 1.5, 15, -1, "#3A2A3E");                                    // contact shadow
  rr(-13.5, 0.5, 13.5, -30.5, "#1A1424"); rr(-13, 0, 13, -30, "#4A3E5C"); rr(-13, -2, 13, -30, "#5E5274"); rr(-12, -27, 12, -30, "#7A6E94");
  rr(-11, -3, 11, -25, "#2C2440");                                     // fabric
  for (let v = -24; v < -3; v += 2) for (let u = -10; u < 11; u += 2) if (((u + v) & 3) === 0) rr(u, v + 1, u + 1, v, "#3A3052");
  const cx = X(0), cy = Y(-14), r = (6.5 + 1.2 * beat) * z;
  g.disc(R(cx), R(cy), Math.max(2, R(r + z)), "#151020"); g.disc(R(cx), R(cy), Math.max(2, R(r)), mix("#6E6488", "#B8AEDA", beat * 0.6));
  g.disc(R(cx), R(cy), Math.max(1, R(r * 0.45)), "#2A2238"); g.px(R(cx - r * 0.4), R(cy - r * 0.4), "#D8D0F0");
  rr(8, -26, 10.5, -28, beat > 0.02 || a > 0 ? "#65DA41" : "#2A4A20");
  return { top: [X(0), Y(-30)], cone: [cx, cy] };
}

/**
 * Response chart: one bar per call, a title above. vals[i] (0..1) = bar height fraction, show[i] (0..1) = how far bar i
 * has grown in, labels under each bar (scale 1 TINY-like via MAIN scale 1). hi = index of a highlighted bar (yellow).
 * (x, y) = top-left; size w × h of the plot. Returns the bars' centre x.
 */
export function chart(c, x, y, w, h, vals, show, labels, a, o = {}) {
  if (a <= 0) return null;
  const n = vals.length, g = fade(c, a), title = o.title ?? "EAR + HEAD MOVES", pad = 10, bw = Math.floor((w - pad * 2) / n) - 8, top = y + 30;
  panel(c, x, y, w, h + 60, a, o.edge ?? C.p7);
  g.text(MAIN, title, x + R((w - tw(c, title, 2)) / 2), y + 9, o.titleCol ?? C.L, { scale: 2 });
  const base = top + h; g.rect(x + pad - 2, base + 1, w - 2 * pad + 4, 2, C.p5);
  const centers = [];
  for (let i = 0; i < n; i++) {
    const bx = x + pad + i * (bw + 8) + 4, k = ease(show[i] ?? 0), bh = R(vals[i] * h * k), col = i === o.hi ? C.Y : o.cols?.[i] ?? C.p7;
    centers.push(bx + bw / 2);
    if (bh > 0) { g.rect(bx - 1, base - bh - 1, bw + 2, bh + 2, C.O); g.rect(bx, base - bh, bw, bh, col); g.rect(bx, base - bh, bw, Math.min(bh, 2), mix(col, "#FFFFFF", 0.45)); g.rect(bx + bw - 2, base - bh + 2, 2, Math.max(0, bh - 2), mix(col, C.O, 0.3)); }
    const ls = o.labelScale ?? 2, lab = labels[i] ?? "", lw = tw(c, lab, ls), la = clamp01((show[i] ?? 0) * 3);
    if (la > 0) fade(c, a * la).text(MAIN, lab, R(bx + bw / 2 - lw / 2), base + 8, i === o.hi ? C.Y : C.IV, { scale: ls });
  }
  return centers;
}

/** ✓ or ✗ mark drawn stroke by stroke (k 0 → 1), centred at (x, y), size s px. */
export function mark(c, x, y, ok, k, s = 14, a = 1) {
  if (k <= 0 || a <= 0) return;
  const g = fade(c, a), col = ok ? C.GR : RED;
  const segs = ok ? [[[x - s * 0.45, y], [x - s * 0.12, y + s * 0.35]], [[x - s * 0.12, y + s * 0.35], [x + s * 0.5, y - s * 0.4]]] : [[[x - s * 0.4, y - s * 0.4], [x + s * 0.4, y + s * 0.4]], [[x + s * 0.4, y - s * 0.4], [x - s * 0.4, y + s * 0.4]]];
  const parts = segs.map(([p, q], i) => { const kk = clamp01(k * 2 - i); return kk > 0 ? [p, [p[0] + (q[0] - p[0]) * kk, p[1] + (q[1] - p[1]) * kk]] : null; }).filter(Boolean);
  for (const p of parts) stroke(g, p, 7, C.O); for (const p of parts) stroke(g, p, 4, col);
}

/**
 * A checklist row: items [{ label, ok, k }] side by side, centred at cx; each item = label + mark. k = item's mark
 * progress (0..1), the label dissolves in with the first part of k. Returns item centres.
 */
export function checkRow(c, cx, y, items, a, o = {}) {
  if (a <= 0) return null;
  const s = o.scale ?? 2, gap = o.gap ?? 22, ws = items.map((it) => tw(c, it.label, s) + 28), total = ws.reduce((p, q) => p + q, 0) + gap * (items.length - 1);
  let x = R(cx - total / 2); const out = [];
  items.forEach((it, i) => {
    const la = clamp01(it.k * 2.5); if (la > 0) { const g = fade(c, a * la); g.rrect(x - 6, y - 6, ws[i] + 10, 7 * s + 12, C.O, 3); g.rrect(x - 5, y - 5, ws[i] + 8, 7 * s + 10, it.ok ? "#1E3A1A" : "#3A1420", 3); g.text(MAIN, it.label, x, y, C.IV, { scale: s }); }
    mark(c, x + ws[i] - 12, y + 3.5 * s, it.ok, clamp01((it.k - 0.25) / 0.75), 7 * s, a);
    out.push(x + ws[i] / 2); x += ws[i] + gap;
  });
  return out;
}

/** A tiny face icon for bubbles: purple bobble hat (owner) or a grey head (stranger). (x, y) = left-middle. */
export function faceIcon(kind, s = 1) {
  return (g0, x0, y0) => { const g = scaled(g0, x0, y0 - (s - 1) * 4, s), x = 0, y = 0;
    if (kind === "owner") { g.disc(x + 8, y + 1, 6, C.O); g.disc(x + 8, y + 1, 5, "#E6AD8A"); g.rect(x + 2, y - 6, 13, 5, C.O); g.rect(x + 3, y - 6, 11, 4, "#8D59DA"); g.disc(x + 8, y - 8, 2, "#E0CDF8"); g.px(x + 6, y + 1, C.O); g.px(x + 10, y + 1, C.O); }
    else { g.disc(x + 8, y, 6, C.O); g.disc(x + 8, y, 5, "#9A94AC"); g.rect(x + 3, y - 5, 10, 3, "#6A6480"); g.px(x + 6, y, C.O); g.px(x + 10, y, C.O); }
  };
}
export { gate, bayer };

// ---------------------------------------------------------------- tiny cat heads (the 77 cats) and a dog head
const COATS = [["#D9873E", "#8A4418"], ["#F4F0E6", "#9A9488"], ["#3A3448", "#14111C"], ["#9A94AC", "#4A4458"], ["#EDA95A", "#B8642A"], ["#6A4A3A", "#2E1E16"]];
/** a 14 × 12 px cat head at (x, y) top-left, coat index ci */
export function miniCat(g, x, y, ci = 0) {
  const [fur, dk] = COATS[ci % COATS.length];
  g.poly([[x + 1, y + 5], [x + 2, y], [x + 6, y + 3], [x + 8, y + 3], [x + 12, y], [x + 13, y + 5]], C.O);
  g.ellipse(x + 7, y + 7, 7, 5, C.O); g.ellipse(x + 7, y + 7, 6, 4, fur); g.poly([[x + 2, y + 5], [x + 3, y + 1], [x + 6, y + 4]], fur); g.poly([[x + 12, y + 5], [x + 11, y + 1], [x + 8, y + 4]], fur);
  g.px(x + 3, y + 3, "#F29AA6"); g.px(x + 11, y + 3, "#F29AA6"); g.rect(x + 4, y + 6, 2, 2, ci === 2 ? "#F5AE2E" : C.O); g.rect(x + 9, y + 6, 2, 2, ci === 2 ? "#F5AE2E" : C.O); g.px(x + 7, y + 8, "#E26E80");
  if (ci % 2 === 0) { g.px(x + 6, y + 3, dk); g.px(x + 8, y + 3, dk); }
}
/** grid of n mini cats in rows of `cols`, the first `shown` (float) popped in with a hop; returns the grid box */
export function catGrid(c, x, y, n, cols, shown, a, s = 1) {
  if (a <= 0) return null; const g = fade(c, a);
  for (let i = 0; i < n; i++) { const k = clamp01(shown - i); if (k <= 0) break; const cx = x + (i % cols) * 18 * s, cy = y + Math.floor(i / cols) * 16 * s - R(3 * s * Math.sin(Math.PI * k));
    miniCat(scaled(k < 1 ? fade(g, k) : g, cx, cy, s), 0, 0, (i * 7 + Math.floor(i / cols)) % COATS.length); }
  return { x, y, w: cols * 18 * s, h: Math.ceil(n / cols) * 16 * s };
}
/** a view of g that draws icon-local pixels (u, v) as s × s blocks at (x + u·s, y + v·s): px, rect, poly, ellipse, disc */
function scaled(g, x, y, s) {
  if (s === 1) { const o = Object.create(g); o.px = (u, v, col) => g.px(x + u, y + v, col); o.rect = (u, v, w, h, col) => g.rect(x + u, y + v, w, h, col); o.poly = (pts, col) => g.poly(pts.map(([u, v]) => [x + u, y + v]), col); o.ellipse = (u, v, rx, ry, col) => g.ellipse(x + u, y + v, rx, ry, col); o.disc = (u, v, r, col) => g.disc(x + u, y + v, r, col); return o; }
  const o = Object.create(g);
  o.px = (u, v, col) => g.rect(R(x + u * s), R(y + v * s), s, s, col);
  o.rect = (u, v, w, h, col) => g.rect(R(x + u * s), R(y + v * s), R(w * s), R(h * s), col);
  o.poly = (pts, col) => g.poly(pts.map(([u, v]) => [x + u * s, y + v * s]), col);
  o.ellipse = (u, v, rx, ry, col) => g.ellipse(R(x + u * s), R(y + v * s), R(rx * s), R(ry * s), col);
  o.disc = (u, v, r, col) => g.disc(R(x + u * s), R(y + v * s), R(r * s), col);
  return o;
}
/** a 16 × 14 px dog head (floppy ears) */
export function miniDog(g, x, y) {
  g.ellipse(x + 8, y + 7, 7, 6, C.O); g.ellipse(x + 8, y + 7, 6, 5, "#C8925A"); g.ellipse(x + 2, y + 6, 2.5, 4.5, C.O); g.ellipse(x + 14, y + 6, 2.5, 4.5, C.O); g.ellipse(x + 2, y + 6, 1.5, 3.5, "#7A4A28"); g.ellipse(x + 14, y + 6, 1.5, 3.5, "#7A4A28");
  g.ellipse(x + 8, y + 10, 3.5, 2.5, "#F4E2C4"); g.rect(x + 7, y + 8, 3, 2, C.O); g.rect(x + 5, y + 5, 2, 2, C.O); g.rect(x + 10, y + 5, 2, 2, C.O); g.px(x + 8, y + 12, "#E26E80");
}
/** two-row card: [icon, text, ok] rows; k[i] (0..1) reveals row i (text dissolves, then its mark draws). (cx, y) top centre. */
export function rowsCard(c, cx, y, rows, k, a) {
  if (a <= 0) return null;
  const s = 3, RH = 40, w = Math.max(...rows.map((r) => tw(c, r.text, s))) + 22 + 40 + 36, h = rows.length * RH + 14, x = R(cx - w / 2);
  panel(c, x, y, w, h, a, C.p7);
  rows.forEach((r, i) => { const kk = clamp01(k[i] ?? 0), ry = y + 8 + i * RH; if (kk <= 0) return; const g = fade(c, a * clamp01(kk * 2.5)); r.icon(scaled(g, x + 10, ry + 2, 2), 0, 0); g.text(MAIN, r.text, x + 50, ry + 7, C.IV, { scale: s }); mark(c, x + w - 22, ry + 16, r.ok, clamp01((kk - 0.3) / 0.7), 18, a); });
  return { x, y, w, h };
}
