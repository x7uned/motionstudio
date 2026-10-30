// LV4 · cat — village rooftops on a sunny afternoon (RANGE BIOME.roofs = 1620..2160, camera REST.cat). The wheat field
// ends at a dry-stone wall above the village; three terraced houses step down the hill (yellow · pink · blue), tiled
// roofs facing us, chimneys with smoke, a washing line between two chimneys, far roofs, hills and a church spire; at the
// right a garden wall with a hedge leads up to the town park. The black cat sits on the middle ridge facing the camera
// (the sun peeks over its head). Events: "cat" → +4 KG; "two hundred" → a balance 200 MICE = 1 CAT; "falls hurt more"
// → it peers down at the lower roof, worried; "but it twists" → it springs off, rolls upside down, the front half turns
// back first, then the back half, it lands on its feet on the lower roof and sits up facing the camera again.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { pickup, sign, shadow, sm, ease, lerp, rnd, fade, mix, bayer, MAIN, C, blinkAt, clamp01, panel } from "../cute.mjs";
import { worldLayer, frameLight, lit, keyed, thick, ditherEll, stubble, gaze, R } from "./roofs-kit.mjs";
import { drawCat, drawCatAir, CAT_HEAD_Y, CAT_AIR_FEET } from "./cat-art.mjs";
import { drawMouse } from "./mouse-art.mjs";

export const RANGE = BIOME.roofs;
const [X0, X1] = RANGE, GY = LAND, CS = 0.8;            // cat scale in this film
// terraced houses: [x0, x1, ridge y, eaves y, plaster ramp, roof ramp]
const PL = { yel: ["#B08A4E", "#D8B474", "#F2D49A", "#FBE8C0"], pink: ["#B07A72", "#D8A096", "#F0C6B8", "#FBE2D8"], blue: ["#7890A8", "#9CB4CA", "#C2D6E6", "#E4EEF6"] };
const TL = { terra: ["#6A2A1A", "#94402A", "#C2603C", "#E08A5A", "#F4B08A"], red: ["#5A2026", "#84303A", "#AE4A4E", "#D06A66", "#EC9A8E"], slate: ["#2E3A4E", "#44546C", "#5E708A", "#7E92AA", "#A8B8CC"] };
const HOUSES = [
  { x0: 1664, x1: 1790, ridge: -36, eaves: 40, wall: PL.yel, roof: TL.terra, chim: 1716, kind: "arch", shut: "#4E7AA8" },
  { x0: 1790, x1: 1966, ridge: -82, eaves: 28, wall: PL.pink, roof: TL.red, chim: 1808, kind: "shop", shut: "#3E7A5A" },
  { x0: 1966, x1: 2124, ridge: -8, eaves: 66, wall: PL.blue, roof: TL.slate, chim: 2098, kind: "ivy", shut: "#B85A3A" },
];
const SIT = { x: 1890, y: -82 }, LANDING = { x: 2004, y: -8 };
const STONE = ["#4E4A48", "#6E6862", "#8E8880", "#B0AAA0"], HEDGE = ["#2E5A2E", "#3E7A3A", "#5A9A48", "#7CB85A"];

// ---------------------------------------------------------------- static scenery
let SCENE = null;
function build() {
  SCENE = worldLayer(X0 - 40, -460, X1 - X0 + 80, 772, (g) => {
    const edge = (x) => Math.min(sm(x, X0 + 30, X0 + 160), 1 - sm(x, X1 - 160, X1 - 20));
    // far hills and hazy far roofs (they taper toward the seams)
    for (let x = X0; x < X1; x++) {
      const e = edge(x), top = -64 - e * (60 + Math.sin(x * 0.013 + 1) * 18 + Math.sin(x * 0.041) * 6);
      for (let y = R(top); y < GY + 30; y++) g.px(x, y, y - top < 3 ? "#B4DCB8" : (y - top) / 40 > bayer(x, y) + 0.3 ? "#8EC09C" : "#A2D0AA");
    }
    for (let i = 0; i < 16; i++) {
      const w = 34 + rnd(i * 3 + 1) * 30, x = X0 + 70 + i * 28 + rnd(i * 3 + 2) * 14, h = 18 + rnd(i * 3 + 3) * 22, base = -40 - rnd(i) * 20;
      if (x + w > X1 - 40) continue;
      g.rect(R(x), R(base - h), R(w), R(h + 80), i % 3 === 0 ? "#E6D2C2" : i % 3 === 1 ? "#D8DCE6" : "#EADAB4");
      g.poly([[x - 3, base - h], [x + w / 2, base - h - 14 - rnd(i + 9) * 6], [x + w + 3, base - h]], i % 2 ? "#C88A78" : "#9AA8BC");
      for (let k = 0; k < 2; k++) g.rect(R(x + 6 + k * (w - 18)), R(base - h + 6), 4, 5, "#8A9AB4");
    }
    spire(g, 2090, -40);
    // the field's last strip (the same stubble plane and furrows as the field level), wheat stalks at its edge
    stubble(g, X0, HOUSES[0].x0, GY, 314, { vx: 1350 });
    for (let i = 0; i < 14; i++) { const x = X0 + 2 + rnd(i + 70) * 30; g.line(R(x), GY, R(x + (rnd(i + 71) - 0.5) * 6), R(GY - 10 - rnd(i + 72) * 22), "#D8B050"); g.px(R(x + (rnd(i + 71) - 0.5) * 6), R(GY - 10 - rnd(i + 72) * 22), "#F2C85A"); }
    stoneWall(g, 1638, HOUSES[0].x0 + 2, GY - 16, 312);
    // houses: walls with windows (behind), tiled roofs facing us, chimneys
    for (const h of HOUSES) house(g, h);
    // garden wall with a hedge up to the park level at the right seam
    stoneWall(g, HOUSES[2].x1 - 2, X1, GY, 312);
    for (let x = HOUSES[2].x1 - 6; x < X1 + 6; x++) { const top = GY - 16 - Math.abs(Math.sin(x * 0.31)) * 4 - Math.sin(x * 0.09) * 3; for (let y = R(top); y < GY + 2; y++) g.px(x, y, y - top < 2 ? HEDGE[3] : (x * 5 + y * 3) % 11 === 0 ? HEDGE[0] : (y - top) / 16 > bayer(x, y) + 0.2 ? HEDGE[1] : HEDGE[2]); }
    for (let i = 0; i < 6; i++) { const x = HOUSES[2].x1 + 4 + i * 6, y = GY - 12 - (i % 2) * 4; g.px(x, y, "#F4F0FF"); g.px(x + 1, y, "#F4F0FF"); g.px(x, y + 1, "#F8D040"); }
  });
}
function spire(g, x, base) {
  g.rect(x - 9, base - 70, 18, 90, "#E8E0D4"); g.rect(x - 9, base - 70, 3, 90, "#F6F0E8"); g.rect(x + 6, base - 70, 3, 90, "#C8BEB0");
  g.poly([[x - 12, base - 70], [x, base - 132], [x + 12, base - 70]], "#7A8AA2"); g.line(x, base - 132, x + 12, base - 70, "#5E6E86");
  g.line(x, base - 146, x, base - 132, "#C8A048"); g.line(x - 4, base - 141, x + 4, base - 141, "#C8A048");
  g.rect(x - 4, base - 58, 8, 12, "#5E6E86"); g.disc(x, base - 31, 4, "#F4F0E0"); g.px(x, base - 33, "#4A4A5A"); g.px(x + 1, base - 31, "#4A4A5A");
}
function stoneWall(g, x0, x1, top, bot) {
  for (let y = top; y < bot; y++) for (let x = x0; x < x1; x++) {
    const row = Math.floor((y - top) / 9), off = (row % 2) * 7, col = Math.floor((x - x0 + off) / 14), seed = row * 37 + col;
    const inRow = (y - top) % 9, inCol = (x - x0 + off) % 14, mortar = inRow === 0 || inCol === 0;
    g.px(x, y, mortar ? STONE[0] : inRow === 1 ? STONE[3] : rnd(seed) < 0.3 ? STONE[1] : STONE[2]);
  }
  for (let x = x0; x < x1; x++) { g.px(x, top - 1, STONE[3]); g.px(x, top - 2, STONE[2]); }
}
function house(g, h) {
  const { x0, x1, ridge, eaves, wall, roof } = h, W = x1 - x0, street = 290;
  // plaster wall from the eaves down to the street: shade under the eaves, slightly darker toward the street, lit left edge
  for (let y = eaves; y < street; y++) for (let x = x0; x < x1; x++) {
    const u = (x - x0) / W, under = y - eaves < 7 ? 1 : y - eaves < 12 ? ((12 - (y - eaves)) / 5 > bayer(x, y) ? 1 : 0) : 0, low = (y - 150) / 140 > bayer(x, y) + 0.35;
    g.px(x, y, under ? wall[0] : u < 0.05 ? wall[3] : u > 0.95 ? wall[1] : low || (y * 3 + x * 7) % 23 === 0 ? wall[1] : wall[2]);
  }
  // storey ledges
  for (const ly of [eaves + 96]) { g.rect(x0, ly, W, 3, wall[3]); g.rect(x0, ly + 3, W, 1, wall[0]); }
  // upper windows (two storeys)
  const nWin = Math.max(1, Math.floor(W / 64)), step = W / nWin;
  for (const [ri, row] of [[0, eaves + 30], [1, eaves + 116]].entries()) for (let i = 0; i < nWin; i++) {
    if (row[1] + 40 > 194) continue;
    const cx = R(x0 + step * (i + 0.5));
    if (h.kind === "shop" && ri === 0 && i === nWin - 1) balcony(g, cx, row[1]); else win(g, cx, row[1], h, i + ri * 3);
  }
  // ground floor: shop with a striped awning, doors with lamps, flower pots; drainpipe; ivy; cobbled pavement
  if (h.kind === "shop") shopfront(g, x0, x1);
  else { const dx = R(x0 + W * 0.5); door(g, dx, street, h.kind === "arch" ? "#3E6A4A" : "#3A5A8A"); win(g, dx + (h.kind === "arch" ? -38 : 40), 222, h, 9); }
  const px = x1 - 7; g.rect(px, eaves + 4, 4, street - eaves - 4, "#8A8E98"); g.rect(px, eaves + 4, 1, street - eaves - 4, "#B8BCC6"); for (let y = eaves + 30; y < street; y += 40) g.rect(px - 1, y, 6, 3, "#6A6E78");
  if (h.kind === "ivy") ivy(g, x0 + 4, eaves + 6, street);
  for (let x = x0; x < x1; x++) for (let y = street; y < 316; y++) { const row = Math.floor((y - street) / 6), ix = (x + (row % 2) * 5) % 10; g.px(x, y, y === street ? "#8A8478" : ix === 0 || (y - street) % 6 === 0 ? "#6A6460" : rnd(row * 91 + Math.floor((x + (row % 2) * 5) / 10)) < 0.3 ? "#9A948A" : "#B4AEA2"); }
  // roof face: overhanging eaves, staggered tile rows with lit tops, ridge cap tiles, barge boards at the ends
  const rx0 = x0 - 6, rx1 = x1 + 6;
  g.rect(rx0, eaves, rx1 - rx0, 5, "#3A2A26"); g.rect(rx0, eaves + 5, rx1 - rx0, 2, mix(wall[1], "#000000", 0.25));
  for (let y = ridge + 4; y < eaves; y++) {
    const row = Math.floor((y - ridge - 4) / 8), iy = (y - ridge - 4) % 8, off = (row % 2) * 6;
    for (let x = rx0; x < rx1; x++) {
      const ix = (x - rx0 + off) % 12, u = (x - rx0) / (rx1 - rx0);
      let k = iy === 0 ? 4 : iy < 3 ? 3 : iy < 6 ? 2 : 1; if (ix === 0) k = Math.min(k, 1); if (u > 0.9 && k > 1) k -= 1; if (u < 0.08 && k < 4 && iy > 0) k += 1;
      if ((rnd(row * 53 + Math.floor((x - rx0 + off) / 12)) < 0.12) && iy > 0 && ix > 0) k = Math.max(1, k - 1);
      g.px(x, y, roof[k]);
    }
  }
  for (let x = rx0 - 1; x <= rx1; x++) { g.px(x, ridge, roof[0]); g.px(x, ridge + 1, roof[4]); g.px(x, ridge + 2, roof[3]); g.px(x, ridge + 3, roof[1]); }
  for (let x = rx0; x < rx1; x += 10) { g.px(x, ridge, roof[1]); g.px(x, ridge + 1, roof[2]); }
  for (const bx of [rx0 - 1, rx1 - 2]) { g.rect(bx, ridge, 3, eaves - ridge + 5, "#4A3026"); g.rect(bx + (bx < x0 ? 0 : 2), ridge, 1, eaves - ridge + 5, "#7A5444"); }
  // chimney with a cap
  const cx = h.chim, top = ridge - 46;
  for (let y = top; y < ridge + 10; y++) for (let x = cx - 10; x < cx + 10; x++) { const row = Math.floor((y - top) / 5), mort = (y - top) % 5 === 0 || (x - cx + 10 + (row % 2) * 5) % 10 === 0; g.px(x, y, mort ? "#8A4A3A" : x < cx - 6 ? "#D87A5E" : x > cx + 6 ? "#9A4E3A" : "#BA6248"); }
  g.rect(cx - 13, top - 4, 26, 5, "#5E5450"); g.rect(cx - 13, top - 4, 26, 1, "#9A928A"); g.rect(cx - 5, top - 9, 10, 5, "#7A5A50"); g.rect(cx - 5, top - 9, 10, 1, "#A88070");
}

function win(g, cx, wy, h, seed) {
  const wx = cx - 13, arch = h.kind === "arch";
  g.rect(wx - 9, wy - 1, 8, 38, h.shut); g.rect(wx + 27, wy - 1, 8, 38, h.shut); for (let k = 0; k < 36; k += 4) { g.rect(wx - 8, wy + k, 6, 1, mix(h.shut, "#000000", 0.3)); g.rect(wx + 28, wy + k, 6, 1, mix(h.shut, "#000000", 0.3)); }
  g.rect(wx - 1, wy - 2, 28, 40, "#FAF6EE"); g.rect(wx + 2, wy + 1, 22, 34, "#3A5A8A"); g.rect(wx + 2, wy + 1, 22, 2, "#2A3E66");
  if (arch) { for (let i = -14; i <= 14; i++) { const yy = R(wy - 2 - Math.sqrt(Math.max(0, 196 - i * i)) * 0.5); for (let y = yy; y < wy - 1; y++) g.px(cx + i, y, Math.abs(i) > 12 || y === yy ? "#FAF6EE" : "#3A5A8A"); } }
  g.rect(wx + 12, wy + 1, 2, 34, "#FAF6EE"); g.rect(wx + 2, wy + 17, 22, 2, "#FAF6EE");
  g.line(wx + 4, wy + 13, wx + 9, wy + 4, "#8AB4E0"); g.line(wx + 16, wy + 33, wx + 21, wy + 24, "#6A94C8");
  // a curtain or a little pot plant in some windows
  if (seed % 3 === 1) { g.rect(wx + 3, wy + 2, 4, 14, "#F4E8D8"); g.rect(wx + 19, wy + 2, 4, 14, "#F4E8D8"); }
  if (seed % 3 === 2) { g.rect(wx + 5, wy + 30, 6, 5, "#C86A3A"); for (let k = 0; k < 5; k++) g.px(wx + 5 + k, wy + 27 + (k % 2), "#5A9A48"); }
  g.rect(wx - 3, wy + 38, 32, 5, "#8A5434"); g.rect(wx - 3, wy + 38, 32, 1, "#B07444");
  for (let k = 0; k < 9; k++) { const fx = wx - 1 + k * 3.5, fy = wy + 35 - (k % 2) * 2, fc = h.kind === "ivy" ? (k % 3 ? "#F4F0FF" : "#F8D040") : k % 3 ? "#E8344A" : "#FF6A7A"; g.px(R(fx), R(fy), fc); g.px(R(fx) + 1, R(fy), mix(fc, "#000000", 0.25)); g.px(R(fx), R(fy) + 2, "#4E8A3A"); }
}
function balcony(g, cx, wy) {
  g.rect(cx - 15, wy - 4, 30, 48, "#FAF6EE"); g.rect(cx - 12, wy - 1, 24, 45, "#3A5A8A"); g.rect(cx - 1, wy - 1, 2, 45, "#FAF6EE"); g.line(cx - 9, wy + 14, cx - 4, wy + 4, "#8AB4E0");
  g.rect(cx - 24, wy + 44, 48, 4, "#7A746C"); g.rect(cx - 24, wy + 44, 48, 1, "#A8A298");
  g.rect(cx - 24, wy + 26, 48, 2, "#2E2A2E"); for (let x = cx - 24; x <= cx + 24; x += 4) g.rect(x, wy + 26, 1, 18, "#2E2A2E");
  for (const [dx, col] of [[-18, "#E8344A"], [16, "#F4CA50"]]) { g.rect(cx + dx - 3, wy + 36, 7, 8, "#C86A3A"); for (let k = 0; k < 9; k++) g.px(cx + dx - 4 + k, wy + 33 + (k % 3), k % 2 ? col : "#4E8A3A"); }
}
function door(g, cx, street, col) {
  g.rect(cx - 15, street - 56, 30, 56, "#FAF6EE"); g.rect(cx - 12, street - 53, 24, 53, col); g.rect(cx - 12, street - 53, 24, 2, mix(col, "#000000", 0.35));
  for (const [y0, y1] of [[-48, -30], [-26, -6]]) { g.frame(cx - 9, street + y0, 8, y1 - y0, mix(col, "#000000", 0.3)); g.frame(cx + 1, street + y0, 8, y1 - y0, mix(col, "#000000", 0.3)); }
  g.px(cx + 8, street - 28, "#F4CA50"); g.rect(cx - 13, street - 3, 26, 3, "#9A948A");
  g.rect(cx + 20, street - 54, 6, 8, "#2E2A2E"); g.rect(cx + 21, street - 53, 4, 6, "#FFE490");
}
function shopfront(g, x0, x1) {
  const W = x1 - x0, sy = 236, street = 290;
  g.rect(x0 + 10, sy, W - 20, street - sy, "#5A3A2A"); g.rect(x0 + 12, sy + 2, W - 24, 2, "#7A5440");
  // display window with loaves and a door
  g.rect(x0 + 18, sy + 8, W - 80, 42, "#FBE8C0"); g.rect(x0 + 20, sy + 10, W - 84, 38, "#4A6A9A"); g.line(x0 + 24, sy + 28, x0 + 34, sy + 14, "#8AB4E0");
  for (let i = 0; i < Math.floor((W - 84) / 20); i++) { const bx = x0 + 30 + i * 20, by = sy + 40; ditherEll(g, bx, by, 8, 5, "#D8923A", 1.2); g.line(bx - 4, by - 2, bx - 1, by - 4, "#F8C870"); g.line(bx + 1, by - 2, bx + 4, by - 4, "#F8C870"); }
  g.rect(x0 + 18, sy + 47, W - 80, 4, "#8A5434");
  const dx = x1 - 48; g.rect(dx, sy + 4, 30, street - sy - 4, "#FBE8C0"); g.rect(dx + 3, sy + 7, 24, street - sy - 7, "#3E7A5A"); g.rect(dx + 6, sy + 11, 18, 18, "#4A6A9A"); g.px(dx + 23, sy + 34, "#F4CA50");
  // striped awning and a sign board
  for (let x = x0 + 6; x < x1 - 6; x++) for (let y = sy - 22; y < sy; y++) { const st = Math.floor((x - x0) / 10) % 2; g.px(x, y, y > sy - 4 ? (st ? "#B82A30" : "#E0D8CC") : st ? "#E8404A" : "#FBF6EE"); }
  for (let x = x0 + 6; x < x1 - 6; x += 10) for (let k = 0; k < 4; k++) g.px(x + 5 + (k > 1 ? 1 : 0), sy + k, Math.floor((x - x0) / 10) % 2 ? "#B82A30" : "#E0D8CC");
  g.rect(x0 + 40, sy - 41, W - 80, 18, "#3A2418"); g.rect(x0 + 41, sy - 40, W - 82, 16, "#F4D49A");
  const tw = g.measure(MAIN, "BAKERY", { scale: 2 }); g.text(MAIN, "BAKERY", R(x0 + W / 2 - tw / 2), sy - 37, "#7A3A20", { scale: 2 });
}
function ivy(g, x0, y0, y1) {
  for (let i = 0; i < 5; i++) {
    let x = x0 + i * 7, y = y1 - 2;
    while (y > y0 + 30 + i * 18) { g.px(R(x), y, "#3E6A2E"); if ((y + i * 3) % 6 === 0) { const d = (y + i) % 12 < 6 ? -1 : 1; g.px(R(x) + d, y, "#5A9A48"); g.px(R(x) + d * 2, y - 1, "#7CB85A"); g.px(R(x) + d, y - 1, "#5A9A48"); } x += Math.sin(y * 0.11 + i) * 0.6; y--; }
  }
}

// ---------------------------------------------------------------- the cat's moves (world coordinates)
/** Timing of every motion in this level (seconds, from the word timings); levels/cat-motions.mjs reads it too. */
export const T = {
  pick: EV.cat, balIn: [EV.twoHundred, EV.twoHundred + 0.35], balSwing: 1.1, balOut: [EV.falls - 0.1, EV.falls + 0.25],
  look: EV.twoHundred + 0.1, takeoff: [EV.twists - 0.12, EV.twists + 0.1], lookBack: EV.heavier1 + 0.35, worry: EV.falls - 0.05, crouch: EV.twists - 0.32, off: EV.twists - 0.12,
  roll1: EV.twists + 0.14, frontA: EV.twists + 0.16, frontB: EV.twists + 0.44, backA: EV.twists + 0.34, backB: EV.twists + 0.66, land: EV.lands, sitA: EV.lands + 0.12, sitB: EV.lands + 0.46,
};
const headSit = (a) => ({ x: a.x, y: a.y - CAT_HEAD_Y * CS });
const crouchAt = (t) => (t > T.crouch ? Math.sin(clamp01((t - T.crouch) / (T.off - T.crouch + 0.06)) * Math.PI * 0.5) : 0);
function catAt(t) {
  if (t < T.off) {
    const crouch = crouchAt(t);
    const worry = Math.min(sm(t, T.worry, T.worry + 0.3), 1 - sm(t, T.crouch - 0.05, T.crouch + 0.1));
    const look = gaze(t, [[0, [0, 0]], [T.look, [-0.2, -0.9]], [T.lookBack, [0, 0]], [T.worry, [0.75, 0.9]]]);
    return { kind: "sit", ...SIT, squash: crouch * 0.85, worry, look, earsBack: worry * 0.25, wide: worry * 0.3 };
  }
  if (t < T.land + 0.12) {
    // flight of the pivot (head centre): up and over to the lower roof, landing with the paws on the tiles
    const h0 = headSit(SIT), p0 = { x: h0.x, y: h0.y + 24 }, p1 = { x: LANDING.x, y: LANDING.y - CAT_AIR_FEET * CS };
    const u = clamp01((t - T.off) / (T.land - T.off)), apex = 0.3, up = 64;
    const x = lerp(p0.x, p1.x, ease(u) * 0.6 + u * 0.4);
    const y = u < apex ? p0.y - up * Math.sin((u / apex) * Math.PI * 0.5) : lerp(p0.y - up, p1.y, ((u - apex) / (1 - apex)) ** 1.6);
    const roll = Math.PI * ease(clamp01((t - T.off) / (T.roll1 - T.off)));
    const front = roll + Math.PI * ease(clamp01((t - T.frontA) / (T.frontB - T.frontA)));
    const back = roll + Math.PI * ease(clamp01((t - T.backA) / (T.backB - T.backA)));
    const sq = t > T.land ? Math.sin(clamp01((t - T.land) / 0.12) * Math.PI) * 7 : 0;
    return { kind: "air", x, y: y + sq, front, back, k: sm(t, ...T.takeoff) };
  }
  return { kind: "land", ...LANDING };
}

// ---------------------------------------------------------------- layers
const vis = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!vis(V)) return; if (!SCENE) build();
  SCENE.blit(c, V, { lut: frameLight(V).lut });
}
export function actors(c, V, t) {
  if (!vis(V)) return;
  const L = frameLight(V), g = lit(c, L.mul), X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  // chimney smoke puffs (soft, rising, dissolving)
  for (const h of HOUSES) for (let i = 0; i < 4; i++) {
    const ph = ((t * 0.32 + i * 0.25 + h.x0 * 0.001) % 1), x = X(h.chim + ph * 26 + Math.sin(t * 1.3 + i) * 3), y = Y(h.ridge - 58 - ph * 70), r = 4 + ph * 9;
    ditherEll(fade(g, (1 - ph) * 0.8 * sm(ph, 0, 0.12)), x, y, r, r * 0.8, ph < 0.4 ? "#F4F4F8" : "#E2E6EE", 1);
  }
  // washing line between the yellow and the pink chimneys, laundry swaying in the breeze
  laundry(g, X, Y, t);
  sign(g, X(1690), Y(HOUSES[0].ridge), "LV 4", "wood", 1, t);
  const m = catAt(t), bl = blinkAt(t, 3.6, 0.2);
  if (m.kind === "sit") {
    shadow(g, X(m.x), Y(m.y) + 1, 70, 5, "#000000", 0.35);
    drawCat(g, X(m.x), Y(m.y), { s: CS, t, blink: m.worry > 0.5 ? 0 : bl, look: m.look, worry: m.worry, earsBack: m.earsBack, wide: m.wide, squash: m.squash });
  } else if (m.kind === "air") {
    // shadow on the lower roof grows as the cat comes down; motion arcs while it rolls and twists
    const near = clamp01(1 - (LANDING.y - CAT_AIR_FEET * CS - m.y) / 200);
    if (m.k < 1) shadow(g, X(SIT.x), Y(SIT.y) + 1, 70, 5, "#000000", 0.35 * (1 - m.k));
    shadow(g, X(m.x), Y(LANDING.y) + 2, 30 + near * 40, 4, "#000000", (0.15 + near * 0.25) * sm(t, T.off, T.off + 0.25));
    if (m.k < 1) drawCat(g, X(SIT.x), Y(SIT.y), { s: CS, t, a: 1 - m.k, squash: crouchAt(t) * 0.85, look: [0.75, 0.9] });
    const spin = t < T.backB + 0.05 ? Math.min(sm(t, T.off, T.off + 0.1), 1 - sm(t, T.backB - 0.05, T.backB + 0.1)) : 0;
    if (spin > 0) for (let i = 0; i < 3; i++) {
      const a0 = (m.front + i * 2.1) % (Math.PI * 2), rr = 112 + i * 9;
      for (let k = 0; k < 14; k++) { const a = a0 + k * 0.05, px = X(m.x) + Math.cos(a) * rr, py = Y(m.y) + 20 + Math.sin(a) * rr * 0.92; if ((1 - k / 14) * spin > bayer(R(px), R(py)) * 0.9) g.px(R(px), R(py), "#FFFFFF"); }
    }
    drawCatAir(g, X(m.x), Y(m.y), { s: CS, a: m.k, front: m.front, back: m.back, wide: 0.8, open: 0.5, look: [0, 0.4] });
  } else {
    const k = sm(t, T.sitA, T.sitB), e = ease(clamp01((t - T.sitA) / (T.sitB - T.sitA)));
    const pivot = LANDING.y - CAT_AIR_FEET * CS, sitHead = LANDING.y - CAT_HEAD_Y * CS;
    shadow(g, X(LANDING.x), Y(LANDING.y) + 2, 70, 5, "#000000", 0.4);
    if (k < 1) drawCatAir(g, X(LANDING.x), Y(pivot), { s: CS, a: 1 - k, headA: 0, front: 0, back: 0, wide: 0.8 });
    const happy = Math.min(sm(t, T.sitB, T.sitB + 0.2), 1 - sm(t, T.sitB + 0.9, T.sitB + 1.1));
    drawCat(g, X(LANDING.x), Y(LANDING.y), { s: CS, t, bodyA: k, headDy: -(1 - e) * (pivot - sitHead), blink: Math.max(bl, happy * 0.75), wide: (1 - e) * 0.8, open: (1 - e) * 0.5, look: [0, 0.4 * (1 - e)] });
  }
}
function laundry(g, X, Y, t) {
  const a = [1724, HOUSES[0].ridge - 50], b = [1800, HOUSES[1].ridge - 50], sag = 16, pts = [];
  for (let i = 0; i <= 24; i++) { const u = i / 24; pts.push([lerp(a[0], b[0], u), lerp(a[1], b[1], u) + sag * Math.sin(Math.PI * u)]); }
  for (let i = 0; i < pts.length - 1; i++) g.line(X(pts[i][0]), Y(pts[i][1]), X(pts[i + 1][0]), Y(pts[i + 1][1]), "#F4F0E8");
  const items = [[0.2, "sock", "#E8344A"], [0.42, "shirt", "#5A9AE0"], [0.66, "towel", "#F4CA50"], [0.84, "sock", "#8D59DA"]];
  for (const [u, kind, col] of items) {
    const i = Math.round(u * 24), [px, py] = pts[i], sw = Math.sin(t * 2.1 + u * 7) * 0.12, x = X(px), y = Y(py);
    const P = (dx, dy) => [R(x + dx + dy * sw), R(y + dy)];
    if (kind === "sock") { g.poly([P(-3, 0), P(3, 0), P(3, 12), P(7, 15), P(7, 19), P(-3, 19)], col); g.poly([P(-3, 0), P(3, 0), P(3, 3), P(-3, 3)], "#FFFFFF"); }
    else if (kind === "shirt") { g.poly([P(-9, 0), P(9, 0), P(13, 6), P(9, 9), P(8, 22), P(-8, 22), P(-9, 9), P(-13, 6)], col); g.poly([P(-3, 0), P(3, 0), P(0, 4)], "#FFFFFF"); g.line(...P(0, 5), ...P(0, 21), "#3A7AC0"); }
    else { g.poly([P(-8, 0), P(8, 0), P(8, 24), P(-8, 24)], col); for (let k = 4; k < 24; k += 7) g.poly([P(-8, k), P(8, k), P(8, k + 2), P(-8, k + 2)], "#E8344A"); }
    g.rect(x - 1, y - 2, 3, 3, "#C8A060");
  }
}
export function hud(c, V, t) {
  if (!vis(V)) return;
  const X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  const kp = (t - T.pick) / 1.6; if (kp > 0 && kp < 1) pickup(c, X(SIT.x) + 128, Y(SIT.y - CAT_HEAD_Y * CS) - 44, "4 KG", kp);
  const ba = Math.min(sm(t, ...T.balIn), 1 - sm(t, ...T.balOut));
  if (ba > 0) balance(c, X(SIT.x), 200, ba, t);
}
/** Pixel balance: a heap of tiny mice on the left pan, a little black cat on the right, level; caption 200 MICE = 1 CAT. */
function balance(c, cx, y, a, t) {
  const w = 316, h = 118, x = R(Math.max(12, Math.min(528 - w, cx - w / 2))), g = fade(c, a);
  g.rrect(x, y, w, h, "#3A2418", 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.Y, 2); g.rrect(x + 3, y + 3, w - 6, h - 6, "#FBF3DC", 2);
  for (let j = y + 4; j < y + h - 30; j++) if ((j - y) % 2 === 0) g.rect(x + 4, j, w - 8, 1, "#F6EBCC");
  const bx = x + w / 2, by = y + 66, wob = Math.sin(clamp01((t - T.balIn[0]) / T.balSwing) * Math.PI * 2.5) * Math.exp(-(t - T.balIn[0]) * 2.2) * 0.16;
  const arm = 112, lx = bx - Math.cos(wob) * arm, ly = by - Math.sin(wob) * arm, rx = bx + Math.cos(wob) * arm, ry = by + Math.sin(wob) * arm;
  g.poly([[bx - 14, by + 26], [bx + 14, by + 26], [bx, by + 2]], "#8A5A34"); g.poly([[bx - 10, by + 24], [bx + 6, by + 24], [bx, by + 8]], "#B07444"); g.rect(R(bx - 20), R(by + 25), 40, 3, "#5A3A22");
  thick(g, [[lx, ly], [rx, ry]], 2, "#6A4024"); g.line(R(lx), R(ly) - 2, R(rx), R(ry) - 2, "#C08A50"); g.disc(R(bx), R(by), 3, "#F4CA50");
  // pans
  for (const [px, py] of [[lx, ly], [rx, ry]]) { g.line(R(px - 26), R(py + 1), R(px + 26), R(py + 1), "#5A3A22"); g.line(R(px - 24), R(py + 2), R(px + 24), R(py + 2), "#8A5A34"); }
  // heap of tiny mice (left): 5 rows, each mouse a 9-px body with an ear, eye and nose
  const rows = [8, 7, 5, 4, 2];
  rows.forEach((n, row) => { for (let k = 0; k < n; k++) {
    const mx = R(lx + (k - (n - 1) / 2) * 7 + (row % 2) * 2), my = R(ly - 3 - row * 6), f = (k + row) % 2 ? 1 : -1;
    g.poly([[mx - 5, my + 1], [mx - 4, my - 3], [mx + 1, my - 4], [mx + 4, my - 2], [mx + 5, my + 1]], "#5A4740"); g.poly([[mx - 4, my], [mx - 3, my - 2], [mx + 1, my - 3], [mx + 3, my - 1], [mx + 4, my]], "#B4A096");
    g.px(mx + 2 * f, my - 4, "#F4AEBE"); g.px(mx + 2 * f - f, my - 5, "#8C7872"); g.px(mx + 3 * f, my - 2, "#1A1210"); g.px(mx + 5 * f, my, "#F27A9A"); g.px(mx - 5 * f, my, "#E89AAA"); g.px(mx - 6 * f, my - 1, "#E89AAA");
  } });
  // a little black cat sitting on the right pan
  const kx = R(rx), ky = R(ry);
  g.poly([[kx - 13, ky], [kx - 11, ky - 16], [kx + 11, ky - 16], [kx + 13, ky]], "#1C1834"); g.ellipse(kx, ky - 26, 12, 10, "#1C1834");
  g.poly([[kx - 12, ky - 30], [kx - 10, ky - 41], [kx - 3, ky - 34]], "#1C1834"); g.poly([[kx + 12, ky - 30], [kx + 10, ky - 41], [kx + 3, ky - 34]], "#1C1834");
  g.px(kx - 9, ky - 36, "#E58AA8"); g.px(kx + 9, ky - 36, "#E58AA8");
  for (const dx of [-5, 4]) { g.rect(kx + dx, ky - 29, 2, 3, "#F5AE2E"); g.px(kx + dx, ky - 29, "#FFF2B8"); }
  g.px(kx, ky - 24, "#F09AB8"); g.line(kx + 12, ky - 3, kx + 19, ky - 14, "#1C1834"); g.line(kx + 13, ky - 3, kx + 20, ky - 14, "#1C1834");
  const txt = "200 MICE = 1 CAT", tw = c.measure(MAIN, txt, { scale: 2 });
  g.text(MAIN, txt, R(bx - tw / 2), y + h - 24, "#5A3418", { scale: 2 });
}
