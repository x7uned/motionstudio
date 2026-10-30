// catalog-v1 copy (2026-10-26) of work/pixel-lab/deadliest/film/levels/meter.mjs#skull (the 9×8 cute skull at the end of
// the deadliness log bar; rows and colours unchanged). Changes: each skull pixel is a block of B screen px (float edges,
// dithered partial rows, so zoom and the chatter move it without whole-row jumps); the lower two rows (jaw and teeth) can
// drop by a fraction of a block; the eye colour can be mixed toward a glow colour.
const ROWS = ["..XXXXX..", ".XXXXXXX.", "XXXXXXXXX", "XOOXXXOOX", "XOOXXXOOX", ".XXXOXXX.", "..XXXXX..", "..X.X.X.."];
const hexRGB = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hexOf = (v) => "#" + v.map((n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
export const mixHex = (a, b, k) => { const x = hexRGB(a), y = hexRGB(b); return hexOf(x.map((v, i) => v + (y[i] - v) * k)); };

// draw the skull centred at (cx, cy), block size B (float); jaw: drop of the lower rows in blocks (0 closed … 0.4 open);
// glow: 0..1 mix of the eyes toward `glowCol`; col = bone, eye = socket colour. Every picture row has one owner: a row
// that straddles two blocks (a moving jaw edge, or a zoomed block size) goes to the upper block with the Bayer share of
// its overlap and to the lower one otherwise, so an edge dissolves in dithered steps and no seam dots appear between
// blocks. Columns are cell-centred (no seams either).
import { bayer } from "./cute.mjs";
const EMPTY = ".........";
const EXT = [EMPTY, ...ROWS, EMPTY];           // ext row r = skull row r − 1; rows −1 and 8 are empty
export function drawSkull(c, cx, cy, B, col, eye, o = {}) {
  const jaw = o.jaw ?? 0, glow = o.glow ?? 0, glowCol = o.glowCol ?? "#E03056", eyeCol = glow > 0 ? mixHex(eye, glowCol, glow) : eye;
  const x0 = cx - 4.5 * B, y0 = cy - 4 * B;
  // top edge of ext row r: rows 6 and 7 (and the bottom edge) move with the jaw
  const bnd = (r) => (r <= 0 ? -1e9 : r >= 10 ? 1e9 : y0 + (r - 1) * B + ((r - 1) >= 6 ? jaw * B : 0));
  for (let Y = Math.floor(y0) - 1; Y < Math.ceil(bnd(9) + B) + 1; Y++) {
    const hits = [];
    for (let r = 0; r < EXT.length; r++) {
      const ov = Math.min(Y + 1, bnd(r + 1)) - Math.max(Y, bnd(r));
      if (ov > 1e-6) hits.push([r, ov]);
    }
    if (!hits.length) continue;
    for (let X = Math.floor(x0); X < Math.ceil(x0 + 9 * B); X++) {
      const i = Math.floor((X + 0.5 - x0) / B);
      if (i < 0 || i > 8) continue;
      let r = hits[0][0];
      if (hits.length > 1) r = bayer(X, Y) < hits[0][1] ? hits[0][0] : hits[1][0];
      const ch = EXT[r][i];
      if (ch === ".") continue;
      c.px(X, Y, ch === "O" ? eyeCol : col);
    }
  }
}
