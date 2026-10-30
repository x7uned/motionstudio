// catalog-v1 item «hand»: a cartoon right hand in a dark ribbed sleeve cuff, seen from the back (first-person, thumb
// on the left), adapted from work/pixel-lab/zombie-mouse/film/pov-hands.mjs drawHands1 (skin + hoodie ramps, pillow
// shading, knuckles; copy and live rig in lib/zombiemouse-hand.mjs) with the tap of fake-buttons/film/levels/cta.mjs#hand
// (eased press on the fingertip). Every pose is a continuous parameter: finger flex folds fingers into a fist, the
// aim turns the hand toward s.look blended by s.lookK, the tap dip and impact ticks ride on s.acc.
import { drawHand } from "./lib/zombiemouse-hand.mjs";
import { fade } from "./lib/cute.mjs";

const R = Math.round;
const S0 = 1.1;
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;   // shortest way round
export default {
  kind: "hand",
  covers: ["hand"],
  source: "zombie-mouse/film/pov-hands.mjs#drawHands1",
  desc: "cartoon hand in a dark sleeve cuff, seen from the back; can point at, tap, grab its target or wave",
  hw: 58, hh: 74, start: "relaxed open hand, fingers drift a little",
  states: {
    idle: [0.5, "relaxed open hand"],
    point: [0.45, "points its index finger at the target prop", "blip"],
    tap: [0.6, "points at the target and taps it with the fingertip", "tick"],
    grab: [0.5, "reaches toward the target and closes into a fist", "thump"],
    wave: [0.5, "open hand waves hello, swinging side to side", "flutter"],
  },
  base: { ci: 0.2, co: 0.3, th: 0.25, sp: 0.35, aim: 0, wave: 0, reach: 0 },
  st: {
    idle: { ci: 0.2, co: 0.3, th: 0.25, sp: 0.35, aim: 0, wave: 0, reach: 0 },
    point: { ci: 0, co: 1, th: 1, sp: 0, aim: 1, wave: 0, reach: 0 },
    tap: { ci: 0, co: 1, th: 1, sp: 0, aim: 1, wave: 0, reach: 0 },
    grab: { ci: 1, co: 1, th: 1, sp: 0, aim: 0.75, wave: 0, reach: 1 },
    wave: { ci: 0, co: 0, th: 0, sp: 1, aim: 0, wave: 1, reach: 0 },
  },
  demo: { target: true },
  notes: "floating hand with a cut-off sleeve cuff (no arm); back of the hand always faces the viewer (wave too); fist reads as knuckle bumps; a target below the hand turns it upside down",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z;
    const px = cx, py = cy + 4 * S + Math.sin(t * 1.6) * 1.5;
    // aim: the index direction (fingers up at rest) turns toward the target, blended by its presence
    const rest = 0.12 + 0.03 * Math.sin(t * 1.1);
    let ang = rest, toward = [0, -1], kL = 0;
    if (s.look) { const dx = s.look[0] - px, dy = s.look[1] - py, d = Math.hypot(dx, dy) || 1; toward = [dx / d, dy / d]; kL = s.lookK; ang = lerpAng(rest, Math.atan2(dy, dx) + Math.PI / 2, v.aim * kL); }
    const fwd = [Math.sin(ang), -Math.cos(ang)];
    // tap: an eased dip along the finger (cta.mjs hand press), grab: the hand reaches toward the target
    const press = Math.sin(Math.PI * s.acc("tap", 0.2, 0.95));
    const reach = 16 * v.reach * kL * S / S0;
    const ox = fwd[0] * press * 9 * S / S0 + toward[0] * reach, oy = fwd[1] * press * 9 * S / S0 + toward[1] * reach;
    const wv = v.wave * 0.42 * Math.sin(t * 8.2);
    const drift = (i) => 0.05 * Math.sin(t * 1.3 + i * 1.7) * (1 - v.aim * 0.8);
    const curl = [Math.max(0, v.ci + drift(0)), Math.max(0, v.co + drift(1)), Math.max(0, v.co + drift(2)), Math.min(1, v.co * 1.04 + drift(3) + 0.04)];
    const H = drawHand(c, px + ox, py + oy, { s: S, ang, wave: wv, curl, thumb: v.th, spread: v.sp, press: press * 0.6 });
    // impact ticks around the fingertip at the bottom of the tap
    const rk = s.acc("tap", 0.55, 1);
    if (rk > 0 && rk < 1) {
      const g = fade(c, Math.sin(Math.PI * rk)), [tx, ty] = H.tip, base = Math.atan2(H.dir[1], H.dir[0]);
      for (let i = 0; i < 5; i++) {
        const a = base + ((i - 2) * Math.PI) / 5, r0 = (5 + 8 * rk) * S / S0;
        for (let q = 0; q < 4 * S / S0; q++) g.px(R(tx + Math.cos(a) * (r0 + q)), R(ty + Math.sin(a) * (r0 + q)), i === 2 ? "#FFE38E" : "#FDFEED");
      }
    }
    return { box: H.box, pt: H.tip };
  },
};
