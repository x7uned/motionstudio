// EXPLAIN layer of «Why airplane windows are round» (screen space, drawn as an overlay after the plane level):
// · the sepia 1954 Comet flashback inset (COMET, top) — levels/explain-comet.mjs
// · the tiny flight-profile strip with the CABIN PRESSURE balloon (PRESS, top) — levels/explain-strip.mjs
// · the exploded three-pane window on a dark diagram card: air through the hole, load on the OUTER pane, the BACKUP test,
//   fog venting through the hole, the hole sparkling on "safety feature" (EXPLODE … ) — levels/explain-panes.mjs
// Every element dissolves or moves continuously; pure functions of t.
import { drawComet } from "./explain-comet.mjs";
import { drawStrip } from "./explain-strip.mjs";
import { drawPanes, drawLabels } from "./explain-panes.mjs";

export function hud(c, V, t) {
  drawComet(c, V, t);
  drawStrip(c, V, t);
  drawPanes(c, V, t);
  drawLabels(c, V, t);
}
