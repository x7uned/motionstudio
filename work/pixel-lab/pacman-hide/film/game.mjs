// The hiding-spot game: Pac-Man parked at (11,14) facing up (the top of the short hall right of the start, against the
// wall); the four ghosts in constant chase under the Dossier rules with the no-up tiles (9,8), (11,8), (9,16), (11,16).
// From the starting state in loops.json the ghosts settle into loops that never reach him; the steady part repeats
// exactly every 80 tiles (Red 16, Pink 20, Blue 20, Orange 40), so the film can loop on whole periods.
// Game time τ is in tile steps (ghost speed 1 tile per unit); the film maps its clock onto τ (timeline.mjs).
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { exits, CORNER } from "./maze.mjs";
import { runGhosts, chaseTarget, GHOSTS } from "./sim2.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const LOOPS = JSON.parse(fs.readFileSync(HERE + "loops.json", "utf8"));
export const NOUP = [[9, 8], [11, 8], [9, 16], [11, 16]];
export const SPOT = [11, 14], START = [10, 16];
export const PAC = { x: SPOT[0] + 0.5, y: SPOT[1] + 0.5, dir: "up" };
const A = LOOPS.steadyFrom, PER = LOOPS.period;
const RUN = runGhosts({ maze: { exits }, G0: LOOPS.G0, t0: 0, t1: A + PER + 2, dt: 1 / 120, pacAt: () => PAC, modeAt: () => "chase", speedOf: () => 1, noUp: new Set(NOUP.map(([x, y]) => `${x},${y}`)), sample: LOOPS.sample,
  targetOf: (n, m, P, gx, gy, red) => chaseTarget(n, P, gx, gy, red, CORNER.orange) });
const wrap = (τ) => ((τ % PER) + PER) % PER;
/** ghost n at game time τ (any real; periodic with PER) → {x, y, dir, T} */
export const ghost = (n, τ) => RUN.at(n, A + wrap(τ));
/** decisions in one steady period, τ relative to the period start */
export const DECISIONS = RUN.decisions.filter((d) => d.τ >= A && d.τ < A + PER).map((d) => ({ ...d, τ: d.τ - A }));
/** each ghost's loop: the tiles it visits in one period, in order */
export const LOOP = Object.fromEntries(GHOSTS.map((n) => { const out = []; for (let k = 0; k < PER * 4; k++) { const g = ghost(n, k / 4); const key = `${Math.floor(g.x)},${Math.floor(g.y)}`; if (out[out.length - 1] !== key) out.push(key); } return [n, [...new Set(out)].map((s) => s.split(",").map(Number))]; }));
export { GHOSTS, PER };
