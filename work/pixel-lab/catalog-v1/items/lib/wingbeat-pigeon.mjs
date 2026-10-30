// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-wingbeat/film/levels/city-pigeon.mjs (pigeonWing, pigeonFrames, drawPigeon, smallPigeon verbatim); changes: imports re-pointed (./cute.mjs, spriteCache from ./speed-jungle-kit.mjs, ./wingbeat-ocean-wing.mjs). The scaled drawer drawPigeonK is appended below.
// LV2's cute plump rock pigeon facing the camera (hovering, wings flapping 6 times a second from the caller's phase):
// round blue-grey head, an iridescent green-and-purple neck with a sliding sheen, a plump pale blue-grey breast, grey
// wings with the two black wing bars and dark primaries, a dark-banded tail fan, orange eyes with pale eye-rings and two
// highlights, a small dark beak with the white cere, pink blush, pink feet tucked up.
// Also the small side-view pigeons of the plaza and the ledges (pecking, cooing, walking poses as cached sprites).
// drawPigeon(c, x, y, o): (x, y) = head centre (screen). Wing elevation: e = cos(2π·ph)·amt; the hand lags the arm a
// little and folds on the upstroke (the real tip-reversal of a flapping pigeon). Body sprite cached per roll angle.
import { blob, ell, tube, eye, blush, fade, mix, bayer } from "./cute.mjs";
import { spriteCache } from "./speed-jungle-kit.mjs";
import { wingFrame, drawWing } from "./wingbeat-ocean-wing.mjs";
import { blockView } from "./wingbeat-scale.mjs";

const R = Math.round, TAU = Math.PI * 2;
const HEADR = ["#1A1E2E", "#2C334A", "#424C68", "#5A6688", "#7380A2", "#8C98B8", "#A8B2CC", "#C8D0E2"];
const BODY = ["#22263A", "#383E56", "#525A76", "#6E7896", "#8A94B2", "#A6B0CA", "#C2CADE", "#DEE4F0"];
const NECK = ["#0C2420", "#123C34", "#1A5648", "#22705A", "#2E8C6A", "#46A87C", "#70C496", "#A8E0BC"];
const PURP = ["#2A1238", "#44205A", "#64307E", "#8446A0", "#A462BE", "#C086D4", "#DAB0E6", "#F0DAF6"];
const WINGR = ["#262A3A", "#3A4054", "#525A72", "#6C7590", "#8790AC", "#A0AAC4", "#BAC2D8", "#D6DCEA"];
const TAILR = ["#14161E", "#22252F", "#333744", "#474C5C", "#5E6476", "#787E92", "#9298AC", "#B0B6C8"];
const IRIS = ["#3A1004", "#6E2206", "#A8400C", "#D8661A", "#F28A2E", "#FAB058", "#FFD690"];
const FEET = ["#4A1420", "#7A2434", "#AA3A4C", "#D45A6A", "#EC8088", "#F6A8AC", "#FCD0D0", "#FFECEC"];
const OUT = "#141626";
const SPR = spriteCache(48);
const PIV = [0, 56];
const rotP = (u, v, tilt) => { const cs = Math.cos(tilt), sn = Math.sin(tilt), dx = u - PIV[0], dy = v - PIV[1]; return [PIV[0] + dx * cs - dy * sn, PIV[1] + dx * sn + dy * cs]; };

function bodySprite(tilt, k = 1) {
  const key = `pig:${tilt.toFixed(2)}:${k}`, W = 150, H = 180, ox = 75, oy = 50;
  return SPR(key, Math.ceil(W * k) + 1, Math.ceil(H * k) + 1, Math.round(ox * k), Math.round(oy * k), (G) => {
    // film grid units; at k ≠ 1 every grid pixel becomes a k×k block (catalog scaling, see lib/wingbeat-scale.mjs)
    const g = k === 1 ? G : blockView(G, k), x = ox, y = oy;
    const T = (pts) => pts.map(([u, v]) => { const [a, b] = rotP(u, v, tilt); return [x + a, y + b]; });
    const E = (u, v, rx, ry, rot = 0) => T(ell(u, v, rx, ry, rot, 56));
    // tail fan: grey feathers with the dark terminal band (mostly hidden behind the belly)
    blob(g, [T([[-14, 84], [14, 84], [17, 100], [8, 105], [0, 106], [-8, 105], [-17, 100]])], { ramp: TAILR, thick: 6, base: 4.6, outline: OUT });
    g.poly(T([[-16.4, 98], [16.4, 98], [17, 100], [8, 105], [0, 106], [-8, 105], [-17, 100]]), "#2C303C");
    for (const k of [-8, 0, 8]) { const [ax, ay] = T([[k * 0.7, 90]])[0], [bx, by] = T([[k * 1.1, 103]])[0]; g.line(R(ax), R(ay), R(bx), R(by), "#3A3E4C"); }
    // pink feet tucked up under the belly
    for (const sd of [-1, 1]) { blob(g, [E(sd * 12, 93, 6.5, 4.6)], { ramp: FEET, thick: 3, base: 4, outline: "#5A1A28" }); for (const k of [-3, 0, 3]) { const [px, py] = T([[sd * 12 + k, 97]])[0]; g.px(R(px), R(py), "#7A2434"); } }
    // plump body
    blob(g, [E(0, 56, 47, 40)], { ramp: BODY, thick: 22, base: 4.1, gain: 2.2, slope: 1.2, outline: OUT, litOutline: "#4A5270" });
    // breast feather scallops
    for (const [u, v] of [[-14, 70], [0, 75], [14, 70], [-7, 84], [7, 84], [-26, 60], [26, 60]]) { const [px, py] = T([[u, v]])[0]; for (let i = -3; i <= 3; i++) g.px(R(px + i), R(py + Math.abs(i) * 0.5), i === 0 ? "#A6B0CA" : "#B6BED4"); }
    // iridescent neck: green at the front, purple at the sides, shaded from the upper left, dithering softly into the breast
    for (let v = 12; v <= 58; v++) for (let u = -44; u <= 44; u++) {
      const q = (u / 42) ** 2 + ((v - 35) / 22) ** 2; if (q > 1) continue;
      const [px, py] = T([[u, v]])[0], X = R(px), Y = R(py); if (v > 35 && bayer(X, Y) < (q - 0.5) * 2.0) continue;
      if (q > 0.9 && v <= 35) { g.px(X, Y, OUT); continue; }
      const side = Math.min(1, Math.max(0, (Math.abs(u) - 10) / 24)), lv = 6.9 - (v - 14) / 16 - (u > 0 ? 0.9 : 0) - q * 1.2, lo = Math.max(1, Math.min(7, Math.floor(lv + (bayer(X, Y) - 0.5) * 0.8)));
      g.px(X, Y, side > bayer(X + 1, Y) ? PURP[lo] : NECK[lo]);
    }
    // head (big, chibi)
    blob(g, [E(0, 0, 40, 36)], { ramp: HEADR, thick: 20, base: 4.0, gain: 2.3, slope: 0.8, outline: OUT, litOutline: "#3A4462" });
    // blush
    for (const sd of [-1, 1]) { const [bx, by] = T([[sd * 27, 13]])[0]; blush(g, bx, by, 6.5, 3.2, "#F48AA4"); }
    // white cere and the little dark beak pointing down
    blob(g, [T(ell(0, 9, 6.5, 4.4, 0, 20))], { ramp: ["#5A5C6A", "#8A8C9A", "#B4B6C2", "#D2D4DC", "#E6E8EE", "#F4F4F8", "#FCFCFE", "#FFFFFF"], thick: 3, base: 4.6, outline: "#3A3C4C" });
    blob(g, [T([[-4.8, 11], [4.8, 11], [3.6, 18], [0, 24], [-3.6, 18]])], { ramp: ["#0E0E14", "#1C1C26", "#2C2C3A", "#3E3E50", "#525266", "#68687E", "#808096", "#9A9AB0"], thick: 3, base: 3.6, outline: "#0A0A10" });
    { const [px, py] = T([[-1.2, 13]])[0]; g.px(R(px), R(py), "#9A9AB0"); g.px(R(px), R(py) + 1, "#808096"); }
  });
}

/** Wing elevations of the pigeon (rad, + = up) and the upstroke fold, from the caller's phase / amount. */
export function pigeonWing(ph, amt) {
  const e = Math.cos(TAU * ph) * amt, eh = Math.cos(TAU * (ph - 0.08)) * amt, fold = Math.max(0, -Math.sin(TAU * (ph - 0.04))) * amt;
  return { e, fold, ea: 0.14 + 0.62 * e, eh: 0.04 + 0.92 * eh - 0.3 * fold };
}
const LEAD = (u) => 8 * Math.pow(1 - u, 0.3) * (u > 0.96 ? (1 - u) / 0.04 : 1);
const TRAIL = (u) => 27 * Math.pow(Math.max(0, 1 - Math.pow(u, 2.1)), 0.55) + (u < 0.12 ? 5 * (1 - u / 0.12) : 0) + 1.2 * Math.abs(Math.sin(u * 48)) * (u > 0.1 ? 1 : 0);
const LOOK = {
  ramp: WINGR, outline: OUT, litOutline: "#3A4054", thick: 8,
  coverts: "#B4BCD2", covW: 4.5, covTo: 0.5,
  bars: [[0.06, 0.44, 0.44, 0.56, "#16181F"], [0.06, 0.46, 0.7, 0.8, "#16181F"]],
  under: "#E6EAF2", underW: 2.5, underTo: 0.6, tip: "#3A3E4E", tipFrom: 0.6,
  feathers: { from: 0.5, every: 0.06, col: "#1E2130", depth: 0.6, handFrom: 0.5, lean: 0.03 },
};
export function pigeonFrames(x, y, tilt, ph, amt) {
  const W = pigeonWing(ph, amt), out = [];
  for (const sd of [-1, 1]) {
    const [sx, sy] = rotP(sd * 33, 40, tilt);
    out.push({ sd, F: wingFrame([x + sx, y + sy], sd, { La: 52, Lh: 78 * (1 - 0.22 * W.fold), ea: W.ea, eh: W.eh, rot: tilt, lead: LEAD, trail: TRAIL, n: 32, bend: 12 }) });
  }
  return { ...W, wings: out };
}

/**
 * o: tilt (roll), ph (wing phase, beats), amt, look [dx, dy], blink, a, prevPh (phase half a frame earlier → motion smear),
 * sheen (0..1, the neck's sliding iridescence).
 */
export function drawPigeon(c, x, y, o = {}) {
  x = R(x); y = R(y);
  const tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1, amt = o.amt ?? 1;
  const W = pigeonFrames(x, y, tilt, o.ph ?? 0, amt);
  if (a <= 0) return W;
  // motion smear of the fast stroke (the wing's sweep during the last half frame), then the wings themselves
  // motion arcs: the paths of three points of each hand over the last half frame, fading toward the older end
  if (o.prevPh != null) for (let k = 0; k < 10; k++) {
    const q = k / 10, Wk = pigeonFrames(x, y, tilt, o.prevPh + (o.ph - o.prevPh) * q, amt), g = fade(c, a * (0.15 + 0.6 * q));
    for (const { F } of Wk.wings) for (const u of [0.66, 0.83, 0.98]) { const [px, py] = F.P(u * F.n, 1); g.px(R(px), R(py), u > 0.9 ? "#FFFFFF" : "#EAF2FC"); g.px(R(px), R(py) + 1, "#C2D4EA"); }
  }
  const look = { ...LOOK, underW: 2 + 4 * Math.max(0, W.e) };
  for (const { F } of W.wings) drawWing(c, F, { lead: LEAD, trail: TRAIL }, look, a, 0.3 * W.e);
  bodySprite(tilt).blit(c, x, y, { a });
  // the neck sheen: a soft band of light sliding across the iridescent ruff
  const sh = o.sheen ?? 0, g = fade(c, a), band = -44 + 88 * sh;
  for (let v = 22; v <= 46; v++) for (let u = -38; u <= 38; u++) {
    if ((u / 38) ** 2 + ((v - 32) / 16) ** 2 > 0.8) continue; if ((u / 40) ** 2 + (v / 36) ** 2 < 1.04) continue;      // not over the head
    const w = Math.abs(u + (v - 32) * 0.6 - band); if (w > 7) continue; const [px, py] = rotP(u, v, tilt), X = R(x + px), Y = R(y + py);
    if ((1 - w / 7) * 0.85 > bayer(X, Y) + 0.12) g.px(X, Y, Math.abs(u) > 18 ? (w < 3 ? PURP[6] : PURP[5]) : w < 3 ? NECK[7] : NECK[6]);
  }
  // orange eyes with a pale eye-ring
  const lk = o.look ?? [0, 0], bl = o.blink ?? 0;
  for (const sd of [-1, 1]) {
    const [ex, ey] = rotP(sd * 16.5, -3, tilt), X = x + ex, Y = y + ey;
    g.ering(R(X), R(Y) + 1, 12, 12, "#9AA4C0", 0.15 * Math.PI, 0.85 * Math.PI);
    eye(c, X, Y, 10.4, { ry: 11.6, iris: IRIS, pupil: "round", look: lk, blink: bl, lid: HEADR[4], outline: "#1A1010", a });
  }
  return W;
}

// ---------------------------------------------------------------- small side-view pigeons (plaza / ledges)
const SMALL = { body: "#8C96B0", dark: "#5E6782", wing: "#7A84A0", bar: "#22252F", head: "#6E7896", neck: "#3C9070", neck2: "#8A4CA8", tail: "#3A3E4C", leg: "#E06070", beak: "#2A2A34", cere: "#F2F2F6", belly: "#A8B0C8" };
/**
 * Side-view pigeon, ~26 px long, facing right (flip for left). pose: peck 0 (head up) … 1 (beak on the ground); sit (no
 * legs, on a ledge); puff 0..1 (cooing, chest puffed). Sprite cached per quantised pose. (x, y) = feet on the ground.
 */
export function smallPigeon(c, x, y, { peck = 0, sit = 0, puff = 0, flip = false, a = 1, s = 1, step = 0 } = {}) {
  const pk = Math.round(peck * 6) / 6, pf = Math.round(puff * 4) / 4, st = Math.round(step * 4) / 4, key = `sp:${pk}:${sit}:${pf}:${st}:${s}`;
  const spr = SPR(key, R(44 * s), R(36 * s), R(22 * s), R(30 * s), (g, ox, oy) => {
    const P = (u, v) => [ox + u * s, oy + v * s];
    const lift = sit ? 3 : 0;
    // legs
    if (!sit) for (const [lx, sw] of [[-2, st], [3, -st]]) { const [ax, ay] = P(lx, -6), [bx, by] = P(lx + sw * 3, 0); g.line(R(ax), R(ay), R(bx), R(by), SMALL.leg); g.px(R(bx) + 1, R(by), SMALL.leg); g.px(R(bx) - 1, R(by), SMALL.leg); }
    // tail
    g.poly([P(-17, -12 + lift), P(-6, -12 + lift), P(-6, -8 + lift), P(-17, -9 + lift)], SMALL.tail);
    // body (plump), belly, wing with bars
    const by0 = -11 + lift;
    g.poly(ell(ox - 1 * s, oy + by0 * s, 11 * s, (7 + puff) * s, -0.08, 28), SMALL.body);
    g.poly(ell(ox + 2 * s, oy + (by0 + 3) * s, 7 * s, 4 * s, 0, 20), SMALL.belly);
    g.poly(ell(ox - 3 * s, oy + (by0 - 1) * s, 8 * s, 4.2 * s, -0.12, 20), SMALL.wing);
    for (const k of [0, 3]) g.line(R(ox + (-6 + k) * s), R(oy + (by0 - 2) * s), R(ox + (-4 + k) * s), R(oy + (by0 + 2) * s), SMALL.bar);
    // neck + head: head drops forward when pecking
    const hx = 7 + pk * 6, hy = -20 + pk * 16 + lift;
    g.poly([P(4, by0 - 4), P(9, by0 - 5), P(hx + 2, hy + 3), P(hx - 3, hy + 2)], SMALL.neck);
    g.poly([P(5, by0 - 2), P(9, by0 - 3), P(hx + 1, hy + 5), P(hx - 2, hy + 4)], SMALL.neck2);
    g.poly(ell(ox + hx * s, oy + hy * s, 4.2 * s, 3.8 * s, 0, 16), SMALL.head);
    // eye (orange dot), cere and beak
    g.px(R(ox + (hx + 1) * s), R(oy + (hy - 1) * s), "#F28A2E"); g.px(R(ox + (hx + 1) * s), R(oy + (hy - 1) * s) - 0, "#F28A2E");
    g.px(R(ox + (hx + 3) * s), R(oy + (hy + 0) * s), SMALL.cere);
    const bx = ox + (hx + 4) * s, byy = oy + (hy + 1 + pk * 1.5) * s; g.px(R(bx), R(byy), SMALL.beak); g.px(R(bx) + 1, R(byy) + (pk > 0.5 ? 1 : 0), SMALL.beak);
    // soft top light / belly shade and a dark 1-px outline around the whole sprite
    const W = g.w, H = g.h, m = g.m, out = [];
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { if (m[j * W + i]) continue; if ((i > 0 && m[j * W + i - 1]) || (i < W - 1 && m[j * W + i + 1]) || (j > 0 && m[(j - 1) * W + i]) || (j < H - 1 && m[(j + 1) * W + i])) out.push([i, j]); }
    for (const [i, j] of out) g.px(i, j, "#1E2030");
  });
  // contact shadow on the ground (not for ledge sitters)
  if (!sit) c.tint(R(x - 12 * s), R(y - 1.5 * s), R(24 * s), R(3 * s) + 1, (X, Y) => { const q = ((X - x) / (11 * s)) ** 2 + ((Y - y) / (1.6 * s)) ** 2; return q >= 1 ? 0 : 0.4 * (1 - q) * a; }, "#2A2018", 3);
  if (!flip) spr.blit(c, x, y, { a });
  else { // mirrored blit
    const L = spr.c, W = L.w, H = L.h, ox = R(22 * s), oy = R(30 * s);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const m = L.m[j * W + i]; if (!m) continue; const X = R(x) + (ox - i), Y = R(y) + j - oy; if (a < 1 && a <= bayer(X, Y)) continue; const q = (j * W + i) * 3; c.px(X, Y, [L.d[q], L.d[q + 1], L.d[q + 2]]); }
  }
}

// catalog: the same drawing at k screen px per film grid unit (x, y = head-centre anchor on screen). The wings, the sheen
// and the eyes are drawn through a block view of c; the body sprite is cached per (tilt, k). Pure function of its inputs.
export function drawPigeonK(c, x, y, k, o = {}) {
  x = R(x); y = R(y);
  const tilt = Math.round((o.tilt ?? 0) * 50) / 50, a = o.a ?? 1, amt = o.amt ?? 1;
  const V = blockView(c, k, x, y);
  const W = pigeonFrames(0, 0, tilt, o.ph ?? 0, amt);
  if (a <= 0) return W;
  if (o.prevPh != null) for (let i = 0; i < 10; i++) {
    const q = i / 10, Wk = pigeonFrames(0, 0, tilt, o.prevPh + (o.ph - o.prevPh) * q, amt), g = fade(V, a * (0.15 + 0.6 * q));
    for (const { F } of Wk.wings) for (const u of [0.66, 0.83, 0.98]) { const [px, py] = F.P(u * F.n, 1); g.px(R(px), R(py), u > 0.9 ? "#FFFFFF" : "#EAF2FC"); g.px(R(px), R(py) + 1, "#C2D4EA"); }
  }
  const look = { ...LOOK, underW: 2 + 4 * Math.max(0, W.e) };
  for (const { F } of W.wings) drawWing(V, F, { lead: LEAD, trail: TRAIL }, look, a, 0.3 * W.e);
  bodySprite(tilt, k).blit(c, x, y, { a });
  const sh = o.sheen ?? 0, g = fade(V, a), band = -44 + 88 * sh;
  for (let v = 22; v <= 46; v++) for (let u = -38; u <= 38; u++) {
    if ((u / 38) ** 2 + ((v - 32) / 16) ** 2 > 0.8) continue; if ((u / 40) ** 2 + (v / 36) ** 2 < 1.04) continue;
    const w = Math.abs(u + (v - 32) * 0.6 - band); if (w > 7) continue;
    const [px, py] = rotP(u, v, tilt), X = R(px), Y = R(py);
    if ((1 - w / 7) * 0.85 > bayer(X, Y) + 0.12) g.px(X, Y, Math.abs(u) > 18 ? (w < 3 ? PURP[6] : PURP[5]) : w < 3 ? NECK[7] : NECK[6]);
  }
  const lk = o.look ?? [0, 0], bl = o.blink ?? 0;
  for (const sd of [-1, 1]) {
    const [ex, ey] = rotP(sd * 16.5, -3, tilt);
    g.ering(R(ex), R(ey) + 1, 12, 12, "#9AA4C0", 0.15 * Math.PI, 0.85 * Math.PI);
    eye(V, ex, ey, 10.4, { ry: 11.6, iris: IRIS, pupil: "round", look: lk, blink: bl, lid: HEADR[4], outline: "#1A1010", a });
  }
  return W;
}
