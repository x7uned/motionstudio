// ed138 backdrop «milky-way» (new, 2026-10-28): a rich, deep night — a dense Milky Way band crossing the sky diagonally with a
// warm glowing core, long branching dust lanes along the band, a violet-blue glow in flat dithered bands, thousands of faint stars painted once
// into a cached layer, plus ~1100 brighter stars in three parallax depths that twinkle slowly, and an optional «crowd» of extra
// faint stars (cam.crowd 0..1, dithered in) for «millions of stars». Stars at infinity: the camera zoom barely scales it.
// draw(c, cam, t): cam = { cx, cy, z, crowd? }. Pure (the layer is painted once from code only).
import { layer, band } from "../lib/layout.mjs";
import { Lay, RGB, C, mixc, fbm, vn, hash, rng, sstep, cl, blit, R } from "../lib/bd1-kit.mjs";
import { bayer } from "../../../../../renderer/pixel/raster.mjs";

const DARK = ["#020207", "#05040D", "#080716", "#0C0A20", "#110E2A"];
const GLOW = RGB([...DARK, "#18143A", "#211B4C", "#2C2460", "#383076", "#483E8C", "#5C50A4", "#7666BC"]);
const BLUE = RGB([...DARK, "#121A3C", "#18244E", "#203262", "#2A4278", "#36548E", "#4868A8", "#6084C0"]);
const CORE = RGB([...DARK, "#201838", "#30244A", "#46325A", "#604464", "#80586C", "#A87A78", "#D4AC8C", "#F2DCB4"]);
export const BAND = { k: -0.5, x0: 300, y0: 300, w: 170 };          // band centre line x = x0 + (y − y0)·k (+ a slow wave)
const P_GLOW = 0.12;
export const bandX = (y) => BAND.x0 + (y - BAND.y0) * BAND.k + 50 * Math.sin(y / 420);
export const coreAt = [bandX(820), 820];                             // the warm core of the band
let SKY = null, STARS = null;

function bandField(x, y) {
  const d = (x - bandX(y)) / (BAND.w * (1 + 0.2 * Math.sin(y / 300 + 1))), g = Math.exp(-d * d);
  const core = Math.exp(-((d / 0.85) ** 2) - ((y - coreAt[1]) / 330) ** 2);          // elongated along the tilted band
  return { d, g, core };
}
/** dark dust lanes, all running along the band (u = along, d = across in band widths): two long wavy lanes, a branch that
 *  splits off and rejoins, thin wisps; broken by noise along their length so nothing reads as round holes. 0..1 darkness */
export function lanes(x, y, d) {
  const u = y, br = (c, w, s0) => { const k = (d - c) / w; return Math.exp(-k * k) * sstep(0.28, 0.55, vn(u / 170 + d * 1.2, s0, 76 + s0)); };
  const c1 = -0.18 + 0.42 * (vn(u / 260, 1, 71) - 0.5), w1 = 0.07 + 0.07 * vn(u / 110, 2, 72);
  const c2 = 0.3 + 0.5 * (vn(u / 320, 3, 73) - 0.5), w2 = 0.05 + 0.05 * vn(u / 90, 4, 74);
  const sp = sstep(0.45, 0.7, vn(u / 210, 5, 75)), c3 = c1 + (0.12 + 0.3 * sp) * (vn(u / 150, 6, 77) > 0.5 ? 1 : -1), w3 = 0.035 + 0.03 * sp;
  const wisp = sstep(0.62, 0.78, fbm(d * 8 + 3, u / 110, 78, 2)) * Math.exp(-((d / 1.1) ** 2)) * 0.45;
  return Math.min(1, Math.max(br(c1, w1, 1), br(c2, w2, 2) * 0.85, br(c3, w3, 3) * 0.8 * sp, wisp));
}
function build() {
  const x0 = -420, y0 = -1000, W = 1380, H = 2600, L = new Lay(x0, y0, W, H, true);
  L.rect(x0, y0, W, H, (x, y) => {
    const { d, g, core } = bandField(x, y);
    const wx = x + (fbm(x / 120, y / 120, 31, 2) - 0.5) * 60, wy = y + (fbm(x / 120 + 7, y / 120, 32, 2) - 0.5) * 60;
    // star clouds: elongated along the band (anisotropic noise in band coordinates), brighter clumps on the band
    const cloud = 0.6 * fbm(d * 2.2 + 5, wy / 150, 3, 3) + 0.4 * fbm(wx / 60, wy / 95, 4, 3), clump = sstep(0.55, 0.8, fbm(d * 4 + 1, wy / 70, 6, 2));
    let lv = g * (0.05 + 0.5 * cloud * cloud + 0.16 * clump) + 0.3 * core * (0.45 + 0.55 * cloud) * (0.8 + 0.4 * clump);
    // dust lanes run along the band (they also hide stars, see below)
    const dk = lanes(x, y, d);
    lv -= 0.34 * dk * (0.45 + 0.55 * Math.max(g, core));
    const sky = 0.12 + 0.12 * Math.exp(-((d / 2.4) ** 2));                                   // the general sky glows a little near the band
    // hue: violet glow, a cooler blue on one side of the band, warm near the core — dithered, never a hard region edge
    const hueB = sstep(0.42, 0.7, vn(x / 170, y / 170, 12)), hueC = sstep(0.25, 0.75, core * 1.3);
    const rp = hueC > 0.02 && hueC > bayer(x & 3 ? x : x + 1, y) * 0.999 ? CORE : hueB > bayer(x + 2, y + 1) ? BLUE : GLOW;
    return band(rp, Math.min(0.94, sky + Math.max(0, lv) * 1.55), x, y, 0.4);
  });
  // tens of thousands of faint stars painted in, dense in the band, fewer inside the dark lanes
  const r = rng(91);
  for (let i = 0; i < 120000; i++) {
    const x = x0 + r() * W, y = y0 + r() * H, { d, g, core } = bandField(x, y), dk = lanes(x, y, d);
    if (r() > (0.05 + 0.95 * Math.max(g, core)) * (1 - 0.8 * dk)) continue;
    const base = L.get(x, y), lv = 0.28 + 0.55 * r() * r(), tint = ["#FFFFFF", "#DCE6FF", "#FFF0D8", "#C8D4FF"][(r() * 4) | 0];
    L.put(x, y, mixc(base, tint, lv));
  }
  return L;
}
function stars() {
  const r = rng(177), out = [], tint = ["#FFFFFF", "#DCE8FF", "#FFF0CC", "#C0D0FF", "#FFD4DC", "#BFF0FF"].map(C);
  const add = (n, p, size, bri, bandBias) => { for (let i = 0; i < n * 3 && out.length < 99999; i++) {
    const x = -400 + r() * 1340, y = -1000 + r() * 2600, { g } = bandField(x, y); if (r() > bandBias + (1 - bandBias) * g) continue;
    out.push({ x, y, p, size: size === 2 && r() < 0.35 ? 3 : size, col: tint[(r() * tint.length) | 0], bri: bri * (0.6 + 0.4 * r()), ph: r() * 6.28, sp: 0.4 + r() * 1.2, tw: r() < 0.6 }); } };
  add(900, 0.1, 1, 0.8, 0.3); add(600, 0.16, 1, 1, 0.35); add(220, 0.22, 2, 1, 0.45);
  const crowd = []; for (let i = 0; i < 26000; i++) { const x = -400 + r() * 1340, y = -1000 + r() * 2600, { g } = bandField(x, y); if (r() > 0.05 + 0.95 * g) continue; crowd.push({ x, y, b: 0.45 + 0.5 * r(), q: r(), col: tint[(r() * 4) | 0] }); }
  return { out, crowd };
}
export function ensure() { if (!SKY) { SKY = build(); STARS = stars(); } }

export function drawSky(c, cam, t) {
  ensure();
  const V = layer(cam, P_GLOW); blit(c, SKY, V);
  const crowd = cam.crowd ?? 0;
  if (crowd > 0.01) { const Vc = layer(cam, 0.1); for (const s of STARS.crowd) { if (s.q > crowd) continue; const x = R(Vc.X(s.x)), y = R(Vc.Y(s.y)); if (x < 0 || y < 0 || x >= c.w || y >= c.h) continue; const k = Math.min(1, (crowd - s.q) * 8); if (k <= bayer(x, y)) continue; c.px(x, y, mixc(c.get(x, y), s.col, s.b)); } }
  for (const s of STARS.out) {
    const Vs = layer(cam, s.p), x = R(Vs.X(s.x)), y = R(Vs.Y(s.y));
    if (x < 1 || y < 1 || x >= c.w - 1 || y >= c.h - 1) continue;
    const f = s.tw ? 0.7 + 0.3 * Math.sin(t * s.sp + s.ph) : 1, lv = Math.round(cl(s.bri * f) * 6) / 6, bg = c.get(x, y), col = mixc(bg, s.col, lv);
    c.px(x, y, col);
    if (s.size >= 2 && lv > 0.45) { const e = mixc(bg, s.col, lv * 0.42); c.px(x - 1, y, e); c.px(x + 1, y, e); c.px(x, y - 1, e); c.px(x, y + 1, e);
      if (s.size === 3 && lv > 0.7) { const e2 = mixc(c.get(x - 2, y), s.col, lv * 0.18); c.px(x - 2, y, e2); c.px(x + 2, y, e2); c.px(x, y - 2, e2); c.px(x, y + 2, e2); } }
  }
}

export default {
  kind: "milky-way",
  backdrop: true,
  covers: ["milky way", "night sky", "galaxy", "stars", "starry sky", "space", "cosmos"],
  source: "ed138 (new)",
  desc: "a deep night sky with a dense Milky Way band, dust lanes and thousands of twinkling stars",
  theme: { accent: "#9CC8FF", gold: "#F4D88A", hot: "#FFF0C0", core: "#FFFFFF", stone: ["#0C0A24", "#1A1442", "#07061A"], beam: "#8CA8F0" },
  draw(c, cam, t) { drawSky(c, cam, t); },
  notes: "cached glow layer (≈1380×2600, painted once, ~2 s) + per-frame stars; cam.crowd (film extension) adds faint stars",
};
