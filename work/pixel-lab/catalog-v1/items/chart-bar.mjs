// catalog-v1 item «chart-bar»: the response bar chart of «Your cat knows its name» as a HUD card — five lilac bars on a
// panel, one highlighted bar that rises (or sinks) and turns yellow, the spoken number above it, the label as the title.
// Ported from work/pixel-lab/cat-name/film/name-hud.mjs chart (copy in lib/catname-chart.mjs). HUD, not a world prop: it
// carries the only on-screen number and a title, which must stay legible and uncropped while the camera moves.
// Bar heights are illustrative; no number is shown except s.value (+ unit), no text except s.label.
import { chartCard, blitCard, CW, CH } from "./lib/catname-chart.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const OTHERS = [0.46, 0.62, null, 0.38, 0.55], HI = 2;      // illustrative heights; the middle bar is the highlighted one
export default {
  kind: "chart-bar",
  covers: ["chart-bar"],
  source: "cat-name/film/name-hud.mjs#chart",
  desc: "bar chart card: five bars, one highlighted bar shows the spoken number; label = title; HUD card",
  hw: 108, hh: 78, start: "card fades in, bars grow up one after another",
  hud: true, value: true, text: true,
  states: {
    show: [0.4, "card with five plain bars (heights illustrative)"],
    tall: [1.2, "the middle bar shoots up above the rest, turns yellow, the value appears on top", "rise"],
    short: [1.2, "the middle bar sinks below the rest, turns yellow, the value appears on top", "dim"],
    done: [0.53, "the highlighted bar flashes, stays", "ding"],
  },
  base: { hiH: 0.5, hi: 0 },
  st: { show: { hiH: 0.5, hi: 0 }, tall: { hiH: 1, hi: 1 }, short: { hiH: 0.16, hi: 1 }, done: { hi: 1 } },
  seq: [],
  linear: ["hiH", "hi"],   // the bar moves at a steady ≤ 2 px/frame; the highlight / number dissolve at ≤ 1 Bayer level per frame
  demo: { slot: "top", label: "HOURS ASLEEP", value: "16", unit: "H" },
  notes: "HUD card: it carries the title (label) and the only number (value), which must stay legible and uncropped while the camera moves. Bar heights are illustrative; the highlighted bar is always the middle one: tall = ends above the others, short = below; the value appears under the title above that bar. No value: the validator keeps only show (title + five plain bars). Bars grow in over about 2 s after the card enters (kept at <= 2 px/frame). Checker: 1 flag at 4.1 s = first frame of the done-flash fading out on the short bar (ordered dither, 73 px).",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
    // bars grow in after the card has faded in, one after another, at ≤ ~2.5 px/frame
    const hs = OTHERS.map((h, i) => Math.max(2 / 84, (h ?? v.hiH) * sm((t - s.enterT - 0.3 - i * 0.12) / 1.25)));   // 2-px stubs from the start
    const unit = s.unit === "%" ? "%" : s.unit || "", valueText = s.value != null ? `${s.value}${unit ? (unit === "%" ? "" : " ") + unit : ""}` : null;
    const fa = s.acc("done"), fx = clamp01(Math.min(fa, 1 - fa) * 3), flash = fx * fx * (3 - 2 * fx);   // eased in over ~5 frames, hold, eased out
    // the highlight colour waits for the bar to move first: it turns over the second half of the tall/short key
    const hiK = clamp01((v.hi - 0.6) / 0.2222);   // linear hi over 1.2 s (36 frames): exactly two Bayer levels per frame, done before the bar stops
    const box = blitCard(c, chartCard({ hs, hiI: HI, hi: valueText ? hiK : hiK, flash, title: s.label, valueText }), cx, cy, z);
    return { box, pt: [cx, cy] };
  },
};
