// LV4 · bee — a spring meadow in soft morning light: distant hills, clover, small flowers, a white box hive right of
// centre, a blossom tree at the far right. A chubby honeybee hovers under the sun disc facing the camera.
// Events: "brain … sesame seed" → magnifier panel BEE BRAIN = SESAME SEED; "learn" → +LEARN; "dances … flowers" →
// waggle dance in the air (figure-eight with a wiggly run, dotted trail), then a dotted arrow from the hive to a
// bright flower patch and two small bees fly off along it.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, ell, tube, bez, eye, blush, smile, RAMP, C, sign, pickup, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { Layer, flower, stem, tuft, clover, leafBall, dotted, along, xform, paintHills, hillEnv, hillNear, grassAt } from "./meadow-kit.mjs";

export const RANGE = BIOME.meadow;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (1350, -180): screen = (wx − 1080, wy + 660)
const BX = 1350, BY = -300;                       // bee head centre (screen 270, 360)
const HX = 1500, HY = LAND;                       // hive: centre x, ground
const PATCH = [1150, -36];                        // bright flower patch the dance points to (screen 70, 624)
const SIGN = [1236, -12];                         // LV 4 sign post foot (screen 156, 648)

// ---------------------------------------------------------------- palette (morning: soft warm light, fresh greens)
const LEAF = ["#1E4A2A", "#2A6234", "#367A3C", "#469244", "#5AA84E", "#74BE5C", "#94D270", "#B8E68C"];
const BLOSSOM = ["#7A3A5A", "#A85478", "#D07898", "#E89AB4", "#F4B8CA", "#FAD2DE", "#FFE6EE", "#FFF6FA"];
const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const PAINT = ["#4A4238", "#7A7060", "#A89C88", "#C8BEA8", "#DED6C4", "#ECE6D8", "#F7F3EA", "#FFFFFF"];
const FLW = [["#F48AB0", "#FFE070"], ["#FFD84A", "#E08A20"], ["#FFFFFF", "#F8C840"], ["#B07CE8", "#FFE890"], ["#FF9E7A", "#FFF0A0"]];

// ---------------------------------------------------------------- static layers (built once)
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 840); FRONT = new Layer(RX0 - 40, -120, RX1 + 40, 840);
  const g = BACK.g, f = FRONT.g;
  // far hills (hazy) and near hills: shared with the yard/forest, rising from the shore
  paintHills(g, RX0 - 40, RX1, LAND);
  // tiny trees and hedgerows on the near hills
  for (let i = 0; i < 9; i++) {
    const x = R(RX0 + 140 + rnd(i * 13 + 5) * (RX1 - RX0 - 230)), hn = hillNear(x);
    if (hn < 14 || Math.abs(x - BX) < 70) continue; const y = R(LAND - hn + 3 + rnd(i) * 6), r = 3 + rnd(i * 7) * 3;
    g.rect(x, R(y), 1, R(r + 2), "#4A6A3A"); leafBall(g, x, y - r * 0.6, r, ["#3E7A48", "#4E8C52", "#5E9E5C", "#74B068", "#8CC27A"], i, { amp: 0.08, bumps: 5 });
  }
  // meadow floor: perspective tone bands (light near the horizon → rich green in front), dithered
  for (let y = LAND; y < 840; y++) for (let x = RX0 - 40; x < RX1; x++) {
    const sand = (1 - sm(x, RX0 - 40, RX0 + 6)) * 0.7; let col = grassAt(x, y, y - LAND);
    if (sand > 0.02) col = mix(col, "#E2D29A", sand * (0.75 + 0.25 * bayer(x, y)));
    g.px(x, y, col);
  }
  g.rect(RX0 - 40, LAND, RX1 - RX0 + 40, 1, "#C6E88A");               // sunlit ground lip
  // grass strokes (texture), denser and taller toward the front
  for (let i = 0; i < 5000; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 1), 1.4) * 850), x = R(RX0 - 40 + rnd(i * 3 + 2) * (RX1 - RX0 + 36)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    const dark = rnd(i * 5) < 0.6, col = dark ? mix(g.get(x, y), "#1E5A2A", 0.32) : mix(g.get(x, y), "#E8FFB0", 0.3);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  // dune grass at the shore seam (left edge)
  for (let i = 0; i < 10; i++) { const x = R(RX0 - 36 + rnd(i * 17 + 3) * 44), y = R(LAND + 2 + rnd(i * 19) * 60); tuft(g, x, y, 9 + rnd(i) * 10, 5, ["#7A8A48", "#9AAA58", "#C2C878"], i * 9, -3); }
  // clover patches
  for (let p = 0; p < 7; p++) {
    const cx = RX0 + 40 + rnd(p * 23 + 1) * (RX1 - RX0 - 80), cy = LAND + 30 + rnd(p * 29) * 220;
    for (let i = 0; i < 26; i++) { const x = R(cx + (rnd(p * 100 + i) - 0.5) * 70), y = R(cy + (rnd(p * 100 + i + 50) - 0.5) * 26); clover(g, x, y, "#3E8A3E", "#7CC85E"); if (rnd(p * 7 + i) < 0.18) { g.px(x, y - 3, "#FFFFFF"); g.px(x + 1, y - 3, "#F4C8DA"); g.px(x, y - 4, "#FFFFFF"); } }
  }
  // small flowers in drifts (bigger in front) + a few loners, avoiding the hive foot
  const drifts = []; for (let i = 0; i < 16; i++) drifts.push([RX0 + 20 + rnd(i * 53 + 1) * (RX1 - RX0 - 40), LAND + 8 + Math.pow(rnd(i * 53 + 2), 1.3) * 320, 30 + rnd(i * 53 + 3) * 50, Math.floor(rnd(i * 53 + 4) * FLW.length)]);
  for (let i = 0; i < 340; i++) {
    let x, y, ci;
    if (i < 280) { const [dx, dy, rr, c0] = drifts[i % drifts.length], an = rnd(i * 7 + 3) * 6.283, q = Math.sqrt(rnd(i * 7 + 4)); x = R(dx + Math.cos(an) * rr * q); y = R(dy + Math.sin(an) * rr * q * (0.25 + (dy - LAND) / 900)); ci = rnd(i * 11) < 0.7 ? c0 : Math.floor(rnd(i * 13) * FLW.length); }
    else { x = R(RX0 + 8 + rnd(i * 7 + 4) * (RX1 - RX0 - 16)); y = R(LAND + 3 + Math.pow(rnd(i * 7 + 3), 1.25) * 330); ci = Math.floor(rnd(i * 11) * FLW.length); }
    if (y < LAND + 2 || (Math.abs(x - HX) < 52 && y < LAND + 10)) continue;
    const d = y - LAND, s = d < 30 ? 1 : d < 110 ? 2 : d < 220 ? 3 : 4, [pc, ec] = FLW[ci], haze = Math.max(0, 0.35 - d / 200);
    if (s >= 2) stem(g, x, y + s, y + s + 2 + s * 2, "#3A7A36", 0, s >= 3);
    flower(g, x, y, s, haze > 0 ? mix(pc, "#DDEFC8", haze) : pc, ec);
  }
  // the bright patch the dance points to: tall cosmos, daisies and violets in a cluster
  for (let i = 0; i < 30; i++) {
    const x = R(PATCH[0] + (rnd(i * 31 + 7) - 0.5) * 120), base = R(PATCH[1] + 16 + rnd(i * 37) * 22), h = 14 + rnd(i * 41) * 26, [pc, ec] = FLW[i % FLW.length];
    stem(g, x, base - h, base, "#3A7A36", (rnd(i) - 0.5) * 6, true); flower(g, x, base - h, 3 + (rnd(i * 43) < 0.4 ? 1 : 0), pc, ec);
  }
  blossomTree(g, RX1 - 54, LAND);
  hive(g);
  // FRONT: big foreground flowers and grass blades along the bottom, a few blades in front of the hive feet
  for (let i = 0; i < 70; i++) {
    const x = R(RX0 - 30 + rnd(i * 13 + 2) * (RX1 - RX0 + 50)), y = R(LAND + 250 + rnd(i * 13 + 5) * 330);
    tuft(f, x, y, 14 + rnd(i) * 16, 4 + Math.floor(rnd(i * 3) * 4), ["#2E6A30", "#3E8238", "#58A044"], i * 5, (rnd(i * 9) - 0.5) * 6);
  }
  for (let i = 0; i < 26; i++) {
    const x = R(RX0 + rnd(i * 19 + 1) * (RX1 - RX0)), y = R(LAND + 240 + rnd(i * 19 + 3) * 300), h = 18 + rnd(i * 5) * 22, [pc, ec] = FLW[(i * 3) % FLW.length];
    stem(f, x, y - h, y, "#2E6A30", (rnd(i) - 0.5) * 8, true); flower(f, x, y - h, 5 + (rnd(i * 7) < 0.4 ? 1 : 0), pc, ec);
  }
  for (const dx of [-46, -34, -12, 6, 30, 44]) tuft(f, HX + dx, LAND + 3, 7, 3, ["#4E9A42", "#6AB04E", "#8ECC62"], dx + 99, 0);
}

function blossomTree(g, x, y) {
  // trunk + two branches, round pink-white blossom canopy
  g.poly([[x - 5, y + 1], [x - 4, y - 70], [x + 5, y - 70], [x + 7, y + 1]], WOOD[2]); g.poly([[x - 3, y], [x - 2, y - 70], [x + 1, y - 70], [x + 1, y]], WOOD[3]);
  g.line(x, y - 62, x - 18, y - 84, WOOD[2]); g.line(x + 1, y - 62, x - 17, y - 84, WOOD[2]); g.line(x + 2, y - 66, x + 16, y - 86, WOOD[2]);
  for (const [dx, dy, r, s] of [[-24, -104, 26, 1], [16, -112, 30, 2], [-4, -132, 30, 3], [-34, -86, 18, 4], [30, -90, 20, 5]]) leafBall(g, x + dx, y + dy, r, BLOSSOM, s, { amp: 0.14, bumps: 7 });
  for (let i = 0; i < 70; i++) { const a = rnd(i * 3) * 6.283, rr = Math.sqrt(rnd(i * 5)) * 46, px = R(x - 2 + Math.cos(a) * rr), py = R(y - 108 + Math.sin(a) * rr * 0.75); if (g.has(px, py)) { g.px(px, py, "#FFFFFF"); if (rnd(i) < 0.4) g.px(px + 1, py, "#FFE0EA"); } }
  for (let i = 0; i < 18; i++) { const px = R(x - 50 + rnd(i * 7) * 100), py = R(y + 2 + rnd(i * 11) * 10); g.px(px, py, "#F8C8D8"); }   // fallen petals
}

function hive(g) {
  const x0 = HX - 42, x1 = HX + 42, O = "#3A2A20";
  // legs + stand
  for (const lx of [HX - 32, HX + 28]) { g.rect(lx, LAND - 16, 5, 16, O); g.rect(lx + 1, LAND - 15, 3, 15, WOOD[3]); g.rect(lx + 1, LAND - 15, 1, 15, WOOD[4]); }
  g.rect(HX - 48, LAND - 22, 96, 7, O); g.rect(HX - 47, LAND - 21, 94, 5, WOOD[4]); g.rect(HX - 47, LAND - 21, 94, 1, WOOD[6]);
  // landing board sticking out to the front-left
  g.poly([[HX - 58, LAND - 22], [HX - 44, LAND - 27], [HX - 44, LAND - 22]], WOOD[5]); g.line(HX - 58, LAND - 22, HX - 44, LAND - 27, O);
  // boxes: shaded white paint, outline, hand-hold notch, plank seam
  const box = (y0, h, tone) => {
    g.rect(x0 - 1, y0 - 1, x1 - x0 + 2, h + 2, O);
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x1; x++) {
      const u = (x - x0) / (x1 - x0), v = (y - y0) / h; let s = 6 - (u > 0.78 ? 1 + (u > 0.9 ? 1 : 0) : 0) - (v > 0.82 ? 1 : 0) + (v < 0.1 ? 1 : 0) + tone;
      if (u > 0.74 && u < 0.78 && (u - 0.74) / 0.04 > bayer(x, y)) s -= 1; g.px(x, y, PAINT[Math.max(1, Math.min(7, s))]);
    }
    g.rect(HX - 9, y0 + R(h * 0.38), 18, 3, PAINT[2]); g.rect(HX - 9, y0 + R(h * 0.38), 18, 1, PAINT[1]);
  };
  box(LAND - 62, 39, 0); box(LAND - 96, 33, 0);
  g.rect(x0, LAND - 63, x1 - x0, 1, PAINT[3]);
  // entrance slot with a little shadow, honey drip from the seam
  g.rect(HX - 24, LAND - 29, 34, 5, "#20140C"); g.rect(HX - 24, LAND - 29, 34, 1, "#0E0806");
  for (const [dx, len] of [[-30, 7], [-25, 4], [16, 9], [21, 5]]) { g.rect(HX + dx, LAND - 63, 2, len, "#E8A21C"); g.px(HX + dx, LAND - 63 + len, "#F4C040"); g.px(HX + dx, LAND - 63, "#FFE07A"); }
  // gabled roof (honey wood with planks)
  const ry = LAND - 97, ax = HX, ay = ry - 30;
  g.poly([[x0 - 12, ry + 2], [ax, ay - 2], [x1 + 12, ry + 2]], O);
  g.poly([[x0 - 9, ry], [ax, ay + 1], [x1 + 9, ry]], WOOD[4]);
  for (let y = ay + 2; y < ry; y++) { const half = ((y - ay) / (ry - ay)) * (x1 - x0 + 18) / 2; if ((y - ay) % 6 === 0) g.line(R(ax - half + 1), y, R(ax + half - 1), y, WOOD[3]); g.px(R(ax - half + 1), y, WOOD[6]); g.px(R(ax - half + 2), y, WOOD[5]); }
  g.rect(x0 - 10, ry, x1 - x0 + 20, 3, WOOD[2]); g.rect(x0 - 10, ry, x1 - x0 + 20, 1, WOOD[5]);
  // little heart window painted on the gable
  for (const [dx, dy] of [[-2, 0], [-1, -1], [1, -1], [2, 0], [-2, 1], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [0, 3], [-1, 0], [0, 0], [1, 0]]) g.px(ax + dx, ry - 12 + dy, "#E05A6A");
}

// ---------------------------------------------------------------- the bee
const BEE_EYE = ["#0A0610", "#1A1020", "#2A1A30", "#6A4A2A", "#A87A3A"];
const STRIPE = ["#07060C", "#0E0A14", "#16101E", "#1E1628", "#2A1E30", "#3A2A3A", "#4E3A44", "#6A5050"];
const FUZZ = ["#3A2604", "#6A4808", "#A07010", "#D09A20", "#F2C23A", "#FAD866", "#FDE89A", "#FFF6D0"];
/** Chubby honeybee facing the camera. (x, y) = head centre. o: tilt (rad), look, blink, open, wing phase, a. */
function drawBee(c, x, y, t, o = {}) {
  const tilt = o.tilt ?? 0, a = o.a ?? 1, P = (dx, dy) => { const cs = Math.cos(tilt), sn = Math.sin(tilt); dy -= 40; return [x + dx * cs - dy * sn, y + 40 + dx * sn + dy * cs]; };
  const poly = (p) => xform(p, x, y + 40, tilt);
  // wings (behind): fast continuous flutter with a faint ghost of the previous position
  const flap = Math.sin(t * 2 * Math.PI * MT.wingHz), flapPrev = Math.sin((t - 0.025) * 2 * Math.PI * MT.wingHz);
  for (const [k, ph, dens] of [[flapPrev, 1, 0.34], [flap, 0, 0.8]]) for (const side of [-1, 1]) for (const [ln, base, w] of [[62, -0.58, 0.36], [42, -0.02, 0.4]]) {
    const th = base - k * 0.3, ang = (side > 0 ? th : Math.PI - th) + tilt, root = P(side * 30, 30);
    const dx = Math.cos(ang), dy = Math.sin(ang), wing = ell(root[0] + dx * ln * 0.5, root[1] + dy * ln * 0.5, ln * 0.5, ln * w, ang), g = fade(c, a * dens);
    g.poly(wing, null, (X, Y) => (((X + Y) & 1) === 0 ? "#F4FCFF" : ((X ^ Y) & 3) === 1 ? "#B8DCFA" : null));
    if (ph) continue;
    for (let i = 0; i < wing.length; i++) { const p = wing[i], q = wing[(i + 1) % wing.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#4E7EB4"); }
    g.line(R(root[0] + dx * 4), R(root[1] + dy * 4), R(root[0] + dx * ln * 0.78), R(root[1] + dy * ln * 0.78), "#A8CCEA");
  }
  // abdomen (striped), stinger, tiny legs
  const ab = poly(ell(x, y + 64, 44, 40, 0, 48));
  const st = poly([[x - 5, y + 100], [x + 5, y + 100], [x, y + 112]]);
  blob(c, [st], { ramp: RAMP.ink, thick: 3, a });
  for (const s of [-1, 1]) for (const [dx, dy, ex, ey] of [[14, 96, 18, 106], [26, 90, 34, 99]]) { const p = P(s * dx, dy), q = P(s * ex, ey); fade(c, a).line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#140E1C"); fade(c, a).px(R(q[0]) + s, R(q[1]), "#140E1C"); }
  blob(c, [ab], { ramp: RAMP.bee, base: 3.3, gain: 2.2, thick: 18, a, litOutline: "#5A3A04" });
  // stripes: recolour the shaded yellow to the ink ramp inside curved bands (keeps the volume shading)
  const idx = new Map(RAMP.bee.map((h, i) => [h, i]));
  for (const [s0, s1] of [[y + 54, y + 66], [y + 78, y + 89]]) {
    for (let Y = R(s0 - 6); Y <= R(s1 + 8); Y++) for (let X = R(x - 46); X <= R(x + 46); X++) {
      const u = (X - x) / 44, yy = Y - 6 * (1 - u * u) - (X - x) * Math.tan(tilt);
      if (yy < s0 || yy > s1) continue; const col = c.get(X, Y), hx = "#" + col.map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase(), i = idx.get(hx);
      if (i !== undefined && (a >= 1 || a > bayer(X, Y))) c.px(X, Y, STRIPE[i]);
    }
  }
  // fuzzy collar (thorax fluff) and head
  const fz = (cx, cy, rx, ry, n, amp, ph) => { const out = []; for (let i = 0; i < n; i++) { const an = (i / n) * 6.283, k = 1 + amp * (i % 2 ? 1 : -0.4) * (0.7 + 0.3 * Math.sin(i * 1.7 + ph)); out.push([cx + Math.cos(an) * rx * k, cy + Math.sin(an) * ry * k]); } return out; };
  blob(c, [poly(fz(x, y + 34, 38, 16, 44, 0.07, 1))], { ramp: FUZZ, base: 4.4, gain: 1.8, thick: 8, a, litOutline: "#6A4808" });
  blob(c, [poly(fz(x, y, 46, 42, 72, 0.025, 0))], { ramp: RAMP.bee, base: 3.9, gain: 2.0, thick: 20, a, litOutline: "#6A4808" });
  // fuzzy tuft on top of the head
  for (const [dx, h, lean] of [[-6, 7, -3], [0, 10, 1], [6, 7, 4]]) { const p0 = P(dx, -40), p1 = P(dx + lean, -40 - h); blob(c, [tube([p0, [(p0[0] + p1[0]) / 2 + lean * 0.3, (p0[1] + p1[1]) / 2], p1], 2.6, 1.2)], { ramp: RAMP.bee, base: 4.6, thick: 2, a, litOutline: "#6A4808" }); }
  // antennae with round tips (sway lags behind the hover)
  const sway = Math.sin(t * 2.6) * 3 + (o.antSway ?? 0);
  for (const s of [-1, 1]) {
    const r0 = P(s * 12, -38), mid = P(s * 20 + sway * 0.4, -64), tip = P(s * 34 + sway, -74);
    blob(c, [tube(bez(r0, mid, tip, 8), 2.2, 1.8)], { ramp: RAMP.ink, thick: 2, a });
    blob(c, [ell(tip[0], tip[1], 5, 5)], { ramp: RAMP.ink, thick: 4, a, litOutline: "#302C50" });
    fade(c, a).px(R(tip[0] - 2), R(tip[1] - 2), "#8A86B4");
  }
  // face
  const [fx, fy] = P(0, 0), look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const s of [-1, 1]) { const [ex, ey] = P(s * 19, 1); eye(c, ex, ey, 13, { ry: 15, iris: BEE_EYE, pupil: "bead", look, blink, lid: RAMP.bee[4], a }); }
  { const [bx1, by1] = P(-32, 20), [bx2, by2] = P(32, 20); blush(c, bx1, by1, 8, 4, "#F0708E", a); blush(c, bx2, by2, 8, 4, "#F0708E", a); }
  const [mx, my] = P(0, 21); smile(c, mx, my, 5, { open: o.open ?? 0.35, a });
  void fx; void fy;
}

/** Tiny worker bee (8 px), flying. */
function miniBee(c, x, y, t, dir = 1, a = 1) {
  const g = fade(c, a); x = R(x); y = R(y); const up = Math.sin(t * 2 * Math.PI * 9) > 0;
  g.rect(x - 2, y - 4 + (up ? -1 : 0), 3, 3, "#EAF6FF"); g.rect(x + 1, y - 4 + (up ? -1 : 0), 3, 3, "#CFE6FA");
  g.rect(x - 4, y - 2, 9, 5, "#1A1020"); g.rect(x - 3, y - 1, 7, 3, "#F4C22A"); g.rect(x - 1, y - 1, 1, 3, "#1A1020"); g.rect(x + 1, y - 1, 1, 3, "#1A1020");
  g.px(x + 3 * dir, y - 1, "#1A1020"); g.px(x + 3 * dir, y, "#F4C22A"); g.px(x - 5 * dir, y, "#1A1020");
}

// ---------------------------------------------------------------- dance + arrow geometry (world coords)
const zig = (a, b, n, amp) => { const out = [], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; for (let i = 0; i <= n * 2; i++) { const k = i / (n * 2), w = i === 0 || i === n * 2 ? 0 : (i % 2 ? amp : -amp); out.push([a[0] + dx * k + nx * w, a[1] + dy * k + ny * w]); } return out; };
const curve = (pts, n = 10) => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < n; k++) { const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)], t = k / n, t2 = t * t, t3 = t2 * t; out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3))); } out.push(pts[pts.length - 1]); return out; };
const S = [BX + 56, BY + 32], E = [BX - 56, BY + 62];
const RUN = zig(S, E, 5, 6);
const LOOP_A = curve([E, [BX - 84, BY + 22], [BX - 50, BY - 24], [BX + 14, BY - 32], [BX + 72, BY - 8], S], 8);
const LOOP_B = curve([E, [BX - 80, BY + 100], [BX - 26, BY + 124], [BX + 40, BY + 112], [BX + 78, BY + 72], S], 8);
const DANCE = [...curve([[BX, BY], [BX + 40, BY + 12], S], 6), ...RUN.slice(1), ...LOOP_A.slice(1), ...RUN.slice(1), ...LOOP_B.slice(1)];
const TRAIL = [...RUN, ...LOOP_A.slice(1), ...RUN.slice(1), ...LOOP_B.slice(1)];
const D0 = EV.dances - 0.04, D1 = EV.dances + 1.72, BACK_T = 0.42;                         // dance window, glide back to rest
const ARROW = curve([[HX - 54, LAND - 34], [HX - 120, LAND - 96], [BX - 40, LAND - 112], [PATCH[0] + 70, LAND - 84], [PATCH[0] + 8, PATCH[1] - 22]], 10);
const A0 = EV.flowers - 0.55, A1 = EV.flowers - 0.1;                                // arrow draws on "where the flowers"
// timing table (also read by levels/meadow-motions.mjs for the sound design): every value is used by the drawing code below
export const MT = {
  panel: [EV.bees + 0.35, EV.dances - 0.25], brainLens: [EV.bees + 0.45, EV.bees + 0.75], seedLens: [EV.sesame - 0.05, EV.sesame + 0.25], equals: [EV.sesame + 0.35, EV.sesame + 0.6],
  learn: EV.learn, pickup: 1.6, joyHop: 0.5, miniBees: [EV.flowers - 0.15, EV.flowers + 0.12], miniFly: 1.1, glow: [A1 - 0.1, A1 + 0.3, EV.flowers + 2.2, EV.flowers + 2.8], wingHz: 7.5,
};
const len = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
const DL = len(DANCE), TL = len(TRAIL), PRE = len(curve([[BX, BY], [BX + 40, BY + 12], S], 6));

// dance progress: gentle start/stop, even speed in between (continuous value and slope)
function danceS(t) { const k = clamp01((t - D0) / (D1 - D0)); return (k < 0.08 ? (k * k) / 0.16 : k > 0.92 ? 0.92 - ((1 - k) * (1 - k)) / 0.16 : k - 0.04) / 0.92; }
// tilt: waggle on the straight runs, banking on the loops, blended smoothly at the run ends
const RUN_A = [0, len(RUN) / TL], RUN_B = [(len(RUN) + len(LOOP_A)) / TL, (2 * len(RUN) + len(LOOP_A)) / TL];
function danceTilt(t, s, prog) {
  const p = along(DANCE, s), p2 = along(DANCE, Math.min(1, s + 0.004)), bank = Math.max(-0.22, Math.min(0.22, -(p2.x - p.x) * 0.05));
  const inRun = Math.max(win(prog, RUN_A[0], RUN_A[1] - 0.02, 0.02, 0.02), win(prog, RUN_B[0], RUN_B[1] - 0.02, 0.02, 0.02)) * sm(t, D0, D0 + 0.15) * (1 - sm(t, D1 - 0.15, D1));
  return lerp(bank * sm(t, D0, D0 + 0.15) * (1 - sm(t, D1 - 0.2, D1)), Math.sin(t * 2 * Math.PI * 4.2) * 0.2, inRun);
}
const END_TILT = 0;
/** Bee head position + tilt at time t (world coords). */
function beeState(t) {
  const hov = Math.sin(t * 2 * Math.PI * 1.1) * 2.5;
  let x = BX, y = BY + hov, tilt = Math.sin(t * 1.7) * 0.03, prog = 0;
  if (t > D0 && t < D1 + BACK_T) {
    if (t <= D1) {
      const s = danceS(t), p = along(DANCE, s);
      x = p.x; y = p.y + hov; prog = clamp01((s * DL - PRE) / TL); tilt = danceTilt(t, s, prog);
    } else {
      const k = ease((t - D1) / BACK_T), p = along(DANCE, 1); x = lerp(p.x, BX, k); y = lerp(p.y + hov, BY + hov, k); tilt = lerp(END_TILT, Math.sin(t * 1.7) * 0.03, k); prog = 1;
    }
  } else if (t >= D1 + BACK_T) prog = 1;
  return { x, y, tilt, prog };
}

// ---------------------------------------------------------------- module passes
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V);
  // patch glow once the arrow points at it: sparkles over the target flowers
  const glow = sm(t, MT.glow[0], MT.glow[1]) * (1 - sm(t, MT.glow[2], MT.glow[3]));
  if (glow > 0) for (let i = 0; i < 9; i++) {
    const ph = (t * 1.3 + rnd(i * 5)) % 1, s = Math.sin(ph * Math.PI), x = R(V.X(PATCH[0] + (rnd(i * 3) - 0.5) * 110)), y = R(V.Y(PATCH[1] + 6 - rnd(i * 7) * 34)), g = fade(c, glow * s);
    g.px(x, y, "#FFFFFF"); if (s > 0.5) { g.px(x - 1, y, "#FFF6B0"); g.px(x + 1, y, "#FFF6B0"); g.px(x, y - 1, "#FFF6B0"); g.px(x, y + 1, "#FFF6B0"); }
  }
}

export function actors(c, V, t) {
  if (off(V)) return;
  sign(c, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 4", "wood", 1, t);
  // hive workers: three tiny bees circling the entrance all the time
  for (let i = 0; i < 3; i++) { const ph = t * (0.9 + i * 0.23) + i * 2.1, x = HX - 30 + Math.cos(ph * 2.2) * (12 + i * 6), y = LAND - 40 + Math.sin(ph * 3.1) * (6 + i * 3) - i * 10; miniBee(c, V.X(x), V.Y(y), t + i, Math.cos(ph * 2.2 + 1.57) > 0 ? -1 : 1); }
  // waggle-dance trail (dotted, behind the bee), dissolving after the arrow appears
  const st = beeState(t), trailA = 1 - sm(t, EV.flowers + 0.4, EV.flowers + 1.0);
  if (st.prog > 0 && trailA > 0) dotted(c, TRAIL.map(([x, y]) => [V.X(x), V.Y(y) + 30]), st.prog, "#FFFFFF", { gap: 6, size: 2, a: trailA, dark: "#8A5A10" });
  // the dotted arrow from the hive to the patch + arrowhead
  const ak = ease(clamp01((t - A0) / (A1 - A0))), aa = 1 - sm(t, EV.flowers + 2.0, EV.flowers + 2.6);
  if (ak > 0 && aa > 0) {
    const pts = ARROW.map(([x, y]) => [V.X(x), V.Y(y)]); dotted(c, pts, ak, C.Y, { gap: 8, size: 3, a: aa, dark: "#3A2A08" });
    const tip = along(pts, ak), back = along(pts, Math.max(0, ak - 0.04)), ang = Math.atan2(tip.y - back.y, tip.x - back.x), g = fade(c, aa * sm(ak, 0.05, 0.2));
    const hp = (d, s) => [tip.x + Math.cos(ang) * d - Math.sin(ang) * s, tip.y + Math.sin(ang) * d + Math.cos(ang) * s];
    g.poly([hp(11, 0), hp(-8, -10), hp(-4, 0), hp(-8, 10)], "#3A2A08"); g.poly([hp(8, 0), hp(-6, -7), hp(-2, 0), hp(-6, 7)], C.Y);
  }
  // two small bees fly off along the arrow and keep buzzing over the patch
  for (const [i, t0] of [[0, MT.miniBees[0]], [1, MT.miniBees[1]]]) {
    if (t < t0) continue; const k = clamp01((t - t0) / MT.miniFly), p = along(ARROW, ease(k)), wob = Math.sin(t * 9 + i * 2) * 2;
    let x = p.x, y = p.y - 6 + wob;
    if (k >= 1) { const q = t - t0 - MT.miniFly; x += Math.sin(q * 2.4 + i) * 10 * sm(q, 0, 0.6) - 4 * i; y += Math.cos(q * 3.1 + i) * 5 * sm(q, 0, 0.6) - 4 * i; }
    miniBee(c, V.X(x + i * 8), V.Y(y - i * 6), t + i * 0.3, -1, sm(t, t0, t0 + 0.2));
  }
  // the bee
  const look = [0, 0];
  const up = win(t, EV.bees + 0.45, EV.learn - 0.3, 0.35, 0.35); look[1] -= 0.75 * up;     // glances up at the panel
  const watch = sm(t, EV.flowers - 0.2, EV.flowers + 0.3); look[0] -= 0.7 * watch; look[1] += 0.5 * watch;  // watches the bees leave
  const joy = win(t, EV.learn, EV.learn + 1.2, 0.2, 0.4), hop = Math.sin(clamp01((t - MT.learn) / MT.joyHop) * Math.PI) * 5;
  drawBee(c, R(V.X(st.x)), R(V.Y(st.y) - hop), t, { tilt: st.tilt, look, blink: blinkAt(t, 3.3, 0.7), open: 0.35 + 0.45 * joy });
}

export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V);
  // three tall swaying flowers in the foreground corners (alive, never in front of the bee)
  for (const [wx, wy, h, ci] of [[RX0 + 22, 262, 64, 0], [RX0 + 505, 250, 70, 3], [RX0 + 470, 282, 46, 2]]) {
    const sw = Math.sin(t * 1.4 + wx) * 3, x = V.X(wx), y = V.Y(wy);
    for (let j = 0; j <= h; j++) { const k = j / h; c.px(R(x + sw * k * k), R(y - j), "#2E6A30"); c.px(R(x + sw * k * k) + 1, R(y - j), j % 9 < 4 ? "#3E8238" : "#2E6A30"); }
    flower(c, x + sw, y - h, 6, FLW[ci][0], FLW[ci][1]);
  }
}

export function hud(c, V, t) {
  if (off(V)) return;
  const ox = R(V.X(BX)) - 270, oy = R(V.Y(BY)) - 360;   // the panel rides with the world during pans
  // magnifier panel: BEE BRAIN = SESAME SEED
  const pa = win(t, MT.panel[0], MT.panel[1], 0.3, 0.3);
  if (pa > 0) {
    const px = 62 + ox, py = 134 + oy;
    panel(c, px, py, 416, 116, pa, C.Y);
    const la = Math.min(pa, sm(t, MT.brainLens[0], MT.brainLens[1])), sa = Math.min(pa, sm(t, MT.seedLens[0], MT.seedLens[1])), ea = Math.min(pa, sm(t, MT.equals[0], MT.equals[1]));
    lens(c, px + 92, py + 48, la, "brain", t); lens(c, px + 324, py + 48, sa, "seed", t);
    const g = fade(c, ea); g.text(MAIN, "=", px + 200, py + 38, C.O, { scale: 3 }); g.text(MAIN, "=", px + 199, py + 36, C.Y, { scale: 3 });
    const lab = (s, cx, a) => { const w = c.measure(MAIN, s, { scale: 2 }), q = fade(c, a); q.text(MAIN, s, R(cx - w / 2) + 1, py + 92 + 1, C.O, { scale: 2 }); q.text(MAIN, s, R(cx - w / 2), py + 92, C.IV, { scale: 2 }); };
    lab("BEE BRAIN", px + 92, la); lab("SESAME SEED", px + 324, sa);
  }
  // +LEARN on "learn"
  const k = (t - MT.learn) / MT.pickup; if (k > 0 && k < 1) { const st = beeState(t); pickup(c, R(V.X(st.x)), R(V.Y(st.y)) - 60, "+LEARN", k); }
}

/** Round magnifier with a tiny object inside (the same size: the bee's brain or a sesame seed). */
function lens(c, x, y, a, what, t) {
  if (a <= 0) return; const g = fade(c, a), r = 30, rise = R((1 - a) * 4); y += rise;
  // handle
  for (let i = 0; i < 16; i++) { const hx = R(x + r * 0.72 + i * 0.7), hy = R(y + r * 0.72 + i * 0.7); g.rect(hx - 2, hy - 2, 6, 6, "#2A160C"); }
  for (let i = 2; i < 15; i++) { const hx = R(x + r * 0.72 + i * 0.7), hy = R(y + r * 0.72 + i * 0.7); g.rect(hx - 1, hy - 1, 4, 4, "#8A5834"); g.px(hx - 1, hy - 1, "#C49464"); }
  // glass + rim
  for (let Y = -r - 3; Y <= r + 3; Y++) for (let X = -r - 3; X <= r + 3; X++) {
    const d = Math.hypot(X, Y); if (d > r + 3) continue;
    let col = d > r + 1.5 ? "#2A160C" : d > r - 1.5 ? (X + Y < 0 ? "#F4D27A" : "#C8962E") : d > r - 2.5 ? "#2A160C" : (Y < -r * 0.2 ? "#E6F8FF" : "#CDEEFA");
    if (d <= r - 2.5 && (X + Y) / r < -0.75 && d > r * 0.55) col = "#FFFFFF";
    g.px(x + X, y + Y, col);
  }
  const bob = Math.sin(t * 2.2 + (what === "seed" ? 1 : 0)) * 1;
  if (what === "seed") {
    // sesame seed: cream teardrop, pointed to the upper right
    const s = xform([[-11, 4], [-9, -3], [-3, -8], [5, -9], [12, -10], [9, -3], [3, 4], [-4, 7]], 0, 0, 0, 1.3, 1.3).map(([u, v]) => [x + u, y + v + bob]);
    g.poly(s.map(([u, v]) => [u - 1, v - 1]), "#5A3A16"); g.poly(s.map(([u, v]) => [u + 1, v + 1]), "#5A3A16"); g.poly(s, "#F2E2B6");
    g.line(R(x - 7), R(y + 2 + bob), R(x + 8), R(y - 7 + bob), "#D8C08A"); g.px(R(x - 5), R(y - 3 + bob), "#FFFFFF"); g.px(R(x - 4), R(y - 4 + bob), "#FFFFFF");
  } else {
    // bee brain: two pink lobes with folds, same size as the seed
    const K = 1.3;
    for (let Y = -12; Y <= 12; Y++) for (let X = -17; X <= 17; X++) {
      const u = X / K, v = Y / K, inL = ((u + 6) / 8) ** 2 + (v / 8.5) ** 2 <= 1, inR = ((u - 6) / 8) ** 2 + (v / 8.5) ** 2 <= 1; if (!inL && !inR) continue;
      const edgeL = ((u + 6) / 7.2) ** 2 + (v / 7.7) ** 2 > 1, edgeR = ((u - 6) / 7.2) ** 2 + (v / 7.7) ** 2 > 1;
      const col = (inL && !inR && edgeL) || (inR && !inL && edgeR) || (inL && inR && edgeL && edgeR) ? "#6A1A34" : X === 0 ? "#9C2A4C" : v < -3 ? "#F8BCCB" : v > 4 ? "#E26A88" : "#F094AA";
      g.px(R(x + X), R(y + Y + bob), col);
    }
    for (const [x0, y0, x1, y1] of [[-9, -3, -5, -1], [-5, -1, -3, -4], [-10, 3, -5, 4], [-6, 5, -3, 3], [4, -4, 7, -1], [7, -1, 10, -3], [4, 3, 9, 4], [8, 5, 10, 2]]) g.line(R(x + x0 * K), R(y + y0 * K + bob), R(x + x1 * K), R(y + y1 * K + bob), "#C84468");
    g.px(R(x - 8), R(y - 6 + bob), "#FFFFFF");
  }
}
// geometry/timing shared with levels/meadow-motions.mjs (sound design)
export { BX, BY, HX, PATCH, D0, D1, BACK_T, A0, A1, DANCE, TRAIL, RUN, LOOP_A, LOOP_B, DL, TL, PRE, RUN_A, RUN_B, danceS, beeState };
