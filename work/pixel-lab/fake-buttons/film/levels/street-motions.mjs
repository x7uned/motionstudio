// Sounds of the STREET level («Fake buttons»): one 8-bit sound per visible motion, computed from the same constants as
// the picture (street-time.mjs, street-traffic.mjs), so every sound lasts exactly as long as its motion.
import { EV, PRESSES, PRESS, WALK_ON, WALK_XF, HILITE, SCREEN_ON, LENS, PHONE, FLASH, CONTROL_POP, HEART, HOPS, END } from "./street-time.mjs";
import { CARS, carAt, FORE_CARS, foreWindow, CROSSERS } from "./street-traffic.mjs";
import { BACK_TO_CORNER, PAN_TO_LOBBY } from "../timeline.mjs";

const L = "street", M = [];
const add = (t0, t1, kind, level, note) => { if (t1 > t0 && t0 < END) M.push({ t0: +t0.toFixed(3), t1: +Math.min(t1, END).toFixed(3), kind, level, note }); };
// the corner is on screen before the pan to the lobby and after the glide back
const onCorner = (t) => t < PAN_TO_LOBBY[0] + 0.3 || t > BACK_TO_CORNER[1] - 0.3;

// presses (the hero leans in, the button sinks, WAIT lights)
for (const p of PRESSES) add(p - PRESS.in, p + PRESS.hold + PRESS.out, "click", 0.8, "crosswalk button press (sinks, WAIT lamp)");
add(HILITE[0], HILITE[1] + 0.35, "glow", 0.45, "pulsing highlight around the button box");
// the controller cabinet and the signal (run by the computer, never by the button)
add(SCREEN_ON[0], SCREEN_ON[1], "screen", 0.55, "cabinet screen lights up: AUTO");
add(SCREEN_ON[1], WALK_ON[0][0], "count", 0.4, "AUTO countdown 0:05 → 0:00 (bar drains)");
for (const [a, b] of WALK_ON) { add(a, a + WALK_XF + 0.08, "chime", 0.7, "WALK comes on by itself (timer at 0:00)"); if (b < END) add(b, b + WALK_XF, "blip", 0.35, "back to DON'T WALK (raised hand)"); }
// the first car braking to a stop for each red (on screen)
for (const [a] of WALK_ON) {
  let best = null;
  for (const c of CARS) { let t0 = null; for (let t = a - 2.4; t < a + 0.6; t += 1 / 30) { const st = carAt(c, t); if (!st) continue; if (t0 === null && st.brake > 0.5 && st.v > 30 && st.x > -560 && st.x < -120) t0 = t; if (t0 !== null && st.v < 3) { if (!best || t0 < best[0]) best = [t0, t]; break; } } }
  if (best) add(Math.max(best[0], best[1] - 0.7), best[1], "hiss", 0.3, "a car brakes to a stop at the zebra (last 0.7 s)");
}
// the X-ray lens
add(LENS.open[0], LENS.open[1], "zap", 0.6, "X-ray lens opens over the button box");
add(LENS.unplug[0] + 0.1, LENS.unplug[1], "pop", 0.6, "the button's plug comes out of the cabinet cable");
add(LENS.cross[0], LENS.cross[1], "wrong", 0.55, "red ✕: not connected");
add(LENS.tag[0], LENS.tag[0] + 0.5, "flip", 0.4, "OFF tag swings in");
add(LENS.close[0], LENS.close[1], "swish", 0.45, "X-ray lens closes back into the box");
// the hero
add(HOPS[0][0], HOPS[0][1], "boing", 0.5, "hero startled on 'nothing' (surprised hop)");
add(PHONE.lift[0], PHONE.lift[1], "swish", 0.25, "hero lifts the phone");
add(FLASH[0], FLASH[1], "click", 0.9, "phone camera click + white flash (CLICK!)");
add(PHONE.out[0], PHONE.out[1], "dissolve", 0.3, "phone dissolves as he shrugs");
add(CONTROL_POP[0], CONTROL_POP[0] + (CONTROL_POP[1] - CONTROL_POP[0]) / 1.6, "sparkle", 0.6, "+CONTROL pickup rises over the button");
add(HOPS[1][0], HOPS[1][1], "boing", 0.35, "happy hop on 'good'");
add(HEART[0], HEART[0] + 0.18 * (HEART[1] - HEART[0]), "pop", 0.55, "a heart pops over the hero");
// pedestrians crossing on WALK (steps while they walk across)
{ const w = []; for (const P of CROSSERS) { const K = P.keys; for (let i = 0; i < K.length - 1; i++) if (Math.abs(K[i + 1][2] - K[i][2]) > 20 && onCorner(K[i][0])) w.push([K[i][0], K[i + 1][0], P.kind]); }
  w.sort((a, b) => a[0] - b[0]); const merged = []; for (const x of w) { const m = merged[merged.length - 1]; if (m && x[0] <= m[1]) { m[1] = Math.max(m[1], x[1]); m[2] += " + " + x[2]; } else merged.push([...x]); }
  for (const [a, b, who] of merged) add(a, b, "step", 0.22, `pedestrians cross on WALK (${who})`); }
// cars passing in the avenue's near lane (bottom of the frame)
for (const fc of FORE_CARS) { const [a, b] = foreWindow(fc); if (onCorner(a) && onCorner(b)) add(a, b, "engine", 0.3, `${fc.kind} passes at the bottom`); }

export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
