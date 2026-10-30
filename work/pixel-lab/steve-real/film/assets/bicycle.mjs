// init asset «bicycle»: a teal city bicycle with a basket-less diamond frame, side view, front wheel toward the centre.
// No rider. Spoked wheels, chain ring with turning cranks and pedals, handlebar bell, headlamp, a kickstand that swings up.
import { fade } from "../../../../../renderer/pixel/raster.mjs";
import { frame, stampDisc, glow, groundShadow, facing, RP, OUT, R, clamp01, lerp } from "../lib/transport-kit.mjs";

const TAU = Math.PI * 2;

/** Open spoked wheel in screen space: dark-outlined tyre ring, thin rim, spokes turned by ang, hub. */
function spokeWheel(c, x, y, r, ang) {
  x = R(x); y = R(y);
  for (let Y = y - r - 1; Y <= y + r + 1; Y++) for (let X = x - r - 1; X <= x + r + 1; X++) {
    const d = Math.hypot(X + 0.5 - x - 0.5, Y + 0.5 - y - 0.5);
    if (d > r + 0.3 || d < r - 3.4) continue;
    const outer = d > r - 0.7, inner = d < r - 2.6;
    const lit = (X + Y - x - y) < 0;
    c.px(X, Y, outer || inner ? OUT : lit ? RP.ink[6] : RP.ink[4]);
  }
  for (let i = 0; i < 360; i += 6) { const a = (i * Math.PI) / 180; c.px(R(x + Math.cos(a) * (r - 4.6)), R(y + Math.sin(a) * (r - 4.6)), RP.steel[5]); }
  for (let i = 0; i < 14; i++) { const a = ang + (i * TAU) / 14; c.line(x, y, R(x + Math.cos(a) * (r - 4.6)), R(y + Math.sin(a) * (r - 4.6)), i % 2 ? RP.steel[4] : RP.steel[6]); }
  stampDisc(c, x + 0.5, y + 0.5, 3.2, OUT); stampDisc(c, x + 0.5, y + 0.5, 2.2, RP.steel[6]); c.px(x - 1, y - 1, "#FFFFFF");
}

export default {
  kind: "bicycle",
  covers: ["bicycle", "bike", "cycle"],
  source: "init (new)",
  desc: "teal bicycle without a rider, side view; stands on its kickstand, rides with turning wheels and pedals, rings its bell, lamp glows",
  hw: 82, hh: 48,
  start: "stands still on its kickstand",
  states: {
    still: [0.5, "stands still on its kickstand"],
    ride: [0.7, "kickstand swings up, wheels and pedals turn, frame bobs", "whirr"],
    bell: [0.4, "the bell wobbles and rings", "ding"],
    lights: [0.5, "headlamp and rear reflector glow", "glow"],
  },
  // spin: wheel rate (rad/s, integrated) · go: 0 on kickstand … 1 riding (kickstand up) · lamp: lights
  base: { spin: 0, go: 0, bob: 0, lamp: 0 },
  st: {
    still: { spin: 0, go: 0, bob: 0, lamp: 0 },
    ride: { spin: 7, go: 1, bob: 1, lamp: 0 },
    bell: { spin: 0, go: 0, bob: 0, lamp: 0 },
    lights: { spin: 0, go: 0, bob: 0, lamp: 1 },
  },
  linear: [],
  demo: { target: false },
  notes: "Wheels and cranks share one integrated angle (cranks at 0.6×). Kickstand end point is interpolated by `go`. The riding pose keeps the kickstand up and the frame bobs 1 px (quantised, no dither shimmer). Bell ding arcs follow the bell key's accent.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z, dir = facing(s), go = clamp01(v.go), lamp = clamp01(v.lamp);
    const bob = R(v.bob * 1.2 * (0.5 - 0.5 * Math.cos(TAU * 2.4 * t)) * k), bellA = Math.sin(Math.PI * s.acc("bell"));
    const gy = cy + 6 * k, G = frame(c, cx, gy, k, dir, 0), F = frame(c, cx, gy - bob, k, dir, 0);
    groundShadow(c, cx, gy + 33 * k, 74 * k, 4.5 * k, 0.4);
    const ang = s.integ((q) => q.spin) * dir, W = 30 * k;
    // kickstand (behind the wheel row): swings from the ground up to the frame
    const ke = [lerp(-20, -1, go), lerp(34, 15, go)];
    G.ln([-6, 14], ke, 2.6, RP.steel[3]);
    // far pedal / crank first, then wheels, chain, frame, near crank
    const bb = F.P(-4, 14), cr = 10 * k, ca = ang * 0.6;
    const pin = (a, d) => [bb[0] + Math.cos(a) * cr * d, bb[1] + Math.sin(a) * cr * d];
    const far = pin(ca + Math.PI, 1);
    c.line(R(bb[0]), R(bb[1]), R(far[0]), R(far[1]), RP.steel[2]);
    c.rect(R(far[0]) - 3, R(far[1]) - 1, 6, 3, RP.steel[1]);
    for (const u of [-52, 52]) { const [x, y] = G.P(u, 8); spokeWheel(c, x, y, W, ang); }
    // chain (two thin lines) and chain ring
    const rear = F.P(-52, 8), ringTop = [bb[0], bb[1] - 7 * k], ringBot = [bb[0], bb[1] + 7 * k];
    c.line(R(ringTop[0]), R(ringTop[1]), R(rear[0]), R(rear[1] - 3 * k), RP.ink[4]); c.line(R(ringBot[0]), R(ringBot[1]), R(rear[0]), R(rear[1] + 3 * k), RP.ink[4]);
    // frame
    const col = RP.teal[4], hl = RP.teal[6], w = 4.2;
    const S = [-14, -22], H = [42, -22], BB = [-4, 14], RA = [-52, 8], FA = [52, 8];
    F.ln(RA, BB, w, col, { hl }); F.ln(RA, S, 2.6, col, { hl }); F.ln(BB, S, w, col, { hl });
    F.ln(S, H, w, col, { hl }); F.ln(BB, H, 4.6, col, { hl }); F.ln([44, -28], FA, 3, RP.steel[5], { hl: RP.steel[7] });
    // seat post + saddle, stem + handlebar
    F.ln(S, [-15, -32], 2.4, RP.steel[5]);
    F.rr(-26, -37, 22, 6, 3, { ramp: RP.ink, lo: 0.35, hi: 0.85 });
    F.ln([43, -24], [41, -35], 2.6, RP.steel[5]);
    F.ln([34, -38], [50, -38], 2.8, RP.steel[3]);
    F.rr(48, -41, 9, 5, 2, { ramp: RP.ink, lo: 0.4, hi: 0.8, rim: 0.4 });
    // bell on the bar (wobbles)
    const wob = Math.sin(TAU * 13 * t) * bellA * 1.6;
    const bel = frame(c, cx + R(wob * k), gy - bob - 3 * k * bellA * Math.abs(Math.sin(TAU * 13 * t)), k, dir, 0);
    bel.ov(37, -43, 5.2, 4.2, { ramp: RP.yellow, lo: 0.4, hi: 1 });
    bel.rr(35, -47, 4, 3, 1, { ramp: RP.yellow, lo: 0.6, hi: 1, rim: 0 });
    if (bellA > 0.02) {
      const bp = F.P(37, -43);
      for (const sd of [-1, 1]) for (let i = 0; i < 2; i++) {
        const g = fade(c, clamp01(bellA * 1.6 - i * 0.4));
        for (let a = -0.8; a <= 0.8; a += 0.14) g.px(R(bp[0] + sd * (Math.cos(a) * (9 + i * 5)) * k * 0.9), R(bp[1] - 2 * k + Math.sin(a) * (7 + i * 4) * k * 0.9), i ? "#E8E4FF" : "#FFFFFF");
      }
    }
    // headlamp + reflector
    F.ov(54, -30, 4.2, 4.8, { ramp: RP.yellow, lo: 0.4 + 0.45 * lamp, hi: 0.6 + 0.4 * lamp, rim: 0.4 });
    F.rr(-60, -14, 5, 7, 2, { ramp: RP.red, lo: 0.3 + 0.4 * lamp, hi: 0.5 + 0.4 * lamp, rim: 0.4 });
    const hp = F.P(56, -30), rp = F.P(-58, -10);
    glow(c, hp[0] + dir * 12 * k, hp[1], 26 * k, "#FFE9A0", 0.8 * lamp);
    glow(c, rp[0] - dir * 2 * k, rp[1], 12 * k, "#FF4A4A", 0.7 * lamp);
    // chain ring + near crank + pedal
    stampDisc(c, bb[0] + 0.5, bb[1] + 0.5, 8.2 * k, OUT); stampDisc(c, bb[0] + 0.5, bb[1] + 0.5, 7.2 * k, RP.steel[4]); stampDisc(c, bb[0] + 0.5 - 0.6, bb[1] + 0.5 - 0.6, 5.4 * k, RP.steel[5]);
    stampDisc(c, bb[0] + 0.5, bb[1] + 0.5, 2.4 * k, RP.steel[2]);
    const near = pin(ca, 1);
    for (const [r, cc] of [[2.3, OUT], [1.5, RP.steel[4]]]) { const n = Math.ceil(cr); for (let i = 0; i <= n; i++) stampDisc(c, bb[0] + ((near[0] - bb[0]) * i) / n + 0.5, bb[1] + ((near[1] - bb[1]) * i) / n + 0.5, r, cc); }
    c.rect(R(near[0]) - 4, R(near[1]) - 1, 8, 3, OUT); c.rect(R(near[0]) - 3, R(near[1]), 6, 1, RP.steel[3]);
    return { box: { x0: cx - 82 * k, y0: cy - 42 * k, x1: cx + 82 * k, y1: cy + 38 * k }, pt: [cx, cy - 4 * k] };
  },
};
