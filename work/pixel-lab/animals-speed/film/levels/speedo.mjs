// Speedometer readout (screen space, top of the frame): the current animal's head in a little frame, an LCD with its top
// speed in KM/H and a small dial whose needle swings on a log scale from 0.01 to 400 km/h. The digits roll when a new
// speed is spoken; "???" while the film asks which animal is the fastest; the falcon's 300+ pins the needle; the panel
// leaves before the share/follow card. Every change is continuous (dissolves, rolling digits, an eased needle).
import { EV, LV } from "../timeline.mjs";
import { fade, mix, bayer, sm, rnd, MAIN, TINY } from "../cute.mjs";
import * as garden from "./garden.mjs";
import * as jungle from "./jungle.mjs";
import * as stadium from "./stadium.mjs";
import * as yard from "./yard.mjs";
import * as racecourse from "./racecourse.mjs";
import * as savanna from "./savanna.mjs";
import * as cave from "./cave.mjs";
import * as city from "./city.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
// [time the value is set, label, km/h, small caption]
export const STEPS = [
  [EV.thirtyThree, "0.01", 0.01, "KM/H · RECORD"],
  [EV.quarter, "0.25", 0.25, "KM/H"],
  [EV.fortyFour, "44", 44, "KM/H · TOP SPEED"],
  [EV.fortyEight, "48", 48, "KM/H · SPRINT"],
  [EV.seventy, "70", 70, "KM/H · GALLOP"],
  [EV.ninetyThree, "93", 93, "KM/H · SHORT BURST"],
  [EV.hundred1, "160", 160, "KM/H · FLYING"],
  [EV.fastest4, "???", null, "THE FASTEST?"],
  [EV.three, "300+", 320, "KM/H · IN A DIVE"],
];
const ICONS = [[LV.snail[0], garden], [LV.sloth[0], jungle], [LV.human[0], stadium], [LV.cat[0], yard], [LV.horse[0], racecourse], [LV.cheetah[0], savanna], [LV.bat[0], cave], [EV.so + 0.3, null], [EV.falcon, city]];
const SHOW = [EV.record - 0.25, EV.liked - 0.35];
const ROLL = 0.45, X = 84, Y = 100, Wd = 372, H = 86;
const LOG0 = -2, LOG1 = Math.log10(400);
const at = (list, t) => { let i = -1; while (i < list.length - 1 && list[i + 1][0] <= t) i++; return i; };
function num(c, text, x, y, col, s) { let cx = x; for (const ch of text) { c.text(MAIN, ch, cx, y, col, { scale: s }); cx += c.measure(MAIN, ch, { scale: s }) + s; } }
const numW = (c, text, s) => [...text].reduce((a, ch) => a + c.measure(MAIN, ch, { scale: s }) + s, -s);

export function hud(c, V, t) {
  const a = Math.min(sm(t, SHOW[0], SHOW[0] + 0.35), 1 - sm(t, SHOW[1], SHOW[1] + 0.3));
  if (a <= 0) return;
  const g = fade(c, a);
  g.rrect(X, Y, Wd, H, "#16202E", 3); g.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#2C3E58", 3); g.rect(X + 5, Y + 3, Wd - 10, 1, "#4E6A8E");
  // icon frame (left)
  const fx = X + 8, fy = Y + 8, fw = 66, fh = 70;
  g.rrect(fx, fy, fw, fh, "#0C1420", 2); g.rect(fx + 2, fy + 1, fw - 4, 1, "#22344A");
  const ii = at(ICONS, t);
  if (ii >= 0) {
    const [t0, mod] = ICONS[ii], prev = ii > 0 ? ICONS[ii - 1][1] : null, k = sm(t, t0, t0 + 0.3);
    const draw = (m, aa) => { if (aa <= 0) return; if (m) m.ICON?.(c, fx + fw / 2, fy + fh / 2, aa * a); else fade(c, aa * a).text(MAIN, "?", R(fx + fw / 2 - 7), R(fy + fh / 2 - 10 + Math.sin(t * 6) * 1.5), "#F4CA50", { scale: 4 }); };
    if (k < 1 && ii > 0) draw(prev, 1 - k);
    draw(mod, k);
  }
  // LCD (middle)
  const lx = fx + fw + 8, ly = Y + 8, lw = 186, lh = 70;
  g.rrect(lx, ly, lw, lh, "#06140E", 2);
  for (let j = ly + 1; j < ly + lh - 1; j++) for (let i = lx + 1; i < lx + lw - 1; i++) if (((i + j) & 3) === 0) g.px(i, j, "#0A2016");
  const si = at(STEPS, t);
  g.text(TINY, si >= 0 ? STEPS[si][3] : "KM/H", lx + 6, ly + 5, "#2E7A4A", { scale: 1 });
  let shown = si >= 0 ? STEPS[si][1] : "---";
  if (si >= 0) {
    const [t0, label] = STEPS[si], k = t - t0;
    if (k >= 0 && k < ROLL) shown = [...label].map((ch, j) => (/[0-9]/.test(ch) && rnd(Math.floor(t * 30) * 31 + j) < 1 - k / ROLL ? String(Math.floor(rnd(Math.floor(t * 30) * 17 + j * 3) * 10)) : ch)).join("");
    if (label === "???") shown = [..."???"].map((ch, j) => (Math.sin(t * 9 + j * 2) > 0.2 ? "?" : " ")).join("");
  }
  const s = 5, w = numW(c, shown, s), tx = R(lx + lw - 10 - w), ty = ly + 22;
  const ghost = "888.88"; fade(c, 0.3 * a).text(MAIN, ghost, R(lx + lw - 10 - numW(c, ghost, s)), ty, "#0E3A20", { scale: s });
  const hot = si >= 0 && STEPS[si][2] ? clamp01((Math.log10(STEPS[si][2]) - LOG0) / (LOG1 - LOG0)) : 0;
  const col = mix("#8CFF7A", "#FF7A4A", hot * hot);
  num(g, shown, tx + 1, ty + 1, "#020A06", s); num(g, shown, tx, ty, col, s);
  // dial (right): a half circle, coloured arc, ticks, an eased needle on the log scale
  const dcx = X + Wd - 50, dcy = Y + H - 16, r = 40;
  for (let yy = dcy - r - 4; yy <= dcy + 3; yy++) for (let xx = dcx - r - 4; xx <= dcx + r + 4; xx++) if ((xx - dcx) ** 2 + (Math.min(0, yy - dcy)) ** 2 <= (r + 4) ** 2) g.px(xx, yy, "#0C1420");
  for (let k = 0; k <= 60; k++) { const u = k / 60, ang = Math.PI + u * Math.PI, cc = mix(mix("#65DA41", "#F4CA50", clamp01(u * 2)), "#FF4A4A", clamp01(u * 2 - 1));
    for (let rr = r - 5; rr <= r - 2; rr++) g.px(R(dcx + Math.cos(ang) * rr), R(dcy + Math.sin(ang) * rr), cc); }
  for (let q = 0; q <= 6; q++) { const ang = Math.PI + (q / 6) * Math.PI; g.line(R(dcx + Math.cos(ang) * (r - 10)), R(dcy + Math.sin(ang) * (r - 10)), R(dcx + Math.cos(ang) * (r - 7)), R(dcy + Math.sin(ang) * (r - 7)), "#C8D8F0"); }
  const valAt = (i) => (i >= 0 && STEPS[i][2] ? Math.log10(STEPS[i][2]) : null);
  let cur = LOG0, prevV = LOG0, lastSet = -1;
  for (let i = 0; i <= si; i++) { const v = valAt(i); if (v !== null) { prevV = cur; cur = v; lastSet = STEPS[i][0]; } }
  const k = lastSet >= 0 ? sm(t, lastSet, lastSet + 0.7) : 1;
  const over = cur >= Math.log10(300) ? 0.03 * Math.sin(t * 40) * sm(t, lastSet + 0.6, lastSet + 0.8) : 0;   // the needle trembles at the end of the scale
  const lg = prevV + (cur - prevV) * (k + Math.sin(Math.PI * k) * 0.12), u = clamp01((lg - LOG0) / (LOG1 - LOG0)) + over;
  const ang = Math.PI + clamp01(u) * Math.PI;
  g.line(dcx, dcy, R(dcx + Math.cos(ang) * (r - 9)), R(dcy + Math.sin(ang) * (r - 9)), "#FDFEED"); g.line(dcx + 1, dcy, R(dcx + 1 + Math.cos(ang) * (r - 10)), R(dcy + Math.sin(ang) * (r - 10)), "#FDFEED");
  g.disc(dcx, dcy, 3, "#FF5A5A"); g.px(dcx - 1, dcy - 1, "#FFB0A0");
  g.text(TINY, "KM/H", dcx - 9, dcy - 14, "#9AB4D8", { scale: 1 });
}
