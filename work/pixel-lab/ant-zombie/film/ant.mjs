// «Zombie ants» — a carpenter ant in side view (our own drawing, about 11 mm long), at any scale and orientation:
// walking (tripod gait), climbing, upside down under a leaf, shaking, falling (spin), biting (jaws close), dead
// (colour drains, legs splay, white fungus tufts at the joints). X-ray: muscles (pink fibres) and the fungus network
// (green threads) through the whole body except the brain. The spore on its back, the threads it pushes through the
// shell, and the stalk that grows out of the back of the head. Shapes are polygons in local (u forward, v dorsal) mm.
import { mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { END } from "./timeline.mjs";
/** phase (radians) of an oscillation near f Hz with a whole number of cycles over the loop */
const PH = (t, f) => { const n = Math.max(1, Math.round(f * END)); return 2 * Math.PI * (n / END) * (((t % END) + END) % END); };

const R = Math.round;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const rnd = (n) => { let h = (n * 374761393 + 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export const toScreen = (cam, wx, wy) => [270 + (wx - cam.cx) * cam.z, (cam.ay ?? 480) + (wy - cam.cy) * cam.z];
/** a thick line in screen px */
export function tline(c, x0, y0, x1, y1, w, col) {
  if (w <= 1.3) { c.line(R(x0), R(y0), R(x1), R(y1), col); return; }
  const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * w / 2, ny = (dx / L) * w / 2;
  c.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], col);
  if (w > 3) { c.disc(R(x0), R(y0), Math.max(1, R(w / 2 - 0.5)), col); c.disc(R(x1), R(y1), Math.max(1, R(w / 2 - 0.5)), col); }
}
/** filled ellipse given in local coordinates through a mapping fn (u, v) → [sx, sy] */
function lellipse(c, map, u0, v0, ru, rv, col, n = 22) { const pts = []; for (let i = 0; i < n; i++) { const a = (i / n) * 2 * Math.PI; pts.push(map(u0 + Math.cos(a) * ru, v0 + Math.sin(a) * rv)); } c.poly(pts, col); }
const inE = (u, v, e) => ((u - e[0]) / e[2]) ** 2 + ((v - e[1]) / e[3]) ** 2 <= 1;

// body parts [u, v, ru, rv]
export const PART = { gaster: [-3.4, 2.3, 2.5, 1.9], petiole: [-1.25, 1.75, 0.45, 0.62], meso: [0.55, 2.0, 1.75, 0.95], prono: [1.35, 2.35, 0.95, 0.85], head: [3.25, 2.3, 1.25, 1.12] };
export const BRAIN = [3.05, 2.62, 0.58, 0.44];
export const SPORE_UV = [-3.5, 4.22];
export const STALK_BASE = [2.55, 3.32];
const LEGS = [{ u: 1.55, foot: 2.1, ph: 0 }, { u: 0.65, foot: 0.25, ph: Math.PI }, { u: -0.2, foot: -2.0, ph: 0 }];

// deterministic fungus threads inside the body (random walks that stay inside a part and out of the brain)
const THREADS = (() => {
  const out = []; let seed = 1;
  const parts = [["gaster", 26], ["meso", 16], ["prono", 6], ["head", 12], ["petiole", 2]];
  for (const [name, n] of parts) { const e = PART[name];
    for (let i = 0; i < n; i++) { seed++; let u = e[0] + (rnd(seed * 3) - 0.5) * e[2] * 1.4, v = e[1] + (rnd(seed * 5) - 0.5) * e[3] * 1.4, ang = rnd(seed * 7) * 6.28; const pts = [];
      for (let k = 0; k < 9; k++) { if (inE(u, v, e) && !inE(u, v, [BRAIN[0], BRAIN[1], BRAIN[2] + 0.12, BRAIN[3] + 0.12])) pts.push([u, v]); ang += (rnd(seed * 11 + k) - 0.5) * 1.6; u += Math.cos(ang) * 0.32; v += Math.sin(ang) * 0.32; }
      if (pts.length > 2) out.push({ pts, order: rnd(seed * 13), cells: rnd(seed * 17) < 0.5 }); } }
  // threads down the legs
  for (const L of LEGS) out.push({ pts: [[L.u, 1.4], [L.u + (L.foot - L.u) * 0.3, 2.15], [L.u + (L.foot - L.u) * 0.7, 1.1]], order: 0.6 + rnd(L.u * 9) * 0.4, cells: false });
  return out.sort((a, b) => a.order - b.order);
})();
// muscle fibres: [u0, v0, u1, v1, width mm]
const FIBRES = [
  [-0.4, 1.35, 0.4, 2.7, 0.28], [0.1, 1.3, 0.9, 2.8, 0.28], [0.7, 1.35, 1.5, 2.9, 0.28], [1.2, 1.4, 1.9, 2.95, 0.26], [-0.6, 2.2, 1.8, 2.35, 0.22],
  [2.35, 2.9, 3.9, 2.05, 0.3], [2.3, 2.5, 3.95, 1.85, 0.3], [2.4, 1.85, 3.9, 1.75, 0.26],
  [-5.2, 2.2, -1.8, 2.0, 0.2], [-5.0, 3.0, -2.0, 3.1, 0.2], [-4.8, 1.4, -2.1, 1.5, 0.2],
];

/**
 * st: { x, y, a (heading rad, screen coords), s (+1/−1 dorsal side), walk (phase rad | null), shake (mm), spin (rad, added to a),
 *       dead 0..1, xray 0..1, fungus 0..1, brainHi 0..1, spore 0..1, sporeGrow 0..1, stalk 0..1, jaw 0..1, alpha 0..1, light 0..1, glow 0..1 }
 */
export function drawAnt(c, cam, st, t) {
  const a0 = (st.a ?? Math.PI) + (st.spin ?? 0), hx = Math.cos(a0), hy = Math.sin(a0), s = st.s ?? 1, dx = s * -hy, dy = s * hx;
  const jx = (st.shake ?? 0) * Math.sin(t * 57), jy = (st.shake ?? 0) * Math.cos(t * 49);
  const map = (u, v) => { const wx = st.x + jx + u * hx + v * dx, wy = st.y + jy + u * hy + v * dy; return toScreen(cam, wx, wy); };
  const z = cam.z, g = fade(c, st.alpha ?? 1), L = st.light ?? 0, dead = st.dead ?? 0;
  const lenPx = 11 * z;
  const BODY = mix(mix("#2A1A26", "#3A2218", L), "#5A524C", dead * 0.7), RIM = mix(mix("#A890E8", "#C89A6A", L), "#A8A298", dead * 0.6), LEG = mix(mix("#3A2A44", "#3A2418", L), "#4E4842", dead * 0.7);
  const SPORE = "#B8FF8A", SPOREG = "#5FE04A";
  if (lenPx < 9) { // tiny: a blob (and the spore glow)
    const [sx, sy] = map(0, 2); g.rect(R(sx) - 1, R(sy) - 1, Math.max(2, R(lenPx / 3)), 2, BODY); g.px(R(sx), R(sy) - 2, RIM);
    if ((st.spore ?? 0) > 0.5 || (st.glow ?? 0) > 0) { const k = Math.max(st.glow ?? 0, 0.6); const gg = fade(c, (st.alpha ?? 1) * k); fade(gg, 0.5).disc(R(sx), R(sy) - 1, 4, "#2A6A22"); gg.disc(R(sx), R(sy) - 1, 2, "#5FE04A"); gg.px(R(sx), R(sy) - 1, SPORE); }
    return;
  }
  const lw = Math.max(1, 0.26 * z), walk = st.walk;
  // a small ant gets a soft halo so the eye can find it (the spore's glow)
  if (lenPx < 40 && (st.glow ?? 0) > 0) { const [hx0, hy0] = map(-1, 2.5), k = (st.glow ?? 0) * (1 - lenPx / 40) * (st.alpha ?? 1); fade(c, k * 0.5).disc(R(hx0), R(hy0), R(Math.max(6, lenPx * 0.5)), "#24401E"); fade(c, k).disc(R(hx0), R(hy0), 2, "#8CFF6A"); }
  // legs: far side first (darker, a little behind), then the body, then the near side
  const leg = (L0, near) => {
    const amp = st.amp ?? (walk == null ? 0 : 1), ph = (walk ?? 0) + L0.ph + (near ? 0 : Math.PI), sw = Math.sin(ph) * amp, lift = Math.max(0, Math.cos(ph)) * 0.55 * amp;
    const splay = dead * 0.6, fu = L0.foot + sw * 0.75 + (near ? 0 : 0.25) + Math.sign(L0.foot || 1) * splay, fv = lift + splay * 0.4;
    const hip = [L0.u + (near ? 0 : 0.2), 1.35], knee = [L0.u + (L0.foot - L0.u) * 0.45 + sw * 0.3, 2.35 + lift * 0.3 + splay * 0.2];
    const P0 = map(...hip), P1 = map(...knee), P2 = map(fu, fv); const col = near ? LEG : mix(LEG, "#000000", 0.35);
    tline(g, P0[0], P0[1], P1[0], P1[1], lw * 1.15, col); tline(g, P1[0], P1[1], P2[0], P2[1], lw, col);
    if (dead > 0.3 && near) { const k = (dead - 0.3) / 0.7; fade(g, k).disc(R(P1[0]), R(P1[1]), Math.max(1, R(0.32 * z)), "#E8E4D8"); }
  };
  for (const L0 of LEGS) leg(L0, false);
  // body
  for (const name of ["gaster", "petiole", "meso", "prono", "head"]) { const e = PART[name]; lellipse(g, map, e[0], e[1], e[2], e[3], BODY); }
  // a moonlit rim on the dorsal edges
  if (z > 2) for (const name of ["gaster", "meso", "prono", "head"]) { const e = PART[name]; for (let i = 0; i <= 22; i++) { const an = Math.PI * 0.05 + (i / 22) * Math.PI * 0.9, P = map(e[0] + Math.cos(an) * e[2] * 0.93, e[1] + Math.sin(an) * e[3] * 0.93); g.rect(R(P[0]), R(P[1]), Math.max(1, R(z * 0.2)), Math.max(1, R(z * 0.2)), RIM); } }
  // gaster bands
  if (z > 4) for (let k = 0; k < 3; k++) { const u = -4.6 + k * 1.1; for (let i = -4; i <= 4; i++) { const v = 2.3 + i * 0.42; if (!inE(u, v, PART.gaster)) continue; const P = map(u, v); g.px(R(P[0]), R(P[1]), mix(BODY, RIM, 0.35)); } }
  // mandibles: open (apart) → closed (crossed into the leaf)
  { const jaw = st.jaw ?? 0, base = [4.25, 1.85], o = 0.55 * (1 - jaw);
    const m1 = [map(base[0], base[1] + 0.25), map(base[0] + 1.05, base[1] + 0.05 + o), map(base[0] + 0.15, base[1] - 0.05)], m2 = [map(base[0], base[1] - 0.15), map(base[0] + 1.0, base[1] - 0.35 - o * 0.6), map(base[0] + 0.1, base[1] - 0.45)];
    g.poly(m1, mix(BODY, RIM, 0.25)); g.poly(m2, mix(BODY, "#000000", 0.2)); }
  // eye, antennae
  { const E = map(3.62, 2.58); g.disc(R(E[0]), R(E[1]), Math.max(1, R(0.22 * z)), mix(RIM, "#FDFEED", 0.25));
    const am = st.amp ?? (walk == null ? 0 : 1), tw = Math.sin(PH(t, 0.5)) * 0.15 * (1 - dead) * (1 - am) + Math.sin((walk ?? 0) * 0.5) * 0.25 * am, A0 = map(3.75, 2.95), A1 = map(4.35 + tw * 0.3, 4.35 - dead * 0.8), A2 = map(5.6 + tw, 3.85 - dead * 1.6);
    tline(g, A0[0], A0[1], A1[0], A1[1], Math.max(1, lw * 0.75), LEG); tline(g, A1[0], A1[1], A2[0], A2[1], Math.max(1, lw * 0.65), LEG); }
  for (const L0 of LEGS) leg(L0, true);
  // x-ray: the inside (muscles, fungus, brain)
  const xr = st.xray ?? 0;
  if (xr > 0) {
    const gx = fade(c, xr * (st.alpha ?? 1));
    for (const name of ["gaster", "petiole", "meso", "prono", "head"]) { const e = PART[name]; lellipse(gx, map, e[0], e[1], e[2] * 0.94, e[3] * 0.9, "#2A1424"); }
    for (const [u0, v0, u1, v1, w] of FIBRES) { const P = map(u0, v0), Q = map(u1, v1); tline(gx, P[0], P[1], Q[0], Q[1], w * z, "#C84A6A"); tline(gx, P[0], P[1], Q[0], Q[1], Math.max(1, w * z * 0.35), "#F08AA0"); }
    // brain
    lellipse(gx, map, BRAIN[0], BRAIN[1], BRAIN[2], BRAIN[3], mix("#B8A6E8", "#E0D6FF", st.brainHi ?? 0));
    // fungus threads (grow in order)
    const fu = st.fungus ?? 0, n = THREADS.length;
    THREADS.forEach((th, i) => { const k = clamp01(fu * 1.25 - th.order * 1.0); if (k <= 0) return; const m = Math.max(2, Math.ceil(th.pts.length * k));
      for (let j = 1; j < m; j++) { const P = map(...th.pts[j - 1]), Q = map(...th.pts[j]); tline(gx, P[0], P[1], Q[0], Q[1], Math.max(1, 0.12 * z), (j + i) % 3 ? "#6EE04E" : "#B8FF8A"); }
      if (th.cells && k > 0.6) { const P = map(...th.pts[th.pts.length - 1]); gx.disc(R(P[0]), R(P[1]), Math.max(1, R(0.17 * z)), "#B8FF8A"); } });
    // the ring around the brain
    const bh = st.brainHi ?? 0; if (bh > 0) { const gb = fade(c, bh * xr); for (let i = 0; i < 40; i++) { if (i % 4 === 3) continue; const an = (i / 40) * 2 * Math.PI + PH(t, 0.1), P = map(BRAIN[0] + Math.cos(an) * (BRAIN[2] + 0.3), BRAIN[1] + Math.sin(an) * (BRAIN[3] + 0.3)); gb.rect(R(P[0]), R(P[1]), Math.max(1, R(z * 0.1)), Math.max(1, R(z * 0.1)), "#FDFEED"); } }
  }
  // the spore on its back, and the threads it pushes in through the shell
  const sp = st.spore ?? 0;
  if (sp > 0) { const gs = fade(c, sp * (st.alpha ?? 1)), P = map(...SPORE_UV), r = Math.max(1, 0.32 * z), pulse = 0.5 + 0.5 * Math.sin(PH(t, 0.55));
    gs.disc(R(P[0]), R(P[1]), R(r * (2.4 + pulse * 0.6)), mix("#1E3A1A", "#2E6A26", 0.5)); gs.disc(R(P[0]), R(P[1]), R(r * 1.4), SPOREG); gs.disc(R(P[0]), R(P[1]), Math.max(1, R(r * 0.8)), SPORE);
    const gr = st.sporeGrow ?? 0; if (gr > 0 && z > 6) for (let k = 0; k < 5; k++) { const ang = -Math.PI / 2 + (k - 2) * 0.35, len = gr * (0.9 + 0.3 * rnd(k)); let pu = SPORE_UV[0], pv = SPORE_UV[1];
      for (let j = 0; j < 8; j++) { const q = j / 8; if (q > len / 1.2) break; const nu = pu + Math.cos(ang + Math.sin(j * 1.7 + k) * 0.4) * 0.15, nv = pv - 0.15; const A = map(pu, pv), Bp = map(nu, nv); tline(gs, A[0], A[1], Bp[0], Bp[1], Math.max(1, 0.08 * z), "#B8FF8A"); pu = nu; pv = nv; } } }
  // the stalk out of the back of the head (and the spore pad on it)
  const sk = st.stalk ?? 0;
  if (sk > 0) { const gk = fade(c, st.alpha ?? 1), N = 24, len = 17 * sk, pts = [];
    for (let i = 0; i <= N; i++) { const q = i / N, l = len * q; pts.push(map(STALK_BASE[0] - 0.9 * q * sk - 0.6 * Math.sin(q * 2.2) * sk, STALK_BASE[1] + l)); }
    for (let i = 1; i < pts.length; i++) { const w = Math.max(1, (0.42 - 0.18 * (i / N)) * z); tline(gk, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], w, i % 4 ? "#D8CCA8" : "#C0B48E"); }
    if (sk > 0.55) { const k = clamp01((sk - 0.55) / 0.3), b = pts[Math.round(N * 0.42)], bg = fade(gk, k); bg.disc(R(b[0]), R(b[1]), Math.max(1, R(0.75 * z)), "#B8A878"); bg.disc(R(b[0]), R(b[1]), Math.max(1, R(0.5 * z)), "#CFE8A0");
      const glow = st.glow ?? 0; if (glow > 0) fade(c, glow * 0.5).disc(R(b[0]), R(b[1]), Math.max(2, R(1.4 * z)), "#5FE04A"); }
  }
}
/** world position of a local point of an ant state (for tags and particles) */
export function antPoint(st, u, v) { const a0 = (st.a ?? Math.PI) + (st.spin ?? 0), hx = Math.cos(a0), hy = Math.sin(a0), s = st.s ?? 1; return [st.x + u * hx + v * s * -hy, st.y + u * hy + v * s * hx]; }
