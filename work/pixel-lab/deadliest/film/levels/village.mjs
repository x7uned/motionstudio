// LV6 · a village street at dusk (RANGE BIOME.village = 2700..3240, tod ≈ 5.1, red sun). From the left: the desert sand
// turning into a dirt road at a little adobe gate post, a lilac plaster cottage with a lit window, a wooden door and a
// hanging lantern (the wooden LV 6 sign in front), far rooftops and palms behind the dog, a peach cottage with string
// lights along its eave and a stone well in front, then big banana leaves and bushes leading into the jungle (3240).
// The scruffy village dog sits on the road in the middle, its head framed by the low red sun.
// Narration: "Dogs kill about sixty thousand. Not with their teeth, but with rabies, a virus in the bite. A vaccine
// stops it." Events (village-time.mjs): head tilt + wag ("Dogs"); a cheeky teeth grin and a pixel ✕ ("teeth"); a mean
// green germ with a RABIES tag by its mouth, the dog worries ("rabies, a virus in the bite"); a syringe zips in and zaps
// it, the germ pops into sparkles, the dog brightens, a heart and +VACCINE ("A vaccine stops it"). Pure functions of t.
import { BIOME, LAND } from "../timeline.mjs";
import { blob, ell, tube, sign, pickup, tag, C, MAIN, ease, sm, lerp, clamp01, smooth } from "../cute.mjs";
import { Layer, groundAt, shrub, pebble, sparkle, glow, leafBall, blinks, R, rnd, fade, mix, bayer } from "./desert-kit.mjs";
import { drawDog, dogIcon } from "./village-dog.mjs";
import { T } from "./village-time.mjs";
export { T as TIMING };

export const RANGE = BIOME.village;
const [X0, X1] = RANGE;
export const DX = 2970, DHY = LAND - 256;       // dog head centre (screen 270, 404 at rest); its ground = DHY + 248
const SIGN_X = 2764, WELL_X = 3138;
const GERM = [2870, LAND - 202];                 // the germ by the dog's mouth (screen 170, 458 at rest)
const LANTERN = [2830, LAND - 140];

// ---------------------------------------------------------------- dusk palette
const WALL_A = { lit: "#D2A2A4", base: "#B88A96", shade: "#957086", dark: "#6A4C68", edge: "#4A3450" };
const WALL_B = { lit: "#E4B094", base: "#CC9688", shade: "#A8787E", dark: "#7A5466", edge: "#4E3448" };
const ROOF = ["#2A0E1C", "#4A1624", "#702430", "#943434", "#B44A3C", "#D0664A", "#E6865C"];
const WOOD = ["#1E0E16", "#36181E", "#522628", "#6E3830", "#8C4E3C", "#AA6A4C"];
const STONE = ["#2A2036", "#443650", "#5E4C68", "#7A6682", "#98829C", "#B8A2B4"];
const LEAF = ["#0E2420", "#16342A", "#1E4632", "#2A5A3A", "#3A7044", "#4E884C", "#6AA058", "#8ABA6A"];
const FAR = { roof: "#7A3E66", wall: "#8C5A7A", dark: "#5E3058", tree: "#4E2E5A", treeLit: "#6A3E6E" };
const WIN = ["#FFF6C8", "#FFE08A", "#FFC860", "#F49A48"];

let BACK = null, FRONT = null;
function build() {
  BACK = new Layer(X0 - 40, -420, X1 + 40, 440); FRONT = new Layer(X0 - 40, -360, X1 + 40, 440);
  const g = BACK.g, f = FRONT.g;
  // far: a soft hill line, distant rooftops and round trees / palms (dusk silhouettes) behind the dog
  for (let x = X0; x < X1; x++) { const h = R((14 + 8 * Math.sin(x * 0.013 + 0.6) + 5 * Math.sin(x * 0.041)) * sm(x, X0 + 10, X0 + 70)); for (let y = LAND - h; y < LAND; y++) g.px(x, y, y === LAND - h ? FAR.treeLit : FAR.tree); }
  for (const [x, w, h, rh] of [[2872, 34, 26, 14], [2906, 26, 18, 11], [3020, 30, 24, 13], [3052, 40, 30, 16], [3094, 22, 16, 10]]) farHouse(g, x, w, h, rh);
  for (const [x, r] of [[2860, 12], [2950, 10], [3000, 13], [3080, 11]]) leafBall(g, x, LAND - 24 - r * 0.6, r, [FAR.dark, FAR.tree, FAR.treeLit, "#7E4C7C"], x, { amp: 0.1, bumps: 6 });
  farPalm(g, 2936, LAND - 22, 52, -5); farPalm(g, 3110, LAND - 14, 44, 6);
  // the dirt road (the sand turns into it across the 2700 seam), its verge and stones
  for (let x = X0; x < X1; x++) for (let y = LAND; y < 440; y++) g.px(x, y, groundAt(x, y, y - LAND));
  for (let x = X0; x < X1; x++) if (rnd(x * 5) < 0.5) g.px(x, LAND, mix(groundAt(x, LAND, 0), "#FFD0B0", 0.3));
  puddle(g, 3104, LAND + 198, 54, 8);
  for (const [x, y, rx, ry] of [[2808, 10, 5, 3], [2900, 30, 4, 2], [3040, 22, 5, 3], [2760, 120, 8, 4], [2960, 150, 6, 3], [3180, 90, 7, 4], [2850, 230, 9, 5]]) pebble(g, x, LAND + y, rx, ry, STONE);
  // the village entrance: a low adobe wall end with a lamp post (left), the lilac cottage, the peach cottage, the well
  adobePost(g, 2712);
  cottage(g, { x0: 2722, x1: 2846, wallTop: LAND - 172, peak: LAND - 244, W: WALL_A, door: [2800, 2830], win: [[2738, LAND - 132, 30, 34]], chimney: 2748 });
  cottage(g, { x0: 3112, x1: 3236, wallTop: LAND - 160, peak: LAND - 232, W: WALL_B, door: null, win: [[3170, LAND - 128, 28, 30]], awning: true });
  well(g, WELL_X);
  // jungle edge: big banana leaves and bushes rising at the right end (behind the actors) …
  for (const [x, r] of [[3214, 22], [3236, 28], [3196, 16]]) leafBall(g, x, LAND - r * 0.7, r, LEAF, x, { amp: 0.14, bumps: 7 });
  for (const [x, h, ang, s] of [[3222, 120, -0.35, 1], [3244, 150, 0.12, 2], [3206, 86, -0.8, 3]]) banana(g, x, LAND, h, ang, s);
  // FRONT: grass verge tufts and flowers along the bottom, a few leaves of the jungle in front at the right edge
  for (let i = 0; i < 30; i++) { const x = R(X0 + 8 + i * 18 + rnd(i * 3) * 8); if (x > X1 - 4 || rnd(i * 5 + 1) > sm(x, X0, X0 + 80)) continue; tuftF(f, x, LAND + 302 + (i % 3) * 5, 18 + rnd(i) * 18, 5, i); }
  for (let i = 0; i < 10; i++) { const x = R(X0 + 20 + rnd(i * 7 + 5) * (X1 - X0 - 40)), y = LAND + 298 + R(rnd(i) * 10); flowerF(f, x, y - 10 - R(rnd(i * 3) * 10), i); }
  for (const [x, h, ang, s] of [[3236, 110, -1.0, 4], [3250, 170, -0.25, 5]]) banana(f, x, LAND + 300, h, ang, s);
  leafBall(f, 3232, LAND + 300, 26, LEAF, 77, { amp: 0.16, bumps: 8 });
  for (const [x, y] of [[2726, 4], [2846, 4]]) for (let i = 0; i < 4; i++) tuftF(f, x + i * 5 - 8, LAND + y + 2, 6 + rnd(x + i) * 5, 3, x + i);
}

function farHouse(g, x, w, h, rh) {
  for (let y = LAND - h; y < LAND; y++) for (let X = x; X < x + w; X++) g.px(X, y, X === x + w - 1 ? FAR.dark : FAR.wall);
  for (let j = 0; j < rh; j++) { const inset = R((j / rh) * (w / 2 + 2)); for (let X = x - 3 + inset; X < x + w + 3 - inset; X++) g.px(X, LAND - h - 1 - j, j === 0 ? FAR.dark : FAR.roof); }
  // one small lit window
  g.rect(x + R(w * 0.3), LAND - R(h * 0.62), 4, 5, WIN[2]); g.px(x + R(w * 0.3), LAND - R(h * 0.62), WIN[0]);
}
function farPalm(g, x, y, h, lean) {
  for (let j = 0; j <= h; j++) { const k = j / h; g.px(R(x + lean * k * k), y - j, FAR.dark); g.px(R(x + lean * k * k) + 1, y - j, FAR.tree); }
  const tx = x + lean, ty = y - h;
  for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.6, len = 14 + (i % 2) * 5; for (let s = 0; s <= len; s++) { const u = s / len; g.px(R(tx + Math.cos(a) * s), R(ty + Math.sin(a) * s + u * u * 8), u < 0.4 ? FAR.treeLit : FAR.tree); } }
}
function puddle(g, x, y, rx, ry) {
  // a puddle in the road (seen almost edge-on) reflecting the dusk sky: rose far half with the sun's orange glint,
  // plum near half, a wet dark rim and a thin bright far edge
  for (let Y = y - ry - 1; Y <= y + ry + 1; Y++) for (let X = x - rx - 2; X <= x + rx + 2; X++) {
    const u = (X - x) / rx, v = (Y - y) / ry, d = u * u + v * v + Math.sin(X * 0.21) * 0.05 + Math.sin(X * 0.07 + 1) * 0.06;
    if (d > 1.18) continue;
    if (d > 1) { if (bayer(X, Y) < 0.6) g.px(X, Y, "#5A3446"); continue; }
    let col = v < -0.55 ? "#F2A88A" : v < -0.1 ? "#D86E78" : v < 0.35 ? "#9A4A78" : "#5E3070";
    if (v < -0.1 && Math.abs(u) < 0.14 + (v + 0.55) * 0.1) col = v < -0.4 ? "#FFE0A0" : "#FFB070";
    if (d > 0.86) col = v < 0 ? "#FFD0B0" : "#3A2236";
    g.px(X, Y, col);
  }
}
function adobePost(g, x) {
  // the village gate: a rounded adobe pillar with a little cap and a low wall stub
  for (let y = LAND - 64; y < LAND + 2; y++) for (let X = x - 7; X <= x + 7; X++) { const top = y < LAND - 58; g.px(X, y, X === x - 7 || X === x + 7 ? WALL_B.edge : top ? (X < x ? WALL_B.lit : WALL_B.base) : X < x - 3 ? WALL_B.base : X > x + 3 ? WALL_B.dark : WALL_B.shade); }
  for (let X = x - 9; X <= x + 9; X++) { g.px(X, LAND - 66, WALL_B.edge); g.px(X, LAND - 65, X < x ? WALL_B.lit : WALL_B.base); }
  for (let y = LAND - 22; y < LAND + 2; y++) for (let X = x + 7; X < x + 16; X++) g.px(X, y, y === LAND - 22 ? WALL_B.lit : X === x + 15 ? WALL_B.edge : WALL_B.shade);
}
function tiles(g, x0, x1, yTop, yBot, slopeL, slopeR) {
  // terracotta tile roof: rows of scalloped tiles between a slanted left/right edge, a ridge cap on top
  for (let y = yTop; y <= yBot; y++) {
    const k = (y - yTop) / Math.max(1, yBot - yTop), xa = R(x0 + slopeL * (1 - k)), xb = R(x1 - slopeR * (1 - k)), row = Math.floor((y - yTop) / 6), ry = (y - yTop) % 6;
    for (let x = xa; x <= xb; x++) {
      const tx = (x + (row & 1) * 4) % 8, scal = ry === 5 || (ry === 4 && (tx === 0 || tx === 7));
      let col = scal ? ROOF[1] : tx === 1 && ry < 4 ? ROOF[5] : ry < 2 ? ROOF[4] : ROOF[3];
      if (x === xa || x === xb) col = ROOF[0]; if (y === yBot) col = ROOF[1];
      if (k < 0.12 && !scal) col = mix(col, "#F8A070", 0.18);
      g.px(x, y, col);
    }
  }
  for (let x = R(x0 + slopeL) - 1; x <= R(x1 - slopeR) + 1; x++) { g.px(x, yTop - 1, ROOF[0]); g.px(x, yTop, ROOF[6]); g.px(x, yTop + 1, ROOF[4]); }
}
function cottage(g, o) {
  const { x0, x1, wallTop, peak, W: Wc } = o;
  // plaster wall with a soft texture, darker toward the ground, shadow under the eaves, corner trims
  for (let y = wallTop; y < LAND + 2; y++) for (let x = x0; x <= x1; x++) {
    const dy = (y - wallTop) / (LAND - wallTop), n = rnd(x * 7 + y * 131);
    let col = dy < 0.06 ? Wc.dark : dy < 0.5 ? Wc.base : dy < 0.8 ? (bayer(x, y) < (dy - 0.5) * 2 ? Wc.shade : Wc.base) : Wc.shade;
    if (x - x0 < 5) col = x - x0 < 2 ? Wc.edge : Wc.lit; else if (x1 - x < 4) col = x1 - x < 1 ? Wc.edge : Wc.dark;
    if (n < 0.05 && dy > 0.08) col = mix(col, Wc.dark, 0.4); else if (n > 0.97 && dy > 0.08) col = mix(col, Wc.lit, 0.5);
    if (y > LAND - 6) col = mix(col, Wc.edge, 0.35);
    g.px(x, y, col);
  }
  // hip roof with overhangs
  tiles(g, x0 - 9, x1 + 9, peak, wallTop + 2, (x1 - x0) * 0.36, (x1 - x0) * 0.36);
  for (let x = x0 - 9; x <= x1 + 9; x++) { g.px(x, wallTop + 3, ROOF[0]); g.px(x, wallTop + 4, Wc.edge); }
  if (o.chimney) { const cx = o.chimney, top = peak + 12; for (let y = top - 18; y < top + 12; y++) for (let x = cx; x < cx + 12; x++) g.px(x, y, y < top - 15 ? ROOF[0] : x === cx ? Wc.lit : x > cx + 9 ? Wc.dark : Wc.base); for (let x = cx - 2; x < cx + 14; x++) { g.px(x, top - 19, ROOF[0]); g.px(x, top - 18, WOOD[3]); } }
  for (const [wx, wy, ww, wh] of o.win) window_(g, wx, wy, ww, wh);
  if (o.door) {
    const [d0, d1] = o.door, top = LAND - 54;
    for (let y = top - 6; y < LAND + 1; y++) for (let x = d0 - 2; x <= d1 + 2; x++) {
      const arch = y < top + 8 ? Math.abs(x - (d0 + d1) / 2) > Math.sqrt(Math.max(0, 1 - ((top + 8 - y) / 14) ** 2)) * ((d1 - d0) / 2 + 2) : false; if (arch) continue;
      const frame = x < d0 || x > d1 || y < top - 4; let col = frame ? Wc.edge : ((x - d0) % 7 === 0 ? WOOD[1] : x - d0 < 3 ? WOOD[4] : WOOD[3]);
      if (!frame && (y - top) % 18 === 9) col = WOOD[1];
      g.px(x, y, col);
    }
    g.rect(d1 - 6, LAND - 28, 3, 3, "#E8B84A"); g.px(d1 - 6, LAND - 28, "#FFF0A0");
    for (let x = d0 - 6; x <= d1 + 6; x++) { g.px(x, LAND, STONE[1]); g.px(x, LAND - 1, STONE[4]); g.px(x, LAND + 1, STONE[2]); }
    // flower pots by the door
    for (const [px, col] of [[d0 - 14, "#F06A8A"], [d1 + 10, "#F8C850"]]) { for (let y = LAND - 10; y < LAND + 1; y++) for (let x = px - 5 + R((y - LAND + 10) * 0.2); x <= px + 5 - R((y - LAND + 10) * 0.2); x++) g.px(x, y, y === LAND - 10 ? "#E08A60" : x < px - 2 ? "#C8603E" : "#A84A34"); leafBall(g, px, LAND - 15, 6, LEAF.slice(2), px, { amp: 0.2, bumps: 5 }); for (let i = 0; i < 4; i++) { g.px(px - 4 + i * 3, LAND - 18 + (i % 2) * 3, col); g.px(px - 4 + i * 3 + 1, LAND - 18 + (i % 2) * 3, col); g.px(px - 4 + i * 3, LAND - 17 + (i % 2) * 3, "#FFF0F4"); } }
  }
  if (o.awning) {
    // a small striped cloth awning over the window
    const [wx, wy, ww] = o.win[0];
    for (let j = 0; j < 9; j++) for (let x = wx - 6 - j * 0.3; x <= wx + ww + 6 + j * 0.3; x++) g.px(R(x), wy - 14 + j, j === 8 ? "#5A1E2C" : (Math.floor((x - wx + 6) / 6) % 2 ? "#F4E2C8" : "#C83A3E"));
    for (let x = wx - 8; x <= wx + ww + 8; x += 4) { g.px(x, wy - 5, "#C83A3E"); g.px(x + 1, wy - 5, "#5A1E2C"); }
  }
}
function window_(g, wx, wy, ww, wh) {
  // warm lit window with wooden frame, cross mullion, open shutters and a flower box
  for (let y = wy - 2; y < wy + wh + 2; y++) for (let x = wx - 2; x < wx + ww + 2; x++) {
    const fr = x < wx || x >= wx + ww || y < wy || y >= wy + wh, mull = x === wx + (ww >> 1) || y === wy + (wh >> 1) - 2;
    const d = Math.hypot((x - wx - ww / 2) / ww, (y - wy - wh * 0.45) / wh) * 2;
    g.px(x, y, fr ? WOOD[1] : mull ? WOOD[2] : d < 0.45 ? WIN[0] : d < 0.85 ? (bayer(x, y) < 0.5 ? WIN[1] : WIN[0]) : d < 1.15 ? WIN[1] : WIN[2]);
  }
  for (const s of [-1, 1]) { const sx = s < 0 ? wx - 12 : wx + ww + 2; for (let y = wy - 2; y < wy + wh + 2; y++) for (let x = sx; x < sx + 10; x++) g.px(x, y, x === sx || x === sx + 9 || y === wy - 2 || y === wy + wh + 1 ? "#1E2A3A" : (y - wy) % 5 === 0 ? "#2E4660" : "#3E6080"); }
  for (let y = wy + wh + 2; y < wy + wh + 8; y++) for (let x = wx - 4; x < wx + ww + 4; x++) g.px(x, y, y === wy + wh + 2 ? WOOD[4] : WOOD[2]);
  for (let i = 0; i < ww / 4 + 2; i++) { const x = wx - 3 + i * 4, y = wy + wh + 1; g.px(x, y, i % 2 ? "#F06A8A" : "#FFE0A0"); g.px(x + 1, y, "#4E884C"); g.px(x, y - 1, i % 2 ? "#FF9AB0" : "#FFF4C8"); }
}
function well(g, x) {
  // round stone well: a stone drum with a lit rim, two wooden posts, a little tiled roof, a crank and a bucket
  const by = LAND + 10, top = LAND - 34, rx = 30;
  for (let y = top; y <= by; y++) for (let X = x - rx; X <= x + rx; X++) {
    const u = (X - x) / rx, row = Math.floor((y - top) / 7), off = (row & 1) * 6, brick = (y - top) % 7 === 0 || (X - x + 60 + off) % 12 === 0;
    let col = brick ? STONE[1] : u < -0.55 ? STONE[4] : u < 0.2 ? STONE[3] : u < 0.7 ? STONE[2] : STONE[1];
    if (Math.abs(u) > 0.96) col = STONE[0]; if (y > by - 3) col = STONE[0];
    g.px(X, y, col);
  }
  for (let X = x - rx - 2; X <= x + rx + 2; X++) { const k = Math.abs(X - x) / (rx + 2); for (let j = -3; j <= 3; j++) { const yy = top + R(j * Math.sqrt(Math.max(0, 1 - k * k))) ; g.px(X, yy, j <= -2 || Math.abs(k) > 0.97 ? STONE[0] : j < 0 ? STONE[5] : "#1A1222"); } }
  for (const s of [-1, 1]) for (let y = top - 62; y < top + 2; y++) for (let X = x + s * 24 - 2; X <= x + s * 24 + 2; X++) g.px(X, y, X === x + s * 24 - 2 ? WOOD[4] : X === x + s * 24 + 2 ? WOOD[0] : WOOD[3]);
  for (let X = x - 22; X <= x + 22; X++) { g.px(X, top - 40, WOOD[1]); g.px(X, top - 39, WOOD[3]); g.px(X, top - 38, WOOD[2]); }
  for (let y = top - 37; y < top - 14; y++) g.px(x + 2, y, "#C8A880");
  for (let y = top - 14; y < top - 4; y++) for (let X = x - 4; X <= x + 8; X++) g.px(X, y, X === x - 4 || X === x + 8 ? WOOD[0] : y === top - 14 ? "#8A8AA0" : WOOD[3]);
  g.rect(x + 24, top - 42, 8, 2, WOOD[1]); g.rect(x + 30, top - 42, 2, 8, WOOD[1]);
  tiles(g, x - 34, x + 34, top - 82, top - 62, 26, 26);
}
function banana(g, x, y, h, ang, seed) {
  // a big banana leaf: a curved midrib with a wide, slightly torn blade on both sides
  const pts = [];
  for (let i = 0; i <= 40; i++) { const k = i / 40, a = ang + k * 0.9 * (ang < 0 ? -0.6 : 0.6); pts.push([x + Math.sin(a) * h * k + (ang < 0 ? -1 : 1) * k * k * h * 0.35, y - Math.cos(a) * h * k * 0.9 + k * k * h * 0.25]); }
  for (let i = 3; i < pts.length - 1; i++) {
    const [px, py] = pts[i], [qx, qy] = pts[i + 1], dx = qx - px, dy = qy - py, n = Math.hypot(dx, dy) || 1, nx = -dy / n, ny = dx / n, k = i / 40;
    const w = h * 0.2 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (rnd(seed * 31 + (i >> 2)) < 0.15 ? 0.45 : 1);
    for (const sd of [-1, 1]) for (let s = 0; s <= w; s += 0.7) { const X = R(px + nx * s * sd), Y = R(py + ny * s * sd + s * 0.25), edge = s > w - 1; g.px(X, Y, edge ? LEAF[1] : sd < 0 ? (s < w * 0.5 ? LEAF[6] : LEAF[5]) : s < w * 0.5 ? LEAF[4] : LEAF[3]); }
    g.px(R(px), R(py), LEAF[7]);
  }
}
function tuftF(f, x, y, h, n, seed) {
  for (let i = 0; i < n; i++) { const bx = x + (i - (n - 1) / 2) * 2, bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5; for (let j = 0; j <= bh; j++) { const k = j / bh; f.px(R(bx + lean * k * k), R(y - j), j > bh * 0.7 ? "#7A9A5A" : i % 2 ? "#3E5A3A" : "#4E6E42"); } }
}
function flowerF(f, x, y, i) {
  for (let j = 0; j < 10; j++) f.px(x, y + j, "#3E5A3A");
  const col = ["#F8C850", "#FFFFFF", "#F06A8A"][i % 3];
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { f.px(x + dx * 2, y + dy * 2, col); f.px(x + dx, y + dy, col); }
  f.px(x, y, "#F8A040");
}

// ---------------------------------------------------------------- the dog's mood over time
const k01 = (t, [a, b]) => ease(clamp01((t - a) / (b - a)));
const win4 = (t, q) => Math.min(sm(t, q[0], q[1]), 1 - sm(t, q[2], q[3]));
const wagRate = (t) => (1 + 1.4 * win4(t, T.wag) + 1.6 * win4(t, T.wag2)) * (1 - 0.7 * k01(t, T.worry) * (1 - k01(t, T.calm)));
/** Integrated wag phase (cycles of the base rate): the tail speeds up and slows down without jumping. */
function wagPhase(t) { const t0 = T.wag[0] - 1, dt = 1 / 240; if (t <= t0) return t; let p = t0, s = t0; while (s + dt <= t) { p += wagRate(s + dt / 2) * dt; s += dt; } return p + wagRate((s + t) / 2) * (t - s); }
export function mood(t) {
  const tilt = 0.13 * win4(t, T.tilt), wag = wagRate(t);
  const worry = k01(t, T.worry) * (1 - k01(t, T.calm)), happy = win4(t, T.happy), grin = win4(t, T.grin);
  const germLook = worry > 0.01 ? worry : 0;
  const look = [lerp(0, -1, germLook), lerp(0, 0.4, germLook)];
  return { tilt: tilt - 0.08 * germLook, wag, wagPh: wagPhase(t), worry, happy, grin, look, earPerk: win4(t, T.tilt) * 0.8 + happy * 0.6, open: 0.7, blink: blinks(t, T.blinks) * (1 - happy) };
}

// ---------------------------------------------------------------- module interface
const off = (V) => X1 + 60 < V.x0 || X0 - 60 > V.x1;
export function back(c, V, t) {
  if (off(V)) return; if (!BACK) build(); BACK.blit(c, V);
  // glows: lit windows, the lantern, string lights (screen space, cheap tints) and chimney smoke
  for (const [wx, wy, ww, wh] of [[2738, LAND - 132, 30, 34], [3170, LAND - 128, 28, 30]]) glow(c, V.X(wx + ww / 2), V.Y(wy + wh / 2), 34, "#FFC870", 0.28 + 0.03 * Math.sin(t * 3 + wx), 1.4, 4);
  smoke(c, V, t, 2754, LAND - 254);
}
export function actors(c, V, t) {
  if (off(V)) return; if (!BACK) build();
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND + 6)), "LV 6", "wood");
  lantern(c, V, t); lights(c, V, t);
  const m = mood(t), x = R(V.X(DX)), y = R(V.Y(DHY));
  if (x > -200 && x < 740) drawDog(c, x, y, t, m);
  fireflies(c, V, t);
}
export function front(c, V, t) { if (off(V)) return; if (!FRONT) build(); FRONT.blit(c, V); }
export function hud(c, V, t) {
  if (off(V)) return;
  const mx = V.X(DX), my = V.Y(DHY + 30);
  cross(c, mx, my, t);
  germ(c, V, t);
  syringe(c, V, t);
  // the heart and +VACCINE when the vaccine wins
  const hk = (t - T.heart[0]) / (T.heart[1] - T.heart[0]);
  if (hk > 0 && hk < 1) heart(c, V.X(DX + 74), V.Y(DHY - 70) - 26 * ease(hk), Math.min(sm(hk, 0, 0.15), 1 - sm(hk, 0.7, 1)), 1 + 0.25 * Math.sin(Math.PI * Math.min(1, hk * 4)));
  const pk = (t - T.pickup[0]) / (T.pickup[1] - T.pickup[0]);
  pickup(c, R(V.X(DX)), R(V.Y(DHY - 162)), "+VACCINE", pk, C.GR);
}

// ---------------------------------------------------------------- dynamic props
function lantern(c, V, t) {
  const [lx, ly] = LANTERN, x = R(V.X(lx)), y = R(V.Y(ly)), sw = Math.sin(t * 1.6) * 1.2, fl = 0.8 + 0.2 * Math.sin(t * 13) * Math.sin(t * 5.3);
  if (x < -40 || x > 580) return;
  glow(c, x + sw, y + 10, 30, "#FFC060", 0.42 * fl, 1.5, 4);
  c.rect(x - 8, y - 6, 12, 2, WOOD[1]); c.rect(x - 8, y - 6, 2, 6, WOOD[1]);              // wall bracket
  const bx = R(x + sw * 0.4);
  c.line(bx, y - 4, bx, y, "#2A1A22");
  c.rect(bx - 5, y, 11, 2, "#2A1A22"); c.rect(bx - 4, y + 2, 9, 12, "#2A1A22"); c.rect(bx - 3, y + 3, 7, 10, mix(WIN[1], WIN[0], fl - 0.6));
  c.rect(bx - 1, y + 6, 3, 5, WIN[0]); c.px(bx, y + 7 + R(Math.sin(t * 11)), "#FFFFFF"); c.rect(bx - 5, y + 14, 11, 2, "#2A1A22");
  // a moth circling the lantern
  const ma = t * 3.1, mx = R(bx + Math.cos(ma) * 14), my = R(y + 8 + Math.sin(ma * 1.3) * 9), fl2 = Math.sin(t * 40) > 0;
  c.px(mx, my, "#E8DCC8"); c.px(mx + (fl2 ? 1 : -1), my - 1, "#C8BCA8"); c.px(mx - (fl2 ? 1 : -1), my - 1, "#C8BCA8");
}
function lights(c, V, t) {
  // string lights along the peach cottage's eave and on to a pole into the jungle (bulbs twinkle slowly)
  const spans = [[[3104, LAND - 158], [3150, LAND - 150], 5], [[3150, LAND - 150], [3200, LAND - 158], 5], [[3200, LAND - 158], [3252, LAND - 176], 7], [[2722, LAND - 166], [2846, LAND - 166], 4]];
  const cols = ["#FFD86A", "#FF8A7A", "#8AE0FF", "#B8F08A", "#FFB0E0"];
  let n = 0;
  for (const [[ax, ay], [bx, by], sag] of spans) {
    const X0s = V.X(ax), Y0s = V.Y(ay), X1s = V.X(bx), Y1s = V.Y(by); if (Math.max(X0s, X1s) < -10 || Math.min(X0s, X1s) > 550) { n += 6; continue; }
    const pts = []; for (let i = 0; i <= 24; i++) { const k = i / 24; pts.push([lerp(X0s, X1s, k), lerp(Y0s, Y1s, k) + sag * 4 * k * (1 - k) + Math.sin(t * 1.2 + ax) * k * (1 - k) * 1.5]); }
    for (let i = 0; i < 24; i++) c.line(R(pts[i][0]), R(pts[i][1]), R(pts[i + 1][0]), R(pts[i + 1][1]), "#2A1A2A");
    for (let i = 2; i < 24; i += 4) {
      const [px, py] = pts[i], col = cols[n % cols.length], tw = 0.75 + 0.25 * Math.sin(t * 2.2 + n * 1.7); n++;
      glow(c, px, py + 3, 7, col, 0.3 * tw, 1.4, 3);
      c.px(R(px), R(py) + 1, "#2A1A2A"); c.rect(R(px) - 1, R(py) + 2, 3, 3, mix(col, "#FFFFFF", 0.3 * tw)); c.px(R(px), R(py) + 3, "#FFFFFF");
    }
  }
}
function smoke(c, V, t, wx, wy) {
  // soft chimney smoke: puffs rise, drift left with the evening breeze and dissolve (continuous loop of 6 puffs)
  for (let i = 0; i < 6; i++) {
    const p = ((t * 0.32 + i / 6) % 1 + 1) % 1, x = V.X(wx - p * 26 + Math.sin(p * 6 + i) * 3), y = V.Y(wy - p * 70), r = 3 + p * 7, a = 0.55 * Math.sin(Math.PI * p);
    if (x < -20 || x > 560) continue; const g = fade(c, a);
    for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X = R(x - r); X <= R(x + r); X++) { const d = ((X - x) ** 2 + (Y - y) ** 2) / (r * r); if (d <= 1 && ((X + Y) & 1) === 0) g.px(X, Y, d < 0.5 ? "#C8A8C0" : "#A888A8"); }
  }
}
function fireflies(c, V, t) {
  // a few fireflies near the jungle edge (the next level), blinking slowly
  for (let i = 0; i < 7; i++) {
    const wx = 3150 + rnd(i * 3) * 100 + Math.sin(t * 0.7 + i * 2) * 12, wy = LAND - 30 - rnd(i * 7) * 120 + Math.sin(t * 1.1 + i) * 8, x = R(V.X(wx)), y = R(V.Y(wy));
    const b = Math.max(0, Math.sin(t * 1.7 + i * 2.3)); if (b < 0.15 || x < 0 || x > 539) continue;
    glow(c, x, y, 5, "#E8FF8A", 0.35 * b, 1.2, 3); c.px(x, y, b > 0.6 ? "#FFFFC8" : "#D8F070");
  }
}
function cross(c, mx, my, t) {
  // "not with their teeth": a red pixel ✕ pops over the grin (overshoot), holds, then dissolves
  const pk = clamp01((t - T.cross.pop[0]) / (T.cross.pop[1] - T.cross.pop[0])), a = (t > T.cross.pop[0] ? 1 : 0) * (1 - sm(t, T.cross.out[0], T.cross.out[1]));
  if (a <= 0 || pk <= 0) return;
  const s = (0.3 + 0.7 * ease(pk) + 0.25 * Math.sin(Math.PI * pk)) * 22, g = fade(c, a * Math.min(1, pk * 3));
  for (const [lw, col] of [[8, C.O], [5.6, "#FF3A4A"], [1.6, "#FFA0A8"]]) for (const sd of [-1, 1]) for (let i = -s; i <= s; i += 0.5) { const X = mx + i, Y = my + i * sd; for (let k = -lw / 2; k <= lw / 2; k += 0.5) g.px(R(X + k * 0.7), R(Y - k * 0.7 * sd), col); }
}
function germPos(V, t) {
  const hop = Math.sin(Math.PI * clamp01((t - T.hop[0]) / (T.hop[1] - T.hop[0]))), zap = clamp01((t - T.syringe.poke[0]) / (T.syringe.poke[1] - T.syringe.poke[0]));
  return [V.X(GERM[0]) + Math.sin(t * 2.3) * 3 + zap * Math.sin(t * 60) * 1.5, V.Y(GERM[1]) + Math.sin(t * 3.1) * 3 - hop * 12];
}
function germ(c, V, t) {
  // a cute-but-mean rabies germ: green ball with stubby spikes, angry brows, a toothy frown; RABIES tag above it
  const ain = sm(t, T.germ[0], T.germ[1]), popk = clamp01((t - T.pop[0]) / (T.pop[1] - T.pop[0])), a = ain * (1 - popk);
  const [x, y] = germPos(V, t);
  if (a > 0) {
    const pulse = Math.sin(Math.PI * clamp01((t - T.pulse[0]) / (T.pulse[1] - T.pulse[0]))), squash = clamp01((t - T.syringe.poke[0]) / 0.1) * (1 - popk);
    const r = 20 * (0.7 + 0.3 * ain) * (1 + 0.18 * pulse + 0.4 * popk) * (1 - squash * 0.08);
    const GR = ["#0E2A10", "#1C4A1A", "#2E6E24", "#44922E", "#62B03A", "#86CC4A", "#AAE070", "#D2F4A0"];
    const spikes = []; for (let i = 0; i < 9; i++) { const an = (i / 9) * Math.PI * 2 + t * 0.6, p0 = [x + Math.cos(an) * r * 0.8, y + Math.sin(an) * r * 0.8], p1 = [x + Math.cos(an) * (r + 9), y + Math.sin(an) * (r + 9)]; spikes.push(tube([p0, p1], 4, 2.8)); spikes.push(ell(p1[0], p1[1], 4.4, 4.4)); }
    blob(c, spikes, { ramp: GR, thick: 2, base: 4.2, gain: 1.2, outline: "#0A1A0C", litOutline: "#C8F08A", a });
    blob(c, [ell(x, y, r, r * 0.94)], { ramp: GR, thick: 11, base: 3.0, gain: 2.6, outline: "#0A1A0C", litOutline: "#C8F08A", a });
    const g = fade(c, a);
    for (const [dx, dy] of [[-12, -9], [12, 8], [-11, 9], [13, -8]]) { g.px(R(x + dx), R(y + dy), "#2E6E24"); g.px(R(x + dx + 1), R(y + dy), "#2E6E24"); g.px(R(x + dx), R(y + dy + 1), "#2E6E24"); }
    for (const s of [-1, 1]) {
      // white eyes with pupils glancing toward the dog, angry brows slanting down to the middle
      const ex = R(x + s * 7), ey = R(y - 2);
      for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = i * i + j * j; if (d <= 18) g.px(ex + i, ey + j, d > 11 ? "#0A1A0C" : "#FFFFFF"); }
      g.rect(ex + 1, ey - 1, 2, 3, "#0A1A0C"); g.px(ex - 2, ey - 2, "#FFFFFF");
      for (let i = 0; i < 9; i++) { const bx = R(x + s * (2 + i)), by = R(y - 12 + i * 0.6); g.px(bx, by, "#0A1A0C"); g.px(bx, by - 1, "#0A1A0C"); }
    }
    for (let i = -7; i <= 7; i++) { const yy = R(y + 10 - Math.cos((i / 7) * 1.2) * 3); g.px(R(x + i), yy, "#0A1A0C"); g.px(R(x + i), yy + 1, i % 3 === 0 && Math.abs(i) < 7 ? "#FFFFFF" : "#0A1A0C"); }
    const ta = Math.min(sm(t, T.tag[0], T.tag[1]), 1 - sm(t, T.pop[0], T.pop[1] + 0.12));
    if (ta > 0) tag(c, ["RABIES"], R(V.X(GERM[0]) - 10), R(V.Y(GERM[1]) - 76) + R((1 - ta) * 5), ta, "#86E04A", 2);   // steady (does not bob with the germ)
  }
  // the pop: a ring of sparkles flying out and dissolving
  const sk = (t - T.sparkles[0]) / (T.sparkles[1] - T.sparkles[0]);
  if (sk > 0 && sk < 1) for (let i = 0; i < 12; i++) { const an = (i / 12) * Math.PI * 2 + 0.3, d = 8 + 40 * ease(sk) * (0.7 + rnd(i) * 0.5); sparkle(c, x + Math.cos(an) * d, y + Math.sin(an) * d, 5 * Math.sin(Math.PI * sk) + 0.6, i % 2 ? "#B8F08A" : "#FFF4A0", 1 - sm(sk, 0.6, 1)); }
}
function syringe(c, V, t) {
  // a cute syringe zips in from the left (needle first), pushes its plunger (zap), then zips back out and dissolves
  const S = T.syringe; if (t < S.in[0] || t > S.out[1]) return;
  const kin = ease(clamp01((t - S.in[0]) / (S.in[1] - S.in[0]))), kout = clamp01((t - S.out[0]) / (S.out[1] - S.out[0])), poke = clamp01((t - S.poke[0]) / (S.poke[1] - S.poke[0]));
  const [gx, gy] = germPos(V, t), x = R(lerp(-40, gx - 20, kin) + Math.sin(Math.PI * poke) * 8 - ease(kout) * 80), y = R(gy + 1), a = 1 - sm(kout, 0.15, 1);
  const g = fade(c, a), NL = 24, BL = 66, BH = 13;                      // needle length, barrel length, barrel half-height
  // needle (bright tip) and its hub
  for (let i = 0; i < NL; i++) { g.px(x - i, y - 1, i < 3 ? "#FFFFFF" : "#E4EAF4"); g.px(x - i, y, "#A8B2C8"); g.px(x - i, y + 1, i < 2 ? null : "#6A7490"); }
  for (let Y = y - 4; Y <= y + 5; Y++) for (let X = x - NL - 6; X < x - NL; X++) g.px(X, Y, Y === y - 4 || Y === y + 5 || X === x - NL - 6 ? "#2A2A44" : Y < y ? "#E8EEF8" : "#B8C0D8");
  // barrel with the vaccine (level drops while the plunger pushes), scale ticks, a glossy stripe
  const bx = x - NL - 6 - BL, liquid = R(lerp(BL - 10, 10, poke));
  for (let Y = y - BH; Y <= y + BH; Y++) for (let X = bx; X < bx + BL; X++) {
    const edge = Y === y - BH || Y === y + BH || X === bx || X === bx + BL - 1, inLiq = X > bx + BL - 1 - liquid;
    let col = edge ? "#2A2A44" : Y < y - BH + 4 ? "#FFFFFF" : inLiq ? (Y < y - BH + 7 ? "#B8F6FF" : Y > y + BH - 4 ? "#2EA8D0" : "#5AD0F0") : "#E2ECF8";
    if (!edge && (X - bx) % 9 === 0 && Y < y - 2) col = "#6A7A98";
    g.px(X, Y, col);
  }
  if (liquid > 6) for (let k = 0; k < 3; k++) { const bxx = R(bx + BL - 8 - ((t * 40 + k * 17) % Math.max(4, liquid - 6))), byy = y + 4 - k * 3; g.px(bxx, byy, "#E8FCFF"); }
  // finger flange and plunger
  for (let Y = y - BH - 6; Y <= y + BH + 6; Y++) for (let X = bx - 5; X < bx; X++) g.px(X, Y, X === bx - 5 || Y === y - BH - 6 || Y === y + BH + 6 ? "#2A2A44" : "#F0F4FC");
  const rodL = R(lerp(BL - 6, 8, poke));
  for (let X = bx - 5 - rodL; X < bx - 5; X++) { g.px(X, y - 1, "#2A2A44"); g.px(X, y, "#C8D0E0"); g.px(X, y + 1, "#C8D0E0"); g.px(X, y + 2, "#2A2A44"); }
  for (let Y = y - 10; Y <= y + 11; Y++) for (let X = bx - 11 - rodL; X < bx - 5 - rodL; X++) g.px(X, Y, X === bx - 11 - rodL || X === bx - 6 - rodL || Y === y - 10 || Y === y + 11 ? "#2A2A44" : "#FF8AA8");
  // the zap: a white-yellow burst at the needle tip with little lightning ticks
  if (poke > 0 && kout === 0) { const zk = Math.sin(Math.PI * poke); sparkle(c, x + 2, y, 13 * zk, "#FFF07A", 1, "#FFFFFF"); for (let i = 0; i < 8; i++) { const an = i * 0.785 + t * 8, d = 10 + 12 * zk, q = fade(c, zk); q.px(R(x + 2 + Math.cos(an) * d), R(y + Math.sin(an) * d), "#FFF4A0"); q.px(R(x + 2 + Math.cos(an) * (d + 3)), R(y + Math.sin(an) * (d + 3)), "#FFE060"); } }
}
function heart(c, x, y, a, s = 1) {
  if (a <= 0) return; const g = fade(c, a), rows = [".XX.XX.", "XWXXXXX", "XWXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], k = Math.max(1, R(3 * s));
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; const X = R(x - 3.5 * k + i * k), Y = R(y - 3.5 * k + j * k); g.rect(X - 1, Y - 1, k + 2, k + 2, C.O); }));
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; g.rect(R(x - 3.5 * k + i * k), R(y - 3.5 * k + j * k), k, k, ch === "W" ? "#FFD0DC" : "#F0406A"); }));
}

/** Readout / guess-card portrait (~56×56): the village dog's head. */
export function ICON(c, cx, cy, a = 1) { dogIcon(c, cx, cy, a); }
