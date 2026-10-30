// LV4 · HOUSE YARD (cat) — RANGE BIOME.yard = 1620..2160, afternoon (tod ≈ 2.9).
// A cosy backyard in side view: the back of a cottage on the left (cream siding, terracotta gable, a window with a
// geranium box and gingham curtains, a teal back door with a lamp and a step, a downpipe), a honey-wood board fence
// with a tulip bed along its foot, a neighbour's tree and a lilac bush peeking over it, a striped lawn to the bottom
// edge with stepping stones, a ball of yarn and a geranium pot. At x 1620 the cottage corner meets the running
// stadium's edge; at x 2160 the fence ends with a post where the racecourse's white rail begins (ground line LAND).
// THE CAT: the orange tabby of «How your cat drinks» — front-on chibi rig (yard-catfront.mjs) for sitting/crouching/
// proud, and the side-view rig of the same tabby (yard-catside.mjs, from the zoomies film) for the sprint.
// "Your cat can sprint at about forty-eight": the tabby sits facing the camera under the sun, tail flicking; a wind-up
// toy mouse trailing its string zips in behind its paws, the cat tracks it, crouches, butt wiggles; on "sprint" it
// explodes (dust poof) into a zoomies lap round the lawn (squash-and-stretch gallop, speed lines, dust trail, a blur
// trail), knocks the yarn ball rolling, catches up with the mouse and skids to a stop back at the centre on
// "forty-eight", the mouse pinned under its paw; then it sits front-on, proud, fur puffed by the wind, settling.
import { BIOME, LAND, EV, LV } from "../timeline.mjs";
import { blob, ell, bez, tube, sign, RAMP, fade, mix, bayer, sm, ease, lerp, rnd, clamp01, blinkAt, win } from "../cute.mjs";
import { Layer, worldLayer, thick, pline, leaf, hex } from "./jungle-kit.mjs";
import { gate } from "./yard-gate.mjs";
import { drawTabby, drawTabbyPaw, tabbyIcon, warmTabby } from "./yard-catfront.mjs";
import { drawCat, runStride } from "./yard-catside.mjs";
import { MOUSE_IN, MOUSE_WAIT, CROUCH, WIGGLE, LAUNCH, SKID_END, RUN, SKID, MOUSE_RUN, PROUD, SETTLE, HAPPY, TURNS, LOOP, loopAt, catTheta, CAT_TH0, mouseAt, SKID_SHIFT } from "./yard-time.mjs";

export const RANGE = BIOME.yard;
const R = Math.round, [X0, X1] = RANGE;
// rest camera (1890, −180): screen = (wx − 1620, wy + 660). Art is authored in rest-screen coordinates.
const WX = (sx) => sx + X0, WY = (sy) => sy - 660, GY = 640;
const S = 1.0;                                    // front-on tabby scale (head centre ≈ 418, sun halo between the ears)

// ---------------------------------------------------------------- palettes (warm afternoon)
const SIDING = ["#4A3A2A", "#7A6448", "#B09470", "#D4B88C", "#E8D0A4", "#F4E2BA", "#FAEED2"];
const TRIM = ["#8A8070", "#C8BCA8", "#EEE6D6", "#FFF8EA"];
const ROOF = ["#3A140C", "#6A2618", "#963A24", "#BC5030", "#D86A40", "#EC8A5A", "#F6AC80"];
const WOOD = ["#3A2414", "#5E3C22", "#86582E", "#A8743E", "#C4925A", "#DCB07A", "#EECA98"];
const LAWN = ["#24501A", "#2E6220", "#3A7626", "#468A2E", "#539C36", "#62AE40", "#76C04E", "#90D262"];
const LEAF = ["#0E2A14", "#16401C", "#205824", "#2C7230", "#3C8C3A", "#54A444", "#72BC56", "#98D474"];
const DOOR = ["#123A3E", "#1A5458", "#246E70", "#2E8A8A", "#40A4A0", "#62BCB4", "#8ED4C8"];
const STONE = ["#3A3A3E", "#55555A", "#707074", "#8C8C8E", "#A8A6A4", "#C4C0BA", "#DCD8D0"];
const POT = ["#4A1C0E", "#7A3218", "#A84A26", "#C86434", "#E08048", "#F0A068"];

// ---------------------------------------------------------------- static layers (painted once)
const LW = 540 + 80, LH = 960, P = (sx, sy) => [sx + 40, sy];
function rectP(g, x, y, w, h, col) { const [px, py] = P(x, y); g.rect(R(px), R(py), R(w), R(h), col); }
function geranium(g, sx, sy, s = 1) {
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i - 2) * 0.55; leaf(g, ...P(sx + Math.cos(a) * 3, sy), 9 * s, 4 * s, a, LEAF, { vein: false }); }
  for (const [dx, dy] of [[-5, -9], [3, -11], [7, -6], [-1, -14]]) { const [x, y] = P(sx + dx * s, sy + dy * s); for (const [ox, oy] of [[0, 0], [2, 0], [1, -1], [1, 1], [-1, 1], [3, 1]]) g.px(x + ox, y + oy, (ox + oy) % 2 ? "#E8384A" : "#C82038"); g.px(x + 1, y, "#FF8A8A"); }
}
function tulip(g, sx, sy, h, col) {
  pline(g, [P(sx, sy), P(sx + 0.5, sy - h)], "#3C8C3A"); leaf(g, ...P(sx, sy - 2), h * 0.55, 2.5, -1.9, LEAF, { vein: false });
  const [x, y] = P(sx, sy - h); g.rect(x - 2, y - 5, 5, 5, col); g.px(x - 2, y - 6, col); g.px(x + 2, y - 6, col); g.px(x, y - 6, col); g.px(x - 1, y - 4, mix(col, "#FFFFFF", 0.4)); g.rect(x - 2, y - 1, 5, 1, mix(col, "#000000", 0.25));
}
function daisy(g, sx, sy, h) { pline(g, [P(sx, sy), P(sx, sy - h)], "#3C8C3A"); const [x, y] = P(sx, sy - h); for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1]]) g.px(x + dx, y + dy, "#FFFFFF"); g.px(x, y, "#F4C83A"); }
function paintBack(g, layer) {
  // --- neighbour's tree and a lilac bush behind the fence (clear of the sun disc)
  for (let sy = 420; sy < 520; sy++) for (let x = -5; x <= 5; x++) { const [px, py] = P(474 + x, sy); g.px(px, py, x < -1 ? WOOD[2] : WOOD[1]); }
  blob(g, [ell(...P(478, 400), 70, 58), ell(...P(420, 440), 40, 32), ell(...P(536, 430), 44, 40), ell(...P(470, 350), 46, 36)], { ramp: LEAF, thick: 34, base: 2.8, gain: 2.4, outline: LEAF[0], litOutline: "#C8F08A" });
  for (let i = 0; i < 40; i++) { const a = rnd(i * 3) * Math.PI * 2, d = 20 + rnd(i * 5) * 52, [x, y] = P(478 + Math.cos(a) * d * 1.1, 400 + Math.sin(a) * d * 0.8); if (layer.has(x, y)) { g.px(x, y, LEAF[6]); g.px(x + 1, y, LEAF[5]); g.px(x, y + 1, LEAF[4]); } }
  blob(g, [ell(...P(332, 498), 34, 22), ell(...P(300, 506), 22, 16), ell(...P(362, 504), 22, 16)], { ramp: LEAF, thick: 14, base: 3.0, gain: 2.0, outline: LEAF[0], litOutline: "#C8F08A" });
  for (let i = 0; i < 26; i++) { const [x, y] = P(296 + rnd(i * 7) * 72, 482 + rnd(i * 11) * 24); g.rect(x, y, 2, 2, ["#B48AE0", "#9A6ACC", "#D4B4F4"][i % 3]); }
  // --- the board fence: rounded board tops, two rails, gaps
  const F0 = 182, F1 = 540, top = 506;
  for (let x = F0; x < F1; x++) {
    const b = (x - F0) % 16, inGap = b >= 14; if (inGap) continue;
    const tp = top + (b < 2 || b > 11 ? (b < 2 ? 2 - b : b - 11) * 1.2 : 0) + (x % 48 < 16 ? -2 : 0);
    for (let y = R(tp); y < GY; y++) {
      const [px, py] = P(x, y), grain = Math.sin(y * 0.3 + x * 1.7) > 0.86 ? -1 : 0;
      const k = 4 - (b === 0 ? 1.4 : b === 13 ? 1.8 : b < 4 ? -0.6 : 0) + grain - (y - tp > 110 ? 0.5 : 0) + (y - tp < 2 ? 0.8 : 0);
      g.px(px, py, WOOD[Math.max(0, Math.min(6, R(k + (bayer(px, py) - 0.5) * 0.6)))]);
    }
  }
  for (const ry of [528, 604]) for (let x = F0; x < F1; x++) { for (let k = 0; k < 7; k++) { const [px, py] = P(x, ry + k); g.px(px, py, k === 0 ? WOOD[5] : k === 6 ? WOOD[1] : WOOD[3]); } if ((x - F0) % 16 === 7) { const [px, py] = P(x, ry + 3); g.px(px, py, "#5A5A5A"); g.px(px, py + 1, "#2A2A2A"); } }
  // the end post at the racecourse seam
  for (let y = 496; y < GY; y++) for (let x = 528; x < 540; x++) { const [px, py] = P(x, y); g.px(px, py, x === 528 ? WOOD[1] : x < 531 ? WOOD[5] : WOOD[3]); }
  rectP(g, 526, 492, 16, 5, WOOD[2]); rectP(g, 526, 492, 16, 1, WOOD[5]);
  // --- the cottage (back wall), terracotta gable, chimney
  const HX0 = 6, HX1 = 182, ROOF_Y = 300;
  for (let y = ROOF_Y; y < GY; y++) for (let x = HX0; x < HX1; x++) {
    const bd = (y - ROOF_Y) % 12, [px, py] = P(x, y);
    let k = bd === 0 ? 2 : bd === 1 ? 3 : 4.6 - (y - ROOF_Y) / 900 + (x < HX0 + 6 ? 0.5 : 0) - (x > HX1 - 8 ? 0.8 : 0);
    if (y > GY - 26) k -= 0.8;                                         // shade near the ground
    g.px(px, py, SIDING[Math.max(0, Math.min(6, R(k + (bayer(px, py) - 0.5) * 0.5)))]);
  }
  for (const x of [HX0, HX1 - 6]) rectP(g, x, ROOF_Y, 6, GY - ROOF_Y, TRIM[2]), rectP(g, x + (x === HX0 ? 5 : 0), ROOF_Y, 1, GY - ROOF_Y, TRIM[1]);
  rectP(g, HX0, GY - 10, HX1 - HX0, 10, "#B8AC98"); rectP(g, HX0, GY - 10, HX1 - HX0, 1, "#DCD2C0");   // plinth
  // gable roof: tiles in rows, an overhang, a chimney behind the ridge
  for (let y = 214; y < 268; y++) for (let x = 120; x < 142; x++) { const [px, py] = P(x, y); g.px(px, py, (y - 214) % 6 === 0 ? "#7A3A2A" : x < 124 ? "#C8705A" : (x + Math.floor((y - 214) / 6) * 5) % 10 === 0 ? "#7A3A2A" : "#A8503A"); }
  rectP(g, 117, 210, 28, 5, "#5A5A62"); rectP(g, 117, 210, 28, 1, "#8A8A92");
  const peak = [94, 222], eaveL = [-10, 308], eaveR = [198, 308];
  for (let y = 222; y < 312; y++) {
    const u = (y - 222) / 86, xl = lerp(peak[0], eaveL[0], u), xr = lerp(peak[0], eaveR[0], u);
    for (let x = R(xl); x <= R(xr); x++) {
      const [px, py] = P(x, y), row = Math.floor((y - 222) / 7), off = (row % 2) * 6, tile = (x + off) % 12, ty = (y - 222) % 7;
      let k = 4.2 - (ty === 0 ? 1.8 : ty === 6 ? 0.9 : 0) - (tile === 0 ? 1 : 0) + (tile < 4 && ty < 3 ? 0.6 : 0);
      if (x - xl < 3 || xr - x < 3) k = 1.2;                            // barge boards
      g.px(px, py, ROOF[Math.max(0, Math.min(6, R(k)))]);
    }
  }
  for (let y = 222; y < 312; y++) { const u = (y - 222) / 86; for (const xx of [lerp(peak[0], eaveL[0], u), lerp(peak[0], eaveR[0], u)]) { const [px, py] = P(R(xx), y); g.px(px, py, TRIM[3]); g.px(px + 1, py, TRIM[2]); } }
  rectP(g, -10, 308, 208, 4, TRIM[2]); rectP(g, -10, 312, 208, 2, "#9A8E7C");                          // gutter / fascia
  // round attic vent in the gable
  { const [cx, cy] = P(94, 270); g.disc(cx, cy, 9, TRIM[3]); g.disc(cx, cy, 7, "#3A3A48"); for (let k = -6; k <= 6; k += 3) g.rect(cx - 6, cy + k, 13, 1, "#6A6A7A"); }
  // window: white frame, sky reflection, gingham curtains, sill and a geranium box
  { const wx0 = 26, wy0 = 362, ww = 66, wh = 84;
    rectP(g, wx0 - 5, wy0 - 5, ww + 10, wh + 10, TRIM[1]); rectP(g, wx0 - 4, wy0 - 4, ww + 8, wh + 8, TRIM[3]);
    for (let y = wy0; y < wy0 + wh; y++) for (let x = wx0; x < wx0 + ww; x++) { const [px, py] = P(x, y), v = (y - wy0) / wh, diag = ((x - wx0) + (y - wy0) * 0.7) % 46; let col = mix("#5A8EC0", "#A8D0EC", 1 - v); if (diag < 6) col = mix(col, "#E8F4FF", 0.55); g.px(px, py, col); }
    rectP(g, wx0 + ww / 2 - 2, wy0, 4, wh, TRIM[3]); rectP(g, wx0, wy0 + wh / 2 - 2, ww, 4, TRIM[3]); rectP(g, wx0 + ww / 2 + 2, wy0, 1, wh, TRIM[1]);
    for (const [cx0, dir] of [[wx0, 1], [wx0 + ww, -1]]) for (let y = wy0; y < wy0 + wh - 10; y++) { const w = 12 + Math.max(0, (y - wy0 - 40)) * 0.25 * (y < wy0 + 60 ? 1 : -1); for (let k = 0; k < w; k++) { const x = cx0 + dir * k, [px, py] = P(x, y), gin = (Math.floor(k / 3) + Math.floor((y - wy0) / 3)) % 2; g.px(px, py, k === R(w) - 1 ? "#8A2018" : gin ? "#E04A3C" : "#FBE8E0"); } }
    rectP(g, wx0 - 8, wy0 + wh + 4, ww + 16, 4, TRIM[3]); rectP(g, wx0 - 8, wy0 + wh + 8, ww + 16, 2, TRIM[0]);
    rectP(g, wx0 - 4, wy0 + wh + 10, ww + 8, 13, WOOD[3]); rectP(g, wx0 - 4, wy0 + wh + 10, ww + 8, 2, WOOD[5]); rectP(g, wx0 - 4, wy0 + wh + 21, ww + 8, 2, WOOD[1]);
    for (let i = 0; i < 6; i++) geranium(g, wx0 + 2 + i * 12, wy0 + wh + 11, 1); }
  // back door: teal panels, little window, brass knob, a lamp, the step and a doormat
  { const dx0 = 112, dy0 = 474, dw = 50, dh = GY - 474;
    rectP(g, dx0 - 5, dy0 - 5, dw + 10, dh + 5, TRIM[3]); rectP(g, dx0 - 5, dy0 - 5, 1, dh + 5, TRIM[1]);
    for (let y = dy0; y < GY; y++) for (let x = dx0; x < dx0 + dw; x++) { const [px, py] = P(x, y); let k = 3.6 - (x - dx0 < 2 ? -1 : 0) - (dx0 + dw - x < 3 ? 1.4 : 0); g.px(px, py, DOOR[Math.max(0, Math.min(6, R(k)))]); }
    for (const [x, y, w, h] of [[dx0 + 6, dy0 + 54, 16, 40], [dx0 + 28, dy0 + 54, 16, 40], [dx0 + 6, dy0 + 104, 16, 50], [dx0 + 28, dy0 + 104, 16, 50]]) { rectP(g, x, y, w, h, DOOR[2]); rectP(g, x + 1, y + 1, w - 2, h - 2, DOOR[4]); rectP(g, x + 1, y + 1, w - 2, 1, DOOR[6]); }
    rectP(g, dx0 + 8, dy0 + 8, dw - 16, 36, TRIM[3]); for (let y = dy0 + 10; y < dy0 + 42; y++) for (let x = dx0 + 10; x < dx0 + dw - 10; x++) { const [px, py] = P(x, y); g.px(px, py, mix("#6A9ED0", "#B8DCF4", (dy0 + 42 - y) / 32)); }
    rectP(g, dx0 + dw / 2 - 1, dy0 + 8, 2, 36, TRIM[3]);
    { const [kx, ky] = P(dx0 + dw - 9, dy0 + 100); g.disc(kx, ky, 3, "#8A6A1A"); g.disc(kx, ky, 2, "#E8C048"); g.px(kx - 1, ky - 1, "#FFF0A0"); }
    // lamp by the door
    { const [lx, ly] = P(98, 488); g.rect(lx - 1, ly - 10, 3, 6, "#2A2A30"); g.rect(lx - 5, ly - 4, 11, 14, "#2A2A30"); g.rect(lx - 3, ly - 2, 7, 10, "#FFE8A0"); g.rect(lx - 2, ly - 1, 2, 4, "#FFFFFF"); g.rect(lx - 6, ly + 10, 13, 2, "#2A2A30"); }
    rectP(g, dx0 - 10, GY - 6, dw + 20, 8, STONE[4]); rectP(g, dx0 - 10, GY - 6, dw + 20, 2, STONE[6]); rectP(g, dx0 - 10, GY + 1, dw + 20, 2, STONE[2]); }
  // downpipe at the corner
  for (let y = 314; y < GY - 8; y++) { const [px, py] = P(178, y); g.rect(px, py, 4, 1, y % 40 < 2 ? "#6A6A70" : "#A8A8B0"); g.px(px, py, "#D8D8E0"); }
  rectP(g, 172, GY - 10, 14, 4, "#8A8A92");
  // --- tulip bed along the fence foot
  for (let x = F0 + 4; x < F1 - 6; x++) for (let y = GY - 7; y < GY; y++) { const [px, py] = P(x, y); g.px(px, py, (x * 7 + y * 3) % 11 < 2 ? "#6A4A30" : y === GY - 7 ? "#7A5A3A" : "#5A3A24"); }
  for (let i = 0; i < 30; i++) { const x = F0 + 8 + i * 12 + rnd(i * 3) * 6, h = 12 + rnd(i * 5) * 12; if (i % 3 === 2) daisy(g, x, GY - 5, h * 0.8); else tulip(g, x, GY - 5, h, ["#F04A5A", "#F4C83A", "#F08AC0", "#FFFFFF", "#E8603A"][R(rnd(i * 7) * 4)]); }
  // --- the lawn: mowing stripes (wider towards the viewer), clover, daisies, dandelions
  for (let y = GY; y < LH; y++) {
    const d = y - GY, v = Math.pow(d / (LH - GY), 0.8), band = Math.floor(Math.sqrt(d + 4) * 1.6) % 2;
    for (let x = 0; x < 540; x++) {
      const [px, py] = P(x, y);
      let k = 4.2 + v * 1.4 + (band ? 0.55 : -0.25) + (bayer(px, py) - 0.5) * 0.8 + Math.sin(x * 0.05 + y * 0.02) * 0.25;
      if (d < 3) k = 3;                                               // the line where the lawn meets the fence/house
      else if (d < 14) k -= (14 - d) * 0.09;                           // soft shade at the foot of the fence
      g.px(px, py, LAWN[Math.max(0, Math.min(7, R(k)))]);
    }
  }
  for (let i = 0; i < 260; i++) { const x = rnd(i * 3 + 1) * 540, d = Math.pow(rnd(i * 5 + 2), 1.3) * 310, y = GY + 8 + d, s2 = 1 + d / 150, [px, py] = P(R(x), R(y)); const kind = i % 6; if (kind < 3) { g.px(px, py, LAWN[7]); g.px(px, py - 1, LAWN[6]); if (s2 > 1.6) g.px(px + 1, py - 1, LAWN[7]); } else if (kind === 3) { for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) g.px(px + dx, py + dy, "#FFFFFF"); g.px(px, py, "#F4C83A"); } else if (kind === 4) { g.rect(px, py, 2, 2, "#F4D03A"); g.px(px, py - 1, "#FFE870"); } else { g.px(px, py, LAWN[2]); g.px(px + 1, py, LAWN[2]); } }
  // a coiled garden hose (bottom left) and flower clumps along the lower lawn
  { const cx = 84, cy = 838; for (let k = 0; k < 3; k++) { const rx = 34 - k * 7, ry = 12 - k * 2.4; for (let i = 0; i <= 80; i++) { const a = (i / 80) * Math.PI * 2, [px, py] = P(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry - k * 2); g.rect(px - 1, py - 1, 3, 3, "#1E6A3A"); g.px(px, py - 1, a > Math.PI ? "#4ABA6A" : "#2E8A4A"); } }
    const tail = bez([cx + 34, cy], [cx + 70, cy + 6], [cx + 96, cy - 8], 20); for (const [x, y] of tail) { const [px, py] = P(x, y); g.rect(px - 1, py - 1, 3, 3, "#1E6A3A"); g.px(px, py - 1, "#4ABA6A"); }
    const [nx, ny] = P(cx + 98, cy - 9); g.rect(nx - 1, ny - 3, 8, 5, "#C8A040"); g.rect(nx - 1, ny - 3, 8, 1, "#F4D878"); g.rect(nx + 7, ny - 2, 3, 3, "#8A6A20"); }
  for (const [cx, cy, n] of [[300, 808, 7], [468, 776, 6], [210, 900, 8], [420, 910, 7]]) for (let i = 0; i < n; i++) { const x = cx + (rnd(cx + i * 7) - 0.5) * 34, y = cy + (rnd(cy + i * 5) - 0.5) * 14, h = 8 + rnd(i * 3 + cx) * 8; if (i % 3) daisy(g, x, y, h); else tulip(g, x, y, h + 2, ["#F04A5A", "#F4C83A", "#F08AC0"][i % 3]); }
  // stepping stones from the door
  for (const [cx, cy, rx, ry] of [[136, 654, 16, 5], [152, 680, 18, 6], [176, 712, 21, 7], [206, 750, 24, 8]]) { blob(g, [ell(...P(cx, cy), rx, ry)], { ramp: STONE, thick: 4, base: 4.2, gain: 1.2, slope: 1.4, outline: STONE[1] }); }
}
function paintFront(g) {
  // grass tufts along the bottom edge and a few clover clumps
  for (let i = 0; i < 70; i++) { const x = rnd(i * 13) * 560 - 10, y = 930 + rnd(i * 7) * 34, h = 8 + rnd(i * 3) * 14; for (let k = 0; k < 5; k++) { const lean = (k - 2) * 0.35 + (rnd(i * 5 + k) - 0.5) * 0.4, pts = bez(P(x + k * 2, y), P(x + k * 2 + lean * h * 0.4, y - h * 0.6), P(x + k * 2 + lean * h, y - h), 6); pline(g, pts, k % 2 ? LAWN[4] : LAWN[6]); } }
  for (const [x, y] of [[30, 900], [496, 892], [260, 940]]) for (let k = 0; k < 4; k++) blob(g, [ell(...P(x + (k % 2) * 8 - 4, y - (k > 1 ? 6 : 0)), 5, 4)], { ramp: LEAF, thick: 3, base: 4.4, gain: 1.4, outline: LEAF[1] });
}
let BACK = null, FRONT = null;
const backLayer = () => (BACK ??= worldLayer(X0 - 40, WY(0), LW, LH, (g, L, T, layer) => { g.has = (x, y) => layer.has(x, y); paintBack(g, layer); }));
const frontLayer = () => (FRONT ??= worldLayer(X0 - 40, WY(0), LW, LH, (g) => paintFront(g)));

// ---------------------------------------------------------------- live pieces
const onScreen = (V) => !(RANGE[1] + 60 < V.x0 || RANGE[0] - 60 > V.x1);
const SX = (V, sx) => V.X(WX(sx)), SY = (V, sy) => V.Y(WY(sy));
/** wind-up toy mouse (grey felt, pink ears, a brass key on its back) trailing its long string tail; (x, y) = point on
 *  the ground under it, dir ±1 (nose direction), sc size. */
function toyMouse(c, x, y, dir, t, moving, a = 1, sc = 1.8) {
  const g = fade(c, a), d = dir, run = moving > 0.05, bob = run ? Math.abs(Math.sin(t * 40)) * 1.2 : 0, jit = run ? 0 : Math.sin(t * 31) * 0.6 * (moving === 0 && t < 22.5 ? 1 : 0);
  const P = (u, v) => [x + jit + d * u * sc, y - bob + v * sc];
  // string tail: a long wavy curve trailing behind
  const pts = []; for (let k = 0; k <= 18; k++) { const u = k / 18; const [px, py] = P(-9 - u * 24, -3 + u * 2.5); pts.push([px, py + Math.sin(u * 7 - t * (run ? 30 : 5)) * (1 + u * 3) * (run ? 0.7 : 1)]); }
  pline(g, pts, "#E05A78"); pline(g, pts.map(([px, py]) => [px, py + 1]), "#A83A58");
  // wheels / feet
  for (const u of [-5, 5]) { const [wx, wy] = P(u, -0.8); g.rect(R(wx - 2), R(wy - 1), 4, 2, "#2A2A34"); }
  // ears behind, body (felt teardrop, nose forward), belly, ear fronts
  for (const u of [3, 7.5]) { const [ex, ey] = P(u, -11.5); g.disc(R(ex), R(ey), R(3 * sc * 0.8), "#3A3A48"); g.disc(R(ex), R(ey), R(2.2 * sc * 0.8), "#9A98A8"); g.disc(R(ex + d), R(ey), R(1.3 * sc * 0.8), "#F29AA6"); }
  const body = [P(-10, -1), P(-10, -6), P(-6, -10.5), P(1, -11), P(7, -9), P(12.5, -4), P(13.5, -2), P(11, -1)];
  blob(g, [body], { ramp: ["#22222C", "#3A3A48", "#56566A", "#72728A", "#8E8EA4", "#AAAABC", "#C6C6D4", "#E2E2EC"], thick: 4 * sc, base: 3.6, gain: 1.6, outline: "#1A1A24", litOutline: "#E8E8F4" });
  { const [ex, ey] = P(8, -6.5); g.rect(R(ex), R(ey), 2, 2, "#0B0812"); g.px(R(ex), R(ey), "#FFFFFF"); }
  { const [nx, ny] = P(13.4, -2.8); g.rect(R(nx) - 1, R(ny) - 1, 3, 2, "#F27A9A"); }
  for (const k of [-1, 1]) { const [wx, wy] = P(12, -3 + k * 0.8); g.line(R(wx), R(wy), R(wx + d * 5 * sc * 0.7), R(wy + k * 2), "#E8E8F4"); }
  // brass key on the back, turning
  const kt = Math.sin(t * (run ? 36 : 10)), [kx, ky] = P(-3, -11.5);
  g.rect(R(kx), R(ky - 3), 2, 4, "#A8802A"); const kw = R(Math.abs(kt) * 4 * sc * 0.6) + 1; g.rect(R(kx + 1 - kw), R(ky - 7), kw * 2, 4, "#F4CA50"); g.rect(R(kx + 1 - kw), R(ky - 7), kw * 2, 1, "#FFF0A0");
}
/** soft dust / grass puff: (x, y) centre on the ground, k 0..1 life, r size */
function puff(c, x, y, k, r, seed, col = "#F4E6C4") {
  if (k <= 0 || k >= 1) return;
  const a = (1 - k) * 0.85, rr = r * (0.5 + 0.8 * ease(Math.min(1, k * 1.6)));
  for (let i = 0; i < 4; i++) {
    const cx = x + (rnd(seed * 7 + i) - 0.5) * r * 1.4 * (0.4 + k), cy = y - rr * 0.4 - rnd(seed * 3 + i) * r * 0.5 * k - k * r * 0.4, rx = rr * (0.45 + 0.35 * rnd(seed + i * 5)), ry = rx * 0.75;
    for (let Y = R(cy - ry); Y <= R(cy + ry); Y++) for (let X = R(cx - rx); X <= R(cx + rx); X++) { const q = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2; if (q > 1) continue; if (a * (1.15 - q * 0.6) > bayer(X, Y)) c.px(X, Y, q < 0.35 && Y < cy ? "#FFFFFF" : col); }
  }
  // grass bits flying
  for (let i = 0; i < 4; i++) { const u = k, bx = x + (rnd(seed * 11 + i) - 0.5) * r * 2.4 * u, by = y - Math.sin(Math.PI * Math.min(1, u * 1.3)) * r * (0.6 + rnd(seed + i * 3)); if (a > 0.2) { c.px(R(bx), R(by), LAWN[6]); c.px(R(bx) + 1, R(by), LAWN[4]); } }
}
const zAt = (y) => lerp(2.65, 3.15, clamp01((y - 640) / 44));
/** side-view cat state on the loop at time t: { x, y, z, facing, st } */
function sideCat(t) {
  const th = catTheta(t), [x0, y] = loopAt(th), z = zAt(y), facing = Math.sin(th) > 0 ? 1 : -1, x = x0 + SKID_SHIFT * sm(t, SKID[0], SKID[1]);
  const dist = (CAT_TH0 - th) * 140;                                 // ≈ px travelled (average radius)
  const skid = sm(t, SKID[0] - 0.02, SKID[0] + 0.06);
  const run = { pose: "run", facing, p: dist / (runStride(1) * z), stretch: 1, headScale: 1.45, eyeBig: 1 };
  const sk = { pose: "skid", facing, k: clamp01((t - SKID[0]) / (SKID[1] - SKID[0])), headScale: 1.45, eyeBig: 0.9 };
  return { x, y, z, th, facing, run, sk, skid };
}
/** draw the side-view tabby at rest-screen (x, y) through a map {X, Y} (rest-screen → target canvas); no floor shadow */
function drawSide(g, map, x, y, z, st) {
  const G = { z, X: (u) => R(map.X(x)) + u * z, Y: (v) => R(map.Y(y)) + v * z };
  return drawCat(g, G, 0, 0, { ...st, shadow: 0 });
}
// transitions of the sprinting cat (facing flips at the loop ends, run → skid): the new pose is drawn live and the
// last frame before the window is kept frozen on top and dissolved away (one rig draw per frame, not two)
const FLIP = 0.05, SKIDX = [SKID[0] - 0.02, SKID[0] + 0.07];
const facingAt = (t) => { for (const tt of TURNS) if (Math.abs(t - tt) < FLIP) return Math.sin(catTheta(tt + 0.06)) > 0 ? 1 : -1; return Math.sin(catTheta(t)) > 0 ? 1 : -1; };
/** the sprinting cat at time t (one pose, one facing) */
function sprinter(g, map, t) {
  const s = sideCat(t), fac = facingAt(t);
  drawSide(g, map, s.x, s.y, s.z, t >= SKIDX[0] ? { ...s.sk, facing: fac } : { ...s.run, facing: fac });
  return { ...s, facing: fac };
}
/** the frozen frame to dissolve away at time t, with its alpha (or null) */
function oldFrame(t) {
  for (const tt of TURNS) if (Math.abs(t - tt) < FLIP) return { fi: Math.floor((tt - FLIP) * 30), k: 1 - (t - tt + FLIP) / (2 * FLIP) };
  if (t >= SKIDX[0] && t < SKIDX[1]) return { fi: Math.floor(SKIDX[0] * 30), k: 1 - (t - SKIDX[0]) / (SKIDX[1] - SKIDX[0]) };
  return null;
}
// the sprinter is rendered once per video frame into an offscreen band (rest-screen x −80..620, y 430..730) and kept
// for two more frames, so the blur trail re-uses the earlier frames instead of drawing the cat three times
const FB = { x0: -80, y0: 430, w: 700, h: 300 }, FRAMES = new Map(), POOL = [];
function catFrame(fi) {
  let e = FRAMES.get(fi); if (e) return e;
  const L = POOL.pop() ?? new Layer(FB.w, FB.h); L.m.fill(0);                // recycled layers: only the mask needs clearing
  const s = sprinter(L.g, { X: (sx) => sx - FB.x0, Y: (sy) => sy - FB.y0 }, fi / 30);
  e = { L, s }; FRAMES.set(fi, e);
  if (FRAMES.size > 6) { const k = FRAMES.keys().next().value; POOL.push(FRAMES.get(k).L); FRAMES.delete(k); }
  return e;
}
const blitFrame = (c, V, e, a) => e.L.blit(c, SX(V, FB.x0), SY(V, FB.y0), { a });

// ---------------------------------------------------------------- module interface
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V);
}
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  // warm the front-on cat's parts before they are needed (one per frame)
  if (t > LV.cat[0] - 0.8 && t < LV.cat[0]) warmTabby(Math.floor((t - LV.cat[0] + 0.8) * 30) % 4, S);
  if (t > LAUNCH - 1.0 && t < LAUNCH - 0.67 && Math.round(t * 30) % 3 === 0) catFrame(Math.round(LAUNCH * 30) - 9 + (Math.round(t * 30) % 9) / 3);   // warm the side rig (JIT, first draws)
  if (t > LAUNCH + 0.15 && t < SKID[0]) warmTabby(Math.floor((t - LAUNCH - 0.15) * 30), S);   // the proud pose's parts, one per frame
  const items = [];
  // the yarn ball: knocked rolling when the cat whooshes past the left end of the loop
  const yk = sm(t, TURNS[0] - 0.02, TURNS[0] + 0.7), yx = 50 - 26 * ease(yk), yrot = yk * 3.2;
  items.push({ y: 670, draw: () => yarn(c, SX(V, yx), SY(V, 670), yrot, SX(V, 50)) });
  items.push({ y: 666, draw: () => pot(c, SX(V, 502), SY(V, 666)) });
  items.push({ y: GY, draw: () => sign(c, R(SX(V, 414)), R(SY(V, GY)), "LV 4", "wood", 1, t) });
  // the toy mouse
  const m = mouseAt(t), mA = Math.min(sm(t, MOUSE_IN[0] - 0.05, MOUSE_IN[0] + 0.05), 1 - sm(t, SETTLE[1] + 0.4, SETTLE[1] + 0.8));
  if (mA > 0 && t < PROUD[1]) items.push({ y: m.y - 0.5, draw: () => toyMouse(c, SX(V, m.x), SY(V, m.y), m.dir, t, m.moving, mA * (1 - sm(t, PROUD[0], PROUD[1]))) });
  // the cat: front-on (sit → crouch) · side view (sprint) · front-on (proud)
  const frontA = 1 - sm(t, LAUNCH - 0.02, LAUNCH + 0.08), sideA = sm(t, LAUNCH - 0.03, LAUNCH + 0.06) * (1 - sm(t, PROUD[0], PROUD[1])), proudA = sm(t, PROUD[0], PROUD[1]);
  if (frontA > 0 && t < LAUNCH + 0.1) items.push({ y: GY, draw: () => {
    const cr = sm(t, CROUCH[0], CROUCH[1]), wig = t > WIGGLE[0] ? Math.sin((t - WIGGLE[0]) * 2 * Math.PI * 3.2) * sm(t, WIGGLE[0], WIGGLE[0] + 0.1) : 0;
    const lk = sm(t, MOUSE_IN[0] + 0.05, MOUSE_IN[0] + 0.25), look = [Math.max(-1, Math.min(1, (m.x - 270) / 110)) * 0.95 * lk, 0.35 * cr];
    const flick = win(t, EV.your2 - 0.2, EV.cat2 + 0.1, 0.15, 0.2) * Math.sin((t - EV.your2) * 9) * 0.22;
    drawTabby(c, SX(V, 270), SY(V, GY), { s: S, t, a: frontA, crouch: cr, wiggle: wig, look, wide: 0.6 * sm(t, MOUSE_IN[0], MOUSE_IN[0] + 0.25), blink: blinkAt(t, 4.1, 0.6) * (1 - sm(t, MOUSE_IN[0] - 0.2, MOUSE_IN[0])),
      sway: 0.1 * Math.sin(t * 1.3) + flick + (cr > 0 ? 0.18 * Math.sin(t * 13) * cr : 0), earsBack: -0.08 * cr });
  } });
  if (sideA > 0) { const s = sideCat(t); items.push({ y: s.y, draw: () => sprintFx(c, V, t, sideA) }); }
  if (proudA > 0) items.push({ y: GY, draw: () => {
    const pf = 1 - sm(t, SETTLE[0], SETTLE[1]), hp = win(t, HAPPY[0], HAPPY[1], 0.15, 0.25);
    drawTabby(c, SX(V, 270), SY(V, GY), { s: S, t, a: proudA, puff: pf, happy: hp, open: 0.8 * hp, headDy: 7 * pf, earsBack: 0.12 * pf, sway: 0.1 * Math.sin(t * 1.3) + 0.25 * pf * Math.sin(t * 7) });
    // the caught toy mouse pinned under its left paw (head and string sticking out)
    const pa = proudA * mA; toyMouse(c, SX(V, 224), SY(V, GY + 3), -1, t, 0, pa); drawTabbyPaw(c, SX(V, 270), SY(V, GY), S, -1, pa);
  } });
  items.sort((p, q) => p.y - q.y).forEach((it) => it.draw());
  // effects over everything: launch poof, skid spray, proud poof, wind streaks
  for (const [t0, x, y, r, seed, d] of [[LAUNCH - 0.03, 262, GY - 6, 58, 1, 0.55], [SKID[0] + 0.04, 350, GY + 2, 26, 2, 0.5], [SKID[0] + 0.14, 330, GY + 2, 30, 3, 0.5], [PROUD[0] - 0.06, 268, GY + 2, 44, 4, 0.36]]) puff(c, SX(V, x), SY(V, y), (t - t0) / d, r, seed);
  if (t > PROUD[0] && t < SETTLE[0] + 0.7) wind(c, V, t);
}
/** the sprint: dust trail along the loop, contact shadow, a blur trail (earlier frames), the cat, speed lines */
function sprintFx(c, V, t, a) {
  for (let k = 0; k < 24; k++) {
    const t0 = RUN[0] + 0.03 + k * 0.042; if (t0 > SKID[0] || t0 > t) break;
    const life = (t - t0) / 0.55; if (life >= 1) continue;
    const [x, y] = loopAt(catTheta(t0)), f = Math.sin(catTheta(t0)) > 0 ? 1 : -1;
    puff(c, SX(V, x - f * 30), SY(V, y + 1), life, 9 + (k % 3) * 2, k + 10);
  }
  const fi = Math.round(t * 30), f0 = Math.round(RUN[0] * 30), cur = catFrame(fi), s = cur.s;
  // contact shadow on the lawn (soft, follows the cat)
  { const x = SX(V, s.x), y = SY(V, s.y), rx = 44 * s.z, ry = 4 * s.z; c.tint(R(x - rx), R(y - ry), R(2 * rx), R(2 * ry), (X, Y) => { const d = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return d >= 1 ? 0 : 0.36 * (1 - d) * a; }, "#000000", 3); }
  const turnK = Math.min(...TURNS.map((tt) => sm(Math.abs(t - tt), 0.05, 0.12)));   // no blur trail through the facing flips
  if (s.skid < 0.5 && turnK > 0) for (const [df, ga] of [[2, 0.16], [1, 0.3]]) { if (fi - df < f0) continue; blitFrame(c, V, catFrame(fi - df), ga * a * (1 - s.skid * 2) * turnK); }
  blitFrame(c, V, cur, a);
  const of = oldFrame(t); if (of && of.k > 0) blitFrame(c, V, catFrame(of.fi), a * of.k);
  // speed lines behind the cat (length by speed), cream/white, dithered tips
  const th1 = catTheta(t + 1 / 60), th0 = catTheta(t - 1 / 60), [x1, y1] = loopAt(th1), [x0, y0] = loopAt(th0), sp = Math.hypot(x1 - x0, y1 - y0) * 30;
  const lk = sm(sp, 250, 650) * a;                                   // speed lines grow in and out with the speed
  if (lk > 0) {
    const f = s.facing, L = Math.min(110, sp * 0.09), cx = SX(V, s.x), cy = SY(V, s.y);
    for (let i = 0; i < 6; i++) { const yy = R(cy - 6 * s.z - i * 6.5 * s.z / 2.65 + (i % 2) * 2), x0b = R(cx - f * (s.z * 38 + rnd(i * 7 + fi) * 26)), len = R(L * (0.5 + 0.5 * rnd(i * 3 + fi))); for (let k = 0; k < len; k++) { const X = x0b - f * k, u = k / len; if ((u > 0.65 && (u - 0.65) * 2.6 > bayer(X, yy)) || lk <= bayer(X + 1, yy)) continue; c.px(X, yy, u < 0.2 ? "#FFFFFF" : "#FFF4D8"); } }
  }
}
/** wind streaks blowing over the proud cat (its fur stays puffed for a moment) */
function wind(c, V, t) {
  const u = (t - PROUD[0]) / (SETTLE[0] + 0.7 - PROUD[0]);
  for (let i = 0; i < 5; i++) {
    const k = clamp01(u * 1.6 - i * 0.12); if (k <= 0 || k >= 1) continue;
    const y = SY(V, 380 + i * 52), x = SX(V, -40 + k * 640), len = 60 + i * 8, a = Math.sin(Math.PI * k) * 0.8;
    for (let j = 0; j < len; j++) { const X = R(x - j), Y = R(y + Math.sin((X + i * 30) * 0.06) * 3), e = j / len; if ((1 - e) * a > bayer(X, Y) + 0.1) c.px(X, Y, "#FFFFFF"); }
  }
}
function yarn(c, x, y, ang, x0) {
  const X = R(x), Y = R(y - 11), r = 11;
  // loose strand trailing from the ball back to where it lay
  pline(c, bez([x0 + 12, y], [x0 + 26, y + 6], [x0 + 40, y + 2], 10), "#C86AA8");
  pline(c, bez([X + 2, Y + r - 1], [(X + x0 + 12) / 2, y + 4], [x0 + 12, y], 8), "#C86AA8");
  c.disc(X, Y, r + 1, "#5A1A40"); c.disc(X, Y, r, "#D870B0");
  for (let k = 0; k < 6; k++) { const a = ang + k * 0.52; c.ering(X, Y, R(r * Math.abs(Math.cos(a))) || 1, r - 1, "#A8448A", -Math.PI / 2, Math.PI / 2); }
  for (let k = -2; k <= 2; k++) { const yy = Y + k * 4 + R(Math.sin(ang) * 2); c.line(X - r + 2, yy, X + r - 2, yy - 2, "#F0A0D0"); }
  c.px(X - 4, Y - 6, "#FFE0F4"); c.px(X - 3, Y - 6, "#FFE0F4"); c.px(X - 4, Y - 5, "#FFE0F4");
}
let POT_L = null;
/** terracotta pot with red geraniums (cached sprite; anchor = the pot's base centre) */
function pot(c, x, y) {
  if (!POT_L) { POT_L = new Layer(60, 64); const g = POT_L.g, X = 30, Y = 62;
    for (let j = 0; j < 22; j++) { const w = 12 - j * 0.18; for (let i = -R(w); i <= R(w); i++) g.px(X + i, Y - j, j === 0 ? POT[0] : i < -w + 2 ? POT[4] : i > w - 3 ? POT[1] : POT[3]); }
    g.rect(X - 14, Y - 26, 29, 5, POT[1]); g.rect(X - 14, Y - 26, 29, 1, POT[5]); g.rect(X - 13, Y - 22, 27, 1, POT[0]);
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + (i - 2.5) * 0.5; leaf(g, X + Math.cos(a) * 4, Y - 27, 12, 5, a, LEAF, { vein: false }); }
    for (const [dx, dy] of [[-8, -42], [2, -46], [9, -38], [-2, -36]]) { const fx = X + dx, fy = Y + dy; for (const [ox, oy] of [[0, 0], [2, 0], [1, -1], [1, 1], [-1, 1], [3, 1], [1, 2]]) g.px(fx + ox, fy + oy, (ox + oy) % 2 ? "#E8384A" : "#C82038"); g.px(fx + 1, fy, "#FF9A9A"); } }
  POT_L.blit(c, R(x) - 30, R(y) - 62);
}
export function front(c, V, t) {
  if (!onScreen(V)) return;
  frontLayer().blit(c, V);
}
export function hud(c, V, t) {}
export function ICON(c, cx, cy, a = 1) { tabbyIcon(c, cx, cy, a); }
