// Test frame for «How your touchscreen feels your finger» (pixel film, flat side view, macro cross-section).
// Moment ≈ 29.5 s: "…it pulls part of that field INTO you". 540×960 grid ×2 → 1080×1920, picture to the bottom edge.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { smooth, drawPart } from "../dog/shade.mjs";
import { C } from "../dog/film/props.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, K = "#000000", R = Math.round;
const { O, CARD, IV, Y, YL, MU, L, P, p2, p3, p4, p5, p7 } = C;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const c = new Canvas(GW, GH, K);

// ---------------------------------------------------------------- layers (exaggerated thicknesses — illustration, not to scale)
const GT = 404, GB = 458, EY = 459, EH = 6, DY = 474, BOARD = 500;
const PADS = [70, 140, 210, 280, 350, 420, 490].map((x, i) => ({ x, tx: i % 2 === 1 }));
const SKIN = ["#2A1416", "#55282A", "#83443C", "#AE6650", "#CF8A6A", "#E6AD8A", "#F3CBAA", "#FBE5CC"];
const NAIL = ["#6B3A3A", "#B98478", "#DDAA9C", "#F0CABC", "#FAE2D8", "#FFF4EC"];
const GLASS = ["#121A30", "#182440", "#1F3150", "#2C4670", "#5470B8", "#A9C4FF"];

// air: deep dusk gradient, blurred street lights (bokeh) from the winter street we zoomed in from, a few snow specks
for (let y = TOP; y < GT; y++) for (let x = 0; x < GW; x++) {
  const k = Math.pow((y - TOP) / (GT - TOP), 1.6) * 4, lo = Math.floor(k), q = k - lo > bayer(x, y) ? lo + 1 : lo;
  c.px(x, y, ["#0B0812", "#100B1A", "#150F23", "#1B132D", "#211838"][Math.min(4, q)]);
}
for (const [bx, by, r, col, s] of [[58, 246, 34, "#C9A040", 0.16], [150, 330, 22, "#B04060", 0.12], [24, 360, 18, "#7E98DA", 0.13], [200, 232, 15, "#C9A040", 0.1], [118, 270, 10, IV, 0.07]])
  for (let y = by - r; y <= by + r; y++) for (let x = bx - r; x <= bx + r; x++) {
    const d = Math.hypot(x - bx, y - by) / r; if (d > 1 || y < TOP || y >= GT) continue;
    const a = d < 0.7 ? 1 : (1 - d) / 0.3; if (a > bayer(x, y)) c.px(x, y, mix(c.get(x, y), col, s));
  }
for (let i = 0; i < 34; i++) { const x = R(rnd(i * 7 + 1) * 230), y = R(TOP + 6 + rnd(i * 11 + 3) * 190), b = rnd(i * 13) < 0.3; c.px(x, y, b ? IV : "#7E7A92"); if (b) c.px(x + 1, y, "#7E7A92"); }

// glass: dark blue slab with diagonal sheen bands and a bright top surface
for (let y = GT; y <= GB; y++) for (let x = 0; x < GW; x++) {
  const k = 1 - (y - GT) / (GB - GT); let q = k * 2.2 + (bayer(x, y) - 0.5) * 0.9;
  const band = (x + (y - GT) * 1.4 + 30) % 118; if (band < 9) q += 1.1; else if (band < 13) q += 0.5;
  c.px(x, y, GLASS[Math.max(0, Math.min(3, R(q)))]);
}
c.rect(0, GT, GW, 1, GLASS[5]); c.rect(0, GT + 1, GW, 1, GLASS[4]); c.rect(0, GB, GW, 1, GLASS[3]);

// ---------------------------------------------------------------- finger (side view, coming down from the upper right)
const FP = smooth([[620, 92], [470, 178], [375, 238], [300, 284], [252, 312], [226, 334], [216, 358], [224, 380], [246, 392], [276, 397], [310, 395], [348, 385], [402, 362], [472, 328], [620, 258]], new Set([0, 14]), 6);
const mask = new Uint8Array(GW * GH);
for (let y = 0; y < GH; y++) { const yc = y + 0.5, xs = [];
  for (let i = 0; i < FP.length; i++) { const [ax, ay] = FP[i], [bx, by] = FP[(i + 1) % FP.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
  xs.sort((a, b) => a - b); for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, R(xs[k])); x < Math.min(GW, R(xs[k + 1])); x++) mask[y * GW + x] = 1; }
const inF = (x, y) => x >= 0 && y >= 0 && x < GW && y < GH && mask[y * GW + x] === 1;
const bottomAt = (x) => { for (let y = GT; y > TOP; y--) if (inF(x, y)) return y; return null; };

// ---------------------------------------------------------------- field lines between neighbouring TX → RX pads
const HW = [9, 17, 25, 33], HH = [22, 44, 68, 94];
const FX0 = 248, FX1 = 352;                       // pad span that sits right over the glass
const stolen = (m, k) => (m > FX0 + 10 && m < FX1 - 10 ? k >= 2 : (m > FX0 - 30 && m < FX1 + 25 ? k === 3 : false));
function dash(g, pts, colAt, on = 5, off = 3) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s < n; s++) { const x = ax + ((bx - ax) * s) / n, y = ay + ((by - ay) * s) / n; if (acc % (on + off) < on) { const col = colAt(x, y, acc); if (col) g.px(x, y, col); } acc++; } }
}
const lost = new Map(PADS.filter((p) => !p.tx).map((p) => [p.x, 0]));
const steal = [];
for (let i = 0; i + 1 < PADS.length; i++) {
  const a = PADS[i], b = PADS[i + 1], tx = a.tx ? a : b, rx = a.tx ? b : a, m = (a.x + b.x) / 2, dir = Math.sign(rx.x - tx.x);
  for (let k = 0; k < 4; k++) {
    if (stolen(m, k)) { lost.set(rx.x, lost.get(rx.x) + 1); steal.push({ sx: m - dir * HW[k], k, m }); continue; }
    const pts = []; for (let j = 0; j <= 40; j++) { const th = (Math.PI * j) / 40; pts.push([m - dir * HW[k] * Math.cos(th), EY - HH[k] * Math.sin(th)]); }
    dash(c, pts, (x, y) => (y < GT ? (y < GT - 18 ? L : p7) : k === 0 ? p4 : p5));
  }
}
// arrowheads on the outermost free arcs: field runs TX → RX
for (let i = 0; i + 1 < PADS.length; i++) { const a = PADS[i], b = PADS[i + 1], m = (a.x + b.x) / 2; if (stolen(m, 3)) continue; const dir = Math.sign((a.tx ? b : a).x - (a.tx ? a : b).x), ax = R(m + dir * 2), ay = EY - HH[3]; c.px(ax, ay, IV); c.px(ax - dir, ay - 1, L); c.px(ax - dir, ay + 1, L); c.px(ax - 2 * dir, ay - 2, p7); c.px(ax - 2 * dir, ay + 2, p7); }

// finger body, nail, fingerprint ridges, screen glow on the pad, reflection in the glass
drawPart(c, [FP], { ramp: SKIN, base: 3.7, gain: 1.7, slope: 1.3, thick: 34, light: [-0.55, -0.85], rimLit: 1, rimShade: 0.8, outline: SKIN[0], litOutline: SKIN[3] });
drawPart(c, [smooth([[221, 346], [227, 330], [253, 309], [300, 281], [342, 256], [348, 266], [306, 291], [260, 319], [238, 337], [231, 351]], new Set([0, 4, 5, 9]), 4)], { ramp: NAIL, base: 2.1, gain: 1.3, slope: 0.2, thick: 5, light: [-0.55, -0.85], outline: NAIL[0], litOutline: NAIL[3] });
for (let y = 322; y < 354; y++) for (let x = 218; x < 246; x++) { const o = c.get(x, y), isNail = NAIL.some((n) => hex(n).every((v, i) => v === o[i])); if (isNail && Math.hypot(x - 223, (y - 341) * 1.3) < 9) c.px(x, y, (x + y) % 5 ? NAIL[4] : IV); }
for (const [x, y] of [[262, 304], [263, 304], [264, 303], [290, 287], [291, 287]]) c.px(x, y, IV);
for (let i = 0; i < 9; i++) { c.px(334 - i, 268 - R(i * 0.2), NAIL[4]); c.px(352 - i, 268 + R(i * 0.55), SKIN[3]); }
for (const x0 of [452, 466]) for (let j = 0; j < 12; j++) { const x = R(x0 - j * 0.53), y = R((bottomAt(x0) ?? 340) - 2 - j * 0.85); if (inF(x, y)) c.px(x, y, mix(c.get(x, y), SKIN[1], 0.5)); }
for (let y = TOP; y < GT; y++) for (let x = 230; x < GW; x++) { if (!inF(x - 2, y) || !inF(x + 2, y) || !inF(x, y - 2) || !inF(x, y + 2)) continue; const o = c.get(x, y), i = SKIN.findIndex((n) => hex(n).every((v, j) => v === o[j])); if (i > 1 && rnd(x * 613 + y * 397) < 0.035) c.px(x, y, SKIN[i - 1]); }
for (let y = 352; y < GT; y++) for (let x = 214; x < 380; x++) {
  if (!inF(x, y) || !inF(x - 1, y) || !inF(x + 1, y) || !inF(x, y + 1)) continue;
  const e = Math.hypot((x - 292) / 9.5, (y - 389) / 3.8); if (e < 7.5 && e % 1 < 0.2) c.px(x, y, mix(c.get(x, y), SKIN[1], 0.45));
}
for (let x = 200; x < 440; x++) { const yb = bottomAt(x); if (yb == null) continue;
  for (let j = 0; j < 7; j++) if ((1 - j / 7) * 0.9 > bayer(x, yb - j)) c.px(x, yb - j, mix(c.get(x, yb - j), "#A9C4FF", 0.42 * (1 - j / 7))); }
for (let y = GT + 2; y < GT + 26; y++) for (let x = 200; x < GW; x++) { const sy = 2 * GT - y; if (!inF(x, sy)) continue; const a = 0.3 * (1 - (y - GT) / 26); if (a > bayer(x, y) * 0.6) c.px(x, y, mix(c.get(x, y), c.get(x, sy), a)); }

// stolen field: lines leave the TX pad, cross the glass and bend up into the fingertip (yellow)
// soft yellow glow where the field enters the skin
for (let x = 228; x < 360; x++) { const yb = bottomAt(x); if (yb == null) continue; const w = 1 - Math.abs(x - 292) / 66;
  for (let j = 0; j < 12; j++) if (w * (1 - j / 12) * 0.85 > bayer(x, yb - j)) c.px(x, yb - j, mix(c.get(x, yb - j), YL, 0.35 * (1 - j / 12))); }
const FAN = [[262, 240], [268, 258], [274, 276], [286, 304], [292, 324], [298, 344]];
FAN.forEach(([sx, ex], i) => {
  const ey = (bottomAt(ex) ?? GT - 6) + 1, cx1 = sx + (ex - sx) * 1.7, cy1 = (EY + ey) / 2 + 6, pts = [];
  for (let j = 0; j <= 48; j++) { const t = j / 48, u = 1 - t; pts.push([u * u * sx + 2 * u * t * cx1 + t * t * ex, u * u * EY + 2 * u * t * cy1 + t * t * ey]); }
  dash(c, pts, (x, y, a) => (y < GT ? ((a >> 2) % 3 === 0 ? IV : YL) : "#C9A040"), 6, 2);
  const ax = R(pts[38][0]), ay = R(pts[38][1]), dx = Math.sign(pts[38][0] - pts[34][0]); c.px(ax, ay, IV); c.px(ax - 1, ay + 1, YL); c.px(ax + 1, ay + 1, YL); c.px(ax - dx * 0, ay - 1, IV);
  fade(c, 0.6).disc(ex, ey - 2, 2, YL);
});

// electrodes: TX pads (yellow, send) and RX pads (lilac, listen), dimmer RX where charge was lost
for (const p of PADS) {
  const x0 = p.x - 20, dim = !p.tx && lost.get(p.x) > 0;
  c.rect(x0, EY, 40, EH, p.tx ? Y : dim ? p5 : p7); c.rect(x0, EY, 40, 1, p.tx ? YL : dim ? p7 : L); c.rect(x0, EY + EH - 1, 40, 1, p.tx ? "#A5822A" : p4);
}
for (const p of PADS) if (p.tx) for (let y = EY - 9; y < EY; y++) for (let x = p.x - 22; x < p.x + 22; x++) if ((1 - (EY - y) / 9) * 0.55 > bayer(x, y)) c.px(x, y, mix(c.get(x, y), Y, 0.35));
// optical glue, OLED sub-pixels (the real pixels under our pixels), backplane
c.rect(0, EY + EH, GW, DY - EY - EH, "#0F1424");
for (let x = 0; x < GW; x++) { const m = x % 4; if (m === 3) continue; const col = ["#E03056", "#65DA41", "#5470B8"][m];
  c.rect(x, DY, 1, 12, col); c.px(x, DY, mix(col, IV, 0.45)); for (let j = 1; j <= 5; j++) if ((1 - j / 6) * 0.5 > bayer(x, DY - j)) c.px(x, DY - j, mix(c.get(x, DY - j), col, 0.35)); }
c.rect(0, DY + 12, GW, BOARD - DY - 12, "#1D1430"); for (let x = 4; x < GW; x += 12) c.rect(x, DY + 15, 5, 4, p3);

// inside the phone: circuit board all the way to the bottom edge (solder mask, parts, silkscreen, battery edge)
const BRD = ["#110B1C", "#150E23"];
for (let y = BOARD; y < GH; y++) for (let x = 0; x < GW; x++) c.px(x, y, y < BOARD + 26 && (1 - (y - BOARD) / 26) * 0.5 > bayer(x, y) ? "#1B132D" : BRD[rnd(x * 977 + y * 131) < 0.05 ? 1 : 0]);
for (const x0 of [14, 22, 30, 510, 518, 526]) for (let y = 560; y < 904; y++) if (y % 40 !== 0) c.px(x0, y, "#21182C");
for (const [x, y] of [[14, 600], [22, 680], [30, 760], [510, 640], [518, 720], [526, 800]]) c.ring(x, y, 2, "#4A3A22");

// copper traces from each RX pad down to the touch chip; signal dots, smaller and dimmer on the drained lines
const RXS = PADS.filter((p) => !p.tx);
const CH = { x: 190, y: 836, w: 160, h: 56 }, PINS = [222, 254, 286, 318];
const trace = (pts) => { for (let i = 1; i < pts.length; i++) { c.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], "#5E4520"); c.line(pts[i - 1][0] + 1, pts[i - 1][1], pts[i][0] + 1, pts[i][1], "#7A5A2A"); } };
RXS.forEach((p, i) => {
  const px = PINS[i], yb = CH.y - 6 - Math.abs(px - p.x), r = [[p.x, 598], [p.x, yb], [px, CH.y - 6], [px, CH.y - 1]], drained = lost.get(p.x) > 0; trace(r);
  let acc = 0; for (let k = 1; k < r.length; k++) { const [ax, ay] = r[k - 1], [bx, by] = r[k], n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay)));
    for (let s = 0; s < n; s++, acc++) if ((acc + i * 13) % 38 === 0 && acc > 30) { const x = R(ax + ((bx - ax) * s) / n), y = R(ay + ((by - ay) * s) / n); drained ? c.rect(x, y - 1, 2, 2, "#B8902E") : (c.rect(x - 1, y - 1, 3, 3, YL), c.px(x, y, IV)); } }
});
// received charge per RX pad
for (const p of RXS) {
  const x0 = p.x - 10, y0 = 528, h = 70, level = 1 - lost.get(p.x) * 0.14, fill = R((h - 4) * level), drop = lost.get(p.x) > 0;
  c.rrect(x0, y0, 20, h, p5, 1); c.rect(x0 + 1, y0 + 1, 18, h - 2, CARD);
  for (let j = 0; j < h - 4 - fill; j++) for (let i = 0; i < 16; i++) if ((i + j) % 4 === 0) c.px(x0 + 2 + i, y0 + 2 + j, drop ? "#5A4318" : p3);
  c.rect(x0 + 2, y0 + 2 + (h - 4 - fill), 16, fill, drop ? Y : p7); c.rect(x0 + 2, y0 + 2 + (h - 4 - fill), 16, 1, drop ? YL : L);
  c.rect(p.x - 1, EY + EH, 2, 2, p7);
}
const pill = (txt, cx, y, col, edge) => { const w = c.measure(MAIN, txt, { scale: 2 }) + 20, x = R(cx - w / 2); c.rrect(x, y, w, 26, edge, 2); c.rrect(x + 2, y + 2, w - 4, 22, CARD, 2); c.text(MAIN, txt, x + 10, y + 6, col, { scale: 2 }); };
pill("LESS CHARGE", 350, 606, Y, Y);

// the touch chip with its silkscreen frame, crystal, passives and the battery edge at the very bottom
for (let x = CH.x - 10; x < CH.x + CH.w + 10; x++) if (x % 3) { c.px(x, CH.y - 14, p3); c.px(x, CH.y + CH.h + 13, p3); }
for (let y = CH.y - 14; y < CH.y + CH.h + 14; y++) if (y % 3) { c.px(CH.x - 10, y, p3); c.px(CH.x + CH.w + 9, y, p3); }
c.rrect(CH.x - 3, CH.y - 3, CH.w + 6, CH.h + 6, p4, 2); c.rect(CH.x, CH.y, CH.w, CH.h, "#0B0812");
for (let x = CH.x + 8; x < CH.x + CH.w - 6; x += 12) { c.rect(x, CH.y - 8, 4, 5, MU); c.px(x, CH.y - 8, IV); c.rect(x, CH.y + CH.h + 3, 4, 5, MU); }
for (let y = CH.y + 1; y < CH.y + CH.h; y++) for (let x = CH.x; x < CH.x + CH.w; x++) if (y < CH.y + 3 || x < CH.x + 2) c.px(x, y, "#241A38");
c.text(MAIN, "TOUCH CHIP", R(270 - c.measure(MAIN, "TOUCH CHIP", { scale: 2 }) / 2), CH.y + 21, IV, { scale: 2 }); c.disc(CH.x + 11, CH.y + 11, 2, Y); c.px(CH.x + 10, CH.y + 10, IV);
c.text(TINY, "U1", CH.x - 8, CH.y + CH.h + 18, p4, { scale: 1 });
c.rrect(380, 846, 28, 13, "#6E6E80", 3); c.rrect(381, 847, 26, 11, "#A4A4B6", 3); c.rect(384, 848, 14, 1, "#E4E4EE"); c.text(TINY, "Y1", 382, 864, p4, { scale: 1 });
const cap = (x, y) => { c.rect(x, y, 13, 7, "#9C7A48"); c.rect(x + 3, y, 7, 1, "#C29A5E"); c.rect(x, y, 3, 7, "#C8C8D0"); c.rect(x + 10, y, 3, 7, "#C8C8D0"); c.px(x, y, IV); };
const res = (x, y) => { c.rect(x, y, 13, 6, "#1E1E26"); c.rect(x, y, 3, 6, "#C8C8D0"); c.rect(x + 10, y, 3, 6, "#C8C8D0"); c.rect(x + 5, y + 2, 3, 1, MU); };
for (const [x, y] of [[56, 846], [92, 862], [134, 848], [424, 846], [460, 866], [496, 850]]) cap(x, y);
for (const [x, y] of [[66, 884], [118, 888], [410, 886], [474, 890]]) res(x, y);
for (const [x, y] of [[40, 868], [166, 872], [372, 890], [508, 878], [150, 900]]) c.ring(x, y, 2, "#5E4520");
c.rect(0, 914, GW, 46, "#1C1928"); c.rect(0, 914, GW, 1, "#4A4466"); c.rect(0, 915, GW, 1, "#2E2A40");
for (let x = 0; x < GW; x++) for (let y = 916; y < 960; y++) if (bayer(x, y) < 0.12 * (1 - (y - 916) / 44)) c.px(x, y, "#2E2A40");
c.rect(18, 926, 70, 16, "#2A2638"); c.text(TINY, "LI-ION", 24, 931, MU, { scale: 2 });
for (let x = 236; x < 304; x += 6) { c.rect(x, 900, 3, 14, "#7A5A2A"); c.px(x, 900, YL); }

// layer tags
const tag = (txt, x, y, col) => { const w = c.measure(TINY, txt, { scale: 2 }) + 10; x = x < 0 ? GW + x - w : x; c.rrect(x, y, w, 18, p3, 1); c.rect(x + 1, y + 1, w - 2, 16, O); c.text(TINY, txt, x + 5, y + 4, col, { scale: 2 }); };
tag("GLASS", 8, 422, "#7E98DA"); tag("PIXELS", 8, 504, MU); tag("RX CHARGE", -8, 504, p7);
c.text(TINY, "TX", 140 - 7, 446, YL, { scale: 2 }); c.text(TINY, "RX", 70 - 7, 446, L, { scale: 2 });

// ---------------------------------------------------------------- overlay: header, caption shade, karaoke caption
c.rect(0, 0, GW, TOP - 2, K);
for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); c.text(MAIN, "64 S", 469 - c.measure(MAIN, "64 S", { scale: 2 }), 136, MU, { scale: 2 });
const TITLE = "HOW SCREENS FEEL YOU";
c.text(MAIN, TITLE, 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
{ // "FIELD INTO YOU": FIELD spoken, INTO filling, YOU next
  const words = [["FIELD", 1], ["INTO", 0.55], ["YOU", 0]], o = { scale: 3 }, gap = c.measure(MAIN, " ", o) + 3;
  let x = R(270 - (words.reduce((s, [w]) => s + c.measure(MAIN, w, o), 0) + gap * 2) / 2); const y0 = 690;
  for (const [w, f] of words) { const ww = c.measure(MAIN, w, o), fx = x + ww * f;
    c.text(MAIN, w, x + 1, y0 + 1, O, o);
    c.text(MAIN, w, x, y0, IV, { ...o, colorAt: (X) => (f >= 1 ? IV : f > 0 && X < fx ? Y : mix(IV, K, 0.62)) }); x += ww + gap; }
}

async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return sharp(out, { raw: { width: size, height: size, channels: 4 } }).png().toBuffer();
}
const base = HERE + ".frame-base.png";
await c.save(base, S);
await sharp(base).composite([{ input: await avatar(66), left: 76, top: 254 }]).png().toFile(HERE + "frame-touch.png");
(await import("node:fs")).unlinkSync(base);
console.log("frame-touch.png", "title px", c.measure(MAIN, TITLE, { scale: 3 }), "lost", [...lost]);
