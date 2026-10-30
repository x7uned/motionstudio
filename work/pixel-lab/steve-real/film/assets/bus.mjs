// init asset «bus»: a chunky yellow city bus, side view, facing the centre; a row of blue windows, a folding front door.
// New art, same scale feel as the car. No numbers, no text, no passengers, no brand.
import { fade } from "../../../../../renderer/pixel/raster.mjs";
import { frame, wheel, glow, puff, groundShadow, facing, RP, R, clamp01, lerp } from "../lib/transport-kit.mjs";

const TAU = Math.PI * 2;
const glass = (u, v) => 0.52 - (v + 30) * 0.007 + (((u + v * 0.9 + 140) % 30) < 5 ? 0.4 : 0);

export default {
  kind: "bus",
  covers: ["bus", "city bus", "coach"],
  source: "init (new)",
  desc: "chunky yellow city bus, side view, empty windows; parks, drives, brakes, opens its front door, lights glow",
  hw: 102, hh: 38,
  start: "parked, still, door shut",
  states: {
    parked: [0.5, "parked, still, door shut"],
    drive: [0.7, "wheels spin, body bobs, exhaust puffs behind", "whirr"],
    brake: [0.5, "wheels slow to a stop, nose dips, red brake lights glow", "creak"],
    door: [0.6, "the front door folds open", "creak"],
    lights: [0.5, "head and tail lights glow", "glow"],
  },
  base: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0, door: 0 },
  st: {
    parked: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0, door: 0 },
    drive: { spin: 8, bob: 1, sink: 0, tail: 0, lamp: 0, exh: 1, door: 0 },
    brake: { spin: 0, bob: 0, sink: 1, tail: 1, lamp: 0, exh: 0, door: 0 },
    door: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0, door: 1 },
    lights: { spin: 0, bob: 0, sink: 0, tail: 0.6, lamp: 1, exh: 0, door: 0 },
  },
  linear: [],
  demo: { target: false },
  notes: "Door: the glass panel narrows to a folded sliver over a dark opening (continuous). Wheels use an integrated spin angle. Body bob/sink move the body only; the wheels stay on the ground.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z, dir = facing(s);
    const bob = v.bob * 1.5 * (0.5 - 0.5 * Math.cos(TAU * 2.2 * t)) + v.sink * 1.6;
    const gy = cy + 3 * k, B = frame(c, cx, gy - R(bob * k), k, dir, 0), G = frame(c, cx, gy, k, dir, 0);
    groundShadow(c, cx, gy + 30 * k, 98 * k, 5.5 * k, 0.42);
    if (v.exh > 0.02) for (let i = 0; i < 4; i++) {
      const ph = (t * 0.8 + i / 4) % 1, [px, py] = G.P(-108 - ph * 34, 14 - ph * 14);
      puff(c, px, py, (3 + ph * 6) * k, Math.sin(Math.PI * ph) * v.exh * 0.8);
    }
    const spin = s.integ((q) => q.spin) * dir;
    // body, roof band, lower rail
    B.rr(-102, -37, 204, 56, 11, { ramp: RP.yellow, lo: 0.3, hi: 0.9 });
    B.rr(-98, -37, 196, 6, 3, { ramp: RP.yellow, lo: 0.7, hi: 1, rim: 0 });
    B.rr(-101, 4, 202, 5, 1, { ramp: RP.ink, lo: 0.45, hi: 0.7, rim: 0.3 });
    B.rr(-101, 10, 202, 9, 4, { ramp: RP.orange, lo: 0.2, hi: 0.5, rim: 0.4 });
    // windows
    for (let i = 0; i < 5; i++) B.rr(-91 + i * 31, -28, 26, 22, 3, { ramp: RP.glass, v: glass });
    // front door: dark opening, glass panel folds toward the hinge
    const d = clamp01(v.door), pw = lerp(25, 5, d);
    B.rr(67, -29, 29, 45, 3, { ramp: RP.ink, lo: 0.35, hi: 0.55, rim: 0 });
    B.rr(94 - pw, -28, pw, 43, 2, { ramp: RP.glass, v: glass });
    B.rr(70, 12, 24, 4, 1, { ramp: RP.steel, lo: 0.4, hi: 0.75, rim: 0.4 });
    // roof vent and mirror
    B.rr(-28, -41, 34, 5, 2, { ramp: RP.steel, lo: 0.5, hi: 0.9, rim: 0.4 });
    B.ln([97, -26], [101, -26], 2, RP.steel[4]);
    // arches and wheels
    for (const u of [-62, 62]) B.shape([u - 20, -8, u + 20, 20], (a, b) => (a - u) ** 2 + (b - 14) ** 2 <= 20 * 20 && b <= 19, { ramp: RP.ink, lo: 0.3, hi: 0.5, rim: 0 });
    for (const u of [-62, 62]) { const [x, y] = G.P(u, 14); wheel(c, x, y, 15.5 * k, spin, { spokes: 6 }); }
    // lights
    const lamp = clamp01(v.lamp), tail = clamp01(v.tail);
    B.rr(95, -8, 7, 9, 3, { ramp: RP.yellow, lo: 0.4 + 0.45 * lamp, hi: 0.6 + 0.4 * lamp, rim: 0.5 });
    B.rr(-103, -8, 6, 9, 3, { ramp: RP.red, lo: 0.3 + 0.4 * tail, hi: 0.5 + 0.45 * tail, rim: 0.5 });
    B.rr(94, 8, 9, 8, 2, { ramp: RP.ink, lo: 0.5, hi: 0.8, rim: 0.4 });
    const hl = B.P(100, -4), tl = B.P(-102, -4);
    glow(c, hl[0] + dir * 14 * k, hl[1], 28 * k, "#FFE9A0", 0.7 * lamp);
    glow(c, tl[0] - dir * 3 * k, tl[1], 16 * k, "#FF4A4A", 0.75 * tail);
    return { box: { x0: cx - 102 * k, y0: cy - 36 * k, x1: cx + 102 * k, y1: cy + 32 * k }, pt: [cx, cy - 4 * k] };
  },
};
