// Pixel experiment film «What happens when you tap» — 540×960 grid ×2 → 1080×1920, 30 fps.
// node render.mjs --stills 3.2,9,...   → PNG stills;   node render.mjs --video → raw frames into ffmpeg.
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../pixel.mjs";
import { drawGlobe, project, routeSamples } from "./world.mjs";
import { drawTokyo, drawLondon, TOKYO, LONDON, packetSprite, along, COLORS as C } from "./iso.mjs";
import { EV, ZOOMS, CAFE_ZOOM, END, FPS, WORDS, VOICE } from "./timeline.mjs";
import { drawCafe, drawDistrict, CAFE, CAFE_FOCUS, DISTRICT_CENTER, ROUTE_D, TERMINAL_I } from "./scenes.mjs";
const VOICE_TEXT = VOICE.text;

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ROOT = "/Users/rv/Desktop/Motion Studio/";
const SHEET = ROOT + "data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, BOT = 680;
const { O, CARD, IV, Y, YL, GR, MU, L, P, PK, p1, p2, p3, p4, p5, p6, p7, p8 } = C;
const K = "#000000";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.35, fo = 0.35) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));

// ---------------------------------------------------------------- assets
async function rgba(input, w, h, opts = {}) {
  let img = sharp(input); if (opts.extract) img = img.extract(opts.extract);
  const { data, info } = await img.resize(w, h, { kernel: opts.kernel ?? "lanczos3", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) };
}
const MEDIA = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets;
const mediaFile = (kind, subj) => HERE + "media/" + MEDIA.find((a) => a.kind === kind && a.subject === subj).file.split("/").pop();
const A = {};
async function loadAssets() {
  A.flagJP = await rgba(mediaFile("flag", "Japan"), 54, 36);
  A.flagUK = await rgba(mediaFile("flag", "United Kingdom"), 60, 36);
  A.visa = await rgba(mediaFile("logo", "Visa Inc."), 196, 64);
  A.mc = await rgba(mediaFile("logo", "Mastercard"), 150, 93);
  A.avatar = await avatar(66);
  A.tokyo = new Map();
  for (let h = 6; h <= 130; h++) A.tokyo.set(h, await rgba(SHEET, Math.round(h * 192 / 208), h, { extract: { left: 3 * 192, top: 2 * 208, width: 192, height: 208 } }));
  A.outro = {};
  for (const [name, row, n] of [["wave", 1, 4], ["point", 4, 6], ["happy", 9, 6]]) {
    A.outro[name] = [];
    for (let f = 0; f < n; f++) A.outro[name].push(await rgba(SHEET, 192, 208, { extract: { left: f * 192, top: row * 208, width: 192, height: 208 }, kernel: "nearest" }));
  }
}
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
    const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null;
    if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } }
    else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P);
    if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; }
  }
  return { w: size, h: size, data: out };
}

// ---------------------------------------------------------------- geography
const CITY = { tokyo: { lat: 35.68, lon: 139.69 }, london: { lat: 51.5, lon: -0.12 } };
const OVER = { lat0: 38, lon0: 72 }, R0 = 212, RMAX = 9000, GCX = 270, GCY = 438;
const ROUTE = routeSamples([[139.7, 35.7], [138.5, 33.8], [130, 29.5], [125, 28], [114.2, 22.3], [110, 12], [103.8, 1.3], [95, 5.5], [80, 5], [72.8, 19], [60, 17], [55, 13.5], [47, 12.3], [43.4, 12.6], [40.5, 16.5], [37.5, 21], [34.6, 27.5], [32.5, 29.9], [30, 31.6], [22, 34], [15, 37], [8, 40.5], [5.4, 43.3], [3, 47], [1.5, 49.5], [-0.1, 51.5]]);
const CABLES = [
  [[103.8, 1.3], [110, -10], [115.8, -32]], [[72.8, 19], [62, 24], [56.3, 25.3]], [[114.2, 22.3], [121, 14.6]], [[139.7, 35.7], [129, 35], [126.9, 37.5]],
  [[43.4, 12.6], [39.7, -4], [32, -29.5], [18.4, -33.9]], [[5.4, 43.3], [-9.2, 38.7], [-17, 20], [-17.4, 14.7], [3.4, 6.4]], [[-0.1, 51.5], [-5.5, 50.1], [-20, 52], [-40, 55]],
  [[30, 31.6], [29, 41], [37.6, 55.8]], [[8, 40.5], [8.7, 50.1], [-0.1, 51.5]],
].map((pts) => routeSamples(pts));
const NODES = [[22.3, 114.2], [1.3, 103.8], [19.1, 72.9], [25.2, 55.3], [30.0, 31.2], [50.1, 8.7], [43.3, 5.4]];
const ROUTE_NODE_K = [0.22, 0.33, 0.47, 0.62, 0.8].map((k) => k);
const SUN = (t) => ({ lat: -11, lon: 150 - 720 * ease((t - EV.days[0]) / (EV.days[1] + 0.35 - EV.days[0])) });

function camera(t) {
  if (t < CAFE_ZOOM.t1) return { phase: "cafe", L: t < CAFE_ZOOM.t0 ? 0 : ease((t - CAFE_ZOOM.t0) / (CAFE_ZOOM.t1 - CAFE_ZOOM.t0)), z: 1, city: "tokyo", view: { lat0: CITY.tokyo.lat, lon0: CITY.tokyo.lon, R: RMAX, cx: GCX, cy: GCY } };
  let z = 1, city = "tokyo";
  for (const zm of ZOOMS) { if (t >= zm.t1) { z = zm.to; city = zm.city; } else if (t >= zm.t0) { z = lerp(zm.from, zm.to, ease((t - zm.t0) / (zm.t1 - zm.t0))); city = zm.city; break; } else break; }
  const c = CITY[city], w = smooth(z, 0, 0.55);
  let lon0 = OVER.lon0, lat0 = OVER.lat0;
  if (t > EV.outroIn[0] - 4) lon0 -= 10 * ease((t - (EV.outroIn[0] - 4)) / 4);
  const view = { lat0: lerp(lat0, c.lat, w), lon0: lerp(lon0, c.lon, w), R: R0 * Math.pow(RMAX / R0, z), cx: GCX, cy: GCY };
  return { z, city, view };
}

// ---------------------------------------------------------------- drawing helpers
function drawPath(c, view, samples, k0, k1, col, { dash = 0, h = 1.002, width = 1 } = {}) {
  const { pts, cum, km } = samples; let prev = null, n = 0;
  for (let i = 0; i < pts.length; i++) {
    const f = cum[i] / km; if (f < k0 || f > k1) { prev = null; continue; }
    const p = project(view, pts[i][1], pts[i][0], h);
    if (!p.visible) { prev = null; continue; }
    if (prev) { n++; if (!dash || n % (dash * 2) < dash) { c.line(Math.round(prev.x), Math.round(prev.y), Math.round(p.x), Math.round(p.y), col); if (width > 1) c.line(Math.round(prev.x), Math.round(prev.y) + 1, Math.round(p.x), Math.round(p.y) + 1, col); } }
    prev = p;
  }
}
function pointAt(samples, k) { const { pts, cum, km } = samples, d = clamp01(k) * km; let i = 1; while (i < cum.length - 1 && cum[i] < d) i++; const f = (d - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1); return [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]; }
function dissolve(c, layer, alpha) {
  if (alpha >= 1) { c.d.set(layer.d); return; }
  if (alpha <= 0) return;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (alpha > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = layer.d[i]; c.d[i + 1] = layer.d[i + 1]; c.d[i + 2] = layer.d[i + 2]; }
}
function panel(c, x, y, w, h, alpha = 1, edge = p7) {
  if (alpha <= 0) return;
  const lay = new Canvas(1, 1); // dither the panel itself
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (alpha < 1 && alpha <= bayer(i, j)) continue;
    const e = i === x || i === x + w - 1 || j === y || j === y + h - 1, e2 = i === x + 1 || i === x + w - 2 || j === y + 1 || j === y + h - 2;
    const corner = (i === x || i === x + w - 1) && (j === y || j === y + h - 1);
    if (corner) continue;
    c.px(i, j, e ? edge : e2 ? p5 : mix(CARD, "#1D1430", (j - y) / h));
  }
}
const dtext = (c, font, str, x, y, col, alpha, o = {}) => { if (alpha <= 0) return; c.text(font, str, x, y, col, { ...o, colorAt: alpha < 1 ? (X, Yy) => (alpha > bayer(X, Yy) ? (typeof col === "string" ? col : null) : null) : o.colorAt }); };
function stars(c) { for (let i = 0; i < 70; i++) { const x = (i * 197) % GW, y = TOP + ((i * 331) % (BOT - TOP)); c.px(x, y, i % 7 ? "#3B3352" : MU); } }
function coin(c, x, y, r = 4) { c.disc(Math.round(x), Math.round(y), r + 1, O); c.disc(Math.round(x), Math.round(y), r, Y); c.disc(Math.round(x) - 1, Math.round(y) - 1, Math.max(1, r - 2), YL); c.px(Math.round(x) - 2, Math.round(y) - 2, IV); }
function pin(c, x, y, col, pulse) {
  x = Math.round(x); y = Math.round(y);
  if (pulse > 0 && pulse < 1) c.ering(x, y, Math.round(4 + pulse * 18), Math.round(2 + pulse * 9), mix(col, K, pulse));
  c.rect(x - 1, y - 12, 3, 12, O); c.rect(x, y - 11, 1, 11, IV); c.disc(x, y - 14, 5, O); c.disc(x, y - 14, 4, col); c.px(x - 1, y - 16, IV);
}

// ---------------------------------------------------------------- captions
const GROUPS = (() => {
  const gs = []; let cur = [];
  const TEXT = VOICE_TEXT, after = (w) => TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, "");
  const clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, "");
  const len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) {
    if (w.start >= EV.outroIn[0]) break;
    const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) });
  }
  if (cur.length) gs.push(cur);
  return gs.map((ws, i) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1]; const endSpeech = g.ws[g.ws.length - 1].end; g.show = g.start - 0.12; g.hide = next ? Math.min(next.start - 0.12 - 0.17, endSpeech + 0.9) : Math.min(EV.outroIn[0], endSpeech + 0.9); });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), full = words.join(" "), w = c.measure(MAIN, full, o), x0 = Math.round(270 - w / 2), y0 = 690 + Math.round((1 - a) * 6);
    let x = x0;
    words.forEach((txt, i) => {
      const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIvory = smooth(t, wd.end, wd.end + 0.3);
      const colorAt = (X, Yy) => {
        if (a < 1 && a <= bayer(X, Yy)) return null;
        if (t < wd.start || X >= fillX) return mix(IV, K, 0.62);
        return toIvory > bayer(X + 3, Yy + 1) ? IV : Y;
      };
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : O) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt });
      x += ww + c.measure(MAIN, " ", o) + 3;
    });
  }
}

// ---------------------------------------------------------------- frame
const overlays = [];
function overlay(img, x, y, alpha = 1) { if (alpha > 0) overlays.push({ img, x: Math.round(x), y: Math.round(y), alpha }); }
const layer = new Canvas(GW, GH, K);

function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, K);
  const cam = camera(t), { z, city, view } = cam;
  const outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  const globeA = 1 - smooth(z, 0.8, 0.96), dioA = smooth(z, 0.55, 0.82), onGlobe = 1 - smooth(z, 0.3, 0.55);
  if (outro < 1 && cam.phase === "cafe") {
    stars(c);
    cafePhase(c, t, cam.L);
    dioramaUI(c, t, "tokyo", 1);
  } else if (outro < 1) {
    stars(c);
    if (globeA > 0) drawGlobe(c, view, SUN(t), { alpha: globeA, clip: [0, TOP, GW, BOT] });
    if (onGlobe > 0) globeLayer(c, t, view, onGlobe);
    if (dioA > 0) {
      layer.d.set(c.d);
      const U = (city === "tokyo" ? UDF : 1.6) * view.R / RMAX, a = project(view, CITY[city].lat, CITY[city].lon);
      if (city === "tokyo") districtScene(layer, t, a.x - (DISTRICT_CENTER[0] - DISTRICT_CENTER[1]) * U, a.y - ((DISTRICT_CENTER[0] + DISTRICT_CENTER[1]) / 2 - DISTRICT_CENTER[2]) * U, U); else londonScene(layer, t, a.x, a.y, U);
      dissolve(c, layer, dioA);
      dioramaUI(c, t, city, dioA * (1 - outro));
    }
    hud(c, t, onGlobe);
    counter(c, t);
  }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); }
  // keep the stage window clean
  c.rect(0, 0, GW, TOP - 2, K); c.rect(0, BOT + 2, GW, GH - BOT - 2, K);
  for (let x = 0; x < GW; x++) { for (let j = 0; j < 8; j++) { if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K); if (bayer(x, BOT + 2 - j) > j / 8) c.px(x, BOT + 2 - j, K); } }
  header(c);
  captions(c, t);
  return c;
}

function globeLayer(c, t, view, vis) {
  // Tokyo → London story arc (dotted, lifted)
  const arcK = smooth(t, EV.arc[0], EV.arc[1]), arcA = 1 - smooth(t, EV.cables[0], EV.cables[0] + 0.6);
  if (arcK > 0 && arcA > 0) {
    const arc = routeSamples([[139.7, 35.7], [-0.1, 51.5]]);
    drawPath(c, view, arc, 0, arcK, mix(L, K, 1 - arcA * vis), { dash: 2, h: 1.06 });
  }
  // cable web on the ocean floor
  const cab = smooth(t, EV.cables[0], EV.cables[1]);
  if (cab > 0) { for (const s of CABLES) drawPath(c, view, s, 0, cab, mix(p5, K, 0.25), { dash: 3 }); drawPath(c, view, ROUTE, 0, cab, mix(p6, K, 0.1), { dash: 3 }); }
  // network nodes
  const nodesOn = smooth(t, EV.nodes[0], EV.nodes[1]);
  NODES.forEach(([la, lo], i) => {
    const on = smooth(t, EV.nodes[0] + i * 0.08, EV.nodes[0] + i * 0.08 + 0.3); if (on <= 0) return;
    const p = project(view, la, lo); if (!p.visible) return;
    const pulse = ((t - EV.web[0] - i * 0.11) % 1.6) / 1.6, x = Math.round(p.x), y = Math.round(p.y);
    if (t > EV.web[0] && pulse >= 0) c.ering(x, y, Math.round(3 + pulse * 9), Math.round(2 + pulse * 5), mix(L, K, pulse));
    const f = fade(c, on); f.rect(x - 2, y - 2, 5, 5, O); f.rect(x - 1, y - 1, 3, 3, p8); f.px(x, y, IV);
  });
  // request route: Tokyo → London
  const tr = clamp01((t - EV.travel[0]) / (EV.travel[1] - EV.travel[0])), trK = ease(tr);
  if (t > EV.travel[0]) drawPath(c, view, ROUTE, 0, trK, Y, { width: 2 });
  { const pa = win(t, EV.travel[0] - 0.1, EV.travel[1] + 0.05, 0.2, 0.25); if (pa > 0) { const [lo, la] = pointAt(ROUTE, trK), p = project(view, la, lo); if (p.visible) packetSprite(fade(c, pa), p.x, p.y - 6, 1, { lock: true }); } }
  // race back (green), London → Tokyo
  const rb = clamp01((t - EV.race[0]) / (EV.race[1] - EV.race[0]));
  if (t > EV.race[0]) drawPath(c, view, ROUTE, 1 - ease(rb), 1, GR, { width: 2 });
  { const ga = win(t, EV.race[0] - 0.12, EV.race[1], 0.15, 0.2); if (ga > 0) { const [lo, la] = pointAt(ROUTE, 1 - ease(rb)), p = project(view, la, lo); if (p.visible) packetSprite(fade(c, ga), p.x, p.y - 6, 1, { green: true }); } }
  // whole trip glow during the counter
  const glow = win(t, EV.counter[0], EV.counterOut);
  if (glow > 0) drawPath(fade(c, glow * (0.55 + 0.45 * Math.sin(t * 9) ** 2)), view, ROUTE, 0, 1, YL, { width: 2 });
  // settlement coins London → Tokyo, fees peel off at nodes
  if (t > EV.settle[0] && t < EV.settle[1] + 0.6) {
    for (let i = 0; i < 5; i++) {
      const k = clamp01((t - EV.settle[0] - i * 0.18) / (EV.settle[1] - EV.settle[0] - 0.7)); if (k <= 0 || k >= 1) continue;
      const [lo, la] = pointAt(ROUTE, 1 - ease(k)), p = project(view, la, lo); if (p.visible) coin(fade(c, Math.min(smooth(k, 0, 0.08), 1 - smooth(k, 0.9, 1))), p.x, p.y - 7, 3);
    }
    for (const [j, nk] of [[0, 0.62], [1, 0.33]]) {
      const t0 = EV.fee + j * 0.3, f = clamp01((t - t0) / 0.9); if (t < t0 || f >= 1) continue;
      const [lo, la] = pointAt(ROUTE, nk), p = project(view, la, lo); if (!p.visible) continue;
      coin(fade(c, Math.min(smooth(f, 0, 0.12), 1 - smooth(f, 0.7, 1))), p.x + 6 + f * 6, p.y - 6 + f * f * 26, 2);
      dtext(c, MAIN, "FEE", Math.round(p.x + 12), Math.round(p.y - 22), YL, 1 - smooth(f, 0.6, 1));
    }
  }
  // pins + labels (flags are full-resolution overlays)
  const label = (cityKey, name, flag, a, side, col) => {
    if (a <= 0) return;
    const c0 = CITY[cityKey], p = project(view, c0.lat, c0.lon); if (!p.visible) return;
    pin(fade(c, a * vis), p.x, p.y, col, smooth(t, (cityKey === "tokyo" ? EV.tokyoPin : EV.londonPin), (cityKey === "tokyo" ? EV.tokyoPin : EV.londonPin) + 0.8));
    const w = 34 + c.measure(MAIN, name, { scale: 2 }) + 10, x = Math.round(side < 0 ? p.x - w - 6 : p.x + 8), y = Math.round(p.y - 46);
    panel(c, x, y, w, 26, a * vis);
    overlay(flag, (x + 4) * S, (y + 4) * S + 1, a * vis);
    dtext(c, MAIN, name, x + 34, y + 6, IV, a * vis, { scale: 2 });
  };
  label("tokyo", "TOKYO", A.flagJP, smooth(t, EV.tokyoPin, EV.tokyoPin + 0.35), -1, Y);
  label("london", "LONDON", A.flagUK, smooth(t, EV.londonPin, EV.londonPin + 0.35), 1, p8);
  // HOLD at London
  const hold = win(t, EV.hold, EV.unlock + 0.3, 0.3, 0.4);
  if (hold > 0) {
    const p = project(view, CITY.london.lat, CITY.london.lon);
    if (p.visible) { const x = Math.round(p.x + 10), y = Math.round(p.y + 6), f = fade(c, hold * vis); panel(c, x, y, 78, 28, hold * vis, Y); coin(f, x + 14, y + 16, 5); coin(f, x + 14, y + 11, 5);
      const open = smooth(t, EV.unlock, EV.unlock + 0.25); f.ering(x + 30, y + 13 - Math.round(open * 4), 3, 4, L, Math.PI, Math.PI * 2); f.rect(x + 26, y + 13, 9, 7, P); f.px(x + 30, y + 16, O);
      dtext(c, MAIN, "HOLD", x + 40, y + 10, Y, hold * vis, { scale: 1 }); }
  }
  // logos (full-res overlays on ivory tiles)
  const va = win(t, EV.visa, EV.logosOut), ma = win(t, EV.mastercard, EV.logosOut);
  if (va > 0) { panel(c, 22, 202, 118, 50, va * vis, p6); fade(c, va * vis).rect(25, 205, 112, 44, IV); overlay(A.visa, 25 * S + 14, 205 * S + 12, va * vis); }
  if (ma > 0) { panel(c, 400, 196, 118, 62, ma * vis, p6); fade(c, ma * vis).rect(403, 199, 112, 56, IV); overlay(A.mc, 403 * S + 37, 199 * S + 10, ma * vis); }
}

const UDF = 1.3, UI = 2.75;
function tapState(t) {
  const tap = EV.tap; let card = null, nfc = 0;
  if (t >= tap.move && t < tap.back + 0.4) {
    card = t < tap.contact ? ease((t - tap.move) / (tap.contact - tap.move)) : t < tap.release ? 1 : 1 - ease((t - tap.release) / (tap.back + 0.3 - tap.release));
    nfc = t >= tap.contact && t < tap.release ? clamp01((t - tap.contact) / 0.12) * (0.6 + 0.4 * (((t - tap.contact) * 6) % 1)) * (1 - smooth(t, tap.release - 0.1, tap.release)) : 0;
  }
  return { card, nfc, cardA: Math.min(smooth(t, tap.move, tap.move + 0.15), 1 - smooth(t, tap.back + 0.25, tap.back + 0.4)) };
}
const terminalState = (t) => (t > EV.beep ? "ok" : t > EV.tap.contact ? "wait" : "idle");
function cafePhase(c, t, L) {
  const Ud = UDF * Math.pow(UI / CAFE.s / UDF, 1 - L), F = CAFE_FOCUS.map((v, i) => lerp(v, DISTRICT_CENTER[i], L));
  const ox = GCX - (F[0] - F[1]) * Ud, oy = GCY - ((F[0] + F[1]) / 2 - F[2]) * Ud;
  const dA = smooth(L, 0.18, 0.5), iA = 1 - smooth(L, 0.4, 0.72);
  if (dA > 0) { layer.d.set(c.d); districtScene(layer, t, ox, oy, Ud); dissolve(c, layer, dA); }
  if (iA > 0) { layer.d.set(c.d); cafeScene(layer, t, ox + (CAFE.x - CAFE.y) * Ud, oy + ((CAFE.x + CAFE.y) / 2) * Ud, Ud * CAFE.s); dissolve(c, layer, iA); }
}
const heroSprite = (h) => A.tokyo.get(Math.max(6, Math.min(130, h))) ?? null;
function cafeScene(cv, t, ox, oy, U) {
  const I = drawCafe(cv, ox, oy, U, { t, ...tapState(t), terminal: terminalState(t), cup: smooth(t, EV.coffee, EV.coffee + 0.35), textOn: U > 2 }, { hero: heroSprite });
  if (t > EV.tap.release) {
    const [sx, sy] = I.P3(TERMINAL_I[0] + 0.5, TERMINAL_I[1], TERMINAL_I[2] + 7), pa = smooth(t, EV.tap.release, EV.tap.release + 0.3);
    packetSprite(fade(cv, pa), sx, sy, Math.max(0.6, U * 0.5), { lock: t > EV.stamp + 0.1 });
    if (t > EV.stamp && t < EV.stamp + 0.5) { const k = (t - EV.stamp) / 0.5; cv.ering(Math.round(sx), Math.round(sy), Math.round(8 + 22 * k), Math.round(5 + 13 * k), mix(YL, K, k)); }
  }
}
function districtScene(cv, t, ox, oy, U) {
  const routeK = t < EV.sendLocal[0] ? 0 : ease((t - EV.sendLocal[0]) / (EV.sendLocal[1] - EV.sendLocal[0]));
  const I = drawDistrict(cv, ox, oy, U, { t, route: routeK, bankLit: smooth(t, EV.sendLocal[1] - 0.2, EV.sendLocal[1] + 0.15), textOn: true });
  const pa = Math.min(smooth(t, CAFE_ZOOM.t0 + 0.3, CAFE_ZOOM.t0 + 0.6), 1 - smooth(t, EV.sendLocal[1], EV.sendLocal[1] + 0.25));
  if (pa > 0) { const [x, y, z] = along(ROUTE_D, routeK), [sx, sy] = I.P3(x, y, z + 5); packetSprite(fade(cv, pa), sx, sy - 3 * U, Math.max(0.5, U * 0.7), { lock: true }); }
}
let view_U = () => 1;
function londonScene(cv, t, ax, ay, U) {
  view_U = () => U / 1.6;
  // night sky decoration
  { const k = view_U(); cv.disc(Math.round(ax - 150 * k), Math.round(ay - 170 * k), Math.max(2, Math.round(9 * k)), "#F6E7A8"); cv.disc(Math.round(ax - 147 * k), Math.round(ay - 172 * k), Math.max(1, Math.round(8 * k)), "#0E0A1A"); }
  drawLondon(cv, ax, ay, U, { serverGlow: true, doorLit: smooth(t, EV.travel[1], EV.travel[1] + 0.3) });
}

function dioramaUI(c, t, city, a) {
  if (a <= 0) return;
  // city tag with flag, top-left of the stage
  const name = city === "tokyo" ? "TOKYO" : "LONDON", flag = city === "tokyo" ? A.flagJP : A.flagUK, w = 34 + c.measure(MAIN, name, { scale: 2 }) + 10;
  const sub = city === "tokyo" ? "11:00" : "03:00";
  const ta = city === "tokyo" ? a * smooth(t, EV.tokyoTag, EV.tokyoTag + 0.35) : a;
  if (ta > 0) { panel(c, 20, 202, w, 26, ta); overlay(flag, 24 * S, 206 * S + 1, ta); dtext(c, MAIN, name, 54, 208, IV, ta, { scale: 2 });
    dtext(c, MAIN, city === "tokyo" ? "DAY" : "NIGHT", 22, 234, city === "tokyo" ? YL : p7, ta, { scale: 1 }); }
  if (city === "tokyo") {
    const la = a * win(t, EV.londonTag, CAFE_ZOOM.t0, 0.35, 0.35);
    if (la > 0) { panel(c, 330, 200, 176, 46, la); dtext(c, MAIN, "YOUR BANK", 340, 207, p8, la); overlay(A.flagUK, 340 * S, 218 * S, la); dtext(c, MAIN, "LONDON", 374, 222, IV, la, { scale: 2 }); }
  }
  if (city === "tokyo") {
    // ×10 tally
    const ta = win(t, EV.tally[0], EV.tally[1] + 0.9);
    if (ta > 0) for (let i = 0; i < 10; i++) {
      const on = smooth(t, EV.tally[0] + i * (EV.tally[1] - EV.tally[0]) / 10, EV.tally[0] + i * (EV.tally[1] - EV.tally[0]) / 10 + 0.08) * ta * a;
      if (on <= 0) continue; const x = 300 + (i % 5) * 42, y = 206 + Math.floor(i / 5) * 30;
      for (let j = 0; j < 20; j++) for (let k = 0; k < 32; k++) if (on > bayer(x + k, y + j)) c.px(x + k, y + j, j < 2 || k < 1 ? p8 : j > 17 || k > 30 ? p4 : (j > 6 && j < 10 && k > 3 && k < 9) ? Y : p6);
    }
    const q = win(t, EV.question, EV.tap.move - 0.15);
    if (q > 0) { panel(c, 318, 282, 30, 30, q * a, Y); dtext(c, MAIN, "?", 328, 290, Y, q * a, { scale: 2 }); }
    const code = win(t, EV.stamp, EV.sendLocal[0] + 0.2);
    if (code > 0) { panel(c, 300, 252, 196, 26, code * a, Y); dtext(c, MAIN, "ONE-TIME CODE", 310, 258, Y, code * a, { scale: 2 }); }
    const un = win(t, EV.unknown, EV.unknown + 0.9);
    if (un > 0) { panel(c, 404, 214, 98, 26, un * a, PK); dtext(c, MAIN, "WHO?", 420, 220, PK, un * a, { scale: 2 }); }
  } else {
    const pa = smooth(t, EV.panel, EV.panel + 0.35) * a;
    if (pa > 0) {
      panel(c, 378, 214, 142, 96, pa);
      const rows = [["CODE", EV.checks[0]], ["BALANCE", EV.checks[1]], ["LIKE YOU", EV.checks[2]]];
      rows.forEach(([txt, at], i) => { const ok = smooth(t, at, at + 0.25), y = 226 + i * 26;
        dtext(c, MAIN, txt, 412, y, mix(L, CARD, 0.5), pa, { scale: 2 }); if (ok > 0) dtext(c, MAIN, txt, 412, y, IV, ok * pa, { scale: 2 });
        fade(c, pa).rect(390, y, 14, 14, p2); if (ok > 0) { fade(c, ok * pa).rect(390, y, 14, 14, "#173A12"); dtext(c, MAIN, "✓", 391, y, GR, ok * pa, { scale: 2 }); } });
      const ap = smooth(t, EV.approved, EV.approved + 0.3) * a;
      if (ap > 0) { panel(c, 378, 318, 142, 30, ap, GR); dtext(c, MAIN, "APPROVED", 400, 325, GR, ap, { scale: 2 }); }
    }
  }
}

function hud(c, t, onGlobe) {
  const a = win(t, EV.hud[0], EV.hud[1]) * onGlobe; if (a <= 0) return;
  const x = 16, y = 604, ok = smooth(t, EV.beep, EV.beep + 0.2), f = fade(c, a); panel(c, x, y, 150, 66, a);
  f.rect(x + 10, y + 10, 30, 46, O); f.rect(x + 11, y + 11, 28, 44, p3); f.rect(x + 14, y + 14, 22, 14, "#13261A");
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) f.rect(x + 15 + i * 7, y + 33 + j * 7, 5, 4, p5);
  if (ok < 1) { const g = fade(c, a * (1 - ok)); for (let i = 0; i < 3; i++) if (((t * 5) | 0) % 3 === i) g.rect(x + 16 + i * 6, y + 20, 3, 3, Y); }
  if (ok > 0) { fade(c, a * ok).rect(x + 14, y + 14, 22, 14, "#173A12"); dtext(c, MAIN, "✓", x + 18, y + 17, GR, a * ok); }
  dtext(c, MAIN, "TERMINAL", x + 50, y + 14, L, a);
  if (ok < 1) dtext(c, MAIN, "WAITING", x + 50, y + 34, Y, a * (1 - ok)); if (ok > 0) dtext(c, MAIN, "APPROVED", x + 50, y + 34, GR, a * ok);
}
function counter(c, t) {
  const a = win(t, EV.counter[0], EV.counterOut, 0.3, 0.4); if (a <= 0) return;
  const k = ease((t - EV.counter[0]) / (EV.counter[1] - EV.counter[0])), v = Math.round(20000 * k / 100) * 100;
  const txt = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (k >= 1 ? "+" : "") + " KM";
  panel(c, 70, 200, 400, 98, a, Y);
  const o = { scale: 4 }, w = c.measure(MAIN, txt, o); dtext(c, MAIN, txt, Math.round(270 - w / 2), 214, Y, a, o);
  const s = smooth(t, EV.seconds, EV.seconds + 0.3) * a, st = "IN A FEW SECONDS", sw = c.measure(MAIN, st, { scale: 2 });
  if (s > 0) dtext(c, MAIN, st, Math.round(270 - sw / 2), 260, IV, s, { scale: 2 });
}

function outroScene(c, t) {
  for (let i = 0; i < 60; i++) c.px((i * 211) % GW, TOP + ((i * 137) % (BOT - TOP)), i % 5 ? "#2A2140" : MU);
  c.tint(0, TOP, GW, BOT - TOP, (x, y) => Math.max(0, 0.35 - Math.hypot(x - 270, (y - 420) * 1.1) / 420), "#2A1B4A", 10);
  const q1 = "WANT MORE BREAKDOWNS", q2 = "LIKE THIS?", o = { scale: 3 };
  const qa = smooth(t, EV.outroIn[1], EV.outroIn[1] + 0.4);
  dtext(c, MAIN, q1, Math.round(270 - c.measure(MAIN, q1, o) / 2), 214, IV, qa, o);
  dtext(c, MAIN, q2, Math.round(270 - c.measure(MAIN, q2, o) / 2), 244, IV, qa, o);
  // character with dissolved frame/pose changes
  const pose = t < EV.point ? "wave" : t < EV.toggle ? "point" : "happy", start = pose === "wave" ? EV.outroIn[0] : pose === "point" ? EV.point : EV.toggle;
  const frames = A.outro[pose], fpos = (t - start) * 4, f0 = Math.floor(fpos) % frames.length, f1 = (f0 + 1) % frames.length, mixk = smooth(fpos % 1, 0.75, 1);
  const prevPose = pose === "point" ? "wave" : pose === "happy" ? "point" : null, poseK = prevPose ? smooth(t, start, start + 0.3) : 1;
  const sx = 174, sy = 288;
  const drawSprite = (img, a) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (img.data[k + 3] < 128) continue; if (a < 1 && a <= bayer(sx + i, sy + j)) continue; c.px(sx + i, sy + j, [img.data[k], img.data[k + 1], img.data[k + 2]]); } };
  if (prevPose && poseK < 1) drawSprite(A.outro[prevPose][A.outro[prevPose].length - 1], 1 - poseK);
  drawSprite(frames[f0], poseK * (1 - mixk)); if (mixk > 0) drawSprite(frames[f1], poseK * mixk);
  // handle + button
  const ha = smooth(t, EV.outroIn[1] + 0.1, EV.outroIn[1] + 0.5), hs = "@KAGENAMI_AI";
  dtext(c, MAIN, hs, Math.round(270 - c.measure(MAIN, hs, o) / 2), 512, IV, ha, o);
  const press = t >= EV.click && t < EV.click + 0.14 ? 2 : 0, done = smooth(t, EV.toggle, EV.toggle + 0.2);
  const bw = 232, bx = 270 - bw / 2, by = 560 + press;
  for (let j = 0; j < 44; j++) for (let i = 0; i < bw; i++) {
    if (ha <= bayer(bx + i, by + j)) continue;
    const corner = (i < 2 || i > bw - 3) && (j < 2 || j > 41); if (corner) continue;
    const edge = i === 0 || i === bw - 1 || j === 0 || j === 43, base = done > bayer(bx + i + 2, by + j) ? (j < 4 ? "#9BF07A" : GR) : (j < 4 ? p7 : P);
    c.px(bx + i, by + j, edge ? O : j > 38 ? mix(base, O, 0.35) : base);
  }
  const l1 = "FOLLOW", l2 = "FOLLOWING ✓";
  if (done < 1) dtext(c, MAIN, l1, Math.round(270 - c.measure(MAIN, l1, o) / 2), by + 12, IV, ha * (1 - done), o);
  if (done > 0) dtext(c, MAIN, l2, Math.round(270 - c.measure(MAIN, l2, o) / 2), by + 12, O, ha * done, o);
  // pixel cursor hand: arrives on the point, presses on the click
  const ca = smooth(t, EV.point, EV.point + 0.3) * (1 - smooth(t, EV.toggle + 0.4, EV.toggle + 0.7));
  if (ca > 0) {
    const k = ease((t - EV.point) / 0.6), cx = Math.round(lerp(470, 300, k)), cy = Math.round(lerp(660, 586, k)) + press;
    const HAND = ["..XX......", ".X..X.....", ".X..X.....", ".X..XXX...", ".X..X..XX.", "XX..X..X.X", "X...X..X.X", "X........X", ".X.......X", "..X.....X.", "...XXXXX.."];
    HAND.forEach((row, j) => [...row].forEach((ch, i) => { const X = cx + i * 2, Yy = cy + j * 2; if (ca <= bayer(X, Yy)) return; const col = ch === "X" ? O : (row.indexOf("X") < i && row.lastIndexOf("X") > i ? IV : null); if (col) c.rect(X, Yy, 2, 2, col); }));
  }
}

function header(c) {
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 });
  const d = Math.round(END) + " S"; c.text(MAIN, d, 469 - c.measure(MAIN, d, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "WHAT HAPPENS WHEN YOU TAP", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlay(A.avatar, 76, 254, 1);
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d;
  for (let y = 0; y < GH; y++) {
    const row = new Uint8ClampedArray(1080 * 3);
    for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; }
    FULL.set(row, (y * 2) * 3240); FULL.set(row, (y * 2 + 1) * 3240);
  }
  for (const ov of overlays) {
    const { img, x, y, alpha } = ov;
    for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) {
      const X = x + i, Yy = y + j; if (X < 0 || Yy < 0 || X >= 1080 || Yy >= 1920) continue;
      if (alpha < 1 && alpha <= bayer(X >> 1, Yy >> 1)) continue;
      const k = (j * img.w + i) * 4, a = img.data[k + 3] / 255; if (a <= 0) continue;
      const o = (Yy * 1080 + X) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a;
    }
  }
  return FULL;
}

await loadAssets();
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) {
    const t = Number(s), buf = toFull(frame(t));
    await sharp(Buffer.from(buf), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`);
    console.log("still", t);
  }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Number(args[2] ?? Math.round(END * FPS)), out = args[3] ?? HERE + "video-noaudio.mp4";
  const ff = spawn(ROOT + "bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) {
    const buf = toFull(frame(f / FPS));
    if (!ff.stdin.write(Buffer.from(buf))) await new Promise((r) => ff.stdin.once("drain", r));
    if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r));
  console.log("done", out, ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
