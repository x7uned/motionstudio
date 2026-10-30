// Cover for «Holding jump makes gravity weaker» (lib/cover.mjs): kicker y300, title ≤590, scene 590–1490, handle row y1545.
import { fileURLToPath } from "node:url";
import { makeCover } from "./lib/cover.mjs";
import { frame } from "./render.mjs";
const HERE = fileURLToPath(new URL(".", import.meta.url));
await makeCover({ out: HERE + "cover.png", kicker: "SUPER MARIO BROS. · 1985", t1: "HOLD JUMP =", t2: "WEAKER GRAVITY", c2: "#5BE36A", chip: "ONLY GOING UP",
  scene: (s) => frame(2.0, { canvas: s, cam: { cx: 6, z: 3.6 }, captions: false, story: false }) });
console.log("cover.png");
