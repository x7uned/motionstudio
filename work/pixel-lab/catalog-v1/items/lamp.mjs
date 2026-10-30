// catalog-v1 item «lamp»: the standing floor lamp of the cat-zoomies living room (cat-zoomies/film/apartment-props.mjs#
// drawFloorLamp: brass base, slim stand with a switch, linen drum shade with five ribs). The film only drew it unlit; here the
// shade warms up and a dithered halo spreads from the bulb: on (eased), dim, a smooth flicker, off. Film code copied in
// lib/zoomies-props.mjs (PAL, LAYOUT), drawn through lib/zoomies-props-canvas.mjs. Scale S = px per film unit at z 1.
import { target, rect1, poly, ellipse, disc, line, vol, rgb, bayer } from "./lib/zoomies-props-canvas.mjs";
import { PAL } from "./lib/zoomies-props.mjs";
import { LAYOUT } from "./lib/zoomies-layout.mjs";

const R = Math.round, W = 540, H = 960;
const S = 0.6;
const WARM = [255, 228, 160], NIGHTSHADE = [44, 36, 48];
const mixA = (a, b, k) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * k));
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** Floor lamp geometry in film units (film lampFloorGeom). */
function lampGeom() { const x = LAYOUT.floorLamp.x, cy = LAYOUT.floorLamp.shadeY; return { x, shadeTop: cy - 20, shadeBot: cy + 17, wTop: 16, wBot: 25, cy }; }

export default {
  kind: "lamp",
  covers: ["lamp"],
  source: "cat-zoomies/film/apartment-props.mjs#drawFloorLamp",
  desc: "tall brass floor lamp with a linen drum shade; switches on, dims, flickers",
  hw: 24, hh: 96, start: "stands switched off, the shade is dim",
  states: {
    off: [0.5, "the lamp is off, the shade is dull linen"],
    on: [0.8, "the lamp switches on, the shade warms and a soft glow spreads", "glow"],
    flicker: [0.8, "the light flickers like an old bulb, smoothly", "flutter"],
    dim: [0.6, "the light is turned down to a low warm glow", "dim"],
  },
  base: { light: 0, flick: 0 },
  st: { off: { light: 0, flick: 0 }, on: { light: 1, flick: 0 }, flicker: { light: 1, flick: 1 }, dim: { light: 0.35, flick: 0 } },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: {},
  notes: "Film lamp copied as drawn (brass base, stand, switch, linen shade with ribs and rim). Added: a bulb glow (three dithered halo steps blended onto whatever is behind, strength = light), warm tint of the linen (0.4 × light) and a dimmer shade when off, a small bulb disc through the dissolve gate. Flicker = light × (1 − flick × (0.14 + 0.12 sin·sin)), always within 26 % and smooth in t. Wall shadow and floor patch are not part of the prop.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z * S, g = lampGeom();
    const L = { z: k, X: (x) => cx + (x - LAYOUT.floorLamp.x) * k, Y: (y) => cy + (y - (-141)) * k };
    const T = (p) => [L.X(p[0]), L.Y(p[1])];
    const light = clamp01(v.light), flick = clamp01(v.flick);
    const amt = light * (1 - flick * (0.14 + 0.12 * Math.sin(t * 2.7) * Math.sin(t * 5.1 + 0.5)));
    const bx = L.X(g.x), by = L.Y(g.cy);
    // halo: three dithered steps around the bulb, blended over the backdrop (c.get / c.px go through the dissolve view)
    target(c, 1);
    if (amt > 0.002) {
      const rad = 46 * k, xa = R(bx - rad), xb = R(bx + rad), ya = R(by - rad), yb = R(by + rad);
      for (let y = ya; y < yb; y++) for (let x = xa; x < xb; x++) {
        const d = Math.hypot(x + 0.5 - bx, y + 0.5 - by) / rad; if (d >= 1) continue;
        const f = amt * 0.55 * Math.pow(1 - d, 1.4); if (f <= bayer(x, y)) continue;
        const bg = c.get(x, y); c.px(x, y, mixA(bg, WARM, 0.42));
      }
    }
    // film shade colours, tinted warm by light (dim linen when off)
    const LT = [0, 1, 2, 3, 4, 5, 6].map((i) => mixA(mixA(PAL.linen[i], WARM, 0.4 * light), NIGHTSHADE, 0.3 * (1 - light)));
    // base shadow, stand, switch (film drawFloorLamp)
    ellipse(L.X(g.x), L.Y(-2.5), 15 * k, Math.max(1.2, 3 * k), PAL.brass[1]); ellipse(L.X(g.x - 1), L.Y(-3.4), 11 * k, Math.max(0.8, 1.6 * k), PAL.brass[3]);
    rect1(L.X(g.x - 1.5), L.Y(g.shadeBot), L.X(g.x + 1.5), L.Y(-4), PAL.brass[2]); rect1(L.X(g.x - 1.5), L.Y(g.shadeBot), L.X(g.x - 0.6), L.Y(-4), PAL.brass[5]);
    { const x0 = g.x - 3, x1 = g.x + 3, y0 = -150, y1 = -143; /* switch: film wbox, fill 3 hi 5 lo 2 */
      const xa = R(L.X(x0)), xb = R(L.X(x1)), ya = R(L.Y(y0)), yb = R(L.Y(y1)), b = Math.max(1, R(1.4 * k));
      rect1(xa, ya, xb, yb, PAL.brass[3]); rect1(xa + 1, ya + 1, xa + 1 + b, yb - 1, PAL.brass[5]); rect1(xa + 1, yb - 1 - b, xb - 1, yb - 1, PAL.brass[2]); }
    // shade: drum with five ribs, lit side on the left, rim line
    poly([[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]].map(T), (x) => {
      const u = (x - L.X(g.x - g.wBot)) / ((g.wBot * 2) * k); return LT[u < 0.22 ? 5 : u < 0.72 ? 4 : 3];
    });
    for (let i = 1; i < 5; i++) { const u = i / 5; line(L.X(g.x - g.wTop + 2 * g.wTop * u), L.Y(g.shadeTop + 1), L.X(g.x - g.wBot + 2 * g.wBot * u), L.Y(g.shadeBot - 1), LT[2]); }
    const edge = [[g.x - g.wTop, g.shadeTop], [g.x + g.wTop, g.shadeTop], [g.x + g.wBot, g.shadeBot], [g.x - g.wBot, g.shadeBot]];
    for (let i = 0; i < 4; i++) line(...T(edge[i]), ...T(edge[(i + 1) % 4]), PAL.linen[0]);
    rect1(L.X(g.x - g.wBot + 1), L.Y(g.shadeBot - 2.2), L.X(g.x + g.wBot - 1), L.Y(g.shadeBot - 0.8), LT[2]);
    // bulb: a small warm disc under the shade, only as light comes on (dissolves in)
    if (light > 0.01) { target(c, light); disc(bx, L.Y(g.shadeBot - 3), Math.max(1, 2.4 * k), rgb("#FFF6D0")); target(c, 1); }
    return { box: { x0: L.X(g.x - 30), y0: L.Y(g.shadeTop - 8), x1: L.X(g.x + 30), y1: L.Y(0) }, pt: [bx, by] };
  },
};
