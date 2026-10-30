// «A 13-year-old "beat" Tetris» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture runs to every edge; karaoke captions sit on a soft dithered shade. One room for the whole film:
// the kid with both arms up in front of a frozen game → into the TV: 1989, no ending, faster, game over → level 29, one
// row per frame, the slow-motion miss, the kill screen → hypertapping, rolling → the race past 29, wrong colours, the
// almost invisible level → the score loop that overruns a frame → the AI → 21 December 2023 → one line on 157, the freeze
// → back to the first frame.  node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade, loadImage } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "../../ping/film/world.mjs";
import { tag, panel, stamp } from "../../ping/film/hud.mjs";
import { drawRoom, drawKid, view, setText, screenGlow, SCR, WELL, CS, GW, GH } from "./room.mjs";
import { DEMO, demoPiece, DEMO_LAND, DEMO_MOVE2, levelAt, FREEZE_T } from "./game.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const R = Math.round, K = "#000000", RED = "#E8344E";
setText((c, txt, x, y, ps, col, o) => stext(c, MAIN, txt, x, y, ps, col, o));
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const lerp = (a, b, k) => a + (b - a) * k;
const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));
const NINTENDO = await loadImage(HERE + "media/logo-nintendo-87d4432a.png", 180, 60, { kernel: "lanczos3" });

// ---------------------------------------------------------------- camera
const CAM = {
  ROOM: { cx: 270, cy: 480, z: 1, ay: 480 },
  TVC: { cx: 270, cy: SCR.y + SCR.h / 2, z: 1.72, ay: 330 },
  WELL: { cx: WELL.x + WELL.w / 2, cy: WELL.y + WELL.h / 2, z: 2.72, ay: 330 },
};
const KEYS = [[0, EV.it - 0.6, CAM.ROOM], [EV.old + 0.2, EV.lose + 0.3, CAM.TVC], [EV.at + 0.15, EV.screenEnd - 0.4, CAM.WELL], [EV.came + 0.2, EV.inside - 0.5, CAM.TVC],
  [EV.then2 + 0.3, EV.minutes, CAM.ROOM], [EV.l157 - 0.1, EV.froze + 0.3, CAM.WELL], [EV.fingers2 - 0.2, END + 1, CAM.ROOM]];
function rawCam(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A };
  const [b0, , B] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1));
  return { cx: lerp(A.cx, B.cx, k), cy: lerp(A.cy, B.cy, k), z: Math.exp(lerp(Math.log(A.z), Math.log(B.z), k)), ay: lerp(A.ay, B.ay, k) };
}
const FR = Math.round(END * FPS), CAMS = []; for (let f = 0; f < FR; f++) CAMS.push(rawCam(f / FPS));
function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % FR, SM = 6; let cx = 0, cy = 0, lz = 0, ay = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % FR) + FR) % FR], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; ay += c.ay * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w), ay: ay / w }, ex = Math.max(1 - smooth(wrapT(t), 0.1, 0.5), smooth(wrapT(t), END - 0.5, END - 0.05));
  if (ex <= 0) return s; const e = CAM.ROOM; return { cx: lerp(s.cx, e.cx, ex), cy: lerp(s.cy, e.cy, ex), z: Math.exp(lerp(Math.log(s.z), Math.log(e.z), ex)), ay: lerp(s.ay, e.ay, ex) };
}
// the kid: both arms up at the seam (start and end), playing in between
const armsUp = (t) => Math.max(1 - smooth(t, EV.itEnd - 0.4, EV.itEnd + 0.3), smooth(t, EV.feel - 0.5, EV.feel + 0.2));

// ---------------------------------------------------------------- panels (screen space)
const CARD = "#E9EDF7", INK = "#1E2233", GREY = "#9AA0C8";
function lightCard(c, x, y, w, h, a, edge = "#8E96A4") { if (a <= 0) return; const g = fade(c, a); g.rrect(R(x) - 2, R(y) - 2, R(w) + 4, R(h) + 4, "#0B0812", 2); g.rrect(R(x), R(y), R(w), R(h), edge, 2); g.rrect(R(x) + 2, R(y) + 2, R(w) - 4, R(h) - 4, CARD, 2); }
const SKIN = "#C98E6A", SKIN2 = "#A8704E";
function controllerTop(c, x, y, a) {
  const g = fade(c, a); g.rrect(x, y, 360, 150, "#2A2A30", 2); g.rrect(x + 3, y + 3, 354, 144, "#C8C8D0", 2); g.rect(x + 20, y + 30, 320, 92, "#2A2A30"); g.rect(x + 24, y + 34, 312, 84, "#3A3A44");
  g.rect(x + 50, y + 66, 66, 20, "#16161A"); g.rect(x + 73, y + 43, 20, 66, "#16161A");
  g.rrect(x + 146, y + 80, 26, 10, "#16161A", 2); g.rrect(x + 186, y + 80, 26, 10, "#16161A", 2);
  for (const [bx, by] of [[x + 252, y + 86], [x + 300, y + 76]]) { g.disc(bx, by, 16, "#16161A"); g.disc(bx, by, 13, RED); }
}
function hyperPanel(c, t, a) {
  if (a <= 0) return; panel(c, 26, 74, 488, 360, a, P.y);
  stext(c, MAIN, "HYPERTAPPING", 270, 92, 3, P.y, { align: 0.5, alpha: a });
  const x = 90, y = 150; controllerTop(c, x, y, a);
  // the thumb on the d-pad: a fast shake shown as a blur between two positions (never a jump), with motion lines
  const g = fade(c, a), amp = 6 * smooth(t, EV.shaking - 0.1, EV.shaking + 0.2), drawThumb = (dy, al) => { const f = fade(c, a * al); f.rrect(x + 40, y + 52 + dy, 70, 44, SKIN2, 2); f.rrect(x + 44, y + 50 + dy, 64, 40, SKIN, 2); f.rect(x + 52, y + 56 + dy, 22, 10, "#E8B898"); f.rect(x + 20, y + 80 + dy, 40, 70, SKIN); };
  drawThumb(-amp, 0.5); drawThumb(amp, 0.5); if (amp > 1) for (let k = 0; k < 3; k++) g.rect(x + 118, y + 50 + k * 10, 14, 2, P.iv);
  const taps = Math.max(0, Math.floor((t - EV.shaking) * 12)); stext(c, MAIN, `TAPS ${taps}`, 140, 330, 3, P.iv, { alpha: a * smooth(t, EV.shaking, EV.shaking + 0.3) });
  stext(c, MAIN, "12 / SECOND", 400, 330, 3, P.gr, { align: 0.5, alpha: a * smooth(t, EV.ten2 - 0.1, EV.ten2 + 0.2) });
  stext(c, MAIN, "HOLD = 10 / SECOND", 270, 380, 2, GREY, { align: 0.5, alpha: a * smooth(t, EV.came, EV.came + 0.3) });
}
function rollingPanel(c, t, a) {
  if (a <= 0) return; panel(c, 26, 74, 488, 360, a, P.cy);
  stext(c, MAIN, "ROLLING · 2020", 270, 92, 3, P.cy, { align: 0.5, alpha: a });
  // side view, slowed ×1/4: three fingers drum the back of the controller in turn and push it up into the thumb
  const g = fade(c, a), sl = 0.25, ph = (t - EV.rolling) * 7 * sl, cx = 160, y0 = 260;
  const pushes = [0, 1, 2].map((i) => { const f = ph - i / 3, u = f - Math.floor(f); return Math.max(0, Math.sin(Math.PI * Math.min(1, u / 0.3))) * (u < 0.3 ? 1 : 0); });
  const lift = Math.max(...pushes) * 4;
  g.rect(cx - 40, y0 - lift, 300, 16, "#C8C8D0"); g.rect(cx - 40, y0 - lift + 16, 300, 4, "#8E8E98"); g.rect(cx - 10, y0 - lift - 6, 40, 6, "#16161A");
  g.rrect(cx - 26, y0 - lift - 44, 74, 38, SKIN2, 2); g.rrect(cx - 22, y0 - lift - 46, 66, 34, SKIN, 2);                 // the thumb above
  for (let i = 0; i < 3; i++) { const fx = cx + 10 + i * 46, up = pushes[i] * 12; g.rrect(fx, y0 + 26 - up, 40, 60, SKIN2, 2); g.rrect(fx + 3, y0 + 26 - up, 34, 54, SKIN, 2); }
  for (let i = 0; i < 3; i++) if (pushes[i] > 0.3) { const fx = cx + 30 + i * 46; g.rect(fx - 1, y0 + 96, 2, 14, P.cy); g.rect(fx - 6, y0 + 102, 12, 2, P.cy); }
  stext(c, MAIN, "SLOW MOTION", 420, 150, 2, GREY, { align: 0.5, alpha: a });
  stext(c, MAIN, "UP INTO THE THUMB", 270, 186, 2, P.iv, { align: 0.5, alpha: a * smooth(t, EV.thumb - 0.2, EV.thumb + 0.2) });
  const n = Math.max(0, Math.floor((t - EV.fingers) * 21)); stext(c, MAIN, `PRESSES ${n}`, 270, 376, 3, P.iv, { align: 0.5, alpha: a * smooth(t, EV.fingers, EV.fingers + 0.3) });
  stext(c, MAIN, "20+ / SECOND", 270, 340, 3, P.gr, { align: 0.5, alpha: a * smooth(t, EV.twenty - 0.1, EV.twenty + 0.2) });
}
// the score loop: one pass per level (+1) has to fit into one frame; at 155 it no longer does
function codePanel(c, t, a) {
  if (a <= 0) return; lightCard(c, 30, 76, 480, 380, a, "#5A6070");
  const ln = (s, y, col = INK, al = 1) => stext(c, MAIN, s, 52, y, 2, col, { alpha: a * al });
  ln("WHEN A LINE CLEARS:", 98); ln("REPEAT LEVEL + 1 TIMES:", 124, INK, smooth(t, EV.slow - 0.2, EV.slow + 0.2)); ln("  ADD THE POINTS", 150, "#2A5AA8", smooth(t, EV.points - 0.1, EV.points + 0.2));
  const L = t < EV.past2 + 0.2 ? 29 : 155, passes = L + 1, fill = smooth(t, L === 29 ? EV.loop1 - 0.2 : EV.l155, L === 29 ? EV.loop1End : EV.longer), n = Math.round(passes * fill);
  stext(c, MAIN, `LEVEL ${L}`, 52, 196, 3, L === 29 ? "#2A5AA8" : RED, { alpha: a * smooth(t, EV.adds - 0.1, EV.adds + 0.2) });
  // the frame budget box and the passes (illustrative widths)
  const bx = 52, by = 250, bw = 300, bh = 40, pw = bw / 140, g = fade(c, a);
  g.rect(bx - 2, by - 2, bw + 4, bh + 4, INK); g.rect(bx, by, bw, bh, "#DDE2EE"); stext(c, MAIN, "1 FRAME", bx, by + 50, 2, INK, { alpha: a });
  for (let i = 0; i < n; i++) { const x0 = bx + i * pw, over = x0 >= bx + bw; g.rect(R(x0), by + 6, Math.max(1, R(pw) - 0), bh - 12, over ? RED : i % 2 ? "#3A7BF0" : "#5FA0FF"); }
  if (n > 140) { const ov = smooth(t, EV.longer - 0.1, EV.longer + 0.2); stext(c, MAIN, "TOO LONG!", bx + bw, by + 50, 2, RED, { align: 1, alpha: a * ov }); }
  // loses its place: a pointer that jumps between lines (dissolving each time), then frozen
  const lost = win(t, EV.loses - 0.1, EV.freezes, 0.2, 0.2) * a;
  if (lost > 0) { const k = Math.floor((t - EV.loses) * 3), yy = [98, 150, 124, 196, 98, 150][((k % 6) + 6) % 6]; stext(c, MAIN, ">", 36, yy, 2, RED, { alpha: lost }); stext(c, MAIN, "???", 52, 352, 3, RED, { alpha: lost }); }
  const fz = smooth(t, EV.freezes - 0.05, EV.freezes + 0.15); if (fz > 0) stamp(c, "FROZEN", 270, 380, a * fz, "#3A7BF0", 4, fz);
}
function aiPanel(c, t, a) {
  if (a <= 0) return; panel(c, 60, 100, 420, 250, a, P.gr); const g = fade(c, a), x = 110, y = 150;
  g.rect(x + 10, y, 100, 80, "#8E96A4"); g.rect(x + 16, y + 6, 88, 68, "#C8CDDA"); g.rect(x + 30, y + 26, 18, 14, "#5FD3F0"); g.rect(x + 72, y + 26, 18, 14, "#5FD3F0"); g.rect(x + 40, y + 54, 40, 6, "#3A3A44"); g.rect(x + 56, y - 18, 8, 18, "#8E96A4"); g.disc(x + 60, y - 22, 6, RED);
  stext(c, MAIN, "AI · 2021", 330, 158, 3, P.gr, { align: 0.5, alpha: a }); stext(c, MAIN, "SHOWED THE", 330, 204, 2, P.iv, { align: 0.5, alpha: a }); stext(c, MAIN, "CRASH IS", 330, 226, 2, P.iv, { align: 0.5, alpha: a }); stext(c, MAIN, "POSSIBLE", 330, 248, 2, P.iv, { align: 0.5, alpha: a });
}
function dateCard(c, t, a) {
  if (a <= 0) return; panel(c, 70, 64, 400, 196, a, P.y);
  stext(c, MAIN, "DEC 21, 2023", 270, 84, 4, P.y, { align: 0.5, alpha: a * smooth(t, EV.december - 0.1, EV.december + 0.2) });
  stext(c, MAIN, "OKLAHOMA", 270, 138, 3, P.iv, { align: 0.5, alpha: a * smooth(t, EV.oklahoma - 0.1, EV.oklahoma + 0.2) });
  const k = smooth(t, EV.played, EV.minutes + 0.1), m = Math.floor(38 * k), s = Math.floor((38 * k - m) * 60) % 60;
  stext(c, MAIN, `${String(m).padStart(2, "0")}:${String(k >= 1 ? 0 : s).padStart(2, "0")}`, 270, 184, 4, P.gr, { align: 0.5, alpha: a * smooth(t, EV.played - 0.1, EV.played + 0.2) });
}
function nintendoTile(c, t, a) {
  if (a <= 0) return; const w = 220, h = 124, x = 270 - w / 2, y = 40; lightCard(c, x, y, w, h, a, "#C9D3EA"); const g = fade(c, a);
  for (let j = 0; j < NINTENDO.h; j++) for (let i = 0; i < NINTENDO.w; i++) { const k = (j * NINTENDO.w + i) * 4; if (NINTENDO.data[k + 3] > 100) g.px(x + 20 + i, y + 12 + j, [NINTENDO.data[k], NINTENDO.data[k + 1], NINTENDO.data[k + 2]]); }
  stext(c, MAIN, "1989", 270, y + 88, 3, "#1E2233", { align: 0.5, alpha: a * smooth(t, EV.y1989 - 0.1, EV.y1989 + 0.2) });
}

// ---------------------------------------------------------------- story tags over the game
function story(c, V, t) {
  const at = (cx, cy) => [V.X(WELL.x + cx * CS), V.Y(WELL.y + cy * CS)];
  { const a = winW(t, EV.before - 0.2, EV.it, 0.35, 0.45); tag(c, ["FIRST HUMAN TO", "'BEAT' TETRIS"], 270, 40, a, P.y, 3); }
  nintendoTile(c, t, win(t, EV.nintendo - 0.15, EV.endingEnd - 0.2, 0.3, 0.35));
  tag(c, ["NO ENDING"], 270, 52, win(t, EV.noEnding - 0.1, EV.loseEnd - 0.4, 0.25, 0.3) * smooth(t, EV.endingEnd - 0.25, EV.endingEnd), P.iv, 3);
  tag(c, ["FASTER >>"], 430, 120, win(t, EV.faster - 0.1, EV.loseEnd - 0.2, 0.25, 0.3), P.gr, 3);
  { const a = win(t, EV.lose - 0.05, EV.at + 0.2, 0.2, 0.3); if (a > 0) stamp(c, "GAME OVER", 270, 300, a, RED, 4, smooth(t, EV.lose - 0.05, EV.lose + 0.15)); }
  tag(c, ["LEVEL 29"], 270, 40, win(t, EV.l29 - 0.1, EV.frame1End, 0.25, 0.3), P.y, 4);
  { const a = win(t, EV.row - 0.15, EV.frame1End, 0.25, 0.3); tag(c, ["1 ROW EVERY FRAME", "= 60 ROWS / SECOND"], 270, 100, a, P.iv, 2); }
  // the slow-motion miss
  { const a = win(t, DEMO.t0 + 0.1, EV.sidesEnd, 0.3, 0.35);
    if (a > 0) { tag(c, ["SLOW MOTION"], 110, 40, a, P.l, 2);
      const tg = win(t, EV.holding + 0.1, EV.sidesEnd, 0.3, 0.35); if (tg > 0) { const [x0, y0] = at(0, 6), [x1, y1] = at(1, 10), g = fade(c, tg * (0.6 + 0.4 * Math.sin(t * 8))); g.frame(R(x0), R(y0), R(x1 - x0), R(y1 - y0), P.gr); g.frame(R(x0) + 1, R(y0) + 1, R(x1 - x0) - 2, R(y1 - y0) - 2, P.gr); tag(c, ["NEEDS TO", "GO HERE"], x0 + 30, y0 - 90, tg, P.gr, 2); }
      tag(c, ["10 MOVES / SECOND"], 360, 40, win(t, EV.ten - 0.1, EV.sidesEnd, 0.25, 0.3), P.iv, 2);
      const ts = smooth(t, EV.tooSlow - 0.1, EV.tooSlow + 0.15) * a; if (ts > 0) stamp(c, "TOO SLOW", 330, 300, ts, RED, 3, ts); } }
  { const a = win(t, EV.kill - 0.1, EV.screenEnd - 0.1, 0.15, 0.3); if (a > 0) stamp(c, "KILL SCREEN", 270, 300, a, RED, 5, smooth(t, EV.kill - 0.1, EV.kill + 0.1)); }
  // past 29 … the game begins to break … wrong colours … almost invisible
  tag(c, ["PAST 29"], 270, 40, win(t, EV.past - 0.1, EV.brk, 0.25, 0.3), P.gr, 3);
  tag(c, ["THE GAME", "STARTS TO BREAK"], 270, 40, win(t, EV.began - 0.1, EV.colors - 0.2, 0.25, 0.3), P.or, 3);
  tag(c, ["138+: WRONG COLORS"], 270, 40, win(t, EV.colors - 0.15, EV.almost - 0.2, 0.25, 0.3), P.or, 3);
  tag(c, ["146: ALMOST INVISIBLE"], 270, 40, win(t, EV.almost - 0.1, EV.invisibleEnd, 0.25, 0.3), P.or, 3);
  // 157: one line, the freeze
  tag(c, ["LEVEL 157"], 270, 40, win(t, EV.l157 - 0.1, EV.froze + 0.6, 0.25, 0.35), RED, 4);
  { const a = win(t, EV.line - 0.1, EV.froze + 0.6, 0.2, 0.35); tag(c, ["ONE LINE"], 400, 120, a, P.iv, 3); }
  { const a = win(t, EV.froze - 0.1, EV.fingers2 - 0.2, 0.2, 0.4); if (a > 0) stamp(c, "THE GAME FROZE", 270, 210, a, "#5FA0FF", 3, smooth(t, EV.froze - 0.1, EV.froze + 0.1)); }
}

// ---------------------------------------------------------------- captions (karaoke; quotes dropped)
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
  const c = new Canvas(GW, GH, K), cam = camera(t), V = view(cam);
  drawRoom(c, V, t, screenGlow(t)); drawKid(c, V, t, armsUp(t));
  const panels = [win(t, EV.came - 0.15, EV.second2End + 0.3, 0.3, 0.35), win(t, EV.in2020 - 0.2, EV.moreEnd + 0.2, 0.3, 0.35), win(t, EV.inside - 0.15, EV.freezesEnd, 0.3, 0.35), win(t, EV.ai - 0.2, EV.firstEnd + 0.1, 0.3, 0.35)];
  const dim = Math.max(...panels); if (dim > 0) c.tint(0, 0, GW, GH, () => dim * 0.6, "#07050D", 5);
  story(c, V, t);
  hyperPanel(c, t, panels[0]); rollingPanel(c, t, panels[1]); codePanel(c, t, panels[2]); aiPanel(c, t, panels[3]);
  dateCard(c, t, win(t, EV.december - 0.2, EV.minutesEnd + 0.1, 0.3, 0.35));
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
