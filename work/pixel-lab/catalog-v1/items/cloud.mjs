// catalog-v1 item «cloud»: one drifting cloud from the aura film's sky (aura-full/film/world.mjs#drawClouds: the blob-chain
// make() cloud, 4-tone ramp lit from the upper left with Bayer-dithered tone seams). Catalog changes: a single cloud
// instead of the parallax field, 1-px dark outline, and states built from eased parameters: a slow drift, a puff
// (blobs breathe bigger), rain-dark (the ramp crossfades to storm grey, rain streaks fade in under it) and fade-out.
import { bayer, fade, mix } from "../../../../renderer/pixel/raster.mjs";
import { rnd } from "../engine/layout.mjs";

const PI = Math.PI, clamp01 = (v) => Math.max(0, Math.min(1, v));
const DAY = ["#8FA6D8", "#B8CAEE", "#E2ECFC", "#FFFFFF"], STORM = ["#2E3650", "#47526E", "#6A7692", "#8E9AB4"], OUT = "#1E2848";
const W = 150, H = 40, SEED = 7;
const BLOBS = (() => { const b = [], n = 9; for (let i = 0; i < n; i++) { const u = i / (n - 1), r = H * (0.45 + 0.55 * Math.sin(PI * u)) * (0.7 + 0.4 * rnd(SEED * 13 + i)); b.push([(u - 0.5) * W, -r * 0.55 + rnd(SEED * 7 + i) * 6, r]); } return b; })();

export default {
  kind: "cloud",
  covers: ["cloud"],
  source: "aura-full/film/world.mjs#drawClouds (blob cloud + 4-tone ramp)",
  desc: "one soft white cloud; drifts, puffs up, turns storm-grey and rains, fades away",
  hw: 108, hh: 76,
  start: "drifts slowly side to side",
  demo: { tile: "puff" },
  states: {
    drift: [0.5, "drifts slowly side to side"],
    puff: [0.6, "puffs up bigger, breathing", "swell"],
    rain: [0.9, "darkens to storm grey and rain falls under it", "dim"],
    fade: [0.9, "thins out and dissolves", "dim"],
  },
  // sway: drift swing · puff: blob growth · dark: storm grey + rain · gone: dissolve
  base: { sway: 1, puff: 0, dark: 0, gone: 0 },
  st: { drift: { sway: 1, puff: 0, dark: 0, gone: 0 }, puff: { puff: 1, dark: 0 }, rain: { puff: 0.3, dark: 1 }, fade: { gone: 1 } },
  linear: [],
  notes: "Single 150x40 blob cloud at z 1; rain is 26 dithered 5-px streaks with a sine fade envelope along their fall (no pops). Cloud has a dark blue outline so it reads on the pale sky backdrops.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, ph = s.integ((q) => 0.5 * q.sway + 0.1), Z = z;
    const g = fade(c, 1 - v.gone);
    const ox = cx + 12 * v.sway * Math.sin(ph) * Z, oy = cy + 3 * Math.sin(t * 0.9) * Z;
    const grow = 1 + 0.22 * v.puff * (0.8 + 0.2 * Math.sin(t * 1.7));
    const ramp = DAY.map((d, i) => mix(d, STORM[i], v.dark));
    const bl = BLOBS.map(([bx, by, br]) => [bx * (1 + 0.1 * v.puff), by * grow, br * grow]);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const [bx, by, br] of bl) { x0 = Math.min(x0, ox + (bx - br) * Z); x1 = Math.max(x1, ox + (bx + br) * Z); y0 = Math.min(y0, oy + (by - br) * Z); y1 = Math.max(y1, oy + (by + br) * Z); }
    const base = oy + Math.max(...bl.map(([, by, br]) => by + br * 0.35)) * Z;
    const hit = (X, Y) => {
      if (Y > base + 2) return -1;
      let best = -1;
      for (const [bx, by, br] of bl) { const dx = (X + 0.5 - (ox + bx * Z)) / (br * Z), dy = (Y + 0.5 - (oy + by * Z)) / (br * Z), d = dx * dx + dy * dy; if (d < 1) best = Math.max(best, -dy * 0.8 - dx * 0.25 + (1 - d) * 0.6); }
      return best;
    };
    const ya = Math.floor(y0) - 1, yb = Math.ceil(Math.min(y1, base + 2)) + 1, xa = Math.floor(x0) - 1, xb = Math.ceil(x1) + 1;
    const outline = mix(OUT, "#0B0812", v.dark);
    for (let Y = ya; Y <= yb; Y++) for (let X = xa; X <= xb; X++) {
      const b = hit(X, Y);
      if (b >= 0) {
        const q = clamp01(0.35 + b * 0.9 - (Y - y0) / (y1 - y0 + 1) * 0.35) * 3.2, i = Math.floor(q), f = q - i;
        g.px(X, Y, ramp[Math.min(3, f > bayer(X, Y) ? i + 1 : i)]);
      } else if (hit(X - 1, Y) >= 0 || hit(X + 1, Y) >= 0 || hit(X, Y - 1) >= 0 || hit(X, Y + 1) >= 0) g.px(X, Y, outline);
    }
    // rain: streaks fall from the cloud base; each fades in and out along its fall, all scaled by the storm amount
    if (v.dark > 0.01) for (let i = 0; i < 26; i++) {
      const f = (t * (0.7 + 0.3 * rnd(i + 3)) + rnd(i)) % 1, env = Math.sin(PI * f) * v.dark, X = Math.round(ox + (rnd(i * 5 + 1) - 0.5) * 110 * Z), Y = Math.round(base + 4 * Z + f * 70 * Z);
      for (let k = 0; k < 5; k++) if (env * 1.6 > bayer(X, Y + k)) g.px(X, Y + k, k === 4 ? "#D4E6FF" : "#8CB4F4");
    }
    return { box: { x0: Math.max(0, x0), y0, x1: Math.min(540, x1), y1: base }, pt: [ox, oy] };
  },
};
