// Trial 10 s · camera, space backdrop and karaoke captions.
import { MAIN, bayer, mix } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, TAU, R, clamp01, sm, lerp, rnd, noise1, layer, tintPx } from "./layout.mjs";
import { CATALOG } from "../contract.mjs";
import { KID } from "../props/kid.mjs";

// ---------------------------------------------------------------- camera: plan keys → eased moves (log zoom), gentle push-in
const FOCUS_PT = [255, 405];          // where a focused prop sits on screen (centre of the main safe zone's focus area)
function target(key, R0) {
  if (key.focus === "wide") return { cx: 270, cy: 450, z: 1 };
  const p = R0.props.find((q) => q.id === key.focus); if (!p) return { cx: 270, cy: 450, z: 1 };
  const K = CATALOG[p.kind], kid = p.kind === "kid";
  const hw = kid ? 110 : K.hw * p.s, hh = kid ? 130 : (p.kind === "pumpkin" ? 121 : K.hh) * p.s;
  const z = Math.max(1, Math.min(key.zoom, 400 / (2 * hw), 470 / (2 * hh)));      // never crop the focused prop out of the safe zone
  const wx = kid ? KID.x + 40 : p.x, wy = kid ? KID.y + 30 : p.y;
  // layer(cam, 1): X(wx) = 270 + (wx − cx)·z → put the prop at FOCUS_PT
  return { cx: wx - (FOCUS_PT[0] - 270) / z, cy: wy - (FOCUS_PT[1] - 450) / z, z };
}
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export function cameraPath(R0) {
  const keys = R0.cam.map((k) => ({ t: k.t, ...target(k, R0) }));
  return keys.map((k, i) => { const next = keys[i + 1]?.t ?? R0.end; return { ...k, move: i === 0 ? 0 : Math.max(0.55, Math.min(1.1, next - k.t - 0.1)) }; });
}
export function camAt(t, path) {
  let cur = path[0];
  for (let i = 1; i < path.length; i++) {
    const k = path[i]; if (t < k.t) break;
    const u = io(clamp01((t - k.t) / k.move));
    cur = { cx: lerp(cur.cx, k.cx, u), cy: lerp(cur.cy, k.cy, u), z: Math.exp(lerp(Math.log(cur.z), Math.log(k.z), u)) };
  }
  const drift = 1 + 0.0045 * t;      // a slow continuous push-in so no frame is ever frozen
  return { cx: cur.cx, cy: cur.cy, z: cur.z * drift };
}

// ---------------------------------------------------------------- space backdrop: deep gradient, nebula, parallax stars
const SPACE = (() => { const d = new Uint8ClampedArray(GW * GH * 3), stops = [[0, "#04050C"], [300, "#090B1E"], [620, "#120E2A"], [960, "#0A0818"]];
  const hexc = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  for (let y = 0; y < GH; y++) { let i = 0; while (i + 1 < stops.length - 1 && y > stops[i + 1][0]) i++; const [y0, a] = stops[i], [y1, b] = stops[i + 1], k = clamp01((y - y0) / (y1 - y0));
    for (let x = 0; x < GW; x++) { const c = hexc(k > bayer(x, y) ? b : a), o = (y * GW + x) * 3; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; } }
  return d; })();
const STARS = Array.from({ length: 220 }, (_, i) => ({ x: rnd(i * 5 + 1) * 700 - 80, y: rnd(i * 5 + 2) * 1100 - 70, p: [0.08, 0.2, 0.4][i % 3], b: rnd(i * 5 + 3), ph: rnd(i * 5 + 4) * TAU, sp: 0.5 + rnd(i * 5 + 5) * 1.6 }));
export function drawSpace(c, cam, t) {
  c.d.set(SPACE);
  // nebula: two soft dithered clouds drifting very slowly
  const L0 = layer(cam, 0.06);
  for (let y = 0; y < GH; y += 1) for (let x = 0; x < GW; x += 1) {
    const wx = L0.wx(x + 0.5), wy = L0.wy(y + 0.5), n = noise1(wx * 0.012 + noise1(wy * 0.01, 4) * 3 + t * 0.03, 7) * noise1(wy * 0.014 + 2, 9);
    if (n > 0.32) tintPx(c, x, y, wy < 470 ? "#3A2A6A" : "#1E4A6A", (n - 0.32) * 0.9, 4);
  }
  for (const s of STARS) { const L = layer(cam, s.p), x = R(L.X(s.x)), y = R(L.Y(s.y)); if (x < 0 || y < 0 || x >= GW || y >= GH) continue;
    const tw = 0.55 + 0.45 * Math.sin(t * s.sp * 2 + s.ph), col = s.b > 0.85 ? "#FFFFFF" : s.b > 0.55 ? "#BFD8FF" : "#6E7EB8";
    if (tw > 0.3) c.px(x, y, tw > 0.7 || s.b > 0.85 ? col : mix(col, "#090B1E", 0.5));
    if (s.b > 0.95 && tw > 0.75) { const k = L.z > 1.3 ? 2 : 1; for (let j = 1; j <= k; j++) { c.px(x - j, y, "#6E7EB8"); c.px(x + j, y, "#6E7EB8"); c.px(x, y - j, "#6E7EB8"); c.px(x, y + j, "#6E7EB8"); } } }
}

// ---------------------------------------------------------------- karaoke captions: lines of whole words from the script
const O = "#0B0812", IV = "#FDFEED";
export function captionGroups(words, end) {
  // phrases end at punctuation; a phrase longer than one line (23 characters at scale 3) is split into balanced lines
  const LINE = 23, len = (ws) => ws.reduce((s, w) => s + w.text.length, 0) + ws.length - 1, phrases = []; let cur = [];
  for (const w of words) { cur.push(w); if (/[.!?,:;]$/.test(w.text)) { phrases.push(cur); cur = []; } }
  if (cur.length) phrases.push(cur);
  // best line breaks per phrase (dynamic programming): lines ≤ 23 characters, fewer and evener lines, never a break
  // right after a number or a small function word ("8 | minutes", "for | this")
  const WEAK = new Set(["a", "an", "the", "of", "to", "for", "and", "or", "in", "on", "at", "by", "your", "this", "my", "its", "their", "our", "is", "are", "was"]);
  const pen = (w) => { const b = w.text.toLowerCase().replace(/[^a-z0-9']/g, ""); return /^\d/.test(b) || /^(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion)$/.test(b) ? 400 : WEAK.has(b) ? 120 : 0; };
  const groups = [];
  for (const ph of phrases) {
    const n = ph.length, best = Array(n + 1).fill(Infinity), cut = Array(n + 1).fill(n); best[n] = 0;
    for (let i = n - 1; i >= 0; i--) for (let j = i + 1; j <= n; j++) { const l = len(ph.slice(i, j)); if (l > LINE && j > i + 1) break;
      const c = 60 + 0.35 * (LINE - Math.min(LINE, l)) ** 2 + (j < n ? pen(ph[j - 1]) : 0) + best[j]; if (c < best[i]) { best[i] = c; cut[i] = j; } }
    for (let i = 0; i < n; i = cut[i]) groups.push(ph.slice(i, cut[i]));
  }
  // very short neighbours (one or two small words) join the next line when it still fits
  for (let i = 0; i + 1 < groups.length; i++) if (len(groups[i]) <= 6 && len([...groups[i], ...groups[i + 1]]) <= LINE) { groups[i] = [...groups[i], ...groups[i + 1]]; groups.splice(i + 1, 1); i--; }
  const G = groups.map((ws) => ({ ws, start: ws[0].start, end: ws.at(-1).end }));
  G.forEach((g, i) => { const next = G[i + 1]; g.show = i === 0 ? Math.max(0, g.start - 0.14) : g.start - 0.05; g.inDur = 0.12; g.hide = next ? next.start - 0.13 : end - 0.45; g.outDur = next ? 0.1 : 0.3; });
  return G;
}
export function drawCaptions(c, t, G, hi) {
  const boxes = [];
  for (const g of G) {
    if (t < g.show - 0.01 || t > g.hide + g.outDur + 0.01) continue;
    const ain = sm(t, g.show, g.show + g.inDur), aout = 1 - sm(t, g.hide, g.hide + g.outDur), a = Math.min(ain, aout); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.text.toUpperCase()), sp = c.measure(MAIN, " ", o) + 3, width = words.reduce((s, w) => s + c.measure(MAIN, w, o), 0) + sp * (words.length - 1);
    const y0 = 690 + R((1 - ain) * 5) - R((1 - aout) * 5);
    let x = R(270 - width / 2); boxes.push({ x0: x, y0, x1: x + width, y1: y0 + 21 });
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      const vis = (X, Y) => a >= 1 || (ain < 1 ? ain > bayer(X, Y) : aout > 1 - bayer(X, Y));
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Y) => (vis(X, Y) ? O : null) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt: (X, Y) => (!vis(X, Y) ? null : t < wd.start || X >= fillX ? mix(IV, "#000000", 0.6) : toIv > bayer(X + 3, Y + 1) ? IV : hi) });
      x += ww + sp; });
  }
  return boxes;
}
export const captionShade = (c) => c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), O, 6);
