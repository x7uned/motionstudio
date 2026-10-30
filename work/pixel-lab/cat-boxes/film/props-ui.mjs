// «Why do cats love boxes?» — screen-space inserts (540×960 grid pixels, same look as the sister film's HUD: dark rounded
// cards, MAIN pixel font with a dark outline, C palette): the shelter-study panel (two cages, day counters, stress
// meters), the comfort thermometer, and the warm aura around the curled cat. Every value is continuous; numbers
// crossfade through complementary dither gates; `a` dissolves everything. Pure functions of their arguments.
import { MAIN } from "../../../../renderer/pixel/raster.mjs";
import { C, panel } from "../../animals/film/cute.mjs";
import { otext, tw, levelColor } from "../../cat-zoomies/film/hud.mjs";
import { gate } from "../../cat-zoomies/film/layout.mjs";
import { R, clamp01, lerp, s01, frac, rnd, fade, bayer, mix, hex } from "./props-kit.mjs";
import { drawBox } from "./props-box.mjs";

// ---------------------------------------------------------------- fast pixel access
/** put(x, y, rgb): writes straight into the canvas buffer when c is a plain Canvas drawn at full opacity (big cards and
 *  cage walls are 100k+ pixels), otherwise through the dissolve view g.px (same picture, just slower). */
function putter(c, g, a) {
  const direct = c.d && !Object.prototype.hasOwnProperty.call(c, "px") && typeof c.w === "number";
  if (!direct) return (x, y, rgb) => g.px(x, y, rgb);
  const d = c.d, W = c.w, H = c.h;
  if (a >= 1) return (x, y, rgb) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const i = (y * W + x) * 3; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; };
  return (x, y, rgb) => { if (x < 0 || y < 0 || x >= W || y >= H || a <= bayer(x, y)) return; const i = (y * W + x) * 3; d[i] = rgb[0]; d[i + 1] = rgb[1]; d[i + 2] = rgb[2]; };
}
/** The sister films' dark rounded card (cute.mjs panel look: edge, inner edge, vertical card gradient), fast. */
function card(c, x, y, w, h, a, edge = C.p7) {
  if (a <= 0) return;
  const put = putter(c, fade(c, a), a), E = hex(edge), P5 = hex(C.p5), rows = [];
  for (let j = 0; j < h; j++) rows.push(mix(C.CARD, "#1D1430", j / h));
  for (let j = 0; j < h; j++) {
    const ins = j === 0 || j === h - 1 ? 2 : j === 1 || j === h - 2 ? 1 : 0;
    for (let i = ins; i < w - ins; i++) {
      const e = Math.min(i, w - 1 - i, j, h - 1 - j), corner = (i <= 2 || i >= w - 3) && (j <= 2 || j >= h - 3);
      put(x + i, y + j, e === 0 ? E : e === 1 || (corner && e === 2 && (i === 2 || i === w - 3) && (j === 2 || j === h - 3)) ? P5 : rows[j]);
    }
  }
}

// ---------------------------------------------------------------- shelter panel
const WALL = ["#3A3456", "#46406A", "#524C7A", "#5E5888"].map(hex), FLOORC = ["#5C5070", "#7A6E8C", "#9488A4", "#ADA2BA"].map(hex);
const BAR = ["#2A2440", "#6E6890", "#A8A2C6", "#E2DEF4"], BOWLC = ["#1A2250", "#33458A", "#6A78D0", "#A9C4FF"];

/** Plane for drawing world-unit actors inside a cage: origin at the cage's floor line, x centred (matches render.mjs). */
export function cagePlane(cage, scale) {
  const mx = (cage.x0 + cage.x1) / 2;
  return { z: scale, X: (wx) => mx + wx * scale, Y: (wy) => cage.floorY + wy * scale, wx: (sx) => (sx - mx) / scale, wy: (sy) => (sy - cage.floorY) / scale };
}
/** The small cardboard box in a cage at panel scale (box centre at the cage centre, wx = 0 of cagePlane).
 *  part "back" | "front"; draw the cat with drawCat(g, cagePlane(cage, scale), 0, 0, …) between the two calls.
 *  Default o.cut = 0.7: a cross-section box (front wall lowered, corrugated cut edge) so the hiding cat stays visible in
 *  the diagram; pass { cut: 0 } for a closed-wall box. Use boxClip(g, cagePlane(cage, scale), 0, o) for the cat. */
export function cageBox(c, cage, part, scale, o = {}) {
  const G = cagePlane(cage, scale);
  return drawBox(cage.clip ? cage.clip(c) : c, G, 0, part, { flaps: 1, tape: 1, label: false, cut: 0.7, ...o });
}
function clipView(c, x0, y0, x1, y1) { const v = Object.create(c); v.px = (x, y, col) => { if (x >= x0 && x < x1 && y >= y0 && y < y1) c.px(x, y, col); }; return v; }

/** Day number with a 0.15-s style crossfade: the integer part shows, the fraction dissolves into the next number. */
function dayNumber(c, value, x, y, a, scale = 3) {
  const n0 = Math.floor(value + 1e-6), f = clamp01(value - n0), lab = "DAY ";
  otext(c, lab, x, y, C.IV, a, scale);
  const nx = x + tw(c, lab, scale) + scale;
  if (f < 0.002) { otext(c, String(n0), nx, y, C.Y, a, scale); return; }
  const g0 = gate(c, f, 1), g1 = gate(c, 0, f);
  otext(g0, String(n0), nx, y - R(f * 5), C.Y, a, scale);
  otext(g1, String(n0 + 1), nx, y + R((1 - f) * 5), C.Y, a, scale);
}
/** Small face icon: worried (red) → content (green), mouth curvature continuous in `calm`. */
function moodFace(g, cx, cy, calm, t) {
  const col = levelColor(calm), dark = mix(col, C.O, 0.55), lite = mix(col, "#FFFFFF", 0.45), r = 7;
  for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) { const d = Math.hypot(x, y); if (d <= r + 0.5) g.px(cx + x, cy + y, d > r - 0.6 ? C.O : (x + y < -5 ? lite : y > 3 ? dark : col)); }
  for (const ex of [-3, 2]) { g.px(cx + ex, cy - 2, C.O); g.px(cx + ex, cy - 1, C.O); }
  const k = lerp(-1, 1, calm);                                         // −1 frown … 1 smile
  for (let x = -3; x <= 3; x++) { const u = x / 3, yy = R(2.5 + k * 1.6 * (1 - u * u) - k * 0.4); g.px(cx + x, cy + yy, C.O); }
  const sweat = s01((0.45 - calm) / 0.2);
  if (sweat > 0) { const gs = fade(g, sweat), sy = cy - 4 + R(frac(t * 0.8) * 3); gs.px(cx + 7, sy, "#7FE3F0"); gs.px(cx + 7, sy + 1, "#7FE3F0"); gs.px(cx + 6, sy + 1, "#B8F4FA"); gs.px(cx + 8, sy + 1, "#7FE3F0"); gs.px(cx + 7, sy + 2, "#4AB8D0"); }
}
function stressMeter(c, x, y, w, stress, a, t) {
  const g = fade(c, a), calm = 1 - clamp01(stress), bw = w - 22, bh = 12;
  otext(c, "STRESS", x, y, C.L, a, 1);
  const by = y + 10;
  g.rrect(x - 1, by - 1, bw + 2, bh + 2, C.O, 2); g.rrect(x, by, bw, bh, C.p7, 2); g.rect(x + 1, by + 1, bw - 2, bh - 2, "#0E0918");
  const fw = (bw - 4) * clamp01(stress), col = levelColor(calm), lit = mix(col, "#FFFFFF", 0.38), dk = mix(col, C.O, 0.32);
  for (let i = 0; i < Math.ceil(fw); i++) { if (fw - i < 1 && fw - i <= bayer(x + 2 + i, by)) continue; const cut = i % 8 === 7; for (let j = 0; j < bh - 4; j++) { let cc = j < 2 ? lit : j >= bh - 6 ? dk : col; if (cut) cc = mix(cc, C.O, 0.5); g.px(x + 2 + i, by + 2 + j, cc); } }
  moodFace(g, x + bw + 12, by + 5, calm, t);
}

/**
 * shelterPanel(c, x, y, w, h, st) — the shelter study inset: dark card, title bar «DAYS TO CALM DOWN», two cages side by
 * side titled WITH BOX (green) and NO BOX (pink), each with a tiled back wall, a floor and a small water bowl; under each
 * cage «DAY n» (crossfading between integers) and a STRESS meter (fill = stress, red → green, with a mood face).
 * st = { a, dayL, dayR, stressL, stressR, t }.
 * Returns null when a ≤ 0, else { x, y, w, h, left, right, bars(g) } with left/right = { x0, y0, x1, y1, floorY,
 * clip(g) → a view that only writes inside this cage }. Draw the cats (and cageBox in the left cage) after this call and
 * finish with bars(g) — the front bars, rails and the door latch go over the cats.
 */
export function shelterPanel(c, x, y, w, h, st = {}) {
  const a = clamp01(st.a ?? 1); if (a <= 0) return null;
  const t = st.t ?? 0, g = fade(c, a);
  x = R(x); y = R(y); w = R(w); h = R(h);
  card(c, x, y, w, h, a, C.p7);
  const put = putter(c, g, a);
  // title bar
  const tb = 30; g.rect(x + 3, y + 3, w - 6, tb - 4, "#1F1630"); g.rect(x + 3, y + tb - 1, w - 6, 1, C.p5);
  const title = "DAYS TO CALM DOWN"; otext(c, title, x + R((w - tw(c, title, 2)) / 2), y + 9, C.Y, a, 2);
  const pad = 14, cw = R((w - 3 * pad) / 2), top = y + tb + 30, foot = 64, cbot = y + h - foot - 8;
  const cages = [];
  for (let i = 0; i < 2; i++) {
    const cx0 = x + pad + i * (cw + pad), lab = i ? "NO BOX" : "WITH BOX", lc = i ? C.PK : C.GR;
    otext(c, lab, cx0 + R((cw - tw(c, lab, 2)) / 2), top - 21, lc, a, 2);
    // cage body: frame, tiled back wall, floor
    g.rframe(cx0 - 2, top - 2, cw + 4, cbot - top + 4, C.O, 2); g.rframe(cx0 - 1, top - 1, cw + 2, cbot - top + 2, BAR[1], 1); g.rframe(cx0, top, cw, cbot - top, BAR[1], 1); g.rect(cx0 + 1, top + 1, cw - 2, 5, BAR[1]); g.rect(cx0 + 1, cbot - 5, cw - 2, 4, BAR[1]); g.rect(cx0 + 1, top + 1, 1, cbot - top - 2, BAR[1]); g.rect(cx0 + cw - 2, top + 1, 1, cbot - top - 2, BAR[1]);
    const ix0 = cx0 + 2, iy0 = top + 6, ix1 = cx0 + cw - 2, iy1 = cbot - 5, floorY = iy1 - Math.max(16, R((iy1 - iy0) * 0.12));
    for (let yy = iy0; yy < iy1; yy++) for (let xx = ix0; xx < ix1; xx++) {
      let col;
      if (yy >= floorY - 6) { const v = (yy - (floorY - 6)) / (iy1 - floorY + 6); col = yy === floorY - 6 ? FLOORC[3] : v < 0.25 ? FLOORC[2] : ((xx >> 3) + (yy >> 2)) % 7 === 0 && bayer(xx, yy) < 0.4 ? FLOORC[0] : FLOORC[1]; }
      else { const gx = (xx - ix0) % 18, gy = (yy - iy0) % 14, edge = gx === 0 || gy === 0, vig = Math.abs((xx - (ix0 + ix1) / 2) / ((ix1 - ix0) / 2)); col = edge ? WALL[0] : (gx === 1 || gy === 1) ? WALL[3] : vig > 0.82 && bayer(xx, yy) < (vig - 0.82) * 4 ? WALL[1] : WALL[2]; if ((yy - iy0) < 10 && bayer(xx, yy) < (1 - (yy - iy0) / 10) * 0.5) col = WALL[3]; }
      put(xx, yy, col);
    }
    // soft shadow line where wall meets floor, and a small water bowl in the back corner
    for (let xx = ix0; xx < ix1; xx++) if (bayer(xx, floorY - 5) < 0.5) g.px(xx, floorY - 5, WALL[0]);
    const bx = i ? ix0 + 18 : ix1 - 20, byy = floorY - 4;
    g.ellipse(bx, byy, 9, 3, BOWLC[0]); g.rect(bx - 8, byy - 2, 17, 4, BOWLC[1]); g.ellipse(bx, byy - 2, 8, 2, BOWLC[0]); g.ellipse(bx, byy - 2, 6, 1, "#7FE3F0");
    for (let xx = bx - 7; xx <= bx + 7; xx++) g.px(xx, byy + 2, BOWLC[0]);
    g.px(bx - 4, byy - 3, "#FFFFFF");
    cages.push({ x0: ix0, y0: iy0, x1: ix1, y1: iy1, floorY, clip: (gg) => clipView(gg, ix0, iy0, ix1, iy1) });
    // footer: day counter + stress meter
    const fy = cbot + 8;
    dayNumber(c, i ? st.dayR ?? 1 : st.dayL ?? 1, cx0 + 2, fy, a, 3);
    stressMeter(c, cx0 + 2, fy + 30, cw - 2, i ? st.stressR ?? 0.9 : st.stressL ?? 0.9, a, t);
  }
  const bars = (gb) => {
    for (const cg of cages) {
      const gg = gb, n = Math.max(6, Math.round((cg.x1 - cg.x0) / 18)), sp = (cg.x1 - cg.x0) / n;
      for (let k = 1; k < n; k++) {
        const bx = R(cg.x0 + k * sp);
        for (let yy = cg.y0; yy < cg.y1; yy++) { gg.px(bx - 1, yy, BAR[0]); gg.px(bx, yy, BAR[3]); gg.px(bx + 1, yy, BAR[2]); gg.px(bx + 2, yy, BAR[0]); }
      }
      // rails
      for (const [ry, rh] of [[cg.y0 - 1, 6], [cg.y1 - 5, 6]]) { gg.rect(cg.x0 - 1, ry, cg.x1 - cg.x0 + 2, rh, BAR[1]); gg.rect(cg.x0 - 1, ry, cg.x1 - cg.x0 + 2, 1, BAR[3]); gg.rect(cg.x0 - 1, ry + rh - 1, cg.x1 - cg.x0 + 2, 1, BAR[0]); }
      // door latch on the right
      const lx = R(cg.x1 - sp * 1.5), ly = R((cg.y0 + cg.y1) / 2);
      gg.rect(lx - 4, ly - 3, 9, 7, BAR[0]); gg.rect(lx - 3, ly - 2, 7, 5, BAR[2]); gg.rect(lx - 3, ly - 2, 7, 1, BAR[3]); gg.px(lx, ly, BAR[0]);
    }
  };
  return { x, y, w, h, left: cages[0], right: cages[1], bars: (gb) => bars(gb ?? g) };
}

// ---------------------------------------------------------------- thermometer
const RED = ["#5A0E1E", "#A01E34", "#E0344A", "#F2484E", "#FF7A7A", "#FFB4B4"], WARM = "#F59A3A", COOL = "#7FC4F4";
/**
 * thermometer(c, x, y, st) — a dark card (164 × 300, top-left at x, y) with a pixel thermometer 0–40 °C: glass tube and
 * bulb, ticks every 5° (numbers every 10°), the cats' comfort band 30–38 °C in warm orange with the label «CATS / 30-38°C»,
 * a cool-blue marker «ROOM / 21°C», and the mercury at st.level (°C, continuous).
 * st = { a = 1, level = 21, band = 0 (0..1 reveal: grows from 34° outward + dissolves), room = 0 (0..1 reveal: slides in) }.
 * Returns { x, y, w, h, yAt(°C) → screen y on the tube }.
 */
export function thermometer(c, x, y, st = {}) {
  const a = clamp01(st.a ?? 1), W = 164, H = 300; x = R(x); y = R(y);
  const yTop = y + 34, yBot = y + H - 56, tx = x + 42, tW = 16;
  const yAt = (T) => yBot - (clamp01(T / 40)) * (yBot - yTop);
  const res = { x, y, w: W, h: H, yAt };
  if (a <= 0) return res;
  const g = fade(c, a);
  card(c, x, y, W, H, a, C.p7);
  otext(c, "°C", tx - 2, y + 10, C.L, a, 2);
  // comfort band (behind the tube): warm stripe from the scale to the label, with a bracket
  const band = clamp01(st.band ?? 0);
  if (band > 0) {
    const gb = fade(c, a * s01(band / 0.6)), mid = yAt(34), hh = ((yAt(30) - yAt(38)) / 2) * s01(band), y0 = R(mid - hh), y1 = R(mid + hh), bx1 = tx + tW + 7;
    for (let yy = y0; yy <= y1; yy++) for (let xx = tx - 15; xx <= bx1; xx++) { const edge = yy === y0 || yy === y1; if (edge || xx === bx1) gb.px(xx, yy, WARM); else if (bayer(xx, yy) < 0.38) gb.px(xx, yy, mix(WARM, "#120C1D", 0.3)); }
    for (let xx = bx1; xx <= bx1 + 4; xx++) gb.px(xx, R(mid), WARM);                                  // bracket tick → label
    const lx = bx1 + 7; otext(c, "CATS", lx, R(mid - 15), WARM, a * s01((band - 0.3) / 0.5), 2); otext(c, "30-38°C", lx, R(mid + 2), "#FFD08A", a * s01((band - 0.4) / 0.5), 2);
  }
  // ticks and numbers
  for (let T = 0; T <= 40; T += 5) { const yy = R(yAt(T)), major = T % 10 === 0; g.rect(tx - (major ? 9 : 6), yy, major ? 7 : 4, 1, major ? C.IV : C.L); if (major) otext(c, String(T), tx - 12 - tw(c, String(T), 1), yy - 3, C.L, a, 1); }
  // glass tube + bulb
  const by = yBot + 20, br = 14;
  g.rrect(tx - 1, yTop - 8, tW + 2, by - yTop + 4, C.O, 2); g.rrect(tx, yTop - 7, tW, by - yTop + 2, "#B8AEDA", 2); g.rect(tx + 2, yTop - 5, tW - 4, by - yTop, "#1A1430");
  g.disc(tx + tW / 2, by, br + 1, C.O); g.disc(tx + tW / 2, by, br, "#B8AEDA"); g.disc(tx + tW / 2, by, br - 2, "#1A1430");
  // mercury
  const lv = clamp01((st.level ?? 21) / 40), my = yBot - lv * (yBot - yTop), mx0 = tx + 4, mx1 = tx + tW - 4;
  for (let yy = Math.floor(my); yy <= by; yy++) for (let xx = mx0; xx < mx1; xx++) { if (yy === Math.floor(my) && (my - yy) > bayer(xx, yy)) continue; const u = (xx - mx0) / (mx1 - mx0); g.px(xx, yy, u < 0.25 ? RED[4] : u > 0.75 ? RED[1] : RED[3]); }
  g.disc(tx + tW / 2, by, br - 4, RED[3]); g.disc(tx + tW / 2 - 3, by - 3, 4, RED[4]); g.disc(tx + tW / 2 - 4, by - 4, 1, RED[5]);
  for (let yy = yTop - 4; yy < by - 10; yy++) if ((yy & 7) !== 0) g.px(tx + 3, yy, yy < my ? "#4A4070" : RED[5]);
  // room marker
  const room = clamp01(st.room ?? 0);
  if (room > 0) {
    const gr = fade(c, a * s01(room / 0.6)), ry = R(yAt(21)), off = R((1 - s01(room)) * 10);
    for (let xx = tx - 3; xx < tx + tW + 4; xx += 2) gr.px(xx, ry, COOL);
    const ax = tx + tW + 6 + off; for (let k = 0; k < 5; k++) gr.rect(ax + k, ry - (4 - k), 1, 2 * (4 - k) + 1, k === 0 ? C.O : COOL);
    gr.rect(ax + 5, ry - 1, 6, 3, COOL);
    const lx = tx + tW + 14 + off; otext(c, "ROOM", lx, ry + 7, COOL, a * s01((room - 0.25) / 0.5), 2); otext(c, "21°C", lx, ry + 25, "#C4E6FF", a * s01((room - 0.35) / 0.5), 2);
  }
  return res;
}

// ---------------------------------------------------------------- heat aura
/**
 * heatAura(c, x0, y0, x1, y1, t, a) — soft warm dithered glow centred low in the rect (where the curled cat is) and
 * four wavy heat lines rising through it and fading at both ends; loops continuously in t. Draw it after the box/cat.
 */
export function heatAura(c, x0, y0, x1, y1, t = 0, a = 1) {
  if (a <= 0) return; x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); const w = x1 - x0, h = y1 - y0; if (w < 4 || h < 4) return;
  const mx = (x0 + x1) / 2, my = y1 - h * 0.3, rx = w / 2, ry = h * 0.55, pul = 0.9 + 0.1 * Math.sin(t * 2.4);
  c.tint(Math.max(0, x0), Math.max(0, y0), w, h, (X, Y) => { const q = ((X + 0.5 - mx) / rx) ** 2 + ((Y + 0.5 - my) / ry) ** 2; return q >= 1 ? 0 : a * 0.42 * pul * Math.pow(1 - q, 1.4); }, "#FFB060", 4);
  const g = fade(c, a), th = Math.max(1, R(w / 90));
  for (let i = 0; i < 4; i++) {
    const ph = frac(t * 0.42 + i * 0.27 + rnd(i) * 0.1), lxc = x0 + w * (0.22 + 0.56 * (i / 3)) + (rnd(i + 5) - 0.5) * w * 0.08, cyl = y1 - h * (0.2 + 0.78 * ph), len = h * 0.34;
    for (let k = 0; k <= len; k++) {
      const u = k / len, yy = R(cyl - len / 2 + k), xx = R(lxc + Math.sin(yy * 0.13 + t * 3.2 + i * 1.7) * (2.5 + w * 0.012));
      const al = Math.sin(Math.PI * u) * Math.sin(Math.PI * ph);
      if (al <= bayer(xx, yy)) continue;
      for (let q = 0; q < th; q++) g.px(xx + q, yy, u < 0.5 ? "#FFE6B0" : "#FFC878");
    }
  }
}
void lerp; void MAIN;
