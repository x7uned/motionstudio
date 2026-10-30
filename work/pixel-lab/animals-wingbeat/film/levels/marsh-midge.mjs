// LV10 · the series' midge (a non-biting chironomid look): a chibi front-facing midge — round sage head with big glossy
// amber eyes and two highlights, pink blush and a tiny smile, two small feathery (plumed) antennae, a fuzzy humped
// thorax, a slim banded abdomen with fine hairs, long thin dangling legs. Wings: a high-speed blur fan (wingFan from the
// mosquito art, denser and more even because at ~1000 beats/s the wing is a smear) with one very faint ghost.
// drawMidge(c, x, y, o): (x, y) = head centre (screen). The fuzzy volume-shaded body is cached per (scale, tilt).
import { blob, ell, tube, bez, eye, blush, smile, RAMP, fade, bayer, mix } from "../cute.mjs";
import { spriteCache } from "./meadow-kit.mjs";
import { wingFan } from "./porch-mosquito.mjs";

const R = Math.round;
export const MG = ["#0A1008", "#16200E", "#243216", "#344620", "#465C2C", "#5C763A", "#7A9450", "#A4B87A"];
const BELLY = ["#1A1C0C", "#2E3416", "#46501E", "#60702A", "#7E8E3A", "#9EAC56", "#BECA7E", "#DDE4AC"];
const SPR = spriteCache(24);

function fuzzy(cx, cy, rx, ry, n, amp, ph = 0) { const out = []; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI, k = 1 + amp * (i % 2 ? 1 : -0.5) * (0.7 + 0.3 * Math.sin(i * 1.9 + ph)); out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); } return out; }

function body(s, tilt) {
  const key = `mg:${s.toFixed(2)}:${tilt.toFixed(2)}`, W = R(90 * s) + 12, H = R(150 * s) + 12, ox = R(W / 2), oy = R(38 * s) + 6;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const cs = Math.cos(tilt), sn = Math.sin(tilt);
    const P = (u, v) => [x + (u * cs - (v - 34) * sn) * s, y + (34 + u * sn + (v - 34) * cs) * s], T = (pts) => pts.map(([u, v]) => P(u, v));
    const inv = (X, Y) => { const dx = (X - x) / s, dy = (Y - y) / s - 34; return [dx * cs + dy * sn, -dx * sn + dy * cs + 34]; };
    // abdomen: long and slim, curving a little, with darker segment bands and fine hairs
    const A = (k) => ({ u: 3 * Math.sin(k * 2.6), v: 48 + k * 56, r: 8.5 * (1 - k) ** 0.6 + 2.2 });
    const L = [], Rr = []; for (let i = 0; i <= 14; i++) { const a = A(i / 14); L.push([a.u - a.r, a.v]); Rr.push([a.u + a.r, a.v]); }
    const tip = A(1); blob(g, [T([...L, [tip.u, tip.v + 3], ...Rr.reverse()])], { ramp: BELLY, base: 3.2, gain: 2.3, thick: 7 * s, outline: "#0E120A", litOutline: BELLY[3] });
    for (let Y = R(y + 40 * s); Y <= R(y + 116 * s); Y++) for (let X = R(x - 16 * s); X <= R(x + 18 * s); X++) {
      const [u, v] = inv(X + 0.5, Y + 0.5), k = (v - 48) / 56; if (k < 0.12 || k > 0.95) continue;
      const a = A(k), q = (k * 7) % 1; if (q > 0.16 || Math.abs(u - a.u) > a.r - 1 / s) continue;
      g.px(X, Y, (u - a.u) < 0 ? BELLY[3] : BELLY[2]);
    }
    for (let i = 0; i < 10; i++) { const k = 0.15 + i * 0.08, a = A(k); for (const sd of [-1, 1]) { const [hx, hy] = P(a.u + sd * (a.r + 0.5), a.v), [ex, ey] = P(a.u + sd * (a.r + 3.2), a.v + 1.5); g.line(R(hx), R(hy), R(ex), R(ey), BELLY[5]); } }
    // fuzzy thorax (hump), then the round head
    blob(g, [T(fuzzy(0, 40, 19, 15, 52, 0.14, 1))], { ramp: MG, base: 3.6, gain: 2.0, thick: 9 * s, litOutline: MG[4] });
    for (let i = 0; i < 26; i++) { const an = Math.PI * (0.05 + 0.9 * (i / 25)) + Math.PI, r0 = [Math.cos(an) * 18, 40 + Math.sin(an) * 14], r1 = [Math.cos(an) * 23, 40 + Math.sin(an) * 18]; if (an > 3.3 && an < 6.1) { const [ax, ay] = P(...r0), [bx, by] = P(...r1); g.line(R(ax), R(ay), R(bx), R(by), i % 2 ? MG[6] : MG[5]); } }
    blob(g, [T(fuzzy(0, 0, 32, 29, 76, 0.03, 2))], { ramp: MG, base: 3.9, gain: 2.2, thick: 18 * s, litOutline: MG[5] });
    for (let i = 0; i < 30; i++) { const an = Math.PI * (1.08 + 0.84 * (i / 29)), [ax, ay] = P(Math.cos(an) * 31, Math.sin(an) * 28), [bx, by] = P(Math.cos(an) * 34.5, Math.sin(an) * 31.5 - 0.6); g.line(R(ax), R(ay), R(bx), R(by), i % 3 ? MG[6] : MG[7]); }
    // soft light belly of the face (muzzle area) for readable expressions
    for (let Y = R(y + 4 * s); Y <= R(y + 26 * s); Y++) for (let X = R(x - 18 * s); X <= R(x + 18 * s); X++) {
      const [u, v] = inv(X + 0.5, Y + 0.5), d = (u / 15) ** 2 + ((v - 16) / 9) ** 2; if (d > 1) continue;
      if (0.9 - d * 0.7 > bayer(X, Y)) g.px(X, Y, d < 0.5 ? MG[6] : MG[5]);
    }
  });
}

/**
 * Midge facing the camera. o: s, tilt, look [dx, dy], blink, wing (elevation e −1..1), amt, a (dissolve), clip (canvas
 * proxy to draw through, e.g. a lens), antSway, legSway, open 0..1.
 */
export function drawMidge(c, x, y, o = {}) {
  const s = Math.round((o.s ?? 1) * 50) / 50, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; if (a <= 0) return;
  x = R(x); y = R(y);
  const cs = Math.cos(tilt), sn = Math.sin(tilt), P = (u, v) => [x + (u * cs - (v - 34) * sn) * s, y + (34 + u * sn + (v - 34) * cs) * s];
  const g = fade(c, a);
  for (const sd of [-1, 1]) { const [rx, ry] = P(sd * 15, 34); wingFan(c, rx, ry, sd, { len: 86 * s, A0: -0.98, A1: 0.22, e: o.wing ?? 0, a: a * (o.amt ?? 1), tilt, width: 15 * s, ghost: 0.16, dens: 1.25, sheet: ["#FFFDF0", "#D8D0EE"], fringe: "#7A6E9A" }); }
  // legs (behind the body): long and thin, pale olive with dark knees and tiny feet
  const sway = o.legSway ?? 0, LEGS = [[6, 48, 22, 56, 26, 94, 20, 124], [10, 50, 36, 54, 46, 100, 50, 138], [8, 54, 28, 70, 40, 112, 56, 146]];
  for (const sd of [-1, 1]) for (let i = 2; i >= 0; i--) {
    const [ru, rv, ku, kv, au, av, fu, fv] = LEGS[i], pts = [P(sd * ru, rv), P(sd * ku + sway * 0.25, kv), P(sd * au + sway * 0.6, av), P(sd * fu + sway, fv)];
    for (let j = 1; j < pts.length; j++) { g.line(R(pts[j - 1][0]), R(pts[j - 1][1]), R(pts[j][0]), R(pts[j][1]), j === 1 ? MG[3] : "#5A6A3A"); if (s > 0.8) g.line(R(pts[j - 1][0]) + 1, R(pts[j - 1][1]), R(pts[j][0]) + 1, R(pts[j][1]), j === 1 ? MG[2] : "#8A9A5E"); }
    g.px(R(pts[1][0]), R(pts[1][1]), MG[1]); g.px(R(pts[2][0]), R(pts[2][1]), MG[1]); g.px(R(pts[3][0]) + sd, R(pts[3][1]), MG[1]);
  }
  body(s, tilt).blit(c, x, y, { a });
  // feathery antennae: short shafts with long fine plumes
  const as = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const b0 = P(sd * 10, -26), b1 = P(sd * 15 + as * 0.3, -46), b2 = P(sd * 28 + as, -56), cur = bez(b0, b1, b2, 12);
    for (let i = 1; i < cur.length; i++) g.line(R(cur[i - 1][0]), R(cur[i - 1][1]), R(cur[i][0]), R(cur[i][1]), MG[2]);
    for (let i = 2; i < cur.length; i++) {
      const [px, py] = cur[i], [qx, qy] = cur[i - 1], tx = px - qx, ty = py - qy, tl = Math.hypot(tx, ty) || 1, nx = -ty / tl, ny = tx / tl, hl = (6.5 - Math.abs(i - 7) * 0.55) * s;
      for (const k of [-1, 1]) { g.line(R(px), R(py), R(px + nx * k * hl + (tx / tl) * 2.5 * s), R(py + ny * k * hl + (ty / tl) * 2.5 * s), i % 2 ? "#E4E8C0" : "#B8C48E"); }
    }
    g.px(R(b2[0]), R(b2[1]), "#F4F4D8");
  }
  // face
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = P(sd * 14, 2); eye(c, ex, ey, 13 * s, { ry: 14.5 * s, iris: RAMP.amber, pupil: "round", look, blink, lid: MG[4], a }); }
  { const [bx1, by1] = P(-23, 17), [bx2, by2] = P(23, 17); blush(c, bx1, by1, 5.5 * s, 2.5 * s, "#F27A9A", a); blush(c, bx2, by2, 5 * s, 2.5 * s, "#F27A9A", a); }
  const [mx, my] = P(0, 19); smile(c, mx, my, Math.max(2, 3 * s), { open: o.open ?? 0.25, a });
}
