// catalog-v1 prop «building»: one four-storey city facade from «The last person alive» (zombie-mouse/film/town-street.mjs
// building, copy in lib/zombiemouse-building.mjs): plaster with patches of bare brick, rain stains, cornice, storey ledges,
// 4 × 3 glass windows with sills, AC units, a fire escape, a half-open roll shutter on the ground floor, the warm low-sun rim
// on its left edge. Spec fixed: no boarded/broken windows, no vines, no torn awning or sign (the film's dead-town wear).
// Per frame on top of the cached facade: windows light up one by one (each dissolves in), a night grade (dithered), a shake.
import { Strip, building, painter, GLASS, INSIDE, band, pick } from "./lib/zombiemouse-building.mjs";
import { bayer, hex } from "../../../../renderer/pixel/raster.mjs";
import { sm, rnd } from "../engine/layout.mjs";

const R = Math.round, TAU = Math.PI * 2;
const SPEC = { x0: -110, x1: 110, h: 380, mat: "plaster", storeys: 4, ground: "shutter", awning: false, wins: -0.35, roof: "flat", vines: 0, seed: 23, rim: true, escape: true, ac: true, sign: false };
const K0 = 0.62, W0 = -122, HH = 119;       // facade world units → grid px at z 1; strip left edge (world); half height (px)
const pack = (r, g, b) => (r << 16) | (g << 8) | b;
const GLASSY = new Set([...GLASS, ...INSIDE].map((c) => pack(...hex(c))));
const WARM = ["#7A4020", "#C0702C", "#E8A040", "#F6CC5A", "#FFE79A"], COOL = ["#2E3A66", "#5670AE", "#94B2E6", "#D6E6FF"];

const CACHE = new Map();
function facade(zq) {
  let F = CACHE.get(zq);
  if (F) { CACHE.delete(zq); CACHE.set(zq, F); return F; }
  const kz = K0 * zq, SY = R((SPEC.h + 8) * kz), W = R((SPEC.x1 - W0 + 12) * kz) + 4;
  const s = new Strip(W, 0, SY + 3), L = { s, W0, z: kz, SY, CY: 0, p: 0 };
  building(L, SPEC);
  // the glass windows, in the same order and rects as building() lays them out
  const P = painter(L), storeyH = (SPEC.h - 20) / SPEC.storeys, nW = Math.max(1, Math.floor((SPEC.x1 - SPEC.x0) / 52)), ww = 26, wh = Math.min(62, storeyH * 0.5), wins = [];
  for (let st = 0; st < SPEC.storeys - 1; st++) for (let k = 0; k < nW; k++) {
    const cx = SPEC.x0 + ((k + 0.5) / nW) * (SPEC.x1 - SPEC.x0), wy0 = -SPEC.h + 20 + storeyH * st + storeyH * 0.24, i = wins.length;
    wins.push({ a: R(P.X(cx - ww / 2)), b: R(P.X(cx + ww / 2)), t: R(P.Y(wy0)), d: R(P.Y(wy0 + wh)), cool: rnd(i * 17 + 5) > 0.72, key: rnd(i * 31 + 7) });
  }
  [...wins].sort((u, v) => u.key - v.key).forEach((w, n) => (w.order = n));
  F = { s, SY, W, wins, x0: R(P.X(SPEC.x0)) - 3, x1: R(P.X(SPEC.x1)) + 3, top: R(P.Y(-SPEC.h)) - 1 };
  CACHE.set(zq, F); if (CACHE.size > 32) CACHE.delete(CACHE.keys().next().value);
  return F;
}

export default {
  kind: "building",
  covers: ["building"],
  source: "zombie-mouse/film/town-street.mjs#building",
  desc: "four-storey city building front: plaster, 12 windows, AC units, fire escape, roll shutter",
  hw: 72, hh: 122,
  start: "stands in low evening sun, windows dark",
  states: {
    stand: [0.5, "stands in low evening sun, windows dark"],
    "lights-on": [1.4, "its windows light up one by one", "glow"],
    night: [0.9, "night falls on the facade, lit windows glow", "dim"],
    "lights-off": [1.2, "the windows go dark one by one", "dim"],
    shake: [0.6, "the whole building shakes as if in an earthquake", "thump"],
  },
  base: { lights: 0, night: 0 },
  st: { stand: { lights: 0, night: 0 }, "lights-on": { lights: 1 }, night: { night: 1, lights: 1 }, "lights-off": { lights: 0 }, shake: {} },
  linear: ["lights"],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Fixed facade (the film's plaster spec, seed 23, 4 storeys, no dead-town wear) in its low-sun violet palette: a dark, evening-looking building; light props read best in front of it. Close-ups re-paint the facade at the camera zoom (cached per 1 % of zoom); brick courses, shutter ribs and the AC grille keep the film's fixed pixel sizes. Lights: the 12 glass windows dissolve in one by one in a fixed shuffled order (3 TV-blue, the rest warm); only glass pixels light, so the fire escape and frames stay in front. Night = dithered darkening of the facade; shake = ±2 px. The film's roof collapse is not ported (it erases the roof and adds rafters at a fixed state; easing it needs a rebuild). The rusty roll shutter reads busy.",
  draw(c, cx, cy, z, t, s) {
    const zq = Math.max(0.3, Math.round(z * 100) / 100), F = facade(zq), v = s.v;
    const sh = Math.sin(Math.PI * s.acc("shake", 0, 1)), dx = R(2 * sh * Math.sin(t * TAU * 6)), dy = R(0.6 * sh * Math.sin(t * TAU * 8 + 1));
    const gy = R(cy + HH * z) + dy, ox = R(cx + W0 * K0 * zq) + dx, oy = gy - F.SY;
    const S = F.s, d = S.d, m = S.m, W = S.w, H = S.h, night = v.night, q = v.lights * (F.wins.length + 2);
    // facade with the dithered night grade
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x; if (!m[i]) continue;
      const k = i * 3; let r = d[k], g = d[k + 1], b = d[k + 2];
      if (night > 0 && bayer(x, y) < night) { r = R(r * 0.46 + 4); g = R(g * 0.5 + 6); b = R(b * 0.66 + 20); }
      c.px(ox + x, oy + y, [r, g, b]);
    }
    // lit windows: each dissolves in on its turn (only the glass pixels, the fire escape and frames stay in front)
    if (q > 0) for (const w of F.wins) {
      const k = sm(q, w.order, w.order + 2); if (k <= 0) continue;
      const RAMP = w.cool ? COOL : WARM;
      for (let y = w.t; y < w.d; y++) for (let x = w.a; x < w.b; x++) {
        if (bayer(x, y) >= k) continue;
        const i = y * W + x; if (!m[i] || !GLASSY.has(pack(d[i * 3], d[i * 3 + 1], d[i * 3 + 2]))) continue;
        const u = (y - w.t) / (w.d - w.t);
        c.px(ox + x, oy + y, pick(RAMP, band(RAMP.length - 1.4 - u * 1.8 + (x - w.a < 2 ? -0.6 : 0), x, y)));
      }
    }
    const box = { x0: ox + F.x0, y0: oy + F.top, x1: ox + F.x1, y1: gy };
    return { box, pt: [R(cx), R((box.y0 + box.y1) / 2)] };
  },
};
