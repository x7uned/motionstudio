// steve-real · platform-scales (new, 2026-10-28; idea from the catalog «scales», redrawn big): a giant street beam balance —
// a steel post on a foot plate, a beam with a pivot cap, chains down to a small left platform and a long right platform
// (wide enough for animals). s.v.tilt −1 … 1 tips the beam (−1 = left side down). geom() gives the platform tops so the
// film can stand loads on them. Not a real weighing device.
const R = Math.round;
const ST = ["#2A2C3E", "#3E425A", "#5A607E", "#7C84A4", "#A6AEC8", "#D0D6E6"];
export function geom(cx, feet, z, tilt) {
  const a = 0.14 * tilt, piv = [cx, feet - 172 * z], arm = 100 * z, ends = [-1, 1].map((sd) => [piv[0] + sd * arm * Math.cos(a), piv[1] - sd * arm * Math.sin(a) * -1]);
  // tilt −1 → left end down: y of the end = piv.y − sd·arm·sin(a) with a < 0 for the left side going down
  const yEnd = (sd) => piv[1] + sd * arm * Math.sin(a);
  const L = [piv[0] - arm * Math.cos(a), yEnd(-1)], Rr = [piv[0] + arm * Math.cos(a), yEnd(1)], ch = 132 * z;
  return { piv, L, R: Rr, left: { x: L[0], top: L[1] + ch, w: 72 * z }, right: { x: Rr[0], top: Rr[1] + ch, w: 156 * z }, a, z };
}
function slab(c, x0, y0, w, h, cols) { c.rect(R(x0) - 1, R(y0) - 1, R(w) + 2, R(h) + 2, "#0B0812"); c.rect(R(x0), R(y0), R(w), R(h), cols[2]); c.rect(R(x0), R(y0), R(w), 1, cols[4]); c.rect(R(x0), R(y0) + R(h) - 1, R(w), 1, cols[0]); }
function chain(c, x0, y0, x1, y1) { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const x = R(x0 + ((x1 - x0) * i) / n), y = R(y0 + ((y1 - y0) * i) / n); c.px(x, y, i % 4 < 2 ? "#C8CCDC" : "#5A607E"); if (i % 4 === 0) c.px(x + 1, y, "#0B0812"); } }
export default {
  kind: "platform-scales", covers: ["scales", "balance", "weighing"], source: "steve-real/film (new, after catalog scales)",
  desc: "giant street beam balance with a small left platform and a long right platform; tips and levels",
  hw: 120, hh: 90, start: "level, the beam rocks a little",
  states: { level: [0.8, "beam level", "creak"], "tip-left": [0.8, "left side goes down", "clunk"], "tip-right": [0.8, "right side goes down", "clunk"] },
  base: { tilt: 0 }, st: { level: { tilt: 0 }, "tip-left": { tilt: -1 }, "tip-right": { tilt: 1 } }, linear: [],
  draw(c, cx, cy, z, t, s) {
    const feet = cy + this.hh * z, G = geom(cx, feet, z, s.v.tilt + 0.02 * Math.sin(t * 1.3) * 0);
    // post + foot plate
    slab(c, cx - 30 * z, feet - 10 * z, 60 * z, 10 * z, ST);
    c.rect(R(cx - 6 * z) - 1, R(G.piv[1]), R(12 * z) + 2, R(feet - 10 * z - G.piv[1]), "#0B0812"); c.rect(R(cx - 6 * z), R(G.piv[1]), R(12 * z), R(feet - 10 * z - G.piv[1]), ST[3]); c.rect(R(cx - 6 * z), R(G.piv[1]), Math.max(1, R(3 * z)), R(feet - 10 * z - G.piv[1]), ST[4]); c.rect(R(cx + 3 * z), R(G.piv[1]), Math.max(1, R(3 * z)), R(feet - 10 * z - G.piv[1]), ST[1]);
    // platforms on chains (behind the beam)
    for (const [P, end] of [[G.left, G.L], [G.right, G.R]]) {
      chain(c, end[0], end[1], P.x - P.w / 2 + 3, P.top); chain(c, end[0], end[1], P.x + P.w / 2 - 3, P.top);
      slab(c, P.x - P.w / 2, P.top, P.w, 8 * z, ST); c.rect(R(P.x - P.w / 2), R(P.top + 8 * z), R(P.w), 1, "#0B0812");
      for (let x = P.x - P.w / 2 + 6 * z; x < P.x + P.w / 2 - 4; x += 14 * z) c.rect(R(x), R(P.top) + 2, 1, Math.max(2, R(5 * z)), ST[1]);
    }
    // beam (a thick rotated bar) + pivot cap + end hooks
    const [x0, y0] = G.L, [x1, y1] = G.R, th = 7 * z;
    c.poly([[x0, y0 - th], [x1, y1 - th], [x1, y1 + th], [x0, y0 + th]], "#0B0812");
    c.poly([[x0 + 1, y0 - th + 1], [x1 - 1, y1 - th + 1], [x1 - 1, y1 + th - 1], [x0 + 1, y0 + th - 1]], ST[3]);
    c.line(R(x0 + 1), R(y0 - th + 2), R(x1 - 1), R(y1 - th + 2), ST[5]); c.line(R(x0 + 1), R(y0 + th - 2), R(x1 - 1), R(y1 + th - 2), ST[1]);
    for (let j = -R(11 * z); j <= R(11 * z); j++) for (let i = -R(11 * z); i <= R(11 * z); i++) { const d = i * i + j * j, r = 11 * z; if (d <= r * r) c.px(R(cx) + i, R(G.piv[1]) + j, d > (r - 1.5) ** 2 ? "#0B0812" : i + j < -2 ? "#F4D46A" : "#C8961C"); }
    for (const e of [G.L, G.R]) { c.rect(R(e[0]) - 3, R(e[1]) - 3, 7, 7, "#0B0812"); c.rect(R(e[0]) - 2, R(e[1]) - 2, 5, 5, ST[4]); }
    return { box: { x0: G.L[0] - G.left.w / 2, y0: G.piv[1] - 12 * z, x1: G.R[0] + G.right.w / 2, y1: feet }, pt: G.piv, G };
  },
};
