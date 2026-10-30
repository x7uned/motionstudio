// pop/jump scan on the rendered 540×960 frames (no encode): the same tests as dogs/qa.mjs
import { frame } from "../render.mjs";
import { END } from "../timeline.mjs";
const F = Math.round(END * 30), D = new Float64Array(F); let prev = null, prev2 = null; const across = new Float64Array(F);
const diff = (a, b) => { let s = 0; for (let i = 0; i < a.length; i += 3) s += Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]); return s / a.length; };
for (let f = 0; f < F; f++) { const cur = frame(f / 30).d.slice(); if (prev) D[f] = diff(cur, prev); if (prev2) across[f - 1] = diff(cur, prev2); prev2 = prev; prev = cur; }
const pops = [], jumps = [];
for (let k = 1; k < F - 1; k++) { if (D[k] > 0.8 && D[k + 1] > 0.8 && across[k] < 0.45 * Math.min(D[k], D[k + 1])) pops.push((k / 30).toFixed(2)); }
for (let k = 2; k < F - 1; k++) if (D[k] > 2.5 && D[k] > 3 * Math.max(D[k - 1], D[k + 1])) jumps.push((k / 30).toFixed(2) + ":" + D[k].toFixed(1));
console.log("pops", pops.join(" ")); console.log("jumps", jumps.join(" "));
