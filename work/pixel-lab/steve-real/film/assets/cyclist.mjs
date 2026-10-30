// steve-real · cyclist (new, 2026-10-28): a side-view rider (helmet, yellow jacket, dark trousers) on a copy of the catalog
// bicycle (assets/bicycle.mjs). The rider's feet sit on the bicycle's own pedals (same crank angle), knees by two-bone IK.
// States are the bicycle's (still / ride / bell / lights).
import bike from "./bicycle.mjs";
import { blob, tube, ell } from "../lib/cat-cute.mjs";
const R = Math.round;
const JACKET = ["#3A2604", "#6A4808", "#A07010", "#D09A18", "#F0BE2C", "#F8D458", "#FCE68E", "#FFF6C8"];
const TROUS = ["#0E0E1A", "#1A1A2E", "#262640", "#343456", "#44446C", "#585884", "#70709C", "#8C8CB4"];
const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
const HELM = ["#2E0A0C", "#5E1618", "#8E2626", "#BE3C34", "#E05A44", "#F08060", "#F8A88A", "#FDD4C0"];
function knee(h, f, L, dir) { const dx = f[0] - h[0], dy = f[1] - h[1], d = Math.min(2 * L - 0.01, Math.hypot(dx, dy)), a = Math.atan2(dy, dx), b = Math.acos(d / (2 * L)); const an = a - dir * b; return [h[0] + Math.cos(an) * L, h[1] + Math.sin(an) * L]; }
export default {
  ...bike, kind: "cyclist", covers: ["cyclist", "bike rider", "bicycle"], source: "steve-real/film (new rider on the catalog bicycle)",
  desc: "side-view rider in a helmet and yellow jacket pedalling a teal bicycle",
  draw(c, cx, cy, z, t, s) {
    const dir = (s.slot === "right" || s.slot === "top-right") ? -1 : 1, k = z, gy = cy + 6 * k;
    const ang = s.integ((q) => q.spin) * dir, ca = ang * 0.6, P = (x, y) => [cx + dir * x * k, gy + y * k];
    const bb = P(-4, 14), cr = 10 * k, pin = (a) => [bb[0] + Math.cos(a) * cr, bb[1] + Math.sin(a) * cr];
    const hip = P(-14, -40), sh = P(16, -76), head = P(22, -90), hand = P(42, -40);
    // far leg (behind the bike), then the bike, then the body and the near leg
    const fF = pin(ca + Math.PI), kF = knee(hip, fF, 27 * k, -dir);
    blob(c, [tube([hip, kF, fF], 5.6 * k, 4.6 * k)], { ramp: TROUS.map((q, i) => TROUS[Math.max(0, i - 1)]), thick: 6 * k });
    const r = bike.draw(c, cx, cy, z, t, s);
    blob(c, [tube([P(-12, -42), sh], 9 * k, 9.5 * k)], { ramp: JACKET, thick: 12 * k });
    blob(c, [tube([sh, P(30, -58), hand], 3.8 * k, 3.4 * k)], { ramp: JACKET, thick: 5 * k });
    const fN = pin(ca), kN = knee(hip, fN, 27 * k, -dir);
    blob(c, [tube([hip, kN, fN], 6 * k, 5 * k)], { ramp: TROUS, thick: 7 * k });
    c.rect(R(fN[0]) - R(5 * k), R(fN[1]) - 2, R(10 * k), R(4 * k), "#1A1A2E");
    blob(c, [ell(head[0], head[1] + 2 * k, 9 * k, 9 * k, 0, 18)], { ramp: SKIN, thick: 8 * k });
    blob(c, [ell(head[0] - dir * 1 * k, head[1] - 3 * k, 10.5 * k, 7.5 * k, 0, 18)], { ramp: HELM, thick: 6 * k });
    c.rect(R(head[0] + dir * 5 * k), R(head[1] + 1 * k), Math.max(1, R(2 * k)), Math.max(1, R(2 * k)), "#07060E");
    return { box: { x0: Math.min(r.box.x0, head[0] - 12 * k), y0: head[1] - 12 * k, x1: Math.max(r.box.x1, head[0] + 12 * k), y1: r.box.y1 }, pt: head };
  },
};
