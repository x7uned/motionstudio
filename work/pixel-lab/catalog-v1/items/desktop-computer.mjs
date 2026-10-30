// catalog-v1 item «desktop-computer»: the ping film's desk set cut down to a prop — angled monitor showing an abstract glowing
// desktop (no game, no text) next to a PC tower with RGB fans, on a short slab; no chair, no person. Copy in lib/ping-computer.mjs.
import { drawComputer } from "./lib/ping-computer.mjs";
import { mix, bayer } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const S = 1.8;
// busy screen: rows of abstract bars scrolling
function busyScr(ph) {
  return (u, v) => {
    if (v > 0.9) return "#141A24";
    const f = v * 14 + ph * 3, row = Math.floor(f), w = 0.25 + 0.6 * (Math.sin(row * 12.9) * 0.5 + 0.5);
    if (f % 1 < 0.25) return "#1A2C54";
    return u < w ? mix("#3E6AB0", "#8CB0EC", (row % 3 + 3) % 3 / 2) : "#223C70";
  };
}
export default {
  kind: "desktop-computer",
  covers: ["desktop-computer"],
  source: "ping/film/people.mjs#drawDesk (monitor + PC tower)",
  desc: "desktop PC: monitor and RGB tower; screen lights, works busy, RGB glows, freezes and lags",
  hw: 74, hh: 46,
  start: "screen on, RGB fans cycle slowly",
  states: {
    on: [0.5, "screen lit, fans glow, idle"],
    off: [0.7, "screen goes dark, RGB fades out", "dim"],
    busy: [0.5, "screen scrolls fast, activity LED flickers", "tick"],
    glow: [0.6, "RGB fans glow bright and cycle fast", "glow"],
    lag: [0.7, "screen freezes, then dims", "dim"],
  },
  base: { on: 1, rgb: 1, bright: 1, busy: 0, run: 1, rate: 1 },
  st: {
    on: { on: 1, rgb: 1, bright: 1, busy: 0, run: 1, rate: 1 },
    off: { on: 0, rgb: 0, bright: 1, busy: 0, run: 0, rate: 0.3 },
    busy: { on: 1, rgb: 1, bright: 1, busy: 1, run: 1, rate: 2 },
    glow: { on: 1, rgb: 1, bright: 1.25, busy: 0, run: 1, rate: 5 },
    lag: { on: 0.55, rgb: 1, bright: 0.6, busy: 0, run: 0, rate: 1 },
  },
  demo: {},
  notes: "Screen on/off and lag dim use the film's dither fade (on as a Bayer threshold, eased by the engine). Lag freezes the screen clock (run eased to 0) then dims. Busy = scrolling abstract bars dither-crossfaded with the desktop (busy as Bayer threshold). Tower LED is a 1-2 px dot. Monitor angled like the film.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, sc = S * z, ph = s.integ((q) => q.run * (1 + 2 * q.busy)), rp = s.integ((q) => q.rate);
    const bz = clamp01(v.busy), led = bz * (0.5 + 0.5 * Math.sin(t * 17)) * 0.8 + 0.2 * v.on;
    const bars = busyScr(ph * 1.6);
    const A = drawComputer(c, cx - 92 * sc, cy + 70.4 * sc, sc, {
      t: rp * 0.4 + 0.3, scrT: ph * 0.6, on: v.on, rgb: v.rgb, bright: v.bright, led,
      scr: bz > 0.001 ? (u, w, X, Y, def) => (bz > bayer(X, Y) ? bars(u, w) : def) : null,
    });
    return { box: { x0: A.left, y0: A.top, x1: A.right, y1: A.bottom }, pt: [cx, cy] };
  },
};
