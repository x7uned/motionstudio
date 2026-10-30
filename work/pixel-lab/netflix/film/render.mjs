// «How Netflix streams» — pixel film (planet + isometric dioramas). 540×960 grid ×2 → 1080×1920, 30 fps.
// One world: a bedroom in London inside a terraced house on a London street, on the pixel Earth (renderer/pixel/earth v1).
// node render.mjs --stills 3,9.5,... | --sheet t1,t2,... out.jpg | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe, project, routeSamples, ground, lightDensity } from "../../../../renderer/pixel/earth.mjs";
import { drawRoom, drawLondon, HOUSE, ROOM_FOCUS, ROOM_FOCUS_D, DISTRICT_CENTER, CABLE, ISP } from "./dioramas.mjs";
import { along } from "../../tap-film/iso.mjs";
import { EV, END, FPS, WORDS, VOICE, depth } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, BOT = 960, K = "#000000", R = Math.round;
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056", GR = "#65DA41", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const dtext = (c, str, x, y, col, a = 1, scale = 1, font = MAIN) => { if (a > 0) fade(c, a).text(font, str, R(x), R(y), col, { scale }); };
function pill(c, txt, cx, y, col, edge, a = 1, scale = 2) { if (a <= 0) return [0, 0]; const g = fade(c, a), w = c.measure(MAIN, txt, { scale }) + 22, h = 7 * scale + 12, x = R(Math.max(6, Math.min(GW - 6 - w, cx - w / 2))); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); g.text(MAIN, txt, x + 11, y + 6, col, { scale }); return [x, w]; }
function panel(c, x, y, w, h, a = 1, edge = p7, fill = CARD) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, fill, 2); }

// ---------------------------------------------------------------- assets
async function rgba(input, w, h, o = {}) { let img = sharp(input); if (o.extract) img = img.extract(o.extract); const { data, info } = await img.resize(w, h, { kernel: o.kernel ?? "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
const MEDIA = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets, mediaFile = (subj) => HERE + "media/" + MEDIA.find((a) => a.subject === subj).file.split("/").pop();
const A = {};
async function loadAssets() {
  A.avatar = await avatar(66);
  for (const [k, s, w, h] of [["uk", "United Kingdom", 48, 28], ["us", "United States", 48, 26], ["nl", "Netherlands", 42, 28]]) A[k] = await rgba(mediaFile(s), w, h, { kernel: "lanczos3" });
  A.netflix = await rgba(mediaFile("Netflix"), 88, 88, { kernel: "lanczos3" });
  A.aws = await rgba(mediaFile("Amazon Web Services"), 100, 60, { kernel: "lanczos3" });
  A.outro = {};
  for (const [name, row, n] of [["wave", 1, 4], ["point", 4, 6], ["happy", 9, 6]]) { A.outro[name] = []; for (let f = 0; f < n; f++) A.outro[name].push(await rgba(SHEET, 192, 208, { extract: { left: f * 192, top: row * 208, width: 192, height: 208 } })); }
}
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}
const overlays = [];
const overlay = (img, x, y, alpha = 1) => { if (alpha > 0) overlays.push({ img, x: R(x), y: R(y), alpha }); };
const flagTag = (c, img, x, y, a) => { if (a <= 0) return; fade(c, a).rect(x - 1, y - 1, img.w / 2 + 2, img.h / 2 + 2, O); overlay(img, x * S, y * S, a); };

// ---------------------------------------------------------------- geography and the camera
const CITY = { london: { lat: 51.5, lon: -0.12 }, amsterdam: { lat: 52.37, lon: 4.9 }, virginia: { lat: 38.9, lon: -77.4 }, california: { lat: 37.4, lon: -121.9 } };
const R0 = 252, RMAX = 9000, GCX = 270, GCY = 462, UDF = 1.5, UI = 5.4;
const SUN = { lat: -5, lon: 125 };
function overCenter(t) { const lon = t < 30.6 ? -75 + 3.1 * (t - 6.6) : t < 41.6 ? -0.5 : t < 66 ? 2 * (t - 41.6) : 3 * (t - 66); return { lat0: 30, lon0: lon }; }
let DOVR = null;
function camera(t) {
  const D = DOVR ?? depth(t);
  if (D <= 1) return { D, phase: "near", L: D };
  const z = 2 - D, o = overCenter(t), w = smooth(z, 0, 0.55), c = CITY.london;
  return { D, phase: "globe", z, view: { lat0: lerp(o.lat0, c.lat, w), lon0: lerp(o.lon0, c.lon, w), R: R0 * Math.pow(RMAX / R0, z), cx: GCX, cy: GCY } };
}
// Netflix's servers: a deterministic scatter over lit land, plus the cities we name
const OCAS = (() => {
  const out = [[51.5, -0.12], [52.37, 4.9], [40.7, -74], [34, -118.2], [37.4, -121.9], [41.9, -87.6], [43.7, -79.4], [19.4, -99.1], [-23.5, -46.6], [-34.6, -58.4], [48.86, 2.35], [50.1, 8.7], [40.4, -3.7], [45.5, 9.2], [55.7, 12.6], [59.3, 18.1], [6.5, 3.4], [-26.2, 28], [30, 31.2], [25.2, 55.3], [19.1, 72.9], [28.6, 77.2], [1.35, 103.8], [35.7, 139.7], [37.5, 127], [-33.9, 151.2], [-37.8, 145], [14.6, 121], [-6.2, 106.8], [13.7, 100.5]];
  for (let i = 0; out.length < 260 && i < 20000; i++) { const la = -45 + rnd(i * 3 + 1) * 110, lo = -180 + rnd(i * 7 + 5) * 360; if (!ground(la, lo) || lightDensity(la, lo) < 1 || rnd(i * 11) < 0.35) continue; out.push([la, lo]); }
  return out.map(([lat, lon], i) => ({ lat, lon, t0: EV.servers[0] + 0.4 + (i < 2 ? 0.2 : rnd(i * 13) * 5.6) }));
})();
const nightK = (lat, lon) => { const r = Math.PI / 180, a = [Math.cos(lat * r) * Math.cos(lon * r), Math.cos(lat * r) * Math.sin(lon * r), Math.sin(lat * r)], s = [Math.cos(SUN.lat * r) * Math.cos(SUN.lon * r), Math.cos(SUN.lat * r) * Math.sin(SUN.lon * r), Math.sin(SUN.lat * r)]; return a[0] * s[0] + a[1] * s[1] + a[2] * s[2] < 0; };

function stars(c, t) { for (let i = 0; i < 120; i++) { const x = (i * 197 + R(t * 2)) % GW, y = TOP + ((i * 331) % (BOT - TOP)); c.px(x, y, i % 7 ? "#2E2A48" : Math.sin(t * 2 + i) > 0.6 ? IV : MU); } }
function pin(c, x, y, col, a) { if (a <= 0) return; const g = fade(c, a); g.rect(R(x) - 3, R(y) - 9, 7, 7, O); g.rect(R(x) - 2, R(y) - 8, 5, 5, col); g.rect(R(x), R(y) - 3, 1, 3, col); g.px(R(x) - 1, R(y) - 7, IV); }
function arcPath(view, a, b, h0, h1, k0, k1) { const s = routeSamples([[a.lon, a.lat], [b.lon, b.lat]]), out = []; for (let i = 0; i < s.pts.length; i++) { const f = s.cum[i] / s.km; if (f < k0 || f > k1) continue; const lift = h0 + (h1 - h0) * f + 0.08 * Math.sin(Math.PI * f); const p = project(view, s.pts[i][1], s.pts[i][0], lift); if (p.visible) out.push([p.x, p.y]); } return out; }
function dashPts(c, pts, col, phase = 0, a = 1) { if (a <= 0) return; const g = fade(c, a); let acc = 0; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, R(Math.hypot(bx - ax, by - ay))); for (let s = 0; s < n; s++, acc++) if (((acc + phase) % 8 + 8) % 8 < 5) g.rect(R(ax + ((bx - ax) * s) / n), R(ay + ((by - ay) * s) / n), 1, 1, col); } }
function cloud(c, x, y, s, a) { if (a <= 0) return; const g = fade(c, a); for (const [dx, dy, r] of [[-14, 2, 9], [-3, -5, 12], [10, 0, 9], [18, 4, 6], [-22, 5, 5]]) { g.disc(R(x + dx * s), R(y + dy * s), R(r * s) + 1, "#5E5478"); } for (const [dx, dy, r] of [[-14, 2, 9], [-3, -5, 12], [10, 0, 9], [18, 4, 6], [-22, 5, 5]]) g.disc(R(x + dx * s), R(y + dy * s), R(r * s), "#E8E4F4"); g.rect(R(x - 24 * s), R(y + 4 * s), R(46 * s), R(6 * s), "#E8E4F4"); for (const [dx, dy] of [[-8, -9], [4, -11]]) g.rect(R(x + dx * s), R(y + dy * s), R(6 * s), 1, IV); }

// ---------------------------------------------------------------- globe layer
function globeLayer(c, t, view, vis) {
  // the cloud (menus and recommendations) over Virginia, with requests from London
  const cl = win(t, EV.cloud[0], EV.cloud[1], 0.35, 0.4) * (1 - 0.6 * smooth(t, EV.closer, EV.closer + 0.4));
  if (cl > 0) { const p = project(view, CITY.virginia.lat, CITY.virginia.lon, 1.16); if (p.visible) { const req = win(t, EV.menuReq[0], EV.menuReq[1], 0.3, 0.3); const pts = arcPath(view, CITY.london, CITY.virginia, 1.0, 1.16, 0, smooth(t, EV.menuReq[0], EV.menuReq[0] + 0.8)); dashPts(c, pts, L, -t * 30, req * vis);
    cloud(c, p.x, p.y - 8, 1, cl * vis); const aw = cl * vis * smooth(t, EV.aws, EV.aws + 0.3); if (aw > 0) { panel(c, R(p.x - 30), R(p.y - 62), 60, 38, aw, IV, IV); overlay(A.aws, (R(p.x - 30) + 5) * S, (R(p.y - 62) + 4) * S, aw); } } }
  // Netflix's own servers popping up across the planet
  const nightFill = win(t, EV.fill[0], EV.fill[1], 0.4, 0.4), traffic = smooth(t, EV.traffic[0], EV.traffic[0] + 1);
  OCAS.forEach((o, i) => {
    const on = smooth(t, o.t0, o.t0 + 0.25); if (on <= 0) return; const p = project(view, o.lat, o.lon); if (!p.visible) return;
    const x = R(p.x), y = R(p.y), g = fade(c, on * vis);
    if (t - o.t0 < 0.7 && t > o.t0) { const k = (t - o.t0) / 0.7; fade(c, (1 - k) * vis).ring(x, y, R(2 + k * 8), PK); }
    if (traffic > 0) { for (let k = 0; k < 3; k++) { const an = rnd(i * 5 + k) * Math.PI * 2, len = 6 + rnd(i * 9 + k) * 8, ph = ((t * 1.6 + rnd(i + k)) % 1); fade(c, traffic * vis * (1 - ph)).px(R(x + Math.cos(an) * len * ph), R(y + Math.sin(an) * len * ph), YL); } }
    g.rect(x - 2, y - 2, 4, 4, O); g.rect(x - 1, y - 1, 2, 2, traffic > 0 && Math.sin(t * 6 + i) > 0.3 ? YL : PK);
    if (nightFill > 0 && nightK(o.lat, o.lon) && i % 2 === 0) { const k = clamp01((t - EV.fill[0] - rnd(i) * 1.5) / 3.5); if (k > 0 && k < 1) { const f = fade(c, nightFill * vis); f.rect(x - 4, y - 8, 8, 2, p3); f.rect(x - 4, y - 8, R(8 * k), 2, Y); f.px(x, y - 11 + R((t * 6 + i) % 3), YL); } }
  });
  // nightly fill streams from the cloud store to the boxes
  if (nightFill > 0) { const src = CITY.virginia; OCAS.filter((o, i) => i % 9 === 0).forEach((o, k) => { const pts = arcPath(view, src, { lat: o.lat, lon: o.lon }, 1.16, 1.0, 0, 1); dashPts(c, pts, Y, -t * 40 + k * 3, nightFill * vis * 0.8); }); }
  // London pin with the flag; Amsterdam pin, the switch arc and its stream
  const lp = smooth(t, EV.londonPin, EV.londonPin + 0.35) * (1 - smooth(t, EV.titles[0], EV.titles[0] + 0.4));
  if (lp > 0) { const p = project(view, CITY.london.lat, CITY.london.lon); if (p.visible) { pin(c, p.x, p.y, Y, lp * vis); panel(c, R(p.x - 106), R(p.y - 44), 98, 26, lp * vis); flagTag(c, A.uk, R(p.x - 102), R(p.y - 41), lp * vis); dtext(c, "LONDON", R(p.x - 74), R(p.y - 38), IV, lp * vis, 2); } }
  const am = win(t, EV.amsterdam - 0.6, EV.titles[0], 0.3, 0.4);
  if (am > 0) { const p = project(view, CITY.amsterdam.lat, CITY.amsterdam.lon); if (p.visible) { pin(c, p.x, p.y, PK, am * vis); panel(c, R(p.x + 8), R(p.y - 44), 132, 26, am * vis, PK); flagTag(c, A.nl, R(p.x + 12), R(p.y - 41), am * vis); dtext(c, "AMSTERDAM", R(p.x + 37), R(p.y - 38), IV, am * vis, 2); }
    const k = smooth(t, EV.amsterdam - 0.5, EV.amsterdam + 0.3), pts = arcPath(view, CITY.amsterdam, CITY.london, 1.0, 1.0, 0, k); dashPts(c, pts, Y, -t * 40, am * vis); for (let j = 0; j < 4; j++) { const f = ((t * 0.9 + j / 4) % 1); if (pts.length > 2 && k > 0.95) { const q = pts[Math.min(pts.length - 1, R(f * (pts.length - 1)))]; fade(c, am * vis).rect(R(q[0]) - 2, R(q[1]) - 2, 4, 4, j % 2 ? YL : Y); } } }
}

// ---------------------------------------------------------------- near phase: bedroom and street
const layer = new Canvas(GW, GH, K), layer2 = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
function roomState(t) {
  const block = t < EV.chunks[0] - 0.4 ? 1 : t < EV.sharpen[0] ? 7 - 2 * smooth(t, EV.picks, EV.fit + 0.4) : lerp(5, 1, smooth(t, EV.sharpen[0], EV.sharpen[1] - 0.4));
  return { t, screenOn: smooth(t, EV.press - 0.1, EV.press + 0.15), spinner: smooth(t, EV.spinner[1] - 0.15, EV.spinner[1]), showOn: EV.showOn, block: R(block) };
}
function districtState(t) { return { t, textOn: true, busy: t > EV.busy && t < EV.amsterdam + 0.5 ? 1 : 0 }; }
function chunkCube(c, x, y, s, col) { const w = Math.max(3, R(5 * s)); c.rect(R(x - w / 2) - 1, R(y - w / 2) - 1, w + 2, w + 2, O); c.rect(R(x - w / 2), R(y - w / 2), w, w, col); c.rect(R(x - w / 2), R(y - w / 2), w, 1, IV); }
function nearPhase(c, t, Lk) {
  const Ud = UDF * Math.pow(UI / HOUSE.s / UDF, 1 - Lk), F = ROOM_FOCUS_D.map((v, i) => lerp(v, DISTRICT_CENTER[i], Lk));
  const ox = GCX - (F[0] - F[1]) * Ud, oy = GCY - ((F[0] + F[1]) / 2 - F[2]) * Ud;
  const dA = smooth(Lk, 0.18, 0.5), iA = 1 - smooth(Lk, 0.4, 0.72);
  if (dA > 0) { layer.d.set(c.d); districtScene(layer, t, ox, oy, Ud); dissolve(c, layer, dA); }
  if (iA > 0) { layer.d.set(c.d); roomScene(layer, t, ox + (HOUSE.x - HOUSE.y) * Ud, oy + ((HOUSE.x + HOUSE.y) / 2) * Ud, Ud * HOUSE.s); dissolve(c, layer, iA); }
}
function roomScene(cv, t, ox, oy, U) {
  const I = drawRoom(cv, ox, oy, U, roomState(t));
  // chunks flying from the window to the laptop, sized by the quality the player picked
  const ca = win(t, EV.chunks[0] - 0.2, EV.sharpen[1], 0.3, 0.4);
  if (ca > 0) for (let k = 0; k < 14; k++) { const t0 = EV.chunks[0] - 0.2 + k * 0.42; if (t < t0 || t > t0 + 1.1) continue; const f = (t - t0) / 1.1, a = [0.5, 32, 33], b = [45, 15.5, 19], q = [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f) + 10 * Math.sin(Math.PI * f)], [sx, sy] = I.P3(...q);
    const lvl = chunkLevel(t0); chunkCube(fade(cv, ca * Math.min(1, (1 - f) * 6)), sx, sy, U * (0.38 + 0.14 * lvl), ["#B08AE8", "#8D59DA", "#F4CA50", "#FAE375", "#65DA41"][lvl]); }
}
const chunkLevel = (t0) => (t0 < EV.picks ? 1 : t0 < EV.fit ? 2 : t0 < EV.sharpen[0] ? 3 : 4);
function districtScene(cv, t, ox, oy, U) {
  const I = drawLondon(cv, ox, oy, U, districtState(t));
  const ca = win(t, EV.chunks1[0] - 0.3, EV.busy + 0.3, 0.3, 0.4);
  if (ca > 0) for (let k = 0; k < 16; k++) { const f = ((t * 0.32 + k / 16) % 1), [x, y, z] = along(CABLE, f), [sx, sy] = I.P3(x, y, z + 2); chunkCube(fade(cv, ca), sx, sy, Math.max(0.5, U * 0.55), k % 3 ? Y : YL); }
}

// ---------------------------------------------------------------- HUD (screen space)
const POSTERS = [["#E03056", "#2A0E1A"], ["#5470B8", "#121A30"], ["#65DA41", "#14301E"], ["#F4CA50", "#3A2A08"], ["#8D59DA", "#1A1030"], ["#F28A4A", "#3A1A0E"], ["#A9C4FF", "#1E2A5A"], ["#E0CDF8", "#2A1F40"]];
function poster(g, x, y, w, h, i) { const [a, b] = POSTERS[i % POSTERS.length]; for (let j = 0; j < h; j++) g.rect(x, y + j, w, 1, mix(a, b, j / h)); g.rect(x + R(w * 0.3), y + R(h * 0.25), R(w * 0.4), R(w * 0.4), mix(a, "#FDFEED", 0.4)); g.rect(x + 2, y + h - 6, w - 4, 2, IV); g.frame(x, y, w, h, O); }
function fileIcon(g, x, y, col = L) { g.rect(x, y, 8, 10, col); g.rect(x + 5, y, 3, 3, O); g.rect(x + 5, y + 2, 1, 1, col); g.rect(x + 2, y + 4, 4, 1, p3); g.rect(x + 2, y + 6, 4, 1, p3); }
function hud(c, t) {
  // opening: about a second; the Netflix logo; 300M+ homes
  const sec = win(t, EV.second[0], EV.second[1], 0.25, 0.3); if (sec > 0) { const [x] = pill(c, "1 SECOND", 270, 206, Y, Y, sec); const g = fade(c, sec); g.ring(x - 16, 219, 9, Y); g.line(x - 16, 219, x - 16, 213, Y); g.line(x - 16, 219, x - 11 + R(Math.sin(t * 6)), 219, Y); }
  const lg = win(t, EV.logo[0], EV.logo[1], 0.3, 0.35); if (lg > 0) { panel(c, 224, 202, 92, 92, lg, IV, O); overlay(A.netflix, 226 * S, 204 * S, lg); }
  pill(c, "300M+ HOMES", 270, 302, IV, p7, win(t, EV.homes[0], EV.homes[1], 0.3, 0.3));
  pill(c, "MENUS · PICKS", 400, 206, L, p7, win(t, EV.menuReq[0] + 0.3, EV.closer, 0.3, 0.3));
  // the servers count, the 100+ TB box
  const sv = win(t, EV.count, EV.tb[0] - 0.1, 0.3, 0.3); if (sv > 0) pill(c, `${Math.min(18, R(18 * smooth(t, EV.count, EV.count + 1.4)))},000+ SERVERS`, 270, 206, PK, PK, sv);
  const tb = win(t, EV.tb[0], EV.tb[1], 0.3, 0.3); if (tb > 0) { panel(c, 150, 202, 240, 60, tb, PK); const g = fade(c, tb); g.rect(166, 214, 60, 36, "#B02040"); g.rect(166, 214, 60, 2, "#F88090"); for (let k = 0; k < 5; k++) g.rect(170 + k * 11, 220, 8, 24, k % 2 ? "#E03056" : "#C02848"); g.rect(214, 240, 4, 4, GR); g.text(MAIN, "100+ TB", 240, 216, IV, { scale: 3 }); g.text(TINY, "EACH, THE BIG ONES", 240, 242, L, { scale: 2 }); }
  pill(c, "WHILE YOU SLEEP", 270, 206, Y, Y, win(t, EV.night, EV.download - 0.1, 0.3, 0.3));
  pill(c, "TOMORROW'S PICKS", 270, 206, Y, Y, win(t, EV.download, EV.fill[1], 0.3, 0.3));
  // London street: 3 km away, not California; busy
  pill(c, "A FEW KM AWAY ✓", 270, 206, GR, GR, win(t, EV.km, EV.busy - 0.1, 0.25, 0.3));
  const ca = win(t, EV.california - 0.6, EV.busy - 0.1, 0.25, 0.3); if (ca > 0) { panel(c, 300, 246, 200, 30, ca, MU); flagTag(c, A.us, 308, 251, ca); dtext(c, "CALIFORNIA", 340, 255, MU, ca, 2); const k = smooth(t, EV.california, EV.california + 0.25); if (k > 0) fade(c, ca).rect(334, 260, R(150 * k), 3, PK); }
  pill(c, "BUSY", 270, 206, PK, PK, win(t, EV.busy, EV.switch[0], 0.15, 0.3));
  pill(c, "NEXT SERVER", 270, 206, Y, Y, win(t, EV.switch[0], EV.oneFile[0] - 0.1, 0.25, 0.3));
  // versions board over the dimmed planet
  const bd = win(t, EV.oneFile[0] - 0.2, EV.stranger[1] - 0.6, 0.35, 0.4);
  if (bd > 0) c.tint(0, TOP, GW, 470, () => 0.62 * bd, "#0B0812", 6);
  const of = win(t, EV.oneFile[0], EV.titles[0] - 0.1, 0.25, 0.3); if (of > 0) { const [x, w] = pill(c, "ONE FILE?", 270, 260, IV, IV, of, 3); fileIcon(fade(c, of), x - 20, 266); const k = smooth(t, EV.oneFile[0] + 0.45, EV.oneFile[0] + 0.7); if (k > 0) fade(c, of).rect(x + 6, 274, R((w - 12) * k), 3, PK); }
  const ti = win(t, EV.titles[0], EV.versions[0] + 0.4, 0.3, 0.35);
  if (ti > 0) { panel(c, 120, 204, 300, 34, ti); flagTag(c, A.uk, 130, 211, ti); dtext(c, "9,000 TITLES", 166, 213, IV, ti * smooth(t, EV.nine, EV.nine + 0.3), 2);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 9; q++) { const i = r * 9 + q, a = ti * smooth(t, EV.nine - 0.3 + i * 0.03, EV.nine - 0.1 + i * 0.03); if (a > 0) poster(fade(c, a), 42 + q * 51, 252 + r * 66, 44, 60, i); } }
  const vs = win(t, EV.versions[0], EV.stranger[0] - 0.1, 0.35, 0.35);
  if (vs > 0) { const g = fade(c, vs); poster(g, 30, 236, 96, 136, 0); g.text(TINY, "ONE TITLE", 38, 380, L, { scale: 2 });
    const rows = [["SIZES", EV.sizes, ["4K", "1080P", "720P", "480P"], Y], ["CODECS", EV.codecs, ["AV1", "HEVC", "VP9", "H.264"], p7], ["AUDIO", EV.audio, ["EN", "ES", "FR", "DE", "JA", "+30"], GR], ["SUBTITLES", EV.subs, ["CC", "CC", "CC", "+30"], IV]];
    rows.forEach(([lab, t0, chips, col], ri) => { const y = 236 + ri * 40, ra = vs * smooth(t, t0 - 0.1, t0 + 0.2); if (ra <= 0) return; dtext(c, lab, 144, y, col, ra, 2, TINY); let x = 144; chips.forEach((ch, k) => { const a = ra * smooth(t, t0 + k * 0.07, t0 + 0.15 + k * 0.07); if (a <= 0) return; const w = c.measure(MAIN, ch, { scale: 2 }) + 12; fade(c, a).rrect(x, y + 12, w, 22, col, 2); fade(c, a).rrect(x + 2, y + 14, w - 4, 18, CARD, 2); dtext(c, ch, x + 6, y + 16, col, a, 2); x += w + 6; }); fade(c, ra).line(126, 300, 140, y + 22, p5); }); }
  const sg = win(t, EV.stranger[0], EV.stranger[1] - 0.6, 0.3, 0.4);
  if (sg > 0) { const g = fade(c, sg); g.text(MAIN, "ONE SEASON OF", R(270 - c.measure(MAIN, "ONE SEASON OF", { scale: 2 }) / 2), 214, L, { scale: 2 }); g.text(MAIN, "STRANGER THINGS", R(270 - c.measure(MAIN, "STRANGER THINGS", { scale: 3 }) / 2), 236, PK, { scale: 3, shadow: O, shadowOffset: 1 });
    const n = R(9570 * smooth(t, EV.stranger[0] + 0.6, EV.tenK + 0.3)), s = n.toLocaleString("en-US"); g.text(MAIN, s, R(270 - c.measure(MAIN, s, { scale: 6 }) / 2), 284, Y, { scale: 6, shadow: O, shadowOffset: 2 }); g.text(MAIN, "FILES", R(270 - c.measure(MAIN, "FILES", { scale: 3 }) / 2), 342, IV, { scale: 3 });
    for (let k = 0; k < 90; k++) { const t0 = EV.stranger[0] + 0.5 + k * 0.03; if (t < t0) continue; const f = Math.min(1, (t - t0) / 0.6), x = 60 + ((k * 53) % 420), yEnd = 470 - Math.floor(k / 12) * 11 - (k % 3) * 2, y = lerp(380, yEnd, f * f); fileIcon(g, R(x), R(y), [L, Y, GR, p7][k % 4]); } }
  // the player picking chunks: speed and the quality ladder
  const pk = win(t, EV.chunks[0], EV.sharpen[1] - 0.2, 0.3, 0.35);
  if (pk > 0) { panel(c, 14, 202, 168, 64, pk, Y); const g = fade(c, pk), sp = 0.45 + 0.35 * Math.sin(t * 2.3) * Math.sin(t * 0.7) + 0.25 * smooth(t, EV.picks, EV.sharpen[0]); g.text(TINY, "YOUR SPEED", 26, 212, Y, { scale: 2 }); for (let k = 0; k < 10; k++) g.rect(26 + k * 15, 232, 12, 22, k / 10 < clamp01(sp) ? Y : p3);
    panel(c, 392, 202, 134, 132, pk, GR); g.text(TINY, "QUALITY", 404, 212, GR, { scale: 2 }); const rungs = ["4K", "1080P", "720P", "480P", "240P"], lvl = chunkLevel(t - 0.3), pick = 4 - Math.min(4, lvl); rungs.forEach((r, i) => { const y = 232 + i * 19, on = i === pick; g.rect(404, y, 110, 16, on ? GR : p3); g.text(MAIN, r, 410, y + 4, on ? O : L, { scale: 1 }); }); }
  pill(c, "SHARP ✓", 270, 206, GR, GR, win(t, EV.sharpen[0] + 0.6, EV.sharpen[1] + 0.2, 0.25, 0.3));
  // the share of the internet
  const ft = win(t, EV.fifteen - 0.2, EV.outroIn[0], 0.3, 0.3);
  if (ft > 0) { panel(c, 100, 202, 340, 70, ft, PK); const g = fade(c, ft), cx = 140, cy = 237, r = 24; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) { const d = Math.hypot(x, y); if (d > r) continue; let an = Math.atan2(x, -y); if (an < 0) an += Math.PI * 2; g.px(cx + x, cy + y, an < 0.15 * Math.PI * 2 * smooth(t, EV.fifteen, EV.fifteen + 0.6) ? PK : d > r - 1.5 ? p5 : p3); }
    g.text(MAIN, "15%", 178, 214, PK, { scale: 4 }); g.text(TINY, "OF ALL DATA FLOWING", 180, 248, L, { scale: 2 }); g.text(TINY, "DOWN THE INTERNET · 2022", 180, 260, MU, { scale: 1 }); }
}

// ---------------------------------------------------------------- captions (karaoke)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { if (w.start >= EV.outroIn[0]) break; const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = g.start - 0.12; g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(EV.outroIn[0], e + 0.9); });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : O) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? IV : Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- outro (same pack as the Kagenami films)
function outroScene(c, t) {
  for (let y = TOP; y < BOT; y++) for (let x = 0; x < GW; x++) c.px(x, y, "#0B0812");
  for (let i = 0; i < 90; i++) c.px((i * 211) % GW, TOP + ((i * 137) % (BOT - TOP)), i % 5 ? "#2A2140" : MU);
  c.tint(0, TOP, GW, BOT - TOP, (x, y) => Math.max(0, 0.35 - Math.hypot(x - 270, (y - 420) * 1.1) / 420), "#2A1B4A", 10);
  const o = { scale: 3 }, qa = smooth(t, EV.outroIn[1], EV.outroIn[1] + 0.4);
  for (const [s, y] of [["WANT MORE BREAKDOWNS", 214], ["LIKE THIS?", 244]]) dtext(c, s, R(270 - c.measure(MAIN, s, o) / 2), y, IV, qa, 3);
  const pose = t < EV.point ? "wave" : t < EV.toggle ? "point" : "happy", start = pose === "wave" ? EV.outroIn[0] : pose === "point" ? EV.point : EV.toggle;
  const frames = A.outro[pose], fpos = (t - start) * 4, f0 = Math.floor(fpos) % frames.length, f1 = (f0 + 1) % frames.length, mk = smooth(fpos % 1, 0.75, 1);
  const prev = pose === "point" ? "wave" : pose === "happy" ? "point" : null, pk = prev ? smooth(t, start, start + 0.3) : 1, sx = 174, sy = 288;
  const spr = (img, a) => { for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (img.data[k + 3] < 128) continue; if (a < 1 && a <= bayer(sx + i, sy + j)) continue; c.px(sx + i, sy + j, [img.data[k], img.data[k + 1], img.data[k + 2]]); } };
  if (prev && pk < 1) spr(A.outro[prev][A.outro[prev].length - 1], 1 - pk); spr(frames[f0], pk * (1 - mk)); if (mk > 0) spr(frames[f1], pk * mk);
  const ha = smooth(t, EV.outroIn[1] + 0.1, EV.outroIn[1] + 0.5), hs = "@KAGENAMI_AI"; dtext(c, hs, R(270 - c.measure(MAIN, hs, o) / 2), 512, IV, ha, 3);
  const press = t >= EV.click && t < EV.click + 0.14 ? 2 : 0, done = smooth(t, EV.toggle, EV.toggle + 0.2), bw = 232, bx = 270 - bw / 2, by = 560 + press;
  for (let j = 0; j < 44; j++) for (let i = 0; i < bw; i++) { if (ha <= bayer(bx + i, by + j)) continue; if ((i < 2 || i > bw - 3) && (j < 2 || j > 41)) continue; const edge = i === 0 || i === bw - 1 || j === 0 || j === 43, base = done > bayer(bx + i + 2, by + j) ? (j < 4 ? "#9BF07A" : GR) : (j < 4 ? p7 : P); c.px(bx + i, by + j, edge ? O : j > 38 ? mix(base, O, 0.35) : base); }
  if (done < 1) dtext(c, "FOLLOW", R(270 - c.measure(MAIN, "FOLLOW", o) / 2), by + 12, IV, ha * (1 - done), 3); if (done > 0) dtext(c, "FOLLOWING ✓", R(270 - c.measure(MAIN, "FOLLOWING ✓", o) / 2), by + 12, O, ha * done, 3);
  const ca = smooth(t, EV.point, EV.point + 0.3) * (1 - smooth(t, EV.toggle + 0.4, EV.toggle + 0.7));
  if (ca > 0) { const k = ease((t - EV.point) / 0.6), cx = R(lerp(470, 300, k)), cy = R(lerp(660, 586, k)) + press;
    ["..XX......", ".X..X.....", ".X..X.....", ".X..XXX...", ".X..X..XX.", "XX..X..X.X", "X...X..X.X", "X........X", ".X.......X", "..X.....X.", "...XXXXX.."].forEach((row, j) => [...row].forEach((ch, i) => { const X = cx + i * 2, Yy = cy + j * 2; if (ca <= bayer(X, Yy)) return; const col = ch === "X" ? O : (row.indexOf("X") < i && row.lastIndexOf("X") > i ? IV : null); if (col) c.rect(X, Yy, 2, 2, col); })); }
}

// ---------------------------------------------------------------- frame
function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, "#0B0812"), outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  if (outro < 1) {
    stars(c, t);
    const cam = camera(t);
    if (cam.phase === "near") nearPhase(c, t, cam.L);
    else {
      const { z, view } = cam, globeA = 1 - smooth(z, 0.8, 0.96), dioA = smooth(z, 0.55, 0.82), onGlobe = 1 - smooth(z, 0.3, 0.55);
      if (globeA > 0) drawGlobe(c, view, SUN, { alpha: globeA, clip: [0, TOP, GW, BOT] });
      if (onGlobe > 0) globeLayer(c, t, view, onGlobe);
      if (dioA > 0) { layer2.d.set(c.d); const U = UDF * view.R / RMAX, a = project(view, CITY.london.lat, CITY.london.lon); districtScene(layer2, t, a.x - (DISTRICT_CENTER[0] - DISTRICT_CENTER[1]) * U, a.y - ((DISTRICT_CENTER[0] + DISTRICT_CENTER[1]) / 2 - DISTRICT_CENTER[2]) * U, U); dissolve(c, layer2, dioA); }
    }
    hud(c, t);
  }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); for (const o of overlays) o.alpha *= 1 - outro; }
  c.rect(0, 0, GW, TOP - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); const dur = Math.round(END) + " S"; c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "HOW NETFLIX STREAMS", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 });
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const { img, x, y, alpha } of overlays) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (!img.data[k + 3]) continue; if (x + i < 0 || x + i >= 1080 || y + j < 0 || y + j >= 1920) continue; if (alpha < 1 && alpha <= bayer((x + i) >> 1, (y + j) >> 1)) continue; const a = img.data[k + 3] / 255, o = ((y + j) * 1080 + x + i) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a; }
  return FULL;
}
await loadAssets();
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--scene") {
  // clean stage for the cover: stars + world at time t and depth D, no HUD, captions or header
  const t = Number(args[1]); DOVR = Number(args[2]); const c = new Canvas(GW, GH, "#0B0812"); stars(c, t); const cam = camera(t);
  if (cam.phase === "near") nearPhase(c, t, cam.L); else { const { z, view } = cam; drawGlobe(c, view, SUN, { alpha: 1 - smooth(z, 0.8, 0.96), clip: [0, 0, GW, GH] }); globeLayer(c, t, view, 1 - smooth(z, 0.3, 0.55)); const dioA = smooth(z, 0.55, 0.82); if (dioA > 0) { layer2.d.set(c.d); const U = UDF * view.R / RMAX, a = project(view, CITY.london.lat, CITY.london.lon); districtScene(layer2, t, a.x - (DISTRICT_CENTER[0] - DISTRICT_CENTER[1]) * U, a.y - ((DISTRICT_CENTER[0] + DISTRICT_CENTER[1]) / 2 - DISTRICT_CENTER[2]) * U, U); dissolve(c, layer2, dioA); } }
  await sharp(Buffer.from(c.d), { raw: { width: GW, height: GH, channels: 3 } }).png().toFile(args[3]); console.log("scene", args[3]);
} else if (args[0] === "--sheet") {
  const ts = args[1].split(",").map(Number), tiles = [];
  for (const t of ts) { const buf = await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).resize(270, 480).png().toBuffer();
    const lab = Buffer.from(`<svg width="270" height="24"><rect width="270" height="24" fill="#000"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${t.toFixed(2)}s</text></svg>`);
    tiles.push(await sharp(buf).extend({ top: 24, background: "#000" }).composite([{ input: lab, top: 0, left: 0 }]).png().toBuffer()); }
  const cols = 8, rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: 270 * cols, height: 504 * rows, channels: 3, background: "#000" } }).composite(tiles.map((b, i) => ({ input: b, left: (i % cols) * 270, top: Math.floor(i / cols) * 504 }))).jpeg({ quality: 88 }).toFile(HERE + (args[2] ?? "sheet.jpg"));
  console.log("sheet", tiles.length);
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
