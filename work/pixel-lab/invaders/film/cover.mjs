// Cover for «The lowest aliens can't hit you»: kicker y300, two-line title ≤590, scene 590–1490 (the army right on top
// of the cannon, a shot popping harmlessly under it), avatar + handle + chip at y1545 (lib/cover.mjs).
import { fileURLToPath } from "node:url";
import { makeCover } from "./lib/cover.mjs";
import { frame } from "./render.mjs";
import { tag } from "./lib/ui.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
await makeCover({
  out: HERE + "cover.png", kicker: "SPACE INVADERS · 1978", t1: "THE LOWEST ALIENS", t2: "CAN'T HIT YOU", c2: "#5BE36A", chip: "NAGOYA ATTACK",
  scene: (s) => { frame(1.09, { canvas: s, cam: { cx: 84, cy: 196, z: 4.4 }, captions: false, story: false }); tag(s, ["NO HIT"], 380, 600, 1, "#65DA41", 3); },
});
console.log("cover.png");
