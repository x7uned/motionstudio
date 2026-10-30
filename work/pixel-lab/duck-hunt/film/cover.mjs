// Cover for «Your Duck Hunt gun never fired a single shot»: kicker y300, two-line title ≤590, scene 590–1490 (the kid
// aims at the tube TV, which shows the white box on the black frame), avatar + handle + chip at y1545 (lib/cover.mjs).
import { fileURLToPath } from "node:url";
import { makeCover } from "./lib/cover.mjs";
import { frame } from "./render.mjs";
import { tag } from "./lib/ui.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
await makeCover({
  out: HERE + "cover.png", kicker: "DUCK HUNT · 1984", t1: "YOUR GUN NEVER", t2: "FIRED A SHOT", c2: "#F08A3C", chip: "LIGHT GUN",
  scene: (s) => { frame(1.9, { canvas: s, cam: { cx: 270, cy: 372, z: 0.98, ay: 516 }, captions: false, story: false }); tag(s, ["IT ONLY LOOKS"], 270, 302, 1, "#F4CA50", 2); },
});
console.log("cover.png");
