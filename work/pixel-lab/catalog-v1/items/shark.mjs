// catalog-v1 item «shark»: the deadliest film's chibi great white rising from the sea, facing the camera (grey head, white
// belly bib, big glossy eyes, toothy grin, blush, dorsal fin, pectoral fins), ported from work/pixel-lab/deadliest/film/
// levels/ocean-shark.mjs drawFrontShark (copy in lib/deadliest-shark.mjs). Every film option is an eased state parameter.
import { drawFrontShark } from "./lib/deadliest-shark.mjs";
import { blinkAt } from "./lib/cute.mjs";

// The drawing spans x −168…+168 (fins), y −150 (fin tip) … +396 (tail) around the body origin at film size; the origin
// sits CY above the footprint centre so the body centre lands on it. S0 0.6 = the prop size at size m, camera z 1.
const S0 = 0.6, CY = 123;
export default {
  kind: "shark",
  covers: ["shark"],
  source: "deadliest/film/levels/ocean-shark.mjs#drawFrontShark",
  desc: "cute chibi great white shark facing the camera: grey head, white belly, big glossy eyes, toothy grin, fin up",
  hw: 100, hh: 164, start: "rests in the water line, fins still, blinks",
  states: {
    calm: [0.5, "rises from the sea, soft small smile, fins still"],
    grin: [0.5, "shows a toothy grin", "pop"],
    worry: [0.6, "brows knit, mouth wobbles, a sweat drop slides down", "creak"],
    happy: [0.6, "eyes close into happy arcs, cheeks blush", "sparkle"],
    wave: [0.7, "waves its pectoral fin", "whoosh"],
    look: [0.45, "opens its big eyes and turns them to the target prop", "blip"],
  },
  base: { grin: 0.35, worry: 0, happy: 0, shy: 0, sweat: 0, aim: 0, wave: 0 },
  st: {
    calm: { grin: 0.35, worry: 0, happy: 0, shy: 0, sweat: 0, aim: 0, wave: 0 },
    grin: { grin: 1, worry: 0, happy: 0, shy: 0, sweat: 0, aim: 0, wave: 0 },
    worry: { grin: 1, worry: 1, happy: 0, shy: 0, sweat: 0.6, aim: 0, wave: 0 },
    happy: { grin: 1, worry: 0, happy: 1, shy: 1, sweat: 0, aim: 0, wave: 0 },
    wave: { wave: 1, aim: 0 },
    look: { aim: 1, happy: 0, shy: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "the film's shark sits in water (wave tint, underwater wobble, sea rows): dropped, it stands in air; no idle bob (a 1-px whole-body step reads as a stutter with nearest resampling); the fin wave is a time-driven sweep of the pectoral fin (the film only had static fin angles); the eyes aim at the target by s.lookK, the head does not turn; the sprite is resampled nearest-neighbour, so 1-px outlines thin out at the wide shot (downscale 0.6)",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = S0 * z;
    const ax = cx, ay = cy - CY * S, ey = ay - 12 * S;
    let look = [0, 0.05];
    if (s.look && v.aim > 0) { const dx = s.look[0] - ax, dy = s.look[1] - ey, d = Math.hypot(dx, dy) || 1, k = v.aim * s.lookK; look = [(dx / d) * k, 0.05 + ((dy / d) * 0.8 - 0.05) * k]; }
    // pectoral fin sweep: rest 0, the wave state swings it between −26 and −2
    const finR = v.wave * (-14 + 12 * Math.sin(t * 2.6));
    drawFrontShark(c, ax, ay, { s: S, grin: v.grin, worry: v.worry, happy: v.happy, shy: v.shy, sweat: v.sweat, look, blink: blinkAt(t, 3.6, 1.1), finL: 0, finR });
    return { box: { x0: ax - 168 * S, y0: ay - 150 * S, x1: ax + 168 * S, y1: ay + 396 * S }, pt: [ax, ey], face: [ax, ey],
      faceBox: { x0: ax - 70 * S, y0: ay - 30 * S, x1: ax + 70 * S, y1: ay + 52 * S } };
  },
};
