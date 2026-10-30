// catalog-v1 copy (2026-10-26) of work/pixel-lab/dogs/wet-nose/film/fx.mjs (smell particles: SMELL_COLS, rnd, particles,
// bit). Changes: import path; `bitCols` gives the film bit's three tones (rim = colour × 0.65, fill, light = 60 % white)
// for the zoom-continuous, self-anchored-dither bit in lib/flow-kit.mjs (bitL); the film's fixed 3×3 `bit` is kept as is.
import { mix, fade } from "../../../../../renderer/pixel/raster.mjs";

const R = Math.round;
export const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

// ---------------------------------------------------------------- smell particles
export const SMELL_COLS = ["#FF8AD8", "#7FE3F0", "#F4CA50", "#9CFF7A", "#C49AF0", "#FFB07A"];
/** n particles with stable random starts; each is {seed, x0, y0, col} in 0..1 box space */
export function particles(n, seed = 1) { const out = []; for (let i = 0; i < n; i++) out.push({ seed: seed * 100 + i, x0: rnd(seed * 31 + i * 7), y0: rnd(seed * 17 + i * 13), col: SMELL_COLS[i % SMELL_COLS.length], ph: rnd(i * 5 + seed) }); return out; }
/** draw a particle as a tiny glowing 2×2 bit with a lighter core */
export function bit(c, x, y, col, a = 1) { if (a <= 0) return; const g = fade(c, a); g.rect(R(x) - 1, R(y) - 1, 3, 3, mix(col, "#000000", 0.35)); g.rect(R(x) - 1, R(y) - 1, 2, 2, col); g.px(R(x) - 1, R(y) - 1, mix(col, "#FFFFFF", 0.6)); }
/** the film bit's tones for one smell colour: [rim, fill, light] */
const CACHE = new Map();
export function bitCols(col) { let v = CACHE.get(col); if (!v) { v = [mix(col, "#000000", 0.35), col, mix(col, "#FFFFFF", 0.6)]; CACHE.set(col, v); } return v; }
