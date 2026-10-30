// Sound cues of the EXPLAIN layer, computed from the same constants as the picture (each 8-bit sound lasts as long as
// its motion). One sound per visible motion; read by cues.mjs.
import { EV, PRESS } from "../timeline.mjs";
import { IN, OUTT, ADVANCE, FLY1, FLY2, BREAK1, BREAK2 } from "./explain-comet.mjs";
import { STRIP } from "./explain-strip.mjs";
import { HOLE_IN, LABELS, AIR, ARROWS, CRACK, FOGT, CALLOUTS, SPARKLE } from "./explain-panes.mjs";
import { EXPLODE } from "../timeline.mjs";

const L = "explain", m = (t0, t1, kind, note) => ({ t0: +t0.toFixed(3), t1: +t1.toFixed(3), kind, level: L, note });
export const MOTIONS = [
  // the 1954 flashback
  m(IN[0], IN[1], "screen", "sepia 1954 film inset fades in"),
  m(FLY1[0], FLY1[1], "engine", "1950s jet airliner flies into film frame 1"),
  m(ADVANCE[0], ADVANCE[1], "tick", "film advances one frame on 'two'"),
  m(FLY2[0], FLY2[1], "engine", "second airliner flies into frame 2"),
  m(EV.jet - 0.1, EV.jet + 0.5, "swish", "faint jet trails grow behind both planes"),
  m(BREAK1 - 0.05, BREAK1 + 0.15, "zap", "crack flashes at a window corner (plane 1)"),
  m(BREAK1 + 0.18, BREAK1 + 1.48, "fall", "plane 1 parts into two pieces that drift apart and fade"),
  m(BREAK2 - 0.05, BREAK2 + 0.15, "zap", "crack flashes at a window corner (plane 2)"),
  m(BREAK2 + 0.18, BREAK2 + 1.48, "fall", "plane 2 parts into two pieces that drift apart and fade"),
  m(OUTT[0], OUTT[1], "dissolve", "the flashback inset dissolves away"),
  // the flight-profile strip
  m(STRIP.in[0], STRIP.in[1], "screen", "CABIN PRESSURE strip slides in"),
  m(PRESS.up[0], PRESS.up[1], "engine", "tiny jet climbs, the balloon inflates"),
  m(PRESS.up[0], PRESS.up[0] + 0.2, "blip", "UP label"),
  m(PRESS.down[0], PRESS.down[1], "engine", "tiny jet descends to land, engine fades away, the balloon deflates"),
  m(PRESS.down[0], PRESS.down[0] + 0.2, "blip", "DOWN label"),
  m(STRIP.out[0], STRIP.out[1], "dissolve", "strip dissolves away"),
  // the exploded window
  m(HOLE_IN, HOLE_IN + 0.3, "pop", "ringed breather hole appears on the window glass"),
  m(EXPLODE.out[0], EXPLODE.out[1], "whoosh", "three panes slide out of the window onto the diagram card"),
  ...["INNER", "MIDDLE", "OUTER"].map((s, i) => m(LABELS[0] + i * 0.12, LABELS[0] + i * 0.12 + 0.3, "tag", `${s} label + leader line`)),
  m(EV.hole2 - 0.05, EV.hole2 + 0.3, "blip", "hole ring pulses on 'hole'"),
  m(AIR.flow[0], AIR.flow[1], "hiss", "air dots stream from the cabin through the hole into the gap"),
  m(ARROWS.in[0], ARROWS.in[1], "swish", "pressure arrows push onto the OUTER pane"),
  m(CALLOUTS[0].t[0], CALLOUTS[0].t[0] + 0.3, "tag", "CARRIES THE PRESSURE"),
  m(CRACK.grow[0], CRACK.grow[1], "glitch", "what-if: dashed crack runs across the OUTER pane"),
  m(ARROWS.shift[0], ARROWS.shift[1], "slide", "arrows move onto the MIDDLE pane"),
  m(CALLOUTS[1].t[0], CALLOUTS[1].t[0] + 0.3, "chime", "BACKUP shield"),
  m(CRACK.gone[0], CRACK.gone[1], "dissolve", "the dashed crack dissolves"),
  m(FOGT.fill[0], FOGT.fill[1], "puff", "fog fills the gap between the panes"),
  m(FOGT.drain[0], FOGT.drain[1], "hiss", "fog drifts out through the hole, the pane clears"),
  m(CALLOUTS[2].t[0], CALLOUTS[2].t[0] + 0.3, "tag", "NO FOG"),
  m(EV.hole3 - 0.05, EV.hole3 + 0.3, "blip", "hole ring pulses on 'little hole'"),
  m(SPARKLE[0], SPARKLE[1], "sparkle", "the hole bursts with sparkles on 'safety feature'"),
  m(EXPLODE.back[0], EXPLODE.back[1], "whoosh", "the panes slide back into the window"),
  m(EXPLODE.back[1] - 0.3, EXPLODE.back[1] + 0.08, "dissolve", "panes and hole ring dissolve into the plane's glass"),
];
