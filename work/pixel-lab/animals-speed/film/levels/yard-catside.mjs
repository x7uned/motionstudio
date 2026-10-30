// Copied from ../../../cat-zoomies/film/cat.mjs for LV4 (only change: st.headScale, a chibi head for this film).
// «Why your cat sleeps all day…» — the orange tabby actor, side view, many poses (and the African wildcat for the dream).
// Look from ../../cat-drink/film/cat.mjs (CAT / CREAM / PINK ramps, stripes, cream muzzle and chest, pink nose and inner
// ear, whiskers, volume shading) rebuilt as a full-body rig: two-bone IK legs, spine tube, keyed tail, a big round
// glossy eye (cute.mjs style) that closes into a soft lash curve. Pure functions: everything depends on the arguments.
//
//   drawCat(g, G, wx, wy, st)            → anchors { nose, eye, ear, head, mouth, tailTip, pawFront, pawHind, bbox }
//   drawCatBlend(g, G, wx, wy, A, B, k)  → pixel crossfade A → B through layout.mjs gate(); anchors lerped
//
// g: canvas or a fade/gate view (only g.px/poly/line/tint are used); G = ground(cam); (wx, wy) = floor point under the
// middle of the body; st.pose ∈ POSE_NAMES; st.facing 1 | −1; st.palette "tabby" | "wild". See README in the report.
import { mix, fade, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { gate } from "./yard-gate.mjs";
import { R, clamp01, lerp, s01, frac, TAU, add, sub, mul, len, nrm, rot, L2, ell, closed, curve, tubeQ, project, arcs, furry, coverage, shade, chain } from "./yard-catkit.mjs";
import { poseRig, POSES, WALK_STRIDE, runStride, CLIMB_STRIDE, PAW_Y, LF1 } from "./yard-catrig.mjs";
export { WALK_STRIDE, runStride, CLIMB_STRIDE };
export const POSE_NAMES = ["sleep", ...Object.keys(POSES)];

// ---------------------------------------------------------------- palettes
export const CAT = ["#2A1206", "#5A2A10", "#8A4418", "#B8642A", "#D9873E", "#EDA95A", "#F6C982", "#FCE6BC"];
export const CREAM = ["#3A2414", "#7A5A3A", "#B8946A", "#DCC096", "#EEDDB8", "#F8EED6", "#FDF7EA", "#FFFFFF"];
export const PINK = ["#3A0A18", "#6A1A30", "#9A2E48", "#C84A62", "#E26E80", "#F29AA6", "#FAC6CC", "#FDE8EA"];
const AMBER = ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"];
const WILD_FUR = ["#1E1910", "#3E3424", "#635540", "#8A785A", "#AA9876", "#C6B590", "#DDCFAC", "#EFE6CA"];
const WILD_CREAM = ["#2E2A20", "#5E584A", "#8E8670", "#B8AF96", "#D6CEB6", "#E8E2CE", "#F4F0E4", "#FFFFFF"];
const RUFOUS = ["#2A1408", "#5A2E14", "#8A4A24", "#B0663A", "#C88452", "#DCA474", "#ECC49A", "#F8E0C4"];
const GOLDGREEN = ["#1A2008", "#3A4A10", "#5E7418", "#86981E", "#AEB82A", "#CCD048", "#E2E27A", "#F4F4B8"];
const INK = ["#0A0806", "#14110C", "#201C16", "#2C2720", "#3A342A", "#4A4236", "#5A5244", "#6A6252"];
export const PALETTES = {
  tabby: { fur: CAT, cream: CREAM, pink: PINK, ear: CAT, iris: AMBER, out: "#24100A", inner: "#6E3414", stripe: -1.5, legStripe: -0.8, tailRing: -1.2, tip: null, dorsal: -0.7, belly: 0.45, whisker: "#FDF4E0", blush: "#F27A9A", pupil: "#170A05" },
  wild: { fur: WILD_FUR, cream: WILD_CREAM, pink: PINK, ear: RUFOUS, iris: GOLDGREEN, out: "#16120C", inner: "#4A4030", stripe: -0.75, legStripe: -1.3, tailRing: -1.9, tip: INK, dorsal: -0.6, belly: 0.62, whisker: "#F4F0E2", blush: "#E88A8A", pupil: "#0E0C08" },
};

// ---------------------------------------------------------------- head (head-local units: centre 0,0, facing right)
const HEAD_PTS = [[-10.8, -0.6], [-9.6, -6.0], [-5.6, -9.6], [0.2, -10.6], [5.4, -9.7], [9.2, -7.2], [11.4, -4.2], [12.9, -1.6], [13.7, 0.6], [13.2, 2.5], [11.9, 3.7], [11.3, 5.3], [9.7, 6.9], [6.9, 8.0], [2.8, 8.5], [-1.2, 9.0], [-3.9, 10.5], [-5.4, 9.3], [-7.8, 9.6], [-8.9, 7.7], [-11.2, 6.6], [-10.9, 3.4]];
const HEAD_SHARP = new Set([16, 18, 20]);
const HEAD_POLY = closed(HEAD_PTS, HEAD_SHARP, 4);
const EYE_C = [5.5, -1.7], EYE_RX = 3.3, EYE_RY = 3.7;
const NOSE_TIP = [13.8, 0.4], MOUTH_C = [11.4, 3.6];
const EAR_N = { B0: [-7.0, -6.4], B1: [1.0, -9.7], h: 10.8, tilt0: 0.2 };
const EAR_F = { B0: [-0.6, -9.7], B1: [5.8, -7.5], h: 9.6, tilt0: -0.05 };

function earGeom(E, ear, far) {
  const tilt = E.tilt0 + ear.tilt + 0.55 * (ear.flick ?? 0), h = E.h * ear.h * (1 - 0.12 * (ear.flick ?? 0)) * (far ? 0.98 : 1);
  const Bc = L2(E.B0, E.B1, 0.5), T = add(Bc, rot([0, -h], -tilt));
  const side = nrm(sub(E.B1, E.B0)), up = nrm(sub(T, Bc));
  const out0 = nrm(sub(L2(E.B0, T, 0.5), L2(E.B1, T, 0.5)));
  const Q0 = add(L2(E.B0, T, 0.5), mul(out0, 0.8)), Q1 = add(L2(E.B1, T, 0.5), mul(out0, -0.55));
  const T0 = add(T, mul(side, -0.55)), T1 = add(T, mul(side, 0.45)), Bm = add(Bc, mul(up, -3.2));
  const poly = closed([E.B0, Q0, T0, T1, Q1, E.B1, Bm], new Set([2, 3]), 4);
  const o = clamp01(ear.open);
  const I1 = add(L2(E.B0, E.B1, 0.84), mul(up, 0.6)), I0 = add(L2(E.B0, E.B1, 0.84 - 0.66 * o), mul(up, 0.6)), IT = L2(T, Bc, 0.24);
  return { poly, T, Bc, inner: [I0, IT, I1], open: o };
}
const inTri = (p, a, b, c) => { const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]), d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]), d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]); return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0)); };
const segD = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], k = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(p[0] - a[0] - dx * k, p[1] - a[1] - dy * k); };
const inPoly = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
const inE = (p, cx, cy, rx, ry, r = 0) => { let x = p[0] - cx, y = p[1] - cy; if (r) { const c = Math.cos(-r), s = Math.sin(-r); [x, y] = [x * c - y * s, x * s + y * c]; } return (x / rx) ** 2 + (y / ry) ** 2 <= 1; };

const HEAD_M = [[[-1.8, -9.9], [-0.9, -6.6]], [[1.6, -10.2], [2.0, -6.9]], [[4.9, -9.4], [4.5, -6.4]]];
const HEAD_CHEEK = [[[1.0, 1.5], [-5.4, 2.2], 0.6], [[0.6, 3.9], [-4.6, 5.7], 0.5], [[-6.2, -5.0], [-9.8, -3.6], 0.55]];

// ---------------------------------------------------------------- the big round glossy eye (cute.mjs style)
/** (x, y) eye centre px, rx/ry px, ang = head rotation on screen, f = facing. o: open, big, look, iris, out, pupil, z. */
function catEye(g, x, y, rx, ry, ang, f, o) {
  const open = clamp01(o.open), big = clamp01(o.big), lk = o.look, iris = o.iris, out = o.out, Z = o.z;
  const ca = Math.cos(-ang), sa = Math.sin(-ang);
  const loc = (X, Y) => { const dx = X - x, dy = Y - y; return [(dx * ca - dy * sa) * f, dx * sa + dy * ca]; }; // eye-local, forward = +x
  const toS = (ex, ey) => { const dx = ex * f, c = Math.cos(ang), s = Math.sin(ang); return [x + dx * c - ey * s, y + dx * s + ey * c]; };
  // one continuous lid model: the upper-lid edge goes from a low ⌣ lash curve (closed) to a ⌒ arc above the eye (open);
  // the aperture between it and the lower lid opens smoothly, so closed → slit → round never jumps.
  const e = s01(open / 0.35), hc = lerp(ry * 0.52, -ry * 1.15, open), cv = lerp(ry * 0.34, -ry * 0.26, e), sl = (o.slant ?? 0) * (0.3 + 2.8 * open * (1 - open));
  const lidY = (ex) => { const u = Math.max(-1, Math.min(1, ex / rx)); return hc + cv * (1 - u * u) - sl * u * ry; };
  const ap = s01(open / 0.12);                                            // lower-lid aperture
  const lw = Math.max(1, R(Z * 0.32));
  if (ap > 0) {
    const prx = rx * lerp(0.46, 0.66, big), pry = ry * lerp(0.55, 0.74, big), pcx = lk[0] * rx * 0.24, pcy = lk[1] * ry * 0.18 + ry * 0.04;
    const tiny = rx < 4.2;
    for (let Y = Math.floor(y - ry - 2); Y <= Math.ceil(y + ry + 2); Y++) for (let X = Math.floor(x - rx - 2); X <= Math.ceil(x + rx + 2); X++) {
      const [ex, ey] = loc(X + 0.5, Y + 0.5), q = (ex / (rx + 0.5)) ** 2 + (ey / (ry + 0.5)) ** 2;
      if (q > 1) continue;
      const top = lidY(ex), bot = lerp(top, ry * Math.sqrt(Math.max(0, 1 - (ex / (rx + 0.5)) ** 2)) + 0.5, ap);
      if (ey < top || ey > bot) continue;
      const edge = (ex / Math.max(0.5, rx - 0.55)) ** 2 + (ey / Math.max(0.5, ry - 0.55)) ** 2 > 1;
      if (edge) { g.px(X, Y, out); continue; }
      let col;
      if (((ex - pcx) / prx) ** 2 + ((ey - pcy) / pry) ** 2 <= 1) col = o.pupil;
      else {
        const v = (ey + ry) / (2 * ry), s = v * (iris.length - 2.2) + 0.6, lo = Math.floor(s);
        col = iris[Math.max(1, Math.min(iris.length - 1, s - lo > 0.5 ? lo + 1 : lo))];
        if (ey - top < ry * 0.32 || v < 0.22) col = iris[tiny ? 2 : 1];
      }
      g.px(X, Y, col);
    }
    // highlights: big upper (towards the light, screen-left/up), small lower-forward; only where the eye is open
    const vis = (ex, ey, m) => ey - m > lidY(ex) && ap > 0.6;
    const hr = Math.max(0.7, rx * lerp(0.3, 0.36, big)), H1 = [x - rx * 0.3 * f + pcx * 0.4 * f, y - ry * 0.36];
    const h1 = loc(H1[0], H1[1]);
    if (vis(h1[0], h1[1], hr * 0.5)) {
      if (tiny) { g.px(Math.floor(H1[0]), Math.floor(H1[1]), "#FFFFFF"); if (rx >= 3) g.px(Math.floor(H1[0]) + 1, Math.floor(H1[1]), "#FFFFFF"); }
      else for (let Y = Math.floor(H1[1] - hr); Y <= Math.ceil(H1[1] + hr); Y++) for (let X = Math.floor(H1[0] - hr); X <= Math.ceil(H1[0] + hr); X++) if (((X + 0.5 - H1[0]) / hr) ** 2 + ((Y + 0.5 - H1[1]) / (hr * 1.1)) ** 2 <= 1) g.px(X, Y, "#FFFFFF");
    }
    const H2 = toS(rx * 0.34, ry * 0.36);
    if (vis(rx * 0.34, ry * 0.36, 0.5) && rx >= 2.6) { const X = Math.floor(H2[0]), Y = Math.floor(H2[1]); g.px(X, Y, "#FFFFFF"); if (rx >= 8) { g.px(X + 1, Y, "#FFFFFF"); g.px(X, Y + 1, "#FFFFFF"); g.px(X + 1, Y + 1, "#F4ECD8"); } }
  }
  // lid edge / lash line (always the same curve, so the closed line morphs into the open lid)
  if (open < 0.97) {
    const n = Math.ceil(rx * 5);
    for (let i = 0; i <= n; i++) {
      const ex = -rx * 1.02 + (2.04 * rx * i) / n, ey = lidY(ex), lim = ry * Math.sqrt(Math.max(0, 1 - (ex / (rx + 0.4)) ** 2)) + 0.3;
      if (ey < -lim - 0.2 || ey > lim + 0.2) continue;
      const [sx, sy] = toS(ex, Math.max(-lim, Math.min(lim, ey)));
      for (let k = 0; k < lw; k++) g.px(Math.floor(sx), Math.floor(sy) - (open > 0.3 ? k : 0) + (open > 0.3 ? 0 : k), out);
    }
    // lashes at the outer (back) corner shrink away as the eye opens
    const lash = 1 - s01(open / 0.3);
    if (rx >= 2.5 && lash > 0.05) for (const u of [-0.8, -0.45]) {
      const ex = u * rx, ey = lidY(ex), A = toS(ex, ey), B = toS(ex - rx * 0.2 * lash, ey + ry * 0.32 * lash);
      for (let k = 0; k < lw; k++) g.line(Math.floor(A[0]), Math.floor(A[1]) + k, Math.floor(B[0]), Math.floor(B[1]) + k, out);
    }
  }
}

// ---------------------------------------------------------------- sleep (curled donut on its side)
function sleepRig(st) {
  const b = 0.5 - 0.5 * Math.cos(TAU * (st.breath ?? 0)), lift = clamp01(st.head ?? 0);
  const ear = clamp01(st.ear ?? 0), tw = clamp01(st.earTwitch ?? 0), eye = clamp01(st.eye ?? 0);
  const tAmt = clamp01(st.tailAmt ?? 0), tw2 = Math.sin(TAU * (st.tail ?? 0)) * tAmt;
  const top = -28.6 - 1.0 * b;
  const body = [ell(-1.5, -14.4 - 0.5 * b, 23.5, 14.2 + 0.5 * b), ell(-1.5, -6.9, 24, 6.6), ell(9, -11 - 0.3 * b, 12, 10 + 0.3 * b, 0.15)];
  const spine = curve([[-22, -8], [-16, -21 - 0.6 * b], [-3, -27 - 0.9 * b], [8, -23.5 - 0.6 * b], [15, -15]], 5);
  const head = { c: [16.5, -12.4 - 0.3 * b - 7 * lift], a: lerp(0.4, 0.04, lift) };
  const haunch = { kind: "blob", haunch: true, far: false, polys: [ell(-11.5, -13.6 - 0.4 * b, 11.6, 11 + 0.3 * b, -0.25), ell(-1.5, -3.4, 5.2, 2.7, 0.06)], legPts: [[-17, -17], [-1.5, -3.4]] };
  const pawF = { kind: "blob", far: true, polys: [ell(29.5, -2.7, 4.1, 2.5, 0)], legPts: [[26, -6], [29.5, -2.7]] };
  const pawN = { kind: "blob", far: false, front: true, polys: [ell(26.2, -3.2, 4.5, 2.8, 0.06), ell(20.5, -4.4, 5.6, 3.1, 0.18)], legPts: [[15, -6], [26.2, -3.2]] };
  const tpts = curve([[-22, -7.5], [-26, -3.3], [-19, -2.8], [-4, -2.8], [10, -2.7], [21, -2.7], [29, -3.2 - 0.5 * tw2], [33.5 + 0.6 * tw2, -5.2 - 2.6 * tw2]], 4);
  return {
    torso: { polys: body, spine, radF: () => 11.5, bibs: [[13, -6, 5, 4, 0]], bellyRule: false },
    legs: [pawF, haunch, pawN],
    tail: { pts: tpts, r0: 3.1, r1: 1.9, layer: "front" },
    head, puff: 0, shadow: true, sleep: true,
    face: { open: eye * (1 - clamp01(st.blink ?? 0)), big: clamp01(st.eyeBig ?? 0), look: [0.3, 0.2], mouth: 0, tongue: 0,
      ear: { tilt: lerp(0.62, -0.18, s01(ear)), h: lerp(0.86, 1.12, s01(ear)), open: lerp(0.08, 1, s01(ear)), flick: tw },
      earF: { tilt: lerp(0.55, 0.25, ear), h: lerp(0.84, 0.95, ear), open: 0.1, flick: 0 } },
    top,
  };
}

// ---------------------------------------------------------------- drawing
const LIGHT = [-0.7, -0.75];
function legPolys(L) {
  if (L.kind === "blob") return L.polys;
  if (L.kind === "front") {
    const [S, E, W, P] = L.pts;
    return [...tubeQ([S, E], [5.4, 4.0]), ...tubeQ([E, W], [3.9, 3.1]), ...tubeQ([W, P], [3.0, 2.9]), ell(P[0], P[1], 4.0, 2.55, L.pa, 18)];
  }
  const [H, K, A, P] = L.pts, th = L.thigh, ma = L.pa;
  const footAng = ma > 2 ? Math.PI / 2 : Math.max(-0.2, Math.min(1.2, ma * 0.7));
  return [ell(th.c[0], th.c[1], th.rx, th.ry, th.rot), ...tubeQ([K, A], [4.2, 2.9]), ...tubeQ([A, P], [2.8, 2.6]), ell(P[0], P[1], 4.2, 2.5, footAng, 18)];
}
function torsoOf(rig) {
  if (rig.torso) return rig.torso;
  const polys = [...tubeQ(rig.spine, rig.radF), ...rig.extra.map((e) => ell(e[0], e[1], e[2], e[3], e[4] ?? 0)), ...tubeQ([rig.neck[0], rig.neck[1]], rig.neck[2])];
  if (rig.puff > 0.05) {
    // puffed fur: a furry outline around the spine tube (single polygon: the spine is never curled tightly)
    const sp = rig.spine, n = sp.length, Lp = [], Rp = [];
    for (let i = 0; i < n; i++) { const a = sp[Math.max(0, i - 1)], b = sp[Math.min(n - 1, i + 1)], d = nrm(sub(b, a)), r = rig.radF(i / (n - 1)) + 0.4 * rig.puff; Lp.push([sp[i][0] - d[1] * r, sp[i][1] + d[0] * r]); Rp.push([sp[i][0] + d[1] * r, sp[i][1] - d[0] * r]); }
    polys.push(furry([...Lp, ...Rp.reverse()], 1.5 * rig.puff, 2.6, 3, -0.6));
  }
  return { polys, spine: rig.spine, radF: rig.radF, bibs: rig.bibs, bellyRule: true };
}

/** Draw the cat. Returns anchors in screen px. */
export function drawCat(g, G, wx, wy, st = {}) {
  const pal = PALETTES[st.palette] ?? PALETTES.tabby, f = (st.facing ?? 1) < 0 ? -1 : 1, z = G.z;
  const rig = st.pose === "sleep" ? sleepRig(st) : poseRig(st);
  const sx0 = G.X(wx), sy0 = G.Y(wy);
  const T = (p) => [sx0 + f * p[0] * z, sy0 + p[1] * z];
  const TP = (poly) => poly.map(T);
  const inv = (X, Y) => [(X + 0.5 - sx0) / (f * z), (Y + 0.5 - sy0) / z];
  const HS = st.headScale ?? 1, hd = rig.head, Hl = (q) => add(hd.c, rot(mul(q, HS), hd.a)), Hd = (q) => T(Hl(q));   // headScale: chibi head (this film)
  const HdInv = (X, Y) => mul(rot(sub(inv(X, Y), hd.c), -hd.a), 1 / HS);
  const common = { light: st.light ?? LIGHT, outline: pal.out, litOutline: st.rim ?? null, inner: "shade" };
  const parts = [];
  const add_ = (zi, polys, o, extra = {}) => parts.push({ zi, polys: polys.map(TP), o: { ...common, ...o }, ...extra });

  // --- torso
  const tor = torsoOf(rig), tc = arcs(tor.spine), tL = tc[tc.length - 1];
  const bibs = tor.bibs ?? [];
  const paintTorso = (X, Y, P) => {
    const l = inv(X, Y);
    for (const b of bibs) if (inE(l, b[0], b[1], b[2], b[3], b[4] ?? 0)) { P.ramp = pal.cream; P.dv = 0.3; return; }
    const pr = project(tor.spine, tc, l), r = tor.radF(pr.t), vr = pr.v / r;
    if (tor.bellyRule && vr < -0.6 + 0.05 * Math.sin(pr.s * 0.7) && pr.t > 0.3) { P.ramp = pal.cream; P.dv = pal.belly - 0.4; return; }
    if (pal === PALETTES.wild && tor.bellyRule && vr < -0.45) { P.ramp = pal.cream; P.dv = 0; return; }
    if (vr > -0.18 && pr.t > 0.04 && pr.t < 0.86) {
      // mackerel bands: broad on the back, tapering to points down the flank, slightly wavy
      const ph = frac((pr.s + 0.5 * pr.v + 0.6 * Math.sin(pr.v * 0.55)) / 7.4), w = 0.5 * Math.pow(clamp01((vr + 0.18) / 0.9), 0.7);
      if (Math.abs(ph - 0.5) < w * 0.5) { P.dv = pal.stripe; return; }
    }
    if (vr > 0.78) P.dv = pal.dorsal;
  };
  add_(30, tor.polys, { ramp: pal.fur, base: 3.3, gain: 2.0, slope: 1.3, thick: 9 * z, paint: paintTorso });

  // --- legs
  for (const L of rig.legs) {
    const polys = legPolys(L), far = L.far;
    let paint = null, lineIf = null;
    if (!far) {
      const pts = L.kind === "blob" ? L.legPts : L.pts, lc = arcs(pts), LL = lc[lc.length - 1], Pp = L.P ?? pts[pts.length - 1], th = L.thigh;
      paint = (X, Y, P) => {
        const l = inv(X, Y);
        if (Math.hypot(l[0] - Pp[0], l[1] - Pp[1]) < 3.1) { P.dv = 0.5; return; }
        if (th && inE(l, th.c[0], th.c[1], th.rx, th.ry, th.rot)) {
          // haunch: curved bands across the thigh
          const q = rot(sub(l, th.c), -th.rot), u = q[0] + (0.3 * q[1] * q[1]) / th.ry;
          if (q[1] < th.ry * 0.75 && Math.abs(frac((u + th.rx) / 5.4) - 0.5) < 0.17 && Math.abs(u) < th.rx * 0.8) P.dv = pal.stripe * 0.9;
          return;
        }
        if (L.haunch) { paintTorso(X, Y, P); return; }
        if (L.kind === "blob") return;
        const pr = project(pts, lc, l);
        if (pr.s > LL * 0.3 && pr.s < LL - 5 && Math.abs(frac(pr.s / 4.8) - 0.5) < 0.15) P.dv = pal.legStripe;
      };
      if (L.kind === "front") lineIf = (X, Y) => project(pts, lc, inv(X, Y)).s > LF1 * 0.55;
      else if (th) lineIf = (X, Y) => { const l = inv(X, Y); return l[1] > th.c[1] - th.ry * 0.15 || !inE(l, th.c[0], th.c[1], th.rx + 1.2, th.ry + 1.2, th.rot); };
    }
    const hindLike = L.kind === "hind" || L.haunch;
    const o = far
      ? { ramp: pal.fur, base: 2.1, gain: 0.9, slope: 0.6, thick: 3 * z, litOutline: null, paint }
      : hindLike
        ? { ramp: pal.fur, base: 3.2, gain: 1.8, slope: 1.2, thick: (L.haunch ? 7 : 6.5) * z, paint, lineIf, dtCov: !L.haunch, mergeTop: !!L.haunch }
        : { ramp: pal.fur, base: 3.1, gain: 1.4, slope: 1.0, thick: 3.5 * z, paint, lineIf: L.over ? null : lineIf, dtCov: !L.over && L.kind === "front", mergeTop: L.kind === "blob" };
    const zi = far ? 10 : hindLike ? 40 : L.over ? 75 : rig.sleep && L.front ? 64 : 50;
    add_(zi, polys, o);
  }

  // --- tail
  {
    const tp = rig.tail.pts, c = arcs(tp), TL = c[c.length - 1], puff = rig.puff;
    const rf = (t) => lerp(rig.tail.r0 + 0.9 * puff, rig.tail.r1 + 0.9 * puff, t) * (t > 0.93 ? Math.sqrt(Math.max(0.2, 1 - (t - 0.93) / 0.1)) : 1);
    let polys = tubeQ(tp, rf);
    if (puff > 0.05) {
      const n = tp.length, Lp = [], Rp = [];
      for (let i = 0; i < n; i++) { const a = tp[Math.max(0, i - 1)], b = tp[Math.min(n - 1, i + 1)], d = nrm(sub(b, a)), r = rf(c[i] / TL); Lp.push([tp[i][0] - d[1] * r, tp[i][1] + d[0] * r]); Rp.push([tp[i][0] + d[1] * r, tp[i][1] - d[0] * r]); }
      polys = [...polys, furry([...Lp, ...ell(tp[n - 1][0], tp[n - 1][1], rf(1) + 0.5, rf(1) + 0.5).slice(0, 1), ...Rp.reverse()], 1.6 * puff, 2.4, 9, -0.7)];
    }
    const paint = (X, Y, P) => {
      const pr = project(tp, c, inv(X, Y));
      if (pal.tip && pr.s > TL - 6.5) { P.ramp = pal.tip; P.dv = 1; return; }
      const ringStart = pal.tip ? TL * 0.45 : 7, per = pal.tip ? 5.2 : 5.6;
      if (pr.s > ringStart && frac((pr.s - ringStart) / per) < (pal.tip ? 0.42 : 0.36)) P.dv = pal.tailRing;
      else if (!pal.tip && pr.s > TL - 3.2) P.dv = -0.6;
    };
    add_(rig.tail.layer === "front" ? 70 : 20, polys, { ramp: pal.fur, base: 3.4, gain: 1.1, slope: 0.8, thick: 2.6 * z, paint });
  }

  // --- head and ears
  const face = rig.face, earN = earGeom(EAR_N, face.ear, false), earF = earGeom(EAR_F, face.earF ?? { ...face.ear, open: face.ear.open * 0.5 }, true);
  const earPaint = (eg, near) => (X, Y, P) => {
    const l = HdInv(X, Y);
    if (eg.open > 0.03 && inTri(l, eg.inner[0], eg.inner[1], eg.inner[2])) { P.ramp = pal.pink; P.dv = near ? 0.6 : -0.2; return; }
    if (pal.ear !== pal.fur) { P.ramp = pal.ear; }
  };
  parts.push({ zi: 55, polys: [earF.poly.map(Hd)], o: { ...common, ramp: pal.fur, base: 2.3, gain: 0.8, slope: 0.6, thick: 2 * z, litOutline: null, paint: earPaint(earF, false) } });
  const zPale = s01((z - 1.6) / 0.6);   // zoom-dependent details dissolve in over a zoom range (no pops during camera zooms)
  const paintHead = (X, Y, P) => {
    const l = HdInv(X, Y);
    if (inE(l, 9.9, 4.5, 5.4, 4.3) || inE(l, 5.5, 7.9, 6.2, 2.4)) { P.ramp = pal.cream; P.dv = 0.35; return; }
    if (zPale > bayer(X, Y) && inE(l, EYE_C[0] + 0.2, EYE_C[1] + 0.9, EYE_RX + 1.1, EYE_RY + 0.8) && l[1] > EYE_C[1] + 1.2) { P.dv = 0.8; return; }
    for (const [a, b] of HEAD_M) if (segD(l, a, b) < 0.62) { P.dv = pal.stripe; return; }
    for (const [a, b, w] of HEAD_CHEEK) { const dx = b[0] - a[0], dy = b[1] - a[1], k = clamp01(((l[0] - a[0]) * dx + (l[1] - a[1]) * dy) / (dx * dx + dy * dy)); if (Math.hypot(l[0] - a[0] - dx * k, l[1] - a[1] - dy * k) < w * (1 - 0.75 * k)) { P.dv = pal.stripe * 0.85; return; } }
  };
  parts.push({ zi: 60, polys: [HEAD_POLY.map(Hd)], o: { ...common, ramp: pal.fur, base: 3.4, gain: 2.0, slope: 1.2, thick: 7 * z, paint: paintHead } });
  parts.push({ zi: 62, polys: [earN.poly.map(Hd)], o: { ...common, ramp: pal.fur, base: 3.2, gain: 1.2, slope: 0.8, thick: 2.5 * z, inner: "fill", dtCov: true, rimCov: true, paint: earPaint(earN, true) } });

  // --- coverage + bbox
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of parts) for (const poly of p.polys) for (const q of poly) { if (q[0] < x0) x0 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[0] > x1) x1 = q[0]; if (q[1] > y1) y1 = q[1]; }
  const cov = coverage(x0 - 2, y0 - 2, x1 + 3, y1 + 3);
  const clip = [-8, -8, (g.w ?? 4000) + 8, (g.h ?? 4000) + 8];

  // --- contact shadow on the floor
  const sh = st.shadow ?? (rig.shadow ? 0.38 : 0);
  if (sh > 0 && g.tint) {
    const cx = (x0 + x1) / 2, rx = (x1 - x0) * 0.5 + 2 * z, ry = Math.max(2, 3.2 * z), cy = sy0 - 0.5 * z;
    g.tint(R(cx - rx), R(cy - ry), R(2 * rx), R(2 * ry), (X, Y) => { const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; return d >= 1 ? 0 : sh * (1 - d) * 1.3; }, "#000000", 3);
  }

  parts.sort((a, b) => a.zi - b.zi);
  let faceDone = false;
  const drawFace = () => {
    faceDone = true;
    const E = Hd(EYE_C), ang = hd.a * f;
    catEye(g, E[0], E[1], EYE_RX * z * HS, EYE_RY * z * HS, ang, f, { open: face.open, big: face.big, look: face.look, iris: pal.iris, out: pal.out, pupil: pal.pupil, z, slant: 0.1 + 0.45 * Math.max(0, hd.a) });
    // nose
    const nose = [[12.3, -0.9], [14.0, -0.5], [13.8, 0.9], [12.9, 1.3]].map(Hd);
    { const nt0 = Hd([13.5, 0.1]); g.px(Math.floor(nt0[0]), Math.floor(nt0[1]), pal.pink[3]); const gn = fade(g, s01((z - 1.2) / 0.4)); gn.poly(nose, pal.pink[3]); const nt = Hd([13.4, -0.4]); gn.px(Math.floor(nt[0]), Math.floor(nt[1]), pal.pink[5]); }
    // mouth (open = small mew with a tongue)
    const m = face.mouth, tg = face.tongue;
    if (m > 0.02) {
      // the lower jaw swings down about the mouth corner; only the part that leaves the head silhouette is painted, so
      // the jaw grows out of the chin continuously (no pop); the dark mouth wedge between lip and jaw grows with m
      const jaw = (q) => add([8.4, 3.6], rot(sub(q, [8.4, 3.6]), 0.8 * m));
      const J = [[8.4, 3.6], [12.6, 3.0], [11.9, 4.4], [10.6, 5.6], [9.0, 6.9], [7.4, 7.6]].map(jaw);
      const outside = (X, Y) => !inPoly(HdInv(X, Y), HEAD_POLY);
      g.poly(J.map(Hd), null, (X, Y) => (outside(X, Y) ? pal.cream[4] : null));
      for (let i = 1; i < J.length; i++) { const A = Hd(J[i - 1]), B = Hd(J[i]), n = Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])) + 1; for (let k = 0; k <= n; k++) { const X = Math.floor(lerp(A[0], B[0], k / n)), Y = Math.floor(lerp(A[1], B[1], k / n)); if (outside(X, Y)) g.px(X, Y, pal.out); } }
      g.poly([[13.3, 2.0], [12.9, 2.9], J[1], [8.4, 3.6]].map(Hd), pal.out);
      if (m > 0.25) { g.poly([[12.5, 2.6], L2(J[1], J[0], 0.12), [9.4, 3.5]].map(Hd), pal.pink[1]); g.poly([L2(J[1], J[0], 0.15), L2(J[1], J[0], 0.6), [9.6, 3.6]].map(Hd), pal.pink[4]); }
    }
    if (z >= 1.15) {
      const ml = [[13.3, 1.3], [12.7, 2.9], [11.4, 3.6], [9.6, 3.4]].map(Hd), gm = fade(g, s01((z - 1.15) / 0.4));
      for (let i = 0; i < ml.length - 1; i++) gm.line(Math.floor(ml[i][0]), Math.floor(ml[i][1]), Math.floor(ml[i + 1][0]), Math.floor(ml[i + 1][1]), pal.inner);
    }
    if (tg > 0.04) {
      const a = Hl([12.6, 3.6]), b = Hl([12.6 + 2.6 * tg, 4.0 + 0.5 * tg]), poly = tubeQ([a, b], [1.05, 1.0]).map(TP);
      for (const p of poly) g.poly(p, pal.pink[4]); const tip = T(b); g.px(Math.floor(tip[0]), Math.floor(tip[1]), pal.pink[6]);
    }
    // blush
    if (z >= 1.5) { const gb = fade(g, s01((z - 1.5) / 0.5)), B = Hd([1.8, 4.6]), rx = 2.6 * z, ry = 1.3 * z; for (let Y = Math.floor(B[1] - ry); Y <= B[1] + ry; Y++) for (let X = Math.floor(B[0] - rx); X <= B[0] + rx; X++) { const d = ((X - B[0]) / rx) ** 2 + ((Y - B[1]) / ry) ** 2; if (d <= 1 && ((X + Y) & 1) === 0 && (d < 0.5 || ((X * 7 + Y * 3) & 3) === 0)) gb.px(X, Y, pal.blush); } }
    // whiskers
    if (z >= 1.3) for (const [a, b] of [[[10.4, 2.6], [20.5, 0.4]], [[10.6, 3.2], [20.8, 3.4]], [[10.2, 3.8], [19.2, 6.6]]]) { const A = Hd(a), B = T(add(Hl(a), rot(sub(b, a), hd.a * 0.35))); fade(g, s01((z - 1.3) / 0.45)).line(Math.floor(A[0]), Math.floor(A[1]), Math.floor(B[0]), Math.floor(B[1]), pal.whisker); }
    // inner-ear furnishings (close-ups)
    if (z >= 2.2 && earN.open > 0.05) { const gh = fade(g, s01((z - 2.2) / 0.6) * s01((earN.open - 0.05) / 0.35)), [I0, IT, I1] = earN.inner; for (const k of [0.3, 0.62]) { const a = L2(L2(I0, I1, k), earN.Bc, 0.1), b = L2(a, IT, 0.55 + 0.1 * k); const A = Hd(a), B = Hd(b); gh.line(Math.floor(A[0]), Math.floor(A[1]), Math.floor(B[0]), Math.floor(B[1]), pal.pink[6]); } }
  };
  for (const p of parts) {
    if (!faceDone && p.zi > 62) drawFace();
    shade(g, p.polys, { ...p.o, clip }, cov);
  }
  if (!faceDone) drawFace();

  const tip = rig.tail.pts[rig.tail.pts.length - 1], nearFront = rig.legs.filter((L) => !L.far && (L.kind === "front" || (L.kind === "blob" && !L.haunch)));
  const nearHind = rig.legs.find((L) => !L.far && (L.kind === "hind" || L.haunch));
  const pf = nearFront.length ? (nearFront[0].P ?? nearFront[0].legPts.at(-1)) : [0, 0];
  const ph = nearHind ? (nearHind.P ?? nearHind.legPts.at(-1)) : [0, 0];
  return {
    nose: Hd(NOSE_TIP), eye: Hd(EYE_C), ear: Hd(earN.T), head: Hd([0, 0]), mouth: Hd(MOUTH_C), tailTip: T(tip),
    pawFront: T(pf), pawHind: T(ph), bbox: [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)],
  };
}

const lerpPt = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
/** Pixel crossfade between two cat states: B through gate(g, 0, k), A through gate(g, k, 1). */
export function drawCatBlend(g, G, wx, wy, stA, stB, k) {
  k = clamp01(k);
  if (k <= 0) return drawCat(g, G, wx, wy, stA);
  if (k >= 1) return drawCat(g, G, wx, wy, stB);
  const a = drawCat(gate(g, k, 1), G, wx, wy, stA), b = drawCat(gate(g, 0, k), G, wx, wy, stB), o = {};
  for (const n of Object.keys(a)) o[n] = n === "bbox" ? [Math.min(a.bbox[0], b.bbox[0]), Math.min(a.bbox[1], b.bbox[1]), Math.max(a.bbox[2], b.bbox[2]), Math.max(a.bbox[3], b.bbox[3])] : lerpPt(a[n], b[n], k);
  return o;
}
