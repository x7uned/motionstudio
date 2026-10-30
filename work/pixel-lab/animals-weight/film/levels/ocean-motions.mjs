// Audible motions of LV10 ocean + the dawn shore (sound design): one entry per motion, computed from the same timing the
// picture reads (levels/ocean.mjs TIMING, levels/shore.mjs TIMING + beeFlight) — no hard-coded seconds.
// Entry: { t0, t1, kind, level 0..1, note }. Heartbeats are not here (none in this film's ocean anyway).
// node levels/ocean-motions.mjs → prints the table.
import { CAM, LV, END } from "../timeline.mjs";
import { TIMING as O } from "./ocean.mjs";
import { TIMING as S, beeFlight } from "./shore.mjs";

// the harness camera (render.mjs camera(), copied: importing render.mjs from a sound script could start a render)
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function camX(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1]; return a.cx + (b.cx - a.cx) * ease((t - a.t) / (b.t - a.t || 1)); }
/** Is world x within `pad` px of the visible frame at time t? */
const near = (wx, t, pad = 60) => Math.abs(wx - camX(t)) < 270 + pad;
/** First time after t0 (searching to t1, 1/30 s steps) when world x has left the frame. */
function leaves(wx, t0, t1) { for (let t = t0; t <= t1; t += 1 / 30) if (!near(wx, t, 20)) return t; return t1; }

const M = [];
const add = (t0, t1, kind, level, note) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: +level.toFixed(2), note });

// ---------------------------------------------------------------- LV10 · the whale
for (const [t0, size, life] of O.BLOWS) add(t0, t0 + life, "splash", size > 0.6 ? 1 : 0.35, size > 0.6 ? "spout" : "spout (small breath)");
add(O.PICK[0], O.PICK[0] + O.PICK[1], "pickup", 0.8, "150 T");
add(O.BAL_IN, O.BAL_IN + O.BAL_FADE, "tag", 0.5, "balance appears (whale side down)");
const D = O.ELE_B - O.ELE_A;
for (let k = 0; k < 25; k++) add(O.ELE_A + (k * D) / 25, O.ELE_A + ((k + 1) * D) / 25, "drop", 0.45 + 0.02 * k, `elephant ${k + 1}/25`);
add(O.ELE_A, O.ELE_B, "swing", 0.6, "balance rises to level as the elephants pile up");
add(O.SETTLE[0][0], O.SETTLE[0][1], "swing", 0.3, "balance settles (small wobble)");
add(O.LABELS[0][0], O.LABELS[0][0] + 0.3, "tag", 0.6, "25 ELEPHANTS = 1 WHALE");
add(O.HAPPY[0][0], O.HAPPY[0][1], "chime", 0.6, "whale's happy squint");
add(O.HEART_ON, O.HEART_ON + O.HEART_FADE, "glow", 0.8, "heart lights up inside the whale");
add(O.SWAP - 0.1, O.SWAP + 0.55, "swing", 0.55, "elephants and whale icon leave, heart alone tips the balance");
add(O.SWAP + 0.15, O.SWAP + 0.55, "glow", 0.45, "heart appears on the scale");
O.HERO_T.forEach((h, i) => add(h, h + O.HERO_FALL, "drop", 0.6, `people ${i + 1}/3`));
add(O.HERO_T[0], O.HERO_T[2] + O.HERO_FALL, "swing", 0.5, "balance levels with three people");
add(O.SETTLE[1][0], O.SETTLE[1][1], "swing", 0.3, "balance settles (small wobble)");
add(O.LABELS[1][0], O.LABELS[1][0] + 0.35, "tag", 0.6, "HEART ≈ 3 PEOPLE");
add(O.HAPPY[1][0], O.HAPPY[1][1], "chime", 0.6, "whale's happy squint");
add(O.BAL_OUT, O.BAL_OUT + O.BAL_FADE, "tag", 0.3, "balance fades");

// ---------------------------------------------------------------- the dawn shore (loop pan)
const flights = Array.from({ length: S.NB }, (_, i) => beeFlight(i)), b0 = Math.min(...flights.map((f) => f[0])), b1 = Math.max(...flights.map((f) => f[1]));
// the swarm flies in from the meadow edge (x ≈ 5640); it is heard once that edge is within ~300 px of the frame
let bIn = b0; while (bIn < b1 && !near(5640, bIn, 300)) bIn += 1 / 30;
add(bIn, b1, "buzz", 0.6, "tiny: the bee swarm streams onto the seesaw");
add(b1, leaves(S.SWARM_X, b1, END), "buzz", 0.35, "tiny: the swarm hovers over the seat until it leaves the frame");
add(S.TILT[0], S.TILT[1], "swing", 0.6, "seesaw tips level (whale vs bees)");
add(S.WOBBLE[0], S.WOBBLE[1], "swing", 0.3, "seesaw settles (small wobble)");
add(S.TAG[0], S.TAG[0] + 0.35, "tag", 0.6, "1,000,000,000+ BEES");
// swash: the water runs up the beach while sin(rate·t) rises (trough → crest) and slides back while it falls;
// only the halves during which the waterline is in or near the frame
for (let n = Math.floor((LV.loop[0] * S.SWASH.rate) / Math.PI) - 1; ; n++) {
  const t0 = (Math.PI * n - Math.PI / 2) / S.SWASH.rate, t1 = (Math.PI * n + Math.PI / 2) / S.SWASH.rate, up = n % 2 === 0; if (t0 > END) break;
  if (t1 < LV.loop[0]) continue;
  let on = false; for (let t = Math.max(t0, LV.loop[0]); t <= t1; t += 1 / 30) if (near(S.WATERLINE, t, 120)) { on = true; break; }
  if (on) add(t0, t1, "splash", up ? 0.45 : 0.3, up ? "wave runs up the beach" : "wave slides back down the beach");
}

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
export const MOTIONS = M;

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.table(MOTIONS);
