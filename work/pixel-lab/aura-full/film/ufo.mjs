// «Infinite aura» · builder C — aliens want his autograph. On "aliens" three flying saucers swoop in from the top left
// (rim lights chasing, glass domes with little pilots); the big one stops above-left of him and switches on a tractor
// beam down to the stairs; a little green alien materialises in the beam and floats down holding up a sign
// "AUTOGRAPH?" on a stick and waving a pen at him. Runs on world time τ = X.T (the time stop freezes the whole scene,
// it slides back as he walks on); dissolves when space takes over.
import { part, ell, rot, oval, tube, bez1, anchor, slide, fade, mix, bayer, sm, lerp, clamp01, rnd, ease, easeOut, backOut, R, PI, GW } from "./C-kit.mjs";
import { MAIN } from "../../../../renderer/pixel/raster.mjs";
import { EV } from "./timeline.mjs";

const OUT = "#0E0C1C";
const HULL = ["#141626", "#262A40", "#3C4260", "#565E80", "#7880A0", "#9CA4C0", "#C2C8DC", "#E8ECF6"];
const DOME = ["#0E2A3A", "#164660", "#206A88", "#3092B0", "#4CB8D2", "#7AD6E8", "#B0ECF6", "#E2FAFF"];
const ALIEN = ["#0E2A0C", "#1A4A14", "#2A6E1E", "#3E9628", "#5ABC36", "#7CD84C", "#A8EE74", "#D6FAA8"];
const LIGHTS = ["#FF4A5A", "#FFD24A", "#5AF0FF", "#8CFF6A"];

// ---------------------------------------------------------------- timing / paths (screen offsets from the camera centre at zoom 1.6)
const IN = EV.aliens - 0.2;
const SAUCERS = [
  { t0: IN, dur: 0.62, from: [-330, -360], via: [-260, -10], to: [-140, -136], rx: 42, main: true },
  { t0: IN + 0.12, dur: 0.85, from: [-360, -300], via: [-40, -330], to: [-200, -258], rx: 23 },
  { t0: IN + 0.25, dur: 1.0, from: [-330, -300], via: [-20, -390], to: [228, -272], rx: 17 },
];
const BEAM0 = IN + 0.52, BEAM1 = BEAM0 + 0.2;                       // the tractor beam switches on (grows down)
const ALIEN0 = BEAM1 - 0.1, ALIEN1 = ALIEN0 + 0.68;            // materialise at the hatch → float down
const BEAM_Y = 165;                                                   // beam bottom (screen offset), at the stairs left of him

function saucerPos(X, s, T) {
  const u = (T - s.t0) / s.dur; if (u <= 0) return null;
  const k = easeOut(u), p = u < 1 ? bez1(s.from, s.via, s.to, k) : s.to, i = SAUCERS.indexOf(s);
  const hov = u < 1 ? [0, 0] : [3 * Math.sin(T * 1.3 + i), 4 * Math.sin(T * 1.9 + i * 2)];
  const [x, y] = anchor(X, p[0] + hov[0], p[1] + hov[1]);
  const vx = u < 1 ? (bez1(s.from, s.via, s.to, easeOut(u + 0.02))[0] - p[0]) : 0;
  return { x, y, tilt: clamp01(Math.abs(vx) / 12) * 0.28 * Math.sign(vx) * (u < 1 ? 1 : 0) + 0.05 * Math.sin(T * 2.2 + i), u };
}

function drawSaucer(g, x, y, rx, tilt, T, i, pilot) {
  const ry = rx * 0.27, P = (u) => { const r = rot(u, tilt); return [x + r[0], y + r[1]]; };
  // glass dome with a little pilot inside
  const dc = P([0, -ry * 0.6]), dr = rx * 0.46;
  part(g, [ell(dc[0], dc[1], dr, dr * 0.85, tilt)], { ramp: DOME, outline: OUT, base: 3.6, gain: 1.4, thick: dr * 0.6, rimLit: 1.2 });
  if (pilot) { const ph = P([0, -ry * 0.75]); oval(g, ph[0], ph[1] + 2, dr * 0.42, dr * 0.4, ALIEN[5]); oval(g, ph[0] - dr * 0.17, ph[1] + 1.5, 1.6, 2.2, "#0B0812"); oval(g, ph[0] + dr * 0.17, ph[1] + 1.5, 1.6, 2.2, "#0B0812"); }
  // glass glint
  const gl = P([-dr * 0.4, -ry * 0.6 - dr * 0.45]); g.rect(R(gl[0]), R(gl[1]), 2, 1, "#FFFFFF"); g.px(R(gl[0]) - 1, R(gl[1]) + 1, "#FFFFFF");
  // hull: wide disc + darker lower band
  part(g, [ell(x, y, rx, ry, tilt, 40)], { ramp: HULL, outline: OUT, base: 3.6, gain: 1.6, thick: ry, rimLit: 1.3, rimShade: 0.6, slope: 1.6 });
  const lb = P([0, ry * 0.55]); part(g, [ell(lb[0], lb[1], rx * 0.55, ry * 0.55, tilt)], { ramp: HULL, outline: OUT, base: 2.2, gain: 0.8, thick: 3 });
  // rim lights chasing round
  const n = Math.max(5, Math.round(rx / 4));
  for (let k = 0; k < n; k++) { const a = PI * (0.1 + 0.8 * (k / (n - 1))), lp = P([Math.cos(PI - a) * rx * 0.82, Math.sin(a) * ry * 0.25 + 0.5]), on = ((Math.floor(T * 9) + k) % 3) === 0; g.rect(R(lp[0]), R(lp[1]), 2, 2, on ? "#FFFFFF" : LIGHTS[(k + i) % 4]); if (on) { g.px(R(lp[0]) - 1, R(lp[1]), LIGHTS[(k + i) % 4]); g.px(R(lp[0]) + 2, R(lp[1]) + 1, LIGHTS[(k + i) % 4]); } }
  // glowing hatch underneath
  const h = P([0, ry * 0.95]); oval(g, h[0], h[1], rx * 0.22, 2, "#EFFFB0");
  return { hatch: h };
}

function drawBeam(g, top, bottomY, T, a) {
  if (a <= 0 || bottomY <= top[1]) return;
  const f = fade(g, a), w0 = 13, w1 = 44, L = Math.max(1, bottomY - top[1]);
  for (let Y = R(top[1]); Y <= R(bottomY); Y++) {
    const v = (Y - top[1]) / L, hw = lerp(w0, w1, v), x0 = R(top[0] - hw), x1 = R(top[0] + hw);
    const band = 0.5 + 0.5 * Math.sin((Y - T * 120) * 0.22), tail = Y > bottomY - 12 ? (bottomY - Y) / 12 : 1;
    for (let X = x0; X <= x1; X++) {
      const e = Math.abs(X + 0.5 - top[0]) / hw, edge = e > 0.93;
      const lvl = (edge ? 0.9 : 0.22 + 0.3 * (1 - e * e) + 0.28 * band) * tail;
      if (lvl <= bayer(X, Y)) continue;
      f.px(X, Y, edge ? "#F4FFD0" : mix(g.get(X, Y), band > 0.75 && e < 0.7 ? "#FBFFE6" : "#E4FFA8", 0.45 + 0.25 * (1 - e)));
    }
  }
  // sparkles rising in the beam and a glow pool where it lands
  for (let i = 0; i < 14; i++) { const per = 1.2, ph = rnd(i * 5) * per, k = ((T + ph) % per) / per, y = bottomY - k * L * 0.9, hw = lerp(w0, w1, (y - top[1]) / L), x = top[0] + (rnd(i * 9 + Math.floor((T + ph) / per)) - 0.5) * 1.6 * hw; if (1 - k > bayer(R(x), R(y))) { f.px(R(x), R(y), "#FFFFFF"); f.px(R(x), R(y) - 1, "#F4FFD0"); } }
  f.dither(R(top[0] - w1 - 12), R(bottomY - 7), R(2 * w1 + 24), 12, (X, Y) => { const d = Math.hypot((X - top[0]) / (w1 + 12), (Y - bottomY) / 6); return d < 1 ? 0.75 * (1 - d) : 0; }, "#F2FFC8");
}

/** The little alien (scale S): big head, almond eyes, antennae; sign on a stick in the left hand, pen waving in the right. */
function drawAlien(g, x, y, T, a, wave, S = 1.7) {
  if (a <= 0) return null;
  const f = fade(g, a), bob = 2 * Math.sin(T * 3.1), Q = (dx, dy) => [x + dx * S, y + dy * S];
  y += bob;
  for (const lx of [-3, 3]) part(f, [tube([Q(lx, 6), Q(lx * 1.4 + 1.5 * Math.sin(T * 4 + lx), 15)], 2 * S, 1.6 * S)], { ramp: ALIEN, outline: OUT, base: 3, gain: 0.8, thick: 3 });
  part(f, [ell(x, y, 6.5 * S, 8.5 * S)], { ramp: ALIEN, outline: OUT, base: 3.4, gain: 1.4, thick: 7 });
  const hand = Q(-12, -18 + wave * 2);
  part(f, [tube([Q(-5, -4), Q(-11, -9), hand], 2.1 * S, 1.8 * S)], { ramp: ALIEN, outline: OUT, base: 3.2, gain: 0.8, thick: 3 });
  const pa = Math.sin(T * 9) * 0.55, hand2 = Q(15 + 2 * Math.cos(pa), -8 + 4 * Math.sin(pa));
  part(f, [tube([Q(5, -4), Q(10, -5), hand2], 2.1 * S, 1.8 * S)], { ramp: ALIEN, outline: OUT, base: 3.2, gain: 0.8, thick: 3 });
  // pen (blue, white tip) pointing at him, sparkling
  const pd = [Math.cos(-0.7 + pa * 0.6), Math.sin(-0.7 + pa * 0.6)], pt = [hand2[0] + pd[0] * 11 * S, hand2[1] + pd[1] * 11 * S];
  for (let j = -1; j <= 1; j++) f.line(R(hand2[0]) + j, R(hand2[1]), R(pt[0]) + j, R(pt[1]), j < 0 ? "#142A6A" : j > 0 ? "#5A8AFF" : "#2A4AC8");
  f.rect(R(pt[0]) - 1, R(pt[1]) - 1, 3, 3, "#FFFFFF");
  const sp = (T * 2.5) % 1; if (sp < 0.55) { const sx = R(pt[0] + 6), sy = R(pt[1] - 6), r2 = sp < 0.25 ? 2 : 1; f.px(sx, sy, "#FFFFFF"); for (let k = 1; k <= r2; k++) { f.px(sx - k, sy, "#FFE04A"); f.px(sx + k, sy, "#FFE04A"); f.px(sx, sy - k, "#FFE04A"); f.px(sx, sy + k, "#FFE04A"); } }
  // head: wide cranium, narrow chin
  const hc = Q(0, -16), head = [];
  for (let i = 0; i < 36; i++) { const t2 = (2 * PI * i) / 36, cx2 = Math.cos(t2), sy2 = Math.sin(t2); head.push([hc[0] + cx2 * (11 - (sy2 > 0 ? 4.5 * sy2 : 0)) * S, hc[1] + sy2 * (sy2 > 0 ? 10 : 9.5) * S]); }
  part(f, [head], { ramp: ALIEN, outline: OUT, base: 3.5, gain: 1.6, thick: 11 });
  for (const s of [-1, 1]) { const b = [hc[0] + s * 4 * S, hc[1] - 8 * S], tp = [hc[0] + s * (8 + Math.sin(T * 5 + s)) * S, hc[1] - 17 * S]; f.line(R(b[0]), R(b[1]), R(tp[0]), R(tp[1]), ALIEN[2]); f.line(R(b[0]) + 1, R(b[1]), R(tp[0]) + 1, R(tp[1]), ALIEN[3]); oval(f, tp[0], tp[1], 2.4 * S, 2.4 * S, (Math.floor(T * 4) + s) % 2 ? "#FFF6A0" : "#C8FF6A", OUT); }
  for (const s of [-1, 1]) {
    const ex = hc[0] + s * 4.6 * S, ey = hc[1] + 1.5 * S;
    for (let Y = R(ey - 4 * S); Y <= R(ey + 4 * S); Y++) for (let X = R(ex - 4 * S); X <= R(ex + 4 * S); X++) { const u = (X + 0.5 - ex) / S, v = (Y + 0.5 - ey) / S, ur = u * Math.cos(s * 0.5) + v * Math.sin(s * 0.5), vr = -u * Math.sin(s * 0.5) + v * Math.cos(s * 0.5), d = (ur / 3.8) ** 2 + (vr / 2.6) ** 2; if (d <= 1) f.px(X, Y, d > 0.72 ? "#0B0812" : vr < -0.8 ? "#2A2448" : "#0B0812"); }
    f.rect(R(ex - s * 1.4 * S) - 1, R(ey - 1.2 * S), 2, 2, "#FFFFFF"); f.px(R(ex + s * 1.2 * S), R(ey + 0.8 * S), "#B8B0FF");
    for (let k = 0; k < 3; k++) f.px(R(ex + s * (1.5 + k) * S * 0.6), R(ey + 3.8 * S), "#F28AA8");
  }
  // hopeful little "o" mouth
  oval(f, hc[0], hc[1] + 6.4 * S, 1.6, 1.3, "#3A0A1A", OUT);
  return { hand };
}

/** "AUTOGRAPH?" sign on a stick held at `hand`. */
function drawSign(g, hand, a) {
  if (a <= 0) return;
  const f = fade(g, a), txt = "AUTOGRAPH?", sc = 2, tw = g.measure(MAIN, txt, { scale: sc }), w = tw + 10, h = 24;
  const cx = R(hand[0] + 8), x0 = Math.max(36, Math.min(cx - (w >> 1), 196 - w)), y0 = R(hand[1] - 36);
  f.rect(R(hand[0]), y0 + h - 2, 2, R(hand[1] - y0 - h + 4), "#8A5A2C"); f.rect(R(hand[0]) + 1, y0 + h - 2, 1, R(hand[1] - y0 - h + 4), "#5A3618");
  f.rrect(x0 - 1, y0 - 1, w + 2, h + 2, OUT, 2); f.rrect(x0, y0, w, h, "#FFF6DA", 2); f.rect(x0 + 1, y0 + h - 4, w - 2, 3, "#E8D6A8");
  f.rect(x0 + 2, y0 + 1, w - 4, 1, "#FFFFFF");
  f.text(MAIN, txt, x0 + 5, y0 + 5, "#E8A0A8", { scale: sc }); f.text(MAIN, txt, x0 + 5, y0 + 4, "#C8102E", { scale: sc });
}

export function near(c, X) {
  const T = X.T, vis = 1 - X.space; if (T < IN || vis <= 0) return;
  const g = fade(c, vis);
  const st = SAUCERS.map((s) => ({ s, p: saucerPos(X, s, T) }));
  // far, small saucers first
  for (let i = 2; i >= 1; i--) { const { s, p } = st[i]; if (p) drawSaucer(g, p.x, p.y, s.rx, p.tilt, T, i, false); }
  const m = st[0].p; if (!m) return;
  const beamK = sm(T, BEAM0, BEAM1), [, by] = anchor(X, 0, BEAM_Y);
  // beam is drawn under the saucer (it comes out of the hatch)
  const hatch = [m.x, m.y + st[0].s.rx * 0.27 * 0.95];
  if (beamK > 0) drawBeam(g, hatch, lerp(hatch[1], by, easeOut(beamK)), T, Math.min(1, beamK * 3));
  // the alien floats down in the beam
  const af = sm(T, ALIEN0, ALIEN0 + 0.35), dk = ease((T - ALIEN0) / (ALIEN1 - ALIEN0));
  if (af > 0) {
    const ax = hatch[0] - 2, ay = lerp(hatch[1] + 44, hatch[1] + 168, dk), wave = Math.sin(T * 6.5);
    const al = drawAlien(g, R(ax), R(ay), T, af, wave);
    if (al) drawSign(g, [R(al.hand[0] + 2 * wave), al.hand[1]], sm(T, ALIEN0 + 0.1, ALIEN0 + 0.4));
  }
  drawSaucer(g, m.x, m.y, st[0].s.rx, m.tilt, T, 0, true);
}

export const MOTIONS = [
  { t0: IN, t1: IN + 0.9, kind: "ufo", level: 0.7, note: "three flying saucers swoop in from the top left (wobbly ufo whirr)" },
  { t0: BEAM0, t1: BEAM1, kind: "beam", level: 0.6, note: "tractor beam switches on and reaches down" },
  { t0: ALIEN0, t1: ALIEN1, kind: "blip", level: 0.45, note: "a little alien materialises in the beam and floats down with its sign" },
  { t0: EV.autograph, t1: EV.autograph + 0.3, kind: "blip", level: 0.4, note: "it waves the AUTOGRAPH? sign and the pen (pen sparkle)" },
];
