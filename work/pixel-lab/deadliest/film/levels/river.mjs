// LV3 · hippo — an African river in the afternoon (RANGE BIOME.river = 1080..1620, REST hippo {1350, −60}: the water
// surface sits at screen y 540). The savanna's green bank slopes into a deep, muddy-green, see-through river that
// reaches the bottom of the frame; papyrus and reeds on both banks (a grassy papyrus spit separates the river from the
// swamp at x 1620); across the water a far bank with acacias, a doum palm and egrets above a pale band of far water.
// The chubby hippo stands chest-deep facing the camera, head high under the sun. "lazy": a huge lazy yawn (big pink
// mouth, two tusks), eyes half closed, ears flick. "but … five hundred": its eyes snap open, then narrow (don't be
// fooled), and slide to a dugout canoe drifting in from behind the spit with the series hero paddling. "attacks": the
// hippo lunges, head down, gaping, with a bow wave; "boats": it bumps the canoe, which pitches and rolls over (≈ 14.6);
// the hero is tossed out, splashes in, pops up and crawls away fast to the far bank, unhurt; the hippo snorts, pleased.
import { BIOME, LAND } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { sign, blinkAt, fade, mix, bayer, rnd } from "../cute.mjs";
import { R, sm, ease, clamp01, lerp, underwater, clipView, tinted, murk, waterline, splash, ripples, bubble, wake, thick, hex, chomp } from "./river-kit.mjs";
import { worldBack, GROUND, farLine, SPIT, UW_R } from "./river-world.mjs";
import { drawHippo, FEET } from "./river-hippo.mjs";
import { drawHero } from "./river-hero.mjs";
import { RT, HX, HY, SIGN_X, hippoAt, canoeAt, heroAt, paddleAt } from "./river-time.mjs";
export { ICON } from "./river-hippo.mjs";

export const RANGE = BIOME.river;
const [X0, X1] = RANGE;
const MURK = "#5A7038";
const onScreen = (V) => V.x1 > X0 - 50 && V.x0 < X1 + 50;
const clipX = (V) => ({ x0: Math.max(0, R(V.X(X0))), x1: Math.min(540, R(V.X(X1))) });
const win = (t, t0, dur) => (t < t0 || t > t0 + dur ? 0 : Math.sin((Math.PI * (t - t0)) / dur));

// ---------------------------------------------------------------- water + terrain
export function fill(c, V, t) {
  if (!onScreen(V)) return;
  drawWater(c, V, t, X0, X1, 0);
  const { x0, x1 } = clipX(V); murk(c, x0, x1, V.Y(0) + 2, MURK, 0.52, 0.72, 380);
}

export function back(c, V, t) {
  if (!onScreen(V)) return;
  worldBack().blit(c, V, clipX(V));
  // sun glitter on the far water under the sun, egrets on the far bank
  for (let i = 0; i < 26; i++) { const wx = HX + (rnd(i * 5) - 0.5) * 90 * (0.5 + rnd(i * 9)), wy = -31 + rnd(i * 9) * 28, on = Math.sin(t * (4 + rnd(i) * 5) + i * 1.3); if (on > 0.35) { const x = R(V.X(wx)), y = R(V.Y(wy)); c.px(x, y, "#FFFDF0"); if (on > 0.8) { c.px(x - 1, y, "#FFF4C8"); c.px(x + 1, y, "#FFF4C8"); } } }
  for (const [wx, ph] of [[1236, 0], [1430, 1.7], [1458, 3.1]]) { const x = R(V.X(wx)), y = R(V.Y(farLine(wx))), nod = Math.sin(t * 1.1 + ph) > 0.85 ? 1 : 0;
    c.rect(x - 2, y - 7, 5, 3, "#FFFFFF"); c.rect(x - 1, y - 8, 4, 1, "#F4F0E8"); c.px(x + 2, y - 9 + nod, "#FFFFFF"); c.px(x + 2, y - 10 + nod, "#FFFFFF"); c.px(x + 3, y - 10 + nod, "#F8C040"); c.px(x - 1, y - 4, "#2A2A2A"); c.px(x + 1, y - 4, "#2A2A2A"); c.px(x - 1, y - 3, "#2A2A2A"); c.px(x + 1, y - 3, "#2A2A2A"); }
  // water weeds rising from the deep (seen through the murk) and little fish
  const wly = R(V.Y(0)), uw = underwater(c, wly, UW_R, 0.42, 0.6, 300);
  for (let i = 0; i < 16; i++) {
    const wx = 1186 + i * 23 + rnd(i * 7) * 12, base = Math.min(GROUND(wx), 480), n = 2 + (i % 3);
    for (let b = 0; b < n; b++) { const h = 50 + rnd(i * 11 + b) * 120, ph = t * 1.2 + i * 0.7 + b, x0 = V.X(wx + (b - n / 2) * 3), y0 = V.Y(base) + 1;
      for (let k = 0; k < h; k++) { const sw = Math.sin(ph + k * 0.05) * (k / h) * 8, x = R(x0 + sw), y = R(y0 - k); if (y < wly + 30) break; uw.px(x, y, k > h * 0.78 ? "#86B060" : "#4A8040"); if (b === 0) uw.px(x + 1, y, "#36603A"); } }
  }
  for (let i = 0; i < 4; i++) {
    const per = 8 + i * 1.9, u = (((t / per + i * 0.31) % 1) + 1) % 1, dir = i % 2 ? -1 : 1, wx = dir > 0 ? 1170 + u * 400 : 1570 - u * 400, wy = 190 + i * 46 + Math.sin(t * 2 + i) * 4;
    const x = R(V.X(wx)), y = R(V.Y(wy)); if (x < -6 || x > 546) continue; const col = ["#C8B060", "#B89A58", "#D8C070", "#A8A070"][i];
    const fa = Math.min(sm(u, 0, 0.12), 1 - sm(u, 0.88, 1)); if (fa <= 0) continue; const uf = fade(uw, fa);
    uf.rect(x - 3, y - 1, 7, 3, col); uf.rect(x - 2, y - 2, 5, 1, mix(col, "#FFFFFF", 0.3)); const tx = x - dir * 5; uf.px(tx, y - 1, col); uf.px(tx, y + 1, col); uf.px(tx + dir, y, col); uf.px(x + dir * 2, y - 1, "#0B0812");
  }
  // papyrus and reeds on the left bank and on the spit (behind the actors), swaying
  papyrusClumps(c, V, t, [[1092, 92, 0], [1104, 70, 1], [1118, 104, 2], [1136, 62, 1], [1596, 84, 2], [1608, 108, 0], [1620, 74, 1]]);
}
function papyrusClumps(c, V, t, list) {
  for (const [wx, h, kind] of list) {
    const gy = GROUND(wx), x0 = V.X(wx), y0 = V.Y(Math.min(gy, 0)), sw = Math.sin(t * 1.4 + wx * 0.07) * 3;
    for (let s = -1; s <= 1; s++) { const hh = h * (1 - Math.abs(s) * 0.18), lean = s * 7, tx = x0 + lean + sw, ty = y0 - hh;
      for (let k = 0; k < hh; k++) { const u = k / hh, x = R(x0 + (lean + sw) * u * u), y = R(y0 - k); c.px(x, y, u > 0.7 ? "#9CC05A" : "#5E8A36"); if (k % 9 === 0 && u < 0.6) c.px(x + 1, y, "#3E6626"); }
      if (kind === 2 || s === 0) for (let a = 0; a < 13; a++) { const an = -Math.PI / 2 + (a - 6) * 0.26; for (let k = 1; k < 13; k++) c.px(R(tx + Math.cos(an) * k), R(ty + Math.sin(an) * k * 0.78 + (k * k) / 26), k > 9 ? "#D2E080" : k > 5 ? "#A4C458" : "#78A040"); }
      else for (let k = 0; k < 9; k++) c.px(R(tx), R(ty + k), k % 3 ? "#6A3A1E" : "#8A5228"); }
  }
}

// ---------------------------------------------------------------- actors
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const wly = R(V.Y(0));
  // lily pads with a lotus, bobbing on the surface
  for (const [wx, w, fl] of [[1176, 12, 0], [1198, 16, 1], [1226, 9, 0], [1566, 11, 0]]) lily(c, R(V.X(wx)), wly + R(Math.sin(t * 2 + wx) * 0.7), w, fl);
  // LV 3 sign on the left bank
  sign(c, R(V.X(SIGN_X)), R(V.Y(LAND)) + 1, "LV 3", "wood", 1, t);
  // ------------------------------------------------ the hippo
  const h = hippoAt(t), hx = R(V.X(h.x)), hy = R(V.Y(h.y)), wetK = (y) => Math.min(0.62, 0.42 + (y - wly) / 800);
  const uw = underwater(c, wly, UW_R, 0.44, 0.62, 400);
  const yawn = h.yawn, Wd = RT.wide, sq = sm(t, RT.narrow[0], RT.narrow[1]) * (1 - sm(t, RT.surge[0] - 0.08, RT.surge[0] + 0.08));
  const wide = sm(t, Wd[0], Wd[1]) * (1 - sm(t, Wd[2], Wd[2] + 0.2));
  const surge = sm(t, RT.surge[0], RT.surge[0] + 0.12) * (1 - sm(t, RT.hit + 0.35, RT.hit + 0.6));
  const happy = sm(t, RT.happy[0], RT.happy[0] + 0.12) * (1 - sm(t, RT.happy[1], RT.happy[1] + 0.15));
  const blink = Math.max(blinkAt(t, 3.6, 1.1) * (1 - sq) * (1 - wide), 0.58 * yawn * (1 - wide), 0.36 * sq * (1 - surge * 0.6));
  const look = lookAt(t);
  const flick = Math.max(win(t, RT.hello[0], RT.hello[1]), win(t, RT.yawn.t0 + 0.12, 0.5), win(t, RT.yawn.t0 + 0.55, 0.3), win(t, RT.snort[0] + 0.05, 0.45));
  const ear = flick * Math.sin(t * 34) * 0.32 + Math.sin(t * 1.3) * 0.05 - 0.18 * yawn;
  const nos = Math.max(0.18 + 0.12 * Math.sin(t * 3), win(t, RT.snort[0], 0.32), 0.7 * h.gape);
  drawHippo(c, uw, hx, hy, wly, { lf: h.lf, rf: h.rf, ear, gap: h.gap, look, blink, low: 0.5 * sq * (1 - surge), wide, brow: Math.max(sq, surge) * (1 - happy), browTilt: lerp(-0.2, 1, surge), happy, nos, grin: Math.max(0.45, happy) * (1 - surge), tint: UW_R, k: wetK });
  // where the chest breaks the surface: a foam line; the bow wave and wake while it lunges; spray on the snort
  waterline(c, hx, wly, R(chestHalf(wly - hy)), t, 1, "#F4FFF4", "#C8E8D4");
  const lunge = win(t, RT.surge[0] - 0.02, RT.hit + 0.42 - RT.surge[0]);
  if (lunge > 0) { bowWave(c, hx + R(chestHalf(wly - hy)) + 2, wly, lunge, t); wake(c, hx - R(chestHalf(wly - hy)) - 4, wly + 1, 1, lunge, t, "#E8FFF4"); }
  splash(c, hx + 70, wly, t - RT.hit, RT.splash, 0.75, 31);
  spray(c, hx, hy - R(h.gap) - 4, t - RT.snort[0] - 0.08);
  // ------------------------------------------------ canoe + hero
  canoeAndHero(c, V, t, wly, uw);
}
/** Half-width of the hippo's neck/body at `dy` px below its head centre (where the surface cuts it). */
function chestHalf(dy) { let w = 0; for (const [cy, rx, ry] of [[80, 66, 36], [142, 90, 62]]) { const v = (dy - cy) / ry; if (Math.abs(v) < 1) w = Math.max(w, rx * Math.sqrt(1 - v * v)); } return w; }
function lookAt(t) {
  const keys = [[0, [0, 0]], [RT.glance, [0.85, 0.15]], [RT.hit + 0.2, [0.9, -0.3]], [RT.fly[1], [0.7, 0.1]], [RT.snort[0] + 0.6, [0, 0]]];
  let cur = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / 0.28), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
function lily(c, x, y, w, fl) {
  for (let k = -w; k <= w; k++) { if (k > 1 && k < 5) continue; const edge = Math.abs(k) > w - 2; c.px(x + k, y - 2, edge ? "#2E6A2E" : Math.abs(k) < w - 5 ? "#9ACC5E" : "#6AAE48"); c.px(x + k, y - 1, edge ? "#2E6A2E" : "#5A9A40"); c.px(x + k, y, "#2E5A2E"); }
  if (!fl) return; const fx = x - 4, fy = y - 3;
  for (const [dx, dy, col] of [[0, -5, "#FFFFFF"], [-1, -4, "#FFE8F0"], [1, -4, "#FFE8F0"], [0, -4, "#FFF4F8"], [-2, -3, "#F8B0C8"], [2, -3, "#F8B0C8"], [-1, -3, "#FFD0E0"], [1, -3, "#FFD0E0"], [-3, -2, "#F090B0"], [3, -2, "#F090B0"], [-2, -1, "#E07098"], [-1, -1, "#F090B0"], [0, -1, "#F090B0"], [1, -1, "#F090B0"], [2, -1, "#E07098"], [-4, -1, "#E07098"], [4, -1, "#E07098"]]) c.px(fx + dx, fy + dy, col);
  c.px(fx, fy - 2, "#F8D040"); c.px(fx, fy - 3, "#FCE48A");
}
function bowWave(c, x, wly, k, t) {   // a mound of white water pushed ahead of the hippo, throwing droplets forward
  const g = fade(c, Math.min(1, k * 1.4)), h = 9 * k;
  for (let i = 0; i < 26; i++) { const u = i / 26, top = R(wly - h * Math.sin(Math.PI * Math.min(1, u * 1.6)) * (1 - u * 0.4)); for (let y = top; y <= wly + 1; y++) g.px(x + i, y, y === top ? "#FFFFFF" : (y + i + R(t * 20)) % 3 ? "#E4FFF4" : "#A8DCC8"); }
  for (let i = 0; i < 10; i++) { const ph = ((t * 3 + rnd(i) ) % 1), px = R(x + 10 + ph * 34 + rnd(i * 3) * 6), py = R(wly - h - 2 - Math.sin(ph * Math.PI) * 12 * k); g.rect(px, py, 2, 2, i % 2 ? "#FFFFFF" : "#C8F0E4"); }
}
function spray(c, x, y, u) {   // a snort: two little fans of droplets from the nostrils
  if (u < 0 || u > RT.spray) return; const g = fade(c, 1 - sm(u, 0.35, RT.spray));
  for (const sd of [-1, 1]) for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + sd * (0.22 + i * 0.1), sp = 70 + i * 9, px = R(x + sd * 24 + Math.cos(a) * sp * u), py = R(y + Math.sin(a) * sp * u + 150 * u * u); g.px(px, py, i % 2 ? "#E8FFFF" : "#FFFFFF"); if (i % 3 === 0) g.px(px + 1, py, "#BFF6FF"); }
}

// ---------------------------------------------------------------- the canoe and the hero
const WOOD = ["#2A1408", "#4A2612", "#6A3A1E", "#8A5430", "#A86C3E", "#C48A52", "#DCAA70"];
const HALF = 54;
/** Dugout canoe at screen (x, y) (waterline point under its centre); pitch rad; roll 1 upright → −1 hull up. */
function canoe(c, uw, x, y, pitch, roll, a = 1) {
  const cs = Math.cos(pitch), sn = Math.sin(pitch), top = (u) => -9 - 5 * Math.pow(Math.abs(u), 3), keel = (u) => 6 - 17 * Math.pow(Math.abs(u), 3.2);
  const P = (lx, ly) => [x + lx * cs - ly * roll * sn, y + lx * sn + ly * roll * cs];
  const pts = []; for (let i = 0; i <= 24; i++) { const u = -1 + (2 * i) / 24; pts.push(P(u * HALF, top(u))); } for (let i = 24; i >= 0; i--) { const u = -1 + (2 * i) / 24; pts.push(P(u * HALF * 0.97, keel(u))); }
  if (Math.abs(roll) < 0.12) { const g = fade(uw, a); for (let i = -HALF; i <= HALF; i++) { const p = P(i, 0); g.px(R(p[0]), R(p[1]), WOOD[1]); g.px(R(p[0]), R(p[1]) - 1, WOOD[4]); } return; }
  const g = fade(uw, a), ics = cs, isn = sn;
  g.poly(pts, null, (X, Y) => {
    const dx = X + 0.5 - x, dy = Y + 0.5 - y, lx = dx * ics + dy * isn, ly = (-dx * isn + dy * ics) / roll, u = lx / HALF, tp = top(u), kl = keel(u), v = (ly - tp) / Math.max(1, kl - tp);
    if (v < 0.04 || v > 0.94 || Math.abs(u) > 0.985) return WOOD[0];
    if (roll < 0) return v > 0.7 ? WOOD[4] : v > 0.25 ? ((lx * 0.3 + ly) % 7 < 1 ? WOOD[2] : WOOD[3]) : WOOD[2];   // the hull bottom, lit from above
    if (v < 0.2) return v < 0.12 ? WOOD[6] : WOOD[5];                                                               // gunwale
    if (v > 0.78) return WOOD[2];
    return (Math.abs(((lx + 200) % 23)) < 1 && v < 0.7) ? WOOD[2] : (lx * 0.18 + ly * 2.2) % 9 < 1 ? WOOD[3] : WOOD[4];
  });
}
function paddle(c, x0, y0, x1, y1, a = 1) {   // shaft from (x0, y0) to the blade at (x1, y1)
  const g = fade(c, a), n = Math.max(1, R(Math.hypot(x1 - x0, y1 - y0)));
  for (let k = 0; k <= n; k++) { const x = R(x0 + ((x1 - x0) * k) / n), y = R(y0 + ((y1 - y0) * k) / n); g.px(x, y, "#5A3418"); g.px(x + 1, y, "#9A6A3A"); }
  const dx = (x1 - x0) / n, dy = (y1 - y0) / n; for (let k = -7; k <= 3; k++) { const w = k < -5 ? 1 : 2.4; for (let j = -w; j <= w; j++) g.px(R(x1 + dx * k - dy * j), R(y1 + dy * k + dx * j), Math.abs(j) > w - 1 ? "#4A2A12" : "#B87E46"); }
}
function canoeAndHero(c, V, t, wly, uw) {
  if (t < RT.canoe.t0 - 0.05) return;
  const cn = canoeAt(t), cx = R(V.X(cn.x)), cy = R(V.Y(cn.y)), hs = heroAt(t), S = hs.s;
  const ent = sm(t, RT.canoe.t0, RT.canoe.t0 + 0.3);      // it starts hidden behind the spit's papyrus; this only guards t0
  if (hs.mode === "sit") {
    const ox = R(V.X(hs.x)), oy = R(V.Y(hs.y)), sc = hs.scared, ph = 2 * Math.PI * hs.stroke;
    // paddle: a stroke cycle while paddling, then held up like a shield when he sees the hippo
    const th = lerp(0.55 + 0.42 * Math.sin(ph), -0.12, sc), piv = [-6, -80], up = 26, dn = 74;
    const pu = [piv[0] - Math.sin(th) * up, piv[1] - Math.cos(th) * up], pd = [piv[0] + Math.sin(th) * dn, piv[1] + Math.cos(th) * dn];
    const H = (p) => [ox + p[0] * S, oy + p[1] * S];
    const hands = [[piv[0] - Math.sin(th) * 15, piv[1] - Math.cos(th) * 15], [piv[0] + Math.sin(th) * 8, piv[1] + Math.cos(th) * 8]];
    const jolt = t > RT.hit ? Math.exp(-(t - RT.hit) * 9) * Math.sin((t - RT.hit) * 30) * 3 : 0;
    drawHero(c, ox, oy + R(jolt), { scale: S, facing: lerp(-1, -1, sc), legs: false, hands, look: sc > 0.5 ? [-0.9, -0.1] : [-0.6, 0.2], mouth: sc > 0.5 ? "o" : "smile", brows: sc, blink: sc > 0.5 ? 0 : blinkAt(t, 2.9, 0.4), a: ent,
      beforeMitts: () => { const a0 = H(pu), b0 = H(pd); paddle(uw, a0[0], a0[1] + R(jolt), b0[0], b0[1] + R(jolt), ent); } });
    canoe(c, uw, cx, cy, cn.pitch, cn.roll, ent);
    const a0 = H(pu), b0 = H(pd); if (b0[1] > cy - 8) paddle(clipView(uw, (X, Y) => Y > cy - 8), a0[0], a0[1] + R(jolt), b0[0], b0[1] + R(jolt), ent);
    if (sc < 0.5 && b0[1] > wly - 1 && Math.sin(ph) > 0.2) ripples(c, R(b0[0]), wly, ((hs.stroke % 1) + 1) % 1 * 0.6, 0.6, 10, 1);
    if (sc > 0.5 && sc < 1) {}
  } else {
    if (hs.mode === "fly") {   // tossed out: flailing, legs kicking, then into the water (the part below the surface is hidden)
      // blends from the scared paddle grip (arms, facing, gaze) into the flailing toss over the first few frames
      const ox = R(V.X(hs.x)), oy = R(V.Y(hs.y)), fl = Math.sin(t * 34) * sm(hs.u, 0.05, 0.3), b = sm(hs.u, 0, 0.28), th = -0.12;
      const grip = [[-6 - Math.sin(th) * 15, -80 - Math.cos(th) * 15], [-6 + Math.sin(th) * 8, -80 + Math.cos(th) * 8]], flail = [[-34, -128 + fl * 10], [34, -128 - fl * 10]];
      const hands = grip.map((g0, i) => [lerp(g0[0], flail[i][0], b), lerp(g0[1], flail[i][1], b)]);
      drawHero(clipView(c, (X, Y) => Y < wly + 1), ox, oy, { scale: S, facing: lerp(-1, 1, b), kick: fl, hands, look: [lerp(-0.9, 0.3, b), lerp(-0.1, 0.8, b)], mouth: "o", brows: 1 });
    } else if (hs.mode === "under") {
      const x = R(V.X(hs.x)); for (let i = 0; i < 6; i++) { const u = hs.u * 1.3 - i * 0.12; if (u <= 0 || u > 1) continue; bubble(c, x + R((rnd(i) - 0.5) * 16), R(wly + 26 - u * 26), 1.5 + rnd(i * 3) * 1.5, 1 - u * 0.6); }
    } else if (hs.mode === "swim" || hs.mode === "bank") {
      const sw = hs.mode === "swim", swl = R(V.Y(hs.wl)), ox = R(V.X(hs.x));
      if (sw) {   // crawl: windmill arms (hidden under the water), head just above it, splashes at every stroke, a wake
        const ph = 2 * Math.PI * hs.stroke, oy = R(swl + 88 * S + (1 - hs.rise) * 44 * S), arm = (p) => [-38 - Math.cos(p) * 26, -112 + Math.sin(p) * 26];
        drawHero(clipView(c, (X, Y) => Y < swl + 1), ox, oy, { scale: S, facing: -1, legs: false, hands: [arm(ph), arm(ph + Math.PI)], look: [-1, -0.2], mouth: "o", brows: 0.6, a: 1 });
        waterline(c, ox - R(4 * S), swl, R(22 * S), t, 1, "#FFFFFF", "#D8F0E8");
        wake(c, ox + R(14 * S), swl, -1, 0.9 * hs.rise, t);
        for (let n = 0; n < 7; n++) { const ts = RT.swim[0] + (n + 0.75) * 0.3 * 0.5; splash(c, ox - R((n % 2 ? 34 : 10) * S), swl, t - ts, 0.35, 0.3 * (S / 0.52), 50 + n, ["#FFFFFF", "#D8F0E8"], 9); splash(c, ox + R(22 * S), swl, t - ts - 0.07, 0.3, 0.2 * (S / 0.52), 60 + n, ["#FFFFFF", "#D8F0E8"], 6); }
      } else {    // standing on the far bank, tiny, shaking the water off
        const shake = Math.sin(t * 40) * (1 - sm(t, RT.climb[1], RT.climb[1] + 0.6)) * 1.2, oy = R(V.Y(hs.ground));
        const b = sm(hs.u, 0, 0.4), ph = 2 * Math.PI * (RT.swim[1] - RT.swim[0]) / 0.3, arm = (p) => [-38 - Math.cos(p) * 26, -112 + Math.sin(p) * 26];
        const hands = [arm(ph), arm(ph + Math.PI)].map((h, i) => [lerp(h[0], i ? 30 : -30, b), lerp(h[1], -50, b)]);
        drawHero(clipView(c, (X, Y) => Y < swl + 1), ox + R(shake), oy, { scale: S, facing: lerp(-1, 0, b), hands, look: [lerp(-1, -0.6, b), lerp(-0.2, 0, b)], mouth: hs.u < 0.5 ? "o" : "flat", brows: lerp(0.6, 0.5, b) });
        for (let i = 0; i < 4; i++) { const u = ((t * 1.7 + i * 0.27) % 1); fade(c, 1 - u).px(ox + R((rnd(i) - 0.5) * 12), oy - R(30 - u * 26), "#C8F0FF"); }
      }
    }
    canoe(c, uw, cx, cy, cn.pitch, cn.roll);   // the capsized canoe floats in front of him
  }
  // the tossed paddle: spins away over the canoe and lands floating
  const pd = paddleAt(t);
  if (pd) { const L = 50 * S, dx = Math.cos(pd.ang) * L, dy = Math.sin(pd.ang) * L, px = V.X(pd.x), py = V.Y(pd.y); paddle(uw, R(px - dx), R(py - dy), R(px + dx), R(py + dy));
    splash(c, R(px), wly, t - pd.land, 0.6, 0.4, 61); ripples(c, R(px), wly, t - pd.land, 0.9, 26, 2); }
  // bonk: a little impact star where the hippo's chest meets the bow
  { const u = (t - RT.hit) / 0.3; if (u > 0 && u < 1) chomp(c, R(V.X(canoeAt(RT.hit).x - HALF + 4)), wly - 10, u, 8, "#FFF4C8", 6, Math.PI * 2, 0); }
  // splashes: hero into the water, canoe landing hull-up, hero popping up
  const sx = R(V.X(canoeAt(RT.fly[0]).x - 10));
  splash(c, sx, wly, t - (RT.fly[1] - 0.06), RT.splash, 0.9, 41);
  ripples(c, sx, wly, t - RT.fly[1], 1.1, 36, 3);
  splash(c, cx, wly, t - RT.roll[1] + 0.04, RT.splash, 0.7, 47);
  ripples(c, cx, wly, t - RT.roll[1], 1.2, 50, 2);
  splash(c, sx, wly, t - RT.pop, 0.5, 0.35, 53);
}

// ---------------------------------------------------------------- foreground: grass tufts on the bank and the spit, papyrus in front
export function front(c, V, t) {
  if (!onScreen(V)) return;
  for (let i = 0; i < 16; i++) {
    const left = i < 10, wx = left ? 1082 + i * 7 + rnd(i * 3) * 4 : 1594 + (i - 10) * 6 + rnd(i) * 3; const gy = GROUND(wx); if (gy > -2) continue;
    const x = R(V.X(wx)), y = R(V.Y(gy)) + 2; if (x < -12 || x > 552) continue;
    tuftG(c, x, y, 7 + rnd(i * 5) * 7, 3 + (i % 3), i * 13, Math.sin(t * 1.7 + wx * 0.05) * 1.6);
  }
  papyrusClumps(c, V, t, [[1590, 66, 2], [1614, 52, 1]]);
}
function tuftG(g, x, y, h, n, seed, sway) {
  const cols = ["#3E5A26", "#5E8436", "#86A848", "#B4C868"];
  for (let i = 0; i < n; i++) { const bx = x + (i - (n - 1) / 2) * 2 + R((rnd(seed + i * 3) - 0.5) * 2), bh = h * (0.6 + rnd(seed + i * 7) * 0.5), lean = (rnd(seed + i * 11) - 0.5) * h * 0.5 + sway; for (let j = 0; j <= bh; j++) { const k = j / bh; g.px(R(bx + lean * k * k), R(y - j), j > bh * 0.7 ? cols[3] : cols[i % 3]); } }
}

export function hud(c, V, t) {}
