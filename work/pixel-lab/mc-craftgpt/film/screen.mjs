// «A chatbot built inside Minecraft» — what the lamp screen shows (one lamp = one pixel, on or off; 112 × 42 lamps).
// A chat: the player's bubble (top) with the question, the bot's bubble (middle) where the answer appears one token at
// a time with thinking dots, the progress bar of the current token, and — on cue — the 64-cell token strip.
// The picture is a function of a "screen state" built by scene.mjs; changes between states are per-lamp wipes there.
import { SCREEN_W, SCREEN_H } from "./world.mjs";

// a 3×5 font for the screen
const F35 = {
  A: ["010", "101", "111", "101", "101"], B: ["110", "101", "110", "101", "110"], C: ["011", "100", "100", "100", "011"], D: ["110", "101", "101", "101", "110"],
  E: ["111", "100", "110", "100", "111"], F: ["111", "100", "110", "100", "100"], G: ["011", "100", "101", "101", "011"], H: ["101", "101", "111", "101", "101"],
  I: ["111", "010", "010", "010", "111"], J: ["001", "001", "001", "101", "010"], K: ["101", "101", "110", "101", "101"], L: ["100", "100", "100", "100", "111"],
  M: ["101", "111", "111", "101", "101"], N: ["110", "101", "101", "101", "101"], O: ["010", "101", "101", "101", "010"], P: ["110", "101", "110", "100", "100"],
  Q: ["010", "101", "101", "110", "011"], R: ["110", "101", "110", "101", "101"], S: ["011", "100", "010", "001", "110"], T: ["111", "010", "010", "010", "010"],
  U: ["101", "101", "101", "101", "111"], V: ["101", "101", "101", "101", "010"], W: ["101", "101", "111", "111", "101"], X: ["101", "101", "010", "101", "101"],
  Y: ["101", "101", "010", "010", "010"], Z: ["111", "001", "010", "100", "111"], "?": ["110", "001", "010", "000", "010"], "!": ["010", "010", "010", "000", "010"],
  ".": ["000", "000", "000", "000", "010"], " ": ["000", "000", "000", "000", "000"],
};
export const CHAR_W = 8;                      // advance at scale 2 (3 px glyph ×2 + 2 px gap)
function glyphBit(ch, gx, gy) { const g = F35[ch] || F35[" "]; return gx >= 0 && gx < 3 && gy >= 0 && gy < 5 && g[gy][gx] === "1"; }
/** is lamp (u, v) part of `str` drawn at scale 2 with its top-left at (x0, y0)? Only the first `n` chars. */
export function textBit(str, x0, y0, u, v, n = 999) {
  const xs = u - x0, ys = v - y0; if (xs < 0 || ys < 0 || ys >= 10) return false;
  const i = Math.floor(xs / CHAR_W); if (i >= Math.min(n, str.length)) return false;
  const gx = Math.floor((xs % CHAR_W) / 2), gy = Math.floor(ys / 2); if ((xs % CHAR_W) >= 6) return false;
  return glyphBit(str[i], gx, gy);
}
const box = (u, v, x0, y0, x1, y1) => ((u === x0 || u === x1) && v >= y0 && v <= y1) || ((v === y0 || v === y1) && u >= x0 && u <= x1);

// layout (lamps): the player's bubble, the bot's bubble, the progress bar, the token strip
export const LAY = { userY: 3, userX: 9, botY: 18, botX: 9, pbY: 32, pbX0: 6, pbX1: 106, stripY: 36 };
export const QUESTION = "HOW ARE YOU?";
export const Q_TOKENS = [["HOW", 0], [" ARE", 3], [" YOU", 7], ["?", 11]];          // [text, first char index]
/** the bot's tokens as [text, char index] for an answer string split into words */
export const tokensOf = (s) => { const out = []; let i = 0; for (const w of s.split(" ")) { out.push([(i ? " " : "") + w, i]); i += w.length + 1; } return out; };

/**
 * st: { user: n chars typed (0..12), userBubble 0/1, tokenBoxes 0/1, bot: string, botN: chars shown, botBubble 0/1,
 *       dots: [0..1]×3 levels, pb: 0..1 progress or −1, strip: 0/1, used: cells in use }
 * returns 0..1 (lamp level) for lamp (u, v)
 */
export function screenLevel(st, u, v) {
  const L = LAY;
  // the player's line
  if (st.user > 0 && textBit(QUESTION, L.userX, L.userY, u, v, st.user)) return 1;
  if (st.userBubble && box(u, v, 6, 1, 105, 14)) return 1;
  if (st.tokenBoxes) for (const [tx, ci] of Q_TOKENS) { const x0 = L.userX + ci * CHAR_W + (tx[0] === " " ? CHAR_W - 3 : -2), x1 = L.userX + (ci + tx.length) * CHAR_W - 1; if (box(u, v, x0, 1, x1, 14)) return 1; }
  // the bot's line
  if (st.botN > 0 && textBit(st.bot, L.botX, L.botY, u, v, st.botN)) return 1;
  if (st.botBubble && box(u, v, 6, 16, 105, 29)) return 1;
  if (st.botBubble) { const cx0 = L.botX + st.botN * CHAR_W + (st.botN ? 4 : 2); for (let k = 0; k < 3; k++) { const cx = cx0 + k * 5; if (u >= cx && u < cx + 2 && v >= 21 && v < 23 && cx + 2 < 104) return st.dots[k]; } }
  // the progress bar of the current token: a frame and a fill
  if (st.pb >= 0 && v >= L.pbY - 1 && v <= L.pbY + 2 && u >= L.pbX0 - 1 && u <= L.pbX1 + 1) {
    if (v === L.pbY - 1 || v === L.pbY + 2 || u === L.pbX0 - 1 || u === L.pbX1 + 1) return (u + v) % 2 ? 1 : 0;   // a dotted frame
    return u - L.pbX0 < st.pb * (L.pbX1 - L.pbX0) ? 1 : 0;
  }
  // the token strip: 2 rows × 32 cells, a cell 2×2 lamps; used = solid, free = one dot
  if (st.strip && v >= L.stripY && v < L.stripY + 5 && u >= 8 && u < 8 + 32 * 3) {
    const row = v >= L.stripY + 3 ? 1 : 0, vy = v - L.stripY - row * 3, cu = u - 8, cell = Math.floor(cu / 3), ux = cu % 3; if (vy > 1 || ux > 1) return 0;
    const idx = row * 32 + cell; if (idx < st.used) return 1; return ux === 0 && vy === 0 ? 1 : 0;
  }
  return 0;
}
export { SCREEN_W, SCREEN_H };
