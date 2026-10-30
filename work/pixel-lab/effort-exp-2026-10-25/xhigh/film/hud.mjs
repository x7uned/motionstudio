// «Pumpkin face» — the readable layer: the light stream pumpkin → eye ("sees"), face-detection brackets with a FACE tag
// (lock on "face."), the tombstone stopwatch card (one sixth of a turn, 0 → 165 ms), the FACE AREA plate with its leader,
// and the dotted link from the lit face area to this pumpkin. Halloween look: tombstone plates with a thin orange frame.
import { Canvas, MAIN, TINY, bayer, mix } from "../../../../../renderer/pixel/raster.mjs";
import { TAU, R, clamp01, sm, lerp, ease, easeOut, backOut, kOf, rnd, tintPx } from "./layout.mjs";
import { B } from "./timeline.mjs";

const O = "#0B0812", IV = "#FDFEED", OR = "#F08A3C", GOLD = "#F4CA50", HOT = "#FFE38E", COOL = "#D6E4FF";

// ---------------------------------------------------------------- light stream from the pumpkin's face into the eye
export function drawSight(c, t, from, to) {
  const k = kOf(t, B.sight); if (k <= 0 || k >= 1) return;
  const head = easeOut(Math.min(1, k * 1.6)), tail = clamp01(k * 1.6 - 0.6), len = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const at = (u) => [lerp(from[0], to[0], u), lerp(from[1], to[1], u) - Math.sin(Math.PI * u) * 12];
  // a soft warm beam under the dots
  for (let s2 = 0; s2 <= 1; s2 += 1 / len) { if (s2 < tail || s2 > head) continue; const [x, y] = at(s2), w = lerp(5, 2, s2), a = 0.35 * Math.min(1, (head - s2) * 5, tail > 0 ? (s2 - tail) * 5 : 1);
    for (let j = -w; j <= w; j++) tintPx(c, R(x), R(y + j), "#F7B04A", a * (1 - Math.abs(j) / (w + 1)), 3); }
  const n = Math.floor(len / 7);
  for (let i = 0; i <= n; i++) { const u = (i + frac2(t * 4)) / n; if (u < tail || u > head) continue;
    const [x, y] = at(u), X = R(x), Y = R(y), a = Math.min(1, (head - u) * 6, tail > 0 ? (u - tail) * 6 : 1), big = i % 2 === 0;
    if (a > bayer(X, Y)) { c.px(X, Y, HOT); c.px(X + 1, Y, big ? HOT : GOLD); if (big) { c.px(X, Y + 1, GOLD); c.px(X + 1, Y + 1, GOLD); } } }
  // the head of the stream: a small bright spark
  if (head < 1) { const [x, y] = at(head); for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 4) c.px(R(x) + i, R(y) + j, i * i + j * j <= 1 ? "#FFF6CE" : HOT); }
}
const frac2 = (x) => x - Math.floor(x);

// ---------------------------------------------------------------- face brackets (+ FACE tag)
export function drawBrackets(c, t, P) {
  const kin = kOf(t, B.lock), kout = kOf(t, B.unlock); if (kin <= 0 || kout >= 1) return;
  const z = P.z, cx = (P.eyeL[0] + P.eyeR[0]) / 2, hw = (P.eyeR[0] - P.eyeL[0]) / 2 + 27 * z, top = P.eyeL[1] - 25 * z, bot = P.mouth[1] + 17 * z, cy = (top + bot) / 2, hh = (bot - top) / 2;
  const lockT = t - B.lock[1], snap = lockT > 0 ? 1 - 0.07 * Math.sin(Math.PI * clamp01(lockT / 0.18)) : 1;
  const s = lerp(2.0, 1, ease(kin)) * snap, a = Math.min(sm(kin, 0, 0.35), 1 - kout), arm = Math.max(1, (12 + 4 * (1 - kin)) * Math.max(1, z * 0.75) * (1 - kout * 0.8)), th = z > 1.5 ? 3 : 2;
  const flash = lockT > 0 ? Math.max(0, 1 - lockT / 0.35) : 0, col = lockT < 0 ? COOL : flash > 0.5 ? HOT : GOLD;
  const x0 = R(cx - hw * s), x1 = R(cx + hw * s), y0 = R(cy - hh * s), y1 = R(cy + hh * s);
  const put = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (a > bayer(i, j)) { c.px(i, j, col); } };
  const sh = (x, y, w, h) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (a > bayer(i, j)) c.px(i, j, O); };
  const A = R(arm);
  for (const [px, py, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
    const hx = dx > 0 ? px : px - A + 1, vy = dy > 0 ? py : py - A + 1;
    sh(hx + 1, (dy > 0 ? py : py - th + 1) + 1, A, th); sh((dx > 0 ? px : px - th + 1) + 1, vy + 1, th, A);
    put(hx, dy > 0 ? py : py - th + 1, A, th); put(dx > 0 ? px : px - th + 1, vy, th, A);
  }
  // the tag
  if (lockT > -0.02) { const ta = Math.min(a, sm(lockT, -0.02, 0.2)), dy2 = R((1 - easeOut(clamp01(lockT / 0.25))) * 6), sc = 2, w = c.measure(MAIN, "FACE", { scale: sc }) + 8, h = 7 * sc + 6, tx = x0, ty = y0 - h - 4 + dy2;
    plate(c, tx, ty, w, h, ta); c.text(MAIN, "FACE", tx + 4, ty + 3, O, { scale: sc, colorAt: (X, Y) => (ta > bayer(X, Y) ? GOLD : null) }); }
}

/** Tombstone-style plate: dark stone, 1-px outline, thin orange inner frame. Dithered by alpha a. */
function plate(c, x, y, w, h, a) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { if (a <= bayer(i, j)) continue;
    const edge = i === x || j === y || i === x + w - 1 || j === y + h - 1, frame = i === x + 2 || j === y + 2 || i === x + w - 3 || j === y + h - 3;
    const corner = (i === x || i === x + w - 1) && (j === y || j === y + h - 1);
    if (corner) continue; c.px(i, j, edge ? O : frame && i > x + 1 && i < x + w - 2 && j > y + 1 && j < y + h - 2 ? OR : (rnd(i * 31 + j * 7) > 0.85 ? "#2E2548" : "#221B38")); }
}

// ---------------------------------------------------------------- FACE AREA plate with a leader to the face area
export function drawAreaLabel(c, t, ffa, z, out) {
  const k = kOf(t, B.mark); if (k <= 0) return;
  const a = sm(k, 0, 0.6) * (1 - out), sc = 2, txt = "FACE AREA", w = c.measure(MAIN, txt, { scale: sc }) + 12, h = 7 * sc + 8;
  const lx = R(ffa[0]), ly0 = R(ffa[1] + 9 * z), py = R(ffa[1] + 88 * z) + R((1 - easeOut(k)) * 9), px = R(Math.max(40, ffa[0] - w * 0.42));
  // leader grows down from the area to the plate
  const lead = easeOut(clamp01(k * 1.6));
  for (let y = ly0; y < lerp(ly0, py, lead); y++) if (a > bayer(lx, y) && (y % 4) < 3) { c.px(lx, y, GOLD); c.px(lx + 1, y, O); }
  plate(c, px, py, w, h, a);
  c.text(MAIN, txt, px + 7, py + 5, O, { scale: sc, colorAt: (X, Y) => (a > bayer(X, Y) ? IV : null) });
}

// ---------------------------------------------------------------- dotted link: face area → this pumpkin
export function drawLink(c, t, from, to, out) {
  const k = kOf(t, B.link); if (k <= 0 || out >= 1) return;
  const ctl = [lerp(from[0], to[0], 0.5), Math.min(from[1], to[1]) - 8], head = easeOut(k), a = 1 - out;   // passes under the eye
  const at = (u) => [(1 - u) * (1 - u) * from[0] + 2 * u * (1 - u) * ctl[0] + u * u * to[0], (1 - u) * (1 - u) * from[1] + 2 * u * (1 - u) * ctl[1] + u * u * to[1]];
  const n = 70;
  for (let i = 0; i <= n; i++) { const u = i / n; if (u > head) break;
    const [x, y] = at(u), X = R(x), Y = R(y);
    for (let j = -3; j <= 3; j++) tintPx(c, X, Y + j, "#F08A3C", 0.3 * a * (1 - Math.abs(j) / 4), 3);
    if (((i + Math.floor(t * 12)) % 3) === 2) continue;
    if (a > bayer(X, Y)) { const col = u > head - 0.08 ? HOT : GOLD; c.px(X, Y, col); c.px(X + 1, Y, col); c.px(X, Y + 1, OR); c.px(X + 1, Y + 1, OR); } }
  if (k < 1) { const [x, y] = at(head); for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) c.px(R(x) + i, R(y) + j, i * i + j * j <= 2 ? "#FFF6CE" : i * i + j * j <= 5 ? HOT : GOLD); }
  // arrival ring around the pumpkin's face
  const land = t - B.link[1]; if (land > 0 && land < 0.5) { const rr = (14 + 40 * easeOut(land / 0.5)), aa = (1 - land / 0.5) * a;
    for (let q = 0; q < 90; q++) { const an = (q / 90) * TAU, X = R(to[0] + Math.cos(an) * rr * 1.3), Y = R(to[1] + Math.sin(an) * rr); if (aa > bayer(X, Y)) c.px(X, Y, HOT); } }
}

// ---------------------------------------------------------------- tombstone stopwatch card (screen space)
const CW = 126, CH = 150, CR = 63, CARD = { x: 304, y: 168 };
const inStone = (x, y) => (y >= CR ? x >= 0 && x < CW && y < CH : Math.hypot(x + 0.5 - CW / 2, y + 0.5 - CR) <= CR);
export function drawCard(c, t) {
  const kin = kOf(t, B.cardIn), kout = kOf(t, B.cardOut); if (kin <= 0 || kout >= 1) return;
  const a = Math.min(sm(kin, 0, 0.8), 1 - sm(kout, 0.1, 1)), s = lerp(0.88, 1, easeOut(kin)) * lerp(1, 0.88, ease(kout)), dy = (1 - easeOut(kin)) * 9 + ease(kout) * 9;
  const sw = kOf(t, B.sweep), land = t - B.sweep[1], flash = land > 0 ? Math.max(0, 1 - land / 0.45) : 0;
  const theta = TAU / 6 * easeOut3(sw), target = sm(t, B.sweep[0] + 0.12, B.sweep[0] + 0.45);
  const card = new Canvas(CW, CH, "#000000"), m = new Uint8Array(CW * CH);
  const P = (x, y, col) => { if (x < 0 || y < 0 || x >= CW || y >= CH || !col) return; card.px(x, y, col); m[y * CW + x] = 1; };
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) { if (!inStone(x, y)) continue;
    const edge = !inStone(x - 1, y) || !inStone(x + 1, y) || !inStone(x, y - 1) || !inStone(x, y + 1);
    const inner = inStone(x - 4, y) && inStone(x + 4, y) && inStone(x, y - 4) && inStone(x, y + 4), frame = !inner && inStone(x - 3, y) && inStone(x + 3, y) && inStone(x, y - 3) && inStone(x, y + 3);
    const tex = rnd(x * 17 + y * 131) > 0.86 ? 1 : rnd(x * 7 + y * 53) > 0.93 ? -1 : 0, lit = (x < 10 || y < 10) && !frame ? 1 : 0;
    P(x, y, edge ? O : frame ? OR : tex > 0 ? "#30274C" : tex < 0 ? "#1A1530" : lit ? "#2A2246" : "#231C3B"); }
  // a small crack at the top right of the stone (decor)
  for (const [x, y] of [[96, 22], [98, 24], [99, 26], [101, 27], [102, 29]]) P(x, y, "#141026");
  // "1/6 S"
  { const txt = "1/6 S", w = card.measure(MAIN, txt, { scale: 2 }); card.text(MAIN, txt, R(CW / 2 - w / 2) + 1, 25, O, { scale: 2 }); card.text(MAIN, txt, R(CW / 2 - w / 2), 24, GOLD, { scale: 2 }); for (let y = 24; y < 40; y++) for (let x = 20; x < 106; x++) if (card.get(x, y)[0] !== 0 || card.get(x, y)[1] !== 0) m[y * CW + x] = 1; }
  // dial
  const dcx = 63, dcy = 83, dr = 30;
  for (let y = dcy - dr - 2; y <= dcy + dr + 2; y++) for (let x = dcx - dr - 2; x <= dcx + dr + 2; x++) {
    const d = Math.hypot(x + 0.5 - dcx, y + 0.5 - dcy); if (d > dr + 1.5) continue;
    let ang = Math.atan2(x + 0.5 - dcx, -(y + 0.5 - dcy)); if (ang < 0) ang += TAU;
    let col = d > dr - 0.5 ? (d > dr + 0.6 ? O : "#6E6AA8") : "#120E22";
    if (d <= dr - 2.5 && ang <= theta) col = flash > 0 ? (flash * 0.9 > bayer(x, y) ? HOT : OR) : (0.78 > bayer(x, y) ? OR : "#7A3A18");
    else if (d <= dr - 2.5 && ang <= TAU / 6 && target > 0 && target * 0.22 > bayer(x, y)) col = "#3A2240";
    P(x, y, col);
  }
  for (let k = 0; k < 12; k++) { const an = (k / 12) * TAU, x = R(dcx + Math.sin(an) * (dr - 4.5)), y = R(dcy - Math.cos(an) * (dr - 4.5)); const key = k === 0 || k === 2; P(x, y, key ? GOLD : "#4A4070"); if (key) { P(x + 1, y, GOLD); P(x, y + 1, GOLD); P(x + 1, y + 1, GOLD); } }
  // target slice edge (dotted) at one sixth
  if (target > 0) for (let r = 4; r < dr - 3; r += 2) { const x = R(dcx + Math.sin(TAU / 6) * r), y = R(dcy - Math.cos(TAU / 6) * r); if (target > bayer(x + 2, y)) P(x, y, GOLD); }
  // hand
  for (let r = 0; r <= dr - 5; r += 0.5) { const x = R(dcx + Math.sin(theta) * r - 0.5), y = R(dcy - Math.cos(theta) * r - 0.5); P(x, y, "#FFF6CE"); P(x + 1, y, r < 3 ? "#FFF6CE" : "#C9B8E0"); }
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) P(dcx + i, dcy + j, i * i + j * j <= 1 ? "#FFF6CE" : GOLD);
  // counter: digits right-aligned in a fixed slot, "MS" fixed
  { const ms = Math.round(165 * easeOut3(sw)), digits = String(ms), sc = 2, cy0 = 124, right = 70, col = flash > 0.2 ? HOT : IV;
    let x = right; for (let i = digits.length - 1; i >= 0; i--) { const gw = card.measure(MAIN, digits[i], { scale: sc }); x -= gw; card.text(MAIN, digits[i], x + 1, cy0 + 1, O, { scale: sc }); card.text(MAIN, digits[i], x, cy0, col, { scale: sc }); x -= 2; }
    card.text(MAIN, "MS", 77, cy0 + 1, O, { scale: sc }); card.text(MAIN, "MS", 76, cy0, GOLD, { scale: sc });
    for (let y = cy0; y < cy0 + 16; y++) for (let xx = 20; xx < 106; xx++) { const p = card.get(xx, y); if (p[0] || p[1] || p[2]) m[y * CW + xx] = 1; } }
  // composite: scale s about the bottom centre, dithered alpha a
  const bx = CARD.x + CW / 2, by = CARD.y + CH + dy;
  const x0 = Math.floor(bx - (CW / 2) * s), x1 = Math.ceil(bx + (CW / 2) * s), y0 = Math.floor(by - CH * s), y1 = Math.ceil(by);
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const u = Math.floor((x + 0.5 - bx) / s + CW / 2), v = Math.floor((y + 0.5 - by) / s + CH);
    if (u < 0 || v < 0 || u >= CW || v >= CH || !m[v * CW + u] || a <= bayer(x, y)) continue; const p = card.get(u, v); c.px(x, y, p); }
}
const easeOut3 = (x) => { x = clamp01(x); return x < 0.85 ? x / 0.85 * 0.93 : 0.93 + 0.07 * easeOut((x - 0.85) / 0.15); };
