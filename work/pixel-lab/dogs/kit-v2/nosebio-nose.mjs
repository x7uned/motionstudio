// Dog series kit · «wet nose» diagram 3: a front macro of the collie's nose (an illustration). Black cobbled leather
// that is glossy when wet and matte when dry, two round nostrils with comma-shaped side slits, the white muzzle fur
// around it. Airflow: breathing in goes straight INTO the round openings from the front; breathing out leaves through
// the side slits and curls sideways and backwards, so it does not blow away the air in front of the nose.
import { NOSE } from "./dog-head.mjs";
import { RAMP, smooth } from "../../animals/film/cute.mjs";
import { R, TAU, clamp01, sm01, frac, lerp, rnd, bayer, mix, fade, ibox, boxView, fit, Layer, blit, lru, PAL, darkBg, discF, ellF, airDot, polyMask, chamfer, band, inPoly, stroke, curve } from "./nosebio-util.mjs";

const WHT = RAMP.white;
const DRY = ["#0C0A12", "#1A1822", "#28252F", "#35313D", "#433F4B", "#524E5A", "#625E6A", "#75717E"];

// ---------------------------------------------------------------- nominal geometry (500 × 420)
const HALF = [[250, 50], [320, 47], [388, 55], [432, 73], [456, 108], [461, 150], [451, 200], [429, 250], [393, 292], [347, 326], [302, 347], [270, 353], [250, 338]];
const OUTLINE = [...HALF, ...HALF.slice(1, -1).reverse().map(([x, y]) => [500 - x, y])];
const NOST = [{ x: 168, y: 190, side: -1 }, { x: 332, y: 190, side: 1 }];
const HOLE = { rx: 35, ry: 39, rot: 0.2 };
// comma slit: from the lower outer edge of the hole, curving outward and down, tapering
const slitPts = (n) => { const d = n.side; return curve([[n.x + d * 20, n.y + 22], [n.x + d * 38, n.y + 31], [n.x + d * 51, n.y + 43], [n.x + d * 55, n.y + 58], [n.x + d * 51, n.y + 71]], 8); };
const SLIT_END = (n) => [n.x + n.side * 52, n.y + 70];
const HL = [[150, 104, 82, 24, -0.08], [346, 95, 58, 18, 0.1]];
const DROPS = [[118, 148, 6], [384, 142, 5], [232, 108, 4.5], [298, 262, 5.5], [424, 214, 4], [86, 230, 4.5], [196, 296, 5], [262, 168, 4]];
const CELL = 17;
/** broad soft sheen across the upper nose (wet only) */
const sheen = (u, v) => Math.max(0, 1 - Math.abs(v - 104 - 0.0006 * (u - 250) ** 2) / 34) * Math.max(0, 1 - Math.abs(u - 250) / 230) * 0.8;

/** Anchor points (screen coordinates): nostril openings and the ends of the side slits. */
export function nostrilAnchors(box) {
  const b = ibox(box), F = fit(b.w, b.h), P = (p) => { const q = F.P(p); return [b.x + q[0], b.y + q[1]]; };
  return { left: P([NOST[0].x, NOST[0].y]), right: P([NOST[1].x, NOST[1].y]), slitL: P(SLIT_END(NOST[0])), slitR: P(SLIT_END(NOST[1])), nose: P([250, 200]), philtrum: P([250, 300]) };
}

// jittered hex cells (nominal units): nearest / second-nearest distances and the nearest centre
function cellAt(x, y) {
  const rh = CELL * 0.866, j0 = Math.floor(y / rh);
  let d1 = 1e9, d2 = 1e9, cx = 0, cy = 0;
  for (let j = j0 - 1; j <= j0 + 1; j++) {
    const off = (j & 1) * CELL * 0.5, i0 = Math.floor((x - off) / CELL);
    for (let i = i0 - 1; i <= i0 + 1; i++) {
      const h = (i * 92821 + j * 68917) | 0, px = i * CELL + off + (rnd(h) - 0.5) * 7, py = j * rh + (rnd(h + 11) - 0.5) * 6, d = Math.hypot(x - px, y - py);
      if (d < d1) { d2 = d1; d1 = d; cx = px; cy = py; } else if (d < d2) d2 = d;
    }
  }
  return { d1, d2, cx, cy };
}

// ---------------------------------------------------------------- static layers (neutral, wet, dry)
const cache = lru(4);
function build(w, h, bgMode) {
  return cache(`${w}x${h}:${bgMode}`, () => {
    const F = fit(w, h), s = F.s, inv = (X, Y) => [(X + 0.5 - F.ox) / s, (Y + 0.5 - F.oy) / s];
    const L0 = new Layer(w, h), Lw = new Layer(w, h, L0), Ld = new Layer(w, h, L0);
    const mask = polyMask(w, h, F.poly(smooth(OUTLINE, new Set([12]), 5)));
    const dist = chamfer(mask, w, h);
    // background: white muzzle fur (radial strands, whisker dots, the philtrum running down to a little smile) or dark
    if (bgMode === "dark") { for (const L of [L0]) darkBg(L, { x: 0, y: 0, w, h }); }
    else if (bgMode === "fur") {
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const [u, v] = inv(x, y), r = Math.hypot((u - 250) * 0.8, v - 210);
        L0.px(x, y, band(WHT, Math.min(6.1, 5.9 - (v / 420) * 1.5 - Math.max(0, 1 - r / 260) * 0.6), x, y, 2));
      }
      // soft fur strands: short radial strokes, one tone darker
      const [U0, V0] = inv(0, 0), [U1, V1] = inv(w, h), nStr = Math.round(520 * ((U1 - U0) * (V1 - V0)) / (500 * 420));
      for (let k = 0; k < nStr; k++) {
        const u = U0 + rnd(k * 3 + 1) * (U1 - U0), v = V0 + rnd(k * 5 + 2) * (V1 - V0), dx = u - 250, dy = (v - 205) * 1.2, d = Math.hypot(dx, dy) || 1, len = 7 + 7 * rnd(k * 7 + 3);
        const q = F.P([u, v]), lv = Math.min(6.1, 5.9 - (v / 420) * 1.5) - 1.0, col = band(WHT, lv, R(q[0]), R(q[1]), 2);
        const bend = (rnd(k * 11) - 0.5) * 0.5, pts = [[u, v], [u + (dx / d) * len * 0.5 - (dy / d) * len * bend, v + (dy / d) * len * 0.5 + (dx / d) * len * bend], [u + (dx / d) * len, v + (dy / d) * len]];
        stroke(L0, F.poly(curve(pts, 4)), Math.max(0.5, 0.75 * s), col);
      }
      // whisker-pad dots and the upper lip
      for (const side of [-1, 1]) for (let k = 0; k < 7; k++) { const [u, v] = [250 + side * (105 + (k % 3) * 22 + (k >> 1) * 6), 368 + (k % 2) * 14 + (k >> 2) * 10]; ellF(L0, F.X(u), F.Y(v), Math.max(1, 2.4 * s), Math.max(1, 2 * s), WHT[3]); }
      stroke(L0, F.poly([[250, 350], [250, 396]]), Math.max(0.7, 1.4 * s), "#2A2A3A");
      for (const side of [-1, 1]) stroke(L0, F.poly(curve([[250, 396], [250 + side * 34, 410], [250 + side * 76, 404], [250 + side * 98, 392]], 8)), Math.max(0.7, 1.5 * s), "#2A2A3A");
    }
    for (const L of [Lw, Ld]) L.over(L0);
    // the nose
    const nost = NOST.map((n) => ({ ...n, sx: F.X(n.x), sy: F.Y(n.y) }));
    const slitM = polyMask(w, h, []), holeM = new Uint8Array(w * h);
    for (const n of NOST) { const sp = F.poly(slitPts(n)); for (let k = 0; k < sp.length; k++) { const r = lerp(10, 1.3, Math.pow(k / (sp.length - 1), 0.75)) * s; for (let y = Math.floor(sp[k][1] - r); y <= sp[k][1] + r; y++) for (let x = Math.floor(sp[k][0] - r); x <= sp[k][0] + r; x++) if (x >= 0 && y >= 0 && x < w && y < h && (x + 0.5 - sp[k][0]) ** 2 + (y + 0.5 - sp[k][1]) ** 2 <= r * r) slitM[y * w + x] = 1; } }
    const holeE = (X, Y, n, grow = 0) => { const c = Math.cos(n.side * HOLE.rot), sn = Math.sin(n.side * HOLE.rot), dx = X + 0.5 - n.sx, dy = Y + 0.5 - n.sy, u = (dx * c + dy * sn) / (HOLE.rx * s + grow), v = (-dx * sn + dy * c) / (HOLE.ry * s + grow); return Math.hypot(u, v); };
    const lx = -0.6, ly = -0.8, at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!mask[i]) continue;
      const edge = !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
      if (edge) { const c = !at(R(x + lx * 2), R(y + ly * 2)) ? "#2E2A40" : "#020104"; L0.px(x, y, c); Lw.px(x, y, !at(R(x + lx * 2), R(y + ly * 2)) ? "#4A4E70" : "#020104"); Ld.px(x, y, c); continue; }
      const [u, v] = inv(x, y);
      // nostril openings and slits
      let hole = 9, hn = null; for (const n of nost) { const e = holeE(x, y, n); if (e < hole) { hole = e; hn = n; } }
      if (hole <= 1 || slitM[i]) {
        let col;
        if (hole <= 1) {
          const dx = (x - hn.sx) / (HOLE.rx * s), dy = (y - hn.sy) / (HOLE.ry * s);
          // the inner wall catches a little light on the lower inner side; the middle is deep black
          const inner = hole > 0.8 && hole < 0.94 && dy > 0.35 && dx * hn.side < 0.1;
          col = hole > 0.94 ? "#020104" : inner ? NOSE[2] : "#000000";
          L0.px(x, y, col); Ld.px(x, y, col); Lw.px(x, y, inner ? "#22263A" : col);
        } else { const up = !slitM[i - w * Math.max(1, R(2 * s))]; col = up ? NOSE[2] : "#020104"; L0.px(x, y, col); Lw.px(x, y, up ? "#363A58" : col); Ld.px(x, y, up ? DRY[2] : col); }
        continue;
      }
      // volume + cobbles
      const d = dist[i], t = Math.min(1, d / (70 * s)), yN = v / 420;
      const C = cellAt(u, v), crease = C.d2 - C.d1 < 1.35 ? 1 : 0, dome = Math.max(0, 1 - Math.hypot(u - C.cx + 2, v - C.cy + 2) / (CELL * 0.62));
      let lv = 2.2 + 2.1 * Math.pow(t, 0.6) - 1.2 * yN + dome * 0.95 - crease * 1.15;
      if (!at(R(x + lx * 5 * s), R(y + ly * 5 * s))) lv += 0.7;
      if (!at(R(x - lx * 6 * s), R(y - ly * 6 * s))) lv -= 0.5;
      // raised wing around each nostril (upper outer side) and the philtrum groove
      // the rolled rim of each nostril: lit on top, a soft shadow under it
      for (const n of nost) { const e = holeE(x, y, n); if (e > 1 && e < 1.32) { const k = 1 - (e - 1) / 0.32; lv += (y < n.sy - 6 * s ? 1.1 : y < n.sy + 10 * s ? 0.5 : -0.2) * k; } }
      const ph = Math.abs(u - 250); if (v > 236 && ph < 5) lv -= ph < 1.6 ? 2.2 : 0.6; else if (v > 236 && ph < 7 && u > 250) lv += 0.5;
      L0.px(x, y, band(NOSE, lv, x, y, 1));
      // dry: matte grey-black, dusty cobble tops, little flakes
      let dv = lv * 0.75 + 0.15 + dome * 0.55; const flake = rnd(x * 7919 + y * 104729) < 0.035 && dome > 0.35 && !crease;
      Ld.px(x, y, flake ? DRY[7] : band(DRY, dv, x, y, 1));
      // wet: glossy highlights broken by the cobbles, glints on the upper cells, a reflected rim at the bottom
      let hl = 0;
      for (const [hx, hy, hrx, hry, rot] of HL) { const c = Math.cos(rot), sn = Math.sin(rot), ddx = u - hx, ddy = v - hy, a = ((ddx * c + ddy * sn) / hrx) ** 2 + ((-ddx * sn + ddy * c) / hry) ** 2; hl = Math.max(hl, 1 - a); }
      const rim = v > 250 && d < 9 * s ? (1 - d / (9 * s)) * 0.75 : 0;
      const hlc = Math.max(hl * (0.35 + 0.85 * dome) * (crease ? 0.25 : 1), rim);
      const gl = !crease && C.cy < 170 && Math.hypot(u - (C.cx - CELL * 0.18), v - (C.cy - CELL * 0.2)) < 1.25 && rnd(R(C.cx * 13 + C.cy * 7)) < 0.5;
      let wc = band(NOSE, lv + 0.25, x, y, 1);
      if (hlc > 0.62) wc = hlc > 0.86 ? "#FFFFFF" : "#C9D3F2"; else if (hlc > 0.34) wc = "#7A86B0"; else if (hlc > 0.16 && (x + y) & 1) wc = "#4A4E70";
      else if (sheen(u, v) > bayer(x, y) && !crease) wc = band(NOSE, lv + 1.3, x, y, 1);
      if (gl) wc = C.cy < 170 ? "#FFFFFF" : "#C9D3F2";
      for (const n of nost) { const e = holeE(x, y, n); if (e > 1.06 && e < 1.15 && y < n.sy - 18 * s && Math.abs(x - n.sx + n.side * 8 * s) < 6 * s && !crease) wc = "#C9D3F2"; }
      Lw.px(x, y, wc);
    }
    // wet: little water beads on the leather
    for (const [dx, dy, r] of DROPS) {
      const cx = F.X(dx), cy = F.Y(dy), rr = r * s;
      ellF(Lw, cx, cy, rr + 1, rr + 1, "#020104"); ellF(Lw, cx, cy, rr, rr, "#2A2E48"); ellF(Lw, cx + rr * 0.15, cy + rr * 0.25, rr * 0.75, rr * 0.6, "#3E4466");
      for (let k = 0; k < 10; k++) { const a = 0.2 + k * 0.15; Lw.px(Math.floor(cx + Math.cos(a) * (rr - 0.6)), Math.floor(cy + Math.sin(a) * (rr - 0.6)), "#9AA6D0"); }
      discF(Lw, cx - rr * 0.35, cy - rr * 0.35, Math.max(0.8, rr * 0.3), "#FFFFFF");
    }
    return { F, s, L0, Lw, Ld, mask };
  });
}

// ---------------------------------------------------------------- airflow paths (nominal)
const INHALE = [];
for (const [ni, n] of NOST.entries()) for (let k = 0; k < 7; k++) {
  const th = (k / 7) * TAU + 0.35 + ni * 0.4, R0 = 118 + 22 * rnd(k * 3 + ni);
  INHALE.push({ n, th, R0, ph: rnd(k * 17 + ni * 5) });
}
const EXHALE = [];
for (const n of NOST) for (let k = 0; k < 4; k++) {
  const [sx, sy] = SLIT_END(n), d = n.side, sc = 0.78 + 0.16 * k, dy = (k - 1.5) * 9;
  EXHALE.push({ pts: curve([[sx - d * 6, sy - 12], [sx + d * 24 * sc, sy - 4 + dy], [sx + d * 62 * sc, sy + 6 + dy], [sx + d * 84 * sc, sy + 34 + dy], [sx + d * 70 * sc, sy + 66 + dy * 1.4], [sx + d * 44 * sc, sy + 78 + dy * 1.6]], 10), ph: k * 0.27 + (d > 0 ? 0.13 : 0) });
}

/**
 * drawNostrils(c, box, t, o) — o: { a, wet, dry, inhale, exhale, bg }.
 * wet 0..1 (default 1): glossy highlights, glints and little water beads; dry 0..1: matte, dusty grey-black (wins over
 * wet). The looks crossfade with an ordered dither. inhale 0..1: dotted streams converging straight into the round
 * openings (dots shrink as they go in); exhale 0..1: warm dotted streams leaving the side slits, curling sideways and
 * back. t animates the streams and a twinkle on the wet gloss. bg: "fur" (default, white muzzle) | "dark" | "none".
 * Returns the anchors {left, right, slitL, slitR, nose, philtrum} (screen coordinates).
 */
export function drawNostrils(c, box, t = 0, o = {}) {
  const a = clamp01(o.a ?? 1), b = ibox(box), A = nostrilAnchors(b);
  if (a <= 0) return A;
  const bgMode = o.bg === false || o.bg === "none" ? "none" : o.bg === "dark" ? "dark" : "fur";
  const K = build(b.w, b.h, bgMode), { F, s, L0, Lw, Ld } = K;
  const dry = clamp01(o.dry ?? 0), wet = clamp01(o.wet ?? 1) * (1 - dry), inh = clamp01(o.inhale ?? 0), exh = clamp01(o.exhale ?? 0);
  const g = boxView(c, b, a), P = (p) => [b.x + F.X(p[0]), b.y + F.Y(p[1])];
  const i0 = L0.idx, iw = Lw.idx, id = Ld.idx, W = b.w;
  blit(c, L0, b.x, b.y, a, (i, x, y) => { const q = bayer(b.x + x, b.y + y); return dry > q ? id[i] : wet > q ? iw[i] : i0[i]; });

  // a twinkle on the wet gloss
  if (wet > 0.05) {
    for (const [k, [u, v]] of [[128, 98], [356, 90]].entries()) {
      const tw = Math.max(0, Math.sin(t * 2.3 + k * 2.1)), r = (2 + 4 * tw) * s * wet;
      if (r < 1) continue;
      const [x, y] = P([u, v]), gg = fade(g, wet);
      for (let d = -R(r); d <= R(r); d++) { gg.px(R(x) + d, R(y), Math.abs(d) < r * 0.5 ? "#FFFFFF" : "#C9D3F2"); gg.px(R(x), R(y) + d, Math.abs(d) < r * 0.5 ? "#FFFFFF" : "#C9D3F2"); }
    }
  }

  // breathing in: dots converge straight into the round openings (they come from the front, so they shrink as they go in)
  if (inh > 0) {
    const gi = fade(g, sm01(inh / 0.35));
    for (const st of INHALE) {
      const [hx, hy] = P([st.n.x, st.n.y]);
      for (let j = 0; j < 3; j++) {
        const p = frac(t * 0.62 + j / 3 + st.ph), on = sm01(p / 0.12) * (1 - sm01((p - 0.86) / 0.14));
        if (on <= 0) continue;
        const rr = st.R0 * Math.pow(1 - p, 1.15), ang = st.th + 0.55 * p, x = hx + Math.cos(ang) * rr * s, y = hy + Math.sin(ang) * rr * s * 0.92;
        const dg = fade(gi, on);
        for (let k = 2; k >= 1; k--) { const pp = p - k * 0.035; if (pp < 0) continue; const r2 = st.R0 * Math.pow(1 - pp, 1.15), a2 = st.th + 0.55 * pp; airDot(fade(dg, 0.55), hx + Math.cos(a2) * r2 * s, hy + Math.sin(a2) * r2 * s * 0.92, Math.max(1, lerp(2.8, 1.0, pp) * s), PAL.mucus[5], { glint: false }); }
        airDot(dg, x, y, Math.max(1, lerp(4.2, 1.3, p) * s), PAL.air);
      }
    }
  }

  // breathing out: warm dots leave the side slits and curl sideways and back
  if (exh > 0) {
    const ge = fade(g, sm01(exh / 0.35));
    for (const st of EXHALE) {
      const pts = st.pts.map(P), n = pts.length - 1;
      for (let j = 0; j < 4; j++) {
        const p = frac(t * 0.7 + j / 4 + st.ph), on = sm01(p / 0.1) * (1 - sm01((p - 0.8) / 0.2));
        if (on <= 0) continue;
        const f = p * n, k = Math.min(n - 1, Math.floor(f)), q = f - k, x = lerp(pts[k][0], pts[k + 1][0], q), y = lerp(pts[k][1], pts[k + 1][1], q);
        const dg = fade(ge, on), size = (3.2 + 2.0 * Math.sin(Math.PI * Math.min(1, p * 1.6))) * (1 - 0.45 * p) * s;
        for (let tr = 2; tr >= 1; tr--) { const pp = p - tr * 0.04; if (pp < 0) continue; const ff = pp * n, kk = Math.min(n - 1, Math.floor(ff)), qq = ff - kk; airDot(fade(dg, 0.5), lerp(pts[kk][0], pts[kk + 1][0], qq), lerp(pts[kk][1], pts[kk + 1][1], qq), Math.max(1, size * 0.6), "#F8B890", { glint: false }); }
        airDot(dg, x, y, Math.max(1, size), PAL.breath);
      }
    }
  }
  return A;
}
