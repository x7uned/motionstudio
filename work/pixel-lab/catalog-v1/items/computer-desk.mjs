// catalog-v1 backdrop «computer-desk»: a night gamer room in cut-away — dark wall lit by the monitor and an RGB LED strip
// under the ceiling, a sunset poster (silhouette, no text), a shelf with a figurine and books, and the film's desk set on the
// right: empty gamer chair, desk with RGB edge strip, keyboard, mouse, soda can, angled monitor showing an abstract glowing
// desktop, PC tower with RGB fans. Ported from work/pixel-lab/ping/film/world.mjs drawRoomShell + people.mjs drawDesk
// (copies in lib/ping-room.mjs, lib/ping-desk.mjs). Ambient: the LED strip and the RGB fans cycle, a faint band rolls down
// the screen.
import { drawComputerDesk } from "./lib/ping-room.mjs";

export default {
  kind: "computer-desk",
  backdrop: true,
  covers: ["computer-desk"],
  source: "ping/film/world.mjs#drawRoomShell + people.mjs#drawDesk",
  desc: "night gamer room: desk with glowing monitor, PC tower, RGB lights, chair",
  theme: { accent: "#5FD3F0", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#1C152C", "#2A2040", "#120D1E"], beam: "#8FB8F0" },
  draw(c, cam, t) { drawComputerDesk(c, cam, t); },
  notes: "Film room re-laid out for 9:16: the cut-away room scaled x1.8 on the wall layer (p 0.85), LED strip under the ceiling at the very top, sunset poster upper left, shelf above the desk, the empty desk set (film gamer removed, chair kept) on the right standing on the floor line y 560; calm dark striped wall in the middle. Screen: an abstract glowing desktop (two plain panels, dark bottom strip, slow rolling band), no game picture or text. The film shows only a 4-unit floor strip: a catalog plank floor in darkened film colours continues to the bottom edge. The wide RGB spill glows (under the desk strip, beside the tower) use a fixed colour: the cycling tint re-rounded whole flat areas in one frame (checker jump); the strip and fans still cycle. Still visible: the desk set is small at the wide shot and the PC tower is cut by the right edge; the monitor glow on the wall is faint; the poster silhouette is the film's generic soldier; the floor is a large plain area. Real draw ≈ 34 ms/frame (sheet 36–42 with harness and other agents running).",
};
