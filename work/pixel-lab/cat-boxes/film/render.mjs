// «Why do cats love boxes?» — pixel film, loop. 540×960 grid ×2 → 1080×1920, 30 fps. No header overlay: the picture
// runs to every edge; captions sit over a soft dithered shade. The same apartment, cat and owner as «Your cat sleeps
// all day…»; new props: the fancy bed, the cardboard box, paper shapes on the floor, the shelter panel, a thermometer.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN, mix, bayer, fade } from "../../../../renderer/pixel/raster.mjs";
import { GW, GH, ground, sm, ease, lerp, win, clamp01, gate } from "../../cat-zoomies/film/layout.mjs";
import { drawApartment, drawFront, lightAt, litView } from "../../cat-zoomies/film/apartment.mjs";
import { drawCat } from "../../cat-zoomies/film/cat.mjs";
import { drawPerson } from "../../cat-zoomies/film/person.mjs";
import { tag, soundWaves } from "../../cat-zoomies/film/hud.mjs";
import { drawBox, drawBed, drawPaper, shelterPanel, cageBox, thermometer, heatAura, boxClip } from "./props.mjs";
import { EV, END, FPS, WORDS, VOICE, hookTau } from "./timeline.mjs";
import { camera, world, catTrack, personTrack, props, shelter, thermo, SET } from "./direction.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const K = "#000000", R = Math.round;
const UI = { O: "#0B0812", IV: "#FDFEED", Y: "#F4CA50", L: "#E0CDF8", P: "#8D59DA", PK: "#E03056", GR: "#65DA41", CY: "#7FE3F0", OR: "#F59A3A" };
const SEAM = new Canvas(GW, GH, K);

function drawTrack(g, entries, fn) { for (const e of entries) { let v = gate(g, e.lo, e.hi); if (e.a < 1) v = fade(v, e.a); if (e.a > 0 && e.hi > e.lo) fn(v, e); } }

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

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, K), cam = camera(t), G = ground(cam), W = world(t), P = props(t);
  drawApartment(c, cam, W);
  if (t > END - 1) { const k = sm(t, END - 1, END - 1 / FPS); SEAM.d.set(c.d); drawApartment(SEAM, cam, { ...W, t: t - END }); for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (bayer(x, y) < k) { const i = (y * GW + x) * 3; c.d[i] = SEAM.d[i]; c.d[i + 1] = SEAM.d[i + 1]; c.d[i + 2] = SEAM.d[i + 2]; } }
  const L0 = lightAt(W, 0, -60), LV = litView(c, L0);
  // paper sheets on the floor
  if (P.paperSquare > 0) drawPaper(LV, G, SET.paper, "square", { alpha: P.paperSquare, t });
  if (P.paperKanizsa > 0) drawPaper(LV, G, SET.paper, "kanizsa", { alpha: P.paperKanizsa, glow: P.glow, corners: P.corners, t });
  // the owner walks behind the bed and the box
  let personAn = null;
  drawTrack(LV, personTrack(t), (g, e) => { const an = drawPerson(g, G, e.x, e.y, e.st); if (e.lo === 0) personAn = an; });
  drawBed(LV, G, SET.bed, "back", { tag: P.bedTag, shine: P.bedShine, t: hookTau(t) });   // sparkle phase restarts off-screen (END − 3 s), so the loop seam matches
  drawBox(LV, G, SET.box, "back", { flaps: 1, tape: 1, label: true, wobble: P.boxWobble, wobbleAmt: 1, cut: P.cut });
  let catAn = null;
  drawTrack(LV, catTrack(t), (g0, e) => { const g = e.inBox ? boxClip(g0, G, SET.box, { cut: P.cut }) : g0; const an = drawCat(g, G, e.x, e.y, e.st); if (e.lo === 0 || !catAn) catAn = { ...an, st: e.st }; });
  drawBed(LV, G, SET.bed, "front", { tag: P.bedTag, shine: P.bedShine, t: hookTau(t) });
  drawBox(LV, G, SET.box, "front", { flaps: 1, tape: 1, label: true, wobble: P.boxWobble, wobbleAmt: 1, cut: P.cut });
  drawFront(c, cam, W);
  // warmth around the curled cat
  { const a = win(t, EV.keeps - 0.4, EV.closeEnd + 0.2, 0.5, 0.5); if (a > 0 && catAn && catAn.bbox) { const [x0, y0, x1, y1] = catAn.bbox; heatAura(c, x0 - 30, y0 - 70, x1 + 30, y1 + 6, t, a); } }
  hud(c, t, G, W, catAn, personAn);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin((Math.PI * (y - 640)) / 150), "#0B0812", 6);
  captions(c, t);
  return c;
}

function cagePlane(cage, scale) { return { z: scale, X: (wx) => (cage.x0 + cage.x1) / 2 + wx * scale, Y: (wy) => cage.floorY + wy * scale, wx: (sx) => (sx - (cage.x0 + cage.x1) / 2) / scale, wy: (sy) => (sy - cage.floorY) / scale }; }

function hud(c, t, G, W, catAn, personAn) {
  // price tags: the fancy bed and the free box
  { const bx = G.X(SET.bed), by = G.Y(-58); tag(c, ["$89"], bx, by - 30, win(t, EV.fancy - 0.1, EV.random, 0.25, 0.35), UI.Y, 3); }
  { const bx = G.X(SET.box), by = G.Y(-78); tag(c, ["FREE"], bx, by - 30, win(t, EV.box1 - 0.1, EV.random + 0.2, 0.25, 0.35), UI.GR, 3); }
  // the doorbell: stress → hide
  soundWaves(c, 60, 300, ((t - EV.stressed + 0.3) * 1.5) % 1, 1, win(t, EV.stressed - 0.35, EV.fight + 0.2, 0.2, 0.3), "DING DONG");
  tag(c, ["STRESS!"], 270, 128, win(t, EV.stressed - 0.05, EV.fight - 0.1, 0.2, 0.25), UI.PK, 3);
  tag(c, ["FIGHT? NO"], 270, 128, win(t, EV.fight - 0.05, EV.hides - 0.1, 0.2, 0.25), UI.L, 3);
  tag(c, ["HIDE!"], 270, 128, win(t, EV.hides - 0.05, EV.hidesEnd + 0.2, 0.2, 0.3), UI.GR, 3);
  // the shelter study (the room dims behind the panel)
  { const S = shelter(t); if (W.dim > 0) c.tint(0, 0, GW, 640, () => 0.6 * W.dim, "#0B0812", 6);
    if (S.a > 0) {
      tag(c, ["SHELTER", "NETHERLANDS"], 270, 112, win(t, EV.shelter - 0.1, EV.weeksEnd + 0.1, 0.3, 0.4), UI.OR, 2);
      const P2 = shelterPanel(c, 34, 176, 472, 400, S);
      if (P2) {
        const scale = Math.min((P2.left.x1 - P2.left.x0) / 120, (P2.left.floorY - P2.left.y0) / 80);
        const gl = fade(c, S.a), GL = cagePlane(P2.left, scale), GR2 = cagePlane(P2.right, scale);
        cageBox(gl, P2.left, "back", scale);
        // left: in its box, tense → relaxed after three days; right: crouched in the corner → relaxed after two weeks
        const gL = P2.left.clip(boxClip(gl, GL, 0, { cut: 0.7 })), gR = P2.right.clip(gl);
        drawCat(gate(gL, 0, 1 - S.relaxL), GL, 0, 0, { pose: "crouch", facing: 1, tension: 0.9, wiggle: 0 });
        drawCat(gate(gL, 1 - S.relaxL, 1), GL, 0, 0, { pose: "sleep", facing: 1, breath: t / 3 });
        cageBox(gl, P2.left, "front", scale);
        drawCat(gate(gR, 0, 1 - S.relaxR), GR2, 18, 0, { pose: "crouch", facing: -1, tension: 1, wiggle: 0, eyeBig: 1 });
        drawCat(gate(gR, 1 - S.relaxR, 1), GR2, 0, 0, { pose: "sleep", facing: 1, breath: t / 3 });
        P2.bars(gl);
      }
    } }
  // warmth: the thermometer
  { const T = thermo(t); if (T.a > 0) thermometer(c, 24, 170, T); }
  tag(c, ["A BOX IS WARM"], 300, 128, win(t, EV.warm - 0.1, EV.catsBest - 0.1, 0.25, 0.3), UI.OR, 3);
  // the hunter's hideout
  tag(c, ["HUNTER'S HIDEOUT"], 270, 128, win(t, EV.hunter - 0.05, EV.inside1, 0.25, 0.3), UI.Y, 3);
  tag(c, ["SEES EVERYTHING"], 270, 128, win(t, EV.sees1 - 0.1, EV.nobody - 0.05, 0.25, 0.25), UI.CY, 3);
  tag(c, ["NOBODY SEES IT"], 270, 128, win(t, EV.nobody - 0.05, EV.catEnd + 0.2, 0.25, 0.3), UI.L, 3);
  if (personAn && personAn.head) { const k = win(t, EV.catEnd - 0.3, EV.catEnd + 0.9, 0.15, 0.4); if (k > 0) tag(c, ["!"], personAn.head[0] + 34, personAn.head[1] - 60, k, UI.PK, 3); }
  // the paper shapes
  tag(c, ["PAPER SHAPES"], 270, 128, win(t, EV.paper - 0.1, EV.sat1 - 0.1, 0.25, 0.3), UI.L, 3);
  tag(c, ["A DRAWN SQUARE"], 270, 128, win(t, EV.drawn - 0.15, EV.even - 0.1, 0.25, 0.3), UI.Y, 3);
  tag(c, ["NO SQUARE AT ALL"], 270, 128, win(t, EV.wasnt - 0.1, EV.four - 0.1, 0.25, 0.3), UI.PK, 3);
  tag(c, ["4 CORNERS", "TRICK THE EYE"], 270, 120, win(t, EV.four - 0.05, EV.eyeEnd + 0.2, 0.25, 0.3), UI.Y, 3);
  tag(c, ["KEEP THE BOX"], 270, 128, win(t, EV.keep - 0.1, EV.me - 0.1, 0.25, 0.3), UI.GR, 3);
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
