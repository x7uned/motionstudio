// Five end-screen proposals for the Netflix pixel film (user request 2026-10-22). Preview only: not wired into the studio,
// no voice (the spoken line is drafted and shown, TTS is a paid step). Each clip starts with the film's last 1.2 s and
// continues its world: same grid (540×960 ×2), palette, pixel fonts, dithered dissolves, header and the approved pack sounds.
// node netflix-outros.mjs --sheet | --video [1,2,...] | --stills <variant> t1,t2,...
import fs from "node:fs";
import { spawn, spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe, project, routeSamples } from "../../../../renderer/pixel/earth.mjs";
import { drawRoom, drawLondon, HOUSE, ROOM_FOCUS_D, DISTRICT_CENTER } from "../../netflix/film/dioramas.mjs";
import { EV } from "../../netflix/film/timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url)), ROOT = "/Users/rv/Desktop/Motion Studio/";
const FILM = ROOT + "work/pixel-lab/netflix/film/", PACK = ROOT + "data/branding/xtuned-outro/v1/", FF = ROOT + "bin/ffmpeg";
const GW = 540, GH = 960, TOP = 190, FPS = 30, SR = 48000, K = "#000000", R = Math.round;
const O = "#0B0812", CARD = "#120C1D", IV = "#FDFEED", Y = "#F4CA50", YL = "#FAE375", MU = "#959595", L = "#E0CDF8", P = "#8D59DA", PK = "#E03056", GR = "#65DA41";
const p2 = "#2A1F40", p3 = "#3B2C5C", p5 = "#6E4FB0", p7 = "#B08AE8";
const LEAD0 = 70.4, T0 = 1.2;                 // film second where each clip starts; clip second where the end screen begins
const SUN = { lat: -5, lon: 125 }, R0 = 252, RMAX = 9000, GCX = 270, GCY = 462, UDF = 1.5, UI = 5.4, LONDON = { lat: 51.5, lon: -0.12 }, NYC = { lat: 40.7, lon: -74 };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const dtext = (c, s, x, y, col, a = 1, scale = 1, font = MAIN) => { if (a > 0) fade(c, a).text(font, s, R(x), R(y), col, { scale }); };
const ctext = (c, s, y, col, a = 1, scale = 3, font = MAIN) => dtext(c, s, 270 - c.measure(font, s, { scale }) / 2, y, col, a, scale, font);
function headline(c, s, y, a, hi, scale = 3) {               // centred line; `hi` (a word of s) in yellow; rises 6 px as it dissolves in
  if (a <= 0) return; const o = { scale }, x = R(270 - c.measure(MAIN, s, o) / 2), yy = y + R((1 - a) * 6);
  fade(c, a).text(MAIN, s, x + 1, yy + 1, O, o); fade(c, a).text(MAIN, s, x, yy, IV, o);
  if (hi) { const i = s.indexOf(hi), dx = i > 0 ? c.measure(MAIN, s.slice(0, i), o) + scale : 0; fade(c, a).text(MAIN, hi, x + dx, yy, Y, o); }
}
function pill(c, txt, cx, y, col, edge, a = 1, scale = 2) { if (a <= 0) return; const g = fade(c, a), w = c.measure(MAIN, txt, { scale }) + 22, h = 7 * scale + 12, x = R(Math.max(6, Math.min(GW - 6 - w, cx - w / 2))); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, CARD, 2); g.text(MAIN, txt, x + 11, y + 6, col, { scale }); }
function panel(c, x, y, w, h, a = 1, edge = p7, fill = CARD) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 2, y + 2, w - 4, h - 4, fill, 2); }
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
function sprite(c, rows, x, y, map, a = 1, s = 1) { const g = fade(c, a); rows.forEach((row, j) => [...row].forEach((ch, i) => { const col = map[ch]; if (col) g.rect(R(x) + i * s, R(y) + j * s, s, s, col); })); }

// ---------------------------------------------------------------- film material: last 1.2 s, the first 1.8 s (loop), avatar
function grab(start, dur) {
  const r = spawnSync(FF, ["-v", "error", "-ss", String(start), "-i", FILM + "netflix-pixel.mp4", "-t", String(dur), "-vf", "scale=540:960:flags=neighbor", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: 1 << 30 });
  const n = GW * GH * 3, k = Math.floor(r.stdout.length / n); return Array.from({ length: k }, (_, i) => r.stdout.subarray(i * n, (i + 1) * n));
}
const LEADF = grab(LEAD0, T0), START = grab(0, 1.8);
const toCanvas = (buf) => { const c = new Canvas(GW, GH, K); c.d.set(buf); return c; };
const BASE = toCanvas(LEADF[LEADF.length - 1]);
async function avatar(size) {
  const r = size / 2, inner = r - 4, img = await sharp(PACK + "spritesheet.png").extract({ left: 44, top: 6, width: 104, height: 104 }).resize(Math.round(inner * 2), Math.round(inner * 2), { kernel: "lanczos3" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = new Uint8ClampedArray(size * size * 4), sw = img.info.width, off = r - inner;
  const sp = (i, j) => { const x = Math.round(i - off), y = Math.round(j - off + 1); if (x < 0 || y < 0 || x >= sw || y >= sw) return null; const k = (y * sw + x) * 4; return img.data[k + 3] >= 128 ? [img.data[k], img.data[k + 1], img.data[k + 2]] : null; };
  for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) { const d = Math.hypot(i + 0.5 - r, j + 0.5 - r), k = (j * size + i) * 4; let col = null; if (d <= inner) { col = sp(i, j); if (!col) { const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => sp(i + a, j + b)); col = near ? [11, 8, 18] : mix("#33245A", "#140E24", Math.min(1, d / inner)); } } else if (d <= inner + 1) col = [224, 205, 248]; else if (d <= r) col = [141, 89, 218]; if (col) { out[k] = col[0]; out[k + 1] = col[1]; out[k + 2] = col[2]; out[k + 3] = 255; } }
  return { w: size, h: size, data: out };
}
const A = { avatar: await avatar(66), big: await avatar(84) };
const overlays = [];
function header(c) {
  c.rect(0, 0, GW, TOP - 2, K);
  for (let x = 0; x < GW; x++) for (let j = 0; j < 8; j++) if (bayer(x, TOP - 2 + j) > j / 8) c.px(x, TOP - 2 + j, K);
  c.text(MAIN, "@KAGENAMI_AI", 80, 136, IV, { scale: 2 }); c.text(MAIN, "76 S", 469 - c.measure(MAIN, "76 S", { scale: 2 }), 136, MU, { scale: 2 });
  c.text(MAIN, "HOW NETFLIX STREAMS", 39, 165, IV, { scale: 3, shadow: p3, shadowOffset: 1 });
  overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 });
}

// ---------------------------------------------------------------- the film's world (same camera maths as render.mjs)
const L2 = new Canvas(GW, GH, K);
function stars(c, t) { for (let i = 0; i < 120; i++) { const x = (((i * 197 + R(t * 2)) % GW) + GW) % GW, y = TOP + ((i * 331) % (GH - TOP)); c.px(x, y, i % 7 ? "#2E2A48" : Math.sin(t * 2 + i) > 0.6 ? IV : MU); } }
function near(c, Lk, st) {
  const Ud = UDF * Math.pow(UI / HOUSE.s / UDF, 1 - Lk), F = ROOM_FOCUS_D.map((v, i) => lerp(v, DISTRICT_CENTER[i], Lk));
  const ox = GCX - (F[0] - F[1]) * Ud + (st.dx ?? 0), oy = GCY - ((F[0] + F[1]) / 2 - F[2]) * Ud + (st.dy ?? 0), dA = smooth(Lk, 0.18, 0.5), iA = 1 - smooth(Lk, 0.4, 0.72); let I = null;
  if (dA > 0) { L2.d.set(c.d); I = drawLondon(L2, ox, oy, Ud, st.district); dissolve(c, L2, dA); }
  if (iA > 0) { L2.d.set(c.d); drawRoom(L2, ox + (HOUSE.x - HOUSE.y) * Ud, oy + ((HOUSE.x + HOUSE.y) / 2) * Ud, Ud * HOUSE.s, st.room); dissolve(c, L2, iA); }
  return I;
}
function world(c, tf, D, st) {                                  // D: 2 planet → 1 street → 0 bedroom, film camera
  if (D <= 1) return near(c, D, st);
  const z = 2 - D, w = smooth(z, 0, 0.55), view = { lat0: lerp(30, LONDON.lat, w), lon0: lerp(3 * (tf - 66), LONDON.lon, w), R: R0 * Math.pow(RMAX / R0, z), cx: GCX, cy: GCY };
  const globeA = 1 - smooth(z, 0.8, 0.96), dioA = smooth(z, 0.55, 0.82);
  if (globeA > 0) drawGlobe(c, view, SUN, { alpha: globeA, clip: [0, TOP, GW, GH] });
  if (dioA > 0) { L2.d.set(c.d); const U = UDF * view.R / RMAX, a = project(view, LONDON.lat, LONDON.lon); drawLondon(L2, a.x - (DISTRICT_CENTER[0] - DISTRICT_CENTER[1]) * U, a.y - ((DISTRICT_CENTER[0] + DISTRICT_CENTER[1]) / 2 - DISTRICT_CENTER[2]) * U, U, st.district); dissolve(c, L2, dioA); }
  return null;
}
const stAt = (t) => ({ district: { t, textOn: true, busy: 0 }, room: { t, screenOn: 0, spinner: 0, showOn: EV.showOn, block: 1 } });

// ---------------------------------------------------------------- shared end-screen parts
function timeWords(line, start) {                              // drafted timing for the not-yet-voiced line: Dennis's pace in the film (7 words, 2.64 s)
  const out = []; let t = start;
  for (const raw of line.split(" ")) { const n = raw.replace(/[^A-Za-z0-9]/g, "").length, d = 0.10 + 0.032 * n; out.push({ text: raw, start: t, end: t + d }); t += d + 0.03 + (/[,:]$/.test(raw) ? 0.12 : /[.?!]$/.test(raw) ? 0.22 : 0); }
  return out;
}
function button(c, cx, y, w, label, done_, a, done, press, icon) {
  const bx = R(cx - w / 2), by = y + press, h = 36;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { if (a <= bayer(bx + i, by + j)) continue; if ((i < 2 || i > w - 3) && (j < 2 || j > h - 3)) continue; const edge = i === 0 || i === w - 1 || j === 0 || j === h - 1, base = done > bayer(bx + i + 2, by + j) ? (j < 4 ? "#9BF07A" : GR) : (j < 4 ? p7 : P); c.px(bx + i, by + j, edge ? O : j > h - 6 ? mix(base, O, 0.35) : base); }
  const o = { scale: 2 }, ty = by + 11, iw = icon ? 18 : 0;
  if (done < 1) { const x = R(cx - (c.measure(MAIN, label, o) + iw) / 2); if (icon) icon(c, x + 6, ty + 7, a * (1 - done)); dtext(c, label, x + iw, ty, IV, a * (1 - done), 2); }
  if (done > 0) dtext(c, done_, R(cx - c.measure(MAIN, done_, o) / 2), ty, O, a * done, 2);
}
const HAND = ["..XX......", ".X..X.....", ".X..X.....", ".X..XXX...", ".X..X..XX.", "XX..X..X.X", "X...X..X.X", "X........X", ".X.......X", "..X.....X.", "...XXXXX.."];
function cursor(c, x, y, a) { if (a <= 0) return; HAND.forEach((row, j) => [...row].forEach((ch, i) => { const X = R(x) + i * 2, Yy = R(y) + j * 2; if (a <= bayer(X, Yy)) return; const col = ch === "X" ? O : (row.indexOf("X") < i && row.lastIndexOf("X") > i ? IV : null); if (col) c.rect(X, Yy, 2, 2, col); })); }
/** Avatar + handle centred on one row, the pixel FOLLOW button under it; the cursor presses it right after the brand word. */
function followBlock(c, y, u, a, ev, label = "FOLLOW", done_ = "FOLLOWING ✓", icon) {
  if (a <= 0) return;
  const o = { scale: 2 }, hw = c.measure(MAIN, "@KAGENAMI_AI", o), x0 = R(270 - (42 + 10 + hw) / 2), yy = y + R((1 - a) * 6);
  overlays.push({ img: A.big, x: x0 * 2, y: yy * 2, alpha: a }); dtext(c, "@KAGENAMI_AI", x0 + 52, yy + 14, IV, a, 2);
  const press = u >= ev.click && u < ev.click + 0.14 ? 2 : 0, done = smooth(u, ev.toggle, ev.toggle + 0.2), by = yy + 52;
  button(c, 270, by, 210, label, done_, a, done, press, icon);
  const ca = smooth(u, ev.point, ev.point + 0.3) * (1 - smooth(u, ev.toggle + 0.4, ev.toggle + 0.7)), k = ease((u - ev.point) / 0.6);
  cursor(c, lerp(400, 300, k), lerp(by + 90, by + 20, k) + press, ca);
}
function clickTimes(words) { const b = words[words.length - 1]; return { point: b.start - 0.35, click: b.end + 0.08, toggle: b.end + 0.24 }; }
function karaoke(c, groups, t) {                               // the film's caption style, for the loop variant
  for (const g of groups) {
    const show = g[0].start - 0.12, hide = g.hide; if (t < show || t > hide + 0.16) continue;
    const a = Math.min(smooth(t, show, show + 0.18), 1 - smooth(t, hide, hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.map((w) => w.text.replace(/[.,]$/, "").toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6); let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : O) });
      c.text(MAIN, txt, x, y0, IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? IV : Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- icons (pixel rows; # = icon colour, w = ivory, o = dark)
const ICON = {
  tv: ["#############", "#...........#", "#....w......#", "#....ww.....#", "#....www....#", "#....ww.....#", "#....w......#", "#...........#", "#############", "....#####....", "..#########.."],
  pin: ["...#####...", "..#######..", ".###...###.", ".##.....##.", ".###...###.", "..#######..", "..#######..", "...#####...", "....###....", "....###....", ".....#....."],
  lock: ["...#####...", "..##...##..", "..#.....#..", "..#.....#..", "###########", "###########", "#####o#####", "####ooo####", "#####o#####", "#####o#####", "###########"],
  note: ["....#######", "....#######", "....#.....#", "....#.....#", "....#.....#", "....#.....#", "..###...###", ".####..####", ".####..####", "..##....##."],
  face: ["###.......###", "#...........#", "#...........#", "....#...#....", "....#...#....", "......#......", "......#......", ".....##......", ".............", "....#...#....", ".....###.....", "#...........#", "###.......###"],
  heart: [".##...##.", "####.####", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."],
  rocket: [".....#.....", "....###....", "....#w#....", "...##w##...", "...#####...", "...#####...", "..#######..", ".##.###.##.", ".#..y.y..#.", ".....y....."],
  ghost: ["...#####...", "..#######..", ".#########.", ".##o##o###.", ".##o##o###.", ".#########.", ".#########.", ".#########.", ".##.###.##.", ".#...#...#."],
  star: [".....#.....", "....###....", "....###....", "###########", ".#########.", "..#######..", "..#######..", ".####.####.", ".###...###.", "##.......##"],
};
function qr(c, x, y, col, a, s = 1) { const g = fade(c, a); for (const [fx, fy] of [[0, 0], [9, 0], [0, 9]]) { for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) if (i === 0 || j === 0 || i === 3 || j === 3 || ((i === 1 || i === 2) && (j === 1 || j === 2))) g.rect(x + (fx + i) * s, y + (fy + j) * s, s, s, col); } for (let j = 0; j < 13; j++) for (let i = 0; i < 13; i++) { if ((i < 5 && j < 5) || (i > 7 && j < 5) || (i < 5 && j > 7)) continue; if (rnd(i * 31 + j * 7 + 3) < 0.45) g.rect(x + i * s, y + j * s, s, s, col); } }
function plane(c, x, y, ang, a, s = 1) {                       // paper plane, nose along `ang`
  const rot = ([px, py]) => [x + (px * Math.cos(ang) - py * Math.sin(ang)) * s, y + (px * Math.sin(ang) + py * Math.cos(ang)) * s], g = fade(c, a);
  g.poly([[9, 0], [-7, -6], [-3, 0]].map(rot), IV); g.poly([[9, 0], [-3, 0], [-7, 5]].map(rot), L); g.poly([[9, 0], [-3, 0], [-5, 2]].map(rot), p7);
}
const planeIcon = (c, x, y, a) => plane(c, x, y, -0.35, a, 0.8);

// ---------------------------------------------------------------- 1 · NEXT EPISODE (series hook → follow for part 2)
const POSTERS = [["#E03056", "#2A0E1A"], ["#5470B8", "#121A30"], ["#65DA41", "#14301E"], ["#F4CA50", "#3A2A08"], ["#8D59DA", "#1A1030"], ["#F28A4A", "#3A1A0E"], ["#A9C4FF", "#1E2A5A"], ["#E0CDF8", "#2A1F40"], ["#E03056", "#1A1030"], ["#65DA41", "#121A30"]];
function poster(c, x, y, w, h, k, a) {
  const [hi, lo] = POSTERS[k % POSTERS.length], g = fade(c, a); g.rect(x, y, w, h, lo);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if ((j / h) * 0.9 > bayer(x + i, y + j) + 0.25) g.px(x + i, y + j, mix(lo, hi, 0.35));
  const cx = x + w / 2, cy = y + h * 0.42; if (k % 3 === 0) g.disc(R(cx), R(cy), 8, hi); else if (k % 3 === 1) g.poly([[cx, cy - 10], [cx + 10, cy + 8], [cx - 10, cy + 8]], hi); else g.rect(R(cx - 8), R(cy - 8), 16, 16, hi);
  g.rect(x + 5, y + h - 12, w - 10, 3, mix(hi, IV, 0.4)); g.rect(x + 5, y + h - 7, R((w - 10) * 0.6), 2, mix(lo, IV, 0.3));
}
function sofa(c, u) {                                          // two viewers seen from behind the sofa, lit from above by the screen
  const flick = (x) => (Math.sin(u * 5 + x * 0.04) > -0.6 ? p7 : p5), rimTop = (x0, x1, y, k = 0.8) => { for (let x = x0; x < x1; x++) if (bayer(x, y) < k) c.px(x, y, flick(x)); };
  c.tint(0, 780, GW, 180, (x, y) => 0.35 * Math.max(0, 1 - Math.hypot((x - 270) / 300, (y - 850) / 100)), p3, 6);
  for (const [hx, hy, r] of [[204, 824, 27], [344, 832, 24]]) {
    const sy = hy + r + 20; c.ellipse(hx, sy, R(r * 1.9), R(r * 1.1), "#0F0A16");
    for (let a = Math.PI * 1.12; a < Math.PI * 1.88; a += 0.012) { const x = R(hx + Math.cos(a) * r * 1.9), y = R(sy + Math.sin(a) * r * 1.1); if (bayer(x, y) < 0.55) c.px(x, y, p5); }
    c.disc(hx, hy, r, "#0F0A16"); c.ellipse(hx, hy - R(r * 0.3), r, R(r * 0.72), "#161021");
    for (let a = Math.PI * 1.08; a < Math.PI * 1.92; a += 0.012) { const x = R(hx + Math.cos(a) * r), y = R(hy + Math.sin(a) * r); if (bayer(x, y) < 0.85) c.px(x, y, flick(x)); }
  }
  c.rrect(24, 860, 492, 106, "#1A1326", 2); c.rect(26, 861, 488, 8, "#241A35"); rimTop(26, 514, 860);
  for (const x of [188, 352]) c.rect(x, 870, 2, 90, "#120D1B");
  for (const [x, w] of [[4, 66], [470, 66]]) { c.rrect(x, 884, w, 80, "#1E162C", 2); rimTop(x + 2, x + w - 2, 884, 0.6); }
}
function v1(c, t, u, ev) {
  c.rect(0, TOP, GW, GH - TOP, "#07050C");
  c.tint(0, TOP, GW, GH - TOP, (x, y) => Math.max(0, 0.8 - Math.hypot((x - 270) / 360, (y - 380) / 330)), "#2A1B4A", 8);
  for (let i = 0; i < 60; i++) { const x = (i * 197) % GW, y = TOP + 10 + ((i * 331) % 600); if (i % 4 === 0) c.px(x, y, "#231A38"); }
  sofa(c, u);
  // the film squeezes into the corner like end credits
  const e = ease(u / 0.75), tx = R(lerp(0, 18, e)), ty = R(lerp(TOP, 214, e)), tw = R(lerp(540, 220, e)), th = R(lerp(770, 314, e));
  for (let j = 0; j < th; j++) { const sy = TOP + Math.min(769, Math.floor((j * 770) / th)); for (let i = 0; i < tw; i++) { const sx = Math.min(539, Math.floor((i * 540) / tw)), k = (sy * GW + sx) * 3; c.px(tx + i, ty + j, [BASE.d[k], BASE.d[k + 1], BASE.d[k + 2]]); } }
  const fa = smooth(u, 0.55, 0.85); if (fa > 0) { const g = fade(c, fa); g.frame(tx - 1, ty - 1, tw + 2, th + 2, O); g.frame(tx - 2, ty - 2, tw + 4, th + 4, p7); g.rect(tx, ty + th + 8, tw, 4, PK); dtext(c, "WATCHED ✓", tx, ty + th + 20, GR, fa, 2); }
  // up next
  const pa = smooth(u, 0.35, 0.8), x0 = 250, y0 = 214 + R((1 - pa) * 8), PW = 272, ax = x0 + 12, ay = y0 + 42, pw = 43, ph = 70;
  panel(c, x0, y0, PW, 314, pa);
  pill(c, "UP NEXT", x0 + 60, y0 + 10, Y, Y, pa, 2);
  if (pa > 0) { fade(c, pa).rect(ax, ay, 248, 160, "#0E0A18"); for (let k = 0; k < 10; k++) poster(c, ax + 2 + (k % 5) * (pw + 7), ay + 6 + Math.floor(k / 5) * (ph + 8), pw, ph, k, pa); }
  // the "algorithm" hops across the posters and settles: the teaser for part 2
  const HOPS = [0, 3, 6, 2, 8, 5, 7], ht = (u - 1.0) / 0.34, hi = Math.max(0, Math.min(HOPS.length - 1, Math.floor(ht))), hk = ease(clamp01((ht - hi) / 0.45)), nx = HOPS[Math.min(HOPS.length - 1, hi + 1)], cur = HOPS[hi];
  const sa = smooth(u, 0.95, 1.2) * pa;
  if (sa > 0) { const pos = (k) => [ax + 2 + (k % 5) * (pw + 7), ay + 6 + Math.floor(k / 5) * (ph + 8)], [sx0, sy0] = pos(cur), [sx1, sy1] = pos(nx), q = hi + 1 < HOPS.length ? hk : 0, sx = R(lerp(sx0, sx1, q)), sy = R(lerp(sy0, sy1, q)), g = fade(c, sa); g.frame(sx - 3, sy - 3, pw + 6, ph + 6, O); g.frame(sx - 2, sy - 2, pw + 4, ph + 4, Y); g.frame(sx - 1, sy - 1, pw + 2, ph + 2, YL);
    const tp = smooth(u, 3.15, 3.45) * pa; if (tp > 0) { const g2 = fade(c, tp); g2.rrect(sx - 4, sy - 14, pw + 8, 11, Y, 1); g2.text(TINY, "TOP PICK", sx + R((pw + 8 - c.measure(TINY, "TOP PICK")) / 2) - 4, sy - 11, O); } }
  dtext(c, "PART 2", ax, y0 + 214, Y, pa, 2); dtext(c, "HOW NETFLIX PICKS", ax, y0 + 234, IV, pa, 2); dtext(c, "YOUR NEXT SHOW", ax, y0 + 254, IV, pa, 2);
  // countdown that ends in "soon", not in an autoplay
  if (pa > 0) { const g = fade(c, pa), fill = clamp01((u - 0.9) / 2.8); g.rect(ax, y0 + 284, 248, 10, O); g.rect(ax + 1, y0 + 285, 246, 8, p2); g.rect(ax + 1, y0 + 285, R(246 * fill), 8, fill < 1 ? Y : GR); g.rect(ax + 1, y0 + 285, R(246 * fill), 1, YL); }
  for (let n = 5; n >= 1; n--) { const a0 = 0.9 + (5 - n) * 0.56, na = Math.min(smooth(u, a0 - 0.06, a0 + 0.06), 1 - smooth(u, a0 + 0.5, a0 + 0.62)) * pa; dtext(c, "IN " + n, x0 + PW - 14 - c.measure(MAIN, "IN " + n, { scale: 2 }), y0 + 15, MU, na, 2); }
  dtext(c, "SOON", x0 + PW - 14 - c.measure(MAIN, "SOON", { scale: 2 }), y0 + 15, GR, smooth(u, 3.7, 3.86) * pa, 2);
  followBlock(c, 572, u, smooth(u, 1.0, 1.4), ev);
}

// ---------------------------------------------------------------- 2 · SEND IT (a share tied to the film's own map)
const ROUTE = routeSamples([[LONDON.lon, LONDON.lat], [NYC.lon, NYC.lat]]);
function v2view(t, u) { const tf = LEAD0 + t, k = ease(u / 1.4); return { lat0: lerp(30, 40, k), lon0: lerp(3 * (tf - 66), -37, k), R: lerp(252, 205, k), cx: 270, cy: lerp(462, 470, k) }; }
function v2(c, t, u, ev) {
  const tf = LEAD0 + t, view = v2view(t, u); c.rect(0, TOP, GW, GH - TOP, O); stars(c, tf);
  drawGlobe(c, view, SUN, { alpha: 1, clip: [0, TOP, GW, GH] });
  const lo = project(view, LONDON.lat, LONDON.lon), ny = project(view, NYC.lat, NYC.lon);
  const pinAt = (p, col, a) => { if (a <= 0 || !p.visible) return; const g = fade(c, a), x = R(p.x), y = R(p.y); g.rect(x - 3, y - 9, 7, 7, O); g.rect(x - 2, y - 8, 5, 5, col); g.rect(x, y - 3, 1, 3, col); g.px(x - 1, y - 7, IV); };
  const la = smooth(u, 0.6, 0.9), na = smooth(u, 1.0, 1.3); pinAt(lo, Y, la); pinAt(ny, GR, na);
  if (lo.visible) pill(c, "YOU", lo.x + 24, lo.y - 34, Y, Y, la, 2); if (ny.visible) pill(c, "FRIEND", ny.x - 10, ny.y + 8, GR, GR, na * (1 - smooth(u, 2.9, 3.1)), 2);
  // the paper plane follows the great circle, lifted off the surface
  const f0 = 1.55, f1 = 2.95, f = ease((u - f0) / (f1 - f0)), pts = [];
  for (let i = 0; i < ROUTE.pts.length; i++) { const k = ROUTE.cum[i] / ROUTE.km; if (k > f) break; const [lon, lat] = ROUTE.pts[i], p = project(view, lat, lon, 1 + 0.16 * Math.sin(Math.PI * k)); pts.push([p.x, p.y]); }
  const ta = smooth(u, f0, f0 + 0.15) * (1 - smooth(u, 3.4, 3.9));
  if (pts.length > 1 && ta > 0) { const g = fade(c, ta); let acc = 0; for (let i = 1; i < pts.length; i++) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], n = Math.max(1, R(Math.hypot(x1 - x0, y1 - y0))); for (let s = 0; s < n; s++, acc++) if (acc % 6 < 3) g.px(R(lerp(x0, x1, s / n)), R(lerp(y0, y1, s / n)), YL); } }
  if (u > f0 && u < f1 + 0.25 && pts.length > 1) { const [x1, y1] = pts[pts.length - 1], [x0, y0] = pts[Math.max(0, pts.length - 4)]; plane(c, x1, y1, Math.atan2(y1 - y0, x1 - x0 || -1), Math.min(smooth(u, f0, f0 + 0.15), 1 - smooth(u, f1 + 0.05, f1 + 0.25)), 2.2); }
  // arrival: a ring on the friend's pin, the film lands as a message, a heart comes back
  const ra = 1 - smooth(u, f1, f1 + 0.5); if (u > f1 && ra > 0 && ny.visible) fade(c, ra).ring(R(ny.x), R(ny.y - 6), R(4 + 18 * smooth(u, f1, f1 + 0.5)), GR);
  const ma = smooth(u, f1 + 0.05, f1 + 0.35);
  if (ma > 0 && ny.visible) { const w = 150, h = 54, x = R(Math.max(12, Math.min(GW - 12 - w, ny.x - 40))), y = R(ny.y - 84 + (1 - ma) * 8), g = fade(c, ma);
    g.rrect(x - 2, y - 2, w + 4, h + 4, O, 2); g.rrect(x, y, w, h, IV, 2); g.poly([[ny.x - 6, y + h], [ny.x + 6, y + h], [ny.x, y + h + 8]], IV);
    g.rect(x + 7, y + 7, 40, 40, p2); g.disc(x + 27, y + 27, 14, "#2B2D76"); for (let i = 0; i < 26; i++) { const a = rnd(i) * 6.28, r = 12 * Math.sqrt(rnd(i + 50)); g.px(R(x + 27 + Math.cos(a) * r), R(y + 27 + Math.sin(a) * r), i % 3 ? "#7D69BA" : YL); }
    g.text(TINY, "HOW NETFLIX", x + 54, y + 12, O, { scale: 2 }); g.text(TINY, "STREAMS", x + 54, y + 26, O, { scale: 2 }); g.text(TINY, "@KAGENAMI_AI", x + 54, y + 42, MU);
    const ha = smooth(u, f1 + 0.45, f1 + 0.7); if (ha > 0) { const hx = x + w - 12, hy = y - 10 - R(ha * 4); fade(c, ha).disc(hx + 9, hy + 8, 12, IV); sprite(c, ICON.heart, hx, hy + 1, { "#": PK }, ha, 2); } }
  headline(c, "SEND THIS TO THE FRIEND", 210, smooth(u, 0.3, 0.7));
  headline(c, "WHO BLAMES THE WI-FI", 236, smooth(u, 0.45, 0.85), "WI-FI");
  // the share button is pressed as the plane leaves; no follow ask competes with it
  const ba = smooth(u, 0.9, 1.3), press = u >= f0 - 0.08 && u < f0 + 0.06 ? 2 : 0, sent = smooth(u, f0 + 0.1, f0 + 0.3);
  button(c, 270, 694, 190, "SEND", "SENT ✓", ba, sent, press, planeIcon);
  const ca = smooth(u, 1.0, 1.3) * (1 - smooth(u, f0 + 0.5, f0 + 0.8)), k = ease((u - 1.0) / 0.5); cursor(c, lerp(390, 296, k), lerp(790, 714, k) + press, ca);
}

// ---------------------------------------------------------------- 3 · LOOP (the last line runs into the film's first words)
const DIVE = 2.6;
function v3(c, t, u, ev) {
  const D = 2 - 2 * ease(u / DIVE), st = stAt(u - DIVE);
  c.rect(0, TOP, GW, GH - TOP, O); stars(c, u - DIVE);
  world(c, LEAD0 + T0, D, st);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), O, 6);
  karaoke(c, ev.groups, u);
}

// ---------------------------------------------------------------- 4 · QUESTION (a real question about the topic → comments)
const BUBBLES = [{ at: [1, 37, 52], icon: "rocket", col: Y, t: 1.3 }, { at: [82, 37, 54], icon: "heart", col: PK, t: 1.65 }, { at: [40, 37, 56], icon: "spin", col: MU, t: 2.0 }];
function bubble(c, x, y, a, draw, w = 38) { if (a <= 0) return; const g = fade(c, a), h = 32, bx = R(x - w / 2), by = R(y - h - 8 + (1 - a) * 6); g.rrect(bx - 1, by - 1, w + 2, h + 2, O, 2); g.rrect(bx, by, w, h, IV, 2); g.poly([[x - 4, by + h], [x + 3, by + h], [x - 2, by + h + 6]], IV); draw(g, bx, by, a); }
function v4(c, t, u, ev) {
  const D = u < 1.3 ? 2 - ease(u / 1.3) : 1 - 0.24 * ease((u - 1.3) / 3.4), st = { ...stAt(60 + u), dy: R(70 * ease((u - 1.3) / 1.4)) };
  c.rect(0, TOP, GW, GH - TOP, O); stars(c, LEAD0 + t);
  const I = world(c, LEAD0 + T0, D, st);
  if (I) for (const b of BUBBLES) { const [x, y] = I.P3(...b.at), a = smooth(u, b.t, b.t + 0.25);
    const spin = b.icon === "spin", w = spin ? R(lerp(38, 46, smooth(u, 4.05, 4.3))) : 38;
    // the hero's buffering bubble turns into the answer once the comment is sent
    bubble(c, x, y, a, (g, bx, by, aa) => { if (spin) { const sa = aa * (1 - smooth(u, 4.05, 4.3)), ta = aa * smooth(u, 4.05, 4.3); for (let k = 0; k < 3; k++) { const on = Math.floor(u * 6) % 3 === k ? Y : MU; fade(c, sa).disc(bx + R(w / 2) - 9 + k * 9, by + 16, 3, on); } dtext(c, "144P", bx + R((w - c.measure(MAIN, "144P")) / 2), by + 13, PK, ta, 1); } else { const ic = ICON[b.icon]; sprite(c, ic, bx + R((w - ic[0].length * 2) / 2), by + R((32 - ic.length * 2) / 2), { "#": b.col, w: IV, o: O, y: Y }, aa, 2); } }, w); }
  { const ha = smooth(u, 0.3, 0.7); c.tint(0, 196, GW, 70, (x, y) => ha * 0.8 * Math.min(1, (y - 196) / 10, (266 - y) / 10), O, 6); }
  headline(c, "WHAT WERE YOU WATCHING", 206, smooth(u, 0.3, 0.7));
  headline(c, "THE LAST TIME IT BUFFERED?", 232, smooth(u, 0.45, 0.85), "BUFFERED?");
  // the comment field: placeholder → typed answer (each letter dissolves in) → send
  const fa = smooth(u, 2.4, 2.8), bx = 36, by = 648, bw = 392; if (fa > 0) { const g = fade(c, fa); g.rrect(bx - 2, by - 2, bw + 4, 40, O, 2); g.rrect(bx, by, bw, 36, CARD, 2); g.frame(bx, by, bw, 36, p5); }
  if (fa > 0) overlays.push({ img: A.avatar, x: (bx + 4) * 2, y: (by + 2) * 2, alpha: fa });
  dtext(c, "ADD A COMMENT...", bx + 44, by + 11, MU, fa * (1 - smooth(u, 2.85, 3.0)), 2);
  const typed = "MY SHOW, IN 144P"; let x = bx + 44; for (let i = 0; i < typed.length; i++) { const ta = smooth(u, 3.0 + i * 0.05, 3.1 + i * 0.05) * (1 - smooth(u, 4.0, 4.2)); dtext(c, typed[i], x, by + 11, IV, ta, 2); x += c.measure(MAIN, typed[i] === " " ? " " : typed[i], { scale: 2 }) + 2; }
  const sa = fa, press = u >= 3.92 && u < 4.06 ? 2 : 0, sx = bx + bw + 24; if (sa > 0) { const g = fade(c, sa); g.disc(sx, by + 18 + press, 17, O); g.disc(sx, by + 18 + press, 15, smooth(u, 3.9, 4.0) > 0.5 ? GR : P); } plane(c, sx - 1, by + 18 + press, -0.5, sa, 1.1);
  const ca = smooth(u, 3.5, 3.75) * (1 - smooth(u, 4.3, 4.6)), k = ease((u - 3.5) / 0.4); cursor(c, lerp(500, sx - 4, k), lerp(720, by + 22, k) + press, ca);
}

// ---------------------------------------------------------------- 5 · CHANNEL PLANET (follow with a promise: what you get)
const TOPICS = [{ icon: "tv", col: Y, now: true }, { icon: "pin", col: GR }, { icon: "qr", col: L }, { icon: "lock", col: PK }, { icon: "note", col: "#A9C4FF" }, { icon: "face", col: "#F28A4A" }];
function badge(c, x, y, tp, a, back) {
  if (a <= 0) return; const g = fade(c, a), edge = back ? mix(tp.col, O, 0.5) : tp.col, fill = back ? "#0C0916" : CARD, col = back ? mix(tp.col, O, 0.45) : tp.col;
  g.rrect(R(x) - 23, R(y) - 23, 46, 46, O, 2); g.rrect(R(x) - 22, R(y) - 22, 44, 44, edge, 2); g.rrect(R(x) - 20, R(y) - 20, 40, 40, fill, 2);
  if (tp.icon === "qr") qr(c, R(x) - 13, R(y) - 13, col, a, 2); else { const rows = ICON[tp.icon]; sprite(c, rows, R(x) - rows[0].length, R(y) - rows.length, { "#": col, w: IV, o: fill }, a, 2); }
}
function v5(c, t, u, ev) {
  const tf = LEAD0 + t, k = ease((u - 0.05) / 0.95), view = { lat0: 30, lon0: 3 * (tf - 66), R: lerp(252, 140, k), cx: 270, cy: lerp(462, 420, k) };
  c.rect(0, TOP, GW, GH - TOP, O); stars(c, tf);
  for (let i = 0; i < 90; i++) { const x = (i * 263) % GW, y = 560 + ((i * 151) % 400); c.px(x, y, i % 5 ? "#231C38" : "#3A3156"); }
  const oa = smooth(u, 0.8, 1.15), rx = 236, ry = 66, cx = 270, cy = 420, spin = u * 0.32;
  const items = TOPICS.map((tp, i) => { const a = -Math.PI / 2 + Math.PI + i * (Math.PI * 2 / 6) + spin; return { tp, x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry, front: Math.sin(a) > 0, a: smooth(u, 1.0 + i * 0.2, 1.25 + i * 0.2) }; });
  const ring = (front) => { if (oa <= 0) return; const g = fade(c, oa); for (let s = 0; s < 360; s++) { const a = (s / 360) * Math.PI * 2; if ((Math.sin(a) > 0) !== front || s % 3) continue; g.px(R(cx + Math.cos(a) * rx), R(cy + Math.sin(a) * ry), front ? p7 : p3); } };
  ring(false); for (const it of items) if (!it.front) badge(c, it.x, it.y, it.tp, it.a, true);
  drawGlobe(c, view, SUN, { alpha: 1, clip: [0, TOP, GW, GH] });
  ring(true); for (const it of items) if (it.front) badge(c, it.x, it.y, it.tp, it.a, false);
  const now = items[0]; if (now.a > 0) pill(c, "NOW", now.x, now.y - 48, Y, Y, now.a * (now.front ? 1 : 0.6), 1);
  const pa = 1 - smooth(u, ev.toggle, ev.toggle + 0.6); if (u > ev.toggle && pa > 0) fade(c, pa).ering(cx, cy, R(rx * (1 + 0.25 * smooth(u, ev.toggle, ev.toggle + 0.6))), R(ry * (1 + 0.25 * smooth(u, ev.toggle, ev.toggle + 0.6))), YL);
  headline(c, "THE APPS YOU USE EVERY DAY,", 210, smooth(u, 0.3, 0.7));
  headline(c, "TAKEN APART", 236, smooth(u, 0.45, 0.85), "TAKEN APART");
  followBlock(c, 596, u, smooth(u, 1.5, 1.9), ev);
}

// ---------------------------------------------------------------- variants
const V = [
  { id: 1, key: "next-episode", ru: "Следующая серия", line: "Part two: how Netflix picks your next show. Follow Kagenami.", len: T0 + 4.75, draw: v1 },
  { id: 2, key: "send-it", ru: "Перешли другу", line: "Send this to the friend who always blames the Wi-Fi.", len: T0 + 4.5, draw: v2 },
  { id: 3, key: "loop", ru: "Петля", line: "That's what happens every time", len: T0 + DIVE + 1.8, draw: v3 },
  { id: 4, key: "question", ru: "Вопрос в комментарии", line: "What were you watching the last time it buffered?", len: T0 + 4.7, draw: v4 },
  { id: 5, key: "channel-planet", ru: "Планета канала", line: "The apps you use every day, taken apart. Follow Kagenami.", len: T0 + 4.9, draw: v5 },
];
for (const v of V) {
  v.words = timeWords(v.line, v.id === 3 ? 0.9 : 0.4); v.ev = clickTimes(v.words);
  if (v.id === 3) { const g1 = v.words.slice(0, 3), g2 = v.words.slice(3); g1.hide = g2[0].start - 0.29; g2.hide = DIVE - 0.17; v.ev.groups = [g1, g2]; }
}

function frame(v, t) {
  overlays.length = 0;
  if (t < T0) { const c = toCanvas(LEADF[Math.min(LEADF.length - 1, Math.floor(t * FPS))]); overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 }); return c; }
  if (v.id === 3 && t >= T0 + DIVE) { const c = toCanvas(START[Math.max(0, Math.min(START.length - 1, Math.floor((t - T0 - DIVE) * FPS + 1e-6)))]); overlays.push({ img: A.avatar, x: 76, y: 254, alpha: 1 }); return c; }
  const u = t - T0, c = new Canvas(GW, GH, K);
  v.draw(c, t, u, v.ev);
  if (v.id !== 1) { const k = smooth(u, 0, 0.45); if (k < 1) { const keep = new Canvas(GW, GH, K); keep.d.set(c.d); c.d.set(BASE.d); const ov = overlays.splice(0); dissolve(c, keep, k); for (const o of ov) overlays.push({ ...o, alpha: o.alpha * k }); } }
  header(c);
  return c;
}
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  for (const { img, x, y, alpha } of overlays) for (let j = 0; j < img.h; j++) for (let i = 0; i < img.w; i++) { const k = (j * img.w + i) * 4; if (!img.data[k + 3]) continue; if (x + i < 0 || x + i >= 1080 || y + j < 0 || y + j >= 1920) continue; if (alpha < 1 && alpha <= bayer((x + i) >> 1, (y + j) >> 1)) continue; const a = img.data[k + 3] / 255, o = ((y + j) * 1080 + x + i) * 3; for (let q = 0; q < 3; q++) FULL[o + q] = FULL[o + q] * (1 - a) + img.data[k + q] * a; }
  return FULL;
}
const png = (c) => sharp(Buffer.from(toFull(c)), { raw: { width: 1080, height: 1920, channels: 3 } });

// ---------------------------------------------------------------- sound: film tail, the film's bed, 8-bit sfx (each as long as its motion)
function readWav(file) {
  const b = fs.readFileSync(file); let off = 12, fmt = null, data = null;
  while (off + 8 <= b.length) { const id = b.toString("ascii", off, off + 4), size = b.readUInt32LE(off + 4); if (id === "fmt ") fmt = { code: b.readUInt16LE(off + 8), ch: b.readUInt16LE(off + 10), bits: b.readUInt16LE(off + 22) }; if (id === "data") { data = [off + 8, size]; break; } off += 8 + size + (size & 1); }
  const [start, size] = data, bps = fmt.bits / 8, n = Math.floor(size / bps / fmt.ch), out = new Float32Array(n);
  for (let i = 0; i < n; i++) { let s = 0; for (let ch = 0; ch < fmt.ch; ch++) { const p = start + (i * fmt.ch + ch) * bps; s += fmt.code === 3 ? b.readFloatLE(p) : b.readInt16LE(p) / 32768; } out[i] = s / fmt.ch; }
  return out;
}
function loudness(file) { const r = execFileSync("/bin/sh", ["-c", `"${FF}" -hide_banner -nostdin -i "${file}" -af ebur128 -f null - 2>&1`], { encoding: "utf8", maxBuffer: 1 << 28 }); const I = Number(/I:\s+(-?[\d.]+) LUFS/.exec(r.slice(r.lastIndexOf("Summary")))?.[1]); let Mmax = -99; for (const m of r.matchAll(/ M:\s*(-?[\d.]+)/g)) Mmax = Math.max(Mmax, Number(m[1])); return { I, Mmax }; }
let AUD = null;
function audioStems() {
  if (AUD) return AUD;
  const mixFinal = readWav(FILM + "audio/mix-final.wav"), mixPre = readWav(FILM + "audio/mix.wav"), bed = readWav(FILM + "audio/bed.wav");
  const rms = (a) => Math.sqrt(a.reduce((s, x) => s + x * x, 0) / a.length), norm = rms(mixFinal) / rms(mixPre);
  const s0 = loudness(FILM + "audio/sfx.wav"), b0 = loudness(FILM + "audio/bed.wav");
  AUD = { mixFinal, bed, norm, sGain: Math.pow(10, (-20 - s0.Mmax) / 20), bGain: Math.pow(10, (-30 - b0.I) / 20), click: readWav(PACK + "sounds/pixel-click.wav"), arp: readWav(PACK + "sounds/chiptune-arpeggio.wav") };
  return AUD;
}
function tone(buf, t0, dur, { wave = "pulse", duty = 0.5, f, v = () => 1, gain = 0.1 }) {
  const s0 = Math.round(t0 * SR), len = Math.round(dur * SR); let ph = 0, lfsr = 1, nz = 1;
  for (let i = 0; i < len; i++) { const tt = i / SR, u = clamp01(Math.floor(tt * 60) / 60 / dur), fr = f(u, tt), vol = Math.round(clamp01(v(u, tt)) * 15) / 15; ph += fr / SR; let x;
    if (wave === "pulse") x = (ph % 1) < duty ? 1 : -1; else if (wave === "tri") { const p = ph % 1, tri = p < 0.5 ? 4 * p - 1 : 3 - 4 * p; x = Math.round(tri * 7.5) / 7.5; } else { if (ph >= 1) { ph -= Math.floor(ph); const bit = (lfsr ^ (lfsr >> 1)) & 1; lfsr = (lfsr >> 1) | (bit << 14); nz = lfsr & 1 ? 1 : -1; } x = nz; }
    const edge = Math.min(1, i / (0.003 * SR), (len - i) / (0.004 * SR)), k = s0 + i; if (k >= 0 && k < buf.length) buf[k] += x * vol * gain * edge; }
}
const NOTE = (name) => { const m = /^([A-G])(#?)(\d)$/.exec(name), b = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]]; return 440 * Math.pow(2, (12 * (Number(m[3]) + 1) + b + (m[2] ? 1 : 0) - 69) / 12); };
const env = (a, r) => (u) => Math.min(1, u / a, (1 - u) / r);
function sfxFor(v, n) {
  const s = new Float32Array(n), at = (u) => T0 + u, A2 = audioStems();
  const blip = (u, note, dur, gain = 0.04, duty = 0.5) => tone(s, at(u), dur, { duty, f: () => NOTE(note), v: (x) => 1 - x * 0.7, gain });
  const sweep = (u0, u1, up, gain = 1) => { const d = u1 - u0, fr = (x) => (up ? 140 * Math.pow(900 / 140, x) : 900 * Math.pow(140 / 900, x)); tone(s, at(u0), d, { duty: 0.25, f: fr, v: env(0.12, 0.2), gain: 0.02 * gain }); tone(s, at(u0), d, { wave: "tri", f: (x) => fr(x) / 2, v: env(0.1, 0.25), gain: 0.045 * gain }); };
  const swish = (u0, u1, gain = 0.016) => tone(s, at(u0), u1 - u0, { wave: "noise", f: (x) => 2500 + 3500 * Math.sin(Math.PI * x), v: (x) => Math.sin(Math.PI * x), gain });
  const pop = (u, a = "C6", b = "G6", d = 0.25) => { blip(u, a, d * 0.4, 0.03, 0.25); blip(u + d * 0.4, b, d * 0.6, 0.03, 0.25); };
  const wav = (w, u, g) => { const k0 = Math.round(at(u) * SR); for (let i = 0; i < w.length && k0 + i < n; i++) s[k0 + i] += w[i] * g; };
  const follow = () => { wav(A2.click, v.ev.click, 0.55); wav(A2.arp, v.ev.toggle, 0.45); };
  if (v.id === 1) { sweep(0, 0.75, false, 0.9); pop(0.4, "E5", "B5", 0.4); for (let k = 0; k < 6; k++) blip(1.0 + k * 0.34, ["C5", "E5", "G5", "E5", "A5", "C6"][k], 0.3, 0.012, 0.125); pop(3.15, "G5", "D6", 0.3); for (let n2 = 0; n2 < 5; n2++) blip(0.9 + n2 * 0.56, "A4", 0.12, 0.02, 0.5); pop(3.7, "C6", "G6", 0.16); follow(); }
  if (v.id === 2) { swish(0, 0.45); pop(0.6, "E5", "A5"); pop(1.0, "G5", "C6"); wav(A2.click, 1.47, 0.55); tone(s, at(1.55), 1.4, { duty: 0.25, f: (x) => 300 + 500 * Math.sin(Math.PI * x), v: env(0.15, 0.3), gain: 0.02 }); swish(1.55, 2.95, 0.009); pop(3.0, "C6", "E6", 0.3); pop(3.4, "E6", "G6", 0.25); }
  if (v.id === 3) { sweep(0, DIVE, false, 0.8); swish(DIVE - 0.6, DIVE, 0.01); }
  if (v.id === 4) { sweep(0, 1.3, false, 0.8); for (const [i, b] of BUBBLES.entries()) pop(b.t, ["C5", "E5", "G5", "B5"][i], ["G5", "A5", "D6", "E6"][i], 0.25); for (let i = 0; i < 16; i++) tone(s, at(3.0 + i * 0.05), 0.05, { wave: "noise", f: () => 4000, v: (x) => 1 - x, gain: 0.012 }); wav(A2.click, 3.92, 0.55); swish(3.95, 4.25, 0.01); pop(4.05, "G5", "C6"); }
  if (v.id === 5) { sweep(0.05, 1.0, false, 0.9); TOPICS.forEach((_, i) => pop(1.0 + i * 0.2, ["C5", "D5", "E5", "G5", "A5", "C6"][i], ["G5", "A5", "B5", "D6", "E6", "G6"][i], 0.25)); follow(); }
  return s;
}
function writeAudio(v, file) {
  const A2 = audioStems(), n = Math.round(v.len * SR), out = new Float32Array(n), sfx = sfxFor(v, n), lead = Math.round(LEAD0 * SR), loopAt = Math.round((T0 + DIVE) * SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR, fl = 1 - smooth(t, T0 - 0.05, T0 + 0.25), fb = smooth(t, T0 - 0.05, T0 + 0.25);
    let x = (A2.mixFinal[lead + i] ?? 0) * fl + (A2.bed[lead + i] ?? 0) * A2.bGain * A2.norm * fb * (v.id === 3 ? 1 - smooth(t, T0 + DIVE - 0.2, T0 + DIVE) : 1) + sfx[i] * A2.sGain * A2.norm;
    if (v.id === 3 && i >= loopAt) x += (A2.mixFinal[i - loopAt] ?? 0) * smooth(t, T0 + DIVE, T0 + DIVE + 0.03);
    out[i] = x * (1 - smooth(t, v.len - 0.45, v.len));
  }
  const b = Buffer.alloc(44 + n * 2); b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVEfmt ", 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i])) * 32767), 44 + i * 2); fs.writeFileSync(file, b);
}

// ---------------------------------------------------------------- output
const OUT = HERE + "out/"; fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2), pick = (s) => (s ? s.split(",").map(Number) : V.map((v) => v.id));
if (args[0] === "--stills") {
  const v = V.find((x) => x.id === Number(args[1]));
  for (const s of args[2].split(",")) { const t = Number(s); await png(frame(v, t)).png().toFile(OUT + `v${v.id}-t${t.toFixed(2)}.png`); console.log("still", v.id, t); }
} else if (args[0] === "--sheet") {
  const rows = [];
  for (const v of V.filter((x) => pick(args[1]).includes(x.id))) {
    const ts = [T0 - 0.3, T0 + 0.35, T0 + 1.2, T0 + 2.2, T0 + 3.3, v.len - 0.15], tiles = [];
    for (const t of ts) { const buf = await png(frame(v, t)).resize(270, 480).png().toBuffer(); const lab = Buffer.from(`<svg width="270" height="24"><rect width="270" height="24" fill="#000"/><text x="6" y="17" font-family="Menlo" font-size="15" fill="#fff">${v.id} · ${t.toFixed(2)}s</text></svg>`); tiles.push(await sharp(buf).extend({ top: 24, background: "#000" }).composite([{ input: lab, top: 0, left: 0 }]).png().toBuffer()); }
    rows.push(await sharp({ create: { width: 270 * ts.length, height: 504, channels: 3, background: "#000" } }).composite(tiles.map((b, i) => ({ input: b, left: i * 270, top: 0 }))).png().toBuffer());
  }
  await sharp({ create: { width: 270 * 6, height: 504 * rows.length, channels: 3, background: "#000" } }).composite(rows.map((b, i) => ({ input: b, left: 0, top: i * 504 }))).jpeg({ quality: 86 }).toFile(OUT + (args[2] ?? "sheet.jpg"));
  console.log("sheet", rows.length);
} else if (args[0] === "--video") {
  for (const v of V.filter((x) => pick(args[1]).includes(x.id))) {
    const n = Math.round(v.len * FPS), raw = OUT + `.v${v.id}-noaudio.mp4`, wav = OUT + `.v${v.id}.wav`, out = OUT + `outro-${v.id}-${v.key}.mp4`;
    const ff = spawn(FF, ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", raw], { stdio: ["pipe", "inherit", "inherit"] });
    for (let f = 0; f < n; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(v, f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); }
    ff.stdin.end(); await new Promise((r) => ff.on("close", r));
    writeAudio(v, wav);
    execFileSync(FF, ["-y", "-v", "error", "-i", raw, "-i", wav, "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ac", "2", "-shortest", "-movflags", "+faststart", out]);
    fs.rmSync(raw); fs.rmSync(wav); console.log("video", out, n, "frames");
  }
}
