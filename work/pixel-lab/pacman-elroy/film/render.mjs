// «Pac-Man's red ghost gets faster when you're almost done» — pixel film, top-down arcade maze, loop. 540×960 → 1080×1920.
// No overlay: the picture runs to every edge (maze, cabinet sides, control panel to the bottom); captions over a soft
// dithered shade. The game is replayed from game.json by the rules engine (game.mjs); clock A plays the climax under
// the hook, a dissolve (◀◀) goes back to clock B, which runs forward to the same climax at END (timeline.mjs).
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { MW, MH, DOTS, DIRS, REV, CORNER, cell } from "./maze.mjs";
import { GAMECFG, pac, ghost, dotsLeft, elroyAt, modeAt, eatTime, DOTS0, T20, T10, SCATTER, moved, GHOSTS, SPEED, EATS } from "./game.mjs";
import { EV, END, FPS, WORDS, VOICE, makeClocks, TD, RA } from "./timeline.mjs";
import { drawMaze, drawPac, drawGhost, toS, PAL, SX, SY } from "./sprites.mjs";
import { GW, GH, K, R, C, GC, clamp01, smooth, ease, lerp, win, panel, dtext, tw, tag, dash, marker, ring, drawCabinet, captionShade, captionGroups, captions, fade, mix, bayer, MAIN } from "./hud.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const TST = GAMECFG.Tstar, E2 = GAMECFG.e2;
export const CLK = makeClocks(GAMECFG);
const wrapT = (t) => ((t % END) + END) % END;
const sc = (cam, x, y) => toS(cam, x, y);
// the game time shown at film time t (clock A before the dissolve, clock B after; during it both, mixed)
const tauMain = (t) => (wrapT(t) < TD[0] + (TD[1] - TD[0]) / 2 ? CLK.A(t) : CLK.B(t));

// ---------------------------------------------------------------- dots
const BLINK_HZ = Math.round(2.2 * END) / END;
const dotsAt = (τ) => ({ list: DOTS, alpha(d) { const k = `${d.x},${d.y}`; if (!DOTS0.has(k)) return 0; const e = eatTime.get(k); if (e === undefined) return 1; return 1 - smooth(τ, e - 0.09, e); }, blink(t) { return clamp01(0.5 + 1.6 * Math.sin(2 * Math.PI * BLINK_HZ * t)); } });

// ---------------------------------------------------------------- Blinky's Elroy look (speed lines, frown), cross-faded at the thresholds
const elroyLook = (τ) => (T20 == null ? 0 : smooth(τ, T20, T20 + 0.45)) + (T10 == null ? 0 : smooth(τ, T10, T10 + 0.45));
function drawElroy(c, cam, g, lv, t, a = 1) {
  if (lv <= 0) return; const d = DIRS[g.dir], z = cam.z, f = fade(c, a * Math.min(1, lv));
  // speed lines streaming behind him (longer at Elroy 2)
  for (let i = 0; i < 3; i++) { const off = (i - 1) * 0.36, len = (0.7 + 0.5 * Math.min(1, lv - 1 > 0 ? lv - 1 : 0)) * (1 + 0.25 * Math.sin(t * 13 + i * 2)), [x0, y0] = sc(cam, g.x - d[0] * 0.9 + (d[1] ? off : 0), g.y - d[1] * 0.9 + (d[0] ? off : 0)), [x1, y1] = sc(cam, g.x - d[0] * (0.9 + len) + (d[1] ? off : 0), g.y - d[1] * (0.9 + len) + (d[0] ? off : 0));
    const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)); for (let k = 0; k <= n; k += 2) { const q = k / Math.max(1, n); if (q > 0.85 && bayer(k, i) > 0.5) continue; f.rect(R(lerp(x0, x1, q)), R(lerp(y0, y1, q)), Math.max(1, R(z / 22)), Math.max(1, R(z / 22)), q < 0.4 ? "#FFC2C2" : "#F2283C"); } }
  // a frown over the eyes
  const [X, Y] = sc(cam, g.x, g.y), w = z * 0.2, th = Math.max(1, R(z / 20));
  for (const s of [-1, 1]) for (let k = 0; k <= R(w); k++) f.rect(R(X + s * (z * 0.12 + k)), R(Y - z * 0.5 + k * 0.45 * 1), th, th, "#5C0F1E");
}

// ---------------------------------------------------------------- world at game time τ
function drawWorld(c, cam, τ, t) {
  drawMaze(c, cam, t, dotsAt(τ));
  drawCabinet(c, cam, MH, { MW });
  const lv = elroyLook(τ);
  for (const n of ["orange", "blue", "pink", "red"]) { const g = ghost(n, τ), lookD = DIRS[g.dir]; drawGhost(c, cam, g.x, g.y, n, [lookD[0], lookD[1]], τ * 2.2 + GHOSTS.indexOf(n) * 0.25); if (n === "red") drawElroy(c, cam, g, lv, t); }
  const P = pac(τ), d = DIRS[P.dir]; drawPac(c, cam, P.x, P.y, Math.atan2(d[1], d[0]), 0.5 - 0.5 * Math.cos(2 * Math.PI * moved(τ)));
}

// ---------------------------------------------------------------- camera (a function of film time; the climax framing is a function of the game state, so both ends agree)
const SAFE = { x0: 26, x1: 514, y0: 64, y1: 628 }, UNDER = { x0: 26, x1: 514, y0: 210, y1: 628 }, UNDER2 = { x0: 26, x1: 514, y0: 330, y1: 628 };
function frameOn(pts, { zmax = 70, zmin = 18, pad = 1.6, at = 0.5, safe = SAFE } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); }
  const z = Math.max(zmin, Math.min(zmax, (safe.x1 - safe.x0) / (x1 - x0), (safe.y1 - safe.y0) / (y1 - y0)));
  return { cx: (x0 + x1) / 2 + (SX - (safe.x0 + safe.x1) / 2) / z, cy: (y0 + y1) / 2 + (SY - lerp(safe.y0, safe.y1, at)) / z, z };
}
const pp = (o) => [o.x, o.y];
const climaxCam = (τ) => frameOn([pp(pac(τ)), pp(ghost("red", τ))], { zmax: 50, zmin: 30, pad: 2.4, safe: UNDER });
const MAZE_UNDER = frameOn([[0, 0], [MW, MH]], { zmax: 24.5, zmin: 10, pad: 0.4, safe: UNDER2 });
const MAZE_UNDER1 = frameOn([[0, 0], [MW, MH]], { zmax: 24.5, zmin: 10, pad: 0.4, safe: UNDER });
const BEATS = [
  { a: 0, b: 2.7, cam: (t) => climaxCam(CLK.A(t)) },
  { a: 4.2, b: 13.5, cam: () => MAZE_UNDER1 },
  { a: 14.0, b: 19.2, cam: (t) => { const τ = CLK.B(t); return frameOn([pp(pac(τ)), pp(ghost(E2.n, τ))], { zmax: 46, zmin: 26, pad: 2.6, safe: UNDER }); } },
  { a: 19.8, b: 20.8, cam: () => MAZE_UNDER1 },
  { a: 21.3, b: 25.3, cam: (t) => climaxCam(CLK.B(t)) },
  { a: 26.0, b: 30.0, cam: () => MAZE_UNDER1 },
  { a: 30.6, b: 39.4, cam: (t) => climaxCam(CLK.B(t)) },
  { a: 40.2, b: END, cam: (t) => climaxCam(CLK.B(t)) },
];
function rawCam(t) {
  let i = 0; while (i < BEATS.length - 1 && BEATS[i + 1].a <= t) i++;
  const A = BEATS[i], ca = A.cam(Math.min(t, A.b));
  if (t <= A.b || i === BEATS.length - 1) return ca;
  const B = BEATS[i + 1], cb = B.cam(B.a), k = ease((t - A.b) / (B.a - A.b));
  return { cx: lerp(ca.cx, cb.cx, k), cy: lerp(ca.cy, cb.cy, k), z: Math.exp(lerp(Math.log(ca.z), Math.log(cb.z), k)) };
}
export const camMoves = BEATS.slice(0, -1).map((A, i) => { const B = BEATS[i + 1], za = A.cam(A.b).z, zb = B.cam(B.a).z; return { a: A.b, b: B.a, zoomIn: zb > za, k: Math.max(za, zb) / Math.min(za, zb) }; }).filter((m) => m.k > 1.3);
const NF = Math.round(END * FPS), CAMS = []; for (let f = 0; f < NF; f++) CAMS.push(rawCam(f / FPS));
const SM = 6;
export function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % NF; let cx = 0, cy = 0, lz = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % NF) + NF) % NF], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) }, tt = wrapT(t), ex = Math.max(1 - smooth(tt, 0.3, 0.8), smooth(tt, END - 0.7, END - 0.2));
  if (ex <= 0) return s; const e = climaxCam(tt < 1 ? CLK.A(tt) : CLK.B(tt)); return { cx: lerp(s.cx, e.cx, ex), cy: lerp(s.cy, e.cy, ex), z: Math.exp(lerp(Math.log(s.z), Math.log(e.z), ex)) };
}

// ---------------------------------------------------------------- the top panel: dots left + speeds (a function of game time → same at both ends)
const BAR = { x: 22, y: 64, w: 496, h: 128 };
function speedBar(c, x, y, w, label, val, col, a, k = 1) { if (a <= 0) return; const g = fade(c, a); dtext(c, label, x, y, col, a, 2); const bx = x + 118, bw = w - 118 - 46; g.rect(bx, y - 1, bw, 14, "#2A1F48"); g.rect(bx, y - 1, R(bw * (val / 100) * k), 14, col); g.rect(bx, y - 1, R(bw * (val / 100) * k), 3, mix(col, "#FFFFFF", 0.4)); dtext(c, String(Math.round(val)), bx + bw + 8, y, C.IV, a, 2); }
function topPanel(c, t, τ, a) {
  if (a <= 0) return; const { x, y, w, h } = BAR; panel(c, x, y, w, h, a, C.Y);
  const n = dotsLeft(τ), lv = elroyLook(τ);
  dtext(c, "DOTS LEFT", x + 16, y + 14, C.L, a, 2); dtext(c, String(n).padStart(2, " "), x + 16, y + 40, n <= 10 ? C.PK : n <= 20 ? "#FF9A6B" : C.IV, a, 7);
  const blinky = 75 + 5 * Math.min(1, lv) + 5 * Math.max(0, lv - 1);
  speedBar(c, x + 150, y + 30, w - 160, "YOU", 80, PAL.pac[2], a);
  speedBar(c, x + 150, y + 62, w - 160, "BLINKY", blinky, GC.red, a);
  dtext(c, "100 = TOP SPEED", x + 150, y + 96, C.GREY, a, 2);
  const el = lv > 0.02 ? Math.min(1, lv) : 0; if (el > 0) dtext(c, lv > 1.5 ? "> YOU" : "= YOU", x + w - 74, y + 96, lv > 1.5 ? C.PK : C.Y, a * el, 2);
}

// ---------------------------------------------------------------- the race strip (illustration of the numbers, not the game)
const STRIP = { x: 22, y: 64, w: 496, h: 140 };
function raceStrip(c, t, a) {
  if (a <= 0) return; const { x, y, w, h } = STRIP; panel(c, x, y, w, h, a, C.Y);
  dtext(c, "LEVEL ONE · 100 = TOP SPEED", x + 16, y + 12, C.L, a, 2);
  const L1 = y + 58, L2 = y + 108, X0 = x + 70, X1 = x + w - 24, g = fade(c, a);
  for (const Ly of [L1, L2]) { g.rect(x + 14, Ly - 20, w - 28, 2, PAL.line); g.rect(x + 14, Ly + 18, w - 28, 2, PAL.line); }
  // speeds in strip px per film second (100 = 80 px/s); dots in lane 1 from "every dot", one-frame stops (pause = 1/8 tile)
  const vP = 0.8 * 80, vG = 0.75 * 80, t0 = EV.run - 0.2, dotOn = smooth(t, EV.dot - 0.2, EV.dot + 0.3), tile = 16, pause = tile / vP / 8;
  const runT = Math.max(0, t - t0), tDots = Math.max(0, t - (EV.every)), eatingStart = (EV.every - t0) * vP;
  // Pac-Man: plain running until "every", then every tile costs tile/vP + pause
  let px = runT * vP; if (tDots > 0) { const per = tile / vP + pause, k = Math.floor(tDots / per), r = tDots - k * per; px = eatingStart + k * tile + Math.min(tile, r * vP); }
  // the strip scrolls with the pair (no wrap-around): world x → screen x = XC + (x − mid)
  const gx = runT * vG - 26, mid = (px + gx) / 2, XC = (X0 + X1) / 2 + 20, toX = (v) => XC + (v - mid), P = toX(px), G0 = toX(gx);
  for (const Ly of [L1, L2]) for (let k = Math.floor((mid - 260) / 32); k <= Math.ceil((mid + 260) / 32); k++) { const X = toX(k * 32); if (X > x + 16 && X < x + w - 16) g.rect(R(X), Ly + 14, 2, 4, PAL.lineLo); }
  const pz = 26, cam = (X, Y) => ({ cx: -(X - SX) / pz, cy: -(Y - SY) / pz, z: pz });
  // dots ahead of Pac-Man in lane 1 (eaten as he passes), only once eating starts
  if (dotOn > 0) for (let i = 0; i < 60; i++) { const dx = eatingStart + i * tile + tile * 0.7; if (dx < px + 4) continue; const X = toX(dx); if (X < x + 16 || X > x + w - 16) continue; fade(c, a * dotOn).rect(R(X) - 2, L1 - 2, 4, 4, PAL.dot); }
  drawPac(c, cam(P, L1), 0, 0, 0, 0.5 - 0.5 * Math.cos(px / 6), a);
  drawGhost(c, cam(G0, L2), 0, 0, "red", [1, 0], t * 2, a);
  dtext(c, "YOU", x + 18, L1 - 7, PAL.pac[2], a, 2); dtext(c, "GHOST", x + 16, L2 - 7, GC.red, a, 2);
  const youV = tDots > 0 ? lerp(80, 71, smooth(t, EV.drop - 0.2, EV.p71 + 0.3)) : 80, gv = 75;
  dtext(c, String(Math.round(youV)), x + w - 52, L1 - 34, PAL.pac[2], a * smooth(t, EV.p80 - 0.1, EV.p80 + 0.3), 2); dtext(c, String(gv), x + w - 52, L2 - 34, GC.red, a * smooth(t, EV.p75 - 0.1, EV.p75 + 0.3), 2);
  // the stop at each dot, called out once
  const st = win(t, EV.stops - 0.1, EV.secondEnd + 0.2, 0.25, 0.35); if (st > 0) { tag(c, ["STOP: 1 FRAME", "= 1/60 SECOND"], P, L1 + 26, st, C.Y, 2, { maxY: 640 }); }
}

// ---------------------------------------------------------------- captions
const GROUPS = captionGroups(VOICE, WORDS, END);

// ---------------------------------------------------------------- story overlays (in the maze)
function story(c, t, cam, τ) {
  const P = pac(τ), [PX, PY] = sc(cam, P.x, P.y), gS = (n) => { const g = ghost(n, τ); return sc(cam, g.x, g.y); };
  // the hook: Blinky is at full Elroy speed right behind you
  { const a = win(t, EV.red - 0.2, EV.on - 0.25, 0.3, 0.3); if (a > 0) { const [x, y] = gS("red"); tag(c, ["FASTER"], x, y + cam.z * 0.8 + 6, a, GC.red, 2); } }
  // a hall of dots: the ghost behind you catches up
  { const a = win(t, EV.hall - 0.2, EV.upCEnd + 0.3, 0.3, 0.4);
    if (a > 0) { const g = ghost(E2.n, τ), [gx, gy] = sc(cam, g.x, g.y), gap = Math.hypot(g.x - P.x, g.y - P.y); dash(c, gx, gy, PX, PY, GC[E2.n], a * 0.8, t, 2, 4, 4);
      tag(c, [`GAP ${gap.toFixed(1)}`], (gx + PX) / 2, Math.min(gy, PY) - cam.z - 40, a * smooth(t, EV.behind - 0.2, EV.behind + 0.3), GC[E2.n], 2);
      tag(c, ["YOU 71", "GHOST 75"], PX, PY + cam.z * 0.9 + 8, a * smooth(t, EV.p71 - 0.2, EV.p71 + 0.3), PAL.pac[2], 2, { cols: [PAL.pac[2], GC[E2.n]] }); } }
  // scatter after Elroy 1: the others to their corners, Blinky stays on you
  { const a = win(t, EV.when - 0.2, EV.at10 - 0.3, 0.3, 0.35);
    if (a > 0) { for (const n of ["pink", "blue", "orange"]) { const [cx, cy] = CORNER[n], X = Math.max(-0.6, Math.min(MW - 0.4, cx)), Y = Math.max(-0.75, Math.min(MH - 0.25, cy)); marker(c, cam, X - 0.5, Y - 0.5, GC[n], a, t); const [gx, gy] = gS(n), [tx, ty] = sc(cam, X, Y); dash(c, gx, gy, tx, ty, GC[n], a * 0.6, t); }
      const [gx, gy] = gS("red"); marker(c, cam, Math.floor(P.x), Math.floor(P.y), GC.red, a, t, "STILL ON YOU"); dash(c, gx, gy, PX, PY, GC.red, a * 0.8, t); } }
  { const a = win(t, EV.stopsTaking - 0.2, EV.when - 0.2, 0.3, 0.35); if (a > 0) { const [x, y] = gS("red"); tag(c, ["NO BREAKS"], x, y - cam.z - 40, a, GC.red, 2); } }
  // faster than you even in an empty hall
  { const a = win(t, EV.fasterThan - 0.2, EV.players - 0.3, 0.3, 0.35); if (a > 0) { const g = ghost("red", τ), [gx, gy] = sc(cam, g.x, g.y); dash(c, gx, gy, PX, PY, GC.red, a * 0.8, t, 2, 4, 4); tag(c, ["85 > 80"], gx, gy + cam.z * 0.8 + 8, a, GC.red, 2); } }
  // the name
  { const a = win(t, EV.cruise - 0.2, EV.so - 0.2, 0.3, 0.4); if (a > 0) { const [x, y] = gS("red"); tag(c, ["CRUISE ELROY"], x, y - cam.z - 44, a, GC.red, 3); tag(c, ["NAME ORIGIN:", "NOBODY KNOWS"], x, y + cam.z * 0.8 + 8, a * smooth(t, EV.nobody - 0.1, EV.nobody + 0.3), C.L, 2); } }
}

// ---------------------------------------------------------------- frame
function layer(t, τ, cam) { const c = new Canvas(GW, GH, K); drawWorld(c, cam, τ, t); return c; }
export function frame(t) {
  t = wrapT(t);
  const cam = camera(t), m = CLK.mix(t);
  let c;
  if (m <= 0) c = layer(t, CLK.A(t), cam);
  else if (m >= 1) c = layer(t, CLK.B(t), cam);
  else { // ◀◀ the dissolve back in time: two states of the same game, mixed by a dither threshold
    const a = layer(t, CLK.A(t), cam), b = layer(t, CLK.B(t), cam), k = smooth(m, 0, 1); c = a;
    for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) if (k > bayer(x, y)) { const i = (y * GW + x) * 3; c.d[i] = b.d[i]; c.d[i + 1] = b.d[i + 1]; c.d[i + 2] = b.d[i + 2]; }
  }
  const τ = tauMain(t);
  story(c, t, cam, τ);
  // ◀◀ tag during the dissolve
  { const a = win(t, TD[0] - 0.15, TD[1], 0.15, 0.3); if (a > 0) tag(c, ["<< EARLIER"], 270, 300, a, C.L, 3); }
  raceStrip(c, t, win(t, EV.run - 0.4, EV.hall - 0.3, 0.35, 0.4));
  topPanel(c, t, τ, Math.max(1 - smooth(t, TD[0] - 0.2, TD[0] + 0.2), smooth(t, EV.now - 0.2, EV.now + 0.25)));
  captionShade(c);
  captions(c, t, GROUPS);
  return c;
}

// ---------------------------------------------------------------- output
const FULLBUF = new Uint8ClampedArray(1080 * 1920 * 3);
function toFull(c) { const d = c.d, row = new Uint8ClampedArray(1080 * 3); for (let y = 0; y < GH; y++) { for (let x = 0; x < GW; x++) { const s = (y * GW + x) * 3, o = x * 6; row[o] = row[o + 3] = d[s]; row[o + 1] = row[o + 4] = d[s + 1]; row[o + 2] = row[o + 5] = d[s + 2]; } FULLBUF.set(row, y * 2 * 3240); FULLBUF.set(row, (y * 2 + 1) * 3240); } return FULLBUF; }
const args = process.argv.slice(2);
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
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
}
