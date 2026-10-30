// «What happens if you forget airplane mode» — pixel film, flat side view. 540×960 grid ×2 → 1080×1920, 30 fps.
// One world: the night flight (plane in cut-away), the clouds, the city with its towers below, the satellite above.
// node render.mjs --stills 3,9.5,... | --sheet t1,t2,... out.jpg | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, hex, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawWorld, view, towersNear, GROUND } from "./world.mjs";
import { drawPlane, heroPhone, PICO, HERO_ROW, ROWS, rowX } from "./plane.mjs";
import { EV, END, FPS, WORDS, VOICE, COCKPIT, camera } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const SHEET = "/Users/rv/Desktop/Motion Studio/data/branding/xtuned-outro/v1/spritesheet.png";
const GW = 540, GH = 960, S = 2, TOP = 190, BOT = 960, K = "#000000", R = Math.round;
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056", GR = "#65DA41", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const dtext = (c, str, x, y, col, a = 1, scale = 1, font = MAIN) => { if (a > 0) fade(c, a).text(font, str, R(x), R(y), col, { scale }); };
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function pill(c, txt, cx, y, col, edge, a = 1, scale = 2) { if (a <= 0) return [0, 0]; const g = fade(c, a), w = c.measure(MAIN, txt, { scale }) + 22, h = 7 * scale + 12, x = R(Math.max(6, Math.min(GW - 6 - w, cx - w / 2))); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); g.text(MAIN, txt, x + 11, y + 6, col, { scale }); return [x, w]; }
function panel(c, x, y, w, h, a = 1, edge = p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); }

// ---------------------------------------------------------------- assets
async function rgba(input, w, h, o = {}) { let img = sharp(input); if (o.extract) img = img.extract(o.extract); const { data, info } = await img.resize(w, h, { kernel: o.kernel ?? "nearest", fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, h: info.height, data: new Uint8ClampedArray(data) }; }
const MEDIA = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets, mediaFile = (subj) => HERE + "media/" + MEDIA.find((a) => a.subject === subj).file.split("/").pop();
const A = {};
async function loadAssets() {
  A.avatar = await avatar(66);
  A.flagUS = await rgba(mediaFile("United States"), 96, 50, { kernel: "lanczos3" });
  A.fcc = await rgba(mediaFile("Federal Communications Commission"), 170, 142, { kernel: "lanczos3" });
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

// ---------------------------------------------------------------- radio: rings from the phone, links to towers
const RING_TIMES = (() => { const out = []; for (let t = EV.rings[0]; t < EV.again[0] - 0.3; t += 0.85) out.push(t); out.push(...EV.again); for (let t = EV.bursts[0]; t < EV.bursts[1] + 2.5; t += 0.6) out.push(t); return out; })();
function rings(c, V, t, src, maxR, life, col, alpha = 1, times = RING_TIMES) {
  for (const t0 of times) { const u = (t - t0) / life; if (u < 0 || u > 1) continue; const r = maxR * Math.pow(u, 0.8), sx = V.X(src.x), sy = V.Y(src.y), rr = r * V.z, a = (1 - u) * alpha; if (rr < 2) continue; const g = fade(c, a);
    const n = Math.max(24, R(rr * 1.4)); for (let k = 0; k < n; k++) { const an = (k / n) * Math.PI * 2; if (k % 3 === 2) continue; g.rect(R(sx + Math.cos(an) * rr), R(sy + Math.sin(an) * rr), 2, 2, col); } }
}
function dashLine(c, x0, y0, x1, y1, col, a = 1, phase = 0) { if (a <= 0) return; const g = fade(c, a), n = Math.max(1, R(Math.hypot(x1 - x0, y1 - y0))); for (let i = 0; i < n; i++) { if (((i + phase) % 10 + 10) % 10 < 6) { const x = R(x0 + ((x1 - x0) * i) / n), y = R(y0 + ((y1 - y0) * i) / n); if (y >= TOP) g.rect(x, y, 2, 2, col); } } }

function phonesLit(t) { return (r) => { if (r === HERO_ROW) return smooth(t, EV.one, EV.one + 0.3) * (1 - smooth(t, EV.sleep[0], EV.sleep[0] + 0.4)); const t0 = EV.twoHundred[0] + Math.abs(r - HERO_ROW) * 0.06; return smooth(t, t0, t0 + 0.2) * (1 - smooth(t, EV.whisper[1], EV.whisper[1] + 0.6)); }; }

// ---------------------------------------------------------------- scene
function scene(c, t) {
  const cam = camera(t), V = view(cam), ph = heroPhone(t);
  const manyA = win(t, EV.many[0], EV.fcc[0] + 0.3, 0.2, 0.4);
  const towerLit = (tw) => manyA * (rnd(tw.k * 3) < 0.85 ? (t - EV.many[0] > (tw.k % 7) * 0.12 ? 1 : 0) : 0) * (t > EV.confuse[0] && Math.sin(t * 12 + tw.k) > 0.6 ? 0.4 : 1);
  drawWorld(c, cam, t, { lit: towerLit, beams: 0.5 + 0.8 * win(t, EV.towers[0], EV.car[1], 0.3, 0.6) });
  // links from the phone to the towers (weak at first, then dozens at once)
  const towers = towersNear(t, V.wx(-200), V.wx(GW + 200));
  const weak = win(t, EV.weak[0], EV.weak[1], 0.15, 0.3);
  if (weak > 0) { const tw = towers.reduce((a, b) => (Math.abs(b.x - ph.x) < Math.abs(a.x - ph.x) ? b : a)); if (Math.sin(t * 18) > -0.2) dashLine(c, V.X(ph.x), V.Y(ph.y), V.X(tw.x), V.Y(tw.top - 10), p7, weak * 0.8, t * 30); }
  if (manyA > 0) for (const tw of towers) { const l = towerLit(tw); if (l > 0.5) dashLine(c, V.X(ph.x), V.Y(ph.y), V.X(tw.x), V.Y(tw.top - 10), t > EV.confuse[0] ? (Math.sin(t * 9 + tw.k) > 0 ? PK : Y) : Y, manyA * 0.85, t * 40 + tw.k * 3); }
  // the car's link hops from one tower to the next
  const carA = win(t, EV.car[0], EV.car[1], 0.3, 0.3);
  if (carA > 0) { const carX = -150 + 46 * Math.max(0, t - EV.towers[0] + 0.6), near = towers.filter((tw) => tw.x < carX + 60).sort((a, b) => Math.abs(a.x - carX) - Math.abs(b.x - carX)); const target = t < EV.handoff ? near.find((tw) => tw.x < carX) ?? near[0] : near.find((tw) => tw.x >= carX - 20) ?? near[0];
    if (target) dashLine(c, V.X(carX), V.Y(GROUND - 9), V.X(target.x), V.Y(target.top - 2), GR, carA, t * 30); if (t > EV.handoff && t < EV.handoff + 0.5 && target) { const u = (t - EV.handoff) / 0.5; fade(c, 1 - u).ring(R(V.X(target.x)), R(V.Y(target.top - 2)), R(4 + u * 20), GR); } }
  drawPlane(c, V, t, { phonesLit: phonesLit(t), mosquito: win(t, EV.mosquito[0], EV.mosquito[1], 0.3, 0.4), pico: smooth(t, EV.pico[0], EV.pico[0] + 0.4) * (1 - smooth(t, EV.flip, EV.flip + 0.5)) });
  // the phone shouting: big rings down to the ground (and into the cockpit during the bursts)
  rings(c, V, t, ph, 1100, 1.7, Y, 0.9);
  { const bt = []; for (let k = 0; k < 12; k++) bt.push(EV.bursts[0] + k * 0.45); rings(c, V, t, { x: 150, y: -26 }, 70, 0.9, Y, 0.9, bt.filter((x) => x < EV.atc[1])); }
  // whisper: small rings from the phones to the ceiling cell
  if (t > EV.whisper[0] - 0.2 && t < EV.whisper[1] + 0.8) { const ts = []; for (let k = 0; k < 8; k++) ts.push(EV.whisper[0] + k * 0.25); for (let r = 0; r < ROWS; r += 2) rings(c, V, t, { x: rowX(r) + 12, y: -24 }, 14, 0.9, GR, 0.8, ts.map((x) => x + (r % 4) * 0.1)); }
  // satellite link from the ceiling cell up
  const sl = win(t, EV.sat[0], EV.flip, 0.4, 0.4); if (sl > 0) dashLine(c, V.X(PICO.x), V.Y(PICO.y - 4), V.X(60), V.Y(-812), GR, sl, -t * 40);
  // altitude ruler
  const alt = win(t, EV.tenKm[0], EV.shout + 0.6, 0.3, 0.4);
  if (alt > 0) { const g = fade(c, alt), x = R(V.X(-300)), y0 = R(V.Y(24)), y1 = R(V.Y(GROUND)); g.rect(x, Math.max(TOP, y0), 2, y1 - Math.max(TOP, y0), IV); g.rect(x - 6, y0, 14, 2, IV); g.rect(x - 6, y1, 14, 2, IV); pill(c, "10 KM", x + 40, R((y0 + y1) / 2) - 13, IV, IV, alt); }
  // speed lines while we fly over the dozens
  const sp = win(t, EV.fly[0], EV.fly[1], 0.3, 0.5);
  if (sp > 0) for (let k = 0; k < 18; k++) { const y = TOP + 20 + ((k * 97) % 720), x = GW - (((t * (900 + k * 40)) + k * 211) % (GW + 200)); fade(c, sp * 0.5).rect(R(x), y, 60 + (k % 4) * 20, 1, "#B4B4D2"); }
  // question marks over confused towers
  if (t > EV.confuse[0] && t < EV.confuse[1] + 0.4) { const a = win(t, EV.confuse[0], EV.confuse[1], 0.2, 0.4); for (const tw of towers) { if (towerLit(tw) <= 0) continue; const x = R(V.X(tw.x)), y = R(V.Y(tw.top - 40)) + R(Math.sin(t * 6 + tw.k) * 3); dtext(c, "?", x - 5, y, PK, a, 2); } }
}

// ---------------------------------------------------------------- HUD (screen space)
function airplaneIcon(g, x, y, col) { ["...X....", "...XX...", "XXXXXXXX", "XXXXXXXX", "...XX...", "...X....", "..XXX..."].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "X") g.rect(x + i * 2, y + j * 2, 2, 2, col); })); }
function hud(c, t) {
  // airplane-mode setting (opening: OFF; ending: flipped ON)
  const tg = Math.max(win(t, EV.toggleShow[0], EV.toggleShow[1], 0.3, 0.3), win(t, EV.flip - 0.55, EV.outroIn[0], 0.3, 0.3));
  if (tg > 0) { panel(c, 300, 204, 224, 50, tg); const g = fade(c, tg), on = smooth(t, EV.flip, EV.flip + 0.2); airplaneIcon(g, 314, 222, on > 0.5 ? GR : IV); g.text(MAIN, "AIRPLANE", 338, 214, IV, { scale: 2 }); g.text(MAIN, "MODE", 338, 232, IV, { scale: 2 });
    const tx = 446, ty = 218; g.rrect(tx, ty, 62, 24, on > 0.5 ? GR : "#4A4466", 10); g.disc(R(tx + 12 + 38 * on), ty + 12, 9, IV); g.text(TINY, on > 0.5 ? "ON" : "OFF", on > 0.5 ? tx + 8 : tx + 30, ty + 8, on > 0.5 ? O : IV, { scale: 2 }); }
  pill(c, "THE PLANE IS FINE ✓", 270, 210, GR, GR, win(t, EV.crashOk[0], EV.crashOk[1], 0.25, 0.3));
  // searching: bars flicker
  const sb = win(t, EV.bars[0], EV.bars[1], 0.25, 0.3);
  if (sb > 0) { panel(c, 160, 204, 220, 46, sb); const g = fade(c, sb), lvl = Math.floor(t * 6) % 3 === 0 ? 1 : 0; for (let k = 0; k < 4; k++) g.rect(176 + k * 9, 236 - k * 6, 6, 6 + k * 6, k < lvl ? IV : "#4A4466"); g.text(MAIN, "SEARCHING", 222, 220, L, { scale: 2 }); if (Math.floor(t * 3) % 2) g.text(MAIN, "...", 330, 220, L, { scale: 2 }); }
  // phone radio power: climbs to MAX when it shouts, drops to LOW when it can whisper
  const pw = Math.max(win(t, EV.power[0] - 0.2, EV.battery[1], 0.3, 0.3), win(t, EV.whisper[0] - 0.05, EV.flip - 0.95, 0.3, 0.3));
  if (pw > 0) { panel(c, 330, 204, 194, 56, pw, Y); const g = fade(c, pw); g.text(MAIN, "PHONE RADIO", 342, 212, Y, { scale: 2 }); const lv = t < EV.whisper[0] - 0.4 ? 0.15 + 0.85 * smooth(t, EV.power[0], EV.power[1]) : 1 - 0.8 * smooth(t, EV.whisper[0], EV.whisper[0] + 0.8);
    for (let k = 0; k < 10; k++) g.rect(342 + k * 17, 232, 13, 18, k / 10 < lv ? (k > 7 ? PK : k > 4 ? "#F28A4A" : Y) : p3); const lab = lv > 0.95 ? "MAX" : lv < 0.3 ? "LOW" : ""; if (lab) g.text(TINY, lab, 482, 212, lv > 0.95 ? PK : GR, { scale: 2 }); }
  // battery melting
  const ba = win(t, EV.battery[0], EV.battery[1], 0.25, 0.3);
  if (ba > 0) { panel(c, 16, 204, 150, 60, ba, PK); const g = fade(c, ba), lv = 0.8 - 0.6 * smooth(t, EV.battery[0], EV.battery[1] - 0.3); g.rrect(30, 218, 92, 34, IV, 3); g.rect(122, 228, 6, 14, IV); g.rect(33, 221, 86, 28, CARD); g.rect(35, 223, R(82 * lv), 24, lv < 0.35 ? PK : Y);
    for (let k = 0; k < 4; k++) { const ph = ((t - EV.battery[0]) * 1.2 + k * 0.27) % 1, x = 40 + k * 20 + R(82 * lv * 0.3); g.rect(x, 252 + R(ph * 26), 3, 4, lv < 0.35 ? PK : Y); } g.text(TINY, `${R(lv * 100)}%`, 134, 248, IV, { scale: 2 }); }
  pill(c, "ANTENNAS AIM DOWN", 270, 210, L, p7, win(t, EV.towers[0] + 0.4, EV.car[0] - 0.1, 0.3, 0.3));
  pill(c, "HANDOFF ✓", 270, 210, GR, GR, win(t, EV.handoff, EV.car[1], 0.2, 0.3));
  pill(c, "900 KM/H", 270, 210, Y, Y, win(t, EV.speed, EV.fly[1], 0.2, 0.3));
  pill(c, "NETWORK: CONFUSED", 270, 210, PK, PK, win(t, EV.confuse[0], EV.confuse[1], 0.2, 0.3));
  // FCC: US flag, the first ban, the logo
  const fa = win(t, EV.fcc[0], EV.fcc[1], 0.3, 0.35);
  if (fa > 0) { panel(c, 40, 204, 460, 122, fa, IV); fade(c, fa).rect(59, 219, 50, 27, p3); overlay(A.flagUS, 60 * S, 220 * S, fa); dtext(c, "USA", 66, 254, IV, fa, 2);
    const ba2 = fa * smooth(t, EV.banned, EV.banned + 0.3); if (ba2 > 0) { const g = fade(c, ba2); g.rrect(160, 220, 146, 38, PK, 3); g.rrect(163, 223, 140, 32, CARD, 3); g.text(MAIN, "FIRST BAN", 178, 233, PK, { scale: 2 }); dtext(c, "CELL USE IN THE AIR", 158, 268, L, ba2, 2, TINY); }
    const la = fa * smooth(t, EV.fccLogo, EV.fccLogo + 0.3); if (la > 0) { const g = fade(c, la); g.rrect(334, 212, 100, 82, IV, 6); overlay(A.fcc, 341 * S, 218 * S, la); dtext(c, "TELECOM REGULATOR", 316, 302, Y, fa * smooth(t, EV.fcc[0] + 2.8, EV.fcc[0] + 3.1), 2, TINY); } }
  // pilot headset: ATC voice with the phone buzz on top
  const hs = win(t, EV.buzz[0], EV.buzz[1], 0.3, 0.35);
  if (hs > 0) { panel(c, 20, 204, 500, 78, hs, Y); const g = fade(c, hs); g.text(MAIN, "PILOT HEADSET", 34, 212, Y, { scale: 2 });
    for (let x = 0; x < 470; x++) { const tt = t * 2 + x / 60, atc = t > EV.atc[0] ? Math.sin(tt * 9) * Math.sin(tt * 1.3) * 9 : 0, buzz = (Math.floor((x + t * 300) / 8) % 4 === 0) ? (rnd(x + Math.floor(t * 30)) - 0.5) * 30 : 0; const y = 254 + R(atc + buzz); g.rect(34 + x, Math.min(y, 254), 1, Math.abs(y - 254) + 1, buzz ? Y : GR); }
    if (t > EV.mosquito[0]) dtext(c, "BZZZ", 440, 212, PK, hs * smooth(t, EV.mosquito[0], EV.mosquito[0] + 0.3), 2); }
  const at = win(t, EV.atc[0], EV.atc[1], 0.2, 0.3);
  if (at > 0) { const msg = "CLEARED TO LAND", shown = msg.split("").map((ch, i) => (ch !== " " && Math.sin(t * 23 + i * 1.7) > 0.55 ? "Z" : ch)).join(""); panel(c, 120, 300, 300, 40, at, GR); dtext(c, shown, 140, 312, GR, at, 2); dtext(c, "ATC:", 132, 290, MU, at, 1); }
  pill(c, "× 1", 270, 210, Y, Y, win(t, EV.one, EV.twoHundred[0] - 0.1, 0.2, 0.2));
  pill(c, "× 200", 270, 210, PK, PK, win(t, EV.twoHundred[0], EV.twoHundred[1], 0.2, 0.3));
  pill(c, "ON-BOARD CELL", 270, 210, GR, GR, win(t, EV.pico[0], EV.sat[0] - 0.05, 0.25, 0.25));
  pill(c, "LINKED TO A SATELLITE", 270, 210, GR, GR, win(t, EV.sat[0], EV.whisper[0] - 0.35, 0.25, 0.25));
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
const layer = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
function frame(t) {
  overlays.length = 0;
  const c = new Canvas(GW, GH, K), outro = smooth(t, EV.outroIn[0], EV.outroIn[1]);
  if (outro < 1) { scene(c, t); hud(c, t); }
  if (outro > 0) { layer.d.fill(0); outroScene(layer, t); dissolve(c, layer, outro); for (const o of overlays) o.alpha *= 1 - outro; }
  c.rect(0, 0, GW, TOP - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); const dur = Math.round(END) + " S"; c.text(MAIN, dur, 469 - c.measure(MAIN, dur, { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "FORGOT AIRPLANE MODE?", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 });
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const { img, x, y, alpha } of overlays) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (!img.data[k + 3]) continue; if (alpha < 1 && alpha <= bayer((x + i) >> 1, (y + j) >> 1)) continue; const a = img.data[k + 3] / 255, o = ((y + j) * 1080 + x + i) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a; }
  return FULL;
}
await loadAssets();
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
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
