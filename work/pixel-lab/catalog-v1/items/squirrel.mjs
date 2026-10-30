// catalog-v1 item «squirrel»: the small cute squirrel of the dog-series park (dogs/kit/park-squirrel.mjs#drawSquirrel),
// sitting upright on its haunches, holding an acorn, with a big bushy S-curled tail that flicks. Copied with its state
// rig into items/lib/dogs-squirrel.mjs (imports and an eye-aim hook only). Changes: the film draws it in film units
// with G.z pixels per unit; here the body centre sits at the footprint centre and K px per unit at z 1. The rig's
// chew bouts, ear/alert pose and acorn hold are the eased parameters nibble, alert and nut; the tail flick and blink
// stay the rig's own time-driven motion. Its eyes aim at s.look, blended by s.lookK; it faces the centre of the frame.
import { drawSquirrel } from "./lib/dogs-squirrel.mjs";

const K = 3.4;        // screen px per squirrel unit at z 1 (the film's G.z)
const SEAT = 18.5;    // the body centre sits 18.5 units above the ground point (the footprint centre is the body)
const BODY_U = -6;    // the body's centre in film units along x (tail behind, snout ahead)
const clamp01 = (v) => Math.max(0, Math.min(1, v));

export default {
  kind: "squirrel",
  covers: ["squirrel"],
  source: "dogs/kit/park-squirrel.mjs#drawSquirrel (state rig: chew bouts, alert, acorn hold)",
  desc: "cute small squirrel sitting upright, holding an acorn, bushy tail; nibbles, freezes alert, eyes its target",
  hw: 66, hh: 74,
  start: "sits upright, breathes, tail sways and flicks now and then",
  states: {
    sit: [0.5, "sits upright holding an acorn, tail sways"],
    nibble: [0.6, "nibbles the acorn in quick bouts, head bobbing"],
    alert: [0.5, "ears up, freezes, looks at its target", "blip"],
    drop: [0.6, "lets the acorn go and sits with empty paws"],
  },
  base: { nibble: 0, alert: 0, nut: 1 },
  st: {
    sit: { nibble: 0, alert: 0, nut: 1 },
    nibble: { nibble: 1, alert: 0, nut: 1 },
    alert: { nibble: 0, alert: 1, nut: 1 },
    drop: { nibble: 0, alert: 0, nut: 0 },
  },
  linear: [],
  demo: { target: true },
  notes: "Film rig kept (tail, body, head, ear, eye, blush, acorn and paws); only the eye aim is added (o.aimX/aimY, from s.look blended by s.lookK). The acorn drops by dissolving in place (the film has no falling nut). Facing is fixed by the slot (toward the frame centre), so it never flips mid-film. Checker clean: jumps 0, pops 0, pure true, footprint 66×74 measured = declared.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, Z = z * K, f = (s.x ?? 270) > 270 ? -1 : 1;
    const X0 = cx - BODY_U * f * Z, Y0 = cy + SEAT * Z;   // ground point: the body centre lands on cx
    const G = { z: Z, X: () => X0, Y: () => Y0 };
    // eye aim: the eye sits about (5.5, −21.7) units from the ground point; the rig's rest look is (0.5 f, −0.1)
    const ex = X0 + 5.5 * f * Z, ey = Y0 - 21.7 * Z, k = s.look ? clamp01(s.lookK ?? 0) : 0;
    let aimX = 0, aimY = 0;
    if (k > 0) { const dx = s.look[0] - ex, dy = s.look[1] - ey, d = Math.hypot(dx, dy) || 1; aimX = k * (dx / d - 0.5 * f); aimY = k * (dy / d + 0.1); }
    drawSquirrel(c, G, 0, 0, t, { facing: f, nibble: v.nibble, alert: v.alert, nut: v.nut, aimX, aimY });
    const hx = X0 + 3.4 * f * Z, hy = Y0 - 21.2 * Z;
    return { box: { x0: cx - 20 * Z, y0: cy - 19.5 * Z, x1: cx + 20 * Z, y1: cy + 19.5 * Z }, pt: [hx, hy] };
  },
};
