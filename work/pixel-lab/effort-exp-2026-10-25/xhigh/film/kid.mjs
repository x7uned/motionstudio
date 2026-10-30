// «Pumpkin face» — the child in profile (cat-ear headband, purple hoodie), facing right at the pumpkin, standing a little
// closer to the camera (layer p 1.12). The face is lit orange from the jack-o'-lantern, the back and top get a cool moon rim.
// From "brain" on, the cranium is an X-ray window: a scan line sweeps down and reveals the brain inside (lilac lobes,
// sulci as iso-lines of a smooth field, cerebellum, brain stem). A signal runs from the back of the eye to the occipital
// pole and forward along the underside to the face area (fusiform, illustrative), which is outlined and then lights up.
// Pure function of t and the state; polygons are filled into a per-frame region mask and shaded in one pass.
import { bayer, mix, hex } from "../../../../../renderer/pixel/raster.mjs";
import { GW, GH, TAU, R, clamp01, sm, lerp, rnd, noise1, layer, ramp, band, tintPx, easeOut } from "./layout.mjs";

export const KID = { x: 134, y: 304, p: 1.12 };

// ---------------------------------------------------------------- geometry (head-local units, origin = cranium centre, y down)
function spline(pts, n = 6, closed = true) {
  const out = [], m = pts.length, P = (i) => pts[closed ? (i + m) % m : Math.max(0, Math.min(m - 1, i))];
  for (let i = 0; i < (closed ? m : m - 1); i++) { const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
                0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)]); } }
  if (!closed) out.push(pts[m - 1]);
  return out;
}
const HEAD = spline([[-26, 160], [-24, 104], [-44, 78], [-70, 50], [-84, 16], [-86, -20], [-74, -52], [-50, -74], [-16, -86], [20, -84], [52, -68], [74, -42], [84, -12], [86, 7], [82, 17], [85, 27], [92, 38], [92, 44], [84, 47], [86, 53], [83, 58], [85, 62], [81, 69], [81, 77], [73, 87], [54, 94], [34, 100], [27, 112], [26, 160]], 5);
const HAIR = spline([[85, -15], [81, -36], [67, -62], [40, -83], [6, -93], [-30, -89], [-63, -71], [-85, -41], [-93, -4], [-89, 34], [-75, 66], [-52, 82], [-32, 74], [-21, 46], [-8, 16], [18, 4], [42, -6], [62, -19], [72, -13]], 5);
const EAR = spline([[-4, 18], [5, 22], [8, 34], [4, 47], [-5, 51], [-12, 44], [-13, 30]], 4);
const EAR_IN = spline([[-2, 25], [3, 30], [2, 41], [-4, 44], [-7, 36]], 4);
const CAT_FAR = [[-28, -88], [-18, -126], [2, -94]], CAT_NEAR = [[0, -94], [20, -131], [34, -86]], CAT_IN = [[8, -96], [19, -121], [27, -91]];
const HOODIE = [[-34, 103], [-62, 110], [-90, 128], [-106, 160], [-114, 214], [-122, 760], [126, 760], [118, 226], [104, 172], [78, 142], [50, 128], [30, 121], [26, 125], [6, 118], [-14, 110]];
const HOOD = spline([[-26, 104], [-46, 90], [-76, 96], [-98, 122], [-104, 150], [-80, 146], [-52, 132], [-34, 118]], 4);
const WINDOW = spline([[80, -10], [76, -40], [60, -64], [30, -80], [-6, -85], [-40, -79], [-68, -59], [-84, -28], [-87, 4], [-79, 28], [-65, 46], [-44, 55], [-20, 57], [4, 55], [24, 48], [44, 36], [56, 24], [66, 12], [78, 2]], 4);
// brain (lateral view, front to the right); drawn 7 % larger than first sketched so it fills the cranium window
const BS = (pts) => pts.map(([x, y]) => [-2 + (x + 2) * 1.07, -12 + (y + 12) * 1.07]);
const BRAIN = BS(spline([[74, -14], [70, -38], [56, -58], [34, -70], [8, -74], [-20, -70], [-46, -58], [-66, -38], [-76, -12], [-72, 6], [-60, 18], [-40, 27], [-14, 36], [12, 40], [34, 35], [47, 25], [46, 15], [56, 9], [68, 3]], 5));
const CEREB = { x: -52, y: 36, rx: 26, ry: 14 };
export const FFA = { x: -13, y: 35.5, rx: 21, ry: 7.8, rot: -0.17 };
export const EYE = { x: 70, y: 25 };
const PATH = [[66, 25], [44, 21], [16, 16], [-16, 8], [-48, 2], [-73, -3], [-72, 13], [-54, 24], [-33, 33], [-13, 36]];
const PATH_S = (() => { const cum = [0]; for (let i = 1; i < PATH.length; i++) cum.push(cum[i - 1] + Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1])); return cum; })();
export function pathAt(u) { const L = PATH_S[PATH_S.length - 1], s = clamp01(u) * L; let i = 1; while (i < PATH.length - 1 && PATH_S[i] < s) i++; const k = (s - PATH_S[i - 1]) / (PATH_S[i] - PATH_S[i - 1]); return [lerp(PATH[i - 1][0], PATH[i][0], k), lerp(PATH[i - 1][1], PATH[i][1], k)]; }

const PAL = {
  skin: ["#1E1220", "#2E1A2C", "#43263A", "#6A3A44", "#9C5648", "#C8784E", "#EBA064"],
  hair: ["#120A16", "#1E1224", "#2C1C36", "#4A3E70", "#6E6AA8"],
  hood: ["#130E22", "#1D1534", "#2A1F45", "#3B2C5C", "#5C5490"],
  cat: ["#0A0610", "#16101E", "#2A2238"], catIn: "#7A3E62",
  glass: "#14112C", glass2: "#1B1738", rimX: "#8FB0F0", scan: "#D6E4FF",
  brain: ["#4A2C58", "#6C4478", "#8E5E96", "#B07EB2", "#CC9CCB", "#E4BEE0", "#F5DCF0"], sulcus: "#5A3466",
  cereb: ["#3E2650", "#5C3C6E", "#7C5690", "#9C74AE"],
  ffa: ["#C55A1C", "#F08A3C", "#F7C24E", "#FFE38E", "#FFF6CE"],
};

// ---------------------------------------------------------------- per-frame region mask
const MASK = new Uint8Array(GW * GH), WIN = new Uint8Array(GW * GH);
function fill(buf, pts, id, bb) {
  let minY = Infinity, maxY = -Infinity; for (const [, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const ya = Math.max(0, Math.floor(minY)), yb = Math.min(GH - 1, Math.ceil(maxY));
  for (let y = ya; y <= yb; y++) { const yc = y + 0.5, xs = [];
    for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) xs.push(ax + ((yc - ay) / (by - ay)) * (bx - ax)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(GW, Math.round(xs[k + 1])); x++) { buf[y * GW + x] = id; bb.x0 = Math.min(bb.x0, x); bb.x1 = Math.max(bb.x1, x); bb.y0 = Math.min(bb.y0, y); bb.y1 = Math.max(bb.y1, y); } }
}
const inPoly = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
const BRAIN_BB = (() => { let a = [1e9, 1e9, -1e9, -1e9]; for (const [x, y] of BRAIN) a = [Math.min(a[0], x), Math.min(a[1], y), Math.max(a[2], x), Math.max(a[3], y)]; return a; })();
// cache of brain pixels per (z, sub-pixel offset): brain is re-sampled only when the zoom changes noticeably
const sulcusField = (x, y) => Math.sin(x * 0.19 + 2.1 * Math.sin(y * 0.13 + 0.7) + 0.6 * Math.sin(y * 0.31)) + Math.sin(y * 0.23 + 1.9 * Math.sin(x * 0.11 + 1.3) + 0.5 * Math.cos(x * 0.29));
const segDist = (px, py, ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay, k = clamp01(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - ax - dx * k, py - ay - dy * k); };
const SYLVIAN = BS(spline([[47, 17], [30, 10], [10, 4], [-12, -2], [-22, -8]], 4, false)), CENTRAL = BS(spline([[-2, -73], [4, -50], [14, -32], [22, -12]], 4, false));
const FOLD1 = spline([[70, 160], [58, 210], [52, 270], [56, 340]], 4, false), FOLD2 = spline([[-58, 150], [-40, 205], [-34, 260], [-40, 330]], 4, false);
const polyDist = (P, x, y) => { let d = 1e9; for (let i = 1; i < P.length; i++) d = Math.min(d, segDist(x, y, P[i - 1][0], P[i - 1][1], P[i][0], P[i][1])); return d; };

/**
 * st: { xray: scan progress 0..1, pulse: 0..1 (−1 none), trail: 0..1 fade, mark: 0..1, light: 0..1.4, glow (pumpkin light),
 *       look: [sx, sy] screen point the eye looks at, blink 0..1, smile 0..1, breath }
 * Returns screen anchors { eye, ffa, head, z }.
 */
export function drawKid(c, cam, t, st) {
  const L = layer(cam, KID.p), z = L.z, ox = L.X(KID.x), oy = L.Y(KID.y + st.breath);
  const S = (pts) => pts.map(([x, y]) => [ox + x * z, oy + y * z]);
  const hx = (x) => (x + 0.5 - ox) / z, hy = (y) => (y + 0.5 - oy) / z;
  if (ox + 130 * z < 0) return { eye: [ox + EYE.x * z, oy + EYE.y * z], ffa: [ox + FFA.x * z, oy + FFA.y * z], head: [ox, oy], z, visible: false };
  MASK.fill(0); WIN.fill(0);
  const bb = { x0: GW, x1: -1, y0: GH, y1: -1 };
  fill(MASK, S(HEAD), 2, bb); fill(MASK, S(HAIR), 3, bb); fill(MASK, S(EAR), 4, bb); fill(MASK, S(EAR_IN), 8, bb);
  fill(MASK, S(CAT_FAR), 5, bb); fill(MASK, S(CAT_NEAR), 6, bb); fill(MASK, S(CAT_IN), 7, bb);
  fill(MASK, S(HOOD), 9, bb); fill(MASK, S(HOODIE), 1, bb);
  const wb = { x0: GW, x1: -1, y0: GH, y1: -1 }; fill(WIN, S(WINDOW), 1, wb);
  if (bb.x1 < 0) return { eye: [0, 0], ffa: [0, 0], head: [ox, oy], z, visible: false };
  const X0 = bb.x0, X1 = bb.x1, Y0 = bb.y0, Y1 = bb.y1, BW = X1 - X0 + 1;
  // distances to the outside: right (warm light from the pumpkin), left and top (moon rim)
  const dR = new Float32Array(BW * (Y1 - Y0 + 1)), dL = new Float32Array(dR.length), dT = new Float32Array(dR.length);
  for (let y = Y0; y <= Y1; y++) { let last = X1 + 2; for (let x = X1; x >= X0; x--) { const m = MASK[y * GW + x]; if (!m) last = x; dR[(y - Y0) * BW + x - X0] = last - x; }
    last = X0 - 2; for (let x = X0; x <= X1; x++) { const m = MASK[y * GW + x]; if (!m) last = x; dL[(y - Y0) * BW + x - X0] = x - last; } }
  for (let x = X0; x <= X1; x++) { let last = Y0 - 2; for (let y = Y0; y <= Y1; y++) { if (!MASK[y * GW + x]) last = y; dT[(y - Y0) * BW + x - X0] = y - last; } }
  const g = st.glow, scanY = lerp(-104, 66, st.xray), xrayOn = st.xray > 0;
  const lightK = st.light, markK = st.mark;
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) {
    const i = y * GW + x, m = MASK[i]; if (!m) continue;
    const j = (y - Y0) * BW + x - X0, r = dR[j] / z, l = dL[j] / z, tp = dT[j] / z, lx = hx(x), ly = hy(y);
    // X-ray window: cranium above the scan line
    const inWin = xrayOn && WIN[i] && (m === 2 || m === 3 || m === 4 || m === 8);
    if (inWin && clamp01(1 - (ly - scanY) / 6) > bayer(x, y)) { xrayPixel(c, x, y, lx, ly, m, z, t, st); continue; }
    let col;
    const warm = g * Math.exp(-r / 7) * (ly < 140 ? 1 : 0.6), rim = Math.max(Math.exp(-l / 1.3), Math.exp(-tp / 1.5));
    if (m === 1 || m === 9) {
      // hoodie: two cloth creases from the shoulder (dark line, lit lip beside it), darker toward the bottom
      const c1 = polyDist(FOLD1, lx, ly), c2 = polyDist(FOLD2, lx, ly), crease = (c1 < 1.6 || c2 < 1.6) ? -0.16 : (c1 < 4.5 || c2 < 4.5) && lx > -200 ? 0.06 : 0;
      const v = 0.42 + crease - (m === 9 ? 0.1 : 0) - 0.2 * clamp01((ly - 170) / 260) + 0.05 * clamp01((lx - 20) / 80);
      col = band(PAL.hood, v + warm * 0.4, x, y, 0.4); if (rim > 0.5) col = PAL.hood[4]; else if (rim > 0.25 && bayer(x, y) > 0.5) col = PAL.hood[3]; }
    else if (m === 2 || m === 4 || m === 8) { const v = 0.22 + (m === 8 ? -0.1 : 0) + warm * 0.75 + 0.05 * Math.sin(ly * 0.05); col = band(PAL.skin, v, x, y, 0.45); if (rim > 0.55 && warm < 0.4) col = "#7E7CB8"; }
    else if (m === 3) { const strand = 0.035 * Math.sin(lx * 0.22 + ly * 0.08) + 0.12 * clamp01(1 - Math.hypot(lx + 20, ly + 70) / 40), v = 0.3 + strand + warm * 0.25; col = band(PAL.hair, v, x, y, 0.45); if (rim > 0.5) col = PAL.hair[4]; else if (rim > 0.22 && bayer(x, y) > 0.45) col = PAL.hair[3]; }
    else if (m === 5 || m === 6) { col = ramp(PAL.cat, (m === 6 ? 0.45 : 0.15) + (rim > 0.5 ? 0.6 : 0), x, y); }
    else if (m === 7) col = PAL.catIn;
    // dark outline toward the outside on the lower/right sides
    if (dR[j] <= 1 && warm < 0.25) col = "#0B0812";
    c.px(x, y, col);
  }
  // face details (opaque part): eyebrow, eye with the pumpkin's glint, lip line / smile, collar shadow, drawstrings
  const P = (x, y) => [R(ox + x * z), R(oy + y * z)];
  const ln = (a, b, col) => { const [x0, y0] = P(...a), [x1, y1] = P(...b); c.line(x0, y0, x1, y1, col); if (z > 1.6) c.line(x0, y0 + 1, x1, y1 + 1, col); };
  { const b = (st.brow || 0) * 2.6; ln([62, 12 - b * 0.7], [79, 9 - b], "#24141E"); }   // brow lifts a little when the face "clicks"
  { const bl = st.blink, ex = EYE.x, ey = EYE.y, rx = 6.5, ry = 4.2 * (1 - bl);
    const [lkx, lky] = st.look, dx = lkx - (ox + ex * z), dy = lky - (oy + ey * z), dl = Math.hypot(dx, dy) || 1;
    for (let y = Math.floor(oy + (ey - 5) * z); y <= Math.ceil(oy + (ey + 5) * z); y++) for (let x = Math.floor(ox + (ex - 7) * z); x <= Math.ceil(ox + (ex + 8) * z); x++) {
      const u = hx(x) - ex, v = hy(y) - ey, w = rx * (u > 0 ? 1 : 0.85);
      if ((u / w) ** 2 + (v / Math.max(0.6, ry)) ** 2 > 1) continue;
      const iu = u - 2.2 - 1.6 * dx / dl, iv = v - 0.8 * dy / dl, iris = iu * iu + iv * iv < 9.5;
      c.px(x, y, ry < 1.2 ? "#1A0E16" : iris ? (iu * iu + iv * iv < 3 ? "#0A0610" : "#3A2230") : g > 0.3 ? "#E8C6A8" : "#A898B8");
    }
    if (ry > 1.5) { const [gx, gy] = P(ex + 2.4 + 1.2 * dx / dl, ey - 0.9); c.px(gx, gy, "#FFE38E"); if (z > 1.5) c.px(gx + 1, gy, "#FFE38E"); }
    ln([ex - 7, ey - 1 - 4.6 * (1 - bl) * 0.9], [ex + 6, ey - 4.4 * (1 - bl) - 0.5], "#160C14");   // upper lid line
    ln([ex + 5, ey - 4.2], [ex + 8, ey - 6.2], "#160C14");                                         // a lash
  }
  { const s = st.smile; ln([84, 58.5], [79 - 1.5 * s, 58.5 - 2.6 * s], "#4A1E22"); }
  ln([30, 121], [-14, 110], "#0E0A18");
  for (const [a, b] of [[[34, 128], [37, 178]], [[46, 131], [52, 174]]]) { ln(a, b, "#C9B8E0"); const [qx, qy] = P(...b); c.rect(qx - 1, qy, Math.max(2, R(2 * z)), Math.max(3, R(4 * z)), "#F08A3C"); }
  // the X-ray window frame (dashed cyan) once scanning has started; the scan beam itself
  if (xrayOn) {
    for (let k = 0; k < WINDOW.length; k++) { const [ax, ay] = WINDOW[k], [bx2, by2] = WINDOW[(k + 1) % WINDOW.length];
      if (ay > scanY) continue; const [x0, y0] = P(ax, ay), [x1, y1] = P(bx2, by2); if (MASK[y0 * GW + x0] === 2 || MASK[y0 * GW + x0] === 3) c.line(x0, y0, x1, y1, (k % 2) ? "#5A6AB0" : PAL.rimX); }
    if (st.xray < 1) { const yS = R(oy + scanY * z), a = Math.sin(Math.PI * clamp01(st.xray * 1.05)); for (let x = R(ox - 96 * z); x <= R(ox + 98 * z); x++) { if (a > bayer(x, yS)) c.px(x, yS, PAL.scan); if (a * 0.6 > bayer(x, yS - 1)) c.px(x, yS - 1, PAL.rimX); } }
  }
  return { eye: [ox + EYE.x * z, oy + EYE.y * z], ffa: [ox + FFA.x * z, oy + FFA.y * z], head: [ox, oy], z, visible: true, S, P };
}

function xrayPixel(c, x, y, lx, ly, m, z, t, st) {
  // translucent glass over the background, a faint scan texture
  const bg = c.get(x, y), k = (y % 3 === 0) ? 0.66 : 0.76;
  let col = mix(bg, PAL.glass, k);
  // the head silhouette rim inside the window
  const inBrain = lx > BRAIN_BB[0] - 1 && lx < BRAIN_BB[2] + 1 && ly > BRAIN_BB[1] - 1 && ly < BRAIN_BB[3] + 1 && inPoly(BRAIN, lx, ly);
  if (inBrain) col = brainColor(lx, ly, x, y, z, t, st);
  else {
    const ce = ((lx - CEREB.x) / CEREB.rx) ** 2 + ((ly - CEREB.y) / CEREB.ry) ** 2;
    if (ce <= 1) { const stripe = Math.sin((ly - CEREB.y) * 1.25 + (lx - CEREB.x) * 0.12) > 0.55; col = ramp(PAL.cereb, 0.55 - 0.3 * (ly - CEREB.y) / CEREB.ry - (stripe ? 0.3 : 0), x, y); }
    else if (Math.abs(lx + 12 + (ly - 40) * 0.12) < 6 && ly > 30) col = ramp(PAL.cereb, 0.5 - Math.abs(lx + 12 + (ly - 40) * 0.12) / 8, x, y);   // brain stem
    else { // skull: a bone shell just inside the window edge (x-ray bright), thinner toward the jaw
      const d = polyDist(WINDOW, lx, ly), th = ly < 30 ? 3.2 : 2.2;
      if (d < th) col = d < 1.1 ? "#C9C2E6" : (d < th - 0.6 || bayer(x, y) > 0.5) ? "#9A92C6" : col; }
  }
  // the signal path (dim) and the pulse, the face area outline
  c.px(x, y, col);
}

function brainColor(lx, ly, x, y, z, t, st) {
  // volume: lit from the upper front; darker toward the bottom and the back
  const nx = (lx - 0) / 76, ny = (ly + 18) / 58, d = Math.min(1, nx * nx + ny * ny);
  let v = 0.62 + 0.18 * (nx * 0.3 - ny * 0.7) - 0.25 * d * d;
  // sulci: iso-lines of a smooth field, plus the Sylvian fissure and the central sulcus
  const f = sulcusField(lx, ly), sul = Math.abs(f) < 0.16 + 0.04 * Math.sin(lx * 0.5);
  const syl = polyDist(SYLVIAN, lx, ly) < 1.4, cen = polyDist(CENTRAL, lx, ly) < 1.1;
  let col = band(PAL.brain, v + (Math.abs(f) > 0.5 && Math.abs(f) < 0.8 ? 0.06 : 0), x, y, 0.45);
  if (sul) col = v > 0.55 ? PAL.brain[2] : PAL.sulcus;
  if (syl || cen) col = PAL.sulcus;
  // the face area: outlined (mark) then lit (light) — glows from inside, brightest along the underside
  const fx = lx - FFA.x, fy = ly - FFA.y, cr = Math.cos(FFA.rot), sr = Math.sin(FFA.rot), u = (fx * cr + fy * sr) / FFA.rx, w = (-fx * sr + fy * cr) / FFA.ry, e = u * u + w * w;
  if (e < 1 && (st.light > 0 || st.mark > 0)) {
    const heat = st.light * (1.05 - 0.6 * e) + (st.mark > 0 ? 0.12 * st.mark : 0) + 0.06 * Math.sin(t * 9) * st.light;
    if (heat > 0.05) col = heat > bayer(x, y) * 0.25 + 0.02 ? ramp(PAL.ffa, heat, x, y) : col;
  }
  // brain glow near the lit area
  if (st.light > 0 && e >= 1 && e < 7) { const k = st.light * 0.6 * (1 - (e - 1) / 6); const p = hex(col), q = hex("#F08A3C"); if (k > bayer(x, y)) col = [Math.round(p[0] + (q[0] - p[0]) * 0.45), Math.round(p[1] + (q[1] - p[1]) * 0.45), Math.round(p[2] + (q[2] - p[2]) * 0.45)]; }
  return col;
}

/** Overlays drawn after the kid: the signal path + pulse (in the brain), the face-area outline and glow halo. */
export function drawKidOverlays(c, cam, t, st, A) {
  if (!A.visible) return;
  const { S, z } = A, ox = A.head[0], oy = A.head[1];
  const P = (x, y) => [ox + x * z, oy + y * z];
  if (st.pulse >= 0 || st.trail > 0) {
    // dotted route, revealed up to the pulse; the trail fades after arrival
    const n = 120;
    for (let k = 0; k <= n; k++) { const u = k / n; if (u > Math.max(0, st.pulse)) break;
      const age = Math.max(0, st.pulse) - u, a = (st.pulse < 1 ? Math.max(0.25, 1 - age * 2.2) : 0.6) * (st.pulse >= 1 ? st.trail : 1);
      const [px, py] = P(...pathAt(u)), X = R(px), Y = R(py); if (k % 2 === 0 && a > bayer(X, Y)) { const col = age < 0.15 ? "#FFE38E" : "#F7B04A"; c.px(X, Y, col); c.px(X + 1, Y, col); c.px(X, Y + 1, "#C55A1C"); } }
    if (st.pulse >= 0 && st.pulse < 1) { const [px, py] = P(...pathAt(st.pulse)), rr = 3.6 * z;
      for (let y = Math.floor(py - rr * 2); y <= Math.ceil(py + rr * 2); y++) for (let x = Math.floor(px - rr * 2); x <= Math.ceil(px + rr * 2); x++) { const d = Math.hypot(x + 0.5 - px, y + 0.5 - py) / rr; if (d < 1) c.px(x, y, d < 0.5 ? "#FFF6CE" : "#FFE38E"); else if (d < 2) tintPx(c, x, y, "#F7C24E", 0.6 * (2 - d), 3); } }
  }
  // outline of the face area: marching orange dashes around a slightly larger ellipse
  if (st.mark > 0) {
    const n = 64, cr = Math.cos(FFA.rot), sr = Math.sin(FFA.rot), grow = 1 + 0.5 * (1 - easeOut(st.mark));
    for (let k = 0; k < n; k++) { const a = (k / n) * TAU, ux = Math.cos(a) * (FFA.rx + 4) * grow, uy = Math.sin(a) * (FFA.ry + 4) * grow;
      const [px, py] = P(FFA.x + ux * cr - uy * sr, FFA.y + ux * sr + uy * cr), X = R(px), Y = R(py);
      if (((k + Math.floor(t * 10)) % 4) < 2 && st.mark > bayer(X, Y)) { c.px(X, Y, "#F4CA50"); if (z > 1.4) c.px(X + 1, Y, "#F4CA50"); } }
  }
  // the moment it lights up: one bright ring wave rolls out of the face area
  if (st.ring > 0 && st.ring < 1) { const [cx, cy] = P(FFA.x, FFA.y), k = st.ring, rr = (12 + 62 * easeOut(k)) * z, aa = Math.pow(1 - k, 1.2);
    for (let q = 0; q < 220; q++) { const an = (q / 220) * TAU, X = R(cx + Math.cos(an) * rr * 1.35), Y = R(cy + Math.sin(an) * rr); if (aa > bayer(X, Y)) { c.px(X, Y, "#FFE38E"); if (aa > 0.5) c.px(X, Y + 1, "#F7B04A"); } } }
  // lit: halo and rays around the face area
  if (st.light > 0.02) {
    const [cx, cy] = P(FFA.x, FFA.y), rad = 46 * z * Math.min(1.2, st.light);
    for (let y = Math.floor(cy - rad); y <= Math.ceil(cy + rad); y++) for (let x = Math.floor(cx - rad); x <= Math.ceil(cx + rad); x++) { const d = Math.hypot((x + 0.5 - cx) / 1.4, y + 0.5 - cy) / rad; if (d < 1 && d > 0.3) tintPx(c, x, y, "#F7B04A", 0.38 * Math.min(1, st.light) * (1 - d) * (1 - d), 4); }
    const pulse = 0.5 + 0.5 * Math.sin(t * 6.5);
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU + 0.2, r0 = (22 + 3 * pulse) * z, r1 = r0 + (8 + 10 * Math.min(1, st.light)) * z;
      for (let s = 0; s <= 1; s += 0.1) { const r = lerp(r0, r1, s), X = R(cx + Math.cos(a) * r * 1.35), Y = R(cy + Math.sin(a) * r); if (Math.min(1, st.light) * (1 - s) * (0.6 + 0.4 * pulse) > bayer(X, Y)) c.px(X, Y, "#FFE38E"); } }
  }
}
