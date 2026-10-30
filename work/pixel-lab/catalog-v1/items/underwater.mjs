// catalog-v1 backdrop «underwater»: a sunlit sea floor, re-laid out from work/pixel-lab/animals/film/levels/sea.mjs#back
// (the film's tall sea column: banded dithered water with swaying light shafts, sand bed, reef rock with corals, kelp,
// sea grass, tube worms, anemone, caustic light on the rock top). Copied drawing code lives in lib/sea-kit.mjs; the
// film's characters (sponge, jelly, octopus, fish, crab jar) are not used. Layout in the film's depth coordinates
// «wy» (stage y = wy − 140): sand floor at stage y ≈ 565, rock mounds at both edges, calm open water in the middle.
import { Canvas, bayer, mix, hex } from "../../../../renderer/pixel/raster.mjs";
import { layer } from "../engine/layout.mjs";
import { smooth, drawPart } from "./lib/shade.mjs";
import { makeCache, empty, tintCache, stamp, sandPx, scallop, spiral, brainCoral, staghorn, plateCoral, tubes, drawKelp, drawGrass, drawTubeWorm, drawAnemone, rnd, ang, osc, SAND } from "./lib/sea-kit.mjs";

const R = Math.round, OFF = 140;                       // stage y = wy − OFF
const WX0 = -170, WX1 = 710, FY = 705, SAND_T = 34;
const STONE = ["#241A2C", "#3A2E44", "#54465C", "#706274", "#8C7E8C", "#AA9AA4", "#C8B8B8", "#E6D6CC"];
const floorY = (x) => FY + R(1.4 * Math.sin(x * 0.045) + 0.8 * Math.sin(x * 0.12 + 1)) - (x % 15 >= 6 && x % 15 <= 9 && x > 130 && x < 420 ? 1 : 0);

// rock mounds at both edges (depth coordinates)
const POLY_L = smooth([[-190, 800], [-190, 560], [-120, 538], [-50, 548], [0, 556], [40, 578], [76, 622], [104, 668], [128, 706], [150, 740], [100, 790]], new Set([0, 10]), 6);
const POLY_R = smooth([[720, 800], [720, 548], [650, 520], [590, 524], [540, 540], [506, 566], [486, 612], [470, 664], [458, 706], [440, 745], [500, 790]], new Set([0, 10]), 6);
const topAt = (poly, x) => { let y = 1e9; for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ax <= x && bx > x) || (bx <= x && ax > x)) y = Math.min(y, ay + ((x - ax) / (bx - ax)) * (by - ay)); } return R(y); };

let K = null;
function build() {
  // water: banded depth with dithered transitions (as the film's drawWater, colours for a bright day)
  const W = makeCache(WX0, 0, WX1 - WX0, 1300), steps = ["#3ACCD8", "#1A6EAA", "#0A1A3A", "#06102A"], cache = new Map();
  const col = (A, B, q) => { const k = A + B + q; if (!cache.has(k)) cache.set(k, hex(mix(A, B, q / 4))); return cache.get(k); };
  for (let y = 0; y < 1300; y++) {
    const v = y < 900 ? (y / 900) * 2 : 2 + Math.min(1, (y - 900) / 900), lo = Math.floor(v), f = v - lo, sub = f * 4, sl = Math.floor(sub), sf = sub - sl;
    const A = steps[Math.min(3, lo)], B = steps[Math.min(3, lo + 1)], ca = col(A, B, sl), cb = col(A, B, Math.min(4, sl + 1));
    for (let x = WX0; x < WX1; x++) { const cc = sf > bayer(x, y) ? cb : ca, i = ((y) * W.w + x - WX0) * 3; W.cv.d[i] = cc[0]; W.cv.d[i + 1] = cc[1]; W.cv.d[i + 2] = cc[2]; }
  }
  // sand bed with the strata band below
  const F = makeCache(WX0, 640, WX1 - WX0, 600), g = F.g;
  for (let x = WX0; x < WX1; x++) {
    const fy = floorY(x), wave = R(2 * Math.sin(x * 0.06) + Math.sin(x * 0.17));
    for (let y = fy; y < 1240; y++) {
      const d = y - fy;
      if (d < SAND_T + wave) g.px(x, y, sandPx(x, y, d));
      else if (d === SAND_T + wave) g.px(x, y, "#4A3A3A");
      else { const b = (y + R(Math.sin(x * 0.03) * 3)) % 17; g.px(x, y, b < 2 ? SAND.dark : rnd(x * 31 + y * 7) < 0.05 ? SAND.low : (y - fy) % 41 > 30 ? SAND.deep : SAND.wetDark); }
    }
  }
  // shells, starfish, pebbles on the sand near the sides
  scallop(g, 482, floorY(482) - 1, "#F4B8C8"); spiral(g, 36, floorY(36) - 1); scallop(g, 560, floorY(560) - 1, "#F8D8A8"); scallop(g, -60, floorY(-60) - 1, "#F8D8A8");
  { const x = 80, y = floorY(80) - 1, r = 8; stamp(g, x - r, y - r - 3, r * 2, r * 2, (m) => { const p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; p.push([r + Math.cos(a) * rr, r + Math.sin(a) * rr * 0.9]); } m.poly(p, "#fff"); }, { base: "#F59A3A", light: "#FFD08A", shade: "#B0501E", outline: "#4A2010" }); }
  for (const [x, r, base] of [[-20, 6, "#9C7A62"], [150, 3, "#8E7C6C"], [412, 4, "#8A8098"], [520, 5, "#9A90A8"], [610, 6, "#7C7488"], [-110, 7, "#A48496"]]) stamp(g, R(x - r * 1.5), floorY(x) - r + 1, R(r * 3), r + 2, (m) => m.ellipse(R(r * 1.5), r, R(r * 1.5), r, "#fff"), { base, light: mix(base, "#FFFFFF", 0.35), shade: mix(base, "#1C1424", 0.3), outline: "#2A2030" });
  tintCache(F, -0.12);
  // rocks with corals on top
  const mk = (x0, poly, deco) => { const Kc = makeCache(x0, 480, 460, 340), gg = Kc.g; drawPart(gg, [poly], { ramp: STONE, base: 3.6, gain: 2.0, slope: 2.6, thick: 34, light: [-0.35, -1], rimLit: 1.3, rimShade: 0.7, outline: "#1E1626", litOutline: "#3E3248" });
    for (let x = x0; x < x0 + 460; x++) { const ty = topAt(poly, x); if (ty > 1e8) continue; for (let y = ty + 1; y < ty + 80 && y < 830; y++) { const d = y - ty, q = rnd(x * 71 + y * 37); if (empty(Kc, x, y)) continue; if (d <= 2) gg.px(x, y, d === 1 ? "#F4E4D4" : "#E6D6CC"); else if (q < 0.04) gg.px(x, y, mix(gg.get(x, y), "#1E1626", 0.4)); else if (q > 0.975) gg.px(x, y, mix(gg.get(x, y), "#FFF4E0", 0.35)); } }
    deco(gg); tintCache(Kc, -0.04); return Kc; };
  const RL = mk(-190, POLY_L, (gg) => {
    for (const [px, py, rx, ry, c] of [[12, 580, 22, 8, "#F090B4"], [-40, 560, 18, 7, "#C8A0E8"], [60, 620, 14, 10, "#9AD078"], [-90, 600, 20, 9, "#F8B070"]]) for (let y = py - ry; y <= py + ry; y++) for (let x = px - rx; x <= px + rx; x++) { const dd = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (dd > 1) continue; const ty = topAt(POLY_L, x); if (y <= ty + 2 || y > ty + 30) continue; if ((1 - dd) * 1.4 > bayer(x, y) + 0.2) gg.px(x, y, ((x * 3 + y) & 7) === 0 ? mix(c, "#FFFFFF", 0.4) : c); }
    brainCoral(gg, -52, topAt(POLY_L, -52), 9, "#B8C860"); staghorn(gg, 20, topAt(POLY_L, 20) + 2, "#F07AA0", 0.75); plateCoral(gg, -110, topAt(POLY_L, -110) + 2, "#C8A0E8");
  });
  const RR = mk(300, POLY_R, (gg) => {
    for (const [px, py, rx, ry, c] of [[560, 560, 22, 8, "#C8A0E8"], [610, 556, 18, 7, "#F090B4"], [500, 620, 12, 10, "#F8B070"], [660, 548, 16, 8, "#9AD078"]]) for (let y = py - ry; y <= py + ry; y++) for (let x = px - rx; x <= px + rx; x++) { const dd = ((x - px) / rx) ** 2 + ((y - py) / ry) ** 2; if (dd > 1) continue; const ty = topAt(POLY_R, x); if (y <= ty + 2 || y > ty + 30) continue; if ((1 - dd) * 1.4 > bayer(x, y) + 0.2) gg.px(x, y, ((x * 3 + y) & 7) === 0 ? mix(c, "#FFFFFF", 0.4) : c); }
    staghorn(gg, 590, topAt(POLY_R, 590) + 2, "#F59A5A", 0.6); tubes(gg, 640, topAt(POLY_R, 640) + 2, "#9A70D8"); plateCoral(gg, 536, topAt(POLY_R, 536) + 2, "#C8A0E8");
  });
  return { W, F, RL, RR, A: makeCache(WX0, 400, WX1 - WX0, 430) };
}

// nearest-neighbour scaled copy of a cache (depth coords, stage y = wy − OFF) into the frame
function blit(c, V, Kc, sentinel = true) {
  const x0 = Math.max(0, Math.floor(V.X(Kc.x0))), x1 = Math.min(c.w, Math.ceil(V.X(Kc.x0 + Kc.w))), y0 = Math.max(0, Math.floor(V.Y(Kc.y0 - OFF))), y1 = Math.min(c.h, Math.ceil(V.Y(Kc.y0 + Kc.h - OFF)));
  if (x0 >= x1 || y0 >= y1) return;
  const s = Kc.cv.d, d = c.d, CW = c.w, xs = new Int32Array(x1 - x0);
  for (let x = x0; x < x1; x++) xs[x - x0] = Math.min(Kc.w - 1, Math.max(0, Math.floor(V.wx(x + 0.5) - Kc.x0)));
  for (let y = y0; y < y1; y++) {
    const j = Math.floor(V.wy(y + 0.5) + OFF - Kc.y0); if (j < 0 || j >= Kc.h) continue;
    for (let x = x0; x < x1; x++) { const a = (j * Kc.w + xs[x - x0]) * 3; if (sentinel && s[a] === 1 && s[a + 1] === 2 && s[a + 2] === 3) continue; const b = (y * CW + x) * 3; d[b] = s[a]; d[b + 1] = s[a + 1]; d[b + 2] = s[a + 2]; }
  }
}

export default {
  kind: "underwater",
  backdrop: true,
  covers: ["underwater"],
  source: "animals/film/levels/sea.mjs#back",
  desc: "sunlit sea floor: sand, rock mounds with corals, kelp, light shafts",
  theme: { accent: "#FFE38E", gold: "#F4CA50", hot: "#FFF6CE", core: "#FFFFFF", stone: ["#0E2F55", "#1A4C7C", "#0A2240"], beam: "#BFF6FF" },
  draw(c, cam, t) {
    K ??= build();
    const V = layer(cam, 1);
    blit(c, V, K.W, false);
    // light shafts from the surface, slowly swaying (as the film's drawWater), fading with depth
    for (let k = 0; k < 7; k++) {
      const wx0 = WX0 + 60 + (k + 0.3) * ((WX1 - WX0 - 120) / 7) + Math.sin(t * 0.35 + k * 1.7) * 18, wid = (10 + rnd(k * 9) * 18) * V.z, slant = 0.32, ext = 700 + rnd(k) * 300;
      for (let y = 0; y < c.h; y++) {
        const wy = V.wy(y + 0.5) + OFF, fall = Math.max(0, 1 - wy / ext); if (fall <= 0) break;
        const cx = V.X(wx0 + wy * slant); for (let x = Math.max(0, R(cx - wid)); x <= Math.min(c.w - 1, R(cx + wid)); x++) { const e = 1 - Math.abs(x - cx) / wid; if (e * fall * 0.42 > bayer(x, y) + 0.08) c.px(x, y, mix(c.get(x, y), "#BFF6FF", 0.3)); }
      }
    }
    blit(c, V, K.F);
    // swaying plants into a per-frame layer (depth coords), then scaled like the rest
    const A = K.A, s = A.cv.d; for (let i = 0; i < s.length; i += 3) { s[i] = 1; s[i + 1] = 2; s[i + 2] = 3; }
    const g = A.cv, put = (fn) => fn(g);
    const P = (x, y) => [x - WX0, y - A.y0];
    const tl = (poly, x) => topAt(poly, x);
    { let [x, y] = P(-70, tl(POLY_L, -70) + 4); drawKelp(g, x, y, 190, t, 0.3, 700); [x, y] = P(-6, tl(POLY_L, -6) + 3); drawKelp(g, x, y, 120, t, 1.7, 700); [x, y] = P(100, floorY(100)); drawGrass(g, x, y, 6, 30, t, 1, 700);
      [x, y] = P(520, tl(POLY_R, 520) + 3); drawKelp(g, x, y, 170, t, 2.9, 700); [x, y] = P(612, tl(POLY_R, 612) + 4); drawKelp(g, x, y, 215, t, 4.1, 700);
      [x, y] = P(486, floorY(486)); drawGrass(g, x, y, 7, 34, t, 3, 700); [x, y] = P(-130, floorY(-130)); drawGrass(g, x, y, 6, 28, t, 2, 700);
      const wo = (ph) => 0.5 + 0.5 * Math.max(-1, Math.min(1, 3 * osc(t, 6, ph)));
      [x, y] = P(40, floorY(40) - 4); drawTubeWorm(g, x, y, "#F05A5A", wo(0), 700); [x, y] = P(54, floorY(54) - 2); drawTubeWorm(g, x, y, "#5AB4F0", wo(1.7), 700); [x, y] = P(500, floorY(500) - 5); drawTubeWorm(g, x, y, "#F8CE3E", wo(3.1), 700);
      [x, y] = P(466, floorY(466) + 3); drawAnemone(g, x, y, t, 0.5, 700, "#B88AF0", "#F0E4FF"); }
    blit(c, V, A);
    blit(c, V, K.RL); blit(c, V, K.RR);
    // caustic light dancing on the sunlit sand (as on the film's reef top)
    for (let x = 0; x < c.w; x++) { const wx = R(V.wx(x + 0.5)), fy = floorY(wx), y0 = Math.max(0, Math.floor(V.Y(fy + 1 - OFF))), y1 = Math.min(c.h, Math.ceil(V.Y(fy + 8 - OFF)));
      for (let y = y0; y < y1; y++) { const wy = V.wy(y + 0.5) + OFF, f = Math.sin(wx * 0.21 + 2.2 * Math.sin(wy * 0.5 + ang(t, 40)) + ang(t, 23)) + Math.sin(wx * 0.13 - ang(t, 31) + wy * 0.2); if (f > 1.25) c.px(x, y, mix(c.get(x, y), "#FFF8D8", 0.4)); } }
  },
  notes: "Film column re-laid out for the stage: sand floor at stage y ≈ 565, rock mounds (film reef rock shading + coral stamps) at both edges, kelp/grass/tube worms/anemone at the sides, open middle. Idle motion (kelp, anemone, worms, shafts, caustics) is smooth and periodic. The film's baby sponge face and all characters are omitted.",
};
