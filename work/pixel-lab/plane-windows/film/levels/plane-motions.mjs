// Builder PLANE · sound cues: one 8-bit sound per visible motion of the plane module, computed from the same timeline
// constants as the picture (each lasts exactly as long as its motion). Read by cues.mjs (level = "plane").
import { EV, SQUARE_GHOST, PRESS, STRESS_VIEW, TO_SQUARE, TO_ROUND, CYCLES, N_CYCLES, crack } from "../timeline.mjs";

const M = (t0, t1, kind, note) => ({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: "plane", note });
const [g0, g1] = SQUARE_GHOST, [s0, s1] = STRESS_VIEW, T = (CYCLES[1] - CYCLES[0]) / N_CYCLES;

const pulses = [];
for (let n = 0; n < N_CYCLES; n++) {
  const a = CYCLES[0] + T * (n + 0.22), b = CYCLES[0] + T * (n + 0.72), grows = crack(b) - crack(a) > 0.01;   // the crack steps on the same pulses as the picture
  pulses.push(M(a, b, grows ? "creak" : "pulse", grows ? `pressure pulse ${n + 1}: the corner crack grows a step` : `pressure pulse ${n + 1}: the fuselage breathes out`));
}
const firstBadge = EV.rounded - 0.12, lastBadge = firstBadge + 2 * 0.12 + 0.5;   // three windows on screen (camera at rest), 0.12 s apart, each glint 0.5 s

export const MOTIONS = [
  M(0.0, 0.32, "pose", "hero raises his hand and waves from the round window"),
  M(EV.round1 - 0.12, EV.round1 + 0.5, "shimmer", "a glint runs round the hero window's seal ring on 'round'"),
  M(g0, g0 + 0.5, "glitch", "red square ghost flickers in over the round window"),
  M(EV.tore1 - 0.04, EV.tore1 + 0.22, "zap", "a zigzag crack shoots from the square ghost's corner on 'tore'"),
  M(g1 - 0.6, g1, "dissolve", "the square ghost dissolves away"),
  M(PRESS.up[0], PRESS.up[1], "draw", "cabin pumped up: the fuselage bows out, cyan arrows push outward"),
  M(PRESS.down[0], PRESS.down[1], "fall", "cabin let down: the fuselage relaxes"),
  M(s0, s0 + 0.7, "screen", "stress view switches on around the hero window"),
  M(EV.stretch - 0.2, EV.stretch + 0.3, "creak", "the walls stretch a tiny bit (pressure pulse, grid stretches)"),
  M(TO_SQUARE[0], TO_SQUARE[1], "slide", "the hero window turns square"),
  M(TO_SQUARE[1] - 0.1, TO_SQUARE[1] + 0.05, "alert", "the four sharp corners glow hot red"),
  ...pulses,
  M(EV.tore2, EV.tore2 + 0.12, "thud", "the metal tears: the fuselage jolts"),
  M(EV.tore2, EV.openEnd, "zap", "the crack runs to the seam and the flap swings open"),
  M(EV.tore2 + 0.05, EV.round2 + 0.05, "wind", "air rushes out of the tear in streaks and puffs"),
  M(EV.round2 - 0.3, EV.round2 + 0.3, "dissolve", "the crack heals"),
  M(TO_ROUND[0], TO_ROUND[1], "ghost", "the hero window becomes round again, the heat turns even and calm"),
  M(firstBadge, lastBadge, "sparkle", "a glint and a ✓ run along the window row on 'rounded windows'"),
  M(s1 - 0.7, s1, "dissolve", "stress view switches off"),
  M(EV.send - 0.08, EV.send + 0.24, "pose", "hero waves on 'Send it to a friend'"),
];
