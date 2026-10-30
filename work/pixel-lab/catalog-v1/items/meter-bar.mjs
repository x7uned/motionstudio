// catalog-v1 item «meter-bar»: the pixel battery / energy bar of «Why your cat sleeps all day» (cat-zoomies, the same
// code in mosquito-buzz) as a HUD card — the label in outlined ivory above a lilac-framed bar with a battery nub; the
// segmented fill changes colour with its level (red → orange → yellow → green), tops out with a warm glow halo and a
// shimmer, or drains to red with the frame pulsing red. Copy in lib/zoomies-meter.mjs. HUD, not a world prop: the label
// must stay legible while the camera moves. No text except s.label; no digits except s.value (+ unit), see notes.
import { meterCard, meterHalo, blitMeter, levelColor } from "./lib/zoomies-meter.mjs";

const clamp01 = (v) => Math.max(0, Math.min(1, v)), sm = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;
export default {
  kind: "meter-bar",
  covers: ["meter-bar"],
  source: "cat-zoomies/film/hud.mjs#energyBar (= mosquito-buzz/film/hud.mjs#energyBar)",
  desc: "energy/battery bar card: segmented fill, colour by level red→green, label above; HUD card",
  hw: 94, hh: 28, start: "card fades in, the fill grows to half",
  hud: true, text: true,
  states: {
    show: [0.4, "bar half full (yellow-orange), label above"],
    fill: [1.2, "fills up nearly to the end, colour climbs to green", "rise"],
    drain: [1.2, "drains almost empty, colour falls to red, frame pulses red", "dim"],
    full: [0.6, "tops out: glows warm and shimmers, maxed out", "ding"],
    warn: [0.6, "drops to a red sliver, frame blinks red fast: running low", "blip"],
  },
  base: { lev: 0.5, glow: 0, warn: 0, tov: 0 },
  st: {
    show: { lev: 0.5, glow: 0, warn: 0, tov: 0 },
    fill: { lev: 0.92, glow: 0, warn: 0, tov: 1 },
    drain: { lev: 0.05, glow: 0, warn: 0, tov: 0 },
    full: { lev: 1, glow: 1, warn: 0, tov: 0 },
    warn: { lev: 0.14, glow: 0, warn: 1, tov: 0 },
  },
  linear: [],
  valueOptional: true,   // catalog-v1 contract flag (2026-10-26): a spoken number is shown when given, the meter works without one
  demo: { slot: "top", label: "ENERGY" },
  notes: "HUD card: label (s.label only; none = bar only) over the film bar with its battery nub; colour by level as in the film (red < 22 %, orange, yellow, green). The film words ENERGY and MAX are gone. The fill grows in from empty while the card dissolves in (about 0.85 s), so it passes through red first. Red frame pulse is automatic below 25 % (film) and fast on warn. value is false on purpose: under the current contract a value item must have a spoken number and loses every non-show key without one. The number path is implemented but dormant: if s.value is set it is drawn right-aligned above the bar end (unit % also sets the fill level of fill); checked in a scratch render (20%, 80%, 3 H, a long label widens the card). Enabling it needs a shared contract flag (e.g. valueOptional). Checker: clean.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v;
    // a spoken percentage (value + unit %) sets the fill level of «fill» and dissolves in with it; otherwise fill = 92 %
    const unit = s.unit || "", valueText = s.value != null ? `${s.value}${unit ? (unit === "%" ? "%" : " " + unit) : ""}` : null;
    const pct = s.value != null && unit === "%" && Number.isFinite(+s.value) ? clamp01(+s.value / 100) : null;
    const target = pct == null ? v.lev : lerp(v.lev, pct, v.tov);
    // the fill grows in from empty while the card finishes dissolving in
    const level = target * sm((t - s.enterT - 0.15) / 0.7);
    const ph = s.integ((q) => 1.1 + 2.2 * q.warn), blink = 0.5 + 0.5 * Math.sin(2 * Math.PI * ph);
    const low = Math.max(clamp01(1 - level / 0.25), v.warn);
    const C = meterCard({ level, ov: v.glow, low, blink, t, label: s.label, valueText, num: v.tov });
    meterHalo(c, C.L, cx, cy, z, v.glow * (0.45 + 0.35 * blink));
    const box = blitMeter(c, C, cx, cy, z);
    const ex = cx + (C.fillX - C.L.CW / 2) * z, ey = cy + (C.L.by + 13 - C.L.CH / 2) * z;
    return { box, pt: [ex, ey], col: levelColor(level) };
  },
};
