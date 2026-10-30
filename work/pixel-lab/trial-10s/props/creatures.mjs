// Trial 10 s · new props for the catalog: heart, eye, bat, ghost. Same idiom as the effort films: flat tone bands with
// narrow dithered seams (band), a dark 1-px outline, light from the upper left, everything a pure function of t and the
// state vector st. draw(c, cx, cy, z, t, st, look) works in screen space; z = camera zoom × prop size.
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, lerp, rnd, noise1, band, tintPx } from "../engine/layout.mjs";

const O = "#0B0812";
const LIGHT = [-0.5, -0.62, 0.6];
const shade = (nx, ny, nz) => Math.max(0, LIGHT[0] * nx + LIGHT[1] * ny + LIGHT[2] * nz);
/** Generic body raster: inside(u, v) in local units, height(u, v) for the pseudo-normal; colour(v, u, v) picks the tone. */
function body(c, cx, cy, z, ext, inside, height, colour, a = 1) {
  const x0 = Math.floor(cx - ext[0] * z) - 2, x1 = Math.ceil(cx + ext[0] * z) + 2, y0 = Math.floor(cy - ext[1] * z) - 2, y1 = Math.ceil(cy + ext[2] * z) + 2, e = 1 / z;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = (x + 0.5 - cx) / z, v = (y + 0.5 - cy) / z; if (!inside(u, v)) continue; if (a < 1 && a <= bayer(x, y)) continue;
    if (!inside(u - e, v) || !inside(u + e, v) || !inside(u, v - e) || !inside(u, v + e)) { c.px(x, y, O); continue; }
    const hx = (height(u + 0.8, v) - height(u - 0.8, v)) / 1.6, hy = (height(u, v + 0.8) - height(u, v - 0.8)) / 1.6, n = Math.hypot(hx, hy, 1);
    c.px(x, y, colour(shade(-hx / n, -hy / n, 1 / n), u, v, x, y));
  }
}

// ---------------------------------------------------------------- heart: st { phase (beats, integrated), glow 0..1, a }
const HEART = ["#2A0410", "#5A0A1E", "#8E1428", "#C42636", "#EA4A4E", "#FF8478", "#FFC8BC"];
const heartF = (u, v) => { const x = u / 58, y = -v / 58 + 0.18; return Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y; };
export function drawHeart(c, cx, cy, z, t, st) {
  const ph = st.phase % 1, lub = Math.exp(-Math.pow((ph - 0.06) / 0.05, 2)), dub = 0.6 * Math.exp(-Math.pow((ph - 0.24) / 0.05, 2)), pump = lub + dub;
  const s = z * (1 + 0.085 * pump), F = (u, v) => heartF(u, v);
  // glow halo (pulses with the beat)
  const g = st.a * (0.18 * pump + 0.55 * st.glow * (0.7 + 0.3 * pump));
  if (g > 0.01) { const hr = 98 * s; for (let y = Math.floor(cy - hr); y <= Math.ceil(cy + hr); y++) for (let x = Math.floor(cx - hr); x <= Math.ceil(cx + hr); x++) { const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1) / hr; if (d < 1) tintPx(c, x, y, "#FF6A6A", g * Math.pow(1 - d, 1.6) * 0.8, 5); } }
  // beat ring wave on every "lub"
  if (ph < 0.45) { const k = ph / 0.45, rr = (70 + 50 * k) * s, aa = st.a * (1 - k) * 0.8 * (0.35 + 0.65 * Math.max(st.glow, clamp01((st.bpm - 70) / 70)));
    for (let q = 0; q < 160; q++) { const an = (q / 160) * TAU, X = R(cx + Math.cos(an) * rr), Y = R(cy + Math.sin(an) * rr * 0.92 - 4 * s); if (aa > bayer(X, Y)) c.px(X, Y, "#FF9A8E"); } }
  body(c, cx, cy, s, [64, 50, 62], (u, v) => F(u, v) <= 0, (u, v) => 26 * Math.sqrt(clamp01(-F(u, v) * 2.2)),
    (L, u, v, x, y) => { let val = 0.18 + 0.78 * L + 0.12 * st.glow; const hl = Math.hypot((u + 26) / 12, (v + 22) / 7); if (hl < 1) val = 0.95 + 0.05 * (1 - hl); return band(HEART, val, x, y, 0.4); }, st.a);
  // a small specular glint and a darker centre crease
  for (let i = 0; i < 3; i++) if (st.a > bayer(R(cx + (-30 + i) * s), R(cy - 26 * s))) c.px(R(cx + (-30 + i) * s), R(cy - 26 * s), "#FFF4EE");
  return { cx, cy, box: { x0: cx - 64 * s, y0: cy - 52 * s, x1: cx + 64 * s, y1: cy + 62 * s }, pt: [cx, cy] };
}

// ---------------------------------------------------------------- eye: st { look 0..1 toward look[], wide 0..1, blink 0..1, glow 0..1, a }, look = screen point or null
const SKIN = ["#2A1420", "#4A2430", "#7A3E44", "#A8605A", "#D08A72", "#ECB494"];
const IRIS = ["#0E2A2A", "#1C4A44", "#2E6E5C", "#4E9670", "#86BE7C", "#C6E09A"];
export function drawEye(c, cx, cy, z, t, st, look) {
  const W = 78, H = 44, lens = (u, v) => Math.abs(v) <= H * (1 - Math.pow(Math.abs(u) / W, 2.2)) ** 0.75;
  // idle glances: smooth, deterministic
  const gx = 9 * Math.sin(t * 0.9) * (1 - st.look), gy = 3 * Math.sin(t * 1.3 + 1) * (1 - st.look);
  let lx = gx, ly = gy;
  if (look && st.look > 0) { const dx = look[0] - cx, dy = look[1] - cy, d = Math.hypot(dx, dy) || 1; lx = lerp(gx, (dx / d) * 22, st.look); ly = lerp(gy, (dy / d) * 12, st.look); }
  const ir = 30, pr = lerp(11, 22, st.wide), lid = clamp01(st.blink);
  // eyeshine glow around the eye at night
  if (st.glow > 0.01) for (let y = Math.floor(cy - 90 * z); y <= Math.ceil(cy + 90 * z); y++) for (let x = Math.floor(cx - 120 * z); x <= Math.ceil(cx + 120 * z); x++) { const d = Math.hypot((x + 0.5 - cx) / (120 * z), (y + 0.5 - cy) / (90 * z)); if (d < 1) tintPx(c, x, y, "#B8F06A", st.a * st.glow * 0.5 * Math.pow(1 - d, 1.8), 5); }
  // the skin around the eye (a soft almond patch) with the lids
  body(c, cx, cy, z, [96, 66, 66], (u, v) => Math.pow(u / 96, 2) + Math.pow(v / 64, 2) <= 1, (u, v) => 18 * Math.sqrt(clamp01(1 - Math.pow(u / 96, 2) - Math.pow(v / 64, 2))),
    (L, u, v, x, y) => band(SKIN, 0.15 + 0.75 * L, x, y, 0.4), st.a);
  const x0 = Math.floor(cx - W * z), x1 = Math.ceil(cx + W * z), y0 = Math.floor(cy - H * z), y1 = Math.ceil(cy + H * z);
  const lidEdge = (u) => -H * (1 - Math.pow(Math.abs(u) / W, 2.2)) ** 0.75 + lid * 2 * H * (1 - Math.pow(Math.abs(u) / W, 2.2)) ** 0.75;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const u = (x + 0.5 - cx) / z, v = (y + 0.5 - cy) / z; if (!lens(u, v)) continue; if (st.a <= bayer(x, y)) continue;
    const edge = !lens(u - 1 / z, v) || !lens(u + 1 / z, v) || !lens(u, v - 1 / z) || !lens(u, v + 1 / z);
    if (v < lidEdge(u)) { const top = -H * (1 - Math.pow(Math.abs(u) / W, 2.2)) ** 0.75, k = clamp01((v - top) / Math.max(1, lidEdge(u) - top)); c.px(x, y, v > lidEdge(u) - 1.6 / z ? O : band(SKIN, 0.78 - 0.3 * k - 0.15 * Math.pow(Math.abs(u) / W, 2), x, y, 0.4)); continue; }
    if (edge) { c.px(x, y, O); continue; }
    const du = u - lx, dv = v - ly, d = Math.hypot(du, dv);
    let col;
    if (d < pr) col = st.glow > 0.05 && st.glow * (1 - d / pr) * 1.6 > bayer(x, y) ? (d < pr * 0.5 ? "#F6FFC8" : "#C8F07A") : "#06080A";
    else if (d < ir) { const stri = 0.08 * Math.sin(Math.atan2(dv, du) * 14 + d * 0.3), val = 0.25 + 0.55 * (d - pr) / (ir - pr) * (dv > 0 ? 1 : 0.7) + stri + 0.25 * st.glow; col = d > ir - 1.6 ? O : band(IRIS, val, x, y, 0.4); }
    else { const sv = 0.9 - 0.45 * clamp01((v + H * 0.2) / H) * 0 - 0.35 * clamp01((H * 0.7 + v - lidEdge(u) * 0) / (H * 2)) - 0.25 * Math.pow(Math.abs(u) / W, 2); col = band(["#5A5A78", "#9A9AB8", "#D4D4E6", "#F4F2FA"], sv, x, y, 0.4); }
    // shadow of the upper lid on the eyeball
    if (v < lidEdge(u) + 5 && d >= ir) col = band(["#5A5A78", "#9A9AB8", "#D4D4E6"], 0.3, x, y, 0.4);
    c.px(x, y, col);
  }
  // highlights on the cornea
  if (lid < 0.8) for (const [hx, hy, hr] of [[-9, -11, 5], [7, 6, 2]]) for (let y = -hr; y <= hr; y++) for (let x = -hr; x <= hr; x++) if (x * x + y * y <= hr * hr) { const X = R(cx + (lx + hx + x * 0.5) * z), Y = R(cy + (ly + hy + y * 0.5) * z); if (st.a > bayer(X, Y) && (y + 0.5) * 1 / z + (Y - cy) / z >= lidEdge((X - cx) / z)) c.px(X, Y, "#FFFFFF"); }
  // lashes on the upper lid
  for (let k = 0; k < 7; k++) { const u = -W * 0.75 + k * W * 0.25, ve = lidEdge(u), a0 = -Math.PI / 2 - 0.5 + k * 0.17; const X0 = cx + u * z, Y0 = cy + ve * z;
    for (let s = 0; s < 9 * z; s++) { const X = R(X0 + Math.cos(a0) * s), Y = R(Y0 + Math.sin(a0) * s - (lid > 0.5 ? 0 : 0)); if (st.a > bayer(X, Y)) c.px(X, Y, O); } }
  return { cx, cy, box: { x0: cx - 96 * z, y0: cy - 64 * z, x1: cx + 96 * z, y1: cy + 64 * z }, pt: [cx + lx * z, cy + ly * z] };
}

// ---------------------------------------------------------------- bat: st { fly 0..1, hang 0..1, ping 0..1, pingT0, a }, look = target point or null
const FUR = ["#140C22", "#241838", "#382A56", "#4E3E76", "#6A5A9A", "#8E80BE"], WING = ["#1C1430", "#2E2250", "#46366E", "#5E4C8E", "#7A68AA"];
const inPoly = (P, x, y) => { let k = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k; } return k; };
export function drawBat(c, cx, cy, z, t, st, look) {
  const fly = st.fly, hang = st.hang;
  const ox = fly * 24 * Math.sin(t * 1.7), oy = fly * 12 * Math.sin(t * 3.4) - hang * 8;
  const X = cx + ox * z, Y = cy + oy * z, flip = hang > 0.5 ? -1 : 1;
  const ph = t * lerp(4, 12, fly), flap = Math.sin(ph), spread = lerp(0.18, 1, fly), lift = flap * 0.55 * fly;
  // the twig it hangs from
  if (hang > 0.02) { const top = R(Y - 52 * z); for (let x = R(X - 70 * z); x <= R(X + 70 * z); x++) { const yy = top + R(Math.sin(x * 0.07) * 1.5); if (st.a * hang > bayer(x, yy)) { c.px(x, yy, "#4A3424"); c.px(x, yy + 1, "#24180E"); } } }
  // wings: arm to the wrist, three fingers, scalloped trailing edge between the finger tips
  for (const side of [-1, 1]) {
    const sh = [10, -8], rot = (p) => { const dx = p[0] - sh[0], dy = p[1] - sh[1], a = -lift, ca = Math.cos(a), sa = Math.sin(a); return [sh[0] + (dx * ca - dy * sa) * spread, sh[1] + (dx * sa + dy * ca) * (0.55 + 0.45 * spread)]; };
    const wrist = rot([46, -34]), f1 = rot([96, -26]), f2 = rot([90, 8]), f3 = rot([62, 26]), att = [12, 18];
    const scallop = (a, b, n = 6) => Array.from({ length: n }, (_, i) => { const u = (i + 1) / (n + 1), mx = lerp(a[0], b[0], u), my = lerp(a[1], b[1], u), sag = Math.sin(Math.PI * u) * 9 * (0.6 + 0.4 * spread); const nx = mx - sh[0], ny = my - sh[1], d = Math.hypot(nx, ny) || 1; return [mx - (nx / d) * sag, my - (ny / d) * sag]; });
    const pts = [sh, wrist, f1, ...scallop(f1, f2), f2, ...scallop(f2, f3), f3, ...scallop(f3, att, 5), att];
    const S = pts.map(([u, v]) => [X + side * u * z, Y + v * flip * z]);
    const xs = S.map((p) => p[0]), ys = S.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      if (!inPoly(S, x + 0.5, y + 0.5) || st.a <= bayer(x, y)) continue;
      const edge = !inPoly(S, x - 0.5, y + 0.5) || !inPoly(S, x + 1.5, y + 0.5) || !inPoly(S, x + 0.5, y - 0.5) || !inPoly(S, x + 0.5, y + 1.5);
      const top = !inPoly(S, x + 0.5, y - 0.5 - 1.5 * flip);
      const u = (x + 0.5 - X) / z * side, v = (y + 0.5 - Y) / z * flip;
      c.px(x, y, edge ? (top && flip > 0 ? WING[4] : "#0B0812") : band(WING, 0.62 - 0.006 * v - 0.0025 * u + 0.18 * lift, x, y, 0.4));
    }
    const bone = (a, b, col) => { const [ax, ay] = [X + side * a[0] * z, Y + a[1] * flip * z], [bx, by] = [X + side * b[0] * z, Y + b[1] * flip * z], n = Math.ceil(Math.hypot(bx - ax, by - ay)); for (let i = 0; i <= n; i++) { const px = R(lerp(ax, bx, i / n)), py = R(lerp(ay, by, i / n)); if (st.a > bayer(px, py)) c.px(px, py, col); } };
    bone(sh, wrist, WING[4]); bone(wrist, f1, WING[3]); bone(wrist, f2, WING[3]); bone(wrist, f3, WING[3]);
    { const wx = R(X + side * wrist[0] * z), wy = R(Y + wrist[1] * flip * z); if (st.a > bayer(wx, wy)) { c.px(wx, wy - flip, "#B8AEE0"); c.px(wx + side, wy - flip, "#B8AEE0"); } }   // the thumb claw
  }
  // body + head + ears: one soft round shape, lit from the moon (upper left)
  const ins = (u, v) => { const w = v * flip; return Math.pow(u / 17, 2) + Math.pow((w - 8) / 21, 2) <= 1 || Math.pow(u / 18, 2) + Math.pow((w + 16) / 16, 2) <= 1 || (Math.abs(u) > 4 && Math.abs(u) < 17 && w < -24 && w > -46 + Math.abs(Math.abs(u) - 10.5) * 3.2); };
  body(c, X, Y, z, [20, 48, 32], ins, (u, v) => 9 * Math.sqrt(clamp01(1 - Math.pow(u / 19, 2) - Math.pow((v * flip + 4) / 36, 2))) + 2, (L, u, v, x, y) => band(FUR, 0.12 + 0.8 * L + (v * flip > 4 && Math.abs(u) < 9 ? 0.12 : 0), x, y, 0.4), st.a);
  // pink inner ears
  for (const side of [-1, 1]) for (let w = -40; w <= -28; w++) for (let u = 8; u <= 13; u++) { const ok = Math.abs(u - 10.5) < (w + 46) / 6.4 - 0.6; if (!ok) continue; const x = R(X + side * u * z), y = R(Y + w * flip * z); if (st.a > bayer(x, y)) c.px(x, y, "#B85A86"); }
  // face: big round eyes with glints, nose, two small fangs
  for (const side of [-1, 1]) { const ex = X + side * 7.5 * z, ey = Y - 17 * flip * z, er = 4.6 * z;
    for (let y = Math.floor(ey - er); y <= Math.ceil(ey + er); y++) for (let x = Math.floor(ex - er); x <= Math.ceil(ex + er); x++) { const d = Math.hypot(x + 0.5 - ex, y + 0.5 - ey) / er; if (d > 1 || st.a <= bayer(x, y)) continue; c.px(x, y, d > 0.82 ? "#0B0812" : Math.hypot(x + 0.5 - ex - 0.8 * z, y + 0.5 - ey) / er < 0.5 ? "#140C22" : "#F4F0FF"); }
    const gx = R(ex - 1.4 * z), gy = R(ey - 1.6 * z * flip); if (st.a > bayer(gx, gy)) c.px(gx, gy, "#FFFFFF"); }
  { const nx = R(X), ny = R(Y - 11 * flip * z); if (st.a > bayer(nx, ny)) { c.px(nx, ny, "#D07AA0"); c.px(nx - 1, ny, "#D07AA0"); } }
  for (const side of [-1, 1]) { const fx = R(X + side * 3.2 * z), fy = R(Y - 7 * flip * z); for (let k = 0; k < Math.max(2, R(2 * z)); k++) if (st.a > bayer(fx, fy + k * flip)) c.px(fx, fy + k * flip, "#FFFFFF"); }
  // sonar: arcs travel from the mouth toward the target, one every 0.28 s while pinging
  if (st.ping > 0.02) { const tx = look ? look[0] - X : 120, ty = look ? look[1] - Y : 0, ang = Math.atan2(ty, tx);
    for (let k = 0; k < 4; k++) { const phs = ((t - st.pingT0) / 0.28 - k * 0.25) % 1; if (phs < 0 || t < st.pingT0) continue; const rr = (20 + 120 * phs) * z, aa = st.a * st.ping * (1 - phs);
      for (let q = -16; q <= 16; q++) { const an = ang + q * 0.035, px = R(X + Math.cos(an) * rr), py = R(Y - 8 * z + Math.sin(an) * rr); if (aa > bayer(px, py)) { c.px(px, py, "#BFF2FF"); c.px(px, py + 1, "#5AB8E8"); } } } }
  return { cx: X, cy: Y, box: { x0: X - 96 * spread * z - 8, y0: Y - 50 * z, x1: X + 96 * spread * z + 8, y1: Y + 36 * z }, pt: [X, Y - 10 * z] };
}

// ---------------------------------------------------------------- ghost: st { boo 0..1, fade 0..1, a }
const SHEET = ["#5A5490", "#8A84C0", "#B8B4E0", "#DCDAF2", "#F6F4FF"];
export function drawGhost(c, cx, cy, z, t, st) {
  const bob = 7 * Math.sin(t * 2.1), s = z * (1 + 0.22 * st.boo), Y = cy + bob * z, a = st.a * (1 - 0.6 * st.fade);
  const hem = (u) => 54 + 6 * Math.sin(u * 0.16 + t * 5) + 4 * Math.sin(u * 0.31 - t * 3);
  const inside = (u, v) => { if (v < -14) return Math.pow(u / 50, 2) + Math.pow((v + 14) / 52, 2) <= 1; const w = 50 + 6 * Math.sin(v * 0.05 + t * 2) + (st.boo > 0 && v > -6 && v < 16 ? 22 * st.boo * clamp01(1 - Math.abs(v - 4) / 12) : 0); return Math.abs(u) <= w && v <= hem(u); };
  body(c, cx, Y, s, [74, 68, 66], inside, (u, v) => 14 * Math.sqrt(clamp01(1 - Math.pow(u / 54, 2))) * (v < -14 ? Math.sqrt(clamp01(1 - Math.pow((v + 14) / 52, 2))) : 1),
    (L, u, v, x, y) => band(SHEET, 0.3 + 0.7 * L - 0.1 * clamp01((v - 20) / 40), x, y, 0.4), a);
  // eyes and mouth (boo opens the mouth wide)
  const face = (u, v, rx, ry, col) => { for (let y = Math.floor(Y + (v - ry) * s); y <= Math.ceil(Y + (v + ry) * s); y++) for (let x = Math.floor(cx + (u - rx) * s); x <= Math.ceil(cx + (u + rx) * s); x++) if (Math.pow((x + 0.5 - cx - u * s) / (rx * s), 2) + Math.pow((y + 0.5 - Y - v * s) / (ry * s), 2) <= 1 && a > bayer(x, y)) c.px(x, y, col); };
  face(-17, -22, 7, 10 + 2 * st.boo, "#120A1E"); face(17, -22, 7, 10 + 2 * st.boo, "#120A1E");
  face(-19, -26, 2, 3, "#FFFFFF"); face(15, -26, 2, 3, "#FFFFFF");
  face(0, 4 + 4 * st.boo, 6 + 8 * st.boo, 4 + 12 * st.boo, "#120A1E");
  return { cx, cy: Y, box: { x0: cx - 72 * s, y0: Y - 66 * s, x1: cx + 72 * s, y1: Y + 60 * s }, pt: [cx, Y - 10 * s] };
}
