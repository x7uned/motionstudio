// EXPLAIN · the sepia 1954 flashback inset (screen space, top of the frame, x 40–500, y 100–330, during COMET).
// An old film strip (sprocket holes, two frames, grain, drifting scratches, sepia vignette): frame 1 shows a 1950s jet
// airliner silhouette (long thin body, small square-ish windows, engines buried in the wing roots — an illustration,
// no livery); on "two" the film advances one frame and a second airliner flies into frame 2; on "broke apart" a small
// crack flashes at a window corner and each plane separates into two pieces that drift apart and fade — no fire, no people,
// no debris. Tags "1954" and "COMET" sit on the strip's lower corners. The inset dissolves in and out.
import { EV, COMET } from "../timeline.mjs";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../../renderer/pixel/raster.mjs";
import { R, clamp01, sm, ease, lerp, win, rnd, put, rgb } from "./explain-geo.mjs";

export const INSET = { x: 40, y: 100, w: 460, h: 230 };
const BAND = 16, FW = 226, FH = INSET.h - 2 * BAND, GAP = 8, ADV = (FW + GAP) / 2;      // film geometry (inset-local)
export const IN = [COMET[0], COMET[0] + 0.4], OUTT = [COMET[1] - 0.42, COMET[1]];
export const ADVANCE = [EV.two - 0.12, EV.two + 0.42];                                        // the film advances on "two"
export const FLY1 = [COMET[0] + 0.05, EV.y1954 + 0.95], FLY2 = [EV.two - 0.05, EV.two + 0.95];   // the planes fly in
export const BREAK1 = EV.broke - 0.04, BREAK2 = EV.broke + 0.26;                              // "broke apart" (two separate events)
export const TAGS = { year: [EV.y1954 - 0.08, COMET[1] - 0.15], comet: [EV.comets - 0.08, COMET[1] - 0.15] };

// ---------------------------------------------------------------- sepia palette
const S = { o: "#2A1C10", d: "#4A3420", m: "#8C6E4C", l: "#C8AE84", hl: "#F0E4C4", win: "#3A2818", sky0: "#A88A62", sky1: "#E6D2A8", cl: "#F4E8CC", cl2: "#CDB48C", film: "#1C130C", hole: "#E8DCC0" };

// ---------------------------------------------------------------- the airliner sprite (nose right), baked once
const SW = 178, SH = 50, KEY = "#FF00FF";
const SPR = (() => {
  const c = new Canvas(SW, SH, KEY);
  const P = (pts, col) => c.poly(pts.map(([x, y]) => [x, y]), col);
  P([[40, 20], [17, 4], [9, 4], [5, 22]], S.l);                                   // fin (swept)
  P([[9, 6], [16, 6], [18, 8], [10, 8]], S.hl);
  P([[14, 22], [30, 19.5], [146, 19], [156, 19.6], [163, 21], [168, 23.5], [171, 26], [171.5, 28], [170, 30.5], [166, 32.5], [158, 34], [60, 34], [40, 32.5], [22, 28.5], [10, 25]], S.l);  // long slim fuselage
  for (let y = 19; y < 35; y++) for (let x = 0; x < SW; x++) { const p = c.get(x, y); if (p[0] === 255 && p[2] === 255 && p[1] === 0) continue; if (y <= 21) c.px(x, y, S.hl); else if (y >= 31 + (bayer(x, y) > 0.5 ? 1 : 0)) c.px(x, y, S.m); }
  P([[30, 25], [6, 26], [1, 30], [17, 29]], S.m);                                 // tailplane
  P([[118, 30.5], [80, 40.5], [64, 41.5], [56, 40.5], [82, 32.5]], S.m);          // swept wing, seen a little from below
  P([[115, 31.2], [82, 39.4], [70, 40], [96, 32]], S.l);
  for (let x = 64; x < 80; x++) c.px(x, 41, S.d);
  c.ellipse(118, 31, 4, 2, S.d); c.rect(115, 30, 4, 1, S.o); c.px(121, 30, S.hl); c.px(122, 31, S.hl);   // intakes buried in the wing root
  c.ellipse(82, 33, 3, 1, S.d); c.px(79, 33, S.o); c.px(85, 32, S.l);            // jet pipes at the root trailing edge
  P([[154, 20.4], [161, 21.4], [164.8, 23.8], [157, 23.8]], S.win);              // windscreen
  c.px(158, 21, S.hl); c.px(159, 21, S.hl);
  for (let x = 48; x <= 144; x += 8) { c.rect(x, 23, 3, 3, S.win); c.px(x, 23, S.d); }   // small square-ish windows
  // outline
  const img = [], isK = (x, y) => { if (x < 0 || y < 0 || x >= SW || y >= SH) return true; const p = c.get(x, y); return p[0] === 255 && p[1] === 0 && p[2] === 255; };
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    if (!isK(x, y)) { img.push(c.get(x, y)); continue; }
    img.push(!isK(x - 1, y) || !isK(x + 1, y) || !isK(x, y - 1) || !isK(x, y + 1) ? rgb(S.o) : null);
  }
  return img;
})();
const PIV = { x: 90, y: 27 };                       // the sprite's anchor (drawn at the plane's position)
const CRACK_AT = { x: 123, y: 23 };                 // top-right corner of the window at x 120
const splitX = (y) => 122 + [0, 1, 2, 1, 0, -1, 0, 1, 2, 1, 0, -1, -1, 0][((y % 14) + 14) % 14];

/** Draw the airliner (or its two pieces after the break) into canvas o at (x, y), clipped to rect. */
function airliner(o, x, y, t, br, clip) {
  const since = t - br, u = clamp01((since - 0.18) / 1.3), d = 1 - (1 - u) * (1 - u), fadeA = 1 - sm(since, 0.8, 1.5);
  // jet trails behind the pipes, growing on "jet" (gone before the break)
  const tr = sm(t, EV.jet - 0.1, EV.jet + 0.5) * (1 - sm(since, -0.3, 0.1));
  if (tr > 0) { const ex = x + 46 - PIV.x, ey = y + 35 - PIV.y, L = 120 * tr; for (let k = 0; k < L; k++) { const fa = tr * (1 - k / 120) * 0.95, yy = ey + R(Math.sin((k + t * 40) * 0.12) * 0.7); for (const dy of [0, 1, 2]) if ((dy === 1 ? fa : fa * 0.5) > bayer(ex - k, yy + dy)) o.px(ex - k, yy + dy, dy === 1 ? "#FFFAEC" : dy === 2 ? S.m : S.cl); } }
  const parts = since < 0.18 ? [{ sel: () => true, dx: 0, dy: 0, ang: 0, piv: PIV, a: 1 }]
    : [{ sel: (sx, sy) => sx >= splitX(sy), dx: 6 * d - 26 * d * d, dy: 14 * d, ang: 0.2 * d, piv: { x: 123, y: 27 }, a: fadeA },
       { sel: (sx, sy) => sx < splitX(sy), dx: -12 * d - 26 * d * d, dy: 8 * d, ang: -0.09 * d, piv: { x: 100, y: 28 }, a: fadeA }];
  for (const p of parts) {
    if (p.a <= 0) continue;
    const ca = Math.cos(p.ang), sa = Math.sin(p.ang), ox = x + (p.piv.x - PIV.x) + p.dx, oy = y + (p.piv.y - PIV.y) + p.dy;
    const x0 = Math.max(clip[0], R(ox - 140)), x1 = Math.min(clip[2], R(ox + 140)), y0 = Math.max(clip[1], R(oy - 70)), y1 = Math.min(clip[3], R(oy + 70));
    for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
      const dx = X + 0.5 - ox, dy = Y + 0.5 - oy, sx = Math.floor(p.piv.x + dx * ca + dy * sa), sy = Math.floor(p.piv.y - dx * sa + dy * ca);
      if (sx < 0 || sy < 0 || sx >= SW || sy >= SH || !p.sel(sx, sy)) continue;
      const col = SPR[sy * SW + sx]; if (!col) continue;
      if (p.a < 1 && p.a <= bayer(X, Y)) continue;
      o.px(X, Y, col);
    }
  }
  // the crack: a bright flash at the window corner, a thin dark line running round the body before it parts
  if (since > -0.05 && since < 0.6) {
    const k = sm(since, -0.05, 0.08) * (1 - sm(since, 0.22, 0.6)), cx = x + CRACK_AT.x - PIV.x, cy = y + CRACK_AT.y - PIV.y, L = R(3 + 9 * sm(since, -0.05, 0.15));
    const g = fade(o, k);
    for (let Y = cy - L; Y <= cy + L; Y++) for (let X = cx - L; X <= cx + L; X++) { const d = Math.hypot(X - cx, Y - cy) / L; if (d < 1 && (1 - d) * 0.9 > bayer(X, Y)) g.px(X, Y, d < 0.35 ? "#FFFBEE" : S.hl); }
    for (let q = -L; q <= L; q++) { const col = Math.abs(q) > L - 2 ? S.l : "#FFFBEE"; g.px(cx + q, cy, col); g.px(cx, cy + q, col); if (Math.abs(q) < L * 0.6) { g.px(cx + q, cy + q, S.hl); g.px(cx + q, cy - q, S.hl); } }
    const run = sm(since, 0, 0.18), y1 = R(cy + 11 * run); for (let yy = cy; yy <= y1; yy++) fade(o, 1 - sm(since, 0.25, 0.5)).px(x + splitX(yy - y + PIV.y) - PIV.x, yy, S.o);
  }
}

// ---------------------------------------------------------------- one film frame: sky, cloud deck, clouds, plane
const SKY = [0, 1, 2, 3, 4, 5, 6].map((q) => mix(S.sky0, S.sky1, q / 6));
function cloud(o, x, y, w, clip) {
  const blobs = [[0, 0, 0.5], [0.3, -0.25, 0.38], [-0.3, 0.05, 0.35], [0.55, 0.08, 0.3]];
  for (let pass = 0; pass < 2; pass++) for (const [bx, by, r] of blobs) {
    const cx = x + bx * w, cy = y + by * w * 0.5, rx = r * w, ry = r * w * 0.45;
    for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) {
      if (X < clip[0] || X >= clip[2] || Y < clip[1] || Y >= clip[3]) continue;
      const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (d > 1) continue;
      o.px(X, Y, pass === 0 ? S.cl2 : (Y - cy) / ry < 0.15 + 0.2 * bayer(X, Y) ? S.cl : null);
    }
  }
}
function filmFrame(o, fx, n, t) {
  const clip = [Math.max(0, fx), BAND, Math.min(INSET.w, fx + FW), BAND + FH];
  if (clip[2] <= clip[0]) return;
  // sky (sepia gradient, banded + dithered) with the cloud deck far below
  for (let Y = clip[1]; Y < clip[3]; Y++) { const v = (Y - BAND) / FH, s = v * 6, lo = Math.floor(s), f = s - lo; for (let X = clip[0]; X < clip[2]; X++) o.px(X, Y, SKY[Math.min(6, f > bayer(X, Y) ? lo + 1 : lo)]); }
  const deckY = BAND + FH - 34, scroll = t * 22 + n * 70;
  for (let X = clip[0]; X < clip[2]; X++) { const lx = X - fx + scroll, top = deckY + 4 * Math.sin(lx * 0.06) + 3 * Math.sin(lx * 0.023 + n); for (let Y = Math.max(clip[1], R(top)); Y < clip[3]; Y++) o.px(X, Y, Y - top < 3 ? S.cl : (Y - top) / 34 + bayer(X, Y) * 0.3 > 0.55 ? S.cl2 : S.cl); }
  for (let i = 0; i < 3; i++) { const w = 46 + rnd(n * 9 + i) * 40, span = FW + 140, x = fx + ((((rnd(n * 9 + i + 3) * span - t * (34 + i * 10)) % span) + span) % span) - 70, y = BAND + 26 + rnd(n * 9 + i + 5) * 70 + i * 24; cloud(o, x, y, w, clip); }
  // the airliner of this frame
  const fly = n === 1 ? FLY1 : n === 2 ? FLY2 : null; if (!fly) return;
  const k = 1 - Math.pow(1 - clamp01((t - fly[0]) / (fly[1] - fly[0])), 3), bob = Math.sin(t * 1.7 + n) * 1.2;
  const px = fx + lerp(-110, FW * 0.5 + 6, k), py = BAND + FH * 0.42 + bob + (1 - k) * 10;
  if (k > 0) airliner(o, R(px), R(py), t, n === 1 ? BREAK1 : BREAK2, clip);
}

// ---------------------------------------------------------------- the inset
const OFF = new Canvas(INSET.w, INSET.h, "#000000");
const VIG = new Float32Array(INSET.w * INSET.h);                 // static sepia vignette (with its dither) per pixel
for (let Y = 0; Y < INSET.h; Y++) for (let X = 0; X < INSET.w; X++) { const u = (X - INSET.w / 2) / (INSET.w / 2), v = (Y - INSET.h / 2) / (FH / 2); VIG[Y * INSET.w + X] = Math.max(0, u * u * 0.55 + v * v * 0.45 - 0.25) * 0.75 + (bayer(X, Y) - 0.5) * 0.08; }
export function drawComet(c, V, t) {
  const a = sm(t, ...IN) * (1 - sm(t, ...OUTT)); if (a <= 0) return;
  const o = OFF, adv = ease(clamp01((t - ADVANCE[0]) / (ADVANCE[1] - ADVANCE[0]))) * ADV, c1 = INSET.w / 2 - FW / 2 - adv;
  o.rect(0, 0, INSET.w, INSET.h, S.film);
  // sprocket holes (move with the film)
  const off = ((adv % 22) + 22) % 22;
  for (const by of [4, INSET.h - BAND + 4]) for (let x = -off + 4; x < INSET.w; x += 22) { o.rrect(R(x), by, 10, 8, S.hole, 2); o.rect(R(x) + 1, by + 6, 8, 1, "#B8A888"); }
  filmFrame(o, R(c1 - FW - GAP), 0, t); filmFrame(o, R(c1), 1, t); filmFrame(o, R(c1 + FW + GAP), 2, t);
  // frame corners rounded (film gate) and a thin dark frame line
  for (const fx of [R(c1 - FW - GAP), R(c1), R(c1 + FW + GAP)]) for (const [cx, cy] of [[fx, BAND], [fx + FW - 1, BAND], [fx, BAND + FH - 1], [fx + FW - 1, BAND + FH - 1]]) for (let j = 0; j < 3; j++) for (let i = 0; i < 3 - j; i++) o.px(cx + (cx === fx ? i : -i), cy + (cy === BAND ? j : -j), S.film);
  // old-film look: sepia vignette, gentle flicker, grain, drifting scratches (all smooth or per-pixel texture)
  const flick = 0.035 * Math.sin(t * 19.3) * Math.sin(t * 5.1), d = o.d;
  for (let Y = BAND; Y < BAND + FH; Y++) for (let X = 0; X < INSET.w; X++) {
    const vig = VIG[Y * INSET.w + X] - flick;
    if (vig === 0) continue; const i = (Y * INSET.w + X) * 3, q = Math.max(-0.08, Math.min(0.7, vig));
    if (q > 0) { d[i] *= 1 - q * 0.9; d[i + 1] *= 1 - q; d[i + 2] *= 1 - q * 1.1; } else { d[i] += (255 - d[i]) * -q; d[i + 1] += (250 - d[i + 1]) * -q; d[i + 2] += (230 - d[i + 2]) * -q; }
  }
  const f = Math.floor(t * 30);
  for (let i = 0; i < 260; i++) { const X = Math.floor(rnd(f * 977 + i * 3) * INSET.w), Y = BAND + Math.floor(rnd(f * 977 + i * 3 + 1) * FH); o.px(X, Y, rnd(f * 977 + i * 3 + 2) < 0.5 ? "#F8F0DA" : "#5A4430"); }
  for (let s = 0; s < 3; s++) { const k = Math.max(0, Math.sin(t * (0.9 + s * 0.37) + s * 2.1)); if (k < 0.3) continue; const X = R(INSET.w * (0.2 + 0.3 * s) + 50 * Math.sin(t * 0.43 + s * 1.7)); for (let Y = BAND; Y < BAND + FH; Y++) if ((Y + s * 13 + Math.floor(t * 40)) % 17 < 11 && (k - 0.3) * 1.6 > bayer(X, Y)) o.px(X, Y, mix(o.get(X, Y), "#FFF6E0", 0.55)); }
  // copy into the frame with the dissolve, plus a dark 1-px outline and a soft drop shadow
  const g = fade(c, a);
  for (let Y = 0; Y < INSET.h; Y++) { const sy = INSET.y + Y; for (let X = 0; X < INSET.w; X++) { const corner = (X < 2 || X >= INSET.w - 2) && (Y < 2 || Y >= INSET.h - 2) && !((X === 1 || X === INSET.w - 2) && (Y === 1 || Y === INSET.h - 2)); if (corner) continue; const i = (Y * INSET.w + X) * 3; if (a < 1 && a <= bayer(INSET.x + X, sy)) continue; const k = (sy * 540 + INSET.x + X) * 3; c.d[k] = o.d[i]; c.d[k + 1] = o.d[i + 1]; c.d[k + 2] = o.d[i + 2]; } }
  g.rframe(INSET.x - 1, INSET.y - 1, INSET.w + 2, INSET.h + 2, "#0B0812", 2);
  for (let X = INSET.x + 3; X < INSET.x + INSET.w + 2; X++) { g.px(X, INSET.y + INSET.h + 1, "#0B0812"); if ((X & 1) === 0) g.px(X, INSET.y + INSET.h + 2, "#0B0812"); }
  // tags: "1954" (lower left) and "COMET" (lower right), sitting on the strip's bottom edge
  tagOn(c, "1954", INSET.x + 12, INSET.y + 8, a * sm(t, TAGS.year[0], TAGS.year[0] + 0.3), t - TAGS.year[0], 4);
  const cw = c.measure(MAIN, "COMET", { scale: 3 }) + 22;
  tagOn(c, "COMET", INSET.x + INSET.w - 12 - cw, INSET.y + 8, a * sm(t, TAGS.comet[0], TAGS.comet[0] + 0.3), t - TAGS.comet[0], 3);
}
function tagOn(c, s, x, y, a, since, scale) {
  if (a <= 0) return;
  const tw = c.measure(MAIN, s, { scale }), w = tw + 22, h = 7 * scale + 14, rise = (1 - ease(clamp01(since / 0.35))) * 10, yy = R(y + rise), g = fade(c, a);
  g.rrect(x, yy + 3, w, h, "#0B0812", 2); g.rrect(x, yy, w, h, "#E8D2A0", 2); g.rrect(x + 2, yy + 2, w - 4, h - 4, "#2A1C10", 2); g.rect(x + 3, yy + 3, w - 6, 1, "#4A3420");
  g.text(MAIN, s, x + 12, yy + 8, "#0B0812", { scale }); g.text(MAIN, s, x + 11, yy + 7, "#F4DFA8", { scale });
}
