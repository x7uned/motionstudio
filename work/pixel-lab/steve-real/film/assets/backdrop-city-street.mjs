// steve-real copy (2026-10-28) of the Kagenami catalog init backdrop «city-street» (frozen; changes: the street is extended to
// x −400…2200 with a second, lower row of house fronts, no far hazy towers (the skyline is free for the silhouettes that rise
// behind the roofs), an open plot for the live bank prop at x 548–760, a bus-stop shelter, and a blit that passes the screen
// pixel to the hole fill so skyline layers can be drawn behind the roofs). Original header:
// init backdrop «city-street»: a sunny old-town street seen frontally — five house fronts of different height and colour
// (brick, cream, mint, peach, blue brick) with mansard / stepped / tiled roofs, upper windows with shutters and flower
// boxes, a calm blank storey in the middle, shopfronts with striped awnings and blank displays, a pavement with slabs,
// kerb and asphalt road to the bottom edge. Sky with slow clouds. No cars, lamps, clocks, signs with text, people.
import { build, blitS as blit, skyFill, arr, OL, rnd, band, slab, fillF, vBand, hBand, speckle, bricks, wash, outline, ellFill, mix } from "../lib/bd3-kit.mjs";

const SKY = arr(["#5E92D6", "#7AAAE4", "#98C2EC", "#B6D6F2", "#D2E6F4", "#EAEAE0"]);
const BRICK = arr(["#4A1E22", "#7A3030", "#A44636", "#C46446", "#DC8458"]);
const CREAM = arr(["#8C7A68", "#B8A58A", "#D9C7A2", "#EEDDB8", "#FAF0D2"]);
const MINT = arr(["#4E7A74", "#78A39A", "#9CC4B4", "#BEDCCB", "#DCEEDC"]);
const PEACH = arr(["#8A5A52", "#B67A66", "#D69C80", "#EEBC9A", "#FADCB8"]);
const BLUEB = arr(["#323A5C", "#4C5886", "#6C7CAE", "#8C9CC8", "#B0BEDE"]);
const STONE = arr(["#5A5668", "#7A7690", "#9A96B0", "#BAB6CC", "#D8D4E4"]);
const SLATE = arr(["#262838", "#363A52", "#464C6A", "#5C6488"]);
const TILE = arr(["#6A2A24", "#8E3C2E", "#B04E36", "#CC6A44"]);
const GLASS = arr(["#2E4E86", "#4A74B0", "#76A2D4", "#A8CCEC"]);
const SHOPIN = arr(["#2A1E30", "#4A3040", "#6E4A48", "#A0705A"]);
const FRAME = ["#8E7E6A", "#C8B898", "#EFE4CC", "#FFF8E6"];
const GROUND = 560;

function windowAt(g, x, y, w, h, o = {}) {
  const [fs, f1, f2, f3] = FRAME;
  g.rect(x - 3, y - 3, w + 6, h + 6, f2); g.rect(x - 3, y - 3, w + 6, 1, f3); g.rect(x - 3, y - 3, 1, h + 6, f3); g.rect(x + w + 2, y - 2, 1, h + 5, f1);
  outline(g, x - 3, y - 3, w + 6, h + 6);
  fillF(g, x, y, x + w, y + h, (px, py) => { const v = (py - y) / h * 0.55 + 0.05 + (((px - x) + (py - y) * 0.5) % 18 < 5 ? 0.3 : 0); return band(GLASS, v, px, py, 0.3); });
  g.rect(x, y, w, 2, GLASS[0]); g.rect(x, y, 2, h, GLASS[0]);
  g.rect(x + Math.floor(w / 2) - 1, y, 2, h, f2); g.rect(x, y + Math.floor(h * 0.4), w, 2, f2);
  g.rect(x - 5, y + h + 3, w + 10, 4, STONE[3]); g.rect(x - 5, y + h + 3, w + 10, 1, STONE[4]); g.rect(x - 5, y + h + 6, w + 10, 1, STONE[1]); outline(g, x - 5, y + h + 3, w + 10, 4);
  if (o.shut) {
    for (const sx of [x - 12, x + w + 4]) {
      g.rect(sx, y - 3, 8, h + 6, o.shut[2]); g.rect(sx, y - 3, 1, h + 6, o.shut[3]); g.rect(sx + 7, y - 3, 1, h + 6, o.shut[1]);
      for (let k = y; k < y + h + 3; k += 4) g.rect(sx + 1, k, 6, 1, o.shut[1]);
      outline(g, sx, y - 3, 8, h + 6);
    }
  }
  if (o.box) {
    g.rect(x - 4, y + h + 7, w + 8, 7, "#7A4A2C"); g.rect(x - 4, y + h + 7, w + 8, 1, "#A06A3C"); g.rect(x - 4, y + h + 13, w + 8, 1, "#4A2C1C"); outline(g, x - 4, y + h + 7, w + 8, 7);
    for (let i = 0; i < w + 8; i += 3) { const k = rnd(i * 13 + x); g.rect(x - 4 + i, y + h + 3 - Math.floor(k * 3), 2, 4 + Math.floor(k * 3), k < 0.5 ? "#3E8C3C" : "#5CAE48"); if (k > 0.35) g.rect(x - 4 + i, y + h + 1 - Math.floor(k * 3), 2, 2, o.box[Math.floor(k * 9) % o.box.length]); }
  }
}

function shopfront(g, x0, x1, base, o) {
  const y = base - 88, x = x0 + 14, w = x1 - x0 - 28 - (o.door ? 42 : 0);
  // plinth and pilaster
  g.rect(x0, base - 14, x1 - x0, 14, STONE[2]); g.rect(x0, base - 14, x1 - x0, 1, STONE[4]); g.rect(x0, base - 3, x1 - x0, 3, STONE[1]);
  for (let i = x0; i < x1; i += 22) g.rect(i, base - 14, 1, 11, STONE[1]);
  // display window with warm interior
  const gx = x + 3, gy = y + 26, gw = w - 6, gh = base - 16 - gy;
  g.rect(x, y + 23, w, base - 14 - (y + 23), FRAME[2]); outline(g, x, y + 23, w, base - 14 - (y + 23));
  fillF(g, gx, gy, gx + gw, gy + gh, (px, py) => band(SHOPIN, 0.2 + (py - gy) / gh * 0.55 + Math.max(0, 0.25 - Math.abs(px - gx - gw * 0.5) / gw * 0.5), px, py, 0.3));
  // shelves with blank goods
  for (const fy of [gy + gh * 0.42, gy + gh * 0.78]) { g.rect(gx, Math.floor(fy), gw, 2, "#C8A070"); g.rect(gx, Math.floor(fy) + 2, gw, 1, "#5A3A28"); let px = gx + 4; for (let k = 0; px < gx + gw - 8; k++) { const bw = 6 + Math.floor(rnd(k * 7 + x) * 8), bh = 6 + Math.floor(rnd(k * 11 + x) * 9), col = o.goods[k % o.goods.length]; g.rect(px, Math.floor(fy) - bh, bw, bh, col[1]); g.rect(px, Math.floor(fy) - bh, bw, 1, col[2]); g.rect(px + bw - 1, Math.floor(fy) - bh + 1, 1, bh - 1, col[0]); px += bw + 3 + Math.floor(rnd(k * 5) * 6); } }
  // glass gleam
  for (let k = 0; k < 3; k++) for (let j = 0; j < gh; j++) { const px = gx + 14 + k * 3 + Math.floor(j * 0.6) + (k === 2 ? 14 : 0); if (px < gx + gw) g.px(px, gy + j, k === 1 ? "#D8ECF8" : "#A8C8E0"); }
  g.rect(gx + Math.floor(gw / 2), gy, 2, gh, FRAME[2]);
  // awning with scallops
  const ay = y, ah = 22;
  for (let px = x - 6; px < x + w + 6; px++) {
    const stripe = Math.floor((px - x + 6) / 9) % 2, col = o.awn[stripe];
    for (let j = 0; j < ah; j++) { const sc = j > ah - 5 ? Math.abs(((px - x + 6) % 9) - 4) < (j - (ah - 5) < 3 ? 5 : 3) : true; if (sc) g.px(px, ay + j, j < 3 ? o.awn[stripe + 2] : j > ah - 6 ? o.awn[stripe + 4] : col); }
  }
  g.rect(x - 6, ay - 1, w + 12, 1, OL);
  for (let px = x - 6; px < x + w + 6; px++) { const e = Math.abs(((px - x + 6) % 9) - 4); g.px(px, ay + ah - 1 + (e > 2 ? 1 : 0) , OL); }
  g.rect(x - 7, ay, 1, ah - 4, OL); g.rect(x + w + 6, ay, 1, ah - 4, OL);
  // blank sign board over the awning
  g.rect(x + 8, ay - 14, w - 16, 12, FRAME[2]); g.rect(x + 8, ay - 14, w - 16, 1, FRAME[3]); outline(g, x + 8, ay - 14, w - 16, 12);
  g.rect(x + 11, ay - 11, w - 22, 6, o.board);
  if (o.door) {
    const dx = x + w + 8, dw = 30;
    g.rect(dx - 2, base - 82, dw + 4, 82 - 3, FRAME[2]); outline(g, dx - 2, base - 82, dw + 4, 79);
    g.rect(dx, base - 78, dw, 75, o.door[2]); g.rect(dx, base - 78, 1, 75, o.door[3]); g.rect(dx + dw - 1, base - 78, 1, 75, o.door[1]);
    g.rect(dx + 4, base - 72, dw - 8, 28, GLASS[2]); g.rect(dx + 4, base - 72, dw - 8, 2, GLASS[0]); g.rect(dx + 4, base - 72, 2, 28, GLASS[0]); g.line(dx + 7, base - 50, dx + 14, base - 68, GLASS[3]); outline(g, dx + 4, base - 72, dw - 8, 28);
    g.rect(dx + 4, base - 40, dw - 8, 30, o.door[1]); g.frame(dx + 4, base - 40, dw - 8, 30, o.door[3]);
    g.rect(dx + dw - 8, base - 34, 3, 3, "#F4CA50");
    g.rect(dx - 4, base - 3, dw + 8, 3, STONE[3]);
  }
}

function house(g, o) {
  const { x0, x1, top, R, rows, roof, brick } = o, W = x1 - x0;
  // roof behind/on top of the wall
  if (roof === "mansard") {
    g.poly([[x0 - 4, top + 2], [x0 + 12, top - 48], [x1 - 12, top - 48], [x1 + 4, top + 2]], null, (x, y) => band(SLATE, 0.8 - (y - (top - 48)) / 50 * 0.55 + ((x + y) % 14 < 1 ? -0.2 : 0), x, y, 0.3));
    for (let y = top - 44; y < top; y += 6) g.rect(x0 - 2, y, W + 4, 1, SLATE[0]);
    g.line(x0 - 4, top + 2, x0 + 12, top - 48, OL); g.line(x1 + 4, top + 2, x1 - 12, top - 48, OL); g.rect(x0 + 12, top - 49, W - 24, 1, OL); g.rect(x0 + 12, top - 48, W - 24, 1, SLATE[3]);
    for (const dx of o.dormers ?? []) { const cx = x0 + dx; g.rect(cx - 9, top - 36, 18, 24, R[2]); g.poly([[cx - 12, top - 36], [cx, top - 48], [cx + 12, top - 36]], SLATE[1]); g.line(cx - 12, top - 36, cx, top - 48, OL); g.line(cx + 12, top - 36, cx, top - 48, OL); g.rect(cx - 6, top - 32, 12, 16, GLASS[2]); g.rect(cx - 6, top - 32, 12, 2, GLASS[0]); g.rect(cx - 1, top - 32, 2, 16, FRAME[2]); outline(g, cx - 9, top - 36, 18, 24); }
  } else if (roof === "tile") {
    g.poly([[x0 - 6, top + 6], [x0 + 6, top - 30], [x1 - 6, top - 30], [x1 + 6, top + 6]], null, (x, y) => band(TILE, 0.85 - (y - (top - 30)) / 36 * 0.5 + ((x + (Math.floor(y / 5) % 2) * 5) % 10 < 1 ? -0.25 : 0), x, y, 0.3));
    g.line(x0 - 6, top + 6, x0 + 6, top - 30, OL); g.line(x1 + 6, top + 6, x1 - 6, top - 30, OL); g.rect(x0 + 6, top - 31, W - 12, 1, OL);
    const cx = x0 + (o.chim ?? 30); g.rect(cx, top - 54, 14, 26, BRICK[2]); g.rect(cx, top - 54, 14, 3, BRICK[4]); g.rect(cx, top - 54, 2, 26, BRICK[3]); outline(g, cx, top - 54, 14, 26);
  } else if (roof === "steps") {
    const steps = [[14, 0], [28, 12], [44, 24], [60, 34]];
    for (const [ins, up] of steps) { const w2 = W - ins * 2; g.rect(x0 + ins, top - up - 12, w2, 14, R[2]); g.rect(x0 + ins, top - up - 12, w2, 2, R[4]); g.rect(x0 + ins, top - up - 12, 2, 14, R[3]); outline(g, x0 + ins, top - up - 12, w2, 14); }
    g.rect(x0 + 60, top - 24, W - 120, 12, R[2]);
  } else if (roof === "gable") {
    const cx = (x0 + x1) / 2;
    g.poly([[x0 - 4, top + 2], [cx, top - 62], [x1 + 4, top + 2]], null, (x, y) => band(TILE, 0.82 - (y - (top - 62)) / 70 * 0.45 + ((x + (Math.floor(y / 5) % 2) * 5) % 10 < 1 ? -0.25 : 0), x, y, 0.3));
    g.line(x0 - 4, top + 2, cx, top - 62, OL); g.line(x1 + 4, top + 2, cx, top - 62, OL);
  } else {
    // flat roof: cornice with brackets
    g.rect(x0 - 3, top - 12, W + 6, 14, R[3]); g.rect(x0 - 3, top - 12, W + 6, 2, R[4]); g.rect(x0 - 3, top, W + 6, 2, R[1]); outline(g, x0 - 3, top - 12, W + 6, 14);
    for (let x = x0 + 4; x < x1 - 4; x += 10) g.rect(x, top + 2, 4, 5, R[1]);
  }
  // wall
  const wy0 = top + 2;
  vBand(g, x0, wy0, x1, GROUND, R, 0.52, 0.42, 0.3);
  if (brick) bricks(g, x0, wy0, x1, GROUND, [R[1], R[2], R[2], R[3]].map((c) => c), R[1], 10, 5, o.seed ?? 3);
  else speckle(g, x0, wy0, x1, GROUND, R[1], 0.02, o.seed ?? 1);
  wash(g, x0, wy0, x1, GROUND, "#241830", (x, y) => 0.25 * Math.max(0, (y - 520) / 40), 3);
  g.rect(x0, wy0, 2, GROUND - wy0, R[4]); g.rect(x0 + 2, wy0, 1, GROUND - wy0, R[3]); g.rect(x1 - 3, wy0, 3, GROUND - wy0, R[0]); g.rect(x1 - 4, wy0, 1, GROUND - wy0, R[1]);
  g.rect(x0 - 1, wy0, 1, GROUND - wy0, OL); g.rect(x1, wy0, 1, GROUND - wy0, OL);
  // string courses (the calm band between them is blank wall)
  for (const sy of [262, 446]) { g.rect(x0, sy, W, 5, R[3]); g.rect(x0, sy, W, 1, R[4]); g.rect(x0, sy + 5, W, 2, R[0]); g.rect(x0, sy - 1, W, 1, OL); g.rect(x0, sy + 7, W, 1, OL); }
  // upper windows
  const n = Math.max(1, Math.floor((W - 24) / 52)), gap = W / n;
  for (const wy of rows) for (let i = 0; i < n; i++) windowAt(g, Math.round(x0 + gap * (i + 0.5) - 12), wy, 24, 40, { shut: o.shut, box: o.box && wy === rows[rows.length - 1] ? o.box : null });
  // drainpipe
  if (o.pipe) { g.rect(x1 - 12, wy0, 4, GROUND - wy0 - 14, "#6E6A80"); g.rect(x1 - 12, wy0, 1, GROUND - wy0 - 14, "#A8A4BC"); g.rect(x1 - 9, wy0, 1, GROUND - wy0 - 14, "#3A364A"); for (let y = wy0 + 30; y < GROUND - 20; y += 90) g.rect(x1 - 14, y, 8, 3, "#3A364A"); }
  shopfront(g, x0, x1, GROUND, o.shop);
}

function paint(g) {
  const goods = (a) => a;
  const G1 = [BRICK, CREAM, MINT].map((r) => [r[1], r[3], r[4]]), G2 = [PEACH, BLUEB, MINT].map((r) => [r[1], r[3], r[4]]);
  const GB = arr(["#2E7A4C", "#42A862", "#7AD08A"]);
  house(g, { x0: -230, x1: 92, top: 112, R: BRICK, rows: [134, 190], roof: "mansard", dormers: [60, 200], brick: true, shut: arr(["#183C34", "#245A4C", "#3A8470", "#58AC94"]), box: ["#F2C8D8", "#FFF2A8"], pipe: true, seed: 5,
    shop: { awn: arr(["#E2564A", "#FBF0DC", "#FF8A7A", "#FFFFFF", "#A2362E", "#C8B8A0"]).map((c) => c), board: "#EFE4CC", goods: G1 } });
  house(g, { x0: 92, x1: 246, top: 170, R: CREAM, rows: [196], roof: "flat", shut: arr(["#1E3E6C", "#2E5C9A", "#4A80C4", "#74A4E0"]), box: ["#F26A6A", "#FFD84A"], seed: 7,
    shop: { awn: arr(["#3A86C8", "#FBF0DC", "#6AAAE2", "#FFFFFF", "#22609A", "#C8B8A0"]), board: "#F4DCA8", goods: G2, door: PEACH } });
  house(g, { x0: 246, x1: 404, top: 140, R: MINT, rows: [158, 206], roof: "steps", seed: 11, shut: arr(["#6A3A22", "#8E5430", "#B07442", "#D09A5E"]),
    shop: { awn: arr(["#F0B030", "#FBF0DC", "#FFD46A", "#FFFFFF", "#B07A18", "#C8B8A0"]), board: "#DCEEDC", goods: G1 } });
  house(g, { x0: 404, x1: 566, top: 190, R: PEACH, rows: [206], roof: "tile", chim: 110, seed: 13, shut: arr(["#1E4A3A", "#2E6C54", "#468E70", "#68B090"]), box: ["#F8F0F0", "#FF8AA8"], pipe: false,
    shop: { awn: arr(["#4EA060", "#FBF0DC", "#78C888", "#FFFFFF", "#2E6C40", "#C8B8A0"]), board: "#FADCB8", goods: G2, door: BLUEB } });
  // (bank plot x 548–760: the live bank prop stands here, open sky behind it)
  const B = 760;
  house(g, { x0: B, x1: B + 170, top: 236, R: PEACH, rows: [282], roof: "tile", chim: 40, seed: 21, shut: arr(["#1E4A3A", "#2E6C54", "#468E70", "#68B090"]), box: ["#F8F0F0", "#FF8AA8"],
    shop: { awn: arr(["#4EA060", "#FBF0DC", "#78C888", "#FFFFFF", "#2E6C40", "#C8B8A0"]), board: "#FADCB8", goods: G2, door: BLUEB } });
  house(g, { x0: B + 170, x1: B + 330, top: 250, R: MINT, rows: [292], roof: "steps", seed: 23, shut: arr(["#6A3A22", "#8E5430", "#B07442", "#D09A5E"]),
    shop: { awn: arr(["#F0B030", "#FBF0DC", "#FFD46A", "#FFFFFF", "#B07A18", "#C8B8A0"]), board: "#DCEEDC", goods: G1 } });
  house(g, { x0: B + 330, x1: B + 480, top: 230, R: CREAM, rows: [282], roof: "flat", shut: arr(["#1E3E6C", "#2E5C9A", "#4A80C4", "#74A4E0"]), box: ["#F26A6A", "#FFD84A"], seed: 27,
    shop: { awn: arr(["#3A86C8", "#FBF0DC", "#6AAAE2", "#FFFFFF", "#22609A", "#C8B8A0"]), board: "#F4DCA8", goods: G2, door: PEACH } });
  house(g, { x0: B + 480, x1: B + 700, top: 214, R: BRICK, rows: [272], roof: "mansard", dormers: [60, 160], brick: true, shut: arr(["#183C34", "#245A4C", "#3A8470", "#58AC94"]), box: ["#F2C8D8", "#FFF2A8"], pipe: true, seed: 29,
    shop: { awn: arr(["#E2564A", "#FBF0DC", "#FF8A7A", "#FFFFFF", "#A2362E", "#C8B8A0"]), board: "#EFE4CC", goods: G1 } });
  house(g, { x0: B + 700, x1: B + 890, top: 236, R: BLUEB, rows: [282], roof: "gable", brick: true, seed: 31, shut: arr(["#E8DCC0", "#F4ECD6", "#FFF8E6", "#FFFFFF"]),
    shop: { awn: arr(["#8A58B8", "#FBF0DC", "#B088DC", "#FFFFFF", "#5C3A86", "#C8B8A0"]), board: "#B0BEDE", goods: G1 } });
  house(g, { x0: B + 890, x1: B + 1060, top: 244, R: PEACH, rows: [290], roof: "flat", seed: 33, shut: arr(["#1E4A3A", "#2E6C54", "#468E70", "#68B090"]),
    shop: { awn: arr(["#E2564A", "#FBF0DC", "#FF8A7A", "#FFFFFF", "#A2362E", "#C8B8A0"]), board: "#FADCB8", goods: G2, door: MINT } });
  house(g, { x0: B + 1060, x1: B + 1250, top: 226, R: MINT, rows: [280], roof: "tile", chim: 120, seed: 35, shut: arr(["#6A3A22", "#8E5430", "#B07442", "#D09A5E"]),
    shop: { awn: arr(["#3A86C8", "#FBF0DC", "#6AAAE2", "#FFFFFF", "#22609A", "#C8B8A0"]), board: "#DCEEDC", goods: G1 } });
  house(g, { x0: B + 1250, x1: B + 1460, top: 240, R: CREAM, rows: [288], roof: "steps", seed: 37, shut: arr(["#1E3E6C", "#2E5C9A", "#4A80C4", "#74A4E0"]),
    shop: { awn: arr(["#F0B030", "#FBF0DC", "#FFD46A", "#FFFFFF", "#B07A18", "#C8B8A0"]), board: "#F4DCA8", goods: G2 } });
  // the bank plot: a low garden wall and hedge behind the bank
  for (let x = 548; x < 760; x++) for (let y = 470; y < GROUND; y++) g.px(x, y, y < 486 ? ((x + y) % 5 ? "#3E8C3C" : "#5CAE48") : (Math.floor(y / 8) + Math.floor(x / 16)) % 2 ? "#B6AEC4" : "#A49CB4");
  g.rect(548, 485, 212, 1, OL); g.rect(548, 469, 212, 1, OL);
  // pavement: back shade, slabs, kerb; road with speckle, centre dashes, a drain and a manhole
  const PAV = arr(["#7E7894", "#9690AE", "#B0AAC4", "#C8C2D8", "#DDD8EA"]);
  vBand(g, -400, GROUND, 2200, 646, PAV, 0.55, 0.62, 0.3);
  for (let y = GROUND, r = 0; y < 646; y += 26, r++) { g.rect(-400, y, 2600, 1, PAV[1]); for (let x = -400 + (r % 2) * 24; x < 2200; x += 48) g.rect(x, y, 1, 26, PAV[1]); }
  wash(g, -400, GROUND, 2200, GROUND + 22, "#241830", (x, y) => 0.55 * (1 - (y - GROUND) / 22), 4);
  speckle(g, -400, GROUND, 2200, 646, PAV[3], 0.012, 4);
  g.rect(-400, 646, 2600, 7, STONE[4]); g.rect(-400, 653, 2600, 3, STONE[2]); g.rect(-400, 656, 2600, 3, STONE[0]); g.rect(-400, 645, 2600, 1, OL); g.rect(-400, 659, 2600, 1, OL);

  // a bus stop shelter at the back of the pavement (glass back panel, slim posts, flat roof, a bench) — no signs with text
  { const x0 = 1300, x1 = 1400, top = 506, base = 586;
    for (let x = x0 + 4; x < x1 - 4; x++) for (let y = top + 8; y < base - 22; y++) g.px(x, y, ((x - y) % 23 < 3) ? "#E4F0FA" : (x + y) % 2 ? "#A8C8E0" : "#9CBCD8");
    g.rect(x0, top, x1 - x0, 8, "#5C6488"); g.rect(x0, top, x1 - x0, 2, "#8C9CC8"); outline(g, x0, top, x1 - x0, 8);
    for (const px of [x0 + 2, x1 - 6]) { g.rect(px, top + 8, 4, base - top - 8, "#6E6A80"); g.rect(px, top + 8, 1, base - top - 8, "#A8A4BC"); outline(g, px, top + 8, 4, base - top - 8); }
    g.rect(x0 + 16, base - 26, 68, 5, "#8A5A3A"); g.rect(x0 + 16, base - 26, 68, 1, "#B07A50"); outline(g, x0 + 16, base - 26, 68, 5); g.rect(x0 + 22, base - 21, 3, 21, "#4A4660"); g.rect(x0 + 75, base - 21, 3, 21, "#4A4660"); }
  const ASPH = arr(["#2C2A3C", "#383650", "#444260", "#504E70"]);
  vBand(g, -400, 660, 2200, 1300, ASPH, 0.3, 0.55, 0.3);
  speckle(g, -400, 660, 2200, 1300, ASPH[3], 0.03, 2); speckle(g, -400, 660, 2200, 1300, ASPH[0], 0.03, 3);
  for (let x = -370; x < 2200; x += 130) { g.rect(x, 888, 54, 8, "#E8E2CC"); g.rect(x, 888, 54, 1, "#FFFFFF"); g.rect(x, 895, 54, 1, "#A8A290"); }
  ellFill(g, 96, 800, 34, 11, (x, y) => band(ASPH, 0.15 + (y - 790) / 40, x, y)); g.ering(96, 800, 34, 11, "#5A5878"); g.ering(96, 800, 35, 12, OL); for (let i = -24; i <= 24; i += 8) g.rect(96 + i, 797, 3, 7, ASPH[0]);
  g.rect(430, 668, 58, 12, ASPH[0]); for (let i = 0; i < 58; i += 6) g.rect(430 + i, 668, 2, 12, "#6A688C"); outline(g, 430, 668, 58, 12, "#14101E");
}

let W = null;
export default {
  kind: "city-street", backdrop: true, covers: ["city-street", "street", "town", "road"],
  source: "init (new)",
  desc: "sunny old-town street: house fronts, shop awnings, pavement, kerb and road",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#2A2230", "#3A3042", "#1E1824"], beam: "#F7B04A" },
  draw(c, cam, t, sky2) { if (!W) W = build(paint, -400, -300, 2600, 1600); const sf = skyFill(SKY, -100, 280, [[60, 3.2, 0.1, 1.2], [110, 2.1, 0.55, 0.9], [20, 4, 0.8, 0.8], [40, 2.6, 0.3, 1.0], [90, 1.8, 0.75, 1.1]], t, 2600); return blit(c, cam, W, sky2 ? (wx, wy, ix, iy, x, y) => sky2(x, y) ?? sf(wx, wy, ix, iy) : sf); },
  notes: "Painted once at 1x and sampled nearest through the camera: close-ups show larger pixels than the props. Sky and clouds are live (holes in the cache).",
};
