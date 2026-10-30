// Shared drawing helpers for the Pac-Man follow-up films (frozen per film): panels, tags, dashed lines, target markers,
// the cabinet under the maze (so the picture runs to the bottom edge), the caption shade and karaoke captions.
// Everything fades through fade() (dither) — never a one-frame change.
import { MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { toS, drawPac } from "./sprites.mjs";

export const GW = 540, GH = 960, K = "#000000", R = Math.round;
export const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", p5: "#6E4FB0", p7: "#B08AE8", GREY: "#9AA0C8" };
export const GC = { red: "#FF4D5E", pink: "#FF9FD6", blue: "#45E3FF", orange: "#FFA638" };
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));

export function panel(c, x, y, w, h, a = 1, edge = C.p7) { if (a <= 0) return; x = R(x); y = R(y); w = R(w); h = R(h); const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(C.CARD, "#1D1430", (j - y) / h)); }
export const dtext = (c, s, x, y, col, a = 1, scale = 2, font = MAIN) => { if (a > 0) fade(c, a).text(font, s, R(x), R(y), col, { scale }); };
export const tw = (c, s, scale = 2, font = MAIN) => c.measure(font, s, { scale });
/** a label box; first line in `col`, the rest ivory (or per-line colours) */
export function tag(c, lines, cx, y, a, col = C.Y, scale = 2, { cols = null, minY = 10, maxY = 626 } = {}) {
  if (a <= 0) return null;
  const w = Math.max(...lines.map((l) => tw(c, l, scale))) + 20, h = lines.length * (8 * scale + 4) + 10;
  const x = R(Math.max(10, Math.min(GW - 10 - w, cx - w / 2))), yy = R(Math.max(minY, Math.min(maxY - h, y)));
  panel(c, x, yy, w, h, a, col); lines.forEach((l, i) => dtext(c, l, x + 10, yy + 7 + i * (8 * scale + 4), cols ? cols[i] : i ? C.IV : col, a, scale)); return { x, y: yy, w, h };
}
/** thick dashed line in screen space with marching dashes; `upto` draws it in from the start */
export function dash(c, x0, y0, x1, y1, col, a, t = 0, th = 2, on = 6, off = 4, upto = 1) {
  if (a <= 0) return; const g = fade(c, a), L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L * upto), ph = (t * 24) % (on + off);
  for (let i = 0; i <= n; i++) { if ((i + on + off - ph) % (on + off) >= on) continue; const k = i / Math.max(1, L), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; g.rect(R(x - th / 2), R(y - th / 2), th, th, col); }
}
/** target crosshair on tile (tx, ty) */
export function marker(c, cam, tx, ty, col, a, t = 0, label = null, lscale = 2) {
  if (a <= 0) return; const [x0, y0] = toS(cam, tx, ty), s = cam.z, pul = 1 + 0.08 * Math.sin(t * 7), q = s * 0.5 * pul, cx = x0 + s / 2, cy = y0 + s / 2, g = fade(c, a), L = Math.max(4, R(q * 0.55)), th = Math.max(2, R(s / 26));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = R(cx + sx * q), Y = R(cy + sy * q); g.rect(sx < 0 ? X : X - L, Y - (sy < 0 ? 0 : th - 1), L, th, col); g.rect(X - (sx < 0 ? 0 : th - 1), sy < 0 ? Y : Y - L, th, L, col); }
  g.rect(R(cx - th), R(cy - th), 2 * th, 2 * th, col);
  if (label) { const lw = tw(c, label, lscale), lx = Math.max(8, Math.min(GW - 8 - lw, cx - lw / 2)), ly = Math.max(8, Math.min(620, cy - q - 10 - 6 * lscale)); dtext(c, label, lx, ly, col, a, lscale); }
}
/** dotted ring of radius r (screen px) */
export function ring(c, cx, cy, r, col, a, t = 0) { if (a <= 0) return; const g = fade(c, a), n = Math.ceil((2 * Math.PI * r) / 3); for (let i = 0; i < n; i++) { if (i % 4 === 3) continue; const an = (2 * Math.PI * i) / n + t * 0.15; g.rect(R(cx + Math.cos(an) * r) - 1, R(cy + Math.sin(an) * r) - 1, 2, 2, col); } }

/** the cabinet around the screen: violet side panels and top beyond the maze (with a bezel line), the lives on the
 *  screen's bottom line, then a control panel with a joystick and two buttons down to the bottom edge (our own drawing) */
export function drawCabinet(c, cam, MH, { lives = 2, MW = 21 } = {}) {
  for (let i = 0; i < lives; i++) drawPac(c, cam, 1.6 + i * 1.6, MH + 0.55, Math.PI, 0.45, 1, 0.55);
  { const [XL, YT] = toS(cam, -0.95, -1.05), [XR, YB] = toS(cam, MW + 0.95, MH + 1.6), xl = R(XL), xr = R(XR), yt = R(YT), yb = R(YB), d = c.d;
    if (xl > 0 || xr < GW || yt > 0) {
      const A = [0x2A, 0x1F, 0x48], B = [0x12, 0x0C, 0x22], E1 = [0x2A, 0x1F, 0x40], E2 = [0x6E, 0x4F, 0xB0];
      for (let y = 0; y < Math.min(GH, yb); y++) for (let x = 0; x < GW; x++) {
        const out = x < xl ? xl - x : x >= xr ? x - xr + 1 : y < yt ? yt - y : 0; if (!out) continue;
        let col;
        if (out <= 2) col = E2; else if (out <= 6) col = E1;
        else { const k = Math.min(1, (out - 6) / 120), q = Math.floor(k * 4 + bayer(x, y)) / 4; col = [0, 1, 2].map((j) => Math.round(A[j] + (B[j] - A[j]) * q)); if ((x + y * 2) % 23 === 0 && out > 14) col = [0x3B, 0x2C, 0x5C]; }
        const i = (y * GW + x) * 3; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
      }
    } }
  const [, Y0] = toS(cam, 0, MH + 1.6); if (Y0 >= GH) return; const y0 = Math.max(0, R(Y0));
  c.rect(0, y0, GW, 4, "#2A1F40"); c.rect(0, y0 + 4, GW, 2, "#6E4FB0");
  for (let y = y0 + 6; y < GH; y++) { const k = Math.min(1, (y - y0) / 220), q = Math.floor(k * 4 + bayer(3, y)) / 4; c.rect(0, y, GW, 1, mix("#2A1F48", "#120C22", q)); }
  const [jx] = toS(cam, 6, 0), jy = y0 + 120, z = cam.z / 24.5;
  if (jy - 60 * z < GH) { c.rect(R(jx - 34 * z), R(jy + 18 * z), R(68 * z), R(12 * z), "#0B0812"); c.rect(R(jx - 4 * z), R(jy - 30 * z), Math.max(2, R(8 * z)), R(50 * z), "#1A1A22"); c.disc(R(jx), R(jy - 36 * z), R(16 * z), "#E03056"); c.disc(R(jx - 5 * z), R(jy - 41 * z), Math.max(1, R(5 * z)), "#FF8FA0"); }
  const [bx] = toS(cam, 14, 0); for (let i = 0; i < 2; i++) { const X = R(bx + i * 60 * z), Y = R(jy + 4 * z); if (Y - 20 * z > GH) break; c.disc(X, Y + 3, R(18 * z), "#0B0812"); c.disc(X, Y, R(18 * z), i ? "#F4CA50" : "#45E3FF"); c.disc(X - R(5 * z), Y - R(5 * z), Math.max(1, R(5 * z)), "#FFFFFF"); }
}

/** the soft caption shade: dithered, static, only behind the caption row */
export const captionShade = (c) => c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);

/** karaoke caption groups from the voice words (same rules as the earlier pixel films) */
export function captionGroups(VOICE, WORDS, END, { shownOf = null } = {}) {
  const T = VOICE.text, gs = []; let cur = [];
  const after = (w) => T.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => (shownOf ? shownOf(w) : w.text).replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur);
  const G = gs.map((ws) => ({ ws, start: ws[0].start }));
  G.forEach((g, i) => { const next = G[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
  return G;
}
export function captions(c, t, GROUPS, { y = 690, firstFromZero = true } = {}) {
  for (const g of GROUPS) {
    // loop seam: the first group fades in from frame 0 (the last group is gone before END)
    const first = firstFromZero && g === GROUPS[0], show = first ? 0 : g.show;
    if (t < show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, show, show + (first ? 0.15 : 0.18)), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, C.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(C.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? C.IV : C.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}
export { MAIN, TINY, mix, bayer, fade };
