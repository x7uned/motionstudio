// catalog-v1 item «music-note»: the eighth note of the buzz film's «singing» beat (mosquito-buzz/film/fx.mjs#note, copied
// to items/lib/mosquito-buzz-note.mjs) and its bob over the target (render.mjs: y − 3·sin(5t)). Changes: the film shows one
// note beside a target; here up to four notes ride their own loops out of the slot: each is born in the slot by a dissolve,
// drifts up and sideways, and dissolves out at the top. The count (n) and the float speed (spd) are eased parameters,
// so a note joins or leaves by dissolving, never by a pop. The note is drawn at a fixed ×2 block size (a camera zoom
// moves the notes, it does not rescale them in steps); the drawing is the film's.
import { note, NOTE_Y } from "./lib/mosquito-buzz-note.mjs";
import { sm } from "./lib/cute.mjs";

const K = 2;                       // screen px per film pixel (fixed, so the note never changes size in steps)
const RISE = 46;                   // how far a note travels up, screen px at z 1
const N = 4;                       // most notes at once
const PER = [2.6, 2.9, 2.4, 3.1];  // seconds per float at spd 1
const OX = [0, 18, -16, 6];        // birth x of each note, screen px at z 1
const TAU = Math.PI * 2;
const fract = (x) => x - Math.floor(x);
const rnd = (n) => { let h = (n * 374761393) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const OFF = [0, 1, 2, 3].map((i) => rnd(i + 11));

// a view that draws each film pixel of the note as a K×K block at (ox, oy)
function blockView(c, ox, oy) { const o = Object.create(c); o.px = (x, y, col) => { const X = ox + x * K, Y = oy + y * K; for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) c.px(X + i, Y + j, col); }; return o; }

export default {
  kind: "music-note",
  covers: ["music-note"],
  source: "mosquito-buzz/film/fx.mjs#note (+ render.mjs bob y − 3·sin(5t)); copy in items/lib/mosquito-buzz-note.mjs",
  desc: "small eighth notes floating up from its slot, bobbing, dissolving at the top",
  hw: 37, hh: 63,
  start: "one note bobs slowly in its slot",
  demo: { tile: "many" },
  states: {
    quiet: [0.45, "one soft note bobs in its slot"],
    play: [0.6, "notes float up out of it", "blip"],
    many: [0.6, "more notes rise together", "rise"],
    fade: [0.5, "the notes dissolve away", "dim"],
  },
  // n: notes present (0..4, eased weights) · spd: float speed (cycles per second ÷ PER)
  base: { n: 1, spd: 0.5 },
  st: {
    quiet: { n: 1, spd: 0.5 },
    play: { n: 3, spd: 1.0 },
    many: { n: 4, spd: 1.3 },
    fade: { n: 0, spd: 0.6 },
  },
  linear: [],
  notes: "Film note drawn unchanged, at ×2 block size (fixed, not zoom-scaled). Each note's life is a phase on the integrated float speed, so speed changes never jump; its dissolve in and out is the Bayer fade of the film's note().",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, I = s.integ((q) => q.spd), bobY = 1.5 * Math.sin(t * 5);
    for (let i = 0; i < N; i++) {
      const w = sm(v.n - i, 0, 1); if (w <= 0) continue;
      const u = fract(I / PER[i] + OFF[i]);                       // 0 = born in the slot, 1 = gone
      const env = sm(u, 0, 0.18) * (1 - sm(u, 0.62, 1)) * w;      // dissolve in, drift, dissolve out
      if (env <= 0) continue;
      const sway = Math.sin(TAU * u * 1.2 + i * 1.7) * 4 * z;
      const hx = cx + OX[i] * z + sway, hy = cy + 6 * z - u * RISE * z + bobY * (i % 2 ? 1 : -1);
      note(blockView(c, Math.round(hx), Math.round(hy)), 0, 0, env, NOTE_Y);
    }
    return { box: { x0: cx - 22 * z, y0: cy - (RISE + 26) * z, x1: cx + 30 * z, y1: cy + 14 * z }, pt: [cx, cy - 10 * z] };
  },
};
