// steve-real film2 · elephant (new, 2026-10-28, drawn for this film): an adult African bush elephant in side view at real
// size (≈ 3.0 m at the shoulder, ≈ 6 t) — domed head, big Africa-shaped ear, curved tusks, a wrinkled trunk, thick pillar
// legs with pale toenails, a tufted tail; warm-grey skin lit from the upper left with wrinkle bands. Walks (four-beat gait
// from the film's phase), flaps the ear, swings the trunk; trumpet lifts the trunk. Not a real animal photo or game art.
import { Spr } from "../lib/rig.mjs";
const TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const SK = ["#3E3640", "#544A52", "#6C6268", "#877C80", "#A2969A", "#BCB0AE"], SKD = ["#342C36", "#463C46", "#5A5058", "#706670", "#8A8088"];
const IV = ["#8A7A5E", "#B8A882", "#DCCCA6", "#F2E6C8"], NAIL = ["#7A6E62", "#A89C8C", "#C8BCAA"];
const wrink = (amp, f) => (x, y) => (Math.abs(Math.sin(y * f + Math.sin(x * 0.7) * 1.2)) < 0.18 ? -amp : 0);

/** draw at feet-centre (fx, fy) with s px per metre; p = { dir, gait, walk, ear, trunk, trumpet, a } */
export function drawElephant(c, fx, fy, s, t, p = {}) {
  const d = p.dir ?? 1, S = (x, y) => [fx + x * s * d, fy - y * s], ph = TAU * (p.gait ?? 0), wk = clamp01(p.walk ?? 0);
  const sp = new Spr(fx - 3.6 * s, fy - 4.2 * s, 7.2 * s, 4.4 * s), r = (m) => Math.max(1, m * s);
  const bob = 0.04 * wk * Math.abs(Math.sin(ph * 2)), B = (x, y) => S(x, y + bob);
  // legs: far pair first (darker), four-beat walk
  const leg = (x0, phase, far, g) => { const a = Math.sin(ph + phase) * 0.28 * wk, lift = Math.max(0, Math.sin(ph + phase + 1.2)) * 0.12 * wk;
    const top = B(x0, 1.75), knee = S(x0 + Math.sin(a) * 0.85, 0.95 + lift * 0.5), foot = S(x0 + Math.sin(a) * 1.55, 0.12 + lift);
    const R0 = far ? SKD : SK; sp.cap(...top, ...knee, r(0.36), r(0.3), R0, g, { tex: wrink(0.12, 0.9), bias: far ? -0.05 : 0 }); sp.cap(...knee, ...foot, r(0.3), r(0.29), R0, g, { tex: wrink(0.14, 1.1), bias: far ? -0.05 : 0 });
    sp.ell(foot[0], foot[1] + r(0.06), r(0.33), r(0.12), R0, g + 1);
    if (!far) for (let q = -1; q <= 1; q++) sp.ell(foot[0] + d * r(0.12) + q * r(0.11), foot[1] + r(0.1), r(0.05), r(0.035), NAIL, g + 2); };
  leg(0.75, Math.PI, true, 16); leg(-1.25, 0, true, 16);
  // tail
  { const tb = B(-2.0, 2.35), tt = S(-2.25 + 0.05 * Math.sin(t * 2.3), 1.25); sp.cap(...tb, ...tt, r(0.06), r(0.04), SK, 24); sp.ell(tt[0], tt[1] + r(0.08), r(0.06), r(0.13), ["#1A161C", "#2A242C", "#3A323A"], 25); }
  // body: barrel + rump + shoulder hump (one group), belly line
  const bodyTex = (x, y, u, w) => (Math.abs(Math.sin(u * 9 + w * 2)) < 0.07 ? -0.12 : 0) + (w > 0.6 ? -0.1 : 0);
  sp.ell(...B(-0.25, 2.05), r(1.85), r(1.0), SK, 32, { tex: bodyTex });
  sp.ell(...B(-1.25, 2.1), r(0.95), r(0.95), SK, 32, { tex: bodyTex });
  sp.ell(...B(0.75, 2.25), r(1.0), r(0.9), SK, 32, { tex: bodyTex });
  leg(0.45, 0, false, 48); leg(-1.0, Math.PI, false, 48);
  // head, trunk, tusks, ear (near side)
  const hx = 1.75, hy = 2.55 + bob, tr = clamp01(p.trumpet ?? 0), sway = 0.12 * Math.sin(t * 1.7) * (1 - tr) + (p.trunk ?? 0);
  sp.ell(...S(hx, hy), r(0.62), r(0.72), SK, 64, { tex: bodyTex });
  sp.ell(...S(hx + 0.2, hy + 0.55), r(0.42), r(0.3), SK, 64);
  // trunk: a chain hanging down (or curled up when trumpeting)
  { let px = hx + 0.45, py = hy - 0.3, a = -Math.PI / 2 + 0.25 + sway * 0.4; const n = 9; let pr = S(px, py);
    for (let i = 0; i < n; i++) { const u = i / (n - 1), seg = 0.27; a += lerp(0.02 + sway * 0.1, -0.42, tr) + (i > 6 ? lerp(0.12, -0.5, tr) : 0); px += Math.cos(a) * seg; py += Math.sin(a) * seg * (1 - tr * 0) + tr * 0.32;
      const q = S(px, py); sp.cap(...pr, ...q, r(lerp(0.22, 0.09, u)), r(lerp(0.21, 0.08, u)), SK, 80, { tex: (x, y) => (Math.floor((y + x * 0.3) / Math.max(1, s * 0.07)) % 2 ? -0.06 : 0) }); pr = q; }
    if (tr > 0.3) sp.ell(pr[0], pr[1], r(0.1), r(0.1), ["#4A3236", "#6A4648"], 81); }
  for (const [ox, gg] of [[0, 112]]) { const a0 = S(hx + 0.32 + ox, hy - 0.45), a1 = S(hx + 0.62, hy - 0.85), a2 = S(hx + 0.98, hy - 0.95); sp.cap(...a0, ...a1, r(0.075), r(0.065), IV, gg); sp.cap(...a1, ...a2, r(0.065), r(0.035), IV, gg); }
  // ear: Africa-shaped flap over the shoulder, flaps slowly
  { const f = 0.08 * Math.sin(t * 1.3 + (p.seed ?? 0)) + (p.ear ?? 0) * 0.25, E = (x, y) => S(hx - 0.35 - (x) * (1 - f * 0.5) , hy + y);
    const pts = [E(0, 0.62), E(0.35, 0.75), E(0.85, 0.62), E(1.12, 0.25), E(1.05, -0.25), E(0.85, -0.7), E(0.6, -1.05), E(0.42, -1.25), E(0.3, -0.85), E(0.05, -0.4), E(-0.05, 0.1)];
    sp.poly(pts, ["#4A4048", "#5E545C", "#776C72", "#90848A", "#A89C9E"], 96, { side: 0.8, vfall: 0.5, bias: -0.02 });
    const vein = (u) => E(0.55 + 0.25 * Math.sin(u * 3), 0.4 - u * 1.3); for (let q = 0; q < 12; q++) { const [x, y] = vein(q / 12); sp.px(x, y, "#5A5058"); } }
  // eye with a wrinkle above
  { const [ex, ey] = S(hx + 0.22, hy + 0.12), er = Math.max(1, Math.round(0.05 * s)); for (let j = -er; j <= er; j++) for (let i = -er; i <= er; i++) if (i * i + j * j <= er * er) sp.px(ex + i, ey + j, "#1A1418"); if (s > 25) sp.px(ex - d, ey - 1, "#E8E0D8"); for (let i = -er - 1; i <= er + 1; i++) sp.px(ex + i, ey - er - 2, "#4A4048"); }
  sp.blit(c, p.a ?? 1);
  return { box: { x0: fx - 2.6 * s, y0: fy - 3.6 * s, x1: fx + 2.6 * s, y1: fy }, back: S(-0.3, 3.05), trunkTip: S(hx + 1.0, 0.4) };
}
export default {
  kind: "elephant", covers: ["elephant", "african elephant", "heavy animal"], source: "steve-real/film2 (new)",
  desc: "an adult African bush elephant at real size (3 m at the shoulder) in side view; walks, flaps the ear, swings or raises the trunk",
  hw: 140, hh: 90, start: "stands, ear flaps, trunk sways",
  states: { idle: [0.4, "stands, ear flaps, trunk sways"], walk: [0.5, "four-beat walk", "thud"], trumpet: [0.6, "raises the trunk and trumpets", "trumpet"] },
  base: { walk: 0, trumpet: 0, ear: 0 }, st: { idle: { walk: 0, trumpet: 0 }, walk: { walk: 1, trumpet: 0 }, trumpet: { trumpet: 1, ear: 1, walk: 0 } }, linear: [],
  notes: "50 px per metre at z 1 (3 m shoulder = 150 px). s.dir ±1, s.gait cycles.",
  draw(c, cx, cy, z, t, s) { return drawElephant(c, cx, cy + this.hh * z, 50 * z, t, { ...s.v, dir: s.dir ?? 1, gait: s.gait ?? s.integ?.((q) => 0.6 * q.walk) ?? 0, a: s.a }); },
};
