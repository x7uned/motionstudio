// catalog-v1 item «pigeon»: the animals-wingbeat city's plump rock pigeon facing the camera (city-pigeon.mjs#drawPigeon, copy in
// lib/wingbeat-pigeon.mjs as drawPigeonK at k screen px per film unit: the body sprite and the wings are the film's own, the
// wings beat at 3 strokes/s (≤ 6 Hz, no 30 fps strobe) from the clock). States use the film's options: the wing amplitude
// amt (folded-ish rest → hard beat), the lean tilt, the eyes' look, and the neck sheen that slides on its own.
import { drawPigeonK } from "./lib/wingbeat-pigeon.mjs";
import { blinkAt } from "./lib/cute.mjs";

const K0 = 0.7, BEAT = 3;   // screen px per film unit at z 1; wing strokes per second
export default {
  kind: "pigeon",
  covers: ["pigeon"],
  source: "animals-wingbeat/film/levels/city-pigeon.mjs#drawPigeon",
  desc: "plump grey city pigeon facing the camera: iridescent green neck, orange eyes, wing bars, pink feet",
  hw: 115, hh: 84, start: "stands with wings held low, the neck sheen slides",
  states: {
    rest: [0.6, "stands with wings held low, neck sheen slides"],
    look: [0.45, "turns its orange eyes to the target prop", "blip"],
    lean: [0.6, "leans forward, ready to go", "swish"],
    flap: [0.7, "beats its wings hard, lifting off", "flutter"],
  },
  base: { amt: 0.15, tilt: 0, look: 0 },
  st: {
    rest: { amt: 0.15, tilt: 0, look: 0 },
    look: { amt: 0.15, tilt: 0, look: 1 },
    lean: { amt: 0.4, tilt: 0.12, look: 0 },
    flap: { amt: 1, tilt: 0, look: 0 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: true },
  notes: "drawPigeonK (lib/wingbeat-pigeon.mjs) draws the film body sprite (cached per 1 % scale step, painted through the block view) and the wings, eyes and sheen through the same view. The film beats 6 strokes/s (flicker at 30 fps); here 3/s with the film motion-arc smear kept. rest keeps amt 0.15: the wings stay spread low, as in the film standing pose (not folded). Measured footprint 115x84 at z 1 is the wing span at full beat. The presence is passed as the alpha option on the raw canvas, because the body sprite blit ignores a dissolve view.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, k = K0 * z, ph = BEAT * t;
    let look = [0, 0];
    if (s.look && v.look > 0) { const dx = s.look[0] - cx, dy = s.look[1] - cy, d = Math.hypot(dx, dy) || 1, kk = v.look * s.lookK; look = [(dx / d) * kk, (dy / d) * 0.8 * kk]; }
    // the body sprite ignores a dissolve view: the presence s.a goes in as the alpha option on the raw canvas (same Bayer)
    drawPigeonK(s.raw ?? c, cx, cy, k, { a: s.a ?? 1, ph, prevPh: ph - BEAT / 30, amt: v.amt, tilt: v.tilt, sheen: 0.5 + 0.5 * Math.sin(0.6 * t), look, blink: blinkAt(t, 3.7, 0.9) });
    return { box: { x0: cx - 80 * k, y0: cy - 60 * k, x1: cx + 80 * k, y1: cy + 70 * k }, pt: [cx, cy - 6 * k], face: [cx, cy - 6 * k],
      faceBox: { x0: cx - 34 * k, y0: cy - 24 * k, x1: cx + 34 * k, y1: cy + 10 * k } };
  },
};
