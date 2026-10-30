// LV4 · elephant + LV5 · human on safari — the golden savanna (RANGE BIOME.savanna = 1620..2430), golden hour. From the
// lagoon's sandy shore (a leaning palm) the land rises to a flat golden plain with acacias, far giraffes and zebras; the
// series' chubby elephant faces the camera at x 1890 with its head in the sun; the hero (binoculars on his chest) stands
// at x 2160 beside a little safari jeep; at the right the first city buildings rise (the night city follows). Below the
// grass: red earth strata in cross-section, deeper rock (seen while the camera rises out of the lagoon).
// Hearts: a pixel heart icon floats beside each of them and pulses ONLY with pulse("elephant" | "human", t) from the
// timeline (the same BEATS list drives the bass heartbeat sound): 30 and 70 BPM side by side, a visible polyrhythm.
// "thirty" → 30 BPM pickup; "yours" → the hero lays his hand on his chest (his heart glows under it), "seventy" → 70 BPM.
import { BIOME, LAND, EV, LV, pulse } from "../timeline.mjs";
import { blob, ell, shadow, sign, pickup, RAMP, C, MAIN, sm, ease, lerp, win, rnd, fade, mix, bayer, blinkAt, clamp01 } from "../cute.mjs";
import { worldLayer, spriteCache, thick, gaze, profile, drawElephant } from "./elephant-art.mjs";
import { drawHeroPose } from "./savanna-hero.mjs";

export const RANGE = BIOME.savanna;
const R = Math.round, [X0, X1] = RANGE, EX = 1890, EY = -288, HX = 2160, HZ = -195;
const SIGN4 = 1734, SIGN5 = 2268, JEEP = 2342, CITY = 2300;
const HEART_E = [EX + 118, -436], HEART_H = [HX + 96, -436];                 // heart icons (world), screen y 224 at rest
const RIM = "#F4B080";

// ---------------------------------------------------------------- palette (golden hour, backlit)
const PLAIN = ["#FFC88A", "#F6B276", "#E89E62", "#D68A52", "#C27846", "#AC683E", "#965A36", "#7E4C30"];
const SOIL = ["#B4602E", "#A65428", "#BE6E3A", "#9A4C26", "#AE5C2E", "#C47640"];
const SAND = ["#F0CC94", "#E4BC84", "#D8AE78", "#EAC48C", "#D0A06A", "#E0B47E"];
const ROCK = ["#5A4A5A", "#4E4050", "#665464", "#46384A", "#5E4C5C", "#706070"];
const HEART = ["#3A0A14", "#6A1424", "#A01E34", "#D0304A", "#EC5468", "#F8848E", "#FCB4B8", "#FFE4E4"];

// ---------------------------------------------------------------- static scenery
const TOP = -460, LH = 1300;
const hz = profile([[X0 - 4, LAND - 4], [X0 + 30, LAND - 30], [X0 + 92, HZ + 24], [X0 + 140, HZ + 2], [2000, HZ], [X1 + 44, HZ + 1]]);
function bezier(p0, p1, p2, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]); } return out; }
function acacia(g, x, y, h, w, col, lit) {
  const tr = Math.max(1, R(h / 30));
  for (const [dx, k] of [[-w * 0.32, 0.62], [w * 0.28, 0.7], [0, 0.5]]) thick(g, bezier([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], Math.max(10, R(h))), tr, col);
  const cy = y - h * 0.78;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.16], [-w * 0.45, w * 0.05, w * 0.5, w * 0.13], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]])
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) { const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1) continue; if ((xx * 7 + yy * 3) % 5 === 0 && d > 0.75) continue; g.px(xx, yy, lit && yy < cy + dy - ry * 0.45 ? lit : col); }
}
function giraffe(px, x, y, h, col, dir = 1) {
  const b = R(h * 0.3);
  for (let i = -b; i <= b; i++) for (let j = 0; j < R(h * 0.14) + R((i * dir + b) * 0.08); j++) px(x + i, y - R(h * 0.42) - j, col);
  for (const lx of [-b + 1, -b + 3, b - 3, b - 1]) for (let j = 0; j < R(h * 0.43); j++) px(x + lx, y - j, col);
  for (let k = 0; k < R(h * 0.55); k++) { const xx = x + dir * (b - 1) + dir * R(k * 0.28); px(xx, y - R(h * 0.52) - k, col); px(xx + dir, y - R(h * 0.52) - k, col); }
  const hx = x + dir * (b + R(h * 0.15)), hy = y - R(h * 1.06); for (let i = 0; i < 5; i++) px(hx + dir * i, hy + (i > 2 ? 1 : 0), col); px(hx + dir * 4, hy + 1, col); px(hx, hy - 1, col); px(hx, hy - 2, col); px(hx + dir, hy - 2, col);
  for (let j = 0; j < R(h * 0.3); j++) px(x - dir * b - dir * R(j * 0.15), y - R(h * 0.48) + j, col);
}
function paintBack(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far city skyline on the horizon at the right (dusk-blue silhouettes, first windows lit)
  for (let i = 0; i < 16; i++) {
    const x0 = CITY + i * 9 + R(rnd(i * 3) * 4), w = 8 + R(rnd(i * 5) * 8), h = R((10 + rnd(i * 7) * 22) * (0.4 + 1.6 * clamp01((x0 - CITY) / 140)));
    for (let y = HZ - h; y <= HZ + 2; y++) for (let x = x0; x < Math.min(X1, x0 + w); x++) px(x, y, x === x0 ? "#7A6A9A" : "#6A5A8A");
    for (let y = HZ - h + 3; y < HZ - 2; y += 4) for (let x = x0 + 2; x < x0 + w - 1; x += 3) if (rnd(x * 7 + y * 13) < 0.3) px(x, y, "#FFE08A");
  }
  // golden plain: hazy at the horizon, darker toward us, perspective rows of grass, far bushes
  for (let wx = X0; wx < X1; wx++) {
    const top = R(hz(wx)); if (top >= LAND) continue;
    for (let wy = top; wy < LAND; wy++) {
      const v = clamp01((wy - HZ) / (LAND - HZ)), s2 = Math.pow(v, 0.75) * (PLAIN.length - 1), lo = Math.floor(s2), f = s2 - lo;
      let col = PLAIN[Math.min(PLAIN.length - 1, f > bayer(wx, wy) ? lo + 1 : lo)];
      if (wy - top < 1) col = "#FFE4B0";
      const row = Math.floor(Math.pow(v, 0.5) * 22);
      if (rnd(wx * 31 + row * 977) < 0.18 && ((wy - HZ) - Math.pow(row / 22, 2) * (LAND - HZ)) ** 2 < 1 + v * 4) col = mix(col, "#FFE08A", 0.35 + v * 0.3);
      if (rnd(wx * 7 + wy * 131) < 0.012 + v * 0.03) col = mix(col, "#4A2A1C", 0.2 + v * 0.2);
      const shore = 1 - sm(wx, X0 + 40, X0 + 120); if (shore > 0) col = mix(col, mix("#FCE0A8", "#D8A870", v), shore * 0.8);
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 54; i++) { const v = Math.pow(rnd(i * 3 + 1), 1.6), wy = HZ + 4 + v * (LAND - HZ - 30), wx = X0 + 120 + rnd(i * 7) * (X1 - X0 - 160), r = 1.2 + v * 7, col = mix("#C88060", "#4A3020", v); if (wy < hz(wx) + 3) continue; for (let y = -r * 0.7; y <= 0; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) if ((x / (r * 1.5)) ** 2 + (y / (r * 0.7)) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.45 ? mix(col, "#FFC890", 0.35) : col); }
  for (const [wx, h, w] of [[1770, 22, 18], [1808, 15, 12], [2010, 26, 20], [2226, 18, 14]]) acacia(g, L(wx), T(hz(wx) + 2), h, w, "#9A5050", "#B06058");
  giraffe(px, 1712, R(hz(1712)) + 3, 24, "#8A4A44", -1); giraffe(px, 1728, R(hz(1728)) + 3, 19, "#8A4A44", -1);
  // mid acacia between the elephant and the hero
  acacia(g, L(2052), T(-72), 116, 70, "#4A2434", "#6A3440");
  // ground: grass lip (sand at the lagoon shore, a sidewalk where the city begins), red earth, deep rock
  for (let wx = X0; wx < X1; wx++) {
    const shore = 1 - sm(wx, X0 + 30, X0 + 110), city = sm(wx, 2378, 2392);
    for (let wy = LAND; wy < TOP + LH; wy++) {
      const d = wy - LAND, b = bayer(wx, wy); let col;
      if (city > 0.5 && d < 7) col = d < 1 ? "#C8C4CC" : d < 5 ? ((wx >> 3) & 1 ? "#A8A4B0" : "#B4B0BC") : "#6A6670";
      else if (d < 3) col = mix(d < 1 ? "#F4C862" : "#D89A3C", d < 1 ? "#FFE8B8" : "#F0CC94", shore);
      else if (d < 9 + Math.sin(wx * 0.4) * 2) col = mix(d < 6 ? "#8A5A24" : "#7A4A20", "#D8AE78", shore);
      else {
        const wv = Math.sin(wx * 0.027) * 6 + Math.sin(wx * 0.13) * 2, v = (wy + wv + 400) / 24, band = Math.floor(v), f = v - band;
        col = mix(SOIL[band % SOIL.length], SAND[band % SAND.length], shore); if (f < 0.09 && b > 0.35) col = mix(col, "#4A2210", 0.28);
        const deep = sm(wy + wv * 2, 300, 360); if (deep > 0) { const rv = (wy + wv + 400) / 30, rb = Math.floor(rv); col = mix(col, ROCK[rb % ROCK.length], deep); if (rv - rb < 0.07 && b > 0.3) col = mix(col, "#2A2030", 0.35 * deep); }
        if (wy > 120) col = mix(col, "#3A1A18", Math.min(0.45, (wy - 120) / 900));
        if (rnd(wx * 13 + wy * 71) < 0.006) col = mix(col, "#F0C8A0", 0.5); else if (rnd(wx * 29 + wy * 17) < 0.006) col = mix(col, "#3A1A0C", 0.5);
        const cityK = sm(wx, X1 - 70, X1); if (cityK > 0 && wy < 314) col = mix(col, citySoil(wx, wy), cityK);
      }
      px(wx, wy, col);
    }
  }
  for (let i = 0; i < 20; i++) { let x = X0 + 60 + rnd(i * 3) * 640, y = LAND + 6; for (let k = 0; k < 10 + rnd(i) * 24; k++) { px(R(x), R(y), "#5A3216"); x += (rnd(i * 50 + k) - 0.5) * 2; y += 1; } }
  for (let i = 0; i < 14; i++) { const wx = X0 + 30 + rnd(i * 7 + 1) * 760, wy = 30 + rnd(i * 5) * 560, r = 4 + rnd(i) * 7; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#2A1A14", "#4A3024", "#6A4A38", "#8A6650", "#A6826A", "#C09E84", "#D6B89E", "#EAD2B8"], thick: 4 }); }
  // an ammonite fossil in the deep rock
  { const cx = L(1760), cy = T(470); for (let a = 0; a < 6 * Math.PI; a += 0.03) { const rr = 2 + a * 1.25; g.px(R(cx + Math.cos(a) * rr), R(cy + Math.sin(a) * rr), a % 1.2 < 0.2 ? "#2A2030" : "#B8A8B0"); } }
  palm(g, L, T); building(g, L, T);
}
// the roofs module's ground strata under the city sidewalk (same formula), for a seamless right edge
const CITY_SOIL = ["#B4602E", "#A65428", "#BE6E3A", "#9A4C26", "#AE5C2E", "#C47640"];
function citySoil(x, y) { const d = y - LAND, wv = Math.sin(x * 0.05 + Math.floor((d + 40) / 10)) * 1.5, band = Math.floor((d + wv) / 10); return CITY_SOIL[((band % 6) + 6) % 6]; }
function palm(g, L, T) {
  // a coconut palm on the lagoon shore, leaning left over the water
  const bx = 1694, by = LAND, h = 170, tip = [bx - 40, by - h], col = "#6A4A3A", lit = "#A47A5A";
  for (const [i, [x, y]] of bezier([bx, by], [bx + 6, by - h * 0.6], tip, 220).entries()) { const w = 5 - R(i / 70); for (let k = -w; k <= w; k++) g.px(L(R(x + k)), T(R(y)), k <= -w + 1 ? lit : k === w ? "#3A2A20" : col); if (R(y) % 7 === 0) for (let k = -w; k <= w; k++) g.px(L(R(x + k)), T(R(y)), "#4A3428"); }
  const LF = ["#1E4A20", "#2E6A2A", "#4A8A34", "#6AA840", "#9AC85A"];
  for (let f = 0; f < 8; f++) {
    const an = -Math.PI * (-0.05 + f * 0.155), len = 46 + rnd(f * 3) * 20, droop = 0.9 + rnd(f) * 0.5;
    for (let k = 0; k < len; k++) {
      const u = k / len, x = tip[0] + Math.cos(an) * k, y = tip[1] + Math.sin(an) * k * 0.5 + u * u * len * 0.6 * droop;
      g.px(L(R(x)), T(R(y)), LF[0]); g.px(L(R(x)), T(R(y)) + 1, LF[1]);
      if (k > 3) for (let j = 1; j < 9 - u * 6; j++) { g.px(L(R(x + j * 0.35)), T(R(y + j)), LF[j < 3 ? 3 : 2]); g.px(L(R(x - j * 0.35)), T(R(y + j * 0.8)), LF[j < 3 ? 4 : 2]); }
    }
  }
  for (const [dx, dy] of [[-4, 6], [3, 7], [-1, 10]]) { const cx = tip[0] + dx, cy = tip[1] + dy; for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) g.px(L(cx + x), T(cy + y), x + y < -2 ? "#9A7A4A" : "#5A4024"); }
}
function building(g, L, T) {
  // the first city building at the right edge (it hides the end of the far plain): brick, four storeys, warm windows
  const x0 = 2392, x1 = X1 + 40, top = -206, BR = ["#4A2430", "#6A3440", "#7E4048", "#924C50"];
  for (let y = top; y < LAND; y++) for (let x = x0; x < x1; x++) { const row = (y - top) % 6, brick = row === 5 || ((x + ((Math.floor((y - top) / 6) & 1) * 5)) % 10 === 0); g.px(L(x), T(y), x < x0 + 2 ? BR[3] : brick ? BR[0] : x < x0 + 8 ? BR[2] : BR[1]); }
  for (let x = x0 - 3; x < x1; x++) { g.px(L(x), T(top), "#2A1420"); g.px(L(x), T(top + 1), "#A86A6A"); g.px(L(x), T(top + 2), "#5A2A34"); }
  for (const fy of [top + 14, top + 58, top + 102, top + 146]) for (let wx = x0 + 12; wx < x1 - 10; wx += 22) {
    g.rect(L(wx) - 1, T(fy) - 1, 14, 22, "#2A1420");
    for (let y = 0; y < 20; y++) for (let x = 0; x < 12; x++) g.px(L(wx + x), T(fy + y), y < 7 ? "#FFF0B0" : (x + y) % 9 === 0 ? "#FFF0B0" : "#F4C860");
    g.rect(L(wx) + 5, T(fy), 1, 20, "#C8902A"); g.rect(L(wx), T(fy) + 9, 12, 1, "#C8902A");
  }
}
let BACK = null;
const backLayer = () => BACK ??= worldLayer(X0 - 50, TOP, X1 - X0 + 94, LH, paintBack);

// ---------------------------------------------------------------- the safari jeep (cached sprite, wheels animated by nothing: it is parked)
const SPR = spriteCache(16);
function jeepSprite() {
  // a cute safari jeep seen from the side, facing left: khaki body with a green stripe, round headlight, spare wheel at
  // the back, windscreen frame and a zebra-striped canvas roof on two posts, chunky wheels
  return SPR("jeep", 124, 84, 62, 78, (g, ox, oy) => {
    const P = (x, y) => [ox + x, oy + y], KH = ["#2E2A14", "#4E4824", "#706834", "#948A48", "#B4A860", "#CCC27C", "#E2D89C", "#F2ECC4"];
    blob(g, [[P(-52, -14), P(-52, -28), P(-46, -34), P(-20, -36), P(-14, -40), P(44, -40), P(50, -32), P(50, -14), P(44, -9), P(-46, -9)]], { ramp: KH, thick: 10, base: 3.6, gain: 1.6, outline: "#1E1C0C", litOutline: "#FFF4C8" });
    for (let x = -50; x <= 48; x++) { g.px(ox + x, oy - 24, "#3A6A3A"); g.px(ox + x, oy - 23, "#2E5A30"); g.px(ox + x, oy - 22, "#3A6A3A"); }
    for (let y = -36; y <= -12; y++) g.px(ox - 4, oy + y, KH[2]);                                   // door line
    g.rect(ox + 4, oy - 31, 7, 2, KH[1]);                                                             // door handle
    for (let y = -34; y <= -26; y++) for (let x = -50; x <= -46; x++) g.px(ox + x, oy + y, y < -31 ? "#FFF8D8" : "#F4D070");   // headlight
    g.rect(ox - 53, oy - 18, 5, 3, "#5A5A5A");                                                        // bumper
    // windscreen frame + glass, canvas roof with zebra stripes on two posts
    for (let y = -62; y <= -40; y++) { g.px(ox - 16 - R((y + 40) * -0.25), oy + y, "#2A2814"); g.px(ox - 15 - R((y + 40) * -0.25), oy + y, "#2A2814"); }
    for (let y = -60; y <= -42; y++) for (let x = -12; x <= -4; x++) if (x > -14 - R((y + 40) * -0.25)) g.px(ox + x - 2, oy + y, y < -55 ? "#E8F8FF" : "#A8D8F0");
    for (const px of [-6, 42]) { g.rect(ox + px, oy - 62, 2, 22, "#2A2814"); }
    for (let y = -70; y <= -62; y++) for (let x = -14; x <= 46; x++) { const edge = y === -70 || y === -62 || x === -14 || x === 46; g.px(ox + x, oy + y, edge ? "#1A1810" : (Math.floor((x + 40 + (y + 70) * 0.6) / 5) & 1) ? "#F4F0E4" : "#2A2620"); }
    // spare wheel on the back, then the two wheels with hubs
    const wheel = (cx, cy, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const d = Math.hypot(i, j); if (d > r + 0.4) continue; g.px(cx + i, cy + j, d > r - 1.2 ? "#0C0C0A" : d > r - 4 ? (i + j < -r * 0.6 ? "#4A4A44" : "#2A2A26") : d > 3.2 ? (i + j < -2 ? "#D8D4C0" : "#A8A48C") : "#5A5848"); } };
    wheel(ox + 54, oy - 26, 9);
    wheel(ox - 30, oy - 10, 11); wheel(ox + 30, oy - 10, 11);
  });
}

// ---------------------------------------------------------------- the pixel heart icon (pulses only with pulse())
function heart(c, x, y, p, a, r = 11) {
  if (a <= 0) return;
  const g = fade(c, a), s = r * (1 + 0.38 * p), inH = (u, v) => { const X = u * 1.18, Y = -v * 1.18 + 0.25; return (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y <= 0; };
  // glow ring expanding from each beat
  if (p > 0.04) { const rr = r * (1.4 + 1.3 * (1 - p)), gk = p * 0.85; for (let j = -R(rr) - 2; j <= R(rr) + 2; j++) for (let i = -R(rr) - 2; i <= R(rr) + 2; i++) { const d = Math.abs(Math.hypot(i, j) - rr); if (d < 1.6 && gk * (1 - d / 1.6) > bayer(R(x) + i, R(y) + j)) g.px(R(x) + i, R(y) + j, "#FFB4C0"); } }
  for (let j = -R(s * 1.3); j <= R(s * 1.3); j++) for (let i = -R(s * 1.3); i <= R(s * 1.3); i++) {
    const u = i / s, v = j / s; if (!inH(u, v)) continue;
    const edge = !inH((i - 1) / s, v) || !inH((i + 1) / s, v) || !inH(u, (j - 1) / s) || !inH(u, (j + 1) / s);
    if (edge) { g.px(R(x) + i, R(y) + j, HEART[0]); continue; }
    const lit = -u * 0.55 - v * 0.75, k = 3.6 + lit * 2.2 + p * 0.9, q = Math.max(1, Math.min(7, Math.floor(k + (bayer(R(x) + i, R(y) + j) - 0.5) * 0.7)));
    g.px(R(x) + i, R(y) + j, HEART[q]);
  }
  const hx = R(x - s * 0.45), hy = R(y - s * 0.35); g.px(hx, hy, "#FFFFFF"); g.px(hx + 1, hy, "#FFFFFF"); g.px(hx, hy + 1, "#FFFFFF"); if (s > 12) { g.px(hx - 1, hy + 1, "#FFE4E4"); g.px(hx + 2, hy - 1, "#FFE4E4"); }
}

// ---------------------------------------------------------------- choreography
const T_HAND = EV.yours + 0.05, HAND_IN = 0.42;
const E_IN = EV.elephant + 0.25, H_IN = EV.yours - 0.2;                    // heart icons dissolve in
const HEART_FADE = 0.4, PICKUP_LIFE = 1.3, LABEL_T = { e: EV.thirty + 0.95, h: EV.seventy + 0.95 }, LABEL_FADE = 0.3;
/** Timing tables of this level (for the sound cues in savanna-motions.mjs); the drawing below reads the same values.
 *  Static props (binoculars on the strap, the parked jeep) have no motion. */
export const TIMING = { T_HAND, HAND_IN, E_IN, H_IN, HEART_FADE, PICKUP_LIFE, LABEL_T, LABEL_FADE };

// ---------------------------------------------------------------- level exports
const onScreen = (V) => V.x1 > X0 - 70 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0 - 50))), x1: Math.min(540, R(V.X(X1 + 44))) });
  // birds gliding over the golden plain, far zebras
  for (let i = 0; i < 4; i++) { const u = (t * 0.035 + i * 0.07) % 1, x = R(V.X(1700 + u * 560 + i * 9)), y = R(V.Y(-420 + i * 6 - u * 40)), f = Math.sin(t * 6 + i) > 0 ? 1 : 0; for (const dx of [-2, -1, 0, 1, 2]) c.px(x + dx, y - (dx ? f : 0) + (Math.abs(dx) === 2 ? f : 0), "#4A2A44"); }
  const hy = V.Y(HZ + 2);
  for (let i = 0; i < 5; i++) { const wx = 2092 + i * 11 + rnd(i) * 5 + Math.sin(t * 0.3) * 2, x = R(V.X(wx)), y = R(hy) + 2 + (i % 2), dir = i % 2 ? 1 : -1;
    c.rect(x - 3, y - 6, 7, 3, "#F4E2C8"); c.px(x - 1, y - 6, "#3A2A2A"); c.px(x + 1, y - 5, "#3A2A2A"); c.px(x + 3 * dir, y - 7, "#3A2A2A"); c.px(x + 4 * dir, y - 7, "#3A2A2A"); for (const lx of [-3, -1, 1, 3]) c.rect(x + lx, y - 3, 1, 3, "#3A2A2A"); }
}

export function actors(c, V, t) {
  if (!onScreen(V)) return;
  // the elephant: idle breathing, ears, blinks; glances up at its heart on "thirty", at the hero on "yours"
  const ex = R(V.X(EX)), ey = V.Y(EY) + Math.sin(t * 2.4) * 1.5;
  shadow(c, ex, V.Y(LAND) - 2, 150, 9, "#4A1A10", 0.5);
  const look = gaze(t, [[0, [0, 0.12]], [EV.thirty - 0.1, [0.75, -0.75]], [EV.thirty + 0.9, [0, 0.12]], [EV.yours - 0.05, [0.85, 0]], [LV.human[1], [0.85, 0]]], 0.25);
  drawElephant(c, ex, ey, t, { flap: Math.sin(t * 2.2) * 0.07 + Math.sin(t * 0.7) * 0.03, blink: blinkAt(t, 3.9, 0.6), look, happy: sm(t, EV.thirty, EV.thirty + 0.4), rim: RIM });
  sign(c, R(V.X(SIGN4)), R(V.Y(LAND)) + 1, "LV 4", "wood", 1, t);
  // the safari jeep parked behind the hero, the LV 5 sign
  const jx = R(V.X(JEEP)), jy = R(V.Y(LAND));
  if (jx > -80 && jx < 620) { shadow(c, jx, jy, 58, 5, "#4A1A10", 0.45); jeepSprite().blit(c, jx, jy); }
  sign(c, R(V.X(SIGN5)), R(V.Y(LAND)) + 1, "LV 5", "wood", 1, t);
  // the hero: watches the elephant, then on "yours" lays his right mitten on his heart (it glows with his pulse)
  const hx = R(V.X(HX)), hy = R(V.Y(LAND)); if (hx < -80 || hx > 620) return;
  c.tint(hx - 64, hy - 5, 128, 10, (x, y) => { const d = ((x - hx) / 62) ** 2 + ((y - hy) / 4) ** 2; return d < 1 ? 0.42 * (1 - d) : 0; }, "#4A1A10", 3);
  const k = ease((t - T_HAND) / HAND_IN), hand = [lerp(30, 9, k), lerp(-50, -77, k)];
  const hlook = gaze(t, [[0, [-0.8, 0]], [EV.yours - 0.1, [0, 0.05]], [EV.seventy + 0.1, [0.15, 0.35]], [EV.seventy + 0.8, [0, 0.05]]], 0.25);
  drawHeroPose(c, hx, hy, { scale: 2, look: hlook, blink: blinkAt(t, 3.4, 0.5), open: win(t, EV.seventy - 0.05, EV.seventy + 0.6, 0.15, 0.3), hands: { R: hand }, overR: true,
    onChest: (P, S, yb) => {
      // binoculars hanging on a strap, the heart glow under the hand
      const b = P(-11, yb(-70)), g = c;
      for (const s of [-1, 1]) g.line(R(P(s * 14, yb(-92))[0]), R(P(s * 14, yb(-92))[1]), R(b[0] + s * 6), R(b[1] - 4), "#3A2A20");
      for (const s of [-1, 1]) { const cx = b[0] + s * 6, cy = b[1]; for (let j = -7; j <= 9; j++) for (let i = -5; i <= 5; i++) { if (Math.abs(i) === 5 && Math.abs(j) > 5) continue; g.px(R(cx + i), R(cy + j), Math.abs(i) === 5 || j === -7 || j === 9 ? "#141016" : j > 5 ? (i < -1 ? "#5A6A8A" : "#2A3448") : i < -2 ? "#4A4450" : "#2A262E"); } g.px(R(cx - 2), R(cy + 7), "#C8E0FF"); }
      g.rect(R(b[0] - 2), R(b[1] - 3), 5, 4, "#141016");
      const p = pulse("human", t) * sm(t, T_HAND + 0.2, T_HAND + 0.4), hc = P(9, yb(-77));
      if (p > 0.02) { const rr = 15 + 12 * (1 - p); for (let j = -R(rr) - 2; j <= R(rr) + 2; j++) for (let i = -R(rr) - 2; i <= R(rr) + 2; i++) { const d = Math.hypot(i, j), e = Math.abs(d - rr); if (e < 2 && p * (1 - e / 2) * 1.4 > bayer(R(hc[0]) + i, R(hc[1]) + j)) c.px(R(hc[0]) + i, R(hc[1]) + j, e < 0.8 ? "#FFFFFF" : "#FFB4C0"); else if (d < rr - 2 && p * 0.5 * (1 - d / rr) > bayer(R(hc[0]) + i, R(hc[1]) + j)) c.px(R(hc[0]) + i, R(hc[1]) + j, "#FF9AAA"); } }
    },
  });
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  const gy = R(V.Y(LAND));
  for (let i = 0; i < 68; i++) {
    const wx = X0 + 50 + i * 11.7 + rnd(i * 3) * 6, x = V.X(wx); if (x < -10 || x > 550 || wx > 2384) continue; if (Math.abs(wx - EX) < 70 && rnd(i) < 0.6) continue;
    const n = 3 + (i % 3);
    for (let b = 0; b < n; b++) { const h = 8 + rnd(i * 7 + b) * 14, lean = (b - n / 2) * 0.35, sw = Math.sin(t * 1.8 + i * 0.6 + b) * 0.25;
      for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x + b * 2 + (lean + sw) * k * 0.9 * u), gy + 3 - k, u > 0.75 ? "#FCE08A" : u > 0.4 ? "#E8B850" : "#B8822E"); } }
  }
  for (let i = 0; i < 20; i++) {
    const wx = X0 + 60 + i * 40 + rnd(i * 9) * 20, x = V.X(wx), base = R(V.Y(LAND + 300 + (i % 3) * 8)); if (x < -20 || x > 560 || wx > 2380) continue;
    for (let b = 0; b < 7; b++) { const h = 26 + rnd(i * 13 + b) * 30, lean = (b - 3) * 0.3, sw = Math.sin(t * 1.5 + i + b * 0.4) * 0.3;
      for (let k = 0; k < h; k++) { const u = k / h; const xx = R(x + b * 3 + (lean + sw) * k * u); c.px(xx, base - k, u > 0.8 ? "#F0C060" : u > 0.4 ? "#C88A34" : "#8A5420"); c.px(xx + 1, base - k, u > 0.6 ? "#D89A40" : "#6A3E18"); } }
  }
}

export function hud(c, V, t) {
  if (!onScreen(V)) return;
  // the two hearts: elephant (30 BPM) and the hero (70 BPM), each pulsing only on its own beats
  const ea = sm(t, E_IN, E_IN + HEART_FADE), ha = sm(t, H_IN, H_IN + HEART_FADE);
  const ep = [R(V.X(HEART_E[0])), R(V.Y(HEART_E[1]))], hp = [R(V.X(HEART_H[0])), R(V.Y(HEART_H[1]))];
  heart(c, ep[0], ep[1], pulse("elephant", t), ea, 12);
  heart(c, hp[0], hp[1], pulse("human", t), ha, 10);
  // pickups rise from under each heart, then settle into a small rate label in the same place
  pickup(c, ep[0], ep[1] + 48, "30 BPM", (t - EV.thirty) / PICKUP_LIFE);
  pickup(c, hp[0], hp[1] + 48, "70 BPM", (t - EV.seventy) / PICKUP_LIFE);
  for (const [p, txt, t0, a0] of [[ep, "30 BPM", LABEL_T.e, ea], [hp, "70 BPM", LABEL_T.h, ha]]) {
    const a = Math.min(a0, sm(t, t0, t0 + LABEL_FADE)); if (a <= 0) continue; const g = fade(c, a), w = c.measure(MAIN, txt, { scale: 2 }), x = p[0] - R(w / 2), y = p[1] + 24;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) g.text(MAIN, txt, x + dx, y + dy, C.O, { scale: 2 }); g.text(MAIN, txt, x, y, "#FFD0D8", { scale: 2 });
  }
}
