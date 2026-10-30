// LV6 · cheetah — the golden savanna at sunset (RANGE BIOME.savanna = 2700..3240, tod ≈ 4.6, a big orange sun).
// Far: dusky mesas on the horizon, tiny far acacias, a herd of Thomson's gazelles grazing. Mid: the golden grass plain in
// perspective rows, a tall termite mound (left), a big umbrella acacia (right; its shade is where the cheetah ends up) and
// granite boulders that lead into the rocky hills of the bat cave. Near: a perspective field of dry golden grass in the
// racecourse lawn's stripe rows (bare red-earth patches, pebbles), dulling toward the cave's moonlit ground at x 3240.
// A cute chibi cheetah crouches under the sun facing the camera; "hits" → butt wiggle; "ninety-three" → it launches into a
// full sprint on the spot: pebbles, tufts and the tall front grass stream past at their stripe's speed, the field smears into
// speed streaks, speed lines, a blur trail of ghost copies, a dust trail, grass flattened by the wind, the gazelles bolt;
// a stamina bar above it drains during "short bursts" to an empty red bar → the sprint ends in a skid (dust spray), a
// wobble, and on "rest" it flops onto its side in the acacia's shade, panting (belly heaving, tongue out, sweat drops), "+REST".
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, ell, tube, sign, pickup, RAMP, C, MAIN, sm, ease, lerp, rnd, fade, mix, bayer, blinkAt, clamp01, smooth } from "../cute.mjs";
import { worldLayer, Layer, gaze, tuft, dustPuff, streak, thick, profile } from "./racecourse-kit.mjs";
import { stripe, stripeP } from "./racecourse.mjs";
import { drawCheetah, drawLying, ICON as CHEETAH_ICON } from "./savanna-cheetah.mjs";
import { CHEETAH_X, WIGGLE, S0, SK0, SK1, SKID_DX, WOB, FLOP, PANT0, REST_TAG, REST_LIFE, wSprint, wSkid, wCrouch, phase, SCROLL, STAM, stamina, LEGS, D, CONTACTS, PANT_HZ, LEAVE } from "./savanna-time.mjs";

export const RANGE = BIOME.savanna;
export const ICON = CHEETAH_ICON;
const R = Math.round, [X0, X1] = RANGE, W = X1 - X0;
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
const ACACIA_X = 3160, MOUND_X = 2776, SIGN_X = 2830;

// ---------------------------------------------------------------- palette (sunset)
const PLAIN = ["#FFC680", "#F8B06C", "#EC9A5C", "#DC864E", "#C87444", "#B2643C", "#9A5634", "#82482E"];
const GOLD = ["#6A3A14", "#9A5A1C", "#C88228", "#E8A63A", "#F8C85A", "#FFE08A"];

// ---------------------------------------------------------------- static scenery: far horizon + the plain with mound, acacia, boulders
const TOP = -290, HZ = -132;
const mesa = profile([[X0 - 30, HZ + 2], [2730, HZ - 4], [2760, HZ - 16], [2790, HZ - 18], [2808, HZ - 6], [2900, HZ - 3], [3000, HZ - 9], [3040, HZ - 26], [3090, HZ - 27], [3112, HZ - 10], [3180, HZ - 6], [X1 + 40, HZ - 30]]);
function paintStatic(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far mesas: dusky purple haze, a warm lit crest
  for (let wx = X0; wx < X1 + 12; wx++) { const top = R(mesa(wx)); for (let wy = top; wy <= HZ + 2; wy++) { const d = wy - top; px(wx, wy, d < 1 ? "#F4A884" : d < 3 ? (bayer(wx, wy) > 0.5 ? "#C8788A" : "#B46A84") : "#9A5A7E"); } }
  // tiny far acacias on the horizon
  for (const [wx, h, w] of [[2742, 10, 9], [2884, 13, 11], [2930, 8, 7], [3010, 11, 10]]) { for (let k = 0; k < h; k++) px(wx + (k > h * 0.6 ? (k & 1) : 0), HZ + 1 - k, "#6A3A56"); for (let x = -w; x <= w; x++) { px(wx + x, HZ - h, "#6A3A56"); if (Math.abs(x) < w - 2) px(wx + x, HZ - h - 1, "#7A4660"); } }
  // the golden plain: hazy at the horizon, rows of grass in perspective, darker and warmer toward us
  for (let wx = X0; wx < X1 + 12; wx++) {
    for (let wy = HZ + 1; wy < LAND; wy++) {
      const v = clamp01((wy - HZ) / (LAND - HZ)), s2 = Math.pow(v, 0.8) * (PLAIN.length - 1), lo = Math.floor(s2), f = s2 - lo;
      let col = PLAIN[Math.min(PLAIN.length - 1, f > bayer(wx, wy) ? lo + 1 : lo)];
      if (wy - HZ < 2) col = "#FFDCA8";
      const row = Math.floor(Math.pow(v, 0.5) * 24);
      if (rnd(wx * 31 + row * 977) < 0.2 && ((wy - HZ) - Math.pow(row / 24, 2) * (LAND - HZ)) ** 2 < 1 + v * 4) col = mix(col, "#FFE6A0", 0.35 + v * 0.3);
      if (rnd(wx * 7 + wy * 131) < 0.012 + v * 0.03) col = mix(col, "#5A2A1C", 0.2 + v * 0.2);
      const green = 1 - sm(wx, X0 - 14, X0 + 34); if (green > 0) col = mix(col, mix("#9CBC5C", "#6A9C3C", v), green * 0.75);   // the racecourse turf fades out
      px(wx, wy, col);
    }
  }
  // far bushes dotted on the plain
  for (let i = 0; i < 40; i++) { const v = Math.pow(rnd(i * 3 + 1), 1.6), wy = HZ + 4 + v * (LAND - HZ - 26), wx = X0 + 40 + rnd(i * 7) * (W - 60), r = 1.2 + v * 6, col = mix("#B86A58", "#5A2A20", v); for (let y = -r * 0.7; y <= 0; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) if ((x / (r * 1.5)) ** 2 + (y / (r * 0.7)) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.45 ? mix(col, "#FFB880", 0.35) : col); }
  // a bush cluster where the racecourse ends (hides the change of turf)
  seamTree(g, L, T);
  mound(g, L, T);
  boulders(g, L, T);
  acacia(g, L, T);
  // the soil under the grass lip is drawn by the streamed ground layer
}
function seamTree(g, L, T) {
  // where the racecourse ends: a round leafy tree over a thick bush (it hides the end of the rails, hedge and turf)
  const x = X0 + 2, y = LAND + 2, TR = ["#140806", "#2A120A", "#40200E", "#583014", "#70401C", "#8A5226", "#A66832", "#C48244"];
  const LEAF = ["#14200C", "#1E3010", "#2C4416", "#3E5A1C", "#567226", "#728A30", "#94A43E", "#BEC05A"];
  blob(g, [tube([[L(x), T(y)], [L(x - 2), T(y - 60)], [L(x + 4), T(y - 110)]], 7, 5), tube([[L(x - 1), T(y - 70)], [L(x - 20), T(y - 104)]], 4, 2.5), tube([[L(x + 1), T(y - 80)], [L(x + 22), T(y - 112)]], 4, 2.5)], { ramp: TR, thick: 5, base: 2.8, gain: 1.6, outline: "#0A0404", litOutline: "#E89A58" });
  const crown = [[0, -132, 34, 26], [-24, -118, 22, 18], [24, -116, 24, 18], [-6, -152, 24, 18], [16, -146, 20, 16]];
  blob(g, crown.map(([dx, dy, rx, ry]) => ell(L(x + dx), T(y + dy), rx, ry)), { ramp: LEAF, thick: 18, base: 2.8, gain: 2.4, outline: "#0C1408", litOutline: "#FFD08A" });
  for (let i = 0; i < 36; i++) { const a = rnd(i * 3 + 2) * Math.PI * 2, rr = rnd(i * 5 + 2) * 30; const px = L(R(x + Math.cos(a) * rr)), py = T(R(y - 134 + Math.sin(a) * rr * 0.7)); g.px(px, py, LEAF[6]); g.px(px + 1, py, LEAF[7]); }
  const bush = [[0, -34, 30, 22], [-22, -26, 20, 16], [22, -24, 22, 16], [-8, -54, 22, 16], [14, -50, 18, 14], [-2, -76, 16, 12], [-28, -46, 14, 12]];
  blob(g, bush.map(([dx, dy, rx, ry]) => ell(L(x + dx), T(y + dy), rx, ry)), { ramp: LEAF, thick: 14, base: 3.0, gain: 2.2, outline: "#0C1408", litOutline: "#F8D080" });
  for (let i = 0; i < 24; i++) { const a = rnd(i * 7 + 1) * Math.PI * 2, rr = rnd(i * 11) * 24; g.px(L(R(x + Math.cos(a) * rr)), T(R(y - 40 + Math.sin(a) * rr * 0.8)), i % 3 ? LEAF[6] : "#F4E07A"); }
}
function mound(g, L, T) {
  // a termite mound: a broad lumpy clay dome with two towers, lit on the sun side, ventilation holes
  const CL = ["#3A160C", "#5E2614", "#84381C", "#A84C26", "#C66434", "#DC8046", "#EC9C5E", "#F8BC80"], x = MOUND_X, y = LAND + 2;
  const P = (a, b) => [L(x + a), T(y + b)];
  const body = smooth([[-40, 0], [-36, -20], [-28, -40], [-22, -66], [-16, -90], [-8, -104], [0, -100], [4, -82], [10, -70], [16, -78], [22, -74], [26, -54], [32, -32], [38, -12], [42, 0]].map(([a, b]) => P(a, b)), new Set([0, 14]), 4);
  blob(g, [body, ell(...P(-6, -20), 36, 22), ell(...P(-14, -60), 13, 18), ell(...P(18, -48), 13, 16)], { ramp: CL, thick: 16, base: 2.8, gain: 2.1, light: [0.75, -0.65], outline: "#2A0E06", litOutline: "#FFC890" });
  for (const [dx, dy] of [[-12, -30], [2, -58], [-6, -86], [16, -40], [22, -64], [-24, -16], [8, -18]]) { const [px, py] = P(dx, dy); g.px(px, py, "#2A0E06"); g.px(px + 1, py, "#2A0E06"); g.px(px, py + 1, "#5E2614"); g.px(px + 1, py + 1, "#84381C"); }
  for (let k = 0; k < 26; k++) { const a = (rnd(k * 5 + 3) * 2 - 1) * 30, b = -4 - rnd(k + 9) * 80; const [px, py] = P(a, b); g.px(px, py, k % 3 ? "#F8BC80" : "#5E2614"); }
  // a few grass tufts at its foot
  for (let k = 0; k < 6; k++) { const bx = x - 40 + k * 16 + R(rnd(k * 3) * 6); for (let j = 0; j < 6 + (k % 3) * 3; j++) g.px(L(bx + (j > 4 ? 1 : 0)), T(y - 1 - j), j > 5 ? "#FFE08A" : "#C88228"); }
}
function acacia(g, L, T) {
  // a big umbrella thorn acacia, backlit by the low sun: dark trunk forking into a flat layered canopy with a warm rim
  const x = ACACIA_X, y = LAND + 2, TR = ["#140806", "#2A120A", "#40200E", "#583014", "#70401C", "#8A5226", "#A66832", "#C48244"];
  const branches = [[[x, y], [x - 4, y - 90], [x - 14, y - 170]], [[x - 4, y - 90], [x + 18, y - 150], [x + 52, y - 196]], [[x - 10, y - 140], [x - 40, y - 180], [x - 70, y - 204]], [[x - 14, y - 170], [x - 10, y - 196], [x + 6, y - 214]], [[x + 18, y - 150], [x + 70, y - 178], [x + 96, y - 196]]];
  blob(g, branches.map(([a, b, c2], i) => tube([[L(a[0]), T(a[1])], [L(b[0]), T(b[1])], [L(c2[0]), T(c2[1])]], i ? 5 : 9, i ? 2.5 : 4)), { ramp: TR, thick: 5, base: 2.6, gain: 1.6, outline: "#0A0404", litOutline: "#E08850" });
  const LF = ["#140A08", "#22140C", "#2E1E10", "#3C2A14", "#4C3818", "#5E4820", "#7A5A28", "#9A7034"];
  const layers = [[x + 6, y - 226, 96, 15], [x - 40, y - 210, 58, 11], [x + 58, y - 206, 52, 11], [x + 12, y - 240, 60, 10]];
  for (const [cx, cy, rx, ry] of layers) {
    for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) {
      const d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (d > 1) continue; if (d > 0.72 && rnd(X * 7 + Y * 13) < 0.45) continue;
      const top = Y < cy - ry * 0.45, col = top ? (d > 0.5 && rnd(X * 3 + Y) < 0.5 ? "#F09A58" : "#7A4A2A") : Y > cy + ry * 0.5 ? LF[1] : LF[2];
      g.px(L(X), T(Y), col);
    }
  }
  for (let i = 0; i < 90; i++) { const [cx, cy, rx, ry] = layers[i % 4], a = rnd(i * 3) * Math.PI * 2, rr = Math.sqrt(rnd(i * 5)); const X = R(cx + Math.cos(a) * rx * rr), Y = R(cy + Math.sin(a) * ry * rr * 0.6 - ry * 0.3); g.px(L(X), T(Y), rnd(i) < 0.5 ? "#FFB070" : "#C0703A"); }
}
function boulders(g, L, T) {
  // granite boulders (a little kopje) at the right edge, leading into the rocky hills of the cave
  const RK = ["#1E1424", "#30223A", "#46344E", "#5E4A62", "#7A6276", "#98808E", "#B8A0A8", "#D8C0BC"];
  for (const [x, y, rx, ry] of [[3236, -48, 42, 34], [3204, -34, 24, 18], [3262, -30, 26, 16], [3184, -26, 14, 10]]) blob(g, [ell(L(x), T(y), rx, ry)], { ramp: RK, thick: 16, base: 3.0, gain: 2.2, outline: "#140C18", litOutline: "#FFB888" });
  for (let i = 0; i < 8; i++) { const x = 3214 + rnd(i * 3) * 50, y = -60 + rnd(i * 7) * 40; g.px(L(x), T(y), "#2A1E30"); g.px(L(x) + 1, T(y) + 1, "#2A1E30"); }
}
let STATIC = null;
const staticLayer = () => STATIC ??= worldLayer(X0 - 50, TOP, W + 90, LAND - TOP + 4, paintStatic);

// ---------------------------------------------------------------- the ground below the line (static; smeared into speed streaks during the sprint)
// a perspective field of dry golden grass in the same stripe rows as the racecourse lawn (the seam at x 2700 lines up),
// patches of bare red earth, pebbles; green lawn at the left edge, the cave's gold-dithered ground takes over at x 3200
const DRY = ["#4A2410", "#6E3A16", "#92541E", "#B26E28", "#CC8834", "#E0A244", "#EEBC5C", "#F8D47E"];
const G_BOT = 320;
function paintGround(g, L, T) {
  const xa = X0, xb = X1;
  for (let d = 0; d < G_BOT; d++) {
    const v = Math.pow(d / G_BOT, 0.8), band = stripe(d) % 2;
    for (let wx = xa; wx < xb; wx++) {
      const b = bayer(wx, d); let k = 4.1 + v * 1.2 + (band ? 0.45 : -0.2) + (b - 0.5) * 0.8 + Math.sin(wx * 0.047 + d * 0.03) * 0.3 + Math.sin(wx * 0.013 - d * 0.05) * 0.35;
      if (d < 3) k = 3.2; else if (d < 12) k -= (12 - d) * 0.08;
      let col = DRY[Math.max(0, Math.min(7, R(k)))];
      // bare red-earth patches (flattened ellipses in perspective)
      for (let i = 0; i < 7; i++) { const cx = X0 + 30 + rnd(i * 17 + 3) * (W - 60), cd = 20 + rnd(i * 5 + 9) * 260, rx = 18 + cd * 0.22, ry = 3 + cd * 0.05, q = ((wx - cx) / rx) ** 2 + ((d - cd) / ry) ** 2; if (q < 1 && (q < 0.7 || b > (q - 0.7) / 0.3)) col = mix(col, q < 0.45 ? "#B4603A" : "#C8784A", 0.75); }
      // the racecourse lawn at the left edge (dithered blend)
      // next to the racecourse lawn the dry grass is still a little green (the edge itself sits on the screen edge at rest)
      const gk = 1 - sm(wx, X0, X0 + 26); if (gk > 0) col = mix(col, band ? "#9AAA48" : "#86983E", gk * 0.5);
      // toward the bat cave the field dulls into the moonlit hills' gold-dithered ground (it continues past x 3240)
      const ck = sm(wx, X1 - 110, X1); if (ck > 0) { col = mix(col, ["#A08648", "#806838", "#5E4A2C"][Math.min(2, Math.floor(d / 110))], ck * 0.55); if (rnd(wx * 7 + d * 131) < ck * 0.1) col = "#3A3254"; }
      g.px(L(wx), T(LAND + d), col);
    }
  }
  for (let i = 0; i < 220; i++) {
    const wx = R(xa + rnd(i * 3 + 7) * (xb - xa)), d = R(6 + Math.pow(rnd(i * 5 + 1), 1.3) * (G_BOT - 10)), s2 = 1 + d / 150, kind = i % 5, px = (X, Y, col) => g.px(L(X), T(LAND + Y), col);
    if (wx < X0 + 20) continue;
    if (kind < 2) { px(wx, d, DRY[7]); px(wx, d - 1, DRY[6]); if (s2 > 1.5) px(wx + 1, d - 2, DRY[7]); }
    else if (kind === 2) { const w = R(1 + s2); for (let dx = 0; dx <= w; dx++) { px(wx + dx, d, "#8A7A70"); px(wx + dx, d + 1, "#3E2A20"); } px(wx, d - 1, "#C8B8A8"); }
    else if (kind === 3) { px(wx, d, DRY[2]); px(wx + 1, d, DRY[2]); }
    else { for (let j = 0; j < 3 + s2 * 2; j++) px(wx + (j & 1), d - j, j > 2 ? DRY[7] : DRY[5]); }
  }
}
let GROUND = null;
const groundLayer = () => GROUND ??= worldLayer(X0, LAND, W, G_BOT, paintGround);
/** Pebbles and dry tufts on the field that stream past at the speed of their stripe while the cheetah sprints. */
const BITS = Array.from({ length: 70 }, (_, i) => { const d = R(4 + Math.pow(rnd(i * 7 + 2), 1.15) * 300); return { x: rnd(i * 11 + 5) * W, d, p: stripeP(d), kind: i % 3, h: 3 + rnd(i * 3) * 4 }; });
function streamBits(c, V, t, sp) {
  const s = SCROLL(t), x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1))), on = sm(sp, 30, 200);
  if (on <= 0) return;
  const g = fade(c, on);
  for (const b of BITS) {
    const x = R(V.X(X0) + ((((b.x - s * b.p) % W) + W) % W)), y = R(V.Y(LAND + b.d)), sc = 1 + b.d / 150; if (x < x0 || x >= x1) continue;
    const trail = Math.min(40, R((sp * b.p) / 60));
    for (let k = 1; k <= trail; k++) if (k / trail < bayer(x + k, y) * 1.4) g.px(x + k, y, b.kind === 1 ? "#E0C0A0" : DRY[6]);
    if (b.kind === 0) { for (let j = 0; j < b.h * sc; j++) g.px(x - R(j * 0.5), y - j, j > 2 ? DRY[7] : DRY[4]); }
    else if (b.kind === 1) { const w = R(sc * 1.5); g.rect(x, y - 1, w + 1, 2, "#9A8A80"); g.rect(x, y + 1, w + 1, 1, "#3E2A20"); }
    else { g.px(x, y, DRY[3]); g.px(x + 1, y, DRY[2]); g.px(x, y - 1, DRY[7]); }
  }
}

// ---------------------------------------------------------------- the cheetah's pose at time t
const ev = (t, a, b) => ease(clamp01((t - a) / (b - a)));
const skidX = (t) => SKID_DX * ev(t, SK0, SK1);
const P2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
function blendPose(list) {   // list: [[weight, pose], …] (weights sum to 1)
  const out = { hip: [0, 0], sh: [0, 0], arch: 0, head: [0, 0], headRot: 0, feet: {} };
  for (const id of ["hindFar", "hindNear", "foreFar", "foreNear"]) out.feet[id] = [0, 0];
  for (const [w, p] of list) { if (w <= 0) continue; for (const k of ["hip", "sh", "head"]) { out[k][0] += w * p[k][0]; out[k][1] += w * p[k][1]; } out.arch += w * p.arch; out.headRot += w * (p.headRot ?? 0); for (const id in out.feet) { out.feet[id][0] += w * p.feet[id][0]; out.feet[id][1] += w * p.feet[id][1]; } }
  return out;
}
function crouchPose(t) {
  // pounce-ready crouch: chest low, front paws forward, rear up, head low and level looking at the camera
  const wig = sm(t, WIGGLE[0], WIGGLE[0] + 0.08) * (1 - sm(t, WIGGLE[1] - 0.06, WIGGLE[1])), sw = Math.sin((t - WIGGLE[0]) * 2 * Math.PI * 5.5) * wig, br = Math.sin(t * 2.6);
  return { hip: [-52 + sw * 5, -86 - wig * 3 - br * 0.6], sh: [28, -60 - br * 0.8], arch: 4, head: [48, -150 - br * 1.2], headRot: sw * 0.03,
    feet: { foreNear: [62, -6], foreFar: [74, -8], hindNear: [-36, -6], hindFar: [-26, -8] } };
}
function standPose(t) {
  const wob = Math.sin(t * 7.5) * (1 - sm(t, WOB[1] - 0.1, WOB[1] + 0.1)), pant = Math.sin(t * 2 * Math.PI * PANT_HZ);
  return { hip: [-56, -94 + pant * 1.2], sh: [30, -96 + pant * 1.5], arch: 4, head: [46 + wob * 3, -186 + pant * 2], headRot: wob * 0.08,
    feet: { foreNear: [38, -6], foreFar: [50, -8], hindNear: [-56, -6], hindFar: [-44, -8] } };
}
function skidPose() {
  // braking hard: rear sunk low, front legs braced far forward, head thrown back
  return { hip: [-62, -68], sh: [30, -94], arch: -4, head: [32, -178], headRot: -0.1, feet: { foreNear: [104, -6], foreFar: [114, -8], hindNear: [-12, -6], hindFar: [-2, -8] } };
}
// one leg's swing path (s 0..1 from lift-off to touchdown): kick back, fold under, reach far forward, touch down
const SW_X = { fore: profile([[0, -1], [0.18, -1.45], [0.5, 0.2], [0.78, 1.6], [1, 1]]), hind: profile([[0, -1], [0.2, -1.55], [0.55, 0.4], [0.8, 1.55], [1, 1]]) };
const SW_L = profile([[0, 0], [0.2, 0.45], [0.5, 1], [0.8, 0.45], [1, 0]]);
function sprintPose(t) {
  const ph = phase(t), e = 0.5 + 0.5 * Math.cos(2 * Math.PI * (ph - 0.38)), bob = -6 * Math.cos(4 * Math.PI * (ph - 0.38));
  const hip = [lerp(-26, -86, e), -96 + bob], sh = [lerp(20, 48, e), -98 + bob * 0.7];
  const feet = {};
  for (const L of LEGS) {
    const piv = L.fore ? [sh[0] + (L.near ? 2 : 12), 0] : [hip[0] + (L.near ? -2 : 10), 0], psi = (((ph + L.off) % 1) + 1) % 1, A = 38, lift = L.fore ? 40 : 34, gy = L.near ? -6 : -8, ox = L.fore ? 6 : 10;
    if (psi < D) feet[L.id] = [piv[0] + lerp(A, -A, psi / D) + ox, gy];
    else { const s = (psi - D) / (1 - D); feet[L.id] = [piv[0] + A * SW_X[L.fore ? "fore" : "hind"](s) + ox, gy - lift * SW_L(s)]; }
  }
  return { hip, sh, arch: lerp(22, -6, e), head: [54 + 6 * e, -184 + bob * 0.3], headRot: 0, feet, e };
}
function cheetahPose(t) {
  let wc = wCrouch(t), ws = wSprint(t), wk = wSkid(t); const tot = wc + ws + wk; if (tot > 1) { wc /= tot; ws /= tot; wk /= tot; }
  const wst = Math.max(0, 1 - wc - ws - wk);
  const p = blendPose([[wc, crouchPose(t)], [ws, sprintPose(t)], [wk, skidPose()], [wst, standPose(t)]]);
  const panting = sm(t, SK1 - 0.05, SK1 + 0.15), pant = 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * PANT_HZ);
  p.tail = { w: Math.max(ws, wk * 0.7, 0.15), curl: wc * (0.8 + 0.2 * Math.sin(t * 3.1)) + wst * 0.4 + ws * 0.25, ph: t * lerp(3, 16, ws) };
  const look = gaze(t, [[0, [0, 0.1]], [WIGGLE[0], [0.1, 0.15]], [S0, [0.25, 0]], [SK0, [0, -0.1]], [SK1 + 0.1, [0, 0.15]]], 0.15);
  p.face = { look, blink: blinkAt(t, 3.1, 0.4) * (1 - ws) * (1 - wk), squint: wc * 0.45 + ws * 0.4, brows: Math.max(wc * sm(t, WIGGLE[0] - 0.1, WIGGLE[0] + 0.1), ws), open: Math.max(ws * 0.2, wk * 0.8), tongue: panting * (0.55 + 0.35 * pant), tired: panting * 0.75, earBack: ws * 0.8 + wk * 0.5 };
  p.x = skidX(t);
  return p;
}

// ---------------------------------------------------------------- level exports
export function back(c, V, t) {
  if (!onScreen(V)) return;
  const ws = wSprint(t), sp = SCROLL.speed(t), smear = Math.min(16, sp / 70), x0 = Math.max(0, R(V.X(X0 - 50))), x1 = Math.min(540, R(V.X(X1 + 40)));
  const L = staticLayer();
  L.blit(c, V, { x0, x1, smear: smear >= 2 ? smear : 1, smearOff: SCROLL(t) * 0.35 });
  // the acacia's shade on the ground, the far gazelles (grazing, then bolting on the launch), birds crossing the sunset
  c.tint(R(V.X(ACACIA_X - 110)), R(V.Y(LAND)) - 6, 230, 12, (X, Y) => { const d = ((X - V.X(ACACIA_X - 4)) / 108) ** 2 + ((Y - V.Y(LAND)) / 5) ** 2; return d >= 1 ? 0 : 0.5 * (1 - d * d); }, "#3A1420", 3);
  gazelles(c, V, t);
  // the field below the line: smeared into speed streaks while the cheetah sprints, with pebbles and tufts streaming past
  groundLayer().blit(c, V, { x0, x1, smear: smear >= 2 ? smear * 1.4 : 1, smearOff: SCROLL(t) * 0.6 });
  streamBits(c, V, t, sp);
  // speed lines across the plain behind the cheetah
  const sl = sm(sp, 200, 700);
  if (sl > 0.02) for (let i = 0; i < 30; i++) {
    const u = ((t * (2.6 + rnd(i) * 1.6) + rnd(i * 7)) % 1), y = R(V.Y(-36 - rnd(i * 3) * 250)), x = R(V.X(X0 + 640 - u * 860)), len = 40 + R(rnd(i * 5) * 80);
    streak(c, x, y, len, i % 3 ? "#FFFAE8" : "#FFE8B0", "#FAD0A0", sl * Math.min(1, 2.2 * Math.sin(Math.PI * u)));
    if (i % 4 === 0) streak(c, x + 6, y + 1, len - 12, "#FFE0B0", "#F8C090", sl * Math.min(1, 2 * Math.sin(Math.PI * u)) * 0.7);
  }
}
function gazelles(c, V, t) {
  const bolt = (k) => sm(t, S0 + 0.15 + k * 0.06, S0 + 1.3 + k * 0.1);
  for (let k = 0; k < 5; k++) {
    const hx = 2818 + k * 24 + rnd(k) * 8, hy = HZ + 22 + (k % 2) * 5, b = bolt(k), run = b * b * 260 + b * 50, hop = b > 0 && b < 1 ? Math.abs(Math.sin((t - S0) * 13 + k)) * 7 : 0;
    const x = R(V.X(hx - run)), y = R(V.Y(hy)) - R(hop), a = 1 - sm(b, 0.75, 1); if (a <= 0) continue;
    const g = fade(c, a), dir = b > 0.02 ? -1 : k % 2 ? 1 : -1, graze = b < 0.02 && Math.sin(t * 1.3 + k * 2) > 0.3, run2 = b > 0.02 && b < 1;
    // a Thomson's gazelle, ~16 px: tan back, dark side stripe, white belly, thin legs, ringed horns, flicking tail
    g.rect(x - 6, y - 11, 13, 4, "#D08A58"); g.rect(x - 5, y - 12, 11, 1, "#E8A870"); g.rect(x - 6, y - 7, 13, 1, "#2A1A1A"); g.rect(x - 5, y - 6, 11, 1, "#F8EEE0");
    const sp = run2 ? Math.sin((t - S0) * 26 + k) * 2 : 0;
    for (const [lx, s2] of [[-5, 1], [-3, -1], [3, 1], [5, -1]]) g.line(x + lx, y - 5, x + lx + R(sp * s2), y, "#4A2A1A");
    const nx = x + dir * 7, ny = graze ? y - 5 : y - 15; g.line(x + dir * 5, y - 10, nx, ny, "#D08A58"); g.line(x + dir * 6, y - 10, nx + dir, ny + 1, "#D08A58");
    g.rect(nx + (dir > 0 ? 0 : -2), ny - 1, 3, 2, "#D08A58"); g.px(nx + dir * 2, ny, "#2A1A1A"); g.px(nx, ny - 2, "#2A1A1A"); g.px(nx - dir, ny - 3, "#2A1A1A"); g.px(nx - dir, ny - 4, "#4A3A2A");
    g.px(x - dir * 7, y - 11 + (Math.sin(t * 9 + k) > 0.6 ? -1 : 0), "#2A1A1A");
  }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND)) + 1, "LV 6", "stone", 1, t);
  const gx0 = R(V.X(CHEETAH_X)), gy = R(V.Y(LAND));
  if (gx0 < -300 || gx0 > 840) return;
  const lieK = sm(t, FLOP[0] + 0.12, FLOP[1]), p = cheetahPose(t), gx = gx0 + R(p.x);
  // collapse: the standing pose sinks before the lying pose dissolves in
  const sink = sm(t, FLOP[0], FLOP[1]);
  if (sink > 0) { p.hip[1] += 46 * sink; p.sh[1] += 52 * sink; p.head[1] += 70 * sink; p.head[0] += 18 * sink; for (const id in p.feet) p.feet[id][0] += (p.feet[id][0] > 0 ? 14 : -14) * sink; }
  // contact shadow
  const shW = lerp(lerp(110, 130, wSprint(t)), 150, lieK);
  c.tint(gx - 20 - R(shW), gy - 6, R(shW * 2) + 40, 12, (X, Y) => { const d = ((X - gx + 10) / shW) ** 2 + ((Y - gy) / 5) ** 2; return d >= 1 ? 0 : 0.45 * (1 - d); }, "#3A1420", 3);
  // blur trail: ghost copies of earlier poses behind the sprint
  const ws = wSprint(t);
  if (ws > 0.05) for (const [dt, dx, a, col] of [[0.1, -40, 0.22, "#F8D088"], [0.05, -20, 0.38, "#FCC870"]]) { const q = cheetahPose(t - dt); drawCheetah(c, gx + dx, gy, q, { a: a * ws, col }); }
  if (lieK < 1) drawCheetah(fade(c, 1 - lieK), gx, gy, p);
  if (lieK > 0) {
    const pant = Math.sin((t - PANT0) * 2 * Math.PI * PANT_HZ), br = 0.5 + 0.5 * pant;
    drawLying(c, gx, gy, { br, t, a: lieK, face: { tired: 0.8, tongue: 0.7 + 0.3 * br, open: 0.35 + 0.25 * br, look: [0, 0.2], blink: blinkAt(t, 2.6, 0.2) } });
  }
}
// note: drawCheetah through a fade() view dissolves its shading per pixel (blob draws via px)

export function front(c, V, t) {
  if (!onScreen(V)) return;
  const gx0 = V.X(CHEETAH_X), gy = V.Y(LAND), sp = SCROLL.speed(t), sh = SCROLL(t);
  // the cave's ground overlaps our last 40 px below the line; keep the savanna field on top there (it already dulls toward the cave)
  { const smear = Math.min(16, sp / 70), a0 = Math.max(0, R(V.X(X1 - 40))), a1 = Math.min(540, R(V.X(X1))); if (a1 > a0) groundLayer().blit(c, V, { x0: a0, x1: a1, smear: smear >= 2 ? smear * 1.4 : 1, smearOff: SCROLL(t) * 0.6 }); }
  // dust: big puffs from the paws while sprinting (sliding back fast), a spray in front during the skid, a cloud on the flop
  for (const e of CONTACTS) {
    const u = t - e.t; if (u < 0 || u > 0.55) continue;
    const drift = SCROLL(t) - SCROLL(e.t), fx = e.fore ? 52 : -40;
    dustPuff(c, gx0 + fx, gy - 1, u, 0.55, drift * 0.8, e.fore ? 0.9 : 1.2, ["#FFE0B0", "#E8B888", "#C08A64"], R(e.t * 100));
  }
  for (let i = 0; i < 9; i++) { const t0 = SK0 + i * 0.035; dustPuff(c, gx0 + skidX(t0) + 104, gy - 2, t - t0, 0.95, -(skidX(t) - skidX(t0)) - 16 - i * 9, 3.0 + (i % 3) * 0.7, ["#FFE6C0", "#ECC090", "#C8946A"], 40 + i); }
  // the launch: a burst of dust behind the hind paws
  for (let i = 0; i < 4; i++) dustPuff(c, gx0 - 50 - i * 10, gy - 2, t - (S0 + 0.04 + i * 0.03), 0.8, (SCROLL(t) - SCROLL(S0)) * 0.6 + i * 12, 2.4 - i * 0.3, ["#FFE6C0", "#ECC090", "#C8946A"], 60 + i);
  // skid furrows: two dark grooves ploughed by the front paws
  { const k = sm(t, SK0, SK1), fade0 = 1 - sm(t, SK1 + 0.6, SK1 + 1.2); if (k > 0 && fade0 > 0) { const g = fade(c, fade0), xa = R(gx0 + 96 + skidX(SK0) - 4), xb = R(gx0 + 96 + skidX(t) - 4); for (let x = xa; x <= xb; x++) { g.px(x, R(gy) - 1, "#6A3A1A"); g.px(x, R(gy), "#4A2410"); if ((x & 3) === 0) g.px(x, R(gy) - 2, "#C88A50"); } } }
  dustPuff(c, gx0 + skidX(t) + 10, gy - 2, t - (FLOP[1] - 0.04), 0.7, 0, 2.0, ["#FFE0B0", "#E8B888", "#C08A64"], 91);
  dustPuff(c, gx0 - 60, gy - 2, t - (FLOP[1] - 0.02), 0.7, 0, 1.6, ["#FFE0B0", "#E8B888", "#C08A64"], 92);
  // golden grass tufts along the lip (parallax 2), flattened backward by the sprint's wind near the cheetah
  const x0 = Math.max(0, R(V.X(X0))), x1 = Math.min(540, R(V.X(X1))), cols = ["#8A5418", "#C88228", "#E8A63A", "#FFE08A"];
  for (let i = 0; i < 60; i++) {
    const lx = (((i * (W / 60) + rnd(i * 3 + 1) * 6 - sh) % W) + W) % W, x = R(V.X(X0 + lx)); if (x < x0 - 6 || x >= x1 + 2) continue;
    const near = Math.exp(-(((x - gx0) / 140) ** 2)), flat = sm(sp, 100, 900) * (0.5 + 0.5 * near), sway = Math.sin(t * 1.6 + i * 0.7) * 1.4 - flat * 9;
    tuft(c, x, gy + 2 + (i % 3), (7 + rnd(i * 5) * 9) * (1 - flat * 0.45), 3 + (i % 3), cols, i * 17, sway);
  }
  // tall dry grass along the bottom edge (nearest to us: parallax 3), bent back by the wind of the sprint
  { const yb = R(V.Y(LAND + 292)), lb = -Math.min(12, sp / 70);
    for (let i = 0; i < 28; i++) { const lx = (((i * (W / 28) + rnd(i * 13 + 4) * 12 - sh * 3) % W) + W) % W, x = R(V.X(X0 + lx)); if (x < x0 - 12 || x >= x1 + 4) continue;
      tuft(c, x, yb + R(rnd(i * 7) * 32), 14 + rnd(i * 3) * 20, 6, cols, i * 37, Math.sin(t * 1.4 + i) * 2 + lb); } }
  // flying grass bits and pebbles kicked back during the sprint
  const ws = wSprint(t);
  if (ws > 0.05) for (let i = 0; i < 10; i++) { const u = ((t * 3.2 + rnd(i * 11)) % 1), x = R(gx0 - 30 - u * 220), y = R(gy - 10 - Math.sin(Math.PI * u) * (14 + rnd(i) * 26)); fade(c, ws * (1 - u)).px(x, y, i % 2 ? "#FFE08A" : "#8A5A3A"); fade(c, ws * (1 - u)).px(x + 1, y, i % 2 ? "#E8A63A" : "#6A4028"); }
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  const live = 1 - sm(t, LEAVE[0], LEAVE[1]); if (live <= 0) return;
  const gx = V.X(CHEETAH_X), gy = V.Y(LAND);
  // stamina bar above the cheetah: fills on the launch, drains, flashes red when empty, slowly refills while it rests
  const a = Math.min(sm(t, STAM.in - 0.1, STAM.in + 0.15), 1 - sm(t, STAM.out[0], STAM.out[1])) * live;
  if (a > 0) stamBar(c, R(gx + 22 + skidX(t)), R(gy - 300), stamina(t), t, a);
  // sweat drops flying off the head while it pants (on its feet and lying)
  const sweat = sm(t, SK1 - 0.05, SK1 + 0.1) * live;
  if (sweat > 0) for (let i = 0; i < 4; i++) {
    const per = 0.7, u = (((t - SK1) / per + i / 4) % 1 + 1) % 1, lying = sm(t, FLOP[0], FLOP[1]);
    const hx = gx + skidX(t) + lerp(50, 92, lying), hy = gy - lerp(192, 52, lying) - 40, sd = i % 2 ? 1 : -1;
    const x = R(hx + sd * (34 + u * 22)), y = R(hy + u * u * 40 - Math.sin(Math.PI * u) * 16), g = fade(c, sweat * (1 - sm(u, 0.6, 1)) * sm(u, 0, 0.1));
    for (let j = 0; j < 7; j++) { const hw = j < 2 ? 0 : j < 4 ? 1 : j < 6 ? 2 : 1; for (let k = -hw; k <= hw; k++) g.px(x + k, y + j, j === 0 || Math.abs(k) === hw ? "#2A5A9A" : k < 0 && j < 5 ? "#FFFFFF" : "#8AD0F8"); }
  }
  // "+REST" rises over the resting cheetah
  pickup(c, R(gx + skidX(t) + 10), R(gy - 150), "+REST", (t - REST_TAG) / REST_LIFE, C.GR);
}
function stamBar(c, x, y, v, t, a) {
  const g = fade(c, a), w = 92, h = 14, x0 = x - w / 2;
  const empty = v < 0.02, flash = empty ? 0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 3) : 0;
  // lightning icon
  const bolt = [".##.", ".#..", "###.", "..#.", ".#.."].map((r) => r.replace(/\./g, " "));
  g.rrect(R(x0) - 18, y - 1, 16, 16, "#0B0812", 2); bolt.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "#") { g.rect(R(x0) - 15 + i * 2, y + 2 + j * 2, 2, 2, mix("#F4CA50", "#E03056", flash)); } }));
  g.rrect(R(x0), y, w, h, "#0B0812", 2); g.rrect(R(x0) + 1, y + 1, w - 2, h - 2, mix("#2A1E3A", "#5A1020", flash), 2);
  const fw = R((w - 6) * clamp01(v)), col = v > 0.55 ? mix("#F4CA50", "#65DA41", sm(v, 0.55, 0.8)) : mix("#E03056", "#F4CA50", sm(v, 0.2, 0.45));
  if (fw > 0) { g.rect(R(x0) + 3, y + 3, fw, h - 6, col); g.rect(R(x0) + 3, y + 3, fw, 2, mix(col, "#FFFFFF", 0.45)); g.rect(R(x0) + 3, y + h - 5, fw, 2, mix(col, "#000000", 0.25)); }
  for (let k = 1; k < 6; k++) g.rect(R(x0) + 3 + R(((w - 6) * k) / 6), y + 3, 1, h - 6, "#0B0812");
  if (empty) g.rframe(R(x0) - 1, y - 1, w + 2, h + 2, mix("#5A1020", "#FF5A6A", flash), 2);
}
