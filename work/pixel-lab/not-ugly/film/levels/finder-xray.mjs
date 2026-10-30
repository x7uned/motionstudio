// FINDER · XRAY mode: your head in X-ray side profile (the person.mjs profile, facing right like you in the room): soft
// tissue glow, skull, jaw that talks with the narration, teeth, spine, ear canal and the glowing snail of the inner
// ear; the bobble hat as a faint outline. "air" → cyan sound rings leave the mouth and travel AROUND through the air
// (under the chin) into the ear canal; "bones" → orange wave fronts travel INSIDE the skull straight to the inner ear.
// "Bones carry the low sounds" → the orange fronts become slow and wide (bass), an EQ meter shows LOW bars high;
// "deeper" → an arrow drops: DEEPER. Every wave position is a continuous function of t (integrated phase).
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { EV, WORDS } from "../timeline.mjs";
import { part } from "./finder-face.mjs";
import { smooth as spline } from "../../../dog/shade.mjs";
import { UI, mix, bayer, fade, MAIN, clamp01, sm, ease, lerp, backOut, otext, rrect, chip } from "./finder-ui.mjs";

const R = Math.round, SW = 388, SH = 288, S = 9, O = [124, 252];
const P = (u) => [O[0] + S * u[0], O[1] + S * u[1]];
const add = (p, q) => [p[0] + q[0], p[1] + q[1]], sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
const rot = (p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]; };
const TISSUE = ["#050E1E", "#0C1E36", "#12304E", "#1A4268", "#245680", "#306A98", "#4482B0", "#5E9CC8"];
const BONE = ["#0A1A30", "#1A3E62", "#2C5C86", "#4A80AA", "#6EA4C8", "#98C8E2", "#C4E6F6", "#EEFAFF"];
export const AIR_C = UI.CY, BONE_C = UI.OR;

// ---------------------------------------------------------------- geometry (person.mjs head units: origin = top of the neck, +x forward)
const HEAD = [[-7.6, -5.0], [-8.9, -10.4], [-7.0, -15.6], [-2.2, -18.3], [3.6, -17.7], [7.4, -14.8], [8.8, -11.6], [9.1, -9.9], [12.0, -7.4], [9.6, -6.1], [9.8, -4.6], [8.9, -3.6], [8.3, -1.7], [4.2, 0.0], [-0.8, -0.4], [-5.4, -2.4]];
const JAW = new Set([10, 11, 12, 13, 14]), JAW_PIV = [0.6, -7.1];
const NECK = [[-5.8, -3.2], [-0.6, -0.8], [1.2, 0.2], [1.6, 6], [-5.9, 6]];
const CRANIUM = [[-7.6, -6.3], [-8.1, -9.6], [-7.4, -12.6], [-5.8, -15.3], [-3.2, -17.0], [-0.2, -17.5], [3.1, -16.9], [5.8, -15.2], [7.5, -12.8], [8.1, -10.6], [8.0, -9.7], [7.1, -9.4], [6.3, -9.0], [6.1, -7.9], [6.8, -7.3], [8.2, -7.1], [8.7, -6.7], [8.6, -5.5], [5.0, -5.4], [3.2, -6.0], [1.7, -6.9], [0.0, -7.0], [-1.6, -6.4], [-3.4, -5.5], [-5.6, -5.4]];
const CRAN_SHARP = new Set([10, 12, 15, 17, 18]);
const NASAL = [[7.9, -9.7], [9.4, -8.1], [8.2, -7.8]];
const ZYGO = [[1.0, -8.0], [5.9, -8.3], [6.1, -7.5], [1.0, -7.3]];
const MANDIBLE = [[0.2, -7.4], [1.0, -7.2], [1.1, -6.4], [1.7, -6.0], [2.4, -6.7], [3.0, -5.0], [8.2, -4.7], [8.6, -3.4], [8.2, -2.0], [6.0, -1.7], [2.0, -2.2], [0.5, -2.6], [-0.1, -3.7], [-0.1, -6.3]];
const MAND_SHARP = new Set([4, 6, 8, 11]);
const ORBIT = [5.3, -10.1, 1.6, 1.45];
const EAR = [-1.4, -8.0], CANAL = [[-1.0, -8.0], [0.3, -8.3]], COCH = [0.85, -8.9];
const CROWN = [[-9.9, -11.8], [-9.8, -16.6], [-6.8, -21.8], [-1.0, -24.2], [4.8, -23.4], [8.5, -20.6], [9.7, -17.2], [10.1, -18.0], [10.5, -14.3], [-10.5, -8.6], [-10.8, -12.6]];
const POMC = [-1.8, -26.2];

// ---------------------------------------------------------------- talking jaw (follows the narration's words during the voice part)
const TALK = WORDS.filter((w) => w.start > EV.voice1 - 0.4 && w.end < EV.deeperEnd + 0.1);
export function jawAt(t) { let v = 0; for (const w of TALK) { if (t < w.start - 0.02 || t > w.end + 0.06) continue; const k = clamp01((t - w.start + 0.02) / (w.end - w.start + 0.08)); v = Math.max(v, Math.sin(Math.PI * k)); } return 0.1 * v; }

// ---------------------------------------------------------------- the two sound paths
export const MOUTH = P([9.9, -5.0]), CANAL_IN = P(CANAL[0]), COCHLEA = P(COCH), BONE_SRC = P([6.4, -5.0]);
const AIR_PTS = [MOUTH, [244, 210], [262, 232], [254, 258], [222, 271], [180, 268], [148, 254], [130, 232], [119, 206], CANAL_IN];
// open polyline (spline() closes the loop; trim the closing segment)
const AIRL = (() => { const pts = []; const raw = spline(AIR_PTS, new Set(), 8); const n = AIR_PTS.length; for (let i = 0; i < (n - 1) * 8; i++) pts.push(raw[i]); pts.push(AIR_PTS[n - 1]); const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, L: cum[cum.length - 1] }; })();
function airAt(s) { const { pts, cum } = AIRL; let i = 1; while (i < cum.length - 1 && cum[i] < s) i++; const k = (s - cum[i - 1]) / (cum[i] - cum[i - 1] || 1), a = pts[i - 1], b = pts[i]; const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return { p: [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k], tg: [(b[0] - a[0]) / d, (b[1] - a[1]) / d] }; }

export const AIR_ON = [EV.air1 - 0.08, EV.air1 + 0.25], BONE_ON = [EV.bones1 - 0.08, EV.bones1 + 0.25];
export const BASS = [EV.bones2 - 0.05, EV.low + 0.25], EQ_ON = [EV.bones2 - 0.15, EV.bones2 + 0.2], EQ_LOW = [EV.low - 0.1, EV.sounds + 0.2];
export const DEEP = [EV.deeper - 0.12, EV.deeper + 0.4];
export const AIR_F = 2.8, AIR_LAMBDA = 36;
export const AIR_TRAVEL = () => AIRL.L / (AIR_F * AIR_LAMBDA);
/** integrated bone-wave phase: 3.4 Hz → 1.4 Hz across BASS (smoothstep, integrated analytically) */
function bonePhase(t) {
  const f0 = 3.4, f1 = 1.4, a = BASS[0], b = BASS[1], T0 = BONE_ON[0];
  const intS = (x) => x * x * x - (x * x * x * x) / 2;               // ∫ smoothstep
  const xs = clamp01((t - a) / (b - a)), bassInt = t <= a ? 0 : t <= b ? (b - a) * intS(xs) : (b - a) * 0.5 + (t - b);
  return f0 * (t - T0) + (f1 - f0) * bassInt;
}
export const AIR_RINGS = (t) => { const out = []; const phi = AIR_F * (t - AIR_ON[0]); for (let n = 0; n <= Math.floor(phi); n++) { const s = (phi - n) * AIR_LAMBDA; if (s <= AIRL.L) out.push(s / AIRL.L); } return out; };

// ---------------------------------------------------------------- backdrop: an X-ray light box (cached)
let BG = null;
function bg() {
  if (BG) return BG; const b = new Canvas(SW, SH, "#071428");
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const d = Math.hypot((x - 150) / 260, (y - 150) / 220), v = (1 - Math.min(1, d)) * 3, lo = Math.floor(v); b.px(x, y, mix("#050C1C", "#0E2444", (v - lo > bayer(x, y) ? lo + 1 : lo) / 3)); }
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if ((x % 24 === 12 || y % 24 === 12) && ((x + y) & 1)) b.px(x, y, mix(b.get(x, y), "#2A5A84", 0.35));
  return (BG = b);
}

// ---------------------------------------------------------------- drawing
function drawHead(g, t) {
  const ja = jawAt(t);
  const jr = (p) => add(rot(sub(p, JAW_PIV), ja), JAW_PIV);
  // the hat: faint purple outline (it does not block X-rays)
  { const pts = spline(CROWN, new Set([6, 7, 8, 9, 10]), 6).map(P), hv = fade(g, 0.6); for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; hv.line(R(a[0]), R(a[1]), R(b[0]), R(b[1]), "#6E4FB0", [2, 2]); }
    const pc = P(POMC); hv.ering(R(pc[0]), R(pc[1]), 33, 33, "#8D59DA"); }
  // neck and head soft tissue (bright rim, dark core)
  part(g, [spline(NECK, new Set([0, 1, 2, 3, 4]), 2).map(P)], { ramp: TISSUE, base: 4.9, gain: -2.4, slope: 0, thick: 16, rimLit: 0, rimShade: 0, outline: "#3A6E98" });
  const head = HEAD.map((p, i) => (JAW.has(i) ? add(rot(sub(p, [-1.0, -7.4]), ja * (i === 14 ? 0.4 : 1)), [-1.0, -7.4]) : p));
  part(g, [spline(head, new Set([8]), 6).map(P)], { ramp: TISSUE, base: 5.6, gain: -3.0, slope: 0, thick: 18, rimLit: 0, rimShade: 0, outline: "#6AA8D0" });
  // spine
  for (let k = 0; k < 6; k++) { const v0 = -5.0 + k * 1.75; part(g, [[[-4.7, v0], [-2.1, v0 + 0.1], [-2.0, v0 + 1.2], [-4.8, v0 + 1.25]].map(P)], { ramp: BONE, base: 6.2, gain: -2.6, slope: 0, thick: 5, rimLit: 0, rimShade: 0, outline: "#BCE6F6" }); }
  // skull, cheekbone, nasal bone, orbit hole, mandible (talks), teeth
  part(g, [spline(CRANIUM, CRAN_SHARP, 5).map(P)], { ramp: BONE, base: 6.7, gain: -3.6, slope: 0, thick: 9, rimLit: 0, rimShade: 0, outline: "#EEFAFF" });
  part(g, [ZYGO.map(P)], { ramp: BONE, base: 6.4, gain: -1.4, slope: 0, thick: 3, rimLit: 0, rimShade: 0, outline: "#C4E6F6" });
  part(g, [NASAL.map(P)], { ramp: BONE, base: 6.0, gain: -1.0, slope: 0, thick: 3, rimLit: 0, rimShade: 0, outline: "#C4E6F6" });
  { const [ox, oy, rx, ry] = ORBIT, c = P([ox, oy]); for (let y = -R(ry * S) - 1; y <= R(ry * S) + 1; y++) for (let x = -R(rx * S) - 1; x <= R(rx * S) + 1; x++) { const d = (x / (rx * S)) ** 2 + (y / (ry * S)) ** 2; if (d <= 1) g.px(R(c[0] + x), R(c[1] + y), d > 0.78 ? "#C4E6F6" : d > 0.6 ? "#4A80AA" : "#0F2440"); } }
  part(g, [spline(MANDIBLE.map(jr), MAND_SHARP, 5).map(P)], { ramp: BONE, base: 6.6, gain: -3.2, slope: 0, thick: 7, rimLit: 0, rimShade: 0, outline: "#EEFAFF" });
  for (let i = 0; i < 5; i++) { const u = 4.7 + i * 0.78; for (const [v0, v1, jaw] of [[-5.55, -4.95, false], [-4.95, -4.4, true]]) { const q = [[u, v0], [u + 0.62, v0], [u + 0.62, v1], [u, v1]].map((p) => P(jaw ? jr(p) : p)); g.poly(q, "#EEFAFF"); g.line(R(q[0][0]), R(q[0][1]), R(q[3][0]), R(q[3][1]), "#6EA4C8"); } }
  // ear (pinna, soft tissue over the skull): a translucent ring
  { const c = P(EAR), gv = fade(g, 0.75); for (let y = -24; y <= 24; y++) for (let x = -18; x <= 18; x++) { const d = (x / 15.5) ** 2 + (y / 21) ** 2; if (d <= 1 && d > 0.5 && !(x > 4 && Math.abs(y) < 6)) gv.px(R(c[0] + x), R(c[1] + y), d > 0.84 ? "#8EC4E4" : "#376A96"); } }
  // ear canal → eardrum → the inner ear (snail + three little loops), glowing
  { const a = P(CANAL[0]), b = P(CANAL[1]); for (let k = 0; k <= 12; k++) { const x = lerp(a[0], b[0], k / 12), y = lerp(a[1], b[1], k / 12); g.rect(R(x), R(y) - 3, 1, 1, "#98C8E2"); g.rect(R(x), R(y) - 2, 1, 4, "#12304E"); g.rect(R(x), R(y) + 2, 1, 1, "#98C8E2"); } g.rect(R(b[0]), R(b[1]) - 3, 1, 7, "#C4E6F6"); }
}
function inner(g, t, glowK) {
  const c = COCHLEA, gk = 0.35 + 0.65 * glowK, col = mix("#FFF1A8", "#FFB04A", clamp01(glowK));
  // halo
  for (let y = -22; y <= 22; y++) for (let x = -22; x <= 22; x++) { const d = Math.hypot(x, y) / 22; if (d < 1 && (1 - d) * gk * 0.9 > bayer(R(c[0] + x), R(c[1] + y))) g.px(R(c[0] + x), R(c[1] + y), mix(g.get(R(c[0] + x), R(c[1] + y)), col, 0.45)); }
  // snail: an Archimedean spiral (2.3 turns) and three semicircular loops above
  for (let i = 0; i <= 200; i++) { const a = (i / 200) * Math.PI * 4.6, r = 1.2 + (i / 200) * 9.5, x = R(c[0] + Math.cos(a) * r), y = R(c[1] + Math.sin(a) * r * 0.9); g.px(x, y, col); g.px(x + 1, y, mix(col, "#FFFFFF", 0.4)); }
  for (const [dx, dy, r] of [[-8, -13, 5], [-1, -16, 5], [6, -12, 4]]) { g.ering(R(c[0] + dx), R(c[1] + dy), r, r, mix(col, "#98C8E2", 0.3)); g.ering(R(c[0] + dx), R(c[1] + dy), r - 1, r - 1, mix(col, "#0B0812", 0.4)); }
}
function airRings(g, t) {
  const a0 = sm(t, AIR_ON[0], AIR_ON[1]); if (a0 <= 0) return 0;
  // faint dotted guide
  { const gv = fade(g, a0 * 0.8); for (let s = 0; s < AIRL.L; s += 5) { const { p } = airAt(s); gv.px(R(p[0]), R(p[1]), "#3FA6C0"); gv.px(R(p[0]) + 1, R(p[1]), "#3FA6C0"); } }
  let hit = 0;
  for (const k of AIR_RINGS(t)) {
    const s = k * AIRL.L, { p, tg } = airAt(s), a = a0 * sm(k, 0, 0.08) * (1 - sm(k, 0.9, 1)), gv = fade(g, a), ang = Math.atan2(tg[1], tg[0]);
    if (k > 0.86) hit = Math.max(hit, Math.sin(Math.PI * clamp01((k - 0.86) / 0.14)));
    for (const [rr, col] of [[14, AIR_C], [8, "#BFF6FF"]]) {
      const cx = p[0] - tg[0] * rr * 0.8, cy = p[1] - tg[1] * rr * 0.8;
      for (let i = -16; i <= 16; i++) { const aa = ang + (i / 16) * 0.95, cs = Math.cos(aa), sn = Math.sin(aa); for (const dr of [-1, 0, 1]) gv.px(R(cx + cs * (rr + dr)), R(cy + sn * (rr + dr)), dr === 1 ? "#0B2A3A" : col); }
    }
  }
  return hit;
}
function boneWaves(g, t) {
  const a0 = sm(t, BONE_ON[0], BONE_ON[1]); if (a0 <= 0) return 0;
  const bass = sm(t, BASS[0], BASS[1]), phi = bonePhase(t), lam = lerp(17, 30, bass), src = BONE_SRC, dst = COCHLEA;
  const D = Math.hypot(dst[0] - src[0], dst[1] - src[1]), dir = Math.atan2(dst[1] - src[1], dst[0] - src[0]), span = lerp(0.5, 0.8, bass), th = lerp(1.6, 4.6, bass);
  // straight guide (dashed)
  { const gv = fade(g, a0 * 0.5); for (let k = 0; k <= D; k += 4) gv.px(R(src[0] + Math.cos(dir) * k), R(src[1] + Math.sin(dir) * k), "#A85A20"); }
  let hit = 0;
  for (let n = Math.floor(phi); n >= 0; n--) {
    const r = (phi - n) * lam; if (r > D + 2) break; if (r < 1) continue;
    const k = r / D, a = a0 * sm(k, 0, 0.12) * (1 - sm(k, 0.86, 1.02)); if (k > 0.8) hit = Math.max(hit, Math.sin(Math.PI * clamp01((k - 0.8) / 0.22)));
    const gv = fade(g, a), steps = R(r * span * 2.2) + 6;
    for (let i = -steps; i <= steps; i++) { const aa = dir + (i / steps) * span, cs = Math.cos(aa), sn = Math.sin(aa); for (let w = 0; w < th; w += 0.7) { const rr = r - w, x = R(src[0] + cs * rr), y = R(src[1] + sn * rr); gv.px(x, y, w < 0.8 ? "#FFD08A" : w > th - 1 ? "#A85A20" : BONE_C); } }
  }
  return hit;
}
function eqMeter(g, t) {
  const a = sm(t, EQ_ON[0], EQ_ON[1]); if (a <= 0) return;
  const v = fade(g, a), x0 = 270, y0 = 14, w = 108, h = 104, lowK = sm(t, EQ_LOW[0], EQ_LOW[1]);
  rrect(v, x0 - 1, y0 - 1, w + 2, h + 2, 6, UI.O); rrect(v, x0, y0, w, h, 5, "#2A5A84"); rrect(v, x0 + 2, y0 + 2, w - 4, h - 4, 4, "#0A1830");
  const base = [0.5, 0.55, 0.6, 0.55, 0.5, 0.45, 0.4], low = [0.95, 0.9, 0.72, 0.42, 0.28, 0.2, 0.15], by = y0 + 76;
  for (let i = 0; i < 7; i++) {
    const lv = clamp01(lerp(base[i], low[i], lowK) + 0.07 * Math.sin(t * (5.1 + i * 1.3) + i * 2)), n = R(lv * 15), bx = x0 + 9 + i * 13, col = mix(BONE_C, AIR_C, i / 6);
    for (let s = 0; s < 15; s++) { const yy = by - s * 4 - 3; v.rect(bx, yy, 10, 3, s < n ? (s === n - 1 ? mix(col, "#FFFFFF", 0.35) : col) : "#14284A"); }
  }
  v.text(MAIN, "LOW", x0 + 8, by + 6, BONE_C, { scale: 2 });
  const hw = g.measure(MAIN, "HIGH", { scale: 2 }); v.text(MAIN, "HIGH", x0 + w - 8 - hw, by + 6, AIR_C, { scale: 2 });
}
function deeper(g, t) {
  const k = clamp01((t - DEEP[0]) / (DEEP[1] - DEEP[0])); if (k <= 0) return;
  const a = sm(k, 0, 0.35), v = fade(g, a), x0 = 270, y0 = 128, w = 108, h = 104, drop = backOut(clamp01(k / 0.9), 2.4), bob = R(2 * Math.sin((t - DEEP[1]) * 3.2) * sm(t, DEEP[1], DEEP[1] + 0.3));
  rrect(v, x0 - 1, y0 - 1, w + 2, h + 2, 6, UI.O); rrect(v, x0, y0, w, h, 5, "#A85A20"); rrect(v, x0 + 2, y0 + 2, w - 4, h - 4, 4, "#1C1020");
  const cx = x0 + w / 2, ay = R(y0 + 10 + 26 * drop) + bob;
  // a thick down arrow
  v.rect(cx - 9, ay - 2, 18, 24, UI.O); v.rect(cx - 7, ay, 14, 22, BONE_C); v.rect(cx - 7, ay, 4, 22, "#FFD08A");
  for (let j = 0; j < 18; j++) { const half = 20 - j; v.rect(cx - half - 1, ay + 21 + j, half * 2 + 3, 1, UI.O); if (half > 1) v.rect(cx - half + 1, ay + 21 + j, half * 2 - 1, 1, j < 2 ? "#FFD08A" : BONE_C); }
  const tw2 = g.measure(MAIN, "DEEPER", { scale: 2 }); v.text(MAIN, "DEEPER", R(cx - tw2 / 2), y0 + h - 20, "#FFD08A", { scale: 2 });
}
export function drawXray(g, t) {
  g.d.set(bg().d);
  drawHead(g, t);
  const hb = boneWaves(g, t), ha = airRings(g, t);
  inner(g, t, Math.max(hb * sm(t, BONE_ON[0], BONE_ON[1]), ha * 0.6));
  // the ear canal lights up cyan when an air ring arrives
  if (ha > 0.02) { const c = CANAL_IN, gv = fade(g, ha); gv.disc(R(c[0]), R(c[1]), 3, "#BFF6FF"); }
  chip(g, "AIR", 296, 244, AIR_C, { a: sm(t, AIR_ON[0], AIR_ON[1]), txt: AIR_C });
  chip(g, "BONE", 96, 118, BONE_C, { a: sm(t, BONE_ON[0], BONE_ON[1]), txt: BONE_C });
  eqMeter(g, t);
  deeper(g, t);
  otext(g, "YOUR VOICE", 12, 10, UI.IV, { scale: 2, a: 1 });
}

bg();   // warm the cached light box at import
