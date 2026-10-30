// «How your text crosses the ocean» — pixel film (isometric slab of the Atlantic). 540×960 grid ×2 → 1080×1920, 30 fps.
// node render.mjs --stills 2,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../renderer/pixel/raster.mjs";
import { drawGlobe, project, routeSamples } from "../../../renderer/pixel/earth.mjs";
import { EV, END, FPS, WORDS, VOICE, W } from "./timeline.mjs";
import { GW, GH, TOP, CX, CY, O, CARD, IV, Y, YL, GR, MU, L, P, PK, p3, p5, p7, smooth, win, ease, rnd, P3, D, toScreen, drawWorld, cableW, FRIEND_W, ME_W, MAST_TOP, PHONE_W, PULSE_X, pulseX, message, FEATURED, envelope, pattern, Glow } from "./world.mjs";
import { drawMacro, panel, dtext, tw } from "./macro.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const ME_SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const BUDDY = HERE + "assets/pixel-buddy-spritesheet.png";
const S = 2, K = "#000000", R = Math.round, clamp01 = (v) => Math.max(0, Math.min(1, v)), lerp = (a, b, k) => a + (b - a) * k;
const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

// ---------------------------------------------------------------- assets
async function cell(sheet, col, row) { const { data, info } = await sharp(sheet).extract({ left: col * 192, top: row * 208, width: 192, height: 208 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
async function rgba(input, w, h, o = {}) { let img = sharp(input); if (o.extract) img = img.extract(o.extract); const { data, info } = await img.resize(w, h, { kernel: o.kernel ?? "nearest", fit: o.fit ?? "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(ME_SHEET).extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? hex(O) : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = hex(L); else if (d <= r) col = hex(P); if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}
const A = {};
async function loadAssets() {
  A.avatar = await avatar(66);
  A.mePhone = await cell(ME_SHEET, 0, 8);
  { const img = A.mePhone, put = (x, y, col) => { const k = (y * img.w + x) * 4; img.data[k] = col[0]; img.data[k + 1] = col[1]; img.data[k + 2] = col[2]; img.data[k + 3] = 255; };
    for (let y = 112; y < 132; y++) for (let x = 92; x < 106; x++) { const edge = x === 92 || x === 105 || y === 112 || y === 131; put(x, y, edge ? hex("#141018") : y < 115 || y > 128 ? hex("#2A2434") : mix("#BFD4FF", "#7FA0F0", (y - 115) / 13)); }
    for (const [x, y] of [[95, 117], [96, 117], [97, 117], [98, 117], [95, 120], [96, 120], [97, 120], [99, 123], [100, 123], [101, 123], [102, 123]]) put(x, y, hex("#2E4AA8")); }
  A.meHappy = []; for (let f = 0; f < 6; f++) A.meHappy.push(await cell(ME_SHEET, f, 9));
  A.fIdle = []; for (let f = 0; f < 6; f++) A.fIdle.push(await cell(BUDDY, f, 0));
  A.fJump = []; for (let f = 0; f < 5; f++) A.fJump.push(await cell(BUDDY, f, 4));
  A.fWave = []; for (let f = 0; f < 4; f++) A.fWave.push(await cell(BUDDY, f, 3));
  A.outro = {}; for (const [name, row, n] of [["wave", 1, 4], ["point", 4, 6], ["happy", 9, 6]]) { A.outro[name] = []; for (let f = 0; f < n; f++) A.outro[name].push(await rgba(ME_SHEET, 192, 208, { extract: { left: f * 192, top: row * 208, width: 192, height: 208 } })); }
  A.flagUS = await rgba(HERE + "media/flag-united-states-deb41780.png", 56, 32, { kernel: "lanczos3", fit: "fill" });
  A.flagUK = await rgba(HERE + "media/flag-united-kingdom-a1eaca71.png", 56, 32, { kernel: "lanczos3", fit: "fill" });
}

// ---------------------------------------------------------------- camera (world px; screen = (270 + (wx - cx)·z, 575 + (wy - cy)·z))
const HOOK = { cx: 270, cy: 575, z: 1 };
const at = (w, dx = 0, dy = 0, z = 2.4) => ({ cx: w[0] + dx, cy: w[1] + dy, z });
const CAM = [
  { t: 0, ...HOOK }, { t: EV.zoomIn[0], cx: 270, cy: 575, z: 1.03 },
  { t: EV.zoomIn[1], ...at([(ME_W[0] + MAST_TOP[0]) / 2, ME_W[1] - 44], 0, 0, 2.3) }, { t: EV.racing, ...at([(ME_W[0] + MAST_TOP[0]) / 2, ME_W[1] - 44], 0, 0, 2.3) },
  { t: EV.coast + 0.1, ...at(P3(124.6, 25, 5), 8, -14, 2.5) }, { t: EV.enters, ...at(P3(124.6, 25, 5), 8, -14, 2.5) },
  { t: EV.slides + 0.1, ...at(cableW(125), -8, 6, 2.5) },
  { t: PULSE_X[1][0], ...at(cableW(120), -6, 8, 2.4) }, { t: 20.2, ...at(cableW(112), -6, 8, 2.4) }, { t: 21.4, ...at(cableW(108), -6, 6, 2.4) }, { t: 22.4, ...at(cableW(104), -4, -6, 2.4) },
  { t: EV.macroIn[1] + 0.1, ...at(cableW(104), -4, -6, 2.4) }, { t: EV.macroOut[0] - 0.1, ...at(cableW(103), 0, 30, 3.4) },
  { t: EV.thousands - 0.3, ...at(cableW(103), 0, 30, 3.4) }, { t: EV.thousands + 0.5, ...at(cableW(106), 0, 30, 2.7) },
  { t: EV.sharks - 0.45, ...at(cableW(106), 0, 30, 2.7) }, { t: EV.sharks + 0.45, ...at(P3(82, D, -117), 0, 2, 2.3) },
  { t: EV.five - 0.05, ...at(P3(82, D, -117), 0, 2, 2.3) }, { t: EV.five + 0.5, ...at(cableW(84), 0, 50, 1.8) }, { t: EV.five + 0.9, ...at(cableW(70), 0, 50, 1.8) }, { t: EV.five + 1.7, ...at(cableW(40), 0, 50, 1.8) },
  { t: EV.ashore - 0.1, ...at(cableW(20), 0, 10, 2.0) }, { t: EV.ashore + 0.8, cx: 62, cy: 380, z: 2.3 }, { t: EV.buzzes - 0.3, cx: 75, cy: 335, z: 2.3 },
  { t: EV.whole - 0.25, cx: 75, cy: 335, z: 2.3 }, { t: EV.replay[0] - 0.05, ...HOOK },
  { t: EV.more + 0.2, ...HOOK }, { t: EV.globeIn[1], cx: 270, cy: 575, z: 0.45 }, { t: END + 5, cx: 270, cy: 575, z: 0.45 },
];
function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1];
  // the crossing pan follows the pulse linearly; everything else eases
  const raw = clamp01((t - a.t) / (b.t - a.t || 1)), k = a.t >= EV.five + 0.5 - 1e-6 && b.t <= EV.ashore - 0.1 + 1e-6 ? raw : ease(raw);
  return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k), z: Math.exp(lerp(Math.log(a.z), Math.log(b.z), k)) };
}
export { CAM };

// ---------------------------------------------------------------- planet (pixel Earth v1) with the cables
const ROUTE_MAIN = routeSamples([[-73.9, 40.6], [-4.55, 50.83]], 0.5);
const ROUTES = [
  [[-72.9, 40.8], [-9.9, 51.9]], [[-75.98, 36.85], [-2.93, 43.4]], [[-75.98, 36.85], [-1.6, 46.5]], [[-63.6, 44.6], [-9.9, 52.1]], [[-74.0, 40.2], [-6, 48.6], [-1.6, 49.6]],
  [[-80.1, 26.7], [-66, 18.7], [-55, 10], [-38.5, -3.7]], [[-38.5, -3.7], [-25, 12], [-9.1, 38.7]], [[-9.1, 38.7], [-17, 28], [-18, 15], [-10, 4], [3.4, 6.4], [9, -3], [12, -15], [18.4, -33.9]],
  [[-5.6, 36], [0, 37], [5.4, 43.3]], [[5.4, 43.3], [12, 37.5], [20, 34], [29.9, 31.2]], [[32.5, 29.9], [38, 21], [43.3, 12.6], [55, 14], [72.8, 19.0]], [[72.8, 19.0], [76, 8], [80, 5.5], [95, 6], [103.8, 1.3]],
  [[-38.5, -3.7], [-34.5, -8], [-38.5, -15], [-43.2, -23.5], [-50, -30], [-56, -35]], [[18.4, -33.9], [26, -35], [35, -27], [41, -15], [39.7, -4], [51, 10], [43.3, 12.6]],
  [[-1.5, 55], [5.3, 60.4]], [[1.5, 52.5], [4.5, 52.4]], [[-80.1, 26.7], [-66.1, 18.4], [-66.9, 10.9]], [[-79.9, 9.4], [-83, 17], [-85, 22], [-80.1, 26.7]], [[-73.9, 40.6], [-64.7, 32.3], [-66.1, 18.4]],
  [[-9.9, 52.1], [-22, 64.1]], [[-22, 64.1], [-52, 64.2]], [[-77, -12], [-73.5, -20], [-71.6, -33]], [[-9.1, 38.7], [-28, 38.6], [-63.6, 44.6]], [[-38.5, -3.7], [-5, -16], [13.2, -8.8]],
  [[-18, 15], [-23.5, 15], [-38.5, -3.7]], [[3.4, 6.4], [-4, 5.3], [-13.2, 8.5], [-17, 14.7]], [[29.9, 31.2], [33, 35], [35.5, 33.9]], [[-80.1, 26.7], [-79, 35], [-75.98, 36.85]],
].map((r) => routeSamples(r, 0.8));
const SUN = { lat: -10, lon: -150 };
const glowG = new Glow();
function globeView(t) {
  const k = ease(clamp01((t - EV.globeIn[0]) / 1.8)), rot = smooth(t, EV.globeIn[1], EV.floorEnd + 0.4);
  return { lat0: lerp(36, 31, k), lon0: lerp(-34, -30, k) + 22 * rot, R: Math.exp(lerp(Math.log(300), Math.log(232), k)), cx: 270, cy: 452 };
}
function drawRoute(c, view, r, frac, col, thick, glowA) {
  const n = Math.floor(r.pts.length * clamp01(frac)); let prev = null;
  for (let i = 0; i < n; i++) { const [lon, lat] = r.pts[i], p = project(view, lat, lon); if (!p.visible) { prev = null; continue; }
    if (prev) { c.line(R(prev.x), R(prev.y), R(p.x), R(p.y), col); if (thick) c.line(R(prev.x), R(prev.y) + 1, R(p.x), R(p.y) + 1, col); }
    if (glowA > 0 && i % 3 === 0) glowG.add(p.x, p.y, 7, glowA); prev = p; }
}
function globeScene(c, t) {
  for (let i = 0; i < 160; i++) { const x = R(rnd(i * 3 + 1) * GW), y = R(TOP + rnd(i * 5 + 2) * (GH - TOP)); c.px(x, y, rnd(i * 11) < 0.15 ? IV : rnd(i * 13) < 0.5 ? "#4A4470" : "#2A2448"); }
  c.tint(0, TOP, GW, GH - TOP, (x, y) => Math.max(0, 0.3 - Math.hypot(x - 270, y - 452) / 700), "#2A1B4A", 6);
  const view = globeView(t); drawGlobe(c, view, SUN, { clip: [0, TOP, GW, GH] });
  // every cable appears from its landing point; on "sea floor" a wave of light runs through all of them
  const wave = win(t, EV.seaFloor - 0.1, EV.floorEnd + 0.6, 0.15, 0.5);
  ROUTES.forEach((r, i) => { const t0 = EV.hundred - 0.3 + i * 0.045, fr = smooth(t, t0, t0 + 0.7); if (fr <= 0) return; drawRoute(c, view, r, fr, wave > 0.3 ? mix("#9DB5FF", IV, wave) : "#7E8EE0", false, 0.18 + 0.4 * wave); });
  drawRoute(c, view, ROUTE_MAIN, 1, Y, true, 0.55 + 0.3 * wave);
  // a pulse keeps running London → New York on our cable
  { const k = ((t - EV.globeIn[0]) / 1.4) % 1, i = R((1 - k) * (ROUTE_MAIN.pts.length - 1)), [lon, lat] = ROUTE_MAIN.pts[i], p = project(view, lat, lon); if (p.visible) { glowG.add(p.x, p.y, 12, 0.9); c.disc(R(p.x), R(p.y), 2, IV); } }
  for (const [lat, lon, name, side] of [[40.71, -74.0, "NEW YORK", -1], [51.5, -0.12, "LONDON", 1]]) { const p = project(view, lat, lon); if (!p.visible) continue; c.disc(R(p.x), R(p.y), 3, O); c.disc(R(p.x), R(p.y), 2, YL);
    const a = smooth(t, EV.globeIn[1] - 0.2, EV.globeIn[1] + 0.3) * (1 - smooth(t, EV.cloud - 0.3, EV.cloud)); if (a > 0) dtext(c, name, side < 0 ? p.x - 8 - tw(c, name) : p.x + 7, p.y - 4, IV, a, 1); }
  glowG.apply(c, "#F4CA50", 4);
  // panels: 500+ cables, satellites < 1 %
  const ca = win(t, EV.hundred, EV.cloud - 0.3, 0.3, 0.3);
  if (ca > 0) { panel(c, 20, 200, 190, 52, ca, Y); dtext(c, "500+", 32, 208, Y, ca, 4); dtext(c, "CABLES", 132, 210, IV, ca, 2); dtext(c, "ON THE SEA FLOOR", 32, 238, L, ca, 1); }
  const sa = win(t, EV.almost, EV.cloud - 0.3, 0.3, 0.3);
  if (sa > 0) { panel(c, 316, 200, 204, 52, sa); const g = fade(c, sa); g.rect(330, 214, 6, 5, "#D9B44A"); g.rect(322, 215, 7, 3, "#2E4AA8"); g.rect(337, 215, 7, 3, "#2E4AA8");
    dtext(c, "SATELLITES", 352, 208, IV, sa, 2); dtext(c, "CARRY < 1%", 352, 230, Y, sa, 2); }
  // the "cloud" gag: a cloud in the sky gets crossed out; the cables light up instead
  const cl = win(t, EV.cloud - 0.15, EV.sky + 0.5, 0.25, 0.4);
  if (cl > 0) { const g = fade(c, cl), cx = 270, cy = 228;
    pattern(g, cx - 42, cy - 18, 3, ["....XXXX......", "..XXXXXXXX.XX..", ".XXXXXXXXXXXXX.", "XXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXX", ".XXXXXXXXXXXXX."], { X: "#E0DCF0" });
    pattern(g, cx - 42, cy - 18, 3, ["..............", "..............", "..............", "...............", "BBBBBBBBBBBBBBB", ".BBBBBBBBBBBBB."], { B: "#A8A0C8" });
    dtext(c, "THE CLOUD", cx - tw(c, "THE CLOUD", 2) / 2, cy + 2, "#3A2E5A", cl, 2);
    const xa = cl * smooth(t, EV.isnt, EV.isnt + 0.2); if (xa > 0) { const h = fade(c, xa); for (let k = -26; k <= 26; k++) for (let w = 0; w < 4; w++) { h.px(cx + k + w, cy + 2 + R(k * 0.7), PK); h.px(cx + k + w, cy + 2 - R(k * 0.7), PK); } } }
  dtext(c, "ROUTES SIMPLIFIED", GW - 14 - tw(c, "ROUTES SIMPLIFIED"), GH - 14, MU, smooth(t, EV.globeIn[1], EV.globeIn[1] + 0.4), 1);
}

// ---------------------------------------------------------------- HUD over the world
function bubble(c, x, y, txt, tailX, a, tailDown = true) {
  if (a <= 0) return; const g = fade(c, a), w = tw(c, txt, 2) + 18, h = 26;
  g.rrect(x - 1, y - 1, w + 2, h + 2, O, 3); g.rrect(x, y, w, h, IV, 3); g.rect(x + 2, y + h - 3, w - 4, 1, "#D8D2E8");
  for (let j = 0; j < 7; j++) { g.rect(tailX + j, y + h + j, 7 - j, 1, IV); g.px(tailX + j - 1, y + h + j, O); g.px(tailX + 7, y + h + j, O); }
  g.text(MAIN, txt, x + 9, y + 7, O, { scale: 2 });
}
function cityTag(c, x, y, city, time, flag, a) {
  if (a <= 0) return; const w = 40 + Math.max(tw(c, city, 2), tw(c, time)) + 10;
  panel(c, x, y, w, 38, a); dtext(c, city, x + 40, y + 7, IV, a, 2); dtext(c, time, x + 40, y + 24, MU, a, 1);
  overlays.push({ img: flag, x: (x + 6) * S, y: (y + 8) * S, alpha: a, scale: 1 });
}
function hud(c, t, cam) {
  const sc = (w) => toScreen(cam, w);
  // hook: city tags, "YOU UP?", a dotted guess to a satellite that gets crossed out
  const tags = Math.max(1 - smooth(t, EV.zoomIn[0], EV.zoomIn[0] + 0.35), win(t, EV.replay[0] - 0.2, EV.more + 0.3, 0.35, 0.35));
  { const ny = sc([168, 236]), ld = sc([394, 600]); cityTag(c, R(ny[0]), R(ny[1]), "NEW YORK", "6:04 PM", A.flagUS, tags); cityTag(c, R(ld[0]), R(ld[1]), "LONDON", "11:04 PM", A.flagUK, tags); }
  const head = sc([ME_W[0] - 6, ME_W[1] - 100]), ba = win(t, EV.text - 0.15, EV.sends - 0.1, 0.25, 0.25);
  bubble(c, R(head[0] - 118), R(head[1] - 40), "YOU UP?", R(head[0] - 30), ba);
  const sat = sc([468, 226]), satA = win(t, EV.bounces - 0.25, EV.doesnt + 0.1, 0.3, 0.4);
  if (satA > 0) {
    const grow = smooth(t, EV.bounces, EV.satellite + 0.3), B0 = [head[0] - 40, head[1] - 46], g = fade(c, satA);
    for (let i = 0; i <= 64 * grow; i++) { const k = i / 64, x = (1 - k) ** 2 * B0[0] + 2 * (1 - k) * k * (sat[0] - 70) + k * k * (sat[0] - 10), y = (1 - k) ** 2 * B0[1] + 2 * (1 - k) * k * (sat[1] + 30) + k * k * (sat[1] + 9); if (i % 4 < 2) g.rect(R(x), R(y), 2, 2, L); }
    const [x, y] = sat.map(R); g.rect(x - 4, y - 3, 8, 7, "#D9B44A"); g.rect(x - 3, y - 2, 6, 1, "#F6DE84"); for (const sx of [x - 18, x + 6]) { g.rect(sx, y - 3, 12, 7, "#2E4AA8"); for (let k = 0; k < 12; k += 3) g.rect(sx + k, y - 3, 1, 7, "#5C7FE0"); g.rect(sx, y, 12, 1, "#5C7FE0"); } g.rect(x - 1, y - 7, 2, 4, "#B8B4C8");
    dtext(c, "?", x + 22, y - 20, Y, satA * smooth(t, EV.satellite + 0.1, EV.satellite + 0.35), 3);
    const xa = satA * smooth(t, EV.doesnt - 0.05, EV.doesnt + 0.12); if (xa > 0) { const h = fade(c, xa); for (let k = -14; k <= 14; k++) for (let w = 0; w < 3; w++) { h.px(x + k + w, y + k, PK); h.px(x + k + w, y - k, PK); } }
  }
  // radio rings from the phone to the mast
  const rr = win(t, EV.radio - 0.1, EV.towerEnd, 0.2, 0.3);
  if (rr > 0) { const ph = sc(PHONE_W), g = fade(c, rr); for (let k = 0; k < 3; k++) { const f = ((t - EV.radio) * 1.4 + k / 3) % 1; if (f < 0) continue; const r = (10 + 70 * f) * cam.z * 0.6; fade(g, 1 - f).ering(R(ph[0]), R(ph[1]), R(r), R(r * 0.8), "#9DB5FF", -Math.PI * 0.85, Math.PI * 0.15); } }
  const ma = win(t, EV.tower - 0.1, EV.light + 0.3, 0.25, 0.3); if (ma > 0) { const m = sc(MAST_TOP); const x = R(m[0] + 14), y = R(m[1] - 30); panel(c, x, y, tw(c, "CELL TOWER", 2) + 20, 26, ma); dtext(c, "CELL TOWER", x + 10, y + 7, IV, ma, 2); }
  const fa = win(t, EV.glass - 0.1, EV.coast + 0.3, 0.25, 0.3); if (fa > 0) { panel(c, 20, 200, 196, 44, fa, Y); dtext(c, "GLASS FIBER", 32, 207, Y, fa, 2); dtext(c, "UNDER THE STREETS", 32, 228, IV, fa, 1); }
  const la = win(t, EV.building - 0.1, EV.slides + 0.3, 0.25, 0.3); if (la > 0) { const p = sc(P3(123, 25, 6)); const s1 = "CABLE LANDING", s2 = "STATION", w = tw(c, s1, 2) + 20, x = R(Math.max(10, p[0] - w - 14)), y = R(p[1] - 4); fade(c, la).line(x + w, y + 22, R(p[0]), R(p[1]), L); panel(c, x, y, w, 44, la); dtext(c, s1, x + 10, y + 7, IV, la, 2); dtext(c, s2, x + 10, y + 24, L, la, 2); }
  // depth gauge during the dive
  const da = win(t, EV.floor - 0.5, EV.macroIn[0], 0.3, 0.3);
  if (da > 0) { const m = message(t), z = m && m.kind === "cable" ? Math.max(0, -cableZOf(m.x)) : 0, meters = Math.round(z / 31 * 1000 / 10) * 10;
    panel(c, 20, 200, 196, 52, da); dtext(c, "DEPTH", 32, 208, L, da, 1); dtext(c, fmt(meters) + " M", 32, 222, IV, da, 3);
    const k4 = da * smooth(t, EV.four, EV.four + 0.3); if (k4 > 0) dtext(c, "OFTEN 4 KM", 120, 208, Y, k4, 1); }
  // repeater, signal bar, power from shore
  const ra = win(t, EV.repeater - 0.1, EV.thousands - 0.1, 0.25, 0.3);
  if (ra > 0) { const p = sc(cableW(FEATURED)); const x = R(p[0] - 70), y = R(p[1] - 110); panel(c, x, y, 150, 44, ra, Y); dtext(c, "REPEATER", x + 10, y + 7, Y, ra, 2); dtext(c, "EVERY 50 KM OR SO", x + 10, y + 26, IV, ra, 1); fade(c, ra).line(x + 75, y + 44, R(p[0]), R(p[1] - 14), Y); }
  const sg = win(t, EV.every - 0.1, EV.thousands - 0.2, 0.25, 0.3);
  if (sg > 0) { const m = message(t), v = m && m.kind === "cable" ? 1 - m.dim : 1; panel(c, 20, 200, 196, 40, sg); dtext(c, "SIGNAL", 32, 208, L, sg, 1); for (let i = 0; i < 12; i++) fade(c, sg).rect(32 + i * 14, 222, 11, 10, i / 12 < v ? (v > 0.95 ? GR : Y) : p3); }
  const va = win(t, EV.thousands - 0.1, EV.sharks - 0.3, 0.25, 0.3);
  if (va > 0) { panel(c, 300, 200, 220, 44, va, Y); dtext(c, "THOUSANDS", 312, 207, Y, va, 2); dtext(c, "OF VOLTS FROM SHORE", 312, 228, IV, va, 1); const g = fade(c, va); pattern(g, 488, 206, 3, ["..Y", ".Y.", "YYY", ".Y.", "Y.."], { Y: YL }); }
  // dangers
  const sh = win(t, EV.bitten + 0.1, EV.most + 0.6, 0.25, 0.3);
  if (sh > 0) { const p = sc(cableW(86.5)); const s = "SHARK BITES: RARE", x = R(Math.min(GW - tw(c, s, 2) - 30, p[0] - 40)), y = R(p[1] + 20); panel(c, x, y, tw(c, s, 2) + 20, 26, sh); dtext(c, s, x + 10, y + 7, IV, sh, 2); }
  const mb = win(t, EV.most - 0.1, EV.five - 0.4, 0.25, 0.3);
  if (mb > 0) { panel(c, 20, 200, 232, 64, mb, PK); dtext(c, "MOST BREAKS:", 32, 208, L, mb, 1); dtext(c, "ANCHORS", 32, 222, IV, mb * smooth(t, EV.anchors - 0.1, EV.anchors + 0.2), 2); dtext(c, "+ FISHING", 128, 222, IV, mb * smooth(t, EV.fishing - 0.1, EV.fishing + 0.2), 2); dtext(c, "ABOUT 2/3 OF FAULTS", 32, 246, Y, mb * smooth(t, EV.nets, EV.nets + 0.3), 1); }
  // the crossing: distance counter
  const dc = win(t, EV.five - 0.1, EV.ashore + 0.7, 0.25, 0.3);
  if (dc > 0) { const x = pulseX(t), km = clamp01((99.5 - x) / 85) * 5570; panel(c, 20, 200, 214, 52, dc); dtext(c, "LONDON > NEW YORK", 32, 208, L, dc, 1); dtext(c, fmt(Math.round(km / 10) * 10) + " KM", 32, 222, IV, dc, 3); }
  // the friend's phone buzzes
  const nb = win(t, EV.buzzes - 0.05, EV.whole + 0.2, 0.15, 0.35);
  if (nb > 0) { const hd = sc([FRIEND_W[0] + 4, FRIEND_W[1] - 92]), shake = t < EV.buzzes + 0.7 ? R(Math.sin(t * 90) * 1.5) : 0, x = R(hd[0] - 8 + shake), y = R(hd[1] - 46);
    bubble(c, x, y, "YOU UP?", x + 14, nb); const g = fade(c, nb); g.rect(x - 22, y + 2, 14, 22, O); g.rect(x - 21, y + 3, 12, 20, "#2A2434"); g.rect(x - 20, y + 5, 10, 15, "#9DB5FF");
    if (t < EV.buzzes + 0.8) for (const s of [-1, 1]) for (let j = 0; j < 3; j++) g.rect(x - 15 + s * (11 + j * 3), y + 6 + j * 4, 2, 2, IV); }
  // stopwatch: the whole ocean in under 1/20 s
  const sw = win(t, EV.replay[0] - 0.35, EV.more + 0.3, 0.25, 0.35);
  if (sw > 0) { const k = smooth(t, EV.replay[0], EV.replay[1]), ms = 29 * k; panel(c, 292, 200, 228, 66, sw, Y); dtext(c, "OCEAN CROSSING", 304, 208, L, sw, 1);
    dtext(c, "0.0" + String(Math.floor(ms)).padStart(2, "0") + " S", 304, 226, IV, sw, 3); const b = sw * smooth(t, EV.replay[1], EV.replay[1] + 0.25); if (b > 0) { panel(c, 436, 226, 76, 30, b, Y); dtext(c, "< 1/20", 444, 234, Y, b, 2); } }
}
// cable depth for the gauge (z at x on the cable)
import { CAB, cabIndex } from "./world.mjs";
const cableZOf = (x) => CAB[cabIndex(x)].z;

// ---------------------------------------------------------------- characters (full resolution, scaled with the camera)
const overlays = [];
function charOverlays(t, cam, alpha) {
  if (alpha <= 0) return;
  const fr = (set, fps, t0) => { const f = (t - t0) * fps, i0 = ((Math.floor(f) % set.length) + set.length) % set.length; return [set[i0], set[(i0 + 1) % set.length], smooth(f % 1, 0.7, 1)]; };
  const put = (img, w, a) => { const [sx, sy] = toScreen(cam, w); overlays.push({ img, x: sx * S, y: sy * S, alpha: a * alpha, scale: cam.z, foot: true }); };
  // friend: idle → jump on the buzz → wave → idle
  const j0 = EV.buzzes + 0.1, j1 = j0 + 0.75, w1 = EV.replay[1] + 0.6;
  if (t < j0 + 0.12) { const [a, b, m] = fr(A.fIdle, 4, 0); put(a, FRIEND_W, 1 - m); if (m > 0) put(b, FRIEND_W, m); }
  if (t >= j0 - 0.05 && t < j1 + 0.1) { const k = clamp01((t - j0) / (j1 - j0)), i = Math.min(4, Math.floor(k * 5)), lift = Math.sin(Math.PI * k) * 10; put(A.fJump[i], [FRIEND_W[0], FRIEND_W[1] - lift], smooth(t, j0 - 0.05, j0 + 0.08)); }
  if (t >= j1 && t < w1 + 0.3) { const [a, b, m] = fr(A.fWave, 5, j1), wa = smooth(t, j1, j1 + 0.1) * (1 - smooth(t, w1, w1 + 0.3)); put(a, FRIEND_W, wa * (1 - m)); if (m > 0) put(b, FRIEND_W, wa * m); }
  if (t >= w1) { const [a, b, m] = fr(A.fIdle, 4, 0), ia = smooth(t, w1, w1 + 0.3); put(a, FRIEND_W, ia * (1 - m)); if (m > 0) put(b, FRIEND_W, ia * m); }
  // you: phone in hands → happy when the reply-time badge lands
  const h0 = EV.replay[1] + 0.1, ha = smooth(t, h0, h0 + 0.3);
  if (ha < 1) put(A.mePhone, ME_W, 1 - ha);
  if (ha > 0) { const [a, b, m] = fr(A.meHappy, 4, h0); put(a, ME_W, ha * (1 - m)); if (m > 0) put(b, ME_W, ha * m); }
}

// ---------------------------------------------------------------- captions (karaoke, as in the dog film)
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
  for (let i = 0; i < 60; i++) c.px((i * 211) % GW, TOP + ((i * 137) % (GH - TOP)), i % 5 ? "#2A2140" : MU);
  c.tint(0, TOP, GW, GH - TOP, (x, y) => Math.max(0, 0.35 - Math.hypot(x - 270, (y - 420) * 1.1) / 420), "#2A1B4A", 10);
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
const layer = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, K), outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  const ma = smooth(t, EV.macroIn[0], EV.macroIn[1]) * (1 - smooth(t, EV.macroOut[0], EV.macroOut[1]));
  const ga = smooth(t, EV.globeIn[0], EV.globeIn[1]);
  const cam = camera(t);
  if (outro < 1) {
    if (ga < 1 && ma < 1) { drawWorld(c, cam, t); hud(c, t, cam); charOverlays(t, cam, (1 - ma) * (1 - ga)); }
    if (ma > 0) { layer.d.fill(0); drawMacro(layer, t); dissolve(c, layer, ma); }
    if (ga > 0) { layer.d.fill(0); globeScene(layer, t); dissolve(c, layer, ga); }
  }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); overlays.forEach((o) => (o.alpha *= 1 - outro)); }
  // picture runs to the bottom edge; only the header stays black. A soft dithered shade keeps captions legible.
  c.rect(0, 0, GW, TOP - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), O, 6);
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); const dur = Math.round(END) + " S"; c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "HOW TEXTS CROSS THE OCEAN", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1, scale: 1, header: true });
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output (overlays: nearest scaling, dithered alpha, clipped to the stage)
const FULL = new Uint8ClampedArray(1080 * 1920 * 3), BAYER8 = (x, y) => bayer(x >> 1, y >> 1);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const ov of overlays) {
    const { img, alpha } = ov; if (alpha <= 0.001) continue; const s = ov.scale ?? 1;
    // character cells: foot point = bottom-centre of the figure (cell x 96, y 201)
    const x0 = ov.foot ? ov.x - 96 * s : ov.x, y0 = ov.foot ? ov.y - 201 * s : ov.y, w = Math.ceil(img.w * s), h = Math.ceil(img.h * s), yMin = ov.header ? 0 : TOP * 2, yMax = 1920;
    const X0 = Math.max(0, Math.floor(x0)), X1 = Math.min(1080, Math.ceil(x0 + w)), Y0 = Math.max(yMin, Math.floor(y0)), Y1 = Math.min(yMax, Math.ceil(y0 + h));
    for (let y = Y0; y < Y1; y++) { const j = Math.floor((y - y0) / s); if (j < 0 || j >= img.h) continue;
      for (let x = X0; x < X1; x++) { const i = Math.floor((x - x0) / s); if (i < 0 || i >= img.w) continue; const k = (j * img.w + i) * 4, a = img.data[k + 3] / 255; if (a < 0.5) continue; if (alpha < 1 && alpha <= BAYER8(x, y)) continue; const o = (y * 1080 + x) * 3; FULL[o] = img.data[k]; FULL[o + 1] = img.data[k + 1]; FULL[o + 2] = img.data[k + 2]; } }
  }
  return FULL;
}
await loadAssets();
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
