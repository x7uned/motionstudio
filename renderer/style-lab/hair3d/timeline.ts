// «Hair grows faster every second» · shared clock for five 3D style tests (2026-10-26, @kagenami_fun brainrot channel).
// One measured voice take (Dennis · Eleven v4) drives every event; all values are pure functions of time t (seconds).
import words from "./words.json";

export const FPS = 30;
export const END = 17.0;
export const FRAMES = Math.round(END * FPS);
export type Word = { text: string; start: number; end: number };
export const WORDS: Word[] = (words as { words: Word[] }).words;
export const VOICE_TEXT: string = (words as { text: string }).text;
const at = (i: number) => WORDS[i].start;
// word indices in narration.txt (asserted by the render script against the text)
export const EV = {
  oneSec: at(6), shoulders: at(8), tenSec: at(9), floor: at(14), minute: at(15), cat: at(18),
  tenMin: at(22), house: at(26), hour: at(27), half: at(29), hood: at(31), hairEnd: WORDS[33].end,
  follow: at(34), miss: at(38), voiceEnd: WORDS[WORDS.length - 1].end,
};

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const sm = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)); return x * x * (3 - 2 * x); };
export const ease = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)); return x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const back = (a: number, b: number, t: number) => { const x = clamp01((t - a) / (b - a)), c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/** Monotone cubic (Fritsch–Carlson) through [t, v] anchors; flat outside. Never overshoots, so growth never shrinks. */
export function monotone(pts: [number, number][]) {
  const n = pts.length, xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const d = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = ys.map((_, i) => i === 0 ? 0 : i === n - 1 ? 0 : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2);
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (t: number) => {
    if (t <= xs[0]) return ys[0];
    if (t >= xs[n - 1]) return ys[n - 1];
    let i = 0; while (t > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i], u = (t - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

// ---- growth -------------------------------------------------------------------------------------------------------
/** Strand length from the scalp (m): short hair → shoulders on «Shoulders» → floor on «floor» → spreading on the floor. */
export const hairLen = monotone([[0, .16], [1.2, .2], [EV.oneSec, .3], [EV.shoulders + .5, .56], [EV.floor + .3, 1.82], [EV.cat, 2.9], [EV.tenMin + .4, 4.3], [EV.house + .6, 4.6], [END, 4.8]]);
/** Hair mound around the hero's feet (m) and its radius. */
export const moundH = monotone([[EV.floor + .1, 0], [EV.cat + .2, .34], [EV.tenMin + .3, .55], [END, .6]]);
export const moundR = monotone([[EV.floor + .1, .5], [EV.cat + .2, 1.25], [EV.tenMin + .3, 2.0], [END, 2.4]]);
/** Room fill level (m): the whole house fills on «Ten minutes … the whole house». */
export const fillLevel = monotone([[EV.tenMin, 0], [EV.house, 1.7], [EV.house + .6, 2.35], [END, 2.45]]);
/** The hero floats up on the hair once it is deeper than his knees. */
export const heroLift = (t: number) => Math.max(0, fillLevel(t) - .9);
/** Roof pops off the house on «house». */
export const roofLift = (t: number) => back(EV.house - .15, EV.house + .55, t);
/** Cat rises out of the mound on «cat». */
export const catRise = (t: number) => back(EV.cat - .05, EV.cat + .55, t);
/** Rope length out of each window / the open front (m). */
export const ropeLen = monotone([[EV.tenMin + .45, 0], [EV.house + .2, 4.5], [EV.hour + .5, 11], [EV.hairEnd, 22], [END, 25]]);
/** Outdoor hair blanket front radius from the house (m): half of the neighbourhood by «hair». */
export const blanketR = monotone([[EV.house, 2.5], [EV.hour, 6.5], [EV.half, 13], [EV.hairEnd, 33], [END, 37]]);
/** Elapsed story time for the timer (s), interpolated on a log scale between the spoken marks. */
const logS = monotone([[0, 0], [EV.oneSec + .12, Math.log10(2)], [EV.tenSec + .3, Math.log10(11)], [EV.minute + .25, Math.log10(61)], [EV.tenMin + .2, Math.log10(601)], [EV.hour + .25, Math.log10(3601)], [END, Math.log10(3660)]]);
export const storySeconds = (t: number) => Math.max(0, 10 ** logS(t) - 1);

// ---- camera: one continuous move from the face to the neighbourhood ---------------------------------------------------
export type V3 = [number, number, number];
type Key = { t: number; p: V3; q: V3; fov: number };
const KEYS: Key[] = [
  { t: 0, p: [.26, 1.46, 1.85], q: [0, 1.3, 0], fov: 38 },
  { t: EV.oneSec, p: [.4, 1.4, 2.2], q: [0, 1.22, 0], fov: 38 },
  { t: EV.tenSec + .3, p: [.62, 1.34, 2.75], q: [0, 1.02, 0], fov: 40 },
  { t: EV.minute, p: [1.05, 1.5, 3.7], q: [.05, .78, 0], fov: 40 },
  { t: EV.cat + .55, p: [2.3, 1.5, 4.9], q: [.35, .66, .3], fov: 40 },
  { t: EV.tenMin + .35, p: [1.35, 2.1, 5.2], q: [0, 1.35, 0], fov: 42 },
  { t: EV.house + .5, p: [4.2, 6.2, 15.5], q: [0, 2.4, 0], fov: 44 },
  { t: EV.hood + .1, p: [12, 40, 34], q: [-4, 0, -6], fov: 44 },
  { t: END, p: [14, 50, 41], q: [-5, 0, -8], fov: 44 },
];
const cr = (p0: number, p1: number, p2: number, p3: number, u: number, t0: number, t1: number, t2: number, t3: number) => {
  // non-uniform Catmull–Rom tangents scaled by segment duration: continuous velocity through every key
  const m1 = ((p2 - p1) / (t2 - t1) + (p1 - p0) / Math.max(1e-3, t1 - t0)) / 2 * (t2 - t1);
  const m2 = ((p3 - p2) / Math.max(1e-3, t3 - t2) + (p2 - p1) / (t2 - t1)) / 2 * (t2 - t1);
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p1 + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2 + (u3 - u2) * m2;
};
export function camState(t: number) {
  const k = KEYS; let i = 0; while (i < k.length - 2 && t > k[i + 1].t) i++;
  const a = k[Math.max(0, i - 1)], b = k[i], c = k[i + 1], d = k[Math.min(k.length - 1, i + 2)];
  const u = clamp01((t - b.t) / (c.t - b.t)), s = u * u * (3 - 2 * u) * .35 + u * .65;
  const f = (sel: (x: Key) => number) => cr(sel(a === b ? b : a), sel(b), sel(c), sel(d === c ? c : d), s, a === b ? b.t - 1 : a.t, b.t, c.t, d === c ? c.t + 1 : d.t);
  const lift = heroLift(t) * (1 - sm(EV.house, EV.hood, t));
  return {
    pos: [0, 1, 2].map(j => f(x => x.p[j])) as V3,
    target: [0, 1, 2].map(j => f(x => x.q[j]) + (j === 1 ? lift * .8 : 0)) as V3,
    fov: f(x => x.fov),
  };
}
