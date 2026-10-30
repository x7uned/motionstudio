// Pixel Labrador, side view facing left, built from an anatomical silhouette (units: 120×78 box, ground at y=78).
// shake ∈ 0..1 adds skin waves, lifted ears, turned head and wet fur clumps; phase drives the wave.
import { mix, bayer } from "../../../renderer/pixel/raster.mjs";

export const GOLD = ["#5A3618", "#8F5A28", "#C98F3E", "#E8B864", "#F6D896"];
const OUT = "#2A1608", NOSE = "#1A0E06";
// near-side silhouette: nose → skull → neck → back → croup → thigh → hind leg → belly → foreleg → chest → jaw
const BODY = [[2, 19], [6, 15], [12, 12], [16, 10], [22, 6], [30, 7], [36, 11], [42, 20], [48, 27], [56, 29], [68, 30], [80, 30], [92, 31], [100, 33], [106, 38],
  [107, 44], [105, 51], [102, 56], [100, 62], [97, 67], [96, 72], [98, 77], [90, 78], [89, 74], [89, 68], [87, 63], [84, 60],
  [78, 57], [68, 57], [58, 58], [50, 59], [47, 63], [46, 70], [47, 77], [38, 78], [38, 74], [39, 66], [38, 60],
  [34, 56], [30, 50], [27, 43], [24, 36], [20, 32], [13, 31], [7, 29], [3, 26], [1, 22]];
const HEAD = new Set([0, 1, 2, 3, 4, 5, 6, 42, 43, 44, 45, 46]);
const BACK = [8, 9, 10, 11, 12, 13], BELLY = [27, 28, 29, 30];
const FAR_FORE = [[46, 60], [53, 60], [54, 70], [55, 77], [46, 78], [46, 72], [45, 64]];
const FAR_HIND = [[80, 57], [88, 60], [86, 66], [86, 72], [88, 77], [79, 78], [80, 72], [79, 64]];
const EAR = [[28, 9], [37, 12], [38, 20], [34, 28], [28, 27], [25, 18]];
const rot = ([x, y], [cx, cy], a) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];

/** Draw at ground point (gx, gy) — the middle of the dog's footprint — scale s px per unit. Returns screen outline points. */
export function drawDog(g, gx, gy, s, { phase = 0, shake = 1, sway = 0, legs = true } = {}) {
  // sway shifts the trunk and head sideways (motion smear) while the paws stay planted
  const T = ([x, y]) => [gx + (x - 60) * s + sway * Math.max(0, Math.min(1, (62 - y) / 28)), gy + (y - 78) * s];
  const headA = 0.22 * shake * Math.sin(phase), neck = [40, 20];
  const body = BODY.map((p, i) => {
    let q = HEAD.has(i) ? rot(p, neck, headA) : p;
    if (BACK.includes(i)) q = [q[0], q[1] - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + q[0] * 0.16))];
    if (BELLY.includes(i)) q = [q[0], q[1] + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + q[0] * 0.2))];
    return T(q);
  });
  const fill = (pts, top, bottom, light = 0) => {
    const ys = pts.map((p) => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
    g.poly(pts, null, (x, y) => { const k = (y - y0) / ((y1 - y0) || 1), v = 4 - light - k * 3 + (bayer(x, y) - 0.5) * 0.9; const i = Math.max(top, Math.min(4, Math.round(v))); return GOLD[Math.max(bottom, Math.min(top + 4, i))] ?? GOLD[i]; });
  };
  const outline = (pts) => { for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; g.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), OUT); } };
  // far legs (shadow side)
  if (legs) for (const leg of [FAR_FORE, FAR_HIND]) { const pts = leg.map(T); g.poly(pts, null, (x, y) => (bayer(x, y) < 0.6 ? GOLD[2] : GOLD[1])); outline(pts); }
  // tail, whipping
  for (let k = 0; k < 14; k++) { const u = k / 13, [x, y] = T([106 + u * 16, 38 - u * 9 + Math.sin(phase * 1.6 + u * 3) * 5 * u * shake]); g.disc(Math.round(x), Math.round(y), Math.max(1, Math.round((3.2 - u * 1.9) * s)), OUT); }
  for (let k = 0; k < 14; k++) { const u = k / 13, [x, y] = T([106 + u * 16, 38 - u * 9 + Math.sin(phase * 1.6 + u * 3) * 5 * u * shake]); g.disc(Math.round(x), Math.round(y), Math.max(1, Math.round((2.4 - u * 1.6) * s)), u < 0.5 ? GOLD[3] : GOLD[2]); }
  // body
  g.poly(body, null, (x, y) => {
    const ys = body.map((p) => p[1]), y0 = Math.min(...ys.slice(7, 15)), y1 = gy;
    const k = (y - y0) / (y1 - y0), v = 4.4 - k * 2.5 + (bayer(x, y) - 0.5) * 0.8; return GOLD[Math.max(2, Math.min(4, Math.round(v)))];
  });
  // shoulder + thigh muscle shading, belly shadow
  { const [x, y] = T([44, 44]); g.tint(Math.round(x - 12 * s), Math.round(y - 12 * s), Math.round(24 * s), Math.round(24 * s), (px, py) => Math.max(0, 0.25 - Math.hypot(px - x, py - y) / (40 * s)), GOLD[4], 4); }
  { const [x, y] = T([94, 48]); g.tint(Math.round(x - 14 * s), Math.round(y - 12 * s), Math.round(28 * s), Math.round(26 * s), (px, py) => Math.max(0, 0.2 - Math.hypot(px - x, py - y) / (50 * s)), GOLD[4], 4); }
  outline(body);
  // wet fur clumps along the back and belly
  for (let i = 0; i < 14; i++) {
    const u = i / 13, top = i % 2 === 0, x = 50 + u * 52, yb = top ? 29.5 - shake * (2.2 + 1.6 * Math.sin(phase * 1.3 + x * 0.16)) : 57.5 + shake * (1.5 + 1.4 * Math.sin(phase * 1.1 + x * 0.2));
    const dir = top ? -1 : 1, len = (2.5 + 2.5 * Math.abs(Math.sin(phase + i))) * shake, [bx, by] = T([x, yb]), [tx, ty] = T([x + Math.sin(phase + i) * 1.5, yb + dir * len]);
    g.poly([[bx - 1.6 * s, by], [bx + 1.6 * s, by], [tx, ty]], top ? GOLD[4] : GOLD[2]); g.line(Math.round(bx - 1.6 * s), Math.round(by), Math.round(tx), Math.round(ty), OUT);
  }
  // head details: eye, nose, mouth, brow
  const H = (p) => T(rot(p, neck, headA));
  { const [x, y] = H([17, 13]); g.rect(Math.round(x) - 1, Math.round(y) - 1, Math.max(2, Math.round(2.4 * s)), Math.max(2, Math.round(2.4 * s)), NOSE); g.px(Math.round(x), Math.round(y) - 1, "#FDFEED"); }
  { const pts = [[1, 18], [5, 17], [6, 21], [2, 23]].map(H); g.poly(pts, NOSE); }
  { const a = H([6, 26]), b = H([16, 28]); g.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), GOLD[0]); }
  { const a = H([12, 10]), b = H([20, 9]); g.line(Math.round(a[0]), Math.round(a[1]), Math.round(b[0]), Math.round(b[1]), GOLD[4]); }
  // ear: floppy, lifted outward by the shake
  { const lift = -1.2 * shake * (0.75 + 0.25 * Math.sin(phase * 2)), base = [30, 10], ear = EAR.map((p) => H(rot(p, base, lift)));
    g.poly(ear, null, (x, y) => (bayer(x, y) < 0.35 ? GOLD[1] : GOLD[2])); outline(ear); }
  return body;
}
