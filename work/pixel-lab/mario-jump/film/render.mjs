// «Holding jump makes gravity weaker» — pixel film (Kagenami), loop. 540×960 grid ×2 → 1080×1920, 30 fps.
// No overlay: one side-view level (our own tiles, repeating every 47 blocks) fills the frame edge to edge; karaoke
// captions sit on a soft dithered shade. The plumber (our own drawing) jumps by the SMB1 rules (physics.mjs):
// a held jump in slow motion with a gravity arrow (weak going up, strong from the top) → hold vs tap side by side, same
// start → about four blocks → let go early: gravity ×3.5 at once → a tap: under two blocks → a hop and a big jump in real
// time → strong at the top even while holding → up 0.53 s, down 0.35 s → a run, the speed checked at takeoff → about five
// blocks → speeding up in the air changes nothing → the button is a gravity switch → back to the first frame.
//   node render.mjs --stills 0,3.5,… | --video
import { fileURLToPath } from "node:url";
import { Canvas, MAIN, mix, bayer, fade, hex } from "./lib/raster.mjs";
import { P, stext, textW, tag, panel, stamp, pointer, smooth, ease, easeOut, lerp, win, clamp01 } from "./lib/ui.mjs";
import { makeCaptions } from "./lib/captions.mjs";
import { cli } from "./lib/out.mjs";
import { drawLevel, buildLevel, B } from "./level.mjs";
import { drawHero } from "./hero.mjs";
import { TIERS } from "./physics.mjs";
import { marioAt, ghostAt, buttonAt, activeJump, JUMPS, L, X_TAKE, GHOST_SPAN } from "./mario.mjs";
import { EV, END, FPS, VOICE } from "./timeline.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const GW = 540, GH = 960, R = Math.round, RED = "#FF3B4E", GREEN = "#5BE36A", WHITE = "#FFFFFF";
const wrapT = (t) => ((t % END) + END) % END;
const winW = (t, a, b, fi = 0.3, fo = 0.3) => (a <= b ? win(t, a, b, fi, fo) : Math.max(win(t, a, END + 5, fi, fo), win(t + END, a, b + END, fi, fo)));
// the level: floating blocks high up (7 blocks, out of reach of every jump here); nothing on the ground in the way
buildLevel([[8, -7, "brick"], [9, -7, "gold"], [10, -7, "brick"], [11, -7, "brick"], [21, -8, "gold"], [38, -7, "brick"], [39, -7, "gold"], [40, -7, "brick"], [44, -7, "brick"], [45, -7, "gold"]], L / B);

// ---------------------------------------------------------------- camera: follows the plumber; the world repeats every L
const Z = 3.6, GROUND_SY = 628;
const FR = Math.round(END * FPS), MX = []; for (let f = 0; f < FR; f++) MX.push(marioAt(f / FPS).x);
const mxU = (f) => { const k = ((f % FR) + FR) % FR, laps = Math.floor(f / FR); return MX[k] + laps * L; };   // unwrapped across the seam
function camera(t) {
  const f = Math.round(wrapT(t) * FPS) % FR, SM = 10; let x = 0, w = 0;
  for (let k = -SM; k <= SM; k++) { const q = Math.exp(-(k * k) / (2 * (SM / 2) ** 2)); x += mxU(f + k) * q; w += q; }
  let cx = x / w; if (f < SM && cx > L / 2) cx -= L;                       // keep the start of the loop near 0
  return { cx: cx + 6, z: Z };
}
const view = (cam) => ({ z: cam.z, cx: cam.cx, X: (wx) => 270 + (wx - cam.cx) * cam.z, Y: (wy) => GROUND_SY + wy * cam.z });

// ---------------------------------------------------------------- the gravity arrow (smoothed so it never jumps in one frame)
function gravNow(t) { let s = 0, n = 0; for (let k = 0; k < 5; k++) { const m = marioAt(wrapT(t - k * 0.035)); if (m.jump) { s += m.g; n++; } } return n ? { g: s / n, k: n / 5 } : { g: 0, k: 0 }; }
function gravGhost(t) { let s = 0, n = 0; for (let k = 0; k < 5; k++) { const m = ghostAt(t - k * 0.035); if (m.jump) { s += m.g; n++; } } return n ? { g: s / n, k: n / 5 } : { g: 0, k: 0 }; }
function arrow(c, V, x, yTop, g, k, a, label = true) {
  if (a <= 0 || k <= 0) return; const len = 14 + (g / 256) * 160, strong = smooth(g, 0x30, 0x60), col = mix(GREEN, RED, strong), al = a * k;
  const sx = R(V.X(x)), sy = R(V.Y(yTop)), gg = fade(c, al);
  gg.rect(sx - 2, sy, 5, R(len), P.ink); gg.rect(sx - 1, sy, 3, R(len), col);
  gg.poly([[sx - 7, sy + len - 1], [sx + 8, sy + len - 1], [sx + 0.5, sy + len + 9]], P.ink); gg.poly([[sx - 5, sy + len], [sx + 6, sy + len], [sx + 0.5, sy + len + 7]], col);
  if (label) stext(c, MAIN, strong > 0.5 ? "STRONG" : "WEAK", sx + 10, sy + len / 2 - 6, 2, col, { alpha: al, shadow: P.ink });
}

// ---------------------------------------------------------------- traces of a jump's path (feet), drawn while the jump runs and a while after
function traceOf(j, gfNow, x0Fn) { const pts = []; for (let f = 0; f <= Math.min(gfNow, j.sim.landF); f += 1) pts.push([x0Fn(f), -j.sim.pts[Math.min(f, j.sim.pts.length - 1)].h]); return pts; }
function drawTrace(c, V, pts, a, col) { if (a <= 0) return; const g = fade(c, a); pts.forEach(([x, y], i) => { if (i % 2) return; g.rect(R(V.X(x)) - 1, R(V.Y(y)) - 1, 3, 3, P.ink); g.rect(R(V.X(x)), R(V.Y(y)), 2, 2, col); }); }
const TRACES = { dual: [EV.every, EV.downEnd + 0.3], dual2: [EV.changes1 - 0.1, EV.downEnd + 0.6], four: [EV.hold - 0.1, EV.highEnd + 1.0], early: [EV.let - 0.3, EV.soonerEnd + 0.6], tap: [EV.quick - 0.2, EV.thats + 0.4], hop: [EV.tiny - 0.1, EV.jumpBigEnd + 0.6], big: [EV.big - 0.2, EV.jumpBigEnd + 0.6], still: [EV.top1 - 0.4, EV.holdingEnd + 0.5], timer: [EV.goes + 0.2, EV.thirdEnd + 0.5], run: [EV.leave, EV.itEnd + 0.2] };
function drawTraces(c, V, t) {
  for (const j of JUMPS) { const span = TRACES[j.demo]; if (!span) continue; const a = win(t, span[0], span[1], 0.2, 0.4); if (a <= 0) continue;
    const gf = Math.max(0, Math.min(j.w(t), j.sim.landF)); if (t < j.t0) continue;
    const x0 = (f) => j.x + (j.vx ? j.vx * f : 0) + 6;
    drawTrace(c, V, traceOf(j, gf, x0), a * (j.ghost ? 0.7 : 1), j.ghost ? "#FFB0B0" : j.demo === "early" || j.demo === "tap" || j.demo === "hop" ? "#FFD27A" : WHITE); }
}
// a ruler: a column of dotted block outlines with numbers (an annotation, not solid blocks)
function ruler(c, V, x, n, a, hl = -1) {
  if (a <= 0) return; const g = fade(c, a);
  for (let i = 0; i < n; i++) { const x0 = R(V.X(x)), y0 = R(V.Y(-(i + 1) * B)), s = R(B * V.z); const col = i === hl ? P.y : "#FDFEED";
    for (let k = 0; k < s; k += 3) { g.px(x0 + k, y0, col); g.px(x0 + k, y0 + s - 1, col); g.px(x0, y0 + k, col); g.px(x0 + s - 1, y0 + k, col); }
    stext(c, MAIN, String(i + 1), x0 + s + 6, y0 + s / 2 - 7, 2, col, { alpha: a, shadow: P.ink }); }
}

// ---------------------------------------------------------------- the controller HUD (our own pad): A lights up while held
function pad(c, t, a, label) {
  if (a <= 0) return; const x = 24, y = 40, g = fade(c, a), press = buttonAt(t);
  g.rrect(x, y, 196, 78, P.ink, 2); g.rrect(x + 2, y + 2, 192, 74, "#C8C8D0", 2); g.rect(x + 12, y + 18, 172, 46, "#2A2A30");
  g.rect(x + 26, y + 34, 30, 10, "#16161A"); g.rect(x + 36, y + 24, 10, 30, "#16161A");
  for (const [bx, lab, on] of [[x + 122, "B", 0], [x + 160, "A", press]]) { g.disc(bx, y + 40 + R(on * 2), 13, "#16161A"); g.disc(bx, y + 40 + R(on * 2), 11, mix("#B8202E", "#FF6070", on)); if (on > 0) fade(c, a * on).ring(bx, y + 40, 16, P.y);
    stext(c, MAIN, lab, bx, y + 58, 1, "#9AA0C8", { align: 0.5, alpha: a }); }
  if (label) stext(c, MAIN, label, x + 98, y + 88, 2, press > 0.5 ? P.y : P.iv, { align: 0.5, alpha: a, shadow: P.ink });
}
function timerBars(c, t, a) {
  if (a <= 0) return; const j = JUMPS.find((q) => q.id === "timer"), gf = Math.max(0, Math.min(j.w(t), j.sim.landF)), x = 290, y = 44; panel(c, x, y, 228, 96, a, P.cy);
  const up = clamp01(gf / 32), dn = clamp01((gf - 32) / 21), g = fade(c, a);
  stext(c, MAIN, "UP", x + 12, y + 14, 2, P.iv, { alpha: a }); g.rect(x + 56, y + 14, 106, 14, "#1E2233"); g.rect(x + 56, y + 14, R(106 * up), 14, GREEN); stext(c, MAIN, "0.53 S", x + 168, y + 14, 2, GREEN, { alpha: a * smooth(up, 0.98, 1) });
  stext(c, MAIN, "DOWN", x + 12, y + 50, 2, P.iv, { alpha: a }); g.rect(x + 56, y + 50, R(106 * 21 / 32), 14, "#1E2233"); g.rect(x + 56, y + 50, R(106 * 21 / 32 * dn), 14, RED); stext(c, MAIN, "0.35 S", x + 168, y + 50, 2, RED, { alpha: a * smooth(dn, 0.98, 1) });
}
function speedMeter(c, t, a, m) {
  if (a <= 0) return; const x = 290, y = 44; panel(c, x, y, 228, 70, a, P.or); const v = m.jump && m.jump.vx ? 150 : Math.abs(m.vx || 0), g = fade(c, a);
  stext(c, MAIN, "RUN SPEED", x + 12, y + 12, 2, P.or, { alpha: a }); g.rect(x + 12, y + 36, 204, 14, "#1E2233");
  for (let i = 0; i < 12; i++) if (v / 150 > i / 12) g.rect(x + 14 + i * 17, y + 38, 14, 10, i > 7 ? RED : i > 4 ? P.y : GREEN);
}

// ---------------------------------------------------------------- tags and stamps
function story(c, V, t, m) {
  const head = (mm) => [V.X(mm.x + 6), V.Y(mm.y - 40)];
  { const a = winW(t, END - 0.2, EV.weakerEnd + 0.4, 0.3, 0.4); tag(c, ["HOLD = WEAK GRAVITY"], 270, 150, a, GREEN, 3); }
  { const a = win(t, EV.only - 0.1, EV.upEnd + 0.5, 0.2, 0.35); tag(c, ["ONLY ON THE WAY UP"], 270, 150, a, P.y, 3); }
  { const a = win(t, EV.same - 0.1, EV.speedEnd + 1.0, 0.25, 0.35); tag(c, ["SAME START SPEED"], 270, 150, a, P.cy, 3); }
  { const a = win(t, EV.every - 0.1, EV.downEnd + 0.4, 0.25, 0.35); tag(c, ["HOLD"], V.X(12), 192, a, P.iv, 2); tag(c, ["TAP"], V.X(-18), 192, a, "#FFB0B0", 2); }
  { const a = win(t, EV.four - 0.1, EV.highEnd + 0.8, 0.2, 0.35); tag(c, ["ABOUT 4 BLOCKS"], 270, 150, a, P.y, 3); }
  { const a = win(t, EV.let - 0.1, EV.away + 0.6, 0.2, 0.35); tag(c, ["LET GO"], 270, 150, a, P.or, 3); }
  { const a = win(t, EV.three - 0.1, EV.soonerEnd + 0.3, 0.2, 0.35); if (a > 0) stamp(c, "GRAVITY X3.5", 270, 236, a, RED, 3, smooth(t, EV.three - 0.1, EV.three + 0.1)); }
  { const a = win(t, EV.two - 0.15, EV.blocks2End + 0.6, 0.2, 0.35); tag(c, ["UNDER 2 BLOCKS"], 270, 150, a, P.y, 3); }
  { const a = win(t, EV.tiny - 0.1, EV.jumpBigEnd + 0.4, 0.2, 0.35); tag(c, ["TINY HOP", "OR BIG JUMP"], 270, 150, a, P.iv, 3); }
  { const a = win(t, EV.keep - 0.15, EV.holdingEnd + 0.5, 0.2, 0.35); tag(c, ["STILL HOLDING A"], 270, 150, a, P.y, 3); }
  { const a = win(t, EV.checks - 0.15, EV.groundEnd + 0.6, 0.25, 0.35); if (a > 0) stamp(c, "SPEED CHECK", 270, 236, a, P.or, 3, smooth(t, EV.leave - 0.1, EV.leave + 0.1)); }
  { const a = win(t, EV.launches - 0.1, EV.faster + 0.9, 0.2, 0.35); tag(c, ["RUN JUMP: FASTER START"], 270, 150, a, P.or, 2); }
  { const a = win(t, EV.five - 0.1, EV.high2End + 0.5, 0.2, 0.35); tag(c, ["ABOUT 5 BLOCKS"], 270, 150, a, P.y, 3); }
  { const a = win(t, EV.speeding - 0.1, EV.itEnd + 0.4, 0.2, 0.35); tag(c, ["SPEED UP IN THE AIR:", "NO CHANGE"], 270, 150, a, P.cy, 2); }
  { const a = win(t, EV.button3 - 0.1, END - 0.3, 0.25, 0.3); tag(c, ["A = GRAVITY SWITCH"], 270, 150, a, P.y, 3); }
}

// ---------------------------------------------------------------- frame
const CAP = makeCaptions(VOICE, END);
export function frame(t, opts = {}) {
  t = wrapT(t);
  const c = opts.canvas || new Canvas(GW, GH, "#000000"), V = view(opts.cam || camera(t)), m = marioAt(t);
  drawLevel(c, V, t, END);
  // rulers
  ruler(c, V, 26, 5, win(t, EV.while1 - 0.3, EV.blocks2End + 0.7, 0.3, 0.4), t > EV.quick - 0.3 ? 1 : t > EV.keeps ? 3 : -1);
  { const jr = JUMPS.find((q) => q.id === "run"); ruler(c, V, jr.x + 2.5 * 32 + 14, 5, win(t, EV.running2 + 0.3, EV.high2End + 0.8, 0.3, 0.4), t > EV.five - 0.2 ? 4 : -1); }
  drawTraces(c, V, t);
  // the ghost twin (taps) beside him in the side-by-side demos
  const ga = win(t, GHOST_SPAN[0], GHOST_SPAN[1], 0.35, 0.4);
  if (ga > 0) { const gm = ghostAt(t); drawHero(c, V, gm.x + 6, gm.y, { air: gm.air, armUp: gm.air * (gm.rising ? 1 : 0.6), face: 1 }, ga * 0.6); const gg = gravGhost(t); arrow(c, V, gm.x + 6, gm.y + 2, gg.g, gg.k, ga * 0.85, false); }
  // the plumber
  { const run = m.jump ? 0 : m.run, ph = m.x / 30; drawHero(c, V, m.x + 6, m.y, { runK: run, run: ph, air: m.air, armUp: m.air * (m.rising ? 1 : 0.6), face: 1 }); }
  // his gravity arrow (from his feet down), shown while he is in the air
  { const gv = gravNow(t), show = win(t, -1, END + 1, 0.01, 0.01) * (1 - win(t, EV.tiny - 0.2, EV.jumpBigEnd + 0.2, 0.2, 0.3) * 0.6); arrow(c, V, m.x + 6, m.y + 2, gv.g, gv.k, show); }
  if (opts.story !== false) {
    pad(c, t, win(t, -1, END + 1, 0.01, 0.01) * (1 - win(t, EV.goes - 0.2, EV.itEnd + 0.1, 0.3, 0.35)), buttonAt(t) > 0.5 ? "HOLDING A" : null);
    timerBars(c, t, win(t, EV.goes - 0.1, EV.thirdEnd + 0.5, 0.3, 0.35));
    speedMeter(c, t, win(t, EV.running1 - 0.1, EV.groundEnd + 0.4, 0.3, 0.35), m);
    story(c, V, t, m);
  }
  if (opts.captions !== false) { CAP.shade(c); CAP.draw(c, t); }
  return c;
}
export { JUMPS };
if (process.argv[1] && process.argv[1].endsWith("render.mjs")) await cli(frame, END, FPS, HERE, "mario-jump");
