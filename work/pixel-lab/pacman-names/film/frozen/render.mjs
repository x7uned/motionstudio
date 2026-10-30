// «Only the red ghost is chasing you» — pixel film, top-down arcade maze, loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No header overlay: the picture runs to every edge; captions sit over a soft dithered shade.
// The game (Pac-Man's lap and the rule-driven ghosts) comes from sim.mjs + game.json; this file only directs and draws.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade, loadImage } from "../../../../renderer/pixel/raster.mjs";
import { MW, MH, DOTS, DIRS, REV, exits, CORNER, cell } from "./maze.mjs";
import { GAME as G, GHOSTS, mode, SCATTER, targetOf } from "./sim.mjs";
import { EV, END, FPS, tau, TAU_END, WORDS, VOICE } from "./timeline.mjs";
import { drawMaze, drawPac, drawGhost, toS, PAL, SX, SY } from "./sprites.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const C = { O: "#0B0812", CARD: "#120C1D", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", p5: "#6E4FB0", p7: "#B08AE8" };
const GC = { red: "#FF4D5E", pink: "#FF9FD6", blue: "#45E3FF", orange: "#FFA638" };
const NAME = { red: "BLINKY", pink: "PINKY", blue: "INKY", orange: "CLYDE" };
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const wrapT = (t) => ((t % END) + END) % END;

// ---------------------------------------------------------------- the game at real time t
const S0 = G.cfg.s0 ?? 0.5;
const pacAt = (t) => G.pac(tau(wrapT(t)));
const ghostAt = (n, t) => G.ghost(n, tau(wrapT(t)));
function facing(t) { const ta = tau(wrapT(t)), a = G.pac(ta - 0.07), b = G.pac(ta + 0.07); let dx = b.x - a.x, dy = b.y - a.y; if (Math.hypot(dx, dy) < 1e-6) { const d = DIRS[G.pac(ta).dir]; dx = d[0]; dy = d[1]; } return Math.atan2(dy, dx); }
function look(n, t) { const ta = tau(wrapT(t)); let x = 0, y = 0; for (let k = 0; k < 7; k++) { const d = DIRS[G.ghost(n, ta - k * 0.025).dir]; x += d[0] * (7 - k); y += d[1] * (7 - k); } const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }

// tile-based targets jump a whole tile when Pac-Man enters a new one; on screen they slide (trailing average, 0.15 s)
const avg = (fn, t) => { let x = 0, y = 0; for (let k = 0; k < 6; k++) { const v = fn(t - k * 0.025); x += v[0]; y += v[1]; } return [x / 6, y / 6]; };
const liveT = (n, t) => avg((u) => G.liveTarget(n, tau(wrapT(u))), t);
// how settled Pac-Man's heading is: 0 right at a turn, 1 when he has gone straight for 0.2 s and will for 0.2 s more
function headingSteady(t) { const d0 = pacAt(t).dir; let back = 0.4, fwd = 0.4; for (let k = 1; k <= 12; k++) { if (back === 0.4 && pacAt(t - k / 30).dir !== d0) back = (k - 1) / 30; if (fwd === 0.4 && pacAt(t + k / 30).dir !== d0) fwd = (k - 1) / 30; } return Math.min(smooth(back, 0, 0.2), smooth(fwd, 0, 0.2)); }

// ---------------------------------------------------------------- dots: when Pac-Man first reaches each tile in the lap
const VISIT = new Map();
for (const s of G.SEG) for (let k = 0; k <= s.len; k++) { const x = s.ax + DIRS[s.dir][0] * k, y = s.ay + DIRS[s.dir][1] * k, arc = s.s + k; let ta = (arc - S0) / G.PAC_V; if (ta < 0) ta += TAU_END; const key = `${x},${y}`; if (!VISIT.has(key) || VISIT.get(key) > ta) VISIT.set(key, ta); }
// PRE: dots already eaten when the film opens — those Pac-Man visits that lie in the seam close-up, so both ends agree
const P0 = G.pac(0), SEAMR = { x0: P0.x - 4.6, x1: P0.x + 4.6, y0: P0.y - 5.2, y1: P0.y + 7.4 };
const PRE = new Set([...VISIT.keys()].filter((k) => { const [x, y] = k.split(",").map(Number); return x + 0.5 > SEAMR.x0 && x + 0.5 < SEAMR.x1 && y + 0.5 > SEAMR.y0 && y + 0.5 < SEAMR.y1; }));
const BLINK_HZ = Math.round(2.2 * END) / END;
const dotState = {
  list: DOTS,
  alpha(d, t) { const k = `${d.x},${d.y}`; if (d.big) return 1; if (PRE.has(k)) return 0; const v = VISIT.get(k); if (v === undefined) return 1; const ta = tau(wrapT(t)), eat = v - 0.3 / G.PAC_V; return 1 - smooth(ta, eat, eat + 0.06); },
  blink(t) { return clamp01(0.5 + 1.6 * Math.sin(2 * Math.PI * BLINK_HZ * t)); },
};
export const EATS = [...VISIT.entries()].filter(([k]) => !PRE.has(k) && cell(...k.split(",").map(Number)) === ".").map(([k, ta]) => ta - 0.3 / G.PAC_V).sort((a, b) => a - b);

// ---------------------------------------------------------------- camera: beats frame their subjects; blended + smoothed
const SAFE = { x0: 26, x1: 514, y0: 64, y1: 628 };
function frameOn(pts, { zmax = 70, zmin = 18, pad = 1.6, at = 0.5 } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); }
  const z = Math.max(zmin, Math.min(zmax, (SAFE.x1 - SAFE.x0) / (x1 - x0), (SAFE.y1 - SAFE.y0) / (y1 - y0)));
  const midY = lerp(SAFE.y0, SAFE.y1, at);
  return { cx: (x0 + x1) / 2 + (SX - (SAFE.x0 + SAFE.x1) / 2) / z, cy: (y0 + y1) / 2 + (SY - midY) / z, z };
}
const pp = (o) => [o.x, o.y];
export const FULL = { cx: 10.5, cy: 13 + (SY - 352) / 24.5, z: 24.5 };
// the seam close-up: 96 px per tile, Pac-Man at screen (300, 380) (mirrored when he runs right)
function seamCam(t) { const P = pacAt(t), right = Math.cos(facing(t)) > 0; return { cx: P.x + (right ? 30 : -30) / 96, cy: P.y, z: 96 }; }

// the decision shown in slow motion: the one the search placed on "picks the way that looks closest"
export const DECIDE = (() => { let best = null; for (const d of G.DECISIONS) if (d.ta >= 8.05 && d.ta <= 8.52 && d.m === "chase") { const v = (d.n === "red" ? 2 : d.n === "orange" ? 1 : 0) + (d.took !== d.from ? 1 : 0) + (d.opts.length > 2 ? 0.5 : 0) - Math.abs(d.ta - 8.3); if (!best || v > best.v) best = { ...d, v }; } return best; })();
const tReal = (ta) => { let lo = 0, hi = END; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (tau(m) < ta) lo = m; else hi = m; } return lo; };
export const T_DECIDE = DECIDE ? tReal(DECIDE.ta) : 9.6;

const BEATS = [
  { a: 0, b: 0.55, cam: seamCam },
  { a: 1.25, b: 3.2, cam: (t) => frameOn([pp(pacAt(t)), pp(ghostAt("red", t))], { zmax: 62, pad: 1.8 }) },
  { a: 4.0, b: 7.45, cam: () => FULL },
  { a: 8.3, b: 12.25, cam: () => { const d = DECIDE; if (!d) return frameOn([pp(pacAt(9))]); const T = d.T, near = Math.hypot(T[0] - d.x, T[1] - d.y) < 7; return frameOn(near ? [[d.x + 0.5, d.y + 0.5], [T[0] + 0.5, T[1] + 0.5]] : [[d.x + 0.5, d.y + 0.5]], { zmax: 72, pad: 2.4 }); } },
  { a: 12.75, b: 14.3, cam: (t) => frameOn([pp(pacAt(t)), pp(ghostAt("red", t))], { zmax: 56, pad: 2 }) },
  { a: 14.7, b: 17.6, cam: (t) => { const P = pacAt(t), d = DIRS[P.dir]; return frameOn([pp(P), [P.x + d[0] * 4.2, P.y + d[1] * 4.2], pp(ghostAt("pink", t))], { zmax: 52, pad: 2 }); } },
  { a: 18.6, b: 24.4, cam: (t) => { const ta = tau(t), T = G.liveTarget("blue", ta); return frameOn([pp(pacAt(t)), pp(ghostAt("red", t)), [T[0] + 0.5, T[1] + 0.5], pp(ghostAt("blue", t))], { zmax: 48, pad: 1.8 }); } },
  { a: 24.9, b: 26.8, cam: (t) => frameOn([pp(pacAt(t)), pp(ghostAt("red", t)), pp(ghostAt("blue", t))], { zmax: 50, pad: 2 }) },
  { a: 27.7, b: 32.9, cam: (t) => { const P = pacAt(t); return frameOn([[P.x - 8.4, P.y - 8.4], [P.x + 8.4, P.y + 8.4], pp(ghostAt("orange", t))], { zmax: 40, pad: 0.6 }); } },
  { a: 33.9, b: 40.0, cam: (t) => { const c = frameOn([pp(pacAt(t))], { zmax: 34, pad: 6 }); return { ...c, cy: c.cy - 120 / c.z }; } },
  { a: 40.9, b: 45.0, cam: () => FULL },
  { a: 45.4, b: 46.4, cam: (t) => frameOn([pp(pacAt(t))], { zmax: 46, pad: 4.5 }) },
  { a: 48.25, b: END, cam: seamCam },
];
function rawCam(t) {
  let i = 0; while (i < BEATS.length - 1 && BEATS[i + 1].a <= t) i++;
  const A = BEATS[i], ca = A.cam(Math.min(t, A.b));
  if (t <= A.b || i === BEATS.length - 1) return ca;
  const B = BEATS[i + 1], cb = B.cam(B.a), k = smooth(t, A.b, B.a);
  return { cx: lerp(ca.cx, cb.cx, k), cy: lerp(ca.cy, cb.cy, k), z: Math.exp(lerp(Math.log(ca.z), Math.log(cb.z), k)) };
}
// temporal smoothing (periodic, so the seam stays continuous); the seam close-up itself is exact
const CAMS = []; for (let f = 0; f < Math.round(END * FPS); f++) CAMS.push(rawCam(f / FPS));
const SM = 7;
export function camera(t) {
  const f = Math.round(t * FPS), n = CAMS.length;
  let cx = 0, cy = 0, lz = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % n) + n) % n], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) };
  const exact = Math.max(1 - smooth(t, 0.4, 0.9), smooth(t, END - 0.6, END - 0.15));
  if (exact <= 0) return s;
  const e = seamCam(t); return { cx: lerp(s.cx, e.cx, exact), cy: lerp(s.cy, e.cy, exact), z: Math.exp(lerp(Math.log(s.z), Math.log(e.z), exact)) };
}

// ---------------------------------------------------------------- overlay helpers
function panel(c, x, y, w, h, a = 1, edge = C.p7) { if (a <= 0) return; const g = fade(c, a); g.rrect(x, y, w, h, edge, 2); g.rrect(x + 1, y + 1, w - 2, h - 2, C.p5, 2); for (let j = y + 2; j < y + h - 2; j++) g.rect(x + 2, j, w - 4, 1, mix(C.CARD, "#1D1430", (j - y) / h)); }
const dtext = (c, s, x, y, col, a = 1, scale = 2) => { if (a > 0) fade(c, a).text(MAIN, s, R(x), R(y), col, { scale }); };
const tw = (c, s, scale = 2) => c.measure(MAIN, s, { scale });
function tag(c, lines, cx, y, a, col = C.Y, scale = 2) {
  if (a <= 0) return null;
  const w = Math.max(...lines.map((l) => tw(c, l, scale))) + 20, h = lines.length * (8 * scale + 4) + 10;
  const x = R(Math.max(10, Math.min(GW - 10 - w, cx - w / 2))), yy = R(Math.max(10, Math.min(626 - h, y)));
  panel(c, x, yy, w, h, a, col); lines.forEach((l, i) => dtext(c, l, x + 10, yy + 7 + i * (8 * scale + 4), i ? C.IV : col, a, scale)); return { x, y: yy, w, h };
}
// thick dashed line in screen space with marching dashes
function dash(c, x0, y0, x1, y1, col, a, t = 0, th = 2, on = 6, off = 4, upto = 1) {
  if (a <= 0) return; const g = fade(c, a), L = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(L * upto), ph = (t * 24) % (on + off);
  for (let i = 0; i <= n; i++) { if ((i + on + off - ph) % (on + off) >= on) continue; const k = i / Math.max(1, L), x = x0 + (x1 - x0) * k, y = y0 + (y1 - y0) * k; g.rect(R(x - th / 2), R(y - th / 2), th, th, col); }
}
function marker(c, cam, tx, ty, col, a, t = 0, label = null) {
  if (a <= 0) return; const [x0, y0] = toS(cam, tx, ty), s = cam.z, pul = 1 + 0.08 * Math.sin(t * 7), q = s * 0.5 * pul, cx = x0 + s / 2, cy = y0 + s / 2, g = fade(c, a), L = Math.max(4, R(q * 0.55)), th = Math.max(2, R(s / 26));
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const X = R(cx + sx * q), Y = R(cy + sy * q); g.rect(sx < 0 ? X : X - L, Y - (sy < 0 ? 0 : th - 1), L, th, col); g.rect(X - (sx < 0 ? 0 : th - 1), sy < 0 ? Y : Y - L, th, L, col); }
  g.rect(R(cx - th), R(cy - th), 2 * th, 2 * th, col);
  if (label) { const lw = tw(c, label, 2), lx = Math.max(8, Math.min(GW - 8 - lw, cx - lw / 2)), ly = Math.max(8, Math.min(620, cy - q - 22)); dtext(c, label, lx, ly, col, a, 2); }
}
const sc = (cam, x, y) => toS(cam, x, y);

// ---------------------------------------------------------------- the inset: "what if all four chased you?"
const ISO = { x: 34, y: 78, w: 472, h: 330 };
let PHOTO = null;
async function loadPhoto() {
  const m = JSON.parse(fs.readFileSync(HERE + "media.json", "utf8")).assets.find((a) => a.kind === "person");
  const small = await loadImage(HERE + "media/" + m.file.split("/").pop(), 46, 46, { kernel: "lanczos3" });
  PHOTO = { small };
}
function drawInset(c, t) {
  const a = win(t, EV.why - 0.15, EV.boringEnd + 0.15, 0.35, 0.45); if (a <= 0) return;
  panel(c, ISO.x, ISO.y, ISO.w, ISO.h, a, C.Y);
  dtext(c, "WHAT IF ALL 4 CHASE?", ISO.x + 16, ISO.y + 12, C.Y, a, 2);
  // a little loop track: Pac-Man runs round a block, four ghosts follow him in one line
  const cam = { cx: 0, cy: 0, z: 25 }, ox = ISO.x + ISO.w / 2 - SX, oy = ISO.y + 180 - SY;
  const loopW = 14, loopH = 7, per = 2 * (loopW + loopH), at = (s) => { s = ((s % per) + per) % per; if (s < loopW) return [-loopW / 2 + s, -loopH / 2, 0]; s -= loopW; if (s < loopH) return [loopW / 2, -loopH / 2 + s, 1]; s -= loopH; if (s < loopW) return [loopW / 2 - s, loopH / 2, 2]; s -= loopW; return [-loopW / 2, loopH / 2 - s, 3]; };
  const g = fade(c, a), lineCol = PAL.line;
  const rect = (hw, hh, col) => { const x0 = R(SX + ox - hw * cam.z), x1 = R(SX + ox + hw * cam.z), y0 = R(SY + oy - hh * cam.z), y1 = R(SY + oy + hh * cam.z); g.rect(x0, y0, x1 - x0, 2, col); g.rect(x0, y1, x1 - x0 + 2, 2, col); g.rect(x0, y0, 2, y1 - y0, col); g.rect(x1, y0, 2, y1 - y0, col); };
  rect(loopW / 2 + 0.8, loopH / 2 + 0.8, lineCol); rect(loopW / 2 - 0.8, loopH / 2 - 0.8, lineCol);
  const sp = 4.2, s0 = t * sp, ang = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const [px, py, side] = at(s0 + 6.4);
  const shift = (x, y) => ({ cx: cam.cx - (ox) / cam.z, cy: cam.cy - (oy) / cam.z, z: cam.z });
  const icam = shift();
  drawPac(fade(c, a), icam, px, py, ang[side], 0.5 - 0.5 * Math.cos(2 * Math.PI * s0), a, 1.1);
  GHOSTS.forEach((n, i) => { const [gx, gy, gs] = at(s0 + 4.4 - i * 1.7), d = [[1, 0], [0, 1], [-1, 0], [0, -1]][gs]; drawGhost(c, icam, gx, gy, n, d, t * 2, a, 1.05); });
  // every ghost aims at you: four red lines converge on Pac-Man
  const bor = win(t, EV.boring - 0.1, EV.boringEnd + 0.15, 0.25, 0.3);
  if (bor > 0) { tag(c, ["BORING"], ISO.x + ISO.w / 2, ISO.y + ISO.h - 62, a * bor, C.PK, 3); const zz = (t - EV.boring) * 1.4; for (let k = 0; k < 3; k++) { const f = (zz + k / 3) % 1; dtext(c, "Z", ISO.x + ISO.w - 70 + f * 30 + k * 6, ISO.y + 120 - f * 60, C.L, a * bor * (1 - f), 2 + (k === 1 ? 1 : 0)); } }
  // the designer
  const ph = win(t, EV.toru - 0.1, EV.boringEnd + 0.1, 0.35, 0.4) * a;
  if (ph > 0 && PHOTO) { const X = ISO.x + ISO.w - 130, Y = ISO.y + ISO.h + 14, S = 2; panel(c, X - 8, Y - 8, 46 * S + 16, 46 * S + 16, ph, C.L); const gg = fade(c, ph); for (let j = 0; j < 46; j++) for (let i = 0; i < 46; i++) { const k = (j * 46 + i) * 4; gg.rect(X + i * S, Y + j * S, S, S, [PHOTO.small.data[k], PHOTO.small.data[k + 1], PHOTO.small.data[k + 2]]); }
    tag(c, ["TORU IWATANI", "DESIGNED PAC-MAN"], X - 150, Y + 18, ph, C.L, 2); }
}

// ---------------------------------------------------------------- captions (karaoke, the same style as the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, C.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(C.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? C.IV : C.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- world + story overlays
function world(c, t) {
  const cam = camera(t), ta = tau(wrapT(t));
  drawMaze(c, cam, t, dotState);
  const dim = win(t, EV.why + 0.2, EV.boringEnd, 0.4, 0.5);
  // ghosts first, Pac-Man on top
  for (const n of ["orange", "blue", "pink", "red"]) { const g = ghostAt(n, t); drawGhost(c, cam, g.x, g.y, n, look(n, t), ta * 2.2 + GHOSTS.indexOf(n) * 0.25); }
  const P = pacAt(t); drawPac(c, cam, P.x, P.y, facing(t), 0.5 - 0.5 * Math.cos(2 * Math.PI * (P.s - S0)));
  if (dim > 0) c.tint(0, 0, GW, GH, () => dim * 0.55, "#05030C", 5);
  return { cam, ta, P };
}

function story(c, t, w) {
  const { cam, ta, P } = w, tile = (n) => { const g = ghostAt(n, t); return [Math.floor(g.x), Math.floor(g.y)]; };
  const pacS = sc(cam, P.x, P.y), gS = (n) => { const g = ghostAt(n, t); return sc(cam, g.x, g.y); };
  const aim = (n, a, label = null) => { if (a <= 0) return; const T = liveT(n, t), [gx, gy] = gS(n), [tx, ty] = sc(cam, T[0] + 0.5, T[1] + 0.5); dash(c, gx, gy, tx, ty, GC[n], a * 0.9, t); marker(c, cam, T[0], T[1], GC[n], a, t, label); };
  // 1. only red is really chasing you
  { const a = win(t, EV.red - 0.05, EV.other - 0.1, 0.3, 0.35); aim("red", a); const b = win(t, EV.chasing - 0.1, EV.other - 0.1, 0.25, 0.35); if (b > 0) { const [x, y] = gS("red"); tag(c, ["BLINKY", "CHASING YOU"], x, y - cam.z * 1.6 - 70, b, GC.red, 3); } }
  // 2. the other three: names and question marks
  { const a = win(t, EV.other, EV.every - 0.05, 0.3, 0.3);
    if (a > 0) { const placed = [];
      // keep the three tags apart: a tag that would overlap an earlier one moves above it
      for (const n of ["pink", "blue", "orange"]) { const [x, y] = gS(n), w = tw(c, NAME[n] + " ?", 3) + 20, h = 34; let yy = y - cam.z * 0.9 - 44, xx = Math.max(10, Math.min(GW - 10 - w, x - w / 2));
        for (let k = 0; k < 4; k++) { const hit = placed.find((p) => xx < p.x + p.w + 6 && xx + w + 6 > p.x && yy < p.y + p.h + 6 && yy + h + 6 > p.y); if (!hit) break; yy = hit.y - h - 8; }
        placed.push({ x: xx, y: yy, w, h }); tag(c, [NAME[n] + " ?"], xx + w / 2, yy, a, GC[n], 3); } } }
  // 3. every ghost aims at one target square
  { const a = win(t, EV.every, EV.turn - 0.35, 0.35, 0.4); if (a > 0) { for (const n of GHOSTS) aim(n, a); tag(c, ["1 TARGET SQUARE", "EACH"], 270, 20, smooth(t, EV.target - 0.1, EV.target + 0.2) * a, C.Y, 3); } }
  // 4. the decision at a crossing, in slow motion
  if (DECIDE) { const d = DECIDE, a = win(t, EV.turn - 0.35, EV.back + 0.45, 0.35, 0.45);
    if (a > 0) {
      const T = d.T, [tx, ty] = sc(cam, T[0] + 0.5, T[1] + 0.5), [gx, gy] = gS(d.n);
      marker(c, cam, T[0], T[1], GC[d.n], a, t, "TARGET"); dash(c, gx, gy, tx, ty, GC[d.n], a * 0.6, t, 2, 4, 6); { const nm = win(t, EV.turn - 0.3, EV.closest, 0.3, 0.3); if (nm > 0) tag(c, [NAME[d.n]], gx, gy - cam.z - 50, nm, GC[d.n], 3); }
      const show = smooth(t, EV.picks - 0.1, EV.picks + 0.3) * a, pick = smooth(t, EV.closest + 0.2, EV.closest + 0.6) * a;
      const opts = d.opts.map((o) => { const nx = d.x + DIRS[o][0], ny = d.y + DIRS[o][1]; return { o, nx, ny, dd: Math.hypot(nx - T[0], ny - T[1]) }; });
      for (const q of opts) { const [x0, y0] = sc(cam, q.nx + 0.5, q.ny + 0.5), best = q.o === d.took, col = best ? C.GR : "#9AA0C8";
        if (show > 0) { const g = fade(c, show); const s = R(cam.z * 0.72); g.frame(R(x0 - s / 2), R(y0 - s / 2), s, s, col); g.frame(R(x0 - s / 2) + 1, R(y0 - s / 2) + 1, s - 2, s - 2, col); dash(c, x0, y0, tx, ty, col, show * (best ? 1 : 0.7), 0, best ? 3 : 2, 3, 3, smooth(t, EV.picks, EV.picks + 0.7));
          g.frame(R(x0 - s / 2) + 2, R(y0 - s / 2) + 2, s - 4, s - 4, col); const lab = q.dd.toFixed(1); dtext(c, lab, x0 - tw(c, lab, 3) / 2, y0 + s / 2 + 6, col, show, 3); }
        if (pick > 0) { const lab = best ? "✓" : "×"; dtext(c, lab, x0 - tw(c, lab, 3) / 2, y0 - 10, best ? C.GR : C.PK, pick, 3); } }
      const nb = win(t, EV.never - 0.05, EV.back + 0.45, 0.3, 0.4) * a;
      if (nb > 0) { const bd = DIRS[REV[d.from]], [bx, by] = sc(cam, d.x + 0.5 + bd[0] * 0.9, d.y + 0.5 + bd[1] * 0.9); dtext(c, "×", bx - tw(c, "×", 4) / 2, by - 14, C.PK, nb, 4); tag(c, ["NO U-TURN"], bx, by + 26, nb, C.PK, 3); }
    } }
  // 5. red's target is you
  { const a = win(t, EV.redT - 0.05, EV.pink - 0.25, 0.3, 0.35); aim("red", a, a > 0.5 ? "YOU" : null); if (a > 0) { const [x, y] = gS("red"); tag(c, ["TARGET: YOU"], x, y - cam.z - 50, a, GC.red, 3); } }
  // 6. pink aims four squares in front of you (squares follow Pac-Man smoothly and fade around his turns)
  { const a = win(t, EV.pink - 0.05, EV.blue - 0.3, 0.3, 0.35);
    if (a > 0) { const st = headingSteady(t) * (P.dir === "up" ? 0 : 1), d = DIRS[P.dir];
      for (let k = 1; k <= 4; k++) { const on = smooth(t, EV.four + (k - 1) * 0.16, EV.four + (k - 1) * 0.16 + 0.15) * a * st; if (on <= 0) continue; const [x0, y0] = sc(cam, P.x + d[0] * k, P.y + d[1] * k); const s2 = R(cam.z * 0.8); const g = fade(c, on * 0.9); g.frame(R(x0 - s2 / 2), R(y0 - s2 / 2), s2, s2, GC.pink); g.frame(R(x0 - s2 / 2) + 1, R(y0 - s2 / 2) + 1, s2 - 2, s2 - 2, GC.pink); dtext(c, String(k), x0 - 7, y0 - 10, GC.pink, on, 3); }
      const b = smooth(t, EV.squares + 0.3, EV.squares + 0.7) * a * st; aim("pink", b, b > 0.5 ? "4 AHEAD" : null);
      const cu = win(t, EV.cut - 0.05, EV.blue - 0.3, 0.25, 0.35); if (cu > 0) { const [x, y] = gS("pink"); tag(c, ["PINKY", "CUTS YOU OFF"], x, y - cam.z - 76, cu, GC.pink, 3); } } }
  // 7. blue: two ahead, line from red, doubled
  { const a = win(t, EV.blue - 0.05, EV.so + 0.1, 0.3, 0.35);
    if (a > 0) { const A = avg((u) => { const Q = pacAt(u), d = DIRS[Q.dir], up = Q.dir === "up"; return [Math.floor(Q.x) + d[0] * 2 - (up ? 2 : 0), Math.floor(Q.y) + d[1] * 2]; }, t), Rr = avg((u) => { const g = ghostAt("red", u); return [Math.floor(g.x), Math.floor(g.y)]; }, t), [ax, ay] = A, [rx, ry] = Rr, bx = ax + (ax - rx), by = ay + (ay - ry);
      const [Ax, Ay] = sc(cam, ax + 0.5, ay + 0.5), [Rx, Ry] = sc(cam, rx + 0.5, ry + 0.5), [Bx, By] = sc(cam, bx + 0.5, by + 0.5);
      const s1 = smooth(t, EV.two - 0.05, EV.two + 0.3) * a; if (s1 > 0) { marker(c, cam, ax, ay, C.IV, s1, t); const [mx, my] = sc(cam, ax + 0.5, ay + 0.5); tag(c, ["2 AHEAD"], mx + cam.z * 2.4, my - 18, s1, C.IV, 2); }
      const l1 = smooth(t, EV.line - 0.1, EV.red + 99) ; const draw1 = clamp01((t - (EV.line - 0.1)) / 0.9); if (t > EV.line - 0.1) { dash(c, Rx, Ry, Ax, Ay, GC.red, a, 0, 4, 8, 3, draw1); }
      const draw2 = clamp01((t - EV.doubles) / 0.8); if (t > EV.doubles) { dash(c, Ax, Ay, Bx, By, GC.blue, a, 0, 4, 8, 3, draw2); if (draw2 > 0.95) { marker(c, cam, bx, by, GC.blue, a * smooth(t, EV.doubles + 0.7, EV.doubles + 0.9), t, "×2"); } }
      const nm = win(t, EV.blue, EV.takes - 0.1, 0.3, 0.3); if (nm > 0) { const [x, y] = gS("blue"); tag(c, ["INKY", "THE STRANGEST"], x, y - cam.z - 76, nm, GC.blue, 3); } } }
  // 8. red and blue close in from both sides
  { const a = win(t, EV.so - 0.05, EV.orange - 0.35, 0.3, 0.35); if (a > 0) { aim("red", a); aim("blue", a); tag(c, ["BOTH SIDES"], 270, 24, smooth(t, EV.both - 0.1, EV.both + 0.2) * a, C.Y, 3); } }
  // 9. orange: the 8-square circle
  { const a = win(t, EV.orange - 0.05, EV.why - 0.3, 0.3, 0.4);
    if (a > 0) { const ring = smooth(t, EV.far - 0.3, EV.far + 0.2) * a, inside = Math.hypot(Math.floor(ghostAt("orange", t).x) - Math.floor(P.x), Math.floor(ghostAt("orange", t).y) - Math.floor(P.y)) <= 8;
      if (ring > 0) { const [cx, cy] = pacS, r = 8 * cam.z, g = fade(c, ring * 0.9), n = Math.ceil(2 * Math.PI * r / 3); for (let i = 0; i < n; i++) { if (i % 4 === 3) continue; const an = (2 * Math.PI * i) / n + t * 0.15; g.rect(R(cx + Math.cos(an) * r) - 1, R(cy + Math.sin(an) * r) - 1, 2, 2, inside ? GC.orange : "#B98A50"); } }
      const e8 = win(t, EV.eight - 0.05, EV.why - 0.3, 0.25, 0.4); if (e8 > 0) { tag(c, ["8 SQUARES"], pacS[0] + 8 * cam.z * 0.5, pacS[1] - 8 * cam.z * 0.9, e8, GC.orange, 3); }
      aim("orange", a, inside ? "CORNER" : null);
      const nm = win(t, EV.orange, EV.within - 0.1, 0.3, 0.3); if (nm > 0) { const [x, y] = gS("orange"); tag(c, ["CLYDE"], x, y - cam.z - 44, nm, GC.orange, 3); } } }
  // 10. scatter: four corners
  { const a = win(t, EV.stop - 0.35, EV.trap - 0.05, 0.3, 0.35);
    if (a > 0) { for (const n of GHOSTS) { const [cx, cy] = CORNER[n], X = Math.max(-0.6, Math.min(MW - 0.4, cx)), Y = Math.max(-0.75, Math.min(MH - 0.25, cy)); marker(c, cam, X - 0.5, Y - 0.5, GC[n], a, t); const [gx, gy] = gS(n), [tx, ty] = sc(cam, X, Y); dash(c, gx, gy, tx, ty, GC[n], a * 0.75, t); }
      tag(c, ["SCATTER"], 270, 680 - 90, smooth(t, EV.run - 0.1, EV.run + 0.2) * win(t, EV.run, EV.trap - 0.05, 0.1, 0.35), C.Y, 3); } }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K);
  const w = world(c, t);
  story(c, t, w);
  drawInset(c, t);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(Math.PI * (y - 640) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULLBUF.set(row, y * 2 * 3240); FULLBUF.set(row, (y * 2 + 1) * 3240); }
  return FULLBUF;
}
const args = process.argv.slice(2);
if (args[0] === "--stills" || args[0] === "--video") await loadPhoto();
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4", from = Number(args[1] || 0), upto = Number(args[2] || to);
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", args[3] || out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < upto; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
