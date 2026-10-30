// ed138 sphere kit (new, 2026-10-28): one per-pixel lit body renderer for the dwarf planets, Neptune and the new icy world.
// House look of the init space set (mars.mjs): light from the upper left, flat tone bands with narrow dithered seams, a 1-px dark
// outline with a lighter lit edge, no blur. A body is a sphere or a spinning triaxial ellipsoid (Haumea); `surface(P, lat, lon)`
// returns { ramp, v } for a body point (P = unit body vector, spun). Tiny bodies (radius < 6 px) dissolve into a star dot, so the
// same item reads from a faint point to a full world. Pure function of its arguments.
import { bayer } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, band, tintPx } from "./layout.mjs";
import { Spr, OUT, LIGHT, n3 } from "./space-kit.mjs";

export { n3, OUT, LIGHT, clamp01, band, tintPx };
const R = Math.round;

/** Unit vector from (lat, lon) in radians. */
export const dir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
/** Crater relief at body point P: list of [ux,uy,uz, radius (rad), depth]. Returns a v offset: dark floor in shadow on the
 *  lit side, bright far wall, a light rim. lx/ly = light direction in body tangent terms is approximated by screen light. */
export function craters(P, list, shade = 1) {
  let dv = 0;
  for (const [cx, cy, cz, r, d] of list) {
    const dot = P[0] * cx + P[1] * cy + P[2] * cz; if (dot < 0.6) continue;
    const ang = Math.acos(Math.min(1, dot)) / r; if (ang > 1.3) continue;
    // offset of P from the crater centre, projected on screen-ish axes (x right, y up)
    const ox = P[0] - cx, oy = P[1] - cy, side = (ox * LIGHT[0] + oy * LIGHT[1]) / (Math.hypot(ox, oy) || 1);
    if (ang < 1) dv += d * shade * (-0.55 + 0.95 * side * ang) * 0.5 - d * 0.05;   // wall toward the light in shadow, far wall lit
    else dv += d * 0.35 * (1 - (ang - 1) / 0.3);                                     // raised rim
  }
  return dv;
}

/**
 * Draw a lit body. o: { r (px), a (presence), spin (rad, around the body's axis), tilt (axis roll on screen, rad),
 * phi (view elevation above the equator), axes [ax, ay, az] (ellipsoid semi-axes, 1 = sphere), surface(P, lat, lon) → {ramp, v},
 * amb (ambient floor 0..0.3), rim (cool rim light 0..1), rimCol, glow (halo strength), glowCol, edge (lit outline colour),
 * dot (star-dot colour for tiny sizes) }. Returns { box, pt }.
 */
export function body(c, cx, cy, o) {
  const r = Math.max(0.5, o.r), A = o.a ?? 1;
  // a star dot for tiny sizes: crossfades with the sphere between r 3.5 and 7 (ordered dither, no one-frame swap)
  const kSphere = clamp01((r - 3.5) / 3.5);
  if (kSphere < 1) {
    const kd = (1 - kSphere) * A, col = o.dot || "#DCE8FF", X = R(cx), Y = R(cy), s = Math.max(1, Math.min(3, R(r * 0.9)));
    for (let j = -s; j <= s; j++) for (let i = -s; i <= s; i++) {
      const d = Math.hypot(i, j) / s; if (d > 1.05) continue;
      if (kd > bayer(X + i, Y + j) * (0.6 + 0.4 * d)) c.px(X + i, Y + j, d < 0.5 ? "#FFFFFF" : col);
    }
    if (r > 1.6) for (const [i, j] of [[-s - 1, 0], [s + 1, 0], [0, -s - 1], [0, s + 1]]) tintPx(c, X + i, Y + j, col, kd * 0.6, 4);
    if (kSphere <= 0) return { box: { x0: cx - 3, y0: cy - 3, x1: cx + 3, y1: cy + 3 }, pt: [cx, cy] };
  }
  const ax = o.axes || [1, 1, 1], mx = Math.max(ax[0], ax[2]) * r, my = ax[1] * r, ext = Math.max(mx, my);
  const spr = new Spr(cx, cy, ext + 2, ext + 2), phi = o.phi ?? 0.25, sp = Math.sin(phi), cp = Math.cos(phi);
  const tl = o.tilt ?? 0, ct = Math.cos(tl), st = Math.sin(tl), sn = Math.sin(o.spin || 0), cs = Math.cos(o.spin || 0);
  const amb = o.amb ?? 0.07, rim = o.rim ?? 0.25, gate = kSphere < 1 ? kSphere : 1;
  const ia = 1 / ax[0], ib = 1 / ax[1], ic = 1 / ax[2];
  const x0 = Math.floor(cx - ext - 1), y0 = Math.floor(cy - ext - 1), n = Math.ceil(2 * ext) + 3;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const X = x0 + i, Y = y0 + j;
    if (gate < 1 && gate <= bayer(X, Y)) continue;
    const sx = (X + 0.5 - cx) / r, sy = -(Y + 0.5 - cy) / r;
    // undo the screen roll, then the view elevation: view ray (xl, yl, z) in the frame where the axis is vertical
    const xl = sx * ct + sy * st, yl = -sx * st + sy * ct;
    // body-tilt frame: bx = xl, by = yl*cp + zz*sp, bz = zz*cp - yl*sp; spin about y: X' = bx*cs - bz*sn, Z' = bx*sn + bz*cs;
    // ellipsoid (X'/a)^2 + (by/b)^2 + (Z'/c)^2 = 1 → quadratic in the depth zz (take the root toward the viewer)
    const bx0 = xl, by0 = yl * cp, bz0 = -yl * sp;           // zz = 0 part
    const bxz = 0, byz = sp, bzz = cp;                         // d/dzz
    const X0 = bx0 * cs - bz0 * sn, Xz = bxz * cs - bzz * sn, Z0 = bx0 * sn + bz0 * cs, Zz = bxz * sn + bzz * cs;
    const qa = (Xz * ia) ** 2 + (byz * ib) ** 2 + (Zz * ic) ** 2, qb = 2 * (X0 * Xz * ia * ia + by0 * byz * ib * ib + Z0 * Zz * ic * ic), qc = (X0 * ia) ** 2 + (by0 * ib) ** 2 + (Z0 * ic) ** 2 - 1;
    const disc = qb * qb - 4 * qa * qc; if (disc < 0) continue;
    const zz = (-qb + Math.sqrt(disc)) / (2 * qa);
    const PX = X0 + Xz * zz, PY = by0 + byz * zz, PZ = Z0 + Zz * zz;           // body point (spun frame)
    // normal in body frame → back to view frame
    let nx = PX * ia * ia, ny = PY * ib * ib, nz = PZ * ic * ic; const nl = Math.hypot(nx, ny, nz); nx /= nl; ny /= nl; nz /= nl;
    const vbx = nx * cs + nz * sn, vbz = -nx * sn + nz * cs;                 // unspin
    const vyl = ny * cp - vbz * sp, vz = ny * sp + vbz * cp;                 // un-elevate (inverse of the ray map)
    const vx = vbx * ct - vyl * st, vy = vbx * st + vyl * ct;               // un-roll → screen normal (x right, y up, z to viewer)
    const lam = vx * LIGHT[0] + vy * LIGHT[1] + vz * LIGHT[2];
    const pl = Math.hypot(PX, PY, PZ), P = [PX / pl, PY / pl, PZ / pl], lat = Math.asin(Math.max(-1, Math.min(1, P[1]))), lon = Math.atan2(P[0], P[2]);
    const surf = o.surface(P, lat, lon, X, Y);
    let v = amb + (0.92 - amb) * Math.pow(Math.max(0, lam), 0.85) + surf.v + (o.spec || 0) * 0.55 * Math.pow(Math.max(0, lam), 16);
    // cool rim light on the shadow limb so the night side never melts into the sky
    if (rim > 0 && vz < 0.32 && lam < 0.15) v = Math.max(v, amb + rim * 0.3 * (1 - vz / 0.32));
    if (surf.glint) v = Math.max(v, surf.glint);
    spr.set(X, Y, band(surf.ramp, v, X, Y, 0.42));
  }
  spr.outline(OUT, o.edge || "#24203A");
  spr.flush(gate < 1 ? { px: (x, y, col) => { if (gate > bayer(x, y)) c.px(x, y, col); } } : c);
  if ((o.glow ?? 0) > 0.01) {
    const hr = 1.28, r0 = Math.floor(ext * hr) + 2;
    for (let y = Math.floor(cy - r0); y <= cy + r0; y++) for (let x = Math.floor(cx - r0); x <= cx + r0; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / ext; if (d <= 1.03 || d > hr) continue;
      tintPx(c, x, y, o.glowCol || "#9CC8FF", A * gate * o.glow * 0.8 * Math.pow(clamp01((hr - d) / (hr - 1.03)), 1.6), 4);
    }
  }
  return { box: { x0: cx - mx, y0: cy - my, x1: cx + mx, y1: cy + my }, pt: [cx, cy] };
}
