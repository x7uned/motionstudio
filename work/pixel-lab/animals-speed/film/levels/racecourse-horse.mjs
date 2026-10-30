// LV5 · the racehorse: a cute chibi bay thoroughbred, body three-quarter toward the right, the big head turned to the camera
// (glossy lashed eyes, blush, a white star, a little bridle), purple silk saddle cloth with a number, white leg wraps,
// black mane and tail that stream in the wind. One continuous rig for every gait: stand → gallop → prance, legs by 2-bone
// IK from a gait phase (racecourse-time.mjs), so nothing ever swaps in one frame. ICON(): the same head, ~56 px.
import { blob, flat, ell, tube, bez, eye, blush, smile, RAMP, MAIN, sm, ease, lerp, rnd, fade, mix, bayer, clamp01, smooth } from "../cute.mjs";
import { spriteCache, xf, ik, ribbon, wavy, softSmile } from "./racecourse-kit.mjs";

const R = Math.round;
// ---------------------------------------------------------------- palette (bay coat in golden light)
export const COAT = ["#1A0806", "#36120A", "#5A200E", "#7E3216", "#A0481E", "#BE642C", "#D88844", "#F0B26C"];
const COAT_FAR = ["#120604", "#240C08", "#3E160C", "#5A2410", "#763616", "#8E4A20", "#A86230", "#C07E44"];
export const MANE = ["#05040A", "#0E0B16", "#1A1524", "#282034", "#382E48", "#4A4060", "#625A7E", "#8680A4"];
const SNOUT = ["#3A1A12", "#5E2E20", "#84483A", "#A86652", "#C88670", "#DEA488", "#EEC4A8", "#F8E0CC"];
const WRAP = ["#4A4450", "#7A7484", "#A8A2B4", "#CCC8D8", "#E4E0EE", "#F2F0F8", "#FAFAFF", "#FFFFFF"];
const HOOF = ["#0A0808", "#1A1414", "#2A2222", "#3C3232", "#504444", "#665858", "#806E6E", "#9A8888"];
const IRIS = ["#0A0404", "#1A0C08", "#2E1610", "#4A2416", "#6A381E", "#8E5228", "#B4743A", "#D89A58"];
const SILK = RAMP.jelly;
export const LIT = "#FFD08A";
const OUT = "#120604";

const SPR = spriteCache(120);

// ---------------------------------------------------------------- the head (cached; face details per frame)
// local origin = head centre; the face looks into the camera, muzzle a touch to the right (the body runs right)
function headSprite() {
  return SPR("head", 150, 150, 75, 74, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    blob(g, [P.poly(ell(0, -6, 48, 44)), P.poly(ell(-28, 18, 24, 26)), P.poly(ell(30, 18, 24, 26)), P.poly(ell(2, 38, 33, 32))], { ramp: COAT, thick: 26, base: 3.0, gain: 2.3, slope: 0.4, litOutline: LIT, outline: OUT });
    blob(g, [P.poly(ell(3, 54, 32, 25))], { ramp: SNOUT, thick: 14, base: 3.3, gain: 2.0, outline: COAT[1], litOutline: COAT[4] });
    // white star on the forehead
    flat(g, [smooth(P.poly([[1, -40], [8, -32], [2, -24], [-5, -32]]), new Set(), 4)], "#FFF8F0");
    g.px(R(P(-1, -34)[0]), R(P(-1, -34)[1]), "#FFFFFF");
    // bridle: browband (purple with a gold rosette), cheek straps, noseband
    for (let x = -36; x <= 38; x++) { const y = -24 - 9 * (1 - (x / 40) ** 2); const p = P(x, y); g.px(R(p[0]), R(p[1]), "#2A1430"); g.px(R(p[0]), R(p[1]) + 1, x % 4 === 0 ? "#F4CA50" : "#8D59DA"); g.px(R(p[0]), R(p[1]) + 2, "#2A1430"); }
    for (const sd of [-1, 1]) { for (let y = -18; y <= 34; y++) { const p = P(sd * (38 - (y + 18) * 0.12), y); g.px(R(p[0]), R(p[1]), "#2A1430"); g.px(R(p[0]) + sd, R(p[1]), "#4A2A50"); } const r = P(sd * 37, -22); g.disc(R(r[0]), R(r[1]), 2, "#F4CA50"); g.px(R(r[0]) - 1, R(r[1]) - 1, "#FFF4C0"); }
    for (let x = -32; x <= 36; x++) { const y = 38 - 4 * (1 - (x / 34) ** 2); const p = P(x, y); g.px(R(p[0]), R(p[1]), "#2A1430"); g.px(R(p[0]), R(p[1]) + 1, "#4A2A50"); }
    { const r = P(33, 36); g.rect(R(r[0]) - 2, R(r[1]) - 2, 5, 5, "#F4CA50"); g.px(R(r[0]) - 1, R(r[1]) - 1, "#FFF4C0"); g.px(R(r[0]), R(r[1]), "#7A5A10"); }
  });
}
/** Ears; ang = outward tilt (rad), back = pinned back by the wind (0..1). */
function earsSprite(ang, back) {
  const qa = R(ang / 0.04), qb = R(back * 8);
  return SPR(`ears${qa}|${qb}`, 190, 110, 95, 104, (g, ox, oy) => {
    for (const sd of [-1, 1]) {
      const a = sd * qa * 0.04 + (sd < 0 ? -1 : 1) * (qb / 8) * 0.55, s = 1 - (qb / 8) * 0.18, P = xf(ox + sd * 27 + 2, oy - 40, s, a);
      blob(g, [smooth(P.poly([[-12, 6], [-10, -20], [0, -42], [9, -20], [12, 6]]), new Set([2]), 5)], { ramp: COAT, thick: 8, base: 3.0, gain: 1.8, litOutline: LIT, outline: OUT });
      flat(g, [smooth(P.poly([[-6, 2], [-5, -16], [0, -31], [5, -16], [6, 2]]), new Set([2]), 4)], "#D88A8A");
      flat(g, [smooth(P.poly([[-3, 0], [-2, -12], [0, -21], [2, -12], [3, 0]]), new Set([2]), 3)], "#F0B0A4");
    }
  });
}
/** Forelock tuft between the ears, blown back by the wind (w 0..1, quantised), ph = wave phase bucket. */
function forelock(g, x, y, w, ph) {
  const wv = Math.sin(ph) * 2 * w, P = xf(x, y, 1, 0);
  blob(g, [tube(bez(P(-4, -46), P(-10 - 10 * w, -50 - 6 * w), P(-6 - 18 * w + wv, -30 - 14 * w), 8), 7, 3), tube(bez(P(2, -48), P(4 - 6 * w, -40 - 8 * w), P(10 - 14 * w + wv, -28 - 12 * w), 8), 7, 3), tube(bez(P(6, -46), P(16, -44 - 4 * w), P(20 - 6 * w, -32 - 8 * w), 8), 6, 3)], { ramp: MANE, thick: 5, base: 3.2, gain: 1.6, litOutline: "#9A8CC8", outline: "#05040A" });
}
/** Face details: eyes with lashes, blush, nostrils, mouth. o.happy closes the eyes into ^^ arcs (proud), o.open opens the mouth. */
function face(c, x, y, o) {
  const { look = [0, 0], blink = 0, flare = 0, open = 0, happy = 0, a = 1 } = o, g = fade(c, a);
  for (const sd of [-1, 1]) {
    const ex = x + sd * 24 + 2, ey = y - 2;
    if (happy < 0.5) {
      eye(g, ex, ey, 12, { ry: 14, iris: IRIS, pupil: "round", look, blink: Math.max(blink, Math.min(1, happy * 2)), lid: COAT[4] });
      const bl = Math.max(blink, Math.min(1, happy * 2)), ly = ey - 14 + 28 * Math.min(1, bl);
      for (const [dx, dy, len] of [[8, 1, 6], [11, 4, 6], [12.5, 8, 5]]) { const bx = ex + sd * dx, by = ly + dy * (1 - Math.min(1, bl) * 0.6); for (let k = 0; k <= len; k++) g.px(R(bx + sd * k * 0.9), R(by - k * 0.75), "#120606"); }
    } else {
      // closed proud eyes: thick ^ arcs with lashes
      for (let X = -11; X <= 11; X++) { const u = X / 11, yy = ey + 2 - 7 * (1 - u * u); g.px(R(ex + X), R(yy), "#120606"); g.px(R(ex + X), R(yy) + 1, "#120606"); }
      for (const [dx, len] of [[10, 5], [12, 4]]) for (let k = 0; k <= len; k++) g.px(R(ex + sd * (dx + k * 0.9)), R(ey - 1 - k * 0.7 + (dx - 10)), "#120606");
    }
    blush(g, x + sd * 37 + 2, y + 25, 9, 4.5);
    const nx = x + sd * 13 + 3, ny = y + 52, rx = 4 + flare, ry = 5.5 + flare * 0.5;
    for (let Y = R(ny - ry); Y <= R(ny + ry); Y++) for (let X = R(nx - rx); X <= R(nx + rx); X++) { const d = ((X - nx) / rx) ** 2 + ((Y - ny) / ry) ** 2; if (d <= 1) g.px(X, Y, d > 0.55 ? "#5A2A24" : "#2A0E0C"); }
    g.px(R(nx - sd * 2), R(ny - ry), SNOUT[6]);
  }
  softSmile(g, x + 3, y + 68, 8, open, { col: "#4A1A18", tongue: "#F07090" });
}
/** The head with ears, forelock and face at head centre (x, y). */
export function drawHead(c, x, y, o = {}) {
  const { t = 0, wind = 0, earAng = 0.12, a = 1 } = o, g = fade(c, a);
  x = R(x); y = R(y);
  earsSprite(earAng, wind * 0.8).blit(c, x, y, { a });
  headSprite().blit(c, x, y, { a });
  forelock(g, x + 2, y + 2, R(wind * 4) / 4, R(t * 14) * 0.9);
  face(c, x, y, { ...o, a });
}

// ---------------------------------------------------------------- body and legs (per frame: the pose changes every frame)
// local frame: origin = ground point under the barrel, y up = negative; pitch rotates the body about the barrel centre
const BC = [-28, -128];                                              // barrel centre
export const HEAD_AT = [14, -262];                                   // head centre (before bob / toss)
export const PIV = { foreNear: [24, -100], foreFar: [44, -104], hindNear: [-84, -102], hindFar: [-64, -106] };
const UP = 40, LO = 42, HOOFH = 12;                                  // bone lengths, hoof height
/** Leg geometry: pivot P → knee → fetlock (foot point F) → hoof below. Returns the polygons for blob. */
function legPolys(P, F, fore, near) {
  const kn = ik(P, F, UP, LO, fore ? 1 : -1), K = kn.knee, Fo = kn.foot;
  const r0 = near ? 16 : 13.5, r1 = near ? 10.5 : 9, rk = near ? 11 : 9.5;
  const upper = tube([P, [(P[0] + K[0]) / 2, (P[1] + K[1]) / 2], K], r0, rk), lower = tube([K, [(K[0] + Fo[0]) / 2, (K[1] + Fo[1]) / 2], Fo], rk, r1 - 1);
  const ang = Math.atan2(Fo[1] - K[1], Fo[0] - K[0]) - Math.PI / 2, H = xf(Fo[0], Fo[1], 1, ang), hw = near ? 11 : 9.5;
  const hoof = smooth(H.poly([[-hw + 1, -1], [hw - 1, -1], [hw + 1.5, HOOFH - 2], [hw, HOOFH], [-hw, HOOFH], [-hw - 1.5, HOOFH - 2]]), new Set([0, 1]), 3);
  const wA = [lerp(K[0], Fo[0], 0.3), lerp(K[1], Fo[1], 0.3)], wrap = tube([wA, Fo], rk + 1.2, r1 + 0.8);
  return { upper, lower, hoof, wrap, K, F: Fo, H };
}
/** A flowing hair mass hanging from the curve root(u) (u 0..1) toward dir(u), length len(u); n lock tips on the trailing edge. */
function hairMass(root, dir, len, n, wave) {
  const top = [], tail = [], N = n * 4;
  for (let i = 0; i <= N; i++) { const u = i / N; top.push(root(u)); }
  for (let i = N; i >= 0; i--) {
    const u = i / N, r = root(u), d = dir(u), k = (i % 4) / 4, tipK = Math.pow(Math.sin(Math.PI * k), 2), L = len(u) * (0.72 + 0.34 * tipK), wv = wave(u);
    tail.push([r[0] + d[0] * L - d[1] * wv, r[1] + d[1] * L + d[0] * wv]);
  }
  return [...top, ...tail];
}
/**
 * Draw the horse with the ground point at screen (gx, gy). st: { legs: {id: [dx, lift]}, bob, pitch, head: {dx, dy},
 * wind (0..1, mane/tail stream back), t, tailSwish, face options }. Draw order: far legs → tail → body → saddle → near legs →
 * mane → head.
 */
export function drawHorse(c, gx, gy, st) {
  const { t, bob = 0, pitch = 0, wind = 0, legs } = st;
  const B = [gx + BC[0], gy + BC[1] + bob], P = xf(B[0], B[1], 1, pitch), L = (x, y) => P(x - BC[0], y - BC[1]);
  const ground = gy - HOOFH + 1;
  const leg = (id) => { const piv = L(...PIV[id]), [dx, lift] = legs[id], fore = id.startsWith("fore"); return legPolys(piv, [piv[0] + dx, ground - lift], fore, id.endsWith("Near")); };
  const LG = { foreFar: leg("foreFar"), hindFar: leg("hindFar"), foreNear: leg("foreNear"), hindNear: leg("hindNear") };
  const farOpt = { ramp: COAT_FAR, thick: 8, base: 2.6, gain: 1.4, outline: OUT, litOutline: COAT_FAR[5] };
  const farWrap = { ramp: WRAP.map((h) => mix(h, "#4A3450", 0.4)), thick: 5, base: 3.4, gain: 1.2, outline: OUT, litOutline: mix(WRAP[6], "#4A3450", 0.3) };
  const hoofOpt = { ramp: HOOF, thick: 5, base: 2.6, gain: 1.6, outline: "#050404", litOutline: HOOF[5] };
  for (const id of ["hindFar", "foreFar"]) { const q = LG[id]; blob(c, [q.upper, q.lower], farOpt); blob(c, [q.wrap], farWrap); blob(c, [q.hoof], hoofOpt); }
  // tail: three flowing locks from the dock (a bulging ribbon each), hanging and swishing when still, streaming back in the wind
  { const sw = st.tailSwish ?? 0, root = L(-126, -152), w = wind, locks = [], hl = [];
    for (let i = 0; i < 3; i++) {
      const lenK = [1, 0.88, 0.76][i], spread = (i - 1);
      const p1 = [root[0] - lerp(30, 56, w) + spread * 4, root[1] + lerp(16, -18 + spread * 6, w)];
      const p2 = [root[0] - lerp(22 - sw + spread * 6, 122 * lenK, w), root[1] + lerp(108 * lenK, 2 + spread * 16, w)];
      const pts = wavy(root, p1, p2, 18, (u) => u * lerp(2.5, 9, w), t * lerp(3, 15, w) - i * 0.9, lerp(0.6, 1.1, w));
      locks.push(ribbon(pts, (u) => (12 - i * 2) * Math.sin(Math.PI * Math.min(1, 0.25 + u * 0.95)) * (1 - u * 0.15) + 2)); hl.push(pts);
    }
    blob(c, locks, { ramp: MANE, thick: 9, base: 3.0, gain: 1.8, litOutline: "#9A8CC8", outline: "#05040A" });
    for (const pts of hl.slice(0, 2)) for (let k = 3; k < 14; k++) c.px(R(pts[k][0]), R(pts[k][1]) - 3, k < 9 ? MANE[6] : MANE[5]); }
  // body: a round bean (rump, barrel, chest) with the neck rising under the head
  const neck = P.poly(smooth([[22, -48], [70, -40], [56, -108], [10, -114]], new Set(), 4));
  const body = [P.poly(ell(0, -2, 78, 56)), P.poly(ell(-58, -6, 46, 54)), P.poly(ell(54, -6, 46, 58)), neck, LG.hindNear.upper, LG.foreNear.upper];
  blob(c, body, { ramp: COAT, thick: 40, base: 2.5, gain: 2.2, slope: 0.6, litOutline: LIT, outline: OUT });
  // soft muscle lines: shoulder and thigh curves, the belly line
  for (let k = 0; k <= 20; k++) { const u = k / 20, a = -1.2 + u * 1.9; const p = P(58 + Math.cos(a) * 36 - 12, 4 + Math.sin(a) * 40); c.px(R(p[0]), R(p[1]), COAT[3]); }
  for (let k = 0; k <= 20; k++) { const u = k / 20, a = Math.PI + 1.2 - u * 1.9; const p = P(-60 + Math.cos(a) * 36 + 12, 2 + Math.sin(a) * 40); c.px(R(p[0]), R(p[1]), COAT[3]); }
  for (let k = -40; k <= 30; k++) { const p = P(k, 44 + (k * k) / 300); c.px(R(p[0]), R(p[1]), COAT[3]); }
  // saddle cloth (purple silk, gold trim, a white number patch) hanging on the near side, a small saddle and a stirrup
  { const cloth = P.poly(smooth([[-50, -50], [10, -54], [16, -14], [12, 14], [-44, 18], [-54, -14]], new Set(), 4));
    blob(c, [cloth], { ramp: SILK, thick: 8, base: 3.4, gain: 1.6, slope: 0.4, outline: "#1A0A2A", litOutline: "#E0C4FA" });
    const trim = smooth([[-46, 14], [-10, 16], [12, 10]], new Set(), 6); for (let k = 0; k < trim.length - 1; k++) { const a = P(...trim[k]), b = P(...trim[k + 1]); c.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#F4CA50"); c.line(R(a[0]), R(a[1]) + 1, R(b[0]), R(b[1]) + 1, "#B8862A"); }
    const np = P(-18, -18), nx = R(np[0]), ny = R(np[1]); c.rrect(nx - 10, ny - 10, 21, 21, "#1A0A2A", 2); c.rrect(nx - 9, ny - 9, 19, 19, "#FFFCF4", 2); c.rect(nx - 8, ny + 7, 17, 2, "#D8D0E4");
    c.text(MAIN, "7", nx - 4, ny - 7, "#2A1430", { scale: 2 });
    const sad = P.poly(smooth([[-40, -60], [-24, -54], [-4, -60], [4, -52], [-4, -42], [-34, -42], [-44, -50]], new Set(), 4));
    blob(c, [sad], { ramp: RAMP.brown, thick: 6, base: 3.4, gain: 1.6, outline: "#1E0E06", litOutline: "#F2CEA0" });
    const sw = Math.sin(t * 9) * 3 * (0.3 + wind), s0 = P(-22, -44), s1 = [s0[0] - 2 - sw * 0.6, s0[1] + 22]; c.line(R(s0[0]), R(s0[1]), R(s1[0]), R(s1[1]), "#2A1A10"); c.line(R(s0[0]) + 1, R(s0[1]), R(s1[0]) + 1, R(s1[1]), "#5A3A22");
    c.rframe(R(s1[0]) - 4, R(s1[1]), 9, 7, "#C8C4D0", 1); c.px(R(s1[0]) - 3, R(s1[1]) + 1, "#FFFFFF"); }
  // near legs (in front of the body)
  for (const id of ["hindNear", "foreNear"]) { const q = LG[id]; blob(c, [q.lower], { ramp: COAT, thick: 12, base: 3.0, gain: 1.8, litOutline: LIT, outline: OUT }); blob(c, [q.wrap], { ramp: WRAP, thick: 5, base: 3.6, gain: 1.4, outline: OUT, litOutline: WRAP[7] }); blob(c, [q.hoof], hoofOpt); }
  // mane: one flowing mass from the poll down the crest to the withers, hanging (still) or streaming back (wind)
  const hd = st.head ?? { dx: 0, dy: 0 }, H = [gx + HEAD_AT[0] + hd.dx, gy + HEAD_AT[1] + bob * 0.6 + hd.dy];
  { const a = [H[0] - 22, H[1] - 36], b = [H[0] - 40, H[1] + 34], ph = t * 12;
    const root = (u) => [lerp(a[0], b[0], u) - Math.sin(Math.PI * u) * 6, lerp(a[1], b[1], u)];
    const dir = (u) => { const hx = -0.75, hy = 0.75, wx = -1, wy = -0.1 + 0.3 * u, dx = lerp(hx, wx, wind), dy = lerp(hy, wy, wind), n = Math.hypot(dx, dy); return [dx / n, dy / n]; };
    const poly = hairMass(root, dir, (u) => lerp(22, 44, wind) * (1 - u * 0.2), 3, (u) => Math.sin(ph - u * 5) * lerp(1.5, 5, wind));
    blob(c, [smooth(poly, new Set(), 2)], { ramp: MANE, thick: 10, base: 3.0, gain: 1.9, litOutline: "#9A8CC8", outline: "#05040A" });
    for (let s2 = 0; s2 < 3; s2++) { const u0 = 0.15 + s2 * 0.3, r = root(u0), d = dir(u0); for (let k = 4; k < 26; k++) { const wv = Math.sin(ph - u0 * 5 - k * 0.12) * 2 * wind; c.px(R(r[0] + d[0] * k - d[1] * wv), R(r[1] + d[1] * k + d[0] * wv), k < 16 ? MANE[6] : MANE[5]); } } }
  drawHead(c, H[0], H[1], { ...st.face, t, wind, earAng: st.earAng ?? 0.12 });
  return { LG, H };
}

// ---------------------------------------------------------------- ICON: the racehorse's head, ~56 px, for the speedometer / guess cards
const ICON_SPR = spriteCache(4);
export function ICON(c, cx, cy, a = 1) {
  const s = ICON_SPR("icon", 64, 64, 32, 34, (g, ox, oy) => {
    const P = xf(ox, oy, 1, 0);
    // ears
    for (const sd of [-1, 1]) { const E = xf(ox + sd * 13, oy - 14, 1, sd * 0.2); blob(g, [smooth(E.poly([[-6, 4], [-5, -9], [0, -19], [5, -9], [6, 4]]), new Set([2]), 4)], { ramp: COAT, thick: 5, base: 3.0, gain: 1.6, outline: OUT, litOutline: LIT }); flat(g, [smooth(E.poly([[-3, 2], [-2, -7], [0, -13], [2, -7], [3, 2]]), new Set([2]), 3)], "#D88A8A"); }
    // mane behind the right cheek, head, muzzle
    blob(g, [tube(bez(P(14, -12), P(28, -4), P(24, 16), 8), 7, 3), tube(bez(P(10, -16), P(22, -14), P(28, 2), 8), 6, 3)], { ramp: MANE, thick: 4, base: 3.0, gain: 1.6, outline: "#05040A", litOutline: "#9A8CC8" });
    blob(g, [P.poly(ell(0, -3, 22, 19)), P.poly(ell(-13, 7, 11, 11)), P.poly(ell(13, 7, 11, 11)), P.poly(ell(0, 14, 15, 14))], { ramp: COAT, thick: 12, base: 3.0, gain: 2.2, slope: 0.4, outline: OUT, litOutline: LIT });
    blob(g, [P.poly(ell(0, 21, 14, 10))], { ramp: SNOUT, thick: 6, base: 3.3, gain: 1.8, outline: COAT[1], litOutline: COAT[4] });
    flat(g, [P.poly([[0, -19], [3, -15], [0, -11], [-3, -15]])], "#FFF8F0");
    // browband
    for (let x = -17; x <= 17; x++) { const y = R(-10 - 4 * (1 - (x / 18) ** 2)); g.px(R(P(x, y)[0]), R(P(x, y)[1]), x % 3 === 0 ? "#F4CA50" : "#8D59DA"); }
    // forelock
    blob(g, [tube(bez(P(-2, -22), P(-6, -20), P(-4, -12), 6), 4, 2), tube(bez(P(2, -22), P(6, -19), P(6, -12), 6), 4, 2)], { ramp: MANE, thick: 3, base: 3.2, gain: 1.4, outline: "#05040A", litOutline: "#9A8CC8" });
    // eyes, blush, nostrils, smile
    for (const sd of [-1, 1]) {
      eye(g, ox + sd * 10, oy - 1, 6, { ry: 7, iris: IRIS, pupil: "round", lid: COAT[4] });
      for (let k = 0; k <= 3; k++) g.px(R(ox + sd * (15 + k * 0.8)), R(oy - 5 - k * 0.8), "#120606");
      blush(g, ox + sd * 16, oy + 9, 4, 2);
      g.rect(R(ox + sd * 6) - 1, oy + 20, 3, 4, "#5A2A24"); g.rect(R(ox + sd * 6) - (sd < 0 ? 0 : 1), oy + 21, 2, 3, "#2A0E0C");
    }
    smile(g, ox, oy + 27, 4, { col: "#4A1A18" });
  });
  s.blit(c, R(cx), R(cy), { a });
}
