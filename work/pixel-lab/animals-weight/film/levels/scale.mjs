// Weighing-scale readout (screen space, top of the frame): a small digital scale display that shows the current animal's
// weight. The digits roll for a moment when a new weight is spoken; a log bar below runs from 0.1 g to 150 t.
// Identical at t = 0 and t = END (both show the bee's 0.1 G), so the loop seam stays clean.
import { EV, LV, END } from "../timeline.mjs";
import { fade, mix, bayer, sm, rnd, MAIN, TINY, C } from "../cute.mjs";

const R = Math.round;
// [time the value is set, label, grams]
const STEPS = [
  [-1, "0.1 G", 0.1], [EV.lessThanTwo, "1.6 G", 1.6], [EV.twentyGrams, "20 G", 20], [EV.cat + 0.25, "4 KG", 4e3], [EV.twentyKg, "20 KG", 2e4],
  [EV.people, "62 KG", 6.2e4], [EV.halfTonne, "500 KG", 5e5], [EV.still, "2 T", 2e6], [EV.six, "6 T", 6e6], [EV.blueWhale2 + 0.3, "150 T", 1.5e8],
  [EV.bees, "0.1 G", 0.1],
];
const ROLL = 0.42, X = 120, Y = 108, Wd = 300, H = 82;
const LOG0 = Math.log10(0.1), LOG1 = Math.log10(1.5e8);
function current(t) { let i = 0; while (i < STEPS.length - 1 && STEPS[i + 1][0] <= t) i++; return i; }

export function hud(c, V, t) {
  const g = c;
  // panel: a weighing-scale display (rounded dark body, inset LCD)
  g.rrect(X, Y, Wd, H, "#2A2440", 3); g.rrect(X + 2, Y + 2, Wd - 4, H - 4, "#4A4268", 3); g.rect(X + 4, Y + 3, Wd - 8, 1, "#6E6696");
  const lx = X + 10, ly = Y + 10, lw = Wd - 20, lh = 44;
  g.rrect(lx, ly, lw, lh, "#0A1A10", 2);
  for (let j = ly + 1; j < ly + lh - 1; j++) for (let i = lx + 1; i < lx + lw - 1; i++) if (((i + j) & 3) === 0) g.px(i, j, "#0E2414");
  g.text(TINY, "WEIGHT", lx + 6, ly + 5, "#2E6A3A", { scale: 1 });
  // the value: rolling digits for ROLL seconds after each change
  const i = current(t), [t0, label, grams] = STEPS[i], k = t - t0;
  let shown = label;
  if (k >= 0 && k < ROLL && i > 0) shown = [...label].map((ch, j) => (/[0-9]/.test(ch) && rnd(Math.floor(t * 30) * 31 + j) < 1 - k / ROLL ? String(Math.floor(rnd(Math.floor(t * 30) * 17 + j * 3) * 10)) : ch)).join("");
  const s = 4, w = c.measure(MAIN, shown, { scale: s }), tx = R(lx + lw - 10 - w), ty = ly + 8;
  // ghost "8" segments behind the digits, like a real LCD
  const ghost = "8".repeat(6), gw = c.measure(MAIN, ghost, { scale: s }); fade(c, 0.35).text(MAIN, ghost, R(lx + lw - 10 - gw), ty, "#123A1C", { scale: s });
  g.text(MAIN, shown, tx + 1, ty + 1, "#06140A", { scale: s }); g.text(MAIN, shown, tx, ty, "#8CFF7A", { scale: s });
  // log bar 0.1 g → 150 t with a marker that glides to the new weight
  const prev = STEPS[Math.max(0, i - 1)][2], cur = grams, e = i > 0 ? sm(k, 0, 0.6) : 1, lg = Math.log10(prev) + (Math.log10(cur) - Math.log10(prev)) * e;
  const bx = X + 12, by = Y + H - 20, bw = Wd - 24, mx = R(bx + ((lg - LOG0) / (LOG1 - LOG0)) * bw);
  g.rect(bx, by, bw, 4, "#1A1430"); for (let q = 0; q <= 9; q++) g.rect(R(bx + (q / 9) * bw), by - 2, 1, 8, "#6E6696");
  for (let x = bx; x < mx; x++) g.rect(x, by, 1, 4, mix("#65DA41", "#F4CA50", (x - bx) / bw));
  g.rect(mx - 1, by - 4, 3, 12, "#FDFEED"); g.px(mx, by - 5, "#FDFEED");
  g.text(TINY, "LIGHT", bx, by + 7, "#B8B0E0", { scale: 1 }); const hw = c.measure(TINY, "HEAVY", { scale: 1 }); g.text(TINY, "HEAVY", bx + bw - hw, by + 7, "#B8B0E0", { scale: 1 });
}
