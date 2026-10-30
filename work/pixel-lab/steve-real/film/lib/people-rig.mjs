// init catalog · group «people»: ONE shared chibi person rig (≈2.2 heads tall, front view) for adult, child, doctor, teacher,
// scientist, worker, farmer, cook, office-worker. A person is a short config (see PEOPLE in assets/*.mjs): skin / hair /
// eyes, clothes (ramps), worn gear (coat, vest, apron, overalls, cardigan, tie, hats, glasses, goggles, stethoscope …).
// Everything is volume-shaded with cute.blob (1-px outline, ramp bands), drawn in screen pixels at scale z, so close-ups
// stay crisp. All pose parameters are continuous (the engine eases them): arms are [shoulder, elbow] angle pairs mixed
// by the state weights, expressions are weighted channels (eye shape, mouth width/curve/openness, brows), so nothing
// ever switches in one frame.
import { blob, flat, eye, blush, shadow, ell, tube, bez, blinkAt } from "./cat-cute.mjs";
import { mix, toHex, fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round, TAU = Math.PI * 2, OUT = "#07060E";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (x, a, b) => { const k = clamp01((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];

// ---------------------------------------------------------------- ramps (8 steps dark → light, `at` = index of the mid colour)
export function rampOf(midC, shade = "#1B1235", light = "#FFF6E6", at = 4, lw = 1) {
  const r = [];
  for (let i = 0; i < 8; i++) {
    if (i < at) r.push(toHex(mix(midC, shade, 0.9 * (at - i) / at)));
    else if (i === at) r.push(midC);
    else r.push(toHex(mix(midC, light, lw * (0.13 + 0.55 * (i - at) / (7 - at)))));
  }
  return r;
}
export const skinRamp = (m, shade = "#5E2340") => rampOf(m, shade, "#FFF1DE", 4, 0.9);
export const hairRamp = (m) => rampOf(m, "#120A1E", toHex(mix(m, "#FFF4E0", 0.55)), 3, 1);
export const clothRamp = (m) => rampOf(m, "#1B1235", "#FFF6E6", 4, 1);
export const WHITE = ["#3A3A58", "#6C6C92", "#9696B8", "#BEBED6", "#D8D8E8", "#EAEAF4", "#F6F6FC", "#FFFFFF"];
export const SKIN = { pale: skinRamp("#F6C6A4"), light: skinRamp("#EDB48E"), warm: skinRamp("#F2C98F", "#6A2A30"), tan: skinRamp("#D79A6E"), brown: skinRamp("#B5774F", "#4A1A34"), dark: skinRamp("#8A5238", "#3A1230") };

const DIMS = { legH: 50, torsoH: 56, tw: 27, hip: 24, hrx: 43, hry: 39, l1: 24, l2: 22, ar: 8.2, eyeR: 9, eyeGap: 34 };

// ---------------------------------------------------------------- hair
const HAIR_FR = {   // hairline polylines right → left, y relative to head centre; sideburn end first/last
  short: (rx) => [[rx - 1, 6], [rx - 4, -8], [rx - 13, -16], [12, -23], [2, -17], [-8, -24], [-rx + 12, -17], [-rx + 4, -8], [-rx + 1, 6]],
  side: (rx) => [[rx - 1, 4], [rx - 3, -6], [rx - 12, -12], [16, -15], [2, -22], [-10, -28], [-rx + 10, -18], [-rx + 3, -6], [-rx + 1, 4]],
  spiky: (rx) => [[rx - 2, 2], [rx - 5, -10], [18, -18], [8, -26], [0, -18], [-8, -26], [-18, -18], [-rx + 5, -10], [-rx + 2, 2]],
  buzz: (rx) => [[rx - 1, 2], [rx - 4, -14], [12, -26], [-12, -26], [-rx + 4, -14], [-rx + 1, 2]],
  bob: (rx) => [[rx - 9, 14], [rx - 5, -8], [24, -12], [10, -9], [-8, -13], [-24, -10], [-rx + 5, -8], [-rx + 9, 14]],
  long: (rx) => [[rx - 8, 12], [rx - 5, -8], [rx - 14, -15], [14, -22], [-4, -20], [-20, -12], [-rx + 6, -6], [-rx + 8, 12]],
  curly: (rx) => [[rx - 2, 4], [rx - 5, -10], [rx - 16, -17], [24, -14], [14, -19], [4, -13], [-6, -20], [-16, -14], [-rx + 14, -18], [-rx + 5, -10], [-rx + 2, 4]],
  center: (rx) => [[rx - 1, 4], [rx - 3, -8], [rx - 12, -15], [14, -21], [0, -27], [-14, -21], [-rx + 12, -15], [-rx + 3, -8], [-rx + 1, 4]],
  bangs: (rx) => [[rx - 1, 4], [rx - 5, -10], [rx - 16, -12], [10, -13], [0, -9], [-10, -13], [-rx + 16, -12], [-rx + 5, -10], [-rx + 1, 4]],
};
const HAIR_EX = { bob: (rx) => [[[rx + 4, 28], [rx - 4, 33]], [[-rx + 4, 33], [-rx - 4, 28]]], long: (rx) => [[[rx + 5, 12]], [[-rx - 5, 12]]] };
const HAIR_PAD = { short: 3, side: 4, spiky: 4, buzz: 1.5, bob: 3.5, long: 3.5, curly: 5, center: 3, bangs: 3 };
function hairFront(style, hy, rx, ry) {
  style = { bun: "side", pigtails: "bangs", braids: "center" }[style] ?? style;
  const fr = HAIR_FR[style]; if (!fr) return null;
  const pad = HAIR_PAD[style] ?? 3, ex = HAIR_EX[style]?.(rx) ?? [[], []], pts = [];
  const n = 30;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (Math.PI * i) / n; let p = pad;
    if (style === "spiky") p += i % 2 ? 6 : 0; else if (style === "curly") p += 2.5 * Math.cos(i * 1.7);
    pts.push([Math.cos(a) * (rx + p), hy + Math.sin(a) * (ry + p)]);
  }
  return [...pts, ...ex[0].map(([x, y]) => [x, hy + y]), ...fr(rx).map(([x, y]) => [x, hy + y]), ...ex[1].map(([x, y]) => [x, hy + y])];
}
function hairBack(style, hy, rx, ry, D, yt) {
  const head = ell(0, hy, rx + 4, ry + 3, 0, 30);
  if (style === "bob") return [head, [[-rx - 6, hy - 6], [-rx - 8, hy + 30], [-rx + 4, hy + 37], [rx - 4, hy + 37], [rx + 8, hy + 30], [rx + 6, hy - 6]]];
  if (style === "long") return [head, [[-rx - 5, hy - 4], [-rx - 9, hy + 26], [-D.tw - 6, yt + 32], [-D.tw + 6, yt + 44], [D.tw - 6, yt + 44], [D.tw + 6, yt + 32], [rx + 9, hy + 26], [rx + 5, hy - 4]]];
  if (style === "curly") { const o = []; for (let i = 0; i < 40; i++) { const a = (TAU * i) / 40; o.push([Math.cos(a) * (rx + 9 + 2.5 * Math.cos(a * 9)), hy - 6 + Math.sin(a) * (ry + 6 + 2.5 * Math.cos(a * 9))]); } return [o]; }
  if (style === "bun") return [head, ell(0, hy - ry - 7, 14, 13, 0, 24)];
  if (style === "pigtails") { const o = [head]; for (const sx of [-1, 1]) o.push(tube(bez([sx * (rx - 2), hy - 14], [sx * (rx + 22), hy - 6], [sx * (rx + 14), hy + 32]), 8, 4.5)); return o; }
  if (style === "braids") { const o = [head]; for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) o.push(ell(sx * (rx - 1 + (i % 2) * 1.5 + i * 0.7), hy + 8 + i * 8, 7 - i * 0.45, 5.6, 0, 14)); return o; }
  return [head];
}

// ---------------------------------------------------------------- the person
/** Draw one person. cfg: see makePerson. Returns { box, pt, face, faceBox }. */
export function drawPerson(c, cfg, cx, cy, z, t, s) {
  const v = s.v, S = z, D = { ...DIMS, ...cfg.dims }, TL = cfg.tilt ?? 0;
  const hopK = 5 * Math.sin(Math.PI * s.acc("happy")) * v.happy + 4 * Math.sin(Math.PI * s.acc("surprised")) * v.surp;
  const gx = cx, gy = cy + cfg.hh * S - hopK * S;
  const X = (x) => gx + x * S, Y = (y) => gy + y * S, PT = (p) => [X(p[0]), Y(p[1])], PL = (ps) => ps.map(PT);
  const bl = (polys, ramp, o = {}) => blob(c, polys.map(PL), { ramp, base: 3.5, gain: 2, slope: 0.8, ...o, thick: Math.max(4, (o.thick ?? 14) * S) });
  const fl = (poly, col, outline = OUT) => flat(c, [PL(poly)], col, { outline });
  const L = (x0, y0, x1, y1, col, w = 1) => { for (let k = 0; k < w; k++) c.line(R(X(x0)), R(Y(y0)) + k, R(X(x1)), R(Y(y1)) + k, col); };
  const dot = (x, y, col, w = 1, h = 1) => c.rect(R(X(x)), R(Y(y)), Math.max(1, R(w * S)), Math.max(1, R(h * S)), col);
  const breath = 0.8 * Math.sin(TAU * 0.42 * t), sway = 0.6 * Math.sin(TAU * 0.21 * t + 1);
  const yt = -(D.legH + D.torsoH) + breath, yb = -D.legH + 6, hy = yt - D.hry + 8 + 0.4 * Math.sin(TAU * 0.42 * t - 0.6), hx = sway * 0.5 + TL * 8;
  const hrx = D.hrx, hry = D.hry, tw = D.tw, hip = D.hip;
  const skin = cfg.skin, hair = cfg.hair, shirt = cfg.shirt, pants = cfg.pants, shoe = cfg.shoe, sleeve = cfg.sleeve ?? shirt;

  // ---- aim at the target prop (blended by its presence)
  const shX = X(0), shY = Y(yt + 12);
  let aim = null, wR = 1;
  if (s.look) { const dx = s.look[0] - shX, dy = s.look[1] - shY, d = Math.hypot(dx, dy) || 1; aim = [dx / d, dy / d]; wR = sm(dx, -22 * S, 22 * S); }
  const aimA = aim ? lerpAng(1.5, Math.atan2(aim[0], aim[1]), s.lookK) : 1.5;     // from straight down, + toward the target side
  const aimR = Math.max(0.4, Math.min(2.45, aimA)), aimLm = Math.max(0.4, Math.min(2.45, aim ? lerpAng(1.5, Math.atan2(-aim[0], aim[1]), s.lookK) : 1.5));
  const look = aim ? [aim[0] * v.look * s.lookK, (0.05 + aim[1] * 0.6) * v.look * s.lookK] : [0, 0];
  // ---- arm poses (local, + = outward) [shoulder, elbow-bend], mixed by the state weights
  const idleA = 0.1 + 0.03 * Math.sin(TAU * 0.42 * t + 0.5);
  let AR = [idleA + 0.03, 0.08], AL = [idleA, 0.08];
  AR = mixA(AR, [2.35, -0.2 + 0.42 * Math.sin(TAU * 2.3 * t)], v.wave);
  AR = mixA(AR, [0.5, 1.05 + 0.28 * Math.sin(TAU * 1.4 * t)], v.talk); AL = mixA(AL, [0.25, 0.5 + 0.2 * Math.sin(TAU * 1.1 * t + 1)], v.talk);
  AR = mixA(AR, [aimR, 0], v.point * wR); AL = mixA(AL, [aimLm, 0], v.point * (1 - wR));
  AR = mixA(AR, [2.45, 0.35 + 0.15 * Math.sin(TAU * 2 * t)], v.happy); AL = mixA(AL, [2.45, 0.35 + 0.15 * Math.sin(TAU * 2 * t + 1)], v.happy);
  AR = mixA(AR, [0.5, 2.05], v.surp); AL = mixA(AL, [0.5, 2.05], v.surp);
  const shoulderY = yt + 12;

  // ================================================================ drawing
  shadow(c, gx, gy + 1.5 * S + hopK * S, (34 - hopK) * S, 6 * S);
  const hb = hairBack(hair.style, hy, hrx, hry, D, yt);
  if (hair.style !== "bald" && hb && !["buzz", "short", "side", "spiky", "center", "bangs"].includes(hair.style)) bl(hb.map((p) => p.map(([x, y]) => [x + hx, y])), hair.ramp, { thick: 12 });
  if (hair.tie) for (const sx of [-1, 1]) if (hair.style === "pigtails") bl([ell(sx * (hrx - 2) + hx, hy - 14, 5, 5, 0, 12)], hair.tie, { thick: 4 });

  // ---- legs, shoes, skirt
  const legX = D.hip * 0.46;
  for (const sx of [-1, 1]) {
    const lp = [[sx * legX, yb - 8], [sx * (legX + 0.5), -9]];
    if (cfg.legs === "skin") { bl([tube(lp, 8.2, 7.6)], skin, { thick: 8 }); bl([tube([lp[0], [lp[0][0], -34]], 9.2, 9)], pants, { thick: 8 }); }
    else if (cfg.legs === "skirt") bl([tube(lp, 8.2, 7.6)], cfg.legSkin ?? skin, { thick: 8 });
    else bl([tube(lp, 9.2, 8.8)], pants, { thick: 9 });
  }
  for (const sx of [-1, 1]) bl([ell(sx * (legX + 2.5), -6.5, 14, 7.5, 0, 22)], shoe, { thick: 6, base: 3.4 });
  if (cfg.legs === "skirt") bl([[[-hip, yb - 12], [hip, yb - 12], [hip + 9, -32], [-hip - 9, -32]]], cfg.skirt ?? pants, { thick: 12 });
  if (cfg.cuffs) for (const sx of [-1, 1]) L(sx * (legX - 8), -13, sx * (legX + 9), -13, cfg.cuffs);

  // ---- torso
  const tor = (inset = 0) => [[-tw * 0.55, yt + inset], [0, yt - 2 + inset], [tw * 0.55, yt + inset], [tw - inset, yt + 10], [tw * 0.98 - inset, (yt + yb) / 2], [hip - inset, yb - 4], [hip * 0.6, yb - inset * 0.3], [0, yb + 1], [-hip * 0.6, yb - inset * 0.3], [-hip + inset, yb - 4], [-tw * 0.98 + inset, (yt + yb) / 2], [-tw + inset, yt + 10]];
  const smooth = (pts) => { const n = pts.length, out = []; for (let i = 0; i < n; i++) { const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n]; for (let k = 0; k < 4; k++) { const u = k / 4, u2 = u * u, u3 = u2 * u; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * u + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * u2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * u3))); } } return out; };
  bl([smooth(tor())], shirt, { thick: 16 });
  const tx0 = yt + 8;                                                        // chin line: things below show
  if (cfg.neck === "v") fl([[-9, tx0 - 1], [9, tx0 - 1], [0, tx0 + 14]], skin[4]);
  if (cfg.collar) { for (const sx of [-1, 1]) fl([[sx * 1.5, tx0 - 1], [sx * 13, tx0 - 1], [sx * 12, tx0 + 9], [sx * 2, tx0 + 3]], cfg.collar); }
  if (cfg.scarf) fl([[-12, tx0 - 1], [12, tx0 - 1], [0, tx0 + 14]], cfg.scarf);
  if (cfg.stripe) { for (let k = 0; k < 2; k++) c.rect(R(X(-tw + 4)), R(Y(tx0 + 22 + k * 8)), R((tw * 2 - 8) * S), Math.max(1, R(3 * S)), cfg.stripe); }

  // ---- panels (coat / cardigan / vest) and bib (overalls / apron)
  const panel = (hem, wHem, oTop, oBot, ramp, o = {}) => {
    for (const sx of [-1, 1]) {
      const P = [[sx * oTop, tx0 - 2], [sx * tw * 0.5, yt - 1], [sx * (tw + 1.5), yt + 9], [sx * (tw + 2.5), (yt + hem) / 2 - 8], [sx * wHem, hem - 3], [sx * (wHem - 3), hem], [sx * oBot, hem]];
      bl([P], ramp, { thick: o.thick ?? 15, base: o.base ?? 3.6 });
    }
  };
  if (cfg.coat) {
    const co = cfg.coat; panel(co.hem ?? -20, hip + 10, 10, 5, co.ramp, { base: 3.9 });
    for (const sx of [-1, 1]) { fl([[sx * 10, tx0 - 2], [sx * 17, tx0 - 2], [sx * 13, tx0 + 12], [sx * 6, tx0 + 4]], co.ramp[6]); }       // lapels
    if (co.pocket) { const px0 = -tw + 2; c.rect(R(X(px0)), R(Y(yt + 34)), R(12 * S), Math.max(1, R(1 * S)), co.ramp[3]); c.rect(R(X(px0)), R(Y(yt + 34)), Math.max(1, R(1 * S)), R(11 * S), co.ramp[3]); c.rect(R(X(px0 + 12)), R(Y(yt + 34)), Math.max(1, R(1 * S)), R(11 * S), co.ramp[3]); c.rect(R(X(px0)), R(Y(yt + 45)), R(13 * S), Math.max(1, R(1 * S)), co.ramp[3]);
      dot(px0 + 3, yt + 30, "#E04050", 2, 5); dot(px0 + 7, yt + 31, "#4A7CE0", 2, 4); }
  }
  if (cfg.cardigan) { const co = cfg.cardigan; panel(yb + 8, hip + 4, 9, 3, co.ramp, { base: 3.7 }); for (let k = 0; k < 3; k++) dot(-7, yt + 26 + k * 10, co.button ?? "#F4CA50", 3, 3); }
  if (cfg.vest) { const vs = cfg.vest; panel(yb + 2, hip + 3, 12, 8, vs.ramp, { base: 3.7 });
    for (const sx of [-1, 1]) { fl([[sx * 14, yt + 3], [sx * 19, yt + 3], [sx * 19, yb - 2], [sx * 14, yb - 2]], vs.band); }
    L(-hip - 1, yb - 14, -3, yb - 14, vs.band, 3); L(3, yb - 14, hip + 1, yb - 14, vs.band, 3); }
  if (cfg.bib) { const b = cfg.bib; for (const sx of [-1, 1]) bl([[[sx * 9, tx0 + 4], [sx * 14, tx0 + 4], [sx * 20, yt + 4], [sx * 15, yt + 2]]], b.ramp, { thick: 4, base: 3.6 });
    bl([[[-14, tx0 + 15], [14, tx0 + 15], [hip - 1, tx0 + 40], [hip, yb - 2], [0, yb + 1], [-hip, yb - 2], [-hip + 1, tx0 + 40]]], b.ramp, { thick: 12, base: 3.6 });
    dot(-12, tx0 + 18, b.button ?? "#F4CA50", 3, 3); dot(10, tx0 + 18, b.button ?? "#F4CA50", 3, 3);
    c.rect(R(X(-8)), R(Y(tx0 + 30)), R(16 * S), Math.max(1, R(S)), b.ramp[2]); c.rect(R(X(-8)), R(Y(tx0 + 30)), Math.max(1, R(S)), R(10 * S), b.ramp[2]); c.rect(R(X(8)), R(Y(tx0 + 30)), Math.max(1, R(S)), R(10 * S), b.ramp[2]); c.rect(R(X(-8)), R(Y(tx0 + 40)), R(17 * S), Math.max(1, R(S)), b.ramp[2]); }
  if (cfg.apron) { const a = cfg.apron; for (const sx of [-1, 1]) bl([[[sx * 8, tx0 + 4], [sx * 13, tx0 + 4], [sx * 19, yt + 4], [sx * 14, yt + 2]]], a.ramp, { thick: 4 });
    bl([[[-15, tx0 + 10], [15, tx0 + 10], [hip + 3, yb - 2], [hip + 6, -22], [-hip - 6, -22], [-hip - 3, yb - 2]]], a.ramp, { thick: 14, base: 3.7 });
    c.rect(R(X(-9)), R(Y(-44)), R(18 * S), Math.max(1, R(S)), a.ramp[2]); c.rect(R(X(-9)), R(Y(-44)), Math.max(1, R(S)), R(11 * S), a.ramp[2]); c.rect(R(X(9)), R(Y(-44)), Math.max(1, R(S)), R(11 * S), a.ramp[2]); }
  if (cfg.buttons) for (let k = 0; k < 3; k++) for (const sx of [-1, 1]) { dot(sx * 5 - 1, tx0 + 6 + k * 11, cfg.buttons[0], 3, 3); dot(sx * 5 - 1, tx0 + 6 + k * 11, cfg.buttons[1], 1, 1); }
  if (cfg.tie) { fl([[-4.5, tx0], [4.5, tx0], [3.5, tx0 + 7], [-3.5, tx0 + 7]], cfg.tie[5]); fl([[-3.5, tx0 + 7], [3.5, tx0 + 7], [6.5, tx0 + 30], [0, tx0 + 38], [-6.5, tx0 + 30]], cfg.tie[4]); L(-1, tx0 + 10, -3, tx0 + 28, cfg.tie[6]); }
  if (cfg.bow) { fl([[0, tx0 + 4], [-12, tx0 - 2], [-12, tx0 + 10]], cfg.bow[4]); fl([[0, tx0 + 4], [12, tx0 - 2], [12, tx0 + 10]], cfg.bow[4]); fl([[-3.5, tx0 + 0.5], [3.5, tx0 + 0.5], [3.5, tx0 + 8], [-3.5, tx0 + 8]], cfg.bow[3]); }
  if (cfg.badge) { const b = cfg.badge; for (const sx of [-1, 1]) L(sx * 11, tx0 + 2, sx * 4, tx0 + 36, b.lan, 2); fl([[-8, tx0 + 36], [8, tx0 + 36], [8, tx0 + 56], [-8, tx0 + 56]], "#F2F2FA"); c.rect(R(X(-8)), R(Y(tx0 + 36)), R(16 * S), R(4 * S), b.lan); c.rect(R(X(-4)), R(Y(tx0 + 43)), R(8 * S), R(6 * S), b.photo ?? "#9AA6C4"); c.rect(R(X(-5)), R(Y(tx0 + 51)), R(10 * S), Math.max(1, R(S)), "#6A6A8A"); }
  if (cfg.star) { const st = [], r0 = 9, r1 = 4; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? r1 : r0; st.push([Math.cos(a) * r, yt + 38 + Math.sin(a) * r]); } fl(st, cfg.star, cfg.shirt[1]); }
  if (cfg.stetho) {
    const sc = "#2A2E40", sh = "#5A6078";
    for (const sx of [-1, 1]) { const pts = bez([sx * 11, tx0 - 1], [sx * 16, tx0 + 34], [3, tx0 + 36], 14); for (let i = 0; i < pts.length - 1; i++) { c.line(R(X(pts[i][0])), R(Y(pts[i][1])), R(X(pts[i + 1][0])), R(Y(pts[i + 1][1])), sc); c.line(R(X(pts[i][0])) + 1, R(Y(pts[i][1])), R(X(pts[i + 1][0])) + 1, R(Y(pts[i + 1][1])), sh); } }
    bl([ell(3, tx0 + 37, 5.4, 5.4, 0, 12)], ["#2A2E40", "#4A5068", "#6A728C", "#8E97B0", "#B8C0D4", "#D8DEEC", "#EEF2FA", "#FFFFFF"], { thick: 4, base: 4 });
  }

  // ---- arms
  const arm = (side, ang) => {
    const sp = [side * (tw - 3), shoulderY + (side === 1 ? 0 : 0.5)];
    const el = [sp[0] + side * Math.sin(ang[0]) * D.l1, sp[1] + Math.cos(ang[0]) * D.l1], a2 = ang[0] + ang[1];
    const wr = [el[0] + side * Math.sin(a2) * D.l2, el[1] + Math.cos(a2) * D.l2];
    const ctrl = [2 * el[0] - (sp[0] + wr[0]) / 2, 2 * el[1] - (sp[1] + wr[1]) / 2], path = bez(sp, ctrl, wr, 10);
    const sleeveEnd = cfg.shortSleeve ? 4 : 11;
    if (cfg.shortSleeve) bl([tube(path, D.ar, D.ar - 1.4)], skin, { thick: 8 });
    bl([tube(path.slice(0, sleeveEnd), D.ar + (cfg.shortSleeve ? 0.8 : 0), D.ar - (cfg.shortSleeve ? 0.2 : 1.4))], sleeve, { thick: 8, base: cfg.sleeveBase ?? 3.5 });
    const fd = [side * Math.sin(a2), Math.cos(a2)];
    const pw = v.point * (side === 1 ? wR : 1 - wR);
    if (pw > 0.02) { const g0 = [wr[0] + fd[0] * 6, wr[1] + fd[1] * 6], g1 = [wr[0] + fd[0] * 16, wr[1] + fd[1] * 16]; const cc = c; c = fade(cc, clamp01(pw * 1.2)); bl([tube([g0, g1], 3.6, 3)], cfg.glove ?? skin, { thick: 3 }); c = cc; }
    bl([ell(wr[0] + fd[0] * 3, wr[1] + fd[1] * 3, 7.6, 7.6, 0, 16)], cfg.glove ?? skin, { thick: 7 });
    if (cfg.cuff) { const k = path[9]; bl([ell(k[0], k[1], D.ar + 0.3, 3.4, a2 * -side + 0, 10)], cfg.cuff, { thick: 3 }); }
    return wr;
  };
  const order = wR > 0.5 ? [-1, 1] : [1, -1];
  for (const sd of order) arm(sd, sd === 1 ? AR : AL);

  // ---- head
  for (const sx of [-1, 1]) bl([ell(hx + sx * (hrx + 0.5), hy + 10, 5.5, 7, 0, 12)], skin, { thick: 4 });
  bl([ell(hx, hy, hrx, hry, 0, 40)], skin, { thick: 22, base: 3.9, gain: 1.7, slope: 0.7 });
  // ---- face
  const talkW = v.talk * (0.5 - 0.5 * Math.cos(TAU * (2.9 * t + 0.4 * Math.sin(TAU * 0.7 * t))));
  const hap = v.happy, sur = v.surp, ey = hy + 9, gap = D.eyeGap;
  const eyeR = D.eyeR * S * (1 + 0.1 * sur), eyeRy = D.eyeR * 1.12 * S * (1 + 0.1 * sur);
  const bk = blinkAt(t, cfg.blink?.[0] ?? 4.3, cfg.blink?.[1] ?? 1.1);
  blush(c, X(hx - 28), Y(hy + 22), 6 * S, 3.4 * S, undefined, clamp01(0.6 * (cfg.blush ?? 1) + 0.4 * hap)); blush(c, X(hx + 28), Y(hy + 22), 6 * S, 3.4 * S, undefined, clamp01(0.6 * (cfg.blush ?? 1) + 0.4 * hap));
  for (const sx of [-1, 1]) {
    eye(c, X(hx + sx * gap / 2), Y(ey), eyeR, { ry: eyeRy, iris: cfg.iris, look, blink: bk, a: 1 - hap });
    if (hap > 0.02) {     // happy ^ eye (fades in over the open eye)
      const g = fade(c, hap), ex = X(hx + sx * gap / 2), eyy = Y(ey), Rr = Math.round(8.4 * S);
      for (let i = -Rr; i <= Rr; i++) { const u = i / Rr, yy = eyy + 3 * S - 6.5 * S * (1 - u * u); g.px(ex + i, R(yy), OUT); g.px(ex + i, R(yy) + 1, OUT); if (Math.abs(i) < Rr * 0.6) g.px(ex + i, R(yy) - 1, OUT); }
    }
  }
  const brK = cfg.hair.ramp[2], bRaise = 1.5 * sur * 2 + 1.5 * hap, bTilt = 0.4 * talkW, th = Math.max(1, R(2 * S));
  for (const sx of [-1, 1]) {
    const yy = hy - 4 - bRaise, xi = hx + sx * 8, xo = hx + sx * 25, yi = yy - bTilt * 1.5 + 0.6 * v.look * 0, yo = yy + 1.2 - 0.8 * sur;
    for (let k = 0; k < th; k++) c.line(R(X(xi)), R(Y(yi)) + k, R(X(xo)), R(Y(yo)) + k, brK);
  }
  c.rect(R(X(hx) - 1), R(Y(hy + 16)), Math.max(1, R(2 * S)), Math.max(1, R(1.6 * S)), skin[3]);              // nose hint
  if (cfg.freckles) for (const [fx, fy] of [[-24, 17], [-20, 20], [-16, 17], [16, 17], [20, 20], [24, 17]]) c.px(R(X(hx + fx)), R(Y(hy + fy)), skin[2]);
  if (cfg.stache) { const m = cfg.stache; bl([[[-11, hy + 22], [-4, hy + 17], [0, hy + 19], [4, hy + 17], [11, hy + 22], [8, hy + 25], [0, hy + 21], [-8, hy + 25]].map(([x, y]) => [x + hx, y])], m, { thick: 3, base: 3.6 }); }
  // mouth: continuous width / curve / openness
  const mw = (5.4 * (1 - 0.45 * sur) + 1.5 * hap + 0.7 * v.wave) * S, mh = (2.6 * (1 - sur) + 1.4 * hap) * S, mo = Math.max(0.9 * talkW * 1.0, 0.0) * 5.4 * S + (hap * 0.9 + v.wave * 0.28) * 5 * S + sur * 5.5 * S;
  mouth(c, X(hx), Y(hy + 28.5 - 1.5 * sur), mw, mh, mo);
  // ---- hair front
  const hf = hairFront(hair.style, hy, hrx, hry);
  if (hf && !cfg.hatCoversHair) bl([hf.map(([x, y]) => [x + hx, y])], hair.ramp, { thick: 12, base: 3.5 });
  else if (hf) bl([hf.map(([x, y]) => [x + hx, y])], hair.ramp, { thick: 12, base: 3.5 });
  if (hair.style === "curly" && !hair.ruff) { /* curls: a few lit dots */ }
  // ---- eyewear
  if (cfg.glasses) {
    const gc = cfg.glasses, r = Math.round(12.2 * S);
    for (const sx of [-1, 1]) { const ex = R(X(hx + sx * gap / 2)), eyy = R(Y(ey)); c.ring(ex, eyy, r, gc); c.ring(ex, eyy, r - 1, gc); c.px(ex - Math.round(r * 0.55), eyy - Math.round(r * 0.55), "#FFFFFF"); c.px(ex - Math.round(r * 0.55) + 1, eyy - Math.round(r * 0.55), "#FFFFFF"); L(hx + sx * (gap / 2 + 12), ey - 3, hx + sx * (hrx - 1), ey - 6, gc); }
    L(hx - gap / 2 + 12, ey - 3, hx + gap / 2 - 12, ey - 3, gc, 1);
  }
  if (cfg.goggles) {
    const gg = cfg.goggles, gy0 = hy - 26;
    fl([[-hrx + 1 + hx, gy0 - 5], [hrx - 1 + hx, gy0 - 5], [hrx - 1 + hx, gy0 + 5], [-hrx + 1 + hx, gy0 + 5]], gg.strap, OUT);
    for (const sx of [-1, 1]) { bl([ell(hx + sx * 15, gy0, 12, 11, 0, 20)], gg.frame, { thick: 6, base: 3.8 }); fl(ell(hx + sx * 15, gy0, 8.2, 7.4, 0, 18), gg.lens, OUT); dot(sx * 15 + hx - 5, gy0 - 4, "#FFFFFF", 3, 2); dot(sx * 15 + hx - 2, gy0 - 1, "#E8FCFF", 2, 1); }
    fl([[hx - 4, gy0 - 2], [hx + 4, gy0 - 2], [hx + 4, gy0 + 3], [hx - 4, gy0 + 3]], gg.frame);
  }
  // ---- hats
  const top = hy - hry;
  if (cfg.hat === "chef") {
    const W = ["#3A3A58", "#7A7AA2", "#A8A8C8", "#D2D2E4", "#E8E8F4", "#F4F4FA", "#FBFBFF", "#FFFFFF"];
    bl([[[-hrx + 4 + hx, hy - 18], [hrx - 4 + hx, hy - 18], [hrx - 5 + hx, top + 8], [-hrx + 5 + hx, top + 8]], ell(hx - 24, top - 8, 19, 17, 0, 24), ell(hx + 24, top - 8, 19, 17, 0, 24), ell(hx, top - 17, 24, 22, 0, 28), ell(hx - 11, top - 2, 20, 14, 0, 22), ell(hx + 11, top - 2, 20, 14, 0, 22)], W, { thick: 16, base: 4.1, gain: 1.6 });
    for (const dx of [-14, -5, 5, 14]) L(hx + dx, hy - 16, hx + dx * 0.9, top + 8, W[3]);
    L(-hrx + 5 + hx, hy - 17, hrx - 5 + hx, hy - 17, W[3]);
  }
  if (cfg.hat === "hard") {
    const H = ["#7A4806", "#A86808", "#D88A0C", "#F5B418", "#FFD030", "#FFE060", "#FFEE90", "#FFF8C8"];
    bl([ell(hx, hy - 14, hrx + 2, hry * 0.72, 0, 36).filter(([, y]) => y <= hy - 12).concat([[hrx + 2 + hx, hy - 12], [-hrx - 2 + hx, hy - 12]])], H, { thick: 15, base: 3.9 });
    bl([[[-hrx - 8 + hx, hy - 15], [hrx + 8 + hx, hy - 15], [hrx + 10 + hx, hy - 9], [hrx + 2 + hx, hy - 6], [-hrx - 2 + hx, hy - 6], [-hrx - 10 + hx, hy - 9]]], H, { thick: 3, base: 3.9 });
    bl([[[-5 + hx, hy - 15], [5 + hx, hy - 15], [4 + hx, top - 2], [-4 + hx, top - 2]]], H, { thick: 3, base: 5 });
  }
  if (cfg.hat === "straw") {
    const Sw = ["#5A3A06", "#8A5C10", "#BC8A20", "#DCAA3A", "#EEC456", "#F8D878", "#FDE9A4", "#FFF5CE"];
    bl([ell(hx, hy - 17, hrx + 20, 12, 0, 40)], Sw, { thick: 8, base: 3.8 });
    bl([ell(hx, hy - 25, hrx - 6, 28, 0, 32).filter(([, y]) => y <= hy - 17).concat([[hrx - 6 + hx, hy - 17], [-hrx + 6 + hx, hy - 17]])], Sw, { thick: 14, base: 3.9 });
    fl([[-hrx + 6 + hx, hy - 24], [hrx - 6 + hx, hy - 24], [hrx - 5 + hx, hy - 17], [-hrx + 5 + hx, hy - 17]], cfg.hatBand ?? "#C8383A");
    for (let k = -hrx + 8; k < hrx - 6; k += 6) c.px(R(X(hx + k)), R(Y(top - 1 + 12)), Sw[2]);
  }
  return { box: { x0: gx - cfg.hw * S, y0: gy - cfg.hh * 2 * S, x1: gx + cfg.hw * S, y1: gy + 2 * S }, pt: [X(hx), Y(hy)], face: [X(hx), Y(hy + 8)], faceBox: { x0: X(hx - 44), y0: Y(hy - 40), x1: X(hx + 44), y1: Y(hy + 40) } };
}

/** Mouth: half-width w, smile curve h, openness o (all screen px): a smile arc that opens continuously into a D / O. */
function mouth(c, x, y, w, h, o) {
  const W = Math.max(2, R(w)), DK = "#3A0A18", TG = "#F07090";
  for (let i = -W; i <= W; i++) {
    const u = i / W, k = 1 - u * u, yt = y + h * k, top = R(yt), bot = R(yt + o * Math.pow(k, 0.7));
    for (let Y = top; Y <= bot; Y++) c.px(R(x) + i, Y, Y === top || Y === bot || Math.abs(i) === W ? OUT : (Y - top) / Math.max(1, bot - top) > 0.55 ? TG : DK);
  }
}

// ---------------------------------------------------------------- the item factory
const STATES = {
  idle: [0.5, "stands relaxed, breathes, blinks"],
  talk: [0.4, "talks: mouth moves, one hand gestures", "blip"],
  point: [0.45, "points an arm at its target prop and looks at it", "whoosh"],
  wave: [0.5, "raises a hand and waves, smiling", "blip"],
  happy: [0.45, "cheers: both arms up, happy closed eyes, a little hop", "rise"],
  surprised: [0.35, "hops: hands up, eyes wide, mouth an O", "rise"],
};
const ZERO = { look: 0, point: 0, wave: 0, talk: 0, happy: 0, surp: 0 };
/** Build the catalog item of one person from a config (see assets/adult.mjs). */
export function makePerson(cfg) {
  const st = {
    idle: { ...ZERO }, talk: { ...ZERO, talk: 1 }, point: { ...ZERO, look: 1, point: 1 }, wave: { ...ZERO, wave: 1 },
    happy: { ...ZERO, happy: 1 }, surprised: { ...ZERO, surp: 1 },
  };
  return {
    kind: cfg.kind, covers: cfg.covers, source: "init (new)", desc: cfg.desc, hw: cfg.hw, hh: cfg.hh, start: "stands, breathes, blinks",
    states: STATES, base: { ...ZERO }, st, demo: { target: true }, notes: cfg.notes ?? "",
    draw(c, cx, cy, z, t, s) { return drawPerson(c, cfg, cx, cy, z, t, s); },
  };
}
export { sm, clamp01, lerpAng, mixA, TAU, OUT };
