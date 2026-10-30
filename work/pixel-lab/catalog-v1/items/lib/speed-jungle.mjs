// catalog-v1 copy (2026-10-26) of work/pixel-lab/animals-speed/film/levels/jungle.mjs (lines 26-172, 181-195, 215-224:
// palettes, trunk, canopyClump, heliconia, orchid, bromeliad, paintBack, MOSS_FLOOR, paintFront, lianas, morpho, shafts).
// Changes: the film's sloth, snail, moth, reach/sound timing and the twig with the leaves the sloth reaches for are not
// copied; the layer is painted over 620×1020 (floor extended 60 rows) so the whole frame can be filled after the
// scene is shifted up 60 px; paintFront's ground-line ferns sit at y 586; dynamic pieces take screen offsets (ox, oy)
// instead of the film's camera view V; the film's global sun/sky are not part of the level.
import { blob, ell, bez, tube, fade, mix, bayer, sm, lerp, rnd, clamp01 } from "./cute.mjs";
import { Layer, thick, pline, leaf, fern } from "./speed-jungle-kit.mjs";
const R = Math.round;
const GY = 640, LW = 620, LH = 1020, BRANCH_Y = 245;
const P = (sx, sy) => [sx + 40, sy];
export const BACK_H = LH;
const FOL = ["#081C10", "#0E2C16", "#16421C", "#205C24", "#2E782C", "#449436", "#64B044", "#8ECC5E"];
const FOL2 = ["#0A1E18", "#103024", "#18462E", "#215C38", "#2C7444", "#3E8E52", "#58A862", "#7EC27A"];      // bluer leaves
const FAR = ["#24504E", "#2C5E58", "#356C62", "#407A6C", "#4C8876", "#5A9680", "#6CA68C", "#84B89C"];
const BARK = ["#160F0A", "#261A12", "#3A2A1C", "#4E3826", "#634832", "#7A5A40", "#94704E", "#AE8A62"];
const MOSS = ["#24400E", "#355A14", "#4A7618", "#62921E", "#7EAC2A", "#9CC43E", "#BCDA5E"];
const LIANA = ["#20180E", "#3A2C18", "#544024", "#6E5634"];
function trunk(g, cx, w, top, bottom, seed, lean = 0) {
  for (let y = top; y < bottom + 2; y++) {
    const flare = y > bottom - 70 ? ((y - (bottom - 70)) / 70) ** 2.2 * 34 : 0, half = w / 2 + flare, x0 = cx + lean * (bottom - y) / (bottom - top);
    for (let x = -half; x <= half; x++) {
      const u = x / half, ridge = Math.sin((x + seed * 7) * 0.55 + Math.sin(y * 0.05 + seed) * 1.6) > 0.72 ? -1.1 : 0;
      let k = 4.1 - (u + 0.35) * 1.9 + ridge + (Math.abs(u) > 0.9 ? -1.2 : 0);
      const [px, py] = P(R(x0 + x), y); g.px(px, py, BARK[Math.max(0, Math.min(7, R(k + bayer(px, py) - 0.5)))]);
    }
    // moss on the lit (left) side and a few lichen spots
    if ((y + seed * 13) % 3 === 0) for (let x = -half; x < -half + 4 + 3 * Math.sin(y * 0.07 + seed); x++) { const [px, py] = P(R(x0 + x), y); if (rnd(px * 7 + py * 3) < 0.55) g.px(px, py, MOSS[2 + (rnd(px + py * 11) < 0.4 ? 1 : 0)]); }
    if (rnd(y * 17 + seed) < 0.04) { const [px, py] = P(R(x0 + (rnd(y + seed) - 0.5) * w * 0.6), y); g.rect(px, py, 3, 2, "#9AB08A"); g.px(px + 1, py, "#C4D4B0"); }
  }
}
function canopyClump(g, sx, sy, r, ramp, seed) {
  blob(g, [ell(...P(sx, sy), r * 1.25, r)], { ramp, thick: r * 0.7, base: 2.2, gain: 2.2, outline: ramp[0], litOutline: ramp[5] });
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + rnd(seed + i) * 0.6, d = r * (0.6 + rnd(seed * 3 + i) * 0.5); leaf(g, ...P(sx + Math.cos(a) * d * 1.1, sy + Math.sin(a) * d * 0.8), 18 + rnd(seed + i * 5) * 14, 6 + rnd(seed + i * 7) * 4, a + 0.4, ramp, { vein: false }); }
}
function heliconia(g, sx, sy, n, seed) {
  // lobster-claw flowers: a hanging zig-zag of red bracts with yellow tips
  pline(g, [P(sx, sy), P(sx + 1, sy + n * 9)], "#2E5A1E");
  for (let i = 0; i < n; i++) { const sd = i % 2 ? 1 : -1, y = sy + 4 + i * 9; const [x, yy] = P(sx + sd * 2, y); g.poly([[x, yy], [x + sd * 9, yy + 3], [x + sd * 11, yy + 7], [x + sd * 2, yy + 6]], "#C8281E"); g.poly([[x + sd * 2, yy + 1], [x + sd * 8, yy + 3], [x + sd * 9, yy + 5], [x + sd * 2, yy + 4]], "#F04A30"); g.px(x + sd * 10, yy + 6, "#F4D040"); g.px(x + sd * 11, yy + 6, "#F4D040"); g.px(x + sd * 9, yy + 5, "#FAE070"); }
}
function orchid(g, sx, sy, col = "#F07AB8", hi = "#FFC0DE") {
  const [x, y] = P(sx, sy);
  for (const [dx, dy] of [[-3, 0], [3, 0], [0, -3], [-2, 3], [2, 3]]) { g.rect(x + dx - 1, y + dy - 1, 3, 3, col); g.px(x + dx, y + dy - 1, hi); }
  g.px(x, y, "#FFE070"); g.px(x, y + 1, "#C83A6A");
}
function bromeliad(g, sx, sy, s = 1) {
  for (let i = -3; i <= 3; i++) { const a = -Math.PI / 2 + i * 0.32; const pts = bez(P(sx, sy), P(sx + Math.cos(a) * 10 * s, sy + Math.sin(a) * 12 * s), P(sx + Math.cos(a) * 18 * s, sy + Math.sin(a) * 9 * s + 6 * s), 8); thick(g, pts, 1, i % 2 ? "#3E7A2A" : "#5A9A36"); }
  const [x, y] = P(sx, sy - 6 * s); g.rect(x - 2, y - 6, 5, 7, "#E0383A"); g.rect(x - 1, y - 7, 3, 2, "#FF6A5A"); g.px(x, y - 8, "#FFD060");
}

function paintBack(g) {
  // --- far rainforest, layer 1: a pale, bumpy canopy skyline (low around the sun, higher towards the edges)
  const edgeK = (sx) => Math.min(sm(sx, -30, 90), 1 - sm(sx, 470, 575));         // the far forest grows out of the neighbours' edges
  const sky1 = (sx) => { const e = Math.min(1, Math.abs(sx - 262) / 270); return lerp(GY + 30, 500 - e * e * 150 + Math.sin(sx * 0.045) * 10 + Math.sin(sx * 0.13 + 1) * 5, edgeK(sx)); };
  for (let sx = -40; sx < 580; sx++) {
    const top = sky1(sx);
    const bump = Math.abs(Math.sin(sx * 0.11)) * 7 + Math.abs(Math.sin(sx * 0.047 + 2)) * 9, t0 = R(top - bump);
    if (t0 >= GY) continue;
    for (let sy = t0; sy < GY; sy++) { const [px, py] = P(sx, sy), v = (sy - t0) / 60; let k = 6 - v * 1.6 + (sy - t0 < 2 ? 0.8 : 0) + (bayer(px, py) - 0.5) * 0.9; if (Math.sin(sx * 0.11) * Math.sin(sy * 0.09) > 0.6) k -= 0.7; g.px(px, py, FAR[Math.max(2, Math.min(7, R(k)))]); }
  }
  // layer 2: nearer rainforest trees: slim trunks with round, layered crowns (darker, greener)
  const FAR2 = FAR.map((c0) => "#" + mix(c0, "#163828", 0.45).map((v) => v.toString(16).padStart(2, "0")).join(""));
  for (let i = 0; i < 12; i++) {
    const sx = -30 + i * 54 + rnd(i * 3) * 22; if (Math.abs(sx - 262) < 120 || sx < 40 || sx > 500) continue;
    const e = Math.min(1, Math.abs(sx - 262) / 260), top = 480 - e * 160 - rnd(i * 7) * 40, r = 20 + rnd(i * 5) * 12 + e * 8;
    for (let sy = R(top + r * 0.4); sy < GY; sy++) for (let x = -2; x <= 2; x++) { const [px, py] = P(R(sx + x), sy); g.px(px, py, x < 0 ? FAR2[3] : FAR2[2]); }
    const parts = []; for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + rnd(i * 13 + k), d = r * (0.3 + 0.45 * rnd(i * 17 + k)); parts.push(ell(...P(sx + Math.cos(a) * d * 1.3, top + Math.sin(a) * d * 0.55), r * (0.55 + 0.25 * rnd(i * 19 + k)), r * (0.45 + 0.2 * rnd(i * 23 + k)))); }
    blob(g, parts, { ramp: FAR2, thick: r * 0.5, base: 3.0, gain: 2.0, slope: 1.2, outline: "#1A3A30", litOutline: "#A8D0A8" });
  }
  // light haze at the bottom of the far forest
  for (let sy = 540; sy < GY; sy++) for (let sx = -40; sx < 580; sx++) { const [px, py] = P(sx, sy), v = (sy - 540) / (GY - 540); if (g.has?.(px, py) && v * 0.5 > bayer(px, py)) g.px(px, py, mix(g.get(px, py), "#CFE8C8", 0.25)); }
  // --- back undergrowth: big leaves, bushes and ferns along the ground line
  for (let i = 0; i < 22; i++) { const sx = -30 + i * 28 + rnd(i * 13) * 12, r = 16 + rnd(i * 3) * 14; blob(g, [ell(...P(sx, GY - r * 0.55), r * 1.4, r)], { ramp: FOL2, thick: r * 0.7, base: 2.8, gain: 2.0, outline: FOL2[0], litOutline: FOL2[6] }); }
  for (let i = 0; i < 16; i++) { const sx = 6 + i * 34 + rnd(i * 7) * 16; leaf(g, ...P(sx, GY - 4), 44 + rnd(i * 5) * 30, 13 + rnd(i * 9) * 6, -Math.PI / 2 + (rnd(i * 11) - 0.5) * 1.8, i % 2 ? FOL : FOL2, { bend: (rnd(i * 3) - 0.5) * 0.5 }); }
  for (let i = 0; i < 12; i++) { const sx = 10 + i * 46 + rnd(i * 17) * 20; fern(g, ...P(sx, GY - 2), -Math.PI / 2 - 0.5 - rnd(i) * 0.3, 46 + rnd(i * 3) * 20, 1.4, FOL, i); fern(g, ...P(sx + 4, GY - 2), -Math.PI / 2 + 0.5 + rnd(i * 5) * 0.3, 40 + rnd(i * 7) * 20, -1.3, FOL, i + 40); }
  // a low hedge on the garden seam (left) and a trimmed hedge before the stadium (right)
  for (const [sx0, sx1, top, ramp] of [[-26, 34, GY - 40, FOL2], [508, 560, GY - 66, FOL2]]) {
    for (let sx = sx0; sx < sx1; sx++) { const t = top + Math.sin(sx * 0.35) * 2 + (sx0 < 0 ? Math.max(0, -sx) * 0.3 : 0); for (let sy = R(t); sy < GY; sy++) { const v = (sy - t) / (GY - t), [px, py] = P(sx, sy); let k = 5.2 - v * 3 + (sy - t < 2 ? 1 : 0) + (bayer(px, py) - 0.5) * 1.2; if (rnd(px * 13 + py * 7) < 0.12) k += 1; g.px(px, py, ramp[Math.max(1, Math.min(7, R(k)))]); } }
  }
  // flowers in the undergrowth
  heliconia(g, 118, 560, 5, 1); heliconia(g, 432, 548, 6, 2); heliconia(g, 300, 586, 4, 3);
  for (const [sx, sy] of [[170, 606], [196, 596], [356, 612], [244, 618], [470, 600], [60, 612]]) orchid(g, sx, sy, (sx * 7) % 3 ? "#F07AB8" : "#B87AF0", (sx * 7) % 3 ? "#FFC0DE" : "#E4C8FF");
  // --- big trunks (left: the forest's entrance from the garden; right: towards the stadium)
  trunk(g, 54, 52, 0, GY, 3, -6);
  trunk(g, 486, 46, 0, GY, 7, 8);
  // vines wrapped round the trunks
  for (const [cx, w, ph] of [[54, 52, 0], [486, 46, 2]]) for (let sy = 120; sy < GY - 20; sy++) { const x = Math.sin(sy * 0.045 + ph) * w * 0.55, front = Math.cos(sy * 0.045 + ph) > 0; if (!front) continue; const [px, py] = P(R(cx + x), sy); g.px(px, py, LIANA[2]); g.px(px + 1, py, LIANA[3]); if (sy % 23 === 0) leaf(g, px + 1, py, 12, 4, -0.6 + (sy % 2) * 1.6, FOL, { vein: false }); }
  // --- the branch: from the left trunk across the whole scene into the right trunk, just above the sun disc
  const by = BRANCH_Y, bth = 15;
  for (let sx = 40; sx <= 500; sx++) {
    const top = by + Math.sin(sx * 0.021) * 2.2 + Math.sin(sx * 0.07) * 0.8, th = bth + (sx < 90 ? (90 - sx) * 0.3 : 0) + (sx > 450 ? (sx - 450) * 0.3 : 0);
    for (let k = 0; k < th; k++) { const v = k / th, [px, py] = P(sx, R(top + k - (sx < 90 ? (90 - sx) * 0.15 : 0) - (sx > 450 ? (sx - 450) * 0.15 : 0))); let q = 5.4 - v * 3.6 + (k === 0 ? 0.8 : 0) + (Math.sin(sx * 0.4 + k * 0.9) > 0.85 ? -1 : 0); g.px(px, py, k === R(th) - 1 ? BARK[1] : BARK[Math.max(1, Math.min(7, R(q + bayer(px, py) - 0.5)))]); }
    // moss along the top
    const mh = 2 + R(1.5 + 1.5 * Math.sin(sx * 0.13) + rnd(sx) * 1.2);
    for (let k = 0; k < mh; k++) { const [px, py] = P(sx, R(top) - k + 1); if (k < mh - 1 || rnd(sx * 3) < 0.6) g.px(px, py, MOSS[Math.min(6, 3 + k + (rnd(sx * 7 + k) < 0.3 ? 1 : 0))]); }
  }
  // epiphytes on the branch (away from the sloth): a bromeliad and an orchid near the right trunk, ferns on the left
  bromeliad(g, 446, by + 1, 1); orchid(g, 420, by - 3); orchid(g, 428, by - 6, "#FFFFFF", "#FFE0F0");
  fern(g, ...P(100, by), -Math.PI / 2 - 0.2, 26, -1.2, FOL, 5); fern(g, ...P(112, by), -Math.PI / 2 + 0.4, 22, 1.1, FOL, 6);
  // --- canopy along the top (leaves hang lower at the sides, a gap above the sun)
  for (let i = 0; i < 26; i++) { const sx = -36 + i * 24 + rnd(i * 7) * 10, e = Math.min(1, Math.abs(sx - 270) / 240), sy = 40 + e * e * 120 - rnd(i * 3) * 26 + (e < 0.4 ? -40 : 0), r = 30 + rnd(i * 5) * 16; canopyClump(g, sx, sy, r, i % 3 ? FOL : FOL2, i * 9); }
  for (let i = 0; i < 46; i++) {
    const sx = -36 + rnd(i * 13 + 1) * 620, e = Math.min(1, Math.abs(sx - 270) / 240), base = 70 + e * e * 140 + (e < 0.35 ? -50 : 0), sy = base + (rnd(i * 5) - 0.3) * 50;
    leaf(g, ...P(sx, sy), 34 + rnd(i * 3) * 30, 9 + rnd(i * 7) * 6, Math.PI / 2 + (rnd(i * 9) - 0.5) * 1.6, i % 4 ? FOL : FOL2, { vein: rnd(i) < 0.7, bend: (rnd(i * 17) - 0.5) * 0.6 });
  }
  // static lianas: long loops hanging from the canopy (the two nearest sway, drawn per frame)
  for (const pts of [[[-10, 120], [60, 330], [120, 250]], [[350, 150], [420, 420], [520, 190]], [[200, 100], [178, 200], [190, 238]]]) {
    const sp = bez(P(...pts[0]), P(...pts[1]), P(...pts[2]), 40); thick(g, sp, 1, LIANA[1]); pline(g, sp.map(([x, y]) => [x - 1, y - 1]), LIANA[3]);
    for (let k = 4; k < sp.length - 2; k += 6) leaf(g, sp[k][0], sp[k][1], 10, 3.5, 1.2 + (k % 2) * 0.8, FOL, { vein: false });
  }
  // --- forest floor below the ground line: moss and soil in soft patches, sunflecks, leaf litter, roots, small plants
  const nzf = (x, y) => 0.8 * Math.sin(x * 0.021 + Math.sin(y * 0.03) * 1.3) * Math.cos(y * 0.027 + Math.sin(x * 0.015) * 1.1) + 0.25 * Math.sin(x * 0.06 - y * 0.045 + 1.7);
  for (let sy = GY; sy < LH; sy++) for (let sx = -40; sx < 580; sx++) {
    const [px, py] = P(sx, sy), d = sy - GY, n = nzf(sx, sy * 1.6);
    let col;
    if (d < 3) col = d < 1 ? MOSS[3] : MOSS[1];
    else {
      const shadow = Math.max(0, 1 - d / 70) * 1;        // shade under the undergrowth (not on the garden lawn)
      const k = 3.0 + n * 0.9 - shadow * 1.6 + (bayer(px, py) - 0.5) * 0.7 + Math.min(0.8, d / 400);
      col = MOSS_FLOOR[Math.max(0, Math.min(6, R(k)))];
    }
    g.px(px, py, col);
  }
  // sunflecks: soft dithered light patches on the floor
  for (let i = 0; i < 16; i++) { const cx = 20 + rnd(i * 7 + 3) * 500, cy = GY + 40 + rnd(i * 11) * 270, rx = 14 + rnd(i * 5) * 26, ry = rx * 0.32; for (let y = R(cy - ry); y <= R(cy + ry); y++) for (let x = R(cx - rx); x <= R(cx + rx); x++) { const q = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2; if (q < 1 && x >= 0 && x < 540 && (1 - q) * 0.8 > bayer(x + 40, y)) { const [px, py] = P(x, y); g.px(px, py, mix(g.get(px, py), "#E8F890", 0.35)); } } }
  // leaf litter (little orange/brown leaves, larger towards the viewer)
  for (let i = 0; i < 400; i++) { const sx = rnd(i * 3 + 1) * 620 - 40, d = Math.pow(rnd(i * 5 + 2), 1.4) * 376, sy = GY + 4 + d, s2 = 1 + d / 110, [px, py] = P(R(sx), R(sy)); const col = ["#8A5A2A", "#A86E30", "#6E4A22", "#C08A3C", "#7A7A2E"][i % 5]; const w = R(2 * s2), h = Math.max(1, R(s2)); g.rect(px, py, w, h, col); g.px(px, py - 1, mix(col, "#FFFFFF", 0.3)); if (w > 3) g.px(px + w, py + 1, mix(col, "#000000", 0.3)); }
  // roots from the trunks
  for (const [cx, sd, n] of [[54, 1, 90], [54, -1, 50], [486, -1, 90], [486, 1, 40]]) { let x = cx + sd * 30, y = GY - 2; for (let k = 0; k < n; k++) { const r = Math.max(1, 4.5 - k / 22); for (let j = -r; j <= r; j++) { const [px, py] = P(R(x), R(y + j)); g.px(px, py, j < -r / 3 ? BARK[5] : j < r / 2 ? BARK[3] : BARK[1]); } x += sd * (1.3 - k / 150); y += 0.25 + k / 120 + Math.sin(k * 0.2) * 0.3; } }
  // a mossy fallen log and rocks (lower part, out of the caption band)
  { const ly = 862, lx0 = 300, lx1 = 470; blob(g, [tube([P(lx0, ly), P(lx1, ly - 10)], 15, 13)], { ramp: BARK, thick: 10, base: 3.0, gain: 2.0, outline: BARK[0], litOutline: BARK[7] });
    blob(g, [ell(...P(lx0, ly), 7, 15)], { ramp: ["#3A2A1A", "#5A4228", "#7A5A38", "#9A7448", "#B48E5C", "#C8A470", "#D8B888", "#E8CCA0"], thick: 5, base: 3.4, gain: 1.4, outline: BARK[0] });
    for (let k = 0; k < 3; k++) { const [x, y] = P(lx0, ly); g.ering(x, y, 1 + k * 2, 3 + k * 4, "#7A5A38"); }
    for (let x = lx0 + 6; x < lx1; x++) { const top = ly - 15 - (x - lx0) * (10 / (lx1 - lx0)); for (let k = 0; k < 3 + R(1.5 * Math.sin(x * 0.2) + 1); k++) { const [px, py] = P(x, R(top + k)); g.px(px, py, MOSS[Math.min(6, Math.max(0, 4 - k + (rnd(x * 3 + k) < 0.3 ? 1 : 0)))]); } }
    for (const [mx, k] of [[350, 0], [356, 1], [420, 2]]) { const [x, y] = P(mx, ly - 16 - (mx - lx0) * (10 / (lx1 - lx0))); g.rect(x, y - 4, 2, 4, "#EAE0C8"); g.rect(x - 3, y - 7, 8, 3, k % 2 ? "#E06A3A" : "#F0B43A"); g.px(x - 1, y - 7, "#FFFFFF"); } }
  for (const [rx0, ry0, rr] of [[96, 822, 14], [118, 832, 9], [214, 906, 18]]) { blob(g, [ell(...P(rx0, ry0), rr * 1.3, rr * 0.8)], { ramp: ["#1E2428", "#2E363A", "#40484C", "#545C5E", "#687072", "#7E8688", "#969E9E", "#B0B8B6"], thick: rr * 0.6, base: 3.2, gain: 2.0, outline: "#14181A" }); for (let x = -rr; x < rr; x++) { const [px, py] = P(rx0 + x, R(ry0 - rr * 0.8 * Math.sqrt(Math.max(0, 1 - (x / (rr * 1.3)) ** 2)))); g.px(px, py, MOSS[4]); g.px(px, py + 1, MOSS[3]); } }
  // small plants: fern clumps, round-leaved sprouts, little flowers
  for (let i = 0; i < 18; i++) { const sx = 20 + rnd(i * 31) * 500, sy = GY + 26 + rnd(i * 37) * 240, s2 = 0.7 + (sy - GY) / 260; if (sx > 280 && sx < 490 && sy > 820 && sy < 880) continue; fern(g, ...P(sx, sy), -Math.PI / 2 - 0.55, 16 * s2, 1.0, FOL2, i + 90); fern(g, ...P(sx + 2, sy), -Math.PI / 2 + 0.5, 14 * s2, -1.0, FOL2, i + 120); fern(g, ...P(sx + 1, sy), -Math.PI / 2, 18 * s2, 0.2, FOL, i + 150); }
  for (let i = 0; i < 26; i++) { const sx = 10 + rnd(i * 41) * 520, sy = GY + 14 + rnd(i * 43) * 300, s2 = 0.6 + (sy - GY) / 300; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.7; blob(g, [ell(...P(sx + Math.cos(a) * 5 * s2, sy + Math.sin(a) * 5 * s2), 3.6 * s2, 2.4 * s2, a)], { ramp: FOL, thick: 2, base: 4.4, gain: 1.4, outline: FOL[1] }); } if (i % 4 === 0) { const [x, y] = P(sx, sy - 9 * s2); g.rect(x - 1, y - 1, 3, 3, ["#F4E060", "#F08AC0", "#FFFFFF"][i % 3]); g.px(x, y, "#E0602A"); } }
}
const MOSS_FLOOR = ["#16260E", "#1E3412", "#284416", "#33561C", "#3E6822", "#4C7A2A", "#5C8C34"];
function paintFront(g) {
  // foreground: huge leaves at the bottom corners and a few in front of the ground line at the edges
  leaf(g, ...P(-20, 960), 150, 40, -1.05, FOL, { lit: "#B8E880", bend: 0.15 }); leaf(g, ...P(40, 975), 120, 34, -1.45, FOL2, { lit: "#A8E0A0" });
  leaf(g, ...P(560, 950), 140, 38, -2.15, FOL, { lit: "#B8E880", bend: -0.15 }); leaf(g, ...P(500, 980), 110, 30, -1.75, FOL2, { lit: "#A8E0A0" });
  for (let i = 0; i < 7; i++) { const sx = 60 + i * 72 + rnd(i * 3) * 30, sy = 900 + rnd(i * 5) * 50; fern(g, ...P(sx, sy), -Math.PI / 2 - 0.5, 50 + rnd(i) * 26, 1.3, FOL, i + 200); fern(g, ...P(sx + 4, sy), -Math.PI / 2 + 0.5, 46 + rnd(i * 7) * 24, -1.25, FOL, i + 230); }
  for (const sx of [-10, 30, 512, 548]) fern(g, ...P(sx, 586), -Math.PI / 2 + (sx < 270 ? 0.4 : -0.4), 40, sx < 270 ? 1.1 : -1.1, FOL, sx + 300);
}

// ---- build (catalog-v1): both layers painted once, in layer coordinates (x + 40, y)
let BACK = null, FRONT = null;
export function buildJungle() {
  if (BACK) return { BACK, FRONT };
  BACK = new Layer(LW, LH); BACK.g.has = (x, y) => BACK.has(x, y); paintBack(BACK.g);
  FRONT = new Layer(LW, LH); paintFront(FRONT.g);
  return { BACK, FRONT };
}
// ---- dynamic pieces. V = view in rest-screen coordinates (V.X(sx), V.Y(sy), V.z), the film's SX/SY mapping
export function lianas(c, V, t) {
  const SX = (x) => V.X(x), SY = (y) => V.Y(y);
  for (const [p0, p1, p2, ph, amp] of [[[24, 60], [96, 380], [150, 560], 0.3, 7], [[540, 70], [452, 360], [404, 520], 1.9, 6]]) {
    const sw = Math.sin(t * 0.9 + ph) * amp, q1 = [p1[0] + sw * 0.6, p1[1]], q2 = [p2[0] + sw, p2[1] + Math.abs(sw) * 0.2];
    const sp = bez([SX(p0[0]), SY(p0[1])], [SX(q1[0]), SY(q1[1])], [SX(q2[0]), SY(q2[1])], 36);
    thick(c, sp, 1, LIANA[1]); pline(c, sp.map(([x, y]) => [x - 1, y]), LIANA[3]);
    for (let k = 5; k < sp.length; k += 5) { const [x, y] = sp[k]; leaf(c, x, y, 11, 4, 0.9 + (k % 2) * 1.4 + Math.sin(t * 1.3 + k) * 0.08, FOL, { vein: false }); }
  }
}
export function morpho(c, V, t) {
  const u = t * 0.42, x = V.X(380 + Math.sin(u * 1.3) * 60 + Math.sin(u * 2.9) * 14), y = V.Y(470 + Math.sin(u * 1.9 + 1) * 40 + Math.sin(t * 7.3) * 2);
  const flap = Math.abs(Math.sin(t * 11)), w = R(2 + 5 * flap), X = R(x), Y = R(y);
  for (const sd of [-1, 1]) { c.poly([[X, Y], [X + sd * w, Y - 5], [X + sd * (w + 2), Y - 1], [X + sd * 2, Y + 2]], "#2A6AE0"); c.poly([[X, Y], [X + sd * Math.max(1, w - 2), Y - 3], [X + sd * Math.max(1, w - 1), Y]], "#7ACCFF"); c.px(X + sd * (w + 1), Y - 2, "#0E1A40"); }
  c.rect(X, Y - 1, 1, 5, "#1A1430");
}
export function shafts(c, V, t) {
  for (const [x0, wd, k0, ph] of [[150, 22, 0.2, 0], [318, 14, 0.16, 1.3], [390, 30, 0.2, 2.1]]) {
    const pulse = 0.8 + 0.2 * Math.sin(t * 0.7 + ph);
    for (let sy = 210; sy < 640; sy++) {
      const cx = V.X(x0 + (sy - 210) * 0.34), fall = 1 - (sy - 210) / 430, Y = R(V.Y(sy)), w = wd * V.z; if (Y < 0 || Y >= c.h) continue;
      for (let x = Math.max(0, R(cx - w)); x <= Math.min(c.w - 1, R(cx + w)); x++) { const e = 1 - Math.abs(x - cx) / w; if (e * fall * k0 * pulse > bayer(x, Y) * 0.9 + 0.04) { const i = (Y * c.w + x) * 3, d = c.d; d[i] += (255 - d[i]) * 0.22; d[i + 1] += (252 - d[i + 1]) * 0.22; d[i + 2] += (210 - d[i + 2]) * 0.18; } }
    }
  }
}
