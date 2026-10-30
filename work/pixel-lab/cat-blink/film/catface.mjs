// «How to say "I love you" in cat» — the orange tabby of ../cat-zoomies/film/cat.mjs, sitting and FACING THE CAMERA
// (the viewer is its owner). Same palettes (CAT / CREAM / PINK / amber iris), cream muzzle, chin and bib, pink nose
// and inner ears, forehead "M", cheek stripes, white whiskers, drawn front-on and cute like the user's black cat
// (big round glossy eyes with two highlights, dithered blush, "w" mouth, dark 1-px outline). Volume shading in flat tone
// bands with Bayer dithering (cat-kit shade engine), everything built from world-unit polygons scaled by G.z, so it is
// crisp at every zoom. Pure functions: the result depends only on the arguments.
//
//   drawCatFront(g, G, wx, wy, st) → anchors { eyeL, eyeR, nose, mouth, head, earL, earR, chest, bbox, eyeRx }
//   drawCatFrontBlend(g, G, wx, wy, A, B, k) → pixel crossfade A → B (layout.mjs gate), anchors lerped
//   slowBlink(t, t0, o) / quickBlink(t, t0) → lid value      drawHeart(g, cx, cy, size, k, o)
//
// g: canvas or any view (fade / gate / litView; only g.px, g.line, g.tint are used). G = ground(cam). (wx, wy) = floor
// point between the front paws. Sitting height to the ear tips ≈ 70 units, head ≈ 34 wide.
import { fade, bayer } from "../../../../renderer/pixel/raster.mjs";
import { R, clamp01, lerp, s01, smr, frac, TAU, add, sub, rot, L2, ell, closed, curve, tubeQ, arcs, project, coverage, shade, nrm, mul } from "../../cat-zoomies/film/cat-kit.mjs";
import { PALETTES } from "../../cat-zoomies/film/cat.mjs";
import { gate } from "../../cat-zoomies/film/layout.mjs";
import { pchip, lidShape, lidU, lidL, pupilWH, drawEye } from "./catface-eye.mjs";
export { lidShape, pupilWH };

const PAL = PALETTES.tabby;
const LIGHT = [-0.7, -0.75];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const inE = (p, cx, cy, rx, ry) => ((p[0] - cx) / rx) ** 2 + ((p[1] - cy) / ry) ** 2 <= 1;
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);

// ---------------------------------------------------------------- geometry (body-local units: root between the front
// paws on the floor, x right, y up negative). The head has its own frame: head-local (0,0) = head centre.
const HEAD_C = [0, -46], NECK = [0, -34];
const HEAD_R = [[0, -13.3], [6.4, -12.9], [11.5, -10.8], [14.9, -6.9], [16.6, -1.9], [17.0, 2.2], [17.6, 6.0], [15.9, 7.3], [16.3, 9.0], [13.1, 10.9], [8.5, 12.7], [3.8, 13.5]];
const HEAD_PTS = [...HEAD_R, [0, 13.7], ...mirror(HEAD_R.slice(1)).reverse()];
const HEAD_SHARP = new Set([6, 8, HEAD_PTS.length - 6, HEAD_PTS.length - 8]);
const HEAD_POLY = closed(HEAD_PTS, HEAD_SHARP, 4);
const EYE = { x: 7.3, y: -1.3, rx: 4.6, ry: 5.0 };
const NOSE = closed([[-1.85, 5.0], [0, 4.75], [1.85, 5.0], [1.3, 6.1], [0.35, 7.15], [-0.35, 7.15], [-1.3, 6.1]], null, 3);
const MOUTH_Y = 8.3;
// tabby markings on the head (segments a → b, half-width w at a tapering to 25 % at b); right side, mirrored
const M_STRIPES = [[[0, -13.6], [0, -8.4], 0.62], [[2.5, -13.4], [1.75, -8.0], 0.55], [[5.2, -12.9], [3.9, -8.5], 0.5], [[8.2, -12.0], [6.2, -9.0], 0.42]];
const SIDE_STRIPES = [[[12.0, -1.9], [16.9, -2.9], 0.55], [[11.8, 1.7], [17.0, 2.8], 0.6], [[12.6, 4.5], [16.6, 6.5], 0.5], [[11.2, -6.8], [15.2, -5.4], 0.48]];
const BROW = [[3.2, -6.6], [10.4, -8.7]];
const segW = (p, a, b, w) => { const dx = b[0] - a[0], dy = b[1] - a[1], k = clamp01(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)); return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k) < w * (1 - 0.75 * k); };

// body: bell-shaped torso, haunches, hind paws peeking out, two front legs with paws, tail around the paws
const TORSO_R = [[0, -40], [8.4, -38.8], [12.0, -31.5], [14.4, -21.5], [15.6, -11.5], [15.4, -4], [12.5, -0.6]];
const TORSO_PTS = [...TORSO_R, [0, 0.1], ...mirror(TORSO_R.slice(1)).reverse()];
const HAUNCH = { x: 12.2, y: -8.8, rx: 7.0, ry: 9.0, rot: 0.2 };
const HPAW = { x: 15.6, y: -2.3, rx: 3.9, ry: 2.5 };
const LEG = { x0: 5.0, y0: -23.5, x1: 5.15, y1: -4.2, r0: 3.75, r1: 3.35 }, PAW = { x: 5.35, y: -2.8, rx: 4.45, ry: 2.9 };

// ear on the right side (mirrored for the left): base points on the head outline, tip from angle + height
const EAR_BO = [14.9, -7.4], EAR_BI = [4.4, -12.9];
export const EAR_FLAT = { h: 9.7, turn: 0.25, swing: 0.7, open: 0.08, dropO: 1.6, dropI: 3, inX: 2 };   // ear = −1 targets
function earGeom(side, e, flick) {
  // e ∈ [−1, 1]: −1 flattened sideways/back ("airplane": the whole ear turns down and out about its outer base, we see
  // more of its back), 0 neutral, 1 perked forward (taller, a touch inward). flick = quick outward flick of one ear.
  const F = EAR_FLAT, ne = e < 0 ? -e : 0;
  const h = e >= 0 ? lerp(12.4, 13.8, e) : lerp(12.4, F.h, ne);
  const turn = (e >= 0 ? -0.1 * e : F.turn * ne) + 0.5 * flick;          // rotation of the whole ear (+ = out/down)
  const swing = 0.3 + F.swing * ne;                                      // tip direction relative to the base
  const open = clamp01((e >= 0 ? lerp(0.85, 1, e) : lerp(0.85, F.open, ne)) - 0.3 * flick);
  const BO = add(EAR_BO, [0, F.dropO * ne]), BI = add(EAR_BI, [F.inX * ne, F.dropI * ne]), Bc = L2(BO, BI, 0.5), T = add(Bc, rot([0, -h * (1 - 0.08 * flick)], swing));
  const sideV = nrm(sub(BI, BO)), up = nrm(sub(T, Bc));
  const outN = nrm(sub(L2(BO, T, 0.5), L2(BI, T, 0.5)));
  const Q0 = add(L2(BO, T, 0.5), mul(outN, 0.9)), Q1 = add(L2(BI, T, 0.5), mul(outN, -0.7));
  const T0 = add(T, mul(sideV, -0.6)), T1 = add(T, mul(sideV, 0.55)), Bm = add(Bc, mul(up, -4));
  const I1 = add(L2(BO, BI, 0.86), mul(up, 0.8)), I0 = add(L2(BO, BI, lerp(0.8, 0.18, open)), mul(up, 0.9)), IT = L2(T, Bc, 0.22);
  const piv = add(BO, [-2.2, 1.2]);
  const R_ = (p) => add(piv, rot(sub(p, piv), turn));
  const f = (p) => { const q = R_(p); return [q[0] * side, q[1]]; };
  return { poly: closed([BO, Q0, T0, T1, Q1, BI, Bm].map(f), new Set([2, 3]), 4), T: f(T), Bc: f(Bc), inner: [I0, IT, I1].map(f), open };
}

// ---------------------------------------------------------------- the cat
/**
 * st (all continuous; cycles are periodic in their phase):
 *   lid 0..1 (0 open, ~0.55 soft eyes, 1 closed) · stare 0..1 · pupil 0..1 (0 slit, 0.5 round, 1 dilated, default 0.55)
 *   look [dx, dy] −1..1 · ear −1..1 · earTwitch 0..1 (screen-right ear) · tilt −1..1 (±12°) · nod 0..1 · mouth 0..1
 *   purrAmt 0..1 (+ purr phase; default 9 × breath, so it stays periodic in breath) · breath phase · tail phase + tailAmt 0..1 · shadow (contact shadow strength, 0.36)
 *   light [x, y] (direction light comes from) · rim (lit outline colour or null)
 */
export function drawCatFront(g, G, wx, wy, st = {}) {
  const pal = PAL, z = G.z;
  const stare = clamp01(st.stare ?? 0), lid = clamp01(st.lid ?? 0) * (1 - stare);
  const L = lidShape(lid), k = 1 + 0.1 * stare;
  const ear = clamp((st.ear ?? 0) - 0.55 * stare, -1, 1), tw = clamp01(st.earTwitch ?? 0);
  const tilt = clamp(st.tilt ?? 0, -1, 1) * 0.21, nod = clamp01(st.nod ?? 0);
  const b = 0.5 - 0.5 * Math.cos(TAU * (st.breath ?? 0));
  const mouth = clamp01(st.mouth ?? 0), purr = clamp01(st.purrAmt ?? 0) * Math.sin(TAU * (st.purr ?? 9 * (st.breath ?? 0)));   // purr phase defaults to 9 tremors per breath
  const tailW = Math.sin(TAU * (st.tail ?? 0)) * clamp01(st.tailAmt ?? 1);
  const look = st.look ?? [0, 0], pupil = pupilWH(st.pupil ?? 0.55, stare);

  const sx0 = G.X(wx), sy0 = G.Y(wy);
  const T = (p) => [sx0 + p[0] * z, sy0 + p[1] * z];
  const inv = (X, Y) => [(X + 0.5 - sx0) / z, (Y + 0.5 - sy0) / z];
  const BS = (p) => [p[0] * (1 + 0.012 * b), p[1] * (1 + 0.024 * b)];          // breathing: chest rises ≈ 1 unit
  const hc = [HEAD_C[0], HEAD_C[1] - 0.95 * b + 2.3 * nod], nk = [NECK[0], NECK[1] - 0.7 * b + 1.2 * nod], off = sub(hc, nk);
  const Hl = (q) => add(nk, rot(add(off, q), tilt)), Hd = (q) => T(Hl(q));
  const HdInv = (X, Y) => sub(rot(sub(inv(X, Y), nk), -tilt), off);
  const common = { light: st.light ?? LIGHT, outline: pal.out, litOutline: st.rim ?? null, inner: "shade" };
  const parts = [];
  const push = (zi, polysScreen, o) => parts.push({ zi, polys: polysScreen, o: { ...common, ...o } });

  // --- eyes (head-local), shared by the head paint and the eye pass
  const eyes = [-1, 1].map((side) => ({ side, cx: side * EYE.x, cy: EYE.y, rx: EYE.rx * k, ry: EYE.ry * k }));

  // --- tail: one curve; the root part is behind the body, the rest lies in front of the paws, tip curling up
  const tpts = curve([[12, -12], [18.8, -10.2], [21.8, -5.6], [20.6, -0.6], [15.4, 1.9], [6, 2.45], [-3, 2.45], [-11, 1.8], [-16.3 + 0.3 * tailW, -0.6 - 0.2 * tailW], [-18.3 + 1.1 * tailW, -4.9 - 0.4 * Math.abs(tailW)], [-16.8 + 2.3 * tailW, -9.0 - 0.9 * Math.abs(tailW) + 0.5 * tailW]], 4);
  const tc = arcs(tpts), TL = tc[tc.length - 1], split = 12;
  const trad = (t) => lerp(3.0, 2.05, t) * (t > 0.92 ? Math.sqrt(Math.max(0.25, 1 - (t - 0.92) / 0.1)) : 1);
  const tailPolys = (a, bIdx, caps) => { const pts = tpts.slice(a, bIdx + 1), t0 = tc[a] / TL, t1 = tc[bIdx] / TL, c = arcs(pts), Ln = c[c.length - 1] || 1; return tubeQ(pts, (t) => trad(lerp(t0, t1, t)), caps).map((p) => p.map(T)); };
  const tailPaint = (X, Y, P) => {
    const pr = project(tpts, tc, inv(X, Y));
    if (pr.s > 9 && frac((pr.s - 9) / 5.6) < 0.36) P.dv = pal.tailRing;
    else if (pr.s > TL - 3.2) P.dv = -0.6;
  };
  const tailO = { ramp: pal.fur, base: 3.4, gain: 1.1, slope: 0.8, thick: 2.6 * z, paint: tailPaint };
  push(5, tailPolys(0, split, [true, true]), { ...tailO, base: 3.0 });
  const jS = tc[split];
  push(80, tailPolys(split, tpts.length - 1, [false, true]), { ...tailO, dtCov: true, lineIf: (X, Y) => project(tpts, tc, inv(X, Y)).s > jS + 1.6 });

  // --- torso with the cream bib and mackerel bands wrapping round the flanks
  const torsoPaint = (X, Y, P) => {
    const l = inv(X, Y), ly = l[1] / (1 + 0.024 * b), ax = Math.abs(l[0]);
    if (inE([l[0], ly], 0, -28.5, 8.6, 7.4 + 0.25 * Math.cos(l[0] * 1.3))) { P.ramp = pal.cream; P.dv = 0.3 - 0.5 * smr(ly, -24, -21); return; }
    if (ax < 2.6 && ly > -21.5) { P.dv = -0.8; return; }                     // shadow between the front legs
    const c = ly + 0.042 * (ax - 4) ** 2 + 0.5 * Math.sin(ax * 0.5), w = 0.27 * smr(ax, 6.5, 14);
    if (w > 0.02 && Math.abs(frac(c / 6.6) - 0.5) < w) { P.dv = pal.stripe; return; }
    if (ax > 13.4) P.dv = pal.dorsal * 0.6;
  };
  push(10, [closed(TORSO_PTS, null, 5).map((p) => T(BS(p)))], { ramp: pal.fur, base: 3.3, gain: 2.0, slope: 1.2, thick: 9 * z, paint: torsoPaint });

  // --- haunches (curved bands across the thighs) and hind paws peeking out at the bottom
  const hau = [-1, 1].map((s) => ({ s, c: [s * HAUNCH.x, HAUNCH.y * (1 + 0.012 * b)], rot: s * HAUNCH.rot }));
  const haunchPaint = (X, Y, P) => {
    const l = inv(X, Y);
    for (const h of hau) {
      const q = rot(sub(l, h.c), -h.rot), qx = q[0] * h.s;
      if ((q[0] / HAUNCH.rx) ** 2 + (q[1] / HAUNCH.ry) ** 2 > 1.05) continue;
      const uu = qx - 0.32 * (q[1] * q[1]) / HAUNCH.ry;
      if (q[1] < HAUNCH.ry * 0.7 && uu > -HAUNCH.rx * 0.35 && Math.abs(frac((uu + 9) / 4.4) - 0.5) < 0.16) P.dv = pal.stripe * 0.85;
      return;
    }
  };
  push(20, hau.map((h) => ell(h.c[0], h.c[1], HAUNCH.rx, HAUNCH.ry, h.rot).map(T)), { ramp: pal.fur, base: 3.15, gain: 1.8, slope: 1.1, thick: 6.5 * z, paint: haunchPaint, mergeTop: true });
  const toePaint = (cx, cy, rx, ry) => (X, Y, P) => {
    const l = inv(X, Y), s = l[0] < 0 ? -1 : 1, u = (l[0] - s * cx) / rx, v = (l[1] - cy) / ry;
    P.dv = 0.45;
    if (z >= 2.2 && v > -0.2 && (Math.abs(u - 0.33) < 0.07 * 4 / (rx * z) * 1.6 || Math.abs(u + 0.33) < 0.07 * 4 / (rx * z) * 1.6)) P.dv = -0.9 * smr(z, 2.2, 3);
  };
  push(25, [-1, 1].map((s) => ell(s * HPAW.x, HPAW.y, HPAW.rx, HPAW.ry, 0).map(T)), { ramp: pal.fur, base: 3.1, gain: 1.2, slope: 0.8, thick: 2.2 * z, paint: toePaint(HPAW.x, HPAW.y, HPAW.rx, HPAW.ry) });

  // --- front legs: bracelets on the outer half, lighter paws with toe creases in close-ups
  const legPaint = (X, Y, P) => {
    const l = inv(X, Y), s = l[0] < 0 ? -1 : 1;
    if (inE(l, s * PAW.x, PAW.y, PAW.rx, PAW.ry)) {
      P.dv = 0.5; const u = (l[0] - s * PAW.x) / PAW.rx, v = (l[1] - PAW.y) / PAW.ry, wv = Math.max(0.05, 0.75 / (PAW.rx * z));
      if (z >= 2 && v > -0.3 && (Math.abs(u - 0.3) < wv || Math.abs(u + 0.3) < wv)) P.dv = 0.5 - 1.5 * smr(z, 2, 2.8);
      return;
    }
    const ly = l[1] / (1 + 0.024 * b * clamp01(-l[1] / 23.5)), outer = (l[0] - s * LEG.x0) * s;
    if (ly < -6.5 && ly > -24 && outer > -1.4 && Math.abs(frac((ly + 40 + 0.35 * outer) / 4.9) - 0.5) < 0.15) P.dv = pal.legStripe;
  };
  const legPolys = [];
  for (const s of [-1, 1]) {
    const top = BS([s * LEG.x0, LEG.y0]);
    legPolys.push(...tubeQ([top, [s * LEG.x1, LEG.y1]], [LEG.r0, LEG.r1]), ell(s * PAW.x, PAW.y, PAW.rx, PAW.ry, 0));
  }
  push(30, legPolys.map((p) => p.map(T)), { ramp: pal.fur, base: 3.15, gain: 1.4, slope: 1.0, thick: 3.6 * z, paint: legPaint, mergeTop: true, dtCov: true });

  // --- ears (behind the head)
  const earsG = [-1, 1].map((s) => earGeom(s, ear, s > 0 ? tw : 0));
  const earPaint = (X, Y, P) => {
    const q = HdInv(X, Y), eg = earsG[q[0] < 0 ? 0 : 1];
    if (eg.open > 0.03 && inTri(q, eg.inner[0], eg.inner[1], eg.inner[2])) { P.ramp = pal.pink; P.dv = 0.4; }
  };
  push(40, earsG.map((e) => e.poly.map(Hd)), { ramp: pal.fur, base: 3.1, gain: 1.2, slope: 0.7, thick: 2.6 * z, paint: earPaint });

  // --- head: lid fur, pale eye rims, cream muzzle and chin, M and cheek stripes, tense brows (stare)
  const mY = 0.8 * mouth;
  const paintHead = (X, Y, P) => {
    const q = HdInv(X, Y);
    let dv = 0;
    for (const E of eyes) {
      const u = (q[0] - E.cx) / E.rx, v = (q[1] - E.cy) / E.ry, r2 = u * u + v * v;
      if (r2 > 1.9) continue;
      const r = Math.sqrt(r2);
      dv = 0.5 * smr(v, -0.15, 0.75) * (1 - smr(r, 1.0, 1.34));               // pale fur under the eye (tabby "liner")
      if (r < 1) { const uo = u * E.side, top = lidU(L, u, uo); if (v < top) dv += 0.38 * smr(v, top - 0.32, top) * (1 - smr(r, 0.86, 1)); }  // lid edge catches light
      break;
    }
    if (dv > 0.02) { P.dv = dv; return; }
    if (inE(q, 2.45, 8.2, 3.5, 2.55) || inE(q, -2.45, 8.2, 3.5, 2.55) || inE(q, 0, 11.1 + mY, 4.1, 2.7)) { P.ramp = pal.cream; P.dv = 0.4; return; }
    if (inE(q, 0, 2.6, 2.4, 4.6)) P.dv = 0.3;                                 // nose bridge
    const ax = Math.abs(q[0]), p = [ax, q[1]];
    for (const [a, bb, w] of M_STRIPES) if (segW(p, a, bb, w)) { P.dv = pal.stripe; return; }
    for (const [a, bb, w] of SIDE_STRIPES) if (segW(p, a, bb, w)) { P.dv = pal.stripe * 0.88; return; }
    if (stare > 0.02 && segW(p, BROW[0], BROW[1], 0.42 * stare)) { P.dv = pal.stripe * 0.95; return; }
  };
  push(50, [HEAD_POLY.map(Hd)], { ramp: pal.fur, base: 3.45, gain: 1.9, slope: 1.1, thick: 8 * z, paint: paintHead });

  // --- bbox / coverage / clip
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) for (const poly of p.polys) for (const q of poly) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
  const wk = [Hd([-24, 9]), Hd([24, 9])]; x0 = Math.min(x0, wk[0][0], wk[1][0]); x1 = Math.max(x1, wk[0][0], wk[1][0]);
  const cov = coverage(x0 - 2, y0 - 2, x1 + 3, y1 + 3);
  const clip = [-8, -8, (g.w ?? 4000) + 8, (g.h ?? 4000) + 8];

  // --- contact shadow
  const sh = st.shadow ?? 0.36;
  if (sh > 0 && g.tint) {
    const cx = sx0, rx = 25 * z, ry = Math.max(2, 4.6 * z), cy = sy0 + 1.8 * z;
    g.tint(R(cx - rx), R(cy - ry), R(2 * rx), R(2 * ry), (X, Y) => { const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; return d >= 1 ? 0 : sh * (1 - d) * 1.3; }, "#000000", 3);
  }

  parts.sort((a, b2) => a.zi - b2.zi);
  let faceDone = false;
  const drawFace = () => {
    faceDone = true;
    // eyes
    for (const E of eyes) {
      const c = Hd([E.cx, E.cy]);
      drawEye(g, { x: c[0], y: c[1], rx: E.rx * z, ry: E.ry * z, ang: tilt, side: E.side, L, z, look, pupil, iris: pal.iris, out: pal.out, pupilCol: pal.pupil, lowCol: pal.out });
    }
    // nose (volume-shaded pink)
    { const np = [NOSE.map((p) => Hd(p))], no = { ramp: pal.pink, base: 3.5, gain: 1.3, slope: 1.2, thick: 1.3 * z, light: common.light, clip }, a = smr(z, 2.1, 2.8);
      if (a < 1) shade(gate(g, a, 1), np, { ...no, outline: pal.pink[2] });          // outline darkens over a zoom range
      if (a > 0) shade(gate(g, 0, a), np, { ...no, outline: pal.pink[1] });
      const hp = Hd([-0.7, 5.35]), hp2 = Hd([-0.2, 5.3]);
      fade(g, smr(z, 1.6, 2.2)).px(Math.floor(hp[0]), Math.floor(hp[1]), pal.pink[6]);
      fade(g, smr(z, 3, 3.6)).px(Math.floor(hp2[0]), Math.floor(hp2[1]), pal.pink[6]); }
    // mouth: little mew opening under the "w", then the "w" itself
    const mw = Math.max(1, 0.3 * z);
    if (mouth > 0.02) {
      const oc = [0, MOUTH_Y + 0.55 + 0.75 * mouth], orx = lerp(1.1, 2.1, mouth), ory = 1.7 * mouth;
      const bb = [Hd([oc[0] - orx - 1, oc[1] - ory - 1]), Hd([oc[0] + orx + 1, oc[1] + ory + 1])];
      const ya = Math.floor(Math.min(bb[0][1], bb[1][1]) - 2), yb = Math.ceil(Math.max(bb[0][1], bb[1][1]) + 2), xa = Math.floor(Math.min(bb[0][0], bb[1][0]) - 2), xb = Math.ceil(Math.max(bb[0][0], bb[1][0]) + 2);
      for (let Y = ya; Y <= yb; Y++) for (let X = xa; X <= xb; X++) {
        const q = HdInv(X, Y), d = ((q[0] - oc[0]) / orx) ** 2 + ((q[1] - oc[1]) / ory) ** 2;
        if (d > 1) continue;
        const edge = ((q[0] - oc[0]) / Math.max(0.3, orx - mw / z)) ** 2 + ((q[1] - oc[1]) / Math.max(0.2, ory - mw / z)) ** 2 > 1;
        g.px(X, Y, edge ? pal.out : q[1] > oc[1] + ory * 0.15 ? pal.pink[4] : pal.pink[0]);
      }
    }
    const W = [[0, 7.15], [0, MOUTH_Y]], WL = [[0, MOUTH_Y], [-0.75, MOUTH_Y + 0.75], [-1.6, MOUTH_Y + 0.85], [-2.5, MOUTH_Y + 0.25]];
    for (const line of [W, WL, mirror(WL)]) stroke(g, line.map(Hd), mw, pal.out);
    // blush (checker dither, like the reference)
    const gb = fade(g, smr(z, 0.9, 1.25));
    for (const s of [-1, 1]) {
      const B = [s * 11.0, 4.9], rx = 3.1, ry = 1.55, c = Hd(B), rr = (rx + 0.5) * z;
      for (let Y = Math.floor(c[1] - rr); Y <= Math.ceil(c[1] + rr); Y++) for (let X = Math.floor(c[0] - rr); X <= Math.ceil(c[0] + rr); X++) {
        const q = HdInv(X, Y), d = ((q[0] - B[0]) / rx) ** 2 + ((q[1] - B[1]) / ry) ** 2;
        if (d <= 1 && ((X + Y) & 1) === 0 && (d < 0.55 || bayer(X, Y) > d - 0.3)) gb.px(X, Y, pal.blush);
      }
    }
    // whisker-pad follicle dots (close-ups)
    if (z >= 2.4) { const gd = fade(g, smr(z, 2.4, 3.2)); for (const s of [-1, 1]) for (const [dx, dy] of [[2.3, 7.6], [3.6, 7.9], [2.9, 8.8], [4.3, 8.9], [3.5, 9.8]]) { const d = Hd([s * dx, dy]); gd.px(Math.floor(d[0]), Math.floor(d[1]), pal.cream[2]); if (z >= 5) gd.px(Math.floor(d[0]) + 1, Math.floor(d[1]), pal.cream[2]); } }
    // whiskers: thin white tapered strokes fanning out of the pads (spread forward on a stare, tremble with the purr)
    for (const s of [-1, 1]) {
      [[2.9, 7.7, 22.6, 3.6], [3.2, 8.5, 23.4, 8.4], [2.9, 9.3, 22.0, 12.9]].forEach(([ax, ay, bx, by], i) => {
        const A = [s * ax, ay], B = [s * bx, by - 2.2 * stare * (1.2 - 0.4 * i) + purr * (0.35 + 0.1 * i)];
        whisker(g, Hd(A), Hd(L2(A, B, 0.55)), Hd(B), z, pal.whisker, cov);
      });
    }
    // inner-ear tufts (close-ups)
    if (z >= 2) for (const eg of earsG) {
      const a0 = s01((z - 2) / 0.7) * s01((eg.open - 0.1) / 0.4); if (a0 <= 0.02) continue;
      const gh = fade(g, a0), [I0, IT, I1] = eg.inner;
      for (const kk of [0.35, 0.68]) { const A = Hd(L2(L2(I0, I1, kk), eg.Bc, 0.05)), B = Hd(L2(L2(I0, I1, kk), IT, 0.62)); gh.line(Math.floor(A[0]), Math.floor(A[1]), Math.floor(B[0]), Math.floor(B[1]), pal.pink[6]); }
    }
  };
  for (const p of parts) {
    if (!faceDone && p.zi > 50) drawFace();
    shade(g, p.polys, { ...p.o, clip }, cov);
  }
  if (!faceDone) drawFace();

  const el = Hd([-EYE.x, EYE.y]), er = Hd([EYE.x, EYE.y]);
  return {
    eyeL: el, eyeR: er, nose: Hd([0, 5.8]), mouth: Hd([0, MOUTH_Y + 0.5]), head: Hd([0, 0]), earL: Hd(earsG[0].T), earR: Hd(earsG[1].T),
    chest: T(BS([0, -24])), bbox: [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)],
    eyeRx: EYE.rx * k * z,   // eye horizontal radius in px (handy for placing hearts / tags)
  };
}

const lerpPt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/** Pixel crossfade between two states (B through gate(g, 0, k), A through gate(g, k, 1)); anchors are interpolated. */
export function drawCatFrontBlend(g, G, wx, wy, stA, stB, k) {
  k = clamp01(k);
  if (k <= 0) return drawCatFront(g, G, wx, wy, stA);
  if (k >= 1) return drawCatFront(g, G, wx, wy, stB);
  const a = drawCatFront(gate(g, k, 1), G, wx, wy, stA), b = drawCatFront(gate(g, 0, k), G, wx, wy, stB), o = {};
  for (const n of Object.keys(a)) o[n] = n === "bbox" ? [Math.min(a.bbox[0], b.bbox[0]), Math.min(a.bbox[1], b.bbox[1]), Math.max(a.bbox[2], b.bbox[2]), Math.max(a.bbox[3], b.bbox[3])] : Array.isArray(a[n]) ? lerpPt(a[n], b[n], k) : lerp(a[n], b[n], k);
  return o;
}

const inTri = (p, a, b, c) => { const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };

/** Polyline of width w px: a 1-px Bresenham core plus a filled band once w > 1 (grows continuously with the zoom). */
function stroke(g, pts, w, col) {
  for (let i = 0; i < pts.length - 1; i++) {
    const A = pts[i], B = pts[i + 1];
    g.line(Math.floor(A[0]), Math.floor(A[1]), Math.floor(B[0]), Math.floor(B[1]), col);
    if (w > 1.05) for (const p of tubeQ([A, B], w / 2)) g.poly(p, col);
  }
}
/** Whisker: curved 1-px stroke A → M → B, visible only outside the head silhouette (as in the reference: whiskers come
 *  out of the cheek edge). In close-ups its first visible third thickens by a second row dithering in over z 3.2 … 4. */
function whisker(g, A, M, B, z, col, cov) {
  const pts = curve([A, M, B], 8), n = pts.length - 1, thick = smr(z, 3.2, 4);
  const covAt = (X, Y) => { const x = X - cov.x0, y = Y - cov.y0; return x >= 0 && y >= 0 && x < cov.W && y < cov.H && cov.m[y * cov.W + x] === 1; };
  let first = -1;
  for (let i = 0; i <= n && first < 0; i++) if (!covAt(Math.floor(pts[i][0]), Math.floor(pts[i][1]))) first = i;
  if (first < 0) return;
  const v = Object.create(g); v.px = (X, Y, c) => { if (!covAt(Math.floor(X), Math.floor(Y))) g.px(X, Y, c); };
  for (let i = Math.max(0, first - 1); i < n; i++) v.line(Math.floor(pts[i][0]), Math.floor(pts[i][1]), Math.floor(pts[i + 1][0]), Math.floor(pts[i + 1][1]), col);
  if (thick > 0) { const gt = fade(v, thick), e = first + Math.ceil((n - first) * 0.35); for (let i = Math.max(0, first - 1); i < e; i++) gt.line(Math.floor(pts[i][0]), Math.floor(pts[i][1]) + 1, Math.floor(pts[i + 1][0]), Math.floor(pts[i + 1][1]) + 1, col); }
}

// ---------------------------------------------------------------- timing helpers (lid values)
/** Canonical slow blink starting at t0: narrow to soft eyes (o.narrow 0.5 s, to o.soft 0.55), close (o.close 0.4 s),
 *  hold closed (o.hold 0.8 s), open (o.open 0.6 s). C¹-smooth, monotone between keys; 0 before and after. */
export function slowBlink(t, t0, o = {}) {
  const n = o.narrow ?? 0.5, c = o.close ?? 0.4, h = o.hold ?? 0.8, op = o.open ?? 0.6, soft = o.soft ?? 0.55;
  return clamp01(pchip([0, n, n + c, n + c + h, n + c + h + op], [0, soft, 1, 1, 0], t - t0));
}
/** Ordinary quick blink at t0 (≈ 0.23 s: close 0.07, hold 0.04, open 0.12). */
export function quickBlink(t, t0) { return clamp01(pchip([0, 0.07, 0.11, 0.23], [0, 1, 1, 0], t - t0)); }
/** Length in seconds of slowBlink with options o. */
export const slowBlinkLength = (o = {}) => (o.narrow ?? 0.5) + (o.close ?? 0.4) + (o.hold ?? 0.8) + (o.open ?? 0.6);

// ---------------------------------------------------------------- heart
export const HEART = ["#3A0A18", "#7A1430", "#B81E44", "#E03056", "#F2607A", "#FA9AAE", "#FFD2DC", "#FFFFFF"];
const backOut = (x, c1 = 1.5) => { const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
/**
 * A small cute pixel heart centred at (cx, cy) screen px, `size` = width in px at rest. k 0..1 pops it in: scale with a
 * soft overshoot (0 → 1.12 → 1) and an ordered-dither dissolve over the first half, so it never appears in one frame.
 * o: { a = 1 (extra dissolve, e.g. for the exit), outline = HEART[0], ramp = HEART }.
 */
export function drawHeart(g, cx, cy, size, k, o = {}) {
  k = clamp01(k); const a = smr(k, 0, 0.5) * clamp01(o.a ?? 1); if (a <= 0) return;
  const s = backOut(clamp01(k / 0.8)), Wd = size * Math.max(0, s); if (Wd < 2) return;
  const gv = fade(g, a), ramp = o.ramp ?? HEART, out = o.outline ?? ramp[0];
  const sc = Wd / 2.28, f = (x, y) => { const q = x * x + y * y - 1; return q * q * q - x * x * y * y * y; };
  const at = (X, Y) => f((X + 0.5 - cx) / sc, -(Y + 0.5 - cy) / sc + 0.12) <= 0;
  const y0 = Math.floor(cy - 1.25 * sc) - 1, y1 = Math.ceil(cy + 1.2 * sc) + 1, x0 = Math.floor(cx - 1.2 * sc) - 1, x1 = Math.ceil(cx + 1.2 * sc) + 1;
  const hr = Math.max(0.6, 0.2 * sc);
  for (let Y = y0; Y <= y1; Y++) for (let X = x0; X <= x1; X++) {
    if (!at(X, Y)) continue;
    if (!at(X - 1, Y) || !at(X + 1, Y) || !at(X, Y - 1) || !at(X, Y + 1)) { gv.px(X, Y, out); continue; }
    const hx = (X + 0.5 - cx) / sc, hy = -(Y + 0.5 - cy) / sc + 0.12;
    if ((hx + 0.52) ** 2 + ((hy - 0.62) / 1.25) ** 2 <= (hr / sc) ** 2 * (sc < 5 ? 1.6 : 1)) { gv.px(X, Y, ramp[7]); continue; }
    let v = 4.2 + 0.9 * hy - 0.75 * hx;
    if (!at(X + 1, Y + 1) || !at(X + 2, Y + 2)) v -= 1.1;            // shadow rim lower-right
    if (!at(X - 2, Y - 2)) v += 0.9;                                   // lit rim upper-left
    const fl = Math.floor(v), fr = v - fl, q = fr < 0.38 ? fl : fr > 0.62 ? fl + 1 : (fr - 0.38) / 0.24 > bayer(X, Y) ? fl + 1 : fl;
    gv.px(X, Y, ramp[Math.max(1, Math.min(6, q))]);
  }
  if (sc >= 4) { const px = cx + 0.12 * sc, py = cy - 0.42 * sc; gv.px(Math.floor(px), Math.floor(py), ramp[7]); }
}
