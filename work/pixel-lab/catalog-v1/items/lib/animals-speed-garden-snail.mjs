// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/garden-snail.mjs (lines 10–81); changes: import path;
// the race-sticker number is drawn only from the given o.num (the film drew a fixed "1"), at one fixed text scale (the film switched
// scale at s 0.9: a one-frame jump).
import { blob, flat, ell, tube, bez, eye, blush, smile, fade, mix, clamp01, lerp, MAIN } from "./cute.mjs";
const R = Math.round, TAU = Math.PI * 2;
export const BODY = ["#2E2418", "#54442E", "#7C6A4C", "#A4916C", "#C6B48C", "#DED0AC", "#EFE6CC", "#FBF7EA"];
export const SHELL = ["#2A1206", "#542408", "#86400E", "#B26018", "#D68628", "#ECAA46", "#F7CC78", "#FFE8B4"];
const BAND = "#5A2A0A", OUT = "#24160C";
const EYE = ["#0A0610", "#1A1020", "#2A1A30", "#4A3040", "#7A5050", "#A07060", "#C09080", "#E0B8A0"];

/** A clipped view: pixels at screen y ≥ clipY are not drawn. */
function clipView(c, clipY) { if (clipY == null) return c; const o = Object.create(c); o.px = (x, y, col) => { if (y < clipY) c.px(x, y, col); }; return o; }

export function drawSnail(c0, x, y, o = {}) {
  const a = o.a ?? 1; if (a <= 0) return null;
  const c = clipView(c0, o.clip), s = o.s ?? 1, ph = o.crawl ?? 0, st = clamp01(o.strain ?? 0), sway = o.sway ?? 0;
  const surge = Math.sin(TAU * ph), surge2 = Math.sin(TAU * ph - 1.1);
  const sq = 1 - 0.05 * st - 0.025 * (0.5 + 0.5 * surge);                 // squash while straining / gathering
  const P = (dx, dy) => [x + dx * s, y + dy * s * sq];
  const opt = (ramp, extra = {}) => ({ ramp, a, outline: OUT, litOutline: null, ...extra });
  const g = fade(c, a);
  // foot: a long soft skirt along the ground, front end stretches with the surge; pointed tail behind the shell
  const fx = 3 * surge, bx = -2 * surge2;
  blob(c, [ell(...P(-26 + bx * 0.5, -9), 56 * s + fx * s * 0.5, 11.5 * s), tube([P(-58 + bx, -9), P(-80 + bx, -7), P(-96 + bx, -4)], 10 * s, 3 * s)], opt(BODY, { base: 3.6, gain: 1.6, thick: 7 * s }));
  // wet sheen line along the skirt
  for (let i = -70; i <= 20; i += 1) { const p = P(i + bx * 0.5, -15 + Math.pow((i + 25) / 50, 2) * 3); if ((i & 3) !== 0) g.px(R(p[0]), R(p[1]), BODY[7]); }
  // shell: big caramel disc with a logarithmic spiral band, sitting on the back of the foot
  const SC = P(-40 + bx * 0.3, -64), RS = 45 * s;
  blob(c, [ell(SC[0], SC[1], RS * 1.03, RS * 0.96, -0.12)], opt(SHELL, { base: 3.3, gain: 2.4, thick: 18 * s, litOutline: SHELL[6] }));
  { // spiral: r = R·e^(−bθ), 2.6 turns; dark band + light ridge beside it
    const turns = 2.6, b = Math.log(RS / (5 * s)) / (turns * TAU);
    for (let k = 0; k < 900; k++) {
      const th = (k / 900) * turns * TAU, r = RS * 0.93 * Math.exp(-b * th), ang = th + 2.4;
      const X = SC[0] + Math.cos(ang) * r * 1.03, Y = SC[1] + Math.sin(ang) * r * 0.96, w = Math.max(1, R(2.2 * s * (r / RS) + 0.6));
      for (let j = 0; j < w; j++) g.px(R(X + Math.cos(ang) * -j), R(Y + Math.sin(ang) * -j), BAND);
      const lx = X - Math.cos(ang) * (w + 1), ly = Y - Math.sin(ang) * (w + 1); if (r > 10 * s && (k & 1)) g.px(R(lx), R(ly), Math.sin(ang + 2.2) > 0.2 ? SHELL[7] : SHELL[5]);
    }
    // growth lines (short radial ticks) on the outer whorl
    for (let i = 0; i < 18; i++) { const ang = (i / 18) * TAU, p0 = [SC[0] + Math.cos(ang) * RS * 0.86, SC[1] + Math.sin(ang) * RS * 0.82], p1 = [SC[0] + Math.cos(ang) * RS * 0.97, SC[1] + Math.sin(ang) * RS * 0.93]; g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), SHELL[3]); }
    // the race sticker with the number
    const num = String(o.num ?? "1"), sx = SC[0] - 12 * s, sy = SC[1] - 20 * s, rr = Math.max(6, 10 * s);
    g.disc(R(sx), R(sy), R(rr), "#3A2A20"); g.disc(R(sx), R(sy), R(rr - 1), "#FFFDF4"); g.px(R(sx - rr * 0.5), R(sy - rr * 0.55), "#FFFFFF");
    if (o.num != null) { const sc = 1, tw = c.measure(MAIN, num, { scale: sc }); g.text(MAIN, num, R(sx - tw / 2) + 1, R(sy - 3.5 * sc), "#C8283A", { scale: sc }); }
  }
  // neck + head column, in front of the shell (leans with the surge)
  const lean = 2.5 * surge2 + 3 * st, hx = 10 + lean * 0.6;
  const head = [ell(...P(hx, -46), 31 * s, 34 * s), ell(...P(hx - 2, -20), 30 * s, 17 * s)];
  // eye stalks first (behind the head top), then the head
  const sw = (k) => sway * (k ? 1 : 0.8) + 2.2 * Math.sin(TAU * ph * 0.5 + k * 1.3);
  const stalk = (k) => { const b0 = P(hx - 9 + k * 22, -72), tip = P(hx - 16 + k * 36 + sw(k), -124 + k * 2 + st * 6), mid = [lerp(b0[0], tip[0], 0.5) - (k ? -3 : 3) * s, lerp(b0[1], tip[1], 0.5)]; return { pts: bez(b0, mid, tip, 8), tip }; };
  const S0 = stalk(0), S1 = stalk(1);
  blob(c, [tube(S0.pts, 5.2 * s, 3.6 * s), tube(S1.pts, 5.4 * s, 3.8 * s)], opt(BODY, { base: 3.8, gain: 1.2, thick: 3 * s }));
  blob(c, head, opt(BODY, { base: 3.9, gain: 1.9, thick: 16 * s }));
  // glossy highlights on the head (wet look)
  { const hp = P(hx - 16, -66); g.px(R(hp[0]), R(hp[1]), "#FFFFFF"); g.px(R(hp[0]) + 1, R(hp[1]), "#FFFFFF"); g.px(R(hp[0]), R(hp[1]) + 1, BODY[7]); g.px(R(hp[0]) - 1, R(hp[1]) + 3, BODY[7]); g.px(R(hp[0]) - 1, R(hp[1]) + 4, BODY[7]); }
  // eyes on the stalk tips
  const blink = clamp01(o.blink ?? 0), look = o.look ?? [0.15, 0.25];
  // effort: on each push the eyes squeeze shut into "> <" (dissolve), between pushes they peek open
  const sqz = clamp01(st * (0.55 + 0.45 * Math.sin(TAU * ph - 0.4)) * 1.25);
  const eyes2 = [[S0.tip, 12, 13.5, 1], [S1.tip, 13, 14.5, -1]];
  for (const [tp, rx, ry] of eyes2) eye(c, tp[0], tp[1], rx * s, { ry: ry * s, iris: EYE, pupil: "bead", look, blink, lid: BODY[4], a: a * (1 - sqz) });
  if (sqz > 0.02) for (const [tp, rx, ry, dir] of eyes2) {
    const q = fade(c, a * sqz); eye(c, tp[0], tp[1], rx * s, { ry: ry * s, iris: EYE, pupil: "bead", blink: 1, lid: BODY[5], a: a * sqz });
    const w = rx * s * 0.55, h = ry * s * 0.42;
    for (let k = 0; k <= 1; k += 0.05) { const X = tp[0] + dir * (-w + k * w * 1.6), Y1 = tp[1] - h * (1 - k), Y2 = tp[1] + h * (1 - k); for (const Y of [Y1, Y2]) { q.px(R(X), R(Y), OUT); q.px(R(X) + 1, R(Y), OUT); } }
  }
  // cheeks + mouth
  blush(c, ...P(hx - 17, -44), 7 * s, 3.4 * s, "#F27A90", a); blush(c, ...P(hx + 19, -44), 7 * s, 3.4 * s, "#F27A90", a);
  const [mx, my] = P(hx + 1, -44);
  if (st > 0.35) { const q = fade(c, a * clamp01((st - 0.35) / 0.3)), w = R(4 * s); for (let i = -w; i <= w; i++) q.px(mx + i, R(my + 1 + Math.sin(i * 1.5) * 0.9), "#3A1A14"); }
  if (st < 0.65) smile(c, mx, my, Math.max(2, R(4 * s)), { open: o.open ?? 0.3, a: a * (1 - clamp01((st - 0.35) / 0.3)), col: "#3A1A14" });
  // sweat drop (effort)
  const swt = clamp01(o.sweat ?? 0);
  if (swt > 0.02) { const k = ((o.t ?? 0) * 0.9) % 1, q = fade(c, a * swt * (1 - Math.max(0, k - 0.7) * 3.3)), [dx, dy] = P(hx + 33, -60 + k * 16); q.poly([[dx, dy - 6 * s], [dx + 3.4 * s, dy + 1], [dx, dy + 4 * s], [dx - 3.4 * s, dy + 1]], "#BFEFFF"); q.px(R(dx - 1), R(dy), "#FFFFFF"); q.line(R(dx + 3 * s), R(dy + 1), R(dx), R(dy + 4 * s), "#5AB4D0"); }
  return { eyes: [S0.tip, S1.tip], shell: SC, head: P(hx, -44), front: P(28, -6), tail: P(-96 + bx, -4) };
}
