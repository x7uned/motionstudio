// The channel's own character (the user's pixel avatar, data/branding/xtuned-outro/v1/spritesheet.png, cells 192×208)
// standing by the campfire. The sprite is never redrawn: only lit for the night (cool moonlight grade, warm fire fill
// and rim from the fire side, a cool moon rim from behind), outlined (dark 1 px), tinted (slightly green when sick) and
// transformed (sway = row shear about the feet, the fall = rotation about the front foot). Pose / frame changes
// dissolve with an ordered dither over XF ≥ 6 frames. The ghost at the end is made from his own wave frames (row 1),
// scaled to half size and turned white/translucent, sunglasses kept dark, legs replaced by a wispy tail.
import sharp from "sharp";
import { mix, bayer, hex } from "../../../../../renderer/pixel/raster.mjs";
import { fade, sm, ease, lerp, clamp01, rnd } from "../cute.mjs";
import { POSES, XF, HERO, EV, END } from "./camp-time.mjs";
import { S, camAt, OX, OY } from "./camp-kit.mjs";

const R = Math.round;
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const CW = 192, CH = 208, SW = 1536;
const { data: SRC } = await sharp(SHEET).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

// ---------------------------------------------------------------- placement (rest-screen coordinates, see camp-kit S())
export const GY = 641;                 // the ground row his soles stand on (land line LAND = screen 640, 1 px into the grass)
export const HX = 166;                 // centre between his feet
const X0 = HX - 95, Y0 = GY - 201;     // cell top-left (feet bottom = cell row 201)
const FIRE = { x: 66, y: 618 };        // where the fire light comes from (rest-screen), for the warm side

// ---------------------------------------------------------------- night lighting, baked once per cell
const COOL = hex("#C4CCFF"), WARM = hex("#FFB25A"), FILL = hex("#FF9448"), GREEN = hex("#7ED68A"), OUT = hex("#0B0812");
const cells = new Map();
function bake(row, f) {
  const N = CW * CH, m = new Uint8Array(N), lit = new Uint8ClampedArray(N * 3), rim = new Float32Array(N), skin = new Float32Array(N);
  const A = (x, y) => (x < 0 || y < 0 || x >= CW || y >= CH ? 0 : SRC[((row * CH + y) * SW + f * CW + x) * 4 + 3]);
  let x0 = CW, y0 = CH, x1 = -1, y1 = -1;
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) if (A(x, y) >= 128) { m[y * CW + x] = 1; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const on = (x, y) => x >= 0 && y >= 0 && x < CW && y < CH && m[y * CW + x] === 1;
  // head anchor: centre of the top 64 rows; arm anchors are found per pose below
  let hs = 0, hn = 0, hr = 0; for (let y = y0; y < y0 + 64; y++) for (let x = 0; x < CW; x++) if (on(x, y)) { hs += x; hn++; if (y === y0 + 46) hr = Math.max(hr, x); }
  for (let y = 0; y < CH; y++) for (let x = 0; x < CW; x++) {
    const i = y * CW + x;
    if (!m[i]) { if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) m[i] = 2; continue; }
    const s = ((row * CH + y) * SW + f * CW + x) * 4, r = SRC[s], g = SRC[s + 1], b = SRC[s + 2];
    // moonlight grade (cool, slightly darker), then a warm fill growing toward the fire side
    let c = [r * 0.8 + 6, g * 0.8 + 8, b * 0.9 + 24];
    const left = clamp01(1 - (x - x0) / Math.max(1, x1 - x0)), low = clamp01((y - y0) / Math.max(1, y1 - y0));
    c = mixA(c, FILL, 0.07 + 0.11 * left + 0.04 * low);
    // cool rim on edges that face up / up-right (the moon behind him)
    const coolRim = !on(x + 1, y - 1) || !on(x, y - 1) ? 1 : !on(x + 2, y - 2) ? 0.5 : 0;
    c = mixA(c, COOL, 0.32 * coolRim * (1 - 0.6 * low));
    lit.set(c.map((v) => Math.max(0, Math.min(255, v))), i * 3);
    // warm rim weight on edges facing the fire (left), animated by the flicker each frame
    rim[i] = !on(x - 1, y) ? 1 : !on(x - 2, y) ? 0.6 : !on(x - 3, y) ? 0.25 : 0;
    // skin (for the sick tint): light, warm, not saturated (hair is darker / more saturated)
    const mx = Math.max(r, g, b), sat = mx ? (mx - Math.min(r, g, b)) / mx : 0;
    if (r > 150 && r >= g && g >= b && sat < 0.46 && sat > 0.12 && r - g < 75) skin[i] = clamp01((0.46 - sat) * 6);
  }
  return { m, lit, rim, skin, box: [x0, y0, x1, y1], head: [hn ? hs / hn : 96, y0 + 40], temple: [hr - 6, y0 + 44] };
}
const mixA = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
export function cell(row, f) { const key = row * 16 + f; let c = cells.get(key); if (!c) { c = bake(row, f); cells.set(key, c); } return c; }

// arm anchors (cell coords) where the mosquito sits / the bump swells: on the forearm of his screen-right arm
const ARM = {
  0: [121, 117], 1: [121, 117], 3: [121, 117], 4: [121, 117], 5: [121, 117], 6: [121, 117],
  "7:0": [117, 108], "7:2": [117, 108], "7:3": [117, 108], "7:5": [117, 108],
  "8:0": [113, 112], "8:1": [113, 112], "8:2": [113, 112], "8:3": [113, 112], "8:4": [113, 112], "8:5": [113, 112],
};
export function armAnchor(row, f) { return ARM[`${row}:${f}`] ?? (row === 0 ? ARM[f] : null) ?? [121, 117]; }
export function setArm(row, f, p) { ARM[`${row}:${f}`] = p; }

// ---------------------------------------------------------------- pose timeline → the two cells to show and the blend
function frameAt(t) {
  let i = 0; while (i < POSES.length - 1 && POSES[i + 1][0] <= t) i++;
  const [t0, row, seq, dur] = POSES[i], n = Math.floor((t - t0) / dur), idx = Math.max(0, n) % seq.length;
  const since = t - (t0 + Math.max(0, n) * dur);
  return { row, f: seq[idx], since, prev: n > 0 ? [row, seq[(n - 1) % seq.length]] : i > 0 ? lastOf(i - 1, t0) : [row, seq[0]] };
}
function lastOf(i, tEnd) { const [t0, row, seq, dur] = POSES[i], n = Math.max(0, Math.floor((tEnd - 1e-6 - t0) / dur)); return [row, seq[n % seq.length]]; }
export function poseAt(t) {
  const fr = frameAt(t), k = clamp01(fr.since / XF);
  const B = [fr.row, fr.f], A = k >= 1 ? B : fr.prev;
  return { A, B, k: A[0] === B[0] && A[1] === B[1] ? 1 : k };
}

// ---------------------------------------------------------------- transform: sway (row shear about the feet) and the fall
const SWAY_P = 1.35;
export function swayAt(t) {
  if (t < HERO.sway[0]) return 0;
  const amp = 0.03 * sm(t, HERO.sway[0], HERO.sway[0] + 1.2) + 0.05 * sm(t, EV.liked, HERO.sway[1]);
  return amp * Math.cos((2 * Math.PI * (t - HERO.fall[0])) / SWAY_P);
}
/** Rotation (rad, clockwise = head to the right), the pivot (rest-screen) and the landing bounce for time t. */
export function fallAt(t, box) {
  const pivot = [X0 + box[2] + 2, GY + 1];
  if (t < HERO.fall[0]) return { rot: 0, pivot, lift: 0 };
  const th0 = Math.atan(swayAt(HERO.fall[0] - 1e-6)), k = clamp01((t - HERO.fall[0]) / (HERO.fall[1] - HERO.fall[0]));
  const rot = k >= 1 ? Math.PI / 2 : th0 + (Math.PI / 2 - th0) * Math.pow(k, 2.1);
  const b = HERO.bounce, u = (t - b[0]) / (b[1] - b[0]);
  const lift = u > 0 && u < 1 ? (u < 0.62 ? 6 * Math.sin((Math.PI * u) / 0.62) : 2 * Math.sin((Math.PI * (u - 0.62)) / 0.38)) : 0;
  return { rot, pivot, lift };
}

/** Full state of the character at time t (rest-screen coordinates). */
export function heroState(t) {
  const p = poseAt(t), cA = cell(...p.A), cB = cell(...p.B), box = cB.box;
  const fl = fallAt(t, cell(7, 2).box);
  return { ...p, cA, cB, shear: fl.rot ? 0 : swayAt(t), ...fl, sick: sm(t, HERO.sick[0], HERO.sick[1]) * 1, box };
}

/** Forward map of a cell point (u, v) to rest-screen coordinates under the state's transform. */
export function cellToRest(st, u, v) {
  let x = X0 + u, y = Y0 + v;
  x += st.shear * (GY - y);
  if (st.rot) { const c = Math.cos(st.rot), s = Math.sin(st.rot), dx = x - st.pivot[0], dy = y - st.pivot[1]; x = st.pivot[0] + dx * c - dy * s; y = st.pivot[1] + dx * s + dy * c; }
  return [x, y - st.lift];
}

/** Screen box of the character at time t (for the overlay layout): {x, y, w, h}. */
export function HERO_POSE(t) {
  const st = heroState(t), b = st.cB.box, cam = camAt(t);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [u, v] of [[b[0], b[1]], [b[2], b[1]], [b[0], b[3]], [b[2], b[3]]]) { const [x, y] = cellToRest(st, u, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const dx = OX - (cam.cx - 270), dy = OY - (cam.cy - 480);
  return { x: R(x0 + dx), y: R(y0 + dy), w: R(x1 - x0 + 1), h: R(y1 - y0 + 1) };
}

// ---------------------------------------------------------------- drawing
/** Fire flicker 0.8..1.15 (same curve the fire module uses for its glow). */
export function flicker(t) { return 0.97 + 0.09 * Math.sin(t * 11.3) * Math.sin(t * 4.1 + 1) + 0.05 * Math.sin(t * 23.7 + 2); }

export function drawHero(c, V, t, st = heroState(t)) {
  const [ox, oy] = S(V, 0, 0);                                       // rest-screen → screen offset
  if (ox + X0 + 200 < 0 || ox + X0 - 220 > c.w) return st;
  const fk = flicker(t), sick = st.sick, d = c.d, W = c.w;
  const shade = (cl, i, X, Y) => {
    let r = cl.lit[i * 3], g = cl.lit[i * 3 + 1], b = cl.lit[i * 3 + 2];
    const w = cl.rim[i] * 0.55 * fk; if (w > 0) { r += (WARM[0] - r) * w; g += (WARM[1] - g) * w; b += (WARM[2] - b) * w; }
    const s = cl.skin[i] * sick * 0.26; if (s > 0) { r += (GREEN[0] - r) * s; g += (GREEN[1] - g) * s; b += (GREEN[2] - b) * s; }
    const p = (Y * W + X) * 3; d[p] = r; d[p + 1] = g; d[p + 2] = b;
  };
  const put = (X, Y, u, v) => {
    if (X < 0 || Y < 0 || X >= W || Y >= c.h || u < 0 || v < 0 || u >= CW || v >= CH) return;
    // crossfade: where both poses are opaque pick one by the dither; where only one is, keep it a little longer
    // (1 − k² / 1 − (1 − k)²) so the figure stays solid mid-change instead of turning see-through
    const i = v * CW + u, k = st.k, mA = k >= 1 ? 0 : st.cA.m[i], mB = st.cB.m[i], th = bayer(X, Y);
    let cl;
    if (k >= 1) cl = st.cB;
    else if (mA && mB) cl = k > th ? st.cB : st.cA;
    else if (mB) { if (1 - (1 - k) * (1 - k) <= th) return; cl = st.cB; }
    else if (mA) { if (1 - k * k <= th) return; cl = st.cA; }
    else return;
    const m = cl.m[i];
    if (!m) return;
    if (m === 2) { const p = (Y * W + X) * 3; d[p] = OUT[0]; d[p + 1] = OUT[1]; d[p + 2] = OUT[2]; return; }
    shade(cl, i, X, Y);
  };
  const bA = st.cA.box, bB = st.cB.box, bx0 = Math.min(bA[0], bB[0]) - 1, by0 = Math.min(bA[1], bB[1]) - 1, bx1 = Math.max(bA[2], bB[2]) + 1, by1 = Math.max(bA[3], bB[3]) + 1;
  if (!st.rot) {
    for (let v = by0; v <= by1; v++) {
      const Y = R(oy + Y0 + v - st.lift), off = R(st.shear * (GY - (Y0 + v)));
      for (let u = bx0; u <= bx1; u++) put(R(ox + X0 + u + off), Y, u, v);
    }
    return st;
  }
  // rotated: inverse-map every screen pixel of the rotated box (exact integer mapping once lying at 90°)
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const [u, v] of [[bx0, by0], [bx1, by0], [bx0, by1], [bx1, by1]]) { const [x, y] = cellToRest(st, u, v); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const lying = st.rot >= Math.PI / 2 - 1e-9, cs = lying ? 0 : Math.cos(st.rot), sn = lying ? 1 : Math.sin(st.rot), [px, py] = st.pivot;
  for (let Y = Math.floor(y0) - 1; Y <= Math.ceil(y1) + 1; Y++) for (let X = Math.floor(x0) - 1; X <= Math.ceil(x1) + 1; X++) {
    const dx = X + 0.5 - px, dy = Y + st.lift + 0.5 - py, sx = px + dx * cs + dy * sn, sy = py - dx * sn + dy * cs;
    put(R(ox) + X, R(oy) + Y, Math.floor(sx - X0), Math.floor(sy - Y0));
  }
  return st;
}

/** Contact shadow (and a soft longer shadow away from the fire), drawn before the character. */
export function drawHeroShadow(c, V, t, st = heroState(t)) {
  const [ox, oy] = S(V, 0, 0), lying = sm(t, HERO.fall[0] + 0.2, HERO.fall[1] + 0.05);
  const cx = ox + lerp(HX + 6, X0 + st.cB.box[2] + 100, lying), rx = lerp(34, 104, lying), cy = oy + GY + 1;
  c.tint(R(cx - rx - 2), R(cy - 6), R(rx * 2 + 4), 12, (X, Y) => { const q = ((X - cx) / rx) ** 2 + ((Y - cy) / 4.5) ** 2; return q >= 1 ? 0 : 0.55 * (1 - q); }, "#05040C", 3);
  // the fire throws his shadow to the right, long and faint (fades while he falls)
  const sa = 1 - lying;
  if (sa > 0.02) c.tint(R(ox + HX), R(cy - 3), 120, 7, (X, Y) => { const u = (X - ox - HX) / 120, q = Math.abs(Y - cy + 0.5) / (2.6 + 2 * u); return q >= 1 ? 0 : 0.34 * sa * (1 - u) * (1 - q); }, "#05040C", 3);
}

// ---------------------------------------------------------------- the little ghost (made from his wave frames, row 1)
// Half-size copies of the wave frames, flattened to ghost tones by what each pixel is: the sunglasses stay dark, the hair
// keeps its silhouette and strands in pale lavender, everything else turns white; below the T-shirt a wispy tail.
const GS = 0.56, GW = R(CW * GS), GH = R(CH * GS), WAIST = 65;
const ghostCells = await Promise.all([0, 1, 2, 3].map(async (f) => {
  const { data } = await sharp(SHEET).extract({ left: f * CW, top: CH, width: CW, height: CH }).resize(GW, GH, { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const N = GW * WAIST, m = new Uint8Array(N), col = new Uint8ClampedArray(N * 3);
  for (let y = 0; y < WAIST; y++) for (let x = 0; x < GW; x++) {
    const i = y * GW + x, s = i * 4; if (data[s + 3] < 128) continue;
    const r = data[s], g = data[s + 1], b = data[s + 2], lum = 0.3 * r + 0.59 * g + 0.11 * b;
    const glasses = y >= 27 && y <= 39 && lum < 150 && (lum < 72 || b > g + 4), hair = !glasses && y < 50 && r > g && g >= b - 6 && lum < 168;
    m[i] = 1; col.set(hex(glasses ? "#262046" : hair ? (lum < 112 ? "#A69CE6" : "#CCC4F6") : lum < 140 ? "#E4E0FC" : "#FAF8FF"), i * 3);
  }
  let wl = GW, wr = 0; for (let y = WAIST - 3; y < WAIST; y++) for (let x = 0; x < GW; x++) if (m[y * GW + x]) { wl = Math.min(wl, x); wr = Math.max(wr, x); }
  return { m, col, wl, wr };
}));

/** The ghost: its waist centred at rest-screen (x, y); a = visibility (0..1), t = time. Waves with frames 1 ↔ 2. */
export function drawGhost(c, V, t, x, y, a) {
  if (a <= 0) return;
  const [ox, oy] = S(V, 0, 0), seq = [1, 2], dur = 0.34, n = Math.floor(Math.max(0, t - HERO.ghost[0]) / dur);
  const B = ghostCells[seq[n % 2]], A = ghostCells[seq[(n + 1) % 2]], k = n === 0 ? 1 : clamp01((t - HERO.ghost[0] - n * dur) / XF);
  const gx = R(ox + x - (B.wl + B.wr) / 2), gy = R(oy + y - WAIST), L = 34, PAD = 3, MW = GW + 2 * PAD + 20, MH = WAIST + L + 2 * PAD;
  const mask = new Uint8Array(MW * MH), cols = new Array(MW * MH);
  const set = (X, Y, cc) => { const u = X - gx + PAD + 10, v = Y - gy + PAD; if (u < 0 || v < 0 || u >= MW || v >= MH) return; mask[v * MW + u] = 1; cols[v * MW + u] = cc; };
  for (let v = 0; v < WAIST; v++) for (let u = 0; u < GW; u++) {
    const X = gx + u, Y = gy + v, G = k >= 1 || k > bayer(X + 1, Y + 2) ? B : A, i = v * GW + u; if (!G.m[i]) continue;
    set(X, Y, [G.col[i * 3], G.col[i * 3 + 1], G.col[i * 3 + 2]]);
  }
  // wispy tail: tapers from the T-shirt hem to a curled tip that sways
  const w0 = (B.wr - B.wl) / 2 + 0.5, cx0 = gx + (B.wl + B.wr) / 2;
  for (let j = 0; j < L; j++) {
    const q = j / L, half = w0 * (1 - Math.pow(q, 1.15)) + (q < 0.15 ? 0 : 0.8 * Math.sin(q * 10 - t * 7)) * (1 - q), cxj = cx0 + Math.sin(t * 3.6 - q * 3.4) * 4 * q + 6 * q * q;
    for (let X = R(cxj - half); X <= R(cxj + half); X++) set(X, gy + WAIST + j, j > L * 0.55 ? hex("#E4E0FC") : hex("#F8F6FF"));
  }
  // paint: translucent body (dither), lavender rim inside the lower-right edge, soft outline + glow ring outside
  const g = fade(c, a), body = 0.9, has = (u, v) => u >= 0 && v >= 0 && u < MW && v < MH && mask[v * MW + u] === 1;
  for (let v = 0; v < MH; v++) for (let u = 0; u < MW; u++) {
    const X = gx - PAD - 10 + u, Y = gy - PAD + v;
    if (has(u, v)) {
      const tailK = v - PAD - WAIST > 0 ? (v - PAD - WAIST) / L : 0, cc = !has(u + 1, v + 1) || !has(u + 1, v) ? mix(cols[v * MW + u], "#A69EE4", 0.45) : cols[v * MW + u];
      if (body * (1 - 0.7 * tailK) > bayer(X, Y)) g.px(X, Y, cc);
    } else if (has(u - 1, v) || has(u + 1, v) || has(u, v - 1) || has(u, v + 1)) { if (0.75 > bayer(X + 2, Y)) g.px(X, Y, "#7C72CC"); }
    else if (has(u - 2, v) || has(u + 2, v) || has(u, v - 2) || has(u, v + 2)) { if (0.3 > bayer(X, Y)) g.px(X, Y, "#9C94E0"); }
  }
}
export { X0, Y0, CW, CH };
