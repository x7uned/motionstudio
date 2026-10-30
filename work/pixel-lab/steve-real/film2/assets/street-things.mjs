// steve-real film2 · street things (new, 2026-10-28, drawn for this film), world-placed through lib/view.mjs:
//  street-tree — a plane tree in a stone planter: scaly bark trunk, a crown of leaf clusters lit from the upper left; the
//                1 m log segment can dissolve away (cut) and the crown + upper trunk can drop onto the stump with a bounce
//  city-bus    — a 12 m city bus (no brand, blank destination dots) with windows, doors, wheels and roof units; drives
//  city-car    — a parked hatchback with side windows, wheels, head / tail lights and orange hazard blinkers
//  bicycle     — a city bike (round wheels with spokes, frame, saddle, basket) for the rack or a rider; pedal phase
//  cafe-set    — a round bistro table with two chairs and cups
//  bike-rack, bench-free litter bin and the concrete barrier stand are boxes drawn in the scene.
import { box, gpoly, wfill, wrect, gshadow, castShadow, contact, R, TAU, lerp, clamp01, sm, rnd, h2, ramp, localView, SHADOW, tintPx } from "../lib/view.mjs";
import { Spr } from "../lib/rig.mjs";
import { drawPerson } from "./passerby.mjs";

// ---------------------------------------------------------------- tree
const LEAF = ["#1E3A22", "#2A5230", "#3A6E3A", "#548C42", "#78A84E", "#A2C468"], BARK = ["#3A3428", "#5A5440", "#7E7658", "#A49A78", "#C8BC9A"];
export const TREE = { cut: [0.45, 1.45], crownY: 4.3 };
/** st = { cut 0..1 (log gone), drop 0..1 (crown fell by the 1 m log), sway, crack 0..1 } */
export function drawTreeW(c, V, X, Z, t, st = {}) {
  const s = V.s(Z), [fx, fy] = V.P(X, 0, Z), drop = (st.drop ?? 0) * (TREE.cut[1] - TREE.cut[0]);
  if (!st.noShadow) castShadow(c, V, X, Z, 5.2, 0.8, 0.28);
  // planter (stone box) — the trunk rises from its soil
  box(c, V, X - 0.75, X + 0.75, 0, 0.55, Z - 0.75, Z + 0.75, { top: "#5A3A26", front: (XX, Y, x, y) => (Y > 0.45 ? "#D8CEC0" : ramp(["#9A9088", "#B0A69C", "#C4BAAE"], 0.5 + 0.3 * h2(Math.floor(XX * 6), Math.floor(Y * 6), 3), x, y)), side: "#8A8078" });
  const sp = new Spr(fx - 3 * s, fy - 7.5 * s, 6 * s, 7.6 * s), r = (m) => Math.max(1, m * s);
  const barkTex = (x, y) => ((Math.floor(x / Math.max(1, s * 0.12)) + Math.floor(y / Math.max(1, s * 0.18))) % 3 === 0 ? 0.18 : 0) - ((x * 7 + y * 3) % 11 === 0 ? 0.25 : 0);
  const Y = (m) => fy - m * s, gone = clamp01(st.cut ?? 0);
  // lower stump (0.45 m) — always there
  sp.cap(fx, Y(0.5), fx, Y(TREE.cut[0]), r(0.17), r(0.17), BARK, 16, { tex: barkTex });
  // the log segment (cut away = dissolve)
  if (gone < 1) { const g2 = new Spr(fx - s, Y(TREE.cut[1]) - 2, 2 * s, (TREE.cut[1] - TREE.cut[0]) * s + 4); g2.cap(fx, Y(TREE.cut[0]), fx, Y(TREE.cut[1]), r(0.17), r(0.16), BARK, 16, { tex: barkTex });
    if ((st.crack ?? 0) > 0) { const k = st.crack; for (let q = 0; q < 10 * k; q++) { const yy = lerp(Y(TREE.cut[0]), Y(TREE.cut[1]), rnd(q * 3 + 1)), xx = fx + (rnd(q * 7) - 0.5) * r(0.28); for (let j = 0; j < 4; j++) g2.px(xx + j * (q % 2 ? 1 : -1) * 0.6, yy + j, "#1A1418"); } }
    g2.blit(c, 1 - gone, { outline: null }); }
  // upper trunk + branches + crown (shifted down by drop)
  const D = drop * s, sw = (st.sway ?? 0) * 0.08 * Math.sin(t * 6), wind = 0.015 * Math.sin(t * 0.9);
  const up = new Spr(fx - 3 * s, fy - 7.5 * s, 6 * s, 7.6 * s);
  up.cap(fx, Y(TREE.cut[1]) + D, fx + (sw + wind) * s * 0.5, Y(3.2) + D, r(0.16), r(0.12), BARK, 16, { tex: barkTex });
  for (const [ax, ay, bx2, by2] of [[0, 2.9, -0.9, 3.9], [0, 3.1, 0.8, 4.2], [0, 3.2, 0.1, 4.6]]) up.cap(fx + ax * s, Y(ay) + D, fx + (bx2 + sw + wind) * s, Y(by2) + D, r(0.09), r(0.05), BARK, 17, { tex: barkTex });
  const blobs = [[-1.25, 4.0, 0.95, 0.75], [1.2, 4.1, 1.0, 0.8], [0, 4.5, 1.3, 1.0], [-0.7, 5.2, 0.95, 0.8], [0.75, 5.25, 0.95, 0.75], [0, 5.8, 0.85, 0.65], [-1.5, 4.7, 0.6, 0.55], [1.55, 4.8, 0.6, 0.55], [0.1, 3.75, 0.9, 0.5]];
  blobs.sort((a, b) => a[1] - b[1]);
  blobs.forEach(([bx2, by2, rx, ry], i) => up.ell(fx + (bx2 + (sw + wind) * (by2 - 3)) * s, Y(by2) + D, rx * s, ry * s, LEAF, 32 + i * 16, { noise: 0.55, seed: i, tex: (x, y) => ((x * 3 + y * 5 + i) % 13 === 0 ? 0.3 : 0), bias: 0.03 }));
  up.blit(c, 1, { noLine: new Set(blobs.map((_, i) => 32 + i * 16)) });
  // crown shadow dapples on the pavement
  return { log: [fx, (Y(TREE.cut[0]) + Y(TREE.cut[1])) / 2], top: [fx, Y(6.4) + D], s };
}

// ---------------------------------------------------------------- vehicles
const BUS = { body: ["#1E5A5A", "#2A7474", "#3A9090", "#58AAA6", "#86C6BE"], cream: ["#C8C0A8", "#E2DAC2", "#F4EEDA"], glass: ["#24304A", "#344660", "#4E6684", "#7A98B0", "#AEC4D2"] };
/** a 12 m bus whose front (right end) is at X, lane Z0..Z0+2.5 */
export function drawBusW(c, V, Xf, Z0, t, st = {}) {
  const L = 12, dirL = (st.dir ?? 1) < 0, X0 = Xf - L, Z1 = Z0 + 2.5, H = 3.1, wheelR = 0.5, roll = st.roll ?? 0;
  gshadow(c, V, [[X0 + 0.3, Z1], [Xf, Z1], [Xf + 1.4, Z0 - 0.8], [X0 + 1.6, Z0 - 0.8]], 0.3);
  box(c, V, X0, Xf, 0.35, H, Z0, Z1, {
    top: (x, y) => { const Zr = V.rowZ(y) , X = V.wX(x, Zr); const u = X - X0, w = Zr - Z0; if (w < 0.12 || w > 2.38) return "#8A949E"; if (u > 2 && u < 4.5 && w > 0.5 && w < 2.0) return (Math.floor(u * 6) % 2 ? "#A8B0B8" : "#7C8690"); if (u > 7 && u < 8.2 && w > 0.7 && w < 1.8) return "#5E6A74"; return (x + y) % 11 === 0 ? "#B0B8C0" : "#CDD3D8"; },
    side: (x, y) => BUS.body[1],
    front: (X, Y, x, y) => {
      const u = dirL ? Xf - X : X - X0;
      if (Y > H - 0.18) return BUS.cream[2];
      if (Y > 1.35 && Y < H - 0.35) { // window band with pillars, a door at 1/3 and at the front
        if ((u > 2.6 && u < 3.8) || (u > 10.6 && u < 11.7)) return Y < H - 0.4 ? ((u * 10) % 6 < 0.4 ? "#1E2430" : ramp(BUS.glass, 0.3 + 0.4 * ((Y + u) % 1.4 < 0.25 ? 1 : 0), x, y)) : BUS.body[2];
        if ((u % 1.55) < 0.12) return "#1E2430";
        return ramp(BUS.glass, 0.25 + 0.35 * (Y - 1.35) / 1.4 + ((u * 0.7 + Y) % 2.2 < 0.25 ? 0.45 : 0), x, y);
      }
      if ((u > 2.6 && u < 3.8) || (u > 10.6 && u < 11.7)) return Y < 1.35 && Y > 0.38 ? ((u * 10) % 6 < 0.4 ? "#1E2430" : ramp(BUS.glass, 0.35, x, y)) : BUS.body[2];
      if (Y > 0.95 && Y < 1.12) return BUS.cream[1];
      if (Y < 0.55) return BUS.body[0];
      return ramp(BUS.body, 0.55 + 0.25 * (Y - 0.5), x, y);
    } });
  // destination dots (blank) and lights
  const fr = dirL ? X0 : Xf, sg = dirL ? 1 : -1;
  wfill(c, V, Math.min(fr + sg * 1.6, fr + sg * 0.3), Math.max(fr + sg * 1.6, fr + sg * 0.3), H - 0.32, H - 0.2, Z1, (X, Y, x, y) => ((x + y) % 2 ? "#F4A830" : "#3A2A10"));
  wrect(c, V, Math.min(fr + sg * 0.25, fr + sg * 0.05), Math.max(fr + sg * 0.25, fr + sg * 0.05), 0.6, 0.85, Z1, "#FFF2C0"); { const bk = dirL ? Xf : X0, sb = dirL ? -1 : 1; wrect(c, V, Math.min(bk + sb * 0.05, bk + sb * 0.25), Math.max(bk + sb * 0.05, bk + sb * 0.25), 0.6, 0.85, Z1, "#E84A3A"); }
  // wheels with arches
  for (const wx of dirL ? [Xf - 2.0, Xf - 8.9] : [X0 + 2.0, X0 + 8.9]) { const [cx, cy] = V.P(wx, wheelR, Z1), rr = wheelR * V.s(Z1), ra = rr * 1.25;
    for (let j = -R(ra); j <= 0; j++) for (let i = -R(ra); i <= R(ra); i++) if (i * i + j * j <= ra * ra) c.px(R(cx) + i, R(cy) + j, "#14121A");
    for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) { const d = Math.hypot(i, j); if (d <= rr) { const a = Math.atan2(j, i) + roll / wheelR; c.px(R(cx) + i, R(cy) + j, d < rr * 0.45 ? (Math.cos(a * 5) > 0.3 ? "#B8BCC6" : "#7E8290") : d < rr * 0.55 ? "#3A3842" : "#1E1C24"); } } }
}
const CARCOL = { red: ["#5A1418", "#8A2228", "#B43436", "#D0544C", "#E88070"], blue: ["#142444", "#1E3A6A", "#2E5490", "#4A74B0", "#7AA0CC"], white: ["#8E8C9A", "#B6B4C0", "#D6D4DE", "#EEECF2", "#FFFFFF"], yellow: ["#6A4A08", "#A07418", "#D0A02A", "#E8C04A", "#F6DA7A"] };
/** a parked hatchback, rear at X, length 4.2, lane Z0..Z0+1.8; st = { col, hazard 0..1 (blink amount), dir } */
export function drawCarW(c, V, X0, Z0, t, st = {}) {
  const Cc = CARCOL[st.col ?? "red"], L = 4.2, Z1 = Z0 + 1.8, X1 = X0 + L;
  gshadow(c, V, [[X0, Z1], [X1, Z1], [X1 + 1.2, Z0 - 0.4], [X0 + 1.2, Z0 - 0.4]], 0.32);
  box(c, V, X0, X1, 0.3, 0.95, Z0, Z1, { top: (x, y) => (((x + y) & 7) === 0 ? Cc[3] : Cc[2]), side: Cc[1], front: (X, Y, x, y) => (Y < 0.42 ? "#1E1C24" : Y > 0.6 && Y < 0.66 ? Cc[1] : ramp(Cc, 0.45 + (Y - 0.3) * 0.6, x, y)) });
  // cabin: a trapezoid on top with windows (front face) and a roof
  const ca = X0 + 0.5, cb = X1 - 1.0, rh = 1.48;
  gpoly(c, V, [[ca, 0.95, Z1 - 0.15], [cb + 0.45, 0.95, Z1 - 0.15], [cb, rh, Z1 - 0.3], [ca + 0.35, rh, Z1 - 0.3]], null, (x, y) => { const X = V.wX(x, Z1 - 0.2); return Math.abs(X - (ca + cb) / 2 - 0.2) < 0.06 ? Cc[1] : ramp(["#24304A", "#3E5270", "#6E8AA8", "#A8C0D0"], 0.35 + ((X + y * 0.05) % 1.1 < 0.2 ? 0.4 : 0), x, y); });
  gpoly(c, V, [[ca + 0.05, 1.0, Z0 + 0.15], [ca + 0.35, rh, Z0 + 0.3], [ca + 0.35, rh, Z1 - 0.3], [ca + 0.05, 1.0, Z1 - 0.15]], "#2E3A52"); gpoly(c, V, [[cb, rh, Z0 + 0.3], [cb + 0.5, 1.0, Z0 + 0.15], [cb + 0.5, 1.0, Z1 - 0.15], [cb, rh, Z1 - 0.3]], "#3E5272");
  gpoly(c, V, [[ca + 0.35, rh, Z1 - 0.3], [cb, rh, Z1 - 0.3], [cb, rh, Z0 + 0.3], [ca + 0.35, rh, Z0 + 0.3]], Cc[3]); { const [a1, b1] = V.P(ca + 0.35, rh, Z1 - 0.3), [a2] = V.P(cb, rh, Z1 - 0.3); c.rect(R(a1), R(b1), R(a2 - a1), 1, Cc[4]); }
  // wheels
  for (const wx of [X0 + 0.85, X1 - 0.85]) { const [cx, cy] = V.P(wx, 0.32, Z1), rr = 0.32 * V.s(Z1);
    for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) { const d = Math.hypot(i, j); if (d <= rr) c.px(R(cx) + i, R(cy) + j, d < rr * 0.5 ? "#A8ACB8" : "#18161E"); } }
  // lights: head (right end), tail (left end) + hazard blink on both corners
  const hz = st.hazard ?? 0, blink = hz * (Math.sin(t * TAU * 1.4) > 0 ? 1 : 0.15);
  for (const [X, col] of [[X1 - 0.12, "#FFF2C8"], [X0 + 0.02, "#C83434"]]) { wrect(c, V, X, X + 0.12, 0.62, 0.78, Z1, col); if (blink > 0.2) { const [gx, gy] = V.P(X + 0.06, 0.7, Z1), rr = 0.35 * V.s(Z1) * blink; for (let j = -R(rr); j <= R(rr); j++) for (let i = -R(rr); i <= R(rr); i++) if (i * i + j * j <= rr * rr) tintPx(c, R(gx) + i, R(gy) + j, "#FFB03A", (1 - Math.hypot(i, j) / rr) * 0.9, 3); } }
}

// ---------------------------------------------------------------- bicycle (+ rider)
const FR = ["#1A3A5A", "#2A5A86", "#3E7AAE"], TYRE = "#1A161E";
/** bike centred at (X, Z) facing dir, pedal phase ph (cycles); returns the saddle / bar / pedal points (world) */
export function drawBikeW(c, V, X, Z, t, st = {}) {
  const d = st.dir ?? 1, s = V.s(Z), [bx, by] = V.P(X, 0, Z), P = (u, y) => [bx + u * s * d, by - y * s], wr = 0.34;
  const col = st.col ? [st.col[0], st.col[1], st.col[2]] : FR, ph = TAU * (st.ph ?? 0);
  const wheel = (u) => { const [cx, cy] = P(u, wr), rr = wr * s; for (let j = -R(rr) - 1; j <= R(rr) + 1; j++) for (let i = -R(rr) - 1; i <= R(rr) + 1; i++) { const dd = Math.hypot(i, j); if (Math.abs(dd - rr) < 0.9 * Math.max(1, s / 40)) c.px(R(cx) + i, R(cy) + j, TYRE); else if (dd < rr - 1 && rr > 6) { const a = Math.atan2(j, i) + ph * 0.6; if (Math.abs(Math.sin(a * 4)) < 0.06 * (rr / Math.max(1, dd))) c.px(R(cx) + i, R(cy) + j, "#9A9AA6"); } } c.px(R(cx), R(cy), "#C8C8D0"); };
  wheel(-0.52); wheel(0.52);
  const line = (a, b, w, cc) => { const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])); for (let i = 0; i <= n; i++) { const x = lerp(a[0], b[0], i / Math.max(1, n)), y = lerp(a[1], b[1], i / Math.max(1, n)); c.rect(R(x - w / 2), R(y - w / 2), Math.max(1, R(w)), Math.max(1, R(w)), cc); } };
  const crank = P(0, 0.3), seatT = P(-0.17, 0.85), head = P(0.4, 0.85), bar = P(0.36, 1.02), w = Math.max(1, 0.035 * s);
  line(P(-0.52, wr), crank, w, col[1]); line(crank, seatT, w, col[2]); line(seatT, head, w, col[1]); line(P(-0.52, wr), seatT, w, col[0]); line(crank, head, w, col[2]); line(head, P(0.52, wr), w, col[1]); line(head, bar, w, "#2A2A30");
  line([bar[0] - 0.1 * s * d, bar[1]], [bar[0] + 0.08 * s * d, bar[1] - 0.02 * s], Math.max(1, 0.03 * s), "#2A2A30");
  const seat = P(-0.2, 0.92); c.rect(R(seat[0] - 0.08 * s), R(seat[1]), Math.max(2, R(0.18 * s)), Math.max(1, R(0.04 * s)), "#2A1E1A");
  if (st.basket) { const bk = P(0.6, 0.92); c.rect(R(bk[0] - 0.1 * s), R(bk[1] - 0.12 * s), R(0.22 * s), R(0.14 * s), "#8A6A3E"); c.rect(R(bk[0] - 0.1 * s), R(bk[1] - 0.12 * s), R(0.22 * s), 1, "#B8945A"); }
  const pedal = (k) => P(Math.cos(ph + k) * 0.16 * 1, 0.3 + Math.sin(ph + k) * 0.16);
  const pf = pedal(0), pb = pedal(Math.PI); line(crank, pf, Math.max(1, 0.025 * s), "#3A3A42"); line(crank, pb, Math.max(1, 0.025 * s), "#3A3A42");
  const toW = ([x, y]) => [(x - bx) / s * d, (by - y) / s];
  return { seat: toW(seat), bar: toW(bar), pedals: [toW(pb), toW(pf)] };
}
/** a cyclist: the bike + a rider (person rig with IK to saddle, bar and pedals) */
export function drawCyclistW(c, V, X, Z, t, st = {}) {
  const d = st.dir ?? 1, s = V.s(Z), [bx, by] = V.P(X, 0, Z);
  contact(c, V, X, Z, 0.9, 0.35);
  const G = drawBikeW(c, V, X, Z, t, { ...st, basket: true });
  const look = st.look, H = look.h;
  // rider: hips on the saddle — we place the rig's feet so that its hip lands on the saddle, legs by IK to the pedals
  const hipH = 0.53 * H, sx = G.seat[0] * d, sy = G.seat[1] + 0.05, feetX = bx + (sx) * s * d * 0 + G.seat[0] * s * d;
  const fx = bx + G.seat[0] * s * d, fy = by - (sy - hipH + 0.0) * s;
  const P2 = (w) => [(w[0] - G.seat[0]), w[1] - (sy - hipH)];
  drawPerson(c, fx, fy, s, t, look, { dir: d, lean: -0.18, hands: [P2(G.bar), P2(G.bar)].map((p, i) => [p[0] * d - (i ? 0.02 : -0.02), p[1]]), legIK: [P2(G.pedals[0]), P2(G.pedals[1])].map((p) => [p[0] * d, p[1]]), turn: st.turn ?? 0 });
}

// ---------------------------------------------------------------- café table set
export function drawCafeW(c, V, X, Z, t, st = {}) {
  contact(c, V, X, Z, 0.5, 0.35);
  const top = 0.74;
  box(c, V, X - 0.03, X + 0.03, 0.02, top, Z - 0.03, Z + 0.03, { front: "#2A2A30" });
  // round top: an ellipse on the ground plane at height top
  const [cx, cy] = V.P(X, top, Z), rx = 0.38 * V.s(Z), ry = rx * 0.42;
  for (let j = -R(ry) - 1; j <= R(ry) + 1; j++) for (let i = -R(rx) - 1; i <= R(rx) + 1; i++) { const dd = (i / rx) ** 2 + (j / ry) ** 2; if (dd <= 1.1) c.px(R(cx) + i, R(cy) + j, dd > 0.85 ? (j > 0 ? "#4A4450" : "#1E1A22") : (i + j) % 9 === 0 ? "#FFFFFF" : "#E8E2D6"); }
  for (const [ox, oz] of [[-0.15, 0], [0.12, -0.05]]) { const [px, py] = V.P(X + ox, top + 0.06, Z + oz), w = Math.max(1, R(0.04 * V.s(Z))); c.rect(R(px) - w, R(py) - w, 2 * w, 2 * w, "#F4F0EA"); c.px(R(px), R(py) - w, "#6A4228"); }
  // two bistro chairs
  for (const sd of [-1, 1]) { const chx = X + sd * 0.62; box(c, V, chx - 0.2, chx + 0.2, 0.44, 0.48, Z - 0.2, Z + 0.2, { top: "#9A5E34", front: "#6A3E22" }); for (const lx of [-0.17, 0.17]) wrect(c, V, chx + lx - 0.02, chx + lx + 0.02, 0, 0.44, Z + 0.18, "#2A2A30");
    wrect(c, V, chx + sd * 0.17 - 0.02, chx + sd * 0.17 + 0.02, 0.44, 0.92, Z - 0.1, "#2A2A30"); wrect(c, V, chx + sd * 0.12 - 0.08, chx + sd * 0.2 + 0.06, 0.78, 0.86, Z - 0.1, "#9A5E34"); }
}
export const things = {
  "street-tree": { kind: "street-tree", covers: ["tree", "plane tree", "planter"], source: "steve-real/film2 (new)", desc: "a plane tree in a stone planter; the 1 m log can dissolve away and the crown drops onto the stump", states: { stands: [0.4, "sways"], cut: [0.3, "the log is gone"], drop: [0.75, "the crown falls with a bounce"] } },
  "city-bus": { kind: "city-bus", covers: ["bus", "city bus"], source: "steve-real/film2 (new)", desc: "a 12 m city bus, no brand, blank destination dots; drives with turning wheels", states: { drive: [0.4, "drives"] } },
  "city-car": { kind: "city-car", covers: ["car", "hatchback"], source: "steve-real/film2 (new)", desc: "a parked hatchback with hazard blinkers", states: { parked: [0.3, "parked"], hazard: [0.3, "hazard lights blink"] } },
  bicycle: { kind: "bicycle", covers: ["bike", "bicycle", "cyclist"], source: "steve-real/film2 (new)", desc: "a city bike with spokes and a basket; a cyclist rides it (person rig with IK)", states: { parked: [0.3, "parked"], ride: [0.3, "pedals"] } },
  "cafe-set": { kind: "cafe-set", covers: ["café table", "bistro"], source: "steve-real/film2 (new)", desc: "a round bistro table with two chairs and cups", states: { stands: [0.3, "stands"] } },
};
