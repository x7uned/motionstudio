// «Infinite aura» · builder X · meteors (2026-10-25). From "Meteors start falling" (13.10) flaming meteors streak across
// the sky top-right → bottom-left, more and more until the time stop, where they hang frozen mid-air (world time X.T).
// Far meteors fly in the sky slot (behind clouds, islands, the stairs) and dive behind the distant cloud billows, where
// their impact burst rises; bigger near ones fly in the near slot (in front of the stairs, behind him and the pigeons) and
// smash into the near billows at the bottom (their bursts are drawn in the sea slot). The sea slot also
// draws explosions.mjs's near-sea and island blasts (seaBack) so the dinosaurs, drawn after it, stay in front.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { meteor, boom, MDIR, seaX, seaY, sprayRamp, prof } from "./X-fx.mjs";
import { seaBack, FREEZE_T } from "./explosions.mjs";
import { rnd, clamp01, sm, GW } from "./layout.mjs";
import { EV, STOP } from "./timeline.mjs";

const R = Math.round, [VX, VY] = MDIR, MOON = { x: 407, y: 235, r: 56 }, HEAD = { x: 255, y: 300 };
const darkOf = (X) => clamp01(X.L / 6) * 0.9;

// ---------------------------------------------------------------- schedule. Each meteor: impact τ ti at screen x on its row
// (j 0 = far row, behind the billows; j 3 = near bottom row), radius r (px), speed v (px/s). The head flies along MDIR.
const ROW_Y = [662, 850];                                   // nominal impact heights (the live row heights are used to draw)
const lineDist = (x, j, px, py) => Math.abs((px - x) * VY - (py - ROW_Y[j ? 1 : 0]) * VX);
export const METEORS = (() => {
  const M = [];
  const add = (tl, x, j, r, v) => {      // tl: τ when the head enters the screen; it lands at ti
    const y = ROW_Y[j ? 1 : 0], W = r * 2.6 + 8, dy = (y + W) / VY, dx = (GW + W - x) / -VX;   // back along the path to the screen edge
    M.push({ tl, ti: tl + Math.max(0, Math.min(dy, dx)) / v, x, j, r, v, seed: 300 + M.length * 11 });
  };
  // the first ones on "Meteors start falling", hand placed to read: impacts on both sides of the stairs
  add(EV.meteors + 0.3, 150, 0, 7, 620);
  add(EV.falling - 0.1, 330, 0, 5.5, 640);
  add(EV.falling + 0.3, 300, 3, 9, 700);
  // then more and more
  let t = EV.falling + 0.15, k = 0;
  while (t < FREEZE_T) {
    const rate = 1.6 + 5.6 * sm(t, 14.6, EV.million), s = k * 31 + 7, near = rnd(s) < 0.22 + 0.16 * sm(t, 16, 24);
    let x = 0, ok = false, r = 0;
    for (let tr = 0; tr < 20 && !ok; tr++) {
      const q = s + tr * 5; x = near ? R(-200 + 295 * rnd(q + 1)) : R(-250 + 830 * rnd(q + 1)); r = near ? 5 + 4 * rnd(q + 2) : 3 + 4.2 * Math.pow(rnd(q + 3), 1.4);
      const j = near ? 3 : 0;
      ok = lineDist(x, j, HEAD.x, HEAD.y) > (near ? 30 + r : 46 + r * 2)                  // not right behind his head
        && !(t > EV.moon - 1.5 && lineDist(x, j, MOON.x, MOON.y) < MOON.r + r * 2 + 10)    // not across the moon's face
        && !(near && x + 203 > 296);                                                     // near ones stay clear of the T-rex head
    }
    if (ok) add(t, x, near ? 3 : 0, r, near ? 700 + 120 * rnd(s + 9) : 520 + 300 * rnd(s + 9));
    t += (0.5 + rnd(s + 4)) / rate; k++;
  }
  return M;
})();

// Front meteors (near slot: in front of the stairs, behind him and the pigeons): big ones that pass close to the camera
// through the free sky and leave the frame. (ex, ey): where the head enters at τ tl.
export const FRONT = [
  { tl: EV.meteors, ex: 252, ey: -26, r: 12, v: 520, seed: 901 },
  { tl: EV.fifty + 0.1, ex: 236, ey: -26, r: 10, v: 560, seed: 907 },
  { tl: 25.05, ex: 280, ey: -26, r: 11, v: 520, seed: 913 },        // these two hang frozen at the time stop:
  { tl: 25.555, ex: 562, ey: 299, r: 10, v: 520, seed: 919 },       //   top left of him, and right of him under the moon
];
// ---------------------------------------------------------------- drawing
function flying(c, X, near) {
  const T = X.T;
  for (const m of METEORS) {
    if ((m.j === 3) !== near || T < m.tl) continue;
    const L = m.r * 11 + 10, after = (T - m.ti) * m.v; if (after > L + 20) continue;   // the tail has slid under the billows
    const iy = m.j ? seaY(3, X) + 6 : seaY(0, X) + 8, ix = m.x, d = (m.ti - T) * m.v, hx = ix - VX * d, hy = iy - VY * d;
    const a = sm(T, m.tl, m.tl + 0.12);
    meteor(c, hx, hy, m.r, T, m.seed, a, near ? iy : 1e9);
  }
}
function impacts(c, X, near) {
  const T = X.T, spray = sprayRamp(darkOf(X));
  for (const m of METEORS) {
    if ((m.j === 3) !== near) continue;
    const S = R(m.r * (near ? 7 : 6.5)), life = 0.8 + S / 60, a = T - m.ti; if (a <= 0 || a >= life) continue;
    const x = seaX(m.x, m.j, m.ti, X), y = near ? seaY(3, X) + 8 : seaY(0, X) + 6;
    boom(c, { x, y, a, S, seed: m.seed, kind: "sea", life, spray, star: S >= 40 });
  }
}
function front(c, X) {
  const T = X.T;
  for (const m of FRONT) {
    if (T < m.tl) continue;
    const d = (T - m.tl) * m.v, hx = m.ex + VX * d, hy = m.ey + VY * d, L = m.r * 15;
    if (hx < -L || hy > 960 + L) continue;
    meteor(c, hx, hy, m.r, T, m.seed, sm(T, m.tl, m.tl + 0.1));
  }
}
export const sky = prof("meteors.sky", (c, X) => { if (X.T < EV.meteors - 0.1) return; flying(c, X, false); impacts(c, X, false); });
export const sea = prof("meteors.sea", (c, X) => { if (X.T < EV.meteors - 0.1) return; seaBack(c, X); impacts(c, X, true); });
export const near = prof("meteors.near", (c, X) => { if (X.T < EV.meteors - 0.1 || X.space >= 1) return; const g = fade(c, 1 - X.space); flying(g, X, true); front(g, X); });

// ---------------------------------------------------------------- sound: whooshes of the big ones, their impacts
export const MOTIONS = [...FRONT.filter((m) => m.tl < STOP.a).map((m) => ({ t0: m.tl, t1: +Math.min(STOP.a, m.tl + 1.1).toFixed(3), kind: "meteor", level: 1, note: "big meteor passing close to the camera" })), ...METEORS.filter((m) => m.r >= 6.5 && m.tl < STOP.a).flatMap((m) => {
  const out = [{ t0: +m.tl.toFixed(3), t1: +Math.min(STOP.a, m.ti).toFixed(3), kind: "meteor", level: +(m.r / 10).toFixed(2), note: `meteor r${m.r.toFixed(1)} ${m.j ? "near" : "far"}` }];
  if (m.ti < STOP.a) out.push({ t0: +m.ti.toFixed(3), t1: +Math.min(STOP.a, m.ti + 0.6).toFixed(3), kind: "boom", level: +(m.r / 14).toFixed(2), note: "meteor impact" });
  return out;
})].sort((a, b) => a.t0 - b.t0);
