// Karaoke captions on a soft dithered shade (no overlay otherwise). Groups of ≤5 words / ≤22 characters, broken at
// sentence ends; each word fills yellow while spoken and settles to ivory. Same look as ../../tetris/film (frozen copy).
import { MAIN, mix, bayer } from "./raster.mjs";
import { P, smooth, clamp01 } from "./ui.mjs";

const R = Math.round, K = "#000000";
export function makeCaptions(VOICE, END, { y = 690, shadeY = 640, shadeH = 150 } = {}) {
  const WORDS = VOICE.words, TEXT = VOICE.text, gs = []; let cur = [];
  const after = (w) => (w.charEnd != null ? TEXT.slice(w.charEnd, w.charEnd + 3) : "").replace(/["“”\s]/g, "");
  const clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur);
  const GROUPS = gs.map((ws) => ({ ws, start: ws[0].start }));
  GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END - 0.17; });
  function shade(c) { c.tint(0, shadeY, c.w, shadeH, (x, yy) => 0.55 * Math.sin(Math.PI * (yy - shadeY) / shadeH), "#0B0812", 6); }
  function draw(c, t) {
    for (const g of GROUPS) {
      const first = g === GROUPS[0], show = first ? 0 : g.show, hide = g.hide;
      if (t < show || t > hide + 0.16) continue;
      const a = Math.min(smooth(t, show, show + (first ? 0.15 : 0.18)), 1 - smooth(t, hide, hide + 0.15)); if (a <= 0) continue;
      const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = y + R((1 - a) * 6);
      let x = R(270 - w / 2);
      words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
        c.text(MAIN, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
        c.text(MAIN, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : P.y) });
        x += ww + c.measure(MAIN, " ", o) + 3; });
    }
  }
  return { GROUPS, shade, draw };
}
