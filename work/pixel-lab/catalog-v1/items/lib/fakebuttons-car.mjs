// catalog-v1 copy (2026-10-26) of work/pixel-lab/fake-buttons/film/levels/street-sprites.mjs: makeSprite (dark outline and
// warm rim light), the sedan branch of carSprite with the blue palette (PAL.blue), CAR_DIM.sedan and the wheel() painter.
// Changes: sedan only (no brand, no text); no labels and no flip (the sedan faces right); the sprite is painted once and
// cached; each frame it is blitted through c.px as blocks of S grid px per sprite px (S = 2 · z, the film's ×2 look).
// The wheel spokes (spin), the tail-light glow (brake) and a dithered head-light halo (lights) are drawn per frame from
// eased parameters, so nothing appears or vanishes in one frame.
import { Canvas, hex, bayer, mix, toHex } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, P = 2, KEY = "#FF00FF", OUTC = hex("#1A0E1C"), RIMC = hex("#FFC888");
const B = "#2A6AC8", L = "#6AA4F0", DK = "#1A4486";                       // PAL.blue (base, light, dark)
const GLASS = "#2B2645", GLASS_HI = "#9AA8E8", TIRE = "#1E1A26", RIMW = "#CFCBE0", HUB = "#6E6A86", HEAD = "#FFF6C8", TAIL = "#FF3A4A";
const SEDAN = { w: 88, h: 26, wheels: [18, 70], r: 5, ox: 44, oy: 15 };   // CAR_DIM.sedan; anchor = centre of the body
const wheel = (g, x, y, r) => { g.disc(x, y, r + 1, "#120E18"); g.disc(x, y, r, TIRE); g.disc(x, y, Math.max(1, r - 2), RIMW); g.px(x, y, HUB); g.px(x - 1, y - 1, "#FFFFFF"); };

// makeSprite from the film, rim = 1, no flip; hx = the hex colour of each solid sprite pixel (for the blocks)
function makeSprite(w, h, ox, oy, draw) {
  const W = w + 2 * P, H = h + 2 * P, g = new Canvas(W, H, KEY);
  draw(g);
  const key = hex(KEY), N = W * H, m = new Uint8Array(N), d = new Uint8ClampedArray(N * 3);
  for (let i = 0; i < N; i++) if (!(g.d[i * 3] === key[0] && g.d[i * 3 + 1] === key[1] && g.d[i * 3 + 2] === key[2])) m[i] = 1;
  const on = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x] === 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (!m[i]) { if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { m[i] = 2; d.set(OUTC, i * 3); } continue; }
    let c = [g.d[i * 3], g.d[i * 3 + 1], g.d[i * 3 + 2]];
    const up = !on(x, y - 1) ? 1 : !on(x, y - 2) ? 0.35 : 0, left = !on(x - 1, y) ? 0.4 : 0;
    const k = Math.max(up, left); if (k) c = c.map((v, j) => v + (RIMC[j] - v) * 0.4 * k);
    d.set(c, i * 3);
  }
  const hx = new Array(N);
  for (let i = 0; i < N; i++) if (m[i]) hx[i] = toHex([d[i * 3], d[i * 3 + 1], d[i * 3 + 2]]);
  return { w: W, h: H, ox: ox + P, oy: oy + P, m, hx };
}

let SPR = null;
// the sedan body (film code, P offset), wheels included; drawn once
function sprite() {
  if (SPR) return SPR;
  SPR = makeSprite(SEDAN.w, SEDAN.h, R(SEDAN.w / 2), SEDAN.oy, (g) => {
    const T = (pts) => pts.map(([x, y]) => [x + P, y + P]), wy = SEDAN.h - 1 - SEDAN.r + P;
    g.poly(T([[1, 22], [1, 14], [6, 12], [22, 11], [32, 4], [56, 4], [66, 11], [84, 12], [87, 15], [87, 22]]), B);
    g.poly(T([[6, 12], [22, 11], [66, 11], [84, 12], [86, 14], [6, 14]]), L);
    g.poly(T([[30, 11], [35, 5.5], [55, 5.5], [62, 11]]), GLASS); g.rect(P + 44, P + 6, 2, 5, B); g.rect(P + 36, P + 6, 7, 1, GLASS_HI);
    g.rect(P + 1, P + 19, 86, 2, DK); g.rect(P + 44, P + 12, 1, 8, DK); g.rect(P + 50, P + 14, 4, 1, DK);
    g.rect(P + 84, P + 14, 3, 2, HEAD); g.rect(P + 1, P + 14, 2, 2, TAIL);
    for (const x of SEDAN.wheels) { g.disc(P + x, wy, SEDAN.r + 2, "#120E18"); wheel(g, P + x, wy, SEDAN.r); }
  });
  return SPR;
}

// paint one grid cell (gx, gy) of the sprite space as an S × S block at screen origin (ox, oy)
function cell(c, ox, oy, S, gx, gy, col) {
  const x0 = R(ox + gx * S), x1 = R(ox + (gx + 1) * S), y0 = R(oy + gy * S), y1 = R(oy + (gy + 1) * S);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) c.px(x, y, col);
}

/** Draw the sedan with its anchor (centre of the body) at screen (cx, cy); S = grid px per sprite px. */
export function drawCar(c, cx, cy, S, { spin = 0, tail = 0, lamp = 0 } = {}) {
  const sp = sprite(), W = sp.w, H = sp.h, ox = cx - sp.ox * S, oy = cy - sp.oy * S;
  for (let v = 0; v < H; v++) for (let u = 0; u < W; u++) { const i = v * W + u; if (sp.m[i]) cell(c, ox, oy, S, u, v, sp.hx[i]); }
  // brake lights: the two tail cells brighten toward a pale red
  if (tail > 0) { const tc = toHex(mix(TAIL, "#FFC4C4", 0.8 * tail)); for (const [u, v] of [[3, 16], [4, 16], [3, 17], [4, 17]]) cell(c, ox, oy, S, u, v, tc); }
  // head-light halo: dithered outside the body only (the glow grows with lamp)
  if (lamp > 0) for (let gy = 9; gy < 25; gy++) for (let gx = 80; gx < W + 6; gx++) {
    const d = Math.hypot(gx + 0.5 - 87.5, gy + 0.5 - 17) / 7; if (d >= 1) continue;
    const i = gy >= 0 && gy < H && gx < W ? gy * W + gx : -1; if (i >= 0 && sp.m[i]) continue;
    if (lamp * (1 - d * d) * 1.4 > bayer(gx, gy)) cell(c, ox, oy, S, gx, gy, HEAD);
  }
  // spokes: two lines through each hub, turning with the integrated spin angle
  for (const wx of SEDAN.wheels) {
    const hx = P + wx, hy = SEDAN.h - 1 - SEDAN.r + P;
    for (const a of [spin, spin + Math.PI / 2]) for (const k of [-3, -2, -1, 1, 2, 3]) {
      const gx = R(hx + k * Math.cos(a)), gy = R(hy + k * Math.sin(a));
      cell(c, ox, oy, S, gx, gy, HUB);
    }
  }
  return { ox, oy };
}
export { SEDAN };
