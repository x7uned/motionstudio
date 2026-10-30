// FINDER · RECORD mode: "A recording only catches the air." Two waveforms of the same voice: IN YOUR HEAD (thick orange
// bone part + thin cyan air part) and RECORDING with a pulsing REC dot — its orange part dissolves away on "air", leaving
// the thin cyan line. The waveforms scroll continuously.
import { EV } from "../timeline.mjs";
import { UI, mix, bayer, fade, MAIN, clamp01, sm, otext, rrect } from "./finder-ui.mjs";

const R = Math.round, SW = 388, SH = 288;
export const REC_DROP = [EV.air2 - 0.14, EV.air2 + 0.3];
const OR = ["#7A3A08", "#B85E10", "#F59A3A", "#FFC27A"], CY = ["#1E6A7A", "#3FA6C0", "#7FE3F0", "#D8FBFF"];
function wave(g, t, y0, h, orange, cyan = 1) {
  rrect(g, 14, y0 - 1, SW - 28, h + 2, 7, UI.O); rrect(g, 15, y0, SW - 30, h, 6, "#2A2040"); rrect(g, 17, y0 + 2, SW - 34, h - 4, 5, "#120C1D");
  const cy = y0 + R(h / 2), go = fade(g, orange);
  for (let x = 22; x < SW - 22; x += 3) {
    const ph = x + t * 64, syl = Math.pow(Math.abs(Math.sin(ph * 0.033)), 0.7) * (0.55 + 0.45 * Math.sin(ph * 0.0091 + 1.3)), env = 0.18 + 0.82 * syl;
    const ho = R((h / 2 - 6) * env), hc = Math.max(1, R((h / 2 - 6) * env * 0.42 * (0.55 + 0.45 * Math.abs(Math.sin(ph * 0.41)))));
    if (orange > 0) for (let y = -ho; y <= ho; y++) { const k = Math.abs(y) / Math.max(1, ho); go.rect(x, cy + y, 2, 1, k > 0.85 ? OR[1] : k > 0.5 ? OR[2] : OR[3]); }
    if (cyan > 0) for (let y = -hc; y <= hc; y++) g.rect(x, cy + y, 2, 1, Math.abs(y) === hc ? CY[1] : CY[2]);
  }
  for (let x = 20; x < SW - 20; x += 4) if (bayer(x, cy) < 0.5) g.px(x, cy, mix("#3B2C5C", "#7FE3F0", 0.15));
}
export function drawRecord(g, t) {
  for (let y = 0; y < SH; y++) { const k = y / SH, v = k * 3, lo = Math.floor(v); for (let x = 0; x < SW; x++) g.px(x, y, mix("#140E26", "#24183E", (v - lo > bayer(x, y) ? lo + 1 : lo) / 3)); }
  const drop = sm(t, REC_DROP[0], REC_DROP[1]);
  // IN YOUR HEAD: air + bone
  otext(g, "IN YOUR HEAD", 18, 12, UI.IV, { scale: 2 });
  const lw = (s) => g.measure(MAIN, s, { scale: 2 });
  const lx = SW - 18 - lw("AIR + BONE"), bx = lx + lw("AIR + ");
  otext(g, "AIR +", lx, 12, UI.CY, { scale: 2 }); otext(g, "BONE", bx, 12, UI.OR, { scale: 2 });
  wave(g, t, 32, 104, 1);
  // RECORDING: the bone part dissolves away on "air"
  otext(g, "RECORDING", 18, 152, UI.IV, { scale: 2 });
  const rx = 18 + lw("RECORDING") + 14, pulse = 0.55 + 0.45 * Math.sin(t * 6.5);
  g.disc(rx + 5, 158, 6, UI.O); g.disc(rx + 5, 158, 5, mix("#8A1A2A", UI.RED, pulse)); g.px(rx + 3, 156, mix("#C05060", "#FFB0B8", pulse));
  otext(g, "REC", rx + 15, 152, UI.RED, { scale: 2 });
  otext(g, "AIR", lx, 152, UI.CY, { scale: 2 }); otext(g, "+", lx + lw("AIR "), 152, UI.CY, { scale: 2, a: 1 - drop }); otext(g, "BONE", bx, 152, UI.OR, { scale: 2, a: 1 - drop });
  wave(g, t, 172, 104, 1 - drop);
}
