// catalog-v1 backdrop «studio»: the dark diagram «air» of the dog series' science cards — a navy ramp, lightest at the top
// centre, darker toward the bottom and the sides, ordered-dithered — ported from work/pixel-lab/dogs/kit/nosebio-util.mjs
// darkBg (inline copy below). Changes: it fills the whole frame instead of a card box, and it is laid out in a slow
// camera layer (depth 0.3) so a camera move or zoom gently shifts the glow instead of freezing the background.
import { bayer } from "../../../../renderer/pixel/raster.mjs";
import { layer, clamp01 } from "../engine/layout.mjs";

const BG = ["#222B56", "#1C244A", "#171E3F", "#131934", "#0F142A"];     // PAL.bg of nosebio-util.mjs: dark diagram air, top → bottom
const P = 0.3, N = BG.length - 1, U = new Float32Array(540);
export default {
  kind: "studio",
  backdrop: true,
  covers: ["studio"],
  source: "dogs/kit/nosebio-util.mjs#darkBg",
  desc: "plain dark navy explainer studio: soft glow at the top, darker edges, nothing else",
  theme: { accent: "#F08A3C", gold: "#F4CA50", hot: "#FFE38E", core: "#FFF6CE", stone: ["#26305E", "#323E74", "#161C3A"], beam: "#F7B04A" },
  draw(c, cam, t) {
    const L = layer(cam, P), d = c.d;
    for (let x = 0; x < 540; x++) { const u = L.wx(x + 0.5) / 540 - 0.5; U[x] = u * u * 1.1; }
    const pal = BG.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let y = 0; y < 960; y++) {
      const v = L.wy(y + 0.5) / 960 * 0.85;
      for (let x = 0; x < 540; x++) {
        const s = clamp01(v + U[x]) * N, lo = Math.floor(s), k = s - lo > bayer(x, y) ? Math.min(N, lo + 1) : lo, q = pal[k], i = (y * 540 + x) * 3;
        d[i] = q[0]; d[i + 1] = q[1]; d[i + 2] = q[2];
      }
    }
    void t;
  },
  notes: "Plain by design: the dog series' card background stretched to the frame (the inventory lists no other dark explainer stage). Dark props (black cat, wolf saddle) have little contrast on navy; their lit outlines carry them. No ambient motion except the camera drift.",
};
