// Macro inserts of «How your text crosses the ocean» (screen space, the whole stage):
// A — the cable on the sand next to a garden hose (same width); B — the cable cut open (layers);
// C — one glass fibre next to a human hair, light pulses running through the fibre.
import { MAIN, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { EV } from "./timeline.mjs";
import { GW, GH, TOP, O, CARD, IV, Y, YL, L, MU, p5, p7, smooth, win, rnd, dmix, pattern, Glow } from "./world.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const glow = new Glow();
export function panel(c, x, y, w, h, a = 1, edge = p7) {
  if (a <= 0) return; const g = fade(c, a);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(CARD, "#1D1430", (j - y) / h));
}
export function dtext(c, str, x, y, col, a = 1, scale = 1) { if (a > 0) fade(c, a).text(MAIN, str, R(x), R(y), col, { scale }); }
export const tw = (c, str, scale = 1) => c.measure(MAIN, str, { scale });
function tag(c, x, y, str, a, col = IV, edge = p7) { const w = tw(c, str, 2) + 20; panel(c, x, y, w, 26, a, edge); dtext(c, str, x + 10, y + 7, col, a, 2); return w; }

// sea floor seen close, lit by the camera's lamp
function floor(c, t, horizon) {
  for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) {
    let col;
    if (y < horizon) col = dmix("#16224C", "#0C1330", (y - TOP) / (horizon - TOP), x, y);
    else { const v = (y - horizon) / (GH - horizon), rip = Math.sin(x * 0.045 + Math.sin(y * 0.03) * 2 + y * 0.012) > 0.6 ? 0.12 : 0;
      col = dmix("#4A4060", "#7C6E8E", clamp01(0.25 + v * 0.6 + rip), x, y);
      if (rnd(Math.floor(x / 2) * 977 + Math.floor(y / 2) * 131) < 0.04) col = mix(col, "#A89CB8", 0.4); }
    c.px(x, y, col);
  }
  for (let i = 0; i < 60; i++) { const x = R((rnd(i * 3) * GW + t * 6 * (rnd(i) - 0.5)) % GW), y = R(TOP + ((rnd(i * 7) * (horizon - TOP) + t * 9 * (0.3 + rnd(i * 5))) % (horizon - TOP))); c.px(x, y, "#9AA8D8"); }
  c.tint(0, TOP, GW, GH - TOP, (x, y) => 0.42 - Math.hypot(x - 270, (y - 520) * 1.25) / 520, "#E8E0C0", 4);      // the lamp
  c.tint(0, TOP, GW, GH - TOP, (x, y) => Math.max(0, Math.hypot(x - 270, (y - 560) * 1.1) / 420 - 0.55), "#05070F", 4);  // vignette
}
// a thick tube along a path, shaded across its width
function tube(c, path, w, cols, a = 1) {
  const g = fade(c, a), [shadow, dark, body, hi, rim] = cols;
  for (let i = 0; i + 1 < path.length; i++) {
    const [x0, y0] = path[i], [x1, y1] = path[i + 1], n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), nx = -(y1 - y0) / (n || 1), ny = (x1 - x0) / (n || 1);
    for (let k = 0; k <= n; k++) { const x = lerp(x0, x1, k / n), y = lerp(y0, y1, k / n);
      for (let j = -w / 2; j <= w / 2; j += 0.5) { const u = (j + w / 2) / w, col = u < 0.08 ? rim : u < 0.3 ? hi : u < 0.75 ? body : dark; g.px(R(x + nx * j), R(y + ny * j), col); }
      g.px(R(x + nx * (w / 2 + 2)), R(y + ny * (w / 2 + 2)), shadow); g.px(R(x + nx * (w / 2 + 3)), R(y + ny * (w / 2 + 3)), shadow); }
  }
}
const CRAB = ["X.......X", "XX.....XX", ".XXXXXXX.", "XXOXXXOXX", ".XXXXXXX.", "X.X...X.X"];

export function drawMacro(c, t) {
  // A: cable and garden hose on the sand
  const aA = 1 - smooth(t, EV.inside - 0.2, EV.inside + 0.25), aB = win(t, EV.inside - 0.2, EV.threads - 0.15, 0.4, 0.4), aC = smooth(t, EV.threads - 0.25, EV.threads + 0.2);
  if (aA > 0) {
    floor(c, t, 330);
    const cab = [], hose = []; for (let x = -30; x <= GW + 30; x += 6) { cab.push([x, 440 + 14 * Math.sin(x / 110)]); hose.push([x, 560 + 20 * Math.sin(x / 80 + 1.2) + (x > 420 ? (x - 420) * 0.4 : 0)]); }
    tube(c, cab, 30, ["#2A2236", "#121018", "#1E1C28", "#3A3650", "#8A84A8"], aA);
    tube(c, hose.filter((p) => p[0] < 470), 30, ["#2A2236", "#1E6A2A", "#3FAE4A", "#7FE07A", "#C8F8B0"], aA);
    { const g = fade(c, aA); g.rect(468, 552 + 26, 16, 34, "#B88A2A"); g.rect(468, 552 + 26, 16, 6, "#F6DE84"); g.rect(484, 558 + 26, 10, 22, "#8A6A1A"); }
    pattern(fade(c, aA), 410 + Math.sin(t * 3) * 6, 860, 3, CRAB, { X: "#E07A5F", O: "#1A1020" });
    const la = aA * smooth(t, EV.garden - 0.1, EV.garden + 0.25), lb = aA * smooth(t, EV.hose - 0.05, EV.hose + 0.3);
    tag(c, 26, 372, "SUBSEA CABLE", la); tag(c, 26, 494, "GARDEN HOSE", lb, "#9BF07A", "#3FAE4A");
    if (lb > 0) { const g = fade(c, lb); for (const y of [425, 455, 545, 575]) for (let x = 380; x < 400; x += 3) g.rect(x, y, 2, 1, IV); dtext(c, "=", 382, 496, Y, lb, 3); dtext(c, "SAME WIDTH", 300, 610, Y, lb, 2); }
  }
  // B: the cable cut open — plastic, steel wires, copper (power), glass fibres in the middle
  if (aB > 0) {
    const g = fade(c, aB), k = smooth(t, EV.threads - 0.3, EV.threads + 0.15), sc = lerp(1, 7, k * k), cx = 270, cy = 410;
    const disc = (r, col) => { const rr = r * sc; if (rr < 0.5) return; const x0 = Math.max(0, R(cx - rr)), x1 = Math.min(GW - 1, R(cx + rr)), y0 = Math.max(TOP, R(cy - rr)), y1 = Math.min(GH - 1, R(cy + rr)); for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if ((x - cx) ** 2 + (y - cy) ** 2 <= rr * rr) g.px(x, y, typeof col === "function" ? col(x, y) : col); };
    for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) g.px(x, y, dmix("#141C40", "#080C1E", Math.hypot(x - 270, y - 420) / 500, x, y));
    disc(150, (x, y) => ((x - cx) * -0.6 + (y - cy) * -0.8) / (150 * sc) > 0.85 ? "#4A4660" : "#1C1A24");
    disc(138, "#B8B4C8"); disc(134, "#3A3446");
    for (let i = 0; i < 22; i++) { const a = (i / 22) * Math.PI * 2, wx = cx + Math.cos(a) * 120 * sc, wy = cy + Math.sin(a) * 120 * sc, r = 12.5 * sc; if (wx < -r || wx > GW + r || wy < TOP - r || wy > GH + r) continue; g.disc(R(wx), R(wy), Math.max(1, R(r)), "#8A8AA0"); g.disc(R(wx - r * 0.3), R(wy - r * 0.3), Math.max(1, R(r * 0.4)), "#D0D0E0"); }
    disc(106, "#C8C8D8"); disc(100, "#3A3450"); disc(92, (x, y) => ((x - cx) * -0.6 + (y - cy) * -0.8) / (92 * sc) > 0.6 ? "#F0A060" : "#D07A3A"); disc(80, (x, y) => (bayer(x, y) < 0.5 ? "#E8D88A" : "#D8C470"));
    disc(30, "#2A2436");
    ["#4A7AF0", "#F0A040", "#5FD068", "#9A6A4A", "#A8A8B8", "#FDFEED", "#E05050", "#3A3A4A"].forEach((col, i) => { const a = (i / 8) * Math.PI * 2, fx = cx + Math.cos(a) * 15 * sc, fy = cy + Math.sin(a) * 15 * sc; g.disc(R(fx), R(fy), Math.max(1, R(4.5 * sc)), col); g.px(R(fx - 1 * sc), R(fy - 1 * sc), IV); });
    const la = aB * (1 - smooth(t, EV.threads - 0.3, EV.threads - 0.1));
    const labels = [["PLASTIC", 26, 236, 150, -0.75], ["STEEL WIRES", 26, 290, 120, -0.95], ["COPPER: POWER", 340, 236, 92, -0.3], ["GLASS FIBERS", 340, 560, 15, 0.9]];
    labels.forEach(([s, x, y, r, a], i) => { const ai = la * smooth(t, EV.inside + 0.05 + i * 0.16, EV.inside + 0.25 + i * 0.16); if (ai <= 0) return; const w = tag(c, x, y, s, ai), px = cx + Math.cos(a * Math.PI) * r, py = cy + Math.sin(a * Math.PI) * r, ex = x < 270 ? x + w : x, ey = y + 13; fade(c, ai).line(R(ex), R(ey), R(px), R(py), L); fade(c, ai).disc(R(px), R(py), 2, IV); });
  }
  // C: one fibre next to a hair; flashes of light carry the words
  if (aC > 0) {
    const g = fade(c, aC);
    for (let y = TOP; y < GH; y++) for (let x = 0; x < GW; x++) g.px(x, y, dmix("#18142C", "#090814", Math.hypot(x - 270, y - 440) / 480, x, y));
    for (let i = 0; i < 24; i++) { const x = R(rnd(i * 3) * GW), y = R(TOP + rnd(i * 5) * (GH - TOP)), r = 2 + R(rnd(i * 7) * 3); g.disc(x, y, r, mix("#18142C", "#3A3260", 0.5)); }
    const FY = 360, HY = 520, th = 14;
    for (let x = 0; x < GW; x++) { for (let j = 0; j < th; j++) { const u = j / th, col = u < 0.12 ? "#E8F0FF" : u < 0.35 ? "#9DB5FF" : u < 0.8 ? "#5A6EA8" : "#3A4A80"; g.px(x, FY + j, col); } }
    for (let x = 0; x < GW; x++) { const yy = HY + R(8 * Math.sin(x / 60) + 3 * Math.sin(x / 17)); for (let j = 0; j < th; j++) { const u = j / th, col = u < 0.12 ? "#3A2014" : u < 0.35 ? "#B07A4A" : u < 0.85 ? "#7A4A2A" : "#3A2014"; g.px(x, yy + j, col); } if (x % 23 === 0) g.px(x, yy + 4, "#C89060"); }
    tag(c, 26, FY - 44, "GLASS FIBER", aC * smooth(t, EV.threads + 0.1, EV.threads + 0.4));
    tag(c, 26, HY - 44, "HUMAN HAIR", aC * smooth(t, EV.hair - 0.05, EV.hair + 0.25), "#F0C090", "#B07A4A");
    // light pulses: on/off pattern = bits, running toward New York (left)
    const fl = aC * smooth(t, EV.flashes - 0.1, EV.flashes + 0.1);
    if (fl > 0) { const BITS = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0], cell = 30, off = (t - EV.flashes) * 520;
      for (let i = -2; i < 22; i++) { const x0 = GW - ((i * cell + off) % (cell * 20)) , bit = BITS[((i % 20) + 20) % 20]; if (!bit || x0 < -cell || x0 > GW) continue;
        for (let x = R(x0); x < R(x0 + cell - 8); x++) for (let j = 2; j < th - 2; j++) fade(c, fl).px(x, FY + j, j < 5 ? IV : YL);
        glow.add(x0 + cell / 2, FY + th / 2, 26, 0.85 * fl); }
      for (let i = -2; i < 22; i++) { const x0 = GW - ((i * cell + off) % (cell * 20)), bit = BITS[((i % 20) + 20) % 20]; if (x0 < 0 || x0 > GW - 10) continue; dtext(c, String(bit), x0 + 8, FY - 16, bit ? YL : MU, fl * 0.9, 1); }
      glow.apply(c, "#F4CA50", 4); }
  }
}
