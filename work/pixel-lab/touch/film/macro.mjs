// Inside the screen. Two views of one sensor: TOP (looking down through the glass at the TX rows / RX columns, the scan,
// the heat map of the dip and its centre) and SECTION (side cut: glass, electrodes, OLED pixels, board with the touch chip;
// field arcs between TX and RX pads, the fingertip, the wool mitten and the silver threads). Illustration, not to scale.
import { MAIN, TINY, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { smooth as spline, drawPart } from "../../dog/shade.mjs";
import { MITT } from "./hero.mjs";
import { EV } from "./timeline.mjs";

const W = 540, TOP = 190, BOT = 960, R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const sm = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b, b + fo));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", YL: "#FAE375", MU: "#959595", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", p2: "#2A1F40", p3: "#3B2C5C", p4: "#523D82", p5: "#6E4FB0", p7: "#B08AE8" };
const { O, CARD, IV, Y, YL, MU, L, PK, GR, p2, p3, p4, p5, p7 } = C;
const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
const NAIL = ["#6B3A3A", "#B98478", "#DDAA9C", "#F0CABC", "#FAE2D8", "#FFF4EC"];
const GLASS = ["#121A30", "#182440", "#1F3150", "#2C4670", "#5470B8", "#A9C4FF"];

export function pill(c, txt, cx, y, col, edge, a = 1, scale = 2) {
  if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, txt, { scale }) + 22, h = 7 * scale + 12, x = R(cx - w / 2);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); g.text(MAIN, txt, x + 11, y + 6, col, { scale }); return [x, w];
}
const tag = (c, txt, x, y, col, a = 1) => { if (a <= 0) return; const g = fade(c, a), w = c.measure(TINY, txt, { scale: 2 }) + 10; x = x < 0 ? W + x - w : x; g.rrect(x, y, w, 18, p3, 1); g.rect(x + 1, y + 1, w - 2, 16, O); g.text(TINY, txt, x + 5, y + 4, col, { scale: 2 }); };
function dash(g, pts, colAt, on = 5, off = 3, phase = 0, upTo = 1) {
  let total = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); total += l; }
  let acc = 0; const lim = total * upTo;
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(seg[i - 1]));
    for (let s = 0; s < n; s++, acc++) { if (acc > lim) return; const x = ax + ((bx - ax) * s) / n, y = ay + ((by - ay) * s) / n; if (((acc - phase) % (on + off) + (on + off)) % (on + off) < on) { const col = colAt(x, y, acc / total); if (col) g.px(x, y, col); } } }
}

// ================================================================ SECTION
const GT = 404, GB = 458, EY = 459, EH = 6, DY = 474, BOARD = 500;
const PADS = [70, 140, 210, 280, 350, 420, 490].map((x, i) => ({ x, tx: i % 2 === 1 }));
const RXS = PADS.filter((p) => !p.tx);
const HW = [9, 17, 25, 33], HH = [22, 44, 68, 94];
const FX0 = 248, FX1 = 352;
const stolenK = (m, k) => (m > FX0 + 10 && m < FX1 - 10 ? k >= 2 : m > FX0 - 30 && m < FX1 + 25 ? k === 3 : false);
const LOST = new Map(RXS.map((p) => [p.x, 0]));
for (let i = 0; i + 1 < PADS.length; i++) { const a = PADS[i], b = PADS[i + 1], rx = a.tx ? b : a, m = (a.x + b.x) / 2; for (let k = 0; k < 4; k++) if (stolenK(m, k)) LOST.set(rx.x, LOST.get(rx.x) + 1); }
// fingertip outline (dy = 0: pad bottom 8 px above the glass) and its mask; the wool band around it (precomputed)
const FP = spline([[620, 92], [470, 178], [375, 238], [300, 284], [252, 312], [226, 334], [216, 358], [224, 380], [246, 392], [276, 397], [310, 395], [348, 385], [402, 362], [472, 328], [620, 258]], new Set([0, 14]), 6);
const MH = 1400, MOFF = 400;   // mask rows cover y −400 … 1000 so the finger can move up
const MASK = new Uint8Array(W * MH);
for (let y = 0; y < MH; y++) { const yc = y - MOFF + 0.5, xs = []; for (let i = 0; i < FP.length; i++) { const [ax, ay] = FP[i], [bx, by] = FP[(i + 1) % FP.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); } xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, R(xs[k])); x < Math.min(W, R(xs[k + 1])); x++) MASK[y * W + x] = 1; }
const WOOL = 18, DIST = new Float32Array(W * MH).fill(1e9);
for (let i = 0; i < W * MH; i++) if (MASK[i]) DIST[i] = 0;
for (let y = 0; y < MH; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (x > 0) DIST[i] = Math.min(DIST[i], DIST[i - 1] + 1); if (y > 0) DIST[i] = Math.min(DIST[i], DIST[i - W] + 1); if (x > 0 && y > 0) DIST[i] = Math.min(DIST[i], DIST[i - W - 1] + 1.414); if (x < W - 1 && y > 0) DIST[i] = Math.min(DIST[i], DIST[i - W + 1] + 1.414); }
for (let y = MH - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--) { const i = y * W + x; if (x < W - 1) DIST[i] = Math.min(DIST[i], DIST[i + 1] + 1); if (y < MH - 1) DIST[i] = Math.min(DIST[i], DIST[i + W] + 1); if (x < W - 1 && y < MH - 1) DIST[i] = Math.min(DIST[i], DIST[i + W + 1] + 1.414); if (x > 0 && y < MH - 1) DIST[i] = Math.min(DIST[i], DIST[i + W - 1] + 1.414); }
const inF = (x, y, dy) => { const yy = R(y - dy) + MOFF; return x >= 0 && x < W && yy >= 0 && yy < MH && MASK[yy * W + R(x)] === 1; };
const dAt = (x, y, dy) => { const yy = R(y - dy) + MOFF; return x >= 0 && x < W && yy >= 0 && yy < MH ? DIST[yy * W + R(x)] : 1e9; };
const bottomAt = (x, dy, extra = 0) => { for (let y = GT + 4; y > -300; y--) if (extra ? dAt(x, y, dy) <= extra : inF(x, y, dy)) return y; return null; };
// conductive threads through the wool (finger-local polylines from the skin outward)
const THREADS = [242, 262, 282, 302, 322, 342].map((x0, i) => { const yb = bottomAt(x0, 0); const pts = []; for (let k = 0; k <= 6; k++) pts.push([x0 + (k % 2 ? 3 : -3) + (i - 2.5) * 1.2 * k / 6, yb + 1 + (WOOL * k) / 6]); return pts; });

function sectionState(t) {
  // finger offset: in from the top, hover, close; lift away; the mittened finger comes down until the wool meets the glass
  let dy = -440, mitten = false;
  if (t < EV.lift[0]) dy = t < EV.fingerIn[0] ? -440 : t < EV.approach[0] ? -440 + 400 * sm(t, EV.fingerIn[0], EV.fingerIn[1]) : -40 + 40 * sm(t, EV.approach[0], EV.approach[1]);
  else if (t < EV.mitten[0]) dy = -440 * sm(t, EV.lift[0], EV.lift[1]);
  else { mitten = true; dy = -440 + (440 - WOOL + 8) * sm(t, EV.mitten[0], EV.mitten[1]); }
  const steal = t < EV.lift[0] ? sm(t, EV.steal[0], EV.steal[1]) : 1 - sm(t, EV.lift[0], EV.lift[0] + 0.35);
  const carry = sm(t, EV.carry[0], EV.carry[1]), barely = win(t, EV.barely[0], EV.barely[1], 0.3, 0.4);
  const drop = t < EV.lift[0] ? sm(t, EV.sink[0], EV.sink[1]) : t < EV.carry[0] ? 1 - sm(t, EV.lift[0], EV.lift[0] + 0.5) : sm(t, EV.sink2[0], EV.sink2[1]);
  const grow = [sm(t, EV.arcs[0], EV.arcs[0] + 0.7), sm(t, EV.arcs[0] + 0.3, EV.arcs[1]), sm(t, EV.arcs[1], EV.arcs[1] + 0.8), sm(t, EV.arcs[1] + 0.4, EV.arcs[2])];
  return { dy, mitten, steal: mitten ? carry : steal, barely, drop, grow, silver: mitten ? sm(t, EV.silver[0], EV.silver[1]) : 0 };
}

export function drawSection(c, t) {
  const st = sectionState(t), dy = st.dy;
  // air with soft bokeh from the street we came from
  for (let y = TOP; y < GT; y++) for (let x = 0; x < W; x++) { const k = Math.pow((y - TOP) / (GT - TOP), 1.6) * 4, lo = Math.floor(k), q = k - lo > bayer(x, y) ? lo + 1 : lo; c.px(x, y, ["#0B0812", "#100B1A", "#150F23", "#1B132D", "#211838"][Math.min(4, q)]); }
  for (const [bx, by, r, col, s] of [[58, 246, 34, "#C9A040", 0.16], [150, 330, 22, "#B04060", 0.12], [24, 360, 18, "#7E98DA", 0.13], [200, 232, 15, "#C9A040", 0.1], [480, 250, 26, "#BFD4F2", 0.08]])
    for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) { const d = Math.hypot(x - bx, y - by) / r; if (d > 1 || y < TOP || y >= GT) continue; const a = d < 0.7 ? 1 : (1 - d) / 0.3; if (a > bayer(x, y)) c.px(x, y, mix(c.get(x, y), col, s)); }
  // glass
  for (let y = GT; y <= GB; y++) for (let x = 0; x < W; x++) { const k = 1 - (y - GT) / (GB - GT); let q = k * 2.2 + (bayer(x, y) - 0.5) * 0.9; const band = (x + (y - GT) * 1.4 + 30 + t * 6) % 118; if (band < 9) q += 1.1; else if (band < 13) q += 0.5; c.px(x, y, GLASS[Math.max(0, Math.min(3, R(q)))]); }
  c.rect(0, GT, W, 1, GLASS[5]); c.rect(0, GT + 1, W, 1, GLASS[4]); c.rect(0, GB, W, 1, GLASS[3]);
  // field arcs (marching dots TX → RX); arcs under the finger are pulled away as `steal` grows
  const phase = t * 22, fingerNear = !st.mitten && dy > -60;
  for (let i = 0; i + 1 < PADS.length; i++) {
    const a = PADS[i], b = PADS[i + 1], tx = a.tx ? a : b, rx = a.tx ? b : a, m = (a.x + b.x) / 2, dir = Math.sign(rx.x - tx.x);
    for (let k = 0; k < 4; k++) {
      const g0 = st.grow[k]; if (g0 <= 0) continue;
      let alpha = 1; if (stolenK(m, k)) alpha = 1 - st.steal * (st.mitten ? 1 : 1);
      if (alpha <= 0.02) continue; const g = fade(c, alpha);
      const pts = []; for (let j = 0; j <= 40; j++) { const th = (Math.PI * j) / 40; pts.push([m - dir * HW[k] * Math.cos(th), EY - HH[k] * g0 * Math.sin(th)]); }
      dash(g, pts, (x, y) => (y < GT ? (y < GT - 18 ? L : p7) : k === 0 ? p4 : p5), 5, 3, phase);
    }
  }
  // the fingertip (skin) and, in the second half, the wool mitten around it in cut-away
  if (dy > -430) {
    if (st.mitten) drawWool(c, dy, st, t);
    drawFinger(c, dy, st, t);
    if (st.mitten) drawThreads(c, dy, st, t);
  }
  // fan of field into the skin (bare finger) or through the silver threads (mitten)
  const FAN = [[262, 240], [268, 258], [274, 276], [286, 304], [292, 324], [298, 344]];
  const fanAmt = st.mitten ? Math.max(st.steal, st.barely * 0.35) : (fingerNear ? st.steal : 0);
  if (fanAmt > 0.01) FAN.forEach(([sx, ex], i) => {
    const yb = st.mitten ? (bottomAt(ex, dy, WOOL) ?? GT - 6) : (bottomAt(ex, dy) ?? GT - 6), ey = yb + 1, cx1 = sx + (ex - sx) * 1.7, cy1 = (EY + ey) / 2 + 6, pts = [];
    for (let j = 0; j <= 48; j++) { const u = j / 48, v = 1 - u; pts.push([v * v * sx + 2 * v * u * cx1 + u * u * ex, v * v * EY + 2 * v * u * cy1 + u * u * ey]); }
    const weak = st.mitten && st.steal < 0.05;
    dash(weak ? fade(c, 0.5 + 0.3 * Math.sin(t * 30 + i)) : c, pts, (x, y, f) => (weak ? (f > 0.75 ? p3 : p7) : y < GT ? ((R(f * 48) >> 2) % 3 === 0 ? IV : YL) : "#C9A040"), 6, 2, t * 26, fanAmt);
    if (fanAmt > 0.97 && !weak) fade(c, 0.6).disc(ex, ey - 2, 2, YL);
  });
  // electrodes (TX pulse glow), glue, OLED sub-pixels, backplane, board
  for (const p of PADS) if (p.tx) { const pulse = 0.35 + 0.25 * Math.sin(t * 9 + p.x); for (let y = EY - 9; y < EY; y++) for (let x = p.x - 22; x < p.x + 22; x++) if ((1 - (EY - y) / 9) * pulse > bayer(x, y)) c.px(x, y, mix(c.get(x, y), Y, 0.35)); }
  for (const p of PADS) { const x0 = p.x - 20, dim = !p.tx && LOST.get(p.x) > 0 && st.drop > 0.5; c.rect(x0, EY, 40, EH, p.tx ? Y : dim ? p5 : p7); c.rect(x0, EY, 40, 1, p.tx ? YL : dim ? p7 : L); c.rect(x0, EY + EH - 1, 40, 1, p.tx ? "#A5822A" : p4); }
  c.rect(0, EY + EH, W, DY - EY - EH, "#0F1424");
  for (let x = 0; x < W; x++) { const m = x % 4; if (m === 3) continue; const col = ["#E03056", "#65DA41", "#5470B8"][m]; c.rect(x, DY, 1, 12, col); c.px(x, DY, mix(col, IV, 0.45)); for (let j = 1; j <= 5; j++) if ((1 - j / 6) * 0.5 > bayer(x, DY - j)) c.px(x, DY - j, mix(c.get(x, DY - j), col, 0.35)); }
  c.rect(0, DY + 12, W, BOARD - DY - 12, "#1D1430"); for (let x = 4; x < W; x += 12) c.rect(x, DY + 15, 5, 4, p3);
  drawBoard(c, t, st);
  // labels
  const lab = sm(t, EV.csIn1[0], EV.csIn1[1] + 0.3);
  tag(c, "GLASS", 8, 422, "#7E98DA", lab); tag(c, "PIXELS", 8, 504, MU, lab); tag(c, "RX CHARGE", -8, 504, p7, lab);
  if (lab > 0) { fade(c, lab).text(TINY, "TX", 140 - 7, 446, YL, { scale: 2 }); fade(c, lab).text(TINY, "RX", 70 - 7, 446, L, { scale: 2 }); }
  pill(c, "SALTY WATER", 150, 214, "#A9C4FF", "#5470B8", win(t, EV.salty[0], EV.salty[1], 0.3, 0.3));
  pill(c, "LESS CHARGE", 350, 606, Y, Y, win(t, EV.lessPill, EV.tvIn2[1], 0.25, 0.3));
  pill(c, "WOOL", 120, 300, MITT[5], MITT[3], win(t, EV.mitten[1] - 0.6, EV.silver[0] - 0.1, 0.3, 0.3));
  pill(c, "NO TOUCH", 350, 606, PK, PK, win(t, EV.flat, EV.silver[0], 0.2, 0.3));
  pill(c, "SILVER THREAD", 140, 300, "#E8ECF8", "#A4A4B6", win(t, EV.silver[0], EV.streetBack[0], 0.3, 0.3));
  pill(c, "TOUCH ✓", 350, 606, GR, GR, win(t, EV.touchOk, EV.streetBack[0] + 0.4, 0.2, 0.3));
}

function drawFinger(c, dy, st, t) {
  const pts = FP.map(([x, y]) => [x, y + dy]);
  drawPart(c, [pts], { ramp: SKIN, base: 3.7, gain: 1.7, slope: 1.3, thick: 34, light: [-0.55, -0.85], rimLit: 1, rimShade: 0.8, outline: SKIN[0], litOutline: SKIN[3] });
  if (!st.mitten) {
    drawPart(c, [spline([[221, 346], [227, 330], [253, 309], [300, 281], [342, 256], [348, 266], [306, 291], [260, 319], [238, 337], [231, 351]].map(([x, y]) => [x, y + dy]), new Set([0, 4, 5, 9]), 4)], { ramp: NAIL, base: 2.1, gain: 1.3, slope: 0.2, thick: 5, light: [-0.55, -0.85], outline: NAIL[0], litOutline: NAIL[3] });
    for (let y = 322; y < 354; y++) for (let x = 218; x < 246; x++) { const o = c.get(x, y + dy), isNail = NAIL.some((n) => hex(n).every((v, i) => v === o[i])); if (isNail && Math.hypot(x - 223, (y - 341) * 1.3) < 9) c.px(x, y + dy, (x + y) % 5 ? NAIL[4] : IV); }
  }
  for (let y = 352; y < GT; y++) for (let x = 214; x < 380; x++) { const Y0 = y + dy; if (Y0 < TOP || Y0 >= GT) continue; if (!inF(x, Y0, dy) || !inF(x - 1, Y0, dy) || !inF(x + 1, Y0, dy) || !inF(x, Y0 + 1, dy)) continue; const e = Math.hypot((x - 292) / 9.5, (y - 389) / 3.8); if (e < 7.5 && e % 1 < 0.2) c.px(x, Y0, mix(c.get(x, Y0), SKIN[1], 0.45)); }
  // screen light on the pad, the conductor glow on "conducts", reflection in the glass
  for (let x = 200; x < 440; x++) { const yb = bottomAt(x, dy); if (yb == null || yb < TOP) continue; for (let j = 0; j < 7; j++) if ((1 - j / 7) * 0.9 > bayer(x, yb - j)) c.px(x, yb - j, mix(c.get(x, yb - j), "#A9C4FF", 0.42 * (1 - j / 7))); }
  const glow = win(st.t ?? 0, 0, 0); void glow;
  if (!st.mitten && st.steal > 0) for (let x = 228; x < 360; x++) { const yb = bottomAt(x, dy); if (yb == null) continue; const w = (1 - Math.abs(x - 292) / 66) * st.steal; for (let j = 0; j < 12; j++) if (w * (1 - j / 12) * 0.85 > bayer(x, yb - j)) c.px(x, yb - j, mix(c.get(x, yb - j), YL, 0.35 * (1 - j / 12))); }
  if (!st.mitten && dy > -60) for (let y = GT + 2; y < GT + 26; y++) for (let x = 200; x < W; x++) { const sy = 2 * GT - y; if (!inF(x, sy, dy)) continue; const a = 0.3 * (1 - (y - GT) / 26) * (1 + dy / 60); if (a > bayer(x, y) * 0.6) c.px(x, y, mix(c.get(x, y), c.get(x, sy), a)); }
}

function drawWool(c, dy, st, t) {
  // knitted yellow band WOOL px thick around the finger (cut-away), V stitches following the surface distance
  for (let y = Math.max(TOP, R(dy) - 100); y < GT + 2; y++) for (let x = 150; x < W; x++) {
    const d = dAt(x, y, dy); if (d <= 0 || d > WOOL) continue;
    const k = d / WOOL, u = (x * 0.8 + y * 0.6), cell = ((Math.floor(u / 6) % 2) + 2) % 2, v = (((u % 6) + 6) % 6);
    let col = MITT[R(5 - k * 2.2 + (bayer(x, y) - 0.5) * 0.8)] ?? MITT[3];
    if (d > WOOL - 1.2) col = MITT[1]; else if (Math.abs(v - 3) < 0.7 && ((Math.floor(d / 4) + cell) % 2)) col = mix(col, MITT[1], 0.45);
    if (d < 1.4) col = MITT[2];
    c.px(x, y, col);
  }
}
function drawThreads(c, dy, st, t) {
  if (st.silver <= 0) return; const g = fade(c, st.silver);
  THREADS.forEach((pts, i) => { const P = pts.map(([x, y]) => [x, y + dy]); for (let k = 1; k < P.length; k++) { const glint = Math.abs(((t - EV.silver[0]) * 1.6 - i * 0.12) % 1.2 - k / 6) < 0.12, hot = st.steal > 0.3 && st.steal * 6 > 6 - k;
    g.line(R(P[k - 1][0]), R(P[k - 1][1]), R(P[k][0]), R(P[k][1]), hot ? YL : glint ? "#FFFFFF" : "#C8C8D8"); g.line(R(P[k - 1][0]) + 1, R(P[k - 1][1]), R(P[k][0]) + 1, R(P[k][1]), hot ? Y : "#8A8AA0"); } });
}

function drawBoard(c, t, st) {
  for (let y = BOARD; y < BOT; y++) for (let x = 0; x < W; x++) c.px(x, y, y < BOARD + 26 && (1 - (y - BOARD) / 26) * 0.5 > bayer(x, y) ? "#1B132D" : rnd(x * 977 + y * 131) < 0.05 ? "#150E23" : "#110B1C");
  for (const x0 of [14, 22, 30, 510, 518, 526]) for (let y = 560; y < 904; y++) if (y % 40 !== 0) c.px(x0, y, "#21182C");
  const CH = { x: 190, y: 836, w: 160, h: 56 }, PINS = [222, 254, 286, 318];
  const trace = (pts) => { for (let i = 1; i < pts.length; i++) { c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], "#5E4520"); c.line(pts[i - 1][0] + 1, pts[i - 1][1], pts[i][0] + 1, pts[i][1], "#7A5A2A"); } };
  RXS.forEach((p, i) => {
    const px = PINS[i], yb = CH.y - 6 - Math.abs(px - p.x), r = [[p.x, 598], [p.x, yb], [px, CH.y - 6], [px, CH.y - 1]], drained = LOST.get(p.x) > 0 && st.drop > 0.5; trace(r);
    let acc = 0; const off = R(t * 40); for (let k = 1; k < r.length; k++) { const [ax, ay] = r[k - 1], [bx, by] = r[k], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
      for (let s = 0; s < n; s++, acc++) if ((acc - off + i * 13 + 3800) % 38 === 0 && acc > 4) { const x = R(ax + ((bx - ax) * s) / n), y = R(ay + ((by - ay) * s) / n); if (drained) c.rect(x, y - 1, 2, 2, "#B8902E"); else { c.rect(x - 1, y - 1, 3, 3, YL); c.px(x, y, IV); } } }
  });
  for (const p of RXS) {
    const x0 = p.x - 10, y0 = 528, h = 70, level = 1 - LOST.get(p.x) * 0.14 * st.drop, fill = R((h - 4) * level), drop = LOST.get(p.x) > 0 && st.drop > 0.02;
    c.rrect(x0, y0, 20, h, p5, 1); c.rect(x0 + 1, y0 + 1, 18, h - 2, CARD);
    for (let j = 0; j < h - 4 - fill; j++) for (let i = 0; i < 16; i++) if ((i + j) % 4 === 0) c.px(x0 + 2 + i, y0 + 2 + j, drop ? "#5A4318" : p3);
    c.rect(x0 + 2, y0 + 2 + (h - 4 - fill), 16, fill, drop ? Y : p7); c.rect(x0 + 2, y0 + 2 + (h - 4 - fill), 16, 1, drop ? YL : L);
    c.rect(p.x - 1, EY + EH, 2, 2, p7);
  }
  for (let x = CH.x - 10; x < CH.x + CH.w + 10; x++) if (x % 3) { c.px(x, CH.y - 14, p3); c.px(x, CH.y + CH.h + 13, p3); }
  for (let y = CH.y - 14; y < CH.y + CH.h + 14; y++) if (y % 3) { c.px(CH.x - 10, y, p3); c.px(CH.x + CH.w + 9, y, p3); }
  c.rrect(CH.x - 3, CH.y - 3, CH.w + 6, CH.h + 6, p4, 2); c.rect(CH.x, CH.y, CH.w, CH.h, "#0B0812");
  for (let x = CH.x + 8; x < CH.x + CH.w - 6; x += 12) { c.rect(x, CH.y - 8, 4, 5, MU); c.px(x, CH.y - 8, IV); c.rect(x, CH.y + CH.h + 3, 4, 5, MU); }
  for (let y = CH.y + 1; y < CH.y + CH.h; y++) for (let x = CH.x; x < CH.x + CH.w; x++) if (y < CH.y + 3 || x < CH.x + 2) c.px(x, y, "#241A38");
  c.text(MAIN, "TOUCH CHIP", R(270 - c.measure(MAIN, "TOUCH CHIP", { scale: 2 }) / 2), CH.y + 21, IV, { scale: 2 }); c.disc(CH.x + 11, CH.y + 11, 2, Math.sin(t * 8) > 0 ? Y : "#5A4318");
  c.text(TINY, "U1", CH.x - 8, CH.y + CH.h + 18, p4, { scale: 1 });
  c.rrect(380, 846, 28, 13, "#6E6E80", 3); c.rrect(381, 847, 26, 11, "#A4A4B6", 3); c.rect(384, 848, 14, 1, "#E4E4EE");
  const cap = (x, y) => { c.rect(x, y, 13, 7, "#9C7A48"); c.rect(x + 3, y, 7, 1, "#C29A5E"); c.rect(x, y, 3, 7, "#C8C8D0"); c.rect(x + 10, y, 3, 7, "#C8C8D0"); };
  const res = (x, y) => { c.rect(x, y, 13, 6, "#1E1E26"); c.rect(x, y, 3, 6, "#C8C8D0"); c.rect(x + 10, y, 3, 6, "#C8C8D0"); c.rect(x + 5, y + 2, 3, 1, MU); };
  for (const [x, y] of [[56, 846], [92, 862], [134, 848], [424, 846], [460, 866], [496, 850]]) cap(x, y);
  for (const [x, y] of [[66, 884], [118, 888], [410, 886], [474, 890]]) res(x, y);
  for (const [x, y] of [[40, 868], [166, 872], [372, 890], [508, 878], [150, 900]]) c.ring(x, y, 2, "#5E4520");
  c.rect(0, 914, W, 46, "#1C1928"); c.rect(0, 914, W, 1, "#4A4466"); c.rect(0, 915, W, 1, "#2E2A40");
  for (let x = 0; x < W; x++) for (let y = 916; y < BOT; y++) if (bayer(x, y) < 0.12 * (1 - (y - 916) / 44)) c.px(x, y, "#2E2A40");
  c.rect(18, 926, 70, 16, "#2A2638"); c.text(TINY, "LI-ION", 24, 931, MU, { scale: 2 });
  for (let x = 236; x < 304; x += 6) { c.rect(x, 900, 3, 14, "#7A5A2A"); c.px(x, 900, YL); }
}

// ================================================================ TOP VIEW
const PITCH = 70, GX = (i) => 25 + i * PITCH, GY = (j) => 260 + j * PITCH, NI = 8, NJ = 11;
const TOUCH = [GX(3) + 0.2 * PITCH, GY(3) + 0.25 * PITCH];
const SIG = 0.8 * PITCH;
const dipAt = (x, y) => Math.exp(-((x - TOUCH[0]) ** 2 + (y - TOUCH[1]) ** 2) / (2 * SIG * SIG));
const NODES = []; for (let j = 0; j < NJ; j++) for (let i = 0; i < NI; i++) NODES.push({ i, j, x: GX(i), y: GY(j), d: dipAt(GX(i), GY(j)) });
const CENT = (() => { let sx = 0, sy = 0, s = 0; for (const n of NODES) if (n.d > 0.2) { sx += n.x * n.d; sy += n.y * n.d; s += n.d; } return [sx / s, sy / s]; })();
const PEAK = NODES.reduce((a, b) => (b.d > a.d ? b : a));

/** Top view transform: focus point (macro coords) shown at screen (270, 540) with scale s. */
function topCam(t) {
  const s0 = t < EV.tvScale[1] ? Math.exp(Math.log(0.42) * (1 - sm(t, EV.tvScale[0], EV.tvScale[1]))) : 1;
  const zf = sm(t, EV.finer[0], EV.finer[0] + 0.8), s = s0 * Math.exp(Math.log(2.4) * zf);
  const fx = 270 + (CENT[0] - 270) * zf, fy = 540 + (CENT[1] - 540) * zf;
  return { s, fx, fy, X: (x) => 270 + (x - fx) * s, Y: (y) => 540 + (y - fy) * s, mx: (sx) => fx + (sx - 270) / s, my: (sy) => fy + (sy - 540) / s };
}

export function drawTop(c, t) {
  const cam = topCam(t), s = cam.s;
  // glass seen from above with the OLED sub-pixels far below
  for (let y = TOP; y < BOT; y++) { const my = cam.my(y + 0.5); for (let x = 0; x < W; x++) {
    const mx = cam.mx(x + 0.5), sub = ((Math.floor(mx / 3) % 3) + 3) % 3, gap = ((mx % 12) + 12) % 12 < 1.2 || ((my % 12) + 12) % 12 < 1.2;
    let col = mix("#141C34", "#0F1528", (y - TOP) / 770); if (!gap) col = mix(col, ["#E03056", "#65DA41", "#5470B8"][sub], 0.1);
    const band = (mx + my * 0.7 + t * 10) % 160; if (band < 14 && bayer(x, y) < 0.3) col = mix(col, "#7E98DA", 0.25);
    c.px(x, y, col); } }
  const ghost = sm(t, EV.ghost[0], EV.ghost[1]) * 0.55, rows = (j) => sm(t, EV.rowsDraw[0] + j * 0.025, EV.rowsDraw[1]), cols = (i) => sm(t, EV.colsDraw[0] + i * 0.03, EV.colsDraw[1]);
  const lw = Math.max(2, R(5 * s));
  // ghost grid ("invisible electrodes")
  if (ghost > 0) { const g = fade(c, ghost); for (let j = 0; j < NJ; j++) if (cam.Y(GY(j)) - lw / 2 >= TOP) g.rect(0, R(cam.Y(GY(j)) - lw / 2), W, lw, "#3A3A5C"); for (let i = 0; i < NI; i++) g.rect(R(cam.X(GX(i)) - lw / 2), TOP, lw, BOT - TOP, "#3A3A5C"); }
  // TX rows (yellow) drawn left → right, RX columns (lilac) top → bottom
  for (let j = 0; j < NJ; j++) { const k = rows(j); if (k <= 0) continue; const y = R(cam.Y(GY(j)) - lw / 2), x1 = R(W * k); if (y < TOP) continue; c.rect(0, y, x1, lw, "#C9A040"); c.rect(0, y, x1, 1, Y); }
  for (let i = 0; i < NI; i++) { const k = cols(i); if (k <= 0) continue; const x = R(cam.X(GX(i)) - lw / 2), y1 = R(TOP + (BOT - TOP) * k); c.rect(x, TOP, lw, y1 - TOP, p5); c.rect(x, TOP, 1, y1 - TOP, p7); }
  // pulses along the rows; a ping at each crossing as a pulse passes
  if (t > EV.pulses[0] && t < EV.pulses[1] + 0.6) for (let j = 0; j < NJ; j++) { const t0 = EV.pulses[0] + j * 0.055, u = (t - t0) / 0.45; if (u < 0 || u > 1.3) continue;
    const hx = W * u, y = R(cam.Y(GY(j))); for (let x = Math.max(0, R(hx - 60)); x < Math.min(W, R(hx)); x++) { const k = 1 - (hx - x) / 60; if (k > bayer(x, y)) c.rect(x, y - (lw >> 1) - 1, 1, lw + 2, k > 0.85 ? IV : YL); }
    for (let i = 0; i < NI; i++) { const X = cam.X(GX(i)), dt = (hx - X) / W * 0.45; if (dt > 0 && dt < 0.35) { const r = R(4 + dt * 40), a = 1 - dt / 0.35; fade(c, a).ring(R(X), y, r, L); } } }
  // crossings
  const nodeA = Math.min(cols(NI - 1), rows(NJ - 1));
  const scanOn = t >= EV.scan[0] && t < EV.csIn2[1], mapA = sm(t, EV.mapDip[0], EV.mapDip[1]);
  // the finger from above (x-ray), after the scan starts the readings show the dip under it
  const fA = t >= EV.tvIn2[0] && t < EV.csIn2[1] ? 0.5 : 0;
  if (fA > 0) drawFingerTop(c, cam, fA, t);
  const scanRow = scanOn ? Math.floor(((t - EV.scan[0]) / 0.42) * NJ) % NJ : -1;
  if (scanOn && t < EV.mapDip[1] + 4) { const y = R(cam.Y(GY(scanRow))); const g = fade(c, 0.6); g.rect(0, y - lw, W, lw * 2 + 1, "#FFF4C0"); }
  for (const n of NODES) {
    const X = R(cam.X(n.x)), Yy = R(cam.Y(n.y)); if (X < -20 || X > W + 20 || Yy < TOP - 20 || Yy > BOT + 20) continue;
    if (nodeA > 0) fade(c, nodeA).rect(X - lw, Yy - lw, lw * 2, lw * 2, mix(p7, Y, 0.5));
    if (!scanOn) continue;
    const seen = scanRow === n.j ? 1 : 0, dip = n.d > 0.2 ? n.d : 0, show = Math.max(seen * 0.8, dip > 0 ? mapA : 0);
    if (dip > 0 && show > 0) { const r = R((5 + dip * 14) * Math.min(s, 1.6)); fade(c, show).rect(X - r, Yy - r, r * 2, r * 2, dip > 0.6 ? YL : Y); fade(c, show).frame(X - r - 1, Yy - r - 1, r * 2 + 2, r * 2 + 2, IV); }
    else if (seen) fade(c, 0.9).rect(X - lw - 1, Yy - lw - 1, lw * 2 + 2, lw * 2 + 2, IV);
  }
  // 3×3 bracket, crosshair glide and lock, the zoom "between the wires"
  const b3 = win(t, EV.cover3[0], EV.csIn2[0], 0.3, 0.3);
  if (b3 > 0) { const g = fade(c, b3), x0 = R(cam.X(GX(2) - 0.4 * PITCH)), x1 = R(cam.X(GX(4) + 0.4 * PITCH)), y0 = R(cam.Y(GY(2) - 0.4 * PITCH)), y1 = R(cam.Y(GY(4) + 0.4 * PITCH));
    for (let x = x0; x <= x1; x++) if ((x >> 2) % 2) { g.px(x, y0, IV); g.px(x, y1, IV); } for (let y = y0; y <= y1; y++) if ((y >> 2) % 2) { g.px(x0, y, IV); g.px(x1, y, IV); } }
  const ch = win(t, EV.glide[0] - 0.2, EV.csIn2[0], 0.25, 0.3);
  if (ch > 0) { const k = sm(t, EV.glide[0], EV.glide[1]), mx = PEAK.x + (CENT[0] - PEAK.x) * k, my = PEAK.y + (CENT[1] - PEAK.y) * k, X = R(cam.X(mx)), Yy = R(cam.Y(my)), g = fade(c, ch), lock = sm(t, EV.lock, EV.lock + 0.25);
    const r = R(22 - 8 * lock); g.ring(X, Yy, r, lock > 0.5 ? GR : IV); g.ring(X, Yy, r + 1, lock > 0.5 ? GR : IV); g.rect(X - r - 10, Yy, 14, 2, IV); g.rect(X + r - 3, Yy, 14, 2, IV); g.rect(X, Yy - r - 10, 2, 14, IV); g.rect(X, Yy + r - 3, 2, 14, IV); g.rect(X - 1, Yy - 1, 4, 4, lock > 0.5 ? GR : Y);
    if (t > EV.lock && t < EV.lock + 0.4) g.ring(X, Yy, R(r + (t - EV.lock) * 120), GR); }
  // labels
  pill(c, "TX ROWS", 90, 206, Y, "#C9A040", win(t, EV.rowsDraw[0], EV.ruler[1], 0.3, 0.3));
  pill(c, "RX COLUMNS", 410, 206, L, p5, win(t, EV.colsDraw[0], EV.ruler[1], 0.3, 0.3));
  const ru = win(t, EV.ruler[0], EV.ruler[1], 0.3, 0.3); if (ru > 0) { const g = fade(c, ru), x0 = R(cam.X(GX(3))), x1 = R(cam.X(GX(4))), y = R(cam.Y(GY(2)) + PITCH / 2); g.rect(x0, y, x1 - x0, 2, IV); g.rect(x0, y - 6, 2, 14, IV); g.rect(x1 - 1, y - 6, 2, 14, IV); pill(c, "5 MM", (x0 + x1) / 2, y + 12, IV, IV, ru); }
  pill(c, "120+ SCANS/SEC", 270, 206, Y, Y, win(t, EV.hundred, EV.cover3[0], 0.25, 0.3));
  pill(c, "3×3 CROSSINGS", 270, 206, IV, p7, win(t, EV.cover3[0], EV.glide[0], 0.25, 0.3));
  pill(c, "CENTRE", 270, 206, GR, GR, win(t, EV.lock, EV.finer[0], 0.2, 0.3));
  pill(c, "FINER THAN THE GRID", 270, 206, IV, GR, win(t, EV.finer[0] + 0.3, EV.csIn2[0], 0.3, 0.3));
}

function drawFingerTop(c, cam, a, t) {
  // back of the finger seen from above: nail toward us, pad on the glass under it (contact ellipse dotted)
  const tx = TOUCH[0] + 22, ty = TOUCH[1] + 4, s = cam.s;
  const pts = [[tx - 58, ty + 10], [tx - 50, ty - 34], [tx - 18, ty - 62], [tx + 300, ty - 560], [tx + 700, ty - 560], [tx + 70, ty + 38], [tx + 30, ty + 56], [tx - 22, ty + 52]].map(([x, y]) => [cam.X(x), cam.Y(y)]);
  const g = fade(c, a);
  drawPart(g, [spline(pts, new Set([3, 4]), 5)], { ramp: SKIN, base: 4, gain: 1.4, slope: 0.6, thick: 40 * s, light: [-0.55, -0.85], outline: SKIN[1] });
  const nail = [[tx - 36, ty - 30], [tx - 14, ty - 50], [tx + 36, ty - 92], [tx + 54, ty - 70], [tx + 14, ty - 22], [tx - 22, ty - 10]].map(([x, y]) => [cam.X(x), cam.Y(y)]);
  drawPart(g, [spline(nail, new Set(), 4)], { ramp: NAIL, base: 3, gain: 1, slope: 0.3, thick: 8 * s, light: [-0.55, -0.85], outline: NAIL[0] });
  for (let k = 0; k < 64; k++) { const an = (k / 64) * Math.PI * 2; if (k % 2) continue; c.px(R(cam.X(TOUCH[0] + Math.cos(an) * 46)), R(cam.Y(TOUCH[1] + Math.sin(an) * 34)), YL); }
}
