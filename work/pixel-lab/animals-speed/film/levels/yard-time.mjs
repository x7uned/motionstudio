// LV4 · yard (cat): every time and path the picture and the sounds use, from the measured words (timeline.mjs).
// "Your cat can sprint at about forty-eight." The tabby sits facing the camera; a wind-up toy mouse trailing its string
// zips in behind its paws; the cat crouches and wiggles; on "sprint" it explodes into a zoomies lap round the yard,
// chasing the mouse, and skids to a stop back at the centre on "forty-eight", the mouse pinned under its paw.
import { EV, LV } from "../timeline.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
// ---------------------------------------------------------------- times (seconds)
export const MOUSE_IN = [EV.cat2 - 0.1, EV.cat2 + 0.36];       // the toy mouse zips in along the fence and stops left of the cat
export const MOUSE_WAIT = [MOUSE_IN[1], EV.sprint];            // …and jitters there (wind-up)
export const CROUCH = [EV.cat2 + 0.06, EV.cat2 + 0.27];        // sit → hunting crouch (crossfade while the head sinks)
export const WIGGLE = [EV.cat2 + 0.16, EV.sprint];             // butt wiggle
export const LAUNCH = EV.sprint;                               // explodes into the sprint
export const SKID_END = EV.fortyEight + 0.26;                  // stops back at the centre
export const RUN = [LAUNCH, SKID_END];
export const ACC = 0.1, DEC = 0.3;                             // the cat's acceleration and skid (seconds)
export const SKID = [SKID_END - DEC, SKID_END];
export const SKID_SHIFT = 40;                                  // the skid carries the cat 40 px past the loop's end point (head lands at the centre)
export const MOUSE_RUN = [LAUNCH, SKID_END - 0.1];             // the mouse flees round the loop ahead of the cat and stops
export const PROUD = [SKID_END, SKID_END + 0.15];               // skid pose → front-on proud sit (dust puff hides the swap)
export const SETTLE = [SKID_END + 0.55, SKID_END + 0.95];     // the puffed fur settles (quick dissolve back to smooth)
export const HAPPY = [SKID_END - 0.15, LV.cat[1] + 0.2];       // happy closed eyes while proud
export const TURNS = [];                                       // filled below: times the cat passes the loop ends

// ---------------------------------------------------------------- the zoomies loop (rest-screen coordinates)
// an ellipse on the lawn: back lane y 640 (the fence plane, where the cat sat), front lane y 684
export const LOOP = { cx: 270, cy: 662, rx: 160, ry: 22 };
export const loopAt = (th) => [LOOP.cx + LOOP.rx * Math.cos(th), LOOP.cy + LOOP.ry * Math.sin(th)];
/** Trapezoid velocity profile: fraction 0..1 of the way at time t over [a, b] with accel/decel times ta/td. */
function trap(t, a, b, ta, td) {
  const T = b - a, u = Math.max(0, Math.min(T, t - a)), v = 1 / (T - ta / 2 - td / 2);
  if (u < ta) return (v * u * u) / (2 * ta);
  if (u < T - td) return v * (u - ta / 2);
  const w = T - u; return 1 - (v * w * w) / (2 * td);
}
export const CAT_TH0 = 1.5 * Math.PI, CAT_TH1 = -0.5 * Math.PI;   // back centre → one lap (leftwards first) → back centre
export function catTheta(t) { return CAT_TH0 + (CAT_TH1 - CAT_TH0) * trap(t, RUN[0], RUN[1], ACC, DEC); }
/** Inverse: the time the cat passes loop angle th (bisection). */
function catTimeAt(th) { let a = RUN[0], b = RUN[1]; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (catTheta(m) > th) a = m; else b = m; } return (a + b) / 2; }
TURNS.push(catTimeAt(Math.PI), catTimeAt(0));                  // left end, right end
export const MOUSE_X0 = 600, MOUSE_STOP = 118, MOUSE_END = 232;
const backY = (x) => { const u = (x - LOOP.cx) / LOOP.rx; return Math.abs(u) >= 1 ? LOOP.cy : LOOP.cy - LOOP.ry * Math.sqrt(1 - u * u); };
const MTH0 = Math.PI + Math.acos(-(MOUSE_STOP - LOOP.cx) / LOOP.rx), MTH1 = -0.5 * Math.PI - Math.asin((LOOP.cx - MOUSE_END) / LOOP.rx);
/** The toy mouse: { x, y, dir (−1 left / 1 right), moving 0..1 } at time t (rest-screen coordinates). */
export function mouseAt(t) {
  if (t < MOUSE_IN[1]) { const k = clamp01((t - MOUSE_IN[0]) / (MOUSE_IN[1] - MOUSE_IN[0])), e = 1 - (1 - k) * (1 - k); const x = MOUSE_X0 + (MOUSE_STOP - MOUSE_X0) * e; return { x, y: backY(x), dir: -1, moving: k < 1 ? 1 - k * k * 0.6 : 0 }; }
  if (t < MOUSE_RUN[0]) return { x: MOUSE_STOP, y: backY(MOUSE_STOP), dir: -1, moving: 0 };
  const f = trap(t, MOUSE_RUN[0], MOUSE_RUN[1], 0.06, 0.18), th = MTH0 + (MTH1 - MTH0) * f, [x, y] = loopAt(th);
  return { x, y, dir: Math.sin(th) > 0 ? 1 : -1, moving: t < MOUSE_RUN[1] ? 1 : 0, th };
}
