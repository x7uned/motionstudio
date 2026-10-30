// LV2 · bee hummingbird — a Cuban forest edge in the bright late morning (RANGE BIOME.cuba = 540..1080). The meadow's
// hills sink behind a hazy tropical forest; two royal palms (Cuba's national tree: smooth pale trunk, green crownshaft)
// frame the clearing with vines hanging from their fronds, bromeliads, ferns, big leaves and a red hibiscus bush.
// The tiny bee hummingbird hovers under the sun disc facing the camera, its long beak at a hibiscus bloom; a honeybee
// hovers beside it for scale; a little balance on a stump shows 16 BEES = 1 HUMMINGBIRD.
// Events: "less than two grams" → 1.6 G; "think it's a bee" → the bee comes closer, "?" and the two look almost alike;
// "scientists … lose heat too fast" → little red heat waves leave its tiny body, LOSES HEAT FAST, a small shiver.
import { BIOME, LAND, EV, END, W } from "../timeline.mjs";
import { blob, ell, tube, bez, RAMP, C, sign, pickup, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { Layer, flower, stem, tuft, leafBall, paintHills, grassAt, GRASS, osc, cyc, thick, pickupC } from "./meadow-kit.mjs";
import { hillFar, hillNear, hibiscus, hibiscusBush } from "./meadow.mjs";
import { drawBee, miniBee } from "./meadow-bee.mjs";
import { drawHummingbird } from "./hummingbird-art.mjs";

export const RANGE = BIOME.cuba;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (810, -180): screen = (wx - 540, wy + 660)
const HB = [810, -300];                         // hummingbird head centre (screen 270, 360)
const SB = [680, -298], SB2 = [702, -306];      // scale bee: resting spot and its "think it's a bee" spot (screen 140 / 162)
const FLOWER = [886, -262];                     // the hibiscus bloom at the beak tip (screen 346, 398)
const SIGN = [980, -12];                        // LV 2 sign (screen 440, 648)
const BAL = [668, LAND];                        // balance stump (screen 128, 640)
const THINK = W("think", 1), BEE2 = W("bee", 2), LOSE = W("lose", 1);   // the "?" starts on "think" (EV.thinkBee = "bee." comes 0.4 s later)

const GRASS_T = ["#AEDC6C", "#98CE5E", "#82C052", "#6CB046", "#5AA23E", "#4A9038", "#3C7E32", "#32702E", "#28602A", "#205224", "#18441E"];
const LEAF = ["#0E2C18", "#16401E", "#1E5426", "#2A6A2E", "#388038", "#4A9842", "#62B050", "#86C866"];
const PALM = ["#1A3A1A", "#24502A", "#2E6630", "#3C7E38", "#4E9640", "#66AC4C", "#86C25C", "#AAD87A"];
const TRUNK = ["#3A3830", "#55524A", "#74706A", "#948E86", "#B2ACA2", "#CAC4BA", "#DEDAD0", "#F0ECE2"];
const SHAFT = ["#1E4A1E", "#2A6228", "#367A30", "#46923A", "#5AAA46", "#76C058", "#98D470", "#C0E898"];
const HAZE = ["#8AB8A0", "#98C4A8", "#A8D0B2", "#B8DABC"];

// ---------------------------------------------------------------- static scenery
let BACK = null, FRONT = null;
function royalPalm(g, x, y, h, lean = 0, seed = 0, frondSide = 0) {
  // trunk: smooth pale grey, a little bulge low down, faint growth rings; then the green crownshaft
  const top = y - h, shaftH = R(h * 0.2), tx = (k) => x + lean * k * k;
  for (let yy = R(top + shaftH); yy <= y; yy++) {
    const k = (y - yy) / h, w = 7 + 3.2 * Math.exp(-(((k - 0.25) / 0.2) ** 2)) - k * 1.5, cx = tx(k);
    for (let xx = R(cx - w); xx <= R(cx + w); xx++) { const u = (xx - cx) / w, v = 0.55 - u * 0.5; let s = Math.max(1, Math.min(7, R(v * 7 + (bayer(xx, yy) - 0.5) * 0.9))); if (Math.abs(u) > 0.86) s = 1; if ((yy % 9) === 0 && Math.abs(u) < 0.8) s = Math.max(1, s - 1); g.px(xx, yy, TRUNK[s]); }
  }
  for (let yy = R(top); yy < R(top + shaftH); yy++) {
    const k = (y - yy) / h, w = 6.2, cx = tx(k);
    for (let xx = R(cx - w); xx <= R(cx + w); xx++) { const u = (xx - cx) / w, v = 0.6 - u * 0.5; let s = Math.max(1, Math.min(7, R(v * 7 + (bayer(xx, yy) - 0.5) * 0.8))); if (Math.abs(u) > 0.84) s = 1; g.px(xx, yy, SHAFT[s]); }
  }
  // crown of arching pinnate fronds
  const cx0 = tx(1), cy0 = top + 2;
  const fr = [[-2.7, 1.0], [-2.25, 1.1], [-1.75, 1.0], [-1.3, 0.85], [-0.95, 0.7], [-0.5, 0.8], [-0.1, 0.95], [0.35, 0.95], [-1.55, 0.6], [-0.7, 0.55]];
  for (const [ang0, len] of fr) {
    const ang = ang0 + frondSide * 0.25 + (rnd(seed + ang0 * 7) - 0.5) * 0.15, L = 92 * len, dir = [Math.cos(ang), Math.sin(ang)];
    const p0 = [cx0, cy0], p1 = [cx0 + dir[0] * L * 0.55, cy0 + dir[1] * L * 0.55 - 26 * len], p2 = [cx0 + dir[0] * L, cy0 + dir[1] * L + 30 * len];
    const sp = bez(p0, p1, p2, 40);
    for (let i = 2; i < sp.length; i++) {
      const u = i / (sp.length - 1), [px, py] = sp[i], [qx, qy] = sp[i - 1], tdx = px - qx, tdy = py - qy, tl = Math.hypot(tdx, tdy) || 1, nx = -tdy / tl, ny = tdx / tl, ll = (4 + 15 * Math.sin(Math.PI * Math.min(1, u * 1.1))) * (0.8 + len * 0.25);
      for (const sd of [-1, 1]) {
        const ex = px + (nx * sd * 0.75 + (tdx / tl) * 0.35) * ll, ey = py + (ny * sd * 0.75 + (tdy / tl) * 0.35) * ll + ll * 0.55;
        const col = PALM[Math.max(1, Math.min(7, R(2 + (sd < 0 === ny < 0 ? 3 : 1) + (1 - u) * 2 + (rnd(seed * 31 + i * 7 + sd) - 0.5) * 1.4)))];
        g.line(R(px), R(py), R(ex), R(ey), col); if (i % 2 === 0) g.line(R(px), R(py) + 1, R(ex), R(ey) + 1, PALM[1]);
      }
    }
    for (let i = 1; i < sp.length; i++) g.line(R(sp[i - 1][0]), R(sp[i - 1][1]), R(sp[i][0]), R(sp[i][1]), "#C8D890");
  }
  return [cx0, cy0];
}
function bromeliad(g, x, y, s = 1, seed = 0, heart = "#F0402E") {
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.36 + (rnd(seed + i) - 0.5) * 0.1, L = (14 + rnd(seed + i * 3) * 6) * s * (1 - Math.abs(i - 4) * 0.08);
    const pts = bez([x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.6], [x + Math.cos(a) * L * 1.05, y + Math.sin(a) * L * 0.7 + L * 0.35], 8);
    for (let k = 1; k < pts.length; k++) { const w = (1 - k / pts.length) * 2.2 * s; for (let j = -R(w); j <= R(w); j++) g.px(R(pts[k][0] + j * 0.3), R(pts[k][1]), j < 0 ? "#6AB84E" : k > 5 ? "#3A7A34" : "#4E9A40"); }
  }
  for (let i = 0; i < 4; i++) { const a = -Math.PI / 2 + (i - 1.5) * 0.3; thick(g, [[x, y], [x + Math.cos(a) * 9 * s, y + Math.sin(a) * 11 * s]], 1, i % 2 ? heart : mix(heart, "#FFC040", 0.4)); }
}
function fern(g, x, y, s, seed, ramp = LEAF) {
  for (let f = 0; f < 6; f++) {
    const a = -Math.PI / 2 + (f - 2.5) * 0.42, L = (26 + rnd(seed + f) * 14) * s, sp = bez([x, y], [x + Math.cos(a) * L * 0.6, y + Math.sin(a) * L * 0.7], [x + Math.cos(a) * L, y + Math.sin(a) * L * 0.4 + L * 0.3], 18);
    for (let i = 1; i < sp.length; i++) { const u = i / sp.length, ll = 6 * s * Math.sin(Math.PI * u) + 1; for (const sd of [-1, 1]) g.line(R(sp[i][0]), R(sp[i][1]), R(sp[i][0] + sd * ll * 0.6), R(sp[i][1] + ll * 0.7), ramp[sd < 0 ? 5 : 3]); g.px(R(sp[i][0]), R(sp[i][1]), ramp[2]); }
  }
}
function bigLeaf(g, x, y, ang, L, w, ramp = LEAF, seed = 0) {
  // banana/heliconia-like leaf: midrib curve + blade with diagonal veins
  const sp = bez([x, y], [x + Math.cos(ang) * L * 0.5, y + Math.sin(ang) * L * 0.5 - L * 0.2], [x + Math.cos(ang) * L, y + Math.sin(ang) * L + L * 0.12], 30);
  for (let i = 1; i < sp.length; i++) {
    const u = i / sp.length, [px, py] = sp[i], [qx, qy] = sp[i - 1], tl = Math.hypot(px - qx, py - qy) || 1, nx = -(py - qy) / tl, ny = (px - qx) / tl, hw = w * Math.sin(Math.PI * Math.min(1, u * 1.05)) ** 0.7;
    for (let j = -hw; j <= hw; j += 0.5) { const X = R(px + nx * j), Y = R(py + ny * j), vein = (R(i * 1.0 + Math.abs(j) * 0.8) % 5) === 0; g.px(X, Y, Math.abs(j) > hw - 1 ? ramp[1] : vein ? ramp[j < 0 ? 4 : 2] : ramp[j < 0 ? 6 : 4]); }
    g.px(R(px), R(py), ramp[7]);
  }
}
function build() {
  BACK = new Layer(RX0 - 110, -660, RX1 + 40, 320); FRONT = new Layer(RX0 - 20, 60, RX1 + 40, 320);   // BACK reaches left for the palm fronds over the meadow
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0, RX1, LAND, hillFar, hillNear);
  // hazy far forest: rows of rounded crowns and a few distant royal palms, rising from the meadow seam
  const fenv = (x) => sm(x, RX0 + 10, RX0 + 160) * (1 - 0.35 * sm(x, RX1 - 160, RX1));
  for (let row = 0; row < 3; row++) for (let i = 0; i < 26; i++) {
    const x = RX0 + 10 + i * 21 + rnd(row * 97 + i) * 14, h = fenv(x) * (70 - row * 22 + rnd(row * 31 + i) * 22); if (h < 6) continue;
    const r = 12 + rnd(i * 7 + row) * 10, cy = LAND - h + r * 0.6;
    leafBall(g, x, cy, r, [mix(HAZE[0], "#3A7A5A", row * 0.28), mix(HAZE[1], "#4A8A62", row * 0.28), mix(HAZE[2], "#5A9A6A", row * 0.28), mix(HAZE[3], "#6AAA72", row * 0.28)], i + row * 50, { amp: 0.1, bumps: 7 });
    g.rect(R(x) - 1, R(cy + r * 0.6), 2, R(LAND - cy - r * 0.6), mix(HAZE[0], "#3A6A4A", row * 0.3));
  }
  for (const [x, hh] of [[700, 130], [742, 112], [905, 124], [1004, 104]]) { const top = LAND - hh; g.rect(x, top, 2, hh, "#9CB8A8"); for (let k = 0; k < 7; k++) { const a = -Math.PI + (k / 6) * Math.PI, L = 14; g.line(x, top, R(x + Math.cos(a) * L), R(top + Math.sin(a) * L * 0.5 + 6), "#8AAE98"); } }
  // ground: tropical grass, red Cuban earth showing on a little path; blends into the meadow at the left seam
  for (let y = LAND; y < 320; y++) for (let x = RX0; x < RX1 + 40; x++) {
    const k = sm(x, RX0, RX0 + 90); let col = k < 1 ? (k > bayer(x, y) * 0.999 ? grassAt(x, y, y - LAND, GRASS_T) : grassAt(x, y, y - LAND, GRASS)) : grassAt(x, y, y - LAND, GRASS_T);
    const px = 760 + Math.sin(y * 0.02) * 40 + (y - LAND) * 0.55, pw = 10 + (y - LAND) * 0.16;
    if (Math.abs(x - px) < pw && y > LAND + 6) { const e = 1 - Math.abs(x - px) / pw; if (e * 1.6 > bayer(x, y) + 0.2) col = mix("#B05A34", "#D27A48", e * 0.6 + (bayer(x, y) - 0.5) * 0.2); }
    if (x > RX1 - 40) col = mix(col, "#C8C060", sm(x, RX1 - 40, RX1 + 30) * 0.35 * (0.8 + 0.2 * bayer(x, y)));
    // toward the wheat field the ground turns into its cross-section (stubble lip, topsoil, clay, stone), dithered
    const xs = sm(x, RX1 - 30, RX1 + 6); if (xs > 0 && xs > bayer(x, y) * 0.98) col = fieldSoil(x, y);
    g.px(x, y, col);
  }
  g.rect(RX0, LAND, RX1 - RX0 + 40, 1, "#C8EA88");
  for (let i = 0; i < 4000; i++) {
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 11), 1.4) * 336), x = R(RX0 + rnd(i * 3 + 12) * (RX1 - RX0 + 36)), d = y - LAND, h = d < 40 ? 1 : d < 140 ? 2 : d < 260 ? 3 : 4;
    if (x > RX1 - 40 && sm(x, RX1 - 30, RX1 + 6) > 0.3) continue;
    const col = rnd(i * 5 + 1) < 0.6 ? mix(g.get(x, y), "#14502A", 0.32) : mix(g.get(x, y), "#F0FFB0", 0.28);
    for (let j = 0; j < h; j++) g.px(x + (j === h - 1 && rnd(i) < 0.5 ? 1 : 0), y - j, col);
  }
  for (let i = 0; i < 160; i++) { const x = R(RX0 + 10 + rnd(i * 7 + 5) * (RX1 - RX0 - 90)), y = R(LAND + 4 + Math.pow(rnd(i * 7 + 6), 1.3) * 300), d = y - LAND, s = d < 40 ? 1 : d < 140 ? 2 : 3; flower(g, x, y, s, rnd(i) < 0.5 ? "#FF6A5A" : rnd(i * 3) < 0.5 ? "#FFE070" : "#FFFFFF", "#F8D040"); }
  // royal palms framing the clearing, bromeliads on their trunks, ferns at their feet
  royalPalm(g, 582, LAND + 2, 440, -8, 3, -0.15); royalPalm(g, 1036, LAND + 2, 420, 6, 7, 0.2);
  bromeliad(g, 578, LAND - 150, 1, 5, "#F04A30"); bromeliad(g, 1040, LAND - 196, 0.9, 9, "#FF7A2A");
  fern(g, 600, LAND + 4, 1.1, 2); fern(g, 1018, LAND + 6, 1.2, 8); fern(g, 552, LAND + 8, 0.9, 13);
  // the balance stump (static part) and the hibiscus bush with its big blooms
  stump(g, BAL[0], BAL[1]);
  hibiscusBush(g, 932, LAND + 4, 1.35, 11);
  for (const [x, y, r, s] of [[904, -96, 7, 1], [960, -70, 8, 2], [920, -40, 6, 3]]) hibiscus(g, x, y, r, s);
  bromeliad(g, 1000, LAND + 2, 1.1, 21, "#E8302A");
  // FRONT: big tropical leaves in the bottom corners, grass blades along the bottom
  for (let i = 0; i < 46; i++) { const x = R(RX0 - 10 + rnd(i * 13 + 2) * (RX1 - RX0 - 30)), y = R(LAND + 250 + rnd(i * 13 + 5) * 90); tuft(f, x, y, 14 + rnd(i) * 16, 4 + Math.floor(rnd(i * 3) * 4), ["#1E5A2A", "#2E7032", "#4A9A40"], i * 5, (rnd(i * 9) - 0.5) * 6); }
  bigLeaf(f, RX0 - 6, 300, -0.75, 120, 26, LEAF, 1); bigLeaf(f, RX0 + 30, 316, -1.05, 100, 22, LEAF, 2);
  bigLeaf(f, RX1 - 40, 306, -2.35, 104, 24, LEAF, 3); bigLeaf(f, RX1 - 70, 318, -2.1, 90, 21, LEAF, 4);
  fern(f, RX0 + 80, 312, 1.6, 31); fern(f, RX1 - 120, 316, 1.5, 37);
}
const SOIL = ["#3E2414", "#4E2E1A", "#5E3A22", "#6E4A2C"], CLAY = ["#7A5030", "#8A5E38", "#9A6E44"], STONE = ["#4E4440", "#5E5450", "#6E6460", "#8A807A"];
const wavy = (x, s, a) => Math.sin(x * 0.021 + s) * a + Math.sin(x * 0.057 + s * 2.3) * a * 0.45;
function fieldSoil(x, y) {                                         // the field level's ground bands (field.mjs soil()), for the seam
  const b1 = 54 + wavy(x, 0.7, 7), b2 = 196 + wavy(x, 2.1, 10);
  if (y < LAND + 3) return (x * 7 + y) % 5 === 0 ? "#7AA040" : y === LAND ? "#C8A848" : "#9A8A38";
  if (y < b1) { const v = (y - LAND) / (b1 - LAND); return SOIL[v < 0.12 ? 3 : v < 0.55 ? 2 : (v - 0.55) * 2 > bayer(x, y) ? 1 : 2]; }
  if (y < b2) { const v = (y - b1) / (b2 - b1); return y < b1 + 3 ? (bayer(x, y) < 0.5 ? SOIL[1] : CLAY[0]) : CLAY[v < 0.5 ? 1 : (v - 0.5) * 2 > bayer(x, y) ? 0 : 1]; }
  const v = (y - b2) / 60; return y < b2 + 3 ? (bayer(x, y) < 0.5 ? CLAY[0] : STONE[1]) : STONE[v < 0.4 ? 2 : 1];
}
function stump(g, x, y) {
  const BARK = ["#2A180C", "#3E2614", "#56361C", "#6E4826", "#885C32", "#A27442", "#BC8E58", "#D4AA74"];
  for (let yy = y - 34; yy <= y; yy++) { const w = 26 + (yy - (y - 34)) * 0.25; for (let xx = R(x - w); xx <= R(x + w); xx++) { const u = (xx - x) / w; let s = R(4 - u * 2 + (bayer(xx, yy) - 0.5)); if (Math.abs(u) > 0.9) s = 1; if ((xx * 3 + 7) % 11 === 0) s -= 1; g.px(xx, yy, BARK[Math.max(1, Math.min(7, s))]); } }
  for (let xx = x - 26; xx <= x + 26; xx++) for (let yy = y - 40; yy <= y - 30; yy++) { const d = ((xx - x) / 26) ** 2 + ((yy - (y - 35)) / 5.5) ** 2; if (d <= 1) g.px(xx, yy, d > 0.8 ? BARK[3] : (R(Math.sqrt(d) * 6) % 2 ? "#D8B07A" : "#E8C48E")); }
  // the balance post (brass) on the stump
  g.rect(x - 2, y - 120, 5, 82, "#5A3A10"); g.rect(x - 1, y - 120, 2, 82, "#C89A3A"); g.rect(x - 1, y - 120, 1, 82, "#F0CC6A");
  g.rect(x - 9, y - 42, 19, 4, "#5A3A10"); g.rect(x - 8, y - 42, 17, 2, "#D8A848");
  g.rect(x - 4, y - 126, 9, 7, "#5A3A10"); g.rect(x - 3, y - 125, 7, 5, "#E0B04A"); g.px(x - 2, y - 124, "#FFF0B0");
}

// ---------------------------------------------------------------- per-frame pieces
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
function vines(c, V, t) {
  // vines hang from the palm crowns, swaying slowly (periodic), with small leaves
  for (const [ax, ay, len, n, ph] of [[600, -400, 190, 37, 0.3], [628, -392, 140, 41, 1.7], [560, -404, 120, 33, 2.4], [1000, -388, 170, 39, 0.9], [1022, -396, 120, 45, 2.0]]) {
    const sw = osc(t, END, n, ph) * 5; let px = V.X(ax), py = V.Y(ay);
    for (let i = 1; i <= len; i += 2) {
      const k = i / len, x = V.X(ax) + sw * k * k + Math.sin(i * 0.09 + ph) * 3, y = V.Y(ay) + i;
      c.line(R(px), R(py), R(x), R(y), "#2E5A22"); if (i % 8 === 1) { const s = (i >> 3) % 2 ? 1 : -1; c.px(R(x) + s, R(y), "#5AA040"); c.px(R(x) + 2 * s, R(y) - 1, "#7CC058"); c.px(R(x) + s, R(y) - 1, "#4A8A36"); }
      px = x; py = y;
    }
  }
}
function balance(c, V, t) {
  const x = R(V.X(BAL[0])), y = R(V.Y(BAL[1])), by = y - 122, sw = osc(t, END, 23) * 0.8, q = c;
  // beam (level), strings and pans; the pans sway a little
  q.rect(x - 70, by - 2, 141, 5, "#5A3A10"); q.rect(x - 69, by - 1, 139, 2, "#E0B04A"); q.rect(x - 69, by - 1, 139, 1, "#FFE08A");
  for (const sd of [-1, 1]) {
    const hx = x + sd * 64, pxc = hx + R(sw), py = by + 34;
    for (const dx of [-16, 0, 16]) q.line(hx, by + 2, pxc + dx, py, "#8A6A3A");
    q.rect(pxc - 22, py, 45, 3, "#5A3A10"); q.rect(pxc - 21, py, 43, 2, "#E8B850"); for (let i = 0; i < 4; i++) q.rect(pxc - 19 + i * 2, py + 3 + i, 39 - i * 4, 1, i < 2 ? "#C8922E" : "#8A5A1A");
    if (sd < 0) { // 16 tiny bees in a heap, wings flickering
      let k = 0; [5, 4, 4, 3].forEach((n, row) => { for (let i = 0; i < n; i++, k++) miniBee(c, pxc + (i - (n - 1) / 2) * 9, py - 3 - row * 5, osc(t, END, 700 + k * 13) > 0, k % 2 ? 1 : -1); });
    } else drawHummingbird(c, pxc, py - 30, { s: 0.27, wings: false, turn: -0.4, blink: blinkAt(t, END / 19, 1.1), sheen: cyc(t, END, 9) });
  }
  // the wooden plaque leaning on the stump
  const s = 2, l1 = "16 BEES =", l2 = "1 HUMMINGBIRD", w = c.measure(MAIN, l2, { scale: s }) + 18, h = 46, x0 = x - R(w / 2), y0 = y - 50;
  q.rrect(x0, y0, w, h, "#2E1A10", 2); q.rrect(x0 + 1, y0 + 1, w - 2, h - 2, "#8A5834", 2); q.rect(x0 + 2, y0 + 2, w - 4, 2, "#A87448"); q.rect(x0 + 2, y0 + 23, w - 4, 1, "#6A4024");
  for (const [txt, ty, col] of [[l1, y0 + 6, "#FFE27A"], [l2, y0 + 27, "#FDF0C8"]]) { const tw = c.measure(MAIN, txt, { scale: s }), tx = x0 + R((w - tw) / 2); q.text(MAIN, txt, tx, ty + 1, "#2E1A10", { scale: s }); q.text(MAIN, txt, tx, ty, col, { scale: s }); }
}

// the two flyers
const thinkK = (t) => win(t, ...T.THINK_MOVE);
export function hbState(t) {
  const shiver = win(t, ...T.SHIVER) * osc(t, END, 1050) * 1.2;
  return { x: HB[0] + osc(t, END, 53, 0.4) * 1.5 + shiver, y: HB[1] + osc(t, END, 160) * 2.2 + osc(t, END, 71, 1) * 1 };
}
function LV2_END() { return EV.mouse; }
// the scale bee pops out of the hibiscus bush as the camera arrives and flies behind the hummingbird to its spot
const IN0 = EV.hummingbird - 0.1, IN1 = EV.hummingbird + 1.0, BUSH_P = [968, -118];
// timing table of every visible change (used by the picture AND by levels/meadow-motions.mjs for the sound)
export const T = {
  IN0, IN1, POP_FADE: 0.25, THINK_MOVE: [THINK - 0.15, EV.scientists - 0.1, 0.45, 0.45], HUH: [THINK, EV.scientists - 0.2, 0.25, 0.35],
  HEAT: [EV.scientists + 0.2, LV2_END() + 0.4, 0.6, 0.5], HEAT_UP: [EV.heat - 0.2, EV.heat + 0.3], SHIVER: [EV.heat - 0.1, LV2_END(), 0.2, 0.3],
  TAG: [LOSE - 0.05, LV2_END() - 0.2, 0.3, 0.4], PICKUP: [EV.lessThanTwo, 1.6],
  HB: { x: HB[0], half: 100 }, SBEE: { half: 66 }, BAL: { x: BAL[0], half: 75 },
};
export function beeState(t) {
  const k = ease(thinkK(t)); let x = lerp(SB[0], SB2[0], k) + osc(t, END, 47, 2) * 2, y = lerp(SB[1], SB2[1], k) + osc(t, END, 89, 0.5) * 2.5;
  const f = ease(clamp01((t - IN0) / (IN1 - IN0)));
  if (f < 1) { const u = 1 - f; x = u * u * BUSH_P[0] + 2 * u * f * 790 + f * f * x; y = u * u * BUSH_P[1] + 2 * u * f * -86 + f * f * y; }   // under the hummingbird's tail
  return { x, y, a: sm(t, IN0, IN0 + T.POP_FADE), dir: f < 1 ? -1 : 0 };
}

export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  BACK.blit(c, V);
}
export function actors(c, V, t) {
  if (off(V)) return; t = ((t % END) + END) % END;
  vines(c, V, t);
  sign(c, R(V.X(SIGN[0])), R(V.Y(SIGN[1])), "LV 2", "wood", 1, t);
  balance(c, V, t);
  // the bloom at the beak, nodding gently on its stem
  const nod = osc(t, END, 31, 0.7) * 1.5, fx = V.X(FLOWER[0]) + nod, fy = V.Y(FLOWER[1]);
  for (let i = 0; i < 90; i++) { const k = i / 90, x = lerp(fx + 6, V.X(944), k * k) + Math.sin(k * 3) * 6, y = lerp(fy + 6, V.Y(-120), k); c.px(R(x), R(y), "#2E6A2A"); c.px(R(x) + 1, R(y), "#4A8A3A"); }
  hibiscus(c, fx, fy, 15, 0.4); hibiscus(c, V.X(930) + nod * 0.5, V.Y(-214), 10, 1.9);
  // heat waves leaving the tiny body (scientists … too fast), stronger on "heat"
  const hs = hbState(t), hx = R(V.X(hs.x)), hy = R(V.Y(hs.y)), heat = win(t, ...T.HEAT) * (0.55 + 0.45 * sm(t, T.HEAT_UP[0], T.HEAT_UP[1]));
  if (heat > 0) {
    // a warm dithered glow hugging the little body, and bold wavy heat strokes drifting outward
    const ga = fade(c, heat * 0.55);
    for (let Y = hy - 50; Y <= hy + 130; Y++) for (let X = hx - 72; X <= hx + 72; X++) { const d = Math.hypot(X - hx, (Y - hy - 40) / 1.3), e = 1 - Math.abs(d - 54) / 9; if (e > 0 && e * 0.55 > bayer(X, Y) + 0.1) ga.px(X, Y, "#FF9A6A"); }
    for (let i = 0; i < 9; i++) {
      const ph = cyc(t, END, 62 + (i % 3) * 8, rnd(i * 5)), a0 = -Math.PI / 2 + (i - 4) * 0.62 + (rnd(i) - 0.5) * 0.12, d0 = 54 + ph * 40, ox = hx + Math.cos(a0) * d0, oy = hy + 40 + Math.sin(a0) * d0 * 1.2;
      const g = fade(c, heat * Math.min(1, Math.sin(Math.PI * ph) * 1.8)), cs = Math.cos(a0), sn = Math.sin(a0), L = 20;
      const pt = (j) => { const w = Math.sin(j * 0.62 + ph * 10) * 2.6; return [ox + cs * j - sn * w, oy + sn * j + cs * w]; };
      for (let j = 0; j < L; j++) { const [px, py] = pt(j); g.rect(R(px) - 1, R(py) - 1, 4, 4, "#6A1420"); }
      for (let j = 0; j < L; j++) { const [px, py] = pt(j), col = j < 4 ? "#FFD08A" : j < 9 ? "#FF8A4A" : j < 15 ? "#FF5A3E" : "#E83A3A"; g.rect(R(px), R(py), 2, 2, col); }
    }
  }
  // the scale bee (behind the hummingbird when they come close)
  const bs = beeState(t), tk = thinkK(t);
  drawBee(c, R(V.X(bs.x)), R(V.Y(bs.y)), { s: 0.68, a: bs.a, tilt: bs.dir * 0.12 * Math.sin(Math.PI * clamp01((t - IN0) / (IN1 - IN0))), flap: cyc(t, END, 562, 0.3), look: [0.75 * tk - 0.6 * (bs.dir < 0 ? 1 : 0), 0.1 * tk], blink: blinkAt(t, END / 21, 0.4), open: 0.35, antSway: 3 * osc(t, END, 190, 1) });
  // the hummingbird
  const look = [-0.75 * tk, 0.1 * tk], hbo = drawHummingbird(c, hx, hy, { kind: "bee", turn: 0.6, wing: cyc(t, END, 1597), buzz: 0.25, sheen: cyc(t, END, 19), look, blink: blinkAt(t, END / 22, 1.3) });
  void hbo;
}
export function front(c, V, t) {
  if (off(V)) return; if (!FRONT) build();
  FRONT.blit(c, V);
}
export function hud(c, V, t) {
  if (off(V)) return; t = ((t % END) + END) % END;
  const ox = R(V.X(HB[0])) - 270, hs = hbState(t);
  // 1.6 G on "two (grams)"
  const k = (t - T.PICKUP[0]) / T.PICKUP[1]; if (k > 0 && k < 1) pickupC(c, R(V.X(hs.x)) - 6, R(V.Y(hs.y)) - 74, "1.6 G", k);
  // "?" between the two flyers on "think it's a bee"
  const qa = win(t, ...T.HUH);
  if (qa > 0) { const bs = beeState(t), qx = R((V.X(bs.x) + V.X(hs.x)) / 2) - 1, qy = R(V.Y(hs.y)) - 128 + R(osc(t, END, 70) * 2) + R((1 - qa) * 8), g = fade(c, qa);
    const bw = 34, bh = 38; g.rrect(qx - 17, qy - 8, bw, bh, C.O, 3); g.rrect(qx - 16, qy - 7, bw - 2, bh - 2, C.IV, 3); g.poly([[qx - 5, qy + bh - 9], [qx + 5, qy + bh - 9], [qx - 2, qy + bh + 1]], C.O); g.poly([[qx - 3, qy + bh - 10], [qx + 3, qy + bh - 10], [qx - 1, qy + bh - 2]], C.IV);
    g.text(MAIN, "?", qx - 7, qy + 1, "#3A2C5C", { scale: 3 }); g.text(MAIN, "?", qx - 6, qy + 1, "#3A2C5C", { scale: 3 }); }
  // LOSES HEAT FAST
  const ta = win(t, ...T.TAG);
  if (ta > 0) { const s = 2, txt = "LOSES HEAT FAST", w = c.measure(MAIN, txt, { scale: s }) + 24, x0 = 270 + ox - R(w / 2), y0 = 206; panel(c, x0, y0, w, 30, ta, "#FF6A4A"); const g = fade(c, ta), w1 = c.measure(MAIN, "LOSES ", { scale: s }), w2 = c.measure(MAIN, "HEAT", { scale: s });
    g.text(MAIN, "LOSES", x0 + 12, y0 + 8, C.IV, { scale: s }); g.text(MAIN, "HEAT", x0 + 13 + w1, y0 + 9, C.O, { scale: s }); g.text(MAIN, "HEAT", x0 + 12 + w1, y0 + 8, "#FF7A5A", { scale: s }); g.text(MAIN, "FAST", x0 + 12 + w1 + w2 + c.measure(MAIN, " ", { scale: s }), y0 + 8, C.IV, { scale: s }); }
}
