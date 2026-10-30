// The LV8 star: a tiny, cute mosquito facing the camera (series style: big glossy eyes with two highlights, pink blush,
// dark 1-px outline, banded volume shading). Needle proboscis hanging from the face, feathery antennae, a humped thorax,
// a striped abdomen dangling behind, six long legs with pale bands, blurred flutter wings. Any scale `s`, any tilt `rot`;
// below s ≈ 0.6 it turns into a crisp little silhouette (far away in front of the moon). (x, y) = head centre (screen).
import { blob, ell, tube, bez, eye, blush, fade, mix, bayer, clamp01, sm, RAMP, rnd } from "../cute.mjs";

const R = Math.round;
export const BODY = ["#07060C", "#100D1A", "#191527", "#241F37", "#312B49", "#423A5E", "#574E78", "#716896"];
const EYE = ["#1A0410", "#4A0C22", "#7E1838", "#B42C50", "#E2506E", "#FF8E9E"];
const RIM = "#A898E0", BAND = "#E6E2F6", WING = "#E4ECFF", WINGV = "#8E9ACC", GOLD = ["#5A3200", "#9A5E08", "#D89A1A", "#F8CC3A", "#FFF0A0"];

/**
 * o: s (scale), rot (rad, + = clockwise), flap (wing phase in cycles), fly (1 flying → 0 wings folded), blink 0..1,
 * happy 0..1 (eyes close into ^ ^ arcs), smug 0..1 (half-lidded + smirk), look [dx, dy], crown 0..1 (pop scale),
 * legs 0 dangling → 1 gripping (landed), a (dissolve), t (time for sways).
 */
export function drawMosquito(c, x, y, o = {}) {
  const s = o.s ?? 1, a = o.a ?? 1; if (a <= 0 || s <= 0) return;
  // far away it becomes a crisp little silhouette; the two drawings cross-dissolve over s 0.56..0.72 (no one-frame swap)
  if (!o._full) { const k = clamp01((s - 0.56) / 0.16); if (k < 1) tinyMosquito(c, x, y, { ...o, a: a * (1 - k) }); if (k > 0) drawMosquito(c, x, y, { ...o, a: a * k, _full: true }); return; }
  const rot = o.rot ?? 0, cr = Math.cos(rot), sr = Math.sin(rot), t = o.t ?? 0, g = fade(c, a);
  const P = (dx, dy) => [x + (dx * cr - dy * sr) * s, y + (dx * sr + dy * cr) * s];
  const line = (p, q, col, gg = g) => gg.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), col);
  const legs = o.legs ?? 0, fly = o.fly ?? 1, sway = Math.sin(t * 3.1) * 1.2 * (1 - legs);

  // ---- wings (behind): blurred fans while flying, folded back when sitting
  if (fly > 0.02) {
    const ph = (o.flap ?? t * 14) * 2 * Math.PI;
    for (const [k, dens] of [[Math.sin(ph - 1.3), 0.3], [Math.sin(ph - 0.6), 0.45], [Math.sin(ph), 0.85]]) for (const sd of [-1, 1]) {
      const ang = -0.5 - k * 0.45, root = P(sd * 4, 6), L = 24 * s, ux = Math.cos(ang) * sd, uy = Math.sin(ang);
      const rx = ux * cr - uy * sr, ry = ux * sr + uy * cr, w = ell(root[0] + rx * L * 0.5, root[1] + ry * L * 0.5, L * 0.52, L * 0.26, Math.atan2(ry, rx));
      const q = fade(c, a * fly * dens);
      q.poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? WING : ((X ^ Y) & 3) === 1 ? "#B4C6EE" : null));
      if (dens > 0.8) { for (let i = 0; i < w.length; i++) { const p = w[i], r = w[(i + 1) % w.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), WINGV); } line(root, [root[0] + rx * L * 0.85, root[1] + ry * L * 0.85], "#C8D4F4", q); }
    }
  }
  if (fly < 0.98) {
    const q = fade(c, a * (1 - fly));
    for (const sd of [-1, 1]) { const root = P(sd * 3, 9), tip = P(sd * 9, 30), w = ell((root[0] + tip[0]) / 2, (root[1] + tip[1]) / 2, 11.5 * s, 3.6 * s, Math.atan2(tip[1] - root[1], tip[0] - root[0]));
      q.poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? WING : "#9AA8D8")); for (let i = 0; i < w.length; i++) { const p = w[i], r = w[(i + 1) % w.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), WINGV); } }
  }

  // ---- legs (6, banded): dangling and swaying while flying, spread to grip when landed
  const LEGS = [[5, 12, 13, 13, 16, 27, 10, 20, 18, 27], [6, 14, 16, 19, 19, 32, 13, 23, 21, 30], [4, 16, 9, 24, 7, 37, 7, 25, 12, 32]];
  for (const sd of [-1, 1]) for (const [rx0, ry0, kx, ky, fx, fy, gkx, gky, gfx, gfy] of LEGS) {
    const k = [sd * (kx + (gkx - kx) * legs), ky + (gky - ky) * legs + sway * 0.3], f = [sd * (fx + (gfx - fx) * legs) + sway * sd * 0.6, fy + (gfy - fy) * legs + sway];
    const r0 = P(sd * rx0, ry0), kk = P(...k), ff = P(...f);
    line(r0, kk, BODY[3]); line(kk, ff, BODY[4]);
    if (s >= 0.8) for (const q of [0.3, 0.62]) { const bx = kk[0] + (ff[0] - kk[0]) * q, by = kk[1] + (ff[1] - kk[1]) * q; g.px(R(bx), R(by), BAND); }
    g.px(R(ff[0]), R(ff[1]), BODY[6]);
  }

  // ---- abdomen (striped, dangling behind), thorax (humped), head
  const ab = bez([0, 13], [1 + sway * 0.3, 22], [2.5 + sway, 31], 8).map((p) => P(...p));
  blob(c, [tube(ab, 4.6 * s, 1.6 * s)], { ramp: BODY, base: 2.6, gain: 2, thick: 3 * s, light: [-0.5, -0.9], litOutline: RIM, a });
  for (const q of [0.25, 0.45, 0.65, 0.82]) { const i = Math.min(ab.length - 1, R(q * (ab.length - 1))), [bx, by] = ab[i], w = (4.4 - 2.8 * q) * s; for (let d = -w + 1; d <= w - 1; d++) g.px(R(bx + d * cr), R(by + d * sr), q > 0.7 ? "#8A84B0" : "#B8B2D8"); }
  blob(c, [ell(...P(0, 10), 8 * s, 6.5 * s, rot)], { ramp: BODY, base: 2.8, gain: 2, thick: 5 * s, light: [-0.5, -0.9], litOutline: RIM, a });
  for (const sd of [-1, 1]) { const [px, py] = P(sd * 5, 12); g.px(R(px), R(py), "#C8C2E4"); }
  blob(c, [ell(x, y, 11 * s, 9.6 * s, rot)], { ramp: BODY, base: 3.0, gain: 2.2, thick: 7 * s, light: [-0.5, -0.9], litOutline: RIM, a });

  // ---- antennae (feathery, swaying a little behind the motion)
  const as = Math.sin(t * 2.4) * 1.5 + (o.antSway ?? 0);
  for (const sd of [-1, 1]) {
    const pts = bez([sd * 3.5, -7.5], [sd * 6 + as * 0.3, -15], [sd * 12 + as, -20], 8).map((p) => P(...p));
    for (let i = 1; i < pts.length; i++) line(pts[i - 1], pts[i], BODY[4]);
    if (s >= 0.8) for (let i = 2; i < pts.length; i += 2) { const [px, py] = pts[i]; g.px(R(px) - 1, R(py) - 1, BODY[6]); g.px(R(px) + 1, R(py) - 1, BODY[6]); }
    const [tx, ty] = pts[pts.length - 1]; g.px(R(tx), R(ty), "#B8B0E0");
  }

  // ---- face: big glossy eyes, blush, proboscis + palps, optional smirk
  const look = o.look ?? [0, 0], happy = clamp01(o.happy ?? 0), smug = clamp01(o.smug ?? 0);
  const blink = Math.max(o.blink ?? 0, smug * 0.42, happy);
  for (const sd of [-1, 1]) { const [ex, ey] = P(sd * 5.2, -0.5); eye(c, ex, ey, 5.2 * s, { ry: 5.8 * s, iris: EYE, pupil: "round", look, blink, lid: happy > 0.5 ? BODY[3] : BODY[4], a }); }
  // happy: the closed eyes become bright upward arcs (^ ^)
  if (happy > 0.55) { const q = fade(c, a * sm(happy, 0.55, 0.9)); for (const sd of [-1, 1]) { const [ex, ey] = P(sd * 5.2, 0.6); const w = 3.6 * s; for (let i = -w; i <= w; i += 0.5) { const yy = ey - (1 - (i / w) ** 2) * 2.6 * s; q.px(R(ex + i), R(yy), "#F2ECFF"); q.px(R(ex + i), R(yy) + 1, "#9A8CD8"); } } }
  { const [b1x, b1y] = P(-8, 5.5), [b2x, b2y] = P(8, 5.5); blush(c, b1x, b1y, 2.6 * s, 1.4 * s, "#F27A9A", a); blush(c, b2x, b2y, 2.6 * s, 1.4 * s, "#F27A9A", a); }
  const prob = o.prob ?? 0;                               // 0 hanging → 1 pushed in (bite)
  const pb = P(0, 6.5), pt = P(0.8, 23 - 2 * prob);
  for (const sd of [-1, 1]) line(P(sd * 1.6, 6), P(sd * 2.2, 10), BODY[5]);
  line([pb[0] + 1, pb[1]], [pt[0] + 1, pt[1]], BODY[0]); line(pb, pt, "#A49CCC");
  { const m = P(0.4, 15); g.px(R(m[0]), R(m[1]), BAND); g.px(R(m[0]) + 1, R(m[1]), BAND); }
  g.px(R(pt[0]), R(pt[1]), "#C8C0EC");
  if (smug > 0.05) { const q = fade(c, a * smug), m = P(3.2, 7.2); q.px(R(m[0]), R(m[1]), BODY[0]); q.px(R(m[0]) + 1, R(m[1]) - 1, BODY[0]); q.px(R(m[0]) + 2, R(m[1]) - 1, BODY[0]); }

  // ---- crown (pops: scale 0 → overshoot → 1)
  const ck = o.crown ?? 0;
  if (ck > 0.01) crown(c, ...P(1.5, -9.5), s * ck, rot + 0.12, a, t);
}

/** Tiny gold crown, base centre at (x, y). */
export function crown(c, x, y, s, rot, a, t = 0) {
  const g = fade(c, a), cr = Math.cos(rot), sr = Math.sin(rot), P = (dx, dy) => [x + (dx * cr - dy * sr) * s, y + (dx * sr + dy * cr) * s];
  const shape = [P(-7, 0), P(-7.5, -8), P(-3.6, -4), P(0, -10), P(3.6, -4), P(7.5, -8), P(7, 0)];
  blob(c, [shape], { ramp: ["#2A1600", ...GOLD, "#FFF8D8", "#FFFFFF"], base: 3.6, gain: 1.6, thick: Math.max(1, 3 * s), light: [-0.6, -0.8], outline: "#2A1600", litOutline: "#5A3200", a });
  if (s > 0.55) { const [gx, gy] = P(0, -3.2); g.px(R(gx), R(gy), "#FF4A6A"); g.px(R(gx) + 1, R(gy), "#C81A40"); for (const dx of [-4.5, 4.5]) { const [hx, hy] = P(dx, -2.5); g.px(R(hx), R(hy), "#5AD8FF"); } const tw = 0.5 + 0.5 * Math.sin(t * 6); if (tw > 0.6) { const [px, py] = P(0, -10); g.px(R(px), R(py) - 1, "#FFFFFF"); } }
}

/** Far away: a crisp little silhouette with blurred wings (s ≈ 0.25..0.6). */
function tinyMosquito(c, x, y, o) {
  const a = o.a ?? 1, g = fade(c, a), t = o.t ?? 0, s = o.s ?? 0.4, X = R(x), Y = R(y), up = Math.sin((o.flap ?? t * 14) * 2 * Math.PI) > 0;
  const k = clamp01((s - 0.25) / 0.35);                     // 0 → 3 px body, 1 → 6 px body
  const hw = 1 + R(k * 1.6);
  g.rect(X - hw - 3, Y - 2 + (up ? -1 : 0), 3, 2, "#C8D4F4"); g.rect(X + hw + 1, Y - 2 + (up ? -1 : 0), 3, 2, "#C8D4F4");
  g.rect(X - hw, Y - hw, hw * 2 + 1, hw * 2 + 1, BODY[1]); g.px(X - 1, Y - 1, "#C24474"); g.px(X + 1, Y - 1, "#C24474");
  g.line(X, Y + hw, X, Y + hw + 3 + R(k * 3), BODY[2]);
  g.line(X - hw, Y + hw, X - hw - 2, Y + hw + 3, BODY[3]); g.line(X + hw, Y + hw, X + hw + 2, Y + hw + 3, BODY[3]);
  g.rect(X, Y + hw + 1, 1, 3 + R(k * 2), BODY[1]);
  if ((o.crown ?? 0) > 0.5) { g.rect(X - 1, Y - hw - 2, 3, 1, GOLD[3]); g.px(X - 1, Y - hw - 3, GOLD[3]); g.px(X + 1, Y - hw - 3, GOLD[3]); }
}

/** Head portrait for the readout (≈ 56 × 56, centred at cx, cy): big eyes, needle proboscis, antennae, wing tips. */
export function mosquitoIcon(c, cx, cy, a = 1) {
  if (a <= 0) return; const s = 2.05, g = fade(c, a), x = cx, y = cy - 4;
  const P = (dx, dy) => [x + dx * s, y + dy * s];
  // wing tips peeking out behind the head
  for (const sd of [-1, 1]) { const w = ell(x + sd * 20, y + 13, 10, 4.2, sd * 0.55); fade(c, a * 0.8).poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? WING : "#9AA8D8")); for (let i = 0; i < w.length; i += 2) { const p = w[i], r = w[(i + 1) % w.length]; g.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), WINGV); } }
  blob(c, [ell(x, y + 17, 11, 6)], { ramp: BODY, base: 2.6, thick: 4, light: [-0.5, -0.9], litOutline: RIM, a });
  blob(c, [ell(x, y, 11 * s, 9.6 * s)], { ramp: BODY, base: 3.0, gain: 2.2, thick: 14, light: [-0.5, -0.9], litOutline: RIM, a });
  for (const sd of [-1, 1]) {
    const pts = bez([sd * 3.5, -8], [sd * 5, -11.5], [sd * 9, -12.5], 8).map((p) => P(...p));
    for (let i = 1; i < pts.length; i++) { g.line(R(pts[i - 1][0]), R(pts[i - 1][1]), R(pts[i][0]), R(pts[i][1]), BODY[4]); g.line(R(pts[i - 1][0]) + 1, R(pts[i - 1][1]), R(pts[i][0]) + 1, R(pts[i][1]), BODY[2]); }
    for (let i = 2; i < pts.length; i += 2) { const [px, py] = pts[i]; g.px(R(px) - 1, R(py) - 2, BODY[6]); g.px(R(px) + 2, R(py) - 2, BODY[6]); }
    eye(c, ...P(sd * 5.2, -0.6), 9.8, { ry: 11, iris: EYE, pupil: "round", a });
  }
  blush(c, ...P(-8.2, 5.4), 4, 2, "#F27A9A", a); blush(c, ...P(8.2, 5.4), 4, 2, "#F27A9A", a);
  const pb = P(0, 6.4), pt = [x + 1, cy + 27];
  for (const sd of [-1, 1]) g.line(R(x + sd * 3), R(pb[1]), R(x + sd * 4), R(pb[1] + 6), BODY[5]);
  g.rect(R(pb[0]) - 1, R(pb[1]), 3, R(pt[1] - pb[1]), BODY[0]); g.line(R(pb[0]), R(pb[1]), R(pt[0]) - 1, R(pt[1]), "#A49CCC");
  g.rect(R(pb[0]) - 1, R(pb[1] + 9), 3, 2, BAND); g.px(R(pt[0]), R(pt[1]), "#E0D8FF");
}
