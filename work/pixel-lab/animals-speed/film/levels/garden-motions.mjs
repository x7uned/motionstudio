// Audible motions of the hook + LV1 · garden (garden.mjs), one entry per motion { t0, t1, kind, level, note } in seconds,
// computed from the very timing functions the picture uses (GT, runnerAt, catX, snailAt) — no hard-coded seconds.
import { EV } from "../timeline.mjs";
import { GT, runnerAt, catX } from "./garden.mjs";

const list = [], r3 = (v) => Math.round(v * 1000) / 1000;
const add = (t0, t1, kind, level, note) => list.push({ t0: r3(t0), t1: r3(t1), kind, level, note });

// --- hook: the sprinter's footfalls (gait phase crosses each half cycle while he moves and is on screen)
{ let prev = runnerAt(0), n = 0;
  for (let t = 1 / 120; t < GT.dashOff + 1.6; t += 1 / 120) { const s = runnerAt(t); if (Math.floor(2 * s.p) > Math.floor(2 * prev.p) && s.v > 30 && s.x < 560) add(t, t + 0.06, "step", 0.45, `runner footstep ${++n}`); prev = s; } }
add(EV.outrun + 0.25, EV.fastest1 + 0.35, "slide", 0.4, "the runner skids to a stop (stop pose)");
add(EV.outrun + 0.12, EV.outrun + 0.45, "uhoh", 0.55, "his jaw drops as the cat zooms past");
// the orange tabby zooms across (left → right) with dust and speed lines
const catExit = GT.catIn + (600 - catX(GT.catIn)) / GT.catV;
add(GT.catIn, catExit, "dash", 0.9, "the orange tabby zooms past the runner");
add(GT.catIn, catExit, "patter", 0.35, "cat paws in a full gallop");
// the runner dashes off after the cat
{ let tExit = GT.dashOff; while (runnerAt(tExit).x < 560 && tExit < GT.dashOff + 3) tExit += 1 / 60; add(GT.dashOff, tExit, "dash", 0.6, "the runner dashes off to the right after the cat"); }
// --- "Let's line up …": the banner unrolls from the bunting
add(GT.bannerIn, GT.bannerUp, "rustle", 0.5, "SLOWEST → FASTEST banner unrolls");
// --- LV1: the snail climbs up behind the table and crawls to the start ring
add(GT.peek0, GT.peek1, "squish", 0.4, "snail climbs up over the back edge of the table (eye stalks first)");
add(GT.peek1, GT.toStart, "squish", 0.35, "snail crawls forward onto the start ring");
add(GT.hello - 0.05, GT.hello + 0.45, "bounce", 0.3, "snail gives a little hop and smile (race sticker 1)");
// the race: one peristaltic surge = one squish (same wave count/span as snailAt)
{ const span = GT.finish + 0.25 - GT.race0, waves = 4.5; for (let i = 0; i < Math.ceil(waves); i++) { const a = GT.race0 + (i * span) / waves, b = Math.min(GT.finish + 0.25, GT.race0 + ((i + 1) * span) / waves); add(a, b, "squish", 0.4, `snail crawl surge ${i + 1} (slime trail)`); } }
add(GT.tag0, GT.tag0 + 0.3, "pop", 0.45, "33 CM tag with the stopwatch");
add(GT.tag0, GT.finish, "tick", 0.3, "stopwatch hand sweeping (two laps = two minutes), stops at the finish");
add(GT.tag2, GT.tag2 + 0.3, "pop", 0.4, "2 MIN line appears");
add(GT.finish, GT.finish + 0.8, "sparkle", 0.5, "snail crosses the chalk finish circle");
add(GT.tagOut, GT.tagOut + 0.3, "swish", 0.2, "tag dissolves as the camera leaves");

list.sort((a, b) => a.t0 - b.t0);
export const MOTIONS = list;
