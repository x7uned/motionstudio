// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals/film/levels/yard.mjs: toyPile (the heap of dog toys), duck (the
// rubber duck of the heap summit), ball() and the RED/BLUE/TENNIS/DUCKY/WOOL ramps. Changes: imports point at the catalog
// copies (cute.mjs, animals-yard.mjs Layer); the film's grass-line tint at the end of toyPile is dropped (it read the
// level's ground); duck is exported and drawn through any canvas view.
import { blob, ell, fade } from "./cute.mjs";
import { mix, bayer } from "../../../../../renderer/pixel/raster.mjs";
import { Layer } from "./animals-yard.mjs";
const R = Math.round;
export const RED = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
function ball(g, x, y, r, ramp, stripe = null) {
  for (let Y = R(y - r - 1); Y <= R(y + r + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const dx = X - x, dy = Y - y, d = Math.hypot(dx, dy); if (d > r + 0.5) continue;
    if (d > r - 0.7) { g.px(X, Y, ramp[0]); continue; }
    const l = (-dx * 0.6 - dy * 0.8) / r, v = 3.6 + l * 2.2 - (d / r) * 0.8, s = Math.max(1, Math.min(ramp.length - 1, Math.floor(v + (bayer(X, Y) - 0.5) * 0.6)));
    let col = ramp[s]; if (stripe && Math.abs(dy + dx * 0.35) < r * 0.18) col = stripe[Math.min(stripe.length - 1, s)]; g.px(X, Y, col);
  }
  g.px(R(x - r * 0.4), R(y - r * 0.45), "#FFFFFF"); if (r > 8) { g.px(R(x - r * 0.4) + 1, R(y - r * 0.45), "#FFFFFF"); g.px(R(x - r * 0.4), R(y - r * 0.45) + 1, "#FFFFFF"); }
}
const BLUE = ["#14204A", "#1E3478", "#2A4CAA", "#3A66D0", "#5A86E8", "#86AAF4", "#B4CCFA", "#E0EAFF"];
const TENNIS = ["#2A3A08", "#4A6A10", "#7A9E18", "#A6C826", "#C8E440", "#E0F270", "#F0FAA8", "#FAFFDC"];
const DUCKY = ["#3A2604", "#7A5208", "#C08A0C", "#E8B414", "#F8D028", "#FCE460", "#FEF29C", "#FFFCD8"];
const WOOL = ["#3A3A4A", "#7A7A8E", "#B4B4C6", "#DADAE6", "#ECECF4", "#F8F8FC", "#FFFFFF", "#FFFFFF"];
export function toyPile(g) {
  // a heap of toys left of the dog, drawn back (top) to front (bottom); the duck on the summit is drawn live
  const PINK = ["#3A0E1E", "#6A1A34", "#9C2A4C", "#C84468", "#E26A88", "#F094AA", "#F8BCCB", "#FFE2EA"], ORANGE = ["#3A1604", "#7A3208", "#B8520E", "#E0741A", "#F49A32", "#FABA5E", "#FDD898", "#FFF0D4"];
  const GREEN = ["#0E2A14", "#1A4A22", "#2A6E32", "#3A9444", "#56B45A", "#7ED07A", "#AEE6A6", "#DEF8D8"], PURP = ["#1E1036", "#36205E", "#52348A", "#6E4FB0", "#8D6AD0", "#AE90E6", "#CEB8F4", "#ECE2FC"];
  // top layer
  ball(g, 1832, -106, 10, ORANGE);
  for (let Y = -10; Y <= 10; Y++) for (let X = -12; X <= 12; X++) { const d = (X / 12) ** 2 + (Y / 10) ** 2, h = (X / 5) ** 2 + (Y / 4) ** 2; if (d <= 1 && h > 1) g.px(1786 + X, -104 + Y, d > 0.8 || h < 1.5 ? "#1A4A22" : Y < -2 ? "#7ED07A" : "#3A9444"); }
  // upper middle: star plush, squeaky carrot, lamb, tennis ball
  const star = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 6 : 14; star.push([1806 + Math.cos(an) * r, -84 + Math.sin(an) * r]); }
  blob(g, [star], { ramp: PURP, thick: 5, base: 3.6, outline: "#1E1036" }); g.px(1803, -86, "#140C20"); g.px(1809, -86, "#140C20"); g.px(1806, -82, "#F094AA");
  blob(g, [[[1758, -96], [1786, -72], [1780, -66], [1752, -88]]], { ramp: ORANGE, thick: 4, base: 3.8, outline: "#3A1604" });
  for (const [dx, dy] of [[-4, -4], [0, -6], [-6, 0]]) g.line(1755, -92, 1755 + dx, -92 + dy - 2, "#3A9444");
  const lx = 1846, ly = -78;
  for (let i = 0; i < 9; i++) { const an = (i / 9) * 6.283; ball(g, lx + Math.cos(an) * 10, ly + Math.sin(an) * 7, 7, WOOL); }
  ball(g, lx, ly, 10, WOOL); ball(g, lx + 13, ly - 8, 7, ["#140E14", "#2A2028", "#3A2E36", "#4A3E46", "#5E5058", "#74666E", "#8E8088", "#A89AA2"]);
  g.px(lx + 11, ly - 9, "#FFFFFF"); g.px(lx + 15, ly - 9, "#FFFFFF"); g.px(lx + 13, ly - 5, "#F4A0B0"); g.rect(lx + 6, ly - 13, 4, 3, "#3A2E36"); g.rect(lx + 18, ly - 13, 3, 3, "#3A2E36");
  ball(g, 1772, -70, 8, TENNIS);
  // middle: frisbee on edge, rope toy, pink ball, yellow ball
  for (let Y = -8; Y <= 8; Y++) for (let X = -20; X <= 20; X++) { const d = (X / 20) ** 2 + (Y / 8) ** 2; if (d <= 1) g.px(1744 + X, -56 + Y + R(X * 0.3), d > 0.82 ? "#7A2A06" : d < 0.3 ? "#FFB060" : Y < 0 ? "#FF9A3A" : "#E07A1C"); }
  g.ering(1744, -56, 12, 4, "#C86A14");
  for (let i = 0; i <= 40; i++) { const k = i / 40, x = 1784 + k * 46, y = -44 - k * 20 + Math.sin(k * 6) * 3, w = 4; for (let j = -w; j <= w; j++) { const col = Math.abs(j) === w ? "#3A1A14" : ((i + j * 2) >> 2) % 2 ? "#F4F0E8" : "#E0443A"; g.px(R(x + j * 0.4), R(y + j * 0.9), col); } }
  for (const [x, y] of [[1784, -44], [1830, -64]]) ball(g, x, y, 6, ["#3A1A14", "#8A1E1A", "#C8342C", "#E0544A", "#F08070", "#F8B0A0", "#FFE0D8", "#FFFFFF"]);
  ball(g, 1862, -48, 11, PINK); ball(g, 1808, -56, 9, DUCKY);
  // bottom: blue ball, bone, striped red ball, green ball
  ball(g, 1748, -34, 15, BLUE);
  const bx = 1806, by = -24; g.rect(bx - 15, by - 3, 30, 7, "#5A5060"); g.rect(bx - 14, by - 2, 28, 5, "#F6F0E4"); g.rect(bx - 14, by - 2, 28, 1, "#FFFFFF");
  for (const s of [-1, 1]) for (const dy of [-3, 3]) ball(g, bx + s * 16, by + dy, 4.5, ["#5A5060", "#A89C8C", "#D8CCB8", "#EAE0D0", "#F6F0E4", "#FFFFFF", "#FFFFFF", "#FFFFFF"]);
  ball(g, 1842, -30, 12, RED, ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"]);
  ball(g, 1724, -26, 8, GREEN);
}

export function duck(c, x, y, a = 1, dir = -1) {
  if (a <= 0) return; const g = fade(c, a);
  const P = (dx, dy) => [x + dx * -dir, y + dy];
  blob(g, [ell(...P(2, 3), 13, 9), ell(...P(-6, -8), 8.5, 8)], { ramp: DUCKY, thick: 6, base: 3.8, a, litOutline: "#7A5208" });
  blob(g, [ell(...P(4, 1), 6, 4, 0.3 * -dir)], { ramp: DUCKY, thick: 3, base: 3.2, a, outline: "#C08A0C" });                       // wing
  const [bx, by] = P(-14, -6); g.poly([[bx, by - 2], [bx - 7 * -dir, by], [bx, by + 3]], "#F07A1C"); g.px(R(bx - 2 * -dir), R(by), "#C85A10");
  const [ex, ey] = P(-8, -10); g.rect(R(ex) - 1, R(ey) - 1, 3, 3, "#140C10"); g.px(R(ex) - 1, R(ey) - 1, "#FFFFFF");
  const [tx, ty] = P(14, -2); g.poly([[tx, ty], [tx + 5 * -dir, ty - 5], [tx + 1 * -dir, ty + 4]], DUCKY[4]);
}

// world box of the baked layers
export const PILE_BOX = [1700, -150, 1890, -12];
let LP = null, LD = null;
/** Baked heap (without the duck) and baked duck, both as world-coordinate Layers. */
export function toyLayers() {
  if (!LP) {
    LP = new Layer(...PILE_BOX); toyPile(LP.g);
    LD = new Layer(1780, -150, 1842, -100); duck(LD.g, 1810, -124, 1, -1);
  }
  return { LP, LD };
}
