// «Infinite aura» · builder C — the pigeon flock. On "One hundred aura" seven pigeons fly in from both sides and hover
// around him (flapping all the time); on "watching you" every head swivels (some all the way round, owl style) and
// stares at him with big round eyes; on "One thousand" the eyes glow red; on "lasers" they fire red eye-lasers that
// sweep the sky and the cloud sea (sparks, smoke and a glowing scorch trail where a beam hits the sea). The flock
// moves out of the dinosaurs' way (10.3 s) and out of the UFO's way (22.3 s). Two big pigeons dash across in front
// (the drop; and "One million", where the time stop freezes one mid-dash). Everything runs on world time τ = X.T.
import { drawPigeon } from "./C-pigeon.mjs";
import { anchor, slide, heroHead, greyView, laserPair, rayEnd, sparkSpray, fade, mix, bayer, sm, lerp, clamp01, rnd, ease, easeOut, backOut, R, PI, GW } from "./C-kit.mjs";
import { EV, STOP } from "./timeline.mjs";

// ---------------------------------------------------------------- the flock: facing, slot keys [τ, ox, oy] (screen offsets from
// the camera centre at zoom 1.6), entry side, laser aim per phase [base, amp] (screen angle, y down).
const SEA_Y = 657;                                  // where a downward beam meets the cloud sea (screen)
const PB = EV.dinosaurs - 0.25, PC = EV.aliens - 0.45;   // phase B: clear the dinosaurs; phase C: clear the UFO + alien
export const FLOCK = [
  { f: -1, keys: [[0, -165, -92], [PB, -168, -96], [PC, -175, -100], [PC + 1.0, -215, 230]], aim: [[0, PI / 2 + 0.55, 0.32], [PB, PI + 0.25, 0.4], [PC, PI / 2 + 0.55, 0.3]] },
  { f: 1, keys: [[0, -112, -22], [PB, -118, -26], [PC, -118, -26], [PC + 1.1, 10, 215]], aim: [[0, PI / 2 + 0.5, 0.28], [PB, PI / 2 + 0.6, 0.3], [PC, PI / 2 + 0.25, 0.3]] },
  { f: -1, keys: [[0, -178, 48], [PB, -190, 20], [PC, -190, 20], [PC + 1.0, -340, 60]], aim: [[0, PI / 2 + 0.75, 0.3], [PB, PI + 0.1, 0.35], [PC, PI / 2 + 0.7, 0.25]] },
  { f: 1, keys: [[0, 112, -80], [EV.moon - 0.4, 100, -66], [PC, 100, -66]], aim: [[0, 0.15, 0.4], [PB, -0.12, 0.35], [PC, -0.1, 0.35]] },
  { f: -1, keys: [[0, 192, -18], [PB, 196, -14], [EV.moon - 0.4, 182, 6], [PC, 182, 6]], aim: [[0, 0.5, 0.35], [PB, 0.12, 0.35], [PC, 0.05, 0.3]] },
  { f: 1, keys: [[0, 122, 58], [PB, 212, -118], [EV.moon - 0.4, 222, -62], [PC, 222, -62]], aim: [[0, 1.05, 0.38], [PB, -0.35, 0.3], [PC, -0.3, 0.3]] },
  { f: -1, keys: [[0, 198, 122], [PB, -122, 98], [PC, 118, 40]], aim: [[0, 0.95, 0.35], [PB, PI / 2 + 0.45, 0.3], [PC, 0.25, 0.3]] },
];
const ARRIVE = EV.hundred, S0 = 1.55;
FLOCK.forEach((p, i) => {
  p.i = i; p.t0 = ARRIVE - 0.12 + [0.0, 0.1, 0.18, 0.05, 0.14, 0.22, 0.28][i]; p.dur = 0.95 + 0.12 * rnd(i * 7 + 3);
  p.hz = 4.4 + 0.7 * rnd(i * 5 + 1); p.ph = rnd(i * 11) * 2 * PI; p.sy0 = (rnd(i * 3 + 9) - 0.5) * 220;
  p.s = S0 * (0.92 + 0.16 * rnd(i * 13 + 5));
  p.turn = EV.watching - 0.12 + 0.07 * [3, 0, 5, 1, 4, 2, 6][i];           // head swivel to stare
  p.red = EV.thousand - 0.05 + 0.04 * i;                                     // eyes glow
  p.fire = EV.lasers - 0.02 + 0.035 * [0, 3, 1, 4, 2, 5, 6][i];               // first shot
});

// ---------------------------------------------------------------- per-pigeon state as a function of τ
const keyAt = (keys, T) => {
  let i = 0; while (i + 1 < keys.length && T >= keys[i + 1][0]) i++;
  const k = keys[i], n = keys[i + 1]; if (!n) return [k[1], k[2]];
  // hold, then fly to the next slot over the last 1.0 s before the key (keys mark when the move must be finished)
  const u = ease((T - (n[0] - 1.0)) / 1.0); return [lerp(k[1], n[1], u), lerp(k[2], n[2], u)];
};
const aimAt = (p, T) => {
  let i = 0; while (i + 1 < p.aim.length && T >= p.aim[i + 1][0] - 0.6) i++;
  const blendTo = (j) => { const [, b, a] = p.aim[j]; return [b, a]; };
  let [b, a] = blendTo(i);
  if (i > 0) { const u = ease((T - (p.aim[i][0] - 0.6)) / 0.6); const [b0, a0] = blendTo(i - 1); b = lerp(b0, b, u); a = lerp(a0, a, u); }
  const w = 1.25 + 0.7 * rnd(p.i * 3 + 1);
  return b + a * Math.sin(w * (T - EV.lasers) + p.i * 1.9) + 0.08 * Math.sin(3.7 * T + p.i);
};
/** Laser on/off: on from the first shot, short breaks (≈0.3 s) every 2.2–3.1 s; returns the times of the current burst. */
function burst(p, T) {
  if (T < p.fire) return null;
  const per = 2.2 + 0.9 * rnd(p.i * 17 + 2), off = 0.32, rel = T - p.fire, n = Math.floor(rel / per), st = p.fire + n * per;
  const on = n === 0 ? p.fire : st + off * (0.6 + 0.4 * rnd(n * 7 + p.i));
  const end = p.fire + (n + 1) * per;          // the beam detaches at the end of the cycle and the next one starts after a break
  return { on, end, prevEnd: n > 0 ? st : null };
}
const LV = 2600;                                // beam front speed (px/s)

function state(p, X, T) {
  const t1 = p.t0 + p.dur, u = (T - p.t0) / p.dur; if (u <= 0) return null;
  const [ox, oy] = keyAt(p.keys, T);
  const hov = [5 * Math.sin(1.25 * T + p.i * 2.1) + 3 * Math.sin(0.55 * T + p.i), 4 * Math.sin(2.05 * T + p.i * 1.3)];
  let [x, y] = anchor(X, ox + hov[0], oy + hov[1]);
  let flapHz = p.hz, tilt = 0;
  if (u < 1) {
    // fly in from off-screen on a swooping curve (enter from the side the bird faces away from)
    const sx = p.f > 0 ? -50 : GW + 50, sy = y + p.sy0, k = easeOut(u), cx = lerp(sx, x, 0.5), cy = Math.min(sy, y) - 70;
    const bx = (1 - k) * (1 - k) * sx + 2 * (1 - k) * k * cx + k * k * x, by = (1 - k) * (1 - k) * sy + 2 * (1 - k) * k * cy + k * k * y;
    x = bx; y = by; flapHz *= 1.35; tilt = -0.25 * (1 - k) * Math.sign(sy - y || 1);
  }
  return { x, y, ph: 2 * PI * flapHz * T + p.ph, tilt };
}

/** Head yaw / eye state at τ. */
function face(p, X, T, x, y) {
  const prof = p.f * PI / 2, [hx, hy] = heroHead(X);
  const toHero = Math.sign(hx - x) || 1, stareYaw = toHero * 0.42;
  const k = backOut((T - p.turn) / 0.32, 1.2);                       // swivel with a small overshoot
  let yaw = lerp(prof, stareYaw, k), stare = sm(T, p.turn + 0.05, p.turn + 0.3);
  const dx = hx - x, dy = hy - y, dl = Math.hypot(dx, dy) || 1;
  let look = [dx / dl, dy / dl];
  const red = sm(T, p.red, p.red + 0.3);
  // firing: the head turns toward the beam direction (3/4 view to the side it fires; front view when firing down)
  const fk = sm(T, p.fire - 0.35, p.fire - 0.05);
  let aim = null;
  if (fk > 0) {
    aim = aimAt(p, T); const cx = Math.cos(aim), cy = Math.sin(aim);
    const ay = Math.abs(cx) < 0.25 ? cx * 1.6 : Math.sign(cx) * (0.42 + 0.2 * Math.min(1, Math.abs(cx)));
    yaw = lerp(yaw, ay, fk); look = [lerp(look[0], cx, fk), lerp(look[1], cy, fk)];
  }
  return { yaw, stare, look, red, aim };
}

// ---------------------------------------------------------------- lasers and hits
function beamGeom(p, X, T, eyeMid) {
  const aim = aimAt(p, T), dx = Math.cos(aim), dy = Math.sin(aim), e = rayEnd(eyeMid[0], eyeMid[1], dx, dy, SEA_Y + 3 * Math.sin(eyeMid[0] * 0.05 + T));
  return { dx, dy, ...e };
}
/** Approximate eye midpoint of pigeon p at τ (for the spark emitter at past birth times; no drawing). */
function eyeMidAt(p, X, T) { const st = state(p, X, T); if (!st) return null; return [st.x + p.f * 11.5 * p.s, st.y - 11 * p.s]; }

function drawLaser(g, p, X, T, mid, gap) {
  const b = burst(p, T); if (!b) return null;
  const geo = beamGeom(p, X, T, mid);
  let s0 = 0, s1 = Math.min(geo.len, LV * (T - b.on));
  if (T >= b.end - 0.0001) return null;
  // the previous burst's detached tail still flying away
  if (b.prevEnd !== null && T - b.prevEnd < 0.4) { const d0 = LV * (T - b.prevEnd); if (d0 < geo.len) laserPair(g, [mid[0] + geo.dx * d0, mid[1] + geo.dy * d0], [geo.dx, geo.dy], geo.len - d0, gap, 0.8); }
  if (T < b.on) return null;
  const flick = 0.85 + 0.15 * Math.sin(T * 47 + p.i * 3);
  // the beam starts thin and fattens over 0.1 s, and thins out in the last 0.12 s before it detaches
  const w = Math.min(sm(T, b.on, b.on + 0.1), 1 - 0.6 * sm(T, b.end - 0.12, b.end)) * flick;
  laserPair(g, [mid[0] + geo.dx * s0, mid[1] + geo.dy * s0], [geo.dx, geo.dy], s1 - s0, gap, w);
  return { ...geo, reach: s1, w };
}
function muzzle(g, x, y, k, T, i, s = 1.5) {
  if (k <= 0) return; const r = (1.6 + 1.3 * k + 0.5 * Math.sin(T * 31 + i)) * s;
  for (let Y = R(y - r - 2); Y <= R(y + r + 2); Y++) for (let X = R(x - r - 2); X <= R(x + r + 2); X++) {
    const d = Math.hypot(X + 0.5 - x, Y + 0.5 - y); if (d > r + 2) continue;
    if (d < r * 0.55) g.px(X, Y, "#FFF4F4"); else if (d < r) g.px(X, Y, "#FF5A64"); else if (k * 0.6 > bayer(X, Y)) g.px(X, Y, "#C8102A");
  }
}
/** Sparks, smoke and the scorch trail where pigeon p's beam has been hitting the cloud sea. */
function hits(g, p, X, T) {
  const firstOn = p.fire; if (T < firstOn + 0.05) return;
  const hitAt = (tb) => {
    const b = burst(p, tb); if (!b || tb < b.on + 0.12 || tb > b.end - 0.02) return null;
    const m = eyeMidAt(p, X, tb); if (!m) return null;
    // the emitter must use the current camera (sparks live in screen space; the camera barely moves in 0.4 s)
    const geo = beamGeom(p, X, tb, m); return geo.hit && geo.x > -4 && geo.x < GW + 4 ? [geo.x, geo.y] : null;
  };
  // little smoke puffs rising from the hit (behind the sparks)
  for (let i = 0; i < 5; i++) {
    const per = 0.9, ph = rnd(p.i * 41 + i) * per, age = (T + ph) % per, tb = T - age, h = hitAt(tb); if (!h) continue;
    const k = age / per, x = h[0] + (rnd(Math.floor((T + ph) / per) * 5 + i) - 0.5) * 16, y = h[1] - 6 - 50 * easeOut(k), r = 3 + 7 * k;
    const f = fade(g, (1 - k) * 0.85);
    for (let Y = R(y - r); Y <= R(y + r); Y++) for (let X2 = R(x - r); X2 <= R(x + r); X2++) { const d = Math.hypot(X2 + 0.5 - x, Y + 0.5 - y); if (d <= r) f.px(X2, Y, d > r - 1.2 ? "#6A6088" : Y < y - r * 0.3 ? "#ECE6F6" : "#B8B0CC"); }
  }
  // scorch trail: recent hit points glow and cool down
  for (let k = 14; k >= 1; k--) {
    const tb = T - k * 0.03, h = hitAt(tb); if (!h) continue;
    const heat = 1 - k / 15, r = 2 + 4.5 * heat;
    for (let Y = R(h[1] - r); Y <= R(h[1] + r * 0.6); Y++) for (let X2 = R(h[0] - r * 1.7); X2 <= R(h[0] + r * 1.7); X2++) {
      const d = Math.hypot((X2 + 0.5 - h[0]) / 1.7, Y + 0.5 - h[1]); if (d > r || heat * (1 - d / r) * 1.6 <= bayer(X2, Y)) continue;
      g.px(X2, Y, heat > 0.7 && d < r * 0.5 ? "#FFF2C8" : heat > 0.4 ? "#FF9A3A" : "#C8243A");
    }
  }
  sparkSpray(g, T, hitAt, { n: 30, life: 0.5, speed: 190, grav: 420, seed: p.i * 7 + 3, spread: 1.05, big: 0.5 });
  // the impact flash right now: hot core + flickering star spikes
  const h0 = hitAt(T);
  if (h0) {
    const fl = 0.75 + 0.25 * Math.sin(T * 53 + p.i * 2), r = 7.5 * fl;
    for (let Y = R(h0[1] - r - 2); Y <= R(h0[1] + r + 2); Y++) for (let X2 = R(h0[0] - r * 1.5 - 2); X2 <= R(h0[0] + r * 1.5 + 2); X2++) {
      const d = Math.hypot((X2 + 0.5 - h0[0]) / 1.4, Y + 0.5 - h0[1]); if (d > r + 1.5) continue;
      g.px(X2, Y, d < r * 0.45 ? "#FFFFFF" : d < r * 0.8 ? "#FFE27A" : d < r ? "#FF8A2A" : "#E8162E");
    }
    for (let k = 0; k < 6; k++) { const a = (k / 6) * 2 * PI + T * 3 + p.i, len = (7 + 5 * ((k + Math.floor(T * 20)) % 2)) * fl; for (let j = Math.ceil(r); j < r + len; j++) { const x = R(h0[0] + Math.cos(a) * j * 1.3), y = R(h0[1] + Math.sin(a) * j * 0.8); if (1 - (j - r) / len > bayer(x, y) * 0.8) g.px(x, y, j < r + len * 0.5 ? "#FFE27A" : "#FF8A2A"); } }
  }
}

// ---------------------------------------------------------------- slots
function drawFlock(g, X) {
  const T = X.T;
  const list = FLOCK.map((p) => { const st = state(p, X, T); return st ? { p, st } : null; }).filter(Boolean);
  // back to front: higher pigeons first
  list.sort((a, b) => a.st.y - b.st.y);
  const beams = [];
  for (const { p, st } of list) {
    const fc = face(p, X, T, st.x, st.y);
    const an = drawPigeon(g, { x: st.x, y: st.y, f: p.f, s: p.s, ph: st.ph, yaw: fc.yaw, stare: fc.stare, red: fc.red, look: fc.look, T, tilt: st.tilt });
    beams.push({ p, an, fc });
  }
  // beams on top of the birds (they come out of the eyes), then hits
  for (const { p, an, fc } of beams) {
    if (T < p.fire - 0.4) continue;
    const mid = an.mid, gap = an.eyes.length > 1 ? Math.max(2, Math.abs((an.eyes[1][0] - an.eyes[0][0]) * Math.sin(fc.aim ?? 0)) + Math.abs((an.eyes[1][1] - an.eyes[0][1]) * Math.cos(fc.aim ?? 0))) : 0;
    // charge-up glow at the eyes before the first shot, then a muzzle flare while firing
    const charge = sm(T, p.fire - 0.35, p.fire) * (1 - sm(T, p.fire, p.fire + 0.25));
    const L = drawLaser(g, p, X, T, mid, gap);
    for (const e of an.eyes) muzzle(g, e[0], e[1], Math.max(charge * 1.2, L ? 0.8 * L.w : 0), T, p.i, p.s);
    hits(g, p, X, T);
  }
}

// front pigeons: [start τ, from x, to x, y offset (from camera centre), facing, scale, speed px/s]
const FRONT = [
  { t0: EV.ten + 0.06, x0: -70, vx: 760, oy: 178, f: 1, s: 2.0, aim: 0.42, i: 20 },
  { t0: EV.million + 0.2, x0: GW + 70, vx: -235, oy: 190, f: -1, s: 1.9, aim: PI - 0.55, i: 21 },
];
function drawFront(g, X) {
  const T = X.T;
  for (const q of FRONT) {
    const age = T - q.t0; if (age <= 0) continue;
    const [ax, ay] = anchor(X, 0, q.oy), [slx] = slide(X), x = q.x0 + q.vx * age + slx, y = ay + 6 * Math.sin(age * 5 + q.i) - 14 * Math.sin(Math.min(1, age * q.vx / 600) * PI) * (q.f > 0 ? 1 : 0.3);
    if (x < -90 || x > GW + 90) continue;
    const ph = 2 * PI * 6.2 * T + q.i, aim = q.aim + 0.18 * Math.sin(T * 2.4 + q.i);
    // speed streaks behind a fast dash
    if (Math.abs(q.vx) > 400) for (let k = 0; k < 5; k++) { const yy = R(y - 14 + k * 7), x1 = R(x - q.f * (26 + 8 * k)), x2 = R(x1 - q.f * (30 + 14 * rnd(k + q.i))); for (let X2 = Math.min(x1, x2); X2 <= Math.max(x1, x2); X2++) if ((X2 + yy) % 2 === 0) g.px(X2, yy, "#E8ECFF"); }
    const yaw = Math.sign(Math.cos(aim)) * 0.5, look = [Math.cos(aim), Math.sin(aim)];
    const an = drawPigeon(g, { x, y, f: q.f, s: q.s, ph, yaw, stare: 1, red: 1, look, T, tilt: q.f > 0 ? -0.08 : 0.05 });
    const geo = rayEnd(an.mid[0], an.mid[1], Math.cos(aim), Math.sin(aim), SEA_Y + 30), gap = an.eyes.length > 1 ? 3 : 0;
    const len = Math.min(geo.len, 2600 * Math.max(0, age - 0.12));
    laserPair(g, an.mid, [Math.cos(aim), Math.sin(aim)], len, gap, 0.95, 3.0);
    for (const e of an.eyes) muzzle(g, e[0], e[1], 1, T, q.i, q.s);
  }
}

const vis = (X) => 1 - X.space;
export function near(c, X) { const a = vis(X); if (a <= 0 || X.T < ARRIVE - 0.2) return; drawFlock(fade(c, a), X); }
export function front(c, X) { const a = vis(X); if (a <= 0) return; drawFront(fade(greyView(c, X), a), X); }

// ---------------------------------------------------------------- sound
export const MOTIONS = [
  { t0: ARRIVE - 0.1, t1: ARRIVE + 1.1, kind: "whoosh", level: 0.6, note: "flock of pigeons flies in from both sides (wing flutter)" },
  { t0: ARRIVE + 1.0, t1: ARRIVE + 1.4, kind: "coo", level: 0.5, note: "a coo as the flock settles around him" },
  { t0: EV.watching - 0.12, t1: EV.watching + 0.4, kind: "blip", level: 0.45, note: "all heads swivel and stare (some all the way round)" },
  { t0: EV.thousand - 0.05, t1: EV.thousand + 0.35, kind: "blip", level: 0.55, note: "eyes light up red" },
  { t0: EV.lasers - 0.37, t1: EV.lasers, kind: "laser", level: 0.6, note: "laser charge-up at the eyes" },
  { t0: EV.lasers, t1: EV.lasers + 0.5, kind: "laser", level: 0.95, note: "first volley of eye-lasers; sparks on the cloud sea" },
  { t0: EV.lasers + 0.5, t1: STOP.a, kind: "laser", level: 0.3, note: "lasers keep sweeping (beams break and refire every 2–3 s)" },
  { t0: FRONT[0].t0, t1: FRONT[0].t0 + 0.85, kind: "whoosh", level: 0.7, note: "a big pigeon dashes across in front, lasers on" },
  { t0: FRONT[1].t0, t1: STOP.a, kind: "whoosh", level: 0.4, note: "a second big pigeon crosses in front; frozen mid-dash by the time stop" },
];
