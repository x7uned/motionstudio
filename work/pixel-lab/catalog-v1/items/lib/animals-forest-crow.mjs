// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/forest.mjs#drawCrow. Changes: imports point to catalog libs;
// everything is computed in the film's own pixel units around the feet (0,0) and mapped by T with a scale s (the film drew at 1:1),
// blob thickness / radii / decoration loops scale with s; the wing, neck, folded-wing and glare parts that the film switched on at a
// threshold are alpha-ramped; the air/tail-fan option is not exposed (perched crow); beak gap opens continuously (open).
import { blob, ell, tube, eye, blush, smooth, RAMP, fade, lerp, sm, mix } from "./cute.mjs";
import { xform } from "./speed-falcon-kit.mjs";

const R = Math.round;
const CROW = ["#040308", "#08071A", "#0E0C22", "#161430", "#201E44", "#2C2C5E", "#3E4488", "#5E66B8"];
const SHEEN = "#8A92E4", BEAK = ["#0C0A12", "#1C1A26", "#2C2A3A", "#3E3C50", "#545268", "#6E6C84", "#8C8AA2", "#ACAAC0"];
const EYE = ["#05040A", "#100E1C", "#1C1A30", "#4A4A90", "#7070C0"];

/** o: s scale, t, head [x,y] offset (scale-1 px), tilt rad, wing 0..1, glare 0..1, open 0..1, look, blink */
export function drawCrow(c, fx, fy, o) {
  const S = o.s, t = o.t, br = Math.sin(t * 2 * Math.PI * 0.6) * 1.2, hd = o.head ?? [0, 0], tilt = o.tilt ?? 0, wing = o.wing ?? 0, flap = o.flap ?? 0;
  const T = (x, y) => [fx + x * S, fy + y * S], TP = (pts) => pts.map(([x, y]) => T(x, y));
  const E = (x, y, rx, ry, rot = 0) => ell(fx + x * S, fy + y * S, rx * S, ry * S, rot);
  const lean = Math.max(-0.32, Math.min(0.32, hd[0] / 260));
  const bx = Math.sin(lean) * 66 + hd[0] * 0.08, by = -66 * Math.cos(lean) + br * 0.5 + Math.max(0, hd[1]) * 0.12, hx = hd[0], hy = -152 + hd[1] + br;
  const ob = (a) => ({ ramp: CROW, litOutline: SHEEN, a });
  // wings (behind the body when spread)
  const wingPoly = (s) => {
    const sh = [bx + s * 34, by - 34], open = wing * (1.35 + 0.5 * Math.sin(flap)), pts = [[0, 0], [14, 4], [24, 24], [30, 50], [32, 74], [28, 88], [22, 80], [18, 94], [11, 84], [5, 96], [-1, 85], [-7, 92], [-10, 76], [-12, 50], [-10, 24], [-6, 6]].map(([px, py]) => [px * s, py]);
    return TP(xform(pts.map(([px, py]) => [sh[0] + px, sh[1] + py]), sh[0], sh[1], -s * open));
  };
  const wa = Math.min(1, wing * 6);
  if (wa > 0.02) for (const s of [-1, 1]) {
    blob(c, [wingPoly(s)], { ramp: CROW, thick: 12 * S, base: 3.0, gain: 2.2, litOutline: SHEEN, a: wa });
    const sh = [bx + s * 34, by - 34], an = -s * wing * (1.35 + 0.5 * Math.sin(flap)), g = fade(c, wa);
    for (const k of [0.45, 0.62]) { const a2 = xform([[s * -8, 60 * k + 6], [s * 26, 60 * k]], 0, 0, an).map(([u, v]) => T(sh[0] + u, sh[1] + v)); g.line(R(a2[0][0]), R(a2[0][1]), R(a2[1][0]), R(a2[1][1]), "#3E4488"); }
  }
  // body egg + chest scallops
  blob(c, [E(bx, by, 58, 64)], { ramp: CROW, thick: 28 * S, base: 2.6, gain: 2.6, litOutline: SHEEN });
  for (let row = 0; row < 4; row++) for (let i = -2; i <= 2; i++) {
    const sx = i * 14 + (row % 2) * 7, sy = -12 + row * 13; if (Math.abs(sx) > 40 - row * 4) continue;
    for (let a = 0.3; a < 2.85; a += 0.25 / Math.max(1, S)) { const p = T(bx + sx + Math.cos(a) * 6, by + sy + Math.sin(a) * 3); c.px(R(p[0]), R(p[1]), "#30306A"); }
  }
  // folded wings at the sides
  const fa = 1 - wing;
  if (fa > 0.02) for (const s of [-1, 1]) {
    const fw = TP(xform(smooth([[bx + s * 28, by - 42], [bx + s * 52, by - 30], [bx + s * 64, by + 2], [bx + s * 64, by + 36], [bx + s * 54, by + 62], [bx + s * 46, by + 56], [bx + s * 40, by + 68], [bx + s * 33, by + 56], [bx + s * 26, by + 64], [bx + s * 24, by + 20]], new Set([4, 5, 6, 7, 8]), 4), bx + s * 30, by - 40, -s * wing * 1.2));
    blob(c, [fw], { ramp: CROW, thick: 14 * S, base: 3.1, gain: 2.0, litOutline: SHEEN, a: fa });
    for (let i = 0; i < 3; i++) { const yy = by + 6 + i * 14, a = T(bx + s * (34 + i * 2), yy), b = T(bx + s * (58 - i * 3), yy + 8); fade(c, fa).line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#2C2C5E"); }
  }
  // feet gripping the perch
  for (const s of [-1, 1]) {
    const [x, y] = T(bx + s * 16, -4); c.rect(R(x - 2 * S), R(y - 10 * S), Math.max(2, R(4 * S)), Math.max(2, R(10 * S)), "#2C2A3A");
    for (const dx of [-6, -1, 4]) { c.line(R(x), R(y), R(x + dx * S), R(y + 4 * S), "#1C1A26"); c.px(R(x + dx * S), R(y + 5 * S), "#3E3C50"); }
  }
  // neck when the head dips away from the body (alpha-ramped by the dip)
  const dl = Math.hypot(hd[0], hd[1]), na = sm(dl, 6, 14);
  if (na > 0.01) { const nx0 = bx, ny0 = by - 44, mx = lerp(nx0, hx, 0.5), my = lerp(ny0, hy + 12, 0.5), len = Math.hypot(hx - nx0, hy + 12 - ny0); blob(c, [E(mx, my, 30, len / 2 + 14, Math.atan2(hy + 12 - ny0, hx - nx0) - Math.PI / 2)], { ramp: CROW, thick: 18 * S, base: 2.6, gain: 2.4, litOutline: SHEEN, a: na }); }
  // head (round, glossy), feather tuft, eye rings
  const P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); return T(hx + dx * cs - dy * sn, hy + dx * sn + dy * cs); };
  const H = (pts) => pts.map(([dx, dy]) => P(dx, dy));
  for (const [dx, h, ln] of [[-6, 9, -4], [1, 13, 1], [8, 9, 5]]) blob(c, [tube([P(dx, -40), P(dx + ln * 0.4, -40 - h * 0.6), P(dx + ln, -40 - h)], 3.2 * S, 1.4 * S)], { ramp: CROW, thick: 2 * S, base: 3.4, litOutline: SHEEN });
  blob(c, [H(ell(0, 0, 47, 44))], { ramp: CROW, thick: 24 * S, base: 2.7, gain: 2.5, litOutline: SHEEN });
  for (let a = -2.5; a < -0.9; a += 0.06 / Math.max(1, S)) { const [sx, sy] = P(Math.cos(a) * 36, Math.sin(a) * 33); c.px(R(sx), R(sy), "#5A62A8"); }
  for (let a = -2.3; a < -1.7; a += 0.08 / Math.max(1, S)) { const [sx, sy] = P(Math.cos(a) * 31, Math.sin(a) * 28); c.px(R(sx), R(sy), "#9AA2F0"); }
  const look = o.look ?? [0, 0], blink = Math.max(o.blink ?? 0, o.happy ?? 0), glare = o.glare ?? 0;
  for (const s of [-1, 1]) {
    const [ex, ey] = P(s * 19, -4), rx = 15 * S, ry = 16 * S;
    for (let Y = -R(ry) - 1; Y <= R(ry) + 1; Y++) for (let X = -R(rx) - 1; X <= R(rx) + 1; X++) { const d = (X / rx) ** 2 + (Y / ry) ** 2; if (d <= 1 && d > 0.62) c.px(R(ex + X), R(ey + Y), d > 0.86 ? "#14122A" : "#3E3A70"); }
    eye(c, ex, ey, 12 * S, { ry: 13 * S, iris: EYE, pupil: "bead", look, blink: Math.max(blink, glare * 0.22), lid: CROW[3] });
    if (glare > 0.01) {
      const k = glare, lid = [[ex - s * 15 * S, ey - 16 * S], [ex + s * 15 * S, ey - 16 * S], [ex + s * 15 * S, ey + (-16 + 6 * k) * S], [ex - s * 13 * S, ey + (-16 + 17 * k) * S]];
      const g2 = fade(c, Math.min(1, k * 1.5)); g2.poly(lid, CROW[2]);
      g2.line(R(ex - s * 14 * S), R(ey + (-15 + 16 * k) * S), R(ex + s * 14 * S), R(ey + (-15 + 4 * k) * S), "#9AA2F0"); g2.line(R(ex - s * 14 * S), R(ey + (-16 + 16 * k) * S), R(ex + s * 14 * S), R(ey + (-16 + 4 * k) * S), "#C8CCFF");
      const sx = R(ex + (-4 + look[0] * 2) * S), sy = R(ey + 3 * S); g2.rect(sx, sy, Math.max(2, R(3 * S)), Math.max(2, R(3 * S)), "#FFFFFF");
    }
  }
  { const [a1, b1] = P(-33, 16), [a2, b2] = P(33, 16); blush(c, a1, b1, 7 * S, 3.5 * S, "#E86A90", 1); blush(c, a2, b2, 7 * S, 3.5 * S, "#E86A90", 1); }
  // small beak pointing down at the viewer, nostril bristles; open = the gap between the halves grows
  const op = o.open || 0, bk = H([[-11, 6], [11, 6], [5, 26 + 3 * op], [0, 33 + 4 * op], [-5, 26 + 3 * op]]);
  blob(c, [bk], { ramp: BEAK, thick: 4 * S, base: 3.4, outline: "#05040A", litOutline: "#6E6C84" });
  { const [ax, ay] = P(0, 8), [bx2, by2] = P(0, 30 + 3 * op); c.line(R(ax), R(ay), R(bx2), R(by2), "#545268"); const [m1, m2] = P(-7, 19 + 1.5 * op), [n1, n2] = P(7, 19 + 1.5 * op); c.line(R(m1), R(m2), R(n1), R(n2), mix("#05040A", "#5A1A2A", Math.min(1, op * 2)));
    if (op > 0.05) { const [q1, q2] = P(-5, 19 + 3.5 * op), [r1, r2] = P(5, 19 + 3.5 * op); fade(c, Math.min(1, op * 2)).line(R(q1), R(q2), R(r1), R(r2), "#5A1A2A"); } }
  for (const s of [-1, 1]) { const [qx, qy] = P(s * 6, 7); c.px(R(qx), R(qy), "#3A3C6E"); c.px(R(qx + s), R(qy - 1), "#3A3C6E"); }
  return { hx: P(0, 0)[0], hy: P(0, 0)[1] };
}
export const CROW_HEAD_Y = 152, CROW_MID = 100;
