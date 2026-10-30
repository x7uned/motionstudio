// Herobrine film — the story state at time t: which view is on (first person in the fog / iso world), the first-person
// camera (stand, walk, the long lens on the eyes, walk again), the figure (appears, stares, turns, runs into the fog),
// the iso cameras (tunnel, pyramids, dead trees, the house), the house walls (cut away on "staged"). Loop film: the last
// frame is the first one (the figure on the ridge, the player in the clearing).
import { EV, END } from "./timeline.mjs";
import { CLEARING, RIDGE, HILL, TUNNEL, LAKE, PYRAMIDS, DEAD, HOUSE, groundY } from "./world.mjs";

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (t, a, b) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const lerp = (a, b, k) => a + (b - a) * k;
export const win = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(smooth(t, a, a + fi), 1 - smooth(t, b, b + fo));
export const wrap = (t) => ((t % END) + END) % END;

// ---------------------------------------------------------------- which view: first person (fp) or the iso world
export const VIEW = { toIso: [EV.stopEnd - 0.15, EV.stopEnd + 0.45], toFp: [EV.babyEnd - 0.2, EV.babyEnd + 0.5] };
export const isoAmount = (t) => Math.min(smooth(t, ...VIEW.toIso), 1 - smooth(t, ...VIEW.toFp));

// ---------------------------------------------------------------- first-person camera
const EYE = groundY(CLEARING.x, CLEARING.z) + 1.62;
const Z0 = CLEARING.z, Z1 = CLEARING.z - 5, Z2 = CLEARING.z - 12;
const WALK1 = [EV.alone - 0.4, EV.fog1End - 0.1], WALK2 = [EV.walked - 0.1, EV.fog2 + 0.1], LENS = [EV.normal - 0.3, EV.eyes + 0.1], LENS_OUT = [EV.when - 0.05, EV.walked + 0.45];
const figTarget = () => [RIDGE.x + 0.5, groundY(RIDGE.x, RIDGE.z) + 1.65, RIDGE.z + 0.5];
export function fpCam(t) {
  t = wrap(t);
  // after the cards the first person is not seen until the end: reset to the clearing while hidden
  const reset = t > 40 ? 1 : 0;
  let z = Z0, walking = 0;
  if (!reset) {
    if (t >= WALK1[0]) z = lerp(Z0, Z1, ease((t - WALK1[0]) / (WALK1[1] - WALK1[0])));
    if (t >= WALK2[0]) z = lerp(Z1, Z2, ease((t - WALK2[0]) / (WALK2[1] - WALK2[0])));
    walking = Math.max(win(t, WALK1[0], WALK1[1] - 0.2, 0.3, 0.3), win(t, WALK2[0], WALK2[1] - 0.2, 0.3, 0.3));
  }
  const bob = walking * Math.sin(t * 13) * 0.06, sway = walking * Math.cos(t * 6.5) * 0.035;
  const x = CLEARING.x + 0.5 + sway, y = EYE + bob + 0.02 * Math.sin((t * 2 * Math.PI * 7) / END);   // a slow breath, whole cycles over the loop
  // look at the ridge; the long lens narrows the view onto the figure's face
  const [fx, fy, fz] = figTarget(), yaw = Math.atan2(-(fx - x), -(fz - z)), dist = Math.hypot(fx - x, fz - z), pitchTo = Math.atan2(fy - y, dist);
  const lens = reset ? 0 : Math.min(smooth(t, ...LENS), 1 - smooth(t, ...LENS_OUT));
  const look = 0.06 + 0.04 * Math.sin((t * 2 * Math.PI * 3) / END) * (1 - lens);                     // a slow look around
  return { x, y, z, yaw: lerp(yaw + look, yaw, lens), pitch: lerp(-0.035, pitchTo, lens), fov: Math.exp(lerp(Math.log(0.85), Math.log(0.26), lens)), bob, shake: 0 };
}
// the "Stop." jolt: a short decaying shake of the view (continuous, never a one-frame jump)
export function shake(t) { const u = t - EV.stop + 0.02; if (u < 0 || u > 0.8) return [0, 0]; const e = Math.exp(-u * 5) * smooth(u, 0, 0.06), w = Math.sin(u * 24); return [w * 4 * e, Math.cos(u * 19) * 2 * e]; }

// ---------------------------------------------------------------- the figure
export function figure(t) {
  t = wrap(t);
  const base = { x: RIDGE.x + 0.5, z: RIDGE.z + 0.5 };
  let alpha = Math.max(1 - smooth(t, EV.never, EV.never + 0.7), win(t, EV.stood - 0.3, EV.fog2 + 0.25, 0.6, 0.6), smooth(t, EV.whatever - 0.2, EV.fog3 + 0.2));
  let x = base.x, z = base.z, face = 0, walk = null;
  const run = [EV.ran - 0.05, EV.fog2End + 0.3];
  if (t > run[0] && t < 40) { const k = (t - run[0]) / (run[1] - run[0]); face = lerp(0, Math.PI, smooth(k, 0, 0.25)); z = base.z - 16 * Math.max(0, k - 0.12) ** 1.3; x = base.x - 3 * Math.max(0, k - 0.12); walk = t * 14; }
  return { x, y: groundY(x, z), z, face, walk, alpha };
}

// ---------------------------------------------------------------- iso cameras (the world seen from above)
export const CAM = {
  APPROACH: { x: -30, y: 44, z: -14, b: 4.5, ay: 400 },
  TUN: { x: TUNNEL.x0 + 1, y: TUNNEL.y0 + 2, z: TUNNEL.z + 1, b: 15, ay: 390 },
  PYR: { x: LAKE.x + 4, y: 32, z: LAKE.z - 2, b: 7, ay: 380 },
  DEAD: { x: DEAD.x, y: 45, z: DEAD.z, b: 9, ay: 380 },
  SIGNS: { x: 12, y: 40, z: -12, b: 3.6, ay: 430 },
  HOUSE: { x: (HOUSE.x0 + HOUSE.x1) / 2 + 1, y: 41, z: (HOUSE.z0 + HOUSE.z1) / 2 + 1, b: 15, ay: 420 },
  OVER: { x: -6, y: 40, z: -6, b: 2.6, ay: 470 }, OVER2: { x: 6, y: 40, z: 4, b: 2.5, ay: 470 },
};
export const KEYS = [
  [0, EV.stopEnd + 0.1, CAM.APPROACH], [EV.twobytwo - 0.45, EV.tunnels + 0.2, CAM.TUN], [EV.sand + 0.45, EV.leavesEnd, CAM.SIGNS],
  [EV.streamer + 0.5, EV.houseEnd + 0.1, CAM.HOUSE], [EV.dead, EV.joke, CAM.OVER], [EV.babyEnd, END, CAM.OVER2],
];
const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
function rawIso(t) {
  let i = 0; while (i < KEYS.length - 1 && KEYS[i + 1][0] <= t) i++;
  const [, a1, A] = KEYS[i]; if (t <= a1 || i === KEYS.length - 1) return { ...A };
  const [b0, , Bc] = KEYS[i + 1], k = ease((t - a1) / (b0 - a1)), d = dist3(A, Bc), need = Math.max(0, Math.log((d * Math.max(A.b, Bc.b)) / 900)), dip = Math.min(need, 1.5) * Math.sin(Math.PI * k);
  return { x: lerp(A.x, Bc.x, k), y: lerp(A.y, Bc.y, k), z: lerp(A.z, Bc.z, k), b: Math.exp(lerp(Math.log(A.b), Math.log(Bc.b), k) - dip), ay: lerp(A.ay, Bc.ay, k) };
}
const FR = Math.round(END * 30), ISOC = []; for (let f = 0; f < FR; f++) ISOC.push(rawIso(f / 30));
export function isoCam(t) {
  const f = Math.round(wrap(t) * 30) % FR, SMW = 6; let x = 0, y = 0, z = 0, lb = 0, ay = 0, w = 0;
  for (let k = -SMW; k <= SMW; k++) { const c = ISOC[Math.min(FR - 1, Math.max(0, f + k))], q = Math.exp(-(k * k) / (2 * (SMW / 2) ** 2)); x += c.x * q; y += c.y * q; z += c.z * q; lb += Math.log(c.b) * q; ay += c.ay * q; w += q; }
  return { x: x / w, y: y / w, z: z / w, b: Math.exp(lb / w), ay: ay / w };
}
// the house's camera-facing walls and roof (group 1): cut away on "staged", back while hidden behind the cards
export const houseWalls = (t) => Math.max(1 - smooth(t, EV.staged - 0.05, EV.staged + 0.6), smooth(t, EV.mojang, EV.mojang + 1.2));
