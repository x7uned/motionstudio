// init asset «car»: a chunky cute red hatch-sedan, side view, facing the centre. New art (the v1 sedan is a very flat 86×24
// strip; this one is taller and rounder so it works as a hero asset). No brand, no text, no driver.
import { fade } from "../../../../../renderer/pixel/raster.mjs";
import { frame, wheel, glow, puff, groundShadow, facing, round, RP, R, clamp01, sm, wob } from "../lib/transport-kit.mjs";

const TAU = Math.PI * 2;
const CABIN = round([[-60, -10], [-47, -36], [-35, -43], [24, -43], [36, -36], [58, -10]], 2);
const WIN_R = round([[-52, -14], [-43, -33], [-35, -37], [-12, -37], [-12, -14]], 1);
const WIN_F = round([[-5, -14], [-5, -37], [19, -37], [27, -33], [45, -14]], 1);
const glass = (u, v) => 0.5 - (v + 40) * 0.006 + (((u + v * 0.9 + 90) % 26) < 5 ? 0.42 : 0);

export default {
  kind: "car",
  covers: ["car", "automobile", "vehicle"],
  source: "init (new)",
  desc: "chunky red hatch car, side view, nobody inside; parks, drives with spinning wheels, brakes, honks, lights glow",
  hw: 92, hh: 36,
  start: "parked, still, lights off",
  states: {
    parked: [0.5, "parked, still, lights off"],
    drive: [0.7, "wheels spin, body bobs, exhaust puffs behind", "whirr"],
    brake: [0.5, "wheels slow to a stop, nose dips, red brake lights glow", "creak"],
    honk: [0.4, "body shakes and sound arcs ring out of the front", "thump"],
    lights: [0.5, "head and tail lights glow warmly", "glow"],
  },
  // spin: wheel rate (rad/s, integrated) · bob: drive bounce · sink: nose dip · tail/lamp: light glow · exh: exhaust puffs
  base: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0 },
  st: {
    parked: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0 },
    drive: { spin: 9, bob: 1, sink: 0, tail: 0, lamp: 0, exh: 1 },
    brake: { spin: 0, bob: 0, sink: 1, tail: 1, lamp: 0, exh: 0 },
    honk: { spin: 0, bob: 0, sink: 0, tail: 0, lamp: 0, exh: 0 },
    lights: { spin: 0, bob: 0, sink: 0, tail: 0.6, lamp: 1, exh: 0 },
  },
  linear: [],
  demo: { target: false },
  notes: "Wheels turn by an integrated angle so a brake slows them without a jump; body bob and honk shake are continuous sines at eased amplitude; honk arcs follow the one-off accent of the honk key.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = z, dir = facing(s);
    const bob = v.bob * 1.6 * (0.5 - 0.5 * Math.cos(TAU * 2.6 * t)) + v.sink * 1.4;
    const hon = Math.sin(Math.PI * s.acc("honk")), shake = hon * 1.2 * Math.sin(TAU * 11 * t);
    const gy = cy + 6 * k;                                   // ground frame (wheels stay put)
    const B = frame(c, cx + R(shake * k), gy - R(bob * k), k, dir, 0), G = frame(c, cx, gy, k, dir, 0);
    groundShadow(c, cx, gy + 19 * k, 86 * k, 5.5 * k, 0.42);
    // exhaust puffs behind the tail
    if (v.exh > 0.02) for (let i = 0; i < 4; i++) {
      const ph = (t * 0.9 + i / 4) % 1, [px, py] = G.P(-98 - ph * 34, 14 - ph * 14);
      puff(c, px, py, (3 + ph * 6) * k, Math.sin(Math.PI * ph) * v.exh * 0.8);
    }
    const wp = [G.P(-55, 10), G.P(55, 10)], spin = s.integ((q) => q.spin) * dir;
    // cabin, windows, lower body
    B.pg(CABIN, { ramp: RP.red, lo: 0.34, hi: 0.9 });
    B.pg(WIN_R, { ramp: RP.glass, v: glass });
    B.pg(WIN_F, { ramp: RP.glass, v: glass });
    B.rr(-91, -15, 182, 34, 13, { ramp: RP.red, lo: 0.3, hi: 0.92 });
    B.rr(-90, 10, 180, 9, 4, { ramp: RP.ink, lo: 0.5, hi: 0.8, rim: 0.4 });
    // door seams + handle
    const d0 = B.P(-12, -13), d1 = B.P(-12, 8), d2 = B.P(26, -13), d3 = B.P(26, 8);
    c.line(R(d0[0]), R(d0[1]), R(d1[0]), R(d1[1]), RP.red[1]); c.line(R(d2[0]), R(d2[1]), R(d3[0]), R(d3[1]), RP.red[1]);
    B.rr(-4, -6, 11, 3, 1, { ramp: RP.red, lo: 0.8, hi: 1, rim: 0 });
    // wheel arches (dark) and wheels
    for (const u of [-55, 55]) B.shape([u - 20, -12, u + 20, 20], (a, b) => (a - u) ** 2 + (b - 10) ** 2 <= 20 * 20 && b <= 19, { ramp: RP.ink, lo: 0.3, hi: 0.5, rim: 0 });
    for (const [x, y] of wp) wheel(c, x, y, 16 * k, spin, { spokes: 5 });
    // head and tail lights
    const lamp = clamp01(v.lamp), tail = clamp01(v.tail);
    B.rr(82, -9, 9, 10, 3, { ramp: RP.yellow, lo: 0.4 + 0.45 * lamp, hi: 0.6 + 0.4 * lamp, rim: 0.5 });
    B.rr(-92, -9, 7, 10, 3, { ramp: RP.red, lo: 0.3 + 0.4 * tail, hi: 0.5 + 0.45 * tail, rim: 0.5 });
    B.rr(80, 8, 11, 7, 2, { ramp: RP.steel, lo: 0.4, hi: 0.8, rim: 0.4 });
    const hl = B.P(88, -4), tl = B.P(-90, -4);
    glow(c, hl[0] + dir * 14 * k, hl[1], 26 * k, "#FFE9A0", 0.7 * lamp);
    glow(c, tl[0] - dir * 3 * k, tl[1], 15 * k, "#FF4A4A", 0.75 * tail);
    // honk arcs
    if (hon > 0.02) for (let i = 0; i < 3; i++) {
      const [ax, ay] = B.P(92 + i * 7, -26 - i * 1);
      const g = fade(c, clamp01(hon * 1.6 - i * 0.35));
      for (let a = -0.9; a <= 0.9; a += 0.12) { const X = ax + dir * Math.cos(a) * (6 + i * 7) * k * 0.5 - dir * 3 * k, Y = ay + Math.sin(a) * (7 + i * 6) * k; g.px(Math.round(X), Math.round(Y), i === 0 ? "#FFFFFF" : "#E8E4FF"); }
    }
    return { box: { x0: cx - 92 * k, y0: cy - 36 * k, x1: cx + 92 * k, y1: cy + 32 * k }, pt: [cx, cy - 6 * k] };
  },
};
