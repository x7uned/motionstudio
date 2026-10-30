// «People built computers inside Minecraft» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: the picture runs to every edge; karaoke captions sit on a soft dithered shade. One block world for the
// whole film: the wide shot of a redstone computer → the lab (wire, NOT, AND, OR, half adder) → copies → the computer
// and its lamp screen (a falling-blocks game, the 1 Hz tick, a tiny chatbot) → back to the wire → the first frame.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { P, stext, textW } from "../../ping/film/world.mjs";
import { tag, panel, pointer } from "../../ping/film/hud.mjs";
import { RS, GROUND, GRP, LABEL, SCREEN, B, outsideColor } from "./world.mjs";
import { makeState, renderIso, isoProject, avgColor } from "./voxel.mjs";
import { paintDust, drawParts, setLoop } from "./redstone.mjs";
import { drawPerson } from "./actors.mjs";
import { SIG, leverPos, lampLevel, copyAlpha, hero, camera, tickNow, smooth, ease, lerp, win, clamp01 } from "./scene.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, K = "#000000";
setLoop(END);
const S = makeState(RS), DEPTH = new Float32Array(GW * GH);
S.hit = { x: new Float32Array(GW * GH), y: new Float32Array(GW * GH), z: new Float32Array(GW * GH), ax: new Uint8Array(GW * GH), ty: new Uint8Array(GW * GH) };
{ const G = avgColor(B.GRASS, 0), L = avgColor(B.LEAVES, 0).map((v) => v * 1.05), LD = avgColor(B.LEAVES, 0).map((v) => v * 0.55);
  S.outsideY = GROUND + 1; S.outside = (out, wx, wz, bs, X, Y) => outsideColor(out, wx, wz, bs, X, Y, G, L, LD); }
const wrapT = (t) => ((t % END) + END) % END;
// a window that may run across the seam (a > b means [a, END) ∪ [0, b))
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));

// ---------------------------------------------------------------- world
function world(c, t) {
  for (let k = 0; k < 8; k++) S.grpA[GRP.COPY0 + k] = copyAlpha(k, t);
  S.t = t; S.lamp = (x, y, z) => lampLevel(x, y, z, t);
  const cam = camera(t);
  renderIso(c, [0, 0, GW, GH], cam, S, DEPTH);
  paintDust(c, S, SIG, t);
  drawParts(c, cam, DEPTH, S, SIG, t, leverPos);
  const h = hero(t); if (cam.b > 2.5) drawPerson(c, cam, "hero", h, DEPTH);
  return cam;
}
const at = (cam, x, y, z) => isoProject(cam, GW, GH, x, y, z);

// ---------------------------------------------------------------- small pictures
function phone(c, x, y, s, a, t, count = null) {
  if (a <= 0) return; const g = fade(c, a), w = 26 * s, h = 46 * s;
  g.rrect(R(x), R(y), R(w), R(h), "#2A2238", 2); g.rrect(R(x + s), R(y + s), R(w - 2 * s), R(h - 2 * s), "#120C1D", 2);
  g.rect(R(x + 3 * s), R(y + 5 * s), R(w - 6 * s), R(h - 11 * s), "#1D2A48");
  // the chip with its pins
  const cx = x + w / 2, cy = y + h / 2 - s, cs = 9 * s;
  for (let k = -3; k <= 3; k++) { g.rect(R(cx + k * 1.2 * s - s / 2), R(cy - cs / 2 - 2 * s), R(s), R(2 * s), "#B9B9C6"); g.rect(R(cx + k * 1.2 * s - s / 2), R(cy + cs / 2), R(s), R(2 * s), "#B9B9C6"); g.rect(R(cx - cs / 2 - 2 * s), R(cy + k * 1.2 * s - s / 2), R(2 * s), R(s), "#B9B9C6"); g.rect(R(cx + cs / 2), R(cy + k * 1.2 * s - s / 2), R(2 * s), R(s), "#B9B9C6"); }
  g.rect(R(cx - cs / 2), R(cy - cs / 2), R(cs), R(cs), "#3A3A48"); g.rect(R(cx - cs / 2 + s), R(cy - cs / 2 + s), R(cs - 2 * s), R(cs - 2 * s), "#55556A");
  const pulse = 0.5 + 0.5 * Math.sin(t * 40); g.rect(R(cx - s), R(cy - s), R(2 * s), R(2 * s), mix("#5FD3F0", "#FDFEED", pulse));
  g.rect(R(x + w / 2 - 3 * s), R(y + h - 4 * s), R(6 * s), R(s), "#3B2C5C");
}
function clock(c, cx, cy, r, a, t, flash) {
  if (a <= 0) return; const g = fade(c, a), col = mix(P.l, P.y, flash);
  for (let i = 0; i < 48; i++) { const an = (i / 48) * 2 * Math.PI; g.rect(R(cx + Math.cos(an) * r) - 1, R(cy + Math.sin(an) * r) - 1, 2, 2, col); }
  const an = -Math.PI / 2 + 2 * Math.PI * Math.floor(Math.max(0, t - EV.ticks + 0.05)) / 12; g.line(R(cx), R(cy), R(cx + Math.cos(an) * r * 0.75), R(cy + Math.sin(an) * r * 0.75), col); g.disc(R(cx), R(cy), 2, col);
}
// a big bit display: ON 1 / OFF 0 lamp icons
function bitIcon(c, x, y, on, a, label) {
  if (a <= 0) return; const g = fade(c, a), col = on ? "#FFE8A8" : "#3A2416", fr = on ? "#C88A3A" : "#5A3C22";
  g.rect(R(x), R(y), 28, 28, fr); g.rect(R(x) + 3, R(y) + 3, 22, 22, col); if (on) { g.rect(R(x) + 13, R(y) + 3, 2, 22, fr); g.rect(R(x) + 3, R(y) + 13, 22, 2, fr); }
  stext(c, MAIN, label, x + 14, y + 34, 2, on ? P.y : P.l, { align: 0.5, alpha: a });
}

// ---------------------------------------------------------------- story overlays
function story(c, cam, t) {
  const TOP = 64;
  // the seam tag: across the loop seam
  { const a = winW(t, EV.andThats - 0.15, 3.0, 0.35, 0.45); tag(c, ["THIS IS A COMPUTER", "BUILT IN MINECRAFT"], 270, TOP, a, P.y, 3); }
  // same idea as your phone's chip
  { const a = win(t, EV.they - 0.1, EV.phoneEnd + 0.1, 0.3, 0.35); if (a > 0) { panel(c, 150, TOP + 6, 240, 150, a, P.cy); phone(c, 172, TOP + 22, 2.4, a, t); stext(c, MAIN, "SAME", 330, TOP + 52, 3, P.cy, { align: 0.5, alpha: a }); stext(c, MAIN, "IDEA", 330, TOP + 86, 3, P.cy, { align: 0.5, alpha: a }); } }
  // E1 — dust = wire; lever; lamp
  { const L = LABEL.E1, a = win(t, EV.called - 0.1, EV.wireEnd + 0.2, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, 5.5, GROUND + 1, 0.5); const b = tag(c, ["REDSTONE DUST"], x, y - 150, a, P.pk, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, a, P.pk); tag(c, ["= WIRE"], x + 60, y - 96, smooth(t, EV.wire - 0.05, EV.wire + 0.25) * a, P.iv, 3); } }
  { const a = win(t, EV.lever - 0.15, EV.lampEnd + 0.1, 0.25, 0.3); if (a > 0) { const [x, y] = at(cam, 0.5, GROUND + 1.3, 0.5); const b = tag(c, ["LEVER"], x - 40, y - 130, a, P.l, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 8, a, P.l); } }
  { const a = win(t, EV.lights - 0.05, EV.lampEnd + 0.1, 0.25, 0.3); if (a > 0) { const [x, y] = at(cam, 9.5, GROUND + 2, 0.5); const b = tag(c, ["LAMP"], x + 10, y - 120, a, P.y, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 6, a, P.y); } }
  { const a = win(t, EV.on - 0.1, EV.needsEnd + 0.1, 0.25, 0.35); if (a > 0) { panel(c, 140, TOP + 4, 260, 110, a, P.y); bitIcon(c, 186, TOP + 22, true, a * 1, "ON = 1"); bitIcon(c, 326, TOP + 22, false, a * smooth(t, EV.off - 0.05, EV.off + 0.2), "OFF = 0"); } }
  // E2 — NOT
  { const a = win(t, EV.torch - 0.1, EV.gate1End + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, 5.5, GROUND + 1.9, -6.5); const b = tag(c, ["REDSTONE TORCH"], x + 30, y - 150, a, P.or, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 4, a, P.or); } }
  { const a = win(t, EV.block - 0.1, EV.gate1End + 0.1, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, 4.5, GROUND + 2, -6.5); const b = tag(c, ["BLOCK POWERED"], x - 110, y - 80, a, P.pk, 2); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x - 6, y, a, P.pk); } }
  { const a = win(t, EV.not - 0.1, EV.gate1End + 0.1, 0.25, 0.35); tag(c, ["NOT", "IN 1  >  OUT 0"], 270, TOP, a, P.y, 3); }
  // E3 — AND: count the torches, the lamp needs both
  { const a = win(t, EV.three - 0.1, EV.on2End + 0.1, 0.3, 0.35);
    if (a > 0) { const pts = [[5.5, GROUND + 2.8, -15.5], [5.5, GROUND + 2.8, -13.5], [6.5, GROUND + 1.9, -14.5]];
      pts.forEach((p, i) => { const k = smooth(t, EV.three - 0.05 + i * 0.22, EV.three + 0.15 + i * 0.22) * a; if (k > 0) { const [x, y] = at(cam, ...p); tag(c, [String(i + 1)], x, y - 70, k, P.or, 3); } });
      const g = win(t, EV.and - 0.1, EV.on2End + 0.1, 0.25, 0.35); tag(c, ["AND", "BOTH ON = ON"], 270, TOP, g, P.y, 3);
      const q = win(t, EV.lampLights - 0.2, EV.on2End + 0.1, 0.25, 0.35); if (q > 0) { const A = SIG("A3", t) > 0.5, Bv = SIG("B3", t) > 0.5, out = SIG("and3", t) > 0.5; tag(c, [`A ${A ? "1" : "0"}  B ${Bv ? "1" : "0"}  >  ${out ? "1" : "0"}`], 270, TOP + 84, q, out ? P.gr : P.l, 3); } } }
  // E4 — OR
  { const a = win(t, EV.join - 0.15, EV.worksEnd + 0.15, 0.3, 0.35); if (a > 0) { const [x, y] = at(cam, 4.5, GROUND + 1, -22.5); const b = tag(c, ["THE WIRES JOIN"], x - 60, y - 140, a, P.pk, 2); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 2, a, P.pk); }
    const g = win(t, EV.or - 0.1, EV.worksEnd + 0.15, 0.25, 0.35); tag(c, ["OR", "EITHER ON = ON"], 270, TOP, g, P.y, 3);
    const q = win(t, EV.either - 0.15, EV.worksEnd + 0.2, 0.25, 0.35); if (q > 0) { const A = SIG("A4", t) > 0.5, Bv = SIG("B4", t) > 0.5, out = SIG("or4", t) > 0.5; tag(c, [`A ${A ? "1" : "0"}  B ${Bv ? "1" : "0"}  >  ${out ? "1" : "0"}`], 270, TOP + 84, q, out ? P.gr : P.l, 3); } }
  // E5 — the half adder: 1 + 1 = 10
  { const a = win(t, EV.put - 0.1, EV.numbersEnd + 0.15, 0.3, 0.35);
    if (a > 0) {
      tag(c, ["A FEW GATES", "= ADDER"], 270, TOP, win(t, EV.gates - 0.1, EV.one1 - 0.2, 0.3, 0.3), P.cy, 3);
      for (const [n, z, ev] of [["A", -34, EV.one1], ["B", -30, EV.one2]]) { const k = smooth(t, ev - 0.05, ev + 0.2) * a; if (k > 0) { const [x, y] = at(cam, 0.5, GROUND + 1.6, z + 0.5); tag(c, [n + " = 1"], x - 30, y - 60, k, P.l, 2); } }
      const cs = smooth(t, EV.one3 - 0.1, EV.one3 + 0.2) * a, ss = smooth(t, EV.zero - 0.1, EV.zero + 0.2) * a;
      if (cs > 0) { const [x, y] = at(cam, 9.5, GROUND + 2, -30.5); const b = tag(c, ["CARRY 1"], x + 20, y - 40, cs, P.y, 2); if (b) pointer(c, b.x, b.y + b.h / 2, x + 4, y - 4, cs, P.y); }
      if (ss > 0) { const [x, y] = at(cam, 9.5, GROUND + 2, -32.5); const b = tag(c, ["SUM 0"], x + 34, y - 100, ss, P.l, 2); if (b) pointer(c, b.x, b.y + b.h / 2, x + 4, y - 4, ss, P.l); }
      const eq = win(t, EV.one1 - 0.1, EV.numbersEnd + 0.15, 0.25, 0.35);
      if (eq > 0) { const s1 = EV.one1 < t ? "1" : "", s2 = t > EV.plus ? " + " : "", s3 = t > EV.one2 ? "1" : "", s4 = t > EV.gives ? " = " : "", s5 = t > EV.one3 ? "1" : "", s6 = t > EV.zero ? "0" : "";
        tag(c, [s1 + s2 + s3 + s4 + s5 + s6 || " "], 270, TOP, eq, P.y, 4); tag(c, ["10 = TWO"], 270, TOP + 70, smooth(t, EV.twoN - 0.1, EV.twoN + 0.25) * eq, P.gr, 3); } } }
  // copies
  { const a = win(t, EV.copy - 0.05, EV.computer2End, 0.3, 0.4); if (a > 0) { const n = Math.min(8, Math.max(1, Math.floor((t - EV.copy) / 0.2) + 1)); tag(c, [t < EV.thousands + 0.3 ? `COPY ×${n}` : "× THOUSANDS"], 270, TOP, a, P.cy, 3); }
    const w = win(t, EV.whole - 0.1, EV.computer2End + 0.3, 0.3, 0.4); tag(c, ["= A WHOLE COMPUTER"], 270, TOP + 64, w, P.y, 3); }
  // the screen: sammyuri 2021, the game; the tick; the phone
  { const a = win(t, EV.sammy1 - 0.1, EV.tetrisEnd + 0.2, 0.3, 0.35); tag(c, ["SAMMYURI · 2021", "PLAYS TETRIS"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.ticks - 0.1, EV.timesEnd + 0.3, 0.3, 0.4), fl = tickNow(t);
    if (a > 0) { panel(c, 26, TOP, 230, 120, a, mix(P.l, P.y, fl)); clock(c, 76, TOP + 60, 32, a, t, fl); stext(c, MAIN, "1 TICK", 180, TOP + 34, 3, mix(P.iv, P.y, fl), { align: 0.5, alpha: a }); stext(c, MAIN, "/ SECOND", 180, TOP + 70, 2, P.l, { align: 0.5, alpha: a }); }
    const b = win(t, EV.phoneChip - 0.1, EV.timesEnd + 0.3, 0.3, 0.4);
    if (b > 0) { panel(c, 284, TOP, 230, 230, b, P.cy); phone(c, 300, TOP + 16, 2.2, b, t); stext(c, MAIN, "4,000,000,000", 399, TOP + 140, 2, P.cy, { align: 0.5, alpha: b }); stext(c, MAIN, "TICKS / SECOND", 399, TOP + 170, 2, P.l, { align: 0.5, alpha: b }); } }
  // the chatbot and the waiting
  { const a = win(t, EV.tiny - 0.15, EV.redstone2End + 0.2, 0.3, 0.35); tag(c, ["SAMMYURI · 2025", "A TINY CHATBOT"], 270, TOP, a, P.y, 3); }
  { const a = win(t, EV.answer - 0.15, EV.hoursEnd + 0.1, 0.3, 0.4);
    if (a > 0) { panel(c, 70, TOP, 400, 210, a, P.l); stext(c, MAIN, "1 ANSWER", 270, TOP + 18, 3, P.iv, { align: 0.5, alpha: a });
      const y1 = smooth(t, EV.ten - 0.1, EV.ten + 0.2) * a, sp = smooth(t, EV.forty - 0.15, EV.forty + 0.2) * a, h2 = smooth(t, EV.hours - 0.1, EV.hours + 0.2) * a;
      stext(c, MAIN, "ON ITS OWN:  10 YEARS", 270, TOP + 70, 2, P.pk, { align: 0.5, alpha: y1 });
      if (sp > 0) { stext(c, MAIN, "SPED UP ×40,000", 270, TOP + 110, 2, P.cy, { align: 0.5, alpha: sp }); for (let k = 0; k < 2; k++) { const x = 130 + k * 14 + ((t * 60) % 14); stext(c, MAIN, ">", x, TOP + 108, 2, P.cy, { alpha: sp * 0.7 }); } }
      stext(c, MAIN, "STILL 2 HOURS", 270, TOP + 154, 3, P.y, { align: 0.5, alpha: h2 }); } }
  // the ending: lever, dust, lamp
  { for (const [txt, ev, p, col] of [["LEVER", EV.lever3, [0.5, GROUND + 1.3, 0.5], P.l], ["DUST", EV.dust3, [5.5, GROUND + 1, 0.5], P.pk], ["LAMP", EV.lamp3, [9.5, GROUND + 2, 0.5], P.y]]) {
      const a = win(t, ev - 0.1, EV.andThats - 0.25, 0.25, 0.3); if (a <= 0) continue; const [x, y] = at(cam, ...p); const b = tag(c, [txt], x, y - 120, a, col, 3); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x, y - 6, a, col); } }
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
    // across the seam: the last group fades out just before END, the first fades in just after 0 (never a one-frame swap)
    const show = first ? 0 : g.show, hide = last ? END - 0.17 : g.hide;
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
