// catalog-v1 item «arrow»: a chunky diagram arrow that points at its target prop — the cyan arrow of «Plane windows»
// (work/pixel-lab/plane-windows/film/levels/plane-body.mjs arrow: cyan body #7FE3F0, dark teal outline #0E4A5E, a pale tip)
// at prop size. Changes: the film's 1-px-per-step stroke (8–18 px long, writing c.d directly) becomes an arrow polygon
// at any length / angle / zoom, volume-shaded with the house blob (cute kit) in a cyan ramp built from the film's two
// colours; it draws itself from the tail when it enters (like the meadow arrow of animals-heart), nudges toward the
// target, can poke, grow yellow, or turn around. It aims at s.look, eased by the target presence s.lookK.
import { blob } from "./lib/cute.mjs";
import { bayer } from "../../../../renderer/pixel/raster.mjs";

const CYAN = ["#0E4A5E", "#15606F", "#1F7C8C", "#3399AA", "#55BCCB", "#7FE3F0", "#B4F2F8", "#E8FCFF"];   // index 0 = outline (film CYD); 5 = film CY
const GOLD = ["#5A3A04", "#7A5208", "#A8760E", "#D49E1C", "#F0B92E", "#F4CA50", "#FCE38C", "#FFF6CE"];
const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); }, TAU = Math.PI * 2;
const LEN = 104, SHAFT = 5, HEAD_L = 28, HEAD_W = 17;
function gateR(c, lo, hi) { if (lo <= 0 && hi >= 1) return c; const o = Object.create(c); o.px = (x, y, col) => { const b = bayer(Math.floor(x), Math.floor(y)); if (b >= lo && b < hi) c.px(x, y, col); }; return o; }
const lerpAng = (a, b, k) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * k;   // shortest way round
export default {
  kind: "arrow",
  covers: ["arrow"],
  source: "plane-windows/film/levels/plane-body.mjs#arrow (+ animals-heart meadow arrow draw-in)",
  desc: "big cyan diagram arrow in its slot pointing at its target prop; nudges toward it",
  hw: 54, hh: 46, start: "draws itself from the tail, then nudges toward its target",
  states: {
    point: [0.4, "points at its target, small nudges"],
    poke: [0.4, "jabs toward the target again and again: look here!", "blip"],
    big: [0.5, "grows a third bigger and turns yellow", "rise"],
    flip: [0.6, "turns around to point the other way", "swish"],
  },
  base: { amp: 1, rate: 1.1, big: 0, flip: 0 },
  st: {
    point: { amp: 1, rate: 1.1, big: 0, flip: 0 },
    poke: { amp: 3, rate: 2.4 },
    big: { big: 1, amp: 1, rate: 1.1 },
    flip: { flip: 1, amp: 1, rate: 1.1 },
  },
  demo: { target: true },
  notes: "Aims at its target (s.look); with no target it points right; the aim eases with the target's presence (engine lookK), so a target may enter later. The film arrow was an 8-18 px stroke; here it is an arrow polygon shaded with the house blob in a cyan ramp built from the film's two colours (big = gold ramp). Checker: 1 flag at 5.57 s = first level of the engine's exit dissolve on a thin shape (72 px).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, grow = sm((t - s.enterT) / 0.45), S = z * (1 + 0.32 * v.big);
    // the aim eases in and out with the target's presence (lookK), so a target that enters later is not a one-frame turn
    const aim = s.look ? lerpAng(0, Math.atan2(s.look[1] - cy, s.look[0] - cx), s.lookK) : 0, ang = aim + Math.PI * v.flip;
    const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
    // nudge along the arrow: (1 − cos)/2 keeps it biased forward, like a finger tapping toward the target
    const ph = s.integ((q) => q.rate), nudge = v.amp * 3.2 * z * (0.5 - 0.5 * Math.cos(TAU * ph));
    const tail = -LEN / 2, tip = tail + LEN * Math.max(0.08, grow), neck = Math.max(tail, tip - HEAD_L);
    const P = (u, w) => [cx + (u * ux + w * nx) * S + ux * nudge, cy + (u * uy + w * ny) * S + uy * nudge];
    const shaft = [P(tail, -SHAFT), P(neck + 1, -SHAFT), P(neck + 1, SHAFT), P(tail, SHAFT)];
    const head = [P(neck, -HEAD_W), P(tip, 0), P(neck, HEAD_W)];
    const o = { thick: 6 * S, base: 4.2, gain: 1.2, slope: 0.3, light: [-0.6, -0.8], rimLit: 1, rimShade: 0.9 };
    // yellow crossfades in through complementary Bayer gates
    const k = clamp01((v.big - 0.15) / 0.7);   // crossfade in the fast middle of the eased key (no lone dither steps at its slow ends)
    if (k < 1) blob(gateR(c, k, 1.01), [shaft, head], { ...o, ramp: CYAN, outline: CYAN[0], litOutline: CYAN[2] });
    if (k > 0) blob(gateR(c, 0, k >= 1 ? 1.01 : k), [shaft, head], { ...o, ramp: GOLD, outline: GOLD[0], litOutline: GOLD[2] });
    const pts = [...shaft, ...head], xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const T = P(tip, 0);
    return { box: { x0: Math.min(...xs) - 1, y0: Math.min(...ys) - 1, x1: Math.max(...xs) + 1, y1: Math.max(...ys) + 1 }, pt: [cx, cy], tip: T };
  },
};
