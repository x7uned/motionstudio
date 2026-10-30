// catalog-v1 item «skull»: the cute 9×8 pixel skull of the deadliest film's log bar (the «deadly» end of the meter),
// ported from work/pixel-lab/deadliest/film/levels/meter.mjs#skull (copy with the blocks in lib/deadliest-skull.mjs).
// States: it grins, its eyes light up, it chatters (the jaw drops and springs back, eased in and out).
import { drawSkull } from "./lib/deadliest-skull.mjs";

const B = 12;                 // screen px per skull pixel at z 1 (the film's 9×8 grid, 108×96 px)
const BONE = "#F2ECFF", SOCKET = "#2A1030";
const clamp01 = (v) => Math.max(0, Math.min(1, v));
export default {
  kind: "skull",
  covers: ["skull"],
  source: "deadliest/film/levels/meter.mjs#skull",
  desc: "cute pixel skull grinning, eyes light up red, its jaw chatters",
  hw: 54, hh: 48,
  start: "grins, still, eye sockets dark",
  states: {
    grin: [0.4, "grins, still, eye sockets dark"],
    glow: [0.5, "eyes light up red", "glow"],
    chatter: [0.6, "jaw chatters, teeth clicking, eased in and out", "tick"],
  },
  // glow: eye light 0..1 · jaw: chatter amplitude 0..1 · rate: chatter cycles per second (integrated phase)
  base: { glow: 0, jaw: 0, rate: 0 },
  st: {
    grin: { glow: 0, jaw: 0, rate: 0 },
    glow: { glow: 1, jaw: 0, rate: 0 },
    chatter: { glow: 0, jaw: 1, rate: 2.4 },
  },
  linear: [],
  slots: null, hud: false, value: false, text: false,
  demo: { target: false },
  notes: "Film colours and pixel rows kept. Chatter is new (the film's skull is still): the lower rows (jaw, teeth) drop by up to 0.3 of a block (3.6 px) and return on a cosine at 2.4 Hz; at 0.4 of a block and 3.2 Hz the sinusoid's turnaround made the checker flag two frames. The amplitude eases in and out with the state, and the block edges are dithered, so the jaw never jumps. Eye light mixes toward the film's pink (#E03056) continuously.",
  draw(c, cx, cy, z, t, s) {
    const v = s.v, b = B * z, ph = s.integ((q) => q.rate);
    const jaw = v.jaw * 0.3 * 0.5 * (1 - Math.cos(2 * Math.PI * ph));
    drawSkull(c, cx, cy, b, BONE, SOCKET, { jaw, glow: v.glow });
    const hx = cx, hy = cy - 4 * b + 1.5 * b;
    return { box: { x0: cx - 4.5 * b, y0: cy - 4 * b, x1: cx + 4.5 * b, y1: cy + 4 * b + jaw * b }, pt: [cx, cy],
      face: [hx, hy], faceBox: { x0: cx - 4.5 * b, y0: cy - 4 * b, x1: cx + 4.5 * b, y1: cy + 4 * b } };
  },
};
