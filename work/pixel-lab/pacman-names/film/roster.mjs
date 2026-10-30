// The name card for «What the ghosts' names mean»: one card at the top of the frame with a row per ghost —
// the ghost, its English name, the US arcade nickname and the Japanese character word with its meaning.
// Columns and rows appear, cross out and cross-fade on the narration's words; never a one-frame change.
import { drawGhost } from "./sprites.mjs";
import { C, GC, panel, dtext, tw, fade, mix, bayer, smooth, clamp01, R } from "./hud.mjs";

export const ROWS = [
  { n: "red", en: "BLINKY", us: "SHADOW", jp: "OIKAKE", mean: "THE CHASER" },
  { n: "pink", en: "PINKY", us: "SPEEDY", jp: "MACHIBUSE", mean: "THE AMBUSH" },
  { n: "blue", en: "INKY", us: "BASHFUL", jp: "KIMAGURE", mean: "MOODY" },
  { n: "orange", en: "CLYDE", us: "POKEY", jp: "OTOBOKE", mean: "PLAYS DUMB" },
];

// a strike-through drawn in from the left (k 0..1)
function strike(c, x, y, w, k, col, a) { if (a <= 0 || k <= 0) return; const g = fade(c, a); g.rect(R(x - 3), R(y), R((w + 6) * k), 3, col); }

/**
 * S = { card, rows: [{ show, en, us, jp, mean, strike, focus }], header: { us, jp } } — every value 0..1
 * The card sits at (x, y, w, h); rows are evenly spaced. `focus` lifts one row (the ghost being explained) and
 * dims the others.
 */
export function drawRoster(c, S, t, { x = 22, y = 64, w = 496, rowH = 58 } = {}) {
  const a = S.card; if (a <= 0) return;
  const h = 44 + rowH * 4 + 8;
  panel(c, x, y, w, h, a, C.p7);
  // column headers
  const colEn = x + 74, colUs = x + 214, colJp = x + 214;
  const hu = a * S.header.us, hj = a * S.header.jp;
  dtext(c, "NAME", colEn, y + 14, C.L, a, 2);
  if (hu > 0) dtext(c, "U.S. NICKNAME", colUs, y + 14, C.L, hu * (1 - S.header.jp), 2);
  if (hj > 0) dtext(c, "JAPAN: WHAT HE DOES", colJp, y + 14, C.Y, hj, 2);
  const anyFocus = Math.max(...S.rows.map((r) => r.focus || 0));
  ROWS.forEach((row, i) => {
    const r = S.rows[i], ry = y + 44 + i * rowH, ra = a * r.show; if (ra <= 0) return;
    const dim = 1 - 0.55 * anyFocus * (1 - (r.focus || 0));
    // the ghost
    const cam = { cx: 0, cy: 0, z: 26 }, gx = x + 38, gy = ry + 24;
    drawGhost(c, { cx: -(gx - 270) / cam.z, cy: -(gy - 380) / cam.z, z: cam.z }, 0, 0, row.n, [1, 0], t * 2 + i * 0.3, ra * dim);
    if (r.focus > 0) { const g = fade(c, ra * r.focus); g.rect(x + 6, ry + 2, 3, rowH - 8, GC[row.n]); }
    // English name
    dtext(c, row.en, colEn, ry + 14, GC[row.n], ra * r.en * dim, 3);
    // US nickname (cross-fades out when the Japanese word comes in)
    const us = ra * r.us * (1 - r.jp) * dim;
    if (us > 0) { dtext(c, row.us, colUs, ry + 14, C.IV, us, 3); strike(c, colUs, ry + 24, tw(c, row.us, 3), r.strike, C.PK, us); }
    // Japanese word + meaning
    const jp = ra * r.jp * dim;
    if (jp > 0) { dtext(c, row.jp, colJp, ry + 6, C.Y, jp, 3); dtext(c, "= " + row.mean, colJp, ry + 34, C.IV, jp * r.mean, 2); }
  });
  return { x, y, w, h };
}
