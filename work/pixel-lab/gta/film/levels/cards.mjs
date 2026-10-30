// Screen-space cards of «GTA 6: the city behind you» (all continuous: dissolves, small eased drops):
// · the GTA VI logo on the hook ("GTA 6 comes out this November") with "NOV 19 · 2026", and again, smaller, on
//   "Now GTA 6 has to do it for a whole state" with "A WHOLE STATE";
// · the quote card on "A former Rockstar technical director said … out of sight": OBBE VERMEIJ, ex-Rockstar North
//   technical director (GTA III, Vice City, San Andreas), and the rule OUT OF SIGHT → DELETED on "deleted";
// · the Rockstar Games logo on "Rockstar has used tricks like this since GTA 3" with "SINCE GTA III · 2001".
// Logos: Wikimedia Commons files (public domain text logos, trademarks of Take-Two/Rockstar), rasterised to the pixel
// grid in media/ (gta-vi-*.png, rockstar-110.png) — never redrawn by hand. Sources and SHA-256 in credits.txt.
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { EV } from "../timeline.mjs";
import { fade, mix, sm, ease, panel, C, MAIN, TINY, bayer } from "../cute.mjs";

const HERE = fileURLToPath(new URL("../media/", import.meta.url));
const R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v));
const back = (x) => { const c1 = 1.70158, c3 = c1 + 1; x = clamp01(x); return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
async function load(file) { const { data, info } = await sharp(HERE + file).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, d: data }; }
const GTA_BIG = await load("gta-vi-200.png"), GTA_SMALL = await load("gta-vi-120.png"), ROCKSTAR = await load("rockstar-110.png");

/** Blit an RGBA image with a dithered dissolve and a dark 1-px outline (outside the opaque pixels). */
function blit(c, img, x0, y0, a) {
  if (a <= 0) return;
  const on = (i, j) => i >= 0 && j >= 0 && i < img.w && j < img.h && img.d[(j * img.w + i) * 4 + 3] > 127;
  for (let j = -1; j <= img.h; j++) for (let i = -1; i <= img.w; i++) {
    const X = x0 + i, Y = y0 + j; if (a < 1 && a <= bayer(X, Y)) continue;
    if (on(i, j)) { const k = (j * img.w + i) * 4; c.px(X, Y, [img.d[k], img.d[k + 1], img.d[k + 2]]); }
    else if (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1)) c.px(X, Y, "#0B0812");
  }
}
function shadowText(c, font, s, txt, cx, y, col, a) { const g = fade(c, a), w = c.measure(font, txt, { scale: s }), x = R(cx - w / 2); for (const [dx, dy] of [[1, 1], [2, 2]]) g.text(font, txt, x + dx, y + dy, C.O, { scale: s }); g.text(font, txt, x, y, col, { scale: s }); }
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(sm(t, a, a + fi), 1 - sm(t, b - fo, b));

// ---------------------------------------------------------------- timings (exported for the sound)
export const HOOK_LOGO = [EV.gta1 - 0.05, EV.so1 + 0.1];
export const QUOTE = [EV.former - 0.1, EV.sight + 0.75];
export const ROCK = [EV.rockstar2 - 0.08, EV.now - 0.05];
export const STATE_LOGO = [EV.gta4 - 0.05, EV.so2 + 0.15];

export function hud(c, V, t) {
  // the hook logo: drops in from above with a little overshoot, then settles; NOV 19 · 2026 on "November"
  { const a = win(t, ...HOOK_LOGO, 0.25, 0.35); if (a > 0) {
    const k = clamp01((t - HOOK_LOGO[0]) / 0.45), y = R(112 - (1 - back(k)) * 30 + Math.sin(t * 2.4) * 1.5);
    blit(c, GTA_BIG, R(270 - GTA_BIG.w / 2), y, a);
    const na = a * sm(t, EV.november - 0.05, EV.november + 0.25); if (na > 0) { const g = fade(c, na); g.rrect(196, y + GTA_BIG.h + 8, 148, 22, "#2A1440", 2); g.rrect(197, y + GTA_BIG.h + 9, 146, 20, "#D8509A", 2); shadowText(c, MAIN, 2, "NOV 19 · 2026", 270, y + GTA_BIG.h + 13, C.IV, na); }
  } }
  // the quote card
  { const a = win(t, ...QUOTE, 0.3, 0.35); if (a > 0) {
    const k = clamp01((t - QUOTE[0]) / 0.4), x = 136, w = 390, h = 150, y = R(104 - (1 - back(k)) * 16);
    panel(c, x, y, w, h, a, C.Y);
    shadowText(c, TINY, 2, "EX-ROCKSTAR NORTH", x + w / 2, y + 12, "#B8D8FF", a);
    shadowText(c, TINY, 2, "TECHNICAL DIRECTOR", x + w / 2, y + 28, "#B8D8FF", a);
    shadowText(c, MAIN, 3, "OBBE VERMEIJ", x + w / 2, y + 48, C.Y, a * sm(t, EV.director - 0.1, EV.director + 0.25));
    const ga = a * sm(t, EV.old - 0.05, EV.old + 0.3); if (ga > 0) shadowText(c, TINY, 2, "GTA III · VICE CITY · SAN ANDREAS", x + w / 2, y + 84, "#E0CDF8", ga);
    const da = a * sm(t, EV.deleted - 0.05, EV.deleted + 0.2); if (da > 0) {
      const g = fade(c, da), lw = c.measure(MAIN, "OUT OF SIGHT → DELETED", { scale: 2 });
      const st = 2 + (1 - ease(clamp01((t - EV.deleted) / 0.25))) * 1.5;
      g.rrect(R(x + w / 2 - 150), y + 104, 300, 30, "#3A0A14", 2); g.rrect(R(x + w / 2 - 149), y + 105, 298, 28, "#C83040", 2);
      shadowText(c, MAIN, 2, "OUT OF SIGHT > DELETED", x + w / 2, y + 112 + R((st - 2) * 2), C.IV, da);
      void lw;
    }
  } }
  // the Rockstar logo with SINCE GTA III · 2001
  { const a = win(t, ...ROCK, 0.25, 0.3); if (a > 0) {
    const k = clamp01((t - ROCK[0]) / 0.45), y = R(116 - (1 - back(k)) * 24 + Math.sin(t * 2.2) * 1.5);
    blit(c, ROCKSTAR, R(270 - ROCKSTAR.w / 2), y, a);
    // a quick shine across the tile on its arrival
    const sh = (t - ROCK[0] - 0.35) / 0.5; if (sh > 0 && sh < 1) { const g = fade(c, a * 0.55); for (let j = 0; j < ROCKSTAR.h; j++) { const xx = R(270 - ROCKSTAR.w / 2 + sh * (ROCKSTAR.w + 40) - 20 - j * 0.4); for (let q = 0; q < 6; q++) { const i = xx + q - R(270 - ROCKSTAR.w / 2); if (i >= 0 && i < ROCKSTAR.w && ROCKSTAR.d[(j * ROCKSTAR.w + i) * 4 + 3] > 127) g.px(xx + q, y + j, "#FFFFFF"); } } }
    const sa = a * sm(t, EV.since - 0.05, EV.since + 0.25); if (sa > 0) { const g = fade(c, sa); g.rrect(170, y + ROCKSTAR.h + 10, 200, 22, "#2A1A08", 2); g.rrect(171, y + ROCKSTAR.h + 11, 198, 20, "#F2A81E", 2); { const w2 = c.measure(MAIN, "SINCE GTA III · 2001", { scale: 2 }); g.text(MAIN, "SINCE GTA III · 2001", R(270 - w2 / 2), y + ROCKSTAR.h + 15, "#1A0E04", { scale: 2 }); } }
  } }
  // GTA VI again, smaller, A WHOLE STATE on "whole"
  { const a = win(t, ...STATE_LOGO, 0.25, 0.3); if (a > 0) {
    const k = clamp01((t - STATE_LOGO[0]) / 0.45), y = R(108 - (1 - back(k)) * 24 + Math.sin(t * 2.4) * 1.5);
    blit(c, GTA_SMALL, R(270 - GTA_SMALL.w / 2), y, a);
    const wa = a * sm(t, EV.whole - 0.05, EV.whole + 0.25); if (wa > 0) { const g = fade(c, wa); g.rrect(186, y + GTA_SMALL.h + 8, 168, 22, "#2A1440", 2); g.rrect(187, y + GTA_SMALL.h + 9, 166, 20, "#D8509A", 2); shadowText(c, MAIN, 2, "A WHOLE STATE", 270, y + GTA_SMALL.h + 13, C.IV, wa); }
  } }
}
