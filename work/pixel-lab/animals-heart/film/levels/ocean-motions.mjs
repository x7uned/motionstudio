// Audible motions of LV1 ocean (blue whale) and LV3 lagoon (sea turtle) for sound design: one entry per motion, computed
// from the same timing the picture reads (levels/ocean.mjs TIMING, levels/lagoon.mjs TIMING) — no hard-coded seconds.
// Entry: { t0, t1, kind, level 0..1, note }. Heartbeats themselves are NOT here: they come from BEATS (timeline.mjs).
// node levels/ocean-motions.mjs → prints the table.
import { CAM, LV } from "../timeline.mjs";
import { TIMING as O } from "./ocean.mjs";
import { TIMING as G } from "./lagoon.mjs";

// the harness camera (render.mjs camera(), copied: importing render.mjs from a sound script could start a render)
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function camX(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1]; return a.cx + (b.cx - a.cx) * ease((t - a.t) / (b.t - a.t || 1)); }
/** Is world x within `pad` px of the visible frame at time t? */
const near = (wx, t, pad = 60) => Math.abs(wx - camX(t)) < 270 + pad;

const M = [];
const add = (t0, t1, kind, level, note) => M.push({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: +level.toFixed(2), note });

// ---------------------------------------------------------------- LV1 · the blue whale
add(O.TB, O.TB + O.RIPPLE, "shimmer", 0.8, "ring of light spreads from the whale's one beat");
add(O.TB, O.TB + 0.3, "glow", 0.6, "artery swells on the beat");
add(O.PICK[0], O.PICK[0] + O.PICK[1], "pickup", 0.8, "2 BPM");
add(O.SHREW_IN, O.SHREW_IN + O.POP_IN, "pop", 0.7, "shrew portrait bubble pops in");
add(O.TAGS.second[0], O.TAGS.second[0] + 0.3, "tag", 0.6, "25 / SECOND");
add(O.SHREW_OUT, O.SHREW_OUT + O.POP_OUT, "pop", 0.45, "shrew portrait bubble pops out");
add(O.RING_IN, O.RING_IN + O.RING_FADE, "draw", 0.5, "ring timer appears around the heart");
add(O.RING_IN, O.RING_OUT + 0.5, "draw", 0.2, "ring timer keeps filling in real time since the beat");
add(O.TAGS.beat30[0], O.TAGS.beat30[0] + 0.3, "tag", 0.6, "1 BEAT / 30 S");
add(O.ART_IN, O.ART_IN + O.ART_FADE, "glow", 0.6, "artery lights up (x-ray)");
add(O.TAGS.artery[0], O.TAGS.artery[0] + 0.35, "tag", 0.6, "STRETCHY ARTERY");
// glow blobs of blood pushed along the artery: blob k is brightest mid-pass, when the RECOIL-eased flow·FLOW_TURNS + k/BLOBS
// reaches n + ½; listed while the artery is shown clearly (they move slowly then: the recoil is nearly spent)
{
  const tAt = (f) => (f >= 1 ? Infinity : O.TB - O.RECOIL * Math.log(1 - f)), shown = [O.ART_IN, O.RING_OUT + 0.15];
  for (let k = 0; k < O.BLOBS; k++) for (let n = 0; ; n++) {
    const tp = tAt((n + 0.5 - k / O.BLOBS) / O.FLOW_TURNS); if (tp > shown[1]) break;
    if (tp >= shown[0]) add(tp - 0.5, tp + 0.5, "glow", 0.3, `blood glow passes along the artery (blob ${k + 1})`);
  }
}

// ---------------------------------------------------------------- LV3 · the sea turtle (only while it is in or near the frame)
const turtleOn = (t) => near(G.TX, t, 60), [L0, L1] = LV.turtle.map((v, i) => v + (i ? 1 : -1.5));
add(G.HEART_WIN[0], G.HEART_WIN[0] + 0.4, "glow", 0.5, "turtle heart icon appears");
add(G.PICK[0], G.PICK[0] + G.PICK[1], "pickup", 0.8, "11 BPM");
add(G.HEART_WIN[1], G.HEART_WIN[1] + 0.5, "glow", 0.25, "turtle heart icon fades");
for (let i = 0; i < G.BUBBLES.n; i++) for (let n = Math.ceil((L0 + i * G.BUBBLES.phase) / G.BUBBLES.period); ; n++) {
  const t0 = n * G.BUBBLES.period - i * G.BUBBLES.phase; if (t0 > L1) break;
  if (turtleOn(t0)) add(t0, t0 + G.BUBBLES.life * G.BUBBLES.period, "bubble", 0.3, `nostril bubble (stream ${i + 1})`);
}
for (let i = 0; i < G.ZS.n; i++) for (let n = Math.ceil(L0 / G.ZS.period + i / G.ZS.n); ; n++) {
  const t0 = (n - i / G.ZS.n) * G.ZS.period; if (t0 > L1) break;
  if (turtleOn(t0)) add(t0, t0 + G.ZS.fadeIn * G.ZS.period, "tick", 0.25, "sleepy Z appears");
}
add(G.CLOCK.win[0], G.CLOCK.win[0] + 0.35, "tag", 0.55, "HOURS clock appears");
// the hands spin smoothly; one tick each time the fast (red) hand passes 12 while the clock is shown
for (let n = 1; ; n++) { const t = G.CLOCK.start + (n * 2 * Math.PI) / G.CLOCK.minute; if (t > G.CLOCK.win[1]) break; add(t, t + 0.05, "tick", 0.4, "clock hand passes 12"); }
add(G.CLOCK.win[1], G.CLOCK.win[1] + 0.4, "tag", 0.25, "HOURS clock fades");

M.sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
export const MOTIONS = M;

import { fileURLToPath } from "node:url";
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) console.table(MOTIONS);
