// «Is a Minecraft world endless?» — pixel film (Kagenami). 540×960 grid ×2 → 1080×1920, 30 fps. No overlay: the picture
// runs edge to edge; karaoke captions sit on a soft dithered shade. One world for the whole film:
//   over the gamer's shoulder → into the monitor → through the tunnel → the view → rise above the world (the rest is void)
//   → iso: chunks load around the running player → the next area is built step by step (seed, noise, land/ocean,
//   flat/rough, hot/cold + wet/dry → biomes, 3D noise cross-section, surface, trees, ores, village) → zoom out to the whole
//   world (wall at 30,000,000, ×7 Earth, 80 days on foot, Nether 1:8) → zoom into the old Far Lands → the streamer on a
//   stream → two friends walk to the end of the world, a paper plane: send this.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { Canvas, MAIN as FONT, TINY, mix, bayer, fade, loadImage } from "../../../../renderer/pixel/raster.mjs";
import { drawGlobe } from "../../../../renderer/pixel/earth.mjs";
import * as PP from "../../ping/film/people.mjs";
import { P, stext, textW } from "../../ping/film/world.mjs";
import { tag, pointer, stamp, panel, paperPlane } from "../../ping/film/hud.mjs";
import { MAIN, FAR, B, BOX, SEA, F, FAR_X, VILLAGE, colIndex } from "./world.mjs";
import { makeState, renderIso, renderPersp, isoProject } from "./voxel.mjs";
import { renderMap, drawBorder, mapProject, worldColor, HALF } from "./map.mjs";
import { drawPerson, drawDog, drawFPArm } from "./actors.mjs";
import * as SC from "./scene.mjs";
import { clamp01, smooth, ease, easeOut, lerp, win } from "./scene.mjs";
import { EV, END, FPS, WORDS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, PI = Math.PI;
const SM = makeState(MAIN), SF = makeState(FAR);
SF.demoFlag = false; SF.shadowK = 0.6; SF.outsideY = SEA + 6; SF.outside = (out, wx, wz, bs, X, Y) => worldColor(out, wx + FAR_X, wz, bs, X, Y, 1);
const DEPTH = new Float32Array(GW * GH);
SM.hit = { x: new Float32Array(GW * GH), y: new Float32Array(GW * GH), z: new Float32Array(GW * GH), ax: new Uint8Array(GW * GH), ty: new Uint8Array(GW * GH) };
SF.hit = SM.hit;
const TWITCH = await loadImage(HERE + "media/logo-twitch-7fd57005.png", 22, 26, { kernel: "nearest" });

// ---------------------------------------------------------------- layers
const L2 = new Canvas(GW, GH, "#000000");
function dissolve(c, src, a) { if (a >= 1) { c.d.set(src.d); return; } if (a <= 0) return; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (a > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = src.d[i]; c.d[i + 1] = src.d[i + 1]; c.d[i + 2] = src.d[i + 2]; } }
const FULL = [0, 0, GW, GH];

// ---------------------------------------------------------------- 1. over the shoulder → first person
function otsCam(t) { const u = clamp01((t - EV.push[0]) / (EV.push[1] - EV.push[0])), k = 0.15 * u + 0.85 * ease(u); return { cx: lerp(-20, 0, k), cy: lerp(60, 0, k), z: Math.exp(lerp(Math.log(2.3), Math.log(960 / 90), k)) }; }
function fpInto(c, rect, clip, t, cam = SC.fpCam(t), arm = 1) {
  SM.fog = { start: cam.fogStart ?? 80, end: cam.fogEnd ?? 140 };
  renderPersp(c, rect, clip, cam, SM);
  if (arm > 0.01) { const walking = t < EV.ledge ? 1 : 0; drawFPArm(c, { x: rect.x, y: rect.y + (1 - arm) * rect.h * 0.35, w: rect.w, h: rect.h }, clip, t, cam.bob ?? 0, walking); }
}
function drawOpening(c, t) {
  SC.stateMain(SM, t);
  const cam = otsCam(t);
  if (cam.z < 960 / 90 - 1e-3) PP.drawOTS(c, cam, { t, mouse: 1, who: "you" }, (rect, clip) => fpInto(c, rect, [clip.x0, clip.y0, clip.x1, clip.y1], t));
  else { const w = lerp(1706.67, GW, ease((t - EV.crop[0]) / (EV.crop[1] - EV.crop[0]))); fpInto(c, { x: 270 - w / 2, y: 0, w, h: 960 }, FULL, t); }
}
// ---------------------------------------------------------------- 2. the rise, dissolving into the iso view
function drawRise(c, t) {
  SC.stateMain(SM, t);
  const cam = t < EV.rise[0] ? SC.fpCam(t) : SC.riseCam(t), arm = 1 - smooth(t, EV.rise[0], EV.rise[0] + 0.5);
  if (t < SC.ISO_IN[1]) fpInto(c, { x: 0, y: 0, w: GW, h: GH }, FULL, t, cam, arm);
  const a = smooth(t, SC.ISO_IN[0], SC.ISO_IN[1]);
  if (a > 0) { renderIso(L2, FULL, SC.isoCam(t), SM, DEPTH); drawHero(L2, SC.isoCam(t), t); dissolve(c, L2, a); }
}
// ---------------------------------------------------------------- 3. iso (MAIN)
function drawHero(c, cam, t) {
  const h = SC.hero(t), a = 1;
  drawPerson(c, cam, "hero", { x: h.x, y: h.y, z: h.z, face: h.moving ? h.face : (t < EV.run[0] ? PI : h.face), walk: h.moving ? t * 16 : null, alpha: a }, DEPTH);
}
function drawIso(c, t) {
  SC.stateMain(SM, t); SM.outside = null;
  const cam = SC.isoCam(t);
  renderIso(c, FULL, cam, SM, DEPTH);
  isoUnderlays(c, cam, t);
  drawHero(c, cam, t);
  isoOverlays(c, cam, t);
}
// chunk grid / highlight drawn on the terrain from the per-pixel hit positions
function isoUnderlays(c, cam, t) {
  const H = SM.hit, b = cam.b;
  const gridA = win(t, EV.chunks - 0.25, EV.arrive + 0.2, 0.35, 0.5), hl = win(t, EV.chunks - 0.1, EV.arrive - 0.3, 0.3, 0.4);
  const hero = SC.hero(Math.min(t, EV.run[1])), hcx = Math.floor(hero.x / 16), hcz = Math.floor(hero.z / 16);
  // the "?" chunk beyond the frontier
  const qa = win(t, EV.how - 0.2, EV.everything + 0.4, 0.3, 0.4), [qx, qz] = SC.QCHUNK;
  if (gridA <= 0 && hl <= 0 && qa <= 0) return;
  const lw = Math.max(0.55, 0.9 / b);
  for (let k = 0; k < GW * GH; k++) {
    const ax = H.ax[k]; const X = k % GW, Y = (k / GW) | 0;
    const x = H.x[k], z = H.z[k], fx = ((x % 16) + 16) % 16, fz = ((z % 16) + 16) % 16;
    if (ax === 2 && gridA > 0 && (fx < lw || fz < lw || fx > 16 - lw || fz > 16 - lw) && gridA * 0.8 > bayer(X, Y)) { const i = k * 3; c.d[i] = c.d[i] * 0.45 + 240 * 0.55; c.d[i + 1] = c.d[i + 1] * 0.45 + 236 * 0.55; c.d[i + 2] = c.d[i + 2] * 0.45 + 200 * 0.55; }
    if (hl > 0 && (ax === 2 || ax === 0 || ax === 3) && Math.floor(x / 16) === hcx && Math.floor(z / 16) === hcz && ax === 2) {
      const edge = fx < lw * 1.6 || fz < lw * 1.6 || fx > 16 - lw * 1.6 || fz > 16 - lw * 1.6, i = k * 3;
      if (edge && hl > bayer(X, Y)) { c.d[i] = 250; c.d[i + 1] = 214; c.d[i + 2] = 80; } else if (hl * 0.35 > bayer(X + 1, Y)) { c.d[i] = Math.min(255, c.d[i] + 40); c.d[i + 1] = Math.min(255, c.d[i + 1] + 34); c.d[i + 2] = Math.min(255, c.d[i + 2] + 8); }
    }
    if (qa > 0 && ax === 0 && Math.floor(x / 16) === qx && Math.floor(z / 16) === qz) { const e = fx < 0.6 || fz < 0.6 || fx > 15.4 || fz > 15.4, i = k * 3; if (qa * (e ? 1 : 0.25) > bayer(X, Y)) { c.d[i] = e ? 244 : 120; c.d[i + 1] = e ? 202 : 100; c.d[i + 2] = e ? 80 : 60; } }
  }
}
const proj = (cam, x, y, z) => isoProject(cam, GW, GH, x, y, z);
function isoOverlays(c, cam, t) {
  const h = SC.hero(t), hp = proj(cam, h.x, h.y + 2.4, h.z);
  // YOU (while the hero is tiny)
  { const a = Math.max(win(t, SC.ISO_IN[1] - 0.1, EV.chunks - 0.3, 0.3, 0.4), win(t, EV.run2[0], EV.how, 0.3, 0.4)) * (1 - smooth(cam.b, 4.5, 5.2)); if (a > 0) { const r = tag(c, ["YOU"], hp[0], hp[1] - 52, a, P.y, 2); if (r) pointer(c, hp[0], r.y + r.h, hp[0], hp[1] - 4, a, P.y); } }
  // NOT BUILT YET (over the void)
  { const a = win(t, EV.exist - 0.15, EV.builds + 0.4, 0.3, 0.4); if (a > 0) tag(c, ["NOT BUILT", "YET"], 270, 120, a, P.l, 3); }
  // CHUNK 16 × 16
  { const a = win(t, EV.chunks - 0.1, EV.near - 0.2, 0.3, 0.4); if (a > 0) { const hx0 = Math.floor(SC.hero(EV.run[1]).x / 16) * 16, hz0 = Math.floor(SC.hero(EV.run[1]).z / 16) * 16, y = SC.groundY(hx0 + 8, hz0 + 8);
      const top = proj(cam, hx0, y, hz0); tag(c, ["CHUNK"], top[0], top[1] - 120, a, P.y, 3);
      const sa = win(t, EV.sixteen - 0.1, EV.near - 0.2, 0.25, 0.4); if (sa > 0) { const e1 = proj(cam, hx0 + 8, y, hz0 + 16), e2 = proj(cam, hx0 + 16, y, hz0 + 8); tag(c, ["16"], e1[0] - 30, e1[1] + 8, sa, P.iv, 3); tag(c, ["16"], e2[0] + 30, e2[1] + 8, sa, P.iv, 3); } } }
  // built before you arrive: a NEW tag over the frontier
  { const a = win(t, EV.built - 0.2, EV.how - 0.2, 0.3, 0.4); if (a > 0) tag(c, ["BUILT", "AHEAD"], 270, 140, a, P.gr, 2); }
  // the "?" chunk
  { const a = win(t, EV.how - 0.1, EV.everything + 0.3, 0.3, 0.4); if (a > 0) { const [qx, qz] = SC.QCHUNK, q = proj(cam, qx * 16 + 8, 0, qz * 16 + 8); stext(c, FONT, "?", q[0], q[1] - 26, 6, P.y, { align: 0.5, alpha: a, shadow: P.ink }); } }
  // the seed falls onto the next area, with its number
  { const a = win(t, EV.everything - 0.1, EV.noise + 0.6, 0.3, 0.5); if (a > 0) { const [sx, sz] = SC.SEED_AT, k = easeOut((t - EV.everything + 0.1) / 0.8), p = proj(cam, sx, lerp(60, 2, k), sz);
      seedIcon(c, p[0], p[1], a, t); const na = win(t, EV.number - 0.15, EV.noise + 0.6, 0.25, 0.5); if (na > 0) tag(c, ["SEED", "7309486112"], p[0], p[1] - 92, na, P.gr, 2); } }
  // NOISE
  { const a = win(t, EV.noise - 0.05, EV.land - 0.2, 0.3, 0.4); if (a > 0) tag(c, ["NOISE"], 270, 96, a, P.iv, 3); }
  // land / ocean, flat / rough
  const at = (x, z, dy = 0) => proj(cam, x, SEA + dy, z);
  { const a = win(t, EV.land - 0.1, EV.two - 0.3, 0.3, 0.4); if (a > 0) { const p = at(-262, -250, 4); tag(c, ["LAND"], p[0], p[1] - 40, a, P.gr, 2); }
    const b2 = win(t, EV.ocean - 0.1, EV.two - 0.3, 0.3, 0.4); if (b2 > 0) { const p = at(-430, -330); tag(c, ["OCEAN"], p[0], p[1], b2, P.cy, 2); } }
  { const a = win(t, EV.flat - 0.1, EV.two - 0.3, 0.3, 0.4); if (a > 0) { const p = at(-250, -300, 2); tag(c, ["FLAT"], p[0] + 40, p[1] + 10, a, P.iv, 2); }
    const b2 = win(t, EV.rough - 0.1, EV.two - 0.3, 0.3, 0.4); if (b2 > 0) { const p = at(-322, -258, 30); tag(c, ["ROUGH"], p[0], p[1] - 40, b2, P.y, 2); } }
  // hot/cold, wet/dry legends; then biomes
  { const a = win(t, EV.hot - 0.1, EV.wet - 0.2, 0.3, 0.3); if (a > 0) legend(c, 270, 96, "HOT", "COLD", "#F06A3C", "#4A6AE6", a); }
  { const a = win(t, EV.wet - 0.1, EV.deserts - 0.15, 0.3, 0.3); if (a > 0) legend(c, 270, 96, "WET", "DRY", "#3CC08A", "#C8A050", a); }
  { const items = [["DESERT", EV.deserts, -230, -380, P.y], ["JUNGLE", EV.jungles, -360, -250, P.gr], ["SNOW", EV.snow, -330, -470, P.iv]];
    for (const [txt, t0, x, z, col] of items) { const a = win(t, t0 - 0.1, EV.d3 - 0.3, 0.25, 0.4); if (a > 0) { const p = at(x, z, 8); tag(c, [txt], p[0], p[1] - 20, a, col, 2); } } }
  // 3D noise: + / − on every block of the cross-section, then the legend
  crossSection(c, cam, t);
  { const a = win(t, EV.d3 - 0.1, EV.above - 0.2, 0.3, 0.3); if (a > 0) tag(c, ["3D NOISE"], 270, 92, a, P.iv, 3); }
  { const a = win(t, EV.above - 0.1, EV.caves - 0.2, 0.25, 0.4); if (a > 0) tag(c, ["+  STONE"], 150, 92, a, P.y, 3); }
  { const a = win(t, EV.ifNot - 0.1, EV.caves - 0.2, 0.25, 0.4); if (a > 0) tag(c, ["-  AIR"], 390, 92, a, P.cy, 3); }
  { const a = win(t, EV.caves - 0.1, EV.grass - 0.3, 0.25, 0.4); if (a > 0) { const p = proj(cam, -318, 31, BOX.zc); const r = tag(c, ["CAVE"], p[0] - 110, p[1] + 40, a, P.cy, 2); if (r) pointer(c, r.x + r.w, r.y + r.h / 2, p[0], p[1], a, P.cy); } }
  { const a = win(t, EV.cliffs - 0.1, EV.grass - 0.3, 0.25, 0.4); if (a > 0) { const p = proj(cam, -317, 65.5, BOX.zc); const r = tag(c, ["OVERHANG"], p[0] + 110, p[1] - 80, a, P.y, 2); if (r) pointer(c, r.x, r.y + r.h, p[0], p[1], a, P.y); } }
  // grass, trees, ores, villages
  { const items = [["GRASS", EV.grass, -312, 58, -292, P.gr], ["TREES", EV.trees, -296, 64, -300, P.gr], ["ORES", EV.ores, -326, 40, BOX.zc, P.cy], ["VILLAGE", EV.villages, VILLAGE.x, SEA + 10, VILLAGE.z, P.y]];
    items.forEach(([txt, t0, x, y, z, col], i) => { const t1 = i < items.length - 1 ? items[i + 1][1] + 0.2 : EV.notEndless - 0.45, a = win(t, t0 - 0.1, t1, 0.25, 0.35); if (a > 0) { const p = proj(cam, x, y, z); tag(c, [txt], Math.max(70, Math.min(470, p[0])), Math.max(80, Math.min(560, p[1] - 30)), a, col, 3); } }); }
}
function legend(c, cx, y, a1, a2, c1, c2, a) {
  const w = 220, x = R(cx - w / 2); panel(c, x, y, w, 46, a, P.p7); const f = fade(c, a);
  for (let i = 0; i < 120; i++) { const k = i / 119, col = mix(c1, c2, k); f.rect(x + 50 + i, y + 18, 1, 12, col); }
  stext(c, FONT, a1, x + 8, y + 16, 2, c1, { alpha: a }); stext(c, FONT, a2, x + w - 8, y + 16, 2, c2, { alpha: a, align: 1 });
}
function seedIcon(c, x, y, a, t) {
  const f = fade(c, a), s = 3, X = R(x), Y = R(y);
  const rows = ["..##..", ".####.", "######", "######", ".####.", "..##.."];
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (ch === "#") f.rect(X + (i - 3) * s, Y + (j - 6) * s, s, s, j < 2 ? "#C8A050" : i < 2 ? "#6E4A1C" : "#A0742C"); }));
  f.rect(X - 1, Y - 6 * s - 2 * s, 2, 2 * s, "#65DA41");
}
// + / − signs on the cut face (from the hit buffer: only where the face cell is actually visible)
function crossSection(c, cam, t) {
  const a = win(t, EV.checks - 0.05, EV.air + 0.3, 0.3, 0.3); if (a <= 0 || cam.b < 6) return;
  const H = SM.hit, z = BOX.zc - 1, f = fade(c, a);
  for (let y = BOX.cutY; y <= BOX.ghostTop; y++) for (let x = BOX.x0; x < BOX.x1; x++) {
    const p = proj(cam, x + 0.5, y + 0.5, BOX.zc), X = R(p[0]), Y = R(p[1]); if (X < 3 || Y < 3 || X >= GW - 3 || Y >= GH - 3) continue;
    const k = Y * GW + X; if (H.ax[k] !== 3 || Math.floor(H.x[k]) !== x || Math.floor(H.y[k]) !== y) continue;
    const v = MAIN.vox[(y * MAIN.nz + (z - MAIN.oz)) * MAIN.nx + (x - MAIN.ox)], plus = v !== 0 && v !== B.WATER, ty = H.ty[k];
    const col = plus ? (ty === B.GHOST ? "#4A3A10" : "#F4CA50") : "#1E5A9A";
    f.rect(X - 2, Y, 5, 1, col); if (plus) f.rect(X, Y - 2, 1, 5, col);
  }
}

// ---------------------------------------------------------------- 4. the world view (zoom out, map, zoom into the Far Lands)
function anchorY(t) { return lerp(GH / 2, 384, smooth(t, SC.ZOOM_OUT[0], SC.ZOOM_OUT[1])) * (1 - smooth(t, SC.ZOOM_IN[0], SC.ZOOM_IN[1])) + (GH / 2) * smooth(t, SC.ZOOM_IN[0], SC.ZOOM_IN[1]); }
function drawWorld(c, t) {
  const cam = { ...SC.worldCam(t), ay: anchorY(t) }, zoomIn = t >= SC.ZOOM_IN[0];
  const vA = smooth(cam.b, 0.45, 0.8);           // voxel view share
  if (vA < 1) renderMap(c, FULL, cam, t, { strips: stripsAt(t), ringA: win(t, EV.old - 0.15, EV.twelve, 0.3, 0.5) });
  if (vA > 0) {
    const L = vA >= 1 ? c : L2;
    if (!zoomIn) { SC.stateMain(SM, t); SM.outsideY = SEA + 3; SM.outside = (out, wx, wz, bs, X, Y) => worldColor(out, wx, wz, bs, X, Y, 1); renderIso(L, FULL, cam, SM, DEPTH); drawHero(L, cam, t); }
    else { const lc = { ...cam, x: cam.x - FAR_X }; renderIso(L, FULL, lc, SF, DEPTH); drawFarActors(L, lc, t); }
    if (L !== c) dissolve(c, L, vA);
  }
  if (cam.b < 1e-3) drawBorder(c, cam, win(t, SC.ZOOM_OUT[1] - 0.6, SC.ZOOM_IN[0] + 0.3, 0.4, 0.5), 16, t);
  mapOverlays(c, cam, t);
}
function stripsAt(t) {
  const out = []; for (let i = 0; i < 7; i++) { const t0 = EV.seven - 0.15 + i * 0.12; out.push(win(t, t0, EV.walking - 0.2, 0.15, 0.4)); } return out;
}
function mapOverlays(c, cam, t) {
  const Pm = (x, z) => mapProject(cam, GW, GH, x, SEA, z);
  // the built area as a bright dot while zooming out
  { const a = win(t, EV.endless2 - 0.2, EV.thirty - 0.2, 0.3, 0.4) * (1 - smooth(cam.b, 0.02, 0.2)); if (a > 0) { const p = Pm(-150, -150), f = fade(c, a); f.disc(R(p[0]), R(p[1]), 3, P.y); const r = tag(c, ["BUILT SO FAR"], p[0] + 70, p[1] + 40, a, P.y, 2); if (r) pointer(c, r.x, r.y, p[0] + 3, p[1] + 3, a, P.y); } }
  // the ruler: centre → wall (30,000,000 blocks)
  const ra = win(t, EV.thirty - 0.15, EV.walking - 0.1, 0.3, 0.4);
  if (ra > 0) { const k = easeOut((t - EV.thirty + 0.1) / 1.0), p0 = Pm(0, 0), p1 = Pm(HALF * k, 0), f = fade(c, ra);
    for (let o = -1; o <= 1; o++) f.line(R(p0[0]), R(p0[1]) + o, R(p1[0]), R(p1[1]) + o, o ? "#3B2C5C" : P.y);
    f.disc(R(p0[0]), R(p0[1]), 3, P.y); f.disc(R(p1[0]), R(p1[1]), 3, P.y);
    const la = win(t, EV.million - 0.1, EV.walking - 0.1, 0.3, 0.4); if (la > 0) tag(c, ["30,000,000", "BLOCKS"], (p0[0] + Pm(HALF, 0)[0]) / 2 + 10, (p0[1] + Pm(HALF, 0)[1]) / 2 + 20, la, P.y, 2); }
  { const a = win(t, EV.wall - 0.1, EV.seven - 0.3, 0.25, 0.4); if (a > 0) { const p = Pm(HALF, -HALF * 0.35); tag(c, ["WALL"], p[0] - 20, p[1] - 70, a, P.cy, 3); } }
  // Earth: the globe, then its surface laid flat ×7
  { const a = win(t, EV.seven - 0.6, EV.seven + 0.25, 0.3, 0.35); if (a > 0) { const k = smooth(t, EV.seven - 0.1, EV.seven + 0.25); const lon0 = 10 + t * 18; drawGlobe(c, { lat0: 20, lon0, R: R(lerp(60, 30, k)), cx: lerp(270, 230, k), cy: lerp(170, 250, k) }, { lat: 18, lon: lon0 - 25 }, { alpha: a }); } }
  { const a = win(t, EV.seven - 0.6, EV.walking - 0.2, 0.3, 0.4); if (a > 0) { const n = Math.max(1, Math.min(7, 1 + Math.floor((t - EV.seven + 0.15) / 0.12))); tag(c, t < EV.seven ? ["EARTH"] : [`EARTH x${n}`], 270, 96, a, P.cy, 3); } }
  // walking: 80 days
  const wa = win(t, EV.walking - 0.15, EV.nether - 0.2, 0.3, 0.4);
  if (wa > 0) { const k = ease((t - EV.walking) / (EV.nonstop + 0.3 - EV.walking)), p0 = Pm(0, 0), p = Pm(HALF * k, 0), f = fade(c, wa);
    f.line(R(p0[0]), R(p0[1]), R(p[0]), R(p[1]), P.iv, [3, 3]); headIcon(c, p[0], p[1] - 12, wa, "hero");
    const d = Math.round(80 * k); tag(c, [`DAY ${d}`], 270, 96, wa, P.y, 3); }
  // the Nether: 1:8, ten days
  const na = win(t, EV.nether - 0.2, EV.old - 0.2, 0.35, 0.4);
  if (na > 0) {
    const c0 = Pm(0, 0), nc = [c0[0], c0[1] + 205], half = (Pm(HALF, -HALF)[0] - c0[0]) / 8, f = fade(c, na);
    // portal line and the small red diamond
    f.line(R(c0[0]), R(c0[1]), R(nc[0]), R(nc[1]), "#B05CF0", [3, 2]);
    for (let y = -half / 2; y <= half / 2; y++) { const w = half * (1 - Math.abs(y) / (half / 2)); for (let x = -w; x <= w; x++) { const X = R(nc[0] + x), Y = R(nc[1] + y); const n = Math.sin(X * 0.7) * Math.cos(Y * 0.9); f.px(X, Y, n > 0.4 ? "#E8603C" : n > -0.2 ? "#9A2A2A" : "#6A1A1E"); } }
    f.ering(R(nc[0]), R(nc[1]), R(half), R(half / 2), "#F08A3C");
    tag(c, ["NETHER"], nc[0] + half + 54, nc[1] - 16, na, "#F08A3C", 2);
    const kd = ease((t - EV.nether - 0.1) / 0.5), kw = ease((t - EV.ten + 0.1) / 0.6), hp = kw > 0 ? [lerp(nc[0], nc[0] + half, kw), lerp(nc[1], nc[1] + half / 2, kw)] : [c0[0], lerp(c0[1], nc[1], kd)];
    if (t > EV.nether - 0.1) headIcon(c, hp[0], hp[1] - 10, na, "hero");
    const d = t < EV.ten - 0.1 ? 0 : Math.round(10 * kw); if (t > EV.nether) tag(c, [`DAY ${d}`], 270, 96, na, "#F08A3C", 3);
    const ba = win(t, EV.one2 - 0.1, EV.old - 0.2, 0.3, 0.4); if (ba > 0) ratio(c, 118, 582, ba);
  }
  // old versions: the Far Lands ring
  { const a = win(t, EV.old - 0.1, EV.fell + 0.2, 0.3, 0.4); if (a > 0 && cam.b < 1e-4) { const p = Pm(-12550821, 0); tag(c, ["OLD VERSIONS"], p[0] - 10, p[1] - 70, a, P.y, 2); } }
}
function farTags(c, t) { const a = win(t, EV.twelve - 0.1, EV.streamer - 0.3, 0.3, 0.4); if (a > 0) { tag(c, ["X: -12,550,821"], 270, 96, a, P.y, 3); tag(c, ["FAR LANDS"], 270, 150, smooth(t, EV.twelve + 0.3, EV.twelve + 0.6) * a, P.pk, 3); } }
function ratio(c, cx, y, a) {
  const f = fade(c, a), s = 12, x0 = R(cx - 4 * s);
  for (let i = 0; i < 8; i++) { f.rect(x0 + i * s, y, s - 1, s - 1, "#4C8A36"); f.rect(x0 + i * s, y, s - 1, 3, "#68B246"); }
  f.rect(x0, y - s - 4, 8 * s - 1, s - 1, "#9A2A2A"); f.rect(x0, y - s - 4, 8 * s - 1, 3, "#E8603C");
  stext(c, FONT, "1", x0 - 18, y - s - 3, 2, "#F08A3C", { alpha: a }); stext(c, FONT, "8", x0 - 18, y + 1, 2, P.gr, { alpha: a });
}
function headIcon(c, x, y, a, who) {
  const f = fade(c, a), X = R(x) - 5, Y = R(y) - 5, s = 2;
  const rows = who === "hero" ? ["..pp..", ".hhhh.", "hhhhhh", "ssssss", "sesses", "ssssss"] : ["..dd..", ".dddd.", "dddddd", "ssssss", "sesses", "ssssss"];
  const map = { p: "#B08AE8", h: "#6E4FB0", s: "#E8AE8E", e: "#1A1020", d: "#2A2838" };
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) f.rect(X + i * s, Y + j * s, s, s, map[ch]); }));
  f.frame(X - 1, Y - 1, 6 * s + 2, 6 * s + 2, P.ink);
}

// ---------------------------------------------------------------- 5. the Far Lands: the streamer, then the two friends
const FL = { sx0: 46, sz0: 52, sx1: 7, sz1: 10 };           // streamer path (local coords)
function groundFar(lx, lz) { const ix = Math.floor(lx), iz = Math.floor(lz); if (ix < FAR.ox || iz < FAR.oz || ix >= FAR.ox + FAR.nx || iz >= FAR.oz + FAR.nz) return SEA + 1; return Math.max(FAR.ground[colIndex(FAR, ix, iz)], SEA) + 1; }
const STREAM_WALK = [EV.fourteen - 1.6, EV.years + 0.4], FRIENDS_WALK = [EV.send - 0.4, EV.with - 0.1];
function streamerAt(t) { const k = ease((t - STREAM_WALK[0]) / (STREAM_WALK[1] - STREAM_WALK[0])), x = lerp(FL.sx0, FL.sx1, k), z = lerp(FL.sz0, FL.sz1, k); return { x, z, y: groundFar(x, z), moving: k > 0 && k < 1 }; }
function friendsAt(t) { const k = ease((t - FRIENDS_WALK[0]) / (FRIENDS_WALK[1] - FRIENDS_WALK[0])); return [[lerp(34, 13.2, k), lerp(40, 16.2, k)], [lerp(36, 14.8, k), lerp(38.4, 14.8, k)], k > 0.02 && k < 0.98]; }
export function farCamT(t) {
  const st = streamerAt(Math.min(t, EV.send)), fr = friendsAt(t)[0];
  const a = { x: st.x + 2, y: st.y + 9, z: st.z + 2, b: 8.5 }, b2 = { x: fr[0] - 0.2, y: groundFar(fr[0], fr[1]) + 3.6, z: fr[1] - 1.2, b: 27 }, k = ease((t - EV.send + 0.3) / 1.6);
  const k0 = ease((t - SC.ZOOM_IN[1]) / 1.2), c0 = { x: SC.FAR_CAM0.x - FAR_X, y: SC.FAR_CAM0.y, z: SC.FAR_CAM0.z, b: SC.FAR_CAM0.b };
  const A = { x: lerp(c0.x, a.x, k0), y: lerp(c0.y, a.y, k0), z: lerp(c0.z, a.z, k0), b: Math.exp(lerp(Math.log(c0.b), Math.log(a.b), k0)) };
  return { x: lerp(A.x, b2.x, k), y: lerp(A.y, b2.y, k), z: lerp(A.z, b2.z, k), b: Math.exp(lerp(Math.log(A.b), Math.log(b2.b), k)) };
}
function drawFar(c, t) {
  const cam = farCamT(t);
  renderIso(c, FULL, cam, SF, DEPTH);
  drawFarActors(c, cam, t);
  farOverlays(c, cam, t);
}
function drawFarActors(c, cam, t) {
  const st = streamerAt(t);
  drawDog(c, cam, { x: st.x + 0.9, y: st.y, z: st.z + 1.1, face: -PI * 0.75, walk: st.moving ? t * 14 : null }, DEPTH);
  drawPerson(c, cam, "streamer", { x: st.x, y: st.y, z: st.z, face: -PI * 0.75, walk: st.moving ? t * 13 : null }, DEPTH);
  const [h, f, mv] = friendsAt(t), fa = smooth(t, FRIENDS_WALK[0] - 0.3, FRIENDS_WALK[0] + 0.2);
  if (fa > 0) {
    const wave = smooth(t, EV.with - 0.2, EV.with + 0.3);
    drawPerson(c, cam, "friend", { x: f[0], y: groundFar(f[0], f[1]), z: f[1], face: -PI * 0.75 + wave * 1.1, walk: mv ? t * 13 + 1 : null, alpha: fa, wave: smooth(t, EV.with + 0.1, EV.with + 0.5) * 0.6 }, DEPTH);
    drawPerson(c, cam, "hero", { x: h[0], y: groundFar(h[0], h[1]), z: h[1], face: -PI * 0.75 - wave * 0.9, walk: mv ? t * 13 : null, alpha: fa }, DEPTH);
  }
}
function farOverlays(c, cam, t) {
  // the stream
  const sa = win(t, EV.streamer - 0.25, EV.send - 0.15, 0.35, 0.4);
  if (sa > 0) streamPanel(c, t, sa);
  // send this to the friend
  const pa = win(t, EV.send - 0.1, END, 0.3, 0.1), sent = smooth(t, EV.world3 + 0.1, EV.world3 + 0.4);
  if (pa > 0) { if (sent < 1) tag(c, ["SEND"], 270, 110, pa * (1 - sent), P.cy, 4); if (sent > 0) tag(c, ["SENT ✓"], 270, 110, pa * sent, P.gr, 4); }
  // the paper plane: from the viewer (lower right) to the friend
  const t0 = EV.friend - 0.1, t1 = EV.world3 + 0.1, u = clamp01((t - t0) / (t1 - t0)), a = smooth(t, t0 - 0.05, t0 + 0.05) * (1 - smooth(t, t1 + 0.05, t1 + 0.35));
  if (a > 0 && u < 1) { const [, f] = friendsAt(t1), tp = proj(cam, f[0], groundFar(f[0], f[1]) + 1.6, f[1]), A = [560, 900], path = (q) => { const e = ease(q); return [lerp(A[0], tp[0], e) - Math.sin(e * PI) * 90, lerp(A[1], tp[1], e) - Math.sin(e * PI) * 120]; };
    const [x, y] = path(u), [nx, ny] = path(clamp01(u + 0.01)); paperPlane(c, x, y, Math.atan2(ny - y, nx - x), 1.6 * lerp(1.4, 0.8, u), a); }
}
function streamPanel(c, t, a) {
  const x = 22, y = 70, w = 496, h = 262, f = fade(c, a);
  panel(c, x, y, w, h, a, "#9146FF", "#120C1D");
  // header: pixelated Twitch glitch logo (Wikimedia Commons, PD, trademarked), channel, LIVE
  f.rect(x + 3, y + 3, w - 6, 34, "#1F1A2E");
  for (let j = 0; j < TWITCH.h; j++) for (let i = 0; i < TWITCH.w; i++) { const k = (j * TWITCH.w + i) * 4; if (TWITCH.data[k + 3] > 110) f.px(x + 10 + i, y + 7 + j, [TWITCH.data[k], TWITCH.data[k + 1], TWITCH.data[k + 2]]); }
  stext(c, FONT, "KURTJMAC", x + 42, y + 13, 2, P.iv, { alpha: a });
  const lw = textW(FONT, "LIVE", 2) + 10; f.rect(x + w - lw - 12, y + 10, lw, 20, "#E8344E"); stext(c, FONT, "LIVE", x + w - lw - 7, y + 13, 2, P.iv, { alpha: a });
  // webcam: a generic streamer with headphones (not a likeness)
  const wx = x + 12, wy = y + 46, ww = 170, wh = 140; f.rect(wx, wy, ww, wh, "#241C38");
  for (let j = 0; j < wh; j++) for (let i = 0; i < ww; i++) { const d = Math.hypot(i - ww * 0.75, j - wh * 0.2); if (d < 40 && (40 - d) / 40 * 0.5 > bayer(wx + i, wy + j)) f.px(wx + i, wy + j, "#4A3A78"); }
  webcamPerson(c, wx + ww / 2, wy + wh, t, a);
  // title + years
  stext(c, FONT, "FAR LANDS OR BUST", x + 14, y + 200, 2, P.y, { alpha: a });
  const k = clamp01((t - EV.fourteen + 0.05) / 0.6), yr = 2011 + Math.round(14 * k);
  stext(c, FONT, `${2011} -> ${yr}`, x + 14, y + 228, 3, P.iv, { alpha: a });
  if (t > EV.fourteen + 0.1) { const ya = smooth(t, EV.fourteen + 0.1, EV.fourteen + 0.4) * a; tag(c, ["14 YEARS"], x + 380, y + 206, ya, P.gr, 3); }
  // chat
  const chat = [["GG", 0], ["14 YEARS!", 0.35], ["WE MADE IT", 0.7], ["FAR LANDS", 1.05], ["<3 <3", 1.4]];
  const cx = x + 194, cy = y + 52;
  chat.forEach(([msg, d], i) => { const ca = smooth(t, EV.streamer + d, EV.streamer + d + 0.25) * a; if (ca <= 0) return; const nm = ["MOSSY", "PIXEL", "BLOCK42", "JUNO_FAN", "NOODLE"][i], cols = [P.gr, P.cy, P.y, P.pk, P.l][i];
    stext(c, FONT, nm + ":", cx, cy + i * 28, 2, cols, { alpha: ca }); stext(c, FONT, msg, cx + textW(FONT, nm + ":", 2) + 6, cy + i * 28, 2, P.iv, { alpha: ca }); });
}
function webcamPerson(c, cx, by, t, a) {
  const f = fade(c, a), X = R(cx), Y = R(by), s = 6, bob = Math.round(Math.sin(t * 3) * 1);
  const rows = [
    "....hhhhhhhh....", "...hhhhhhhhhh...", "..khhhhhhhhhhk..", "..kssssssssssk..", "..kssessssessk..", "..kssssssssssk..", "...ssssmmssss...", "....ssssssss....",
    "......ssss......", "...tttttttttt...", "..tttttttttttt..", ".tttttttttttttt.", "tttttttttttttttt",
  ];
  const map = { h: "#3A2A20", k: "#1A1A22", s: "#E6B48E", e: "#1A1020", m: "#9E4A44", t: "#2A9C9A" };
  rows.forEach((row, j) => [...row].forEach((ch, i) => { if (map[ch]) f.rect(X + (i - 8) * s, Y - (rows.length - j) * s + (j < 9 ? bob : 0), s, s, map[ch]); }));
  f.rect(X - 9 * s, Y - 10 * s + bob, 2 * s, 1 * s, "#1A1A22"); f.rect(X - 4 * s, Y - 14 * s + bob, 8 * s, 1, "#1A1A22");
  // the mic
  f.rect(X + 6 * s, Y - 6 * s, s, 4 * s, "#1A1A22"); f.rect(X + 5 * s, Y - 8 * s, 3 * s, 2 * s, "#3A3A48");
}

// ---------------------------------------------------------------- captions (karaoke, same style as the earlier pixel films; "3" + "D" read as 3D)
const VOICE_TEXT = VOICE.text;
const CW = (() => { const out = []; for (let i = 0; i < WORDS.length; i++) { const w = WORDS[i], n = WORDS[i + 1]; if (w.text === "3" && n && n.text === "D") { out.push({ ...w, text: "3D", end: n.end, charEnd: n.charEnd }); i++; } else out.push(w); } return out; })();
const GROUPS = (() => {
  const gs = []; let cur = [];
  const after = (w) => VOICE_TEXT.slice(w.charEnd, w.charEnd + 3).replace(/["“”\s]/g, ""), clean = (w) => w.text.replace(/["“”]/g, "").replace(/[:;]$/, ""), len = (ws) => ws.map(clean).join(" ").length;
  for (const w of CW) { const last = cur[cur.length - 1];
    if (cur.length && (len([...cur, w]) > 22 || cur.length >= 5 || /^[.?!:]/.test(after(last)) || /[.?!:]$/.test(last.text) || ((/,$/.test(last.text) || /^,/.test(after(last))) && len(cur) >= 12))) { gs.push(cur); cur = []; }
    cur.push({ ...w, shown: clean(w) }); }
  if (cur.length) gs.push(cur); return gs.map((ws) => ({ ws, start: ws[0].start }));
})();
GROUPS.forEach((g, i) => { const next = GROUPS[i + 1], e = g.ws[g.ws.length - 1].end; g.show = Math.max(0, g.start - 0.12); g.hide = next ? Math.min(next.start - 0.29, e + 0.9) : Math.min(END - 0.2, e + 1.2) - 0.15; });
const CAP_Y = 690;
function captions(c, t) {
  for (const g of GROUPS) {
    if (t < g.show || t > g.hide + 0.16) continue;
    const a = Math.min(smooth(t, g.show, g.show + 0.18), 1 - smooth(t, g.hide, g.hide + 0.15)); if (a <= 0) continue;
    const o = { scale: 3 }, words = g.ws.map((w) => w.shown.toUpperCase()), w = c.measure(FONT, words.join(" "), o), y0 = CAP_Y + R((1 - a) * 6);
    let x = R(270 - w / 2);
    words.forEach((txt, i) => { const wd = g.ws[i], ww = c.measure(FONT, txt, o), fillX = x + ww * clamp01((t - wd.start) / Math.max(0.12, wd.end - wd.start)), toIv = smooth(t, wd.end, wd.end + 0.3);
      c.text(FONT, txt, x + 1, y0 + 1, P.ink, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : P.ink) });
      c.text(FONT, txt, x, y0, P.iv, { scale: 3, colorAt: (X, Yy) => (a < 1 && a <= bayer(X, Yy) ? null : t < wd.start || X >= fillX ? mix(P.iv, "#000000", 0.62) : toIv > bayer(X + 3, Yy + 1) ? P.iv : P.y) });
      x += ww + c.measure(FONT, " ", o) + 3; });
  }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  const c = new Canvas(GW, GH, "#000000"), m = SC.mode(t);
  if (m === "ots") drawOpening(c, t);
  else if (m === "persp") drawRise(c, t);
  else if (m === "iso") drawIso(c, t);
  else if (m === "world") drawWorld(c, t);
  else drawFar(c, t);
  if (m === "world" || m === "far") farTags(c, t);
  c.tint(0, 640, GW, 150, (x, y) => 0.55 * Math.sin(PI * (y - 640) / 150), "#0B0812", 6);
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
  for (const s of args[1].split(",")) { const t = Number(s), t0 = Date.now(); await sharp(Buffer.from(toFull(frame(t))), { raw: { width: 1080, height: 1920, channels: 3 } }).png().toFile(HERE + `stills/t${t.toFixed(2)}.png`); console.log("still", t, SC.mode(t), Date.now() - t0, "ms"); }
} else if (args[0] === "--video") {
  const from = Number(args[1] ?? 0), to = Math.round(END * FPS), out = HERE + "video-noaudio.mp4";
  const ff = spawn("/Users/rv/Desktop/Motion Studio/bin/ffmpeg", ["-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920", "-r", String(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "16", "-pix_fmt", "yuv420p", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv", out], { stdio: ["pipe", "inherit", "inherit"] });
  const t0 = Date.now();
  for (let f = from; f < to; f++) { if (!ff.stdin.write(Buffer.from(toFull(frame(f / FPS))))) await new Promise((r) => ff.stdin.once("drain", r)); if (f % 150 === 0) console.log(`frame ${f}/${to} ${((Date.now() - t0) / 1000).toFixed(0)}s`); }
  ff.stdin.end(); await new Promise((r) => ff.on("close", r)); console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
}
