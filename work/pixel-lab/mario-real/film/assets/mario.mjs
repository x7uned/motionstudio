// mario-real · mario (new, 2026-10-29, drawn for this film): a plumber hero in OUR pixel drawing — red cap with a plain round
// white emblem (no letter, no logo), black moustache, big round nose, blue overalls with two yellow buttons, red shirt, white
// gloves, brown shoes. 1.55 m tall, cartoon proportions (head ≈ 1/3.2 of the height). 3/4 view facing dir (±1), lit from the
// upper left; shaded capsules/ellipses in a sprite buffer (lib/rig.mjs) with contour lines and a dark outline. Every pose is a
// blend of target joint positions (feet, hands, hip, lean, head tilt) weighted by continuous parameters, so state changes ease
// (catalog contract via lib/drive.mjs). flat: the game-world look (fewer tones). Squash/stretch (sq) around the feet.
import { Spr } from "../lib/rig.mjs";

const TAU = Math.PI * 2, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
export const H = 1.55;
const RAMP = {
  red: ["#4E0A14", "#8E1222", "#CC1E2C", "#F0483A", "#FF8C6C"], blue: ["#0E1A52", "#1A2E8E", "#2848C8", "#4472EC", "#82A6FF"],
  skin: ["#7A3C24", "#B8663C", "#E89862", "#FFBE8A", "#FFDDBA"], nose: ["#8A3C2A", "#C8664A", "#F2946E", "#FFB892", "#FFD8BC"],
  shoe: ["#2A1206", "#552810", "#80401A", "#A6602C", "#C88850"], glove: ["#7C7E9E", "#AEB2CC", "#DCE0F0", "#F6F8FF", "#FFFFFF"],
  hair: ["#100806", "#22120A", "#381F12", "#52341E"], stache: ["#0C0606", "#1C0E0A", "#2E1A12", "#46301E"],
  btn: ["#6A3E00", "#B87C00", "#FFCE1E", "#FFF08A"], white: ["#B8BCD6", "#E8ECFA", "#FFFFFF"], iris: ["#08184E", "#1A44A8", "#3A78E6", "#7AB2FF"],
  emb: ["#B8BCD6", "#E6EAF8", "#FFFFFF"],
};
// flatter game-world tones (three steps, brighter)
const FLAT = Object.fromEntries(Object.entries(RAMP).map(([k, r]) => [k, r.length > 3 ? [r[1], r[2], r[3]] : r]));

const POSE_KEYS = ["run", "crouch", "air", "apex", "fall", "land", "dust", "look", "point", "proud", "dive", "hips"];
/** the pose targets of every named pose (hip/feet in metres from the ground point, hands relative to the shoulder) */
function poses(t, ph) {
  const s = Math.sin(ph), c = Math.cos(ph), sN = Math.sin(ph + Math.PI), cN = Math.cos(ph + Math.PI);
  const wig = Math.sin(t * 11) * 0.03;
  return {
    stand: { hip: [0, 0.56 + 0.004 * Math.sin(t * 2.3)], fN: [0.09, 0], fF: [-0.08, 0], hN: [0.07, -0.34], hF: [-0.06, -0.33], lean: 0.02, tilt: 0, toe: 0 },
    run: { hip: [0, 0.52 + 0.04 * Math.abs(s)], fN: [0.25 * s, 0.17 * Math.max(0, c)], fF: [0.25 * sN, 0.17 * Math.max(0, cN)], hN: [0.05 - 0.22 * s, -0.2 + 0.05 * Math.max(0, s)], hF: [-0.05 + 0.2 * s, -0.22], lean: 0.2, tilt: -0.04, toe: 0.2 },
    crouch: { hip: [-0.03, 0.35], fN: [0.13, 0], fF: [-0.11, 0], hN: [-0.3, -0.12], hF: [-0.34, -0.08], lean: 0.34, tilt: -0.22, toe: 0 },
    air: { hip: [0, 0.56], fN: [0.15, 0.3], fF: [-0.09, 0.03], hN: [0.26, -0.16], hF: [0.06, 0.78], lean: -0.04, tilt: -0.12, toe: 0.5 },
    apex: { hip: [0, 0.56], fN: [0.17, 0.27], fF: [-0.02, 0.2], hN: [0.33, -0.12], hF: [0.04, 0.75], lean: -0.02, tilt: 0.12, toe: 0.4 },
    fall: { hip: [0, 0.56], fN: [0.12, 0.02], fF: [-0.1, 0.06], hN: [0.34 + wig, -0.02], hF: [-0.06, 0.62 - wig], lean: -0.06, tilt: 0.18, toe: 0.3 },
    land: { hip: [0, 0.31], fN: [0.16, 0], fF: [-0.14, 0], hN: [0.33, -0.08], hF: [-0.31, -0.04], lean: 0.26, tilt: -0.05, toe: 0 },
    dust: { hip: [0, 0.56], fN: [0.09, 0], fF: [-0.08, 0], hN: [-0.02 + 0.06 * Math.sin(t * 12), -0.36 + 0.03 * Math.cos(t * 12)], hF: [-0.13, -0.37], lean: 0.08, tilt: 0.22, toe: 0 },
    look: { hip: [0, 0.56], fN: [0.11, 0], fF: [-0.1, 0], hN: [0.13, -0.38], hF: [-0.15, -0.37], lean: -0.07, tilt: -0.42, toe: 0 },
    point: { hip: [0, 0.53], fN: [0.12, 0], fF: [-0.1, 0], hN: [0.32, -0.42], hF: [-0.15, -0.37], lean: 0.16, tilt: 0.2, toe: 0 },
    proud: { hip: [0, 0.56], fN: [0.13, 0], fF: [-0.11, 0], hN: [0.13, -0.38], hF: [-0.15, -0.37], lean: -0.09, tilt: -0.14, toe: 0 },
    dive: { hip: [0, 0.56], fN: [0.03, 0.03], fF: [-0.03, 0.06], hN: [0.04, 0.44], hF: [-0.02, 0.42], lean: 1.25, tilt: 0.1, toe: 0.9 },
    hips: { hip: [0, 0.56], fN: [0.11, 0], fF: [-0.1, 0], hN: [0.13, -0.38], hF: [-0.15, -0.37], lean: -0.04, tilt: 0, toe: 0 },
  };
}
const AIRBORNE = new Set(["air", "apex", "fall", "dive"]);
/** two-bone IK in the plane: joint for root A, end B, lengths l1, l2; sgn picks the side */
function ik(A, B, l1, l2, sgn) {
  const dx = B[0] - A[0], dy = B[1] - A[1], D = Math.hypot(dx, dy) || 1e-6, L = Math.min(l1 + l2 - 1e-4, D), a = (l1 * l1 - l2 * l2 + L * L) / (2 * L), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), ux = dx / D, uy = dy / D;
  return [A[0] + ux * a - uy * h * sgn, A[1] + uy * a + ux * h * sgn];
}

/** joint positions (metres, x forward = facing side, y up from the ground point) for parameter set v */
export function skeleton(v, t, gait = 0) {
  const P = poses(t, TAU * gait), w = {}; let sum = 0;
  for (const k of POSE_KEYS) { w[k] = clamp01(v[k] ?? 0); sum += w[k]; }
  const norm = sum > 1 ? 1 / sum : 1, ws = Math.max(0, 1 - sum * norm), out = {};
  for (const f of ["hip", "fN", "fF", "hN", "hF"]) { let x = P.stand[f][0] * ws, y = P.stand[f][1] * ws; for (const k of POSE_KEYS) if (w[k]) { x += P[k][f][0] * w[k] * norm; y += P[k][f][1] * w[k] * norm; } out[f] = [x, y]; }
  for (const f of ["lean", "tilt", "toe"]) { let x = P.stand[f] * ws; for (const k of POSE_KEYS) if (w[k]) x += P[k][f] * w[k] * norm; out[f] = x; }
  out.tilt += v.tiltX ?? 0; out.lean += v.leanX ?? 0;
  const hip = out.hip, ln = out.lean, cl = Math.cos(ln), sl = Math.sin(ln);
  const rot = (x, y) => [hip[0] + x * cl + y * sl, hip[1] - x * sl + y * cl];       // torso frame around the hip (lean > 0 tips forward)
  const up = clamp01(w.air + w.apex + w.fall * 0.6) * 0.1, shC = rot(0.0, 0.40), shN = rot(0.14, 0.38), shF = rot(-0.15, 0.39 + up), neck = rot(0.02, 0.47);
  const hpN = rot(0.08, -0.03), hpF = rot(-0.08, -0.02);
  // airborne feet are body-relative (they follow the lean/dive rotation); grounded feet stay on the ground
  let air = 0; for (const k of AIRBORNE) air += w[k] * norm;
  const footAt = (f) => { const g = out[f], b = rot(g[0], g[1] - 0.56); return [lerp(g[0], b[0], clamp01(air)), lerp(g[1], b[1], clamp01(air))]; };
  const fN = footAt("fN"), fF = footAt("fF");
  const ankN = [fN[0] - 0.03, fN[1] + 0.075], ankF = [fF[0] - 0.03, fF[1] + 0.075];
  const knN = ik(hpN, ankN, 0.255, 0.245, -1), knF = ik(hpF, ankF, 0.255, 0.245, -1);
  // hands relative to the shoulders, rotated with the torso
  const handAt = (f, sh) => { const r = out[f], q = [r[0] * cl + r[1] * sl, -r[0] * sl + r[1] * cl]; return [sh[0] + q[0], sh[1] + q[1]]; };
  const hN = handAt("hN", shN), hF = handAt("hF", shF);
  const hipsK = clamp01(w.look + w.hips + w.proud);
  const elN = ik(shN, hN, 0.225, 0.21, hipsK > 0.5 ? -1 : 1), elF = ik(shF, hF, 0.225 + up, 0.21 + up, 1);
  const tl = out.tilt + ln * 0.6, head = [neck[0] + Math.sin(tl) * 0.21 + 0.03, neck[1] + Math.cos(tl) * 0.21];
  return { w, norm, hip, ln, rot, shC, shN, shF, neck, hpN, hpF, kneeN: knN, kneeF: knF, ankN, ankF, toe: out.toe, elN, elF, hN, hF, head, tilt: tl };
}

/**
 * Draw Mario with his ground point (between the feet) at screen (fx, fy), s px per metre.
 * v: pose parameters (POSE_KEYS 0..1, mouth 0..1 open, smile 0..1, sq squash (+) / stretch (−), eyeUp, blink, tiltX, leanX)
 * o: { dir ±1, gait (cycles), flat (game look), a (presence), clipY, clipR (screen rect to clip to), ghost (colour) }
 * Returns { box, head, knee, feet, hand }.
 */
export function drawMario(c, fx, fy, s, t, v, o = {}) {
  const d = o.dir ?? 1, k = skeleton(v, t, o.gait ?? 0), RP = o.flat ? FLAT : RAMP;
  const sq = v.sq ?? 0, sx = 1 + 0.16 * sq, sy = 1 - 0.2 * sq;                         // squash around the ground point
  const S = (p) => [fx + p[0] * sx * s * d, fy - p[1] * sy * s];
  const rr = (m) => Math.max(0.8, m * s * (sx + sy) / 2);
  const W = 1.5 * s, sp = new Spr(fx - W, fy - 2.2 * s, 2 * W, 2.6 * s);
  const lx = d > 0 ? -0.8 : 0.8, L = { lx };                                           // light stays upper-left on screen
  const capP = (A, B, ra, rb, ramp, g, o2 = {}) => { const [ax, ay] = S(A), [bx, by] = S(B); sp.cap(ax, ay, bx, by, rr(ra), rr(rb), ramp, g, { ...L, ...o2 }); };
  const ellP = (P, rx, ry, ramp, g, o2 = {}) => { const [x, y] = S(P); sp.ell(x, y, rr(rx), rr(ry), ramp, g, { ...L, ...o2, a: (o2.a ?? 0) * d }); };
  const glove = (h, el, g, fist) => {
    const [hx, hy] = S(h), [ex, ey] = S(el), ang = Math.atan2(hy - ey, hx - ex);
    sp.cap(...S([lerp(el[0], h[0], 0.72), lerp(el[1], h[1], 0.72)]), hx, hy, rr(0.06), rr(0.07), RP.glove, g, L);    // cuff
    sp.ell(hx + Math.cos(ang) * rr(0.045), hy + Math.sin(ang) * rr(0.045), rr(0.088), rr(0.078), RP.glove, g + 1, { ...L, a: ang });
    if (!fist) sp.ell(hx + Math.cos(ang - 1.2 * d) * rr(0.07), hy + Math.sin(ang - 1.2 * d) * rr(0.07), rr(0.034), rr(0.03), RP.glove, g + 2, L);  // thumb
  };
  // ---- far arm
  capP(k.shF, k.elF, 0.068, 0.06, RP.red, 16, { bias: -0.16 }); capP(k.elF, k.hF, 0.06, 0.055, RP.red, 16, { bias: -0.16 });
  glove(k.hF, k.elF, 24, (k.w.air + k.w.apex) > 0.4);
  // ---- far leg + shoe
  const shoe = (ank, toe, g, bias) => { const a = -toe * d * 0.9 + 0.08 * d; const [x, y] = S([ank[0] + 0.065, ank[1] - 0.04 - toe * 0.03]); sp.ell(x, y, rr(0.13), rr(0.068), RP.shoe, g, { ...L, bias, a }); sp.ell(x - rr(0.02) * d, y + rr(0.035), rr(0.11), rr(0.03), RP.shoe, g, { ...L, bias: bias - 0.25, a }); };
  capP(k.hpF, k.kneeF, 0.1, 0.085, RP.blue, 32, { bias: -0.14 }); capP(k.kneeF, k.ankF, 0.085, 0.078, RP.blue, 32, { bias: -0.14 });
  shoe(k.ankF, k.toe, 40, -0.12);
  // ---- torso: shirt belly, overalls (lower + bib + straps), buttons
  ellP(k.rot(0.06, 0.22), 0.215, 0.255, RP.red, 48, { bias: 0.02 });
  ellP(k.rot(0.03, 0.06), 0.25, 0.19, RP.blue, 64);
  { const P = [k.rot(-0.08, 0.36), k.rot(0.2, 0.36), k.rot(0.235, 0.12), k.rot(-0.1, 0.1)].map(S); sp.poly(P, RP.blue, 64, { side: 0.7 }); }
  { const sw = 0.045; for (const [a, b] of [[k.rot(-0.05, 0.36), k.rot(-0.13, 0.43)], [k.rot(0.17, 0.36), k.rot(0.1, 0.44)]]) capP(a, b, sw, sw, RP.blue, 64); }
  for (const p of [k.rot(-0.04, 0.33), k.rot(0.165, 0.33)]) ellP(p, 0.036, 0.036, RP.btn, 72);
  // ---- near leg + shoe
  capP(k.hpN, k.kneeN, 0.105, 0.088, RP.blue, 80); capP(k.kneeN, k.ankN, 0.088, 0.08, RP.blue, 80);
  shoe(k.ankN, k.toe, 88, 0.02);
  // ---- head: hair at the back, ear, face, nose, moustache, eyes, brows, cap + brim + emblem
  const hd = k.head, tl = k.tilt, ct = Math.cos(tl), st = Math.sin(tl), HP = (x, y) => [hd[0] + x * ct + y * st, hd[1] - x * st + y * ct];
  const HS = 1.14, HQ = (x, y) => HP(x * HS, y * HS);
  const inHead = (X, Y) => { const lx0 = (X + 0.5 - fx) / (s * sx * d) - hd[0], ly0 = (fy - (Y + 0.5)) / (s * sy) - hd[1]; return [(lx0 * ct - ly0 * st) / HS, (lx0 * st + ly0 * ct) / HS]; };
  ellP(HQ(-0.075, -0.035), 0.2 * HS, 0.185 * HS, RP.hair, 96);
  ellP(HQ(0.02, -0.01), 0.21 * HS, 0.22 * HS, RP.skin, 104);
  ellP(HQ(-0.105, -0.01), 0.05 * HS, 0.066 * HS, RP.skin, 106, { bias: -0.1 });                   // ear
  // eyes (two tall ovals), irises look ahead or up
  const eu = clamp01((v.eyeUp ?? 0) + (k.w.look ?? 0) * 0.8), blink = clamp01(v.blink ?? blinkAt(t));
  for (const [ex, er] of [[0.07, 0.036], [0.165, 0.043]]) {
    const E = HQ(ex, 0.025), [x, y] = S(E), rx = rr(er * HS), ry = rr(er * HS * 1.6);
    const inE = (X, Y) => ((X + 0.5 - x) / rx) ** 2 + ((Y + 0.5 - y) / ry) ** 2 < 0.92;
    sp.ell(x, y, rx, ry, RP.white, 112, { bias: 0.4 });
    const ix = x + d * rr(0.012), iy = y - rr(0.022) * eu + rr(0.01) * (1 - eu);
    sp.ell(ix, iy, rx * 0.7, ry * 0.62, RP.iris, 112, { bias: 0.1, clip: inE });
    sp.ell(ix + d * rr(0.003), iy, rx * 0.36, ry * 0.32, ["#04040C", "#0A0A18"], 112, { clip: inE });
    if (rx >= 2.5) sp.px(ix - d * rx * 0.25, iy - ry * 0.3, "#FFFFFF");
    if (blink > 0) { const yl = y - ry + 2 * ry * blink; sp.ell(x, y, rx + 0.6, ry + 0.6, RP.skin, 113, { clip: (X, Y) => Y < yl }); }
  }
  // brows just under the brim
  for (const [bx, bw] of [[0.07, 0.04], [0.168, 0.048]]) capP(HQ(bx - bw * 0.7, 0.112 - (v.smile ?? 0) * 0.008), HQ(bx + bw * 0.7, 0.12), 0.017 * HS, 0.017 * HS, RP.stache, 114);
  // big round nose
  ellP(HQ(0.21, -0.045), 0.08 * HS, 0.07 * HS, RP.nose, 120, { bias: 0.05 });
  // mouth (under the moustache): open "O" or a smile
  const mo = clamp01(v.mouth ?? 0), smile = clamp01(v.smile ?? 0);
  if (mo > 0.02) ellP(HQ(0.17, -0.175), (0.05 * mo + 0.01) * HS, (0.045 * mo + 0.006) * HS, ["#3A0810", "#6A1420", "#A02832"], 124);
  if (smile > 0.02) capP(HQ(0.1, -0.16), HQ(0.24, -0.16), 0.02 * smile * HS, 0.02 * smile * HS, ["#5A1018", "#8A2028"], 124);
  // moustache: three scalloped lobes under the nose
  for (const [mx, my, r] of [[0.1, -0.11, 0.06], [0.178, -0.125, 0.07], [0.258, -0.11, 0.055]]) ellP(HQ(mx, my), r * 1.2 * HS, r * 0.78 * HS, RP.stache, 128, { a: -0.15 });
  // cap: dome above the brow line (clipped in the head frame), brim toward the facing side, plain round emblem (no letter)
  { const [x, y] = S(HQ(-0.01, 0.165)); sp.ell(x, y, rr(0.245 * HS), rr(0.16 * HS), RP.red, 144, { ...L, clip: (X, Y) => inHead(X, Y)[1] > 0.128 }); }
  { const [x, y] = S(HQ(-0.01, 0.165)); sp.ell(x, y, rr(0.245 * HS), rr(0.16 * HS), RP.red, 144, { ...L, bias: -0.22, clip: (X, Y) => { const q = inHead(X, Y)[1]; return q > 0.128 && q < 0.152; } }); }
  capP(HQ(0.08, 0.142), HQ(0.29, 0.128), 0.036 * HS, 0.028 * HS, RP.red, 152, { bias: -0.12 });
  ellP(HQ(0.075, 0.215), 0.062 * HS, 0.056 * HS, RP.emb, 156, { bias: 0.25 });
  // ---- near arm (over the body) + glove; pointing finger
  capP(k.shN, k.elN, 0.072, 0.064, RP.red, 160); capP(k.elN, k.hN, 0.064, 0.058, RP.red, 160);
  const pointK = clamp01(k.w.point);
  glove(k.hN, k.elN, 176, (k.w.air + k.w.apex) > 0.4 || pointK > 0.5);
  if (pointK > 0.3) { const dir = [k.hN[0] - k.elN[0], k.hN[1] - k.elN[1]], n = Math.hypot(...dir) || 1, tip = [k.hN[0] + (dir[0] / n) * 0.1 * pointK, k.hN[1] + (dir[1] / n) * 0.1 * pointK]; capP(k.hN, tip, 0.028, 0.024, RP.glove, 178); }
  // ---- out
  if (o.ghost) { // a flat silhouette of the same shape (motion trail / after-image)
    for (let i = 0; i < sp.g.length; i++) if (sp.g[i] >= 0) { sp.c.set(o.ghost, i * 3); sp.dk.set(o.ghost, i * 3); }
    sp.blit(c, o.a ?? 1, { outline: null, clipY: o.clipY });
  } else sp.blit(c, o.a ?? 1, { clipY: o.clipY, noLine: new Set([104, 106, 113, 114]), clip: o.clip });
  const top = S(HP(0, 0.34)), bot = fy, all = [S(k.hN), S(k.hF), S(HP(0.32, 0.07)), S(HP(-0.25, 0.1)), S(k.ankN), S(k.ankF), top];
  const xs = all.map((p) => p[0]), ys = all.map((p) => p[1]);
  return { box: { x0: Math.min(...xs) - rr(0.12), y0: Math.min(...ys) - rr(0.05), x1: Math.max(...xs) + rr(0.12), y1: Math.max(...ys) + rr(0.08) }, head: S(hd), knee: S(k.kneeN), kneeF: S(k.kneeF), feet: [S(k.ankN), S(k.ankF)], hand: S(k.hN), top };
}
/** a smooth blink every ~3.7 s (lids close and open over 0.16 s) */
export function blinkAt(t) { const u = (t + 0.9) % 3.7; return u < 0.16 ? Math.sin((Math.PI * u) / 0.16) : 0; }

const Z0 = { run: 0, crouch: 0, air: 0, apex: 0, fall: 0, land: 0, dust: 0, look: 0, point: 0, proud: 0, dive: 0, hips: 0, mouth: 0, smile: 0, sq: 0 };
const only = (o) => ({ ...Z0, ...o });
export default {
  kind: "mario", covers: ["mario", "plumber hero", "jumping hero", "game hero"],
  source: "mario-real/film (new, 2026-10-29)",
  desc: "moustached plumber hero: red cap with plain round emblem, blue overalls, white gloves; runs, jumps, lands, points",
  hw: 34, hh: 45, start: "stands, breathes, blinks",
  states: {
    idle: [0.35, "stands, breathes, blinks"],
    run: [0.25, "springy run, arms pumping", "tick"],
    crouch: [0.22, "winds up: knees bent, arms swung back", "swish"],
    "jump-up": [0.12, "springs up: one fist up, one knee up", "rise"],
    apex: [0.25, "hangs at the top, knees tucked", "glow"],
    fall: [0.3, "falls, arms up and out", "fall"],
    land: [0.1, "lands in a deep squat, arms out", "thud"],
    "dust-off": [0.35, "brushes his overalls", "swish"],
    "look-up": [0.4, "hands on hips, looks up", "blip"],
    point: [0.35, "points down at his knees", "blip"],
    proud: [0.45, "chest out, hands on hips, smiles", "sparkle"],
    dive: [0.25, "dives forward, arms ahead", "whoosh"],
  },
  base: { ...Z0 },
  st: {
    idle: only({}), run: only({ run: 1 }), crouch: only({ crouch: 1 }), "jump-up": only({ air: 1, mouth: 0.8, sq: -0.5 }), apex: only({ apex: 1, mouth: 0.3 }),
    fall: only({ fall: 1, mouth: 0.6 }), land: only({ land: 1, sq: 0.5 }), "dust-off": only({ dust: 1 }), "look-up": only({ look: 1 }), point: only({ point: 1 }),
    proud: only({ proud: 1, smile: 1 }), dive: only({ dive: 1, mouth: 0.5, sq: -0.3 }),
  },
  linear: [], slots: null, hud: false, value: false, text: false,
  notes: "Gait phase: s.gait (cycles) from the film (distance / stride ≈ 0.95 m) or ∫ 2.6·run dt. s.dir faces left/right. Light stays upper-left when mirrored.",
  draw(c, cx, cy, z, t, s) {
    const k = (this.hh * 2 * z) / H, fy = cy + this.hh * z;
    const g = s.gait ?? s.integ((p) => 2.6 * p.run);
    const r = drawMario(c, cx, fy, k, t, s.v, { dir: s.dir ?? 1, gait: g, flat: s.flat, a: s.a });
    return { box: r.box, pt: r.hand };
  },
};
