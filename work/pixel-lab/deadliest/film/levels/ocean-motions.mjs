// Audible motions of LV1 ocean (sound design): one entry per motion, computed from the same timing the picture reads
// (levels/ocean.mjs TIMING) — no hard-coded seconds. Entry: { t0, t1, kind, level 0..1, note }.
// node levels/ocean-motions.mjs → prints the table.
import { TIMING as O } from "./ocean.mjs";

const M = [];
const add = (t0, t1, kind, level, note) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: +level.toFixed(2), note });

// the hook: the fin cutting the surface, the U-turn, the glide back, the turn toward the camera under water
add(O.T0, O.TURN[0], "swim", 0.65, "shark fin cuts through the water, swimming left (already moving at t = 0)");
add(O.TURN[0], O.TURN[1], "swish", 0.45, "shark U-turns (circling)");
add(O.GLIDE[0], O.GLIDE[1], "swim", 0.5, "fin glides back to the centre, slowing down");
add(O.XF[0], O.XF[1], "bubbles", 0.35, "shark turns toward the camera under water");
// "The shark?" — it rises out of the sea
add(O.RISE[0], O.RISE[1], "rise", 0.7, "shark rises out of the sea facing the camera");
add(O.BREAK, O.BREAK + O.SPLASH, "splash", 0.9, "head breaks the surface: spray crown, water streaming off");
// "No!"
add(O.WORRY[0], O.WORRY[0] + 0.18, "uhoh", 0.55, "grin drops, worried brows");
add(O.NO_POP[0], O.NO_POP[1], "alert", 0.8, "big red pixel X pops beside the shark (No!)");
// "…the safest one on this list"
add(O.HALO[0], O.HALO[1], "sparkle", 0.6, "golden halo settles over the fin");
add(O.BANNER[0], O.BANNER[0] + 0.3, "chime", 0.6, "SAFEST ribbon unfurls");
add(O.SHY[0], O.SHY[0] + 0.25, "trill", 0.35, "shark blushes, happy closed eyes");
// "Sharks kill about ten people a year" — it lifts a pectoral fin and waves (bye as the camera pans on)
add(O.WAVE[0], O.WAVE[0] + O.LIFT, "splash", 0.4, "pectoral fin lifts out of the water");
const half = 1 / (2 * O.WAVE_HZ), w0 = O.WAVE[0] + O.LIFT + half / 2, wEnd = O.WAVE[1] - O.LOWER;   // strokes between the swing extremes
for (let t = w0, n = 0; t + half <= wEnd + 1e-6; t += half, n++) add(t, t + half, "swish", 0.28, `fin waves (${n % 2 ? "back" : "out"})`);
add(O.WAVE[1] - O.LOWER, O.WAVE[1], "splash", 0.25, "fin goes back into the water");

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
export const MOTIONS = M;

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.table(MOTIONS);
