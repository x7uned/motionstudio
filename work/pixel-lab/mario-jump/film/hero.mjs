// Our own plumber hero (not a sprite from any game): drawn from parts every frame in world units (game px, a block is
// 16), so poses blend continuously (run cycle, jump, fall) and zooms stay crisp. Parts are filled into an offscreen
// mask at screen resolution, then outlined in one dark pixel and copied onto the frame (with a dither alpha).
import { bayer, hex, mix } from "./lib/raster.mjs";

const C = { cap: "#E8343C", capHi: "#FF7A70", capLo: "#A8182A", shirt: "#E8343C", shirtLo: "#A8182A", over: "#2F5BD8", overHi: "#5E86F0", overLo: "#1C3A98",
  skin: "#F2B48A", skinLo: "#C98262", hair: "#5A2E14", must: "#3A1E0C", eye: "#1A1020", eyeHi: "#FFFFFF", shoe: "#6A3A1A", shoeHi: "#9A5A2A", btn: "#FFD84A", ink: "#140A12" };
const lerp = (a, b, k) => a + (b - a) * k;

/** pose: { run: phase (cycles), runK: 0..1 running vs standing, air: 0..1 jump pose, armUp: 0..1, face: ±1, squash: 0..1 } */
export function drawHero(c, V, wx, wy, pose, alpha = 1) {
  const z = V.z, face = pose.face ?? 1, S = 1;
  // screen bounding box
  const bx0 = Math.floor(V.X(wx - 20)), by0 = Math.floor(V.Y(wy - 40)), bw = Math.ceil(40 * z) + 2, bh = Math.ceil(44 * z) + 2;
  const mask = new Int16Array(bw * bh).fill(-1), cols = [];
  const colId = (col) => { let i = cols.indexOf(col); if (i < 0) { cols.push(col); i = cols.length - 1; } return i; };
  // local (u right, v up) → screen
  const K = pose.scale ?? 0.8, P = (u, v) => [V.X(wx + u * K * face) - bx0, V.Y(wy - v * K) - by0];
  const fillPoly = (pts, col) => { const id = colId(col), s = pts.map(([u, v]) => P(u, v)); let y0 = Infinity, y1 = -Infinity; for (const p of s) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    for (let Y = Math.max(0, Math.ceil(y0 - 0.5)); Y <= Math.min(bh - 1, Math.floor(y1 - 0.5)); Y++) { const yc = Y + 0.5, xs = []; for (let i = 0; i < s.length; i++) { const [ax, ay] = s[i], [bx, by] = s[(i + 1) % s.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((p, q) => p - q);
      for (let j = 0; j + 1 < xs.length; j += 2) for (let X = Math.max(0, Math.ceil(xs[j] - 0.5)); X <= Math.min(bw - 1, Math.floor(xs[j + 1] - 0.5)); X++) mask[Y * bw + X] = id; } };
  const ell = (u, v, ru, rv, col, rot = 0) => { const pts = []; for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, x = Math.cos(a) * ru, y = Math.sin(a) * rv; pts.push([u + x * Math.cos(rot) - y * Math.sin(rot), v + x * Math.sin(rot) + y * Math.cos(rot)]); } fillPoly(pts, col); };
  const limb = (u0, v0, u1, v1, w, col) => { const du = u1 - u0, dv = v1 - v0, L = Math.hypot(du, dv) || 1, nu = (-dv / L) * w / 2, nv = (du / L) * w / 2; fillPoly([[u0 + nu, v0 + nv], [u1 + nu, v1 + nv], [u1 - nu, v1 - nv], [u0 - nu, v0 - nv]], col); ell(u0, v0, w / 2, w / 2, col); ell(u1, v1, w / 2, w / 2, col); };

  const run = pose.run ?? 0, rk = (pose.runK ?? 0) * (1 - (pose.air ?? 0)), air = pose.air ?? 0, up = pose.armUp ?? 0, sq = pose.squash ?? 0;
  const ph = run * Math.PI * 2, bob = rk * Math.abs(Math.sin(ph)) * 1.2 - sq * 2.5;
  const hipV = 9 + bob, hipU = 0;
  // legs: run swing, jump tuck (front knee up, back leg down)
  const leg = (side) => { const sw = Math.sin(ph + (side > 0 ? 0 : Math.PI)) * rk; let fu = side * 1.5 + sw * 6, fv = Math.max(0, -Math.cos(ph + (side > 0 ? 0 : Math.PI)) * 3 * rk);
    if (air > 0) { fu = lerp(fu, side > 0 ? 6 : -4, air); fv = lerp(fv, side > 0 ? 6 : 1, air); }
    const ku = (hipU + side * 1.5 + fu) / 2 + (air * (side > 0 ? 3 : 0)), kv = (hipV + fv) / 2 + 1 + air * (side > 0 ? 3 : 0);
    limb(hipU + side * 1.5, hipV, ku, kv, 5.2, side > 0 ? C.over : C.overLo); limb(ku, kv, fu, fv + 1.4, 4.6, side > 0 ? C.over : C.overLo);
    ell(fu + 1.6, fv + 1.4, 3.6, 2.2, C.shoe); ell(fu + 2.2, fv + 2.2, 1.6, 0.8, C.shoeHi); };
  // arms
  const arm = (side) => { const su = side * 4.6 - 0.5, sv = hipV + 9.5; let hu = su + Math.sin(ph + (side > 0 ? Math.PI : 0)) * 5 * rk, hv = sv - 6.5 + Math.abs(Math.cos(ph)) * rk;
    let eu = (su + hu) / 2, ev = (sv + hv) / 2;
    if (side > 0 && up > 0) { hu = lerp(hu, su + 5, up); hv = lerp(hv, sv + 18, up); eu = lerp(eu, su + 6.5, up); ev = lerp(ev, sv + 6, up); }
    if (side < 0 && air > 0) { hu = lerp(hu, su - 4, air); hv = lerp(hv, sv - 2, air); eu = (su + hu) / 2; ev = (sv + hv) / 2; }
    limb(su, sv, eu, ev, 4.2, side > 0 ? C.shirt : C.shirtLo); limb(eu, ev, hu, hv, 4, side > 0 ? C.shirt : C.shirtLo); ell(hu, hv, 2.4, 2.4, C.skin); };
  arm(-1); leg(-1);
  // torso: shirt then overalls bib + straps + buttons
  ell(0, hipV + 7.5, 6.2, 6.4, C.shirt); fillPoly([[-5.6, hipV - 1], [5.6, hipV - 1], [5.2, hipV + 7], [-5.2, hipV + 7]], C.over); fillPoly([[-3.4, hipV + 7], [3.4, hipV + 7], [3, hipV + 10.5], [-3, hipV + 10.5]], C.over);
  fillPoly([[-4.6, hipV + 10], [-3, hipV + 10], [-2.2, hipV + 14], [-3.6, hipV + 14]], C.over); fillPoly([[3, hipV + 10], [4.6, hipV + 10], [3.6, hipV + 14], [2.2, hipV + 14]], C.over);
  ell(-2.2, hipV + 8.6, 0.9, 0.9, C.btn); ell(2.4, hipV + 8.6, 0.9, 0.9, C.btn); fillPoly([[-5.4, hipV + 3], [5.4, hipV + 3], [5.2, hipV + 4.2], [-5.2, hipV + 4.2]], C.overHi);
  leg(1);
  // head
  const hv = hipV + 20 - sq * 1;
  ell(0.4, hv, 6.6, 6.2, C.skin); ell(-4.6, hv - 0.2, 2.6, 3.8, C.hair); ell(-2.4, hv - 0.6, 1.1, 1.6, C.skinLo);   // hair at the back, ear
  ell(6.4, hv - 0.6, 2.5, 2.2, C.skin);                                                                              // nose
  fillPoly([[2.4, hv - 2.6], [8.4, hv - 2.4], [8, hv - 4.2], [5, hv - 4.8], [2.2, hv - 4]], C.must);                // moustache
  ell(3.6, hv + 1.4, 0.9, 1.6, C.eye); ell(3.8, hv + 2.2, 0.4, 0.5, C.eyeHi);
  // cap: dome + brim forward
  fillPoly([[-6.4, hv + 2], [-5.6, hv + 5.8], [-2, hv + 8], [3, hv + 7.8], [6.2, hv + 5], [6.4, hv + 2.4]], C.cap);
  fillPoly([[2, hv + 3.4], [10.6, hv + 3.2], [10, hv + 1.8], [2, hv + 2]], C.capLo); fillPoly([[-3, hv + 6.6], [2, hv + 7.4], [1, hv + 5.6], [-3.4, hv + 5.4]], C.capHi);
  ell(1.2, hv + 5.4, 1.6, 1.2, "#FFFFFF");
  arm(1);

  // copy with a one-pixel dark outline, dithered alpha
  const ink = hex(C.ink), cc = cols.map(hex);
  for (let Y = 0; Y < bh; Y++) for (let X = 0; X < bw; X++) {
    const sx = bx0 + X, sy = by0 + Y; if (sx < 0 || sy < 0 || sx >= c.w || sy >= c.h) continue; if (alpha < 1 && alpha <= bayer(sx, sy)) continue;
    const m = mask[Y * bw + X];
    if (m >= 0) { c.px(sx, sy, cc[m]); continue; }
    const nb = (x, y) => x >= 0 && y >= 0 && x < bw && y < bh && mask[y * bw + x] >= 0;
    if (nb(X - 1, Y) || nb(X + 1, Y) || nb(X, Y - 1) || nb(X, Y + 1)) c.px(sx, sy, ink);
  }
}
