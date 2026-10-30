// LV7 · the free-tailed bat (Mexican / Brazilian free-tailed bat), drawn as a cute chibi facing the camera:
// a round fluffy head with two big rounded ears (pink inside), glossy eyes, a tiny smile with two little fangs, blush,
// a light muzzle, a soft round body, tiny feet, the short tail membrane with the little FREE TAIL poking out below it,
// and two spread wings (finger bones, scalloped membrane that lets the moonlight glow through it).
// drawBat(c, x, y, o): (x, y) = head centre (screen). The expensive volume shading of the body is cached per
// (scale, ear twitch, tilt); wings, face and the radio tag are drawn per frame (cheap). Pure function of its inputs.
import { blob, flat, ell, tube, eye, blush, RAMP, fade, mix, bayer } from "../cute.mjs";
import { spriteCache, xform, R, clamp01, thick } from "./city-kit.mjs";

export const FUR = ["#100810", "#1E1220", "#2E1C2E", "#43293C", "#5B3A4C", "#76505E", "#946A74", "#B48A8E"];
const BELLY = ["#2A1A22", "#45303A", "#604650", "#7C5E66", "#98787C", "#B49494", "#CCAEAA", "#E2CAC2"];
const EAR_IN = "#D98AA0", EAR_IN2 = "#B06880";
const MEMB = "#2A1626", MEMB_EDGE = "#0E060E", BONE = "#6A4658", BONE_HI = "#8E6676";
const IRIS = ["#07060C", "#140E1C", "#2A1A2E", "#5A3A50", "#8A5A70"];
const SPR = spriteCache(24);

/** Broad rounded ear (a soft rounded triangle, the free-tailed bat's big forward ears), centre (cx, cy), tilted by rot. */
function earPoly(cx, cy, sd, rot, k) {
  const base = [[-17, 16], [-12, -4], [-6, -20], [0, -27], [6, -21], [13, -5], [18, 14], [0, 20]].map(([u, v]) => [u * k, v * k]);
  const sm = []; for (let i = 0; i < base.length; i++) { const p = base[i], q = base[(i + 1) % base.length]; sm.push(p, [(p[0] * 2 + q[0]) / 3, (p[1] * 2 + q[1]) / 3]); }
  return xform(sm.map(([u, v]) => [cx + u, cy + v]), cx, cy, rot);
}
/** The cached body: ears, head, muzzle, body, belly, feet, tail membrane. tw = ear twitch (−1..1), tilt in rad. */
function bodySprite(s, tw, tilt) {
  const key = `bat:${s.toFixed(2)}:${tw.toFixed(1)}:${tilt.toFixed(2)}`, W = R(150 * s) + 12, H = R(190 * s) + 12, ox = R(W / 2), oy = R(86 * s) + 6;
  return SPR(key, W, H, ox, oy, (g, x, y) => {
    const T = (pts) => xform(pts.map(([u, v]) => [x + u * s, y + v * s]), x, y + 30 * s, tilt);
    const E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 40));
    const lit = FUR[6];
    // tail membrane (between the feet) and the free tail poking out below it
    blob(g, [T([[-15, 56], [-4, 74], [0, 77], [4, 74], [15, 56]])], { ramp: ["#0E060E", "#1A0E1A", "#26142A", "#341C38", "#44264A", "#563058", "#6A3C6A", "#7E4A7C"], thick: 4 * s, base: 2.6, litOutline: null });
    // ears (behind the head): big, rounded, tilted outward; the right one twitches
    for (const sd of [-1, 1]) {
      const rot = sd * (0.62 + (sd > 0 ? tw * 0.14 : 0)), cx = sd * 30, cy = -32;
      blob(g, [T(earPoly(cx, cy, sd, rot, 1))], { ramp: FUR, thick: 8 * s, base: 3.2, litOutline: lit });
      flat(g, [T(earPoly(cx + sd * 1.5, cy + 3, sd, rot, 0.62))], EAR_IN2);
      flat(g, [T(earPoly(cx + sd * 1.5, cy + 5, sd, rot, 0.44))], EAR_IN);
    }
    // body + belly fluff
    blob(g, [E(0, 40, 27, 27)], { ramp: FUR, thick: 14 * s, base: 3.0, gain: 2.2, litOutline: lit });
    blob(g, [E(0, 44, 18, 20), T([[-10, 26], [-5, 31], [0, 27], [5, 31], [10, 26], [0, 36]])], { ramp: BELLY, thick: 10 * s, base: 3.2, gain: 2.2, outline: BELLY[1], litOutline: null });
    // tiny feet with claws
    for (const sd of [-1, 1]) { const [fx, fy] = T([[sd * 10, 64]])[0]; g.rect(R(fx) - 2, R(fy), 4, 3, FUR[1]); g.px(R(fx) - 2, R(fy) + 3, FUR[0]); g.px(R(fx), R(fy) + 3, FUR[0]); g.px(R(fx) + 2, R(fy) + 3, FUR[0]); }
    // head: wide and round with cheek fluff
    blob(g, [E(0, 0, 37, 31), T([[-34, 8], [-41, 18], [-26, 22]]), T([[34, 8], [41, 18], [26, 22]]), T([[-8, -30], [-3, -38], [0, -31], [4, -37], [8, -30]])], { ramp: FUR, thick: 22 * s, base: 3.1, gain: 2.0, litOutline: lit });
    // light muzzle (the "bulldog" lips of the free-tailed bat)
    blob(g, [E(0, 13, 15, 9.5), E(-7, 16, 8, 7), E(7, 16, 8, 7)], { ramp: BELLY, thick: 6 * s, base: 3.0, gain: 1.8, outline: FUR[2], litOutline: null });
  });
}

/** Wing polygon (right wing, local to the shoulder) at flap w (−1 down … 1 up) and spread (0 folded … 1 open). */
function wingPts(w, spread) {
  const S = [0, 0], E = [30, -6], W = [64, -30], F2 = [128, -36], F3 = [136, 2], F4 = [112, 38], F5 = [68, 52], H = [-6, 40];
  const scal = (a, b, k = 0.2) => { const out = []; for (let i = 1; i < 6; i++) { const u = i / 6, bow = Math.sin(Math.PI * u) * k; out.push([a[0] + (b[0] - a[0]) * u + (W[0] - (a[0] + b[0]) / 2) * bow, a[1] + (b[1] - a[1]) * u + (W[1] - (a[1] + b[1]) / 2) * bow]); } return out; };
  const poly = [S, E, W, F2, ...scal(F2, F3, 0.16), F3, ...scal(F3, F4, 0.2), F4, ...scal(F4, F5, 0.22), F5, ...scal(F5, H, 0.24), H];
  const sq = (1 - 0.2 * Math.pow(Math.abs(w), 1.5)) * (0.3 + 0.7 * spread), ang = -0.52 * w + (1 - spread) * 0.9;
  const tr = ([u, v]) => { const x = u * sq, y = v * (0.55 + 0.45 * spread), c = Math.cos(ang), s = Math.sin(ang); return [x * c - y * s, x * s + y * c]; };
  return { poly: poly.map(tr), E: tr(E), W: tr(W), F: [F2, F3, F4, F5].map(tr), S: [0, 0], thumb: tr([58, -40]) };
}

/** One wing: translucent membrane (the background glows through), finger bones, leading edge, thumb claw. */
function drawWing(c, sx, sy, sd, w, spread, s, a, tilt) {
  const P = wingPts(w, spread), cs = Math.cos(tilt), sn = Math.sin(tilt);
  const M = ([u, v]) => { const x = sd * u * s, y = v * s; return [sx + x * cs - y * sn, sy + x * sn + y * cs]; };
  const poly = P.poly.map(M), g = fade(c, a);
  // membrane: tint toward the membrane colour (moonlight shines through it)
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; for (const [px, py] of poly) { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); }
  const inside = (X, Y) => { let k = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > Y) !== (yj > Y) && X < ((xj - xi) * (Y - yi)) / (yj - yi) + xi) k = !k; } return k; };
  for (let Y = Math.floor(y0); Y <= Math.ceil(y1); Y++) {
    if (Y < 0 || Y >= c.h) continue;
    // scanline spans
    const yc = Y + 0.5, xs = [];
    for (let i = 0; i < poly.length; i++) { const [ax, ay] = poly[i], [bx, by] = poly[(i + 1) % poly.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((p, q) => p - q);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let X = Math.max(0, R(xs[k])); X < Math.min(c.w, R(xs[k + 1])); X++) {
      if (a < 1 && a <= bayer(X, Y)) continue;
      const bg = c.get(X, Y), lum = (bg[0] * 0.3 + bg[1] * 0.55 + bg[2] * 0.15) / 255;
      // over the bright moon the membrane glows warm (thin skin), over the night sky it is a dark plum
      const glowK = lum > 0.42 ? Math.min(1, (lum - 0.42) * 2.2) : 0, col = glowK > 0 ? mix(MEMB, "#7A3E54", glowK * 0.75) : MEMB;
      c.px(X, Y, glowK > 0 && glowK * 0.5 > bayer(X, Y) ? mix(col, "#B8705E", 0.35) : col);
    }
  }
  void inside;
  // trailing-edge outline
  for (let i = 0; i < poly.length; i++) { const p = poly[i], q = poly[(i + 1) % poly.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), MEMB_EDGE); }
  // finger bones from the wrist
  const Wp = M(P.W), Ep = M(P.E), Sp = M(P.S);
  for (const f of P.F) { const q = M(f); g.line(R(Wp[0]), R(Wp[1]), R(q[0]), R(q[1]), BONE); }
  // arm (leading edge): shoulder → elbow → wrist, a little thicker and lit on top
  thick(g, [Sp, Ep, Wp], s > 0.7 ? 1 : 0, MEMB_EDGE);
  g.line(R(Sp[0]), R(Sp[1]) - 1, R(Ep[0]), R(Ep[1]) - 1, BONE_HI); g.line(R(Ep[0]), R(Ep[1]) - 1, R(Wp[0]), R(Wp[1]) - 1, BONE_HI);
  const F2 = M(P.F[0]); g.line(R(Wp[0]), R(Wp[1]) - 1, R(F2[0]), R(F2[1]) - 1, BONE_HI);
  // little thumb claw at the wrist
  const th = M(P.thumb); g.line(R(Wp[0]), R(Wp[1]), R(th[0]), R(th[1]), FUR[1]); g.px(R(th[0]), R(th[1]), "#E8D8D0");
}

/**
 * o: s (scale), w (flap −1..1), spread (0..1), look [dx, dy], blink, tw (ear twitch), tail (free-tail wiggle −1..1),
 * tilt (rad), a (dissolve), smile (0..1 open), tag (radio tag 0..1), led (0..1 antenna light), tagTilt.
 * Returns anchors { tag: [x, y] (antenna tip), back: [x, y] } in screen pixels.
 */
export function drawBat(c, x, y, o = {}) {
  const s = o.s ?? 1, a = o.a ?? 1, tilt = Math.round((o.tilt ?? 0) * 25) / 25, w = o.w ?? 0, spread = o.spread ?? 1;
  x = R(x); y = R(y);
  const T = (u, v) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u * s, dy = v * s - 30 * s; return [x + dx * cs - dy * sn, y + 30 * s + dx * sn + dy * cs]; };
  const out = {};
  if (a <= 0) return out;
  const tagK = clamp01(o.tag ?? 0);
  // wings (behind the body)
  for (const sd of [-1, 1]) { const [sx, sy] = T(sd * 22, 28); drawWing(c, sx, sy, sd, w, spread, s, a, tilt); }
  // free tail (wiggles) — drawn before the body so it pokes out from under the tail membrane
  { const tl = o.tail ?? 0, [t0x, t0y] = T(0, 70), [t1x, t1y] = T(3 + tl * 5, 86), [t2x, t2y] = T(1 + tl * 9, 95); blob(fade(c, a), [tube([[t0x, t0y], [t1x, t1y], [t2x, t2y]], 2.6 * s + 0.4, 1.4 * s + 0.4)], { ramp: FUR, thick: 2, base: 3.4, litOutline: FUR[6] }); }
  // body sprite
  const tw = Math.round((o.tw ?? 0) * 2) / 2;
  bodySprite(s, tw, tilt).blit(c, x, y, { a });
  // radio tag on the upper back, peeking over the right shoulder; antenna wire trailing up-back with a blinking tip
  if (tagK > 0) {
    const g = fade(c, a * Math.min(1, tagK * 1.6)), pop = 1 + 0.35 * Math.sin(Math.PI * clamp01(tagK * 1.3)) * (tagK < 0.77 ? 1 : 0);
    const [bx, by] = T(31, 21), tw2 = R(9 * s * pop), th = R(6 * s * pop);
    g.rrect(R(bx - tw2 / 2) - 1, R(by - th) - 1, tw2 + 2, th + 2, "#0B0812", 1); g.rect(R(bx - tw2 / 2), R(by - th), tw2, th, "#6A8A5A"); g.rect(R(bx - tw2 / 2), R(by - th), tw2, 1, "#9ABE80"); g.px(R(bx + tw2 / 2) - 2, R(by - th) + 2, "#2A3A2A");
    // antenna: a thin wire curving up and back from the tag, blinking tip
    const L = 26 * s * clamp01(tagK * 1.4), sway = Math.sin((o.time ?? 0) * 7) * 2;
    let px = bx + tw2 / 2 - 2, py = by - th, tip = [px, py];
    for (let i = 0; i < L; i++) { const u = i / Math.max(1, L); px += 0.55 + u * 0.4 + sway * 0.02; py -= 0.85 - u * 0.25; g.px(R(px), R(py), i % 5 === 4 ? "#8A8494" : "#2A2430"); tip = [px, py]; }
    if (tagK > 0.6) { const led = clamp01(o.led ?? 0); g.px(R(tip[0]), R(tip[1]), mix("#5A1A1A", "#FF4A3A", led)); if (led > 0.4) { fade(c, a * (led - 0.4) / 0.6).px(R(tip[0]) + 1, R(tip[1]), "#FF9A7A"); fade(c, a * (led - 0.4) / 0.6).px(R(tip[0]), R(tip[1]) - 1, "#FF9A7A"); fade(c, a * (led - 0.4) / 0.6).px(R(tip[0]) - 1, R(tip[1]), "#C83A3A"); fade(c, a * (led - 0.4) / 0.6).px(R(tip[0]), R(tip[1]) + 1, "#C83A3A"); } }
    out.tag = tip;
  }
  // face: big glossy eyes, blush, tiny nose, smile with two little fangs
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const sd of [-1, 1]) { const [ex, ey] = T(sd * 15.5, -3); eye(c, ex, ey, 10 * s, { ry: 11 * s, iris: IRIS, pupil: "bead", look, blink, lid: FUR[4], a }); }
  for (const sd of [-1, 1]) { const [bx, by] = T(sd * 26, 11); blush(c, bx, by, 6.5 * s, 3.2 * s, "#F27A9A", a); }
  const g = fade(c, a), [nx, ny] = T(0, 8.5);
  // nose: a small dark-pink heart with two nostrils
  g.rect(R(nx) - 3, R(ny), 7, 2, "#7A3048"); g.rect(R(nx) - 2, R(ny) + 2, 5, 1, "#7A3048"); g.px(R(nx), R(ny) + 3, "#7A3048"); g.px(R(nx) - 2, R(ny), "#C06A84"); g.px(R(nx) + 2, R(ny), "#C06A84");
  const [mx, my] = T(0, 17), op = o.smile ?? 0;
  if (op > 0.05) {
    const oh = R(2 + op * 4 * s), hw = R(6 * s);
    for (let j = 0; j <= oh; j++) { const half = R(hw * Math.sqrt(Math.max(0, 1 - (j / (oh + 0.5)) ** 2))); for (let i = -half; i <= half; i++) g.px(R(mx) + i, R(my) + j, j === 0 || Math.abs(i) === half || j === oh ? "#1A0812" : j > oh * 0.5 ? "#E86A88" : "#4A0E22"); }
    g.px(R(mx) - 3, R(my) + 1, "#FFFFFF"); g.px(R(mx) - 3, R(my) + 2, "#FFFFFF"); g.px(R(mx) + 3, R(my) + 1, "#FFFFFF"); g.px(R(mx) + 3, R(my) + 2, "#FFFFFF");
  } else {
    const hw = R(6 * s); for (let i = -hw; i <= hw; i++) { const u = i / hw; g.px(R(mx) + i, R(my + 2.2 * s * (1 - u * u)), "#1A0812"); }
    // two little fangs under the smile
    for (const sd of [-1, 1]) { const fx = R(mx + sd * 3 * s), fy = R(my + 2 * s); g.px(fx, fy + 1, "#FFFFFF"); g.px(fx, fy + 2, "#FFFFFF"); if (s >= 0.9) g.px(fx + (sd < 0 ? 1 : -1), fy + 1, "#E8E0E8"); }
  }
  out.back = T(16, 24);
  return out;
}

/** A fading after-image of the body (for the dash): just the cached body sprite. */
export function drawBatGhost(c, x, y, s, tilt, a) { if (a > 0) bodySprite(s, 0, Math.round(tilt * 25) / 25).blit(c, R(x), R(y), { a }); }

/** Head portrait for the speedometer / guess cards: ears, head, face (no wings), centred at (cx, cy). */
export function drawBatHead(c, cx, cy, a = 1, s = 0.62, o = {}) {
  if (a <= 0) return;
  const key = `head:${s.toFixed(2)}`, W = R(110 * s) + 12, H = R(120 * s) + 12, ox = R(W / 2), oy = R(76 * s) + 6;
  const y = R(cy + 14 * s), x = R(cx);
  SPR(key, W, H, ox, oy, (g, X, Y) => {
    const T = (pts) => pts.map(([u, v]) => [X + u * s, Y + v * s]), E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 40));
    for (const sd of [-1, 1]) { const rot = sd * 0.62, ex = sd * 30, ey = -32; blob(g, [T(earPoly(ex, ey, sd, rot, 1))], { ramp: FUR, thick: 8 * s, base: 3.7, litOutline: FUR[7] }); flat(g, [T(earPoly(ex + sd * 1.5, ey + 3, sd, rot, 0.62))], EAR_IN2); flat(g, [T(earPoly(ex + sd * 1.5, ey + 5, sd, rot, 0.44))], EAR_IN); }
    blob(g, [E(0, 0, 37, 31), T([[-34, 8], [-41, 18], [-26, 22]]), T([[34, 8], [41, 18], [26, 22]]), T([[-8, -30], [-3, -38], [0, -31], [4, -37], [8, -30]])], { ramp: FUR, thick: 22 * s, base: 3.7, gain: 2.0, litOutline: FUR[7] });
    blob(g, [E(0, 13, 15, 9.5), E(-7, 16, 8, 7), E(7, 16, 8, 7)], { ramp: BELLY, thick: 6 * s, base: 3.0, gain: 1.8, outline: FUR[2], litOutline: null });
  }).blit(c, x, y, { a });
  const T = (u, v) => [x + u * s, y + v * s];
  for (const sd of [-1, 1]) { const [ex, ey] = T(sd * 15.5, -3); eye(c, ex, ey, 10 * s, { ry: 11 * s, iris: IRIS, pupil: "bead", look: o.look ?? [0, 0.1], blink: o.blink ?? 0, lid: FUR[4], a }); }
  for (const sd of [-1, 1]) { const [bx, by] = T(sd * 26, 11); blush(c, bx, by, 6.5 * s, 3 * s, "#F27A9A", a); }
  const g = fade(c, a), [nx, ny] = T(0, 8.5); g.rect(R(nx) - 2, R(ny), 5, 1, "#7A3048"); g.px(R(nx), R(ny) + 1, "#7A3048");
  const [mx, my] = T(0, 16); for (let i = -3; i <= 3; i++) g.px(R(mx) + i, R(my + 1.4 * (1 - (i / 3) ** 2)), "#1A0812");
  g.px(R(mx) - 2, R(my) + 2, "#FFFFFF"); g.px(R(mx) + 2, R(my) + 2, "#FFFFFF");
}
export { mix };
