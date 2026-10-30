// Dog series kit · film 3 «Why do dogs spin before lying down?» · the things the dog spins ON.
// Each item is split into a BACK part (draw before the dog) and a FRONT part (draw after it) so the dog sits IN it:
//   bedBack / bedFront     — round dog bed (caramel bolster, cream fleece rim and cushion); o.press, o.dent
//   matBack / matFront     — Coren's two mats: o.kind "smooth" (striped woven mat) | "shaggy" (lumpy shag rug); o.flat, o.dig
//   grassBack / grassFront — tall wild grass patch → swirled nest (o.flat), deep snow (o.snow), dusk grade (o.dusk)
//   bedSeat / matSeat / grassSeat — where to put the dog's lawn point so it lies IN the item
// Signature of every draw call: (c, G, x, y, t, o) with G = ground(cam) from layout.mjs, (x, y) = lawn point under the
// item centre (the dog's spot), t = seconds, o.a = dissolve. Engine and shared helpers: nest-hf.mjs.
export { bedBack, bedFront, bedSeat, BED } from "./nest-bed.mjs";
export { matBack, matFront, matSeat, MAT } from "./nest-mat.mjs";
export { grassBack, grassFront, grassSeat, GRASS, GRASS_PAL } from "./nest-grass.mjs";
export { duskTint, KS as NEST_TILT } from "./nest-hf.mjs";
