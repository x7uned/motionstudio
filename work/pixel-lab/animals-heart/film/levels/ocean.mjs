// LV1 · blue whale at depth (RANGE BIOME.ocean = 0..540, surface y 0; REST.whale cx 270, cy 900 → screen = (wx, wy − 420)).
// Deep blue water, no floor in view. The series' cute blue whale (levels/whale-art.mjs, shared with the weight film) glides
// toward the camera, calm big eyes, its heart a faint glow inside the chest. Its ONE heartbeat (BEATS, on "two beats a
// minute") flashes the heart, swells the stretchy aorta above it and sends a ring of light out. "Shrew's heart … twenty-five
// times a second": a round portrait bubble with a tiny shrew whose heart flickers (pulse("shrew")). "Deep dive … once every
// thirty seconds": a ring timer around the heart fills in real time since that beat (honestly only part-full). "Huge,
// stretchy main artery … between beats": the aorta, still swollen from the beat, squeezes back slowly and pushes a glow of
// blood along. At the end of LV.whale the camera rises to the surface (ice floes) and the snowy coast (snow.mjs, x ≥ 540).
// LOOP: this column is drawn again at the wrapped position (V.wrap) and the last frame equals the first: every ambient
// motion is periodic over END (integer cycles), the beat's effects have died out by then, and no labels show at 0 or END.
import { BIOME, EV, LV, END, WORLD_W, pulse, BEATS } from "../timeline.mjs";
import { drawWater, tod } from "../world.mjs";
import { sign, pickup, panel, blush, eye, blob, ell, tube, bez, sm, ease, win, rnd, fade, mix, bayer, MAIN, C, RAMP } from "../cute.mjs";
import { drawWhale, drawHeart, heartLocal } from "./whale-art.mjs";

export const RANGE = BIOME.ocean;
const R = Math.round, [X0, X1] = RANGE;
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const WX = 270, WY = 777, LEN = 0.56, SC = 0.94;            // whale head centre (world) → screen (270, 357) at REST: the head sits on the deep glow
const TB = BEATS.find((b) => b.who === "whale").t;          // the one whale beat
const [HLX, HLY] = heartLocal(LEN, SC);

// ---------------------------------------------------------------- loop clock
const loopT = (t) => ((t % END) + END) % END;                 // t = END is exactly t = 0 (no float drift at the seam)
const osc = (t, n, ph = 0) => Math.sin((2 * Math.PI * n * t) / END + ph);
const cycl = (t, n, ph = 0) => { const v = (n * t) / END + ph; return v - Math.floor(v); };
function blinkP(t, n, ph = 0) { const every = END / n, p = ((((t + ph) % every) + every) % every), d = 0.22; return p < d ? Math.sin((Math.PI * p) / d) : 0; }

// ---------------------------------------------------------------- water: a fixed day look near the whale (identical at 0 and END),
// the camera's own time of day near the surface during the final dive (so it meets the sunset sea under the wall).
// waterLook() exports the exact view and clock handed to drawWater; the snow coast and the wall cliff draw their water strips
// with it (snow-kit.mjs), so any change here must keep `node dev/snow-waterseam.mjs` at 0 mismatched pixels.
const cyc7 = (T) => ((T % 7) + 7) % 7;
function waterView(V) {
  const deep = sm(V.cy, 480, 760);
  let T = 0;
  if (V.wrap) { const Tr = cyc7(tod(V.cx + WORLD_W)); T = (Tr > 6.5 ? 0 : Tr) * (1 - deep); }
  return { ...V, tod: T };
}
const wt = (t) => (t * 2 * Math.PI * 4) / END / 0.35;       // drawWater's shaft sway sin(t·0.35) → exactly 4 cycles per film
/** The exact view (with its tod) and time this column hands to drawWater, for neighbours that continue its water. */
export function waterLook(Vo, t) { return { V: waterView(Vo), t: wt(loopT(t)) }; }

// ---------------------------------------------------------------- timing
const SHREW_IN = EV.shrew0 - 0.05, SHREW_OUT = EV.speed + 0.35;
const RING_IN = EV.dive - 0.05, RING_OUT = LV.whale[1] - 0.25;
const ART_IN = EV.artery - 0.15;
const RIPPLE = 1.8, RECOIL = 14, FLOW_TURNS = 10, BLOBS = 4, PICK = [EV.two, 1.6];
const TAGS = { second: [EV.twentyFive - 0.1, SHREW_OUT], beat30: [EV.once - 0.2, ART_IN - 0.1], artery: [ART_IN + 0.1, RING_OUT + 0.1] };
/** Timing shared with levels/ocean-motions.mjs (sound design): the picture reads the same constants. */
export const TIMING = { TB, SHREW_IN, SHREW_OUT, RING_IN, RING_OUT, ART_IN, RIPPLE, RECOIL, FLOW_TURNS, BLOBS, PICK, TAGS, POP_IN: 0.35, POP_OUT: 0.45, RING_FADE: 0.45, ART_FADE: 0.45 };
/** Aorta swell after the beat: fast fill, slow elastic recoil (decays to nothing long before the loop ends). */
const swell = (t) => { const d = t - TB; return d <= 0 ? 0 : (1 - Math.exp(-d / 0.09)) * Math.exp(-d / RECOIL); };

// ---------------------------------------------------------------- whale pose (periodic over END)
function pose(V, t) {
  const x = R(V.X(WX) + osc(t, 3, 0.4) * 4), y = R(V.Y(WY) + osc(t, 26) * 2.6 + osc(t, 7, 1.1) * 1.5);
  const glance = win(t, EV.shrew0 + 0.25, SHREW_OUT - 0.3, 0.3, 0.35), down = win(t, EV.dive + 0.2, EV.once + 0.3, 0.3, 0.4);
  const look = [0.55 * glance, -0.35 * glance + 0.55 * down];
  return { x, y, look, blink: blinkP(t, 17, 1.6), flip: osc(t, 17) * 0.55 + osc(t, 5, 0.7) * 0.25 };
}

// ---------------------------------------------------------------- layers
export function fill(c, V, t) {
  t = loopT(t);
  if (V.x1 < X0 || V.x0 > X1) return;
  const W = waterLook(V, t); drawWater(c, W.V, W.t, X0, X1, 0);
}

export function back(c, V, t) {
  t = loopT(t);
  if (V.x1 < X0 || V.x0 > X1) return;
  // ice floes on the surface near the coast (seen while the camera rises), bobbing
  const sy = V.Y(0); if (sy > -20 && sy < c.h + 10) for (const [fx, fw, ph] of [[372, 22, 0], [418, 14, 1.7], [456, 30, 3.1], [492, 12, 4.4]]) {
    const x = R(V.X(fx)), bob = R(osc(t, 30, ph) * 1.2); if (x < -40 || x > 580) continue;
    for (let i = -fw / 2; i <= fw / 2; i++) { const top = R(sy - 3 + bob - (Math.abs(i) < fw / 2 - 3 ? 1 : 0)); c.px(x + i, top, "#FFFFFF"); c.px(x + i, top + 1, "#E0EEFF"); c.px(x + i, top + 2, "#B8D0EC"); c.px(x + i, top + 3, mix("#B8D0EC", "#3A8ABA", 0.5)); c.px(x + i, top + 4, mix("#9AC0E0", "#2A6E9A", 0.6)); }
  }
}

export function actors(c, V, t) {
  t = loopT(t);
  if (V.x1 < X0 - 200 || V.x0 > X1 + 200) return;
  const P = pose(V, t); if (P.y < -500 || P.y > 1500) return;
  // drifting marine snow and a few small bubbles (periodic)
  for (let i = 0; i < 46; i++) {
    const wx = X0 + rnd(i * 5 + 1) * 540 + osc(t, 2 + (i % 3), i) * 6, wy = 420 + ((rnd(i * 5 + 2) * 960 + cycl(t, 3 + (i % 4)) * 960 * (i % 2 ? 1 : -1)) % 960 + 960) % 960;
    const x = R(V.X(wx)), y = R(V.Y(wy)); if (x < 0 || x >= 540 || y < 0 || y >= 960) continue; c.px(x, y, i % 5 ? "#9AC8E8" : "#D8F0FF");
  }
  for (let i = 0; i < 9; i++) { const ph = cycl(t, 6 + i, rnd(i)), wx = 40 + rnd(i * 7) * 460 + osc(t, 9 + i, i) * 3, wy = 1400 - ph * 1100, x = R(V.X(wx)), y = R(V.Y(wy)), r = i % 3 === 0 ? 2 : 1; if (y < 0 || y > 960) continue; c.ring(x, y, r, "#B8E8FF"); c.px(x - (r > 1 ? 1 : 0), y - r, "#FFFFFF"); }
  // beat: a ring of light spreading from the heart
  const hx = P.x + HLX, hy = P.y + HLY, bu = t - TB;
  if (bu > 0 && bu < RIPPLE) { const r = 22 + ease(bu / RIPPLE) * 230, a = (1 - sm(bu, 0.3, RIPPLE)) * 0.9, g = fade(c, a); for (let k = 0; k < 2; k++) g.ering(hx, hy, r - k * 3, r * 0.92 - k * 3, k ? "#FF9AA8" : "#FFD8DC"); }
  const p = pulse("whale", t), sw = swell(t);
  drawWhale(c, P.x, P.y, { s: SC, len: LEN, look: P.look, blink: P.blink, lid: 0.12, flip: P.flip, haze: 0.13, hazeCol: "#1A4A7A" });
  // x-ray of the chest: the aorta arching over the heart, then the heart itself (faint at rest, flashing on the beat)
  aorta(c, hx, hy, t, sw, p);
  const hr = 14 * (1 + 0.18 * p), focus = win(t, RING_IN, RING_OUT, 0.4, 0.5);
  drawHeart(c, hx, hy, hr, { a: 0.55 + 0.45 * Math.max(p, focus), glow: 0.15 + 1.0 * p + 0.25 * focus, bright: p });
}

/** The main artery (aorta) seen through the chest: up out of the heart, over in an arch (small arteries to the head branch
 *  off its top) and down behind the heart along the body. Swells on the beat, recoils slowly, pushing a glow of blood along. */
const ARCH = (hx, hy) => [[hx - 2, hy - 8], [hx - 3, hy - 22], [hx + 2, hy - 32], [hx + 11, hy - 35], [hx + 18, hy - 28], [hx + 19, hy - 14], [hx + 17, hy + 8], [hx + 13, hy + 44], [hx + 8, hy + 84], [hx + 4, hy + 120]];
const BRANCH = (hx, hy) => [[[hx + 1, hy - 31], [hx - 2, hy - 43]], [[hx + 7, hy - 34], [hx + 7, hy - 46]], [[hx + 13, hy - 34], [hx + 16, hy - 44]]];
const ART_RAMP = ["#3A0614", "#6A0C22", "#9E1430", "#C8344A", "#E45A6A", "#F48A94", "#FFB8BE", "#FFE4E6"];
function aorta(c, hx, hy, t, sw, p) {
  const show = win(t, ART_IN, RING_OUT + 0.15, TIMING.ART_FADE, 0.5), base = 0.22 + 0.78 * Math.max(show, p * 0.7);
  const path = smoothPath(ARCH(hx, hy)), r = 3.4 + 3.6 * sw + 0.8 * p, g = fade(c, base);
  for (const [a0, a1] of BRANCH(hx, hy)) blob(g, [tube([a0, a1], 2 + 0.8 * sw, 1.4)], { ramp: ART_RAMP, thick: 2, base: 3.4, gain: 1.2, outline: "#4A0A1C" });
  blob(g, [tube(path, r, Math.max(1.6, r * 0.45))], { ramp: ART_RAMP, thick: 3, base: 3.3 + p, gain: 1.6, outline: "#4A0A1C" });
  // glow of blood pushed along by the recoil (moves while the artery is still swollen)
  const flow = 1 - Math.exp(-Math.max(0, t - TB) / RECOIL), L = path.length - 1;
  for (let k = 0; k < BLOBS; k++) {
    const u = (((flow * FLOW_TURNS + k / BLOBS) % 1) + 1) % 1, i = Math.floor(u * L), f = u * L - i, q = [path[i][0] + (path[Math.min(L, i + 1)][0] - path[i][0]) * f, path[i][1] + (path[Math.min(L, i + 1)][1] - path[i][1]) * f];
    const a = Math.min(1, sw * 3.2) * base * Math.sin(Math.PI * u); if (a <= 0.02) continue;
    const gg = fade(c, a); for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (xx * xx + yy * yy <= 5) gg.px(R(q[0] + xx), R(q[1] + yy), xx * xx + yy * yy < 2 ? "#FFF0F2" : "#FF9AA8");
  }
}
function smoothPath(pts) { const out = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; for (let k = 0; k < 6; k++) out.push([a[0] + ((b[0] - a[0]) * k) / 6, a[1] + ((b[1] - a[1]) * k) / 6]); } out.push(pts[pts.length - 1]); return out; }

// ---------------------------------------------------------------- the shrew portrait bubble
function shrewBubble(c, x, y, t) {
  const A = win(t, SHREW_IN, SHREW_OUT, 0.3, TIMING.POP_OUT); if (A <= 0) return;
  const pop = ease(clamp01((t - SHREW_IN) / TIMING.POP_IN)), r = R(46 * (0.6 + 0.4 * pop) + Math.sin(clamp01((t - SHREW_IN) / 0.5) * Math.PI) * 3), g = fade(c, A);
  // bubble: pale glass with a rim and a highlight, warm Mediterranean light inside
  for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) { const d = Math.hypot(X, Y); if (d > r) continue; const col = d > r - 2 ? "#E8FCFF" : d > r - 4 ? "#7AC8E0" : mix("#FFE6B0", "#F2A870", (Y + r) / (2 * r)); if (d <= r - 4 && bayer(x + X, y + Y) < 0.2 && Y > r * 0.3) continue; g.px(x + X, y + Y, col); }
  // tiny cute shrew: long pink-tipped snout, bead eyes, round ears, blush
  const s = r / 46, FUR = ["#2A1A14", "#3E2A20", "#56402E", "#6E5440", "#8A6C54", "#A88A6E", "#C8AA8C", "#E4CCB0"], sx = x, sy = y + 6 * s;
  blob(g, [ell(sx - 18 * s, sy - 20 * s, 8 * s, 8 * s), ell(sx + 18 * s, sy - 20 * s, 8 * s, 8 * s)], { ramp: FUR, thick: 4, a: A });
  blob(g, [ell(sx, sy - 4 * s, 22 * s, 18 * s), ell(sx, sy + 10 * s, 15 * s, 12 * s)], { ramp: FUR, thick: 10, base: 3.4, a: A });
  blob(g, [tube([[sx, sy + 4 * s], [sx + 1 * s, sy + 18 * s], [sx + 3 * s, sy + 32 * s]], 7 * s, 3 * s)], { ramp: FUR, thick: 3, base: 4.4, a: A });
  for (const [dx, dy, col] of [[2, 33, "#F07090"], [3, 33, "#F07090"], [4, 33, "#F07090"], [3, 34, "#C04060"], [2, 32, "#F8A0B8"]]) g.px(R(sx + dx * s), R(sy + dy * s), col);
  for (const sd of [-1, 1]) { eye(c, sx + sd * 10 * s, sy - 6 * s, 4.4 * s, { pupil: "bead", iris: RAMP.ink, a: A }); blush(c, sx + sd * 15 * s, sy + 5 * s, 4 * s, 2, "#F27A9A", A); for (let k = 0; k < 2; k++) g.line(R(sx + 2 * s + sd * 5 * s), R(sy + 26 * s + k * 3), R(sx + 2 * s + sd * 20 * s), R(sy + 22 * s + k * 6), "#F4E8DA"); }
  // its heart flickers 25 times a second
  const ps = pulse("shrew", t), hr = 7 + 3 * ps;
  drawHeart(c, x + r * 0.62, y + r * 0.5, hr, { a: A, glow: 0.3 + ps * 0.9, bright: ps });
}

// ---------------------------------------------------------------- hud
export function hud(c, V, t) {
  t = loopT(t);
  if (V.x1 < X0 - 200 || V.x0 > X1 + 200) return;
  const P = pose(V, t), hx = P.x + HLX, hy = P.y + HLY;
  // level sign: a bubble sign drifting gently on the left (periodic bob)
  sign(c, R(V.X(62)), R(V.Y(732) + osc(t, 11, 0.5) * 3), "LV 1", "bubble", 1, t);
  pickup(c, R(V.X(WX)), R(V.Y(668)), "2 BPM", (t - PICK[0]) / PICK[1]);
  // shrew portrait + its rate
  const bx = R(V.X(436)), by = R(V.Y(690));
  shrewBubble(c, bx, by, t);
  label(c, ["25 / SECOND"], bx, by + 56, win(t, TAGS.second[0], TAGS.second[1], 0.3, 0.45));
  // ring timer around the heart: real time since the beat, out of 30 s
  const ra = win(t, RING_IN, RING_OUT, TIMING.RING_FADE, 0.5);
  if (ra > 0) {
    const prog = clamp01((t - TB) / 30), g = fade(c, ra), RR = 30;
    for (let i = 0; i < 180; i++) { const ang = -Math.PI / 2 + (i / 180) * 2 * Math.PI, on = i / 180 < prog; for (const dr of [-1, 0, 1, 2, 3]) { const X = R(hx + Math.cos(ang) * (RR + dr)), Y = R(hy + Math.sin(ang) * (RR + dr)); if (!on && dr !== 1 && dr !== 0) continue; g.px(X, Y, on ? (dr === -1 || dr === 3 ? "#7A4A08" : dr === 1 ? "#FFE070" : "#F4CA50") : (dr === 0 ? "#2A3A5A" : "#6A8CB0")); } }
    for (let i = 0; i < 12; i++) { const ang = -Math.PI / 2 + (i / 12) * 2 * Math.PI; g.px(R(hx + Math.cos(ang) * (RR + 5)), R(hy + Math.sin(ang) * (RR + 5)), i === 0 ? "#FFFFFF" : "#B8D8F0"); }
    const ae = -Math.PI / 2 + prog * 2 * Math.PI; for (let k = 0; k < 3; k++) g.px(R(hx + Math.cos(ae) * (RR + 1)) + (k - 1), R(hy + Math.sin(ae) * (RR + 1)), "#FFFFFF");
    label(c, ["1 BEAT / 30 S"], hx, hy + RR + 9, ra * win(t, TAGS.beat30[0], TAGS.beat30[1], 0.3, 0.3));
  }
  // the artery explained
  const aa = win(t, TAGS.artery[0], TAGS.artery[1], 0.35, 0.45);
  if (aa > 0) {
    const tx = 14, ty = hy - 70, w = c.measure(MAIN, "STRETCHY", { scale: 2 }) + 20;
    panel(c, tx, ty, w, 46, aa, C.Y); fade(c, aa).text(MAIN, "STRETCHY", tx + 10, ty + 7, C.Y, { scale: 2 }); fade(c, aa).text(MAIN, "ARTERY", tx + 10, ty + 27, C.IV, { scale: 2 });
    const g = fade(c, aa), ex = hx - 1, ey = hy - 30, sx = tx + w, sy = ty + 23, n = R(Math.hypot(ex - sx, ey - sy)); for (let k = 0; k < n; k++) { const u = k / n, x = R(sx + (ex - sx) * u), y = R(sy + (ey - sy) * u); if (k % 3 !== 2) g.px(x, y, "#FDFEED"); }
  }
}
/** Centered tag (panel + scale-2 text) at (cx, y). */
function label(c, lines, cx, y, a) {
  if (a <= 0) return; const w = Math.max(...lines.map((s) => c.measure(MAIN, s, { scale: 2 }))) + 20, h = lines.length * 20 + 6, x = R(cx - w / 2);
  panel(c, x, R(y), w, h, a, C.Y); lines.forEach((l, i) => fade(c, a).text(MAIN, l, x + 10, R(y) + 6 + i * 20, i ? C.IV : C.Y, { scale: 2 }));
}
