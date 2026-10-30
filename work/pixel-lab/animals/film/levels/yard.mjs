// LV5 · dog — a cosy house yard on a bright clear day: a small cottage with a red roof and a window at the left, a
// white picket fence, a striped lawn, a doghouse at the right and a pile of colourful toys. A border collie sits facing
// the camera under the sun disc. Events: "words" → +WORDS; "named Chaser" → a golden CHASER plate on its collar;
// "names … toys" → word bubbles pop above the pile, the dog dips its head to the pile and brings back the rubber duck
// in its mouth, and a counter runs up to 1,022 TOYS.
import { BIOME, LAND, EV } from "../timeline.mjs";
import { blob, ell, tube, bez, eye, smooth, blush, smile, nose, shadow, RAMP, C, sign, pickup, tag, panel, fade, mix, bayer, sm, ease, win, lerp, rnd, blinkAt, clamp01, MAIN } from "../cute.mjs";
import { Layer, flower, stem, tuft, clover, leafBall, xform, paintHills, hillNear, grassAt } from "./meadow-kit.mjs";

export const RANGE = BIOME.yard;
const R = Math.round, [RX0, RX1] = RANGE;
// rest camera (1890, -180): screen = (wx − 1620, wy + 660)
const DX = 1890, DY = -268;                        // dog head centre (screen 270, 392): the sun peeks above it
const DUCK = [1810, -124];                         // the rubber duck on the summit of the toy heap (screen 190, 536)
const PLATE = [2060, -40];                         // LV 5 plate on the fence (screen 440, 620)

const WOOD = ["#2A160C", "#4A2A16", "#6A4024", "#8A5834", "#A87448", "#C49464", "#DDB488", "#F0D2A8"];
const ROOF = ["#3A0C10", "#6A161A", "#9A2424", "#C23A32", "#DC5244", "#EE7458", "#F89A7A", "#FCC6AA"];
const SIDING = ["#5A4A2A", "#8A7240", "#B89A58", "#D8BC72", "#ECD48C", "#F6E4A8", "#FBF0C8", "#FFFAE4"];
const FENCE = ["#4A4A60", "#7A7A92", "#A8A8BC", "#C8C8D8", "#DEDEEA", "#EEEEF4", "#F8F8FC", "#FFFFFF"];
const HEDGE = ["#163C22", "#205030", "#2C643A", "#3A7A44", "#4C904E", "#62A85C", "#80BE6E", "#A2D488"];
const DOGH = ["#1E2A4A", "#2A3E6A", "#3A5490", "#4E6CB0", "#6A8CCC", "#8EAEE0", "#B4CCF0", "#DCE8FA"];

// ---------------------------------------------------------------- static layers
let BACK = null, FRONT = null, PILE = null;
function build() {
  BACK = new Layer(RX0 - 40, -660, RX1 + 40, 840); FRONT = new Layer(RX0 - 40, -120, RX1 + 40, 840);
  const g = BACK.g, f = FRONT.g;
  paintHills(g, RX0, RX1, LAND);
  for (let i = 0; i < 8; i++) {                                         // little trees on the far hills
    const x = R(RX0 + 200 + rnd(i * 17 + 9) * (RX1 - RX0 - 280)), hn = hillNear(x); if (hn < 14 || Math.abs(x - DX) < 80) continue;
    const y = R(LAND - hn + 3 + rnd(i) * 6), r = 3 + rnd(i * 7) * 3; g.rect(x, y, 1, R(r + 2), "#4A6A3A"); leafBall(g, x, y - r * 0.6, r, ["#3E7A48", "#4E8C52", "#5E9E5C", "#74B068", "#8CC27A"], i + 40, { amp: 0.08, bumps: 5 });
  }
  // lawn: shared ground ramp + mowing stripes fanning out toward the viewer (faded at both seams)
  for (let y = LAND; y < 840; y++) for (let x = RX0; x < RX1; x++) {
    const d = y - LAND, w = sm(x, RX0, RX0 + 70) * (1 - sm(x, RX1 - 90, RX1)), u = (x - DX) / (d + 90), stripe = ((Math.floor(u * 3.2) % 2) + 2) % 2;
    g.px(x, y, grassAt(x, y, d, stripe ? -0.55 * w : 0.25 * w));
  }
  g.rect(RX0, LAND, RX1 - RX0, 1, "#C6E88A");
  for (let i = 0; i < 2600; i++) {                                      // short mown grass texture
    const y = R(LAND + 2 + Math.pow(rnd(i * 3 + 101), 1.4) * 850), x = R(RX0 + rnd(i * 3 + 102) * (RX1 - RX0)), d = y - LAND, h = d < 60 ? 1 : d < 200 ? 2 : 3;
    const col = rnd(i * 5 + 1) < 0.55 ? mix(g.get(x, y), "#1E5A2A", 0.25) : mix(g.get(x, y), "#E8FFB0", 0.25); for (let j = 0; j < h; j++) g.px(x, y - j, col);
  }
  for (let i = 0; i < 90; i++) {                                        // daisies and clover dots on the lawn
    const y = R(LAND + 6 + Math.pow(rnd(i * 7 + 201), 1.2) * 320), x = R(RX0 + 10 + rnd(i * 7 + 202) * (RX1 - RX0 - 20)), d = y - LAND, s = d < 40 ? 1 : d < 140 ? 2 : 3;
    if (rnd(i * 3) < 0.3) clover(g, x, y, "#3E8A3E", "#7CC85E"); else { if (s >= 2) stem(g, x, y + s, y + s + 2 + s, "#3A7A36", 0, false); flower(g, x, y, s, "#FFFFFF", "#F8C840"); }
  }
  // stepping stones from the cottage door toward the viewer
  for (const [x, y, rx] of [[1664, -10, 9], [1656, 14, 11], [1645, 46, 14], [1634, 90, 17], [1622, 148, 21]]) stone(g, x, y, rx);
  cottage(g); hedge(g); fence(g); doghouse(g);
  PILE = new Layer(1700, -140, 1890, 10); toyPile(PILE.g);
  // FRONT: foreground tufts and daisies along the bottom; a few blades at the fence foot
  for (let i = 0; i < 46; i++) { const x = R(RX0 + rnd(i * 13 + 302) * (RX1 - RX0)), y = R(LAND + 260 + rnd(i * 13 + 305) * 320); tuft(f, x, y, 10 + rnd(i) * 10, 3 + Math.floor(rnd(i * 3) * 3), ["#2E6A30", "#3E8238", "#58A044"], i * 5 + 300, (rnd(i * 9) - 0.5) * 4); }
  for (let i = 0; i < 12; i++) { const x = R(RX0 + 20 + rnd(i * 19 + 401) * (RX1 - RX0 - 40)), y = R(LAND + 250 + rnd(i * 19 + 403) * 300), h = 10 + rnd(i * 5) * 12; stem(f, x, y - h, y, "#2E6A30", 0, true); flower(f, x, y - h, 5, "#FFFFFF", "#F8C840"); }
}

function stone(g, x, y, rx) {
  const ry = Math.max(3, rx * 0.38);
  for (let Y = R(y - ry - 1); Y <= R(y + ry + 1); Y++) for (let X = R(x - rx - 1); X <= R(x + rx + 1); X++) {
    const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; if (d > 1.08) continue;
    g.px(X, Y, d > 0.8 ? (Y > y ? "#3A4A3A" : "#6A7468") : Y < y - ry * 0.3 ? "#C4C8BC" : "#A4AAA0");
  }
}

function cottage(g) {
  const x0 = 1636, x1 = 1774, top = -150, O = "#3A1A14";
  // chimney behind the roof
  g.rect(1663, -238, 18, 52, O); g.rect(1664, -237, 16, 50, "#A2483A"); for (let y = -236; y < -188; y += 6) { g.rect(1664, y, 16, 1, "#7A3028"); g.rect(1664 + ((y / 6) & 1) * 8, y, 1, 6, "#7A3028"); } g.rect(1661, -242, 22, 5, O); g.rect(1662, -241, 20, 3, "#C4C0BC");
  // wall: horizontal siding, white corner trims, soft shade under the eaves and on the right
  g.rect(x0 - 1, top - 1, x1 - x0 + 2, LAND - top + 1, O);
  for (let y = top; y < LAND; y++) for (let x = x0; x < x1; x++) {
    const plank = (y - top) % 9, u = (x - x0) / (x1 - x0); let s = plank === 8 ? 3 : plank === 0 ? 6 : 5;
    if (y - top < 10) s -= 1; if (u > 0.86) s -= 1; if (u > 0.95) s -= 1; g.px(x, y, SIDING[Math.max(1, s)]);
  }
  for (const tx of [x0, x1 - 5]) { g.rect(tx, top, 5, LAND - top, FENCE[6]); g.rect(tx + 4, top, 1, LAND - top, FENCE[3]); }
  // door (left) with a round window and a brass knob
  const dx0 = 1648, dx1 = 1678, dy0 = -98;
  g.rect(dx0 - 3, dy0 - 3, dx1 - dx0 + 6, LAND - dy0 + 3, FENCE[6]); g.rect(dx0 - 1, dy0 - 1, dx1 - dx0 + 2, LAND - dy0 + 1, O);
  for (let y = dy0; y < LAND; y++) for (let x = dx0; x < dx1; x++) g.px(x, y, x - dx0 < 3 ? "#5A9AB4" : x > dx1 - 4 ? "#2E6A84" : "#3E82A0");
  for (const [yy, hh] of [[-88, 26], [-56, 30]]) { g.rect(dx0 + 5, yy, dx1 - dx0 - 10, hh, "#2E6A84"); g.rect(dx0 + 6, yy + 1, dx1 - dx0 - 12, hh - 2, "#4A90AE"); }
  for (let Y = -6; Y <= 6; Y++) for (let X = -6; X <= 6; X++) { const d = Math.hypot(X, Y); if (d <= 6) g.px(1663 + X, -78 + Y, d > 4.8 ? FENCE[6] : Y < -1 ? "#D8F0FA" : "#9ACEE6"); }
  g.rect(dx1 - 7, -60, 3, 3, "#F4CA50"); g.px(dx1 - 7, -60, "#FFF0A0");
  g.rect(dx0 - 6, LAND - 3, dx1 - dx0 + 12, 3, "#9A9A9A"); g.rect(dx0 - 6, LAND - 3, dx1 - dx0 + 12, 1, "#C8C8C8");
  // window with four panes, reflections and a flower box
  const wx0 = 1700, wx1 = 1758, wy0 = -122, wy1 = -76;
  g.rect(wx0 - 4, wy0 - 4, wx1 - wx0 + 8, wy1 - wy0 + 8, O); g.rect(wx0 - 3, wy0 - 3, wx1 - wx0 + 6, wy1 - wy0 + 6, FENCE[6]);
  for (let y = wy0; y < wy1; y++) for (let x = wx0; x < wx1; x++) { const k = (y - wy0) / (wy1 - wy0); let col = k < 0.5 ? "#BCE6F8" : "#8CCBEA"; if (((x - wx0) - (y - wy0) * 0.8 + 100) % 26 < 5) col = "#EAFAFF"; g.px(x, y, col); }
  g.rect(R((wx0 + wx1) / 2) - 1, wy0, 3, wy1 - wy0, FENCE[6]); g.rect(wx0, R((wy0 + wy1) / 2) - 1, wx1 - wx0, 3, FENCE[6]);
  // curtains peeking
  for (let y = wy0; y < wy0 + 30; y++) { const w = R(6 - (y - wy0) * 0.15); g.rect(wx0, y, Math.max(1, w), 1, "#F49AB0"); g.rect(wx1 - Math.max(1, w), y, Math.max(1, w), 1, "#F49AB0"); }
  g.rect(wx0 - 6, wy1 + 4, wx1 - wx0 + 12, 9, O); g.rect(wx0 - 5, wy1 + 5, wx1 - wx0 + 10, 7, WOOD[4]); g.rect(wx0 - 5, wy1 + 5, wx1 - wx0 + 10, 1, WOOD[6]);
  for (let i = 0; i < 9; i++) { const fx = wx0 - 2 + i * 7.5, fy = wy1 + 2 - (i % 2) * 3; leafBall(g, fx, fy + 2, 3.2, ["#1E5A2A", "#2E7A36", "#4A9A44", "#6AB85A"], i + 7, { amp: 0.1, bumps: 4 }); flower(g, fx + (i % 2), fy - 1, 2, i % 3 === 0 ? "#F4F4F4" : "#E8344A", "#FFD040"); }
  // red gable roof with scalloped shingle rows, white fascia
  const ex0 = x0 - 12, ex1 = x1 + 12, ey = top + 4, ax = (x0 + x1) / 2, ay = -240;
  g.poly([[ex0 - 2, ey + 3], [ax, ay - 3], [ex1 + 2, ey + 3]], O);
  g.poly([[ex0, ey], [ax, ay], [ex1, ey]], ROOF[3], (X, Y) => {
    const row = Math.floor((Y - ay) / 8), off = (row & 1) * 5, cell = ((X - ax + 200 + off) % 10 + 10) % 10, yy = (Y - ay) % 8;
    const half = ((Y - ay) / (ey - ay)) * (ex1 - ex0) / 2, u = (X - ax) / Math.max(1, half);
    let s = 4 - (yy >= 6 ? 1 : 0) - ((yy >= 4 && (cell < 1 || cell > 8)) ? 1 : 0) + (yy < 2 ? 1 : 0) - (u > 0.55 ? 1 : 0);
    return ROOF[Math.max(1, Math.min(6, s))];
  });
  for (let i = 0; i <= 4; i++) { const k = i / 4; } // (fascia below)
  g.line(ex0, ey, R(ax), ay, FENCE[6]); g.line(ex0, ey + 1, R(ax), ay + 1, FENCE[6]); g.line(R(ax), ay, ex1, ey, FENCE[4]); g.line(R(ax), ay + 1, ex1, ey + 1, FENCE[4]);
  // attic round window
  for (let Y = -9; Y <= 9; Y++) for (let X = -9; X <= 9; X++) { const d = Math.hypot(X, Y); if (d <= 9) g.px(R(ax) + X, -188 + Y, d > 8 ? O : d > 6.4 ? FENCE[6] : (X + Y < -3 ? "#D8F0FA" : "#8CC8E6")); }
  g.rect(R(ax) - 6, -188, 13, 1, FENCE[6]); g.rect(R(ax), -194, 1, 13, FENCE[6]);
  // a soft shadow line where the wall meets the lawn
  for (let x = x0; x < x1 + 4; x++) { g.px(x, LAND, "#3A7A36"); g.px(x, LAND + 1, mix(g.get(x, LAND + 1), "#1E4A2A", 0.4)); }
}

function hedge(g) {
  for (const [x, y, r, s] of [[1604, -36, 17, 1], [1624, -48, 22, 2], [1642, -34, 17, 3], [1614, -26, 14, 4]]) leafBall(g, x, y, r, HEDGE, s + 60, { amp: 0.1, bumps: 8 });
  for (let i = 0; i < 18; i++) { const a = rnd(i * 3 + 70) * 6.283, rr = Math.sqrt(rnd(i * 5 + 71)) * 26, px = R(1622 + Math.cos(a) * rr), py = R(-40 + Math.sin(a) * rr * 0.7); if (g.has(px, py)) g.px(px, py, i % 3 ? "#FFFFFF" : "#F8D0DC"); }
  g.rect(1584, LAND, 74, 1, "#2A5A2E");
}

function fence(g) {
  const O = FENCE[0], y0 = LAND - 48;
  // two rails behind the pickets
  for (const ry of [y0 + 12, y0 + 34]) { g.rect(1776, ry - 1, RX1 - 1776 + 4, 6, O); g.rect(1776, ry, RX1 - 1776 + 4, 4, FENCE[4]); g.rect(1776, ry, RX1 - 1776 + 4, 1, FENCE[6]); }
  for (let x = 1778; x < RX1 - 2; x += 11) {
    const post = ((x - 1778) / 11) % 6 === 0, top = post ? y0 - 6 : y0, w = post ? 9 : 7;
    g.poly([[x - 1, LAND], [x - 1, top + 3], [x + w / 2, top - 3], [x + w + 1, top + 3], [x + w + 1, LAND]], O);
    for (let y = top - 1; y < LAND; y++) for (let X = x; X < x + w; X++) {
      const peak = top + 3 - (1 - Math.abs((X + 0.5 - (x + w / 2)) / (w / 2))) * 5; if (y < peak) continue;
      const u = (X - x) / w; g.px(X, y, FENCE[u < 0.3 ? 7 : u > 0.75 ? 4 : 6]);
    }
    if (post) { g.rect(x - 1, top - 4, w + 2, 2, O); }
    g.rect(x, LAND - 4, w, 4, FENCE[3]);
  }
  for (let x = 1776; x < RX1; x++) for (let y = LAND + 1; y < LAND + 6; y++) g.px(x, y, mix(g.get(x, y), "#1E4A2A", 0.35 * (1 - (y - LAND) / 6)));
}

function doghouse(g) {
  const x0 = 2082, x1 = 2154, top = LAND - 56, O = "#1A1430", ax = (x0 + x1) / 2, ay = top - 40;
  g.rect(x0 - 1, top - 1, x1 - x0 + 2, LAND - top + 1, O);
  for (let y = top; y < LAND; y++) for (let x = x0; x < x1; x++) { const pl = (x - x0) % 10, u = (x - x0) / (x1 - x0); let s = pl === 9 ? 3 : pl === 0 ? 6 : 5; if (u > 0.82) s -= 1; if (y - top < 6) s -= 1; g.px(x, y, DOGH[s]); }
  // arched door
  for (let y = top + 16; y < LAND; y++) for (let x = ax - 17; x <= ax + 17; x++) { const dy = y - (top + 33), r = 17; if (dy < 0 && (x - ax) ** 2 + dy * dy > r * r) continue; const edge = dy < 0 ? (x - ax) ** 2 + dy * dy > (r - 2) ** 2 : Math.abs(x - ax) > r - 2; g.px(x, y, edge ? O : y > LAND - 6 ? "#2A2030" : "#120C1A"); }
  // bone emblem over the door
  const by = top + 9; g.rect(ax - 7, by - 1, 14, 3, "#FFFFFF"); for (const s of [-1, 1]) { g.rect(ax + s * 8 - 1, by - 3, 3, 3, "#FFFFFF"); g.rect(ax + s * 8 - 1, by + 1, 3, 3, "#FFFFFF"); } g.rect(ax - 7, by + 2, 14, 1, "#C8C8D8");
  // red roof (same shingles as the cottage)
  g.poly([[x0 - 9, top + 3], [ax, ay - 3], [x1 + 9, top + 3]], "#3A0C10");
  g.poly([[x0 - 7, top], [ax, ay], [x1 + 7, top]], ROOF[3], (X, Y) => { const row = Math.floor((Y - ay) / 7), off = (row & 1) * 4, cell = ((X - ax + 200 + off) % 8 + 8) % 8, yy = (Y - ay) % 7; let s = 4 - (yy >= 5 ? 1 : 0) - ((yy >= 3 && (cell < 1 || cell > 6)) ? 1 : 0) + (yy < 2 ? 1 : 0) - (X > ax + 10 ? 1 : 0); return ROOF[Math.max(1, Math.min(6, s))]; });
  g.line(x0 - 7, top, R(ax), ay, FENCE[6]); g.line(R(ax), ay, x1 + 7, top, FENCE[4]);
  // food bowl
  for (let X = -10; X <= 10; X++) for (let Y = -4; Y <= 3; Y++) { const d = (X / 10) ** 2 + (Y / 4) ** 2; if (d <= 1 && Y >= -1) g.px(2010 + X, LAND - 2 + Y, d > 0.75 ? "#6A161A" : Y < 1 ? "#E8443C" : "#B0302C"); }
  g.rect(2002, LAND - 4, 17, 2, "#7A4A22"); g.rect(2004, LAND - 5, 12, 1, "#9A6A3A");
}

// ---------------------------------------------------------------- toys
function ball(g, x, y, r, ramp, stripe = null) {
  for (let Y = R(y - r - 1); Y <= R(y + r + 1); Y++) for (let X = R(x - r - 1); X <= R(x + r + 1); X++) {
    const dx = X - x, dy = Y - y, d = Math.hypot(dx, dy); if (d > r + 0.5) continue;
    if (d > r - 0.7) { g.px(X, Y, ramp[0]); continue; }
    const l = (-dx * 0.6 - dy * 0.8) / r, v = 3.6 + l * 2.2 - (d / r) * 0.8, s = Math.max(1, Math.min(ramp.length - 1, Math.floor(v + (bayer(X, Y) - 0.5) * 0.6)));
    let col = ramp[s]; if (stripe && Math.abs(dy + dx * 0.35) < r * 0.18) col = stripe[Math.min(stripe.length - 1, s)]; g.px(X, Y, col);
  }
  g.px(R(x - r * 0.4), R(y - r * 0.45), "#FFFFFF"); if (r > 8) { g.px(R(x - r * 0.4) + 1, R(y - r * 0.45), "#FFFFFF"); g.px(R(x - r * 0.4), R(y - r * 0.45) + 1, "#FFFFFF"); }
}
const BLUE = ["#14204A", "#1E3478", "#2A4CAA", "#3A66D0", "#5A86E8", "#86AAF4", "#B4CCFA", "#E0EAFF"];
const RED = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
const TENNIS = ["#2A3A08", "#4A6A10", "#7A9E18", "#A6C826", "#C8E440", "#E0F270", "#F0FAA8", "#FAFFDC"];
const DUCKY = ["#3A2604", "#7A5208", "#C08A0C", "#E8B414", "#F8D028", "#FCE460", "#FEF29C", "#FFFCD8"];
function toyPile(g) {
  // a heap of toys left of the dog, drawn back (top) to front (bottom); the duck on the summit is drawn live
  const PINK = ["#3A0E1E", "#6A1A34", "#9C2A4C", "#C84468", "#E26A88", "#F094AA", "#F8BCCB", "#FFE2EA"], ORANGE = ["#3A1604", "#7A3208", "#B8520E", "#E0741A", "#F49A32", "#FABA5E", "#FDD898", "#FFF0D4"];
  const GREEN = ["#0E2A14", "#1A4A22", "#2A6E32", "#3A9444", "#56B45A", "#7ED07A", "#AEE6A6", "#DEF8D8"], PURP = ["#1E1036", "#36205E", "#52348A", "#6E4FB0", "#8D6AD0", "#AE90E6", "#CEB8F4", "#ECE2FC"];
  // top layer
  ball(g, 1832, -106, 10, ORANGE);
  for (let Y = -10; Y <= 10; Y++) for (let X = -12; X <= 12; X++) { const d = (X / 12) ** 2 + (Y / 10) ** 2, h = (X / 5) ** 2 + (Y / 4) ** 2; if (d <= 1 && h > 1) g.px(1786 + X, -104 + Y, d > 0.8 || h < 1.5 ? "#1A4A22" : Y < -2 ? "#7ED07A" : "#3A9444"); }
  // upper middle: star plush, squeaky carrot, lamb, tennis ball
  const star = []; for (let i = 0; i < 10; i++) { const an = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 6 : 14; star.push([1806 + Math.cos(an) * r, -84 + Math.sin(an) * r]); }
  blob(g, [star], { ramp: PURP, thick: 5, base: 3.6, outline: "#1E1036" }); g.px(1803, -86, "#140C20"); g.px(1809, -86, "#140C20"); g.px(1806, -82, "#F094AA");
  blob(g, [[[1758, -96], [1786, -72], [1780, -66], [1752, -88]]], { ramp: ORANGE, thick: 4, base: 3.8, outline: "#3A1604" });
  for (const [dx, dy] of [[-4, -4], [0, -6], [-6, 0]]) g.line(1755, -92, 1755 + dx, -92 + dy - 2, "#3A9444");
  const lx = 1846, ly = -78;
  for (let i = 0; i < 9; i++) { const an = (i / 9) * 6.283; ball(g, lx + Math.cos(an) * 10, ly + Math.sin(an) * 7, 7, WOOL); }
  ball(g, lx, ly, 10, WOOL); ball(g, lx + 13, ly - 8, 7, ["#140E14", "#2A2028", "#3A2E36", "#4A3E46", "#5E5058", "#74666E", "#8E8088", "#A89AA2"]);
  g.px(lx + 11, ly - 9, "#FFFFFF"); g.px(lx + 15, ly - 9, "#FFFFFF"); g.px(lx + 13, ly - 5, "#F4A0B0"); g.rect(lx + 6, ly - 13, 4, 3, "#3A2E36"); g.rect(lx + 18, ly - 13, 3, 3, "#3A2E36");
  ball(g, 1772, -70, 8, TENNIS);
  // middle: frisbee on edge, rope toy, pink ball, yellow ball
  for (let Y = -8; Y <= 8; Y++) for (let X = -20; X <= 20; X++) { const d = (X / 20) ** 2 + (Y / 8) ** 2; if (d <= 1) g.px(1744 + X, -56 + Y + R(X * 0.3), d > 0.82 ? "#7A2A06" : d < 0.3 ? "#FFB060" : Y < 0 ? "#FF9A3A" : "#E07A1C"); }
  g.ering(1744, -56, 12, 4, "#C86A14");
  for (let i = 0; i <= 40; i++) { const k = i / 40, x = 1784 + k * 46, y = -44 - k * 20 + Math.sin(k * 6) * 3, w = 4; for (let j = -w; j <= w; j++) { const col = Math.abs(j) === w ? "#3A1A14" : ((i + j * 2) >> 2) % 2 ? "#F4F0E8" : "#E0443A"; g.px(R(x + j * 0.4), R(y + j * 0.9), col); } }
  for (const [x, y] of [[1784, -44], [1830, -64]]) ball(g, x, y, 6, ["#3A1A14", "#8A1E1A", "#C8342C", "#E0544A", "#F08070", "#F8B0A0", "#FFE0D8", "#FFFFFF"]);
  ball(g, 1862, -48, 11, PINK); ball(g, 1808, -56, 9, DUCKY);
  // bottom: blue ball, bone, striped red ball, green ball
  ball(g, 1748, -34, 15, BLUE);
  const bx = 1806, by = -24; g.rect(bx - 15, by - 3, 30, 7, "#5A5060"); g.rect(bx - 14, by - 2, 28, 5, "#F6F0E4"); g.rect(bx - 14, by - 2, 28, 1, "#FFFFFF");
  for (const s of [-1, 1]) for (const dy of [-3, 3]) ball(g, bx + s * 16, by + dy, 4.5, ["#5A5060", "#A89C8C", "#D8CCB8", "#EAE0D0", "#F6F0E4", "#FFFFFF", "#FFFFFF", "#FFFFFF"]);
  ball(g, 1842, -30, 12, RED, ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF", "#FFFFFF"]);
  ball(g, 1724, -26, 8, GREEN);
  for (let x = 1712; x < 1874; x++) g.px(x, LAND + 1, mix(g.get(x, LAND + 1), "#1E4A2A", 0.45));
}
const WOOL = ["#3A3A4A", "#7A7A8E", "#B4B4C6", "#DADAE6", "#ECECF4", "#F8F8FC", "#FFFFFF", "#FFFFFF"];
/** Rubber duck (about 26 × 22), facing left; dir flips it. */
function duck(c, x, y, a = 1, dir = -1) {
  if (a <= 0) return; const g = fade(c, a);
  const P = (dx, dy) => [x + dx * -dir, y + dy];
  blob(g, [ell(...P(2, 3), 13, 9), ell(...P(-6, -8), 8.5, 8)], { ramp: DUCKY, thick: 6, base: 3.8, a, litOutline: "#7A5208" });
  blob(g, [ell(...P(4, 1), 6, 4, 0.3 * -dir)], { ramp: DUCKY, thick: 3, base: 3.2, a, outline: "#C08A0C" });                       // wing
  const [bx, by] = P(-14, -6); g.poly([[bx, by - 2], [bx - 7 * -dir, by], [bx, by + 3]], "#F07A1C"); g.px(R(bx - 2 * -dir), R(by), "#C85A10");
  const [ex, ey] = P(-8, -10); g.rect(R(ex) - 1, R(ey) - 1, 3, 3, "#140C10"); g.px(R(ex) - 1, R(ey) - 1, "#FFFFFF");
  const [tx, ty] = P(14, -2); g.poly([[tx, ty], [tx + 5 * -dir, ty - 5], [tx + 1 * -dir, ty + 4]], DUCKY[4]);
}

// ---------------------------------------------------------------- the border collie
const DOG_EYE = ["#1A0C04", "#3A1E0A", "#6A3A14", "#9A5A20", "#C8842E", "#E8A84A", "#F8CC7A"];
const BLK = ["#07060C", "#0E0C18", "#181528", "#24203C", "#302B50", "#3E3866", "#4E4880", "#6A64A0"];
const WHT = RAMP.white, LIT = "#5A5490", EDGE = "#3A3A50";
const EAR_IN = ["#2A1420", "#4A2434", "#6A3448", "#8A4A60", "#A8667A", "#C48496", "#DCA4B4", "#F0C8D4"];
const mir = (pts, s, ox, oy) => pts.map(([px, py]) => [ox + px * s, oy + py]);
/** Border collie sitting, facing the camera. (x, y) = head centre at rest (ground = y + 248). o.lean 0..1 (head down to the toy pile). */
function drawDog(c, x, y, t, o = {}) {
  const L = o.lean ?? 0, wag = o.wag ?? 1, br = Math.sin(t * 2 * Math.PI * 0.55), B = y + 248, K = 1.18;
  shadow(c, x, B, 112, 9, "#0E2A12", 0.5);
  // tail (behind), wagging: curls up on the right with a white tip
  const ta = Math.sin(t * 2 * Math.PI * 2.2) * 0.3 * wag, tb = [x + 80, B - 16], tm = [x + 122 + Math.cos(ta) * 3, B - 34 + Math.sin(ta) * 6], tt = [x + 114 + Math.sin(ta) * 22, B - 88 + Math.cos(ta) * 4];
  const tail = bez(tb, tm, tt, 14);
  blob(c, [tube(tail, 14, 11)], { ramp: BLK, thick: 7, litOutline: LIT }); blob(c, [tube(tail.slice(9), 12, 11)], { ramp: WHT, thick: 5, base: 4.2, outline: EDGE });
  // body: plump pear with round haunches (black), white bib with a fluffy hem, short chubby legs, big round paws
  blob(c, [ell(x - 70, B - 44, 46, 46), ell(x + 70, B - 44, 46, 46)], { ramp: BLK, thick: 20, base: 2.6, gain: 2.2, litOutline: LIT });
  const bodyPts = mir([[-30, -206], [-58, -164], [-82, -104], [-96, -48], [-88, -4], [0, 2]], 1, x, B).concat(mir([[88, -4], [96, -48], [82, -104], [58, -164], [30, -206]], 1, x, B));
  blob(c, [smooth(bodyPts, new Set(), 4)], { ramp: BLK, thick: 34, base: 2.5, gain: 2.4, litOutline: LIT });
  const hem = []; for (let i = 0; i <= 8; i++) hem.push([x + 46 - i * 11.5, B - 82 + (i % 2 ? 9 : 0) - Math.abs(i - 4) * 2]);
  blob(c, [smooth([[x - 28, B - 212 + br], [x, B - 220 + br], [x + 28, B - 212 + br], [x + 50, B - 164], [x + 54, B - 116], ...hem, [x - 54, B - 116], [x - 50, B - 164]], new Set([5, 6, 7, 8, 9, 10, 11, 12, 13]), 4)], { ramp: WHT, thick: 24, base: 4.4, gain: 2.0, outline: EDGE });
  for (const s of [-1, 1]) {
    blob(c, [tube([[x + s * 26, B - 96], [x + s * 27, B - 12]], 18, 17)], { ramp: WHT, thick: 10, base: 4.2, outline: EDGE });
    blob(c, [ell(x + s * 28, B - 7, 22, 12)], { ramp: WHT, thick: 7, base: 4.6, outline: EDGE });
    for (const dx of [-7, 1, 9]) c.line(R(x + s * 28 + dx * s - 1), R(B - 11), R(x + s * 28 + dx * s - 1), R(B - 5), "#8A8AA0");
  }
  // neck (hidden behind the head at rest; visible while the head dips to the pile), collar rides on it
  const hx = x + L * DUCK_S.dx, hy = y + L * DUCK_S.dy + br * (1 - L), tilt = DUCK_S.tilt * L, nb = [x, B - 200], ne = [hx, hy + 20];
  if (L > 0.01) { blob(c, [tube([[nb[0] + 6, nb[1] + 6], ne], 40, 38)], { ramp: BLK, thick: 18, base: 2.6, gain: 2.2, litOutline: LIT }); blob(c, [tube([[nb[0] + 6, nb[1] + 14], [ne[0] + 12, ne[1] + 18]], 24, 22)], { ramp: WHT, thick: 12, base: 4.3, outline: EDGE }); }
  const cp = [lerp(nb[0], ne[0], 0.12 + 0.2 * L), lerp(nb[1], ne[1], 0.12 + 0.2 * L) + 4 + br * 0.5], ca = Math.atan2(ne[1] - nb[1], ne[0] - nb[0]) + Math.PI / 2;
  blob(c, [ell(cp[0], cp[1], 34 - 4 * L, 7, L > 0.01 ? ca * Math.min(1, L * 3) : 0)], { ramp: RED, thick: 4, base: 3.5, outline: "#3A0A10" });
  c.rect(R(cp[0]) - 2, R(cp[1] + 5), 5, 5, "#C8962E"); c.px(R(cp[0]) - 1, R(cp[1] + 6), "#FDE68A");
  const tagA = o.tagA ?? 0;
  if (tagA > 0) {
    const sw = Math.sin(t * 3.2) * 1.2, w = c.measure(MAIN, "CHASER", { scale: 2 }) + 12, h = 18, bx = R(x - w / 2 + sw), by = R(B - 178 + (1 - tagA) * 4), g = fade(c, tagA);
    g.line(R(cp[0]), R(cp[1] + 9), R(x + sw), by, "#8A6418");
    for (const [cx, cy] of [[bx, by + 3], [bx, by + h - 4], [bx + w, by + 3], [bx + w, by + h - 4]]) { g.rect(cx - 4, cy - 4, 9, 9, "#5A3A08"); g.rect(cx - 3, cy - 3, 7, 7, "#F4CA50"); }
    g.rrect(bx - 1, by - 1, w + 2, h + 2, "#5A3A08", 2); g.rrect(bx, by, w, h, "#F4CA50", 2); g.rect(bx + 2, by + 1, w - 4, 2, "#FDE68A");
    g.text(MAIN, "CHASER", bx + 6, by + 3, "#5A3A08", { scale: 2 });
  }
  // the toy pile sits in front of the left haunch, behind the head
  o.between?.();
  // head (slides down in front of the chest to the pile while leaning)
  const P = (dx, dy) => { dx *= K; dy *= K; const cs = Math.cos(tilt), sn = Math.sin(tilt); return [hx + dx * cs - dy * sn, hy + dx * sn + dy * cs]; };
  const H = (pts) => pts.map(([dx, dy]) => P(dx, dy));
  // ears: semi-perked, the top third folded forward; a little sway
  for (const s of [-1, 1]) {
    const sw = Math.sin(t * 1.7 + s) * 0.06 + (o.earPerk ?? 0) * 0.08, rot = (p) => xform(p, ...P(s * 34, -28), sw * s);
    blob(c, [rot(H(mir([[-50, -14], [-58, -62], [-34, -72], [-16, -38]], s * -1, 0, 0)))], { ramp: BLK, thick: 9, base: 2.9, litOutline: LIT });
    blob(c, [rot(H(mir([[-45, -24], [-51, -58], [-37, -64], [-25, -40]], s * -1, 0, 0)))], { ramp: EAR_IN, thick: 5, base: 3.0, outline: "#14101C" });
    const drop = Math.sin(t * 2.4 + s * 1.3) * 1.5;
    blob(c, [rot(H(mir([[-59, -62], [-33, -73], [-62, -44 + drop]], s * -1, 0, 0)))], { ramp: BLK, thick: 5, base: 3.6, litOutline: "#7A74B0" });
  }
  // skull + fluffy cheeks (black), white blaze into the muzzle and chin
  const cheek = (s) => H(mir([[-30, 2], [-50, 4], [-62, 16], [-56, 22], [-64, 30], [-50, 38], [-30, 40]], s * -1, 0, 0));
  blob(c, [H(ell(0, -4, 52, 44)), cheek(-1), cheek(1)], { ramp: BLK, thick: 26, base: 2.7, gain: 2.3, litOutline: LIT });
  blob(c, [H([[-4, -47], [4, -47], [9, -22], [20, -2], [34, 18], [36, 32], [22, 44], [0, 48], [-22, 44], [-36, 32], [-34, 18], [-20, -2], [-9, -22]])], { ramp: WHT, thick: 16, base: 4.5, gain: 1.6, outline: "#2A2A40", litOutline: "#9494AE" });
  blob(c, [H(ell(0, 25, 24, 15))], { ramp: WHT, thick: 10, base: 4.9, gain: 1.4, outline: "#5A5A74" });
  // eyes, blush, nose, mouth (or the carried duck)
  const look = o.look ?? [0, 0], blink = o.blink ?? 0;
  for (const s of [-1, 1]) { const [ex, ey] = P(s * 22, -7); eye(c, ex, ey, 15, { ry: 16, iris: DOG_EYE, pupil: "round", look, blink, lid: BLK[3] }); }
  { const [a1, b1] = P(-38, 14), [a2, b2] = P(38, 14); blush(c, a1, b1, 9, 4, "#F27A9A"); blush(c, a2, b2, 9, 4, "#F27A9A"); }
  const [nx, ny] = P(0, 11); nose(c, nx, ny, 10, "#1A1420");
  const [mx, my] = P(0, 25), open = o.open ?? 0.7;
  o.after?.();
  if (o.carry) { c.line(R(mx - 8), R(my + 1), R(mx + 8), R(my + 1), "#07060E"); const [qx, qy] = P(0, 30); duck(c, qx, qy, 1, -1); }
  else { smile(c, mx, my, 9, { open, tongue: "#F07090" }); if (open > 0.5) { const pant = Math.sin(t * 2 * Math.PI * 1.6) * 1.2; blob(c, [H(ell(0, 38 + pant, 6, 6.5))], { ramp: RAMP.pink, thick: 4, base: 4.4, outline: "#6A1A34" }); const [lx, ly] = P(0, 35 + pant); c.line(R(lx), R(ly), R(lx), R(ly + 4), "#C84468"); } }
}
// head offset + tilt that bring the mouth (head + (0, 34)) onto the duck, computed once
const DUCK_S = (() => { const tilt = -0.22, mx = -Math.sin(tilt) * 30 * 1.18, my = Math.cos(tilt) * 30 * 1.18; return { dx: DUCK[0] - DX - mx, dy: DUCK[1] - DY - my, tilt }; })();

// ---------------------------------------------------------------- timing of the fetch
const F0 = EV.names + 0.1, F_DOWN = 0.52, F_HOLD = 0.12, F_UP = 0.56, GRAB = F0 + F_DOWN + 0.06;
function lean(t) { const d = ease((t - F0) / F_DOWN), u = ease((t - F0 - F_DOWN - F_HOLD) / F_UP); return d * (1 - u); }
// timing table (also read by levels/meadow-motions.mjs for the sound design)
export const YT = { words: EV.words, pickup: 1.6, plate: [EV.chaser - 0.15, EV.chaser + 0.2], bubblePop: 0.16, bubbleRise: 0.22, bubblesOut: [EV.toys + 0.25, EV.toys + 0.7], counterIn: [EV.thousand - 0.25, EV.toys + 0.6], countLead: 0.2, wagUp: [GRAB + 0.3, GRAB + 0.8] };
const BUBBLES = [["DUCK", 84, 470, EV.names], ["BLUE BALL", 76, 424, EV.names + 0.62], ["BONE", 124, 380, EV.names + 0.9], ["LAMB", 68, 336, EV.names + 1.15], ["ROPE", 126, 292, EV.names + 1.4], ["FRISBEE", 82, 248, EV.names + 1.62]];

// ---------------------------------------------------------------- passes
const off = (V) => V.x1 < RX0 - 60 || V.x0 > RX1 + 60;
export function back(c, V, t) { if (off(V)) return; if (!BACK) build(); BACK.blit(c, V); }

export function actors(c, V, t) {
  if (off(V)) return;
  sign(c, R(V.X(PLATE[0])), R(V.Y(PLATE[1])), "LV 5", "plate", 1, t);
  const L = lean(t), carry = t >= GRAB;
  const look = [0, 0]; const toPile = win(t, EV.names - 0.05, F0 + F_DOWN + F_HOLD + 0.2, 0.2, 0.3); look[0] -= 0.8 * toPile; look[1] += 0.6 * toPile;
  const atTag = win(t, EV.chaser - 0.1, EV.names - 0.1, 0.2, 0.25); look[1] += 0.5 * atTag;   // glances down at its new name plate
  const restDuck = () => { if (!carry) duck(c, V.X(DUCK[0]), V.Y(DUCK[1]), 1, -1); };
  drawDog(c, R(V.X(DX)), R(V.Y(DY)), t, {
    after: restDuck,
    between: () => PILE.blit(c, V),
    lean: L, carry, look, blink: blinkAt(t, 3.9, 2.9) * (1 - sm(L, 0, 0.1)), open: lerp(0.7, 1, sm(t, F0, F0 + F_DOWN)) , tagA: sm(t, YT.plate[0], YT.plate[1]),
    wag: 1 + 0.45 * sm(t, YT.wagUp[0], YT.wagUp[1]), earPerk: win(t, EV.words - 0.1, EV.words + 1.2, 0.2, 0.4),
  });
}

export function front(c, V, t) { if (off(V)) return; if (!FRONT) build(); FRONT.blit(c, V); }

/** Speech bubble with a tail pointing down toward (tx, ty). */
function bubble(c, cx, cy, text, a, tx, ty) {
  if (a <= 0) return; const g = fade(c, a), tw = c.measure(MAIN, text, { scale: 2 }), w = tw + 14, h = 24, x = R(cx - w / 2), y = R(cy - h / 2);
  const ang = Math.atan2(ty - cy, tx - cx), bx = R(cx + Math.cos(ang) * 6), by = y + h - 1;
  g.poly([[bx - 5, by - 2], [bx + 5, by - 2], [R(bx + Math.cos(ang) * 12), by + 9]], "#2A1A3A");
  g.rrect(x - 1, y - 1, w + 2, h + 2, "#2A1A3A", 2); g.rrect(x, y, w, h, "#FDFEED", 2); g.rect(x + 2, y + h - 3, w - 4, 2, "#E4E0D0");
  g.poly([[bx - 3, by - 2], [bx + 3, by - 2], [R(bx + Math.cos(ang) * 9), by + 6]], "#FDFEED");
  g.text(MAIN, text, x + 7, y + 5, "#2A1A3A", { scale: 2 });
}

export function hud(c, V, t) {
  if (off(V)) return;
  const ox = R(V.X(DX)) - 270, oy = R(V.Y(DY)) - 392;
  // +WORDS on "words"
  const k = (t - YT.words) / YT.pickup; if (k > 0 && k < 1) pickup(c, 270 + ox, 300 + oy, "+WORDS", k);
  // name bubbles over the toy pile, popping one after another; DUCK first (the dog fetches it)
  const out = 1 - sm(t, YT.bubblesOut[0], YT.bubblesOut[1]);
  for (const [txt, bx, by, t0] of BUBBLES) { const a = Math.min(sm(t, t0, t0 + YT.bubblePop), out); bubble(c, bx + ox, by + oy - 32 - R(4 * (1 - sm(t, t0, t0 + YT.bubbleRise))), txt, a, 180 + ox, 560 + oy); }
  // counter: 1,022 TOYS (runs up on "one thousand and twenty-two")
  const ca = win(t, YT.counterIn[0], YT.counterIn[1], 0.25, 0.4);
  if (ca > 0) {
    const n = R(1022 * ease(clamp01((t - EV.thousand + YT.countLead) / (EV.toys - EV.thousand)))), s = String(n) + " TOYS", o = { scale: 3 };
    const w = c.measure(MAIN, "1022 TOYS", o) + 24, h = 36, x = 270 + ox - R(w / 2), y = 146 + oy + R((1 - ca) * 4), g = fade(c, ca);
    panel(c, x, y, w, h, ca, C.Y); const tx = x + w - 12 - c.measure(MAIN, s, o);
    g.text(MAIN, s, tx + 1, y + 8, C.O, o); g.text(MAIN, s, tx, y + 7, n >= 1022 ? C.Y : C.IV, o);
  }
}
// geometry/timing shared with levels/meadow-motions.mjs (sound design)
export { DX, DY, DUCK, F0, F_DOWN, F_HOLD, F_UP, GRAB, BUBBLES, lean };
