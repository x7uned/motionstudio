// Audible motions of LV2 savanna (sound design): one entry per motion, computed from the same timing and pure motion
// functions the picture reads (levels/savanna.mjs TIMING, birdAt, herdX) — no hard-coded seconds.
// Entry: { t0, t1, kind, level 0..1, note }. node levels/savanna-motions.mjs → prints the table.
import { CAM, LV } from "../timeline.mjs";
import { TIMING as S, birdAt, NBIRDS, herdX, NHERD, HERD_GONE } from "./savanna.mjs";

// the harness camera (render.mjs camera(), copied: importing render.mjs from a sound script could start a render)
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function cam(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return { cx: a.cx + (b.cx - a.cx) * k, cy: a.cy + (b.cy - a.cy) * k }; }
const onFrame = (wx, wy, t) => { const C = cam(t), x = 270 + wx - C.cx, y = 480 + wy - C.cy; return x > -10 && x < 550 && y > -10 && y < 970; };

const M = [];
const add = (t0, t1, kind, level, note) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: +level.toFixed(2), note });

add(S.INHALE[0], S.INHALE[1], "rise", 0.4, "lion draws a breath, head tips back");
add(S.OPEN[0], S.CLOSE[1], "roar", 1, "big cute lion ROAR (mouth open → closed)");
add(S.OPEN[0] + 0.05, S.CLOSE[1] + 0.25, "rustle", 0.4, "grass bends away from the roar");
// the weaver birds take off and flap away until the last one has left the frame
let tb = S.BIRDS; for (; tb < LV.lion[1] + 3; tb += 1 / 30) { let any = false; for (let i = 0; i < NBIRDS; i++) { const B = birdAt(i, tb); if (onFrame(B.x, B.y, tb)) any = true; } if (!any) break; }
add(S.BIRDS, tb, "flutter", 0.3, "weaver birds take off from the acacia and fly away");
// the far herd bolts and gallops off over the horizon
let th = S.HERD_RUN; for (; th < LV.lion[1] + 3; th += 1 / 30) { let any = false; for (let i = 0; i < NHERD; i++) if (herdX(i, th) < HERD_GONE) any = true; if (!any) break; }
add(S.HERD_RUN, th, "patter", 0.22, "far wildebeest herd gallops off (tiny, distant)");
add(S.PROUD[0], S.PROUD[1], "chime", 0.45, "lion settles into a proud happy grin");
add(S.TWINKLE[0], S.TWINKLE[1], "twinkle", 0.45, "twinkle beside the mane");

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
export const MOTIONS = M;

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.table(MOTIONS);
