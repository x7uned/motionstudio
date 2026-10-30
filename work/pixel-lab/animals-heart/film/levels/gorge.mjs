// LV9 · hummingbird — a flowering mountain gorge in warm afternoon light (RANGE BIOME.gorge = 4050..4590). Farm grass
// from the barn on the left climbs into a sandstone cliff; the gorge opens on hazy blue peaks with the sun disc between
// the walls; a waterfall drops from the right cliff into a pool with mist; red tube flowers (penstemon-like) grow on the
// ledges and in front; the right cliff steps down to dry grass and a young olive toward the Mediterranean wall.
// The blue-throated hummingbird hovers face-on under the sun at a red flower; its heart flickers with
// pulse("hummingbird", t) (1,260 BPM = 21 beats a second: an intense buzz, the ring and the "buzz" ticks jitter);
// "race" → speed lines streak past; "twelve hundred" → 1,260 BPM.
import { BIOME, LAND, EV, LV, pulse } from "../timeline.mjs";
import { blob, ell, C, sign, pickup, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01 } from "../cute.mjs";
import { Layer, tuft, leafBall, grassAt, GRASS, thick, pickupC } from "./meadow-kit.mjs";
import { drawHummingbird } from "./hummingbird-art.mjs";
import { heartIcon } from "./meadow-heart.mjs";

export const RANGE = BIOME.gorge;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (4320, -180): screen = (wx - 4050, wy + 660)
const HB = [4320, -300];                        // hummingbird head (screen 270, 360)
const FL = [4242, -286];                        // the flower it drinks from: its mouth sits at the beak tip (screen ~205, 391)
const SIGN = [4128, -10];                       // LV 9 wooden sign (screen 78, 650)
const FALL = [4446, -372, -52];                 // waterfall x, top y (a notch in the right wall), pool y

const ROCK = ["#2E1E22", "#4A3032", "#684840", "#86604E", "#A47A5E", "#C09470", "#D8B086", "#ECCCA2"];
const ROCK_FAR = ["#7A6E8A", "#8C819C", "#A096AE", "#B4ACC0"];
const PEAK = ["#8A9CC8", "#9EAED4", "#B4C2E0", "#CAD6EC", "#E4ECF8"];
const DRY = ["#C8B46A", "#B8A45A", "#A8944E", "#988446", "#88763E"];
const GRASS_G = ["#B8DA74", "#A6D066", "#92C45A", "#7EB64E", "#6CA846", "#5C9A40", "#4E8A3A", "#427A36", "#386C32", "#2E5E2C", "#265026"];
const OLIVE = ["#2E3A22", "#3E4C2C", "#506036", "#647444", "#7A8A56", "#94A06C", "#AEB888", "#C8CEA4"];

// the two gorge walls: unions of big rounded rock masses (volume-shaded like the first film's kopje), world coords
const LEFT_WALL = [[4086, -100, 52, 96], [4100, -270, 44, 112], [4116, -420, 36, 84], [4128, -520, 24, 44], [4152, -190, 44, 90], [4178, -70, 54, 58], [4140, -340, 30, 70]];
const RIGHT_WALL = [[4486, -96, 60, 86], [4462, -250, 44, 104], [4472, -400, 34, 70], [4466, -490, 22, 40], [4512, -200, 44, 90], [4552, -70, 46, 56], [4430, -110, 40, 70]];
// timing table of every visible change (used by the picture AND by levels/meadow-motions.mjs for the sound)
export const T = {
  RACE: [EV.race - 0.1, LV.hummingbird[1] - 0.1, 0.2, 0.4], LOOK: [EV.race, EV.race + 0.3], HEART_IN: [EV.hummingbird - 0.2, EV.hummingbird + 0.1],
  JITTER_IN: [EV.hummingbird, EV.hummingbird + 0.3], PICKUP: [EV.twelve, 1.6], HB: { x: HB[0], half: 100 }, FALL: { x: FALL[0], half: 40 },
};
let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(RX0, -660, RX1 + 40, 320); FRONT = new Layer(RX0 - 20, 40, RX1 + 40, 320);
  const g = BACK.g, f = FRONT.g;
  // distant blue peaks in the gap of the gorge (below the sun disc), with snow tips
  for (let x = RX0 + 100; x < RX0 + 470; x++) {
    const h = 150 + 60 * Math.sin(x * 0.019 + 1) + 34 * Math.sin(x * 0.051) + 20 * Math.abs(Math.sin(x * 0.009 + 2)), top = R(LAND - h);
    for (let y = top; y < LAND; y++) { const k = (y - top) / h; let s = k < 0.04 ? 4 : k < 0.12 && Math.sin(x * 0.4) > -0.3 ? 4 : k < 0.3 ? 3 : k < 0.6 ? 2 : 1; if ((x * 3 + y) % 17 === 0 && s > 1) s--; g.px(x, y, PEAK[s]); }
  }
  for (let x = RX0 + 90; x < RX0 + 480; x++) { const h = 70 + 28 * Math.sin(x * 0.033 + 4) + 12 * Math.sin(x * 0.11), top = R(LAND - h); for (let y = top; y < LAND; y++) { const k = (y - top) / h; g.px(x, y, ROCK_FAR[k < 0.08 ? 3 : k < 0.4 ? 2 : (k - 0.4) * 2 > bayer(x, y) ? 0 : 1]); } }
  // gorge floor: farm grass at the barn seam → green meadow grass → dry golden grass at the Mediterranean seam
  for (let y = LAND; y < 320; y++) for (let x = RX0; x < RX1 + 40; x++) {
    let col = grassAt(x, y, y - LAND, GRASS_G);
    const dry = sm(x, RX1 - 120, RX1 - 10); if (dry > 0) { const d = DRY[Math.min(4, Math.floor(Math.sqrt(Math.max(0, y - LAND) / 330) * 5))]; col = dry > bayer(x, y) ? d : col; }
    const farm = 1 - sm(x, RX0, RX0 + 60); if (farm > 0 && farm > bayer(x, y)) col = grassAt(x, y, y - LAND, GRASS);
    g.px(x, y, col);
  }
  g.rect(RX0, LAND, RX1 - RX0 + 40, 1, "#D0EC90");
  for (let i = 0; i < 3800; i++) { const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 201), 1.4) * 336), x = R(RX0 + rnd(i * 3 + 202) * (RX1 - RX0 + 36)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4; const col = rnd(i * 5 + 7) < 0.6 ? mix(g.get(x, y), "#2A4A1A", 0.3) : mix(g.get(x, y), "#FFF4B0", 0.28); for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col); }
  // the two gorge walls (sandstone masses with soft strata, cracks, sunlit ledges)
  wall(g, LEFT_WALL, 3); wall(g, RIGHT_WALL, 9);
  // a little stream runs from the pool toward us, widening with perspective (sparkles are drawn per frame)
  for (let y = FALL[2] + 4; y < 320; y++) { const k = (y - FALL[2]) / (320 - FALL[2]), cx = streamX(y), w = 4 + k * k * 40; for (let x = R(cx - w - 2); x <= R(cx + w + 2); x++) { const e = Math.abs(x - cx) / w; if (e > 1.12) continue; g.px(x, y, e > 1 ? "#6A5A3A" : e > 0.86 ? "#8AD0E8" : ((x + y) & 1) && e < 0.5 ? "#5AB4D8" : "#4AA0CC"); } }
  // pool at the foot of the waterfall
  for (let y = FALL[2] - 10; y <= FALL[2] + 10; y++) for (let x = FALL[0] - 54; x <= FALL[0] + 54; x++) { const d = ((x - FALL[0]) / 54) ** 2 + ((y - FALL[2]) / 10) ** 2; if (d <= 1) g.px(x, y, d > 0.8 ? ROCK[2] : y < FALL[2] - 3 ? "#7AC8E0" : "#4AA0C8"); }
  // shrubs on ledges and flowers on the cliffs
  for (const [x, y, r] of [[4122, -360, 9], [4160, -232, 11], [4196, -116, 8], [4466, -440, 8], [4500, -280, 10], [4530, -150, 9]]) leafBall(g, x, y, r, ["#24401E", "#305426", "#3E6A2E", "#4E8238", "#62984A", "#7CAE5C"], x, { amp: 0.12, bumps: 7 });
  for (const [x, y, n] of [[4128, -350, 4], [4166, -222, 5], [4200, -108, 4], [4506, -272, 5], [4536, -142, 4], [4232, LAND + 2, 6], [4396, LAND + 4, 5], [4560, LAND + 3, 4]]) tubeCluster(g, x, y, n, x * 7);
  // olive sapling and dry tufts at the right edge, toward the Mediterranean wall
  olive(g, RX1 - 30, LAND + 2);
  for (let i = 0; i < 10; i++) tuft(g, RX1 - 110 + i * 12, LAND + 3, 12 + (i % 3) * 4, 5, ["#A8904A", "#C8B06A", "#E8D490"], i * 11, 2);
  for (let i = 0; i < 6; i++) tuft(g, RX0 + 6 + i * 9, LAND + 3, 9 + (i % 2) * 3, 4, ["#4E9A42", "#6AB04E", "#8ECC62"], i * 7, -1);
  // FRONT: rocks and red tube flowers along the bottom, grass blades
  for (let i = 0; i < 50; i++) { const x = R(RX0 - 10 + rnd(i * 13 + 302) * (RX1 - RX0 + 40)), y = R(LAND + 250 + rnd(i * 13 + 305) * 90); tuft(f, x, y, 14 + rnd(i + 31) * 16, 4 + Math.floor(rnd(i * 3 + 11) * 4), x > RX1 - 90 ? ["#8A7438", "#B09A50", "#D8C47A"] : ["#2E5A26", "#3E7230", "#5A9440"], i * 5 + 13, (rnd(i * 9 + 12) - 0.5) * 6); }
  for (const [x, y, rx, ry] of [[RX0 + 20, 300, 46, 26], [RX0 + 70, 312, 30, 18], [RX1 - 36, 306, 44, 24]]) blob(f, [ell(x, y, rx, ry)], { ramp: ROCK, thick: 14, base: 3.4, gain: 2.2, litOutline: ROCK[4] });
  for (const [x, y, n] of [[RX0 + 110, 300, 8], [RX0 + 380, 312, 6], [RX0 + 250, 312, 6]]) tubeCluster(f, x, y, n, x * 3, 1.6);
}
const streamX = (y) => FALL[0] + 6 + Math.sin((y - FALL[2]) * 0.018) * 22 + ((y - FALL[2]) / 372) ** 2 * 40;
function wall(g, masses, seed) {
  const polys = masses.map(([x, y, rx, ry], i) => ell(x, y, rx, ry, (rnd(seed + i) - 0.5) * 0.3, 40).map(([u, v], k) => [u + Math.sin(k * 1.7 + i) * 2.5, v + Math.cos(k * 2.3 + i) * 2.5]));
  const top = Math.min(...masses.map(([, y, , ry]) => y - ry)), x0 = Math.min(...masses.map(([x, , rx]) => x - rx)) - 4, x1 = Math.max(...masses.map(([x, , rx]) => x + rx)) + 4;
  blob(g, polys, { ramp: ROCK, thick: 46, base: 2.9, gain: 2.4, slope: 0.9, light: [-0.7, -0.6], litOutline: ROCK[3] });
  // soft wavy strata, vertical cracks, lit ledge lips (only on the rock just painted)
  const has = (x, y) => masses.some(([mx, my, rx, ry]) => ((x - mx) / (rx - 1)) ** 2 + ((y - my) / (ry - 1)) ** 2 <= 1);
  for (let y = R(top); y < LAND + 2; y++) for (let x = R(x0); x <= R(x1); x++) {
    if (!has(x, y) || !has(x, y - 2) || !has(x - 2, y) || !has(x + 2, y)) continue;
    const sy = y + Math.sin(x * 0.06 + seed) * 5 + Math.sin(x * 0.17) * 1.5;
    if (((R(sy) % 26) + 26) % 26 === 0) { g.px(x, y, mix(g.get(x, y), ROCK[1], 0.45)); if (has(x, y + 1)) g.px(x, y + 1, mix(g.get(x, y + 1), ROCK[7], 0.18)); }
    else if (Math.abs(((x * 5 + Math.floor(sy / 26) * 37 + seed * 11) % 53) - 26) < 0.6 && ((y + x) % 3)) g.px(x, y, mix(g.get(x, y), ROCK[0], 0.4));
  }
  // grass and moss tufts on the top edges
  for (let x = R(x0); x <= R(x1); x += 3) { let y = R(top) - 1; while (y < LAND && !has(x, y)) y++; if (y >= LAND - 4 || rnd(x * 7 + seed) < 0.45) continue; tuft(g, x, y + 1, 5 + rnd(x) * 4, 3, ["#3E6A2E", "#5A8A3A", "#86B058"], x, 0); }
}
function tubeCluster(g, x, y, n, seed, s = 1) {
  for (let i = 0; i < n; i++) {
    const sx = x + (rnd(seed + i * 3) - 0.5) * 26 * s, h = (16 + rnd(seed + i * 5) * 18) * s, lean = (rnd(seed + i * 7) - 0.5) * 6;
    for (let j = 0; j <= h; j++) g.px(R(sx + lean * (j / h) ** 2), R(y - j), j % 7 < 4 ? "#3E6A2E" : "#2E5424");
    for (let k = 0; k < 4; k++) { const fy = y - h + k * 4 * s, fx = sx + lean + (k % 2 ? 2 : -2) * s; tubeFlower(g, fx, fy, k % 2 ? 1 : -1, s); }
  }
}
export function tubeFlower(g, x, y, dir, s = 1) {
  // a drooping red tube: dark base, bright body, a pale flared mouth
  const L = R(7 * s), w = Math.max(1, R(1.6 * s));
  for (let i = 0; i <= L; i++) { const px = R(x + dir * i * 0.55), py = R(y + i * 0.85); for (let j = -w; j <= w; j++) g.px(px + j, py, i < 2 ? "#8A1A22" : j === -w ? "#FF6A5A" : "#E0282E"); }
  const mx = R(x + dir * L * 0.55), my = R(y + L * 0.85) + 1; g.rect(mx - w - 1, my, w * 2 + 3, 1, "#FF9A8A"); g.px(mx, my + 1, "#FFE0A0");
}
function olive(g, x, y) {
  thick(g, [[x, y], [x - 3, y - 18], [x + 2, y - 34], [x - 4, y - 52]], 2, "#5A4A3A"); thick(g, [[x - 1, y - 30], [x + 14, y - 44]], 1, "#5A4A3A"); thick(g, [[x - 2, y - 40], [x - 18, y - 52]], 1, "#5A4A3A");
  for (const [dx, dy, r] of [[-4, -58, 16], [12, -50, 12], [-18, -52, 11], [2, -70, 11]]) leafBall(g, x + dx, y + dy, r, OLIVE, dx * 3 + 7, { amp: 0.18, bumps: 9 });
}

// ---------------------------------------------------------------- per-frame pieces
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
function waterfall(c, V, t) {
  const x = R(V.X(FALL[0])), y0 = R(V.Y(FALL[1])), y1 = R(V.Y(FALL[2]));
  for (let y = Math.max(0, y0); y < Math.min(960, y1); y++) {
    const k = (y - y0) / (y1 - y0), w = 7 + k * 9 + Math.sin(y * 0.11 + t * 6) * 0.8, cx = x - 3 + k * 3;
    for (let dx = R(-w - 1); dx <= R(w + 1); dx++) {
      const e = Math.abs(dx) / w; if (e > 1 && (e - 1) * 3 > bayer(x + dx, y) * 0.6) continue;
      const lane = Math.floor((dx + 40) / 3), ph = ((y - t * (150 + (lane % 3) * 30) + lane * 17) % 28 + 28) % 28;
      c.px(R(cx) + dx, y, e > 0.82 ? ((x + dx + y) & 1 ? "#9AD4EC" : "#D8F2FF") : ph < 3 ? "#FFFFFF" : ph < 10 ? "#DDF4FF" : (dx + y) & 1 ? "#A4DAF2" : "#BAE4F8");
    }
  }
  // glints drifting down the stream
  for (let i = 0; i < 18; i++) { const ph = ((t * 0.35 + rnd(i * 7 + 3)) % 1), y = FALL[2] + 8 + ph * (320 - FALL[2] - 8), k = (y - FALL[2]) / (320 - FALL[2]), w = 4 + k * k * 40, sx = R(V.X(streamX(y) + (rnd(i * 5) - 0.5) * w * 1.4)), sy = R(V.Y(y)); if (sy < 0 || sy >= 960) continue; c.px(sx, sy, "#FFFFFF"); if (k > 0.3) c.px(sx + 1, sy, "#D8F4FF"); }
  // lip where it pours over the notch, foam, mist puffs at the pool
  for (let dx = -9; dx <= 9; dx++) { c.px(x - 3 + dx, y0, "#FFFFFF"); if (Math.abs(dx) < 7) c.px(x - 3 + dx, y0 + 1, "#E8F8FF"); }
  for (let i = 0; i < 28; i++) { const ph = ((t * 0.9 + rnd(i * 3)) % 1), mx = x + (rnd(i * 7) - 0.5) * 64, my = y1 - 4 - ph * 28, g = fade(c, (1 - ph) * 0.85); g.rect(R(mx), R(my), 2 + (i % 2), 2, "#F4FCFF"); }
  for (let dx = -30; dx <= 30; dx++) { const yy = y1 - 2 + R(Math.sin(dx * 0.6 + t * 9) * 1.2); c.px(x + dx, yy, "#FFFFFF"); if (Math.abs(dx) < 22) c.px(x + dx, yy - 1, "#E8F8FF"); }
}
function speedLines(c, V, t, a) {
  if (a <= 0) return; const g = fade(c, a);
  for (let i = 0; i < 14; i++) {
    const y = R(250 + rnd(i * 5 + 1) * 260), L = 30 + rnd(i * 3) * 70, sp = 900 + rnd(i * 7) * 500, x = 560 - (((t * sp) + rnd(i * 11) * 900) % 900);
    let x0 = x, x1 = x + L; if (Math.abs(y - 380) < 100) { if (x1 > 180 && x0 < 360) { if (x0 < 180) x1 = 180; else if (x1 > 360) x0 = 360; else continue; } }   // keep clear of the bird
    g.rect(R(x0), y, R(x1 - x0), 2, "#FFFFFF"); if (x1 === x + L) g.rect(R(x1), y, R(L * 0.4), 1, "#FFF4D0");
  }
}

export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V, { x0: Math.max(0, R(V.X(RX0))) });
  waterfall(c, V, t);
}
export function actors(c, V, t) {
  if (off(V)) return;
  sign(c, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 9", "wood", 1, t);
  // the flower it drinks from, on a long nodding stem from the left ledge
  const nod = Math.sin(t * 1.7) * 1.5, fx = V.X(FL[0]) + nod, fy = V.Y(FL[1]);
  for (let i = 0; i < 110; i++) { const k = i / 110, x = lerp(fx - 2, V.X(4176), k * k), y = lerp(fy - 4, V.Y(-120), k); c.px(R(x), R(y), "#2E5424"); c.px(R(x) + 1, R(y), "#4A7A34"); }
  for (const [dx, dy, d, k] of [[-9, -12, -1, 2.4], [5, -20, 1, 2.2], [-5, -30, -1, 2], [3, -38, 1, 1.8], [0, 0, 1, 2.8]]) tubeFlower(c, fx + dx, fy + dy, d, k);
  for (const [dx, dy] of [[-3, -6], [2, -26], [-2, -44]]) { c.rect(R(fx + dx) - 2, R(fy + dy), 5, 2, "#3E7A2E"); c.px(R(fx + dx) + 3, R(fy + dy) - 1, "#5A9A3A"); }
  const race = win(t, ...T.RACE);
  speedLines(c, V, t, race * 0.85);
  // the hummingbird: buzzing wings, a tiny jitter while its heart races; the heart flickers on its chest
  const p = pulse("hummingbird", t), jit = (rnd(Math.floor(t * 30) * 7 + 1) - 0.5) * 1.4 * sm(t, T.JITTER_IN[0], T.JITTER_IN[1]);
  const x = R(V.X(HB[0] + Math.sin(t * 1.9) * 1.5 + jit)), y = R(V.Y(HB[1] + Math.sin(t * 2 * Math.PI * 2.1) * 2 + Math.sin(t * 1.3) * 1));
  const look = [-0.4 * sm(t, T.LOOK[0], T.LOOK[1]), 0], hb = drawHummingbird(c, x, y, { kind: "bluethroat", turn: -0.6, wing: rnd(Math.floor(t * 30) * 13 + 5), buzz: 0.5 + 0.5 * race, sheen: (t * 0.25) % 1, look, blink: blinkAt(t, 2.9, 0.4) });
  const ha = sm(t, T.HEART_IN[0], T.HEART_IN[1]);
  if (ha > 0) {
    const [hx, hy] = hb.chest, g = fade(c, ha);
    heartIcon(c, hx, hy + 6, 11, p, { a: ha, swell: 0.45, glow: 0.5 * p });
    // buzz ticks either side of the heart, jittering every frame
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const j = R((rnd(Math.floor(t * 30) * 5 + i + (s > 0 ? 9 : 0)) - 0.5) * 3), bx = hx + s * (19 + i * 5) + j, by = hy + 6; for (let q = -3 - i; q <= 3 + i; q++) { const cx = R(bx + s * Math.abs(q) * -0.35 * (1 + i * 0.3)); g.px(cx, R(by + q * 1.6), C.O); g.px(cx + s, R(by + q * 1.6), i === 0 ? "#FFFFFF" : "#FFB0C0"); } }
  }
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V);
}
export function hud(c, V, t) {
  if (off(V)) return;
  const k = (t - T.PICKUP[0]) / T.PICKUP[1]; if (k > 0 && k < 1) pickupC(c, R(V.X(HB[0])) + 6, R(V.Y(HB[1])) - 92, "1,260 BPM", k);
}
void C; void ease; void clamp01;
