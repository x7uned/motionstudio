// steve-real · elephant (new, 2026-10-28): a friendly side-view elephant in the house style (volume-shaded grey body,
// big flapping ear, curling trunk, small tusk, pillar legs). States: idle (ear flaps, trunk sways) / walk (legs step in
// turn, body bobs) / trumpet (trunk lifts). s.dir = 1 faces right, −1 left. About 2.6 m tall at 50 px / m.
import { blob, flat, tube, bez, ell, shadow, RAMP } from "../lib/cat-cute.mjs";
const TAU = Math.PI * 2, R = Math.round;
const GR = ["#1A1826", "#2C2A3E", "#423F58", "#5A5672", "#74708E", "#8E8AA8", "#AEAAC4", "#D2CEE2"];
export default {
  kind: "elephant", covers: ["elephant", "heavy animal", "six tonnes"], source: "steve-real/film (new)",
  desc: "friendly grey side-view elephant; ears flap, walks with pillar legs, can lift its trunk",
  hw: 52, hh: 40, start: "stands, ear flaps, trunk sways",
  states: { idle: [0.4, "stands, ear flaps, trunk sways"], walk: [0.35, "walks, legs step in turn", "thump"], trumpet: [0.5, "lifts its trunk", "rise"] },
  base: { walk: 0, trumpet: 0 }, st: { idle: { walk: 0, trumpet: 0 }, walk: { walk: 1 }, trumpet: { trumpet: 1, walk: 0 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const v = s.v, d = s.dir ?? 1, fy = cy + this.hh * z, g = s.gait ?? s.integ((p) => 1.3 * p.walk), sw = (k) => Math.sin(TAU * g + k);
    const P = (x, y) => [cx + d * x * z, fy + y * z], PL = (pts) => pts.map(([x, y]) => P(x, y));
    const bob = Math.abs(Math.sin(TAU * g)) * 1.5 * v.walk;
    shadow(c, cx, fy, 46 * z, 5 * z, "#000000", 0.35);
    const leg = (x, k, far) => { const dx = 6 * sw(k) * v.walk, lift = Math.max(0, sw(k + 1.57)) * 3 * v.walk; blob(c, [tube(PL([[x, -34 - bob], [x + dx, -3 - lift]]), 7.2 * z, 6.6 * z)], { ramp: far ? GR.map((q, i) => GR[Math.max(0, i - 1)]) : GR, thick: 8 * z, base: 3.4 }); flat(c, [PL([[x + dx - 7, -4 - lift], [x + dx + 7, -4 - lift], [x + dx + 6, -1 - lift], [x + dx - 6, -1 - lift]])], "#C8C2D8"); };
    leg(-24, Math.PI, true); leg(14, 0, true);
    const tr = v.trumpet, sway = Math.sin(TAU * 0.35 * t) * 3;
    const trunk = bez([38, -54 - bob], [52 + sway * 0.3, lerp(-30, -80, tr) - bob], [lerp(46, 64, tr) + sway, lerp(-10, -88, tr) - bob], 14);
    blob(c, [ell(cx - d * 4 * z, fy - (46 + bob) * z, 34 * z, 24 * z, 0, 28), ell(cx + d * 28 * z, fy - (56 + bob) * z, 18 * z, 18 * z, 0, 24), tube(PL(trunk), 6 * z, 3.4 * z)], { ramp: GR, thick: 22 * z, base: 3.6 });
    leg(-14, Math.PI + 0.6, false); leg(24, 0.6, false);
    // tail, tusk, eye, ear (flaps)
    c.line(R(P(-36, -50 - bob)[0]), R(P(-36, -50 - bob)[1]), R(P(-41, -32 - bob)[0]), R(P(-41, -32 - bob)[1]), "#2C2A3E");
    flat(c, [PL([[34, -44 - bob], [44, -40 - bob], [43, -37 - bob], [34, -40 - bob]])], "#F4EEDC", { outline: "#07060E" });
    const [ex, ey] = P(33, -61 - bob); c.rect(R(ex), R(ey), Math.max(2, R(2.4 * z)), Math.max(2, R(2.4 * z)), "#07060E"); c.px(R(ex), R(ey), "#FFFFFF");
    const flap = 0.12 * Math.sin(TAU * 0.6 * t) + 0.1;
    blob(c, [ell(cx + d * (18 - 3 * flap * 10) * z, fy - (52 + bob) * z, 11 * z, 16 * z, d * flap, 22)], { ramp: GR.map((q, i) => GR[Math.max(0, i - 1)]), thick: 6 * z, base: 3.2 });
    flat(c, [ell(cx + d * (18 - 3 * flap * 10) * z, fy - (51 + bob) * z, 6 * z, 10 * z, d * flap, 16)], "#B48AA0");
    return { box: { x0: cx - 52 * z, y0: fy - 80 * z, x1: cx + 52 * z, y1: fy }, pt: P(0, -46) };
  },
};
function lerp(a, b, k) { return a + (b - a) * k; }
