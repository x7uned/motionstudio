// «A chatbot built inside Minecraft» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture runs to every edge; karaoke captions sit on a soft dithered shade. One block world for the
// whole film: the wide shot of the chatbot build (six layer halls, the lamp screen, the keyboard) → its redstone → the
// screen (tokens) → the ROM roofs (numbers as blocks, one byte) → the keyboard → the embedding panel → the six layers →
// the picker → the screen → render distance → speed → nonsense → the new question → the first frame.
// Safe zones v1: every tag and panel stays in x 36–504 (above y 400) / 36–440 (below), y ≥ 152 of the 540×960 grid.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "./ui.mjs";
import { tag, panel, pointer } from "./hud.mjs";
import { RS, GROUND, GRP, SCREEN, EMBED, HALLS, KEYS, keyOf, B, BYTE, bitAt, HALL_H, FRONT_Z, BUILD_LEN, PLAYER, RENDER_DIST, outsideColor, chunkVis } from "./world.mjs";
import { makeState, renderIso, isoProject, avgColor } from "./voxel.mjs";
import { paintDust, drawParts, setLoop } from "./redstone.mjs";
import { drawPerson } from "./actors.mjs";
import { SIG, lampLevel, romAlpha, hero, camera, smooth, ease, lerp, win, clamp01, J, HALL_T, NONSENSE } from "./scene.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000";
const TOP = 156, ZX0 = 36, ZX1 = 504;                 // safe zone (grid px)
setLoop(END);
const S = makeState(RS), DEPTH = new Float32Array(GW * GH);
S.hit = { x: new Float32Array(GW * GH), y: new Float32Array(GW * GH), z: new Float32Array(GW * GH), ax: new Uint8Array(GW * GH), ty: new Uint8Array(GW * GH) };
{ const G = avgColor(B.GRASS, 0), L = avgColor(B.LEAVES, 0).map((v) => v * 1.05), LD = avgColor(B.LEAVES, 0).map((v) => v * 0.55);
  S.outsideY = GROUND + 1; S.outside = (out, wx, wz, bs, X, Y) => outsideColor(out, wx, wz, bs, X, Y, G, L, LD); }
S.fog = chunkVis;
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));
const T = (lines, cx, y, a, col, ps = 3) => tag(c0, lines, cx, y, a, col, ps, { minX: ZX0, maxX: y > 400 ? 440 : ZX1 });
let c0 = null;

// ---------------------------------------------------------------- world
function world(c, t) {
  S.grpA[GRP.ROM] = romAlpha(t);
  S.t = t; S.lamp = (x, y, z) => lampLevel(x, y, z, t);
  const cam = camera(t);
  renderIso(c, [0, 0, GW, GH], cam, S, DEPTH);
  paintDust(c, S, SIG, t);
  drawParts(c, cam, DEPTH, S, SIG, t, () => 0);
  keyLetters(c, cam, t);
  const h = hero(t); if (cam.b > 2.5) drawPerson(c, cam, "hero", h, DEPTH);
  return cam;
}
const at = (cam, x, y, z) => isoProject(cam, GW, GH, x, y, z);
// letters on the key caps (a decal on the top face, hidden where something stands in front)
function keyLetters(c, cam, t) {
  if (cam.b < 4) return; const ps = Math.max(1, R(cam.b / 5)), a = smooth(cam.b, 4, 5.5);
  for (const k of KEYS) {
    const cx = k.x + k.w / 2, cz = k.z + 1, [sx, sy] = at(cam, cx, GROUND + 2, cz); if (sx < -20 || sx > GW + 20 || sy < -20 || sy > GH + 20) continue;
    const X = R(sx), Y = R(sy); if (X >= 0 && Y >= 0 && X < GW && Y < GH && DEPTH[Y * GW + X] > cx + GROUND + 2 + cz + 0.6) continue;
    const label = k.ch === "SPACE" ? "" : k.ch, lit = lampLevel(k.x, GROUND + 1, k.z, t);
    if (label) stext(c, MAIN, label, sx, sy - (k.ch === "ENTER" ? 4 : 5) * ps * 0.9, k.ch === "ENTER" ? Math.max(1, ps - 1) : ps, lit > 0.5 ? "#8A4A10" : "#3A3A46", { align: 0.5, alpha: a });
  }
}

// ---------------------------------------------------------------- small pictures
function hourglass(c, cx, cy, s, a, t) {
  if (a <= 0) return; const g = fade(c, a), w = 9 * s, h = 14 * s, x = R(cx - w / 2), y = R(cy - h / 2);
  g.rect(x - s, y - s, w + 2 * s, s * 2, P.l); g.rect(x - s, y + h - s, w + 2 * s, s * 2, P.l);
  for (let j = 0; j < h - 2 * s; j++) { const yy = y + s + j, k = Math.abs(j - (h - 2 * s) / 2) / ((h - 2 * s) / 2), half = Math.max(s * 0.6, (w / 2) * k);
    g.rect(R(cx - half), yy, R(half * 2), 1, "#2A2238");
    const sandTop = j < (h - 2 * s) / 2 && j > (h - 2 * s) * 0.18, sandBot = j > (h - 2 * s) * 0.78; if (sandTop || sandBot) g.rect(R(cx - half + 1), yy, R(half * 2 - 2), 1, P.y); }
  const fl = (t * 6) % 1; for (let k = 0; k < 3; k++) { const yy = R(cy - s + ((k / 3 + fl) % 1) * 5 * s); g.rect(R(cx) - 1, yy, 2, s, P.y); }
}
function cmdBlock(c, x, y, s, a) {     // our own icon: an orange cube with a "> _" prompt on its face
  if (a <= 0) return; const g = fade(c, a), w = 16 * s;
  g.poly([[x, y + 4 * s], [x + w / 2, y], [x + w, y + 4 * s], [x + w / 2, y + 8 * s]], "#F0A050");
  g.poly([[x, y + 4 * s], [x + w / 2, y + 8 * s], [x + w / 2, y + 20 * s], [x, y + 16 * s]], "#C86A28");
  g.poly([[x + w / 2, y + 8 * s], [x + w, y + 4 * s], [x + w, y + 16 * s], [x + w / 2, y + 20 * s]], "#9A4A18");
  stext(c, MAIN, ">_", x + 2 * s, y + 9 * s, s, "#3A1A08", { alpha: a });
}
function cross(c, x, y, w, h, a, k) { if (a <= 0 || k <= 0) return; const g = fade(c, a); for (let d = -2; d <= 2; d++) { g.line(R(x) + d, R(y), R(x + w * k) + d, R(y + h * k), P.pk); if (k > 0.5) { const k2 = (k - 0.5) * 2; g.line(R(x + w) + d, R(y), R(x + w - w * k2) + d, R(y + h * k2), P.pk); } } }
function pcIcon(c, x, y, s, a, t) {
  if (a <= 0) return; const g = fade(c, a);
  g.rrect(R(x), R(y), 34 * s, 24 * s, "#3B2C5C", 2); g.rect(R(x + 2 * s), R(y + 2 * s), 30 * s, 18 * s, "#0E1A2C");
  for (let k = 0; k < 4; k++) { const yy = y + 4 * s + ((k * 5 + (t * 4) % 5) % 18) * s; if (yy < y + 18 * s) for (let q = 0; q < 4; q++) g.rect(R(x + 4 * s + q * 7 * s), R(yy), R((3 + (k + q) % 3) * s), s, q % 2 ? P.cy : P.gr); }
  g.rect(R(x + 13 * s), R(y + 24 * s), 8 * s, 3 * s, "#3B2C5C"); g.rect(R(x + 8 * s), R(y + 27 * s), 18 * s, 2 * s, "#3B2C5C");
}
function clock20(c, cx, cy, r, a, t) {
  if (a <= 0) return; const g = fade(c, a), u = Math.max(0, t - EV.twenty + 0.1), f = u - Math.floor(u);
  for (let i = 0; i < 20; i++) { const an = -Math.PI / 2 + (i / 20) * 2 * Math.PI, lit = (i + 1) / 20 <= f + 0.0001 || u >= 0 && f < 0.05 && i === 19 ? 1 : 0; g.disc(R(cx + Math.cos(an) * r), R(cy + Math.sin(an) * r), 2, lit ? P.y : "#3B2C5C"); }
  const an = -Math.PI / 2 + f * 2 * Math.PI; g.line(R(cx), R(cy), R(cx + Math.cos(an) * r * 0.7), R(cy + Math.sin(an) * r * 0.7), P.y); g.disc(R(cx), R(cy), 2, P.y);
}
function loopArrow(c, cx, cy, r, a, t, col) { if (a <= 0) return; const g = fade(c, a), sp = t * 2.5; for (let i = 0; i < 28; i++) { const an = sp + (i / 32) * 2 * Math.PI; g.disc(R(cx + Math.cos(an) * r), R(cy + Math.sin(an) * r), 1, col); } const an = sp + (28 / 32) * 2 * Math.PI, hx = cx + Math.cos(an) * r, hy = cy + Math.sin(an) * r, tx = -Math.sin(an), ty = Math.cos(an); g.poly([[hx + tx * 6, hy + ty * 6], [hx - ty * 5, hy + tx * 5], [hx + ty * 5, hy - tx * 5]], col); }
// a chip with a token's text (screen space)
function chip(c, txt, x, y, a, col = P.cy, ps = 2) { if (a <= 0) return null; const w = textW(MAIN, txt, ps) + 12, h = 9 * ps + 6, g = fade(c, a); g.rrect(R(x - w / 2), R(y - h / 2), w, h, col, 2); g.rrect(R(x - w / 2) + 2, R(y - h / 2) + 2, w - 4, h - 4, P.card, 1); stext(c, MAIN, txt, x, R(y - h / 2) + 3, ps, col, { align: 0.5, alpha: a }); return { x: x - w / 2, y: y - h / 2, w, h }; }

// ---------------------------------------------------------------- story overlays
function story(c, cam, t) {
  c0 = c;
  // the seam tag (across the loop seam) and the two hours
  { const a = winW(t, EV.because - 0.15, EV.hours0End + 0.1, 0.35, 0.45); T(["A CHATBOT", "BUILT IN MINECRAFT"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.one0 - 0.1, EV.hours0End + 0.25, 0.3, 0.35); if (a > 0) { panel(c, 150, TOP + 76, 240, 92, a, P.cy); hourglass(c, 186, TOP + 122, 3, a, t); stext(c, MAIN, "1 ANSWER", 300, TOP + 92, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "2 HOURS", 300, TOP + 120, 3, P.y, { align: 0.5, alpha: smooth(t, EV.two0 - 0.05, EV.two0 + 0.2) * a }); } }
  // sammyuri, redstone, no command blocks
  { const a = win(t, EV.player - 0.1, EV.blocks0End + 0.1, 0.3, 0.35); T(["SAMMYURI · 2025"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.redstone - 0.1, EV.blocks0End + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, HALLS[5].x0 + 21, GROUND + HALL_H + 1, FRONT_Z - 24); const b = T(["ONLY REDSTONE"], R(x) - 40, R(y) + 60, a, P.pk, 2); if (b) pointer(c, b.x + b.w / 2, b.y, x, y + 2, a, P.pk); } }
  { const a = win(t, EV.no - 0.1, EV.blocks0End + 0.15, 0.3, 0.35); if (a > 0) { panel(c, 150, TOP + 60, 240, 104, a, P.or); cmdBlock(c, 178, TOP + 72, 2.2, a); cross(c, 174, TOP + 74, 40, 44, a, smooth(t, EV.command - 0.05, EV.command + 0.3)); stext(c, MAIN, "NO", 310, TOP + 82, 3, P.pk, { align: 0.5, alpha: a }); stext(c, MAIN, "COMMAND", 310, TOP + 112, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "BLOCKS", 310, TOP + 132, 2, P.l, { align: 0.5, alpha: a }); } }
  // not sentences: tokens
  { const a = win(t, EV.doesnt - 0.1, EV.sentencesEnd + 0.05, 0.3, 0.35); T(["IT DOESN'T THINK", "IN SENTENCES"], 270, TOP, a, P.l, 3); }
  { const a = win(t, EV.next - 0.05, EV.wordEnd + 0.05, 0.3, 0.35); T(["NEXT TOKEN?"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.small - 0.1, EV.wordEnd + 0.1, 0.3, 0.35); if (a > 0) { const sp = ease((t - EV.piece) / 0.45), y = TOP + 92;
      panel(c, 120, TOP + 64, 300, 92, a, P.cy);
      chip(c, "MINE", 270 - 34 - 18 * sp, y, a, P.cy, 3); chip(c, "CRAFT", 270 + 42 + 18 * sp, y, a, P.cy, 3); stext(c, MAIN, "= 2 TOKENS", 270, y + 30, 2, P.l, { align: 0.5, alpha: a * smooth(t, EV.piece + 0.2, EV.piece + 0.5) }); } }
  // guesses, again and again
  { const a = win(t, EV.then - 0.15, EV.again2End - 0.1, 0.3, 0.35); if (a > 0) { panel(c, 160, TOP, 220, 112, a, P.y); stext(c, MAIN, "NEXT TOKEN", 270, TOP + 10, 2, P.l, { align: 0.5, alpha: a });
      [["I", EV.then], ["AM", EV.again1], ["...", EV.again2]].forEach(([w, ev], i) => { const k = smooth(t, ev - 0.08, ev + 0.18) * a; stext(c, MAIN, (i ? "> " : "> ") + w, 200, TOP + 34 + i * 24, 2, i < 2 ? P.y : P.l, { alpha: k }); }); } }
  // five million numbers, learned outside, built as blocks
  { const a = win(t, EV.five1 - 0.1, EV.numbers1End + 0.1, 0.3, 0.35); T(["5,087,280 NUMBERS", "ABOUT 5 MILLION"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.learned - 0.15, EV.blocks2 - 0.1, 0.3, 0.35); if (a > 0) { panel(c, 140, TOP, 260, 118, a, P.cy); pcIcon(c, 158, TOP + 14, 2.4, a, t); stext(c, MAIN, "LEARNED", 330, TOP + 26, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "ON A NORMAL", 330, TOP + 48, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "COMPUTER", 330, TOP + 70, 2, P.cy, { align: 0.5, alpha: a }); } }
  { const a = win(t, EV.built2 - 0.1, EV.blocks2End + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, (HALLS[5].x0 + HALLS[5].x1) / 2, GROUND + HALL_H + 2, FRONT_Z - 160); const b = T(["NUMBERS AS BLOCKS"], R(x), TOP + 150, a, P.y, 2); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, a, P.y); } }
  // one byte: eight on-off bits
  { const a = win(t, EV.eight - 0.15, EV.bitsEnd + 0.05, 0.3, 0.3);
    if (a > 0) { const bits = []; for (let i = 0; i < 8; i++) bits.push(bitAt(BYTE.x0 + i, BYTE.z));
      const p0 = at(cam, BYTE.x0, GROUND + HALL_H + 1, BYTE.z + 1), p1 = at(cam, BYTE.x0 + 8, GROUND + HALL_H + 1, BYTE.z + 1);
      bits.forEach((bt, i) => { const k = smooth(t, EV.eight + i * 0.07, EV.eight + 0.2 + i * 0.07) * a; const [x, y] = at(cam, BYTE.x0 + i + 0.5, GROUND + HALL_H + 3.2, BYTE.z + 0.5); stext(c, MAIN, String(bt), x, y - 20, 3, bt ? P.y : P.l, { align: 0.5, alpha: k, shadow: P.ink }); });
      { const Y = GROUND + HALL_H + 1, q = [[BYTE.x0, BYTE.z], [BYTE.x0 + 8, BYTE.z], [BYTE.x0 + 8, BYTE.z + 1], [BYTE.x0, BYTE.z + 1]].map(([x, z]) => at(cam, x - 0.1, Y, z)), g = fade(c, a * smooth(t, EV.eight - 0.1, EV.eight + 0.3));
        for (let i = 0; i < 4; i++) { const A = q[i], Bq = q[(i + 1) % 4]; for (let d = 0; d < 2; d++) g.line(R(A[0]), R(A[1]) + d, R(Bq[0]), R(Bq[1]) + d, P.y); } }
      T(["8 ON-OFF BITS", "= 1 NUMBER"], 270, TOP, a, P.y, 3);
      T([bits.join("") + " = " + parseInt(bits.join(""), 2)], 270, TOP + 82, smooth(t, EV.bits - 0.1, EV.bits + 0.2) * a, P.cy, 2); } }
  // you type: the token flies to the embedding panel; 240 numbers
  { const a = win(t, EV.you - 0.1, EV.question1End - 0.05, 0.25, 0.3); T(["YOU TYPE"], 270, TOP, a, P.l, 3); }
  { const k = (t - J.keys.a) / (J.keys.b - J.keys.a); const a = win(t, J.keys.a - 0.15, J.keys.b + 0.1, 0.2, 0.25);
    if (a > 0) { const s = ease(clamp01(k)) * 80, wp = s <= 68 ? [s - 5, GROUND + 1.2, -27 + 0.5] : [63 + 0.5, GROUND + 1.2, -27 - (s - 68)]; const [x, y] = at(cam, wp[0], wp[1], wp[2]); chip(c, "HOW", Math.max(70, Math.min(440, x)), Math.max(TOP + 20, y - 40), a, P.cy, 2); } }
  { const a = win(t, EV.list1 - 0.1, EV.numbers3End + 0.1, 0.3, 0.35); if (a > 0) { T(["1 TOKEN ="], 270, TOP, a, P.cy, 3); const [x, y] = at(cam, (EMBED.x0 + EMBED.x1) / 2, EMBED.y1 + 1, EMBED.z + 1);
      const b = T(["240 NUMBERS"], 270, TOP + 64, smooth(t, EV.twoH - 0.1, EV.twoH + 0.25) * a, P.y, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, smooth(t, EV.twoH - 0.1, EV.twoH + 0.25) * a, P.y); } }
  // six layers, multiplications
  { const a = win(t, EV.six - 0.1, EV.token3End + 0.1, 0.3, 0.35); T(["6 LAYERS"], 270, TOP, a, P.y, 3); }
  { HALLS.forEach((H, k) => { const a = win(t, HALL_T[k] - 0.05, HALL_T[k] + 0.75, 0.15, 0.25); if (a <= 0) return; const [x, y] = at(cam, H.cx + 0.5, GROUND + 18, FRONT_Z + 1); if (x > 40 && x < 440) stext(c, MAIN, "LAYER " + (k + 1), x, y - 22, 2, P.y, { align: 0.5, alpha: a, shadow: P.ink }); }); }
  { const a = win(t, EV.thats - 0.1, EV.token3End + 0.05, 0.3, 0.35); if (a > 0) { panel(c, 120, TOP + 64, 300, 112, a, P.cy); stext(c, MAIN, "5,000,000", 270, TOP + 78, 4, P.cy, { align: 0.5, alpha: a }); stext(c, MAIN, "MULTIPLICATIONS", 270, TOP + 122, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "FOR 1 TOKEN", 270, TOP + 146, 2, P.y, { align: 0.5, alpha: smooth(t, EV.single - 0.1, EV.single + 0.2) * a }); } }
  // the picker: next token
  { const a = win(t, EV.end - 0.1, EV.prints + 0.25, 0.3, 0.35);
    if (a > 0) { panel(c, 130, TOP, 280, 150, a, P.y); stext(c, MAIN, "NEXT TOKEN?", 270, TOP + 10, 2, P.l, { align: 0.5, alpha: a });
      const ch = smooth(t, EV.picks - 0.05, EV.picks + 0.2);
      [["GOOD", 0.62], ["FINE", 0.24], ["SPOON", 0.03]].forEach(([w, p], i) => { const y = TOP + 40 + i * 32, k = smooth(t, EV.machine + i * 0.12, EV.machine + 0.25 + i * 0.12) * a, sel = i === 0 ? ch : 0;
        stext(c, MAIN, w, 150, y, 2, mix(P.l, P.y, sel), { alpha: k }); const g = fade(c, k); const bw = R(150 * p * smooth(t, EV.machine + i * 0.12, EV.machine + 0.5 + i * 0.12)) + 2; g.rect(240, y + 2, bw, 12, i === 0 ? mix(P.cy, P.y, sel) : P.p5);
        if (sel > 0) stext(c, MAIN, "<", 250 + bw, y, 2, P.y, { alpha: sel * a }); }); } }
  { const a = win(t, EV.prints - 0.1, EV.screen + 0.6, 0.25, 0.3); if (a > 0) { const [x, y] = at(cam, SCREEN.x0 + 9 + 6 * 8 + 12, SCREEN.y1 - 23, SCREEN.z + 1); const b = T(["+ GOOD"], R(x), TOP + 166, a, P.y, 3); if (b) pointer(c, b.x + b.w / 2, b.y, x, y, a, P.y); } }
  { const a = win(t, EV.starts - 0.1, EV.over1End + 0.05, 0.25, 0.35); if (a > 0) { panel(c, 170, TOP, 200, 70, a, P.cy); loopArrow(c, 206, TOP + 35, 16, a, t, P.cy); stext(c, MAIN, "AND", 300, TOP + 14, 2, P.l, { align: 0.5, alpha: a }); stext(c, MAIN, "AGAIN", 300, TOP + 36, 3, P.cy, { align: 0.5, alpha: a }); } }
  // 64 tokens
  { const a = win(t, EV.hold - 0.1, EV.once1End + 0.05, 0.3, 0.35); T(["64 TOKENS MAX"], 270, TOP, a, P.y, 3); T(["7 USED NOW"], 270, TOP + 62, smooth(t, EV.tokens - 0.1, EV.tokens + 0.2) * a, P.cy, 2);
    const u = smooth(t, EV.tokens - 0.1, EV.tokens + 0.2) * a; if (u > 0) { const [x, y] = at(cam, SCREEN.x0 + 8 + 10, SCREEN.y1 - 1 - 36, SCREEN.z + 1); pointer(c, 270, TOP + 62 + 26, x, y, u, P.cy); } }
  // the size: render distance
  { const a = win(t, EV.kilometer - 0.15, EV.once2End + 0.05, 0.3, 0.4);
    if (a > 0) { const x0 = HALLS[0].x0 - 3, p0 = at(cam, x0, GROUND + 1, FRONT_Z), p1 = at(cam, x0, GROUND + 1, FRONT_Z - BUILD_LEN), k = smooth(t, EV.kilometer - 0.1, EV.long + 0.2), g = fade(c, a);
      const ex = lerp(p0[0], p1[0], k), ey = lerp(p0[1], p1[1], k); g.line(R(p0[0]), R(p0[1]), R(ex), R(ey), P.y); g.line(R(p0[0]) + 1, R(p0[1]), R(ex) + 1, R(ey), P.y);
      for (const [px, py, on] of [[p0[0], p0[1], 1], [p1[0], p1[1], k >= 0.99 ? 1 : 0]]) if (on) { g.line(R(px - 6), R(py - 3), R(px + 6), R(py + 3), P.y); g.line(R(px - 6), R(py - 4), R(px + 6), R(py + 2), P.y); }
      // the rest of the build is still there, past the render distance: a dotted outline of its footprint in the fog
      { const o = smooth(t, EV.long - 0.2, EV.long + 0.4) * a; if (o > 0) { const g2 = fade(c, o * 0.85), xs = [HALLS[0].x0, SCREEN.x1 + 2], zs = [FRONT_Z, FRONT_Z - BUILD_LEN];
          const corners = [[xs[0], zs[0]], [xs[1], zs[0]], [xs[1], zs[1]], [xs[0], zs[1]]].map(([x, z]) => at(cam, x, GROUND + 1, z));
          for (let i = 0; i < 4; i++) { const A = corners[i], Bq = corners[(i + 1) % 4], n = Math.ceil(Math.hypot(Bq[0] - A[0], Bq[1] - A[1]) / 3); for (let j = 0; j < n; j += 2) { const u = j / n; g2.rect(R(lerp(A[0], Bq[0], u)), R(lerp(A[1], Bq[1], u)), 2, 1, P.p5); } } } }
      const lab = smooth(t, EV.long - 0.1, EV.long + 0.2) * a; T(["1,656 BLOCKS", "= 1.6 KM"], R(lerp(p0[0], p1[0], 0.5)) + 40, R(lerp(p0[1], p1[1], 0.5)) - 110, lab, P.y, 3);
      const fg = smooth(t, EV.tooBig - 0.1, EV.tooBig + 0.25) * a; T(["TOO BIG FOR THE GAME", "TO SHOW AT ONCE"], 270, TOP, fg, P.l, 2); } }
  // twenty steps a second; ten years; ×40,000; two hours
  { const a = win(t, EV.twenty - 0.15, EV.secondEnd + 0.1, 0.3, 0.35); if (a > 0) { panel(c, 140, TOP, 260, 118, a, P.y); clock20(c, 200, TOP + 59, 34, a, t); stext(c, MAIN, "20 TICKS", 320, TOP + 40, 2, P.y, { align: 0.5, alpha: a }); stext(c, MAIN, "/ SECOND", 320, TOP + 64, 2, P.l, { align: 0.5, alpha: a }); } }
  { const a = win(t, EV.one2 - 0.15, EV.hours2End + 0.15, 0.3, 0.4);
    if (a > 0) { panel(c, 80, TOP, 380, 206, a, P.l); stext(c, MAIN, "1 ANSWER", 270, TOP + 16, 3, P.iv, { align: 0.5, alpha: a });
      const y1 = smooth(t, EV.ten - 0.1, EV.ten + 0.2) * a, sp = smooth(t, EV.forty2 - 0.15, EV.forty2 + 0.2) * a, h2 = smooth(t, EV.two3 - 0.1, EV.two3 + 0.2) * a;
      stext(c, MAIN, "NORMAL SPEED:  10+ YEARS", 270, TOP + 66, 2, P.pk, { align: 0.5, alpha: y1 });
      if (sp > 0) { stext(c, MAIN, "SPECIAL SERVER ×40,000", 270, TOP + 106, 2, P.cy, { align: 0.5, alpha: sp }); for (let k = 0; k < 2; k++) { const x = 104 + k * 14 + ((t * 60) % 14); stext(c, MAIN, ">", x, TOP + 104, 2, P.cy, { alpha: sp * 0.7 }); } }
      stext(c, MAIN, "STILL 2 HOURS", 270, TOP + 150, 3, P.y, { align: 0.5, alpha: h2 }); } }
  // nonsense
  { const a = win(t, NONSENSE, EV.nonsenseEnd + 0.05, 0.3, 0.35); if (a > 0) { T(["SOMETIMES:"], 270, TOP, a, P.l, 2); T(["NONSENSE ?!"], 270, TOP + 40, smooth(t, EV.nonsense - 0.1, EV.nonsense + 0.2) * a, P.pk, 3); } }
  // the ending: type, enter, wait
  { const a = win(t, EV.type2 - 0.1, EV.press - 0.1, 0.25, 0.3); T(["YOUR QUESTION"], 270, TOP, a, P.l, 3); }
  { const a = win(t, EV.press - 0.15, EV.wait - 0.05, 0.25, 0.3); if (a > 0) { const k = keyOf("ENTER"), [x, y] = at(cam, k.x + 2, GROUND + 2, k.z + 1); const b = T(["ENTER"], R(x) + 20, TOP + 20, a, P.y, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, a, P.y); } }
  { const a = win(t, EV.wait - 0.1, EV.because - 0.2, 0.3, 0.3); if (a > 0) { panel(c, 190, TOP, 160, 96, a, P.cy); hourglass(c, 224, TOP + 48, 3, a, t); stext(c, MAIN, "WAIT", 300, TOP + 36, 3, P.cy, { align: 0.5, alpha: a }); } }
}

// ---------------------------------------------------------------- captions (karaoke, as in the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END - 0.12; });
function captions(c, t) {
  for (const g of GROUPS) {
    const first = g === GROUPS[0], last = g === GROUPS[GROUPS.length - 1];
    const show = first ? 0 : g.show, hide = last ? END - 0.17 : g.hide;
    if (t < show || t > hide + 0.16) continue;
    const a = Math.min(smooth(t, show, show + (first ? 0.15 : 0.18)), 1 - smooth(t, hide, hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(255 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
      c.text(MAIN, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : P.y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  t = wrapT(t);
  const c = new Canvas(GW, GH, K);
  const cam = world(c, t);
  story(c, cam, t);
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
