// LV7 · rabbit + the heat rule — a spring meadow at sunrise → morning (RANGE BIOME.meadow = 2970..3510). The night city
// ends in suburbs on the left (little houses with lit windows that go out as the sun comes up, a hedge, a picket fence),
// then rolling hills, dandelions and daisies, a burrow with a second pair of ears peeking out, a rail fence toward the
// barn on the right. A chubby rabbit sits face-on under the sun disc; its heart beats with pulse("rabbit", t).
// During the long pan from the rooftops ("Smaller bodies lose heat faster. So they burn food faster, and the heart must
// pump faster.") a screen-space diagram builds: big body vs small body with red heat waves (the small one loses heat
// faster) → a flame BURNS FOOD FASTER → a heart PUMPS FASTER. "two hundred and fifty" → 250 BPM.
// The scenery is painted for the morning and graded toward night/dawn by the camera's time of day.
import { BIOME, LAND, EV, LV, pulse } from "../timeline.mjs";
import { tod } from "../world.mjs";
import { blob, ell, C, sign, pickup, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { Layer, flower, stem, tuft, clover, leafBall, paintHills, grassAt, grade, gradeView, thick, pickupC, spriteCache } from "./meadow-kit.mjs";
import { drawRabbit, FUR } from "./meadow-rabbit.mjs";
import { heartIcon } from "./meadow-heart.mjs";

export const RANGE = BIOME.meadow;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (3240, -180): screen = (wx - 2970, wy + 660)
const RB = [3240, -288];                         // rabbit head centre (screen 270, 372)
const BUR = [3068, LAND];                        // burrow (screen 98)
const SIGN = [3414, -12];                        // LV 7 sign (screen 444, 648)

const FLW = [["#FFFFFF", "#F8C840"], ["#FFD84A", "#E8A020"], ["#F48AB0", "#FFE070"], ["#B07CE8", "#FFE890"], ["#FFE24A", "#F0A818"]];
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const HEDGE = ["#122E1A", "#1A3E22", "#22502A", "#2E6432", "#3C783A", "#4E8E44", "#66A452", "#84BA66"];
const EARTH = ["#2A1A10", "#3E2818", "#563A22", "#6E4C2C", "#88603A", "#A0784A"];
const env = (x) => sm(x, RX0 + 30, RX0 + 190) * (1 - sm(x, RX1 - 110, RX1 - 6));
const hillFar = (x) => (58 + 22 * Math.sin(x * 0.011 + 1.3) + 10 * Math.sin(x * 0.029 + 0.4)) * env(x);
const hillNear = (x) => (28 + 12 * Math.sin(x * 0.018 + 2.2) + 6 * Math.sin(x * 0.047 + 1)) * env(x);
const HOUSES = [[2984, 50, 30, "#C86A5A"], [3018, 40, 26, "#7A8AB8"], [2952 + 98, 34, 22, "#B8885A"]];

// ---------------------------------------------------------------- static scenery
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -380, RX1 + 40, 320); FRONT = new Layer(RX0 - 40, 120, RX1 + 40, 320);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0, RX1, LAND, hillFar, hillNear);
  for (let i = 0; i < 7; i++) { const x = R(RX0 + 200 + rnd(i * 13 + 41) * 260), hn = hillNear(x); if (hn < 12 || Math.abs(x - RB[0]) < 90) continue; const y = R(LAND - hn + 3 + rnd(i) * 5), r = 3 + rnd(i * 7) * 3; g.rect(x, y, 1, R(r + 2), "#4A6A3A"); leafBall(g, x, y - r * 0.6, r, ["#3E7A48", "#4E8C52", "#5E9E5C", "#74B068", "#8CC27A"], i, { amp: 0.08, bumps: 5 }); }
  // suburbs at the left edge: little houses, a garden tree, a hedge and a picket fence
  leafBall(g, RX0 + 70, LAND - 52, 20, HEDGE, 5, { amp: 0.12, bumps: 8 }); g.rect(RX0 + 69, LAND - 34, 3, 34, WOOD[2]);
  for (const [x, h, w, roof] of HOUSES) {
    const top = LAND - h; g.rect(x - w, top, w * 2, h, "#E8DCC8"); g.rect(x - w, top, 2, h, "#F8F0E0"); g.rect(x + w - 3, top, 3, h, "#C8B8A0");
    g.poly([[x - w - 5, top + 1], [x, top - w * 0.8], [x + w + 5, top + 1]], mix(roof, "#000000", 0.35)); g.poly([[x - w - 3, top], [x, top - w * 0.8 + 2], [x + w + 3, top]], roof);
    g.rect(x - 4, LAND - 14, 8, 14, WOOD[2]); g.rect(x + w * 0.45, top - w * 0.5, 4, 10, "#8A5A4A");
  }
  for (let x = RX0 - 40; x < RX0 + 62; x += 2) { const h = 14 + Math.sin(x * 0.3) * 2 + (x % 7 === 0 ? 2 : 0); leafBall(g, x, LAND - h * 0.55, h * 0.62, HEDGE, x, { amp: 0.06, bumps: 5 }); }
  // meadow floor (perspective bands), little paths of dew-bright grass
  for (let y = LAND; y < 320; y++) for (let x = RX0 - 40; x < RX1 + 40; x++) g.px(x, y, grassAt(x, y, y - LAND));
  g.rect(RX0 - 40, LAND, RX1 - RX0 + 80, 1, "#C6E88A");
  for (let i = 0; i < 4200; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 101), 1.4) * 336), x = R(RX0 - 40 + rnd(i * 3 + 102) * (RX1 - RX0 + 76)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const col = rnd(i * 5 + 3) < 0.6 ? mix(g.get(x, y), "#1E5A2A", 0.32) : mix(g.get(x, y), "#E8FFB0", 0.3);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  for (let p = 0; p < 6; p++) { const cx = RX0 + 60 + rnd(p * 23 + 7) * (RX1 - RX0 - 120), cy = LAND + 30 + rnd(p * 29 + 3) * 220; for (let i = 0; i < 24; i++) { const x = R(cx + (rnd(p * 100 + i + 9) - 0.5) * 70), y = R(cy + (rnd(p * 100 + i + 59) - 0.5) * 26); clover(g, x, y, "#3E8A3E", "#7CC85E"); } }
  // dandelions, daisies, a few violets; denser and bigger toward the front
  for (let i = 0; i < 300; i++) {
    const x = R(RX0 - 30 + rnd(i * 7 + 14) * (RX1 - RX0 + 60)), y = R(LAND + 3 + Math.pow(rnd(i * 7 + 13), 1.25) * 320), d = y - LAND, s = d < 30 ? 1 : d < 110 ? 2 : d < 220 ? 3 : 4, [pc, ec] = FLW[Math.floor(rnd(i * 11 + 5) * FLW.length)];
    if (Math.abs(x - BUR[0]) < 60 && d < 20) continue;
    if (s >= 2) stem(g, x, y + s, y + s + 2 + s * 2, "#3A7A36", 0, s >= 3);
    flower(g, x, y, s, mix(pc, "#DDEFC8", Math.max(0, 0.35 - d / 200)), ec);
  }
  for (let i = 0; i < 14; i++) { const x = R(RX0 + 30 + rnd(i * 17 + 3) * (RX1 - RX0 - 60)), y = R(LAND + 40 + rnd(i * 5 + 1) * 200); for (let k = 0; k < 14; k++) { const an = (k / 14) * 6.283; g.px(R(x + Math.cos(an) * 3), R(y - 9 + Math.sin(an) * 3), "#F4F4F0"); } g.px(x, y - 9, "#D8D8D0"); stem(g, x, y - 6, y + 2, "#4A8A3A", 0, false); }   // dandelion clocks
  burrow(g);
  railFence(g);
  // FRONT: big foreground flowers and blades along the bottom
  for (let i = 0; i < 60; i++) { const x = R(RX0 - 30 + rnd(i * 13 + 72) * (RX1 - RX0 + 60)), y = R(LAND + 250 + rnd(i * 13 + 75) * 90); tuft(f, x, y, 14 + rnd(i + 3) * 16, 4 + Math.floor(rnd(i * 3 + 1) * 4), ["#2E6A30", "#3E8238", "#58A044"], i * 5 + 3, (rnd(i * 9 + 2) - 0.5) * 6); }
  for (let i = 0; i < 16; i++) { const x = R(RX0 + rnd(i * 19 + 31) * (RX1 - RX0)), y = R(LAND + 244 + rnd(i * 19 + 33) * 90), h = 18 + rnd(i * 5 + 7) * 22, [pc, ec] = FLW[(i * 3) % FLW.length]; stem(f, x, y - h, y, "#2E6A30", (rnd(i + 5) - 0.5) * 8, true); flower(f, x, y - h, 5 + (rnd(i * 7 + 1) < 0.4 ? 1 : 0), pc, ec); }
  for (const dx of [-60, -44, -20, 30, 52]) tuft(f, BUR[0] + dx, LAND + 4, 8, 3, ["#4E9A42", "#6AB04E", "#8ECC62"], dx + 199, 0);
}
function burrow(g) {
  const [x, y] = BUR;
  // earth mound with grass on its back and a dark oval entrance facing us
  for (let Y = y - 34; Y <= y + 6; Y++) for (let X = x - 62; X <= x + 62; X++) {
    const u = (X - x) / 62, v = (Y - (y + 6)) / 40; if (u * u + v * v > 1 || Y > y + 6) continue;
    const top = u * u + v * v > 0.7 && v < -0.5; let s = R(3.4 - u * 1.2 - v * 1.4 + (bayer(X, Y) - 0.5) * 0.8); if (u * u + v * v > 0.92) s = 1;
    g.px(X, Y, top ? (((X + Y) & 3) ? "#5A9A44" : "#76B256") : EARTH[Math.max(1, Math.min(5, s))]);
  }
  for (let Y = y - 22; Y <= y + 4; Y++) for (let X = x - 22; X <= x + 22; X++) { const d = ((X - x) / 22) ** 2 + ((Y - (y - 8)) / 15) ** 2; if (d <= 1) g.px(X, Y, d > 0.8 ? EARTH[1] : Y < y - 14 ? "#140C08" : "#1E120A"); }
  for (let i = 0; i < 10; i++) { const px = R(x - 40 + rnd(i * 3 + 7) * 80), py = R(y + 2 + rnd(i * 5 + 1) * 8); g.rect(px, py, 2, 1, EARTH[4]); }
}
function railFence(g) {
  for (const px of [3446, 3490, 3534]) { g.rect(px - 3, LAND - 44, 7, 46, WOOD[1]); g.rect(px - 2, LAND - 43, 5, 44, WOOD[3]); g.rect(px - 2, LAND - 43, 1, 44, WOOD[5]); }
  for (const ry of [LAND - 36, LAND - 18]) { g.rect(3436, ry, 108, 6, WOOD[1]); g.rect(3436, ry + 1, 108, 4, WOOD[4]); g.rect(3436, ry + 1, 108, 1, WOOD[6]); }
  for (let i = 0; i < 8; i++) tuft(g, 3440 + i * 13, LAND + 3, 10 + (i % 3) * 3, 4, ["#4E9A42", "#6AB04E", "#9AD06A"], i * 13, 1);
}

// ---------------------------------------------------------------- per-frame pieces
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
function peekEars(c, V, t) {
  // a second rabbit's ears peeking out of the burrow, twitching now and then
  const x = R(V.X(BUR[0])), y = R(V.Y(BUR[1])) - 16, up = 4 + 2 * Math.sin(t * 0.9), tw = peekTwitch(t) * 12;
  for (const s of [-1, 1]) {
    const bx = x + s * 7, top = y - 14 - up - (s > 0 ? tw : 0), ang = s * (0.12 + (s > 0 ? tw * 0.02 : 0));
    blob(c, [ell(bx + Math.sin(ang) * 10, (top + y) / 2 + 2, 5, (y - top) / 2 + 4, ang, 20)], { ramp: FUR, thick: 4, base: 3.2, litOutline: FUR[4] });
    c.rect(R(bx + Math.sin(ang) * 10) - 1, R(top) + 6, 2, R(y - top) - 6, "#E89AA6");
  }
}
function windows(c, V, t, night) {
  if (night <= 0.02) return; const g = fade(c, night);
  for (const [x, h, w] of HOUSES) { const top = LAND - h; for (const dx of [-w + 6, w - 12]) { const X = R(V.X(x + dx)), Y = R(V.Y(top + 10)); g.rect(X, Y, 6, 7, "#FFD866"); g.rect(X, Y + 3, 6, 1, "#C89A3A"); g.px(X + 1, Y + 1, "#FFF4C0"); } }
}

// heat-rule diagram (screen space) during the pan
const H0 = LV.heat[0], H1 = LV.heat[1];
// timing table of every visible change (used by the picture AND by levels/meadow-motions.mjs for the sound)
export const T = {
  PANEL: [H0 + 0.42, H1 - 0.28, 0.3, 0.4], COL: [[H0 + 0.5, H0 + 0.8], [EV.burn - 0.05, EV.burn + 0.25], [EV.pump - 0.6, EV.pump - 0.3]],
  LBL: [[EV.loseHeat - 0.3, EV.loseHeat], [EV.burn + 0.15, EV.burn + 0.45], [EV.pump - 0.1, EV.pump + 0.2]], ARROW: [[EV.burn - 0.25, 0.3], [EV.pump - 0.85, 0.3]],
  HEART_IN: [EV.rabbit - 0.3, EV.rabbit], PICKUP: [EV.twoFifty, 1.6], EAR_UP: [EV.twoFifty - 0.2, EV.twoFifty + 0.2], EAR_DOWN: [EV.twoFifty + 0.9, EV.twoFifty + 1.3],
  RABBIT: { x: RB[0], half: 110 }, BURROW: { x: BUR[0], half: 30 },
};
/** Nose sniffing bursts (0..1) and the burrow ears' twitch (0..0.15): same expressions as the picture. */
export const sniff = (t) => sm(Math.sin(t * 2 * Math.PI * 0.7), 0.2, 0.5) * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 5));
export const peekTwitch = (t) => Math.max(0, Math.sin(t * 2.3) - 0.85);
export const earTwitch = (t) => 0.03 * sm(t, T.EAR_UP[0], T.EAR_UP[1]) * (1 - sm(t, T.EAR_DOWN[0], T.EAR_DOWN[1]));
function diagram(c, t) {
  const pa = win(t, ...T.PANEL); if (pa <= 0) return;      // starts as the cat's vet tag (roofs) has gone
  const X0 = 18, Y0 = 204, Wd = 504, Hd = 200; panel(c, X0, Y0, Wd, Hd, pa, "#FF8A6A");
  const cols = [104, 270, 436], ia = T.COL.map(([a, b]) => Math.min(pa, sm(t, a, b)));
  // column 1: big body vs small body, red heat waves (the small one sheds them much faster)
  if (ia[0] > 0) {
    const g = fade(c, ia[0]);
    ball(c, cols[0] - 32, 284, 36, ["#3A4060", "#4E5678", "#646E92", "#7C88AA", "#98A4C2", "#B4C0D8"], ia[0]);
    ball(c, cols[0] + 48, 302, 15, ["#5A2A2A", "#7E4038", "#A05A48", "#C07A60", "#D89A7C", "#ECBCA0"], ia[0]);
    for (const [cx, cy, r, n, per] of [[cols[0] - 32, 284, 36, 3, 1.7], [cols[0] + 48, 302, 15, 6, 0.55]]) for (let i = 0; i < n; i++) {
      const ph = ((t / per + i / n) % 1 + 1) % 1, an = -Math.PI / 2 + (i - (n - 1) / 2) * (n > 3 ? 0.55 : 0.7), d = r + 3 + ph * 26, q = fade(c, ia[0] * Math.sin(Math.PI * ph));
      for (let j = 0; j < 11; j++) { const w = Math.sin(j * 0.7 + ph * 8) * 1.8, px = cx + Math.cos(an) * (d + j) - Math.sin(an) * w, py = cy + Math.sin(an) * (d + j) + Math.cos(an) * w; q.rect(R(px), R(py), 2, 2, j < 3 ? "#FFB070" : "#FF4A3A"); }
    }
    label(c, ["LOSES HEAT", "FASTER"], cols[0], 348, Math.min(ia[0], sm(t, T.LBL[0][0], T.LBL[0][1])));
    void g;
  }
  // arrows, column 2: a flame over a little apple, column 3: the heart
  arrow(c, 190, 290, Math.min(pa, ease(clamp01((t - T.ARROW[0][0]) / T.ARROW[0][1]))));
  arrow(c, 356, 290, Math.min(pa, ease(clamp01((t - T.ARROW[1][0]) / T.ARROW[1][1]))));
  if (ia[1] > 0) { flame(c, cols[1], 318, t, ia[1]); label(c, ["BURNS FOOD", "FASTER"], cols[1], 348, Math.min(ia[1], sm(t, T.LBL[1][0], T.LBL[1][1]))); }
  if (ia[2] > 0) {
    const g = fade(c, ia[2]); heartIcon(c, cols[2], 290, 28, 0, { a: ia[2], ring: false });
    for (let i = 0; i < 3; i++) { const y = 278 + i * 12, l = 10 + (i === 1 ? 6 : 0), sx = 396 - ((t * 60 + i * 7) % 6); g.rect(R(sx - l), y, l, 2, "#FFB0B8"); }
    label(c, ["PUMPS", "FASTER"], cols[2], 348, Math.min(ia[2], sm(t, T.LBL[2][0], T.LBL[2][1])));
  }
}
const BALLS = spriteCache(4);
function ball(c, x, y, r, ramp, a) {
  BALLS(`ball:${r}`, r * 2 + 8, r * 2 + 8, r + 4, r + 4, (g, cx, cy) => {
    blob(g, [ell(cx, cy, r, r * 0.94)], { ramp: ["#0E0A16", ...ramp, "#FFFFFF"], thick: r * 0.6, base: 3.2, gain: 2.4 });
    const e = Math.max(2, R(r * 0.16)); for (const s of [-1, 1]) { g.rect(R(cx + s * r * 0.34) - (s < 0 ? e : 0), R(cy - r * 0.1), e, e + 1, "#0E0A16"); g.px(R(cx + s * r * 0.34) - (s < 0 ? e : 0), R(cy - r * 0.1), "#FFFFFF"); }
    g.px(R(cx - r * 0.5), R(cy + r * 0.22), "#F27A9A"); g.px(R(cx + r * 0.5), R(cy + r * 0.22), "#F27A9A");
  }).blit(c, x, y, { a });
}
function arrow(c, x, y, k) { if (k <= 0) return; const g = fade(c, Math.min(1, k * 2)), L = R(26 * k); g.rect(x, y - 2, L, 5, C.O); g.rect(x, y - 1, L, 3, C.Y); for (let i = 0; i < 7; i++) { g.rect(x + L + i, y - 6 + i, 1, 13 - i * 2, C.O); if (i < 6) g.rect(x + L + i, y - 5 + i, 1, 11 - i * 2, C.Y); } }
function flame(c, x, y, t, a) {
  const g = fade(c, a);
  // a little apple being "burned" as fuel
  g.rect(x - 9, y - 2, 19, 10, "#7A1A1A"); for (let Y = -6; Y <= 6; Y++) for (let X = -9; X <= 9; X++) if ((X / 9) ** 2 + (Y / 6.5) ** 2 <= 1) g.px(x + X, y + 2 + Y, Y < -2 && X < 0 ? "#FF7A6A" : "#E0303A"); g.rect(x, y - 7, 1, 4, "#5A3A1A"); g.rect(x + 1, y - 7, 3, 2, "#4A9A3A");
  for (const [w, h, col, k] of [[30, 70, "#E83A2A", 0], [21, 52, "#FF8A2A", 1], [12, 32, "#FFE07A", 2]]) {
    const pts = []; for (let i = 0; i <= 24; i++) { const u = i / 24, ang = Math.PI * (1 - u), yy = Math.sin(ang), side = Math.cos(ang); const wob = Math.sin(t * 11 + k * 1.7 + u * 6) * 2 * (1 - yy * 0.3); pts.push([x + side * w * (0.55 + 0.45 * yy) * 0.6 + wob * (1 - Math.abs(side)), y - 6 - (yy > 0.8 ? 0 : 0) - yy * h * (0.35) - (Math.abs(side) < 0.15 ? h * 0.6 : 0)]); }
    const shape = []; for (let i = 0; i <= 20; i++) { const v = i / 20, half = w * 0.5 * Math.sin(Math.PI * Math.min(1, v * 1.1)) ** 0.8 * (1 - v * 0.15), sway = Math.sin(t * 9 + k * 2 + v * 4) * 3 * v; shape.push([x - half + sway, y - 4 - v * h]); }
    for (let i = 20; i >= 0; i--) { const v = i / 20, half = w * 0.5 * Math.sin(Math.PI * Math.min(1, v * 1.1)) ** 0.8 * (1 - v * 0.15), sway = Math.sin(t * 9 + k * 2 + v * 4) * 3 * v; shape.push([x + half + sway, y - 4 - v * h]); }
    g.poly(shape, col); void pts;
  }
}
function label(c, lines, cx, y, a) {
  if (a <= 0) return; const g = fade(c, a), s = 2;
  lines.forEach((l, i) => { const w = c.measure(MAIN, l, { scale: s }), x = R(cx - w / 2), yy = y + i * 20 + R((1 - a) * 4); g.text(MAIN, l, x + 1, yy + 1, C.O, { scale: s }); g.text(MAIN, l, x, yy, i ? "#FF8A6A" : C.IV, { scale: s }); });
}

// ---------------------------------------------------------------- module passes
const GAZE = [[0, [0, 0]], [EV.rabbit - 0.3, [0, 0]], [EV.twoFifty - 0.1, [0.55, -0.45]], [EV.twoFifty + 1.0, [0, 0]], [LV.rabbit[1] - 0.2, [0.7, 0]]];
function gaze(t) { let cur = GAZE[0][1]; for (let i = 1; i < GAZE.length; i++) { const [tk, v] = GAZE[i]; if (t <= tk) break; const e = sm(t, tk, tk + 0.25); cur = [lerp(cur[0], v[0], e), lerp(cur[1], v[1], e)]; } return cur; }
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { grade: grade(tod(V.cx)), x0: Math.max(0, R(V.X(RX0 - 40))) });
}
export function actors(c, V, t) {
  if (off(V)) return;
  const TD = tod(V.cx), gr = grade(TD), view = gr ? gradeView(c) : null, d = view ? view.g : c, night = 1 - sm(TD, 6.6, 7.6);
  sign(d, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 7", "wood", 1, t);
  peekEars(d, V, t);
  // the rabbit: breathing, blinking, nose twitching in little bursts, ears swaying; the heart on its chest
  const twitch = sniff(t);   // little sniffing bursts, smooth
  const r = drawRabbit(d, R(V.X(RB[0])), R(V.Y(RB[1])), { look: gaze(t), blink: blinkAt(t, 3.3, 0.9), twitch, breathe: Math.sin(t * 2 * Math.PI * 0.9) * 1.2 - 0.2, earL: Math.sin(t * 1.3) * 0.04 + earTwitch(t), earR: Math.sin(t * 1.1 + 1) * 0.05 });
  const ha = sm(t, T.HEART_IN[0], T.HEART_IN[1]), p = pulse("rabbit", t);
  if (ha > 0) heartIcon(d, r.chest[0], r.chest[1], 16, p, { a: ha });
  view?.apply(gr);
  windows(c, V, t, night);
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V, { grade: grade(tod(V.cx)) });
}
export function hud(c, V, t) {
  if (!V.wrap) diagram(c, t);
  if (off(V)) return;
  const k = (t - T.PICKUP[0]) / T.PICKUP[1]; if (k > 0 && k < 1) pickupC(c, R(V.X(RB[0])) + 142, R(V.Y(RB[1])) - 70, "250 BPM", k);
}
