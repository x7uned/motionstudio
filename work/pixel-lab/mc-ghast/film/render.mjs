// «The Minecraft ghast's cry came from a real cat» — pixel film (Kagenami), not a loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// One block world in two places joined by portals: the Nether (lava lake, cave walls, our blocky ghast) and a 2010 home
// studio (desk, synth, monitor, a sleeping cat on a stool by a microphone). The SOUND LAB panel draws the waveform and
// spectrogram of exactly the demo that plays (OUR COPY: meow → half speed → long echo; REAL GHAST · MINECRAFT: moan3,
// moan1 at pitch 0.8 / 1.0 / 1.2). No overlay; karaoke captions over a soft dithered shade; the follow card slides in over
// the final Nether scene. Harness adapted from rps/film (captions, follow card, output) and mc-redstone/film (voxel engine).
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, TINY, mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";
import { END, FPS, WORDS, VOICE, EV, DEMO, PASSES } from "./timeline.mjs";
import { NR, SR, GRP, GHAST, netherOutside, studioOutside, CAT, MIC, MONITOR, CHAIR } from "./world.mjs";
import { makeState, renderIso, isoProject } from "./voxel.mjs";
import { drawGhast, ghastMouth, drawCat, catMouth, drawStool, drawChair, drawMonitor, drawKeyboard, drawHeadphones, drawMic, drawCreeperish, drawSpiderish } from "./creatures.mjs";
import { camera, swirl, ghastState, extraGhasts, catState, giantCat, morph, FIRE, WAKE, SHAKE, PURR, THROAT, CRITTERS, demoEnv, clamp01, smooth, ease, lerp, win } from "./scene.mjs";
import { stext, textW, P, panel, tag, pointer, labPanel } from "./hud.mjs";
import * as cta from "./cta.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, K = "#000000", R = Math.round;
const C = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50" };
const [P1, P2, P3, P4] = PASSES;

// ---------------------------------------------------------------- captions (karaoke, same style as the earlier pixel films)
const VOICE_TEXT = VOICE.text;
const shownText = (s) => s.replace(/^C-four-eighteen/, "C418");
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => shownText(w.text.replace(/["“”]/g, "").replace(/[:;]$/, "")), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of WORDS) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : END - 0.2; });
export const CAPTION_Y = 690;
function captions(c, t) {
  for (const g of GROUPS) {
    const first = g === GROUPS[0], show = first ? 0 : g.show;
    if (t < show || t > g.hide + 0.16) continue;
    const a = Math.min(first ? 1 : smooth(t, show, show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = CAPTION_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      for (const [dx, dy] of [[1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]]) c.text(MAIN, txt, x + dx, y0 + dy, C.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : C.O) });
      c.text(MAIN, txt, x, y0, C.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(C.IV, K, 0.55) : toIv > bayer(X + 3, Yy + 1) ? C.IV : C.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- the two places
const DEPTH = new Float32Array(GW * GH);
const SN = makeState(NR); SN.outside = netherOutside(SN); SN.outsideY = 9;
const SS = makeState(SR); SS.outside = studioOutside(); SS.outsideY = 10;
const at = (cam, x, y, z) => isoProject(cam, GW, GH, x, y, z);
const TMP = new Canvas(GW, GH, K);

function fireball(c, x, y, r, t, a = 1) {
  if (r < 1 || a <= 0) return; const g = fade(c, a);
  const cols = ["#8A2A0E", "#E0561A", "#F8962E", "#FFD45A", "#FFF4C8"];
  for (let j = -R(r * 1.5); j <= R(r * 1.5); j++) for (let i = -R(r * 1.5); i <= R(r * 1.5); i++) {
    const d = Math.hypot(i, j), an = Math.atan2(j, i), wob = r * (1 + 0.22 * Math.sin(an * 5 + t * 13) + 0.12 * Math.sin(an * 9 - t * 17));
    if (d > wob) continue; const k = 1 - d / wob, lev = k > 0.82 ? 4 : k > 0.55 ? 3 : k > 0.3 ? 2 : k > 0.1 ? 1 : 0;
    g.px(R(x + i), R(y + j), cols[lev]);
  }
}
function echoRings(c, cam, t) {
  const d = DEMO.echo; if (t < d.t0 - 0.05 || t > d.t0 + d.len + 0.4) return;
  // the sound in the middle of the cave goes out to the walls (bright rings) and comes back as echoes (dimmer rings, inward)
  const [cx, cy] = at(cam, 0.5, 13, 0.5);
  const ring = (rr, a, col) => { if (a <= 0 || rr < 4) return; const g = fade(c, Math.min(1, a)); for (let k = -1; k <= 2; k++) { g.ering(R(cx), R(cy), R(rr + k), R((rr + k) / 2), k === 2 ? "#0B0812" : col); } };
  for (const [delay, col] of [[0, "#FDFEED"], [0.22, "#FAE375"], [0.44, "#E0CDF8"]]) { const u = (t - d.t0 - delay) / 1.2; if (u > 0 && u < 1) ring(10 + 300 * (1 - Math.pow(1 - u, 2)), Math.min(1, u * 6) * (1 - u) * 1.6, col); }
  for (const [delay, col] of [[0.7, "#E0CDF8"], [0.95, "#B08AE8"], [1.25, "#B08AE8"]]) { const u = (t - d.t0 - delay) / 1.1; if (u > 0 && u < 1) ring(300 - 240 * u, 1.1 * Math.sin(Math.PI * u), col); }
}
function soundArcs(c, x, y, t0, t1, t, col = P.iv, dir = 1, n = 3) {
  if (t < t0 || t > t1 + 0.3) return; const a = win(t, t0, t1, 0.15, 0.3), g = fade(c, a);
  for (let k = 0; k < n; k++) { const u = ((t - t0) * 1.6 + k / n) % 1, r = 8 + u * 22, aa = Math.sin(Math.PI * u);
    if (aa < 0.15) continue; const gg = fade(c, a * aa); for (let s = -5; s <= 5; s++) { const an = (s / 5) * 0.75; gg.px(R(x + dir * Math.cos(an) * r), R(y + Math.sin(an) * r), col); gg.px(R(x + dir * Math.cos(an) * r), R(y + Math.sin(an) * r) + 1, col); } }
}

function nether(c, cam, t) {
  SN.t = t; SN.grpA[GRP.PORTAL_N] = smooth(t, EV.update - 0.35, EV.update + 0.45); SN.glow = 1 + 0.25 * win(t, EV.update, EV.updateEnd + 0.3, 0.2, 0.5);
  renderIso(c, [0, 0, GW, GH], cam, SN, DEPTH);
  for (const g of extraGhasts(t)) if (g.alpha > 0) drawGhast(c, cam, g, DEPTH);
  const gs = ghastState(t), m = morph(t);
  if (m <= 0) drawGhast(c, cam, gs, DEPTH);
  else if (m >= 1) drawCat(c, cam, { ...giantCat(t), white: 0 }, DEPTH);
  else { // the ghast turns into a sleeping cat: both go white, the pixels switch by dither
    const w = Math.sin(Math.PI * m) * 0.9; TMP.d.set(c.d);
    drawGhast(c, cam, { ...gs, white: w }, DEPTH); drawCat(TMP, cam, { ...giantCat(t), white: w }, DEPTH);
    for (let Y = 0; Y < GH; Y++) for (let X = 0; X < GW; X++) if (m > bayer(X, Y)) { const i = (Y * GW + X) * 3; c.d[i] = TMP.d[i]; c.d[i + 1] = TMP.d[i + 1]; c.d[i + 2] = TMP.d[i + 2]; }
  }
  // the fireball grows in the mouth, then flies out at the camera (out of frame, bottom right)
  { const [mx, my] = ghastMouth(cam, { ...gs }, isoProject), gk = ease(clamp01((t - FIRE.grow[0]) / (FIRE.grow[1] - FIRE.grow[0]))), sk = clamp01((t - FIRE.shoot[0]) / (FIRE.shoot[1] - FIRE.shoot[0]));
    if (t > FIRE.grow[0] && sk < 1) fireball(c, mx + sk * sk * 360, my + 6 + sk * sk * 640, (3 + 21 * gk) * (cam.b / 25) * (1 + 1.6 * sk * sk), t); }
  echoRings(c, cam, t);
  // critters at the end: dissolve in on "hides", make "?" sounds
  if (t > CRITTERS.in - 0.1) { const a = smooth(t, CRITTERS.in, CRITTERS.in + 0.5);
    drawSpiderish(c, cam, { ...SPOTS.spider, t, alpha: a, s: 2.8, face: Math.PI / 4 + 0.3 }, DEPTH); drawCreeperish(c, cam, { ...SPOTS.creeper, alpha: a, s: 2.2, face: Math.PI / 4 - 0.25 }, DEPTH); }
  return gs;
}
// ground spots for the critters, found once: the netherrack top that projects closest to a target screen point at the end
const SPOTS = (() => {
  const cam = camera(END - 0.5), find = (tx, ty) => { let best = null;
    for (let z = NR.oz + 2; z < NR.oz + NR.nz - 2; z++) for (let x = NR.ox + 2; x < NR.ox + NR.nx - 2; x++) { const h = NR.top[(z - NR.oz) * NR.nx + (x - NR.ox)]; if (h < 11) continue;
      const same = [[1, 0], [0, 1], [-1, 0], [0, -1]].every(([dx, dz]) => NR.top[(z + dz - NR.oz) * NR.nx + (x + dx - NR.ox)] === h); if (!same) continue;
      const [sx, sy] = at(cam, x + 0.5, h, z + 0.5), d = Math.hypot(sx - tx, sy - ty); if (!best || d < best.d) best = { d, x: x + 0.5, y: h, z: z + 0.5 }; }
    return best; };
  return { spider: find(105, 470), creeper: find(410, 440) };
})();

function studio(c, cam, t) {
  SS.t = t; renderIso(c, [0, 0, GW, GH], cam, SS, DEPTH);
  const rec = smooth(t, EV.right - 0.1, EV.right + 0.3) * (1 - smooth(t, P2.t0, P2.t0 + 0.3) * (t < P3.tm ? 1 : 0)) + (t > P3.tm ? 0 : 0);
  drawMonitor(c, cam, MONITOR, t < P3.tm ? rec : 0, t, DEPTH);
  drawHeadphones(c, cam, 12.3, MONITOR.y, 8.5, DEPTH); drawKeyboard(c, cam, 11.3, MONITOR.y, 9.45, DEPTH);
  drawMic(c, cam, MIC, win(t, EV.microphone - 0.1, EV.it1End + 0.3, 0.2, 0.4), DEPTH);
  const cs = catState(t); drawCat(c, cam, cs, DEPTH);
  drawChair(c, cam, CHAIR.x, 11, CHAIR.z, DEPTH);
  return cs;
}

// ---------------------------------------------------------------- the portal swirl (screen space, smooth in t)
const SW = ["#3A1478", "#5A22B0", "#7A3AE0", "#A468FF", "#D2B0FF"].map(hex);
function swirlOverlay(c, t) {
  const s = swirl(t); if (s <= 0) return;
  for (let Y = 0; Y < GH; Y++) for (let X = 0; X < GW; X++) {
    if (s < 1 && s <= bayer(X, Y)) continue;
    const r = Math.hypot(X - 270, Y - 480), an = Math.atan2(Y - 480, X - 270), v = Math.sin(an * 3 + r * 0.035 - t * 5) + Math.sin(X * 0.031 + t * 2.3) * 0.6 + Math.sin(Y * 0.023 - t * 1.7) * 0.6 + Math.sin(r * 0.06 - t * 4) * 0.8;
    const f = (v + 3) / 6 * 4, i = Math.floor(f), k = f - i, col = SW[Math.max(0, Math.min(4, k > bayer(X + 1, Y + 3) ? i + 1 : i))], o = (Y * GW + X) * 3;
    c.d[o] = col[0]; c.d[o + 1] = col[1]; c.d[o + 2] = col[2];
  }
}

// ---------------------------------------------------------------- story overlays
function pumpkin(c, x, y, s, a) { // our pixel jack-o'-lantern
  const g = fade(c, a), rows = ["....GG....", "...GG.....", ".OOOOOOOO.", "OOOOOOOOOO", "OOYOOOOYOO", "OYYOOOOYYO", "OOOOOOOOOO", "OOYOYYOYOO", "OOOYYYYOOO", ".OOOOOOOO.", "..OOOOOO.."];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; g.rect(R(x + i * s), R(y + j * s), s, s, ch === "G" ? "#4A8C32" : ch === "Y" ? "#FFE27A" : (i + j) % 3 ? "#E0761E" : "#C8601A"); }));
}
const CAT_ROWS = ["X..X.........", "XXXX.......XX", "XEXEX......X.", "XXXXXXXXXXXX.", ".XXXXXXXXXXX.", ".XXXXXXXXXXX.", ".X.X....X.X..", ".X.X....X.X.."];
function pixelCat(c, x, y, s, a, body, dark, t, ph) {
  const g = fade(c, a), bob = Math.sin(t * 6 + ph) > 0.6 ? 1 : 0;
  CAT_ROWS.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === ".") return; const legs = j >= 6, off = legs ? 0 : -bob; g.rect(R(x + i * s), R(y + (j + off) * s), s, s, ch === "E" ? "#C8E05A" : (i + j) % 4 === 0 ? dark : body); }));
}
function zzz(c, x, y, t, a) { for (let k = 0; k < 3; k++) { const u = ((t * 0.55 + k / 3) % 1); if (u < 0.05) continue; stext(c, MAIN, "Z", x + u * 26 + k * 2, y - u * 46, 1.4 + u * 1.4, P.l, { alpha: a * Math.sin(Math.PI * u) }); } }

function story(c, cam, t, gs, cs) {
  // Halloween update, 30 Oct 2010 (on "arrived in 2010, in the Halloween update")
  { const a = win(t, EV.y2010 - 0.15, P1.t0 + 0.1, 0.35, 0.3); if (a > 0) { panel(c, 78, 168 + R((1 - a) * 6), 384, 108, a, P.or); pumpkin(c, 96, 180 + R((1 - a) * 6), 7, a);
    stext(c, MAIN, "HALLOWEEN", 196, 186, 3, P.or, { alpha: a }); stext(c, MAIN, "UPDATE", 196, 216, 3, P.or, { alpha: smooth(t, EV.halloween - 0.1, EV.halloween + 0.2) * a });
    stext(c, MAIN, "30 OCT 2010", 196, 248, 2, P.iv, { alpha: a }); } }
  // C418, the composer (pointer to the synth on the desk)
  { const a = win(t, EV.c418 - 0.1, EV.composerEnd + 0.4, 0.3, 0.35); if (a > 0 && cam.reg === "S") { const [x, y] = at(cam, 11.3, MONITOR.y + 0.12, 9.45); const b = tag(c, ["C418", "COMPOSER"], 300, 190, a, P.y, 3); if (b) pointer(c, b.x + 30, b.y + b.h, x, y, a, P.y); } }
  // his 2011 Q&A, paraphrased: not only his voice — cats were involved
  { const a = win(t, EV.he1 - 0.15, EV.involvedEnd + 0.35, 0.3, 0.35); if (a > 0) { panel(c, 60, 172 + R((1 - a) * 6), 420, 128, a, P.l);
    stext(c, MAIN, "C418 SAID, 2011:", 76, 184, 2, P.l, { alpha: a });
    stext(c, MAIN, "NOT ONLY MY VOICE...", 76, 214, 2.4, P.iv, { alpha: a * smooth(t, EV.only1 - 0.1, EV.only1 + 0.2) });
    stext(c, MAIN, "CATS WERE INVOLVED", 76, 252, 2.4, P.y, { alpha: a * smooth(t, EV.cats1 - 0.1, EV.cats1 + 0.2) }); } }
  if (cam.reg === "S") {
    const [mx, my] = catMouth(cam, cs, isoProject);
    // asleep: z z z; woken: grumble arcs
    { const a = (1 - smooth(t, WAKE.up[0], WAKE.up[0] + 0.3)) * smooth(t, P1.t1 - 0.3, P1.t1 + 0.2); if (a > 0) zzz(c, mx + 10, my - 18, t, a); }
    soundArcs(c, mx + 6, my, WAKE.grumble[0], WAKE.grumble[1], t, P.y);
    // the microphone and the recording
    { const a = win(t, EV.microphone - 0.1, EV.heres - 0.5, 0.25, 0.3); if (a > 0) { const [x, y] = at(cam, MIC.x, MIC.top + 0.3, MIC.z); const b = tag(c, ["MICROPHONE"], x + 40, y - 120, a, P.cy, 2); if (b) pointer(c, b.x + b.w / 2, b.y + b.h, x + 4, y - 8, a, P.cy); } }
    { const a = win(t, EV.right - 0.1, EV.heres - 0.5, 0.25, 0.3); if (a > 0) { const [x, y] = at(cam, MIC.x, MIC.top + 0.3, MIC.z), b = tag(c, ["  REC"], x - 70, Math.max(160, y - 150), a, P.red, 2);
      if (b) { const g = fade(c, a * (0.6 + 0.4 * Math.sin(t * 9))); g.disc(b.x + 12, b.y + 12, 4, P.red); pointer(c, b.x + b.w / 2, b.y + b.h, x - 6, y - 12, a, P.red); } } }
    // a much bigger throat: a throat tube (left of the cat) that grows to ghast size
    { const a = win(t, THROAT.show[0], THROAT.show[1], 0.3, 0.35); if (a > 0) { const k = ease(clamp01((t - THROAT.grow[0]) / (THROAT.grow[1] - THROAT.grow[0]))), s = 1 + 2.2 * k;
      const bx = 118, by = 604, w = R(14 * s), h = R(46 * s), g = fade(c, a), fill = mix(P.p3, P.orD, k * 0.7);
      panel(c, 40, 410, 156, 222, a * 0.92, P.l);
      g.rrect(bx - R(w / 2) - 2, by - h - 2, w + 4, h + 4, P.iv, R(w / 2)); g.rrect(bx - R(w / 2), by - h, w, h, fill, R(w / 2) - 1); g.rect(bx - R(w / 2) + 3, by - h + R(w / 2), Math.max(1, R(w / 5)), h - w, mix(P.p5, P.or, k * 0.6));
      if (k > 0.55) { const ga = a * smooth(k, 0.55, 1), gg = fade(c, ga), x0 = bx - 62, y0 = by - 170; // a ghast-size outline around the grown throat
        gg.rect(x0, y0, 124, 2, P.iv); gg.rect(x0, y0 + 108, 124, 2, P.iv); gg.rect(x0, y0, 2, 110, P.iv); gg.rect(x0 + 122, y0, 2, 110, P.iv);
        for (const dx of [16, 46, 76, 106]) gg.rect(x0 + dx, y0 + 110, 2, 18 + (dx % 3) * 4, P.iv); }
      stext(c, MAIN, "THROAT", bx, 418, 2, P.y, { align: 0.5, alpha: a * (1 - smooth(k, 0.5, 0.8)) }); stext(c, MAIN, "GHAST SIZE", bx, 418, 2, P.iv, { align: 0.5, alpha: a * smooth(k, 0.55, 0.9) }); } }
    // the funny part: game cats (ours) in 2012 — his cat would not meow for them, only purred
    { const a = win(t, EV.minecraft2 - 0.1, P4.t0 + 0.05, 0.35, 0.3); if (a > 0) { panel(c, 60, 168 + R((1 - a) * 6), 420, 136, a, P.gr);
      stext(c, MAIN, "GAME CATS · 2012", 76, 180, 2, P.gr, { alpha: a });
      pixelCat(c, 78, 208, 6, a, "#E0943A", "#B06A22", t, 0); pixelCat(c, 164, 222, 5, a, "#3A3440", "#EDE6F0", t, 1.7);
      stext(c, MAIN, "OTHER", 262, 212, 3, P.iv, { alpha: a * smooth(t, EV.purred - 0.05, EV.purred + 0.25) }); stext(c, MAIN, "RECORDINGS", 262, 246, 2.4, P.iv, { alpha: a * smooth(t, EV.purred + 0.1, EV.purred + 0.4) }); } }
    { const a = win(t, SHAKE[0], SHAKE[1] + 0.1, 0.2, 0.3); if (a > 0) { const [x, y] = at(cam, MIC.x, MIC.top + 0.45, MIC.z); const b = tag(c, ["MEOW?"], x + 30, y - 90, a, P.l, 2); if (b) { const g = fade(c, a * smooth(t, SHAKE[0] + 0.4, SHAKE[0] + 0.7)); for (let k = -1; k <= 1; k++) g.line(b.x + 6, b.y + 4 + k, b.x + b.w - 6, b.y + b.h - 4 + k, P.pk); } } }
    { const a = win(t, PURR[0] + 0.1, PURR[1] - 0.2, 0.2, 0.3); if (a > 0) for (let k = 0; k < 2; k++) { const u = ((t - PURR[0]) * 0.7 + k * 0.5) % 1; stext(c, MAIN, "PURR", mx + 40 + k * 22, my - 34 - u * 64, 3, P.y, { align: 0.5, alpha: a * Math.sin(Math.PI * u) }); } }
  } else {
    // the real ghast: a REAL tag over it while it cries (with the label on the panel)
    { const g = gs, [mx, my] = ghastMouth(cam, g, isoProject); soundArcs(c, mx + 40, my, DEMO.real.t0, DEMO.real.t0 + DEMO.real.len, t, P.or); soundArcs(c, mx - 40, my, DEMO.real.t0, DEMO.real.t0 + DEMO.real.len, t, P.or, -1);
      soundArcs(c, mx + 30, my, DEMO.p10.t0, DEMO.p10.t0 + DEMO.p10.len, t, P.or); }
    for (const [i, g] of extraGhasts(t).entries()) { if (g.alpha <= 0) continue; const key = i ? "p12" : "p08", d = DEMO[key], [mx, my] = ghastMouth(cam, g, isoProject); soundArcs(c, mx + (i ? 30 : -30), my, d.t0, d.t0 + d.len, t, P.or, i ? 1 : -1); }
    // which ghast cries at which pitch
    if (t > EV.game2 - 0.3 && t < P3.t0 + 0.4) { const ga = win(t, EV.game2 - 0.1, P3.t0, 0.3, 0.3);
      for (const [g, key, lb] of [[extraGhasts(t)[0], "p08", "×0.8"], [{ ...ghastState(t) }, "p10", "×1.0"], [extraGhasts(t)[1], "p12", "×1.2"]]) { const d = DEMO[key], k = win(t, d.t0 - 0.1, d.t0 + d.len + 0.3, 0.15, 0.3); const [x, y] = at(cam, g.x, g.y + (g.bob ?? 0) + 2.9, g.z);
        stext(c, MAIN, lb, x, y - 22, 2, mix(P.l, P.or, k), { align: 0.5, alpha: ga * (0.45 + 0.55 * k) }); } }
    // the critters' "?" sounds
    if (t > CRITTERS.waves[0] - 0.2) for (const [s, dir] of [[SPOTS.spider, -1], [SPOTS.creeper, 1]]) { const [x, y] = at(cam, s.x, s.y + (s === SPOTS.creeper ? 3.4 : 1.3), s.z);
      soundArcs(c, x + dir * 14, y, CRITTERS.waves[0], CRITTERS.waves[1], t, P.l, dir); stext(c, MAIN, "?", x, y - 46, 3, P.y, { align: 0.5, alpha: win(t, CRITTERS.waves[0], END + 1, 0.3, 0.3) }); }
  }
  // the sound lab panel
  labPanel(c, t, labState(t));
}
function labState(t) {
  const D = DEMO, a = win(t, EV.heres - 0.15, P3.t0 - 0.15, 0.4, 0.35);
  const s = 1 + smooth(t, EV.twice - 0.05, EV.long1End + 0.15), f = 1 - 0.5 * smooth(t, EV.much1 - 0.05, EV.deeperEnd);
  const playing = (k) => t >= D[k].t0 && t <= D[k].t0 + D[k].len;
  const meowHead = playing("meow") ? t - D.meow.t0 : playing("half") ? (t - D.half.t0) / 2 : null;
  const layers = [
    { key: "meow", a: 1 - smooth(t, D.echo.t0 - 0.3, D.echo.t0 - 0.02), s, f, shown: t - D.meow.t0, head: meowHead, col: P.cy },
    { key: "echo", a: 1 - smooth(t, EV.real2 - 0.45, EV.real2 - 0.1), shown: t - D.echo.t0, head: playing("echo") ? t - D.echo.t0 : null, col: P.cy },
    { key: "real", a: 1 - smooth(t, D.p08.t0 - 0.35, D.p08.t0 - 0.05), shown: t - D.real.t0, head: playing("real") ? t - D.real.t0 : null, col: P.or },
    { key: "p08", a: 1 - smooth(t, D.p10.t0 - 0.35, D.p10.t0 - 0.05), shown: t - D.p08.t0, head: playing("p08") ? t - D.p08.t0 : null, col: P.or },
    { key: "p10", a: 1 - smooth(t, D.p12.t0 - 0.35, D.p12.t0 - 0.05), shown: t - D.p10.t0, head: playing("p10") ? t - D.p10.t0 : null, col: P.or },
    { key: "p12", a: 1, shown: t - D.p12.t0, head: playing("p12") ? t - D.p12.t0 : null, col: P.or },
  ].filter((l) => l.shown > -0.01 && l.a > 0);
  const tw = smooth(t, EV.twice + 0.2, EV.long1End + 0.1);
  return {
    a, real: smooth(t, EV.real2 - 0.45, EV.real2), layers,
    bracket: { a: win(t, EV.short - 0.05, D.half.t0 + D.half.len + 0.2, 0.25, 0.35), len: 0.84 * s, txt: [["0.84 S", 1 - tw], ["1.68 S", tw]] },
    high: win(t, EV.high - 0.05, EV.recordingEnd, 0.25, 0.3), deep: win(t, EV.much1, D.half.t0 + D.half.len + 0.3, 0.25, 0.35),
    speed: { a: 1, k: smooth(t, EV.half - 0.05, EV.speed + 0.2) }, echo: { a: 1, k: smooth(t, EV.echo - 0.1, EV.echo + 0.35) },
    recipe: win(t, EV.dont - 0.1, EV.recordingEnd + 0.3, 0.25, 0.35),
    pitch: { a: smooth(t, EV.game2 + 0.12, EV.game2 + 0.4), rowOut: smooth(t, EV.game2 - 0.15, EV.game2 + 0.1), lit: ["p08", "p10", "p12"].map((k) => win(t, D[k].t0 - 0.08, D[k].t0 + D[k].len + 0.2, 0.12, 0.35)) },
  };
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t);
  let gs = null, cs = null;
  if (cam.reg === "N") gs = nether(c, cam, t); else cs = studio(c, cam, t);
  swirlOverlay(c, t);
  story(c, cam, t, gs ?? ghastState(t), cs ?? catState(t));
  cta.hud(c, t);
  c.tint(0, CAPTION_Y - 50, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - CAPTION_Y + 50)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

// ---------------------------------------------------------------- output
const FULL = new Uint8ClampedArray(1080 * 1920 * 3);
export function toFull(c) {
  const d = c.d, row = new Uint8ClampedArray(1080 * 3);
  for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULL.set(row, y * 2 * 3240); FULL.set(row, (y * 2 + 1) * 3240); }
  return FULL;
}
const args = process.argv.slice(2);
if (args[0] === "--stills") {
  fs.mkdirSync(HERE + "stills", { recursive: true });
  for (const s of args[1].split(",")) { const t = Number(s); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t); }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
