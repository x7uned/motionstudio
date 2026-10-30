// catalog-v1 item «dog»: the dog series' black-and-white border collie (red collar, gold tag) sitting front-on, ported
// from work/pixel-lab/dogs/kit/dog.mjs drawDogFront (copies in lib/dogs-*.mjs). The rig is drawn in world units through a
// ground mapping (G.z px per unit), so it stays crisp at every zoom. Every option is a state parameter eased by the
// engine; the bark and the nose lick are windows of their own keys, so nothing switches in one frame.
import { drawDogFront } from "./lib/dogs-dog.mjs";
import { blinkAt } from "./lib/cute.mjs";

const S0 = 1.75, MID = 50, TAU = Math.PI * 2;      // sits from y −100 (ears) to 0 (paws) around its ground point; ground = centre + MID·S
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export default {
  kind: "dog",
  covers: ["dog"],
  source: "dogs/kit/dog.mjs#drawDogFront",
  desc: "black-and-white border collie sitting front-on, red collar, gold tag; wags, blinks, breathes",
  hw: 74, hh: 88, start: "sits, breathes, tail wags slowly",
  states: {
    sit: [0.5, "sits calmly, slow wag"],
    look: [0.45, "looks at its target prop", "blip"],
    tilt: [0.5, "tilts its head: curious", "wink"],
    pant: [0.5, "happy: pants with its tongue out, eyes squint, fast wag", "rise"],
    bark: [0.6, "barks twice: mouth snaps open and shut, ears up", "pop"],
    sniff: [0.9, "sniffs: the nose twitches, then it licks its nose", "flutter"],
  },
  base: { look: 0, tilt: 0, pant: 0, happy: 0, wag: 0.5, ears: 0.5, sniff: 0, bark: 0 },
  st: {
    sit: { look: 0, tilt: 0, pant: 0, happy: 0, wag: 0.5, ears: 0.5, sniff: 0, bark: 0 },
    look: { look: 1, tilt: 0, pant: 0, happy: 0, sniff: 0, bark: 0 },
    tilt: { tilt: 1, look: 0.6, pant: 0, happy: 0, sniff: 0, bark: 0, ears: 0.7 },
    pant: { pant: 1, happy: 1, wag: 1, tilt: 0, sniff: 0, bark: 0, ears: 0.5 },
    bark: { bark: 1, ears: 0.9, tilt: 0, pant: 0, happy: 0, sniff: 0, wag: 0.8 },
    sniff: { sniff: 1, tilt: 0, pant: 0, happy: 0, bark: 0, ears: 0.6 },
  },
  demo: { target: true },
  notes: "Front sitting only (the side gaits need a moving world). bark = two quick jaw snaps inside its key; the rig's mouth opens moderately, so it reads as a short open mouth rather than a wide yap. sniff ends with one nose lick. pant = tongue out, happy squint, fast wag. Checker: 1 flag at 8.47 s = first level of the engine's exit dissolve (the checker counts the first dithered holes as new colour).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100, gx = cx, gy = cy + MID * S;
    const G = { z: S, X: (wx) => gx + wx * S, Y: (wy) => gy + wy * S };
    let look = [0, 0], side = 1;
    if (s.look) { const dx = s.look[0] - gx, dy = s.look[1] - (gy - 69 * S), d = Math.hypot(dx, dy) || 1; const k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * 0.8 * k]; side = dx >= 0 ? 1 : -1; }
    // bark: two snaps inside the bark key (|sin| humps), only while bark is the current look
    const bk = s.acc("bark"), mouth = v.bark * Math.pow(Math.abs(Math.sin(TAU * bk)), 0.8) * 0.9;
    // sniff key: the nose twitches, then one nose lick over the last 45 % of the key
    const sk = s.acc("sniff"), lick = sk > 0.55 && sk < 1 ? (sk - 0.55) / 0.45 : 0;
    const A = drawDogFront(c, G, 0, 0, t, { tilt: 0.85 * v.tilt * side, ears: v.ears, look, blink: blinkAt(t, 4.6, 0.7) * (1 - v.happy), mouth, pant: v.pant, happy: v.happy,
      wag: v.wag, sniff: v.sniff * (1 - clamp01(lick * 4)), lick, brows: 0.6 * v.bark });
    const top = gy - 100 * S;
    return { box: { x0: gx - 42 * S, y0: top, x1: gx + 42 * S, y1: gy + 2 * S }, pt: A?.head ?? [gx, gy - 69 * S], face: A?.nose ?? [gx, gy - 62 * S],
      faceBox: { x0: gx - 30 * S, y0: top, x1: gx + 30 * S, y1: gy - 44 * S } };
  },
};
