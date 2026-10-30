// «Your cat sleeps all day, then goes crazy at 3 a.m.» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No header overlay: the picture runs to every edge; captions sit over a soft dithered shade. ONE world, the apartment
// in side view; the cat's dream of the wild opens in a thought bubble over the sleeping cat. Every event sits on a word.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade, hex } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, LAYOUT, ground, layer, sm, ease, lerp, win, clamp01, gate } from "./layout.mjs";
import { drawApartment, drawFront, drawBowl, sunPatch, lightAt, propLayer, litView } from "./apartment.mjs";
import { drawCat } from "./cat.mjs";
import { drawPerson, drawGlass } from "./person.mjs";
import { drawDream, drawDreamFront, drawMouse, bubble, drawBubbleEdge } from "./dream.mjs";
import { energyBar, tag, bigTitle, mouseIcons, clockTag, zzz, soundWaves, speedLines, stepIcons } from "./hud.mjs";
import { EV, END, FPS, WORDS, VOICE, HOOK, hookTau } from "./timeline.mjs";
import { CAMS, camera, world, catTrack, personTrack, dreamCam, wildTrack, mouseTrack, toyAt, glassAt, energy, dreamEnergy, BUBBLE } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A" };

// ---------------------------------------------------------------- an actor layer: draws like a Canvas, remembers which
// pixels it covered, so actors can be lit (night, lamp) without tinting the room behind them
class Layer extends Canvas {
  constructor(w, h) { super(w, h, K); this.m = new Uint8Array(w * h); this.box = [w, h, -1, -1]; }
  px(x, y, c) {
    if (!this.m) return; x = Math.floor(x); y = Math.floor(y);
    if (!c || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const [r, g, b] = hex(c), j = y * this.w + x, i = j * 3; this.d[i] = r; this.d[i + 1] = g; this.d[i + 2] = b; this.m[j] = 1;
    const B = this.box; if (x < B[0]) B[0] = x; if (y < B[1]) B[1] = y; if (x > B[2]) B[2] = x; if (y > B[3]) B[3] = y;
  }
  clear() { this.m.fill(0); this.box = [this.w, this.h, -1, -1]; }
  /** copy onto c, tinted toward col by k (dithered in 1/8 steps) */
  onto(c, k = 0, col = "#1A1438") {
    const [x0, y0, x1, y1] = this.box, [tr, tg, tb] = hex(col);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const j = y * this.w + x; if (!this.m[j]) continue; const i = j * 3;
      const q = k <= 0 ? 0 : Math.min(1, Math.floor(k * 8 + bayer(x, y)) / 8);
      c.d[i] = this.d[i] + (tr - this.d[i]) * q; c.d[i + 1] = this.d[i + 1] + (tg - this.d[i + 1]) * q; c.d[i + 2] = this.d[i + 2] + (tb - this.d[i + 2]) * q;
    }
  }
}
const DREAM = new Canvas(GW, GH, K), SEAM = new Canvas(GW, GH, K);

/** Draw the entries of a track: [{draw(g), lo, hi, a}] — complementary gates crossfade neighbouring segments. */
function drawTrack(g, entries) { for (const e of entries) { let v = gate(g, e.lo, e.hi); if (e.a < 1) v = fade(v, e.a); if (e.a > 0 && e.hi > e.lo) e.draw(v); } }

// ---------------------------------------------------------------- small HUD bits drawn here
function anger(c, x, y, k) { // the cartoon anger mark, popping in smoothly
  if (k <= 0) return; const g = fade(c, Math.min(1, k * 1.4)), s = 0.6 + 0.4 * ease(k);
  for (const [dx, dy, rot] of [[-1, -1, 0], [1, -1, 1], [-1, 1, 3], [1, 1, 2]]) {
    const cx = x + dx * 5 * s, cy = y + dy * 5 * s;
    for (let a = 0; a < 6; a++) { const ang = (rot * Math.PI) / 2 + (a / 6) * (Math.PI / 2); g.rect(R(cx + Math.cos(ang) * 4 * s), R(cy + Math.sin(ang) * 4 * s), 2, 2, a % 2 ? "#FF5A6E" : UI.PK); }
  }
}
function droplet(c, x, y, a) { if (a <= 0) return; const g = fade(c, a); g.rect(R(x), R(y), 2, 3, "#A9C4FF"); g.px(R(x), R(y), "#FDFEED"); }


// ---------------------------------------------------------------- the food bag in the owner's hand (arm from the top edge)
function pourBag(c, G, W) {
  const a = Math.min(1, W.pour * 2.5), drop = 1 - ease(Math.min(1, W.pour * 1.6)), g = fade(c, a), s = G.z;
  const px = LAYOUT.bowl.x - 20, py = -196 - 70 * drop, th = 2.1 * ease(clamp01((W.pour - 0.25) / 0.55));
  const rot = ([x, y]) => [G.X(px + x * Math.cos(th) - y * Math.sin(th)), G.Y(py + x * Math.sin(th) + y * Math.cos(th))];
  // the arm: striped pyjama sleeve from above the frame down to the hand at the bag's top corner
  const grip = rot([-11, 3]), top = [grip[0] - 30 * s, -10], w = Math.max(3, R(10 * s));
  for (let k = -w; k <= w; k++) { const t0 = [top[0] + k, top[1]], t1 = [grip[0] + k * 0.8, grip[1]]; g.line(R(t0[0]), R(t0[1]), R(t1[0]), R(t1[1]), Math.abs(k) > w - 2 ? "#33458A" : (k + 40) % 7 < 2 ? "#5470B8" : "#7E98DA"); }
  g.disc(R(grip[0]), R(grip[1]), Math.max(2, R(5.5 * s)), "#E6AD8A"); g.disc(R(grip[0] - 1.5 * s), R(grip[1] - 1.5 * s), Math.max(1, R(2.5 * s)), "#F3CBAA");
  // the bag: kraft paper with a teal label and a fish, opening (local y = 0) tips toward the bowl
  const body = [[-12, 0], [12, 0], [13, 34], [-13, 34]].map(rot), label = [[-10, 10], [10, 10], [10.6, 26], [-10.6, 26]].map(rot);
  g.poly(body, "#C89A62"); g.poly(label, "#2E9A92"); g.poly([[-12, 0], [12, 0], [12, 3], [-12, 3]].map(rot), "#8A6A3E");
  { const f = rot([0, 18]), r = Math.max(1, R(3.2 * s)); g.ellipse(R(f[0]), R(f[1]), r + 1, r, "#F4CA50"); const tl = rot([5, 18]); g.disc(R(tl[0]), R(tl[1]), Math.max(1, R(1.6 * s)), "#F4CA50"); }
  for (let i = 0; i < body.length; i++) { const p = body[i], q = body[(i + 1) % body.length]; g.line(R(p[0]), R(p[1]), R(q[0]), R(q[1]), "#5A3E1E"); }
  // kibble: falls from the opening while the bag is tipped, under gravity, into the bowl
  if (th > 1.3) { const mouth = rot([0, 0]), wx0 = G.wx(mouth[0]), wy0 = G.wy(mouth[1]), fall = Math.sqrt((2 * (-11 - wy0)) / 900);
    for (let k = 0; k < 16; k++) { const ph = (W.pourT * 2.6 + k / 16) % 1, tt = ph * fall, x = G.X(wx0 + 14 * tt + Math.sin(k * 7.1) * 3), y = G.Y(wy0 + 0.5 * 900 * tt * tt);
      if (clamp01((th - 1.3) / 0.5) > ph * 0.3) g.rect(R(x), R(y), Math.max(1, R(1.8 * s)), Math.max(1, R(1.6 * s)), k % 3 ? "#B06A34" : "#8A4C24"); } }
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
    const a = Math.min(sm(t, g.show, g.show + 0.18), 1 - sm(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(MAIN, words.join(" "), o), y0 = 690 + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt2, i) => { const wd = g.ws[i], ww = c.measure(MAIN, txt2, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = sm(t, wd.end, wd.end + 0.3);
      c.text(MAIN, txt2, x + 1, y0 + 1, UI.O, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : UI.O) });
      c.text(MAIN, txt2, x, y0, UI.IV, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(UI.IV, K, 0.62) : toIv > bayer(X + 3, Yy + 1) ? UI.IV : UI.Y) });
      x += ww + c.measure(MAIN, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- the dream inside the bubble
function composeDream(c, t, bub, tailPt) {
  if (bub.k <= 0) return;
  const dcam = dreamCam(t), Gd = ground(dcam);
  DREAM.rect(0, 0, GW, GH, K); drawDream(DREAM, dcam, { t, light: 0 });
  let wildHead = null;
  drawTrack(DREAM, wildTrack(t).map((e) => ({ ...e, draw: (g) => { const an = drawCat(g, Gd, e.x, e.y, e.st); if (e.lo === 0 || !wildHead) wildHead = an && an.head; } })));
  drawTrack(DREAM, mouseTrack(t).map((e) => ({ ...e, draw: (g) => drawMouse(g, Gd, e.x, e.y, e.st) })));
  drawDreamFront(DREAM, dcam, { t, light: 0 });
  // the wildcat's own little energy bar inside the dream
  { const de = dreamEnergy(t); if (de.a > 0 && wildHead) energyBar(DREAM, R(wildHead[0] - 40), R(wildHead[1] - 46), de.level, { a: de.a, w: 80, label: "ENERGY" }); }
  const inside = bubble(bub.cx, bub.cy, bub.r, bub.k, tailPt), ox = 270 - bub.cx, oy = 520 - bub.cy, [bx0, by0, bx1, by1] = inside.box;
  const y0 = Math.max(0, Math.floor(by0)), y1 = Math.min(GH, Math.ceil(by1)), x0 = Math.max(0, Math.floor(bx0)), x1 = Math.min(GW, Math.ceil(bx1));
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const cov = inside.main(x, y); if (cov <= 0 || cov <= bayer(x, y)) continue;
    const sx = x + ox, sy = y + oy; if (sx < 0 || sy < 0 || sx >= GW || sy >= GH) continue;
    const i = (sy * GW + sx) * 3, o = (y * GW + x) * 3; c.d[o] = DREAM.d[i]; c.d[o + 1] = DREAM.d[i + 1]; c.d[o + 2] = DREAM.d[i + 2];
  }
  drawBubbleEdge(c, bub.cx, bub.cy, bub.r, bub.k, tailPt, Math.min(1, bub.k * 1.5));
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), W = world(t);
  drawApartment(c, cam, W);
  // loop seam: the sky's twinkle, clouds and motes run on t; in the last second dissolve into the copy drawn at
  // t − END, so the final frame equals frame(0) exactly
  if (t > END - 1) { const k = sm(t, END - 1, END - 1 / FPS); SEAM.d.set(c.d); drawApartment(SEAM, cam, { ...W, t: t - END }); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (bayer(x, y) < k) { const i = (y * GW + x) * 3; c.d[i] = SEAM.d[i]; c.d[i + 1] = SEAM.d[i + 1]; c.d[i + 2] = SEAM.d[i + 2]; } }
  drawBowl(c, G, "back", { kibble: W.kibble, st: W });
  // dinner: the owner's arm comes down from the top edge with the food bag, tips it, kibble falls into the bowl
  if (W.pour > 0) pourBag(c, G, W);
  // ---- actors, lit like the room at their own spot but lifted toward daylight so they read at night
  const lit = (g, wx) => { const L = lightAt(W, wx, -60), q = Math.min(0.5, 0.7 * L.k); return litView(g, { mul: L.mul.map((m) => lerp(m, 1, q)), add: L.add.map((v) => v * (1 - q)), sat: lerp(L.sat, 1, q) }); };
  const ACTC = c;
  let catAn = null, personAn = null;
  const GP = propLayer(cam);
  drawTrack(ACTC, personTrack(t).map((e) => ({ ...e, draw: (g0) => { const g = lit(g0, e.prop ? -168 : e.x); const toy = toyAt(t), toyP = e.prop ? [GP.wx(G.X(toy[0])), GP.wy(G.Y(toy[1]))] : toy; const an = drawPerson(g, e.prop ? GP : G, e.x, e.y, { ...e.st, toy: e.st.wand ? toyP : undefined }); if (e.lo === 0) personAn = an; } })));
  { const gl = glassAt(t); if (gl) { const GA = lit(c, gl.x); if (gl.a > 0) drawGlass(fade(GA, gl.a), G, gl.x, gl.y, gl.rot, gl.fill); for (const d of gl.drops) droplet(GA, G.X(d.x), G.Y(d.y), d.a); if (gl.puddle > 0) { const g = fade(GA, Math.min(1, gl.puddle)); g.ellipse(R(G.X(gl.px)), R(G.Y(1)), Math.max(1, R(22 * G.z * Math.min(1, gl.puddle))), Math.max(1, R(2.2 * G.z)), "#5470B8"); g.ellipse(R(G.X(gl.px - 4)), R(G.Y(0.4)), Math.max(1, R(10 * G.z * Math.min(1, gl.puddle))), Math.max(1, R(1 * G.z)), "#A9C4FF"); } } }
  drawTrack(ACTC, catTrack(t).map((e) => ({ ...e, draw: (g0) => { const g = lit(g0, e.x); const an = drawCat(g, e.prop ? GP : G, e.x, e.y, e.st); if (e.lo === 0 || !catAn) catAn = { ...an, st: e.st, a: e.a }; } })));
  drawBowl(c, G, "front", { kibble: W.kibble, st: W });
  // the cat's eyes catch the light in the dark (as in the cat-eyes film)
  if (catAn && catAn.eye && W.glow > 0 && catAn.st.pose !== "sleep") { const [ex, ey] = catAn.eye, r = Math.max(2, R(2.2 * G.z)), g = fade(c, W.glow * (catAn.a ?? 1));
    for (let y = -r * 2; y <= r * 2; y++) for (let x = -r * 2; x <= r * 2; x++) { const d = Math.hypot(x, y); if (d < r * 0.7) g.px(R(ex + x), R(ey + y), "#C8FF9A"); else if (d < r * 2 && (1 - d / (r * 2)) * 0.8 > bayer(R(ex + x), R(ey + y))) g.px(R(ex + x), R(ey + y), mix(c.get(R(ex + x), R(ey + y)), "#65DA41", 0.45)); } }
  drawFront(c, cam, W);
  // ---- the dream bubble over the sleeping cat
  { const b = BUBBLE(t); if (b.k > 0) composeDream(c, t, b, catAn && catAn.head ? [catAn.head[0], catAn.head[1] - 10] : [270, 560]); }
  // ---- motion effects and HUD
  hud(c, t, G, W, catAn, personAn);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function hud(c, t, G, W, catAn, personAn) {
  // speed lines behind the running cat
  if (catAn && catAn.st.pose === "run" && catAn.bbox) { const [x0, y0, x1, y1] = catAn.bbox, f = catAn.st.facing ?? 1, a = (catAn.st.stretch ?? 0) * (catAn.a ?? 1);
    if (a > 0.2) speedLines(c, f > 0 ? x0 - 70 : x1 + 70, y0 + 4, f > 0 ? x0 - 4 : x1 + 4, y1 - 4, t, a * 0.9); }
  // the clock at the hook (and when the loop comes back to it)
  clockTag(c, 270, 128, "3:00 AM", win(t, EV.three - 0.25, EV.right + 0.6, 0.25, 0.4));
  // anger mark over the owner's head
  if (personAn && personAn.head) anger(c, personAn.head[0] + 22, personAn.head[1] - 30, win(t, EV.annoying - 0.1, EV.getYou, 0.35, 0.4));
  tag(c, ["BUILT TO HUNT"], 270, 128, win(t, EV.built - 0.1, EV.hunt1End + 0.15, 0.25, 0.3), UI.Y, 3);
  tag(c, ["15 HOURS A DAY"], 270, 128, win(t, EV.fifteen - 0.15, EV.day2End + 0.25, 0.25, 0.3), UI.L, 3);
  tag(c, ["LIGHT SLEEP"], 270, 128, win(t, EV.light - 0.1, EV.jumpEnd - 0.05, 0.25, 0.3), UI.CY, 3);
  // sounds the sleeping ear turns to: a bird at the window, a phone buzzing on the sofa
  soundWaves(c, 470, 330, (t - EV.ears + 0.1) * 1.6 % 1, -1, win(t, EV.ears - 0.15, EV.turning + 0.5, 0.2, 0.3), "TWEET");
  soundWaves(c, 70, 360, (t - EV.every + 0.1) * 1.6 % 1, 1, win(t, EV.every - 0.1, EV.sound + 0.55, 0.2, 0.3), "BZZZ");
  if (catAn && catAn.head && catAn.st.pose === "sleep") zzz(c, catAn.head[0] + 18, catAn.head[1] - 26, t, win(t, 9.0, EV.wild - 0.1, 0.4, 0.3) + win(t, EV.sSleep, EV.skip + 0.4, 0.3, 0.3));
  // the dream
  tag(c, ["IN THE WILD"], 270, 128, win(t, EV.wild - 0.05, EV.mouse + 0.3, 0.25, 0.3), UI.OR, 3);
  tag(c, ["1 MOUSE = TINY MEAL"], 270, 128, win(t, EV.tiny - 0.15, EV.catch - 0.15, 0.25, 0.3), UI.Y, 3);
  mouseIcons(c, 112, 176, 10, lerp(0, 10, sm(t, EV.catch, EV.ten + 0.35)), win(t, EV.catch - 0.3, EV.day3End + 0.1, 0.25, 0.3));
  tag(c, ["10 MICE A DAY"], 270, 128, win(t, EV.ten - 0.05, EV.day3End + 0.1, 0.25, 0.3), UI.Y, 3);
  tag(c, ["WAIT..."], 270, 128, win(t, EV.long - 0.1, EV.sprint - 0.15, 0.25, 0.25), UI.L, 3);
  tag(c, ["SPRINT!"], 270, 128, win(t, EV.sprint - 0.05, EV.full - 0.05, 0.15, 0.25), UI.PK, 3);
  tag(c, ["FULL POWER"], 270, 128, win(t, EV.full - 0.05, EV.powerEnd + 0.2, 0.2, 0.3), UI.PK, 3);
  tag(c, ["SAVE ENERGY"], 270, 128, win(t, EV.saves - 0.15, EV.energy1End + 0.2, 0.25, 0.3), UI.GR, 3);
  // dusk and dawn, by the window
  { const L = layer(camera(t), 0.96), wx = L.X((LAYOUT.window.x0 + LAYOUT.window.x1) / 2), wy = L.Y(LAYOUT.window.top) - 46;
    tag(c, ["DUSK"], wx - 52, wy, win(t, EV.dusk - 0.1, EV.body, 0.25, 0.35), UI.OR, 2); tag(c, ["DAWN"], wx + 52, wy, win(t, EV.dawn - 0.1, EV.body, 0.25, 0.35), UI.Y, 2); }
  tag(c, ["READY TO HUNT"], 270, 128, win(t, EV.ready2 - 0.1, EV.hunt3End + 0.35, 0.25, 0.3), UI.GR, 3);
  tag(c, ["NO HUNT"], 270, 128, win(t, EV.noHunt - 0.1, EV.savedUp, 0.2, 0.3), UI.PK, 3);
  tag(c, ["NOWHERE TO GO"], 270, 128, win(t, EV.nowhere - 0.1, EV.goEnd + 0.3, 0.25, 0.3), UI.PK, 3);
  // the zoomies
  { const k1 = sm(t, EV.fraps - 0.05, EV.fraps + 0.3), a1 = 1 - sm(t, EV.periodsEnd + 0.1, EV.periodsEnd + 0.45);
    if (k1 > 0 && a1 > 0) { bigTitle(c, "FRAPS", 270, 150, k1 * a1, { col: UI.Y, scale: 8, shake: 0, t });
      const ws = [["FRENETIC", EV.frenetic], ["RANDOM", EV.random], ["ACTIVITY", EV.activity], ["PERIODS", EV.periods]];
      ws.forEach(([w2, at], i) => { const a = sm(t, at - 0.05, at + 0.2) * a1; if (a > 0) tag(c, [w2], 135 + (i % 2) * 270, 222 + Math.floor(i / 2) * 40, a, i === 0 ? UI.L : UI.IV, 2); }); } }
  { const k2 = sm(t, EV.zoomies - 0.05, EV.zoomies + 0.3), a2 = 1 - sm(t, EV.zoomiesEnd + 0.15, EV.zoomiesEnd + 0.5);
    if (k2 > 0 && a2 > 0) bigTitle(c, "ZOOMIES!", 270, 160, k2 * a2, { col: UI.Y, scale: 7, shake: win(t, EV.zoomies, EV.zoomiesEnd, 0.2, 0.3), t, lines: 1 }); }
  // the fix
  tag(c, ["THE FIX"], 270, 128, win(t, EV.fix - 0.1, EV.hunt5 - 0.2, 0.25, 0.3), UI.GR, 3);
  tag(c, ["A HUNT BEFORE BED"], 270, 128, win(t, EV.hunt5 - 0.1, EV.play + 0.6, 0.25, 0.3), UI.GR, 3);
  tag(c, ["TIRED"], 270, 128, win(t, EV.tired - 0.1, EV.feed, 0.2, 0.3), UI.L, 3);
  { const a = win(t, EV.sHunt - 0.25, END - 0.9, 0.25, 0.45), k = sm(t, EV.skip - 0.05, EV.skip + 0.35);
    const lit = -1 + [EV.sHunt, EV.sEat, EV.sWash, EV.sSleep].reduce((s, w) => s + sm(t, w - 0.12, w + 0.08), 0);
    if (a > 0) stepIcons(c, 270, 128, ["HUNT", "EAT", "WASH", "SLEEP"], lit, a, { cross: { i: 0, k } }); }
  // the energy bar: a game HUD in the top-left corner
  { const e = energy(t); if (e.a > 0) energyBar(c, 22, 64, e.level, { a: e.a, w: 150, blink: e.blink, label: "ENERGY", t: (t * 51) / (0.9 * END) }); }   // shimmer phase: whole cycles over the loop
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
  const to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = 0; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
