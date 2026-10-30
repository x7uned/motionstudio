// STREET traffic for «Fake buttons»: cars on the two lanes behind the hero obey the car signal (red while WALK is on,
// computed from walkAt by street-time.mjs) — a small deterministic simulation (IDM car-following + stop line), run once at
// load for the whole film and interpolated per frame; pedestrians: a few far-sidewalk walkers and the scripted crossers
// who wait at the corner and cross on WALK (front view toward us, back view away from us; view changes crossfade).
// The avenue's near lane (bottom, parallax 1.15) gets a car now and then. Everything is a pure function of t.
import { HERO_X, BLD } from "../timeline.mjs";
import { R, clamp01, rnd, mix, bayer, tintRect, fade } from "./street-kit.mjs";
import { carSprite, personSprite, personFront, drawSprite, CAR_DIM, PHASES } from "./street-sprites.mjs";
import { LANE, STOP, FAR_WALK, KERB, FORE_P, X_MIN } from "./street-art.mjs";
import { EV, END, sm, ease, carLightAt, WALK_ON } from "./street-time.mjs";

const FPS = 30, T0 = -10, NF = Math.ceil((END + 1 - T0) * FPS) + 1;

// ---------------------------------------------------------------- schedule: [lane, spawn t, kind, colour, desired speed px/s]
const SCHED = [
  ["near", -9.5, "sedan", "navy", 118], ["near", -6.5, "taxi", "taxi", 130], ["near", -3.6, "hatch", "teal", 112], ["near", -1.2, "taxi", "taxi", 126],
  ["near", 1.6, "van", "white", 104], ["near", 3.4, "sedan", "maroon", 120], ["near", 5.0, "taxi", "taxi", 128], ["near", 9.2, "sedan", "silver", 118],
  ["near", 11.6, "taxi", "taxi", 126], ["near", 14.0, "hatch", "orange", 112], ["near", 30, "sedan", "black", 120], ["near", 32.6, "taxi", "taxi", 128],
  ["near", 35.0, "hatch", "teal", 112], ["near", 37.6, "taxi", "taxi", 124], ["near", 40.4, "van", "white", 102], ["near", 43.0, "sedan", "navy", 118],
  ["near", 45.4, "taxi", "taxi", 130], ["near", 47.6, "sedan", "maroon", 118], ["near", 50.5, "taxi", "taxi", 124],
  ["far", -8.4, "taxi", "taxi", 124], ["far", -5.2, "sedan", "silver", 116], ["far", -2.0, "taxi", "taxi", 128], ["far", 0.9, "hatch", "blue", 110],
  ["far", 2.9, "taxi", "taxi", 126], ["far", 4.3, "sedan", "black", 118], ["far", 5.4, "taxi", "taxi", 120], ["far", 10.4, "sedan", "maroon", 118],
  ["far", 12.8, "taxi", "taxi", 126], ["far", 31, "bus", "blue", 96], ["far", 34.6, "taxi", "taxi", 126], ["far", 37.2, "sedan", "navy", 116],
  ["far", 39.8, "taxi", "taxi", 128], ["far", 42.6, "hatch", "orange", 110], ["far", 44.8, "taxi", "taxi", 124], ["far", 46.4, "sedan", "white", 118],
  ["far", 48.4, "taxi", "taxi", 122],
];
// lanes in "s" = distance along the lane's direction (s = x_front for the near lane → right, s = −x_front for the far lane ← left)
const LANES = {
  near: { dir: 1, y: LANE.near, start: X_MIN - 160, stop: STOP.near, gone: (s, len) => s - len > BLD.x0 + 40 },
  far: { dir: -1, y: LANE.far, start: -(BLD.x0 + 70), stop: -STOP.far, gone: (s, len) => s - len > -(X_MIN - 140) },
};
const IDM = { a: 150, b: 190, T: 0.55, s0: 9 };

export const CARS = (() => {
  const cars = SCHED.map(([lane, ts, kind, col, v0], i) => ({ id: i, lane, ts, kind, col, v0, len: CAR_DIM[kind].w, f0: -1, s: new Float32Array(NF), v: new Float32Array(NF), brake: new Float32Array(NF), alive: false, done: false, committed: false, sNow: 0, vNow: 0, brakeS: 0 }));
  const dt = 1 / FPS;
  for (let f = 0; f < NF; f++) {
    const t = T0 + f / FPS, light = carLightAt(t);
    for (const ln of Object.keys(LANES)) {
      const L = LANES[ln], list = cars.filter((c) => c.lane === ln && c.alive && !c.done).sort((a, b) => b.sNow - a.sNow);
      // spawn when there is room at the start
      for (const c of cars) if (c.lane === ln && !c.alive && !c.done && t >= c.ts) {
        const last = list[list.length - 1];
        if (!last || last.sNow - last.len - L.start > 26) { c.alive = true; c.f0 = f; c.sNow = L.start; c.vNow = c.v0 * 0.9; list.push(c); }
        break;
      }
      for (let k = 0; k < list.length; k++) {
        const c = list[k], lead = list[k - 1];
        let gap = Infinity, dv = 0;
        if (lead) { gap = lead.sNow - lead.len - c.sNow; dv = c.vNow - lead.vNow; }
        // the stop line acts like a stopped car while the light is yellow/red (yellow: only if it can stop comfortably)
        const toStop = L.stop - c.sNow;
        if (light === 0) c.committed = false;
        if (light > 0 && toStop > -2 && !c.committed) {
          const canStop = toStop >= (c.vNow * c.vNow) / (2 * 260) - 2;
          if (light === 2 || canStop) { if (toStop + IDM.s0 < gap) { gap = toStop + IDM.s0; dv = c.vNow; } }
          else c.committed = true;
        }
        const sStar = IDM.s0 + Math.max(0, c.vNow * IDM.T + (c.vNow * dv) / (2 * Math.sqrt(IDM.a * IDM.b)));
        let acc = IDM.a * (1 - Math.pow(c.vNow / c.v0, 4) - (gap === Infinity ? 0 : Math.pow(sStar / Math.max(0.5, gap), 2)));
        acc = Math.max(-420, acc);
        c.vNow = Math.max(0, c.vNow + acc * dt); c.sNow += c.vNow * dt;
        const bt = acc < -25 || (c.vNow < 4 && light > 0) ? 1 : 0; c.brakeS += (bt - c.brakeS) * Math.min(1, dt / 0.12); c.brakeNow = c.brakeS;   // brake lights ramp, never pop
      }
    }
    for (const c of cars) {
      if (c.alive && !c.done) { c.s[f] = c.sNow; c.v[f] = c.vNow; c.brake[f] = c.brakeNow ?? 0; if (LANES[c.lane].gone(c.sNow, c.len)) { c.done = true; c.f1 = f; } }
    }
  }
  for (const c of cars) if (c.f0 >= 0 && c.f1 === undefined) c.f1 = NF - 1;
  return cars;
})();
/** State of a car at time t: { x (centre), y (ground), dist, brake } or null. */
export function carAt(c, t) {
  const f = (t - T0) * FPS, i = Math.floor(f), k = f - i; if (c.f0 < 0 || i < c.f0 || i >= c.f1) return null;
  const s = c.s[i] + (c.s[Math.min(c.f1, i + 1)] - c.s[i]) * k, L = LANES[c.lane], xf = L.dir > 0 ? s : -s;
  return { x: xf - (L.dir * c.len) / 2, y: L.y, dist: s, dir: L.dir, brake: c.brake[i], v: c.v[i] };
}

// ---------------------------------------------------------------- drawing cars
function soft(c, x, y, rx, ry, k, col = "#1A0A22") { if (k <= 0.01) return; tintRect(c, R(x - rx - 1), R(y - ry - 1), R(rx * 2 + 2), R(ry * 2 + 2), (X, Y) => { const q = ((X - x) / rx) ** 2 + ((Y - y) / ry) ** 2; return q >= 1 ? 0 : k * (1 - q); }, col, 3); }
export function drawCar(c, V, c0, st, clipX) {
  const D = CAR_DIM[c0.kind], s = carSprite(c0.kind, c0.col, st.dir), X = R(V.X(st.x)), Y = R(V.Y(st.y));
  if (X + D.w / 2 + 30 < 0 || X - D.w / 2 - 30 > Math.min(c.w, clipX)) return;
  soft(c, X, Y + 1, D.w * 0.5, 3, 0.5);
  drawSprite(c, s, X, Y, { x1: clipX });
  // wheels turn: two dark spokes rotate with the distance driven
  for (const wx of D.wheels) {
    const cx = st.dir > 0 ? X + wx - R(D.w / 2) : X - wx + R(D.w / 2), cy = Y - D.r, a = st.dist / D.r, rr = Math.max(1, D.r - 2);
    for (const q of [0, Math.PI]) { const px = R(cx + Math.cos(a + q) * rr), py = R(cy + Math.sin(a + q) * rr); if (px < clipX) c.px(px, py, "#5E5A76"); }
  }
  // brake lights glow red while slowing / stopped at the red light
  if (st.brake > 0.02) { const tx = R(X + (D.tail[0] - D.w / 2) * st.dir), ty = R(Y - (D.h - 1 - D.tail[1])); if (tx < clipX) tintRect(c, tx - 6, ty - 4, 12, 9, (Xx, Yy) => { const q = Math.hypot(Xx - tx, (Yy - ty) * 1.4) / 6; return q >= 1 || Xx >= clipX ? 0 : 0.6 * st.brake * (1 - q); }, "#FF3A4A", 3); }
}

// ---------------------------------------------------------------- the avenue's near lane (bottom): a car now and then
export const FORE_CARS = [
  { t: EV.y2004 + 0.2, kind: "taxi", col: "taxi", dir: 1, v: 520 },
  { t: EV.n3250 + 0.1, kind: "sedan", col: "silver", dir: -1, v: 480 },
  { t: EV.why + 0.6, kind: "taxi", col: "taxi", dir: -1, v: 500 },
  { t: EV.follow + 0.2, kind: "hatch", col: "teal", dir: 1, v: 470 },
];
const FORE_SCALE = 2, FORE_Y = KERB + 122;                   // ground line of the near lane (world y, below the frame edge: only a slice shows)
/** Time window during which the fore car crosses the screen at the corner (for the sound list). */
export function foreWindow(fc) { const half = (CAR_DIM[fc.kind].w * FORE_SCALE) / 2 + 20, span = (540 + 2 * half) / fc.v; return [fc.t - span / 2, fc.t + span / 2]; }
export function drawForeCars(c, V, t, clipX) {
  for (const fc of FORE_CARS) {
    const [a, b] = foreWindow(fc); if (t < a || t > b) continue;
    // screen x: crosses the frame centre at fc.t; parallax 1.15 relative to the corner cam
    const X = 270 + fc.dir * fc.v * (t - fc.t) - (V.cx + 300) * (FORE_P - 1), Y = V.Y(FORE_Y);
    const s = carSprite(fc.kind, fc.col, fc.dir);
    drawSprite(c, s, X, Y, { scale: FORE_SCALE, x1: clipX });
  }
}

// ---------------------------------------------------------------- pedestrians
const FAR_Y = FAR_WALK[0] + 6;                                 // far-sidewalk walkers stand here (world y −86)
export const scaleAt = (y) => Math.round((0.8 + 0.4 * clamp01((y - FAR_Y) / (-10 - FAR_Y))) * 20) / 20;
const WALKERS = [   // [kind, x at t0, t0, speed px/s] on the far sidewalk (side view)
  ["jogger", -40, 0.0, -62], ["suit", -700, 2.2, 30], ["kid", -60, 7.0, -28], ["lady", -720, 36.0, 26], ["jogger", -60, 41.0, -60], ["suit", -60, 49.6, -30],
];
// crossers: keys [t, x, y, view] — view "r"/"l" side-walk, "f" front (toward us), "b" back (away); position eases linearly between keys
const ZEB = -500;
export const CROSSERS = [
  { kind: "tote", keys: [[-1, -540, FAR_Y, "f"], [WALK_ON[0][0] + 0.15, -540, FAR_Y, "f"], [WALK_ON[0][0] + 2.0, -540, -8, "f"], [WALK_ON[0][0] + 2.22, -546, -8, "l"], [WALK_ON[0][0] + 4.2, -640, -8, "l"]] },
  { kind: "cap", keys: [[-1, -462, -10, "b"], [WALK_ON[0][0] + 0.3, -462, -10, "b"], [WALK_ON[0][0] + 2.1, -462, FAR_Y, "b"], [WALK_ON[0][0] + 2.3, -456, FAR_Y, "r"], [WALK_ON[0][0] + 3.9, -404, FAR_Y, "r"], [WALK_ON[0][0] + 4.5, -404, FAR_Y, "r", "in"]] },
  { kind: "lady", keys: [[35, -530, FAR_Y, "f"], [WALK_ON[1][0] + 0.2, -530, FAR_Y, "f"], [WALK_ON[1][0] + 2.3, -530, -8, "f"], [WALK_ON[1][0] + 2.5, -536, -8, "l"], [WALK_ON[1][0] + 4.6, -640, -8, "l"]] },
  { kind: "phones", keys: [[EV.button3 - 2.2, -640, -10, "r"], [EV.button3 + 0.6, -470, -10, "r"], [EV.button3 + 0.8, -470, -10, "b"], [WALK_ON[1][0] + 0.35, -470, -10, "b"], [WALK_ON[1][0] + 2.3, -470, FAR_Y, "b"], [WALK_ON[1][0] + 2.5, -476, FAR_Y, "l"], [WALK_ON[1][0] + 5.5, -640, FAR_Y, "l"]] },
  { kind: "suit", keys: [[EV.send - 5.0, -60, FAR_Y, "l"], [EV.send + 1.4, -440, FAR_Y, "l"], [EV.send + 1.6, -444, FAR_Y, "f"], [EV.send + 3.8, -444, -8, "f"], [EV.send + 4.0, -450, -8, "l"], [END + 2, -640, -8, "l"]] },
];
/** Crosser state at t: position, view, previous view (for the crossfade), walk distance, existence. */
function crosserAt(P, t) {
  const K = P.keys; if (t < K[0][0] || t > K[K.length - 1][0]) return null;
  let i = 0; while (i < K.length - 2 && K[i + 1][0] <= t) i++;
  const [ta, xa, ya, va] = K[i], [tb, xb, yb, vb, flag] = K[i + 1], u = clamp01((t - ta) / (tb - ta || 1));
  const x = xa + (xb - xa) * u, y = ya + (yb - ya) * u, moving = Math.hypot(xb - xa, yb - ya) > 0.5;
  // distance walked so far (for the leg phase)
  let dist = 0; for (let j = 0; j < i; j++) dist += Math.hypot(K[j + 1][1] - K[j][1], K[j + 1][2] - K[j][2]); dist += Math.hypot(x - xa, y - ya);
  const view = vb, prev = va, k = va === vb ? 1 : clamp01((t - ta) / 0.2);
  const ex = flag === "in" ? 1 - sm(t, ta + 0.05, tb) : 1;       // walks into the deli door (dissolves)
  return { x, y, view, prev, k, dist, moving: moving || false, ex };
}
function sprFor(kind, view, s, dist, moving) {
  const ph = moving ? Math.floor((((dist / (view === "f" || view === "b" ? 16 * s : 13 * s)) % 1) + 1) % 1 * PHASES) % PHASES : 0;
  if (view === "f" || view === "b") return { sp: personFront(kind, s, ph, view === "b"), flip: false };
  return { sp: personSprite(kind, s, ph), flip: view === "l" };
}
function drawPersonAt(c, V, kind, x, y, view, prev, k, dist, moving, ex, clipX) {
  const s = scaleAt(y), X = R(V.X(x)), Y = R(V.Y(y)); if (X < -40 || X > clipX + 40) return;
  soft(c, X, Y + 1, 8 * s, 2, 0.4 * ex);
  const B = sprFor(kind, view, s, dist, moving);
  if (k >= 1) { drawSprite(c, B.sp, X, Y, { flip: B.flip, a: ex, x1: clipX }); return; }
  const A = sprFor(kind, prev, s, dist, false);
  // crossfade: the new view dithers in while the old one dithers out (same pixels never doubled)
  drawSprite(c, A.sp, X, Y, { flip: A.flip, a: (1 - k) * ex, x1: clipX });
  drawSprite(c, B.sp, X, Y, { flip: B.flip, a: k * ex, x1: clipX, inv: false });
}
/** All road-depth actors sorted by depth: far walkers, far-lane cars, crossers, near-lane cars. */
export function drawRoad(c, V, t, clipX) {
  const items = [];
  for (const [kind, x0, t0, v] of WALKERS) { const x = x0 + v * (t - t0); if (t < t0 || x < X_MIN - 40 || x > BLD.x0 + 30) continue; items.push({ y: FAR_Y, draw: () => drawPersonAt(c, V, kind, x, FAR_Y, v < 0 ? "l" : "r", v < 0 ? "l" : "r", 1, Math.abs(x - x0), true, 1, clipX) }); }
  for (const car of CARS) { const st = carAt(car, t); if (st) items.push({ y: st.y, draw: () => drawCar(c, V, car, st, clipX) }); }
  for (const P of CROSSERS) { const st = crosserAt(P, t); if (st) items.push({ y: st.y, draw: () => drawPersonAt(c, V, P.kind, st.x, st.y, st.view, st.prev, st.k, st.dist, st.moving, st.ex, clipX) }); }
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
}
/** Crossers' windows for the sound list. */
export function crosserSteps() { return CROSSERS.map((P) => { const K = P.keys; let a = null, b = null; for (let i = 0; i < K.length - 1; i++) if (Math.abs(K[i + 1][2] - K[i][2]) > 20) { a = K[i][0]; b = K[i + 1][0]; } return [a, b, P.kind]; }); }
export { soft };
