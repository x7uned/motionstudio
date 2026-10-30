// Audible motions of LV1 meadow (honeybee + the hook) and LV2 Cuba (bee hummingbird) for the 8-bit sound design.
// Every entry spans exactly the motion it accompanies and is computed from the levels' own timing tables
// (meadow.mjs T, cuba.mjs T), their state functions (plankAngle, scale-bee path) and the timeline — no hard-coded
// seconds. "On screen" windows use the same camera as render.mjs (eased CAM keys, copied below) and the drawn extents.
// Loop seam: the hero bee and the meadow's tiny bees are on screen at t = 0 and again at the end; their buzz is split
// into a window starting at 0 and one ending exactly at END, and their wing motion is periodic over END in the picture.
// Not listed: idle loops without a sound of their own (breathing bob, blinks, antennae sway, vines, the nodding hibiscus,
// the balance pans' tiny sway, the hummingbird's iridescent sheen). Entry: { t0, t1, kind, level, note }.
import { EV, END, CAM, WORLD_W } from "../timeline.mjs";
import { ease, lerp } from "../cute.mjs";
import { T as MW, plankAngle } from "./meadow.mjs";
import { T as CU, beeState as scaleBee } from "./cuba.mjs";

const M = [], add = (t0, t1, kind, level, note) => { if (t1 > t0) M.push({ t0: +t0.toFixed(4), t1: +t1.toFixed(4), kind, level, note }); };
const rise = (life) => life / 1.6;                       // cute pickup(): the text rises during the first 1/1.6 of its life
// render.mjs camera(): eased between CAM keys
function camera(t) { let i = 0; while (i < CAM.length - 2 && CAM[i + 1].t <= t) i++; const a = CAM[i], b = CAM[i + 1], k = ease((t - a.t) / (b.t - a.t || 1)); return { cx: lerp(a.cx, b.cx, k), cy: lerp(a.cy, b.cy, k) }; }
const seen = (x, half, t) => { const cx = camera(t).cx; return [x, x + WORLD_W].some((xx) => xx + half > cx - 270 && xx - half < cx + 270); };
function windows(test, a = 0, b = END, dt = 1 / 240) {
  const out = []; let s = null;
  for (let i = 0, t = a; t <= b + 1e-9; i++, t = a + i * dt) { const v = test(Math.min(t, b)); if (v && s === null) s = t; else if (!v && s !== null) { out.push([s, t]); s = null; } }
  if (s !== null) out.push([s, b]); return out;
}
const seam = (w) => (w[0] <= 1e-9 ? " (from the first frame; the loop's last window continues into it)" : Math.abs(w[1] - END) < 1e-9 ? " (runs to END: the loop seam, wing motion periodic over END)" : "");

// ================================================================ LV1 · meadow (level "bee")
// the hero bee's wings: whenever it is on screen; harder while it carries the nectar drop
for (const w of windows((t) => seen(MW.BEE.x, MW.BEE.half, t))) {
  const cut = MW.LOAD[0];
  if (cut > w[0] && cut < w[1]) { add(w[0], cut, "buzz", "bee", "honeybee wings, hovering at the sun disc" + seam(w)); add(cut, w[1], "buzz", "bee", "honeybee wings beating harder: it carries a nectar drop almost half its size"); }
  else add(w[0], w[1], "buzz", "bee", "honeybee wings, hovering at the sun disc" + seam(w));
}
for (const w of windows((t) => seen(270, 270, t))) add(w[0], w[1], "buzz", "bee", "tiny worker bees: three circling the hive entrance, three drifting over the flowers" + seam(w));
// the hook: seesaw, bees streaming onto its left end, the whale dropping onto the right end
add(MW.SEE_IN[0], MW.SEE_IN[1], "pop", "bee", "seesaw dissolves in on the meadow (\"billion\")");
for (let i = 0; i < MW.PILE_N; i++) { const t0 = MW.ARRIVE0 + i * MW.STEP; add(t0, t0 + MW.FLY, "drop", "bee", `tiny bee ${i + 1}/${MW.PILE_N} flies out of the hive and lands on the seesaw pile`); }
add(MW.SWARM[0], MW.SEE_OUT[1], "buzz", "bee", "tiny bees buzzing in a little cloud over the pile");
add(MW.LBL_BEES[0], MW.LBL_BEES[1], "tag", "bee", "1,000,000,000+ BEES label dissolves in above the pile");
// seesaw angle traced with the picture's own plankAngle(): the tip while the pile grows, then the damped swings
{
  const a = MW.ARRIVE0 + MW.FLY, b = a + MW.STEP * MW.PILE_N;
  add(a, b, "swing", "bee", `seesaw tips toward the growing bee pile (0 → ${plankAngle(b).toFixed(3)} rad)`);
  const dt = 1 / 240; let s = MW.LAND_T, prev = plankAngle(s), dir = 0, n = 0;
  for (let t = MW.LAND_T + dt; t <= MW.SEE_OUT[1] + 1e-9; t += dt) {
    const v = plankAngle(t), d = Math.sign(v - prev);
    if (dir && d && d !== dir) {                          // an extremum at t - dt ends a half-swing
      const a0 = plankAngle(s); if (Math.abs(prev - a0) * MW.HALF < 1) break;   // the plank's end moves < 1 px: at rest
      add(s, t - dt, "swing", "bee", `seesaw ${++n === 1 ? "is knocked by the whale and " : ""}swings down on the ${dir > 0 ? "whale's" : "bees'"} side (${a0.toFixed(3)} → ${prev.toFixed(3)} rad), half-swing ${n}`);
      s = t - dt;
    }
    if (d) dir = d; prev = v;
  }
}
add(MW.DROP, MW.LAND_T, "fall", "bee", "blue whale drops onto the seesaw's right end (\"blue whale\")");
add(MW.LAND_T, MW.LAND_T + MW.DUST, "thud", "bee", "the whale lands on the plank, dust puffs fly out");
add(MW.LBL_WHALE[0], MW.LBL_WHALE[1], "tag", "bee", "1 BLUE WHALE label dissolves in");
add(MW.SEE_OUT[0], MW.SEE_OUT[1], "whoosh", "bee", "seesaw, bee pile, whale and labels dissolve out");
// LIGHT → HEAVY
add(MW.TAG_LH[0], MW.TAG_LH[0] + MW.TAG_LH[2], "tag", "bee", "LIGHT → HEAVY panel dissolves in (\"climb\")");
add(MW.HOP[0], MW.HOP[0] + MW.HOP[1], "bounce", "bee", "the bee hops up 9 px on \"climb\" and back");
add(MW.ARROW[0], MW.ARROW[1], "draw", "bee", "the arrow grows from LIGHT toward HEAVY");
add(MW.HEAVY_IN[0], MW.HEAVY_IN[1], "pop", "bee", "HEAVY appears at the arrow's tip");
add(MW.TAG_LH[1], MW.TAG_LH[1] + MW.TAG_LH[3], "tagout", "bee", "LIGHT → HEAVY panel dissolves out");
// LV1 facts
add(MW.PICKUP[0], MW.PICKUP[0] + rise(MW.PICKUP[1]), "pickup", "bee", `0.1 G rises above the bee (visible ${MW.PICKUP[1]} s)`);
add(MW.LOAD[0], MW.LOAD[1], "slide", "bee", "a nectar drop swells under the bee to almost half its size; the bee sags 7 px");
add(MW.SWEAT[0], MW.SWEAT[1], "blip", "bee", "a little sweat drop appears at the bee's temple");
add(MW.TAG_40[0], MW.TAG_40[0] + MW.TAG_40[2], "tag", "bee", "40% OF ITS WEIGHT tag dissolves in");
add(MW.TAG_40[1], MW.TAG_40[1] + MW.TAG_40[3], "tagout", "bee", "40% OF ITS WEIGHT tag dissolves out (camera moving to Cuba)");

// ================================================================ LV2 · Cuba (level "hummingbird")
for (const w of windows((t) => seen(CU.HB.x, CU.HB.half, t))) add(w[0], w[1], "buzz", "hummingbird", "bee hummingbird wings (fast blurred buzz)");
for (const w of windows((t) => { const b = scaleBee(t); return b.a > 0 && seen(b.x, CU.SBEE.half, t); })) add(w[0], w[1], "buzz", "hummingbird", "tiny scale honeybee's wings beside the hummingbird");
for (const w of windows((t) => seen(CU.BAL.x, CU.BAL.half, t))) add(w[0], w[1], "buzz", "hummingbird", "16 tiny bees fluttering in the balance pan (16 BEES = 1 HUMMINGBIRD)");
add(CU.IN0, CU.IN0 + CU.POP_FADE, "pop", "hummingbird", "the scale bee pops out of the hibiscus bush");
add(CU.IN0, CU.IN1, "swish", "hummingbird", "the scale bee flies under the hummingbird's tail to its spot");
add(CU.PICKUP[0], CU.PICKUP[0] + rise(CU.PICKUP[1]), "pickup", "hummingbird", `1.6 G rises above the hummingbird (visible ${CU.PICKUP[1]} s)`);
add(CU.THINK_MOVE[0], CU.THINK_MOVE[0] + CU.THINK_MOVE[2], "swish", "hummingbird", "the scale bee glides up close to the hummingbird; they look at each other");
add(CU.HUH[0], CU.HUH[0] + CU.HUH[2], "huh", "hummingbird", "\"?\" bubble pops up between the two (\"think it's a bee\")");
add(CU.HUH[1], CU.HUH[1] + CU.HUH[3], "tagout", "hummingbird", "the \"?\" bubble dissolves");
add(CU.THINK_MOVE[1], CU.THINK_MOVE[1] + CU.THINK_MOVE[3], "swish", "hummingbird", "the scale bee glides back to its spot");
add(CU.HEAT[0], CU.HEAT[1] + CU.HEAT[3], "shimmer", "hummingbird", "little red heat waves keep leaving the tiny body (\"scientists … too fast\")");
add(CU.HEAT_UP[0], CU.HEAT_UP[1], "shimmer", "hummingbird", "the heat waves and the warm aura grow stronger on \"heat\"");
add(CU.SHIVER[0], CU.SHIVER[1] + CU.SHIVER[3], "scratch", "hummingbird", "the hummingbird shivers (losing heat)");
add(CU.TAG[0], CU.TAG[0] + CU.TAG[2], "tag", "hummingbird", "LOSES HEAT FAST tag dissolves in");
add(CU.TAG[1], CU.TAG[1] + CU.TAG[3], "tagout", "hummingbird", "LOSES HEAT FAST tag dissolves out (camera moving on)");
void EV;

export const MOTIONS = M.sort((a, b) => a.t0 - b.t0);
