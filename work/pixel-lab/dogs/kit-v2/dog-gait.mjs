// Dog series kit · side-view gaits of the border collie (local world units, facing +x, ground y = 0, up negative).
// A gait is a pure function of its phase p (p and p + 1 identical). Planted paws move backward in the dog's local frame at
// exactly STRIDE[gait] units per cycle, so when the lead advances the dog by STRIDE · Δphase the paws stay put on the lawn.
const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, k) => a + (b - a) * k;

export const PAW_Y = -3.7;                       // paw centre when planted (paw bottom on the lawn line)
/** World units the dog advances per full cycle (phase 0 → 1) of each gait. */
export const STRIDE = { stand: 0, walk: 30, trot: 54, run: 104 };
/** Natural cadence (cycles per second) — speed = STRIDE · cadence. */
export const CADENCE = { walk: [1.2, 1.9], trot: [2.2, 2.7], run: [2.6, 3.1] };

// neutral body (stand)
export const BODY = { C: [7, -35], Rp: [-29, -36] };
const NEUTRAL = { fn: 13, ff: 6, hn: -31, hf: -24 };

function bez(p0, p1, p2, p3, s) { const u = 1 - s; return [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * s * p1[i] + 3 * u * s * s * p2[i] + s * s * s * p3[i]); }

/**
 * One paw. L = { td: touchdown phase, b: stance fraction, x0: centre of the stance sweep, l1/l2: lift at the control
 * points, r1/r2: extra x at the control points (+ = forward), curl: paw rotation in swing, k: liftoff/landing speed match }.
 */
function paw(L, D, p) {
  const u = frac(p - L.td), b = L.b, half = (D * b) / 2;
  if (u < b) return [L.x0 + half - D * u, PAW_Y, 0, 1];
  const s = (u - b) / (1 - b), P0 = [L.x0 - half, PAW_Y], P3 = [L.x0 + half, PAW_Y], v = ((L.k ?? 0.7) * D * (1 - b)) / 3;
  const c1 = [P0[0] - v + (L.r1 ?? 0), P0[1] - L.l1], c2 = [P3[0] + v + (L.r2 ?? 0), P3[1] - L.l2];
  const q = bez(P0, c1, c2, P3, s);
  return [q[0], Math.min(PAW_Y, q[1]), L.curl * Math.sin(Math.PI * Math.pow(s, L.cp ?? 0.8)), 0];
}

const GAITS = {
  walk: {
    D: STRIDE.walk,
    legs: { hn: { td: 0.0, b: 0.64, x0: NEUTRAL.hn, l1: 4, l2: 4.5, curl: 0.55 }, fn: { td: 0.25, b: 0.64, x0: NEUTRAL.fn, l1: 6, l2: 5, curl: 0.95 },
      hf: { td: 0.5, b: 0.64, x0: NEUTRAL.hf, l1: 4, l2: 4.5, curl: 0.55 }, ff: { td: 0.75, b: 0.64, x0: NEUTRAL.ff, l1: 6, l2: 5, curl: 0.95 } },
    body(p) {
      const bob = 0.7 * Math.cos(2 * TAU * (p - 0.12));
      return { dC: [0, bob + 0.35 * Math.sin(TAU * (p + 0.3))], dR: [0, bob * 0.8 + 0.45 * Math.sin(TAU * p)], arch: 0, head: [0.3 * Math.sin(TAU * 2 * p), 0.9 * Math.cos(2 * TAU * (p - 0.2))], ha: 0.03 * Math.sin(2 * TAU * (p - 0.15)), ear: [0.05 * Math.sin(2 * TAU * (p - 0.3)), 0.05 * Math.sin(2 * TAU * (p - 0.35))], tailA: 0.12 * Math.sin(TAU * p), tailH: 0.05, shadow: 1 };
    },
  },
  trot: {
    D: STRIDE.trot,
    legs: { hn: { td: 0.0, b: 0.42, x0: NEUTRAL.hn - 1, l1: 6, l2: 6, curl: 0.7 }, ff: { td: 0.0, b: 0.42, x0: NEUTRAL.ff + 1, l1: 9, l2: 6.5, curl: 1.2 },
      hf: { td: 0.5, b: 0.42, x0: NEUTRAL.hf - 1, l1: 6, l2: 6, curl: 0.7 }, fn: { td: 0.5, b: 0.42, x0: NEUTRAL.fn + 1, l1: 9, l2: 6.5, curl: 1.2 } },
    body(p) {
      const bob = 1.7 * Math.cos(2 * TAU * (p - 0.21));
      return { dC: [0.6, bob - 0.5], dR: [0, bob * 0.9 + 0.3 * Math.sin(TAU * p)], arch: 0.4, head: [0.5, 1.4 * Math.cos(2 * TAU * (p - 0.28))], ha: 0.04 * Math.cos(2 * TAU * (p - 0.3)), ear: [-0.12 + 0.12 * Math.cos(2 * TAU * (p - 0.33)), -0.12 + 0.12 * Math.cos(2 * TAU * (p - 0.38))], tailA: 0.08 * Math.sin(2 * TAU * p), tailH: 0.25, shadow: 1 - 0.15 * Math.max(0, -Math.cos(2 * TAU * (p - 0.21))) };
    },
  },
  // rotary gallop with two suspensions: hind stance 0–0.3 (body opens), extended flight, front stance 0.44–0.72
  // (body closes), gathered flight with the hind paws swinging under the belly.
  run: {
    D: STRIDE.run,
    legs: {
      hf: { td: 0.0, b: 0.25, x0: -20, l1: 9, l2: 8, r1: -8, r2: -10, curl: 1.0, k: 0.45 },
      hn: { td: 0.06, b: 0.25, x0: -24, l1: 9, l2: 8, r1: -8, r2: -10, curl: 1.0, k: 0.45 },
      ff: { td: 0.44, b: 0.22, x0: 18, l1: 15, l2: 9, r1: -12, r2: 12, curl: 1.7, cp: 0.55, k: 0.45 },
      fn: { td: 0.52, b: 0.22, x0: 21, l1: 15, l2: 9, r1: -12, r2: 12, curl: 1.7, cp: 0.55, k: 0.45 },
    },
    body(p) {
      const ext = 0.5 + 0.5 * Math.cos(TAU * (p - 0.36));            // 1 = stretched (extended flight), 0 = gathered
      const up = 0.5 + 0.5 * Math.cos(2 * TAU * (p - 0.37));          // 1 in both flights
      const tilt = -0.11 * Math.sin(TAU * (p - 0.08));                  // chest up during the hind stance, down in the front stance
      const len = lerp(-7, 6, ext), y = -3.5 * up + 1.2;
      const cx = len * 0.55, rx = -len * 0.45;
      const half = (BODY.C[0] - BODY.Rp[0]) / 2;
      return {
        dC: [cx + 2, y + Math.sin(tilt) * half], dR: [rx, y - Math.sin(tilt) * half + 1], arch: lerp(5, -1.5, ext),
        head: [3 + 0.5 * ext, 3 + y * 0.4 + 1.2 * Math.cos(TAU * (p - 0.55))], ha: 0.12 + 0.05 * Math.sin(TAU * (p - 0.2)),
        ear: [-0.55 + 0.25 * Math.sin(TAU * (p - 0.1)), -0.55 + 0.25 * Math.sin(TAU * (p - 0.15))], tailA: 0.18 * Math.sin(TAU * (p - 0.3)), tailH: 0.1, tailRun: 1,
        shadow: 1 - 0.3 * up,
      };
    },
  },
};

/** Breathing idle for "stand" (t in seconds). */
function standBody(t) {
  const br = Math.sin(t * TAU * 0.45);
  return { dC: [0, -0.35 * br], dR: [0, -0.15 * br], arch: 0, head: [0, -0.3 * br], ha: 0, ear: [0, 0], tailA: 0, tailH: 0, shadow: 1 };
}

/**
 * Pose key for a gait: { C, Rp, arch, head: extra head offset, ha: extra head angle, ear: [near, far] swing, tailA,
 * tailH, tailRun, shadow, paws: { fn, ff, hn, hf: [x, y, angle, planted] } }.
 */
export function gaitKey(gait, p, t) {
  const G = GAITS[gait];
  const b = G ? G.body(frac(p)) : standBody(t);
  const paws = {};
  for (const n of ["fn", "ff", "hn", "hf"]) paws[n] = G ? paw(G.legs[n], G.D, p) : [NEUTRAL[n], PAW_Y, 0, 1];
  return {
    C: [BODY.C[0] + b.dC[0], BODY.C[1] + b.dC[1]], Rp: [BODY.Rp[0] + b.dR[0], BODY.Rp[1] + b.dR[1]], arch: b.arch,
    head: b.head, ha: b.ha, ear: b.ear, tailA: b.tailA, tailH: b.tailH, tailRun: b.tailRun ?? 0, shadow: b.shadow, paws,
  };
}

/** Component-wise mix of two gait keys (numbers and nested arrays/objects). */
export function mixKeys(a, b, k) {
  if (typeof a === "number") return lerp(a, b, k);
  if (Array.isArray(a)) return a.map((v, i) => mixKeys(v, b[i], k));
  const o = {}; for (const n in a) o[n] = mixKeys(a[n], b[n], k); return o;
}
