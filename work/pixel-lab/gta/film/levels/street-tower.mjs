// The LOD tower of «GTA 6: the city behind you»: the landmark tower on the far skyline. "Far away, a tower is just a
// simple box" → its far look dissolves into a flat grey box; "It gets its details only when you come close" → it slides
// from the skyline to the near row, growing, and gains detail in dithered steps (box → windows → balconies/neon crown →
// full art); then it slips back to the skyline and its far look returns. Painted live into a small Art (both looks).
import { EV } from "../timeline.mjs";
import { Art, bakeBlue, vgrad, hline, vline, sm, ease, lerp, win, mix, bayer, rnd, K_WALL, K_GLASS, K_NEON } from "./street-kit.mjs";
import { TOWER, FAR_P, BASE } from "./street-art.mjs";

const R = Math.round;
// beats (seconds) — all from the timeline's words
export const T = {
  hi: [EV.far, EV.away + 0.55],                     // "far away": the tower is singled out (outline pulse)
  box: [EV.tower, EV.simple + 0.12],                // "a tower is just a simple box": far detail dissolves to a grey box
  come: [EV.details - 0.04, EV.close + 0.06],       // "gets its details only when you come close": it approaches
  lod1: [EV.details + 0.22, EV.details + 0.5],       // windows
  lod2: [EV.details + 0.62, EV.details + 0.92],      // balconies, crown steps, neon crown
  lod3: [EV.come - 0.06, EV.close + 0.3],           // full colour, glass reflections, spire
  back: [EV.people - 0.3, EV.people + 0.45],        // slips back to the skyline by ≈ 24.6, far look returns
  front: [EV.details - 0.04, EV.details + 0.36],    // crossfade: drawn in front of the near row
};
export const TAGS = { box: [EV.simple, EV.details - 0.2], close: [EV.close - 0.04, EV.people - 0.42] };

/** State of the tower at t: approach u (0 far → 1 near), detail levels, far look, box flatness, front alpha, highlight. */
export function towerState(t) {
  const come = ease(sm(t, T.come[0], T.come[1])), back = ease(sm(t, T.back[0], T.back[1])), u = come * (1 - back);
  const box = sm(t, T.box[0], T.box[1]) * (1 - sm(t, T.back[0] + 0.3, T.back[1]));
  const l1 = sm(t, T.lod1[0], T.lod1[1]) * (1 - sm(t, T.back[0], T.back[0] + 0.45));
  const l2 = sm(t, T.lod2[0], T.lod2[1]) * (1 - sm(t, T.back[0], T.back[0] + 0.35));
  const l3 = sm(t, T.lod3[0], T.lod3[1]) * (1 - sm(t, T.back[0], T.back[0] + 0.3));
  const front = sm(t, T.front[0], T.front[1]) * (1 - sm(t, T.back[0] + 0.35, T.back[1]));
  const hi = win(t, T.hi[0], T.hi[1], 0.15, 0.35) * (0.6 + 0.4 * Math.sin((t - T.hi[0]) * 9));
  return { u, box, l1, l2, l3, front, hi, s: 1 + 0.4 * u };
}
/** Screen placement: centre x, base y, scale. Far = on the far layer (parallax), near = on the street row. */
export function towerPlace(V, t, st = towerState(t)) {
  const farX = TOWER.lx - (V.cx - 540) * FAR_P, farY = TOWER.base + (-180 - V.cy) * 0.4;
  const nearX = TOWER.lx + 2, nearY = BASE + (-180 - V.cy);
  return { x: lerp(farX, nearX, st.u), base: lerp(farY, nearY, st.u), s: st.s };
}

const art = new Art(110, 330, 0, 0);
let cacheKey = null;
/** Paint the tower (both looks) for state st at screen (x, base); returns the Art (ox/oy in screen space). */
export function towerArt(V, t) {
  const st = towerState(t), pl = towerPlace(V, t, st);
  const key = [R(pl.x), R(pl.base), st.s.toFixed(3), st.box.toFixed(2), st.l1.toFixed(2), st.l2.toFixed(2), st.l3.toFixed(2)].join("|");
  if (key === cacheKey) return { A: art, st, pl };
  cacheKey = key;
  art.clear(); art.ox = R(pl.x) - 55; art.oy = R(pl.base) - 320;
  paint(art, R(pl.x), R(pl.base), st);
  bakeBlue(art, 12);
  return { A: art, st, pl };
}

function paint(A, cx, base, st) {
  const g = A.g, s = st.s, w = R(TOWER.w * s), h = R(TOWER.h * s), x0 = cx - (w >> 1), x1 = x0 + w, top = base - h;
  const farA = 1 - st.box, near = st.u;            // far hazy detail; near-ness (for colour saturation)
  const gate = (k, X, Y) => k >= 1 || (k > 0 && k > bayer(X, Y));
  // --- body: far hazy mauve → flat grey box → full cream art deco (each a dither dissolve on top of the previous)
  A.pen = { id: 1, f: 0, bp: 0, kind: K_WALL };
  const hazyBody = (X, Y) => { const v = (Y - top) / h; return mix("#AE76A4", "#E8A8B4", v * v > bayer(X, Y) ? 0.55 : 0); };
  const greyBody = (X, Y) => (X === x0 || X === x1 - 1 || Y === top ? "#6A6A80" : "#9A9AAE");
  const fullBody = (X, Y) => {
    const v = (Y - top) / h, side = (X - x0) / w; let c = mix("#FFF4E4", "#F2D2BC", v > bayer(X, Y) * 1.4 ? 0.6 : 0);
    if (side < 0.08) c = "#FFFFFF"; else if (side > 0.86) c = mix("#D8A890", "#B07A84", side > 0.94 ? 1 : 0);
    const stripe = ((X - x0) % R(10 * s)) < R(2 * s); if (stripe && side > 0.12 && side < 0.84) c = mix(c, "#7ED8D8", 0.55);
    return c;
  };
  for (let Y = top; Y < base; Y++) for (let X = x0; X < x1; X++) {
    let c = hazyBody(X, Y);
    if (gate(st.box, X, Y)) c = greyBody(X, Y);
    if (gate(st.l3, X, Y)) c = fullBody(X, Y);
    g.px(X, Y, c);
  }
  // far look extras: rim light toward the sun (left), faint window rows, crown steps + spire with a beacon
  if (farA > 0) A.with({ f: 1, kind: K_GLASS }, () => {
    for (let Y = top; Y < base; Y++) if (gate(farA, x0, Y)) g.px(x0, Y, "#F8C8CC");
    for (let Y = top + 5; Y < base - 4; Y += 5) for (let X = x0 + 3; X < x1 - 3; X += 4) if (gate(farA, X, Y) && rnd(X * 31 + Y * 7) > 0.5) g.px(X, Y, rnd(X + Y * 3) > 0.8 ? "#FFE49A" : "#D8A0B8");
  });
  // crown: stepped top + spire; far look (hazy), lod2 (crisp steps), lod3 (gold + neon ring)
  const crownA = Math.max(farA, st.l2), cw = w - R(8 * s), cw2 = w - R(16 * s), sh = R(6 * s);
  const crownCol = (X, Y, k) => (gate(st.l3, X, Y) ? (k ? "#FFD27A" : "#FFF0D4") : gate(st.l2, X, Y) ? (k ? "#7A7A92" : "#B8B8CA") : "#B884AC");
  if (crownA > 0) {
    for (let Y = top - sh; Y < top; Y++) for (let X = cx - (cw >> 1); X < cx + (cw >> 1); X++) if (gate(crownA, X, Y)) g.px(X, Y, crownCol(X, Y, Y === top - sh));
    for (let Y = top - 2 * sh; Y < top - sh; Y++) for (let X = cx - (cw2 >> 1); X < cx + (cw2 >> 1); X++) if (gate(crownA, X, Y)) g.px(X, Y, crownCol(X, Y, Y === top - 2 * sh));
    const sp = R(16 * s); for (let Y = top - 2 * sh - sp; Y < top - 2 * sh; Y++) if (gate(crownA, cx, Y)) { g.px(cx, Y, gate(st.l3, cx, Y) ? "#FFE8B0" : "#8E6A8E"); if (Y > top - 2 * sh - sp * 0.5) g.px(cx + 1, Y, gate(st.l3, cx, Y) ? "#C8A070" : "#7A5A7E"); }
    A.with({ id: 3, kind: K_NEON, bp: 3 }, () => { const by = top - 2 * sh - sp - 1; if (gate(crownA, cx, by)) { g.px(cx, by, "#FF4A5A"); g.px(cx, by - 1, "#FFB0B8"); } });
  }
  // lod1: window grid (plain dark glass on the box); lod3 recolours it to sunset glass
  if (st.l1 > 0) A.with({ f: 1, kind: K_GLASS }, () => {
    const ww = Math.max(2, R(4 * s)), wh = Math.max(3, R(5 * s)), gx = R(7 * s), gy = R(9 * s);
    for (let Y = top + R(5 * s); Y + wh < base - R(10 * s); Y += gy) for (let X = x0 + R(4 * s); X + ww <= x1 - R(4 * s); X += gx)
      for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { const PX = X + i, PY = Y + j; if (!gate(st.l1, PX, PY)) continue;
        let c = j === 0 ? "#4A4A62" : "#5E6280";
        if (gate(st.l3, PX, PY)) { c = j === 0 ? "#FFE0C8" : mix("#FFC8A8", "#6E70C4", j / wh); if (i === 0 && j === 1) c = "#FFFFFF"; if (rnd(X * 13 + Y * 7) > 0.8) c = j < 1 ? "#FFF2B8" : "#F6C060"; }
        g.px(PX, PY, c); }
  });
  // lod2: balconies (white rails every other floor) + a neon ring under the crown + entrance canopy
  if (st.l2 > 0) {
    A.with({ f: 2, bp: 3 }, () => { const gy = R(9 * s); for (let Y = top + R(12 * s); Y < base - R(14 * s); Y += gy * 2) for (let X = x0 + 2; X < x1 - 2; X++) if (gate(st.l2, X, Y)) { g.px(X, Y, gate(st.l3, X, Y) ? "#FFFFFF" : "#C8C8D8"); if ((X & 1) === 0) g.px(X, Y - 1, gate(st.l3, X, Y) ? "#F4F4FF" : "#B0B0C4"); } });
    A.with({ id: 4, kind: K_NEON, bp: 3, f: 0 }, () => { for (let X = x0; X < x1; X++) if (gate(st.l2, X, top)) g.px(X, top, gate(st.l3, X, top) ? "#52F2FF" : "#7CA8B8"); });
    A.with({ f: 3 }, () => { const ey = base - R(10 * s); for (let X = cx - R(8 * s); X < cx + R(8 * s); X++) for (let Y = ey; Y < base; Y++) if (gate(st.l2, X, Y)) g.px(X, Y, Y === ey ? (gate(st.l3, X, Y) ? "#FF7AAE" : "#8A8AA0") : gate(st.l3, X, Y) ? mix("#FFF0B0", "#F2A860", (Y - ey) / (base - ey)) : "#5E6280"); });
  }
  // lod3 extras: a vertical neon name fin and rim light
  if (st.l3 > 0) A.with({ id: 5, kind: K_NEON, bp: 3, f: 0 }, () => { for (let Y = top + R(8 * s); Y < top + R(60 * s); Y++) if (gate(st.l3, x1 - 2, Y) && ((Y - top) % 4 < 3)) g.px(x1 - 2, Y, "#FF5AAE"); });
}
