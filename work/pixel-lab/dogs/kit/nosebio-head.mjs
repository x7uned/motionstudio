// Dog series kit · «wet nose» diagram 2: a side cut-away of the collie's head facing RIGHT (cute and simplified, an
// illustration, not anatomy to scale). The outer head (black fur, white blaze and muzzle, amber eye, folded ear, red
// collar) keeps its silhouette; a clean window opens over the snout and shows the long nasal passage with scroll-like
// turbinates, the smell area at the back (warm yellow when active), the mouth with the tongue and, in the roof of the
// mouth, a small bean: the second smell organ (vomeronasal / Jacobson's organ).
import { blob, ell, eye, blush, smooth } from "../../animals/film/cute.mjs";
import { BLK, WHT, NOSE, DOG_EYE, EAR_IN, LIT } from "./dog-head.mjs";
import { R, TAU, clamp01, sm01, frac, lerp, bayer, mix, fade, ibox, boxView, fit, Layer, blit, lru, PAL, darkBg, discF, ellF, airDot, polyLen, polyAt, curve, polyMask, maskView, band, stroke } from "./nosebio-util.mjs";

const RED = ["#3A0A10", "#6A1218", "#A01E22", "#D0342E", "#EC5A44", "#F8866A", "#FCB49C", "#FFE0D4"];
const GOLD = ["#3A2404", "#6A4408", "#A06A10", "#D09A20", "#F4C840", "#FBE07A", "#FFF2B8", "#FFFFFF"];
const C = {
  cut: "#E4DEF6", cutHi: "#FAF8FF", tissue: ["#9A92BE", "#AEA6D0", "#BFB7DE", "#CFC8EA"],
  cavity: ["#0E0C22", "#141230", "#1A183C", "#211E48"], mucosa: "#D49AB8", mucosaD: "#9A5A80",
  scroll: ["#5A3A5A", "#B07898", "#E0B0C8", "#F6DCE8"], bone: PAL.bone, mouth: PAL.mouth,
};

// ---------------------------------------------------------------- nominal geometry (500 × 420, facing right)
// ear frame (dog-head.mjs side ear, scaled): base B, leaning back, the tip folded forward
const EARK = 6.0, EARB = [150, 70], EW = [0.94, -0.34], EU = [-0.34, -0.94];
const EP = ([a, b]) => [EARB[0] + (a * EW[0] + b * EU[0]) * EARK, EARB[1] + (a * EW[1] + b * EU[1]) * EARK];
const G0 = {
  cranium: [190, 168, 135, 128],
  cheek: [[160, 250], [124, 280], [142, 284], [120, 306], [154, 300], [154, 318], [188, 302], [212, 316], [222, 290], [250, 282], [238, 248]],
  neck: [[96, 230], [70, 300], [56, 360], [50, 420], [318, 420], [318, 340], [300, 262]],
  bib: [[236, 262], [304, 262], [330, 300], [342, 356], [348, 420], [224, 420], [214, 388], [230, 364], [212, 338], [228, 312], [216, 288]],
  ear: [[118, 96], [100, 50], [100, 12], [114, -10], [146, -14], [168, 4], [182, 44], [192, 90]],
  earIn: [[152, 76], [150, 32], [160, 20], [176, 48], [184, 84]],
  earFold: [[110, -8], [148, -16], [172, 0], [202, 30], [188, 36], [162, 20], [128, 10]],
  blaze: null,
  snout: [[290, 166], [314, 140], [356, 141], [404, 147], [438, 156], [458, 168], [478, 196], [470, 226], [446, 242], [400, 252], [340, 260], [300, 262], [270, 232]],
  jaw: [[320, 258], [400, 254], [426, 249], [434, 255], [420, 268], [386, 282], [334, 290], [290, 288], [266, 270], [280, 256]],
  nose: [468, 190, 29, 25],
  eye: [262, 120, 31, 34],
  blush: [204, 170, 14, 5.5],
  lip: [[300, 255], [308, 261], [350, 260], [400, 254], [436, 246], [452, 243]],
  collar: [[70, 290], [140, 306], [220, 306], [300, 286], [306, 302], [222, 324], [138, 324], [66, 306]],
  tag: [296, 322, 10],
  // the cut-away window and what is inside
  win: [[446, 178], [458, 184], [458, 185], [500, 185], [500, 197], [458, 197], [452, 206], [440, 230], [424, 254], [384, 270], [330, 280], [276, 278], [246, 264], [228, 238], [222, 202], [226, 180], [250, 168], [290, 164], [330, 161], [380, 166], [420, 172]],
  cavTop: [[500, 186], [458, 186], [440, 181], [410, 177], [380, 175], [340, 172], [300, 172], [270, 174], [246, 180], [234, 194]],
  cavBot: [[234, 214], [248, 228], [300, 232], [360, 230], [410, 222], [440, 208], [458, 196], [500, 196]],
  throat: [[232, 210], [250, 220], [254, 262], [242, 276], [230, 262]],
  palBot: [[448, 214], [410, 232], [360, 239], [300, 241], [256, 240]],
  floor: [[444, 234], [426, 254], [386, 266], [326, 272], [280, 268], [254, 254], [250, 240]],
  tongueTop: [[430, 242], [406, 249], [370, 253], [330, 255], [292, 254], [258, 248]],
  organ: [360, 237, 16, 5.8, -0.05],
  scrolls: [[432, 193, 8, 1], [405, 200, 11.5, -1], [374, 200, 14.5, 1], [340, 201, 15, -1], [310, 201, 11, 1]],
  smell: [[248, 186, 7, 1], [266, 181, 6.5, -1], [282, 190, 6, 1], [252, 204, 7, -1], [270, 200, 7, 1], [286, 208, 5.5, -1], [258, 220, 6, 1], [275, 218, 6, -1]],
  smellC: [266, 200, 32, 30],
  seed: [350, 216],
  airUp: [[526, 190], [500, 190], [458, 190], [438, 183], [406, 181], [374, 178], [340, 177], [312, 178], [290, 182], [274, 190], [266, 199]],
  airDn: [[526, 191], [500, 191], [458, 191], [442, 202], [410, 216], [370, 222], [330, 224], [290, 226], [260, 228], [246, 240], [242, 262], [242, 292]],
  anchors: { nostril: [497, 190], passage: [390, 214], smellArea: [266, 200], organ: [360, 237], tongue: [340, 258], eye: [262, 120], nose: [468, 190], throat: [242, 255] },
};
/** The nominal design is shifted down by DY so the folded ear fits under the top edge. */
const DY = 24;
function hfit(w, h) { const F = fit(w, h); return { ...F, Y: (y) => F.Y(y + DY), P: (p) => F.P([p[0], p[1] + DY]), poly: (pts) => pts.map((p) => F.P([p[0], p[1] + DY])) }; }
/** y of a polyline (sorted by x either way) at x. */
function yAt(pts, x) {
  for (let i = 0; i + 1 < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[i + 1]; if ((x - ax) * (x - bx) <= 0 && ax !== bx) return ay + ((x - ax) / (bx - ax)) * (by - ay); }
  return pts[x < pts[0][0] === pts[0][0] < pts[pts.length - 1][0] ? 0 : pts.length - 1][1];
}

/** Anchor points for the lead's labels (screen coordinates). */
export function headCutAnchors(box) {
  const b = ibox(box), F = hfit(b.w, b.h), out = {};
  for (const [k, p] of Object.entries(G0.anchors)) { const q = F.P(p); out[k] = [b.x + q[0], b.y + q[1]]; }
  return out;
}

// ---------------------------------------------------------------- spirals (scroll turbinates)
function spiral(cx, cy, r, dir, turns = 1.6) {
  const pts = [], n = Math.ceil(40 * turns);
  for (let i = 0; i <= n; i++) { const u = i / n, a = dir * (u * turns * TAU) - Math.PI / 2, rr = r * (1 - 0.78 * u); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  return pts;
}

// ---------------------------------------------------------------- static layers
const cache = lru(4);
function build(w, h, bg) {
  return cache(`${w}x${h}:${bg}`, () => {
    const F = hfit(w, h), s = F.s, P = F.P, PL = F.poly;
    const yBot = (h - F.oy) / s - DY + 12, down = (pts) => pts.map(([x, y]) => [x, y >= 420 ? Math.max(420, yBot) : y]);   // the neck reaches the bottom of any box
    const head = new Layer(w, h), tmp = new Layer(w, h, head), inner = new Layer(w, h, head);
    if (bg) darkBg(head, { x: 0, y: 0, w, h });
    // --- outer head (into tmp, then over the background) ---
    const T = (k) => k * s;
    blob(tmp, [PL(smooth(down(G0.neck), new Set([3, 4]), 4))], { ramp: BLK, thick: T(40), base: 2.6, gain: 2.0, litOutline: LIT });
    blob(tmp, [PL(smooth(down(G0.bib), new Set([4, 5, 6, 7, 8, 9]), 4))], { ramp: WHT, thick: T(30), base: 4.2, gain: 1.6, outline: "#2A2A40", litOutline: "#9494AE" });
    // ear behind the skull: dark back, pink inner sliver, folded tip
    blob(tmp, [PL(smooth(G0.ear, new Set([0, 7]), 4))], { ramp: BLK, thick: T(22), base: 2.8, gain: 2.0, litOutline: LIT });
    blob(tmp, [PL(smooth(G0.earIn, new Set([0, 4]), 4))], { ramp: EAR_IN, thick: T(10), base: 3.0, gain: 1.8, outline: "#14101C" });
    blob(tmp, [PL(smooth(G0.earFold, new Set([3]), 4))], { ramp: BLK, thick: T(9), base: 3.7, gain: 1.6, litOutline: "#7A74B0" });
    // cranium + cheek fluff
    blob(tmp, [PL(ell(...G0.cranium, 0, 90)), PL(smooth(G0.cheek, new Set([1, 2, 3, 4, 5, 6, 7, 8]), 3))], { ramp: BLK, thick: T(52), base: 2.6, gain: 2.4, litOutline: LIT });
    // collar + tag
    blob(tmp, [PL(smooth(G0.collar, new Set([3, 4, 7, 0]), 4))], { ramp: RED, thick: T(5), base: 3.4, gain: 1.8, outline: "#2A060A" });
    stroke(tmp, PL([[G0.tag[0] + 2, G0.tag[1] - 18], [G0.tag[0], G0.tag[1] - 8]]), Math.max(0.7, 1.4 * s), GOLD[2]);
    blob(tmp, [PL(ell(G0.tag[0], G0.tag[1], G0.tag[2], G0.tag[2], 0, 24))], { ramp: GOLD, thick: T(5), base: 3.6, gain: 2.0, outline: "#3A2404" });
    discF(tmp, ...P([G0.tag[0] - 3, G0.tag[1] - 3]), T(2), GOLD[7]);
    // white blaze, lower jaw, muzzle
    { // the white blaze: a stripe along the front of the skull, narrow on top, widening into the muzzle
      const [cx, cy, rx, ry] = G0.cranium, outer = [], inner2 = [];
      for (let k = 0; k <= 16; k++) { const th = lerp(-1.48, -0.46, k / 16), wd = lerp(5, 30, (k / 16) ** 1.3); outer.push([cx + rx * 0.995 * Math.cos(th), cy + ry * 0.995 * Math.sin(th)]); inner2.push([cx + (rx - wd) * Math.cos(th), cy + (ry - wd) * Math.sin(th)]); }
      blob(tmp, [PL([...outer, [330, 150], [312, 176], ...inner2.reverse()])], { ramp: WHT, thick: T(12), base: 4.5, gain: 1.4, outline: "#2A2A40", litOutline: "#B8B8CE" });
    }
    blob(tmp, [PL(smooth(G0.jaw, new Set(), 4))], { ramp: WHT, thick: T(12), base: 4.2, gain: 1.5, outline: "#4A4A60" });
    blob(tmp, [PL(smooth(G0.snout, new Set(), 4))], { ramp: WHT, thick: T(26), base: 4.6, gain: 1.5, outline: "#4A4A60", litOutline: "#9494AE" });
    // lip line + whisker-pad dots
    stroke(tmp, PL(curve(G0.lip, 6)), Math.max(0.6, 1.1 * s), "#07060E");
    for (const [x, y] of [[414, 228], [426, 222], [404, 238], [432, 234], [394, 226]]) { const q = P([x, y]); tmp.rect(R(q[0]), R(q[1]), Math.max(1, R(2 * s)), Math.max(1, R(2 * s)), "#9A9AB4"); }
    // nose: glossy black with a highlight band and a side nostril comma
    const [nx, ny, nrx, nry] = G0.nose;
    blob(tmp, [PL(smooth([[nx - nrx, ny - 4], [nx - 12, ny - nry], [nx + 6, ny - nry - 1], [nx + nrx, ny - 6], [nx + nrx - 1, ny + 8], [nx + 10, ny + nry], [nx - 10, ny + nry - 1], [nx - nrx + 2, ny + 10]], new Set(), 5))], { ramp: NOSE, thick: T(10), base: 2.2, gain: 2.6, slope: 1.2, outline: "#020104", rimLit: 1.6 });
    ellF(tmp, ...P([nx - 3, ny - 11]), T(10), T(3.2), "#7A86B0", -0.15); ellF(tmp, ...P([nx - 4, ny - 11.5]), T(6), T(1.6), "#C9D3F2", -0.15); discF(tmp, ...P([nx + 13, ny - 9]), T(2.2), "#FFFFFF");
    blush(tmp, ...P([G0.blush[0], G0.blush[1]]), T(G0.blush[2]), Math.max(1, T(G0.blush[3])), "#F27A9A");
    head.over(tmp);
    const sil = tmp.idx;

    // --- the window and what is inside ---
    const winPoly = PL(G0.win), win = polyMask(w, h, winPoly);
    const cav = PL([...G0.cavTop, ...G0.cavBot]), cavM = polyMask(w, h, cav), throatM = polyMask(w, h, PL(smooth(G0.throat, new Set(), 4)));
    const palM = polyMask(w, h, PL([...G0.cavBot.slice(1, 6), ...G0.palBot]));
    const oralM = polyMask(w, h, PL([...G0.palBot, ...G0.floor.slice().reverse()]));
    const smellPoly = PL(ell(...G0.smellC, 0, 40)), smellM = polyMask(w, h, smellPoly);
    // tissue (cut face) with soft shading toward the openings
    const nearOpen = (x, y) => { for (let d = 1; d <= R(4 * s); d++) if (cavM[y * w + Math.min(w - 1, x + d)] || cavM[Math.max(0, y - d) * w + x] || oralM[Math.max(0, y - d) * w + x]) return true; return false; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!win[i]) continue;
      let col;
      if (cavM[i] || throatM[i]) {
        const v = (y - F.Y(180)) / (50 * s);
        col = band(C.cavity, 2.6 - clamp01(v) * 1.6 + (x > F.X(440) ? 0.6 : 0), x, y);
      } else if (oralM[i]) col = band(C.mouth, 1.6 - clamp01((F.Y(266) - y) / (30 * s)) * 0.0 + (x > F.X(420) ? 0.5 : 0) - (x < F.X(290) ? 0.7 : 0), x, y);
      else if (palM[i]) col = band(C.bone, 3.1 - (y - F.Y(226)) / (10 * s) * 1.2, x, y, 1);
      else col = nearOpen(x, y) ? C.tissue[1] : band(C.tissue, 3.2 - 0.0, x, y);
      inner.px(x, y, col);
    }
    // mucosa lining (pink) along the passage walls, then dark wall outline
    const edgeOf = (M, x, y) => M[y * w + x] && (!M[y * w + x - 1] || !M[y * w + x + 1] || !M[(y - 1) * w + x] || !M[(y + 1) * w + x]);
    const both = new Uint8Array(w * h); for (let i = 0; i < both.length; i++) both[i] = cavM[i] || throatM[i] ? 1 : 0;
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x; if (!win[i]) continue;
      if (edgeOf(both, x, y)) inner.px(x, y, C.mucosaD);
      else if (both[i] && (!both[i - 2] || !both[i + 2] || !both[i - 2 * w] || !both[i + 2 * w])) inner.px(x, y, C.mucosa);
      if (edgeOf(oralM, x, y)) inner.px(x, y, "#22060E");
    }
    // palate ridges (little bumps under the palate)
    for (let k = 0; k < 6; k++) { const x = 290 + k * 24, y = yAt(G0.palBot, x); const q = P([x, y]); inner.rect(R(q[0]) - 1, R(q[1]), Math.max(2, R(4 * s)), Math.max(1, R(1.5 * s)), C.bone[2]); }
    // turbinate scrolls: rolled sheets hanging on short stalks from the roof of the passage
    const scrollDraw = (sx, sy, r, dir, ramp) => {
      const top = yAt(G0.cavTop.slice(1), sx), stalk = [[sx, sy - r * 0.9], [sx + 1, top + 1]];
      const sp = PL(spiral(sx, sy, r, dir));
      stroke(inner, PL(stalk), Math.max(1, 2.2 * s), ramp[0]); stroke(inner, sp, Math.max(1, 2.4 * s), ramp[0]);
      stroke(inner, PL(stalk), Math.max(0.6, 1.2 * s), ramp[2]); stroke(inner, sp, Math.max(0.6, 1.3 * s), ramp[2]);
      for (let k = 0; k < sp.length * 0.35; k += 2) inner.px(Math.floor(sp[k][0] - 0.5), Math.floor(sp[k][1] - 0.5), ramp[3]);
    };
    for (const [sx, sy, r, dir] of G0.scrolls) scrollDraw(sx, sy, r, dir, C.scroll);
    // smell area scrolls (drawn into their own mask so they can light up)
    const smellL = new Layer(w, h, head);
    for (const [sx, sy, r, dir] of G0.smell) {
      const sp = PL(spiral(sx, sy, r, dir, 1.4));
      stroke(smellL, sp, Math.max(1, 2.1 * s), "#000001"); stroke(smellL, sp, Math.max(0.6, 1.2 * s), "#000002");
    }
    const smellStroke = [], smellCore = [], smellGlow = [];
    for (let i = 0; i < w * h; i++) {
      if (!win[i]) continue;
      const k = smellL.idx[i] ? smellL.pal[smellL.idx[i]] : null;
      if (k === "#000001") { inner.idx[i] = inner.key(C.scroll[0]); smellStroke.push(i); }
      else if (k === "#000002") { inner.idx[i] = inner.key(C.scroll[2]); smellCore.push(i); }
      else if (smellM[i] && (cavM[i] || throatM[i])) smellGlow.push(i);
    }
    // teeth: a little upper fang and a lower one at the front of the mouth
    const fang = (pts, col) => { const q = PL(pts); inner.poly(q, "#2A2A40"); inner.poly(PL([[pts[0][0] + 1, pts[0][1] + 0.5], [pts[1][0] - 1, pts[1][1] + 0.5], [pts[2][0], pts[2][1] - 1.6 * Math.sign(pts[2][1] - pts[0][1])]]), col); };
    fang([[428, 226], [440, 222], [436, 240]], C.bone[4]);
    fang([[416, 258], [428, 254], [424, 244]], C.bone[3]);
    // cut edge: dark outline + a light inner line (a clean diagram cut, not flesh)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!win[i]) continue;
      const out = x === 0 || y === 0 || x === w - 1 || y === h - 1 || !win[i - 1] || !win[i + 1] || !win[i - w] || !win[i + w];
      if (out) { inner.idx[i] = inner.key("#07060E"); continue; }
      const out2 = !win[i - 2] || !win[i + 2] || !win[i - 2 * w] || !win[i + 2 * w];
      if (out2 && !both[i]) inner.idx[i] = inner.key(C.cutHi);
    }
    // reveal distances from the seed
    const [sxp, syp] = P(G0.seed), dist = new Float32Array(w * h); let maxD = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!win[i]) continue; const d = Math.hypot(x + 0.5 - sxp, (y + 0.5 - syp) * 1.6); dist[i] = d; maxD = Math.max(maxD, d); }
    return { F, s, head, inner, win, sil, dist, maxD, rev: new Uint8Array(w * h), smellStroke, smellCore, smellGlow, cavM: both, smellPoly };
  });
}

// ---------------------------------------------------------------- tongue
function tonguePoly(k) {
  // the top surface arches up to the palate under the organ as k → 1; the bottom stays on the mouth floor
  const [ox] = G0.organ, top = [], bot = [];
  for (let x = 260; x <= 430; x += 4) {
    const rest = yAt(G0.tongueTop, x), roof = yAt(G0.palBot, x) + 1.2, bump = Math.exp(-(((x - ox - 4) / 40) ** 2)) * 1.0;
    const y = lerp(rest, Math.max(rest - 30, roof), clamp01(k * bump * 1.08));
    top.push([x, Math.min(rest, y)]);
  }
  for (let x = 430; x >= 260; x -= 6) bot.push([x, yAt(G0.floor, Math.min(440, x)) + 2]);
  return [...top, [437, 245], ...bot];
}
const tongueTopAt = (k, x) => { const [ox] = G0.organ, rest = yAt(G0.tongueTop, x), roof = yAt(G0.palBot, x) + 1.2, bump = Math.exp(-(((x - ox - 4) / 40) ** 2)); return Math.min(rest, lerp(rest, Math.max(rest - 30, roof), clamp01(k * bump * 1.08))); };

const DOTS = ["#FF5A6E", "#7CE85A", "#FFB43A", "#B07AF0", "#5AD8F0", "#FF8AD0", "#F4E05A", "#6AA8FF"];

/**
 * drawHead(c, box, t, o) — o: { a, cut, smellArea, organ, tongue, air, dots, blink, bg }.
 * cut 0..1: the window opens (a dithered reveal growing from the middle of the snout).
 * smellArea 0..1: the smell scrolls at the back light up warm yellow. organ 0..1: the bean lights up, pulsing with t.
 * tongue 0..1: the tongue arches up to the roof of the mouth; 8 coloured smell dots ride on it to the organ.
 * air 0..1: inhaled air streams (dotted, moving with t) through the nostril: upper stream to the smell area, lower
 * stream to the throat. dots 0..1 (default 1): the smell dots on the tongue. blink 0..1, look [dx, dy] (−1..1, default
 * [0.55, 0.05]) for the eye. bg (default true): the dark diagram background; false = only the head.
 * Returns the anchors {nostril, passage, smellArea, organ, tongue, eye, nose, throat} (screen coordinates).
 */
export function drawHead(c, box, t = 0, o = {}) {
  const a = clamp01(o.a ?? 1), b = ibox(box), A = headCutAnchors(b);
  if (a <= 0) return A;
  const K = build(b.w, b.h, o.bg !== false), { F, s, head, inner, win, sil, dist, maxD, rev } = K, w = b.w;
  const cut = clamp01(o.cut ?? 0), smellA = clamp01(o.smellArea ?? 0), organ = clamp01(o.organ ?? 0), tongue = clamp01(o.tongue ?? 0), air = clamp01(o.air ?? 0), dots = clamp01(o.dots ?? 1);
  const g = boxView(c, b, a), P = (p) => { const q = F.P(p); return [b.x + q[0], b.y + q[1]]; }, PL = (pts) => pts.map(P);

  // 1. composite outer head / revealed window
  const edge = 14 * s, thr = cut * (maxD + edge);
  const hi = head.idx, ii = inner.idx;
  for (let y = 0; y < b.h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; rev[i] = win[i] && cut > 0 && dist[i] + edge * bayer(b.x + x, b.y + y) < thr ? 1 : 0; }
  blit(c, head, b.x, b.y, a, (i) => (rev[i] ? ii[i] : hi[i]));
  const inWin = maskView(g, (X, Y) => { const x = X - b.x, y = Y - b.y; return x >= 0 && y >= 0 && x < w && y < b.h && rev[y * w + x] === 1; });

  // 2. smell area: scrolls turn warm yellow, the air around them glows
  if (smellA > 0 && cut > 0) {
    const pulse = 0.88 + 0.12 * Math.sin(t * TAU * 0.8), k = smellA * pulse, gs = fade(inWin, sm01(smellA / 0.4));
    const [scx, scy] = F.P([G0.smellC[0], G0.smellC[1]]), rx = G0.smellC[2] * s, ry = G0.smellC[3] * s;
    for (const i of K.smellGlow) { const x = i % w, y = (i / w) | 0, d = Math.hypot((x - scx) / rx, (y - scy) / ry); if ((1 - d) * k * 1.3 > bayer(b.x + x, b.y + y)) gs.px(b.x + x, b.y + y, d < 0.5 ? PAL.smell[2] : PAL.smell[1]); }
    for (const i of K.smellStroke) gs.px(b.x + (i % w), b.y + ((i / w) | 0), mix(C.scroll[0], PAL.smell[2], k));
    for (const i of K.smellCore) { const x = i % w, y = (i / w) | 0; gs.px(b.x + x, b.y + y, band(PAL.smell, 3.6 + 2.2 * k + (y < scy ? 0.5 : 0), b.x + x, b.y + y, 2)); }
  }

  // 3. inhaled air: dotted streams moving along the passage (the lead fades them with `air`)
  if (air > 0) {
    const ga = fade(maskView(g, (X, Y) => { const x = X - b.x, y = Y - b.y; if (x < 0 || y < 0 || x >= w || y >= b.h) return false; const i = y * w + x; return rev[i] === 1 || !sil[i]; }), sm01(air / 0.35));
    for (const [path, ph, spd] of [[G0.airUp, 0, 1], [G0.airDn, 0.37, 1.15]]) {
      const pts = PL(curve(path, 6)), cum = polyLen(pts), L = cum[cum.length - 1], reach = L * sm01(air / 0.9) + 1, gap = 11 * s;
      for (let d = frac(t * 1.25 * spd + ph) * gap; d < reach; d += gap) {
        const q = polyAt(pts, cum, d); if (!q) continue;
        const end = clamp01((L - d) / (26 * s)), tail = clamp01((reach - d) / (20 * s));
        airDot(ga, q[0], q[1], Math.max(1, 1.7 * s * Math.min(1, 0.4 + end) * Math.min(1, 0.4 + tail)), PAL.air);
      }
    }
  }

  // 4. the second smell organ: a bean in the roof of the mouth; lights up and pulses
  if (cut > 0) {
    const [ox, oy, orx, ory, rot] = G0.organ, [cx, cy] = P([ox, oy]), pul = organ * (0.75 + 0.25 * Math.sin(t * TAU * 1.4));
    if (pul > 0) inWin.tint(R(cx - orx * s - 12 * s), R(cy - ory * s - 12 * s), R(2 * (orx + 12) * s), R(2 * (ory + 12) * s), (x, y) => { const d = Math.hypot((x - cx) / ((orx + 12) * s), (y - cy) / ((ory + 12) * s)); return d >= 1 ? 0 : pul * 0.75 * (1 - d); }, PAL.smell[5], 3);
    ellF(inWin, cx, cy, orx * s + 1.2, ory * s + 1.2, "#2A0E1E", rot);
    ellF(inWin, cx, cy, orx * s, ory * s, mix(PAL.pink[3], PAL.smell[4], organ * (0.7 + 0.3 * Math.sin(t * TAU * 1.4))), rot);
    ellF(inWin, cx - 3 * s, cy - 1.4 * s, orx * s * 0.62, ory * s * 0.42, mix(PAL.pink[5], PAL.smell[6], organ), rot);
    // the bean's little dimple (hilum)
    discF(inWin, cx + 1 * s, cy + 1.6 * s, 1.4 * s, mix(PAL.pink[2], PAL.smell[3], organ));
  }

  // 5. the tongue (arches toward the roof of the mouth) and the smell dots riding on it
  if (cut > 0) {
    const tp = tonguePoly(tongue);
    blob(inWin, [PL(smooth(tp, new Set(), 2))], { ramp: PAL.pink, thick: 7 * s, base: 3.8, gain: 1.6, slope: 0.8, outline: "#3A0E1E", litOutline: null });
    // centre line highlight on the top surface
    for (let x = 300; x <= 420; x += 2) { const q = P([x, tongueTopAt(tongue, x) + 2.4]); inWin.px(Math.floor(q[0]), Math.floor(q[1]), PAL.pink[6]); }
    if (dots > 0) {
      const gd = fade(inWin, dots);
      DOTS.forEach((col, i) => {
        const x0 = 388 + i * 5.2, k = sm01((tongue - 0.25 - 0.045 * i) / 0.5);
        const tx = G0.organ[0] - 12 + (i % 4) * 7.5, ty = G0.organ[1] + 6.5 + (i >> 2) * 0.0;
        const x = lerp(x0, tx, k), ride = tongueTopAt(tongue, x) - 1.6, y = lerp(ride, Math.min(ride, ty), sm01((k - 0.7) / 0.3));
        const wob = Math.sin(t * 5 + i * 1.7) * 0.4 * (1 - k);
        const [px, py] = P([x, y + wob]);
        airDot(gd, px, py, Math.max(1, 2.3 * s), col);
      });
    }
  }

  // 6. the eye (on top of everything; blink is continuous)
  const [ex, ey, er, ery] = G0.eye, [qx, qy] = P([ex, ey]);
  eye(g, qx, qy, er * s, { ry: ery * s, iris: DOG_EYE, pupil: "round", look: o.look ?? [0.55, 0.05], blink: clamp01(o.blink ?? 0), lid: BLK[3] });
  return A;
}
