// Dog series kit · the standing side-view dog TURNING about its vertical axis (film 3: circling before lying down).
// drawDogSide(…, { turn, back }) lands here for 0 < turn < 1. It is the side rig itself (dog.mjs sideRig: the same body,
// legs, tail, bib, collar and head parts) given a lateral depth and projected through a rotation φ about the vertical
// axis, so turn → 0 and turn → 1 converge on the plain side drawings (facing f and −f) and nothing jumps:
//   front pass (back 0):  φ = π·turn   0 → facing f (side) · 0.5 → facing the camera · 1 → facing −f (side)
//   back pass  (back 1):  φ = −π·turn  0 → facing f · 0.5 → seen from behind (tail toward the camera) · 1 → facing −f
// Parts are painted in two layers around the torso (behind it / in front of it) and hand over between the layers with
// a dither dissolve as their depth crosses the body, so occlusion changes are smooth. The head morphs with its own
// yaw keys toward the front; toward the back it foreshortens and dissolves into the back-of-head drawing.
import { blob, ell, tube, shadow, fade, bayer } from "../../animals/film/cute.mjs";
import { BLK, WHT, LIT, EDGE, drawHead, drawHeadAway, mapper, mapperX } from "./dog-head.mjs";
import { R, TAU, clamp01, lerp, add, sub, mul, rot, nrm, sm01, RED, SHADOW, ik, plume, tri, SENT, SENT_L, inPolys, lerp2, drawTag } from "./dog-parts.mjs";

const WZF = 8.0, WZH = 10.8;                    // lateral half-spacing of the front / hind legs (world units)
const HS = 1.2;

/** Complementary Bayer gate (same as layout.mjs gate; kept local so the kit module has no layout dependency). */
function gateV(c, lo, hi) { if (lo <= 0 && hi >= 1) return c; const o = Object.create(c); o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); }; return o; }

export function drawSideTurn(c, G, x, y, t, o, RIG) {
  const turn = clamp01(o.turn ?? 0), back = clamp01(o.back ?? 0);
  if (back <= 0) return pass(c, G, x, y, t, o, RIG, Math.PI * turn);
  if (back >= 1) return pass(c, G, x, y, t, o, RIG, -Math.PI * turn);
  const a1 = pass(gateV(c, back, 1), G, x, y, t, o, RIG, Math.PI * turn), a2 = pass(gateV(c, 0, back), G, x, y, t, o, RIG, -Math.PI * turn);
  return back < 0.5 ? a1 : a2;
}

/** Legs with their near/far pose data handed over (w 0 → 1) while the dog passes the front/back view (x = depth there). */
function legsTurn(K, C, Rp, ang, w) {
  const legs = {};
  for (const n of ["hf", "ff", "hn", "fn"]) {
    const front = n[0] === "f", near = n[1] === "n", partner = n[0] + (near ? "f" : "n");
    const a = K.paws[n], b = K.paws[partner], P = w <= 0 ? a : w >= 1 ? b : a.map((v, i) => lerp(v, b[i], w));
    const far = near ? w : 1 - w;
    if (front) {
      const S = add(C, rot(lerp2([3, 7], [-1, 6.5], far), ang)), W = add([P[0], P[1]], rot([-1.3, -2.6], P[2]));
      legs[n] = { front, S, J: ik(S, W, 12.5, 12, 1), W, P, pa: P[2] };
    } else {
      const Hp = add(Rp, rot(lerp2([-2, 6], [1, 5], far), ang)), A = add([P[0], P[1]], rot([-3.4, -8.2], P[2] * 0.55));
      legs[n] = { front, S: Hp, J: ik(Hp, A, 11.5, 11, -1), W: A, P, pa: P[2] };
    }
  }
  return legs;
}

function pass(c, G, x, y, t, o, RIG, phi) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const g = fade(c, a), f = (o.facing ?? 1) < 0 ? -1 : 1, z = G.z, ox = G.X(x), oy = G.Y(y);
  const cs = Math.cos(phi), sn = Math.sin(phi), asn = Math.abs(sn);
  const PX = (p, zl = 0) => p[0] * cs - zl * sn;                       // projected local x (before facing / zoom)
  const T = (p) => [ox + f * p[0] * z, oy + p[1] * z];                  // projected local → screen
  const P3 = (p, zl = 0) => [PX(p, zl), p[1]], T3 = (p, zl = 0) => T(P3(p, zl));
  const TP = (pts) => pts.map(T), TP3 = (pts, zl = 0) => pts.map((p) => T3(p, zl));
  const D = (p, zl = 0) => p[0] * sn + zl * cs;                         // depth toward the camera
  // seen end-on the tail is lifted a little (from behind it stands up over the rump; from the front its tip can peek)
  const ro = asn > 0 ? { ...o, tail: { ...(o.tail ?? {}), height: (o.tail?.height ?? 0) + 0.6 * asn } } : o;
  const r = RIG.sideRig(t, ro), { K, C, Rp, ang, up, ax, Np, H, ha } = r;
  /** Ellipsoid: centre cc (side-plane), lateral zl, semi-axes a1 (along th), a2 (⊥ in the plane), a3 (lateral). */
  const E3 = (cc, zl, a1, a2, a3, th) => {
    const n = Math.max(14, Math.min(48, Math.ceil((a1 + a2) * z * 0.9)));
    const A1 = [Math.cos(th) * a1, Math.sin(th) * a1, 0], A2 = [-Math.sin(th) * a2, Math.cos(th) * a2, 0], A3 = [0, 0, a3];
    const r0 = [A1[0] * cs - A1[2] * sn, A2[0] * cs - A2[2] * sn, A3[0] * cs - A3[2] * sn], r1 = [A1[1], A2[1], A3[1]];
    const dot = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2], nz = (u) => { const l = Math.hypot(...u) || 1; return u.map((v) => v / l); };
    const b0 = nz(r0), b1 = nz(r1.map((v, i) => v - dot(r1, b0) * b0[i]));
    const pj = (e) => [0, 1, 2].map((i) => dot(e, b0) * b0[i] + dot(e, b1) * b1[i]);
    let q1 = pj([1, 0, 0]); const l1 = Math.hypot(...q1);
    let q2;
    if (l1 < 1e-6) { q1 = b0; q2 = b1; } else { q1 = q1.map((v) => v / l1); const p2 = pj([0, 1, 0]); q2 = nz(p2.map((v, i) => v - dot(p2, q1) * q1[i])); }
    const B1 = [dot(r0, q1), dot(r1, q1)], B2 = [dot(r0, q2), dot(r1, q2)], c0 = P3(cc, zl), out = [];
    for (let i = 0; i < n; i++) { const t2 = (2 * Math.PI * i) / n, ca = Math.cos(t2), sa = Math.sin(t2); out.push(T([c0[0] + B1[0] * ca + B2[0] * sa, c0[1] + B1[1] * ca + B2[1] * sa])); }
    return out;
  };
  const yaw0 = clamp01(o.yaw ?? 0);

  // contact shadow
  const mx = (C[0] + Rp[0]) / 2 + 4;
  shadow(g, T3([mx, 0])[0], oy, Math.hypot(50 * cs, 26 * sn) * z, Math.max(2, 4.2 * z), SHADOW, 0.42 * K.shadow);

  // ---- parts (each: draw(gg), depth, k = share drawn in front of the torso)
  const parts = [];
  // tail: the side-plane curve + a sideways wag that only shows from the front / behind
  {
    const tp = r.tailPts, n = tp.length, wag = clamp01(o.tail?.wag ?? 0.35), lw = 9 * wag * Math.sin(t * TAU * 3.2 + 0.6);
    const pts = tp.map((p, i) => P3(p, lw * Math.pow(i / (n - 1), 1.6)));
    const tailRf = (s) => (s < 0.5 ? lerp(4.2, 6.6, sm01(s / 0.5)) : lerp(6.6, 2.6, sm01((s - 0.5) / 0.5)));
    // the tufts sit on the outer side of the curl: they shrink to nothing as the tail is seen end-on and regrow mirrored
    const tk = Math.sqrt(Math.abs(cs)), ts = cs >= 0 ? -1 : 1;
    const draw = (gg) => {
      blob(gg, [TP(plume(pts, tailRf, 1.6 * tk, ts))], { ramp: BLK, thick: 4 * z, base: 2.8, litOutline: LIT });
      blob(gg, [TP(plume(pts.slice(8), tailRf, 1.4 * tk, ts, 8 / (n - 1), 1))], { ramp: WHT, thick: 3 * z, base: 4.2, outline: EDGE });
    };
    parts.push({ id: "tail", cat: 5, draw, d: -1e9, k: sm01((-sn - 0.25) / 0.35) });
  }
  // torso + neck (one black union)
  const dist = Math.hypot(C[0] - Rp[0], C[1] - Rp[1]), mid = add(mul(add(C, Rp), 0.5), mul(up, K.arch)), down = mul(up, -1);
  const belly = [0.3, 0.55].map((k, i) => { const b = add(lerp2(Rp, C, k), mul(down, 14.6)); const d = ax; return tri(add(b, mul(d, -3)), add(b, add(mul(d, 1 + i * 0.5), mul(down, 2.6))), add(b, mul(d, 3))); });
  const hp = (q) => add(H, rot([q[0] * HS, q[1] * HS], ha));
  const neckEnd = hp([-3, 4]);
  const torsoS = [E3(C, 0, 18.5, 17.6, 15.5, ang), E3(Rp, 0, 17.6, 16.8, 15.8, ang), E3(mid, 0, dist / 2 + 2, 16.9, 15, ang), TP(tube([P3(Np), P3(neckEnd)], 10.5, 10)), ...belly.map((p) => TP3(p))];
  // bib: chest front + throat to the chin + the side hem; a front hem (spread sideways) shows from the front
  const chin = hp([9, 12]), chestF = add(C, rot([9.5, 2.5], ang));
  const hem = []; for (let i = 0; i < 4; i++) { const b = add(C, rot([5 - i * 0.6, -6 + i * 6.2], ang)); hem.push(tri(add(b, rot([0, -3], ang)), add(b, rot([-4.2, 0.6], ang)), add(b, rot([0, 3], ang)))); }
  const fhem = []; for (let i = 0; i < 4; i++) { const zc = -7.2 + 4.8 * i, x0 = chestF[0] + 2, y0 = chestF[1] + 9.5; fhem.push([T3([x0, y0], zc - 2.6), T3([x0 + 0.5, y0 + 4.6], zc + 0.4), T3([x0, y0], zc + 2.4)]); }
  const bibS = [E3(chestF, 0, 10.2, 13.2, 12.5, ang - 0.1), TP(tube([P3(add(C, rot([12, -6], ang))), P3(chin)], 6.4, 6)), ...hem.map((p) => TP3(p)),
    TP3(tri(add(chestF, rot([4, 9], ang)), add(chestF, rot([6.5, 15.5], ang)), add(chestF, rot([-1, 12.5], ang)))), ...(asn > 0.02 ? fhem : [])];
  const kBib = sm01((sn + 0.25) / 0.25);
  parts.push({ id: "bib", cat: 0, d: D(chestF), k: kBib, draw: (gg) => blob(gg, bibS, { ramp: WHT, thick: 6 * z, base: 4.4, gain: 1.8, outline: EDGE, litOutline: "#9494AE" }) });
  // legs
  const w = sm01((Math.abs(phi) - (Math.PI / 2 - 0.5)) / 1.0), legs = legsTurn(K, C, Rp, ang, w), Mx = (C[0] + Rp[0]) / 2;
  const frontness = sm01((asn - 0.15) / 0.45);
  for (const n of ["hf", "ff", "hn", "fn"]) {
    const L = legs[n], side = n[1] === "n" ? 1 : -1, zl = side * (L.front ? WZF : WZH);
    const nu = sm01(side * cs * 2.5 + 1);                                // 1 = drawn as a near (bright) leg
    const dRel = ((L.S[0] + L.P[0]) / 2 - Mx) * sn + zl * cs, k = sm01(dRel / 6 + 0.5) * nu;
    const { S, J, W, P, pa } = L;
    // a sentinel-outline view: near → merged outline (inside `under` dropped or creased), far → plain dark outline
    const sentV = (gg, under, keep, crease, out, lit, farOut) => { const v = Object.create(gg); v.px = (X, Y, col) => {
      if (col !== SENT && col !== SENT_L) return gg.px(X, Y, col);
      if (nu > bayer(Math.floor(X), Math.floor(Y))) { if (under && inPolys(X + 0.5, Y + 0.5, under())) { if (keep && keep(X, Y)) gg.px(X, Y, crease); return; } gg.px(X, Y, col === SENT ? out : lit); }
      else gg.px(X, Y, farOut);
    }; return v; };
    let draw;
    if (L.front) {
      const polys = [TP(tube([P3(S, zl), P3(J, zl)], 6.2, 5.6)), TP(tube([P3(J, zl), P3(W, zl)], 5.6, 5.0)), E3([P[0] + 0.4, P[1]], zl, 6.8, 4.0, 6.0, pa * 0.85)];
      draw = (gg) => {
        blob(sentV(gg, () => bibS, null, null, EDGE, "#9494AE", "#14121E"), polys, { ramp: WHT, thick: lerp(3, 3.4, nu) * z, base: lerp(2.5, 4.3, nu), gain: lerp(1.3, 1.6, nu), slope: lerp(0.6, 0.9, nu), outline: SENT, litOutline: SENT_L });
        if (nu > 0.5) toes3(gg, T3, P, pa * 0.85, zl, z, asn, sn);
      };
    } else {
      const hip = S, hc = add(hip, rot([3.5, -0.5], ang)), hv = side * cs >= 0 ? 1 : frontness;
      const top = [TP(tube([P3(J, zl), P3(W, zl)], 5.0, 4.3))];
      if (hv > 0) top.unshift(E3(hc, zl, 10.6 * hv, 12.0 * hv, 7.5 * hv, ang + 0.3));
      const low = [TP(tube([P3(W, zl), P3([P[0] - 0.5, P[1] - 1], zl)], 4.3, 4.0)), E3([P[0], P[1]], zl, 6.5, 3.9, 5.6, pa * 0.6)];
      // crease along the haunch edge facing forward-down (side view) / toward the body centre (from behind)
      const hcS = T3(hc, zl), hX = (hcS[0] - T3([Mx, 0])[0]) / z, vx = f * cs + -Math.tanh(hX / 3) * (1 - Math.abs(cs)), vl = Math.hypot(vx * 0.825, 0.565), vv = [vx * 0.825 / vl, 0.565 / vl];
      const crease = (X, Y) => { const dx = X + 0.5 - hcS[0], dy = Y + 0.5 - hcS[1], l = Math.hypot(dx, dy) || 1; return (dx * vv[0] + dy * vv[1]) / l > Math.cos(1.15); };
      draw = (gg) => {
        blob(sentV(gg, () => torsoS, crease, BLK[1], "#07060E", LIT, "#050409"), top, { ramp: BLK, thick: lerp(3, 6, nu) * z, base: lerp(2.0, 2.7, nu), gain: 2.0, outline: SENT, litOutline: SENT_L });
        blob(gg, low, { ramp: WHT, thick: 3 * z, base: lerp(2.5, 4.3, nu), gain: lerp(1.3, 1.5, nu), slope: lerp(0.6, 0.9, nu), outline: nu > 0.5 ? EDGE : "#14121E" });
        if (nu > 0.5) toes3(gg, T3, P, pa * 0.6, zl, z, asn, sn);
      };
    }
    parts.push({ id: n, cat: L.front ? 2 : 1, d: D([(S[0] + P[0]) / 2, 0], zl), k, draw });
  }
  // collar (a band round the neck) + tag
  {
    const u = nrm(sub(neckEnd, Np)), na = Math.atan2(u[1], u[0]), cc = lerp2(Np, neckEnd, 0.5), nn = rot(u, Math.PI / 2), at = add(cc, mul(nn, 10.2));
    const sw = 0.25 * Math.sin(t * TAU * 1.3) + 0.15 * (K.head?.[1] ?? 0) * 0.3, tg = add(at, [Math.sin(sw) * 2.6, Math.cos(sw) * 2.6]);
    const band = E3(cc, 0, 3.4, 11.6, 10.8, na);
    parts.push({ id: "collar", cat: 3, d: D(cc), k: kBib, draw: (gg) => { blob(gg, [band], { ramp: RED, thick: 1.6 * z, base: 3.7, outline: "#3A0A10" }); drawTag(gg, T3(at), T3(tg), z); } });
  }
  // head
  let an = null;
  {
    const hs = T3(H), lookPitch = 0.6 * Math.max(0, r.pitch) - 0.5 * Math.max(0, -r.pitch), earSw = [K.ear[0] + 0.18 * r.e, K.ear[1] + 0.18 * r.e];
    const common = { t, ears: o.ears ?? 0.5, earSwing: earSw, blink: o.blink ?? 0, mouth: o.mouth ?? 0, pant: o.pant ?? 0, sniff: r.sniff, wet: o.wet ?? 0.5, dry: o.dry, brows: o.brows ?? 0, carry: o.carry ?? null };
    let draw, kHead = 1;
    if (phi >= 0) {
      const psi = Math.min(Math.PI, phi + yaw0 * (Math.PI / 2) * Math.max(0, cs)), fh = psi <= Math.PI / 2 ? 1 : -1, yawH = fh > 0 ? psi / (Math.PI / 2) : (Math.PI - psi) / (Math.PI / 2);
      const M = mapper(hs[0], hs[1], z, f * fh, ha * Math.abs(Math.cos(psi)), HS);
      draw = (gg) => { an = drawHead(gg, M, { ...common, yaw: yawH, look: o.look ?? [0.4 * (1 - yawH), lookPitch] }); };
    } else {
      const ap = -phi, fh = ap <= Math.PI / 2 ? 1 : -1, ub = fh > 0 ? ap / (Math.PI / 2) : (Math.PI - ap) / (Math.PI / 2);
      const sx = lerp(1, 0.45, sm01(ub / 0.8));
      kHead = sm01((sn + 0.55) / 0.3);
      const M = mapper(hs[0], hs[1], z, f * fh, ha * Math.abs(cs), HS), Mf = mapperX(hs[0], hs[1], z, f * fh, ha * Math.abs(cs), HS, sx);
      draw = (gg) => { an = drawHeadAway(gg, M, Mf, { ...common, away: ub, look: o.look ?? [0.4, lookPitch] }); };
    }
    parts.push({ id: "head", cat: 4, d: D(H), k: kHead, draw });
  }

  // ---- paint: behind layer (sorted by depth), torso, front layer (by category, then depth)
  const behind = parts.filter((p) => p.k < 1).sort((p, q) => p.d - q.d);
  for (const p of behind) p.draw(g);
  blob(g, torsoS, { ramp: BLK, thick: 10 * z, base: 2.6, gain: 2.2, slope: 1.0, litOutline: LIT });
  const front = parts.filter((p) => p.k > 0).sort((p, q) => p.cat - q.cat || p.d - q.d);
  for (const p of front) p.draw(p.k >= 1 ? g : fade(g, p.k));
  if (!an) an = {};
  return { ...an, chest: T3(add(C, rot([19, 2], ang))), paws: Object.fromEntries(Object.entries(legs).map(([n, L]) => [n, T3([L.P[0], 0], (n[1] === "n" ? 1 : -1) * (L.front ? WZF : WZH))])) };
}

/** Toe lines: along the paw in profile, spread sideways across its front when seen from the front; gone from behind. */
function toes3(g0, T3, P, pa, zl, z, asn, sn) {
  const v = sm01((z - 1.3) / 0.5) * sm01((sn + 0.3) / 0.3); if (v <= 0.02) return; const g = fade(g0, v);
  for (const dx of [-1.8, 0.6, 3.0]) {
    const xx = lerp(dx, 3.4, asn), zz = zl + (dx - 0.6) * asn;
    const a = T3(add([P[0], P[1]], rot([xx, 0.4], pa)), zz), b = T3(add([P[0], P[1]], rot([xx, 3.0], pa)), zz);
    g.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#8A8AA0");
  }
}
