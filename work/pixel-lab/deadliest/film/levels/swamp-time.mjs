// LV4 swamp choreography: every time is a word time (EV / LV / W) plus an offset or a duration, never a hard-coded second.
// levels/swamp.mjs draws from these tables and poses; levels/swamp-motions.mjs lists the audible motions from them.
// "Crocodiles kill up to a thousand. They wait under the water, right by the shore."
import { EV, LV, W } from "../timeline.mjs";
import { ease, clamp01, lerp, sm } from "./river-kit.mjs";
import { GROUND } from "./river-world.mjs";

export const CX = 1890, CY = -142;          // croc head centre, raised on its mud hump (world): feet (84 × 1.2) on its top
export const FX0 = 1962, FX1 = 1974;        // the floating croc (front view): where it surfaces → glides to, by the shore
export const GZ = { x0: 2234, x1: 2088, back: 2134 };   // gazelle: walks in from the desert side → drinks → hops back
export const SIGN_X = 1712;                 // LV 4 sign on a post in the water
const RIGHT = W("right");
const U = (t, a, b) => clamp01((t - a) / (b - a));

export const ST = {
  hello: [EV.crocodiles + 0.4, 0.6],                                  // tail swish as the camera arrives (≈ 16.35)
  snaps: [[EV.thousand1 - 0.14, EV.thousand1 + 0.1], [EV.thousand1 + 0.2, EV.thousand1 + 0.44]],   // [opens at, shuts at]
  shut: 0.06, chomp: 0.34, gape: 0.42,                                // shut duration, chomp-line life, max opening (rad)
  slide: [EV.wait - 0.14, EV.water + 0.02],                           // slides back off the hump and goes under
  swim: [EV.water + 0.02, EV.water + 0.42],                           // a dim shape under the murky water, heading for the shore
  rise: [EV.water + 0.3, RIGHT + 0.04],                               // eyes + nostrils rise to the surface by the shore
  glide: [RIGHT, EV.shore + 0.2],                                     // …and glide a little closer
  walk: [EV.water - 0.3, RIGHT - 0.02],                               // the gazelle trots in from the right
  dip: [RIGHT - 0.02, RIGHT + 0.28],                                  // lowers its head to the water
  alert: EV.shore + 0.16,                                             // "!" pops over it
  hop: [EV.shore + 0.24, EV.shore + 0.66],                            // it pronks back onto the dry sand
  innocent: EV.shore + 0.4,                                           // the croc blinks innocently
  splash: 0.8,
  leave: [LV.croc[1] - 0.15, LV.croc[1] + 0.12],
};

/** Crocodile state: the 3/4 croc (on the hump, sliding, swimming under) and the front-view float. */
export function crocAt(t) {
  const [s0, s1] = ST.slide, [w0, w1] = ST.swim, [r0, r1] = ST.rise;
  let snap = 0; for (const [o, c] of ST.snaps) { const op = ease(U(t, o, c - 0.02)), sh = ease(U(t, c, c + ST.shut)); snap = Math.max(snap, op * (1 - sh)); }
  const bob = Math.sin(t * 2.1) * 1.2;
  let x = CX, y = CY + bob, pitch = 0, a = 1;
  if (t > s0) { const u = U(t, s0, s1), e = u * u * (3 - 2 * u); x -= 44 * e; y = lerp(CY + bob, 50, u < 0.35 ? (u / 0.35) ** 2 * 0.25 : 0.25 + 0.75 * ease((u - 0.35) / 0.65)); pitch = 0.12 * Math.sin(Math.PI * u); }
  if (t > w0) { const u = U(t, w0, w1); x = lerp(CX - 44, FX0 - 14, ease(u)); y = 50 + 8 * Math.sin(Math.PI * u); pitch = -0.06 * Math.sin(Math.PI * u); a = 1 - sm(u, 0.35, 1); }
  const fa = sm(t, r0 - 0.12, r0 + 0.12), rise = ease(U(t, r0, r1)), fx = lerp(FX0, FX1, ease(U(t, ST.glide[0], ST.glide[1])));
  return { x, y, snap: snap * ST.gape, pitch, a, float: { a: fa, x: fx, sink: 34 * (1 - rise), rise } };
}

/** Gazelle state: x (world, under its body), ground y, walk phase, neck (0 up → 1 drinking), air (hop height), lean. */
export function gazelleAt(t) {
  const [w0, w1] = ST.walk, [h0, h1] = ST.hop;
  let x = lerp(GZ.x0, GZ.x1, 1 - (1 - U(t, w0, w1)) ** 1.6), phase = (t - w0) * 2.6, stride = 1 - sm(t, w1 - 0.25, w1 + 0.05), air = 0;
  const lap = sm(t, ST.dip[1], ST.dip[1] + 0.05) * (1 - sm(t, ST.alert - 0.04, ST.alert)) * Math.max(0, Math.sin((t - ST.dip[1]) * 18)) * 0.08;
  let neck = ease(U(t, ST.dip[0], ST.dip[1])) * (1 - ease(U(t, ST.alert - 0.04, ST.alert + 0.1))) - lap;
  if (t > h0) { const u = U(t, h0, h1); x = lerp(GZ.x1, GZ.back, ease(u)); air = 30 * Math.sin(Math.PI * u) + (t > h1 ? Math.exp(-(t - h1) * 9) * Math.sin((t - h1) * 22) * -2 : 0); }
  return { x, y: GROUND(x), phase, stride, neck: clamp01(neck), air, lean: clamp01(neck) * 0.8, tuck: sm(t, h0, h0 + 0.08) * (1 - sm(t, h1 - 0.1, h1)), startle: sm(t, ST.alert - 0.02, ST.alert + 0.06) };
}
