// LV6's seven-spot ladybug (Coccinella septempunctata) in flight, facing the camera, chibi style: a big round black head
// with white cheek patches (the pronotum's pale front corners), big glossy amber eyes with two highlights, pink blush on
// the white patches, a small smile, tiny clubbed antennae, six little legs tucked under the chin. Behind the head the
// red wing cases (elytra) are lifted up and out in a V, glossy, with seven black spots (three on each case and the
// shared scutellar spot split at their bases); behind them the clear brownish hind wings beat as a motion-blur fan
// (a dithered sweep, brighter at the two turning points, one faint ghost wing at elevation e = cos(2π·wing)·amt).
// drawLadybug(c, x, y, o): (x, y) = head centre (screen). The shaded body (elytra, head, belly) is a cached sprite per
// (scale, tilt); wings, eyes, blush, mouth and antennae are drawn per frame.
import { blob, ell, tube, bez, eye, blush, smile, RAMP, fade, mix, bayer } from "../cute.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
export const RED = ["#2E0408", "#5C0A12", "#901418", "#C21E20", "#E43A2C", "#F6644A", "#FF9A7C", "#FFD2BE"];
const INK = ["#06050C", "#0E0C18", "#171426", "#221E36", "#2E2948", "#3C365C", "#4E4874", "#686290"];
const SPOT = ["#050406", "#0C0A0E", "#151218", "#1E1A22", "#29232E", "#36303C", "#48404E", "#5E5466"];
const CREAM = ["#3A3430", "#6A625A", "#9A9086", "#C4BAAE", "#DED6CA", "#EEE8DE", "#F8F4EC", "#FFFFFF"];
const IRIS = ["#2A1004", "#5A2808", "#8A420E", "#BC6418", "#E08C26", "#F4B444", "#FCD672"];
const SPR = spriteCache(12);
// local geometry (units × s): hinge of each elytron, its axis angle (right side; mirrored on the left), size
const HINGE = [4, -20], EL_ANG = -0.74, EL_LEN = 98, EL_W = 56;
// spots on the right elytron in its own frame (u along the axis 0..1, v across −1 inner … +1 outer, radius in units)
const SPOTS = [[0.26, 0.5, 10], [0.56, 0.42, 13], [0.82, 0.32, 9.5], [0.08, 0.12, 7]];

function elytronPoly(sd, P) {
  // a rounded shell: straight-ish inner (suture) edge, full outer curve, rounded tip
  const pts = [], n = 28, ca = Math.cos(EL_ANG), sa = Math.sin(EL_ANG);
  for (let i = 0; i <= n; i++) { const u = i / n, half = Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)) ** 0.8 * (u < 0.5 ? 1 : 1 - 0.18 * (2 * u - 1)), out = EL_W * (0.18 + 0.82 * half); pts.push([u * EL_LEN, out]); }
  for (let i = n; i >= 0; i--) { const u = i / n, inner = -EL_W * 0.22 * Math.sqrt(Math.max(0, 1 - (2 * u - 1) ** 2)); pts.push([u * EL_LEN, inner]); }
  return pts.map(([u, v]) => { const lx = HINGE[0] + u * ca - v * sa, ly = HINGE[1] + u * sa + v * ca; return P(sd * lx, ly); });
}
function elFrame(sd, u, v) { // point in the right elytron frame → local units (mirrored for sd = −1)
  const ca = Math.cos(EL_ANG), sa = Math.sin(EL_ANG), lx = HINGE[0] + u * EL_LEN * ca - v * EL_W * sa, ly = HINGE[1] + u * EL_LEN * sa + v * EL_W * ca;
  return [sd * lx, ly];
}

function bodySprite(s, tilt) {
  const key = `lb:${s.toFixed(3)}:${tilt.toFixed(2)}`, W = R(260 * s) + 12, H = R(240 * s) + 12, ox = R(W / 2), oy = R(160 * s) + 6;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const P = (u, v) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u * s, dy = v * s - 30 * s; return [x + dx * cs - dy * sn, y + 30 * s + dx * sn + dy * cs]; };
    const PP = (pts) => pts.map(([u, v]) => P(u, v));
    // elytra (behind the head): glossy red shells, the far-from-light one a touch darker
    for (const sd of [1, -1]) {
      const poly = elytronPoly(sd, P);
      blob(g, [poly], { ramp: RED, thick: 16 * s, base: sd < 0 ? 3.7 : 3.2, gain: 2.3, slope: 0.5, light: [-0.6, -0.8], rimLit: 0.9, rimShade: 0.8, outline: RED[0], litOutline: RED[2] });
      // black spots (recolour the shaded red to the ink ramp, keeping the volume), with a dark rim
      const idx = new Map(RED.map((h, i) => [h, i]));
      for (const [u, v, r] of SPOTS) {
        const [cx, cy] = P(...elFrame(sd, u, v)), rr = r * s;
        for (let Y = R(cy - rr - 1); Y <= R(cy + rr + 1); Y++) for (let X = R(cx - rr - 1); X <= R(cx + rr + 1); X++) {
          const d = Math.hypot(X + 0.5 - cx, (Y + 0.5 - cy) * 1.08) / rr; if (d > 1) continue;
          const col = g.get(X, Y), hx = "#" + col.map((q) => q.toString(16).padStart(2, "0")).join("").toUpperCase(), i = idx.get(hx);
          if (i === undefined || i === 0) continue; g.px(X, Y, d > 0.84 ? SPOT[0] : SPOT[Math.max(1, Math.min(6, i - 1))]);
        }
      }
      // specular highlight: a curved glossy streak near the lit edge, plus a small sparkle
      for (let k = 0; k < 26; k++) { const u = 0.18 + k * 0.022, v = 0.55 - 0.3 * Math.sin(Math.PI * (u - 0.18) / 0.6), [hx, hy] = P(...elFrame(sd, u, v * (sd < 0 ? 1 : 0.85))); const w = sd < 0 ? 2 : 1; for (let j = 0; j < w; j++) g.px(R(hx) + j, R(hy), k < 4 || k > 22 ? RED[6] : sd < 0 ? "#FFF0E8" : RED[7]); }
      { const [hx, hy] = P(...elFrame(sd, 0.3, 0.42)); g.px(R(hx), R(hy), "#FFFFFF"); g.px(R(hx) + 1, R(hy), "#FFFFFF"); g.px(R(hx), R(hy) + 1, "#FFE8E0"); }
    }
    // the scutellar spot: one round spot shared by both cases at their bases (drawn as two halves behind the head top)
    for (const sd of [-1, 1]) { const [cx, cy] = P(sd * 7, -30), rr = 8 * s; for (let Y = R(cy - rr); Y <= R(cy + rr); Y++) for (let X = R(cx - rr); X <= R(cx + rr); X++) if (Math.hypot(X + 0.5 - cx, Y + 0.5 - cy) <= rr) g.px(X, Y, Math.hypot(X + 0.5 - cx, Y + 0.5 - cy) > rr - 1.2 ? INK[0] : INK[3]); }
    // belly under the chin and six tucked legs
    blob(g, [PP(ell(0, 34, 30, 17, 0, 32))], { ramp: INK, thick: 8 * s, base: 3.0, gain: 2.0, litOutline: INK[4] });
    for (const sd of [-1, 1]) for (const [ax, ay, bx, by, cx2, cy2] of [[7, 42, 9, 50, 5, 53], [15, 41, 20, 48, 15, 52], [23, 36, 29, 42, 25, 47]]) {
      const pts = PP([[sd * ax, ay], [sd * bx, by], [sd * cx2, cy2]]);
      blob(g, [tube(pts, 2.6 * s, 1.8 * s)], { ramp: INK, thick: 2 * s, base: 3.2, gain: 1.4, litOutline: INK[4] });
    }
    // the head: a big round black dome
    blob(g, [PP(ell(0, 0, 45, 41, 0, 64))], { ramp: RAMP.black, thick: 26 * s, base: 3.2, gain: 2.6, slope: 0.9, light: [-0.6, -0.8], litOutline: RAMP.black[4] });
    // white cheek patches (the pronotum's pale corners), softly shaded
    for (const sd of [-1, 1]) {
      const pts = []; for (let i = 0; i < 24; i++) { const an = (i / 24) * Math.PI * 2; pts.push([sd * 29 + Math.cos(an) * 13 * (1 + 0.15 * Math.cos(an)), 15 + Math.sin(an) * 11]); }
      const clip = pts.map(([u, v]) => { const d = Math.hypot(u / 43, v / 39); return d > 1 ? [u / d, v / d] : [u, v]; });
      blob(g, [PP(clip)], { ramp: CREAM, thick: 7 * s, base: 4.6, gain: 1.8, slope: 0.6, outline: CREAM[2], litOutline: null });
    }
    // glossy highlight on the head (upper left)
    for (let i = -7; i <= 7; i++) { const [hx, hy] = P(-20 + i * 1.6, -27 + Math.abs(i) * 0.45); g.px(R(hx), R(hy), Math.abs(i) > 4 ? RAMP.black[6] : RAMP.black[7]); }
  });
}

/**
 * o: s (scale), tilt, look [dx, dy], blink, wing (beats, wingPhase), amt (stroke amount), a (dissolve), open (mouth),
 * antSway (px), ghost (density of the ghost wing). Returns anchors { top, bottom }.
 */
export function drawLadybug(c, x, y, o = {}) {
  const s = o.s ?? 1, tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1; x = R(x); y = R(y);
  const P = (u, v) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u * s, dy = v * s - 30 * s; return [x + dx * cs - dy * sn, y + 30 * s + dx * sn + dy * cs]; };
  const out = { top: y - 140 * s, bottom: y + 58 * s };
  if (a <= 0) return out;
  // ---- hind wings (behind everything): clear, brownish, a blurred fan at 75 beats/s
  const ph = o.wing ?? 0, amt = o.amt ?? 1, elev = Math.cos(2 * Math.PI * ph) * amt, g = fade(c, a);
  const A0 = -1.12, A1 = 0.28, len = 138 * s, SHEET = ["#FFF0D2", "#E2B072", "#9A6428"], GH = ["#FFEACA", "#D69E5E"], EDGE = "#6A3E18";
  for (const sd of [-1, 1]) {
    const [rx, ry] = P(sd * 20, -24);
    for (let Y = R(ry + Math.sin(A0) * len) - 2; Y <= R(ry + Math.sin(A1) * len) + 12; Y++) for (let X = R(rx - (sd < 0 ? len + 4 : 4)); X <= R(rx + (sd > 0 ? len + 4 : 4)); X++) {
      const dx = (X - rx) * sd, dy = Y - ry, d = Math.hypot(dx, dy); if (d < 14 * s || d > len) continue;
      const an = Math.atan2(dy, dx) - tilt * sd; if (an < A0 - 0.04 || an > A1 + 0.04) continue;
      const k = (an - A0) / (A1 - A0), edge = Math.min(1, Math.min(k, 1 - k) * 7), dens = (0.16 + 0.36 * (d / len) ** 2) * (1.25 - 0.5 * edge);
      if (dens > bayer(X, Y)) g.px(X, Y, d > len - 3 ? SHEET[2] : ((X + Y) & 1) ? SHEET[0] : SHEET[1]);
    }
    const wingPoly = (ang, l, w) => { const pts = []; for (let i = 0; i <= 12; i++) { const u = i / 12, half = Math.sin(Math.PI * Math.min(1, 0.1 + u * 1.0)) * w * (0.7 + 0.3 * u); pts.push([u * l, -half]); } for (let i = 12; i >= 0; i--) { const u = i / 12, half = Math.sin(Math.PI * Math.min(1, 0.1 + u)) * w * 0.5; pts.push([u * l, half]); } const cs = Math.cos(ang), sn = Math.sin(ang); return pts.map(([u, v]) => [rx + sd * (u * cs - v * sn), ry + (u * sn + v * cs)]); };
    for (const [k, dens, ghost] of [[0.02, 0.4, 0], [0.98, 0.4, 0], [0.5 - 0.48 * elev, o.ghost ?? 0.55, 1]]) {
      const ang = A0 + (A1 - A0) * k + tilt * sd, w = wingPoly(ang, len * 0.97, 24 * s), q = fade(c, a * dens);
      q.poly(w, null, (X, Y) => (((X + Y) & 1) === 0 ? GH[0] : GH[1]));
      if (ghost) { for (let i = 0; i < w.length; i++) { const p = w[i], r = w[(i + 1) % w.length]; q.line(R(p[0]), R(p[1]), R(r[0]), R(r[1]), EDGE); }
        for (const f of [0.35, 0.6]) { const cs = Math.cos(ang), sn = Math.sin(ang); q.line(R(rx + sd * cs * 10 * s), R(ry + sn * 10 * s), R(rx + sd * (cs * len * f - sn * -10 * s * f)), R(ry + sn * len * f + cs * -10 * s * f), EDGE); } }
    }
  }
  // ---- the shaded body
  bodySprite(s, tilt).blit(c, x, y, { a });
  // ---- antennae: short, thin, clubbed, swaying a little
  const sway = o.antSway ?? 0;
  for (const sd of [-1, 1]) {
    const p0 = P(sd * 11, -36), p1 = P(sd * 16 + sway * 0.4, -52), p2 = P(sd * 26 + sway, -58), pts = bez(p0, p1, p2, 10);
    for (let i = 1; i < pts.length; i++) { g.line(R(pts[i - 1][0]), R(pts[i - 1][1]), R(pts[i][0]), R(pts[i][1]), INK[1]); g.px(R(pts[i][0]) - sd, R(pts[i][1]), INK[5]); }
    blob(c, [ell(p2[0], p2[1], 3.6 * s, 3 * s, 0, 14)], { ramp: INK, thick: 3, a, litOutline: INK[4] }); g.px(R(p2[0] - s), R(p2[1] - s), INK[7]);
  }
  // ---- face: big glossy amber eyes, blush on the white patches, a small smile
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = P(sd * 17, -5); eye(c, ex, ey, 12.5 * s, { ry: 14 * s, iris: IRIS, pupil: "round", look, blink, lid: RAMP.black[3], a }); }
  for (const sd of [-1, 1]) { const [bx, by] = P(sd * 28, 15); blush(c, bx, by, 7.5 * s, 3.8 * s, "#FF7E9E", a); }
  const [mx, my] = P(0, 18); smile(c, mx, my, Math.max(3, R(5 * s)), { open: o.open ?? 0.3, col: "#E8D8E8", tongue: "#F07090", a });
  return out;
}
export { RED as LB_RED };
