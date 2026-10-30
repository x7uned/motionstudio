// Audible motions of LV4 meadow (bee), LV5 yard (dog) and LV6 forest (crow) for the 8-bit sound design: every sound
// lasts exactly as long as its motion. Everything is derived from the timing tables and geometry the level modules
// draw with (MT / YT / FT, T, D0…, F0…, heroX, the dance path) plus the harness camera (same keys and easing as
// render.mjs), so a timing change in a level moves its sounds with it. No seconds are hard-coded here.
// MOTIONS: [{ t0, t1, kind, level, note }] sorted by t0. Impacts (catch, landing) last one frame (1 / FPS).
import { EV, CAM, LV, FPS, LAND } from "../timeline.mjs";
import { ease, lerp, clamp01 } from "../cute.mjs";
import * as M from "./meadow.mjs";
import * as Y from "./yard.mjs";
import * as F from "./forest.mjs";
import { pathToFileURL } from "node:url";

const FRAME = 1 / FPS, r4 = (v) => Math.round(v * 1e4) / 1e4;

// ---------------------------------------------------------------- harness camera (identical to render.mjs camera + view rounding)
function camera(t) {
  let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++;
  const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1));
  return { cx: Math.round(lerp(a.cx, b.cx, k)), cy: Math.round(lerp(a.cy, b.cy, k)) };
}
/** Time intervals in [ta, tb] while a world box (centre fn(t) → [x, y], half sizes hx, hy) overlaps the 540×960 frame. */
function onScreen(ta, tb, fn, hx, hy) {
  const out = []; let open = null; const step = 1 / 240;
  for (let t = ta; t <= tb + 1e-9; t += step) {
    const { cx, cy } = camera(t), [wx, wy] = fn(t), sx = 270 + wx - cx, sy = 480 + wy - cy, vis = sx + hx > 0 && sx - hx < 540 && sy + hy > 0 && sy - hy < 960;
    if (vis && open === null) open = t; if (!vis && open !== null) { out.push([open, t]); open = null; }
  }
  if (open !== null) out.push([open, tb]); return out;
}
/** First t in [a, b] where a monotonic f(t) reaches v (bisection). */
function solve(f, v, a, b) { for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (f(m) < v) a = m; else b = m; } return (a + b) / 2; }
const plen = (p) => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };

const out = [];
const add = (t0, t1, kind, level, note) => out.push({ t0: r4(t0), t1: r4(Math.max(t1, t0 + FRAME)), kind, level, note });

// ================================================================= LV4 · meadow (bee)
{
  const L = "meadow";
  for (const [a, b] of onScreen(LV.octopus[0], LV.dog[1], (t) => { const s = M.beeState(t); return [s.x, s.y + 30]; }, 92, 120)) add(a, b, "buzz", L, `bee wings flutter continuously while on screen (${M.MT.wingHz} Hz flap)`);
  for (const [a, b] of onScreen(LV.octopus[0], LV.dog[1], () => [M.HX, LAND - 50], 60, 70)) add(a, b, "buzz", L, "three tiny worker bees circling the hive entrance (ambient, quiet)");
  add(M.MT.panel[0], M.MT.panel[0] + 0.3, "pop", L, "magnifier panel dissolves in");
  add(M.MT.brainLens[0], M.MT.brainLens[1], "pop", L, "lens 1 pops: BEE BRAIN (on \"brain\")");
  add(M.MT.seedLens[0], M.MT.seedLens[1], "pop", L, "lens 2 pops: SESAME SEED (on \"sesame\")");
  add(M.MT.equals[0], M.MT.equals[1], "tick", L, "\"=\" sign appears between the lenses");
  add(M.MT.panel[1], M.MT.panel[1] + 0.3, "poof", L, "panel dissolves out (optional, soft)");
  add(M.MT.learn, M.MT.learn + M.MT.pickup, "pickup", L, "+LEARN rises and dissolves");
  add(M.MT.learn, M.MT.learn + M.MT.joyHop, "boing", L, "bee does a little happy hop");
  // waggle dance: the head follows DANCE; prog = trail fraction (0..1) as in beeState
  const prog = (t) => clamp01((M.danceS(t) * M.DL - M.PRE) / M.TL), at = (f) => solve(prog, f, M.D0, M.D1);
  const runL = plen(M.RUN), loopAL = plen(M.LOOP_A), loopBL = plen(M.LOOP_B), TL = M.TL;
  add(M.D0, at(1e-6), "whoosh", L, "bee darts from its rest spot to the start of the dance");
  for (const [name, f0, len] of [["run 1", 0, runL], ["run 2", runL + loopAL, runL]]) {
    const a = at(f0 / TL + 1e-6), b = at((f0 + len) / TL);
    add(a, b, "trill", L, `waggle ${name}: straight wiggly run toward the flower patch (body waggles at 4.2 Hz)`);
    let acc = f0; for (let i = 1; i < M.RUN.length; i++) { const l = Math.hypot(M.RUN[i][0] - M.RUN[i - 1][0], M.RUN[i][1] - M.RUN[i - 1][1]); add(at(acc / TL + 1e-6), at((acc + l) / TL), "tick", L, `${name} wiggle ${i}/${M.RUN.length - 1} (one zig of the zigzag)`); acc += l; }
  }
  add(at(runL / TL + 1e-6), at((runL + loopAL) / TL), "whoosh", L, "return loop over the top (figure-eight, half 1)");
  add(at((2 * runL + loopAL) / TL + 1e-6), at((2 * runL + loopAL + loopBL) / TL - 1e-6), "whoosh", L, "return loop underneath (figure-eight, half 2)");
  add(M.D1, M.D1 + M.BACK_T, "whoosh", L, "bee glides back to its rest spot");
  add(M.A0, M.A1, "draw", L, "dotted arrow draws from the hive to the bright flower patch");
  M.MT.miniBees.forEach((t0, i) => add(t0, t0 + M.MT.miniFly, "buzz", L, `small bee ${i + 1} flies off along the arrow`));
  for (const [a, b] of onScreen(M.MT.miniBees[0] + M.MT.miniFly, LV.dog[1], () => M.PATCH, 30, 30)) add(a, b, "buzz", L, "the two small bees hover over the patch (quiet, until it leaves the frame)");
  add(M.MT.glow[0], M.MT.glow[3], "twinkle", L, `patch sparkles (fade in ${r4(M.MT.glow[1] - M.MT.glow[0])} s, out ${r4(M.MT.glow[3] - M.MT.glow[2])} s)`);
}

// ================================================================= LV5 · yard (dog)
{
  const L = "yard";
  add(Y.YT.words, Y.YT.words + Y.YT.pickup, "pickup", L, "+WORDS rises and dissolves");
  add(Y.YT.plate[0], Y.YT.plate[1], "clink", L, "golden CHASER name plate appears on the collar");
  add(Y.F0, Y.F0 + Y.F_DOWN, "whoosh", L, "dog dips its head down to the toy heap");
  add(Y.GRAB, Y.F0 + Y.F_DOWN + Y.F_HOLD, "squeak", L, "grabs the rubber duck (squeaky toy) in its mouth");
  add(Y.F0 + Y.F_DOWN + Y.F_HOLD, Y.F0 + Y.F_DOWN + Y.F_HOLD + Y.F_UP, "whoosh", L, "head comes back up holding the duck");
  for (const [txt, , , t0] of Y.BUBBLES) add(t0, t0 + Y.YT.bubblePop, "pop", L, `name bubble pops: ${txt}`);
  add(Y.YT.bubblesOut[0], Y.YT.bubblesOut[1], "poof", L, "all name bubbles dissolve (optional, soft)");
  add(Y.YT.counterIn[0], Y.YT.counterIn[0] + 0.25, "pop", L, "TOYS counter panel dissolves in");
  add(EV.thousand - Y.YT.countLead, EV.thousand - Y.YT.countLead + (EV.toys - EV.thousand), "tick", L, "counter runs 0 → 1022 with ease-in-out (tick rate can follow the easing; turns yellow at 1022)");
}

// ================================================================= LV6 · forest (crow)
{
  const L = "forest", T = F.T;
  add(T.dip, T.carve0, "whoosh", L, "crow leans its head down to the twig under its foot");
  for (let n = 0; ; n++) { const a = T.carve0 + n / F.FT.nibHz; if (a >= T.carve1) break; add(a, Math.min(T.carve1, a + 0.5 / F.FT.nibHz), "chip", L, `nibble ${n + 1}: beak peck carves the hook, wood chips fly`); }
  add(F.FT.tools, F.FT.tools + F.FT.pickup, "pickup", L, "+TOOLS rises and dissolves");
  add(T.grab, T.lift, "tick", L, "beak grabs the twig, it swings down to hang");
  add(T.lift, T.catch, "whoosh", L, "toss: the twig spins 180° in the air");
  add(T.catch, T.catch + FRAME, "clack", L, "catches the twig by the other end (impact)");
  add(T.catch, T.poke, "whoosh", L, "pokes the hooked twig into the log hole");
  add(T.poke, T.pull, "scratch", L, "jiggles the hook inside the hole (9 Hz)");
  add(T.pull, T.held, "squish", L, `pulls out a grub on the hook (grub fades in ${r4(F.FT.grubIn[1] - F.FT.grubIn[0])} s)`);
  add(T.held, T.held + F.FT.holdUp, "whoosh", L, "lifts its head proudly with the grub");
  add(T.gulp, T.drop, "gulp", L, "gulps the grub");
  add(T.drop, T.dropEnd, "fall", L, "drops the twig, it tumbles onto the log");
  add(T.dropEnd, T.dropEnd + FRAME, "clack", L, "twig lands on the log (impact)");
  // the hero: footsteps at every foot plant (walk = ±1 → phase 0.25 + n/2); phase = (heroX − HERO_IN) / STRIDE
  const phase = (t) => (F.heroX(t) - F.HERO_IN) / F.STRIDE, stop = F.HERO_T1 + F.HERO_DEC, last = phase(stop);
  add(F.HERO0, stop, "walk", L, "hero walks in along the path, slows down and stops (footsteps listed separately)");
  for (let n = 0; 0.25 + n / 2 < last; n++) {
    const p = 0.25 + n / 2, a = solve(phase, p, F.HERO0, stop), b = solve(phase, Math.min(last, p + 0.1), F.HERO0, stop + 1e-6), sx = Math.round(270 + F.heroX(a) - camera(a).cx);
    add(a, b, "step", L, `footstep ${n + 1} (${n % 2 ? "left" : "right"} foot), screen x ${sx}${sx < -30 || sx > 570 ? " — off screen" : ""}`);
  }
  add(F.FT.turn[0], F.FT.turn[1], "swish", L, "crow turns its head toward the hero (quiet)");
  add(T.notice, T.notice + F.FT.bangPop, "alert", L, "\"!\" bubble pops above the crow");
  add(F.FT.bangOut, F.FT.bangOut + 0.3, "poof", L, "\"!\" dissolves (optional, soft)");
  add(F.FT.glare[0], F.FT.glare[1], "squint", L, "eyes narrow into a glare, brows angle down");
  add(F.FT.tag[0], F.FT.tag[0] + 0.25, "pop", L, "REMEMBERS tag dissolves in");
  add(F.FT.line2[0], F.FT.line2[1], "pop", L, "second tag line FOR YEARS appears");
  add(F.FT.back[0], F.FT.back[0] + 0.25, "uhoh", L, "hero looks back nervously (brows + \"o\" mouth fade in)");
  F.FT.hops.forEach(([t0, dur], i) => {
    add(t0, t0 + dur, "hop", L, i === 0 ? "crow hops along the log after the hero" : "crow flies up onto the branch above the hero");
    for (let n = Math.floor(t0 * F.FT.flapHz); n / F.FT.flapHz < t0 + dur; n++) { const a = Math.max(t0, n / F.FT.flapHz), b = Math.min(t0 + dur, (n + 1) / F.FT.flapHz); if (b - a > FRAME * 0.5) add(a, b, "flap", L, `wing flap during hop ${i + 1} (wings open with the arc: strongest mid-hop)`); }
    add(t0 + dur, t0 + dur + FRAME, "tap", L, `lands (hop ${i + 1}, impact)`);
  });
}

export const MOTIONS = out.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);

// node levels/meadow-motions.mjs → prints the table
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) for (const m of MOTIONS) console.log(m.t0.toFixed(3), m.t1.toFixed(3), m.kind.padEnd(8), m.level.padEnd(7), m.note);
