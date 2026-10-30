// Two friends on the porch bench, front view, shaded pixel figures in shorts and T-shirts (so plenty of skin shows).
// R (right, x = 0) is the one mosquitoes always bite first: his right forearm rests on the armrest, where the bite swells;
// his other arm can reach across to scratch it. L (left, x = -80) sends the film from his phone at the end.
import { fade, bayer } from "../../../renderer/pixel/raster.mjs";
import { smooth, drawPart } from "./shade.mjs";
import { ground } from "./scenery.mjs";
import { POS } from "./timeline.mjs";

const R = Math.round;
export const SKIN_R = ["#40200F", "#6E3B22", "#A0603A", "#C8845A", "#E2A87C", "#F2C69E", "#FADFC2"];
export const SKIN_L = ["#1C0E08", "#3A2014", "#5C3522", "#7E4E34", "#9C6848", "#B88462", "#D2A282"];
export const BUMP = ["#7A1E2A", "#C23848", "#E46070", "#F7A0A6"];
const SHIRT_R = ["#0C2A30", "#14424A", "#1E5E66", "#2A7C84", "#3E9AA0", "#64BCBE"], SHIRT_L = ["#2A1846", "#3E2466", "#563488", "#7048A8", "#8E66C6", "#B090E0"];
const SHORTS_R = ["#0E1430", "#18224A", "#243466", "#324884", "#4660A0"], SHORTS_L = ["#121016", "#1E1A24", "#2C2834", "#3C3746", "#4E485A"];
const HAIR_R = ["#1A0E08", "#2E1A0E", "#4A2C16", "#6A4224", "#8A5A32"], HAIR_L = ["#08060A", "#121018", "#1E1A26", "#2C2636", "#3E3650"];
const SHOE = ["#0E0C12", "#2A2636", "#4A4458", "#E8E4F0"], PHONE = ["#0B0812", "#1D1430", "#3B2C5C"];
export const PEOPLE = { L: { x: POS.L, skin: SKIN_L, shirt: SHIRT_L, shorts: SHORTS_L, hair: HAIR_L, curly: true }, R: { x: POS.R, skin: SKIN_R, shirt: SHIRT_R, shorts: SHORTS_R, hair: HAIR_R, curly: false } };
const LIGHT = [-0.6, -0.8];

function capsule(a, b, ra, rb, n = 5) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, ang = Math.atan2(uy, ux), pts = [];
  for (let i = 0; i <= n; i++) { const t = ang - Math.PI / 2 + (Math.PI * i) / n; pts.push([b[0] + Math.cos(t) * rb, b[1] + Math.sin(t) * rb]); }
  for (let i = 0; i <= n; i++) { const t = ang + Math.PI / 2 + (Math.PI * i) / n; pts.push([a[0] + Math.cos(t) * ra, a[1] + Math.sin(t) * ra]); }
  return pts;
}
/** Two-bone IK: elbow on the lower side. */
export function ik(S, T, l1, l2) {
  const dx = T[0] - S[0], dy = T[1] - S[1], d = Math.min(l1 + l2 - 0.01, Math.max(Math.abs(l1 - l2) + 0.01, Math.hypot(dx, dy))), base = Math.atan2(dy, dx), a = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const e1 = [S[0] + Math.cos(base + a) * l1, S[1] + Math.sin(base + a) * l1], e2 = [S[0] + Math.cos(base - a) * l1, S[1] + Math.sin(base - a) * l1], E = e1[1] > e2[1] ? e1 : e2;
  const ex = T[0] - E[0], ey = T[1] - E[1], el = Math.hypot(ex, ey) || 1;
  return { E, W: [E[0] + ex / el * l2, E[1] + ey / el * l2] };
}

/**
 * st: { look: {L:[dx,dy], R:[dx,dy]}, lPhone 0..1, rReach 0..1 (left hand to the bite), scratch (phase rad), bump 0..1, sleeve 0..1,
 *       mouthO: {L, R} 0..1 (exhale), glow: optional }
 * Returns key world points (bite, hands, phone, lap) for the film.
 */
export function drawFriends(c, cam, t, st) {
  const G = ground(cam), z = G.z, T = ([x, y]) => [G.X(x), G.Y(y)];
  const part = (pts, o) => drawPart(c, [pts.map(T)], { light: LIGHT, ...o, thick: (o.thick ?? 3) * z });
  const sm = (pts, o, sharp) => drawPart(c, [smooth(pts.map(T), sharp ?? new Set(), 4)], { light: LIGHT, ...o, thick: (o.thick ?? 3) * z });
  const out = {};
  for (const id of ["L", "R"]) {
    const P = PEOPLE[id], x0 = P.x, at = (dx, y) => [x0 + dx, y], sk = { ramp: P.skin, outline: P.skin[0], base: 3.6, gain: 1.6 };
    // shins and shoes, knees (the thighs point at the camera, so the shorts end in two hems just above the knees)
    for (const side of [-1, 1]) {
      part([at(side * 7.5 - 3.4, -33), at(side * 7.5 + 3.4, -33), at(side * 7.5 + 2.8, -16), at(side * 7.5 - 2.8, -16)], { ...sk, thick: 2.2, base: 3.0, gain: 1.4 });
      sm([at(side * 7.5 - 4.8, -16.5), at(side * 7.5 + 4.8, -16.5), at(side * 7.5 + 5.4, -12.4), at(side * 7.5 - 5.4, -12.4)], { ramp: SHOE, outline: SHOE[0], base: 2.2, gain: 1.2, thick: 1.5, litOutline: SHOE[3] });
      c.rect(R(G.X(x0 + side * 7.5 - 5)), R(G.Y(-13)), Math.max(2, R(10 * z)), Math.max(1, R(0.8 * z)), SHOE[3]);
      sm([at(side * 7.5 - 4.4, -37), at(side * 7.5 + 4.4, -37), at(side * 7.5 + 4.0, -31.5), at(side * 7.5 - 4.0, -31.5)], { ...sk, base: 3.8, gain: 1.6, thick: 2, litOutline: P.skin[6] });
    }
    sm([at(-16, -44), at(16, -44), at(16.4, -38.5), at(12.5, -36), at(2.5, -36.4), at(0, -38), at(-2.5, -36.4), at(-12.5, -36), at(-16.4, -38.5)], { ramp: P.shorts, outline: P.shorts[0], base: 2.8, gain: 1.2, thick: 3 }, new Set([5]));
    // T-shirt torso with a neckline
    sm([at(-15, -66.5), at(-5.5, -70.2), at(5.5, -70.2), at(15, -66.5), at(14.6, -54), at(14.2, -42.5), at(-14.2, -42.5), at(-14.6, -54)], { ramp: P.shirt, outline: P.shirt[0], base: 3.0, gain: 1.2, slope: 1.2, thick: 6, litOutline: P.shirt[5] }, new Set([3, 0]));
    if (z >= 1.4) { for (let q = 0; q <= 1; q += 0.04) { const a2 = Math.PI * q, [px, py] = T(at(-Math.cos(a2) * 4.6, -70.0 + Math.sin(a2) * 2.2)); c.px(R(px), R(py), P.shirt[1]); } c.rect(R(G.X(x0 - 14)), R(G.Y(-43.4)), R(28 * z), Math.max(1, R(0.7 * z)), P.shirt[1]); }
    // neck, ears, head
    part([at(-3.6, -75), at(3.6, -75), at(3.9, -68), at(-3.9, -68)], { ...sk, base: 2.4, thick: 2 });
    for (const side of [-1, 1]) sm([at(side * 7.4, -83), at(side * 9.2, -82), at(side * 9.0, -78.5), at(side * 7.4, -78)], { ...sk, base: 3.0, thick: 1 });
    const head = []; for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2, jaw = Math.sin(a) > 0 ? 1 - 0.18 * Math.sin(a) : 1; head.push(at(Math.cos(a) * 7.8 * jaw, -81 + Math.sin(a) * 9.2)); }
    sm(head, { ...sk, base: 3.8, gain: 2.0, thick: 5, litOutline: P.skin[6] });
    // hair
    if (P.curly) { const blobs = []; for (let k = 0; k < 11; k++) { const a = Math.PI + (k / 10) * Math.PI; blobs.push([x0 + Math.cos(a) * 8.6, -82.5 + Math.sin(a) * 9.6]); }
      const ring = []; blobs.forEach(([bx, by], k) => { for (let q = 0; q < 6; q++) { const a = (q / 6) * Math.PI * 2; ring.push([bx + Math.cos(a) * 3.2, by + Math.sin(a) * 3.2]); } });
      drawPart(c, blobs.map(([bx, by]) => { const p = []; for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; p.push(T([bx + Math.cos(a) * 3.4, by + Math.sin(a) * 3.4])); } return p; }).concat([[at(-8.6, -83), at(8.6, -83), at(7, -90), at(0, -91.5), at(-7, -90)].map(T)]), { ramp: P.hair, outline: P.hair[0], base: 2.4, gain: 1.6, thick: 3 * z, light: LIGHT, litOutline: P.hair[4] }); }
    else sm([at(-8.4, -80), at(-8.2, -86), at(-5, -90.5), at(1, -91.5), at(6.5, -89.5), at(8.6, -85), at(8.4, -80), at(7, -84), at(2, -86.5), at(-3, -85), at(-6.5, -83)], { ramp: P.hair, outline: P.hair[0], base: 2.6, gain: 1.8, thick: 2.5, litOutline: P.hair[4] }, new Set([0, 10]));
    // face: brows, eyes with pupils that follow the mosquito, nose, mouth (rounds while breathing out)
    const lk = st.look?.[id] ?? [0, 0], ink = "#1A0E0A";
    for (const side of [-1, 1]) {
      const ex = x0 + side * 3.0, ey = -81.2;
      if (z >= 1.6) { const w = Math.max(1, R(1.6 * z)); c.rect(R(G.X(ex - 1.3)), R(G.Y(ey - 0.9)), Math.max(2, R(2.6 * z)), Math.max(1, R(1.8 * z)), "#F4EEE6"); c.rect(R(G.X(ex - 0.6 + lk[0] * 0.6)), R(G.Y(ey - 0.8 + lk[1] * 0.4)), w, Math.max(1, R(1.7 * z)), ink); c.rect(R(G.X(ex - 1.5)), R(G.Y(ey - 2.6)), Math.max(2, R(3 * z)), Math.max(1, R(0.7 * z)), P.hair[1]); }
      else c.px(R(G.X(ex)), R(G.Y(ey)), ink);
    }
    if (z >= 1.6) { c.rect(R(G.X(x0 - 0.5)), R(G.Y(-79)), Math.max(1, R(z)), Math.max(1, R(1.2 * z)), P.skin[2]); const mo = st.mouthO?.[id] ?? 0; if (mo > 0.4) c.disc(R(G.X(x0)), R(G.Y(-75.8)), Math.max(1, R(0.9 * z)), "#3A1410"); else c.rect(R(G.X(x0 - 1.6)), R(G.Y(-76)), Math.max(2, R(3.2 * z)), Math.max(1, R(0.6 * z)), P.skin[1]); }
    // arms
    const S1 = at(-14.5, -64.5), S2 = at(14.5, -64.5), UA = 17, FA = 19;
    // skin arm first, then the short sleeve over the shoulder (with a hem line)
    const sleeve = (S, E) => { const m = [S[0] + (E[0] - S[0]) * 0.42, S[1] + (E[1] - S[1]) * 0.42]; sm(capsule(S, m, 3.9, 3.5), { ramp: P.shirt, outline: P.shirt[0], base: 3.1, gain: 1.2, thick: 2.2, litOutline: P.shirt[5] }); };
    const arm = (S, E, Wr, hand) => {
      sm(capsule(S, E, 3.1, 2.8), { ...sk, thick: 2 }); sm(capsule(E, Wr, 2.75, 2.3), { ...sk, base: 3.7, thick: 2, litOutline: P.skin[6] });
      sm(hand, { ...sk, base: 3.6, thick: 1.5, litOutline: P.skin[6] }); sleeve(S, E);
    };
    const handAt = (Wr, dir, len = 4) => { const n = Math.hypot(dir[0], dir[1]) || 1, ux = dir[0] / n, uy = dir[1] / n, px = -uy, py = ux; return [[Wr[0] - px * 2.2, Wr[1] - py * 2.2], [Wr[0] + ux * len - px * 1.8, Wr[1] + uy * len - py * 1.8], [Wr[0] + ux * (len + 1.2), Wr[1] + uy * (len + 1.2)], [Wr[0] + ux * len + px * 1.8, Wr[1] + uy * len + py * 1.8], [Wr[0] + px * 2.2, Wr[1] + py * 2.2]]; };
    if (id === "R") {
      // right arm resting on the armrest; the bite swells on its top edge
      const E = at(23, -50), Wr = at(43, -50);
      sm(capsule(S2, E, 3.1, 2.8), { ...sk, thick: 2 });
      sm(capsule(E, Wr, 2.75, 2.35), { ...sk, base: 3.8, thick: 2, litOutline: P.skin[6] });
      sm(handAt(Wr, [1, 0.05], 5), { ...sk, base: 3.8, thick: 1.5, litOutline: P.skin[6] }); sleeve(S2, E);
      out.forearm = { E, W: Wr };
      const b = st.bump ?? 0;
      if (b > 0) { const [bx, by] = POS.bite, rx = (0.7 + 1.3 * b), ry = 0.35 + 0.85 * b, X = G.X(bx), Y = G.Y(by + 0.2), f = fade(c, Math.min(1, b * 2.5));
        f.ellipse(R(X), R(Y), Math.max(1, R(rx * z * 1.4)), Math.max(1, R(ry * z * 1.3)), BUMP[1]); f.ellipse(R(X), R(Y - 0.2 * z), Math.max(1, R(rx * z)), Math.max(1, R(ry * z * 0.9)), BUMP[2]); if (z > 2) f.px(R(X - rx * z * 0.4), R(Y - ry * z * 0.6), BUMP[3]); }
      // sleeve over the forearm (nylon mesh) during the lab part
      const sl = st.sleeve ?? 0;
      if (sl > 0) { const g = fade(c, sl), x0s = E[0] + 1, x1s = Wr[0] - 1; for (let wy = -53; wy <= -47; wy += 0.5 / z) for (let wx = x0s; wx <= x1s; wx += 0.5 / z) { const X = R(G.X(wx)), Y = R(G.Y(wy)); if ((X + Y) % 3 === 0 || (X - Y + 999) % 3 === 0) g.px(X, Y, (X + Y) % 6 === 0 ? "#FFFFFF" : "#D8DCEC"); } }
      // left arm: in the lap, or reaching across to scratch the bite
      const reach = st.rReach ?? 0, lapW = at(-5, -42), [bx, by] = POS.bite, scr = Math.sin(st.scratch ?? 0) * 1.6;
      const target = [lapW[0] + (bx - 3.5 + scr - lapW[0]) * reach, lapW[1] + (by - 1.4 - lapW[1]) * reach];
      const { E: E1, W: W1 } = ik(S1, target, UA, FA);
      arm(S1, E1, W1, handAt(W1, [W1[0] - E1[0], W1[1] - E1[1]], 4));
      out.lap = at(-6, -41.5); out.scratchHand = W1;
    } else {
      // L: hands in the lap, or holding the phone up in front of the chest
      const ph = st.lPhone ?? 0, phone = at(1, -55 - 2 * ph);
      for (const [S, side] of [[S1, -1], [S2, 1]]) {
        const lap = at(side * 5, -42), tgt = [lap[0] + (phone[0] + side * 2.6 - lap[0]) * ph, lap[1] + (phone[1] + 3 - lap[1]) * ph];
        const { E, W: Wr } = ik(S, tgt, UA, FA);
        if (side > 0 && ph > 0.05) { const g = fade(c, Math.min(1, ph * 3)); const [px0, py0] = T([phone[0] - 3.2, phone[1] - 5.5]), [px1, py1] = T([phone[0] + 3.2, phone[1] + 5.5]); g.rrect(R(px0), R(py0), R(px1 - px0), R(py1 - py0), PHONE[0], 1); g.rect(R(px0) + 1, R(py0) + 1, R(px1 - px0) - 2, R(py1 - py0) - 3, ph > 0.6 ? "#5A4A90" : PHONE[1]); }
        arm(S, E, Wr, handAt(Wr, [Wr[0] - E[0], Wr[1] - E[1]], 3.6));
      }
      out.phone = phone;
    }
  }
  return out;
}
