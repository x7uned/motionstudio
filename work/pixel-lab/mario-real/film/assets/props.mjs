// mario-real · props (new, 2026-10-29, drawn for this film): the swirling portal, a life-size brick block in 3D, the builder's
// measuring tape on the wall, a high-jump bar on stands, the speed dial, thick pixel arrows, measuring brackets, the «game
// window» frame, landing dust, a cracked paving tile, pigeons, a watering can, apples, a round yellow «chomper» silhouette and
// a golden glow. All pure functions of their arguments; presence a dissolves through ordered dither.
import { hex, mix, fade, Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { R, RG, pk, put, tint, quad, box3, clamp01, lerp, rnd, BY, TAU } from "../lib/cam.mjs";
import { GAME } from "./game-level.mjs";

const O = hex("#0B0812");
const PR = {
  portal: RG(["#1A0A3A", "#3A1A7A", "#6A30C8", "#7E6AF0", "#8EC4FF", "#E8F4FF"]), rim: RG(["#2A0E5A", "#8A4AE8", "#C8A8FF"]),
  tape: RG(["#8A6A00", "#D8A800", "#FFD21E", "#FFEA6A"]), metal: RG(["#3A3A4A", "#6A6A7E", "#9A9AB0", "#D2D2E2"]),
  bar: RG(["#7A1A1A", "#C83A2A", "#F2F2F2"]), stand: RG(["#2A2A3A", "#44445A", "#64647E", "#8A8AA4"]),
  dial: RG(["#141026", "#221C3A", "#30284E"]), arrow: RG(["#B07800", "#F2B400", "#FFD84A", "#FFF2A0"]), arrowR: RG(["#7A0E1A", "#C4202E", "#F24A4A", "#FF8A80"]),
  dust: RG(["#8A7A88", "#B0A2AC", "#D2C6CC", "#EEE6E8"]), crack: hex("#2A2232"), pigeon: RG(["#5A5A74", "#7E7E9A", "#A4A4BC", "#D0D0E0"]),
  can: RG(["#2A5A3A", "#3E8050", "#5AA86A", "#8AD092"]), water: hex("#9AD8FF"), apple: RG(["#5A0A12", "#A01A24", "#E0343A", "#FF7A6A"]), leafA: hex("#3A8A3A"),
  pac: RG(["#B07A00", "#F2C200", "#FFE24A", "#FFF6A0"]), glow: hex("#FFD24A"),
};
export { PR };

// ---------------------------------------------------------------- portal: a swirling oval (screen space), open = 0..1
export function portal(c, cx, cy, rx, ry, t, open = 1, a = 1) {
  if (open <= 0.01 || a <= 0) return;
  const RX = rx * open, RY = ry * (0.25 + 0.75 * open), g = a < 1 ? fade(c, a) : null;
  // outer glow
  for (let j = -Math.ceil(RY * 1.35); j <= Math.ceil(RY * 1.35); j++) for (let i = -Math.ceil(RX * 1.4); i <= Math.ceil(RX * 1.4); i++) {
    const x = R(cx + i), y = R(cy + j), q = Math.hypot(i / RX, j / RY);
    if (q > 1.35) continue;
    if (q > 1.0) { tint(c, x, y, PR.portal[3], 0.5 * (1.35 - q) / 0.35 * a * open, 4); continue; }
    if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue;
    if (q > 0.93) { put(c, x, y, pk(PR.rim, 0.5 + 0.5 * Math.sin(Math.atan2(j, i) * 3 + t * 6), x, y)); continue; }
    if (q > 0.88) { put(c, x, y, O); continue; }
    const ang = Math.atan2(j / RY, i / RX), sw = (ang / TAU) * 3 + q * 2.4 - t * 1.6, band = 0.5 + 0.5 * Math.sin(sw * TAU);
    put(c, x, y, pk(PR.portal, 0.15 + 0.55 * band * (0.4 + 0.6 * q) + 0.35 * (1 - q) ** 3, x, y));
  }
  // orbiting sparks
  for (let i = 0; i < 10; i++) { const an = (i / 10) * TAU + t * (1.2 + (i % 3) * 0.4), rr = 1.05 + 0.1 * Math.sin(t * 3 + i), x = R(cx + Math.cos(an) * RX * rr), y = R(cy + Math.sin(an) * RY * rr), s = Math.max(1, R(RX * 0.04));
    if (open > 0.3) (g || c).rect(x - s, y - s, s * 2, s * 2, i % 2 ? "#E8F4FF" : "#B8A8FF"); }
}

// ---------------------------------------------------------------- a life-size brick block (X0..X0+0.78, Y0.., Z0..Z0+0.78)
const BS = 0.78;
function brickUV(u, v, x, y, lv) {
  const B = GAME.brick, row = Math.floor(v * 4), bx = (u * 2 + (row % 2) * 0.5) % 1, by = (v * 4) % 1;
  if (u < 0.025 || v < 0.025 || u > 0.975 || v > 0.975) return GAME.mortar;
  if (bx < 0.04 || by < 0.1) return GAME.mortar;
  return pk(B, (by < 0.28 ? 0.85 : bx > 0.9 ? 0.32 : 0.6 - by * 0.15) + lv, x, y);
}
export function cube(c, C, X0, Y0, Z0, a = 1) {
  const X1 = X0 + BS, Y1 = Y0 + BS, Z1 = Z0 + BS, gate = (x, y) => a >= 1 || a > BY[(y & 3) * 4 + (x & 3)];
  box3(c, C, X0, X1, Y0, Y1, Z0, Z1, {
    front: (x, y) => gate(x, y) ? brickUV((C.wX(x, Z1) - X0) / BS, (Y1 - C.wY(y, Z1)) / BS, x, y, 0) : null,
    top: (x, y) => { if (!gate(x, y)) return null; const Z = C.planeZ(y, Y1); if (Z === null) return null; const X = C.x + (x + 0.5 - 270) / C.k(Z); return brickUV((X - X0) / BS, (Z1 - Z) / BS, x, y, 0.15); },
    side: (x, y) => { if (!gate(x, y)) return null; const Xs = C.x < X0 ? X0 : X1, dz = (C.f * (Xs - C.x)) / (x + 0.5 - 270), Z = C.d - dz, Y = C.h - ((y + 0.5 - C.hy) * dz) / C.f; return brickUV((Z1 - Z) / BS, (Y1 - Y) / BS, x, y, -0.3); },
  });
}
export { BS };

// ---------------------------------------------------------------- the measuring tape on the facade (X centre, from Y 0 up to L)
export function tape(c, C, X, L, t, o = {}) {
  if (L <= 0.01) return;
  const w = 0.2, k = C.k(0), x0 = C.sx(X - w / 2, 0), x1 = C.sx(X + w / 2, 0), yb = C.sy(0, 0), yt = C.sy(L, 0), a = o.a ?? 1;
  for (let y = Math.max(0, Math.floor(yt)); y < Math.min(c.h, Math.ceil(yb)); y++) { const Y = C.wY(y, 0);
    for (let x = Math.max(0, R(x0)); x < Math.min(c.w, R(x1)); x++) { if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue;
      const u = (x + 0.5 - x0) / (x1 - x0); if (u < 0.06 || u > 0.94) { put(c, x, y, PR.tape[0]); continue; }
      const cm = Y * 100, isM = Math.abs(cm - Math.round(cm / 100) * 100) < 1.2 * Math.max(1, 100 / k), isH = Math.abs(cm - Math.round(cm / 50) * 50) < 0.8 * Math.max(1, 100 / k), isD = k > 60 && Math.abs(cm - Math.round(cm / 10) * 10) < 0.5 * Math.max(1, 100 / k);
      if (isM && u < 0.75) { put(c, x, y, O); continue; } if (isH && u < 0.5) { put(c, x, y, O); continue; } if (isD && u < 0.25) { put(c, x, y, O); continue; }
      put(c, x, y, pk(PR.tape, 0.65 + (u < 0.2 ? 0.2 : 0), x, y)); } }
  // the metal end hook at the top
  const [hx, hy] = C.P(X, L, 0.02), hw = Math.max(2, R((w / 2 + 0.02) * k)), hh = Math.max(1, R(0.04 * k)); if (a > 0.5) { c.rect(R(hx - hw), R(hy - hh), hw * 2, hh, "#9A9AB0"); c.rect(R(hx - hw), R(hy - hh), hw * 2, 1, "#D2D2E2"); }
  // metre numbers on the tape (when they read)
  if (k > 70 && o.font) for (let m = 1; m <= Math.floor(L + 1e-6); m++) { const y = C.sy(m, 0); if (y < -20 || y > c.h + 20) continue; const txt = String(m), sc = k > 150 ? 2 : 1; const g = a < 1 ? fade(c, a) : c; g.text(o.font, txt, R((x0 + x1) / 2 - c.measure(o.font, txt, { scale: sc }) / 2 + (x1 - x0) * 0.18), R(y + 3), "#0B0812", { scale: sc }); }
}

// ---------------------------------------------------------------- high-jump bar on two stands (X0, X1 at depth Z), bar at H
export function jumpBar(c, C, X0, X1, Z, H, a = 1, rise = 1) {
  if (a <= 0) return; const g = (x, y) => a >= 1 || a > BY[(y & 3) * 4 + (x & 3)], hh = H * rise + 0.25;
  for (const X of [X0, X1]) {
    box3(c, C, X - 0.2, X + 0.2, 0, 0.04, Z - 0.2, Z + 0.2, { front: (x, y) => g(x, y) ? pk(PR.stand, 0.3, x, y) : null, top: (x, y) => g(x, y) ? pk(PR.stand, 0.55, x, y) : null, side: (x, y) => g(x, y) ? pk(PR.stand, 0.2, x, y) : null });
    box3(c, C, X - 0.035, X + 0.035, 0.04, hh, Z - 0.035, Z + 0.035, { front: (x, y) => { if (!g(x, y)) return null; const Y = C.wY(y, Z), stripe = Math.floor(Y / 0.1) % 2; return pk(PR.stand, stripe ? 0.75 : 0.45, x, y); }, side: (x, y) => g(x, y) ? pk(PR.stand, 0.25, x, y) : null, top: (x, y) => g(x, y) ? pk(PR.stand, 0.9, x, y) : null });
  }
  const Hb = H * rise; box3(c, C, X0, X1, Hb - 0.03, Hb + 0.03, Z - 0.03, Z + 0.03, { front: (x, y) => { if (!g(x, y)) return null; const X = C.wX(x, Z), s = Math.floor((X - X0) / 0.3) % 2; return s ? pk(PR.bar, 0.4, x, y) : pk(PR.bar, 0.95, x, y); }, top: (x, y) => g(x, y) ? pk(PR.bar, 0.95, x, y) : null, bottom: (x, y) => g(x, y) ? pk(PR.bar, 0.1, x, y) : null });
}

// ---------------------------------------------------------------- speed dial (screen), value v in km/h on a 0..60 scale
export function dial(c, cx, cy, r, v, a, o = {}) {
  if (a <= 0) return; const g = fade(c, a), ang = (q) => Math.PI * (1 - q);
  g.disc(R(cx), R(cy), R(r + 3), "#0B0812"); g.disc(R(cx), R(cy), R(r + 1), o.edge ?? "#F4CA50"); g.disc(R(cx), R(cy), R(r - 1), "#16112A");
  for (let i = 0; i <= 12; i++) { const q = i / 12, an = ang(q) - 0.0, x0 = cx + Math.cos(an) * (r - 3), y0 = cy - Math.sin(an) * (r - 3), L = i % 3 === 0 ? 7 : 4, x1 = cx + Math.cos(an) * (r - 3 - L), y1 = cy - Math.sin(an) * (r - 3 - L); g.line(R(x0), R(y0), R(x1), R(y1), i >= 10 ? "#FF6A5A" : "#E0CDF8"); }
  const q = clamp01(v / 60), an = ang(q), nx = cx + Math.cos(an) * (r - 8), ny = cy - Math.sin(an) * (r - 8);
  for (let w = -1; w <= 1; w++) g.line(R(cx + w), R(cy), R(nx + w), R(ny), "#FF6A5A"); g.disc(R(cx), R(cy), 3, "#FDFEED");
  g.rect(R(cx - r - 3), R(cy + 4), R(2 * r + 7), R(r * 0.35 + 3), "#0B0812");
}
// ---------------------------------------------------------------- thick pixel arrow from (x0, y0) to (x1, y1), width w (screen)
export function arrow(c, x0, y0, x1, y1, w, a = 1, ramp = PR.arrow) {
  if (a <= 0) return; const L = Math.hypot(x1 - x0, y1 - y0); if (L < 2) return;
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux, head = Math.min(L * 0.45, w * 2.4), hw = w * 1.9;
  const bx = x1 - ux * head, by = y1 - uy * head;
  const shaft = [[x0 + nx * w / 2, y0 + ny * w / 2], [bx + nx * w / 2, by + ny * w / 2], [bx + nx * hw / 2, by + ny * hw / 2], [x1, y1], [bx - nx * hw / 2, by - ny * hw / 2], [bx - nx * w / 2, by - ny * w / 2], [x0 - nx * w / 2, y0 - ny * w / 2]];
  const g = fade(c, a);
  const grow = (pts, d) => pts.map(([x, y]) => [x + (x - (x0 + x1) / 2) * 0 + Math.sign(x - (x0 + x1) / 2) * d * 0, y]);
  // outline: draw the polygon 1 px larger in every direction, then the fill with a light edge
  for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.poly(shaft.map(([x, y]) => [x + dx, y + dy]), "#0B0812");
  g.poly(grow(shaft, 0), null, (x, y) => { const s = (x - x0) * nx + (y - y0) * ny; return pk(ramp, 0.62 + clamp01(s / (hw / 2)) * 0.35 - clamp01(-s / (hw / 2)) * 0.3, x, y); });
}
// ---------------------------------------------------------------- a vertical measuring bracket (screen) with end ticks
export function bracket(c, x, y0, y1, a, col = "#FDFEED", tick = 7, dir = 1) {
  if (a <= 0) return; const g = fade(c, a), ya = R(Math.min(y0, y1)), yb = R(Math.max(y0, y1));
  for (const [dx, cc] of [[-1, "#0B0812"], [1, "#0B0812"], [0, col]]) g.rect(R(x) + dx, ya, 2, yb - ya + 1, cc);
  for (const yy of [ya, yb]) { g.rect(R(x) - (dir < 0 ? tick : 0) - 1, yy - 1, tick + 3, 4, "#0B0812"); g.rect(R(x) - (dir < 0 ? tick : 0), yy, tick + 1, 2, col); }
}
// ---------------------------------------------------------------- the game window frame (screen rect), a = presence
let TMP = null;
export function gameWindow(c, r, a, inner) {
  if (a <= 0) return; const g = fade(c, a);
  // the content is drawn at full strength into a copy, then dissolved in through the ordered dither (no one-frame pop)
  if (inner) { if (!TMP || TMP.w !== c.w || TMP.h !== c.h) TMP = new Canvas(c.w, c.h); TMP.d.set(c.d); TMP.poly = c.poly; inner(TMP, 1);
    for (let y = Math.max(0, r.y0); y < Math.min(c.h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(c.w, r.x1); x++) { if (a < 1 && a <= BY[(y & 3) * 4 + (x & 3)]) continue; const i = (y * c.w + x) * 3; c.d[i] = TMP.d[i]; c.d[i + 1] = TMP.d[i + 1]; c.d[i + 2] = TMP.d[i + 2]; } }
  g.rrect(r.x0 - 6, r.y0 - 6, r.x1 - r.x0 + 12, 4, "#0B0812", 1);
  for (const [x, y, w, h] of [[r.x0 - 6, r.y0 - 6, r.x1 - r.x0 + 12, 6], [r.x0 - 6, r.y1, r.x1 - r.x0 + 12, 6], [r.x0 - 6, r.y0, 6, r.y1 - r.y0], [r.x1, r.y0, 6, r.y1 - r.y0]]) g.rect(x, y, w, h, "#0B0812");
  for (const [x, y, w, h] of [[r.x0 - 4, r.y0 - 4, r.x1 - r.x0 + 8, 3], [r.x0 - 4, r.y1 + 1, r.x1 - r.x0 + 8, 3], [r.x0 - 4, r.y0 - 4, 3, r.y1 - r.y0 + 8], [r.x1 + 1, r.y0 - 4, 3, r.y1 - r.y0 + 8]]) g.rect(x, y, w, h, "#8D59DA");
  for (const [x, y, w, h] of [[r.x0 - 1, r.y0 - 1, r.x1 - r.x0 + 2, 1], [r.x0 - 1, r.y1, r.x1 - r.x0 + 2, 1], [r.x0 - 1, r.y0, 1, r.y1 - r.y0], [r.x1, r.y0, 1, r.y1 - r.y0]]) g.rect(x, y, w, h, "#E0CDF8");
  for (const [x, y] of [[r.x0 - 3, r.y0 - 3], [r.x1 + 1, r.y0 - 3], [r.x0 - 3, r.y1 + 1], [r.x1 + 1, r.y1 + 1]]) g.rect(x, y, 2, 2, "#2A1E40");
}
// ---------------------------------------------------------------- landing dust: puffs spreading along the ground (screen centre, scale k px/m)
export function dust(c, x, y, k, u, seed = 1) {
  if (u <= 0 || u >= 1) return; const a = 1 - u;
  for (let i = 0; i < 14; i++) { const side = i % 2 ? 1 : -1, sp = 0.35 + 0.65 * rnd(i * 7 + seed), dx = side * (0.15 + 0.85 * sp * (1 - Math.pow(1 - u, 2.2))) * k, dy = -(0.05 + 0.25 * rnd(i * 3 + seed)) * k * Math.sin(Math.PI * Math.min(1, u * 1.4)), r = (0.07 + 0.08 * rnd(i + seed)) * k * (0.6 + u);
    const cx = x + dx, cy = y + dy; for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let q = -Math.ceil(r); q <= Math.ceil(r); q++) { const d2 = (q * q + j * j) / (r * r); if (d2 > 1) continue; const X = R(cx + q), Y = R(cy + j); if (a * (1 - d2 * 0.5) <= BY[(Y & 3) * 4 + (X & 3)]) continue; put(c, X, Y, pk(PR.dust, 0.85 - (j + q * 0.3) / (2 * r) * 0.6 - 0.2, X, Y)); } }
}
// ---------------------------------------------------------------- a cracked paving tile around (X, Z): rays grow with g 0..1
export function crack(c, C, X, Z, g, seed = 3) {
  if (g <= 0) return;
  for (let i = 0; i < 9; i++) { const an = (i / 9) * TAU + rnd(i + seed) * 0.6, L = (0.25 + 0.45 * rnd(i * 5 + seed)) * clamp01(g * 1.4 - rnd(i) * 0.3); let px = X, pz = Z;
    for (let s = 0; s < 6; s++) { const f = (s + 1) / 6, jx = X + Math.cos(an + 0.25 * Math.sin(s * 2.1 + i)) * L * f, jz = Z + Math.sin(an + 0.25 * Math.sin(s * 2.1 + i)) * L * f * 0.6;
      const [a1, b1] = C.P(px, 0, pz), [a2, b2] = C.P(jx, 0, jz); c.line(R(a1), R(b1), R(a2), R(b2), PR.crack); if (s < 2) c.line(R(a1) + 1, R(b1), R(a2) + 1, R(b2), PR.crack); px = jx; pz = jz; } }
  // the dent: darker ring
  const [x, y] = C.P(X, 0, Z), k = C.k(Z), rx = 0.32 * k * clamp01(g * 2), ry = Math.max(2, rx * 0.22);
  for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) for (let i = -Math.ceil(rx); i <= Math.ceil(rx); i++) { const q = (i / rx) ** 2 + (j / ry) ** 2; if (q < 1) tint(c, R(x + i), R(y + j), PR.crack, 0.35 * (1 - q), 3); }
}
// ---------------------------------------------------------------- a pigeon (screen), s px per metre, flap 0..1 phase, fly 0..1 (wings open)
export function pigeon(c, x, y, s, t, fly = 0, dir = 1, seed = 0) {
  const b = Math.max(2, 0.16 * s), f = fly > 0.05 ? Math.sin(t * 22 + seed) : 0, g = c;
  g.ellipse(R(x), R(y - b * 0.8), Math.max(1, R(b * 1.1)), Math.max(1, R(b * 0.7)), pk(PR.pigeon, 0.45, R(x), R(y)));
  g.disc(R(x + dir * b * 0.9), R(y - b * 1.5), Math.max(1, R(b * 0.45)), pk(PR.pigeon, 0.7, R(x), R(y)));
  if (b >= 3) { g.px(R(x + dir * b * 1.05), R(y - b * 1.6), "#0B0812"); g.px(R(x + dir * b * 1.4), R(y - b * 1.4), "#E09A3A"); }
  if (fly > 0.05) { const wy = y - b * 0.9 - f * b * 1.6 * fly, wx = x - dir * b * 0.2; c.poly([[x - b * 0.6, y - b * 0.9], [x + b * 0.4, y - b * 0.9], [wx + dir * b * 0.2, wy - b * 0.4], [wx - dir * b * 1.6, wy]], pk(PR.pigeon, 0.8, R(x), R(y)), null); }
  else g.ellipse(R(x - dir * b * 0.2), R(y - b * 0.85), Math.max(1, R(b * 0.7)), Math.max(1, R(b * 0.35)), pk(PR.pigeon, 0.25, R(x), R(y)));
  g.rect(R(x - dir * b * 1.6), R(y - b * 0.9), Math.max(1, R(b * 0.6)), Math.max(1, R(b * 0.3)), pk(PR.pigeon, 0.2, R(x), R(y)));
}
// ---------------------------------------------------------------- watering can (screen, s px/m, angle)
export function wateringCan(c, x, y, s, ang = 0) {
  const P = (u, v) => [x + (u * Math.cos(ang) - v * Math.sin(ang)) * s, y + (u * Math.sin(ang) + v * Math.cos(ang)) * s];
  const body = [P(-0.12, -0.2), P(0.12, -0.2), P(0.12, 0), P(-0.12, 0)], spout = [P(0.1, -0.06), P(0.3, -0.26), P(0.33, -0.23), P(0.12, -0.01)];
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) { c.poly(body.map(([a, b]) => [a + dx, b + dy]), "#0B0812"); c.poly(spout.map(([a, b]) => [a + dx, b + dy]), "#0B0812"); }
  c.poly(body, null, (X, Y) => pk(PR.can, 0.6 - ((X - x) / s) * 1.2, X, Y)); c.poly(spout, null, (X, Y) => pk(PR.can, 0.75, X, Y));
  const [h0x, h0y] = P(-0.08, -0.22), [h1x, h1y] = P(0.06, -0.3), [h2x, h2y] = P(0.08, -0.2); c.line(R(h0x), R(h0y), R(h1x), R(h1y), "#0B0812"); c.line(R(h1x), R(h1y), R(h2x), R(h2y), "#0B0812");
}
// ---------------------------------------------------------------- an apple (screen centre, radius r)
export function apple(c, x, y, r, spin = 0) {
  r = Math.max(1.5, r); for (let j = -Math.ceil(r) - 1; j <= Math.ceil(r) + 1; j++) for (let i = -Math.ceil(r) - 1; i <= Math.ceil(r) + 1; i++) { const q = Math.hypot(i, j) / r; if (q > 1.18) continue; const X = R(x + i), Y = R(y + j); put(c, X, Y, q > 1 ? O : pk(PR.apple, 0.75 - (i + j) / (2.5 * r) - q * 0.2, X, Y)); }
  const sx = x + Math.sin(spin) * r * 0.3, sy = y - r * Math.cos(spin) * 0.9; put(c, R(sx), R(sy), "#3A2010"); if (r > 4) put(c, R(sx + 1), R(sy - 1), PR.leafA);
}
// ---------------------------------------------------------------- the round yellow chomper (our own silhouette), mouth 0..1
export function chomper(c, x, y, r, mouth, a = 1) {
  if (a <= 0) return; const g = fade(c, a), m = 0.05 + 0.75 * mouth;
  for (let j = -Math.ceil(r) - 1; j <= Math.ceil(r) + 1; j++) for (let i = -Math.ceil(r) - 1; i <= Math.ceil(r) + 1; i++) { const q = Math.hypot(i, j) / r, an = Math.abs(Math.atan2(j, i)); if (q > 1.12 || (an < m * 0.55 && i > 0)) continue; g.px(x + i, y + j, q > 1 ? "#0B0812" : pk(PR.pac, 0.75 - (i + j) / (3 * r) - q * 0.15, R(x + i), R(y + j))); }
  g.disc(R(x + r * 0.05), R(y - r * 0.5), Math.max(1, R(r * 0.12)), "#0B0812");
}
// ---------------------------------------------------------------- golden glow ring (screen), strength k
export function glow(c, x, y, rx, ry, k, t) {
  if (k <= 0) return;
  for (let j = -Math.ceil(ry * 1.6); j <= Math.ceil(ry * 1.6); j++) for (let i = -Math.ceil(rx * 1.6); i <= Math.ceil(rx * 1.6); i++) { const q = Math.hypot(i / rx, j / ry); if (q > 1.6) continue; tint(c, R(x + i), R(y + j), PR.glow, k * 0.55 * Math.max(0, 1 - Math.abs(q - 1) * 1.6) * (0.85 + 0.15 * Math.sin(t * 7 + q * 4)), 4); }
  for (let i = 0; i < 12; i++) { const an = (i / 12) * TAU + t * 0.9, rr = 1.1 + 0.25 * Math.sin(t * 3 + i * 1.7), px = R(x + Math.cos(an) * rx * rr), py = R(y + Math.sin(an) * ry * rr), s = 1 + (i % 3 === 0 ? 1 : 0), tw = 0.5 + 0.5 * Math.sin(t * 6 + i); if (k * tw < 0.2) continue;
    const g = fade(c, Math.min(1, k * tw)); g.rect(px - s, py, s * 2 + 1, 1, "#FFF6C0"); g.rect(px, py - s, 1, s * 2 + 1, "#FFF6C0"); }
}
