// LEVEL «the street» of «GTA 6: the city behind you»: one sunset "Vice City" street seen from the side, in two looks.
// DRAWN = full pastel art-deco pixel art with neon, palms and the bay; NOT DRAWN = the same shapes as a dark navy
// blueprint (grid + thin cyan outlines). Every layer is cached in both looks once (street-art.mjs, street-kit.mjs); per
// frame each pixel picks one look from the timeline's drawnAt(column, t) against a scanline-dither threshold, so the
// city dissolves / pops in exactly where the game camera looks. Also: the game camera with its view cone
// (street-cam.mjs), the X-ray of the building hidden behind the tall HOTEL, the LOD tower (street-tower.mjs), in-world
// tags, the late blocky pop-in after the fast turn, and MINI() — a top-down schematic for the radar.
// Layers: back = sky dim · far bay/skyline (parallax 0.3) · tower · street row · tower (in front, when near) · X-ray ·
// beach park (parallax 1.25) · cone; front = big foreground palms · the game camera; hud = tags.
import { EV, drawnAt, camDir, CULL_ON, TURN1, TURN_BACK, TURN2, LAG, HERO_X, END } from "../timeline.mjs";
import { MAIN } from "../../../../../renderer/pixel/raster.mjs";
import { Art, bakeBlue, mixBlit, tintRect, scanThr, hex, mix, bayer, rnd, sm, ease, lerp, win, clamp01, K_WALL, K_GLASS, K_WATER, K_NEON } from "./street-kit.mjs";
import { paintFar, paintStreet, paintFore, paintForeTrunks, paintCrown, BUILDINGS, BACK_PALMS, FORE_PALMS, HIDDEN, HOTEL, BASE, FAR_P, FORE_P, GAP } from "./street-art.mjs";
import { drawCamera, drawCone, camPos, CAM_IN, CONE_IN } from "./street-cam.mjs";
import { towerArt, towerState, towerPlace, TAGS as TOWER_TAGS, T as TT } from "./street-tower.mjs";

const R = Math.round;
export const RANGE = [0, 1080];

// ---------------------------------------------------------------- cached layers (painted once)
const FAR = paintFar(), ST = paintStreet(), FORE = paintFore(), TRUNKS = paintForeTrunks();
// live neon tubes of the street row: screen-independent list (art index, on colour, sign id, world x)
const NEON_PX = (() => {
  const out = []; for (let i = 0; i < ST.w * ST.h; i++) if (ST.m[i] && ST.kind[i] === K_NEON) out.push(i);
  return Int32Array.from(out);
})();
const NEON_ON = new Uint8ClampedArray(NEON_PX.length * 3); NEON_PX.forEach((li, k) => { NEON_ON[k * 3] = ST.col[li * 3]; NEON_ON[k * 3 + 1] = ST.col[li * 3 + 1]; NEON_ON[k * 3 + 2] = ST.col[li * 3 + 2]; });
const NEON_OFF = NEON_ON.map((v, i) => R(v * 0.32 + [42, 30, 52][i % 3] * 0.68));
// the glass pixels a sparkle can twinkle on during "almost real"
const STARS = (() => { const out = []; for (let k = 0; out.length < 16 && k < 4000; k++) { const x = 430 + R(rnd(k * 3 + 11) * 520), y = 300 + R(rnd(k * 5 + 7) * 250), li = (y - ST.oy) * ST.w + x; if (ST.m[li] && ST.kind[li] === K_GLASS) out.push([x, y]); } return out; })();

// ---------------------------------------------------------------- timing (all from the timeline's words)
export const SWEEP = [EV.almost - 0.02, EV.real + 0.62];               // "almost real": a glint sweeps the facades
export const CULL_GLITCH = [CULL_ON[0], CULL_ON[1]];                  // "isn't there": the outside dissolves with a shimmer
export const LATE = [TURN2[1] + LAG - 0.2, TURN2[1] + LAG + 0.75];      // after the fast turn: blocky late pop-in window
export const LATE_POP = [TURN2[1] + LAG + 0.18, TURN2[1] + LAG + 0.3];  // the OCEAN hotel pops in last of the blocks
export const NEON_LATE = [TURN2[1] + LAG + 0.25, TURN2[1] + LAG + 0.75]; // …and the left neon flickers on after it
export const XRAY = { draw: [EV.hidden + 0.04, EV.another + 0.12], see: [EV.another - 0.08, EV.building2 + 0.22], out: [EV.either + 0.5, EV.far + 0.28], hl: [EV.another - 0.06, EV.building2 + 0.45], tag: [EV.not - 0.06, EV.either + 0.6] };
export const TAG_WIN = [
  { text: "NOT DRAWN", side: "out", t: [EV.draws, TURN1[0] - 0.12] },
  { text: "DRAWN", side: "in", t: [EV.draws + 0.32, TURN1[0] - 0.12] },
  { text: "NOT DRAWN", side: "out", t: [EV.longer - 0.04, TURN_BACK[0] - 0.05] },
  { text: "DRAWN", side: "in", t: [EV.drawn1 - 0.1, TURN_BACK[0] - 0.05] },
];

// per-column drawn amount for the frame
const K = new Float32Array(540);
function computeK(V, t) { for (let x = 0; x < 540; x++) K[x] = drawnAt(V.x0 + x, t); }

// glitch row offsets (short, only inside a dissolving column)
function rowShift(t) {
  const g = Math.max(win(t, CULL_GLITCH[0], CULL_GLITCH[1], 0.15, 0.2), win(t, LATE[0], LATE[1] - 0.2, 0.08, 0.15)); if (g <= 0) return null;
  const f = Math.floor(t * 15);
  return (y) => { const b = y >> 2, r = rnd(b * 13 + f * 977); return r < 0.16 * g ? R((rnd(b * 7 + f * 31) - 0.5) * 8) : 0; };
}
// threshold: scanline dither normally; big world-anchored blocks during the late pop-in after the fast turn
function thrFn(V, t) {
  if (t < LATE[0] || t > LATE[1]) return scanThr;
  const x0 = V.x0, w = sm(t, LATE[0], LATE[0] + 0.1) * (1 - sm(t, LATE[1] - 0.4, LATE[1]));   // eased in and out: no re-dither pop
  return (x, y) => lerp(scanThr(x, y), 0.82 * rnd(Math.floor((x + x0) / 12) * 7919 + Math.floor(y / 10) * 104729) + 0.18 * bayer(x, y), w);
}

// ---------------------------------------------------------------- palms (crowns cached per sway step, both looks)
const CROWNS = new Map();
function crownArt(kind, i, lvl) {
  const key = kind + i + ":" + lvl; let A = CROWNS.get(key); if (A) return A;
  const big = kind === "f", s = big ? FORE_PALMS[i].s : 34 + (i % 2) * 4, half = R(s * 1.5), A2 = new Art(half * 2, R(s * 1.6), -half, -R(s * 0.55));
  paintCrown(A2, 0, 0, s, ((lvl / 20) - 0.5) * 0.18, (big ? 140 : 60) + i, i * 7 + (big ? 3 : 0));
  bakeBlue(A2, 12); CROWNS.set(key, A2); return A2;
}
const swayLvl = (t, ph) => R(((0.7 * Math.sin(t * 1.25 + ph) + 0.3 * Math.sin(t * 2.7 + ph * 2)) * 0.5 + 0.5) * 20);

// ---------------------------------------------------------------- back
export function back(c, V, t) {
  computeK(V, t);
  const thr = thrFn(V, t), shift = rowShift(t);
  // 1. the sky over the not-drawn side darkens a little (the sun stays readable)
  tintRect(c, 0, 0, 540, 600, (x) => (1 - K[x]) * 0.3, "#140E38", 4);
  // 2. far bay + skyline (parallax), the far LOD tower, glitter under the sun, beacons
  const fsx = -(V.cx - 540) * FAR_P, fsy = 290 + (-180 - V.cy) * 0.4;
  mixBlit(c, FAR, fsx, fsy, K, { thr, shift });
  const tw = towerArt(V, t);
  mixBlit(c, tw.A, tw.A.ox, tw.A.oy, K, { thr });
  if (tw.st.hi > 0) towerOutline(c, tw.A, tw.st.hi);
  glitter(c, t, fsx, fsy);
  beacons(c, t, fsx, fsy, thr);
  // 3. the street row, the far sidewalk, the road, the promenade
  const ssx = 270 - V.cx, ssy = ST.oy - 180 - V.cy;
  const late = t > LATE[0] && t < LATE_POP[1] + 0.05 ? (k, li) => (ST.id[li] === 12 || ST.id[li] === 50 ? k * sm(t, LATE_POP[0], LATE_POP[1]) : k) : null;
  const sweep = t > SWEEP[0] && t < SWEEP[1] ? sweepFx(t) : null;
  mixBlit(c, ST, ssx, ssy, K, { thr, shift, klate: late, fx: sweep });
  neon(c, V, t, ssx, ssy, thr);
  if (sweep) stars(c, V, t, ssx, ssy);
  // back-sidewalk palm crowns
  BACK_PALMS.forEach((p, i) => { const A = crownArt("b", i, swayLvl(t, p.ph)); const x = V.X(p.top[0]), y = p.top[1] - 180 - V.cy; if (x < -80 || x > 620) return; mixBlit(c, A, x + A.ox, y + A.oy, K, { thr, shift, klate: late && i === 0 ? (k) => k * sm(t, LATE_POP[0], LATE_POP[1]) : null }); });
  // 4. the tower again in front of the near row while it is close (crossfaded, never a one-frame order swap)
  if (tw.st.front > 0) { const fa = tw.st.front; mixBlit(c, tw.A, tw.A.ox, tw.A.oy, K, { thr, klate: (k, li, x, y) => (fa >= 1 || fa > bayer(x + 1, y + 2) ? k : -1) }); }
  // 5. the X-ray of the hidden building behind the tall HOTEL
  xray(c, V, t, ssx, ssy);
  // 6. promenade wall + beach park (parallax 1.25)
  mixBlit(c, FORE, -(V.cx - 540) * FORE_P, FORE.oy - 180 - V.cy, K, { thr, shift });
  // 7. the game camera's view cone
  const open = ease(sm(t, CONE_IN[0], CONE_IN[1]));
  if (open > 0) drawCone(c, V, t, camDir(t), open, 1);
}

// ---------------------------------------------------------------- front: big foreground palms, the game camera
export function front(c, V, t) {
  const thr = thrFn(V, t), fx = -(V.cx - 540) * FORE_P, fy = -180 - V.cy;
  mixBlit(c, TRUNKS, fx + TRUNKS.ox, fy + TRUNKS.oy, K, { thr });
  FORE_PALMS.forEach((p, i) => { const A = crownArt("f", i, swayLvl(t, p.ph)); mixBlit(c, A, fx + p.top[0] + A.ox, fy + p.top[1] + A.oy, K, { thr }); });
  const a = sm(t, CAM_IN[0], CAM_IN[1]);
  if (a > 0) { const [x, y] = camPos(V, t); drawCamera(c, x, y, camDir(t), a, t); }
}

// ---------------------------------------------------------------- hud: in-world tags
export function hud(c, V, t) {
  const d = camDir(t), cam = camPos(V, t);
  for (const T of TAG_WIN) {
    const a = win(t, T.t[0], T.t[1], 0.28, 0.3); if (a <= 0) continue;
    // "in" = the side the camera faces; "out" = the other side
    const facingRight = (T.t[0] < TURN1[0] ? 1 : -1) > 0, inRight = T.side === "in" ? facingRight : !facingRight;
    const x = inRight ? 404 : 116, y = 452;
    if (T.side === "in") tagBox(c, ["✓ DRAWN"], x, y, a, "drawn"); else tagBox(c, ["× NOT DRAWN"], x, y, a, "blue");
  }
  // occlusion: "Not drawn either"
  const xa = win(t, XRAY.tag[0], XRAY.tag[1], 0.25, 0.3);
  if (xa > 0) tagBox(c, ["HIDDEN =", "NOT DRAWN"], R(V.X(HOTEL.x + HOTEL.w / 2)), 382 - 180 - V.cy, xa, "blue");
  // LOD: "simple box" and "come close"
  const st = towerState(t), pl = towerPlace(V, t, st);
  const ba = win(t, TOWER_TAGS.box[0], TOWER_TAGS.box[1], 0.25, 0.3);
  if (ba > 0) tagBox(c, ["FAR = BOX"], R(pl.x + 22 + 53), R(pl.base - 152), ba, "grey", "left");
  const ca = win(t, TOWER_TAGS.close[0], TOWER_TAGS.close[1], 0.25, 0.3);
  if (ca > 0) tagBox(c, ["CLOSE =", "DETAILS"], R(pl.x + 28 + 51), R(pl.base - 200), ca, "drawn", "left");
}

/** In-world label: "drawn" = warm card, "blue" = blueprint card (dashed cyan), "grey" = flat grey. pointer "left". */
function tagBox(c, lines, cx, y, a, style, pointer) {
  if (a <= 0) return;
  const S = 2, tw = Math.max(...lines.map((l) => c.measure(MAIN, l, { scale: S }))), w = tw + 16, h = lines.length * 18 + 8;
  const x0 = R(Math.max(6, Math.min(534 - w, cx - w / 2))), y0 = R(y + (1 - ease(a)) * 5);
  const look = style === "drawn" ? { bg: "#2A1430", bd: "#F4CA50", tx: "#FDFEED", hi: "#F4CA50", sh: "#0B0812" }
    : style === "grey" ? { bg: "#3A3A4C", bd: "#B8B8CC", tx: "#EDEDF6", hi: "#EDEDF6", sh: "#0B0812" }
    : { bg: "#0A1434", bd: "#5FD8F4", tx: "#B4F6FF", hi: "#5FD8F4", sh: "#040818" };
  const P = (X, Y, col) => { if (a >= 1 || a > bayer(X, Y)) c.px(X, Y, col); };
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const X = x0 + i, Y = y0 + j, edge = i === 0 || j === 0 || i === w - 1 || j === h - 1, corner = (i === 0 || i === w - 1) && (j === 0 || j === h - 1);
    if (corner) continue;
    if (edge) { if (style !== "blue" || ((i + j) % 4) < 3) P(X, Y, look.bd); else P(X, Y, look.bg); } else P(X, Y, look.bg);
  }
  for (let i = 1; i < w - 1; i++) P(x0 + i, y0 + h, look.sh);
  if (pointer === "left") for (let k = 0; k < 6; k++) for (let j = -k; j <= k; j++) P(x0 - 6 + k, y0 + R(h / 2) + j, k === 5 || Math.abs(j) === k ? look.bd : look.bg);
  lines.forEach((l, i) => {
    const lx = x0 + 8, ly = y0 + 6 + i * 18;
    c.text(MAIN, l, lx + 1, ly + 1, look.sh, { scale: S, colorAt: (X, Y) => (a >= 1 || a > bayer(X, Y) ? look.sh : null) });
    c.text(MAIN, l, lx, ly, look.tx, { scale: S, colorAt: (X, Y) => (a >= 1 || a > bayer(X, Y) ? (i === 0 && X < lx + 12 && /[✓×]/.test(l[0]) ? look.hi : look.tx) : null) });
  });
}

// ---------------------------------------------------------------- live details
/** "far away": a bright outline pulses around the tower's silhouette (outside pixels next to its mask). */
function towerOutline(c, A, a) {
  const { w, h, m } = A;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x; if (m[i]) continue;
    const n1 = m[i - 1] || m[i + 1] || m[i - w] || m[i + w];
    const n2 = !n1 && x > 1 && y > 1 && x < w - 2 && y < h - 2 && (m[i - 2] || m[i + 2] || m[i - 2 * w] || m[i + 2 * w] || m[i - w - 1] || m[i - w + 1] || m[i + w - 1] || m[i + w + 1]);
    if (!n1 && !n2) continue;
    const X = x + A.ox, Y = y + A.oy; if (X < 0 || X >= 540 || Y < 0 || Y >= c.h || K[X] < 0.5) continue;
    if (a > bayer(X, Y) * 0.9) c.px(X, Y, n1 ? "#FFFFFF" : "#FFD23A");
  }
}
function glitter(c, t, fsx, fsy) {
  const d = c.d, W = c.w;
  for (let i = 0; i < 90; i++) {
    const v = rnd(i * 11 + 3), sy = 489 + R(v * v * 30), spread = 10 + (sy - 488) * 2.2, x = R(270 + (rnd(i * 7 + 1) - 0.5) * 2 * spread), y = R(sy + fsy - 290);
    if (x < 0 || x >= 540 || y < 0 || y >= c.h) continue;
    const b = Math.sin(t * (2.2 + rnd(i) * 3.5) + i * 1.9); if (b < 0.25) continue;
    const li = (y - R(fsy)) * FAR.w + (x - R(fsx)); if (li < 0 || li >= FAR.w * FAR.h || !FAR.m[li] || FAR.kind[li] !== K_WATER) continue;
    if (K[x] <= bayer(x, y)) continue;
    const col = b > 0.75 ? [255, 250, 230] : [255, 214, 170];
    for (let k = 0; k < (b > 0.7 ? 3 : 1); k++) { const p = (y * W + x + k) * 3; if (x + k < W) { d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; } }
  }
}
function beacons(c, t, fsx, fsy, thr) {
  (FAR.beacons ?? []).forEach(([bx, by], i) => { const x = R(bx + fsx), y = R(by + fsy - 290); if (x < 0 || x >= 540) return; const b = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 2.1); if (K[x] <= thr(x, y) || b < 0.35) return; c.px(x, y, mix("#8A1A2A", "#FF4A5A", b)); });
}
/** "almost real": a diagonal glint band sweeps the facades (and windows flash white). */
function sweepFx(t) {
  const u = sm(t, SWEEP[0], SWEEP[1]), pos = lerp(-140, 820, u), amp = Math.min(1, Math.sin(Math.PI * u) * 1.6);
  return (x, y, li, isD, r, g, b) => {
    if (!isD) return null; const kd = ST.kind[li]; if (kd !== K_WALL && kd !== K_GLASS) return null;
    const band = x + (y - 300) * 0.55 - pos, ab = Math.abs(band), ab2 = Math.abs(band + 22);
    let k = ab < 4 ? 0.9 : ab < 14 ? 0.5 * (1 - (ab - 4) / 10) : ab2 < 3 ? 0.6 : 0;
    k *= amp * (kd === K_GLASS ? 1.15 : 1); if (k <= 0 || k <= bayer(x, y) * 0.85) return null;
    const q = Math.min(1, k + 0.15);
    return [R(r + (255 - r) * q), R(g + (250 - g) * q), R(b + (232 - b) * q)];
  };
}
function stars(c, V, t, ssx, ssy) {
  const u = sm(t, SWEEP[0], SWEEP[1]), pos = lerp(-140, 820, u);
  STARS.forEach(([wx, sy], i) => {
    const x = R(wx + ssx), y = R(sy - ST.oy + ssy); if (x < 2 || x > 537) return;
    const band = x + (y - 300) * 0.55 - pos, k = Math.max(0, 1 - Math.abs(band + 10) / 30); if (k <= 0.05) return;
    const r = R(1 + k * 5);
    for (let j = -r; j <= r; j++) { const q = 1 - Math.abs(j) / (r + 1); if (q * k > bayer(x + j, y) * 0.7) { c.px(x + j, y, j === 0 ? "#FFFFFF" : "#FFF2C8"); c.px(x, y + j, j === 0 ? "#FFFFFF" : "#FFF2C8"); } }
  });
}
/** Neon tubes: flicker (smooth dips), and after the fast turn the left signs stay dark, then flicker on last. */
function neon(c, V, t, ssx, ssy, thr) {
  const d = c.d, W = c.w, sx = R(ssx), sy = R(ssy), lateOn = t > LATE[0] - 0.3 && t < NEON_LATE[1] + 0.05;
  for (let k = 0; k < NEON_PX.length; k++) {
    const li = NEON_PX[k], ax = li % ST.w, ay = (li / ST.w) | 0, x = ax + sx, y = ay + sy; if (x < 0 || x >= 540 || y < 0 || y >= c.h) continue;
    const kk = K[x]; if (kk <= 0 || (kk < 1 && kk <= thr(x, y))) continue;
    const id = ST.id[li];
    let b = 1;
    // smooth occasional dips per sign
    const slot = Math.floor((t + id * 0.37) / 0.9), r = rnd(id * 97 + slot * 13);
    if (r < 0.2) { const c0 = slot * 0.9 - id * 0.37 + 0.2 + rnd(id + slot) * 0.5, u = (t - c0) / 0.16; if (u > -1 && u < 1) b -= 0.8 * Math.cos(u * Math.PI / 2) ** 2; }
    if (lateOn && ax < HERO_X - 10) { // "caught you": the left neon flickers on last
      const u = sm(t, NEON_LATE[0], NEON_LATE[1]), fl = u < 1 ? 0.5 + 0.5 * Math.sin((t - NEON_LATE[0]) * 38) : 1;
      b *= u * fl;
    }
    const on = b > bayer(x, y) * 0.98, q = k * 3, p = (y * W + x) * 3, src = on ? NEON_ON : NEON_OFF;
    d[p] = src[q]; d[p + 1] = src[q + 1]; d[p + 2] = src[q + 2];
  }
}
/** The X-ray of the building hidden behind the tall HOTEL: dashed cyan box drawn on, the hotel goes see-through inside. */
function xray(c, V, t, ssx, ssy) {
  const out = 1 - sm(t, XRAY.out[0], XRAY.out[1]), dr = sm(t, XRAY.draw[0], XRAY.draw[1]) * out, see = sm(t, XRAY.see[0], XRAY.see[1]) * out, hl = win(t, XRAY.hl[0], XRAY.hl[1], 0.15, 0.3);
  if (dr <= 0 && hl <= 0) return;
  const dy = -180 - V.cy, x0 = R(V.X(HIDDEN.x)), x1 = R(V.X(HIDDEN.x + HIDDEN.w)), y0 = HIDDEN.top + dy, y1 = HIDDEN.base + dy - 1, D = HIDDEN.depth;
  // the front hotel's outline glows warm on "another building"
  if (hl > 0) {
    const hx0 = R(V.X(HOTEL.x)) - 2, hx1 = R(V.X(HOTEL.x + HOTEL.w)) + 2, hy0 = BASE - HOTEL.h - 50 + dy, hy1 = BASE + dy;
    for (let y = hy0; y < hy1; y++) for (let x = Math.max(0, hx0); x < Math.min(540, hx1); x++) {
      const li = (y - R(ssy)) * ST.w + (x - R(ssx)); const mine = (li >= 0 && ST.m[li] && ST.id[li] === 15);
      if (mine) continue; let near = false;
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const lj = (y + oy - R(ssy)) * ST.w + (x + ox - R(ssx)); if (lj >= 0 && lj < ST.m.length && ST.m[lj] && ST.id[lj] === 15) near = true; }
      if (near && hl * (0.6 + 0.4 * Math.sin(t * 12)) > bayer(x, y) && K[x] > 0.5) c.px(x, y, "#FFE27A");
    }
  }
  if (dr <= 0) return;
  // see-through: inside the hidden building's footprint the hotel dithers to the navy blueprint (with its grid)
  if (see > 0) tintRect(c, x0 + 1, y0 - D + 1, x1 - x0 + D - 1, y1 - y0 + D - 1, (x, y) => (inBox(x, y) ? see * (((x - x0) % 8 === 0 || (y - y0) % 8 === 0) && ((x + y) & 1) ? 0.62 : 0.86) : 0), "#0A1236", 4);
  function inBox(x, y) { // union of the front face and the receding top/side (oblique box)
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return true;
    const u = x - x0, v = y0 - y; if (v >= 0 && v <= D && u >= v && u <= x1 - x0 + v) return true;   // top face
    const s = x - x1; if (s >= 0 && s <= D && y >= y0 - s && y <= y1 - s) return true;               // side face
    return false;
  }
  // windows of the hidden building (dim outlines, drawn after the box is in)
  if (see > 0) for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) { const wx = x0 + 7 + q * 16, wy = y0 + 10 + r * 23; for (let i = 0; i < 9; i++) for (let j = 0; j < 11; j++) if ((i === 0 || j === 0 || i === 8 || j === 10) && see > bayer(wx + i, wy + j)) c.px(wx + i, wy + j, "#3E86D0"); }
  // dashed cyan edges drawn on progressively (hidden-line convention)
  const edges = [[x0, y1, x0, y0], [x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y0, x0 + D, y0 - D], [x1, y0, x1 + D, y0 - D], [x1, y1, x1 + D, y1 - D], [x0 + D, y0 - D, x1 + D, y0 - D], [x1 + D, y0 - D, x1 + D, y1 - D]];
  const total = edges.reduce((s, e) => s + Math.hypot(e[2] - e[0], e[3] - e[1]), 0); let budget = total * dr;
  for (const [ax, ay, bx, by] of edges) {
    const L = Math.hypot(bx - ax, by - ay), n = Math.ceil(L); if (budget <= 0) break; const m = Math.min(n, Math.ceil(budget)); budget -= L;
    for (let i = 0; i <= m; i++) { const x = R(ax + ((bx - ax) * i) / n), y = R(ay + ((by - ay) * i) / n); if (((i + R(t * 20)) % 6) < 4) { c.px(x, y, "#A8F8FF"); c.px(x + (ax === bx ? 1 : 0), y + (ax === bx ? 0 : 1), "#4AB8E8"); } else c.px(x, y, "#2E6AA8"); }
    if (m < n) { const x = R(ax + ((bx - ax) * m) / n), y = R(ay + ((by - ay) * m) / n); c.px(x, y, "#FFFFFF"); c.px(x + 1, y, "#B4F6FF"); c.px(x, y + 1, "#B4F6FF"); }
  }
}

// ---------------------------------------------------------------- MINI: a top-down schematic of the street (for the radar)
/** Draw a tiny top-down map of the street into the box (x0, y0, w, h): bay on top, building blocks, far sidewalk,
 *  road with a dashed centre line, promenade with palm dots, beach. Coloured where drawn, dark navy where not.
 *  o.wx = [world x0, world x1] shown across w (default: 520 px of street centred on the hero). */
export function MINI(c, x0, y0, w, h, t, o = {}) {
  const [a, b] = o.wx ?? [HERO_X - 260, HERO_X + 260], WX = (sx) => a + ((sx - x0 + 0.5) / w) * (b - a);
  const rows = { bay: 0.0, row: 0.16, walk: 0.5, road: 0.58, prom: 0.76, beach: 0.86 };
  const PAL = { pink: "#F48AB4", mint: "#7EE0C0", lilac: "#B89AF0", peach: "#FFC89A", cream: "#FBE6C8", aqua: "#8AC8FF" };
  for (let sx = x0; sx < x0 + w; sx++) {
    const wx = WX(sx), k = drawnAt(wx, t);
    const B = BUILDINGS.find((B) => wx >= B.x && wx < B.x + B.w);
    for (let sy = y0; sy < y0 + h; sy++) {
      const v = (sy - y0) / h, on = k > bayer(sx, sy);
      let col;
      if (v < rows.row) col = on ? "#7A8AD8" : "#0B1230";
      else if (v < rows.walk) { const depth = B ? 0.3 + Math.min(1, B.h / 200) * 0.7 : 0; const inB = B && v > rows.walk - depth * (rows.walk - rows.row); const edge = B && (Math.abs(wx - B.x) < (b - a) / w || Math.abs(wx - B.x - B.w) < (b - a) / w || Math.abs(v - (rows.walk - depth * (rows.walk - rows.row))) < 1 / h); col = inB ? (on ? (edge ? mix(PAL[B.pal], "#0B0812", 0.4) : PAL[B.pal]) : edge ? "#4CC4F0" : "#111A3C") : on ? "#F2C894" : "#0D1532"; }
      else if (v < rows.road) col = on ? "#F2D6D0" : "#0D1532";
      else if (v < rows.prom) { const mid = Math.abs(v - (rows.road + rows.prom) / 2) < 0.6 / h && ((sx >> 1) & 1); col = on ? (mid ? "#F4CA50" : "#4E4060") : mid ? "#2C5C98" : "#0D1532"; }
      else if (v < rows.beach) col = on ? "#F8D0D4" : "#0D1532";
      else col = on ? "#F6CC98" : "#0C1434";
      c.px(sx, sy, col);
    }
  }
  // palms as dots on the promenade and the far sidewalk
  for (const p of [...BACK_PALMS.map((p) => [p.x, rows.walk + 0.03]), [330, rows.beach + 0.06], [790, rows.beach + 0.06]]) {
    const sx = R(x0 + ((p[0] - a) / (b - a)) * w), sy = R(y0 + p[1] * h); if (sx < x0 + 1 || sx > x0 + w - 2) continue;
    const on = drawnAt(p[0], t) > 0.5; c.px(sx, sy, on ? "#3E9A54" : "#5FD8F4"); c.px(sx + 1, sy, on ? "#6ACA6A" : "#2C5C98"); c.px(sx, sy + 1, on ? "#2E7A48" : "#2C5C98");
  }
}
