// catalog-v1 backdrop «park»: the sunny park of the dog series (dogs/kit/park*.mjs, copies in lib/dogs-park*.mjs): blue
// afternoon sky with a small sun and drifting clouds, hazy city and two rows of hills, tree line, mid trees, flower beds,
// a big oak at the right, wooden benches and a park lamp, a mown striped lawn (rich dithered greens) with blades, daisies
// and clover in front, grass tufts along the lawn line. Catalog changes: catalog camera → the park camera (park world x 0 =
// stage centre, lawn line at stage y 570 at the wide shot, park cam.cy solved so the lawn follows the catalog zoom), the
// squirrel and the ball-rest tuft clump are not drawn, LAYOUT furniture moved into the 9:16 frame.
import { back, front } from "./lib/dogs-park.mjs";

const X0 = -60;                                     // park cam.cx at the catalog wide shot (the dog films' hook framing)
function pcam(cam) { const z = cam.z; return { cx: cam.cx - 270 + X0, cy: 70 / z - 570 + cam.cy, z }; }

export default {
  kind: "park",
  backdrop: true,
  covers: ["park"],
  source: "dogs/kit/park.mjs#back,front",
  desc: "sunny city park: blue sky, hills, oak, bench, lamp, mown striped lawn",
  theme: { accent: "#F4CA50", gold: "#F4CA50", hot: "#FFF0A0", core: "#FFFBE0", stone: ["#1C3A22", "#2A5430", "#12281A"], beam: "#FFF0C4" },
  draw(c, cam, t) { back(c, pcam(cam), t, { period: 60 }); },
  front(c, cam, t) { front(c, pcam(cam), t, { period: 60 }); },
  notes: "Lawn line at y 570 (wide shot), calm middle, oak crown at the top right, bench + lamp at the left edge (LAYOUT in lib/dogs-park-layout.mjs moved: oak x 300, bench -300, lamp -215), far trees/hills/city in the middle band. 31 ms/frame (limit 40). Clouds drift on a 60 s period; the oak trunk is out of frame at the wide shot (crown only). The film squirrel and the ball-rest grass clump are not drawn (the clump is a small tuft cluster at park x 60 that stays).",
};
