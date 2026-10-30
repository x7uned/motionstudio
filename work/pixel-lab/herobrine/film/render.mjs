// «Herobrine was never in the game» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture runs to every edge; karaoke captions sit on a soft dithered shade. One block world for the
// whole film (our own, in the spirit of the game): first person in the fog with the figure on the ridge → the story's
// cards (the anonymous post, the vanishing posts, "Stop.") → the iso world with his "signs" → the staged stream and the
// house with the hidden picture → Notch's answer → Mojang's joke in the update notes → back to the fog (first frame).
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade, loadImage } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "../../ping/film/world.mjs";
import { tag, panel, pointer, stamp } from "../../ping/film/hud.mjs";
import { H, B, SEA, groundY, outsideColor, TUNNEL, PYRAMIDS, DEAD, PAINTING_AT, RIDGE, CLEARING } from "./world.mjs";
import { makeState, renderPersp, renderIso, isoProject, avgColor } from "./voxel.mjs";
import { drawPerson, usePersp, useIso } from "./actors.mjs";
import { fpCam, figure, isoCam, isoAmount, houseWalls, shake, smooth, ease, lerp, win, clamp01, wrap } from "./scene.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000";
const hx = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const FOG = hx("#8E96A4"), RED = "#E8344E";
const GRP = new Float32Array(8).fill(1);
const SF = makeState(H), SI = makeState(H);
for (const S of [SF, SI]) { S.demoFlag = false; S.grpA = GRP; S.shadowK = 0.6; }
SF.skyTop = hx("#5A6478"); SF.skyHor = FOG; SF.noSun = true; SF.fogColor = FOG; SF.fog = { start: 5, end: 58 };
{ const G = avgColor(B.GRASS, 0), L = avgColor(B.LEAVES, 0).map((v) => v * 1.0), LD = avgColor(B.LEAVES, 0).map((v) => v * 0.55); SI.outsideY = 40; SI.outside = (out, wx, wz, bs, X, Y) => outsideColor(out, wx, wz, bs, X, Y, G, L, LD); }
const DEPTH = new Float32Array(GW * GH), NEG = new Float32Array(GW * GH);
const MOJANG = await loadImage(HERE + "media/logo-mojang-studios-a12cd723.png", 220, 63, { kernel: "lanczos3" });
const fogFn = (d) => ({ k: clamp01((d - 5) / 53) * 0.85, col: FOG });

// ---------------------------------------------------------------- layers
const L2 = new Canvas(GW, GH, K);
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
// first person in the fog (optionally into a sub-rectangle of a scratch canvas) with the figure
function fpInto(c, rect, clip, cam, fig) {
  renderPersp(c, rect, clip, cam, SF, DEPTH);
  if (fig && fig.alpha > 0) { for (let Y = Math.max(0, clip[1]); Y < Math.min(GH, clip[3]); Y++) for (let X = Math.max(0, clip[0]); X < Math.min(GW, clip[2]); X++) NEG[Y * GW + X] = -DEPTH[Y * GW + X];
    usePersp(rect, fogFn); drawPerson(c, cam, "herobrine", fig, NEG); useIso(); }
}
function isoLayer(t) {
  GRP[1] = houseWalls(t);
  const cam = isoCam(t); renderIso(L2, [0, 0, GW, GH], cam, SI, DEPTH);
  // overcast haze over the iso world: farther (lower x+y+z) is foggier
  for (let i = 0, p = 0; p < GW * GH; p++, i += 3) { const d = DEPTH[p], ref = cam.x + cam.y + cam.z, k = d < -1e8 ? 0.45 : clamp01(0.18 + (ref - d) * 0.004); L2.d[i] += (FOG[0] - L2.d[i]) * k; L2.d[i + 1] += (FOG[1] - L2.d[i + 1]) * k; L2.d[i + 2] += (FOG[2] - L2.d[i + 2]) * k; }
  return cam;
}

// ---------------------------------------------------------------- cards
const CARD = "#E9EDF7", INK = "#1E2233", GREEN = "#117743", GREY = "#B7BDCC";
function lightCard(c, x, y, w, h, a, edge = "#8E96A4") { if (a <= 0) return; const g = fade(c, a); g.rrect(R(x) - 2, R(y) - 2, R(w) + 4, R(h) + 4, "#0B0812", 2); g.rrect(R(x), R(y), R(w), R(h), edge, 2); g.rrect(R(x) + 2, R(y) + 2, R(w) - 4, R(h) - 4, CARD, 2); }
const bar = (c, x, y, w, a, col = GREY) => { if (a > 0) fade(c, a).rect(R(x), R(y), R(w), 6, col); };
function postCard(c, t, a) {
  if (a <= 0) return; const x = 46, y = 74, w = 448, h = 300; lightCard(c, x, y, w, h, a);
  const g = fade(c, a); g.rect(x + 2, y + 2, w - 4, 30, "#C9D3EA");
  stext(c, MAIN, "ANONYMOUS", x + 14, y + 10, 2, GREEN, { alpha: a }); stext(c, MAIN, "2010", x + w - 14, y + 10, 2, INK, { align: 1, alpha: a });
  // the "screenshot" in the post: the fog with the figure, seen through a long lens
  const tx = x + 16, ty = y + 46, tw = 230, th = 150;
  if (a > 0.02) { const cam = { x: CLEARING.x + 0.5, y: groundY(CLEARING.x, CLEARING.z) + 1.62, z: CLEARING.z, yaw: Math.atan2(-(RIDGE.x - CLEARING.x), -(RIDGE.z - CLEARING.z)), pitch: 0.02, fov: 0.42 };
    const sub = new Canvas(GW, GH, K); fpInto(sub, { x: tx, y: ty, w: tw, h: th }, [tx, ty, tx + tw, ty + th], cam, { x: RIDGE.x + 0.5, y: groundY(RIDGE.x, RIDGE.z), z: RIDGE.z + 0.5, face: 0, walk: null, alpha: 1 });
    for (let Y = ty; Y < ty + th; Y++) for (let X = tx; X < tx + tw; X++) if (a > bayer(X, Y)) { const i = (Y * GW + X) * 3; c.d[i] = sub.d[i]; c.d[i + 1] = sub.d[i + 1]; c.d[i + 2] = sub.d[i + 2]; }
    g.frame(tx - 1, ty - 1, tw + 2, th + 2, INK); }
  stext(c, MAIN, "ALONE IN A", x + 262, y + 56, 2, INK, { alpha: a * smooth(t, EV.story, EV.story + 0.3) }); stext(c, MAIN, "NEW WORLD.", x + 262, y + 78, 2, INK, { alpha: a * smooth(t, EV.story, EV.story + 0.3) });
  stext(c, MAIN, "THICK FOG.", x + 262, y + 108, 2, INK, { alpha: a * smooth(t, EV.story + 0.4, EV.story + 0.7) });
  stext(c, MAIN, "SOMEONE WAS", x + 262, y + 138, 2, INK, { alpha: a * smooth(t, EV.forums - 0.6, EV.forums - 0.3) }); stext(c, MAIN, "THERE...", x + 262, y + 160, 2, RED, { alpha: a * smooth(t, EV.forums - 0.6, EV.forums - 0.3) });
  bar(c, x + 16, y + 214, 380, a); bar(c, x + 16, y + 230, 300, a); bar(c, x + 16, y + 246, 340, a);
  stext(c, MAIN, "THE STORY, RETOLD", x + 16, y + 270, 1, "#5A6070", { alpha: a });
}
function deletedPosts(c, t, a) {
  if (a <= 0) return;
  for (let k = 0; k < 3; k++) { const tk = EV.posts + k * 0.5, y = 88 + k * 96, out = smooth(t, tk + 0.35, tk + 0.8), ak = a * (1 - out); if (ak <= 0) continue;
    lightCard(c, 60, y, 420, 80, ak); stext(c, MAIN, "ANONYMOUS", 76, y + 14, 2, GREEN, { alpha: ak }); bar(c, 76, y + 40, 330 - k * 40, ak); bar(c, 76, y + 54, 240 + k * 20, ak);
    const st = smooth(t, tk - 0.05, tk + 0.15); if (st > 0) stamp(c, "DELETED", 330, y + 40, ak * st, RED, 3, st); }
}
function messageCard(c, t, a) {
  if (a <= 0) return; const [sx, sy] = shake(t), x = 60 + sx, y = 96 + sy, w = 420, h = 250;
  lightCard(c, x, y, w, h, a); fade(c, a).rect(R(x) + 2, R(y) + 2, w - 4, 30, "#C9D3EA");
  stext(c, MAIN, "NEW MESSAGE", x + 14, y + 10, 2, INK, { alpha: a });
  const fr = smooth(t, EV.called - 0.1, EV.called + 0.25) * a; stext(c, MAIN, "FROM:", x + 16, y + 52, 3, INK, { alpha: fr }); stext(c, MAIN, "HEROBRINE", x + 106, y + 52, 3, RED, { alpha: smooth(t, EV.hb3 - 0.05, EV.hb3 + 0.25) * a });
  const ow = smooth(t, EV.one - 0.1, EV.one + 0.2) * a * (1 - smooth(t, EV.stop - 0.25, EV.stop)); stext(c, MAIN, "ONE WORD", x + 16, y + 110, 2, "#5A6070", { alpha: ow });
  const st = smooth(t, EV.stop - 0.03, EV.stop + 0.12) * a; if (st > 0) stext(c, MAIN, "STOP.", x + w / 2, y + 120, 9, RED, { align: 0.5, alpha: st });
}
// the stream: a game window with the fog and the figure, a webcam, LIVE → OFFLINE
function webcam(c, cx, by, t, a, scream) {
  const f = fade(c, a), X = R(cx), Y = R(by), s = 5, bob = scream > 0.5 ? Math.round(Math.sin(t * 40) * 1.5) : Math.round(Math.sin(t * 3));
  const calm = ["....hhhhhhhh....", "...hhhhhhhhhh...", "..khhhhhhhhhhk..", "..kssssssssssk..", "..kssessssessk..", "..kssssssssssk..", "...ssssmmssss...", "....ssssssss....", "......ssss......", "...tttttttttt...", "..tttttttttttt..", ".tttttttttttttt.", "tttttttttttttttt"];
  const yell = ["....hhhhhhhh....", "...hhhhhhhhhh...", "..khwwhhhhwwhk..", "..ksWWssssWWsk..", "..ksWesssseWsk..", "..ksssmmmmsssk..", "...sssmmmmsss...", "....ssmmmmss....", "......ssss......", "...tttttttttt...", "..tttttttttttt..", ".tttttttttttttt.", "tttttttttttttttt"];
  const rows = scream > 0.5 ? yell : calm, map = { h: "#3A2A20", k: "#1A1A22", s: "#E6B48E", e: "#1A1020", m: "#7A2A2A", t: "#3A5C9A", w: "#3A2A20", W: "#FFFFFF" };
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) f.rect(X + (i - 8) * s, Y - (rows.length - j) * s + (j < 9 ? bob : 0), s, s, map[ch]); }));
  f.rect(X - 9 * s, Y - 10 * s + bob, 2 * s, s, "#1A1A22"); f.rect(X - 4 * s, Y - 14 * s + bob, 8 * s, 1, "#1A1A22");
}
function streamCard(c, t, a) {
  if (a <= 0) return; const x = 22, y = 70, w = 496, h = 300, f = fade(c, a);
  panel(c, x, y, w, h, a, "#6E4FB0", "#120C1D"); f.rect(x + 3, y + 3, w - 6, 32, "#1F1A2E");
  stext(c, MAIN, "MINECRAFT STREAM · 2010", x + 12, y + 12, 2, P.iv, { alpha: a });
  const off = smooth(t, EV.ended + 0.1, EV.ended + 0.4), lw = textW(MAIN, off > 0.5 ? "OFFLINE" : "LIVE", 2) + 10; f.rect(x + w - lw - 12, y + 9, lw, 20, off > 0.5 ? "#55556A" : RED); stext(c, MAIN, off > 0.5 ? "OFFLINE" : "LIVE", x + w - lw - 7, y + 12, 2, P.iv, { alpha: a });
  // the game window
  const gx = x + 12, gy = y + 46, gw = 300, gh = 200;
  const cam = { x: CLEARING.x + 0.5, y: groundY(CLEARING.x, CLEARING.z) + 1.62, z: CLEARING.z - 3, yaw: Math.atan2(-(RIDGE.x - CLEARING.x), -(RIDGE.z - CLEARING.z + 3)) + 0.03 * Math.sin(t * 0.8), pitch: 0.03, fov: 0.42 };
  const sub = new Canvas(GW, GH, K); fpInto(sub, { x: gx, y: gy, w: gw, h: gh }, [gx, gy, gx + gw, gy + gh], cam, { x: RIDGE.x + 0.5, y: groundY(RIDGE.x, RIDGE.z), z: RIDGE.z + 0.5, face: 0, walk: null, alpha: 1 });
  const snow = Math.floor(t * 15);
  for (let Y = gy; Y < gy + gh; Y++) for (let X = gx; X < gx + gw; X++) { if (!(a > bayer(X, Y))) continue; const i = (Y * GW + X) * 3; if (off > bayer(X + 2, Y + 1)) { const v = ((Math.imul(X * 73856093 ^ Y * 19349663 ^ snow * 83492791, 2654435761) >>> 0) / 4294967296) * 120 + 40; c.d[i] = v; c.d[i + 1] = v; c.d[i + 2] = v + 8; } else { c.d[i] = sub.d[i]; c.d[i + 1] = sub.d[i + 1]; c.d[i + 2] = sub.d[i + 2]; } }
  f.frame(gx - 1, gy - 1, gw + 2, gh + 2, "#3B2C5C");
  if (off > 0) stext(c, MAIN, "STREAM ENDED", gx + gw / 2, gy + gh / 2 - 8, 2, P.iv, { align: 0.5, alpha: a * off });
  // the webcam
  const wx = x + 324, wy = y + 46, ww = 160, wh = 130, sc = win(t, EV.screamed - 0.05, EV.ended + 0.3, 0.08, 0.3); f.rect(wx, wy, ww, wh, sc > 0.5 ? "#4A1A2A" : "#241C38");
  if (!(off > 0.6)) webcam(c, wx + ww / 2, wy + wh, t, a, sc); else f.rect(wx, wy, ww, wh, "#16121F");
  if (sc > 0) stext(c, MAIN, "AAAH!", wx + ww / 2, wy + wh + 14, 3, RED, { align: 0.5, alpha: a * sc });
  stext(c, MAIN, "VIEWERS SAW HIM", x + 12, y + 262, 2, P.y, { alpha: a * smooth(t, EV.showed, EV.showed + 0.3) * (1 - off) });
}
function brotherCard(c, t, a) {
  if (a <= 0) return; lightCard(c, 50, 90, 440, 220, a);
  stext(c, MAIN, "THE STORY SAID:", 270, 110, 2, "#5A6070", { align: 0.5, alpha: a });
  stext(c, MAIN, "HEROBRINE =", 270, 146, 4, INK, { align: 0.5, alpha: a * smooth(t, EV.story3 + 0.4, EV.story3 + 0.7) });
  stext(c, MAIN, "NOTCH'S DEAD", 270, 196, 4, RED, { align: 0.5, alpha: a * smooth(t, EV.dead - 0.1, EV.dead + 0.2) }); stext(c, MAIN, "BROTHER ?", 270, 236, 4, RED, { align: 0.5, alpha: a * smooth(t, EV.brother, EV.brother + 0.25) });
  stext(c, MAIN, "NOTCH MADE MINECRAFT", 270, 284, 2, "#5A6070", { align: 0.5, alpha: a * smooth(t, EV.made - 0.1, EV.made + 0.2) });
}
function quoteCard(c, t, a) {
  if (a <= 0) return; lightCard(c, 40, 88, 460, 230, a, "#5A8AD8");
  stext(c, MAIN, "NOTCH · 2012", 60, 104, 2, "#2A5AA8", { alpha: a });
  const l = (s, y, ev) => stext(c, MAIN, s, 60, y, 3, INK, { alpha: a * smooth(t, ev - 0.1, ev + 0.2) });
  l("I DON'T HAVE A", 140, EV.notch2 + 0.1); l("DEAD BROTHER, AND", 176, EV.no); l("HE NEVER WAS IN", 212, EV.never2 - 0.4); l("THE GAME.", 248, EV.never2 - 0.1);
  const s = smooth(t, EV.never2, EV.never2 + 0.15); if (s > 0) stamp(c, "NEVER IN THE GAME", 270, 352, a * s, RED, 3, s);
}
function mojangCard(c, t, a) {
  if (a <= 0) return; const w = 260, h = 110, x = 270 - w / 2, y = 120; lightCard(c, x, y, w, h, a, "#C9D3EA");
  const g = fade(c, a); for (let j = 0; j < MOJANG.h; j++) for (let i = 0; i < MOJANG.w; i++) { const k = (j * MOJANG.w + i) * 4; if (MOJANG.data[k + 3] > 100) g.px(x + 20 + i, y + 24 + j, [MOJANG.data[k], MOJANG.data[k + 1], MOJANG.data[k + 2]]); }
  tag(c, ["TURNED IT", "INTO A JOKE"], 270, 252, a * smooth(t, EV.joke - 0.15, EV.joke + 0.15), P.y, 3);
}
// the update notes: one card per version, stacked; the last line is typed in
const NOTES = [
  { v: "BETA 1.6.6", d: "MAY 2011", line: "REMOVED HEROBRINE", at: () => EV.update - 0.2, type: () => EV.removed2 },
  { v: "1.16.2", d: "", line: "REMOVED HEROBRINE", at: () => EV.again - 0.05, type: () => EV.again + 0.15 },
  { v: "1.20", d: "", line: "REMOVED HEROBRINE", at: () => EV.again + 0.35, type: () => EV.again + 0.55 },
  { v: "1.21.5", d: "", line: "REMOVED HEROBRINE", at: () => EV.again + 0.75, type: () => EV.again + 0.95 },
  { v: "1.21.6", d: "", line: "REMOVED HEROBRINE", at: () => EV.again + 1.15, type: () => EV.again + 1.35 },
  { v: "26.1", d: "MARCH 2026", line: "REMOVED BABY HEROBRINE", at: () => EV.march - 0.15, type: () => EV.removed3 },
];
function notesCards(c, t, a) {
  if (a <= 0) return;
  NOTES.forEach((n, i) => {
    const t0 = n.at(), k = smooth(t, t0, t0 + 0.3); if (k <= 0) return; const last = i === NOTES.length - 1, first = i === 0;
    const x = 34 + i * 14 + (1 - ease(k)) * 60, y = 76 + i * 22, w = 400, h = 210, ak = a * k;
    lightCard(c, x, y, w, h, ak, last ? RED : "#8E96A4"); fade(c, ak).rect(R(x) + 2, R(y) + 2, w - 4, 30, last ? "#F4D2D8" : "#C9D3EA");
    stext(c, MAIN, n.v, x + 14, y + 10, 2, INK, { alpha: ak }); if (n.d) stext(c, MAIN, n.d, x + w - 14, y + 10, 2, INK, { align: 1, alpha: ak });
    stext(c, MAIN, "WHAT'S NEW:", x + 14, y + 46, 2, "#5A6070", { alpha: ak });
    for (let r = 0; r < 3; r++) bar(c, x + 14, y + 74 + r * 22, [250, 300, 210][(r + i) % 3], ak);
    const typed = n.line.slice(0, Math.max(0, Math.min(n.line.length, Math.floor((t - n.type()) * 22)))); if (typed) { const hl = fade(c, ak); hl.rect(R(x) + 10, R(y) + 144, w - 20, 26, last ? "#FFE1E6" : "#FFF3C2"); stext(c, MAIN, "- " + typed, x + 16, y + 150, 2, last ? RED : INK, { alpha: ak }); }
  });
  const cnt = win(t, EV.fifteen - 0.15, EV.yearsEnd + 0.2, 0.25, 0.35);
  if (cnt > 0) { tag(c, ["30+ TIMES"], 140, 330, cnt, P.y, 3); tag(c, ["2011-2026"], 400, 330, cnt * smooth(t, EV.fifteen, EV.fifteen + 0.25), P.l, 3); }
  // a tiny "baby" of the legend on the last card
  const bb = smooth(t, EV.baby - 0.05, EV.baby + 0.25) * a; if (bb > 0) { const g = fade(c, bb), X = 34 + 5 * 14 + 340, Y = 76 + 5 * 22 + 90; g.rect(X, Y, 24, 24, "#B98C68"); g.rect(X, Y, 24, 8, "#3A2414"); g.rect(X + 4, Y + 11, 5, 4, "#FFFFFF"); g.rect(X + 15, Y + 11, 5, 4, "#FFFFFF"); g.rect(X + 2, Y + 24, 20, 14, "#2A9E9E"); g.rect(X + 4, Y + 38, 16, 10, "#3A3E9A"); }
}

// ---------------------------------------------------------------- iso tags (signs, the picture)
function isoTags(c, cam, t, a) {
  if (a <= 0) return; const at = (x, y, z) => isoProject(cam, GW, GH, x, y, z);
  const head = win(t, EV.listed - 0.1, EV.leavesEnd + 0.1, 0.3, 0.35); tag(c, ["HIS 'SIGNS'"], 270, 64, head * a, P.l, 3);
  const sign = (txt, p, ev, until) => { const k = win(t, ev - 0.1, until, 0.25, 0.3) * a; if (k <= 0) return; const [x, y] = at(...p); const b = tag(c, [txt], x, y - 130, k, P.y, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, k, P.y); };
  sign("2×2 TUNNEL", [TUNNEL.x0 + 1, TUNNEL.y0 + 1, TUNNEL.z + 1], EV.twobytwo, EV.sand - 0.1);
  sign("SAND PYRAMIDS", [PYRAMIDS[1][0] + 0.5, SEA + 3, PYRAMIDS[1][1] + 0.5], EV.sand, EV.trees - 0.1);
  sign("NO LEAVES", [DEAD.x + 0.5, groundY(DEAD.x, DEAD.z) + 4, DEAD.z + 0.5], EV.trees, EV.leavesEnd + 0.1);
  const st = smooth(t, EV.staged - 0.05, EV.staged + 0.15), sa = win(t, EV.staged - 0.05, EV.houseEnd + 0.1, 0.15, 0.35) * a; if (sa > 0) stamp(c, "STAGED", 270, 120, sa, RED, 5, st);
  const pk = win(t, EV.picture - 0.1, EV.houseEnd + 0.1, 0.25, 0.35) * a; if (pk > 0) { const [x, y] = at(PAINTING_AT.x + 1, PAINTING_AT.y + 1, PAINTING_AT.z + 1); const b = tag(c, ["A PICTURE"], x + 70, y - 150, pk, P.l, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y, pk, P.l); }
}

// ---------------------------------------------------------------- the hook stamps (over the fog)
function hookTags(c, t) {
  const s = win(t, EV.thirty - 0.05, EV.gameEnd, 0.15, 0.4), land = smooth(t, EV.thirty - 0.05, EV.thirty + 0.15); if (s > 0) stamp(c, "REMOVED ×30+", 270, 150, s, RED, 4, land);
  const n = win(t, EV.never - 0.05, EV.gameEnd + 0.1, 0.25, 0.4); tag(c, ["NEVER IN THE GAME"], 270, 214, n, P.y, 3);
  const e = win(t, EV.empty - 0.1, EV.eyesEnd + 0.1, 0.25, 0.35); tag(c, ["EMPTY WHITE EYES"], 270, 84, e, P.iv, 3);
}

// ---------------------------------------------------------------- captions ("4" + "chan" read as 4CHAN)
const VOICE_TEXT = VOICE.text;
const CW = (() => { const out = []; for (let i = 0; i < WORDS.length; i++) { const w = WORDS[i], n = WORDS[i + 1]; if (w.text === "4" && n && /^chan/i.test(n.text)) { out.push({ ...w, text: "4" + n.text, end: n.end, charEnd: n.charEnd }); i++; } else out.push(w); } return out; })();
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of CW) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 0.9) - 0.15; });
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
  t = wrap(t);
  const c = new Canvas(GW, GH, K), ia = isoAmount(t);
  if (ia < 1) { const cam = fpCam(t); fpInto(c, { x: 0, y: 0, w: GW, h: GH }, [0, 0, GW, GH], cam, figure(t)); }
  let icam = null; if (ia > 0) { icam = isoLayer(t); dissolve(c, L2, ia); }
  // the world dims under the cards
  const dim = Math.max(win(t, EV.in2010 - 0.2, EV.forumsEnd + 0.1, 0.3, 0.4), win(t, EV.posts - 0.3, EV.stopEnd, 0.3, 0.4), win(t, EV.that - 0.1, EV.streamEnd + 0.1, 0.3, 0.35), win(t, EV.story3 - 0.1, EV.babyEnd, 0.4, 0.5));
  if (dim > 0) c.tint(0, 0, GW, GH, () => dim * 0.6, "#07050D", 5);
  hookTags(c, t);
  postCard(c, t, win(t, EV.in2010 - 0.1, EV.forumsEnd + 0.05, 0.35, 0.4));
  deletedPosts(c, t, win(t, EV.posts - 0.25, EV.disEnd, 0.3, 0.3));
  messageCard(c, t, win(t, EV.then - 0.1, EV.stopEnd + 0.1, 0.3, 0.35));
  if (icam) isoTags(c, icam, t, ia);
  streamCard(c, t, win(t, EV.that - 0.05, EV.streamEnd + 0.05, 0.3, 0.35));
  brotherCard(c, t, win(t, EV.story3 - 0.05, EV.mc3End + 0.1, 0.3, 0.35));
  quoteCard(c, t, win(t, EV.notch2 - 0.1, EV.game2End + 0.05, 0.3, 0.35));
  mojangCard(c, t, win(t, EV.mojang - 0.1, EV.jokeEnd, 0.3, 0.3));
  notesCards(c, t, win(t, EV.update - 0.25, EV.babyEnd, 0.3, 0.4));
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
