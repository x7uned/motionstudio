// catalog-v1 (2026-10-26) adapter for the cute front-facing animal family (animals-heart / animals-weight / wingbeat /
// deadliest film animals drawn with lib/cute.mjs). It turns a film draw function `draw(c, gx, gy, o)` (anchor = ground
// point under the feet, o = { s, t, look, blink, … }) into a catalog prop item with the standard states
//   sit · look · wide · happy · sleepy  (+ up to one extra state, max 6)
// and the standard eased parameters look wide happy open shut squash worry (+ the animal's own extras).
// The adapter does what items/cat.mjs and items/elephant.mjs do by hand: 1 % scale steps (sprite caches), look aimed
// at the target and blended by s.lookK, blink that closes into «sleepy», contact shadow, happy hop on s.acc, box/face.
// Per animal you write only `opts(v, k)`: how the standard parameters map to that drawing's own options.
import { blinkAt, shadow } from "./cute.mjs";

export const STD_STATES = {
  sit: [0.5, "sits calmly"],
  look: [0.45, "looks at its target prop", "blip"],
  wide: [0.4, "eyes wide, mouth a little open: surprised", "rise"],
  happy: [0.45, "happy closed eyes, open smile, a little hop", "ding"],
  sleepy: [0.8, "eyes close, head sinks: dozes off", "dim"],
};
export const STD_BASE = { look: 0, wide: 0, happy: 0, open: 0, shut: 0, squash: 0, worry: 0 };
export const STD_ST = {
  sit: { ...STD_BASE },
  look: { look: 1, shut: 0, squash: 0, happy: 0 },
  wide: { wide: 1, open: 0.45, shut: 0, squash: 0, happy: 0 },
  happy: { happy: 1, open: 0.6, wide: 0, worry: 0, shut: 0, squash: 0 },
  sleepy: { look: 0, wide: 0, happy: 0, open: 0, worry: 0, shut: 1, squash: 0.3 },
};

/**
 * cfg: { kind, covers?, source, desc, start?, notes?, hw, hh,
 *   S0 (scale at size m, z 1), mid (ground = centre + mid·S), headY (head centre above ground, scale 1),
 *   box: [x0, y0, x1, y1] around the ground point at scale 1, faceR? (face box half size, scale 1),
 *   shadow?: [rx, ry], hop? (px at S0, on happy), blink?: [every, phase], lookY? (vertical look gain, 0.8),
 *   draw(c, gx, gy, o) → { hx, hy }?   (the copied film function),
 *   opts(v, k) → extra draw options (k = { t, S, s, wig }),
 *   states?/st?/base? — extra states (merged after the standard ones; a name may override a standard one),
 *   drop?: [names] — standard states the animal cannot show }
 */
export function cuteItem(cfg) {
  const drop = new Set(cfg.drop || []);
  const states = {}, st = {};
  for (const [k, d] of Object.entries({ ...STD_STATES, ...(cfg.states || {}) })) if (!drop.has(k)) states[k] = d;
  const base = { ...STD_BASE, ...(cfg.base || {}) }, extraBase = Object.fromEntries(Object.keys(cfg.base || {}).map((k) => [k, base[k]]));
  for (const k of Object.keys(states)) st[k] = { ...(STD_ST[k] || {}), ...(k === "sit" || k === "sleepy" ? extraBase : {}), ...((cfg.st || {})[k] || {}) };
  if (Object.keys(states).length > 6) throw new Error(`${cfg.kind}: more than 6 states`);
  const { S0, mid, headY, box: B, faceR = 60, hop = 6, lookY = 0.8 } = cfg, [bEvery, bPh] = cfg.blink || [3.9, 0.7];
  const [shRx, shRy] = cfg.shadow || [(B[2] - B[0]) * 0.4, 12];
  return {
    kind: cfg.kind, covers: cfg.covers || [cfg.kind], source: cfg.source, desc: cfg.desc, hw: cfg.hw, hh: cfg.hh,
    start: cfg.start || "sits, breathes, blinks", states, base, st, linear: cfg.linear || [], demo: cfg.demo || { target: true },
    notes: cfg.notes || "",
    draw(c, cx, cy, z, t, s) {
      const v = s.v, S = Math.round(S0 * z * 100) / 100;           // sprite caches key on the scale: 1 % steps
      const up = hop * Math.sin(Math.PI * s.acc("happy")) * S / S0;
      const gx = cx, gy = cy + mid * S, hy0 = gy - headY * S - up;
      let look = [0, 0];
      if (s.look && v.look > 0) { const dx = s.look[0] - gx, dy = s.look[1] - hy0, d = Math.hypot(dx, dy) || 1, k = v.look * s.lookK; look = [(dx / d) * k, (dy / d) * lookY * k]; }
      const blink = Math.max(v.shut, blinkAt(t, bEvery, bPh) * (1 - v.shut));
      shadow(c, gx, gy + 2 * S, shRx * S * (1 - 0.15 * up / hop), shRy * S);
      const H = cfg.draw(c, gx, Math.round(gy - up), { s: S, t, look, blink, ...cfg.opts(v, { t, S, s }) });
      const hx = H?.hx ?? gx, hy = H?.hy ?? hy0;
      return { box: { x0: gx + B[0] * S, y0: gy + B[1] * S - up, x1: gx + B[2] * S, y1: gy + B[3] * S }, pt: [hx, hy], face: [hx, hy + 8 * S],
        faceBox: { x0: hx - faceR * S, y0: hy - faceR * S, x1: hx + faceR * S, y1: hy + faceR * S } };
    },
  };
}
