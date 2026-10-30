// catalog-v1 item «air-flow»: moving air as a world effect prop — the white teal-rimmed air dots of «Plane windows»
// (work/pixel-lab/plane-windows/film/levels/explain-panes.mjs airDot / airPos: dots streaming along a guide) and the soft
// dithered breath clouds of «Why mosquitoes buzz right in your ear» (mosquito-buzz/film/fx.mjs cloud, the three-lobe exhale
// of its render.mjs), copies in lib/mosquito-air.mjs, plus cyan wind streaks (some with a curl at the head) in the same
// teal/white colours. A band of air flows across its slot (rightward, or leftward from the right slots); «toward» bends
// and narrows the stream onto the target prop (blended by the target's presence lookK). The flow phase is integrated
// (∫ speed dt), so speeding up never jumps; every dot, streak and cloud is born and dies by dissolving.
import { flowFrame, ribbon, bitL, clamp01, lerp, sm, frac, lerpAng, TAU } from "./lib/flow-kit.mjs";
import { AIR, puff as puffCloud } from "./lib/mosquito-air.mjs";
import { rnd } from "./lib/wetnose-scent.mjs";

const STREAK = { out: "#14485C", fill: AIR.CY, lite: "#F4FEFF" }, DOT = [AIR.CYD, AIR.W, null];
const NS = 9, ND = 22, NC = 3;
const env = (f) => sm(f, 0, 0.12) * (1 - sm(f, 0.82, 1));   // the stream dissolves at both ends of its band

export default {
  kind: "air-flow",
  covers: ["air-flow"],
  source: "mosquito-buzz/film/fx.mjs#cloud + plane-windows/film/levels/explain-panes.mjs#airDot/airPos",
  desc: "moving air: white air dots, cyan wind streaks and soft puff clouds flowing across, or blowing at the target",
  hw: 96, hh: 66, start: "still air: a few air dots drift slowly",
  states: {
    calm: [0.5, "still air: a few white air dots drift slowly, faint short streaks"],
    breeze: [0.6, "a steady breeze: wind streaks and air dots flow across", "whoosh"],
    gust: [0.6, "a strong gust: long fast streaks, a puff cloud bursts along, clouds roll", "whoosh"],
    stop: [0.8, "the air slows down and fades away: no wind", "dim"],
    toward: [0.7, "the stream narrows and blows at the target prop", "swish"],
  },
  base: { amp: 0.5, speed: 0.15, gust: 0, toward: 0 },
  st: {
    calm: { amp: 0.5, speed: 0.15, gust: 0, toward: 0 },
    breeze: { amp: 0.85, speed: 0.5, gust: 0, toward: 0 },
    gust: { amp: 1, speed: 1.05, gust: 1, toward: 0 },
    stop: { amp: 0, speed: 0.05, gust: 0 },
    toward: { amp: 0.9, speed: 0.7, gust: 0.5, toward: 1 },
  },
  demo: { target: true },
  notes: "World effect prop (moves with the camera). calm / breeze / gust / stop flow across the slot (to the right; from the right slots to the left); toward bends the stream at its target (give it one) and reaches at most ≈ 135 px past its slot. The aim eases with the target's presence (engine lookK), so a target may enter later. The film puff clouds are a screen-door dither (mixed 72 % with the backdrop), so they read best on dark backdrops; at low strength (stop transition) they are sparse dots. Calm and breeze differ mainly in streak count and speed on a still.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, amp = v.amp, gust = clamp01(v.gust), sp = clamp01(v.speed), tow = s.look ? clamp01(v.toward) * s.lookK : 0;
    const rest = (s.x ?? cx) > 330 ? Math.PI : 0, aim = s.look ? Math.atan2(s.look[1] - cy, s.look[0] - cx) : rest, ang = lerpAng(rest, aim, tow);
    const dist = s.look ? Math.hypot(s.look[0] - cx, s.look[1] - cy) : 0;
    const back = 95 * z, fwd = lerp(95 * z, Math.max(60 * z, Math.min(135 * z, dist - 24 * z)), tow), span = back + fwd;
    const F = s.integ((q) => q.speed), Fr = flowFrame(cx, cy, ang), at = (f) => -back + span * f;
    const H = lerp(44, 36, tow) * z, conv = (f) => lerp(1, 1 - 0.65 * f, tow);   // aimed: the lanes converge on the target
    const lane = (w, f, ph, k) => w * H * conv(f) + Math.sin(TAU * (f * 0.9 - F * 0.2) + ph) * (2.5 + 3 * gust) * z * k;
    // ---- puff clouds rolling along the stream (gust), and one big puff launched on the gust key
    if (gust > 0.01 && amp > 0.01) for (let p = 0; p < NC; p++) {
      const q = frac(F * 0.45 + p / NC + 0.13), a = sm(gust, 0.1, 0.6) * Math.min(1, amp * 1.2) * Math.pow(Math.sin(Math.PI * q), 0.8) * env(q); if (a <= 0.01) continue;
      const [x, y] = Fr.P(at(q), (rnd(p * 9 + 2) - 0.5) * H * 0.8 * conv(q)); puffCloud(c, x, y, (7 + 12 * q) * z, a, q, z);
    }
    const g = s.acc("gust");
    if (g > 0 && g < 1) { const e = 1 - (1 - g) * (1 - g), [x, y] = Fr.P(at(0.1 + 0.8 * e), 0); puffCloud(c, x, y, (10 + 16 * e) * z, Math.pow(Math.sin(Math.PI * g), 0.7) * 0.95, e, z); }
    // ---- wind streaks: tapered cyan strokes travelling with the flow, every third one curling at its head
    const sAmt = clamp01((amp - 0.38) / 0.45), len = 0.1 + 0.18 * sp + 0.12 * gust;
    if (sAmt > 0) for (let j = 0; j < NS; j++) {
      const vis = clamp01((sAmt * (NS + 2) - j) / 2.5); if (vis <= 0) continue;
      const w = ((((j * 5) % NS) + 0.5) / NS) * 2 - 1 + (rnd(j * 3 + 1) - 0.5) * 0.15, rate = 0.85 + 0.3 * rnd(j * 7 + 5);
      const q = frac(F * 0.8 * rate + rnd(j * 13 + 1)), life = Math.pow(Math.sin(Math.PI * q), 0.5), fh = q * (1 + len * 1.4) - len * 0.2, ft = fh - len;
      const pts = [], n = Math.max(4, Math.ceil(len * span * 1.3)), r0 = (1.05 + 0.75 * gust) * z, ph = j * 1.3;
      for (let i = 0; i <= n; i++) {
        const f = ft + (len * i) / n, k = i / n; if (f <= 0 || f >= 1) continue;
        const al = vis * env(f) * life * (0.35 + 0.65 * k) * (0.75 + 0.5 * amp); if (al <= 0.01) continue;
        const [x, y] = Fr.P(at(f), lane(w, f, ph, 1)); pts.push([x, y, Math.min(1, al * 1.15), r0 * (0.55 + 0.45 * k)]);
      }
      if (j % 3 === 0 && fh > 0 && fh < 1) {   // the curl: a small loop turning off the head
        const aH = at(fh), bH = lane(w, fh, ph, 1), rc = (4 + 2.5 * gust) * z, sg = w > 0 ? -1 : 1, aHd = vis * env(fh) * life * (0.75 + 0.5 * amp);
        for (let i = 1; i <= 16; i++) { const phi = (i / 16) * 1.35 * Math.PI, [x, y] = Fr.P(aH + rc * Math.sin(phi), bH + sg * rc * (1 - Math.cos(phi)));
          pts.push([x, y, Math.min(1, aHd * 1.15 * (1 - 0.45 * (i / 16))), r0 * (1 - 0.35 * (i / 16))]); }
      }
      if (pts.length) ribbon(c, pts, STREAK, { outA: 0.75 });
    }
    // ---- air dots streaming through (calm: they mostly jiggle in place)
    const jig = (0.35 + 0.65 * (1 - clamp01(sp * 1.6))) * 5 * z;
    for (let i = 0; i < ND; i++) {
      const vis = clamp01((amp * (ND + 3) * 0.95 - i) / 3); if (vis <= 0) continue;
      const rate = 0.8 + 0.4 * rnd(i * 3 + 11), q = frac(F * 0.8 * rate + rnd(i * 7 + 2)), life = Math.pow(Math.sin(Math.PI * q), 0.6);
      const al = vis * life * env(q); if (al <= 0.01) continue;
      const w = rnd(i * 5 + 3) * 2 - 1, ph = rnd(i * 11 + 6) * TAU;
      const [x, y] = Fr.P(at(q) + Math.sin(t * 1.3 + ph) * jig, lane(w, q, ph, 0.6) + Math.cos(t * 1.1 + ph * 1.7) * jig);
      bitL(c, x, y, 1.9 * z, DOT, al, i, 0.62, 0);
    }
    const W = H * 1.35, cs = [Fr.P(-back, -W), Fr.P(-back, W), Fr.P(fwd, -W), Fr.P(fwd, W)], xs = cs.map((p) => p[0]), ys = cs.map((p) => p[1]);
    return { box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }, pt: [cx, cy] };
  },
};
