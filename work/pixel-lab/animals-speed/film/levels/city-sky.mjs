// The city's far background, shared by LV7 (its right edge: the first city lights behind the hills at night) and
// LV8 (the dawn skyline): far skyscraper silhouettes (two cached looks, night and dawn, crossfaded by time of day),
// the mid-ground towers with the radio mast, and the elevated bullet-train viaduct that runs out of a tunnel in the
// bat hills across the whole city. Static parts are painted once into world layers; only blinking lights are per frame.
import { Layer, R, sm, mix, bayer, gradeK } from "./city-kit.mjs";
import { rnd } from "../cute.mjs";
import { tod } from "../world.mjs";

// rest-screen ↔ world for the city (camera REST.city = {4050, −180}): wx = sx + 3780, wy = sy − 660
export const CX0 = 3780, CY0 = -660;
export const DECK = 506, DECK_B = 521, WIRE = 458;          // viaduct deck top/bottom and contact wire (screen y at rest)
export const PORTAL_WX = 3746;                              // world x of the tunnel portal in the bat hills
export const MAST = { sx: 434, top: 396 };                  // radio mast on the mid tower (rest-screen): the falcon's perch

/** Time-of-day look: 0 at night (tod 6), 1 at dawn (tod 7). */
export const dawnK = (V) => sm(tod(V.cx), 6.08, 6.92);
/** Grade that turns dawn-painted city art into its night look (k = 1 − dawnK). */
const NIGHT = { mul: [0.42, 0.44, 0.72], add: [6, 6, 26] };
export const cityGrade = (V) => gradeK(NIGHT, 1 - dawnK(V));

// ---------------------------------------------------------------- far skyline (world layers, two looks)
// [rest-screen x0, x1, top y, spire height] — low in the middle so the sunrise disc stays free
const FAR = [
  [-250, -200, 470, 0], [-205, -160, 452, 0], [-165, -120, 430, 0], [-125, -78, 398, 24], [-82, -40, 440, 0], [-44, 22, 338, 0], [18, 70, 398, 0], [66, 118, 300, 46],
  [114, 166, 420, 0], [162, 206, 456, 0], [202, 244, 474, 0], [240, 302, 488, 0], [298, 342, 466, 0], [338, 378, 432, 0], [374, 424, 362, 0],
  [420, 470, 400, 18], [466, 522, 318, 40], [518, 566, 412, 0], [562, 626, 372, 0], [622, 680, 430, 0], [676, 740, 350, 30], [736, 812, 410, 0],
];
const FAR_WX0 = CX0 - 260, FAR_WX1 = CX0 + 820, FAR_WY0 = CY0 + 200, FAR_WY1 = CY0 + 600;
function paintFar(L, night) {
  const g = L.g;
  for (let i = 0; i < FAR.length; i++) {
    const [a, b, top, spire] = FAR[i], x0 = CX0 + a, x1 = CX0 + b, y0 = CY0 + top, yb = CY0 + 600;
    const sunSide = (a + b) / 2 < 270 ? 1 : -1;              // the edge that faces the sunrise gets a warm rim
    for (let y = y0; y < yb; y++) for (let x = x0; x < x1; x++) {
      const h = (y - y0) / (yb - y0);
      let col = night ? (h < 0.5 ? "#1C1A3E" : (h - 0.5) * 2 > bayer(x, y) ? "#24204A" : "#1C1A3E") : (h < 0.35 ? "#8A6A9C" : h < 0.7 ? ((h - 0.35) / 0.35 > bayer(x, y) ? "#9C78A4" : "#8A6A9C") : "#9C78A4");
      const edge = sunSide > 0 ? x === x1 - 1 : x === x0;
      if (y === y0) col = night ? "#3A3466" : "#C89AB0";
      else if (edge) col = night ? "#2C2856" : "#E4AAB0";
      g.px(x, y, col);
    }
    // window grid (sparse, deterministic); night: many warm lights, dawn: a few dim ones left on
    for (let y = y0 + 6; y < yb - 4; y += 7) for (let x = x0 + 4; x < x1 - 4; x += 6) {
      const r = rnd(x * 13 + y * 7 + i), lit = night ? r < 0.34 : r < 0.07;
      if (lit) { const c = night ? (r < 0.08 ? "#FFE8A0" : "#E8B04A") : "#F4C890"; g.px(x, y, c); g.px(x + 1, y, c); g.px(x, y + 1, night ? "#A07A3A" : "#C8A088"); g.px(x + 1, y + 1, night ? "#A07A3A" : "#C8A088"); }
      else if (!night && r > 0.8) { g.px(x, y, "#806494"); g.px(x + 1, y, "#806494"); }
    }
    if (spire) { const sx = Math.round((x0 + x1) / 2); for (let y = y0 - spire; y < y0; y++) g.px(sx, y, night ? "#2C2856" : "#9C78A4"); g.px(sx - 1, y0 - 3, night ? "#2C2856" : "#9C78A4"); g.px(sx + 1, y0 - 3, night ? "#2C2856" : "#9C78A4"); }
  }
}
let FAR_N = null, FAR_D = null;
/** Far skyline between world x wxa..wxb (clipped), night ↔ dawn crossfade, blinking red beacons on the spires. */
export function drawFar(c, V, t, wxa, wxb) {
  if (wxb < V.x0 || wxa > V.x1) return;
  if (!FAR_N) { FAR_N = new Layer(FAR_WX0, FAR_WY0 - 60, FAR_WX1, FAR_WY1); paintFar(FAR_N, true); FAR_D = new Layer(FAR_WX0, FAR_WY0 - 60, FAR_WX1, FAR_WY1); paintFar(FAR_D, false); }
  const k = dawnK(V);
  if (k < 1) FAR_N.blit(c, V, { wxa, wxb });
  if (k > 0) FAR_D.blit(c, V, { wxa, wxb, a: k });
  // aircraft-warning beacons on the spires: slow smooth pulse
  for (let i = 0; i < FAR.length; i++) {
    const [a, b, top, spire] = FAR[i]; if (!spire) continue;
    const wx = CX0 + R((a + b) / 2), x = R(V.X(wx)), y = R(V.Y(CY0 + top - spire)); if (wx < wxa || wx >= wxb || x < 1 || x > 538) continue;
    const p = 0.5 + 0.5 * Math.sin(t * 3.1 + i * 1.7), col = mix("#5A1A2A", "#FF4A4A", p);
    c.px(x, y - 1, col); if (p > 0.55) { c.px(x - 1, y - 1, mix(c.get(x - 1, y - 1), "#FF6A5A", (p - 0.55) * 1.6)); c.px(x + 1, y - 1, mix(c.get(x + 1, y - 1), "#FF6A5A", (p - 0.55) * 1.6)); }
  }
}

// ---------------------------------------------------------------- mid-ground towers + the radio mast (city only, dawn-painted, graded)
const MID = [[-20, 60, 540], [56, 132, 520], [128, 196, 548], [192, 262, 560], [258, 318, 546], [314, 392, 528], [392, 478, 474], [474, 560, 516], [556, 640, 536], [636, 720, 522], [716, 812, 540]];
let MIDL = null;
function paintMid() {
  const L = new Layer(CX0 - 30, CY0 + 360, CX0 + 820, CY0 + 600), g = L.g;
  for (let i = 0; i < MID.length; i++) {
    const [a, b, top] = MID[i], x0 = CX0 + a, x1 = CX0 + b, y0 = CY0 + top, yb = CY0 + 600, sunSide = (a + b) / 2 < 270 ? 1 : -1;
    for (let y = y0; y < yb; y++) for (let x = x0; x < x1; x++) {
      const h = (y - y0) / 60; let col = h < 0.6 ? "#5E4A7E" : h < 1 ? ((h - 0.6) / 0.4 > bayer(x, y) ? "#54426E" : "#5E4A7E") : "#54426E";
      if (y === y0 || y === y0 + 1) col = y === y0 ? "#2E2244" : "#9A7AA6";
      else if (sunSide > 0 ? x >= x1 - 2 : x <= x0 + 1) col = (sunSide > 0 ? x === x1 - 1 : x === x0) ? "#F0B4A8" : "#B48AA0";
      else if (sunSide > 0 ? x === x0 : x === x1 - 1) col = "#2E2244";
      g.px(x, y, col);
    }
    // windows: 3×4 panes, some catch the pink sky, a few warm lights
    for (let y = y0 + 8; y < yb - 4; y += 10) for (let x = x0 + 5; x < x1 - 6; x += 8) {
      const r = rnd(x * 31 + y * 17 + i * 5), c = r < 0.12 ? "#FFD49A" : r < 0.55 ? "#8E6E9E" : "#463660";
      g.rect(x - CX0 + CX0, y, 4, 5, c); g.rect(x, y, 4, 1, r < 0.12 ? "#FFF0C8" : "#B08AB4");
    }
    // roof kit: a water tank or an AC box on a few roofs
    if (i % 3 === 1) { const bx = x0 + 10; g.rect(bx, y0 - 9, 12, 9, "#4A3A66"); g.rect(bx, y0 - 9, 12, 1, "#9A7AA6"); g.rect(bx + 2, y0 - 12, 8, 3, "#3A2C54"); }
  }
  // the radio mast on the tall mid tower (lattice, three cross arms)
  const mx = CX0 + MAST.sx, y0 = CY0 + MAST.top, yb = CY0 + 474;
  for (let y = y0; y < yb; y++) { g.px(mx, y, "#3A2C54"); g.px(mx + 1, y, "#6A5480"); if ((y - y0) % 6 === 0) { g.px(mx - 1, y, "#3A2C54"); g.px(mx + 2, y, "#3A2C54"); } }
  for (let y = y0 + 24; y < yb; y++) { const w = R((y - y0 - 24) * 0.22); g.px(mx - w - 1, y, "#3A2C54"); g.px(mx + w + 2, y, "#4A3A66"); }
  for (const [dy, w] of [[14, 5], [30, 8], [52, 12]]) { g.rect(mx - w, y0 + dy, w * 2 + 2, 1, "#3A2C54"); g.rect(mx - w, y0 + dy - 1, w * 2 + 2, 1, "#8A6E9A"); }
  g.rect(mx - 2, y0 - 2, 6, 2, "#2E2244"); g.rect(mx - 2, y0 - 2, 6, 1, "#9A7AA6");   // little perch cap
  return L;
}
export function drawMid(c, V, t) {
  if (CX0 + 820 < V.x0 || CX0 - 30 > V.x1) return;
  if (!MIDL) MIDL = paintMid();
  MIDL.blit(c, V, { grade: cityGrade(V), wxa: CX0 });
  // mast beacon
  const x = R(V.X(CX0 + MAST.sx)), y = R(V.Y(CY0 + MAST.top)) - 4, p = 0.5 + 0.5 * Math.sin(t * 2.6 + 0.4);
  if (x > 0 && x < 539) { c.px(x, y, mix("#6A1A2A", "#FF5A4A", p)); c.px(x + 1, y, mix("#6A1A2A", "#FF5A4A", p)); if (p > 0.6) for (const [dx, dy] of [[-1, 0], [2, 0], [0, -1], [1, -1]]) c.px(x + dx, y + dy, mix(c.get(x + dx, y + dy), "#FF8A7A", (p - 0.6) * 1.8)); }
}

// ---------------------------------------------------------------- the elevated viaduct (world layer, dawn-painted, graded)
let VIA = null, VIA_FRONT = null;
const VWX0 = PORTAL_WX - 4, VWX1 = CX0 + 820;
function paintViaduct() {
  const L = new Layer(VWX0, CY0 + 440, VWX1, CY0 + 650), g = L.g, F = new Layer(VWX0, CY0 + 440, VWX1, CY0 + 650), f = F.g;
  const top = CY0 + DECK, bot = CY0 + DECK_B;
  // pillars (down to the ground; the roof parapet hides them in the city)
  for (let x = PORTAL_WX + 26; x < VWX1; x += 108) for (let y = bot; y < CY0 + 640; y++) for (let i = 0; i < 12; i++) g.px(x + i, y, i === 0 ? "#3A2C50" : i < 3 ? "#9A86A8" : i > 9 ? "#4A3A62" : "#7A6890");
  // catenary poles + wires (behind the train)
  for (let x = PORTAL_WX + 60; x < VWX1; x += 108) { for (let y = CY0 + WIRE - 6; y < top; y++) { g.px(x, y, "#4A3A62"); g.px(x + 1, y, "#8A76A0"); } for (let i = -10; i <= 4; i++) g.px(x + i, CY0 + WIRE - 6, "#4A3A62"); }
  for (let x = PORTAL_WX; x < VWX1; x++) { g.px(x, CY0 + WIRE, "#3A2C50"); const ph = ((x - PORTAL_WX - 60) % 108 + 108) % 108, sag = R(Math.sin((Math.PI * ph) / 108) * 3); g.px(x, CY0 + WIRE - 7 + sag, "#4A3A62"); }
  // deck: rail line on top, a concrete side panel with a light lip and panel joints (drawn in FRONT of the train)
  for (let x = PORTAL_WX; x < VWX1; x++) for (let y = top - 2; y < bot; y++) {
    let col = y < top ? "#5A4A72" : y === top ? "#E8C8C8" : y === top + 1 ? "#C8A8B8" : y > bot - 3 ? "#5A4870" : "#A890B0";
    if (y > top + 1 && y < bot - 2 && (x - PORTAL_WX) % 36 === 0) col = "#7A6890";
    f.px(x, y, col);
  }
  for (let x = PORTAL_WX; x < VWX1; x += 3) f.px(x, bot, "#3A2C50");
  return [L, F];
}
/** part "back": pillars + catenary (behind the train); part "front": the deck panel (covers the bogies). */
export function drawViaduct(c, V, t, part, wxa, wxb) {
  if (VWX1 < V.x0 || VWX0 > V.x1) return;
  if (!VIA) [VIA, VIA_FRONT] = paintViaduct();
  (part === "front" ? VIA_FRONT : VIA).blit(c, V, { grade: cityGrade(V), wxa, wxb });
}
export { rnd };
