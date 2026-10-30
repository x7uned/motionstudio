// LV4 swamp — every audible motion for the 8-bit sound design: one entry per motion, lasting exactly as long as the
// motion on screen. Computed from the same tables/poses the picture uses (levels/swamp-time.mjs), never hard-coded.
import { CAM } from "../timeline.mjs";
import { ease, lerp } from "./river-kit.mjs";
import { ST, crocAt } from "./swamp-time.mjs";
import { DRAGONFLY_PER } from "./swamp.mjs";

const camX = (t) => { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return Math.round(lerp(a.cx, b.cx, k)); };
const seen = (t, wx, half = 40) => { const sx = 270 + wx - camX(t); return sx + half > 0 && sx - half < 540; };
const f2 = (v) => v.toFixed(2);

export const MOTIONS = (() => {
  const out = [], add = (t0, t1, kind, level, note) => out.push({ t0, t1, kind, level, note: `swamp: ${note}` });
  add(ST.hello[0], ST.hello[0] + ST.hello[1], "swish", 0.25, "croc's tail swishes on the hump as the camera arrives");
  ST.snaps.forEach(([o, c], i) => { add(o, c, "creak", 0.3, `jaws open wide (snap ${i + 1})`); add(c, c + ST.shut, "snap", 0.9, `jaws SNAP shut (snap ${i + 1}), chomp lines ${f2(c + ST.shut)}–${f2(c + ST.shut + ST.chomp)}`); });
  const [s0, s1] = ST.slide, entry = lerp(s0, s1, 0.62);
  add(s0, s1, "dive", 0.6, "croc slides back off the mud hump and goes under");
  add(entry, entry + ST.splash, "splash", 0.8, "splash and rings where it enters the water");
  add(s1 - 0.15, s1 + 0.4 + 1.2, "bubbles", 0.35, "trail of bubbles from the sunken croc");
  add(ST.swim[0], ST.swim[1], "swim", 0.35, "dim croc shape glides under the murky water toward the shore");
  add(ST.rise[0], ST.rise[1], "rise", 0.45, "only its eyes and nostrils rise by the shore (rings), looking at the camera");
  add(ST.walk[0], ST.walk[1], "patter", 0.35, "a gazelle trots in from the right to the water's edge");
  add(ST.dip[0], ST.dip[1], "tilt", 0.2, "gazelle lowers its head to the water");
  add(ST.dip[1], ST.alert, "slap", 0.15, "gazelle laps the water (little ripples)");
  add(ST.glide[0], ST.glide[1], "swim", 0.25, "croc's eyes glide a little closer to the shore (wake)");
  add(ST.alert, ST.alert + 0.3, "alert", 0.8, `"!" pops over the gazelle`);
  add(ST.hop[0], ST.hop[1], "boing", 0.6, "gazelle pronks back onto the dry sand");
  add(ST.hop[1], ST.hop[1] + 0.6, "land", 0.4, "gazelle lands (dust puff)");
  add(ST.innocent, ST.innocent + 0.32, "blip", 0.3, "croc blinks innocently");
  // dragonflies: each dart (the last 20 % of their hover period) while they are on screen
  DRAGONFLY_PER.forEach((per, i) => { for (let n = 0; n * per < 22; n++) { const t0 = (n + 0.8 - i * 0.5) * per, t1 = t0 + 0.2 * per; if (t0 < 15.6 || t1 > 21) continue; if (seen(t0, i ? 2000 : 1730, 20)) add(t0, t1, "buzz", 0.1, `dragonfly ${i + 1} darts to a new spot`); } });
  return out.sort((a, b) => a.t0 - b.t0);
})();
