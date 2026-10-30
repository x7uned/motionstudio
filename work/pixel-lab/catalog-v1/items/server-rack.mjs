// catalog-v1 item «server-rack»: one tall server rack cut out of the ping film's server hall — dark cabinet with 14 slots, three
// LEDs each blinking smoothly, a plinth with a cable. Copy in lib/ping-server-rack.mjs. No logos, no text.
import { drawRack } from "./lib/ping-server-rack.mjs";

const S = 1.4;
export default {
  kind: "server-rack",
  covers: ["server-rack"],
  source: "ping/film/world.mjs#drawServerHall (rack loop)",
  desc: "tall server rack with rows of blinking green, blue and yellow LEDs",
  hw: 25, hh: 87,
  start: "LEDs blink slowly",
  states: {
    idle: [0.5, "LEDs blink calmly"],
    busy: [0.5, "many LEDs flicker fast", "tick"],
    alert: [0.5, "LEDs and bars pulse red", "boo"],
    off: [0.7, "power drops, LEDs fade out", "dim"],
  },
  base: { rate: 1, busy: 0, alert: 0, power: 1 },
  st: {
    idle: { rate: 1, busy: 0, alert: 0, power: 1 },
    busy: { rate: 3.2, busy: 1, alert: 0, power: 1 },
    alert: { rate: 1.6, busy: 0.4, alert: 1, power: 1 },
    off: { rate: 0.2, busy: 0, alert: 0, power: 0 },
  },
  demo: {},
  notes: "The film's hard LED on/off (sin > 0.1) became a smooth colour fade per LED, so nothing flips in one frame. Alert pulse (red LEDs + red bars) uses a slow sine, ramped by the alert parameter. Added a small plinth and cable so the single rack stands alone.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, sc = S * z, ph = s.integ((q) => q.rate * 5), pa = s.integ((q) => 2.2 * q.alert + 0.001);
    const A = drawRack(c, cx - 14 * sc, cy - 62 * sc, sc, { phase: ph, busy: v.busy, alert: v.alert * (0.5 + 0.5 * Math.sin(pa * 2)), power: v.power });
    return { box: A, pt: [cx, cy - 10 * sc] };
  },
};
