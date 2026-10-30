// «Pac-Man level 256» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps. Our own maze and sprites
// (from the ghosts film), not the arcade graphics. No overlay; karaoke captions on a soft dithered shade.
// The split screen (first and last frame) → the level number in one byte → the fruit row → 255 + 1 = 0 → the fruit loop
// runs 256 times → it draws its memory as tiles over the right half, column by column → walls don't work, dots missing
// → 244 needed, 168 at most → the ghosts catch you → 3,333,360 → 1999, about six hours → back to the split screen.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "../../ping/film/world.mjs";
import { tag, panel, stamp, pointer } from "../../ping/film/hud.mjs";
import { MW, MH, DOTS, cell } from "./maze.mjs";
import { drawMaze, drawPac, drawGhost, toS, PAL, SX, SY } from "./sprites.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000", RED = "#E8344E";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));
const hash = (a, b, c = 0) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 2147483647); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };

// ---------------------------------------------------------------- the split screen: garbage tiles over the right half
// order as the bug draws them: from the top-right corner down each column, column by column to the middle (≈ one tile
// per pass of the 256-pass loop); present at the seam, dissolved away for the explanation, drawn again on the words
export const GX0 = 11, GT = [];
{ let k = 0; for (let x = MW - 1; x >= GX0; x--) for (let y = 0; y < MH; y++) GT.push({ x, y, k: k++ }); for (let x = MW - 1; x >= GX0 - 3; x--) GT.push({ x, y: MH, k: k++ }); }   // + the broken fruit row under the maze
const G_A = EV.runs2 - 0.1, G_B = EV.right + 0.4, GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@!?-:/+%*=$<>";
const GCOL = ["#FF4D5E", "#FF9FD6", "#45E3FF", "#FFA638", "#FDFEED", "#F4CA50", "#3A50FF", "#65DA41", "#B08AE8"];
function garbageAlpha(g, t) {
  const ts = G_A + (g.k / GT.length) * (G_B - G_A), on = smooth(t, ts, ts + 0.12), early = 1 - smooth(t, EV.halfEnd - 0.1 + (g.k % 23) * 0.012, EV.halfEnd + 0.25 + (g.k % 23) * 0.012);
  return Math.max(on, t < 20 ? early : 0);
}
function drawGarbage(c, cam, t) {
  for (const g of GT) { const a = garbageAlpha(g, t); if (a <= 0) continue; const [X0, Y0] = toS(cam, g.x, g.y), z = cam.z, f = fade(c, a);
    if (X0 > GW || Y0 > GH || X0 + z < 0 || Y0 + z < 0) continue;
    f.rect(R(X0), R(Y0), Math.ceil(z), Math.ceil(z), "#04030A");
    const h = hash(g.x, g.y, 5), kind = h < 0.12 ? "wall" : h < 0.18 ? "blank" : "glyph";
    if (kind === "wall") { const col = PAL.line, w = Math.max(1, R(z * 0.12)); if (hash(g.x, g.y, 6) < 0.5) f.rect(R(X0), R(Y0 + z * 0.3), Math.ceil(z), w, col); else f.rect(R(X0 + z * 0.3), R(Y0), w, Math.ceil(z), col); continue; }
    if (kind === "blank") continue;
    const ch = GLYPHS[Math.floor(hash(g.x, g.y, 7) * GLYPHS.length)], col = GCOL[Math.floor(hash(g.x, g.y, 8) * GCOL.length)], ps = (z * 0.78) / 7;
    stext(c, MAIN, ch, X0 + z / 2, Y0 + z * 0.11, ps, col, { align: 0.5, alpha: a });
  }
}

// ---------------------------------------------------------------- Pac-Man and the ghosts (scripted, our own motion)
// Pac-Man laps a ring of corridors on the left half: (1,1) → (9,1) → (9,4) → (1,4) → (1,1), a whole number of laps over END
const RING = [[1.5, 1.5], [9.5, 1.5], [9.5, 4.5], [1.5, 4.5]], RLEN = 22, LAPS = 19, V = (RLEN * LAPS) / END;
function ringAt(s) { s = ((s % RLEN) + RLEN) % RLEN; const seg = [8, 3, 8, 3]; let i = 0; while (s > seg[i]) { s -= seg[i]; i = (i + 1) % 4; } const [ax, ay] = RING[i], [bx, by] = RING[(i + 1) % 4], k = s / seg[i]; return { x: lerp(ax, bx, k), y: lerp(ay, by, k), dir: [Math.sign(bx - ax), Math.sign(by - ay)] }; }
const pacS = (t) => V * t;
const CATCH = EV.you, DEATH = [CATCH + 0.1, CATCH + 1.3], BACK = [EV.hoursEnd - 0.3, EV.ending - 0.1];
const pacAlpha = (t) => (t < DEATH[0] ? 1 : t < BACK[0] ? 0 : smooth(t, BACK[0], BACK[1]));
const lagAt = (t) => lerp(5, 0, smooth(t, EV.ghosts - 0.3, CATCH));
const redS = (t) => (t < CATCH ? pacS(t) - lagAt(t) : pacS(CATCH));
const redAlpha = (t) => Math.max(1 - smooth(t, DEATH[1] - 0.2, DEATH[1] + 0.4), smooth(t, BACK[0], BACK[1]));
const redPos = (t) => (t > DEATH[1] + 0.4 && t < BACK[0] ? ringAt(pacS(t) - 5) : t >= BACK[0] ? ringAt(pacS(t) - 5) : ringAt(redS(t)));
// the dots: none on Pac-Man's ring (eaten), the left half full; on the right only 5 visible of the 9 left at 256
const RING_TILES = new Set(); for (let s = 0; s < RLEN; s += 0.5) { const p = ringAt(s); RING_TILES.add(`${Math.floor(p.x)},${Math.floor(p.y)}`); }
const RIGHT_DOTS = new Set(["19,1", "15,6", "19,14", "13,22", "17,24"]);
const dotState = {
  list: DOTS,
  alpha(d, t) { if (RING_TILES.has(`${d.x},${d.y}`)) return 0; if (d.x < GX0) return 1; const g = GT.find((q) => q.x === d.x && q.y === d.y), ga = g ? garbageAlpha(g, t) : 0; return RIGHT_DOTS.has(`${d.x},${d.y}`) ? 1 : 1 - ga; },
  blink(t) { return clamp01(0.5 + 1.6 * Math.sin(2 * Math.PI * Math.round(2.2 * END) / END * t)); },
};

// ---------------------------------------------------------------- camera
const FULL = { cx: 10.5, cy: 13 + (SY - 352) / 24.5, z: 24.5 }, BOTTOM = { cx: 13.6, cy: 23.6, z: 30 }, RIGHTC = { cx: 15.3, cy: 11.5, z: 28 }, NEAR = { cx: 5.5, cy: 8.2, z: 40 };
const KEYS = [[0, EV.halfEnd, FULL], [EV.each - 0.1, EV.levelEnd + 0.2, BOTTOM], [EV.on256 + 0.2, EV.past, FULL], [EV.pictures, EV.broken + 0.4, RIGHTC], [EV.right - 0.1, EV.mazeEnd + 2.6, FULL],
  [EV.ghosts - 0.3, EV.overEnd, NEAR], [EV.highest, END + 1, FULL]];
function rawCam(t) { let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++; const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A }; const [b0, , B] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1)); return { cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k), z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), k)) }; }
const FR = Math.round(END * FPS), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / FPS));
function camera(t) { const f = Math.round(wrapT(t) * FPS) % FR, SM = 7; let cx = 0, cy = 0, lz = 0, w = 0; for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) }, ex = Math.max(1 - smooth(wrapT(t), 0.1, 0.5), smooth(wrapT(t), END - 0.5, END - 0.05)); if (ex <= 0) return s; return { cx: lerp(s.cx, FULL.cx, ex), cy: lerp(s.cy, FULL.cy, ex), z: Math.exp(lerp(Math.log(s.z), Math.log(FULL.z), ex)) }; }

// ---------------------------------------------------------------- under the maze: the lives, then the cabinet's control panel to the bottom edge
function drawCabinet(c, cam, t) {
  // lives (two little Pac-Men) at the bottom left of the game screen
  for (let i = 0; i < 2; i++) { const a = i === 1 ? 1 - smooth(t, DEATH[0], DEATH[1]) * (t < BACK[0] ? 1 : 0) : 1; drawPac(c, cam, 1.6 + i * 1.6, MH + 0.55, Math.PI, 0.45, a, 0.55); }
  const [, Y0] = toS(cam, 0, MH + 1.6); if (Y0 >= GH) return; const y0 = Math.max(0, Math.round(Y0));
  // the bezel edge, then a control panel in deep violet with a joystick and two buttons (our own drawing)
  c.rect(0, y0, GW, 4, "#2A1F40"); c.rect(0, y0 + 4, GW, 2, "#6E4FB0");
  for (let y = y0 + 6; y < GH; y++) { const k = Math.min(1, (y - y0) / 220), q = Math.floor(k * 4 + bayer(3, y)) / 4; c.rect(0, y, GW, 1, mix("#2A1F48", "#120C22", q)); }
  const [jx] = toS(cam, 6, 0), jy = y0 + 120; if (jy < GH + 60) { c.rect(Math.round(jx) - 34, jy + 18, 68, 12, "#0B0812"); c.rect(Math.round(jx) - 4, jy - 30, 8, 50, "#1A1A22"); c.disc(Math.round(jx), jy - 36, 16, "#E03056"); c.disc(Math.round(jx) - 5, jy - 41, 5, "#FF8FA0"); }
  const [bx] = toS(cam, 14, 0); for (let i = 0; i < 2; i++) { const X = Math.round(bx + i * 60), Y = jy + 4; c.disc(X, Y + 3, 18, "#0B0812"); c.disc(X, Y, 18, i ? "#F4CA50" : "#45E3FF"); c.disc(X - 5, Y - 5, 5, "#FFFFFF"); }
}

// ---------------------------------------------------------------- the fruit row (our own little fruit), under the maze on the right
function fruitIcon(c, X, Y, s, kind, a) {
  const f = fade(c, a), d = (cx, cy, r, col) => { for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r) f.px(R(X + cx * s) + i, R(Y + cy * s) + j, col); };
  if (kind === 0) { d(-0.18, 0.15, s * 0.2, "#E8344E"); d(0.18, 0.2, s * 0.2, "#E8344E"); f.line(R(X - 0.15 * s), R(Y), R(X + 0.2 * s), R(Y - 0.3 * s), "#8A5A2A"); f.line(R(X + 0.18 * s), R(Y + 0.05 * s), R(X + 0.2 * s), R(Y - 0.3 * s), "#8A5A2A"); }
  else if (kind === 1) { d(0, 0.08, s * 0.28, "#E8344E"); for (let k = 0; k < 4; k++) f.px(R(X + (k % 2 ? 0.1 : -0.1) * s), R(Y + (k < 2 ? 0 : 0.18) * s), "#FDFEED"); f.rect(R(X - 0.15 * s), R(Y - 0.25 * s), R(0.3 * s), Math.max(1, R(0.08 * s)), "#65DA41"); }
  else if (kind === 2) { d(0, 0.06, s * 0.28, "#FFA638"); f.rect(R(X), R(Y - 0.3 * s), Math.max(1, R(0.12 * s)), Math.max(1, R(0.1 * s)), "#65DA41"); }
  else if (kind === 3) { d(0, 0.06, s * 0.28, "#E03056"); f.rect(R(X - 0.02 * s), R(Y - 0.3 * s), Math.max(1, R(0.06 * s)), Math.max(1, R(0.12 * s)), "#8A5A2A"); }
  else { d(0, 0.06, s * 0.3, "#65DA41"); for (let k = -1; k <= 1; k++) f.line(R(X + k * 0.12 * s), R(Y - 0.15 * s), R(X + k * 0.12 * s), R(Y + 0.25 * s), "#2E8A3A"); }
}
const FRUIT_LEVELS = [0, 1, 2, 2, 3, 3, 4];                          // levels 1..7: cherry, strawberry, orange ×2, apple ×2, melon
function fruitRow(c, cam, t) {
  const a = win(t, EV.each - 0.2, EV.on256 + 0.6, 0.3, 0.4); if (a <= 0) return;
  for (let i = 0; i < 7; i++) { const k = smooth(t, EV.draws + i * 0.18, EV.draws + i * 0.18 + 0.15) * a; if (k <= 0) continue; const [X, Y] = toS(cam, MW - 1.5 - i * 1.5, MH + 0.9); fruitIcon(c, X, Y, cam.z * 1.1, FRUIT_LEVELS[i], k); }
  const lab = win(t, EV.fruit - 0.1, EV.on256 + 0.6, 0.25, 0.4); if (lab > 0) { const [X, Y] = toS(cam, MW - 6, MH + 2.2); stext(c, MAIN, "FRUIT ROW", X, Y, 2, P.y, { align: 0.5, alpha: lab }); }
  const plus = win(t, EV.adds - 0.1, EV.on256 + 0.6, 0.25, 0.4); if (plus > 0) tag(c, ["LEVEL + 1"], 270, 70, plus, P.gr, 4);
}

// ---------------------------------------------------------------- the byte
function bits(c, x, y, v, a, { cell = 50, carry = -1, prev = null, k = 1 } = {}) {
  // a change of value dissolves (the old bits under the new ones), never a one-frame flip
  const one = (X, b, al) => { const f = fade(c, al); f.rect(X, y, cell, cell, b ? P.y : "#2A2240"); f.rect(X + 3, y + 3, cell - 6, cell - 6, b ? "#FFE58A" : "#1A1430"); stext(c, MAIN, String(b), X + cell / 2, y + cell / 2 - 10, 3, b ? "#3A2A08" : P.l, { align: 0.5, alpha: al }); };
  for (let i = 0; i < 8; i++) { const X = x + i * (cell + 4), b = (v >> (7 - i)) & 1;
    if (prev != null && k < 1) { const pb = (prev >> (7 - i)) & 1; one(X, pb, a); if (pb !== b) one(X, b, a * k); else one(X, b, a); } else one(X, b, a);
    if (i === carry) fade(c, a).frame(X - 2, y - 2, cell + 4, cell + 4, P.gr); }
}
function bytePanel(c, t) {
  const a = win(t, EV.keeps - 0.2, EV.fitsEnd + 0.1, 0.3, 0.35); if (a <= 0) return;
  panel(c, 26, 70, 488, 330, a, P.y); stext(c, MAIN, "THE LEVEL NUMBER = 1 BYTE", 270, 88, 2, P.y, { align: 0.5, alpha: a });
  // 0 to 255: the value steps up (never faster than a few times a second)
  const seqv = [0, 1, 2, 3, 7, 15, 31, 63, 127, 255], evs = [[-99, 0]];
  seqv.forEach((q, i) => { if (i) evs.push([EV.from0 - 0.1 + i * 0.17, q]); }); evs.push([EV.stored - 0.1, 0], [EV.so + 0.3, 255]);
  let j = 0; while (j < evs.length - 1 && evs[j + 1][0] <= t) j++; const v = evs[j][1], pv = j ? evs[j - 1][1] : v, kk = clamp01((t - evs[j][0]) / 0.15);
  bits(c, 54, 140, v, a, { prev: pv, k: kk }); if (kk < 1) stext(c, MAIN, String(pv), 270, 214, 5, P.iv, { align: 0.5, alpha: a * (1 - kk) }); stext(c, MAIN, String(v), 270, 214, 5, P.iv, { align: 0.5, alpha: a * kk });
  const r1 = win(t, EV.tiny - 0.1, EV.stored - 0.2, 0.25, 0.3); if (r1 > 0) stext(c, MAIN, "A TINY BOX: 0 TO 255", 270, 290, 2, P.l, { align: 0.5, alpha: a * r1 });
  const r2 = win(t, EV.stored - 0.1, EV.fitsEnd + 0.1, 0.25, 0.3); if (r2 > 0) stext(c, MAIN, "LEVEL 1  =  0", 270, 290, 3, P.cy, { align: 0.5, alpha: a * r2 * (1 - smooth(t, EV.so, EV.so + 0.25)) });
  const r3 = smooth(t, EV.l256b - 0.1, EV.l256b + 0.2) * a; if (r3 > 0) stext(c, MAIN, "LEVEL 256  =  255", 270, 290, 3, RED, { align: 0.5, alpha: r3 });
  const r4 = smooth(t, EV.biggest - 0.1, EV.biggest + 0.2) * a; if (r4 > 0) tag(c, ["THE BIGGEST", "NUMBER THAT FITS"], 270, 334, r4, P.gr, 2);
}
// 255 + 1: the carry runs right to left, every bit flips to 0, the ninth bit falls out of the box
function overflowPanel(c, t) {
  const a = win(t, EV.gives - 0.2, EV.zeroEnd + 0.1, 0.3, 0.35); if (a <= 0) return;
  panel(c, 26, 70, 488, 360, a, RED); stext(c, MAIN, "255 + 1 IN ONE BYTE", 270, 88, 2, RED, { align: 0.5, alpha: a });
  const c0 = EV.oneB - 0.1, c1 = EV.byteB + 0.2, k = clamp01((t - c0) / (c1 - c0)), flipped = Math.floor(k * 8.999);
  let v = 255; for (let i = 0; i < flipped; i++) v &= ~(1 << i); const pv = v | (flipped > 0 ? 1 << (flipped - 1) : 0), kk = clamp01((k * 8.999 - flipped) / 0.6);
  bits(c, 54, 150, v, a, { carry: k > 0 && k < 1 ? 7 - Math.min(7, flipped) : -1, prev: pv, k: kk });
  stext(c, MAIN, "+ 1", 470, 220, 3, P.gr, { align: 0.5, alpha: a * smooth(t, EV.plus - 0.1, EV.plus + 0.2) * (1 - smooth(t, c0, c0 + 0.3)) });
  // the ninth bit: appears left of the box when the carry leaves bit 7, then falls and fades
  const nb = smooth(t, c1 - 0.15, c1), fall = ease((t - c1) / 0.9); if (nb > 0) { const y = 150 + fall * 140, f = fade(c, a * nb * (1 - smooth(t, c1 + 0.6, c1 + 0.9))); f.rect(4, R(y), 40, 40, P.y); stext(c, MAIN, "1", 24, R(y) + 10, 3, "#3A2A08", { align: 0.5, alpha: a * nb * (1 - smooth(t, c1 + 0.6, c1 + 0.9)) }); }
  const z = smooth(t, EV.zero - 0.1, EV.zero + 0.2) * a; if (z > 0) stamp(c, "= 0", 270, 300, z, RED, 5, z);
}
// the fruit loop: the counter starts at 0, steps below zero to 255 and runs 256 times instead of at most 7
function loopPanel(c, t) {
  const a = win(t, EV.counter - 0.2, EV.mostEnd + 0.1, 0.3, 0.35); if (a <= 0) return;
  panel(c, 26, 70, 488, 330, a, P.cy); stext(c, MAIN, "THE FRUIT LOOP", 270, 88, 2, P.cy, { align: 0.5, alpha: a });
  const run = clamp01((t - EV.runs) / (EV.instead - EV.runs)), passes = Math.floor(run * 256), counter = t < EV.runs ? 0 : (256 - passes) % 256;
  stext(c, MAIN, "COUNTER", 140, 140, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, String(counter), 140, 170, 5, P.iv, { align: 0.5, alpha: a });
  stext(c, MAIN, "PASSES", 400, 140, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, String(passes), 400, 170, 5, passes > 7 ? RED : P.iv, { align: 0.5, alpha: a * smooth(t, EV.runs - 0.1, EV.runs + 0.2) });
  // a bar of passes: the first 7 (what it should be) in green, the rest in red
  const g = fade(c, a), bx = 50, by = 260, bw = 440; for (let i = 0; i < passes; i++) g.rect(R(bx + (i / 256) * bw), by, Math.max(1, R(bw / 256)), 30, i < 7 ? P.gr : RED);
  g.frame(bx - 2, by - 2, bw + 4, 34, P.l);
  const s7 = smooth(t, EV.seven - 0.1, EV.seven + 0.2) * a; if (s7 > 0) { stext(c, MAIN, "256 TIMES", 160, 320, 3, RED, { align: 0.5, alpha: s7 }); stext(c, MAIN, "NOT 7", 400, 320, 3, P.gr, { align: 0.5, alpha: s7 }); }
}
function dotsPanel(c, t) {
  const a = win(t, EV.need - 0.2, EV.most2End + 0.1, 0.3, 0.35); if (a <= 0) return;
  panel(c, 26, 70, 488, 280, a, P.y); const g = fade(c, a), bw = 360;
  stext(c, MAIN, "DOTS TO FINISH", 52, 98, 2, P.l, { alpha: a }); g.rect(52, 124, bw, 34, "#2A2240"); g.rect(52, 124, R(bw * smooth(t, EV.n244 - 0.1, EV.n244 + 0.5)), 34, P.gr); stext(c, MAIN, "244", 430, 130, 3, P.gr, { alpha: a * smooth(t, EV.n244, EV.n244 + 0.2) });
  const m = smooth(t, EV.here - 0.1, EV.n168 + 0.4); stext(c, MAIN, "MOST YOU CAN EAT HERE", 52, 190, 2, P.l, { alpha: a * smooth(t, EV.here - 0.1, EV.here + 0.2) }); g.rect(52, 216, bw, 34, "#2A2240"); g.rect(52, 216, R(bw * (168 / 244) * m), 34, P.y);
  stext(c, MAIN, String(Math.round(168 * m)), 430, 222, 3, P.y, { alpha: a * smooth(t, EV.here, EV.here + 0.2) });
  const x = smooth(t, EV.most2 - 0.1, EV.most2 + 0.2) * a; if (x > 0) stamp(c, "CAN'T WIN", 270, 300, x, RED, 3, x);
}
function scorePanel(c, t) {
  const a = win(t, EV.highest - 0.2, EV.hoursEnd + 0.1, 0.3, 0.35); if (a <= 0) return;
  panel(c, 26, 70, 488, 300, a, P.y);
  stext(c, MAIN, "HIGHEST POSSIBLE SCORE", 270, 92, 2, P.l, { align: 0.5, alpha: a });
  const k = ease((t - EV.score) / (EV.n3m + 1.2 - EV.score)), v = Math.round(3333360 * clamp01(k)), s = v.toLocaleString("en-US");
  stext(c, MAIN, s, 270, 130, 5, P.y, { align: 0.5, alpha: a * smooth(t, EV.score - 0.1, EV.score + 0.2) });
  const p = win(t, EV.first - 0.1, EV.hoursEnd + 0.1, 0.3, 0.35) * a;
  if (p > 0) { stext(c, MAIN, "FIRST PERFECT GAME", 270, 210, 2, P.iv, { align: 0.5, alpha: p }); stext(c, MAIN, "1999", 160, 250, 4, P.cy, { align: 0.5, alpha: p * smooth(t, EV.y1999 - 0.1, EV.y1999 + 0.2) });
    // a little clock: the hand turns as the hours add up
    const h = smooth(t, EV.took, EV.hours + 0.3), cx = 360, cy = 270, r = 30, g = fade(c, p); for (let i = 0; i < 40; i++) { const an = (i / 40) * 2 * Math.PI; g.rect(R(cx + Math.cos(an) * r) - 1, R(cy + Math.sin(an) * r) - 1, 2, 2, P.l); }
    const an = -Math.PI / 2 + h * 6 * 2 * Math.PI / 12; g.line(cx, cy, R(cx + Math.cos(an) * r * 0.7), R(cy + Math.sin(an) * r * 0.7), P.y); g.disc(cx, cy, 2, P.y);
    stext(c, MAIN, "~6 HOURS", 440, 258, 2, P.y, { align: 0.5, alpha: p * smooth(t, EV.six - 0.1, EV.six + 0.2) }); }
}

// ---------------------------------------------------------------- story tags over the maze
function story(c, cam, t) {
  tag(c, ["LEVEL 256"], 270, 40, winW(t, EV.ending - 0.3, EV.yet - 0.2, 0.3, 0.35), RED, 4);
  tag(c, ["NO LAST LEVEL"], 270, 40, win(t, EV.no - 0.1, EV.yet - 0.25, 0.25, 0.3) * 0, P.iv, 3);
  { const a = win(t, EV.l256 - 0.1, EV.halfEnd, 0.25, 0.35); tag(c, ["LEVEL 256"], 270, 40, a, RED, 4); const b = win(t, EV.breaks - 0.1, EV.halfEnd, 0.25, 0.35); if (b > 0) { const [x0, y0] = toS(cam, GX0, 0), [, y1] = toS(cam, GX0, MH); const g = fade(c, b); for (let y = R(y0); y < R(y1); y += 6) g.rect(R(x0) - 1, y, 3, 3, P.y); tag(c, ["BROKEN IN HALF"], 270, 104, b, P.y, 3); } }
  { const a = win(t, EV.letters - 0.1, EV.mazeEnd, 0.25, 0.35); tag(c, [t < EV.numbers ? "LETTERS" : t < EV.broken ? "LETTERS · NUMBERS" : "LETTERS · NUMBERS · SYMBOLS"], 270, 40, a, P.or, 2); }
  { const a = win(t, EV.walls - 0.1, EV.missingEnd, 0.25, 0.35); tag(c, ["WALLS DON'T WORK"], 270, 40, a * (1 - smooth(t, EV.dots - 0.1, EV.dots + 0.1)), P.or, 3); tag(c, ["MOST DOTS MISSING"], 270, 40, a * smooth(t, EV.dots - 0.1, EV.dots + 0.1), P.or, 3); }
  { const a = win(t, EV.over - 0.1, EV.overEnd + 0.5, 0.2, 0.35); if (a > 0) stamp(c, "GAME OVER", 270, 300, a, RED, 4, smooth(t, EV.over - 0.1, EV.over + 0.1)); }
  { const a = win(t, EV.ending - 0.1, EV.funny - 0.1, 0.25, 0.35); tag(c, ["THE ONLY ENDING:", "A BUG"], 270, 100, a, P.y, 3); }
}

// ---------------------------------------------------------------- captions (karaoke)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END - 0.17; });
function captions(c, t) {
  for (const g of GROUPS) {
    const first = g === GROUPS[0], show = first ? 0 : g.show, hide = g.hide;
    if (t < show || t > hide + 0.16) continue;
    const a = Math.min(smooth(t, show, show + (first ? 0.15 : 0.18)), 1 - smooth(t, hide, hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
      c.text(MAIN, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : P.y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  t = wrapT(t);
  const c = new Canvas(GW, GH, K), cam = camera(t);
  drawMaze(c, cam, t, dotState);
  drawGarbage(c, cam, t);
  // the ghosts at home (bobbing); Pink glides straight through the broken walls on the right
  const bob = (k) => 0.12 * Math.sin(t * 3 + k);
  const pinkGlide = clamp01((t - (EV.walls - 0.2)) / (EV.missing - EV.walls + 0.2)), pinkOut = win(t, EV.walls - 0.4, EV.missing + 0.1, 0.3, 0.35);
  drawGhost(c, cam, 9.5, 10.5 + bob(0), "blue", [1, 0], t * 2, 1); drawGhost(c, cam, 11.5, 10.5 + bob(1), "orange", [-1, 0], t * 2 + 0.3, 1);
  drawGhost(c, cam, 10.5, 10.5 + bob(2), "pink", [0, -1], t * 2 + 0.6, 1 - pinkOut);
  if (pinkOut > 0) drawGhost(c, cam, 14.5, lerp(1.5, 12.5, ease(pinkGlide)), "pink", [0, 1], t * 2, pinkOut);
  // the red ghost on Pac-Man's ring, and Pac-Man (dies on "catch you", comes back before the seam)
  { const r = redPos(t), ra = redAlpha(t); if (ra > 0) drawGhost(c, cam, r.x, r.y, "red", r.dir, t * 2.2, ra); }
  { const p = ringAt(pacS(t)), pa = pacAlpha(t), ang = Math.atan2(p.dir[1], p.dir[0]);
    if (t >= DEATH[0] && t < DEATH[1]) { const k = (t - DEATH[0]) / (DEATH[1] - DEATH[0]), pc = ringAt(pacS(CATCH)); drawPac(c, cam, pc.x, pc.y, -Math.PI / 2, Math.min(1, 0.4 + k), 1 - smooth(k, 0.75, 1)); }
    else if (pa > 0) drawPac(c, cam, p.x, p.y, ang, 0.5 - 0.5 * Math.cos(2 * Math.PI * pacS(t)), pa); }
  drawCabinet(c, cam, t);
  fruitRow(c, cam, t);
  const dim = Math.max(win(t, EV.keeps - 0.2, EV.fitsEnd + 0.1, 0.3, 0.35), win(t, EV.gives - 0.2, EV.zeroEnd + 0.1, 0.3, 0.35), win(t, EV.counter - 0.2, EV.mostEnd + 0.1, 0.3, 0.35), win(t, EV.need - 0.2, EV.most2End + 0.1, 0.3, 0.35), win(t, EV.highest - 0.2, EV.hoursEnd + 0.1, 0.3, 0.35));
  if (dim > 0) c.tint(0, 0, GW, GH, () => dim * 0.6, "#05030C", 5);
  story(c, cam, t);
  bytePanel(c, t); overflowPanel(c, t); loopPanel(c, t); dotsPanel(c, t); scorePanel(c, t);
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
export { GT as GARBAGE, G_A, G_B, CATCH, DEATH, BACK, pacS, ringAt };
