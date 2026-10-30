// Screen-space overlays of «The ghast's cry»: text, tags, cards and the SOUND LAB panel (waveform + spectrogram drawn from
// audio/spec.json, i.e. from exactly the sound that plays). Text/palette/panel/tag/pointer are frozen copies of
// ping/film/world.mjs + hud.mjs. Everything fades through fade() (dither) — never a one-frame change.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, TINY, mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round;
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));

// ---------------------------------------------------------------- text that scales smoothly (nearest sampling of a 1× bitmap)
const textCache = new Map();
function textBitmap(font, str) {
  const key = (font === TINY ? "T" : "M") + str; let b = textCache.get(key); if (b) return b;
  const w = Math.max(1, new Canvas(1, 1).measure(font, str)) + 2, h = font.height + 2, cv = new Canvas(w, h, "#000000");
  cv.text(font, str, 1, 1, "#FFFFFF"); const m = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) m[i] = cv.d[i * 3] > 128 ? 1 : 0;
  b = { w, h, m }; textCache.set(key, b); return b;
}
export function stext(c, font, str, sx, sy, ps, col, { align = 0, alpha = 1, shadow = null } = {}) {
  const b = textBitmap(font, str), W = b.w * ps, H = b.h * ps, x0 = sx - W * align;
  if (shadow) stext(c, font, str, sx + Math.max(1, R(ps * 0.6)), sy + Math.max(1, R(ps * 0.6)), ps, shadow, { align, alpha });
  const a = Math.max(0, Math.floor(x0)), e = Math.min(GW, Math.ceil(x0 + W)), top = Math.max(0, Math.floor(sy)), bot = Math.min(GH, Math.ceil(sy + H));
  for (let y = top; y < bot; y++) { const v = Math.floor((y - sy) / ps); if (v < 0 || v >= b.h) continue;
    for (let x = a; x < e; x++) { const u = Math.floor((x - x0) / ps); if (u < 0 || u >= b.w || !b.m[v * b.w + u]) continue; if (alpha < 1 && alpha <= bayer(x, y)) continue; c.px(x, y, typeof col === "function" ? col(x, y) : col); } }
  return { x: x0, w: W, h: H };
}
export function textW(font, str, ps) { return textBitmap(font, str).w * ps; }
export const P = {
  ink: "#0B0812", card: "#120C1D", iv: "#FDFEED", y: "#F4CA50", l: "#E0CDF8", p: "#8D59DA", pk: "#E03056", gr: "#65DA41",
  p3: "#3B2C5C", p5: "#6E4FB0", p7: "#B08AE8", cy: "#5FD3F0", cyD: "#2A6E9A", or: "#F08A3C", orD: "#8A3A18", red: "#E8344E",
};
export function panel(c, x, y, w, h, a = 1, edge = P.p7, fill = P.card) {
  if (a <= 0) return; const g = fade(c, a); x = R(x); y = R(y); w = R(w); h = R(h);
  g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, mix(edge, P.ink, 0.45), 2);
  for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(fill, "#1D1430", (j - y) / h));
}
export function tag(c, lines, cx, y, a, col = P.y, ps = 2, { minX = 36, maxX = 504 } = {}) {
  if (a <= 0) return null;
  const w = Math.max(...lines.map((l) => textW(MAIN, l, ps))) + 14, lh = 9 * ps, h = lines.length * lh + 8;
  const x = R(Math.max(minX, Math.min(maxX - w, cx - w / 2)));
  y = R(y + (1 - a) * 4); panel(c, x, y, w, h, a, col);
  lines.forEach((l, i) => stext(c, MAIN, l, x + 7, y + 4 + i * lh, ps, i ? P.iv : col, { alpha: a }));
  return { x, y, w, h };
}
export function pointer(c, x0, y0, x1, y1, a, col) { if (a <= 0) return; const g = fade(c, a); g.line(R(x0), R(y0), R(x1), R(y1), col); g.disc(R(x1), R(y1), 2, col); }

// ---------------------------------------------------------------- SOUND LAB
const SPEC = JSON.parse(fs.readFileSync(HERE + "audio/spec.json", "utf8"));
for (const d of Object.values(SPEC.demos)) d.q = Buffer.from(d.spec, "base64");
export const LAB = { x: 36, y: 156, w: 468, h: 240, px: 56, pw: 400, sec: 2.4, waveY: 204, waveH: 38, specY: 248, specH: 80, rowY: 346 };
const SPEC_RAMP = ["#160C24", "#2E1650", "#5A2280", "#9A2E7E", "#D8485A", "#F48A3A", "#FFD27A"].map(hex);
function specColor(v, X, Y) { const f = v * (SPEC_RAMP.length - 1), i = Math.floor(f), k = f - i; return SPEC_RAMP[Math.min(SPEC_RAMP.length - 1, k > bayer(X, Y) ? i + 1 : i)]; }
/** value of a demo's spectrogram at time τ (s from its start) and frequency hz (0..1 or −1 outside) */
function specAt(d, tau, hz) { if (tau < 0 || tau >= d.len) return -1; const f = Math.min(d.frames - 1, Math.floor(tau / SPEC.hop)), r = Math.floor(hz / SPEC.hzPerRow); if (r < 0 || r >= SPEC.rows) return 0; return d.q[f * SPEC.rows + r] / 255; }
function waveAt(d, tau) { if (tau < 0 || tau >= d.len) return -1; return d.wave[Math.min(d.frames - 1, Math.floor(tau / SPEC.hop))]; }
/**
 * layers: [{ key, a, s (time stretch), f (frequency scale), shown (s of the sound revealed), col }] — drawn in order with dithered alpha.
 * a playhead (time s) can be given per layer (head).
 */
function plots(c, a, layers) {
  const L = LAB, x0 = L.px;
  // grid
  const g = fade(c, a);
  g.rect(x0 - 2, L.waveY - 2, L.pw + 4, L.waveH + 4, "#0A0614"); g.rect(x0 - 2, L.specY - 2, L.pw + 4, L.specH + 4, "#0A0614");
  for (let k = 0; k <= 4; k++) { const x = R(x0 + (k * 0.5 / L.sec) * L.pw); for (let y = L.waveY; y < L.specY + L.specH; y += 3) if (y < L.waveY + L.waveH || y >= L.specY) g.px(x, y, "#2A1E40"); }
  for (const hz of [1000, 2000, 3000, 4000]) { const y = R(L.specY + L.specH - hz / 62.5); for (let x = x0; x < x0 + L.pw; x += 3) g.px(x, y, "#2A1E40"); }
  g.rect(x0, L.waveY + R(L.waveH / 2), L.pw, 1, "#2A1E40");
  for (const ly of layers) {
    const d = SPEC.demos[ly.key], la = a * ly.a; if (la <= 0) continue;
    const s = ly.s ?? 1, f = ly.f ?? 1, shown = ly.shown ?? d.len, wcol = hex(ly.col ?? P.cy), wcolD = mix(ly.col ?? P.cy, "#000000", 0.45);
    for (let X = x0; X < x0 + L.pw; X++) {
      const T = ((X - x0 + 0.5) / L.pw) * L.sec, tau = T / s; if (tau >= d.len || tau > shown) continue;
      const w = waveAt(d, tau); if (w >= 0) { const hh = Math.max(1, R(w * (L.waveH / 2 - 2))); for (let Y = L.waveY + R(L.waveH / 2) - hh; Y <= L.waveY + R(L.waveH / 2) + hh; Y++) if (!(la < 1 && la <= bayer(X, Y))) c.px(X, Y, Math.abs(Y - L.waveY - L.waveH / 2) > hh - 2 ? wcol : wcolD); }
      for (let r = 0; r < L.specH; r++) { const Y = L.specY + L.specH - 1 - r; if (la < 1 && la <= bayer(X + 2, Y + 1)) continue; const v = specAt(d, tau, ((r + 0.5) * 62.5) / f); if (v > 0.18) c.px(X, Y, specColor(Math.min(1, (v - 0.18) / 0.82), X, Y)); }
    }
    if (ly.head != null && ly.head >= 0 && ly.head <= d.len) { const X = R(x0 + ((ly.head * s) / L.sec) * L.pw), hg = fade(c, la * 0.9); hg.rect(X, L.waveY - 3, 1, L.specY + L.specH - L.waveY + 6, P.iv); hg.rect(X - 1, L.waveY - 5, 3, 2, P.iv); }
  }
}
function knob(c, cx, cy, ang, label, val, col, a) {
  if (a <= 0) return; const g = fade(c, a);
  g.disc(cx, cy, 11, "#0A0614"); g.disc(cx, cy, 10, "#3B2C5C"); g.disc(cx, cy, 8, "#2A1E40");
  for (let i = 0; i < 9; i++) { const an = Math.PI * 0.75 + (i / 8) * Math.PI * 1.5; g.px(R(cx + Math.cos(an) * 14), R(cy + Math.sin(an) * 14), "#6E4FB0"); }
  g.line(cx, cy, R(cx + Math.cos(ang) * 8), R(cy + Math.sin(ang) * 8), col); g.disc(R(cx + Math.cos(ang) * 7), R(cy + Math.sin(ang) * 7), 1, col);
  stext(c, MAIN, label, cx + 20, cy - 12, 2, P.l, { alpha: a }); stext(c, MAIN, val, cx + 20, cy + 3, 2, col, { alpha: a });
}
/**
 * st: { a, real (0 copy → 1 real label), layers, bracket {a, s, txt}, high a, deep a, speed {a, k}, echo {a, k}, recipe a,
 *       pitch {a, lit:[0..1 ×3]} }
 */
export function labPanel(c, t, st) {
  const L = LAB, a = st.a; if (a <= 0) return;
  panel(c, L.x, L.y + R((1 - a) * 8), L.w, L.h, a, mix(P.cy, P.or, st.real));
  stext(c, MAIN, "SOUND LAB", L.x + 12, L.y + 10, 2, P.l, { alpha: a });
  // the label pill: OUR COPY → REAL GHAST · MINECRAFT (crossfade)
  for (const [txt, col, k] of [["OUR COPY", P.cy, 1 - st.real], ["REAL GHAST · MINECRAFT", P.or, st.real]]) {
    const ka = a * k * (st.labelA ?? 1); if (ka <= 0) continue; const w = textW(MAIN, txt, 2) + 14, x = L.x + L.w - 10 - w, y = L.y + 6, g = fade(c, ka);
    g.rrect(x, y, w, 22, col, 2); g.rrect(x + 2, y + 2, w - 4, 18, P.card, 2); stext(c, MAIN, txt, x + 7, y + 4, 2, col, { alpha: ka });
  }
  stext(c, TINY, "WAVE", L.x + 6, L.waveY + 2, 1, "#8A7AA8", { alpha: a }); stext(c, TINY, "PITCH", L.x + 2, L.specY + 2, 1, "#8A7AA8", { alpha: a });
  plots(c, a, st.layers);
  // time ruler
  { const g = fade(c, a), y = L.specY + L.specH + 3; for (let k = 0; k <= 4; k++) { const x = R(L.px + (k * 0.5 / L.sec) * L.pw); g.rect(x, y, 1, 3, "#6E4FB0"); if (k % 2 === 0) stext(c, TINY, `${k / 2}S`, x - (k ? 4 : 0), y + 4, 1, "#8A7AA8", { alpha: a }); } }
  if (st.bracket && st.bracket.a > 0) { const b = st.bracket, ba = a * b.a, g = fade(c, ba), x1 = R(L.px + (b.len / L.sec) * L.pw), y = L.waveY - 8;
    g.rect(L.px, y, x1 - L.px, 1, P.y); g.rect(L.px, y - 2, 1, 5, P.y); g.rect(x1, y - 2, 1, 5, P.y);
    for (const [txt, k] of b.txt) if (k > 0) { const tw = textW(TINY, txt, 2); g.rect(R((L.px + x1) / 2 - tw / 2 - 3), y - 6, tw + 6, 12, P.card); stext(c, TINY, txt, (L.px + x1) / 2, y - 4, 2, P.y, { align: 0.5, alpha: ba * k }); } }
  // HIGH ↑ / DEEPER ↓ next to the bands
  for (const [txt, k, up] of [["HIGH", st.high ?? 0, true], ["DEEPER", st.deep ?? 0, false]]) { const ka = a * k; if (ka <= 0) continue; const x = L.px + L.pw - 80, y = L.specY + 8, g = fade(c, ka);
    g.rect(x - 4, y - 3, 96, 22, P.card); stext(c, MAIN, txt, x + 12, y, 2, P.y, { alpha: ka });
    for (let i = 0; i < 5; i++) g.rect(x + 3 - i, up ? y + i : y + 9 - i, 2 * i + 1, 1, P.y); }
  // the knob row: SPEED, ECHO; later the PITCH scale of the real ghast
  const rowA = a * (1 - (st.pitch?.rowOut ?? 0));
  if (rowA > 0) {
    const sp = st.speed ?? { a: 0, k: 0 }, ec = st.echo ?? { a: 0, k: 0 };
    knob(c, L.px + 14, L.rowY + 24, Math.PI * 0.75 + (1 - 0.5 * sp.k) * Math.PI * 1.5 * 0.999, "SPEED", sp.k > 0.5 ? "×0.5" : "×1", sp.k > 0.02 ? P.y : P.l, rowA * sp.a);
    knob(c, L.px + 170, L.rowY + 24, Math.PI * 0.75 + ec.k * Math.PI * 1.5, "ECHO", ec.k > 0.5 ? "LONG" : "OFF", ec.k > 0.02 ? P.y : P.l, rowA * ec.a);
    if ((st.recipe ?? 0) > 0) { const ra = rowA * st.recipe; stext(c, MAIN, "HIS RECIPE", L.px + 300, L.rowY + 10, 2, P.l, { alpha: ra }); stext(c, MAIN, "?", L.px + 340, L.rowY + 28, 3, P.y, { alpha: ra }); }
  }
  if (st.pitch && st.pitch.a > 0) {
    const pa = a * st.pitch.a, y = L.rowY + 26, xs = [L.px + 110, L.px + 230, L.px + 350], g = fade(c, pa);
    stext(c, MAIN, "PITCH", L.px, y - 7, 2, P.l, { alpha: pa });
    g.rect(xs[0] - 20, y, xs[2] - xs[0] + 40, 2, "#6E4FB0");
    ["×0.8", "×1.0", "×1.2"].forEach((lb, i) => { const k = st.pitch.lit[i], col = mix(P.l, P.or, k); g.disc(xs[i], y + 1, 5 + R(2 * k), mix("#3B2C5C", P.or, k)); stext(c, MAIN, lb, xs[i], y + 12, 2, col, { align: 0.5, alpha: pa }); });
  }
}
