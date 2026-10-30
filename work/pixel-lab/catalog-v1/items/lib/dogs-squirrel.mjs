// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/kit/park-squirrel.mjs#drawSquirrel (+ state, RUST, CREAM, NUT, CAP, EYE);
// changes: the cute kit is imported from the items/lib copy, park-geo's cyc/phase are inlined, and the eye takes an aim
// (o.aimX, o.aimY = pupil offset, blended by the item from s.look and s.lookK). Nothing else changed.
import { blob, ell, tube, bez, capsule, eye, blush, fade } from "./cute.mjs";
export const cyc = (P, sec) => Math.max(1, Math.round(P / sec));
export const phase = (t, P, sec, off = 0) => { const n = cyc(P, sec), v = (t / P) * n + off; return v - Math.floor(v); };

export const RUST = ["#240F07", "#45200E", "#6A3215", "#90461D", "#B05C27", "#C97738", "#DC9450", "#EAB474"];
export const CREAM = ["#4A3020", "#7A5838", "#AC8660", "#D6B48A", "#EED6B0", "#FAEEDA", "#FFF8EC", "#FFFFFF"];
const NUT = ["#2A1608", "#4A2A10", "#6E4218", "#946024", "#B47E36", "#CC9C52", "#E0BA74", "#F0D6A0"];
const CAP = ["#2A1A0C", "#45301A", "#624628", "#7E5E38", "#9A784A", "#B4925E", "#CCAE7A", "#E2CA9C"];
const EYE = ["#05030A", "#120A10", "#22140E", "#3E2614", "#5E3C1E", "#7E5630"];
const TAU = Math.PI * 2;
const sm1 = (x) => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };

/** Squirrel state at time t (all continuous, loop-periodic when o.period is given). */
function state(t, o) {
  const P = o.period ?? 0, per = (sec, off = 0) => (P ? phase(t, P, sec, off) : ((t / sec + off) % 1 + 1) % 1);
  const alert = Math.max(0, Math.min(1, o.alert ?? 0));
  // nibbling comes in bouts: ~70% of a 4.3 s cycle, eased in and out
  const bout = per(4.3, 0.2), boutK = sm1(bout / 0.12) * (1 - sm1((bout - 0.62) / 0.12)), nibK = (o.nibble ?? 1) * boutK * (1 - alert);
  const nib = Math.sin(TAU * per(0.3)) * nibK;                         // chewing bob (−1..1)
  // tail: a slow breathing curl plus a quick flick every ~2.9 s
  const fl = per(2.9, 0.55), flick = fl < 0.22 ? Math.sin((fl / 0.22) * Math.PI) : 0, sway = Math.sin(TAU * per(1.45)) * 0.35;
  const bp = per(3.7, 0.3), blink = bp < 0.055 ? Math.sin((bp / 0.055) * Math.PI) : 0;
  return { nib, nibK, flick: flick * (1 - alert * 0.7), sway: sway * (1 - alert), blink, alert };
}

export function drawSquirrel(c, G, x, y, t = 0, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return;
  const z = G.z, f = o.facing === -1 ? -1 : 1, X0 = G.X(x), Y0 = G.Y(y), st = state(t, o), g = fade(c, a), R = Math.round;
  const P = (u, v) => [X0 + u * f * z, Y0 + v * z];
  const PL = (pts) => pts.map(([u, v]) => P(u, v));
  const thick = Math.max(2, 6.5 * z), outline = "#140806";
  const head = [3.4 + st.alert * 0.5, -21.2 - st.alert * 1.5 + st.nib * 0.4];
  // ---- tail (behind everything): a big bushy S-curve from the rump, the tip curling forward over the head
  const fk = st.flick, sw = st.sway;
  const tail = [[-5, -2.5], [-12.5, -6], [-16 - sw * 0.4, -14.5], [-15.6 - sw, -24.5 - fk * 1.5], [-11 - sw * 0.6 + fk * 1.2, -32.5 - fk * 2.5], [-4.8 + fk * 2.4, -35 - fk * 2], [-1.2 + fk * 3.5, -31.5 - fk * 3.2]];
  const spine = [];
  for (let i = 0; i < tail.length - 1; i++) for (let k = 0; k < 4; k++) { const q = k / 4, A = tail[i], B = tail[i + 1]; spine.push([A[0] + (B[0] - A[0]) * q, A[1] + (B[1] - A[1]) * q]); }
  spine.push(tail[tail.length - 1]);
  const rad = (k) => 3.4 + Math.sin(Math.min(1, k * 1.2) * Math.PI) * 5.2 - k * 1.4;
  const tPolys = [];
  // scalloped circles along the spine: their union gives the tail a tufted, fluffy outline
  for (let i = 0; i < spine.length - 1; i++) {
    const k = i / (spine.length - 2), r = rad(k), pts = [];
    for (let m = 0; m < 20; m++) { const an = (m / 20) * TAU, rr = r * (1 + 0.13 * Math.sin(an * 6 + i * 1.7)); pts.push([spine[i][0] + Math.cos(an) * rr * 1.04, spine[i][1] + Math.sin(an) * rr]); }
    tPolys.push(PL(pts));
  }
  blob(g, tPolys, { ramp: RUST, base: 3.3, gain: 2.9, slope: 0.6, thick: thick * 1.3, outline, litOutline: z >= 1.5 ? RUST[2] : null });
  // fur: short lighter strokes along the lit (upper / outer) edge and a darker one along the inner edge
  if (z >= 1.4) for (let i = 2; i < spine.length - 2; i++) {
    const [u, v] = spine[i], [u2, v2] = spine[i + 1], nx = -(v2 - v), ny = u2 - u, nl = Math.hypot(nx, ny) || 1, r = rad(i / (spine.length - 2));
    for (const sg of [-1, 1]) {
      const ex = (nx / nl) * sg, ey = (ny / nl) * sg, lit = ex * -0.6 * f + ey * -0.8 > -0.1;
      const [p0x, p0y] = P(u + ex * (r - 2.2), v + ey * (r - 2.2)), [p1x, p1y] = P(u + ex * (r - 0.7), v + ey * (r - 0.7));
      if ((i & 1) === 0) g.line(R(p0x), R(p0y), R(p1x), R(p1y), lit ? RUST[6] : RUST[2]);
    }
  }
  // ---- body: big round haunch + short pear torso, cream chest
  const torso = PL(ell(-0.4, -10.5, 6.4, 7.6, -0.1 * f, 22)), haunch = PL(ell(-2.6, -4.6, 7.8, 5.2, 0, 22)), neck = PL(ell(1.8, -15.6, 4.6, 4, 0, 16));
  blob(g, [torso, haunch, neck], { ramp: RUST, base: 3.4, gain: 2.3, slope: 0.9, thick, outline });
  blob(g, [PL(ell(2.9, -10.4, 2.9, 5.6, 0.12 * f, 18))], { ramp: CREAM, base: 4.4, gain: 1.4, slope: 0.6, thick: thick * 0.6, outline: null, rimLit: 0.3, rimShade: 0.7 });
  if (z >= 1.4) { const [hx_, hy_] = P(-3.6, -6.2); g.line(R(hx_), R(hy_), R(hx_ + 3 * f * z), R(hy_ + 2 * z), RUST[2]); }   // thigh crease
  blob(g, [PL(ell(3.6, -1.2, 4.6, 1.7, 0, 14))], { ramp: RUST, base: 3.8, gain: 1.4, thick: thick * 0.5, outline });
  // ---- head: big round skull (chibi), snout, ear with a tuft
  const [hx, hy] = head;
  const skull = PL(ell(hx, hy, 6.8, 6.1, 0, 24)), snout = PL(ell(hx + 5, hy + 1.6, 3.4, 2.8, 0.15 * f, 16)), cheek = PL(ell(hx + 1.8, hy + 3, 4, 2.6, 0, 14));
  const earUp = st.alert * 1.2;
  const ear = PL([[hx - 3.2, hy - 4], [hx - 2.8, hy - 9.6 - earUp], [hx - 1.4, hy - 11 - earUp], [hx + 0.8, hy - 4.6]]);
  blob(g, [ear], { ramp: RUST, base: 3.6, gain: 1.4, thick: thick * 0.4, outline });
  if (z >= 1.2) { const inner = PL([[hx - 2.4, hy - 4.6], [hx - 2.1, hy - 8.4 - earUp], [hx - 1.3, hy - 9 - earUp], [hx - 0.2, hy - 4.8]]); blob(g, [inner], { ramp: CREAM, base: 2.6, gain: 0.8, thick: thick * 0.2, outline: null, rimLit: 0, rimShade: 0 }); }
  blob(g, [skull, snout, cheek], { ramp: RUST, base: 3.6, gain: 2.3, slope: 0.7, thick: thick * 0.9, outline });
  blob(g, [PL(ell(hx + 2.8, hy + 3.1, 3.2, 1.9, 0, 12))], { ramp: CREAM, base: 4.6, gain: 1, thick: thick * 0.4, outline: null, rimLit: 0.3, rimShade: 0.3 });
  if (z >= 1.2) { const [tx, ty] = P(hx - 2.2, hy - 11.6 - earUp); for (let k = 0; k < 3; k++) g.px(R(tx + (k - 1) * Math.max(1, z * 0.5) * f), R(ty - (k === 1 ? 1 : 0) * Math.max(1, z * 0.6)), RUST[1]); }
  // eye (big glossy, two highlights), nose, blush
  const [ex, ey] = P(hx + 2.1, hy - 0.5), er = 2.5 * z;
  if (er >= 2.4) eye(g, ex, ey, er, { ry: er * 1.15, iris: EYE, pupil: "bead", blink: st.blink, lid: RUST[3], look: [0.5 * f + (o.aimX ?? 0), -0.1 - st.alert * 0.3 + (o.aimY ?? 0)] });
  else { g.px(R(ex), R(ey), "#05030A"); g.px(R(ex), R(ey) + 1, "#05030A"); if (er > 1.2) { g.px(R(ex) + f, R(ey), "#05030A"); g.px(R(ex) + f, R(ey) + 1, "#22140E"); } if (z >= 0.7 && st.blink < 0.5) g.px(R(ex), R(ey), "#FFFFFF"); }
  const [nx, ny] = P(hx + 8.2, hy + 0.9);
  if (z >= 1.4) { const r = Math.max(1, 0.9 * z); for (let Y = Math.floor(ny - r); Y <= Math.ceil(ny + r * 0.6); Y++) for (let X = Math.floor(nx - r); X <= Math.ceil(nx + r); X++) if (((X + 0.5 - nx) / r) ** 2 + ((Y + 0.5 - ny) / (r * 0.8)) ** 2 <= 1) g.px(X, Y, Y < ny - r * 0.2 ? "#7A4650" : "#2A1418"); }
  else g.px(R(nx), R(ny), "#2A1418");
  if (z >= 1.5) { const [bx, bY] = P(hx + 1.2, hy + 2.6); blush(g, bx, bY, 1.4 * z, 0.75 * z); }
  // ---- the acorn held up to the mouth (bobs with the chewing), paws around it
  const nutU = hx + 5.2, nutV = hy + 6.6 - st.nib * 0.55 - st.nibK * 0.8 + st.alert * 2.6, nk = Math.max(0, Math.min(1, o.nut ?? 1));
  const arm = (side) => { const sh = [1 + side * 1.6, -13.4], pw = [nutU - 2.4 + side * 4.6, nutV + 1.6], mid = [(sh[0] + pw[0]) / 2 + 0.4, (sh[1] + pw[1]) / 2 + 1.6]; blob(g, [PL(capsule(sh, mid, 1.6)), PL(capsule(mid, pw, 1.4))], { ramp: RUST, base: 3.6 + side * 0.5, gain: 1.4, thick: thick * 0.4, outline }); return pw; };
  const pw0 = arm(0), pw1 = arm(1);
  if (nk > 0.02) {
    const ng = fade(g, nk);
    blob(ng, [PL(ell(nutU, nutV + 1, 2.6, 3.1, 0, 16))], { ramp: NUT, base: 4.2, gain: 2.4, thick: thick * 0.45, outline: "#1A0C04" });
    blob(ng, [PL(ell(nutU, nutV - 1.6, 3.1, 1.6, 0, 16))], { ramp: CAP, base: 2.6, gain: 1.6, thick: thick * 0.3, outline: "#1A0C04" });
    if (z >= 1.8) for (let k = -2; k <= 2; k++) { const [cx_, cy_] = P(nutU + k * 1.05 - 0.4, nutV - 1.5 + (k & 1) * 0.6); ng.px(R(cx_), R(cy_), CAP[5]); }
    const [sx, sy] = P(nutU + 0.3, nutV - 3.4); ng.px(R(sx), R(sy), "#2A1A0C"); if (z >= 2) ng.px(R(sx + f), R(sy) - 1, "#2A1A0C");
  }
  // finger tips over the nut's sides
  for (const pw of [pw0, pw1]) blob(g, [PL(ell(pw[0], pw[1] - 0.3, 1.3, 1.1, 0, 10))], { ramp: RUST, base: 4.4, gain: 1, thick: thick * 0.3, outline });
  void bez; void tube; void cyc;
}
