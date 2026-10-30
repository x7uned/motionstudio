// The film's end-of-level game: game.json holds the engine configuration (remaining dots, opening states, level time)
// and the player's settings; the game is replayed here with the same engine (engine.mjs) and the same player
// (dev/ai.mjs), so everything on screen follows the rules. Samples every 1/120 s of game time.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { play } from "./dev/ai.mjs";
import { GHOSTS, SPEED, ELROY } from "./engine.mjs";
import { DIRS } from "./maze.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
export const GAMECFG = JSON.parse(fs.readFileSync(HERE + "game.json", "utf8"));
const RUN = play(GAMECFG.cfg, { ...GAMECFG.o, T: GAMECFG.T ?? 46 });
export const REC = RUN.rec, EATS = RUN.E.eats, DT = 1 / 120, T_MAX = REC[REC.length - 1].τ;
export const DOTS0 = new Set(GAMECFG.cfg.dots), TOTAL = DOTS0.size;
const idx = (τ) => { const f = Math.max(0, Math.min(REC.length - 1.001, τ / DT)), i = Math.floor(f); return [i, f - i]; };
const lerp = (a, b, k) => a + (b - a) * k;
export function pac(τ) { const [i, k] = idx(τ), a = REC[i], b = REC[i + 1]; return { x: lerp(a.P[0], b.P[0], k), y: lerp(a.P[1], b.P[1], k), dir: (k < 0.5 ? a : b).P[2], hold: a.P[3] }; }
export function ghost(n, τ) { const [i, k] = idx(τ), a = REC[i].g[n], b = REC[i + 1].g[n]; const jump = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) > 0.6; const c = k < 0.5 ? a : b; return { x: jump ? c[0] : lerp(a[0], b[0], k), y: jump ? c[1] : lerp(a[1], b[1], k), dir: c[2], T: [c[3], c[4]] }; }
export const dotsLeft = (τ) => { let n = TOTAL; for (const e of EATS) if (e.τ <= τ) n--; return n; };
export const elroyAt = (τ) => { const n = dotsLeft(τ); return n <= ELROY[1] ? 2 : n <= ELROY[0] ? 1 : 0; };
export const modeAt = (τ) => REC[idx(τ)[0]].m;
export const eatTime = new Map(EATS.map((e) => [e.key, e.τ]));
export const T20 = EATS[TOTAL - ELROY[0] - 1]?.τ, T10 = EATS[TOTAL - ELROY[1] - 1]?.τ;
export const SCATTER = (() => { let a = null, b = null; for (const r of REC) { if (r.m === "scatter" && a === null && r.τ > (T20 ?? 0)) a = r.τ; if (a !== null && b === null && r.m !== "scatter") b = r.τ; } return [a, b]; })();
// distance Pac-Man has moved (for the chomp), integrated over the samples
const MOVED = new Float64Array(REC.length); for (let i = 1; i < REC.length; i++) MOVED[i] = MOVED[i - 1] + Math.hypot(REC[i].P[0] - REC[i - 1].P[0], REC[i].P[1] - REC[i - 1].P[1]);
export const moved = (τ) => { const [i, k] = idx(τ); return lerp(MOVED[i], MOVED[i + 1], k); };
export { GHOSTS, SPEED, ELROY, DIRS };
export const V100 = GAMECFG.cfg.V100;
