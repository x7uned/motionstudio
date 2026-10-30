// Dog series kit · «wet nose» diagram 1: a magnified cross-section of the wet nose surface (an illustration, not to
// scale). Dark leathery skin with a cobblestone top, little glands (bulbs) inside the skin that pump mucus up through
// tiny ducts, and a thin glossy bluish-clear mucus film on top that catches smell particles from the air.
// Everything is drawn inside the lead's box (screen grid pixels); the box is filled edge to edge.
import { R, TAU, clamp01, sm01, frac, lerp, rnd, bayer, mix, fade, ibox, boxView, fit, Layer, blit, lru, PAL, darkBg, discF, ellF, band } from "./nosebio-util.mjs";

// leathery nose skin (dark, cool violet) and the dermis below (dark mauve)
export const LEATHER = ["#07060C", "#0F0C18", "#171322", "#211B30", "#2C2540", "#3A3254", "#4C436C", "#665C8A", "#8A80B0"];
export const DERMIS = ["#120A16", "#1A0F20", "#22142A", "#2B1A34", "#35203E", "#41274A", "#4E2F58"];

/** Geometry of the section for a w×h box (local coordinates). */
export function skinGeo(w, h) {
  const s = Math.min(w / 500, h / 420), N = 6, bw = w / N, y0 = h / 2 - 13 * s;
  const H = []; for (let i = 0; i < N; i++) H.push((21 + 6 * rnd(i * 7 + 3)) * s);
  const D = (u) => Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 2.4)), 0.55);          // cobble dome 0..1
  const at = (x) => { const k = Math.max(0, Math.min(N - 1, Math.floor(x / bw))); return [k, clamp01(x / bw - k)]; };
  const surf = (x) => { const [k, u] = at(x); return y0 - H[k] * D(u); };
  // film: thick in the grooves, thin on the crests, a smooth liquid surface (cosine waves, flat at every groove)
  const G = 32 * s, T = 12.5 * s;
  const film = (x, f) => { const [k, u] = at(x); return y0 - G * f - Math.max(0, H[k] - (G - T) * f) * (0.5 - 0.5 * Math.cos(TAU * u)); };
  const jn = (x) => y0 + 34 * s + 4 * s * Math.sin((x / bw) * TAU * 2 + 0.6);                    // epidermis/dermis junction
  const glands = [1, 3, 5].map((k, i) => ({ k, x: k * bw, y: y0 + [96, 109, 91][i] * s, rx: 27 * s, ry: 24 * s }));
  return { s, N, bw, y0, H, D, at, surf, film, jn, glands, w, h };
}

/** Screen y of the mucus film surface at x01 (0..1 across the box) for a film amount (default 1). */
export function filmY(box, x01, film = 1) { const b = ibox(box), g = skinGeo(b.w, b.h); return b.y + g.film(clamp01(x01) * b.w, clamp01(film)); }

// duct centre line of gland i (local coords): q 0 = in the gland, 1 = the opening at the groove
function ductAt(G, gl, i, q) {
  const top = gl.y - gl.ry * 0.75, wig = (i & 1 ? 1 : -1) * 4 * G.s * Math.sin(q * Math.PI);
  return [gl.x + wig, lerp(top, G.y0 + 0.5, q)];
}

/** Anchor points for the lead's labels (screen coordinates). */
export function skinAnchors(box, o = {}) {
  const b = ibox(box), G = skinGeo(b.w, b.h), f = clamp01(o.film ?? 1);
  const gl = G.glands, P = ([x, y]) => [b.x + x, b.y + y];
  const fx = b.w * 0.5, ft = G.film(fx, Math.max(f, 0.3)), sx = G.bw * 4.45;
  return {
    gland: P([gl[0].x, gl[0].y]), duct: P(ductAt(G, gl[2], 2, 0.5)), film: P([fx, (ft + G.surf(fx)) / 2]), skin: P([sx, G.surf(sx) + 12 * G.s]),
    glands: gl.map((g) => P([g.x, g.y])), ducts: gl.map((g, i) => P(ductAt(G, g, i, 0.5))), dermis: P([G.bw * 2, G.y0 + 70 * G.s]),
    surfaceY: b.y + G.y0, filmTop: (x01) => b.y + G.film(clamp01(x01) * b.w, f),
  };
}

// ---------------------------------------------------------------- static layer: air + skin body
const cache = lru(6);
function baseLayer(w, h, bg) {
  return cache(`${w}x${h}:${bg}`, () => {
    const L = new Layer(w, h), G = skinGeo(w, h), s = G.s;
    if (bg) darkBg(L, { x: 0, y: 0, w, h });
    for (let x = 0; x < w; x++) {
      const xc = x + 0.5, top = G.surf(xc), jn = G.jn(xc), [k, u] = G.at(xc), groove = Math.min(u, 1 - u) * G.bw;
      const slope = (G.surf(xc + 1) - G.surf(xc - 1)) / 2;                 // < 0 → rising to the right (faces left = lit)
      for (let y = Math.max(0, Math.floor(top)); y < h; y++) {
        const yc = y + 0.5; if (yc < top) continue;
        const dd = yc - top;
        if (yc < jn) {
          // epidermis: cobble plates, lit rim on top, dark creases down from every groove
          let col;
          if (dd < 1.2) col = slope < -0.35 ? LEATHER[8] : slope > 0.6 ? LEATHER[4] : LEATHER[7];
          else if (groove < 0.9 * Math.max(1, s)) col = LEATHER[0];
          else {
            // each cobble a little dome lit from the upper left, darker deeper down; sparse dark pores
            const hk = G.H[k], ccx = (k + 0.34) * G.bw, nx = (xc - ccx) / (G.bw * 0.6), ny = (yc - (G.y0 - hk * 0.85)) / (hk * 0.9 + 44 * s);
            const dome = Math.max(0, 1 - Math.hypot(nx, ny));
            const v = 2.9 + dome * 4.2 + (yc > G.y0 + 10 * s ? 0.25 * Math.sin(xc / (5 * s) + yc / (7 * s)) : 0);
            col = band(LEATHER, v, x, y, 2);
            if (rnd(x * 7919 + y * 104729) < 0.01 && dd > 3 * s) col = LEATHER[1];
          }
          if (yc > jn - 1.2) col = LEATHER[1];
          L.px(x, y, col);
        } else {
          // dermis: dark mauve with soft wavy fibres, a little lighter right under the junction
          const dz = (yc - jn) / Math.max(1, h - jn);
          const fib = Math.abs(Math.sin((yc + 5 * s * Math.sin(xc / (23 * s))) / (3.4 * s))) > 0.94 ? 0.55 : 0;
          const v = 4.6 - dz * 3.4 + fib + (yc - jn < 4 * s ? 0.8 : 0);
          L.px(x, y, band(DERMIS, v, x, y, 1));
        }
      }
    }
    // the soft layer underneath: rounded fat cells packed in two rows (subtle)
    const yb = G.y0 + 178 * s, cr = 15 * s;
    for (let row = 0; yb + (row - 1) * 1.6 * cr < h; row++) for (let k = -1; k < w / (2 * cr) + 1; k++) {
      const cx = (k + 0.5 + (row & 1) * 0.5) * 2 * cr + (rnd(k * 31 + row * 7) - 0.5) * 4 * s, cy = yb + row * 1.6 * cr + (rnd(k * 17 + row) - 0.5) * 3 * s, r = cr * (0.9 + 0.15 * rnd(k * 5 + row * 3));
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r; if (d > 1) continue;
        L.px(x, y, d > 0.86 ? DERMIS[1] : d > 0.74 && y < cy - r * 0.3 && x < cx ? DERMIS[5] : band(DERMIS, 3.1 - (y - cy) / r * 0.6, x, y, 2));
      }
    }
    return L;
  });
}

// ---------------------------------------------------------------- particles (smell bits)
/** One smell particle: little coloured molecule shapes (type by index). */
function particle(g, x, y, r, col, i) {
  const type = i % 3, dk = mix(col, "#07060E", 0.55), hi = mix(col, "#FFFFFF", 0.55);
  const parts = type === 0 ? [[0, 0, r]] : type === 1 ? [[-r * 0.55, 0.2 * r, r * 0.75], [r * 0.6, -0.25 * r, r * 0.72]] : [[-r * 0.6, r * 0.35, r * 0.62], [r * 0.6, r * 0.35, r * 0.62], [0, -r * 0.55, r * 0.66]];
  for (const [dx, dy, rr] of parts) discF(g, x + dx, y + dy, rr + 1, "#07060E");
  for (const [dx, dy, rr] of parts) { discF(g, x + dx, y + dy, rr, rr >= 1.8 ? dk : col); if (rr >= 1.8) discF(g, x + dx - rr * 0.22, y + dy - rr * 0.22, rr * 0.8, col); }
  for (const [dx, dy, rr] of parts) g.px(Math.floor(x + dx - rr * 0.4), Math.floor(y + dy - rr * 0.4), hi);
  if (r >= 2.5) g.px(Math.floor(x + parts[0][0] - parts[0][2] * 0.4) + 1, Math.floor(y + parts[0][1] - parts[0][2] * 0.4), "#FFFFFF");
}

// ---------------------------------------------------------------- main
/**
 * drawSkin(c, box, t, o) — o: { a, glands, flow, film, particles: [{x01, y01, col, stick}], bg }.
 * glands 0..1: the glands (and their ducts) dissolve in (0 … 0.45) and light up (0.35 … 1).
 * flow 0..1: mucus droplets travel up the ducts and spread into the film (animated by t); the glands pump.
 * film 0..1: the film grows from puddles in the grooves to a continuous glossy layer.
 * particles: smell bits in the air at (x01, y01) of the box; stick 0 → 1 carries one down into the film.
 * bg (default true): fill the box with the dark diagram air. Returns the anchors (screen coordinates).
 */
export function drawSkin(c, box, t = 0, o = {}) {
  const a = clamp01(o.a ?? 1), b = ibox(box);
  const A = skinAnchors(b, o);
  if (a <= 0) return A;
  const G = skinGeo(b.w, b.h), s = G.s, g = boxView(c, b, a);
  const glands = clamp01(o.glands ?? 0), flow = clamp01(o.flow ?? 0), f = clamp01(o.film ?? 0);
  const X = (x) => b.x + x, Y = (y) => b.y + y;

  // 1. air + skin (cached)
  blit(c, baseLayer(b.w, b.h, o.bg !== false), b.x, b.y, a);

  // 2. glands, ducts, droplets
  const gA = sm01(glands / 0.45), lit = sm01((glands - 0.35) / 0.65);
  if (gA > 0) {
    const gg = fade(g, gA);
    G.glands.forEach((gl, i) => {
      const pump = 1 + 0.07 * flow * Math.sin(TAU * t * 0.9 - i * 1.3), rx = gl.rx * pump, ry = gl.ry * pump;
      // soft cyan glow around a lit gland
      if (lit > 0) { const m = rx + 14 * s; g.tint(R(X(gl.x - m)), R(Y(gl.y - m)), R(2 * m), R(2 * m), (x, y) => { const d = Math.hypot((x - X(gl.x)) / (rx + 14 * s), (y - Y(gl.y)) / (ry + 14 * s)); return d >= 1 ? 0 : lit * gA * 0.45 * (1 - d); }, PAL.mucus[4], 3); }
      // duct: dark outline, pink wall, mucus lumen
      const pts = []; for (let q = 0; q <= 1.0001; q += 0.04) pts.push(ductAt(G, gl, i, q));
      const wall = mix(PAL.pink[2], PAL.pink[4], lit), lumen = mix("#24345A", PAL.mucus[4], lit);
      for (const [rr, col] of [[4.2 * s + 0.6, PAL.out], [3.2 * s, wall], [1.7 * s, lumen]]) for (const [x, y] of pts) discF(gg, X(x), Y(y), Math.max(0.6, rr), col);
      // the opening in the groove
      discF(gg, X(gl.x), Y(G.y0), 2.2 * s, lumen);
      // bulb: outline, pink wall with cells, mucus inside (brighter in the middle when lit)
      const cx = X(gl.x), cy = Y(gl.y);
      ellF(gg, cx, cy, rx + 1.2, ry + 1.2, PAL.out);
      ellF(gg, cx, cy, rx, ry, wall);
      for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
        const d = Math.hypot((xx + 0.5 - cx) / (rx - 3.2 * s), (yy + 0.5 - cy) / (ry - 3.2 * s)); if (d > 1) continue;
        const hl = Math.hypot((xx + 0.5 - cx + rx * 0.3) / (rx * 0.32), (yy + 0.5 - cy + ry * 0.32) / (ry * 0.22)) < 1;
        gg.px(xx, yy, lit > 0.02 ? (hl && lit > 0.5 ? PAL.mucus[7] : band(PAL.mucus, 1.6 + lit * 3.1 + (d < 0.55 ? 0.5 * lit : 0), xx, yy)) : (d < 0.6 ? "#22304E" : "#1C2642"));
      }
      // secretory cells lining the wall
      for (let k = 0; k < 11; k++) { const ang = -Math.PI / 2 + 0.5 + (k / 10) * (TAU - 1.0), ex = cx + Math.cos(ang) * (rx - 4 * s), ey = cy + Math.sin(ang) * (ry - 4 * s); discF(gg, ex, ey, 2.3 * s, mix(PAL.pink[3], PAL.pink[5], lit)); gg.px(Math.floor(ex - 0.6 * s), Math.floor(ey - 0.6 * s), mix(PAL.pink[5], PAL.pink[7], lit)); }
      // wall highlight (upper left)
      for (let k = 0; k < 7; k++) { const ang = -2.5 + k * 0.12; gg.px(Math.floor(cx + Math.cos(ang) * (rx - 1)), Math.floor(cy + Math.sin(ang) * (ry - 1)), mix(PAL.pink[4], PAL.pink[6], lit)); }
      // droplets
      if (flow > 0) {
        const fA = fade(gg, sm01(flow / 0.3)), K = 3;
        for (let j = 0; j < K; j++) {
          const p = frac(t * 0.42 + j / K + i * 0.29), dr = 2.9 * s;
          if (p < 0.72) {
            const q = p / 0.72, [x, y] = ductAt(G, gl, i, q * 0.98), e = sm01(p / 0.08);
            const dg = fade(fA, e); discF(dg, X(x), Y(y), dr + 1, PAL.mucus[1]); discF(dg, X(x), Y(y), dr, PAL.mucus[6]); dg.px(Math.floor(X(x) - dr * 0.4), Math.floor(Y(y) - dr * 0.4), "#FFFFFF");
          } else {
            const e = (p - 0.72) / 0.28, dg = fade(fA, 1 - sm01((e - 0.35) / 0.65));
            for (const side of [-1, 1]) {
              const x = gl.x + side * e * G.bw * 0.42, top = G.film(x, f), sf = G.surf(x), y = Math.min(sf - 1.6 * s, (top + sf) / 2 + 0.5 * s), r2 = dr * (1 - 0.45 * e);
              discF(dg, X(x), Y(y), r2 + 0.8, PAL.mucus[2]); discF(dg, X(x), Y(y), r2, PAL.mucus[6]); dg.px(Math.floor(X(x) - r2 * 0.4), Math.floor(Y(y) - r2 * 0.4), "#FFFFFF");
            }
          }
        }
      }
    });
  }

  // 3. the mucus film (puddles in the grooves → a continuous glossy layer)
  if (f > 0) {
    const fg = fade(g, sm01(f / 0.25)), sweep = -0.2 * b.w + frac(t * 0.11) * 1.4 * b.w;
    for (let x = 0; x < b.w; x++) {
      const xc = x + 0.5, top = G.film(xc, f), bot = G.surf(xc); if (bot - top < 0.6) continue;
      const [, u] = G.at(xc), crest = 0.5 - 0.5 * Math.cos(TAU * u), th = bot - top, sw = Math.exp(-(((xc - sweep) / (34 * s)) ** 2));
      for (let y = Math.floor(top); y < bot; y++) {
        const r = y + 0.5 - top; if (r < 0) continue;
        let col;
        if (r < 1) col = sw > 0.35 || (crest > 0.86 && u < 0.5) ? PAL.mucus[7] : PAL.mucus[6];
        else if (r < 1 + 1.3 * s) col = (crest > 0.9 && u < 0.47 && u > 0.36) || sw > bayer(x, y) * 1.2 ? "#FFFFFF" : PAL.mucus[5];
        else if (bot - y < 1.2) col = PAL.mucus[2];
        else col = band(PAL.mucus, 4.25 - 1.5 * clamp01((r - 1.3 * s) / Math.max(1, th - 1.3 * s)) + 0.6 * sw, x, y, 2);
        fg.px(X(x), Y(y), col);
      }
    }
    // a few tiny bubbles and glints in the film
    for (let k = 0; k < 9; k++) {
      const x = (rnd(k * 13 + 5) * 0.96 + 0.02) * b.w, top = G.film(x, f), bot = G.surf(x); if (bot - top < 5 * s) continue;
      const y = lerp(top + 2.5 * s, bot - 1.5 * s, rnd(k * 17 + 2)); fg.px(X(Math.floor(x)), Y(Math.floor(y)), PAL.mucus[7]);
      if (s >= 0.9) fg.px(X(Math.floor(x)) + 1, Y(Math.floor(y)), PAL.mucus[6]);
    }
  }

  // 4. smell particles: floating in the air → embedded in the film
  const parts = o.particles ?? [];
  parts.forEach((p, i) => {
    const st = clamp01(p.stick ?? 0), e = sm01(st), free = 1 - e, r = (p.r ?? 5.5) * s;
    const x = p.x01 * b.w + Math.sin(t * 1.7 + i * 2.1) * 3 * s * free;
    const yAir = p.y01 * b.h + Math.cos(t * 1.3 + i * 1.7) * 2.5 * s * free;
    const ff = Math.max(f, 0.15), yIn = G.film(x, ff) + r * 0.7;
    const y = lerp(yAir, yIn, e), pa = clamp01(p.a ?? 1);
    if (pa <= 0) return;
    const pg = fade(g, pa);
    particle(pg, X(x), Y(y), r, p.col ?? "#F27A9A", i);
    // embedded: the film surface line runs over it; a ripple spreads as it lands
    if (st > 0.8) {
      const k = sm01((st - 0.8) / 0.2), lg = fade(pg, k * sm01(f / 0.25));
      for (let xx = Math.floor(x - r - 3 * s); xx <= Math.ceil(x + r + 3 * s); xx++) { const ty = Math.floor(G.film(xx + 0.5, ff)); lg.px(X(xx), Y(ty), PAL.mucus[7]); if (Math.abs(xx - x) <= r) lg.px(X(xx), Y(ty + 1), (xx + ty) & 1 ? PAL.mucus[5] : null); }
    }
    if (st > 0.72 && st < 1) {
      const k = (st - 0.72) / 0.28, rad = (3 + 10 * k) * s, rg = fade(pg, 1 - k);
      for (let q = 0; q < 28; q++) { const ang = (q / 28) * TAU, xx = x + Math.cos(ang) * rad, yy = G.film(x, ff) + Math.sin(ang) * rad * 0.28; rg.px(X(Math.floor(xx)), Y(Math.floor(yy)), PAL.mucus[7]); }
    }
  });
  return A;
}
