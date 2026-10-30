// catalog-v1 item «scent-trail»: the smell bits of «Why is a dog's nose always cold and wet?» (work/pixel-lab/dogs/wet-nose/
// film/fx.mjs particles / bit / SMELL_COLS, copy in lib/wetnose-scent.mjs) as a world effect prop: wavy scent ribbons in the
// film's smell colours (pink, lilac, peach) with the film's glowing bits drifting along them. Without a target (or when not
// «toward») the wisps rise from the slot and curl apart at the top; «toward» bends the whole trail onto the target prop
// (blended by the target's presence lookK) and the bits slow down and gather at its end, like smell sticking to a nose.
// Flow phase is integrated (∫ flow dt): speeding up never jumps. Bits are born and die by dissolving (life envelope ×
// a dither anchored to each bit, lib/flow-kit.mjs bitL); ribbons fade toward both ends.
import { mix } from "../../../../renderer/pixel/raster.mjs";
import { flowFrame, ribbon, bitL, clamp01, lerp, sm, frac, lerpAng, TAU } from "./lib/flow-kit.mjs";
import { SMELL_COLS, bitCols, rnd } from "./lib/wetnose-scent.mjs";

const RIB = [SMELL_COLS[0], SMELL_COLS[4], SMELL_COLS[5]].map((col) => ({ out: mix(col, "#0B0812", 0.74), fill: col, lite: mix(col, "#FFFFFF", 0.55) }));
const NB = 18, NP = 12, SIDE = [-1, 0, 1], RIB_FROM = [0, 0.2, 0.5];

export default {
  kind: "scent-trail",
  covers: ["scent-trail"],
  source: "dogs/wet-nose/film/fx.mjs#particles (+ bit, SMELL_COLS)",
  desc: "smell: wavy pink/lilac scent ribbons with glowing smell bits; rises and curls, or drifts to the target (a nose)",
  hw: 70, hh: 86, start: "faint scent wisps rise and curl, a few smell bits drift up",
  states: {
    faint: [0.5, "two thin faint wisps rise and curl, a few smell bits"],
    strong: [0.6, "three thick bright scent ribbons, many smell bits", "swell"],
    puff: [0.7, "a puff of smell bits bursts out of the source", "pop"],
    fade: [0.7, "the scent thins out and dissolves away", "dim"],
    toward: [0.7, "the scent trail bends and drifts to the target prop; bits gather at its end", "whoosh"],
  },
  base: { amp: 0.45, thick: 0, flow: 0.32, toward: 0 },
  st: {
    faint: { amp: 0.45, thick: 0, flow: 0.32, toward: 0 },
    strong: { amp: 1, thick: 1, flow: 0.55, toward: 0 },
    toward: { amp: 0.85, thick: 0.5, flow: 0.5, toward: 1 },
    puff: { amp: 0.9, thick: 0.6 },
    fade: { amp: 0, thick: 0, flow: 0.25 },
  },
  demo: { target: true },
  notes: "World effect prop (moves with the camera). faint / strong / puff / fade rise from the slot and curl apart at the top; toward aims the trail at its target (give it one; place the scent between the food and the nose: it reaches at most ≈ 125 px past its slot, so it does not touch a far target). The aim eases with the target's presence (engine lookK), so a target may enter later. Faint ribbons are half-dithered on purpose (thin and see-through); bits stay 3 px at the wide shot like the film.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, amp = v.amp, tow = s.look ? clamp01(v.toward) * s.lookK : 0;
    const aim = s.look ? Math.atan2(s.look[1] - cy, s.look[0] - cx) : -Math.PI / 2, ang = lerpAng(-Math.PI / 2, aim, tow);
    const dist = s.look ? Math.hypot(s.look[0] - cx, s.look[1] - cy) : 0;
    const back = lerp(70, 62, tow) * z, fwd = lerp(84 * z, Math.max(50 * z, Math.min(124 * z, dist - 22 * z)), tow), span = back + fwd;
    const F = s.integ((q) => q.flow), Fr = flowFrame(cx, cy, ang), puff = s.acc("puff"), pk = Math.sin(Math.PI * puff);
    // across the flow: rising wisps fan out toward the top; aimed, they narrow onto the target
    const spread = (f) => lerp(0.6 + 0.7 * f, lerp(1, 0.25, f * f), tow), at = (f) => -back + span * f;
    // ---- ribbons (wavy scent wisps): a travelling wave along the trail, puffs of strength drifting with it
    if (amp > 0.005) for (let j = 0; j < 3; j++) {
      const k = clamp01((amp - RIB_FROM[j]) / 0.3); if (k <= 0) continue;
      const pts = [], n = Math.ceil(span * 1.2);
      for (let i = 0; i <= n; i++) {
        const f = i / n, env = sm(f, 0, 0.2) * (1 - sm(f, 0.7, 1)); if (env <= 0) continue;
        // parallel S-curves (nearly the same phase: cartoon smell lines), a travelling wave = the scent drifting along
        const wave = (5 + 7 * f) * z * (1 - 0.25 * tow) * Math.sin(TAU * (f * 1.7 - F * 0.55) + j * 0.45);
        const curl = SIDE[j] * 14 * z * f * f * f * (1 - tow);
        // puffs of strength travel with the flow; the radius follows them too (no plateau: widening never steps a whole ribbon at once)
        const pulse = 0.5 + 0.5 * Math.sin(TAU * (f * 1.8 - F * 0.9) + j * 1.7);
        const al = Math.min(1, env * (0.7 + 0.3 * pulse) * k * (0.55 + 0.6 * amp + 0.35 * pk));
        const r = (1.1 + 1.2 * v.thick) * z * (0.55 + 0.3 * env + 0.15 * Math.sin(Math.PI * f)) * (0.82 + 0.18 * pulse);
        const [x, y] = Fr.P(at(f), SIDE[j] * 15 * z * spread(f) + wave + curl); pts.push([x, y, al, r]);
      }
      ribbon(c, pts, RIB[j]);
    }
    // ---- smell bits drifting along the trail (aimed: they slow down and gather at its end)
    for (let i = 0; i < NB; i++) {
      const vis = clamp01((amp * (NB + 3) - i) / 3); if (vis <= 0) continue;
      const rate = 0.75 + 0.5 * rnd(i * 3 + 1), q = frac(F * 0.5 * rate + rnd(i * 7 + 3)), life = Math.sin(Math.PI * q); if (life <= 0.01) continue;
      const f = lerp(q, Math.sin((q * Math.PI) / 2), tow * 0.7);
      const b = (rnd(i * 5 + 2) - 0.5) * 2 * 22 * z * spread(f) + Math.sin(TAU * (F * 0.8 * rate + rnd(i * 11 + 4))) * 4 * z * (1 - 0.5 * tow);
      const [x, y] = Fr.P(at(f), b);
      bitL(c, x, y, 1.5 * z, bitCols(SMELL_COLS[i % SMELL_COLS.length]), vis * Math.pow(life, 0.6), i);
    }
    // ---- puff: a ring of bits bursts out of the source and drifts on
    if (puff > 0 && puff < 1) {
      const [sx, sy] = Fr.P(-back * 0.65, 0), e = 1 - (1 - puff) * (1 - puff), al = Math.pow(pk, 0.7);
      for (let i = 0; i < NP; i++) {
        const an = (TAU * i) / NP + rnd(i + 40) * 0.5, rr = (6 + (30 + 18 * rnd(i + 50)) * e) * z;
        bitL(c, sx + Math.cos(an) * rr + Fr.ux * 14 * z * e, sy + Math.sin(an) * rr * 0.8 + Fr.uy * 14 * z * e, 1.7 * z, bitCols(SMELL_COLS[(i + 2) % SMELL_COLS.length]), al, i + 5);
      }
    }
    const W = 40 * z, cs = [Fr.P(-back, -W), Fr.P(-back, W), Fr.P(fwd, -W), Fr.P(fwd, W)], xs = cs.map((p) => p[0]), ys = cs.map((p) => p[1]);
    return { box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, pt: [cx, cy] };
  },
};
