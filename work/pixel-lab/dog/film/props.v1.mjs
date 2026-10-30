// Props and close-ups for the dog film: macro fur with clinging droplets, the single-droplet detach scene,
// the wooden chart sign on the bank, the washing machine, and small HUD helpers.
import { MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth, drawPart, FUR } from "../shade.mjs";

export const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", YL: "#FAE375", GR: "#65DA41", MU: "#959595", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", p2: "#2A1F40", p3: "#3B2C5C", p4: "#523D82", p5: "#6E4FB0", p7: "#B08AE8" };
const { O, CARD, IV, Y, YL, GR, MU, L, P, p2, p3, p5, p7 } = C;
const TOP = 190, BOT = 680, R = Math.round;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const WATER = ["#1E2A5A", "#33458A", "#5470B8", "#7E98DA", "#A9C4FF", "#D8E4FF"];

// ---------------------------------------------------------------- HUD helpers
export function panel(c, x, y, w, h, a = 1, edge = p7) {
  if (a <= 0) return; const g = fade(c, a);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(CARD, "#1D1430", (j - y) / h));
}
export function dtext(c, str, x, y, col, a = 1, scale = 1) { if (a > 0) fade(c, a).text(MAIN, str, R(x), R(y), col, { scale }); }
export const tw = (c, str, scale = 1) => c.measure(MAIN, str, { scale });

/** A water droplet sphere with rim, refraction and highlights. */
export function droplet(g, x, y, r, stretch = 1, ang = 0) {
  const rx = r * stretch, ry = r / Math.sqrt(stretch), ca = Math.cos(ang), sa = Math.sin(ang);
  const x0 = R(x - rx - 2), x1 = R(x + rx + 2), y0 = R(y - rx - 2), y1 = R(y + rx + 2);
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const dx = px - x, dy = py - y, u = (dx * ca + dy * sa) / rx, v = (-dx * sa + dy * ca) / ry, d = u * u + v * v; if (d > 1) continue;
    const edge = d > 0.82, k = Math.min(5, Math.max(0, Math.round(1 + 2.2 * (v * 0.5 + 0.5) + 1.2 * (1 - d) + (bayer(px, py) - 0.5) * 0.8)));
    g.px(px, py, edge ? (dy < 0 ? WATER[2] : WATER[0]) : WATER[k]);
  }
  g.disc(R(x - rx * 0.35), R(y - ry * 0.4), Math.max(1, R(r * 0.22)), IV); g.px(R(x + rx * 0.35), R(y + ry * 0.45), WATER[5]);
}

// ---------------------------------------------------------------- macro fur (full stage)
const STRANDS = Array.from({ length: 26 }, (_, i) => ({ x: -40 + i * 25 + rnd(i) * 16, len: 300 + rnd(i * 3) * 260, w: 14 + rnd(i * 5) * 10, bend: (rnd(i * 7) - 0.5) * 140, lean: -110 - rnd(i * 9) * 110, dark: i % 3 === 0 }));
const DROPS = Array.from({ length: 14 }, (_, i) => ({ s: (i * 7 + 3) % 26, u: 0.3 + rnd(i * 11) * 0.5, r: 10 + rnd(i * 13) * 14, slide: rnd(i * 17) * 0.06 }));
function strandPt(st, u, t) { const sway = Math.sin(t * 1.3 + st.x * 0.05) * 6 * u; return [st.x + st.lean * u + st.bend * u * u + sway, BOT + 40 - st.len * u]; }
export function drawMacroFur(c, t) {
  for (let y = TOP - 2; y < BOT + 3; y++) for (let x = 0; x < 540; x++) c.px(x, y, (y - TOP) / (BOT - TOP) * 0.9 + (bayer(x, y) - 0.5) * 0.3 > 0.5 ? FUR[1] : FUR[0]);
  for (let i = 0; i < 16; i++) { const x = rnd(i * 3) * 540, y = TOP + rnd(i * 5) * 490, r = 16 + rnd(i) * 30; c.tint(R(x - r), R(y - r), R(r * 2), R(r * 2), (px, py) => (Math.hypot(px - x, py - y) < r ? 0.25 : 0), i % 2 ? "#F6C860" : "#C98F3E", 2); }
  for (const pass of [0, 1]) for (const st of STRANDS) {
    if (st.dark !== (pass === 0)) continue;
    const L1 = [], R1 = [];
    for (let k = 0; k <= 10; k++) { const u = k / 10, [x, y] = strandPt(st, u, t), [x2, y2] = strandPt(st, Math.min(1, u + 0.02), t), nx = -(y2 - y), ny = x2 - x, nn = Math.hypot(nx, ny) || 1, w = st.w * (1 - u * 0.7) / 2; L1.push([x + nx / nn * w, y + ny / nn * w]); R1.unshift([x - nx / nn * w, y - ny / nn * w]); }
    drawPart(c, [smooth([...L1, ...R1], new Set([10, 11]))], { base: st.dark ? 2.4 : 3.6, gain: 2.2, thick: st.w * 0.6, light: [0.8, -0.6], litOutline: st.dark ? null : "#FAE375", outline: FUR[0] });
  }
  for (const d of DROPS) { const st = STRANDS[d.s], u = Math.min(0.95, d.u + d.slide * t * 0.15), [x, y] = strandPt(st, u, t); droplet(c, x + st.w * 0.3, y + d.r * 0.6, d.r); }
  c.tint(0, TOP, 540, BOT - TOP, (x, y) => Math.max(0, Math.hypot((x - 270) / 300, (y - 435) / 280) - 0.7) * 0.9, "#0B0812", 5);
}

// ---------------------------------------------------------------- single droplet: stretch, detach, fly (full stage)
export function drawDropletScene(c, t, ev) {
  for (let y = TOP - 2; y < BOT + 3; y++) for (let x = 0; x < 540; x++) c.px(x, y, (x + y * 0.5) / 800 + (bayer(x, y) - 0.5) * 0.3 > 0.5 ? FUR[1] : FUR[0]);
  for (let i = 0; i < 12; i++) { const x = rnd(i * 7) * 540, y = TOP + rnd(i * 9) * 490, r = 20 + rnd(i) * 30; c.tint(R(x - r), R(y - r), R(r * 2), R(r * 2), (px, py) => (Math.hypot(px - x, py - y) < r ? 0.22 : 0), "#F6C860", 2); }
  // one thick hair from the bottom-left, its tip at the centre-left
  const tip = [236, 470], base = [70, 760], L1 = [], R1 = [];
  for (let k = 0; k <= 12; k++) { const u = k / 12, x = base[0] + (tip[0] - base[0]) * u + Math.sin(u * 3) * 20, y = base[1] + (tip[1] - base[1]) * u, w = 64 * (1 - u * 0.6); L1.push([x - w / 2, y - w / 3]); R1.unshift([x + w / 2, y + w / 3]); }
  drawPart(c, [smooth([...L1, ...R1], new Set([12, 13]))], { base: 3.6, gain: 2.4, thick: 26, light: [0.8, -0.6], litOutline: "#FAE375", outline: FUR[0] });
  for (let k = 0; k < 9; k++) { const u0 = 0.05 + k * 0.1, x0 = base[0] + (tip[0] - base[0]) * u0 + (k % 3 - 1) * 8, y0 = base[1] + (tip[1] - base[1]) * u0; c.line(R(x0), R(y0), R(x0 + 30), R(y0 - 36), FUR[k % 2 ? 5 : 2]); }
  // the spin pulls the droplet outward; it stretches, then lets go
  const pull = Math.max(0, Math.min(1, (t - ev.force) / (ev.detach - ev.force + 0.6))), flown = Math.max(0, t - ev.detach - 0.35);
  const dir = [0.92, -0.38], stretch = 1 + pull * 0.9;
  const cx = tip[0] + 40 + pull * 26 + flown * 260 * dir[0], cy = tip[1] - 8 + flown * 260 * dir[1] + flown * flown * 60;
  if (flown === 0) { c.line(tip[0] + 10, tip[1] - 4, R(cx - 20), R(cy + 4), WATER[3]); c.line(tip[0] + 10, tip[1] - 2, R(cx - 20), R(cy + 6), WATER[2]); }
  else for (let k = 1; k <= 5; k++) fade(c, 0.5 - k * 0.08).disc(R(cx - dir[0] * k * 14), R(cy - dir[1] * k * 14 - k * 2), Math.max(2, 18 - k * 3), WATER[3]);
  droplet(c, cx, cy, 44, flown > 0 ? 1.15 : stretch, Math.atan2(dir[1], dir[0]));
  // force arrow
  const fa = Math.max(0, Math.min(1, (t - ev.force) / 0.8));
  if (fa > 0 && flown < 0.6) { const len = 40 + 90 * pull, ax = cx + 40 * dir[0], ay = cy + 40 * dir[1], bx = ax + len * dir[0], by = ay + len * dir[1], g = fade(c, fa);
    for (let w = -2; w <= 2; w++) g.line(R(ax), R(ay + w), R(bx), R(by + w), Y); g.poly([[bx + 14 * dir[0], by + 14 * dir[1]], [bx - 8 * dir[1], by + 8 * dir[0]], [bx + 8 * dir[1], by - 8 * dir[0]]], Y);
    dtext(c, "SPIN PULL", bx - 30, by - 30, Y, fa, 2); }
  // G meter on the right
  const ga = Math.max(0, Math.min(1, (t - ev.gmeter[0] + 0.6) / 0.4)), gk = Math.max(0, Math.min(1, (t - ev.gmeter[0]) / (ev.gmeter[1] - ev.gmeter[0])));
  if (ga > 0) { const x = 44, y = 230, h = 300; panel(c, x - 10, y - 18, 86, h + 60, ga, Y);
    for (let i = 0; i < 14; i++) { const on = i / 14 < 0.14 + gk * 0.86, yy = y + h - (i + 1) * (h / 14); fade(c, ga).rect(x, R(yy + 3), 40, R(h / 14) - 5, on ? (i > 9 ? "#F28A4A" : i > 5 ? YL : Y) : p3); }
    dtext(c, "70G", x + 2, y - 10, gk > 0.95 ? YL : MU, ga, 1); dtext(c, "10G", x + 46, y + h - 22, IV, ga, 1); dtext(c, `${R(10 + 60 * gk)}G`, x - 2, y + h + 14, Y, ga, 2); }
}

// ---------------------------------------------------------------- wooden chart sign on the bank (world space)
const DOTS = Array.from({ length: 33 }, (_, i) => { const m = -1.7 + (i / 32) * 4.1 + (rnd(i * 3) - 0.5) * 0.35; const f = Math.log10(4.5) - 0.22 * (m - Math.log10(30)) + (rnd(i * 5) - 0.5) * 0.12; return [m, f]; });
export function drawSign(c, G, wx, t, ev) {
  const X = (u) => G.X(wx + u), Yv = (v) => G.Y(-v), z = G.z;
  for (const u of [-70, 70]) drawPart(c, [[[X(u - 5), Yv(0)], [X(u + 5), Yv(0)], [X(u + 5), Yv(150)], [X(u - 5), Yv(150)]]], { ramp: FUR, base: 2.2, gain: 0.8, thick: 4 * z, outline: FUR[0], light: [0.8, -0.6], litOutline: "#FAE375" });
  drawPart(c, [[[X(-95), Yv(60)], [X(95), Yv(60)], [X(95), Yv(180)], [X(-95), Yv(180)]]], { ramp: FUR, base: 2.8, gain: 1.2, thick: 10 * z, outline: FUR[0], light: [0.8, -0.6], litOutline: "#FAE375" });
  for (let k = 0; k < 6; k++) c.line(R(X(-92)), R(Yv(70 + k * 20)), R(X(92)), R(Yv(70 + k * 20)), FUR[2]);
  // chart area
  const cx0 = X(-82), cx1 = X(82), cy0 = Yv(68), cy1 = Yv(172);
  c.rect(R(cx0), R(cy1), R(cx1 - cx0), R(cy0 - cy1), "#1A1430");
  c.line(R(cx0 + 10 * z), R(cy0 - 8 * z), R(cx1 - 6 * z), R(cy0 - 8 * z), MU); c.line(R(cx0 + 10 * z), R(cy0 - 8 * z), R(cx0 + 10 * z), R(cy1 + 6 * z), MU);
  if (z > 1) { dtext(c, "SIZE >", cx1 - tw(c, "SIZE >") - 4, cy0 - 7 * z + 1, MU); dtext(c, "SHAKES", cx0 + 14 * z, cy1 + 4, MU); }
  const px = (m) => cx0 + 14 * z + ((m + 1.9) / 4.6) * (cx1 - cx0 - 24 * z), py = (f) => cy0 - 12 * z - ((f - 0.4) / 1.3) * (cy0 - cy1 - 22 * z);
  const n = Math.round(33 * Math.max(0, Math.min(1, (t - ev.dots[0]) / (ev.dots[1] - ev.dots[0]))));
  for (let i = 0; i < n; i++) { const [m, f] = DOTS[i]; const x = R(px(m)), y = R(py(f)), r = Math.max(1, R(1.6 * z)); c.disc(x, y, r + 1, O); c.disc(x, y, r, i % 5 === 0 ? YL : L); }
  const tk = Math.max(0, Math.min(1, (t - ev.trend[0]) / (ev.trend[1] - ev.trend[0])));
  if (tk > 0) { const m0 = -1.8, m1 = -1.8 + 4.4 * tk, f = (m) => Math.log10(4.5) - 0.22 * (m - Math.log10(30)); for (let w = 0; w < 2; w++) c.line(R(px(m0)), R(py(f(m0))) + w, R(px(m1)), R(py(f(m1))) + w, Y); }
  // banner under the board
  const ba = Math.max(0, Math.min(1, (t - ev.rule) / 0.35));
  if (ba > 0) { const str = "SMALLER = FASTER", w = tw(c, str, 2) + 20, x = G.X(wx) - w / 2, y = Yv(52); panel(c, R(x), R(y), R(w), 26, ba, Y); dtext(c, str, x + 10, y + 6, Y, ba, 2); }
}

// ---------------------------------------------------------------- washing machine (screen space)
export function drawWasher(c, x, y, s, t, a) {
  if (a <= 0) return; const g = fade(c, a), Wd = 84 * s, Hd = 100 * s;
  drawPart(g, [[[x, y], [x + Wd, y], [x + Wd, y + Hd], [x, y + Hd]]], { ramp: ["#4A4466", "#7A7498", "#A49EC0", "#CBC6DE", "#E7E3F2", "#F6F4FB"], base: 3.4, gain: 1.4, thick: 12 * s, outline: O, light: [-0.6, -0.8] });
  g.rect(R(x + 4 * s), R(y + 6 * s), R(Wd - 8 * s), R(14 * s), "#B8B2D0"); g.rect(R(x + 8 * s), R(y + 10 * s), R(26 * s), R(6 * s), "#13261A");
  g.rect(R(x + 10 * s), R(y + 12 * s), R(10 * s), R(2 * s), GR); g.disc(R(x + Wd - 16 * s), R(y + 13 * s), R(4 * s), p5);
  const dx = x + Wd / 2, dy = y + 60 * s, rr = 30 * s;
  g.disc(R(dx), R(dy), R(rr + 4 * s), "#5E587A"); g.disc(R(dx), R(dy), R(rr), "#1E2A5A"); g.disc(R(dx), R(dy), R(rr - 3 * s), "#33458A");
  const spin = t * 9;
  for (let k = 0; k < 5; k++) { const ang = spin + k * 1.26, r2 = rr * 0.55, cx = dx + Math.cos(ang) * r2, cy = dy + Math.sin(ang) * r2; g.disc(R(cx), R(cy), R(7 * s), [Y, P, GR, IV, "#F28A4A"][k]); }
  for (let k = 0; k < 14; k++) { const ang = spin * 1.3 + k * 0.45; g.px(R(dx + Math.cos(ang) * (rr - 6 * s)), R(dy + Math.sin(ang) * (rr - 6 * s)), WATER[4]); }
  g.ering(R(dx), R(dy), R(rr - 1), R(rr - 1), "#D8E4FF", Math.PI * 1.1, Math.PI * 1.5);
}
