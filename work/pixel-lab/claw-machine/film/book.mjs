// The service manual: our own pixel drawing with paraphrased lines (not a scan, no maker name). It slides up over the
// glass on "And their own manuals", its cover swings open around the spine (SETTINGS page: WIN RATE, PRIZE COST,
// PAYOUT %, CLAW POWER), and slides away when the owner opens the panel. On "One manual even says" it comes back open at
// the CLAW POWER page; a marker sweeps over «SET JUST / NOT ABLE / TO HOLD» on "set it just too weak to hold".
import { mix, bayer, fade, MAIN, TINY } from "../../../../renderer/pixel/raster.mjs";
import { sm, ease } from "./cute.mjs";
import { BOOK } from "./timeline.mjs";

const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const SP = 171, Y0 = 266, PH = 152, PW = 118, INK = "#2A2036", PAPER = ["#E8DCC0", "#F4ECD6", "#FBF6E8"], COVER = ["#1A1440", "#2A2066", "#3C2E8A"];

function pageBg(g, x, w, left) {
  for (let i = 0; i < w; i++) { const u = left ? 1 - i / w : i / w, s = u < 0.08 ? 0 : u < 0.2 ? 1 : 2; g.rect(x + i, Y0, 1, PH, PAPER[s]); }
  g.rect(x, Y0, w, 1, "#B8A888"); g.rect(x, Y0 + PH - 1, w, 1, "#9A8A6A");
}
function diagram(g, x, a) {   // our little claw diagram on the left page
  const f = fade(g, a), cx = x + 58;
  f.text(TINY, "FIG. 3", x + 12, Y0 + 12, "#6A5A70", { scale: 2 });
  f.rect(cx - 1, Y0 + 30, 2, 30, INK); f.rrect(cx - 10, Y0 + 58, 20, 12, INK, 2); f.rrect(cx - 9, Y0 + 59, 18, 10, "#B8B0C8", 2);
  for (const s of [-1, 1]) { f.line(cx + s * 6, Y0 + 70, cx + s * 18, Y0 + 92, INK); f.line(cx + s * 7, Y0 + 70, cx + s * 19, Y0 + 92, INK); f.line(cx + s * 18, Y0 + 92, cx + s * 10, Y0 + 106, INK); f.line(cx + s * 19, Y0 + 92, cx + s * 11, Y0 + 106, INK); }
  f.ellipse(cx, Y0 + 100, 9, 8, "#E26A88"); f.rect(cx - 4, Y0 + 98, 2, 2, INK); f.rect(cx + 3, Y0 + 98, 2, 2, INK);
  f.text(TINY, "GRIP", x + 12, Y0 + 124, INK, { scale: 2 }); f.line(x + 46, Y0 + 128, cx - 14, Y0 + 96, "#8A7A90");
}
function settingsPage(g, x, a) {
  const f = fade(g, a); f.text(MAIN, "SETTINGS", x + 10, Y0 + 12, INK, { scale: 2 }); f.rect(x + 10, Y0 + 30, PW - 20, 1, "#8A7A90");
  ["WIN RATE", "PRIZE COST", "PAYOUT %", "CLAW POWER"].forEach((s, i) => { const y = Y0 + 42 + i * 24; f.text(TINY, s, x + 10, y, INK, { scale: 2 }); for (let X = x + 12 + f.measure(TINY, s, { scale: 2 }); X < x + PW - 14; X += 4) f.px(X, y + 9, "#8A7A90"); f.rect(x + PW - 14, y + 2, 4, 6, "#8A7A90"); });
}
function powerPage(g, x, t, a) {
  const f = fade(g, a); f.text(MAIN, "POWER", x + 10, Y0 + 12, INK, { scale: 2 }); f.rect(x + 10, Y0 + 30, PW - 20, 1, "#8A7A90");
  f.text(TINY, "RELEASE V:", x + 10, Y0 + 40, "#6A5A70", { scale: 2 });
  const lines = ["SET JUST", "NOT ABLE", "TO HOLD"], [m0, m1] = BOOK.mark, per = (m1 - m0) / lines.length;
  lines.forEach((s, i) => { const y = Y0 + 62 + i * 26, k = ease(clamp01((t - m0 - i * per) / per)), w = f.measure(MAIN, s, { scale: 2 });
    if (k > 0) for (let X = x + 6; X < x + 6 + (w + 10) * k; X++) for (let Y = y - 4; Y < y + 18; Y++) if (((X + Y) & 3) || Y > y - 3) f.px(X, Y, "#F8E04A");
    f.text(MAIN, s, x + 10, y, INK, { scale: 2 }); });
}
function cover(g, x, w, a) {
  for (let i = 0; i < w; i++) g.rect(x + i, Y0 - 2, 1, PH + 4, i < 3 ? COVER[0] : COVER[1 + ((i >> 4) & 1 ? 0 : 1) * 0 + (i > w - 3 ? -1 : 0)]);
  g.rect(x, Y0 - 2, w, 2, COVER[2]);
  if (w > PW * 0.75) { const f = fade(g, a * sm(w / PW, 0.75, 0.95)); f.text(MAIN, "SERVICE", x + 16, Y0 + 40, "#F4CA50", { scale: 2 }); f.text(MAIN, "MANUAL", x + 16, Y0 + 60, "#F4CA50", { scale: 2 }); f.rect(x + 16, Y0 + 82, 84, 2, "#B88A20");
    f.rect(x + 56, Y0 + 96, 2, 14, "#B88A20"); f.rrect(x + 50, Y0 + 108, 14, 8, "#B88A20", 2); f.line(x + 52, Y0 + 116, x + 46, Y0 + 128, "#B88A20"); f.line(x + 62, Y0 + 116, x + 68, Y0 + 128, "#B88A20"); }
}

export function drawBook(c, t) {
  for (const [w0, w1, kind] of [[BOOK.a[0], BOOK.a[1], "a"], [BOOK.b[0], BOOK.b[1], "b"]]) {
    if (t < w0 || t > w1 + 0.45) continue;
    const kin = ease(clamp01((t - w0) / 0.4)), kout = ease(clamp01((t - w1) / 0.45)), a = Math.min(sm(t, w0, w0 + 0.3), 1 - sm(t, w1 + 0.1, w1 + 0.45)); if (a <= 0) continue;
    const dy = R((1 - kin) * 60 + kout * 70), g0 = fade(c, a), g = Object.create(g0);
    // shift everything drawn through g by dy (the book slides)
    g.px = (x, y, col) => g0.px(x, y + dy, col); g.rect = function (x, y, w, h, col) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.px(i, j, col); };
    // soft shadow under the book
    const th = kind === "a" ? Math.PI * ease(clamp01((t - BOOK.open[0]) / (BOOK.open[1] - BOOK.open[0]))) : Math.PI, cw = R(PW * Math.abs(Math.cos(th))), sx0 = th >= Math.PI / 2 ? SP - cw : SP;
    c.tint(sx0 - 4, Y0 + dy + 8, SP + PW + 10 - sx0, PH + 8, () => 0.45 * a, "#000000", 3);
    if (kind === "a") {
      pageBg(g, SP, PW, false); settingsPage(g, SP, 1);
      if (th < Math.PI / 2) cover(g, SP, Math.max(2, cw), 1);
      else { pageBg(g, SP - cw, cw, true); if (cw > PW * 0.8) diagram(g, SP - PW, sm(cw / PW, 0.8, 1)); g.rect(SP - cw - 2, Y0 - 2, 2, PH + 4, COVER[1]); }
      g.rect(SP - 1, Y0, 2, PH, "#8A7A60");
    } else {
      pageBg(g, SP - PW, PW, true); diagram(g, SP - PW, 1); g.rect(SP - PW - 2, Y0 - 2, 2, PH + 4, COVER[1]);
      pageBg(g, SP, PW, false); powerPage(g, SP, t, 1); g.rect(SP + PW, Y0 - 2, 2, PH + 4, COVER[1]);
      g.rect(SP - 1, Y0, 2, PH, "#8A7A60");
    }
  }
}
