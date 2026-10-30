// Trial 10 s · the readable layer, adapted from effort-exp-2026-10-25/xhigh/film/hud.mjs: beat windows now come from the
// plan (labels, beams, focus brackets) instead of the film's fixed timeline. Screen space, drawn after the props.
// Text is only what the validated plan carries (script words). Plates are clamped into the main safe zone.
import { MAIN, bayer } from "../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, sm, lerp, ease, easeOut, kOf, rnd, tintPx } from "./layout.mjs";

const O = "#0B0812", IV = "#FDFEED", COOL = "#D6E4FF";
export const THEMES = {
  "night-hill": { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#221B38", "#2E2548", "#1A1530"], beam: "#F7B04A" },
  space: { accent: "#3FC8F0", gold: "#9FE8FF", hot: "#E6FBFF", core: "#FFFFFF", stone: ["#141B38", "#1E2850", "#0E1430"], beam: "#7FD8FF" },
};
// main safe zone on the grid (docs/safe-zones.md ×0.5): x 35–440 (505 above y 400), y 150–625
/** 0..1: how far the box centre is inside the main zone (smooth, so overlays never pop when the camera moves). */
export const onScreenK = (b) => { const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2; return Math.min(sm(cx, 35, 80), 1 - sm(cx, 460, 505), sm(cy, 150, 195), 1 - sm(cy, 580, 625)); };
const hit = (a, b) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
export const clampToMain = (x, y, w, h) => { const xMax = (y + h < 400 ? 505 : 440) - w; return [Math.round(Math.max(35, Math.min(xMax, x))), Math.round(Math.max(150, Math.min(625 - h, y)))]; };

/** Plate with a dark 1-px outline and a thin accent frame (tombstone look on night-hill, glass on space). Dithered by a. */
export function plate(c, x, y, w, h, a, th) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (a <= bayer(i, j)) continue;
    const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1, frame = i === x + 2 || j === y + 2 || i === x + w - 3 || j === y + h - 3;
    if ((i === x || i === x + w - 1) && (j === y || j === y + h - 1)) continue;
    c.px(i, j, edge ? O : frame && i > x + 1 && i < x + w - 2 && j > y + 1 && j < y + h - 2 ? th.accent : (rnd(i * 31 + j * 7) > 0.85 ? th.stone[1] : th.stone[0])); }
}

// ---------------------------------------------------------------- label: plate + leader to its target (follows the camera)
export function drawLabel(c, t, L, box, th, avoid = []) {
  const k = clamp01((t - L.t) / 0.45), out = sm(t, L.until, L.until + 0.35); if (k <= 0 || out >= 1 || !box) return null;
  const a = sm(k, 0, 0.7) * (1 - out) * box.a * onScreenK(box), sc = 2, w = c.measure(MAIN, L.text, { scale: sc }) + 14, h = 7 * sc + 10; if (a <= 0) return null;
  const cx = (box.x0 + box.x1) / 2;
  // first free spot: above, below, then beside the target; never over a HUD card or another label
  const spots = [[cx - w / 2, box.y0 - h - 22, true], [cx - w / 2, box.y1 + 22, false], [box.x1 + 12, (box.y0 + box.y1) / 2 - h / 2, true], [box.x0 - w - 12, (box.y0 + box.y1) / 2 - h / 2, true]];
  let px, py, above;
  for (const [sx, sy, ab] of spots) { const [qx, qy] = clampToMain(sx, sy, w, h); if (!avoid.some((b) => hit({ x0: qx, y0: qy, x1: qx + w, y1: qy + h }, b))) { px = qx; py = qy; above = ab; break; } }
  if (px === undefined) { [px, py] = clampToMain(spots[0][0], spots[0][1], w, h); above = true; }
  py += R((1 - easeOut(k)) * (above ? 8 : -8));
  // leader: dotted line from the plate to the target's edge
  const lx = R(Math.max(px + 6, Math.min(px + w - 6, cx))), ly0 = py + h / 2 < (box.y0 + box.y1) / 2 ? py + h : py, ly1 = py + h / 2 < (box.y0 + box.y1) / 2 ? R(box.y0 + 4) : R(box.y1 - 4), lead = easeOut(clamp01(k * 1.6));
  const step = ly1 > ly0 ? 1 : -1, yEnd = R(lerp(ly0, ly1, lead));
  for (let y = ly0; y !== yEnd; y += step) if (a > bayer(lx, y) && (Math.abs(y) % 4) < 3) { c.px(lx, y, th.gold); c.px(lx + 1, y, O); }
  plate(c, px, py, w, h, a, th);
  c.text(MAIN, L.text, px + 8, py + 6, O, { scale: sc, colorAt: (X, Y) => (a > bayer(X, Y) ? IV : null) });
  return { x0: px, y0: py, x1: px + w, y1: py + h, text: L.text };
}

// ---------------------------------------------------------------- beams: light stream (from xhigh drawSight) or signal (drawLink)
export function drawBeam(c, t, B, from, to, th) {
  const k = (t - B.t) / 0.65; if (k <= 0 || !from || !to) return;
  const fadeOut = 1 - sm(t, B.t + 1.4, B.t + 1.9), a0 = Math.min(from.a * from.k, to.a * to.k) * fadeOut; if (a0 <= 0) return;
  const [fx, fy] = from.pt, [tx, ty] = to.pt, len = Math.hypot(tx - fx, ty - fy) || 1, head = easeOut(Math.min(1, k));
  const at = (u) => [lerp(fx, tx, u), lerp(fy, ty, u) - Math.sin(Math.PI * u) * Math.min(40, len * 0.12)];
  if (B.style === "light") {
    const tail = clamp01(k * 1.2 - 0.9) * 0.6;
    for (let s2 = 0; s2 <= 1; s2 += 1 / len) { if (s2 < tail || s2 > head) continue; const [x, y] = at(s2), w = lerp(6, 3, s2), a = 0.38 * a0 * Math.min(1, (head - s2) * 5 + (k >= 1 ? 1 : 0));
      for (let j = -w; j <= w; j++) tintPx(c, R(x), R(y + j), th.beam, a * (1 - Math.abs(j) / (w + 1)), 3); }
    const n = Math.floor(len / 7);
    for (let i = 0; i <= n; i++) { const u = (i + ((t * 4) % 1)) / n; if (u < tail || u > head) continue;
      const [x, y] = at(u), X = R(x), Y = R(y), big = i % 2 === 0; if (a0 * Math.min(1, (head - u) * 6 + (k >= 1 ? 1 : 0)) > bayer(X, Y)) { c.px(X, Y, th.hot); c.px(X + 1, Y, big ? th.hot : th.gold); if (big) { c.px(X, Y + 1, th.gold); c.px(X + 1, Y + 1, th.gold); } } }
  } else {
    const n = Math.max(30, Math.floor(len / 3));
    for (let i = 0; i <= n; i++) { const u = i / n; if (u > head) break; const [x, y] = at(u), X = R(x), Y = R(y);
      for (let j = -3; j <= 3; j++) tintPx(c, X, Y + j, th.accent, 0.3 * a0 * (1 - Math.abs(j) / 4), 3);
      if (((i + Math.floor(t * 12)) % 3) === 2) continue;
      if (a0 > bayer(X, Y)) { const col = u > head - 0.08 ? th.hot : th.gold; c.px(X, Y, col); c.px(X + 1, Y, col); c.px(X, Y + 1, th.accent); c.px(X + 1, Y + 1, th.accent); } }
  }
  if (k < 1) { const [x, y] = at(head); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9 && a0 > bayer(R(x) + i, R(y) + j)) c.px(R(x) + i, R(y) + j, i * i + j * j <= 2 ? th.core : i * i + j * j <= 5 ? th.hot : th.gold); }
  // arrival ring at the target
  const land = t - B.t - 0.65; if (land > 0 && land < 0.5) { const rr = 10 + 34 * easeOut(land / 0.5), aa = (1 - land / 0.5) * a0;
    for (let q = 0; q < 90; q++) { const an = (q / 90) * TAU, X = R(tx + Math.cos(an) * rr * 1.3), Y = R(ty + Math.sin(an) * rr); if (aa > bayer(X, Y)) c.px(X, Y, th.hot); } }
}

// ---------------------------------------------------------------- focus brackets close in and lock on the word (+ tag)
export function drawFocus(c, t, F, box, th) {
  if (onScreenK(box) <= 0) return null;
  const lockAt = F.t + 0.4, kin = clamp01((t - F.t) / 0.4), kout = kOf(t, [F.until, F.until + 0.4]); if (kin <= 0 || kout >= 1 || !box) return null;
  box = { ...box, x0: Math.max(box.x0, 47), x1: Math.min(box.x1, 493), y0: Math.max(box.y0, 168), y1: Math.min(box.y1, 610) };   // frame only what is inside the main zone
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, hw = (box.x1 - box.x0) / 2 + 8, hh = (box.y1 - box.y0) / 2 + 8;
  const lockT = t - lockAt, snap = lockT > 0 ? 1 - 0.07 * Math.sin(Math.PI * clamp01(lockT / 0.18)) : 1;
  const s = lerp(1.7, 1, ease(kin)) * snap, a = Math.min(sm(kin, 0, 0.35), 1 - kout) * box.a * onScreenK(box), arm = R(Math.max(6, 16 * (1 - kout * 0.8))), thk = 3;
  const flash = lockT > 0 ? Math.max(0, 1 - lockT / 0.35) : 0, col = lockT < 0 ? COOL : flash > 0.5 ? th.hot : th.gold;
  const x0 = R(cx - hw * s), x1 = R(cx + hw * s), y0 = R(cy - hh * s), y1 = R(cy + hh * s);
  const put = (x, y, w, h, cc) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (a > bayer(i, j)) c.px(i, j, cc); };
  for (const [px, py, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    const hx = dx > 0 ? px : px - arm + 1, vy = dy > 0 ? py : py - arm + 1;
    put(hx + 1, (dy > 0 ? py : py - thk + 1) + 1, arm, thk, O); put((dx > 0 ? px : px - thk + 1) + 1, vy + 1, thk, arm, O);
    put(hx, dy > 0 ? py : py - thk + 1, arm, thk, col); put(dx > 0 ? px : px - thk + 1, vy, thk, arm, col);
  }
  if (F.tag && lockT > -0.02) { const ta = Math.min(a, sm(lockT, -0.02, 0.2)), sc = 2, w = c.measure(MAIN, F.tag, { scale: sc }) + 10, h = 7 * sc + 8;
    const [tx, ty] = clampToMain(x0, y0 - h - 4 + R((1 - easeOut(clamp01(lockT / 0.25))) * 6), w, h);
    plate(c, tx, ty, w, h, ta, th); c.text(MAIN, F.tag, tx + 5, ty + 4, O, { scale: sc, colorAt: (X, Y) => (ta > bayer(X, Y) ? th.gold : null) });
    return { x0: tx, y0: ty, x1: tx + w, y1: ty + h, text: F.tag }; }
  return null;
}
