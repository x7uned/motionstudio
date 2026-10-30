// LV2 · SAVANNA — a quick sunny-day level (RANGE BIOME.savanna = 540..1080; REST.lion {810, −180}: the ground line
// LAND is at screen y 640). Golden grass plain to a hazy horizon, a big flat-topped acacia on the left with weaver birds,
// far acacias, a far wildebeest herd grazing on the horizon, a termite mound on the right, warm earth strata below the
// grass (down to the bottom of the frame) and tall golden grass tufts in front. The sand of the ocean's beach turns into
// grass at the left edge; on the right the grass turns green and the far plain dips to the river's far bank, reeds lead
// into the hippo river (ground y = LAND at both edges). The cute chibi lion already sits facing the camera, its mane
// framed by the midday sun, as the camera arrives. "Lions" → it draws breath and gives a big cute ROAR (mouth wide open,
// eyes squeezed shut, mane puffing out, roar rings, grass bending away, the birds take off, the far herd bolts);
// "…a hundred" → it settles into a proud happy grin with a twinkle. Pure function of t: every change is eased.
import { BIOME, EV, LV, LAND } from "../timeline.mjs";
import { sign, blinkAt, ease, win, fade, mix, bayer, blob, ell, bez } from "../cute.mjs";
import { R, clamp01, sm, rnd, worldLayer, profile, gaze, thick, popEase, HZ, farHz, farLandCol, farNear, earthCol, hex } from "./ocean-kit.mjs";
import { drawLion, lionIcon, LION } from "./savanna-lion.mjs";

export const RANGE = BIOME.savanna;
const [X0, X1] = RANGE;
const LX = 810, LHY = LAND - LION.GROUND;      // lion: x and head centre (world) → screen (270, 426) at REST
const SIGN_X = 668, TREE_X = 594, MOUND_X = 988, BANK = 1010;   // LV sign, big acacia, termite mound, where the river bank begins

// ---------------------------------------------------------------- timing (all from words)
const INHALE = [EV.lions - 0.08, EV.lions + 0.14];                  // draws breath, head tips back
const OPEN = [EV.lions + 0.1, EV.lions + 0.3];                      // the roar opens
const CLOSE = [EV.hundred1 - 0.34, EV.hundred1 - 0.08];             // …and closes
const PROUD = [EV.hundred1 - 0.14, EV.hundred1 + 0.22];             // proud happy grin (stays)
const TWINKLE = [EV.hundred1 + 0.02, EV.hundred1 + 0.62];
const BIRDS = EV.lions + 0.2, HERD_RUN = EV.lions + 0.3;
/** Timing shared with levels/savanna-motions.mjs (sound) — the picture reads the same values. */
export const TIMING = { INHALE, OPEN, CLOSE, PROUD, TWINKLE, BIRDS, HERD_RUN, RING_EVERY: 0.24 };
/** Roar amount 0..1 (with a little jaw tremble while held) and mane puff. */
function roarAt(t) { if (t < OPEN[0] || t > CLOSE[1]) return 0; const up = ease((t - OPEN[0]) / (OPEN[1] - OPEN[0])), down = ease((t - CLOSE[0]) / (CLOSE[1] - CLOSE[0])); return up * (1 - down) * (0.95 + 0.05 * Math.sin(t * 38)); }
function puffAt(t) { if (t < OPEN[0] || t > CLOSE[1] + 0.3) return 0; const up = popEase((t - OPEN[0]) / 0.3, 0.2), down = ease((t - CLOSE[0]) / (CLOSE[1] - CLOSE[0] + 0.3)); return Math.max(0, up * (1 - down)) * (0.94 + 0.06 * Math.sin(t * 24)); }
/** How hard the roar pushes the world away (grass, dust), 0..1. */
const pushAt = (t) => sm(t, OPEN[0] + 0.05, OPEN[1] + 0.05) * (1 - sm(t, CLOSE[0] - 0.05, CLOSE[1] + 0.25));

// ---------------------------------------------------------------- static scenery (one world layer, painted once)
const GRASS = ["#5A3E10", "#8A6418", "#B48A24", "#D2A834", "#E6C04A", "#F2D670", "#FAE79C"];
// the river's left bank (levels/river-world.mjs, afternoon look) for a seamless right edge
const RGRASS = ["#2E4A1C", "#4A6E28", "#6A9234", "#8EB444", "#B6D266"];
const RSOIL = ["#6A4428", "#5E3C24", "#74492A", "#563420", "#6C4428", "#7E5232"];
function riverSoil(wx, wy, d) {
  const wv = Math.sin(wx * 0.029) * 5 + Math.sin(wx * 0.12) * 2, v = (wy + wv + 400) / 19, band = Math.floor(v), f = v - band, i = ((band % 6) + 6) % 6;
  let col = RSOIL[i]; if (f < 0.1 && bayer(wx, wy) > 0.35) col = mix(col, "#2A1408", 0.3);
  if (wy > 60) col = mix(col, "#24140C", Math.min(0.4, (wy - 60) / 700));
  return col;
}
const RIVER_FAR = (x) => -46 + Math.sin(x * 0.045) * 1.6 + Math.sin(x * 0.13) * 0.7;   // the river's far bank line
/** Far horizon of this level: the shared far plain, dipping at the right edge to the river's far bank. */
const hzLine = (wx) => { const k = sm(wx, 940, 1066); return farHz(wx) * (1 - k) + RIVER_FAR(wx) * k; };
const greenK = (wx) => sm(wx, BANK - 40, BANK + 50);           // golden → green grass toward the river
const sandK = (wx) => 1 - sm(wx, X0 + 4, X0 + 56);             // beach sand → grass at the left edge

function acacia(g, x, y, h, w, col, lit, tr) {
  tr = tr ?? Math.max(1, R(h / 30));
  for (const [dx, k] of [[-w * 0.32, 0.64], [w * 0.28, 0.72], [0, 0.52]]) thick(g, bez([x, y], [x + dx * 0.15, y - h * 0.45], [x + dx, y - h * k], 14), tr, col);
  const cy = y - h * 0.8;
  for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.15], [-w * 0.46, w * 0.05, w * 0.5, w * 0.12], [w * 0.5, w * 0.06, w * 0.48, w * 0.12], [w * 0.1, -w * 0.07, w * 0.6, w * 0.12]])
    for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) {
      const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1 || ((xx * 7 + yy * 3) % 5 === 0 && d > 0.75)) continue;
      g.px(xx, yy, lit && yy < cy + dy - ry * 0.4 ? lit : col);
    }
}
function paint(g, L, T) {
  const px = (wx, wy, col) => g.px(L(wx), T(wy), col);
  // far plain (shared with the ocean's far bluff) → near the river: the river's far bank and its far water band
  for (let wx = X0; wx < X1; wx++) {
    const top = R(hzLine(wx)), rk = sm(wx, 1000, 1070);
    for (let wy = top; wy < LAND + 2; wy++) {
      let col = farLandCol(wx, Math.max(wy, farHz(wx)));
      if (rk > 0) {
        const d = wy - top, bank = d < 1 ? "#DCE6A8" : d < 3 ? "#8EAA5A" : d / 10 > bayer(wx, wy) ? "#5E7A3E" : "#6E8A46";
        const v = (wy + 34) / 34, water = wy < -34 ? null : v < 0.3 ? "#E4F0F0" : v < 0.6 ? ((v - 0.3) / 0.3 > bayer(wx, wy) ? "#B4D6DC" : "#E4F0F0") : "#B4D6DC";
        const rc = water && wy >= -34 ? (wy === -34 ? "#4E6A34" : water) : bank;
        if (rk > bayer(wx + 1, wy + 2) * 0.98) col = rc;
      }
      px(wx, wy, col);
    }
  }
  // far acacias on the horizon, a far grove at the right
  for (const [wx, h, w] of [[700, 26, 20], [742, 16, 12], [930, 22, 17], [968, 14, 11]]) acacia(g, L(wx), T(hzLine(wx) + 1), h, w, mix("#9A9A6A", "#C8C8A8", 0.3), mix("#B0B080", "#D8D8BC", 0.3));
  for (let i = 0; i < 30; i++) { const wx = 600 + rnd(i * 7) * 400, v = Math.pow(rnd(i * 3 + 1), 1.5), wy = HZ + 5 + v * (LAND - HZ - 12), r = 1.5 + v * 5, col = mix("#A89A50", "#5E6A28", v); if (wy < hzLine(wx) + 3 || wy > LAND - 6) continue;
    for (let y = -r * 0.7; y <= 0; y++) for (let x = -r * 1.5; x <= r * 1.5; x++) if ((x / (r * 1.5)) ** 2 + (y / (r * 0.7)) ** 2 <= 1) px(R(wx + x), R(wy + y), y < -r * 0.4 ? mix(col, "#FFF0A0", 0.3) : col); }
  // the big acacia on the left (mid-ground, standing on the plain just behind the grass lip)
  acacia(g, L(TREE_X), T(LAND - 6), 156, 62, "#4A3A1E", null, 3);
  { const x = L(TREE_X), cy = T(LAND - 6 - 156 * 0.8), w = 62;
    for (const [dx, dy, rx, ry] of [[0, 0, w, w * 0.17], [-w * 0.46, w * 0.06, w * 0.52, w * 0.14], [w * 0.5, w * 0.06, w * 0.5, w * 0.14], [w * 0.1, -w * 0.08, w * 0.62, w * 0.14]])
      for (let yy = R(cy + dy - ry); yy <= R(cy + dy + ry); yy++) for (let xx = R(x + dx - rx); xx <= R(x + dx + rx); xx++) {
        const d = ((xx - x - dx) / rx) ** 2 + ((yy - cy - dy) / ry) ** 2; if (d > 1 || (rnd(xx * 7 + yy * 13) < 0.12 && d > 0.7)) continue;
        const top = (yy - (cy + dy - ry)) / (2 * ry); g.px(xx, yy, d > 0.86 ? "#24361A" : top < 0.3 ? (bayer(xx, yy) < 0.5 ? "#8EAE46" : "#7A9A3C") : top < 0.6 ? "#5E7E30" : "#3E5A22");
      }
    // weaver nests hanging under the crown
    for (const dx of [-30, 8, 34]) { const nx = x + dx, ny = cy + w * 0.16; for (let j = 0; j < 7; j++) for (let i = -3; i <= 3; i++) if (i * i + (j - 3) ** 2 * 0.7 < 10) g.px(nx + i, ny + j, j < 2 ? "#C8A050" : (i + j) % 2 ? "#A07A34" : "#8A6428"); g.px(nx, ny + 7, "#3A2810"); }
  }
  // the termite mound on the right: a tall clay tower with spires
  { const x = L(MOUND_X), y = T(LAND + 2), RAMPM = ["#3A1A0C", "#5E2C14", "#82401E", "#A2582A", "#BC703A", "#D08A4C", "#E0A464", "#ECC084"];
    blob(g, [smooth3([[x - 24, y], [x - 20, y - 22], [x - 14, y - 44], [x - 8, y - 66], [x - 2, y - 74], [x + 4, y - 70], [x + 8, y - 52], [x + 16, y - 40], [x + 20, y - 54], [x + 25, y - 50], [x + 24, y - 24], [x + 28, y]])], { ramp: RAMPM, thick: 12, base: 3.0, gain: 2.0, outline: "#2A1006", litOutline: "#F4D0A0" });
    for (let i = 0; i < 18; i++) { const yy = y - 6 - rnd(i * 3) * 60, xx = x - 12 + rnd(i * 5) * 26; if (g.has(R(xx), R(yy)) && g.has(R(xx) + 2, R(yy))) { g.px(R(xx), R(yy), "#6A3418"); g.px(R(xx) + 1, R(yy), "#E0A464"); } }
  }
  // the ground: sand lip at the beach edge → golden grass lip → green bank grass; earth strata below (river soil at the right)
  for (let wx = X0; wx < X1; wx++) {
    const gk = greenK(wx), sk = sandK(wx), rk = sm(wx, 1012, 1076);
    for (let wy = LAND; wy < 440; wy++) {
      const d = wy - LAND, b = bayer(wx, wy); let col = earthCol(wx, wy, LAND);
      if (rk > 0 && rk > bayer(wx + 3, wy + 1) * 0.98) col = riverSoil(wx, wy, d);
      if (d < 2) col = sk > b ? (d < 1 ? "#FCEBC4" : "#F4DCA6") : mix(d < 1 ? GRASS[6] : GRASS[5], d < 1 ? RGRASS[4] : RGRASS[3], gk);
      else if (d < 6 + Math.sin(wx * 0.37) * 1.5) col = sk > b ? (d < 4 ? "#EBCB8E" : col) : mix(d < 4 ? GRASS[3] : GRASS[2], d < 4 ? RGRASS[2] : RGRASS[1], gk);
      else if (d < 9 && (d - 6) / 3 < b && sk < b) col = mix(GRASS[1], RGRASS[1], gk);
      px(wx, wy, col);
    }
  }
  // termite tunnels winding down from the mound, with little chambers
  for (let k = 0; k < 2; k++) { let x = MOUND_X - 6 + k * 12, y = LAND + 6; for (let j = 0; j < 90 + k * 40; j++) { for (const dx of [0, 1]) px(R(x) + dx, R(y), mix(earthCol(R(x) + dx, R(y), LAND), "#2A1006", 0.5)); x += Math.sin(j * 0.07 + k * 2) * 0.45; y += 0.8;
    if (j === 50 + k * 30) for (let q = -5; q <= 5; q++) for (let w = -3; w <= 3; w++) if (q * q / 25 + w * w / 9 <= 1) px(R(x) + q, R(y) + w, mix(earthCol(R(x) + q, R(y) + w, LAND), "#2A1006", w < 0 ? 0.6 : 0.45)); } }
  // roots and pebbles in the cut face
  for (let i = 0; i < 12; i++) { let x = X0 + 40 + rnd(i * 3) * 440, y = LAND + 8; for (let k = 0; k < 10 + rnd(i) * 18; k++) { px(R(x), R(y), "#5A3214"); x += (rnd(i * 50 + k) - 0.5) * 2; y += 1; } }
  for (let i = 0; i < 9; i++) { const wx = X0 + 30 + rnd(i * 7 + 1) * 480, wy = 40 + rnd(i * 5) * 260, r = 3 + rnd(i) * 5; blob(g, [ell(L(wx), T(wy), r * 1.4, r)], { ramp: ["#2A1A14", "#4A3024", "#6A4838", "#8A604E", "#A67A66", "#C09480", "#D6AE9A", "#EACAB8"], thick: 4 }); }
}
function smooth3(pts) { const out = []; for (let i = 0; i < pts.length - 1; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; for (let k = 0; k < 4; k++) out.push([ax + ((bx - ax) * k) / 4, ay + ((by - ay) * k) / 4]); } out.push(pts[pts.length - 1]); return out; }
let BACK = null;
const backLayer = () => (BACK ??= worldLayer(X0, -300, X1 - X0, 740, paint));

// ---------------------------------------------------------------- layers
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
export function back(c, V, t) {
  if (!onScreen(V)) return;
  backLayer().blit(c, V, { x0: Math.max(0, R(V.X(X0))), x1: Math.min(c.w, R(V.X(X1))) });
  herd(c, V, t);
}
/** World x of far wildebeest i at t: grazing and ambling; the roar sends them galloping off to the right (gone by x 1000). */
export function herdX(i, t) {
  const run = Math.max(0, t - HERD_RUN), dist = run > 0 ? (70 * run * run) / (run + 0.6) : 0;
  return 868 + i * 11 + rnd(i) * 6 + Math.sin(t * 0.3 + i) * 2 + t * 1.5 + dist * (0.85 + rnd(i * 3) * 0.3);
}
export const NHERD = 7, HERD_GONE = 1000;
/** Far wildebeest on the horizon. */
function herd(c, V, t) {
  const run = Math.max(0, t - HERD_RUN);
  for (let i = 0; i < NHERD; i++) {
    const wx = herdX(i, t); if (wx > HERD_GONE) continue;
    const x = R(V.X(wx)), y = R(V.Y(hzLine(wx) + 3 + (i % 2))); if (x < -12 || x > c.w + 12) continue;
    const a = 1 - sm(wx, HERD_GONE - 40, HERD_GONE), g = fade(c, a), gallop = run > 0 ? Math.sin(t * 16 + i) : 0, graze = run > 0 ? 0 : (Math.sin(t * 0.8 + i * 1.7) > 0.4 ? 1 : 0), col = "#6E6448";
    g.rect(x - 3, y - 5 + R(gallop * 0.6), 7, 3, col); g.px(x + 4, y - 6 + graze * 2 + R(gallop * 0.6), col); g.px(x + 5, y - 5 + graze * 2, col); g.px(x + 4, y - 7 + graze * 2, "#4A4030");
    for (const [lx, ph] of [[-3, 0], [-1, 1], [1, 0], [3, 1]]) { const lift = run > 0 && ((ph + R(t * 10 + i)) % 2) ? 1 : 0; g.rect(x + lx, y - 2 - lift, 1, 2, col); }
  }
}

function lionPose(V, t) {
  const roar = roarAt(t), puff = puffAt(t), proud = sm(t, PROUD[0], PROUD[1]);
  const inhale = win(t, INHALE[0], OPEN[1], 0.18, 0.15), breath = Math.sin(t * 2.3) * 1.2;
  const head = [R(Math.sin(t * 31) * roar * 1.2), R(-3 * inhale - 4 * roar - 2 * proud + breath)];
  const look = gaze(t, [[0, [-0.45, 0.1]], [EV.lions - 0.5, [0, 0.12]], [PROUD[0], [0.2, -0.3]]], 0.2);
  const earTw = Math.sin(t * 9) * (Math.sin(t * 0.9 + 1) > 0.85 ? 2 : 0) - 2 * puff;
  const squint = win(t, OPEN[0] + 0.05, PROUD[1], 0.12, 0.05);   // eyes stay shut from the roar into the proud grin
  return { x: V.X(LX), y: V.Y(LHY), roar, puff, proud, head, look, squint, blink: blinkAt(t, 3.4, 0.9) * (1 - roar) * (1 - proud), ear: earTw, tail: Math.sin(t * 1.4) * 2.4 + puff * 1.5 };
}
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const P = lionPose(V, t);
  if (P.x < -260 || P.x > 820) { signNow(c, V, t); return; }
  // soft contact shadow
  c.tint(R(P.x - 120), R(V.Y(LAND)) - 7, 250, 14, (X, Y) => { const d = ((X - P.x - 6) / 118) ** 2 + ((Y - V.Y(LAND) + 1) / 6) ** 2; return d >= 1 ? 0 : 0.42 * (1 - d); }, "#3A1A06", 3);
  roarRings(c, P, t, "back");
  drawLion(c, P.x, P.y, P);
  roarRings(c, P, t, "front");
  twinkle(c, P, t);
  signNow(c, V, t);
  birds(c, V, t);
}
function signNow(c, V, t) { const x = R(V.X(SIGN_X)); if (x > -60 && x < 600) sign(c, x, R(V.Y(LAND)) + 1, "LV 2", "wood", 1, t); }

/** Roar rings: arcs bursting out from the mouth to both sides, and short action lines around the mane. */
function roarRings(c, P, t, part) {
  const k = pushAt(t); if (k <= 0) return;
  const mx = P.x + P.head[0], my = P.y + P.head[1] + 52;
  if (part === "back") return;
  for (let n = 0; n < 3; n++) {
    const u = ((t - OPEN[0]) / TIMING.RING_EVERY + n / 3) % 1, r = 118 + u * 120, a = k * Math.min(1, (1 - u) * 1.6) * (u < 0.1 ? u / 0.1 : 1); if (a <= 0.02) continue;
    for (const sd of [-1, 1]) for (let i = 0; i <= 70; i++) {
      const ang = (-0.5 + 1.0 * (i / 70)), x = R(mx + sd * Math.cos(ang) * r), y = R(my - 26 + Math.sin(ang) * r * 1.05), e = Math.abs(i / 70 - 0.5) * 2;
      const vis = a * (1 - e * e * 0.8); if (vis < 0.12 || (vis < 0.6 && (i >> 2) % 2)) continue; c.px(x - sd, y, "#7A3010"); c.px(x, y, "#FFFFFF"); c.px(x + sd, y, "#FFFFFF"); c.px(x + 2 * sd, y, "#FFE8B0"); c.px(x + 3 * sd, y, "#7A3010");
    }
  }
  // action lines around the mane
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI * 0.95 + (i / 9) * Math.PI * 0.9 * 1 + (i > 4 ? Math.PI * 0.1 : 0), ph = ((t * 6 + i * 0.37) % 1), r0 = 112 + ph * 26, len = 10 + 6 * (1 - ph), a = k * (1 - ph);
    if (Math.sin(ang) > 0.3) continue;
    for (let j = 0; j < len; j++) { const x = R(P.x + Math.cos(ang) * (r0 + j)), y = R(P.y + P.head[1] + 6 + Math.sin(ang) * (r0 + j)); if (a > bayer(x, y)) { c.px(x, y, "#FFFFFF"); c.px(x + 1, y, "#E89A50"); } }
  }
  // dust kicked up at the paws
  for (let i = 0; i < 16; i++) { const sd = i % 2 ? 1 : -1, u = ((t * 1.8 + i / 16) % 1), x = R(P.x + sd * (90 + u * 120 + rnd(i) * 20)), y = R(P.y + LION.GROUND - 2 - Math.sin(u * Math.PI) * (6 + rnd(i * 3) * 10)), a = k * (1 - u); if (a > bayer(x, y)) { c.px(x, y, "#F2DCA0"); c.px(x + 1, y, "#D8B878"); } }
}
function twinkle(c, P, t) {
  const a = win(t, TWINKLE[0], TWINKLE[1], 0.12, 0.3); if (a <= 0) return;
  const g = fade(c, a), x = R(P.x + 72), y = R(P.y + P.head[1] - 62), s = 2 + R(3 * Math.sin(Math.PI * clamp01((t - TWINKLE[0]) / (TWINKLE[1] - TWINKLE[0]))));
  for (let k = -s * 2; k <= s * 2; k++) { g.px(x + k, y, Math.abs(k) < s ? "#FFFFFF" : "#FFE070"); g.px(x, y + k, Math.abs(k) < s ? "#FFFFFF" : "#FFE070"); }
  g.px(x - 1, y - 1, "#FFF6C8"); g.px(x + 1, y + 1, "#FFF6C8"); g.px(x + 1, y - 1, "#FFF6C8"); g.px(x - 1, y + 1, "#FFF6C8");
}
/** World position of weaver bird i at t (perched in the acacia until the roar, then flying away up-left). */
export function birdAt(i, t) {
  const u = Math.max(0, t - BIRDS - i * 0.07), x0 = TREE_X - 40 + i * 24, y0 = LAND - 6 - 156 * 0.8 - 14 + (i % 2) * 2;
  return { x: x0 - u * (60 + i * 14) - u * u * 20, y: y0 - u * (70 + i * 10) + Math.sin(u * 6 + i) * 3, flying: u > 0 };
}
export const NBIRDS = 4;
/** Weaver birds: perched in the acacia, they take off when the lion roars and fly away up-left. */
function birds(c, V, t) {
  for (let i = 0; i < NBIRDS; i++) {
    const B = birdAt(i, t), x = R(V.X(B.x)), y = R(V.Y(B.y)), flap = B.flying ? (Math.sin(t * 22 + i * 2) > 0 ? 1 : 0) : 0;
    if (y < -10 || x < -10 || x > c.w + 10) continue;
    const body = "#F4C430", wing = "#B88A10", dk = "#3A2A08";
    if (!B.flying) { c.px(x, y, body); c.px(x + 1, y, body); c.px(x, y - 1, body); c.px(x + 2, y - 1, dk); c.px(x - 1, y + 1, wing); continue; }
    c.px(x, y, body); c.px(x + 1, y, body); c.px(x - 1, y, wing);
    for (const sd of [-1, 1]) { c.px(x + sd, y - 1 - flap, wing); c.px(x + sd * 2, y - 1 - flap * 2, wing); }
    c.px(x - 2, y, dk);
  }
}

export function front(c, V, t) {
  if (!onScreen(V)) return;
  const gy = R(V.Y(LAND)), push = pushAt(t), lx = V.X(LX);
  // grass blades along the ground line (green and with reeds near the river bank), bending away from a roaring lion
  for (let i = 0; i < 50; i++) {
    const wx = X0 + 4 + i * 10.8 + rnd(i * 3) * 6, x = V.X(wx); if (x < -12 || x > c.w + 12) continue;
    if (Math.abs(wx - LX) < 64 && rnd(i) < 0.65) continue; if (Math.abs(wx - SIGN_X) < 8) continue;
    const gk = greenK(wx), sk = sandK(wx), n = 3 + (i % 3), away = Math.sign(x - lx) * push * Math.max(0, 1 - Math.abs(x - lx) / 330) * (1 + 0.25 * Math.sin(t * 26 + i));
    for (let b = 0; b < n; b++) {
      const h = (sk > 0.5 ? 5 : 8) + rnd(i * 7 + b) * (sk > 0.5 ? 7 : 13) + gk * 4, lean = (b - n / 2) * 0.3, sw = Math.sin(t * 1.8 + i * 0.6 + b) * 0.22 + away * 1.4;
      for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x + b * 2 + (lean + sw) * k * 0.9 * u), gy + 3 - k, mix(u > 0.72 ? "#FAE79C" : u > 0.38 ? "#E2B848" : "#9A7020", u > 0.72 ? "#C8E07A" : u > 0.38 ? "#7EAA3A" : "#3E6020", gk)); }
    }
  }
  // reeds at the river bank (right edge), swaying
  for (let i = 0; i < 9; i++) {
    const wx = 1040 + i * 4.6 + rnd(i * 3) * 3, x = V.X(wx); if (x < -10 || x > c.w + 10) continue;
    const h = 34 + rnd(i * 7) * 26, sw = Math.sin(t * 1.3 + i) * 0.12;
    for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x + sw * k * u * 2), gy + 2 - k, u > 0.8 ? "#C8D27A" : u > 0.4 ? "#7A9A3E" : "#4A6A2A"); }
    if (i % 2 === 0) for (let k = 0; k < 7; k++) { const tx = R(x + sw * h * 2), ty = gy + 2 - h - k + 3; c.px(tx, ty, "#8A5A2A"); c.px(tx + 1, ty, "#6A4020"); }
  }
  // tall golden tufts at the bottom of the frame (foreground), bending in the roar too
  for (let i = 0; i < 13; i++) {
    const wx = X0 + 8 + i * 42 + rnd(i * 9) * 18, x = V.X(wx), base = R(V.Y(LAND + 290 + (i % 3) * 10)); if (x < -24 || x > c.w + 24) continue;
    const gk = greenK(wx), away = Math.sign(x - lx) * push * 0.8;
    for (let b = 0; b < 7; b++) { const h = 28 + rnd(i * 13 + b) * 32, lean = (b - 3) * 0.3, sw = Math.sin(t * 1.5 + i + b * 0.4) * 0.3 + away;
      for (let k = 0; k < h; k++) { const u = k / h, xx = R(x + b * 3 + (lean + sw) * k * u); c.px(xx, base - k, mix(u > 0.8 ? "#FFE08A" : u > 0.4 ? "#D8A440" : "#8A5A1C", u > 0.8 ? "#C8E07A" : u > 0.4 ? "#6A9A34" : "#2E5A1C", gk)); c.px(xx + 1, base - k, mix(u > 0.6 ? "#E8B450" : "#6A4214", u > 0.6 ? "#7AA83A" : "#24461A", gk)); } }
  }
}

// ---------------------------------------------------------------- ICON: the lion's head (readout, guess cards)
export function ICON(c, cx, cy, a = 1) { lionIcon(c, cx, cy, a); }
