// «The last person alive» · Builder P — the three first-person shots, drawn straight into the 540×960 Canvas c.
//   drawPOV1(c, t)  t ∈ [8.54, 12.45]  walking between dark trunks toward the campfire; she turns and smiles on "smiles"
//   drawPOV2(c, t)  t ∈ [13.38, 14.54] something small and dark leaps out of the grass at us; we fall back to the sky
//   drawPOV3(c, t)  t ∈ [21.86, 26.0]  the deep forest fills with glowing eyes; the fire behind us dies; all eyes look at us
// Pure functions of t (rnd from layout.mjs, EV word times). Helpers: pov-core / pov-forest / pov-fire / pov-woman /
// pov-hands / pov-grass / pov-eyes.
import { EV } from "./timeline.mjs";
import { rnd } from "./layout.mjs";
import { sm, clamp01 } from "./pov-core.mjs";
import { prep, drawBackdrop, drawGround, drawTrunk, drawBranches, drawItem, proj, qz, trunkDepth } from "./pov-forest.mjs";
import { drawFireBack, drawFireFront, drawFireGlow } from "./pov-fire.mjs";
import { drawWoman } from "./pov-woman.mjs";
import { drawLog } from "./pov-props.mjs";
import { drawHands1, drawFeet3 } from "./pov-hands.mjs";
import { makeEyes, drawEyes } from "./pov-eyes.mjs";
import { drawGrass, drawCritter, drawUp, rollShake, RUSTLE, UPH } from "./pov-grass.mjs";
import { Sprite, BT, GW, GH } from "./pov-core.mjs";

const PI = Math.PI, R = Math.round;

// ================================================================ POV1 world
const P1 = { x: 0.25, fire: { x: -0.12, z: 9.5 }, woman: { x: 0.62, z: 10.05 }, clear: { x: 0.2, z: 9.9, r: 3.6 } };
const path1 = (z) => 0.25 + 0.12 * Math.sin(z * 0.35);
const pathW1 = (z) => 0.42 * (1 - sm(z, 7.4, 9.2));

const TRUNKS1 = (() => {
  const out = [];
  const add = (x, z, r, seed, o = {}) => out.push({ x, z, r, seed, lean: (rnd(seed * 3) - 0.5) * 0.025, moss: rnd(seed * 5), bough: 3.2 + rnd(seed * 7) * 2.6, height: 15 + rnd(seed * 11) * 8, ...o });
  // framing trunks near the path
  add(-0.95, 5.2, 0.3, 1.1); add(1.5, 6.1, 0.29, 2.2); add(-1.65, 7.7, 0.25, 3.3); add(1.95, 8.5, 0.22, 4.4);
  add(-1.8, 10.7, 0.27, 5.5); add(2.05, 11.0, 0.3, 6.6); add(-0.75, 3.4, 0.26, 13.4); add(1.25, 4.0, 0.27, 14.5);
  // around the clearing (behind it, lit by the fire)
  add(-2.4, 12.6, 0.27, 7.7); add(2.9, 12.0, 0.3, 8.8); add(0.9, 13.6, 0.22, 9.9); add(-0.9, 14.3, 0.25, 10.1); add(3.6, 9.8, 0.26, 11.2); add(-3.7, 10.2, 0.28, 12.3);
  for (let gz = 0; gz < 28; gz++) for (let gx = -16; gx <= 16; gx++) {
    const id = gz * 100 + gx + 2000; if (rnd(id) > 0.62) continue;
    const z = 1.5 + gz * 1.3 + rnd(id * 3) * 1.1, x = gx * 1.3 + rnd(id * 5) * 1.1 - 0.55;
    const pc = z < 9 ? path1(z) : null; if (pc != null && Math.abs(x - pc) < 1.25 + (z < 5 ? 0.15 : 0)) continue;
    if (Math.hypot(x - P1.clear.x, (z - P1.clear.z) * 0.9) < P1.clear.r + 0.4) continue;
    if (Math.abs(x - 0.25) > 0.34 * z + 1.2) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 0.9)) continue;
    add(x, z, 0.11 + rnd(id * 7) * 0.2 * (z > 14 ? 1.2 : 1), id * 0.37);
  }
  return out;
})();

const ITEMS1 = (() => {
  const out = [];
  let id = 1;
  for (let i = 0; i < 900; i++) {
    const z = 1.6 + Math.pow(rnd(i * 3 + 1), 1.5) * 22, x = 0.25 + (rnd(i * 3 + 2) - 0.5) * (0.72 * z + 2.2);
    if (Math.hypot(x - P1.fire.x, z - P1.fire.z) < 0.75) continue;
    if (Math.hypot(x - P1.woman.x, z - P1.woman.z) < 0.8) continue;
    const pc = path1(z), onPath = z < 8.8 && Math.abs(x - pc) < 0.45;
    const r = rnd(i * 3 + 7);
    let kind;
    if (onPath) { if (r > 0.25) continue; kind = r < 0.15 ? "stick" : "stone"; }
    else kind = r < 0.5 ? "tuft" : r < 0.72 ? "fern" : r < 0.84 ? "stick" : r < 0.9 ? "stone" : "tuft";
    const s = kind === "tuft" ? 0.14 + rnd(i) * 0.2 : kind === "fern" ? 0.28 + rnd(i) * 0.3 : kind === "stick" ? 0.12 + rnd(i) * 0.2 : 0.035 + rnd(i) * 0.06;
    out.push({ kind, x, z, s, seed: rnd(i * 13 + 5) * 10, sway: kind === "tuft" || kind === "fern" ? 1 : 0, id: id++ });
  }
  for (const T of TRUNKS1) if (T.z < 13 && rnd(T.seed * 9) > 0.3) for (let k = 0; k < 2; k++) out.push({ kind: "root", x: T.x + (k ? 0.1 : -0.1), z: T.z - 0.05, s: 0.5 + rnd(T.seed + k) * 0.5, seed: rnd(T.seed * 17 + k), id: id++ });
  return out;
})();

/** Walk: speed 1.3 m/s, slowing to a stop around "smiles". Distance by sampling (cheap). */
function walk1(t) {
  const v = (u) => 1.3 * (1 - sm(u, 11.0, 11.85));
  let x = 0; const t0 = 8.4, n = 48, dt = (Math.max(t0, t) - t0) / n; for (let i = 0; i < n; i++) x += v(t0 + (i + 0.5) * dt) * dt; return x;
}

function fireFlicker(t, k = 1) {
  return 1 + 0.09 * Math.sin(t * 11.3 * k) + 0.06 * Math.sin(t * 17.9 * k + 1.3) + 0.05 * Math.sin(t * 5.1 * k + 0.4);
}

function stateP1(t) {
  const dz = walk1(t), stepPh = dz / 0.8 * PI;                         // one bob per step (≈ 1.8 steps/s at walking speed)
  const moving = 1 - sm(t, 11.2, 11.9);
  const bobY = 0.018 * Math.cos(2 * stepPh) * (0.3 + 0.7 * moving), bobX = 0.022 * Math.sin(stepPh) * (0.3 + 0.7 * moving);
  const pitch = 2.2 * Math.cos(2 * stepPh + 0.6) * moving;
  const S = {
    f: 820, cx: 270, H0: 292 + pitch, cam: { x: P1.x + bobX, y: 1.62 + bobY, z: dz + 1.35 },
    amb: [0.03, 0.036, 0.075], moon: [0.36, 0.5, 0.76], md: [-0.55, 0.65, 0.52], moonGround: 0.4, moonTrunk: 0.62,
    fireCol: [1.4, 0.7, 0.3], fire: { x: P1.fire.x, y: 0.35, z: P1.fire.z, I: 1.0 * fireFlicker(t), r0: 2.4 },
    fogLo: [44, 64, 96], fogHi: [8, 11, 24], fogD: 21, gfA: 0.42, gfH: 0.75, gfD: 9,
    band: 0.55, bandY: 6, bandH: 26, bandCol: [26, 34, 44],
    beams: 1.25, beamCol: [52, 72, 98], beamShift: pitch, outline: [5, 5, 10],
    ground: { dirt: [0.42, 0.37, 0.32], floor: [0.29, 0.24, 0.2], moss: [0.16, 0.24, 0.13], leaves: [[0.56, 0.32, 0.15], [0.62, 0.46, 0.2], [0.42, 0.2, 0.12], [0.5, 0.4, 0.3]] },
    path: path1, pathW: pathW1, clear: P1.clear, step: stepPh, moving, t,
  };
  // warm haze around the fire (screen)
  const d = P1.fire.z - S.cam.z, s = S.f / d;
  S.haze = { X: S.cx + (P1.fire.x - S.cam.x) * s, Y: S.H0 - (0.5 - S.cam.y) * s, rx: 1.9 * s, ry: 1.0 * s, a: 0.85 * S.fire.I, col: [120, 50, 14] };
  return prep(S);
}

// ---- her performance (POV1): looks at the fire, rubs her hands; on "smiles" turns to us and smiles
const TURN0 = EV.smiles - 0.14, TURN1 = EV.smiles + 0.36;
const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
function herState(t) {
  const k = ease((t - TURN0) / (TURN1 - TURN0));
  const idle = 0.05 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 2.3 + 1);
  const yaw = (-0.95 + idle) * (1 - k);
  const smile = ease((t - (EV.smiles + 0.02)) / 0.46) * 0.92 + 0.08 * sm(t, EV.smiles + 0.5, EV.atYouEnd + 0.1);
  const tilt = 0.07 * ease((t - (EV.smiles + 0.15)) / 0.55);
  const bl = (t - (EV.smiles + 0.08)) / 0.16, blink = bl > 0 && bl < 1 ? Math.sin(Math.PI * bl) : 0;   // a blink inside the head turn (natural)
  const bl0 = (t - 9.9) / 0.16, blink0 = bl0 > 0 && bl0 < 1 ? Math.sin(Math.PI * bl0) : 0;            // an idle blink before
  return { yaw, smile, tilt, blink: Math.max(blink, blink0), turn: k };
}

const HER = new Sprite(GW, GH);
function drawHer(c, S, t) {
  const W = P1.woman, p = proj(S, W.x, 0.45, W.z); if (p[2] < 0.5) return;
  const [X, Y, d, s] = p;
  const x0 = Math.max(0, Math.floor(X - 0.75 * s)), x1 = Math.min(GW - 1, Math.ceil(X + 0.35 * s));
  const y0 = Math.max(0, Math.floor(Y - 0.95 * s)), y1 = Math.min(GH - 1, Math.ceil(Y + 0.55 * s));
  for (let y = y0; y <= y1; y++) HER.m.fill(0, y * GW + x0, y * GW + x1 + 1);
  drawWoman(HER, { X, Y, s, t, I: S.fire.I, ...herState(t) });
  // composite with the scene's fog (quantised, dithered)
  const fog = S.fd(d) * 0.75, F = S.fog;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * GW + x; if (!HER.m[i]) continue;
    const k = i * 3, b = BT[((y & 3) << 2) | (x & 3)], q = qz(fog, 6, b);
    c.d[k] = HER.d[k] + (F[k] - HER.d[k]) * q; c.d[k + 1] = HER.d[k + 1] + (F[k + 1] - HER.d[k + 1]) * q; c.d[k + 2] = HER.d[k + 2] + (F[k + 2] - HER.d[k + 2]) * q;
  }
}

export function drawPOV1(c, t) {
  const S = stateP1(t);
  drawBackdrop(c, S);
  trunkDepth(S, TRUNKS1);
  drawGround(c, S);
  // painter's order: everything sorted far → near
  const list = [];
  for (const T of TRUNKS1) { const d = T.z - S.cam.z; if (d > 0.3) list.push([d, 0, T]); }
  for (const it of ITEMS1) { const d = it.z - S.cam.z; if (d > 0.5) list.push([d - 0.01, 1, it]); }
  const zc = S.cam.z;
  list.push([10.4 - zc, 2, () => drawLog(c, S, [0.72, 0.24, 9.55], [0.56, 0.24, 11.3], 0.2, t)]);
  list.push([10.6 - zc, 2, () => drawFireGlow(c, S, P1.fire, t, 1)]);
  list.push([10.05 - zc, 2, () => drawHer(c, S, t)]);
  list.push([9.8 - zc, 2, () => drawFireBack(c, S, P1.fire, t, 1)]);
  list.push([9.45 - zc, 2, () => drawFireFront(c, S, P1.fire, t, 1)]);
  list.sort((a, b) => b[0] - a[0]);
  for (const [, k, o] of list) {
    if (k === 0) { drawTrunk(c, S, o); drawBranches(c, S, o); }
    else if (k === 1) drawItem(c, S, o, t);
    else o();
  }
  // his hands: sway with the steps (right hand and bar opposite to the left), lit by the fire ahead
  const ph = S.step, mv = 0.25 + 0.75 * S.moving;
  const sway = [5 * Math.sin(ph + 0.4) * mv, 4 * Math.cos(2 * ph + 0.9) * mv + 2], lsway = [-4 * Math.sin(ph + 0.4) * mv, 3 * Math.cos(2 * ph + 2.2) * mv + 3];
  const warm = 0.35 + 0.65 * sm(S.cam.z, 1.5, 5.3);
  drawHands1(c, { sway, lsway, warm, flick: S.fire.I, dark: 0.62 + 0.14 * warm });
}

// ================================================================ POV2 — it leaps out of the grass; we fall back
const TRUNKS2 = (() => {
  const out = [];
  const add = (x, z, r, seed, o = {}) => out.push({ x, z, r, seed, lean: (rnd(seed * 3) - 0.5) * 0.03, moss: rnd(seed * 5), bough: 2.6 + rnd(seed * 7) * 2.4, height: 15 + rnd(seed * 11) * 8, ...o });
  add(-2.3, 5.6, 0.3, 21.1); add(2.6, 6.4, 0.32, 22.2); add(-0.9, 8.2, 0.26, 23.3); add(1.2, 9.0, 0.24, 24.4);
  for (let gz = 0; gz < 24; gz++) for (let gx = -14; gx <= 14; gx++) {
    const id = gz * 100 + gx + 9000; if (rnd(id) > 0.66) continue;
    const z = 7 + gz * 1.25 + rnd(id * 3) * 1.0, x = gx * 1.25 + rnd(id * 5) * 1.0 - 0.5;
    if (Math.abs(x) > 0.42 * z + 1.5) continue;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 0.85)) continue;
    add(x, z, 0.11 + rnd(id * 7) * 0.2, id * 0.41);
  }
  return out;
})();
const ITEMS2 = (() => {
  const out = [];
  for (let i = 0; i < 260; i++) {
    const z = 7.2 + rnd(i * 3 + 1) * 16, x = (rnd(i * 3 + 2) - 0.5) * (0.8 * z + 2), r = rnd(i * 3 + 7);
    out.push({ kind: r < 0.55 ? "tuft" : r < 0.85 ? "fern" : "stone", x, z, s: r < 0.55 ? 0.18 + rnd(i) * 0.2 : r < 0.85 ? 0.3 + rnd(i) * 0.3 : 0.05 + rnd(i) * 0.05, seed: rnd(i * 13 + 5) * 10, sway: 1 });
  }
  return out;
})();
const D2 = { t0: EV.jumps, burst: EV.jumps + 0.22, hit: EV.grass + 0.08, fall0: EV.grass + 0.06, land: EV.grassEnd - 0.0 };
const deg = Math.PI / 180;
function pitch2(t) {
  const up = ease((t - D2.fall0) / (D2.land + 0.06 - D2.fall0));
  const bounce = -3.2 * deg * Math.sin(Math.PI * clamp01((t - D2.land) / 0.22)) * (t > D2.land ? 1 : 0);
  return -14 * deg + 82 * deg * up + bounce;
}
/** shake: decaying jolts at the burst, the hit and the landing (deterministic noise). */
function shake2(t) {
  let x = 1.2 * Math.sin(t * 2.1) + 0.8 * Math.sin(t * 3.7 + 1), y = 1.0 * Math.sin(t * 1.7 + 2);
  for (const [t0, amp, dur] of [[D2.hit, 13, 0.3], [D2.land, 11, 0.28]]) {
    const u = (t - t0) / dur; if (u < 0 || u > 1) continue;
    const env = amp * (1 - u) * (1 - u), w = (t - t0) * 60;
    x += env * (Math.sin(w * 1.9) * 0.8 + Math.sin(w * 3.3 + 1) * 0.4); y += env * (Math.sin(w * 2.3 + 2) * 0.8 + Math.sin(w * 2.9) * 0.4);
  }
  return [x, y];
}
function stateP2(t) {
  const p = pitch2(t), [shx, shy] = shake2(t);
  const fallY = 0.35 * ease((t - D2.hit) / 0.4);
  const S = {
    f: 820, cx: 270, H0: 480 + 820 * Math.tan(p), cam: { x: 0, y: 1.55 - fallY, z: -0.05 * ease((t - D2.hit) / 0.4) },
    amb: [0.028, 0.032, 0.07], moon: [0.32, 0.44, 0.7], md: [-0.5, 0.7, 0.5], moonGround: 0.34, moonTrunk: 0.5,
    fireCol: [1.4, 0.72, 0.32], fire: { x: -0.7, y: 0.4, z: -1.4, I: 1.5 * fireFlicker(t, 1.1), r0: 2.8 },
    fogLo: [30, 42, 70], fogHi: [7, 9, 22], fogD: 17, gfA: 0.38, gfH: 0.7, gfD: 8,
    band: 0.35, bandY: 4, bandH: 20, bandCol: [20, 26, 36],
    beams: 0.7, beamCol: [44, 60, 86], beamShift: 0, outline: [5, 5, 10],
    ground: { dirt: [0.4, 0.35, 0.3], floor: [0.27, 0.23, 0.19], moss: [0.16, 0.24, 0.13], leaves: [[0.5, 0.3, 0.15], [0.56, 0.42, 0.2], [0.4, 0.2, 0.12], [0.46, 0.38, 0.28]] },
    t, shx, shy, roll: -0.15 * ease((t - D2.hit) / 0.4) + 0.04 * ease((t - D2.land) / 0.3),
  };
  return prep(S);
}
const WORK2 = { w: GW, h: GH, d: new Uint8ClampedArray(GW * GH * 3) };
const ITEMS2_SORT = [...ITEMS2].sort((a, b) => b.z - a.z);

/** The thing: world position (camera-relative) along its leap. */
function critter2(t) {
  const u = clamp01((t - D2.burst) / (D2.hit + 0.02 - D2.burst));
  const k = u * u * (1.6 - 0.6 * u);                                       // accelerates toward us
  const A = [RUSTLE.x, 0.1, RUSTLE.z], B = [0.0, 1.5, 0.4];
  const x = A[0] + (B[0] - A[0]) * k, z = A[2] + (B[2] - A[2]) * k;
  const y = A[1] + (B[1] - A[1]) * k + 0.35 * Math.sin(Math.PI * u) * (1 - u);
  const after = Math.max(0, t - D2.hit - 0.01);                            // it shoots past over our right shoulder
  return [x + 2.2 * after, y + 0.9 * after, z - 0.2 * after, u];
}

export function drawPOV2(c, t) {
  const S = stateP2(t), W = WORK2;
  const ybUp = S.H0 - 1400;                                                // bottom edge of the sky painting (ends ≈ 1110)
  if (ybUp < GH + 40) {
    drawBackdrop(W, S);
    trunkDepth(S, TRUNKS2);
    drawGround(W, S);
    const list = [];
    for (const T of TRUNKS2) list.push([T.z - S.cam.z, 0, T]);
    for (const it of ITEMS2_SORT) list.push([it.z - S.cam.z, 1, it]);
    list.sort((a, b) => b[0] - a[0]);
    for (const [, k, o] of list) { if (k === 0) { drawTrunk(W, S, o); drawBranches(W, S, o); } else drawItem(W, S, o, t); }
    // the grass: shakes, then parts where it bursts out
    const rk = sm(t, D2.t0 - 0.05, D2.t0 + 0.1) * (1 - sm(t, D2.burst, D2.burst + 0.12));
    const part = sm(t, D2.burst - 0.04, D2.burst + 0.12) * (1 - 0.6 * sm(t, D2.burst + 0.25, D2.burst + 0.8));
    drawGrass(W, S, t, { k: rk, part });
    // flung grass bits and dirt
    if (t > D2.burst - 0.02) {
      const age = t - D2.burst + 0.02;
      for (let i = 0; i < 16; i++) {
        const vx = (rnd(i * 3 + 1) - 0.5) * 1.6, vy = 1.4 + rnd(i * 3 + 2) * 1.6, vz = -0.6 - rnd(i * 3 + 3) * 1.4, a2 = age * (0.8 + 0.4 * rnd(i));
        const x = RUSTLE.x + vx * a2, y = 0.25 + vy * a2 - 4.9 * a2 * a2, z = RUSTLE.z + vz * a2;
        if (y < 0 || a2 > 0.7) continue;
        const P = proj(S, x, y, z); if (P[2] < 0.3) continue;
        const L = Math.max(1, 0.04 * P[3]), ang = rnd(i * 7) * 6 + a2 * 12, col = i % 3 ? [150, 140, 70] : [60, 46, 36];
        for (let j = 0; j <= L; j++) { const X = R(P[0] + Math.cos(ang) * j), Y = R(P[1] + Math.sin(ang) * j); if (X >= 0 && Y >= 0 && X < GW && Y < GH && (1 - a2 / 0.7) > BT[((Y & 3) << 2) | (X & 3)] * 0.7) { const kk = (Y * GW + X) * 3; W.d[kk] = col[0]; W.d[kk + 1] = col[1]; W.d[kk + 2] = col[2]; } }
      }
    }
  }
  if (ybUp > -10) drawUp(W, ybUp);
  // the dark shape: hidden in the grass until the burst, then it leaps at the camera (ghost trail + speed lines)
  if (t > D2.burst - 0.02) {
    const at = (tt) => { const [x, y, z, u] = critter2(tt), P = proj(S, x, y, z); return { P, u }; };
    const now = at(t), prev = at(t - 0.03);
    let dx = now.P[0] - prev.P[0], dy = now.P[1] - prev.P[1]; const sp = Math.hypot(dx, dy) || 1; dx /= sp; dy /= sp;
    const blur = clamp01(sp / 60), stretch = clamp01(sp / 90);
    const draw = (tt, a, glint) => {
      const { P, u } = at(tt); if (P[2] < 0.12) return;
      const r = 0.062 * P[3];
      if (P[1] - r * 2 > GH || P[1] + r * 2 < 0 || P[0] + r * 2 < 0 || P[0] - r * 2 > GW) return;
      const gone = 1 - sm(tt, D2.hit + 0.02, D2.hit + 0.13);
      drawCritter(W, P[0], P[1], r, { dir: [dx, dy], stretch, blur, a: a * gone * sm(tt, D2.burst - 0.02, D2.burst + 0.06), glint, t: tt, ghost: a < 1 });
    };
    const u = now.u;
    // speed lines: thin pale streaks radiating out from it while it closes in
    if (u > 0.35 && u < 1.08) {
      const P = now.P, a = Math.min(1, (u - 0.35) * 2.2) * (1 - sm(u, 0.98, 1.08)), r = 0.062 * P[3];
      for (let i = 0; i < 26; i++) {
        const ang = (i / 26) * Math.PI * 2 + rnd(i) * 0.2, r0 = r * (1.25 + rnd(i * 3) * 0.5), len = r * (0.6 + rnd(i * 5) * 1.4) + 20;
        for (let j = 0; j < len; j++) {
          const X = R(P[0] + Math.cos(ang) * (r0 + j)), Y = R(P[1] + Math.sin(ang) * (r0 + j)); if (X < 0 || Y < 0 || X >= GW || Y >= GH) continue;
          if (a * (1 - j / len) * 0.8 <= BT[((Y & 3) << 2) | (X & 3)]) continue;
          const kk = (Y * GW + X) * 3, m = 0.35; W.d[kk] += (150 - W.d[kk]) * m; W.d[kk + 1] += (128 - W.d[kk + 1]) * m; W.d[kk + 2] += (108 - W.d[kk + 2]) * m;
        }
      }
    }
    if (u > 0.12 && u < 0.9) for (const [dt, a] of [[0.075, 0.15], [0.05, 0.28], [0.025, 0.45]]) draw(t - dt, a, 0);
    draw(t, 1, sm(t, D2.burst + 0.04, D2.burst + 0.14));
  }
  rollShake(c, W.d, S.roll, 1 + 0.12 * sm(t, D2.hit - 0.05, D2.hit + 0.2), S.shx, S.shy);
}

// ================================================================ POV3 — the forest fills with eyes; the fire behind us dies
const C3 = { f: 700, cx: 270, H0: 420, y: 0.95 };
const EYES = makeEyes(C3.f, C3.cx, C3.H0, C3.y);
const TRUNKS3 = (() => {
  const out = [];
  const add = (x, z, r, seed, o = {}) => out.push({ x, z, r, seed, lean: (rnd(seed * 3) - 0.5) * 0.03, moss: 0.4 + rnd(seed * 5) * 0.6, bough: 2.4 + rnd(seed * 7) * 2.2, height: 14 + rnd(seed * 11) * 8, ...o });
  // near trunks framing the view, lit by the fire behind us
  add(-1.25, 2.7, 0.3, 31.1); add(1.35, 3.3, 0.33, 32.2); add(-0.35, 5.4, 0.22, 33.3); add(2.2, 5.0, 0.28, 34.4);
  const hidesEye = (x, z, r) => EYES.some((E) => E.z > z && Math.abs((x - E.x * z / E.z) * C3.f / z) < r * C3.f / z + 0.06 * C3.f / E.z * 1.2 + 2 && E.y * 0 === 0 && Math.abs(E.x / E.z - x / z) * C3.f < (r / z) * C3.f + 0.05 * C3.f / E.z + 3);
  for (let gz = 0; gz < 30; gz++) for (let gx = -14; gx <= 14; gx++) {
    const id = gz * 100 + gx + 15000; if (rnd(id) > 0.72) continue;
    const z = 3.2 + gz * 1.05 + rnd(id * 3) * 0.9, x = gx * 1.05 + rnd(id * 5) * 0.9 - 0.45;
    if (Math.abs(x) > 0.42 * z + 1.2) continue;
    const r = 0.1 + rnd(id * 7) * 0.2;
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < 0.8)) continue;
    if (hidesEye(x, z, r)) continue;
    add(x, z, r, id * 0.43);
  }
  return out;
})();
const ITEMS3 = (() => {
  const out = [];
  for (let i = 0; i < 520; i++) {
    const z = 1.3 + Math.pow(rnd(i * 3 + 1), 1.3) * 16, x = (rnd(i * 3 + 2) - 0.5) * (0.85 * z + 1.6), r = rnd(i * 3 + 7);
    const kind = r < 0.5 ? "tuft" : r < (z < 3.2 ? 0.62 : 0.8) ? "fern" : r < 0.9 ? "stick" : "stone";
    out.push({ kind, x, z, s: kind === "tuft" ? 0.14 + rnd(i) * 0.18 : kind === "fern" ? (z < 3.2 ? 0.16 : 0.26) + rnd(i) * (z < 3.2 ? 0.14 : 0.32) : kind === "stick" ? 0.14 + rnd(i) * 0.2 : 0.04 + rnd(i) * 0.05, seed: rnd(i * 13 + 5) * 10, sway: 1 });
  }
  for (const T of TRUNKS3) if (T.z < 9) for (let k = 0; k < 2; k++) out.push({ kind: "root", x: T.x + (k ? 0.1 : -0.1), z: T.z - 0.05, s: 0.5 + rnd(T.seed + k) * 0.5, seed: rnd(T.seed * 17 + k) });
  return out.sort((a, b) => b.z - a.z);
})();
const F3 = { die0: EV.eyesEnd + 0.2, die1: EV.eyesEnd + 1.4 };            // 24.2 → 25.4
/** The fire behind us: steady flicker, then it dies — the flicker slows and sputters out. */
function fire3(t) {
  const k = 1 - sm(t, F3.die0, F3.die1);
  // flicker phase = ∫ speed dt, the speed falling from 1 to 0.35 as it dies (so the flicker really slows)
  let ph = Math.min(t, F3.die0);
  if (t > F3.die0) { const n = 16, dt = (t - F3.die0) / n; for (let i = 0; i < n; i++) ph += (0.35 + 0.65 * (1 - sm(F3.die0 + (i + 0.5) * dt, F3.die0, F3.die1))) * dt; }
  const fl = 1 + 0.1 * Math.sin(ph * 11.3) + 0.07 * Math.sin(ph * 17.9 + 1.3) + 0.06 * Math.sin(ph * 5.1 + 0.4);
  const sputter = t > F3.die0 ? 0.25 * Math.max(0, Math.sin((t - F3.die0) * 9)) * k * (1 - k) * 4 : 0;
  return Math.max(0, k * k * fl + sputter * k);
}
function stateP3(t) {
  const I = fire3(t), night = 1 - 0.78 * sm(t, F3.die0, F3.die1 + 0.2);
  const push = 0.4 * ((t - 21.76) / 4.3);
  const S = {
    f: C3.f, cx: C3.cx, H0: C3.H0, cam: { x: 0, y: C3.y, z: push },
    amb: [0.022 * night, 0.026 * night, 0.055 * night], moon: [0.26 * night, 0.36 * night, 0.58 * night], md: [-0.4, 0.75, 0.55], moonGround: 0.26, moonTrunk: 0.4,
    fireCol: [1.45, 0.72, 0.3], fire: { x: 0.15, y: 0.4, z: -1.5 + push, I: 1.25 * I, r0: 3.0 },
    fogLo: [24 * night, 33 * night, 56 * night], fogHi: [5 * night, 7 * night, 16 * night], fogD: 12, gfA: 0.55, gfH: 0.8, gfD: 6,
    band: 0.5 * night, bandY: 10, bandH: 30, bandCol: [16, 22, 32],
    beams: 0.45 * night, beamCol: [36, 50, 72], beamShift: 0, outline: [4, 4, 8],
    ground: { dirt: [0.36, 0.32, 0.27], floor: [0.25, 0.21, 0.18], moss: [0.15, 0.23, 0.13], leaves: [[0.5, 0.3, 0.15], [0.56, 0.42, 0.2], [0.4, 0.2, 0.12], [0.46, 0.38, 0.28]] },
    path: null, clear: null, t, I,
  };
  return prep(S);
}
export function drawPOV3(c, t) {
  const S = stateP3(t);
  drawBackdrop(c, S);
  trunkDepth(S, TRUNKS3);
  drawGround(c, S);
  const list = [];
  for (const T of TRUNKS3) list.push([T.z - S.cam.z, 0, T]);
  for (const it of ITEMS3) list.push([it.z - S.cam.z, 1, it]);
  list.sort((a, b) => b[0] - a[0]);
  for (const [, k, o] of list) { if (k === 0) { drawTrunk(c, S, o); drawBranches(c, S, o); } else drawItem(c, S, o, t); }
  drawEyes(c, S, EYES, t, 1 + 0.35 * sm(t, F3.die0, F3.die1));
  drawFeet3(c, { warm: clamp01(S.I), flick: 1, dark: 1 - 0.8 * sm(t, F3.die0, F3.die1 + 0.2) });
}

