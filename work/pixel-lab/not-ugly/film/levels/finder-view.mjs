// FINDER · the VIEW: a big screen-space viewfinder panel (VIEW = x 70, y 96, 400 × 300) that shows what the camera /
// your ears get. It pops open on "phone" (VIEW_IN) and closes before the share card (VIEW_OUT); its content is one of the
// MODEs of timeline.mjs, each drawn full-frame into an offscreen screen buffer and crossfaded with an ordered dither
// (0.4 s) — never a one-frame swap. Every beat is keyed to EV words.
import { Canvas } from "../../../../../renderer/pixel/raster.mjs";
import { EV, MODE, VIEW, VIEW_IN, VIEW_OUT, PHONE_FLY, HOP } from "../timeline.mjs";
import { drawFace } from "./finder-face.mjs";
import { UI, mix, bayer, fade, MAIN, clamp01, sm, ease, lerp, backOut, otext, rrect, chip, heart, sparkle } from "./finder-ui.mjs";
import { drawXray } from "./finder-xray.mjs";
import { drawBlind } from "./finder-blind.mjs";
import { drawRecord } from "./finder-record.mjs";

const R = Math.round;
export const BZ = 6, SW = VIEW.w - 2 * BZ, SH = VIEW.h - 2 * BZ;      // screen 388 × 288 inside a 6-px bezel
const XF = 0.2;                                                        // half-length of a mode crossfade (0.4 s)
const ORDER = ["hook", "selfie", "nobody", "flip", "study", "xray", "record", "test", "happy"];
const blinkAt = (t, every = 3.7, ph = 0) => { const p = ((t + ph) % every + every) % every, d = 0.2; return p < d ? Math.sin((Math.PI * p) / d) : 0; };
const breathe = (t) => (globalThis.FINDER_STILL ? 0 : R(Math.sin(t * 2.1) * 0.8));     // 1-px idle bob (FINDER_STILL: off, for the pop scan)
const clipView = (g, x0, y0, x1, y1) => { const o = Object.create(g); o.px = (x, y, col) => { if (x >= x0 && x < x1 && y >= y0 && y < y1) g.px(x, y, col); }; return o; };

// ---------------------------------------------------------------- cached backdrops
let ROOM_BG = null, GALLERY_BG = null;
function roomBg() {          // the bedroom behind your face, out of focus: purple wall, warm lamp bokeh, the night window
  if (ROOM_BG) return ROOM_BG;
  const b = new Canvas(SW, SH, "#241A3E");
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const k = y / SH, v = k * 5, lo = Math.floor(v); b.px(x, y, mix("#221838", "#4A2E5E", (v - lo > bayer(x, y) ? lo + 1 : lo) / 5)); }
  // the window (right): night blue, blurred frame, city lights + the moon
  for (let y = 18; y < 176; y++) for (let x = 282; x < 384; x++) { const e = Math.min(x - 282, 384 - x, y - 18, 176 - y) / 6; if (e < 1 && e <= bayer(x, y)) continue; b.px(x, y, mix("#141A3E", "#26305E", (y - 18) / 160 + (bayer(x, y) - 0.5) * 0.15)); }
  for (let y = 18; y < 176; y++) for (const xx of [331, 332]) if (bayer(xx, y) < 0.7) b.px(xx, y, "#3B2C5C");
  for (let x = 282; x < 384; x++) for (const yy of [96, 97]) if (bayer(x, yy) < 0.7) b.px(x, yy, "#3B2C5C");
  const glow = (cx, cy, r, col, k0) => { for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) { const d = Math.hypot(x - cx, y - cy) / r; if (d >= 1) continue; const k = Math.min(0.9, k0 * (1 - d) ** 1.4), st = k / 0.15, lo = Math.floor(st), q = (st - lo > bayer(x, y) ? lo + 1 : lo) * 0.15; if (q > 0) b.px(x, y, mix(b.get(x, y), col, q)); } };
  glow(356, 46, 16, "#F8E8BC", 1.2);
  [[300, 140], [312, 150], [346, 132], [366, 146], [322, 162], [354, 160], [296, 160], [372, 120]].forEach(([x, y], i) => glow(x, y, 5 + (i % 3), "#F4CA50", 0.9));
  // the bedside lamp's warm pool (left) and a couple of soft bokeh discs
  glow(30, 224, 130, "#F4A860", 0.5);
  glow(70, 120, 18, "#F7C27A", 0.5); glow(118, 70, 10, "#E0CDF8", 0.35); glow(250, 236, 14, "#F7C27A", 0.35);
  // a blurred poster (left wall)
  for (let y = 30; y < 92; y++) for (let x = 18; x < 66; x++) { const e = Math.min(x - 18, 66 - x, y - 30, 92 - y) / 5; if (e < 1 && e <= bayer(x, y)) continue; b.px(x, y, mix(b.get(x, y), y < 60 ? "#8D59DA" : "#C04A70", 0.22)); }
  return (ROOM_BG = b);
}
function galleryBg() {       // a calm dark backdrop for the photo cards (flip / study)
  if (GALLERY_BG) return GALLERY_BG;
  const b = new Canvas(SW, SH, "#1A1230");
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) { const d = Math.hypot((x - SW / 2) / SW, (y - SH * 0.45) / SH) * 2, v = (1 - Math.min(1, d)) * 3, lo = Math.floor(v); b.px(x, y, mix("#140E26", "#3A2A5C", (v - lo > bayer(x, y) ? lo + 1 : lo) / 3)); }
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (((x + y) % 24 === 0 || (x - y + 2400) % 24 === 0) && bayer(x, y) < 0.5) b.px(x, y, mix(b.get(x, y), "#6E4FB0", 0.18));
  return (GALLERY_BG = b);
}
const copyBg = (g, b) => g.d.set(b.d);

// ---------------------------------------------------------------- camera-app chrome (generic: no brand)
function camUI(g, t, a, f, face = 1) {
  if (a <= 0) return; const v = fade(g, a), W = "#FDFEED", L = 16, I = 9;
  for (const [x, y, dx, dy] of [[I, I, 1, 1], [SW - 1 - I, I, -1, 1], [I, SH - 1 - I, 1, -1], [SW - 1 - I, SH - 1 - I, -1, -1]]) {
    for (const [ox, oy] of [[1, 1]]) { v.rect(Math.min(x, x + dx * L) + ox, y + oy, L, 2, UI.O); v.rect(x + ox, Math.min(y, y + dy * L) + oy, 2, L, UI.O); }
    v.rect(Math.min(x, x + dx * (L - 1)), y - (dy < 0 ? 1 : 0), L, 2, W); v.rect(x - (dx < 0 ? 1 : 0), Math.min(y, y + dy * (L - 1)), 2, L, W);
  }
  // battery (top right) and a flash bolt (top left)
  { const x = SW - 50, y = 16; v.rect(x - 1, y - 1, 24, 12, UI.O); v.rect(x, y, 22, 10, W); v.rect(x + 1, y + 1, 20, 8, UI.O); v.rect(x + 2, y + 2, 13, 6, UI.GR); v.rect(x + 22, y + 3, 2, 4, W); }
  { const x = 30, y = 13, B = [[4, 0, 4], [3, 2, 4], [2, 4, 4], [1, 6, 8], [4, 8, 4], [3, 10, 3], [2, 12, 2], [2, 13, 1]]; for (const [dx, dy, w] of B) v.rect(x + dx - 1, y + dy - 1, w + 2, 3, UI.O); for (const [dx, dy, w] of B) v.rect(x + dx, y + dy, w, 2, UI.Y); }
  // shutter (right middle)
  { const cx = SW - 30, cy = SH / 2 + 4; v.disc(cx, cy, 14, UI.O); v.disc(cx, cy, 13, W); v.disc(cx, cy, 11, UI.O); v.disc(cx, cy, 9, mix(W, "#C8C0E0", 0.25)); v.px(cx - 3, cy - 4, "#FFFFFF"); }
  // face-detect box (yellow corners) around the face
  if (f && face > 0) {
    const fv = fade(g, a * face), x0 = R(f.boxTL[0]), y0 = R(f.boxTL[1]), x1 = R(f.boxBR[0]), y1 = R(f.boxBR[1]), l = Math.max(6, R((x1 - x0) * 0.12));
    for (const [x, y, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { fv.rect(Math.min(x, x + dx * l), y, l, 1, UI.Y); fv.rect(x, Math.min(y, y + dy * l), 1, l, UI.Y); }
  }
}
/** distance chip: "30 CM" ↔ "1.5 M" (crossfaded text) */
function distChip(g, t, a, k15) {
  if (a <= 0) return;
  const icon = (gg, x, y) => { gg.rect(x, y - 1, 12, 2, UI.IV); for (let i = 0; i < 3; i++) { gg.rect(x + i, y - 1 - i, 1, 2 + 2 * i, UI.IV); gg.rect(x + 11 - i, y - 1 - i, 1, 2 + 2 * i, UI.IV); } };
  if (k15 < 1) chip(g, "30 CM", 14, SH - 44, UI.Y, { a: a * (1 - k15), icon, iconW: 18 });
  if (k15 > 0) chip(g, "1.5 M", 14, SH - 44, UI.GR, { a: a * k15, icon, iconW: 18 });
}

// ---------------------------------------------------------------- faces: framing
const NORMAL = { x: SW / 2, y: 168, s: 1.0 };
function faceAt(g, t, o) { return drawFace(g, { blink: blinkAt(t, 3.7, 0.6), blush: 0.7, ...o, y: o.y + breathe(t) }); }

// ---------------------------------------------------------------- HOOK: sad face in the camera app; the frame glitches on "lying"
function drawHook(g, t) {
  copyBg(g, roomBg());
  const f = faceAt(g, t, { ...NORMAL, sad: 1, look: [0, 0.55] });
  camUI(g, t, 1, f);
}
export const GLITCH = [EV.lying + 0.02, EV.lying + 0.3];
function glitch(g, t) {          // a couple of RGB-split, sideways-shifted rows (screen buffer only), ≤ 0.28 s, no flash
  if (t <= GLITCH[0] || t >= GLITCH[1]) return;
  const e = Math.sin((Math.PI * (t - GLITCH[0])) / (GLITCH[1] - GLITCH[0])), src = new Uint8ClampedArray(g.d);
  const bands = [[0.16, 9, 1.0], [0.36, 5, -0.9], [0.5, 14, 0.8], [0.68, 6, -1.2], [0.86, 4, 0.9]];
  bands.forEach(([yy, h, dir], i) => {
    const y0 = R(SH * yy + 18 * Math.sin(t * 9 + i * 2.1)), dx = R(dir * e * (10 + 6 * Math.sin(t * 13 + i))), sp = R(1 + 3 * e);
    for (let y = Math.max(0, y0); y < Math.min(SH, y0 + h); y++) for (let x = 0; x < SW; x++) {
      const o = (y * SW + x) * 3, at = (xx) => (y * SW + Math.max(0, Math.min(SW - 1, xx))) * 3;
      g.d[o] = src[at(x - dx - sp)]; g.d[o + 1] = src[at(x - dx) + 1]; g.d[o + 2] = src[at(x - dx + sp) + 2];
    }
  });
  if (e > 0.5) for (let y = 0; y < SH; y += 3) { const o0 = y * SW * 3; for (let x = 0; x < SW; x++) { const o = o0 + x * 3; g.d[o] = src[o0 + Math.min(SW - 1, x + 1) * 3]; } }
}

// ---------------------------------------------------------------- SELFIE: the camera comes close (wide-angle bulge), calipers, +30 %, then backs off to 1.5 m
export const NEAR = [EV.selfie - 0.05, EV.n30cm + 0.1];
export const nearAt = (t) => ease(sm(t, NEAR[0], NEAR[1])) * (1 - ease(sm(t, PHONE_FLY[0], PHONE_FLY[1])));
export const CALIPER = { in: [EV.nose - 0.3, EV.nose + 0.05], close: [EV.nose, EV.nose + 0.5], out: [EV.away + 0.05, EV.away + 0.45] };
export const PCT = [EV.n30pct - 0.04, EV.n30pct + 0.36], PCT_OUT = [PHONE_FLY[0] + 0.15, PHONE_FLY[0] + 0.55];
export const DIST_IN = [EV.n30cm - 0.12, EV.n30cm + 0.16], DIST_15 = [EV.half - 0.12, EV.metres + 0.08];
function selfieFace(t) {
  const n = nearAt(t), back = sm(t, PHONE_FLY[0], PHONE_FLY[1]);
  return { x: SW / 2, y: lerp(168, 160, n), s: lerp(1, 1.62, n), bulge: n, earIn: n, sad: lerp(lerp(1, 0.25, sm(t, EV.selfie, EV.selfie + 0.7)), 0.1, back), look: [0, lerp(0.55, 0, sm(t, EV.selfie - 0.1, EV.selfie + 0.4))] };
}
function drawSelfie(g, t) {
  copyBg(g, roomBg());
  const f = faceAt(g, t, selfieFace(t));
  camUI(g, t, 1, f, 1 - 0.7 * sm(t, CALIPER.in[0], CALIPER.in[1]) * (1 - sm(t, CALIPER.out[0], CALIPER.out[1])));
  caliper(g, t, f);
  // "+30%" pops on "30% wider", fades while the camera backs off
  const k = clamp01((t - PCT[0]) / (PCT[1] - PCT[0])), a = sm(k, 0, 0.45) * (1 - sm(t, PCT_OUT[0], PCT_OUT[1]));
  if (a > 0) { const sc = backOut(k, 2.2), x = SW - 62, y = R(f.noseBot[1] + 22 - 8 * (1 - sc)); chip(g, "+30%", x, y, UI.PK, { a, scale: 3, align: "c", txt: UI.IV, h: 34, padX: 9 }); }
  distChip(g, t, sm(t, DIST_IN[0], DIST_IN[1]), sm(t, DIST_15[0], DIST_15[1]));
}
/** steel vernier calipers under the nose: the jaws close onto the nose's width and follow it while the camera backs off */
function caliper(g, t, f) {
  const a = sm(t, CALIPER.in[0], CALIPER.in[1]) * (1 - sm(t, CALIPER.out[0], CALIPER.out[1])); if (a <= 0) return;
  const v = fade(g, a), slide = R(40 * (1 - ease(sm(t, CALIPER.in[0], CALIPER.in[1] + 0.1))));
  const gap = 24 * (1 - ease(sm(t, CALIPER.close[0], CALIPER.close[1]))), cx = f.nose.x, hw = f.nose.halfW;
  const xL = R(cx - hw - gap) + slide, xR = R(cx + hw + gap) + slide, yTop = R(f.noseTop[1] + (f.noseBot[1] - f.noseTop[1]) * 0.25), yB = R(f.noseBot[1] + 7);
  const ST = ["#2A2E40", "#4A5068", "#6E7690", "#98A0BA", "#C4CAD8", "#E8ECF4"];
  // beam (to the right edge), with ticks
  v.rect(xL - 10, yB - 1, SW - xL + 12, 9, UI.O); v.rect(xL - 9, yB, SW - xL + 10, 7, ST[3]); v.rect(xL - 9, yB, SW - xL + 10, 2, ST[5]); v.rect(xL - 9, yB + 5, SW - xL + 10, 2, ST[2]);
  for (let x = xL; x < SW; x += 4) v.rect(x, yB + 2, 1, (x - xL) % 20 === 0 ? 3 : 2, ST[1]);
  // fixed jaw (left) and sliding jaw (right): prongs pointing up to the nose's sides, pointed tips facing the nose
  const jaw = (x, dir) => { const h = yB - yTop; for (let j = 0; j <= h; j++) { const w = j < 6 ? 2 + R(j * 0.6) : 6; const x0 = dir > 0 ? x - w : x; v.rect(x0 - (dir > 0 ? 1 : 0), yTop + j, w + 1, 1, UI.O); v.rect(dir > 0 ? x - w + 1 : x + 1, yTop + j, Math.max(1, w - 1), 1, j < 2 ? ST[5] : ST[4 - (j % 9 === 0 ? 1 : 0)]); } v.rect(dir > 0 ? x - 1 : x + 1, yTop + 2, 1, h - 2, ST[2]); };
  jaw(xL, 1); jaw(xR, -1);
  // the slider box with the vernier window and a thumb screw
  v.rect(xR - 2, yB - 6, 30, 20, UI.O); v.rect(xR - 1, yB - 5, 28, 18, ST[3]); v.rect(xR - 1, yB - 5, 28, 2, ST[5]); v.rect(xR + 4, yB + 1, 18, 6, "#1C2236"); for (let i = 0; i < 5; i++) v.rect(xR + 6 + i * 3, yB + 2, 1, 4, UI.CY);
  v.disc(xR + 13, yB - 9, 3, UI.O); v.disc(xR + 13, yB - 9, 2, ST[4]);
}

// ---------------------------------------------------------------- NOBODY: the 1.5 m face smiles
function drawNobody(g, t) {
  copyBg(g, roomBg());
  const k = sm(t, EV.nobody - 0.05, EV.nobody + 0.5);
  const f = faceAt(g, t, { ...NORMAL, sad: 0.1 * (1 - k), smile: 0.8 * k, blush: 0.7 + 0.5 * k });
  camUI(g, t, 1, f);
  distChip(g, t, 1, 1);
}

// ---------------------------------------------------------------- photo / mirror cards (flip, study)
const CARD = { hw: 88, hh: 122, side: 7, bottom: 28 };
/** A card at (cx, cy) scale q, horizontal turn factor sx (cos θ), style m (0 photo: white border → 1 mirror: gold frame
 *  with glass sheen), face options fo, label text; glow 0..1 (chosen ring). Returns the card rect. */
function card(g, t, { cx, cy, q = 1, sx = 1, m = 0, fo = {}, label = "", la = 1, glow = 0, a = 1 }) {
  if (a <= 0) return null;
  const v = fade(g, a), hw = CARD.hw * q * Math.abs(sx), hh = CARD.hh * q, x0 = R(cx - hw), x1 = R(cx + hw), y0 = R(cy - hh), y1 = R(cy + hh);
  if (x1 - x0 < 2) { v.rect(R(cx), y0, 1, y1 - y0, m > 0.5 ? "#C99A2A" : "#E8E2D4"); return { x0, y0, x1, y1 }; }
  // glow ring (chosen)
  if (glow > 0) { const gv = fade(g, a * glow); rrect(gv, x0 - 5, y0 - 5, x1 - x0 + 10, y1 - y0 + 10, 6, UI.Y); rrect(gv, x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6, 5, "#FFF1A8"); }
  // drop shadow
  for (let y = y0 + 5; y < y1 + 5; y++) for (let x = x0 + 4; x < x1 + 4; x++) if ((x >= x1 || y >= y1) && bayer(x, y) < 0.55) v.px(x, y, "#0B0812");
  // frame: photo (white) and mirror (gold) crossfaded by m
  const turnDark = (1 - Math.abs(sx)) * 0.35;
  const frame = (col) => (turnDark > 0 ? mix(col, "#2A1F40", turnDark) : col);
  const ins = Math.max(2, R(CARD.side * q * Math.abs(sx))), bot = R(CARD.bottom * q), px0 = x0 + ins, px1 = x1 - ins, py0 = y0 + R(CARD.side * q), py1 = y1 - bot;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    if (x >= px0 && x < px1 && y >= py0 && y < py1) continue;
    const edge = x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1, mir = m > bayer(x, y);
    let col;
    if (mir) { const u = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y), lit = (x - x0) + (y - y0) < (x1 - x0) * 0.6; col = edge ? "#3A2408" : u === 1 ? "#F9E08A" : u === Math.min(ins, R(CARD.side * q)) - 1 ? "#6A4A10" : (x + y) % 9 === 0 ? "#E8B840" : lit ? "#D9A834" : "#B8862A"; }
    else col = edge ? "#5A5068" : (y === y0 + 1 || x === x0 + 1) ? "#FFFFFF" : y >= py1 ? "#F2EEE4" : "#ECE6DA";
    v.px(x, y, frame(col));
  }
  // photo area: the room backdrop (sampled) + the face, clipped to the opening
  const cv = clipView(v, px0, py0, px1, py1), bg = roomBg();
  for (let y = py0; y < py1; y++) for (let x = px0; x < px1; x++) { const sxp = R(SW / 2 + (x - cx) / Math.max(0.05, Math.abs(sx) * q) * 0.9), syp = R(SH / 2 + (y - cy) / q * 0.9); cv.px(x, y, turnDark > 0 ? mix(bg.get(sxp, syp), "#120C1D", turnDark) : bg.get(sxp, syp)); }
  const s = 0.82 * q, f = drawFace(cv, { blink: blinkAt(t, 4.1, 1.3), blush: 0.8, ...fo, x: cx, y: py0 + R(134 * q) + breathe(t), s, sx });
  // mirror glass: two diagonal sheen bands (dithered)
  if (m > 0.02) { const gm = fade(cv, m * 0.9), w = px1 - px0; for (let y = py0; y < py1; y++) for (let x = px0; x < px1; x++) { const d = (x - px0) + (y - py0) * 0.8 * Math.abs(sx) / Math.max(0.05, Math.abs(sx)); const b1 = Math.abs(d - w * 0.26) < 5 * q, b2 = Math.abs(d - w * 0.4) < 2 * q, b3 = Math.abs(d - w * 1.62) < 4 * q; if (((b1 || b3) && bayer(x, y) < 0.3) || (b2 && bayer(x, y) < 0.2)) gm.px(x, y, "#FFFFFF"); } }
  // label in the bottom strip (dissolves while the card is edge-on)
  const lk = la * sm(Math.abs(sx), 0.55, 0.9);
  if (label && lk > 0) { const lv = fade(g, a * lk), sc = q >= 0.95 ? 3 : 2, w = g.measure(MAIN, label, { scale: sc }); lv.text(MAIN, label, R(cx - w / 2), R(py1 + (bot - 7 * sc) / 2), m > 0.5 ? "#3A2408" : "#3B2C5C", { scale: sc }); }
  return { x0, y0, x1, y1, face: f };
}

// ---------------------------------------------------------------- FLIP: PHOTO → card turn on "flipped" → MIRROR; "?" on "wrong", ♥ on "like"
export const TURN = [EV.flipped - 0.12, EV.flipped + 0.52];
export const turnK = (t) => ease(clamp01((t - TURN[0]) / (TURN[1] - TURN[0])));
export const HUH = [EV.wrong - 0.06, EV.wrong + 0.3], HUH_OUT = [TURN[0] - 0.05, TURN[0] + 0.2];
export const LIKE = [EV.like - 0.06, EV.like + 0.5];
const FLIP_C = { cx: SW / 2, cy: 140 };
function flipCardState(t) {
  const k = turnK(t), sx = Math.cos(Math.PI * k), like = sm(t, LIKE[0], LIKE[0] + 0.45);
  return { ...FLIP_C, q: 1, sx, m: sm(k, 0.47, 0.53), label: k < 0.5 ? "PHOTO" : "MIRROR", fo: { smile: 0.45 + 0.5 * like, blush: 0.8 + 0.5 * like } };
}
function drawFlip(g, t) {
  copyBg(g, galleryBg());
  const st = flipCardState(t), r = card(g, t, st);
  // "?" bubble on "wrong" (the photo feels off), gone before the turn
  const hk = clamp01((t - HUH[0]) / (HUH[1] - HUH[0])), ha = sm(hk, 0, 0.5) * (1 - sm(t, HUH_OUT[0], HUH_OUT[1]));
  if (ha > 0 && r) { const x = r.x1 - 6, y = r.y0 + 8 - R(6 * backOut(hk)); bubble(g, x, y, "?", ha); }
  if (r) heart(g, FLIP_C.cx + CARD.hw - 6, FLIP_C.cy - CARD.hh + 10, 38, clamp01((t - LIKE[0]) / (LIKE[1] - LIKE[0])));
}
function bubble(g, x, y, s, a) {
  const v = fade(g, a); rrect(v, x - 17, y - 17, 34, 32, 8, UI.O); rrect(v, x - 16, y - 16, 32, 30, 7, UI.IV); v.poly([[x - 10, y + 12], [x - 2, y + 12], [x - 13, y + 21]], UI.O); v.poly([[x - 9, y + 12], [x - 3, y + 12], [x - 11, y + 18]], UI.IV);
  const w = g.measure(MAIN, s, { scale: 3 }); v.text(MAIN, s, R(x - w / 2), y - 11, UI.p5, { scale: 3 });
}

// ---------------------------------------------------------------- STUDY: 1977 — MIRROR | REAL; ♥ YOU → MIRROR, ♥ FRIENDS → REAL
export const SPLIT = [MODE.study[0], MODE.study[0] + 0.7];
export const TITLE77 = [SPLIT[0] + 0.3, SPLIT[1] - 0.05];
export const VOTE_YOU = [EV.chose1 - 0.05, EV.chose1 + 0.45], VOTE_FR = [EV.friends - 0.05, EV.friends + 0.45];
export const GLOW_MIR = [EV.mirror3 - 0.1, EV.mirror3 + 0.25], GLOW_REAL = [EV.real - 0.1, EV.real + 0.25];
const STUDY_Q = 0.74, STUDY_L = 102, STUDY_R = 286, STUDY_Y = 158;
function drawStudy(g, t) {
  copyBg(g, galleryBg());
  const k = ease(sm(t, SPLIT[0], SPLIT[1])), q = lerp(1, STUDY_Q, k);
  const ty = lerp(FLIP_C.cy, STUDY_Y, k);
  const gm = sm(t, GLOW_MIR[0], GLOW_MIR[1]), gr = sm(t, GLOW_REAL[0], GLOW_REAL[1]);
  // REAL slides in from the right (dissolving), MIRROR moves from the centre to the left
  card(g, t, { cx: lerp(SW + 40, STUDY_R, k), cy: ty, q, sx: 1, m: 0, label: "REAL", a: sm(k, 0.05, 0.6), glow: gr, fo: { smile: 0.4 + 0.5 * gr, blush: 0.8 } });
  card(g, t, { cx: lerp(FLIP_C.cx, STUDY_L, k), cy: ty, q, sx: -1, m: 1, label: "MIRROR", glow: gm, fo: { smile: 0.95, blush: 1.3 } });
  otext(g, "1977 STUDY", SW / 2, 7, UI.Y, { scale: 3, align: "c", a: sm(t, TITLE77[0], TITLE77[1]) });
  // votes: pill badges with a heart, popping onto the cards' top edges
  vote(g, STUDY_L, STUDY_Y - CARD.hh * STUDY_Q - 4, "YOU", clamp01((t - VOTE_YOU[0]) / (VOTE_YOU[1] - VOTE_YOU[0])), UI.PK);
  vote(g, STUDY_R, STUDY_Y - CARD.hh * STUDY_Q - 4, "FRIENDS", clamp01((t - VOTE_FR[0]) / (VOTE_FR[1] - VOTE_FR[0])), UI.GR);
}
function vote(g, cx, cy, s, k, col) {
  if (k <= 0) return; const a = sm(k, 0, 0.45), sc = backOut(k, 2), w = g.measure(MAIN, s, { scale: 2 }) + 40, h = 26, x0 = R(cx - w / 2), y0 = R(cy - h / 2 - 8 * (1 - sc));
  const v = fade(g, a); rrect(v, x0 - 1, y0 - 1, w + 2, h + 2, 8, UI.O); rrect(v, x0, y0, w, h, 7, col); rrect(v, x0 + 2, y0 + 2, w - 4, h - 4, 6, UI.CARD);
  heart(g, x0 + 15, y0 + 13, 16, 1, { a });
  v.text(MAIN, s, x0 + 28, y0 + 6, UI.IV, { scale: 2 });
}

// ---------------------------------------------------------------- HAPPY: your normal face, a big smile, blush, sparkles (bottom strip left calm for the lead's tags)
export const GRIN = [EV.so3 + 0.05, EV.face3 + 0.25];
const SPARKS = [[70, 60, 6, 0.0], [318, 52, 7, 0.9], [96, 150, 5, 1.7], [300, 138, 6, 2.4], [52, 112, 4, 3.1], [338, 96, 4, 0.5], [128, 30, 4, 1.2], [262, 22, 5, 2.0]];
function drawHappy(g, t) {
  copyBg(g, roomBg());
  // warm halo behind the head
  const hk = 0.9 + 0.1 * Math.sin(t * 2.4);
  for (let y = 0; y < 232; y++) for (let x = 54; x < 334; x++) { const d = Math.hypot((x - SW / 2) / 140, (y - 108) / 124); if (d >= 1) continue; const k = 0.42 * hk * (1 - d) ** 1.3, st = k / 0.07, lo = Math.floor(st), q = (st - lo > bayer(x, y) ? lo + 1 : lo) * 0.07; if (q > 0) g.px(x, y, mix(g.get(x, y), "#F7C27A", q)); }
  const k = sm(t, GRIN[0], GRIN[1]), hop = Math.sin(Math.PI * clamp01((t - HOP[0]) / (HOP[1] - HOP[0])));
  faceAt(g, t, { x: SW / 2, y: 146 - R(8 * hop), s: 0.95, smile: 0.6 + 0.4 * k, grin: k, blush: 1.0 + 0.5 * k });
  // sparkles twinkle around the head (none in the bottom strip y > 214)
  SPARKS.forEach(([x, y, r, ph]) => { const tw = Math.max(0, Math.sin(t * 3.1 + ph * 2.3)); sparkle(g, x, y, r, tw * sm(t, GRIN[0], GRIN[0] + 0.6), ph > 1.5 ? "#FFF6C8" : "#FFD2DC"); });
  // calm the bottom strip (the lead's DISTANCE / MIRROR / SKULL tags sit there): soft dark gradient over the shoulders
  for (let y = 214; y < SH; y++) { const kk = sm(y, 214, 236) * 0.55; for (let x = 0; x < SW; x++) if (kk > 0) { const s2 = kk * 3, lo = Math.floor(s2), q = (s2 - lo > bayer(x, y) ? lo + 1 : lo) / 3; if (q > 0) g.px(x, y, mix(g.get(x, y), "#120C1D", q)); } }
}

// ---------------------------------------------------------------- mode table, crossfades, panel
const DRAW = { hook: drawHook, selfie: drawSelfie, nobody: drawNobody, flip: drawFlip, study: drawStudy, xray: drawXray, record: drawRecord, test: drawBlind, happy: drawHappy };
/** [[name, weight]] of the modes visible at t (one, or two during a crossfade; weight of the incoming one). */
export function modesAt(t) {
  for (let i = 1; i < ORDER.length; i++) { const a = MODE[ORDER[i]][0]; if (t >= a - XF && t < a + XF) return [[ORDER[i - 1], 1], [ORDER[i], sm(t, a - XF, a + XF)]]; }
  for (let i = ORDER.length - 1; i >= 0; i--) if (t >= MODE[ORDER[i]][0]) return [[ORDER[i], 1]];
  return [[ORDER[0], 1]];
}
const BUF = [new Canvas(SW, SH), new Canvas(SW, SH)], PANEL = new Canvas(VIEW.w, VIEW.h);
/** Screen content at t (crossfaded), into BUF[0]. */
export function screen(t) {
  const ms = modesAt(t), A = BUF[0];
  DRAW[ms[0][0]](A, t);
  if (ms.length > 1 && ms[1][1] > 0) {
    const B = BUF[1], w = ms[1][1]; DRAW[ms[1][0]](B, t);
    for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) if (w > bayer(x, y)) { const o = (y * SW + x) * 3; A.d[o] = B.d[o]; A.d[o + 1] = B.d[o + 1]; A.d[o + 2] = B.d[o + 2]; }
  }
  glitch(A, t);
  return A;
}
// panel mask (rounded corners r 12) and screen corner mask (r 6)
const inRound = (x, y, w, h, r) => { const dx = x < r ? r - x - 0.5 : x >= w - r ? x - (w - r) + 0.5 : 0, dy = y < r ? r - y - 0.5 : y >= h - r ? y - (h - r) + 0.5 : 0; return dx * dx + dy * dy <= r * r; };
const PMASK = new Uint8Array(VIEW.w * VIEW.h);
for (let y = 0; y < VIEW.h; y++) for (let x = 0; x < VIEW.w; x++) PMASK[y * VIEW.w + x] = inRound(x, y, VIEW.w, VIEW.h, 12) ? (x >= BZ && y >= BZ && x < VIEW.w - BZ && y < VIEW.h - BZ && inRound(x - BZ, y - BZ, SW, SH, 6) ? 2 : 1) : 0;
let BEZEL = null;
function bezel() {
  if (BEZEL) return BEZEL; const b = new Canvas(VIEW.w, VIEW.h, UI.O);
  rrect(b, 0, 0, VIEW.w, VIEW.h, 12, UI.O); rrect(b, 1, 1, VIEW.w - 2, VIEW.h - 2, 11, UI.p7); rrect(b, 3, 3, VIEW.w - 6, VIEW.h - 6, 9, "#1A1428");
  b.rect(16, 2, VIEW.w - 32, 1, "#D8C8F8"); b.rect(4, BZ - 1, VIEW.w - 8, 1, UI.O); b.rect(4, VIEW.h - BZ, VIEW.w - 8, 1, UI.O);
  return (BEZEL = b);
}
export const OPEN = [VIEW_IN, VIEW_IN + 0.42], CLOSE = [VIEW_OUT - 0.15, VIEW_OUT + 0.25];   // close in step with the lead's tags (fade VIEW_OUT − 0.05 … + 0.25)
/** Panel transform at t: { s: scale, a: alpha } (null when hidden). */
export function panelState(t) {
  if (t < OPEN[0] || t > CLOSE[1]) return null;
  const p = clamp01((t - OPEN[0]) / (OPEN[1] - OPEN[0])), q = clamp01((t - CLOSE[0]) / (CLOSE[1] - CLOSE[0]));
  return { s: (0.55 + 0.45 * backOut(p, 1.3)) * (1 - 0.06 * ease(q)), a: sm(p, 0, 0.55) * (1 - sm(q, 0.1, 1)) };
}
export function hud(c, V, t) {
  const st = panelState(t); if (!st || st.a <= 0) return;
  const S = screen(t), P = PANEL, Bz = bezel();
  P.d.set(Bz.d);
  for (let y = BZ; y < VIEW.h - BZ; y++) for (let x = BZ; x < VIEW.w - BZ; x++) { const i = y * VIEW.w + x; if (PMASK[i] !== 2) continue; const s = ((y - BZ) * SW + (x - BZ)) * 3, d = i * 3; P.d[d] = S.d[s]; P.d[d + 1] = S.d[s + 1]; P.d[d + 2] = S.d[s + 2]; }
  // place it: scaled about the panel centre (nearest), dissolved, with a soft drop shadow
  const cx = VIEW.x + VIEW.w / 2, cy = VIEW.y + VIEW.h / 2, w = VIEW.w * st.s, h = VIEW.h * st.s, x0 = R(cx - w / 2), y0 = R(cy - h / 2), x1 = R(cx + w / 2), y1 = R(cy + h / 2);
  const sh = 0.4 * st.a;
  c.tint(x1 - 8, y0 + 8, 13, y1 - y0 + 4, (X, Y) => (X >= x1 - 2 || Y >= y1 ? sh * (1 - Math.max(0, X - x1 - 1) / 6) : 0), "#0B0812", 3);
  c.tint(x0 + 6, y1 - 2, x1 - x0, 9, (X, Y) => (Y >= y1 ? sh * (1 - (Y - y1) / 8) : 0), "#0B0812", 3);
  for (let Y = Math.max(0, y0); Y < Math.min(c.h, y1); Y++) {
    const sy = Math.min(VIEW.h - 1, Math.floor(((Y - y0) / (y1 - y0)) * VIEW.h));
    for (let X = Math.max(0, x0); X < Math.min(c.w, x1); X++) {
      if (st.a < 1 && st.a <= bayer(X, Y)) continue;
      const sx = Math.min(VIEW.w - 1, Math.floor(((X - x0) / (x1 - x0)) * VIEW.w)), i = sy * VIEW.w + sx; if (!PMASK[i]) continue;
      const s = i * 3, d = (Y * c.w + X) * 3; c.d[d] = P.d[s]; c.d[d + 1] = P.d[s + 1]; c.d[d + 2] = P.d[s + 2];
    }
  }
}

// warm the cached backdrops at import (keeps the first rendered frame inside the time budget)
roomBg(); galleryBg(); bezel();
