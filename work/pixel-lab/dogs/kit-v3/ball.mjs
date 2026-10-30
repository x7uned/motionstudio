// Dog series (Kagenami, 2026-10-23) — the toy balls: glossy rubber balls with a white seam stripe.
// drawBall(c, G, x, y, o): (x, y) = WORLD centre of the round ball (G = ground(cam) from layout.mjs), so it stays
// pixel-clean at every zoom (z = 1 → 14 px across, z = 4 → 56 px). Pure function of its arguments.
//   o.r       radius in world units (default BALL.r = 7)
//   o.ramp    8-step ramp dark → light (BALL.red | BALL.blue | BALL.yellow, or any 8-step ramp)
//   o.spin    rotation in radians, clockwise on screen (rolling right by d world units → spin += d / r)
//   o.squash  0..1 impact squash; the BOTTOM stays where the round ball's bottom is (y + r), so pass the resting centre
//   o.shadow  { h, groundY, col?, k? }: soft dithered contact shadow on the lawn at (x, groundY); h = height of the
//             ball's bottom above the lawn in world units (0 = touching). It shrinks and fades as h grows.
//   o.a       0..1 dissolve (ordered dither); o.outline overrides the dark 1-px outline colour.
// Returns { x, y, r } in screen pixels (centre of the drawn, possibly squashed ball).
import { bayer, fade, mix } from "../../../../renderer/pixel/raster.mjs";

const R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Ramps (dark → light) and the default radius. Saturated toy colours; the red one is the classic dog-toy red. */
export const BALL = {
  r: 7,
  red: ["#2A0306", "#5C0810", "#940E18", "#C8161E", "#EC2A28", "#FF5442", "#FF8C76", "#FFD2C6"],
  blue: ["#050C2C", "#0A1E5E", "#123A9E", "#1A58D4", "#2C7CF6", "#5AA2FF", "#96C8FF", "#DCEEFF"],
  yellow: ["#2C1C02", "#644206", "#A8740A", "#DCA410", "#FCCC1C", "#FFE24C", "#FFF294", "#FFFCDC"],
};
// the white seam stripe, shaded with the ball (dark → light)
const SEAM = ["#46465A", "#6E6E86", "#9A9AB2", "#C2C2D4", "#E2E2EC", "#F6F6FA", "#FFFFFF", "#FFFFFF"];

// light comes from the upper left, slightly toward the viewer (same as the dog/owner shading)
const L = (() => { const v = [-0.48, -0.66, 0.58], n = Math.hypot(...v); return v.map((x) => x / n); })();
// the seam is a great circle tilted toward the viewer: on screen it is a curved ")" line that turns with the spin
const SN = (() => { const b = 0.95; return [Math.sin(b), 0, Math.cos(b)]; })();

/** Soft dithered contact shadow (screen pixels) — exported for other small props. */
export function contactShadow(c, X, Y, rx, ry, k, col = "#10261A") {
  if (k <= 0 || rx <= 0) return;
  ry = Math.max(ry, 0.8);
  c.tint(Math.floor(X - rx - 1), Math.floor(Y - ry - 1), Math.ceil(rx * 2 + 3), Math.ceil(ry * 2 + 3), (px, py) => {
    const d = ((px + 0.5 - X) / rx) ** 2 + ((py + 0.5 - Y) / ry) ** 2;
    return d >= 1 ? 0 : k * (1 - d * d * 0.85);
  }, col, 4);
}

export function drawBall(c, G, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const r = o.r ?? BALL.r, ramp = o.ramp ?? BALL.red, spin = o.spin ?? 0, sq = clamp01(o.squash ?? 0), z = G.z;
  const g = fade(c, a);
  // squash: wider and flatter, bottom kept on the ground line
  const rx = r * (1 + 0.24 * sq), ry = r * (1 - 0.32 * sq), cyW = y + (r - ry);
  const X = G.X(x), Y = G.Y(cyW), RX = rx * z, RY = ry * z;
  // contact shadow on the lawn
  if (o.shadow) {
    const sh = o.shadow, h = Math.max(0, sh.h ?? 0), hk = clamp01(h / 110), gy = sh.groundY ?? y + r;
    const srx = r * z * (1.18 + 0.2 * sq - 0.5 * hk), sry = Math.max(1, srx * 0.3);
    contactShadow(g, G.X(x), G.Y(gy) - 0.5, srx, sry, (sh.k ?? 0.62) * (1 - 0.8 * hk) ** 1.3, sh.col ?? "#10261A");
  }
  const out = o.outline ?? ramp[0];
  const cs = Math.cos(spin), sn = Math.sin(spin);
  const seamW = Math.max(0.11, Math.min(0.2, 1.3 / Math.max(1, RX)));      // ≈ 2 px wide at z = 1, a band at z = 4
  // highlight spot (upper left) size: at least ~1.5 px so it reads at z = 1
  const hlR = Math.max(0.2, 1.3 / Math.max(1, RX)), hx = -0.36, hy = -0.42;
  const x0 = Math.floor(X - RX - 1), x1 = Math.ceil(X + RX + 1), y0 = Math.floor(Y - RY - 1), y1 = Math.ceil(Y + RY + 1);
  const ix = 1 / Math.max(0.5, RX - 1), iy = 1 / Math.max(0.5, RY - 1);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = px + 0.5 - X, dy = py + 0.5 - Y, nx = dx / RX, ny = dy / RY, d2 = nx * nx + ny * ny;
    if (d2 > 1) continue;
    const inner = (dx * ix) ** 2 + (dy * iy) ** 2;
    if (inner > 1) { g.px(px, py, out); continue; }                        // 1-px dark outline
    const nz = Math.sqrt(Math.max(0, 1 - d2));
    const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    // tone: soft wrap light + a lighter bounce rim on the lower right (light from the lawn), darker terminator
    let v = 1.25 + 5.2 * dif ** 0.9;
    const rim = Math.max(0, ny * 0.7 + nx * 0.5) * (1 - nz);
    v += 0.9 * rim * (dif < 0.35 ? 1 : 0.4);
    // seam: rotate the surface point back by the spin, test the tilted great circle
    const qx = nx * cs + ny * sn, qy = -nx * sn + ny * cs;
    const s = qx * SN[0] + qy * SN[1] + nz * SN[2];
    const seam = Math.abs(s) < seamW;
    // dithered band quantisation (flat tone bands, dither only in a narrow transition)
    const fl = Math.floor(v), f = v - fl, q = f < 0.36 ? fl : f > 0.64 ? fl + 1 : (f - 0.36) / 0.28 > bayer(px, py) ? fl + 1 : fl;
    let col;
    if (seam) col = SEAM[Math.max(1, Math.min(7, q))];
    else col = ramp[Math.max(1, Math.min(7, q))];
    // glossy highlight: a crisp white spot with a light halo
    const hd = Math.hypot(nx - hx, (ny - hy) * 1.1);
    if (hd < hlR) col = "#FFFFFF";
    else if (hd < hlR * 1.9 && !seam) { const k = 1 - (hd - hlR) / (hlR * 0.9); col = k > bayer(px, py) * 0.9 ? ramp[7] : col; }
    g.px(px, py, col);
  }
  return { x: X, y: Y, r: RX };
}

/** Helper for the lead: the world centre of a ball resting on the lawn line wy = 0 (with optional squash). */
export const restY = (r = BALL.r) => -r;
export { mix };
