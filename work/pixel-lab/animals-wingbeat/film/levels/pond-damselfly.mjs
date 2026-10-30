// LV4 · the banded demoiselle (Calopteryx splendens, male look) as a cute chibi seen from the front: a wide head with big
// glossy compound eyes on its sides (two highlights each), a small metallic face with blush and a smile, a metallic
// blue-green thorax, six thin legs, and a long slender abdomen hanging down and curling a little toward the viewer so it
// reads from the front. Four narrow stalked wings with a broad dark-blue band.
// Wings at 20 beats/s sit right on the blur threshold at 30 fps: a strong motion-blur FAN (the swept sector as a
// dithered translucent sheet, denser at the two turning points where the wing lingers; the wing's blue band becomes a
// dark arc across it) plus TWO ghost wings: the wing where wingPhase puts it now and where it was a sixth of a beat
// earlier (both from the caller's elevations e = cos(2π·phase), never an own clock).
import { blob, ell, tube, bez, eye, blush, smile, fade, mix, bayer } from "../cute.mjs";
import { smooth } from "../shade.mjs";
import { hex } from "../../../../../renderer/pixel/raster.mjs";
import { spriteCache, xform } from "./meadow-kit.mjs";

const R = Math.round;
export const METAL = ["#04121C", "#082634", "#0C3E4C", "#105A64", "#16787A", "#22988C", "#4CBCA2", "#92E0C4"];
const BLUE = ["#0A0E3A", "#141E6A", "#1E2E96", "#2C44BE", "#4A66DA", "#7A92EE"];
const EYE = ["#04060E", "#0A1020", "#121C34", "#1E5A78", "#3E9AB8"];
const MEMB = ["#E8FAF4", "#C4E8E4", "#9CCAD6", "#6E9CB8"];       // clear membrane: light → shadow, and the vein colour
const RGB = (c) => hex(c);

// ---------------------------------------------------------------- wings
export const FORE_L = 118, HIND_L = 110;
const BAND = [0.36, 0.84];
/** wing half-width at u (0..L) — a thin stalk (petiole) widening into a long rounded blade */
const halfW = (u, L, W) => { const k = u / L; if (k < 0.16) return 1.2 + k * 6; const q = (k - 0.16) / 0.84; return 2.2 + (W - 2.2) * Math.pow(Math.sin(Math.PI * Math.min(1, q * 0.62 + 0.08)), 0.7) * (q > 0.88 ? Math.sqrt(Math.max(0, 1 - ((q - 0.88) / 0.12) ** 2)) : 1); };
/** stroke angle (rad from straight up, outward) for an elevation e: 24° at the top … 122° at the bottom */
export const strokeAngle = (e) => ((122 - 98 * (e + 1) / 2) * Math.PI) / 180;

/** One ghost wing as a pixel field: pale membrane (dithered, translucent) with the dark-blue band; density a. */
function ghostWing(g, px, py, alpha, side, L, W, a, edge) {
  const dx = side * Math.sin(alpha), dy = -Math.cos(alpha), mx = -dy * side, my = dx * side;
  const ex = px + dx * L, ey = py + dy * L, pad = W + 2;
  const x0 = Math.max(0, Math.floor(Math.min(px, ex) - pad)), x1 = Math.min(g.w - 1, Math.ceil(Math.max(px, ex) + pad)), y0 = Math.max(0, Math.floor(Math.min(py, ey) - pad)), y1 = Math.min(g.h - 1, Math.ceil(Math.max(py, ey) + pad));
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const wx = X + 0.5 - px, wy = Y + 0.5 - py, u = wx * dx + wy * dy, v = wx * mx + wy * my; if (u < 0 || u > L) continue;
    const hw = halfW(u, L, W), vv = v + 1.2 * Math.sin((u / L) * Math.PI); if (Math.abs(vv) > hw) continue;   // a slight curve (leading edge)
    const k = u / L, inBand = k > BAND[0] && k < BAND[1], rim = Math.abs(vv) > hw - 1;
    if (edge && rim) { if (a * 1.1 > bayer(X, Y)) g.px(X, Y, inBand ? BLUE[0] : MEMB[3]); continue; }
    if (inBand) { if (a > bayer(X, Y)) g.px(X, Y, vv < -hw * 0.3 ? BLUE[3] : (X + Y) & 1 ? BLUE[2] : BLUE[1]); }
    else if (a * 0.62 > bayer(X, Y)) g.px(X, Y, vv < 0 ? MEMB[0] : MEMB[1]);
  }
}
/** The swept fan of one side: the wing's whole path over a stroke between angles aTop..aBot as a dithered sheet. */
function fan(g, px, py, side, aTop, aBot, L, W, a) {
  const pad = W + 2, x0 = Math.max(0, Math.floor(px - (side < 0 ? L + pad : pad))), x1 = Math.min(g.w - 1, Math.ceil(px + (side > 0 ? L + pad : pad))), y0 = Math.max(0, Math.floor(py - L - pad)), y1 = Math.min(g.h - 1, Math.ceil(py - Math.cos(aBot) * L + pad));
  const mid = (aTop + aBot) / 2, half = (aBot - aTop) / 2;
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    const wx = (X + 0.5 - px) * side, wy = Y + 0.5 - py, r = Math.hypot(wx, wy); if (r < 8 || r > L) continue;
    const th = Math.atan2(wx, -wy), hw = halfW(r, L, W), ext = Math.atan2(hw, r);       // the blade's own width widens the sweep a little
    if (th < aTop - ext || th > aBot + ext) continue;
    const xq = Math.max(-1, Math.min(1, (th - mid) / half)), lin = 1 / Math.sqrt(Math.max(0.06, 1 - xq * xq));    // arcsine: the wing lingers at the ends
    const k = r / L, inBand = k > BAND[0] && k < BAND[1], soft = th < aTop || th > aBot ? 0.5 : 1;
    const dens = a * soft * Math.min(0.62, (inBand ? 0.15 : 0.11) + 0.09 * (lin - 1)) * (k < 0.16 ? 0.5 : 1);
    if (dens <= bayer(X, Y)) continue;
    const turn = Math.abs(xq) > 0.86;
    g.px(X, Y, inBand ? (turn ? BLUE[2] : (X + Y) & 1 ? BLUE[3] : BLUE[4]) : turn ? "#FFFFFF" : (X + Y) & 1 ? MEMB[0] : MEMB[1]);
  }
}

// ---------------------------------------------------------------- body (cached per tilt and abdomen sway)
const SPR = spriteCache(24);
function bodySprite(tilt, sway) {
  const key = `df:${tilt.toFixed(2)}:${sway}`, W = 120, H = 230, ox = 60, oy = 40;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => xform(pts, x, y + 28, tilt);
    // abdomen: a long slender metallic tube hanging down, curling slightly forward at the tip
    const sp = bez([x, y + 38], [x - 12 + sway * 0.4, y + 104], [x + 7 + sway, y + 150], 22), tip = [[x + 10 + sway, y + 162], [x + 13 + sway, y + 172], [x + 9 + sway, y + 180]];
    const ab = T([...sp, ...tip]);
    blob(g, [tube(ab, 6.2, 3.6)], { ramp: METAL, base: 3.2, gain: 2.4, thick: 4, slope: 0.6, light: [-0.8, -0.3], litOutline: METAL[2], outline: METAL[0] });
    // metallic sheen: a dotted specular line down the lit side, dark segment joints every ~12 px
    for (let i = 1; i < ab.length - 1; i++) {
      const [ax, ay] = ab[i], [bx2, by2] = ab[i + 1], dx = bx2 - ax, dy = by2 - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, w = 6.2 - (i / ab.length) * 2.6;
      for (let q = 0; q < l; q += 1) { const px = ax + (dx / l) * q, py = ay + (dy / l) * q; if (((R(py)) & 1) === 0) g.px(R(px - nx * w * 0.45), R(py - ny * w * 0.45), METAL[7]); }
      if (i % 4 === 2 && i < ab.length - 3) for (let j = -w + 1; j <= w - 1; j += 0.5) g.px(R(ax + nx * j), R(ay + ny * j), j < -w * 0.35 ? METAL[4] : METAL[1]);
    }
    // six thin legs folded forward under the thorax (front view: little bent sticks with dark feet)
    for (const sd of [-1, 1]) for (const [ax, ay, bx2, by2, cx2, cy2] of [[6, 30, 16, 34, 18, 44], [8, 35, 19, 42, 20, 53], [7, 40, 15, 50, 14, 61]]) {
      const p = T([[x + sd * ax, y + ay], [x + sd * bx2, y + by2], [x + sd * cx2, y + cy2]]);
      g.line(R(p[0][0]), R(p[0][1]), R(p[1][0]), R(p[1][1]), "#0A1418"); g.line(R(p[1][0]), R(p[1][1]), R(p[2][0]), R(p[2][1]), "#0A1418"); g.px(R(p[2][0]) + sd, R(p[2][1]), "#0A1418");
      const m = [(p[1][0] + p[2][0]) / 2, (p[1][1] + p[2][1]) / 2]; g.px(R(m[0]) + sd, R(m[1]), "#2A3A40");
    }
    // thorax: chunky metallic, a bright stripe on the lit shoulder
    blob(g, [T(ell(x, y + 28, 15, 14, 0, 40))], { ramp: METAL, base: 3.6, gain: 2.4, thick: 8, litOutline: METAL[3], outline: METAL[0] });
    for (const sd of [-1, 1]) for (let i = -6; i <= 4; i++) { const p = T([[x + sd * (5 - i * 0.35), y + 24 + i]])[0]; g.px(R(p[0]), R(p[1]), sd < 0 ? METAL[7] : METAL[6]); }
    // head: a wide dumbbell (the eyes sit on its ends), metallic face in the middle
    blob(g, [T(ell(x, y + 1, 38, 17, 0, 60)), T(ell(x, y + 3, 23, 20, 0, 44))], { ramp: METAL, base: 3.9, gain: 2.2, thick: 10, litOutline: METAL[4], outline: METAL[0] });
    // a tiny pale lip under the face and two short bristle antennae
    for (const sd of [-1, 1]) { const p = T([[x + sd * 5, y - 13], [x + sd * 9, y - 22]]); g.line(R(p[0][0]), R(p[0][1]), R(p[1][0]), R(p[1][1]), METAL[0]); g.px(R(p[1][0]), R(p[1][1]) - 1, METAL[1]); }
  });
}

/**
 * Banded demoiselle facing the camera. (x, y) = head centre (screen). o: e (elevation now), ePrev (a sixth of a beat
 * earlier), blur 0..1 (fan strength), tilt, sway (abdomen, px), look, blink, open, a.
 */
export function drawDamselfly(c, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return; x = R(x); y = R(y);
  const tilt = Math.round((o.tilt ?? 0) * 50) / 50, cs = Math.cos(tilt), sn = Math.sin(tilt);
  const T = (dx, dy) => { dy -= 28; return [x + dx * cs - dy * sn, y + 28 + dx * sn + dy * cs]; };
  const g = a < 1 ? fade(c, a) : c, blur = o.blur ?? 1;
  const aTop = strokeAngle(1), aBot = strokeAngle(-1);
  for (const side of [-1, 1]) {
    const [fx, fy] = T(side * 8, 24), [hx, hy] = T(side * 8, 31), tl = -side * tilt;
    fan(g, hx, hy, side, aTop + 0.2 + tl, aBot + 0.2 + tl, HIND_L, 9, a * blur * 0.8);
    fan(g, fx, fy, side, aTop + tl, aBot + tl, FORE_L, 9.5, a * blur);
    // ghost B (a sixth of a beat ago, fainter), then ghost A (now): hindwing a little lower than the forewing
    for (const [e, dens, edge] of [[o.ePrev ?? 0, 0.42, false], [o.e ?? 0, 0.82, true]]) {
      const al = strokeAngle(e) + tl;
      ghostWing(g, hx, hy, al + 0.2, side, HIND_L, 9, a * dens * 0.85, edge);
      ghostWing(g, fx, fy, al, side, FORE_L, 9.5, a * dens, edge);
    }
  }
  bodySprite(tilt, R(o.sway ?? 0)).blit(c, x, y, { a });
  // face: big glossy eyes on the sides, blush, smile
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = T(sd * 29, -1); eye(c, ex, ey, 14, { ry: 15.5, iris: EYE, pupil: "bead", look, blink, lid: METAL[4], a }); }
  for (const sd of [-1, 1]) { const [bx, by] = T(sd * 14, 12); blush(c, bx, by, 6, 3, "#FF7FA6", a); }
  const [mx, my] = T(0, 11); smile(c, mx, my, 5, { open: o.open ?? 0.3, a });
}
export { mix };
