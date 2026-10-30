// LV8 · mouse — at the open door of a red barn on a bright spring day (RANGE BIOME.barn = 3510..4050, camera REST.mouse).
// The meadow's rail fence runs in from the left; green hills and far blue mountains behind (the gorge is near); the big
// barn on the right with its doors swung open (hay bales, a ladder to the loft, a warm lantern on a hook); wheat sacks
// lean on a stack of hay bales in the middle and the grey-brown mouse sits on top of it, facing the camera, the sun
// peeking between its ears; sandstone rocks with red flowers rise at the right edge toward the gorge. The ground is a
// lawn seen at a slant (like the meadow and the gorge) with a dirt track to the barn door.
// Heart: a pixel heart on the mouse's cream belly beats ONLY with pulse("mouse", t): 600 BPM = 10 beats a second, a
// rapid flicker with a ring on every beat. Events: "six hundred" → +600 BPM; "ten every second" → a 10 / SECOND card
// whose ten little hearts light one by one on the mouse's next ten beats (exactly one second).
import { BIOME, LAND, EV, LV, BEATS, pulse } from "../timeline.mjs";
import { pickup, sign, shadow, sm, ease, lerp, rnd, fade, mix, bayer, MAIN, C, blinkAt, clamp01, panel, blob } from "../cute.mjs";
import { worldLayer, frameLight, lit, thick, ditherEll, heart, lawn, lawnFront, R } from "./roofs-kit.mjs";
import { drawMouse, MOUSE_HEAD_Y } from "./mouse-art.mjs";

export const RANGE = BIOME.barn;
const [X0, X1] = RANGE, GY = LAND, MS = 1.5;            // mouse scale in this film
const BARN = { x0: 3812, x1: 4004, wall: -190, door: [3852, 3938], doorTop: -134 };
const BALE = { w: 104, h: 46 }, PERCH = { x: 3780, y: GY - BALE.h };
const P = {
  hill: ["#7CC488", "#92D29A", "#A8DEAE"], mtn: ["#8A9CC0", "#9EAED0", "#C8D4EA", "#F4F8FF"], tree: ["#4E9A5A", "#62AE68"],
  barn: ["#6E1C1A", "#94282A", "#B83A32", "#D45A44"], trim: "#F4EEE0", roof: ["#3A2A2E", "#54383C", "#6E4A4A"],
  dark: ["#1A100A", "#2A1A10", "#3A2618", "#4A3220"], wood: ["#3A2010", "#5A3418", "#7E4E26", "#A06A36", "#C08A50"],
  hay: ["#8A5E18", "#B07E24", "#D8A23A", "#F0C455", "#FBE08A"], sack: ["#6A5434", "#8A7048", "#A88A5E", "#C8AA7A", "#E2C898"],
  rock: ["#7A5A44", "#9A7456", "#B88E68", "#D2A87E", "#E8C49A"], flower: ["#E8344A", "#C82838", "#FF6A7A"],
};

// ---------------------------------------------------------------- static scenery
let SCENE = null, FRONT = null;
function build() {
  FRONT = worldLayer(X0 - 40, GY, X1 - X0 + 80, 340, (g) => lawnFront(g, X0 - 20, X1 + 20, GY));
  SCENE = worldLayer(X0 - 40, -470, X1 - X0 + 80, 790, (g) => {
    const edge = (x) => Math.min(sm(x, X0, X0 + 140), 1 - sm(x, X1 - 60, X1 + 30));
    // far blue mountains on the right (toward the gorge) and rolling green hills, a few round trees on them
    for (let x = X0; x < X1 + 30; x++) {
      const m = sm(x, 3700, 3900), top = GY - 40 - m * (150 + Math.sin(x * 0.021) * 40 + Math.abs(Math.sin(x * 0.047)) * 26);
      for (let y = R(top); y < GY - 30; y++) { const v = y - top; g.px(x, y, v < 10 && top < -170 ? P.mtn[3] : v < 3 ? P.mtn[2] : (x + y) % 13 === 0 ? P.mtn[0] : P.mtn[1]); }
      const e = edge(x), htop = GY - 8 - e * (52 + Math.sin(x * 0.017 + 2) * 18 + Math.sin(x * 0.05) * 6);
      for (let y = R(htop); y < GY + 2; y++) g.px(x, y, y - htop < 3 ? P.hill[2] : (y - htop) / 30 > bayer(x, y) + 0.4 ? P.hill[0] : P.hill[1]);
    }
    for (const [tx, ty, r] of [[3548, -72, 12], [3600, -64, 9], [3696, -78, 14], [3742, -70, 10]]) for (let y = ty - r; y <= ty + r; y++) for (let x = tx - r; x <= tx + r; x++) { const d = Math.hypot(x - tx, (y - ty) * 1.15) / r; if (d <= 1) g.px(x, y, d > 0.8 || x - tx > r * 0.3 ? P.tree[0] : P.tree[1]); }
    // the lawn in front (ground plane at a slant) with a dirt track to the barn door
    lawn(g, X0 - 20, X1 + 20, GY, 314, { path: [(BARN.door[0] + BARN.door[1]) / 2, 3930, 56, -26] });
    // the meadow's rail fence continues in from the left
    for (const px of [3524, 3572, 3620]) { g.rect(px - 2, GY - 46, 5, 48, P.wood[2]); g.rect(px - 2, GY - 46, 2, 48, P.wood[3]); g.rect(px - 3, GY - 48, 7, 3, P.wood[1]); }
    for (const yy of [GY - 38, GY - 20]) { g.rect(X0 - 6, yy, 3632 - X0 + 6, 4, P.wood[2]); g.rect(X0 - 6, yy, 3632 - X0 + 6, 1, P.wood[4]); g.rect(X0 - 6, yy + 3, 3632 - X0 + 6, 1, P.wood[1]); }
    // the barn
    barn(g);
    // sandstone rocks rising at the right seam (toward the gorge), red tube flowers on them
    rocks(g);
    // the hay-bale stack (two at the bottom, one on top) with wheat sacks leaning on it
    for (let y = GY - 4; y < GY + 8; y++) for (let x = PERCH.x - 130; x < PERCH.x + 130; x++) { const d = ((x - PERCH.x) / 130) ** 2 + ((y - GY - 2) / 6) ** 2; if (d < 1 && (1 - d) * 0.5 > bayer(x, y)) g.px(x, y, "#3E7A34"); }
    hayBale(g, PERCH.x - BALE.w, GY - BALE.h, BALE.w, BALE.h); hayBale(g, PERCH.x, GY - BALE.h, BALE.w, BALE.h);
    sack(g, PERCH.x - BALE.w - 18, GY + 2, 58, -2, true); sack(g, PERCH.x - BALE.w + 10, GY + 6, 46, 3, false);
  });
}
function barn(g) {
  const { x0, x1, wall } = BARN, W = x1 - x0, mid = x0 + W / 2;
  for (let x = x0; x < x1; x++) for (let y = wall; y < GY; y++) g.px(x, y, (x - x0) % 9 === 0 ? P.barn[1] : (x - x0) % 9 === 1 ? P.barn[3] : y < wall + 7 ? P.barn[1] : P.barn[2]);
  const roof = [[x0 - 10, wall + 2], [x0 + 18, wall - 62], [mid, wall - 108], [x1 - 18, wall - 62], [x1 + 10, wall + 2]];
  g.poly(roof, P.roof[1]);
  for (let y = wall - 106; y < wall + 2; y += 6) for (let x = x0 - 10; x < x1 + 10; x++) if (g.has(x, y) && rnd(x >> 3) < 2) g.px(x, y, P.roof[0]);
  for (let i = 0; i < roof.length - 1; i++) { thick(g, [roof[i], roof[i + 1]], 1, P.trim); g.line(R(roof[i][0]), R(roof[i][1]) + 2, R(roof[i + 1][0]), R(roof[i + 1][1]) + 2, P.roof[2]); }
  g.rect(x0, wall, 4, GY - wall, P.trim); g.rect(x1 - 4, wall, 4, GY - wall, P.trim); g.rect(x0, wall, W, 3, P.trim);
  // loft door with hay and a hoist beam
  const lw = 34, lx = R(mid - lw / 2), ly = wall - 52;
  g.rect(lx, ly, lw, 34, P.dark[1]); g.frame(lx - 2, ly - 2, lw + 4, 38, P.trim); g.frame(lx - 1, ly - 1, lw + 2, 36, P.trim);
  for (let i = 0; i < 26; i++) { const hx = lx + 2 + rnd(i + 900) * (lw - 4), hy = ly + 20 + rnd(i + 901) * 13; g.line(R(hx), R(hy), R(hx + (rnd(i + 902) - 0.5) * 9), R(hy + 4 + rnd(i + 903) * 6), i % 3 ? P.hay[3] : P.hay[4]); }
  g.rect(R(mid) - 3, ly - 14, 6, 10, P.wood[1]); g.rect(R(mid) - 22, ly - 16, 44, 4, P.wood[2]); g.line(R(mid) + 18, ly - 12, R(mid) + 18, ly + 6, "#C8A878");
  // the open doorway: dark interior, hay bales stacked inside, a loft ladder, a warm glow from inside
  const [d0, d1] = BARN.door, dt = BARN.doorTop;
  for (let y = dt; y < GY; y++) for (let x = d0; x < d1; x++) { const v = (y - dt) / (GY - dt); g.px(x, y, v > 0.9 ? P.dark[3] : rnd(x * 3 + y * 17) < 0.06 ? P.dark[2] : P.dark[1]); }
  for (const [bx, by, bw] of [[d0 + 4, GY - 34, 40], [d0 + 44, GY - 34, 38], [d0 + 22, GY - 66, 42], [d0 + 52, GY - 66, 30]]) hayBale(g, bx, by, bw, 32, 0.55);
  for (const x of [d1 - 16, d1 - 6]) g.rect(x, dt + 4, 2, GY - dt - 70, P.wood[2]); for (let y = dt + 10; y < GY - 70; y += 10) g.rect(d1 - 16, y, 12, 2, P.wood[3]);
  for (let y = dt; y < GY; y++) for (let x = d0; x < d1; x++) { const d = Math.hypot((x - (d0 + d1) / 2) / 50, (y - (GY - 40)) / 70); if (d < 1 && (1 - d) * 0.5 > bayer(x, y) + 0.1) g.px(x, y, mix(g.get(x, y), "#FFB84A", 0.28)); }
  g.rect(d0 - 4, dt - 4, d1 - d0 + 8, 4, P.trim); g.rect(d0 - 4, dt, 4, GY - dt, P.trim); g.rect(d1, dt, 4, GY - dt, P.trim);
  // door leaves swung open against the wall, white X braces
  for (const [a, b] of [[x0 + 6, d0 - 4], [d1 + 4, x1 - 6]]) {
    g.rect(a, dt + 2, b - a, GY - dt - 2, P.barn[1]); for (let x = a; x < b; x += 8) g.rect(x, dt + 2, 1, GY - dt - 2, P.barn[0]);
    g.frame(a, dt + 2, b - a, GY - dt - 2, P.trim); g.line(a + 1, dt + 3, b - 2, GY - 2, P.trim); g.line(b - 2, dt + 3, a + 1, GY - 2, P.trim);
  }
  // the lantern hook (the lantern itself is live)
  g.rect(d0 - 14, dt - 22, 12, 2, P.wood[0]); g.rect(d0 - 14, dt - 22, 2, 6, P.wood[0]);
}
function hayBale(g, x, y, w, h, shade = 0) {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const u = (xx - x) / w, v = (yy - y) / h, edge = xx === x || xx === x + w - 1 || yy === y || yy === y + h - 1;
    let k = edge ? 0 : v < 0.12 ? 4 : u < 0.1 ? 3 : u > 0.88 || v > 0.84 ? 1 : 2; if (!edge && rnd(xx * 5 + yy * 11) < 0.22) k = Math.max(1, k - 1); if (!edge && rnd(xx * 13 + yy * 7) < 0.06) k = 4;
    g.px(xx, yy, shade ? mix(P.hay[k], "#2A1A10", shade) : P.hay[k]);
  }
  for (const tx of [x + R(w * 0.3), x + R(w * 0.7)]) for (let yy = y; yy < y + h; yy++) g.px(tx, yy, shade ? mix("#6A4A2A", "#2A1A10", shade) : "#6A4A2A");
  for (let i = 0; i < 6; i++) { const sx = x + rnd(i + x) * w, sy = y + (rnd(i + y) < 0.5 ? 0 : h - 1); g.line(R(sx), R(sy), R(sx + (rnd(i * 3 + x) - 0.5) * 8), R(sy + (sy === y ? -4 : 4)), shade ? mix(P.hay[3], "#2A1A10", shade) : P.hay[3]); }
}
function rocks(g) {
  const shapes = [[3996, GY, 34, 56], [4024, GY, 30, 92], [4046, GY, 26, 128]];
  for (const [cx, base, rw, rh] of shapes) for (let y = base - rh; y <= base + 4; y++) for (let x = cx - rw; x <= cx + rw; x++) {
    const u = (x - cx) / rw, v = (base - y) / rh, top = 1 - u * u * 0.9 - Math.abs(Math.sin(x * 0.3)) * 0.05; if (v > top || v < -0.05) continue;
    const strata = Math.floor((y + Math.sin(x * 0.12) * 3) / 7) % 3, lit = u < -0.35 ? 1 : u > 0.5 ? -1 : 0;
    g.px(x, y, P.rock[Math.max(0, Math.min(4, 2 + lit + (strata === 0 ? -1 : 0) + (v > top - 0.06 ? 1 : 0)))]);
  }
  for (let i = 0; i < 9; i++) { const x = 3984 + rnd(i + 400) * 70, y = GY - 20 - rnd(i + 401) * 90; if (!g.has(R(x), R(y))) continue; g.line(R(x), R(y), R(x), R(y) - 6, "#4E8A3A"); for (let k = 0; k < 3; k++) { g.px(R(x) - 1 + k, R(y) - 7 - k, P.flower[k % 2]); g.px(R(x) + k, R(y) - 8 - k, P.flower[0]); } }
}

// ---------------------------------------------------------------- per-frame props
function lantern(c, x, y, t, night) {
  const fl = 0.8 + 0.2 * Math.sin(t * 13.1) * Math.sin(t * 4.3);
  ditherEll(fade(c, 0.35 + 0.3 * night), x, y + 4, 16, 14, "#FFD27A", 0.55 * fl);
  c.line(x, y - 12, x, y - 6, "#2A2A30"); c.rect(x - 5, y - 6, 11, 3, "#3A3A44"); c.rect(x - 4, y - 3, 9, 12, "#3A3A44");
  c.rect(x - 3, y - 2, 7, 10, mix("#FFC860", "#FFF0B0", fl)); c.rect(x - 1, y + 1, 3, 5, "#FFFFFF"); c.rect(x - 5, y + 9, 11, 2, "#3A3A44");
}
const SACKR = ["#3A2E1C", "#5A4630", "#7A6244", "#9A7E58", "#B8986C", "#CCAE80", "#DEC496", "#EED8B0"];
function sack(g, x, y, h, tilt, open) {
  const pts = [[x - 16, y], [x - 19, y - h * 0.45], [x - 13 + tilt, y - h * 0.92], [x + tilt, y - h], [x + 13 + tilt, y - h * 0.92], [x + 19, y - h * 0.45], [x + 16, y]];
  blob(g, [pts], { ramp: SACKR, thick: 12, base: 2.8, gain: 2.2, outline: SACKR[0], litOutline: SACKR[5] });
  for (let i = 0; i < 5; i++) g.line(R(x - 10 + i * 5), R(y - 4), R(x - 12 + i * 5 + tilt * 0.5), R(y - h * 0.7), SACKR[3]);
  if (open) { g.ellipse(R(x + tilt), R(y - h), 11, 3, P.hay[2]); for (let i = 0; i < 12; i++) g.px(R(x + tilt - 9 + rnd(i) * 18), R(y - h - 2 + rnd(i + 3) * 4), P.hay[4]); for (let i = 0; i < 8; i++) g.px(R(x + 14 + rnd(i + 20) * 14), R(y - 1 - rnd(i + 21) * 2), P.hay[3]); }
  else { g.rect(R(x + tilt - 8), R(y - h * 0.8), 16, 3, "#C8A878"); g.rect(R(x + tilt - 8), R(y - h * 0.8) + 2, 16, 1, "#8A6A48"); }
}
const tenBeats = BEATS.filter((b) => b.who === "mouse" && b.t >= EV.ten - 0.02).slice(0, 10).map((b) => b.t);
/** Timing of every motion in this level (seconds, from the word timings and BEATS); levels/cat-motions.mjs reads it too. */
export const BT = {
  heartIn: [EV.mouse + 0.05, EV.mouse + 0.3], heartOut: [LV.mouse[1] + 0.3, LV.mouse[1] + 0.7], pick: EV.sixHundred,
  excited: [EV.sixHundred, EV.sixHundred + 0.25], calm: [EV.sixHundred + 0.8, EV.sixHundred + 1.1], card: [EV.ten - 0.2, EV.ten], cardOut: [LV.mouse[1] - 0.15, LV.mouse[1] + 0.2],
  ticks: tenBeats, tickLight: 0.06, look: [EV.ten + 0.1, EV.ten + 1.25],
};

// ---------------------------------------------------------------- layers
const vis = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!vis(V)) return; if (!SCENE) build();
  SCENE.blit(c, V, { lut: frameLight(V).lut });
}
export function actors(c, V, t) {
  if (!vis(V)) return;
  const L = frameLight(V), g = lit(c, L.mul), X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  lantern(g, X(BARN.door[0] - 14), Y(BARN.doorTop - 4), t, L.night);
  sign(g, X(3640), Y(GY) + 1, "LV 8", "wood", 1, t);
  // the mouse: sniffing, breathing, blinking; looks at the 10 / SECOND card while its hearts light
  const w6 = sm(t, EV.sixHundred - 0.2, EV.sixHundred) * (1 - sm(t, EV.sixHundred + 0.5, EV.sixHundred + 0.7)), w10 = sm(t, BT.look[0], BT.look[0] + 0.2) * (1 - sm(t, BT.look[1], BT.look[1] + 0.2));
  const base = [0.15 * Math.sin(t * 0.7) * (1 - w6), 0.1 * (1 - w6)], look = [lerp(base[0], -0.1, w10), lerp(base[1], -0.9, w10)];   // eyes glide, never jump
  const sniff = R(Math.sin(t * 2 * Math.PI * 5.5) * 0.9 * (0.5 + 0.5 * Math.sin(t * 1.1)));
  const excited = Math.min(sm(t, ...BT.excited), 1 - sm(t, ...BT.calm));
  shadow(g, X(PERCH.x), Y(PERCH.y) + 1, 66, 5, "#5A3A10", 0.4);
  const m = drawMouse(g, X(PERCH.x), Y(PERCH.y), { s: MS, t, look, blink: blinkAt(t, 3.1, 0.7), sniff, open: excited * 0.5, ears: excited * 0.25 });
  // the heart on its cream belly, beating only with pulse("mouse", t)
  const ha = Math.min(sm(t, ...BT.heartIn), 1 - sm(t, ...BT.heartOut));
  if (ha > 0) heart(c, X(PERCH.x), Y(PERCH.y) - R(36 * MS), 11, pulse("mouse", t), ha);
}
export function front(c, V, t) {
  if (!vis(V)) return;
  FRONT.blit(c, V, { lut: frameLight(V).lut });
}
export function hud(c, V, t) {
  if (!vis(V)) return;
  const X = (wx) => R(V.X(wx)), Y = (wy) => R(V.Y(wy));
  const kp = (t - BT.pick) / 1.6; if (kp > 0 && kp < 1) pickup(c, X(PERCH.x) + 152, Y(PERCH.y) - R(MOUSE_HEAD_Y * MS) - 120, "600 BPM", kp);
  // the 10 / SECOND card: ten little hearts light one by one on the mouse's next ten beats
  const ca = Math.min(sm(t, ...BT.card), 1 - sm(t, ...BT.cardOut));
  if (ca <= 0) return;
  const w = 256, h = 74, x = R(X(PERCH.x) - w / 2), y = 204, g = fade(c, ca);
  panel(c, x, y, w, h, ca, C.PK);
  const txt = "10 / SECOND", tw = c.measure(MAIN, txt, { scale: 2 });
  g.text(MAIN, txt, R(x + w / 2 - tw / 2) + 1, y + 9, C.O, { scale: 2 }); g.text(MAIN, txt, R(x + w / 2 - tw / 2), y + 8, C.IV, { scale: 2 });
  for (let i = 0; i < 10; i++) {
    const hx = x + 34 + i * 21, hy = y + 50, on = tenBeats[i] != null ? clamp01((t - tenBeats[i]) / BT.tickLight) : 0;
    if (on <= 0) { heart(c, hx, hy, 7, 0, ca * 0.35); continue; }
    heart(c, hx, hy, 7, Math.max(0, 1 - (t - tenBeats[i]) / 0.25) * 0.8, ca * (0.35 + 0.65 * on));
  }
}
