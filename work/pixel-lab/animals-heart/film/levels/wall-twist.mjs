// The twist (LV.twist, camera resting on the shrew's wall) as screen-space panels at y 200–600 over the dimmed scene:
// "billion … life" → a counter rolling up to ≈ 1,000,000,000 · HEARTBEATS PER LIFE · "fast mouse" → a round mouse
// portrait (its heart racing with pulse("mouse")), 2 YEARS · "slow elephant" → an elephant portrait (pulse("elephant")),
// 60 YEARS · "both" → both heartbeat bars fill to the same length, ≈ 1 BILLION · "we" → those panels dissolve by
// LV.loop start + 0.6 while the hero's portrait (pulse("human")) shows 3 BILLION as three full bars; it is gone before
// "biggest", so the dive into the sea is clean. All transitions are dissolves / slides, never one-frame changes.
import { EV, LV, pulse } from "../timeline.mjs";
import { blob, ell, tube, bez, eye, blush, mouthW, smile, RAMP, sm, ease, lerp, fade, mix, bayer, blinkAt, clamp01, C, MAIN } from "../cute.mjs";
import { drawHero } from "../hero.mjs";
import { heartIcon, approx, clipped, spriteCache, R } from "./snow-kit.mjs";
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
// the series' shared mouse (barn level) and elephant (savanna level) so the portraits show the animals the viewer met;
// if those files are missing or change their API, the small faces below are used instead
let MA = null, EA = null;
try { MA = await import("./mouse-art.mjs"); } catch { MA = null; }
try { EA = await import("./elephant-art.mjs"); } catch { EA = null; }
const OFF = new Canvas(200, 200, "#010203");
/** Draw shared art into an offscreen canvas centred at (100, 100), then copy it through g (clipped / faded). */
function viaOffscreen(g, x, y, draw) {
  const d = OFF.d; for (let i = 0; i < d.length; i += 3) { d[i] = 1; d[i + 1] = 2; d[i + 2] = 3; }
  draw(OFF);
  for (let yy = 0; yy < 200; yy++) for (let xx = 0; xx < 200; xx++) { const i = (yy * 200 + xx) * 3; if (d[i] === 1 && d[i + 1] === 2 && d[i + 2] === 3) continue; g.px(x - 100 + xx, y - 100 + yy, [d[i], d[i + 1], d[i + 2]]); }
}
function sharedMouse(g, x, y, t) {
  if (MA?.drawMouse) try { viaOffscreen(g, x, y, (o) => MA.drawMouse(o, 100, 100 + R((MA.MOUSE_HEAD_Y ?? 100) * 0.72) + 4, { s: 0.72, t, look: [Math.sin(t * 5) > 0.3 ? 0.6 : Math.sin(t * 5) < -0.5 ? -0.5 : 0, 0.1], blink: blinkAt(t, 2.2, 0.3) })); return; } catch { /* fall back */ }
  mouseFace(g, x, y, t);
}
function sharedElephant(g, x, y, t) {
  if (EA?.drawElephant) try { viaOffscreen(g, x, y, (o) => EA.drawElephant(o, 100, 92, t, { s: 0.42, blink: blinkAt(t, 3.6, 1.1), look: [0, 0.15], flap: Math.sin(t * 1.4) * 0.06, sway: 0.6, rim: "#F0A070" })); return; } catch { /* fall back */ }
  elephantFace(g, x, y, t);
}

const sprites = spriteCache(6);
/** Every timed motion of the twist panels as [t0, t1] (s); the drawing code reads these, levels/snow-motions.mjs too. */
export const TWIST_T = {
  dimIn: [EV.twist - 0.15, EV.twist + 0.55], dimOut: [LV.loop[0], LV.loop[0] + 0.75], panelsOut: [LV.loop[0], LV.loop[0] + 0.45],
  counterIn: [EV.billion1 - 1.05, EV.billion1 - 0.75], count: [EV.billion1 - 0.95, EV.billion1 + 0.3], approx: [EV.billion1 + 0.25, EV.billion1 + 0.5],
  perLife: [EV.billion1 + 0.3, EV.billion1 + 0.65], life: [EV.life - 0.1, EV.life + 0.4],
  mouse: [EV.fastMouse - 0.15, EV.fastMouse + 0.25], mouseLabel: [EV.twoYears - 0.2, EV.twoYears + 0.1],
  eleph: [EV.slowElephant - 0.15, EV.slowElephant + 0.25], elephLabel: [EV.sixty - 0.2, EV.sixty + 0.1],
  fill: [EV.both - 0.05, EV.both + 0.55], equals: [EV.both + 0.3, EV.both + 0.6], billion: [EV.close - 0.15, EV.close + 0.2],
  hero: [EV.we + 0.18, EV.we + 0.55], heroOut: [EV.biggest - 0.45, EV.biggest - 0.1], three: [EV.threeBillion - 0.15, EV.threeBillion + 0.15],
  threeBars: [EV.threeBillion - 0.25, EV.threeBillion], threeFill: [0, 1, 2].map((i) => [EV.threeBillion - 0.1 + i * 0.18, EV.threeBillion - 0.1 + i * 0.18 + 0.4]),
};
const TT = TWIST_T, win01 = (t, [a, b]) => clamp01((t - a) / (b - a));
const MOUSE = ["#1E1A24", "#38323E", "#544C5C", "#72687A", "#928898", "#B2A8B8", "#D0C8D6", "#EEE8F2"];
const PINK = ["#3A1420", "#6A2234", "#9A3A4C", "#C85A6A", "#E07A88", "#F09AA6", "#F8BCC4", "#FFE0E4"];
const TUSK = ["#3A3020", "#6A5A40", "#9A8A68", "#C4B490", "#DED2B0", "#EEE6CC", "#F8F4E4", "#FFFFFF"];
const OUT = "#0B0812";

/** Dim the whole frame toward deep violet by k (smooth, exact; the caption shade and captions come after). */
function dim(c, k) {
  if (k <= 0) return; const d = c.d, tr = 0x14, tg = 0x0C, tb = 0x24;
  for (let i = 0; i < d.length; i += 3) { d[i] += (tr - d[i]) * k; d[i + 1] += (tg - d[i + 1]) * k; d[i + 2] += (tb - d[i + 2]) * k; }
}
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function outlined(c, s, x, y, col, scale, a = 1) { const g = fade(c, a); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(MAIN, s, x + dx, y + dy, OUT, { scale }); g.text(MAIN, s, x, y, col, { scale }); }

export function twistHud(c, V, t) {
  if (t < EV.twist - 0.3 || t > EV.biggest + 0.2) return;
  const out1 = 1 - sm(t, ...TT.panelsOut);
  dim(c, 0.58 * sm(t, ...TT.dimIn) * (1 - sm(t, ...TT.dimOut)));
  counter(c, t, out1);
  const mA = sm(t, ...TT.mouse) * out1, eA = sm(t, ...TT.eleph) * out1;
  const fill = ease(win01(t, TT.fill));
  if (mA > 0) { portrait(c, 150, 372 + R((1 - mA) * 10), 54, mA, "#F2C46A", (g, x, y) => sharedMouse(g, x, y, t), pulse("mouse", t), t); label(c, "2 YEARS", 150, 436, sm(t, ...TT.mouseLabel) * out1); bar(c, 72, 470, 156, 1, fill, mA, "fast", t); }
  if (eA > 0) { portrait(c, 390, 372 + R((1 - eA) * 10), 54, eA, "#F0A060", (g, x, y) => sharedElephant(g, x, y, t), pulse("elephant", t), t); label(c, "60 YEARS", 390, 436, sm(t, ...TT.elephLabel) * out1); bar(c, 312, 470, 156, 1, fill, eA, "slow", t); }
  // "both get close to a billion": an equals sign between the bars and the shared label
  const bA = sm(t, ...TT.equals) * out1;
  if (bA > 0) { const g = fade(c, bA); g.rect(256, 470, 28, 4, OUT); g.rect(256, 480, 28, 4, OUT); g.rect(257, 471, 26, 2, C.IV); g.rect(257, 481, 26, 2, C.IV); }
  const lA = sm(t, ...TT.billion) * out1;
  if (lA > 0) { const s = 3, w = 6 * s + 8 + c.measure(MAIN, "1 BILLION", { scale: s }), x = R(270 - w / 2), y = 502; const g = fade(c, lA); approx(g, x + 1, y + 1, s, OUT); approx(g, x, y, s, C.Y); outlined(c, "1 BILLION", x + 6 * s + 8, y, C.Y, s, lA); }
  // "we get about three billion": the hero, three full bars
  const hA = sm(t, ...TT.hero) * (1 - sm(t, ...TT.heroOut));
  if (hA > 0) {
    portrait(c, 270, 360 + R((1 - hA) * 10), 62, hA, "#8AC8F0", (g, x, y) => drawHero(g, x, y + 120, { scale: 0.92, look: [0, 0.2], blink: blinkAt(t, 3.4, 0.2), mouth: "smile" }), pulse("human", t), t);
    const k3 = sm(t, ...TT.three);
    label(c, "3 BILLION", 270, 432, k3 * hA);
    for (let i = 0; i < 3; i++) bar(c, 192, 466 + i * 16, 156, 1, ease(win01(t, TT.threeFill[i])), hA * sm(t, ...TT.threeBars), "human", t, 10);
  }
}

function counter(c, t, out) {
  const a = sm(t, ...TT.counterIn) * out; if (a <= 0) return;
  const k = win01(t, TT.count), val = k < 0.03 ? 0 : Math.pow(10, 9 * ease(k)), done = sm(t, ...TT.approx);
  const x = 40, y = 204 + R((1 - a) * 8), w = 460, h = 82, g = fade(c, a);
  g.rrect(x + 3, y + 4, w, h, "#06040C", 3); g.rrect(x, y, w, h, "#F4CA50", 3); g.rrect(x + 2, y + 2, w - 4, h - 4, "#2A1A3E", 3); g.rect(x + 4, y + 3, w - 8, 1, "#6E4FB0");
  // little heart that beats with each tick of the counter
  heartIcon(c, x + 28, y + 26, 10 + 3 * Math.abs(Math.sin(t * 18)) * (1 - done), "#E83A5C", a);
  const s = 4, num = fmt(Math.min(1e9, val)), nw = c.measure(MAIN, num, { scale: s }), ax = 6 * s + 10, total = nw + ax * done, nx = R(270 + 14 - total / 2) + R(ax * done);
  if (done > 0) { const gg = fade(c, a * done); approx(gg, nx - ax + 1, y + 13, s, OUT); approx(gg, nx - ax, y + 12, s, "#FFE27A"); }
  for (const [dx, dy] of [[1, 1], [2, 2]]) g.text(MAIN, num, nx + dx, y + 12 + dy, OUT, { scale: s });
  g.text(MAIN, num, nx, y + 12, done > 0.5 ? "#FFE27A" : C.IV, { scale: s });
  const l2 = sm(t, ...TT.perLife) * a, lifeK = Math.sin(Math.PI * win01(t, TT.life));
  if (l2 > 0) { const txt = "HEARTBEATS PER LIFE", s2 = 2, tw = c.measure(MAIN, txt, { scale: s2 }), tx = R(270 - tw / 2), gg = fade(c, l2); gg.text(MAIN, txt, tx + 1, y + 56, OUT, { scale: s2 }); gg.text(MAIN, txt, tx, y + 55, mix(C.L, "#FFFFFF", lifeK * 0.8), { scale: s2 }); }
}
function label(c, s, cx, y, a) { if (a <= 0) return; const sc = 3, w = c.measure(MAIN, s, { scale: sc }); outlined(c, s, R(cx - w / 2), y + R((1 - a) * 6), C.IV, sc, a); }
/** Round portrait: shadow, gold ring, coloured backdrop with soft rays, the face clipped inside, a beating heart badge. */
function portrait(c, cx, cy, r, a, bg, draw, p, t) {
  if (a <= 0) return; const g = fade(c, a);
  for (let y = -r - 5; y <= r + 5; y++) for (let x = -r - 5; x <= r + 5; x++) { const d = Math.hypot(x, y); if (d <= r + 4 && Math.hypot(x - 3, y - 4) > r + 4) continue; if (Math.hypot(x - 3, y - 4) <= r + 4 && d > r + 4) g.px(cx + x, cy + y, "#06040C"); }
  for (let y = -r - 4; y <= r + 4; y++) for (let x = -r - 4; x <= r + 4; x++) {
    const d = Math.hypot(x, y); if (d > r + 4.2) continue;
    if (d > r + 3) g.px(cx + x, cy + y, OUT); else if (d > r) g.px(cx + x, cy + y, d > r + 1.5 ? "#C8962A" : "#FFE27A");
    else { const ang = Math.atan2(y, x) + t * 0.3, ray = Math.sin(ang * 8) > 0.55, v = (y + r) / (2 * r); let col = mix(mix(bg, "#FFFFFF", 0.25), mix(bg, "#000000", 0.12), v); if (ray && d > r * 0.35) col = mix(col, "#FFFFFF", 0.14); g.px(cx + x, cy + y, col); }
  }
  const inner = clipped(c, (x, y) => Math.hypot(x - cx, y - cy) <= r - 0.5 && (a >= 1 || a > bayer(x, y)));
  draw(inner, cx, cy);
  heartIcon(c, cx + R(r * 0.72), cy - R(r * 0.72), 9 + 4 * p, mix("#E83A5C", "#FF8AA6", p), a);
}
/** Heartbeat bar: a segmented gauge filled to k; "fast" fills with a racing shimmer, "slow" with a calm sweep. */
function bar(c, x, y, w, _, k, a, style, t, h = 12) {
  if (a <= 0) return; const g = fade(c, a), n = 10, sw = (w - 4) / n;
  g.rrect(x, y, w, h, OUT, 2); g.rect(x + 1, y + 1, w - 2, h - 2, "#2A1A3E");
  const fw = (w - 4) * k;
  for (let i = 0; i < n; i++) {
    const sx = x + 2 + R(i * sw), ex = x + 2 + R((i + 1) * sw) - 1, vis = clamp01((fw - i * sw) / sw); if (vis <= 0) continue;
    const cw = Math.max(1, R((ex - sx) * vis)), shimmer = style === "fast" ? Math.sin(t * 40 + i * 2) > 0.3 : style === "slow" ? Math.sin(t * 2 - i * 0.6) > 0.7 : Math.sin(t * 8 - i) > 0.6;
    const col = style === "fast" ? "#F4CA50" : style === "slow" ? "#F59A3A" : "#7FE3F0";
    g.rect(sx, y + 2, cw, h - 4, col); g.rect(sx, y + 2, cw, 1, mix(col, "#FFFFFF", 0.5)); if (shimmer) g.rect(sx, y + 3, cw, 1, "#FFFFFF");
  }
}

// ---------------------------------------------------------------- the two little portraits (cute faces, front view)
function mouseFace(g, x, y, t) {
  const s = sprites("mouse", 140, 150, 70, 70, (q, ox, oy) => {
    blob(q, [ell(ox, oy + 62, 44, 26)], { ramp: MOUSE, thick: 14, base: 3.2, outline: OUT });
    for (const sd of [-1, 1]) { blob(q, [ell(ox + sd * 32, oy - 22, 21, 20)], { ramp: MOUSE, thick: 8, base: 3.4, outline: OUT, litOutline: "#FFF0D0" }); blob(q, [ell(ox + sd * 32, oy - 20, 13, 12)], { ramp: PINK, thick: 5, base: 4.2, outline: MOUSE[2], rimLit: 0, rimShade: 0.3 }); }
    blob(q, [ell(ox, oy + 6, 34, 29), ell(ox - 18, oy + 18, 18, 14), ell(ox + 18, oy + 18, 18, 14)], { ramp: MOUSE, thick: 18, base: 3.5, gain: 2.0, outline: OUT, litOutline: "#FFF0D0" });
    for (const sd of [-1, 1]) { q.line(ox + sd * 12, oy + 20, ox + sd * 38, oy + 15, "#F4F0F8"); q.line(ox + sd * 12, oy + 23, ox + sd * 38, oy + 26, "#F4F0F8"); }
  });
  s.blitPx(g, x, y);
  // quick darting look (it lives fast)
  const lk = [Math.sin(t * 5) > 0.3 ? 0.6 : Math.sin(t * 5) < -0.5 ? -0.5 : 0, 0.1];
  for (const sd of [-1, 1]) eye(g, x + sd * 13, y + 2, 7, { ry: 7.8, iris: RAMP.ink, pupil: "bead", look: lk, blink: blinkAt(t, 2.2, 0.3), lid: MOUSE[4], outline: OUT });
  blush(g, x - 22, y + 14, 6, 3, "#F27A9A"); blush(g, x + 22, y + 14, 6, 3, "#F27A9A");
  g.rect(x - 3, y + 15, 7, 4, "#E06A88"); g.rect(x - 2, y + 14, 5, 1, "#F8A8BC"); g.px(x - 2, y + 15, "#FFD0DC");
  mouthW(g, x, y + 21, OUT, 3);
}
function elephantFace(g, x, y, t) {
  const GRAY = RAMP.gray;
  const s = sprites("eleph", 150, 150, 75, 70, (q, ox, oy) => {
    blob(q, [ell(ox, oy + 66, 46, 22)], { ramp: GRAY, thick: 14, base: 3.2, outline: OUT });
    for (const sd of [-1, 1]) { blob(q, [ell(ox + sd * 40, oy - 2, 25, 31)], { ramp: GRAY, thick: 10, base: 3.3, outline: OUT, litOutline: "#FFE0B0" }); blob(q, [ell(ox + sd * 41, oy, 15, 21)], { ramp: PINK, thick: 6, base: 3.2, outline: GRAY[2], rimLit: 0, rimShade: 0.3 }); }
    blob(q, [ell(ox, oy - 2, 34, 31)], { ramp: GRAY, thick: 18, base: 3.6, gain: 2.0, outline: OUT, litOutline: "#FFE0B0" });
    for (const sd of [-1, 1]) blob(q, [tube(bez([ox + sd * 11, oy + 18], [ox + sd * 15, oy + 30], [ox + sd * 10, oy + 38], 6), 3.5, 2)], { ramp: TUSK, thick: 3, base: 4.8, outline: OUT });
  });
  s.blitPx(g, x, y);
  // the trunk sways slowly (it lives slow)
  const sw = Math.sin(t * 1.2) * 5, tp = bez([x, y + 10], [x + sw * 0.4, y + 34], [x + sw, y + 56], 10);
  blob(g, [tube(tp, 10, 6)], { ramp: GRAY, thick: 6, base: 3.4, gain: 1.4, outline: OUT, litOutline: "#FFE0B0" });
  for (let i = 2; i < tp.length - 1; i += 2) { const w = R(lerp(8, 4, i / 10)); g.line(R(tp[i][0] - w), R(tp[i][1]), R(tp[i][0] + w), R(tp[i][1]), GRAY[2]); }
  for (const sd of [-1, 1]) eye(g, x + sd * 15, y - 4, 6.5, { ry: 7, iris: RAMP.amber, pupil: "round", look: [0, 0.2], blink: blinkAt(t, 3.6, 1.1), lid: GRAY[4], outline: OUT });
  blush(g, x - 24, y + 10, 6, 3, "#F27A9A"); blush(g, x + 24, y + 10, 6, 3, "#F27A9A");
}
