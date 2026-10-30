// ed138 «observatory» (new, 2026-10-28): a big survey observatory on a summit — our own drawing after the general shape of the
// Rubin Observatory (no logo, no lettering): a white cylindrical pier, a boxy faceted dome with vents and a vertical slit, a
// low service building with a few warm windows, a short wide telescope with a big camera inside the slit, a red beacon.
// States: idle (slit turned away, closed), rotate (dome turns until the slit faces us), open (shutters part: telescope seen),
// shoot (a soft white flash leaves the slit: a picture is taken). Pure function of its inputs; drawn per pixel at any zoom.
import { bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { clamp01, band, tintPx } from "../lib/layout.mjs";
import { Spr, OUT } from "../lib/space-kit.mjs";

const R = Math.round, D2R = Math.PI / 180;
const WALL = ["#121424", "#1E2238", "#2E3452", "#424A6E", "#5A648A", "#7A86A8", "#A0ACC8", "#CCD6EA"];
const CONC = ["#14121C", "#211E2A", "#322E3E", "#454054", "#5A566C", "#726E86", "#8E8AA2", "#ACA8BE"];
const IN = "#0C0912", RED = "#C8343A", AMBER = "#F2B04A";
const LX = -0.62, LY = 0.55, LZ = 0.56;                     // light (upper left, toward the viewer)

/** o: { a, rot 0..1 (slit from 70° left to front), open 0..1, flash 0..1, t } */
export function drawObservatory(c, cx, cy, z, o) {
  const A = o.a ?? 1, t = o.t ?? 0, open = clamp01(o.open ?? 0), fl = clamp01(o.flash ?? 0);
  const yb = cy + 72 * z, rD = 58, aS = (-70 + 70 * clamp01(o.rot ?? 0)) * D2R;
  const spr = new Spr(cx, cy, 100 * z, 76 * z), P = (X, Y, col) => spr.set(X, Y, col);
  const U = (X) => (X + 0.5 - cx) / z, V = (Y) => (yb - (Y + 0.5)) / z;           // building units: u right, v up from the base
  const box = (u0, u1, v0, v1, f) => { for (let Y = Math.floor(yb - v1 * z); Y <= Math.ceil(yb - v0 * z); Y++) for (let X = Math.floor(cx + u0 * z); X <= Math.ceil(cx + u1 * z); X++) { const u = U(X), v = V(Y); if (u >= u0 && u < u1 && v >= v0 && v < v1) { const col = f(u, v, X, Y); if (col) P(X, Y, col); } } };
  // plinth and the low left annex
  box(-92, 98, 0, 6, (u, v, X, Y) => band(CONC, v > 4.5 ? 0.62 : 0.4 - 0.002 * u, X, Y));
  box(-82, -40, 6, 22, (u, v, X, Y) => (v > 20.5 ? band(WALL, 0.75, X, Y) : Math.abs(u + 62) < 3 && v < 14 ? IN : band(WALL, 0.5 + (u < -74 ? 0.1 : 0) - 0.12 * (v < 9 ? 1 : 0) * 0, X, Y)));
  // service building (right): flat roof, panel seams, windows (two warm)
  box(30, 96, 6, 42, (u, v, X, Y) => {
    if (v > 40) return band(WALL, 0.82, X, Y);
    const win = v > 22 && v < 30 && ((u - 38) % 13 + 13) % 13 < 6 && u > 36 && u < 90;
    if (win) { const k = Math.floor((u - 38) / 13); return k === 1 || k === 3 ? mix(AMBER, "#7A4A20", v < 24 ? 0.35 : 0) : "#141826"; }
    const seam = ((v - 6) % 9 + 9) % 9 < 0.9 * (1 / z + 0.2);
    return band(WALL, 0.5 - (u > 92 ? 0.12 : 0) - (seam ? 0.08 : 0), X, Y);
  });
  // pier: white cylinder, shaded by its normal, panel seams, a door
  box(-44, 44, 6, 80, (u, v, X, Y) => {
    const nx = u / 44, nz = Math.sqrt(Math.max(0, 1 - nx * nx)), lam = nx * LX + nz * LZ;
    if (Math.abs(u + 4) < 6 && v < 22) return v > 20.5 ? band(WALL, 0.3, X, Y) : "#0E1220";
    const seam = ((v - 6) % 12 + 12) % 12 < 1 / z + 0.2;
    return band(WALL, 0.2 + 0.62 * clamp01(lam) - (seam ? 0.07 : 0), X, Y);
  });
  // dome: a 12-sided boxy prism (v 80..124) with a chamfered top (v 124..136)
  const verts = []; for (let k = 0; k <= 12; k++) verts.push(aS + (k * 30 + 15) * D2R);
  const sx = Math.sin(aS) * rD, sCos = Math.cos(aS), slitHalf = (2.5 + 14 * open) * sCos, slitW = 13 * sCos;
  const telU = sx, tilt = 0;                                      // telescope centred in the slit
  box(-rD - 1, rD + 1, 80, 137, (u, v, X, Y) => {
    const top = v > 124, rr = top ? rD - (rD - 44) * ((v - 124) / 12) : rD; if (Math.abs(u) > rr) return null;
    // which facet covers this column (front side only)
    const a = Math.asin(Math.max(-1, Math.min(1, u / rr)));
    let k = Math.floor(((a - aS) / D2R - 15) / 30); const am = aS + (k * 30 + 30) * D2R;     // facet mid angle
    const nx = Math.sin(am), nz = Math.cos(am), ny = top ? 0.72 : 0, nl = Math.hypot(nx * (top ? 0.7 : 1), ny, nz * (top ? 0.7 : 1));
    let lam = (nx * (top ? 0.7 : 1) * LX + ny * LY + nz * (top ? 0.7 : 1) * LZ) / nl, vv = 0.18 + 0.66 * clamp01(lam);
    const ue = rr * Math.sin(am - 15 * D2R), ue2 = rr * Math.sin(am + 15 * D2R);
    if (Math.abs(u - ue) < 0.7 / z + 0.15 || Math.abs(u - ue2) < 0.7 / z + 0.15) vv -= 0.1;   // facet edges
    // vents: three slats in the middle of each wall facet
    const fu = (u - Math.min(ue, ue2)) / Math.max(0.01, Math.abs(ue2 - ue));
    if (!top && v > 96 && v < 114 && fu > 0.2 && fu < 0.8 && Math.cos(am) > 0.25 && ((v - 96) % 6) < 2.2) vv -= 0.2;
    if (v < 82.5) vv -= 0.12;                                                                    // shadow line under the dome
    // the slit (only on the visible front): dark interior with the telescope; shutter rails at its sides
    if (sCos > 0.05 && v > 84 && v < 134) {
      const du = u - sx;
      if (Math.abs(du) < slitHalf) {
        // telescope: mirror cell ring at v 92, truss to the top ring at v 116, big camera in the ring, red work light below
        const tu = du / Math.max(0.4, sCos), rel = v - 88;
        let col = mix(IN, "#3A1218", clamp01(0.5 - rel / 40) * 0.8);
        if (rel > 2 && rel < 7 && Math.abs(tu) < 12) col = band(WALL, rel > 5.5 ? 0.55 : 0.32, X, Y);             // mirror cell
        if (rel >= 7 && rel < 28 && (Math.abs(Math.abs(tu) - (10 - rel * 0.12)) < 0.9 || Math.abs(tu - (rel - 17) * 0.6) < 0.7 || Math.abs(tu + (rel - 17) * 0.6) < 0.7)) col = band(WALL, 0.45, X, Y); // truss
        if (rel >= 26 && rel < 30 && Math.abs(tu) < 9.5) col = band(WALL, rel > 28.5 ? 0.7 : 0.45, X, Y);          // top ring
        if (rel >= 18 && rel < 26 && Math.abs(tu) < 4.5) col = Math.abs(tu) < 1.6 && rel > 20 && rel < 23 ? mix("#7FE3F0", "#FFFFFF", fl) : band(WALL, 0.62 - 0.02 * tu, X, Y); // camera
        return fl > 0 ? mix(col, "#E8F4FF", fl * 0.6) : col;
      }
      if (Math.abs(du) < slitHalf + 2.2 && Math.abs(du) < slitW + 2.2) vv = du < 0 ? 0.62 : 0.3;      // shutter edges
    }
    return band(WALL, vv, X, Y);
  });
  // beacon mast on the dome top
  box(-1, 1, 136, 142, (u, v, X, Y) => band(CONC, 0.5, X, Y));
  spr.outline(OUT, "#2A2E48");
  spr.flush(c);
  const bx = R(cx), by = R(yb - 143 * z), blink = 0.5 + 0.5 * Math.sin(t * 2.4);
  c.px(bx, by, mix("#3A0C10", RED, blink)); if (z > 1.2) { c.px(bx + 1, by, mix("#3A0C10", RED, blink)); }
  for (const [i, j] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) tintPx(c, bx + i, by + j, RED, A * blink * 0.5, 4);
  // flash: soft white light leaves the slit (dithered tint, upward)
  if (fl > 0.01 && sCos > 0.2) for (let Y = R(yb - 150 * z); Y < R(yb - 84 * z); Y++) for (let X = R(cx + (sx - 20) * z); X <= R(cx + (sx + 20) * z); X++) {
    const du = Math.abs((X + 0.5 - cx) / z - sx), vv = (yb - Y) / z; const k = fl * clamp01(1 - du / (slitHalf + 6 + (vv - 84) * 0.15)) * (vv > 134 ? clamp01(1 - (vv - 134) / 16) : 0.5);
    tintPx(c, X, Y, "#E8F4FF", A * k * 0.8, 4);
  }
  return { box: { x0: cx - 90 * z, y0: yb - 143 * z, x1: cx + 92 * z, y1: yb }, pt: [cx + sx * z, yb - 132 * z], slit: [cx + sx * z, yb - 132 * z], slitOpen: open * sCos };
}

export default {
  kind: "observatory",
  covers: ["observatory", "telescope", "survey telescope", "dome", "rubin observatory"],
  source: "ed138 (new)",
  desc: "a big white mountaintop observatory: round pier, boxy dome with a slit, telescope inside, red beacon",
  hw: 92, hh: 74, start: "beacon blinks softly, dome closed",
  states: {
    idle: [0.5, "dome closed, slit turned away"],
    rotate: [1.1, "the dome turns until its slit faces the viewer", "whirr"],
    open: [0.9, "the slit shutters part: the telescope and its big camera show", "creak"],
    shoot: [0.5, "a soft white flash leaves the slit: a picture is taken", "tick"],
  },
  base: { rot: 0, open: 0 },
  st: { idle: { rot: 0, open: 0 }, rotate: { rot: 1 }, open: { rot: 1, open: 1 }, shoot: { rot: 1, open: 1 } },
  notes: "anchor (cx, cy) is the body centre; the base sits at cy + 72·z (put the summit there). Returns slit = beam origin.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    return drawObservatory(c, cx, cy, z, { a: s.a, rot: v.rot, open: v.open, flash: Math.sin(Math.PI * s.acc("shoot")), t });
  },
};
