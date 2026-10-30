// LV4 · the orange tabby of «How your cat drinks» (../../../cat-drink/film/cat.mjs: CAT / CREAM / PINK ramps, mackerel
// stripes, forehead "M", cream muzzle and chest, pink nose and inner ears) drawn FRONT-ON in the series' chibi rig
// (the black cat of ../../../animals-heart/film/levels/cat-art.mjs, copied and recoloured): curled tail, pear body with
// haunches and chubby front legs, a wide head with cheek fluff and big ears, a live face (big amber eyes with two
// highlights, pink nose, "w" mouth, dithered blush, whiskers). Poses: sit (breath, blink, ear twitch, tail sway, look,
// wide eyes, puffed fur, happy closed eyes, chin up) and crouch (head low over the paws, the rump up behind with the
// tail, wiggling). (x, y) = screen point on the ground between the front paws. Parts that swap are dissolved.
import { blob, flat, ell, tube, bez, eye, blush, mouthW, nose, smile, RAMP, fade, mix, rnd, clamp01, bayer, lerp } from "../cute.mjs";
import { Layer } from "./jungle-kit.mjs";
import { hex } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const FURC = ["#2A1206", "#5A2A10", "#8A4418", "#B8642A", "#D9873E", "#EDA95A", "#F6C982", "#FCE6BC"];   // cat-drink CAT
export const CREAM = ["#3A2414", "#7A5A3A", "#B8946A", "#DCC096", "#EEDDB8", "#F8EED6", "#FDF7EA", "#FFFFFF"];
export const PINK = ["#3A0A18", "#6A1A30", "#9A2E48", "#C84A62", "#E26E80", "#F29AA6", "#FAC6CC", "#FDE8EA"];
const OUT = "#24100A", LIT = "#FFF2C4", EAR = PINK[5], EAR2 = PINK[3], WHISK = "#FDF4E0", NOSE = "#E8788C";
const AMBER = ["#3A1A04", "#7A3A08", "#B85E10", "#E08A1C", "#F5AE2E", "#FBC94A", "#FDE07A", "#FFF2B8"];
const FUR_RGB = FURC.map(hex), STRIPE_DV = 2;

// ---------------------------------------------------------------- sprite cache (anchor-relative painting)
function spriteCache(max = 120) {
  const map = new Map();
  return (key, w, h, ox, oy, paint) => {
    let s = map.get(key);
    if (s) { map.delete(key); map.set(key, s); return s; }
    const L = new Layer(w, h), g = Object.create(L.g);
    g.px = (x, y, col) => L.g.px(x + ox, y + oy, col);
    g.get = (x, y) => L.g.get(x + ox, y + oy);
    g.has = (x, y) => L.has(x + ox, y + oy);
    paint(g, L);
    s = { layer: L, ox, oy, blit(c, x, y, o) { L.blit(c, x - ox, y - oy, o); } };
    map.set(key, s); if (map.size > max) map.delete(map.keys().next().value);
    return s;
  };
}
const cache = spriteCache(140);
const opt = (o = {}) => ({ ramp: FURC, outline: OUT, litOutline: LIT, ...o });
/** Darken fur pixels (by STRIPE_DV ramp steps) wherever f(x, y) is true, inside the box (anchor-relative). */
function stripes(g, x0, y0, x1, y1, f, dv = STRIPE_DV) {
  for (let y = R(y0); y <= R(y1); y++) for (let x = R(x0); x <= R(x1); x++) {
    if (!g.has(x, y) || !f(x, y)) continue;
    const p = g.get(x, y); let k = -1; for (let j = 0; j < 8; j++) { const q = FUR_RGB[j]; if (q[0] === p[0] && q[1] === p[1] && q[2] === p[2]) { k = j; break; } }
    if (k >= 2) g.px(x, y, FURC[Math.max(1, k - dv)]);
  }
}
const frac = (v) => v - Math.floor(v);

// ---------------------------------------------------------------- shapes (anchor-relative, unscaled units)
function ellF(cx, cy, rx, ry, fur = 0, seed = 0, rot = 0) {
  if (fur <= 0) return ell(cx, cy, rx, ry, rot);
  const tufts = Math.max(7, R((Math.PI * (rx + ry)) / 15)), n = tufts * 4, c = Math.cos(rot), s = Math.sin(rot), out = [];
  for (let i = 0; i < n; i++) {
    const j = i % 4, tk = Math.floor(i / 4), amp = fur * (0.55 + 0.7 * rnd(seed * 31 + tk)), k = j === 2 ? amp : j === 1 || j === 3 ? amp * 0.35 : 0;
    const a = (2 * Math.PI * (i + (j === 2 ? 0.35 * (rnd(seed + tk * 7) - 0.5) : 0))) / n, x = Math.cos(a) * (rx + k), y = Math.sin(a) * (ry + k);
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}
function tubeF(pts, r0, r1, fur = 0, seed = 0) {
  if (fur <= 0) return tube(pts, r0, r1);
  const n = pts.length, L = [], Rr = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, r = r0 + (r1 - r0) * (i / (n - 1));
    const j = i % 3, kl = r + (j === 1 ? fur * (0.6 + 0.6 * rnd(seed + i)) : 0), kr = r + (j === 2 ? fur * (0.6 + 0.6 * rnd(seed + i + 50)) : 0);
    L.push([pts[i][0] - (dy / d) * kl, pts[i][1] + (dx / d) * kl]); Rr.push([pts[i][0] + (dy / d) * kr, pts[i][1] - (dx / d) * kr]);
  }
  const tip = pts[n - 1], a = pts[n - 2], ang = Math.atan2(tip[1] - a[1], tip[0] - a[0]), cap = [];
  for (let k = 1; k < 6; k++) { const t = ang - Math.PI / 2 + (Math.PI * k) / 6, rr = r1 + fur * (k % 2 ? 0.9 : 0.3); cap.push([tip[0] + Math.cos(t) * rr, tip[1] + Math.sin(t) * rr]); }
  return [...L, ...cap.reverse(), ...Rr.reverse()];
}
const rot = (p, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a), x = p[0] - cx, y = p[1] - cy; return [cx + x * c - y * s, cy + x * s + y * c]; };

// tail curled up on the left, hooked tip; sway bends it progressively from the base. base: [x, y] root (unscaled).
function tailPts(sway, base = [-58, -22], up = 0) {
  const B = base, k = 1 + up * 0.25;
  const pts = [...bez(B, [B[0] - 70, B[1] + 8 - up * 40], [B[0] - 66, B[1] - 70 * k - up * 20], 22), ...bez([B[0] - 66, B[1] - 70 * k - up * 20], [B[0] - 62, B[1] - 120 * k - up * 30], [B[0] - 32, B[1] - 126 * k - up * 30], 14).slice(1)];
  return pts.map((p, i) => { const f = (i / (pts.length - 1)) ** 1.4; return rot(p, B[0], B[1], sway * f * 1.25); });
}

// ---------------------------------------------------------------- cached parts
function tailSprite(S, sway, puff, base = [-58, -22], up = 0) {
  const q = R(sway * 60), key = `tail|${S}|${q}|${puff}|${base}|${R(up * 10)}`;
  return cache(key, R(300 * S), R(330 * S), R(190 * S), R(290 * S), (g) => {
    const pts = tailPts(q / 60, base, R(up * 10) / 10).map(([x, y]) => [x * S, y * S]);
    blob(g, [tubeF(pts, (puff ? 18 : 13) * S, (puff ? 14 : 9) * S, puff ? 6 * S : 0, 5)], opt({ thick: 6 * S }));
    // tail rings: bands across the tail every ~14 units (quads across the tube), the tip darker
    const n = pts.length, cum = [0]; for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const total = cum[n - 1] / S, band = (s0, s1) => {
      for (let i = 1; i < n; i++) { const a = cum[i - 1] / S, b = cum[i] / S; if (b < s0 || a > s1) continue;
        const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, w = 24 * S;
        const quad = [[x0 + nx * w, y0 + ny * w], [x1 + nx * w, y1 + ny * w], [x1 - nx * w, y1 - ny * w], [x0 - nx * w, y0 - ny * w]];
        let qx0 = 1e9, qy0 = 1e9, qx1 = -1e9, qy1 = -1e9; for (const [x, y] of quad) { qx0 = Math.min(qx0, x); qy0 = Math.min(qy0, y); qx1 = Math.max(qx1, x); qy1 = Math.max(qy1, y); }
        stripes(g, qx0, qy0, qx1, qy1, (x, y) => { const u = ((x - x0) * dx + (y - y0) * dy) / (d * d), sp = (cum[i - 1] + u * d) / S; return u >= -0.05 && u <= 1.05 && Math.abs((x - x0) * nx + (y - y0) * ny) < w && sp >= s0 && sp < s1; });
      }
    };
    for (let s0 = 16; s0 < total - 9; s0 += 14) band(s0, s0 + 4.6);
    band(total - 7, total + 30);
  });
}
function bodySprite(S, puff, squash) {
  const sq = R(squash * 20) / 20, key = `body|${S}|${puff}|${sq}`;
  return cache(key, R(260 * S), R(240 * S), R(130 * S), R(222 * S), (g) => {
    const f = puff ? 7 : 0, k = 1 - sq * 0.16, w = 1 + sq * 0.1;
    const P = (poly) => poly.map(([x, y]) => [x * S * w, y * S * k]);
    blob(g, [P(ellF(-82, -8, 19, 9)), P(ellF(82, -8, 19, 9))], opt({ thick: 6 * S, base: 2.6 }));
    blob(g, [P(ellF(0, -92, 66, 78, f, 1)), P(ellF(0, -42, 80, 44, f, 2)), P(ellF(-58, -46, 36, 42, f, 3)), P(ellF(58, -46, 36, 42, f, 4))], opt({ thick: 34 * S, base: 2.1, gain: 2.3 }));
    // mackerel stripes on the flanks and haunches (curved bands sloping down towards the outside)
    stripes(g, -130 * S, -200 * S, 130 * S, 0, (x, y) => { const X = x / (S * w), Y = y / (S * k), ax = Math.abs(X); if (ax < 34 || Y > -10) return false; return frac((Y + ax * 0.55) / 19) < 0.3; });
    // cream bib (chest) and cream belly fluff
    blob(g, [P(ellF(0, -132, 30, 36, 3, 11)), P(ell(0, -104, 18, 18))], { ramp: CREAM, outline: CREAM[3], litOutline: null, thick: 16 * S, base: 3.6, gain: 1.6, slope: 0.6 });
    for (let i = -3; i <= 3; i++) { const x = R(i * 7 * S * w), y = R((-162 + Math.abs(i) * 3) * S * k); g.px(x, y, CREAM[6]); g.px(x, y + 1, CREAM[4]); g.px(x + 1, y + 2, CREAM[4]); }
    for (const s of [-1, 1]) {
      // front leg: soft contour lines that fade out up the chest, with tabby bands across
      for (let yy = -104; yy <= -16; yy++) {
        const u = (yy + 104) / 88, fadeIn = Math.min(1, u * 2.2), X = (x) => R(x * S * w), Y = R(yy * S * k);
        const xo = (41 - 3 * (1 - u)) * s, xi = 7 * s;
        if (fadeIn > bayer(X(xo), Y)) { g.px(X(xo), Y, FURC[1]); g.px(X(xo) - s, Y, FURC[2]); }
        if (u > 0.3 && fadeIn > bayer(X(xi), Y) + 0.2) g.px(X(xi), Y, FURC[2]);
        const a0 = Math.min(X(xi), X(xo)) + 1, a1 = Math.max(X(xi), X(xo)) - 1, band = u > 0.45 && u < 0.85 && frac((yy + 4) / 19) < 0.2;
        for (let xx = a0; xx <= a1; xx++) { const v = (xx - a0) / Math.max(1, a1 - a0), lit = s < 0 ? 1 - v : 1 - v * 0.7; if (fadeIn * 0.85 > bayer(xx, Y) + 0.05) g.px(xx, Y, band ? FURC[3] : lit > 0.72 && u > 0.12 ? FURC[5] : FURC[4]); }
      }
      blob(g, [P(ell(25 * s, -11, 21, 12))], opt({ thick: 8 * S, base: 3.0 }));
      for (const dx of [-6, 6]) { const x = R((25 * s + dx) * S * w); for (let j = 0; j < 3; j++) g.px(x, R(-5 * S * k) - j, FURC[1]); }
    }
  });
}
/** Crouch body: shoulders low behind the head, forearms flat on the ground, paws forward. */
function crouchBody(S) {
  return cache(`cbody|${S}`, R(280 * S), R(160 * S), R(140 * S), R(150 * S), (g) => {
    const P = (poly) => poly.map(([x, y]) => [x * S, y * S]);
    blob(g, [P(ellF(0, -54, 84, 46, 0, 21)), P(ellF(-62, -30, 34, 30, 0, 22)), P(ellF(62, -30, 34, 30, 0, 23))], opt({ thick: 30 * S, base: 2.1, gain: 2.2 }));
    stripes(g, -130 * S, -110 * S, 130 * S, 0, (x, y) => { const X = x / S, Y = y / S, ax = Math.abs(X); return ax > 40 && frac((Y + ax * 0.5) / 18) < 0.3; });
    for (const s of [-1, 1]) {
      blob(g, [P(tube([[30 * s, -34], [36 * s, -14]], 17, 15)), P(ell(36 * s, -10, 22, 12))], opt({ thick: 9 * S, base: 2.9 }));
      stripes(g, (s > 0 ? 14 : -60) * S, -50 * S, (s > 0 ? 60 : -14) * S, -16 * S, (x, y) => frac((y / S + 2) / 13) < 0.3);
      for (const dx of [-7, 7]) { const x = R((36 * s + dx) * S); for (let j = 0; j < 3; j++) g.px(x, R(-3 * S) - j, FURC[1]); }
    }
  });
}
/** The raised rump seen behind the crouching cat (haunches + back), striped. */
function rumpSprite(S) {
  return cache(`rump|${S}`, R(220 * S), R(150 * S), R(110 * S), R(90 * S), (g) => {
    const P = (poly) => poly.map(([x, y]) => [x * S, y * S]);
    blob(g, [P(ellF(0, 0, 70, 50, 0, 31)), P(ellF(-46, 18, 34, 34, 0, 32)), P(ellF(46, 18, 34, 34, 0, 33))], opt({ thick: 28 * S, base: 2.0, gain: 2.0, slope: 0.6 }));
    stripes(g, -110 * S, -60 * S, 110 * S, 60 * S, (x, y) => { const X = x / S, Y = y / S; return frac((Y * 0.4 + Math.abs(X) * 0.9 + 4) / 22) < 0.28 && Y > -44; });
  });
}
/** Head + ears around the head centre. */
function headSprite(S, puff, earL, earR) {
  const key = `head|${S}|${puff}|${R(earL * 40)}|${R(earR * 40)}`;
  return cache(key, R(300 * S), R(300 * S), R(150 * S), R(150 * S), (g) => {
    const T = (poly) => poly.map((p) => [p[0] * S, p[1] * S]);
    const f = puff ? 5 : 0;
    for (const s of [-1, 1]) {
      const e = s * ((s < 0 ? earL : earR) + (puff ? 0.28 : 0)), piv = [52 * s, -40];
      const ear = [[-84, -14], [-82, -60], [-76, -96], [-68, -99], [-40, -74], [-20, -52]].map(([x, y]) => rot([s < 0 ? x : -x, y], piv[0], piv[1], e));
      const inner = [[-72, -28], [-70, -82], [-38, -58]].map(([x, y]) => rot([s < 0 ? x : -x, y], piv[0], piv[1], e));
      blob(g, [T(ear)], opt({ thick: 10 * S }));
      flat(g, [T(inner)], EAR);
      const w0 = T([rot([s < 0 ? -58 : 58, -40], piv[0], piv[1], e)])[0], w1 = T([rot([s < 0 ? -62 : 62, -60], piv[0], piv[1], e)])[0], w2 = T([rot([s < 0 ? -52 : 52, -46], piv[0], piv[1], e)])[0], w3 = T([rot([s < 0 ? -54 : 54, -70], piv[0], piv[1], e)])[0];
      g.line(R(w0[0]), R(w0[1]), R(w1[0]), R(w1[1]), EAR2); g.line(R(w2[0]), R(w2[1]), R(w3[0]), R(w3[1]), PINK[6]);
    }
    const head = [ellF(0, 0, 84, 66, f, 7), [[-76, 6], [-101, 26], [-70, 32]], [[-64, 28], [-88, 46], [-52, 44]], [[76, 6], [101, 26], [70, 32]], [[64, 28], [88, 46], [52, 44]]];
    blob(g, head.map(T), opt({ thick: 24 * S, base: 2.6 }));
    // forehead "M": three stripes from the crown down between the eyes; two cheek stripes on each side
    stripes(g, -100 * S, -70 * S, 100 * S, 50 * S, (x, y) => {
      const X = x / S, Y = y / S;
      if (Y < -24 && Y > -64) { const u = (Y + 64) / 40; for (const [cx, w, lean] of [[0, 3.4, 0], [-15, 2.8, 0.22], [15, 2.8, -0.22]]) { const xx = cx + (Y + 24) * lean; if (Math.abs(X - xx) < w * (0.5 + 0.5 * u)) return true; } }
      if (Y < -50 && Y > -60 && Math.abs(X) > 30 && Math.abs(X) < 48) return Math.abs(Y - (-55 + (Math.abs(X) - 30) * 0.3)) < 2;
      for (const sd of [-1, 1]) { const ax = X * sd; if (ax > 58 && ax < 92) for (const y0 of [8, 22]) { const yy = y0 - (ax - 58) * 0.18; if (Math.abs(Y - yy) < 3.2 * (1 - (ax - 58) / 50)) return true; } }
      return false;
    });
    // cream muzzle: two round cheek pads and the chin around the nose and mouth
    blob(g, [ell(-15 * S, 34 * S, 21 * S, 14 * S), ell(15 * S, 34 * S, 21 * S, 14 * S), ell(0, 44 * S, 16 * S, 10 * S)], { ramp: CREAM, outline: FURC[3], litOutline: null, thick: 10 * S, base: 3.8, gain: 1.4, slope: 0.6 });
  });
}

// ---------------------------------------------------------------- face (live)
function face(c, hx, hy, S, o) {
  const a = o.a ?? 1, g = fade(c, a), P = (x, y) => [hx + x * S, hy + y * S];
  const wide = clamp01(o.wide ?? 0), er = (20 + wide * 3) * S, ery = (22 + wide * 4) * S, look = o.look ?? [0, 0];
  const happy = clamp01(o.happy ?? 0);
  for (const s of [-1, 1]) {
    const [ex, ey] = P(34 * s, -2 - wide * 2);
    if (happy < 1) eye(c, ex, ey, er, { iris: AMBER, pupil: o.pupil ?? "round", ry: ery, look, blink: o.blink ?? 0, a: a * (1 - happy), lid: FURC[3], outline: OUT });
    if (happy > 0) { const gh = fade(c, a * happy), w = er * 0.85, h = er * 0.55; for (let i = -R(w); i <= R(w); i++) { const u = i / w, yy = ey + 2 * S - h * Math.sqrt(Math.max(0, 1 - u * u)); gh.px(R(ex + i), R(yy), OUT); gh.px(R(ex + i), R(yy) + 1, OUT); if (Math.abs(u) < 0.7) gh.px(R(ex + i), R(yy) - 1, mix(OUT, FURC[3], 0.5)); } gh.px(R(ex + s * w) + s, R(ey + 2 * S) - 1, OUT); }
  }
  for (const s of [-1, 1]) { const [bx, by] = P(54 * s, 24); blush(c, bx, by, 14 * S, 6 * S, undefined, a); }
  const [nx, ny] = P(0, 24);
  nose(c, nx, ny, 5 * S, NOSE, a);
  const mo = clamp01(o.open ?? 0);
  if (mo < 0.3) mouthW(c, nx, ny + 7 * S, OUT, R(3 * S), a);
  else smile(c, nx, ny + 8 * S, R(7 * S), { col: OUT, open: (mo - 0.3) / 0.7, tongue: PINK[4], a });
  for (const s of [-1, 1]) for (const [y0, x1, y1] of [[22, 108, 12], [28, 110, 28], [33, 104, 40]]) { const p0 = P(56 * s, y0), p1 = P(x1 * s, y1); g.line(R(p0[0]), R(p0[1]), R(p1[0]), R(p1[1]), WHISK); }
}

// ---------------------------------------------------------------- public
export const CAT_HEAD_Y = 222;   // head centre above the anchor (unscaled), sitting
/**
 * Front-on tabby. o: { s, a, t (idle clock), look [dx, dy], blink 0..1, wide 0..1, open 0..1 (mouth), puff 0..1,
 * earL/earR, earsBack, sway (tail), headDy (extra lift), crouch 0..1 (sit → hunting crouch; crossfaded), wiggle (rump
 * sway −1..1), tailUp 0..1 }.
 */
export function drawTabby(c, x, y, o = {}) {
  const S = o.s ?? 1, a = o.a ?? 1; if (a <= 0) return null;
  const t = o.t ?? 0, puff = clamp01(o.puff ?? 0), cr = clamp01(o.crouch ?? 0);
  const breath = Math.sin(t * 2 * Math.PI / 3.1), bob = R(breath * 1.3 * S);
  const sway = o.sway ?? 0.1 * Math.sin(t * 1.3) + 0.05 * Math.sin(t * 0.47 + 1);
  const twitch = (ph) => { const p = ((t + ph) % 5.3 + 5.3) % 5.3; return p < 0.45 ? Math.sin((p / 0.45) * Math.PI) * 0.16 : 0; };
  const earL = (o.earL ?? 0) + twitch(1.7) + (o.earsBack ?? 0), earR = (o.earR ?? 0) + twitch(4.2) + (o.earsBack ?? 0);
  const X = R(x), Y = R(y), ks = 1 - cr, kc = cr;
  // crouch layer (dissolves in): the raised rump with the tail behind, the low shoulders and forearms
  const wig = (o.wiggle ?? 0) * 9 * S;
  if (kc > 0.001) {
    const ry = R(y - (150 + 30 * cr) * S), rx = R(x + wig);
    tailSprite(S, R((o.sway ?? sway) * 60) / 60, 0, [10, -40], 1).blit(c, rx, ry, { a: a * kc });
    rumpSprite(S).blit(c, rx, ry, { a: a * kc });
    crouchBody(S).blit(c, X, Y, { a: a * kc });
  }
  // sit layer: tail and body (smooth, then the puffed version dissolved over them)
  if (ks > 0.001) {
    for (const [pf, k] of [[0, 1], [1, puff]]) { if (k <= 0.001 || (pf === 0 && puff >= 0.999)) continue; tailSprite(S, R(sway * 60) / 60, pf).blit(c, X, Y, { a: a * ks * (pf ? k : 1) }); }
    for (const [pf, k] of [[0, 1], [1, puff]]) { if (k <= 0.001 || (pf === 0 && puff >= 0.999)) continue; bodySprite(S, pf, 0).blit(c, X, Y, { a: a * ks * (pf ? k : 1) }); }
  }
  // head: sits on the body, sinks low over the paws in the crouch (continuous)
  const hx = R(x + wig * 0.15 * cr), hy = R(y - lerp(CAT_HEAD_Y, 96, cr * cr * (3 - 2 * cr)) * S + bob * (1 - cr) - (o.headDy ?? 0));
  for (const [pf, k] of [[0, 1], [1, puff]]) { if (k <= 0.001 || (pf === 0 && puff >= 0.999)) continue; headSprite(S, pf, earL, earR).blit(c, hx, hy, { a: a * (pf ? k : 1) }); }
  face(c, hx, hy, S, { ...o, a });
  return { hx, hy, pawL: [R(x - 25 * S), Y], pawR: [R(x + 25 * S), Y] };
}
/** One front paw (side −1 left / 1 right) drawn again on top (e.g. pinning the toy mouse). */
export function drawTabbyPaw(c, x, y, S, side = -1, a = 1) {
  const sp = cache(`paw|${S}|${side}`, R(60 * S), R(40 * S), R(30 * S), R(28 * S), (g) => {
    blob(g, [ell(0, -11 * S, 21 * S, 12 * S)], opt({ thick: 8 * S, base: 3.0 }));
    for (const dx of [-6, 6]) { const xx = R(dx * S); for (let j = 0; j < 3; j++) g.px(xx, R(-5 * S) - j, FURC[1]); }
  });
  sp.blit(c, R(x + 25 * side * S), R(y), { a });
}
/** ICON: the tabby's head (~56 px wide), centred at (cx, cy). */
export function tabbyIcon(c, cx, cy, a = 1) {
  const S = 0.31, hs = headSprite(S, 0, 0, 0); hs.blit(c, R(cx), R(cy + 4), { a });
  face(c, R(cx), R(cy + 4), S, { a, look: [0, 0.1] });
}
/** Build the cached parts of a pose ahead of time (one part per call), so a pose change does not pay for all at once. */
export function warmTabby(k, S) {
  if (k === 0) bodySprite(S, 1, 0); else if (k === 1) headSprite(S, 1, 0, 0); else if (k === 2) crouchBody(S); else if (k === 3) rumpSprite(S);
  else if (k >= 4 && k < 16) { const e = ((k - 4) % 6) * 0.025; headSprite(S, k < 10 ? 1 : 0, e, e); }   // the proud pose's swept-back ears
}
