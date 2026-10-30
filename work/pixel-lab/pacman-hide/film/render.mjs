// «Pac-Man has a hiding spot the ghosts can't find» — pixel film, top-down arcade maze, loop. 540×960 grid ×2 → 1080×1920.
// No overlay: the picture runs to every edge (maze, cabinet sides, control panel to the bottom); captions over a soft
// dithered shade. Pac-Man stays parked in the hiding spot all film; the ghosts live by the rules (game.mjs) on the
// film clock (timeline.mjs). The film is exactly three periods of their loops, so the last frame is the first.
// node render.mjs --stills 3,9.5,... | --video
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import sharp from "sharp";
import { Canvas } from "../../../../renderer/pixel/raster.mjs";
import { MW, MH, DOTS, DIRS, REV, exits, CORNER, cell, isOpen } from "./maze.mjs";
import { ghost as G, DECISIONS, LOOP, NOUP, SPOT, START, PAC, GHOSTS, PER } from "./game.mjs";
import { EV, END, FPS, WORDS, VOICE, tau, rate, SLOW } from "./timeline.mjs";
import { drawMaze, drawPac, drawGhost, toS, PAL, SX, SY } from "./sprites.mjs";
import { GW, GH, K, R, C, GC, clamp01, smooth, ease, lerp, win, panel, dtext, tw, tag, dash, marker, ring, drawCabinet, captionShade, captionGroups, captions, fade, mix, bayer, MAIN } from "./hud.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const wrapT = (t) => ((t % END) + END) % END;
const ghostAt = (n, t) => G(n, tau(wrapT(t)));
function look(n, t) { const ta = tau(wrapT(t)); let x = 0, y = 0; for (let k = 0; k < 7; k++) { const d = DIRS[G(n, ta - k * 0.12).dir]; x += d[0] * (7 - k); y += d[1] * (7 - k); } const l = Math.hypot(x, y) || 1; return [x / l, y / l]; }
const sc = (cam, x, y) => toS(cam, x, y);

// ---------------------------------------------------------------- dots: a late level — the start area is eaten, the rest is not
const EATEN = new Set(["10,16", "11,16", "11,15", "11,14", "9,16", "12,16", "13,16", "8,16", "7,16", "6,16", "5,16", "12,14", "13,14", "14,14"]);
const BLINK_HZ = Math.round(2.2 * END) / END;
const dotState = { list: DOTS, alpha(d) { return EATEN.has(`${d.x},${d.y}`) ? 0 : 1; }, blink(t) { return clamp01(0.5 + 1.6 * Math.sin(2 * Math.PI * BLINK_HZ * t)); } };

// ---------------------------------------------------------------- camera
const SAFE = { x0: 26, x1: 514, y0: 64, y1: 628 }, TOP = { x0: 26, x1: 514, y0: 262, y1: 628 };
function frameOn(pts, { zmax = 70, zmin = 18, pad = 1.6, at = 0.5, safe = SAFE } = {}) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { x0 = Math.min(x0, x - pad); x1 = Math.max(x1, x + pad); y0 = Math.min(y0, y - pad); y1 = Math.max(y1, y + pad); }
  const z = Math.max(zmin, Math.min(zmax, (safe.x1 - safe.x0) / (x1 - x0), (safe.y1 - safe.y0) / (y1 - y0)));
  return { cx: (x0 + x1) / 2 + (SX - (safe.x0 + safe.x1) / 2) / z, cy: (y0 + y1) / 2 + (SY - lerp(safe.y0, safe.y1, at)) / z, z };
}
const pp = (o) => [o.x, o.y];
const FULL = { cx: 10.5, cy: 13 + (SY - 352) / 24.5, z: 24.5 };
const seamCam = { cx: PAC.x, cy: PAC.y + 1.3, z: 78 };
const BEATS = [
  { a: 0, b: 0.6, cam: () => seamCam },
  { a: 1.6, b: 8.0, cam: () => frameOn([[START[0] + 0.5, START[1] + 0.5], [PAC.x, PAC.y], [7.5, 18.5], [13.5, 18.5]], { zmax: 52, pad: 1.6 }) },
  { a: 8.7, b: 13.3, cam: (t) => frameOn([pp(ghostAt("red", t)), [PAC.x, PAC.y]], { zmax: 50, zmin: 30, pad: 2.6 }) },
  { a: 13.9, b: 20.7, cam: () => FULL },
  { a: 21.3, b: 25.4, cam: () => frameOn([[7, 16], [14, 19], [PAC.x, PAC.y - 0.6]], { zmax: 60, pad: 1.4 }) },
  { a: 25.9, b: 29.4, cam: () => FULL },
  { a: 29.9, b: 33.2, cam: () => frameOn([[PAC.x - 1, PAC.y], [19.6, 14.5], [10.5, 9.5]], { zmax: 46, pad: 1.5 }) },
  { a: 33.6, b: 45.2, cam: () => frameOn([[1, 6], [20, 22], [PAC.x, PAC.y]], { zmax: 30, zmin: 18, pad: 0.6, safe: TOP }) },
  { a: 46.0, b: 47.3, cam: () => frameOn([[PAC.x, PAC.y], [START[0] + 0.5, START[1] + 0.5]], { zmax: 56, pad: 2.4 }) },
  { a: 48.0, b: END, cam: () => seamCam },
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
const SM = 7;
export function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % NF; let cx = 0, cy = 0, lz = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const c = CAMS[(((f + k) % NF) + NF) % NF], q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); cx += c.cx * q; cy += c.cy * q; lz += Math.log(c.z) * q; w += q; }
  const s = { cx: cx / w, cy: cy / w, z: Math.exp(lz / w) }, tt = wrapT(t), ex = Math.max(1 - smooth(tt, 0.4, 0.9), smooth(tt, END - 0.6, END - 0.15));
  if (ex <= 0) return s; return { cx: lerp(s.cx, seamCam.cx, ex), cy: lerp(s.cy, seamCam.cy, ex), z: Math.exp(lerp(Math.log(s.z), Math.log(seamCam.z), ex)) };
}

// ---------------------------------------------------------------- the decisions shown
const τmod = (t) => ((tau(t) % PER) + PER) % PER;
const nearestDec = (n, t, filt = () => true) => { const tc = τmod(t); let best = null; for (const d of DECISIONS) { if (d.n !== n || !filt(d)) continue; const dd = Math.min(Math.abs(d.τ - tc), PER - Math.abs(d.τ - tc)); if (!best || dd < best.dd) best = { ...d, dd }; } return best; };
export const DEC1 = nearestDec("red", EV.closest);                                  // a plain choice at a crossing
export const DEC2 = nearestDec("red", EV.under, (d) => d.x === 11 && d.y === 16);    // the forbidden tile under Pac-Man
export const DEC3 = nearestDec("red", EV.cant + 0.6, (d) => d.x === 9 && d.y === 16);
const tOf = (dτ, near) => { let lo = near - 6, hi = near + 6; const target = tau(near) + ((dτ - τmod(near) + PER * 1.5) % PER) - PER / 2; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (tau(m) < target) lo = m; else hi = m; } return lo; };
export const T_DEC1 = tOf(DEC1.τ, EV.closest), T_DEC2 = tOf(DEC2.τ, EV.under), T_DEC3 = tOf(DEC3.τ, EV.cant + 0.6);
// option squares: next tile in each open direction with its distance to the target
function options(d) { return exits(d.x, d.y).filter((o) => o !== REV[d.from]).map((o) => { const nx = d.x + DIRS[o][0], ny = d.y + DIRS[o][1]; return { o, nx, ny, dd: Math.hypot(nx - d.T[0], ny - d.T[1]) }; }); }
function drawOptions(c, cam, d, a, t, show, pick, { forbid = false } = {}) {
  if (a <= 0) return;
  for (const q of options(d)) {
    const [x0, y0] = sc(cam, q.nx + 0.5, q.ny + 0.5), noUp = forbid && q.o === "up", best = q.o === d.took, col = noUp ? C.PK : best ? C.GR : C.GREY, s = R(cam.z * 0.72);
    if (show > 0) { const g = fade(c, a * show); g.frame(R(x0 - s / 2), R(y0 - s / 2), s, s, col); g.frame(R(x0 - s / 2) + 1, R(y0 - s / 2) + 1, s - 2, s - 2, col); g.frame(R(x0 - s / 2) + 2, R(y0 - s / 2) + 2, s - 4, s - 4, col);
      // the distance sits on the far side of the square from the ghost (vertical options: to the right)
      const lab = q.dd.toFixed(1), vert = q.o === "up" || q.o === "down", lx = vert ? x0 + s / 2 + 5 : x0 - tw(c, lab, 2) / 2 + DIRS[q.o][0] * (s / 2 + 4 + tw(c, lab, 2) / 2), ly = vert ? y0 - 7 : y0 + s / 2 + 4; dtext(c, lab, lx, ly, col, a * show, 2); }
    if (pick > 0) { const lab = noUp ? "×" : best ? "✓" : "×"; dtext(c, lab, x0 - tw(c, lab, 3) / 2, y0 - 10, noUp ? C.PK : best ? C.GR : C.PK, a * pick, 3); }
  }
}

// ---------------------------------------------------------------- the no-up marks: an up arrow struck through
function noUpMark(c, cam, x, y, a, pulse = 0) {
  if (a <= 0) return; const [X, Y] = sc(cam, x + 0.5, y + 0.5), s = Math.max(6, cam.z * 0.34) * (1 + 0.25 * pulse), g = fade(c, a), th = Math.max(2, R(s / 4));
  const cx = R(X), cy = R(Y - cam.z * 0.02);
  g.rect(cx - R(th / 2), R(cy - s * 0.2), th, R(s * 1.1), C.PK);                                   // shaft
  for (let k = 0; k <= R(s * 0.55); k++) { g.rect(cx - k, R(cy - s * 0.75 + k), 1 + 2 * k, th, C.PK); if (k > R(s * 0.55) - th) break; }   // head
  for (let k = -R(s * 0.75); k <= R(s * 0.75); k++) g.rect(cx + k - 1, R(cy + k * 0.9) - 1, th, th, C.IV);   // slash
  if (pulse > 0) ring(c, X, Y, cam.z * (0.6 + 0.5 * pulse), C.PK, a * (1 - pulse * 0.6), 0);
}

// ---------------------------------------------------------------- panels at the top
const PNL = { x: 22, y: 64, w: 496, h: 184 };
function miniGhost(c, n, gx, gy, a, t, z = 30, opts = {}) { drawGhost(c, { cx: -(gx - SX) / z, cy: -(gy - SY) / z, z }, 0, 0, n, opts.look || [1, 0], t * 2 + GHOSTS.indexOf(n) * 0.3, a, 1, opts); }
function miniPac(c, gx, gy, a, ang = 0, z = 30) { drawPac(c, { cx: -(gx - SX) / z, cy: -(gy - SY) / z, z }, 0, 0, ang, 0.55, a); }
const FRIGHT = ["#0E1560", "#1F2FB8", "#2E46F0", "#6C7DFF", "#B8C2FF"];
function panels(c, t) {
  // 1. only if no ghost follows you in
  { const a = win(t, EV.only - 0.25, EV.when - 0.3, 0.35, 0.35);
    if (a > 0) { panel(c, PNL.x, PNL.y, PNL.w, PNL.h, a, C.Y); dtext(c, "ONLY IF NO GHOST", PNL.x + 18, PNL.y + 16, C.Y, a, 3); dtext(c, "FOLLOWS YOU IN", PNL.x + 18, PNL.y + 46, C.Y, a, 3);
      // a little hall: Pac-Man going in, a ghost right behind him (crossed out)
      const k = smooth(t, EV.follows - 0.2, EV.in2End), px = PNL.x + 110 + 160 * k, gy = PNL.y + 130; const g = fade(c, a); g.rect(PNL.x + 40, gy - 26, 400, 3, PAL.line); g.rect(PNL.x + 40, gy + 24, 400, 3, PAL.line);
      miniPac(c, px, gy, a, 0, 32); miniGhost(c, "red", px - 66, gy, a, t, 32);
      const x = smooth(t, EV.follows + 0.1, EV.follows + 0.5) * a; if (x > 0) { dtext(c, "×", px - 66 - tw(c, "×", 5) / 2, gy - 22, C.PK, x, 5); } } }
  // 2. blue ghosts ignore the rule
  { const a = win(t, EV.when - 0.25, EV.head - 0.3, 0.35, 0.35);
    if (a > 0) { panel(c, PNL.x, PNL.y, PNL.w, PNL.h, a, "#6C7DFF"); dtext(c, "BLUE GHOSTS:", PNL.x + 18, PNL.y + 16, "#9AA8FF", a, 3); dtext(c, "THE RULE IS OFF", PNL.x + 18, PNL.y + 46, C.IV, a * smooth(t, EV.rule - 0.1, EV.rule + 0.3), 3);
      const gy = PNL.y + 128; for (let i = 0; i < 3; i++) miniGhost(c, "blue", PNL.x + 120 + i * 130, gy, a * smooth(t, EV.blue2 - 0.2 + i * 0.12, EV.blue2 + 0.15 + i * 0.12), t + i, 32, { ramp: FRIGHT, look: [0, -1] });
      const up = smooth(t, EV.off - 0.2, EV.off + 0.3) * a; if (up > 0) dtext(c, "UP ✓", PNL.x + 330, PNL.y + 20, C.GR, up, 3); } }
  // 3. heading for their corners can break it
  { const a = win(t, EV.head - 0.25, EV.level - 0.3, 0.35, 0.35);
    if (a > 0) { panel(c, PNL.x, PNL.y, PNL.w, PNL.h, a, C.PK); dtext(c, "WHEN THEY HEAD", PNL.x + 18, PNL.y + 16, C.PK, a, 3); dtext(c, "FOR THEIR CORNERS", PNL.x + 18, PNL.y + 46, C.PK, a, 3);
      dtext(c, "IT CAN BREAK", PNL.x + 18, PNL.y + 100, C.IV, a * smooth(t, EV.break - 0.15, EV.break + 0.3), 4); GHOSTS.forEach((n, i) => miniGhost(c, n, PNL.x + 330 + (i % 2) * 70, PNL.y + 104 + Math.floor(i / 2) * 46, a, t, 22, { look: [i % 2 ? 1 : -1, i < 2 ? -1 : 1] })); } }
  // 4. level one: scatter and chase, then chase nonstop after 84 s
  { const a = win(t, EV.level - 0.25, EV.then - 0.3, 0.35, 0.4);
    if (a > 0) { panel(c, PNL.x, PNL.y, PNL.w, PNL.h, a, C.Y); dtext(c, "LEVEL ONE", PNL.x + 18, PNL.y + 14, C.Y, a, 3);
      const segs = [[7, "s"], [20, "c"], [7, "s"], [20, "c"], [5, "s"], [20, "c"], [5, "s"]], X0 = PNL.x + 18, Wb = 380, sec = Wb / 84, y = PNL.y + 66, g = fade(c, a);
      let x = X0; for (const [d, k] of segs) { const w = d * sec; g.rect(R(x), y, Math.max(1, R(w) - 2), 22, k === "s" ? "#8D59DA" : "#E03056"); x += w; }
      const grow = smooth(t, EV.nonstop - 0.3, EV.nonstop + 0.6); g.rect(R(x), y, R(78 * grow), 22, "#E03056");
      if (grow > 0) dtext(c, ">", R(x + 78 * grow) - 4, y + 4, C.IV, a * grow, 2);
      dtext(c, "CORNERS", X0, y + 32, "#B08AE8", a, 2); dtext(c, "CHASE", X0 + 110, y + 32, "#FF6B80", a, 2);
      const cur = smooth(t, EV.after - 0.1, EV.half + 0.3) * 84, cx = X0 + cur * sec; g.rect(R(cx) - 1, y - 8, 3, 38, C.IV);
      const m = Math.floor(cur / 60), s2 = Math.floor(cur % 60); dtext(c, `${m}:${String(s2).padStart(2, "0")}`, Math.min(PNL.x + PNL.w - 70, R(cx) - 20), y - 26, C.IV, a, 2);
      const ns = smooth(t, EV.chase - 0.1, EV.chase + 0.3) * a; if (ns > 0) dtext(c, "THEN: CHASE NONSTOP", X0, PNL.y + 140, "#FF6B80", ns, 3); } }
}

// ---------------------------------------------------------------- captions
const GROUPS = captionGroups(VOICE, WORDS, END);

// ---------------------------------------------------------------- world + story
function world(c, t) {
  const cam = camera(t);
  drawMaze(c, cam, t, dotState);
  drawCabinet(c, cam, MH, { MW });
  const order = ["orange", "blue", "pink", "red"];
  for (const n of order) { const g = ghostAt(n, t); drawGhost(c, cam, g.x, g.y, n, look(n, t), tau(wrapT(t)) * 0.42 + GHOSTS.indexOf(n) * 0.25); }
  drawPac(c, cam, PAC.x, PAC.y, -Math.PI / 2, 0.42);
  return { cam };
}
function loopTrail(c, cam, n, a, t) { if (a <= 0) return; const L = LOOP[n], g = fade(c, a), s = Math.max(2, R(cam.z / 8)); for (let i = 0; i < L.length; i++) { const [x0, y0] = L[i], [x1, y1] = L[(i + 1) % L.length]; if (Math.abs(x1 - x0) + Math.abs(y1 - y0) !== 1) continue; for (let k = 0; k < 4; k++) { if ((i * 4 + k + Math.floor(t * 8)) % 3 === 0) continue; const [X, Y] = sc(cam, x0 + 0.5 + (x1 - x0) * k / 4, y0 + 0.5 + (y1 - y0) * k / 4); g.rect(R(X - s / 2), R(Y - s / 2), s, s, GC[n]); } } }

function story(c, t, w) {
  const { cam } = w, [PX, PY] = sc(cam, PAC.x, PAC.y), gS = (n) => { const g = ghostAt(n, t); return sc(cam, g.x, g.y); };
  // the start square and the way in
  { const a = win(t, EV.next - 0.3, EV.now - 0.2, 0.35, 0.4);
    if (a > 0) { const [sx, sy] = sc(cam, START[0] + 0.5, START[1] + 0.5); marker(c, cam, START[0], START[1], C.L, a * 0.9, t); tag(c, ["START"], sx, sy + cam.z * 0.7 + 6, a * smooth(t, EV.start - 0.1, EV.start + 0.3), C.L, 2);
      // the echo: a see-through Pac-Man walks start → right → up, then the route stays as a dotted line
      const k1 = smooth(t, EV.right - 0.15, EV.right + 0.45), k2 = smooth(t, EV.up - 0.1, EV.hall + 0.5);
      const ex = START[0] + 0.5 + k1, ey = START[1] + 0.5 - 2 * k2, ang = k1 < 1 ? 0 : -Math.PI / 2;
      const [ax, ay] = sc(cam, START[0] + 0.5, START[1] + 0.5), [bx, by] = sc(cam, START[0] + 1.5, START[1] + 0.5), [cx2, cy2] = sc(cam, PAC.x, PAC.y);
      if (k1 > 0) dash(c, ax, ay, bx, by, C.Y, a, t, 3, 6, 4, k1); if (k2 > 0) dash(c, bx, by, cx2, cy2, C.Y, a, t, 3, 6, 4, k2);
      const ea = a * win(t, EV.right - 0.2, EV.facing + 0.3, 0.2, 0.3) * 0.55; if (ea > 0) drawPac(c, cam, ex, ey, ang, 0.5 - 0.5 * Math.cos(t * 18), ea);
      const fu = win(t, EV.facing - 0.1, EV.now - 0.2, 0.25, 0.4) * a; tag(c, ["FACE UP"], PX + cam.z * 2.4, PY - cam.z * 1.3, fu, C.Y, 2); } }
  // a plain choice: the way closest to the target, never back
  { const a = win(t, EV.every - 0.3, EV.backEnd + 0.3, 0.35, 0.45);
    if (a > 0 && DEC1) { const d = DEC1, T = d.T, [gx, gy] = gS("red"), [tx, ty] = sc(cam, T[0] + 0.5, T[1] + 0.5);
      marker(c, cam, T[0], T[1], GC.red, a, t, "TARGET"); dash(c, gx, gy, tx, ty, GC.red, a * 0.6, t, 2, 4, 6);
      const show = smooth(t, EV.way - 0.1, EV.way + 0.3), pick = smooth(t, EV.closest + 0.15, EV.closest + 0.5), on = win(t, T_DEC1 - 1.4, EV.never - 0.1, 0.3, 0.35);
      drawOptions(c, cam, d, a * on, t, show, pick);
      const nb = win(t, EV.never - 0.05, EV.backEnd + 0.3, 0.3, 0.4) * a; if (nb > 0) { const g = ghostAt("red", t), bd = DIRS[REV[g.dir]], [bx, by] = sc(cam, g.x + bd[0] * 1.0, g.y + bd[1] * 1.0); dtext(c, "×", bx - tw(c, "×", 4) / 2, by - 14, C.PK, nb, 4); tag(c, ["NO U-TURN"], bx, by + 24, nb, C.PK, 2); } } }
  // the four no-up squares: appear on "four squares", pulse on "above the house" and "right here"; stay till the end
  { const base = smooth(t, EV.four - 0.1, EV.squares + 0.3) * (1 - smooth(t, END - 1.6, END - 0.8)), dim = 1 - 0.6 * win(t, EV.blue2 - 0.2, EV.offEnd + 0.2, 0.3, 0.4);
    NOUP.forEach(([x, y], i) => { const appear = smooth(t, EV.four - 0.1 + i * 0.12, EV.four + 0.2 + i * 0.12), upper = y < 12, p = upper ? win(t, EV.above - 0.1, EV.house + 0.6, 0.2, 0.5) : win(t, EV.here - 0.1, EV.rowEnd + 0.4, 0.2, 0.5) + win(t, T_DEC2 - 0.3, T_DEC2 + 0.6, 0.2, 0.4) * (x === 11 ? 1 : 0) + win(t, T_DEC3 - 0.3, T_DEC3 + 0.6, 0.2, 0.4) * (x === 9 ? 1 : 0);
      let under = 0; for (const n of GHOSTS) { const g = ghostAt(n, t); under = Math.max(under, 1 - smooth(Math.hypot(g.x - x - 0.5, g.y - y - 0.5), 0.6, 1.2)); }
      noUpMark(c, cam, x, y, Math.min(base, appear) * dim * (1 - under), clamp01(p) * (0.5 + 0.5 * Math.sin(t * 8))); });
    const lab = win(t, EV.four - 0.1, EV.two - 0.2, 0.3, 0.3); if (lab > 0) tag(c, ["NO TURNING UP"], 270, 74, lab, C.PK, 3);
    const up = win(t, EV.above - 0.1, EV.other - 0.2, 0.3, 0.3); if (up > 0) { const [x, y] = sc(cam, 10.5, 8.5); tag(c, ["ABOVE THE GHOST HOUSE"], x, y - cam.z * 1.0 - 34, up, C.PK, 2); }
    const dn = win(t, EV.here - 0.1, EV.so - 0.1, 0.3, 0.3); if (dn > 0) { const [x, y] = sc(cam, 10.5, 16.5); tag(c, ["YOUR STARTING ROW"], x, y + cam.z * 0.8 + 8, dn, C.PK, 2); } }
  // Red: coming for you; under you up is closest — but forbidden
  { const a = win(t, EV.red - 0.2, EV.pink - 0.3, 0.3, 0.35);
    if (a > 0) { const g = ghostAt("red", t), [gx, gy] = gS("red"); marker(c, cam, SPOT[0], SPOT[1], GC.red, a, t, "YOU"); dash(c, gx, gy, PX, PY, GC.red, a * 0.7, t);
      for (const [d, td, a0, b0] of [[DEC2, T_DEC2, 0.9, 0.45], [DEC3, T_DEC3, 0.45, 1.0]]) { if (!d) continue; const on = win(t, td - a0, td + b0, 0.3, 0.35) * a; drawOptions(c, cam, d, on, t, smooth(t, td - a0, td - a0 + 0.35), smooth(t, td - Math.min(0.4, a0 - 0.1), td), { forbid: true }); }
      const nu = win(t, EV.cant - 0.1, EV.pink - 0.3, 0.3, 0.35); if (nu > 0) tag(c, ["UP IS CLOSEST", "BUT NOT ALLOWED"], gx, gy + cam.z * 0.8 + 10, nu, C.PK, 2); } }
  // Pink and Blue circle the ghost house; Orange loops on the left
  { const pb = win(t, EV.pink - 0.2, EV.side - 0.3, 0.35, 0.4), or = win(t, EV.orange - 0.2, EV.side - 0.3, 0.35, 0.4);
    loopTrail(c, cam, "pink", pb * smooth(t, EV.pink - 0.2, EV.pink + 0.2), t); loopTrail(c, cam, "blue", pb * smooth(t, EV.blue - 0.2, EV.blue + 0.2), t); loopTrail(c, cam, "orange", or, t);
    if (pb > 0) { const [x, y] = sc(cam, 10.5, 8); tag(c, ["PINK + BLUE"], x, y - cam.z - 40, pb, GC.pink, 2, { cols: [GC.pink] }); }
    if (or > 0) { const [x, y] = sc(cam, 4.5, 20.6); tag(c, ["ORANGE"], x, y + cam.z * 0.5, or, GC.orange, 2); } }
  // the side way in: open, but nobody comes
  { const a = win(t, EV.side - 0.2, EV.only - 0.3, 0.35, 0.4);
    if (a > 0) { const [x0, y0] = sc(cam, 12.1, 14.1), [x1, y1] = sc(cam, 19.9, 14.9), g = fade(c, a); for (let x = R(x0); x <= R(x1); x += 6) { g.rect(x, R(y0), 3, 2, C.GR); g.rect(x, R(y1), 3, 2, C.GR); }
      const k = smooth(t, EV.side, EV.open + 0.4); dash(c, x1 - 10, (y0 + y1) / 2, lerp(x1 - 10, PX + cam.z * 0.8, k), (y0 + y1) / 2, C.GR, a, t, 3, 6, 4);
      tag(c, ["OPEN"], (x0 + x1) / 2, y0 - 40, a * smooth(t, EV.open - 0.1, EV.open + 0.3), C.GR, 2);
      tag(c, ["NOBODY COMES"], (x0 + x1) / 2, y1 + 12, a * smooth(t, EV.never2 ?? EV.rules, (EV.never2 ?? EV.rules) + 0.3), C.IV, 2); } }
  // corners: four corner targets while the panel says it can break
  { const a = win(t, EV.head - 0.2, EV.level - 0.3, 0.3, 0.35); if (a > 0) for (const n of GHOSTS) { const [cx, cy] = CORNER[n], X = Math.max(-0.6, Math.min(MW - 0.4, cx)), Y = Math.max(-0.75, Math.min(MH - 0.25, cy)); marker(c, cam, X - 0.5, Y - 0.5, GC[n], a, t); const [gx, gy] = gS(n), [tx, ty] = sc(cam, X, Y); dash(c, gx, gy, tx, ty, GC[n], a * 0.6, t); } }
  // as long as you like
  { const a = win(t, EV.stay - 0.2, EV.secret - 0.1, 0.3, 0.35); if (a > 0) tag(c, ["AS LONG AS", "YOU LIKE"], PX, PY - cam.z * 1.2 - 60, a, C.Y, 2); }
}

// ---------------------------------------------------------------- frame
export function frame(t) {
  t = wrapT(t);
  const c = new Canvas(GW, GH, K);
  const w = world(c, t);
  story(c, t, w);
  panels(c, t);
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
