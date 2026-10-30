// «Infinite aura» · builder X · explosions (2026-10-25). On "Everything explodes" (15.66–16.6) a chain of big pixel
// explosions goes off everywhere — up the staircase behind him, in the air around him, far off in the sky, on the distant
// and the near cloud sea, on the floating island — then more keep popping until the time stop, where they freeze
// mid-blast (everything runs on world time X.T). "You don't even look." (17.06–17.82): a huge one goes off right behind
// him (the cool-guy shot). Slots: sky (distant air bursts; blasts on the far sea row, whose billows hide their base),
// near (blasts on his plane, world-anchored: in front of the stairs and mid clouds, behind him and the pigeons) and
// seaBack(c, X) — the near-sea and island blasts, drawn from meteors.mjs's sea slot so the dinosaurs stay in front.
import { fade } from "../../../../renderer/pixel/raster.mjs";
import { boom, seaX, seaY, island, sprayRamp, prof, camAt, toWorld } from "./X-fx.mjs";
import { rnd, clamp01, sm } from "./layout.mjs";
import { EV, STOP, stairQ } from "./timeline.mjs";

const R = Math.round;
const MOON = { x: 407, y: 235, r: 60 };               // the moon (render.mjs drawSunMoon: r 44, static to ±2 px) + room for its face
const REX = { x0: 300, x1: 540, y0: 470, y1: 660 };   // the T-rex head (dinos.mjs, bottom right) — keep it readable
export const FREEZE_T = 25.832;                       // τ at the freeze (tau(t) for t in 26 … 27.6)

// ---------------------------------------------------------------- schedule (τ seconds). kinds:
// air   — sky slot, screen-fixed distant burst      far — sky slot, sits on sea row 0 (behind its billows)
// near  — sea row 3 (bottom), via seaBack           isle — on island x (y = x offset), via seaBack
// plane — near slot, a world point on his plane (x, y given in screen px at t0, converted with the replicated camera)
export const BLASTS = (() => {
  const B = [];
  const add = (t0, kind, x, y, S, life) => {
    const b = { t0, kind, x, y, S, life: life ?? 0.7 + S / 90, seed: 100 + B.length * 7 };
    if (kind === "plane") { [b.wx, b.wy] = toWorld(t0, x, y); b.z0 = camAt(t0).z; }
    B.push(b);
  };
  const stair = (t0, k, S, life) => { const q = stairQ(t0) - k, c = camAt(t0); add(t0, "plane", c.sx + ((q + 0.5) * 34.1 - c.cx) * c.z, c.sy + (-q * 15.5 + 4 - c.cy) * c.z, S, life); };
  // the chain on "Everything explodes": up the stairs behind him, the air around him, the far sky, the sea, the island
  const e = EV.everything;
  add(e + 0.02, "air", 452, 92, 46);
  stair(e + 0.06, 4.6, 50);
  add(e + 0.12, "plane", 92, 330, 58);
  add(e + 0.17, "far", 64, 0, 56);
  stair(e + 0.22, 3.6, 54);
  add(e + 0.27, "near", 430, 0, 74);
  add(e + 0.31, "plane", 432, 352, 54);
  add(e + 0.36, "isle", 1, -12, 44);
  stair(EV.explodes, 2.6, 64);
  add(EV.explodes + 0.02, "far", 352, 0, 78);
  add(EV.explodes + 0.08, "plane", 62, 196, 50);
  add(EV.explodes + 0.13, "near", 112, 0, 78);
  add(EV.explodes + 0.19, "plane", 486, 132, 48);
  add(EV.explodes + 0.26, "air", 296, 58, 40);
  add(EV.explodes + 0.33, "isle", 1, 20, 40);
  add(EV.explodes + 0.4, "far", 498, 0, 60);
  add(EV.explodes + 0.47, "air", 60, 76, 40);
  // "You don't even look": the cool-guy blast behind him, then a second one further back
  add(EV.dont1 - 0.06, "plane", 150, 400, 112, 2.2);
  add(EV.look - 0.08, "plane", 50, 470, 64, 1.7);
  // then more and more until the time stop (plane bursts in the free air around him, distant ones, the sea, the island)
  let t = EV.lookEnd + 0.1, k = 0;
  while (t < FREEZE_T - 0.45) {
    const rate = 1.4 + 2.4 * sm(t, 17.8, EV.million), u = rnd(k * 13 + 5);
    const kind = u < 0.3 ? "plane" : u < 0.55 ? "air" : u < 0.78 ? "far" : u < 0.93 ? "near" : "isle";
    let x = 0, y = 0, S = 0, ok = false;
    for (let tr = 0; tr < 24 && !ok; tr++) {
      const s = k * 97 + tr * 7, ufo = t > EV.aliens - 0.6;
      S = R(24 + 26 * rnd(s + 1) + 12 * sm(t, 21, EV.million));
      if (kind === "plane" || kind === "air") {
        const left = !ufo && rnd(s + 2) < 0.5, top = kind === "air" && rnd(s + 3) < 0.5;
        if (top) { x = R(30 + 480 * rnd(s + 4)); y = R(36 + 80 * rnd(s + 5)); }
        else if (left) { x = R(30 + 150 * rnd(s + 4)); y = R(270 + 170 * rnd(s + 5)); }
        else { x = R(340 + 170 * rnd(s + 4)); y = R(290 + 150 * rnd(s + 5)); }
        if (kind === "plane") S = R(S * 1.15);
        ok = !(t > EV.moon - 0.8 && Math.hypot(x - MOON.x, y - MOON.y) < MOON.r + S * 0.9 + 8)       // the moon's face
          && !(x > 130 - S * 0.5 && x < 410 + S * 0.5 && y > 140 - S * 0.5 && y < 262 + S * 0.4)     // the HUD band
          && !(x + S * 0.8 > REX.x0 && y + S * 0.6 > REX.y0 - 10)                                    // the T-rex head
          && !(ufo && x < 280 && y < 340);                                                          // saucers come in top-left
      } else if (kind === "far") { x = R(-10 + 560 * rnd(s + 6)); ok = true; }
      else if (kind === "near") { x = R(30 + 480 * rnd(s + 7)); S = Math.min(74, R(S * 1.3)); ok = true; }
      else { x = t < 22.6 ? 1 : 2; y = R((rnd(s + 8) - 0.5) * 50); ok = !(x === 2 && t < 19); }
    }
    if (ok) add(t, kind, x, y, S);
    t += (0.55 + 0.9 * rnd(k * 17 + 3)) / rate; k++;
  }
  // peak chaos on "One million", and a set that freezes mid-blast at the time stop
  add(EV.million + 0.02, "near", 380, 0, 84);
  add(EV.million + 0.08, "plane", 482, 384, 60);
  add(EV.million + 0.14, "air", 486, 100, 50);
  add(EV.million + 0.22, "far", 150, 0, 70);
  add(25.3, "far", 318, 0, 74);
  add(25.54, "plane", 250, 380, 86, 1.8);      // goes off at his back; frozen at its peak, he walks on out of it
  add(25.5, "air", 476, 92, 52);
  add(25.53, "near", 160, 0, 78);
  add(25.6, "plane", 488, 382, 56, 1.6);       // ahead of him: he walks up past it while it hangs frozen
  add(25.66, "air", 70, 60, 50);
  add(25.7, "isle", 2, -6, 50);
  add(25.765, "air", 300, 52, 40);
  return B;
})();

// ---------------------------------------------------------------- drawing
const darkOf = (X) => clamp01(X.L / 6) * 0.9;
function draw(c, X, kinds) {
  const T = X.T;
  for (const b of BLASTS) {
    if (!kinds.includes(b.kind)) continue;
    const a = T - b.t0; if (a <= 0 || a >= b.life) continue;
    let x, y, kind = "sea", spray = null, S = b.S;
    if (b.kind === "air") { x = b.x; y = b.y; kind = "air"; }
    else if (b.kind === "far") { x = seaX(b.x, 0, b.t0, X); y = seaY(0, X) + 6; spray = sprayRamp(darkOf(X)); }
    else if (b.kind === "near") { x = seaX(b.x, 3, b.t0, X); y = seaY(3, X) + 8; spray = sprayRamp(darkOf(X)); }
    else if (b.kind === "isle") { const is = island(b.x, X); x = is.x + b.y; y = is.y + 2; if (x < -b.S || x > 540 + b.S) continue; }
    else { x = X.G.X(b.wx); y = X.G.Y(b.wy); kind = "air"; S = b.S * X.cam.z / b.z0; }   // his plane: zooms with the world
    boom(c, { x, y, a, S, seed: b.seed, kind, life: b.life, spray });
  }
}
export const sky = prof("explosions.sky", (c, X) => { if (X.T < EV.everything - 0.1) return; draw(c, X, ["air", "far"]); });
export const near = prof("explosions.near", (c, X) => { if (X.T < EV.everything - 0.1 || X.space >= 1) return; draw(fade(c, 1 - X.space), X, ["plane"]); });
/** Called from meteors.mjs's sea slot (before the dinosaurs are drawn). */
export const seaBack = (c, X) => { if (X.T < EV.everything - 0.1) return; draw(c, X, ["near", "isle"]); };

// ---------------------------------------------------------------- sound: the chain, the cool-guy blast, the bigger ones after
export const MOTIONS = BLASTS.filter((b) => b.t0 < STOP.a && (b.S >= 56 || (b.t0 > EV.everything && b.t0 < EV.explodes + 0.6)))
  .map((b) => ({ t0: +b.t0.toFixed(3), t1: +Math.min(STOP.a, b.t0 + b.life * 0.7).toFixed(3), kind: "boom", level: +Math.min(1, b.S / 110).toFixed(2), note: `${b.kind} blast S${b.S}${b.t0 > EV.dont1 - 0.1 && b.t0 < EV.look ? " (behind him: the cool-guy shot)" : ""}` }))
  .sort((a, b) => a.t0 - b.t0);
