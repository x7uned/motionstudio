// LV4 · crocodile — a golden swamp (RANGE BIOME.swamp = 1620..2160, REST croc {1890, −60}: the water surface sits at
// screen y 540), golden hour under a big low sun. On the left the river's papyrus spit carries a mangrove whose prop
// roots arch into the water; lily pads, dragonflies, a shallow olive-golden swamp with a muddy bottom (water weeds, fish,
// a sunken log); across the water a far bank of mangroves above a golden far-water band with the sun's glitter path;
// on the right a wet mud bank with cattails rises into the desert's damp sand at x 2160 (ground y = LAND).
// "Crocodiles": a cute chibi croc lies on a mud hump in the water, head and front up under the sun, its long toothy
// snout pointing at the shore, both big glossy eyes on the camera. "…a thousand": a playful double jaw SNAP with chomp
// lines. "They wait under the water": it slides back off the hump and goes under (a dim shape in the murk heading for
// the shore), then only its eyes and nostrils rise by the shore, still looking at the camera. "right by the shore": a
// gazelle trots in to drink; the eyes glide a little closer, a "!" pops over the gazelle and it pronks back onto the
// sand; the croc blinks innocently. Comic suspense, no attack. Pure functions of t.
import { BIOME, LAND } from "../timeline.mjs";
import { drawWater } from "../world.mjs";
import { sign, blinkAt, fade, mix, bayer, rnd, ell, bez, blob } from "../cute.mjs";
import { R, sm, ease, clamp01, lerp, underwater, murk, waterline, splash, ripples, bubble, wake, chomp, exclaim, worldLayer, thick, tuft } from "./river-kit.mjs";
import { worldBack, GROUND, farLine, UW_S, SHORE } from "./river-world.mjs";
import { drawCroc, drawFloat, crocPoint, TIP } from "./swamp-croc.mjs";
import { drawGazelle } from "./swamp-gazelle.mjs";
import { ST, CX, CY, SIGN_X, crocAt, gazelleAt } from "./swamp-time.mjs";
export { ICON } from "./swamp-croc.mjs";

export const RANGE = BIOME.swamp;
export const DRAGONFLY_PER = [2.6, 3.5];   // hover-then-dart period of the two dragonflies (the dart is the last 20 %)
const [X0, X1] = RANGE;
const MURK = "#7E7838";
const onScreen = (V) => V.x1 > X0 - 60 && V.x0 < X1 + 60;
const clipX = (V) => ({ x0: Math.max(0, R(V.X(X0))), x1: Math.min(540, R(V.X(X1))) });
const win = (t, t0, dur) => (t < t0 || t > t0 + dur ? 0 : Math.sin((Math.PI * (t - t0)) / dur));

// ---------------------------------------------------------------- the mangrove on the spit (static layer, drawn once)
const MG = { x: 1650, base: -20 };
let MANGROVE = null;
const mangrove = () => (MANGROVE ??= worldLayer(1580, -330, 230, 520, (g, L, T) => {
  const P = (wx, wy) => [L(wx), T(wy)], BARK = ["#1E120A", "#3A2414", "#5A3A22", "#7A5432", "#9A7044", "#B88C5A", "#D4A872", "#ECC690"];
  // prop roots arching from the trunk into the water (their lower ends are tinted by the water)
  for (const [y0, x1, y1, bend] of [[-70, 1704, 60, 30], [-56, 1690, 44, 20], [-84, 1726, 70, 40], [-44, 1676, 30, 12], [-62, 1612, 40, -24], [-48, 1630, 26, -14]]) {
    const pts = bez(P(MG.x + (x1 > MG.x ? 4 : -4), y0), P((MG.x + x1) / 2 + bend * 0.2, y0 - 30), P(x1, y1), 30);
    for (let i = 0; i < pts.length - 1; i++) { const wy = pts[i][1] - 330, wet = wy > 0 ? Math.min(0.6, 0.4 + wy / 300) : 0, r = i < 4 ? 2 : 1.5;
      const C = (col) => (wet ? mix(col, UW_S, wet) : col);
      thick(g, [pts[i], pts[i + 1]], r > 1.8 ? 2 : 1, C(BARK[2])); g.px(R(pts[i][0]), R(pts[i][1]) - 1, C(BARK[5])); }
  }
  // trunk
  blob(g, [[P(MG.x - 9, MG.base), P(MG.x - 6, -120), P(MG.x - 2, -200), P(MG.x + 5, -200), P(MG.x + 8, -120), P(MG.x + 11, MG.base)]], { ramp: BARK, thick: 6, base: 3.0, gain: 1.4, litOutline: "#FFD27A" });
  for (const [bx, by, ex, ey] of [[MG.x, -170, MG.x - 40, -230], [MG.x + 2, -150, MG.x + 56, -214], [MG.x, -196, MG.x + 18, -260]]) blob(g, [[P(bx - 3, by), P(ex - 2, ey), P(ex + 2, ey), P(bx + 3, by)]], { ramp: BARK, thick: 3, base: 2.8, gain: 1.2 });
  // canopy: leafy clumps, dark olive with a golden rim where the low sun hits them
  const clumps = [[MG.x - 44, -232, 40, 26], [MG.x + 10, -258, 46, 30], [MG.x + 62, -222, 40, 24], [MG.x - 16, -206, 44, 22], [MG.x + 40, -196, 36, 18], [MG.x + 92, -244, 26, 18]];
  for (const [cx, cy, rx, ry] of clumps) for (let wy = R(cy - ry); wy <= R(cy + ry); wy++) for (let wx = R(cx - rx); wx <= R(cx + rx); wx++) {
    const d = ((wx - cx) / rx) ** 2 + ((wy - cy) / ry) ** 2; if (d > 1 || (rnd(wx * 7 + wy * 13) < 0.25 && d > 0.75)) continue;
    const lit = (wx - cx) / rx * 0.7 - (wy - cy) / ry > 0.55 && d > 0.35, shade = (wy - cy) / ry > 0.35;
    g.px(L(wx), T(wy), lit ? (bayer(wx, wy) > 0.4 ? "#E8C058" : "#B8A040") : shade ? (bayer(wx, wy) > 0.5 ? "#2E3A18" : "#3A4A1E") : rnd(wx * 3 + wy * 5) < 0.1 ? "#6A7A2E" : "#4E5E24");
  }
  // hanging aerial roots under the canopy
  for (let i = 0; i < 9; i++) { const wx = MG.x - 50 + i * 16 + rnd(i) * 6, top = -200 + rnd(i * 3) * 14, len = 20 + rnd(i * 5) * 40; for (let k = 0; k < len; k++) g.px(L(wx + Math.sin(k * 0.2 + i) * 0.6), T(top + k), k % 5 ? "#5A4428" : "#7A5C34"); }
}));

// ---------------------------------------------------------------- water + terrain
export function fill(c, V, t) {
  if (!onScreen(V)) return;
  drawWater(c, V, t, X0, X1, 0);
  const { x0, x1 } = clipX(V); murk(c, x0, x1, V.Y(0) + 2, MURK, 0.66, 0.8, 300);
}
export function back(c, V, t) {
  if (!onScreen(V)) return;
  worldBack().blit(c, V, clipX(V));
  // the sun's glitter path on the far water under the low sun
  for (let i = 0; i < 40; i++) { const wx = 1890 + (rnd(i * 5) - 0.5) * 120 * (0.4 + rnd(i * 9)), wy = -31 + rnd(i * 9) * 29, on = Math.sin(t * (3 + rnd(i) * 5) + i * 1.3); if (on > 0.25) { const x = R(V.X(wx)), y = R(V.Y(wy)); c.px(x, y, "#FFF6D0"); if (on > 0.7) { c.px(x - 1, y, "#FFD890"); c.px(x + 1, y, "#FFD890"); } } }
  // two herons on the far bank
  for (const [wx, ph] of [[1810, 0.4], [2050, 2.1]]) { const x = R(V.X(wx)), y = R(V.Y(farLine(wx))), nod = Math.sin(t * 0.9 + ph) > 0.8 ? 1 : 0; c.rect(x - 2, y - 7, 4, 3, "#9AA0B0"); c.px(x + 2, y - 8 + nod, "#9AA0B0"); c.px(x + 2, y - 9 + nod, "#9AA0B0"); c.px(x + 3, y - 10 + nod, "#B0B6C4"); c.px(x + 4, y - 10 + nod, "#E8B040"); c.px(x - 1, y - 4, "#3A3030"); c.px(x + 1, y - 4, "#3A3030"); c.px(x - 1, y - 3, "#3A3030"); }
  // underwater: weeds from the muddy bottom, a few little fish
  const wly = R(V.Y(0)), uw = underwater(c, wly, UW_S, 0.5, 0.64, 200);
  for (let i = 0; i < 18; i++) {
    const wx = 1690 + i * 21 + rnd(i * 7) * 10, gy = GROUND(wx); if (gy < 60) continue; const n = 2 + (i % 2);
    for (let b = 0; b < n; b++) { const h = 22 + rnd(i * 11 + b) * 56, ph = t * 1.3 + i * 0.7 + b, x0 = V.X(wx + (b - n / 2) * 3), y0 = V.Y(gy) + 1;
      for (let k = 0; k < h; k++) { const sw = Math.sin(ph + k * 0.08) * (k / h) * 5, x = R(x0 + sw), y = R(y0 - k); if (y < wly + 6) break; uw.px(x, y, k > h * 0.75 ? "#A8B060" : "#5E7A38"); } }
  }
  for (let i = 0; i < 3; i++) {
    const per = 7 + i * 2.3, u = (((t / per + i * 0.37) % 1) + 1) % 1, dir = i % 2 ? -1 : 1, wx = dir > 0 ? 1700 + u * 330 : 2030 - u * 330, wy = 90 + i * 26 + Math.sin(t * 2 + i) * 3;
    const x = R(V.X(wx)), y = R(V.Y(wy)), fa = Math.min(sm(u, 0, 0.12), 1 - sm(u, 0.88, 1)); if (fa <= 0 || x < -6 || x > 546) continue; const uf = fade(uw, fa), col = ["#D8B060", "#C8A058", "#E0C070"][i];
    uf.rect(x - 3, y - 1, 7, 3, col); uf.rect(x - 2, y - 2, 5, 1, mix(col, "#FFFFFF", 0.3)); const tx = x - dir * 5; uf.px(tx, y - 1, col); uf.px(tx, y + 1, col); uf.px(tx + dir, y, col); uf.px(x + dir * 2, y - 1, "#0B0812");
  }
  // the mangrove (its canopy may lean 40 px over the river's edge)
  mangrove().blit(c, V, { below: wly, tint: UW_S, k: () => 0.45 });
}

// ---------------------------------------------------------------- actors
export function actors(c, V, t) {
  if (!onScreen(V)) return;
  const wly = R(V.Y(0)), uw = underwater(c, wly, UW_S, 0.5, 0.66, 260), wetK = (y) => Math.min(0.68, 0.48 + (y - wly) / 600);
  for (const [wx, w, fl] of [[1688, 11, 0], [1700, 15, 1], [1724, 9, 0], [1772, 12, 0], [2046, 9, 1]]) lily(c, R(V.X(wx)), wly + R(Math.sin(t * 2 + wx) * 0.7), w, fl);
  // LV 4 sign on a post standing in the water
  sign(uw, R(V.X(SIGN_X)), wly + 8, "LV 4", "wood", 1, t); waterline(c, R(V.X(SIGN_X)), wly, 3, t, 1, "#FFF6E0", "#E8D8B0");
  // ------------------------------------------------ the croc
  const cr = crocAt(t), x = R(V.X(cr.x)), y = R(V.Y(cr.y)), fl = cr.float;
  const tail = win(t, ST.hello[0], ST.hello[1]) + 0.25 * Math.sin(t * 1.1);
  const snapBlink = Math.max(...ST.snaps.map(([o, s]) => win(t, s - 0.05, 0.3))) * 0.5;
  if (cr.a > 0) {
    const sub = clamp01((y - 30 - wly) / 40);   // the deeper it is, the dimmer (murk)
    drawCroc(c, uw, x, y, wly, { snap: cr.snap, pitch: cr.pitch, look: [0, 0], blink: Math.max(blinkAt(t, 3.3, 0.8), snapBlink), tail: clamp01(tail), tint: UW_S, k: (yy) => Math.min(0.8, wetK(yy) + sub * 0.2), a: cr.a });
    // waterline foam while it crosses the surface
    const top = y - 50, bot = y + 84; if (top < wly && bot > wly && t > ST.slide[0]) waterline(c, x - 30, wly, 70, t, 1, "#FFF8E8", "#E0D4A8");
  }
  // chomp lines at each snap
  for (const [, s] of ST.snaps) { const [px, py] = crocPoint(x, y, TIP - 18, 10, 0, 0); chomp(c, R(px), R(py), (t - s - ST.shut) / ST.chomp, 30, "#FFF4C8", 7, Math.PI * 1.1, -0.2); }
  // into the water: splash + rings; a trail of bubbles while it swims under; rings where the eyes come up
  const sx = R(V.X(CX - 30)); splash(c, sx, wly, t - lerp(ST.slide[0], ST.slide[1], 0.62), ST.splash, 0.9, 71, ["#FFF6E0", "#E8D8A8"]);
  ripples(c, sx, wly, t - lerp(ST.slide[0], ST.slide[1], 0.7), 1.3, 60, 3, "#FFF0D0");
  for (let i = 0; i < 12; i++) { const t0 = ST.slide[1] - 0.15 + i * 0.05, u = t - t0; if (u < 0) continue; const p = crocAt(t0), bx = V.X(p.x + 40 + (rnd(i) - 0.5) * 40), by = V.Y(p.y + 20) - u * 70; if (by < wly + 2 || u > 1.6) continue; bubble(c, R(bx + Math.sin(u * 8 + i) * 2), R(by), 1.4 + rnd(i * 3) * 1.6, Math.min(1, u * 6), "#F0E8C0"); }
  if (fl.a > 0) {
    const fx = R(V.X(fl.x)), look = gazeAt(t), blink = Math.max(blinkAt(t, 2.9, 0.3) * (t < ST.innocent ? 1 : 0), win(t, ST.innocent, 0.32));
    drawFloat(c, uw, fx, wly + R(fl.sink), wly, { a: fl.a, look, blink, tint: UW_S, k: (yy) => Math.min(0.7, wetK(yy) + 0.06) });
    if (fl.sink < 20) waterline(c, fx, wly, 40, t, clamp01((20 - fl.sink) / 10), "#FFF8E8", "#E0D4A8");
    ripples(c, fx, wly, t - (ST.rise[0] + 0.12), 1.1, 44, 2, "#FFF0D0");
    const gl = sm(t, ST.glide[0], ST.glide[0] + 0.1) * (1 - sm(t, ST.glide[1] - 0.1, ST.glide[1] + 0.1)); wake(c, fx - 44, wly + 1, 1, gl * 0.8, t, "#FFF0D0");
  }
  // ------------------------------------------------ the gazelle
  if (t > ST.walk[0] - 0.05) {
    const gz = gazelleAt(t), gx = R(V.X(gz.x)), gy = R(V.Y(gz.y));
    drawGazelle(c, gx, gy, { t, phase: gz.phase, stride: gz.stride, neck: gz.neck, lean: gz.lean, air: gz.air, tuck: gz.tuck, startle: gz.startle, blink: blinkAt(t, 2.6, 1.2) });
    // ripples where the muzzle touches the water while it drinks
    const dr = sm(t, ST.dip[1] - 0.05, ST.dip[1]) * (1 - sm(t, ST.alert - 0.05, ST.alert)); if (dr > 0) for (let k = 0; k < 3; k++) ripples(c, R(V.X(gz.x - 44)), wly, ((t - ST.dip[1] + k * 0.27) % 0.8), 0.8, 14, 1, "#FFF0D0");
    // dust puff when it lands
    const lu = t - ST.hop[1]; if (lu > 0 && lu < 0.6) { const g = fade(c, 1 - lu / 0.6); for (let i = 0; i < 8; i++) { const sd = i % 2 ? 1 : -1, d = (8 + i * 2.5) * ease(Math.min(1, lu / 0.4)), r = 2 + (i % 3) + lu * 3; for (let Y = -r; Y <= r; Y++) for (let X = -r; X <= r; X++) if (X * X + Y * Y <= r * r && (X + Y + i) % 2 === 0) g.px(gx + sd * R(d) + R(X), gy - 3 - (i % 3) - R(lu * 8) + R(Y), "#F0D0A0"); } }
  }
  // dragonflies darting over the water (hover, then dart to a new spot), glinting in the low sun
  for (let i = 0; i < 2; i++) {
    const per = DRAGONFLY_PER[i], u = t / per + i * 0.5, k = u - Math.floor(u), n = Math.floor(u), spot = (m) => [(i ? 1968 : 1684) + rnd(m * 7 + i * 3) * (i ? 70 : 90), -74 - rnd(m * 3 + i) * 46];
    const [ax, ay] = spot(n), [bx, by] = spot(n + 1), e = ease(sm(k, 0.8, 1)), wx = lerp(ax, bx, e) + Math.sin(t * 9 + i) * 1.5, wy = lerp(ay, by, e) + Math.sin(t * 7 + i) * 2, dir = bx > ax ? 1 : -1;
    const dx = R(V.X(wx)), dy = R(V.Y(wy)), wing = Math.sin(t * 50 + i * 2) > 0;
    for (let q = -6; q <= 5; q++) c.px(dx + q * dir, dy, q > 3 ? "#1A2A50" : q > 1 ? "#3A8AC0" : "#5AB0E0"); c.px(dx + 5 * dir, dy - 1, "#1A2A50"); c.px(dx + 4 * dir, dy - 1, "#7AD0F0");
    for (const [wo, wl] of [[1, 6], [-1, 5]]) for (let q = 1; q <= wl; q++) { c.px(dx + (wo + 1) * dir, dy - q * (wing ? 1 : 0.5) - 1, "#F4FAFF"); c.px(dx + (wo + 2) * dir, dy - q * (wing ? 1 : 0.5) - 1, "#C8E4F4"); }
  }
}
function gazeAt(t) {   // the floating croc: camera → peeks at the gazelle while it drinks → back to the camera (innocent)
  const keys = [[0, [0, 0]], [ST.dip[1] + 0.05, [0.9, -0.1]], [ST.alert + 0.12, [0, 0]]];
  let cur = keys[0][1]; for (let i = 1; i < keys.length; i++) { const [tk, v] = keys[i]; if (t <= tk) break; const k = Math.min(1, (t - tk) / 0.22), e = k * k * (3 - 2 * k); cur = [cur[0] + (v[0] - cur[0]) * e, cur[1] + (v[1] - cur[1]) * e]; }
  return cur;
}
function lily(c, x, y, w, fl) {
  for (let k = -w; k <= w; k++) { if (k > 1 && k < 5) continue; const edge = Math.abs(k) > w - 2; c.px(x + k, y - 2, edge ? "#3A5A20" : Math.abs(k) < w - 5 ? "#B8C860" : "#8AAA44"); c.px(x + k, y - 1, edge ? "#3A5A20" : "#6A8A38"); c.px(x + k, y, "#3A4A20"); }
  if (!fl) return; const fx = x - 4, fy = y - 3;
  for (const [dx, dy, col] of [[0, -5, "#FFFFFF"], [-1, -4, "#FFF0E0"], [1, -4, "#FFF0E0"], [-2, -3, "#FFC8A8"], [2, -3, "#FFC8A8"], [-1, -3, "#FFE0C8"], [1, -3, "#FFE0C8"], [-3, -2, "#F8A890"], [3, -2, "#F8A890"], [-2, -1, "#E88870"], [0, -1, "#F8A890"], [2, -1, "#E88870"]]) c.px(fx + dx, fy + dy, col);
  c.px(fx, fy - 2, "#F8D040");
}

// ---------------------------------------------------------------- foreground: cattails on the right bank, grass on the spit
export function front(c, V, t) {
  if (!onScreen(V)) return;
  for (let i = 0; i < 9; i++) {
    const wx = 2094 + i * 7.5 + rnd(i * 3) * 4, gy = GROUND(wx), x0 = V.X(wx), y0 = V.Y(gy) + 1, h = 34 + rnd(i * 7) * 30, sw = Math.sin(t * 1.3 + wx * 0.05) * 2.5;
    for (let k = 0; k < h; k++) { const u = k / h; c.px(R(x0 + sw * u * u), R(y0 - k), u > 0.55 ? "#A8A040" : "#6A7A2C"); }
    if (i % 2 === 0) { const tx = R(x0 + sw), ty = R(y0 - h * 0.82); for (let k = 0; k < 9; k++) { c.px(tx - 1, ty + k, k === 0 || k === 8 ? "#4A2A12" : "#7A4A22"); c.px(tx, ty + k, k === 0 || k === 8 ? "#4A2A12" : "#9A6030"); c.px(tx + 1, ty + k, "#4A2A12"); } c.px(tx, ty - 1, "#6A7A2C"); c.px(tx, ty - 2, "#6A7A2C"); }
    else for (let k = 0; k < 10; k++) c.px(R(x0 + sw + k * 0.5), R(y0 - h + k * 1.2), "#C8B850");
  }
  for (let i = 0; i < 8; i++) { const wx = 1626 + i * 4.5 + rnd(i) * 3, gy = GROUND(wx); if (gy > -2) continue; tuft(c, R(V.X(wx)), R(V.Y(gy)) + 2, 6 + rnd(i * 5) * 6, 3, ["#4A5A20", "#6E7A2C", "#9A9A3A", "#D8C060"], i * 17, Math.sin(t * 1.6 + wx * 0.05) * 1.4); }
}

// ---------------------------------------------------------------- HUD: the "!" over the gazelle
export function hud(c, V, t) {
  if (!onScreen(V) || t < ST.alert - 0.02) return;
  const gz = gazelleAt(ST.alert), k = (t - ST.alert) / 0.3, a = 1 - sm(t, ST.hop[1] + 0.15, ST.hop[1] + 0.45);
  if (a > 0) exclaim(c, R(V.X(gz.x - 14)), R(V.Y(gz.y)) - 78, k, a);
}
