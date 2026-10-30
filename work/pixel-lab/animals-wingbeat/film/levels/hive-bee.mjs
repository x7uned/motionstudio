// LV8's honeybee: a copy of levels/bee-art.mjs (the series' chubby honeybee: striped abdomen, fuzzy collar, glossy bead
// eyes, blush, smile, round-tipped antennae) restyled for the golden-hour first frame of the wingbeat film:
//  · a warm backlight rim (the low sun sits behind the bee's head): the top of every silhouette edge glows gold;
//  · 230 beats/s cannot be seen at 30 fps, so the flutter wings are replaced by a motion-blur fan — the swept area as a
//    dithered, translucent sheet, brighter at the two turning points, plus one faint ghost wing at the real elevation
//    e = cos(2π·wingPhase)·amt (see wingFan); the fan is backlit too (warm white, gold rim on the tips).
// bee-art.mjs itself stays untouched (shared file). (x, y) = head centre in screen pixels; all motion comes from the caller.
import { blob, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, bayer } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
const BEE_EYE = ["#0A0610", "#1A1020", "#2A1A30", "#6A4A2A", "#A87A3A"];
const STRIPE = ["#07060C", "#0E0A14", "#16101E", "#1E1628", "#2A1E30", "#3A2A3A", "#4E3A44", "#6A5050"];
const FUZZ = ["#3A2604", "#6A4808", "#A07010", "#D09A20", "#F2C23A", "#FAD866", "#FDE89A", "#FFF6D0"];
const SPR = spriteCache(24);

/** Backlight: recolour the top rim of a cached sprite's silhouette (pixels whose upper neighbours are empty). */
export function rimLight(L, cols = ["#FFF6D6", "#FFE29A"], depth = 2, side = 0.35, o = {}) {
  const W = L.w, H = L.h, m = L.m, hit = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x; if (!m[i]) continue;
    // skip the dark outline itself: only pixels with all 4 neighbours inside are rim candidates
    if (!m[i - 1] || !m[i + 1] || !m[i - W] || !m[i + W]) continue;
    let k = -1;
    for (let d = 1; d <= depth + 1 && k < 0; d++) {
      if (y - d - 1 >= 0 && !m[(y - d - 1) * W + x]) k = d - 1;
      else if (side > 0 && d <= 2 && ((x - d - 1 >= 0 && !m[(y - 1) * W + x - d - 1] && y < H * side + 8) || (x + d + 1 < W && !m[(y - 1) * W + x + d + 1] && y < H * side + 8))) k = d;
    }
    if (k >= 0 && k <= depth) hit.push([x, y, k]);
  }
  for (const [x, y, k] of hit) { const cur = L.get(x, y); L.px(x, y, mix(cur, cols[Math.min(cols.length - 1, k)], k === 0 ? 0.85 : 0.55)); }
  // the outline itself turns warm where the sun touches the top of the silhouette
  if (o.outline) { const up = []; for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; if (!m[i] || y > H * (o.outlineTop ?? 0.6)) continue; if (!m[i - W] || !m[i - W - 1] || !m[i - W + 1]) up.push(x, y); } for (let k = 0; k < up.length; k += 2) L.px(up[k], up[k + 1], o.outline); }
}

/** Body (abdomen with stripes, stinger, little legs, fuzzy collar, head, head tuft) into a cached sprite. */
function body(s, tilt, rim) {
  const key = `hbee:${s.toFixed(3)}:${tilt.toFixed(2)}:${rim ? 1 : 0}`, W = R(150 * s) + 8, H = R(190 * s) + 8, ox = R(W / 2), oy = R(70 * s) + 4;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); dx *= s; dy = dy * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
    const poly = (p) => xform(p, x, y + 40 * s, tilt);
    const ab = poly(ell(x, y + 64 * s, 44 * s, 40 * s, 0, 48)), st = poly([[x - 5 * s, y + 100 * s], [x + 5 * s, y + 100 * s], [x, y + 112 * s]]);
    blob(g, [st], { ramp: RAMP.ink, thick: 3 });
    for (const sd of [-1, 1]) for (const [dx, dy, ex, ey] of [[14, 96, 18, 106], [26, 90, 34, 99]]) { const p = P(sd * dx, dy), q = P(sd * ex, ey); g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#140E1C"); g.px(R(q[0]) + sd, R(q[1]), "#140E1C"); }
    blob(g, [ab], { ramp: RAMP.bee, base: 3.3, gain: 2.2, thick: 18 * s, litOutline: "#5A3A04" });
    const idx = new Map(RAMP.bee.map((h, i) => [h, i]));
    for (const [s0, s1] of [[54, 66], [78, 89]]) {
      for (let Y = R(y + (s0 - 8) * s); Y <= R(y + (s1 + 10) * s); Y++) for (let X = R(x - 46 * s); X <= R(x + 46 * s); X++) {
        const u = (X - x) / (44 * s), yy = (Y - y) / s - 6 * (1 - u * u) - ((X - x) / s) * Math.tan(tilt);
        if (yy < s0 || yy > s1) continue; const col = g.get(X, Y), hx = "#" + col.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(), i = idx.get(hx);
        if (i !== undefined) g.px(X, Y, STRIPE[i]);
      }
    }
    const fz = (cx, cy, rx, ry, n, amp, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 6.283, k = 1 + amp * (i % 2 ? 1 : -0.4) * (0.7 + 0.3 * Math.sin(i * 1.7 + ph)); out.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return out; };
    blob(g, [poly(fz(x, y + 34 * s, 38 * s, 16 * s, 44, 0.07, 1))], { ramp: FUZZ, base: 4.4, gain: 1.8, thick: 8 * s, litOutline: "#6A4808" });
    blob(g, [poly(fz(x, y, 46 * s, 42 * s, 72, 0.025, 0))], { ramp: RAMP.bee, base: 3.9, gain: 2.0, thick: 20 * s, litOutline: "#6A4808" });
    for (const [dx, h, lean] of [[-6, 7, -3], [0, 10, 1], [6, 7, 4]]) { const p0 = P(dx, -40), p1 = P(dx + lean, -40 - h); blob(g, [tube([p0, [(p0[0] + p1[0]) / 2 + lean * 0.3 * s, (p0[1] + p1[1]) / 2], p1], Math.max(1.2, 2.6 * s), Math.max(0.8, 1.2 * s))], { ramp: RAMP.bee, base: 4.6, thick: 2, litOutline: "#6A4808" }); }
    if (rim) rimLight(g, ["#FFF8DC", "#FFE7A0", "#FCD670"], 2, 0.5, { outline: "#C8781E", outlineTop: 0.5 });
  });
}

/**
 * Motion-blur wing fan of one side. root = [x, y] (screen), side ±1, e = wing elevation (+1 top … −1 bottom),
 * L = wing length (px), aTop/aBot = wing angles (rad, 0 = straight out, negative = up) at the turning points.
 * o.cols = [sheet light, sheet dark, edge, vein], o.dens = sheet density, o.hind = draw the hind wing too.
 */
export function wingFan(c, root, side, e, L, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const g = fade(c, a), [rx, ry] = root, aTop = o.aTop ?? -1.1, aBot = o.aBot ?? 0.3, tilt = o.tilt ?? 0;
  const cols = o.cols ?? ["#FFF8E6", "#F2D9B0", "#C89A6A", "#E8C890"], dens0 = o.dens ?? 0.3, w0 = o.width ?? 0.36;
  const lo = Math.min(aTop, aBot), hi = Math.max(aTop, aBot);
  const span = L + 3, x0 = side > 0 ? R(rx - 3) : R(rx - span), x1 = side > 0 ? R(rx + span) : R(rx + 3);
  const sn = Math.sin(lo + tilt * side), sh = Math.sin(hi + tilt * side);
  const y0 = R(ry + Math.min(0, sn, sh) * span - 3), y1 = R(ry + Math.max(0, sn, sh) * span + 3);
  // the swept sheet: dithered, denser toward the tips and at both turning points (where the wing slows down)
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const dx = (X + 0.5 - rx) * side, dy = Y + 0.5 - ry, d = Math.hypot(dx, dy); if (d < 4 || d > L) continue;
    const an = Math.atan2(dy, dx) - tilt; if (an < lo - 0.04 || an > hi + 0.04) continue;
    const k = (an - lo) / (hi - lo), turn = Math.max(0, 1 - Math.min(k, 1 - k) * 7), rr = d / L;
    // wing outline envelope: the sheet is the union of wing shapes, so the inner part near the root is thinner
    const dens = (dens0 * (0.45 + 0.75 * rr * rr) + 0.38 * turn * rr) * (rr > 0.94 ? 0.7 : 1);
    if (dens <= bayer(X, Y)) continue;
    g.px(X, Y, rr > 0.93 || (turn > 0.75 && rr > 0.35) ? (turn > 0.5 ? cols[0] : cols[2]) : ((X + Y) & 1) ? cols[0] : cols[1]);
  }
  // the ghost: one faint wing at the real elevation
  const ang = (aTop + aBot) / 2 + ((aTop - aBot) / 2) * e + tilt * side;
  const drawWing = (an, len, wd, dens, edge) => {
    const dx = Math.cos(an), dy = Math.sin(an), cx = rx + side * dx * len * 0.5, cy = ry + dy * len * 0.5;
    const poly = ell(cx, cy, len * 0.5, len * wd, side > 0 ? an : Math.PI - an, 28), q = fade(c, a * dens);
    q.poly(poly, null, (X, Y) => (((X + Y) & 1) === 0 ? cols[0] : ((X ^ Y) & 3) === 1 ? cols[1] : null));
    if (edge) for (let i = 0; i < poly.length; i++) { const p = poly[i], r = poly[(i + 1) % poly.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), cols[2]); }
    q.line(R(rx + side * dx * 3), R(ry + dy * 3), R(rx + side * dx * len * 0.8), R(ry + dy * len * 0.8), cols[3]);
  };
  drawWing(ang, L * 0.98, w0, o.ghost ?? 0.55, true);
  if (o.hind) drawWing(ang + 0.42, L * 0.66, w0 * 1.05, (o.ghost ?? 0.55) * 0.6, false);
}

/**
 * Chubby honeybee facing the camera. (x, y) = head centre (screen). o: s scale, tilt (rad), look [dx, dy], blink 0..1,
 * open 0..1 (smile → "o"), e (wing elevation from cos(2π·wingPhase)·amt), a (dissolve), antSway (px), rim (backlight),
 * happy 0..1 (closed happy "^ ^" eyes), wing (wingFan options).
 */
export function drawBee(c, x, y, o = {}) {
  const s = o.s ?? 1, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); dx *= s; dy = dy * s - 40 * s; return [x + dx * cs - dy * sn, y + 40 * s + dx * sn + dy * cs]; };
  const g = fade(c, a);
  // wings (behind the body): the blur fans, forewing + hindwing per side
  for (const side of [-1, 1]) wingFan(c, P(side * 28, 26), side, o.e ?? 0, 66 * s, { a, tilt, hind: true, aTop: -1.18, aBot: 0.22, ...(o.wing ?? {}) });
  body(s, tilt, o.rim ?? true).blit(c, x, y, { a });
  // antennae with round tips (sway lags behind the hover)
  const sway = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const r0 = P(sd * 12, -38), mid = P(sd * 20 + sway * 0.4, -64), tip = P(sd * 34 + sway, -74), w = Math.max(1, 2.2 * s);
    blob(c, [tube(bez(r0, mid, tip, 8), w, Math.max(0.8, 1.8 * s))], { ramp: RAMP.ink, thick: 2, a });
    blob(c, [ell(tip[0], tip[1], Math.max(2, 5 * s), Math.max(2, 5 * s))], { ramp: RAMP.ink, thick: 4, a, litOutline: "#302C50" });
    g.px(R(tip[0] - 2 * s), R(tip[1] - 2 * s), "#8A86B4");
    if (o.rim ?? true) { const q = fade(c, a * 0.9); for (let i = -2; i <= 2; i++) q.px(R(tip[0] + i), R(tip[1] - 5 * s) + (Math.abs(i) === 2 ? 1 : 0), "#FFE7A0"); }
  }
  // face
  const look = o.look ?? [0, 0], blink = o.blink ?? 0, happy = o.happy ?? 0;
  for (const sd of [-1, 1]) {
    const [ex, ey] = P(sd * 19, 1);
    eye(c, ex, ey, 13 * s, { ry: 15 * s, iris: BEE_EYE, pupil: "bead", look, blink: Math.max(blink, happy), lid: RAMP.bee[4], a });
    if (happy > 0.6) { const q = fade(c, a * Math.min(1, (happy - 0.6) / 0.3)); for (let i = -9; i <= 9; i++) { const u = i / 9; q.px(R(ex + i * s), R(ey + 2 * s - (1 - u * u) * 6 * s), "#07060E"); q.px(R(ex + i * s), R(ey + 3 * s - (1 - u * u) * 6 * s), "#07060E"); } }
  }
  { const [bx1, by1] = P(-32, 20), [bx2, by2] = P(32, 20); blush(c, bx1, by1, 8 * s, 4 * s, "#F0708E", a); blush(c, bx2, by2, 8 * s, 4 * s, "#F0708E", a); }
  const [mx, my] = P(0, 21);
  smile(c, mx, my, Math.max(2, 5 * s), { open: o.open ?? 0.35, a });
}

/** Tiny worker bee (8 px), flying; `up` = wing up/down frame (bool), dir ±1; glow = golden backlit wings. */
export function miniBee(c, x, y, up, dir = 1, a = 1, glow = 0) {
  const g = fade(c, a); x = R(x); y = R(y);
  const w1 = glow ? "#FFF6DA" : "#EAF6FF", w2 = glow ? "#FFE2A8" : "#CFE6FA";
  g.rect(x - 2, y - 4 + (up ? -1 : 0), 3, 3, w1); g.rect(x + 1, y - 4 + (up ? -1 : 0), 3, 3, w2);
  g.rect(x - 4, y - 2, 9, 5, "#1A1020"); g.rect(x - 3, y - 1, 7, 3, "#F4C22A"); g.rect(x - 1, y - 1, 1, 3, "#1A1020"); g.rect(x + 1, y - 1, 1, 3, "#1A1020");
  g.px(x + 3 * dir, y - 1, "#1A1020"); g.px(x + 3 * dir, y, "#F4C22A"); g.px(x - 5 * dir, y, "#1A1020");
  if (glow) { g.px(x - 3, y - 2, "#FFE7A0"); g.px(x + 2, y - 2, "#FFE7A0"); }
}
/** Worker bee seen from the side (12 px) with a blurred wing disc; ph = wing elevation sample (−1..1), dir ±1. */
export function workerBee(c, x, y, e, dir = 1, a = 1, pollen = false) {
  const g = fade(c, a); x = R(x); y = R(y);
  // wing blur: a small dithered half-disc above the thorax, the ghost at the elevation e
  for (let Y = -6; Y <= 0; Y++) for (let X = -4; X <= 4; X++) { const d = X * X + Y * Y * 1.4; if (d > 26) continue; if ((d < 12 ? 0.55 : 0.32) > bayer(x + X, y + Y)) g.px(x + X - dir, y - 3 + Y, ((X + Y) & 1) ? "#FFF4D8" : "#F4D6A8"); }
  const gx = x - dir + R(Math.cos(1.2 + e) * 4 * dir), gy = y - 4 - R(Math.max(0, e + 0.4) * 2); g.px(gx, gy, "#FFFFFF"); g.px(gx + dir, gy, "#FFF0C8");
  // body: head, thorax, striped abdomen
  g.rect(x - 4 * dir - (dir < 0 ? 4 : 0), y - 2, 5, 5, "#1A1020"); g.rect(x - 3 * dir - (dir < 0 ? 3 : 0), y - 1, 3, 3, "#F2BE2A");
  g.rect(x - 7 * dir - (dir < 0 ? 0 : 0), y - 1, 1, 3, "#1A1020"); g.rect(x - 5 * dir, y - 1, 1, 3, "#1A1020");
  g.rect(x, y - 2, 3, 4, "#3A2A1A"); g.px(x + 1, y - 2, "#FFE7A0");
  g.rect(x + 3 * dir - (dir < 0 ? 2 : 0), y - 2, 3, 4, "#1A1020"); g.px(x + 4 * dir, y - 1, "#FFFFFF");
  if (pollen) { g.px(x, y + 2, "#FFB020"); g.px(x + 1, y + 2, "#FF9A10"); }
}
/** The same worker seen head-on (used for a few frames while it turns, so it never flips sides in one frame). */
export function workerFront(c, x, y, e, a = 1, pollen = false) {
  const g = fade(c, a); x = R(x); y = R(y);
  for (const sd of [-1, 1]) for (let Y = -5; Y <= 0; Y++) for (let X = 1; X <= 6; X++) { const d = (X - 3) ** 2 + Y * Y * 1.4; if (d > 12) continue; if (0.42 > bayer(x + sd * X, y + Y)) g.px(x + sd * X, y - 2 + Y, ((X + Y) & 1) ? "#FFF4D8" : "#F4D6A8"); }
  g.px(x - 4, y - 4 - R(Math.max(0, e) * 2), "#FFFFFF"); g.px(x + 4, y - 4 - R(Math.max(0, e) * 2), "#FFFFFF");
  g.rect(x - 2, y - 3, 5, 7, "#1A1020"); g.rect(x - 1, y - 2, 3, 2, "#F2BE2A"); g.rect(x - 1, y + 1, 3, 1, "#F2BE2A"); g.px(x, y - 3, "#FFE7A0");
  if (pollen) { g.px(x - 2, y + 3, "#FFB020"); g.px(x + 2, y + 3, "#FFB020"); }
}
/** Worker that turns smoothly: f = facing (−1 … 1, continuous); side view when |f| > 0.25, head-on in between. */
export function workerTurning(c, x, y, e, f, a = 1, pollen = false) { if (Math.abs(f) < 0.25) workerFront(c, x, y, e, a, pollen); else workerBee(c, x, y, e, f > 0 ? 1 : -1, a, pollen); }
export { mix, bayer };
