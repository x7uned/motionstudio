// catalog-v1 item «falcon»: the animals-speed city's falcon (city-falcon.mjs#drawFalcon, copy in lib/speed-falcon.mjs). Its three
// film poses are perch (the bird on a ledge), fly (wings beating, legs tucked) and streak (a teardrop diving at a heading).
// The item keeps all three and crossfades them through the dissolve (a fade of each pose's alpha, never a one-frame swap).
// The film's own scale option is used directly (drawFalcon keys its sprites on the scale).
import { drawFalcon } from "./lib/speed-falcon.mjs";
import { blinkAt } from "./lib/cute.mjs";

const K0 = 0.5, FLAP = 2.6;   // screen scale at z 1; wing beats per second (≤ 6 Hz)
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
export default {
  kind: "falcon",
  covers: ["falcon"],
  source: "animals-speed/film/levels/city-falcon.mjs#drawFalcon",
  desc: "grey-blue falcon with a cream face, dark moustache stripes and a yellow beak, sharp eyes",
  hw: 110, hh: 76, start: "perches on a ledge, head turns, blinks",
  states: {
    perch: [0.6, "perched on a ledge, head turns, blinks"],
    look: [0.45, "turns its sharp yellow eye to the target prop", "blip"],
    lift: [0.8, "spreads its wings and takes off, beating them", "flutter"],
    dive: [0.9, "tucks in and dives straight at the target, fierce", "whoosh"],
  },
  base: { perch: 1, fly: 0, streak: 0, look: 0, fierce: 0 },
  st: {
    perch: { perch: 1, fly: 0, streak: 0, look: 0, fierce: 0 },
    look: { perch: 1, fly: 0, streak: 0, look: 1, fierce: 0 },
    lift: { perch: 0, fly: 1, streak: 0, look: 0, fierce: 0 },
    dive: { perch: 0, fly: 0, streak: 1, look: 1, fierce: 1 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "the three film poses (perch, fly, streak) crossfade by their alpha (the dissolve); the presence is passed on the raw canvas, because sprite blits ignore a dissolve view. Scale 0.5 at z 1: measured 110x76, the widest pose being fly with spread wings; the perched body is about 70 px wide. The wing beat is the clock at 2.6 strokes/s (the film quantises it to 12 steps). The streak heading is the target direction, blended by lookK, straight down when no target; the teardrop is the film length, 2 x about 120 px at z 1.",
  draw(c0, cx, cy, z, t, s) {
    // sprites blit straight to the canvas (they ignore a dissolve view), so the presence s.a and each pose's weight go in as
    // the film's own alpha option on the raw canvas: the same Bayer dissolve, applied inside the blit
    const c = s.raw ?? c0, pa = s.a ?? 1;
    const v = s.v, S = K0 * z, y = cy - 81 * S;   // head anchor: the falcon's body centre sits at cy
    let look = [0, 0];
    if (s.look && v.look > 0) { const dx = s.look[0] - cx, dy = s.look[1] - cy, d = Math.hypot(dx, dy) || 1, kk = v.look * s.lookK; look = [(dx / d) * kk, (dy / d) * 0.8 * kk]; }
    const blink = blinkAt(t, 3.9, 0.7), fierce = v.fierce;
    if (v.perch > 0.001) drawFalcon(c, cx, y, { s: S, mode: "perch", a: v.perch * pa, look, blink, fierce });
    if (v.fly > 0.001) drawFalcon(c, cx, y, { s: S, mode: "fly", a: v.fly * pa, look, blink, fierce, wing: 0.5 + 0.5 * Math.sin(2 * Math.PI * FLAP * t), legs: 0 });
    if (v.streak > 0.001) {
      const rest = Math.PI / 2, aim = s.look ? Math.atan2(s.look[1] - cy, s.look[0] - cx) : rest;
      const dir = rest + wrap(aim - rest) * (s.look ? s.lookK : 0);
      drawFalcon(c, cx, y, { s: S, mode: "streak", a: v.streak * pa, dir, look, blink, fierce });
    }
    return { box: { x0: cx - 56 * S, y0: cy - 110 * S, x1: cx + 56 * S, y1: cy + 110 * S }, pt: [cx, y], face: [cx, y],
      faceBox: { x0: cx - 30 * S, y0: y - 30 * S, x1: cx + 30 * S, y1: y + 10 * S } };
  },
};
