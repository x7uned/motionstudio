// STREET props for «Fake buttons»: the far side's pedestrian signal head (raised hand / walking man, US style) and the
// car signal on the mast arm, both run by walkAt(); the crosswalk push-button box on its pole (exactly at BUTTON) with
// its PUSH BUTTON FOR WALK SIGNAL plate, the WAIT lamp and the in-world highlight; the grey controller cabinet with
// its AUTO countdown that hits 0:00 exactly when WALK comes on; and the X-ray lens over the box (the button's wire is
// unplugged: red ✕, OFF tag). Static parts are cached sprites; lamps, digits and the lens are live and continuous.
import { BUTTON, CABINET, PED_SIGNAL } from "../timeline.mjs";
import { Layer, blit, vgrad, hline, vline, tintRect, mix, bayer, fade, hex, R, MAIN, TINY, clamp01 } from "./street-kit.mjs";
import { POLE, CAR_SIGNAL } from "./street-art.mjs";
import { EV, sm, ease, win, walkK, carLamps, autoLeft, pressAt, waitLampAt, HILITE, SCREEN_ON, LENS, WALK_ON } from "./street-time.mjs";

const INK = "#1A0E1C", RIM = "#FFC27A";

// ---------------------------------------------------------------- pixel icons (LED style)
const HAND = [
  "....##........",
  "..#.##.##.....",
  ".##.##.##.....",
  ".##.##.##.##..",
  ".##.##.##.##..",
  ".##.##.##.##..",
  ".##.##.##.##..",
  ".###########.#",
  ".###########.#",
  ".############.",
  ".###########..",
  "..##########..",
  "..#########...",
  "...#######....",
  "...#######....",
];
const MAN = [
  ".....##.....",
  ".....##.....",
  "............",
  "....###.....",
  "...#####....",
  "..#.###.#...",
  ".#..###..#..",
  "#...###...#.",
  "....###.....",
  "....#.##....",
  "...##..#....",
  "..##...##...",
  ".##.....#...",
  "##......##..",
];
function icon(c, rows, x0, y0, on, colOn, colOff) {
  rows.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch !== "#") return; const X = x0 + i, Y = y0 + j, led = ((X + Y) & 1) === 0;
    const lit = on > bayer(X, Y) * 0.98; c.px(X, Y, lit ? (led ? colOn[0] : colOn[1]) : (led ? colOff[0] : colOff[1]));
  }));
}

// ---------------------------------------------------------------- the far side's pedestrian signal head + the car signal
export function drawSignals(c, V, t) {
  const k = walkK(t), cx = R(V.X(PED_SIGNAL.x)), cy = R(V.Y(PED_SIGNAL.y));
  if (cx < -60 || cx > 600) return;
  // housing (side-by-side): left = hand, right = walking man; a visor on top, a bracket to the pole
  const x0 = cx - 24, y0 = cy - 14, w = 48, h = 28;
  c.rect(x0 - 1, y0 - 1, w + 2, h + 2, INK); c.rect(x0, y0, w, h, "#2C2E36"); c.rect(x0, y0, w, 1, RIM); c.rect(x0, y0 + 1, 1, h - 1, mix("#2C2E36", RIM, 0.5));
  c.rect(x0 - 2, y0 - 3, w + 4, 3, "#22242C"); c.rect(x0 - 2, y0 - 3, w + 4, 1, RIM);
  for (const fx of [x0 + 3, x0 + 25]) { c.rect(fx, y0 + 3, 20, 22, "#121318"); c.rect(fx, y0 + 3, 20, 1, "#3A3C46"); }
  // glows behind the active icon (soft, dithered), then the icons
  const hand = 1 - k, man = k;
  glow(c, x0 + 13, y0 + 14, 15, "#FF6A2A", 0.55 * hand); glow(c, x0 + 35, y0 + 14, 15, "#E8F6FF", 0.5 * man);
  icon(c, HAND, x0 + 6, y0 + 6, hand, ["#FF9A4A", "#FF6A2A"], ["#4A2A1C", "#3A2218"]);
  icon(c, MAN, x0 + 29, y0 + 7, man, ["#FFFFFF", "#D8F0FF"], ["#2E3440", "#262A34"]);
  // the car signal hanging from the mast arm (red / yellow / green), faces us
  const L = carLamps(t), sx = R(V.X(CAR_SIGNAL.x)), sy = R(V.Y(CAR_SIGNAL.y));
  vline(c, sx, sy - 3, 4, "#2A3434");
  c.rect(sx - 7, sy, 15, 37, INK); c.rect(sx - 6, sy + 1, 13, 35, "#C8A030"); c.rect(sx - 6, sy + 1, 13, 1, "#FFE08A"); c.rect(sx + 5, sy + 1, 2, 35, "#8A6A20");
  [["#FF4A4A", "#5A1A1E", L.r], ["#FFC83A", "#5A4416", L.y], ["#5AF08A", "#163A24", L.g]].forEach(([on, off, a], i) => {
    const ly = sy + 7 + i * 11; c.rect(sx - 5, ly - 5, 11, 2, "#2A2016");
    glow(c, sx, ly, 9, on, 0.45 * a);
    for (let j = -3; j <= 3; j++) for (let q = -3; q <= 3; q++) if (q * q + j * j <= 10) { const X = sx + q, Y = ly + j, lit = a > bayer(X, Y) * 0.98; c.px(X, Y, lit ? (q + j < -1 ? "#FFFFFF" : on) : off); }
  });
}
function glow(c, x, y, r, col, k) { if (k <= 0.01) return; tintRect(c, x - r, y - r, 2 * r + 1, 2 * r + 1, (X, Y) => { const q = Math.hypot(X - x, Y - y) / r; return q >= 1 ? 0 : k * (1 - q) ** 1.4; }, col, 4); }

// ---------------------------------------------------------------- the push-button box on its pole (world sprite, origin = BUTTON)
const BOX = { x0: -14, x1: 15, y0: -31, y1: 21 };           // relative to the button centre
const PLATE = { x0: -24, x1: 25, y0: -84, y1: -54 };
const POLE_X = BUTTON.pole - BUTTON.x;                      // +13
const BOXART = (() => {
  const L = new Layer(70, 262, -32, -97), g = L.g;   // covers the plate (−84) down to the sidewalk (+163)
  // the pole: dark green-grey, warm rim on its left edge
  g.rect(POLE_X - 2, -95, 5, 258, "#3A4440"); vline(g, POLE_X - 2, -95, 258, RIM); vline(g, POLE_X + 2, -95, 258, "#1E2624"); g.rect(POLE_X - 3, -96, 7, 2, "#2A3230");
  g.rect(POLE_X - 4, 157, 9, 6, "#3A4440"); hline(g, POLE_X - 4, 157, 9, RIM);
  // plate: PUSH BUTTON FOR WALK SIGNAL + arrow
  const { x0, x1, y0, y1 } = PLATE; g.rect(x0 - 1, y0 - 1, x1 - x0 + 2, y1 - y0 + 2, INK); g.rect(x0, y0, x1 - x0, y1 - y0, "#F4F0E6"); g.frame(x0 + 1, y0 + 1, x1 - x0 - 2, y1 - y0 - 2, "#2A2430");
  hline(g, x0, y0, x1 - x0, "#FFFFFF");
  const T = (s, y) => { const w = g.measure(TINY, s); g.text(TINY, s, R((x0 + x1) / 2 - w / 2), y, "#1E1A24"); };
  T("PUSH BUTTON", y0 + 4); T("FOR WALK", y0 + 11);
  { const w = g.measure(TINY, "SIGNAL") + 8, sx = R((x0 + x1) / 2 - w / 2); g.text(TINY, "SIGNAL", sx, y0 + 18, "#1E1A24"); const ax = sx + w - 5, ay = y0 + 20; hline(g, ax - 2, ay, 5, "#C8343A"); g.px(ax - 1, ay - 1, "#C8343A"); g.px(ax - 1, ay + 1, "#C8343A"); g.px(ax - 2, ay - 1, "#C8343A"); g.px(ax - 2, ay + 1, "#C8343A"); }
  // bracket plate → pole
  g.rect(x1 - 4, y1, 3, 4, "#2A3230");
  // the box: yellow housing (US style), rounded, a darker bezel around the button, a little WAIT window
  const b = BOX; g.rect(b.x0 - 1, b.y0 - 1, b.x1 - b.x0 + 2, b.y1 - b.y0 + 2, INK);
  vgrad(g, b.x0, b.y0, b.x1 - b.x0, b.y1 - b.y0, "#F6D04A", "#D8A42A", 3); vline(g, b.x0, b.y0, b.y1 - b.y0, "#FFE890"); hline(g, b.x0, b.y0, b.x1 - b.x0, "#FFF0B0"); vline(g, b.x1 - 1, b.y0, b.y1 - b.y0, "#A87A1E"); hline(g, b.x0, b.y1 - 1, b.x1 - b.x0, "#A87A1E");
  g.px(b.x0 - 1, b.y0 - 1, null); for (const [cx, cy] of [[b.x0 + 2, b.y0 + 2], [b.x1 - 3, b.y0 + 2], [b.x0 + 2, b.y1 - 3], [b.x1 - 3, b.y1 - 3]]) g.px(cx, cy, "#8A6A1A");
  // bezel ring around the button (button itself is live)
  for (let j = -9; j <= 9; j++) for (let i = -9; i <= 9; i++) { const d = Math.hypot(i, j); if (d <= 9.2 && d > 7.2) g.px(i, j, d > 8.4 ? INK : i + j < 0 ? "#B8B8C4" : "#6E6E7E"); }
  // little arrow below the button pointing left (toward the crossing)
  hline(g, -4, 14, 9, "#2A2430"); g.px(-3, 13, "#2A2430"); g.px(-3, 15, "#2A2430"); g.px(-2, 12, "#2A2430"); g.px(-2, 16, "#2A2430");
  // WAIT window frame (above the button, clear of his hand)
  g.rect(-10, -28, 21, 9, INK);
  return L;
})();
/** Pixels around the box + plate silhouette (ring 1..4 = distance), for the pulsing highlight outline (relative to the button). */
const OUTLINE = (() => {
  const L = BOXART, out = [];
  const on = (x, y) => { const i = (y - L.oy) * L.w + (x - L.ox); return x >= L.ox && y >= L.oy && x < L.ox + L.w && y < L.oy + L.h && L.m[i] === 1 && !(x >= POLE_X - 3 && x <= POLE_X + 3 && (y > BOX.y1 + 1 || y < PLATE.y0 - 1)); };
  for (let y = PLATE.y0 - 6; y <= BOX.y1 + 6; y++) for (let x = PLATE.x0 - 6; x <= PLATE.x1 + 6; x++) {
    if (on(x, y)) continue; let best = 9;
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (on(x + i, y + j)) best = Math.min(best, Math.hypot(i, j));
    if (best <= 4.2) out.push([x, y, best]);
  }
  return out;
})();

/** The box on its pole: static sprite + live button (sinks), WAIT lamp, highlight outline. Anchored at BUTTON (world). */
export function drawButtonBox(c, V, t) {
  const bx = R(V.X(BUTTON.x)), by = R(V.Y(BUTTON.y)); if (bx < -80 || bx > 620) return;
  blit(c, BOXART, bx + BOXART.ox, by + BOXART.oy);
  // the button: chrome dome that sinks 1–2 px at each press (and darkens a little)
  const p = pressAt(t), sink = p * 1.6;
  for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
    const d = Math.hypot(i, j); if (d > 7.2) continue;
    const yy = by + j + (d < 6.2 ? R(sink) : 0), lightK = clamp01(1 - Math.hypot(i + 3, j + 3) / 8) - p * 0.25;
    let col = d > 6.2 ? "#4A4A58" : lightK > 0.55 ? "#FFFFFF" : lightK > 0.3 ? "#D8D8E4" : lightK > 0.1 ? "#A8A8BA" : "#7A7A8E";
    if (d <= 6.2 && d > 5.2 && i + j > 2) col = "#5A5A6C";
    c.px(bx + i, yy, col);
  }
  // sunk gap shadow at the top of the dome while pressed
  if (sink > 0.5) for (let i = -5; i <= 5; i++) c.px(bx + i, by - 7 + 1, "#2A2A34");
  // WAIT lamp
  const w = waitLampAt(t), lx = bx - 9, ly = by - 27;
  c.rect(lx, ly, 19, 7, "#2A0E10");
  glow(c, bx + 1, ly + 3, 14, "#FF6A3A", 0.45 * w);
  c.text(TINY, "WAIT", lx + 2, ly + 1, "#5A2420");
  if (w > 0) c.text(TINY, "WAIT", lx + 2, ly + 1, "#FFB070", { colorAt: (X, Y) => (w > bayer(X, Y) ? ((X + Y) & 1 ? "#FFD8A0" : "#FF8A4A") : null) });
  // pulsing highlight outline on "Start with the crosswalk button."
  const ha = win(t, HILITE[0], HILITE[1], 0.25, 0.35);
  if (ha > 0) {
    const pulse = 0.6 + 0.4 * Math.sin((t - HILITE[0]) * 2 * Math.PI * 2.2);
    for (const [x, y, d] of OUTLINE) {
      const X = bx + x, Y = by + y, k = ha * (d <= 1.01 ? 1 : d <= 2.3 ? 0.95 * (0.7 + 0.3 * pulse) : pulse * (1 - (d - 2.3) / 2.2) * 0.8);
      if (k > bayer(X, Y) * 0.98) c.px(X, Y, d <= 1.01 ? "#1A0E1C" : d <= 2.3 ? "#FFFFFF" : "#FFD83A");
    }
    // a few sparkles orbiting the box
    for (let i = 0; i < 4; i++) { const an = (t - HILITE[0]) * 2.4 + i * Math.PI / 2, sx = R(bx + Math.cos(an) * 34), sy = R(by - 30 + Math.sin(an) * 62); if (ha * pulse > 0.5) { c.px(sx, sy, "#FFFFFF"); c.px(sx - 1, sy, "#FFE15A"); c.px(sx + 1, sy, "#FFE15A"); c.px(sx, sy - 1, "#FFE15A"); c.px(sx, sy + 1, "#FFE15A"); } }
  }
}
/** Screen box of the push-button box (for the lens callout). */
export function boxScreen(V) { const bx = R(V.X(BUTTON.x)), by = R(V.Y(BUTTON.y)); return { x0: bx + BOX.x0, x1: bx + BOX.x1, y0: by + BOX.y0, y1: by + BOX.y1, cx: bx, cy: by }; }

// ---------------------------------------------------------------- the signal controller cabinet ("the computer")
const CAB = { x0: -26, x1: 26, top: -92, base: -8 };        // relative to (CABINET.x, LAND)
const CABART = (() => {
  const L = new Layer(64, 96, -32, -94), g = L.g, { x0, x1, top, base } = CAB, w = x1 - x0;
  g.rect(x0 - 4, base, w + 8, 6, "#A89A90"); hline(g, x0 - 4, base, w + 8, "#E8D8C8"); hline(g, x0 - 4, base + 5, w + 8, "#6A5E60");     // concrete pad
  g.rect(x0 - 1, top - 1, w + 2, base - top + 1, INK);
  vgrad(g, x0, top, w, base - top, "#9AA4A2", "#7A8482", 4);
  hline(g, x0, top, w, "#F2D2A2"); hline(g, x0, top + 1, w, "#C8C0B0"); vline(g, x0, top, base - top, "#E2C8A2"); vline(g, x1 - 1, top, base - top, "#5A6260"); vline(g, x1 - 2, top, base - top, "#6A7270");
  g.rect(x0 - 2, top - 3, w + 4, 3, "#8A9492"); hline(g, x0 - 2, top - 3, w + 4, "#FFD8A8");                                            // rain hood
  vline(g, 0, top + 4, base - top - 6, "#5A6462"); vline(g, 1, top + 4, base - top - 6, "#B4BEBC");                                     // door seam
  g.rect(4, top + 40, 3, 9, "#3A4442"); g.px(5, top + 41, "#D8E2E0");                                                                   // handle
  for (let j = 0; j < 5; j++) { hline(g, x0 + 5, base - 22 + j * 3, 18, "#5A6462"); hline(g, x0 + 5, base - 21 + j * 3, 18, "#B0BAB8"); }   // louvres
  for (let j = 0; j < 5; j++) { hline(g, 5, base - 22 + j * 3, 17, "#5A6462"); hline(g, 5, base - 21 + j * 3, 17, "#B0BAB8"); }
  // the screen bezel (the screen itself is live) + a little sticker
  g.rect(-20, top + 8, 40, 26, "#2A3230"); g.rect(-19, top + 9, 38, 24, "#0C1412");
  g.rect(-20, top + 37, 18, 6, "#E8E2D2"); g.text(TINY, "SIG", -19, top + 38, "#3A3A44");
  g.rect(x0 + 2, top + 36, 1, 1, "#FF5A3A");
  return L;
})();
const digits = (s) => { s = Math.max(0, Math.ceil(s - 1e-6)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
export function drawCabinet(c, V, t) {
  const cx = R(V.X(CABINET.x)), by = R(V.Y(0)); if (cx < -60 || cx > 600) return;
  blit(c, CABART, cx + CABART.ox, by + CABART.oy);
  const on = sm(t, SCREEN_ON[0], SCREEN_ON[1]), x0 = cx - 19, y0 = by + CAB.top + 9;
  // status LED blinks slowly all the time (the computer is alive)
  const led = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 0.8); c.px(cx - 24, by + CAB.top + 36, led > 0.5 ? "#7CFF7A" : "#2A5A2A");
  if (on <= 0) return;
  const g = fade(c, on);
  // screen glow + scanlines
  for (let j = 0; j < 24; j++) for (let i = 0; i < 38; i++) { const X = x0 + i, Y = y0 + j; if (on > bayer(X, Y)) c.px(X, Y, j % 2 ? "#0E2A20" : "#123426"); }
  glow(c, cx, y0 + 12, 26, "#5AF0A0", 0.18 * on);
  const left = autoLeft(t), wk = walkK(t);
  g.text(TINY, "AUTO", x0 + 2, y0 + 2, "#7CFFB0");
  g.px(x0 + 34, y0 + 3, Math.sin(t * 12) > 0 ? "#7CFFB0" : "#1E5A3A");
  // digits (crossfade between consecutive seconds over 0.1 s) or WALK
  if (left !== null && wk < 1) {
    // first window: the screen lights on "computers" and races 0:05 → 0:00 into WALK; later: real seconds to the next WALK
    const first = t < WALK_ON[0][0], span = WALK_ON[0][0] - SCREEN_ON[0], shown = first ? (left / span) * 5.4 : left, fade01 = first ? 0.075 : 0.12;
    const s = Math.max(0, Math.ceil(shown - 1e-6)), frac = s - shown, prev = digits(s + 1), cur = digits(s), k = clamp01(frac / fade01);   // frac: 0 at the change
    const a = on * (1 - wk);
    const draw = (str, kk) => { const w = c.measure(MAIN, str), tx = x0 + 19 - (w >> 1); c.text(MAIN, str, tx, y0 + 10, "#B8FFD0", { colorAt: (X, Y) => (kk * a > bayer(X, Y) ? "#B8FFD0" : null) }); };
    if (k < 1 && s < 59) draw(prev, 1 - k); draw(cur, k);
    // the bar drains toward the next WALK (full = 12 s or more)
    const bw = R(34 * clamp01(first ? left / span : left / 12)); c.rect(x0 + 2, y0 + 20, 34, 2, "#123426"); if (bw > 0) fade(c, a).rect(x0 + 2, y0 + 20, bw, 2, "#5AF0A0");
  }
  if (wk > 0) { const w = c.measure(MAIN, "WALK"), tx = x0 + 19 - (w >> 1); c.text(MAIN, "WALK", tx, y0 + 10, "#FFFFFF", { colorAt: (X, Y) => (wk * on > bayer(X, Y) ? ((X + Y) & 1 ? "#FFFFFF" : "#C8FFE0") : null) }); }
}

// ---------------------------------------------------------------- the X-ray lens over the box
export const LENS_C = { x: -180, y: -172, r: 78 };          // world (screen (390, 468) at the corner)
export function lensState(t) {
  const open = ease(sm(t, LENS.open[0], LENS.open[1])), close = ease(sm(t, LENS.close[0], LENS.close[1]));
  return { k: open * (1 - close), in: t < LENS.close[0] };
}
export function drawLens(c, V, t) {
  const { k } = lensState(t); if (k <= 0.002) return;
  const B = boxScreen(V), ex = R(V.X(LENS_C.x)), ey = R(V.Y(LENS_C.y));
  // grows out of the box (centre moves from the box to its place, radius grows)
  const cx = R(B.cx + (ex - B.cx) * k), cy = R(B.cy + (ey - B.cy) * k), r = Math.max(2, R(LENS_C.r * k)), ca = sm(k, 0.55, 1);
  // callout: two dashed lines from the box's right corners to the lens rim
  if (k > 0.25) {
    const a = sm(k, 0.25, 0.7), g = fade(c, a);
    for (const [px, py, an] of [[B.x1 + 1, B.y0 + 2, Math.PI * 1.08], [B.x1 + 1, B.y1 - 2, Math.PI * 0.82]]) {
      const tx = cx + Math.cos(an) * r, ty = cy + Math.sin(an) * r, n = Math.ceil(Math.hypot(tx - px, ty - py));
      for (let i = 0; i <= n; i++) if ((i >> 1) % 2 === 0) { const X = R(px + (tx - px) * i / n), Y = R(py + (ty - py) * i / n); g.px(X, Y, "#BFF6FF"); g.px(X, Y + 1, "#2E6AA8"); }
    }
    // the box glows cyan where the lens looks
    for (let y = B.y0 - 1; y <= B.y1; y++) for (let x = B.x0 - 1; x <= B.x1; x++) if ((x === B.x0 - 1 || x === B.x1 || y === B.y0 - 1 || y === B.y1) && a > bayer(x, y)) c.px(x, y, "#7FE3F0");
  }
  // lens body: dark X-ray blueprint with a grid, contents dissolve in
  const r2 = r * r;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dd = (x - cx) ** 2 + (y - cy) ** 2; if (dd > r2) continue;
    const gx = ((x - cx) % 8 + 8) % 8 === 0 || ((y - cy) % 8 + 8) % 8 === 0;
    c.px(x, y, gx && ((x + y) & 1) ? "#16285A" : "#0A1636");
  }
  if (ca > 0) lensContents(c, cx, cy, r, t, ca);
  // rim: dark outline, metal ring with a highlight, inner bevel; a short handle down-right
  for (let y = cy - r - 6; y <= cy + r + 6; y++) for (let x = cx - r - 6; x <= cx + r + 6; x++) {
    const d = Math.hypot(x - cx, y - cy) - r; if (d < -1 || d > 5) continue;
    const ang = Math.atan2(y - cy, x - cx), hi = Math.cos(ang + 2.3);
    c.px(x, y, d < 0 ? "#7FE3F0" : d > 4 ? INK : d < 1.5 ? "#4A4A5E" : hi > 0.55 ? "#FFFFFF" : hi > 0 ? "#C8CAD8" : "#8A8CA0");
  }
  if (k > 0.6) {
    const a = sm(k, 0.6, 0.95), g = fade(c, a), h0 = [cx + R(r * 0.72) + 3, cy + R(r * 0.72) + 3];
    for (let i = 0; i < 26; i++) for (let j = -3; j <= 3; j++) { const X = h0[0] + i + (j > 0 ? 0 : 0), Y = h0[1] + i + j; if (X > 468) continue; g.px(X - j, Y, Math.abs(j) === 3 ? INK : j < 0 ? "#6A4A3A" : "#4A2E26"); }
    // X-RAY tag on the rim
    const tw = c.measure(TINY, "X-RAY") + 8, tx = cx - (tw >> 1), ty = cy - r - 10; g.rect(tx, ty, tw, 9, INK); g.rect(tx + 1, ty + 1, tw - 2, 7, "#0A1636"); g.text(TINY, "X-RAY", tx + 4, ty + 2, "#7FE3F0");
  }
}
/** Inside the lens: the box opened up — button → wire → plug pulled out of the cabinet cable's socket. Red ✕, OFF tag. */
function lensContents(c, cx, cy, r, t, a) {
  const g = fade(c, a), CY = "#7FE3F0", DIM = "#2F7FC0", WIRE = "#FF8A5A", WIRE2 = "#B8402E", NAVY = "#13306A";
  const inL = (x, y) => (x - cx) ** 2 + (y - cy) ** 2 < (r - 3) ** 2;
  const P = (x, y, col) => { if (inL(x, y)) g.px(x, y, col); };
  const seg = (x0, y0, x1, y1, w, col, col2) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let i = 0; i <= n; i++) { const X = R(x0 + (x1 - x0) * i / n), Y = R(y0 + (y1 - y0) * i / n); for (let k = 0; k < w; k++) P(X + (y0 === y1 ? 0 : k), Y + (y0 === y1 ? k : 0), k === w - 1 && col2 ? col2 : col); } };
  // the box's back plate (dashed outline) with the magnified button
  const bx = cx - 30, by = cy - 26, dash = (v) => ((v + R(t * 10)) & 3) < 2;
  for (let y = by - 26; y <= by + 26; y++) for (const x of [bx - 26, bx + 24]) if (dash(y)) P(x, y, DIM);
  for (let x = bx - 26; x <= bx + 24; x++) for (const y of [by - 26, by + 26]) if (dash(x)) P(x, y, DIM);
  for (let j = -19; j <= 19; j++) for (let i = -19; i <= 19; i++) { const d = Math.hypot(i, j); if (d <= 19 && d > 17.4) P(bx + i, by + j, CY); else if (d <= 12.5 && d > 11) P(bx + i, by + j, CY); else if (d < 11 && i + j < -7) P(bx + i, by + j, "#1E3E70"); else if (d < 17.4 && d > 12.5 && i + j > 14) P(bx + i, by + j, "#16305A"); }
  { const tw = c.measure(TINY, "BUTTON"); g.text(TINY, "BUTTON", R(bx - tw / 2), by - 32, CY); }
  // two contacts and the wire: right, then down to the plug (which comes out of the socket on "off")
  for (let i = 19; i < 24; i++) { P(bx + i, by - 4, CY); P(bx + i, by + 4, CY); }
  const u = ease(sm(t, LENS.unplug[0], LENS.unplug[1])), sx = cx + 30, sy = cy + 26;          // socket top
  const plug = [sx, R(sy - 8 - 20 * u)];                                                       // plug body centre (moves up)
  seg(bx + 24, by - 4, sx - 8, by - 4, 3, WIRE, WIRE2); seg(sx - 8, by - 4, sx - 1, by + 3, 3, WIRE, WIRE2);
  seg(sx - 1, by + 3, sx - 1, plug[1] - 7, 3, WIRE, WIRE2);
  // the plug: body + two prongs pointing down
  for (let j = -6; j <= 5; j++) for (let i = -7; i <= 7; i++) P(plug[0] + i, plug[1] + j, Math.abs(i) === 7 || j === -6 || j === 5 ? CY : i < -3 ? "#1E4486" : NAVY);
  for (const dx of [-3, 3]) for (let j = 6; j < 12; j++) { P(plug[0] + dx, plug[1] + j, "#E8F6FF"); P(plug[0] + dx + 1, plug[1] + j, "#9AB8D8"); }
  // the cabinet cable rising from the lens bottom into its socket (alive: pulses go on to the lights, not to the button)
  for (let y = sy + 7; y < cy + r; y++) for (let i = -3; i <= 3; i++) P(sx + i, y, Math.abs(i) === 3 ? "#3A4A6A" : i < 0 ? "#A8B8D4" : "#8A9AB8");
  for (let j = 0; j < 8; j++) for (let i = -8; i <= 8; i++) P(sx + i, sy + j, Math.abs(i) === 8 || j === 0 || j === 7 ? CY : NAVY);
  for (const dx of [-3, 3]) for (let j = 1; j < 4; j++) { P(sx + dx, sy + j, "#020814"); P(sx + dx + 1, sy + j, "#020814"); }
  for (let k = 0; k < 3; k++) { const span = cy + r - sy - 14, yy = R(cy + r - 5 - (((t * 46) + k * span / 3) % span)); for (let i = -1; i <= 1; i++) { P(sx + i, yy, "#D8FFE8"); P(sx + i, yy - 1, "#5AF0A0"); } }
  { const tw = c.measure(TINY, "TO CABINET"); g.text(TINY, "TO CABINET", R(sx - 12 - tw), cy + 50, "#5AF0A0"); for (let i = 0; i < 6; i++) P(sx - 10 + i, cy + 52, "#5AF0A0"); }
  // spark when the plug comes out
  const t0 = LENS.unplug[0] + 0.1, sp = Math.min(sm(t, t0, t0 + 0.06), 1 - sm(t, t0 + 0.12, t0 + 0.35));
  if (sp > 0) for (let i = 0; i < 10; i++) { const an = i * 0.628 + 0.2, rr = 4 + 12 * sm(t, t0, t0 + 0.3); const X = R(sx + Math.cos(an) * rr), Y = R(sy - 4 + Math.sin(an) * rr * 0.8); if (sp > bayer(X, Y)) { P(X, Y, "#FFFFFF"); P(X + 1, Y, "#FFE15A"); } }
  // the red ✕ in the gap between plug and socket
  const xk = sm(t, LENS.cross[0], LENS.cross[1]);
  if (xk > 0) { const mx = sx, my = sy - 8, L = R(7 * ease(xk)); for (let i = -L; i <= L; i++) for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { P(mx + i + ox, my + i + oy, i === -L || i === L ? "#B82838" : "#FF4A5A"); P(mx + i + ox, my - i + oy, "#FF4A5A"); } }
  // the OFF tag hanging from the wire, swinging gently
  const ta = sm(t, LENS.tag[0], LENS.tag[0] + 0.25);
  if (ta > 0) {
    const tt = t - LENS.tag[0], sw = Math.sin(tt * 4.2) * Math.exp(-tt * 0.8) * 0.4 + 0.04 * Math.sin(tt * 1.7), hx = bx + 30, hy = by - 2, len = 13;
    const ax = R(hx + Math.sin(sw) * len), ay = R(hy + Math.cos(sw) * len), gt = fade(c, ta * a);
    for (let i = 0; i <= len; i++) gt.px(R(hx + Math.sin(sw) * i), R(hy + Math.cos(sw) * i), "#E8E0D0");
    gt.rect(ax - 17, ay, 35, 20, INK); gt.rect(ax - 16, ay + 1, 33, 18, "#F4EEDC"); gt.rect(ax - 16, ay + 16, 33, 3, "#D8CCB4"); gt.rect(ax - 1, ay + 2, 3, 2, INK);
    gt.text(MAIN, "OFF", ax - 12, ay + 6, "#E0303E", { scale: 1 }); gt.text(MAIN, "OFF", ax - 11, ay + 6, "#E0303E", { scale: 1 });
  }
}
export { WALK_ON };
