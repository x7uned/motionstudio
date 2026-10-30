// LV3 river — every audible motion for the 8-bit sound design: one entry per motion, lasting exactly as long as the
// motion on screen. Computed from the same tables/poses the picture uses (levels/river-time.mjs), never hard-coded.
import { CAM } from "../timeline.mjs";
import { ease, lerp } from "./river-kit.mjs";
import { RT, canoeAt, paddleAt, HX } from "./river-time.mjs";

const camX = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return Math.round(lerp(a.cx, b.cx, k)); };
const seen = (t, wx, half = 40) => { const sx = 270 + wx - camX(t); return sx + half > 0 && sx - half < 540; };
const f2 = (v) => v.toFixed(2);

export const MOTIONS = (() => {
  const out = [], add = (t0, t1, kind, level, note) => out.push({ t0, t1, kind, level, note });
  const L = "river", Y = RT.yawn, G = RT.gape;
  add(RT.hello[0], RT.hello[0] + RT.hello[1], "flutter", 0.2, "hippo flicks its ears as the camera arrives");
  add(Y.t0, Y.t1, "creak", 0.6, `huge lazy yawn: mouth opens (${f2(Y.t0)}–${f2(Y.t0 + Y.open)}), eyes half closed, holds`);
  add(Y.t0 + 0.12, Y.t0 + 0.62, "flutter", 0.15, "ears flick during the yawn");
  add(Y.t1, Y.t1 + Y.shut, "snap", 0.75, `yawn snaps shut on "but"`);
  add(RT.wide[0], RT.wide[1], "pop", 0.5, "eyes snap wide open");
  add(RT.narrow[0], RT.narrow[1], "squish", 0.35, "eyes narrow into a suspicious squint (don't be fooled)");
  add(RT.nod[0], RT.nod[0] + RT.nod[1] + 0.2, "tilt", 0.2, "slow knowing nod on \"five hundred\"");
  add(RT.glance, RT.glance + 0.28, "blip", 0.3, "squinting eyes slide right to the canoe");
  // paddle strokes while the canoe drifts in (blade in the water while sin(phase) > 0.2), only once it is on screen
  { const C = RT.canoe, k = C.kStroke, a0 = Math.asin(0.2) / (2 * Math.PI), a1 = 0.5 - a0;
    for (let n = 0; ; n++) { const s0 = C.t0 + (n + a0) * k, s1 = C.t0 + (n + a1) * k; if (s0 >= RT.notice) break; if (seen(s0, canoeAt(s0).x, 60)) add(s0, Math.min(s1, RT.notice), "paddle", 0.3, `paddle stroke ${n + 1} (blade in the water)`); } }
  add(RT.notice, RT.notice + 0.15, "uhoh", 0.5, "the hero sees the hippo coming and holds the paddle up");
  add(RT.surge[0], RT.surge[1], "whoosh", 0.7, "hippo lunges right, head down, bow wave");
  add(G[0], G[3], "roar", 0.65, `hippo gapes (opens ${f2(G[0])}–${f2(G[1])}, shuts ${f2(G[2])}–${f2(G[3])})`);
  add(RT.hit, RT.hit + 0.3, "thud", 0.8, "bump: the hippo's chest bonks the canoe's bow (impact star)");
  add(RT.hit, RT.hit + RT.splash, "splash", 0.5, "splash at the bump");
  add(RT.hit, RT.roll[0], "tilt", 0.45, "canoe is shoved, pitches bow-up and rocks");
  add(RT.roll[0], RT.roll[1], "tilt", 0.6, "canoe rolls over (≈ 14.6)");
  add(RT.roll[1] - 0.04, RT.roll[1] - 0.04 + RT.splash, "splash", 0.7, "capsized canoe lands hull-up");
  add(RT.fly[0], RT.fly[1], "fall", 0.6, "hero is tossed up out of the canoe, flailing, and falls");
  { const p = paddleAt(RT.fly[0] + 0.001); add(RT.fly[0], p.land, "whoosh", 0.35, "the paddle spins away"); add(p.land, p.land + 0.6, "splash", 0.35, "the paddle lands floating"); }
  add(RT.fly[1] - 0.06, RT.fly[1] - 0.06 + RT.splash, "splash", 0.9, "hero splashes into the river");
  add(RT.fly[1], RT.pop, "bubbles", 0.3, "bubbles where he went under");
  add(RT.pop, RT.pop + 0.5, "pop", 0.4, "hero's head pops up (small splash)");
  add(RT.swim[0], RT.swim[1], "swim", 0.5, "frantic crawl away to the far bank, getting smaller (unhurt)");
  if (seen(RT.climb[0], 1500, 30)) add(RT.climb[0], RT.climb[1], "squish", 0.15, "hero climbs out on the far bank (tiny), shakes off");
  add(RT.snort[0] + 0.08, RT.snort[0] + 0.08 + RT.spray, "hiss", 0.5, "hippo's satisfied snort: nostrils flare, two fans of spray, ^ ^ eyes");
  return out.sort((a, b) => a.t0 - b.t0).map(({ t0, t1, kind, level, note }) => ({ t0, t1, kind, level, note: `${L}: ${note}` }));
})();
