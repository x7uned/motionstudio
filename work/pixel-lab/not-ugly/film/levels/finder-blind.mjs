// FINDER · TEST mode: "But in one test, people rated voices without knowing theirs was among them. They gave their own
// voice higher scores than other people did." BLIND TEST — 8 anonymous voice cards ("?" + a speaker); they light one
// after another as they "play" while their little stars fill (rated); on "theirs" one card turns over: YOURS; on
// "own … higher" two score rows: YOU ★★★★☆ vs OTHERS ★★★☆☆, the stars filling one by one.
import { EV, MODE } from "../timeline.mjs";
import { UI, mix, bayer, fade, MAIN, clamp01, sm, ease, lerp, backOut, otext, rrect, star, speaker, heart } from "./finder-ui.mjs";

const R = Math.round, SW = 388, SH = 288;
const CW = 84, CH = 52, GX = 8, X0 = 14, Y0 = 36, GY = 8;
export const CARDS_IN = MODE.test[0] + 0.12;
export const PLAY0 = EV.rated - 0.14, PLAY_D = 0.19, PLAY_LEN = 0.42;
export const RATING = [3, 2, 3, 2, 3, 4, 2, 3], YOURS_I = 5;
export const YOURS_TURN = [EV.theirs - 0.06, EV.theirs + 0.34];
export const ROWS_IN = [EV.gave - 0.18, EV.gave + 0.16];
export const STARS_YOU = [0, 1, 2, 3].map((j) => EV.own - 0.04 + j * 0.17), STARS_OTH = [0, 1, 2].map((j) => EV.other - 0.06 + j * 0.16);
const STAR_LEN = 0.16;

function bg(g) { for (let y = 0; y < SH; y++) { const v = (y / SH) * 3, lo = Math.floor(v); for (let x = 0; x < SW; x++) g.px(x, y, mix("#140E26", "#24183E", (v - lo > bayer(x, y) ? lo + 1 : lo) / 3)); } }

function voiceCard(g, t, i) {
  const col = i % 4, row = Math.floor(i / 4), x = X0 + col * (CW + GX), y = Y0 + row * (CH + GY);
  const ink = clamp01((t - (CARDS_IN + i * 0.07)) / 0.3), a = sm(ink, 0, 1); if (a <= 0) return;
  const s0 = PLAY0 + i * PLAY_D, lit = Math.min(sm(t, s0 - 0.05, s0 + 0.08), 1 - sm(t, s0 + PLAY_LEN - 0.1, s0 + PLAY_LEN + 0.08));
  const isY = i === YOURS_I, k = isY ? ease(clamp01((t - YOURS_TURN[0]) / (YOURS_TURN[1] - YOURS_TURN[0]))) : 0, sx = Math.cos(Math.PI * k), yours = k >= 0.5 ? 1 : 0;
  const v = fade(g, a), oy = R(6 * (1 - backOut(ink, 1.6))), cx = x + CW / 2, hw = Math.max(1, R((CW / 2) * Math.abs(sx))), xa = R(cx - hw), cy0 = y + oy;
  if (hw <= 2) { v.rect(R(cx), cy0, 1, CH, UI.PK); return; }
  const edge = yours ? UI.PK : mix(UI.p5, UI.Y, lit), fill = yours ? "#3A1028" : mix(UI.CARD, "#2E2048", lit);
  rrect(v, xa - 1, cy0 - 1, hw * 2 + 2, CH + 2, 6, UI.O); rrect(v, xa, cy0, hw * 2, CH, 5, edge); rrect(v, xa + 2, cy0 + 2, hw * 2 - 4, CH - 4, 4, fill);
  const ca = a * sm(Math.abs(sx), 0.55, 0.9); if (ca <= 0) return;
  if (!yours) {
    speaker(g, x + 10, cy0 + 18, mix(UI.L, UI.Y, lit), lit * (1.5 + 1.5 * Math.abs(Math.sin((t - s0) * 9))), ca);
    otext(g, "?", x + 58, cy0 + 7, mix(UI.L, UI.Y, lit), { scale: 3, align: "c", a: ca, shadow: false });
  } else {
    otext(g, "YOURS", cx, cy0 + 9, UI.IV, { scale: 2, align: "c", a: ca, shadow: false });
  }
  // little rating stars along the bottom: fill while the card plays
  for (let j = 0; j < 5; j++) { const f = j < RATING[i] ? clamp01((t - (s0 + 0.08 + j * 0.06)) / 0.12) : 0; star(g, x + 16 + j * 13, cy0 + 40, 6, f, { a: ca, rim: "#5A4A88", empty: "#22183A" }); }
  if (yours) heart(g, x + CW - 6, cy0 + 2, 16, clamp01((t - YOURS_TURN[1] + 0.1) / 0.4));
}
function scoreRow(g, t, y, label, col, filled, a) {
  if (a <= 0) return; const v = fade(g, a);
  rrect(v, 13, y - 1, SW - 26, 54, 8, UI.O); rrect(v, 14, y, SW - 28, 52, 7, mix(col, "#120C1D", 0.45)); rrect(v, 16, y + 2, SW - 32, 48, 6, "#1A1230");
  otext(g, label, 28, y + 16, col, { scale: 3, a });
  for (let j = 0; j < 5; j++) { const f = j < filled.length ? clamp01((t - filled[j]) / STAR_LEN) : 0; star(g, 168 + j * 44, y + 26, 16, f, { a }); }
}
export function drawBlind(g, t) {
  bg(g);
  otext(g, "BLIND TEST", SW / 2, 6, UI.Y, { scale: 3, align: "c", a: sm(t, MODE.test[0] - 0.1, MODE.test[0] + 0.3) });
  for (let i = 0; i < 8; i++) voiceCard(g, t, i);
  const ra = clamp01((t - ROWS_IN[0]) / (ROWS_IN[1] - ROWS_IN[0])), dy = R(8 * (1 - ease(ra)));
  scoreRow(g, t, 158 + dy, "YOU", UI.PK, STARS_YOU, sm(ra, 0, 1));
  scoreRow(g, t, 220 + dy, "OTHERS", UI.L, STARS_OTH, sm(ra, 0, 1));
}
