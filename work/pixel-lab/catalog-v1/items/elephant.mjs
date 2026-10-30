// catalog-v1 item «elephant»: the cute-series African elephant standing face-on (same series as the black cat), ported
// from work/pixel-lab/animals-heart/film/levels/elephant-art.mjs drawElephant (copy in lib/animalsheart-elephant.mjs).
// The film keyed the trunk, ears and mouth by its own timeline; here each is a state parameter eased by the engine:
// the trunk blends hang → raised, the ears flap live (no cached steps), the open mouth dissolves in, accents (trumpet
// sound arcs, happy hop) ride on s.acc, so nothing switches in one frame.
import { drawElephant, GRAY } from "./lib/animalsheart-elephant.mjs";
import { blinkAt, shadow, fade } from "./lib/cute.mjs";

const R = Math.round;
// The drawing spans x ±164·S (ears), y −74·S…+270·S around the head centre; the footprint centre sits 98·S below it.
const S0 = 0.56, MID = 98, FEET = 268;
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
export default {
  kind: "elephant",
  covers: ["elephant"],
  source: "animals-heart/film/levels/elephant-art.mjs#drawElephant",
  desc: "chubby grey elephant standing face-on: big ears, amber eyes, tusks, long trunk; sways its trunk, blinks",
  hw: 92, hh: 96, start: "stands, ears and trunk sway, blinks",
  states: {
    stand: [0.5, "stands calmly"],
    look: [0.45, "looks at its target prop, head tilts toward it", "blip"],
    trumpet: [0.6, "raises its trunk, opens its mouth, ears spread: trumpets", "rise"],
    flap: [0.5, "fans its big ears back and forth", "flutter"],
    happy: [0.45, "smiles with an open mouth and hops a little", "ding"],
    sleepy: [0.8, "eyes close, head and ears droop, trunk hangs still: dozes off", "dim"],
  },
  base: { look: 0, up: 0, mouth: 0, fan: 0, spread: 0, smile: 0, shut: 0, dip: 0, sway: 1 },
  st: {
    stand: { look: 0, up: 0, mouth: 0, fan: 0, spread: 0, smile: 0, shut: 0, dip: 0, sway: 1 },
    look: { look: 1, shut: 0, dip: 0, up: 0, mouth: 0 },
    trumpet: { up: 1, mouth: 0.8, spread: 0.2, fan: 0, smile: 0, shut: 0, dip: -6, sway: 0.25 },
    flap: { fan: 1, up: 0, mouth: 0, spread: 0, shut: 0, dip: 0, sway: 1 },
    happy: { smile: 1, mouth: 0, up: 0, fan: 0.25, spread: 0.06, shut: 0, dip: 0, sway: 1 },
    sleepy: { shut: 1, dip: 8, spread: -0.08, sway: 0.15, look: 0, up: 0, mouth: 0, smile: 0, fan: 0 },
  },
  demo: { target: true },
  notes: "front view only; warm sunset rim outline kept from the film; happy smile is subtle (trunk covers the mouth); mid-trumpet the trunk crosses the right eye briefly; film reach/feed trunk poses not exposed",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, S = Math.round(S0 * z * 100) / 100;           // body / head sprites are cached per scale: 1 % steps
    const hop = 7 * Math.sin(Math.PI * s.acc("happy")) * S / S0;
    const bob = Math.sin(t * 2.4) * 1.5 * (1 - 0.6 * v.shut);
    const hx = cx, hy = cy - MID * S + bob - hop, gx = cx, gy = cy - MID * S + FEET * S;
    // look: pupils toward the target and a small head tilt, both blended by the target's presence
    let look = [0, 0.1], rot = 0;
    if (s.look && v.look > 0) {
      const dx = s.look[0] - hx, dy = s.look[1] - hy, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK;
      look = [(dx / d) * 0.9 * k, 0.1 * (1 - k) + (dy / d) * 0.7 * k];
      rot = lerpAng(0, 0.08 * Math.max(-1, Math.min(1, dx / 120)), k);
    }
    rot += 0.02 * Math.sin(t * 0.9) * v.sway;
    const idle = (Math.sin(t * 2.2) * 0.07 + Math.sin(t * 0.7) * 0.03) * (1 - 0.7 * v.shut);
    const flap = idle * (1 - 0.6 * v.fan) + v.spread + v.fan * (0.06 + 0.2 * Math.sin(t * 6.5));
    const blink = Math.max(v.shut, blinkAt(t, 3.9, 0.6) * (1 - v.shut));
    shadow(c, gx, gy + 2 * S, 150 * S, 12 * S, "#000000", 0.4 * (1 - 0.3 * hop / 7));
    const E = drawElephant(c, hx, hy, t, { s: S, rot, dip: v.dip * S / S0, flap, blink, look, trunk: { raise: v.up }, sway: v.sway,
      happy: v.smile * 0.6, smile: v.smile, mouth: v.mouth, mouthX: 0, rim: "#F0A070", lid: GRAY[5] });
    // trumpet: three sound arcs burst from the raised trunk tip
    const tk = s.acc("trumpet", 0.35, 1);
    if (tk > 0 && tk < 1) {
      const [x, y] = E.tip, [px, py] = E.tp[E.tp.length - 3], ang = Math.atan2(y - py, x - px), g = fade(c, Math.sin(Math.PI * tk));
      for (let i = 0; i < 3; i++) { const r = (6 + i * 6 + 10 * tk) * S / S0; for (let a = -0.55; a <= 0.55; a += 0.5 / r) g.px(R(x + Math.cos(ang + a) * r), R(y + Math.sin(ang + a) * r), i === 1 ? "#FFE38E" : "#FDFEED"); }
    }
    const ew = 164 * S * (1 + Math.max(0, flap) * 0.25);
    return { box: { x0: hx - ew, y0: hy - 78 * S, x1: hx + ew, y1: gy + 4 * S }, pt: [hx, hy], face: [hx, hy + 10 * S],
      faceBox: { x0: hx - 80 * S, y0: hy - 72 * S, x1: hx + 80 * S, y1: hy + 70 * S } };
  },
};
