// Deaths-per-year readout (screen space, top of the frame): the current animal's head in a little frame and an LCD with
// the number of people it kills per year (rough estimates, ../facts.md). The digits roll when a new number is spoken;
// a log bar below runs from SAFE (1) to DEADLY (1,000,000) with a cute skull at the end. "???" while the film asks
// which animal is number one; the mosquito's 600,000 lands on "six hundred thousand"; the panel leaves before the
// share/follow card. Every change is continuous (dissolves, rolling digits, gliding bar).
import { EV, LV } from "../timeline.mjs";
import { fade, mix, bayer, sm, rnd, MAIN, TINY } from "../cute.mjs";
import * as ocean from "./ocean.mjs";
import * as savanna from "./savanna.mjs";
import * as river from "./river.mjs";
import * as swamp from "./swamp.mjs";
import * as desert from "./desert.mjs";
import * as village from "./village.mjs";
import * as jungle from "./jungle.mjs";
import * as camp from "./camp.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
// [time the value is set, label, people/year, small caption, icon module]
export const STEPS = [
  [EV.ten, "10", 10, "PEOPLE / YEAR", ocean],
  [EV.hundred1, "100", 100, "PEOPLE / YEAR", savanna],
  [EV.five, "500", 500, "PEOPLE / YEAR", river],
  [EV.thousand1, "1,000", 1000, "UP TO · PEOPLE / YEAR", swamp],
  [EV.three, "3,000", 3000, "PEOPLE / YEAR", desert],
  [EV.sixty, "60,000", 6e4, "PEOPLE / YEAR", village],
  [EV.hundred3, "100,000", 1e5, "PEOPLE / YEAR", jungle],
  [EV.one2, "???", null, "NUMBER ONE?", null],
  [EV.six, "600,000", 6e5, "PEOPLE / YEAR", camp],
];
// which animal's head is in the frame (follows the levels; "?" between the snake and the mosquito)
const ICONS = [[LV.shark[0], ocean], [LV.lion[0], savanna], [LV.hippo[0], river], [LV.croc[0], swamp], [LV.scorpion[0], desert], [LV.dog[0], village], [LV.snake[0], jungle], [EV.so + 0.4, null], [EV.mosquito1, camp]];
const SHOW = [EV.sharks - 0.25, EV.liked - 0.35];   // panel fades in after the hook and out before the share card
const ROLL = 0.45, X = 84, Y = 100, Wd = 372, H = 86;
const LOG0 = 0, LOG1 = 6;
const at = (list, t) => { let i = -1; while (i < list.length - 1 && list[i + 1][0] <= t) i++; return i; };

/** Number in MAIN with a real descending comma (the font's comma reads like a dot at this size). */
function num(c, text, x, y, col, s) {
  let cx = x;
  for (const ch of text) {
    if (ch === ",") { c.rect(cx + s, y + 5 * s, s, 2 * s, col); c.rect(cx, y + 7 * s, s, s, col); cx += 3 * s; continue; }
    c.text(MAIN, ch, cx, y, col, { scale: s }); cx += c.measure(MAIN, ch, { scale: s }) + s;
  }
}
function skull(c, x, y, col, eye) { // 9×8 cute skull
  const rows = ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "XOOXXXOOX", "XOOXXXOOX", ".XXXOXXX.", "..XXXXX..", "..X.X.X.."];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === "X") c.px(x + i, y + j, col); else if (ch === "O") c.px(x + i, y + j, eye); }));
}

export function hud(c, V, t) {
  const a = Math.min(sm(t, SHOW[0], SHOW[0] + 0.35), 1 - sm(t, SHOW[1], SHOW[1] + 0.3));
  if (a <= 0) return;
  const g = fade(c, a);
  // panel body
  g.rrect(X, Y, Wd, H, "#1E1830", 3); g.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#3A3058", 3); g.rect(X + 5, Y + 3, Wd - 10, 1, "#5E5488");
  // icon frame (left)
  const fx = X + 8, fy = Y + 8, fw = 66, fh = 70;
  g.rrect(fx, fy, fw, fh, "#120E20", 2); g.rect(fx + 2, fy + 1, fw - 4, 1, "#2A2244");
  const ii = at(ICONS, t);
  if (ii >= 0) {
    const [t0, mod] = ICONS[ii], prev = ii > 0 ? ICONS[ii - 1][1] : null, k = sm(t, t0, t0 + 0.3);
    const draw = (m, aa) => { if (aa <= 0) return; if (m) m.ICON?.(c, fx + fw / 2, fy + fh / 2, aa * a); else { const q = fade(c, aa * a); q.text(MAIN, "?", R(fx + fw / 2 - 7), R(fy + fh / 2 - 10 + Math.sin(t * 6) * 1.5), "#F4CA50", { scale: 4 }); } };
    if (k < 1 && ii > 0) draw(prev, 1 - k);
    draw(mod, k);
  }
  // LCD (right)
  const lx = fx + fw + 8, ly = Y + 8, lw = X + Wd - 8 - lx, lh = 48;
  g.rrect(lx, ly, lw, lh, "#1A0A0E", 2);
  for (let j = ly + 1; j < ly + lh - 1; j++) for (let i = lx + 1; i < lx + lw - 1; i++) if (((i + j) & 3) === 0) g.px(i, j, "#241015");
  const si = at(STEPS, t);
  const cap = si >= 0 ? STEPS[si][3] : "PEOPLE / YEAR";
  g.text(TINY, cap, lx + 6, ly + 5, "#7A3440", { scale: 1 });
  // value with rolling digits for ROLL seconds after each change
  let shown = si >= 0 ? STEPS[si][1] : "---";
  if (si >= 0) {
    const [t0, label] = STEPS[si], k = t - t0;
    if (k >= 0 && k < ROLL) shown = [...label].map((ch, j) => (/[0-9]/.test(ch) && rnd(Math.floor(t * 30) * 31 + j) < 1 - k / ROLL ? String(Math.floor(rnd(Math.floor(t * 30) * 17 + j * 3) * 10)) : ch)).join("");
    if (label === "???") shown = [..."???"].map((ch, j) => (Math.sin(t * 9 + j * 2) > 0.2 ? "?" : " ")).join("");
  }
  const s = 4, w = [...shown].reduce((acc, ch) => acc + (ch === "," ? 3 * s : c.measure(MAIN, ch, { scale: s }) + s), -s), tx = R(lx + lw - 10 - w), ty = ly + 17;
  const ghost = "8,888,888"; const gw = c.measure(MAIN, ghost, { scale: s }); fade(c, 0.3 * a).text(MAIN, ghost, R(lx + lw - 10 - gw), ty, "#3A1018", { scale: s });
  const hot = si >= 0 && STEPS[si][2] ? clamp01((Math.log10(STEPS[si][2]) - 1) / 4.8) : 0;
  const col = mix("#FFD27A", "#FF5A5A", hot);
  num(g, shown, tx + 1, ty + 1, "#0A0306", s); num(g, shown, tx, ty, col, s);
  // the mosquito's number: a short red flash of the LCD when it lands
  const flash = sm(t, EV.thousand5, EV.thousand5 + 0.1) * (1 - sm(t, EV.thousand5 + 0.2, EV.thousand5 + 0.9));
  if (flash > 0) c.tint(lx + 1, ly + 1, lw - 2, lh - 2, () => flash * 0.35 * a, "#FF3040", 4);
  // log bar 1 → 1,000,000 with a marker that glides to the new number
  const valAt = (i) => (i >= 0 && STEPS[i][2] ? Math.log10(STEPS[i][2]) : null);
  let cur = 0, prevV = 0;
  for (let i = 0; i <= si; i++) { const v = valAt(i); if (v !== null) { prevV = cur; cur = v; } }
  const lastSet = (() => { for (let i = si; i >= 0; i--) if (valAt(i) !== null) return STEPS[i][0]; return -1; })();
  const lg = prevV + (cur - prevV) * (lastSet >= 0 ? sm(t, lastSet, lastSet + 0.6) : 1);
  const bx = lx, by = ly + lh + 6, bw = lw - 14, mx = R(bx + ((lg - LOG0) / (LOG1 - LOG0)) * bw);
  g.rect(bx, by, bw, 5, "#120E20");
  for (let x = bx; x < mx; x++) g.rect(x, by, 1, 5, mix(mix("#65DA41", "#F4CA50", clamp01(((x - bx) / bw) * 2)), "#FF4A4A", clamp01(((x - bx) / bw) * 2 - 1)));
  for (let q = 0; q <= 6; q++) g.rect(R(bx + (q / 6) * bw), by - 1, 1, 7, "#5E5488");
  if (cur > 0) { g.rect(mx - 1, by - 3, 3, 11, "#FDFEED"); g.px(mx, by - 4, "#FDFEED"); }
  g.text(TINY, "SAFE", bx, by + 8, "#9AE88A", { scale: 1 }); const dw = c.measure(TINY, "DEADLY", { scale: 1 }); g.text(TINY, "DEADLY", bx + bw - dw, by + 8, "#FF8A8A", { scale: 1 });
  skull(g, bx + bw + 4, by - 2, "#F2ECFF", "#2A1030");
}
