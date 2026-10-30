// steve-real film2 · beam-scales (new, 2026-10-28, drawn for this film): a giant street beam balance built for the film —
// a riveted steel column on a stepped base, a long girder beam with a brass pivot and a balance dial (needle), chains to a
// small left pan (for a 1 m block) and to a long right platform wide enough for three elephants. tilt −1 … 1 tips the beam
// (−1 = left side down). geomW() gives the pan tops so the film can stand loads on them. Illustration, not a real device.
import { box, gpoly, wfill, wrect, gshadow, R, lerp, clamp01, localView, castShadow } from "../lib/view.mjs";
const ST = ["#2A3040", "#3C4458", "#525C74", "#6C7890", "#8A96AC", "#AAB4C6"], BR = ["#6A4A18", "#9A7024", "#C8982E", "#E8C050", "#FFE68A"], WOOD = ["#5A3A22", "#7A5230", "#9A6A3E", "#B88452"];
export const SC = { pivot: 3.2, left: -3.3, right: 5.0, platW: 7.2, panW: 1.5, hang: 4.4, H: 5.0, Z: 1.2, platZ: [0.6, 3.6] };

/** geometry for scales whose column stands at world (X, Z) */
export function geomW(X, tilt) {
  const a = tilt * 0.09;
  // beam ends (positive tilt = right side down): y = H + x·sin(−a)
  const yEndL = SC.H + SC.left * -Math.sin(a), yEndR = SC.H + SC.right * -Math.sin(a);
  return { a, left: { X: X + SC.left, top: yEndL - SC.hang, beam: yEndL }, right: { X: X + SC.right, top: yEndR - SC.hang, beam: yEndR } };
}
export function drawScalesW(c, V, X, t, tilt, layer = "all") {
  const G = geomW(X, tilt), Zc = SC.Z, Zp = SC.platZ;
  if (layer === "back" || layer === "all") {
    castShadow(c, V, X, Zc, SC.H, 0.3, 0.3);
    // base: stepped plinth, column with rivets, a brass collar
    box(c, V, X - 0.9, X + 0.9, 0, 0.3, Zc - 0.6, Zc + 0.6, { top: ST[3], front: ST[2], side: ST[1] });
    box(c, V, X - 0.55, X + 0.55, 0.3, 0.55, Zc - 0.4, Zc + 0.4, { top: ST[4], front: ST[3], side: ST[2] });
    wfill(c, V, X - 0.22, X + 0.22, 0.55, SC.H - 0.2, Zc, (XX, Y, x, y) => { const u = (XX - X) / 0.22; if (Math.abs(Y * 3 % 1) < 0.08 && Math.abs(u) > 0.6) return ST[0]; return u < -0.55 ? ST[4] : u < 0.1 ? ST[3] : u < 0.6 ? ST[2] : ST[1]; });
    box(c, V, X - 0.3, X + 0.3, SC.H - 0.5, SC.H - 0.3, Zc - 0.3, Zc + 0.3, { top: BR[3], front: BR[2] });
  }
  if (layer === "beam" || layer === "all") {
    // the girder beam (rotated): a band with diagonal lattice
    const a = G.a, P = (u, y) => [X + u * Math.cos(a), SC.H + u * -Math.sin(a) + y];
    const pts = [P(SC.left - 0.25, 0.28), P(SC.right + 0.25, 0.28), P(SC.right + 0.25, -0.28), P(SC.left - 0.25, -0.28)].map(([x, y]) => [V.sx(x, Zc + 0.3), V.sy(y, Zc + 0.3)]);
    const ol = [[pts[0][0] - 2, pts[0][1] - 2], [pts[1][0] + 2, pts[1][1] - 2], [pts[2][0] + 2, pts[2][1] + 2], [pts[3][0] - 2, pts[3][1] + 2]]; c.poly(ol, "#1A1622");
    const yt = (x) => pts[0][1] + (pts[1][1] - pts[0][1]) * (x - pts[0][0]) / (pts[1][0] - pts[0][0]), hh = pts[3][1] - pts[0][1];
    c.poly(pts, ST[3], (x, y) => { const v = (y - yt(x)) / hh, u = (V.wX(x, Zc + 0.3) - X) * 2.2, d = ((u + v * 1.0) % 1 + 1) % 1, e = ((u - v * 1.0) % 1 + 1) % 1; if (v < 0.14) return ST[5]; if (v > 0.86) return ST[1]; if (d < 0.1 || e < 0.1) return ST[4]; return v < 0.5 ? "#2A3040" : "#20263A"; });
    const [e0, e1] = [[V.sx(P(SC.left - 0.2, 0.16)[0], Zc + 0.3), V.sy(P(SC.left - 0.2, 0.16)[1], Zc + 0.3)], [V.sx(P(SC.right + 0.2, 0.16)[0], Zc + 0.3), V.sy(P(SC.right + 0.2, 0.16)[1], Zc + 0.3)]];
    c.line(R(e0[0]), R(e0[1]), R(e1[0]), R(e1[1]), ST[5]);
    // pivot cap + dial with a needle (points straight up when level)
    const [px, py] = V.P(X, SC.H + 0.05, Zc + 0.45), rr = Math.max(4, R(0.42 * V.s(Zc + 0.45)));
    for (let j = -rr; j <= rr; j++) for (let i = -rr; i <= rr; i++) { const d = Math.hypot(i, j); if (d <= rr) c.px(R(px) + i, R(py) + j, d > rr - 1 ? "#1A1622" : d > rr - 2.5 ? BR[i + j < 0 ? 4 : 2] : "#F4EEDC"); }
    for (let q = -3; q <= 3; q++) { const an = -Math.PI / 2 + q * 0.35, x0 = px + Math.cos(an) * rr * 0.7, y0 = py + Math.sin(an) * rr * 0.7; c.px(R(x0), R(y0), q === 0 ? "#2E8A4E" : "#5A5060"); }
    const na = -Math.PI / 2 + tilt * 1.0; for (let q = 0; q < rr * 0.8; q++) c.px(R(px + Math.cos(na) * q), R(py + Math.sin(na) * q), "#C83A3A");
    c.px(R(px), R(py), "#1A1622");
  }
  if (layer === "pans" || layer === "all") {
    // chains (dashed links) from the beam ends to the pans
    const chain = (Xb, Yb, Zb, Xe, Ye, Ze) => { const n = 18; for (let i = 0; i <= n; i++) { const u = i / n, [x, y] = V.P(lerp(Xb, Xe, u), lerp(Yb, Ye, u), lerp(Zb, Ze, u)); if (i % 2 === 0) c.rect(R(x) - 1, R(y) - 1, 2, 2, "#3A3444"); else c.px(R(x), R(y), "#8A8494"); } };
    const L = G.left, Rr = G.right;
    for (const dx of [-0.6, 0.6]) chain(L.X, L.beam, Zc + 0.3, L.X + dx, L.top + 0.12, Zc + (dx > 0 ? 0.5 : -0.3));
    for (const [dx, dz] of [[-SC.platW / 2 + 0.2, Zp[0]], [SC.platW / 2 - 0.2, Zp[0]], [-SC.platW / 2 + 0.2, Zp[1]], [SC.platW / 2 - 0.2, Zp[1]]]) chain(Rr.X, Rr.beam, Zc + 0.3, Rr.X + dx, Rr.top + 0.12, dz);
    // left pan: a round brass tray (a box here) ; right: a long timber platform with a steel rim
    box(c, V, L.X - SC.panW / 2, L.X + SC.panW / 2, L.top - 0.16, L.top, Zc - 0.6, Zc + 0.75, { top: (x, y) => ((x + y) % 7 === 0 ? BR[4] : BR[3]), front: BR[2], side: BR[1] });
    box(c, V, Rr.X - SC.platW / 2, Rr.X + SC.platW / 2, Rr.top - 0.2, Rr.top, Zp[0], Zp[1], { top: (x, y) => { const X2 = V.wX(x, 2); return (X2 * 2.2) % 1 < 0.08 ? WOOD[0] : WOOD[(Math.floor(X2 * 2.2) % 2) + 2]; }, front: ST[2], side: ST[1] });
    // shadows of the hanging pans on the pavement
    const sh = (Xm, w, z0, z1, h) => gshadow(c, V, [[Xm - w / 2 + h * 0.5, z0], [Xm + w / 2 + h * 0.5, z0], [Xm + w / 2 + h * 0.4, z1], [Xm - w / 2 + h * 0.4, z1]], 0.3);
    sh(L.X, SC.panW, Zc - 0.6, Zc + 0.75, L.top); sh(Rr.X, SC.platW, Zp[0], Zp[1], Rr.top);
  }
  return G;
}
export default {
  kind: "beam-scales", covers: ["scales", "balance", "beam balance", "weighing"], source: "steve-real/film2 (new)",
  desc: "a giant street beam balance: steel column, girder beam with a balance dial, a small left pan and a long right platform; tips and levels",
  hw: 260, hh: 140, start: "level, the needle points up",
  states: { level: [0.6, "level, needle up"], "tip-left": [0.6, "left pan goes down", "clunk"], "tip-right": [0.6, "right platform goes down", "clunk"] },
  base: { tilt: 0 }, st: { level: { tilt: 0 }, "tip-left": { tilt: -1 }, "tip-right": { tilt: 1 } }, linear: [],
  notes: "World-placed (lib/view.mjs); draw() makes a local view. geomW(X, tilt) gives the pan tops in metres.",
  draw(c, cx, cy, z, t, s) { const V = localView(cx, cy + this.hh * z, z * 0.5); drawScalesW(c, V, -0.6, t, s.v.tilt); return { box: { x0: cx - this.hw * z, y0: cy - this.hh * z, x1: cx + this.hw * z, y1: cy + this.hh * z }, pt: [cx, cy] }; },
};
