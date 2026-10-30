// «Infinite aura» · builder C — one cute pixel pigeon (side view, flapping), used by pigeons.mjs.
// Real-pigeon colouring: blue-grey body, darker slate head, iridescent green/purple neck, two black wing bars, dark tail
// band, orange eye, dark beak with a white cere, pink feet. The head turns continuously (yaw) from profile through a
// front view, eyes grow for the stare, glow red, and the laser origin is returned.
import { part, ell, rot, oval, smooth, mix, bayer, fade, clamp01, lerp, R, PI } from "./C-kit.mjs";

const OUT = "#0C0D1C";
export const P_BODY = ["#151729", "#2A2F4C", "#414A6E", "#59648C", "#7480A8", "#929FC4", "#B4C0DC", "#D8E0F0"];
const P_HEAD = ["#12142A", "#262B48", "#3A4268", "#505B84", "#6974A0", "#8590BC", "#A6B0D2", "#C8D0E6"];
const P_WING = ["#181B30", "#2E3456", "#48517A", "#64709C", "#8290BA", "#A2AED2", "#C2CCE6", "#E2E8F6"];
const P_GREEN = ["#0A221C", "#123E32", "#1A604A", "#248866", "#36AE82", "#5ACCA0", "#94E6C4", "#D2FAE8"];
const P_PURPLE = ["#1C1030", "#30204E", "#46306C", "#5E428C", "#7A58A8", "#9874C2", "#B898DA", "#DCC4F0"];
const P_PRIM = ["#10121F", "#1C2036", "#2A2F4C", "#3A4262", "#4C567A", "#5F6A90", "#7480A6", "#8C98BC"];
const P_BAR = ["#0C0D1C", "#14162A", "#1E2138", "#282C48", "#343A5A", "#40486C", "#4E567E", "#5C6690"];
const P_TAILB = ["#0E1020", "#1A1E34", "#262B48", "#333A5C", "#414A70", "#505A82", "#606C96", "#727EAA"];
const P_FOOT = ["#4A1424", "#7A2438", "#A8364E", "#D04E68", "#E8708A", "#F496AA", "#FABCC8", "#FFE2E8"];
const EYE = { ring: "#B8500E", iris: "#F59020", irisL: "#FFC050", pupil: "#0B0812", red: "#FF2438", redD: "#9A0618", hot: "#FFE8EC" };

/**
 * Draw a pigeon. o = { x, y (body centre), f (+1 faces right, −1 left), s (scale), ph (flap phase, rad), yaw (head yaw:
 * +π/2 profile right … 0 front … −π/2 profile left, screen terms), stare 0..1 (big round eyes), red 0..1 (glowing eyes),
 * look [dx, dy] (pupil direction, unit), a (dissolve), T (shimmer), tilt (body pitch rad) }.
 * Returns { eyes: [[x, y], …] (visible eye centres), mid: [x, y] (between the eyes), head: [x, y], hr }.
 */
export function drawPigeon(g, o) {
  const { x, y, f = 1, s = 1, ph = 0, yaw = f * PI / 2, stare = 0, red = 0, look = [f, 0], a = 1, T = 0, tilt = 0 } = o;
  const G = a < 1 ? fade(g, a) : g;
  const e = Math.sin(ph), bob = -1.4 * Math.cos(ph) * s;
  const P = (u) => { const r = rot(u, tilt * f); return [x + f * r[0] * s, y + r[1] * s + bob]; };
  const PP = (pts) => pts.map(P);
  // ---- wings: one designed raised-wing silhouette (notched primaries) squashed vertically by the flap elevation e
  // (+1 up … −1 down; edge-on in the middle of the stroke); two black bars along the inner wing, dark primaries at the tip.
  // wing = one swept-back crescent (light coverts with the two black bars, darker primaries with feather lines, scalloped
  // trailing edge), squashed vertically by the flap elevation e (+1 up … −1 down; edge-on in the middle of the stroke)
  const WING = [[4, 0.5], [5.2, -5.5], [3.6, -12.5], [-0.4, -18.6], [-5.6, -23.6], [-11.4, -27], [-13.4, -25.6], [-12.4, -23.6], [-15, -22.2], [-14, -19.8], [-16.4, -18.2], [-15.2, -15.6], [-17, -13.6], [-15.8, -11], [-16.6, -8], [-14.6, -4.4], [-12.6, -0.6], [-8, 1.2]];
  const NOTCH = [[-12.4, -23.6], [-14, -19.8], [-15.2, -15.6], [-15.8, -11]];
  const wingDraw = (dx, dy, k, dim) => {
    const ey = Math.sign(e || 1) * Math.max(0.16, Math.abs(e)) * k * 0.95, S = [0.5 + dx - 1.5 * (1 - Math.abs(e)), -3 + dy];
    const W = (u) => P([S[0] + u[0], S[1] + u[1] * ey]), O = W([0, 0]);
    const loc = (X, Y) => [(f * (X + 0.5 - O[0])) / s, (Y + 0.5 - O[1]) / (s * ey)];
    part(G, [WING.map(W)], { ramp: P_WING, outline: OUT, base: 3.8 - dim, gain: 1.0, thick: 3.5, rimLit: 0.7, rimShade: 0.5,
      rampAt: (X, Y) => { const [wx, wy] = loc(X, Y); if (wy < -12.5 - wx * 0.25) return P_PRIM; if (wy > -11 && wy < -1.5 && (Math.abs(wx + 6.5 + wy * 0.25) < 0.95 || Math.abs(wx + 10 + wy * 0.25) < 0.95)) return P_BAR; return null; },
      tone: (X, Y) => { const [wx, wy] = loc(X, Y); return wy < -12.5 - wx * 0.25 ? 0.2 - Math.max(0, (-wy - 18) * 0.12) : 0; } });
    // feather separation lines in the primaries (from each trailing notch toward the leading edge)
    for (const [nx, ny] of NOTCH) { const a0 = W([nx, ny]), a1 = W([nx + 6.5, ny + 1.6]); G.line(R(a0[0]), R(a0[1]), R(lerp(a0[0], a1[0], 0.8)), R(lerp(a0[1], a1[1], 0.8)), "#1A1E34"); }
  };
  wingDraw(2.8, -1.4, 1.05, 0.8);                 // far wing (behind the body), darker
  // tail fan with the dark band at the tip
  const tw = 0.8 * Math.sin(ph + 1.2), tail = PP([[-7, -2.2], [-13, -3 + tw], [-17.5, -4.6 + tw], [-19, -2 + tw], [-19.4, 1 + tw], [-18.6, 4 + tw], [-17, 5.6 + tw], [-13, 4.4 + tw], [-7, 3.4]]), tA = P([-7, 0]), tB = P([-19.2, 0.5 + tw]);
  part(G, [tail], { ramp: P_BODY, outline: OUT, base: 3.6, gain: 1.0, thick: 3, slope: 1.0, rampAt: (X, Y) => { const u = ((X - tA[0]) * (tB[0] - tA[0]) + (Y - tA[1]) * (tB[1] - tA[1])) / ((tB[0] - tA[0]) ** 2 + (tB[1] - tA[1]) ** 2); return u > 0.8 ? P_BAR : null; } });
  // feet: tucked pink toes under the belly
  for (const fx of [-1.5, 2]) { const p = P([fx, 7.6]); G.rect(R(p[0]) - 1, R(p[1]), 3, 2, P_FOOT[4]); G.px(R(p[0]) - 1, R(p[1]) + 1, P_FOOT[2]); G.px(R(p[0]) + 1, R(p[1]) + 2, P_FOOT[3]); G.px(R(p[0]) - 1, R(p[1]) + 2, P_FOOT[3]); }
  // body + breast + neck + head as one pillow-shaded union; regions coloured per pixel
  const hc = P([11.5, -9.5]), hr = 6.6 * s;
  const body = PP(ell(0, 0.5, 11.5, 7.2, -0.12, 26)), breast = PP(ell(5.5, -0.5, 7.5, 6.8, 0, 22)), neck = PP(ell(8.5, -5.5, 5.2, 6.2, -0.4, 18));
  const head = ell(hc[0], hc[1], hr, hr * 0.98, 0, 24);
  const nk = P([9.6, -5.2]), shimmer = Math.sin(T * 2.3 + x * 0.05);
  part(G, [body, breast, neck, head], {
    ramp: P_BODY, outline: OUT, base: 3.2, gain: 1.7, thick: 6 * s, slope: 0.9,
    rampAt: (X, Y) => {
      const dh = Math.hypot(X + 0.5 - hc[0], Y + 0.5 - hc[1]);
      if (dh < hr - 0.5) return P_HEAD;
      const dn = Math.hypot((X + 0.5 - nk[0]) / 1.0, (Y + 0.5 - nk[1]) / 1.15);
      if (dn < 4.9 * s) { const band = (Y - nk[1]) / s + 1.2 * shimmer + 1.4 * (bayer(X, Y) - 0.5); return band < 0.8 ? P_GREEN : P_PURPLE; }
      return null;
    },
    tone: (X, Y) => { const dn = Math.hypot(X + 0.5 - nk[0], Y + 0.5 - nk[1]); return dn < 4.9 * s ? 0.5 : Y > y + bob + 3 * s ? 0.35 : 0; },
  });
  // near wing (in front of the body)
  wingDraw(0, 0, 1, 0);
  // ---- face: beak and eyes placed by the head yaw (a ball rotating in screen terms)
  const sy = Math.sin(yaw), cy = Math.cos(yaw);
  const bdir = (() => { const vx = sy, vy = 0.28 + 0.75 * Math.max(0, cy); const n = Math.hypot(vx, vy) || 1; return [vx / n, vy / n]; })();
  const bBase = [hc[0] + hr * 0.82 * sy, hc[1] + hr * (0.18 + 0.42 * Math.max(0, cy))];
  const bl = 4.2 * s, bw = 1.7 * s, nx = -bdir[1], ny = bdir[0];
  const tip = [bBase[0] + bdir[0] * bl, bBase[1] + bdir[1] * bl];
  G.poly([[bBase[0] + nx * bw, bBase[1] + ny * bw], tip, [bBase[0] - nx * bw, bBase[1] - ny * bw]], "#3A3446", (X, Y) => (Math.hypot(X - tip[0], Y - tip[1]) < 1.6 * s ? "#1A1622" : (X - bBase[0]) * nx + (Y - bBase[1]) * ny < 0 ? "#2A2434" : "#4E465C"));
  oval(G, bBase[0] - bdir[0] * 0.6 * s, bBase[1] - bdir[1] * 0.6 * s - 0.9 * s, 1.5 * s, 1.0 * s, "#EEEAF2");      // cere
  // eyes
  const er = lerp(1.9, 4.3, stare) * s, eyes = [];
  for (const side of [-1, 1]) {
    const lam = yaw + side * 1.12, vis = Math.cos(lam);
    if (vis < 0.1) continue;
    const ex = hc[0] + hr * 0.74 * Math.sin(lam), ey = hc[1] - hr * 0.16 - stare * 0.4 * s, rx = er * (0.5 + 0.5 * vis), ry = er;
    eyes.push([ex, ey, rx, ry, vis]);
  }
  eyes.sort((p, q) => p[4] - q[4]);
  const out = [];
  for (const [ex, ey, rx, ry] of eyes) {
    // red glow halo
    if (red > 0) { const hR = ry + 2.6 + 0.8 * Math.sin(T * 17 + ex * 3); for (let Y = R(ey - hR) - 1; Y <= R(ey + hR) + 1; Y++) for (let X = R(ex - hR) - 1; X <= R(ex + hR) + 1; X++) { const dd = Math.hypot(X + 0.5 - ex, Y + 0.5 - ey); if (dd <= ry + 0.6 || dd > hR) continue; const k = red * (dd < ry + 1.7 ? 1 : 0.55 * (1 - (dd - ry - 1.7) / (hR - ry - 1.7))); if (k > bayer(X, Y)) G.px(X, Y, dd < ry + 1.7 ? EYE.red : EYE.redD); } }
    const px = ex + look[0] * rx * 0.38, py = ey + look[1] * ry * 0.34, pr = Math.max(0.8, ry * (0.42 + 0.08 * stare));
    // stare: a big googly eye (white, orange iris, black pupil looking at him); otherwise the small orange pigeon eye
    const ir = lerp(ry, ry * 0.56, stare), ipx = lerp(px, ex + look[0] * rx * 0.42, stare), ipy = lerp(py, ey + look[1] * ry * 0.4, stare), ppr = lerp(pr, ry * 0.3, stare);
    oval(G, ex, ey, rx + 0.7, ry + 0.7, (X, Y) => {
      const di = Math.hypot((X + 0.5 - ipx) / Math.max(0.7, ir * rx / ry), (Y + 0.5 - ipy) / ir), dp = Math.hypot((X + 0.5 - ipx) / Math.max(0.6, ppr * rx / ry), (Y + 0.5 - ipy) / ppr);
      if (red > bayer(X, Y) * 0.98) return di < 0.45 ? EYE.hot : di < 0.85 ? "#FF8A90" : Y < ey - ry * 0.3 ? EYE.redD : EYE.red;
      if (di > 1) return Y < ey - ry * 0.55 ? "#D8D4E8" : "#FFFDF6";
      return dp < 1 ? EYE.pupil : Y < ipy - ir * 0.3 ? EYE.ring : (X + Y) % 3 === 0 ? EYE.irisL : EYE.iris;
    }, OUT);
    if (red < 0.6) { const hx = R(ipx - ppr * 0.6), hy = R(ipy - ppr * 0.7); G.px(hx, hy, "#FFFFFF"); if (stare > 0.5) { G.px(hx + 1, hy, "#FFFFFF"); G.px(hx, hy + 1, "#FFFFFF"); } }
    out.push([ex, ey]);
  }
  const mid = out.length ? [out.reduce((s2, p) => s2 + p[0], 0) / out.length, out.reduce((s2, p) => s2 + p[1], 0) / out.length] : [hc[0] + hr * 0.4 * sy, hc[1] - hr * 0.2];
  return { eyes: out, mid, head: hc, hr };
}
