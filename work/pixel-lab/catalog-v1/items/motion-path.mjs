// catalog-v1 item «motion-path»: a dotted trajectory that draws itself across its slot toward the target prop — the
// dotted path of the animals films (work/pixel-lab/animals-weight/film/levels/meadow-kit.mjs dotted(): small light dots
// with a 1-px dark outline every few px along a polyline, drawn up to a fraction of its length) with the dot-every-other-
// sample look of a jump trace (mario-jump/film/render.mjs drawTraces: only the generic 2-px trace dot, nothing of the game).
// Changes (inlined): the film path popped each dot in at full strength when the drawn length passed it — here every dot
// dissolves in over ~2.5 dot spacings behind the moving head (and out again from the tail on «fade»); a fixed number of
// dots spread evenly along the curve, so when the arc rises or curls into a loop the dots slide along it instead of
// appearing or vanishing; dot size follows the zoom with a Bayer crossfade between pixel sizes; a three-dot yellow
// chevron rides the head and shows the direction. The chord aims at s.look, eased by the target presence s.lookK.
import { C } from "./lib/cute.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); }, TAU = Math.PI * 2;
const lerpAng = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;   // shortest way round
const LEN = 172, NDOT = 28, LOOP_R = 25, FADE = 2.5, REST = -0.32, SAMPLES = 120;
const DARK = C.O, DOT = C.IV, HEAD = C.Y;
// a view whose writes pass only Bayer thresholds in [lo, hi): complementary gates crossfade two pictures
function gateR(c, lo, hi) { if (lo <= 0 && hi >= 1) return c; const o = Object.create(c); o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); }; return o; }
// one dark-outlined square dot of size S (continuous: crisp floor(S) or floor(S)+1, crossfaded only while S passes
// through the middle fifth between two sizes, e.g. during a camera zoom), alpha a
function dot(c, x, y, S, col, a) {
  if (a <= 0) return;
  const s0 = Math.max(1, Math.floor(S)), f = S >= 1 ? sm((S - s0 - 0.4) / 0.2) : 0, k = a * (1 - f);
  const one = (g, s) => { const X = Math.round(x - s / 2), Y = Math.round(y - s / 2); g.rect(X - 1, Y - 1, s + 2, s + 2, DARK); g.rect(X, Y, s, s, col); };
  if (k > 0) one(gateR(c, 0, k), s0);
  if (a > k) one(gateR(c, k, a >= 1 ? 1.01 : a), s0 + 1);
}
export default {
  kind: "motion-path",
  covers: ["motion-path"],
  source: "animals-weight/film/levels/meadow-kit.mjs#dotted (+ mario-jump/film/render.mjs#drawTraces dot look, generic only)",
  desc: "dotted trajectory arc across its slot toward its target prop, yellow arrowhead; draws itself dot by dot",
  hw: 82, hh: 64, start: "draws itself dot by dot in a low arc toward its target",
  states: {
    draw: [0.6, "low dotted arc toward the target, drawn dot by dot"],
    arc: [0.8, "the arc bends up high, like a throw or a jump", "swish"],
    loop: [1.0, "the trail curls into a loop on its way", "whoosh"],
    march: [0.5, "the dots march along the trail toward the target", "tick"],
    fade: [0.8, "the trail fades away dot by dot from its tail", "dim"],
  },
  base: { arc: 0.3, loop: 0, flow: 0, tail: 0 },
  st: {
    draw: { arc: 0.3, loop: 0, flow: 0, tail: 0 },
    arc: { arc: 1, loop: 0 },
    loop: { loop: 1 },
    march: { flow: 1 },
    fade: { tail: 1 },
  },
  linear: ["tail"],
  demo: { target: true, tile: "march" },
  notes: "World prop: a throw-like parabola that always bulges up the screen, 28 ivory 2-px dots with a dark outline spread evenly (so arc/loop changes slide the dots, none appears or vanishes), a yellow three-dot chevron at the head. Aims at s.look eased by lookK; no target = points right, slightly up. A steep aim gets a shorter, almost straight chord (straight up for a target right above); the loop then flattens to a wiggle. The footprint depends on the aim (sheet diagonal aim: 69x94 measured; a level aim is about 90 wide). Dot sizes follow the zoom and crossfade only in a narrow band between pixel sizes. The sheet close-up tile is empty because fade is the last state. Checker: clean.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    // chord direction: toward the target, eased by its presence; the bulge goes to the screen-upper side of the chord and
    // flattens through a vertical aim instead of flipping
    const ang = s.look ? lerpAng(REST, Math.atan2(s.look[1] - cy, s.look[0] - cx), s.lookK) : REST;
    const ux = Math.cos(ang), uy = Math.sin(ang), side = Math.max(-1, Math.min(1, ux / 0.35)), nx = uy * side, ny = -ux * side;
    // a steep aim gets a shorter chord, so the vertical arc does not grow the footprint
    const L = LEN * z * (1 - 0.3 * Math.abs(uy)), H = L * (0.12 + 0.28 * v.arc), Rl = LOOP_R * z * v.loop;
    // the curve: a throw-like parabola over the chord (it always bulges up the screen, like gravity), plus a
    // loop-the-loop on the chord's upper side blended in by `loop`; the whole curve is centred on the slot
    const pts = [], cum = [0];
    for (let i = 0; i <= SAMPLES; i++) {
      const q = i / SAMPLES, lq = clamp01((q - 0.34) / 0.32), up = H * (4 * q * (1 - q) - 0.5);
      const u = (q - 0.5) * L + Rl * Math.sin(TAU * lq), w = Rl * (1 - Math.cos(TAU * lq) - 1);
      pts.push([cx + u * ux + w * nx, cy + u * uy + w * ny - up]);
      if (i) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    const Lt = cum[SAMPLES], at = (d) => {   // point + unit tangent at arc length d
      d = Math.max(0, Math.min(Lt, d)); let i = 1; while (i < SAMPLES && cum[i] < d) i++;
      const a = pts[i - 1], b = pts[i], l = cum[i] - cum[i - 1] || 1, f = (d - cum[i - 1]) / l;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, (b[0] - a[0]) / l, (b[1] - a[1]) / l];
    };
    // progress in dot units: the head draws in after entering, the tail erases on «fade»; march shifts the dots forward
    const last = NDOT - 1, sp = Lt / last, grow = sm((t - s.enterT - 0.05) / 1.15);
    const Hd = grow * (last + FADE), Td = v.tail * (last + 2 * FADE) - FADE;
    const ph = s.integ((q) => q.flow * 2.4), phi = ph - Math.floor(ph);
    const S = 2 * z;
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = -1; i <= last; i++) {
      const u = i + phi; if (u < 0 || u > last) continue;
      const ends = clamp01(u) * clamp01(last - u), am = 1 + (ends - 1) * v.flow;   // marching dots dissolve in at the tail, out at the end
      const a = clamp01((Hd - u) / FADE) * clamp01((u - Td) / FADE) * am;
      if (a <= 0) continue;
      const [x, y] = at(u * sp); dot(c, x, y, S, DOT, a);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    // the yellow chevron rides the head (three dots), fading with the tail when it reaches the end
    const uh = Math.min(Hd, last), ah = clamp01((uh - Td) / FADE) * clamp01(grow * 8);
    const [hx, hy, tx, ty] = at(uh * sp), b = 9 * z, wsd = 7 * z;
    if (ah > 0) {
      dot(c, hx - tx * b + ty * wsd, hy - ty * b - tx * wsd, S + z, HEAD, ah);
      dot(c, hx - tx * b - ty * wsd, hy - ty * b + tx * wsd, S + z, HEAD, ah);
      dot(c, hx + tx * 1.5 * z, hy + ty * 1.5 * z, S + 1.6 * z, HEAD, ah);
    }
    const [mx, my] = at(Lt / 2), e = 3 * z + 2;
    const box = x1 < x0 ? { x0: cx - 4, y0: cy - 4, x1: cx + 4, y1: cy + 4 } : { x0: Math.min(x0, hx) - e, y0: Math.min(y0, hy) - e, x1: Math.max(x1, hx) + e, y1: Math.max(y1, hy) + e };
    return { box, pt: [mx, my], tip: [hx, hy] };
  },
};
