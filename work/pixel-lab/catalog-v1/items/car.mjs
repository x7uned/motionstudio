// catalog-v1 item «car»: a blue side-view sedan (no brand, no text) from the fake-buttons street: the film's carSprite
// sedan (street-sprites.mjs) drawn through items/lib/fakebuttons-car.mjs at 2 grid px per sprite px (the film's ×2 look).
// It stays in its slot: it bobs and its wheels turn while it drives, the wheels slow to a stop and the tail lights glow
// on brake, it shakes side to side on a honk, and its head lights glow. All changes are eased parameters.
import { drawCar } from "./lib/fakebuttons-car.mjs";

const TAU = Math.PI * 2;

export default {
  kind: "car",
  covers: ["car"],
  source: "fake-buttons/film/levels/street-sprites.mjs#carSprite (sedan, PAL.blue, CAR_DIM.sedan) (+ lib/fakebuttons-car.mjs)",
  desc: "blue side-view sedan in its slot; parks, drives with spinning wheels, brakes, honks, turns its lights on",
  hw: 86, hh: 24,
  start: "parked, still, lights off",
  states: {
    parked: [0.5, "parked, still, lights off"],
    drive: [0.6, "wheels spin and the body bobs as if it is driving", "whirr"],
    brake: [0.5, "wheels slow to a stop, brake lights glow", "creak"],
    honk: [0.4, "shakes side to side and honks", "thump"],
    lights: [0.5, "head lights and tail lights glow", "glow"],
  },
  // spin: wheel rate (rad/s, integrated); bob: idle bob; shake: honk shake; tail: brake-light glow; lamp: head-light halo
  base: { spin: 0, bob: 0, shake: 0, tail: 0, lamp: 0 },
  st: {
    parked: { spin: 0, bob: 0, shake: 0, tail: 0, lamp: 0 },
    drive: { spin: 6, bob: 1, shake: 0, tail: 0, lamp: 0 },
    brake: { spin: 0, bob: 0, shake: 0, tail: 1, lamp: 0 },
    honk: { spin: 0, bob: 0, shake: 1, tail: 0, lamp: 0 },
    lights: { spin: 0, bob: 0, shake: 0, tail: 0.5, lamp: 1 },
  },
  demo: { target: false },
  notes: "Film sedan kept (blue palette, outline, rim light, lamps); sedan only, no text or brand. Anchor at the body centre, so the footprint is centred in the slot; the wheels spin as an integrated angle, so a brake slows them without a jump. Spokes are drawn per frame over the static rim. Honk shake is a 9 Hz sine at eased amplitude.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = 2 * z;
    const dx = v.shake * 0.5 * S * Math.sin(TAU * 9 * t), dy = -v.bob * 0.5 * S * (0.5 - 0.5 * Math.cos(TAU * 2.4 * t));
    const X = cx + dx, Y = cy + dy;
    drawCar(c, X, Y, S, { spin: s.integ((q) => q.spin), tail: v.tail, lamp: v.lamp });
    return { box: { x0: X - 43 * S, y0: Y - 11 * S, x1: X + 44 * S, y1: Y + 12 * S }, pt: [X, Y] };
  },
};
