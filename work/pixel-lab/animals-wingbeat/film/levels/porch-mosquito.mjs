// LV9 · the series' mosquito (female, Aedes-like): a chibi front-facing mosquito — big round dark head with a silver
// forehead patch, big glossy teal eyes with two highlights and little lashes, pink blush, a tiny smile with a long thin
// proboscis hanging from it (and two short palps), thin antennae with short silver whorls, a humped thorax with a white
// stripe, a slim banded abdomen and six long dangling legs with white bands. Wings: a high-speed blur fan (the swept
// area as a dithered translucent sheet, brighter at both turning points, a dark scale fringe on the tip arc) plus one
// faint ghost wing placed by the caller's wing elevation e = cos(2π·wingPhase)·amt.
// drawMosquito(c, x, y, o): (x, y) = head centre (screen). The volume-shaded body is cached per (scale, tilt).
import { blob, ell, tube, bez, eye, blush, smile, fade, mix, bayer } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
export const MQ = ["#06050C", "#0F0C18", "#191426", "#251E36", "#332A48", "#45395E", "#5A4D78", "#76699A"];
const SCALE = ["#5A5470", "#8A84A4", "#B8B4CC", "#E4E2F0", "#FFFFFF"];
const EYE = ["#07060C", "#0A1E2C", "#12364A", "#1C5868", "#28848A", "#46B4AC", "#92E6D6"];
const SPR = spriteCache(48);

// abdomen centre line and half-width (local units, head centre = origin, +v down)
const ABD = (k) => ({ u: 1.5 * Math.sin(k * 2.2), v: 56 + k * 70, r: 11 * (1 - k) ** 0.7 * (1 + 0.14 * Math.sin(Math.PI * k)) + 2 });

function body(s, tilt) {
  const key = `mq:${s.toFixed(2)}:${tilt.toFixed(2)}`, W = R(100 * s) + 12, H = R(176 * s) + 12, ox = R(W / 2), oy = R(40 * s) + 6;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    const P = (u, v) => [x + (u * cs - (v - 36) * sn) * s, y + (36 + u * sn + (v - 36) * cs) * s];
    const T = (pts) => pts.map(([u, v]) => P(u, v));
    const inv = (X, Y) => { const dx = (X - x) / s, dy = (Y - y) / s - 36; return [dx * cs + dy * sn, -dx * sn + dy * cs + 36]; };
    // abdomen (hangs down behind the legs), then white scale bands across it
    const L = [], Rr = []; for (let i = 0; i <= 16; i++) { const a = ABD(i / 16); L.push([a.u - a.r, a.v]); Rr.push([a.u + a.r, a.v]); }
    const tip = ABD(1); const abd = T([...L, [tip.u, tip.v + 3], ...Rr.reverse()]);
    blob(g, [abd], { ramp: MQ, base: 3.1, gain: 2.4, thick: 9 * s, litOutline: MQ[3] });
    for (let Y = R(y + 44 * s); Y <= R(y + 136 * s); Y++) for (let X = R(x - 22 * s); X <= R(x + 22 * s); X++) {
      const [u, v] = inv(X + 0.5, Y + 0.5), k = (v - 56) / 70; if (k < 0.1 || k > 0.96) continue;
      const a = ABD(k), q = (k * 6) % 1; if (q > 0.2 || Math.abs(u - a.u) > a.r - 1.1 * (1 / s)) continue;
      const side = (u - a.u) / a.r; g.px(X, Y, SCALE[side < -0.35 ? 3 : side > 0.45 ? 1 : 2]);
    }
    // thorax: humped, with a white median stripe and two white side patches
    blob(g, [T(ell(0, 46, 21, 17, 0, 40))], { ramp: MQ, base: 3.5, gain: 2.2, thick: 12 * s, litOutline: MQ[4] });
    for (let Y = R(y + 30 * s); Y <= R(y + 64 * s); Y++) for (let X = R(x - 24 * s); X <= R(x + 24 * s); X++) {
      const [u, v] = inv(X + 0.5, Y + 0.5);
      if (((u / 21) ** 2 + ((v - 46) / 17) ** 2) > 0.8) continue;
      if (Math.abs(u) < 1.3 && v > 34 && v < 57) g.px(X, Y, v < 40 ? SCALE[4] : SCALE[3]);
    }
    // head: big and round, a silver patch on the forehead
    blob(g, [T(ell(0, 0, 39, 35, 0, 72))], { ramp: MQ, base: 3.7, gain: 2.3, thick: 22 * s, litOutline: MQ[5] });
    for (let Y = R(y - 36 * s); Y <= R(y - 16 * s); Y++) for (let X = R(x - 8 * s); X <= R(x + 8 * s); X++) {   // a soft silver crown stripe
      const [u, v] = inv(X + 0.5, Y + 0.5), d = (u / 3.2) ** 2 + ((v + 26) / 8) ** 2; if (d > 1) continue;
      if (0.95 - d * 0.8 > bayer(X, Y)) g.px(X, Y, d < 0.35 ? SCALE[3] : u < 0 ? SCALE[2] : SCALE[1]);
    }
  });
}

/** Thin pixel line of width w with a colour chosen by the distance along it (bands). */
function band(g, p, q, w, colAt, d0 = 0) {
  const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1])));
  for (let i = 0; i <= n; i++) { const x = p[0] + ((q[0] - p[0]) * i) / n, y = p[1] + ((q[1] - p[1]) * i) / n, col = colAt(d0 + i); g.px(R(x), R(y), col); if (w > 1) { g.px(R(x) + 1, R(y), col); } }
  return d0 + n;
}

/**
 * Wing blur fan from the root (rx, ry) on side sd (±1). A0 (top of the stroke) … A1 (bottom), radians from the
 * horizontal (negative = up). e = wing elevation (+1 top … −1 bottom) places the faint ghost wing.
 */
export function wingFan(c, rx, ry, sd, o) {
  const { len, A0, A1, e = 0, a = 1, tilt = 0, width = 12, sheet = ["#F2F0FF", "#BEB6E6"], fringe = "#5E5288", ghost = 0.3, dens = 1 } = o;
  if (a <= 0) return;
  const g = fade(c, a), x0 = R(rx - (sd < 0 ? len + 2 : 3)), x1 = R(rx + (sd > 0 ? len + 2 : 3));
  const yA = Math.min(Math.sin(A0 + tilt * sd), Math.sin(A1 + tilt * sd), 0), yB = Math.max(Math.sin(A0 + tilt * sd), Math.sin(A1 + tilt * sd), 0);
  for (let Y = R(ry + yA * len - 3); Y <= R(ry + yB * len + 3); Y++) for (let X = x0; X <= x1; X++) {
    const dx = (X - rx) * sd, dy = Y - ry, d = Math.hypot(dx, dy); if (d < 6 || d > len) continue;
    const an = Math.atan2(dy, dx) - tilt * sd; if (an < A0 - 0.03 || an > A1 + 0.03) continue;
    const k = (an - A0) / (A1 - A0), turn = Math.pow(Math.min(1, Math.abs(2 * k - 1)), 6);            // the wing lingers at both ends
    const rr = d / len, den = dens * (0.13 + 0.16 * rr * rr + 0.36 * turn);
    if (d > len - 2.2) { if (0.32 * dens + 0.4 * turn > bayer(X, Y)) g.px(X, Y, fringe); continue; }
    if (den > bayer(X, Y)) g.px(X, Y, ((X + Y) & 1) ? sheet[0] : sheet[1]);
  }
  // the two turning-point wings (veins visible) and the faint ghost at the current elevation
  const wingPoly = (ang, l, w) => { const pts = []; for (let i = 0; i <= 10; i++) { const u = i / 10, half = Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)) * w * (1 - u * 0.3); pts.push([u * l, -half * 0.8]); } for (let i = 10; i >= 0; i--) { const u = i / 10, half = Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)) * w * (1 - u * 0.3); pts.push([u * l, half]); } const cs = Math.cos(ang), sn = Math.sin(ang); return pts.map(([u, v]) => [rx + sd * (u * cs - v * sn), ry + (u * sn + v * cs)]); };
  const mid = (A0 + A1) / 2, half = (A1 - A0) / 2;
  for (const [ang, dn, vein] of [[A0 + 0.04, 0.34 * dens, 1], [A1 - 0.04, 0.3 * dens, 1], [mid - e * half * 0.96, ghost, 0]]) {
    const w = wingPoly(ang + tilt * sd, len * 0.97, width), q = fade(c, a * dn);
    q.poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? "#FFFFFF" : "#CFC8F0"));
    if (vein) { const q2 = fade(c, a * Math.min(1, dn * 1.6)); const an2 = ang + tilt * sd; q2.line(R(rx + sd * Math.cos(an2) * 6), R(ry + Math.sin(an2) * 6), R(rx + sd * Math.cos(an2) * len * 0.9), R(ry + Math.sin(an2) * len * 0.9), "#8A7EB8"); }
  }
}

/**
 * Mosquito facing the camera. o: s (scale), tilt, look [dx, dy], blink, wing (elevation e −1..1), amt (stroke 0..1),
 * a (dissolve), antSway, legSway (px, dangling legs lag behind the motion), prob (proboscis direction, rad from straight
 * down, + = screen right), buzz 0..1 (brighter fan + whine ticks at the tips), open 0..1 (smile opens).
 */
export function drawMosquito(c, x, y, o = {}) {
  const s = Math.round((o.s ?? 1) * 50) / 50, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  const cs = Math.cos(tilt), sn = Math.sin(tilt);
  const P = (u, v) => [x + (u * cs - (v - 36) * sn) * s, y + (36 + u * sn + (v - 36) * cs) * s];
  const g = fade(c, a), buzz = o.buzz ?? 0;
  // ---- wings (behind everything): long narrow mosquito wings as a blur fan from each shoulder
  for (const sd of [-1, 1]) {
    const [rx, ry] = P(sd * 17, 38);
    wingFan(c, rx, ry, sd, { len: 108 * s, A0: -1.02, A1: 0.12, e: o.wing ?? 0, a: a * (o.amt ?? 1), tilt, width: 12 * s, ghost: 0.3, dens: 1 + 0.25 * buzz });
    if (buzz > 0.04) { const q = fade(c, a * buzz); for (const an of [-1.08, 0.18]) { const d0 = 112 * s, ex = rx + sd * Math.cos(an + tilt * sd) * d0, ey = ry + Math.sin(an + tilt * sd) * d0; q.line(R(ex), R(ey), R(ex + sd * Math.cos(an) * 7 * s), R(ey + Math.sin(an) * 7 * s), "#FFFFFF"); q.line(R(ex + sd * 2), R(ey + (an < 0 ? 3 : -3)), R(ex + sd * Math.cos(an) * 5 * s + sd * 2), R(ey + Math.sin(an) * 5 * s + (an < 0 ? 3 : -3)), "#E8E0FF"); } }
  }
  body(s, tilt).blit(c, x, y, { a });
  // ---- six long dangling legs with white bands (in front of the abdomen)
  const sway = o.legSway ?? 0, w = s >= 0.75 ? 2 : 1;
  const LEGS = [[6, 54, 28, 70, 32, 116, 24, 152], [14, 57, 46, 66, 58, 114, 60, 160], [11, 61, 36, 84, 52, 130, 74, 168]];
  for (const sd of [-1, 1]) for (let i = 2; i >= 0; i--) {
    const [ru, rv, ku, kv, au, av, fu, fv] = LEGS[i], k1 = P(sd * ku + sway * 0.25, kv), a1 = P(sd * au + sway * 0.6, av), f1 = P(sd * fu + sway, fv), r0 = P(sd * ru, rv);
    const dark = MQ[1], white = "#E8E6F4";
    band(g, r0, k1, w, () => dark);
    let d = band(g, k1, a1, w, (q) => (q % (13 * s) > 10 * s ? white : dark));
    band(g, a1, f1, w, (q) => (q % (9 * s) < 2.4 * s ? white : dark), d);
    g.px(R(k1[0]), R(k1[1]), MQ[4]); g.px(R(a1[0]), R(a1[1]), white);
    g.px(R(f1[0]) + sd, R(f1[1]) + 1, dark); if (s > 0.7) g.px(R(f1[0]) + 2 * sd, R(f1[1]) + 1, dark);
  }
  // ---- face
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) {
    const [ex, ey] = P(sd * 17, 3), r = 15 * s, ry = 16.5 * s;
    eye(c, ex, ey, r, { ry, iris: EYE, pupil: "round", look, blink, lid: MQ[4], a });
    if (blink < 0.6) for (const [an, l] of [[-0.3, 4.5], [-0.72, 5], [-1.12, 4]]) {          // little lashes at the outer upper rim
      const bx = ex + sd * Math.cos(an) * (r + 0.5), by = ey + Math.sin(an) * (ry + 0.5), dx = sd * Math.cos(an - 0.35), dy = Math.sin(an - 0.35);
      g.line(R(bx), R(by), R(bx + dx * l * s), R(by + dy * l * s), "#07060E");
    }
  }
  { const [bx1, by1] = P(-29, 18), [bx2, by2] = P(29, 18); blush(c, bx1, by1, 6.5 * s, 3 * s, "#F27A9A", a); blush(c, bx2, by2, 6.5 * s, 3 * s, "#F27A9A", a); }
  const [mx, my] = P(0, 20);
  // palps (short, behind the needle), the smile, then the long proboscis: a slate needle with a silver edge
  for (const sd of [-1, 1]) { const q0 = P(sd * 3, 25), q1 = P(sd * 6, 34); blob(c, [tube([q0, q1], Math.max(1.1, 1.9 * s), Math.max(0.8, 1.3 * s))], { ramp: MQ, thick: 2, a, litOutline: MQ[4] }); }
  smile(c, mx, my, Math.max(2, 3.5 * s), { open: o.open ?? 0, a, col: "#07060E" });
  const pa = o.prob ?? 0.5, [p0x, p0y] = P(0, 24), L = 80 * s;
  const pd = pa + tilt, tipX = p0x + Math.sin(pd) * L, tipY = p0y + Math.cos(pd) * L, cx = p0x + Math.sin(pd * 0.7) * L * 0.5, cy = p0y + Math.cos(pd * 0.7) * L * 0.5;
  const pts = bez([p0x, p0y], [cx, cy], [tipX, tipY], 16);
  if (s >= 0.45) { const poly = tube(pts, Math.max(1.3, 2.3 * s), 0.6); g.poly(poly, MQ[5]); for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#07060E"); } }
  else for (let i = 1; i < pts.length; i++) g.line(R(pts[i - 1][0]), R(pts[i - 1][1]), R(pts[i][0]), R(pts[i][1]), MQ[5]);
  for (let i = 1; i < pts.length - 2; i++) g.px(R(pts[i][0]) - (s >= 0.45 ? 1 : 0), R(pts[i][1]), i < 11 ? "#C8C2EA" : MQ[7]);
  g.px(R(tipX), R(tipY), "#C8C2DE");
  // ---- antennae: thin, with short silver whorls
  const as = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const b0 = P(sd * 11, -31), b1 = P(sd * 17 + as * 0.4, -64), b2 = P(sd * 42 + as, -76), cur = bez(b0, b1, b2, 16);
    for (let i = 1; i < cur.length; i++) { g.line(R(cur[i - 1][0]), R(cur[i - 1][1]), R(cur[i][0]), R(cur[i][1]), MQ[1]); if (i < 6 && s > 0.75) g.line(R(cur[i - 1][0]) + 1, R(cur[i - 1][1]), R(cur[i][0]) + 1, R(cur[i][1]), MQ[2]); }
    for (let i = 2; i < cur.length; i += s > 0.75 ? 1 : 2) {
      const [px, py] = cur[i], [qx, qy] = cur[i - 1], tx = px - qx, ty = py - qy, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, hl = (2.2 + 1.6 * (1 - i / cur.length)) * s + 0.6;
      for (const k of [-1, 1]) g.line(R(px + nx * k), R(py + ny * k), R(px + nx * k * hl + (tx / tl) * 1.2), R(py + ny * k * hl + (ty / tl) * 1.2), "#9C96BC");
      g.px(R(px), R(py), MQ[5]);
    }
    g.px(R(b2[0]), R(b2[1]), "#B8B2D4");
  }
  return { tip: [tipX, tipY] };
}
